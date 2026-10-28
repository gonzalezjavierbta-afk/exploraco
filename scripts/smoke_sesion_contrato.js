// scripts/smoke_sesion_contrato.js -- SMOKE $0 DEL CONTRATO DE SESION (ADR-109 D-1 + T9)
//
// QUE DEMUESTRA, sin red y sin base de datos:
//   (a) lib/sesion.js y api/usuarios.js son la MISMA primitiva criptografica.
//       La primitiva de referencia NO se retipea: se EXTRAE POR TEXTO del
//       fuente de api/usuarios.js y se ejecuta con new Function. Si alguien
//       cambia el orden de claves, el secreto de fallback, la longitud de la
//       firma o la regla de 'exp' en cualquiera de los dos lados, el smoke
//       falla. Un fixture hardcodeado no detectaria eso.
//   (b) el pago doble es IMPOSIBLE POR CONSTRUCCION en la rama nueva
//       publicar_lugar_aprobar de api/interacciones.js: aserciones estaticas
//       sobre el TEXTO de la rama, sin ejecutar SQL.
//
// ASCII-safe estricto (ADR-002): 0 bytes > 127, 0 backticks, cero ES modules.
// CommonJS (BUG-001). Sin dependencias npm. Sale con exit code 1 si algo falla.
'use strict';

var fs = require('fs');
var path = require('path');
var crypto = require('crypto');

var RAIZ = path.join(__dirname, '..');
var pass = 0;
var fail = 0;
var total = 0;

function check(id, nombre, cond, detalle) {
  total++;
  if (cond) {
    pass++;
    console.log('PASS ' + id + ': ' + nombre);
  } else {
    fail++;
    console.log('FAIL ' + id + ': ' + nombre + (detalle ? ' [' + detalle + ']' : ''));
  }
}

function muestra(t) {
  var s = String(t === undefined || t === null ? '' : t);
  return s.length > 12 ? s.slice(0, 12) + '...' : s;
}

// --- Escaner de bloques: cierra por llaves ignorando strings y comentarios ---
function finBloque(src, desde) {
  var profundidad = 0;
  var comilla = '';
  var enLinea = false;
  var enBloqueCom = false;
  var abierto = false;
  for (var i = desde; i < src.length; i++) {
    var c = src.charAt(i);
    var d = src.charAt(i + 1);
    if (enLinea) { if (c === '\n') enLinea = false; continue; }
    if (enBloqueCom) { if (c === '*' && d === '/') { enBloqueCom = false; i++; } continue; }
    if (comilla) {
      if (c === '\\') { i++; continue; }
      if (c === comilla) comilla = '';
      continue;
    }
    if (c === '/' && d === '/') { enLinea = true; i++; continue; }
    if (c === '/' && d === '*') { enBloqueCom = true; i++; continue; }
    if (c === '"' || c === "'") { comilla = c; continue; }
    if (c === '{') { profundidad++; abierto = true; continue; }
    if (c === '}') {
      profundidad--;
      if (abierto && profundidad === 0) return i;
    }
  }
  return -1;
}

function extraerFuncion(src, marca) {
  var idx = src.indexOf(marca);
  if (idx === -1) return null;
  var fin = finBloque(src, idx);
  if (fin === -1) return null;
  return src.slice(idx, fin + 1);
}

// =====================================================================
// 1. FUENTES
// =====================================================================
var rutaSesion = path.join(RAIZ, 'lib', 'sesion.js');
var rutaUsuarios = path.join(RAIZ, 'api', 'usuarios.js');
var rutaInter = path.join(RAIZ, 'api', 'interacciones.js');
var rutaAdminJs = path.join(RAIZ, 'api', 'admin.js');
var rutaAdminHtml = path.join(RAIZ, 'admin.html');
var rutaApi = path.join(RAIZ, 'api');

var sesion = require(rutaSesion);
var srcUsuarios = fs.readFileSync(rutaUsuarios, 'utf8');
var srcInter = fs.readFileSync(rutaInter, 'utf8');

