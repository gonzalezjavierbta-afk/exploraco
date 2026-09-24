'use strict';
// smoke_origen_factor_parity.js
// Gate de paridad JS/SQL del multiplicador de origen por lejania (ADR-058
// seccion 8.3 / M-3). Corre contra Neon REAL (requiere DATABASE_URL en
// .env.local o el entorno). Verifica:
//   1) calcularFactorOrigen (JS, canonico) == sqlCurvaFactorOrigen (SQL) en
//      una matriz de tiers x distancias x configs (tolerancia 1e-6);
//   2) normGeo (JS) == sqlNormGeo (SQL) en un fixture de ciudades + alias;
//   3) haversineMetros/1000 (JS) == sqlHaversineKm (SQL);
//   4) sqlFactorFila (SQL, PER-ROW del Arbol) == el factor de calcularXpFinal
//      (JS) en fixtures: local, nacional con coords, nacional solo texto,
//      sin punto, extranjero, alias e INVERSO (N-4). Cubre el punto de
//      n_mapa_destinos;
//   5) match INVERSO (N-4): 'medellin antioquia' -> 'medellin',
//      'santa marta magdalena' -> 'santa marta' (buscarCoordsCiudad JS).
//
// Salida: exit 0 si TODO pasa; exit 1 si hay fallos o no hay DATABASE_URL.
// ASCII-safe (ADR-002): 0 bytes > 127, 0 backticks, CommonJS estricto.

var fs = require('fs');
var path = require('path');
var vm = require('vm');

require('./load_env_local')();

var TOL = 1e-6;
var total = 0;
var pass = 0;
var fail = 0;

function check(nombre, cond, detalle) {
  total++;
  if (cond) { pass++; console.log('PASS - ' + nombre); }
  else { fail++; console.log('FAIL - ' + nombre + (detalle ? ' :: ' + detalle : '')); }
}

function casi(a, b) {
  var x = Number(a), y = Number(b);
  if (!isFinite(x) || !isFinite(y)) return false;
  return Math.abs(x - y) <= TOL;
}

function sqlLit(s) {
  return "'" + String(s == null ? '' : s).replace(/'/g, "''") + "'";
}

// --- Cargador del api real en sandbox vm (ADN de smoke_017) --------------
// La fuente NO exporta internals: se inyectan como propiedades de
// module.exports para poder compararlos contra el SQL REAL de Neon.
function cargarApi(fileRel, exposes) {
  var fakeNeon = { neon: function() { return function() { return []; }; } };
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
    setInterval: setInterval,
    clearInterval: clearInterval
  };
  sandbox.exports = sandbox.module.exports;
  vm.createContext(sandbox);
  var code = fs.readFileSync(path.join(__dirname, '..', fileRel), 'utf8');
  var inject = '';
  (exposes || []).forEach(function(name) {
    inject += '\nmodule.exports.' + name + ' = ' + name + ';';
  });
  vm.runInContext(code + inject, sandbox, { filename: fileRel });
  return sandbox.module.exports;
}

function urlValida(raw) {
  if (raw === undefined || raw === null || String(raw).trim() === '') return null;
  var s = String(raw).trim();
  if (s.indexOf('...') !== -1) return null;
  if (!/^postgres(ql)?:\/\/[^\s@]+@[^\s/]+\/.+$/.test(s)) return null;
  return s;
}

var I = cargarApi('api/interacciones.js', [
  'normGeo', 'sqlNormGeo', 'haversineMetros', 'normalizarCfgOrigen',
  'calcularFactorOrigen', 'sqlCurvaFactorOrigen', 'sqlHaversineKm',
  'sqlFactorOrigen', 'sqlFactorFila', 'buscarCoordsCiudad', 'calcularXpFinal'
]);

var url = urlValida(process.env.DATABASE_URL);
var neon = null;
try { neon = require('@neondatabase/serverless').neon; }
catch (e) { neon = null; }

if (!url || !neon) {
  console.log('FAIL - smoke de paridad requiere DATABASE_URL real (Neon).');
  console.log('       Configura .env.local o exporta DATABASE_URL y reintenta.');
  process.exit(1);
}
var sql = neon(url);

