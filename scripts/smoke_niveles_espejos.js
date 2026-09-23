// scripts/smoke_niveles_espejos.js
// GATE de los 8 espejos de los 40 umbrales de nivel (ADR-053 Decision 11).
//
// Fuente servidor: api/usuarios.js -> NIVELES (la unica tabla autoritativa).
// Espejos validados:
//   1. api/usuarios.js        -> NIVELES          (FUENTE)
//   2. api/interacciones.js   -> NIVELES_LOCAL
//   3. admin.html             -> _jugNiveles
//   4. usuario-session.js     -> XP_LEVELS
//   5. index.html             -> XP_LEVELS
//   6. comunidad.html         -> XP_LEVELS
//   7. niveles-data.js        -> NivelesData.XP_LEVELS
//   8. api/admin.js           -> NIVEL_DERIVADO_SQL
//      (espejo de REPORTE del panel de administracion: el admin deriva el
//       nivel en SQL para listar/filtrar usuarios sin invocar la funcion
//       serverless por fila; por eso debe replicar los mismos umbrales y el
//       gate lo vigila.)
//
// Ademas valida los 40 TITULOS: NIVELES[].nombre vs BADGES_LOCAL y vs
// NivelesData.XP_LEVELS[].nombre. Los titulos de api/usuarios.js usan
// escapes \uXXXX, asi que se comparan RESUELTOS (se cargan en sandbox vm).
//
// FALSOS POSITIVOS EXCLUIDOS a proposito: RAMA_TIERS / ARBOL_UMBRALES
// (api/interacciones.js, mi-perfil.html, perfil.html) comparten los 5
// primeros valores con la tabla de 20 pero NO son espejos de esta escala.
//
// ASCII-safe (ADR-002), CommonJS (BUG-001), 0 backticks.
// Run: node scripts/smoke_niveles_espejos.js
'use strict';

var fs = require('fs');
var path = require('path');
var vm = require('vm');
var Module = require('module');

var ROOT = path.join(__dirname, '..');
var FUENTE = 'api/usuarios.js';

// Redirige @neondatabase/serverless al fake (sin red ni BD).
var origResolve = Module._resolveFilename;
Module._resolveFilename = function(request) {
  if (request === '@neondatabase/serverless')
    return path.join(__dirname, 'fake_neon.js');
  return origResolve.apply(this, arguments);
};

var total = 0;
var fails = 0;
var pass = 0;
function ok(label) { total++; pass++; console.log('PASS - ' + label); }
function ko(label, detalle) {
  total++; fails++;
  console.log('FAIL - ' + label + (detalle ? ' :: ' + detalle : ''));
}

