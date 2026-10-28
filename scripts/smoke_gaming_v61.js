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
// ADR-107 D15: el fallback de codigo debe igualar el DEFAULT real de la columna
// (027). Se DERIVAN los dos numeros del codigo real en vez de duplicar el
// literal, para que el check siga midiendo la igualdad y no una foto del valor.
var mig027 = read('db/migrations/027_zonas_marcas.sql');
var mCteDef = srcUsu.match(/MARCA_NIVEL_REQUERIDO_DEFAULT\s*=\s*(\d+)/);
var mColDef = mig027.match(/nivel_requerido\s+INTEGER\s+NOT NULL\s+DEFAULT\s+(\d+)/);
check('G3: Marca lee marcas.nivel_requerido y su fallback iguala el DEFAULT de la columna (027)',
  srcUsu.indexOf('marcas.nivel_requerido') !== -1
  && !!mCteDef && !!mColDef && mCteDef[1] === mColDef[1]);

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
// ADR-006: la lista se contrasto contra el archivo REAL. El brief hablaba de
// ~92 ramas, pero api/interacciones.js declara 8 ramas tipo2 === 'carta_*';
// se listan las 8 (5 historicas + 3 de la entrega museo/fusion/drop).
var ramasCartas = ['carta_evento_usar', 'carta_intercambiar', 'carta_publicar',
  'carta_comprar', 'carta_cancelar', 'carta_equipar_museo', 'carta_fusionar',
  'carta_obtener_drop'];
check('C2: existen las 8 ramas carta_* (5 historicas + museo/fusion/drop)',
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

// === 7. SISTEMA DE CARTAS v6.1: emisor / variante / museo / fusion / drop ===
// Estatico: lee fuente real, nunca conecta a Neon (sin DATABASE_URL aqui).
var srcMercado = read('mercado.js');
var srcCartasUi = read('cartas-ui.js');
var srcCssCartas = read('cartas-ui.css');
var srcMiPerfil = read('mi-perfil.html');
var srcPerfil = read('perfil.html');

// 7.1 ramas nuevas: cada una responde a su tipo2
check('X1: las 3 ramas nuevas responden a su tipo2 (museo / fusion / drop)',
  ramasCartas.every(function(r) {
    return srcInt.indexOf("tipo2 === '" + r + "'") !== -1;
  }));

// 7.2 usuarios.js: museo_cartas presente, museo_publico erradicado
check('X2: api/usuarios.js expone museo_cartas y no queda museo_publico',
  srcUsu.indexOf('museo_cartas') !== -1
  && contar(srcUsu, /museo_publico/g) === 0);

// 7.3 PK con variante: ON CONFLICT migrado en interacciones
check('X3: ON CONFLICT (usuario_id, carta_id, variante) >= 3 y el par viejo = 0',
  contar(srcInt, /ON CONFLICT \(usuario_id, carta_id, variante\)/g) >= 3
  && contar(srcInt, /ON CONFLICT \(usuario_id, carta_id\)/g) === 0);

// 7.4 el album no duplica cartas: agrega por c.id
check('X4: cartas_mias agrega por carta con COUNT(DISTINCT c.id)',
  contar(srcUsu, /COUNT\(DISTINCT c\.id\)/g) >= 1);

// 7.5 CartasUI.urlMuseo apunta a la rama correcta (no al arbol de casas)
var iUrlMuseo = srcCartasUi.indexOf('function urlMuseo(');
var urlMuseoBlock = iUrlMuseo === -1 ? '' : srcCartasUi.slice(iUrlMuseo, iUrlMuseo + 400);
check('X5: CartasUI.urlMuseo usa tipo=museo_cartas y no museo_publico',
  urlMuseoBlock.indexOf('tipo=museo_cartas') !== -1
  && urlMuseoBlock.indexOf('museo_publico') === -1);

// 7.6 ADR-004: el silo CSS no cuelga de :root
check('X6: cartas-ui.css sin :root como selector (ADR-004)',
  contar(srcCssCartas, /(^|[\s,}*]):root\s*\{/gm) === 0
  && srcCssCartas.indexOf('.cartas-silo') !== -1);

// 7.7 coste de fusion: lo emite el servidor y la UI lo lee, sin literal
check('X7: coste de fusion leido de fusion_coste_xp (sin 200 literal en la UI)',
  srcUsu.indexOf('fusion_coste_xp: CARTA_FUSION_XP') !== -1
  && srcMiPerfil.indexOf('c.fusion_coste_xp') !== -1
  && contar(srcMiPerfil, /coste\s*=\s*200/g) === 0);

// 7.8-7.10 fusion: decremento con lock, validacion y cobro con guard
var iCem = srcInt.indexOf("if (tipo2 === 'carta_equipar_museo')");
var iFus = srcInt.indexOf("if (tipo2 === 'carta_fusionar')");
var iCod = srcInt.indexOf("if (tipo2 === 'carta_obtener_drop')");
var cemBlock = (iCem === -1 || iFus === -1) ? '' : srcInt.slice(iCem, iFus);
var fusBlock = (iFus === -1 || iCod === -1) ? '' : srcInt.slice(iFus, iCod);
var codBlock = iCod === -1 ? '' : srcInt.slice(iCod, iCod + 12000);

check('X8: la fusion exige cantidad >= 4 bajo FOR UPDATE y RETURNING',
  fusBlock.indexOf('cantidad >= 4') !== -1
  && fusBlock.indexOf('FOR UPDATE') !== -1
  && fusBlock.indexOf('RETURNING') !== -1);
check('X9: la fusion valida fusionable antes de cobrar (CARTA_NO_FUSIONABLE)',
  fusBlock.indexOf('fusionable !== true') !== -1
  && fusBlock.indexOf('CARTA_NO_FUSIONABLE') !== -1
  && fusBlock.indexOf('CARTAS_INSUFICIENTES') !== -1);
check('X10: la fusion cobra XP de usuarios.xp_total con guard de sumidero',
  fusBlock.indexOf('xp_total = u.xp_total - $3::numeric') !== -1
  && fusBlock.indexOf('xp_gastado_sinks') !== -1
  && fusBlock.indexOf('XP_INSUFICIENTE') !== -1);
check('X11: FUSION_PENDIENTE solo en el camino de degradacion por esquema',
  contar(srcInt, /'FUSION_PENDIENTE'/g) === 1
  && contar(srcInt, /esEsquemaFaltante\([^)]*\)\) return responderFusionPendiente/g) >= 2);

