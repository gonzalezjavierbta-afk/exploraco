// scripts/smoke_038_casas_clases.js
// Smoke OFFLINE (sin red, sin DB) de TSK-112 / ADR-038: casas_cofre +
// factor de nivelacion de Casas y Clases Rising Star. Carga los handlers
// REALES (ADR-006) api/usuarios.js v16 y api/interacciones.js v21 en un
// sandbox vm con @neondatabase/serverless redirigido a un mock en memoria
// (global.__MOCKSQL__), igual que smoke_017 y smoke_036.
//
// Cubre:
//   A) usuarios.js v16:
//      - header v16 + CLASES_VALIDAS.
//      - casa_ranking: shape {ok,data:{casas,top}}, llaves nuevas y viejas,
//        tags/multiplicadores runtime por cuota 0.6/0.3/0.1, degradacion
//        42P01 (reintento sin JOIN + warn) y 42703 conservada.
//      - clase_elegir: 400 usuario_id, 400 CLASE_INVALIDA, 401 sesion,
//        403 EMAIL_SIN_VERIFICAR, 409 CLASE_YA_ELEGIDA, 429 COOLDOWN_CLASE,
//        402 PUNTOS_INSUFICIENTES, primera eleccion (clase_id IS NULL) y
//        recambio (300 XP + ventana 30 dias).
//      - casa_elegir: contrato conservado + refresco best-effort de
//        poblacion_activa dentro de try/catch con warn.
//   B) interacciones.js v21:
//      - header v21 + unicos catalogos/helpers.
//      - calcularXpFinal (110 / 143 / 93.5 + red2) y calcularNivelClase.
//      - acreditarClaseYCofre (50% clase + 10% cofre, sin clase/casa y
//        best-effort ante sql que falla).
//      - whitelist de 23 puntos con contextoXpE + calcularXpFinal +
//        acreditarClaseYCofre, y EXCLUIDOS sin el helper.
//      - contadores total_resenas/total_guardados/total_visitas; +10 al
//        autor original fuera del helper; bono rural plano.
//
// ASCII-safe (ADR-002): 0 bytes > 127, 0 backticks. CommonJS (BUG-001).
// Run: node scripts/smoke_038_casas_clases.js
'use strict';

var path = require('path');
var fs = require('fs');
var vm = require('vm');

// --- Helpers de reporte ----------------------------------------------
var passed = 0;
var failed = 0;
function check(label, cond) {
  if (cond) { passed++; console.log('PASS - ' + label); }
  else { failed++; console.log('FAIL - ' + label); process.exitCode = 1; }
}
function readSrc(rel) { return fs.readFileSync(path.join(__dirname, '..', rel), 'utf8'); }
function bytesAltos(rel) {
  var b = fs.readFileSync(path.join(__dirname, '..', rel));
  var high = 0;
  for (var i = 0; i < b.length; i++) { if (b[i] > 127) high++; }
  return high;
}
function tieneBacktick(s) { return s.indexOf(String.fromCharCode(96)) !== -1; }
function cuenta(src, re) { var m = String(src).match(re); return m ? m.length : 0; }

// Extrae el bloque {..} que sigue a un marcador, respetando comillas y
// escapes (para no confundir llaves dentro de strings SQL).
function bloqueLlaves(src, marcador) {
  var i = src.indexOf(marcador);
  if (i < 0) return '';
  var j = src.indexOf('{', i);
  if (j < 0) return '';
  var depth = 0;
  var quote = '';
  var esc = false;
  var BACKSLASH = String.fromCharCode(92);
  for (var k = j; k < src.length; k++) {
    var ch = src.charAt(k);
    if (esc) { esc = false; continue; }
    if (ch === BACKSLASH) { esc = true; continue; }
    if (quote) { if (ch === quote) quote = ''; continue; }
    if (ch === "'" || ch === '"') { quote = ch; continue; }
    if (ch === '{') depth++;
    else if (ch === '}') { depth--; if (depth === 0) return src.slice(i, k + 1); }
  }
  return src.slice(i);
}
// --- Cargador de api/*.js en sandbox vm --------------------------------
function cargarApi(fileRel, exposes) {
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
  var sandbox = {
    module: { exports: {} }, exports: {},
    require: customRequire, console: console, process: process,
    Buffer: Buffer, setTimeout: setTimeout, clearTimeout: clearTimeout,
    fetch: function() {
      return Promise.resolve({
        ok: true, status: 200,
        json: function() { return Promise.resolve({}); }
      });
    }
  };
  sandbox.exports = sandbox.module.exports;
  vm.createContext(sandbox);
  var code = fs.readFileSync(path.join(__dirname, '..', fileRel), 'utf8');
  var inject = '';
  (exposes || []).forEach(function(name) {
    inject += '\nmodule.exports.' + name + ' = ' + name + ';';
  });
  vm.runInContext(code + inject, sandbox, { filename: fileRel });
  return { sandbox: sandbox, mod: sandbox.module.exports, src: code };
}

