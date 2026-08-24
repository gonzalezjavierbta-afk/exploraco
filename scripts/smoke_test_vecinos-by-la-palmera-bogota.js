// scripts/smoke_test_vecinos-by-la-palmera-bogota.js
// Smoke local: renderiza buildHTML() con el seed real y verifica las
// secciones propias de categoria hostal. No requiere base de datos.

const seed = require('./seed-vecinos-by-la-palmera-bogota.js');
global.require_orig = require;
const Module = require('module');
const path = require('path');
const origResolve = Module._resolveFilename;
Module._resolveFilename = function(request, ...args) {
  if (request === '@neondatabase/serverless') return path.join(__dirname, 'fake_neon.js');
  return origResolve.call(this, request, ...args);
};
require('fs').writeFileSync(path.join(__dirname, 'fake_neon.js'), 'module.exports = { neon: function(){ return function(){ return []; }; } };');
const fs = require('fs');
const vm = require('vm');
const src = fs.readFileSync(path.join(__dirname, '..', 'api', 'pagina-destino.js'), 'utf8');
const sandbox = { module: { exports: {} }, require, console, process };
sandbox.exports = sandbox.module.exports;
vm.createContext(sandbox);
const wrapped = src + '\nmodule.exports.buildHTML = buildHTML;';
vm.runInContext(wrapped, sandbox, { filename: 'api/pagina-destino.js' });
const d = Object.assign({}, seed.BASE, { fotos: [{ url: seed.HERO }], tags: seed.TAGS, rating: 4.8, total_resenas: 3, creado_en: new Date(), actualizado_en: new Date() });
var det = { habitaciones: seed.TAGS.habitaciones || [], amenidades: seed.TAGS.amenidades || [], checkin: seed.TAGS.checkin || '', checkout: seed.TAGS.checkout || '', booking_url: '', hostelworld_url: '' };
const html = sandbox.module.exports.buildHTML(d, det, [], []);
function check(label, cond) { console.log((cond ? 'PASS' : 'FAIL') + ' - ' + label); if (!cond) process.exitCode = 1; }
function enc(s) { return String(s).replace(/[^\x00-\x7F]/g, function(c) { return '&#' + c.charCodeAt(0) + ';'; }); }
function inc(s) { return html.includes(enc(s)) || html.includes(s); }
check('renderiza sin error (len>8000)', typeof html === 'string' && html.length > 8000);
var hab0 = (seed.TAGS.habitaciones || [])[0];
check('Seccion habitaciones con primera habitacion', !!hab0 && html.includes('id="habitaciones"') && inc(hab0.tipo));
check('Pill Check-in / Check-out', html.includes('Check-in:') && html.includes('Check-out:'));
check('Reglas de casa con tipo de alojamiento', html.includes('id="reglas-casa"') && inc(seed.TAGS.tipo_alojamiento));
check('Politica de cancelacion presente', inc(String(seed.TAGS.politica_cancelacion).slice(0, 30)));
var act0 = (seed.TAGS.actividades || [])[0];
check('Seccion actividades con primera actividad', !!act0 && html.includes('id="actividades"') && inc(act0.nombre));
var tr0 = (seed.TAGS.transporte || [])[0];
check('Como llegar con primer transporte', !!tr0 && html.includes('id="como-llegar"') && inc(tr0.title));
var am0 = (seed.TAGS.amenidades || [])[0];
check('Amenidades en pills', !!am0 && inc(am0));
var barrioDesc = seed.TAGS.barrio_descripcion || '';
check('Barrio descripcion en Como llegar', !barrioDesc || inc(barrioDesc.slice(0, 40)));
if ((seed.TAGS.eventos_hostal || []).length) {
  check('Eventos del hostal renderizados', html.includes('id="eventos-hostal"') && inc(seed.TAGS.eventos_hostal[0].titulo));
}
check('Latitud en mapa', html.includes(String(seed.BASE.lat)));
const opens = (html.match(/<div/g) || []).length;
const closes = (html.match(/<\/div>/g) || []).length;
console.log('divs open=' + opens + ' close=' + closes + ' diff=' + (opens - closes));
check('balance de divs', opens === closes);
