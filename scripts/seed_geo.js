// scripts/seed_geo.js
// Loader idempotente de las tablas de referencia geo de la migracion 038
// (ADR-058 / Multiplicador de Origen por lejania):
//   - geo_ciudades (1.122 municipios/ANM/isla DIVIPOLA) desde
//     db/seeds/geo_ciudades_seed.json
//   - geo_paises   (245 paises/territorios ISO-3166-1 alfa-2) desde
//     db/seeds/geo_paises_seed.json
//
// Patron de scripts/apply_sql_file.js (DATABASE_URL via load_env_local,
// nunca se imprime; ASCII-safe ADR-002; CommonJS estricto) y de los seeds
// scripts/seed-*.js (module.exports + main() solo si require.main === module,
// soporte --dry).
//
// Derivaciones (contrato de la migracion 038, db/migrations/038_origen_lejania.sql):
//   - es_capital = (cod_mpio termina en '001')  -> 33 filas (32 departamentos
//     + Bogota D.C., verificado: cod_mpio 11001/05001/... /91001).
//   - pais_iso2  = 'CO' (constante del dataset; char(2)).
//   - activo     = true en ambas tablas.
//   - iso3 del seed de paises NO se persiste (resolucion B-2 del ADR-058).
//
// Idempotencia (ADR-008): INSERT ... ON CONFLICT (cod_mpio|iso2) DO UPDATE SET.
// Re-ejecutar NO duplica filas; la segunda corrida reporta 0 insertados y
// N actualizados (concordancia plena).
//
// Conteos: cada fila del RETURNING trae (xmax = 0) AS inserted; xmax = 0 en
// filas NUEVAS y distinto de 0 en filas ACTUALIZADAS por el conflicto.
//
// Uso (PowerShell):
//   node scripts/seed_geo.js --dry          // imprime sin escribir
//   node scripts/seed_geo.js                // escribre contra Neon
//
// Verificacion sugerida post-carga (leer mas alla):
//   node scripts/neon_select.js -f ...      // conteos y muestra
//
// ASCII-safe (ADR-002): cero bytes > 127 en el fuente, cero backticks, cero
// tildes, cero emoji. El nombre_normalizado es [a-z0-9 ] en ambas tablas.
'use strict';

var fsPath = require('path');

// ---------------------------------------------------------------------------
// Datos (seeds versionados; ya ASCII-safe a nivel byte: escapes \uXXXX)
// ---------------------------------------------------------------------------
var CIUDADES = require('../db/seeds/geo_ciudades_seed.json');
var PAISES = require('../db/seeds/geo_paises_seed.json');

var BASE_DIR = fsPath.join(__dirname, '..');
var COLS_CIUDADES = [
  'cod_mpio', 'nombre', 'nombre_normalizado', 'departamento',
  'departamento_normalizado', 'cod_dpto', 'tipo', 'lat', 'lng',
  'pais_iso2', 'es_capital', 'activo'
];
var COLS_PAISES = ['iso2', 'nombre', 'nombre_normalizado', 'lat', 'lng', 'activo'];

var SET_CIUDADES =
  ' nombre=EXCLUDED.nombre, nombre_normalizado=EXCLUDED.nombre_normalizado,' +
  ' departamento=EXCLUDED.departamento,' +
  ' departamento_normalizado=EXCLUDED.departamento_normalizado,' +
  ' cod_dpto=EXCLUDED.cod_dpto, tipo=EXCLUDED.tipo,' +
  ' lat=EXCLUDED.lat, lng=EXCLUDED.lng,' +
  ' pais_iso2=EXCLUDED.pais_iso2, es_capital=EXCLUDED.es_capital,' +
  ' activo=EXCLUDED.activo';
var SET_PAISES =
  ' nombre=EXCLUDED.nombre, nombre_normalizado=EXCLUDED.nombre_normalizado,' +
  ' lat=EXCLUDED.lat, lng=EXCLUDED.lng, activo=EXCLUDED.activo';

// ---------------------------------------------------------------------------
// Derivacion y mapeo a filas-param
// ---------------------------------------------------------------------------

