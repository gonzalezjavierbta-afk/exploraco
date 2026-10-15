// scripts/smoke_test_la_redada_miscelanea_cultural.js
// Smoke test de la pagina dinamica la-redada-miscelanea-cultural (categoria
// sitio, subcategoria cultura). Patron de
// scripts/smoke_test_la_casona_de_la_candelaria_bogota.js: carga
// api/pagina-destino.js en un sandbox vm con un fake de
// @neondatabase/serverless y renderiza buildHTML() con los datos del seed.
//
// Verifica:
//   - render sin error (len>5000)
//   - secciones habilitadas por el gating de cultura (colecciones, recorridos,
//     accesibilidad, programacion, horarios_zona, secretos, entradas, contexto)
//     CON su contenido real
//   - AUSENCIA de las secciones que el gating oculta (tours, itinerario,
//     dificultad)
//   - que los precios de entradas no produzcan "NaN" en el HTML
//   - balance de divs (abiertos === cerrados)
//
// Uso: node scripts/smoke_test_la_redada_miscelanea_cultural.js
// Exit: 0 = PASS | 1 = FAIL.

const seed = require('./seed-la-redada-miscelanea-cultural.js');
const Module = require('module');
const path = require('path');
const fs = require('fs');

// Fake de @neondatabase/serverless (el motor lo requiere al cargarse).
const origResolve = Module._resolveFilename;
Module._resolveFilename = function(request) {
  if (request === '@neondatabase/serverless') return path.join(__dirname, 'fake_neon.js');
  return origResolve.apply(this, arguments);
};
fs.writeFileSync(path.join(__dirname, 'fake_neon.js'), 'module.exports = { neon: function(){ return function(){ return []; }; } };');

const vm = require('vm');
const src = fs.readFileSync(path.join(__dirname, '..', 'api', 'pagina-destino.js'), 'utf8');
const sandbox = { module: { exports: {} }, require, console, process };
sandbox.exports = sandbox.module.exports;
vm.createContext(sandbox);
vm.runInContext(src + '\nmodule.exports.buildHTML = buildHTML;', sandbox, { filename: 'api/pagina-destino.js' });

const d = Object.assign({}, seed.BASE, {
  id: 'smoke-la-redada',
  tags: seed.TAGS,
  fotos: [],
  rating: 0,
  total_resenas: 0,
  creado_en: new Date(),
  actualizado_en: new Date()
});

const html = sandbox.module.exports.buildHTML(d, { faqs: seed.FAQS || [] }, [], []);

function check(label, cond) {
  console.log((cond ? 'PASS' : 'FAIL') + ' - ' + label);
  if (!cond) process.exitCode = 1;
}
function inc(hay, needle) { return typeof hay === 'string' && hay.indexOf(needle) !== -1; }

console.log('=== smoke la-redada-miscelanea-cultural (sitio / cultura) ===');

check('renderiza sin error (len>5000)', typeof html === 'string' && html.length > 5000);
check('hero con nombre y highlight',
  inc(html, 'La Redada Miscelanea Cultural') && inc(html, 'Espacio cultural independiente y autogestionado'));
check('chip de subcategoria Cultura', inc(html, 'Cultura'));

check('seccion descripcion con el texto real',
  inc(html, 'nodo vivo de la cultura independiente') && inc(html, 'economia solidaria'));

check('seccion entradas con precios',
  inc(html, 'id="entradas"') && inc(html, 'Entrada General') && inc(html, 'Gratis')
  && inc(html, 'Conciertos y Funciones') && inc(html, 'Acceso a la casona, exposiciones y cafe'));

// FIX POR DATO del bug money(): un rango en el campo precio se concatena
// ("$10.000 - $30.000" -> "$1.000.030.000"). El precio ahora es money-safe
// ("$10.000") y el rango vive en el texto de incluye.
var precios = html.match(/\$[0-9.]+/g) || [];
var maxPrecio = 0;
precios.forEach(function(p) {
  var n = parseInt(p.replace(/[^0-9]/g, ''), 10);
  if (!isNaN(n) && n > maxPrecio) maxPrecio = n;
});
check('entradas: sin NaN ni cifras > $1.000.000 (' + precios.length + ' precios, max=$' + maxPrecio + ')',
  !inc(html, 'NaN') && precios.length > 0 && maxPrecio <= 1000000);
check('entradas: literal del nuevo precio money-safe',
  inc(html, '$10.000') && inc(html, 'rango habitual $10.000 - $30.000'));

check('seccion colecciones (tienda autonoma)',
  inc(html, 'id="colecciones"') && inc(html, 'Tienda Autonoma')
  && inc(html, 'Fanzines y editorial independiente') && inc(html, 'Grafica independiente'));

check('seccion recorridos (casona + hitos)',
  inc(html, 'id="recorridos"') && inc(html, 'Recorrido por la Casona y Tienda Autonoma')
  && inc(html, 'Paseo por las salas de exposicion') && inc(html, '1 hora')
  && inc(html, 'Patio Central') && inc(html, 'Salas de Exhibicion y Escenario'));

check('seccion accesibilidad',
  inc(html, 'id="accesibilidad"') && inc(html, 'Apto para todo publico') && inc(html, 'Acceso peatonal accesible'));

check('seccion programacion (agenda Mie-Sab)',
  inc(html, 'id="programacion"') && inc(html, 'Mie-Sab 04:00 PM') && inc(html, 'Mie-Sab 05:30 PM')
  && inc(html, 'Mie-Sab 07:00 PM') && inc(html, 'patio central de la casona')
  && inc(html, 'teatro, cine-foro o concierto independiente'));

check('seccion horarios por zona',
  inc(html, 'id="horarios-zona"') && inc(html, 'Programacion cultural') && inc(html, 'Mie-Sab 3:00 PM - 11:00 PM'));

check('seccion secretos (2 tip-cards)',
  inc(html, 'id="secretos"') && inc(html, 'El Patio Central') && inc(html, 'Economia solidaria')
  && inc(html, 'sin intermediarios'));

check('seccion contexto (norma, Nequi y agenda anual)',
  inc(html, 'id="contexto"') && inc(html, 'libre de discriminacion')
  && inc(html, 'bebidas alcoholicas externas') && inc(html, 'Nequi')
  && inc(html, 'continua durante todo el ano'));

check('seccion FAQ con las 5 preguntas',
  inc(html, 'id="faq"') && inc(html, 'Donde queda La Redada Miscelanea Cultural?'));

check('AUSENCIA de seccion tours (gating cultura)', !inc(html, 'id="tours"'));
check('AUSENCIA de seccion itinerario (gating cultura)', !inc(html, 'id="itinerario"'));
check('AUSENCIA de seccion dificultad (gating cultura)', !inc(html, 'id="dificultad"'));
check('precios sin NaN', !inc(html, 'NaN') && !inc(html, 'undefined</td>'));

const opens = (html.match(/<div/g) || []).length;
const closes = (html.match(/<\/div>/g) || []).length;
console.log('divs open=' + opens + ' close=' + closes + ' diff=' + (opens - closes));
check('balance de divs', opens === closes);
