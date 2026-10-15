// scripts/smoke_dictado_voz.js
// Smoke test del modulo compartido dictado-voz.js (ExploraCO).
//
// Carga el modulo en un contexto vm con un `window`, un `document` minimo y un
// MOTOR DE RECONOCIMIENTO FALSO (no hay SpeechRecognition en node) y aserta el
// valor final del campo de texto en los escenarios donde se reporto duplicacion
// de la ultima frase (Chrome Android: el interim de un segmento ya contiene el
// texto que se acaba de finalizar en ESE MISMO segmento).
//
//   (i)   caso confirmado: final "hola mundo" + interim del mismo segmento
//         "hola mundo otra cosa" -> NO debe repetir la ultima frase.
//   (ii)  reemision del array event.results completo con los mismos finales.
//   (iii) reinicio de segmento (resultIndex retrocede / results.length menor).
//   (iv)  onend sin abort previo -> ningun motor huerfano escribe.
//   (v)   toques repetidos durante el arranque asincrono -> un solo motor.
//   (vi)  prefijo editado a mano que sobrevive a la reanudacion.
//   (vii) corte por silencio/navegador: aviso visible sin auto-restart.
//   (viii) contador de diagnostico DORMIDO salvo ?dvdebug=1.
//
// Y el MOTOR DEFECTUOSO DE CHROME ANDROID (que reemite el mismo final varias
// veces: bug conocido de la implementacion Android del Web Speech API):
//   (ix)   reemision del mismo final en eventos separados.
//   (x)    un solo evento con DOS entradas finales identicas.
//   (xi)   final seguido de otro final que repite solo la ultima palabra.
//   (xii)  reemision del final despues de un interim del mismo segmento.
//   (xiii) reemision del final completo tras un corte y reanudacion.
//   (xiv)  CONTRA-CASO: una repeticion literal del usuario se conserva.
//   (xv)   version del helper + contador de reemisiones en ?dvdebug=1.
//
// Exit 0 = todas las aserciones en verde. Sin dependencias npm.

"use strict";

var fs = require("fs");
var path = require("path");
var vm = require("vm");

var RUTA_MOD = path.join(__dirname, "..", "dictado-voz.js");
var SRC = fs.readFileSync(RUTA_MOD, "utf8");

var fails = 0;
var total = 0;

function check(label, cond, detail) {
  total++;
  console.log((cond ? "PASS" : "FAIL") + " - " + label + (detail ? " | " + detail : ""));
  if (!cond) fails++;
}

/* ---------------------------------------------------------------- */
/* DOM minimo: solo lo que el modulo toca (createElement, classList, */
/* appendChild, getElementById, style, textContent).                 */
/* ---------------------------------------------------------------- */

function elemento(tag) {
  var el = {
    tagName: String(tag || "div").toUpperCase(),
    id: "",
    className: "",
    title: "",
    type: "",
    innerHTML: "",
    textContent: "",
    style: {},
    children: [],
    parentNode: null,
    atributos: {},
    classList: {
      _c: {},
      add: function (c) { this._c[c] = true; },
      remove: function (c) { delete this._c[c]; },
      contains: function (c) { return this._c[c] === true; }
    },
    setAttribute: function (k, v) { this.atributos[k] = v; if (k === "class") this.className = v; },
    getAttribute: function (k) { return this.atributos[k]; },
    appendChild: function (hijo) {
      this.children.push(hijo);
      hijo.parentNode = this;
      return hijo;
    },
    removeChild: function (hijo) {
      var i = this.children.indexOf(hijo);
      if (i !== -1) this.children.splice(i, 1);
      hijo.parentNode = null;
      return hijo;
    },
    dispatchEvent: function () { return true; }
  };
  return el;
}

function documentoFalso() {
  var creados = [];
  return {
    creados: creados,
    hidden: false,
    addEventListener: function () {},
    createElement: function (tag) { var el = elemento(tag); creados.push(el); return el; },
    getElementById: function (id) {
      for (var i = 0; i < creados.length; i++) {
        if (creados[i].id === id) return creados[i];
      }
      return null;
    }
  };
}

function botonFalso() {
  var cont = elemento("div");
  var btn = elemento("button");
  cont.appendChild(btn);
  return btn;
}

