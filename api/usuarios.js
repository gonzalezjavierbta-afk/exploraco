// api/usuarios.js -- Vercel Serverless Function (ASCII-safe: 0 backticks, 0 no-ASCII)
// v14 (HOTFIX: SQL de device_hashes, login 500)
const { neon } = require('@neondatabase/serverless');
var crypto = require('crypto');

// Mismos umbrales que XP_LEVELS en index.html (~linea 3959 del motor de
// puntos local) y en mi-perfil/comunidad. 20 niveles en 4 Eras
// (Mundana/Patrocinada/Leyenda/Gran Maestro).
// nivel/badge_actual existian como columnas en usuarios pero
// interacciones.js nunca las escribia -- se calculan aqui en cada
// lectura a partir de xp_total en vez de guardarse, para que nunca
// puedan desincronizarse sin tener que coordinar una escritura extra en
// cada uno de los 3 lugares de interacciones.js que suman XP.
const NIVELES = [
  { min: 0,     nombre: 'Caminante Novato' },
  { min: 100,   nombre: 'Rastreador Local' },
  { min: 250,   nombre: 'Explorador Urbano' },
  { min: 450,   nombre: 'Aventurero Regional' },
  { min: 700,   nombre: 'Vanguardia Territorial' },
  { min: 1000,  nombre: 'Embajador de Zona' },
  { min: 1400,  nombre: 'Fot\u00f3grafo de Ruta' },
  { min: 1900,  nombre: 'Cronista de Historias' },
  { min: 2500,  nombre: 'Buscador de Leyendas' },
  { min: 3200,  nombre: 'Gu\u00eda de Fronteras' },
  { min: 4000,  nombre: 'Estrat\u00e9ga Comunitario' },
  { min: 5200,  nombre: 'Documentalista Visual' },
  { min: 6800,  nombre: 'Se\u00f1or del Spot' },
  { min: 8500,  nombre: 'Cart\u00f3grafo de Cine' },
  { min: 10500, nombre: 'Protector del Patrimonio' },
  { min: 13000, nombre: 'Curador de Colombia' },
  { min: 16000, nombre: 'Mariscal de Parche' },
  { min: 19500, nombre: 'Cineasta de Territorio' },
  { min: 24000, nombre: 'Inmortal del Mapa' },
  { min: 30000, nombre: 'Gran Maestro ExploraCO' },
];

function calcularNivel(xpTotal) {
  const xp = parseInt(xpTotal) || 0;
  let nivelIdx = 0;
  for (let i = 0; i < NIVELES.length; i++) {
    if (xp >= NIVELES[i].min) nivelIdx = i;
  }
  return { nivel: nivelIdx + 1, badge_actual: NIVELES[nivelIdx].nombre };
}

function calcularEra(nivel) {
  if (nivel <= 5) return 'Mundana';
  if (nivel <= 10) return 'Patrocinada';
  if (nivel <= 15) return 'Organizador';
  return 'Leyenda';
}

function conNivel(row) {
  if (!row) return row;
  const calc = calcularNivel(row.xp_total);
  row.nivel = calc.nivel;
  row.badge_actual = calc.badge_actual;
  row.era = calcularEra(calc.nivel);
  return row;
}

// Misiones que desbloquean capacidades de UI (Fase 3, ver
// api/interacciones.js MISIONES). Se declara solo el mapeo id -> nombre
// de la capacidad, no todo el catalogo: este endpoint no necesita
// evaluar condiciones (check()), solo leer que ya quedo 'completada'
// en usuarios.progreso_misiones.
const DESBLOQUEOS = {
  mis_organizador_bogota: 'organizar_actividad',
  mis_fotografo:         'subir_fotos',
  mis_chat_mensajero:    'chat',
  mis_chat_moderador:    'moderador_chat',
  mis_chat_creador:      'crear_chat',
};

// Historial de versiones: v8 (2026-09-13) sumo GET ?buscar= para admin y
// vocaciones (migracion 015); v9 (Entrega 016, 2026-09-14) agrega
// piramide de referidos, facciones, verificacion de email y sesion
// firmada JWT (ADR-025); v10 (WP-3, TSK-103 / ADR-028) cierra la fuga de
// PII en GET ?id= con whitelist owner-aware (admin o dueno), exige admin
// en ?buscar= y exige sesion firmada en ?tipo=referido_codigo; v11 (WP-5,
// TSK-103 / ADR-028) agrega las Casas (POST tipo=casa_elegir, espejo de
// faccion_elegir pero con sesion firmada y nivel 2; GET tipo=casa_ranking
// normalizado por numero de miembros). Requiere la migracion 017
// (usuarios.casa, usuarios.casa_elegida_en); v12 (WP-5, TSK-103 / ADR-028)
// agrega POST tipo=perfil_actualizar (alias perfil_editar) con SET dinamico
// parametrizado, sesion firmada del dueno, pais_base ISO-2 y merge JSONB de
// perfil_config. Requiere la migracion 017 (usuarios.intereses, pais_base,
// perfil_config, perfil_publico, dm_abierto); v13 (TSK-104 / ADR-028)
// auto-verifica al admin en el upsert de registro con un OR idempotente
// (nunca desmarca a quien ya estaba verificado), agrega la rama POST
// tipo=verificar_usuario (solo admin, Bearer ADMIN_SECRET) y devuelve
// total real en GET tipo=leaderboard; v14 (HOTFIX, 2026-09-15) corrige el
// SQL del merge de device_hashes: el ORDER BY externo junto al agregado
// sin GROUP BY era invalido en Postgres (42803) y respondia 500 en TODO
// login/registro con device_hash. Ahora el ORDER BY va dentro de
// jsonb_agg(h ORDER BY ord) y el fingerprint es best-effort (un fallo no
// bloquea el login).
// conMisiones sigue siendo MERGE con las
// capacidades del DB (migracion 010) para no destruir el inventario de
// consumibles en cada GET.
function conMisiones(row) {
  if (!row) return row;
  const progreso = row.progreso_misiones || {};
  const dbCap = row.capacidades || {};
  const misiones = {};
  Object.keys(DESBLOQUEOS).forEach((misionId) => {
    if (progreso[misionId] && progreso[misionId].estado === 'completada') {
      misiones[DESBLOQUEOS[misionId]] = true;
    }
  });
  row.capacidades = Object.assign({}, dbCap, misiones);
  return row;
}

// total_logros: cuantos trofeos desbloqueo el usuario (conteo de claves
// en progreso_logros). No se guarda en columna: se deriva en cada lectura
// igual que nivel/badge_actual, para que nunca se desincronice con el
// catalogo LOGROS de api/interacciones.js.
function conLogros(row) {
  if (!row) return row;
  const progreso = row.progreso_logros || {};
  row.total_logros = Object.keys(progreso).length;
  return row;
}