// 7.11 museo: hueco autoasignado; el tope 12 NO se autoriza por COUNT(*)
check('X12: el museo autoasigna el primer hueco (generate_series) sin COUNT(*)',
  cemBlock.indexOf('generate_series(1, $4::int)') !== -1
  && cemBlock.indexOf('orden_museo = $4::smallint') !== -1
  && contar(cemBlock, /COUNT\(\*\)/g) === 0);

// 7.12 drop: gate ANTES de escribir + idempotencia por drop_en IS NULL
var iGateCod = codBlock.indexOf("'GATE_NO_ALCANZADO'");
var iInsCod = codBlock.indexOf('ON CONFLICT (usuario_id, nivel_gate)');
check('X13: el gate se comprueba ANTES del INSERT (GATE_NO_ALCANZADO previo)',
  iGateCod !== -1 && iInsCod !== -1 && iGateCod < iInsCod
  && codBlock.indexOf('calcularNivelVisibleLocal') !== -1);
check('X14: drop idempotente con WHERE cartas_gates.drop_en IS NULL',
  codBlock.indexOf('DO UPDATE SET drop_en = now() WHERE cartas_gates.drop_en IS NULL') !== -1
  && codBlock.indexOf('ON CONFLICT (usuario_id, carta_id, variante)') !== -1);

// 7.13 mercado: libro de cartas con variante
check('X15: mercado.js lee el libro de cartas con variante (cartas_ofertas)',
  srcMercado.indexOf('cartas_ofertas') !== -1
  && srcMercado.indexOf('variante') !== -1);
check('X16: GET cartas_ofertas ampliado sigue en interacciones (sin endpoint nuevo)',
  contar(srcInt, /cartas_ofertas/g) >= 3);

// 7.14 paginas: perfil usa CartasUI.fetchMuseo y conserva el arbol de casas
check('X17: perfil.html no llama museo_cartas a mano (usa CartasUI.fetchMuseo)',
  srcPerfil.indexOf('fetchMuseo') !== -1
  && srcPerfil.indexOf('museo_cartas') === -1);
check('X18: el museo_publico del arbol de casas sigue intacto en perfil.html',
  srcPerfil.indexOf('tipo=museo_publico') !== -1);

// 7.15 ASCII-safety y cero backticks en serverless
check('X19: cartas-ui.js / cartas-ui.css / mercado.js ASCII-safe (0 bytes > 127)',
  bytesAltos('cartas-ui.js') === 0 && bytesAltos('cartas-ui.css') === 0
  && bytesAltos('mercado.js') === 0);
check('X20: cero backticks en serverless (interacciones / usuarios)',
  !tieneBacktick(srcInt) && !tieneBacktick(srcUsu));

// 7.16 migraciones 060/061 aplicadas como contrato de esquema
var m060 = migDe('060'), m061 = migDe('061');
var s060 = m060.length ? read('db/migrations/' + m060[0]) : '';
var s061 = m061.length ? read('db/migrations/' + m061[0]) : '';
check('X21: existen migraciones 060/061 y son ASCII-safe',
  m060.length >= 1 && m061.length >= 1
  && bytesAltos('db/migrations/' + m060[0]) === 0
  && bytesAltos('db/migrations/' + m061[0]) === 0);
check('X22: 060 arbitra el tope 12 por indice unico parcial + CHECK 1..12',
  s060.indexOf('ux_usuarios_cartas_museo_orden') !== -1
  && s060.indexOf('orden_museo BETWEEN 1 AND 12') !== -1);
check('X23: 061 depromueve la PK a (usuario_id, carta_id, variante)',
  s061.indexOf('DROP CONSTRAINT IF EXISTS usuarios_cartas_pkey') !== -1
  && s061.indexOf('variante') !== -1);

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