// =====================================================================
// 1. MATRIZ DE LA CURVA: calcularFactorOrigen (JS) vs sqlCurvaFactorOrigen
// =====================================================================
var TIERS = ['local', 'nomada', 'extranjero', null];
var DISTS = [0, 250, 500, 1000, 1500, 3000, 9999];
var CONFIGS = [
  { n: 'default', cfg: {} },
  { n: 'custom', cfg: {
    factorOrigenLocal: 1.05,
    factorOrigenNomadaMax: 1.25,
    factorOrigenExtranjeroMax: 1.5,
    origenKmNomada: 800,
    origenKmExtranjero: 2500,
    origenKmLocal: 30
  } }
];

var curvaJs = [];
var curvaExpr = [];
var curvaLabel = [];
var k = 0;
TIERS.forEach(function(tier) {
  DISTS.forEach(function(d) {
    CONFIGS.forEach(function(c) {
      curvaJs.push(I.calcularFactorOrigen(tier, d, c.cfg));
      curvaExpr.push(I.sqlCurvaFactorOrigen(tier, String(d), c.cfg) + ' AS f' + k);
      curvaLabel.push('tier=' + tier + ' d=' + d + ' cfg=' + c.n);
      k++;
    });
  });
});

function evalBatch(exprs) {
  return sql('SELECT ' + exprs.join(', '), []).then(function(rows) {
    return (rows && rows[0]) || {};
  });
}

// =====================================================================
// 2. normGeo (JS) vs sqlNormGeo (SQL)
// =====================================================================
var CIUDADES = [
  'Bogota D.C.', 'Bogota', 'bogota d c', 'Medellin', 'Medellin, Antioquia',
  'Barranquilla', 'b/quilla', 'Bquilla', 'Santa Marta', 'Sta Marta',
  'Cartagena', 'Cartagena de Indias', 'Cucuta', 'San Jose de Cucuta',
  'Cali', 'Santiago de Cali', 'Pasto', 'Villavicencio', 'Bucaramanga',
  'Pereira', 'Manizales', 'Armenia', 'Ibague', 'Neiva', 'Popayan',
  'Monteria', 'Sincelejo', 'Valledupar', 'Riohacha', 'Narino'
];

function correrCurvaYNorm() {
  var exprs = curvaExpr.slice();
  CIUDADES.forEach(function(c, j) {
    exprs.push(I.sqlNormGeo(sqlLit(c)) + ' AS n' + j);
  });
  return evalBatch(exprs).then(function(row) {
    var i;
    for (i = 0; i < curvaJs.length; i++) {
      check('curva[' + curvaLabel[i] + ']', casi(curvaJs[i], row['f' + i]),
        'js=' + curvaJs[i] + ' sql=' + row['f' + i]);
    }
    for (i = 0; i < CIUDADES.length; i++) {
      var js = I.normGeo(CIUDADES[i]);
      check('normGeo[' + CIUDADES[i] + ']', js === row['n' + i],
        'js="' + js + '" sql="' + row['n' + i] + '"');
    }
  });
}

// =====================================================================
// 3. haversineMetros/1000 (JS) vs sqlHaversineKm (SQL)
// =====================================================================
var HAV = [
  [4.7110, -74.0721, 6.2442, -75.5812],
  [4.7110, -74.0721, 10.9685, -74.7813],
  [4.7110, -74.0721, 40.4637, -3.7492],
  [0, 0, 0, 0],
  [4.7110, -74.0721, 4.7110, -74.0721]
];

function correrHaversine() {
  var exprs = HAV.map(function(p, j) {
    return I.sqlHaversineKm(String(p[0]), String(p[1]), String(p[2]), String(p[3]))
      + ' AS h' + j;
  });
  return evalBatch(exprs).then(function(row) {
    HAV.forEach(function(p, j) {
      var js = I.haversineMetros(p[0], p[1], p[2], p[3]) / 1000;
      check('haversine[' + j + ']', casi(js, row['h' + j]),
        'js=' + js + ' sql=' + row['h' + j]);
    });
  });
}