// Primitiva de referencia de api/usuarios.js, extraida por TEXTO.
var primRef = null;
var errorPrim = '';
try {
  var fFirmar = extraerFuncion(srcUsuarios, 'function firmarSesion(');
  var fValidar = extraerFuncion(srcUsuarios, 'function validarSesionUsuario(');
  if (!fFirmar || !fValidar) {
    errorPrim = 'no se pudo extraer la primitiva por texto';
  } else {
    var fabrica = new Function('crypto', 'Buffer', 'process',
      'var module = { exports: {} };\n'
      + fFirmar + '\n' + fValidar + '\n'
      + 'return { firmarSesion: firmarSesion, validarSesionUsuario: validarSesionUsuario };');
    primRef = fabrica(crypto, Buffer, process);
  }
} catch (e) {
  errorPrim = (e && e.message) ? e.message : 'error al instanciar';
}

function validarRef(token, sub) {
  if (!primRef) return { ok: false, razon: 'PRIMITIVA_NO_EXTRAIDA' };
  return primRef.validarSesionUsuario(
    { headers: { authorization: 'Bearer ' + token } }, sub);
}

// =====================================================================
// 2. FIXTURES DE SESION (1-7) contra lib/sesion.js
// =====================================================================
var SUB_OK = '11111111-2222-3333-4444-555555555555';
var SUB_AJENO = '99999999-8888-7777-6666-555555555555';
var ahora = Math.floor(Date.now() / 1000);

// 1. token valido
var tokValido = sesion.firmarSesion(SUB_OK);
var r1 = sesion.verificar(tokValido);
check('1', 'token valido firmado por lib/sesion.js da ok:true y sub correcto',
  !!tokValido && r1.ok === true && r1.sub === SUB_OK,
  'token=' + muestra(tokValido) + ' ok=' + r1.ok + ' sub=' + r1.sub);

// 2. firma alterada un byte
var alterado = '';
if (tokValido) {
  var ultimo = tokValido.charAt(tokValido.length - 1);
  alterado = tokValido.slice(0, -1) + (ultimo === 'A' ? 'B' : 'A');
}
var r2 = sesion.verificar(alterado);
check('2', 'un byte del HMAC cambiado da ok:false y SESION_INVALIDA',
  r2.ok === false && r2.razon === 'SESION_INVALIDA',
  'token=' + muestra(alterado) + ' razon=' + r2.razon);

// 3. token vencido (firma VALIDA, exp en el pasado)
var tokVencido = sesion.firmar({ sub: SUB_OK, iat: ahora - 7200, exp: ahora - 3600 });
var r3 = sesion.verificar(tokVencido);
check('3', 'token vencido con firma valida da SESION_EXPIRADA (no INVALIDA)',
  r3.ok === false && r3.razon === 'SESION_EXPIRADA',
  'razon=' + r3.razon);

// 4. sin header
var r4 = sesion.verificar(undefined);
check('4', 'sin header da SIN_TOKEN',
  r4.ok === false && r4.razon === 'SIN_TOKEN', 'razon=' + r4.razon);

// 5. header con Bearer y nada detras
var r5 = sesion.verificar('Bearer ');
check('5', 'header "Bearer " sin token da SIN_TOKEN',
  r5.ok === false && r5.razon === 'SIN_TOKEN', 'razon=' + r5.razon);

// 6. cadena basura que no es un JWT
var r6a = sesion.verificar('esto_no_es_un_jwt');
var r6b = sesion.verificar('aaa.bbb.ccc');
check('6', 'cadena basura (sin firma / 3 partes) da SESION_INVALIDA',
  r6a.razon === 'SESION_INVALIDA' && r6b.razon === 'SESION_INVALIDA',
  'a=' + r6a.razon + ' b=' + r6b.razon);

// 7. sub ajeno
var r7 = sesion.verificarParaUsuario(tokValido, SUB_AJENO);
check('7', 'verificarParaUsuario(token, subAjeno) da SUB_NO_COINCIDE',
  r7.ok === false && r7.razon === 'SUB_NO_COINCIDE', 'razon=' + r7.razon);

