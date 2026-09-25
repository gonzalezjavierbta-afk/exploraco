// api/admin.js -- endpoint unificado para todas las funciones del admin (ASCII-safe: 0 backticks, 0 no-ASCII)
// Ruta por ?recurso=X:
//   solicitudes  -> moderar-destinos (listar/aprobar/rechazar)
//   resenas      -> resenas-admin (listar/eliminar resenas)
//   destacado    -> destacar (activar/desactivar perfiles)
//   notificaciones -> envio de emails
//   consumibles  -> CRUD consumibles (gamificacion v4, ADR-018)
//   activos_ocultos -> moderar propuestas Wayfarer (tipo=activo_oculto_moderar,
//     Entrega 016 / migracion 016: aprobar otorga +50 XP al proponente con
//     reparto piramidal; rechazar no paga nada. Cero borrado fisico)
//   salud_red    -> panel "Salud de la Red" (ADR-053): agrega xp_ledger por
//     dia/accion (XP entregado, usuarios activos, caps, distribucion_nivel
//     {derivado, visible}, exentos y nivel_max vs nivel derivado). GET;
//     degrada 42P01 si la migracion 031 no corrio. Desde v6 (ADR-058)
//     agrega de forma ADITIVA distribucion_origen, mult_origen_stats,
//     config_origen y alertas_origen (degrada 42703 si la 038 no corrio)
//   mercado      -> Mercado de Emprendedores (migracion 034): normas por Casa
//     (mercado_config_lista / mercado_config_editar) y moderacion de ofertas
//     (mercado_ofertas_lista / mercado_ofertas_moderar). La moderacion NO
//     devuelve inventario (es sancion admin, no cancelacion del dueno).
//     Degrada 503 SCHEMA_NOT_MIGRATED (42P01/42703) si la 034 no corrio.
// Auth: Bearer exploraco12345 (o X-Internal-Secret) en todos los casos
// v4 (ADR-053, 2026-09-21): en salud_red, distribucion_nivel pasa a exponer
// las DOS vistas {derivado, visible} (economia vs insignia, Dec 5) y se
// agrega el bloque exentos {xp_total_entregado, eventos, por_accion}
// (misiones/logros/referidos/admin_xp y restas), filtrado por la misma
// ventana dias. Degradacion intacta (42P01 en xp_ledger -> 200 degradado).
// v3 (ADR-053 / Enmienda 1, 2026-09-21): rama NUEVA GET ?recurso=salud_red
// (router real por ?recurso=, gate auth()) con degradacion 42P01; expone
// por_dia/por_accion/usuarios/caps/nivel_max_vs_derivado/distribucion_nivel/
// alertas. No crea
// endpoints (8/8, ADR-001). El repricing de consumibles lo aplica la
// migracion 031 en consumibles.precio_xp; aqui NO hay precios hardcodeados.
// v2 (ADR-035, 2026-09-17): precio_xp acepta decimal (punto o coma) y el
// reparto de referidos usa ROUND(...,2) con Number; las respuestas de
// resenas/consumibles normalizan las columnas XP (numeric llega string).
// v5 (Mercado de Emprendedores, migracion 034, 2026-09-23): rama NUEVA
// ?recurso=mercado con 4 tipos (mercado_config_lista / mercado_config_editar
// / mercado_ofertas_lista / mercado_ofertas_moderar). Reusa auth()/authInternal()
// del archivo y esquemaAusente() para la degradacion 503 SCHEMA_NOT_MIGRATED.
// No crea endpoints (8/8, ADR-001).
// v6 (ADR-058, 2026-09-24): salud_red gana 4 bloques ADITIVOS de origen y
// lejania (migracion 038): distribucion_origen (conteo y XP por origen_tier
// en la ventana), mult_origen_stats (prom/min/max + top outliers), config_origen
// (las 7 claves de gamificacion_config) y alertas_origen (concentracion de XP
// bonificado y cuentas extranjeras nuevas con factor alto). Cada consulta
// degrada con esquemaAusente()/console.warn si la 038 no corrio (patron
// BUG-021); el payload actual de salud_red queda intacto. No crea endpoints.
// v7 (ADR-058 editor, 2026-09-24): rama NUEVA POST ?recurso=gamificacion_config
// (gate auth()) que edita de forma idempotente las 7 claves de la curva de
// origen con validacion estricta de rango + coherencia (Local <= Nomada <=
// Extranjero); degrada 503 SCHEMA_NOT_MIGRATED si gamificacion_config no
// existe (patron BUG-021). Ademas sube los umbrales anti-gaming de
// concentracion de origen a 85% / 500 XP y exige >= 3 cuentas distintas con
// mult_origen > 1.2 en la ventana para disparar la alerta. No crea endpoints
// (8/8, ADR-001).
// v8 (Gaming v6.1, ADR-062/063/064/065; 2026-09-24): salud_red gana 4
// bloques ADITIVOS (migraciones 040/041) -- cartas (gates consumidos,
// circulacion, ofertas abiertas), moneda (emision/circulacion/ordenes),
// gobernanza (propuestas por capa/estado + votos) y own_spot (dividendos
// pagados + duenos por tipo). Cada bloque degrada con console.warn y se
// omite si su tabla falta, sin tumbar salud_red. Ademas ramas NUEVAS:
// ?recurso=cartas (CRUD cartas_catalogo), ?recurso=gobernanza (moderacion
// de propuestas) y ?recurso=marcas_spots (moderacion de spot_presencia).
// Cero DELETE fisico; no crea endpoints (8/8, ADR-001).

const { neon } = require('@neondatabase/serverless');

var RESEND_API  = 'https://api.resend.com/emails';
var FROM_EMAIL  = 'ExploraCO <noreply@exploraco.co>';
var ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@exploraco.co';

var PLANES = {
  mensual:    { precio: 49000,  dias: 30,  label: 'Mensual'    },
  trimestral: { precio: 120000, dias: 90,  label: 'Trimestral' },
  anual:      { precio: 390000, dias: 365, label: 'Anual'       },
};

function auth(req) {
  return (req.headers['authorization']||'').replace('Bearer ','').trim()
    === (process.env.ADMIN_SECRET || 'exploraco12345');
}
function authInternal(req) {
  return (req.headers['x-internal-secret']||'').trim()
    === (process.env.ADMIN_SECRET || 'exploraco12345');
}

// XP decimal (ADR-035): las columnas XP son numeric(12,2) y Neon las
// entrega como STRING. red2 = half-up a 2 decimales; numXp = a Number.
function red2(v) { return Math.round((Number(v) || 0) * 100) / 100; }
function numXp(v) { var n = Number(v); return isFinite(n) ? n : 0; }
// Porcentajes del mercado (mercado_config.*_pct son numeric(5,4)): half-up a
// 4 decimales. No reusa red2 porque el impuesto/arancel viven en escala 0..1.
function red4(v) { return Math.round((Number(v) || 0) * 10000) / 10000; }

// Espejo de REPORTE de los 40 umbrales de api/usuarios.js:NIVELES (ADR-053
// Decision 3) para resolver el nivel DERIVADO de xp_total dentro de SQL puro
// en la rama admin salud_red. NO hay require cruzado entre funciones
// serverless (patron documentado arriba, admin.js:56-59): este CASE es solo
// LECTURA para el reporte (nivel_max vs nivel derivado); no alimenta M_nivel
// ni escribe nada. Si los umbrales cambian en la fuente, este espejo debe
// actualizarse (lo cubre el smoke de espejos de umbrales).
var NIVEL_DERIVADO_SQL = 'CASE '
  + 'WHEN xp_total >= 100000 THEN 40 '
  + 'WHEN xp_total >= 95450 THEN 39 '
  + 'WHEN xp_total >= 90950 THEN 38 '
  + 'WHEN xp_total >= 86600 THEN 37 '
  + 'WHEN xp_total >= 82300 THEN 36 '
  + 'WHEN xp_total >= 78150 THEN 35 '
  + 'WHEN xp_total >= 74050 THEN 34 '
  + 'WHEN xp_total >= 70050 THEN 33 '
  + 'WHEN xp_total >= 66150 THEN 32 '
  + 'WHEN xp_total >= 62400 THEN 31 '
  + 'WHEN xp_total >= 58700 THEN 30 '
  + 'WHEN xp_total >= 55050 THEN 29 '
  + 'WHEN xp_total >= 51600 THEN 28 '
  + 'WHEN xp_total >= 48200 THEN 27 '
  + 'WHEN xp_total >= 44900 THEN 26 '
  + 'WHEN xp_total >= 41750 THEN 25 '
  + 'WHEN xp_total >= 38650 THEN 24 '
  + 'WHEN xp_total >= 35700 THEN 23 '
  + 'WHEN xp_total >= 32800 THEN 22 '
  + 'WHEN xp_total >= 30050 THEN 21 '
  + 'WHEN xp_total >= 27400 THEN 20 '
  + 'WHEN xp_total >= 24850 THEN 19 '
  + 'WHEN xp_total >= 22450 THEN 18 '
  + 'WHEN xp_total >= 20100 THEN 17 '
  + 'WHEN xp_total >= 17900 THEN 16 '
  + 'WHEN xp_total >= 15800 THEN 15 '
  + 'WHEN xp_total >= 13850 THEN 14 '
  + 'WHEN xp_total >= 12000 THEN 13 '
  + 'WHEN xp_total >= 10250 THEN 12 '
  + 'WHEN xp_total >= 8650 THEN 11 '
  + 'WHEN xp_total >= 7150 THEN 10 '
  + 'WHEN xp_total >= 5800 THEN 9 '
  + 'WHEN xp_total >= 4550 THEN 8 '
  + 'WHEN xp_total >= 3450 THEN 7 '
  + 'WHEN xp_total >= 2500 THEN 6 '
  + 'WHEN xp_total >= 1650 THEN 5 '
  + 'WHEN xp_total >= 1000 THEN 4 '
  + 'WHEN xp_total >= 500 THEN 3 '
  + 'WHEN xp_total >= 150 THEN 2 '
  + 'ELSE 1 END';

// Errores de esquema ausente (migracion pendiente, patron BUG-021): tabla
// (42P01) o columna (42703) que aun no existe. Unico predicado para no
// repetir el codigo en cada degradacion de salud_red (Regla de No-Duplicidad).
function esquemaAusente(e) {
  return !!(e && (e.code === '42P01' || e.code === '42703'));
}

// Normaliza una fila de mercado_config para la respuesta JSON: los pct a 4
// decimales y los precios a 2 (numeric de Neon llega como string). Unico
// punto de normalizacion para las dos vias que devuelven config (lista y
// editar) -- Regla de No-Duplicidad.
function normalizarConfigMercado(r) {
  r.impuesto_base_pct = red4(numXp(r.impuesto_base_pct));
  r.arancel_inter_casa_pct = red4(numXp(r.arancel_inter_casa_pct));
  r.precio_min = red2(numXp(r.precio_min));
  r.precio_max = red2(numXp(r.precio_max));
  return r;
}

// == CATEGORIA DE CONSUMIBLE (WP-6, TSK-103 / ADR-028) ====================
// Categorias conocidas del catalogo (migracion 018): perfil | impulso |
// social | coleccion | general. La columna consumibles.categoria NO lleva
// CHECK a proposito (catalogo administrable), asi que se acepta cualquier
// slug ASCII de hasta 30 caracteres. Vacio, tipo invalido o mayor a 30
// devuelve null y el caller responde 400 CATEGORIA_INVALIDA.
function normalizarCategoriaConsumible(valor) {
  var s = String(valor == null ? '' : valor).trim().toLowerCase();
  if (!s || s.length > 30) return null;
  if (!/^[a-z0-9_-]+$/.test(s)) return null;
  return s;
}

// == ERA EXCLUSIVA DE CONSUMIBLE (ADR-056) ================================
// Catalogo administrable: era_exclusiva vacia/NULL => null (sin gate).
// Comparacion case-insensitive contra las 5 eras del motor v7; cualquier
// valor no reconocido cae a null (nunca se escribe basura en el gate).
function normalizarEraConsumible(v) {
  var s = String(v == null ? '' : v).trim().toLowerCase();
  if (!s || s === 'ninguna' || s === 'null' || s === 'sin_gate') return null;
  var eras = { caminante:'Caminante', explorador:'Explorador', cronista:'Cronista', leyenda:'Leyenda', mito:'Mito' };
  return eras[s] || null;
}

// == CARTAS DE TERRITORIO (ADR-062, migraciones 040/041) ==================
// Catalogo administrable cartas_catalogo. El vocabulario de rareza es el
// mismo de cromos_catalogo y el CHECK de la tabla lo fija: comun|raro|
// epico|dorado. id y set_slug son slugs ASCII estables (authored); el id es
// identidad y NO se edita (igual que consumibles.clave). nivel_gate NULL =
// carta sin gate (familia es_evento); un valor no vacio debe ser un entero
// 1..100. normalizarNivelGateCarta devuelve null (valido, sin gate) o
// undefined (invalido), para distinguir "sin gate" de "valor basura".
var RAREZAS_CARTA = ['comun','raro','epico','dorado'];
function normalizarSlugCarta(valor, maxLen) {
  var s = String(valor == null ? '' : valor).trim().toLowerCase();
  var tope = maxLen || 60;
  if (!s || s.length > tope) return null;
  if (!/^[a-z0-9_-]+$/.test(s)) return null;
  return s;
}
function normalizarNivelGateCarta(valor) {
  if (valor === undefined || valor === null || String(valor).trim() === '') return null;
  var n = parseInt(valor, 10);
  if (!isFinite(n) || n < 1 || n > 100) return undefined;
  return n;
}

