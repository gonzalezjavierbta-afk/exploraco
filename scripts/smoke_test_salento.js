// scripts/smoke_test_salento.js
// Smoke local: renderiza buildHTML() de api/pagina-destino.js con el seed real
// de Salento (sitio / subcategoria ciudad) y verifica las secciones activas de
// esa subcategoria segun SITIO_SECCIONES_POR_SUBCATEGORIA (ADR-016).
// No requiere base de datos.

var fs = require('fs');
var path = require('path');
var vm = require('vm');
var Module = require('module');

// Stub de @neondatabase/serverless (sin tocar la red).
var FAKE = path.join(__dirname, 'fake_neon.js');
if (!fs.existsSync(FAKE)) {
  fs.writeFileSync(FAKE, 'module.exports = { neon: function(){ return function(){ return []; }; } };');
}
var origResolve = Module._resolveFilename;
Module._resolveFilename = function (request) {
  if (request === '@neondatabase/serverless') return FAKE;
  return origResolve.apply(this, arguments);
};

var seed = require('./seed-salento.js');
var src = fs.readFileSync(path.join(__dirname, '..', 'api', 'pagina-destino.js'), 'utf8');
var sandbox = { module: { exports: {} }, require: require, console: console, process: process };
sandbox.exports = sandbox.module.exports;
vm.createContext(sandbox);
vm.runInContext(src + '\nmodule.exports.buildHTML = buildHTML;', sandbox, { filename: 'api/pagina-destino.js' });

var d = Object.assign({}, seed.BASE, {
  fotos: [{ url: seed.HERO }],
  tags: seed.TAGS,
  rating: 0,
  total_resenas: 0,
  creado_en: new Date(),
  actualizado_en: new Date()
});

var html = sandbox.module.exports.buildHTML(d, { entradas: [], tours: [], equipamiento: [] }, [], []);

var fails = 0;
function check(label, cond) {
  console.log((cond ? 'PASS' : 'FAIL') + ' - ' + label);
  if (!cond) { fails++; process.exitCode = 1; }
}
function enc(s) {
  return String(s).replace(/[^\x00-\x7F]/g, function (c) { return '&#' + c.charCodeAt(0) + ';'; });
}
function inc(s) { return html.indexOf(enc(s)) !== -1 || html.indexOf(String(s)) !== -1; }

check('renderiza sin error (len>8000)', typeof html === 'string' && html.length > 8000);
check('hero con nombre del destino', inc(seed.BASE.nombre));
check('foto_hero en el HTML', html.indexOf(seed.HERO) !== -1);
check('chip subcategoria Ciudad / Pueblo', inc('Ciudad / Pueblo'));
check('rating en 0 (ADR-009, sin resenas)', (d.rating === 0 && d.total_resenas === 0));

// Secciones activas para subcategoria 'ciudad' (ADR-016).
var at0 = (seed.TAGS.atracciones || [])[0];
check('seccion atracciones + primer item', html.indexOf('id="atracciones"') !== -1 && !!at0 && inc(at0.nombre));

var ag0 = (seed.TAGS.actividades_gratis || [])[0];
check('seccion actividades-gratis + primer item', html.indexOf('id="actividades-gratis"') !== -1 && !!ag0 && inc(ag0.nombre));

var pr0 = (seed.TAGS.programacion || [])[0];
check('seccion programacion + primer item', html.indexOf('id="programacion"') !== -1 && !!pr0 && inc(pr0.eventos));

var ac0 = (seed.TAGS.accesibilidad || [])[0];
check('seccion accesibilidad + primer item', html.indexOf('id="accesibilidad"') !== -1 && !!ac0 && inc(ac0.nombre));

var ba0 = (seed.TAGS.barrios || [])[0];
check('seccion barrios + primer item', html.indexOf('id="barrios"') !== -1 && !!ba0 && inc(ba0.nombre));

var tr0 = (seed.TAGS.transporte || [])[0];
check('seccion transporte + primer item', html.indexOf('id="transporte"') !== -1 && !!tr0 && inc(tr0.nombre));

var sg0 = (seed.TAGS.seguridad || [])[0];
check('seccion seguridad + primer item', html.indexOf('id="seguridad"') !== -1 && !!sg0 && inc(sg0.nombre));

var pp0 = (seed.TAGS.presupuesto || [])[0];
check('seccion presupuesto + primer item', html.indexOf('id="presupuesto"') !== -1 && !!pp0 && inc(pp0.tipo));

var ga0 = (seed.TAGS.gastronomia || [])[0];
check('seccion gastronomia + primer item', html.indexOf('id="gastronomia"') !== -1 && !!ga0 && inc(ga0.nombre));

// CLAVE_CUANDO_IR: el renderer consume cuando_ir[].nota (api/pagina-destino.js:2006).
var ci0 = (seed.TAGS.cuando_ir || [])[0];
check('cuando_ir emite .nota (no estado_nota)', !!ci0 && typeof ci0.nota === 'string' && ci0.nota.length > 0);
check('seccion cuando_ir + primera nota visible', html.indexOf('id="cuando_ir"') !== -1 && !!ci0 && inc(ci0.nota));

check('contexto del destino presente', inc(seed.TAGS.contexto.slice(0, 60)));

// Gating por subcategoria: estas secciones NO deben aparecer en 'ciudad'.
check('gating: sin seccion entradas', html.indexOf('id="entradas"') === -1);
check('gating: sin seccion tours', html.indexOf('id="tours"') === -1);
check('gating: sin seccion itinerario', html.indexOf('id="itinerario"') === -1);
check('gating: sin seccion secretos', html.indexOf('id="secretos"') === -1);

// Balance de divs (Escudo GOLD).
var opens = (html.match(/<div/g) || []).length;
var closes = (html.match(/<\/div>/g) || []).length;
console.log('divs open=' + opens + ' close=' + closes + ' diff=' + (opens - closes));
check('balance de divs', opens === closes);

console.log(fails === 0 ? 'RESULTADO: PASS' : 'RESULTADO: FAIL (' + fails + ')');
