// api/usuarios.js -- Vercel Serverless Function (ASCII-safe: 0 backticks, 0 no-ASCII)
// v9 (Entrega 016: piramide de referidos, 4 facciones, verificacion de email, sesion firmada JWT)
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
// firmada JWT (ADR-025). conMisiones sigue siendo MERGE con las
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
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

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
        return res.json({ ok: true, data: rows.map(conNivel) });
      }
      if (tipo === 'buscar' || req.query.buscar) {
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

      // Obtener (o generar) el codigo de referido del usuario. Solo para
      // correos verificados; al primer pedido se genera y persiste un
      // codigo de 6 chars (colision revisada, hasta 6 reintentos).
      if (tipo === 'referido_codigo') {
        var rcId = String(req.query.usuario_id || '');
        if (!rcId)
          return res.status(400).json({ ok: false, error: 'usuario_id requerido' });
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
        return res.json({ ok: true, data: conLogros(conMisiones(conNivel(rows[0]))) });
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
      var filas = await sql(
        'INSERT INTO usuarios (auth_id, email, nombre, avatar_url, auth_provider, referido_por) '
        + 'VALUES ($1, $2, $3, $4, $5, NULLIF($6, \'\')::uuid) '
        + 'ON CONFLICT (auth_id) DO UPDATE SET '
        + 'nombre = EXCLUDED.nombre, '
        + 'avatar_url = COALESCE(EXCLUDED.avatar_url, usuarios.avatar_url), '
        + 'ultimo_acceso = NOW() '
        + 'RETURNING *, (xmax = 0) AS es_insert',
        [auth_id, email, nombre, avatar_url, auth_provider, refId || '']
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
      if (c.device_hash) {
        var dhHash = String(c.device_hash);
        await sql(
          'UPDATE usuarios SET device_hashes = ('
          + 'SELECT COALESCE(jsonb_agg(t.h), \'[]\'::jsonb) FROM ('
          + 'SELECT $1::text AS h, -1 AS ord '
          + 'UNION ALL '
          + 'SELECT x.h, x.ord FROM jsonb_array_elements_text('
          + 'COALESCE(device_hashes, \'[]\'::jsonb)'
          + ') WITH ORDINALITY AS x(h, ord) WHERE x.h <> $1'
          + ') t ORDER BY t.ord LIMIT 5'
          + ') WHERE id=$2',
          [dhHash, fila.id]
        );
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