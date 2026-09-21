// scripts/smoke_036_compartir.js
// Smoke offline (sin red, sin DB) de ADR-036 A: la rama POST
// tipo='compartir' de api/interacciones.js v19. Carga el handler REAL en
// un sandbox vm con @neondatabase/serverless redirigido a un mock en
// memoria (global.__MOCKSQL__) y lo ejecuta con req/res mock. Verifica el
// contrato de XP (25 primer share, 5 posterior, topes 10 eventos y 50
// XP/24h), la sesion obligatoria y la ausencia de INSERT en interacciones.
// ASCII-safe (ADR-002): 0 bytes > 127, 0 backticks. CommonJS (BUG-001).
'use strict';

var path = require('path');
var fs = require('fs');
var vm = require('vm');
var crypto = require('crypto');

var passed = 0;
var failed = 0;
function check(label, cond) {
  if (cond) { passed++; console.log('PASS - ' + label); }
  else { failed++; console.log('FAIL - ' + label); process.exitCode = 1; }
}
function asciiSafeBytes(buf) {
  for (var i = 0; i < buf.length; i++) { if (buf[i] > 127) return false; }
  return true;
}
function readSrc(rel) {
  return fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
}
function tieneBacktick(s) { return s.indexOf(String.fromCharCode(96)) !== -1; }

// --- cargador del api en sandbox vm ---------------------------------
function cargarApi(fileRel) {
  var fakeNeon = {
    neon: function() {
      return function(q, p) { return global.__MOCKSQL__(q, p); };
    }
  };
  var customRequire = function(request) {
    if (request === '@neondatabase/serverless') return fakeNeon;
    return require(request);
  };
  customRequire.resolve = require.resolve;
  var sandbox = {
    module: { exports: {} },
    exports: {},
    require: customRequire,
    console: console,
    process: process,
    Buffer: Buffer,
    setTimeout: setTimeout,
    clearTimeout: clearTimeout,
    fetch: function() {
      return Promise.resolve({ ok: true, status: 200, json: function() { return Promise.resolve({}); } });
    }
  };
  sandbox.exports = sandbox.module.exports;
  vm.createContext(sandbox);
  var code = fs.readFileSync(path.join(__dirname, '..', fileRel), 'utf8');
  vm.runInContext(code, sandbox, { filename: fileRel });
  return sandbox.module.exports;
}

// --- mock SQL por matchers -------------------------------------------
// Cada matcher es {test, reply}. test puede ser RegExp o substring; el
// primero que coincide gana. reply puede ser un valor o una funcion
// (params, sql). Default: []. Registra todas las consultas.
function crearMock(matchers) {
  var state = { queries: [] };
  state.fn = function(q, p) {
    var sql = String(q);
    state.queries.push({ q: sql, p: p || [] });
    for (var i = 0; i < matchers.length; i++) {
      var m = matchers[i];
      var hit = (m.test instanceof RegExp) ? m.test.test(sql) : sql.indexOf(m.test) !== -1;
      if (hit) {
        var rep = (typeof m.reply === 'function') ? m.reply(p || [], sql) : m.reply;
        return Promise.resolve(rep);
      }
    }
    return Promise.resolve([]);
  };
  state.cuenta = function(sub) {
    return state.queries.filter(function(x) { return x.q.indexOf(sub) !== -1; }).length;
  };
  state.alguna = function(sub) { return state.cuenta(sub) > 0; };
  return state;
}

function makeRes() {
  var r = { statusCode: 0, body: null };
  r.setHeader = function() {};
  r.status = function(c) { r.statusCode = c; return r; };
  r.json = function(b) { r.body = b; return r; };
  r.end = function() { return r; };
  return r;
}
function makeReq(method, body, headers) {
  return { method: method, body: body || {}, query: {}, headers: headers || {} };
}
function firmarToken(uid) {
  var secreto = process.env.SESSION_JWT_SECRET || 'dev_secret';
  var payload = Buffer.from(JSON.stringify({
    sub: String(uid), exp: Math.floor(Date.now() / 1000) + 3600
  })).toString('base64url');
  var firma = crypto.createHmac('sha256', secreto).update(payload).digest('base64url');
  return payload + '.' + firma;
}
function auth(uid) { return { authorization: 'Bearer ' + firmarToken(uid) }; }