function inputFalso(max) {
  var inp = elemento("input");
  inp.value = "";
  inp.maxLength = typeof max === "number" ? max : 2000;
  return inp;
}

/* ---------------------------------------------------------------- */
/* Motor de reconocimiento falso: cuenta motores creados, start(),   */
/* stop() y abort(). onstart puede ser asincrono (autoStart: false). */
/* ---------------------------------------------------------------- */

function motorFalso(opciones) {
  var op = opciones || {};
  var motores = [];

  function Motor() {
    this.lang = "";
    this.continuous = false;
    this.interimResults = false;
    this.maxAlternatives = 0;
    this.onresult = null;
    this.onerror = null;
    this.onend = null;
    this.onstart = null;
    this.startCount = 0;
    this.stopCount = 0;
    this.abortCount = 0;
    motores.push(this);
  }

  Motor.prototype.start = function () {
    this.startCount++;
    if (op.autoStart !== false && typeof this.onstart === "function") this.onstart();
  };
  Motor.prototype.stop = function () { this.stopCount++; };
  Motor.prototype.abort = function () { this.abortCount++; };

  return { Ctor: Motor, motores: motores };
}

function resultado(texto, esFinal) {
  var r = { isFinal: !!esFinal, length: 1 };
  r[0] = { transcript: texto };
  return r;
}

// Emite un evento de resultado POR EL HANDLER VIGENTE del motor: si el modulo
// anulo `onresult`, el motor huerfano ya no puede escribir en el campo.
function emitir(motor, lista, indice) {
  if (typeof motor.onresult !== "function") return false;
  motor.onresult({ resultIndex: typeof indice === "number" ? indice : 0, results: lista });
  return true;
}

function emitirOnend(motor) {
  if (typeof motor.onend !== "function") return false;
  motor.onend();
  return true;
}

function ultimoMotor(motor) {
  return motor.motores.length ? motor.motores[motor.motores.length - 1] : null;
}

/* Carga el modulo en un sandbox aislado. */
function cargar(opciones) {
  var op = opciones || {};
  var doc = documentoFalso();
  var win = {};
  win.document = doc;
  win.console = console;
  win.Event = function (tipo, cfg) { this.type = tipo; this.bubbles = !!(cfg && cfg.bubbles); };
  win.addEventListener = function () {};
  win.location = { search: op.search || "", href: "https://exploraco.co/publicar.html" + (op.search || "") };

  var motor = motorFalso(op.motor || {});
  win.SpeechRecognition = motor.Ctor;

  if (op.toast) {
    win.toast = function (msg) { op.toast(msg); };
  }

  var sandbox = { window: win, document: doc, console: console, module: { exports: {} } };
  sandbox.global = win;
  vm.createContext(sandbox);
  vm.runInContext(SRC, sandbox, { filename: "dictado-voz.js" });

  return { win: win, doc: doc, motor: motor, DictadoVoz: win.DictadoVoz };
}

function buscarNodo(doc, criterio) {
  for (var i = 0; i < doc.creados.length; i++) {
    var el = doc.creados[i];
    if (criterio(el)) return el;
  }
  return null;
}

function ocurrencias(texto, sub) {
  var t = String(texto || "").toLowerCase();
  var s = String(sub || "").toLowerCase();
  if (!s) return 0;
  var n = 0, i = 0;
  while ((i = t.indexOf(s, i)) !== -1) { n++; i += s.length; }
  return n;
}

/* ---------------------------------------------------------------- */
console.log("=== 0) CARGA DEL MODULO ===");
var requerido = require(RUTA_MOD);
check("0.1 require() del modulo en node no lanza", !!requerido);
check("0.2 expone iniciar/toggle/detener/detenerTodo",
  !!(requerido && typeof requerido.iniciar === "function" && typeof requerido.toggle === "function" &&
     typeof requerido.detener === "function" && typeof requerido.detenerTodo === "function"));
check("0.3 esSoportado() es false en node (sin SpeechRecognition)",
  typeof requerido.esSoportado === "function" && requerido.esSoportado() === false);
check("0.4 el .js entregado es ASCII puro (0 bytes > 127)",
  SRC.split("").every(function (c) { return c.charCodeAt(0) < 128; }));

