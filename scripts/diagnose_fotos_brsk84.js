// diagnose_fotos_brsk84.js
// Diagnostico READ-ONLY de la discrepancia reportada por el usuario
// brsk84@gmail.com: 2 fotos visibles y 5 que "figuran como publicadas" pero
// NO se pueden ver en GET /api/interacciones?tipo=mis_fotos (api/interacciones.js
// L4859-4884, rama v22 / ADR-032 + ADR-039).
//
// QUE HACE (solo SELECT, cero escritura):
//   1. Resuelve el uuid por email en usuarios.email ($1).
//   2. Reproduce EXACTA la query de mis_fotos y lista las filas que SI se ven.
//   3. Compara contra TODAS las filas de album_fotos del usuario (sin exigir
//      visible/activo) y contra TODAS las filas de interacciones tipo='foto'
//      (sin exigir activo/texto), y detecta las causas de invisibilidad:
//      foto_url NULL/vacia, af.activo=false, af.visible=false, a.activo=false,
//      interaccion inactiva, texto (URL) NULL/vacio, fila de voto
//      (dims->>'voto_foto_id') o destino inexistente.
//   4. Imprime un reporte JSON con { uuid, visibles, rotas: [{id, motivo,
//      foto_url}] } y conteos por motivo.
//
// MODO (mismo patron que scripts/verify_025_precheck.js):
//   - Si hay DATABASE_URL valida y @neondatabase/serverless instalado: corre
//     contra Neon real (READ-ONLY).
//   - Si no: usa scripts/fake_neon.js (devuelve [] en toda query) y termina 0
//     informando que NO se puede afirmar el estado real. Nunca exige red.
//
// Uso (PowerShell):
//   node scripts/diagnose_fotos_brsk84.js
//   node scripts/diagnose_fotos_brsk84.js otro@correo.com
//   $env:DATABASE_URL="postgresql://..."; node scripts/diagnose_fotos_brsk84.js
//
// ASCII-safe (ADR-002): cero bytes > 127, cero backticks, CommonJS estricto.
'use strict';

var EMAIL_DEFECTO = 'brsk84@gmail.com';

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

