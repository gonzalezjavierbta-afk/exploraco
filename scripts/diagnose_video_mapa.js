// diagnose_video_mapa.js
// Diagnostico READ-ONLY de por que un video (o cualquier recurso) subido por
// gonzalezjavierbta@gmail.com NO aparece en el mapa cultural publico
// (api/interacciones.js, rama tipo=multimedia_mapa).
//
// CLAVE DEL SINTOMA (ADR-039 + esquema 009):
//   Las coordenadas del MAPA viven en el ALBUM (albumes.lat / albumes.lng),
//   NO en el recurso (album_fotos). Un video puede estar activo y visible y
//   aun asi NO pintarse (o pintarse sin coords) por DOS razones:
//     1) La rama publica exige a.activo=true AND af.activo=true AND
//        af.visible=true (af.visible nace false por default de la 025).
//     2) El post-filtro del endpoint descarta filas sin coords validas
//        (tieneCoordsValidas: lat/lng numericos, finitos y distintos de 0),
//        salvo que hereden coords del autor (coordsFallbackAutor, BUG-B).
//
// QUE REPORTA (solo SELECT, cero escritura):
//   1. Resuelve el uuid por email en usuarios.email ($1, parametrizable por
//      argv[2], luego env DIAG_EMAIL, default gonzalezjavierbta@gmail.com).
//   2. Lista TODAS las filas de album_fotos del usuario (incluye activo=false
//      para detectar soft-delete), con foco en foto_type='video':
//      id, foto_type, media_title, af.activo, af.visible, af.creado_en,
//      album (a.id, a.titulo, a.activo, a.lat, a.lng).
//   3. Calcula por fila:
//        en_union_album  = a.activo AND af.activo AND af.visible
//                          (condicion EXACTA de la rama album_fotos).
//        mapa_ok         = en_union_album AND coords de album validas
//                          (lat/lng no NULL y no 0).
//      y explica en motivos[] la condicion exacta que falla.
//   4. Consulta el fallback de coords del autor (coordsFallbackAutor: primera
//      interaccion visita/guardado con destino georreferenciado) para marcar
//      aparece_por_fallback cuando la fila entra a la rama pero el album no
//      tiene coords propias.
//   5. total_union: dimensiona la presion del LIMIT contando las filas del
//      UNION publico (album_fotos visibles + destinos_fotos de destinos
//      published con coords). El SQL aplica LIMIT 300 por rama y 600 global.
//   6. Conteos por foto_type y total. Imprime JSON + resumen. Sale 0.
//
// MODO (mismo patron que scripts/diagnose_media_oculta.js):
//   - Si hay DATABASE_URL valida y @neondatabase/serverless instalado: corre
//     contra Neon real (READ-ONLY).
//   - Si no: usa scripts/fake_neon.js (devuelve [] en toda query) y termina 0
//     informando que NO se puede afirmar el estado real. Nunca exige red.
//
// Uso (PowerShell):
//   node scripts/diagnose_video_mapa.js
//   node scripts/diagnose_video_mapa.js otro@correo.com
//   $env:DATABASE_URL="postgresql://..."; node scripts/diagnose_video_mapa.js
//
// ASCII-safe (ADR-002): cero bytes > 127, cero backticks, CommonJS estricto.
'use strict';

var EMAIL_DEFECTO = 'gonzalezjavierbta@gmail.com';
var LIMITE_DETALLE = 2000;

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

// Normaliza un numero de Neon a number finito, preservando NULL como null.
// (Number(null) === 0 seria un falso positivo de coords, por eso el guard.)
function numONull(v) {
  if (v === null || v === undefined) return null;
  var n = Number(v);
  return isFinite(n) ? n : null;
}

