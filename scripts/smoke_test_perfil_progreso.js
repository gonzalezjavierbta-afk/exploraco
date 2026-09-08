// Smoke test de perfil (v7): GET tipo=misiones y GET tipo=logros con
// backfill retroactivo. Reutiliza el patron de smoke_test_milestones_v2.js:
// carga api/interacciones.js en un VM con Neon fake (global.__MOCKSQL__)
// e invoca el handler real con consultas mockeadas por contenido.
global.require_orig = require;
const Module = require('module');
const path = require('path');

const origResolve = Module._resolveFilename;
Module._resolveFilename = function(request, ...args) {
  if (request === '@neondatabase/serverless') {
    return path.join(__dirname, 'fake_neon.js');
  }
  return origResolve.call(this, request, ...args);
};
require('fs').writeFileSync(path.join(__dirname,'fake_neon.js'),
  'module.exports = { neon: function(){ return function(q){ return global.__MOCKSQL__ ? global.__MOCKSQL__(q) : []; }; } };');

const fs = require('fs');
const vm = require('vm');

function check(label, cond) {
  console.log((cond ? 'PASS' : 'FAIL') + ' - ' + label);
  if (!cond) process.exitCode = 1;
}

const srcInt = fs.readFileSync(path.join(__dirname, '..', 'api', 'interacciones.js'), 'utf8');
const sandboxInt = { module: { exports: {} }, require, console, process, fetch: function(){ return Promise.resolve({ json: function(){ return Promise.resolve({}); } }); } };
sandboxInt.exports = sandboxInt.module.exports;
vm.createContext(sandboxInt);
vm.runInContext(srcInt + '\nmodule.exports.MISIONES = MISIONES; module.exports.LOGROS = LOGROS; module.exports.entregarCatalogo = entregarCatalogo; module.exports.handler = module.exports;', sandboxInt, { filename: 'api/interacciones.js' });

const MISIONES = sandboxInt.module.exports.MISIONES;
const LOGROS = sandboxInt.module.exports.LOGROS;

// Usuario con progreso ya persistido (como quedaria tras un backfill).
const FILA_USUARIO = {
  id: 'u1',
  xp_total: 1200,
  total_guardados: 6,
  total_visitas: 4,
  progreso_misiones: {
    mis_primer_guardado: { estado: 'completada', en: '2026-09-01T10:00:00.000Z' },
  },
  progreso_logros: {
    logr_primer_voto: { estado: 'completada', en: '2026-09-01T10:00:00.000Z' },
    logr_critico_10: { estado: 'completada', en: '2026-09-02T10:00:00.000Z' },
    logr_coleccionista_10: { estado: 'completada', en: '2026-09-03T10:00:00.000Z' },
  },
};

function mockConUsuario() {
  return function(query) {
    if (query.indexOf('FROM usuarios WHERE id') !== -1) return Promise.resolve([FILA_USUARIO]);
    return Promise.resolve([]);
  };
}
function mockSinUsuario() {
  return function() { return Promise.resolve([]); };
}

function invoke(tipo, mockSql) {
  return new Promise(function(resolve) {
    global.__MOCKSQL__ = mockSql;
    var req = { method: 'GET', query: { tipo: tipo, usuario_id: 'u1' } };
    var res = { setHeader: function(){}, status: function(){ return this; }, json: function(payload){ resolve(payload); } };
    sandboxInt.module.exports(req, res).catch(function(err){ resolve({ ok: false, error: err.message }); });
  });
}

check('MISIONES: catalogo con 9 misiones', MISIONES.length === 9);
check('LOGROS: catalogo con 19 logros', LOGROS.length === 19);

invoke('misiones', mockConUsuario()).then(function(res) {
  check('misiones: ok=true (backfill no rompe)', res.ok === true);
  var list = (res.data) || [];
  check('misiones: total=9', res.total === 9);
  check('misiones: devuelve las 9 con estado/en', list.length === 9
    && list.every(function(m){ return m.id && m.grupo && m.nombre && m.xp >= 0
      && Array.isArray(m.requiere) && (m.estado === 'completada' || m.estado === 'pendiente'); }));
  var primer = list.filter(function(m){ return m.id === 'mis_primer_guardado'; })[0];
  check('misiones: mis_primer_guardado sale completada', primer && primer.estado === 'completada');
  check('misiones: completada trae fecha en', primer && !!primer.en);
  var completadas = list.filter(function(m){ return m.estado === 'completada'; }).length;
  check('misiones: desbloqueadas coincide con data', res.desbloqueadas === completadas && res.desbloqueadas >= 1);

  return invoke('logros', mockConUsuario());
}).then(function(res) {
  check('logros: ok=true (backfill no rompe)', res.ok === true);
  var list = (res.data) || [];
  check('logros: total=19', res.total === 19);
  check('logros: filas con tier/emoji/rareza_pct', list.length === 19
    && list.every(function(l){ return l.id && l.nombre && l.tier && l.emoji
      && typeof l.rareza_pct === 'number' && (l.estado === 'completada' || l.estado === 'pendiente'); }));
  var voto = list.filter(function(l){ return l.id === 'logr_primer_voto'; })[0];
  check('logros: logr_primer_voto sale completada', voto && voto.estado === 'completada');
  var completados = list.filter(function(l){ return l.estado === 'completada'; }).length;
  check('logros: desbloqueados coincide con data', res.desbloqueados === completados && res.desbloqueados >= 3);

  return invoke('misiones', mockSinUsuario());
}).then(function(res) {
  check('misiones: usuario inexistente -> 404 No encontrado', res.ok === false && String(res.error).indexOf('No encontrado') !== -1);
  console.log('SMOKE PERFIL PROGRESO: OK');
}).catch(function(err) {
  console.log('FAIL - invocacion lanzo error: ' + err.message);
  process.exitCode = 1;
});