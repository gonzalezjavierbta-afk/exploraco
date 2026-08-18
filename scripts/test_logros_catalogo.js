// Test local del catalogo LOGROS de api/interacciones.js (v5)
const path = require('path');
const fs = require('fs');
const vm = require('vm');
const Module = require('module');
const origResolve = Module._resolveFilename;
Module._resolveFilename = function(request, ...args) {
  if (request === '@neondatabase/serverless') {
    return path.join(__dirname, 'fake_neon.js');
  }
  return origResolve.call(this, request, ...args);
};
const fake = 'module.exports = { neon: function(){ return function(){ return []; }; } };';
fs.writeFileSync(path.join(__dirname, 'fake_neon.js'), fake);

const src = fs.readFileSync(path.join(__dirname, '..', 'api', 'interacciones.js'), 'utf8');
const sandbox = { module: { exports: {} }, require, console, process };
sandbox.exports = sandbox.module.exports;
vm.createContext(sandbox);
const wrapped = src + '\nmodule.exports.LOGROS = LOGROS; module.exports.CIUDADES_COLECCION = CIUDADES_COLECCION; module.exports.CIUDAD_NORM = CIUDAD_NORM;';
vm.runInContext(wrapped, sandbox, { filename: 'api/interacciones.js' });

const LOGROS = sandbox.module.exports.LOGROS;
const CIUDADES = sandbox.module.exports.CIUDADES_COLECCION;
const CIUDAD_NORM = sandbox.module.exports.CIUDAD_NORM;
const TIERS = ['bronce','plata','oro','platino'];
const GRUPOS = ['general','coleccion','ciudad'];

function check(label, cond) {
  console.log((cond ? 'PASS' : 'FAIL') + ' - ' + label);
  if (!cond) process.exitCode = 1;
}

check('LOGROS: 16 trofeos en catalogo (6 general + 5 conteo + 5 ciudad)', LOGROS.length === 16);
const ids = LOGROS.map(l => l.id);
check('LOGROS: ids unicos', new Set(ids).size === LOGROS.length);

let shapeOk = true, tierOk = true, grupoOk = true, checkFn = true, reqOk = true;
LOGROS.forEach(function(l) {
  if (!l.id || !l.nombre || !l.desc || !l.emoji || !l.xp || typeof l.check !== 'function') shapeOk = false;
  if (TIERS.indexOf(l.tier) === -1) tierOk = false;
  if (GRUPOS.indexOf(l.grupo) === -1) grupoOk = false;
  if (!Array.isArray(l.requiere)) reqOk = false;
  if (!l.check) checkFn = false;
  (l.requiere || []).forEach(function(r) { if (ids.indexOf(r) === -1) { reqOk = false; } });
});
check('LOGROS: shape completo (id/nombre/desc/emoji/xp/check)', shapeOk);
check('LOGROS: tiers validos (bronce/plata/oro/platino)', tierOk);
check('LOGROS: grupos validos', grupoOk);
check('LOGROS: requiere apunta a ids existentes', reqOk);

// Metodos de ctx que usan los checks (deben existir en evaluarLogros ctx)
const ctxMethods = ['totalVotos','blogVotos','blogOpiniones','ciudadesDistintas','guardadosCiudad'];
const ctxM = {};
ctxMethods.forEach(function(m){ ctxM[m] = function(){ return Promise.resolve(0); }; });
ctxM.totalGuardados = 0; ctxM.totalVisitas = 0; ctxM.xpTotal = 0;
const ctxProxy = new Proxy(ctxM, { get: function(t, k) {
  if (!(k in t)) { console.log('FAIL - check usa ctx.' + String(k) + ' que no existe en evaluarLogros'); process.exitCode = 1; }
  return t[k];
} });
const pendientes = LOGROS.filter(function(l){ return l.check(ctxProxy).then ? true : false; });
check('LOGROS: todos los check devuelven Promise', LOGROS.every(function(l){ return typeof l.check(ctxProxy).then === 'function'; }));

// Ciudad normalizada: contiene TRANSLATE y COALESCE
check('CIUDAD_NORM normaliza tildes (TRANSLATE)', CIUDAD_NORM.indexOf('TRANSLATE') !== -1);
check('CIUDAD_NORM usa COALESCE para null', CIUDAD_NORM.indexOf('COALESCE') !== -1);

check('CIUDADES_COLECCION: 5 ciudades', CIUDADES.length === 5);
const cCheck = CIUDADES.every(function(c){ return c.id && c.ciudad && c.n && c.nombre && c.emoji && c.tier && c.xp; });
check('CIUDADES_COLECCION: shape completo', cCheck);

// Generados: los logros de ciudad se anadieron al catalogo
const ciudadIds = CIUDADES.map(function(c){ return c.id; });
check('LOGROS: incluye los 5 logros de ciudad', ciudadIds.every(function(id){ return ids.indexOf(id) !== -1; }));