// Estado reutilizable por los matchers de un caso.
function estadoCompartir() {
  return { eventos: 0, xpDia: 0, firstInsert: true, insertCount: 0 };
}
function matchers(est) {
  return [
    // Existencia del destino (fuente='destino').
    { test: 'FROM destinos WHERE id::text', reply: [{ id: 'd1' }] },
    // Tope de eventos de 24h (COUNT).
    { test: /SELECT COUNT\(\*\)::int AS n FROM media_compartidos/, reply: function() { return [{ n: est.eventos }]; } },
    // Deteccion atomica del primer share.
    { test: 'WHERE es_primero = true DO NOTHING', reply: function() {
        return est.firstInsert ? [{ id: 'share-first' }] : [];
      } },
    // Insert del log de comparticion posterior.
    { test: 'false, 0) RETURNING id', reply: function() { return [{ id: 'share-log' }]; } },
    // Suma de XP de la ventana rodante.
    { test: 'SUM(xp_ganado)', reply: function() { return [{ s: est.xpDia }]; } },
    // UPDATE de xp_ganado en la fila de media_compartidos.
    { test: 'UPDATE media_compartidos SET xp_ganado', reply: [] },
    // UPDATE de xp del usuario.
    { test: 'UPDATE usuarios SET xp_total=xp_total+$1', reply: [] }
  ];
}

async function ejecutar(handler, est, body, headers) {
  var mock = crearMock(matchers(est));
  global.__MOCKSQL__ = mock.fn;
  var res = makeRes();
  await handler(makeReq('POST', body, headers), res);
  return { res: res, mock: mock };
}

var SRC = readSrc('api/interacciones.js');

