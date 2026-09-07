// scripts/smoke_test_parque_mundo_aventura.js
// Smoke local: renderiza buildHTML() con el seed real y verifica las
// secciones propias de categoria sitio para parque-mundo-aventura.
// No requiere base de datos.

const seed = require('./seed-parque-mundo-aventura.js');
global.require_orig = require;
const Module = require('module');
const path = require('path');
const origResolve = Module._resolveFilename;
Module._resolveFilename = function(request, ...args) {
  if (request === '@neondatabase/serverless') return path.join(__dirname, 'fake_neon.js');
  return origResolve.call(this, request, ...args);
};
require('fs').writeFileSync(path.join(__dirname, 'fake_neon.js'), 'module.exports = { neon: function(){ return function(){ return []; }; } };');
const fs = require('fs');
const vm = require('vm');
const src = fs.readFileSync(path.join(__dirname, '..', 'api', 'pagina-destino.js'), 'utf8');
const sandbox = { module: { exports: {} }, require, console, process, URL, URLSearchParams };
sandbox.exports = sandbox.module.exports;
vm.createContext(sandbox);
const wrapped = src + '\nmodule.exports.buildHTML = buildHTML;';
vm.runInContext(wrapped, sandbox, { filename: 'api/pagina-destino.js' });
const d = Object.assign({}, seed.BASE, { fotos: [{ url: seed.HERO }], tags: seed.TAGS, rating: 0, total_resenas: 0, creado_en: new Date(), actualizado_en: new Date() });
const html = sandbox.module.exports.buildHTML(d, { faqs: seed.FAQS }, [], []);
function check(label, cond) { console.log((cond ? 'PASS' : 'FAIL') + ' - ' + label); if (!cond) process.exitCode = 1; }
function enc(s) { return String(s).replace(/[^\x00-\x7F]/g, function(c) { return '&#' + c.charCodeAt(0) + ';'; }); }
function inc(s) { return html.includes(enc(s)) || html.includes(s); }

check('renderiza sin error (len>8000)', typeof html === 'string' && html.length > 8000);

var en0 = (seed.TAGS.entradas || [])[0];
check('Seccion entradas con primera entrada', !!en0 && html.includes('id="entradas"') && inc(en0.tipo));

var to0 = (seed.TAGS.tours || [])[0];
check('Seccion tours con primer tour', !!to0 && html.includes('id="tours"') && inc(to0.nombre));

var eq0 = (seed.TAGS.equipamiento || [])[0];
check('Seccion checklist con primer item', !!eq0 && html.includes('id="checklist"') && inc(eq0.item));

var it0 = (seed.TAGS.itinerario || [])[0];
check('Seccion itinerario con primer paso', !!it0 && html.includes('id="itinerario"') && inc(it0.titulo));

var se0 = seed.TAGS.secretos ? JSON.parse(seed.TAGS.secretos)[0] : null;
check('Seccion secretos con el secreto de Gravity', !!se0 && html.includes('id="secretos"') && inc(se0.titulo) && inc('Gravity'));

check('Seccion regulaciones presente', html.includes('id="regulaciones"'));

var fa0 = seed.TAGS.fauna_flora ? JSON.parse(seed.TAGS.fauna_flora)[0] : null;
check('Seccion fauna y flora con primera especie', !!fa0 && html.includes('id="fauna"') && inc(fa0.nombre));

check('Dificultad presente', html.includes('id="dificultad"'));

var fq0 = (seed.FAQS || [])[0];
check('FAQ renderizada con primera pregunta', !!fq0 && html.includes('id="faq"') && inc(fq0.pregunta));

check('Hero con nombre', inc(seed.BASE.nombre));
check('Instagram en hero/link', inc(seed.BASE.instagram) || inc(String(seed.BASE.instagram).replace('https://', '')));

var toursOk = (seed.TAGS.tours || []).every(function(t) { return String(t.rating) === '0' && t.review_count === 0; });
check('Rating 0 ADR-009 (BASE sin rating y tours en 0)', !('rating' in seed.BASE) && !('total_resenas' in seed.BASE) && toursOk && d.rating === 0 && d.total_resenas === 0);

const opens = (html.match(/<div/g) || []).length;
const closes = (html.match(/<\/div>/g) || []).length;
console.log('divs open=' + opens + ' close=' + closes + ' diff=' + (opens - closes));
check('balance de divs', opens === closes);