function leer(rel) { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); }
function lineaDe(t, idx) { return t.slice(0, idx).split('\n').length; }
function mismo(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
function aEnteros(lista) {
  return (lista || []).map(function(x) { return parseInt(String(x).trim(), 10); });
}

// Carga un api/*.js en sandbox vm y expone las variables pedidas.
function cargarApi(fileRel, expone) {
  var src = leer(fileRel);
  var sandbox = {
    module: { exports: {} }, exports: {},
    require: require, console: console, process: process,
    Buffer: Buffer, setTimeout: setTimeout, clearTimeout: clearTimeout,
    fetch: function() { return Promise.resolve({ json: function() { return Promise.resolve({}); } }); }
  };
  sandbox.exports = sandbox.module.exports;
  vm.createContext(sandbox);
  var inject = '';
  (expone || []).forEach(function(n) { inject += '\nmodule.exports.' + n + ' = ' + n + ';'; });
  vm.runInContext(src + inject, sandbox, { filename: fileRel });
  return sandbox.module.exports;
}

// Extrae un arreglo literal entre un marcador y su ']' (mismo archivo).
function literalArray(t, marcador) {
  var i = t.indexOf(marcador);
  if (i < 0) return { idx: -1, raw: '' };
  var j = t.indexOf(']', i);
  return { idx: i, raw: t.slice(i, j + 1) };
}

console.log('=== SMOKE NIVELES ESPEJOS (ADR-053 Decision 11) ===');
console.log('');

// ---- FUENTE ---------------------------------------------------------
var usr = cargarApi(FUENTE, ['NIVELES', 'calcularNivel']);
var NIVELES = usr.NIVELES || [];
var FUENTE_MINS = NIVELES.map(function(n) { return n.min; });
var FUENTE_TITULOS = NIVELES.map(function(n) { return String(n.nombre); });

if (NIVELES.length === 40) ok('fuente ' + FUENTE + ' NIVELES tiene 40 niveles');
else ko('fuente ' + FUENTE + ' NIVELES tiene 40 niveles', 'tiene ' + NIVELES.length);

// ---- 2. api/interacciones.js -> NIVELES_LOCAL + BADGES_LOCAL --------
var inte = cargarApi('api/interacciones.js', ['NIVELES_LOCAL', 'BADGES_LOCAL']);
var INT_MINS = inte.NIVELES_LOCAL || [];
var INT_TITULOS = inte.BADGES_LOCAL || [];
var intSrc = leer('api/interacciones.js');
var intIdx = intSrc.indexOf('var NIVELES_LOCAL = [');
if (mismo(INT_MINS, FUENTE_MINS)) ok('espejo api/interacciones.js NIVELES_LOCAL == fuente');
else ko('espejo api/interacciones.js NIVELES_LOCAL == fuente',
  'api/interacciones.js:' + lineaDe(intSrc, intIdx) + ' ' + JSON.stringify(INT_MINS));

// ---- 3. admin.html -> _jugNiveles -----------------------------------
var adm = leer('admin.html');
var admArr = literalArray(adm, 'var _jugNiveles = [');
var ADM_MINS = aEnteros(admArr.raw.replace('var _jugNiveles = [', '').replace(']', '').split(','));
if (mismo(ADM_MINS, FUENTE_MINS)) ok('espejo admin.html _jugNiveles == fuente');
else ko('espejo admin.html _jugNiveles == fuente',
  'admin.html:' + lineaDe(adm, admArr.idx) + ' ' + JSON.stringify(ADM_MINS));

// ---- 4. usuario-session.js -> XP_LEVELS -----------------------------
var ses = leer('usuario-session.js');
var sesArr = literalArray(ses, 'var XP_LEVELS = [');
var SES_MINS = aEnteros(sesArr.raw.replace('var XP_LEVELS = [', '').replace(']', '').split(','));
if (mismo(SES_MINS, FUENTE_MINS)) ok('espejo usuario-session.js XP_LEVELS == fuente');
else ko('espejo usuario-session.js XP_LEVELS == fuente',
  'usuario-session.js:' + lineaDe(ses, sesArr.idx) + ' ' + JSON.stringify(SES_MINS));

// ---- 5/6. index.html y comunidad.html -> XP_LEVELS (objetos min:) ---
function espejoHtml(rel) {
  var t = leer(rel);
  var i = t.indexOf('var XP_LEVELS = [');
  var fin = i < 0 ? -1 : t.indexOf('];', i);
  var raw = (i < 0 || fin < 0) ? '' : t.slice(i, fin);
  var mins = (raw.match(/min:\s*(\d+)/g) || []).map(function(s) {
    return parseInt(s.replace(/[^0-9]/g, ''), 10);
  });
  return { idx: i, mins: mins };
}
var idxHtml = espejoHtml('index.html');
if (mismo(idxHtml.mins, FUENTE_MINS)) ok('espejo index.html XP_LEVELS == fuente');
else ko('espejo index.html XP_LEVELS == fuente',
  'index.html:' + lineaDe(leer('index.html'), idxHtml.idx) + ' ' + JSON.stringify(idxHtml.mins));

var comHtml = espejoHtml('comunidad.html');
if (mismo(comHtml.mins, FUENTE_MINS)) ok('espejo comunidad.html XP_LEVELS == fuente');
else ko('espejo comunidad.html XP_LEVELS == fuente',
  'comunidad.html:' + lineaDe(leer('comunidad.html'), comHtml.idx) + ' ' + JSON.stringify(comHtml.mins));

// ---- 7. niveles-data.js -> NivelesData.XP_LEVELS --------------------
var ND = require(path.join(ROOT, 'niveles-data.js'));
var ND_LEVELS = (ND && ND.XP_LEVELS) || [];
var ND_MINS = ND_LEVELS.map(function(n) { return n.min; });
var ndSrc = leer('niveles-data.js');
var ndIdx = ndSrc.indexOf('NivelesData.XP_LEVELS = [');
if (mismo(ND_MINS, FUENTE_MINS)) ok('espejo niveles-data.js NivelesData.XP_LEVELS == fuente');
else ko('espejo niveles-data.js NivelesData.XP_LEVELS == fuente',
  'niveles-data.js:' + lineaDe(ndSrc, ndIdx) + ' ' + JSON.stringify(ND_MINS));

// ---- 8. api/admin.js -> NIVEL_DERIVADO_SQL --------------------------
// Espejo de REPORTE: reconstruye la tabla desde los CASE WHEN >= umbral.
var admApi = leer('api/admin.js');
var admApiIdx = admApi.indexOf('var NIVEL_DERIVADO_SQL');
var reCase = /WHEN xp_total >= (\d+) THEN (\d+)/g;
var porNivel = {};
var mCase;
while ((mCase = reCase.exec(admApi)) !== null) {
  porNivel[parseInt(mCase[2], 10)] = parseInt(mCase[1], 10);
}
var ADM_SQL_MINS = [];
// 40 bandas (39 WHEN + ELSE 1): las bandas cubren niveles 2..40 y el
// nivel 1 (min 0) queda implicito en el ELSE 1.
for (var lvl = 1; lvl <= 40; lvl++) ADM_SQL_MINS.push(porNivel[lvl] === undefined ? 0 : porNivel[lvl]);
var admSqlOk = mismo(ADM_SQL_MINS, FUENTE_MINS) && admApi.indexOf('ELSE 1 END') !== -1;
if (admSqlOk) ok('espejo api/admin.js NIVEL_DERIVADO_SQL == fuente');
else ko('espejo api/admin.js NIVEL_DERIVADO_SQL == fuente',
  'api/admin.js:' + lineaDe(admApi, admApiIdx) + ' ' + JSON.stringify(ADM_SQL_MINS));

// ---- TITULOS --------------------------------------------------------
var titulosIntOk = INT_TITULOS.length === 40 && mismo(INT_TITULOS, FUENTE_TITULOS);
if (titulosIntOk) ok('titulos api/interacciones.js BADGES_LOCAL == fuente (40)');
else ko('titulos api/interacciones.js BADGES_LOCAL == fuente (40)',
  'api/interacciones.js:' + lineaDe(intSrc, intSrc.indexOf('var BADGES_LOCAL')) + ' n=' + INT_TITULOS.length);

var ndTitulos = ND_LEVELS.map(function(n) { return String(n.nombre); });
var titulosNdOk = ND_LEVELS.length === 40 && mismo(ndTitulos, FUENTE_TITULOS);
if (titulosNdOk) ok('titulos niveles-data.js NivelesData.XP_LEVELS[].nombre == fuente (40)');
else ko('titulos niveles-data.js NivelesData.XP_LEVELS[].nombre == fuente (40)',
  'niveles-data.js:' + lineaDe(ndSrc, ndIdx) + ' ' + JSON.stringify(ndTitulos));

console.log('');
if (fails === 0) {
  console.log('RESULTADO: OK - ' + pass + ' verificaciones pasaron.');
  process.exit(0);
} else {
  console.log('RESULTADO: FAIL - ' + fails + ' de ' + total + ' verificaciones fallaron.');
  process.exit(1);
}
