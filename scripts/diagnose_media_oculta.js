// diagnose_media_oculta.js
// Diagnostico READ-ONLY de la media que quedo con album_fotos.visible=false
// (default de la migracion 025) y por eso NO aparece en la capa publica del
// mapa cultural (api/interacciones.js, rama tipo=multimedia_mapa, filtro
// a.activo=true AND af.activo=true AND af.visible=true) ni en las vistas
// publicas. Caso reportado: la cuenta gonzalezjavierbta@gmail.com subio
// videos y al re-subirlos choca con el indice unico idx_album_fotos_dedup
// (album_id, foto_url, autor_original_id) de la migracion 009.
//
// QUE HACE (solo SELECT, cero escritura):
//   1. Resuelve el uuid por email en usuarios.email ($1, parametrizable por
//      argv[2], luego env DIAG_EMAIL, default gonzalezjavierbta@gmail.com).
//   2. Lista TODAS las filas de album_fotos del usuario con activo=true AND
//      visible=false: id, foto_type, media_title, foto_url, album_id,
//      album_titulo, autor_original_id, creado_en (las candidatas a
//      "no aparecen").
//   3. Reporta conteos por foto_type y el total (desde SQL y desde el
//      detalle, para detectar truncamiento por LIMIT).
//   4. Cruza con el indice de dedup idx_album_fotos_dedup: para cada fila
//      oculta calcula cuantas filas comparten su clave
//      (album_id, foto_url, autor_original_id) y marca es_unico /
//      retry_23505 (si el reintento de subida daria 23505). Nota Postgres:
//      en un indice unico los NULL son distintos, por eso una fila con
//      autor_original_id IS NULL NO bloquea un reintento con NULL.
//   5. Verifica la existencia y la definicion del indice de dedup.
//   6. Imprime el reporte JSON y sale 0.
//
// MODO (mismo patron que scripts/diagnose_fotos_brsk84.js):
//   - Si hay DATABASE_URL valida y @neondatabase/serverless instalado: corre
//     contra Neon real (READ-ONLY).
//   - Si no: usa scripts/fake_neon.js (devuelve [] en toda query) y termina 0
//     informando que NO se puede afirmar el estado real. Nunca exige red.
//
// Uso (PowerShell):
//   node scripts/diagnose_media_oculta.js
//   node scripts/diagnose_media_oculta.js otro@correo.com
//   $env:DATABASE_URL="postgresql://..."; node scripts/diagnose_media_oculta.js
//
// ASCII-safe (ADR-002): cero bytes > 127, cero backticks, CommonJS estricto.
'use strict';

var EMAIL_DEFECTO = 'gonzalezjavierbta@gmail.com';

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

function obtenerDriverFake() {
  return require('./fake_neon').neon;
}

function emailObjetivo() {
  var a = process.argv[2];
  if (a && String(a).trim()) return String(a).trim();
  var e = process.env.DIAG_EMAIL;
  if (e && String(e).trim()) return String(e).trim();
  return EMAIL_DEFECTO;
}

// Consulta tipada: NUNCA silencia un error (AGENTS.md Regla 2). Cada fallo se
// registra en errores[] con su SQLSTATE y mensaje y se devuelve [] para que el
// diagnostico continue con las consultas que si funcionan.
async function consultarSegura(sql, etiqueta, query, params, errores) {
  try {
    var rows = await sql(query, params);
    return Array.isArray(rows) ? rows : [];
  } catch (e) {
    errores.push({
      consulta: etiqueta,
      sqlstate: (e && e.code) ? String(e.code) : null,
      mensaje: (e && e.message) ? String(e.message) : String(e)
    });
    return [];
  }
}

