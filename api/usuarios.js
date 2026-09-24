// api/usuarios.js -- Vercel Serverless Function (ASCII-safe: 0 backticks, 0 no-ASCII)
// v21 (2026-09-23): el perfil (GET ?id=) expone mercado_puntos (aditivo,
// owner-aware y publico) y deriva mercado_nodo desde MERCADO_TIERS
// (catalogo duplicado a proposito: prohibido el import entre funciones
// serverless, misma escala de 5 tiers que el Arbol de Clases). Requiere la
// migracion 034; sin ella mercado_puntos cae a 0 sin romper. NO toca tags ni
// crea endpoints (8/8, ADR-001/ADR-010).
// v22 (2026-09-24): ADR-058 (Multiplicador de Origen por lejania). El perfil
// (GET ?id= y POST perfil_actualizar/perfil_editar) expone un objeto aditivo
// 'origen' (ciudad_base/pais_base/origen_declarado_en/elegible/tier_base/
// es_extranjero_verificado/dias_origen_declarado/min_dias_cuenta). ANTI-
// TELEPORT: cuando ciudad_base o pais_base CAMBIAN respecto al valor previo,
// el mismo UPDATE fija origen_declarado_en=NOW() (comparacion normalizada con
// trim; un no-op NO lo toca). Requiere la migracion 038; la lectura de
// gamificacion_config degrada con warn. NO toca tags ni crea endpoints.
// v23 (2026-09-24): rama GET ?tipo=ref_info - consulta publica suave (sin
// JWT ni sesion) que dado un codigo de referido (?ref= o ?codigo=) devuelve
// SOLO el nombre publico del anfitrion (SELECT nombre FROM usuarios WHERE
// codigo_referido=$1 LIMIT 1, trim + slice(0,80)); sin email, sin avatar,
// sin XP ni ids internos. Codigo inexistente o vacio -> 200 con
// REFERIDO_INVALIDO (consulta publica suave, no 404). No es endpoint nuevo
// (8/8, ADR-001/ADR-010) y no toca tags ni persistencias.
// v20 (RELEASE 2026-09-23): NIVELES se expande de 20 a 40 umbrales (techo
// 100000) con 40 titulos y 5 Eras (Caminante 1-10 / Explorador 11-20 /
// Cronista 21-30 / Leyenda 31-35 / Mito 36-40); calcularEra con cortes
// 10/20/30/35; M_nivel pasa a ((N-1)/39)*2; instrumenta los 3 debitos de XP
// (faccion/casa/clase) en xp_ledger con registrarGastoXp (best-effort).
// v19 (ADR-053 / Enmienda 1, 2026-09-21): NIVELES pasa a ser la fuente
// SERVIDOR de los 20 umbrales nuevos (techo 42000) + campo mult (M_nivel);
// conNivel expone nivel_visible = GREATEST(nivel derivado, nivel_max) y
// agrega nivel_max a la respuesta (nivel/badge_actual siguen DERIVADOS y
// NUNCA persistidos); repricing de elecciones en constantes unicas
// (faccion 500->800, Casa 300->500, Clase 300->500). NO toca tags ni crea
// endpoints (8/8, ADR-001).
// v18 (TSK-118 hotfix: throttle 60s del refresco de lider en casa_ranking)
// v17 (migracion 026: casa_ranking expone lider_user_id + tributo_pct con degradacion; refresco best-effort del lider por Casa)
// v16 (TSK-112 / ADR-038: casas_cofre + factor de nivelacion; clase_elegir y clases Rising Star)
const { neon } = require('@neondatabase/serverless');
var crypto = require('crypto');

// FUENTE SERVIDOR de los 40 umbrales de nivel (RELEASE 2026-09-23, techo
// 100000). Los espejos cliente (index.html, comunidad.html, niveles-data.js,
// usuario-session.js y admin.html: _jugNiveles) y el espejo servidor
// NIVELES_LOCAL de api/interacciones.js se validan con
// scripts/smoke_niveles_espejos.js (no hay require cruzado entre funciones
// serverless). 40 niveles en 5 Eras (Caminante 1-10 / Explorador 11-20 /
// Cronista 21-30 / Leyenda 31-35 / Mito 36-40).
// El campo mult es M_nivel(N) = 1 + ((N-1)/39)*2, redondeado a 3 decimales
// (1.000 en N1 .. 3.000 en N40). Es la tabla INFORMATIVA del backend:
// usuarios.js solo expone niveles; el calculo de multiplicadores vive en el
// punto unico de api/interacciones.js.
// nivel/badge_actual existian como columnas en usuarios pero
// interacciones.js nunca las escribia -- se calculan aqui en cada
// lectura a partir de xp_total en vez de guardarse, para que nunca
// puedan desincronizarse sin tener que coordinar una escritura extra en
// cada uno de los puntos de api/interacciones.js que suman XP.
// ADR-053: el titulo 11 se corrigio de 'Estrat\u00e9ga' a 'Estratega'
// (errata de la fuente original); los 8 espejos deben copiar esta grafia.
const NIVELES = [
  { min: 0,      mult: 1.000, nombre: 'Caminante Novato' },
  { min: 150,    mult: 1.051, nombre: 'Rastreador Local' },
  { min: 500,    mult: 1.103, nombre: 'Explorador Urbano' },
  { min: 1000,   mult: 1.154, nombre: 'Aventurero Regional' },
  { min: 1650,   mult: 1.205, nombre: 'Vanguardia Territorial' },
  { min: 2500,   mult: 1.256, nombre: 'Embajador de Zona' },
  { min: 3450,   mult: 1.308, nombre: 'Fot\u00f3grafo de Ruta' },
  { min: 4550,   mult: 1.359, nombre: 'Cronista de Historias' },
  { min: 5800,   mult: 1.410, nombre: 'Buscador de Leyendas' },
  { min: 7150,   mult: 1.462, nombre: 'Gu\u00eda de Fronteras' },
  { min: 8650,   mult: 1.513, nombre: 'Estratega Comunitario' },
  { min: 10250,  mult: 1.564, nombre: 'Documentalista Visual' },
  { min: 12000,  mult: 1.615, nombre: 'Se\u00f1or del Spot' },
  { min: 13850,  mult: 1.667, nombre: 'Cart\u00f3grafo de Cine' },
  { min: 15800,  mult: 1.718, nombre: 'Protector del Patrimonio' },
  { min: 17900,  mult: 1.769, nombre: 'Curador de Colombia' },
  { min: 20100,  mult: 1.821, nombre: 'Mariscal de Parche' },
  { min: 22450,  mult: 1.872, nombre: 'Cineasta de Territorio' },
  { min: 24850,  mult: 1.923, nombre: 'Inmortal del Mapa' },
  { min: 27400,  mult: 1.974, nombre: 'Gran Maestro ExploraCO' },
  { min: 30050,  mult: 2.026, nombre: 'Tejedor de Rutas' },
  { min: 32800,  mult: 2.077, nombre: 'Cronista de Regiones' },
  { min: 35700,  mult: 2.128, nombre: 'Curador de Relatos' },
  { min: 38650,  mult: 2.179, nombre: 'Guardi\u00e1n de Tradiciones' },
  { min: 41750,  mult: 2.231, nombre: 'Arquitecto de Itinerarios' },
  { min: 44900,  mult: 2.282, nombre: 'Maestro de Ceremonias' },
  { min: 48200,  mult: 2.333, nombre: 'Cronista Mayor' },
  { min: 51600,  mult: 2.385, nombre: 'Embajador Cultural' },
  { min: 55050,  mult: 2.436, nombre: 'Historiador de Territorio' },
  { min: 58700,  mult: 2.487, nombre: 'Sabio de los Caminos' },
  { min: 62400,  mult: 2.538, nombre: 'Leyenda Emergente' },
  { min: 66150,  mult: 2.590, nombre: 'Forjador de Leyendas' },
  { min: 70050,  mult: 2.641, nombre: 'H\u00e9roe del Mapa' },
  { min: 74050,  mult: 2.692, nombre: 'Tit\u00e1n de las Rutas' },
  { min: 78150,  mult: 2.744, nombre: 'Leyenda Viva' },
  { min: 82300,  mult: 2.795, nombre: 'Mito Naciente' },
  { min: 86600,  mult: 2.846, nombre: 'Semidi\u00f3s del Viaje' },
  { min: 90950,  mult: 2.897, nombre: 'Guardi\u00e1n Ancestral' },
  { min: 95450,  mult: 2.949, nombre: 'Esp\u00edritu del Territorio' },
  { min: 100000, mult: 3.000, nombre: 'Mito Eterno ExploraCO' },
];