// == ORIGEN / LEJANIA (ADR-058, migracion 038) ============================
// Umbrales de las alertas anti-gaming del panel "Salud de la Red". Fijos y
// documentados: NO se leen de gamificacion_config (esa tabla parametriza la
// curva de origen, no estos umbrales de alerta; se reevalua administrarlos).
//   - ORIGEN_OUTLIER_MULT: mult_origen por encima del tope Nomada (1.20)
//     marca la fila como bonificada por lejania (Nomada/Extranjero) y entra
//     al top de outliers de revision manual.
//   - ORIGEN_CONCENTRACION_PCT: si un mismo origen (pais/ciudad) concentra
//     mas de este % del XP bonificado por origen en la ventana, se alerta.
//     AJUSTADO a 85 (era 60): con la base pequena actual, una concentracion
//     moderada era un falso positivo recurrente.
//   - ORIGEN_CONCENTRACION_MIN_XP: piso de XP bonificado para no alertar con
//     volumenes minimos (ruido de pocos eventos). AJUSTADO a 500 (era 100).
//   - ORIGEN_CONCENTRACION_MIN_CUENTAS: piso de CUENTAS distintas con
//     mult_origen > ORIGEN_OUTLIER_MULT (1.2) en la ventana. La alerta de
//     concentracion solo dispara con >= 3 cuentas: con 1-2 usuarios el
//     "origen concentrado" es esperable y no es senal de gaming.
//   - ORIGEN_CUENTA_NUEVA_DIAS: antiguedad de cuenta por debajo de la cual una
//     cuenta extranjera con mult_origen alto se considera de revision manual.
var ORIGEN_OUTLIER_MULT = 1.2;
var ORIGEN_CONCENTRACION_PCT = 85;
var ORIGEN_CONCENTRACION_MIN_XP = 500;
var ORIGEN_CONCENTRACION_MIN_CUENTAS = 3;
var ORIGEN_CUENTA_NUEVA_DIAS = 30;
// Las 7 claves de la curva de origen sembradas por la 038 (ADR-058 6.4).
var ORIGEN_CONFIG_CLAVES = ['factor_origen_local', 'factor_origen_nomada_max',
  'factor_origen_extranjero_max', 'origen_km_nomada', 'origen_km_extranjero',
  'origen_km_local', 'origen_min_dias_cuenta'];
// Contrato de ESCRITURA del editor admin (v7): lista blanca UNICA de las 7
// claves con su rango valido. El endpoint POST ?recurso=gamificacion_config
// deriva de aqui que claves acepta (whitelist anti-inyeccion) y como las
// valida; las claves espejan ORIGEN_CONFIG_CLAVES (lectura de salud_red).
var ORIGEN_CONFIG_SPEC = [
  { clave: 'factor_origen_local',          min: 1.0, max: 1.5,   tipo: 'factor' },
  { clave: 'factor_origen_nomada_max',     min: 1.0, max: 1.8,   tipo: 'factor' },
  { clave: 'factor_origen_extranjero_max', min: 1.0, max: 2.0,   tipo: 'factor' },
  { clave: 'origen_km_nomada',             min: 1,   max: 20000, tipo: 'km' },
  { clave: 'origen_km_extranjero',         min: 1,   max: 30000, tipo: 'km' },
  { clave: 'origen_km_local',              min: 0,   max: 500,   tipo: 'km' },
  { clave: 'origen_min_dias_cuenta',       min: 0,   max: 365,   tipo: 'dias' }
];

// == REPARTO PIRAMIDAL (Entrega 016) ======================================
// EXCEPCION CONTROLADA al tripwire de no-duplicidad (GSD 2.1): los
// archivadores api/*.js se despliegan como funciones serverless
// independientes (sin require cruzado entre ellas), asi que cada una es
// autosuficiente. Esta copia identica viene de api/interacciones.js v13
// (FUENTE DE VERDAD; si cambia alla, actualizar aqui). Constante API:
// con WITH RECURSIVE cadena de 5 niveles + UPDATE como SENTENCIA
// PRINCIPAL con FROM cadena (regla Postgres 0A000: un UPDATE dentro del
// WITH es ilegal), ROUND half-up a 2 decimales de 10/5/3/2/1 % sobre
// xp_ref_total (ADR-035) y tope referidos_directos_contados < 500.
// Nunca lanza: degrada a false.
function repartirXpReferidos(sql, usuarioId, xp) {
  var xpGan = Number(xp) || 0;
  if (!usuarioId || !(xpGan > 0)) return Promise.resolve(false);
  return sql(
    'WITH RECURSIVE cadena AS ('
    + 'SELECT u.referido_por AS ancestro_id, 1 AS nivel FROM usuarios u '
    + 'WHERE u.id=$1 AND u.referido_por IS NOT NULL '
    + 'UNION ALL '
    + 'SELECT u2.referido_por, cadena.nivel + 1 FROM usuarios u2 '
    + 'JOIN cadena ON u2.id = cadena.ancestro_id '
    + 'WHERE cadena.nivel < 5 AND u2.referido_por IS NOT NULL'
    + ') '
    + 'UPDATE usuarios a '
    + 'SET xp_ref_total = COALESCE(xp_ref_total, 0) + ROUND($2 * ('
    + 'CASE c.nivel WHEN 1 THEN 0.10 WHEN 2 THEN 0.05 '
    + 'WHEN 3 THEN 0.03 WHEN 4 THEN 0.02 ELSE 0.01 END), 2) '
    + 'FROM cadena c WHERE a.id = c.ancestro_id '
    + 'AND a.referidos_directos_contados < 500',
    [usuarioId, xpGan]
  ).then(function(){ return true; }).catch(function(){ return false; });
}

// -- EMAIL ----------------------------------------------------------
async function sendEmail(to, subject, html) {
  var key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false, reason: 'no_api_key' };
  try {
    var r = await fetch(RESEND_API, {
      method: 'POST',
      headers: { 'Content-Type':'application/json', 'Authorization':'Bearer '+key },
      body: JSON.stringify({ from: FROM_EMAIL, to: [to], subject, html }),
    });
    var d = await r.json();
    if (!r.ok) throw new Error(d.message || 'Resend '+r.status);
    return { ok: true, id: d.id };
  } catch(e) { return { ok: false, error: e.message }; }
}

function emailResena(b) {
  var s = '\u2605'.repeat(Math.round(b.rating||0))+'\u2606'.repeat(5-Math.round(b.rating||0));
  return '<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:2rem">'
    + '<h2 style="color:#E8A020">\u2b50 Nueva rese\u00f1a \u2014 ' + (b.destino_nombre||'') + '</h2>'
    + '<p><strong>Por:</strong> ' + (b.usuario_nombre||'Visitante') + '</p>'
    + '<p><strong>Rating:</strong> ' + s + '</p>'
    + '<p><strong>Texto:</strong> ' + (b.texto||'(sin texto)') + '</p>'
    + '<p><a href="https://exploraco.vercel.app/admin.html" style="background:#E8A020;color:#fff;padding:8px 16px;border-radius:6px;text-decoration:none">Ver en admin \u2192</a></p>'
    + '</div>';
}
function emailSolicitud(b) {
  return '<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:2rem">'
    + '<h2 style="color:#6366f1">\ud83d\udd14 Nueva solicitud \u2014 ' + (b.nombre||'') + '</h2>'
    + '<p><strong>Ciudad:</strong> ' + (b.ciudad||'') + '</p>'
    + '<p><strong>Categor\u00eda:</strong> ' + (b.categoria||'') + '</p>'
    + '<p><strong>WhatsApp:</strong> <a href="https://wa.me/' + b.whatsapp + '">' + b.whatsapp + '</a></p>'
    + '<p><strong>Descripci\u00f3n:</strong> ' + (b.descripcion_corta||'') + '</p>'
    + '<p><a href="https://exploraco.vercel.app/admin.html" style="background:#E8A020;color:#fff;padding:8px 16px;border-radius:6px;text-decoration:none">Revisar en admin \u2192</a></p>'
    + '</div>';
}

