// Smoke del contrato de prefijo cliente<->servidor de media-upload.js.
// SIN RED: monta un sandbox vm con window/localStorage/fetch falsos. Como no
// hay navegador, la carga del SDK @vercel/blob falla y subir() entra en su
// catch de diagnostico, que es justo donde se puede capturar el pathname y el
// clientPayload REALES que el cliente pidio subir. El prefijo capturado se
// contrasta con la regla que aplica api/utilidades.js (leida del propio
// archivo, no copiada de memoria).
// ASCII puro.
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const raiz = path.join(__dirname, "..");
const fuenteCliente = fs.readFileSync(path.join(raiz, "media-upload.js"), "utf8");
const fuenteServidor = fs.readFileSync(path.join(raiz, "api", "utilidades.js"), "utf8");

let total = 0;
let fail = 0;
function check(label, cond, detalle) {
  total++;
  if (!cond) fail++;
  console.log((cond ? "PASS" : "FAIL") + " - " + label + (detalle ? " | " + detalle : ""));
}

const TICK = String.fromCharCode(96);

// ---- 1. Contrato estatico: constantes del cliente == reglas del servidor ----
function constanteCliente(nombre) {
  const m = new RegExp("var " + nombre + " = '([^']+)'").exec(fuenteCliente);
  return m ? m[1] : null;
}

const P_PUBLICO = constanteCliente("PREFIJO_PUBLICO");
const P_USUARIO = constanteCliente("PREFIJO_USUARIO");
const P_ADMIN = constanteCliente("PREFIJO_ADMIN");

check("cliente ASCII-safe (cero bytes > 127)", !/[\x80-\xff]/.test(fuenteCliente));
check("cliente sin backticks", fuenteCliente.indexOf(TICK) === -1);
check("cliente declara PREFIJO_PUBLICO = publico/destino/", P_PUBLICO === "publico/destino/", String(P_PUBLICO));
check("cliente declara PREFIJO_USUARIO = usuarios/", P_USUARIO === "usuarios/", String(P_USUARIO));
check("cliente declara PREFIJO_ADMIN = admin/", P_ADMIN === "admin/", String(P_ADMIN));

check("servidor usa prefijo admin/", fuenteServidor.indexOf("prefijo = 'admin/';") !== -1);
check("servidor usa prefijo usuarios/<sub>/", fuenteServidor.indexOf("prefijo = 'usuarios/' + sesion.sub + '/';") !== -1);
check("servidor usa prefijo publico/destino/", fuenteServidor.indexOf("prefijo = 'publico/destino/';") !== -1);
check("servidor exige pathname con prefijo + tipo + /",
  fuenteServidor.indexOf("indexOf(prefijo + tipo + '/') !== 0") !== -1);
check("servidor exige foto + contexto destino en el modo publico",
  fuenteServidor.indexOf("if (tipo !== 'foto' || String(pl.contexto || '') !== 'destino')") !== -1);
check("servidor compara usuario_id con el sub del jwt",
  fuenteServidor.indexOf("String(pl.usuario_id) !== String(sesion.sub)") !== -1);

// Espejo de la linea del servidor que autoriza o rechaza el pathname.
function autorizadoPorServidor(pathname, prefijo, tipo) {
  return String(pathname).indexOf(prefijo + tipo + "/") === 0;
}
check("espejo de la regla del servidor (control positivo)",
  autorizadoPorServidor("publico/destino/foto/x.jpg", "publico/destino/", "foto") === true);
check("espejo de la regla del servidor (control negativo)",
  autorizadoPorServidor("publico/destino/foto/x.jpg", "usuarios/sub-prueba/", "foto") === false);

// ---- 2. Tokens de prueba (formato real: payloadB64.firma, payload primero) --
function b64url(obj) {
  return Buffer.from(JSON.stringify(obj), "utf8").toString("base64url");
}
function tokenPrueba(payload) {
  return b64url(payload) + "." + "firma-de-prueba";
}
function subDeJwt(jwt) {
  if (!jwt || typeof jwt !== "string") return null;
  const partes = jwt.split(".");
  const b64 = partes.length >= 3 ? partes[1] : partes[0];
  try {
    const d = JSON.parse(Buffer.from(b64, "base64url").toString("utf8"));
    return d && d.sub ? String(d.sub) : null;
  } catch (e) {
    return null;
  }
}

const AHORA = Math.floor(Date.now() / 1000);
const SUB = "sub-prueba";
const JWT_VALIDO = tokenPrueba({ sub: SUB, exp: AHORA + 3600 });
const JWT_CADUCADO = tokenPrueba({ sub: SUB, exp: AHORA - 60 });