// XP decimal (ADR-035): las columnas XP son numeric(12,2). Neon entrega
// numeric como STRING, asi que todo valor XP se normaliza a Number en el
// borde y se redondea half-up a 2 decimales con un unico helper.
function red2(v) { return Math.round((Number(v) || 0) * 100) / 100; }
function numXp(v) { var n = Number(v); return isFinite(n) ? n : 0; }

// ADR-058 (Multiplicador de Origen por lejania): el perfil expone un objeto
// aditivo 'origen' con la BASE de elegibilidad. NO calcula el multiplicador
// concreto (depende del punto geografico y vive en api/interacciones.js).
// Esta funcion es PURA: recibe la fila del usuario y el minimo de dias leido
// de gamificacion_config.
//   elegible: tiene ciudad_base o pais_base declarados (no vacios).
//   tier_base: 'extranjero' (pais_base != 'CO') | 'co' (pais vacio/CO CON
//     ciudad_base) | null (no elegible o solo pais 'CO' sin ciudad).
//   es_extranjero_verificado: pais_base != 'CO' AND email_verificado.
//   dias_origen_declarado: dias completos desde origen_declarado_en (null sin
//     declaracion).
function normTrimOrigen(v) {
  if (v == null) return '';
  return String(v).trim();
}
function construirOrigenUsuario(row, minDiasCuenta) {
  var minDias = numXp(minDiasCuenta);
  if (!isFinite(minDias) || minDias < 0) minDias = 7;
  var ciudad = normTrimOrigen(row && row.ciudad_base);
  var pais = normTrimOrigen(row && row.pais_base).toUpperCase();
  var origenEn = (row && row.origen_declarado_en) ? row.origen_declarado_en : null;
  ciudad = ciudad || null;
  pais = pais || null;
  var elegible = !!(ciudad || pais);
  var esExtranjero = !!(pais && pais !== 'CO');
  var tierBase = null;
  if (elegible) {
    if (esExtranjero) tierBase = 'extranjero';
    else if (ciudad) tierBase = 'co';
  }
  var diasDecl = null;
  if (origenEn) {
    var msDecl = (origenEn instanceof Date) ? origenEn.getTime() : Date.parse(String(origenEn));
    if (isFinite(msDecl)) {
      var difDias = (Date.now() - msDecl) / 86400000;
      diasDecl = difDias > 0 ? Math.floor(difDias) : 0;
    }
  }
  return {
    ciudad_base: ciudad,
    pais_base: pais,
    origen_declarado_en: origenEn,
    elegible: elegible,
    tier_base: tierBase,
    es_extranjero_verificado: !!(esExtranjero && row && row.email_verificado === true),
    dias_origen_declarado: diasDecl,
    min_dias_cuenta: minDias
  };
}

// ADR-058: lee origen_min_dias_cuenta de gamificacion_config con fallback 7.
// DEGRADA sin lanzar si la tabla/clave no existe (patron BUG-021): warn y
// fallback; el perfil NUNCA se cae por esta lectura. Espejo del fallback de
// api/interacciones.js (no hay require cruzado entre funciones serverless).
async function leerMinDiasOrigen(sql) {
  try {
    var rows = await sql("SELECT valor FROM gamificacion_config WHERE clave='origen_min_dias_cuenta' LIMIT 1");
    var v = (rows && rows.length) ? numXp(rows[0].valor) : 0;
    if (isFinite(v) && v > 0) return v;
  } catch (eCfgOrigen) {
    var code = eCfgOrigen && eCfgOrigen.code;
    console.warn('[origen] gamificacion_config no leida (' + code + '): min_dias_cuenta por defecto 7');
  }
  return 7;
}

function calcularNivel(xpTotal) {
  const xp = Number(xpTotal) || 0;
  let nivelIdx = 0;
  for (let i = 0; i < NIVELES.length; i++) {
    if (xp >= NIVELES[i].min) nivelIdx = i;
  }
  return { nivel: nivelIdx + 1, badge_actual: NIVELES[nivelIdx].nombre };
}

function calcularEra(nivel) {
  if (nivel <= 10) return 'Caminante';
  if (nivel <= 20) return 'Explorador';
  if (nivel <= 30) return 'Cronista';
  if (nivel <= 35) return 'Leyenda';
  return 'Mito';
}

