// scripts/smoke_058_origen_clasificador.js
// Smoke PERSISTENTE (sin red, sin BD) del clasificador de origen del ADR-058
// (Multiplicador de Origen por lejania). Complementa al gate de paridad
// JS/SQL (scripts/smoke_origen_factor_parity.js, que REQUIERE Neon) y corre
// SIN DATABASE_URL: carga los handlers REALES (ADR-006) api/interacciones.js
// y api/usuarios.js en un sandbox vm con @neondatabase/serverless
// redirigido a un mock, igual que smoke_017/036/038 y smoke_mercado.
//
// Cubre:
//   A) api/interacciones.js:
//      1) curva calcularFactorOrigen: matriz tier x distancia x config
//         (local 0->1.00; nomada 0->1.00, 500->1.10, 1000->1.20, 5000->1.20;
//         extranjero 0->1.20, 1500->1.30, 3000->1.40, 9999->1.40;
//         null->1.00) con tolerancia 1e-6, puntos de continuidad y curva
//         recalibrada (nomada_max 1.3 => lee de cfg, no de literales);
//      2) normGeo/normGeoAlias sobre fixture de ~15 ciudades y alias
//         (Bogota D.C.->'bogota d c', b/quilla->'barranquilla',
//         sta marta->'santa marta', Nari\u00f1o->'narino', ...).
//   B) api/usuarios.js: construirOrigenUsuario con estados del ADR-058:
//      sin datos (elegible=false, tier_base=null), CO+ciudad (tier_base=co),
//      extranjero verificado (tier_base=extranjero,
//      es_extranjero_verificado=true), extranjero sin email
//      (es_extranjero_verificado=false), cooldown por dias y min_dias_cuenta.
//   C) ASCII-safety (ADR-002) de api/interacciones.js, api/usuarios.js y
//      api/admin.js (0 bytes > 127).
//   D) api/admin.js: las 7 claves de config (ORIGEN_CONFIG_CLAVES) y los 4
//      campos nuevos del payload de salud_red por busqueda de strings, SIN
//      ejecutar el handler.
//
// ASCII-safe (ADR-002): 0 bytes > 127, 0 backticks. CommonJS (BUG-001).
// Run: node scripts/smoke_058_origen_clasificador.js
'use strict';

var path = require('path');
var fs = require('fs');
var vm = require('vm');

var passed = 0;
var failed = 0;
function check(label, cond, detalle) {
  if (cond) { passed++; console.log('PASS - ' + label); }
  else {
    failed++;
    console.log('FAIL - ' + label + (detalle ? ' :: ' + detalle : ''));
    process.exitCode = 1;
  }
}
function readSrc(rel) { return fs.readFileSync(path.join(__dirname, '..', rel), 'utf8'); }
function bytesAltos(rel) {
  var b = fs.readFileSync(path.join(__dirname, '..', rel));
  var high = 0;
  for (var i = 0; i < b.length; i++) { if (b[i] > 127) high++; }
  return high;
}
function tieneBacktick(s) { return s.indexOf(String.fromCharCode(96)) !== -1; }

var TOL = 1e-6;
function casi(a, b) { return Math.abs(Number(a) - Number(b)) <= TOL; }

// --- Cargador de api/*.js en sandbox vm (patron smoke_038/mercado) ------
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
  return { mod: sandbox.module.exports, src: code };
}

// ====================================================================
// A. CURVA calcularFactorOrigen (api/interacciones.js)
// ====================================================================
var inte = cargarApi('api/interacciones.js', [
  'normGeo', 'normGeoAlias', 'normalizarCfgOrigen', 'calcularFactorOrigen'
]);
var M = inte.mod;

// (A1) Matriz tier x distancia con cfg default/omiso (ADR-058 seccion 6).
// Incluye puntos intermedios de continuidad (nomada 250/750 extranjero).
var CURVA_DEFAULT = [
  ['local', 0, 1.00],
  ['nomada', 0, 1.00],
  ['nomada', 250, 1.05],
  ['nomada', 500, 1.10],
  ['nomada', 1000, 1.20],
  ['nomada', 5000, 1.20],
  ['extranjero', 0, 1.20],
  ['extranjero', 750, 1.25],
  ['extranjero', 1500, 1.30],
  ['extranjero', 3000, 1.40],
  ['extranjero', 9999, 1.40],
  [null, 0, 1.00],
  [null, 9999, 1.00]
];
CURVA_DEFAULT.forEach(function(c) {
  var got = M.calcularFactorOrigen(c[0], c[1], {});
  check('A1: tier=' + String(c[0]) + ' dist=' + c[1] + ' -> ' + c[2].toFixed(2) + ' (default)',
    casi(got, c[2]), 'got ' + got);
});
// cfg totalmente omitido (undefined) tambien degrada a la config default.
check('A1b: cfg undefined degrada a default (local 10 -> 1.00)',
  casi(M.calcularFactorOrigen('local', 10), 1.00), 'got ' + M.calcularFactorOrigen('local', 10));

