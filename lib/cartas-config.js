// lib/cartas-config.js -- CONSTANTES UNICAS DEL SISTEMA DE CARTAS (ADR-108 D9)
//
// POR QUE VIVE EN lib/ Y NO EN api/: los 8 ficheros de api/ son 8/8 funciones
// serverless (presupuesto Vercel Hobby AGOTADO). Este modulo no es endpoint:
// es la libreria que api/interacciones.js y api/usuarios.js requirean. Vercel
// lo incluye en el bundle por trazado de dependencias (nft), sin consumir
// funcion. Mismo precedente que lib/score.js (modulo compartido, solo
// module.exports, ningun HTML lo carga).
//
// POR QUE EXISTE (Regla de No-Duplicidad / ADR-108 D9): el coste de la fusion
// es un sumidero de XP que se COBRA en el handler (interacciones) y se MUESTRA
// al cliente en la lectura (usuarios: fusion_coste_xp). Si el valor se replica
// en los dos ficheros, cambiar uno deja el otro derivando en silencio y la UI
// anuncia un coste distinto del que se cobra. Una sola fuente, dos lectores.
// El museo (ADR-108 D6/D10) sufre el mismo problema con su tope: el handler
// valida 1..12 y la lectura publica museo_tope.
//
// LO QUE NO CAMBIA AQUI: la AUTORIDAD del tope sigue en la BASE
// (chk_usuarios_cartas_museo + ux_usuarios_cartas_museo_orden). MUSEO_TOPE es
// el espejo numerico del CHECK, no una autorizacion: prohibido usarlo como
// COUNT(*) de decision (D10).
//
// FUNCION PURA Y DETERMINISTA: sin Date, sin red, sin base de datos, sin DOM
// al cargar. ASCII puro (ADR-002).

// Coste plano de la fusion 4 -> 1 (una shiny). Se cobra restando
// usuarios.xp_total con doble guard: el nivel no baja (ADR-018).
var CARTA_FUSION_XP = 200;

// Tope del museo publico: piezas equipadas por usuario (1..12).
var MUSEO_TOPE = 12;

// Variantes validas de una carta. Espeja el CHECK de usuarios_cartas.variante
// (migracion 060: 'base' / 'shiny'). El handler que equipa al museo, el que
// fusiona y el que hace drop VALIDAN el body contra esta lista; la lectura
// publica del museo (museo_cartas) usa la variante por defecto cuando la fila
// no la trae. Una lista, dos lectores: si manana entra una variante nueva, se
// anade aqui y no en tres cadenas de SQL a la vez.
var CARTA_VARIANTES = ['base', 'shiny'];

// Variante por defecto cuando la fila o el body no la declaran. Es el DEFAULT
// de la columna, no una decision de negocio: solo evita devolver null al
// cliente cuando el dato no llega.
var CARTA_VARIANTE_DEFECTO = 'base';

// -- TAXONOMIA DE FAMILIAS DE CARTA (ADR-121; migracion 066) ----------------
// Las 7 familias son un dominio CERRADO y su espejo literal esta en
// chk_cartas_catalogo_familia (066:213-221). El subtipo es dominio cerrado POR
// FAMILIA: chk_cartas_catalogo_subtipo (066:225-239) exige el par exacto, y la
// lista de abajo es ese mismo par, familia por familia. La capa (juego /
// economia / estatus) NO se persiste: se deriva de la familia (spec 2.1).
//
// QUIEN LEE ESTO: api/admin.js (alta y edicion del catalogo) valida el body
// contra estas listas y responde 400 tipado antes de que el CHECK reviente
// como 23514. admin.html lleva un ESPEJO solo para pintar los selects: si una
// lista cambia aqui y no alli, el alta falla con el codigo, nunca en silencio.
var FAMILIAS_CARTA = ['lugar', 'personaje', 'artista', 'marca', 'producto',
                      'consumible', 'cosmetica'];

var SUBTIPOS_CARTA = {
  lugar:      ['territorio', 'patrimonio', 'natural'],
  personaje:  ['historico', 'ficcion', 'folclor'],
  artista:    ['musica', 'cine', 'grafica', 'literatura'],
  marca:      ['licor', 'gastronomia', 'artesania', 'otra'],
  producto:   ['fisico', 'digital'],
  consumible: ['entrada_evento', 'bono', 'servicio'],
  cosmetica:  ['marco', 'fondo', 'insignia']
};