// =====================================================================
// GAMING V5.0 (Entrega 016): helpers de piramide, facciones, email y JWT
// =====================================================================

// Sesion firmada JWT (ADR-025): payload {sub, iat, exp} en base64url con
// firma HMAC-SHA256. El token dura 7 dias y viaja como Authorization
// Bearer en las llamadas posteriores. SESSION_JWT_SECRET es env var
// OBLIGATORIA en produccion (se configura en Fase 5); en desarrollo cae
// a dev_secret.
function firmarSesion(usuarioId) {
  var iat = Math.floor(Date.now() / 1000);
  var exp = iat + 7 * 24 * 3600; // +7 dias
  var payload = { sub: String(usuarioId), iat: iat, exp: exp };
  var payloadB64 = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  var firma = crypto
    .createHmac('sha256', process.env.SESSION_JWT_SECRET || 'dev_secret')
    .update(payloadB64)
    .digest('base64url');
  return payloadB64 + '.' + firma;
}

// Validador del MISMO contrato de sesion firmada (ADR-025) que
// api/interacciones.js validarSesion. Cada endpoint serverless es
// autosuficiente (no hay imports entre funciones en este repo, misma
// excepcion documentada que sendEmail en admin.js/usuarios.js), asi que
// el verificador vive aqui para permitir que el dueno vea su propio
// perfil privado. Devuelve {ok:true} o {ok:false, razon}.
function validarSesionUsuario(req, usuarioIdEsperado) {
  var encabezado = req.headers['authorization'] || '';
  if (encabezado.indexOf('Bearer ') !== 0) return { ok: false, razon: 'SESION_REQUERIDA' };
  var token = encabezado.slice(7).trim();
  var punto = token.indexOf('.');
  if (punto <= 0 || punto === token.length - 1) return { ok: false, razon: 'SESION_INVALIDA' };
  var payloadB64 = token.slice(0, punto);
  var firma = token.slice(punto + 1);
  var secreto = process.env.SESSION_JWT_SECRET || 'dev_secret';
  var firmaEsperada = crypto
    .createHmac('sha256', secreto)
    .update(payloadB64)
    .digest('base64url');
  var fa = Buffer.from(firma, 'utf8');
  var fb = Buffer.from(firmaEsperada, 'utf8');
  if (fa.length !== fb.length) return { ok: false, razon: 'SESION_INVALIDA' };
  if (!crypto.timingSafeEqual(fa, fb)) return { ok: false, razon: 'SESION_INVALIDA' };
  var payload = null;
  try {
    payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
  } catch (e) { return { ok: false, razon: 'SESION_INVALIDA' }; }
  if (!payload || !payload.exp || !payload.sub) return { ok: false, razon: 'SESION_INVALIDA' };
  if (payload.exp <= Math.floor(Date.now() / 1000)) return { ok: false, razon: 'SESION_EXPIRADA' };
  if (payload.sub !== String(usuarioIdEsperado)) return { ok: false, razon: 'SESION_INVALIDA' };
  return { ok: true };
}

// Verificacion del secreto de admin para las lecturas que devuelven PII
// (WP-3, TSK-103 / ADR-028). Reutiliza el MISMO mecanismo ya instalado en
// el repo (api/admin.js acepta X-Internal-Secret; api/utilidades.js acepta
// Authorization: Bearer): no inventa un canal nuevo. admin.html envia
// Authorization: Bearer ADMIN_SECRET (ver _adminHeaders, linea ~5791).
function esAdminUsuario(req) {
  var secreto = process.env.ADMIN_SECRET || 'exploraco12345';
  var bearer = String(req.headers['authorization'] || '').replace('Bearer ', '').trim();
  var interno = String(req.headers['x-internal-secret'] || '').trim();
  return bearer === secreto || interno === secreto;
}

// Alfabeto de codigos de referido sin caracteres ambiguos (sin 0/O y sin
// 1/l/I) para que el codigo sea legible y copiable entre usuarios.
var ALFABETO_REFERIDO = 'abcdefghjkmnpqrstuvwxyz23456789';
function generarCodigoReferido() {
  var codigo = '';
  for (var i = 0; i < 6; i++) {
    codigo += ALFABETO_REFERIDO.charAt(Math.floor(Math.random() * ALFABETO_REFERIDO.length));
  }
  return codigo;
}

// Facciones validas del CHECK de la migracion 016. 'artistas' cubre el
// bloque de vocaciones de artista (ADR-026) dentro de la competencia.
var FACCIONES_VALIDAS = ['exploradores', 'curadores', 'creadores', 'artistas'];

// Casas validas del CHECK chk_usuarios_casa de la migracion 017 (WP-5,
// TSK-103 / ADR-028). Son equipos tematicos elegibles; el Origen
// (local/nacional/extranjero) es un atributo DERIVADO que no se persiste
// como identidad y no se valida aqui.
var CASAS_VALIDAS = ['condor', 'jaguar', 'delfin'];

// Envio de email con Resend. EXCEPCION controlada al tripwire de
// no-duplicidad (5 lineas): admin.js y usuarios.js son endpoints
// autosuficientes del repo y la verificacion de email necesita su propio
// transporte. Patron identico a admin.js:31-44 (fetch con Bearer
// RESEND_API_KEY).
var RESEND_API_URL = 'https://api.resend.com/emails';
var FROM_EMAIL = 'ExploraCO <noreply@exploraco.co>';
async function sendEmail(to, subject, html) {
  var key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false, reason: 'no_api_key' };
  try {
    var r = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
      body: JSON.stringify({ from: FROM_EMAIL, to: [to], subject: subject, html: html }),
    });
    var d = await r.json();
    if (!r.ok) throw new Error(d.message || 'Resend ' + r.status);
    return { ok: true, id: d.id };
  } catch (e) { return { ok: false, error: e.message }; }
}