// Detalle de las filas ocultas del usuario. WHERE EXACTO del sintoma:
// activo=true AND visible=false (nace oculta con el default de la 025 y el
// dueno no la ve publicada).
function queryOcultas() {
  return 'SELECT af.id::text AS id, af.foto_type, af.media_title, af.foto_url,'
    + ' af.album_id::text AS album_id, a.titulo AS album_titulo,'
    + ' af.autor_original_id::text AS autor_original_id,'
    + ' af.activo AS activo, af.visible AS visible, af.creado_en'
    + ' FROM album_fotos af JOIN albumes a ON a.id = af.album_id'
    + ' WHERE af.agregador_id = $1::uuid AND af.activo = true AND af.visible = false'
    + ' ORDER BY af.creado_en DESC LIMIT 2000';
}

// Conteos por tipo de media (desde SQL, no truncados por el LIMIT del detalle).
function queryConteosTipo() {
  return 'SELECT COALESCE(NULLIF(BTRIM(af.foto_type), \'\'), \'(sin_tipo)\') AS foto_type,'
    + ' COUNT(*)::int AS filas'
    + ' FROM album_fotos af'
    + ' WHERE af.agregador_id = $1::uuid AND af.activo = true AND af.visible = false'
    + ' GROUP BY 1 ORDER BY 2 DESC, 1 ASC';
}

// Ocupacion de la clave del indice idx_album_fotos_dedup para cada fila
// oculta. Acota el GROUP BY con EXISTS a las claves de las filas ocultas para
// no agrupar toda la tabla.
function queryDedup() {
  return 'WITH ocultas AS ('
    + ' SELECT af.id, af.album_id, af.foto_url, af.autor_original_id'
    + ' FROM album_fotos af'
    + ' WHERE af.agregador_id = $1::uuid AND af.activo = true AND af.visible = false'
    + '),'
    + ' claves AS ('
    + ' SELECT af.album_id, af.foto_url, af.autor_original_id, COUNT(*)::int AS ocupantes'
    + ' FROM album_fotos af'
    + ' WHERE EXISTS ('
    + '   SELECT 1 FROM ocultas o'
    + '   WHERE o.album_id = af.album_id'
    + '     AND o.foto_url IS NOT DISTINCT FROM af.foto_url'
    + '     AND o.autor_original_id IS NOT DISTINCT FROM af.autor_original_id'
    + ' )'
    + ' GROUP BY af.album_id, af.foto_url, af.autor_original_id'
    + ' )'
    + ' SELECT o.id::text AS id, c.ocupantes::int AS ocupantes'
    + ' FROM ocultas o JOIN claves c'
    + '   ON c.album_id = o.album_id'
    + '  AND c.foto_url IS NOT DISTINCT FROM o.foto_url'
    + '  AND c.autor_original_id IS NOT DISTINCT FROM o.autor_original_id';
}

