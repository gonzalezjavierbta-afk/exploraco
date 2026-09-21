// scripts/smoke_029_030_coords_carpetas.js
// Smoke offline (sin red, sin DB) de las ramas v24 de api/interacciones.js
// cubiertas por las migraciones 029 (album_fotos coords propias) y 030
// (guardados_carpetas):
//   1) multimedia_mapa: la rama album proyecta COALESCE(af.lat,a.lat) /
//      COALESCE(af.lng,a.lng); coords propias ganan, sin propias hereda
//      del album.
//   2) scope=mio: exige sesion firmada (400 SESION_REQUERIDA) y usa el
//      uuid del token (nunca el usuario_id del query); no suprime
//      af.visible=true sin dueno autenticado.
//   3) museo_recurso GET: emite lat_propia/lng_propia/coords_heredadas.
//   4) museo_recurso POST editar: quitar_coords -> lat/lng NULL; lat/lng
//      -> coords del recurso.
//   5) mis_guardados_media: carpetas + carpeta_id; fallo 42P01/42703 ->
//      503 SCHEMA_NOT_MIGRATED (NUNCA data:[]).
//   6) guardados_carpeta: sesion obligatoria, crear duplicado -> 409
//      CARPETA_DUPLICADA, mover con doble pertenencia y eliminar
//      reasignando carpeta_id=NULL sin borrar bookmarks.
// Carga el handler REAL en un sandbox vm con @neondatabase/serverless
// redirigido a un mock en memoria (global.__MOCKSQL__). El harness minimo
// se replica de scripts/smoke_036_media_unificada.js (mismo patron).
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

// --- cargador del api en sandbox vm (harness minimo del smoke 036) ---
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
var handler = cargarApi('api/interacciones.js');
var U = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
var OTRO = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
var CARPETA = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
var REC = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
var ALBUM = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';

// Fila reutilizable del UNION de multimedia_mapa (rama album).
function filaAlbum(lat, lng, uid) {
  return {
    media_url: 'https://img/x.jpg', media_type: 'foto', media_title: 'T',
    media_source: '', lat: lat, lng: lng, ciudad: 'Bogota', album_titulo: 'A',
    autor_nombre: 'N', usuario_nombre: 'N', usuario_avatar: '',
    usuario_id: uid, album_id: ALBUM, origen: 'album', origen_id: ALBUM,
    media_id: 'p1', fuente: 'album_foto', votos: 1
  };
}

