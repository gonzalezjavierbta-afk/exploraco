// verify_027_precheck.js
// Pre-chequeo INFORMACIONAL (read-only) para la migracion 027
// (DB-01 zonas/marcas + DB-02 extension de consumibles para canjes de marca).
//
// QUE REPORTA
//   1. Existencia de las 6 columnas nuevas de consumibles:
//      marca_id, stock_total, stock_usado, precio_xp_base (numeric(12,2)),
//      precio_xp_actual, tipo_canje.
//   2. Existencia de las 5 tablas nuevas: zonas_geograficas, areas_geograficas,
//      ranking_zonas, marcas, patrocinios.
//   3. Chequeo estatico del working tree (que exista 027_zonas_marcas.sql y
//      que contenga los DDL clave), solo informativo.
//
// COMPORTAMIENTO
//   - NUNCA escribe: solo SELECT en information_schema / pg_catalog.
//   - Es informativo por diseno: reporta el estado con OK / INFO / FAIL
//     textuales y TERMINA EN 0 (no bloquea) aunque la 027 no este aplicada.
//   - Con DATABASE_URL valida usa Neon real; sin ella (o sin el paquete)
//     usa el stub scripts/fake_neon.js y no toca la red.
//
// Uso (PowerShell):
//   node scripts/verify_027_precheck.js
//   $env:DATABASE_URL="postgresql://..."; node scripts/verify_027_precheck.js
//
// ASCII-safe (0 bytes > 127), sin backticks, CommonJS estricto.
'use strict';

var fs = require('fs');
var path = require('path');

var ARCHIVO_027 = path.join(__dirname, '..', 'db', 'migrations', '027_zonas_marcas.sql');

// Tablas creadas por la 027 (orden estable para el reporte).
var TABLAS_NUEVAS = [
  'zonas_geograficas',
  'areas_geograficas',
  'ranking_zonas',
  'marcas',
  'patrocinios'
];

// Columnas de consumibles que la 027 debe agregar.
var COLUMNAS_CONSUMIBLES = [
  'marca_id',
  'stock_total',
  'stock_usado',
  'precio_xp_base',
  'precio_xp_actual',
  'tipo_canje'
];

// Tokenes DDL clave que el archivo de migracion debe contener (chequeo estatico).
var TOKENS_DDL = [
  'CREATE TABLE IF NOT EXISTS zonas_geograficas',
  'CREATE TABLE IF NOT EXISTS areas_geograficas',
  'CREATE TABLE IF NOT EXISTS ranking_zonas',
  'CREATE TABLE IF NOT EXISTS marcas',
  'CREATE TABLE IF NOT EXISTS patrocinios',
  'ADD COLUMN IF NOT EXISTS precio_xp_base  NUMERIC(12,2)',
  'CREATE OR REPLACE VIEW consumibles_precio'
];

function j(v) { return JSON.stringify(v); }

// Convierte una lista de constantes (nunca input de usuario) en literales SQL
// seguros entre comillas simples. Evita placeholders de array.
function literales(lista) {
  return lista.map(function (x) { return "'" + x + "'"; }).join(',');
}

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

function obtenerDriverFake() {
  return require('./fake_neon').neon;
}

// --- Chequeo estatico del working tree (nunca toca la red) ---------------
// Solo informativo: NO devuelve veredicto que bloquee.
function chequeoEstatico() {
  console.log('[1] Chequeo estatico del working tree (informacion):');
  if (!fs.existsSync(ARCHIVO_027)) {
    console.log('    INFO - no existe ' + path.basename(ARCHIVO_027) +
      ' en db/migrations/ (la 027 aun no esta versionada en este working tree).');
    return;
  }
  console.log('    OK   - ' + path.basename(ARCHIVO_027) + ' presente.');

  var contenido = fs.readFileSync(ARCHIVO_027, 'utf8');
  var faltantes = TOKENS_DDL.filter(function (t) {
    return contenido.indexOf(t) === -1;
  });
  if (faltantes.length === 0) {
    console.log('    OK   - los ' + TOKENS_DDL.length + ' DDL clave estan presentes.');
  } else {
    console.log('    INFO - DDL clave ausentes (' + faltantes.length + '):');
    faltantes.forEach(function (t) { console.log('           - ' + t); });
  }

  if (contenido.indexOf("DEFAULT 'album_foto'") !== -1) {
    console.log('    INFO - ATENCION: aparece el default antiguo album_foto;' +
      ' debe ser album_fotos (tabla real, migracion 009).');
  }
}

