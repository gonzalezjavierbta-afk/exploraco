// dedupe_destinos_fotos.js
// Fase 4: limpieza de duplicados en destinos_fotos + indice unico.
// Origen del bug: cada guardado insertaba de nuevo TODAS las fotos del
// destino (sin UNIQUE(destino_id,url)), por lo que la galeria publica
// repetia la misma imagen N veces (caso hostal-r10-bogota).
//
// Modos:
//   --dry   (default): solo reporta duplicados. No escribe nada.
//   --apply: crea backup, borra duplicados y crea el indice unico.
//
// Uso (PowerShell):
//   $env:DATABASE_URL="postgresql://..."; node scripts/dedupe_destinos_fotos.js --dry
//   $env:DATABASE_URL="postgresql://..."; node scripts/dedupe_destinos_fotos.js --apply
//
// ASCII-safe (0 bytes > 127) y CommonJS estricto. Nunca loguea el secreto.
'use strict';

var neon = require('@neondatabase/serverless').neon;

function diagnostico(raw) {
  if (raw === undefined || raw === null || String(raw).trim() === '') {
    console.error('FAIL - DATABASE_URL esta vacia o ausente en el entorno.');
    console.error('       $env:DATABASE_URL="postgresql://..."; node scripts/dedupe_destinos_fotos.js --dry');
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
  var modo = process.argv.indexOf('--apply') !== -1 ? 'apply' : 'dry';
  var url = diagnostico(process.env.DATABASE_URL);
  if (!url) { process.exit(1); }
  var sql = neon(url);

  console.log('=== DEDUPE destinos_fotos (' + modo + ') ===\n');

  var total = await sql('SELECT COUNT(*)::int AS n FROM destinos_fotos');
  console.log('[1] Filas totales en destinos_fotos: ' + total[0].n);

  var dup = await sql(
    'SELECT destino_id, url, COUNT(*)::int AS copias,' +
    ' MIN(id::text) AS id_conservar,' +
    ' (COUNT(*) - 1) AS a_borrar' +
    ' FROM destinos_fotos' +
    ' GROUP BY destino_id, url HAVING COUNT(*) > 1' +
    ' ORDER BY copias DESC'
  );
  console.log('[2] Grupos duplicados (destino_id,url): ' + dup.length);
  var borrables = 0;
  dup.slice(0, 30).forEach(function (d) {
    borrables += d.a_borrar;
    console.log('    destino=' + d.destino_id + ' copias=' + d.copias +
                ' url=' + String(d.url).slice(0, 70));
  });
  if (dup.length > 30) console.log('    ... (' + (dup.length - 30) + ' grupos mas)');
  console.log('    Filas sobrantes a eliminar: ' + borrables);

  var idx = await sql(
    "SELECT indexname, indexdef FROM pg_indexes" +
    " WHERE schemaname='public' AND tablename='destinos_fotos'"
  );
  console.log('[3] Indices actuales de destinos_fotos:');
  idx.forEach(function (i) { console.log('    ' + i.indexname + ' :: ' + i.indexdef); });
  var tieneUnico = idx.some(function (i) {
    return /unique/i.test(i.indexdef) && /\(destino_id, url\)/i.test(i.indexdef);
  });
  console.log('    UNIQUE(destino_id,url): ' + (tieneUnico ? 'EXISTE' : 'AUSENTE'));

  if (modo === 'dry') {
    console.log('\nDRY-RUN: no se modifico nada. Ejecuta con --apply para limpiar y crear el indice.');
    return;
  }

  console.log('\n[4] Creando backup destinos_fotos_dedup_backup_20260915 ...');
  await sql(
    'CREATE TABLE IF NOT EXISTS destinos_fotos_dedup_backup_20260915 AS' +
    ' SELECT * FROM destinos_fotos'
  );
  var backupN = await sql('SELECT COUNT(*)::int AS n FROM destinos_fotos_dedup_backup_20260915');
  console.log('    Backup con ' + backupN[0].n + ' filas.');

  console.log('[5] Eliminando filas duplicadas (conserva MIN(id) por destino_id,url) ...');
  var del = await sql(
    'DELETE FROM destinos_fotos df' +
    ' USING (' +
    '   SELECT destino_id, url, MIN(id::text)::uuid AS id_ok' +
    '   FROM destinos_fotos GROUP BY destino_id, url HAVING COUNT(*) > 1' +
    ' ) d' +
    ' WHERE df.destino_id = d.destino_id AND df.url = d.url AND df.id <> d.id_ok'
  );
  console.log('    Filas eliminadas: ' + (del.count != null ? del.count : '(verificar)'));

  console.log('[6] Creando indice unico ...');
  var yaHay = await sql(
    "SELECT 1 AS uno FROM pg_indexes" +
    " WHERE schemaname='public' AND tablename='destinos_fotos'" +
    " AND indexdef ILIKE '%unique%(destino_id, url)%' LIMIT 1"
  );
  if (yaHay.length) {
    console.log('    Ya existe; no se recrea.');
  } else {
    await sql(
      'CREATE UNIQUE INDEX IF NOT EXISTS idx_destinos_fotos_destino_url' +
      ' ON destinos_fotos (destino_id, url)'
    );
    console.log('    idx_destinos_fotos_destino_url creado.');
  }

  var final = await sql('SELECT COUNT(*)::int AS n FROM destinos_fotos');
  var dupFinal = await sql(
    'SELECT COUNT(*)::int AS n FROM (' +
    '  SELECT destino_id, url FROM destinos_fotos' +
    '  GROUP BY destino_id, url HAVING COUNT(*) > 1' +
    ') x'
  );
  console.log('\n[7] Filas ahora: ' + final[0].n + ' | grupos duplicados restantes: ' + dupFinal[0].n);
  console.log('    VEREDICTO: ' + (dupFinal[0].n === 0 ? 'OK - sin duplicados' : 'FAIL - quedan duplicados'));
  console.log('=== FIN DEDUPE ===');
}

main().catch(function (e) {
  console.error('FAIL - ' + (e && e.message ? e.message : e));
  process.exit(1);
});