// es_capital = el codigo DIVIPOLA del municipio es cabecera de departamento
// (la capital BOGOTA D.C. es 11001, departamento 11).
function esCapital(codMpio) {
  var s = String(codMpio).trim();
  return s.slice(-3) === '001';
}

function filaCiudad(c) {
  return [
    String(c.cod_mpio), c.nombre, c.nombre_normalizado,
    c.departamento, c.departamento_normalizado,
    String(c.cod_dpto), c.tipo,
    Number(c.lat), Number(c.lng),
    'CO', esCapital(c.cod_mpio), true
  ];
}

function filaPais(p) {
  return [
    String(p.iso2), p.nombre, p.nombre_normalizado,
    Number(p.lat), Number(p.lng), true
  ];
}

function batches(arr, tam) {
  var out = [];
  var i;
  for (i = 0; i < arr.length; i += tam) out.push(arr.slice(i, i + tam));
  return out;
}

// ---------------------------------------------------------------------------
// Construccion de sentencias upsert (multi-VALUES con numeracion global de $N)
// ---------------------------------------------------------------------------
function insertSQL(tabla, cols, filas, onConflict, setClause, ret) {
  var valores = [];
  var params = [];
  var k = 0;
  var i, j;
  for (i = 0; i < filas.length; i++) {
    var ps = [];
    for (j = 0; j < filas[i].length; j++) {
      k++;
      ps.push('$' + k);
      params.push(filas[i][j]);
    }
    valores.push('(' + ps.join(',') + ')');
  }
  var sql =
    'INSERT INTO ' + tabla + ' (' + cols.join(',') + ') VALUES ' +
    valores.join(',' ) +
    ' ON CONFLICT (' + onConflict + ') DO UPDATE SET ' + setClause +
    ' RETURNING ' + ret;
  return { sql: sql, params: params };
}

// Tamano de lote: 250 filas = 3000 params por sentencia (muy por debajo del
// limite de 65535 del driver; acota el tamano del request HTTP).
var LOTE_CIUDADES = 250;
var LOTE_PAISES = 245;

// ---------------------------------------------------------------------------
// Carga real (o dry) contra Neon
// ---------------------------------------------------------------------------

// sql: cliente neon(@neondatabase/serverless). dry: boolean.
// Devuelve { ciudades: {insertados, actualizados}, paises: {insertados, actualizados} }
async function cargar(sql, dry) {
  var res = { ciudades: { insertados: 0, actualizados: 0 },
              paises:   { insertados: 0, actualizados: 0 } };

  var lotesCiudades = batches(CIUDADES.map(filaCiudad), LOTE_CIUDADES);
  var i, st, filas;
  for (i = 0; i < lotesCiudades.length; i++) {
    st = insertSQL('geo_ciudades', COLS_CIUDADES, lotesCiudades[i],
                   'cod_mpio', SET_CIUDADES, 'cod_mpio, (xmax = 0) AS inserted');
    if (dry) {
      console.log('[dry] geo_ciudades lote ' + (i + 1) + '/' + lotesCiudades.length +
                  ' (' + lotesCiudades[i].length + ' filas, ' + st.params.length + ' params)');
      continue;
    }
    filas = await sql(st.sql, st.params);
    contar(filas, res.ciudades);
    console.log('OK - geo_ciudades lote ' + (i + 1) + '/' + lotesCiudades.length +
                ': insertados=' + res.ciudades.insertados +
                ' actualizados=' + res.ciudades.actualizados);
  }

  var lotesPaises = batches(PAISES.map(filaPais), LOTE_PAISES);
  for (i = 0; i < lotesPaises.length; i++) {
    st = insertSQL('geo_paises', COLS_PAISES, lotesPaises[i],
                   'iso2', SET_PAISES, 'iso2, (xmax = 0) AS inserted');
    if (dry) {
      console.log('[dry] geo_paises lote ' + (i + 1) + '/' + lotesPaises.length +
                  ' (' + lotesPaises[i].length + ' filas, ' + st.params.length + ' params)');
      continue;
    }
    filas = await sql(st.sql, st.params);
    contar(filas, res.paises);
    console.log('OK - geo_paises lote ' + (i + 1) + '/' + lotesPaises.length +
                ': insertados=' + res.paises.insertados +
                ' actualizados=' + res.paises.actualizados);
  }

  return res;
}