// ---- 3. Sandbox: una carga limpia del cliente por escenario -----------------
function correr(esc) {
  esc = esc || {};
  const capturas = [];
  const almacen = { exploraco_user: esc.exploracoUser === undefined ? null : esc.exploracoUser };
  const localStorageFalso = {
    getItem: function (k) { return (k in almacen) ? almacen[k] : null; },
    setItem: function () {},
    removeItem: function () {}
  };
  const sandbox = {
    console: console,
    JSON: JSON, Math: Math, Date: Date, Promise: Promise, Error: Error, TypeError: TypeError,
    String: String, Object: Object, Array: Array, Number: Number, Boolean: Boolean, RegExp: RegExp,
    parseInt: parseInt, parseFloat: parseFloat, isNaN: isNaN,
    setTimeout: setTimeout, clearTimeout: clearTimeout,
    encodeURIComponent: encodeURIComponent, decodeURIComponent: decodeURIComponent,
    localStorage: localStorageFalso,
    fetch: function (url, opciones) {
      capturas.push({ url: url, body: JSON.parse(String(opciones && opciones.body)) });
      const error = esc.errorServidor || null;
      return Promise.resolve({
        status: error ? 403 : 200,
        json: function () { return Promise.resolve(error ? { ok: false, error: error } : { ok: true, clientToken: "token-falso" }); }
      });
    }
  };
  const win = { localStorage: localStorageFalso };
  if (esc.exploraco) { win.ExploraCO = esc.exploraco; }
  sandbox.window = win;
  vm.createContext(sandbox);
  vm.runInContext(fuenteCliente, sandbox, { filename: "media-upload.js" });
  return { capturas: capturas, win: win };
}

const ARCHIVO = { name: "playa.jpg", type: "image/jpeg", size: 1024 };

function intento(caja, opciones) {
  const opts = Object.assign({ file: ARCHIVO }, opciones);
  return caja.win.MediaUpload.subir(opts).then(
    function (r) { return { ok: true, resultado: r }; },
    function (e) { return { ok: false, error: e }; }
  );
}

function ultimaCaptura(caja) {
  const c = caja.capturas[caja.capturas.length - 1];
  if (!c) return { pathname: "", payload: {}, url: "" };
  return {
    url: c.url,
    pathname: String((c.body && c.body.payload && c.body.payload.pathname) || ""),
    payload: JSON.parse(String((c.body && c.body.payload && c.body.payload.clientPayload) || "{}"))
  };
}

// Invariante del cliente: el prefijo y el payload no pueden contradecirse.
function coherenciaCliente(cap) {
  if (cap.pathname.indexOf("usuarios/") === 0) {
    return !!cap.payload.jwt && cap.payload.usuario_id === subDeJwt(cap.payload.jwt);
  }
  if (cap.pathname.indexOf("publico/destino/") === 0) {
    return cap.payload.jwt === null || cap.payload.jwt === undefined;
  }
  return false;
}

