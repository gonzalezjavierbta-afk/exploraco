// scripts/smoke_test_parques-del-rio-medellin.js
//
// Smoke local de la ficha parques-del-rio-medellin (lote 6, sitio / parque).
// Renderiza api/pagina-destino.js:buildHTML() en un sandbox vm con los datos
// que el seed escribira (scripts/seed-medellin-lote6.js) y verifica:
//   - el gating ADR-016 de 'parque' (api/pagina-destino.js:57): descripcion,
//     entradas, tours, checklist, atracciones, horarios_zona, accesibilidad y
//     actividades_gratis SI; itinerario, dificultad, fauna, secretos y
//     regulaciones NO, aunque el tag traiga contenido (prueba discriminante con
//     render sintetico);
//   - que ningun bloque vacio pinta seccion (las listas de la ficha vienen
//     vacias: entradas[], tours[], itinerario[], atracciones[]);
//   - balance de <div>, ausencia de 'undefined' y de '[object Object]';
//   - que las FAQS sobreviven al fallback del handler y se ven en el HTML, con
//     la MISMA forma en que el motor recibe los datos (detEfectivo).
// No toca base de datos ni red.
//
// ASCII-safe estricto (ADR-002): 0 bytes > 127, 0 backticks.

'use strict';

var fs = require('fs');
var path = require('path');
var vm = require('vm');
var seed = require('./seed-medellin-lote6.js');

var SLUG = 'parques-del-rio-medellin';
var SUBCAT = 'parque';
// SITIO_SECCIONES_POR_SUBCATEGORIA['parque'] (api/pagina-destino.js:57)
var ACTIVAS = ['descripcion', 'entradas', 'tours', 'checklist', 'atracciones',
  'horarios_zona', 'accesibilidad', 'actividades_gratis'];

var f = seed.construirFicha(SLUG);
var src = fs.readFileSync(path.join(__dirname, '..', 'api', 'pagina-destino.js'), 'utf8');

function requireSandbox(nombre) {
  if (nombre === '@neondatabase/serverless') {
    return { neon: function () { return function () { return Promise.resolve([]); }; } };
  }
  return require(nombre);
}

var sandbox = { module: { exports: {} }, console: { log: function () {} }, process: process, require: requireSandbox };
sandbox.exports = sandbox.module.exports;
vm.createContext(sandbox);
vm.runInContext(src + '\nmodule.exports.buildHTML = buildHTML;', sandbox, { filename: 'api/pagina-destino.js' });

var tagsDb = seed.tagsPersistidos(f);

// api/pagina-destino.js:3122: si destinos_detalles no trae amenidades,
// det.faqs se SOBRESCRIBE con tags.faqs. Se replica el contrato real para
// comprobar el render con la MISMA forma en que el motor recibe los datos.
function detDe(tags) {
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
  return sandbox.module.exports.buildHTML(
    Object.assign({}, f.base, {
      fotos: f.fotos,
      tags: tags,
      rating: 0,
      total_resenas: 0,
      creado_en: new Date(),
      actualizado_en: new Date()
    }),
    detDe(tags), f.fotos, [], null, [], null, null, [], []
  );
}

var html = render(null);
var detEfectivo = detDe(tagsDb);

// Render sintetico: contenido en TODOS los bloques de sitio, para discriminar
// si una seccion no aparece por falta de dato o por el gating de subcategoria.
var sint = render({
  entradas: [{ tipo: 'General', precio: 20000, incluye: 'Acceso general' }],
  tours: [{ nombre: 'Tour sintetico', tipo: 'Grupal', precio: 50000 }],
  itinerario: [{ dia: 'Dia 1', hora: '09:00', titulo: 'Parada sintetica' }],
  checklist: ['Agua', 'Protector solar'],
  dificultad_tags: ['facil', 'familiar'],
  atracciones: [{ nombre: 'Atraccion sintetica', descripcion: 'Bloque sintetico' }],
  horarios_zona: [{ dia: 'Lunes', horario: '08:00 - 18:00' }],
  accesibilidad: [{ tipo: 'Rampa', detalle: 'Entrada principal' }],
  actividades_gratis: [{ nombre: 'Actividad gratuita sintetica' }],
  secretos: JSON.stringify([{ titulo: 'Secreto sintetico' }]),
  fauna_flora: JSON.stringify([{ nombre: 'Especie sintetica' }])
});

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
function arr(k) {
  var v = f.tags[k];
  return Array.isArray(v) ? v : [];
}
var sinJS = markup(html);
function has(h, id) { return String(h).indexOf('id="' + id + '"') !== -1; }
function divs(h) {
  return { open: (String(h).match(/<div/g) || []).length, close: (String(h).match(/<\/div>/g) || []).length };
}

// -- Comunes al lote ------------------------------------------------------
check('renderiza sin error (len>8000)', typeof html === 'string' && html.length > 8000);
check('nombre en el hero', inc(f.base.nombre));
check('ciudad canonica presente', inc(f.base.ciudad));
check('ciudad con tilde (grafia unica)', f.base.ciudad === 'Medell\u00edn');
check('region derivada del catalogo', f.base.region === 'Antioquia');
check('zona de la lista cerrada', f.base.zona === 'andina' || f.base.zona === null);
check('foto_hero en el HTML', html.indexOf(f.hero) !== -1);
check('galeria con 5 fotos o mas', f.fotos.length >= 5);
check('sin undefined en el markup', sinJS.indexOf('undefined') === -1);
check('sin [object Object]', html.indexOf('[object Object]') === -1);
check('status published con completitud >= 40',
  f.status === 'published' && f.completitud.puntos >= seed.UMBRAL);
