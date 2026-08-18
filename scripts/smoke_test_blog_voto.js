// Smoke test de buildHTML(): voto rapido habilitado en blogs (TSK-055)
// Mismo patron que smoke_test_evento.js (TASK-003).
global.require_orig = require;
const Module = require('module');
const path = require('path');

const origResolve = Module._resolveFilename;
Module._resolveFilename = function(request, ...args) {
  if (request === '@neondatabase/serverless') {
    return path.join(__dirname, 'fake_neon.js');
  }
  return origResolve.call(this, request, ...args);
};
require('fs').writeFileSync(path.join(__dirname,'fake_neon.js'), 'module.exports = { neon: function(){ return function(){ return []; }; } };');

const fs = require('fs');
const vm = require('vm');
const src = fs.readFileSync(path.join(__dirname, '..', 'api', 'pagina-destino.js'), 'utf8');

const sandbox = { module: { exports: {} }, require, console, process };
sandbox.exports = sandbox.module.exports;
vm.createContext(sandbox);
const wrapped = src + '\nmodule.exports.buildHTML = buildHTML;';
vm.runInContext(wrapped, sandbox, { filename: 'api/pagina-destino.js' });

const base = {
  slug: 'blog-de-prueba', nombre: 'Blog de Prueba', categoria_slug: 'blog',
  ciudad: 'Bogota', region: '', barrio: '', lead: 'Un articulo de prueba',
  descripcion: 'Contenido del articulo', highlight: '', foto_hero: '', hero_bg: '',
  lat: null, lng: null, whatsapp: '', telefono: '', email: '', web: '', instagram: '',
  precio_desde: '', horario: '', emoji: '', status: 'published', destacado: false,
  booking: '', hostelworld: '', airbnb: '', tipo: '', capacidad: '', como_llegar: '',
  tags: { temas: ['cultura'], autor: { nombre: 'Smoke' } },
  rating: 0, total_resenas: 0, creado_en: new Date(), actualizado_en: new Date()
};

const blog = Object.assign({}, base);
const html = sandbox.module.exports.buildHTML(blog, {}, [], []);

function check(label, cond) {
  console.log((cond ? 'PASS' : 'FAIL') + ' - ' + label);
  if (!cond) process.exitCode = 1;
}

// Widget de voto rapido presente en blog (antes suprimido)
check('blog: widget #qr-stars presente', html.includes('id="qr-stars"'));
check('blog: funcion votarDID presente', html.includes('votarDID('));
check('blog: copy de voto de articulo', html.includes('Califica este art'));
check('blog: no usa copy de lugar', !html.includes('Califica este lugar'));
check('blog: contador de votos usa "opiniones"', html.includes('" opiniones"'));
check('blog: 1 solo #qr-stars (sin IDs duplicados)', (html.match(/id="qr-stars"/g)||[]).length === 1);

// Degradacion: blog sin resenas sigue mostrando el widget (nRes=0)
const blogSinRes = Object.assign({}, base, { rating: 0, total_resenas: 0 });
const html2 = sandbox.module.exports.buildHTML(blogSinRes, {}, [], []);
check('blog sin resenas: widget sigue presente', html2.includes('id="qr-stars"'));
check('blog sin resenas: seccion opiniones presente', html2.includes('Opinion'));

// Regresion: sitio conserva el widget con su copy
const sitio = Object.assign({}, base, { categoria_slug: 'sitio', lat: 4.6, lng: -74.06, tags: {} });
const htmlSitio = sandbox.module.exports.buildHTML(sitio, {}, [], []);
check('sitio: widget #qr-stars presente', htmlSitio.includes('id="qr-stars"'));
check('sitio: copy de lugar', htmlSitio.includes('Califica este lugar'));
check('sitio: contador de votos usa "resenas"', htmlSitio.includes('" resenas"'));
check('regresion: sitio renderiza sin error', typeof htmlSitio === 'string' && htmlSitio.length > 100);

// Equilibrio de divs en la seccion de resenas (smoke rapido)
const abrir = (html.match(/<div/g)||[]).length;
const cerrar = (html.match(/<\/div>/g)||[]).length;
check('blog: balance de divs (' + abrir + ' vs ' + cerrar + ')', abrir === cerrar);