// Mercado de Emprendedores (migracion 034): espejo MINIMO del catalogo
// MERCADO_TIERS/NODOS de api/interacciones.js. Prohibido el import entre
// funciones serverless, asi que la escala se duplica a proposito (mismos 5
// tiers que el Arbol de Clases). Solo se expone el NODO; el detalle de nodos
// (slots/reduccion de impuesto) vive en api/interacciones.js.
const MERCADO_TIERS = [0, 100, 250, 450, 700];
// v21: nivel de jugador minimo de cada nodo del mercado (espejo del
// nivel_jugador de MERCADO_NODOS en api/interacciones.js). El nodo EFECTIVO
// es min(nodo por puntos, nodo por nivel de jugador): mismo gate doble que
// mercado_mi/mercado_publicar, para que el perfil no lo muestre mas alto.
const MERCADO_NIVELES = [2, 5, 10, 20, 30];
function nodoMercadoPorNivelLocal(nivelJugador) {
  const n = parseInt(nivelJugador, 10) || 1;
  let idx = 0;
  for (let i = 0; i < MERCADO_NIVELES.length; i++) {
    if (n >= MERCADO_NIVELES[i]) idx = i;
  }
  return idx + 1;
}
function calcularMercadoLocal(puntos, nivelJugador) {
  const p = Number(puntos) || 0;
  let idx = 0;
  for (let i = 0; i < MERCADO_TIERS.length; i++) {
    if (p >= MERCADO_TIERS[i]) idx = i;
  }
  const porPuntos = idx + 1;
  // Si no se informa el nivel, se asume sin tope (compatibilidad).
  if (nivelJugador == null) return porPuntos;
  return Math.min(porPuntos, nodoMercadoPorNivelLocal(nivelJugador));
}

// v20: instrumenta el gasto de XP en xp_ledger (best-effort) para el medidor
// de "quemado" del dashboard. No debe romper si xp_ledger no existe (42P01).
function registrarGastoXp(sqlFn, usuarioId, accion, monto) {
  return sqlFn(
    'INSERT INTO xp_ledger (usuario_id, accion, xp_base, mult_nivel, mult_stack, mult_final, cap_aplicado, bonos_planos, xp_final, es_exento, contexto) '
    + "VALUES ($1,$2,$3,1,1,1,'ninguno',0,$4,true,$5::jsonb)",
    [usuarioId, accion, monto, -monto, JSON.stringify({ origen: 'usuarios.js', monto: monto })]
  ).catch(function(){});
}

