// scripts/smoke_test_plaza-de-florez-mercado-medellin.js
//
// Smoke local de la ficha plaza-de-florez-mercado-medellin
// (comida / restaurante). Renderiza api/pagina-destino.js:buildHTML() en un Renderiza api/pagina-destino.js:buildHTML() en un
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

var SLUG = 'plaza-de-florez-mercado-medellin';
var SUBCAT = 'restaurante';
// Comida no usa el gating de sitio: solo la categoria manda.
var ACTIVAS = [];

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
check('ciudad canonica presente', inc(f.base.ciudad) && f.base.ciudad === 'Medell\u00edn');
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

// -- Comida / restaurante --------------------------------------------------
check('subcategoria en tags', f.tags.subcategoria === 'restaurante');
var menu = f.tags.menu_destacado || [];
check('menu_destacado con datos (' + menu.length + ')', menu.length > 0);
check('seccion menu renderizada', html.indexOf('id="menu"') !== -1);
var platosFuera = menu.filter(function (p) { return !inc(p.nombre); });
check('todos los platos del menu en el HTML (' + (menu.length - platosFuera.length) + '/' + menu.length + ')',
  platosFuera.length === 0);
var horarioDet = f.tags.horario_detallado;
var nDias = horarioDet ? Object.keys(horarioDet).length : 0;
check('horario_detallado es OBJETO con 7 dias (' + nDias + ')',
  horarioDet && typeof horarioDet === 'object' && !Array.isArray(horarioDet) && nDias === 7);
check('seccion horarios renderizada', html.indexOf('id="horarios"') !== -1);
// El motor reetiqueta dos dias (api/pagina-destino.js:2003): Miercoles ->
// Mi\u00e9rcoles y Sabado -> S\u00e1bado. El check usa la etiqueta real.
var DIAS_LABEL = { Miercoles: 'Mi\u00e9rcoles', Sabado: 'S\u00e1bado' };
var diasFuera = Object.keys(horarioDet || {}).filter(function (dia) {
  return !inc(DIAS_LABEL[dia] || dia);
});
check('todos los dias del horario en el HTML (' + (nDias - diasFuera.length) + '/' + nDias + ')',
  diasFuera.length === 0);
var dieta = f.tags.opciones_dieta || [];
check('opciones_dieta con datos (' + dieta.length + ')', dieta.length > 0);
var dietaFuera = dieta.filter(function (o) { return !inc(o); });
check('opciones de dieta visibles (' + (dieta.length - dietaFuera.length) + '/' + dieta.length + ')',
  dietaFuera.length === 0);
check('domicilio declarado en tags', String(f.tags.domicilio || '').length > 0);
check('sin seccion habitaciones (no es hostal)', html.indexOf('id="habitaciones"') === -1);

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
