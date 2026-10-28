// api/usuarios.js -- Vercel Serverless Function (ASCII-safe: 0 backticks, 0 no-ASCII)
// v26 (2026-10-10): SELLADO del pasaporte. La EXISTENCIA de la fila en billeteras es el sello (nadie mas la crea). El flag sellado se anade al objeto pasaporte: si ya existio, la billetera se sigue devolviendo aunque hoy falte un dato. NO es una columna: se calcula en cada lectura. completo NO se falsea nunca; el SELECT de comprobacion solo corre cuando completo=false (tolerante a 42P01/42703, migracion 042 pendiente) y su fila se reutiliza, sin segunda consulta.
// v25 (2026-09-29): Pasaporte combinado = 10 datos (union de checklist 042 + misiones de perfil); billetera_mia amplia columnas para calcularlo.
// v24 (2026-09-29): Pasaporte + billetera + fotos de perfil (migracion 042).
//   POST perfil_actualizar acepta fecha_nacimiento (PII owner-only; editable
//   UNA sola vez; validacion server-side de fecha real y edad 13..120).
//   Ramas nuevas foto_agregar/foto_principal/foto_quitar (tope 10 activas
//   atomico; URL atada al prefijo de blob del usuario, ADR-068; activo=false
//   ADR-003) y GET ?tipo=billetera_mia (agregador xp_total + CDR +
//   consumibles + checklist de Pasaporte; crea billetera idempotente).
//   Requiere la 042; sin ella cada rama degrada con responderSchemaPendiente.
//   NO toca tags ni crea endpoints (8/8, ADR-001/ADR-010).
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
// v26 (ADR-086, decision D): score compuesto del ranking. La CTE 'score'
// devuelve UNA fila por usuario POR CONSTRUCCION (los 3 agregados con
// GROUP BY usuario_id) y cablea DISTINCT ON (u.id) con ORDER BY u.id,
// xp_total DESC ANTES de cualquier PARTITION BY / LIMIT, que es lo que
// impide que un usuario con N filas en moneda_ledger ocupe N puestos del
// top-3 por faccion y del top-5 por casa. Aplica a las 3 ordenaciones que
// ordenan por score: leaderboard, faccion_ranking y casa_ranking. El saldo
// se lee del LEDGER (SUM(delta)) y sin filtro de moneda porque el tope es
// GLOBAL por usuario sumando las 3 (no por Casa). Degradacion cableada: si
// la migracion falta (42P01/42703) o hay timeout (57014), cae a XP puro con
// console.warn. NO toca xp_total ni ninguna columna (lectura pura).
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
  { min: 27400,  mult: 1.974, nombre: 'Gran Maestro LATAWEL' },
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
  { min: 100000, mult: 3.000, nombre: 'Mito Eterno LATAWEL' },
];

// XP decimal (ADR-035): las columnas XP son numeric(12,2). Neon entrega
// numeric como STRING, asi que todo valor XP se normaliza a Number en el
// borde y se redondea half-up a 2 decimales con un unico helper.
function red2(v) { return Math.round((Number(v) || 0) * 100) / 100; }
function numXp(v) { var n = Number(v); return isFinite(n) ? n : 0; }

// ADR-086 / TSK-183 (B4-B5): la moneda vigente del mercado. Mismo valor que
// el DEFAULT 'condor' de la migracion 045, luego con el esquema de 1 moneda
// el filtro no cambia ni un solo numero. Punto unico de cambio.
const MONEDA_ACTUAL = 'condor';

// ADR-086 / TSK-183 (B4-B5): detector del esquema multi-moneda. Se cachea la
// PROMESA, luego sin carrera entre peticiones concurrentes y con 1 query de
// solo lectura en todo el proceso. FAIL-CLOSED a false: si falla la deteccion
// se asume 1 moneda, luego el peor caso es el SQL legacy que hoy funciona.
// GATE POR LA PK COMPUESTA, NO POR LA COLUMNA (correccion de @sql-security):
// el runner aplica sentencia por sentencia, luego hay un estado intermedio
// real con la columna ya puesta y la PK aun (usuario_id); gatear por la
// columna emitiria en esa ventana un ON CONFLICT compuesto -> 42P10. La PK
// es el ULTIMO paso de la 046, luego gatear por ella implica que las columnas
// ya estan. Motivo de NO resolverlo con el DEFAULT de la 046: (a) una
// subconsulta escalar sobre una tabla con 3 filas por usuario lanza
// "more than one row returned by a subquery" -> 500, y (b) SUM(delta) sin
// filtro de moneda mezcla las 3 monedas y degrada en silencio. Ninguno de los
// dos es un 42P01/42703, luego la degradacion cableada NO los alcanza.
// Duplicado de api/interacciones.js a proposito: los ficheros serverless son
// autocontenidos y no pueden require entre si sin arrastrar todo el modulo.
// TTL DE 60 s (TSK-183). Sin el, el resultado se congela por el tiempo de vida
// de la instancia de Vercel (minutos u horas): una instancia que resuelve false
// antes de la 046 sigue emitiendo SQL legacy DESPUES de que la PK pasa a
// (usuario_id, moneda), y entonces usuarios.js:778 lee un saldo arbitrario.
// Con el TTL el peor retraso del sistema es 60 s y no "hasta el proximo
// redeploy": cualquier cambio futuro de esquema se absorbe solo.
// SE CACHEA EL BOOLEANO RESUELTO, NO LA PROMESA, porque una promesa rechazada
// cacheada se relee rechazada para siempre y el TTL no la salva: el .catch de
// abajo convierte el fallo en false y la promesa se libera en el .then final.
// La promesa EN VUELTO si se conserva (y es lo unico que se conserva mientras
// vuela) para que N peticiones concurrentes en una instancia fria lanzen 1 sola
// consulta de solo lectura.
// FAIL-CLOSED INALTERADO: si falla la deteccion se asume 1 moneda. Fallar hacia
// multi-moneda daria 42703 visible; fallar hacia legacy da corrupcion silenciosa
// de saldos, luego false es la decision correcta y no se toca.
let MONEDA_TTL_MS = 60000;
let _multiMonedaCache = null;     // promesa EN VUELO (anti thundering herd)
let _multiMonedaCacheVal = null;  // booleano RESUELTO (null = sin cache)
let _multiMonedaCacheAt = 0;      // Date.now() en el instante de resolver
function soportaMoneda(sql) {
  const edad = Date.now() - _multiMonedaCacheAt;
  if (_multiMonedaCacheVal !== null && edad >= 0 && edad < MONEDA_TTL_MS) {
    return Promise.resolve(_multiMonedaCacheVal);
  }
  if (_multiMonedaCache === null) {
    _multiMonedaCache = sql(
      'SELECT 1 AS ok FROM pg_constraint c'
      + ' WHERE c.conrelid = \'moneda_cuentas\'::regclass'
      + '  AND c.contype = \'p\''
      + '  AND c.conkey = ARRAY['
      + '   (SELECT attnum FROM pg_attribute'
      + '     WHERE attrelid = \'moneda_cuentas\'::regclass AND attname = \'usuario_id\'),'
      + '   (SELECT attnum FROM pg_attribute'
      + '     WHERE attrelid = \'moneda_cuentas\'::regclass AND attname = \'moneda\')]'
      + ' LIMIT 1', []
    ).then(function(r) {
      return !!(r && r.length);
    }).catch(function(eSm) {
      console.warn('[moneda] deteccion multi-moneda fallo ('
        + (eSm && eSm.message) + '); se asume esquema de 1 moneda');
      return false;
    }).then(function(vMulti) {
      _multiMonedaCacheVal = vMulti;
      _multiMonedaCacheAt = Date.now();
      _multiMonedaCache = null;   // ya no se relee: el valor resuelto manda
      return vMulti;
    });
  }
  return _multiMonedaCache;
}

// ---- ADR-086 (decision D): score compuesto del ranking ------------------
// Score_ranking(u) = xp_total(u) + gamma * (0.50 * LEAST(saldo, TOPE) + Fama_Parche)
//   gamma = gamificacion_config.ranking_score_gamma  (rampa, la escribe el
//           script de mantenimiento; ausente = 0.0000 = ranking puro)
//   TOPE  = gamificacion_config.ranking_saldo_tope   (dato, no constante)
//   saldo = GREATEST(SUM(moneda_ledger.delta), 0) POR USUARIO
// NO se escribe de vuelta en xp_total ni en ninguna columna: es lectura pura
// (ADR-086), luego xp_total sigue siendo la reputacion inmutable (ADR-018).
//
// UNA FILA POR USUARIO GARANTIZADA ANTES DE CUALQUIER PARTITION BY (B3).
// Cada agregado lleva GROUP BY usuario_id, luego un LEFT JOIN puede
// multiplicar la fila del usuario como maximo UNA vez, y el
// DISTINCT ON (u.id) cablea esa garantia de forma explicita y no heredada.
//
// EL DISTINCT ON HOY ES REDUNDANTE Y SE CABLEA IGUAL, por decision del ADR:
// el primer agregado que se anada sin GROUP BY (una fourth moneda, un
// segundo parche, un LEFT JOIN anidado) lo vuelve imprescindible, y ese
// fallo no da error ni aviso -- ROW_NUMBER() pasa a numerar filas
// duplicadas del mismo usuario y el top-3 por faccion y el top-5 por casa
// salen corruptos con el mismo usuario en dos puestos, solo en produccion.
// ORDER BY u.id, u.xp_total DESC es lo que hace DETERMINISTA (no arbitraria)
// la fila que sobrevive. Lo que se implementa no debe depender de que el
// implementador lea el razonamiento.
//
// SIN FILTRO DE MONEDA, Y ES DELIBERADO. ADR-086 fijo el tope de saldo como
// GLOBAL por usuario summing las 3 monedas (no por Casa), luego el termino
// de saldo del ranking suma el ledger entero y sin AND moneda. Consecuencia
// util: el SQL emitido del ranking es IDENTICO con esquema de 1 moneda y con
// esquema de 3, porque no hay fragmento condicional que construir, luego el
// invariante de 1 moneda no se puede romper por este camino. El filtro
// AND moneda = $2 de B4/B5 (usuarios.js:806/:808) es del diagnostico
// monedero: no se duplica aqui y no se deshace.
// MOTOR COMPARTIDO DEL SCORE COMPUESTO: vive en lib/score.js, FUERA de api/
// a proposito (los 8 ficheros de api/ son 8/8 funciones y 8/8 es el tope).
// Lo consumen los CUATRO rankings de ADR-086: leaderboard, faccion_ranking y
// casa_ranking aqui, y pandilla_ranking en api/interacciones.js. Una sola
// aritmetica de score: copiarla dentro de un api/*.js hace que los cuatro
// rankings dejen de ser comparables entre si. El razonamiento completo (gamma,
// TOPE, DISTINCT ON antes del PARTITION BY, atribucion del termino de parche
// al inversor) esta junto al codigo, en lib/score.js.
var MOTOR_SCORE = require('../lib/score');
var scoreCteSql = MOTOR_SCORE.scoreCteSql;
var scoreFamaSql = MOTOR_SCORE.scoreFamaSql;
var SCORE_ORDEN = MOTOR_SCORE.SCORE_ORDEN;
var sqlConDegradacion = MOTOR_SCORE.sqlConDegradacion;

// ADR-108 D9/D10: constantes UNICAS del sistema de cartas, compartidas con el
// handler que las cobra (api/interacciones.js). Viven en lib/cartas-config.js
// (fuera de api/ por el techo 8/8, mismo patron que lib/score.js) para que el
// coste de la fusion que se ANUNCIA aqui y el que se COBRA alli no deriven.
var CartasConfig = require('../lib/cartas-config.js');
var CARTA_FUSION_XP = CartasConfig.CARTA_FUSION_XP;
var MUSEO_TOPE = CartasConfig.MUSEO_TOPE;
// Variante por defecto de una carta ('base'): la misma que valida el handler
// que equipa/fusiona/dropea (api/interacciones.js) via CARTA_VARIANTES.
var CARTA_VARIANTE_DEFECTO = CartasConfig.CARTA_VARIANTE_DEFECTO;



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

