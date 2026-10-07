'use strict';
// smoke_busqueda_parity.js
// Gate de paridad JS/SQL del normalizador de busqueda de ADR-090 D2.
//   Compara public.exploraco_norm(x) (SQL, migracion 053) contra normGeo(x)
//   (JS canonico, api/interacciones.js) fila a fila, sobre un corpus de BORDES.
//
// POR QUE EXISTE
//   ADR-090 D2: exploraco_norm es el UNICO origen de verdad de la normalizacion
//   y normGeo el espejo JS. Si divergen hay DOS busquedas distintas. El smoke es
//   precondicion de despliegue: SI EL SMOKE FALLA, LA 053 NO SE DESPLIEGA.
//
// PRE-REQUISITO
//   La migracion 053_busqueda_normalizada.sql aplicada en Neon (crea
//   public.exploraco_norm). Si no esta, el smoke falla con SQLSTATE 42883 y lo
//   dice: es el aviso legitimo de "aplicar la 053", no un falso negativo.
//
// FUERA DE ALCANCE (declarado)
//   NO compara exploraco_trgm contra un trigramas() JS completo (ese espejo vive
//   en busqueda.js, Wave 1). SI cubre, desde T3c, dos guardas de exploraco_trgm
//   (ADR-090 D1): (a) un caso conocido con trigramas esperados y (b) una guarda
//   de rendimiento con entrada larga (9000+ chars) y umbral de tiempo, para no
//   repetir el incidente de cuelgue detectado en T3c.
//
// USO
//   node scripts/smoke_busqueda_parity.js
//   Salida: N/N PASS + exit 0 (todo casa) o exit 1 (hay fallos / sin DATABASE_URL).
//
// ASCII-safe (ADR-002): 0 bytes > 127, 0 backticks, CommonJS estricto. Los
// diacriticos del corpus van como escapes \uXXXX, nunca como bytes directos.
var fs = require('fs');
var path = require('path');
var vm = require('vm');
var Module = require('module');

require('./load_env_local')();

// --- Cargador del api real en sandbox vm (mismo ADN que smoke_origen_factor_parity).
//     createRequire ata las dependencias internas a la ruta real del fichero,
//     de modo que require('../lib/score') de api/interacciones.js resuelva bien.
function cargarApi(fileRel, exposes) {
  var fakeNeon = { neon: function() { return function() { return []; }; } };
  var apiRequire = Module.createRequire(path.join(fileRel));
  var customRequire = function(request) {
    if (request === '@neondatabase/serverless') return fakeNeon;
    return apiRequire(request);
  };
  customRequire.resolve = apiRequire.resolve;
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
  var code = fs.readFileSync(fileRel, 'utf8');
  var inject = '';
  (exposes || []).forEach(function(name) {
    inject += '\nmodule.exports.' + name + ' = ' + name + ';';
  });
  vm.runInContext(code + inject, sandbox, { filename: fileRel });
  return sandbox.module.exports;
}

var RUTA_API = path.join(__dirname, '..', 'api', 'interacciones.js');
var I = cargarApi(RUTA_API, ['normGeo']);

// --- Corpus de BORDES (ADR-090: acentos latinos, enie, mayusculas, espacios
//     multiples y signos; se anaden vacio, numeros y no-descomponibles para
//     fijar tambien los casos en que ambos DEBEN tirar el caracter a espacio).
var CORPUS = [
  'Bogota D.C.', 'BOGOTA', 'bogota d c', 'Bogot\u00e1', 'BOGOT\u00c1', 'bogot\u00e1',
  'Medell\u00edn', 'MEDELL\u00cdN', 'C\u00facuta', 'CUCUTA', 'Bucaramanga',
  'ni\u00f1o', 'NI\u00d1O', 'Mu\u00f1oz', 'Pe\u00f1a',
  'a\u00e9\u00ed\u00f3\u00fa', '\u00e1\u00e9\u00ed\u00f3\u00fa', '\u00c1\u00c9\u00cd\u00d3\u00da',
  '\u00e0\u00e8\u00ec\u00f2\u00f9', '\u00c0\u00c8\u00cc\u00d2\u00d9',
  '\u00e2\u00ea\u00ee\u00f4\u00fb', '\u00c2\u00ca\u00ce\u00d4\u00db',
  '\u00fc', '\u00dc', 'ping\u00fcino', '\u00c4\u00d6\u00dc',
  'Cartagena de Indias', 'San Andres', 'Santiago de Cali',
  '  multiples   espacios  ', '\tespacios\tcon\ttabs\t',
  'signos!@#$%^&*()_+-=[]{};:,.<>?/',
  '', '   ', '123', 'Cali 123', 'A1B2C3', 'Calle 100 # 15-20',
  'a\u0301', '\u00f8ster', '\u00df', 'Stra\u00dfe', '\u00c6on', '\u0152uvre',
  '\u0130stanbul', 'man\u0101', '\u015bl\u0105sk', 'ph\u1ed1', 'H\u00e0 N\u1ed9i'
];