function esVacia(v) {
  return v === null || v === undefined || String(v).trim() === '';
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

// Query EXACTA de la rama mis_fotos del backend (api/interacciones.js L4863-4881).
function queryMisFotos() {
  return 'SELECT sub.* FROM ('
    + ' SELECT af.id::text AS id, af.foto_url, af.foto_type, af.media_title,'
    + ' a.id::text AS album_id, a.titulo AS album_titulo, a.ciudad AS ciudad,'
    + " 'album_foto' AS fuente, NULL::text AS destino_slug, NULL::text AS destino_nombre,"
    + " (SELECT COUNT(*)::int FROM media_votos mv WHERE mv.fuente='album_foto' AND mv.item_id=af.id::text AND mv.activo=true) AS votos,"
    + ' af.creado_en'
    + ' FROM album_fotos af JOIN albumes a ON a.id=af.album_id'
    + ' WHERE af.agregador_id=$1::uuid AND af.activo=true AND af.visible=true AND a.activo=true'
    + ' UNION ALL'
    + " SELECT i.id::text, i.texto, 'foto' AS foto_type, '' AS media_title,"
    + ' NULL::text, NULL::text, d.ciudad,'
    + " 'viajero_foto', d.slug, d.nombre,"
    + " (SELECT COUNT(*)::int FROM media_votos mv WHERE mv.fuente='viajero_foto' AND mv.item_id=i.id::text AND mv.activo=true), i.creado_en"
    + ' FROM interacciones i JOIN destinos d ON d.id=i.destino_id'
    + " WHERE i.usuario_id=$1::uuid AND i.tipo='foto' AND i.activo=true"
    + " AND (i.dims IS NULL OR NOT (i.dims ? 'voto_foto_id'))"
    + ' ) sub ORDER BY sub.creado_en DESC LIMIT 200';
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
    schema: { album_fotos_visible: null },
    conteo_publicadas_sin_filtro: 0,
    visibles: 0,
    totales_album_fotos: 0,
    totales_interacciones_foto: 0,
    conteos_por_motivo: {},
    rotas: [],
    detalle_album_fotos: [],
    detalle_interacciones: [],
    errores: errores
  };

  // 0. Existe la columna visible (migracion 025)?
  var colVisible = await consultarSegura(
    sql, 'information_schema.columnas.album_fotos.visible',
    "SELECT column_name FROM information_schema.columns "
    + "WHERE table_schema='public' AND table_name='album_fotos' AND column_name='visible'",
    [], errores);
  var tieneVisible = colVisible.length > 0;
  reporte.schema.album_fotos_visible = tieneVisible;

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

  // 2. Reproducir la query de mis_fotos (lo que el endpoint devuelve hoy).
  var visibles = await consultarSegura(sql, 'mis_fotos', queryMisFotos(), [reporte.uuid], errores);
  reporte.visibles = visibles.length;
  reporte.visibles_detalle = visibles;

  // 3. TODAS las filas de album_fotos del usuario (sin filtros de estado).
  //    El conteo de misiones (api/interacciones.js L1439/1482) usa
  //    album_fotos WHERE agregador_id=$1 sin filtrar visible/activo: por eso
  //    una fila puede "figurar como publicada" y no aparecer en mis_fotos.
  var colSel = tieneVisible ? 'af.visible AS af_visible' : 'NULL::boolean AS af_visible';
  var qAf = 'SELECT af.id::text AS id, af.foto_url, af.foto_type, af.activo AS af_activo, '
    + colSel + ', af.creado_en, '
    + ' a.id::text AS album_id, a.titulo AS album_titulo, a.activo AS a_activo'
    + ' FROM album_fotos af JOIN albumes a ON a.id=af.album_id'
    + ' WHERE af.agregador_id=$1::uuid ORDER BY af.creado_en DESC LIMIT 1000';
  var todasAf = await consultarSegura(sql, 'album_fotos.todas', qAf, [reporte.uuid], errores);
  reporte.totales_album_fotos = todasAf.length;
  reporte.conteo_publicadas_sin_filtro = todasAf.length;

  // 4. TODAS las filas de interacciones tipo='foto' del usuario (sin filtros).
  var qInt = 'SELECT i.id::text AS id, i.texto, i.activo AS i_activo, i.creado_en, '
    + ' i.destino_id::text AS destino_id, d.slug, d.nombre AS destino_nombre, '
    + " (i.dims ? 'voto_foto_id') AS es_voto"
    + ' FROM interacciones i LEFT JOIN destinos d ON d.id=i.destino_id'
    + " WHERE i.usuario_id=$1::uuid AND i.tipo='foto'"
    + ' ORDER BY i.creado_en DESC LIMIT 1000';
  var todasInt = await consultarSegura(sql, 'interacciones.foto', qInt, [reporte.uuid], errores);
  reporte.totales_interacciones_foto = todasInt.length;

  var conteos = {};
  function sumarMotivo(m) { conteos[m] = (conteos[m] || 0) + 1; }

  // 5. Clasificar album_fotos.
  todasAf.forEach(function (r) {
    var motivos = [];
    if (!tieneVisible) motivos.push('album_fotos_visible_ausente');
    if (esVacia(r.foto_url)) motivos.push('foto_url_vacia');
    if (r.af_activo === false) motivos.push('album_foto_inactiva');
    if (tieneVisible && r.af_visible === false) motivos.push('album_foto_no_visible');
    if (r.a_activo === false) motivos.push('album_padre_inactivo');

    var visible = tieneVisible && r.af_activo === true && r.af_visible === true
      && r.a_activo === true && !esVacia(r.foto_url);

    reporte.detalle_album_fotos.push({
      id: r.id, fuente: 'album_foto', foto_url: r.foto_url,
      activo: r.af_activo, visible: r.af_visible, album_activo: r.a_activo,
      album_id: r.album_id, album_titulo: r.album_titulo,
      motivos: motivos, en_mis_fotos: visible, creado_en: r.creado_en
    });

    if (!visible) {
      reporte.rotas.push({
        id: r.id, fuente: 'album_foto',
        motivo: motivos.length ? motivos.join('+') : 'no_visible',
        motivos: motivos, foto_url: r.foto_url,
        publicada_probable: r.af_activo === true && r.a_activo === true
      });
      motivos.forEach(sumarMotivo);
    }
  });

  // 6. Clasificar interacciones tipo='foto' (fotos de viajero).
  todasInt.forEach(function (r) {
    var motivos = [];
    if (r.es_voto === true) motivos.push('es_voto_foto_no_media');
    if (r.i_activo === false) motivos.push('interaccion_inactiva');
    if (esVacia(r.texto)) motivos.push('foto_url_vacia');
    if (r.destino_id === null || r.destino_id === undefined) motivos.push('destino_inexistente');

    var visible = r.i_activo === true && !esVacia(r.texto)
      && r.es_voto !== true && r.destino_id !== null && r.destino_id !== undefined;

    reporte.detalle_interacciones.push({
      id: r.id, fuente: 'viajero_foto', foto_url: r.texto,
      activo: r.i_activo, es_voto: r.es_voto === true,
      destino_slug: r.slug, destino_nombre: r.destino_nombre,
      motivos: motivos, en_mis_fotos: visible, creado_en: r.creado_en
    });

    if (!visible) {
      reporte.rotas.push({
        id: r.id, fuente: 'viajero_foto',
        motivo: motivos.length ? motivos.join('+') : 'no_visible',
        motivos: motivos, foto_url: r.texto,
        publicada_probable: r.i_activo === true
      });
      motivos.forEach(sumarMotivo);
    }
  });

  reporte.conteos_por_motivo = conteos;
  reporte.discrepancia = (reporte.totales_album_fotos + reporte.totales_interacciones_foto) - reporte.visibles;
  return reporte;
}