/* ---------------------------------------------------------------- */
console.log("\n=== 1) CASO CONFIRMADO: final + interim del MISMO segmento ===");
var s1 = cargar({});
var i1 = inputFalso();
var b1 = botonFalso();
s1.DictadoVoz.iniciar(i1, b1, null);
var m1 = ultimoMotor(s1.motor);
emitir(m1, [resultado("hola mundo ", true)], 0);
check("1.1 primer final escribe el campo", i1.value === "hola mundo", "valor=" + JSON.stringify(i1.value));
emitir(m1, [resultado("hola mundo ", true), resultado("hola mundo otra cosa", false)], 1);
check("1.2 el interim del mismo segmento no duplica la frase finalizada",
  i1.value === "hola mundo otra cosa", "valor=" + JSON.stringify(i1.value));
check("1.3 el valor no contiene 'hola mundo hola mundo'",
  i1.value.toLowerCase().indexOf("hola mundo hola mundo") === -1, "valor=" + JSON.stringify(i1.value));
check("1.4 la ultima frase aparece una sola vez",
  ocurrencias(i1.value, "otra cosa") === 1, "ocurrencias=" + ocurrencias(i1.value, "otra cosa"));
check("1.5 en uso normal no se crea ningun nodo en el DOM (sin dvdebug)",
  s1.doc.creados.length === 0, "creados=" + s1.doc.creados.length);

console.log("\n=== 2) REEMISION DEL ARRAY event.results COMPLETO ===");
emitir(m1, [resultado("hola mundo ", true), resultado("hola mundo otra cosa", false)], 0);
check("2.1 reemitir el array completo no cambia el valor",
  i1.value === "hola mundo otra cosa", "valor=" + JSON.stringify(i1.value));
check("2.2 'hola mundo' aparece una sola vez",
  ocurrencias(i1.value, "hola mundo") === 1, "ocurrencias=" + ocurrencias(i1.value, "hola mundo"));
emitir(m1, [resultado("hola mundo otra cosa", true)], 0);
check("2.3 el interim pasa a final sin duplicarse",
  i1.value === "hola mundo otra cosa", "valor=" + JSON.stringify(i1.value));

/* ---------------------------------------------------------------- */
console.log("\n=== 3) REINICIO DE SEGMENTO (resultIndex retrocede) ===");
var s3 = cargar({});
var i3 = inputFalso();
var b3 = botonFalso();
s3.DictadoVoz.iniciar(i3, b3, null);
var m3 = ultimoMotor(s3.motor);
emitir(m3, [resultado("uno dos ", true), resultado("tres cuatro ", true)], 0);
check("3.1 dictado inicial confirmado", i3.value === "uno dos tres cuatro", "valor=" + JSON.stringify(i3.value));
emitir(m3, [resultado("uno", false)], 0);
check("3.2 reinicio con results.length menor: no se pierde lo confirmado",
  i3.value === "uno dos tres cuatro", "valor=" + JSON.stringify(i3.value));
check("3.3 reinicio: no se repite lo confirmado",
  ocurrencias(i3.value, "uno dos tres cuatro") === 1, "valor=" + JSON.stringify(i3.value));
emitir(m3, [resultado("uno dos tres cuatro cinco", false)], 0);
check("3.4 el segmento reanudado crece sin repetir",
  i3.value === "uno dos tres cuatro cinco", "valor=" + JSON.stringify(i3.value));

var s3b = cargar({});
var i3b = inputFalso();
var b3b = botonFalso();
s3b.DictadoVoz.iniciar(i3b, b3b, null);
var m3b = ultimoMotor(s3b.motor);
emitir(m3b, [resultado("la playa grande ", true)], 0);
emitir(m3b, [resultado("la playa grande ", true), resultado("grande azul", true)], 1);
check("3.5 solape de palabras entre segmentos se cose una sola vez",
  i3b.value === "la playa grande azul", "valor=" + JSON.stringify(i3b.value));
check("3.6 el fragmento solapado no se duplica",
  ocurrencias(i3b.value, "grande") === 1, "ocurrencias=" + ocurrencias(i3b.value, "grande"));
