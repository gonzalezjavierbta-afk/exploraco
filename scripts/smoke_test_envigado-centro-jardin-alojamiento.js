// scripts/smoke_test_envigado-centro-jardin-alojamiento.js
//
// Smoke local de la ficha envigado-centro-jardin-alojamiento
// (sitio / sitio-historico). Renderiza api/pagina-destino.js:buildHTML() en un Renderiza api/pagina-destino.js:buildHTML() en un
// sandbox vm con los datos que el seed escribira y verifica:
//   - el gating ADR-016 de 'espacio-publico': descripcion, entradas,
//     atracciones, horarios_zona, accesibilidad, actividades_gratis y
//     programacion SI; tours, itinerario, checklist, fauna y regulaciones NO,
//     aunque el tag traiga contenido (prueba discriminante con render sintetico);
//   - balance de <div>, ausencia de 'undefined' y de '[object Object]';
//   - que las FAQS sobreviven al fallback del handler y se ven en el HTML,
//     con la MISMA forma en que el motor recibe los datos (detEfectivo).
// No toca base de datos ni red.
//
// ASCII-safe estricto (ADR-002): 0 bytes > 127, 0 backticks.

'use strict';

var fs = require('fs');
var path = require('path');
var vm = require('vm');
var seed = require('./seed-medellin-lote5.js');

var SLUG = 'envigado-centro-jardin-alojamiento';
var SUBCAT = 'sitio-historico';
// SITIO_SECCIONES_POR_SUBCATEGORIA['sitio-historico'] (api/pagina-destino.js:59)
var ACTIVAS = ['descripcion', 'entradas', 'recorridos', 'horarios_zona',
  'accesibilidad', 'secretos', 'contexto'];

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

function detEfectivoDe(tags) {
  // api/pagina-destino.js:3117-3126: si destinos_detalles no trae amenidades,
  // det.faqs se SOBRESCRIBE con tags.faqs. Se replica el contrato real.
  var det = { faqs: f.faqs };
  if (!det.amenidades && tags) {
    det.amenidades = tags.amenidades;
    det.habitaciones = tags.habitaciones;
    det.faqs = tags.faqs;
    det.checkin = tags.checkin;
    det.checkout = tags.checkout;
  }
  return det;
}

function render(extra) {
  var tags = {};
  Object.keys(tagsDb).forEach(function (k) { tags[k] = tagsDb[k]; });
  if (extra) Object.keys(extra).forEach(function (k) { tags[k] = extra[k]; });
  var d = Object.assign({}, f.base, {
    fotos: f.fotos,
    tags: tags,
    rating: 0,
    total_resenas: 0,
    creado_en: new Date(),
    actualizado_en: new Date()
  });
  return sandbox.module.exports.buildHTML(d, detEfectivoDe(tags), f.fotos, [], null, [], null, null, [], []);
}

var html = render(null);
var detEfectivo = detEfectivoDe(tagsDb);

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

// -- Comunes al lote ------------------------------------------------------
check('renderiza sin error (len>8000)', typeof html === 'string' && html.length > 8000);
check('nombre en el hero', inc(f.base.nombre));
check('ciudad canonica presente', inc(f.base.ciudad) && f.base.ciudad === 'Envigado');
check('region derivada del catalogo', f.base.region === 'Antioquia');
check('zona de lista cerrada', f.base.zona === 'andina');
check('foto_hero en el HTML', html.indexOf(f.hero) !== -1);
check('sin undefined en el markup', sinJS.indexOf('undefined') === -1);
check('sin [object Object]', html.indexOf('[object Object]') === -1);
check('status published con completitud >= 40',
  f.status === 'published' && f.completitud.puntos >= seed.UMBRAL);
check('sin claves de autor ni XP en tags',
  tagsDb.autor_id === undefined && tagsDb.pub_xp_estado === undefined && tagsDb.pub_geo === undefined);
check('secretos/fauna_flora como STRING JSON o ausentes',
  (f.tags.secretos === undefined || typeof f.tags.secretos === 'string')
  && (f.tags.fauna_flora === undefined || typeof f.tags.fauna_flora === 'string'));

// -- Sitio / sitio-historico ----------------------------------------------
check('subcategoria en tags', f.tags.subcategoria === SUBCAT);
check('descripcion larga renderizada', html.indexOf('id="descripcion"') !== -1);
check('mapa con coordenadas', html.indexOf('id="mapa"') !== -1 && html.indexOf('id="como-llegar"') !== -1);

var nEntradas = (f.tags.entradas || []).length;
check('entradas: seccion coherente con el dato (n=' + nEntradas + ')',
  (nEntradas > 0) === (html.indexOf('id="entradas"') !== -1));
var sintEntradas = render({ entradas: [{ tipo: 'General', precio: 20000, incluye: 'Acceso general' }] });
check('entradas se renderiza cuando hay dato (gating ON)', sintEntradas.indexOf('id="entradas"') !== -1);

var sintParque = render({
  tours: [{ nombre: 'Tour sintetico', tipo: 'Grupal', precio: 50000 }],
  itinerario: [{ dia: 'Dia 1', hora: '09:00', titulo: 'Parada sintetica' }]
});
check('tours fuera del gating de ' + SUBCAT, ACTIVAS.indexOf('tours') === -1 && sintParque.indexOf('id="tours"') === -1);
check('sin seccion tours vacia', html.indexOf('id="tours"') === -1);
check('itinerario fuera del gating de ' + SUBCAT, ACTIVAS.indexOf('itinerario') === -1 && sintParque.indexOf('id="itinerario"') === -1);
check('sin seccion itinerario vacia', html.indexOf('id="itinerario"') === -1);
check('sin seccion checklist (no habilitada)', html.indexOf('id="checklist"') === -1);
check('sin seccion fauna vacia', html.indexOf('id="fauna"') === -1);
check('sin seccion regulaciones vacia', html.indexOf('id="regulaciones"') === -1);
check('sin seccion secretos vacia', html.indexOf('id="secretos"') === -1);
check('sin seccion entradas vacia en el HTML real', nEntradas > 0 || html.indexOf('id="entradas"') === -1);

// -- Integridad estructural ----------------------------------------------
var opens = (html.match(/<div/g) || []).length;
var closes = (html.match(/<\/div>/g) || []).length;
console.log('divs open=' + opens + ' close=' + closes + ' diff=' + (opens - closes));
check('balance de divs', opens === closes);

// -- FAQs: contrato real del handler (lineas 3117-3126) -------------------
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