function imprimirResumen(reporte) {
  console.log('\n--- RESUMEN ---');
  console.log('  modo                          : ' + reporte.modo);
  console.log('  email                         : ' + reporte.email);
  console.log('  uuid                          : ' + j(reporte.uuid));
  console.log('  album_fotos.visible (025)     : ' + j(reporte.schema.album_fotos_visible));
  console.log('  publicadas sin filtro (mision): ' + reporte.conteo_publicadas_sin_filtro);
  console.log('  visibles en mis_fotos         : ' + reporte.visibles);
  console.log('  total album_fotos             : ' + reporte.totales_album_fotos);
  console.log('  total interacciones tipo foto : ' + reporte.totales_interacciones_foto);
  console.log('  filas rotas (no visibles)     : ' + reporte.rotas.length);
  console.log('  conteos por motivo            : ' + j(reporte.conteos_por_motivo));
  if (reporte.errores.length) {
    console.log('  ERRORES de consulta           : ' + reporte.errores.length + ' (ver errores[] del JSON)');
  }
  console.log('-----------------------------------------------');
  console.log('  NOTA: "publicada_probable=true" marca filas que el conteo de');
  console.log('  misiones/publicaciones ve como cargadas pero mis_fotos NO muestra.');
}

async function main() {
  var email = emailObjetivo();
  var url = urlValida(process.env.DATABASE_URL);
  console.log('=== DIAGNOSTICO FOTOS ' + email + ' (READ-ONLY) ===');

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
    console.log('Para correr contra Neon: $env:DATABASE_URL="postgresql://..."; node scripts/diagnose_fotos_brsk84.js');
    process.exit(0);
  }
  if (!reporte.uuid) {
    console.error('FAIL - no se pudo resolver el uuid por email; revisar usuarios.email y DATABASE_URL.');
    process.exit(1);
  }
  process.exit(0);
}

main().catch(function (e) {
  console.error('FAIL - ' + ((e && e.message) ? e.message : e));
  process.exit(1);
});