// (A2) Curva RECALIBRADA: la funcion debe leer la config, no literales.
var CFG_RECAL = {
  factorOrigenLocal: 1.10,
  factorOrigenNomadaMax: 1.30,
  factorOrigenExtranjeroMax: 1.50,
  origenKmNomada: 2000,
  origenKmExtranjero: 4000
};
var CURVA_RECAL = [
  ['local', 0, 1.10],
  ['nomada', 0, 1.10],
  ['nomada', 1000, 1.20],
  ['nomada', 2000, 1.30],
  ['extranjero', 2000, 1.40],
  ['extranjero', 4000, 1.50]
];
CURVA_RECAL.forEach(function(c) {
  var got = M.calcularFactorOrigen(c[0], c[1], CFG_RECAL);
  check('A2: recalibrada tier=' + String(c[0]) + ' dist=' + c[1] + ' -> ' + c[2].toFixed(2),
    casi(got, c[2]), 'got ' + got);
});
// La curva es continua: nomada(kmNomada) == nomadaMax == extranjero(0).
check('A2b: continuidad nomada(kmNomada) == nomadaMax == extranjero(0)',
  casi(M.calcularFactorOrigen('nomada', 1000, {}), 1.20)
  && casi(M.calcularFactorOrigen('nomada', 1000, {}), M.calcularFactorOrigen('extranjero', 0, {})));

// (A3) Distancias invalidas normalizan a 0 (nunca negativas en la curva).
check('A3: distKm negativa normaliza a 0 (local -5 -> 1.00)',
  casi(M.calcularFactorOrigen('local', -5, {}), 1.00), 'got ' + M.calcularFactorOrigen('local', -5, {}));

// ====================================================================
// B. normGeo / normGeoAlias (api/interacciones.js)
// ====================================================================
// Fixture: [entrada, resultado normGeo, resultado normGeoAlias(normGeo)].
// Los acentos se escriben como escapes \\u (ASCII-safe, ADR-002).
var GEO_FIXTURE = [
  ['Bogota D.C.', 'bogota d c', 'bogota'],
  ['Bogot\u00e1 D.C.', 'bogota d c', 'bogota'],
  ['Bogota', 'bogota', 'bogota'],
  ['bogota d c', 'bogota d c', 'bogota'],
  ['Medellin', 'medellin', 'medellin'],
  ['Medellin de Antioquia', 'medellin de antioquia', 'medellin de antioquia'],
  ['Narino', 'narino', 'narino'],
  ['Nari\u00f1o', 'narino', 'narino'],
  ['b/quilla', 'b quilla', 'barranquilla'],
  ['bquilla', 'bquilla', 'barranquilla'],
  ['BaRrAnQuIlLa', 'barranquilla', 'barranquilla'],
  ['sta marta', 'sta marta', 'santa marta'],
  ['Sta Marta', 'sta marta', 'santa marta'],
  ['Santa Marta', 'santa marta', 'santa marta'],
  ['San Jos\u00e9 de C\u00facuta', 'san jose de cucuta', 'san jose de cucuta'],
  ['Cali  Valle', 'cali valle', 'cali valle'],
  ['Pasto  (Nari\u00f1o)', 'pasto narino', 'pasto narino'],
  ['', '', ''],
  [null, '', '']
];
GEO_FIXTURE.forEach(function(f) {
  var norm = M.normGeo(f[0]);
  var alias = M.normGeoAlias(norm);
  check('B: normGeo(' + JSON.stringify(f[0]) + ') -> "' + f[1] + '"',
    norm === f[1], 'got "' + norm + '"');
  check('B: normGeoAlias(' + JSON.stringify(norm) + ') -> "' + f[2] + '"',
    alias === f[2], 'got "' + alias + '"');
});

