// smoke_test_epic_prompt.js
// Smoke test offline (sin DB) del epic 2026-09-13 (prompt.txt) en
// api/interacciones.js v12: vocaciones de artista, chat por plan
// (plan_chat / plan_chat_msg / chat_salas), admin_xp, helpers BUG-A
// (contarComentarioSafe) y BUG-B (coordsFallbackAutor), migracion 015,
// api/usuarios.js ?buscar=, usuario-session.js y los 3 HTML.
//
// Patron: smoke_test_comunidad.js (sandbox vm + global.__MOCKSQL__ +
// invoke con res fixture) y smoke_test_gamificacion_v4.js (contadores
// PASS/FAIL). Fake neon: scripts/fake_neon.js interceptado via
// Module._resolveFilename. ASCII puro (ADR-002): cero bytes > 127,
// cero backticks.
// Run: node scripts/smoke_test_epic_prompt.js

var path = require('path');
var fs = require('fs');
var vm = require('vm');
var Module = require('module');

// --- Fake neon (reusa scripts/fake_neon.js, patron comunidad) --------
var origResolve = Module._resolveFilename;
Module._resolveFilename = function(request) {
  if (request === '@neondatabase/serverless')
    return path.join(__dirname, 'fake_neon.js');
  return origResolve.apply(this, arguments);
};
fs.writeFileSync(path.join(__dirname, 'fake_neon.js'),
  'module.exports = { neon: function(){ return function(q){ return global.__MOCKSQL__ ? global.__MOCKSQL__(q) : []; }; } };');

// --- Helpers de reporte ----------------------------------------------
var passed = 0, failed = 0;
function check(label, cond) {
  if (cond) { passed++; console.log('PASS - ' + label); }
  else { failed++; console.log('FAIL - ' + label); process.exitCode = 1; }
}
function asciiSafe(filePath) {
  var buf = fs.readFileSync(path.join(__dirname, '..', filePath));
  for (var i = 0; i < buf.length; i++) {
    if (buf[i] > 127) return false;
  }
  return true;
}

// --- 1. Migracion 015 (epic prompt) ----------------------------------
var migrPath = path.join(__dirname, '..', 'db', 'migrations', '015_epic_prompt.sql');
var migrExiste = fs.existsSync(migrPath);
check('015_epic_prompt.sql existe', migrExiste);
var migr = migrExiste ? fs.readFileSync(migrPath, 'utf8') : '';
check('015: ADD COLUMN IF NOT EXISTS vocaciones jsonb', migr.indexOf('ADD COLUMN IF NOT EXISTS vocaciones jsonb') !== -1);
check('015: ADD COLUMN IF NOT EXISTS sala_id uuid', migr.indexOf('ADD COLUMN IF NOT EXISTS sala_id uuid') !== -1);
check('015: DELETE FROM chat_salas (limpieza salas sistema)', migr.indexOf('DELETE FROM chat_salas') !== -1);
check('015: clave perfil_marco_dorado', migr.indexOf('perfil_marco_dorado') !== -1);
check('015: clave perfil_tema_oscuro', migr.indexOf('perfil_tema_oscuro') !== -1);
check('015: clave perfil_banda_artista', migr.indexOf('perfil_banda_artista') !== -1);
check('015: seed idempotente ON CONFLICT (clave) DO NOTHING', migr.indexOf('ON CONFLICT (clave) DO NOTHING') !== -1);

// --- 2. api/usuarios.js soporta ?buscar= -----------------------------
var srcUsu = fs.readFileSync(path.join(__dirname, '..', 'api', 'usuarios.js'), 'utf8');
check('api/usuarios.js soporta ?buscar=', srcUsu.indexOf('buscar') !== -1);

// --- 3. usuario-session.js: capacidades + vocaciones -----------------
var srcSes = fs.readFileSync(path.join(__dirname, '..', 'usuario-session.js'), 'utf8');
var capStart = srcSes.indexOf('CAPACIDADES_POR_NIVEL = {');
var capBlock = capStart === -1 ? '' : srcSes.substring(capStart, capStart + 400);
check('usuario-session.js: CAPACIDADES_POR_NIVEL incluye emojis_premium@7', capBlock.indexOf("'emojis_premium'") !== -1);
check('usuario-session.js: CAPACIDADES_POR_NIVEL incluye sello_sala@10', capBlock.indexOf("'sello_sala'") !== -1);
check('usuario-session.js: window.ExploraCO.vocaciones', srcSes.indexOf('window.ExploraCO.vocaciones') !== -1);

