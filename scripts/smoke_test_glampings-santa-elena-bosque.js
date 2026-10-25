// scripts/smoke_test_glampings-santa-elena-bosque.js
//
// Smoke local de la ficha glampings-santa-elena-bosque (hostal).
// Renderiza api/pagina-destino.js:buildHTML() en un sandbox vm con los datos
// que el seed escribira (scripts/seed-medellin-lote4.js) y verifica:
//   - habitaciones, amenidades, actividades y el bloque como llegar
//   - transporte y eventos_hostal vacios -> sin cascara vacia
//   - que las secciones de sitio/comida/evento no se pinten
//   - balance de <div>, ausencia de 'undefined' y de '[object Object]'
//   - FAQS visibles con el detEfectivo que arma el handler
//
// NOTA sobre det: el render lee habitaciones/amenidades de destinos_detalles y
// el handler las rellena desde tags cuando la fila no las trae
// (api/pagina-destino.js:3117-3126). El seed deja esa fila con faqs, asi que
// el smoke reproduce EXACTAMENTE ese fallback (incluida la linea que
// SOBRESCRIBE det.faqs con tags.faqs).
//
// ASCII-safe estricto (ADR-002): 0 bytes > 127, 0 backticks.

'use strict';

var fs = require('fs');
var path = require('path');
var vm = require('vm');
var seed = require('./seed-medellin-lote4.js');

var SLUG = 'glampings-santa-elena-bosque';

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

var tagsDb = seed.tagsPersistidos(f);
var d = Object.assign({}, f.base, {
  fotos: f.fotos,
  tags: tagsDb,
  rating: 0,
  total_resenas: 0,
  creado_en: new Date(),
  actualizado_en: new Date()
});
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
check('foto de la galeria presente', html.indexOf(f.fotos[1].url) !== -1);
check('lead renderizado', inc(f.base.lead.slice(0, 30)));
check('sin undefined en el markup', sinJS.indexOf('undefined') === -1);
check('sin [object Object]', html.indexOf('[object Object]') === -1);

// -- ADR-100: admision ------------------------------------------------------
check('categoria hostal', f.categoria === 'hostal');
check('sin subcategoria por diseno (hostal no usa gating de sitio)', !f.subcategoria);
check('status published (' + f.status + ')', f.status === 'published');
check('completitud >= 40 (' + f.completitud.puntos + ')', f.completitud.puntos >= 40);
check('ciudad derivada del catalogo (Medellin)', f.base.ciudad === 'Medell\u00edn');
check('region derivada del catalogo', f.base.region === 'Antioquia');
check('zona de lista cerrada o NULL', f.base.zona === null || typeof f.base.zona === 'string');

// -- Hostal --------------------------------------------------------------
var habs = Array.isArray(f.tags.habitaciones) ? f.tags.habitaciones : [];
check('precondicion: habitaciones con 1 tipo', habs.length === 1);
check('seccion habitaciones presente', html.indexOf('id="habitaciones"') !== -1);
check('tipo de habitacion visible', habs.length > 0 && inc(String(habs[0].tipo || '')));
check('precio de la habitacion visible', habs.length > 0 && inc(String(habs[0].precio || '')));
check('camas de la habitacion visibles', habs.length > 0 && inc(String(habs[0].camas || '')));

var amen = Array.isArray(f.tags.amenidades) ? f.tags.amenidades : [];
check('precondicion: amenidades con 4 items', amen.length === 4);
var amenFuera = amen.filter(function (x) { return !inc(String(x)); });
check('todas las amenidades visibles (' + (amen.length - amenFuera.length) + '/' + amen.length + ')',
  amen.length > 0 && amenFuera.length === 0);

var acts = Array.isArray(f.tags.actividades) ? f.tags.actividades : [];
check('precondicion: actividades con 1 item', acts.length === 1);
check('seccion actividades presente', html.indexOf('id="actividades"') !== -1);
check('nombre de la actividad visible', acts.length > 0 && inc(String(acts[0].nombre || '')));
check('descripcion de la actividad visible', acts.length > 0 && inc(String(acts[0].descripcion || '').slice(0, 25)));

// Transporte vacio en la ficha: el bloque de transporte no deja cascara, pero
// la seccion como llegar sigue viva por las coordenadas (mapa).
var trans = Array.isArray(f.tags.transporte) ? f.tags.transporte : [];
check('precondicion: transporte vacio', trans.length === 0);
check('seccion como llegar presente por coordenadas', html.indexOf('id="como-llegar"') !== -1);
check('mapa con coordenadas', html.indexOf(String(f.base.lat) + ',' + String(f.base.lng)) !== -1);

var evHostal = Array.isArray(f.tags.eventos_hostal) ? f.tags.eventos_hostal : [];
check('precondicion: eventos_hostal vacio', evHostal.length === 0);
check('sin seccion eventos-hostal vacia', html.indexOf('id="eventos-hostal"') === -1);

check('tipo de alojamiento visible', inc(String(f.tags.tipo_alojamiento || '')));
check('checkin del hostal visible', inc(String(f.tags.checkin || '')));
check('checkout del hostal visible', inc(String(f.tags.checkout || '')));
check('seccion reglas de la casa presente', html.indexOf('id="reglas-casa"') !== -1);
check('politica de cancelacion visible', inc(String(f.tags.politica_cancelacion || '').slice(0, 25)));
check('reglas de la casa visibles', inc(String(f.tags.reglas_casa || '').slice(0, 25)));

// Secciones de otras categorias fuera.
check('sin seccion menu en hostal', html.indexOf('id="menu"') === -1);
check('sin seccion entradas en hostal', html.indexOf('id="entradas"') === -1);
check('sin seccion delivery en hostal', html.indexOf('id="delivery"') === -1);
check('sin seccion dificultad en hostal', html.indexOf('id="dificultad"') === -1);
check('sin seccion evento-fechas en hostal', html.indexOf('id="evento-fechas"') === -1);

// -- FAQs e integridad ---------------------------------------------------
check('seccion faq presente', html.indexOf('id="faq"') !== -1);

var opens = (html.match(/<div/g) || []).length;
var closes = (html.match(/<\/div>/g) || []).length;
console.log('divs open=' + opens + ' close=' + closes + ' diff=' + (opens - closes));
check('balance de divs', opens === closes);

// -- FAQs: contrato real del handler (lineas 3117-3126) --------------------
// El seed persiste las FAQS en destinos_detalles Y en destinos.tags: la copia
// en tags es la que sobrevive al fallback (que reasigna det.faqs = tags.faqs).
var faqsDet = Array.isArray(detEfectivo.faqs) ? detEfectivo.faqs : [];
check('FAQs sobreviven al fallback del handler (' + faqsDet.length + '/' + f.faqs.length + ')',
  f.faqs.length > 0 && faqsDet.length === f.faqs.length);
var faqFuera = f.faqs.filter(function (q) { return !inc(q.pregunta); });
check('todas las preguntas de FAQ en el HTML (' + (f.faqs.length - faqFuera.length) + '/' + f.faqs.length + ')',
  faqFuera.length === 0);

console.log('---');
console.log((fallos === 0 ? 'PASS' : 'FAIL') + ' smoke ' + SLUG + ' | checks fallidos=' + fallos);
process.exit(fallos === 0 ? 0 : 1);
