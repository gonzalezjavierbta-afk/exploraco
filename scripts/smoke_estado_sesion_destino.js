// Smoke de comportamiento del bloque estado/resena de pagina-destino.js.
// Renderiza buildHTML(), extrae el JS inline, lo ejecuta en un sandbox con
// un DOM minimo y verifica: hook onExploraCOUpdate, precargarEstado con
// sesion (marca guardar/visitado/voto + nombre readonly) y degradacion sin
// sesion. ASCII puro.
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const Module = require("module");

const motorPath = path.join(__dirname, "..", "api", "pagina-destino.js");
const seedPath = path.join(__dirname, "seed-parque-mundo-aventura.js");
const fakeNeonPath = path.join(__dirname, "fake_neon.js");

const origResolve = Module._resolveFilename;
Module._resolveFilename = function (request) {
  if (request === "@neondatabase/serverless") return fakeNeonPath;
  return origResolve.apply(this, arguments);
};

let fail = 0;
function check(label, cond, detalle) {
  console.log((cond ? "PASS" : "FAIL") + " - " + label + (detalle ? " | " + detalle : ""));
  if (!cond) fail++;
}

const seed = require(seedPath);
const sandbox = { module: { exports: {} }, require, console, process, URL, URLSearchParams };
sandbox.exports = sandbox.module.exports;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(motorPath, "utf8") + "\nmodule.exports.buildHTML = buildHTML;", sandbox, { filename: "api/pagina-destino.js" });

const fotos = [];
const d = Object.assign({ id: "smoke-estado" }, seed.BASE, {
  fotos: fotos,
  tags: seed.TAGS || {},
  rating: 0,
  total_resenas: 0,
  creado_en: new Date(),
  actualizado_en: new Date()
});
const html = sandbox.module.exports.buildHTML(d, { faqs: seed.FAQS || [] }, fotos, [], null, []);
const tags = html.match(/<script\b[^>]*>[\s\S]*?<\/script>/gi) || [];
let cuerpo = null;
tags.forEach(function (tag) {
  const m = /^<script\b([^>]*)>([\s\S]*)<\/script>$/i.exec(tag);
  if (!m) return;
  if (/src=/i.test(m[1]) || /ld\+json/i.test(m[1])) return;
  cuerpo = m[2];
});
check("inline JS extraido", !!cuerpo, cuerpo ? cuerpo.length + " ch" : "n/a");
// El HTML final debe cerrar el <script> inline: el emisor usa '<\\/script>'
// (JS) que al concatenarse produce el literal '</script>' en el HTML.
check("cierra </script>", html.indexOf("</" + "script>") !== -1);

function makeEl(id) {
  return {
    id: id,
    value: "",
    textContent: "",
    innerHTML: "",
    disabled: false,
    style: {},
    _cls: {},
    classList: {
      add: function (c) { this._cls[c] = true; },
      remove: function (c) { delete this._cls[c]; },
      toggle: function () {},
      _cls: {}
    },
    setAttribute: function (k, v) { this[k] = v; },
    getAttribute: function (k) { return this[k]; },
    appendChild: function () {},
    insertBefore: function () {},
    remove: function () {},
    querySelector: function () { return makeEl(""); },
    querySelectorAll: function () { return []; },
    addEventListener: function () {}
  };
}

