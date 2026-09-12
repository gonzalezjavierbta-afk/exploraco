// scripts/check_buildHTML_inline.js
// Guard permanente: previene la recurrencia de "el JS inline que genera
// buildHTML() no se parsea" (regresion TSK-095 / BUG abrirPopoverGuardar).
//
// Uso: node scripts/check_buildHTML_inline.js [seedName]
//   seedName opcional; default = parque-mundo-aventura.
//
// Que hace:
//   1. Carga api/pagina-destino.js en un sandbox vm (patron del smoke test).
//   2. Renderiza buildHTML() con el seed indicado (scripts/seed-<seedName>.js).
//   3. Extrae TODOS los <script> inline SIN src externo (excluye
//      /usuario-session.js) y los JSON-LD.
//   4. Parsea cada uno con new vm.Script (detecta SyntaxError).
//   5. Ejecuta los scripts JS (no src, no ld+json) en un sandbox con stubs
//      de document/window/fetch/alert/prompt/console y verifica que las
//      funciones criticas quedaron definidas.
//   6. Reporta balance de divs del HTML generado.
//
// Exit: 0 todo OK | 1 inline roto o funcion faltante | 2 seed inexistente.
// Sin dependencias npm (Node core: fs, vm, path, module). ASCII puro.
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const Module = require("module");

const SEED_DEFAULT = "parque-mundo-aventura";
const seedName = process.argv[2] || SEED_DEFAULT;
const seedPath = path.join(__dirname, "seed-" + seedName + ".js");
const motorPath = path.join(__dirname, "..", "api", "pagina-destino.js");
const fakeNeonPath = path.join(__dirname, "fake_neon.js");

// Stub de @neondatabase/serverless (mismo patron del smoke heredado)
if (!fs.existsSync(fakeNeonPath)) {
  fs.writeFileSync(fakeNeonPath, "module.exports = { neon: function(){ return function(){ return []; }; } };\n", "utf8");
}
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

// ---- seed ----
if (!fs.existsSync(seedPath)) {
  console.error("ERROR: seed no encontrado -> " + seedPath);
  console.error("Seeds disponibles en scripts/seed-*.js");
  process.exit(2);
}
const seed = require(seedPath);

// ---- cargar buildHTML en sandbox ----
if (!fs.existsSync(motorPath)) {
  console.error("ERROR: api/pagina-destino.js no encontrado -> " + motorPath);
  process.exit(2);
}
const sandbox = { module: { exports: {} }, require, console, process, URL, URLSearchParams };
sandbox.exports = sandbox.module.exports;
vm.createContext(sandbox);
const src = fs.readFileSync(motorPath, "utf8");
vm.runInContext(src + "\nmodule.exports.buildHTML = buildHTML;", sandbox, { filename: "api/pagina-destino.js" });

// ---- datos del seed ----
const fotos = (Array.isArray(seed.PHOTOS) && seed.PHOTOS.length)
  ? seed.PHOTOS
  : (seed.HERO ? [{ url: seed.HERO }] : []);
const d = Object.assign({ id: "check-inline" }, seed.BASE, {
  fotos: fotos.map(function (f) { return typeof f === "string" ? f : (f && f.url); }).filter(Boolean),
  tags: seed.TAGS || {},
  rating: 0,
  total_resenas: 0,
  creado_en: new Date(),
  actualizado_en: new Date()
});

console.log("=== check_buildHTML_inline | seed=" + seedName + " | cat=" + ((seed.BASE && seed.BASE.categoria_slug) || "n/d") + " ===");

let html = "";
try {
  html = sandbox.module.exports.buildHTML(d, { faqs: seed.FAQS || [] }, fotos, [], null, []);
  check("buildHTML render", typeof html === "string" && html.length > 8000, "html=" + html.length + "B");
} catch (e) {
  check("buildHTML render", false, e.message);
  process.exit(1);
}

// ---- extraer tags <script> ----
const tags = html.match(/<script\b[^>]*>[\s\S]*?<\/script>/gi) || [];
console.log("tags <script> encontrados: " + tags.length);