s3b.DictadoVoz.detenerTodo();

/* ---------------------------------------------------------------- */
console.log("\n=== 4) onend SIN ABORT PREVIO: MOTOR HUERFANO ===");
var s4 = cargar({});
var i4 = inputFalso();
var b4 = botonFalso();
var motivos4 = [];
s4.DictadoVoz.iniciar(i4, b4, function (motivo) { motivos4.push(motivo); });
var m4 = ultimoMotor(s4.motor);
emitir(m4, [resultado("adios mundo ", true)], 0);
emitirOnend(m4);
check("4.1 el campo conserva lo dictado tras el corte", i4.value === "adios mundo", "valor=" + JSON.stringify(i4.value));
check("4.2 el callback de cierre recibe motivo 'navegador'",
  motivos4.length === 1 && motivos4[0] === "navegador", "motivos=" + JSON.stringify(motivos4));
check("4.3 onresult queda anulado en la instancia que se cierra",
  m4.onresult === null, "onresult=" + typeof m4.onresult);
check("4.4 onstart/onerror/onend quedan anulados",
  m4.onstart === null && m4.onerror === null && m4.onend === null);
check("4.5 el motor se aborta (no queda microfono huerfano)", m4.abortCount >= 1, "abort=" + m4.abortCount);
var emitido4 = emitir(m4, [resultado("texto traicionero ", true)], 0);
check("4.6 un onresult tardio no llega a escribir", emitido4 === false && i4.value === "adios mundo",
  "emitido=" + emitido4 + " valor=" + JSON.stringify(i4.value));
check("4.7 grabando vuelve a false tras el cierre", s4.DictadoVoz.grabando === false);

/* ---------------------------------------------------------------- */
console.log("\n=== 5) TOQUES REPETIDOS CON ARRANQUE ASINCRONO ===");
var s5 = cargar({ motor: { autoStart: false } });
var i5 = inputFalso();
var b5 = botonFalso();
s5.DictadoVoz.toggle(i5, b5);
var m5 = ultimoMotor(s5.motor);
check("5.1 arranque asincrono: aun NO hay sesion marcada como activa",
  s5.DictadoVoz.grabando === false, "grabando=" + s5.DictadoVoz.grabando);
check("5.2 el boton no se enciende antes del onstart real",
  b5.classList.contains("grabando-activo") === false);
s5.DictadoVoz.toggle(i5, b5);
s5.DictadoVoz.toggle(i5, b5);
check("5.3 tres toques durante el arranque no crean motores en paralelo",
  s5.motor.motores.length === 1, "motores=" + s5.motor.motores.length);
check("5.4 solo se llamo start() una vez", m5.startCount === 1, "start()=" + m5.startCount);
if (typeof m5.onstart === "function") m5.onstart();
check("5.5 el estado activo se marca en el onstart real",
  s5.DictadoVoz.grabando === true, "grabando=" + s5.DictadoVoz.grabando);
check("5.6 el boton se enciende en el onstart real",
  b5.classList.contains("grabando-activo") === true);
emitir(m5, [resultado("mensaje unico ", true)], 0);
check("5.7 el dictado posterior entra una sola vez",
  i5.value === "mensaje unico" && ocurrencias(i5.value, "mensaje unico") === 1,
  "valor=" + JSON.stringify(i5.value));
s5.DictadoVoz.toggle(i5, b5);
check("5.8 un toque ya con la sesion arrancada si detiene el dictado",
  s5.DictadoVoz.grabando === false && b5.classList.contains("grabando-activo") === false);

/* ---------------------------------------------------------------- */
console.log("\n=== 6) PREFIJO EDITADO A MANO SOBREVIVE A LA REANUDACION ===");
var s6 = cargar({});
var i6 = inputFalso();
var b6 = botonFalso();
s6.DictadoVoz.toggle(i6, b6);
var m6 = ultimoMotor(s6.motor);
emitir(m6, [resultado("primera frase ", true)], 0);
check("6.1 primer dictado escrito", i6.value === "primera frase", "valor=" + JSON.stringify(i6.value));
i6.value = "NOTA: texto propio";
emitir(m6, [resultado("primera frase ", true), resultado("segunda frase ", true)], 1);
check("6.2 el texto editado a mano sobrevive al siguiente resultado",
  i6.value === "NOTA: texto propio segunda frase", "valor=" + JSON.stringify(i6.value));
