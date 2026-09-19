// scripts/smoke_036_media_unificada.js
// Smoke offline (sin red, sin DB) de ADR-036 B: media unificada
// (media_votos / media_comentarios / media_comentario_likes) y sus alias
// legacy en api/interacciones.js v19. Carga el handler REAL en un sandbox
// vm con @neondatabase/serverless redirigido a un mock en memoria
// (global.__MOCKSQL__). Prueba los helpers puros (resolverMediaItem,
// aplicarMediaVoto, contarMedia, construirArbolComentarios,
// contarCompartidosUsuario) y las ramas GET/POST nuevas.
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

// --- cargador del api en sandbox vm ---------------------------------
var EXPONES = ['resolverMediaItem', 'aplicarMediaVoto', 'contarMedia',
  'construirArbolComentarios', 'contarCompartidosUsuario', 'MEDIA_FUENTES', 'MEDIA_ITEM_RE'];

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
  var inject = '';
  EXPONES.forEach(function(n) { inject += '\nmodule.exports.' + n + ' = ' + n + ';'; });
  vm.runInContext(code + inject, sandbox, { filename: fileRel });
  return sandbox.module.exports;
}

function crearMock(matchers) {
  var state = { queries: [] };
  state.fn = function(q, p) {
    var sql = String(q);
    state.queries.push({ q: sql, p: p || [] });
    for (var i = 0; i < matchers.length; i++) {
      var m = matchers[i];
      var hit = (m.test instanceof RegExp) ? m.test.test(sql) : sql.indexOf(m.test) !== -1;
      if (hit) return Promise.resolve((typeof m.reply === 'function') ? m.reply(p || [], sql) : m.reply);
    }
    return Promise.resolve([]);
  };
  state.cuenta = function(sub) { return state.queries.filter(function(x) { return x.q.indexOf(sub) !== -1; }).length; };
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
var MOD = cargarApi('api/interacciones.js');
var handler = MOD;
var U = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

async function run() {

  // ============ A. resolverMediaItem ============
  var mCu = crearMock([{ test: 'FROM destinos_fotos WHERE id::text', reply: [{ id: 'f1', destino_id: 'd1' }] }]);
  var rCu = await MOD.resolverMediaItem(mCu.fn, 'curada', 'f1');
  check('A1: curada ok con destinoId', rCu.ok === true && rCu.destinoId === 'd1' && rCu.autorId === null);

  var mVj = crearMock([{ test: 'FROM interacciones WHERE id::text', reply: [{ id: 'v1', autor_id: 'a1', destino_id: 'd1' }] }]);
  var rVj = await MOD.resolverMediaItem(mVj.fn, 'viajero_foto', 'v1');
  check('A2: viajero_foto ok con autorId', rVj.ok === true && rVj.autorId === 'a1');

  var mAl = crearMock([{ test: 'FROM album_fotos af JOIN albumes a', reply: [{ id: 'p1', autor_id: 'u9', album_dueno_id: 'u8' }] }]);
  var rAl = await MOD.resolverMediaItem(mAl.fn, 'album_foto', 'p1');
  check('A3: album_foto ok con albumDuenoId', rAl.ok === true && rAl.albumDuenoId === 'u8');

  var mNo = crearMock([{ test: 'FROM destinos_fotos WHERE id::text', reply: [] }]);
  var rNo = await MOD.resolverMediaItem(mNo.fn, 'curada', 'f1');
  check('A4: item inexistente -> ok false', rNo.ok === false);

  var mBad = crearMock([]);
  var rBad = await MOD.resolverMediaItem(mBad.fn, 'blog', 'f1');
  check('A5: fuente invalida -> ok false', rBad.ok === false);
  var rBad2 = await MOD.resolverMediaItem(mBad.fn, 'curada', 'no valido!');
  check('A6: item_id invalido -> ok false sin SQL', rBad2.ok === false && mBad.queries.length === 0);
  check('A7: MEDIA_FUENTES tiene 3 canonicas', MOD.MEDIA_FUENTES.length === 3);

  // ============ B. aplicarMediaVoto ============
  var mLike = crearMock([
    { test: 'SELECT activo FROM media_votos WHERE usuario_id', reply: [] },
    { test: /SELECT COUNT\(\*\)::int AS n FROM media_votos WHERE usuario_id/, reply: [{ n: 0 }] },
    { test: /SELECT COUNT\(\*\)::int AS n FROM media_votos WHERE fuente/, reply: [{ n: 1 }] },
    { test: 'INSERT INTO media_votos', reply: [] },
    { test: 'UPDATE usuarios SET xp_total', reply: [] }
  ]);
  var rLike = await MOD.aplicarMediaVoto(mLike.fn, U, 'curada', 'f1', 'like');
  check('B1: like nuevo xp 5', rLike.nuevo === true && rLike.xp === 5);
  check('B2: like nuevo votos 1', rLike.votos === 1);
  check('B3: like nuevo actualiza usuarios +5', mLike.alguna('UPDATE usuarios SET xp_total'));

  var mDup = crearMock([
    { test: 'SELECT activo FROM media_votos WHERE usuario_id', reply: [{ activo: true }] },
    { test: /SELECT COUNT\(\*\)::int AS n FROM media_votos WHERE fuente/, reply: [{ n: 3 }] }
  ]);
  var rDup = await MOD.aplicarMediaVoto(mDup.fn, U, 'curada', 'f1', 'like');
  check('B4: like duplicado -> duplicado true sin insert', rDup.duplicado === true && !mDup.alguna('INSERT INTO media_votos'));
  check('B5: like duplicado votos 3', rDup.votos === 3);

  var mUn = crearMock([
    { test: 'SELECT activo FROM media_votos WHERE usuario_id', reply: [{ activo: true }] },
    { test: 'UPDATE media_votos SET activo=false', reply: [] },
    { test: /SELECT COUNT\(\*\)::int AS n FROM media_votos WHERE fuente/, reply: [{ n: 2 }] }
  ]);
  var rUn = await MOD.aplicarMediaVoto(mUn.fn, U, 'curada', 'f1', 'unlike');
  check('B6: unlike desactiva (soft-delete)', mUn.alguna('UPDATE media_votos SET activo=false') && rUn.xp === 0);

  var mRe = crearMock([
    { test: 'SELECT activo FROM media_votos WHERE usuario_id', reply: [{ activo: false }] },
    { test: /SELECT COUNT\(\*\)::int AS n FROM media_votos WHERE usuario_id/, reply: [{ n: 0 }] },
    { test: 'UPDATE media_votos SET activo=true', reply: [] },
    { test: /SELECT COUNT\(\*\)::int AS n FROM media_votos WHERE fuente/, reply: [{ n: 3 }] }
  ]);
  var rRe = await MOD.aplicarMediaVoto(mRe.fn, U, 'curada', 'f1', 'like');
  check('B7: reactivar tras unlike NO re-paga XP', rRe.reactivado === true && rRe.xp === 0
    && !mRe.alguna('INSERT INTO media_votos') && !mRe.alguna('UPDATE usuarios SET xp_total'));

  var mTop = crearMock([
    { test: 'SELECT activo FROM media_votos WHERE usuario_id', reply: [] },
    { test: /SELECT COUNT\(\*\)::int AS n FROM media_votos WHERE usuario_id/, reply: [{ n: 20 }] }
  ]);
  var rTop = await MOD.aplicarMediaVoto(mTop.fn, U, 'curada', 'f1', 'like');
  check('B8: tope 20 votos/24h -> tope true sin insert', rTop.tope === true && !mTop.alguna('INSERT INTO media_votos'));

  // ============ C. contarMedia ============
  var mCont = crearMock([
    { test: /FROM media_votos WHERE fuente/, reply: [{ n: 4 }] },
    { test: /FROM media_comentarios WHERE fuente/, reply: [{ n: 2 }] }
  ]);
  var rCont = await MOD.contarMedia(mCont.fn, 'viajero_foto', 'v1');
  check('C1: contarMedia votos 4 comentarios 2', rCont.votos === 4 && rCont.comentarios === 2);

  // ============ D. construirArbolComentarios ============
  var rowsArbol = [
    { id: 'c1', foto_id: 'f1', parent_id: null, usuario_id: 'u1', activo: true, texto: 'a', creado_en: 't1', likes: 2, ya_like: true, autor_nombre: 'A', autor_avatar: '' },
    { id: 'c2', foto_id: 'f1', parent_id: 'c1', usuario_id: 'u2', activo: false, texto: 'b', creado_en: 't2', likes: 0, ya_like: false, autor_nombre: 'B', autor_avatar: '' },
    { id: 'c3', foto_id: 'f1', parent_id: 'c2', usuario_id: 'u3', activo: true, texto: 'c', creado_en: 't3', likes: 0, ya_like: false, autor_nombre: 'C', autor_avatar: '' }
  ];
  var arbol = MOD.construirArbolComentarios(rowsArbol, 'u1');
  check('D1: total cuenta solo activos', arbol.total === 2);
  check('D2: raiz unica', arbol.data.length === 1);
  check('D3: tombstone conserva descendencia', arbol.data[0].respuestas.length === 1
    && arbol.data[0].respuestas[0].eliminado === true
    && arbol.data[0].respuestas[0].texto === null
    && arbol.data[0].respuestas[0].autor === null
    && arbol.data[0].respuestas[0].respuestas.length === 1);
  check('D4: nivel del nieto es 2', arbol.data[0].respuestas[0].respuestas[0].nivel === 2);
  check('D5: es_mio y ya_like de la raiz', arbol.data[0].es_mio === true && arbol.data[0].ya_like === true && arbol.data[0].likes === 2);
  var rowsMuertas = [
    { id: 'x1', foto_id: 'f1', parent_id: null, usuario_id: 'u1', activo: false, texto: 'x', creado_en: 't', likes: 0, ya_like: false, autor_nombre: 'A', autor_avatar: '' }
  ];
  var arbolMuerto = MOD.construirArbolComentarios(rowsMuertas, null);
  check('D6: rama inactiva sin hijos se descarta', arbolMuerto.data.length === 0);

  // ============ E. contarCompartidosUsuario ============
  var mComp = crearMock([{ test: 'FROM media_compartidos', reply: [{ n: 7 }] }]);
  var nComp = await MOD.contarCompartidosUsuario(mComp.fn, U);
  check('E1: contarCompartidosUsuario devuelve 7', nComp === 7);
  var nDeg = await MOD.contarCompartidosUsuario(function() { return Promise.reject({ code: '42P01' }); }, U);
  check('E2: 42P01 degrada a 0 (con warn)', nDeg === 0);

  // ============ F. media_voto (handler real) ============
  var mPost = crearMock([
    { test: 'FROM destinos_fotos WHERE id::text', reply: [{ id: 'f1', destino_id: 'd1' }] },
    { test: 'SELECT activo FROM media_votos WHERE usuario_id', reply: [] },
    { test: /SELECT COUNT\(\*\)::int AS n FROM media_votos WHERE usuario_id/, reply: [{ n: 0 }] },
    { test: /SELECT COUNT\(\*\)::int AS n FROM media_votos WHERE fuente/, reply: [{ n: 1 }] },
    { test: 'INSERT INTO media_votos', reply: [] },
    { test: 'UPDATE usuarios SET xp_total', reply: [] }
  ]);
  // F0: sin Authorization -> 401 SESION_REQUERIDA (no toca la base).
  var mNoAuth = crearMock([]);
  global.__MOCKSQL__ = mNoAuth.fn;
  var resNoAuth = makeRes();
  await handler({ method: 'POST', body: { tipo: 'media_voto', usuario_id: U, fuente: 'curada', item_id: 'f1', accion: 'like' }, query: {}, headers: {} }, resNoAuth);
  check('F0a: media_voto sin Authorization -> 401', resNoAuth.statusCode === 401);
  check('F0b: media_voto 401 SESION_*', !!(resNoAuth.body && /^SESION_/.test(resNoAuth.body.error)));
  check('F0c: media_voto 401 no toca la base', mNoAuth.queries.length === 0);
  // F0d: JWT de OTRO usuario -> 401.
  var mOtro = crearMock([]);
  global.__MOCKSQL__ = mOtro.fn;
  var resOtro = makeRes();
  await handler({ method: 'POST', body: { tipo: 'media_voto', usuario_id: U, fuente: 'curada', item_id: 'f1', accion: 'like' }, query: {}, headers: authHeaders('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb') }, resOtro);
  check('F0d: media_voto JWT de otro usuario -> 401', resOtro.statusCode === 401
    && !!(resOtro.body && /^SESION_/.test(resOtro.body.error)));

  global.__MOCKSQL__ = mPost.fn;
  var resPost = makeRes();
  await handler({ method: 'POST', body: { tipo: 'media_voto', usuario_id: U, fuente: 'curada', item_id: 'f1', accion: 'like' }, query: {}, headers: authHeaders(U) }, resPost);
  var bPost = resPost.body || {};
  check('F1: media_voto like -> 200', resPost.statusCode === 200);
  check('F2: media_voto xp 5 votos 1', bPost.xp === 5 && bPost.votos === 1 && bPost.ya_votado === true);

  var mDup2 = crearMock([
    { test: 'FROM destinos_fotos WHERE id::text', reply: [{ id: 'f1', destino_id: 'd1' }] },
    { test: 'SELECT activo FROM media_votos WHERE usuario_id', reply: [{ activo: true }] }
  ]);
  global.__MOCKSQL__ = mDup2.fn;
  var resDup = makeRes();
  await handler({ method: 'POST', body: { tipo: 'media_voto', usuario_id: U, fuente: 'curada', item_id: 'f1', accion: 'like' }, query: {}, headers: authHeaders(U) }, resDup);
  check('F3: media_voto duplicado -> 409', resDup.statusCode === 409);

  var m404 = crearMock([{ test: 'FROM destinos_fotos WHERE id::text', reply: [] }]);
  global.__MOCKSQL__ = m404.fn;
  var res404 = makeRes();
  await handler({ method: 'POST', body: { tipo: 'media_voto', usuario_id: U, fuente: 'curada', item_id: 'nope', accion: 'like' }, query: {}, headers: authHeaders(U) }, res404);
  check('F4: media_voto item inexistente -> 404', res404.statusCode === 404);

  var mSelf = crearMock([{ test: 'FROM interacciones WHERE id::text', reply: [{ id: 'v1', autor_id: U, destino_id: 'd1' }] }]);
  global.__MOCKSQL__ = mSelf.fn;
  var resSelf = makeRes();
  await handler({ method: 'POST', body: { tipo: 'media_voto', usuario_id: U, fuente: 'viajero_foto', item_id: 'v1', accion: 'like' }, query: {}, headers: authHeaders(U) }, resSelf);
  check('F5: media_voto self-vote -> 403', resSelf.statusCode === 403);

  // ============ G. media_comentar (handler real) ============
  var mCom = crearMock([
    { test: 'FROM destinos_fotos WHERE id::text', reply: [{ id: 'f1', destino_id: 'd1' }] },
    { test: 'FROM usuarios WHERE id=$1 LIMIT 1', reply: [{ id: U, nombre: 'Yo', avatar: '' }] },
    { test: /SELECT COUNT\(\*\)::int AS n FROM media_comentarios WHERE usuario_id/, reply: [{ n: 0 }] },
    { test: 'INSERT INTO media_comentarios', reply: [{ id: 'm1', usuario_id: U, fuente: 'curada', item_id: 'f1', parent_id: null, texto: 'hola', activo: true, creado_en: 't1' }] },
    { test: 'SELECT progreso_album FROM usuarios', reply: [{ progreso_album: {} }] },
    { test: 'UPDATE usuarios SET xp_total', reply: [] }
  ]);
  // G0: sin Authorization -> 401 (no toca la base).
  var mComNoAuth = crearMock([]);
  global.__MOCKSQL__ = mComNoAuth.fn;
  var resComNoAuth = makeRes();
  await handler({ method: 'POST', body: { tipo: 'media_comentar', usuario_id: U, fuente: 'curada', item_id: 'f1', texto: 'hola' }, query: {}, headers: {} }, resComNoAuth);
  check('G0a: media_comentar sin Authorization -> 401', resComNoAuth.statusCode === 401);
  check('G0b: media_comentar 401 SESION_*', !!(resComNoAuth.body && /^SESION_/.test(resComNoAuth.body.error)));
  check('G0c: media_comentar 401 no toca la base', mComNoAuth.queries.length === 0);

  global.__MOCKSQL__ = mCom.fn;
  var resCom = makeRes();
  await handler({ method: 'POST', body: { tipo: 'media_comentar', usuario_id: U, fuente: 'curada', item_id: 'f1', texto: 'hola' }, query: {}, headers: authHeaders(U) }, resCom);
  var bCom = resCom.body || {};
  check('G1: media_comentar -> 201', resCom.statusCode === 201);
  check('G2: media_comentar shape comentario', !!(bCom.comentario && bCom.comentario.foto_id === 'f1'
    && bCom.comentario.texto === 'hola' && bCom.comentario.eliminado === false));
  check('G3: media_comentar xp 2', bCom.xp === 2);

  // ============ H. media_interacciones (GET) ============
  var mGet = crearMock([
    { test: 'FROM destinos_fotos WHERE id::text', reply: [{ id: 'f1', destino_id: 'd1' }] },
    { test: /FROM media_votos WHERE fuente/, reply: [{ n: 4 }] },
    { test: /FROM media_comentarios WHERE fuente/, reply: [{ n: 2 }] },
    { test: 'FROM media_votos WHERE usuario_id', reply: [{ uno: 1 }] },
    { test: 'FROM media_guardados WHERE usuario_id', reply: [] }
  ]);
  global.__MOCKSQL__ = mGet.fn;
  var resGet = makeRes();
  await handler({ method: 'GET', body: {}, query: { tipo: 'media_interacciones', fuente: 'curada', item_id: 'f1', usuario_id: U }, headers: {} }, resGet);
  var bGet = resGet.body || {};
  check('H1: media_interacciones sin auth (publico) -> 200', resGet.statusCode === 200);
  check('H2: media_interacciones votos/comentarios', bGet.votos === 4 && bGet.comentarios === 2);
  check('H3: media_interacciones ya_votado real', bGet.ya_votado === true && bGet.ya_guardado === false);

  // ============ I. media_comentarios (GET) ============
  var mArbolGet = crearMock([
    { test: 'FROM destinos_fotos WHERE id::text', reply: [{ id: 'f1', destino_id: 'd1' }] },
    { test: 'FROM media_comentarios mc', reply: [
      { id: 'c1', foto_id: 'f1', parent_id: null, usuario_id: 'u1', activo: true, texto: 'a', creado_en: 't1', likes: 1, ya_like: false, autor_nombre: 'A', autor_avatar: '' },
      { id: 'c2', foto_id: 'f1', parent_id: 'c1', usuario_id: 'u2', activo: true, texto: 'b', creado_en: 't2', likes: 0, ya_like: false, autor_nombre: 'B', autor_avatar: '' }
    ] }
  ]);
  global.__MOCKSQL__ = mArbolGet.fn;
  var resArbolGet = makeRes();
  await handler({ method: 'GET', body: {}, query: { tipo: 'media_comentarios', fuente: 'curada', item_id: 'f1', usuario_id: U }, headers: {} }, resArbolGet);
  var bArbolGet = resArbolGet.body || {};
  check('I1: media_comentarios sin auth (publico) -> 200', resArbolGet.statusCode === 200);
  check('I2: media_comentarios shape arbol', bArbolGet.fuente === 'curada' && bArbolGet.item_id === 'f1'
    && bArbolGet.total === 2 && Array.isArray(bArbolGet.data) && Array.isArray(bArbolGet.flat));
  check('I3: media_comentarios anida respuesta', (bArbolGet.data[0].respuestas || []).length === 1);

  // ============ J. Estructura estatica ============
  check('J1: ruta media_voto presente', SRC.indexOf("tipo2 === 'media_voto'") !== -1);
  check('J2: ruta media_comentar presente', SRC.indexOf("tipo2 === 'media_comentar'") !== -1);
  check('J3: ruta media_interacciones presente', SRC.indexOf("tipo === 'media_interacciones'") !== -1);
  check('J4: ruta media_comentarios presente', SRC.indexOf("tipo === 'media_comentarios'") !== -1);
  check('J5: foto_voto delega en registrarVotoMedia viajero_foto',
    SRC.indexOf("registrarVotoMedia(sql, usuarioId2, 'viajero_foto'") !== -1);
  check('J6: album_voto delega en registrarVotoMedia album_foto',
    SRC.indexOf("registrarVotoMedia(sql, usuarioId2, 'album_foto'") !== -1);
  check('J7: comentarios_foto lee media_comentarios', /tipo === 'comentarios_foto'[\s\S]{0,1500}FROM media_comentarios mc/.test(SRC));
  check('J8: contarComentarioSafe lee media_comentarios', /function contarComentarioSafe[\s\S]{0,400}FROM media_comentarios mc/.test(SRC));
  check('J9: comentario_voto usa media_comentario_likes', /tipo2 === 'comentario_voto'[\s\S]{0,2000}media_comentario_likes/.test(SRC));
  check('J10: comentario_eliminar usa media_comentarios', /tipo2 === 'comentario_eliminar'[\s\S]{0,2000}media_comentarios/.test(SRC));
  check('J11: guardar_media admite fuente curada', SRC.indexOf("'album', 'album_foto', 'viajero_foto', 'curada'") !== -1);
  check('J12: galeria_destino usa cargarMetricasMedia', SRC.indexOf('cargarMetricasMedia(sql, gdUsuarioId') !== -1);
  check('J13: galeria items v2 marca fuente y tipo_voto media', SRC.indexOf("fuente: 'curada'") !== -1
    && SRC.indexOf("tipo_voto: 'media'") !== -1);
  check('J14: galeria lee votos de album desde media_votos (no album_votos)',
    SRC.indexOf('FROM media_votos mv WHERE mv.fuente') !== -1);
  check('J15: rama foto_voto ya no inserta en interacciones con dims',
    SRC.indexOf("jsonb_build_object('voto_foto_id'") === -1);

  // ============ J-auth. Endurecimiento de sesion (QA ADR-036) ============
  check('J30: media_voto exige validarSesion',
    /tipo2 === 'media_voto'[\s\S]{0,700}validarSesion\(req, usuarioId2\)/.test(SRC));
  check('J31: media_comentar exige validarSesion',
    /tipo2 === 'media_comentar'[\s\S]{0,700}validarSesion\(req, usuarioId2\)/.test(SRC));
  check('J32: GET media_interacciones no valida sesion (publico)',
    !/tipo === 'media_interacciones'[\s\S]{0,900}validarSesion\(/.test(SRC));
  check('J33: GET media_comentarios no valida sesion (publico)',
    !/tipo === 'media_comentarios'[\s\S]{0,900}validarSesion\(/.test(SRC));
  check('J34: alias legacy sin validarSesion (trust usuario_id)',
    !/tipo2 === 'album_voto'[\s\S]{0,500}validarSesion\(req/.test(SRC)
    && !/tipo2 === 'foto_voto'[\s\S]{0,500}validarSesion\(req/.test(SRC)
    && !/tipo2 === 'comentario_foto'[\s\S]{0,500}validarSesion\(req/.test(SRC)
    && !/tipo2 === 'guardar_media'[\s\S]{0,500}validarSesion\(req/.test(SRC));
  check('J35: deuda BUG-061 documentada en los 4 alias/guardado',
    (SRC.match(/DEUDA \(BUG-061\)/g) || []).length >= 4);
  check('J36: compartir tambien valida sesion',
    /tipo2 === 'compartir'[\s\S]{0,600}validarSesion\(req, usuarioId2\)/.test(SRC));

  // ============ J-bis. Migracion de lectores legacy ============
  // Cero referencias FUNCIONALES a las tablas legacy (las menciones en
  // comentarios no cuentan: se buscan patrones SQL reales).
  function sinLecturas(patrones) {
    return patrones.every(function(p) { return SRC.indexOf(p) === -1; });
  }
  check('J16: sin lecturas funcionales de album_votos',
    sinLecturas(['FROM album_votos', 'JOIN album_votos']));
  check('J17: sin lecturas funcionales de album_comentarios',
    sinLecturas(['FROM album_comentarios', 'JOIN album_comentarios']));
  check('J18: sin lecturas funcionales de album_comentario_votos',
    sinLecturas(['FROM album_comentario_votos', 'JOIN album_comentario_votos']));
  check('J19: album_detalle lee votos de media_votos',
    /tipo === 'album_detalle'[\s\S]{0,2500}FROM media_votos mv/.test(SRC));
  check('J20: fotos_top lee votos de media_votos',
    /tipo === 'fotos_top'[\s\S]{0,900}FROM media_votos mv/.test(SRC));
  check('J21: mi_feed_fotos lee votos de media_votos',
    /tipo === 'mi_feed_fotos'[\s\S]{0,2400}FROM media_votos mv/.test(SRC));
  check('J22: mis_fotos lee votos de media_votos',
    /tipo === 'mis_fotos'[\s\S]{0,1500}FROM media_votos mv/.test(SRC));
  check('J23: tipo fotos (viajeros) lee votos de media_votos',
    /tipo === 'fotos' && destinoId[\s\S]{0,900}FROM media_votos mv/.test(SRC));
  check('J24: multimedia_mapa lee votos de media_votos',
    /tipo === 'multimedia_mapa'[\s\S]{0,9000}FROM media_votos mv/.test(SRC));
  check('J25: comentarios_recientes lee media_comentarios',
    /tipo === 'comentarios_recientes'[\s\S]{0,1200}FROM media_comentarios mc/.test(SRC));
  check('J26: bono cur_datos cuenta media_comentarios',
    SRC.indexOf('FROM media_comentarios mc JOIN album_fotos af') !== -1);
  check('J27: bono art_grafica cuenta media_votos',
    SRC.indexOf('FROM media_votos mv JOIN album_fotos af') !== -1);
  check('J28: sendero audiovisual cuenta media_votos',
    SRC.indexOf('FROM media_votos mv WHERE mv.usuario_id=$1 AND mv.fuente') !== -1);
  check('J29: misiones/logros de album cuentan media_votos',
    /mis_favorito_del_pueblo[\s\S]{0,600}FROM media_votos mv/.test(SRC)
    && /logr_favorito_comunidad[\s\S]{0,600}FROM media_votos mv/.test(SRC));

  // ============ L. mis_guardados_media: casts uuid->text (anti R1) ============
  check('L1: mis_guardados_media castea a.id::text',
    SRC.indexOf('JOIN albumes a ON a.id::text = mg.item_id') !== -1);
  check('L2: mis_guardados_media castea af.id::text',
    SRC.indexOf('JOIN album_fotos af ON af.id::text = mg.item_id') !== -1);
  check('L3: mis_guardados_media castea i.id::text',
    SRC.indexOf('JOIN interacciones i ON i.id::text = mg.item_id') !== -1);
  check('L4: mis_guardados_media castea df.id::text (rama curada)',
    SRC.indexOf('JOIN destinos_fotos df ON df.id::text = mg.item_id') !== -1);
  check('L5: sin joins uuid=text sin cast en mis_guardados_media',
    !/ON a\.id = mg\.item_id|ON af\.id = mg\.item_id|ON i\.id = mg\.item_id/.test(SRC));

  // ============ K. ASCII-safety ============
  var bInt = fs.readFileSync(path.join(__dirname, '..', 'api/interacciones.js'));
  check('K1: api/interacciones.js 0 bytes > 127', asciiSafeBytes(bInt));
  check('K2: api/interacciones.js 0 backticks', !tieneBacktick(SRC));
  var propio = readSrc('scripts/smoke_036_media_unificada.js');
  check('K3: smoke 036 media ASCII-safe', asciiSafeBytes(Buffer.from(propio, 'utf8')));
  check('K4: smoke 036 media 0 backticks', !tieneBacktick(propio));
}

function finish() {
  console.log('');
  console.log('=== SMOKE 036 MEDIA UNIFICADA ===');
  console.log('Checks: ' + (passed + failed) + ' total, ' + passed + ' PASS, ' + failed + ' FAIL');
  if (failed === 0) console.log('SMOKE 036 MEDIA UNIFICADA: OK');
  else { console.log('SMOKE 036 MEDIA UNIFICADA: ' + failed + ' FALLO(S)'); process.exitCode = 1; }
}

run().then(finish).catch(function(err) {
  console.log('FAIL - smoke 036 media lanzo error: ' + (err && err.message));
  process.exitCode = 1;
  finish();
});
