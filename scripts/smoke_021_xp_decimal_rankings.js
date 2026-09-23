// smoke_021_xp_decimal_rankings.js
// Smoke estatico (sin DB) de la migracion 021 (XP decimal numeric(12,2))
// y de los rankings de comunidad (ADR-035). Lee los archivos fuente reales
// (ADR-006) y verifica por substring/estructura. ASCII-safe (ADR-002):
// 0 bytes > 127 y 0 backticks. CommonJS estricto.
'use strict';

var fs = require('fs');
var path = require('path');

var ROOT = path.join(__dirname, '..');
function leer(p) { return fs.readFileSync(path.join(ROOT, p), 'utf8'); }
function contarNivelesArray(t) {
  var i = t.indexOf('XP_LEVELS = [');
  if (i < 0) return 0;
  var j = t.indexOf('];', i);
  if (j < 0) return 0;
  return (t.slice(i, j).match(/-?\d+(?:\.\d+)?/g) || []).length;
}
function contarMinObjetos(t) {
  var i = t.indexOf('XP_LEVELS = [');
  if (i < 0) return 0;
  var j = t.indexOf('];', i);
  if (j < 0) return 0;
  return (t.slice(i, j).match(/\bmin\s*:/g) || []).length;
}
// ADR-040: index/comunidad conservan la tabla literal; mi-perfil la
// aliasa desde niveles-data.js. Se valida el contrato nuevo completo
// (carga de niveles-data.js + alias a window.NivelesData.XP_LEVELS + 40).
function nivelesEnHtml(t) {
  if (t.indexOf('XP_LEVELS = [') !== -1) return contarMinObjetos(t);
  if (t.indexOf('niveles-data.js') === -1) return 0;
  if (t.indexOf('window.NivelesData.XP_LEVELS') === -1) return 0;
  return contarMinObjetos(leer('niveles-data.js'));
}

var USA = leer('api/usuarios.js');
var INT = leer('api/interacciones.js');
var MIG = leer('db/migrations/021_xp_decimal.sql');
var SESS = leer('usuario-session.js');
var HTMLS = ['mi-perfil.html', 'comunidad.html', 'index.html', 'admin.html', 'perfil.html'];
var HTML = {};
HTMLS.forEach(function (f) { HTML[f] = leer(f); });

var total = 0;
var fails = 0;
function check(label, cond) {
  total += 1;
  if (!cond) fails += 1;
  console.log((cond ? 'PASS' : 'FAIL') + ' - ' + label);
}
function colapsar(t) { return String(t).replace(/\s+/g, ' '); }
function bloque(t, ini, fin) {
  var i = t.indexOf(ini);
  if (i < 0) return '';
  var j = fin ? t.indexOf(fin, i + ini.length) : -1;
  return (j < 0) ? t.slice(i) : t.slice(i, j);
}
function extraerFn(t, nombre) {
  var i = t.indexOf('function ' + nombre + '(');
  if (i < 0) return '';
  var j = t.indexOf('\nfunction ', i + 1);
  return (j < 0) ? t.slice(i, i + 1200) : t.slice(i, j);
}
function intCastSobreXpSum(t) {
  var n = colapsar(t);
  var pats = [
    /SUM\s*\([^()]*xp_[a-z_]+[^()]*\)\s*::int/,
    /SUM\s*\([^()]*xp_[a-z_]+[^()]*\)\s*,\s*0\s*\)\s*::int/,
    /SUM\s*\([^()]*xp_[a-z_]+[^()]*\)\s*FILTER\s*\([^()]*\)\s*\)\s*::int/,
    /SUM\s*\([^()]*xp_[a-z_]+[^()]*\)\s*FILTER\s*\([^()]*\)\s*,\s*0\s*\)\s*::int/
  ];
  for (var i = 0; i < pats.length; i++) { if (pats[i].test(n)) return true; }
  return false;
}
function asciiSafe(p) {
  var b = fs.readFileSync(path.join(ROOT, p));
  var high = 0, tick = 0;
  for (var i = 0; i < b.length; i++) { if (b[i] > 127) high += 1; if (b[i] === 96) tick += 1; }
  return { high: high, tick: tick };
}