// --- Invocacion real del handler (req/res mock) -----------------------
function invoke(handler, opts) {
  return new Promise(function(resolve) {
    global.__MOCKSQL__ = opts.mock || function() { return Promise.resolve([]); };
    var captured = { status: 200, body: null, headers: {} };
    var res = {
      setHeader: function(k, v) { captured.headers[k] = v; return this; },
      status: function(code) { captured.status = code; return this; },
      json: function(payload) { captured.body = payload; resolve(captured); return this; },
      end: function() { resolve(captured); return this; }
    };
    var req = {
      method: opts.method || 'GET',
      query: opts.query || {},
      body: opts.body || {},
      headers: opts.headers || {}
    };
    try {
      var p = handler(req, res);
      if (p && typeof p.then === 'function') {
        p.catch(function(err) {
          resolve({ status: 0, body: { ok: false, error: err.message } });
        });
      }
    } catch (e) {
      resolve({ status: 0, body: { ok: false, error: e.message } });
    }
  });
}

// ====================================================================
// MOCKS
// ====================================================================
function captura() {
  var state = { queries: [] };
  state.fn = function(q, p) {
    state.queries.push({ q: String(q), p: p || [] });
    return Promise.resolve([]);
  };
  state.alguna = function(sub) {
    return state.queries.some(function(x) { return x.q.indexOf(sub) !== -1; });
  };
  return state;
}

function filaCasa(casa, activos, xp) {
  return {
    casa: casa,
    miembros: activos,
    miembros_activos: activos,
    xp_total: String(xp),
    xp_promedio: String(xp / activos),
    xp_cofre_total: '30',
    factor_conversion: '1',
    activos_ocultos_aprobados: 0,
    checkins_30d: 0
  };
}
var CASAS_FIXTURE = [
  filaCasa('condor', 6, 600),
  filaCasa('jaguar', 3, 300),
  filaCasa('delfin', 1, 100)
];
function mockRanking(casas, top) {
  return function(q) {
    if (q.indexOf('ROW_NUMBER() OVER (PARTITION BY casa') !== -1)
      return Promise.resolve(top || []);
    if (q.indexOf('FROM usuarios u') !== -1 && q.indexOf('GROUP BY u.casa') !== -1)
      return Promise.resolve(casas || []);
    return Promise.resolve([]);
  };
}
// 42P01 en la primera consulta (con casas_cofre): el handler debe
// reintentar sin JOIN y responder igual.
function mockRanking42() {
  var log = [];
  var fn = function(q) {
    log.push(String(q));
    if (q.indexOf('casas_cofre') !== -1) {
      var e = new Error('relation casas_cofre does not exist');
      e.code = '42P01';
      return Promise.reject(e);
    }
    if (q.indexOf('ROW_NUMBER() OVER (PARTITION BY casa') !== -1)
      return Promise.resolve([]);
    if (q.indexOf('FROM usuarios u') !== -1)
      return Promise.resolve(CASAS_FIXTURE);
    return Promise.resolve([]);
  };
  fn.log = log;
  return fn;
}

// POST clase_elegir (api/usuarios.js v16).
function mockClase(cfg) {
  cfg = cfg || {};
  var log = [];
  var fn = function(q, p) {
    log.push(String(q));
    if (q.indexOf('SELECT id, clase_id, clase_elegida_en, xp_total, email_verificado FROM usuarios') !== -1)
      return Promise.resolve(cfg.fila ? [cfg.fila] : []);
    if (q.indexOf('clase_id IS NULL') !== -1 && q.indexOf('clase_elegida_en=NOW()') !== -1)
      return Promise.resolve(cfg.prim || []);
    // ADR-053 Dec 10: el recambio de Clase cuesta COSTO_CLASE (500, era 300)
    // y el SQL se arma por concatenacion de la constante.
    if (q.indexOf('xp_total = xp_total - 500') !== -1)
      return Promise.resolve(cfg.cambio || []);
    return Promise.resolve([]);
  };
  fn.log = log;
  return fn;
}

// POST casa_elegir con casas_cofre rota (migracion 024 ausente).
function mockCasaCofreRota() {
  var log = [];
  var fn = function(q) {
    log.push(String(q));
    if (q.indexOf('SELECT id, casa, casa_elegida_en, xp_total, email_verificado FROM usuarios') !== -1)
      return Promise.resolve([{
        id: 'u-casa', casa: null, casa_elegida_en: null,
        xp_total: '150', email_verificado: true
      }]);
    if (q.indexOf('casa IS NULL') !== -1 && q.indexOf('casa_elegida_en=NOW()') !== -1)
      return Promise.resolve([{
        casa: 'jaguar', casa_elegida_en: '2026-09-15T00:00:00.000Z', xp_total: '150'
      }]);
    if (q.indexOf('UPDATE casas_cofre SET poblacion_activa') !== -1) {
      var e = new Error('relation casas_cofre does not exist');
      e.code = '42P01';
      return Promise.reject(e);
    }
    return Promise.resolve([]);
  };
  fn.log = log;
  return fn;
}

