// scripts/smoke_test_parque-arvi-medellin.js
//
// Smoke local de la ficha parque-arvi-medellin (sitio / naturaleza).
// Renderiza api/pagina-destino.js:buildHTML() en un sandbox vm con los datos
// que el seed escribira (scripts/seed-medellin-lote2.js) y verifica:
//   - dificultad y regulaciones, que la subcategoria 'naturaleza' habilita
//   - que las secciones de array vacio (entradas, tours, itinerario,
//     checklist, fauna, secretos) NO se pinten
//   - balance de <div> y ausencia de 'undefined' / '[object Object]'
// No toca base de datos ni red.
//
// ASCII-safe estricto (ADR-002): 0 bytes > 127, 0 backticks.

'use strict';

var fs = require('fs');
var path = require('path');
var vm = require('vm');
var seed = require('./seed-medellin-lote2.js');

var SLUG = 'parque-arvi-medellin';

var f = seed.construirFicha(SLUG);
var src = fs.readFileSync(path.join(__dirname, '..', 'api', 'pagina-destino.js'), 'utf8');

function requireSandbox(nombre) {
  if (nombre === '@neondatabase/serverless') {
    return { neon: function () { return function () { return Promise.resolve([]); }; } };
  }
  return require(nombre);
}

var sandbox = { module: { exports: {} }, console: console, process: process, require: requireSandbox };
sandbox.exports = sandbox.module.exports;
vm.createContext(sandbox);
vm.runInContext(src + '\nmodule.exports.buildHTML = buildHTML;', sandbox, { filename: 'api/pagina-destino.js' });

var d = Object.assign({}, f.base, {
  fotos: f.fotos,
  tags: f.tags,
  rating: 0,
  total_resenas: 0,
  creado_en: new Date(),
  actualizado_en: new Date()
});
// El handler (api/pagina-destino.js 3117-3126) SOBRESCRIBE det.faqs con
// tags.faqs cuando destinos_detalles no trae amenidades (senal de hostal). Se
// replica tal cual: pasar { faqs: f.faqs } a pelo no reproduce el contrato real.
var tagsDb = seed.tagsPersistidos(f);
var detEfectivo = { faqs: f.faqs };
if (!detEfectivo.amenidades && tagsDb) {
  detEfectivo.amenidades = tagsDb.amenidades;
  detEfectivo.habitaciones = tagsDb.habitaciones;
  detEfectivo.faqs = tagsDb.faqs;
  detEfectivo.checkin = tagsDb.checkin;
  detEfectivo.checkout = tagsDb.checkout;
}
var html = sandbox.module.exports.buildHTML(d, detEfectivo, f.fotos, [], null, [], null, null, [], []);

var fallos = 0;
function check(label, cond) {
  console.log((cond ? 'PASS' : 'FAIL') + ' - ' + label);
  if (!cond) fallos++;
}
function enc(s) {
  return String(s).replace(/[^\x00-\x7F]/g, function (c) { return '&#' + c.charCodeAt(0) + ';'; });
}
function inc(s) { return html.indexOf(enc(s)) !== -1 || html.indexOf(String(s)) !== -1; }
function markup(h) { return String(h).replace(/<script[\s\S]*?<\/script>/gi, ''); }
var sinJS = markup(html);

// -- Comunes -------------------------------------------------------------
check('renderiza sin error (len>8000)', typeof html === 'string' && html.length > 8000);
check('nombre en el hero', inc(f.base.nombre));
check('ciudad canonica presente', inc(f.base.ciudad));
check('foto_hero en el HTML', html.indexOf(f.hero) !== -1);
check('galeria con 5 fotos', f.fotos.length === 5);
check('foto de la galeria presente', html.indexOf(f.fotos[2].url) !== -1);
check('sin undefined en el markup', sinJS.indexOf('undefined') === -1);
check('sin [object Object]', html.indexOf('[object Object]') === -1);
check('lead renderizado', inc(f.base.lead.slice(0, 30)));

// -- Sitio / naturaleza (gating ADR-016) ---------------------------------
check('subcategoria naturaleza en la ficha', f.tags.subcategoria === 'naturaleza');
check('chip de subcategoria', html.indexOf('subcat-chip') !== -1);
check('seccion descripcion presente', html.indexOf('id="descripcion"') !== -1);

var dificultad = String(f.tags.dificultad || '');
check('precondicion: tags.dificultad trae dato', dificultad.length > 0);
check('seccion dificultad habilitada por naturaleza', html.indexOf('id="dificultad"') !== -1);
check('dificultad_desc renderizada', inc(String(f.tags.dificultad_desc || '').slice(0, 24)));

var regs = String(f.tags.regulaciones || '');
check('precondicion: tags.regulaciones trae dato', regs.length > 20);
check('seccion regulaciones habilitada por naturaleza', html.indexOf('id="regulaciones"') !== -1);
check('texto de regulaciones visible', inc(regs.slice(0, 20)));

// Arrays vacios: la seccion no se pinta.
check('precondicion: tags.entradas vacio', (f.tags.entradas || []).length === 0);
check('precondicion: tags.tours vacio', (f.tags.tours || []).length === 0);
check('precondicion: tags.itinerario vacio', (f.tags.itinerario || []).length === 0);
check('precondicion: tags.fauna_flora descartado por vacio', f.tags.fauna_flora === undefined);
check('precondicion: tags.secretos descartado por vacio', f.tags.secretos === undefined);
check('seccion entradas sin datos no se pinta', html.indexOf('id="entradas"') === -1);
check('seccion tours sin datos no se pinta', html.indexOf('id="tours"') === -1);
check('seccion itinerario sin datos no se pinta', html.indexOf('id="itinerario"') === -1);
check('seccion checklist sin datos no se pinta', html.indexOf('id="checklist"') === -1);
check('seccion fauna sin datos no se pinta', html.indexOf('id="fauna"') === -1);
check('seccion secretos sin datos no se pinta', html.indexOf('id="secretos"') === -1);

// -- FAQs e integridad ---------------------------------------------------
check('seccion faq presente', html.indexOf('id="faq"') !== -1);
check('primera pregunta visible', inc(f.faqs[0].pregunta.slice(0, 25)));

var opens = (html.match(/<div/g) || []).length;
var closes = (html.match(/<\/div>/g) || []).length;
console.log('divs open=' + opens + ' close=' + closes + ' diff=' + (opens - closes));
check('balance de divs', opens === closes);

// -- FAQs: contrato real del handler (lineas 3117-3126) --------------------
// El seed persiste las FAQS en destinos_detalles Y en destinos.tags: sin la
// copia en tags el fallback deja det.faqs vacio y la seccion desaparece.
var faqsDet = Array.isArray(detEfectivo.faqs) ? detEfectivo.faqs : [];
check('FAQs sobreviven al fallback del handler (' + faqsDet.length + '/' + f.faqs.length + ')',
  f.faqs.length > 0 && faqsDet.length === f.faqs.length);
check('seccion FAQ renderizada', html.indexOf('id="faq"') !== -1);
var faqFuera = f.faqs.filter(function (q) { return !inc(q.pregunta); });
check('todas las preguntas de FAQ en el HTML (' + (f.faqs.length - faqFuera.length) + '/' + f.faqs.length + ')',
  faqFuera.length === 0);

console.log('---');
console.log((fallos === 0 ? 'PASS' : 'FAIL') + ' smoke ' + SLUG + ' | checks fallidos=' + fallos);
process.exit(fallos === 0 ? 0 : 1);
