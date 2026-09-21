// diagnose_fotos_huerfanas.js
// Diagnostico READ-ONLY del dano por votos y comentarios huerfanos de las
// fotos curadas de galeria en produccion. CERO escritura: solo SELECT.
//
// CONTEXTO (Backend ExploraCO):
//   - La puntuacion de las fotos de galeria vive en media_votos y
//     media_comentarios con fuente='curada' (migracion 023) y cada voto
//     apunta a media_votos.item_id = destinos_fotos.id::text.
//   - api/admin-destinos.js y api/utilidades.js ?tipo=fotos actualizan la
//     galeria con semantica REPLACE: dedupe por url + DELETE + re-INSERT
//     (ADR-030, BUG-056). Cada guardado RE-CREA destinos_fotos.id, asi que
//     los votos/comentarios persistidos contra el id viejo quedan
//     HUERFANOS. El backend (resolverMediaItem de api/interacciones.js,
//     rama 'curada') resuelve con
//       SELECT id, destino_id FROM destinos_fotos WHERE id::text=$1
//     y devuelve {ok:false} cuando la fila ya no existe: la foto se
//     muestra sin su rating/comentarios.
//
// QUE HACE:
//   a. Votos curados sin fila en destinos_fotos (total y activos=true).
//   b. Total de votos curados (denominador del porcentaje de perdida).
//   c. Comentarios curados huerfanos (total y activos) + total de
//      comentarios curados.
//   d. Top de perdida por destino:
//        d1. atribucion por FK directa (siempre 1 grupo con nombre NULL:
//            el voto huerfano NO es atribuible por FK, ver limitacion).
//        d2. estimacion por firma de re-creacion: fotos actuales con url
//            repetida en el mismo destino y CERO votos.
//        d3. fotos sin votos por destino (fallback general, funciona aun
//            con el indice unico idx_destinos_fotos_destino_url aplicado).
//        d4. votos curados ACTUALES por destino (linea base sana).
//   e. Agrupacion por url: cuantas fotos actuales comparten la misma url
//      y cuantos votos acumulan; urls con duplicados y sin votos son las
//      sospechosas de haber perdido el rating al ser recreadas.
//   Preflight de esquema (patron BUG-021): tipo real de destinos_fotos.id,
//   existencia de media_votos/media_comentarios y columna destinos.nombre,
//   para no asumir el schema vivo.
//
// LIMITACION (documentada): media_votos NO guarda la url de la foto (solo
// usuario_id, fuente, item_id, xp_ganado, activo), asi que un voto
// huerfano no puede reconectarse HOY a su destino original. La perdida
// GLOBAL (a/b/c) es exacta; el detalle por destino (d2/d3) es una
// ESTIMACION por firma de re-creacion en la galeria actual.
//
// Uso (PowerShell):
//   $env:DATABASE_URL="postgresql://usuario:clave@host/bd"; node scripts/diagnose_fotos_huerfanas.js
//
// Exit: 0 si la conexion y todas las consultas terminan OK; 1 con detalle
// si la conexion o alguna consulta falla (nunca catch vacio: el error se
// tipifica con sqlstate y mensaje).
//
// ASCII-safe (ADR-002): cero bytes > 127, cero backticks, CommonJS estricto.
'use strict';

var CURADA_SQL = "'curada'";

// Valida DATABASE_URL sin exponer el secreto. Devuelve la cadena limpia o
// null si no es usable. Acepta postgres:// y postgresql://.
function validarUrl(raw) {
  if (raw === undefined || raw === null) return null;
  var s = String(raw).trim();
  if (s.length === 0) return null;
  if ((s.charAt(0) === '"' && s.charAt(s.length - 1) === '"') ||
      (s.charAt(0) === "'" && s.charAt(s.length - 1) === "'")) {
    s = s.slice(1, -1);
  }
  if (s.indexOf('...') !== -1) return null;
  if (!/^postgres(ql)?:\/\/[^\s@]+@[^\s/]+\/.+$/.test(s)) return null;
  return s;
}