async function diagnostico(url, neon, email) {
  var esFake = (neon === obtenerDriverFake());
  var sql = neon(url);
  var errores = [];

  var reporte = {
    email: email,
    uuid: null,
    nombre: null,
    modo: esFake ? 'fake' : 'real',
    generado_en: new Date().toISOString(),
    contexto: {
      sintoma: 'album_fotos.visible=false no aparece en multimedia_mapa ni en vistas publicas',
      filtro_mapa_publico: 'a.activo=true AND af.activo=true AND af.visible=true',
      indice_dedup: 'idx_album_fotos_dedup (album_id, foto_url, autor_original_id)'
    },
    schema: {
      album_fotos_visible: null,
      idx_album_fotos_dedup: { existe: null, definicion: null }
    },
    ocultas: {
      total_sql: 0,
      conteos_por_foto_type: {},
      total_detalle: 0,
      filas: []
    },
    resumen: {
      total_ocultas: 0,
      por_foto_type: {},
      unicidad: { claves_unicas: 0, con_filas_extra: 0, autor_null: 0 },
      reintento_23505: 0
    },
    errores: errores
  };

  // 0a. Existe la columna visible (migracion 025)?
  var colVisible = await consultarSegura(
    sql, 'information_schema.columnas.album_fotos.visible',
    "SELECT column_name FROM information_schema.columns "
    + "WHERE table_schema='public' AND table_name='album_fotos' AND column_name='visible'",
    [], errores);
  var tieneVisible = colVisible.length > 0;
  reporte.schema.album_fotos_visible = tieneVisible;

  if (!tieneVisible) {
    reporte.aviso = esFake
      ? 'Modo fake (sin DATABASE_URL): no se puede afirmar el estado real de Neon.'
      : 'La columna album_fotos.visible NO existe: aplicar la migracion 025 antes de diagnosticar.';
    return reporte;
  }

  // 0b. Existe y que definicion tiene el indice de dedup?
  var idx = await consultarSegura(
    sql, 'pg_indexes.idx_album_fotos_dedup',
    "SELECT indexname, indexdef FROM pg_indexes "
    + "WHERE schemaname='public' AND indexname='idx_album_fotos_dedup'",
    [], errores);
  reporte.schema.idx_album_fotos_dedup.existe = idx.length > 0;
  reporte.schema.idx_album_fotos_dedup.definicion = idx.length ? idx[0].indexdef : null;

  // 1. Resolver uuid por email.
  var usuarios = await consultarSegura(
    sql, 'usuarios.por_email',
    'SELECT id::text AS id, nombre FROM usuarios WHERE email=$1 LIMIT 1',
    [email], errores);

  if (!usuarios.length) {
    reporte.aviso = esFake
      ? 'Modo fake (sin DATABASE_URL): no se puede resolver el uuid ni afirmar el estado real de Neon.'
      : ('No existe usuario con email=' + email + ' (o usuarios.email no coincide).');
    return reporte;
  }
  reporte.uuid = usuarios[0].id;
  reporte.nombre = usuarios[0].nombre || '';

  // 2. Conteos por tipo (SQL).
  var conteos = await consultarSegura(sql, 'ocultas.conteos_por_tipo', queryConteosTipo(), [reporte.uuid], errores);
  var totalSql = 0;
  conteos.forEach(function (r) {
    var tipo = r.foto_type === null || r.foto_type === undefined ? '(sin_tipo)' : String(r.foto_type);
    reporte.ocultas.conteos_por_foto_type[tipo] = Number(r.filas) || 0;
    totalSql += Number(r.filas) || 0;
  });
  reporte.ocultas.total_sql = totalSql;

  // 3. Detalle de las filas ocultas.
  var filas = await consultarSegura(sql, 'ocultas.detalle', queryOcultas(), [reporte.uuid], errores);
  reporte.ocultas.total_detalle = filas.length;

  // 4. Ocupacion de la clave de dedup por fila oculta.
  var dedup = await consultarSegura(sql, 'ocultas.dedup', queryDedup(), [reporte.uuid], errores);
  var mapaDedup = {};
  dedup.forEach(function (r) {
    mapaDedup[String(r.id)] = Number(r.ocupantes) || 0;
  });

  var porTipo = {};
  var unicidad = { claves_unicas: 0, con_filas_extra: 0, autor_null: 0 };
  var reintento23505 = 0;

  reporte.ocultas.filas = filas.map(function (r) {
    var tipo = r.foto_type === null || r.foto_type === undefined ? '(sin_tipo)' : String(r.foto_type);
    porTipo[tipo] = (porTipo[tipo] || 0) + 1;

    var ocupantes = Object.prototype.hasOwnProperty.call(mapaDedup, String(r.id))
      ? mapaDedup[String(r.id)] : null;
    var autorNull = (r.autor_original_id === null || r.autor_original_id === undefined);
    var esUnico = ocupantes === 1;
    // Un INSERT identico vuelve a chocar con el indice unico si su clave ya
    // esta ocupada y autor_original_id NO es NULL (en un indice unico los NULL
    // son distintos). Como la propia fila oculta ocupa la clave, esUnico=true
    // tambien implica 23505 en el reintento.
    var retry23505 = (ocupantes !== null) && (ocupantes >= 1) && !autorNull;

    if (esUnico) unicidad.claves_unicas++;
    if (ocupantes !== null && ocupantes > 1) unicidad.con_filas_extra++;
    if (autorNull) unicidad.autor_null++;
    if (retry23505) reintento23505++;

    return {
      id: r.id,
      foto_type: tipo,
      media_title: r.media_title || '',
      foto_url: r.foto_url,
      album_id: r.album_id,
      album_titulo: r.album_titulo || '',
      autor_original_id: r.autor_original_id,
      creado_en: r.creado_en,
      dedup: {
        ocupantes: ocupantes,
        es_unico: esUnico,
        filas_extra: ocupantes === null ? null : (ocupantes - 1),
        autor_null: autorNull,
        retry_23505: retry23505
      }
    };
  });

  reporte.resumen.total_ocultas = filas.length;
  reporte.resumen.por_foto_type = porTipo;
  reporte.resumen.unicidad = unicidad;
  reporte.resumen.reintento_23505 = reintento23505;

  return reporte;
}

