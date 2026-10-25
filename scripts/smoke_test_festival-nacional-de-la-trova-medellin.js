// scripts/smoke_test_festival-nacional-de-la-trova-medellin.js
//
// Smoke local de la ficha festival-nacional-de-la-trova-medellin (lote 6,
// evento / festival). La ficha trae status=draft porque la edicion 2027 no
// tiene anuncio oficial y la fecha_fin sembrada (2026-08-08) ya paso: la
// regla "evento caducado -> draft" de ADR-100 D6 aplica, asi que aqui status
// DEBE ser draft aunque la completitud supere el umbral.
//
// Renderiza api/pagina-destino.js:buildHTML() en un sandbox vm con los datos
// que el seed escribira (scripts/seed-medellin-lote6.js) y verifica las
// secciones propias de evento: fecha y sede (#evento-fechas), lineup, agenda,
// tipos de entrada y que llevar/prohibido; mas balance de <div> y ausencia de
// undefined / [object Object] en el markup sin <script>.
// El bloque prohibido esta VACIO en esta ficha: no debe pintar tarjeta.
// No toca base de datos ni red.
//
// ASCII-safe estricto (ADR-002): 0 bytes > 127, 0 backticks.

'use strict';

var fs = require('fs');
var path = require('path');
var vm = require('vm');
var seed = require('./seed-medellin-lote6.js');

var SLUG = 'festival-nacional-de-la-trova-medellin';

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
var detEfectivo = detDe(tagsDb);

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

var html = sandbox.module.exports.buildHTML(
  Object.assign({}, f.base, {
    fotos: f.fotos,
    tags: tagsDb,
    rating: 0,
    total_resenas: 0,
    creado_en: new Date(),
    actualizado_en: new Date()
  }),
  detEfectivo, f.fotos, [], null, [], null, null, [], []
);

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
var MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio',
  'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
// Mismo formato que fmtFechaEvento (api/pagina-destino.js:891).
function fechaEvento(iso) {
  var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''));
  if (!m) return String(iso || '');
  return parseInt(m[3], 10) + ' de ' + MESES[parseInt(m[2], 10) - 1] + ' de ' + m[1];
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

// -- Admision ADR-100 (evento sin anuncio 2027 -> draft) ------------------
check('status draft (evento caducado, ADR-100 D6)', f.status === 'draft');
check('motivo de draft declarado', /evento caducado|draft/.test(String(f.motivo)));
check('completitud >= UMBRAL_INTERMEDIO', f.completitud.puntos >= seed.UMBRAL);
check('sin claves de autor ni XP en tags',
  tagsDb.autor_id === undefined && tagsDb.pub_xp_estado === undefined && tagsDb.pub_geo === undefined);
check('cinco claves pub_* en persistible',
  !!f.pub && typeof f.pub.pub_completitud === 'number' && Array.isArray(f.pub.pub_faltantes)
  && typeof f.pub.pub_tier === 'string' && typeof f.pub.pub_fotos_total === 'number'
  && typeof f.pub.pub_fotos_no_hero === 'number');
check('subcategoria evento en tags', String(f.tags.subcategoria || '') === 'festival');

// -- Evento: fechas -------------------------------------------------------
check('fecha_inicio ISO', /^\d{4}-\d{2}-\d{2}$/.test(String(f.tags.fecha_inicio || '')));
check('fecha_fin ISO', /^\d{4}-\d{2}-\d{2}$/.test(String(f.tags.fecha_fin || '')));
check('fecha_fin posterior a fecha_inicio', String(f.tags.fecha_fin) > String(f.tags.fecha_inicio));
check('fuente de fechas declarada', /^https?:\/\//.test(String(f.tags.fuente_fechas || '')));
check('seccion fecha y sede', html.indexOf('id="evento-fechas"') !== -1);
check('fecha_inicio visible formateada', inc(fechaEvento(f.tags.fecha_inicio)));
check('fecha_fin visible formateada', inc(fechaEvento(f.tags.fecha_fin)));
check('edicion visible', inc(f.tags.edicion || ''));
check('sede visible', inc(f.tags.sede || ''));
check('etiqueta de sede visible', inc('Sede'));

// -- Evento: lineup --------------------------------------------------------
var lineup = arr('lineup');
check('lineup coherente con el dato (n=' + lineup.length + ')',
  (lineup.length > 0) === (html.indexOf('id="lineup"') !== -1));
check('primer nombre del lineup visible', lineup.length > 0 && inc(lineup[0].nombre));

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
check('prohibido vacio no pinta tarjeta Prohibido',
  prohibido.length > 0 || html.indexOf('>Prohibido<') === -1);

// -- Evento: no hereda secciones de sitio --------------------------------
check('sin bloque de dificultad (no es sitio)', html.indexOf('id="dificultad"') === -1);
check('sin seccion de entradas de sitio', html.indexOf('id="entradas"') === -1);

// -- Evento: datos vacios no pintan seccion --------------------------------
check('prohibido ausente cuando el dato esta vacio', arr('prohibido').length > 0 || html.indexOf('>Prohibido<') === -1);
check('al menos un item de que llevar visible', arr('que_llevar').length > 0 && inc(arr('que_llevar')[0]));

// -- Integridad estructural -----------------------------------------------
var opens = (html.match(/<div/g) || []).length;
var closes = (html.match(/<\/div>/g) || []).length;
console.log('divs open=' + opens + ' close=' + closes + ' diff=' + (opens - closes));
check('balance de divs', opens === closes);

// -- FAQs: contrato real del handler (linea 3122) -------------------------
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
