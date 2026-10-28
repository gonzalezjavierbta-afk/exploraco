// scripts/smoke_test_consumibles_era.js
// Gate offline del "gate de consumibles por era" (ADR-056 / migracion 035).
// Spec: docs/superpowers/specs/2026-09-23-consumibles-por-era-design.md (seccion 9).
//
// Carga el handler REAL de api/interacciones.js en un sandbox vm con
// @neondatabase/serverless redirigido a un fake en memoria (sin red ni BD,
// via global.__MOCKSQL__) y valida:
//   1. Helper calcularEraVisibleLocal (GREATEST nivel derivado, nivel_max).
//   2. GET  ?tipo=consumibles&usuario_id  -> era_usuario + bloqueado.
//   3. POST ?tipo=comprar_consumible      -> 403 ERA_INSUFICIENTE (era futura).
//   4. POST ?tipo=comprar_consumible      -> sin gate (era NULL), 409 por XP.
//   5. POST ?tipo=usar_consumible         -> 200 (sin gate de era; era superada).
//   6. Migracion 035: columna, 15 claves, backfill, idempotencia, ASCII.
//   7. Wiring estatico en api/interacciones.js, admin.html y mi-perfil.html.
//
// ASCII-safe (ADR-002), CommonJS (BUG-001), 0 backticks.
// Run: node scripts/smoke_test_consumibles_era.js
'use strict';

var fs = require('fs');
var path = require('path');
var vm = require('vm');
// ADR-110 D5: la identidad del comprador sale del Bearer (verificarSesion) y el
// usuario_id del query/body se IGNORA. La firma se delega en lib/sesion.js, la
// MISMA primitiva HMAC-SHA256 del motor: cero criptografia duplicada.
var SESION = require('../lib/sesion.js');

var ROOT = path.join(__dirname, '..');

// El 'sub' del token es la unica autoridad. UID_AJENO es el id que se inyecta
// en body/query para probar que el motor lo ignora.
var UID_SESION = '11111111-1111-4111-8111-111111111111';
var UID_AJENO = '22222222-2222-4222-8222-222222222222';
var TOKEN_SESION = SESION.firmarSesion(UID_SESION);
function auth() { return { authorization: 'Bearer ' + TOKEN_SESION }; }
function sinAuth() { return {}; }

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
// Mismo harness que scripts/smoke_gamificacion_v6.js.
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

var M = cargarApi('api/interacciones.js', ['calcularEraVisibleLocal']);
var handler = M;
var calcularEraVisibleLocal = M.calcularEraVisibleLocal;

// ---- res fake minimo (status/json/end/setHeader encadenables) ----
function fakeRes() {
  return {
    _status: 0, _json: null, _headers: {},
    setHeader: function(k, v) { this._headers[k] = v; return this; },
    status: function(n) { this._status = n; return this; },
    json: function(o) { this._json = o; return this; },
    end: function() { return this; }
  };
}

// ---- Mock SQL: inspecciona el TEXTO del query y devuelve filas ----
// rutas: [{ match: <substring>, rows: <array|function> }]; se evalua en orden.
// Cualquier query no listada devuelve [] (rama .catch tolerante del handler).
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