// ADR-107 D5/D15: coste de alta de marca. Espejo de leerMinDiasOrigen: NUNCA
// lanza, degrada al default 1650 con warn si gamificacion_config o la clave
// marca_alta_xp no existen (patron BUG-021). El valor es recalibrable por el
// operador sin deploy (T13: con 2000 exige 2000).
async function leerMarcaAltaXp(sql) {
  try {
    var rows = await sql("SELECT valor FROM gamificacion_config WHERE clave='marca_alta_xp' LIMIT 1");
    var v = (rows && rows.length) ? numXp(rows[0].valor) : 0;
    if (isFinite(v) && v > 0) return red2(v);
  } catch (eCfgAlta) {
    var code = eCfgAlta && eCfgAlta.code;
    console.warn('[marca] gamificacion_config no leida (' + code + '): marca_alta_xp por defecto '
      + MARCA_ALTA_XP_DEFAULT);
  }
  return MARCA_ALTA_XP_DEFAULT;
}

// O4-b: nivel GLOBAL de ALTA de marca. Al CREAR no existe fila en marcas, asi
// que marcas.nivel_requerido (dato POR MARCA, usado por spots) no puede decidir
// el gate del alta: la fuente es gamificacion_config.marca_nivel_requerido.
// NUNCA lanza: degrada al default 5 con warn si la tabla o la clave no existen
// (patron BUG-021 / ADR-107 D5). El MISMO valor se devuelve a los clientes
// (mi_marca / marcas_mias) para pintar el requisito, de modo que UI y servidor
// no puedan divergir.
async function leerMarcaNivelRequerido(sql) {
  try {
    var rows = await sql("SELECT valor FROM gamificacion_config WHERE clave='marca_nivel_requerido' LIMIT 1");
    var v = parseInt((rows && rows.length) ? rows[0].valor : '', 10);
    if (isFinite(v) && v >= 1) return v;
  } catch (eCfgNivel) {
    var code = eCfgNivel && eCfgNivel.code;
    console.warn('[marca] gamificacion_config no leida (' + code + '): marca_nivel_requerido por defecto '
      + MARCA_NIVEL_REQUERIDO_DEFAULT);
  }
  return MARCA_NIVEL_REQUERIDO_DEFAULT;
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
// ADR-059 / ADR-064 (M-6 CERRADO) + ADR-107 D5/D15 + O4-b: umbral de CREACION
// de Marca. La FUENTE es gamificacion_config.marca_nivel_requerido (helper
// leerMarcaNivelRequerido); esta constante es solo el fallback ASCII cuando la
// tabla o la clave no existen. marcas.nivel_requerido (027:208, DEFAULT 5)
// sigue existiendo como dato POR MARCA (spots / marca_patrocinar), pero NO
// decide el alta: al crear todavia no hay fila.
// ADR-107 D15 CIERRA la deriva 6 vs 5: el DEFAULT real de la columna desde la
// 027 es 5, luego el fallback de codigo pasa de 6 a 5 (decision, no nota).
// El grandfathering de EDICION vive en la rama marca_activar.
var MARCA_NIVEL_REQUERIDO_DEFAULT = 5;
// ADR-107 D5: coste de ALTA de marca en XP, leido de gamificacion_config
// (clave marca_alta_xp, recalibrable por el operador sin deploy). Degrada al
// default 1650 si la tabla o la clave no existen todavia.
var MARCA_ALTA_XP_DEFAULT = 1650;
// ADR-107 D6 (regla ii): todo id de ruta se valida antes de $1::uuid para no
// acabar en el 500 global. Mismo regex que usa el resto del backend.
var UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

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
function registrarGastoXp(sqlFn, usuarioId, accion, monto, contexto) {
  return sqlFn(
    'INSERT INTO xp_ledger (usuario_id, accion, xp_base, mult_nivel, mult_stack, mult_final, cap_aplicado, bonos_planos, xp_final, es_exento, contexto) '
    + "VALUES ($1,$2,$3,1,1,1,'ninguno',0,$4,true,$5::jsonb)",
    [usuarioId, accion, monto, red2(-monto),
     JSON.stringify(contexto || { origen: 'usuarios.js', monto: monto })]
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

// ADR-062 (Fase 2C, T7): niveles-gate del set COMPLETO de cartas. Espejo del
// CHECK nivel_gate IN (10,14,20,25) de la migracion 040 (Regla de No
// Duplicidad: un unico catalogo en el backend).
var CARTAS_GATES_NIVELES = [10, 14, 20, 25];

// Coste de XP de la fusion de cartas (4 -> 1). UNICA FUENTE: lib/cartas-config.js
// (CARTA_FUSION_XP), el mismo modulo del que lo lee el handler que lo cobra
// (api/interacciones.js). Aqui solo se ANUNCIA al cliente como fusion_coste_xp;
// prohibido reescribir el literal (la UI y el cobro dejarian de cuadrar).

// Museo de cartas (migracion 061): tope de piezas equipadas por usuario. Se
// enlaza arriba desde lib/cartas-config.js (MUSEO_TOPE); el arbitro real del
// tope sigue siendo la base (CHECK + indice unico parcial, ADR-108 D10).

// ADR-053 / ADR-062 (A-1 CERRADO): nivel_visible = GREATEST(nivel derivado de
// xp_total, COALESCE(nivel_max,1)). Es el nivel que gobierna el grandfathering
// de cartas-gate: quien llego al nivel y luego gasto XP NO se bloquea.
function nivelVisibleDe(row) {
  var derivado = calcularNivel(row && row.xp_total).nivel;
  var nivelMax = Number(row && row.nivel_max) || 1;
  return Math.max(derivado, nivelMax);
}

// ADR-061/ADR-062 (Fase 2C): 503 tipado si falta el esquema de la 040
// (cartas_*/moneda_*). Nunca catch vacio. ADR-107 D8 reusa el MISMO 503 para
// las ramas de marca que dependen de la 058 (texto opcional, code invariante).
function responderSchemaPendiente(res, etiqueta, e, texto) {
  console.warn('[usuarios] ' + etiqueta + ' ausente (esquema pendiente): '
    + (e && e.code ? e.code + ' ' : '') + (e && e.message));
  return res.status(503).json({
    ok: false,
    error: texto || 'Recurso no disponible (migracion 040 pendiente)',
    code: 'SCHEMA_NOT_MIGRATED'
  });
}

// ADR-064 (Fase 2C, T9): metadatos de la hoja de vida del artista. Limites
// acotados de longitud (merge JSONB, ADR-003). Devuelve un objeto con solo
// las claves VALIDAS enviadas (no muta el body).
function construirMetaArtista(body) {
  var meta = {};
  if (body.bio !== undefined) {
    var bio = (typeof body.bio === 'string') ? body.bio.trim() : '';
    if (bio.length > 280) return { error: 'BIO_LARGA' };
    meta.bio = bio;
  }
  if (body.ciudad !== undefined) {
    var ciudad = (typeof body.ciudad === 'string') ? body.ciudad.trim() : '';
    if (ciudad.length > 80) return { error: 'CIUDAD_LARGA' };
    meta.ciudad = ciudad;
  }
  if (body.destacado !== undefined) {
    if (typeof body.destacado !== 'boolean') return { error: 'DESTACADO_INVALIDO' };
    meta.destacado = body.destacado;
  }
  return { meta: meta };
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
// ADR-109 paso 4b: el secreto admin NO tiene fallback publico (fail-closed).
// Sin process.env.ADMIN_SECRET las ramas admin responden 503; la comparacion
// es en tiempo constante. Refactor a lib/ pendiente (deuda del arquitecto).
function adminSecretValor() {
  var s = process.env.ADMIN_SECRET;
  return (typeof s === 'string' && s.length > 0) ? s : null;
}
// Bytes UTF-16 -> octetos bajos. Sin Buffer a proposito: el arnes de smoke
// carga el handler en un sandbox vm sin globales de Node, y typed arrays son
// intrinsecos de ECMAScript.
function adminBytes(v) {
  var s = String(v === undefined || v === null ? '' : v);
  var out = new Uint8Array(s.length);
  for (var i = 0; i < s.length; i++) out[i] = s.charCodeAt(i) & 255;
  return out;
}
function adminSecretIgual(candidato) {
  var real = adminSecretValor();
  if (!real) return false;
  var cand = String(candidato === undefined || candidato === null ? '' : candidato);
  if (cand.length !== real.length || cand.length === 0) return false;
  return crypto.timingSafeEqual(adminBytes(cand), adminBytes(real));
}
function denegarUsuario(res, contexto) {
  if (!adminSecretValor()) {
    console.error('[auth] CONFIG_ADMIN_SECRET_AUSENTE ' + contexto);
    return res.status(503).json({ ok: false, error: 'CONFIG_ADMIN_SECRET_AUSENTE' });
  }
  return res.status(401).json({ ok: false, error: 'No autorizado' });
}
function esAdminUsuario(req) {
  if (!adminSecretValor()) {
    console.error('[auth] CONFIG_ADMIN_SECRET_AUSENTE usuarios');
    return false;
  }
  var bearer = String(req.headers['authorization'] || '').replace('Bearer ', '').trim();
  var interno = String(req.headers['x-internal-secret'] || '').trim();
  return adminSecretIgual(bearer) || adminSecretIgual(interno);
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
// guard WHERE GREATEST(xp_total - COALESCE(xp_gastado_sinks,0),0) >= COSTO_*
// se mantiene para no dejar XP disponible negativo (TSK-185 / ADR-086).
var COSTO_FACCION = 800;
var COSTO_CASA = 500;
var COSTO_CLASE = 500;

// ===== Pasaporte / fecha de nacimiento / billetera (migracion 042) =====
// ADR-018: la billetera NO crea moneda; agrega xp_total + CDR (moneda_ledger)
// + consumibles (usuarios.capacidades). ADR-028: fecha_nacimiento es PII y
// solo se sirve al dueno.
var EDAD_MINIMA = 13;
var EDAD_MAXIMA = 120;
var MAX_FOTOS_PERFIL = 10;

// Valida una fecha YYYY-MM-DD (real, no futura, edad 13..120).
// Devuelve {ok:true, iso, edad} o {ok:false, error:<CODIGO>}.
function parseFechaNacimiento(raw) {
  if (typeof raw !== 'string') return { ok: false, error: 'FECHA_NACIMIENTO_INVALIDA' };
  var s = raw.trim();
  if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(s)) return { ok: false, error: 'FECHA_NACIMIENTO_INVALIDA' };
  var p = s.split('-');
  var y = parseInt(p[0], 10), m = parseInt(p[1], 10), d = parseInt(p[2], 10);
  var dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) {
    return { ok: false, error: 'FECHA_NACIMIENTO_INVALIDA' };
  }
  var hoy = new Date();
  var hoyUTC = Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), hoy.getUTCDate());
  if (dt.getTime() > hoyUTC) return { ok: false, error: 'FECHA_NACIMIENTO_FUTURA' };
  var edad = Math.floor((hoyUTC - dt.getTime()) / (365.25 * 86400000));
  if (edad < EDAD_MINIMA) return { ok: false, error: 'EDAD_MINIMA_NO_CUMPLIDA' };
  if (edad > EDAD_MAXIMA) return { ok: false, error: 'EDAD_MAXIMA_EXCEDIDA' };
  return { ok: true, iso: s, edad: edad };
}

// Pasaporte = checklist COMBINADO de completitud del perfil (10 datos:
// union del checklist 042 + misiones de perfil). Calculado SIEMPRE en
// servidor (el cliente no se lo puede autoconceder).
function contarIntereses(v) {
  var lista = v;
  if (typeof lista === 'string') { try { lista = JSON.parse(lista); } catch (e) { lista = null; } }
  return Array.isArray(lista) ? lista.length : 0;
}
function calcularPasaporte(u, nFotos) {
  var campos = [];
  function add(id, label, ok) { campos.push({ id: id, label: label, ok: !!ok }); }
  var uu = u || {};
  add('foto', 'Foto de perfil',
    (uu.foto_url && String(uu.foto_url).trim()) ||
    (uu.avatar_url && String(uu.avatar_url).trim()) || (nFotos > 0));
  add('nombre', 'Nombre o alias', uu.nombre && String(uu.nombre).trim());
  add('nacimiento', 'Fecha de nacimiento', uu.fecha_nacimiento != null);
  add('ciudad', 'Ciudad base', uu.ciudad_base && String(uu.ciudad_base).trim());
  add('pais', 'Pais base', uu.pais_base && String(uu.pais_base).trim());
  add('bio', 'Bio (minimo 40 caracteres)',
    typeof uu.bio === 'string' && uu.bio.trim().length >= 40);
  add('intereses', 'Intereses (minimo 3)', contarIntereses(uu.intereses) >= 3);
  add('email', 'Email verificado', uu.email_verificado === true);
  add('casa', 'Casa', uu.casa && String(uu.casa).trim());
  add('faccion', 'Faccion', uu.faccion && String(uu.faccion).trim());
  var faltan = campos.filter(function (c) { return !c.ok; });
  return { completo: faltan.length === 0, campos: campos, faltan: faltan.length, total: campos.length };
}

function generarCodigoBilletera() {
  return 'BL' + crypto.randomBytes(8).toString('hex').toUpperCase();
}

// La URL de un recurso del usuario debe pertenecer a SU prefijo de blob
// (ADR-068: usuarios/<uid>/...). Admin puede registrar cualquiera.
function urlPerteneceAlUsuario(url, usuarioId, esAdmin) {
  if (esAdmin) return true;
  var u = String(url || '');
  if (!/^https?:\/\/\S+$/i.test(u) || u.length > 700) return false;
  var uid = String(usuarioId || '');
  if (!uid) return false;
  return u.indexOf('/usuarios/' + uid + '/') !== -1;
}

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
var FROM_EMAIL = 'LATAWEL <noreply@latawel.com>';
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
      // ---- GET: mi_marca (TSK-122 / ADR-107 D2.1) ------------------
      // ADR-107: la marca operada se resuelve por el puntero UNICO
      // usuarios.marca_activa_id (FK compuesta contra marcas(id, usuario_id)).
      // La lectura vieja (WHERE usuario_id LIMIT 1) deja de ser determinista
      // en cuanto cae UNIQUE (usuario_id) en la 058.
      // DEGRADACION (ADR-107 D8): sin la 058 (42703) se conserva la forma de
      // la 027 y se marca degradado:true. Nunca 500.
      if (tipo === 'mi_marca' && (id || req.query.usuario_id)) {
        var mmId = String(id || req.query.usuario_id || '');
        if (!UUID_RE.test(mmId))
          return res.status(400).json({ ok: false, error: 'USUARIO_ID_INVALIDO' });
        var mmCols = 'SELECT m.*, '
          + '(SELECT COUNT(*)::int FROM patrocinios p WHERE p.marca_id=m.id AND p.activo=TRUE) AS total_patrocinios ';
        var mmDegradado = false;
        var mmRows;
        try {
          mmRows = await sql(
            mmCols
            + 'FROM marcas m JOIN usuarios u ON u.id = m.usuario_id '
            + 'WHERE u.id = $1::uuid AND m.id = u.marca_activa_id LIMIT 1',
            [mmId]
          );
        } catch (eMmPuntero) {
          if (!eMmPuntero || (eMmPuntero.code !== '42703' && eMmPuntero.code !== '42P01'))
            throw eMmPuntero;
          console.warn('[usuarios] mi_marca sin marca_activa_id (' + eMmPuntero.code
            + '): degradado a la forma de la 027');
          mmDegradado = true;
          mmRows = await sql(mmCols + 'FROM marcas m WHERE m.usuario_id = $1 LIMIT 1', [mmId]);
        }
        // ADR-059 / ADR-064 (M-6) + O4-b: se expone el umbral GLOBAL del ALTA
        // (gamificacion_config.marca_nivel_requerido, fallback 5) tanto con
        // marca como sin ella, para que la UI no anuncie un gate distinto al
        // real. data.nivel_requerido sigue siendo el dato POR MARCA.
        var mmNivelReq = await leerMarcaNivelRequerido(sql);
        if (mmRows.length) {
          var mmNr = parseInt(mmRows[0].nivel_requerido, 10);
          mmRows[0].nivel_requerido = (isFinite(mmNr) && mmNr >= 1)
            ? mmNr : mmNivelReq;
          return res.json({
            ok: true,
            data: mmRows[0],
            marca_activa_id: mmRows[0].id || null,
            nivel_requerido: mmNivelReq,
            degradado: mmDegradado
          });
        }
        return res.json({
          ok: true, data: null,
          marca_activa_id: null,
          nivel_requerido: mmNivelReq,
          degradado: mmDegradado
        });
      }

      // ---- GET: marcas_mias (ADR-107 D6) ---------------------------
      // Lista TODAS las marcas del usuario + el puntero de la operada, en una
      // sola ida y vuelta (mi-perfil.html no necesita segunda rama).
      // Publica, con la MISMA exposicion que el mi_marca de hoy.
      // DEGRADACION (ADR-107 D8): sin la 058 -> lista vacia con degradado.
      if (tipo === 'marcas_mias') {
        var mmsId = String(req.query.usuario_id || id || '').trim();
        if (!UUID_RE.test(mmsId))
          return res.status(400).json({ ok: false, error: 'USUARIO_ID_INVALIDO' });
        var mmsCosto = await leerMarcaAltaXp(sql);
        // O4-b: el requisito que se PINTA es el GLOBAL del alta, no la columna
        // por marca (mi-perfil.html lee esta clave raiz).
        var mmsNivelReq = await leerMarcaNivelRequerido(sql);
        try {
          var mmsRows = await sql(
            'SELECT m.id, m.nombre, m.logo_url, m.banner_url, m.descripcion, '
            + 'm.areas_influencia, m.enlaces, m.activa, m.verificada, m.nivel_requerido, '
            + 'm.estado_promo, COALESCE(m.premios_config, \'{}\'::jsonb) AS premios_config, '
            + 'u.marca_activa_id AS marca_activa_id '
            + 'FROM marcas m JOIN usuarios u ON u.id = m.usuario_id '
            + 'WHERE u.id = $1::uuid '
            + 'ORDER BY m.creado_en ASC, m.id ASC',
            [mmsId]
          );
          var mmsActiva = (mmsRows.length && mmsRows[0].marca_activa_id)
            ? String(mmsRows[0].marca_activa_id) : null;
          var mmsData = mmsRows.map(function (r) {
            var o = {};
            for (var k in r) { if (Object.prototype.hasOwnProperty.call(r, k) && k !== 'marca_activa_id') o[k] = r[k]; }
            return o;
          });
          return res.json({
            ok: true,
            data: mmsData,
            marca_activa_id: mmsActiva,
            total: mmsData.length,
            nivel_requerido: mmsNivelReq,
            costo_xp_creacion: mmsCosto,
            degradado: false
          });
        } catch (eMmsMarca) {
          if (!eMmsMarca || (eMmsMarca.code !== '42703' && eMmsMarca.code !== '42P01'))
            throw eMmsMarca;
          console.warn('[usuarios] marcas_mias degradado (' + eMmsMarca.code
            + '): migracion 058 pendiente');
          return res.json({
            ok: true, data: [], marca_activa_id: null, total: 0,
            nivel_requerido: mmsNivelReq,
            costo_xp_creacion: mmsCosto,
            degradado: true
          });
        }
      }

      // ---- GET: mis cartas (Fase 2C, T7.1 / ADR-062) ---------------
      // Coleccion del usuario (?usuario_id) + estado de los gates de
      // grandfathering (cartas_gates) + el requisito por nivel-gate
      // (set completo de cartas_catalogo con nivel_gate IN 10/14/20/25).
      // Requiere la migracion 040; sin ella responde 503 tipado.
      if (tipo === 'cartas_mias') {
        var cmId = String(req.query.usuario_id || '').trim();
        if (!/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(cmId))
          return res.status(400).json({ ok: false, error: 'usuario_id invalido' });
        var cmUsr, cmCartas, cmGates, cmReq, cmMuseo;
        try {
          cmUsr = await sql('SELECT xp_total, nivel_max FROM usuarios WHERE id=$1 LIMIT 1', [cmId]);
          if (!cmUsr.length)
            return res.status(404).json({ ok: false, error: 'Usuario no encontrado' });
          // Retrocompatible: las 9 claves historicas (id, nombre, set_slug,
          // rareza, nivel_gate, es_evento, imagen_url, cantidad, activa) se
          // conservan con el mismo tipo. Lo nuevo va ADEMAS.
          // El LEFT JOIN LATERAL + jsonb_agg garantiza UNA fila por carta: un
          // JOIN plano por carta_id multiplicaba filas desde la 061 (una fila
          // por variante base/shiny).
          cmCartas = await sql(
            'SELECT c.id, c.nombre, c.set_slug, c.rareza, c.nivel_gate, c.es_evento,'
            + ' c.imagen_url, c.emisor_tipo, c.emisor_id, c.marca_id,'
            + ' m.nombre AS marca_nombre, c.descripcion, c.stats_json,'
            + ' c.es_canjeable_qr, c.fusionable,'
            + ' COALESCE(uc.inv, \'[]\'::jsonb) AS variantes'
            + ' FROM cartas_catalogo c'
            + ' LEFT JOIN marcas m ON m.id = c.marca_id'
            + ' LEFT JOIN LATERAL ('
            + '   SELECT jsonb_agg(jsonb_build_object('
            + '     \'variante\', u2.variante, \'cantidad\', u2.cantidad,'
            + '     \'en_museo\', u2.en_museo, \'orden_museo\', u2.orden_museo,'
            + '     \'activa\', u2.activo) ORDER BY u2.variante) AS inv'
            + '   FROM usuarios_cartas u2'
            + '   WHERE u2.usuario_id = $1 AND u2.carta_id = c.id'
            + ' ) uc ON true'
            + ' WHERE c.activo = true'
            + ' ORDER BY c.set_slug ASC, c.nivel_gate ASC NULLS LAST, c.id ASC',
            [cmId]
          );
          cmGates = await sql(
            'SELECT nivel_gate, set_slug, consumido_en FROM cartas_gates'
            + ' WHERE usuario_id = $1 ORDER BY nivel_gate ASC',
            [cmId]
          );
          // El requisito por set cuenta CARTAS DISTINTAS (COUNT DISTINCT), no
          // filas: con variantes, contar filas inflaba el denominador. "Obtenida"
          // = alguna variante en posesion con cantidad >= 1.
          cmReq = await sql(
            'SELECT c.set_slug, c.nivel_gate, COUNT(DISTINCT c.id)::int AS total,'
            + ' COUNT(DISTINCT c.id) FILTER (WHERE uc.activo = true'
            + ' AND uc.cantidad >= 1)::int AS obtenidas'
            + ' FROM cartas_catalogo c'
            + ' LEFT JOIN usuarios_cartas uc ON uc.carta_id = c.id AND uc.usuario_id = $1'
            + ' WHERE c.activo = true AND c.nivel_gate IN (10,14,20,25)'
            + ' GROUP BY c.set_slug, c.nivel_gate ORDER BY c.nivel_gate ASC',
            [cmId]
          );
          // Museo equipado, solo lectura (ADR-003: nada se borra, se desequipa).
          cmMuseo = await sql(
            'SELECT c.id, c.nombre, c.set_slug, c.rareza, c.imagen_url,'
            + ' uc.variante, uc.orden_museo'
            + ' FROM usuarios_cartas uc JOIN cartas_catalogo c ON c.id = uc.carta_id'
            + ' WHERE uc.usuario_id = $1 AND uc.en_museo = true'
            + ' AND uc.activo = true AND uc.cantidad >= 1 AND c.activo = true'
            + ' ORDER BY uc.orden_museo ASC NULLS LAST, c.id ASC LIMIT $2',
            [cmId, MUSEO_TOPE]
          );
        } catch (eCm) {
          if (!eCm || (eCm.code !== '42P01' && eCm.code !== '42703')) throw eCm;
          return responderSchemaPendiente(res, 'cartas_mias', eCm);
        }
        // Agregacion defensiva por carta: neon devuelve jsonb ya parseado, pero
        // si llegara como texto se normaliza aqui (nunca se duplica la carta).
        cmCartas = (cmCartas || []).map(function (c) {
          var vArr = c.variantes;
          if (typeof vArr === 'string') {
            try { vArr = JSON.parse(vArr); } catch (eVc) { vArr = []; }
          }
          if (!Array.isArray(vArr)) vArr = [];
          var vNorm = vArr.map(function (v) {
            var vCant = Number(v && v.cantidad) || 0;
            var vOrden = (v && (v.orden_museo === 0 || v.orden_museo))
              ? Number(v.orden_museo) : null;
            return {
              variante: String((v && v.variante) || CARTA_VARIANTE_DEFECTO),
              cantidad: vCant,
              en_museo: (v && v.en_museo) === true,
              orden_museo: vOrden,
              activa: (v && v.activa) === true
            };
          });
          var vTotal = 0;
          var vPosesion = false;
          vNorm.forEach(function (v) {
            if (v.activa && v.cantidad >= 1) {
              vTotal += v.cantidad;
              vPosesion = true;
            }
          });
          return {
            id: c.id,
            nombre: c.nombre,
            set_slug: c.set_slug,
            rareza: c.rareza,
            nivel_gate: c.nivel_gate,
            es_evento: c.es_evento,
            imagen_url: c.imagen_url,
            cantidad: vTotal,
            activa: vPosesion,
            emisor_tipo: c.emisor_tipo || null,
            emisor_id: c.emisor_id || null,
            marca_id: c.marca_id || null,
            marca_nombre: c.marca_nombre || null,
            descripcion: c.descripcion || null,
            stats_json: c.stats_json || null,
            es_canjeable_qr: c.es_canjeable_qr === true,
            fusionable: c.fusionable === true,
            fusion_coste_xp: CARTA_FUSION_XP,
            variantes: vNorm
          };
        });
        cmReq = cmReq.map(function (r) {
          r.total = Number(r.total) || 0;
          r.obtenidas = Number(r.obtenidas) || 0;
          r.completo = r.obtenidas >= r.total;
          return r;
        });
        return res.json({
          ok: true,
          data: {
            usuario_id: cmId,
            nivel_visible: nivelVisibleDe(cmUsr[0]),
            cartas: cmCartas,
            gates: cmGates,
            requisitos: cmReq,
            museo: cmMuseo || [],
            museo_tope: MUSEO_TOPE
          }
        });
      }

      // ---- GET: museo_cartas (migracion 061) -----------------------------
      // Vitrina de cartas equipadas, de solo lectura, para el perfil publico.
      // PUBLICA: sin JWT ni sesion (misma politica que perfil_publico).
      // Expone SOLO lo equipado: nunca la coleccion completa, cantidad, activo
      // ni el inventario no equipado.
      // NOMBRE DELIBERADO: el tipo museo publico (con guion bajo en medio) ya
      // existe en api/interacciones.js y significa OTRA cosa (arbol de
      // casas/clases del perfil publico, WP-3; lo consumen perfil.html y
      // mi-perfil.html). Aqui no se reutiliza ni se deja alias: un mismo tipo
      // con dos shapes seria una trampa de mantenimiento.
      if (tipo === 'museo_cartas') {
        var mpId = String(req.query.usuario_id || '').trim();
        // Misma validacion UUID que cartas_mias (UUID_RE, linea 405).
        if (!UUID_RE.test(mpId))
          return res.status(400).json({ ok: false, error: 'USUARIO_ID_INVALIDO' });
        var mpRows;
        try {
          // Mismo patron de degradacion que perfil_publico: sin usuarios.foto_url
          // (42703) se reintenta sin la columna en vez de escalar a 503.
          mpRows = await sql(
            'SELECT id, nombre, avatar_url, foto_url, xp_total, nivel_max,'
            + ' perfil_publico FROM usuarios WHERE id=$1 AND activo=true LIMIT 1',
            [mpId]
          );
        } catch (eMpFoto) {
          if (!eMpFoto || eMpFoto.code !== '42703') throw eMpFoto;
          console.error('[usuarios] museo_cartas degradado 42703: ' + eMpFoto.message);
          mpRows = await sql(
            'SELECT id, nombre, avatar_url, xp_total, nivel_max, perfil_publico'
            + ' FROM usuarios WHERE id=$1 AND activo=true LIMIT 1',
            [mpId]
          );
        }
        if (!mpRows.length)
          return res.status(404).json({ ok: false, error: 'Usuario no encontrado' });
        var mpU = mpRows[0];
        var mpNivel = Math.max(calcularNivel(mpU.xp_total).nivel,
          Number(mpU.nivel_max) || 1);
        if (mpU.perfil_publico === false) {
          return res.status(403).json({
            ok: false,
            error: 'PERFIL_PRIVADO',
            data: { nombre: mpU.nombre, nivel: mpNivel }
          });
        }
        var mpCartas;
        try {
          mpCartas = await sql(
            'SELECT c.id, c.nombre, c.rareza, c.set_slug, c.imagen_url,'
            + ' c.descripcion, c.emisor_tipo, m.nombre AS marca_nombre,'
            + ' c.stats_json, uc.variante'
            + ' FROM usuarios_cartas uc JOIN cartas_catalogo c ON c.id = uc.carta_id'
            + ' LEFT JOIN marcas m ON m.id = c.marca_id'
            + ' WHERE uc.usuario_id = $1 AND uc.en_museo = true'
            + ' AND uc.activo = true AND uc.cantidad >= 1 AND c.activo = true'
            + ' ORDER BY uc.orden_museo ASC NULLS LAST, c.id ASC LIMIT $2',
            [mpId, MUSEO_TOPE]
          );
        } catch (eMp) {
          if (!eMp || (eMp.code !== '42P01' && eMp.code !== '42703')) throw eMp;
          return responderSchemaPendiente(res, 'museo_cartas', eMp);
        }
        // Vitrina vacia = 200 con cartas: []. Nunca 404 ni error: el perfil
        // publico no debe romperse por un museo sin equipar.
        var mpLista = (mpCartas || []).map(function (c) {
          return {
            id: c.id,
            nombre: c.nombre,
            rareza: c.rareza,
            variante: String(c.variante || CARTA_VARIANTE_DEFECTO),
            set_slug: c.set_slug,
            imagen_url: c.imagen_url || null,
            descripcion: c.descripcion || null,
            emisor_tipo: c.emisor_tipo || null,
            marca_nombre: c.marca_nombre || null,
            stats_json: c.stats_json || null
          };
        });
        return res.json({
          ok: true,
          data: {
            usuario_id: mpU.id,
            nombre: mpU.nombre,
            avatar_url: mpU.avatar_url || null,
            foto_url: mpU.foto_url || null,
            nivel: mpNivel,
            perfil_publico: true,
            cartas: mpLista,
            museo_tope: MUSEO_TOPE
          }
        });
      }

      // ---- GET: saldo de la moneda secundaria (Fase 2C, T8.1 / ADR-061) --
      // Saldo derivado del ledger "Condor" (CDR): se expone el saldo cacheado
      // de moneda_cuentas y la verificacion defensiva contra SUM(delta) del
      // ledger (cuadra = ambos coinciden). Sin PII. Requiere la 040.
      if (tipo === 'moneda_saldo') {
        var mslId = String(req.query.usuario_id || '').trim();
        if (!/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(mslId))
          return res.status(400).json({ ok: false, error: 'usuario_id invalido' });
        var mslRows;
        try {
          // ADR-086 / TSK-183 (B4, B5): las DOS subconsultas escalares fijan
          // moneda. Sin el filtro, (SELECT saldo FROM moneda_cuentas WHERE
          // usuario_id=$1) devuelve mas de una fila en cuanto haya 3 monedas
          // y PostgreSQL lanza "more than one row returned by a subquery"
          // -> 500 en el perfil; y SUM(delta) sin filtro suma las 3 monedas
          // en un numero que no cuadra con nada, degrada en silencio. El
          // filtro por la moneda vigente conserva la garantia de ADR-061
          // (saldo == SUM(delta) DE ESA MONEDA). Con esquema de 1 moneda el
          // SQL es identico al previo.
          var mslMulti = await soportaMoneda(sql);
          mslRows = await sql(
            'SELECT COALESCE((SELECT saldo FROM moneda_cuentas WHERE usuario_id=$1'
            + (mslMulti ? ' AND moneda = $2' : '') + '), 0) AS saldo,'
            + ' COALESCE((SELECT SUM(delta) FROM moneda_ledger WHERE usuario_id=$1'
            + (mslMulti ? ' AND moneda = $2' : '') + '), 0) AS ledger_sum',
            mslMulti ? [mslId, MONEDA_ACTUAL] : [mslId]
          );
        } catch (eMsl) {
          if (!eMsl || (eMsl.code !== '42P01' && eMsl.code !== '42703')) throw eMsl;
          return responderSchemaPendiente(res, 'moneda_saldo', eMsl);
        }
        var mslSaldo = red2(numXp(mslRows.length ? mslRows[0].saldo : 0));
        var mslLedger = red2(numXp(mslRows.length ? mslRows[0].ledger_sum : 0));
        return res.json({
          ok: true,
          data: {
            usuario_id: mslId,
            moneda: 'CDR',
            saldo: mslSaldo,
            ledger_sum: mslLedger,
            cuadra: mslSaldo === mslLedger
          }
        });
      }

      // ---- GET: mi billetera (migracion 042) ----------------------
      // Agregador de LECTURA (no crea moneda, ADR-018): xp_total + saldo CDR
      // (moneda_ledger) + consumibles (usuarios.capacidades->'consumibles') +
      // el checklist del Pasaporte. Owner-only (sesion firmada). Al completar
      // el Pasaporte crea la billetera de forma IDEMPOTENTE (ON CONFLICT).
      if (tipo === 'billetera_mia') {
        var bmId = String(req.query.usuario_id || '').trim();
        if (!bmId)
          return res.status(400).json({ ok: false, error: 'usuario_id requerido' });
        if (!validarSesionUsuario(req, bmId).ok)
          return res.status(401).json({ ok: false, error: 'SESION_REQUERIDA' });

        var bmUsr = await sql(
          'SELECT id, nombre, foto_url, avatar_url, bio, intereses, fecha_nacimiento,'
          + ' ciudad_base, pais_base, casa, faccion, email_verificado, xp_total, capacidades'
          + ' FROM usuarios WHERE id=$1 LIMIT 1',
          [bmId]
        );
        if (!bmUsr.length) return res.status(404).json({ ok: false, error: 'No encontrado' });
        var bmU = bmUsr[0];

        var bmFotosList = [];
        try {
          bmFotosList = await sql(
            'SELECT id, url, es_principal, orden FROM usuario_fotos'
            + ' WHERE usuario_id=$1 AND activo=true ORDER BY es_principal DESC, orden ASC, creado_en ASC',
            [bmId]
          );
        } catch (eFotos) {
          if (!eFotos || (eFotos.code !== '42P01' && eFotos.code !== '42703')) throw eFotos;
          bmFotosList = bmU.foto_url ? [{ id: null, url: bmU.foto_url, es_principal: true, orden: 0 }] : [];
        }
        var bmFotos = bmFotosList.length;

        var bmPasaporte = calcularPasaporte(bmU, bmFotos);

        // v26: SELLADO. La fila en billeteras ES el sello: si existio, el
        // pasaporte se completo alguna vez y no se revierte aunque hoy falte
        // un dato. completo (verdad del calculo) NO se falsea nunca.
        var bmSelloFila = null;
        if (bmPasaporte.completo) {
          bmPasaporte.sellado = true;
        } else {
          try {
            var bmSelloSel = await sql(
              'SELECT id, codigo_publico, estado, creada_en FROM billeteras WHERE usuario_id=$1 LIMIT 1',
              [bmId]
            );
            if (bmSelloSel.length) {
              bmSelloFila = bmSelloSel[0];
              bmPasaporte.sellado = true;
            } else {
              bmPasaporte.sellado = false;
            }
          } catch (eSello) {
            if (!eSello || (eSello.code !== '42P01' && eSello.code !== '42703')) throw eSello;
            bmPasaporte.sellado = false;
          }
        }

        var bmCdr = 0;
        try {
          // ADR-086 / TSK-183 (B4): segunda subconsulta escalar del mismo
          // fallo. Sin filtro de moneda devuelve una fila arbitraria de las
          // 3, y COALESCE(...,0) la convierte en un saldo mostrado que no
          // cuadra con nada. Lectura pura: no escribe ni toca xp_total
          // (ADR-018).
          var bmMulti = await soportaMoneda(sql);
          var bmCdrRows = await sql(
            'SELECT COALESCE((SELECT saldo FROM moneda_cuentas WHERE usuario_id=$1'
            + (bmMulti ? ' AND moneda = $2' : '') + '), 0) AS saldo',
            bmMulti ? [bmId, MONEDA_ACTUAL] : [bmId]
          );
          bmCdr = red2(numXp(bmCdrRows.length ? bmCdrRows[0].saldo : 0));
        } catch (eCdr) {
          if (!eCdr || (eCdr.code !== '42P01' && eCdr.code !== '42703')) throw eCdr;
          bmCdr = 0;
        }

        var bmConsumibles = [];
        try {
          var cap = bmU.capacidades;
          if (typeof cap === 'string') { try { cap = JSON.parse(cap); } catch (eCap) { cap = null; } }
          var inv = cap && cap.consumibles && typeof cap.consumibles === 'object' ? cap.consumibles : null;
          if (inv) {
            Object.keys(inv).forEach(function (k) {
              var n = parseInt(inv[k], 10);
              if (isFinite(n) && n > 0) bmConsumibles.push({ slug: k, cantidad: n });
            });
          }
        } catch (eInv) { bmConsumibles = []; }

        var bmBilletera = null;
        if (bmPasaporte.sellado) {
          // v26: si el sello ya venia de una fila previa, se reutiliza esa
          // fila y no se vuelve a consultar.
          if (bmSelloFila) {
            bmBilletera = bmSelloFila;
          } else {
            try {
              var bmIns = await sql(
                'INSERT INTO billeteras (usuario_id, codigo_publico)'
                + ' VALUES ($1, $2) ON CONFLICT (usuario_id) DO NOTHING'
                + ' RETURNING id, codigo_publico, estado, creada_en',
                [bmId, generarCodigoBilletera()]
              );
              if (bmIns.length) {
                bmBilletera = bmIns[0];
              } else {
                var bmSel = await sql(
                  'SELECT id, codigo_publico, estado, creada_en FROM billeteras WHERE usuario_id=$1 LIMIT 1',
                  [bmId]
                );
                bmBilletera = bmSel.length ? bmSel[0] : null;
              }
            } catch (eBil) {
              if (!eBil || (eBil.code !== '42P01' && eBil.code !== '42703')) throw eBil;
              bmBilletera = null;
            }
          }
        }

        return res.json({
          ok: true,
          data: {
            usuario_id: bmId,
            xp_total: red2(numXp(bmU.xp_total)),
            moneda: 'CDR',
            cdr_saldo: bmCdr,
            consumibles: bmConsumibles,
            fotos: bmFotosList,
            pasaporte: bmPasaporte,
            billetera: bmBilletera
          }
        });
      }

      // ---- GET: hoja de vida del artista (Fase 2C, T9.1 / ADR-064) --
      // Vista publica DERIVADA (solo lectura): vocaciones, obras (album_fotos
      // visible=true de tipo foto/video/audio), resenas largas, logros
      // (usuarios.progreso_logros), contratos P2P completados y patrocinios
      // recibidos, + metadatos usuarios.artista_cv. NO persiste scores y NO
      // expone PII (ni email ni auth_id). Cada seccion degrada a [] si su
      // tabla falta (nunca rompe la lectura del perfil).
      if (tipo === 'artista_cv') {
        var acvId = String(req.query.usuario_id || '').trim();
        if (!/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(acvId))
          return res.status(400).json({ ok: false, error: 'usuario_id invalido' });
        var acvUsr = await sql(
          'SELECT id, nombre, avatar_url, foto_url, bio, ciudad_base, pais_base,'
          + ' xp_total, nivel_max, vocaciones, progreso_logros, artista_cv'
          + ' FROM usuarios WHERE id=$1 AND activo=true LIMIT 1',
          [acvId]
        );
        if (!acvUsr.length)
          return res.status(404).json({ ok: false, error: 'Usuario no encontrado' });
        var acvU = acvUsr[0];
        var acvObras = await sql(
          'SELECT af.id, af.foto_url, af.foto_type, af.media_title, af.creado_en'
          + ' FROM album_fotos af'
          + ' WHERE af.agregador_id=$1 AND af.foto_type IN (\'foto\',\'video\',\'audio\')'
          + ' AND af.visible=true AND af.activo=true'
          + ' ORDER BY af.creado_en DESC LIMIT 100',
          [acvId]
        ).catch(function (eO) {
          console.warn('[artista_cv] obras no leidas: ' + (eO && eO.message));
          return [];
        });
        var acvResenas = await sql(
          'SELECT i.id, i.destino_id, i.rating, i.texto, i.creado_en,'
          + ' d.nombre AS destino_nombre, d.slug AS destino_slug'
          + ' FROM interacciones i'
          + ' LEFT JOIN destinos d ON d.id = i.destino_id'
          + ' WHERE i.usuario_id=$1 AND i.tipo=\'resena\' AND i.activo=true'
          + ' AND LENGTH(TRIM(COALESCE(i.texto, \'\'))) > 50'
          + ' ORDER BY i.creado_en DESC LIMIT 50',
          [acvId]
        ).catch(function (eR) {
          console.warn('[artista_cv] resenas no leidas: ' + (eR && eR.message));
          return [];
        });
        var acvContratos = await sql(
          'SELECT id, tipo_encargo, recompensa_xp, estado, creado_en, actualizado_en'
          + ' FROM contratos_p2p'
          + ' WHERE estado=\'completado\' AND (contratado_id=$1 OR empleador_id=$1)'
          + ' ORDER BY actualizado_en DESC LIMIT 50',
          [acvId]
        ).catch(function (eC) {
          console.warn('[artista_cv] contratos no leidos: ' + (eC && eC.message));
          return [];
        });
        var acvPatrocinios = await sql(
          'SELECT p.id, p.marca_id, m.nombre AS marca_nombre, m.logo_url AS marca_logo,'
          + ' p.xp_aportada, p.fama_bonus, p.creado_en'
          + ' FROM patrocinios p JOIN marcas m ON m.id = p.marca_id'
          + ' WHERE p.activo=true AND p.tipo_objetivo=\'artista\' AND p.objetivo_id=$1'
          + ' ORDER BY p.creado_en DESC LIMIT 50',
          [acvId]
        ).catch(function (eP) {
          console.warn('[artista_cv] patrocinios no leidos: ' + (eP && eP.message));
          return [];
        });
        var acvVoc = acvU.vocaciones || {};
        var acvLogrosProg = acvU.progreso_logros || {};
        var acvMeta = acvU.artista_cv || {};
        return res.json({
          ok: true,
          data: {
            artista: {
              id: acvU.id,
              nombre: acvU.nombre,
              avatar_url: acvU.avatar_url || null,
              foto_url: acvU.foto_url || null,
              bio: acvU.bio || null,
              ciudad_base: acvU.ciudad_base || null,
              pais_base: acvU.pais_base || null,
              xp_total: red2(numXp(acvU.xp_total)),
              nivel_visible: nivelVisibleDe(acvU),
              era: calcularEra(nivelVisibleDe(acvU))
            },
            metadatos: {
              bio: (acvMeta.bio !== undefined ? acvMeta.bio : ''),
              ciudad: (acvMeta.ciudad !== undefined ? acvMeta.ciudad : ''),
              destacado: (acvMeta.destacado === true)
            },
            vocaciones: Object.keys(acvVoc),
            obras: acvObras,
            resenas: acvResenas,
            logros: Object.keys(acvLogrosProg).map(function (k) {
              var v = acvLogrosProg[k];
              return { id: k, obtenido: (v && typeof v === 'object') ? (v.obtenido || null) : null };
            }),
            contratos: acvContratos,
            patrocinios: acvPatrocinios,
            totales: {
              obras: acvObras.length,
              resenas: acvResenas.length,
              logros: Object.keys(acvLogrosProg).length,
              contratos: acvContratos.length,
              patrocinios: acvPatrocinios.length,
              vocaciones: Object.keys(acvVoc).length
            }
          }
        });
      }

      if (tipo === 'leaderboard') {
        // ADR-086: entra porque comparte el MECANISMO (score compuesto en
        // query con LEFT JOIN a agregados), no porque use PARTITION BY. Con
        // el score CTE cableado pasa a estar expuesta a la misma
        // multiplicacion de filas, luego necesita el mismo DISTINCT ON y el
        // mismo id ASC de desempate; el LIMIT es el patron Top-N, no una
        // tercera via. B3 lo exige en las 4 ordenaciones, no solo en las 2
        // particionadas. Con gamma = 0 el orden es IDENTICO al de HEAD
        // (xp_total DESC), y el id ASC solo hace determinista lo que antes
        // era arbitrario en los empates.
        var lbCols = 'id, nombre, avatar_url, perfil_tipo, xp_total, nivel,'
          + ' badge_actual, nivel_max, total_resenas, total_guardados, activo';
        var lbParams = [parseInt(limit)];
        var lbRows = await sqlConDegradacion(sql, 'leaderboard', [
          { sql: scoreCteSql(lbCols) + 'SELECT ' + lbCols
            + ' FROM scored WHERE activo = true'
            + ' ORDER BY ' + SCORE_ORDEN + ' LIMIT $1',
            params: lbParams,
            nota: 'XP puro (gamma forzado a 0)' },
          { sql: 'SELECT ' + lbCols + ' FROM usuarios WHERE activo = true'
            + ' ORDER BY xp_total DESC LIMIT $1',
            params: lbParams,
            nota: 'XP puro sin score' }
        ]);
        const countRows = await sql(
          'SELECT COUNT(*)::int AS n FROM usuarios WHERE activo = true'
        );
        // 'activo' entra solo para el WHERE de la CTE; no se expone.
        return res.json({ ok: true, data: lbRows.map(function (r) {
          var o = conNivel(r);
          delete o.activo;
          return o;
        }), total: parseInt(countRows[0].n || 0) });
      }
      if (tipo === 'buscar' || req.query.buscar) {
        // Solo admin: la proyeccion incluye email (PII) y el buscador por
        // email no debe ser enumerable por cualquiera. admin.html ya envia
        // _adminHeaders() (Authorization: Bearer ADMIN_SECRET).
        if (!esAdminUsuario(req)) return denegarUsuario(res, 'usuarios_admin');
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
        // ADR-086: el TOP entra por la CTE 'score', que devuelve UNA fila por
        // usuario por construccion (GROUP BY usuario_id en cada agregado)
        // y cablea DISTINCT ON (u.id) ... ORDER BY u.id, xp_total DESC para
        // que la fila que sobreviva sea determinista. El id ASC final del
        // ORDER BY de la ventana es el desempate de los empates de
        // xp_total/score, que antes dependian del plan del planner.
        var frCols = 'id, nombre, avatar_url, faccion, xp_total';
        var frTop = await sqlConDegradacion(sql, 'faccion_ranking/top', [
          { sql: scoreCteSql(frCols)
            + ' SELECT id, nombre, avatar_url, faccion, xp_total FROM ('
            + ' SELECT id, nombre, avatar_url, faccion, xp_total,'
            + ' ROW_NUMBER() OVER (PARTITION BY faccion ORDER BY ' + SCORE_ORDEN
            + ') AS pos FROM scored WHERE faccion IS NOT NULL'
            + ' ) t WHERE t.pos <= 3 ORDER BY t.faccion, t.pos',
            nota: 'XP puro (gamma forzado a 0)' },
          { sql: 'SELECT id, nombre, avatar_url, faccion, xp_total FROM ('
            + 'SELECT id, nombre, avatar_url, faccion, xp_total, '
            + 'ROW_NUMBER() OVER (PARTITION BY faccion ORDER BY xp_total DESC) AS pos '
            + 'FROM usuarios WHERE faccion IS NOT NULL'
            + ') t WHERE t.pos <= 3 ORDER BY t.faccion, t.xp_total DESC',
            nota: 'XP puro sin score' }
        ]);
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
          return 'SELECT g.casa, g.miembros, g.miembros_activos,'
            + ' g.xp_total, g.xp_promedio,'
            // FIX O1 (WP-6): el conteo de aprobados exige ao.activo=true
            // ademas del quorum (+3), para no contar propuestas
            // soft-deleted en el ranking de Casas.
            + ' (SELECT COUNT(*)::int FROM activos_ocultos ao'
            + '   WHERE (ao.votos_favor - ao.votos_contra) >= 3'
            + '   AND ao.activo = true'
            + '   AND ao.propuesto_por IN (SELECT id FROM usuarios WHERE casa=g.casa)) AS activos_ocultos_aprobados,'
            + ' (SELECT COUNT(*)::int FROM activos_ocultos_checkins aoc'
            + '   JOIN usuarios u2 ON u2.id = aoc.usuario_id'
            + '   WHERE u2.casa = g.casa AND aoc.activo = true'
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
            // ADR-086 (moneda_cuentas pasa a 1..N por usuario): los agregados se
            // calculan en una derivacion que SOLO toca usuarios y colapsa a
            // una fila por usuarios.id; el cofre (1:1 por PRIMARY KEY casa)
            // entra DESPUES, ya agregado. Asi ningun JOIN 1:N puede
            // multiplicar miembros, miembros_activos ni xp_total, ni por
            // cascada pct, multiplicador_xp y fee_mercado_interno. Nota: no
            // se usa SUM(DISTINCT xp_total) porque colapsaria dos usuarios
            // distintos con el mismo XP.
            + ' FROM (SELECT u.casa,'
            + ' COUNT(*)::int AS miembros,'
            + (filtroAct
                ? ' COUNT(*) FILTER (WHERE u.activo_30d)::int AS miembros_activos,'
                : ' 0::int AS miembros_activos,')
            + ' COALESCE(ROUND(SUM(u.xp_total), 2), 0) AS xp_total,'
            + ' COALESCE(ROUND(SUM(u.xp_total) / GREATEST(COUNT(*), 1), 2), 0) AS xp_promedio'
            + ' FROM (SELECT DISTINCT u.id AS id, u.casa AS casa, u.xp_total AS xp_total,'
            + (filtroAct
                ? ' (' + filtroAct + ') AS activo_30d'
                : ' true AS activo_30d')
            + ' FROM usuarios u) u'
            + ' WHERE u.casa IS NOT NULL'
            + ' GROUP BY u.casa) g'
            + (conCofre ? ' LEFT JOIN casas_cofre ct ON ct.casa = g.casa' : '')
            + ' GROUP BY g.casa, g.miembros, g.miembros_activos, g.xp_total, g.xp_promedio'
            + (conCofre ? ', ct.xp_cofre_total, ct.factor_conversion' : '')
            + (conCofre && conLider ? ', ct.lider_user_id, ct.tributo_pct' : '')
            + ' ORDER BY g.xp_total DESC';
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
        // ADR-086: espejo de faccion_ranking. Misma CTE 'score' con DISTINCT ON
        // (u.id) antes del PARTITION BY casa, y mismo id ASC de desempate.
        var crColsTop = 'id, nombre, avatar_url, casa, xp_total';
        var crTop = await sqlConDegradacion(sql, 'casa_ranking/top', [
          { sql: scoreCteSql(crColsTop)
            + ' SELECT id, nombre, avatar_url, casa, xp_total FROM ('
            + ' SELECT id, nombre, avatar_url, casa, xp_total,'
            + ' ROW_NUMBER() OVER (PARTITION BY casa ORDER BY ' + SCORE_ORDEN
            + ') AS pos FROM scored WHERE casa IS NOT NULL'
            + ' ) t WHERE t.pos <= 5 ORDER BY t.casa, t.pos',
            nota: 'XP puro (gamma forzado a 0)' },
          { sql: 'SELECT id, nombre, avatar_url, casa, xp_total FROM ('
            + 'SELECT id, nombre, avatar_url, casa, xp_total, '
            + 'ROW_NUMBER() OVER (PARTITION BY casa ORDER BY xp_total DESC) AS pos '
            + 'FROM usuarios WHERE casa IS NOT NULL'
            + ') t WHERE t.pos <= 5 ORDER BY t.casa, t.xp_total DESC',
            nota: 'XP puro sin score' }
        ]);
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
        // TSK-185 / ADR-086: son DOS invariantes y se escriben los dos.
        // (1) xp_total >= COSTO: el SET resta de xp_total, luego esta es la
        //     guarda de que el debito no deja la coluna del XP ganado (la
        //     verdad de ADR-018 y la base del nivel) por debajo de 0.
        // (2) GREATEST(xp_total - COALESCE(xp_gastado_sinks,0),0) >= COSTO:
        //     el disponible real, con lo ya comprometido en sumideros
        //     descontado y acotado a 0 (TSK-185). Sin (2) el gasto de
        //     sumidero se gastaba dos veces del mismo numero.
        // (2) implica (1) porque xp_gastado_sinks >= 0, pero (1) se mantiene
        // explicita: es un invariante propio (el almacen) y lo asertan las
        // regresiones de ADR-053 Dec 10.
        // El clamp NO habilita la compra con 0: ambas comparan contra el
        // COSTO (800 > 0), luego disponible 0 cae por la misma rama que un
        // disponible negativo -> 402 PUNTOS_INSUFICIENTES.
        var feCambio = await sql(
          'UPDATE usuarios SET xp_total = xp_total - ' + COSTO_FACCION + ', faccion=$2, faccion_elegida_en=NOW() '
          + 'WHERE id=$1 AND xp_total >= ' + COSTO_FACCION + ' '
          + 'AND GREATEST(xp_total - COALESCE(xp_gastado_sinks, 0), 0) >= ' + COSTO_FACCION + ' '
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
      // (2) la primera eleccion exige nivel DERIVADO >= 5 (ADR-059; antes 2).
      // Primera eleccion:
      // gratis (WHERE casa IS NULL). Cambio: cuesta COSTO_CASA (500)
      // xp_total (debito atomico con WHERE de DISPONIBLE acotado a 0 >= COSTO_CASA, patron de
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
        // ADR-059: Casa @nivel 5 (sube de 2 a 5). Se evalua sobre el nivel
        // DERIVADO de xp_total (calcularNivel), nunca sobre usuarios.nivel.
        if (ceNivelAnt < 5)
          return res.status(403).json({ ok: false, error: 'NIVEL_INSUFICIENTE', nivel: ceNivelAnt, nivel_requerido: 5 });
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
        // TSK-185 / ADR-086: los dos invariantes de arriba (xp_total >= COSTO_CASA y
        // disponible >= COSTO_CASA). Un disponible acotado a 0 NO compra:
        // 0 >= 500 es falso, luego el borde exacto en 0 rechaza.
        var ceCambio = await sql(
          'UPDATE usuarios SET xp_total = xp_total - ' + COSTO_CASA + ', casa=$2, casa_elegida_en=NOW() '
          + 'WHERE id=$1 AND xp_total >= ' + COSTO_CASA + ' '
          + 'AND GREATEST(xp_total - COALESCE(xp_gastado_sinks, 0), 0) >= ' + COSTO_CASA + ' '
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
      // XP + cooldown de 30 dias via clase_elegida_en (ADR-053 Decision 10).
      // ADR-059: la PRIMERA eleccion de Clase exige nivel DERIVADO >= 3
      // (primera gratis, WHERE clase_id IS NULL); el RECAMBIO no lleva gate
      // adicional. NO toca el
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
        // ADR-059 (E2): gate SOLO para la PRIMERA eleccion (clase_id IS NULL).
        // Quien ya tiene Clase (recambio) mantiene el flujo actual sin gate.
        if (!clFila[0].clase_id && clNivelAnt < 3)
          return res.status(403).json({ ok: false, error: 'NIVEL_INSUFICIENTE', nivel: clNivelAnt, nivel_requerido: 3 });
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
        // TSK-185 / ADR-086: los dos invariantes de arriba (xp_total >= COSTO_CLASE y
        // disponible >= COSTO_CLASE). Un disponible acotado a 0 NO compra:
        // 0 >= 500 es falso, luego el borde exacto en 0 rechaza.
        var clCambio = await sql(
          'UPDATE usuarios SET xp_total = xp_total - ' + COSTO_CLASE + ', clase_id=$2, nivel_clase=1, xp_clase=0, '
          + 'clase_elegida_en=NOW() '
          + 'WHERE id=$1 AND xp_total >= ' + COSTO_CLASE + ' '
          + 'AND GREATEST(xp_total - COALESCE(xp_gastado_sinks, 0), 0) >= ' + COSTO_CLASE + ' '
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
        var puFechaSeteada = false;
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

        // fecha_nacimiento (migracion 042; PII, editable UNA sola vez)
        if (c.fecha_nacimiento !== undefined) {
          var puFechaPrev = await sql('SELECT fecha_nacimiento FROM usuarios WHERE id=$1', [puId]);
          if (!puFechaPrev.length)
            return res.status(404).json({ ok: false, error: 'Usuario no encontrado' });
          if (puFechaPrev[0].fecha_nacimiento)
            return res.status(409).json({ ok: false, error: 'FECHA_NACIMIENTO_BLOQUEADA' });
          var puFecha = parseFechaNacimiento(c.fecha_nacimiento);
          if (!puFecha.ok)
            return res.status(400).json({ ok: false, error: puFecha.error });
          puFechaSeteada = true;
          puSets.push('fecha_nacimiento = ' + puPh(puFecha.iso) + '::date');
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
          + ' WHERE id=$' + puParams.length
          + (puFechaSeteada ? ' AND fecha_nacimiento IS NULL' : '')
          + ' RETURNING *',
          puParams
        );
        if (!puUpd.length) {
          if (puFechaSeteada)
            return res.status(409).json({ ok: false, error: 'FECHA_NACIMIENTO_BLOQUEADA' });
          return res.status(404).json({ ok: false, error: 'Usuario no encontrado' });
        }

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

      // ---- Rama: galeria de fotos de perfil (migracion 042) --------
      // Tope 10 ACTIVAS forzado de forma atomica (INSERT ... SELECT ... WHERE
      // count<10). La URL debe pertenecer al prefijo de blob del usuario
      // (ADR-068), salvo admin. Toda baja es activo=false (ADR-003).
      if (c.tipo === 'foto_agregar') {
        var faId = String(c.usuario_id || '');
        if (!faId) return res.status(400).json({ ok: false, error: 'usuario_id requerido' });
        if (!validarSesionUsuario(req, faId).ok)
          return res.status(401).json({ ok: false, error: 'SESION_REQUERIDA' });
        var faEsAdmin = esAdminUsuario(req);
        var faUrl = (typeof c.url === 'string') ? c.url.trim() : '';
        if (!urlPerteneceAlUsuario(faUrl, faId, faEsAdmin))
          return res.status(400).json({ ok: false, error: 'URL_NO_AUTORIZADA' });
        var faPrincipal = c.es_principal === true;
        var faPeso = (c.peso_bytes !== undefined && isFinite(parseInt(c.peso_bytes, 10)))
          ? parseInt(c.peso_bytes, 10) : null;
        try {
          if (faPrincipal) {
            await sql('UPDATE usuario_fotos SET es_principal=false WHERE usuario_id=$1 AND activo=true AND es_principal=true', [faId]);
          }
          var faIns = await sql(
            'INSERT INTO usuario_fotos (usuario_id, url, orden, es_principal, peso_bytes)'
            + ' SELECT $1, $2, COALESCE((SELECT MAX(orden)+1 FROM usuario_fotos WHERE usuario_id=$1 AND activo=true), 0), $3, $4'
            + ' WHERE (SELECT COUNT(*) FROM usuario_fotos WHERE usuario_id=$1 AND activo=true) < ' + MAX_FOTOS_PERFIL
            + ' RETURNING id, url, es_principal, orden, creado_en',
            [faId, faUrl, faPrincipal, faPeso]
          );
          if (!faIns.length)
            return res.status(409).json({ ok: false, error: 'LIMITE_FOTOS_PERFIL' });
          if (faPrincipal) {
            await sql('UPDATE usuarios SET foto_url=$1 WHERE id=$2', [faUrl, faId]);
          }
          return res.json({ ok: true, data: faIns[0] });
        } catch (eFa) {
          if (!eFa || (eFa.code !== '42P01' && eFa.code !== '42703')) throw eFa;
          return responderSchemaPendiente(res, 'foto_agregar', eFa);
        }
      }

      if (c.tipo === 'foto_principal') {
        var fpId = String(c.usuario_id || '');
        var fpFoto = String(c.foto_id || '');
        if (!fpId || !fpFoto)
          return res.status(400).json({ ok: false, error: 'usuario_id y foto_id requeridos' });
        if (!validarSesionUsuario(req, fpId).ok)
          return res.status(401).json({ ok: false, error: 'SESION_REQUERIDA' });
        try {
          await sql('UPDATE usuario_fotos SET es_principal=false WHERE usuario_id=$1 AND activo=true AND es_principal=true', [fpId]);
          var fpUpd = await sql(
            'UPDATE usuario_fotos SET es_principal=true WHERE id=$1 AND usuario_id=$2 AND activo=true RETURNING url',
            [fpFoto, fpId]
          );
          if (!fpUpd.length) return res.status(404).json({ ok: false, error: 'FOTO_NO_ENCONTRADA' });
          await sql('UPDATE usuarios SET foto_url=$1 WHERE id=$2', [fpUpd[0].url, fpId]);
          return res.json({ ok: true, data: { foto_id: fpFoto, foto_url: fpUpd[0].url } });
        } catch (eFp) {
          if (!eFp || (eFp.code !== '42P01' && eFp.code !== '42703')) throw eFp;
          return responderSchemaPendiente(res, 'foto_principal', eFp);
        }
      }

      if (c.tipo === 'foto_quitar') {
        var fqId = String(c.usuario_id || '');
        var fqFoto = String(c.foto_id || '');
        if (!fqId || !fqFoto)
          return res.status(400).json({ ok: false, error: 'usuario_id y foto_id requeridos' });
        if (!validarSesionUsuario(req, fqId).ok)
          return res.status(401).json({ ok: false, error: 'SESION_REQUERIDA' });
        try {
          var fqUpd = await sql(
            'UPDATE usuario_fotos SET activo=false, es_principal=false'
            + ' WHERE id=$1 AND usuario_id=$2 AND activo=true RETURNING es_principal',
            [fqFoto, fqId]
          );
          if (!fqUpd.length) return res.status(404).json({ ok: false, error: 'FOTO_NO_ENCONTRADA' });
          var fqSig = await sql(
            'SELECT id, url FROM usuario_fotos WHERE usuario_id=$1 AND activo=true'
            + ' ORDER BY es_principal DESC, orden ASC, creado_en ASC LIMIT 1',
            [fqId]
          );
          if (fqSig.length) {
            await sql('UPDATE usuario_fotos SET es_principal=true WHERE id=$1', [fqSig[0].id]);
            await sql('UPDATE usuarios SET foto_url=$1 WHERE id=$2', [fqSig[0].url, fqId]);
          } else {
            await sql('UPDATE usuarios SET foto_url=NULL WHERE id=$1', [fqId]);
          }
          return res.json({ ok: true, data: { foto_id: fqFoto, activo: false } });
        } catch (eFq) {
          if (!eFq || (eFq.code !== '42P01' && eFq.code !== '42703')) throw eFq;
          return responderSchemaPendiente(res, 'foto_quitar', eFq);
        }
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
          + '<h2 style="color:#FF4A00">Verifica tu correo en LATAWEL</h2>'
          + '<p>Hola,</p>'
          + '<p>Para desbloquear la piramide de referidos y las facciones necesitas confirmar tu correo:</p>'
          + '<p><a href="' + evEnlace + '" style="background:#FF4A00;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none">Verificar correo</a></p>'
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
        var evEnvio = await sendEmail(evUpd[0].email, 'Verifica tu correo en LATAWEL', evHtml);
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
        if (!esAdminUsuario(req)) return denegarUsuario(res, 'usuarios_admin');
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

      // ---- Rama: CREAR Marca (ADR-107 D5 / D6 / D15) ---------------
      // POST { tipo:'marca_crear', usuario_id, nombre, logo_url?,
      //        banner_url?, descripcion?, areas_influencia?, enlaces? }
      // ADR-107: el ALTA se separa de la EDICION porque tiene gate de nivel
      // (gamificacion_config.marca_nivel_requerido, fallback 5, O4-b) y COSTE
      // en XP (gamificacion_config.marca_alta_xp
      // = 1650, recalibrable sin deploy). El coste NO resta usuarios.xp_total:
      // incrementa xp_gastado_sinks (patron 046:39-44) y deja una fila en
      // xp_ledger con xp_final negativo (mismo shape que tithe_parche), para
      // que calcularNivel() siga siendo MONOTONO (crear no baja de nivel).
      // Sentencia atomica unica (fail-closed): sin fila en d no hay marca.
      if (c.tipo === 'marca_crear') {
        var mcUid = String(c.usuario_id || '');
        if (!mcUid) return res.status(400).json({ ok: false, error: 'usuario_id requerido' });
        if (!UUID_RE.test(mcUid))
          return res.status(400).json({ ok: false, error: 'USUARIO_ID_INVALIDO' });
        var mcJwt = validarSesionUsuario(req, mcUid);
        if (!mcJwt || !mcJwt.ok) return res.status(401).json({ ok: false, error: 'No autorizado' });
        var mcNombre = String(c.nombre || '').trim().slice(0, 120);
        if (!mcNombre) return res.status(400).json({ ok: false, error: 'nombre requerido' });
        var mcCosto = await leerMarcaAltaXp(sql);
        // O4-b: el gate del alta se decide por el valor GLOBAL configurable,
        // el mismo que mi_marca / marcas_mias devuelven para pintar.
        var mcNivelReq = await leerMarcaNivelRequerido(sql);
        var mcUsr;
        try {
          mcUsr = await sql(
            'SELECT xp_total, xp_gastado_sinks, marca_activa_id::text AS marca_activa_id '
            + 'FROM usuarios WHERE id=$1::uuid LIMIT 1',
            [mcUid]
          );
        } catch (eMcEsq) {
          // ADR-107 D8: crear sin poder fijar el puntero deja un estado
          // incoherente, luego esta escritura NO degrada: 503 tipado.
          if (eMcEsq && (eMcEsq.code === '42703' || eMcEsq.code === '42P01'))
            return responderSchemaPendiente(res, 'marca_crear', eMcEsq,
              'Recurso no disponible (migracion 058 pendiente)');
          throw eMcEsq;
        }
        if (!mcUsr.length)
          return res.status(404).json({ ok: false, error: 'Usuario no encontrado' });
        // El nivel se DERIVA de xp_total (usuarios.nivel esta STALE).
        var mcNivel = calcularNivel(mcUsr[0].xp_total).nivel;
        if (mcNivel < mcNivelReq)
          return res.status(403).json({
            ok: false, error: 'NIVEL_INSUFICIENTE',
            nivel: mcNivel, nivel_requerido: mcNivelReq
          });
        // XP_DISPONIBLE = xp_total - xp_gastado_sinks: la unica vara.
        var mcDisp = red2(Math.max(numXp(mcUsr[0].xp_total) - numXp(mcUsr[0].xp_gastado_sinks), 0));
        if (mcDisp < mcCosto)
          return res.status(403).json({
            ok: false, error: 'XP_INSUFICIENTE',
            xp_disponible: mcDisp, costo_xp: mcCosto
          });
        var mcAreas = c.areas_influencia ? JSON.stringify(c.areas_influencia) : null;
        var mcLinks = c.enlaces ? JSON.stringify(c.enlaces) : null;
        var mcFila = await sql(
          'WITH g AS ('
          + 'SELECT COALESCE(GREATEST(xp_total - COALESCE(xp_gastado_sinks,0),0), -1) AS disp '
          + 'FROM usuarios WHERE id=$1::uuid'
          + '), d AS ('
          + 'UPDATE usuarios u SET xp_gastado_sinks = COALESCE(u.xp_gastado_sinks,0) + $2::numeric '
          + 'FROM g WHERE u.id=$1::uuid AND g.disp >= $2::numeric RETURNING u.id'
          + '), n AS ('
          + 'INSERT INTO marcas (usuario_id, nombre, logo_url, banner_url, descripcion, '
          + 'areas_influencia, enlaces, nivel_requerido) '
          + 'SELECT $1::uuid, $3, $4, $5, $6, COALESCE($7::jsonb,\'[]\'::jsonb), '
          + 'COALESCE($8::jsonb,\'{}\'::jsonb), $9 FROM d '
          + 'ON CONFLICT DO NOTHING RETURNING id, nombre, activa, verificada'
          + '), p AS ('
          + 'UPDATE usuarios u SET marca_activa_id = n.id FROM n WHERE u.id=$1::uuid '
          + 'RETURNING u.marca_activa_id'
          + ') SELECT (SELECT disp FROM g) AS xp_disponible_previo, '
          + '(SELECT id::text FROM n) AS marca_id, '
          + '(SELECT nombre FROM n) AS nombre, '
          + '(SELECT activa FROM n) AS activa, '
          + '(SELECT verificada FROM n) AS verificada',
          [mcUid, mcCosto, mcNombre,
           c.logo_url ? String(c.logo_url).slice(0, 512) : null,
           c.banner_url ? String(c.banner_url).slice(0, 512) : null,
           c.descripcion ? String(c.descripcion).slice(0, 500) : null,
           mcAreas, mcLinks, mcNivelReq]
        );
        if (!mcFila.length || !mcFila[0].marca_id) {
          // Sin fila en d (carrera de XP) -> cero cambios, cero marca.
          var mcDispFin = (mcFila.length && mcFila[0].xp_disponible_previo != null)
            ? red2(Math.max(numXp(mcFila[0].xp_disponible_previo), 0)) : 0;
          return res.status(403).json({
            ok: false, error: 'XP_INSUFICIENTE',
            xp_disponible: mcDispFin, costo_xp: mcCosto
          });
        }
        // Ledger del sink (best-effort: si xp_ledger no existe, el alta vive).
        registrarGastoXp(sql, mcUid, 'marca_crear', mcCosto,
          { marca_id: String(mcFila[0].marca_id), costo: mcCosto });
        return res.json({
          ok: true,
          data: {
            id: mcFila[0].marca_id,
            nombre: mcFila[0].nombre || mcNombre,
            activa: mcFila[0].activa,
            verificada: mcFila[0].verificada
          },
          costo_xp: mcCosto,
          xp_disponible_previo: red2(Math.max(numXp(mcFila[0].xp_disponible_previo), 0)),
          marca_activa_id: String(mcFila[0].marca_id)
        });
      }

      // ---- Rama: fijar la marca ACTIVA (ADR-107 D2 / D6) ----------
      // POST { tipo:'marca_activa_set', usuario_id, marca_id }
      // El puntero usuarios.marca_activa_id es la unica verdad de "que marca
      // estoy operando"; solo puede apuntar a una marca DEL MISMO dueno (la FK
      // compuesta de la 058 lo hace cumplir tambien en la base). Ownership por
      // id AND usuario_id: 404 si no es suya, NUNCA 403 (no se filtra
      // existencia).
      if (c.tipo === 'marca_activa_set') {
        var masUid = String(c.usuario_id || '');
        if (!masUid) return res.status(400).json({ ok: false, error: 'usuario_id requerido' });
        var masJwt = validarSesionUsuario(req, masUid);
        if (!masJwt || !masJwt.ok) return res.status(401).json({ ok: false, error: 'No autorizado' });
        var masMarcaId = String(c.marca_id || '').trim();
        if (!masMarcaId)
          return res.status(400).json({ ok: false, error: 'MARCA_ID_REQUERIDO' });
        if (!UUID_RE.test(masMarcaId))
          return res.status(400).json({ ok: false, error: 'MARCA_ID_INVALIDO' });
        var masFila;
        try {
          masFila = await sql(
            'UPDATE usuarios u SET marca_activa_id = m.id FROM marcas m '
            + 'WHERE u.id = $1::uuid AND m.id = $2::uuid AND m.usuario_id = u.id '
            + 'RETURNING u.marca_activa_id::text AS marca_activa_id',
            [masUid, masMarcaId]
          );
        } catch (eMasEsq) {
          if (eMasEsq && (eMasEsq.code === '42703' || eMasEsq.code === '42P01'))
            return responderSchemaPendiente(res, 'marca_activa_set', eMasEsq,
              'Recurso no disponible (migracion 058 pendiente)');
          throw eMasEsq;
        }
        if (!masFila.length)
          return res.status(404).json({ ok: false, error: 'MARCA_NO_ENCONTRADA' });
        return res.json({ ok: true, marca_activa_id: masFila[0].marca_activa_id });
      }

      // ---- Rama: activar / actualizar Marca del usuario (TSK-120) ---
      // POST { tipo:'marca_activar', usuario_id, marca_id?, nombre, logo_url?,
      //        banner_url?, descripcion?, areas_influencia?, enlaces? }
      // ADR-107 D2.5/D2.4/D6: la lectura previa resuelve por el puntero
      // usuarios.marca_activa_id (con varias marcas, el LEFT JOIN por
      // usuario_id devolvia N filas y elegia arbitraria) y la escritura es un
      // UPDATE acotado por usuario_id. SE ELIMINA el INSERT ... ON CONFLICT
      // (usuario_id): tras el DROP de la 058 no existe constraint equivalente
      // y la sentencia moria con 42P10 en CADA llamada. Crear marca es
      // marca_crear; esta rama solo edita una marca que ya es del usuario.
      // GRANDFATHERING de EDICION intacto: editar no exige nivel.
      // MERGE JSONB: cero reemplazo total (ADR-003).
      if (c.tipo === 'marca_activar') {
        var maUid = String(c.usuario_id || '');
        if (!maUid) return res.status(400).json({ ok: false, error: 'usuario_id requerido' });
        if (!UUID_RE.test(maUid))
          return res.status(400).json({ ok: false, error: 'USUARIO_ID_INVALIDO' });
        var maJwt = validarSesionUsuario(req, maUid);
        if (!maJwt || !maJwt.ok) return res.status(401).json({ ok: false, error: 'No autorizado' });
        var maNombre = String(c.nombre || '').trim().slice(0, 120);
        if (!maNombre) return res.status(400).json({ ok: false, error: 'nombre requerido' });
        var maMarcaId = String(c.marca_id || '').trim();
        if (maMarcaId && !UUID_RE.test(maMarcaId))
          return res.status(400).json({ ok: false, error: 'marca_id invalido' });
        var maUser;
        try {
          maUser = await sql(
            'SELECT u.xp_total, u.marca_activa_id::text AS marca_activa_id, '
            + '(SELECT COUNT(*)::int FROM marcas mm WHERE mm.usuario_id = u.id) AS total_marcas '
            + 'FROM usuarios u WHERE u.id=$1::uuid LIMIT 1',
            [maUid]
          );
        } catch (eMaEsq) {
          // ADR-107 D8: la rama depende del puntero -> 503 si falta la 058.
          if (eMaEsq && (eMaEsq.code === '42703' || eMaEsq.code === '42P01'))
            return responderSchemaPendiente(res, 'marca_activar', eMaEsq,
              'Recurso no disponible (migracion 058 pendiente)');
          throw eMaEsq;
        }
        if (!maUser.length)
          return res.status(404).json({ ok: false, error: 'Usuario no encontrado' });
        var maTotal = parseInt(maUser[0].total_marcas, 10) || 0;
        if (!maTotal)
          return res.status(404).json({ ok: false, error: 'MARCA_NO_ENCONTRADA' });
        if (!maMarcaId && maTotal > 1)
          return res.status(400).json({ ok: false, error: 'marca_id requerido' });
        var maAreas = c.areas_influencia ? JSON.stringify(c.areas_influencia) : null;
        var maLinks = c.enlaces ? JSON.stringify(c.enlaces) : null;
        var maFila = await sql(
          'UPDATE marcas SET '
          + 'nombre = $2, '
          + 'logo_url = COALESCE($3, logo_url), '
          + 'banner_url = COALESCE($4, banner_url), '
          + 'descripcion = COALESCE($5, descripcion), '
          + 'areas_influencia = COALESCE(areas_influencia, \'[]\'::jsonb) || COALESCE($6::jsonb, \'[]\'::jsonb), '
          + 'enlaces = COALESCE(enlaces, \'{}\'::jsonb) || COALESCE($7::jsonb, \'{}\'::jsonb), '
          + 'activa = TRUE '
          + 'WHERE usuario_id = $1::uuid '
          + 'AND id = COALESCE($8::uuid, (SELECT u.marca_activa_id FROM usuarios u WHERE u.id=$1::uuid)) '
          + 'RETURNING id, nombre, activa, verificada',
          [maUid, maNombre,
           c.logo_url ? String(c.logo_url).slice(0, 512) : null,
           c.banner_url ? String(c.banner_url).slice(0, 512) : null,
           c.descripcion ? String(c.descripcion).slice(0, 500) : null,
           maAreas, maLinks,
           maMarcaId || null]
        );
        if (!maFila.length)
          return res.status(404).json({ ok: false, error: 'MARCA_NO_ENCONTRADA' });
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
        // ADR-064: la marca puede patrocinar/capturar un SPOT (presencia de
        // marca verificada); tipo_objetivo='spot' (sin CHECK en la 027/040).
        var TIPOS_VALIDOS = ['evento','artista','parche','mision','spot'];
        if (TIPOS_VALIDOS.indexOf(mpTipo) === -1)
          return res.status(400).json({ ok: false, error: 'tipo_objetivo inv\u00e1lido' });
        // Verificar que la marca es del usuario y esta activa
        // ADR-107 D2 (misma regla de resolucion): la marca que patrocina es la
        // ACTIVA segun el puntero usuarios.marca_activa_id, no una fila
        // arbitraria del usuario. El ADR lista las 5 consultas y no incluye
        // esta; se corrige por coherencia con la MISMA regla. Sin la 058
        // (42703) degrada a la lectura de la 027, que sigue siendo legal.
        var mpMarca;
        try {
          mpMarca = await sql(
            'SELECT m.id FROM marcas m JOIN usuarios u ON u.id = m.usuario_id '
            + 'WHERE u.id = $1 AND m.id = u.marca_activa_id AND m.activa = TRUE',
            [mpUid]
          );
        } catch (eMpMarca) {
          if (!eMpMarca || (eMpMarca.code !== '42703' && eMpMarca.code !== '42P01'))
            throw eMpMarca;
          console.warn('[usuarios] marca_patrocinar sin marca_activa_id (' + eMpMarca.code
            + '): lectura de la 027');
          mpMarca = await sql(
            'SELECT id FROM marcas WHERE usuario_id=$1 AND activa=TRUE LIMIT 1',
            [mpUid]
          );
        }
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

      // ---- POST: registrar el gate de cartas (Fase 2C, T7.2 / ADR-062) --
      // POST { tipo:'cartas_gate', usuario_id, nivel_gate? }
      // El gate alcanzable se determina sobre nivel_visible (A-1 CERRADO).
      // Si el set COMPLETO del set_slug esta en usuarios_cartas (activo=true,
      // cantidad>=1) y no hay fila previa, inserta cartas_gates
      // (grandfathering). Si falta el set -> 403 con la lista de faltantes.
      // Las cartas de gate NO se consumen (solo activan el flag).
      if (c.tipo === 'cartas_gate') {
        var cgUid = String(c.usuario_id || '').trim();
        if (!/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(cgUid))
          return res.status(400).json({ ok: false, error: 'usuario_id invalido' });
        var cgSes = validarSesionUsuario(req, cgUid);
        if (!cgSes.ok)
          return res.status(401).json({ ok: false, error: cgSes.razon });
        var cgUsr, cgSet, cgPrev, cgFalt;
        try {
          cgUsr = await sql('SELECT xp_total, nivel_max FROM usuarios WHERE id=$1 LIMIT 1', [cgUid]);
          if (!cgUsr.length)
            return res.status(404).json({ ok: false, error: 'Usuario no encontrado' });
        } catch (eCgU) {
          if (!eCgU || (eCgU.code !== '42P01' && eCgU.code !== '42703')) throw eCgU;
          return responderSchemaPendiente(res, 'cartas_gate', eCgU);
        }
        var cgNivelVisible = nivelVisibleDe(cgUsr[0]);
        var cgGate = null;
        if (c.nivel_gate !== undefined && c.nivel_gate !== null && String(c.nivel_gate).trim() !== '') {
          var cgGatePedido = parseInt(c.nivel_gate, 10);
          if (CARTAS_GATES_NIVELES.indexOf(cgGatePedido) === -1)
            return res.status(400).json({ ok: false, error: 'nivel_gate invalido (10|14|20|25)' });
          cgGate = cgGatePedido;
        } else {
          // Gate alcanzable mas alto con nivel_visible.
          for (var cgI = 0; cgI < CARTAS_GATES_NIVELES.length; cgI++) {
            if (cgNivelVisible >= CARTAS_GATES_NIVELES[cgI]) cgGate = CARTAS_GATES_NIVELES[cgI];
          }
        }
        if (cgGate === null)
          return res.status(403).json({
            ok: false, error: 'GATE_NO_ALCANZABLE',
            nivel_visible: cgNivelVisible, nivel_gate: null
          });
        // El gate solicitado solo es registrable si nivel_visible ya lo
        // alcanzo (grandfathering A-1: quien llego y gasto XP sigue cubierto).
        if (cgNivelVisible < cgGate)
          return res.status(403).json({
            ok: false, error: 'NIVEL_INSUFICIENTE',
            nivel_visible: cgNivelVisible, nivel_gate: cgGate, nivel_requerido: cgGate
          });
        try {
          cgSet = await sql(
            'SELECT DISTINCT set_slug FROM cartas_catalogo'
            + ' WHERE activo=true AND nivel_gate=$1 ORDER BY set_slug LIMIT 1',
            [cgGate]
          );
          if (!cgSet.length)
            return res.status(404).json({ ok: false, error: 'SET_NO_ENCONTRADO', nivel_gate: cgGate });
          var cgSetSlug = String(cgSet[0].set_slug);
          cgPrev = await sql(
            'SELECT nivel_gate FROM cartas_gates WHERE usuario_id=$1 AND nivel_gate=$2 LIMIT 1',
            [cgUid, cgGate]
          );
          if (cgPrev.length)
            return res.json({
              ok: true, ya_registrado: true, nivel_gate: cgGate,
              set_slug: cgSetSlug, nivel_visible: cgNivelVisible
            });
          cgFalt = await sql(
            'SELECT c.id FROM cartas_catalogo c'
            + ' LEFT JOIN usuarios_cartas uc ON uc.carta_id = c.id AND uc.usuario_id = $1'
            + ' WHERE c.activo=true AND c.nivel_gate=$2'
            + ' AND (uc.activo IS NOT TRUE OR uc.cantidad < 1)'
            + ' ORDER BY c.id ASC',
            [cgUid, cgGate]
          );
          if (cgFalt.length) {
            var cgFaltantes = cgFalt.map(function (f) { return String(f.id); });
            return res.status(403).json({
              ok: false, error: 'SET_INCOMPLETO',
              nivel_gate: cgGate, set_slug: cgSetSlug, faltantes: cgFaltantes
            });
          }
          var cgIns = await sql(
            'INSERT INTO cartas_gates (usuario_id, nivel_gate, set_slug, consumido_en)'
            + ' VALUES ($1, $2, $3, NOW())'
            + ' ON CONFLICT (usuario_id, nivel_gate) DO NOTHING'
            + ' RETURNING nivel_gate, set_slug, consumido_en',
            [cgUid, cgGate, cgSetSlug]
          );
          if (!cgIns.length)
            return res.json({
              ok: true, ya_registrado: true, nivel_gate: cgGate,
              set_slug: cgSetSlug, nivel_visible: cgNivelVisible
            });
          return res.json({
            ok: true, registrado: true, nivel_gate: cgGate,
            set_slug: cgSetSlug, consumido_en: cgIns[0].consumido_en,
            nivel_visible: cgNivelVisible
          });
        } catch (eCg) {
          if (!eCg || (eCg.code !== '42P01' && eCg.code !== '42703')) throw eCg;
          return responderSchemaPendiente(res, 'cartas_gate', eCg);
        }
      }

      // ---- POST: editar la hoja de vida del artista (T9.2 / ADR-064) ----
      // POST { tipo:'artista_cv_editar', usuario_id, bio?, ciudad?, destacado? }
      // Merge JSONB (ADR-003): COALESCE(artista_cv,'{}'::jsonb) || $N::jsonb.
      // Nunca reemplazo total; longitudes acotadas; sesion firmada.
      if (c.tipo === 'artista_cv_editar') {
        var acvEditUid = String(c.usuario_id || '').trim();
        if (!/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(acvEditUid))
          return res.status(400).json({ ok: false, error: 'usuario_id invalido' });
        var acvEditSes = validarSesionUsuario(req, acvEditUid);
        if (!acvEditSes.ok)
          return res.status(401).json({ ok: false, error: acvEditSes.razon });
        var acvMetaRes = construirMetaArtista(c);
        if (acvMetaRes.error)
          return res.status(400).json({ ok: false, error: acvMetaRes.error });
        var acvMetaNueva = acvMetaRes.meta;
        if (!Object.keys(acvMetaNueva).length)
          return res.status(400).json({ ok: false, error: 'NADA_QUE_ACTUALIZAR' });
        var acvEditUpd;
        try {
          acvEditUpd = await sql(
            'UPDATE usuarios SET artista_cv = COALESCE(artista_cv, \'{}\'::jsonb) || $1::jsonb'
            + ' WHERE id=$2 RETURNING artista_cv',
            [JSON.stringify(acvMetaNueva), acvEditUid]
          );
        } catch (eAcvE) {
          if (!eAcvE || (eAcvE.code !== '42P01' && eAcvE.code !== '42703')) throw eAcvE;
          return responderSchemaPendiente(res, 'artista_cv_editar', eAcvE);
        }
        if (!acvEditUpd.length)
          return res.status(404).json({ ok: false, error: 'Usuario no encontrado' });
        return res.json({ ok: true, data: { artista_cv: acvEditUpd[0].artista_cv || {} } });
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