check("6.3 el texto editado a mano no se duplica con el dictado",
  ocurrencias(i6.value, "primera frase") === 0, "valor=" + JSON.stringify(i6.value));
s6.DictadoVoz.detenerTodo();
s6.DictadoVoz.toggle(i6, b6);
var m6b = ultimoMotor(s6.motor);
emitir(m6b, [resultado("tercera frase ", true)], 0);
check("6.4 reanudar conserva lo que ya estaba en el campo",
  i6.value === "NOTA: texto propio segunda frase tercera frase", "valor=" + JSON.stringify(i6.value));
s6.DictadoVoz.detenerTodo();

/* ---------------------------------------------------------------- */
console.log("\n=== 7) CORTE POR SILENCIO/NAVEGADOR: AVISO VISIBLE ===");
var s7 = cargar({});
var i7 = inputFalso();
var b7 = botonFalso();
s7.DictadoVoz.toggle(i7, b7);
var m7 = ultimoMotor(s7.motor);
emitir(m7, [resultado("texto que se conserva ", true)], 0);
emitirOnend(m7);
var aviso7 = buscarNodo(s7.doc, function (el) {
  return String(el.className || "").indexOf("dv-") === 0;
});
check("7.1 el corte por navegador dibuja un aviso con silo dv-", !!aviso7,
  "creados=" + s7.doc.creados.length);
check("7.2 el aviso pide reanudar y aclara que lo dictado se conserva",
  !!aviso7 && /reanudar/i.test(aviso7.textContent) && /conserva/i.test(aviso7.textContent),
  aviso7 ? JSON.stringify(aviso7.textContent) : "sin aviso");
check("7.3 el corte NO relanza el motor solo (sin auto-restart)",
  s7.motor.motores.length === 1, "motores=" + s7.motor.motores.length);
check("7.4 lo dictado se conserva tras el corte", i7.value === "texto que se conserva",
  "valor=" + JSON.stringify(i7.value));

var toasts7 = [];
var s7b = cargar({ toast: function (msg) { toasts7.push(msg); } });
var i7b = inputFalso();
var b7b = botonFalso();
s7b.DictadoVoz.toggle(i7b, b7b);
emitir(ultimoMotor(s7b.motor), [resultado("otra cosa ", true)], 0);
emitirOnend(ultimoMotor(s7b.motor));
check("7.5 si la pagina expone toast, el aviso va por toast",
  toasts7.length === 1 && /reanudar/i.test(toasts7[0]), "toast=" + JSON.stringify(toasts7));

/* ---------------------------------------------------------------- */
console.log("\n=== 8) CONTADOR DE DIAGNOSTICO DORMIDO SALVO ?dvdebug=1 ===");
var s8 = cargar({ search: "" });
var i8 = inputFalso();
var b8 = botonFalso();
s8.DictadoVoz.toggle(i8, b8);
emitir(ultimoMotor(s8.motor), [resultado("sin debug ", true)], 0);
check("8.1 uso normal: no se crea el nodo dv-debug",
  buscarNodo(s8.doc, function (el) { return el.id === "dv-debug"; }) === null);
check("8.2 uso normal: el dictado no ensucia el DOM",
  s8.doc.creados.length === 0, "creados=" + s8.doc.creados.length);
s8.DictadoVoz.detenerTodo();

var s9 = cargar({ search: "?dvdebug=1" });
var i9 = inputFalso();
var b9 = botonFalso();
s9.DictadoVoz.toggle(i9, b9);
var m9 = ultimoMotor(s9.motor);
emitir(m9, [resultado("uno ", true)], 0);
emitir(m9, [resultado("uno ", true), resultado("dos", false)], 1);
var nodo9 = buscarNodo(s9.doc, function (el) { return el.id === "dv-debug"; });
check("8.3 con ?dvdebug=1 si se crea el contador", !!nodo9);
check("8.4 el contador reporta resultados recibidos y estado del motor",
  !!nodo9 && /\d/.test(nodo9.textContent) && /resulta/i.test(nodo9.textContent),
  nodo9 ? JSON.stringify(nodo9.textContent) : "sin nodo");
