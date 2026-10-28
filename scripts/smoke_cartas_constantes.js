// scripts/smoke_cartas_constantes.js
// GATE de las constantes del sistema de cartas (ADR-108 D9/D10).
//
// QUE VIGILA: que las constantes compartidas del sistema de cartas vivan UNA
// sola vez, en lib/cartas-config.js, y que ningun handler vuelva a declararlas
// con un literal propio. El riesgo que cubre no es cosmetico: el coste de la
// fusion se COBRA en api/interacciones.js y se ANUNCIA en api/usuarios.js
// (fusion_coste_xp). Si cada fichero lleva su 200, cambiar uno deja el otro
// derivando en silencio y la UI promete un precio distinto del que cobra. El
// tope del museo sufre lo mismo (1..12).
//
// QUE NO VIGILA: la autoridad del tope sigue en la BASE
// (chk_usuarios_cartas_museo + ux_usuarios_cartas_museo_orden); este gate solo
// comprueba el espejo numerico del lado JS. Tampoco valida comportamiento de
// las ramas: eso es smoke_gamificacion / smoke_mercado.
//
// Es ESTATICO: no abre DATABASE_URL, no hace red, solo lee fuentes. Corre en
// $0 (ADR-082) y por eso puede entrar en la cadena de npm run test.
//
// ASCII-safe (ADR-002), CommonJS (BUG-001), 0 backticks.
// Run: node scripts/smoke_cartas_constantes.js

'use strict';

var fs = require('fs');
var path = require('path');

var ROOT = path.join(__dirname, '..');
var LIB = 'lib/cartas-config.js';
var INTER = 'api/interacciones.js';
var USU = 'api/usuarios.js';

var total = 0;
var pass = 0;
var fails = 0;
function ok(label) { total++; pass++; console.log('PASS - ' + label); }
function ko(label, detalle) {
  total++; fails++;
  console.log('FAIL - ' + label + (detalle ? ' :: ' + detalle : ''));
}
function assert(cond, label, detalle) {
  if (cond) ok(label); else ko(label, detalle);
}
function leer(rel) { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); }
function cuenta(texto, re) {
  var m = texto.match(re);
  return m ? m.length : 0;
}

console.log('=== SMOKE CARTAS CONSTANTES (ADR-108 D9/D10, sin BD) ===');
console.log('');

// --- (0) Las fuentes existen y se pueden leer -------------------------------
var fuentes = {};
var faltan = [];
[LIB, INTER, USU].forEach(function (rel) {
  try { fuentes[rel] = leer(rel); }
  catch (e) { faltan.push(rel + ' (' + (e && e.code) + ')'); }
});
assert(faltan.length === 0, 'las 3 fuentes existen y son legibles', faltan.join(', '));
if (faltan.length) {
  console.log('');
  console.log('RESULTADO: FAIL - ' + fails + ' de ' + total + ' verificaciones fallaron.');
  process.exit(1);
}

var tLib = fuentes[LIB];
var tInter = fuentes[INTER];
var tUsu = fuentes[USU];

