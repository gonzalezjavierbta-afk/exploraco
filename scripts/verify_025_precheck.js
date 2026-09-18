// verify_025_precheck.js
// Pre-chequeo para la migracion 025 (ADR-039): visibilidad por recurso de
// album_fotos (columna visible) + indice unico parcial idx_albumes_usuario_mi_museo.
//
// INFORMACIONAL por diseno: en modo real (DATABASE_URL valida) hace SELECT
// READ-ONLY contra Neon y FALLA (exit 1) si la columna obligatoria no existe;
// en modo fake (sin DATABASE_URL) ejercita el mismo path runtime con el stub
// scripts/fake_neon.js (devuelve [] en toda query) y termina en 0 sin afirmar
// el estado real. Asi el chequeo nunca exige conexion ni secretos en CI local.
//
// Tambien valida ESTATICO el archivo de migracion del working tree: que el
// 025 exista como consecutivo del 024 y que contenga los dos DDL esperados
// por el ADR-039 (ADD COLUMN visible + CREATE UNIQUE INDEX "Mi Museo").
//
// Uso (PowerShell):
//   node scripts/verify_025_precheck.js
//   $env:DATABASE_URL="postgresql://..."; node scripts/verify_025_precheck.js
//
// ASCII-safe (0 bytes > 127), sin backticks, CommonJS estricto.
'use strict';

var fs = require('fs');
var path = require('path');

var DIR_MIGRATIONS = path.join(__dirname, '..', 'db', 'migrations');
var ARCHIVO_025 = path.join(DIR_MIGRATIONS, '025_album_fotos_visible.sql');
var ARCHIVO_024 = path.join(DIR_MIGRATIONS, '024_casas_cofre_y_clases.sql');

// Fragmentos DDL exactos que el ADR-039 exige en el 025.
var DDL_VISIBLE = 'visible boolean NOT NULL DEFAULT false';
var DDL_INDICE = 'idx_albumes_usuario_mi_museo';

function j(v) { return JSON.stringify(v); }

// Diagnostica la cadena sin exponer el secreto. Devuelve null si no es usable.
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

// --- Chequeo estatico del working tree (nunca toca la red) ---------------
function chequeoEstatico() {
  console.log('[1] Chequeo estatico del working tree (archivos de migracion):');
  var ok = true;

  if (!fs.existsSync(ARCHIVO_024)) {
    console.log('    FAIL - no existe el predecesor ' + path.basename(ARCHIVO_024));
    console.log('           (la 025 asume la 024 ya creada y aplicable antes).');
    ok = false;
  } else {
    console.log('    OK   - predecesor ' + path.basename(ARCHIVO_024) + ' presente.');
  }

  if (!fs.existsSync(ARCHIVO_025)) {
    console.log('    FAIL - no existe ' + path.basename(ARCHIVO_025));
    ok = false;
    return ok;
  }
  console.log('    OK   - ' + path.basename(ARCHIVO_025) + ' presente.');

  var contenido = fs.readFileSync(ARCHIVO_025, 'utf8');
  if (contenido.indexOf(DDL_VISIBLE) === -1) {
    console.log('    FAIL - el 025 NO contiene "' + DDL_VISIBLE + '"');
    ok = false;
  } else {
    console.log('    OK   - DDL visible presente: ' + DDL_VISIBLE);
  }
  if (contenido.indexOf(DDL_INDICE) === -1) {
    console.log('    FAIL - el 025 NO contiene "' + DDL_INDICE + '"');
    ok = false;
  } else {
    console.log('    OK   - DDL indice presente: ' + DDL_INDICE);
  }
  if (contenido.indexOf('activo boolean NOT NULL DEFAULT true') !== -1) {
    console.log('    INFO - el 025 MENCIONA activo en comentarios, pero NO debe' +
      ' crearlo (la columna ya existe desde la 009; verificado: cero ALTER' +
      ' TABLE album_fotos en db/migrations/ fuera de 009).');
  }
  return ok;
}

// --- Consultas runtime (read-only). Devuelve {rows, esFake} --------------
// En modo fake, fake_neon devuelve [] en toda query; el flujo se ejercita sin
// red ni secretos.
function obtenerDriverFake() {
  return require('./fake_neon').neon;
}