(async function () {
  // ---- A. jwt valido en localStorage y SIN window.ExploraCO -> usuarios ----
  const A = correr({ exploracoUser: JSON.stringify({ jwt: JWT_VALIDO }) });
  const a = await intento(A, { contexto: "museo" });
  const ca = ultimaCaptura(A);
  check("A: se envio el evento del protocolo en el catch", A.capturas.length === 1, "capturas=" + A.capturas.length);
  check("A: prefijo de usuario derivado del sub", ca.pathname.indexOf("usuarios/" + SUB + "/foto/") === 0, ca.pathname);
  check("A: servidor autorizaria el pathname", autorizadoPorServidor(ca.pathname, "usuarios/" + SUB + "/", "foto"));
  check("A: clientPayload lleva el jwt", typeof ca.payload.jwt === "string" && ca.payload.jwt.length > 0);
  check("A: clientPayload.usuario_id == sub", ca.payload.usuario_id === SUB, String(ca.payload.usuario_id));
  check("A: coherencia prefijo<->payload", coherenciaCliente(ca));
  check("A: el rechazo es humano, no el texto del SDK",
    !a.ok && /no se pudo subir/i.test(a.error.message) && !/client token/i.test(a.error.message),
    a.ok ? "no fallo" : a.error.message);

  // ---- B. jwt caducado + contexto destino, sin nucleo -> modo publico ----
  const B = correr({ exploracoUser: JSON.stringify({ jwt: JWT_CADUCADO }) });
  const b = await intento(B, { contexto: "destino" });
  const cb = ultimaCaptura(B);
  check("B: jwt caducado NO se reutiliza en el prefijo de usuario",
    cb.pathname.indexOf("usuarios/") !== 0, cb.pathname);
  check("B: prefijo publico de destino", cb.pathname.indexOf("publico/destino/foto/") === 0, cb.pathname);
  check("B: servidor autorizaria el pathname",
    autorizadoPorServidor(cb.pathname, "publico/destino/", "foto"));
  check("B: clientPayload.jwt es null", cb.payload.jwt === null, JSON.stringify(cb.payload.jwt));
  check("B: tipo y contexto que exige el servidor",
    cb.payload.tipo === "foto" && cb.payload.contexto === "destino");
  check("B: coherencia prefijo<->payload", coherenciaCliente(cb));

  // ---- C. jwt caducado + refreshJwt -> UN reintento con el token nuevo ----
  const JWT_NUEVO = tokenPrueba({ sub: SUB, exp: AHORA + 7200 });
  let refrescos = 0;
  const C = correr({
    exploracoUser: JSON.stringify({ jwt: JWT_CADUCADO }),
    exploraco: { refreshJwt: function () { refrescos++; return Promise.resolve(JWT_NUEVO); } }
  });
  await intento(C, { contexto: "destino" });
  const cc = ultimaCaptura(C);
  check("C: refreshJwt se llamo UNA sola vez", refrescos === 1, "veces=" + refrescos);
  check("C: reintento con prefijo de usuario", cc.pathname.indexOf("usuarios/" + SUB + "/foto/") === 0, cc.pathname);
  check("C: payload con el token refrescado", cc.payload.jwt === JWT_NUEVO);
  check("C: coherencia prefijo<->payload", coherenciaCliente(cc));

  // ---- D. modo:'publico' con sesion valida -> publico y jwt:null ----
  const D = correr({ exploracoUser: JSON.stringify({ jwt: JWT_VALIDO }) });
  const d = await intento(D, { contexto: "destino", modo: "publico" });
  const cd = ultimaCaptura(D);
  check("D: modo publico manda sobre la sesion", cd.pathname.indexOf("publico/destino/foto/") === 0, cd.pathname);
  check("D: servidor autorizaria el pathname",
    autorizadoPorServidor(cd.pathname, "publico/destino/", "foto"));
  check("D: clientPayload.jwt es null", cd.payload.jwt === null, JSON.stringify(cd.payload.jwt));
  check("D: coherencia prefijo<->payload", coherenciaCliente(cd));
  check("D: sin red no se sube nada (solo se diagnostico)", !d.ok);

  // ---- E. jwt caducado + contexto distinto de destino -> mensaje claro ----
  const E = correr({ exploracoUser: JSON.stringify({ jwt: JWT_CADUCADO }) });
  const e = await intento(E, { contexto: "museo" });
  check("E: rechazo sin llegar a la red", E.capturas.length === 0, "capturas=" + E.capturas.length);
  check("E: mensaje humano de sesion",
    !e.ok && /iniciar sesion/i.test(e.error.message), e.ok ? "no fallo" : e.error.message);

  // ---- F. refresh que falla + contexto distinto de destino -> mensaje claro ----
  const F = correr({
    exploracoUser: JSON.stringify({ jwt: JWT_CADUCADO }),
    exploraco: { refreshJwt: function () { return Promise.reject(new Error("sin red")); } }
  });
  const f = await intento(F, { contexto: "perfil" });
  check("F: refresh fallido no rompe el flujo", F.capturas.length === 0, "capturas=" + F.capturas.length);
  check("F: mensaje humano de sesion",
    !f.ok && /iniciar sesion/i.test(f.error.message), f.ok ? "no fallo" : f.error.message);

  // ---- G. traduccion de los codigos reales del servidor ----
  const CODIGOS = [
    "ALMACENAMIENTO_NO_CONFIGURADO",
    "SESION_REQUERIDA",
    "SESION_INVALIDA",
    "PATHNAME_NO_AUTORIZADO",
    "PATHNAME_INVALIDO"
  ];
  const mensajes = {};
  for (const codigo of CODIGOS) {
    const caja = correr({ exploracoUser: JSON.stringify({ jwt: JWT_VALIDO }), errorServidor: codigo });
    const r = await intento(caja, { contexto: "museo" });
    const msj = r.ok ? "" : String(r.error.message);
    mensajes[codigo] = msj;
    check("G: " + codigo + " traducido a mensaje humano",
      msj.length > 0 && !/client token/i.test(msj) && !new RegExp("^" + codigo + "$").test(msj), msj);
  }
  const distintos = new Set(CODIGOS.map(function (c) { return mensajes[c]; }));
  check("G: un mensaje distinguible por codigo", distintos.size === CODIGOS.length, "distintos=" + distintos.size);
  check("G: mensajes ASCII-safe",
    CODIGOS.every(function (c) { return !/[\x80-\xff]/.test(mensajes[c]); }));

  console.log("");
  console.log("RESULTADO: " + (total - fail) + "/" + total + (fail === 0 ? " OK" : " - FALLOS: " + fail));
  process.exit(fail === 0 ? 0 : 1);
})().catch(function (e) {
  console.log("FAIL - excepcion no controlada: " + (e && e.stack ? e.stack : e));
  console.log("");
  console.log("RESULTADO: " + (total - fail) + "/" + total + " - FALLOS: " + (fail + 1));
  process.exit(1);
});
