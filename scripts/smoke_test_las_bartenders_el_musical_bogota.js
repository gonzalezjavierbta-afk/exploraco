const seed = require('./seed-las-bartenders-el-musical-bogota.js');
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
const html = sandbox.module.exports.buildHTML(d, {}, [], []);
function check(label, cond) { console.log((cond ? 'PASS' : 'FAIL') + ' - ' + label); if (!cond) process.exitCode = 1; }
function enc(s) { return String(s).replace(/[^\x00-\x7F]/g, function(c) { return '&#' + c.charCodeAt(0) + ';'; }); }
function inc(s) { return html.includes(enc(s)) || html.includes(s); }
check('renderiza sin error (len>5000)', typeof html === 'string' && html.length > 5000);
check('Fecha y sede con rango de fechas', html.includes('id="evento-fechas"') && html.includes('27 de Agosto de 2026') && html.includes('29 de Agosto de 2026'));
check('Edicion y sede en tarjetas', html.includes('Temporada Bogota 2026') && inc(seed.TAGS.sede));
check('Sin seccion lineup (lineup vacio)', !html.includes('id="lineup"'));
check('Agenda con 3 funciones', (html.match(/Funci/g) || []).length >= 3 && html.includes('cierre de temporada'));
check('Tipos de entrada desde $86.000', html.includes('id="tipos-entrada"') && html.includes('$86.000'));
check('Que llevar / prohibido 18+', html.includes('id="que-llevar"') && inc(seed.TAGS.que_llevar[0]) && inc(seed.TAGS.prohibido[0]));
check('Mapa con coordenadas Casa E Borrero', html.includes('4.63287'));
const opens = (html.match(/<div/g) || []).length;
const closes = (html.match(/<\/div>/g) || []).length;
console.log('divs open=' + opens + ' close=' + closes + ' diff=' + (opens - closes));
check('balance de divs', opens === closes);
