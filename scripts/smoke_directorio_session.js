// Smoke read-only de directorio-session.js (modulo compartido del directorio).
// Ejecuta el IIFE en un sandbox vm y verifica la migracion legacy id->slug:
//   (a) reintento tras llegar el catalogo del API (_uuid) -> convierte a slug;
//   (b) id no mapeable -> se conserva sin borrar;
//   (c) idempotencia (segunda corrida no escribe ni cambia nada);
//   (d) re-renderiza y tSave persiste a DB con sesion.
// ASCII puro. No toca red ni archivos.
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const SRC = path.join(__dirname, "..", "directorio-session.js");

let fail = 0;
function check(label, cond, detalle) {
  console.log((cond ? "PASS" : "FAIL") + " - " + label + (detalle ? " | " + detalle : ""));
  if (!cond) fail++;
}
function elStub() {
  return {
    style: {},
    classList: { add: function () {}, remove: function () {}, contains: function () { return false; } },
    textContent: "",
    appendChild: function () {}
  };
}

// Crea un sandbox con catalogo embebido, mm_saved legacy y DOM minimo.
function nuevo(embedded, saved, opts) {
  opts = opts || {};
  const store = {};
  if (saved !== undefined) store.mm_saved = JSON.stringify(saved);
  const listeners = {};
  const calls = { renders: 0, setItem: 0, guardar: [], quitar: [] };
  const dom = {
    readyState: "loading",
    addEventListener: function (t, fn) { (listeners[t] = listeners[t] || []).push(fn); },
    getElementById: function () { return null; },
    createElement: function () { return elStub(); },
    querySelector: function () { return null; },
    querySelectorAll: function () { return []; },
    body: { appendChild: function () {} }
  };
  const win = {
    mmSaved: saved ? JSON.parse(JSON.stringify(saved)) : [],
    PLACES: embedded,
    renderDir: function () { calls.renders++; }
  };
  if (opts.conSesion) {
    win.ExploraCO = {
      usuario: { id: "u1" },
      guardarDestino: function (uuid) { calls.guardar.push(uuid); return Promise.resolve(true); },
      quitarGuardado: function (uuid) { calls.quitar.push(uuid); return Promise.resolve(true); }
    };
  }
  const ctx = {
    window: win,
    document: dom,
    localStorage: {
      getItem: function (k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
      setItem: function (k, v) { calls.setItem++; store[k] = String(v); },
      removeItem: function (k) { delete store[k]; }
    },
    fetch: function () {
      return Promise.resolve({ json: function () { return Promise.resolve({ ok: true, data: [] }); } });
    },
    console: console,
    setTimeout: function () { return 0; },
    clearTimeout: function () {}
  };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(SRC, "utf8"), ctx, { filename: "directorio-session.js" });
  return { ctx: ctx, win: win, store: store, calls: calls, listeners: listeners };
}

function dispara(s, evento) {
  (s.listeners[evento] || []).forEach(function (fn) { fn(); });
}
function leeLocal(s) { return JSON.parse(s.store.mm_saved || "[]"); }
function micro() { return new Promise(function (r) { setImmediate(r); }); }

async function main() {
  // --- Catalogo embebido: ids posicionales 1..3, sin _uuid ---
  const emb = [
    { id: 1, slug: "emb-one" },
    { id: 2, slug: "emb-two" },
    { id: 3, slug: "emb-three" }
  ];

  // ---- (a) retry con catalogo API (_uuid) + (b) no mapeable se conserva ----
  const A = nuevo(emb, [3, 9], {});
  dispara(A, "DOMContentLoaded");
  check("A: embebido resuelve id 3 -> slug", A.win.mmSaved[0] === "emb-three", "=" + A.win.mmSaved[0]);
  check("A: id 9 no mapeable se conserva (no borra)", A.win.mmSaved[1] === 9, "=" + A.win.mmSaved[1]);
  check("A: localStorage con el slug embebido", leeLocal(A)[0] === "emb-three", "local=" + JSON.stringify(leeLocal(A)));

  // Simula directorio-api-connector.js: reemplaza PLACES en sitio por items
  // con id posicional (idx+1) y _uuid, tal como toPlace().
  const api = [
    { id: 1, _uuid: "11111111-1111-1111-1111-111111111111", slug: "api-one" },
    { id: 8, _uuid: "88888888-8888-8888-8888-888888888888", slug: "api-eight" },
    { id: 9, _uuid: "99999999-9999-9999-9999-999999999999", slug: "api-nine" }
  ];
  A.win.PLACES.length = 0;
  api.forEach(function (p) { A.win.PLACES.push(p); });

  const rendersAntes = A.calls.renders;
  A.win.renderDir(); // el wrapper de renderDir re-invoca hidratar -> reintenta
  check("A: retry tras catalogo API convierte id 9 -> slug", A.win.mmSaved[1] === "api-nine", "=" + A.win.mmSaved[1]);
  check("A: localStorage reescrito con slugs", JSON.stringify(leeLocal(A)) === JSON.stringify(["emb-three", "api-nine"]), "local=" + JSON.stringify(leeLocal(A)));
  check("A: re-renderiza al migrar", A.calls.renders > rendersAntes, "renders=" + A.calls.renders);

  // ---- (c) idempotencia: segunda corrida no cambia ni escribe ----
  const snap = JSON.stringify(A.win.mmSaved);
  const setAntes = A.calls.setItem;
  A.win.renderDir();
  dispara(A, "DOMContentLoaded");
  check("C: segunda corrida no cambia mmSaved", JSON.stringify(A.win.mmSaved) === snap, "=" + JSON.stringify(A.win.mmSaved));
  check("C: segunda corrida no escribe localStorage", A.calls.setItem === setAntes, "setItem=" + A.calls.setItem);

  // ---- (b bis) id no mapeable en NINGUN catalogo permanece y no escribe ----
  const B = nuevo(emb, [99], {});
  const setB = B.calls.setItem;
  dispara(B, "DOMContentLoaded");
  B.win.renderDir();
  check("B: id 99 sin mapeo se conserva", B.win.mmSaved[0] === 99, "=" + B.win.mmSaved[0]);
  check("B: no borra la entrada local", JSON.stringify(leeLocal(B)) === JSON.stringify([99]), "local=" + JSON.stringify(leeLocal(B)));
  check("B: no reescribe por un id sin mapeo", B.calls.setItem === setB, "setItem=" + B.calls.setItem);

  // ---- (d) tSave persiste a DB con sesion (uuid del catalogo API) ----
  const D = nuevo(api, [], { conSesion: true });
  const btn = elStub();
  D.win.tSave("api-nine", btn);
  await micro();
  await micro();
  check("D: tSave llama guardarDestino con el uuid", D.calls.guardar[0] === "99999999-9999-9999-9999-999999999999", "uuid=" + D.calls.guardar[0]);
  check("D: tSave marca el boton", btn.textContent === "\u2665" && !!btn.classList, "txt=" + btn.textContent);
  check("D: tSave persiste en localStorage", JSON.stringify(leeLocal(D)) === JSON.stringify(["api-nine"]), "local=" + JSON.stringify(leeLocal(D)));

  console.log("");
  console.log(fail > 0 ? "RESULTADO: FAIL (" + fail + ")" : "RESULTADO: TODO OK");
  process.exit(fail > 0 ? 1 : 0);
}

main().catch(function (e) {
  console.log("FAIL - excepcion en el smoke: " + (e && e.stack ? e.stack : e));
  process.exit(1);
});