function imprimirResumen(reporte) {
  console.log('\n--- RESUMEN ---');
  console.log('  modo                          : ' + reporte.modo);
  console.log('  email                         : ' + reporte.email);
  console.log('  uuid                          : ' + j(reporte.uuid));
  console.log('  album_fotos.visible (025)     : ' + j(reporte.schema.album_fotos_visible));
  console.log('  idx_album_fotos_dedup         : ' + j(reporte.schema.idx_album_fotos_dedup.existe));
  console.log('  filas ocultas (SQL)           : ' + reporte.ocultas.total_sql);
  console.log('  filas ocultas (detalle)       : ' + reporte.ocultas.total_detalle);
  console.log('  conteos por foto_type         : ' + j(reporte.ocultas.conteos_por_foto_type));
  console.log('  reintento daria 23505         : ' + reporte.resumen.reintento_23505);
  console.log('  claves unicas / filas extra   : ' + reporte.resumen.unicidad.claves_unicas
    + ' / ' + reporte.resumen.unicidad.con_filas_extra);
  console.log('  autor_original_id NULL        : ' + reporte.resumen.unicidad.autor_null);
  if (reporte.errores.length) {
    console.log('  ERRORES de consulta           : ' + reporte.errores.length + ' (ver errores[] del JSON)');
  }
  console.log('-----------------------------------------------');
  console.log('  Remediar con db/cleanups/003_publicar_media_oculta.sql');
  console.log('  (publica visible=true SOLO para este usuario; idempotente).');
}

async function main() {
  var email = emailObjetivo();
  var url = urlValida(process.env.DATABASE_URL);
  console.log('=== DIAGNOSTICO MEDIA OCULTA ' + email + ' (READ-ONLY) ===');

  var neonReal = null;
  try {
    neonReal = require('@neondatabase/serverless').neon;
  } catch (e) {
    if (e && e.code === 'MODULE_NOT_FOUND') {
      console.log('[INFO] @neondatabase/serverless no instalado; sin DATABASE_URL la corrida es 100 por ciento fake (sin red).');
    } else {
      console.error('[FAIL] error inesperado al cargar el driver: ' + ((e && e.message) ? e.message : e));
      process.exit(1);
    }
  }

  var reporte;
  if (url && neonReal) {
    reporte = await diagnostico(url, neonReal, email);
  } else {
    reporte = await diagnostico(url || 'postgresql://fake:fake@localhost/fake', obtenerDriverFake(), email);
  }

  console.log('\n--- REPORTE JSON ---');
  console.log(JSON.stringify(reporte, null, 2));
  imprimirResumen(reporte);

  if (reporte.modo === 'fake') {
    console.log('INFO - corrida informacional en modo fake: no se afirma el estado real de Neon.');
    console.log('Para correr contra Neon: $env:DATABASE_URL="postgresql://..."; node scripts/diagnose_media_oculta.js');
  }
  // Diagnostico READ-ONLY: siempre sale 0 (el estado real queda en el JSON).
  process.exit(0);
}

main().catch(function (e) {
  console.error('FAIL - ' + ((e && e.message) ? e.message : e));
  process.exit(1);
});
