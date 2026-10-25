// scripts/smoke_test_teatro-metropolitano-jose-gutierrez-gomez.js
//
// Smoke local de la ficha teatro-metropolitano-jose-gutierrez-gomez (sitio /
// cultura). Renderiza api/pagina-destino.js:buildHTML() en un sandbox vm con
// los datos que el seed escribira (scripts/seed-medellin-lote4.js) y verifica:
//   - descripcion, galeria, mapa y como llegar
//   - el gating de subcategoria cultura: entradas vacia no pinta seccion,
//     colecciones/recorridos/horarios_zona/accesibilidad sin datos, secretos
//     vacio y regulaciones excluida por el propio gating (aunque trae texto)
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

var SLUG = 'teatro-metropolitano-jose-gutierrez-gomez';

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
check('categoria sitio', f.categoria === 'sitio');
check('subcategoria cultura en tags', f.subcategoria === 'cultura');
check('status published (' + f.status + ')', f.status === 'published');
check('completitud >= 40 (' + f.completitud.puntos + ')', f.completitud.puntos >= 40);
check('ciudad derivada del catalogo (Medellin)', f.base.ciudad === 'Medell\u00edn');
check('region derivada del catalogo', f.base.region === 'Antioquia');
check('zona de lista cerrada o NULL', f.base.zona === null || typeof f.base.zona === 'string');
check('secretos descartado de tags (array vacio)', !Object.prototype.hasOwnProperty.call(f.tags, 'secretos'));
check('fauna_flora descartado de tags (array vacio)', !Object.prototype.hasOwnProperty.call(f.tags, 'fauna_flora'));

// -- Sitio / cultura ------------------------------------------------------
check('seccion descripcion presente', html.indexOf('id="descripcion"') !== -1);
check('descripcion larga visible', inc(f.base.descripcion.slice(0, 40)));
check('seccion mapa presente', html.indexOf('id="mapa"') !== -1);
check('mapa con coordenadas', html.indexOf(String(f.base.lat) + ',' + String(f.base.lng)) !== -1);
check('seccion como llegar presente', html.indexOf('id="como-llegar"') !== -1);
check('seccion contacto presente', html.indexOf('id="contact"') !== -1);
check('seccion resenas presente (sin rating inventado, ADR-009)', html.indexOf('id="resenas"') !== -1);

// Gating cultura: entradas habilitada pero vacia -> sin seccion. Colecciones,
// recorridos, horarios_zona y accesibilidad habilitadas y sin datos -> sin
// seccion. regulaciones trae texto pero NO esta en la lista de cultura.
var entradas = Array.isArray(f.tags.entradas) ? f.tags.entradas : [];
var tours = Array.isArray(f.tags.tours) ? f.tags.tours : [];
var itinerario = Array.isArray(f.tags.itinerario) ? f.tags.itinerario : [];
check('precondicion: entradas vacia', entradas.length === 0);
check('precondicion: tours vacio', tours.length === 0);
check('precondicion: itinerario vacio', itinerario.length === 0);
check('sin seccion entradas vacia', html.indexOf('id="entradas"') === -1);
check('sin seccion tours (fuera de cultura)', html.indexOf('id="tours"') === -1);
check('sin seccion itinerario (fuera de cultura)', html.indexOf('id="itinerario"') === -1);
check('sin seccion checklist (fuera de cultura)', html.indexOf('id="checklist"') === -1);
check('sin seccion colecciones (sin datos)', html.indexOf('id="colecciones"') === -1);
check('sin seccion recorridos (sin datos)', html.indexOf('id="recorridos"') === -1);
check('sin seccion horarios-zona (sin datos)', html.indexOf('id="horarios-zona"') === -1);
check('sin seccion accesibilidad (sin datos)', html.indexOf('id="accesibilidad"') === -1);
check('sin seccion secretos vacia', html.indexOf('id="secretos"') === -1);
check('sin seccion fauna (fuera de cultura)', html.indexOf('id="fauna"') === -1);
check('precondicion: regulaciones trae texto', String(f.tags.regulaciones || '').length > 30);
check('seccion regulaciones oculta por gating cultura', html.indexOf('id="regulaciones"') === -1);
check('sin seccion contexto (sin datos)', html.indexOf('id="contexto"') === -1);

// Secciones de otras categorias fuera.
check('sin seccion menu en sitio', html.indexOf('id="menu"') === -1);
check('sin seccion habitaciones en sitio', html.indexOf('id="habitaciones"') === -1);
check('sin seccion delivery en sitio', html.indexOf('id="delivery"') === -1);
check('sin seccion evento-fechas en sitio', html.indexOf('id="evento-fechas"') === -1);
check('sin seccion lineup en sitio', html.indexOf('id="lineup"') === -1);

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
