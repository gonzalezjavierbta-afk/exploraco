// verify_042_precheck.js
// Pre-chequeo INFORMACIONAL (read-only) para la migracion 042
// (Pasaporte + billetera agregadora + usuario_fotos + album_fotos.destino_id).
//
// QUE REPORTA
//   1. Existencia de usuarios.fecha_nacimiento (DATE, nullable).
//   2. Existencia de las tablas usuario_fotos y billeteras.
//   3. Existencia de album_fotos.destino_id.
//   4. Existencia de los indices parciales de la 042.
//   5. Chequeo estatico del working tree (archivo + DDL clave).
//
// COMPORTAMIENTO
//   - NUNCA escribe: solo SELECT en information_schema / pg_catalog.
//   - Informativo: OK / INFO y TERMINA EN 0 (no bloquea) aunque la 042 no
//     este aplicada.
//   - Con DATABASE_URL valida usa Neon real; sin ella usa scripts/fake_neon.js.
//
// Uso (PowerShell):
//   node scripts/verify_042_precheck.js
//   $env:DATABASE_URL="postgresql://..."; node scripts/verify_042_precheck.js
//
// ASCII-safe (0 bytes > 127), sin backticks, CommonJS estricto.
'use strict';

var fs = require('fs');
var path = require('path');

var ARCHIVO_042 = path.join(__dirname, '..', 'db', 'migrations', '042_pasaporte_billetera_fotos.sql');

var TABLAS_NUEVAS = ['usuario_fotos', 'billeteras'];
var INDICES_NUEVOS = [
  'idx_usuario_fotos_usuario_activo',
  'uq_usuario_fotos_principal',
  'idx_billeteras_usuario_activo',
  'idx_album_fotos_destino'
];
var TOKENS_DDL = [
  'ADD COLUMN IF NOT EXISTS fecha_nacimiento DATE',
  'CREATE TABLE IF NOT EXISTS usuario_fotos',
  'CREATE TABLE IF NOT EXISTS billeteras',
  'ADD COLUMN destino_id uuid',
  'uq_usuario_fotos_principal'
];

function literales(lista) {
  return lista.map(function (x) { return "'" + x + "'"; }).join(',');
}

function urlValida(raw) {
  if (raw === undefined || raw === null || String(raw).trim() === '') return null;
  var s = String(raw).trim();
  if ((s.charAt(0) === '"' && s.charAt(s.length - 1) === '"') ||
      (s.charAt(0) === "'" && s.charAt(s.length - 1) === "'")) {
    s = s.slice(1, -1);
  }
  if (s.indexOf('...') !== -1) return null;
  if (!/^postgres(ql)?:\/\/[^\s@]+@[^\s/]+\/.+$/.test(s)) return null;
  return s;
}

function obtenerDriverFake() {
  return require('./fake_neon').neon;
}

function chequeoEstatico() {
  console.log('[1] Chequeo estatico del working tree (informacion):');
  if (!fs.existsSync(ARCHIVO_042)) {
    console.log('    INFO - no existe ' + path.basename(ARCHIVO_042) + ' en db/migrations/.');
    return;
  }
  console.log('    OK   - ' + path.basename(ARCHIVO_042) + ' presente.');
  var contenido = fs.readFileSync(ARCHIVO_042, 'utf8');
  var faltantes = TOKENS_DDL.filter(function (t) { return contenido.indexOf(t) === -1; });
  if (faltantes.length === 0) {
    console.log('    OK   - los ' + TOKENS_DDL.length + ' DDL clave estan presentes.');
  } else {
    console.log('    INFO - DDL clave ausentes (' + faltantes.length + '):');
    faltantes.forEach(function (t) { console.log('           - ' + t); });
  }

  var bytes = 0, backticks = 0;
  for (var i = 0; i < contenido.length; i++) {
    if (contenido.charCodeAt(i) > 127) bytes++;
    if (contenido.charAt(i) === '`') backticks++;
  }
  console.log('    ' + ((bytes === 0 && backticks === 0) ? 'OK' : 'INFO') +
    '   - ASCII-safe: bytes>127=' + bytes + ' backticks=' + backticks);
}