// Misma regla que api/interacciones.js tieneCoordsValidas (L224-227).
function coordsValidas(lat, lng) {
  return typeof lat === 'number' && typeof lng === 'number'
    && isFinite(lat) && isFinite(lng) && lat !== 0 && lng !== 0;
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

// Detalle: TODAS las filas del usuario (activo o no, para ver soft-delete),
// con las columnas del recurso y las del album (donde viven lat/lng).
function queryDetalle() {
  return 'SELECT af.id::text AS id, af.foto_type, af.media_title,'
    + ' af.activo AS activo, af.visible AS visible, af.creado_en,'
    + ' af.autor_original_id::text AS autor_original_id,'
    + ' a.id::text AS album_id, a.titulo AS album_titulo,'
    + ' a.activo AS album_activo, a.lat, a.lng, a.ciudad'
    + ' FROM album_fotos af LEFT JOIN albumes a ON a.id = af.album_id'
    + ' WHERE af.agregador_id = $1::uuid'
    + ' ORDER BY af.creado_en DESC LIMIT ' + String(LIMITE_DETALLE);
}

// Conteos por tipo de media (desde SQL, no truncados por el LIMIT del detalle).
function queryConteos() {
  return 'SELECT COALESCE(NULLIF(BTRIM(af.foto_type), \'\'), \'(sin_tipo)\') AS foto_type,'
    + ' COUNT(*)::int AS filas'
    + ' FROM album_fotos af'
    + ' WHERE af.agregador_id = $1::uuid'
    + ' GROUP BY 1 ORDER BY 2 DESC, 1 ASC';
}

// Total de filas del UNION publico, para dimensionar la presion del LIMIT.
// Rama 1: album_fotos visibles (a.activo=true AND af.activo=true AND
//         af.visible=true). Rama 2: destinos_fotos de destinos published con
//         coords no nulas (el post-filtro ademas exige <> 0).
function queryUnion() {
  return 'SELECT'
    + ' (SELECT COUNT(*)::int FROM album_fotos af JOIN albumes a ON a.id = af.album_id'
    + '   WHERE a.activo = true AND af.activo = true AND af.visible = true) AS album_rama,'
    + ' (SELECT COUNT(*)::int FROM destinos_fotos df JOIN destinos d ON d.id = df.destino_id'
    + '   WHERE d.lat IS NOT NULL AND d.lng IS NOT NULL AND d.status = \'published\') AS destino_rama';
}

// Fallback de coords del autor (coordsFallbackAutor, BUG-B): primera
// interaccion visita/guardado del usuario con un destino georreferenciado.
// Un solo query para todos los autores distintos del detalle (DISTINCT ON).
function queryFallback() {
  return 'SELECT DISTINCT ON (i.usuario_id) i.usuario_id::text AS usuario_id,'
    + ' d.lat, d.lng, d.ciudad'
    + ' FROM interacciones i JOIN destinos d ON d.id = i.destino_id'
    + ' WHERE i.usuario_id = ANY($1::uuid[])'
    + '   AND i.tipo IN (\'visita\', \'guardado\')'
    + '   AND d.lat IS NOT NULL AND d.lng IS NOT NULL'
    + ' ORDER BY i.usuario_id, i.creado_en DESC';
}

// Evalua una fila del detalle y deriva mapa_ok / en_union_album / motivos.
function evaluarFila(r, fallback) {
  var lat = numONull(r.lat);
  var lng = numONull(r.lng);
  var foto = (r.foto_type === null || r.foto_type === undefined)
    ? '' : String(r.foto_type).trim();
  var tipo = foto === '' ? '(sin_tipo)' : foto;
  var afActivo = r.activo === true;
  var afVisible = r.visible === true;
  var albumExiste = (r.album_id !== null && r.album_id !== undefined);
  var aActivo = r.album_activo === true;
  var coords = coordsValidas(lat, lng);

  // Condicion EXACTA de la rama publica album_fotos: a.activo, af.activo,
  // af.visible=true (ADR-039 D.1).
  var enUnion = albumExiste && aActivo && afActivo && afVisible;
  // Definition del usuario: ademas coords propias validas en el album.
  var mapaOk = enUnion && coords;

  var motivos = [];
  if (!albumExiste) motivos.push('album_inexistente');
  if (!afActivo) motivos.push('album_foto_inactivo');
  if (!afVisible) motivos.push('album_foto_visible_false');
  if (albumExiste && !aActivo) motivos.push('album_inactivo');
  if (enUnion && !coords) {
    if (lat === null || lng === null) motivos.push('album_sin_coords (lat/lng NULL)');
    else motivos.push('album_sin_coords (lat/lng = 0)');
  }

  var fallbackOk = fallback ? coordsValidas(numONull(fallback.lat), numONull(fallback.lng)) : false;
  // Solo importa si la fila YA entro a la rama; el fallback no rescata a una
  // fila que la rama descarta antes por activo/visible.
  var apareceFallback = enUnion && !coords && fallbackOk;

  return {
    id: r.id,
    foto_type: tipo,
    media_title: r.media_title || '',
    af_activo: afActivo,
    af_visible: afVisible,
    af_creado_en: r.creado_en === undefined ? null : r.creado_en,
    autor_original_id: r.autor_original_id === null ? null : r.autor_original_id,
    album: {
      id: r.album_id === null || r.album_id === undefined ? null : r.album_id,
      titulo: r.album_titulo || '',
      activo: (r.album_activo === undefined) ? null : r.album_activo,
      lat: lat,
      lng: lng,
      ciudad: r.ciudad || null
    },
    en_union_album: enUnion,
    mapa_ok: mapaOk,
    motivo_falla: mapaOk ? null : (motivos.length ? motivos.join(' + ') : 'desconocido'),
    motivos: motivos,
    aparece_por_fallback: apareceFallback,
    fallback: (fallback && fallbackOk) ? {
      lat: numONull(fallback.lat),
      lng: numONull(fallback.lng),
      ciudad: fallback.ciudad || null
    } : null
  };
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
      sintoma: 'video subido que no aparece en el mapa cultural publico',
      endpoint: 'api/interacciones.js tipo=multimedia_mapa',
      rama_album: 'a.activo=true AND af.activo=true AND af.visible=true',
      coords_en_album: 'albumes.lat / albumes.lng (no en album_fotos)',
      post_filtro_coords: 'tieneCoordsValidas: numericos, finitos, distintos de 0',
      fallback_autor: 'coordsFallbackAutor (visita/guardado con destino georreferenciado)',
      limites: 'LIMIT 300 por rama y 600 global',
      detalle_incluye: 'todas las filas del usuario (incluye af.activo=false para diagnosticar soft-delete)'
    },
    schema: {
      album_fotos_visible: null,
      albumes_coords: null
    },
    conteos_por_foto_type: {},
    total_filas_usuario: 0,
    total_detalle: 0,
    total_union: {
      album_rama: 0,
      destino_rama: 0,
      total: 0
    },
    filas: [],
    resumen: {
      videos_total: 0,
      videos_map_ok: 0,
      videos_en_union: 0,
      videos_fallan: 0,
      videos_aparecen_por_fallback: 0,
      motivos_video: {},
      fallan_detalle: []
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

  // 0b. Existen las columnas de coords del album?
  var colCoords = await consultarSegura(
    sql, 'information_schema.columnas.albumes.lat_lng',
    "SELECT column_name FROM information_schema.columns "
    + "WHERE table_schema='public' AND table_name='albumes' AND column_name IN ('lat','lng')",
    [], errores);
  reporte.schema.albumes_coords = colCoords.length;

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

  // 2. Conteos por tipo (SQL, sin truncar).
  var conteos = await consultarSegura(sql, 'usuario.conteos_por_tipo', queryConteos(), [reporte.uuid], errores);
  var totalSql = 0;
  conteos.forEach(function (r) {
    var tipo = r.foto_type === null || r.foto_type === undefined ? '(sin_tipo)' : String(r.foto_type);
    reporte.conteos_por_foto_type[tipo] = Number(r.filas) || 0;
    totalSql += Number(r.filas) || 0;
  });
  reporte.total_filas_usuario = totalSql;

  // 3. Detalle.
  var detalle = await consultarSegura(sql, 'usuario.detalle', queryDetalle(), [reporte.uuid], errores);
  reporte.total_detalle = detalle.length;

  // 4. Fallback de coords por autor (solo si hay autores a consultar).
  var autores = {};
  detalle.forEach(function (r) {
    if (r.autor_original_id) autores[String(r.autor_original_id)] = true;
  });
  var listaAutores = Object.keys(autores);
  var fallbacks = {};
  if (listaAutores.length) {
    var fb = await consultarSegura(sql, 'autores.fallback_coords', queryFallback(), [listaAutores], errores);
    fb.forEach(function (r) {
      if (r && r.usuario_id) fallbacks[String(r.usuario_id)] = r;
    });
  }

  // 5. Union publico: presion del LIMIT.
  var union = await consultarSegura(sql, 'union_mapa.conteos', queryUnion(), [], errores);
  if (union.length) {
    var ar = Number(union[0].album_rama) || 0;
    var dr = Number(union[0].destino_rama) || 0;
    reporte.total_union.album_rama = ar;
    reporte.total_union.destino_rama = dr;
    reporte.total_union.total = ar + dr;
  }

  // 6. Evaluacion por fila.
  var porTipo = {};
  var resumen = reporte.resumen;
  resumen.motivos_video = {};

  reporte.filas = detalle.map(function (r) {
    var fbRow = r.autor_original_id ? fallbacks[String(r.autor_original_id)] : null;
    var ev = evaluarFila(r, fbRow);

    porTipo[ev.foto_type] = (porTipo[ev.foto_type] || 0) + 1;

    if (ev.foto_type === 'video') {
      resumen.videos_total++;
      if (ev.en_union_album) resumen.videos_en_union++;
      if (ev.mapa_ok) resumen.videos_map_ok++;
      if (ev.aparece_por_fallback) resumen.videos_aparecen_por_fallback++;
      if (!ev.mapa_ok) {
        resumen.videos_fallan++;
        var clave = ev.motivo_falla || 'desconocido';
        resumen.motivos_video[clave] = (resumen.motivos_video[clave] || 0) + 1;
        resumen.fallan_detalle.push({
          id: ev.id,
          media_title: ev.media_title,
          motivo_falla: ev.motivo_falla,
          en_union_album: ev.en_union_album,
          aparece_por_fallback: ev.aparece_por_fallback,
          album_id: ev.album.id,
          album_titulo: ev.album.titulo
        });
      }
    }
    return ev;
  });

  reporte.resumen.conteos_por_tipo_detalle = porTipo;
  return reporte;
}

function imprimirResumen(reporte) {
  var r = reporte.resumen;
  console.log('\n--- RESUMEN ---');
  console.log('  modo                          : ' + reporte.modo);
  console.log('  email                         : ' + reporte.email);
  console.log('  uuid                          : ' + j(reporte.uuid));
  console.log('  album_fotos.visible (025)     : ' + j(reporte.schema.album_fotos_visible));
  console.log('  filas usuario (SQL)           : ' + reporte.total_filas_usuario);
  console.log('  filas detalle                 : ' + reporte.total_detalle);
  console.log('  conteos por foto_type         : ' + j(reporte.conteos_por_foto_type));
  console.log('  UNION publico (album/destino) : ' + reporte.total_union.album_rama
    + ' / ' + reporte.total_union.destino_rama + ' = ' + reporte.total_union.total);
  console.log('  LIMIT del endpoint            : 300 por rama, 600 global');
  console.log('  videos totales                : ' + r.videos_total);
  console.log('  videos en la rama (en_union)  : ' + r.videos_en_union);
  console.log('  videos mapa_ok=true           : ' + r.videos_map_ok);
  console.log('  videos que FALLAN             : ' + r.videos_fallan);
  console.log('  videos con coords heredadas   : ' + r.videos_aparecen_por_fallback);
  console.log('  motivos de falla (video)      : ' + j(r.motivos_video));
  if (r.fallan_detalle.length) {
    console.log('  detalle de videos que fallan  :');
    r.fallan_detalle.forEach(function (f) {
      console.log('    - ' + f.id + ' | ' + (f.media_title || '(sin titulo)')
        + ' | ' + f.motivo_falla
        + (f.aparece_por_fallback ? ' | recuperable por fallback' : ''));
    });
  }
  if (reporte.errores.length) {
    console.log('  ERRORES de consulta           : ' + reporte.errores.length + ' (ver errores[] del JSON)');
  }
  console.log('-----------------------------------------------');
  console.log('  mapa_ok=true exige, ADEMAS de entrar a la rama, que el ALBUM');
  console.log('  tenga lat/lng validas (no NULL y no 0). Las coords viven en');
  console.log('  albumes, no en album_fotos: revisar el album del video.');
}

async function main() {
  var email = emailObjetivo();
  require('./load_env_local')();
  var url = urlValida(process.env.DATABASE_URL);
  console.log('=== DIAGNOSTICO VIDEO EN MAPA ' + email + ' (READ-ONLY) ===');

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
    console.log('Para correr contra Neon: $env:DATABASE_URL="postgresql://..."; node scripts/diagnose_video_mapa.js');
  }
  // Diagnostico READ-ONLY: siempre sale 0 (el estado real queda en el JSON).
  process.exit(0);
}

main().catch(function (e) {
  console.error('FAIL - ' + ((e && e.message) ? e.message : e));
  process.exit(1);
});