// Ediciones (066:255-261). 'abierta' = sin techo; 'limitada' y 'serial' exigen
// supply_max > 0 (066:263-273). El DEFAULT de la columna es 'abierta'.
var EDICIONES_CARTA = ['abierta', 'limitada', 'serial'];
var CARTA_EDICION_DEFECTO = 'abierta';
var CARTA_EDICIONES_CON_SUPPLY = ['limitada', 'serial'];

// Economia (spec 2.1 regla 2): producto y consumible NO tienen precio_xp
// propio (su precio es el del SKU). El CHECK de la 066 es mas estricto de lo
// que sugiere la spec 4.1: exige precio_xp IS NULL en estas dos familias y
// precio_xp > 0 en el resto (066:243-253). Un 0 literal viola LAS DOS ramas.
var CARTA_FAMILIAS_SIN_PRECIO_XP = ['producto', 'consumible'];

// -- PRECIO DE ACUNACION = base por rareza x multiplicador de familia --------
// Spec 4.2 (punto 5 del ADR-121). Los dos factores viven AQUI porque tienen dos
// lectores (el handler que CREA la carta y la migracion que RECALCULA el
// catalogo): con multiplicadores no enteros (0,5 / 1,2 / 1,5) una copia literal
// en SQL deriva en silencio y dos cartas iguales acaban costando distinto.
// Base aprobada: 150 / 400 / 1000 / 2500.
var CARTA_PRECIO_BASE_XP = { comun: 150, raro: 400, epico: 1000, dorado: 2500 };

// Multiplicadores aprobados (spec 4.2): cosmetica 0,5; lugar 1,0; personaje
// 1,2; artista 1,2; marca 1,5. producto y consumible NO figuran: su precio es
// el del SKU (CARTA_FAMILIAS_SIN_PRECIO_XP) y su precio_xp DEBE ser NULL, por
// eso el helper los devuelve como null en vez de inventarles un precio.
var CARTA_MULT_FAMILIA = {
  lugar: 1.0,
  personaje: 1.2,
  artista: 1.2,
  marca: 1.5,
  cosmetica: 0.5
};

// Precio de acunacion resuelto, o null si la familia NO es acunable (producto,
// consumible o desconocida) o la rareza no existe. Redondeo a 2 decimales
// porque precio_xp es numeric(12,2) (ADR-035; la 068 lo convirtio): el valor
// viaja ya cerrado y el handler solo lo escribe. Funcion PURA: sin Date, sin
// red, sin BD, sin DOM. La AUTORIDAD del cobro sigue siendo el precio_xp de la
// fila (carta_acunar lo lee de la base), no este calculo.
function precioAcunacion(familia, rareza) {
  var f = String(familia == null ? '' : familia).trim().toLowerCase();
  var r = String(rareza == null ? '' : rareza).trim().toLowerCase();
  if (!Object.prototype.hasOwnProperty.call(CARTA_MULT_FAMILIA, f)) return null;
  if (!Object.prototype.hasOwnProperty.call(CARTA_PRECIO_BASE_XP, r)) return null;
  var x = CARTA_PRECIO_BASE_XP[r] * CARTA_MULT_FAMILIA[f];
  return Math.round(x * 100) / 100;
}

// Vector de stats (spec 3.3; chk_cartas_catalogo_stats de 066:319-356).
// Instalado en stats_json; las claves de otros consumidores (sku, volumen_ml,
// set_slug, premio_set) NO son del vector y no se validan aqui.
var CARTA_EJES_STATS = ['alcance', 'oficio', 'fortuna', 'rendimiento', 'presencia'];
var CARTA_STATS_TOPE = 40;

// Subtipos validos de una familia. Devuelve copia para que ningun consumidor
// pueda mutar la lista compartida (una sola fuente, dos lectores).
function subtiposDeFamilia(familia) {
  var lista = SUBTIPOS_CARTA[familia];
  return lista ? lista.slice() : [];
}