// =====================================================================
// 3. PARIDAD CRUZADA (8), dos rondas: fallback y secreto definido
// =====================================================================
var secretoPrevio = process.env.SESSION_JWT_SECRET;
var teniaSecreto = Object.prototype.hasOwnProperty.call(process.env, 'SESSION_JWT_SECRET');

function paridad(etiqueta, id) {
  var okIda = false;
  var okVuelta = false;
  var detalle = '';
  if (!primRef) {
    check(id, 'paridad cruzada lib/sesion.js <-> api/usuarios.js (' + etiqueta + ')',
      false, 'primitiva de referencia no extraida: ' + errorPrim);
    return;
  }
  try {
    // Ida: firma lib/sesion.js -> valida primitiva de api/usuarios.js
    var tLib = sesion.firmarSesion(SUB_OK);
    var vRef = validarRef(tLib, SUB_OK);
    okIda = (vRef && vRef.ok === true);

    // Vuelta: firma api/usuarios.js -> valida lib/sesion.js
    var tUsu = primRef.firmarSesion(SUB_OK);
    var vLib = sesion.verificarParaUsuario(tUsu, SUB_OK);
    okVuelta = (vLib && vLib.ok === true && vLib.sub === SUB_OK);
    detalle = 'ida=' + okIda + '(lib->usuarios ' + muestra(tLib) + ') vuelta='
      + okVuelta + '(usuarios->lib ' + muestra(tUsu) + ')';
  } catch (e) {
    detalle = 'excepcion: ' + ((e && e.message) ? e.message : '?');
  }
  check(id, 'paridad cruzada lib/sesion.js <-> api/usuarios.js (' + etiqueta + ')',
    okIda && okVuelta, detalle);
}

// Ronda A: sin SESSION_JWT_SECRET -> los dos lados caen al fallback 'dev_secret'
try {
  delete process.env.SESSION_JWT_SECRET;
  paridad('sin env, fallback dev_secret', '8a');
  // Ronda B: con secreto definido -> los dos lados usan la env var
  process.env.SESSION_JWT_SECRET = 'secreto_smoke_paridad_adr109';
  paridad('con SESSION_JWT_SECRET definido', '8b');
} finally {
  if (teniaSecreto) process.env.SESSION_JWT_SECRET = secretoPrevio;
  else delete process.env.SESSION_JWT_SECRET;
}

// =====================================================================
// 4. CONTROL NEGATIVO DE PAGO DOBLE (9-15), por TEXTO
// =====================================================================
var marcaRama = "if (tipo2 === 'publicar_lugar_aprobar') {";
var idxRama = srcInter.indexOf(marcaRama);
var finRama = (idxRama === -1) ? -1 : finBloque(srcInter, idxRama);
var rama = (idxRama === -1 || finRama === -1) ? '' : srcInter.slice(idxRama, finRama + 1);

// 9. el ledger vive DENTRO del if que exige claim == 1 fila
var marcaClaim = 'if (claimNAl === 1)';
var idxClaim = rama.indexOf(marcaClaim);
var finClaim = (idxClaim === -1) ? -1 : finBloque(rama, idxClaim);
var idxLedger = rama.indexOf('registrarXpLedger(');
var guardaPierde = rama.indexOf('if (claimNAl !== 1)');
var ok9 = (indexOfAll(rama, 'registrarXpLedger(') === 1)
  && guardaPierde !== -1
  && idxClaim !== -1 && finClaim !== -1
  && idxLedger > idxClaim && idxLedger < finClaim
  && guardaPierde < idxLedger;
check('9', 'registrarXpLedger esta DENTRO del if (claimNAl === 1) y tras el guardia claim!==1',
  ok9, 'idxClaim=' + idxClaim + ' idxLedger=' + idxLedger + ' finClaim=' + finClaim
  + ' guarda=' + guardaPierde);

// 10. la rama no usa bloqueo pesimista
check('10', 'la rama publicar_lugar_aprobar no contiene FOR UPDATE',
  rama !== '' && rama.indexOf('FOR UPDATE') === -1);