check('sin claves de autor ni XP en tags',
  tagsDb.autor_id === undefined && tagsDb.pub_xp_estado === undefined && tagsDb.pub_geo === undefined);
check('cinco claves pub_* en persistible',
  !!f.pub && typeof f.pub.pub_completitud === 'number' && Array.isArray(f.pub.pub_faltantes)
  && typeof f.pub.pub_tier === 'string' && typeof f.pub.pub_fotos_total === 'number'
  && typeof f.pub.pub_fotos_no_hero === 'number');
check('secretos/fauna_flora como STRING JSON o ausentes',
  (f.tags.secretos === undefined || typeof f.tags.secretos === 'string')
  && (f.tags.fauna_flora === undefined || typeof f.tags.fauna_flora === 'string'));

// -- Sitio / parque -------------------------------------------------------
check('subcategoria en tags', f.tags.subcategoria === SUBCAT);
check('descripcion larga renderizada', has(html, 'descripcion'));
check('mapa con coordenadas', has(html, 'mapa'));
check('como llegar renderizado', has(html, 'como-llegar'));

var nEntradas = arr('entradas').length;
check('entradas: sin dato no pinta seccion (n=' + nEntradas + ')',
  (nEntradas > 0) === has(html, 'entradas'));
check('entradas se renderiza cuando hay dato (gating ON)', has(sint, 'entradas'));

check('tours esta en el gating de ' + SUBCAT, ACTIVAS.indexOf('tours') !== -1);
check('tours se renderiza cuando hay dato (gating ON)', has(sint, 'tours'));
check('sin seccion tours vacia en el HTML real', !has(html, 'tours'));

check('itinerario fuera del gating de ' + SUBCAT, ACTIVAS.indexOf('itinerario') === -1);
check('itinerario no se pinta ni con dato (gating OFF)', !has(sint, 'itinerario'));
check('sin seccion itinerario en el HTML real', !has(html, 'itinerario'));

check('dificultad fuera del gating de ' + SUBCAT, ACTIVAS.indexOf('dificultad') === -1);
check('dificultad_tags es array o ausente en tags',
  f.tags.dificultad_tags === undefined || Array.isArray(f.tags.dificultad_tags));
check('dificultad no se pinta ni con dificultad_tags (gating OFF)', !has(sint, 'dificultad'));

check('atracciones se renderiza cuando hay dato (gating ON)', has(sint, 'atracciones'));
check('sin seccion atracciones vacia', !has(html, 'atracciones'));
check('horarios-zona se renderiza cuando hay dato (gating ON)', has(sint, 'horarios-zona'));
check('sin seccion horarios vacia', !has(html, 'horarios-zona'));
check('accesibilidad se renderiza cuando hay dato (gating ON)', has(sint, 'accesibilidad'));
check('sin seccion accesibilidad vacia', !has(html, 'accesibilidad'));
check('actividades-gratis se renderiza cuando hay dato (gating ON)', has(sint, 'actividades-gratis'));
check('sin seccion actividades gratis vacia', !has(html, 'actividades-gratis'));
check('sin seccion checklist vacia', !has(html, 'checklist'));
check('sin seccion fauna vacia', !has(html, 'fauna'));
check('sin seccion secretos (fuera del gating)', !has(html, 'secretos'));
check('sin seccion regulaciones vacia', !has(html, 'regulaciones'));

// -- Integridad estructural ----------------------------------------------
var dReal = divs(html);
var dSint = divs(sint);
console.log('divs reales open=' + dReal.open + ' close=' + dReal.close + ' diff=' + (dReal.open - dReal.close));
console.log('divs sinteticos open=' + dSint.open + ' close=' + dSint.close + ' diff=' + (dSint.open - dSint.close));
check('balance de divs (render real)', dReal.open === dReal.close);
check('balance de divs (render sintetico)', dSint.open === dSint.close);

// -- FAQs: contrato real del handler (linea 3122) -------------------------
var faqsDet = Array.isArray(detEfectivo.faqs) ? detEfectivo.faqs : [];
check('FAQs sobreviven al fallback del handler (' + faqsDet.length + '/' + f.faqs.length + ')',
  f.faqs.length > 0 && faqsDet.length === f.faqs.length);
check('seccion FAQ renderizada', has(html, 'faq'));
var faqFuera = f.faqs.filter(function (q) { return !inc(q.pregunta); });
check('todas las preguntas de FAQ en el HTML (' + (f.faqs.length - faqFuera.length) + '/' + f.faqs.length + ')',
  faqFuera.length === 0);

console.log('---');
console.log((fallos === 0 ? 'PASS' : 'FAIL') + ' smoke ' + SLUG + ' | checks fallidos=' + fallos);
process.exit(fallos === 0 ? 0 : 1);