// Carga el driver de Neon. Cualquier fallo (incluido MODULE_NOT_FOUND) se
// reporta con detalle y devuelve null (el caller sale con exit 1).
function cargarDriver() {
  try {
    return require('@neondatabase/serverless').neon;
  } catch (e) {
    var detalle = (e && e.message) ? e.message : String(e);
    console.error('[FAIL] no se pudo cargar @neondatabase/serverless: ' + detalle);
    console.error('       instale la dependencia (npm install @neondatabase/serverless)');
    console.error('       o corra el script donde ya este instalada (produccion).');
    return null;
  }
}

// Ejecuta una consulta y registra cualquier fallo tipificado en errores[].
// NUNCA silencia: cada error se loggea con sqlstate y mensaje (AGENTS.md
// Regla 2, prohibido el catch vacio).
async function consultar(sql, etiqueta, query, errores) {
  try {
    var filas = await sql(query, []);
    return Array.isArray(filas) ? filas : [];
  } catch (e) {
    var code = (e && e.code) ? String(e.code) : 'DESCONOCIDO';
    var msj = (e && e.message) ? e.message : String(e);
    errores.push({ consulta: etiqueta, sqlstate: code, mensaje: msj });
    console.error('[FAIL] consulta "' + etiqueta + '" -> ' + code + ': ' + msj);
    return [];
  }
}

// --- Preflight de esquema (patron BUG-021: no asumir el schema vivo) ---

function queryTipoIdFotos() {
  return 'SELECT column_name, data_type, udt_name FROM information_schema.columns'
    + ' WHERE table_schema = \'public\' AND table_name = \'destinos_fotos\''
    + ' AND column_name = \'id\'';
}

function queryRegistrosMedia() {
  return 'SELECT to_regclass(\'public.media_votos\')::text AS votos,'
    + ' to_regclass(\'public.media_comentarios\')::text AS comentarios';
}

function queryNombreDestinos() {
  return 'SELECT column_name FROM information_schema.columns'
    + ' WHERE table_schema = \'public\' AND table_name = \'destinos\''
    + ' AND column_name = \'nombre\'';
}

// --- Queries del diagnostico (todas read-only) ---

// a. Votos curados huerfanos: item_id sin fila viva en destinos_fotos.
function queryHuerfanosVotos() {
  return 'SELECT COUNT(*)::int AS total,'
    + ' COUNT(*) FILTER (WHERE mv.activo = true)::int AS activos'
    + ' FROM media_votos mv'
    + ' LEFT JOIN destinos_fotos df ON df.id::text = mv.item_id'
    + ' WHERE mv.fuente = ' + CURADA_SQL + ' AND df.id IS NULL';
}

// b. Total de votos curados (denominador).
function queryTotalVotosCurados() {
  return 'SELECT COUNT(*)::int AS total,'
    + ' COUNT(*) FILTER (WHERE activo = true)::int AS activos'
    + ' FROM media_votos'
    + ' WHERE fuente = ' + CURADA_SQL;
}

// c. Comentarios curados huerfanos.
function queryHuerfanosComentarios() {
  return 'SELECT COUNT(*)::int AS total,'
    + ' COUNT(*) FILTER (WHERE mc.activo = true)::int AS activos'
    + ' FROM media_comentarios mc'
    + ' LEFT JOIN destinos_fotos df ON df.id::text = mc.item_id'
    + ' WHERE mc.fuente = ' + CURADA_SQL + ' AND df.id IS NULL';
}

// c2. Total de comentarios curados.
function queryTotalComentariosCurados() {
  return 'SELECT COUNT(*)::int AS total,'
    + ' COUNT(*) FILTER (WHERE activo = true)::int AS activos'
    + ' FROM media_comentarios'
    + ' WHERE fuente = ' + CURADA_SQL;
}