check("8.5 el contador no altera el texto dictado",
  i9.value === "uno dos", "valor=" + JSON.stringify(i9.value));

/* ---------------------------------------------------------------- */
/* 9) MOTOR DEFECTUOSO DE CHROME ANDROID: el motor entrega el MISMO */
/* resultado final mas de una vez (mas de 2-3 veces segun los       */
/* informes). Estos casos FALLAN con un consumo ingenuo: el motor   */
/* no reparte el texto en bloques disjuntos y tampoco respeta       */
/* resultIndex cuando reabre su buffer.                             */
/* ---------------------------------------------------------------- */

console.log("\n=== 9a) DOS EVENTOS SEPARADOS CON EL MISMO FINAL ===");
var sA = cargar({});
var iA = inputFalso();
var bA = botonFalso();
sA.DictadoVoz.iniciar(iA, bA, null);
var mA = ultimoMotor(sA.motor);
emitir(mA, [resultado("hola mundo ", true)], 0);
check("a.1 el primer final entra una sola vez", iA.value === "hola mundo",
  "valor=" + JSON.stringify(iA.value));
emitir(mA, [resultado("hola mundo ", true)], 0);
check("a.2 el MISMO final en un evento nuevo no se concatena",
  iA.value === "hola mundo", "valor=" + JSON.stringify(iA.value));
check("a.3 el campo no contiene 'hola mundo hola mundo'",
  iA.value.toLowerCase().indexOf("hola mundo hola mundo") === -1,
  "valor=" + JSON.stringify(iA.value));
emitir(mA, [resultado("hola mundo ", true), resultado("hola mundo ", true)], 1);
check("a.4 el final reemitido como resultado NUEVO tampoco duplica",
  iA.value === "hola mundo" && ocurrencias(iA.value, "hola mundo") === 1,
  "valor=" + JSON.stringify(iA.value));
sA.DictadoVoz.detenerTodo();

console.log("\n=== 9b) UN EVENTO CON DOS ENTRADAS FINALES IDENTICAS ===");
var sB = cargar({});
var iB = inputFalso();
var bB = botonFalso();
sB.DictadoVoz.iniciar(iB, bB, null);
var mB = ultimoMotor(sB.motor);
emitir(mB, [resultado("hola mundo ", true), resultado("hola mundo ", true)], 0);
check("b.1 dos entradas finales identicas en el MISMO evento no duplican",
  iB.value === "hola mundo", "valor=" + JSON.stringify(iB.value));
check("b.2 la frase aparece una sola vez",
  ocurrencias(iB.value, "hola mundo") === 1, "ocurrencias=" + ocurrencias(iB.value, "hola mundo"));
check("b.3 el campo no contiene 'hola mundo hola mundo'",
  iB.value.toLowerCase().indexOf("hola mundo hola mundo") === -1,
  "valor=" + JSON.stringify(iB.value));
sB.DictadoVoz.detenerTodo();

console.log("\n=== 9c) FINAL QUE REPITE SOLO LA ULTIMA PALABRA ===");
var sC = cargar({});
var iC = inputFalso();
var bC = botonFalso();
sC.DictadoVoz.iniciar(iC, bC, null);
var mC = ultimoMotor(sC.motor);
emitir(mC, [resultado("hola mundo ", true), resultado("mundo", true)], 0);
check("c.1 el final que repite la ultima palabra no la concatena",
  iC.value === "hola mundo", "valor=" + JSON.stringify(iC.value));
check("c.2 'mundo' aparece una sola vez",
  ocurrencias(iC.value, "mundo") === 1, "ocurrencias=" + ocurrencias(iC.value, "mundo"));
check("c.3 el campo no contiene 'mundo mundo'",
  iC.value.toLowerCase().indexOf("mundo mundo") === -1, "valor=" + JSON.stringify(iC.value));

