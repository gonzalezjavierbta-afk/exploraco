// scripts/smoke_test_jardin-botanico-medellin.js
//
// Smoke local de la ficha jardin-botanico-medellin (sitio / naturaleza).
// Es la ficha con MAS secciones habilitadas por ADR-016 y con datos reales:
// descripcion, dificultad, entradas, tours, checklist, itinerario, fauna,
// secretos, regulaciones, horarios_zona y que_ver. Aqui se verifica lo que SI
// se pinta (fauna, regulaciones, dificultad) y lo que NO por falta de dato
// (secretos, tours, itinerario, checklist vacios en tags).
// Mas balance de <div> y ausencia de 'undefined' / '[object Object]'.
// No toca base de datos ni red.
//
// ASCII-safe estricto (ADR-002): 0 bytes > 127, 0 backticks.

'use strict';

var fs = require('fs');
var path = require('path');
var vm = require('vm');
var seed = require('./seed-medellin-lote1.js');

var SLUG = 'jardin-botanico-medellin';

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

// -- Comunes a las 6 fichas del lote --------------------------------------
check('renderiza sin error (len>8000)', typeof html === 'string' && html.length > 8000);
check('nombre en el hero', inc(f.base.nombre));
check('ciudad canonica presente', inc(f.base.ciudad));
check('foto_hero en el HTML', html.indexOf(f.hero) !== -1);
check('sin undefined en el markup', sinJS.indexOf('undefined') === -1);
check('sin [object Object]', html.indexOf('[object Object]') === -1);

// -- Sitio / naturaleza ----------------------------------------------------
check('descripcion larga renderizada', html.indexOf('id="descripcion"') !== -1);
check('mapa con coordenadas', html.indexOf('id="mapa"') !== -1);
check('seccion dificultad habilitada', html.indexOf('id="dificultad"') !== -1);

// fauna_flora: STRING JSON (el motor hace JSON.parse y cae a .split si falla).
var fauna = [];
try { fauna = JSON.parse(String(f.tags.fauna_flora || '[]')); } catch (e) { fauna = []; }
check('tags.fauna_flora trae datos', Array.isArray(fauna) && fauna.length > 0);
check('fauna_flora sembrada como string JSON', typeof f.tags.fauna_flora === 'string');
check('seccion fauna habilitada', html.indexOf('id="fauna"') !== -1);
check('primera especie visible', fauna.length > 0 && inc(fauna[0].nombre));

check('seccion regulaciones habilitada', html.indexOf('id="regulaciones"') !== -1);
check('texto de regulaciones visible', inc(String(f.tags.regulaciones || '').slice(0, 40)));

var secretos = [];
try { secretos = JSON.parse(f.tags.secretos || '[]'); } catch (e) { secretos = []; }
check('secretos vacio en tags', secretos.length === 0);
check('sin seccion secretos vacia', html.indexOf('id="secretos"') === -1);

var tours = Array.isArray(f.tags.tours) ? f.tags.tours : [];
var itin = Array.isArray(f.tags.itinerario) ? f.tags.itinerario : [];
var equip = Array.isArray(f.tags.equipamiento) ? f.tags.equipamiento : [];
check('tours vacio en tags', tours.length === 0);
check('sin seccion tours vacia', html.indexOf('id="tours"') === -1);
check('sin seccion itinerario vacia', itin.length === 0 && html.indexOf('id="itinerario"') === -1);
check('sin seccion checklist vacia', equip.length === 0 && html.indexOf('id="checklist"') === -1);

// -- Integridad estructural -----------------------------------------------
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