// =====================================================================
// 4. PER-ROW: sqlFactorFila (SQL) vs calcularXpFinal (JS) en el Arbol
// =====================================================================
var BOG = { lat: 4.7110, lng: -74.0721 };
var MED = { lat: 6.2442, lng: -75.5812 };
var ES = { lat: 40.4637, lng: -3.7492 };
var CFG = {};
var ORIGEN_CO = { tier: 'co', coords: { lat: BOG.lat, lng: BOG.lng }, elegible: true, motivo: 'ok_co' };
var ORIGEN_EXT = { tier: 'extranjero', coords: { lat: ES.lat, lng: ES.lng }, elegible: true, motivo: 'ok_extranjero' };
var ORIGEN_NO = { tier: null, coords: null, elegible: false, motivo: 'sin_datos' };

function puntoFila(coords) {
  return coords ? { lat: coords.lat, lng: coords.lng } : undefined;
}

// Construye la expresion SQL de la fila a partir de coords/ciudad/NO.
function exprFila(coords, ciudad, origen) {
  var lat = coords ? String(coords.lat) : 'NULL';
  var lng = coords ? String(coords.lng) : 'NULL';
  var ciu = ciudad ? sqlLit(ciudad) : 'NULL';
  return I.sqlFactorFila(lat, lng, ciu, origen, CFG);
}

function jsFila(coordsOciudad, origen) {
  // coordsOciudad es {coords} ya resueltos (o null => sin punto).
  var punto = puntoFila(coordsOciudad);
  var ctx = Object.assign({}, CFG, { punto: punto, origen: origen });
  return I.calcularXpFinal(100, 1, null, null, ctx).mult_origen;
}

function correrPerRow() {
  // Fixtures: [nombre, coords|ciudad, origen]. Si el punto es texto, la
  // resolucion JS usa buscarCoordsCiudad (el MISMO matcher canonico).
  var pasos = [];
  pasos.push({ n: 'local coords', coords: BOG, origen: ORIGEN_CO });
  pasos.push({ n: 'local texto Bogota D.C.', ciudad: 'Bogota D.C.', origen: ORIGEN_CO });
  pasos.push({ n: 'nomada coords', coords: MED, origen: ORIGEN_CO });
  pasos.push({ n: 'nomada texto Medellin', ciudad: 'Medellin', origen: ORIGEN_CO });
  pasos.push({ n: 'mapa destino (destinos.lat/lng) N-2', coords: MED, origen: ORIGEN_CO });
  pasos.push({ n: 'sin punto', coords: null, origen: ORIGEN_CO });
  pasos.push({ n: 'extranjero coords', coords: BOG, origen: ORIGEN_EXT });
  pasos.push({ n: 'extranjero sin punto', coords: null, origen: ORIGEN_EXT });
  pasos.push({ n: 'alias b/quilla', ciudad: 'b/quilla', origen: ORIGEN_CO });
  // N-4: match INVERSO (el texto contiene el nombre del candidato) PER-ROW:
  // SQL (sqlFactorFila -> sqlCoordsCiudadSub) vs JS (buscarCoordsCiudad).
  pasos.push({ n: 'inverso medellin antioquia', ciudad: 'medellin antioquia', origen: ORIGEN_CO });
  pasos.push({ n: 'inverso santa marta magdalena', ciudad: 'santa marta magdalena', origen: ORIGEN_CO });
  pasos.push({ n: 'sin origen elegible', coords: MED, origen: ORIGEN_NO });

  var exprs = [];
  pasos.forEach(function(p, j) {
    if (p.ciudad) {
      exprs.push(exprFila(null, p.ciudad, p.origen) + ' AS r' + j);
    } else {
      exprs.push(exprFila(p.coords, null, p.origen) + ' AS r' + j);
    }
  });

  return evalBatch(exprs).then(function(row) {
    var tareas = pasos.map(function(p, j) {
      var espera;
      if (p.ciudad) {
        espera = I.buscarCoordsCiudad(sql, p.ciudad).then(function(c) {
          return jsFila(c, p.origen);
        });
      } else {
        espera = Promise.resolve(jsFila(p.coords, p.origen));
      }
      return espera.then(function(js) {
        check('per-row[' + p.n + ']', casi(js, row['r' + j]),
          'js=' + js + ' sql=' + row['r' + j]);
      });
    });
    return Promise.all(tareas);
  });
}