// Validador PURO del objeto stats (spec 3.3 + CHECK de la 066). Devuelve ''
// si es valido o el motivo legible. Reglas:
//   - debe ser un objeto plano (el CHECK exige jsonb_typeof = 'object');
//   - cada eje, SI viene, es numero finito entre 0 y el tope 40 (el CHECK
//     compara en jsonb con 0 y 40: un valor fuera de rango revienta 23514);
//   - primario, si viene, es uno de los cinco ejes;
//   - bonus_xp_pct queda TOLERADA e inerte (ADR-003): prohibirla obligaria a
//     borrar la clave de las filas que la tienen. Si viene, solo se exige
//     numerica. El MERGE de la edicion la conserva (nunca se reemplaza).
// Sin Date, sin red, sin BD, sin DOM (determinista).
function validarStatsCarta(obj) {
  if (!obj || typeof obj !== 'object'
      || Object.prototype.toString.call(obj) === '[object Array]') {
    return 'stats_json debe ser un objeto';
  }
  var i, k, n;
  for (i = 0; i < CARTA_EJES_STATS.length; i++) {
    k = CARTA_EJES_STATS[i];
    if (obj[k] === undefined || obj[k] === null) continue;
    n = obj[k];
    if (typeof n !== 'number' || !isFinite(n)) return k + ' debe ser numerico';
    if (n < 0) return k + ' no puede ser negativo';
    if (n > CARTA_STATS_TOPE) return k + ' supera el tope ' + CARTA_STATS_TOPE;
  }
  if (obj.primario !== undefined && obj.primario !== null) {
    if (CARTA_EJES_STATS.indexOf(String(obj.primario)) < 0) {
      return 'primario debe ser uno de: ' + CARTA_EJES_STATS.join(', ');
    }
  }
  if (obj.bonus_xp_pct !== undefined && obj.bonus_xp_pct !== null) {
    if (typeof obj.bonus_xp_pct !== 'number' || !isFinite(obj.bonus_xp_pct)) {
      return 'bonus_xp_pct debe ser numerico';
    }
  }
  return '';
}

// -- NIVEL DE CARTA (spec 3.4; contrato 4.9) ---------------------------------
// El nivel pertenece al par (usuario, carta) y vive en usuarios_cartas_nivel
// (066: PK (usuario_id, carta_id), nivel 1..5). El coste NO es esquema: es un
// parametro de calibracion del sumidero, y por eso vive aqui y no en una
// migracion (spec 3.4: "calibrar el sumidero no requiere migracion").
// CARTA_NIVEL_XP[i] es el coste de pasar de nivel (i+1) a (i+2).
var CARTA_NIVEL_TOPE = 5;
var CARTA_NIVEL_XP = [150, 400, 900, 1800];

// Coste de la subida desde "nivel" al siguiente, o 0 si ya esta en el tope o el
// nivel no es valido. Espeja el CASE del handler: una sola fuente, dos lectores
// (el que cobra y el que muestra). Sin Date, sin red, sin BD.
function costeSubidaNivel(nivel) {
  var n = parseInt(nivel, 10);
  if (!isFinite(n) || n < 1 || n >= CARTA_NIVEL_TOPE) return 0;
  return CARTA_NIVEL_XP[n - 1];
}

// -- MEDIA UGC (spec 6.1-6.5; migraciones 067 + 068) -------------------------
// La obra (musica / foto / video / poema) vive en cartas_media y nace
// 'pendiente': nada nace aprobado. MEDIA_TIPOS es el espejo literal de
// chk_cartas_media_tipo (067:120). El handler rechaza antes con
// MEDIA_TIPO_INVALIDO para no dejar caer el 23514 como 500.
var MEDIA_TIPOS = ['musica', 'foto', 'video', 'poema'];

// Coste en XP de ENVIAR una obra a moderacion (decision cerrada del operador
// 2026-11-11: "moderacion y se paga con xp"). Es un COBRO: sube
// usuarios.xp_gastado_sinks, NUNCA resta xp_total (ADR-018: el nivel no baja)
// y su asiento carta_media_envio va en BONO_EXCLUIDAS (un cargo no recibe bono).
var CARTA_MEDIA_XP_COSTE = 50;