// d1. Atribucion por FK directa. En la practica todos los huerfanos caen
// en un solo grupo con nombre NULL (la fila de origen ya no existe).
function queryHuerfanosPorFk() {
  return 'SELECT d.nombre, COUNT(*)::int AS huerfanos'
    + ' FROM media_votos mv'
    + ' LEFT JOIN destinos_fotos df ON df.id::text = mv.item_id'
    + ' LEFT JOIN destinos d ON df.destino_id = d.id'
    + ' WHERE mv.fuente = ' + CURADA_SQL + ' AND df.id IS NULL'
    + ' GROUP BY d.nombre'
    + ' ORDER BY huerfanos DESC'
    + ' LIMIT 20';
}

// d2. Estimacion por firma: fotos actuales con url repetida dentro del
// mismo destino y CERO votos (fantasmas del REPLACE).
function querySospechosasPorDestino() {
  return 'SELECT d.nombre,'
    + ' COUNT(*)::int AS fotos_sospechosas,'
    + ' COUNT(DISTINCT df.url)::int AS urls_repetidas'
    + ' FROM destinos_fotos df'
    + ' JOIN destinos d ON d.id = df.destino_id'
    + ' JOIN ('
    + '   SELECT destino_id, url FROM destinos_fotos'
    + '   GROUP BY destino_id, url HAVING COUNT(*) > 1'
    + ' ) du ON du.destino_id = df.destino_id AND du.url = df.url'
    + ' WHERE NOT EXISTS ('
    + '   SELECT 1 FROM media_votos mv'
    + '   WHERE mv.fuente = ' + CURADA_SQL
    + '     AND mv.item_id = df.id::text AND mv.activo = true'
    + ' )'
    + ' GROUP BY d.nombre'
    + ' ORDER BY fotos_sospechosas DESC, urls_repetidas DESC'
    + ' LIMIT 20';
}

// d3. Fallback general: fotos sin voto activo por destino (funciona aun
// con el indice unico ya aplicado, cuando d2 no encuentra duplicados).
function queryFotosSinVotosPorDestino() {
  return 'SELECT d.nombre, COUNT(*)::int AS fotos_sin_votos'
    + ' FROM destinos_fotos df'
    + ' JOIN destinos d ON d.id = df.destino_id'
    + ' WHERE NOT EXISTS ('
    + '   SELECT 1 FROM media_votos mv'
    + '   WHERE mv.fuente = ' + CURADA_SQL
    + '     AND mv.item_id = df.id::text AND mv.activo = true'
    + ' )'
    + ' GROUP BY d.nombre'
    + ' ORDER BY fotos_sin_votos DESC'
    + ' LIMIT 20';
}

// d4. Linea base sana: votos curados que SI sobreviven, por destino.
function queryVotosActualesPorDestino() {
  return 'SELECT d.nombre, COUNT(*)::int AS votos'
    + ' FROM media_votos mv'
    + ' JOIN destinos_fotos df ON df.id::text = mv.item_id'
    + ' JOIN destinos d ON d.id = df.destino_id'
    + ' WHERE mv.fuente = ' + CURADA_SQL + ' AND mv.activo = true'
    + ' GROUP BY d.nombre'
    + ' ORDER BY votos DESC'
    + ' LIMIT 20';
}

// e. Resumen por url: total, urls con duplicados y sospechosas (duplicada
// y sin votos).
function queryResumenUrls() {
  return 'SELECT COUNT(*)::int AS urls_distintas,'
    + ' COUNT(*) FILTER (WHERE n_fotos > 1)::int AS urls_con_duplicados,'
    + ' COUNT(*) FILTER (WHERE n_fotos > 1 AND n_votos = 0)::int AS sospechosas'
    + ' FROM ('
    + '   SELECT df.url,'
    + '     COUNT(DISTINCT df.id)::int AS n_fotos,'
    + '     COUNT(mv.usuario_id)::int AS n_votos'
    + '   FROM destinos_fotos df'
    + '   LEFT JOIN media_votos mv'
    + '     ON mv.fuente = ' + CURADA_SQL
    + '     AND mv.item_id = df.id::text AND mv.activo = true'
    + '   GROUP BY df.url'
    + ' ) u';
}

