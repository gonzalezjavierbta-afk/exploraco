// scripts/smoke_test_medellin.js
//
// Smoke local de la pagina de CIUDAD medellin (sitio, sin subcategoria).
// Renderiza api/pagina-destino.js:buildHTML() en un sandbox vm con la fila que
// scripts/seed-medellin.js escribira (misma ficha, misma completitud) y
// verifica:
//   - el hero SIN foto: degrada a hero_bg solido (#1b4d3e), sin <img> roto
//   - las secciones de sitio: entradas, tours, itinerario (13 paradas),
//     secretos, equipamiento (checklist), fauna, regulaciones y FAQ
//   - sin subcategoria -> fallback ADR-016 = todas las secciones activas
//   - JSON-LD valido (TouristAttraction, sin image y sin aggregateRating)
//   - ausencia de 'undefined' y 'null' en el markup, balance de <div>
// No toca base de datos ni red.
//
// ASCII-safe estricto (ADR-002): 0 bytes > 127, 0 backticks.

'use strict';

var fs = require('fs');
var path = require('path');
var vm = require('vm');
var seed = require('./seed-medellin.js');

var SLUG = seed.SLUG;

// Fila publicada por la excepcion autorizada (--publicar-sin-foto): es el
// estado real que se siembra. El status draft se comprueba aparte, sin render.
var f = seed.construir({ publicarSinFoto: true });

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

// tags tal como los devuelve la base tras el upsert: S.tagsPersistidos aporta
// las 5 claves pub_*, faqs, excepcion_admision y sin_foto_hero (flag de fila
// que lee api/pagina-destino.js:712-747). Pasar f.tags a pelo no reproduciria
// el contrato real: el flag no estaria y el motor pintaria el Unsplash.
var tagsDb = seed.tagsPersistidos(f);

var d = Object.assign({}, f.base, {
  fotos: f.fotos,
  tags: tagsDb,
  rating: 0,
  total_resenas: 0,
  creado_en: new Date(),
  actualizado_en: new Date()
});

// El handler (api/pagina-destino.js:3117-3126) SOBRESCRIBE det.faqs con
// tags.faqs cuando destinos_detalles no trae amenidades (senal de hostal). Se
// replica tal cual: pasar { faqs: f.faqs } a pelo no reproduce el contrato.
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
var total = 0;
function check(label, cond) {
  total++;
  console.log((cond ? 'PASS' : 'FAIL') + ' - ' + label);
  if (!cond) fallos++;
}
// El motor escapa TODO byte > 127 como entidad por CODE POINT
// (api/pagina-destino.js:esc usa codePointAt para pares subrogados): un emoji
// sale como &#127800;, no como dos entidades de subrogado. enc() replica eso.
function enc(s) {
  var t = String(s);
  var out = '';
  for (var i = 0; i < t.length; i++) {
    var c = t.codePointAt(i);
    if (c > 0xFFFF) {
      out += '&#' + c + ';';
      i++;
    } else if (c > 127) {
      out += '&#' + c + ';';
    } else {
      out += t.charAt(i);
    }
  }
  return out;
}
function inc(s) { return html.indexOf(enc(s)) !== -1 || html.indexOf(String(s)) !== -1; }
// El motor emite su propio literal var DID="undefined" dentro de un <script>.
// La fuga de datos se busca en el MARKUP, no en el JS inline del render.
function markup(h) { return String(h).replace(/<script[\s\S]*?<\/script>/gi, ''); }
var sinJS = markup(html);

function listaTags(clave) {
  var v = f.tags[clave];
  if (Array.isArray(v)) return v;
  if (typeof v === 'string' && v.trim()) {
    try {
      var p = JSON.parse(v);
      return Array.isArray(p) ? p : [];
    } catch (e) {
      return [];
    }
  }
  return [];
}

// -- Render y hero sin foto -----------------------------------------------
check('renderiza sin error (len>8000)', typeof html === 'string' && html.length > 8000);
check('nombre en el hero', inc(f.base.nombre));
check('ciudad canonica presente', inc(f.base.ciudad));
check('foto_hero es NULL en la fila', f.base.foto_hero === null);
check('tags.sin_foto_hero = true en la fila persistida', tagsDb.sin_foto_hero === true);

// Con tags.sin_foto_hero el motor corta el fallback Unsplash
// (api/pagina-destino.js:712-747) y el hero degrada a hero_bg + emoji.
var iHero = html.indexOf('<section class="hero"');
var heroHTML = (iHero !== -1) ? html.slice(iHero, html.indexOf('</section>', iHero)) : '';
check('hero localizado en el markup', heroHTML.length > 0);
check('hero usa hero_bg solido (background:#1b4d3e)',
  heroHTML.indexOf('background:' + f.base.hero_bg) !== -1);
check('hero muestra el emoji de la fila', heroHTML.indexOf(enc(f.base.emoji)) !== -1 || heroHTML.indexOf(f.base.emoji) !== -1);
check('hero sin background-image', heroHTML.indexOf('background-image') === -1);
check('hero sin <img> roto (src vacio/undefined/null)',
  !/<img[^>]*src="(?:|undefined|null)"/i.test(html));
check('hero sin url() vacia', !/url\(\s*(''|""|undefined|null)\s*\)/i.test(html));

// Cero imagen de stock: el flag la corta en los TRES consumidores.
check('cero images.unsplash.com en el HTML',
  (html.match(/images\.unsplash\.com/g) || []).length === 0);
check('sin og:image', !/<meta\s+property="og:image"/i.test(html));
check('sin twitter:image', !/<meta\s+name="twitter:image"/i.test(html));

