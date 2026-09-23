// scripts/smoke_gamificacion_v6.js
// Gate offline del motor de XP v6 (ADR-053 / api/interacciones.js v25).
// Carga el handler REAL en sandbox vm con @neondatabase/serverless
// redirigido a un fake en memoria (sin red ni BD) y valida:
//   1. M_nivel x1.0..x3.0 y monotonia en los 40 niveles.
//   2. Caso tope: doble cap secuencial (5.0 / 10.0).
//   3. Caso sin recorte (cap_aplicado 'ninguno').
//   4. Sin piso 1.0 (Casa dominante preserva x0.85).
//   5. Catalogo unico XP_BASES (19 claves, bases del contrato v2.1).
//   6. leerConfigGamificacion degrada 42P01 a constantes con warn.
//   7. completitudSpotAtributos por categoria (ADR-016 / ADR-053 Dec 9).
//   8. registrarXpLedger es best-effort (no propaga excepcion, warn).
//   9. NIVELES_LOCAL sincronizado con los 40 umbrales v6.
//
// ASCII-safe (ADR-002), CommonJS (BUG-001), 0 backticks.
// Run: node scripts/smoke_gamificacion_v6.js
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

var M = cargarApi('api/interacciones.js', [
  'obtenerMultiplicadorNivel', 'calcularXpFinal', 'leerConfigGamificacion',
  'completitudSpotAtributos', 'registrarXpLedger', 'XP_BASES', 'NIVELES_LOCAL'
]);

var obtenerMultiplicadorNivel = M.obtenerMultiplicadorNivel;
var calcularXpFinal = M.calcularXpFinal;
var leerConfigGamificacion = M.leerConfigGamificacion;
var completitudSpotAtributos = M.completitudSpotAtributos;
var registrarXpLedger = M.registrarXpLedger;
var XP_BASES = M.XP_BASES;
var NIVELES_LOCAL = M.NIVELES_LOCAL;

// RELEASE 2026-09-23: escala reescalada a 40 niveles (5 eras), techo 100000.
var V6_BORNES = [0,150,500,1000,1650,2500,3450,4550,5800,7150,
  8650,10250,12000,13850,15800,17900,20100,22450,24850,27400,
  30050,32800,35700,38650,41750,44900,48200,51600,55050,58700,
  62400,66150,70050,74050,78150,82300,86600,90950,95450,100000];

function capturarWarn(fn) {
  var warns = [];
  var orig = console.warn;
  console.warn = function() { warns.push(Array.prototype.join.call(arguments, ' ')); };
  return Promise.resolve()
    .then(fn)
    .then(function(v) { console.warn = orig; return { valor: v, warns: warns }; })
    .catch(function(e) { console.warn = orig; throw e; });
}