// --- Guardas de exploraco_trgm (ADR-090 D1) anadidas en T3c.
//     Caso conocido: pad('  abc ') -> ventanas de 3, unicas y ordenadas.
//     Guarda de rendimiento: la version defectuosa re-evaluaba exploraco_norm
//     por fila de generate_series y colgaba (>40 s) con cadenas largas.
var TRGM_CASO = 'abc';
var TRGM_CASO_ESPERADO = ['  a', ' ab', 'abc', 'bc '];
var TRGM_LARGO_LEN = 9267;
var TRGM_UMBRAL_MS = 3000;

function urlValida(raw) {
  if (raw === undefined || raw === null || String(raw).trim() === '') return null;
  var s = String(raw).trim();
  if (s.indexOf('...') !== -1) return null;
  if (!/^postgres(ql)?:\/\/[^\s@]+@[^\s/]+\/.+$/.test(s)) return null;
  return s;
}

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

var total = 0;
var pass = 0;
var fail = 0;

function repr(s) { return JSON.stringify(s); }

(async function () {
  for (var i = 0; i < CORPUS.length; i++) {
    var x = CORPUS[i];
    var jsVal = I.normGeo(x);
    var rows;
    try {
      rows = await sql('SELECT public.exploraco_norm($1::text) AS n', [x]);
    } catch (e) {
      var code = (e && e.code) ? String(e.code) : 'n/a';
      if (code === '42883') {
        console.log('FAIL - public.exploraco_norm no existe (SQLSTATE 42883).');
        console.log('       Aplica primero db/migrations/053_busqueda_normalizada.sql.');
        process.exit(1);
      }
      console.log('FAIL - consulta abortada: SQLSTATE ' + code + ' -> ' + (e && e.message));
      process.exit(1);
    }
    var dbVal = (rows && rows[0]) ? rows[0].n : null;
    total++;
    var ok = (dbVal === jsVal);
    if (ok) { pass++; }
    else { fail++; }
    console.log((ok ? 'PASS' : 'FAIL') + ' [' + (i + 1) + '] ' + repr(x)
      + ' js=' + repr(jsVal) + ' db=' + repr(dbVal));
  }

  // --- (T3c) Gate de exploraco_trgm: (a) caso conocido + (b) rendimiento largo.
  try {
    var casoRows = await sql('SELECT public.exploraco_trgm($1::text) AS t', [TRGM_CASO]);
    var casoDb = (casoRows && casoRows[0] && casoRows[0].t) ? casoRows[0].t : null;
    var casoOk = (JSON.stringify(casoDb) === JSON.stringify(TRGM_CASO_ESPERADO));
    total++;
    if (casoOk) { pass++; } else { fail++; }
    console.log((casoOk ? 'PASS' : 'FAIL') + ' [trgm.caso] ' + repr(TRGM_CASO)
      + ' db=' + JSON.stringify(casoDb) + ' esperado=' + JSON.stringify(TRGM_CASO_ESPERADO));
  } catch (e) {
    var ec = (e && e.code) ? String(e.code) : 'n/a';
    if (ec === '42883') {
      console.log('FAIL - public.exploraco_trgm no existe (SQLSTATE 42883).');
      console.log('       Aplica primero db/migrations/053_busqueda_normalizada.sql.');
      process.exit(1);
    }
    console.log('FAIL - exploraco_trgm(' + repr(TRGM_CASO) + ') abortado: SQLSTATE ' + ec);
    total++; fail++;
  }

  try {
    var t0 = Date.now();
    var largoRows = await sql('SELECT public.exploraco_trgm(repeat($1, $2::int)) AS t', ['a', TRGM_LARGO_LEN]);
    var elapsed = Date.now() - t0;
    var largoArr = (largoRows && largoRows[0] && largoRows[0].t) ? largoRows[0].t : [];
    var perfOk = (elapsed < TRGM_UMBRAL_MS) && (largoArr.indexOf('aaa') !== -1);
    total++;
    if (perfOk) { pass++; } else { fail++; }
    console.log((perfOk ? 'PASS' : 'FAIL') + ' [trgm.perf] len=' + TRGM_LARGO_LEN
      + ' ' + elapsed + ' ms (umbral ' + TRGM_UMBRAL_MS + ' ms) n=' + largoArr.length);
  } catch (e) {
    var ep = (e && e.code) ? String(e.code) : 'n/a';
    console.log('FAIL - guarda de rendimiento exploraco_trgm abortada: SQLSTATE ' + ep);
    total++; fail++;
  }

  console.log('');
  console.log('=== SMOKE BUSQUEDA PARITY (exploraco_norm vs normGeo, Neon real) ===');
  console.log('RESULTADO: ' + pass + '/' + total + ' PASS, ' + fail + ' FAIL');
  if (fail === 0) {
    console.log('SMOKE BUSQUEDA PARITY: OK');
    process.exit(0);
  }
  console.log('SMOKE BUSQUEDA PARITY: ' + fail + ' FALLO(S) -- la 053 NO se despliega');
  process.exit(1);
})().catch(function (e) {
  console.log('FAIL - smoke lanzo error: ' + (e && e.message));
  process.exit(1);
});