// --- (a) Nadie declara el literal: las constantes vienen del require --------
// Un binding valido es "var X = CartasConfig.X;" o "var X = require(...).X;".
// Lo prohibido es "var X = 200;" (o 12, o cualquier numero).
var RE_DECL_NUM = /var\s+(CARTA_FUSION_XP|CARTA_MUSEO_TOPE|MUSEO_TOPE|CARTA_VARIANTES)\s*=\s*[-+]?\d/g;
var RE_DECL_ARR = /var\s+CARTA_VARIANTES\s*=\s*\[/g;

[INTER, USU].forEach(function (rel) {
  var t = fuentes[rel];
  var nNum = cuenta(t, RE_DECL_NUM);
  assert(nNum === 0, rel + ' no declara ninguna constante de cartas con literal numerico',
    nNum + ' declaracion(es) con numero');
  var nArr = cuenta(t, RE_DECL_ARR);
  assert(nArr === 0, rel + ' no declara CARTA_VARIANTES como array literal',
    nArr + ' declaracion(es)');
});

[INTER, USU].forEach(function (rel) {
  var t = fuentes[rel];
  var req = /require\(\s*'\.\.\/lib\/cartas-config\.js'\s*\)/.test(t);
  assert(req, rel + ' requirea lib/cartas-config.js', 'falta el require');
});

// Bindings explicitos: el nombre local se conserva para no tocar los usos.
assert(/var\s+CARTA_FUSION_XP\s*=\s*CartasConfig\.CARTA_FUSION_XP\s*;/.test(tInter),
  INTER + ' enlaza CARTA_FUSION_XP desde CartasConfig', 'binding ausente o con literal');
assert(/var\s+CARTA_MUSEO_TOPE\s*=\s*CartasConfig\.MUSEO_TOPE\s*;/.test(tInter),
  INTER + ' enlaza CARTA_MUSEO_TOPE desde CartasConfig', 'binding ausente o con literal');
assert(/var\s+CARTA_VARIANTES\s*=\s*CartasConfig\.CARTA_VARIANTES\s*;/.test(tInter),
  INTER + ' enlaza CARTA_VARIANTES desde CartasConfig', 'binding ausente o con literal');
assert(/var\s+CARTA_FUSION_XP\s*=\s*CartasConfig\.CARTA_FUSION_XP\s*;/.test(tUsu),
  USU + ' enlaza CARTA_FUSION_XP desde CartasConfig', 'binding ausente o con literal');
assert(/var\s+MUSEO_TOPE\s*=\s*CartasConfig\.MUSEO_TOPE\s*;/.test(tUsu),
  USU + ' enlaza MUSEO_TOPE desde CartasConfig', 'binding ausente o con literal');
assert(/var\s+CARTA_VARIANTE_DEFECTO\s*=\s*CartasConfig\.CARTA_VARIANTE_DEFECTO\s*;/.test(tUsu),
  USU + ' enlaza CARTA_VARIANTE_DEFECTO desde CartasConfig', 'binding ausente o con literal');

// CARTA_VARIANTES se declara como ARRAY LITERAL una sola vez, y es en lib/.
// El binding de api/ ("var CARTA_VARIANTES = CartasConfig.CARTA_VARIANTES;") es
// una declaracion de variable, no una segunda fuente: por eso se busca el
// literal y no el "var".
var reVarLit = /var\s+CARTA_VARIANTES\s*=\s*\[/;
assert(reVarLit.test(tLib), LIB + ' declara CARTA_VARIANTES como array literal',
  'no aparece el literal');
assert(!reVarLit.test(tInter), INTER + ' NO redeclara el literal de CARTA_VARIANTES (solo enlaza)',
  'array literal local detectado');
assert(!reVarLit.test(tUsu), USU + ' NO redeclara el literal de CARTA_VARIANTES',
  'array literal local detectado');

// --- (b) Presupuesto serverless: 8/8 funciones (ADR-002 plataforma) ---------
var dirApi = path.join(ROOT, 'api');
var ficherosApi = fs.readdirSync(dirApi).filter(function (f) {
  return /\.js$/.test(f);
});
assert(ficherosApi.length === 8, 'api/ contiene exactamente 8 funciones serverless',
  'encontradas ' + ficherosApi.length + ': ' + ficherosApi.join(', '));

// --- (c) Contrato de lib/cartas-config.js -----------------------------------
var libCfg = require(path.join(ROOT, LIB));
assert(libCfg.CARTA_FUSION_XP === 200, 'lib exporta CARTA_FUSION_XP = 200',
  'valor real: ' + libCfg.CARTA_FUSION_XP);
assert(libCfg.MUSEO_TOPE === 12, 'lib exporta MUSEO_TOPE = 12',
  'valor real: ' + libCfg.MUSEO_TOPE);
assert(JSON.stringify(libCfg.CARTA_VARIANTES) === JSON.stringify(['base', 'shiny']),
  'lib exporta CARTA_VARIANTES = [base, shiny]',
  'valor real: ' + JSON.stringify(libCfg.CARTA_VARIANTES));
assert(libCfg.CARTA_VARIANTE_DEFECTO === 'base', 'lib exporta CARTA_VARIANTE_DEFECTO = base',
  'valor real: ' + libCfg.CARTA_VARIANTE_DEFECTO);

// --- (d) Las ramas nuevas y las rutas de lectura ----------------------------
['carta_equipar_museo', 'carta_fusionar', 'carta_obtener_drop'].forEach(function (rama) {
  var re = new RegExp('tipo2 === \'' + rama + '\'');
  assert(re.test(tInter), INTER + ' expone la rama ' + rama, 'rama ausente');
});
assert(/'museo_cartas'/.test(tUsu), USU + ' expone la ruta de lectura museo_cartas',
  'ruta ausente');
assert(!/museo_publico/.test(tUsu), USU + ' NO contiene el nombre antiguo museo_publico',
  'quedan ' + cuenta(tUsu, /museo_publico/g) + ' ocurrencia(s)');

// --- (e) Invariancia del upsert de inventario ------------------------------
var nTresCol = cuenta(tInter, /ON CONFLICT \(usuario_id, carta_id, variante\)/g);
assert(nTresCol === 5, INTER + ' tiene 5 upserts con ON CONFLICT (usuario_id, carta_id, variante)',
  'encontrados ' + nTresCol);
var nDosCol = cuenta(tInter, /ON CONFLICT \(usuario_id, carta_id\)/g);
assert(nDosCol === 0, INTER + ' no conserva ningun ON CONFLICT de 2 columnas',
  'encontrados ' + nDosCol);

// --- Resumen ---------------------------------------------------------------
console.log('');
console.log('Checks: ' + total + ' total, ' + pass + ' PASS, ' + fails + ' FAIL');
if (fails === 0) {
  console.log('RESULTADO: OK - ' + pass + ' verificaciones pasaron.');
  process.exit(0);
}
console.log('RESULTADO: FAIL - ' + fails + ' de ' + total + ' verificaciones fallaron.');
process.exit(1);