// --- Consultas runtime (READ-ONLY). No escribe nunca. --------------------
async function chequeoRuntime(url, neon) {
  var esFake = (neon === obtenerDriverFake());
  var sql = neon(url);

  console.log('\n[2] Chequeo runtime (READ-ONLY' +
    (esFake ? ' - MODO FAKE, sin DATABASE_URL' : ' - Neon real') + '):');

  // --- 2.1 Tablas nuevas -------------------------------------------------
  var tablas = await sql(
    "SELECT tablename FROM pg_tables " +
    "WHERE schemaname = 'public' AND tablename IN (" + literales(TABLAS_NUEVAS) + ") " +
    "ORDER BY tablename");

  var setTablas = {};
  tablas.forEach(function (t) { setTablas[t.tablename] = true; });

  console.log('    - Tablas nuevas (esperadas ' + TABLAS_NUEVAS.length + '):');
  TABLAS_NUEVAS.forEach(function (t) {
    if (setTablas[t]) {
      console.log('        OK   - ' + t);
    } else {
      console.log('        INFO - ' + t + ' NO existe' +
        (esFake ? ' (no verificable en modo fake).' : ' (la 027 no esta aplicada).'));
    }
  });

  // --- 2.2 Columnas de consumibles --------------------------------------
  var cols = await sql(
    "SELECT column_name, data_type, numeric_precision, numeric_scale, " +
    "is_nullable, COALESCE(column_default,'') AS def " +
    "FROM information_schema.columns " +
    "WHERE table_schema = 'public' AND table_name = 'consumibles' " +
    "AND column_name IN (" + literales(COLUMNAS_CONSUMIBLES) + ") " +
    "ORDER BY column_name");

  var mapaCol = {};
  cols.forEach(function (c) { mapaCol[c.column_name] = c; });

  console.log('    - Columnas de consumibles (esperadas ' + COLUMNAS_CONSUMIBLES.length + '):');
  COLUMNAS_CONSUMIBLES.forEach(function (nombre) {
    var c = mapaCol[nombre];
    if (!c) {
      console.log('        INFO - consumibles.' + nombre + ' NO existe' +
        (esFake ? ' (no verificable en modo fake).' : ' (la 027 no esta aplicada).'));
      return;
    }
    var detalle = c.data_type;
    if (c.data_type === 'numeric') {
      detalle += '(' + c.numeric_precision + ',' + c.numeric_scale + ')';
    }
    var nota = '';
    if (nombre === 'precio_xp_base' || nombre === 'precio_xp_actual') {
      if (c.data_type === 'numeric' && Number(c.numeric_precision) === 12 &&
          Number(c.numeric_scale) === 2) {
        nota = ' [OK numeric(12,2), consistente con 021]';
      } else {
        nota = ' [INFO se esperaba numeric(12,2) por 021]';
      }
    }
    console.log('        OK   - consumibles.' + nombre + ': ' + detalle +
      ' | nullable=' + c.is_nullable +
      ' | default=' + (c.def || '(sin default)') + nota);
  });

  // --- 2.3 Vista consumibles_precio (extra informativo) -----------------
  var vistas = await sql(
    "SELECT viewname FROM pg_views " +
    "WHERE schemaname = 'public' AND viewname = 'consumibles_precio'");
  if (vistas.length > 0) {
    console.log('    - Vista consumibles_precio: OK (presente).');
  } else {
    console.log('    - Vista consumibles_precio: INFO (ausente' +
      (esFake ? '; no verificable en modo fake' : '; la 027 no esta aplicada') + ').');
  }

  if (esFake) {
    console.log('    (sin DATABASE_URL: fake_neon devuelve 0 filas; el estado' +
      ' real de Neon NO se puede afirmar desde este modo).');
  }
}

// --- Orden de deploy (notas) ---------------------------------------------
function notasDeploy() {
  console.log('\n[3] Notas de orden de deploy (026 -> 027):');
  console.log('    - 027_zonas_marcas.sql es la unica migracion pendiente de' +
    ' DB-01/DB-02. Aplicar el archivo COMPLETO en el editor SQL de Neon' +
    ' DESPUES de la 026 (patron BUG-021/BUG-060).');
  console.log('    - El backend BE-01 (api/usuarios.js, tipo=marca_activar /' +
    ' marca_patrocinar) requiere la 027 aplicada ANTES del deploy.');
  console.log('    - La 027 es idempotente (ADR-008): re-ejecutar es no-op.');
  console.log('    - Este precheck es INFORMATIVO: nunca escribe y termina en 0.');
}

async function main() {
  var url = urlValida(process.env.DATABASE_URL);
  console.log('=== PRECHECK 027 (DB-01 zonas/marcas + DB-02 consumibles) ===');

  chequeoEstatico();
  notasDeploy();

  // Elector de driver: Neon real solo si hay DATABASE_URL valida y el paquete
  // esta instalado; si no, fake_neon.js (nunca se llama a la red).
  var neon = null;
  try {
    neon = require('@neondatabase/serverless').neon;
  } catch (e) {
    if (e && e.code === 'MODULE_NOT_FOUND') {
      console.log('\n    INFO - @neondatabase/serverless no instalado; sin' +
        ' DATABASE_URL la corrida es 100 por ciento fake (sin red).');
    } else {
      console.log('\n    INFO - error inesperado al cargar el driver: ' + e.message);
    }
  }

  try {
    if (url && neon) {
      await chequeoRuntime(url, neon);
    } else {
      await chequeoRuntime(url || 'postgresql://fake:fake@localhost/fake', obtenerDriverFake());
    }
  } catch (e) {
    console.log('\n    INFO - no se pudo consultar el runtime (read-only): ' +
      (e && e.message ? e.message : e));
    console.log('    INFO - la corrida sigue siendo informativa; se termina en 0.');
  }

  console.log('\n=== VEREDICTO (informacion, no bloqueo) ===');
  if (!url || !neon) {
    console.log('    INFO - corrida en modo fake: no se afirma el estado real de Neon.');
    console.log('    Para verificar contra Neon: $env:DATABASE_URL="postgresql://..."; node scripts/verify_027_precheck.js');
  } else {
    console.log('    INFO - corrida real completada; revisar OK / INFO arriba.');
    console.log('    Si faltan tablas o columnas, aplicar db/migrations/027_zonas_marcas.sql COMPLETO y re-ejecutar.');
  }
  process.exit(0);
}

main().catch(function (e) {
  // Falla solo ante un error inesperado del propio script (no del estado DB).
  console.error('FAIL - ' + (e && e.message ? e.message : e));
  process.exit(1);
});
