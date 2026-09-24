// scripts/smoke_ref_info.js
// Gate permanente de la rama GET publica ?tipo=ref_info de api/usuarios.js
// (v23, consulta publica suave de referidos). Carga el handler REAL en un
// sandbox vm con @neondatabase/serverless redirigido a un fake en memoria
// (via global.__MOCKSQL__): corre sin red y sin BD, como sus pares.
//
// Cubre:
//   1. ref valido -> 200 {ok:true, anfitrion_nombre} con trim aplicado.
//   2. nombre largo -> slice(0,80).
//   3. codigo inexistente -> 200 REFERIDO_INVALIDO (consulta suave).
//   4. sin codigo (?ref= vacio o ausente) -> 200 REFERIDO_INVALIDO.
//   5. nombre en blanco (o null) en BD -> 200 REFERIDO_INVALIDO.
//   6. regresion: GET sin tipo / tipo desconocido -> 400 'Falta id o tipo'
//      (respuesta real de api/usuarios.js, ADR-006).
//   7. la rama es publica: no llama validarSesion y solo hace el SELECT
//      publico (sin consultas extras de sesion).
//   8. estaticos: rama presente con contrato completo + ASCII-safety del
//      propio smoke (ADR-002).
//
// ASCII-safe (ADR-002), CommonJS (BUG-001), 0 backticks.
// Run: node scripts/smoke_ref_info.js
'use strict';

var fs = require('fs');
var path = require('path');
var vm = require('vm');

var ROOT = path.join(__dirname, '..');

var total = 0;
var fails = 0;
function check(label, cond, detalle) {
  total++;
  if (cond) { console.log('PASS - ' + label); }
  else {
    fails++;
    console.log('FAIL - ' + label + (detalle === undefined ? '' : ' :: ' + JSON.stringify(detalle)));
  }
}

// ---- Sandbox del api real (fake neon inyectado por customRequire) ----
var llamadasSql = [];

function cargarApi(fileRel) {
  var fakeNeon = {
    neon: function() {
      return function(q, p) {
        llamadasSql.push({ q: String(q), p: p });
        return global.__MOCKSQL__ ? global.__MOCKSQL__(q, p) : Promise.resolve([]);
      };
    }
  };
  var customRequire = function(request) {
    if (request === '@neondatabase/serverless') return fakeNeon;
    return require(request);
  };
  customRequire.resolve = require.resolve;
  var src = fs.readFileSync(path.join(ROOT, fileRel), 'utf8');
  var sandbox = {
    module: { exports: {} }, exports: {},
    require: customRequire, console: console, process: process,
    Buffer: Buffer, setTimeout: setTimeout, clearTimeout: clearTimeout,
    fetch: function() { return Promise.resolve({ json: function() { return Promise.resolve({}); } }); }
  };
  sandbox.exports = sandbox.module.exports;
  vm.createContext(sandbox);
  vm.runInContext(src, sandbox, { filename: fileRel });
  return sandbox.module.exports;
}

var handler = cargarApi('api/usuarios.js');

// ---- res fake minimo ----
function fakeRes() {
  return {
    _status: 0, _json: null, _headers: {},
    setHeader: function(k, v) { this._headers[k] = v; return this; },
    status: function(n) { this._status = n; return this; },
    json: function(o) { this._json = o; return this; },
    end: function() { return this; }
  };
}

// ---- Mock SQL por match de substring ----
function instalarMock(rutas) {
  global.__MOCKSQL__ = function(q) {
    var texto = String(q || '');
    for (var i = 0; i < rutas.length; i++) {
      if (texto.indexOf(rutas[i].match) !== -1) {
        var filas = typeof rutas[i].rows === 'function' ? rutas[i].rows(q) : rutas[i].rows;
        return Promise.resolve(filas);
      }
    }
    return Promise.resolve([]);
  };
}

function invocar(req) {
  llamadasSql.length = 0;
  var res = fakeRes();
  return Promise.resolve()
    .then(function() { return handler(req, res); })
    .then(function() { return res; });
}

var SELECT_REF = 'SELECT nombre FROM usuarios WHERE codigo_referido=$1 LIMIT 1';

function contarNoAscii(buf) {
  var n = 0;
  for (var i = 0; i < buf.length; i++) { if (buf[i] > 127) n++; }
  return n;
}

