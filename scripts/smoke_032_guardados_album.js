// scripts/smoke_032_guardados_album.js
// Smoke offline (sin red, sin DB) de ADR-054 (v26 de api/interacciones.js):
// los guardados de media se organizan dentro de "Mis Albumes" (migracion 032),
// supersediendo las carpetas privadas de ADR-052:
//   1) mis_guardados_media EXIGE sesion firmada (401 SESION_REQUERIDA); con
//      sesion responde 200 {ok,data[],albumes[]} donde cada item expone
//      mi_album_id/mi_album_titulo/visible. Si falta la 032 (42P01/42703)
//      responde 503 SCHEMA_NOT_MIGRATED (NUNCA data:[]).
//   2) guardados_carpeta reescrito sobre albumes: accion=album asigna/quita
//      (404 ALBUM_NO_ENCONTRADO si el album es ajeno, 404 GUARDADO_NO_ENCONTRADO
//      si el bookmark no es del dueno; la desasignacion fuerza visible=false en
//      la MISMA sentencia via CASE WHEN ... IS NULL); accion=publicar exige
//      album previo (409 SIN_ALBUM); crear|renombrar|eliminar|mover -> 410
//      CARPETAS_DEPRECADAS. Sesion obligatoria (401 sin Bearer).
//   3) Checks estaticos de fuente: api/interacciones.js ya NO contiene SQL de
//      carpetas (guardados_carpetas/carpeta_id); api/pagina-destino.js conserva
//      el filtro af.visible = true (BUG-082); la migracion 032 existe y es
//      ASCII-safe.
// Carga el handler REAL en un sandbox vm con @neondatabase/serverless
// redirigido a un mock en memoria (global.__MOCKSQL__). Harness minimo con el
// mismo patron de scripts/smoke_029_030_coords_carpetas.js.
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
function readSrc(rel) { return fs.readFileSync(path.join(__dirname, '..', rel), 'utf8'); }
function tieneBacktick(s) { return s.indexOf(String.fromCharCode(96)) !== -1; }

// --- cargador del api en sandbox vm (harness minimo del smoke 029/030) ---
function cargarApi(fileRel) {
  var fakeNeon = { neon: function() { return function(q, p) { return global.__MOCKSQL__(q, p); }; } };
  var customRequire = function(request) {
    if (request === '@neondatabase/serverless') return fakeNeon;
    return require(request);
  };
  customRequire.resolve = require.resolve;
  var sandbox = {
    module: { exports: {} }, exports: {},
    require: customRequire, console: console, process: process,
    Buffer: Buffer, setTimeout: setTimeout, clearTimeout: clearTimeout,
    fetch: function() { return Promise.resolve({ ok: true, status: 200, json: function() { return Promise.resolve({}); } }); }
  };
  sandbox.exports = sandbox.module.exports;
  vm.createContext(sandbox);
  var code = fs.readFileSync(path.join(__dirname, '..', fileRel), 'utf8');
  vm.runInContext(code, sandbox, { filename: fileRel });
  return sandbox.module.exports;
}