async function run() {

  // ============ A. multimedia_mapa: COALESCE de coords ============
  var mPropia = crearMock([{ test: 'FROM album_fotos af', reply: [filaAlbum(4.711, -74.072, null)] }]);
  global.__MOCKSQL__ = mPropia.fn;
  var resPropia = makeRes();
  await handler({ method: 'GET', body: {}, query: { tipo: 'multimedia_mapa' }, headers: {} }, resPropia);
  var bPropia = resPropia.body || {};
  check('A1: multimedia_mapa 200', resPropia.statusCode === 200);
  check('A2: rama album proyecta COALESCE(af.lat, a.lat)', mPropia.alguna('COALESCE(af.lat, a.lat) AS lat'));
  check('A3: rama album proyecta COALESCE(af.lng, a.lng)', mPropia.alguna('COALESCE(af.lng, a.lng) AS lng'));
  check('A4: coords propias ganan (lat/lng del recurso)',
    bPropia.data && bPropia.data.length === 1
    && bPropia.data[0].lat === 4.711 && bPropia.data[0].lng === -74.072);
  check('A5: coords propias NO disparan fallback de autor', !mPropia.alguna('FROM interacciones i'));
  var qPublica = mPropia.ultima('FROM album_fotos af');
  check('A6: sin scope=mio conserva af.visible = true',
    !!qPublica && qPublica.q.indexOf('AND af.visible = true') !== -1);

  // Proyeccion COALESCE simulada: af.lat null -> hereda la del album.
  var albumLat = -74.055, albumLng = 4.654;
  var mHereda = crearMock([{ test: 'FROM album_fotos af', reply: [filaAlbum(albumLat, albumLng, null)] }]);
  global.__MOCKSQL__ = mHereda.fn;
  var resHereda = makeRes();
  await handler({ method: 'GET', body: {}, query: { tipo: 'multimedia_mapa' }, headers: {} }, resHereda);
  var bHereda = resHereda.body || {};
  check('A7: sin coords propias hereda el pin del album',
    bHereda.data && bHereda.data.length === 1 && bHereda.data[0].lat === albumLat && bHereda.data[0].lng === albumLng);
  check('A8: fila heredada no dispara fallback de autor', !mHereda.alguna('FROM interacciones i'));

  // Sin coords efectivas (ni propias ni de album) y sin autor -> se descarta.
  var mSin = crearMock([{ test: 'FROM album_fotos af', reply: [filaAlbum(null, null, null)] }]);
  global.__MOCKSQL__ = mSin.fn;
  var resSin = makeRes();
  await handler({ method: 'GET', body: {}, query: { tipo: 'multimedia_mapa' }, headers: {} }, resSin);
  var bSin = resSin.body || {};
  check('A9: fila sin coords ni autor se descarta', Array.isArray(bSin.data) && bSin.data.length === 0);

  // ============ B. scope=mio: seguridad de sesion ============
  var mMioNoAuth = crearMock([]);
  global.__MOCKSQL__ = mMioNoAuth.fn;
  var resMioNoAuth = makeRes();
  await handler({ method: 'GET', body: {}, query: { tipo: 'multimedia_mapa', scope: 'mio', usuario_id: OTRO }, headers: {} }, resMioNoAuth);
  check('B1: scope=mio sin Authorization -> 400', resMioNoAuth.statusCode === 400);
  check('B2: scope=mio sin Authorization -> SESION_REQUERIDA', !!(resMioNoAuth.body && resMioNoAuth.body.error === 'SESION_REQUERIDA'));
  check('B3: scope=mio sin sesion no toca la base', mMioNoAuth.queries.length === 0);

  var mMio = crearMock([{ test: 'FROM album_fotos af', reply: [] }]);
  global.__MOCKSQL__ = mMio.fn;
  var resMio = makeRes();
  await handler({ method: 'GET', body: {}, query: { tipo: 'multimedia_mapa', scope: 'mio', usuario_id: OTRO }, headers: authHeaders(U) }, resMio);
  var qMio = mMio.ultima('FROM album_fotos af');
  check('B4: scope=mio con token valido -> 200', resMio.statusCode === 200);
  check('B5: usa el uuid de la sesion e ignora usuario_id del query',
    !!qMio && qMio.p.indexOf(U) !== -1 && qMio.p.indexOf(OTRO) === -1);
  check('B6: scope=mio con dueno suprime af.visible = true',
    !!qMio && qMio.q.indexOf('AND af.visible = true') === -1);
  check('B7: scope=mio filtra la rama album por a.usuario_id',
    !!qMio && qMio.q.indexOf('a.usuario_id = $1::uuid') !== -1);

  var mMioUuid = crearMock([]);
  global.__MOCKSQL__ = mMioUuid.fn;
  var resMioUuid = makeRes();
  await handler({ method: 'GET', body: {}, query: { tipo: 'multimedia_mapa', scope: 'mio' }, headers: authHeaders('no-es-uuid') }, resMioUuid);
  check('B8: scope=mio con sub no-uuid -> 400 SESION_INVALIDA',
    resMioUuid.statusCode === 400 && !!(resMioUuid.body && resMioUuid.body.error === 'SESION_INVALIDA'));

  // ============ C. museo_recurso GET: lat_propia/coords_heredadas ============
  var mMuseoGet = crearMock([{ test: 'af.lat AS lat_propia', reply: [
    { id: 'p1', album_id: ALBUM, album_titulo: 'A', foto_url: 'u1', media_title: 'm1', foto_type: 'foto', lat_propia: null, lng_propia: null, lat: -74.055, lng: 4.654, ciudad: 'X', visible: true, creado_en: 't1' },
    { id: 'p2', album_id: ALBUM, album_titulo: 'A', foto_url: 'u2', media_title: 'm2', foto_type: 'foto', lat_propia: 4.711, lng_propia: -74.072, lat: 4.711, lng: -74.072, ciudad: 'X', visible: true, creado_en: 't2' }
  ] }]);
  global.__MOCKSQL__ = mMuseoGet.fn;
  var resMuseoGet = makeRes();
  await handler({ method: 'GET', body: {}, query: { tipo: 'museo_recurso', usuario_id: U }, headers: {} }, resMuseoGet);
  var bMuseoGet = resMuseoGet.body || {};
  check('C1: museo_recurso GET 200', resMuseoGet.statusCode === 200);
  check('C2: query emite af.lat AS lat_propia y COALESCE efectivo',
    mMuseoGet.alguna('af.lat AS lat_propia') && mMuseoGet.alguna('COALESCE(af.lat, a.lat) AS lat'));
  check('C3: lat_propia/lng_propia null cuando hereda',
    bMuseoGet.data[0].lat_propia === null && bMuseoGet.data[0].lng_propia === null);
  check('C4: coords_heredadas true sin pin propio', bMuseoGet.data[0].coords_heredadas === true);
  check('C5: lat/lng efectivas heredan del album', bMuseoGet.data[0].lat === -74.055);
  check('C6: lat_propia/coords_heredadas false con pin propio',
    bMuseoGet.data[1].lat_propia === 4.711 && bMuseoGet.data[1].coords_heredadas === false);

  // ============ D. museo_recurso POST editar: coords y quitar_coords ============
  var mEditNoAuth = crearMock([]);
  global.__MOCKSQL__ = mEditNoAuth.fn;
  var resEditNoAuth = makeRes();
  await handler({ method: 'POST', body: { tipo: 'museo_recurso', accion: 'editar', id: REC, quitar_coords: true }, query: {}, headers: {} }, resEditNoAuth);
  check('D1: museo_recurso editar sin sesion -> 401', resEditNoAuth.statusCode === 401);
  check('D2: editar sin sesion no toca la base', mEditNoAuth.queries.length === 0);

  var mEditQuitar = crearMock([
    { test: 'SELECT af.id, af.album_id, af.visible FROM album_fotos af', reply: [{ id: REC, album_id: ALBUM, visible: true }] },
    { test: 'UPDATE album_fotos SET', reply: [{ id: REC, album_id: ALBUM, visible: true }] }
  ]);
  global.__MOCKSQL__ = mEditQuitar.fn;
  var resEditQuitar = makeRes();
  await handler({ method: 'POST', body: { tipo: 'museo_recurso', accion: 'editar', id: REC, quitar_coords: true }, query: {}, headers: authHeaders(U) }, resEditQuitar);
  var qQuitar = mEditQuitar.ultima('UPDATE album_fotos SET');
  check('D3: quitar_coords -> 200', resEditQuitar.statusCode === 200);
  check('D4: quitar_coords -> lat = NULL', !!qQuitar && qQuitar.q.indexOf('lat = NULL') !== -1);
  check('D5: quitar_coords -> lng = NULL', !!qQuitar && qQuitar.q.indexOf('lng = NULL') !== -1);

  var mEditLat = crearMock([
    { test: 'SELECT af.id, af.album_id, af.visible FROM album_fotos af', reply: [{ id: REC, album_id: ALBUM, visible: true }] },
    { test: 'UPDATE album_fotos SET', reply: [{ id: REC, album_id: ALBUM, visible: true }] }
  ]);
  global.__MOCKSQL__ = mEditLat.fn;
  var resEditLat = makeRes();
  await handler({ method: 'POST', body: { tipo: 'museo_recurso', accion: 'editar', id: REC, lat: 4.711, lng: -74.072 }, query: {}, headers: authHeaders(U) }, resEditLat);
  var qLat = mEditLat.ultima('UPDATE album_fotos SET');
  check('D6: lat/lng -> update con lat = $3 y lng = $4',
    !!qLat && qLat.q.indexOf('lat = $3') !== -1 && qLat.q.indexOf('lng = $4') !== -1);
  check('D7: lat/lng -> params con las coords del recurso',
    !!qLat && qLat.p[2] === 4.711 && qLat.p[3] === -74.072);

  // ============ E. mis_guardados_media: carpetas y SCHEMA_NOT_MIGRATED ============
  var mMgOk = crearMock([
    { test: 'FROM media_guardados mg', reply: [
      { fuente: 'album_foto', item_id: 'p1', creado_en: 't', titulo: 'T', media_url: 'u', media_type: 'foto', ciudad: 'X', album_id: ALBUM, destino_slug: null, carpeta_id: CARPETA, carpeta_nombre: 'Viajes' }
    ] },
    { test: 'FROM guardados_carpetas', reply: [{ id: CARPETA, nombre: 'Viajes', orden: 0 }] }
  ]);
  global.__MOCKSQL__ = mMgOk.fn;
  var resMgOk = makeRes();
  await handler({ method: 'GET', body: {}, query: { tipo: 'mis_guardados_media', usuario_id: U }, headers: {} }, resMgOk);
  var bMgOk = resMgOk.body || {};
  check('E1: mis_guardados_media 200', resMgOk.statusCode === 200);
  check('E2: respuesta incluye carpetas', Array.isArray(bMgOk.carpetas) && bMgOk.carpetas.length === 1);
  check('E3: cada bookmark expone carpeta_id', bMgOk.data[0] && bMgOk.data[0].carpeta_id === CARPETA);
  check('E4: query une guardados_carpetas para el nombre',
    mMgOk.alguna('LEFT JOIN guardados_carpetas gc'));

  var mMg42P01 = crearMock([{ test: 'FROM media_guardados mg', reject: { code: '42P01', message: 'relation "guardados_carpetas" does not exist' } }]);
  global.__MOCKSQL__ = mMg42P01.fn;
  var resMg42P01 = makeRes();
  await handler({ method: 'GET', body: {}, query: { tipo: 'mis_guardados_media', usuario_id: U }, headers: {} }, resMg42P01);
  check('E5: 42P01 -> 503 SCHEMA_NOT_MIGRATED (no data:[])',
    resMg42P01.statusCode === 503 && !!(resMg42P01.body && resMg42P01.body.error === 'SCHEMA_NOT_MIGRATED')
    && resMg42P01.body.data === undefined);

  var mMg42703 = crearMock([
    { test: 'FROM media_guardados mg', reply: [] },
    { test: 'FROM guardados_carpetas', reject: { code: '42703', message: 'column does not exist' } }
  ]);
  global.__MOCKSQL__ = mMg42703.fn;
  var resMg42703 = makeRes();
  await handler({ method: 'GET', body: {}, query: { tipo: 'mis_guardados_media', usuario_id: U }, headers: {} }, resMg42703);
  check('E6: 42703 -> 503 SCHEMA_NOT_MIGRATED',
    resMg42703.statusCode === 503 && !!(resMg42703.body && resMg42703.body.error === 'SCHEMA_NOT_MIGRATED'));

  // ============ F. guardados_carpeta: sesion, duplicado, mover, eliminar ============
  var mGcNoAuth = crearMock([]);
  global.__MOCKSQL__ = mGcNoAuth.fn;
  var resGcNoAuth = makeRes();
  await handler({ method: 'POST', body: { tipo: 'guardados_carpeta', accion: 'crear', nombre: 'Viajes' }, query: {}, headers: {} }, resGcNoAuth);
  check('F1: guardados_carpeta sin sesion -> 401', resGcNoAuth.statusCode === 401);
  check('F2: guardados_carpeta sin sesion no toca la base', mGcNoAuth.queries.length === 0);

  var mGcOtro = crearMock([]);
  global.__MOCKSQL__ = mGcOtro.fn;
  var resGcOtro = makeRes();
  await handler({ method: 'POST', body: { tipo: 'guardados_carpeta', usuario_id: U, accion: 'crear', nombre: 'Viajes' }, query: {}, headers: authHeaders(OTRO) }, resGcOtro);
  check('F3: guardados_carpeta con token de otro usuario -> 401', resGcOtro.statusCode === 401);

  var mGcDup = crearMock([{ test: 'INSERT INTO guardados_carpetas', reply: [] }]);
  global.__MOCKSQL__ = mGcDup.fn;
  var resGcDup = makeRes();
  await handler({ method: 'POST', body: { tipo: 'guardados_carpeta', usuario_id: U, accion: 'crear', nombre: 'Viajes' }, query: {}, headers: authHeaders(U) }, resGcDup);
  check('F4: crear duplicado -> 409 CARPETA_DUPLICADA',
    resGcDup.statusCode === 409 && !!(resGcDup.body && resGcDup.body.error === 'CARPETA_DUPLICADA'));
  check('F5: crear usa ON CONFLICT DO NOTHING', mGcDup.alguna('ON CONFLICT DO NOTHING'));

  var mGcCrear = crearMock([
    { test: 'INSERT INTO guardados_carpetas', reply: [{ id: CARPETA }] },
    { test: 'SELECT id::text AS id, nombre, orden FROM guardados_carpetas', reply: [{ id: CARPETA, nombre: 'Viajes', orden: 0 }] }
  ]);
  global.__MOCKSQL__ = mGcCrear.fn;
  var resGcCrear = makeRes();
  await handler({ method: 'POST', body: { tipo: 'guardados_carpeta', usuario_id: U, accion: 'crear', nombre: 'Viajes' }, query: {}, headers: authHeaders(U) }, resGcCrear);
  check('F6: crear ok -> 201 con la carpeta',
    resGcCrear.statusCode === 201 && !!(resGcCrear.body && resGcCrear.body.carpeta && resGcCrear.body.carpeta.id === CARPETA));

  var mGcMoverA = crearMock([{ test: 'SELECT id FROM guardados_carpetas', reply: [] }]);
  global.__MOCKSQL__ = mGcMoverA.fn;
  var resGcMoverA = makeRes();
  await handler({ method: 'POST', body: { tipo: 'guardados_carpeta', usuario_id: U, accion: 'mover', fuente: 'album_foto', item_id: 'p1', carpeta_id: CARPETA }, query: {}, headers: authHeaders(U) }, resGcMoverA);
  check('F7: mover a carpeta ajena -> 404 CARPETA_NO_ENCONTRADA',
    resGcMoverA.statusCode === 404 && !!(resGcMoverA.body && resGcMoverA.body.error === 'CARPETA_NO_ENCONTRADA'));
  check('F8: mover con carpeta ajena no toca media_guardados', !mGcMoverA.alguna('UPDATE media_guardados'));

  var mGcMoverB = crearMock([
    { test: 'SELECT id FROM guardados_carpetas', reply: [{ id: CARPETA }] },
    { test: 'UPDATE media_guardados SET carpeta_id', reply: [] }
  ]);
  global.__MOCKSQL__ = mGcMoverB.fn;
  var resGcMoverB = makeRes();
  await handler({ method: 'POST', body: { tipo: 'guardados_carpeta', usuario_id: U, accion: 'mover', fuente: 'album_foto', item_id: 'p1', carpeta_id: CARPETA }, query: {}, headers: authHeaders(U) }, resGcMoverB);
  check('F9: doble pertenencia exige el bookmark propio -> 404 GUARDADO_NO_ENCONTRADO',
    resGcMoverB.statusCode === 404 && !!(resGcMoverB.body && resGcMoverB.body.error === 'GUARDADO_NO_ENCONTRADO'));
  var qMover = mGcMoverB.ultima('UPDATE media_guardados SET carpeta_id');
  check('F10: mover filtra por usuario_id + fuente + item_id activo',
    !!qMover && qMover.q.indexOf('usuario_id = $2::uuid') !== -1
    && qMover.q.indexOf('fuente = $3') !== -1 && qMover.q.indexOf('item_id = $4') !== -1
    && qMover.q.indexOf('activo = true') !== -1);

  var mGcDel = crearMock([
    { test: 'UPDATE guardados_carpetas SET activo = false', reply: [{ id: CARPETA }] },
    { test: 'UPDATE media_guardados SET carpeta_id = NULL', reply: [] }
  ]);
  global.__MOCKSQL__ = mGcDel.fn;
  var resGcDel = makeRes();
  await handler({ method: 'POST', body: { tipo: 'guardados_carpeta', usuario_id: U, accion: 'eliminar', carpeta_id: CARPETA }, query: {}, headers: authHeaders(U) }, resGcDel);
  check('F11: eliminar -> 200 eliminada true',
    resGcDel.statusCode === 200 && !!(resGcDel.body && resGcDel.body.eliminada === true));
  check('F12: eliminar reasigna carpeta_id = NULL y NO borra bookmarks',
    mGcDel.alguna('UPDATE media_guardados SET carpeta_id = NULL')
    && !mGcDel.alguna('DELETE FROM media_guardados'));

  var mGc23505 = crearMock([{ test: 'INSERT INTO guardados_carpetas', reject: { code: '23505', message: 'duplicate key' } }]);
  global.__MOCKSQL__ = mGc23505.fn;
  var resGc23505 = makeRes();
  await handler({ method: 'POST', body: { tipo: 'guardados_carpeta', usuario_id: U, accion: 'crear', nombre: 'Viajes' }, query: {}, headers: authHeaders(U) }, resGc23505);
  check('F13: 23505 en crear -> 409 CARPETA_DUPLICADA',
    resGc23505.statusCode === 409 && !!(resGc23505.body && resGc23505.body.error === 'CARPETA_DUPLICADA'));

  // ============ G. Estructura estatica del API ============
  check('G1: rama multimedia_mapa presente', SRC.indexOf("tipo === 'multimedia_mapa'") !== -1);
  check('G2: scope=mio exige verificarSesion',
    /mmScopeMio[\s\S]{0,300}verificarSesion\(req\)/.test(SRC));
  check('G3: scope=mio sin sesion responde SESION_REQUERIDA',
    SRC.indexOf("error: 'SESION_REQUERIDA'") !== -1);
  check('G4: rama museo_recurso GET presente', SRC.indexOf("tipo === 'museo_recurso'") !== -1);
  check('G5: museo_recurso GET expone lat_propia', SRC.indexOf('af.lat AS lat_propia') !== -1);
  check('G6: museo_recurso GET expone coords_heredadas', SRC.indexOf('coords_heredadas') !== -1);
  check('G7: museo_recurso POST editar con quitar_coords -> NULL',
    /mrQuitarCoords[\s\S]{0,200}lat = NULL/.test(SRC));
  check('G8: rama mis_guardados_media presente', SRC.indexOf("tipo === 'mis_guardados_media'") !== -1);
  check('G9: mis_guardados_media responde SCHEMA_NOT_MIGRATED',
    /tipo === 'mis_guardados_media'[\s\S]{0,4600}error: 'SCHEMA_NOT_MIGRATED'/.test(SRC));
  check('G10: rama guardados_carpeta presente', SRC.indexOf("tipo2 === 'guardados_carpeta'") !== -1);
  check('G11: guardados_carpeta elimina reasignando carpeta_id NULL',
    SRC.indexOf('UPDATE media_guardados SET carpeta_id = NULL') !== -1);
  check('G12: helper esEsquemaFaltante cubre 42P01/42703',
    /function esEsquemaFaltante[\s\S]{0,120}42P01[\s\S]{0,40}42703/.test(SRC));

  // ============ H. ASCII-safety ============
  var bInt = fs.readFileSync(path.join(__dirname, '..', 'api/interacciones.js'));
  check('H1: api/interacciones.js 0 bytes > 127', asciiSafeBytes(bInt));
  check('H2: api/interacciones.js 0 backticks', !tieneBacktick(SRC));
  var propio = readSrc('scripts/smoke_029_030_coords_carpetas.js');
  check('H3: smoke 029/030 ASCII-safe', asciiSafeBytes(Buffer.from(propio, 'utf8')));
  check('H4: smoke 029/030 0 backticks', !tieneBacktick(propio));
}

function finish() {
  console.log('');
  console.log('=== SMOKE 029/030 COORDS + CARPETAS ===');
  console.log('Checks: ' + (passed + failed) + ' total, ' + passed + ' PASS, ' + failed + ' FAIL');
  if (failed === 0) console.log('SMOKE 029/030 COORDS + CARPETAS: OK');
  else { console.log('SMOKE 029/030 COORDS + CARPETAS: ' + failed + ' FALLO(S)'); process.exitCode = 1; }
}

run().then(finish).catch(function(err) {
  console.log('FAIL - smoke 029/030 lanzo error: ' + (err && err.message));
  process.exitCode = 1;
  finish();
});