// Limites por autor de la spec 6.3, medidos con COUNT sobre cartas_media (sin
// tabla de cuotas): 3 obras 'pendiente' simultaneas y 10 'aprobada' por
// ventana de 30 dias. Superarlos es error de aplicacion, nunca bloqueo mudo.
var CARTA_MEDIA_PENDIENTES_MAX = 3;
var CARTA_MEDIA_APROBADAS_30D_MAX = 10;
var CARTA_MEDIA_VENTANA_APROBADAS_DIAS = 30;

// Gate de publicacion (spec 6.3): acciones REALES, no un eje vacio. Se exige
// >= 3 resenas largas (el patron real del repo: tipo='resena' con xp_ganado
// alto, spec 5.2) o >= 1 obra propia ya aprobada. NO se usa oficio >= 8 en v1:
// ninguna de las 31 cartas del seed lo aporta y bloquearia toda la UGC.
var CARTA_MEDIA_RESENAS_LARGAS_MIN = 3;
var CARTA_MEDIA_RESENA_XP_MIN = 25;

// Maquina de estados de la obra (spec 6.2). chk_cartas_media_estado valida el
// DOMINIO, no la transicion: los saltos (pendiente -> retirada) son regla de
// handler. Vive aqui para que el handler que modera y el smoke prueben EXACTAMENTE
// la misma tabla (una sola fuente, dos lectores).
var MEDIA_TRANSICIONES = {
  pendiente: ['aprobada', 'rechazada'],
  aprobada: ['retirada'],
  rechazada: ['pendiente'],
  retirada: []
};

function transicionMediaValida(desde, hacia) {
  var permitidas = MEDIA_TRANSICIONES[String(desde || '')] || [];
  return permitidas.indexOf(String(hacia || '')) >= 0;
}

// -- PODER DERIVADO (spec 3.5; contrato de lectura 3.6) ----------------------
// poder = alcance + oficio + fortuna + rendimiento. La presencia es estatus puro
// y NO entra en poder (spec 3.1: "cero efecto economico"). El peso se declara
// por eje para que excluir o incluir un eje sea cambiar un numero, no una
// formula, y para que el lector no reimplemente la suma (una sola fuente).
// Shiny: floor(poder_base * 0.25) con minimo 1, sumado SOLO al primario
// (spec 3.2: comun +1, raro +2, epico +3, dorado +6).
// Nivel: +1 al primario por nivel sobre 1 (spec 3.4: +4 maximo).
// Techo derivado por carta = poder_base + shiny + 4 (spec 3.4). NO se persiste:
// una columna de poder seria una segunda autoridad que deriva en silencio.
var CARTA_PODER_PESOS = {
  alcance: 1, oficio: 1, fortuna: 1, rendimiento: 1, presencia: 0
};
var CARTA_PODER_SHINY_FACTOR = 0.25;
var CARTA_PODER_SHINY_MIN = 1;
var CARTA_NIVEL_BONUS = 1;

// Normaliza stats_json a las claves del vector con numeros finitos en [0,40].
// Acepta objeto o texto JSON (defensivo: neon ya devuelve jsonb parseado).
// stats ausente, null o basura -> ceros (nunca NaN). bonus_xp_pct NO se lee:
// esta deprecada e inerte (spec 4.7, cierre de D-5); si viaja en el objeto se
// ignora aqui, sin borrarla de la fila (ADR-003).
function statsNormalizados(obj) {
  var src = obj;
  if (typeof src === 'string') {
    try { src = JSON.parse(src); } catch (e) { src = null; }
  }
  if (!src || typeof src !== 'object'
      || Object.prototype.toString.call(src) === '[object Array]') {
    src = {};
  }
  var out = {};
  var i, k, n;
  for (i = 0; i < CARTA_EJES_STATS.length; i++) {
    k = CARTA_EJES_STATS[i];
    n = Number(src[k]);
    if (!isFinite(n) || n < 0) n = 0;
    if (n > CARTA_STATS_TOPE) n = CARTA_STATS_TOPE;
    out[k] = n;
  }
  var prim = (src.primario === undefined || src.primario === null)
    ? '' : String(src.primario);
  out.primario = CARTA_EJES_STATS.indexOf(prim) >= 0 ? prim : '';
  return out;
}