var sCb = cargar({});
var iCb = inputFalso();
var bCb = botonFalso();
sCb.DictadoVoz.iniciar(iCb, bCb, null);
var mCb = ultimoMotor(sCb.motor);
emitir(mCb, [resultado("hola mundo ", true)], 0);
emitir(mCb, [resultado("hola mundo ", true), resultado("mundo", true)], 1);
check("c.4 la repeticion de la ultima palabra en un evento nuevo se cose",
  iCb.value === "hola mundo" && ocurrencias(iCb.value, "mundo") === 1,
  "valor=" + JSON.stringify(iCb.value));
var sCc = cargar({});
var iCc = inputFalso();
var bCc = botonFalso();
sCc.DictadoVoz.iniciar(iCc, bCc, null);
var mCc = ultimoMotor(sCc.motor);
emitir(mCc, [resultado("la playa grande ", true)], 0);
emitir(mCc, [resultado("la playa grande ", true), resultado("grande azul", true)], 1);
check("c.5 el solape legitimo entre segmentos se cose una sola vez",
  iCc.value === "la playa grande azul", "valor=" + JSON.stringify(iCc.value));
sCc.DictadoVoz.detenerTodo();

console.log("\n=== 9d) REEMISION DEL FINAL TRAS UN INTERIM DEL MISMO SEGMENTO ===");
var sD = cargar({});
var iD = inputFalso();
var bD = botonFalso();
sD.DictadoVoz.iniciar(iD, bD, null);
var mD = ultimoMotor(sD.motor);
emitir(mD, [resultado("hola mundo ", true)], 0);
emitir(mD, [resultado("hola mundo ", true), resultado("hola mundo otra", false)], 1);
check("d.1 el interim del mismo segmento no duplica la frase finalizada",
  iD.value === "hola mundo otra", "valor=" + JSON.stringify(iD.value));
emitir(mD, [resultado("hola mundo ", true), resultado("hola mundo otra", true),
  resultado("hola mundo otra", true)], 1);
check("d.2 el final reemitido dos veces tras el interim no se suma dos veces",
  iD.value === "hola mundo otra", "valor=" + JSON.stringify(iD.value));
check("d.3 la frase final aparece una sola vez",
  ocurrencias(iD.value, "hola mundo otra") === 1,
  "ocurrencias=" + ocurrencias(iD.value, "hola mundo otra"));
check("d.4 el campo no contiene 'hola mundo otra hola mundo otra'",
  iD.value.toLowerCase().indexOf("hola mundo otra hola mundo otra") === -1,
  "valor=" + JSON.stringify(iD.value));
sD.DictadoVoz.detenerTodo();

console.log("\n=== 9e) REEMISION TRAS CORTE Y REANUDACION SOBRE EL MISMO CAMPO ===");
var sE = cargar({});
var iE = inputFalso();
var bE = botonFalso();
var motivosE = [];
sE.DictadoVoz.toggle(iE, bE, function (motivo) { motivosE.push(motivo); });
var mE1 = ultimoMotor(sE.motor);
emitir(mE1, [resultado("hola mundo ", true)], 0);
check("e.1 el dictado previo queda escrito", iE.value === "hola mundo",
  "valor=" + JSON.stringify(iE.value));
emitirOnend(mE1);
check("e.2 el corte por navegador cierra la sesion y conserva lo dictado",
  motivosE.length === 1 && motivosE[0] === "navegador" && iE.value === "hola mundo",
  "motivos=" + JSON.stringify(motivosE) + " valor=" + JSON.stringify(iE.value));
sE.DictadoVoz.toggle(iE, bE, function (motivo) { motivosE.push(motivo); });
check("e.3 la reanudacion abre una sesion nueva sobre el mismo campo",
  sE.motor.motores.length === 2, "motores=" + sE.motor.motores.length);
var mE2 = ultimoMotor(sE.motor);
emitir(mE2, [resultado("hola mundo ", true)], 0);
check("e.4 la reemision del final tras el corte no duplica lo ya escrito",
  iE.value === "hola mundo", "valor=" + JSON.stringify(iE.value));
check("e.5 el campo no contiene 'hola mundo hola mundo'",
  iE.value.toLowerCase().indexOf("hola mundo hola mundo") === -1,
  "valor=" + JSON.stringify(iE.value));