// e2. Detalle de las urls sospechosas (top).
function queryTopUrlsSospechosas() {
  return 'SELECT df.url,'
    + ' COUNT(DISTINCT df.id)::int AS fotos,'
    + ' COUNT(mv.usuario_id)::int AS votos'
    + ' FROM destinos_fotos df'
    + ' LEFT JOIN media_votos mv'
    + '   ON mv.fuente = ' + CURADA_SQL
    + '   AND mv.item_id = df.id::text AND mv.activo = true'
    + ' GROUP BY df.url'
    + ' HAVING COUNT(DISTINCT df.id) > 1 AND COUNT(mv.usuario_id) = 0'
    + ' ORDER BY fotos DESC, votos ASC'
    + ' LIMIT 50';
}

// Porcentaje con 1 decimal, sin division por cero.
function pct(parte, total) {
  if (!total || total <= 0) return null;
  return Number(((Number(parte) / Number(total)) * 100).toFixed(1));
}

function primerValor(filas, campo) {
  var f = filas && filas[0];
  return (f && f[campo] !== undefined && f[campo] !== null) ? f[campo] : null;
}

async function diagnostico(url, neon) {
  var sql = neon(url);
  var errores = [];

  var reporte = {
    script: 'diagnose_fotos_huerfanas',
    generado_en: new Date().toISOString(),
    contexto: {
      sintoma: 'votos/comentarios curados con item_id sin fila en destinos_fotos',
      causa: 'REPLACE de galeria (DELETE + re-INSERT) re-crea destinos_fotos.id (ADR-030 / BUG-056)',
      resolucion_backend: 'resolverMediaItem rama curada -> SELECT id, destino_id FROM destinos_fotos WHERE id::text=$1',
      limitacion: 'media_votos no guarda la url: perdida global exacta, detalle por destino es estimacion por firma'
    },
    schema: {
      destinos_fotos_id: null,
      media_votos_existe: null,
      media_comentarios_existe: null,
      destinos_nombre_existe: null
    },
    votos: {
      total_curados: { total: 0, activos: 0 },
      huerfanos: { total: 0, activos: 0, pct_total: null },
      por_fk: []
    },
    comentarios: {
      total_curados: { total: 0, activos: 0 },
      huerfanos: { total: 0, activos: 0, pct_total: null }
    },
    perdida_estimada: {
      sospechosas_por_destino: [],
      fotos_sin_votos_por_destino: [],
      votos_actuales_por_destino: []
    },
    urls: {
      resumen: { urls_distintas: 0, urls_con_duplicados: 0, sospechosas: 0 },
      top_sospechosas: []
    },
    errores: errores
  };

  // Preflight de esquema (patron BUG-021).
  var tipoId = await consultar(sql, 'preflight.destinos_fotos.id', queryTipoIdFotos(), errores);
  if (tipoId.length) {
    reporte.schema.destinos_fotos_id = {
      data_type: tipoId[0].data_type,
      udt_name: tipoId[0].udt_name
    };
  }
  var registros = await consultar(sql, 'preflight.to_regclass', queryRegistrosMedia(), errores);
  if (registros.length) {
    reporte.schema.media_votos_existe = registros[0].votos !== null && registros[0].votos !== undefined;
    reporte.schema.media_comentarios_existe = registros[0].comentarios !== null && registros[0].comentarios !== undefined;
  }
  var nombreDest = await consultar(sql, 'preflight.destinos.nombre', queryNombreDestinos(), errores);
  reporte.schema.destinos_nombre_existe = nombreDest.length > 0;

  // a. Votos huerfanos.
  var hv = await consultar(sql, 'votos.huerfanos', queryHuerfanosVotos(), errores);
  if (hv.length) {
    reporte.votos.huerfanos.total = Number(hv[0].total) || 0;
    reporte.votos.huerfanos.activos = Number(hv[0].activos) || 0;
  }

  // b. Total de votos curados.
  var tv = await consultar(sql, 'votos.total_curados', queryTotalVotosCurados(), errores);
  if (tv.length) {
    reporte.votos.total_curados.total = Number(tv[0].total) || 0;
    reporte.votos.total_curados.activos = Number(tv[0].activos) || 0;
  }
  reporte.votos.huerfanos.pct_total = pct(reporte.votos.huerfanos.total, reporte.votos.total_curados.total);

  // c. Comentarios huerfanos + total.
  var hc = await consultar(sql, 'comentarios.huerfanos', queryHuerfanosComentarios(), errores);
  if (hc.length) {
    reporte.comentarios.huerfanos.total = Number(hc[0].total) || 0;
    reporte.comentarios.huerfanos.activos = Number(hc[0].activos) || 0;
  }
  var tc = await consultar(sql, 'comentarios.total_curados', queryTotalComentariosCurados(), errores);
  if (tc.length) {
    reporte.comentarios.total_curados.total = Number(tc[0].total) || 0;
    reporte.comentarios.total_curados.activos = Number(tc[0].activos) || 0;
  }
  reporte.comentarios.huerfanos.pct_total = pct(reporte.comentarios.huerfanos.total, reporte.comentarios.total_curados.total);

  // d1. Huerfanos por FK (atribucion directa).
  reporte.votos.por_fk = await consultar(sql, 'votos.huerfanos_por_fk', queryHuerfanosPorFk(), errores);

  // d2. Estimacion por firma de re-creacion.
  reporte.perdida_estimada.sospechosas_por_destino =
    await consultar(sql, 'perdida.sospechosas_por_destino', querySospechosasPorDestino(), errores);

  // d3. Fallback general por destino.
  reporte.perdida_estimada.fotos_sin_votos_por_destino =
    await consultar(sql, 'perdida.fotos_sin_votos_por_destino', queryFotosSinVotosPorDestino(), errores);

  // d4. Linea base sana.
  reporte.perdida_estimada.votos_actuales_por_destino =
    await consultar(sql, 'perdida.votos_actuales_por_destino', queryVotosActualesPorDestino(), errores);

  // e. Resumen y top de urls.
  var ru = await consultar(sql, 'urls.resumen', queryResumenUrls(), errores);
  if (ru.length) {
    reporte.urls.resumen.urls_distintas = Number(ru[0].urls_distintas) || 0;
    reporte.urls.resumen.urls_con_duplicados = Number(ru[0].urls_con_duplicados) || 0;
    reporte.urls.resumen.sospechosas = Number(ru[0].sospechosas) || 0;
  }
  reporte.urls.top_sospechosas = await consultar(sql, 'urls.top_sospechosas', queryTopUrlsSospechosas(), errores);

  return reporte;
}

