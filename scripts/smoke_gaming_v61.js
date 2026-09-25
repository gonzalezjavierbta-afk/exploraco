// scripts/smoke_gaming_v61.js
// Smoke ESTATICO (sin red, sin DB) del contrato "Gaming v6.1": referidos
// 10%, gates de Clase/Casa/Marca, dividendo del Own-the-Spot con tope y
// debito con saldo, cartas sin DELETE, cero endpoints nuevos y migraciones
// 039/040/041 ASCII-safety. Lee los archivos REALES (ADR-006) y nunca toca
// Neon; solo verifica constantes/ramas por texto.
//
// ASCII-safe (ADR-002): 0 bytes > 127, 0 backticks. CommonJS (BUG-001).
// Run: node scripts/smoke_gaming_v61.js
'use strict';

var path = require('path');
var fs = require('fs');

var ROOT = path.join(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); }
function bytesAltos(rel) {
  var b = fs.readFileSync(path.join(ROOT, rel));
  var high = 0;
  for (var i = 0; i < b.length; i++) { if (b[i] > 127) high++; }
  return high;
}
function tieneBacktick(s) { return s.indexOf(String.fromCharCode(96)) !== -1; }
function contar(src, re) { var m = String(src).match(re); return m ? m.length : 0; }

var passed = 0;
var failed = 0;
function check(label, cond) {
  if (cond) { passed++; console.log('PASS - ' + label); }
  else { failed++; console.log('FAIL - ' + label); }
}

var srcInt = read('api/interacciones.js');
var srcUsu = read('api/usuarios.js');
var srcMig040 = read('db/migrations/040_gobernanza_cartas_moneda.sql');

// === 1. REFERIDOS 10% (ADR-060): 5 escalones 5/2.5/1.5/0.5/0.5 = 0.10 ===
var iRef = srcInt.indexOf('function repartirXpReferidos(');
var refBlock = iRef === -1 ? '' : srcInt.slice(iRef, iRef + 1600);
check('R1: existe repartirXpReferidos con WITH RECURSIVE cadena',
  refBlock.length > 0 && refBlock.indexOf('WITH RECURSIVE cadena') !== -1);

var caseIdx = refBlock.indexOf('CASE c.nivel WHEN');
var caseTxt = caseIdx === -1 ? '' : refBlock.slice(caseIdx, caseIdx + 200);
var pcts = caseTxt.match(/0\.\d+/g) || [];
check('R2: CASE con los 5 escalones exactos 0.05/0.025/0.015/0.005/0.005',
  JSON.stringify(pcts) === '["0.05","0.025","0.015","0.005","0.005"]');
var sumaPct = pcts.reduce(function(a, b) { return a + Number(b); }, 0);
check('R3: la suma de los escalones es 0.10 (10%)',
  pcts.length === 5 && Math.abs(sumaPct - 0.10) < 1e-9);
check('R4: la recursion de la cadena esta topeada a 5 niveles (cadena.nivel < 5)',
  refBlock.indexOf('cadena.nivel < 5') !== -1);
check('R5: el reparto usa ROUND half-up (ADR-035)',
  refBlock.indexOf('ROUND') !== -1);

// === 2. GATES: Clase@3, Casa@5, Marca@6 (marcas.nivel_requerido) ===
var reCasa = /(?:ceNivelAnt|calcularNivel\([^)]*\)\.nivel)\s*<\s*5/;
var reClase = /(?:clNivelAnt|calcularNivel\([^)]*\)\.nivel)\s*<\s*3/;
check('G1: Casa exige nivel derivado >= 5 (ceNivelAnt < 5 + nivel_requerido 5)',
  reCasa.test(srcUsu) && srcUsu.indexOf('nivel_requerido: 5') !== -1);
check('G2: Clase exige nivel derivado >= 3 (clNivelAnt < 3 + nivel_requerido 3)',
  reClase.test(srcUsu) && srcUsu.indexOf('nivel_requerido: 3') !== -1);