// --- 4. Balance de divs en los 3 HTML --------------------------------
function divBalance(htmlPath) {
  var src = fs.readFileSync(path.join(__dirname, '..', htmlPath), 'utf8');
  var abre = (src.match(/<div/g) || []).length;
  var cierra = (src.match(/<\/div/g) || []).length;
  return abre - cierra;
}
check('mi-perfil.html divs balanceados (abre-cierra == 0)', divBalance('mi-perfil.html') === 0);
check('comunidad.html divs balanceados (abre-cierra == 0)', divBalance('comunidad.html') === 0);
check('admin.html divs balanceados (abre-cierra == 0)', divBalance('admin.html') === 0);

// --- 5. Frontend: filtro de salas plan + admin -----------------------
var srcCom = fs.readFileSync(path.join(__dirname, '..', 'comunidad.html'), 'utf8');
check('comunidad.html filtra s.tipo !== \'plan\' en renderChatRooms', srcCom.indexOf("s.tipo !== 'plan'") !== -1);
var srcAdm = fs.readFileSync(path.join(__dirname, '..', 'admin.html'), 'utf8');
check('admin.html contiene buscarJugadores', srcAdm.indexOf('buscarJugadores') !== -1);
check('admin.html contiene aplicarDeltaXP', srcAdm.indexOf('aplicarDeltaXP') !== -1);

// --- 6. Carga api/interacciones.js v12 (patron comunidad) ------------
var srcInt = fs.readFileSync(path.join(__dirname, '..', 'api', 'interacciones.js'), 'utf8');
var sandboxInt = { module: { exports: {} }, require, console, process,
  fetch: function(){ return Promise.resolve({ json: function(){ return Promise.resolve({}); } }); } };
sandboxInt.exports = sandboxInt.module.exports;
vm.createContext(sandboxInt);
vm.runInContext(srcInt + '\nmodule.exports.contarComentarioSafe = contarComentarioSafe;'
  + 'module.exports.coordsFallbackAutor = coordsFallbackAutor;'
  + 'module.exports.VOCACIONES = VOCACIONES;'
  + 'module.exports.NIVELES_ADMIN = NIVELES_ADMIN;'
  + 'module.exports.NIVELES_LOCAL = NIVELES_LOCAL;'
  + 'module.exports.calcularNivelLocal = calcularNivelLocal;'
  + 'module.exports.calcularEraLocal = calcularEraLocal;'
  + 'module.exports.misionCompletada = misionCompletada;',
  sandboxInt, { filename: 'api/interacciones.js' });

var contarComentarioSafe = sandboxInt.module.exports.contarComentarioSafe;
var coordsFallbackAutor = sandboxInt.module.exports.coordsFallbackAutor;
var VOCACIONES = sandboxInt.module.exports.VOCACIONES;
var NIVELES_ADMIN = sandboxInt.module.exports.NIVELES_ADMIN;
var NIVELES_LOCAL = sandboxInt.module.exports.NIVELES_LOCAL;

// --- 6b. Constantes del epic -----------------------------------------
check('NIVELES_ADMIN es alias de NIVELES_LOCAL', NIVELES_ADMIN === NIVELES_LOCAL);
// ADR-053 Dec 11 (v25): umbrales NUEVOS v6 (techo 42000); NIVELES_ADMIN
// aliasa NIVELES_LOCAL de api/interacciones.js.
check('NIVELES_ADMIN: 20 bornes, ultimo 42000 (ADR-053 Dec 11)',
  NIVELES_ADMIN.length === 20 && NIVELES_ADMIN[19] === 42000);
check('NIVELES_ADMIN: bornes exactos del spec v6',
  JSON.stringify(NIVELES_ADMIN) === JSON.stringify([0,100,250,450,700,1050,1500,2100,2900,3900,5200,6800,8800,11200,14200,17800,22200,27500,34000,42000]));
