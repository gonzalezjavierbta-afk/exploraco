// scripts/smoke_test_alumbrados-navidenos-medellin.js
//
// Smoke local de la ficha alumbrados-navidenos-medellin (evento / festival).
// Renderiza api/pagina-destino.js:buildHTML() en un sandbox vm con los datos
// que el seed escribira (scripts/seed-medellin-lote4.js) y verifica:
//   - fecha_inicio / fecha_fin (futuras), edicion y sede
//   - lineup (vacio en esta ficha -> la seccion NO se pinta)
//   - agenda y categorias_entrada (1 fila cada una)
//   - que_llevar y prohibido
//   - balance de <div>, ausencia de 'undefined' y de '[object Object]'
//   - FAQS visibles con el detEfectivo que arma el handler
//
// NOTA sobre det: el render lee los detalles de destinos_detalles y el handler
// los rellena desde tags cuando la fila no trae amenidades
// (api/pagina-destino.js:3117-3126). El seed deja esa fila solo con faqs, asi
// que el smoke reproduce EXACTAMENTE ese fallback.
//
// ASCII-safe estricto (ADR-002): 0 bytes > 127, 0 backticks.

'use strict';

var fs = require('fs');
var path = require('path');
var vm = require('vm');
var seed = require('./seed-medellin-lote4.js');

var SLUG = 'alumbrados-navidenos-medellin';

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

// Reproduce el fallback de det del handler (3117-3126), incluida la linea que
// SOBRESCRIBE det.faqs con tags.faqs: sin esa copia la seccion FAQ se pierde.
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
var hoy = new Date().toISOString().slice(0, 10);

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
check('categoria evento', f.categoria === 'evento');
check('subcategoria festival en tags', f.subcategoria === 'festival');
check('status published (' + f.status + ')', f.status === 'published');
check('completitud >= 40 (' + f.completitud.puntos + ')', f.completitud.puntos >= 40);
check('faltantes sin claves prohibidas', f.completitud.faltantes.indexOf('autor_id') === -1);

// -- Evento / festival -----------------------------------------------------
var fi = String(f.tags.fecha_inicio || '');
var ff = String(f.tags.fecha_fin || '');
check('precondicion: fecha_inicio ISO (' + fi + ')', /^\d{4}-\d{2}-\d{2}$/.test(fi));
check('precondicion: fecha_fin ISO (' + ff + ')', /^\d{4}-\d{2}-\d{2}$/.test(ff));
check('fecha_fin futura (guarda ADR-100 D6)', ff > hoy);
check('seccion fecha y sede presente', html.indexOf('id="evento-fechas"') !== -1);
check('fecha inicio formateada (Diciembre de 2026)', html.indexOf('Diciembre de 2026') !== -1);
check('fecha fin formateada (Enero de 2027)', html.indexOf('Enero de 2027') !== -1);
check('edicion visible', inc(String(f.tags.edicion || '')));
check('sede visible', inc(String(f.tags.sede || '')));

var lineup = Array.isArray(f.tags.lineup) ? f.tags.lineup : [];
check('precondicion: lineup vacio en la ficha', lineup.length === 0);
check('sin seccion lineup vacia', html.indexOf('id="lineup"') === -1);

var agenda = Array.isArray(f.tags.agenda) ? f.tags.agenda : [];
check('precondicion: agenda con 1 fila', agenda.length === 1);
check('seccion agenda presente', html.indexOf('id="agenda"') !== -1);
check('agenda: dia visible', agenda.length > 0 && inc(String(agenda[0].dia || '')));
check('agenda: hora visible', agenda.length > 0 && inc(String(agenda[0].hora || '')));
check('agenda: actividad visible', agenda.length > 0 && inc(String(agenda[0].actividad || '')));

var entradas = Array.isArray(f.tags.categorias_entrada) ? f.tags.categorias_entrada : [];
check('precondicion: categorias_entrada con 1 fila', entradas.length === 1);
check('seccion tipos de entrada presente', html.indexOf('id="tipos-entrada"') !== -1);
check('entrada: tipo visible', entradas.length > 0 && inc(String(entradas[0].tipo || '')));
check('entrada: disponibilidad visible', entradas.length > 0 && inc(String(entradas[0].disponibilidad || '')));

var llevar = Array.isArray(f.tags.que_llevar) ? f.tags.que_llevar : [];
check('precondicion: que_llevar con 3 items', llevar.length === 3);
check('seccion que llevar presente', html.indexOf('id="que-llevar"') !== -1);
var llevarFuera = llevar.filter(function (x) { return !inc(String(x)); });
check('todos los items de que_llevar visibles (' + (llevar.length - llevarFuera.length) + '/' + llevar.length + ')',
  llevar.length > 0 && llevarFuera.length === 0);

var prohibido = Array.isArray(f.tags.prohibido) ? f.tags.prohibido : [];
check('precondicion: prohibido con 1 item', prohibido.length === 1);
check('prohibido visible', prohibido.length > 0 && inc(String(prohibido[0])));

// Secciones de otras categorias fuera.
check('sin seccion menu en evento', html.indexOf('id="menu"') === -1);
check('sin seccion habitaciones en evento', html.indexOf('id="habitaciones"') === -1);
check('sin seccion entradas de sitio en evento', html.indexOf('id="entradas"') === -1);
check('sin seccion delivery en evento', html.indexOf('id="delivery"') === -1);

// -- FAQs e integridad ---------------------------------------------------
check('seccion faq presente', html.indexOf('id="faq"') !== -1);

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
var faqFuera = f.faqs.filter(function (q) { return !inc(q.pregunta); });
check('todas las preguntas de FAQ en el HTML (' + (f.faqs.length - faqFuera.length) + '/' + f.faqs.length + ')',
  faqFuera.length === 0);

console.log('---');
console.log((fallos === 0 ? 'PASS' : 'FAIL') + ' smoke ' + SLUG + ' | checks fallidos=' + fallos);
process.exit(fallos === 0 ? 0 : 1);
