// scripts/smoke_regalias_bono.js
// Gate offline del "Bono de referido" (migracion 036) y de las "Regalias
// pasivas" (migracion 037) sobre el handler REAL de api/interacciones.js
// (sandbox vm + @neondatabase/serverless redirigido a un fake en memoria,
// sin red ni BD, via global.__MOCKSQL__).
//
// Cubre:
//   1. aplicarAmuletoX2 con multiplicador_xp_hasta futuro -> doubled true
//      y NO consume usos.
//   2. aplicarAmuletoX2 con multiplicador_xp_hasta pasado y usos=2 ->
//      doubled true y consume a 1.
//   3. acumularRegalia: autor != actor -> UPSERT; autor == actor -> no-op.
//   4. POST reclamar_bonus_referido: 403 SIN_REFERIDO / 409 BONO_YA_RECLAMADO
//      / 200 ok / 400 clave invalida.
//   5. POST reclamar_regalias: pendiente > 0 -> 200 xp_otorgado; sin
//      pendiente -> xp_otorgado 0.
//   6. Degradacion: si el mock no reconoce la query de regalias, no lanza.
//   7. GET bonus_referido / GET mis_regalias.
//   8. Estaticos de las migraciones 036/037 + wiring + ASCII-safety.
//
// ASCII-safe (ADR-002), CommonJS (BUG-001), 0 backticks.
// Run: node scripts/smoke_regalias_bono.js
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
function cargarApi(fileRel, expone) {
  var fakeNeon = {
    neon: function() {
      return function(q, p) {
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
  var inject = '';
  (expone || []).forEach(function(n) { inject += '\nmodule.exports.' + n + ' = ' + n + ';'; });
  vm.runInContext(src + inject, sandbox, { filename: fileRel });
  return sandbox.module.exports;
}

var M = cargarApi('api/interacciones.js',
  ['aplicarAmuletoX2', 'acumularRegalia', 'resolverAutorMedia', 'resolverTituloRegalia', 'REGALIA_PCT']);
var handler = M;
var aplicarAmuletoX2 = M.aplicarAmuletoX2;
var acumularRegalia = M.acumularRegalia;
var resolverAutorMedia = M.resolverAutorMedia;
var REGALIA_PCT = M.REGALIA_PCT;

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
  var res = fakeRes();
  return Promise.resolve()
    .then(function() { return handler(req, res); })
    .then(function() { return res; });
}

// sql directo con registro de llamadas (para los helpers exportados)
function sqlDirecto(responder) {
  var calls = [];
  var fn = function(q, p) {
    calls.push({ q: String(q), p: p });
    var r = responder(String(q), p);
    return Promise.resolve(r === undefined ? [] : r);
  };
  fn.calls = calls;
  return fn;
}

function soloSql(texto) {
  return String(texto).split(/\r?\n/).map(function(linea) {
    var i = linea.indexOf('--');
    return i === -1 ? linea : linea.slice(0, i);
  }).join('\n');
}

function contarNoAscii(buf) {
  var n = 0;
  for (var i = 0; i < buf.length; i++) { if (buf[i] > 127) n++; }
  return n;
}

async function run() {

  // ============ 1. aplicarAmuletoX2: x2 temporal futuro =============
  var futuro = new Date(Date.now() + 3600000).toISOString();
  var sql1 = sqlDirecto(function(q) {
    if (q.indexOf('SELECT capacidades FROM usuarios') !== -1)
      return [{ capacidades: { multiplicador_xp_hasta: futuro } }];
    return [];
  });
  var r1 = null, e1 = null;
  try { r1 = await aplicarAmuletoX2(sql1, 'U1', 100); } catch (e) { e1 = e; }
  check('1a: x2 temporal futuro -> doubled true', !!r1 && r1.doubled === true, e1 && e1.message);
  check('1b: x2 temporal futuro -> xp base intacta (100)', !!r1 && r1.xp === 100, r1);
  check('1c: x2 temporal futuro NO consume usos (solo SELECT)',
    sql1.calls.length === 1, sql1.calls.length);
  check('1d: x2 temporal futuro no toca multiplicador_x2_usos',
    sql1.calls.filter(function(c) { return c.p && c.p[0] === 'multiplicador_x2_usos'; }).length === 0);

  // ============ 2. aplicarAmuletoX2: x2 temporal vencido + usos ====
  var pasado = new Date(Date.now() - 3600000).toISOString();
  var sql2 = sqlDirecto(function(q) {
    if (q.indexOf('SELECT capacidades FROM usuarios') !== -1)
      return [{ capacidades: { multiplicador_xp_hasta: pasado, multiplicador_x2_usos: 2 } }];
    return [];
  });
  var r2 = null, e2 = null;
  try { r2 = await aplicarAmuletoX2(sql2, 'U1', 100); } catch (e) { e2 = e; }
  check('2a: x2 vencido con usos=2 -> doubled true', !!r2 && r2.doubled === true, e2 && e2.message);
  var upd2 = sql2.calls.filter(function(c) { return c.p && c.p[0] === 'multiplicador_x2_usos'; });
  check('2b: x2 vencido consume exactamente 1 uso', upd2.length === 1, upd2.length);
  check('2c: x2 vencido deja el contador en 1',
    upd2.length === 1 && JSON.parse(upd2[0].p[1]) === 1, upd2.length && upd2[0].p[1]);

  // ============ 3. acumularRegalia: UPSERT vs no-op =================
  var sqlA = sqlDirecto(function(q) {
    if (q.indexOf('FROM album_fotos WHERE id=') !== -1) return [{ autor_id: 'AUTOR-A' }];
    return [];
  });
  await acumularRegalia(sqlA, 'album_foto', 'ITEM-1', 30, 'ACTOR-B');
  var insA = sqlA.calls.filter(function(c) { return c.q.indexOf('INSERT INTO regalias') !== -1; });
  check('3a: autor distinto del actor -> 1 UPSERT', insA.length === 1, insA.length);
  check('3b: UPSERT monto = red2(30 * 0.20) = 6',
    insA.length === 1 && Number(insA[0].p[3]) === 6, insA.length && insA[0].p[3]);
  check('3c: UPSERT con ON CONFLICT (fuente, item_id) DO UPDATE',
    insA.length === 1 && insA[0].q.indexOf('ON CONFLICT (fuente, item_id) DO UPDATE') !== -1);

  var sqlB = sqlDirecto(function(q) {
    if (q.indexOf('FROM album_fotos WHERE id=') !== -1) return [{ autor_id: 'MISMO' }];
    return [];
  });
  await acumularRegalia(sqlB, 'album_foto', 'ITEM-2', 30, 'MISMO');
  check('3d: autor == actor -> no-op (sin UPSERT)',
    sqlB.calls.filter(function(c) { return c.q.indexOf('INSERT INTO regalias') !== -1; }).length === 0);

  var sqlC = sqlDirecto(function(q) { return []; });
  await acumularRegalia(sqlC, 'album_foto', 'ITEM-3', 0, 'ACTOR-B');
  check('3e: xpBase 0 -> monto 0 -> no-op',
    sqlC.calls.filter(function(c) { return c.q.indexOf('INSERT INTO regalias') !== -1; }).length === 0);

  var sqlD = sqlDirecto(function() { return [{ autor_id: 'X' }]; });
  var autorCurada = await resolverAutorMedia(sqlD, 'curada', 'ITEM-4');
  check('3f: fuente curada -> autor null sin consultar', autorCurada === null && sqlD.calls.length === 0);

  // ============ 4. POST reclamar_bonus_referido =====================
  instalarMock([
    { match: 'referido_por, capacidades FROM usuarios',
      rows: [{ referido_por: null, capacidades: {} }] }
  ]);
  var resBa = await invocar({ method: 'POST', query: {}, headers: {},
    body: { tipo: 'reclamar_bonus_referido', usuario_id: 'U1', clave: 'bienvenida_x2_24h' } });
  check('4a-1: sin referido -> 403', resBa._status === 403, resBa._status);
  check('4a-2: sin referido -> error SIN_REFERIDO',
    resBa._json && resBa._json.error === 'SIN_REFERIDO', resBa._json);

  instalarMock([
    { match: 'referido_por, capacidades FROM usuarios',
      rows: [{ referido_por: 'REF-1', capacidades: { bonus_referido_reclamado: true } }] }
  ]);
  var resBb = await invocar({ method: 'POST', query: {}, headers: {},
    body: { tipo: 'reclamar_bonus_referido', usuario_id: 'U1', clave: 'bienvenida_x2_24h' } });
  check('4b-1: ya reclamado -> 409', resBb._status === 409, resBb._status);
  check('4b-2: ya reclamado -> error BONO_YA_RECLAMADO',
    resBb._json && resBb._json.error === 'BONO_YA_RECLAMADO', resBb._json);

  instalarMock([
    { match: 'referido_por, capacidades FROM usuarios',
      rows: [{ referido_por: 'REF-1', capacidades: {} }] }
  ]);
  var resBc = await invocar({ method: 'POST', query: {}, headers: {},
    body: { tipo: 'reclamar_bonus_referido', usuario_id: 'U1', clave: 'bienvenida_ascenso' } });
  check('4c-1: reclamo ok -> 200', resBc._status === 200, resBc._status);
  check('4c-2: reclamo ok devuelve la clave', resBc._json && resBc._json.clave === 'bienvenida_ascenso', resBc._json);

  instalarMock([{ match: 'referido_por, capacidades FROM usuarios', rows: [{ referido_por: 'REF-1', capacidades: {} }] }]);
  var resBd = await invocar({ method: 'POST', query: {}, headers: {},
    body: { tipo: 'reclamar_bonus_referido', usuario_id: 'U1', clave: 'pase_vip' } });
  check('4d: clave fuera de whitelist -> 400 CLAVE_INVALIDA',
    resBd._status === 400 && resBd._json && resBd._json.error === 'CLAVE_INVALIDA', resBd._json);

  // ============ 5. POST reclamar_regalias ===========================
  instalarMock([
    { match: 'SUM(xp_acumulado)', rows: [{ total: '12.50' }] }
  ]);
  var resRa = await invocar({ method: 'POST', query: {}, headers: {},
    body: { tipo: 'reclamar_regalias', usuario_id: 'U1' } });
  check('5a-1: regalias con pendiente -> 200', resRa._status === 200, resRa._status);
  check('5a-2: regalias con pendiente -> xp_otorgado 12.5',
    resRa._json && resRa._json.xp_otorgado === 12.5, resRa._json);

  instalarMock([
    { match: 'SUM(xp_acumulado)', rows: [{ total: 0 }] }
  ]);
  var resRb = await invocar({ method: 'POST', query: {}, headers: {},
    body: { tipo: 'reclamar_regalias', usuario_id: 'U1' } });
  check('5b-1: regalias sin pendiente -> 200', resRb._status === 200, resRb._status);
  check('5b-2: regalias sin pendiente -> xp_otorgado 0',
    resRb._json && resRb._json.xp_otorgado === 0, resRb._json);

  // ============ 6. Degradacion: query de regalias no reconocida =====
  instalarMock([]);
  var resDeg = await invocar({ method: 'POST', query: {}, headers: {},
    body: { tipo: 'reclamar_regalias', usuario_id: 'U1' } });
  check('6a: mock sin ruta regalias -> no lanza y responde 200', resDeg._status === 200, resDeg._status);
  check('6b: mock sin ruta regalias -> xp_otorgado 0',
    resDeg._json && resDeg._json.xp_otorgado === 0, resDeg._json);

  instalarMock([
    { match: 'SUM(xp_acumulado)', rows: function() { return Promise.reject(new Error('relation "regalias" does not exist')); } }
  ]);
  var resDeg2 = null, errDeg2 = null;
  try {
    resDeg2 = await invocar({ method: 'POST', query: {}, headers: {},
      body: { tipo: 'reclamar_regalias', usuario_id: 'U1' } });
  } catch (e) { errDeg2 = e; }
  check('6c-1: query de regalias que rechaza no lanza', !errDeg2, errDeg2 && errDeg2.message);
  check('6c-2: query de regalias que rechaza -> 200 xp_otorgado 0',
    !!resDeg2 && resDeg2._status === 200 && resDeg2._json && resDeg2._json.xp_otorgado === 0,
    resDeg2 && resDeg2._json);

  // ============ 7. GET bonus_referido / mis_regalias ================
  instalarMock([
    { match: 'FROM consumibles', rows: [
      { clave: 'bienvenida_x2_24h', nombre: 'Doble XP 24h', descripcion: 'x2 24h' },
      { clave: 'bienvenida_ascenso', nombre: 'Ascenso', descripcion: 'nivel 6' },
      { clave: 'bienvenida_fundador', nombre: 'Fundador', descripcion: 'vitrina' }
    ] },
    { match: 'referido_por, capacidades FROM usuarios',
      rows: [{ referido_por: 'REF-1', capacidades: {} }] }
  ]);
  var resGb = await invocar({ method: 'GET', query: { tipo: 'bonus_referido', usuario_id: 'U1' }, headers: {} });
  check('7a-1: GET bonus_referido -> 200', resGb._status === 200, resGb._status);
  check('7a-2: GET bonus_referido pendiente true', resGb._json && resGb._json.pendiente === true, resGb._json);
  check('7a-3: GET bonus_referido 3 opciones',
    resGb._json && Array.isArray(resGb._json.opciones) && resGb._json.opciones.length === 3,
    resGb._json && resGb._json.opciones && resGb._json.opciones.length);

  instalarMock([
    { match: 'FROM regalias', rows: [
      { fuente: 'destino', item_id: 'D1', xp_acumulado: '5.00', reclamado_en: null },
      { fuente: 'album_foto', item_id: 'F1', xp_acumulado: '3.50', reclamado_en: '2026-01-01' }
    ] }
  ]);
  var resGm = await invocar({ method: 'GET', query: { tipo: 'mis_regalias', usuario_id: 'U1' }, headers: {} });
  check('7b-1: GET mis_regalias -> 200', resGm._status === 200, resGm._status);
  check('7b-2: GET mis_regalias total_pendiente solo no reclamado (5)',
    resGm._json && resGm._json.total_pendiente === 5, resGm._json && resGm._json.total_pendiente);
  check('7b-3: GET mis_regalias 2 items con titulo',
    resGm._json && Array.isArray(resGm._json.items) && resGm._json.items.length === 2
      && !!resGm._json.items[0].titulo,
    resGm._json && resGm._json.items && resGm._json.items.length);

  // ============ 8. ESTATICOS ========================================
  var apiSrc = fs.readFileSync(path.join(ROOT, 'api/interacciones.js'), 'utf8');
  check('8a: REGALIA_PCT = 0.20 en el fuente', apiSrc.indexOf('var REGALIA_PCT = 0.20;') !== -1);
  check('8b: REGALIA_PCT exportado = 0.20', REGALIA_PCT === 0.20, REGALIA_PCT);
  check('8c: 6 apariciones de acumularRegalia (1 definicion + 5 call-sites)',
    (apiSrc.split('acumularRegalia(').length - 1) === 6, apiSrc.split('acumularRegalia(').length - 1);
  check('8d: rama reclamar_bonus_referido presente', apiSrc.indexOf("'reclamar_bonus_referido'") !== -1);
  check('8e: rama reclamar_regalias presente', apiSrc.indexOf("'reclamar_regalias'") !== -1);
  check('8f: rama bonus_referido GET presente', apiSrc.indexOf("'bonus_referido'") !== -1);
  check('8g: rama mis_regalias GET presente', apiSrc.indexOf("'mis_regalias'") !== -1);
  check('8h: filtro excluye bienvenida_ de la tienda', apiSrc.indexOf("indexOf('bienvenida_')") !== -1);
  check('8i: aplicarAmuletoX2 honra multiplicador_xp_hasta',
    apiSrc.indexOf('caps.multiplicador_xp_hasta') !== -1);

  var usrSrc = fs.readFileSync(path.join(ROOT, 'api/usuarios.js'), 'utf8');
  check('8j: api/usuarios.js expone usuarioResp.bonus_referido',
    usrSrc.indexOf('usuarioResp.bonus_referido') !== -1);
  check('8k: bonus_referido solo en alta (es_insert + refId)',
    usrSrc.indexOf('fila.es_insert === true && !!refId') !== -1);

  var m36Rel = 'db/migrations/036_bono_referido.sql';
  var m36 = fs.readFileSync(path.join(ROOT, m36Rel), 'utf8');
  var m36Buf = fs.readFileSync(path.join(ROOT, m36Rel));
  var m36Sql = soloSql(m36);
  check('8l: 036 siembra bienvenida_x2_24h', m36.indexOf("'bienvenida_x2_24h'") !== -1);
  check('8m: 036 siembra bienvenida_ascenso', m36.indexOf("'bienvenida_ascenso'") !== -1);
  check('8n: 036 siembra bienvenida_fundador', m36.indexOf("'bienvenida_fundador'") !== -1);
  check('8o: 036 auto-provisiona era_exclusiva', m36.indexOf('ADD COLUMN IF NOT EXISTS era_exclusiva') !== -1);
  check('8p: 036 auto-provisiona precio_xp_base', m36.indexOf('ADD COLUMN IF NOT EXISTS precio_xp_base') !== -1);
  check('8q: 036 idempotente ON CONFLICT (clave) DO UPDATE',
    m36.indexOf('ON CONFLICT (clave) DO UPDATE') !== -1);
  check('8r: 036 SQL ejecutable sin DELETE', m36Sql.indexOf('DELETE') === -1);
  check('8s: 036 SQL ejecutable sin DROP', m36Sql.indexOf('DROP') === -1);
  check('8t: 036 ASCII-safe (0 bytes > 127)', contarNoAscii(m36Buf) === 0, contarNoAscii(m36Buf));

  var m37Rel = 'db/migrations/037_regalias.sql';
  var m37 = fs.readFileSync(path.join(ROOT, m37Rel), 'utf8');
  var m37Buf = fs.readFileSync(path.join(ROOT, m37Rel));
  var m37Sql = soloSql(m37);
  check('8u: 037 crea tabla regalias IF NOT EXISTS',
    m37.indexOf('CREATE TABLE IF NOT EXISTS regalias') !== -1);
  check('8v: 037 indice unico (fuente, item_id)',
    m37.indexOf('CREATE UNIQUE INDEX IF NOT EXISTS uq_regalias_fuente_item') !== -1);
  check('8w: 037 backfill idempotente ON CONFLICT (fuente, item_id) DO NOTHING',
    m37.indexOf('ON CONFLICT (fuente, item_id) DO NOTHING') !== -1);
  check('8x: 037 usa guardas to_regclass (degradacion)',
    m37.indexOf('to_regclass') !== -1);
  check('8y: 037 SQL ejecutable sin DELETE', m37Sql.indexOf('DELETE') === -1);
  check('8z: 037 SQL ejecutable sin DROP', m37Sql.indexOf('DROP') === -1);
  check('8aa: 037 ASCII-safe (0 bytes > 127)', contarNoAscii(m37Buf) === 0, contarNoAscii(m37Buf));

  var selfBuf = fs.readFileSync(path.join(ROOT, 'scripts/smoke_regalias_bono.js'));
  check('8ab: smoke ASCII-safe (0 bytes > 127)', contarNoAscii(selfBuf) === 0, contarNoAscii(selfBuf));
  check('8ac: smoke con 0 backticks', selfBuf.toString('utf8').indexOf(String.fromCharCode(96)) === -1);

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
  console.log('FAIL - smoke regalias/bono lanzo error: ' + (err && err.message));
  process.exit(1);
});