// Confirmacion de token de email. Compartida por la rama POST (app) y la
// rama GET (clic en el enlace del correo), para no duplicar el UPDATE
// condicional con token expirable.
async function confirmarEmail(sql, res, usuarioId, token) {
  var uid = String(usuarioId || '');
  var tk = String(token || '');
  if (!uid || !tk)
    return res.status(400).json({ ok: false, error: 'usuario_id y token requeridos' });
  var filas = await sql(
    'UPDATE usuarios SET email_verificado=true, email_token=NULL, email_token_expira=NULL '
    + 'WHERE id=$1 AND email_token=$2 AND email_token_expira > NOW() RETURNING id',
    [uid, tk]
  );
  if (!filas.length)
    return res.status(400).json({ ok: false, error: 'TOKEN_INVALIDO_O_EXPIRADO' });
  return res.json({ ok: true, data: { email_verificado: true } });
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const sql = neon(process.env.DATABASE_URL);
    const { id, tipo, limit = '10' } = req.query;

    if (req.method === 'GET') {
      if (tipo === 'leaderboard') {
        const rows = await sql(
          'SELECT id, nombre, avatar_url, perfil_tipo, xp_total, nivel, '
          + 'badge_actual, total_resenas, total_guardados '
          + 'FROM usuarios WHERE activo = true '
          + 'ORDER BY xp_total DESC '
          + 'LIMIT $1',
          [parseInt(limit)]
        );
        const countRows = await sql(
          'SELECT COUNT(*)::int AS n FROM usuarios WHERE activo = true'
        );
        return res.json({ ok: true, data: rows.map(conNivel), total: parseInt(countRows[0].n || 0) });
      }
      if (tipo === 'buscar' || req.query.buscar) {
        // Solo admin: la proyeccion incluye email (PII) y el buscador por
        // email no debe ser enumerable por cualquiera. admin.html ya envia
        // _adminHeaders() (Authorization: Bearer ADMIN_SECRET).
        if (!esAdminUsuario(req))
          return res.status(401).json({ ok: false, error: 'No autorizado' });
        const palabra = String(req.query.buscar || '').trim();
        if (palabra.length < 2) return res.status(400).json({ ok: false, error: 'Minimo 2 caracteres' });
        const rows = await sql(
          'SELECT id, nombre, email, avatar_url, xp_total, total_resenas, total_guardados '
          + 'FROM usuarios WHERE activo = true AND (nombre ILIKE $1 OR email ILIKE $1) '
          + 'ORDER BY xp_total DESC LIMIT $2',
          ['%' + palabra + '%', 20]
        );
        const data = rows.map(function (r) {
          return conLogros(conMisiones(conNivel(r)));
        });
        return res.json({ ok: true, data });
      }

      // Version ligera del perfil publico (TSK-103 / ADR-028, WP-3) para
      // tarjetas y hover: nombre, foto, nivel, faccion y casa. Si el
      // perfil es privado responde 403 con el minimo (nombre + nivel),
      // salvo el dueno con sesion firmada (ADR-025).
      if (tipo === 'perfil_publico' && (id || req.query.usuario_id)) {
        var ppTarget = String(id || req.query.usuario_id || '');
        // Migracion 004 pendiente: si usuarios.foto_url aun no existe en
        // Neon (42703), se reintenta la MISMA consulta sin la columna y el
        // perfil publico responde 200 con foto_url=null (el mapeo
        // ppU.foto_url || null ya lo resuelve) en vez de escalar al 503
        // global (SCHEMA_NOT_MIGRATED). Cualquier otro codigo se re-lanza
        // al catch global del handler.
        var ppRows;
        try {
          ppRows = await sql(
            'SELECT id, nombre, avatar_url, foto_url, xp_total, faccion, casa, perfil_publico'
            + ' FROM usuarios WHERE id=$1 AND activo=true LIMIT 1',
            [ppTarget]
          );
        } catch (eFoto) {
          if (!eFoto || eFoto.code !== '42703') throw eFoto;
          console.error('[usuarios] perfil_publico degradado 42703: ' + eFoto.message);
          ppRows = await sql(
            'SELECT id, nombre, avatar_url, xp_total, faccion, casa, perfil_publico'
            + ' FROM usuarios WHERE id=$1 AND activo=true LIMIT 1',
            [ppTarget]
          );
        }
        if (!ppRows.length)
          return res.status(404).json({ ok: false, error: 'Usuario no encontrado' });
        var ppU = ppRows[0];
        var ppNivel = calcularNivel(ppU.xp_total).nivel;
        var ppPublico = (ppU.perfil_publico !== false);
        if (!ppPublico) {
          var ppSes = validarSesionUsuario(req, String(ppU.id));
          if (!ppSes.ok) {
            return res.status(403).json({
              ok: false,
              error: 'PERFIL_PRIVADO',
              data: { nombre: ppU.nombre, nivel: ppNivel },
            });
          }
        }
        return res.json({
          ok: true,
          data: {
            id: ppU.id,
            nombre: ppU.nombre,
            avatar_url: ppU.avatar_url || null,
            foto_url: ppU.foto_url || null,
            nivel: ppNivel,
            faccion: ppU.faccion || null,
            casa: ppU.casa || null,
            perfil_publico: ppPublico,
          },
        });
      }

      // Obtener (o generar) el codigo de referido del usuario. Solo para
      // correos verificados; al primer pedido se genera y persiste un
      // codigo de 6 chars (colision revisada, hasta 6 reintentos).
      if (tipo === 'referido_codigo') {
        var rcId = String(req.query.usuario_id || '');
        if (!rcId)
          return res.status(400).json({ ok: false, error: 'usuario_id requerido' });
        // El codigo de referido es dato del propio usuario: se exige su
        // sesion firmada (ADR-025), no solo el email verificado.
        var rcSes = validarSesionUsuario(req, rcId);
        if (!rcSes.ok)
          return res.status(401).json({ ok: false, error: rcSes.razon });
        var rcRows = await sql(
          'SELECT id, codigo_referido, referidos_directos_contados, xp_ref_total, email_verificado '
          + 'FROM usuarios WHERE id=$1',
          [rcId]
        );
        if (!rcRows.length)
          return res.status(404).json({ ok: false, error: 'Usuario no encontrado' });
        if (!(rcRows[0].email_verificado === true))
          return res.status(403).json({ ok: false, error: 'EMAIL_SIN_VERIFICAR' });
        var rcCodigo = rcRows[0].codigo_referido;
        if (!rcCodigo) {
          for (var rcIntento = 0; rcIntento < 6 && !rcCodigo; rcIntento++) {
            var rcCandidato = generarCodigoReferido();
            var rcChoque = await sql(
              'SELECT id FROM usuarios WHERE codigo_referido=$1',
              [rcCandidato]
            );
            if (rcChoque.length) continue;
            var rcGrabado = await sql(
              'UPDATE usuarios SET codigo_referido=$1 WHERE id=$2 AND codigo_referido IS NULL '
              + 'RETURNING id',
              [rcCandidato, rcId]
            );
            if (rcGrabado.length) {
              rcCodigo = rcCandidato;
            } else {
              // Carrera perdida: otro request le asigno codigo justo ahora.
              var rcActual = await sql(
                'SELECT codigo_referido FROM usuarios WHERE id=$1',
                [rcId]
              );
              rcCodigo = rcActual.length ? rcActual[0].codigo_referido : null;
              break;
            }
          }
        }
        var rcHoy = await sql(
          'SELECT COUNT(*)::int AS n FROM usuarios '
          + 'WHERE referido_por=$1 AND creado_en > NOW() - INTERVAL \'1 day\'',
          [rcId]
        );
        return res.json({
          ok: true,
          data: {
            codigo_referido: rcCodigo,
            referidos_directos_contados: parseInt(rcRows[0].referidos_directos_contados, 10) || 0,
            xp_ref_total: parseInt(rcRows[0].xp_ref_total, 10) || 0,
            referidos_dia_actual: rcHoy.length ? rcHoy[0].n : 0,
          }
        });
      }

      // Piramide multinivel de lectura: CTE recursiva hasta 5 niveles
      // desde los referidos directos ($1), agregada por nivel.
      if (tipo === 'referido_red') {
        var rrId = String(req.query.usuario_id || '');
        if (!rrId)
          return res.status(400).json({ ok: false, error: 'usuario_id requerido' });
        var rrNiveles = await sql(
          'WITH RECURSIVE red AS ('
          + 'SELECT u.id, u.nombre, u.avatar_url, u.xp_total, u.xp_ref_total, u.referido_por, 1 AS nivel '
          + 'FROM usuarios u WHERE u.referido_por=$1 '
          + 'UNION ALL '
          + 'SELECT u2.id, u2.nombre, u2.avatar_url, u2.xp_total, u2.xp_ref_total, u2.referido_por, red.nivel + 1 '
          + 'FROM usuarios u2 JOIN red ON u2.referido_por = red.id '
          + 'WHERE red.nivel < 5'
          + ') SELECT nivel, COUNT(*)::int AS cantidad, COALESCE(SUM(xp_ref_total), 0)::int AS xp_ref '
          + 'FROM red GROUP BY nivel ORDER BY nivel',
          [rrId]
        );
        var rrDirectos = await sql(
          'SELECT COUNT(*)::int AS n FROM usuarios WHERE referido_por=$1',
          [rrId]
        );
        return res.json({
          ok: true,
          data: {
            niveles: rrNiveles,
            total_directos: rrDirectos.length ? rrDirectos[0].n : 0,
          }
        });
      }

      // Ranking de facciones: agregado por faccion + top 3 por faccion.
      if (tipo === 'faccion_ranking') {
        var frFacciones = await sql(
          'SELECT faccion, COUNT(*)::int AS miembros, COALESCE(SUM(xp_total), 0)::int AS xp_total '
          + 'FROM usuarios WHERE faccion IS NOT NULL GROUP BY faccion ORDER BY xp_total DESC'
        );
        var frTop = await sql(
          'SELECT id, nombre, avatar_url, faccion, xp_total FROM ('
          + 'SELECT id, nombre, avatar_url, faccion, xp_total, '
          + 'ROW_NUMBER() OVER (PARTITION BY faccion ORDER BY xp_total DESC) AS pos '
          + 'FROM usuarios WHERE faccion IS NOT NULL'
          + ') t WHERE t.pos <= 3 ORDER BY t.faccion, t.xp_total DESC'
        );
        return res.json({ ok: true, data: { facciones: frFacciones, top: frTop } });
      }

      // Ranking de Casas (WP-5, TSK-103 / ADR-028): agregado por Casa +
      // top 5 por Casa. Se NORMALIZA por numero de miembros: el orden es
      // por xp_promedio (no por la suma), para que la Casa mas poblada no
      // gane siempre. La division usa GREATEST(COUNT(*),1) como guarda de
      // division por cero (no aplica dentro de un GROUP BY con miembros,
      // pero se deja explicita). Espejo de faccion_ranking.
      if (tipo === 'casa_ranking') {
        var crCasas = await sql(
          'SELECT u.casa,'
          + ' COUNT(*)::int AS miembros,'
          + ' COALESCE(SUM(u.xp_total), 0)::int AS xp_total,'
          + ' COALESCE(ROUND(SUM(u.xp_total)::numeric / GREATEST(COUNT(*), 1)), 0)::int AS xp_promedio,'
          // FIX O1 (WP-6): el conteo de aprobados exige ao.activo=true
          // ademas del quorum (+3), para no contar propuestas
          // soft-deleted en el ranking de Casas.
          + ' (SELECT COUNT(*)::int FROM activos_ocultos ao'
          + '   WHERE (ao.votos_favor - ao.votos_contra) >= 3'
          + '   AND ao.activo = true'
          + '   AND ao.propuesto_por IN (SELECT id FROM usuarios WHERE casa=u.casa)) AS activos_ocultos_aprobados,'
          + ' (SELECT COUNT(*)::int FROM activos_ocultos_checkins aoc'
          + '   JOIN usuarios u2 ON u2.id = aoc.usuario_id'
          + '   WHERE u2.casa = u.casa AND aoc.activo = true'
          + '   AND aoc.creado_en > NOW() - INTERVAL \'30 days\') AS checkins_30d'
          + ' FROM usuarios u WHERE u.casa IS NOT NULL'
          + ' GROUP BY u.casa ORDER BY xp_promedio DESC'
        );
        var crTop = await sql(
          'SELECT id, nombre, avatar_url, casa, xp_total FROM ('
          + 'SELECT id, nombre, avatar_url, casa, xp_total, '
          + 'ROW_NUMBER() OVER (PARTITION BY casa ORDER BY xp_total DESC) AS pos '
          + 'FROM usuarios WHERE casa IS NOT NULL'
          + ') t WHERE t.pos <= 5 ORDER BY t.casa, t.xp_total DESC'
        );
        return res.json({ ok: true, data: { casas: crCasas, top: crTop } });
      }

      // El enlace del correo aterriza aqui en navegador (GET). La logica
      // es compartida con la rama POST para no duplicar el UPDATE.
      if (tipo === 'email_verificar_confirmar') {
        return confirmarEmail(sql, res, req.query.usuario_id, req.query.token);
      }

      if (id) {
        // vocaciones (jsonb) la agrega la migracion 015 a la columna y llega
        // via SELECT * ya como objeto; conNivel/conMisiones/conLogros no la
        // tocan, asi que pasa tal cual al cliente (era viene de conNivel).
        const rows = await sql('SELECT * FROM usuarios WHERE id = $1', [id]);
        if (!rows.length) return res.status(404).json({ ok: false, error: 'No encontrado' });
        // WP-3 (TSK-103 / ADR-028): la fila completa contiene PII (email,
        // email_token, email_token_expira, device_hashes, codigo_referido,
        // referido_por, auth_id, auth_provider, ultimo_acceso). Solo la
        // reciben el dueno (sesion firmada, ADR-025) o el admin (Bearer
        // ADMIN_SECRET / X-Internal-Secret). Los demas reciben un
        // subconjunto publico que nunca incluye esos campos.
        var esAutorizado = esAdminUsuario(req) || validarSesionUsuario(req, String(rows[0].id)).ok;
        if (esAutorizado) {
          return res.json({ ok: true, data: conLogros(conMisiones(conNivel(rows[0]))) });
        }
        // Perfil privado (migracion 017): 403 con el minimo.
        if (rows[0].perfil_publico === false) {
          return res.status(403).json({
            ok: false,
            error: 'PERFIL_PRIVADO',
            data: { nombre: rows[0].nombre },
          });
        }
        var pub = rows[0];
        return res.json({
          ok: true,
          data: {
            id: pub.id,
            nombre: pub.nombre,
            avatar_url: pub.avatar_url || null,
            foto_url: pub.foto_url || null,
            bio: pub.bio || null,
            ciudad_base: pub.ciudad_base || null,
            pais_base: pub.pais_base || null,
            creado_en: pub.creado_en,
            xp_total: parseInt(pub.xp_total, 10) || 0,
            faccion: pub.faccion || null,
            casa: pub.casa || null,
            perfil_publico: pub.perfil_publico !== false,
          },
        });
      }
      return res.status(400).json({ ok: false, error: 'Falta id o tipo' });
    }

    if (req.method === 'POST') {
      var c = req.body || {};

      // ---- Rama: elegir o cambiar faccion (Gaming v5.0) -------------
      // Primera eleccion: gratis. Cambios posteriores: producto de 500
      // xp_total con cooldown de 15 dias (la moneda del juego es
      // xp_total, ADR-018). Todas las escrituras son UPDATE condicional
      // para resolver carreras del lado de la BD.
      if (c.tipo === 'faccion_elegir') {
        var feId = String(c.usuario_id || '');
        var feFaccion = String(c.faccion || '');
        if (!feId)
          return res.status(400).json({ ok: false, error: 'usuario_id requerido' });
        if (FACCIONES_VALIDAS.indexOf(feFaccion) === -1)
          return res.status(400).json({ ok: false, error: 'FACCION_INVALIDA' });
        var feFila = await sql(
          'SELECT id, faccion, faccion_elegida_en, xp_total, email_verificado FROM usuarios WHERE id=$1',
          [feId]
        );
        if (!feFila.length)
          return res.status(404).json({ ok: false, error: 'Usuario no encontrado' });
        if (!(feFila[0].email_verificado === true))
          return res.status(403).json({ ok: false, error: 'EMAIL_SIN_VERIFICAR' });
        if (!feFila[0].faccion) {
          // Primera eleccion: el WHERE faccion IS NULL protege la carrera
          // y el 409 si otro request gano la eleccion primero.
          var fePrim = await sql(
            'UPDATE usuarios SET faccion=$2, faccion_elegida_en=NOW() '
            + 'WHERE id=$1 AND faccion IS NULL RETURNING faccion, faccion_elegida_en',
            [feId, feFaccion]
          );
          if (!fePrim.length)
            return res.status(409).json({ ok: false, error: 'FACCION_YA_ELEGIDA' });
          return res.json({ ok: true, data: { faccion: fePrim[0].faccion, faccion_elegida_en: fePrim[0].faccion_elegida_en } });
        }
        // Cambio de faccion: pago 500 xp, cooldown de 15 dias. El UPDATE
        // condicional es la fuente de verdad; si no afecta filas se
        // distingue el motivo con los datos ya leidos.
        var feCambio = await sql(
          'UPDATE usuarios SET xp_total = xp_total - 500, faccion=$2, faccion_elegida_en=NOW() '
          + 'WHERE id=$1 AND xp_total >= 500 '
          + 'AND (faccion_elegida_en IS NULL OR faccion_elegida_en <= NOW() - INTERVAL \'15 days\') '
          + 'RETURNING faccion, faccion_elegida_en',
          [feId, feFaccion]
        );
        if (!feCambio.length) {
          var feElegidaEn = feFila[0].faccion_elegida_en;
          var feEnCooldown = feElegidaEn
            && (Date.parse(feElegidaEn) > Date.now() - 15 * 24 * 3600 * 1000);
          if (feEnCooldown)
            return res.status(429).json({ ok: false, error: 'COOLDOWN_FACCION' });
          return res.status(402).json({ ok: false, error: 'PUNTOS_INSUFICIENTES' });
        }
        return res.json({ ok: true, data: { faccion: feCambio[0].faccion, faccion_elegida_en: feCambio[0].faccion_elegida_en } });
      }

      // ---- Rama: elegir o cambiar Casa (WP-5, TSK-103 / ADR-028) ----
      // ESPEJO EXACTO de faccion_elegir (mismo contrato de errores y
      // mismos UPDATE condicionales para resolver carreras), con dos
      // diferencias deliberadas: (1) exige sesion firmada del propio
      // usuario (ADR-025), porque casa_elegida_en es dato de su cuenta;
      // (2) la primera eleccion exige nivel >= 2. Primera eleccion:
      // gratis (WHERE casa IS NULL). Cambio: cuesta 300 xp_total (debito
      // atomico con WHERE xp_total >= 300, patron de comprar_consumible)
      // y tiene cooldown de 30 dias via casa_elegida_en. La moneda del
      // juego es xp_total (ADR-018). Devuelve nivel_anterior/nivel_nuevo/
      // bajo_nivel para que la UI avise si el debito baja de nivel.
      if (c.tipo === 'casa_elegir') {
        var ceId = String(c.usuario_id || '');
        var ceCasa = String(c.casa || '');
        if (!ceId)
          return res.status(400).json({ ok: false, error: 'usuario_id requerido' });
        var ceSes = validarSesionUsuario(req, ceId);
        if (!ceSes.ok)
          return res.status(401).json({ ok: false, error: ceSes.razon });
        if (CASAS_VALIDAS.indexOf(ceCasa) === -1)
          return res.status(400).json({ ok: false, error: 'CASA_INVALIDA' });
        var ceFila = await sql(
          'SELECT id, casa, casa_elegida_en, xp_total, email_verificado FROM usuarios WHERE id=$1',
          [ceId]
        );
        if (!ceFila.length)
          return res.status(404).json({ ok: false, error: 'Usuario no encontrado' });
        if (!(ceFila[0].email_verificado === true))
          return res.status(403).json({ ok: false, error: 'EMAIL_SIN_VERIFICAR' });
        var ceXp = parseInt(ceFila[0].xp_total, 10) || 0;
        var ceNivelAnt = calcularNivel(ceXp).nivel;
        if (ceNivelAnt < 2)
          return res.status(403).json({ ok: false, error: 'NIVEL_INSUFICIENTE', nivel: ceNivelAnt, nivel_requerido: 2 });
        if (!ceFila[0].casa) {
          // Primera eleccion: el WHERE casa IS NULL protege la carrera y
          // el 409 si otro request gano la eleccion primero.
          var cePrim = await sql(
            'UPDATE usuarios SET casa=$2, casa_elegida_en=NOW() '
            + 'WHERE id=$1 AND casa IS NULL RETURNING casa, casa_elegida_en, xp_total',
            [ceId, ceCasa]
          );
          if (!cePrim.length)
            return res.status(409).json({ ok: false, error: 'CASA_YA_ELEGIDA' });
          var ceXpPrim = parseInt(cePrim[0].xp_total, 10) || 0;
          var ceNivelPrim = calcularNivel(ceXpPrim).nivel;
          return res.json({ ok: true, data: {
            casa: cePrim[0].casa,
            casa_elegida_en: cePrim[0].casa_elegida_en,
            xp_total_nuevo: ceXpPrim,
            nivel_anterior: ceNivelAnt,
            nivel_nuevo: ceNivelPrim,
            bajo_nivel: ceNivelPrim < ceNivelAnt,
          } });
        }
        // Cambio de Casa: pago 300 xp, cooldown de 30 dias. El UPDATE
        // condicional es la fuente de verdad; si no afecta filas se
        // distingue el motivo con los datos ya leidos.
        var ceCambio = await sql(
          'UPDATE usuarios SET xp_total = xp_total - 300, casa=$2, casa_elegida_en=NOW() '
          + 'WHERE id=$1 AND xp_total >= 300 '
          + 'AND (casa_elegida_en IS NULL OR casa_elegida_en <= NOW() - INTERVAL \'30 days\') '
          + 'RETURNING casa, casa_elegida_en, xp_total',
          [ceId, ceCasa]
        );
        if (!ceCambio.length) {
          var ceElegidaEn = ceFila[0].casa_elegida_en;
          var ceEnCooldown = ceElegidaEn
            && (Date.parse(ceElegidaEn) > Date.now() - 30 * 24 * 3600 * 1000);
          if (ceEnCooldown)
            return res.status(429).json({ ok: false, error: 'COOLDOWN_CASA' });
          return res.status(402).json({ ok: false, error: 'PUNTOS_INSUFICIENTES' });
        }
        var ceXpNuevo = parseInt(ceCambio[0].xp_total, 10) || 0;
        var ceNivelNuevo = calcularNivel(ceXpNuevo).nivel;
        return res.json({ ok: true, data: {
          casa: ceCambio[0].casa,
          casa_elegida_en: ceCambio[0].casa_elegida_en,
          xp_total_nuevo: ceXpNuevo,
          nivel_anterior: ceNivelAnt,
          nivel_nuevo: ceNivelNuevo,
          bajo_nivel: ceNivelNuevo < ceNivelAnt,
        } });
      }

      // ---- Rama: actualizar perfil (WP-5, TSK-103 / ADR-028) --------
      // Edicion del propio perfil desde mi-perfil.html (pestana PERFIL y
      // CUENTA). Exige sesion firmada del DUENO (ADR-025) porque escribe
      // datos de su cuenta. Acepta el nombre canonico 'perfil_actualizar'
      // que ya envia el frontend y el alias 'perfil_editar' por
      // compatibilidad con clientes previos.
      //
      // El SET es dinamico y 100% parametrizado (cero interpolacion de
      // valores en el SQL): solo se toca lo que venga definido. Las listas
      // de columnas se arman con emparejamiento nombre=placeholder.
      // Campos PROHIBIDOS por esta rama (no se leen del body): email,
      // xp_total, faccion, casa, codigo_referido, referido_por.
      //
      // ADR-003 (cero borrado / cero reemplazo):
      //   - perfil_config es MERGE a nivel raiz:
      //     COALESCE(perfil_config,'{}'::jsonb) || $n::jsonb.
      //   - intereses es REEMPLAZO deliberado (lista de un solo escritor,
      //     mismo precedente que device_hashes): el cliente envia la lista
      //     completa y el servidor la sella entera.
      //
      // perfil_config NO valida capacidades en esta rama (los consumibles
      // perfil_* aun no tienen efecto); solo guarda. WP-6 lo hara.
      if (c.tipo === 'perfil_actualizar' || c.tipo === 'perfil_editar') {
        var puId = String(c.usuario_id || '');
        if (!puId)
          return res.status(400).json({ ok: false, error: 'usuario_id requerido' });
        var puSes = validarSesionUsuario(req, puId);
        if (!puSes.ok)
          return res.status(401).json({ ok: false, error: puSes.razon });

        var puParams = [];
        var puSets = [];
        var puPh = function (valor) {
          puParams.push(valor);
          return '$' + puParams.length;
        };

        // nombre (opcional, 1..60 chars)
        if (c.nombre !== undefined) {
          var puNombre = (typeof c.nombre === 'string') ? c.nombre.trim() : '';
          if (!puNombre || puNombre.length > 60)
            return res.status(400).json({ ok: false, error: 'NOMBRE_INVALIDO' });
          puSets.push('nombre = ' + puPh(puNombre));
        }

        // foto_url (URL http/https o null para limpiarla)
        if (c.foto_url !== undefined) {
          if (c.foto_url === null || c.foto_url === '') {
            puSets.push('foto_url = ' + puPh(null));
          } else {
            var puFoto = (typeof c.foto_url === 'string') ? c.foto_url.trim() : '';
            if (!/^https?:\/\/\S+$/i.test(puFoto) || puFoto.length > 600)
              return res.status(400).json({ ok: false, error: 'FOTO_URL_INVALIDA' });
            puSets.push('foto_url = ' + puPh(puFoto));
          }
        }

        // bio (opcional, max 280 chars; la columna ya existe, text nullable)
        if (c.bio !== undefined) {
          var puBio = (typeof c.bio === 'string') ? c.bio.trim() : '';
          if (puBio.length > 280)
            return res.status(400).json({ ok: false, error: 'BIO_LARGA' });
          puSets.push('bio = ' + puPh(puBio || null));
        }

        // ciudad_base (opcional, 1..80 chars o null para limpiarla)
        if (c.ciudad_base !== undefined) {
          if (c.ciudad_base === null || c.ciudad_base === '') {
            puSets.push('ciudad_base = ' + puPh(null));
          } else {
            var puCiudad = (typeof c.ciudad_base === 'string') ? c.ciudad_base.trim() : '';
            if (!puCiudad || puCiudad.length > 80)
              return res.status(400).json({ ok: false, error: 'CIUDAD_INVALIDA' });
            puSets.push('ciudad_base = ' + puPh(puCiudad));
          }
        }

        // pais_base (ISO-3166-1 alfa-2: exactamente 2 letras, a MAYUSCULAS)
        if (c.pais_base !== undefined) {
          if (c.pais_base === null || c.pais_base === '') {
            puSets.push('pais_base = ' + puPh(null));
          } else {
            var puPais = String(c.pais_base).trim().toUpperCase();
            if (!/^[A-Za-z]{2}$/.test(puPais))
              return res.status(400).json({ ok: false, error: 'PAIS_INVALIDO' });
            puSets.push('pais_base = ' + puPh(puPais));
          }
        }

        // intereses (array de slugs ASCII, max 10; REEMPLAZO deliberado)
        if (c.intereses !== undefined) {
          if (!Array.isArray(c.intereses) || c.intereses.length > 10)
            return res.status(400).json({ ok: false, error: 'INTERESES_INVALIDOS' });
          var puIntereses = [];
          for (var puI = 0; puI < c.intereses.length; puI++) {
            var puSlug = c.intereses[puI];
            if (typeof puSlug !== 'string' || !/^[a-z0-9_]{1,40}$/.test(puSlug))
              return res.status(400).json({ ok: false, error: 'INTERESES_INVALIDOS' });
            puIntereses.push(puSlug);
          }
          puSets.push('intereses = ' + puPh(JSON.stringify(puIntereses)) + '::jsonb');
        }

        // perfil_publico / dm_abierto (booleanos)
        if (c.perfil_publico !== undefined) {
          if (typeof c.perfil_publico !== 'boolean')
            return res.status(400).json({ ok: false, error: 'PERFIL_PUBLICO_INVALIDO' });
          puSets.push('perfil_publico = ' + puPh(c.perfil_publico));
        }
        if (c.dm_abierto !== undefined) {
          if (typeof c.dm_abierto !== 'boolean')
            return res.status(400).json({ ok: false, error: 'DM_ABIERTO_INVALIDO' });
          puSets.push('dm_abierto = ' + puPh(c.dm_abierto));
        }

        // perfil_config (objeto; MERGE JSONB a nivel raiz, nunca reemplazo)
        if (c.perfil_config !== undefined) {
          var puConf = c.perfil_config;
          if (!puConf || typeof puConf !== 'object' || Array.isArray(puConf))
            return res.status(400).json({ ok: false, error: 'PERFIL_CONFIG_INVALIDO' });
          puSets.push('perfil_config = COALESCE(perfil_config, \'{}\'::jsonb) || '
            + puPh(JSON.stringify(puConf)) + '::jsonb');
        }

        if (!puSets.length)
          return res.status(400).json({ ok: false, error: 'NADA_QUE_ACTUALIZAR' });

        puParams.push(puId);
        var puUpd = await sql(
          'UPDATE usuarios SET ' + puSets.join(', ')
          + ' WHERE id=$' + puParams.length + ' RETURNING *',
          puParams
        );
        if (!puUpd.length)
          return res.status(404).json({ ok: false, error: 'Usuario no encontrado' });

        // Misma hidratacion que el upsert de registro. Se retiran del
        // payload los campos secretos que trae el RETURNING *: nunca se
        // exponen email_token, email_token_expira ni device_hashes.
        var puData = conLogros(conMisiones(conNivel(puUpd[0])));
        delete puData.email_token;
        delete puData.email_token_expira;
        delete puData.device_hashes;
        // Esta rama nunca debita xp_total: el aviso de de-nivel de la UI
        // (mi-perfil.html pfGuardarPerfil) queda siempre en falso.
        puData.bajo_nivel = false;
        return res.json({ ok: true, data: puData });
      }

      // ---- Rama: solicitar verificacion de email (Gaming v5.0) ------
      // Genera token de 32 bytes (64 hex) con expiracion de 24 horas y
      // envia el enlace por Resend. Sin llave configurada, el modo demo
      // (DEV_EMAIL_ECHO=true) devuelve el token para desarrollo local;
      // nunca se expone el token en produccion.
      if (c.tipo === 'email_verificar_solicitar') {
        var evId = String(c.usuario_id || '');
        var evEmail = String(c.email || '').trim();
        if (!evId || !evEmail)
          return res.status(400).json({ ok: false, error: 'usuario_id y email requeridos' });
        var evToken = crypto.randomBytes(32).toString('hex');
        var evUpd = await sql(
          'UPDATE usuarios SET email_token=$1, email_token_expira=NOW() + INTERVAL \'24 hours\' '
          + 'WHERE id=$2 RETURNING id, email',
          [evToken, evId]
        );
        if (!evUpd.length)
          return res.status(404).json({ ok: false, error: 'USUARIO_NO_ENCONTRADO' });
        var evBase = process.env.SITE_URL || 'https://exploraco.vercel.app';
        var evEnlace = evBase + '/api/usuarios?tipo=email_verificar_confirmar'
          + '&usuario_id=' + encodeURIComponent(evId)
          + '&token=' + encodeURIComponent(evToken);
        var evHtml = '<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:2rem">'
          + '<h2 style="color:#E8A020">Verifica tu correo en ExploraCO</h2>'
          + '<p>Hola,</p>'
          + '<p>Para desbloquear la piramide de referidos y las facciones necesitas confirmar tu correo:</p>'
          + '<p><a href="' + evEnlace + '" style="background:#E8A020;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none">Verificar correo</a></p>'
          + '<p>Si no pediste este correo, ignoralo.</p>'
          + '</div>';
        if (!process.env.RESEND_API_KEY) {
          // Sin llave de Resend el envio es imposible. El modo demo
          // responde con el token SOLO con DEV_EMAIL_ECHO=true; en
          // produccion se devuelve el mismo codigo sin token.
          if (process.env.DEV_EMAIL_ECHO === 'true')
            return res.json({ ok: false, error: 'EMAIL_NO_CONFIGURADO', debug_token: evToken });
          return res.status(503).json({ ok: false, error: 'EMAIL_NO_CONFIGURADO' });
        }
        var evEnvio = await sendEmail(evUpd[0].email, 'Verifica tu correo en ExploraCO', evHtml);
        if (!evEnvio.ok)
          return res.status(502).json({ ok: false, error: 'EMAIL_NO_ENVIADO' });
        return res.json({ ok: true, data: { enviado: true } });
      }

      // ---- Rama: confirmar verificacion de email (desde la app) -----
      if (c.tipo === 'email_verificar_confirmar') {
        return confirmarEmail(sql, res, c.usuario_id, c.token);
      }

      // ---- Rama: verificacion manual de email por admin (TSK-104) ---
      // Solo admin (Bearer ADMIN_SECRET / X-Internal-Secret): marca o
      // desmarca email_verificado de una cuenta concreta, para desbloquear
      // referidos/facciones de usuarios legitimos. Idempotente: el valor
      // enviado es el estado final.
      else if (c.tipo === 'verificar_usuario') {
        if (!esAdminUsuario(req))
          return res.status(401).json({ ok: false, error: 'No autorizado' });
        var vId = String(c.usuario_id || '');
        if (!vId)
          return res.status(400).json({ ok: false, error: 'usuario_id requerido' });
        var vVal = Boolean(c.email_verificado);
        var vFilas = await sql(
          'UPDATE usuarios SET email_verificado=$1 WHERE id=$2 RETURNING id',
          [vVal, vId]
        );
        if (!vFilas.length)
          return res.status(404).json({ ok: false, error: 'Usuario no encontrado' });
        return res.json({ ok: true, usuario_id: vId, email_verificado: vVal });
      }

      // ---- Upsert de registro (login con email / google) ------------
      var auth_id = String(c.auth_id || '');
      var email = String(c.email || '');
      var nombre = String(c.nombre || '');
      var avatar_url = c.avatar_url ? String(c.avatar_url) : null;
      var auth_provider = c.auth_provider ? String(c.auth_provider) : 'email';
      if (!auth_id || !email || !nombre) {
        return res.status(400).json({ ok: false, error: 'Faltan: auth_id, email, nombre' });
      }

      // Referido: codigo_referido llega en el body o como ?ref= en la
      // query. SOLO puede completar el arbol en el brazo INSERT: el
      // ON CONFLICT DO UPDATE no toca referido_por, asi un relogin con un
      // codigo ajeno no corrompe el arbol de nadie.
      var refCode = String(c.codigo_referido || req.query.ref || '').trim();
      var refId = null;
      if (refCode) {
        var refFila = await sql(
          'SELECT id, codigo_referido FROM usuarios WHERE codigo_referido=$1',
          [refCode]
        );
        if (!refFila.length)
          return res.status(404).json({ ok: false, error: 'REFERIDO_INVALIDO' });
        var referenteId = String(refFila[0].id);
        // Auto-referido: relogin con el codigo propio (el usuario ya
        // existe en la tabla con ese auth_id y ese codigo).
        var refExistente = await sql(
          'SELECT id, codigo_referido FROM usuarios WHERE auth_id=$1',
          [auth_id]
        );
        if (refExistente.length && String(refExistente[0].id) === referenteId)
          return res.status(400).json({ ok: false, error: 'AUTO_REFERIDO' });
        // Topes del referente: 500 directos totales y 20 al dia. Si no
        // pasa el tope, error suave: el registro sigue sin referido_por.
        var refTopes = await sql(
          'SELECT (referidos_directos_contados < 500) AS ok_total, '
          + '(SELECT COUNT(*) FROM usuarios '
          + ' WHERE referido_por=$1 AND creado_en > NOW() - INTERVAL \'1 day\' ) < 20 AS ok_dia '
          + 'FROM usuarios WHERE id=$1',
          [referenteId]
        );
        if (refTopes.length && refTopes[0].ok_total === true && refTopes[0].ok_dia === true) {
          refId = referenteId;
        }
      }

      // (xmax = 0) distingue el brazo INSERT real del DO UPDATE: solo un
      // registro nuevo puede ganar el referido y sumar al contador.
      // TSK-104: la cuenta admin conocida queda verificada de una vez. El
      // OR en el DO UPDATE hace la marca idempotente y monotona: nunca
      // desmarca a un usuario que ya estaba verificado.
      var esAdminAuto = (email.toLowerCase() === 'brsk84@gmail.com') || (nombre.toLowerCase() === 'javier');
      var filas = await sql(
        'INSERT INTO usuarios (auth_id, email, nombre, avatar_url, auth_provider, referido_por, email_verificado) '
        + 'VALUES ($1, $2, $3, $4, $5, NULLIF($6, \'\')::uuid, $7) '
        + 'ON CONFLICT (auth_id) DO UPDATE SET '
        + 'nombre = EXCLUDED.nombre, '
        + 'avatar_url = COALESCE(EXCLUDED.avatar_url, usuarios.avatar_url), '
        + 'email_verificado = (COALESCE(usuarios.email_verificado, false) OR EXCLUDED.email_verificado), '
        + 'ultimo_acceso = NOW() '
        + 'RETURNING *, (xmax = 0) AS es_insert',
        [auth_id, email, nombre, avatar_url, auth_provider, refId || '', esAdminAuto]
      );
      var fila = filas[0];

      // Incremento condicional del contador del referente: topes dentro
      // del UPDATE. Si no afecta filas (carrera o tope alcanzado), el
      // registro del nuevo usuario funciona igual: solo no cuenta en el
      // contador plano del que invito.
      if (fila.es_insert === true && refId) {
        await sql(
          'UPDATE usuarios SET referidos_directos_contados = referidos_directos_contados + 1 '
          + 'WHERE id=$1 AND referidos_directos_contados < 500 '
          + 'AND (SELECT COUNT(*) FROM usuarios '
          + ' WHERE referido_por=$1 AND creado_en > NOW() - INTERVAL \'1 day\' ) < 20',
          [refId]
        );
      }

      // device_hashes (jsonb): fingerprint opcional del dispositivo. El
      // merge mantiene los 5 mas recientes (el hash nuevo primero y el
      // resto en orden previo, sin duplicados) usando COALESCE (ADR-003:
      // cero reemplazo total). Clientes legacy sin device_hash no se
      // bloquean.
      // HOTFIX (2026-09-15): el ORDER BY debe ir DENTRO del jsonb_agg.
      // Un ORDER BY externo junto a un agregado sin GROUP BY es invalido
      // en Postgres (error 42803) y rompia TODO el login con device_hash.
      if (c.device_hash) {
        var dhHash = String(c.device_hash);
        try {
          await sql(
            'UPDATE usuarios SET device_hashes = ('
            + 'SELECT COALESCE(jsonb_agg(h ORDER BY ord), \'[]\'::jsonb) FROM ('
            + 'SELECT h, ord FROM ('
            + 'SELECT $1::text AS h, -1 AS ord '
            + 'UNION ALL '
            + 'SELECT x.h, x.ord FROM jsonb_array_elements_text('
            + 'COALESCE(device_hashes, \'[]\'::jsonb)'
            + ') WITH ORDINALITY AS x(h, ord) WHERE x.h <> $1'
            + ') u ORDER BY u.ord LIMIT 5'
            + ') t'
            + ') WHERE id=$2',
            [dhHash, fila.id]
          );
        } catch (dhErr) {
          // El fingerprint es opcional (anti-Sybil best-effort): un fallo
          // aqui NUNCA debe bloquear el login/registro.
          console.error('[usuarios] device_hashes no actualizado:', dhErr && dhErr.message);
        }
      }

      var usuarioResp = conLogros(conMisiones(conNivel(fila)));
      // Sesion firmada JWT (ADR-025) para el cliente: se anhade al nodo
      // data plano (shape real consumido por usuario-session.js, ADR-006)
      // sin romper data.id/data.nombre de los clientes actuales.
      usuarioResp.jwt = firmarSesion(fila.id);
      usuarioResp.jwt_expira_en = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
      return res.json({ ok: true, data: usuarioResp });
    }

    return res.status(405).json({ ok: false, error: 'M\u00e9todo no permitido' });

  } catch (err) {
    console.error('[usuarios]', err.message);
    if (err && err.code === '23505')
      return res.status(409).json({ ok: false, error: 'Registro duplicado', duplicado: true });
    if (err && (err.code === '42P01' || err.code === '42703'))
      return res.status(503).json({ ok: false, error: 'Esquema de base de datos pendiente de migracion', code: 'SCHEMA_NOT_MIGRATED' });
    return res.status(500).json({ ok: false, error: err.message });
  }
};