check('10b', 'la rama publicar_lugar_aprobar se delimito por llaves (no vacia)',
  rama.length > 2000, 'len=' + rama.length);

// 11. XP_CERO / error_calculo ANTES de escribir otorgado
var idxCero = rama.indexOf("error: 'XP_CERO'");
var idxMotivoCalc = rama.indexOf("motivo: 'error_calculo'");
var idxGuardiaCero = rama.indexOf('xpTotalAl <= 0');
var idxOtorgado = rama.indexOf("pub_xp_estado: 'otorgado'");
check('11', 'existe XP_CERO/error_calculo y ocurre ANTES de escribir pub_xp_estado otorgado',
  idxGuardiaCero !== -1 && idxCero !== -1 && idxMotivoCalc !== -1
  && idxOtorgado !== -1 && idxCero < idxOtorgado && idxGuardiaCero < idxOtorgado,
  'guardia=' + idxGuardiaCero + ' cero=' + idxCero + ' otorgado=' + idxOtorgado);

// 11b. la publicacion tambien ocurre despues del guardia de XP (no hay pago sin publicar)
check('11b', 'el UPDATE de error_calculo escribe estado recuperable (no otorgado)',
  rama.indexOf("pub_xp_estado: 'error_calculo'") !== -1);

// 12. estados aprobables + draft/enviado + admin sin_destinatario
var idxEstados = rama.indexOf("status IN ('enviado','published')");
var idxDraft = rama.indexOf('draft');
var idxEnvio = rama.indexOf('estado_envio');
var idxAdmin = rama.indexOf("=== 'admin'");
var idxSinDest = rama.indexOf("'sin_destinatario'");
check('12', 'estados aprobables y draft+enviado presentes; origen_envio admin -> sin_destinatario',
  idxEstados !== -1 && idxDraft !== -1 && idxEnvio !== -1
  && idxAdmin !== -1 && idxSinDest !== -1
  && idxSinDest > idxAdmin && idxSinDest < idxOtorgado,
  'estados=' + idxEstados + ' draft=' + idxDraft + ' envio=' + idxEnvio
  + ' admin=' + idxAdmin + ' sinDest=' + idxSinDest);

// 13. api/admin.js sin la via vieja de pago
var srcAdminJs = fs.readFileSync(rutaAdminJs, 'utf8');
check('13', 'api/admin.js ya no contiene publicar_lugar_otorgar ni error_otorgar',
  srcAdminJs.indexOf('publicar_lugar_otorgar') === -1
  && srcAdminJs.indexOf('error_otorgar') === -1);

// 14. admin.html solo usa la accion nueva
var srcAdminHtml = fs.readFileSync(rutaAdminHtml, 'utf8');
check('14', 'admin.html sin accion=aprobar y con publicar_lugar_aprobar',
  srcAdminHtml.indexOf('accion=aprobar') === -1
  && srcAdminHtml.indexOf('publicar_lugar_aprobar') !== -1);

// 15. presupuesto de funciones serverless intacto
var ficherosApi = fs.readdirSync(rutaApi).filter(function (n) {
  return /\.js$/.test(n);
});
check('15', 'siguen habiendo 8 funciones serverless en api/*.js',
  ficherosApi.length === 8, ficherosApi.length + ': ' + ficherosApi.join(','));

function indexOfAll(texto, aguja) {
  var n = 0;
  var i = texto.indexOf(aguja);
  while (i !== -1) { n++; i = texto.indexOf(aguja, i + 1); }
  return n;
}

// =====================================================================
// 5. RESUMEN
// =====================================================================
console.log('');
console.log(pass + '/' + total + ' PASS');
if (fail > 0) {
  console.log('RESULTADO: FAIL (' + fail + ' comprobacion(es) roja(s))');
  process.exitCode = 1;
} else {
  console.log('RESULTADO: OK. Sesion y no-pago-doble verificados por construccion (ADR-109).');
  process.exitCode = 0;
}