// Mock de sql por rama: primer matcher que acierte responde/rechaza.
function crearMock(matchers) {
  var state = { queries: [] };
  state.fn = function(q, p) {
    var sql = String(q);
    state.queries.push({ q: sql, p: p || [] });
    for (var i = 0; i < matchers.length; i++) {
      var m = matchers[i];
      var hit = (m.test instanceof RegExp) ? m.test.test(sql) : sql.indexOf(m.test) !== -1;
      if (!hit) continue;
      if (m.reject) return Promise.reject(m.reject);
      return Promise.resolve((typeof m.reply === 'function') ? m.reply(p || [], sql) : m.reply);
    }
    return Promise.resolve([]);
  };
  state.cuenta = function(sub) { return state.queries.filter(function(x) { return x.q.indexOf(sub) !== -1; }).length; };
  state.alguna = function(sub) { return state.cuenta(sub) > 0; };
  state.ultima = function(sub) {
    var found = null;
    state.queries.forEach(function(x) { if (x.q.indexOf(sub) !== -1) found = x; });
    return found;
  };
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
function firmarToken(uid) {
  var secreto = process.env.SESSION_JWT_SECRET || 'dev_secret';
  var payload = Buffer.from(JSON.stringify({
    sub: String(uid), exp: Math.floor(Date.now() / 1000) + 3600
  })).toString('base64url');
  var firma = crypto.createHmac('sha256', secreto).update(payload).digest('base64url');
  return payload + '.' + firma;
}
function authHeaders(uid) { return { authorization: 'Bearer ' + firmarToken(uid) }; }

var SRC = readSrc('api/interacciones.js');
var PAGINA_SRC = readSrc('api/pagina-destino.js');
var MIGRACION = 'db/migrations/032_guardados_album.sql';
var handler = cargarApi('api/interacciones.js');
var U = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
var OTRO = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
var ALBUM = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
var ITEM = 'p1';

async function run() {

  // ============ A. mis_guardados_media: sesion, albumes[] y 503 ============
  var mMgNoAuth = crearMock([]);
  global.__MOCKSQL__ = mMgNoAuth.fn;
  var resMgNoAuth = makeRes();
  await handler({ method: 'GET', body: {}, query: { tipo: 'mis_guardados_media', usuario_id: OTRO }, headers: {} }, resMgNoAuth);
  check('A1: mis_guardados_media sin sesion -> 401', resMgNoAuth.statusCode === 401);
  check('A2: mis_guardados_media sin sesion -> SESION_REQUERIDA',
    !!(resMgNoAuth.body && resMgNoAuth.body.error === 'SESION_REQUERIDA'));
  check('A3: mis_guardados_media sin sesion no toca la base', mMgNoAuth.queries.length === 0);

  var mMgOk = crearMock([
    { test: 'FROM media_guardados mg', reply: [
      { fuente: 'album_foto', item_id: ITEM, creado_en: 't', titulo: 'T', media_url: 'u',
        media_type: 'foto', ciudad: 'X', album_id: ALBUM, destino_slug: null,
        mi_album_id: ALBUM, mi_album_titulo: 'Viajes', visible: true }
    ] },
    { test: 'SELECT id::text AS id, titulo, tipo FROM albumes', reply: [
      { id: ALBUM, titulo: 'Viajes', tipo: 'mixto' }
    ] }
  ]);
  global.__MOCKSQL__ = mMgOk.fn;
  var resMgOk = makeRes();
  await handler({ method: 'GET', body: {}, query: { tipo: 'mis_guardados_media', usuario_id: OTRO }, headers: authHeaders(U) }, resMgOk);
  var bMgOk = resMgOk.body || {};
  check('A4: mis_guardados_media con sesion -> 200', resMgOk.statusCode === 200);
  check('A5: respuesta con albumes[] (no carpetas)',
    Array.isArray(bMgOk.albumes) && bMgOk.albumes.length === 1
    && bMgOk.carpetas === undefined);
  check('A6: cada item expone mi_album_id/mi_album_titulo/visible',
    !!(bMgOk.data && bMgOk.data[0] && bMgOk.data[0].mi_album_id === ALBUM
      && bMgOk.data[0].mi_album_titulo === 'Viajes' && bMgOk.data[0].visible === true));
  var qMg = mMgOk.ultima('FROM media_guardados mg');
  check('A7: usa el uuid de la sesion e ignora usuario_id del query',
    !!qMg && qMg.p.indexOf(U) !== -1 && qMg.p.indexOf(OTRO) === -1);

  var mMg42P01 = crearMock([
    { test: 'FROM media_guardados mg', reject: { code: '42P01', message: 'relation does not exist' } }
  ]);
  global.__MOCKSQL__ = mMg42P01.fn;
  var resMg42P01 = makeRes();
  await handler({ method: 'GET', body: {}, query: { tipo: 'mis_guardados_media' }, headers: authHeaders(U) }, resMg42P01);
  check('A8: 42P01 -> 503 SCHEMA_NOT_MIGRATED (no data:[])',
    resMg42P01.statusCode === 503 && !!(resMg42P01.body && resMg42P01.body.error === 'SCHEMA_NOT_MIGRATED')
    && resMg42P01.body.data === undefined);

  var mMg42703 = crearMock([
    { test: 'FROM media_guardados mg', reply: [] },
    { test: 'SELECT id::text AS id, titulo, tipo FROM albumes', reject: { code: '42703', message: 'column does not exist' } }
  ]);
  global.__MOCKSQL__ = mMg42703.fn;
  var resMg42703 = makeRes();
  await handler({ method: 'GET', body: {}, query: { tipo: 'mis_guardados_media' }, headers: authHeaders(U) }, resMg42703);
  check('A9: 42703 -> 503 SCHEMA_NOT_MIGRATED',
    resMg42703.statusCode === 503 && !!(resMg42703.body && resMg42703.body.error === 'SCHEMA_NOT_MIGRATED'));

  // ============ B. guardados_carpeta: auth, album, publicar y deprecacion ============
  var mGcNoAuth = crearMock([]);
  global.__MOCKSQL__ = mGcNoAuth.fn;
  var resGcNoAuth = makeRes();
  await handler({ method: 'POST', body: { tipo: 'guardados_carpeta', accion: 'album', fuente: 'album_foto', item_id: ITEM }, query: {}, headers: {} }, resGcNoAuth);
  check('B1: guardados_carpeta sin sesion -> 401', resGcNoAuth.statusCode === 401);
  check('B2: guardados_carpeta sin sesion no toca la base', mGcNoAuth.queries.length === 0);

  var mGcOtro = crearMock([]);
  global.__MOCKSQL__ = mGcOtro.fn;
  var resGcOtro = makeRes();
  await handler({ method: 'POST', body: { tipo: 'guardados_carpeta', usuario_id: U, accion: 'album', fuente: 'album_foto', item_id: ITEM, album_id: ALBUM }, query: {}, headers: authHeaders(OTRO) }, resGcOtro);
  check('B3: token de otro usuario -> 401', resGcOtro.statusCode === 401);
  check('B4: token ajeno no toca la base', mGcOtro.queries.length === 0);

  var mGcAjeno = crearMock([{ test: 'SELECT id FROM albumes', reply: [] }]);
  global.__MOCKSQL__ = mGcAjeno.fn;
  var resGcAjeno = makeRes();
  await handler({ method: 'POST', body: { tipo: 'guardados_carpeta', accion: 'album', fuente: 'album_foto', item_id: ITEM, album_id: ALBUM }, query: {}, headers: authHeaders(U) }, resGcAjeno);
  check('B5: album ajeno -> 404 ALBUM_NO_ENCONTRADO',
    resGcAjeno.statusCode === 404 && !!(resGcAjeno.body && resGcAjeno.body.error === 'ALBUM_NO_ENCONTRADO'));
  check('B6: album ajeno no toca media_guardados', !mGcAjeno.alguna('UPDATE media_guardados'));

  var mGcSinFila = crearMock([{ test: 'UPDATE media_guardados SET album_id', reply: [] }]);
  global.__MOCKSQL__ = mGcSinFila.fn;
  var resGcSinFila = makeRes();
  await handler({ method: 'POST', body: { tipo: 'guardados_carpeta', accion: 'album', fuente: 'album_foto', item_id: ITEM }, query: {}, headers: authHeaders(U) }, resGcSinFila);
  check('B7: album sin fila propia -> 404 GUARDADO_NO_ENCONTRADO',
    resGcSinFila.statusCode === 404 && !!(resGcSinFila.body && resGcSinFila.body.error === 'GUARDADO_NO_ENCONTRADO'));
  var qGcAlbum = mGcSinFila.ultima('UPDATE media_guardados SET album_id');
  check('B8: desasignar fuerza visible=false en la MISMA sentencia',
    !!qGcAlbum && qGcAlbum.q.indexOf('CASE WHEN $1::uuid IS NULL THEN false') !== -1);
  check('B9: desasignar envia album_id NULL',
    !!qGcAlbum && qGcAlbum.p[0] === null);

  var mGcPubSin = crearMock([
    { test: 'SELECT album_id FROM media_guardados', reply: [{ album_id: null }] }
  ]);
  global.__MOCKSQL__ = mGcPubSin.fn;
  var resGcPubSin = makeRes();
  await handler({ method: 'POST', body: { tipo: 'guardados_carpeta', accion: 'publicar', fuente: 'album_foto', item_id: ITEM, visible: true }, query: {}, headers: authHeaders(U) }, resGcPubSin);
  check('B10: publicar sin album -> 409 SIN_ALBUM',
    resGcPubSin.statusCode === 409 && !!(resGcPubSin.body && resGcPubSin.body.error === 'SIN_ALBUM'));
  check('B11: publicar sin album no escribe visible', !mGcPubSin.alguna('UPDATE media_guardados SET visible'));

  var mGcPubOk = crearMock([
    { test: 'SELECT album_id FROM media_guardados', reply: [{ album_id: ALBUM }] },
    { test: 'UPDATE media_guardados SET visible', reply: [{ item_id: ITEM }] }
  ]);
  global.__MOCKSQL__ = mGcPubOk.fn;
  var resGcPubOk = makeRes();
  await handler({ method: 'POST', body: { tipo: 'guardados_carpeta', accion: 'publicar', fuente: 'album_foto', item_id: ITEM, visible: true }, query: {}, headers: authHeaders(U) }, resGcPubOk);
  check('B12: publicar con album -> 200 visible true',
    resGcPubOk.statusCode === 200 && !!(resGcPubOk.body && resGcPubOk.body.visible === true));

  var GC_DEPRECADAS = ['crear', 'renombrar', 'eliminar', 'mover'];
  for (var iDep = 0; iDep < GC_DEPRECADAS.length; iDep++) {
    var accionDep = GC_DEPRECADAS[iDep];
    var mDep = crearMock([]);
    global.__MOCKSQL__ = mDep.fn;
    var resDep = makeRes();
    await handler({ method: 'POST', body: { tipo: 'guardados_carpeta', accion: accionDep, nombre: 'Viajes' }, query: {}, headers: authHeaders(U) }, resDep);
    check('B13.' + (iDep + 1) + ': accion ' + accionDep + ' -> 410 CARPETAS_DEPRECADAS',
      resDep.statusCode === 410 && !!(resDep.body && resDep.body.error === 'CARPETAS_DEPRECADAS')
      && mDep.queries.length === 0);
  }

  // ============ C. Estructura estatica de fuentes ============
  check('C1: rama mis_guardados_media presente', SRC.indexOf("tipo === 'mis_guardados_media'") !== -1);
  check('C2: mis_guardados_media responde albumes[]', SRC.indexOf('albumes: mgAlbumes') !== -1);
  check('C3: mis_guardados_media expone mi_album_id', SRC.indexOf('mg.album_id::text AS mi_album_id') !== -1);
  check('C4: mis_guardados_media expone visible', SRC.indexOf('AS mi_album_id, mg.visible') !== -1);
  check('C5: rama guardados_carpeta presente', SRC.indexOf("tipo2 === 'guardados_carpeta'") !== -1);
  check('C6: guardados_carpeta responde 410 CARPETAS_DEPRECADAS',
    SRC.indexOf("error: 'CARPETAS_DEPRECADAS'") !== -1);
  check('C7: guardados_carpeta responde 404 ALBUM_NO_ENCONTRADO',
    SRC.indexOf("error: 'ALBUM_NO_ENCONTRADO'") !== -1);
  check('C8: guardados_carpeta responde 404 GUARDADO_NO_ENCONTRADO',
    SRC.indexOf("error: 'GUARDADO_NO_ENCONTRADO'") !== -1);
  check('C9: guardados_carpeta responde 409 SIN_ALBUM',
    SRC.indexOf("error: 'SIN_ALBUM'") !== -1);
  check('C10: UPDATE fuerza visible=false al desasignar (CASE WHEN IS NULL)',
    SRC.indexOf('CASE WHEN $1::uuid IS NULL THEN false') !== -1);
  check('C11: api/interacciones.js sin guardados_carpetas', SRC.indexOf('guardados_carpetas') === -1);
  check('C12: api/interacciones.js sin carpeta_id', SRC.indexOf('carpeta_id') === -1);
  check('C13: api/pagina-destino.js conserva af.visible = true (BUG-082)',
    /af\.visible\s*=\s*true/.test(PAGINA_SRC));
  check('C14: migracion 032 existe',
    fs.existsSync(path.join(__dirname, '..', MIGRACION)));
  var bMig = fs.readFileSync(path.join(__dirname, '..', MIGRACION));
  check('C15: migracion 032 ASCII-safe (0 bytes > 127)', asciiSafeBytes(bMig));
  var sMig = bMig.toString('utf8');
  check('C16: migracion 032 agrega visible y elimina guardados_carpetas',
    sMig.indexOf('ADD COLUMN visible boolean NOT NULL DEFAULT false') !== -1
    && sMig.indexOf('DROP TABLE IF EXISTS guardados_carpetas') !== -1);

  // ============ D. ASCII-safety ============
  var bInt = fs.readFileSync(path.join(__dirname, '..', 'api/interacciones.js'));
  check('D1: api/interacciones.js 0 bytes > 127', asciiSafeBytes(bInt));
  check('D2: api/interacciones.js 0 backticks', !tieneBacktick(SRC));
  var propio = readSrc('scripts/smoke_032_guardados_album.js');
  check('D3: smoke 032 ASCII-safe', asciiSafeBytes(Buffer.from(propio, 'utf8')));
  check('D4: smoke 032 0 backticks', !tieneBacktick(propio));
}

function finish() {
  console.log('');
  console.log('=== SMOKE 032 GUARDADOS ALBUM ===');
  console.log('Checks: ' + (passed + failed) + ' total, ' + passed + ' PASS, ' + failed + ' FAIL');
  if (failed === 0) console.log('SMOKE 032 GUARDADOS ALBUM: OK');
  else { console.log('SMOKE 032 GUARDADOS ALBUM: ' + failed + ' FALLO(S)'); process.exitCode = 1; }
}

run().then(finish).catch(function(err) {
  console.log('FAIL - smoke 032 lanzo error: ' + (err && err.message));
  process.exitCode = 1;
  finish();
});