async function chequeoRuntime(url, neon) {
  var esFake = (neon === obtenerDriverFake());
  var sql = neon(url);

  console.log('\n[2] Chequeo runtime (READ-ONLY' + (esFake ? ' - MODO FAKE, sin DATABASE_URL' : ' - Neon real') + '):');

  var cols = await sql(
    "SELECT column_name, data_type, is_nullable, " +
    "COALESCE(column_default,'') AS def " +
    "FROM information_schema.columns " +
    "WHERE table_schema='public' AND table_name='album_fotos' " +
    "AND column_name IN ('visible','activo') " +
    "ORDER BY column_name");

  var mapaCol = {};
  cols.forEach(function (c) { mapaCol[c.column_name] = c; });

  if (esFake) {
    console.log('    (sin DATABASE_URL: fake_neon devuelve 0 filas; el estado' +
      ' real de Neon NO se puede afirmar desde este modo).');
  }
  if (!mapaCol['visible']) {
    console.log('    FAIL - album_fotos.visible NO existe (base limpia o 025 no' +
      (esFake ? ' verificable).' : ' aplicada).'));
  } else {
    console.log('    OK   - album_fotos.visible: ' + mapaCol['visible'].data_type +
      ' | nullable=' + mapaCol['visible'].is_nullable +
      ' | default=' + (mapaCol['visible'].def || '(sin default)'));
  }
  if (!mapaCol['activo']) {
    console.log('    FAIL - album_fotos.activo NO existe (columna esperada desde la 009).');
  } else {
    console.log('    OK   - album_fotos.activo: ' + mapaCol['activo'].data_type +
      ' | nullable=' + mapaCol['activo'].is_nullable +
      ' | default=' + (mapaCol['activo'].def || '(sin default)') +
      ' (heredada de la 009; la 025 NO la duplica)');
  }

  var idx = await sql(
    "SELECT indexname, COALESCE(indexdef,'') AS def " +
    "FROM pg_indexes " +
    "WHERE schemaname='public' " +
    "AND indexname IN ('idx_album_fotos_dedup','idx_albumes_usuario_mi_museo') " +
    "ORDER BY indexname");

  var mapaIdx = {};
  idx.forEach(function (i) { mapaIdx[i.indexname] = i; });

  if (!mapaIdx['idx_albumes_usuario_mi_museo']) {
    console.log('    FAIL - idx_albumes_usuario_mi_museo NO existe' +
      (esFake ? ' (no verificable en modo fake).' : ' (025 no aplicada).'));
  } else {
    console.log('    OK   - idx_albumes_usuario_mi_museo presente:');
    console.log('           ' + mapaIdx['idx_albumes_usuario_mi_museo'].def);
  }
  if (!mapaIdx['idx_album_fotos_dedup']) {
    console.log('    FAIL - idx_album_fotos_dedup NO existe (indice de la 009 perdido).');
  } else {
    console.log('    OK   - idx_album_fotos_dedup presente (indice de la 009 intacto).');
  }

  var dup = await sql(
    "SELECT usuario_id, COUNT(*)::int AS n " +
    "FROM albumes WHERE titulo='Mi Museo' AND activo = true " +
    "GROUP BY usuario_id HAVING COUNT(*) > 1");

  if (esFake) {
    console.log('    INFO - [modo fake] no se puede alertar de duplicados "Mi Museo".');
  } else if (dup.length > 0) {
    console.log('    FAIL - ' + dup.length + ' usuario(s) con 2+ albumes "Mi Museo" activos;' +
      ' el CREATE UNIQUE INDEX de la 025 fallara con 23505. Limpiar antes de aplicar:');
    dup.forEach(function (d) {
      console.log('           usuario_id=' + j(d.usuario_id) + ' n=' + d.n);
    });
  } else {
    console.log('    INFO - sin duplicados activos de "Mi Museo" por usuario (indice aplicable).');
  }

  return mapaCol['visible'] && mapaIdx['idx_albumes_usuario_mi_museo'];
}

// --- Orden de deploy (notas) ---------------------------------------------
function notasDeploy() {
  console.log('\n[3] Notas de orden de deploy (024 -> 025):');
  console.log('    - 024_casas_cofre_y_clases.sql es la UNICA migracion pendiente' +
    ' de aplicar en Neon (TASKS.md L3108-3110; PROJECT.md L117). Debe aplicarse' +
    ' primero (archivo COMPLETO en una corrida).');
  console.log('    - 025_album_fotos_visible.sql se aplica DESPUES, antes del' +
    ' deploy del backend v22 (ADR-039: patron BUG-021/BUG-060).');
  console.log('    - Ambos son idempotentes (ADR-008): re-ejecutar es no-op.');
}

async function main() {
  var url = urlValida(process.env.DATABASE_URL);
  console.log('=== PRECHECK 025 (album_fotos.visible + idx_albumes_usuario_mi_museo) ===');

  var estaticoOk = chequeoEstatico();
  notasDeploy();

  // Elector de driver: Neon real solo si hay DATABASE_URL valida y el paquete
  // esta instalado; si no, fake_neon.js (nunca se llama a la red).
  var neonReal = null;
  try {
    neonReal = require('@neondatabase/serverless').neon;
  } catch (e) {
    if (e && e.code === 'MODULE_NOT_FOUND') {
      console.log('\n    INFO - @neondatabase/serverless no instalado; sin DATABASE_URL' +
        ' la corrida es 100 por ciento fake (sin red).');
    } else {
      console.log('\n    FAIL - error inesperado al cargar el driver: ' + e.message);
    }
  }

  var runtimeOk;
  if (url && neonReal) {
    runtimeOk = await chequeoRuntime(url, neonReal);
  } else {
    runtimeOk = await chequeoRuntime(url || 'postgresql://fake:fake@localhost/fake', obtenerDriverFake());
  }

  console.log('\n=== VEREDICTO ===');
  if (!estaticoOk) {
    console.error('    FAIL - el working tree no esta listo (migracion 025 incompleta o numeracion rota).');
    process.exit(1);
  }
  if (!url || !neonReal) {
    console.log('    INFO - corrida informacional en modo fake: no se afirma el estado real de Neon.');
    console.log('    Para verificar contra Neon: $env:DATABASE_URL="postgresql://..."; node scripts/verify_025_precheck.js');
    process.exit(0);
  }
  if (!runtimeOk) {
    console.error('    FAIL - estado de Neon: la migracion 025 NO esta aplicada o falta una pieza obligatoria.');
    console.error('    Aplicar db/migrations/025_album_fotos_visible.sql COMPLETO antes del deploy v22 y re-ejecutar.');
    process.exit(1);
  }
  console.log('    OK   - 025 aplicada en Neon (visible + indice presentes). Re-ejecutar es no-op.');
}

main().catch(function (e) {
  console.error('FAIL - ' + (e && e.message ? e.message : e));
  process.exit(1);
});