// apply_sql_file.js
// Runner generico de migraciones .sql versionadas de ExploraCO contra Neon.
// Ejecuta un archivo .sql COMPLETO sentencia por sentencia, en orden, y aborta
// al primer error (patron BUG-021/BUG-060: el archivo completo en una corrida).
//
// Que hace:
//   1. Carga DATABASE_URL con scripts/load_env_local.js (nunca la imprime).
//   2. Ignora lineas de comentario puro (-- ...) y lineas vacias.
//   3. Divide por ';' respetando bloques dollar-quote ($$ ... $$) y literales
//      entre comillas simples/dobles, para no partir un DO block.
//   4. Ejecuta cada sentencia con await sql(sentencia).
//      Loguea "OK: <primeros 60 chars>" o "FAIL: <sentencia> -> <error>".
//   5. Sale con exit 1 al primer error.
//
// Uso (PowerShell):
//   node scripts/apply_sql_file.js db/migrations/029_album_fotos_coords.sql
//
// No imprime secretos. ASCII-safe (ADR-002): cero bytes > 127, cero backticks,
// CommonJS estricto.
'use strict';

var fs = require('fs');
var path = require('path');

function uso() {
  console.error('Uso: node scripts/apply_sql_file.js <ruta.sql>');
}

function urlValida(raw) {
  if (raw === undefined || raw === null || String(raw).trim() === '') return null;
  var s = String(raw).trim();
  if ((s.charAt(0) === '"' && s.charAt(s.length - 1) === '"') ||
      (s.charAt(0) === "'" && s.charAt(s.length - 1) === "'")) {
    s = s.slice(1, -1);
  }
  if (s.indexOf('...') !== -1) return null;
  if (s.indexOf('postgresql://') !== 0 && s.indexOf('postgres://') !== 0) return null;
  if (/\s/.test(s)) return null;
  return s;
}

// Quita lineas de comentario puro (empiezan por --) y lineas vacias.
// No toca comentarios al final de una linea con SQL (no hay en las migraciones).
function quitarComentarios(texto) {
  var lineas = String(texto).split(/\r?\n/);
  var out = [];
  var i;
  for (i = 0; i < lineas.length; i++) {
    var l = lineas[i].trim();
    if (l === '') continue;
    if (l.slice(0, 2) === '--') continue;
    out.push(lineas[i]);
  }
  return out.join('\n');
}

// Delimitador dollar-quote: $$ o $etiqueta$ (identificadores simples).
var RE_DOLLAR = /^\$[A-Za-z_0-9]*\$/;

// Divide el SQL en sentencias por ';' sin romper dollar-quotes ni literales.
function dividirSentencias(texto) {
  var sents = [];
  var actual = '';
  var i = 0;
  var n = texto.length;
  var dollar = null;          // tag del dollar-quote abierto, o null
  var comillaSimple = false;
  var comillaDoble = false;

  while (i < n) {
    var c = texto.charAt(i);

    if (dollar !== null) {
      if (c === '$') {
        var m0 = RE_DOLLAR.exec(texto.slice(i));
        if (m0 && m0[0] === dollar) {
          actual += dollar;
          i += dollar.length;
          dollar = null;
          continue;
        }
      }
      actual += c;
      i++;
      continue;
    }

    if (comillaSimple) {
      if (c === "'") {
        if (texto.charAt(i + 1) === "'") { actual += "''"; i += 2; continue; }
        comillaSimple = false;
      }
      actual += c;
      i++;
      continue;
    }

    if (comillaDoble) {
      if (c === '"') {
        if (texto.charAt(i + 1) === '"') { actual += '""'; i += 2; continue; }
        comillaDoble = false;
      }
      actual += c;
      i++;
      continue;
    }

    if (c === "'") { comillaSimple = true; actual += c; i++; continue; }
    if (c === '"') { comillaDoble = true; actual += c; i++; continue; }

    if (c === '$') {
      var m1 = RE_DOLLAR.exec(texto.slice(i));
      if (m1) {
        dollar = m1[0];
        actual += m1[0];
        i += m1[0].length;
        continue;
      }
    }

    if (c === ';') {
      var t = actual.trim();
      if (t !== '') sents.push(t);
      actual = '';
      i++;
      continue;
    }

    actual += c;
    i++;
  }

  var fin = actual.trim();
  if (fin !== '') sents.push(fin);
  return sents;
}

function resumen(s) {
  var una = String(s).replace(/\s+/g, ' ').trim();
  return una.length > 60 ? una.slice(0, 60) + '...' : una;
}

function sqlstate(e) {
  return (e && e.code) ? String(e.code) : 'n/a';
}

function mensaje(e) {
  return (e && e.message) ? e.message : String(e);
}

async function main() {
  var archivo = process.argv[2];
  if (!archivo) { uso(); process.exit(1); }
  if (!fs.existsSync(archivo)) {
    console.error('FAIL - no existe el archivo: ' + archivo);
    process.exit(1);
  }

  require('./load_env_local')();
  var url = urlValida(process.env.DATABASE_URL);
  if (!url) {
    console.error('FAIL - DATABASE_URL ausente o invalida. Revisa .env.local.');
    console.error('       (No se imprime el valor de la credencial.)');
    process.exit(1);
  }

  var neon = null;
  try {
    neon = require('@neondatabase/serverless').neon;
  } catch (e) {
    if (e && e.code !== 'MODULE_NOT_FOUND') { throw e; }
  }
  if (!neon) {
    console.error('FAIL - falta el paquete @neondatabase/serverless.');
    process.exit(1);
  }
  var sql = neon(url);

  var base = path.basename(archivo);
  var texto = quitarComentarios(fs.readFileSync(archivo, 'utf8'));
  var sentencias = dividirSentencias(texto);

  console.log('=== APLICAR SQL: ' + base + ' ===');
  console.log('Sentencias detectadas: ' + sentencias.length);

  var k;
  for (k = 0; k < sentencias.length; k++) {
    var sent = sentencias[k];
    try {
      await sql(sent);
      console.log('OK: ' + resumen(sent));
    } catch (e) {
      console.error('FAIL: ' + sent);
      console.error('      SQLSTATE ' + sqlstate(e) + ' -> ' + mensaje(e));
      process.exit(1);
    }
  }

  console.log('=== FIN SQL: ' + base + ' (todas OK) ===');
}

main().catch(function (e) {
  console.error('FAIL - SQLSTATE ' + sqlstate(e) + ' -> ' + mensaje(e));
  process.exit(1);
});