function lineaTopColeccion(rows, campos) {
  if (!rows || !rows.length) {
    console.log('      (sin filas)');
    return;
  }
  rows.slice(0, 20).forEach(function (r) {
    var partes = campos.map(function (c) {
      var v = r[c];
      if (v === null || v === undefined) return '-';
      var s = String(v);
      return s.length > 64 ? s.slice(0, 61) + '...' : s;
    });
    console.log('      ' + partes.join(' | '));
  });
}

function imprimirResumen(reporte) {
  var v = reporte.votos;
  var c = reporte.comentarios;
  var u = reporte.urls;
  console.log('');
  console.log('--- RESUMEN ---');
  console.log('  schema.destinos_fotos.id        : '
    + (reporte.schema.destinos_fotos_id
      ? (reporte.schema.destinos_fotos_id.data_type + ' / ' + reporte.schema.destinos_fotos_id.udt_name)
      : 'NO RESUELTO'));
  console.log('  media_votos / media_comentarios : '
    + reporte.schema.media_votos_existe + ' / ' + reporte.schema.media_comentarios_existe);
  console.log('  destinos.nombre existe          : ' + reporte.schema.destinos_nombre_existe);
  console.log('  votos curados total             : ' + v.total_curados.total
    + ' (activos ' + v.total_curados.activos + ')');
  console.log('  votos HUERFANOS                 : ' + v.huerfanos.total
    + ' (' + (v.huerfanos.pct_total === null ? 'n/a' : v.huerfanos.pct_total + '%') + ' del total)'
    + ' | activos ' + v.huerfanos.activos);
  console.log('  comentarios curados total       : ' + c.total_curados.total
    + ' (activos ' + c.total_curados.activos + ')');
  console.log('  comentarios HUERFANOS           : ' + c.huerfanos.total
    + ' (' + (c.huerfanos.pct_total === null ? 'n/a' : c.huerfanos.pct_total + '%') + ' del total)'
    + ' | activos ' + c.huerfanos.activos);
  console.log('  huerfanos atribuibles por FK    : ' + (v.por_fk.length ? v.por_fk.length : 0)
    + ' grupos (esperado 1 grupo con nombre NULL)');
  console.log('  urls distintas / duplicadas     : ' + u.resumen.urls_distintas
    + ' / ' + u.resumen.urls_con_duplicados);
  console.log('  urls sospechosas (dupl. sin voto): ' + u.resumen.sospechosas);
  console.log('');
  console.log('  [d2] sospechosas por destino (url repetida, 0 votos):');
  lineaTopColeccion(reporte.perdida_estimada.sospechosas_por_destino, ['nombre', 'fotos_sospechosas', 'urls_repetidas']);
  console.log('  [d3] fotos sin votos por destino (fallback general):');
  lineaTopColeccion(reporte.perdida_estimada.fotos_sin_votos_por_destino, ['nombre', 'fotos_sin_votos']);
  console.log('  [d4] votos actuales por destino (linea base sana):');
  lineaTopColeccion(reporte.perdida_estimada.votos_actuales_por_destino, ['nombre', 'votos']);
  console.log('  [e]  top urls sospechosas:');
  lineaTopColeccion(u.top_sospechosas, ['url', 'fotos', 'votos']);
  if (reporte.errores.length) {
    console.log('  ERRORES de consulta             : ' + reporte.errores.length
      + ' (detalle en errores[] del JSON y en los [FAIL] de arriba)');
  }
  console.log('-----------------------------------------------');
}