// -- HANDLER PRINCIPAL ------------------------------------------------
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Internal-Secret');
  if (req.method === 'OPTIONS') return res.status(200).end();

  var recurso = req.query.recurso || '';
  var sql     = neon(process.env.DATABASE_URL);
  var body    = req.body || {};

  // == SOLICITUDES (moderar-destinos) ==================================
  if (recurso === 'solicitudes') {
    if (!auth(req)) return res.status(401).json({ ok:false, error:'No autorizado' });

    if (req.method === 'GET') {
      var status  = req.query.status || 'draft';
      var allowed = ['draft','published','archived'];
      if (!allowed.includes(status)) status = 'draft';
      var limit  = Math.min(parseInt(req.query.limit)  || 15, 100);
      var offset = Math.max(parseInt(req.query.offset) || 0, 0);

      var rows = await sql(
        'SELECT d.id, d.slug, d.nombre, '
        + 'd.categoria_slug AS categoria, c.nombre AS categoria_nombre, '
        + 'd.ciudad, d.region AS departamento, '
        + 'd.lead AS descripcion_corta, d.foto_hero AS foto_principal, '
        + 'd.precio_desde, d.lat, d.lng, d.status, d.destacado, '
        + 'd.creado_en AS created_at, '
        + 'd.whatsapp, d.email, d.web, d.instagram, '
        + 'd.tags AS detalles '
        + 'FROM destinos d '
        + 'LEFT JOIN categorias c ON c.slug = d.categoria_slug '
        + 'WHERE d.status = $1 '
        + 'ORDER BY d.creado_en DESC LIMIT $2 OFFSET $3',
        [status, limit, offset]
      );
      var total = await sql('SELECT COUNT(*) AS n FROM destinos WHERE status=$1',[status]);
      return res.status(200).json({ ok:true, status, total: parseInt((total[0]||{}).n||0), items:rows });
    }

    if (req.method === 'POST') {
      var acciones = { aprobar:'published', rechazar:'archived', pendiente:'draft' };
      if (!body.id || !acciones[body.accion])
        return res.status(400).json({ ok:false, error:'Falta id o accion v\u00e1lida' });
      var nuevo = acciones[body.accion];
      var upd = await sql(
        'UPDATE destinos SET status=$1, destacado=$2, actualizado_en=NOW() '
        + 'WHERE id=$3 RETURNING id, slug, nombre, status',
        [nuevo, Boolean(body.destacado||false), body.id]
      );
      if (!upd.length) return res.status(404).json({ ok:false, error:'No encontrado' });
      if (nuevo === 'published') {
        try {
          var baseUrlAdm = (process.env.VERCEL_URL ? 'https://' + process.env.VERCEL_URL : 'https://exploraco.vercel.app');
          await fetch(baseUrlAdm + '/api/interacciones', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer ' + (process.env.ADMIN_SECRET || 'exploraco12345')
            },
            body: JSON.stringify({ tipo: 'publicar_lugar_otorgar', destino_id: body.id })
          });
        } catch (eOtorga) {
          console.warn('[admin solicitudes] otorgar XP fallo: ' + (eOtorga && eOtorga.message));
        }
      }
      var msgs = { published:'\u2705 Publicado', archived:'\ud83d\uddc4\ufe0f Archivado', draft:'\u23f3 Borrador' };
      return res.status(200).json({
        ok:true, mensaje: msgs[nuevo],
        url: nuevo==='published' ? 'https://exploraco.vercel.app/'+upd[0].slug+'.html' : null,
        destino: upd[0],
      });
    }
  }

  // == RESENAS (resenas-admin) ==========================================
  if (recurso === 'resenas') {
    if (!auth(req)) return res.status(401).json({ ok:false, error:'No autorizado' });

    if (req.method === 'GET') {
      var limit2  = Math.min(parseInt(req.query.limit)||50, 200);
      var offset2 = Math.max(parseInt(req.query.offset)||0, 0);
      var slug2   = req.query.slug || null;

      var conds2 = ["i.tipo='resena'"]; var params2=[]; var pi2=1;
      if (slug2) { conds2.push('d.slug=$'+pi2++); params2.push(slug2); }

      var rows2 = await sql(
        'SELECT i.id, i.rating, i.texto, i.creado_en, i.xp_ganado, '
        + 'u.nombre AS usuario_nombre, u.email AS usuario_email, '
        + 'd.id AS destino_id, d.slug AS destino_slug, '
        + 'd.nombre AS destino_nombre, d.ciudad AS destino_ciudad '
        + 'FROM interacciones i '
        + 'LEFT JOIN usuarios u ON u.id=i.usuario_id '
        + 'LEFT JOIN destinos d ON d.id=i.destino_id '
        + 'WHERE ' + conds2.join(' AND ') + ' '
        + 'ORDER BY i.creado_en DESC LIMIT $' + pi2 + ' OFFSET $' + (pi2+1),
        [...params2, limit2, offset2]
      );
      var total2 = await sql(
        'SELECT COUNT(*) AS n, ROUND(AVG(i.rating)::numeric,2) AS avg, '
        + 'COUNT(CASE WHEN i.rating>=4 THEN 1 END) AS pos, '
        + 'COUNT(CASE WHEN i.rating<=2 THEN 1 END) AS neg '
        + 'FROM interacciones i LEFT JOIN destinos d ON d.id=i.destino_id '
        + 'WHERE ' + conds2.join(' AND '), params2
      );
      var st2 = total2[0]||{};
      return res.status(200).json({
        ok:true, total: parseInt(st2.n||0),
        stats: { total:parseInt(st2.n||0), rating_promedio:parseFloat(st2.avg||0), positivas:parseInt(st2.pos||0), negativas:parseInt(st2.neg||0) },
        data: rows2.map(function(r){
          var txt=r.texto||''; var m=txt.match(/^\[([^\]]+)\]\s*/);
          return { id:r.id, rating: r.rating?parseFloat(r.rating):0, texto: m?txt.slice(m[0].length):txt,
            fecha:r.creado_en, xp:red2(numXp(r.xp_ganado)),
            usuario:{ nombre:r.usuario_nombre||(m?m[1]:'An\u00f3nimo'), email:r.usuario_email||null },
            destino:{ id:r.destino_id, slug:r.destino_slug||'', nombre:r.destino_nombre||'', ciudad:r.destino_ciudad||'' }};
        }),
      });
    }

    if (req.method === 'DELETE') {
      var rid = req.query.id || body.id;
      if (!rid) return res.status(400).json({ ok:false, error:'id requerido' });
      var rv = await sql('SELECT destino_id FROM interacciones WHERE id=$1 LIMIT 1',[rid]);
      if (!rv.length) return res.status(404).json({ ok:false, error:'No encontrada' });
      await sql('DELETE FROM interacciones WHERE id=$1',[rid]);
      // Recalcular sobre resena+rating para que AVG y COUNT sigan alineados
      // cuando un usuario conserva su fila de voto rapido (v5, TSK-015).
      await sql(
        'UPDATE destinos SET '
        + 'rating=(SELECT ROUND(AVG(rating)::numeric,2) FROM interacciones WHERE destino_id=$1 AND tipo IN (\'resena\',\'rating\') AND rating IS NOT NULL), '
        + 'total_resenas=(SELECT COUNT(*) FROM interacciones WHERE destino_id=$1 AND tipo IN (\'resena\',\'rating\')), '
        + 'actualizado_en=NOW() WHERE id=$1',
        [rv[0].destino_id]
      ).catch(function(){});
      return res.status(200).json({ ok:true, mensaje:'Rese\u00f1a eliminada' });
    }
  }

  // == DESTACADO =========================================================
  if (recurso === 'destacado') {
    if (!auth(req)) return res.status(401).json({ ok:false, error:'No autorizado' });

    if (req.method === 'GET') {
      var slug3 = req.query.slug;
      if (!slug3) {
        var todos = await sql(
          'SELECT slug,nombre,ciudad,categoria_slug,destacado, '
          + 'tags->>\'destacado_hasta\' AS destacado_hasta, tags->>\'plan\' AS plan '
          + 'FROM destinos WHERE status=\'published\' ORDER BY destacado DESC, rating DESC NULLS LAST'
        );
        return res.status(200).json({ ok:true, data:todos });
      }
      var dr = await sql(
        'SELECT id,slug,nombre,ciudad,destacado, '
        + 'tags->>\'destacado_hasta\' AS destacado_hasta, tags->>\'plan\' AS plan '
        + 'FROM destinos WHERE slug=$1 LIMIT 1', [slug3]
      );
      if (!dr.length) return res.status(404).json({ ok:false, error:'No encontrado' });
      var dd = dr[0];
      var hasta3 = dd.destacado_hasta ? new Date(dd.destacado_hasta) : null;
      var activo3 = dd.destacado && hasta3 && hasta3 > new Date();
      return res.status(200).json({ ok:true, slug:dd.slug, nombre:dd.nombre, destacado:dd.destacado||false,
        activo:activo3, plan:dd.plan||null, destacado_hasta:dd.destacado_hasta||null,
        dias_restantes: activo3 ? Math.ceil((hasta3-new Date())/86400000) : 0, planes:PLANES });
    }

    if (req.method === 'POST') {
      var plan3 = body.plan || 'mensual';
      if (!body.slug || !PLANES[plan3]) return res.status(400).json({ ok:false, error:'slug/plan inv\u00e1lido' });
      var hasta4 = new Date(Date.now()+PLANES[plan3].dias*86400000).toISOString();
      var upd3 = await sql(
        'UPDATE destinos SET destacado=true, '
        + 'tags=COALESCE(tags,\'{}\')||$2::jsonb, actualizado_en=NOW() '
        + 'WHERE slug=$1 RETURNING id,slug,nombre',
        [body.slug, JSON.stringify({ destacado_hasta:hasta4, plan:plan3, precio:PLANES[plan3].precio })]
      );
      if (!upd3.length) return res.status(404).json({ ok:false, error:'No encontrado' });
      return res.status(200).json({ ok:true, mensaje:'\u2705 Destacado activado \u2014 plan '+PLANES[plan3].label, hasta:hasta4, destino:upd3[0] });
    }

    if (req.method === 'DELETE') {
      var slug4 = req.query.slug;
      if (!slug4) return res.status(400).json({ ok:false, error:'slug requerido' });
      await sql(
        'UPDATE destinos SET destacado=false, '
        + 'tags=COALESCE(tags,\'{}\')-\'destacado_hasta\'-\'plan\'-\'precio\', actualizado_en=NOW() '
        + 'WHERE slug=$1', [slug4]
      );
      return res.status(200).json({ ok:true, mensaje:'Destacado removido' });
    }
  }

  // == NOTIFICACIONES (email) ============================================
  if (recurso === 'notificaciones') {
    if (!auth(req) && !authInternal(req))
      return res.status(401).json({ ok:false, error:'No autorizado' });
    if (req.method !== 'POST') return res.status(405).end();

    if (body.tipo === 'resena') {
      var r4 = await sendEmail(ADMIN_EMAIL,
        '\u2b50 Nueva rese\u00f1a \u2014 '+(body.destino_nombre||''), emailResena(body));
      return res.status(200).json(r4);
    }
    if (body.tipo === 'solicitud') {
      var r5 = await sendEmail(ADMIN_EMAIL,
        '\ud83d\udd14 Nueva solicitud \u2014 '+(body.nombre||''), emailSolicitud(body));
      return res.status(200).json(r5);
    }
    return res.status(400).json({ ok:false, error:'tipo debe ser: resena | solicitud' });
  }

  // == CONSUMIBLES (gamificacion v4 / ADR-018) =============================
  // CRUD sobre la tabla consumibles (migracion 010). La clave es la
  // identidad: nunca se edita. El ledger compra_consumibles guarda
  // xp_pagado como snapshot al momento de la compra, asi que cambiar
  // precio_xp aqui solo afecta compras futuras, nunca el historial.
  // Cero Borrado Logico: no existe DELETE; el estado se controla con
  // consumibles_toggle (activo = NOT activo).
  if (recurso === 'consumibles') {
    if (!auth(req)) return res.status(401).json({ ok:false, error:'No autorizado' });

    var tipo = req.query.tipo || '';

    // --- Lista: todos (activos e inactivos) ------------------------------
    if (tipo === 'consumibles_lista') {
      // Degradacion (migracion 035 pendiente): sin era_exclusiva, pero la
      // lista sigue completa. El catch de la primera consulta devuelve null
      // solo ante error; un [] legitimo es truthy y no reintenta.
      var filasC = await sql(
        'SELECT id, clave, nombre, descripcion, precio_xp, categoria, era_exclusiva, activo, creado_en '
        + 'FROM consumibles ORDER BY activo DESC, precio_xp ASC, clave ASC'
      ).catch(function(){ return null; });
      if (!filasC) {
        filasC = await sql(
          'SELECT id, clave, nombre, descripcion, precio_xp, categoria, activo, creado_en '
          + 'FROM consumibles ORDER BY activo DESC, precio_xp ASC, clave ASC'
        );
      }
      filasC = filasC.map(function(c){
        c.precio_xp = red2(numXp(c.precio_xp));
        c.era_exclusiva = c.era_exclusiva || null;
        return c;
      });
      return res.status(200).json({ ok:true, data: filasC, total: filasC.length });
    }

    // --- Crear: clave unica, precio entero > 0 ----------------------------
    if (tipo === 'consumibles_crear') {
      var claveN = String(body.clave||'').trim().toLowerCase();
      var nombreN = String(body.nombre||'').trim();
      var descN  = String(body.descripcion||'').trim();
      // ADR-035: precio_xp es numeric(12,2); acepta decimal con punto o coma.
      var precioN = parseFloat(String(body.precio_xp == null ? '' : body.precio_xp).replace(',', '.'));
      if (!claveN || !nombreN) {
        return res.status(400).json({ ok:false, error:'clave y nombre son obligatorios' });
      }
      if (!isFinite(precioN) || precioN <= 0) {
        return res.status(400).json({ ok:false, error:'precio_xp debe ser un numero mayor que 0' });
      }
      precioN = red2(precioN);
      // WP-6 (TSK-103 / ADR-028): categoria opcional; default 'general'
      // (mismo default de la columna). Si viene, se normaliza y valida.
      var catN = 'general';
      if (body.categoria !== undefined && String(body.categoria).trim() !== '') {
        catN = normalizarCategoriaConsumible(body.categoria);
        if (!catN) return res.status(400).json({ ok:false, error:'CATEGORIA_INVALIDA' });
      }
      // ADR-056: era_exclusiva opcional; vacio/desconocido -> null (sin gate).
      var eraN = normalizarEraConsumible(body.era_exclusiva);
      var existC = await sql('SELECT 1 FROM consumibles WHERE clave=$1 LIMIT 1',[claveN]);
      if (existC.length) {
        return res.status(409).json({ ok:false, error:'Ya existe un consumible con esa clave' });
      }
      var insC = await sql(
        'INSERT INTO consumibles (clave, nombre, descripcion, precio_xp, categoria, era_exclusiva) '
        + 'VALUES ($1,$2,$3,$4,$5,$6) '
        + 'RETURNING id, clave, nombre, descripcion, precio_xp, categoria, era_exclusiva, activo, creado_en',
        [claveN, nombreN, descN, precioN, catN, eraN]
      );
      insC[0].precio_xp = red2(numXp(insC[0].precio_xp));
      return res.status(201).json({ ok:true, data: insC[0], mensaje:'Consumible creado' });
    }

    // --- Editar: nombre/descripcion/precio_xp (NUNCA la clave) ------------
    if (tipo === 'consumibles_editar') {
      if (!body.id) {
        return res.status(400).json({ ok:false, error:'id requerido' });
      }
      var setsC = []; var paramsC = []; var piC = 1;
      if ('nombre' in body) {
        var nomE = String(body.nombre||'').trim();
        if (!nomE) return res.status(400).json({ ok:false, error:'nombre no puede quedar vacio' });
        setsC.push('nombre=$'+piC++); paramsC.push(nomE);
      }
      if ('descripcion' in body) {
        setsC.push('descripcion=$'+piC++); paramsC.push(String(body.descripcion||'').trim());
      }
      if ('precio_xp' in body) {
        var precioE = parseFloat(String(body.precio_xp == null ? '' : body.precio_xp).replace(',', '.'));
        if (!isFinite(precioE) || precioE < 0) {
          return res.status(400).json({ ok:false, error:'precio_xp debe ser un numero mayor o igual a 0' });
        }
        setsC.push('precio_xp=$'+piC++); paramsC.push(red2(precioE));
      }
      // WP-6 (TSK-103 / ADR-028): categoria editable (default de columna
      // 'general'; la lista conocida vive en normalizarCategoriaConsumible).
      if ('categoria' in body) {
        var catE = normalizarCategoriaConsumible(body.categoria);
        if (!catE) return res.status(400).json({ ok:false, error:'CATEGORIA_INVALIDA' });
        setsC.push('categoria=$'+piC++); paramsC.push(catE);
      }
      // ADR-056: era_exclusiva editable; vacio/desconocido -> null (quita
      // el gate). Se distingue "no enviado" (no toca la columna) de null.
      if ('era_exclusiva' in body) {
        var eraE = normalizarEraConsumible(body.era_exclusiva);
        setsC.push('era_exclusiva=$'+piC++); paramsC.push(eraE);
      }
      if (!setsC.length) {
        return res.status(400).json({ ok:false, error:'nada que editar: envia nombre, descripcion, precio_xp, categoria o era_exclusiva' });
      }
      paramsC.push(body.id);
      var updC = await sql(
        'UPDATE consumibles SET '+setsC.join(', ')+' WHERE id=$'+piC
        + ' RETURNING id, clave, nombre, descripcion, precio_xp, categoria, era_exclusiva, activo',
        paramsC
      );
      if (!updC.length) return res.status(404).json({ ok:false, error:'Consumible no encontrado' });
      updC[0].precio_xp = red2(numXp(updC[0].precio_xp));
      return res.status(200).json({ ok:true, data: updC[0], mensaje:'Consumible actualizado' });
    }

    // --- Toggle: Cero Borrado Logico (activo = NOT activo) ----------------
    if (tipo === 'consumibles_toggle') {
      if (!body.id) return res.status(400).json({ ok:false, error:'id requerido' });
      var filaT = await sql('SELECT activo FROM consumibles WHERE id=$1 LIMIT 1',[body.id]);
      if (!filaT.length) return res.status(404).json({ ok:false, error:'Consumible no encontrado' });
      // Si body.activo viene explicito se respeta (contrato spec); si no se
      // alterna el estado actual (toggle puro pedido por la tarea).
      var nuevoT = (typeof body.activo === 'boolean') ? body.activo : !filaT[0].activo;
      await sql('UPDATE consumibles SET activo=$1 WHERE id=$2',[nuevoT, body.id]);
      return res.status(200).json({
        ok:true, activo:nuevoT,
        mensaje: nuevoT ? 'Consumible activado' : 'Consumible desactivado'
      });
    }

    return res.status(400).json({ ok:false, error:'tipo invalido para recurso consumibles' });
  }

  // == CARTAS DE TERRITORIO (ADR-062, migraciones 040/041) =================
  // CRUD del catalogo cartas_catalogo con el mismo patron que consumibles:
  // router real por ?recurso=cartas y ?tipo=cartas_lista|cartas_crear|
  // cartas_editar|cartas_toggle. El id es identidad y NUNCA se edita (igual
  // que consumibles.clave). CERO BORRADO FISICO: no hay DELETE; la baja es
  // cartas_toggle (activo = NOT activo, o body.activo explicito). Degradacion
  // 503 SCHEMA_NOT_MIGRATED (42P01/42703) si la 040 no corrio (patron
  // BUG-021). No crea endpoints (8/8, ADR-001).
  if (recurso === 'cartas') {
    if (!auth(req)) return res.status(401).json({ ok:false, error:'No autorizado' });
    var tipoCa = req.query.tipo || 'cartas_lista';

    try {
      // --- Lista: todas (activas e inactivas) ---------------------------
      if (tipoCa === 'cartas_lista') {
        if (req.method !== 'GET') return res.status(405).end();
        var filasCa = await sql(
          'SELECT id, nombre, set_slug, rareza, nivel_gate, es_evento, imagen_url, activo, creado_en '
          + 'FROM cartas_catalogo '
          + 'ORDER BY activo DESC, set_slug ASC, nivel_gate ASC NULLS FIRST, id ASC'
        );
        return res.status(200).json({ ok:true, data: filasCa, total: filasCa.length });
      }

      // --- Crear: id unico (slug ASCII), set y rareza validos -----------
      if (tipoCa === 'cartas_crear') {
        if (req.method !== 'POST') return res.status(405).end();
        var idCa = normalizarSlugCarta(body.id, 60);
        var nomCa = String(body.nombre || '').trim();
        var setCa = normalizarSlugCarta(body.set_slug, 60);
        var rarCa = String(body.rareza || '').trim().toLowerCase();
        if (!idCa) return res.status(400).json({ ok:false, error:'ID_INVALIDO' });
        if (!nomCa) return res.status(400).json({ ok:false, error:'nombre requerido' });
        if (!setCa) return res.status(400).json({ ok:false, error:'SET_SLUG_INVALIDO' });
        if (RAREZAS_CARTA.indexOf(rarCa) < 0)
          return res.status(400).json({ ok:false, error:'RAREZA_INVALIDA' });
        var nivCa = normalizarNivelGateCarta(body.nivel_gate);
        if (nivCa === undefined)
          return res.status(400).json({ ok:false, error:'NIVEL_GATE_INVALIDO' });
        var evCa = Boolean(body.es_evento);
        var imgCa = String(body.imagen_url == null ? '' : body.imagen_url).trim() || null;
        if (imgCa && imgCa.length > 500)
          return res.status(400).json({ ok:false, error:'IMAGEN_URL_INVALIDA' });
        var existCa = await sql('SELECT 1 FROM cartas_catalogo WHERE id=$1 LIMIT 1',[idCa]);
        if (existCa.length)
          return res.status(409).json({ ok:false, error:'Ya existe una carta con ese id' });
        var insCa = await sql(
          'INSERT INTO cartas_catalogo (id, nombre, set_slug, rareza, nivel_gate, es_evento, imagen_url) '
          + 'VALUES ($1,$2,$3,$4,$5,$6,$7) '
          + 'RETURNING id, nombre, set_slug, rareza, nivel_gate, es_evento, imagen_url, activo, creado_en',
          [idCa, nomCa, setCa, rarCa, nivCa, evCa, imgCa]
        );
        return res.status(201).json({ ok:true, data: insCa[0], mensaje:'Carta creada' });
      }

      // --- Editar: campos de contenido (NUNCA el id) --------------------
      if (tipoCa === 'cartas_editar') {
        if (req.method !== 'POST') return res.status(405).end();
        if (!body.id) return res.status(400).json({ ok:false, error:'id requerido' });
        var setsCa = []; var paramsCa = []; var piCa = 1;
        if ('nombre' in body) {
          var nomE2 = String(body.nombre || '').trim();
          if (!nomE2) return res.status(400).json({ ok:false, error:'nombre no puede quedar vacio' });
          setsCa.push('nombre=$' + piCa++); paramsCa.push(nomE2);
        }
        if ('set_slug' in body) {
          var setE2 = normalizarSlugCarta(body.set_slug, 60);
          if (!setE2) return res.status(400).json({ ok:false, error:'SET_SLUG_INVALIDO' });
          setsCa.push('set_slug=$' + piCa++); paramsCa.push(setE2);
        }
        if ('rareza' in body) {
          var rarE2 = String(body.rareza || '').trim().toLowerCase();
          if (RAREZAS_CARTA.indexOf(rarE2) < 0)
            return res.status(400).json({ ok:false, error:'RAREZA_INVALIDA' });
          setsCa.push('rareza=$' + piCa++); paramsCa.push(rarE2);
        }
        if ('nivel_gate' in body) {
          var nivE2 = normalizarNivelGateCarta(body.nivel_gate);
          if (nivE2 === undefined)
            return res.status(400).json({ ok:false, error:'NIVEL_GATE_INVALIDO' });
          setsCa.push('nivel_gate=$' + piCa++); paramsCa.push(nivE2);
        }
        if ('es_evento' in body) {
          setsCa.push('es_evento=$' + piCa++); paramsCa.push(Boolean(body.es_evento));
        }
        if ('imagen_url' in body) {
          var imgE2 = String(body.imagen_url == null ? '' : body.imagen_url).trim() || null;
          if (imgE2 && imgE2.length > 500)
            return res.status(400).json({ ok:false, error:'IMAGEN_URL_INVALIDA' });
          setsCa.push('imagen_url=$' + piCa++); paramsCa.push(imgE2);
        }
        if (!setsCa.length)
          return res.status(400).json({ ok:false, error:'nada que editar: envia nombre, set_slug, rareza, nivel_gate, es_evento o imagen_url' });
        paramsCa.push(body.id);
        var updCa = await sql(
          'UPDATE cartas_catalogo SET ' + setsCa.join(', ') + ' WHERE id=$' + piCa
          + ' RETURNING id, nombre, set_slug, rareza, nivel_gate, es_evento, imagen_url, activo',
          paramsCa
        );
        if (!updCa.length) return res.status(404).json({ ok:false, error:'Carta no encontrada' });
        return res.status(200).json({ ok:true, data: updCa[0], mensaje:'Carta actualizada' });
      }

      // --- Toggle: Cero Borrado Logico (activo = NOT activo) ------------
      if (tipoCa === 'cartas_toggle') {
        if (req.method !== 'POST') return res.status(405).end();
        if (!body.id) return res.status(400).json({ ok:false, error:'id requerido' });
        var filaCa = await sql('SELECT activo FROM cartas_catalogo WHERE id=$1 LIMIT 1',[body.id]);
        if (!filaCa.length) return res.status(404).json({ ok:false, error:'Carta no encontrada' });
        var nuevoCa = (typeof body.activo === 'boolean') ? body.activo : !filaCa[0].activo;
        await sql('UPDATE cartas_catalogo SET activo=$1 WHERE id=$2',[nuevoCa, body.id]);
        return res.status(200).json({
          ok:true, activo:nuevoCa,
          mensaje: nuevoCa ? 'Carta activada' : 'Carta desactivada',
        });
      }

      return res.status(400).json({ ok:false, error:'tipo invalido para recurso cartas' });
    } catch (eCa) {
      if (esquemaAusente(eCa))
        return res.status(503).json({
          ok:false, error:'SCHEMA_NOT_MIGRATED',
          detalle:'Aplica db/migrations/040_gobernanza_cartas_moneda.sql en Neon antes de usar cartas.',
        });
      console.warn('[admin cartas] error: ' + (eCa && eCa.code) + ' ' + (eCa && eCa.message));
      return res.status(500).json({ ok:false, error:'Error interno' });
    }
  }

  // == MERCADO DE EMPRENDEDORES (migracion 034) ============================
  // Router real por ?recurso=mercado (mismo patron que consumibles). No crea
  // endpoints (8/8, ADR-001). Auth reusa auth()/authInternal() del archivo.
  // Degradacion: si mercado_config / mercado_ofertas no existen (42P01) o les
  // falta una columna (42703), responde 503 SCHEMA_NOT_MIGRATED (patron
  // activos_ocultos) porque la 034 aun no corrio. Sin SELECT *: cada consulta
  // lista sus columnas explicitamente.
  // MODERACION vs CANCELACION DEL DUENO: mercado_ofertas_moderar SOLO marca
  // estado='cancelada' (Cero Borrado Logico) y NO devuelve inventario al
  // vendedor: es una sancion administrativa, no el desistimiento del dueno
  // (que si reintegraria cantidad_restante al inventario del vendedor).
  if (recurso === 'mercado') {
    if (!auth(req) && !authInternal(req))
      return res.status(401).json({ ok:false, error:'No autorizado' });

    var tipoM = req.query.tipo || '';
    var CASAS_MERCADO = ['condor','jaguar','delfin'];
    var ESTADOS_MERCADO = ['activa','agotada','cancelada'];

    try {
      // --- Normas por Casa: lista (3 filas ordenadas por casa) ----------
      if (tipoM === 'mercado_config_lista') {
        if (req.method !== 'GET') return res.status(405).end();
        var filasMC = await sql(
          'SELECT casa, impuesto_base_pct, arancel_inter_casa_pct, slots_base, '
          + 'permite_cross_casa, permite_produccion, precio_min, precio_max, '
          + 'duracion_oferta_horas, activo, actualizado_en '
          + 'FROM mercado_config ORDER BY casa ASC'
        );
        filasMC = filasMC.map(normalizarConfigMercado);
        return res.status(200).json({ ok:true, data: filasMC, total: filasMC.length });
      }

      // --- Normas por Casa: editar (valida casa y rangos) ---------------
      if (tipoM === 'mercado_config_editar') {
        if (req.method !== 'POST') return res.status(405).end();
        var casaM = String(body.casa == null ? '' : body.casa).trim().toLowerCase();
        if (CASAS_MERCADO.indexOf(casaM) < 0)
          return res.status(400).json({ ok:false, error:'CASA_INVALIDA' });

        // ADR-035: numeric acepta punto o coma; se normaliza a punto.
        var pctM  = parseFloat(String(body.impuesto_base_pct == null ? '' : body.impuesto_base_pct).replace(',', '.'));
        var arrM  = parseFloat(String(body.arancel_inter_casa_pct == null ? '' : body.arancel_inter_casa_pct).replace(',', '.'));
        var slotsM = parseInt(body.slots_base, 10);
        var pminM = parseFloat(String(body.precio_min == null ? '' : body.precio_min).replace(',', '.'));
        var pmaxM = parseFloat(String(body.precio_max == null ? '' : body.precio_max).replace(',', '.'));
        var durM  = parseInt(body.duracion_oferta_horas, 10);

        // Rangos del contrato: pct 0..0.15; slots 0..20; duracion 1..720;
        // precio_min > 0 y precio_max >= precio_min.
        if (!isFinite(pctM) || pctM < 0 || pctM > 0.15)
          return res.status(400).json({ ok:false, error:'IMPUESTO_FUERA_DE_RANGO' });
        if (!isFinite(arrM) || arrM < 0 || arrM > 0.15)
          return res.status(400).json({ ok:false, error:'ARANCEL_FUERA_DE_RANGO' });
        if (!isFinite(slotsM) || slotsM < 0 || slotsM > 20)
          return res.status(400).json({ ok:false, error:'SLOTS_FUERA_DE_RANGO' });
        if (!isFinite(durM) || durM < 1 || durM > 720)
          return res.status(400).json({ ok:false, error:'DURACION_FUERA_DE_RANGO' });
        if (!isFinite(pminM) || pminM <= 0)
          return res.status(400).json({ ok:false, error:'PRECIO_MIN_INVALIDO' });
        if (!isFinite(pmaxM) || pmaxM < pminM)
          return res.status(400).json({ ok:false, error:'PRECIO_MAX_INVALIDO' });

        var updMC = await sql(
          'UPDATE mercado_config SET impuesto_base_pct=$1, '
          + 'arancel_inter_casa_pct=$2, slots_base=$3, permite_cross_casa=$4, '
          + 'permite_produccion=$5, precio_min=$6, precio_max=$7, '
          + 'duracion_oferta_horas=$8, activo=$9, actualizado_en=NOW() '
          + 'WHERE casa=$10 '
          + 'RETURNING casa, impuesto_base_pct, arancel_inter_casa_pct, slots_base, '
          + 'permite_cross_casa, permite_produccion, precio_min, precio_max, '
          + 'duracion_oferta_horas, activo, actualizado_en',
          [red4(pctM), red4(arrM), slotsM, Boolean(body.permite_cross_casa),
           Boolean(body.permite_produccion), red2(pminM), red2(pmaxM), durM,
           Boolean(body.activo), casaM]
        );
        if (!updMC.length)
          return res.status(404).json({ ok:false, error:'CASA_NO_ENCONTRADA' });
        return res.status(200).json({
          ok:true, data: normalizarConfigMercado(updMC[0]),
          mensaje:'Normas del mercado actualizadas',
        });
      }

      // --- Ofertas: lista (JOIN consumibles + vendedor) -----------------
      if (tipoM === 'mercado_ofertas_lista') {
        if (req.method !== 'GET') return res.status(405).end();
        var casaF = String(req.query.casa == null ? '' : req.query.casa).trim().toLowerCase();
        var estadoF = String(req.query.estado == null ? '' : req.query.estado).trim().toLowerCase();
        var condM = []; var paramsM = []; var piM = 1;
        if (casaF) {
          if (CASAS_MERCADO.indexOf(casaF) < 0)
            return res.status(400).json({ ok:false, error:'CASA_INVALIDA' });
          condM.push('o.casa=$' + piM++); paramsM.push(casaF);
        }
        if (estadoF) {
          if (ESTADOS_MERCADO.indexOf(estadoF) < 0)
            return res.status(400).json({ ok:false, error:'ESTADO_INVALIDO' });
          condM.push('o.estado=$' + piM++); paramsM.push(estadoF);
        }
        var whereM = condM.length ? ('WHERE ' + condM.join(' AND ')) : '';
        var filasOF = await sql(
          'SELECT o.id, o.casa, o.cantidad, o.cantidad_restante, '
          + 'o.precio_unitario, o.origen, o.estado, o.creado_en, o.expira_en, '
          + 'c.clave AS consumible_clave, c.nombre AS consumible_nombre, '
          + 'u.nombre AS vendedor_nombre, u.email AS vendedor_email '
          + 'FROM mercado_ofertas o '
          + 'LEFT JOIN consumibles c ON c.id = o.consumible_id '
          + 'LEFT JOIN usuarios u ON u.id = o.vendedor_id '
          + whereM + ' ORDER BY o.creado_en DESC LIMIT 200',
          paramsM
        );
        filasOF = filasOF.map(function (o) {
          o.precio_unitario = red2(numXp(o.precio_unitario));
          return o;
        });
        return res.status(200).json({ ok:true, data: filasOF, total: filasOF.length });
      }

      // --- Ofertas: moderar (cancelacion admin, sin reintegro) ----------
      if (tipoM === 'mercado_ofertas_moderar') {
        if (req.method !== 'POST') return res.status(405).end();
        if (!body.oferta_id)
          return res.status(400).json({ ok:false, error:'oferta_id requerido' });
        // Validar formato uuid ANTES del SQL: un id malformado produce 22P02
        // (que caeria al catch como 500); aqui se responde 400 explicito.
        if (!/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(String(body.oferta_id)))
          return res.status(400).json({ ok:false, error:'oferta_id invalido' });
        var motivoM = String(body.motivo == null ? '' : body.motivo).trim();

        // Moderacion administrativa: SOLO estado='cancelada' (Cero Borrado
        // Logico). A DIFERENCIA de la cancelacion por el dueno, esta via NO
        // reintegra inventario al vendedor: devolver cantidad_restante seria
        // neutralizar la sancion. No existe tabla de ledger de moderacion en
        // la migracion 034, asi que la constancia va al log del servidor.
        var modM = await sql(
          'UPDATE mercado_ofertas SET estado=\'cancelada\' '
          + 'WHERE id=$1 AND estado<>\'cancelada\' '
          + 'RETURNING id, casa, consumible_id, vendedor_id',
          [body.oferta_id]
        );
        if (!modM.length) {
          // Distinguir "no existe" de "ya cancelada" (idempotencia).
          var chkM = await sql(
            'SELECT id, estado FROM mercado_ofertas WHERE id=$1 LIMIT 1',
            [body.oferta_id]
          );
          if (!chkM.length)
            return res.status(404).json({ ok:false, error:'OFERTA_NO_ENCONTRADA' });
          return res.status(200).json({ ok:true, oferta_id: body.oferta_id, sin_cambios:true });
        }
        console.warn('[admin] mercado_ofertas_moderar: oferta ' + body.oferta_id
          + ' cancelada por admin; motivo=' + (motivoM || '(sin motivo)'));
        return res.status(200).json({ ok:true, oferta_id: body.oferta_id });
      }

      return res.status(400).json({ ok:false, error:'tipo invalido para recurso mercado' });
    } catch (eM) {
      if (esquemaAusente(eM))
        return res.status(503).json({
          ok:false, error:'SCHEMA_NOT_MIGRATED',
          detalle:'Aplica db/migrations/034_mercado_emprendedores.sql en Neon antes de usar el mercado.',
        });
      return res.status(500).json({ ok:false, error:'Error interno' });
    }
  }

  // == ACTIVOS OCULTOS (Wayfarer, moderacion admin - Entrega 016) ==========
  // Moderacion manual sobre las propuestas de la comunidad (migracion 016).
  // El quorum de votos (+/-3) ya resuelve el caso normal en
  // api/interacciones.js v13; esta rama es la via directa del admin.
  // Cero borrado fisico: se cambia estado/resuelto_en, nunca DELETE.
  if (recurso === 'activos_ocultos') {
    if (!auth(req)) return res.status(401).json({ ok:false, error:'No autorizado' });
    if (req.method !== 'POST') return res.status(405).end();
    var tipoAO = body.tipo || req.query.tipo || '';

    // Moderar una propuesta: 'aprobar' (+50 XP al proponente + reparto
    // piramidal) o 'rechazar' (sin XP, decision aprobada). Al aprobar una
    // propuesta YA aprobada se responde sin_cambios:true sin pagar XP de
    // nuevo (anti-farm de re-aprobacion).
    if (tipoAO === 'activo_oculto_moderar') {
      try {
        var aoAccion = body.accion;
        var aoId = body.activo_id;
        if (!aoId) return res.status(400).json({ ok:false, error:'activo_id requerido' });
        if (aoAccion !== 'aprobar' && aoAccion !== 'rechazar')
          return res.status(400).json({ ok:false, error:'ACCION_INVALIDA' });

        var aoRow = await sql(
          'SELECT propuesto_por, estado FROM activos_ocultos '
          + 'WHERE id=$1 AND activo=true',
          [aoId]
        );
        if (!aoRow.length)
          return res.status(404).json({ ok:false, error:'ACTIVO_NO_ENCONTRADO' });
        var aoPropuesta = aoRow[0].propuesto_por;
        var aoEstado = aoRow[0].estado;

        if (aoAccion === 'aprobar') {
          if (aoEstado === 'aprobado')
            return res.status(200).json({ ok:true, data:{ sin_cambios:true, estado:'aprobado', xp_proponente:0 } });
          await sql(
            'UPDATE activos_ocultos SET estado=\'aprobado\', resuelto_en=NOW() '
            + 'WHERE id=$1 AND activo=true',
            [aoId]
          );
          // +50 XP al autor de la propuesta (no se otorga al proponer,
          // solo al aprobar) y reparto piramidal silencioso. si el
          // proponente ya no existe (FK optional), el UPDATE no afecta
          // filas y el reparto degrada a false: inofensivo.
          await sql(
            'UPDATE usuarios SET xp_total=xp_total+50, ultimo_acceso=NOW() WHERE id=$1',
            [aoPropuesta]
          ).catch(function(e){ console.warn('gaming016 xp_propuesta no acreditado', e && e.code); });
          await repartirXpReferidos(sql, aoPropuesta, 50);
          return res.status(200).json({ ok:true, data:{ estado:'aprobado', xp_proponente:50 } });
        }

        // accion = rechazar (sin XP, decision aprobada)
        await sql(
          'UPDATE activos_ocultos SET estado=\'rechazado\', resuelto_en=NOW() '
          + 'WHERE id=$1 AND activo=true',
          [aoId]
        );
        return res.status(200).json({ ok:true, data:{ estado:'rechazado', xp_proponente:0 } });
      } catch (e) {
        // Errores tipificados (mismo patron que api/interacciones.js):
        // tabla/columna ausente = migracion pendiente; violacion de PK =
        // conflicto; cualquier otra cosa = 500 explicito (no silenciado).
        if (e && (e.code === '42P01' || e.code === '42703'))
          return res.status(503).json({ ok:false, error:'SCHEMA_NOT_MIGRATED' });
        if (e && e.code === '23505')
          return res.status(409).json({ ok:false, error:'CONFLICTO' });
        return res.status(500).json({ ok:false, error:'Error interno' });
      }
    }

    return res.status(400).json({ ok:false, error:'tipo invalido para recurso activos_ocultos' });
  }

  // == GOBERNANZA (ADR-063, migracion 040) =================================
  // Router real por ?recurso=gobernanza y ?tipo=gobernanza_lista|
  // gobernanza_moderar. GET lista propuestas con conteo de votos (favor/
  // contra/abstencion) y filtros opcionales por capa/estado. POST moderar
  // cambia el estado a aprobada|rechazada|archivada y setea resuelto_en=NOW();
  // CERO BORRADO FISICO (no DELETE). Degradacion 503 SCHEMA_NOT_MIGRATED
  // (42P01/42703) si la 040 no corrio (patron BUG-021). No crea endpoints.
  if (recurso === 'gobernanza') {
    if (!auth(req)) return res.status(401).json({ ok:false, error:'No autorizado' });
    var tipoGo = req.query.tipo || 'gobernanza_lista';

    try {
      // --- Lista con conteo de votos ------------------------------------
      if (tipoGo === 'gobernanza_lista') {
        if (req.method !== 'GET') return res.status(405).end();
        var CAPAS_GOB = ['ecosistema','parche','faccion','marca'];
        var ESTADOS_GOB = ['abierta','aprobada','rechazada','archivada'];
        var capaGo = String(req.query.capa == null ? '' : req.query.capa).trim().toLowerCase();
        var estadoGo = String(req.query.estado == null ? '' : req.query.estado).trim().toLowerCase();
        var condGo = []; var paramsGo = []; var piGo = 1;
        if (capaGo) {
          if (CAPAS_GOB.indexOf(capaGo) < 0)
            return res.status(400).json({ ok:false, error:'CAPA_INVALIDA' });
          condGo.push('p.capa=$' + piGo++); paramsGo.push(capaGo);
        }
        if (estadoGo) {
          if (ESTADOS_GOB.indexOf(estadoGo) < 0)
            return res.status(400).json({ ok:false, error:'ESTADO_INVALIDO' });
          condGo.push('p.estado=$' + piGo++); paramsGo.push(estadoGo);
        }
        var whereGo = condGo.length ? ('WHERE ' + condGo.join(' AND ')) : '';
        var filasGo = await sql(
          'SELECT p.id, p.capa, p.capa_id, p.titulo, p.descripcion, p.estado, p.quorum, '
          + 'p.activo, p.creado_en, p.cierra_en, p.resuelto_en, '
          + 'u.nombre AS autor_nombre, u.email AS autor_email, '
          + 'COUNT(v.usuario_id)::int AS votos_total, '
          + 'COUNT(*) FILTER (WHERE v.voto = \'favor\')::int AS votos_favor, '
          + 'COUNT(*) FILTER (WHERE v.voto = \'contra\')::int AS votos_contra, '
          + 'COUNT(*) FILTER (WHERE v.voto = \'abstencion\')::int AS votos_abstencion '
          + 'FROM gobernanza_propuestas p '
          + 'LEFT JOIN usuarios u ON u.id = p.autor_id '
          + 'LEFT JOIN gobernanza_votos v ON v.propuesta_id = p.id AND v.activo = true '
          + whereGo + ' GROUP BY p.id, u.nombre, u.email ORDER BY p.creado_en DESC LIMIT 200',
          paramsGo
        );
        return res.status(200).json({ ok:true, data: filasGo, total: filasGo.length });
      }

      // --- Moderar: cambiar estado + resuelto_en (sin DELETE) -----------
      if (tipoGo === 'gobernanza_moderar') {
        if (req.method !== 'POST') return res.status(405).end();
        var propGo = body.propuesta_id || body.id;
        if (!propGo) return res.status(400).json({ ok:false, error:'propuesta_id requerido' });
        if (!/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(String(propGo)))
          return res.status(400).json({ ok:false, error:'propuesta_id invalido' });
        var estGo = String(body.estado == null ? '' : body.estado).trim().toLowerCase();
        if (estGo !== 'aprobada' && estGo !== 'rechazada' && estGo !== 'archivada')
          return res.status(400).json({ ok:false, error:'ESTADO_INVALIDO' });
        var updGo = await sql(
          'UPDATE gobernanza_propuestas SET estado=$1, resuelto_en=NOW() '
          + 'WHERE id=$2 AND estado<>$1 '
          + 'RETURNING id, capa, capa_id, estado, resuelto_en',
          [estGo, propGo]
        );
        if (!updGo.length) {
          var chkGo = await sql('SELECT id, estado FROM gobernanza_propuestas WHERE id=$1 LIMIT 1',[propGo]);
          if (!chkGo.length)
            return res.status(404).json({ ok:false, error:'PROPUESTA_NO_ENCONTRADA' });
          return res.status(200).json({ ok:true, propuesta_id: propGo, estado: chkGo[0].estado, sin_cambios:true });
        }
        return res.status(200).json({ ok:true, data: updGo[0] });
      }

      return res.status(400).json({ ok:false, error:'tipo invalido para recurso gobernanza' });
    } catch (eGo) {
      if (esquemaAusente(eGo))
        return res.status(503).json({
          ok:false, error:'SCHEMA_NOT_MIGRATED',
          detalle:'Aplica db/migrations/040_gobernanza_cartas_moneda.sql en Neon antes de usar gobernanza.',
        });
      console.warn('[admin gobernanza] error: ' + (eGo && eGo.code) + ' ' + (eGo && eGo.message));
      return res.status(500).json({ ok:false, error:'Error interno' });
    }
  }

  // == MARCAS CAPTURAN SPOTS (ADR-064, migracion 040) =======================
  // Router real por ?recurso=marcas_spots y ?tipo=spot_presencia_lista|
  // spot_presencia_moderar. GET lista spot_presencia con marca/destino. POST
  // moderar: estado verificada|rechazada; al RECHAZAR se hace activo=false
  // (Cero Borrado Logico, ADR-003). NO existe DELETE. Degradacion 503
  // SCHEMA_NOT_MIGRATED (42P01/42703) si la 040/027 no corrio. No crea
  // endpoints (8/8, ADR-001).
  if (recurso === 'marcas_spots') {
    if (!auth(req)) return res.status(401).json({ ok:false, error:'No autorizado' });
    var tipoMs = req.query.tipo || 'spot_presencia_lista';

    try {
      // --- Lista con marca y destino ------------------------------------
      if (tipoMs === 'spot_presencia_lista') {
        if (req.method !== 'GET') return res.status(405).end();
        var ESTADOS_MS = ['pendiente','verificada','rechazada'];
        var estadoMs = String(req.query.estado == null ? '' : req.query.estado).trim().toLowerCase();
        var condMs = []; var paramsMs = []; var piMs = 1;
        if (estadoMs) {
          if (ESTADOS_MS.indexOf(estadoMs) < 0)
            return res.status(400).json({ ok:false, error:'ESTADO_INVALIDO' });
          condMs.push('s.estado=$' + piMs++); paramsMs.push(estadoMs);
        }
        var whereMs = condMs.length ? ('WHERE ' + condMs.join(' AND ')) : '';
        var filasMs = await sql(
          'SELECT s.id, s.marca_id, s.destino_id, s.patrocinio_id, s.estado, s.activo, s.creado_en, '
          + 'm.nombre AS marca_nombre, m.verificada AS marca_verificada, '
          + 'd.nombre AS destino_nombre, d.slug AS destino_slug, d.ciudad AS destino_ciudad '
          + 'FROM spot_presencia s '
          + 'LEFT JOIN marcas m ON m.id = s.marca_id '
          + 'LEFT JOIN destinos d ON d.id = s.destino_id '
          + whereMs + ' ORDER BY s.creado_en DESC LIMIT 200',
          paramsMs
        );
        return res.status(200).json({ ok:true, data: filasMs, total: filasMs.length });
      }

      // --- Moderar: verificada|rechazada (rechazo -> activo=false) ------
      if (tipoMs === 'spot_presencia_moderar') {
        if (req.method !== 'POST') return res.status(405).end();
        var presMs = body.presencia_id || body.id;
        if (!presMs) return res.status(400).json({ ok:false, error:'presencia_id requerido' });
        if (!/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(String(presMs)))
          return res.status(400).json({ ok:false, error:'presencia_id invalido' });
        var estMs = String(body.estado == null ? '' : body.estado).trim().toLowerCase();
        if (estMs !== 'verificada' && estMs !== 'rechazada')
          return res.status(400).json({ ok:false, error:'ESTADO_INVALIDO' });
        var actMs = (estMs === 'verificada');
        var updMs = await sql(
          'UPDATE spot_presencia SET estado=$1, activo=$2 WHERE id=$3 '
          + 'RETURNING id, marca_id, destino_id, estado, activo',
          [estMs, actMs, presMs]
        );
        if (!updMs.length) return res.status(404).json({ ok:false, error:'PRESENCIA_NO_ENCONTRADA' });
        return res.status(200).json({ ok:true, data: updMs[0] });
      }

      return res.status(400).json({ ok:false, error:'tipo invalido para recurso marcas_spots' });
    } catch (eMs) {
      if (esquemaAusente(eMs))
        return res.status(503).json({
          ok:false, error:'SCHEMA_NOT_MIGRATED',
          detalle:'Aplica db/migrations/040_gobernanza_cartas_moneda.sql (y 027) en Neon antes de usar marcas_spots.',
        });
      console.warn('[admin marcas_spots] error: ' + (eMs && eMs.code) + ' ' + (eMs && eMs.message));
      return res.status(500).json({ ok:false, error:'Error interno' });
    }
  }

  // == SALUD DE LA RED (gamificacion v6 / ADR-053 Decision 13.3) ==========
  // Rama NUEVA GET ?recurso=salud_red. El router real enruta por ?recurso=
  // (no se agrega un despachador global ?tipo=, Enmienda 1 Q1) y el gate
  // Bearer reusa auth(), mismo patron que las demas ramas. Agrega el
  // xp_ledger por dia/accion para el panel "Salud de la Red".
  // Degradacion obligatoria (patron BUG-021 / ADR-053 R-1): si la migracion
  // 031 no corrio y xp_ledger no existe (42P01), responde 200 con
  // degradado:true y console.warn, nunca 500 ni catch vacio.
  // Sin SELECT *: cada consulta lista sus columnas explicitamente.
  if (recurso === 'salud_red') {
    if (!auth(req)) return res.status(401).json({ ok:false, error:'No autorizado' });
    if (req.method !== 'GET') return res.status(405).end();

    // Ventana parametrizable en dias (default 30), acotada 1..365 para no
    // permitir intervalos arbitrarios.
    var diasSR = parseInt(req.query.dias, 10);
    if (!isFinite(diasSR) || diasSR < 1) diasSR = 30;
    if (diasSR > 365) diasSR = 365;

    // Economia XP -- XP en juego (circulante): SUM(usuarios.xp_total) de las
    // cuentas activas. Depende SOLO de usuarios (siempre existe), por lo que
    // se calcula antes del ledger para que viaje incluso en la degradacion
    // 42P01 de xp_ledger.
    var xpEnJuego = 0;
    var juegoSR = await sql(
      'SELECT COALESCE(SUM(xp_total), 0) AS xp FROM usuarios WHERE activo = true'
    );
    if (juegoSR.length) xpEnJuego = red2(numXp(juegoSR[0].xp));

    var ledgerSR;
    try {
      ledgerSR = await sql(
        'SELECT date_trunc(\'day\', creado_en) AS dia, '
        + 'COALESCE(SUM(xp_final), 0) AS xp, COUNT(*)::int AS eventos '
        + 'FROM xp_ledger '
        + 'WHERE creado_en >= NOW() - ($1::int * INTERVAL \'1 day\') '
        + 'AND es_exento = false GROUP BY 1 ORDER BY 1 DESC',
        [diasSR]
      );
    } catch (eSR) {
      if (eSR && eSR.code === '42P01') {
        console.warn('[admin] salud_red degradado 42P01: xp_ledger no disponible (' + eSR.message + ')');
        return res.status(200).json({
          ok: true, degradado: true, motivo: 'xp_ledger no disponible',
          data: { xp_producido: null, xp_quemado: null, xp_en_juego: xpEnJuego },
        });
      }
      throw eSR;
    }

    // Top acciones por XP entregado.
    var topAcciones = await sql(
      'SELECT accion, COALESCE(SUM(xp_final), 0) AS xp, COUNT(*)::int AS n '
      + 'FROM xp_ledger WHERE es_exento = false '
      + 'GROUP BY 1 ORDER BY 2 DESC LIMIT 20'
    );

    // Usuarios activos (distintos) por dia y en la ventana.
    var activosDia = await sql(
      'SELECT date_trunc(\'day\', creado_en) AS dia, COUNT(DISTINCT usuario_id)::int AS usuarios '
      + 'FROM xp_ledger '
      + 'WHERE creado_en >= NOW() - ($1::int * INTERVAL \'1 day\') '
      + 'AND es_exento = false GROUP BY 1 ORDER BY 1 DESC',
      [diasSR]
    );
    var activosVentana = await sql(
      'SELECT COUNT(DISTINCT usuario_id)::int AS n FROM xp_ledger '
      + 'WHERE creado_en >= NOW() - ($1::int * INTERVAL \'1 day\') '
      + 'AND es_exento = false',
      [diasSR]
    );

    // Tasa de caps por accion (solo filas donde algun cap recorto).
    var capsAccion = await sql(
      'SELECT accion, cap_aplicado, COUNT(*)::int AS n FROM xp_ledger '
      + 'WHERE cap_aplicado <> \'ninguno\' GROUP BY 1, 2 ORDER BY 3 DESC'
    );

    // nivel_max vs nivel DERIVADO de xp_total (misma tabla de umbrales):
    // detecta usuarios cuya insignia quedo protegida por el reescalado.
    // Degrada 42703/42P01 si nivel_max no existiera (031 sin correr).
    var nivelMaxSR = null;
    try {
      var derSR = await sql(
        'WITH d AS (SELECT nivel_max, ' + NIVEL_DERIVADO_SQL + ' AS nivel_derivado '
        + 'FROM usuarios WHERE activo = true) '
        + 'SELECT COUNT(*)::int AS total, '
        + 'COUNT(*) FILTER (WHERE nivel_max > nivel_derivado)::int AS protegidos, '
        + 'COALESCE(MAX(nivel_max - nivel_derivado), 0)::int AS brecha_max FROM d'
      );
      nivelMaxSR = derSR.length ? derSR[0] : { total: 0, protegidos: 0, brecha_max: 0 };
    } catch (eNM) {
      if (esquemaAusente(eNM)) {
        console.warn('[admin] salud_red: nivel_max no disponible ' + eNM.code + ' (' + eNM.message + ')');
        nivelMaxSR = { degradado: true, motivo: 'nivel_max no disponible' };
      } else {
        throw eNM;
      }
    }

    // Distribucion de usuarios por banda de nivel. Las DOS vistas conviven
    // (ADR-053 Decision 5), porque miden cosas distintas:
    //   - derivado: nivel calculado de xp_total con la tabla nueva. Es el que
    //     MANDA para M_nivel y para el castigo economico del de-nivel: gastar
    //     XP puede bajar el multiplicador aunque la insignia se conserve
    //     (ADR-018).
    //   - visible: GREATEST(nivel_derivado, COALESCE(nivel_max,1)). Es la
    //     INSIGNIA que se exhibe; nivel_max solo protege la insignia y NO
    //     neutraliza el castigo economico.
    var distribucionNivel = { derivado: [], visible: [] };
    try {
      var distDerivado = await sql(
        'SELECT ' + NIVEL_DERIVADO_SQL + ' AS nivel, COUNT(*)::int AS usuarios '
        + 'FROM usuarios WHERE activo = true GROUP BY 1 ORDER BY 1'
      );
      distribucionNivel.derivado = distDerivado.map(function (x) {
        x.usuarios = parseInt(x.usuarios, 10) || 0;
        return x;
      });
    } catch (eDer) {
      if (esquemaAusente(eDer)) {
        console.warn('[admin] salud_red: distribucion derivada degradada ' + eDer.code + ' (' + eDer.message + ')');
      } else {
        throw eDer;
      }
    }
    try {
      var distVisible = await sql(
        'SELECT GREATEST(' + NIVEL_DERIVADO_SQL + ', COALESCE(nivel_max, 1)) AS nivel, '
        + 'COUNT(*)::int AS usuarios '
        + 'FROM usuarios WHERE activo = true GROUP BY 1 ORDER BY 1'
      );
      distribucionNivel.visible = distVisible.map(function (x) {
        x.usuarios = parseInt(x.usuarios, 10) || 0;
        return x;
      });
    } catch (eVis) {
      if (esquemaAusente(eVis)) {
        console.warn('[admin] salud_red: distribucion visible degradada ' + eVis.code + ' (' + eVis.message + ')');
      } else {
        throw eVis;
      }
    }

    // Filas EXENTAS (es_exento = true) de la MISMA ventana: misiones, logros,
    // referidos, admin_xp y las restas de compras registradas como exentas.
    // NO pasan por M_nivel ni por caps: se reportan aparte para medir el
    // volumen de XP que queda fuera del sistema de multiplicadores.
    var exentosAccion = await sql(
      'SELECT accion, COALESCE(SUM(xp_final), 0) AS xp, COUNT(*)::int AS n '
      + 'FROM xp_ledger WHERE es_exento = true '
      + 'AND creado_en >= NOW() - ($1::int * INTERVAL \'1 day\') '
      + 'GROUP BY 1 ORDER BY 2 DESC LIMIT 20',
      [diasSR]
    );
    var exentosTotal = await sql(
      'SELECT COALESCE(SUM(xp_final), 0) AS xp, COUNT(*)::int AS eventos '
      + 'FROM xp_ledger WHERE es_exento = true '
      + 'AND creado_en >= NOW() - ($1::int * INTERVAL \'1 day\')',
      [diasSR]
    );

    // Economia XP -- XP producido (acunado) y XP quemado (gastado). Ambos
    // leen xp_ledger: si la migracion 031 no corrio (42P01/42703) degradan a
    // null sin romper el endpoint (patron esquemaAusente). xp_producido suma
    // los eventos positivos; xp_quemado usa el valor ABSOLUTO de los negativos.
    var xpProducido = null;
    var xpQuemado = null;
    try {
      var prodSR = await sql(
        'SELECT COALESCE(SUM(xp_final), 0) AS xp FROM xp_ledger WHERE xp_final > 0'
      );
      var quemSR = await sql(
        'SELECT COALESCE(-SUM(xp_final), 0) AS xp FROM xp_ledger WHERE xp_final < 0'
      );
      xpProducido = prodSR.length ? red2(numXp(prodSR[0].xp)) : 0;
      xpQuemado = quemSR.length ? red2(numXp(quemSR[0].xp)) : 0;
    } catch (eEco) {
      if (!esquemaAusente(eEco)) throw eEco;
      console.warn('[admin] salud_red: economia xp degradada ' + eEco.code + ' (' + eEco.message + ')');
    }

    // Normalizacion (numeric llega string; bigint tambien).
    var xpTotalEntregado = 0;
    var porDia = ledgerSR.map(function (d) {
      d.xp = red2(numXp(d.xp));
      d.eventos = parseInt(d.eventos, 10) || 0;
      xpTotalEntregado = red2(xpTotalEntregado + d.xp);
      return d;
    });
    var capsPorAccion = capsAccion.map(function (c) {
      c.n = parseInt(c.n, 10) || 0;
      return c;
    });
    var capTopAccion = {};
    capsPorAccion.forEach(function (c) {
      if (!capTopAccion[c.accion] || c.n > capTopAccion[c.accion].n) capTopAccion[c.accion] = c;
    });
    var porAccion = topAcciones.map(function (a) {
      var capTop = capTopAccion[a.accion];
      return {
        accion: a.accion,
        xp_entregado: red2(numXp(a.xp)),
        eventos: parseInt(a.n, 10) || 0,
        cap_aplicado_top: capTop ? capTop.cap_aplicado : null,
      };
    });
    var capsProgresion = 0;
    var capsGlobal = 0;
    capsPorAccion.forEach(function (c) {
      if (c.cap_aplicado === 'progresion') capsProgresion += c.n;
      if (c.cap_aplicado === 'global') capsGlobal += c.n;
    });
    var exentosPorAccion = exentosAccion.map(function (a) {
      return {
        accion: a.accion,
        xp_entregado: red2(numXp(a.xp)),
        eventos: parseInt(a.n, 10) || 0,
      };
    });
    var exentosVentana = exentosTotal.length
      ? { xp_entregado: red2(numXp(exentosTotal[0].xp)), eventos: parseInt(exentosTotal[0].eventos, 10) || 0 }
      : { xp_entregado: 0, eventos: 0 };
    var alertas = [];
    if (nivelMaxSR && nivelMaxSR.degradado) {
      alertas.push({ tipo: 'nivel_max_degradado', detalle: String(nivelMaxSR.motivo) });
    } else if (nivelMaxSR && nivelMaxSR.protegidos > 0) {
      alertas.push({
        tipo: 'nivel_max_protegido',
        detalle: nivelMaxSR.protegidos + ' usuario(s) conservan una insignia mayor al nivel derivado de su xp_total (brecha max ' + nivelMaxSR.brecha_max + ')',
      });
    }

    // == ORIGEN Y LEJANIA (ADR-058, migracion 038) =======================
    // Bloque ADITIVO. Todas las consultas dependen de xp_ledger.mult_origen/
    // origen_tier (038); si la 038 no corrio, cada una degrada a valor vacio
    // con console.warn (patron BUG-021) y el resto del payload queda intacto.
    // Sin SELECT *: cada consulta lista sus columnas explicitamente.
    var distribucionOrigen = [];
    var multOrigenStats = {
      filas: 0, promedio: 0, minimo: 0, maximo: 0,
      con_bonificacion: 0, top_outliers: [],
    };
    var configOrigen = [];
    var alertasOrigen = [];

    // (1) Distribucion por tier en la ventana: filas y XP entregado.
    try {
      var distOrigenSR = await sql(
        'SELECT COALESCE(origen_tier, \'sin_tier\') AS tier, '
        + 'COUNT(*)::int AS eventos, COALESCE(SUM(xp_final), 0) AS xp '
        + 'FROM xp_ledger WHERE es_exento = false '
        + 'AND creado_en >= NOW() - ($1::int * INTERVAL \'1 day\') '
        + 'GROUP BY 1 ORDER BY 3 DESC',
        [diasSR]
      );
      distribucionOrigen = distOrigenSR.map(function (o) {
        return {
          tier: o.tier || 'sin_tier',
          eventos: parseInt(o.eventos, 10) || 0,
          xp: red2(numXp(o.xp)),
        };
      });
    } catch (eDO) {
      if (!esquemaAusente(eDO)) throw eDO;
      console.warn('[admin] salud_red: distribucion_origen degradada ' + eDO.code + ' (' + eDO.message + ')');
    }

    // (2) Estadistica de mult_origen + top outliers (XP con mult > 1.2).
    try {
      var multSR = await sql(
        'SELECT COUNT(*)::int AS filas, '
        + 'COALESCE(AVG(mult_origen), 0) AS promedio, '
        + 'COALESCE(MIN(mult_origen), 0) AS minimo, '
        + 'COALESCE(MAX(mult_origen), 0) AS maximo, '
        + 'COUNT(*) FILTER (WHERE mult_origen > 1)::int AS con_bonificacion '
        + 'FROM xp_ledger WHERE es_exento = false '
        + 'AND creado_en >= NOW() - ($1::int * INTERVAL \'1 day\')',
        [diasSR]
      );
      var mSR = multSR.length ? multSR[0] : {};
      multOrigenStats = {
        filas: parseInt(mSR.filas, 10) || 0,
        promedio: Math.round(numXp(mSR.promedio) * 1000000) / 1000000,
        minimo: Math.round(numXp(mSR.minimo) * 1000000) / 1000000,
        maximo: Math.round(numXp(mSR.maximo) * 1000000) / 1000000,
        con_bonificacion: parseInt(mSR.con_bonificacion, 10) || 0,
        top_outliers: [],
      };
      var outSR = await sql(
        'SELECT l.usuario_id, u.nombre, u.email, u.pais_base, u.ciudad_base, '
        + 'COALESCE(SUM(l.xp_final), 0) AS xp, '
        + 'COALESCE(MAX(l.mult_origen), 0) AS mult_max, '
        + 'MAX(l.origen_tier) AS tier, '
        + 'ROUND(EXTRACT(EPOCH FROM (NOW() - u.creado_en)) / 86400)::int AS dias_cuenta, '
        + 'COUNT(*)::int AS eventos '
        + 'FROM xp_ledger l LEFT JOIN usuarios u ON u.id = l.usuario_id '
        + 'WHERE l.es_exento = false AND l.mult_origen > $2::numeric '
        + 'AND l.creado_en >= NOW() - ($1::int * INTERVAL \'1 day\') '
        + 'GROUP BY 1, 2, 3, 4, 5, u.creado_en ORDER BY 6 DESC LIMIT 20',
        [diasSR, ORIGEN_OUTLIER_MULT]
      );
      multOrigenStats.top_outliers = outSR.map(function (o) {
        return {
          usuario_id: o.usuario_id,
          nombre: o.nombre || '(sin nombre)',
          email: o.email || '',
          pais_base: o.pais_base || null,
          ciudad_base: o.ciudad_base || null,
          xp: red2(numXp(o.xp)),
          mult_max: Math.round(numXp(o.mult_max) * 1000000) / 1000000,
          tier: o.tier || null,
          dias_cuenta: parseInt(o.dias_cuenta, 10) || 0,
          eventos: parseInt(o.eventos, 10) || 0,
        };
      });
    } catch (eMO) {
      if (!esquemaAusente(eMO)) throw eMO;
      console.warn('[admin] salud_red: mult_origen_stats degradada ' + eMO.code + ' (' + eMO.message + ')');
    }

    // (3) Config de origen: las 7 claves de gamificacion_config (038). Solo
    // lectura (el panel aun no edita gamificacion_config). Si la 038 no corrio,
    // la tabla 031 existe pero las claves faltan -> lista vacia (sin error).
    try {
      var cfgOrSR = await sql(
        'SELECT clave, valor, descripcion FROM gamificacion_config '
        + 'WHERE clave = ANY($1::text[]) ORDER BY clave',
        [ORIGEN_CONFIG_CLAVES]
      );
      configOrigen = cfgOrSR.map(function (k) {
        return {
          clave: k.clave,
          valor: numXp(k.valor),
          descripcion: k.descripcion || '',
        };
      });
    } catch (eCO) {
      if (!esquemaAusente(eCO)) throw eCO;
      console.warn('[admin] salud_red: config_origen degradada ' + eCO.code + ' (' + eCO.message + ')');
    }

    // (4) Alertas anti-gaming de origen.
    // (4.a) Concentracion anomala de XP bonificado en un mismo origen.
    try {
      var concSR = await sql(
        'SELECT COALESCE(NULLIF(TRIM(u.ciudad_base), \'\'), \'?\') AS ciudad, '
        + 'COALESCE(NULLIF(TRIM(u.pais_base), \'\'), \'?\') AS pais, '
        + 'COALESCE(SUM(l.xp_final), 0) AS xp '
        + 'FROM xp_ledger l JOIN usuarios u ON u.id = l.usuario_id '
        + 'WHERE l.es_exento = false AND l.mult_origen > 1 '
        + 'AND l.creado_en >= NOW() - ($1::int * INTERVAL \'1 day\') '
        + 'GROUP BY 1, 2 ORDER BY 3 DESC',
        [diasSR]
      );
      // Piso de CUENTAS (v7): cuenta las cuentas distintas con mult_origen >
      // ORIGEN_OUTLIER_MULT (1.2) en la ventana. Con menos de
      // ORIGEN_CONCENTRACION_MIN_CUENTAS (3) NO se alerta: una concentracion
      // alta con 1-2 usuarios es el caso normal, no gaming.
      var cuentasOrSR = await sql(
        'SELECT COUNT(DISTINCT usuario_id)::int AS n FROM xp_ledger '
        + 'WHERE es_exento = false AND mult_origen > $2::numeric '
        + 'AND creado_en >= NOW() - ($1::int * INTERVAL \'1 day\')',
        [diasSR, ORIGEN_OUTLIER_MULT]
      );
      var cuentasBon = cuentasOrSR.length ? (parseInt(cuentasOrSR[0].n, 10) || 0) : 0;
      var totalBon = 0;
      concSR.forEach(function (r) { totalBon += numXp(r.xp); });
      totalBon = red2(totalBon);
      if (totalBon >= ORIGEN_CONCENTRACION_MIN_XP && concSR.length
        && cuentasBon >= ORIGEN_CONCENTRACION_MIN_CUENTAS) {
        var topOr = concSR[0];
        var topOrXp = red2(numXp(topOr.xp));
        var pctOr = totalBon > 0 ? Math.round(topOrXp / totalBon * 1000) / 10 : 0;
        if (pctOr >= ORIGEN_CONCENTRACION_PCT) {
          alertasOrigen.push({
            tipo: 'origen_concentrado',
            detalle: 'El origen ' + (topOr.ciudad || '?') + ' / ' + (topOr.pais || '?')
              + ' concentra ' + pctOr + '% del XP bonificado por origen ('
              + topOrXp + ' de ' + totalBon + ' XP, ' + cuentasBon + ' cuentas) en la ventana.',
          });
        }
      }
    } catch (eAO1) {
      if (!esquemaAusente(eAO1)) throw eAO1;
      console.warn('[admin] salud_red: alerta concentracion origen degradada ' + eAO1.code + ' (' + eAO1.message + ')');
    }

    // (4.b) Cuentas extranjeras nuevas con mult_origen alto (revision manual).
    try {
      var extSR = await sql(
        'SELECT l.usuario_id, u.nombre, u.pais_base, u.ciudad_base, '
        + 'COALESCE(MAX(l.mult_origen), 0) AS mult_max, '
        + 'COALESCE(SUM(l.xp_final), 0) AS xp, '
        + 'ROUND(EXTRACT(EPOCH FROM (NOW() - u.creado_en)) / 86400)::int AS dias_cuenta '
        + 'FROM xp_ledger l JOIN usuarios u ON u.id = l.usuario_id '
        + 'WHERE l.es_exento = false AND l.mult_origen > $2::numeric '
        + 'AND u.pais_base IS NOT NULL AND UPPER(TRIM(u.pais_base)) <> \'CO\' '
        + 'AND u.creado_en >= NOW() - ($3::int * INTERVAL \'1 day\') '
        + 'AND l.creado_en >= NOW() - ($1::int * INTERVAL \'1 day\') '
        + 'GROUP BY 1, 2, 3, 4, u.creado_en ORDER BY 5 DESC LIMIT 20',
        [diasSR, ORIGEN_OUTLIER_MULT, ORIGEN_CUENTA_NUEVA_DIAS]
      );
      extSR.forEach(function (r) {
        alertasOrigen.push({
          tipo: 'extranjero_nuevo',
          usuario_id: r.usuario_id,
          detalle: (r.nombre || '(sin nombre)') + ' (' + (r.pais_base || '?') + ')'
            + ' tiene mult_origen ' + (Math.round(numXp(r.mult_max) * 1000) / 1000)
            + ' con ' + (parseInt(r.dias_cuenta, 10) || 0) + ' dias de cuenta.',
        });
      });
    } catch (eAO2) {
      if (!esquemaAusente(eAO2)) throw eAO2;
      console.warn('[admin] salud_red: alerta extranjero nuevo degradada ' + eAO2.code + ' (' + eAO2.message + ')');
    }

    // == v8 (Gaming v6.1, ADR-062/063/064/065; migraciones 040/041) ======
    // Bloques ADITIVOS de cartas, moneda, gobernanza y Own the Spot. Cada
    // bloque se calcula en su propio try/catch: si su tabla/columna no
    // existe (42P01/42703) o cualquier consulta falla, se registra un
    // console.warn y el bloque se OMITE del payload (queda undefined y JSON
    // lo descarta). El payload historico y los bloques de ADR-058 quedan
    // INTACTOS (patron BUG-021: degradar, nunca tumbar salud_red). Sin
    // SELECT *: cada consulta lista sus columnas explicitamente.
    var bloquesGaming = {};

    // (1) CARTAS: gates consumidos por nivel, circulacion y ofertas vivas.
    try {
      var gatesCartas = await sql(
        'SELECT nivel_gate, COUNT(*)::int AS usuarios FROM cartas_gates '
        + 'GROUP BY 1 ORDER BY 1'
      );
      var circulaCartas = await sql(
        'SELECT COALESCE(SUM(cantidad), 0)::int AS n FROM usuarios_cartas WHERE activo = true'
      );
      var ofertasCartas = await sql(
        'SELECT COUNT(*)::int AS n FROM cartas_ofertas '
        + 'WHERE activo = true AND estado IN (\'abierta\',\'parcial\')'
      );
      bloquesGaming.cartas = {
        gates_por_nivel: gatesCartas.map(function (g) {
          return { nivel_gate: parseInt(g.nivel_gate, 10) || 0, usuarios: parseInt(g.usuarios, 10) || 0 };
        }),
        cartas_en_circulacion: circulaCartas.length ? (parseInt(circulaCartas[0].n, 10) || 0) : 0,
        ofertas_abiertas: ofertasCartas.length ? (parseInt(ofertasCartas[0].n, 10) || 0) : 0,
      };
    } catch (eCartas) {
      console.warn('[admin] salud_red: bloque cartas omitido ' + (eCartas && eCartas.code) + ' (' + (eCartas && eCartas.message) + ')');
    }

    // (2) MONEDA "Condor" (CDR): emision total, circulacion y ordenes vivas.
    // circulacion = SUM(delta) del ledger append-only (fuente de verdad del
    // saldo, ADR-061); emision_total acota los lotes no inflacionarios.
    try {
      var emisionMon = await sql('SELECT COALESCE(SUM(cantidad), 0) AS n FROM moneda_emisiones');
      var circulaMon = await sql('SELECT COALESCE(SUM(delta), 0) AS n FROM moneda_ledger');
      var ordenesMon = await sql(
        'SELECT COUNT(*)::int AS n FROM moneda_mercado '
        + 'WHERE activo = true AND estado IN (\'abierta\',\'parcial\')'
      );
      bloquesGaming.moneda = {
        emision_total: emisionMon.length ? red2(numXp(emisionMon[0].n)) : 0,
        circulacion: circulaMon.length ? red2(numXp(circulaMon[0].n)) : 0,
        ordenes_abiertas: ordenesMon.length ? (parseInt(ordenesMon[0].n, 10) || 0) : 0,
      };
    } catch (eMoneda) {
      console.warn('[admin] salud_red: bloque moneda omitido ' + (eMoneda && eMoneda.code) + ' (' + (eMoneda && eMoneda.message) + ')');
    }

    // (3) GOBERNANZA: propuestas por capa/estado + votos vigentes.
    try {
      var propGob = await sql(
        'SELECT capa, estado, COUNT(*)::int AS n FROM gobernanza_propuestas '
        + 'GROUP BY 1, 2 ORDER BY 1, 2'
      );
      var votosGob = await sql('SELECT COUNT(*)::int AS n FROM gobernanza_votos WHERE activo = true');
      bloquesGaming.gobernanza = {
        propuestas_por_capa_estado: propGob.map(function (g) {
          return { capa: g.capa, estado: g.estado, n: parseInt(g.n, 10) || 0 };
        }),
        votos_totales: votosGob.length ? (parseInt(votosGob[0].n, 10) || 0) : 0,
      };
    } catch (eGob) {
      console.warn('[admin] salud_red: bloque gobernanza omitido ' + (eGob && eGob.code) + ' (' + (eGob && eGob.message) + ')');
    }

    // (4) OWN THE SPOT: dividendos pagados (monto_descontado) y duenos por
    // tipo de medio (spot_duenos.activo = cache vigente, ADR-065).
    try {
      var divSpot = await sql('SELECT COALESCE(SUM(monto_descontado), 0) AS n FROM spot_dividendos');
      var duenosSpot = await sql(
        'SELECT tipo_medio, COUNT(*)::int AS duenos FROM spot_duenos '
        + 'WHERE activo = true GROUP BY 1 ORDER BY 2 DESC'
      );
      bloquesGaming.own_spot = {
        dividendos_pagados: divSpot.length ? red2(numXp(divSpot[0].n)) : 0,
        duenos_por_tipo: duenosSpot.map(function (g) {
          return { tipo_medio: g.tipo_medio, duenos: parseInt(g.duenos, 10) || 0 };
        }),
      };
    } catch (eSpot) {
      console.warn('[admin] salud_red: bloque own_spot omitido ' + (eSpot && eSpot.code) + ' (' + (eSpot && eSpot.message) + ')');
    }

    return res.status(200).json({
      ok: true,
      data: {
        ventana_dias: diasSR,
        xp_total_entregado: xpTotalEntregado,
        xp_producido: xpProducido,
        xp_quemado: xpQuemado,
        xp_en_juego: xpEnJuego,
        por_dia: porDia,
        por_accion: porAccion,
        usuarios_activos: activosVentana.length ? (parseInt(activosVentana[0].n, 10) || 0) : 0,
        usuarios_activos_por_dia: activosDia.map(function (d) {
          d.usuarios = parseInt(d.usuarios, 10) || 0;
          return d;
        }),
        caps_por_accion: capsPorAccion,
        caps: { cap_progresion_veces: capsProgresion, cap_global_veces: capsGlobal },
        distribucion_nivel: distribucionNivel,
        exentos: {
          xp_total_entregado: exentosVentana.xp_entregado,
          eventos: exentosVentana.eventos,
          por_accion: exentosPorAccion,
        },
        nivel_max_vs_derivado: nivelMaxSR,
        alertas: alertas,
        // ADR-058 (migracion 038): bloques ADITIVOS de origen y lejania.
        distribucion_origen: distribucionOrigen,
        mult_origen_stats: multOrigenStats,
        config_origen: configOrigen,
        alertas_origen: alertasOrigen,
        // v8 (Gaming v6.1): ADITIVOS; presentes solo si su tabla existe.
        cartas: bloquesGaming.cartas,
        moneda: bloquesGaming.moneda,
        gobernanza: bloquesGaming.gobernanza,
        own_spot: bloquesGaming.own_spot,
      },
    });
  }

  // == GAMIFICACION_CONFIG (editor admin de la curva de origen - ADR-058) ==
  // Rama NUEVA POST ?recurso=gamificacion_config (v7). Reusa auth() del
  // archivo (mismo gate Bearer que salud_red); NO inventa un mecanismo de
  // auth nuevo. Escritura idempotente sobre la tabla clave/valor de la 031:
  //   INSERT ... ON CONFLICT (clave) DO UPDATE SET valor=EXCLUDED.valor
  // (re-ejecutar con el mismo body es no-op funcional). Solo se escriben las
  // 7 claves de ORIGEN_CONFIG_SPEC (whitelist): cualquier clave extra del body
  // se ignora y los valores van SIEMPRE parametrizados ($n), nunca
  // interpolados (anti-inyeccion). Validacion estricta de rango + coherencia
  // Local <= Nomada <= Extranjero -> 400 con mensaje claro. Degradacion
  // controlada 503 SCHEMA_NOT_MIGRATED si gamificacion_config no existe
  // (42P01) o le falta una columna (42703); nunca 500 ciego ni catch vacio
  // (patron BUG-021). Sin SELECT *: se listan las columnas.
  if (recurso === 'gamificacion_config') {
    if (!auth(req)) return res.status(401).json({ ok:false, error:'No autorizado' });
    if (req.method !== 'POST') return res.status(405).end();

    try {
      // 1) Whitelist + validacion de rango. Se exigen las 7 claves.
      var valoresGC = {};
      var faltanGC = [];
      for (var iGC = 0; iGC < ORIGEN_CONFIG_SPEC.length; iGC++) {
        var specGC = ORIGEN_CONFIG_SPEC[iGC];
        var rawGC = body[specGC.clave];
        if (rawGC === undefined || rawGC === null || String(rawGC).trim() === '') {
          faltanGC.push(specGC.clave);
          continue;
        }
        // numeric acepta punto o coma (ADR-035); se normaliza a punto.
        var vGC = parseFloat(String(rawGC).replace(',', '.'));
        if (!isFinite(vGC)) {
          return res.status(400).json({ ok:false, error:'VALOR_INVALIDO',
            detalle:'La clave ' + specGC.clave + ' debe ser numerica.' });
        }
        if (vGC < specGC.min || vGC > specGC.max) {
          return res.status(400).json({ ok:false, error:'FUERA_DE_RANGO',
            detalle:specGC.clave + ' debe estar entre ' + specGC.min + ' y ' + specGC.max + '.' });
        }
        valoresGC[specGC.clave] = vGC;
      }
      if (faltanGC.length) {
        return res.status(400).json({ ok:false, error:'FALTAN_CLAVES',
          detalle:'Faltan claves obligatorias: ' + faltanGC.join(', ') + '.' });
      }
      if (valoresGC.factor_origen_local > valoresGC.factor_origen_nomada_max
        || valoresGC.factor_origen_nomada_max > valoresGC.factor_origen_extranjero_max) {
        return res.status(400).json({ ok:false, error:'COHERENCIA_INVALIDA',
          detalle:'Debe cumplirse factor_origen_local <= factor_origen_nomada_max <= factor_origen_extranjero_max.' });
      }

      // 2) Upsert idempotente del VALOR en UNA sentencia (7 filas
      // parametrizadas): INSERT ... ON CONFLICT (clave) DO UPDATE SET
      // valor=EXCLUDED.valor. En una fila NUEVA, descripcion toma el DEFAULT ''
      // de la columna; en una fila EXISTENTE no se toca aqui (la descripcion
      // solo se actualiza si el body la trae, paso 3).
      var valsGC = []; var paramsGC = []; var piGC = 1;
      ORIGEN_CONFIG_SPEC.forEach(function (spec) {
        valsGC.push('($' + piGC++ + ', $' + piGC++ + ')');
        paramsGC.push(spec.clave, red4(valoresGC[spec.clave]));
      });
      await sql(
        'INSERT INTO gamificacion_config (clave, valor) VALUES '
        + valsGC.join(', ')
        + ' ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor, '
        + 'actualizado_en = NOW()',
        paramsGC
      );

      // 3) Descripcion OPCIONAL por clave: body.descripciones = {clave: texto}.
      // Solo se actualiza la descripcion de las claves que el body traiga; el
      // resto conserva la suya.
      var descGC = (body.descripciones && typeof body.descripciones === 'object') ? body.descripciones : {};
      for (var iD = 0; iD < ORIGEN_CONFIG_SPEC.length; iD++) {
        var claveD = ORIGEN_CONFIG_SPEC[iD].clave;
        if (claveD in descGC) {
          await sql(
            'UPDATE gamificacion_config SET descripcion=$1, actualizado_en=NOW() WHERE clave=$2',
            [String(descGC[claveD] == null ? '' : descGC[claveD]).trim(), claveD]
          );
        }
      }

      // 4) Devolver la config actualizada (mismo shape que config_origen).
      var rowsGC = await sql(
        'SELECT clave, valor, descripcion FROM gamificacion_config '
        + 'WHERE clave = ANY($1::text[]) ORDER BY clave',
        [ORIGEN_CONFIG_CLAVES]
      );
      var dataGC = rowsGC.map(function (k) {
        return { clave: k.clave, valor: numXp(k.valor), descripcion: k.descripcion || '' };
      });
      return res.status(200).json({ ok:true, data:dataGC, mensaje:'Config de origen actualizada' });
    } catch (eGC) {
      if (esquemaAusente(eGC)) {
        console.warn('[admin] gamificacion_config: esquema ausente ' + eGC.code + ' (' + eGC.message + ')');
        return res.status(503).json({
          ok:false, error:'SCHEMA_NOT_MIGRATED',
          detalle:'Aplica db/migrations/031_gamificacion_v6_nivel_scaling.sql en Neon antes de editar la config de origen.',
        });
      }
      console.warn('[admin] gamificacion_config: error al guardar (' + (eGC && eGC.code) + '): ' + (eGC && eGC.message));
      return res.status(500).json({ ok:false, error:'Error interno' });
    }
  }

  // == Sin recurso reconocido =============================================
  return res.status(400).json({
    ok: false,
    error: 'recurso inv\u00e1lido. Usa ?recurso=solicitudes|resenas|destacado|notificaciones|consumibles|activos_ocultos|salud_red|mercado|gamificacion_config|cartas|gobernanza|marcas_spots',
  });
};