// =====================================================================
// 5. ALIAS (N-4): buscarCoordsCiudad resuelve los alias a la misma ciudad
// =====================================================================
function correrAlias() {
  return Promise.all([
    I.buscarCoordsCiudad(sql, 'b/quilla'),
    I.buscarCoordsCiudad(sql, 'bquilla'),
    I.buscarCoordsCiudad(sql, 'sta marta'),
    I.buscarCoordsCiudad(sql, 'bogota d c'),
    I.buscarCoordsCiudad(sql, 'Barranquilla'),
    I.buscarCoordsCiudad(sql, 'Santa Marta'),
    I.buscarCoordsCiudad(sql, 'Bogota')
  ]).then(function(r) {
    var bq = r[0], bq2 = r[1], sm = r[2], bg = r[3];
    var refBq = r[4], refSm = r[5], refBg = r[6];
    check('alias b/quilla -> Barranquilla',
      !!bq && !!refBq && casi(bq.lat, refBq.lat) && casi(bq.lng, refBq.lng));
    check('alias bquilla -> Barranquilla',
      !!bq2 && !!refBq && casi(bq2.lat, refBq.lat) && casi(bq2.lng, refBq.lng));
    check('alias sta marta -> Santa Marta',
      !!sm && !!refSm && casi(sm.lat, refSm.lat) && casi(sm.lng, refSm.lng));
    check('alias bogota d c -> Bogota',
      !!bg && !!refBg && casi(bg.lat, refBg.lat) && casi(bg.lng, refBg.lng));
    return I.buscarCoordsCiudad(sql, 'cucuta').then(function(cu) {
      return I.buscarCoordsCiudad(sql, 'San Jose de Cucuta').then(function(cuRef) {
        check('sufijo cucuta -> San Jose de Cucuta',
          !!cu && !!cuRef && casi(cu.lat, cuRef.lat) && casi(cu.lng, cuRef.lng));
      });
    });
  });
}

// =====================================================================
// 6. MATCH INVERSO (N-4): el texto contiene el nombre del candidato
//    ('medellin antioquia' -> 'medellin'; 'santa marta magdalena' ->
//    'santa marta'). Se compara contra la referencia del nombre exacto.
// =====================================================================
function correrInverso() {
  return Promise.all([
    I.buscarCoordsCiudad(sql, 'medellin antioquia'),
    I.buscarCoordsCiudad(sql, 'Medellin'),
    I.buscarCoordsCiudad(sql, 'santa marta magdalena'),
    I.buscarCoordsCiudad(sql, 'Santa Marta'),
    I.buscarCoordsCiudad(sql, 'bogota d c colombia'),
    I.buscarCoordsCiudad(sql, 'Bogota D.C.')
  ]).then(function(r) {
    var invMed = r[0], refMed = r[1], invSm = r[2], refSm = r[3], invBg = r[4], refBg = r[5];
    check('inverso "medellin antioquia" -> Medellin',
      !!invMed && !!refMed && casi(invMed.lat, refMed.lat) && casi(invMed.lng, refMed.lng));
    check('inverso "santa marta magdalena" -> Santa Marta',
      !!invSm && !!refSm && casi(invSm.lat, refSm.lat) && casi(invSm.lng, refSm.lng));
    check('inverso "bogota d c colombia" -> Bogota D.C.',
      !!invBg && !!refBg && casi(invBg.lat, refBg.lat) && casi(invBg.lng, refBg.lng));
  });
}

// =====================================================================
// Runner
// =====================================================================
correrCurvaYNorm()
  .then(correrHaversine)
  .then(correrPerRow)
  .then(correrAlias)
  .then(correrInverso)
  .then(function() {
    console.log('');
    console.log('=== SMOKE ORIGEN FACTOR PARITY (JS vs SQL, Neon real) ===');
    console.log('RESULTADO: ' + pass + '/' + total + ' PASS, ' + fail + ' FAIL');
    if (fail === 0) {
      console.log('SMOKE ORIGEN FACTOR PARITY: OK');
      process.exit(0);
    }
    console.log('SMOKE ORIGEN FACTOR PARITY: ' + fail + ' FALLO(S)');
    process.exit(1);
  })
  .catch(function(err) {
    console.log('FAIL - smoke lanzo error: ' + (err && err.message));
    process.exit(1);
  });