check('VOCACIONES: 3 items con niveles 5/8/11',
  VOCACIONES.length === 3 && VOCACIONES[0].nivel === 5 && VOCACIONES[1].nivel === 8 && VOCACIONES[2].nivel === 11);

// --- 7. Invocacion del handler con sql mock (patron comunidad) -------
function invoke(req, mockFn) {
  return new Promise(function(resolve) {
    global.__MOCKSQL__ = mockFn || function(){ return Promise.resolve([]); };
    req.headers = req.headers || {};
    var sc = 200;
    var res = {
      setHeader: function(){},
      status: function(code){ sc = code; return this; },
      json: function(payload) { resolve(Object.assign({ status: sc }, payload)); }
    };
    sandboxInt.module.exports(req, res).catch(function(err) {
      resolve(Object.assign({ status: 500 }, { ok: false, error: err && err.message }));
    });
  });
}

// --- 8. Helpers directos (contarComentarioSafe / coordsFallbackAutor) -
function runHelpers() {
  return contarComentarioSafe(function(){ return Promise.reject({ code: '42P01' }); }, 'f1')
    .then(function(v0) {
      check('contarComentarioSafe: error 42P01 degrada a 0', v0 === 0);
      return contarComentarioSafe(function(){ return Promise.reject({ code: '42703' }); }, 'f1');
    }).then(function(v1) {
      check('contarComentarioSafe: error 42703 degrada a 0', v1 === 0);
      return contarComentarioSafe(function(){ return Promise.resolve([{ n: 3 }]); }, 'f1');
    }).then(function(v2) {
      check('contarComentarioSafe: COUNT=3 devuelve 3', v2 === 3);
      return contarComentarioSafe(function(){ return Promise.reject({ code: '23505' }); }, 'f1')
        .then(function() { check('contarComentarioSafe: error 23505 re-lanza', false); })
        .catch(function(e) { check('contarComentarioSafe: error 23505 re-lanza la promesa', !!e && e.code === '23505'); });
    }).then(function() {
      return coordsFallbackAutor(function(){ return Promise.resolve([{ lat: 4.6, lng: -74.08, ciudad: 'Bogota' }]); }, 'u1');
    }).then(function(fb) {
      check('coordsFallbackAutor: hereda lat/lng/ciudad', !!fb && fb.lat === 4.6 && fb.lng === -74.08 && fb.ciudad === 'Bogota');
      return coordsFallbackAutor(function(){ return Promise.resolve([]); }, 'u1');
    }).then(function(empty) {
      check('coordsFallbackAutor: [] null-safe (devuelve null)', empty === null);
      return coordsFallbackAutor(function(){ return Promise.reject({ code: '42P01' }); }, 'u1');
    }).then(function(degraded) {
      check('coordsFallbackAutor: error 42P01 degrada a null', degraded === null);
      return coordsFallbackAutor(function(){ return Promise.reject({ code: '23505' }); }, 'u1')
        .then(function() { check('coordsFallbackAutor: error 23505 re-lanza', false); })
        .catch(function(e) { check('coordsFallbackAutor: error 23505 re-lanza la promesa', !!e && e.code === '23505'); });
    }).then(function() {
      return runHandler();
    });
}

