// lib/sesion.js -- VERIFICADOR DE SESION EN PROCESO (ADR-109 D1 + T1)
//
// POR QUE VIVE EN lib/ Y NO EN api/: los 8 ficheros de api/ son 8/8
// funciones serverless (presupuesto Vercel Hobby AGOTADO, ADR-002
// plataforma). Este modulo NO es endpoint: es la libreria que
// api/publicar-lugar.js requirea, y Vercel la incluye en el bundle por
// trazado de dependencias (nft) sin consumir funcion.
//
// QUE BUG CIERRA: api/publicar-lugar.js delegaba la identidad en un fetch()
// a /api/interacciones (resolverAutor). Si ese fetch fallaba -- cold start,
// 500, timeout, o el propio runtime sin red saliente -- el catch devolvia
// autor_id = null EN SILENCIO y la ficha se guardaba como anonima. Resultado
// medido: 3 de 3 envios del flujo nuevo sin autor (ADR-109, hechos 1-3).
// Verificar aqui, en el mismo proceso, elimina el salto de red y con el la
// degradacion silenciosa: o hay firma valida, o hay razon explicita.
//
// CONTRATO (ADR-109 D-1): la paridad con api/usuarios.js NO se define sobre
// el retorno (validarSesionUsuario exige el 'sub' esperado y devuelve
// {ok:true} a secas), se define sobre la PRIMITIVA CRIPTOGRAFICA, que es
// identica a la de api/usuarios.js:610-653:
//   payload {sub, iat, exp} -> JSON -> base64url;
//   firma = HMAC-SHA256(payloadB64) con SESSION_JWT_SECRET, fallback
//   'dev_secret'; comparacion de longitudes + timingSafeEqual; y la regla de
//   'exp' que distingue SESION_EXPIRADA de SESION_INVALIDA.
// El 'sub' queda FUERA del contrato comun y encima, en el wrapper
// verificarParaUsuario(token, sub), que es el autorizado por el operador.
//
// FORMA DE RETORNO FIJA, nunca lanza, NUNCA loguea el token:
//   {ok:boolean, sub:string|null, razon:'OK'|'SIN_TOKEN'|'SESION_INVALIDA'
//                                        |'SESION_EXPIRADA'|'SUB_NO_COINCIDE'}
//
// DOBLE SUPERFICIE (mismo patron que lib/completitud.js): module.exports en
// Node/CommonJS y globalThis.ECSesion en navegador. Solo la rama Node es
// AUTORIDAD de identidad: en el navegador no hay HMAC sincrono (WebCrypto es
// asincrono), asi que alli verificar() es fail-closed -- SESION_INVALIDA,
// jamas concede identidad. Ningun HTML lo carga hoy; la superficie de
// navegador existe para respetar el patron de lib/, no para verificar en el
// cliente (el servidor es siempre la autoridad, ADR-099 D4).
//
// ASCII-safe estricto (ADR-002): 0 bytes > 127, 0 backticks, cero ES modules.
(function (raiz, fabrica) {
  'use strict';
  var cripto = null;
  if (typeof require === 'function') {
    try { cripto = require('crypto'); } catch (e) { cripto = null; }
  }
  var api = fabrica(cripto);
  if (typeof module !== 'undefined' && module && module.exports) module.exports = api;
  if (raiz) raiz.ECSesion = api;
})(typeof globalThis !== 'undefined' ? globalThis
  : (typeof window !== 'undefined' ? window
    : (typeof self !== 'undefined' ? self : null)), function (cripto) {
  'use strict';

  // Version del contrato. Se expone para que el smoke de paridad (D-1) pueda
  // afirmar contra que version compara: si la primitiva cambia, cambia.
  var VERSION = '1';

  // Mismos valores que api/usuarios.js: +7 dias y fallback de desarrollo.
  var DIAS_SESION = 7;
  var SECRETO_FALLBACK = 'dev_secret';

  function fallo(r) { return { ok: false, sub: null, razon: r }; }
  function exito(sub) { return { ok: true, sub: String(sub), razon: 'OK' }; }

  // Secreto compartido. Se lee en cada llamada (nunca se captura al cargar el
  // modulo): una rotacion de la env var no deja el proceso con la vieja.
  function secreto() {
    if (typeof process !== 'undefined' && process && process.env
        && process.env.SESSION_JWT_SECRET)
      return String(process.env.SESSION_JWT_SECRET);
    return SECRETO_FALLBACK;
  }

  function hayCripto() {
    return !!cripto && typeof Buffer !== 'undefined';
  }

  // Normalizacion del header: acepta 'Bearer x' y 'x' (el llamador puede
  // pasar el token ya limpio). Cero excepciones, cero logging.
  function limpiarToken(token) {
    var t = String(token === undefined || token === null ? '' : token).trim();
    t = t.replace(/^Bearer(\s+|$)/i, '').trim();
    return t;
  }

  // firmar(payload) -- payload objeto {sub, iat, exp} o directamente el sub.
  // Devuelve el token o null si no hay cripto (navegador) o no hay sub.
  // iat/exp por defecto: ahora y ahora + 7 dias (misma duracion que
  // api/usuarios.js). Aceptar 'exp' inyectado es lo que permite firmar el
  // fixture de sesion vencida sin tocar el reloj.
  function firmar(payload) {
    if (!hayCripto()) return null;
    if (payload === undefined || payload === null) return null;
    var p = (typeof payload === 'object') ? payload : { sub: payload };
    var sub = (p.sub === undefined || p.sub === null) ? '' : String(p.sub).trim();
    if (!sub) return null;
    var ahora = Math.floor(Date.now() / 1000);
    var iat = (typeof p.iat === 'number' && isFinite(p.iat) && p.iat > 0)
      ? Math.floor(p.iat) : ahora;
    var exp = (typeof p.exp === 'number' && isFinite(p.exp) && p.exp > 0)
      ? Math.floor(p.exp) : iat + DIAS_SESION * 24 * 3600;
    // Mismo orden de claves que api/usuarios.js:613 -> mismo JSON -> mismo
    // payloadB64. El orden importa: la firma cubre los bytes, no el objeto.
    var cuerpo = { sub: sub, iat: iat, exp: exp };
    var payloadB64 = Buffer.from(JSON.stringify(cuerpo), 'utf8').toString('base64url');
    var firma = cripto.createHmac('sha256', secreto()).update(payloadB64).digest('base64url');
    return payloadB64 + '.' + firma;
  }

  // Alias con el nombre que usa api/usuarios.js:610 (T9 (ii) exige el
  // export). Firma una sesion para el usuario dado.
  function firmarSesion(usuarioId) {
    if (usuarioId === undefined || usuarioId === null) return null;
    return firmar({ sub: String(usuarioId) });
  }

  // verificar(token) -- {ok, sub, razon}. SIN_TOKEN cuando no hay header (o
  // dice 'Bearer' sin token). Orden de comprobaciones IDENTICO al de
  // api/usuarios.js: firma ANTES de parsear el payload (no se toca el JSON de
  // un token sin firma valida), y 'exp' despues de exigir exp y sub.
  function verificar(token) {
    var t = limpiarToken(token);
    if (!t) return fallo('SIN_TOKEN');
    if (!hayCripto()) return fallo('SESION_INVALIDA');
    var punto = t.indexOf('.');
    if (punto <= 0 || punto === t.length - 1) return fallo('SESION_INVALIDA');
    var payloadB64 = t.slice(0, punto);
    var firma = t.slice(punto + 1);
    var esperada = cripto.createHmac('sha256', secreto()).update(payloadB64).digest('base64url');
    var fa = Buffer.from(firma, 'utf8');
    var fb = Buffer.from(esperada, 'utf8');
    if (fa.length !== fb.length) return fallo('SESION_INVALIDA');
    if (!cripto.timingSafeEqual(fa, fb)) return fallo('SESION_INVALIDA');
    var payload = null;
    try {
      payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
    } catch (e) { return fallo('SESION_INVALIDA'); }
    if (!payload || !payload.exp || !payload.sub) return fallo('SESION_INVALIDA');
    if (payload.exp <= Math.floor(Date.now() / 1000)) return fallo('SESION_EXPIRADA');
    return exito(payload.sub);
  }

  // verificarParaUsuario(token, sub) -- verificacion + propiedad. Es el
  // wrapper autorizado por el operador (ADR-109 D-1): el 'sub' NO forma parte
  // del contrato comun, se comprueba aqui.
  function verificarParaUsuario(token, sub) {
    var base = verificar(token);
    if (!base.ok) return base;
    if (sub === undefined || sub === null || String(sub).trim() === '')
      return fallo('SUB_NO_COINCIDE');
    if (base.sub !== String(sub).trim()) return fallo('SUB_NO_COINCIDE');
    return base;
  }

  return {
    VERSION: VERSION,
    firmar: firmar,
    firmarSesion: firmarSesion,
    verificar: verificar,
    // Alias con el nombre que exige el gate estatico (ADR-109 T9 (ii)).
    verificarToken: verificar,
    verificarParaUsuario: verificarParaUsuario
  };
});