// ====================================================================
// C. construirOrigenUsuario (api/usuarios.js) - estados del ADR-058
// ====================================================================
var usr = cargarApi('api/usuarios.js', ['normTrimOrigen', 'construirOrigenUsuario']);
var CU = usr.mod.construirOrigenUsuario;

// (C1) Sin datos: fila vacia o fila null.
var v1 = CU({}, 7);
check('C1a: sin datos -> elegible=false, tier_base=null',
  v1.elegible === false && v1.tier_base === null);
check('C1b: sin datos -> ciudad/pais null y sin extranjero',
  v1.ciudad_base === null && v1.pais_base === null && v1.es_extranjero_verificado === false);
var v1n = CU(null, 7);
check('C1c: fila null -> sin datos (elegible=false, tier_base=null)',
  v1n.elegible === false && v1n.tier_base === null);

// (C2) Solo pais CO sin ciudad: elegible pero tier_base null.
var v2 = CU({ pais_base: ' co ' }, 7);
check('C2: solo pais CO -> elegible=true y tier_base=null',
  v2.elegible === true && v2.tier_base === null && v2.pais_base === 'CO');

// (C3) CO + ciudad: tier_base='co' y trim de ciudad.
var v3 = CU({ ciudad_base: '  Medellin  ' }, 7);
check('C3: CO + ciudad -> tier_base=co con trim de ciudad',
  v3.elegible === true && v3.tier_base === 'co'
  && v3.ciudad_base === 'Medellin' && v3.pais_base === null);

// (C4) Extranjero verificado.
var v4 = CU({ pais_base: 'ar', ciudad_base: 'Buenos Aires', email_verificado: true }, 7);
check('C4: extranjero verificado -> tier_base=extranjero y es_extranjero_verificado=true',
  v4.tier_base === 'extranjero' && v4.es_extranjero_verificado === true
  && v4.elegible === true && v4.pais_base === 'AR');

// (C5) Extranjero sin email verificado.
var v5 = CU({ pais_base: 'AR', email_verificado: false }, 7);
check('C5: extranjero sin email -> es_extranjero_verificado=false',
  v5.tier_base === 'extranjero' && v5.es_extranjero_verificado === false);
var v5b = CU({ pais_base: 'MX', email_verificado: 'true' }, 7);
check('C5b: email_verificado "true" (string) no cuenta como verificado',
  v5b.es_extranjero_verificado === false);

// (C6) Cooldown por dias: origen_declarado_en ~6 dias atras.
var hace6d = new Date(Date.now() - 6 * 86400000 - 60000).toISOString();
var v6 = CU({ ciudad_base: 'Cali', pais_base: 'CO', origen_declarado_en: hace6d }, 7);
check('C6a: dias_origen_declarado=6 y min_dias_cuenta=7',
  v6.dias_origen_declarado === 6 && v6.min_dias_cuenta === 7,
  'dias=' + v6.dias_origen_declarado + ' min=' + v6.min_dias_cuenta);
check('C6b: origen_declarado_en se conserva en el objeto',
  v6.origen_declarado_en === hace6d);
var manana = new Date(Date.now() + 86400000).toISOString();
var v6f = CU({ ciudad_base: 'Cali', origen_declarado_en: manana }, 7);
check('C6c: declaracion futura -> dias_origen_declarado=0',
  v6f.dias_origen_declarado === 0);

// (C7) min_dias_cuenta: comportamiento REAL del codigo. null/undefined
// entra a numXp -> 0 (edge del fallback); negativo cae al fallback 7;
// un valor valido se respeta.
var v7a = CU({ ciudad_base: 'Cali' }, null);
var v7b = CU({ ciudad_base: 'Cali' }, -3);
var v7c = CU({ ciudad_base: 'Cali' }, 12);
check('C7: min_dias_cuenta null->0, negativo->7 (fallback), 12->12',
  v7a.min_dias_cuenta === 0 && v7b.min_dias_cuenta === 7 && v7c.min_dias_cuenta === 12,
  'got ' + v7a.min_dias_cuenta + '/' + v7b.min_dias_cuenta + '/' + v7c.min_dias_cuenta);

// normTrimOrigen puro.
check('C8: normTrimOrigen trimea y null -> string vacio',
  usr.mod.normTrimOrigen('  x  ') === 'x' && usr.mod.normTrimOrigen(null) === '');

