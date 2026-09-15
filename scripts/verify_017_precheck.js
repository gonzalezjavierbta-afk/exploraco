// verify_017_precheck.js
// Pre-chequeo READ-ONLY para la migracion 017 (TSK-103 / ADR-028).
// NO modifica datos: solo SELECT sobre information_schema, pg_constraint,
// pg_indexes y SELECT DISTINCT. Usa @neondatabase/serverless (nunca pg).
//
// Uso (PowerShell):
//   $env:DATABASE_URL="postgresql://..."; node scripts/verify_017_precheck.js
//
// ASCII-safe (0 bytes > 127) y CommonJS estricto.
'use strict';

var neon = require('@neondatabase/serverless').neon;

function j(v) { return JSON.stringify(v); }

// Diagnostica la cadena sin exponer el secreto. Devuelve null si es usable.
function diagnostico(raw) {
  if (raw === undefined || raw === null || String(raw).trim() === '') {
    console.error('FAIL - DATABASE_URL esta vacia o ausente en el entorno.');
    console.error('       Recuerda comillas y sin espacios: $env:DATABASE_URL="postgresql://..."; node scripts/verify_017_precheck.js');
    return null;
  }
  var s = String(raw).trim();
  if ((s.charAt(0) === '"' && s.charAt(s.length - 1) === '"') ||
      (s.charAt(0) === "'" && s.charAt(s.length - 1) === "'")) {
    s = s.slice(1, -1);
  }
  var issues = [];
  if (s.indexOf('postgresql://') !== 0 && s.indexOf('postgres://') !== 0) issues.push('no empieza por postgresql://');
  if (s.indexOf('...') !== -1) issues.push('contiene "..." (placeholder sin reemplazar)');
  if (/\s/.test(s)) issues.push('contiene espacios');
  var resto = s.replace(/^postgres(ql)?:\/\//, '');
  var at = resto.indexOf('@');
  var cred = at >= 0 ? resto.slice(0, at) : '';
  var dp = cred.indexOf(':');
  if (at < 0) issues.push('sin "@" (falta host)');
  if (dp < 0) issues.push('sin ":" antes de "@" (falta password)');
  if (dp === 0) issues.push('usuario vacio');
  var hostDb = at >= 0 ? resto.slice(at + 1) : '';
  var slash = hostDb.indexOf('/');
  if (slash < 0) issues.push('sin "/dbname"');
  console.log('[0] Diagnostico de DATABASE_URL (secreto oculto):');
  console.log('    longitud total : ' + s.length);
  console.log('    protocolo      : ' + (s.indexOf('postgresql://') === 0 ? 'postgresql://' : (s.indexOf('postgres://') === 0 ? 'postgres://' : 'DESCONOCIDO')));
  console.log('    usuario        : ' + (dp > 0 ? 'presente' : 'AUSENTE'));
  console.log('    password       : ' + (dp >= 0 && at > dp ? 'presente' : 'AUSENTE'));
  console.log('    host           : ' + (at >= 0 && slash > 0 ? 'presente' : 'AUSENTE'));
  console.log('    dbname         : ' + (slash >= 0 && slash < hostDb.length - 1 ? 'presente' : 'AUSENTE'));
  console.log('    espacios       : ' + (/\s/.test(s) ? 'SI (mal)' : 'no'));
  console.log('    placeholder .. : ' + (s.indexOf('...') !== -1 ? 'SI (mal)' : 'no'));
  if (issues.length) {
    console.error('FAIL - Cadena invalida: ' + issues.join('; '));
    console.error('       Copia la cadena completa de Neon (Connect > Connection string) y NO olvides el password.');
    return null;
  }
  return s;
}

async function main() {
  var url = diagnostico(process.env.DATABASE_URL);
  if (!url) { process.exit(1); }
  var sql = neon(url);

  console.log('=== PRECHECK 017 (read-only) ===\n');

  var cols = await sql(
    "SELECT column_name, data_type, is_nullable, COALESCE(column_default,'') AS def " +
    "FROM information_schema.columns " +
    "WHERE table_schema='public' AND table_name='usuarios' " +
    "AND column_name IN ('bio','pais_base','ciudad_base','faccion','vocaciones'," +
    "'email_verificado','codigo_referido','referido_por','device_hashes','foto_url') " +
    "ORDER BY column_name");
  console.log('[1] Columnas relevantes en usuarios:');
  cols.forEach(function (c) {
    console.log('    ' + c.column_name + ' | ' + c.data_type + ' | nullable=' + c.is_nullable + ' | def=' + c.def);
  });
  console.log('    TOTAL: ' + cols.length);

  var hasBio = cols.some(function (c) { return c.column_name === 'bio'; });
  console.log('    VEREDICTO bio: ' + (hasBio ? 'EXISTE (no re-declarar a ciegas)' : 'NO EXISTE (crear en 017)'));

  var tipos = await sql('SELECT DISTINCT tipo FROM chat_salas ORDER BY tipo');
  console.log('\n[2] Valores reales de chat_salas.tipo:');
  tipos.forEach(function (t) { console.log('    ' + j(t.tipo)); });

  var cons = await sql(
    "SELECT conname, pg_get_constraintdef(oid) AS def " +
    "FROM pg_constraint WHERE conrelid='public.chat_salas'::regclass ORDER BY conname");
  console.log('\n[3] Constraints de chat_salas:');
  cons.forEach(function (c) { console.log('    ' + c.conname + ' :: ' + c.def); });
  if (!cons.length) console.log('    (ninguno)');

  var idx = await sql(
    "SELECT indexname, indexdef FROM pg_indexes " +
    "WHERE schemaname='public' AND tablename IN ('chat_mensajes','chat_salas') ORDER BY tablename, indexname");
  console.log('\n[4] Indices de chat_mensajes / chat_salas:');
  idx.forEach(function (i) { console.log('    ' + i.indexname + ' :: ' + i.indexdef); });

  var consCols = await sql(
    "SELECT column_name, data_type, is_nullable, COALESCE(column_default,'') AS def " +
    "FROM information_schema.columns WHERE table_schema='public' AND table_name='consumibles' " +
    "ORDER BY ordinal_position");
  console.log('\n[5] Columnas de consumibles:');
  consCols.forEach(function (c) {
    console.log('    ' + c.column_name + ' | ' + c.data_type + ' | nullable=' + c.is_nullable + ' | def=' + c.def);
  });

  var hasCat = consCols.some(function (c) { return c.column_name === 'categoria'; });
  console.log('    VEREDICTO categoria: ' + (hasCat ? 'YA EXISTE' : 'NO EXISTE (crear en 017)'));

  var nUsu = await sql('SELECT COUNT(*)::int AS n FROM usuarios');
  var nChat = await sql('SELECT COUNT(*)::int AS n FROM chat_salas');
  console.log('\n[6] Conteos: usuarios=' + nUsu[0].n + ' chat_salas=' + nChat[0].n);

  var bioStats = null;
  if (hasBio) {
    var b = await sql('SELECT COUNT(*)::int AS total, COUNT(bio)::int AS no_null, COUNT(*) FILTER (WHERE bio <> \'\')::int AS no_vacio FROM usuarios');
    bioStats = b[0];
  }
  console.log('    bio: ' + (bioStats ? j(bioStats) : '(columna ausente)'));

  console.log('\n=== FIN PRECHECK ===');
}

main().catch(function (e) {
  console.error('FAIL - ' + (e && e.message ? e.message : e));
  process.exit(1);
});