async function main() {
  var url = validarUrl(process.env.DATABASE_URL);
  if (!url) {
    console.error('');
    console.error('FAIL - DATABASE_URL ausente, vacia o con placeholder en el entorno.');
    console.error('       $env:DATABASE_URL="postgresql://usuario:clave@host/bd"; node scripts/diagnose_fotos_huerfanas.js');
    process.exit(1);
    return;
  }

  var neon = cargarDriver();
  if (!neon) {
    process.exit(1);
    return;
  }

  console.log('=== DIAGNOSTICO FOTOS HUERFANAS (READ-ONLY) ===');
  console.log('  conexion a Neon establecida. Ejecutando consultas...');

  var reporte = await diagnostico(url, neon);

  console.log('');
  console.log('--- REPORTE JSON ---');
  console.log(JSON.stringify(reporte, null, 2));
  imprimirResumen(reporte);

  if (reporte.errores.length) {
    console.log('FAIL - ' + reporte.errores.length + ' consulta(s) fallaron; revise los [FAIL] anteriores.');
    process.exit(1);
  }
  console.log('OK - todas las consultas terminaron. Diagnostico completo (no se escribio nada).');
  process.exit(0);
}

main().catch(function (e) {
  console.error('FAIL - error inesperado: ' + ((e && e.message) ? e.message : e));
  process.exit(1);
});