async function run() {

  // ============ 1. ref valido -> ok:true + anfitrion_nombre (trim) =====
  instalarMock([
    { match: 'codigo_referido=$1', rows: [{ nombre: '  Ana Anfitriona  ' }] }
  ]);
  var res1 = await invocar({ method: 'GET', query: { tipo: 'ref_info', ref: 'REFABC' }, headers: {} });
  check('1a: ref valido -> status 200', res1._status === 200, res1._status);
  check('1b: ref valido -> ok:true', res1._json && res1._json.ok === true, res1._json);
  check('1c: ref valido -> anfitrion_nombre con trim aplicado',
    res1._json && res1._json.anfitrion_nombre === 'Ana Anfitriona', res1._json);
  check('1d: ref valido -> una sola consulta (la publica, sin checks de sesion)',
    llamadasSql.length === 1 && llamadasSql[0].q.indexOf(SELECT_REF) === 0 && llamadasSql[0].p[0] === 'REFABC',
    { llamadas: llamadasSql.length, q: llamadasSql[0] && llamadasSql[0].q, p: llamadasSql[0] && llamadasSql[0].p });

  // ============ 1b. alias ?codigo= con trim en el binding ==============
  var res1b = await invocar({ method: 'GET', query: { tipo: 'ref_info', codigo: 'COD123  ' }, headers: {} });
  check('1e: alias ?codigo= con espacios -> se trimea en el binding',
    res1b._json && res1b._json.ok === true && res1b._json.anfitrion_nombre === 'Ana Anfitriona'
      && llamadasSql.length === 1 && llamadasSql[0].p[0] === 'COD123',
    { json: res1b._json, llamadas: llamadasSql.length, p: llamadasSql[0] && llamadasSql[0].p });

  // ============ 2. nombre largo -> slice(0, 80) ========================
  var nombreLargo = new Array(101).join('n') + 'Z'; // 100 'n' + 'Z' = 101 chars
  instalarMock([
    { match: 'codigo_referido=$1', rows: [{ nombre: nombreLargo }] }
  ]);
  var res2 = await invocar({ method: 'GET', query: { tipo: 'ref_info', ref: 'LARGO' }, headers: {} });
  var esperado80 = new Array(81).join('n'); // 80 'n'
  check('2a: nombre largo -> status 200 y ok:true',
    res2._status === 200 && res2._json && res2._json.ok === true, { status: res2._status, json: res2._json });
  check('2b: nombre largo -> anfitrion_nombre recortado a 80 chars',
    res2._json && res2._json.anfitrion_nombre === esperado80, res2._json);

  // ============ 3. codigo inexistente -> 200 REFERIDO_INVALIDO =========
  instalarMock([
    { match: 'codigo_referido=$1', rows: [] }
  ]);
  var res3 = await invocar({ method: 'GET', query: { tipo: 'ref_info', ref: 'NOEXISTE' }, headers: {} });
  check('3a: codigo inexistente -> status 200', res3._status === 200, res3._status);
  check('3b: codigo inexistente -> ok:false y error REFERIDO_INVALIDO',
    res3._json && res3._json.ok === false && res3._json.error === 'REFERIDO_INVALIDO', res3._json);

  // ============ 4. sin codigo -> 200 REFERIDO_INVALIDO =================
  var res4 = await invocar({ method: 'GET', query: { tipo: 'ref_info' }, headers: {} });
  check('4a: sin ref/codigo -> status 200 con REFERIDO_INVALIDO',
    res4._status === 200 && res4._json && res4._json.ok === false
      && res4._json.error === 'REFERIDO_INVALIDO',
    { status: res4._status, json: res4._json });
  check('4b: sin ref/codigo -> no hace ninguna consulta SQL',
    llamadasSql.length === 0, llamadasSql.length);

  var res4b = await invocar({ method: 'GET', query: { tipo: 'ref_info', ref: '   ' }, headers: {} });
  check('4c: ref solo espacios -> REFERIDO_INVALIDO',
    res4b._status === 200 && res4b._json && res4b._json.ok === false
      && res4b._json.error === 'REFERIDO_INVALIDO',
    { status: res4b._status, json: res4b._json });

  // ============ 5. nombre en blanco / null en BD -> REFERIDO_INVALIDO ==
  instalarMock([
    { match: 'codigo_referido=$1', rows: [{ nombre: '   ' }] }
  ]);
  var res5a = await invocar({ method: 'GET', query: { tipo: 'ref_info', ref: 'BLANKO' }, headers: {} });
  check('5a: nombre en blanco en BD -> 200 REFERIDO_INVALIDO',
    res5a._status === 200 && res5a._json && res5a._json.ok === false
      && res5a._json.error === 'REFERIDO_INVALIDO',
    { status: res5a._status, json: res5a._json });

  instalarMock([
    { match: 'codigo_referido=$1', rows: [{ nombre: null }] }
  ]);
  var res5b = await invocar({ method: 'GET', query: { tipo: 'ref_info', ref: 'NULLNOM' }, headers: {} });
  check('5b: nombre null en BD -> 200 REFERIDO_INVALIDO',
    res5b._status === 200 && res5b._json && res5b._json.ok === false
      && res5b._json.error === 'REFERIDO_INVALIDO',
    { status: res5b._status, json: res5b._json });

  // ============ 6. regresion: GET sin tipo / tipo desconocido ==========
  var res6a = await invocar({ method: 'GET', query: {}, headers: {} });
  check('6a: GET sin params -> status 400', res6a._status === 400, res6a._status);
  check('6b: GET sin params -> error "Falta id o tipo"',
    res6a._json && res6a._json.ok === false && res6a._json.error === 'Falta id o tipo', res6a._json);

  var res6b = await invocar({ method: 'GET', query: { tipo: 'tipo_que_no_existe' }, headers: {} });
  check('6c: GET con tipo desconocido -> status 400', res6b._status === 400, res6b._status);
  check('6d: GET con tipo desconocido -> error "Falta id o tipo"',
    res6b._json && res6b._json.ok === false && res6b._json.error === 'Falta id o tipo', res6b._json);

  // ============ 7. estaticos: contrato y naturaleza publica ============
  var src = fs.readFileSync(path.join(ROOT, 'api/usuarios.js'), 'utf8');
  var iniRef = src.indexOf("if (tipo === 'ref_info')");
  var finRef = src.indexOf("if (tipo === 'referido_red')");
  var bloque = (iniRef !== -1 && finRef > iniRef) ? src.slice(iniRef, finRef) : '';
  check('7a: rama ref_info presente en api/usuarios.js', iniRef !== -1);
  check('7b: bloque lee ref o codigo del query (alias publico)',
    bloque.indexOf('req.query.ref') !== -1 && bloque.indexOf('req.query.codigo') !== -1);
  check('7c: SELECT publico no expone email/avatar/XP/ids',
    bloque.indexOf('SELECT nombre FROM usuarios WHERE codigo_referido=$1 LIMIT 1') !== -1
      && bloque.indexOf('email') === -1 && bloque.indexOf('avatar') === -1);
  check('7d: bloque recorta con slice(0, 80)',
    bloque.indexOf('.trim().slice(0, 80)') !== -1);
  check('7e: REFERIDO_INVALIDO aparece exactamente 2 veces (vacio o sin nombre)',
    (bloque.split('REFERIDO_INVALIDO').length - 1) === 2, bloque.split('REFERIDO_INVALIDO').length - 1);
  check('7f: la rama NO llama validarSesion (consulta publica sin JWT)',
    bloque.indexOf('validarSesion') === -1 && bloque.indexOf('esAdminUsuario') === -1);

  var selfBuf = fs.readFileSync(path.join(ROOT, 'scripts/smoke_ref_info.js'));
  check('7g: smoke ASCII-safe (0 bytes > 127)', contarNoAscii(selfBuf) === 0, contarNoAscii(selfBuf));
  check('7h: smoke con 0 backticks', selfBuf.toString('utf8').indexOf(String.fromCharCode(96)) === -1);

  console.log('');
  if (fails === 0) {
    console.log('RESULTADO: OK - ' + total + ' verificaciones pasaron.');
    process.exit(0);
  } else {
    console.log('RESULTADO: FAIL - ' + fails + ' de ' + total + ' verificaciones fallaron.');
    process.exit(1);
  }
}

run().catch(function(err) {
  console.log('FAIL - smoke ref_info lanzo error: ' + (err && err.message));
  process.exit(1);
});