function soloSql(texto) {
  // Quita comentarios de linea SQL (-- ...) para evaluar el cuerpo ejecutable.
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

  // ================= 1. UNIT: calcularEraVisibleLocal ===============
  // Umbrales NIVELES_LOCAL (api/interacciones.js:769-774):
  //   nivel 11 = 8650-10249 (Explorador), nivel 25 = 41750 (Cronista),
  //   nivel 40 = 100000 (Mito).
  check('1a: (xp=0, nivel_max=1) -> Caminante',
    calcularEraVisibleLocal(0, 1) === 'Caminante');
  check('1b: (xp=0, nivel_max=25) -> Cronista',
    calcularEraVisibleLocal(0, 25) === 'Cronista');
  check('1c: (xp=41750, nivel_max=1) -> Cronista',
    calcularEraVisibleLocal(41750, 1) === 'Cronista');
  check('1d: (xp=41750, nivel_max=36) -> Mito',
    calcularEraVisibleLocal(41750, 36) === 'Mito');
  check('1e: (xp=100000, nivel_max=1) -> Mito',
    calcularEraVisibleLocal(100000, 1) === 'Mito');

  // ================= 2a. GET consumibles (bloqueado) ================
  // Rama: tipo === 'consumibles'. ADR-110 D5: la identidad sale del Bearer
  // (verificarSesion) y el usuario_id del query se IGNORA. Con el token se lee
  // xp_total/nivel_max del sub (9000 -> nivel 11 = Explorador) y cada item
  // calcula bloqueado = era_exclusiva && era_exclusiva !== era_usuario.
  instalarMock([
    { match: 'FROM consumibles', rows: [
      { clave: 'pase_vip', nombre: 'Pase VIP', descripcion: '', precio_xp: '2400', categoria: 'social', era_exclusiva: 'Mito' },
      { clave: 'prod_cafe', nombre: 'Cafe', descripcion: '', precio_xp: '60', categoria: 'general', era_exclusiva: null }
    ] },
    { match: 'nivel_max FROM usuarios', rows: [{ xp_total: 9000, nivel_max: 1 }] }
  ]);
  var resA = null;
  var errA = null;
  try { resA = await invocar({ method: 'GET', query: { tipo: 'consumibles', usuario_id: UID_SESION }, headers: auth() }); }
  catch (e) { errA = e; }
  var dataA = (resA && resA._json && resA._json.data) || [];
  var itemVip = null, itemCafe = null;
  dataA.forEach(function(c) {
    if (c.clave === 'pase_vip') itemVip = c;
    if (c.clave === 'prod_cafe') itemCafe = c;
  });
  check('2a-1: GET consumibles status 200', !!resA && resA._status === 200, errA && errA.message);
  check('2a-2: era_usuario === Explorador (xp 9000 -> nivel 11)',
    !!resA && resA._json && resA._json.era_usuario === 'Explorador',
    resA && resA._json && resA._json.era_usuario);
  check('2a-3: pase_vip (era Mito) bloqueado === true',
    !!itemVip && itemVip.bloqueado === true, itemVip);
  check('2a-4: prod_cafe (era null) bloqueado === false',
    !!itemCafe && itemCafe.bloqueado === false, itemCafe);
  // Contrato nuevo: un usuario_id AJENO en el query produce EXACTAMENTE la
  // misma respuesta que el propio (el query param se tolera y se ignora).
  var resAAjeno = null;
  try { resAAjeno = await invocar({ method: 'GET', query: { tipo: 'consumibles', usuario_id: UID_AJENO }, headers: auth() }); }
  catch (e) { resAAjeno = null; }
  check('2a-5: GET con usuario_id ajeno -> respuesta identica a la del propio',
    !!resAAjeno && JSON.stringify(resAAjeno._json) === JSON.stringify(resA && resA._json),
    resAAjeno && resAAjeno._json && resAAjeno._json.era_usuario);
  // Y sin sesion el catalogo es publico y SIN gates (era_usuario null).
  var resASin = null;
  try { resASin = await invocar({ method: 'GET', query: { tipo: 'consumibles', usuario_id: UID_AJENO }, headers: sinAuth() }); }
  catch (e) { resASin = null; }
  check('2a-6: GET sin sesion -> publico y sin gates (era_usuario null)',
    !!resASin && resASin._status === 200 && !!resASin._json
    && resASin._json.era_usuario === null, resASin && resASin._json);

  // ================= 2b. comprar_consumible BLOQUEADO ===============
  // Rama: tipo2 === 'comprar_consumible'. ADR-110 D5: exige sesion firmada y
  // el autor es el 'sub' del token; el usuario_id del body se ignora. Gate de
  // era: Mito != Explorador -> 403 ERA_INSUFICIENTE.
  instalarMock([
    { match: 'FROM consumibles WHERE clave', rows: [
      { id: '1', clave: 'pase_vip', precio_xp: '2400', categoria: null, era_exclusiva: 'Mito' }
    ] },
    { match: 'capacidades, nivel_max FROM usuarios', rows: [
      { xp_total: 9000, capacidades: {}, nivel_max: 1 }
    ] }
  ]);
  var resB = null;
  try { resB = await invocar({ method: 'POST', query: {}, body: { tipo: 'comprar_consumible', usuario_id: UID_SESION, clave: 'pase_vip' }, headers: auth() }); }
  catch (e) { resB = null; }
  check('2b-1: compra era futura status 403', !!resB && resB._status === 403, resB && resB._status);
  check('2b-2: error === ERA_INSUFICIENTE',
    !!resB && resB._json && resB._json.error === 'ERA_INSUFICIENTE',
    resB && resB._json);
  check('2b-3: era_requerida === Mito',
    !!resB && resB._json && resB._json.era_requerida === 'Mito',
    resB && resB._json);
  // Sin sesion no se escribe nada: 401 SESION_REQUERIDA (antes del catalogo).
  var resBSin = null;
  try { resBSin = await invocar({ method: 'POST', query: {}, body: { tipo: 'comprar_consumible', usuario_id: UID_AJENO, clave: 'pase_vip' }, headers: sinAuth() }); }
  catch (e) { resBSin = null; }
  check('2b-4: compra sin sesion -> 401 SESION_REQUERIDA',
    !!resBSin && resBSin._status === 401 && !!resBSin._json
    && resBSin._json.error === 'SESION_REQUERIDA', resBSin && resBSin._json);
  // Con sesion y usuario_id AJENO en el body la operacion se aplica al sub: el
  // resultado es identico al de la compra del propio usuario.
  var resBAjeno = null;
  try { resBAjeno = await invocar({ method: 'POST', query: {}, body: { tipo: 'comprar_consumible', usuario_id: UID_AJENO, clave: 'pase_vip' }, headers: auth() }); }
  catch (e) { resBAjeno = null; }
  check('2b-5: usuario_id ajeno en el body -> mismo resultado que el propio (se ignora)',
    !!resBAjeno && JSON.stringify(resBAjeno._json) === JSON.stringify(resB && resB._json),
    resBAjeno && resBAjeno._json);

  // ================= 2c. comprar_consumible SIN GATE ================
  // era_exclusiva null -> sin gate; xp 0 < 60 -> 409 'XP insuficiente'.
  // Sesion firmada obligatoria (ADR-110 D5); el usuario_id del body se ignora.
  instalarMock([
    { match: 'FROM consumibles WHERE clave', rows: [
      { id: '2', clave: 'prod_cafe', precio_xp: '60', categoria: null, era_exclusiva: null }
    ] },
    { match: 'capacidades, nivel_max FROM usuarios', rows: [
      { xp_total: 0, capacidades: {}, nivel_max: 1 }
    ] }
  ]);
  var resC = null;
  try { resC = await invocar({ method: 'POST', query: {}, body: { tipo: 'comprar_consumible', usuario_id: UID_AJENO, clave: 'prod_cafe' }, headers: auth() }); }
  catch (e) { resC = null; }
  check('2c-1: compra sin gate NO es 403', !!resC && resC._status !== 403, resC && resC._status);
  check('2c-2: compra sin gate -> 409 XP insuficiente (xp 0 < 60)',
    !!resC && resC._status === 409, resC && resC._status);

  // ================= 2d. usar_consumible SIN GATE ===================
  // Rama: tipo2 === 'usar_consumible' (interacciones.js:8879). No hay gate de
  // era: item de era superada ya en inventario -> 200 con su efecto.
  // brujula_aprendiz -> { multiplicador_x2_usos: 3 } (interacciones.js:9056).
  instalarMock([
    { match: 'SELECT id, clave FROM consumibles', rows: [
      { id: '3', clave: 'brujula_aprendiz' }
    ] },
    { match: 'SELECT capacidades FROM usuarios', rows: [
      { capacidades: { consumibles: { brujula_aprendiz: 1 } } }
    ] }
  ]);
  var resD = null;
  try { resD = await invocar({ method: 'POST', query: {}, body: { tipo: 'usar_consumible', usuario_id: UID_SESION, clave: 'brujula_aprendiz' }, headers: auth() }); }
  catch (e) { resD = null; }
  check('2d-1: uso de item de era superada status 200', !!resD && resD._status === 200, resD && resD._status);
  check('2d-2: efecto.multiplicador_x2_usos === 3',
    !!resD && resD._json && resD._json.efecto && resD._json.efecto.multiplicador_x2_usos === 3,
    resD && resD._json);

  // ================= 3. ESTATICOS: migracion 035 ====================
  var migRel = 'db/migrations/035_consumibles_era.sql';
  var migPath = path.join(ROOT, migRel);
  var mig = fs.readFileSync(migPath, 'utf8');
  var migBuf = fs.readFileSync(migPath);
  var migSql = soloSql(mig);

  check('3a: contiene ADD COLUMN IF NOT EXISTS era_exclusiva',
    mig.indexOf('ADD COLUMN IF NOT EXISTS era_exclusiva') !== -1);

  var clavesNuevas = [
    'brujula_aprendiz', 'cantimplora_anden', 'mapa_carboncillo', 'linterna_selva',
    'libreta_campo', 'brujula_ruta', 'tintero_cronista', 'camara_antigua',
    'sello_archivo', 'estandarte_leyenda', 'capa_travesia', 'corona_rutas',
    'reliquia_ancestral', 'aura_mito', 'nombre_eterno'
  ];
  clavesNuevas.forEach(function(k) {
    check('3b: semilla contiene clave ' + k, mig.indexOf("'" + k + "'") !== -1);
  });

  // Backfill de premium (seccion 4): era + claves.
  check('3c-1: backfill asigna Cronista', mig.indexOf("SET era_exclusiva = 'Cronista'") !== -1);
  ['pluma_inspirada', 'trompeta_fama', 'perfil_vitrina_destacada'].forEach(function(k) {
    check('3c-2: backfill Cronista contiene ' + k, mig.indexOf("'" + k + "'") !== -1);
  });
  check('3c-3: backfill asigna Leyenda', mig.indexOf("SET era_exclusiva = 'Leyenda'") !== -1);
  ['perfil_marco_dorado', 'perfil_titulo_custom', 'sala_efimera', 'perfil_banda_artista'].forEach(function(k) {
    check('3c-4: backfill Leyenda contiene ' + k, mig.indexOf("'" + k + "'") !== -1);
  });
  check('3c-5: backfill asigna Mito', mig.indexOf("SET era_exclusiva = 'Mito'") !== -1);
  ['perfil_fondo_paisaje', 'pase_vip'].forEach(function(k) {
    check('3c-6: backfill Mito contiene ' + k, mig.indexOf("'" + k + "'") !== -1);
  });

  check('3d: idempotencia ON CONFLICT (clave) DO UPDATE',
    mig.indexOf('ON CONFLICT (clave) DO UPDATE') !== -1);
  // El cuerpo EJECUTABLE no debe contener sentencias destructivas. La palabra
  // DELETE/DROP solo aparece en el comentario "SIN DELETE NI DROP" (linea 38),
  // por eso se evalua sobre el SQL sin comentarios (invariante real).
  check('3e-1: SQL ejecutable sin DELETE', migSql.indexOf('DELETE') === -1);
  check('3e-2: SQL ejecutable sin DROP', migSql.indexOf('DROP') === -1);
  var migNoAscii = contarNoAscii(migBuf);
  check('3f: migracion con 0 bytes > 127', migNoAscii === 0, migNoAscii);

  // ================= 4. ESTATICOS: wiring ===========================
  var apiSrc = fs.readFileSync(path.join(ROOT, 'api/interacciones.js'), 'utf8');
  var apiOcur = apiSrc.split('ERA_INSUFICIENTE').length - 1;
  // Son 2 y no 1 desde la entrega de consumibles de faccion nivel 4:
  //   (a) el gate REAL de compra (POST comprar_consumible): responde
  //       403 { ok:false, error:'ERA_INSUFICIENTE', era_requerida, era_actual };
  //   (b) la ETIQUETA de bloqueo del catalogo (GET tipo=consumibles): el campo
  //       aditivo motivo_bloqueo reutiliza el mismo literal para que el cliente
  //       muestre el candado de era sin un mapeo nuevo.
  // El conteo es EXACTO a proposito: un tercer literal seria una copia
  // accidental del gate, y un >= lo dejaria pasar. Si la entrega borra (a) el
  // check cae a 1, si duplica el gate sube a 3: los dos casos fallan.
  check('4a: api/interacciones.js con exactamente 2 ERA_INSUFICIENTE',
    apiOcur === 2, apiOcur);

  var adminSrc = fs.readFileSync(path.join(ROOT, 'admin.html'), 'utf8');
  check('4b: admin.html contiene id="consumible-era"',
    adminSrc.indexOf('id="consumible-era"') !== -1);
  check('4c: admin.html contiene id="consumible-edit-era"',
    adminSrc.indexOf('id="consumible-edit-era"') !== -1);
  check('4d: admin.html contiene era_exclusiva', adminSrc.indexOf('era_exclusiva') !== -1);

  var perfilSrc = fs.readFileSync(path.join(ROOT, 'mi-perfil.html'), 'utf8');
  check('4e: mi-perfil.html contiene era_exclusiva', perfilSrc.indexOf('era_exclusiva') !== -1);
  check('4f: mi-perfil.html contiene bloqueado', perfilSrc.indexOf('bloqueado') !== -1);
  // 4g: la asercion sobre era_usuario ya no aplica. El catalogo de la tienda
  // de consumibles se retiro de la pestana Inventario (T5: cargarTienda,
  // renderTiendaChips, setTiendaFiltro, categoriaConsumible, PF_TIENDA_CATS,
  // PF_TIENDA_CAT, PF_CAT_CONSUMIBLE y el CSS .store-*), por eso mi-perfil.html
  // ya no tiene era_usuario. El gate de era sigue vivo en el servidor (2a-2 lo
  // cubre sobre el handler real) y en el cliente lo unica superficie restante
  // es el badge .inv-era que cargarInventario pinta sobre cada consumible
  // poseido. Por eso 4g verifica esa superficie en vez de la variable retirada.
  check('4g-1: mi-perfil.html pinta la era en el inventario (.inv-era)',
    perfilSrc.indexOf('inv-era') !== -1);
  // 4g-2: lo que T5 proscribio NO fue "consultar consumibles desde mi-perfil"
  // sino DUPLICAR la tienda general: ya existia un componente y una segunda
  // copia divergia del canonico (dos criterios de filtrado y dos precios). Ese
  // componente sigue retirado y no debe volver.
  // EXCEPCION DOCUMENTADA (entrega de consumibles de faccion nivel 4): el
  // modulo .pf-fac (funcion pfFacCargar) reintroduce una tienda ACOTADA que
  // consume el mismo endpoint pero se queda SOLO con la categoria 'faccion'
  // (pfFacLista filtra return ... categoria === 'faccion'), y su estado de
  // bloqueo lo manda el motor. Por eso la asercion ya no prohibe el literal:
  // exige EXACTAMENTE UNA llamada, que viva DENTRO de pfFacCargar, que el
  // filtro de categoria siga en pie, y conserva la prohibicion de la tienda
  // general duplicada. Si alguien reintroduce una tienda general aqui, 4g-2
  // (2 llamadas) o 4g-2c (cargarTienda/PF_TIENDA_CATS) fallan.
  // 4g-2: ADR-110 retiro la peticion del catalogo desde mi-perfil.html: el
  // bloque de faccion ya no pide ?tipo=consumibles (solo necesitaba el estado
  // del usuario) y lee ?tipo=inventario. Se afirma que NO queda ninguna llamada
  // al catalogo desde el perfil: la unica mencion del literal es un comentario.
  var consOcur = perfilSrc.split('api/interacciones?tipo=consumibles').length - 1;
  check('4g-2: mi-perfil.html con 0 llamadas a ?tipo=consumibles (el bloque lee el inventario)',
    consOcur === 0, consOcur);
  var facIni = perfilSrc.indexOf('function pfFacCargar');
  var facFin = perfilSrc.indexOf('function pfFacRefrescar');
  var cuerpoFac = (facIni !== -1 && facFin > facIni) ? perfilSrc.slice(facIni, facFin) : '';
  var llamadasFac = cuerpoFac.split('fetchConJwt(').length - 1;
  // 4g-2a: la lectura del bloque de faccion vive DENTRO de pfFacCargar, es UNA
  // sola y va por fetchConJwt, que es lo que manda el Bearer: sin el, el motor
  // no puede derivar la identidad y los gates llegarian nulos (ADR-110 D5).
  check('4g-2a: la lectura de faccion vive dentro de pfFacCargar y va por fetchConJwt (Bearer)',
    facIni !== -1 && facFin !== -1 && facIni < facFin
    && llamadasFac === 1
    && cuerpoFac.indexOf('tipo=inventario&usuario_id=') !== -1,
    [facIni, facFin, llamadasFac]);
  check('4g-2b: la tienda de faccion solo pinta la categoria faccion',
    perfilSrc.indexOf("String(it.categoria || '').toLowerCase() === 'faccion'") !== -1);
  check('4g-2c: la tienda general de consumibles sigue sin duplicarse en mi-perfil.html',
    perfilSrc.indexOf('cargarTienda') === -1
    && perfilSrc.indexOf('PF_TIENDA_CATS') === -1
    && perfilSrc.indexOf('categoriaConsumible') === -1);

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
  console.log('FAIL - smoke consumibles era lanzo error: ' + (err && err.message));
  process.exit(1);
});