function contar(filas, acc) {
  var r = Array.isArray(filas) ? filas : [];
  var i;
  for (i = 0; i < r.length; i++) {
    if (r[i] && r[i].inserted === true) acc.insertados++;
    else acc.actualizados++;
  }
}

// Validacion de URL tipo apply_sql_file.js: nunca se imprime el valor.
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

function resumenDry() {
  var capitales = CIUDADES.filter(function (c) { return esCapital(c.cod_mpio); }); 
  console.log('=== SEED_GEO DRY-RUN ===');
  console.log('geo_ciudades: ' + CIUDADES.length + ' filas en seed (' +
              (CIUDADES.length / 1000).toFixed(3) + 'k)');
  console.log('  cod_mpio unicos: ' + CIUDADES.length + ' (PK natural, ON CONFLICT)');
  console.log('  es_capital derivado (termina en 001): ' + capitales.length + ' filas');
  console.log('  pais_iso2 constante: CO | activo: true');
  console.log('geo_paises: ' + PAISES.length + ' filas en seed');
  console.log('  iso2 unicos: ' + PAISES.length + ' (PK, ON CONFLICT)');
  console.log('  iso3 NO se persiste (contrato migracion 038 / ADR-058 B-2)');
  var ej = ['11001', '05001', '91001'];
  var muestras = CIUDADES.filter(function (c) { return ej.indexOf(c.cod_mpio) !== -1; });
  console.log('  ejemplo: ' + muestras.map(function (m) {
    return m.nombre_normalizado + ' (' + m.cod_mpio + ', capital=' + esCapital(m.cod_mpio) + ')';
  }).join(' | '));
  var lotesC = batches(CIUDADES.map(filaCiudad), LOTE_CIUDADES);
  var lotesP = batches(PAISES.map(filaPais), LOTE_PAISES);
  console.log('  lotes a escribir: ' + lotesC.length + ' (ciudades x ' + LOTE_CIUDADES +
              ') + ' + lotesP.length + ' (paises x ' + LOTE_PAISES + ')');
  console.log('MODO DRY: no se conecta a Neon, NO se escribe nada.');
}

function main() {
  var dry = process.argv.indexOf('--dry') !== -1;

  if (dry) {
    resumenDry();
    return;
  }

  require('./load_env_local')();
  var url = urlValida(process.env.DATABASE_URL);
  if (!url) {
    console.error('FAIL - DATABASE_URL ausente o invalida. Revisa .env.local.');
    console.error('       Uso: node scripts/seed_geo.js [--dry]');
    process.exit(1);
  }

  var neon = null;
  try {
    neon = require('@neondatabase/serverless').neon;
  } catch (e) {
    if (e && e.code !== 'MODULE_NOT_FOUND') throw e;
  }
  if (!neon) {
    console.error('FAIL - falta el paquete @neondatabase/serverless.');
    process.exit(1);
  }
  var sql = neon(url);

  console.log('=== SEED_GEO CARGA REAL ===');
  cargar(sql, false).then(function (res) {
    console.log('=== RESULTADO ===');
    console.log('geo_ciudades: insertados=' + res.ciudades.insertados +
                ' actualizados=' + res.ciudades.actualizados +
                ' (total ' + (res.ciudades.insertados + res.ciudades.actualizados) + ')');
    console.log('geo_paises:   insertados=' + res.paises.insertados +
                ' actualizados=' + res.paises.actualizados +
                ' (total ' + (res.paises.insertados + res.paises.actualizados) + ')');
    process.exit(0);
  }).catch(function (err) {
    console.error('ERROR:', (err && err.message) ? err.message : String(err));
    if (err && err.code) console.error('SQLSTATE:', String(err.code));
    process.exit(1);
  });
}

module.exports = {
  CIUDADES: CIUDADES,
  PAISES: PAISES,
  esCapital: esCapital,
  filaCiudad: filaCiudad,
  filaPais: filaPais,
  cargar: cargar,
  version: '1.0.0'
};

if (require.main === module) {
  main();
}