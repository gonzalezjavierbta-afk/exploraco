// scripts/estado-arte-cartas.js
// Estado OFFline del arte de cartas: cuantas claves tienen lamina y cuantas del
// catalogo de consumibles siguen sin arte. Cero red, cero DB: lee el mapa de
// cartas-arte.js y los INSERT INTO consumibles de db/migrations/*.sql.
// Sirve para medir la deuda de arte sin abrir las migraciones a mano.
//
// ASCII-safe (ADR-002): 0 bytes > 127, 0 backticks. CommonJS (BUG-001).
// Run: node scripts/estado-arte-cartas.js
'use strict';

var fs = require('fs');
var path = require('path');

var RAIZ = path.join(__dirname, '..');
var DIR_MIGRACIONES = path.join(RAIZ, 'db', 'migrations');

var Arte = require(path.join(RAIZ, 'cartas-arte.js'));

// Claves del catalogo: solo las del bloque INSERT INTO consumibles. El patron
// ('clave', suelto tambien casa con inserts de otras tablas (factores, productos,
// premios de marca), por eso se acota al bloque del statement.
function clavesConsumibles(sql) {
  var claves = [];
  var lineas = String(sql).split(/\r?\n/);
  var enBloque = false;
  for (var i = 0; i < lineas.length; i++) {
    var raw = lineas[i];
    var t = raw.trim();
    if (!t) continue;
    // Las migraciones conservan inserts antiguos comentados: no son catalogo vivo.
    if (t.indexOf('--') === 0) continue;
    if (/^INSERT\s+INTO\s+consumibles\b/i.test(t)) {
      enBloque = true;
      if (/;\s*$/.test(t)) enBloque = false;
      continue;
    }
    if (!enBloque) continue;
    var m = /^\s*\(\s*'([^']+)'/.exec(raw);
    if (m) claves.push(m[1]);
    // Fin del statement: ';' o ');'. Se exige cierre de parentesis para no
    // cortar en un punto y coma que viva dentro de una descripcion.
    if (/\);\s*$/.test(t) || /;\s*$/.test(t) && raw.indexOf('(') === -1) {
      enBloque = false;
    }
  }
  return claves;
}

function main() {
  var archivos = [];
  try {
    archivos = fs.readdirSync(DIR_MIGRACIONES).filter(function (f) {
      return /\.sql$/i.test(f);
    }).sort();
  } catch (e) {
    archivos = [];
  }

  var catalogo = [];
  var vistos = {};
  for (var i = 0; i < archivos.length; i++) {
    var sql;
    try {
      sql = fs.readFileSync(path.join(DIR_MIGRACIONES, archivos[i]), 'utf8');
    } catch (e) {
      continue;
    }
    var parcial = clavesConsumibles(sql);
    for (var j = 0; j < parcial.length; j++) {
      if (!vistos[parcial[j]]) { vistos[parcial[j]] = true; catalogo.push(parcial[j]); }
    }
  }

  var conArte = Object.keys(Arte.ARTE || {}).sort();
  var pendientes = catalogo.filter(function (k) {
    return !Object.prototype.hasOwnProperty.call(Arte.ARTE, k);
  });

  console.log('Arte de cartas - estado');
  console.log('Mapa: cartas-arte.js | Catalogos: db/migrations (' + archivos.length + ' .sql)');
  console.log('');

  console.log('CON ARTE: ' + conArte.length);
  for (var a = 0; a < conArte.length; a++) {
    console.log('  - ' + conArte[a] + ' -> ' + Arte.ARTE[conArte[a]]);
  }
  console.log('');

  console.log('PENDIENTES: ' + pendientes.length);
  if (!catalogo.length) {
    console.log('  (catalogo de consumibles no detectado en db/migrations/*.sql: solo se listan las claves con arte)');
  } else {
    for (var p = 0; p < pendientes.length; p++) {
      console.log('  - ' + pendientes[p]);
    }
  }
  console.log('');
  console.log('Catalogo de consumibles leido: ' + catalogo.length + ' claves.');
}

main();
process.exit(0);
