// scripts/smoke_test_santiago_de_cali.js
// Smoke local: ejecuta buildHTML() de api/pagina-destino.js en un sandbox vm
// con los datos del seed (sin base de datos) y verifica las 12 secciones de
// SITIO_SECCIONES_POR_SUBCATEGORIA.ciudad, el gating, el balance de divs y el
// hero real.
//
// Uso: node scripts/smoke_test_santiago_de_cali.js

const path = require('path');
const fs = require('fs');
const os = require('os');
const vm = require('vm');
const Module = require('module');

const seed = require('./seed-santiago-de-cali.js');

// pagina-destino.js hace require('@neondatabase/serverless') en la cabecera y
// el render no toca la BD: se resuelve a un stub temporal (fuera del repo).
const fakePath = path.join(os.tmpdir(), 'exploraco_fake_neon.js');
fs.writeFileSync(fakePath, 'module.exports = { neon: function(){ return function(){ return []; }; } };\n');
const origResolve = Module._resolveFilename;
Module._resolveFilename = function (request) {
  if (request === '@neondatabase/serverless') return fakePath;
  return origResolve.apply(this, arguments);
};

const src = fs.readFileSync(path.join(__dirname, '..', 'api', 'pagina-destino.js'), 'utf8');
const sandbox = { module: { exports: {} }, require, console, process, Date, JSON };
sandbox.exports = sandbox.module.exports;
vm.createContext(sandbox);
vm.runInContext(src + '\nmodule.exports.buildHTML = buildHTML;', sandbox, { filename: 'api/pagina-destino.js' });

const d = Object.assign({}, seed.BASE, {
  fotos: [{ url: seed.HERO, caption: 'hero' }],
  tags: seed.TAGS,
  rating: 0,
  total_resenas: 0,
  creado_en: new Date(),
  actualizado_en: new Date()
});

// det.faqs es la fuente canonica de la seccion de preguntas: el seed la escribe
// en destinos_detalles, por eso aqui viaja en det.
const det = { entradas: [], tours: [], equipamiento: [], faqs: seed.FAQS };
const html = sandbox.module.exports.buildHTML(d, det, [], []);

let fails = 0;
let total = 0;
function check(label, cond) {
  total++;
  if (!cond) fails++;
  console.log((cond ? 'PASS' : 'FAIL') + ' - ' + label);
}
function enc(s) {
  return String(s).replace(/[^\x00-\x7F]/g, function (c) { return '&#' + c.charCodeAt(0) + ';'; });
}
function inc(s) {
  if (s === null || s === undefined) return false;
  var v = String(s);
  if (html.indexOf(v) !== -1) return true;
  if (html.indexOf(enc(v)) !== -1) return true;
  var esc = v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  return html.indexOf(esc) !== -1 || html.indexOf(enc(esc)) !== -1;
}
function first(arr) { return (Array.isArray(arr) && arr.length) ? arr[0] : null; }

check('renderiza sin error (len > 8000)', typeof html === 'string' && html.length > 8000);
check('hero con nombre del destino', inc(seed.BASE.nombre));
check('hero con la URL real de foto_hero', html.indexOf(seed.HERO) !== -1);
check('chip de subcategoria ciudad', html.indexOf('subcat-chip') !== -1);

// -- 12 secciones de ciudad (api/pagina-destino.js:49) ----------------------
var t = seed.TAGS;
var a0 = first(t.atracciones);
check('1/12 descripcion', html.indexOf('id="descripcion"') !== -1 && inc(String(seed.BASE.descripcion).slice(0, 60)));
check('2/12 atracciones', !!a0 && html.indexOf('id="atracciones"') !== -1 && inc(a0.nombre));
check('3/12 actividades_gratis (id actividades-gratis)', !!first(t.actividades_gratis) && html.indexOf('id="actividades-gratis"') !== -1 && inc(first(t.actividades_gratis).nombre));
check('4/12 programacion', !!first(t.programacion) && html.indexOf('id="programacion"') !== -1 && inc(first(t.programacion).eventos));
check('5/12 accesibilidad', !!first(t.accesibilidad) && html.indexOf('id="accesibilidad"') !== -1 && inc(first(t.accesibilidad).nombre));
check('6/12 contexto', !!t.contexto && html.indexOf('id="contexto"') !== -1 && inc(String(t.contexto).slice(0, 50)));
check('7/12 barrios', !!first(t.barrios) && html.indexOf('id="barrios"') !== -1 && inc(first(t.barrios).nombre));
check('8/12 transporte', !!first(t.transporte) && html.indexOf('id="transporte"') !== -1 && inc(first(t.transporte).nombre));
check('9/12 seguridad', !!first(t.seguridad) && html.indexOf('id="seguridad"') !== -1 && inc(first(t.seguridad).nombre));
check('10/12 presupuesto', !!first(t.presupuesto) && html.indexOf('id="presupuesto"') !== -1 && inc(first(t.presupuesto).tipo));
check('11/12 gastronomia', !!first(t.gastronomia) && html.indexOf('id="gastronomia"') !== -1 && inc(first(t.gastronomia).nombre));
check('12/12 cuando_ir', !!first(t.cuando_ir) && html.indexOf('id="cuando_ir"') !== -1 && inc(first(t.cuando_ir).periodo));

// -- Contenido editorial clave --------------------------------------------
check('highlight Capital Mundial de la Salsa', inc('Capital Mundial de la Salsa'));
check('atraccion Boulevard del Rio (sin foto, si en tags)', inc('Boulevard del Rio'));
check('temporada_matriz renderiza meses', inc('temporada_matriz') || inc('Ene') || inc('Diciembre'));

// -- Gating: arrays vacios a proposito, no deben pintar seccion -------------
check('gating: seccion entradas NO se renderiza en ciudad', html.indexOf('id="entradas"') === -1);
check('gating: seccion fauna NO se renderiza en ciudad', html.indexOf('id="fauna"') === -1);
check('gating: seccion tours NO se renderiza en ciudad', html.indexOf('id="tours"') === -1);

// -- Rating en 0 (ADR-009) -------------------------------------------------
check('sin rating hardcodeado', html.indexOf('/10') === -1 || html.indexOf('0.0/10') !== -1);
check('rating no se siembra', seed.BASE.rating === undefined);

// -- FAQs ----------------------------------------------------------------
check('faqs: primera pregunta presente', !!first(seed.FAQS) && inc(first(seed.FAQS).pregunta));
check('faqs: 5 preguntas en el seed', seed.FAQS.length >= 5);

// -- Fotos verificadas (BUG-022) ------------------------------------------
check('seed expone 5 fotos', seed.PHOTOS.length === 5);
check('hero es la foto de San Antonio', seed.HERO.indexOf('Iglesia_de_San_Antonio_Cali_01') !== -1);

// -- Balance de divs ------------------------------------------------------
var opens = (html.match(/<div/g) || []).length;
var closes = (html.match(/<\/div>/g) || []).length;
console.log('divs open=' + opens + ' close=' + closes + ' diff=' + (opens - closes));
check('balance de divs', opens === closes);

console.log('----');
console.log((fails === 0 ? 'PASS' : 'FAIL') + ' ' + (total - fails) + '/' + total);
if (fails) process.exitCode = 1;