check('G3: Marca lee marcas.nivel_requerido con default 6',
  srcUsu.indexOf('marcas.nivel_requerido') !== -1
  && srcUsu.indexOf('MARCA_NIVEL_REQUERIDO_DEFAULT = 6') !== -1);

// === 3. OWN THE SPOT: dividendo DESCUENTO con tope + debito exige saldo ===
check('S1: tope del dividendo en codigo (0.50 + red2ConTopeSpin)',
  srcInt.indexOf('DIVIDENDO_SPOT_TOPE_PCT = 0.50') !== -1
  && srcInt.indexOf('function red2ConTopeSpin(') !== -1);
check('S2: CHECK chk_spot_dividendos_tope <= xp_bruto_base * 0.50 (migracion 040)',
  srcMig040.indexOf('chk_spot_dividendos_tope') !== -1
  && srcMig040.indexOf('xp_bruto_base * 0.50') !== -1);

var iDiv = srcInt.indexOf('function aplicarDividendoSpot(');
var divBlock = iDiv === -1 ? '' : srcInt.slice(iDiv, iDiv + 9000);
check('S3: el dividendo es DESCUENTO (xp_total = xp_total - $7::numeric)',
  divBlock.indexOf('xp_total = xp_total - $7::numeric') !== -1);
check('S4: el debito exige saldo (xp_total >= $7::numeric + saldo_insuficiente)',
  divBlock.indexOf('xp_total >= $7::numeric') !== -1
  && divBlock.indexOf('saldo_insuficiente') !== -1);

// === 4. CARTAS: ramas carta_* apagan con activo=false (CERO DELETE) ===
check('C1: cero DELETE FROM usuarios_cartas',
  contar(srcInt, /DELETE FROM usuarios_cartas/g) === 0);
var ramasCartas = ['carta_evento_usar', 'carta_intercambiar', 'carta_publicar',
  'carta_comprar', 'carta_cancelar'];
check('C2: existen las 5 ramas carta_*',
  ramasCartas.every(function(r) {
    return srcInt.indexOf("tipo2 === '" + r + "'") !== -1;
  }));
check('C3: el stock a 0 se apaga con activo=false (THEN false ELSE activo END)',
  contar(srcInt, /THEN false ELSE activo END/g) >= 3);

// === 5. CERO ENDPOINTS NUEVOS: api/ tiene exactamente 8 .js ===
var apiJs = fs.readdirSync(path.join(ROOT, 'api')).filter(function(f) {
  return /\.js$/.test(f);
});
check('E1: api/ tiene exactamente 8 archivos .js', apiJs.length === 8);

// === 6. MIGRACIONES 039/040/041 presentes y ASCII-safe ===
var migFiles = fs.readdirSync(path.join(ROOT, 'db', 'migrations'));
function migDe(pref) {
  return migFiles.filter(function(f) {
    return f.indexOf(pref) === 0 && /\.sql$/.test(f);
  });
}
var m039 = migDe('039'), m040 = migDe('040'), m041 = migDe('041');
check('M1: existen migraciones 039/040/041',
  m039.length >= 1 && m040.length >= 1 && m041.length >= 1);
var migAscii = [m039[0], m040[0], m041[0]].every(function(f) {
  return !!f && bytesAltos('db/migrations/' + f) === 0;
});
check('M2: 039/040/041 son ASCII-safe (0 bytes > 127)', migAscii);

// === SELF ===
var selfRel = 'scripts/smoke_gaming_v61.js';
check('SELF: smoke_gaming_v61 ASCII-safe (0 bytes > 127)', bytesAltos(selfRel) === 0);
check('SELF: smoke_gaming_v61 con 0 backticks', !tieneBacktick(read(selfRel)));

// === RESULTADO ===
var total = passed + failed;
console.log('');
console.log('=== SMOKE GAMING v6.1 (estatico) ===');
if (failed === 0) {
  console.log('PASS ' + passed + '/' + total);
} else {
  console.log('FAIL ' + passed + '/' + total);
  process.exit(1);
}
