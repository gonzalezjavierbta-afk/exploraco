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

module.exports = {
  CARTA_FUSION_XP: CARTA_FUSION_XP,
  MUSEO_TOPE: MUSEO_TOPE,
  CARTA_VARIANTES: CARTA_VARIANTES,
  CARTA_VARIANTE_DEFECTO: CARTA_VARIANTE_DEFECTO
};