async function chequeoRuntime(url, neon, esFake) {
  var sql = neon(url);
  console.log('\n[2] Chequeo runtime (READ-ONLY' +
    (esFake ? ' - MODO FAKE, sin DATABASE_URL' : ' - Neon real') + '):');

  var cols = await sql(
    "SELECT column_name, data_type, is_nullable FROM information_schema.columns " +
    "WHERE table_schema='public' AND table_name='usuarios' " +
    "AND column_name IN ('fecha_nacimiento') ORDER BY column_name");
  if (cols.length) {
    var c = cols[0];
    var nota = (c.data_type === 'date' && c.is_nullable === 'YES') ? ' [OK DATE nullable]' : ' [INFO se esperaba DATE nullable]';
    console.log('    OK   - usuarios.fecha_nacimiento: ' + c.data_type + ' | nullable=' + c.is_nullable + nota);
  } else {
    console.log('    INFO - usuarios.fecha_nacimiento NO existe' +
      (esFake ? ' (no verificable en modo fake).' : ' (la 042 no esta aplicada).'));
  }

  var tablas = await sql(
    "SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename IN (" +
    literales(TABLAS_NUEVAS) + ") ORDER BY tablename");
  var setTablas = {};
  tablas.forEach(function (t) { setTablas[t.tablename] = true; });
  console.log('    - Tablas nuevas (esperadas ' + TABLAS_NUEVAS.length + '):');
  TABLAS_NUEVAS.forEach(function (t) {
    console.log('        ' + (setTablas[t] ? 'OK  ' : 'INFO') + ' - ' + t +
      (setTablas[t] ? '' : (esFake ? ' (no verificable en modo fake).' : ' (la 042 no esta aplicada).')));
  });

  var colDest = await sql(
    "SELECT column_name, data_type FROM information_schema.columns " +
    "WHERE table_schema='public' AND table_name='album_fotos' " +
    "AND column_name='destino_id'");
  if (colDest.length) {
    console.log('    OK   - album_fotos.destino_id: ' + colDest[0].data_type);
  } else {
    console.log('    INFO - album_fotos.destino_id NO existe' +
      (esFake ? ' (no verificable en modo fake).' : ' (la 042 no esta aplicada).'));
  }

  var idx = await sql(
    "SELECT indexname FROM pg_indexes WHERE schemaname='public' AND indexname IN (" +
    literales(INDICES_NUEVOS) + ") ORDER BY indexname");
  var setIdx = {};
  idx.forEach(function (r) { setIdx[r.indexname] = true; });
  console.log('    - Indices (esperados ' + INDICES_NUEVOS.length + '):');
  INDICES_NUEVOS.forEach(function (n) {
    console.log('        ' + (setIdx[n] ? 'OK  ' : 'INFO') + ' - ' + n +
      (setIdx[n] ? '' : (esFake ? ' (no verificable en modo fake).' : ' (la 042 no esta aplicada).')));
  });

  if (esFake) {
    console.log('    (sin DATABASE_URL: fake_neon devuelve 0 filas; el estado real de Neon NO se puede afirmar).');
  }
}

function notasDeploy() {
  console.log('\n[3] Notas de orden de deploy:');
  console.log('    - Aplicar 042_pasaporte_billetera_fotos.sql COMPLETO en Neon DESPUES de la 041.');
  console.log('    - El backend (api/usuarios.js: pasaporte/fotos/billetera) requiere la 042 ANTES del deploy.');
  console.log('    - La 042 es idempotente (ADR-008): re-ejecutar es no-op.');
  console.log('    - Este precheck es INFORMATIVO: nunca escribe y termina en 0.');
}

async function main() {
  var url = urlValida(process.env.DATABASE_URL);
  console.log('=== PRECHECK 042 (pasaporte / billetera / usuario_fotos / destino_id) ===');

  chequeoEstatico();
  notasDeploy();

  var neon = null;
  try {
    neon = require('@neondatabase/serverless').neon;
  } catch (e) {
    if (e && e.code === 'MODULE_NOT_FOUND') {
      console.log('\n    INFO - @neondatabase/serverless no instalado; sin DATABASE_URL la corrida es fake.');
    } else {
      console.log('\n    INFO - error inesperado al cargar el driver: ' + e.message);
    }
  }

  try {
    if (url && neon) {
      await chequeoRuntime(url, neon, false);
    } else {
      await chequeoRuntime(url || 'postgresql://fake:fake@localhost/fake', obtenerDriverFake(), true);
    }
  } catch (e) {
    console.log('\n    INFO - no se pudo consultar el runtime (read-only): ' +
      (e && e.message ? e.message : e));
    console.log('    INFO - la corrida sigue siendo informativa; se termina en 0.');
  }

  console.log('\n=== VEREDICTO (informacion, no bloqueo) ===');
  console.log('    Si faltan columnas o tablas, aplicar db/migrations/042_pasaporte_billetera_fotos.sql COMPLETO y re-ejecutar.');
  process.exit(0);
}

main().catch(function (e) {
  console.error('FAIL - ' + (e && e.message ? e.message : e));
  process.exit(1);
});