const inlines = [];
tags.forEach(function (tag, idx) {
  const m = /^<script\b([^>]*)>([\s\S]*)<\/script>$/i.exec(tag);
  if (!m) return;
  const attrs = m[1];
  const cuerpo = m[2];
  const esExterno = /src=/i.test(attrs);
  const esLdJson = /type=["']application\/ld\+json/i.test(attrs);
  if (esExterno) {
    console.log("  #" + (idx + 1) + " externo (src) -> ignorado");
    return;
  }
  inlines.push({ cuerpo: cuerpo, esLdJson: esLdJson, idx: idx + 1 });
  console.log("  #" + (idx + 1) + (esLdJson ? " JSON-LD (solo parse)" : " inline JS") + " -> " + cuerpo.trim().length + " ch");
});

if (!inlines.length) {
  check("scripts inline presentes", false, "ningun <script> inline encontrado");
  process.exit(1);
}

// ---- 4) validacion de CADA inline ----
// Nota: los JSON-LD (application/ld+json) NO son JavaScript; se validan con
// JSON.parse (un dato malformado SI es error). Los JS inline se parsean con
// new vm.Script para detectar SyntaxError (objetivo real del guard).
inlines.forEach(function (it) {
  if (it.esLdJson) {
    try {
      JSON.parse(it.cuerpo);
      check("JSON-LD valido #" + it.idx, true, it.cuerpo.trim().length + " ch");
    } catch (e) {
      check("JSON-LD valido #" + it.idx, false, e.message);
    }
    return;
  }
  try {
    new vm.Script(it.cuerpo);
    check("parse V8 inline #" + it.idx, true, it.cuerpo.trim().length + " ch");
  } catch (e) {
    check("parse V8 inline #" + it.idx, false, e.message);
  }
});

// ---- 5) ejecucion en sandbox con stubs + funciones criticas ----
const FUNCS = [
  "abrirPopoverGuardar", "marcarVisitadoBtn", "toggleTuMapa", "toggleMapaDest",
  "cerrarPopoverGuardar", "submitRv", "votarDID", "abrirLightbox"
];

const contexto = {
  console: console,
  alert: function () {},
  prompt: function () { return null; },
  JSON: JSON,
  encodeURIComponent: encodeURIComponent,
  setTimeout: function () { return 0; },
  clearTimeout: function () {},
  Date: Date,
  Math: Math,
  parseInt: parseInt,
  parseFloat: parseFloat,
  String: String,
  Object: Object,
  Array: Array,
  Boolean: Boolean,
  isNaN: isNaN,
  fetch: function () {
    return Promise.resolve({ json: function () { return Promise.resolve({ ok: true, data: [] }); } });
  },
  document: {
    getElementById: function () { return null; },
    querySelector: function () { return null; },
    querySelectorAll: function () { return []; },
    createElement: function () {
      return {
        style: {},
        classList: { add: function () {} },
        querySelector: function () { return null; },
        appendChild: function () {}
      };
    },
    body: { appendChild: function () {} },
    addEventListener: function () {},
    removeEventListener: function () {}
  },
  window: {
    innerHeight: 800,
    ExploraCO: {
      usuario: null,
      estaGuardado: function () { return Promise.resolve(false); },
      toggleGuardado: function () {},
      marcarVisitado: function () { return Promise.resolve(true); },
      mostrarLogin: function () {},
      mostrarToast: function () {}
    }
  }
};
vm.createContext(contexto);

inlines.forEach(function (it) {
  if (it.esLdJson) return; // JSON-LD no se ejecuta
  try {
    new vm.Script(it.cuerpo).runInContext(contexto, { timeout: 2000 });
    check("ejecucion inline #" + it.idx, true);
  } catch (e) {
    check("ejecucion inline #" + it.idx, false, e.message);
  }
});

FUNCS.forEach(function (fn) {
  check("funcion definida: " + fn, typeof contexto[fn] === "function");
});

// ---- 6) balance de divs ----
const opens = (html.match(/<div/g) || []).length;
const closes = (html.match(/<\/div>/g) || []).length;
console.log("divs open=" + opens + " close=" + closes + " diff=" + (opens - closes));
check("balance de divs", opens === closes, "diff=" + (opens - closes));

console.log("");
if (fail > 0) {
  console.log("RESULTADO: FAIL (" + fail + " check(s) fallaron)");
  process.exit(1);
}
console.log("RESULTADO: TODO OK");
process.exit(0);