console.log('=== SMOKE 021 XP DECIMAL / RANKINGS (ADR-035) ===');
console.log('');

check('1a: usuarios.js define red2()', /function red2\s*\(/.test(USA));
check('1b: usuarios.js define numXp()', /function numXp\s*\(/.test(USA));
check('1c: interacciones.js define red2()', /function red2\s*\(/.test(INT));
check('1d: interacciones.js define numXp()', /function numXp\s*\(/.test(INT));

var fnNivelUsr = extraerFn(USA, 'calcularNivel');
check('2a: usuarios.js calcularNivel usa Number(', fnNivelUsr.indexOf('Number(') !== -1);
check('2b: usuarios.js calcularNivel NO usa parseInt(', fnNivelUsr.indexOf('parseInt(') === -1);
var fnNivelInt = extraerFn(INT, 'calcularNivelLocal');
check('2c: interacciones.js calcularNivelLocal usa Number(', fnNivelInt.indexOf('Number(') !== -1);
check('2d: interacciones.js calcularNivelLocal NO usa parseInt(', fnNivelInt.indexOf('parseInt(') === -1);

check('3a: usuarios.js sin ::int sobre SUM(xp_total/xp_ref_total)', !intCastSobreXpSum(USA));
check('3b: interacciones.js sin ::int sobre SUM(xp_ganado)', !intCastSobreXpSum(INT));

var fnFama = extraerFn(INT, 'aplicarFamaPandilla');
check('4a: aplicarFamaPandilla conserva xpGanado * 0.10', fnFama.indexOf('xpGanado * 0.10') !== -1);
check('4b: aplicarFamaPandilla conserva la guarda famaBase <= 0', fnFama.indexOf('famaBase <= 0') !== -1);
check('4c: aplicarFamaPandilla sigue actualizando pandillas.fama_total', fnFama.indexOf('UPDATE pandillas SET fama_total') !== -1);

// ADR-053 Dec 8.1 (v25): aplicarAmuletoX2 YA NO multiplica xpBase * 2 por
// dentro; consume un uso y reporta doubled=true. El x2 entra como
// ctx.amuleto en el punto unico (para que el cap global vea el stack real).
// La asercion vieja (xpBase * 2) quedo obsoleta por el contrato nuevo.
var fnAmu = extraerFn(INT, 'aplicarAmuletoX2');
check('5a: aplicarAmuletoX2 NO premultiplica (base intacta + doubled)',
  fnAmu.indexOf('xpBase * 2') === -1
  && fnAmu.indexOf('xp: base, doubled: true') !== -1
  && fnAmu.indexOf('xp: base, doubled: false') !== -1);

var bloqueInv = bloque(INT, "tipo === 'inventario'", '// Coleccion de cromos');
check('6a: inventario conserva xp_total: invXp', bloqueInv.indexOf('xp_total: invXp') !== -1);
check('6b: inventario conserva consumibles: inventarioCons', bloqueInv.indexOf('consumibles: inventarioCons') !== -1);

var bloquePrk = bloque(INT, "tipo === 'pandilla_ranking'", "if (tipo === 'mis_cromos'");
check('7a: existe la rama tipo === pandilla_ranking', bloquePrk.length > 0);
check('7b: pandilla_ranking consulta la tabla pandillas', bloquePrk.indexOf('FROM pandillas p') !== -1);
check('7c: pandilla_ranking consulta pandillas_miembros', bloquePrk.indexOf('pandillas_miembros') !== -1);
check('7d: pandilla_ranking referencia fama_total', bloquePrk.indexOf('fama_total') !== -1);
check('7e: pandilla_ranking referencia ultimo_acceso', bloquePrk.indexOf('ultimo_acceso') !== -1);

var bloqueFac = bloque(USA, "tipo === 'faccion_ranking'", "tipo === 'casa_ranking'");
var bloqueCasa = bloque(USA, "tipo === 'casa_ranking'", "tipo === 'email_verificar_confirmar'");
check('8a: faccion_ranking incluye miembros_activos', bloqueFac.indexOf('miembros_activos') !== -1);
check('8b: casa_ranking incluye miembros_activos', bloqueCasa.indexOf('miembros_activos') !== -1);
check('8c: casa_ranking ordena por xp_total DESC', /ORDER BY[^;]{0,80}SUM\(u\.xp_total\), 2\), 0\) DESC/.test(colapsar(bloqueCasa)));
check('8d: casa_ranking ya no ordena por xp_promedio', colapsar(bloqueCasa).indexOf('ORDER BY xp_promedio DESC') === -1);

check('9a: interacciones.js elimino Math.floor(xp_total / 100) + 1', INT.indexOf('Math.floor(xp_total / 100)') === -1 && !/xp_total\s*\/\s*100/.test(INT));

var pares = [
  "'usuarios', 'xp_total'",
  "'usuarios', 'xp_ref_total'",
  "'interacciones', 'xp_ganado'",
  "'album_votos', 'xp_ganado'",
  "'album_fotos', 'xp_otorgado_autor'",
  "'compra_consumibles', 'xp_pagado'",
  "'pandilla_retos', 'xp_bono'",
  "'consumibles', 'precio_xp'",
  "'pandillas', 'fama_total'"
];
var migCol = colapsar(MIG);
check('10a: migracion 021 declara los 9 pares tabla.columna', pares.every(function (p) { return migCol.indexOf(p) !== -1; }));
check('10b: migracion 021 usa information_schema.columns', MIG.indexOf('information_schema.columns') !== -1);
check('10c: migracion 021 solo convierte tipos enteros', migCol.indexOf("data_type IN ('integer', 'smallint', 'bigint')") !== -1);
check('10d: migracion 021 convierte a numeric(12,2)', MIG.indexOf('numeric(12,2)') !== -1);
var migAscii = asciiSafe('db/migrations/021_xp_decimal.sql');
check('10e: migracion 021 ASCII-safe', migAscii.high === 0 && migAscii.tick === 0);

check('11a: usuario-session.js exporta window.ExploraCO.fmtXp', /window\.ExploraCO\.fmtXp\s*=/.test(SESS));
check('11b: usuario-session.js exporta window.ExploraCO.redondearXp', /window\.ExploraCO\.redondearXp\s*=/.test(SESS));
check('11c: redondearXp usa Number.EPSILON', extraerFn(SESS, 'redondearXp').indexOf('Number.EPSILON') !== -1);
check('11d: fmtXp no usa parseInt', extraerFn(SESS, 'fmtXp').indexOf('parseInt(') === -1);
check('11e: usuario-session.js conserva los 40 XP_LEVELS', contarNivelesArray(SESS) === 40);

HTMLS.forEach(function (f) {
  check('12: ' + f + ' formatea XP con fmtXp', HTML[f].indexOf('fmtXp') !== -1);
});
['index.html', 'mi-perfil.html', 'comunidad.html'].forEach(function (f) {
  check('13: ' + f + ' conserva los 40 XP_LEVELS', nivelesEnHtml(HTML[f]) === 40);
});

var selfAscii = asciiSafe('scripts/smoke_021_xp_decimal_rankings.js');
check('14: smoke ASCII-safe (0 bytes > 127, 0 backticks)', selfAscii.high === 0 && selfAscii.tick === 0);

var passes = total - fails;
console.log('');
console.log('=== SMOKE 021 XP DECIMAL ===');
console.log('Checks: ' + total + ' total, ' + passes + ' PASS, ' + fails + ' FAIL');
if (fails === 0) {
  console.log('SMOKE 021 XP DECIMAL: OK');
} else {
  console.log('SMOKE 021 XP DECIMAL: ' + fails + ' FALLO(S)');
  process.exitCode = 1;
}