// scripts/smoke_test_fincas-silleteras-santa-elena.js
//
// Smoke local de la ficha fincas-silleteras-santa-elena (lote 3, sitio).
// Renderiza api/pagina-destino.js:buildHTML() en un sandbox vm con los datos
// que el seed escribira (scripts/seed-medellin-lote3.js) y verifica:
//   - comunes del lote: render, nombre, ciudad canonica, foto_hero, sin
//     'undefined' en el markup (los <script> se descartan) ni '[object Object]'.
//   - contrato ADR-016: cada seccion de sitio se pinta SI Y SOLO SI su id esta
//     en la lista de la subcategoria Y hay dato. La lista se copia literal de
//     SITIO_SECCIONES_POR_SUBCATEGORIA (api/pagina-destino.js:51-61), de modo
//     que el test detecta a la vez una seccion vacia que se pinta y una seccion
//     con datos que se pierde por el gating.
//     NOTA de subcategoria: PERMITIDAS es la lista de ESTA ficha, copiada de
//     SITIO_SECCIONES_POR_SUBCATEGORIA. Si una seccion no esta en ella (p.ej.
//     dificultad en 'espacio-publico' o 'cultura') el render NO la pinta
//     aunque TAGS traiga el dato. Es comportamiento del render, no del seed:
//     el test lo fija y avisa si cambia.
//   - entradas vacio -> sin seccion (no se inventan precios).
//   - integridad estructural: balance de <div>.
// No toca base de datos ni red.
//
// ASCII-safe estricto (ADR-002): 0 bytes > 127, 0 backticks.

'use strict';

var fs = require('fs');
var path = require('path');
var vm = require('vm');
var seed = require('./seed-medellin-lote3.js');

var SLUG = 'fincas-silleteras-santa-elena';

// Copia literal de api/pagina-destino.js:58.
var PERMITIDAS = ['descripcion','entradas','colecciones','recorridos','horarios_zona','accesibilidad','secretos','programacion','contexto'];

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

function arr(k) {
  var v = f.tags[k];
  return Array.isArray(v) ? v : [];
}
function textoJSON(k) {
  var v = f.tags[k];
  if (v === null || v === undefined) return '';
  return String(v).trim();
}
function seccion(id, tieneDato) {
  var esperada = PERMITIDAS.indexOf(id) !== -1 && tieneDato;
  var pintada = html.indexOf('id="' + id + '"') !== -1;
  check('seccion ' + id + ': dato=' + (tieneDato ? 'si' : 'no') + ' pintada=' + (pintada ? 'si' : 'no') + ' esperada=' + (esperada ? 'si' : 'no'), pintada === esperada);
  return pintada;
}

// -- Comunes a las 6 fichas del lote --------------------------------------
check('renderiza sin error (len>8000)', typeof html === 'string' && html.length > 8000);
check('nombre en el hero', inc(f.base.nombre));
check('ciudad canonica presente', inc(f.base.ciudad));
check('ciudad con tilde (grafia unica)', f.base.ciudad === 'Medell\u00edn');
check('region derivada del catalogo', f.base.region === 'Antioquia');
check('zona de la lista cerrada', f.base.zona === 'andina' || f.base.zona === null);
check('foto_hero en el HTML', html.indexOf(f.hero) !== -1);
check('5 fotos en la galeria', f.fotos.length === 5);
check('sin undefined en el markup', sinJS.indexOf('undefined') === -1);
check('sin [object Object]', html.indexOf('[object Object]') === -1);

// -- Admision ADR-100 (el seed, no la BD, decide el status) ---------------
check('status published (completitud y guardas OK)', f.status === 'published');
check('completitud >= UMBRAL_INTERMEDIO', f.completitud.puntos >= seed.UMBRAL);
check('sin claves de autor ni XP en tags', !('autor_id' in f.tags) && !('pub_xp_estado' in f.tags) && !('pub_geo' in f.tags));
check('cinco claves pub_* en persistible', !!f.pub && typeof f.pub.pub_completitud === 'number' && Array.isArray(f.pub.pub_faltantes));
check('subcategoria en tags', String(f.tags.subcategoria || '') === 'cultura');

// -- Sitio: secciones descripcion y mapa -----------------------------------
check('seccion descripcion', html.indexOf('id="descripcion"') !== -1);
check('mapa con coordenadas', html.indexOf('id="mapa"') !== -1);
check('lead renderizado', inc(f.base.lead.slice(0, 40)));
check('subcat chip visible', html.indexOf('subcat-chip') !== -1);

// -- Sitio: matriz ADR-016 (dato vs gating) -------------------------------
seccion('entradas', arr('entradas').length > 0);
seccion('tours', arr('tours').length > 0);
seccion('checklist', arr('equipamiento').length > 0);
seccion('itinerario', arr('itinerario').length > 0);
seccion('fauna', textoJSON('fauna_flora') !== '');
seccion('secretos', textoJSON('secretos') !== '');
seccion('regulaciones', textoJSON('regulaciones') !== '');
var pintadaDif = seccion('dificultad', !!(f.tags.dificultad || f.tags.temporada_matriz || arr('temporada').length));

// -- Sitio: datos de texto clave que SI existen ---------------------------
check('dificultad en tags', String(f.tags.dificultad || '') === 'Facil');
check('matriz de temporada con 12 meses', !!f.tags.temporada_matriz && Object.keys(f.tags.temporada_matriz).length === 12);
check('fauna_flora no se siembra como array', !Array.isArray(f.tags.fauna_flora));
check('secretos no se siembra como array', !Array.isArray(f.tags.secretos));
check('entradas vacio en tags (nada inventado)', arr('entradas').length === 0);
if (pintadaDif) {
  check('nivel de dificultad visible', inc('Nivel de dificultad'));
  check('etiqueta de epoca visible', inc('\u00c9poca ideal para visitar'));
} else {
  check('sin etiqueta de epoca sin bloque de dificultad', !inc('\u00c9poca ideal para visitar'));
}

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