// Poder de UNA carta para un nivel y una variante. Funcion PURA: mismos
// argumentos, mismo numero. nivel invalido -> 1; variante distinta de 'shiny'
// -> sin bono de variante. Si falta el primario no se aplica bono (no se
// adivina el eje: adivinarlo inflaria poder sin decision).
function poderCarta(stats, nivel, variante) {
  var s = statsNormalizados(stats);
  var i, k, base = 0;
  for (i = 0; i < CARTA_EJES_STATS.length; i++) {
    k = CARTA_EJES_STATS[i];
    base += s[k] * CARTA_PODER_PESOS[k];
  }
  if (!s.primario) return base;
  var pesoPrim = CARTA_PODER_PESOS[s.primario];
  if (!pesoPrim) return base;
  var bono = 0;
  if (String(variante || CARTA_VARIANTE_DEFECTO) === 'shiny') {
    bono += Math.max(CARTA_PODER_SHINY_MIN,
      Math.floor(base * CARTA_PODER_SHINY_FACTOR));
  }
  var n = parseInt(nivel, 10);
  if (!isFinite(n) || n < 1) n = 1;
  if (n > CARTA_NIVEL_TOPE) n = CARTA_NIVEL_TOPE;
  bono += (n - 1) * CARTA_NIVEL_BONUS;
  return base + (bono * pesoPrim);
}

module.exports = {
  CARTA_FUSION_XP: CARTA_FUSION_XP,
  MUSEO_TOPE: MUSEO_TOPE,
  CARTA_VARIANTES: CARTA_VARIANTES,
  CARTA_VARIANTE_DEFECTO: CARTA_VARIANTE_DEFECTO,
  FAMILIAS_CARTA: FAMILIAS_CARTA,
  SUBTIPOS_CARTA: SUBTIPOS_CARTA,
  EDICIONES_CARTA: EDICIONES_CARTA,
  CARTA_EDICION_DEFECTO: CARTA_EDICION_DEFECTO,
  CARTA_EDICIONES_CON_SUPPLY: CARTA_EDICIONES_CON_SUPPLY,
  CARTA_FAMILIAS_SIN_PRECIO_XP: CARTA_FAMILIAS_SIN_PRECIO_XP,
  CARTA_PRECIO_BASE_XP: CARTA_PRECIO_BASE_XP,
  CARTA_MULT_FAMILIA: CARTA_MULT_FAMILIA,
  precioAcunacion: precioAcunacion,
  CARTA_EJES_STATS: CARTA_EJES_STATS,
  CARTA_STATS_TOPE: CARTA_STATS_TOPE,
  subtiposDeFamilia: subtiposDeFamilia,
  validarStatsCarta: validarStatsCarta,
  CARTA_NIVEL_TOPE: CARTA_NIVEL_TOPE,
  CARTA_NIVEL_XP: CARTA_NIVEL_XP,
  costeSubidaNivel: costeSubidaNivel,
  MEDIA_TIPOS: MEDIA_TIPOS,
  CARTA_MEDIA_XP_COSTE: CARTA_MEDIA_XP_COSTE,
  CARTA_MEDIA_PENDIENTES_MAX: CARTA_MEDIA_PENDIENTES_MAX,
  CARTA_MEDIA_APROBADAS_30D_MAX: CARTA_MEDIA_APROBADAS_30D_MAX,
  CARTA_MEDIA_VENTANA_APROBADAS_DIAS: CARTA_MEDIA_VENTANA_APROBADAS_DIAS,
  CARTA_MEDIA_RESENAS_LARGAS_MIN: CARTA_MEDIA_RESENAS_LARGAS_MIN,
  CARTA_MEDIA_RESENA_XP_MIN: CARTA_MEDIA_RESENA_XP_MIN,
  MEDIA_TRANSICIONES: MEDIA_TRANSICIONES,
  transicionMediaValida: transicionMediaValida,
  CARTA_PODER_PESOS: CARTA_PODER_PESOS,
  CARTA_PODER_SHINY_FACTOR: CARTA_PODER_SHINY_FACTOR,
  CARTA_PODER_SHINY_MIN: CARTA_PODER_SHINY_MIN,
  CARTA_NIVEL_BONUS: CARTA_NIVEL_BONUS,
  statsNormalizados: statsNormalizados,
  poderCarta: poderCarta
};