emitir(mE2, [resultado("hola mundo ", true), resultado("hola mundo y buenas tardes ", true)], 1);
check("e.6 el dictado nuevo entra despues del previo sin repetirlo",
  iE.value === "hola mundo y buenas tardes", "valor=" + JSON.stringify(iE.value));
check("e.7 el prefijo dictado antes del corte aparece una sola vez",
  ocurrencias(iE.value, "hola mundo") === 1, "ocurrencias=" + ocurrencias(iE.value, "hola mundo"));
sE.DictadoVoz.detenerTodo();

console.log("\n=== 9f) CONTRA-CASO OBLIGATORIO: REPETICION LITERAL DEL USUARIO ===");
/* SESGO DECLARADO: si el usuario repite de verdad una palabra o una frase, no
   se pierde una copia, pero si el motor la reemite tampoco se suman dos copias.
   Ante la duda entre "deduplicar" y "duplicar texto no dicho" el modulo
   DEDUPLICA: preferimos perder una repeticion literal (el usuario puede
   reescribirla a mano) a ensuciar el campo con texto que no se ha dicho. */
var sF = cargar({});
var iF = inputFalso();
var bF = botonFalso();
sF.DictadoVoz.iniciar(iF, bF, null);
var mF = ultimoMotor(sF.motor);
emitir(mF, [resultado("hola hola ", true)], 0);
check("f.1 la repeticion literal del usuario NO se colapsa a una palabra",
  iF.value === "hola hola", "valor=" + JSON.stringify(iF.value));
check("f.2 'hola hola' se conserva como una copia entera",
  ocurrencias(iF.value, "hola hola") === 1, "ocurrencias=" + ocurrencias(iF.value, "hola hola"));
emitir(mF, [resultado("hola hola ", true), resultado("hola hola ", true)], 1);
check("f.3 la reemision del motor deja UNA copia (sesgo: deduplicar)",
  iF.value === "hola hola", "valor=" + JSON.stringify(iF.value));
check("f.4 el campo no contiene 'hola hola hola hola'",
  iF.value.toLowerCase().indexOf("hola hola hola hola") === -1,
  "valor=" + JSON.stringify(iF.value));
var sF2 = cargar({});
var iF2 = inputFalso();
var bF2 = botonFalso();
sF2.DictadoVoz.iniciar(iF2, bF2, null);
emitir(ultimoMotor(sF2.motor), [resultado("hola hola hola hola ", true)], 0);
check("f.5 un enunciado con la palabra repetida se conserva entero",
  iF2.value === "hola hola hola hola", "valor=" + JSON.stringify(iF2.value));
sF2.DictadoVoz.detenerTodo();

console.log("\n=== 9g) VERSION DEL HELPER Y REEMISIONES EN ?dvdebug=1 ===");
var sG = cargar({ search: "?dvdebug=1" });
var iG = inputFalso();
var bG = botonFalso();
sG.DictadoVoz.iniciar(iG, bG, null);
var mG = ultimoMotor(sG.motor);
emitir(mG, [resultado("hola mundo ", true)], 0);
emitir(mG, [resultado("hola mundo ", true), resultado("hola mundo ", true)], 1);
var nodoG = buscarNodo(sG.doc, function (el) { return el.id === "dv-debug"; });
check("g.1 el contador identifica la VERSION del helper (dv-2, no cache vieja)",
  !!nodoG && /dv-2/.test(nodoG.textContent),
  nodoG ? JSON.stringify(nodoG.textContent) : "sin nodo");
check("g.2 el contador reporta las reemisiones/fusiones descartadas",
  !!nodoG && /reemision/i.test(nodoG.textContent) &&
  /[1-9]/.test((nodoG.textContent.split("reemision")[1] || "")),
  nodoG ? JSON.stringify(nodoG.textContent) : "sin nodo");
check("g.3 el contador no altera el texto dictado",
  iG.value === "hola mundo", "valor=" + JSON.stringify(iG.value));

/* ---------------------------------------------------------------- */
console.log("\n---------------------------------------------");
console.log("Aserciones: " + (total - fails) + "/" + total + " OK | FAIL: " + fails);
console.log((fails === 0 ? "RESULTADO: OK" : "RESULTADO: FALLO") + " - smoke_dictado_voz.js");
process.exit(fails === 0 ? 0 : 1);
