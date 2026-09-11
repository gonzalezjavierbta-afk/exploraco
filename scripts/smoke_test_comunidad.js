// Smoke test de la comunidad social (espec 2026-09-08): chat y planes
// reales en api/interacciones.js. Valida el catalogo gaming nuevo
// (misiones/logros), el registro de los 7 tipos POST nuevos (no caen en
// "tipo invalido"), los gates de capacidad (403 sin mision completada) y
// el anti-farming del chat (tope diario 20 XP / 10 mensajes).
// Reutiliza el patron de smoke_test_milestones_v2.js.
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
require('fs').writeFileSync(path.join(__dirname, 'fake_neon.js'),
  'module.exports = { neon: function(){ return function(q){ return global.__MOCKSQL__ ? global.__MOCKSQL__(q) : []; }; } };');

const fs = require('fs');
const vm = require('vm');

function check(label, cond) {
  console.log((cond ? 'PASS' : 'FAIL') + ' - ' + label);
  if (!cond) process.exitCode = 1;
}

// ---- Carga interacciones.js y expone catalogo + helpers -------------
const srcInt = fs.readFileSync(path.join(__dirname, '..', 'api', 'interacciones.js'), 'utf8');
const sandboxInt = { module: { exports: {} }, require, console, process, fetch: function(){ return Promise.resolve({ json: function(){ return Promise.resolve({}); } }); } };
sandboxInt.exports = sandboxInt.module.exports;
vm.createContext(sandboxInt);
vm.runInContext(srcInt + '\nmodule.exports.MISIONES = MISIONES; module.exports.LOGROS = LOGROS;'
  + ' module.exports.chatXpDisponible = chatXpDisponible; module.exports.misionCompletada = misionCompletada;',
  sandboxInt, { filename: 'api/interacciones.js' });
const MISIONES = sandboxInt.module.exports.MISIONES;
const LOGROS = sandboxInt.module.exports.LOGROS;
const chatXpDisponible = sandboxInt.module.exports.chatXpDisponible;
const misionCompletada = sandboxInt.module.exports.misionCompletada;

const misIds = MISIONES.map(function(m){ return m.id; });
const logrIds = LOGROS.map(function(l){ return l.id; });

check('MISIONES: incluye mis_chat_activo', misIds.indexOf('mis_chat_activo') !== -1);
check('MISIONES: incluye mis_plan_creador', misIds.indexOf('mis_plan_creador') !== -1);
check('MISIONES: incluye mis_plan_unido', misIds.indexOf('mis_plan_unido') !== -1);
const mc = MISIONES.filter(function(m){ return m.id === 'mis_chat_activo'; })[0];
const mp = MISIONES.filter(function(m){ return m.id === 'mis_plan_creador'; })[0];
const mj = MISIONES.filter(function(m){ return m.id === 'mis_plan_unido'; })[0];
check('MISIONES: mis_chat_activo +20 XP (10 mensajes)', mc && mc.xp === 20);
check('MISIONES: mis_plan_creador +25 XP (1 plan)', mp && mp.xp === 25);
check('MISIONES: mis_plan_unido +15 XP (1 join)', mj && mj.xp === 15);

check('LOGROS: incluye logr_social_chat', logrIds.indexOf('logr_social_chat') !== -1);
check('LOGROS: incluye logr_social_plan', logrIds.indexOf('logr_social_plan') !== -1);
check('LOGROS: incluye logr_anfitrion', logrIds.indexOf('logr_anfitrion') !== -1);
check('LOGROS: total 29 trofeos', LOGROS.length === 29);

