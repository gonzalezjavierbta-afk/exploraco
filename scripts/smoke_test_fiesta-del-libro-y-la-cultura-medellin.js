// scripts/smoke_test_fiesta-del-libro-y-la-cultura-medellin.js
//
// Smoke local de la ficha fiesta-del-libro-y-la-cultura-medellin (lote 3,
// evento / festival). Unico evento del lote y unico con fechas FUTURAS
// verificadas: 10 al 19 de septiembre de 2027, con TAGS.fuente_fechas y
// TAGS.edicion_verificada = true, asi que aqui status DEBE ser 'published'
// (la regla "evento caducado -> draft" de ADR-100 D6 no aplica: fecha_fin no
// ha pasado). El resto de eventos del repo se comprueban en draft.
//
// Renderiza api/pagina-destino.js:buildHTML() en un sandbox vm con los datos
// que el seed escribira (scripts/seed-medellin-lote3.js) y verifica las
// secciones propias de evento: fecha y sede (#evento-fechas), lineup, agenda,
// tipos de entrada y que llevar/prohibido; mas balance de <div> y ausencia de
// 'undefined' / '[object Object]' en el markup sin <script>.
// No toca base de datos ni red.
//
// ASCII-safe estricto (ADR-002): 0 bytes > 127, 0 backticks.

'use strict';

var fs = require('fs');
var path = require('path');
var vm = require('vm');
var seed = require('./seed-medellin-lote3.js');

var SLUG = 'fiesta-del-libro-y-la-cultura-medellin';

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

// -- Admision ADR-100 (fechas 2027 verificadas -> published) --------------
check('status published (fecha_fin futura, no caducado)', f.status === 'published');
check('completitud >= UMBRAL_INTERMEDIO', f.completitud.puntos >= seed.UMBRAL);
check('sin claves de autor ni XP en tags', !('autor_id' in f.tags) && !('pub_xp_estado' in f.tags) && !('pub_geo' in f.tags));
check('cinco claves pub_* en persistible', !!f.pub && typeof f.pub.pub_completitud === 'number' && Array.isArray(f.pub.pub_faltantes));
check('subcategoria evento en tags', String(f.tags.subcategoria || '') === 'festival');

// -- Evento: fechas verificadas -------------------------------------------
check('fecha_inicio ISO', /^\d{4}-\d{2}-\d{2}$/.test(String(f.tags.fecha_inicio || '')));
check('fecha_fin ISO', /^\d{4}-\d{2}-\d{2}$/.test(String(f.tags.fecha_fin || '')));
check('fecha_fin posterior a fecha_inicio', String(f.tags.fecha_fin) > String(f.tags.fecha_inicio));
check('fecha_fin en el futuro (no caducado)', String(f.tags.fecha_fin) >= new Date().toISOString().slice(0, 10));
check('fuente de fechas declarada', /^https?:\/\//.test(String(f.tags.fuente_fechas || '')));
check('edicion verificada', f.tags.edicion_verificada === true);

// -- Evento: fecha y sede -------------------------------------------------
check('seccion fecha y sede', html.indexOf('id="evento-fechas"') !== -1);
check('edicion visible', inc(f.tags.edicion || ''));
check('sede visible', inc(f.tags.sede || ''));
check('etiqueta de sede visible', inc('Sede'));

// -- Evento: lineup --------------------------------------------------------
var lineup = arr('lineup');
check('lineup con datos', lineup.length > 0 && html.indexOf('id="lineup"') !== -1);
check('primer nombre del lineup visible', lineup.length > 0 && inc(lineup[0].nombre));
check('escenario del lineup visible', lineup.length > 0 && !!lineup[0].escenario && inc(lineup[0].escenario));

// -- Evento: agenda --------------------------------------------------------
var agenda = arr('agenda');
check('agenda con datos', agenda.length > 0 && html.indexOf('id="agenda"') !== -1);
check('primera actividad visible', agenda.length > 0 && inc(agenda[0].actividad));
check('dia de agenda en tabla', agenda.length > 0 && inc(agenda[0].dia));
check('hora de agenda en tabla', agenda.length > 0 && inc(agenda[0].hora));

// -- Evento: tipos de entrada ---------------------------------------------
var cats = arr('categorias_entrada');
check('tipos de entrada con datos', cats.length > 0 && html.indexOf('id="tipos-entrada"') !== -1);
check('primer tipo visible', cats.length > 0 && inc(cats[0].tipo));
check('precio del tipo visible', cats.length > 0 && inc(cats[0].precio));
check('disponibilidad visible', cats.length > 0 && inc(cats[0].disponibilidad));

// -- Evento: que llevar / prohibido ---------------------------------------
var llevar = arr('que_llevar');
var prohibido = arr('prohibido');
check('seccion que llevar', (llevar.length > 0 || prohibido.length > 0) && html.indexOf('id="que-llevar"') !== -1);
check('primer item de que llevar visible', llevar.length > 0 && inc(llevar[0]));
check('primer item prohibido visible', prohibido.length > 0 && inc(prohibido[0]));

// -- Evento: no hereda secciones de sitio --------------------------------
check('sin bloque de dificultad (no es sitio)', html.indexOf('id="dificultad"') === -1);
check('sin seccion de entradas de sitio', html.indexOf('id="entradas"') === -1);

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