async function run() {

  // ================= 1. M_nivel ====================================
  check('1a: obtenerMultiplicadorNivel(1) === 1.0', obtenerMultiplicadorNivel(1) === 1);
  check('1b: obtenerMultiplicadorNivel(40) === 3.0 (ADR-053 Dec 1)',
    obtenerMultiplicadorNivel(40) === 3);
  var monotona = true;
  var prev = -1;
  for (var n = 1; n <= 40; n++) {
    var v = obtenerMultiplicadorNivel(n);
    if (!(v > prev)) monotona = false;
    prev = v;
  }
  check('1c: M_nivel monotona estricta en los 40 niveles', monotona);
  check('1d: M_nivel(10) sigue la formula 1 + (9/39)*2',
    Math.abs(obtenerMultiplicadorNivel(10) - (1 + (9 / 39) * 2)) < 1e-12);

  // ================= 2. Caso tope ==================================
  // N20 (m 3.0) + cronista nivel 10 (x2.0) + Casa rezagada (x1.3) = 7.8 -> cap 5
  // stack 2 (amuleto) * 1.1 (lider) = 2.2 -> 5 * 2.2 = 11 -> cap global 10.
  var tope = calcularXpFinal(100, 10, 'cronista', 'rezagada',
    { nivel_usuario: 20, amuleto: true, lider: true });
  check('2a: tope mult_progresion_c === 5.0', tope.mult_progresion_c === 5);
  check('2b: tope mult_global_c === 10.0', tope.mult_global_c === 10);
  check('2c: tope cap_aplicado === global', tope.cap_aplicado === 'global');
  check('2d: tope xp_final === red2(base * 10)',
    tope.xp_final === Math.round(100 * 10 * 100) / 100);
  check('2e: tope mult_stack congelado = clase*casa*amuleto*lider',
    Math.abs(tope.mult_stack - (2 * 1.3 * 2 * 1.1)) < 1e-9);

  // ================= 3. Sin recorte =================================
  var plano = calcularXpFinal(100, 1, null, 'equilibrada', { nivel_usuario: 1 });
  check('3a: sin recorte cap_aplicado === ninguno', plano.cap_aplicado === 'ninguno');
  check('3b: sin recorte mult_global_c === 1', plano.mult_global_c === 1);
  check('3c: sin recorte xp_final === base', plano.xp_final === 100);

  // ================= 4. Sin piso 1.0 ================================
  var castigo = calcularXpFinal(100, 1, null, 'dominante', { nivel_usuario: 1 });
  check('4a: Casa dominante N1 -> mult_global_c === 0.85 (sin piso)',
    castigo.mult_global_c === 0.85);
  check('4b: Casa dominante N1 -> cap_aplicado ninguno',
    castigo.cap_aplicado === 'ninguno');

  // ================= 5. XP_BASES ====================================
  var claves = Object.keys(XP_BASES);
  check('5a: XP_BASES tiene exactamente 24 claves', claves.length === 24, claves.length);
  var basesEsperadas = {
    visita: 60, visita_bono_rural: 25, resena_larga: 30, resena_corta: 10,
    rating: 5, guardado: 3, chat_comentario: 6, foto_viajero: 30,
    album_crear: 25, album_foto: 20, album_foto_autor: 10, voto_media: 3,
    ao_votar: 5, ao_proponer: 30, ao_checkin: 20, plan_crear: 20,
    plan_unirse: 6, spot_atributos: 10,
    publicar_basico: 25, publicar_intermedio: 60, publicar_completo: 120,
    publicar_bono_geo: 40, publicar_bono_foto: 30
  };
  var basesOk = Object.keys(basesEsperadas).every(function(k) {
    return XP_BASES[k] === basesEsperadas[k];
  });
  check('5b: bases del contrato v27 correctas', basesOk);
  check('5c: compartir conserva {primero 25, posterior 5}',
    !!XP_BASES.compartir && XP_BASES.compartir.primero === 25
    && XP_BASES.compartir.posterior === 5);

  // ================= 6. leerConfigGamificacion degrada ==============
  var sql42 = function() {
    var e = new Error('relation gamificacion_config does not exist');
    e.code = '42P01';
    return Promise.reject(e);
  };
  var cfgRes = await capturarWarn(function() { return leerConfigGamificacion(sql42); });
  check('6a: 42P01 -> capProgresion 5.0 por defecto', cfgRes.valor.capProgresion === 5);
  check('6b: 42P01 -> capGlobal 10.0 por defecto', cfgRes.valor.capGlobal === 10);
  check('6c: 42P01 -> mNivelMax 3.0 por defecto', cfgRes.valor.mNivelMax === 3);
  check('6d: 42P01 registra warn (sin catch vacio)',
    cfgRes.warns.some(function(w) {
      return w.indexOf('gamificacion_config') !== -1 && w.indexOf('42P01') !== -1;
    }), cfgRes.warns);

  var cfgOk = await capturarWarn(function() {
    return leerConfigGamificacion(function() {
      return Promise.resolve([
        { clave: 'cap_progresion', valor: '4' },
        { clave: 'cap_global', valor: '8' },
        { clave: 'm_nivel_max', valor: '2.5' }
      ]);
    });
  });
  check('6e: config leida sobreescribe los defaults',
    cfgOk.valor.capProgresion === 4 && cfgOk.valor.capGlobal === 8
    && cfgOk.valor.mNivelMax === 2.5);

  // ================= 7. completitudSpotAtributos ====================
  var sitioOk = {
    categoria_slug: 'sitio', ciudad: 'Bogota', address: 'Calle 1 #2-3',
    telefono: '3001234567', tags: { subcategoria: 'museo' }
  };
  var sitioNo = {
    categoria_slug: 'sitio', ciudad: 'Bogota', address: 'Calle 1 #2-3',
    telefono: '3001234567', tags: {}
  };
  var hostalOk = {
    categoria_slug: 'hostal', ciudad: 'Bogota', address: 'Calle 1 #2-3',
    precio_desde: '50000', tags: { tipo_alojamiento: 'hostal' }
  };
  var hostalNo = {
    categoria_slug: 'hostal', ciudad: 'Bogota', address: 'Calle 1 #2-3',
    precio_desde: '50000', tags: {}
  };
  check('7a: sitio con subcategoria -> true', completitudSpotAtributos(sitioOk) === true);
  check('7b: sitio sin subcategoria -> false', completitudSpotAtributos(sitioNo) === false);
  check('7c: hostal con 1 tag no vacio -> true', completitudSpotAtributos(hostalOk) === true);
  check('7d: hostal sin tags -> false', completitudSpotAtributos(hostalNo) === false);
  check('7e: sitio sin contacto -> false',
    completitudSpotAtributos({ categoria_slug: 'sitio', ciudad: 'Bogota', address: 'Calle 1', tags: { subcategoria: 'museo' } }) === false);

  // ================= 8. registrarXpLedger best-effort ===============
  var sqlBoom = function() { return Promise.reject(new Error('boom ledger')); };
  var ledRes = null;
  var propago = false;
  try {
    ledRes = await capturarWarn(function() {
      return registrarXpLedger(sqlBoom, {
        usuario_id: '00000000-0000-0000-0000-000000000000',
        accion: 'visita', xp_base: 20, xp_final: 20, nivel: 3
      });
    });
  } catch (e) { propago = true; }
  check('8a: registrarXpLedger NO propaga la excepcion', propago === false);
  check('8b: registrarXpLedger registra warn best-effort',
    !!ledRes && ledRes.warns.some(function(w) { return w.indexOf('xp_ledger') !== -1; }),
    ledRes && ledRes.warns);

  // ================= 9. NIVELES_LOCAL ===============================
  check('9a: NIVELES_LOCAL == 40 umbrales v6',
    JSON.stringify(NIVELES_LOCAL) === JSON.stringify(V6_BORNES));

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
  console.log('FAIL - smoke gamificacion v6 lanzo error: ' + (err && err.message));
  process.exit(1);
});