// -- Secciones de sitio (sin subcategoria -> fallback: todas activas) -----
var entradas = listaTags('entradas');
check('seccion entradas habilitada', entradas.length === 8 && html.indexOf('id="entradas"') !== -1);
var entradasFuera = entradas.filter(function (e) { return !inc(e.tipo); });
check('las 8 entradas en el HTML (' + (entradas.length - entradasFuera.length) + '/' + entradas.length + ')',
  entradasFuera.length === 0);

var tours = listaTags('tours');
check('seccion tours habilitada', tours.length === 5 && html.indexOf('id="tours"') !== -1);
var toursFuera = tours.filter(function (t) { return !inc(t.nombre); });
check('los 5 tours en el HTML (' + (tours.length - toursFuera.length) + '/' + tours.length + ')',
  toursFuera.length === 0);
check('tours sin rating inventado', tours.every(function (t) { return !t.rating && !t.review_count; }));

var itinerario = listaTags('itinerario');
check('seccion itinerario habilitada', html.indexOf('id="itinerario"') !== -1);
check('itinerario con 13 paradas', itinerario.length === 13);
var itiFuera = itinerario.filter(function (it) { return !inc(it.titulo); });
check('las 13 paradas en el HTML (' + (itinerario.length - itiFuera.length) + '/13)',
  itiFuera.length === 0);
check('3 dias distintos en el itinerario',
  ['D\u00eda 1', 'D\u00eda 2', 'D\u00eda 3'].every(function (dia) {
    return itinerario.some(function (it) { return it.dia === dia; });
  }));

var secretos = listaTags('secretos');
check('seccion secretos habilitada', secretos.length === 6 && html.indexOf('id="secretos"') !== -1);
var secFuera = secretos.filter(function (s) { return !inc(s.titulo); });
check('los 6 secretos en el HTML (' + (secretos.length - secFuera.length) + '/' + secretos.length + ')',
  secFuera.length === 0);

var equipamiento = listaTags('equipamiento');
check('seccion equipamiento/checklist habilitada',
  equipamiento.length === 7 && html.indexOf('id="checklist"') !== -1);
var eqFuera = equipamiento.filter(function (e) { return !inc(e.item); });
check('los 7 items de equipamiento en el HTML (' + (equipamiento.length - eqFuera.length) + '/7)',
  eqFuera.length === 0);

var fauna = listaTags('fauna_flora');
check('seccion fauna habilitada', fauna.length === 6 && html.indexOf('id="fauna"') !== -1);
check('seccion regulaciones habilitada', html.indexOf('id="regulaciones"') !== -1);
check('seccion dificultad habilitada', html.indexOf('id="dificultad"') !== -1);
check('descripcion larga renderizada', html.indexOf('id="descripcion"') !== -1);

// -- FAQs: contrato real del handler --------------------------------------
var faqsDet = Array.isArray(detEfectivo.faqs) ? detEfectivo.faqs : [];
check('FAQs sobreviven al fallback del handler (' + faqsDet.length + '/' + f.faqs.length + ')',
  f.faqs.length === 5 && faqsDet.length === f.faqs.length);
check('seccion FAQ renderizada', html.indexOf('id="faq"') !== -1);
var faqFuera = f.faqs.filter(function (q) { return !inc(q.pregunta); });
check('las 5 preguntas de FAQ en el HTML (' + (f.faqs.length - faqFuera.length) + '/' + f.faqs.length + ')',
  faqFuera.length === 0);

// -- JSON-LD --------------------------------------------------------------
var m = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/i);
var ld = null;
try { ld = m ? JSON.parse(m[1]) : null; } catch (e) { ld = null; }
check('JSON-LD presente y parseable', ld !== null);
check('JSON-LD @type TouristAttraction', ld && ld['@type'] === 'TouristAttraction');
check('JSON-LD name = nombre', ld && ld.name === f.base.nombre);
check('JSON-LD addressLocality = ciudad canonica',
  ld && ld.address && ld.address.addressLocality === f.base.ciudad);
check('JSON-LD geo con lat/lng', ld && ld.geo && ld.geo.latitude === f.base.lat && ld.geo.longitude === f.base.lng);
check('JSON-LD sin image (flag sin_foto_hero)', ld && !('image' in ld));
check('JSON-LD sin aggregateRating (rating 0)', ld && !('aggregateRating' in ld));

// -- Integridad estructural ----------------------------------------------
check('sin undefined en el markup', sinJS.indexOf('undefined') === -1);
check('sin null en el markup', sinJS.indexOf('null') === -1);
check('sin [object Object]', html.indexOf('[object Object]') === -1);

var opens = (html.match(/<div/g) || []).length;
var closes = (html.match(/<\/div>/g) || []).length;
console.log('divs open=' + opens + ' close=' + closes + ' diff=' + (opens - closes));
check('balance de divs', opens === closes);

// -- Estado de admision (sin render) --------------------------------------
var sinBandera = seed.construir({ publicarSinFoto: false });
check('sin --publicar-sin-foto la fila sale draft', sinBandera.status === 'draft');
check('con --publicar-sin-foto la fila sale published', f.status === 'published');
check('excepcion_admision registrada en tags',
  f.excepcion && f.excepcion.tipo === 'sin_foto_hero' && f.excepcion.autorizada_operador === true &&
  /^\d{4}-\d{2}-\d{2}$/.test(f.excepcion.fecha));

console.log('---');
console.log((fallos === 0 ? 'PASS' : 'FAIL') + ' ' + (total - fallos) + '/' + total +
  ' smoke ' + SLUG + ' | checks fallidos=' + fallos);
process.exit(fallos === 0 ? 0 : 1);
