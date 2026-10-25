// scripts/smoke_test_feria-de-las-flores-medellin.js
//
// Smoke local de la ficha feria-de-las-flores-medellin (evento / festival).
// Renderiza api/pagina-destino.js:buildHTML() en un sandbox vm con los datos
// que el seed escribira y verifica las secciones propias de evento:
// fecha_inicio/fecha_fin (evento-fechas), lineup, agenda, categorias_entrada
// (tipos-entrada) y que_llevar/prohibido (que-llevar), mas balance de <div> y
// ausencia de 'undefined' / '[object Object]' en el markup.
// No toca base de datos ni red.
//
// ASCII-safe estricto (ADR-002): 0 bytes > 127, 0 backticks.

'use strict';

var fs = require('fs');
var path = require('path');
var vm = require('vm');
var seed = require('./seed-medellin-lote1.js');

var SLUG = 'feria-de-las-flores-medellin';

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

// -- Evento: estado y fechas ----------------------------------------------
check('status draft (evento caducado, ADR-100 D6)', f.status === 'draft');
check('fecha_inicio presente en tags', !!f.tags.fecha_inicio);
check('fecha_fin presente en tags', !!f.tags.fecha_fin);
check('seccion fecha y sede', html.indexOf('id="evento-fechas"') !== -1);
check('edicion visible', inc(f.tags.edicion || ''));
check('sede visible', inc(f.tags.sede || ''));

// -- Evento: lineup --------------------------------------------------------
var lineup = Array.isArray(f.tags.lineup) ? f.tags.lineup : [];
check('seccion lineup con datos', lineup.length > 0 && html.indexOf('id="lineup"') !== -1);
check('primer artista del lineup visible', lineup.length > 0 && inc(lineup[0].nombre));

// -- Evento: agenda --------------------------------------------------------
var agenda = Array.isArray(f.tags.agenda) ? f.tags.agenda : [];
check('seccion agenda con datos', agenda.length > 0 && html.indexOf('id="agenda"') !== -1);
check('primera actividad de agenda visible', agenda.length > 0 && inc(agenda[0].actividad));

// -- Evento: tipos de entrada ---------------------------------------------
var cats = Array.isArray(f.tags.categorias_entrada) ? f.tags.categorias_entrada : [];
check('seccion tipos de entrada con datos', cats.length > 0 && html.indexOf('id="tipos-entrada"') !== -1);
check('primer tipo de entrada visible', cats.length > 0 && inc(cats[0].tipo));

// -- Evento: que llevar / prohibido ---------------------------------------
var llevar = Array.isArray(f.tags.que_llevar) ? f.tags.que_llevar : [];
var prohibido = Array.isArray(f.tags.prohibido) ? f.tags.prohibido : [];
check('seccion que llevar con datos', (llevar.length > 0 || prohibido.length > 0) && html.indexOf('id="que-llevar"') !== -1);
check('primer item de que llevar visible', llevar.length > 0 && inc(llevar[0]));
check('primer item prohibido visible', prohibido.length > 0 && inc(prohibido[0]));

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
