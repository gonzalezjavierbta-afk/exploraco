// Smoke test versionado del handler POST tipo='visita' (ADR-024,
// Presencia Fisica v4.0) de api/interacciones.js. NO toca Neon: carga el
// handler real en un sandbox vm con @neondatabase/serverless redirigido a
// scripts/fake_neon.js y un sql simulado que responde por patron de texto
// (contains). Cubre validaciones tempranas, dedup idempotente,
// anti-farming (cooldown y tope diario) y los caminos felices urbano/rural.
// Ejecutar: node scripts/smoke_visita_geocerca.js
'use strict';

// Carga api/interacciones.js en un sandbox vm con el modulo Neon falso.
// Factorizado para no duplicar el patron de los smokes existentes.
function cargarSandboxHandler() {
  global.require_orig = require;
  var Module = require('module');
  var path = require('path');
  var fs = require('fs');
  var vm = require('vm');

  var origResolve = Module._resolveFilename;
  Module._resolveFilename = function(request) {
    if (request === '@neondatabase/serverless')
      return path.join(__dirname, 'fake_neon.js');
    return origResolve.apply(this, arguments);
  };
  fs.writeFileSync(path.join(__dirname, 'fake_neon.js'),
    'module.exports = { neon: function(){ return function(q){ return global.__MOCKSQL__ ? global.__MOCKSQL__(q) : []; }; } };');

  var src = fs.readFileSync(path.join(__dirname, '..', 'api', 'interacciones.js'), 'utf8');
  var sandbox = {
    module: { exports: {} },
    require: require,
    console: console,
    process: process,
    fetch: function(){ return Promise.resolve({ json: function(){ return Promise.resolve({}); } }); }
  };
  sandbox.exports = sandbox.module.exports;
  vm.createContext(sandbox);
  vm.runInContext(src, sandbox, { filename: 'api/interacciones.js' });
  return sandbox;
}

function check(label, cond) {
  console.log((cond ? 'PASS' : 'FAIL') + ' - ' + label);
  if (!cond) process.exitCode = 1;
}

// ---- Mock sql por contenido (contains) ------------------------------
// El handler de visita ejecuta, en orden: dedup, destino, vecinos,
// ultima visita, tope diario, INSERT y pipeline. Solo se sobreescriben
// las respuestas necesarias por caso; el resto degrada a [].
function makeMock(cfg) {
  cfg = cfg || {};
  function pick(key, fallback) {
    return cfg[key] !== undefined ? cfg[key] : fallback;
  }
  return function(query) {
    if (query.indexOf('FROM interacciones WHERE destino_id') !== -1)
      return Promise.resolve(pick('dedup', []));
    if (query.indexOf('categoria_slug') !== -1)
      return Promise.resolve(pick('destino', []));
    if (query.indexOf('ABS(lat-$1)') !== -1)
      return Promise.resolve(pick('vecinos', [{ n: 10 }]));
    if (query.indexOf('ORDER BY creado_en DESC') !== -1)
      return Promise.resolve(pick('prev', []));
    if (query.indexOf("INTERVAL '24 hours'") !== -1)
      return Promise.resolve(pick('tope', [{ n: 0 }]));
    if (query.indexOf('INSERT INTO interacciones') !== -1)
      return Promise.resolve(pick('insert', []));
    return Promise.resolve([]);
  };
}

// ---- Datos de prueba (coordenadas de Bogota) ------------------------
var U_LAT = 4.7110;
var U_LNG = -74.0721;
var DEST_URBANO = { id: 'd1', lat: U_LAT, lng: U_LNG, categoria_slug: 'sitio', tags: {}, nombre: 'Plaza Urbana' };
var DEST_RURAL = { id: 'd2', lat: U_LAT, lng: U_LNG, categoria_slug: 'sitio', tags: { subcategoria: 'naturaleza' }, nombre: 'Reserva Natural' };
var DEST_BLOG = { id: 'd3', lat: U_LAT, lng: U_LNG, categoria_slug: 'blog', tags: {}, nombre: 'Bitacora' };
var DEST_LEJOS = { id: 'd4', lat: 10.0, lng: -75.0, categoria_slug: 'sitio', tags: {}, nombre: 'Muy Lejos' };

var sandbox = cargarSandboxHandler();