function correrEscenario(escenario) {
  const els = {};
  ["rvn", "rvt", "rvok", "btn-guardar", "btn-visitado", "qr-stars", "rbavg", "rbcnt", "rblock", "rbstars", "rvlist", "rvempty"].forEach(function (id) { els[id] = makeEl(id); });
  els._wrsub = makeEl("_wrsub");
  const calls = { estadoDestino: 0 };
  const contexto = {
    console: console,
    alert: function () {},
    prompt: function () { return null; },
    JSON: JSON,
    encodeURIComponent: encodeURIComponent,
    setTimeout: function (fn) { return 0; },
    clearTimeout: function () {},
    Date: Date, Math: Math, parseInt: parseInt, parseFloat: parseFloat,
    String: String, Object: Object, Array: Array, Boolean: Boolean, isNaN: isNaN,
    fetch: function () { return Promise.resolve({ json: function () { return Promise.resolve({ ok: true, data: [] }); } }); },
    document: {
      readyState: "loading",
      getElementById: function (id) { return els[id] || null; },
      querySelector: function (sel) { return sel === ".wrsub" ? els._wrsub : null; },
      querySelectorAll: function () { return []; },
      createElement: function () { const e = makeEl(""); e.appendChild = function () {}; e.insertBefore = function () {}; return e; },
      body: { appendChild: function () {} },
      addEventListener: function () {},
      removeEventListener: function () {}
    },
    window: {
      innerHeight: 800,
      location: { href: "" },
      ExploraCO: {
        usuario: escenario.conSesion ? { id: "u1", nombre: "Ana Viajera" } : null,
        estadoDestino: function () {
          calls.estadoDestino++;
          return Promise.resolve({ guardado: true, visitado: true, voto: { rating: 4 } });
        },
        estaGuardado: function () { return Promise.resolve(false); },
        toggleGuardado: function () {},
        marcarVisitado: function () { return Promise.resolve(true); },
        mostrarLogin: function () {},
        mostrarToast: function () {},
        publicarResena: function () { return Promise.resolve(true); }
      }
    }
  };
  vm.createContext(contexto);
  new vm.Script(cuerpo).runInContext(contexto, { timeout: 2000 });
  return { ctx: contexto, els: els, calls: calls };
}

// ---- Escenario A: con sesion (el hook simula el fin de cargar sesion) ----
const A = correrEscenario({ conSesion: true });
check("A: hook onExploraCOUpdate es funcion", typeof A.ctx.window.onExploraCOUpdate === "function");
check("A: precargarEstado definida", typeof A.ctx.precargarEstado === "function");
A.ctx.window.onExploraCOUpdate();
setTimeout(function () {
  check("A: estadoDestino llamado 1 vez", A.calls.estadoDestino === 1, "calls=" + A.calls.estadoDestino);
  check("A: input rvn precargado con nombre", A.els.rvn.value === "Ana Viajera", "value=" + A.els.rvn.value);
  check("A: input rvn readonly", A.els.rvn.readonly === "readonly");
  check("A: btn-guardar activo", !!A.els["btn-guardar"].classList._cls.activo);
  check("A: btn-visitado activo", !!A.els["btn-visitado"].classList._cls.activo);

  // idempotencia: segunda llamada no repite GET
  A.ctx.window.onExploraCOUpdate();
  check("A: idempotente (1 solo GET)", A.calls.estadoDestino === 1, "calls=" + A.calls.estadoDestino);

  // submitRv con sesion: publica y NO borra el nombre
  A.els.rvt.value = "Muy buen lugar";
  A.ctx.setRvScore(5);
  A.ctx.submitRv();
  setTimeout(function () {
    check("A: submitRv no borra el nombre con sesion", A.els.rvn.value === "Ana Viajera", "value=" + A.els.rvn.value);

    // ---- Escenario B: sin sesion (degradacion) ----
    const B = correrEscenario({ conSesion: false });
    B.ctx.window.onExploraCOUpdate();
    setTimeout(function () {
      check("B: estadoDestino NO llamado sin sesion", B.calls.estadoDestino === 0, "calls=" + B.calls.estadoDestino);
      check("B: btn-guardar no activo sin sesion", !B.els["btn-guardar"].classList._cls.activo);
      check("B: btn-visitado no activo sin sesion", !B.els["btn-visitado"].classList._cls.activo);
      check("B: rvn no readonly sin sesion", B.els.rvn.readonly !== "readonly");
      console.log("");
      console.log(fail > 0 ? "RESULTADO: FAIL (" + fail + ")" : "RESULTADO: TODO OK");
      process.exit(fail > 0 ? 1 : 0);
    }, 20);
  }, 20);
}, 20);