// ====================================================================
// CARGA DE FUENTES
// ====================================================================
var usr = cargarApi('api/usuarios.js', [
  'firmarSesion', 'calcularNivel', 'CASAS_VALIDAS', 'CLASES_VALIDAS'
]);
var inte = cargarApi('api/interacciones.js', [
  'BONUS_CLASE', 'XP_NIVEL_CLASE', 'calcularNivelClase', 'calcularXpFinal',
  'calcularTagCasa', 'contextoXpE', 'acreditarClaseYCofre'
]);
var srcUsu = usr.src;
var srcInt = inte.src;
var handlerUsu = usr.mod;
var handlerInt = inte.mod;

var CASAS_VALIDAS = usr.mod.CASAS_VALIDAS;
var CLASES_VALIDAS = usr.mod.CLASES_VALIDAS;
var BONUS_CLASE = inte.mod.BONUS_CLASE;
var XP_NIVEL_CLASE = inte.mod.XP_NIVEL_CLASE;
var calcularNivelClase = inte.mod.calcularNivelClase;
var calcularXpFinal = inte.mod.calcularXpFinal;
var calcularTagCasa = inte.mod.calcularTagCasa;
var acreditarClaseYCofre = inte.mod.acreditarClaseYCofre;

var tokenClase = String(usr.mod.firmarSesion('u-clase'));
var tokenCasa = String(usr.mod.firmarSesion('u-casa'));