// ====================================================================
// D. ASCII-SAFETY de los archivos tocados por el ADR-058 (ADR-002)
// ====================================================================
check('D1: api/interacciones.js ASCII-safe (0 bytes > 127)',
  bytesAltos('api/interacciones.js') === 0);
check('D2: api/usuarios.js ASCII-safe (0 bytes > 127)',
  bytesAltos('api/usuarios.js') === 0);
check('D3: api/admin.js ASCII-safe (0 bytes > 127)',
  bytesAltos('api/admin.js') === 0);

// ====================================================================
// E. ADMIN: 7 claves de config + 4 campos del payload (strings, sin ejecutar)
// ====================================================================
var admSrc = readSrc('api/admin.js');
var CLAVES_ORIGEN = ['factor_origen_local', 'factor_origen_nomada_max',
  'factor_origen_extranjero_max', 'origen_km_nomada', 'origen_km_extranjero',
  'origen_km_local', 'origen_min_dias_cuenta'];
CLAVES_ORIGEN.forEach(function(k, i) {
  check('E1.' + (i + 1) + ': admin.js contiene clave de config "' + k + '"',
    admSrc.indexOf(k) !== -1);
});
var CAMPOS_PAYLOAD = ['distribucion_origen', 'mult_origen_stats',
  'config_origen', 'alertas_origen'];
CAMPOS_PAYLOAD.forEach(function(f, i) {
  check('E2.' + (i + 1) + ': admin.js contiene campo de payload "' + f + '"',
    admSrc.indexOf(f) !== -1);
});
check('E3: admin.js declara ORIGEN_CONFIG_CLAVES y la rama salud_red',
  admSrc.indexOf('var ORIGEN_CONFIG_CLAVES = [') !== -1
  && admSrc.indexOf("recurso === 'salud_red'") !== -1);

// v7: editor admin de la curva de origen + umbrales anti-gaming ajustados.
check('E4: admin.js declara la rama POST ?recurso=gamificacion_config',
  admSrc.indexOf("recurso === 'gamificacion_config'") !== -1);
check('E5: admin.js usa el upsert idempotente de gamificacion_config',
  admSrc.indexOf('ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor') !== -1);
check('E6: admin.js valida la coherencia Local <= Nomada <= Extranjero',
  admSrc.indexOf('COHERENCIA_INVALIDA') !== -1);
check('E7: admin.js degrada 503 SCHEMA_NOT_MIGRATED si falta el esquema',
  admSrc.indexOf('SCHEMA_NOT_MIGRATED') !== -1
  && admSrc.indexOf('esquemaAusente(eGC)') !== -1);
check('E8: umbrales de concentracion ajustados (85 pct / 500 XP)',
  admSrc.indexOf('var ORIGEN_CONCENTRACION_PCT = 85;') !== -1
  && admSrc.indexOf('var ORIGEN_CONCENTRACION_MIN_XP = 500;') !== -1);
check('E9: piso de >= 3 cuentas con mult_origen > 1.2',
  admSrc.indexOf('var ORIGEN_CONCENTRACION_MIN_CUENTAS = 3;') !== -1
  && admSrc.indexOf('cuentasBon >= ORIGEN_CONCENTRACION_MIN_CUENTAS') !== -1);
check('E10: admin.js declara ORIGEN_CONFIG_SPEC (whitelist de escritura)',
  admSrc.indexOf('var ORIGEN_CONFIG_SPEC = [') !== -1);

// ====================================================================
// SELF
// ====================================================================
var selfRel = 'scripts/smoke_058_origen_clasificador.js';
var selfSrc = readSrc(selfRel);
check('SELF: smoke_058 ASCII-safe (0 bytes > 127)',
  bytesAltos(selfRel) === 0);
check('SELF: smoke_058 con 0 backticks', !tieneBacktick(selfSrc));

// ====================================================================
// Cierre
// ====================================================================
var total = passed + failed;
console.log('');
console.log('=== SMOKE 058 ORIGEN CLASIFICADOR (ADR-058, sin BD) ===');
console.log('Checks: ' + total + ' total, ' + passed + ' PASS, ' + failed + ' FAIL');
if (failed === 0) console.log('SMOKE 058 ORIGEN CLASIFICADOR: OK');
else console.log('SMOKE 058 ORIGEN CLASIFICADOR: ' + failed + ' FALLO(S)');