// ---- Invocacion del handler con sql mock ----------------------------
function invoke(req) {
  return new Promise(function(resolve) {
    global.__MOCKSQL__ = function(){ return Promise.resolve([]); };
    var res = { setHeader: function(){}, status: function(){ return this; }, json: function(p){ resolve(p); } };
    sandboxInt.module.exports(req, res).catch(function(err){ resolve({ ok: false, error: err.message }); });
  });
}
function run() {
  return invoke({ method: 'GET', query: { tipo: 'chat_salas' } }).then(function(g1) {
    check('GET chat_salas: ok=true con data []', g1.ok === true && Array.isArray(g1.data));
    return invoke({ method: 'GET', query: { tipo: 'planes', usuario_id: 'u1' } });
  }).then(function(g2) {
    check('GET planes: ok=true con data []', g2.ok === true && Array.isArray(g2.data));
    return invoke({ method: 'GET', query: { tipo: 'chat_mensajes', sala_id: 's1' } });
  }).then(function(g3) {
    check('GET chat_mensajes: ok=true con data []', g3.ok === true && Array.isArray(g3.data));

    // POST sin usuario_id -> 400 con mensaje propio (tipo registrado)
    return invoke({ method: 'POST', body: { tipo: 'chat_msg', sala_id: 's1', texto: 'hola' } });
  }).then(function(p1) {
    check('POST chat_msg sin usuario_id -> 400', p1.ok === false && String(p1.error).indexOf('usuario_id') !== -1);
    return invoke({ method: 'POST', body: { tipo: 'chat_sala', nombre: 'Sala' } });
  }).then(function(p2) {
    check('POST chat_sala sin usuario_id -> 400', p2.ok === false && String(p2.error).indexOf('usuario_id') !== -1);
    return invoke({ method: 'POST', body: { tipo: 'chat_mod', sala_id: 's1', msg_id: 'm1', accion: 'fijar' } });
  }).then(function(p3) {
    check('POST chat_mod sin usuario_id -> 400', p3.ok === false && String(p3.error).indexOf('usuario_id') !== -1);
    return invoke({ method: 'POST', body: { tipo: 'plan_crear', destino: 'Bogota', cupos: 4 } });
  }).then(function(p4) {
    check('POST plan_crear sin usuario_id -> 400', p4.ok === false && String(p4.error).indexOf('usuario_id') !== -1);
    return invoke({ method: 'POST', body: { tipo: 'plan_unirse', plan_id: 'p1' } });
  }).then(function(p5) {
    check('POST plan_unirse sin usuario_id -> 400', p5.ok === false && String(p5.error).indexOf('usuario_id') !== -1);
    return invoke({ method: 'POST', body: { tipo: 'plan_salir', plan_id: 'p1' } });
  }).then(function(p6) {
    check('POST plan_salir sin usuario_id -> 400', p6.ok === false && String(p6.error).indexOf('usuario_id') !== -1);

    // Gate de capacidad: con usuario_id pero sin mision completada
    // (mock sql devuelve []) -> 403 con mensaje de desbloqueo.
    return invoke({ method: 'POST', body: { tipo: 'chat_msg', usuario_id: 'u1', sala_id: 's1', texto: 'hola' } });
  }).then(function(p7) {
    check('POST chat_msg sin capacidad chat -> 403', p7.ok === false && p7.error === 'Desbloquea el chat (nivel 3, 250 XP) para escribir mensajes');
    return invoke({ method: 'POST', body: { tipo: 'plan_crear', usuario_id: 'u1', destino: 'Bogota', cupos: 4 } });
  }).then(function(p8) {
    check('POST plan_crear sin chat desbloqueado -> 403', p8.ok === false && String(p8.error).indexOf('Desbloquea el chat') !== -1);
    return invoke({ method: 'POST', body: { tipo: 'chat_mod', usuario_id: 'u1', sala_id: 's1', msg_id: 'm1', accion: 'fijar' } });
  }).then(function(p9) {
    check('POST chat_mod sin moderador_chat -> 403', p9.ok === false && String(p9.error).indexOf('Moderador de chat') !== -1);
    return invoke({ method: 'POST', body: { tipo: 'chat_sala', usuario_id: 'u1', nombre: 'Sala' } });
  }).then(function(p10) {
    check('POST chat_sala sin crear_chat -> 403', p10.ok === false && String(p10.error).indexOf('Creador de salas') !== -1);

    // misionCompletada degrada a false sin usuario o si la fila no existe
    return misionCompletada(function(){ return Promise.resolve([]); }, null, 'mis_chat_mensajero');
  }).then(function(mc2) {
    check('misionCompletada: false sin usuario_id', mc2 === false);
    return misionCompletada(function(){ return Promise.resolve([{ ok: true }]); }, 'u1', 'mis_chat_mensajero');
  }).then(function(mc3) {
    check('misionCompletada: true si progreso_misiones la marca completada', mc3 === true);

    // Anti-farming del chat
    var hoy = new Date();
    var hoyStr = hoy.getUTCFullYear() + '-' + String(hoy.getUTCMonth()+1).padStart(2,'0') + '-' + String(hoy.getUTCDate()).padStart(2,'0');
    return chatXpDisponible(function(){ return Promise.resolve([{ progreso_social: { chat_dia: hoyStr, chat_n: 10 } }]); }, 'u1');
  }).then(function(a1) {
    check('Anti-farm: 10 mensajes hoy -> sin XP', a1.disponible === false && a1.xp === 0);
    return chatXpDisponible(function(){ return Promise.resolve([{ progreso_social: { chat_dia: hoyStr(), chat_n: 3 } }]); }, 'u1');
  }).then(function(a2) {
    check('Anti-farm: 3 mensajes hoy -> +2 XP', a2.disponible === true && a2.xp === 2);
    return chatXpDisponible(function(){ return Promise.resolve([{ progreso_social: {} }]); }, 'u1');
  }).then(function(a3) {
    check('Anti-farm: sin progreso_social -> +2 XP', a3.disponible === true && a3.xp === 2);

    console.log('SMOKE COMUNIDAD: OK');
  }).catch(function(err){
    console.log('FAIL - smoke comunidad lanz\u00f3 error: ' + err.message);
    process.exitCode = 1;
  });
}
function hoyStr() {
  var h = new Date();
  return h.getUTCFullYear() + '-' + String(h.getUTCMonth()+1).padStart(2,'0') + '-' + String(h.getUTCDate()).padStart(2,'0');
}
run();