// ====================================================================
// CASOS
// ====================================================================
async function run() {

  // ================= A. USUARIOS.JS v16 ============================

  // --- A0. Header y catalogos ---
  check('A0a: usuarios.js declara header v16 (TSK-112 / ADR-038)',
    srcUsu.indexOf('v16 (TSK-112 / ADR-038') !== -1);
  check('A0b: CLASES_VALIDAS = cartografo/cronista/explorador',
    JSON.stringify(CLASES_VALIDAS) === '["cartografo","cronista","explorador"]');
  check('A0c: CLASES_VALIDAS se declara en una unica linea fuente',
    cuenta(srcUsu, /var CLASES_VALIDAS =/g) === 1);

  // --- A1. casa_ranking: shape + llaves + factor runtime ---
  var rk = await invoke(handlerUsu, {
    method: 'GET',
    query: { tipo: 'casa_ranking' },
    mock: mockRanking(CASAS_FIXTURE, [
      { id: 'u1', nombre: 'A', avatar_url: null, casa: 'condor', xp_total: '200' }
    ])
  });
  var rkData = rk.body && rk.body.data ? rk.body.data : {};
  check('A1a: casa_ranking conserva shape {ok:true, data:{casas, top}}',
    rk.status === 200 && rk.body.ok === true
    && Array.isArray(rkData.casas) && Array.isArray(rkData.top));
  check('A1b: casa_ranking devuelve las 3 Casas y el top',
    rkData.casas.length === 3 && rkData.top.length === 1);

  var rkCondor = rkData.casas.filter(function(c) { return c.casa === 'condor'; })[0];
  var llavesViejas = ['casa', 'miembros', 'miembros_activos', 'xp_total', 'xp_promedio'];
  var llavesNuevas = ['xp_cofre_total', 'factor_conversion', 'pct', 'tag',
    'multiplicador_xp', 'arancel_inter_casa', 'fee_mercado_interno'];
  check('A1c: casa_ranking conserva casa/miembros/miembros_activos/xp_total/xp_promedio',
    !!rkCondor && llavesViejas.every(function(k) {
      return Object.prototype.hasOwnProperty.call(rkCondor, k);
    }));
  check('A1d: casa_ranking agrega xp_cofre_total/factor_conversion/pct/tag/multiplicador_xp/arancel_inter_casa/fee_mercado_interno',
    !!rkCondor && llavesNuevas.every(function(k) {
      return Object.prototype.hasOwnProperty.call(rkCondor, k);
    }));
  check('A1e: xp_cofre_total/factor_conversion normalizados',
    !!rkCondor && rkCondor.xp_cofre_total === 30 && rkCondor.factor_conversion === 1);

  var rkJag = rkData.casas.filter(function(c) { return c.casa === 'jaguar'; })[0];
  var rkDelf = rkData.casas.filter(function(c) { return c.casa === 'delfin'; })[0];
  check('A2a: cuota 0.6 -> tag dominante + multiplicador 0.85',
    !!rkCondor && Math.abs(rkCondor.pct - 0.6) < 1e-9
    && rkCondor.tag === 'dominante' && rkCondor.multiplicador_xp === 0.85);
  check('A2b: cuota 0.3 -> tag equilibrada + multiplicador 1.00',
    !!rkJag && Math.abs(rkJag.pct - 0.3) < 1e-9
    && rkJag.tag === 'equilibrada' && rkJag.multiplicador_xp === 1.00);
  check('A2c: cuota 0.1 -> tag rezagada + multiplicador 1.30',
    !!rkDelf && Math.abs(rkDelf.pct - 0.1) < 1e-9
    && rkDelf.tag === 'rezagada' && rkDelf.multiplicador_xp === 1.30);
  check('A2d: aranceles/fees por tag (dominante 0.25/0.02, equilibrada 0.10/0.05, rezagada 0.05/0.00)',
    !!rkCondor && rkCondor.arancel_inter_casa === 0.25 && rkCondor.fee_mercado_interno === 0.02
    && !!rkJag && rkJag.arancel_inter_casa === 0.10 && rkJag.fee_mercado_interno === 0.05
    && !!rkDelf && rkDelf.arancel_inter_casa === 0.05 && rkDelf.fee_mercado_interno === 0.00);

  // --- A3. casa_ranking: degradacion 42P01 (dinamica + estatica) ---
  var warns42 = [];
  var warnOrig42 = console.warn;
  console.warn = function() { warns42.push(Array.prototype.join.call(arguments, ' ')); };
  var mock42 = mockRanking42();
  var r42 = await invoke(handlerUsu, {
    method: 'GET',
    query: { tipo: 'casa_ranking' },
    mock: mock42
  });
  console.warn = warnOrig42;
  check('A3a: casa_ranking degrada 42P01 -> 200 (no rompe)',
    r42.status === 200 && r42.body.ok === true && r42.body.data.casas.length === 3);
  check('A3b: reintenta la consulta SIN casas_cofre tras el 42P01',
    mock42.log.some(function(q) {
      return q.indexOf('FROM usuarios u') !== -1 && q.indexOf('casas_cofre') === -1;
    }));
  check('A3c: registra console.warn con el codigo 42P01',
    warns42.some(function(w) { return w.indexOf('42P01') !== -1; }));
  // Asercion obsoleta corregida: el refactor interno renombro la variable a
  // crCode (var crCode = crErr && crErr.code; if (crCode === '42P01')).
  // El comportamiento real ya lo cubren A3a/A3b/A3c.
  check('A3d: la rama 42P01 existe en el fuente con el codigo tipado',
    srcUsu.indexOf("var crCode = crErr && crErr.code") !== -1
    && srcUsu.indexOf("crCode === '42P01'") !== -1);
  check('A3e: el fuente advierte casa_ranking sin casas_cofre',
    srcUsu.indexOf('casa_ranking sin casas_cofre 42P01') !== -1);
  check('A3f: la degradacion 42703 existente se conserva',
    srcUsu.indexOf("crErr.code !== '42703'") !== -1
    && srcUsu.indexOf('casa_ranking degradado 42703') !== -1);

  // --- A4. clase_elegir: contrato de errores ---
  var clSinId = await invoke(handlerUsu, {
    method: 'POST',
    body: { tipo: 'clase_elegir' },
    headers: { authorization: 'Bearer ' + tokenClase },
    mock: mockClase({})
  });
  check('A4a: clase_elegir sin usuario_id -> 400',
    clSinId.status === 400 && String(clSinId.body.error).indexOf('usuario_id') !== -1);

  var clInvalida = await invoke(handlerUsu, {
    method: 'POST',
    body: { tipo: 'clase_elegir', usuario_id: 'u-clase', clase_id: 'bardo' },
    headers: { authorization: 'Bearer ' + tokenClase },
    mock: mockClase({})
  });
  check('A4b: clase_elegir con clase invalida -> 400 CLASE_INVALIDA',
    clInvalida.status === 400 && clInvalida.body.error === 'CLASE_INVALIDA');

  var clSinSes = await invoke(handlerUsu, {
    method: 'POST',
    body: { tipo: 'clase_elegir', usuario_id: 'u-clase', clase_id: 'cronista' },
    headers: {},
    mock: mockClase({})
  });
  check('A4c: clase_elegir sin sesion firmada -> 401',
    clSinSes.status === 401 && !!clSinSes.body && /^SESION_/.test(String(clSinSes.body.error)));

  var clSinEmail = await invoke(handlerUsu, {
    method: 'POST',
    body: { tipo: 'clase_elegir', usuario_id: 'u-clase', clase_id: 'cronista' },
    headers: { authorization: 'Bearer ' + tokenClase },
    mock: mockClase({ fila: { id: 'u-clase', clase_id: null, clase_elegida_en: null, xp_total: '50', email_verificado: false } })
  });
  check('A4d: clase_elegir con email no verificado -> 403 EMAIL_SIN_VERIFICAR',
    clSinEmail.status === 403 && clSinEmail.body.error === 'EMAIL_SIN_VERIFICAR');

  var clYaElegida = await invoke(handlerUsu, {
    method: 'POST',
    body: { tipo: 'clase_elegir', usuario_id: 'u-clase', clase_id: 'cronista' },
    headers: { authorization: 'Bearer ' + tokenClase },
    mock: mockClase({ fila: { id: 'u-clase', clase_id: null, clase_elegida_en: null, xp_total: '500', email_verificado: true }, prim: [] })
  });
  check('A4e: clase_elegir con carrera perdida en primera eleccion -> 409 CLASE_YA_ELEGIDA',
    clYaElegida.status === 409 && clYaElegida.body.error === 'CLASE_YA_ELEGIDA');

  var hace60d = new Date(Date.now() - 60 * 24 * 3600 * 1000).toISOString();
  var hace5d = new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString();

  var clCooldown = await invoke(handlerUsu, {
    method: 'POST',
    body: { tipo: 'clase_elegir', usuario_id: 'u-clase', clase_id: 'explorador' },
    headers: { authorization: 'Bearer ' + tokenClase },
    mock: mockClase({ fila: { id: 'u-clase', clase_id: 'cronista', clase_elegida_en: hace5d, xp_total: '1000', email_verificado: true }, cambio: [] })
  });
  check('A4f: recambio en cooldown de 30 dias -> 429 COOLDOWN_CLASE',
    clCooldown.status === 429 && clCooldown.body.error === 'COOLDOWN_CLASE');

  var clPobre = await invoke(handlerUsu, {
    method: 'POST',
    body: { tipo: 'clase_elegir', usuario_id: 'u-clase', clase_id: 'explorador' },
    headers: { authorization: 'Bearer ' + tokenClase },
    mock: mockClase({ fila: { id: 'u-clase', clase_id: 'cronista', clase_elegida_en: hace60d, xp_total: '100', email_verificado: true }, cambio: [] })
  });
  check('A4g: recambio con xp<500 -> 402 PUNTOS_INSUFICIENTES',
    clPobre.status === 402 && clPobre.body.error === 'PUNTOS_INSUFICIENTES');

  // --- A5. clase_elegir: primera eleccion y recambio ---
  var mPrim = mockClase({
    fila: { id: 'u-clase', clase_id: null, clase_elegida_en: null, xp_total: '500', email_verificado: true },
    prim: [{ clase_id: 'cartografo', clase_elegida_en: '2026-09-15T00:00:00.000Z' }]
  });
  var clPrimOk = await invoke(handlerUsu, {
    method: 'POST',
    body: { tipo: 'clase_elegir', usuario_id: 'u-clase', clase_id: 'cartografo' },
    headers: { authorization: 'Bearer ' + tokenClase },
    mock: mPrim
  });
  check('A5a: primera eleccion de Clase -> 200 con la clase elegida',
    clPrimOk.status === 200 && clPrimOk.body.ok === true
    && clPrimOk.body.data.clase_id === 'cartografo');
  check('A5b: primera eleccion usa UPDATE ... WHERE clase_id IS NULL',
    mPrim.log.some(function(q) {
      return q.indexOf('clase_id IS NULL') !== -1 && q.indexOf('clase_id=$2') !== -1;
    }));

  var mCambio = mockClase({
    fila: { id: 'u-clase', clase_id: 'cronista', clase_elegida_en: hace60d, xp_total: '500', email_verificado: true },
    cambio: [{ clase_id: 'explorador', clase_elegida_en: '2026-09-15T00:00:00.000Z', xp_total: '200' }]
  });
  var clCambioOk = await invoke(handlerUsu, {
    method: 'POST',
    body: { tipo: 'clase_elegir', usuario_id: 'u-clase', clase_id: 'explorador' },
    headers: { authorization: 'Bearer ' + tokenClase },
    mock: mCambio
  });
  check('A5c: recambio de Clase -> 200 con xp_total_nuevo/nivel y bajo_nivel',
    clCambioOk.status === 200 && clCambioOk.body.data.xp_total_nuevo === 200
    && clCambioOk.body.data.nivel_anterior === 3 && clCambioOk.body.data.nivel_nuevo === 2
    && clCambioOk.body.data.bajo_nivel === true);
  check('A5d: recambio descuenta 500 XP (ADR-053 Dec 10) con ventana de 30 dias',
    mCambio.log.some(function(q) {
      return q.indexOf('xp_total = xp_total - 500') !== -1
        && q.indexOf('30 days') !== -1
        && q.indexOf('xp_total >= 500') !== -1;
    }));

  // --- A6. casa_elegir: contrato + refresco best-effort del cofre ---
  var warnsCasa = [];
  var warnOrigCasa = console.warn;
  console.warn = function() { warnsCasa.push(Array.prototype.join.call(arguments, ' ')); };
  var mockCasaRota = mockCasaCofreRota();
  var casaOk = await invoke(handlerUsu, {
    method: 'POST',
    body: { tipo: 'casa_elegir', usuario_id: 'u-casa', casa: 'jaguar' },
    headers: { authorization: 'Bearer ' + tokenCasa },
    mock: mockCasaRota
  });
  console.warn = warnOrigCasa;
  check('A6a: casa_elegir primera eleccion -> 200 (contrato conservado)',
    casaOk.status === 200 && casaOk.body.ok === true && casaOk.body.data.casa === 'jaguar');
  check('A6b: casa_elegir intenta refrescar poblacion_activa de casas_cofre',
    mockCasaRota.log.some(function(q) { return q.indexOf('UPDATE casas_cofre SET poblacion_activa') !== -1; }));
  check('A6c: el fallo de casas_cofre es best-effort con console.warn',
    warnsCasa.some(function(w) { return w.indexOf('poblacion_activa no actualizada') !== -1; }));
  check('A6d: el fuente envuelve el UPDATE en try/catch con warn',
    srcUsu.indexOf('UPDATE casas_cofre SET poblacion_activa') !== -1
    && srcUsu.indexOf('poblacion_activa no actualizada') !== -1);

  // ================= B. INTERACCIONES.JS v21 =======================

  // --- B0. Header y catalogos/helpers unicos ---
  check('B0a: interacciones.js declara header v21 (TSK-112 / ADR-038)',
    srcInt.indexOf('v21 (TSK-112 / ADR-038') !== -1);
  check('B0b: BONUS_CLASE declarado una sola vez',
    cuenta(srcInt, /var BONUS_CLASE =/g) === 1);
  check('B0c: XP_NIVEL_CLASE declarado una sola vez',
    cuenta(srcInt, /var XP_NIVEL_CLASE =/g) === 1);
  check('B0d: cada helper existe una sola vez',
    cuenta(srcInt, /function calcularNivelClase\(/g) === 1
    && cuenta(srcInt, /function calcularXpFinal\(/g) === 1
    && cuenta(srcInt, /function calcularTagCasa\(/g) === 1
    && cuenta(srcInt, /async function contextoXpE\(/g) === 1
    && cuenta(srcInt, /async function acreditarClaseYCofre\(/g) === 1);

  check('B1a: BONUS_CLASE cartografo 0.08 / cronista 0.10 / explorador 0.07',
    BONUS_CLASE.cartografo === 0.08 && BONUS_CLASE.cronista === 0.10
    && BONUS_CLASE.explorador === 0.07);
  check('B1b: XP_NIVEL_CLASE exacto [0,100,250,500,900,1400,2100,3000,4200,5700,7500]',
    JSON.stringify(XP_NIVEL_CLASE) === '[0,100,250,500,900,1400,2100,3000,4200,5700,7500]');

  // --- B2. calcularXpFinal (ADR-053 Dec 2/8: devuelve OBJETO, no numero) ---
  // Con ctx default (nivel_usuario 1 -> m_nivel 1.0, sin amuleto/lider) los
  // montos del contrato ADR-038 se conservan en res.xp_final.
  check('B2a: calcularXpFinal base 100 nivel 1 cronista equilibrada -> xp_final 110',
    calcularXpFinal(100, 1, 'cronista', 'equilibrada').xp_final === 110);
  check('B2b: calcularXpFinal base 100 nivel 1 cronista rezagada -> xp_final 143',
    calcularXpFinal(100, 1, 'cronista', 'rezagada').xp_final === 143);
  check('B2c: calcularXpFinal base 100 nivel 1 cronista dominante -> xp_final 93.5',
    calcularXpFinal(100, 1, 'cronista', 'dominante').xp_final === 93.5);
  check('B2d: calcularXpFinal aplica red2 a 2 decimales (7.77 * 1.07 -> 8.31)',
    calcularXpFinal(7.77, 1, 'explorador', 'equilibrada').xp_final === 8.31);
  check('B2e: calcularXpFinal normaliza el xp_base string de Neon',
    calcularXpFinal('100', 1, 'cronista', 'equilibrada').xp_final === 110);
  check('B2f: sin clase y casa equilibrada el XP no cambia',
    calcularXpFinal(50, 1, null, 'equilibrada').xp_final === 50);

  // --- B3. calcularNivelClase y calcularTagCasa ---
  check('B3a: calcularNivelClase 0 -> 1 y 99 -> 1',
    calcularNivelClase(0) === 1 && calcularNivelClase(99) === 1);
  check('B3b: calcularNivelClase 100 -> 2 y 250 -> 3',
    calcularNivelClase(100) === 2 && calcularNivelClase(250) === 3);
  check('B3c: calcularNivelClase 5700 -> 10 y tope 99999 -> 10',
    calcularNivelClase(5700) === 10 && calcularNivelClase(99999) === 10);
  check('B3d: calcularTagCasa 0.6 dominante / 0.3 equilibrada / 0.1 rezagada',
    calcularTagCasa(6, 10) === 'dominante'
    && calcularTagCasa(3, 10) === 'equilibrada'
    && calcularTagCasa(1, 10) === 'rezagada');
  check('B3e: calcularTagCasa sin poblacion -> equilibrada',
    calcularTagCasa(0, 0) === 'equilibrada');

  // --- B4. acreditarClaseYCofre ---
  var mBien = captura();
  await acreditarClaseYCofre(mBien.fn, 'u-x',
    { clase_id: 'cronista', casa: 'condor', nivel_clase: 1, xp_clase: 0 }, 100);
  var updClase = mBien.queries.filter(function(x) {
    return x.q.indexOf('UPDATE usuarios SET xp_clase') !== -1;
  })[0];
  var updCofre = mBien.queries.filter(function(x) {
    return x.q.indexOf('UPDATE casas_cofre') !== -1;
  })[0];
  check('B4a: acreditarClaseYCofre suma 50% (100 -> 50) a xp_clase',
    !!updClase && updClase.p[0] === 50);
  check('B4b: acreditarClaseYCofre suma 10% (100 -> 10) al cofre de la Casa',
    !!updCofre && updCofre.p[0] === 10 && updCofre.p[1] === 'condor');

  var mSinClase = captura();
  await acreditarClaseYCofre(mSinClase.fn, 'u-x',
    { clase_id: null, casa: 'condor', nivel_clase: 1, xp_clase: 0 }, 100);
  check('B4c: sin clase_id no toca xp_clase pero si el cofre',
    !mSinClase.alguna('UPDATE usuarios SET xp_clase')
    && mSinClase.alguna('UPDATE casas_cofre'));

  var mSinCasa = captura();
  await acreditarClaseYCofre(mSinCasa.fn, 'u-x',
    { clase_id: 'cronista', casa: null, nivel_clase: 1, xp_clase: 0 }, 100);
  check('B4d: sin casa no toca el cofre pero si xp_clase',
    mSinCasa.alguna('UPDATE usuarios SET xp_clase')
    && !mSinCasa.alguna('UPDATE casas_cofre'));

  var errCapt = [];
  var errOrig = console.error;
  console.error = function() { errCapt.push(Array.prototype.join.call(arguments, ' ')); };
  var lanzo = false;
  try {
    await acreditarClaseYCofre(function() { return Promise.reject(new Error('boom')); },
      'u-x', { clase_id: 'cronista', casa: 'condor', nivel_clase: 1, xp_clase: 0 }, 100);
  } catch (e) { lanzo = true; }
  console.error = errOrig;
  check('B4e: acreditarClaseYCofre NUNCA lanza si el sql falla',
    lanzo === false);
  check('B4f: acreditarClaseYCofre registra el fallo best-effort con console.error',
    errCapt.length >= 1);

  // --- B5. Whitelist de puntos de XP (ADR-053 Dec 2/8) ---
  // Ancla en TODOS los call-sites de contextoXpE (incluye el encadenado
  // sin await de la rama comentario), excluyendo su definicion.
  // v25: los call-sites usan el wrapper calcularXpAcreditado (lee caps +
  // delega en calcularXpFinal) en vez de llamar calcularXpFinal directo.
  // 20 = los 15 de v21 + ao_proponer, spot_atributos, plan_crear,
  // plan_unirse y album_foto_autor ruteado por catalogo (ADR-053 Dec 9).
  // 21 = +1 por publicar_lugar (Fase 2: XP de publicacion al aprobar).
  // 23 = +2 por guardar_media (v28: XP dual al guardar album, ejecutor +
  // dueno; cada uno con su propio contextoXpE/calcularXpAcreditado).
  var XP_CALLSITES_ESPERADOS = 23;
  var XP_ACREDITADO_ESPERADOS = 23;
  // El +10 al autor original de album_agregar_foto queda EXENTO de
  // acreditarClaseYCofre (no tributa clase/cofre), pero SI usa el motor.
  // 20 = 19 previos + publicar_lugar (Fase 2).
  // 22 = +2 por guardar_media (v28: ejecutor y dueno tributan clase/cofre).
  var ACREDITAR_CLASE_ESPERADOS = 22;
  var anclas = [];
  var posCtx = srcInt.indexOf('contextoXpE(');
  while (posCtx !== -1) {
    var antes = srcInt.slice(Math.max(0, posCtx - 15), posCtx);
    if (antes.indexOf('function') === -1) anclas.push(posCtx);
    posCtx = srcInt.indexOf('contextoXpE(', posCtx + 1);
  }
  var anclasMotor = 0;
  var anclasClase = 0;
  anclas.forEach(function(idx) {
    var win = srcInt.slice(idx, idx + 1500);
    if (win.indexOf('calcularXpAcreditado(') !== -1) anclasMotor++;
    if (win.indexOf('acreditarClaseYCofre(') !== -1) anclasClase++;
  });
  check('B5a: hay ' + XP_CALLSITES_ESPERADOS + ' call-sites de contextoXpE',
    anclas.length === XP_CALLSITES_ESPERADOS);
  check('B5b: los ' + XP_CALLSITES_ESPERADOS + ' puntos llaman calcularXpAcreditado por proximidad',
    anclasMotor === XP_ACREDITADO_ESPERADOS);
  check('B5c: calcularXpAcreditado se invoca ' + XP_ACREDITADO_ESPERADOS + ' veces (fuera de su definicion)',
    cuenta(srcInt, /calcularXpAcreditado\(/g) - 1 === XP_ACREDITADO_ESPERADOS);
  check('B5d: acreditarClaseYCofre se invoca ' + ACREDITAR_CLASE_ESPERADOS + ' veces (autor original exento)',
    cuenta(srcInt, /acreditarClaseYCofre\(/g) - 1 === ACREDITAR_CLASE_ESPERADOS);
  check('B5e: el wrapper reusa el punto unico calcularXpFinal (Regla de No-Duplicidad)',
    srcInt.indexOf('return calcularXpFinal(xp_base, nivel_clase, clase_id, casa_tag, c)') !== -1);

  // --- B6. EXCLUIDOS: no llaman al helper ---
  var excluidos = [
    { nombre: 'dm_enviar', bloque: bloqueLlaves(srcInt, "tipo2 === 'dm_enviar'") },
    { nombre: 'comprar_consumible', bloque: bloqueLlaves(srcInt, "tipo2 === 'comprar_consumible'") },
    { nombre: 'evaluarMisiones', bloque: bloqueLlaves(srcInt, 'function evaluarMisiones(') },
    { nombre: 'evaluarLogros', bloque: bloqueLlaves(srcInt, 'function evaluarLogros(') },
    { nombre: 'progresarPandillaRetos', bloque: bloqueLlaves(srcInt, 'function progresarPandillaRetos(') },
    { nombre: 'repartirXpReferidos', bloque: bloqueLlaves(srcInt, 'function repartirXpReferidos(') }
  ];
  excluidos.forEach(function(ex) {
    var b = ex.bloque || '';
    var ok = b.length > 0
      && b.indexOf('contextoXpE') === -1
      && b.indexOf('calcularXpFinal') === -1
      && b.indexOf('acreditarClaseYCofre') === -1;
    check('B6: EXCLUIDO ' + ex.nombre + ' no llama al helper XP', ok);
  });

  // --- B7. Contadores preservados ---
  check('B7a: total_resenas sigue en su UPDATE',
    /total_resenas\s*=\s*total_resenas\s*\+\s*1/.test(srcInt));
  check('B7b: total_guardados sigue en su UPDATE',
    /total_guardados\s*=\s*total_guardados\s*\+\s*1/.test(srcInt));
  check('B7c: total_visitas sigue en su UPDATE',
    /total_visitas\s*=\s*total_visitas\s*\+\s*1/.test(srcInt));

  // --- B8. album_foto_autor por catalogo + motor (ADR-053 Dec 8.5) ---
  // v25: los 4 literales +10 del autor original se rutean por el catalogo
  // XP_BASES.album_foto_autor y reciben M_nivel via el motor; el tope
  // diario se mide contra la base del catalogo. Ya NO es un literal suelto.
  var afBloque = bloqueLlaves(srcInt, 'if (afAutorOriginal !== usuarioId2)');
  check('B8a: album_foto_autor sale del catalogo XP_BASES (no literal +10)',
    afBloque.indexOf('XP_BASES.album_foto_autor') !== -1
    && afBloque.indexOf('xp_total+10') === -1);
  check('B8b: album_foto_autor pasa por calcularXpAcreditado (M_nivel)',
    afBloque.indexOf('calcularXpAcreditado(') !== -1
    && afBloque.indexOf('XP_BASES.album_foto_autor') !== -1);
  check('B8c: album_foto_autor registra su fila en xp_ledger',
    afBloque.indexOf('registrarXpLedger(') !== -1
    && afBloque.indexOf("accion: 'album_foto_autor'") !== -1);

  // --- B9. Bono rural plano (ADR-053 Dec 8.3: 20 -> 25) ---
  check('B9a: VISITA_BONO_RURAL = 25 (ADR-053 Dec 8.3)',
    srcInt.indexOf('var VISITA_BONO_RURAL = 25') !== -1);
  check('B9b: el bono rural se suma plano al xp_final del motor',
    /var xpTotalVisita = red2\(resVisita\.xp_final \+ bonoRuralVisita\)/.test(srcInt));
  check('B9c: el bono rural NO se multiplica por casa_tag ni por factor',
    srcInt.indexOf('bonoRuralVisita *') === -1
    && srcInt.indexOf('* bonoRuralVisita') === -1
    && srcInt.indexOf('VISITA_BONO_RURAL *') === -1);

  // ================= SELF ==========================================
  var selfRel = 'scripts/smoke_038_casas_clases.js';
  var selfSrc = readSrc(selfRel);
  check('SELF: smoke_038 ASCII-safe (0 bytes > 127)', bytesAltos(selfRel) === 0);
  check('SELF: smoke_038 con 0 backticks', !tieneBacktick(selfSrc));
}

function finish() {
  var total = passed + failed;
  console.log('');
  console.log('=== SMOKE 038 CASAS / CLASES (TSK-112 / ADR-038) ===');
  console.log('Checks: ' + total + ' total, ' + passed + ' PASS, ' + failed + ' FAIL');
  if (failed === 0) {
    console.log('SMOKE 038 CASAS CLASES: OK');
  } else {
    console.log('SMOKE 038 CASAS CLASES: ' + failed + ' FALLO(S)');
    process.exitCode = 1;
  }
}

run().then(finish).catch(function(err) {
  console.log('FAIL - smoke 038 lanzo error: ' + (err && err.message));
  process.exitCode = 1;
  finish();
});
