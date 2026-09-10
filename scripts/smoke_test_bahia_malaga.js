// scripts/smoke_test_bahia_malaga.js
// Smoke local: renderiza buildHTML() con el seed real y verifica las
// secciones propias de categoria sitio. No requiere base de datos.

var seed = require('./seed-bahia-malaga.js');
global.require_orig = require;
var Module = require('module');
var path = require('path');
var origResolve = Module._resolveFilename;
Module._resolveFilename = function(request) {
  if (request === '@neondatabase/serverless') return path.join(__dirname, 'fake_neon.js');
  return origResolve.apply(this, arguments);
};
require('fs').writeFileSync(path.join(__dirname, 'fake_neon.js'), 'module.exports = { neon: function(){ return function(){ return []; }; } };');
var fs = require('fs');
var vm = require('vm');
var src = fs.readFileSync(path.join(__dirname, '..', 'api', 'pagina-destino.js'), 'utf8');
var sandbox = { module: { exports: {} }, require: require, console: console, process: process };
sandbox.exports = sandbox.module.exports;
vm.createContext(sandbox);
var wrapped = src + '\nmodule.exports.buildHTML = buildHTML;';
vm.runInContext(wrapped, sandbox, { filename: 'api/pagina-destino.js' });
var galeria = seed.PHOTOS.slice(1).map(function(p, i) { return { url: p.url, caption: p.caption, orden: i + 1 }; });
var det = { entradas: [], tours: [], equipamiento: [], faqs: seed.FAQS, fotos_galeria: galeria };
var d = Object.assign({}, seed.BASE, { fotos: [{ url: seed.HERO }], tags: seed.TAGS, rating: 0, total_resenas: 0, creado_en: new Date(), actualizado_en: new Date() });
// En produccion fotosRows = todas las filas de destinos_fotos (hero + galeria)
var fotosParam = seed.PHOTOS.map(function(p) { return { url: p.url, caption: p.caption }; });
var html = sandbox.module.exports.buildHTML(d, det, fotosParam, []);
function check(label, cond) { console.log((cond ? 'PASS' : 'FAIL') + ' - ' + label); if (!cond) process.exitCode = 1; }
function enc(s) { return String(s).replace(/[^\x00-\x7F]/g, function(c) { return '&#' + c.charCodeAt(0) + ';'; }); }
function inc(s) { return html.includes(enc(s)) || html.includes(s); }

check('renderiza sin error (len>8000)', typeof html === 'string' && html.length > 8000);

var en0 = (seed.TAGS.entradas || [])[0];
check('Seccion entradas con primera entrada', !!en0 && html.includes('id="entradas"') && inc(en0.tipo));

var to0 = (seed.TAGS.tours || [])[0];
check('Seccion tours con primer tour', !!to0 && html.includes('id="tours"') && inc(to0.nombre));

var eq0 = (seed.TAGS.equipamiento || [])[0];
check('Seccion equipamiento con primer item', !!eq0 && html.includes('id="checklist"') && inc(eq0.item));

var it0 = (seed.TAGS.itinerario || [])[0];
check('Seccion itinerario con primer paso', !!it0 && html.includes('id="itinerario"') && inc(it0.titulo));

var se0 = seed.TAGS.secretos ? JSON.parse(seed.TAGS.secretos)[0] : null;
check('Seccion secretos con primer secreto', !!se0 && html.includes('id="secretos"') && inc(se0.titulo));

var re0 = seed.TAGS.regulaciones ? JSON.parse(seed.TAGS.regulaciones)[0] : null;
check('Seccion regulaciones con primer item', !!re0 && html.includes('id="regulaciones"') && inc(re0.titulo));

check('Dificultad presente', html.includes('id="dificultad"'));
check('Hero con nombre', inc(seed.BASE.nombre));
check('Instagram en hero/link', inc(seed.BASE.instagram) || inc(String(seed.BASE.instagram).replace('@', '')));
check('Fauna/flora presente', html.includes('id="fauna"'));
check('FAQs presentes', html.includes('id="faq"'));
check('Galeria de fotos presente', html.includes('id="galeria"'));
check('Mapa presente', html.includes('id="mapa"'));

var opens = (html.match(/<div/g) || []).length;
var closes = (html.match(/<\/div>/g) || []).length;
console.log('divs open=' + opens + ' close=' + closes + ' diff=' + (opens - closes));
check('balance de divs', opens === closes);