// Invoca el handler POST y captura status + payload reales.
function invoke(body, mock) {
  return new Promise(function(resolve) {
    global.__MOCKSQL__ = mock || function(){ return Promise.resolve([]); };
    var captured = { status: 0, body: null };
    var res = {
      setHeader: function(){},
      status: function(code){ captured.status = code; return this; },
      json: function(payload){ captured.body = payload; resolve(captured); }
    };
    try {
      var p = sandbox.module.exports({ method: 'POST', body: body, query: {} }, res);
      if (p && typeof p.catch === 'function')
        p.catch(function(err){ resolve({ status: 0, body: { ok: false, error: err.message } }); });
    } catch (e) {
      resolve({ status: 0, body: { ok: false, error: e.message } });
    }
  });
}

function expectCode(label, r, status, code) {
  var ok = r.status === status && r.body && r.body.code === code;
  check(label, ok);
  if (!ok) console.log('    detalle: status=' + r.status + ' body=' + JSON.stringify(r.body));
}
function expectError(label, r, status, needle) {
  var ok = r.status === status && r.body && String(r.body.error).indexOf(needle) !== -1;
  check(label, ok);
  if (!ok) console.log('    detalle: status=' + r.status + ' body=' + JSON.stringify(r.body));
}

async function run() {
  var M = makeMock;

  // 1) Falta usuario_id (con destino_id, sin coords) -> 400 temprano.
  var r1 = await invoke({ tipo: 'visita', destino_id: 'd1' }, M({}));
  expectError('Falta usuario_id -> 400', r1, 400, 'usuario_id');

  // 2) lat/lng ausentes.
  var r2 = await invoke({ tipo: 'visita', destino_id: 'd1', usuario_id: 'u1' }, M({ destino: [DEST_URBANO] }));
  expectCode('lat/lng ausentes -> 400 COORDENADAS_REQUERIDAS', r2, 400, 'COORDENADAS_REQUERIDAS');

  // 3) lat no numerica.
  var r3 = await invoke({ tipo: 'visita', destino_id: 'd1', usuario_id: 'u1', lat: 'abc', lng: U_LNG }, M({ destino: [DEST_URBANO] }));
  expectCode("lat='abc' -> 400 COORDENADAS_INVALIDAS", r3, 400, 'COORDENADAS_INVALIDAS');

  // 4) lat/lng en cero (origen invalido).
  var r4 = await invoke({ tipo: 'visita', destino_id: 'd1', usuario_id: 'u1', lat: 0, lng: 0 }, M({ destino: [DEST_URBANO] }));
  expectCode('lat=0,lng=0 -> 400 COORDENADAS_INVALIDAS', r4, 400, 'COORDENADAS_INVALIDAS');

  // 5) accuracy no positiva.
  var r5 = await invoke({ tipo: 'visita', destino_id: 'd1', usuario_id: 'u1', lat: U_LAT, lng: U_LNG, accuracy: 0 }, M({ destino: [DEST_URBANO] }));
  expectCode('accuracy=0 -> 400 ACCURACY_INVALIDA', r5, 400, 'ACCURACY_INVALIDA');

  // 6) accuracy por encima del maximo GPS (150 m).
  var r6 = await invoke({ tipo: 'visita', destino_id: 'd1', usuario_id: 'u1', lat: U_LAT, lng: U_LNG, accuracy: 200 }, M({ destino: [DEST_URBANO] }));
  expectCode('accuracy=200 -> 422 PRECISION_INSUFICIENTE', r6, 422, 'PRECISION_INSUFICIENTE');

  // 7) Destino inexistente.
  var r7 = await invoke({ tipo: 'visita', destino_id: 'nope', usuario_id: 'u1', lat: U_LAT, lng: U_LNG }, M({ destino: [] }));
  expectCode('Destino inexistente -> 404 DESTINO_NO_ENCONTRADO', r7, 404, 'DESTINO_NO_ENCONTRADO');

  // 8) El blog no admite presencia fisica.
  var r8 = await invoke({ tipo: 'visita', destino_id: 'd3', usuario_id: 'u1', lat: U_LAT, lng: U_LNG }, M({ destino: [DEST_BLOG] }));
  expectCode('Destino blog -> 400 VISITA_NO_PERMITIDA', r8, 400, 'VISITA_NO_PERMITIDA');

  // 9) Geocerca: usuario lejos del destino.
  var r9 = await invoke({ tipo: 'visita', destino_id: 'd4', usuario_id: 'u1', lat: U_LAT, lng: U_LNG }, M({ destino: [DEST_LEJOS] }));
  expectCode('Fuera de rango -> 422 FUERA_DE_RANGO', r9, 422, 'FUERA_DE_RANGO');

  // 10) Cooldown: ultima visita hace 5 s (< 90 s).
  var prevReciente = [{ creado_en: new Date(Date.now() - 5000).toISOString(), dims: { geo: { lat: U_LAT, lng: U_LNG } } }];
  var r10 = await invoke({ tipo: 'visita', destino_id: 'd1', usuario_id: 'u1', lat: U_LAT, lng: U_LNG }, M({ destino: [DEST_URBANO], prev: prevReciente }));
  expectCode('Cooldown <90 s -> 429 RATE_LIMIT', r10, 429, 'RATE_LIMIT');

  // 11) Tope diario: 30 visitas en 24 h.
  var r11 = await invoke({ tipo: 'visita', destino_id: 'd1', usuario_id: 'u1', lat: U_LAT, lng: U_LNG }, M({ destino: [DEST_URBANO], tope: [{ n: 30 }] }));
  expectCode('Tope diario 30 visitas -> 429 LIMITE_DIARIO', r11, 429, 'LIMITE_DIARIO');

  // 12) Dedup fila activa: idempotente, sin XP.
  var r12 = await invoke({ tipo: 'visita', destino_id: 'd1', usuario_id: 'u1', lat: U_LAT, lng: U_LNG }, M({ dedup: [{ id: 'i1', activo: true }] }));
  check('Dedup activa -> 200 ya_visitado con xp 0', r12.status === 200 && r12.body.ok === true && r12.body.ya_visitado === true && r12.body.xp === 0);
  if (!(r12.status === 200 && r12.body && r12.body.ya_visitado === true)) console.log('    detalle: ' + JSON.stringify(r12));

  // 13) Dedup fila inactiva: reactiva sin repagar XP.
  var r13 = await invoke({ tipo: 'visita', destino_id: 'd1', usuario_id: 'u1', lat: U_LAT, lng: U_LNG }, M({ dedup: [{ id: 'i1', activo: false }] }));
  check('Dedup inactiva -> 200 reactivado con xp 0', r13.status === 200 && r13.body.ok === true && r13.body.reactivado === true && r13.body.xp === 0);
  if (!(r13.status === 200 && r13.body && r13.body.reactivado === true)) console.log('    detalle: ' + JSON.stringify(r13));

  // 14) Camino feliz urbano: XP base 20, sin bono.
  var r14 = await invoke({ tipo: 'visita', destino_id: 'd1', usuario_id: 'u1', lat: U_LAT, lng: U_LNG }, M({ destino: [DEST_URBANO], vecinos: [{ n: 10 }] }));
  check('Camino feliz urbano -> 200 xp 20', r14.status === 200 && r14.body.ok === true && r14.body.xp === 20 && r14.body.xp_detalle.base === 20 && r14.body.xp_detalle.bono_rural === 0 && r14.body.zona === 'urbana');
  if (!(r14.status === 200 && r14.body && r14.body.xp === 20)) console.log('    detalle: ' + JSON.stringify(r14));

  // 15) Camino feliz rural (subcategoria naturaleza): XP 20 + bono plano 20.
  var r15 = await invoke({ tipo: 'visita', destino_id: 'd2', usuario_id: 'u1', lat: U_LAT, lng: U_LNG }, M({ destino: [DEST_RURAL], vecinos: [{ n: 10 }] }));
  check('Camino feliz rural -> 200 xp 40 (bono +20)', r15.status === 200 && r15.body.ok === true && r15.body.xp === 40 && r15.body.xp_detalle.bono_rural === 20 && r15.body.zona === 'rural');
  if (!(r15.status === 200 && r15.body && r15.body.xp === 40)) console.log('    detalle: ' + JSON.stringify(r15));

  console.log('SMOKE VISITA GEOCERCA: OK');
}

run().catch(function(err) {
  console.log('FAIL - smoke visita lanzo error: ' + err.message);
  process.exitCode = 1;
});