// --- 9. Tests de rutas del handler -----------------------------------
function runHandler() {
  var capt1 = '';
  var capt2 = '';
  var capt3 = '';
  return invoke({ method: 'GET', query: { tipo: 'vocaciones_catalogo' } }).then(function(r1) {
    check('GET vocaciones_catalogo: data.length == 3', r1.ok === true && r1.data && r1.data.length === 3);
    check('GET vocaciones_catalogo: niveles 5/8/11',
      r1.ok === true && r1.data[0].nivel === 5 && r1.data[1].nivel === 8 && r1.data[2].nivel === 11);
    return invoke({ method: 'POST', body: { tipo: 'vocacion_activar', usuario_id: 'u1', vocacion_id: 'musico' } },
      function(){ return Promise.resolve([{ vocaciones: {}, xp_total: 0 }]); });
  }).then(function(r2) {
    check('POST vocacion_activar xp=0 -> 403 "Sube a nivel 5"',
      r2.status === 403 && String(r2.error).indexOf('Sube a nivel 5') !== -1);
    return invoke({ method: 'POST', body: { tipo: 'vocacion_activar', usuario_id: 'u1', vocacion_id: 'musico' } },
      function(){ return Promise.resolve([{ vocaciones: {}, xp_total: 30000 }]); });
  }).then(function(r3) {
    check('POST vocacion_activar xp=30000 -> ok y data.activadas incluye musico',
      r3.ok === true && r3.data && r3.data.activadas.indexOf('musico') !== -1);
    return invoke({ method: 'POST', body: { tipo: 'vocacion_activar', usuario_id: 'u1', vocacion_id: 'no_existe' } });
  }).then(function(r4) {
    check('POST vocacion_activar id invalido -> 400', r4.status === 400 && String(r4.error).indexOf('vocacion_id') !== -1);
    return invoke({ method: 'POST', body: { tipo: 'admin_xp' } });
  }).then(function(r5) {
    check('POST admin_xp sin header authorization -> 401', r5.status === 401);
    return invoke({ method: 'POST', headers: { authorization: 'Bearer token-malo' }, body: { tipo: 'admin_xp', usuario_id: 'u1', nivel: 5 } });
  }).then(function(r6) {
    check('POST admin_xp header Bearer invalido -> 403', r6.status === 403);
    return invoke({ method: 'POST', headers: { authorization: 'Bearer exploraco12345' }, body: { tipo: 'admin_xp' } });
  }).then(function(r7) {
    check('POST admin_xp body sin usuario_id -> 400', r7.status === 400);
    return invoke({ method: 'POST', headers: { authorization: 'Bearer exploraco12345' }, body: { tipo: 'admin_xp', usuario_id: 'u1' } });
  }).then(function(r7b) {
    check('POST admin_xp sin nivel ni delta_xp -> 400', r7b.status === 400 && String(r7b.error).indexOf('nivel o delta_xp') !== -1);
    return invoke({ method: 'POST', headers: { authorization: 'Bearer exploraco12345' }, body: { tipo: 'admin_xp', usuario_id: 'u1', nivel: 5 } },
      function(){ return Promise.resolve([]); });
  }).then(function(r8) {
    check('POST admin_xp usuario inexistente (mock []) -> 404', r8.status === 404);
    var filaU = { id: 'u1', nombre: 'Ana', email: 'ana@x.co', xp_total: 0, badge_actual: '' };
    return invoke({ method: 'POST', headers: { authorization: 'Bearer exploraco12345' }, body: { tipo: 'admin_xp', usuario_id: 'u1', nivel: 5 } },
      function(){ return Promise.resolve([filaU]); });
  }).then(function(r9) {
    check('POST admin_xp nivel=5 con xp 0 -> xp_total 700',
      r9.ok === true && r9.data && r9.data.usuario && r9.data.usuario.xp_total === 700);
    check('POST admin_xp nivel=5 con xp 0 -> nivel 5', r9.ok === true && r9.data.usuario.nivel === 5);
    var filaD = { id: 'u1', nombre: 'Ana', email: 'ana@x.co', xp_total: 0, badge_actual: '' };
    return invoke({ method: 'POST', headers: { authorization: 'Bearer exploraco12345' }, body: { tipo: 'admin_xp', usuario_id: 'u1', delta_xp: 150 } },
      function(){ return Promise.resolve([filaD]); });
  }).then(function(r10) {
    check('POST admin_xp delta_xp=150 -> xp_total 150', r10.ok === true && r10.data.usuario.xp_total === 150);
    var filaNeg = { id: 'u1', nombre: 'Ana', email: 'ana@x.co', xp_total: 100, badge_actual: '' };
    return invoke({ method: 'POST', headers: { authorization: 'Bearer exploraco12345' }, body: { tipo: 'admin_xp', usuario_id: 'u1', delta_xp: -500 } },
      function(){ return Promise.resolve([filaNeg]); });
  }).then(function(r11) {
    check('POST admin_xp delta negativo (100-500) -> xp_total 0', r11.ok === true && r11.data.usuario.xp_total === 0);
    return invoke({ method: 'GET', query: { tipo: 'plan_chat', plan_id: 'p1', usuario_id: 'u1' } },
      function(q){
        if (q.indexOf('FROM planes_viaje') !== -1) return Promise.resolve([{ id: 'p1', creador_id: 'p9', sala_id: 's1' }]);
        return Promise.resolve([]);
      });
  }).then(function(r12) {
    check('GET plan_chat sin membresia -> 403 "Solo miembros del plan"',
      r12.status === 403 && String(r12.error) === 'Solo miembros del plan');
    return invoke({ method: 'POST', body: { tipo: 'plan_chat_msg', usuario_id: 'u1', plan_id: 'p1', texto: 'hola plan' } },
      function(q){
        if (q.indexOf('progreso_misiones') !== -1) return Promise.resolve([{ ok: true }]);
        if (q.indexOf('FROM planes_viaje') !== -1) return Promise.resolve([{ id: 'p1', creador_id: 'p9', sala_id: 's1' }]);
        return Promise.resolve([]);
      });
  }).then(function(r13) {
    check('POST plan_chat_msg sin membresia -> 403 "Solo miembros del plan"',
      r13.status === 403 && String(r13.error) === 'Solo miembros del plan');
    return invoke({ method: 'POST', body: { tipo: 'plan_chat_msg', usuario_id: 'u1', plan_id: 'p1', texto: '' } },
      function(q){
        if (q.indexOf('progreso_misiones') !== -1) return Promise.resolve([{ ok: true }]);
        return Promise.resolve([]);
      });
  }).then(function(r14) {
    check('POST plan_chat_msg con texto vacio -> 400 "mensaje vacio"',
      r14.status === 400 && String(r14.error) === 'mensaje vacio');
    return invoke({ method: 'GET', query: { tipo: 'chat_salas' } },
      function(q){ capt1 = q; return Promise.resolve([]); });
  }).then(function(r15) {
    check('GET chat_salas: query capturada excluye salas plan (tipo != plan)',
      capt1.indexOf("tipo != 'plan'") !== -1);
    return invoke({ method: 'GET', query: { tipo: 'planes', usuario_id: 'u1' } },
      function(q){ capt2 = q; return Promise.resolve([]); });
  }).then(function(r16) {
    check('GET planes: query capturada incluye p.sala_id', capt2.indexOf('p.sala_id') !== -1);
    return invoke({ method: 'GET', query: { tipo: 'planes_mios', usuario_id: 'u1' } },
      function(q){ capt3 = q; return Promise.resolve([]); });
  }).then(function(r16b) {
    check('GET planes_mios: query capturada usa p.creador_id (no creado_id)', capt3.indexOf('p.creador_id') !== -1);
    return invoke({ method: 'GET', query: { tipo: 'plan_chat', plan_id: 'p1', usuario_id: 'u1' } },
      function(){ return Promise.resolve([{ id: 'p1', creador_id: 'u1', sala_id: null }]); });
  }).then(function(r17) {
    check('GET plan_chat plan sin sala -> ok false "Este plan aun no tiene chat"',
      r17.status === 200 && r17.ok === false && String(r17.error).indexOf('Este plan aun no tiene chat') !== -1);
    return finish();
  }).catch(function(err) {
    console.log('FAIL - smoke epic prompt lanz\u00f3 error: ' + err.message);
    process.exitCode = 1;
  });
}

function finish() {
  var selfBuf = fs.readFileSync(__filename);
  var asciiOk = true;
  for (var i = 0; i < selfBuf.length; i++) {
    if (selfBuf[i] > 127) { asciiOk = false; break; }
  }
  check('smoke_test_epic_prompt.js ASCII-safe (0 bytes > 127)', asciiOk);
  check('smoke_test_epic_prompt.js 0 backticks', fs.readFileSync(__filename, 'utf8').indexOf(String.fromCharCode(96)) === -1);
  console.log('');
  console.log('=== SMOKE TEST EPIC PROMPT ===');
  console.log('Checks: ' + (passed + failed) + ' total, ' + passed + ' PASS, ' + failed + ' FAIL');
  if (failed === 0) {
    console.log('SMOKE EPIC PROMPT: OK');
  } else {
    console.log('SMOKE EPIC PROMPT: ' + failed + ' FALLO(S)');
    process.exitCode = 1;
  }
}

runHelpers();