// Insignia vs nivel economico (ADR-053 Decision 5 / Enmienda 1):
//   nivel_visible = GREATEST(nivel derivado de xp_total, nivel_max historico)
// El campo nivel y badge_actual que expone la API corresponden a
// nivel_visible (asi nadie pierde la insignia por el reescalado) y era se
// calcula tambien sobre nivel_visible. nivel_max SOLO protege la insignia:
// M_nivel (en api/interacciones.js) usa el nivel DERIVADO, nunca
// nivel_visible ni nivel_max. nivel/badge_actual siguen siendo columnas
// legacy DERIVADAS y NUNCA persistidas: el backend no escribe esas columnas.
// Degradacion: si nivel_max no existiera, COALESCE/Number lo asumen en 1.
function conNivel(row) {
  if (!row) return row;
  row.xp_total = red2(numXp(row.xp_total));
  const calc = calcularNivel(row.xp_total);
  row.nivel_max = Number(row.nivel_max) || 1;
  const nivelVisible = Math.max(calc.nivel, row.nivel_max);
  const idxVisible = Math.min(Math.max(nivelVisible, 1), NIVELES.length);
  row.nivel_visible = idxVisible;
  row.nivel = idxVisible;
  row.badge_actual = NIVELES[idxVisible - 1].nombre;
  row.era = calcularEra(idxVisible);
  // v21: saldo del Mercado de Emprendedores (aditivo). Si la migracion 034
  // aun no corre, la columna no viene en el row y cae a 0 sin romper.
  row.mercado_puntos = red2(numXp(row.mercado_puntos));
  row.mercado_nodo = calcularMercadoLocal(row.mercado_puntos, calc.nivel);
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
// bloquea el login). v15 (ADR-035, 2026-09-17) adapta el XP a
// numeric(12,2): calcularNivel/conNivel normalizan a Number redondeado a 2
// decimales, referido_red/codigo y casa_elegir sin parseInt/::int, y
// faccion_ranking/casa_ranking con miembros_activos (fallback 42703) y
// orden de Casas por xp_total DESC; v16 (TSK-112 / ADR-038, 2026-09-17)
// agrega CLASES_VALIDAS y la rama POST clase_elegir (primera eleccion
// gratis, recambio de 300 XP + cooldown de 30 dias via clase_elegida_en;
// nivel_clase/xp_clase vuelven a 1/0) y enriquece casa_ranking con el
// cofre (LEFT JOIN casas_cofre) y el factor de nivelacion runtime
// (pct/tag/multiplicador_xp/arancel_inter_casa/fee_mercado_interno).
// casa_ranking degrada 42P01 si la migracion 024 aun no existe. NO toca
// progreso_arbol, RAMAS ni casas_votaciones (coexisten, ADR-038).
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

// Clases Rising Star validas del CHECK chk_usuarios_clase de la migracion
// 024 (TSK-112 / ADR-038). COEXISTEN con el Arbol de Clases de 16 ramas
// (usuarios.progreso_arbol): son una capa nueva, no un reemplazo.
var CLASES_VALIDAS = ['cartografo', 'cronista', 'explorador'];

// ADR-053 Decision 10 (repricing de elecciones). Constantes UNICAS para no
// dejar literales sueltos (Regla de No-Duplicidad): cambio de faccion
// 500 -> 800, cambio de Casa 300 -> 500 y recambio de Clase 300 -> 500. Se
// interpolan en el SQL (valores numericos de codigo, nunca de usuario) y el
// guard WHERE xp_total >= COSTO_* se mantiene para no dejar XP negativo.
var COSTO_FACCION = 800;
var COSTO_CASA = 500;
var COSTO_CLASE = 500;

// TSK-118: el refresco del lider de Casa se ejecuta como maximo una vez
// cada 60 s por instancia (evita amplificacion de escritura en un GET
// publico). Es cache de proceso, no estado persistente.
var CR_LIDER_REFRESH_MS = 60000;
var crLiderUltimoRefresco = 0;

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
      // ---- GET: mi_marca (TSK-122) --------------------------------
      if (tipo === 'mi_marca' && (id || req.query.usuario_id)) {
        var mmId = String(id || req.query.usuario_id || '');
        var mmRows = await sql(
          'SELECT m.*, '
          + '(SELECT COUNT(*)::int FROM patrocinios p WHERE p.marca_id=m.id AND p.activo=TRUE) AS total_patrocinios '
          + 'FROM marcas m WHERE m.usuario_id=$1 LIMIT 1',
          [mmId]
        );
        return res.json({ ok: true, data: mmRows.length ? mmRows[0] : null });
      }
      if (tipo === 'leaderboard') {
        const rows = await sql(
          'SELECT id, nombre, avatar_url, perfil_tipo, xp_total, nivel, '
          + 'badge_actual, nivel_max, total_resenas, total_guardados '
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
          'SELECT id, nombre, email, avatar_url, xp_total, nivel_max, total_resenas, total_guardados '
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
            'SELECT id, nombre, avatar_url, foto_url, xp_total, nivel_max, faccion, casa, perfil_publico'
            + ' FROM usuarios WHERE id=$1 AND activo=true LIMIT 1',
            [ppTarget]
          );
        } catch (eFoto) {
          if (!eFoto || eFoto.code !== '42703') throw eFoto;
          console.error('[usuarios] perfil_publico degradado 42703: ' + eFoto.message);
          ppRows = await sql(
            'SELECT id, nombre, avatar_url, xp_total, nivel_max, faccion, casa, perfil_publico'
            + ' FROM usuarios WHERE id=$1 AND activo=true LIMIT 1',
            [ppTarget]
          );
        }
        if (!ppRows.length)
          return res.status(404).json({ ok: false, error: 'Usuario no encontrado' });
        var ppU = ppRows[0];
        // ADR-053: la insignia publica tambien respeta nivel_max (GREATEST
        // con el nivel derivado); sin nivel_max degrada a 1.
        var ppNivel = Math.max(calcularNivel(ppU.xp_total).nivel, Number(ppU.nivel_max) || 1);
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
            xp_ref_total: red2(numXp(rcRows[0].xp_ref_total)),
            referidos_dia_actual: rcHoy.length ? rcHoy[0].n : 0,
          }
        });
      }

      // Consulta publica suave por codigo de referido (sin JWT ni sesion):
      // devuelve SOLO el nombre publico del anfitrion. No expone email,
      // avatar, XP ni ids internos. Si el codigo no existe o esta vacio
      // responde 200 con REFERIDO_INVALIDO (consulta publica suave).
      if (tipo === 'ref_info') {
        var riCode = String(req.query.ref || req.query.codigo || '').trim();
        if (!riCode) {
          return res.status(200).json({ ok: false, error: 'REFERIDO_INVALIDO' });
        }
        var riRows = await sql(
          'SELECT nombre FROM usuarios WHERE codigo_referido=$1 LIMIT 1',
          [riCode]
        );
        var riNombre = (riRows.length ? String(riRows[0].nombre || '') : '').trim().slice(0, 80);
        if (!riNombre) {
          return res.status(200).json({ ok: false, error: 'REFERIDO_INVALIDO' });
        }
        return res.status(200).json({ ok: true, anfitrion_nombre: riNombre });
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
          + ') SELECT nivel, COUNT(*)::int AS cantidad, COALESCE(ROUND(SUM(xp_ref_total), 2), 0) AS xp_ref '
          + 'FROM red GROUP BY nivel ORDER BY nivel',
          [rrId]
        );
        var rrDirectos = await sql(
          'SELECT COUNT(*)::int AS n FROM usuarios WHERE referido_por=$1',
          [rrId]
        );
        var rrNivelesNum = rrNiveles.map(function (r) {
          r.xp_ref = red2(numXp(r.xp_ref));
          return r;
        });
        return res.json({
          ok: true,
          data: {
            niveles: rrNivelesNum,
            total_directos: rrDirectos.length ? rrDirectos[0].n : 0,
          }
        });
      }

      // Ranking de facciones: agregado por faccion + top 3 por faccion.
      // miembros_activos = miembros vigentes (ADR-035). Si usuarios.activo
      // o ultimo_acceso no existen (42703, columnas no versionadas), se
      // reintenta la MISMA consulta sin el FILTER y se devuelve 0.
      if (tipo === 'faccion_ranking') {
        var frActividad = 'activo = true AND ultimo_acceso > NOW() - INTERVAL \'30 days\'';
        var frSql = function (filtroAct) {
          return 'SELECT faccion, COUNT(*)::int AS miembros, '
            + 'COALESCE(ROUND(SUM(xp_total), 2), 0) AS xp_total, '
            + (filtroAct
                ? 'COUNT(*) FILTER (WHERE ' + filtroAct + ')::int AS miembros_activos '
                : '0::int AS miembros_activos ')
            + 'FROM usuarios WHERE faccion IS NOT NULL GROUP BY faccion '
            + 'ORDER BY COALESCE(ROUND(SUM(xp_total), 2), 0) DESC';
        };
        var frFacciones;
        try {
          frFacciones = await sql(frSql(frActividad));
        } catch (frErr) {
          if (!frErr || frErr.code !== '42703') throw frErr;
          console.warn('[usuarios] faccion_ranking degradado 42703: ' + frErr.message);
          frFacciones = await sql(frSql(null));
        }
        frFacciones = frFacciones.map(function (f) {
          f.xp_total = red2(numXp(f.xp_total));
          f.miembros_activos = Number(f.miembros_activos) || 0;
          return f;
        });
        var frTop = await sql(
          'SELECT id, nombre, avatar_url, faccion, xp_total FROM ('
          + 'SELECT id, nombre, avatar_url, faccion, xp_total, '
          + 'ROW_NUMBER() OVER (PARTITION BY faccion ORDER BY xp_total DESC) AS pos '
          + 'FROM usuarios WHERE faccion IS NOT NULL'
          + ') t WHERE t.pos <= 3 ORDER BY t.faccion, t.xp_total DESC'
        );
        frTop = frTop.map(function (f) {
          f.xp_total = red2(numXp(f.xp_total));
          return f;
        });
        return res.json({ ok: true, data: { facciones: frFacciones, top: frTop } });
      }

      // Ranking de Casas (WP-5, TSK-103 / ADR-028): agregado por Casa +
      // top 5 por Casa. ADR-035: el orden pasa a xp_total DESC (ya no
      // xp_promedio) y se agrega miembros_activos vigentes (30 dias). La
      // division usa GREATEST(COUNT(*),1) como guarda de division por
      // cero. Espejo de faccion_ranking, con el mismo fallback 42703.
      if (tipo === 'casa_ranking') {
        var crActividad = 'u.activo = true AND u.ultimo_acceso > NOW() - INTERVAL \'30 days\'';
        // TSK-112 / ADR-038: el cofre (casas_cofre) entra por LEFT JOIN;
        // sus campos son cache NO autoritativa. conCofre=false es la
        // degradacion 42P01 (migracion 024 aun no aplicada): responde el
        // cofre en cero y factor neutro sin romper el contrato.
        // Migracion 026: conLider controla si se leen las columnas nuevas
        // casas_cofre.lider_user_id / tributo_pct. Si la 026 aun no esta
        // aplicada, la degradacion 42703 reintenta con conLider=false para
        // seguir respondiendo el ranking sin perder xp_cofre_total /
        // factor_conversion (que vienen de la 024). El resultado siempre
        // expone lider_user_id y tributo_pct (default NULL / 10).
        var crSql = function (filtroAct, conCofre, conLider) {
          if (conLider === undefined) conLider = true;
          return 'SELECT u.casa,'
            + ' COUNT(*)::int AS miembros,'
            + (filtroAct
                ? ' COUNT(*) FILTER (WHERE ' + filtroAct + ')::int AS miembros_activos,'
                : ' 0::int AS miembros_activos,')
            + ' COALESCE(ROUND(SUM(u.xp_total), 2), 0) AS xp_total,'
            + ' COALESCE(ROUND(SUM(u.xp_total) / GREATEST(COUNT(*), 1), 2), 0) AS xp_promedio,'
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
            + '   AND aoc.creado_en > NOW() - INTERVAL \'30 days\') AS checkins_30d,'
            + (conCofre
                ? ' COALESCE(ct.xp_cofre_total, 0) AS xp_cofre_total,'
                  + ' COALESCE(ct.factor_conversion, 1) AS factor_conversion,'
                  + (conLider
                      ? ' COALESCE(ct.lider_user_id, NULL) AS lider_user_id,'
                        + ' COALESCE(ct.tributo_pct, 10) AS tributo_pct'
                      : ' NULL AS lider_user_id, 10 AS tributo_pct')
                : ' 0 AS xp_cofre_total, 1 AS factor_conversion,'
                  + ' NULL AS lider_user_id, 10 AS tributo_pct')
            + ' FROM usuarios u'
            + (conCofre ? ' LEFT JOIN casas_cofre ct ON ct.casa = u.casa' : '')
            + ' WHERE u.casa IS NOT NULL'
            + ' GROUP BY u.casa'
            + (conCofre ? ', ct.xp_cofre_total, ct.factor_conversion' : '')
            + (conCofre && conLider ? ', ct.lider_user_id, ct.tributo_pct' : '')
            + ' ORDER BY COALESCE(ROUND(SUM(u.xp_total), 2), 0) DESC';
        };
        // Degradacion escalonada (nunca catch vacio; siempre se registra el
        // motivo con warn y se propaga si no aplica):
        //   - 42P01 (casas_cofre ausente, migracion 024): quita el JOIN.
        //   - 42703 (lider_user_id/tributo_pct ausentes, migracion 026
        //     pendiente): reintenta con conLider=false conservando el cofre
        //     de la 024 (xp_cofre_total / factor_conversion).
        var crConsultar = async function (filtroAct, conCofre, conLider) {
          if (conLider === undefined) conLider = true;
          try {
            return await sql(crSql(filtroAct, conCofre, conLider));
          } catch (crErr) {
            var crCode = crErr && crErr.code;
            if (crCode === '42P01' && conCofre) {
              console.warn('[usuarios] casa_ranking sin casas_cofre 42P01: ' + crErr.message);
              return await crConsultar(filtroAct, false, conLider);
            }
            if (crCode === '42703' && conLider) {
              console.warn('[usuarios] casa_ranking sin lider/tributo 42703: ' + crErr.message);
              return await crConsultar(filtroAct, conCofre, false);
            }
            throw crErr;
          }
        };
        // Migracion 026: refresco best-effort del lider por Casa antes de
        // leer el ranking. Nunca bloquea la respuesta: si 024 (casas_cofre),
        // 026 (lider_user_id) o casa_roles no existen todavia, registra el
        // error con console.error y continua (patron BUG-021/BUG-060).
        // TSK-118: throttle a 60 s por instancia para que un GET publico no
        // amplifique escrituras; las lecturas del ranking no se tocan.
        var crAhoraMs = Date.now();
        if (crAhoraMs - crLiderUltimoRefresco >= CR_LIDER_REFRESH_MS) {
          crLiderUltimoRefresco = crAhoraMs;
          try {
            // 1) recalcular el lider (usuario con mas xp_total por Casa).
            await sql('UPDATE casas_cofre cc SET lider_user_id = sub.id, actualizado_en = NOW() FROM (SELECT DISTINCT ON (casa) casa, id FROM usuarios WHERE casa IS NOT NULL AND activo = true ORDER BY casa, xp_total DESC) sub WHERE cc.casa = sub.casa AND (cc.lider_user_id IS DISTINCT FROM sub.id)', []);
            // 2) upsert del nuevo lider en casa_roles.
            await sql('INSERT INTO casa_roles (casa, usuario_id, rol) SELECT casa, lider_user_id, \'lider\' FROM casas_cofre WHERE lider_user_id IS NOT NULL ON CONFLICT (casa, usuario_id) DO UPDATE SET rol = \'lider\', activo = true, asignado_en = NOW()', []);
            // 3) degradar a oficial los lideres anteriores de la misma Casa.
            await sql('UPDATE casa_roles cr SET rol = \'oficial\' FROM casas_cofre cc WHERE cr.casa = cc.casa AND cr.rol = \'lider\' AND cc.lider_user_id IS NOT NULL AND cr.usuario_id IS DISTINCT FROM cc.lider_user_id', []);
          } catch (e) {
            console.error('[casa_ranking] lider best-effort: ' + (e && e.message));
          }
        }
        var crCasas;
        try {
          crCasas = await crConsultar(crActividad, true);
        } catch (crErr) {
          if (!crErr || crErr.code !== '42703') throw crErr;
          console.warn('[usuarios] casa_ranking degradado 42703: ' + crErr.message);
          crCasas = await crConsultar(null, true);
        }
        crCasas = crCasas.map(function (c) {
          c.xp_total = red2(numXp(c.xp_total));
          c.xp_promedio = red2(numXp(c.xp_promedio));
          c.miembros_activos = Number(c.miembros_activos) || 0;
          c.xp_cofre_total = red2(parseFloat(c.xp_cofre_total) || 0);
          c.factor_conversion = parseFloat(c.factor_conversion) || 1;
          c.lider_user_id = c.lider_user_id || null;
          c.tributo_pct = parseFloat(c.tributo_pct) || 10;
          return c;
        });
        // Factor de nivelacion runtime (ADR-038 seccion D): el tag de cada
        // Casa sale de su cuota de poblacion activa; los multiplicadores
        // son constantes de producto. Fuente de verdad = este calculo.
        var crTotalActivos = 0;
        crCasas.forEach(function (c) { crTotalActivos += c.miembros_activos; });
        crCasas.forEach(function (c) {
          var crPct = crTotalActivos > 0 ? (c.miembros_activos / crTotalActivos) : 0;
          c.pct = crPct;
          var crTag = (crTotalActivos > 0 && crPct > 0.45) ? 'dominante'
            : ((crTotalActivos > 0 && crPct < 0.25) ? 'rezagada' : 'equilibrada');
          c.tag = crTag;
          c.multiplicador_xp = crTag === 'rezagada' ? 1.30 : (crTag === 'dominante' ? 0.85 : 1.00);
          c.arancel_inter_casa = crTag === 'rezagada' ? 0.05 : (crTag === 'dominante' ? 0.25 : 0.10);
          c.fee_mercado_interno = crTag === 'rezagada' ? 0.00 : (crTag === 'dominante' ? 0.02 : 0.05);
        });
        var crTop = await sql(
          'SELECT id, nombre, avatar_url, casa, xp_total FROM ('
          + 'SELECT id, nombre, avatar_url, casa, xp_total, '
          + 'ROW_NUMBER() OVER (PARTITION BY casa ORDER BY xp_total DESC) AS pos '
          + 'FROM usuarios WHERE casa IS NOT NULL'
          + ') t WHERE t.pos <= 5 ORDER BY t.casa, t.xp_total DESC'
        );
        crTop = crTop.map(function (c) {
          c.xp_total = red2(numXp(c.xp_total));
          return c;
        });
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
        // ADR-058: min_dias_cuenta se lee UNA vez para el objeto 'origen'
        // (lectura tolerante; degrada a 7 con warn si gamificacion_config no
        // existe). Requiere la migracion 038 (origen_declarado_en llega por
        // SELECT *); sin ella, los demas campos siguen igual y origen degrada.
        var minDiasOrigen = await leerMinDiasOrigen(sql);
        var esAutorizado = esAdminUsuario(req) || validarSesionUsuario(req, String(rows[0].id)).ok;
        if (esAutorizado) {
          var perfilData = conLogros(conMisiones(conNivel(rows[0])));
          // ADR-058 (aditivo): origen en la respuesta del perfil propio/admin.
          perfilData.origen = construirOrigenUsuario(rows[0], minDiasOrigen);
          return res.json({ ok: true, data: perfilData });
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
            xp_total: red2(numXp(pub.xp_total)),
            mercado_puntos: red2(numXp(pub.mercado_puntos)),
            mercado_nodo: calcularMercadoLocal(pub.mercado_puntos, calcularNivel(red2(numXp(pub.xp_total))).nivel),
            faccion: pub.faccion || null,
            casa: pub.casa || null,
            perfil_publico: pub.perfil_publico !== false,
            // ADR-058 (aditivo): base de elegibilidad de origen. NO expone
            // email_verificado; el booleano derivado es_extranjero_verificado
            // ya lo resume.
            origen: construirOrigenUsuario(pub, minDiasOrigen),
          },
        });
      }
      return res.status(400).json({ ok: false, error: 'Falta id o tipo' });
    }

    if (req.method === 'POST') {
      var c = req.body || {};

      // ---- Rama: elegir o cambiar faccion (Gaming v5.0) -------------
      // Primera eleccion: gratis. Cambios posteriores: producto de
      // COSTO_FACCION (800) xp_total con cooldown de 15 dias (la moneda del
      // juego es xp_total, ADR-018; precio ADR-053 Decision 10). Todas las
      // escrituras son UPDATE condicional para resolver carreras del lado de
      // la BD.
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
        // Cambio de faccion: pago COSTO_FACCION (800) xp, cooldown de 15
        // dias (ADR-053 Decision 10). El UPDATE condicional es la fuente de
        // verdad; si no afecta filas se distingue el motivo con los datos ya
        // leidos.
        var feCambio = await sql(
          'UPDATE usuarios SET xp_total = xp_total - ' + COSTO_FACCION + ', faccion=$2, faccion_elegida_en=NOW() '
          + 'WHERE id=$1 AND xp_total >= ' + COSTO_FACCION + ' '
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
        registrarGastoXp(sql, feId, 'gasto_faccion', COSTO_FACCION);
        return res.json({ ok: true, data: { faccion: feCambio[0].faccion, faccion_elegida_en: feCambio[0].faccion_elegida_en } });
      }

      // ---- Rama: elegir o cambiar Casa (WP-5, TSK-103 / ADR-028) ----
      // ESPEJO EXACTO de faccion_elegir (mismo contrato de errores y
      // mismos UPDATE condicionales para resolver carreras), con dos
      // diferencias deliberadas: (1) exige sesion firmada del propio
      // usuario (ADR-025), porque casa_elegida_en es dato de su cuenta;
      // (2) la primera eleccion exige nivel >= 2. Primera eleccion:
      // gratis (WHERE casa IS NULL). Cambio: cuesta COSTO_CASA (500)
      // xp_total (debito atomico con WHERE xp_total >= COSTO_CASA, patron de
      // comprar_consumible; precio ADR-053 Decision 10)
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
        var ceXp = numXp(ceFila[0].xp_total);
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
          // ADR-038: poblacion_activa es cache NO autoritativa del cofre.
          // Refresco best-effort: si la migracion 024 aun no existe, NUNCA
          // bloquea la respuesta de eleccion.
          try {
            await sql(
              'UPDATE casas_cofre SET poblacion_activa = '
              + '(SELECT COUNT(*)::int FROM usuarios WHERE casa=$1), actualizado_en=NOW() '
              + 'WHERE casa=$1',
              [ceCasa]
            );
          } catch (ceErr) {
            console.warn('[usuarios] poblacion_activa no actualizada: ' + (ceErr && ceErr.message));
          }
          var ceXpPrim = numXp(cePrim[0].xp_total);
          var ceNivelPrim = calcularNivel(ceXpPrim).nivel;
          return res.json({ ok: true, data: {
            casa: cePrim[0].casa,
            casa_elegida_en: cePrim[0].casa_elegida_en,
            xp_total_nuevo: red2(ceXpPrim),
            nivel_anterior: ceNivelAnt,
            nivel_nuevo: ceNivelPrim,
            bajo_nivel: ceNivelPrim < ceNivelAnt,
          } });
        }
        // Cambio de Casa: pago COSTO_CASA (500) xp, cooldown de 30 dias
        // (ADR-053 Decision 10). El UPDATE condicional es la fuente de
        // verdad; si no afecta filas se distingue el motivo con los datos ya
        // leidos.
        var ceCambio = await sql(
          'UPDATE usuarios SET xp_total = xp_total - ' + COSTO_CASA + ', casa=$2, casa_elegida_en=NOW() '
          + 'WHERE id=$1 AND xp_total >= ' + COSTO_CASA + ' '
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
        registrarGastoXp(sql, ceId, 'gasto_casa', COSTO_CASA);
        // ADR-038: mismo refresco best-effort del cofre tras el recambio.
        try {
          await sql(
            'UPDATE casas_cofre SET poblacion_activa = '
            + '(SELECT COUNT(*)::int FROM usuarios WHERE casa=$1), actualizado_en=NOW() '
            + 'WHERE casa=$1',
            [ceCasa]
          );
        } catch (ceErr) {
          console.warn('[usuarios] poblacion_activa no actualizada: ' + (ceErr && ceErr.message));
        }
        var ceXpNuevo = numXp(ceCambio[0].xp_total);
        var ceNivelNuevo = calcularNivel(ceXpNuevo).nivel;
        return res.json({ ok: true, data: {
          casa: ceCambio[0].casa,
          casa_elegida_en: ceCambio[0].casa_elegida_en,
          xp_total_nuevo: red2(ceXpNuevo),
          nivel_anterior: ceNivelAnt,
          nivel_nuevo: ceNivelNuevo,
          bajo_nivel: ceNivelNuevo < ceNivelAnt,
        } });
      }

      // ---- Rama: elegir o cambiar Clase Rising Star (TSK-112 / ADR-038) --
      // Espejo de casa_elegir (sesion firmada ADR-025, email verificado,
      // primera eleccion gratis y recambio con coste de COSTO_CLASE (500)
      // XP + cooldown de 30 dias via clase_elegida_en (ADR-053 Decision 10),
      // SIN gate de nivel. NO toca el
      // Arbol de Clases de 16 ramas (usuarios.progreso_arbol): la Clase es
      // una capa nueva que COEXISTE con el arbol (ADR-038). Al recambiar,
      // nivel_clase vuelve a 1 y xp_clase a 0: la nueva profesion empieza
      // de cero.
      if (c.tipo === 'clase_elegir') {
        var clId = String(c.usuario_id || '');
        if (!clId)
          return res.status(400).json({ ok: false, error: 'usuario_id requerido' });
        var clSes = validarSesionUsuario(req, clId);
        if (!clSes.ok)
          return res.status(401).json({ ok: false, error: clSes.razon });
        var clClase = String(c.clase_id || c.clase || '').toLowerCase();
        if (CLASES_VALIDAS.indexOf(clClase) === -1)
          return res.status(400).json({ ok: false, error: 'CLASE_INVALIDA' });
        var clFila = await sql(
          'SELECT id, clase_id, clase_elegida_en, xp_total, email_verificado FROM usuarios WHERE id=$1',
          [clId]
        );
        if (!clFila.length)
          return res.status(404).json({ ok: false, error: 'Usuario no encontrado' });
        if (!(clFila[0].email_verificado === true))
          return res.status(403).json({ ok: false, error: 'EMAIL_SIN_VERIFICAR' });
        var clXp = numXp(clFila[0].xp_total);
        var clNivelAnt = calcularNivel(clXp).nivel;
        if (!clFila[0].clase_id) {
          // Primera eleccion: el WHERE clase_id IS NULL protege la carrera
          // y el 409 si otro request gano la eleccion primero.
          var clPrim = await sql(
            'UPDATE usuarios SET clase_id=$2, nivel_clase=1, xp_clase=0, clase_elegida_en=NOW() '
            + 'WHERE id=$1 AND clase_id IS NULL RETURNING clase_id, clase_elegida_en',
            [clId, clClase]
          );
          if (!clPrim.length)
            return res.status(409).json({ ok: false, error: 'CLASE_YA_ELEGIDA' });
          return res.json({ ok: true, data: {
            clase_id: clPrim[0].clase_id,
            clase_elegida_en: clPrim[0].clase_elegida_en,
          } });
        }
        // Recambio de Clase: pago COSTO_CLASE (500) XP, cooldown de 30 dias
        // (ADR-053 Decision 10). El UPDATE condicional es la fuente de
        // verdad; si no afecta filas se distingue el motivo con los datos ya
        // leidos.
        var clCambio = await sql(
          'UPDATE usuarios SET xp_total = xp_total - ' + COSTO_CLASE + ', clase_id=$2, nivel_clase=1, xp_clase=0, '
          + 'clase_elegida_en=NOW() '
          + 'WHERE id=$1 AND xp_total >= ' + COSTO_CLASE + ' '
          + 'AND (clase_elegida_en IS NULL OR clase_elegida_en <= NOW() - INTERVAL \'30 days\') '
          + 'RETURNING clase_id, clase_elegida_en, xp_total',
          [clId, clClase]
        );
        if (!clCambio.length) {
          var clElegidaEn = clFila[0].clase_elegida_en;
          var clEnCooldown = clElegidaEn
            && (Date.parse(clElegidaEn) > Date.now() - 30 * 24 * 3600 * 1000);
          if (clEnCooldown)
            return res.status(429).json({ ok: false, error: 'COOLDOWN_CLASE' });
          return res.status(402).json({ ok: false, error: 'PUNTOS_INSUFICIENTES' });
        }
        registrarGastoXp(sql, clId, 'gasto_clase', COSTO_CLASE);
        var clXpNuevo = numXp(clCambio[0].xp_total);
        var clNivelNuevo = calcularNivel(clXpNuevo).nivel;
        return res.json({ ok: true, data: {
          clase_id: clCambio[0].clase_id,
          clase_elegida_en: clCambio[0].clase_elegida_en,
          xp_total_nuevo: red2(clXpNuevo),
          nivel_anterior: clNivelAnt,
          nivel_nuevo: clNivelNuevo,
          bajo_nivel: clNivelNuevo < clNivelAnt,
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

        // ADR-058 (anti-teleport): se registran los valores entrantes de
        // ciudad_base/pais_base para compararlos con el valor PREVIO en el
        // mismo UPDATE (comparacion normalizada con trim) y decidir si hay
        // que fijar origen_declarado_en=NOW(). false = campo no enviado.
        var puCiudadEnviada = false;
        var puCiudadNueva = null;
        var puPaisEnviado = false;
        var puPaisNuevo = null;

        // ciudad_base (opcional, 1..80 chars o null para limpiarla)
        if (c.ciudad_base !== undefined) {
          puCiudadEnviada = true;
          if (c.ciudad_base === null || c.ciudad_base === '') {
            puCiudadNueva = null;
            puSets.push('ciudad_base = ' + puPh(null));
          } else {
            var puCiudad = (typeof c.ciudad_base === 'string') ? c.ciudad_base.trim() : '';
            if (!puCiudad || puCiudad.length > 80)
              return res.status(400).json({ ok: false, error: 'CIUDAD_INVALIDA' });
            puCiudadNueva = puCiudad;
            puSets.push('ciudad_base = ' + puPh(puCiudad));
          }
        }

        // pais_base (ISO-3166-1 alfa-2: exactamente 2 letras, a MAYUSCULAS)
        if (c.pais_base !== undefined) {
          puPaisEnviado = true;
          if (c.pais_base === null || c.pais_base === '') {
            puPaisNuevo = null;
            puSets.push('pais_base = ' + puPh(null));
          } else {
            var puPais = String(c.pais_base).trim().toUpperCase();
            if (!/^[A-Za-z]{2}$/.test(puPais))
              return res.status(400).json({ ok: false, error: 'PAIS_INVALIDO' });
            puPaisNuevo = puPais;
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

        // ADR-058 (anti-teleport, B-4): si ciudad_base o pais_base CAMBIAN
        // respecto al valor previo del usuario, se fija
        // origen_declarado_en = NOW() en el MISMO UPDATE. La comparacion es
        // normalizada con trim (y mayusculas en pais: columna ISO-2). Un no-op
        // (mismo valor) NO toca origen_declarado_en, de modo que editar otros
        // campos jamas reinicia la elegibilidad a Extranjero. Los valores
        // previos se traen con un SELECT acotado al propio usuario.
        if (puCiudadEnviada || puPaisEnviado) {
          var puPrev = await sql('SELECT ciudad_base, pais_base FROM usuarios WHERE id=$1', [puId]);
          if (!puPrev.length)
            return res.status(404).json({ ok: false, error: 'Usuario no encontrado' });
          var puPrevCiudad = normTrimOrigen(puPrev[0].ciudad_base);
          var puPrevPais = normTrimOrigen(puPrev[0].pais_base).toUpperCase();
          var puAhoraCiudad = puCiudadEnviada ? normTrimOrigen(puCiudadNueva) : puPrevCiudad;
          var puAhoraPais = puPaisEnviado ? normTrimOrigen(puPaisNuevo).toUpperCase() : puPrevPais;
          if ((puCiudadEnviada && puAhoraCiudad !== puPrevCiudad)
              || (puPaisEnviado && puAhoraPais !== puPrevPais)) {
            puSets.push('origen_declarado_en = NOW()');
          }
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
        // ADR-058 (aditivo): mismo objeto 'origen' que el GET, para que la UI
        // refresque origen_declarado_en/tier_base sin una segunda peticion.
        puData.origen = construirOrigenUsuario(puUpd[0], await leerMinDiasOrigen(sql));
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

      // ---- Rama: activar / actualizar Marca del usuario (TSK-120) ---
      // POST { tipo:'marca_activar', usuario_id, nombre, logo_url?,
      //        banner_url?, descripcion?, areas_influencia?, enlaces? }
      // Requiere JWT valido del propio usuario. Nivel minimo: 5.
      // MERGE JSONB: cero reemplazo total (ADR-003).
      if (c.tipo === 'marca_activar') {
        var maUid = String(c.usuario_id || '');
        if (!maUid) return res.status(400).json({ ok: false, error: 'usuario_id requerido' });
        var maJwt = validarSesionUsuario(req, maUid);
        if (!maJwt || !maJwt.ok) return res.status(401).json({ ok: false, error: 'No autorizado' });
        var maNombre = String(c.nombre || '').trim().slice(0, 120);
        if (!maNombre) return res.status(400).json({ ok: false, error: 'nombre requerido' });
        // Nivel minimo 5. usuarios.nivel esta STALE: se recalcula en
        // lectura con calcularNivel(xp_total) (misma funcion que conNivel).
        var maUser = await sql('SELECT xp_total FROM usuarios WHERE id=$1 LIMIT 1', [maUid]);
        if (!maUser.length || calcularNivel(maUser[0].xp_total).nivel < 5)
          return res.status(403).json({ ok: false, error: 'Nivel m\u00ednimo 5 requerido para activar una Marca' });
        var maAreas  = c.areas_influencia ? JSON.stringify(c.areas_influencia) : null;
        var maLinks  = c.enlaces          ? JSON.stringify(c.enlaces)           : null;
        var maFila = await sql(
          'INSERT INTO marcas (usuario_id, nombre, logo_url, banner_url, descripcion, areas_influencia, enlaces) '
          + 'VALUES ($1,$2,$3,$4,$5,'
          + 'COALESCE($6::jsonb,\'[]\'::jsonb),'
          + 'COALESCE($7::jsonb,\'{}\'::jsonb)) '
          + 'ON CONFLICT (usuario_id) DO UPDATE SET '
          + 'nombre      = EXCLUDED.nombre, '
          + 'logo_url    = COALESCE(EXCLUDED.logo_url, marcas.logo_url), '
          + 'banner_url  = COALESCE(EXCLUDED.banner_url, marcas.banner_url), '
          + 'descripcion = COALESCE(EXCLUDED.descripcion, marcas.descripcion), '
          + 'areas_influencia = marcas.areas_influencia || COALESCE(EXCLUDED.areas_influencia, \'[]\'::jsonb), '
          + 'enlaces     = marcas.enlaces || COALESCE(EXCLUDED.enlaces, \'{}\'::jsonb), '
          + 'activa      = TRUE '
          + 'RETURNING id, nombre, activa, verificada',
          [maUid, maNombre,
           c.logo_url    ? String(c.logo_url).slice(0,512)    : null,
           c.banner_url  ? String(c.banner_url).slice(0,512)  : null,
           c.descripcion ? String(c.descripcion).slice(0,500) : null,
           maAreas, maLinks]
        );
        return res.json({ ok: true, data: maFila[0] });
      }

      // ---- Rama: crear patrocinio (TSK-121) ----------------------
      // POST { tipo:'marca_patrocinar', usuario_id, tipo_objetivo,
      //        objetivo_id, xp_aportada?, fama_bonus?, branding_data? }
      // La marca debe pertenecer al usuario y estar activa.
      if (c.tipo === 'marca_patrocinar') {
        var mpUid = String(c.usuario_id || '');
        if (!mpUid) return res.status(400).json({ ok: false, error: 'usuario_id requerido' });
        var mpJwt = validarSesionUsuario(req, mpUid);
        if (!mpJwt || !mpJwt.ok) return res.status(401).json({ ok: false, error: 'No autorizado' });
        var mpTipo = String(c.tipo_objetivo || '');
        var mpObjId = String(c.objetivo_id || '');
        if (!mpTipo || !mpObjId)
          return res.status(400).json({ ok: false, error: 'tipo_objetivo y objetivo_id requeridos' });
        var TIPOS_VALIDOS = ['evento','artista','parche','mision'];
        if (TIPOS_VALIDOS.indexOf(mpTipo) === -1)
          return res.status(400).json({ ok: false, error: 'tipo_objetivo inv\u00e1lido' });
        // Verificar que la marca es del usuario y esta activa
        var mpMarca = await sql(
          'SELECT id FROM marcas WHERE usuario_id=$1 AND activa=TRUE LIMIT 1',
          [mpUid]
        );
        if (!mpMarca.length)
          return res.status(404).json({ ok: false, error: 'Marca activa no encontrada. Activa tu marca primero.' });
        var mpXp    = Math.max(0, parseInt(c.xp_aportada   || 0, 10));
        var mpFama  = Math.max(0, parseInt(c.fama_bonus     || 0, 10));
        var mpBrand = c.branding_data ? JSON.stringify(c.branding_data) : '{}';
        var mpFila = await sql(
          'INSERT INTO patrocinios (marca_id, tipo_objetivo, objetivo_id, xp_aportada, fama_bonus, branding_data) '
          + 'VALUES ($1,$2,$3,$4,$5,$6::jsonb) RETURNING id',
          [mpMarca[0].id, mpTipo, mpObjId, mpXp, mpFama, mpBrand]
        );
        return res.json({ ok: true, patrocinio_id: mpFila[0].id });
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
      // Bono de bienvenida (036): solo el alta REAL con referido valido
      // puede reclamar el regalo (es_insert = xmax=0, refId en scope).
      usuarioResp.bonus_referido = (fila.es_insert === true && !!refId);
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