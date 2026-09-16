// apply_004_foto_url.js
// Aplica la migracion 004 (usuarios.foto_url + ciudad_base) en Neon.
// Causa raiz de los 503 SCHEMA_NOT_MIGRATED en museo_publico,
// galeria_destino, albumes, album_detalle, mi_feed_fotos, fotos_top y
// perfil_publico: usuarios.foto_url no existe en produccion.
//
// Idempotente (ADD COLUMN IF NOT EXISTS) y READ-ONLY tras aplicar: solo
// verifica information_schema. No imprime secretos. ASCII-safe (0 bytes
// > 127) y CommonJS estricto.
//
// Uso (PowerShell):
//   $env:DATABASE_URL="postgresql://..."; node scripts/apply_004_foto_url.js
'use strict';

var neon = require('@neondatabase/serverless').neon;

function diagnostico(raw) {
  if (raw === undefined || raw === null || String(raw).trim() === '') {
    console.error('FAIL - DATABASE_URL esta vacia o ausente en el entorno.');
    console.error('       $env:DATABASE_URL="postgresql://..."; node scripts/apply_004_foto_url.js');
    return null;
  }
  var s = String(raw).trim();
  if ((s.charAt(0) === '"' && s.charAt(s.length - 1) === '"') ||
      (s.charAt(0) === "'" && s.charAt(s.length - 1) === "'")) {
    s = s.slice(1, -1);
  }
  if (s.indexOf('postgresql://') !== 0 && s.indexOf('postgres://') !== 0) {
    console.error('FAIL - DATABASE_URL no empieza por postgresql:// ni postgres://');
    return null;
  }
  if (s.indexOf('...') !== -1 || /\s/.test(s)) {
    console.error('FAIL - DATABASE_URL contiene placeholder "..." o espacios.');
    return null;
  }
  return s;
}

async function main() {
  var url = diagnostico(process.env.DATABASE_URL);
  if (!url) { process.exit(1); }
  var sql = neon(url);

  console.log('=== APLICAR MIGRACION 004 (usuarios.foto_url) ===\n');

  var antes = await sql(
    "SELECT column_name FROM information_schema.columns " +
    "WHERE table_schema='public' AND table_name='usuarios' " +
    "AND column_name IN ('foto_url','ciudad_base') ORDER BY column_name"
  );
  var setAntes = {};
  antes.forEach(function (c) { setAntes[c.column_name] = true; });
  console.log('[1] Antes: foto_url=' + (setAntes.foto_url ? 'EXISTE' : 'AUSENTE') +
              ' ciudad_base=' + (setAntes.ciudad_base ? 'EXISTE' : 'AUSENTE'));

  await sql('ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS foto_url text');
  console.log('[2] ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS foto_url text -> OK');

  await sql('ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS ciudad_base text');
  console.log('[3] ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS ciudad_base text -> OK');

  var despues = await sql(
    "SELECT column_name, data_type, is_nullable FROM information_schema.columns " +
    "WHERE table_schema='public' AND table_name='usuarios' " +
    "AND column_name IN ('foto_url','ciudad_base') ORDER BY column_name"
  );
  console.log('[4] Despues:');
  despues.forEach(function (c) {
    console.log('    ' + c.column_name + ' | ' + c.data_type + ' | nullable=' + c.is_nullable);
  });

  var ok = despues.length === 2;
  console.log('\nVEREDICTO: ' + (ok ? 'OK - esquema migrado' : 'FAIL - columnas faltantes'));
  if (!ok) { process.exit(1); }
  console.log('=== FIN MIGRACION 004 ===');
}

main().catch(function (e) {
  console.error('FAIL - ' + (e && e.message ? e.message : e));
  process.exit(1);
});