async function run() {
  var handler = cargarApi('api/interacciones.js');

  // ---------- A. Estructura estatica ----------
  // Asercion corregida: el literal 'v19' no era el header ni en HEAD
  // (git show HEAD:api/interacciones.js daba v24), asi que fallaba de
  // origen. Se valida el contrato real: header parseable y version >= 19,
  // que es cuando llego la rama compartir (ADR-036).
  var verInt = (SRC.match(/^\/\/ api\/interacciones\.js\s+v(\d+)/m) || [])[1];
  check('A1: header de api/interacciones.js con version >= v19',
    !!verInt && parseInt(verInt, 10) >= 19);
  check('A2: la rama compartir existe', SRC.indexOf("tipo2 === 'compartir'") !== -1);
  check('A3: compartir exige validarSesion', /tipo2 === 'compartir'[\s\S]{0,600}validarSesion\(req, usuarioId2\)/.test(SRC));
  check('A4: item_id regex ^[0-9A-Za-z_-]{1,64}$',
    SRC.indexOf('/^[0-9A-Za-z_-]{1,64}$/.test(cpItem)') !== -1);
  check('A5: whitelist de fuente con destino/curada/viajero_foto/album_foto',
    SRC.indexOf("['destino', 'curada', 'viajero_foto', 'album_foto'].indexOf(cpFuente)") !== -1);
  check('A6: whitelist de canal', SRC.indexOf("['web_share', 'whatsapp', 'copiar', 'otro'].indexOf(cpCanal)") !== -1);
  check('A7: ON CONFLICT parcial del primer share',
    SRC.indexOf('ON CONFLICT (usuario_id, fuente, item_id) WHERE es_primero = true DO NOTHING') !== -1);
  check('A8: cap de XP con remanente de 50/24h', SRC.indexOf('Math.max(0, red2(50 - cpDiaPrevio))') !== -1
    && SRC.indexOf('Math.min(cpBase, cpRemanente)') !== -1);
  check('A9: la rama compartir NO inserta en interacciones',
    SRC.indexOf("tipo2 === 'compartir'") !== -1
    && SRC.slice(SRC.indexOf("tipo2 === 'compartir'"), SRC.indexOf('if (!tipo2 || !destinoId2)')).indexOf('INSERT INTO interacciones') === -1);
  check('A10: la rama compartir esta ANTES del guard generico',
    SRC.indexOf("tipo2 === 'compartir'") < SRC.indexOf('if (!tipo2 || !destinoId2)'));
  check('A11: la rama compartir esta ANTES del whitelist tiposValidos',
    SRC.indexOf("tipo2 === 'compartir'") < SRC.indexOf('var tiposValidos'));
  check('A12: mision mis_primer_compartido presente', SRC.indexOf("'mis_primer_compartido'") !== -1);
  check('A13: mision mis_voz_comunidad presente', SRC.indexOf("'mis_voz_comunidad'") !== -1);
  check('A14: mision mis_embajador_destinos presente', SRC.indexOf("'mis_embajador_destinos'") !== -1);
  check('A15: logro logr_primer_compartido presente', SRC.indexOf("'logr_primer_compartido'") !== -1);
  check('A16: logro logr_compartidor_25 presente', SRC.indexOf("'logr_compartidor_25'") !== -1);
  check('A17: logro logr_viral_100 presente', SRC.indexOf("'logr_viral_100'") !== -1);

  // ---------- B. Primer share: 25 XP ----------
  var uB = '11111111-1111-1111-1111-111111111111';
  var outB = await ejecutar(handler, estadoCompartir(),
    { tipo: 'compartir', usuario_id: uB, fuente: 'destino', item_id: 'd1', canal: 'whatsapp' }, auth(uB));
  var bB = outB.res.body || {};
  check('B1: primer share -> 200', outB.res.statusCode === 200);
  check('B2: primer share xp 25', bB.xp === 25);
  check('B3: primero true', bB.primero === true);
  check('B4: canal whatsapp', bB.canal === 'whatsapp');
  check('B5: xp_dia 25', bB.xp_dia === 25);
  check('B6: tope_diario false', bB.tope_diario === false);
  check('B7: misiones/logros arrays', Array.isArray(bB.misiones) && Array.isArray(bB.logros));
  check('B8: ledger de media_compartidos actualizado', outB.mock.alguna('UPDATE media_compartidos SET xp_ganado'));
  check('B9: sin INSERT en interacciones', outB.mock.cuenta('INSERT INTO interacciones') === 0);

  // ---------- C. Share posterior: 5 XP ----------
  var uC = '22222222-2222-2222-2222-222222222222';
  var estC = estadoCompartir();
  estC.firstInsert = false;
  estC.xpDia = 25;
  var outC = await ejecutar(handler, estC,
    { tipo: 'compartir', usuario_id: uC, fuente: 'destino', item_id: 'd1', canal: 'copiar' }, auth(uC));
  var bC = outC.res.body || {};
  check('C1: share posterior -> 200', outC.res.statusCode === 200);
  check('C2: share posterior xp 5', bC.xp === 5);
  check('C3: primero false', bC.primero === false);
  check('C4: xp_dia 30', bC.xp_dia === 30);
  check('C5: inserta log con es_primero=false', outC.mock.alguna('false, 0) RETURNING id'));

  // ---------- D. Tope de eventos 10/24h ----------
  var uD = '33333333-3333-3333-3333-333333333333';
  var estD = estadoCompartir();
  estD.eventos = 10;
  var outD = await ejecutar(handler, estD,
    { tipo: 'compartir', usuario_id: uD, fuente: 'destino', item_id: 'd1', canal: 'otro' }, auth(uD));
  var bD = outD.res.body || {};
  check('D1: tope eventos -> 200', outD.res.statusCode === 200);
  check('D2: tope eventos xp 0', bD.xp === 0);
  check('D3: tope eventos primero false', bD.primero === false);
  check('D4: tope eventos tope_diario true', bD.tope_diario === true);
  check('D5: tope eventos misiones/logros vacios', (bD.misiones || []).length === 0 && (bD.logros || []).length === 0);
  check('D6: no inserta (no consume el primero)', !outD.mock.alguna('INSERT INTO media_compartidos'));

  // ---------- E. Tope de XP 50/24h ----------
  var uE = '44444444-4444-4444-4444-444444444444';
  var estE = estadoCompartir();
  estE.xpDia = 50;
  var outE = await ejecutar(handler, estE,
    { tipo: 'compartir', usuario_id: uE, fuente: 'destino', item_id: 'd1', canal: 'web_share' }, auth(uE));
  var bE = outE.res.body || {};
  check('E1: tope XP -> 200', outE.res.statusCode === 200);
  check('E2: tope XP xp 0', bE.xp === 0);
  check('E3: tope XP tope_diario true', bE.tope_diario === true);
  check('E4: tope XP no actualiza usuarios', !outE.mock.alguna('UPDATE usuarios SET xp_total'));

  // ---------- F. Remanente parcial ----------
  var uF = '55555555-5555-5555-5555-555555555555';
  var estF = estadoCompartir();
  estF.xpDia = 45;
  var outF = await ejecutar(handler, estF,
    { tipo: 'compartir', usuario_id: uF, fuente: 'destino', item_id: 'd1', canal: 'whatsapp' }, auth(uF));
  var bF = outF.res.body || {};
  check('F1: remanente 5 -> xp 5 (base 25 capada)', outF.res.statusCode === 200 && bF.xp === 5);
  check('F2: remanente xp_dia 50 y tope_diario true', bF.xp_dia === 50 && bF.tope_diario === true);

  // ---------- G. Sesion obligatoria ----------
  var uG = '66666666-6666-6666-6666-666666666666';
  var outG = await ejecutar(handler, estadoCompartir(),
    { tipo: 'compartir', usuario_id: uG, fuente: 'destino', item_id: 'd1', canal: 'whatsapp' }, {});
  check('G1: sin Authorization -> 401', outG.res.statusCode === 401);
  check('G2: body ok false', !!(outG.res.body && outG.res.body.ok === false));
  check('G3: 401 no toca la base', !outG.mock.alguna('INSERT INTO media_compartidos'));

  // ---------- H. Validaciones ----------
  var uH = '77777777-7777-7777-7777-777777777777';
  var outH1 = await ejecutar(handler, estadoCompartir(),
    { tipo: 'compartir', usuario_id: uH, fuente: 'blog', item_id: 'd1', canal: 'whatsapp' }, auth(uH));
  check('H1: fuente invalida -> 400', outH1.res.statusCode === 400);
  var outH2 = await ejecutar(handler, estadoCompartir(),
    { tipo: 'compartir', usuario_id: uH, fuente: 'destino', item_id: 'd1', canal: 'email' }, auth(uH));
  check('H2: canal invalido -> 400', outH2.res.statusCode === 400);
  var outH3 = await ejecutar(handler, estadoCompartir(),
    { tipo: 'compartir', usuario_id: uH, fuente: 'destino', item_id: 'no valido!', canal: 'whatsapp' }, auth(uH));
  check('H3: item_id invalido -> 400', outH3.res.statusCode === 400);

  // ---------- I. Item inexistente ----------
  var uI = '88888888-8888-8888-8888-888888888888';
  var mockI = crearMock([{ test: 'FROM destinos WHERE id::text', reply: [] }]);
  global.__MOCKSQL__ = mockI.fn;
  var resI = makeRes();
  await handler(makeReq('POST', { tipo: 'compartir', usuario_id: uI, fuente: 'destino', item_id: 'nope', canal: 'whatsapp' }, auth(uI)), resI);
  check('I1: destino inexistente -> 404', resI.statusCode === 404);
  check('I2: 404 no inserta', !mockI.alguna('INSERT INTO media_compartidos'));

  // ---------- J. ASCII-safety ----------
  var bInt = fs.readFileSync(path.join(__dirname, '..', 'api/interacciones.js'));
  check('J1: api/interacciones.js 0 bytes > 127', asciiSafeBytes(bInt));
  check('J2: api/interacciones.js 0 backticks', !tieneBacktick(SRC));
  var propio = readSrc('scripts/smoke_036_compartir.js');
  check('J3: smoke 036 compartir ASCII-safe', asciiSafeBytes(Buffer.from(propio, 'utf8')));
  check('J4: smoke 036 compartir 0 backticks', !tieneBacktick(propio));
}

function finish() {
  console.log('');
  console.log('=== SMOKE 036 COMPARTIR ===');
  console.log('Checks: ' + (passed + failed) + ' total, ' + passed + ' PASS, ' + failed + ' FAIL');
  if (failed === 0) console.log('SMOKE 036 COMPARTIR: OK');
  else { console.log('SMOKE 036 COMPARTIR: ' + failed + ' FALLO(S)'); process.exitCode = 1; }
}

run().then(finish).catch(function(err) {
  console.log('FAIL - smoke 036 compartir lanzo error: ' + (err && err.message));
  process.exitCode = 1;
  finish();
});
