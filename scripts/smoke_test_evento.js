// Smoke test de buildHTML() con datos mock de Evento (TASK-003)
// Mismo patron que el smoke test usado en TASK-001/TASK-002.
global.require_orig = require;
const Module = require('module');
const path = require('path');

// Interceptar require('@neondatabase/serverless') que no existe en este sandbox
const origResolve = Module._resolveFilename;
Module._resolveFilename = function(request, ...args) {
  if (request === '@neondatabase/serverless') {
    return path.join(__dirname, 'fake_neon.js');
  }
  return origResolve.call(this, request, ...args);
};
require('fs').writeFileSync(path.join(__dirname,'fake_neon.js'), 'module.exports = { neon: function(){ return function(){ return []; }; } };');

const mod = require('../api/pagina-destino.js');
// buildHTML no esta exportado directamente, lo extraemos con un truco:
// leemos el archivo y evaluamos buildHTML en un contexto controlado.
const fs = require('fs');
const src = fs.readFileSync('../api/pagina-destino.js', 'utf8');
const vm = require('vm');

const sandbox = { module: { exports: {} }, require, console, process };
sandbox.exports = sandbox.module.exports;
vm.createContext(sandbox);
// Exponer buildHTML agregando una linea al final via wrapper
const wrapped = src + '\nmodule.exports.buildHTML = buildHTML;';
vm.runInContext(wrapped, sandbox, { filename: '../api/pagina-destino.js' });

const destinoEvento = {
  slug: 'feria-de-prueba', nombre: 'Feria de Prueba', categoria_slug: 'evento',
  ciudad: 'Bogota', region: 'Cundinamarca', barrio: '', lead: 'Un evento de prueba',
  descripcion: 'Descripcion larga de prueba', highlight: '', foto_hero: '', hero_bg: '',
  lat: 4.65, lng: -74.05, whatsapp: '', telefono: '', email: '', web: '', instagram: '',
  precio_desde: 'Desde $80.000', horario: '', emoji: '', status: 'published', destacado: false,
  booking: '', hostelworld: '', airbnb: '', tipo: '', capacidad: '80.000 personas',
  como_llegar: '', tags: {
    fecha_inicio: '2026-12-05', fecha_fin: '2026-12-07', edicion: '35a edicion',
    sede: 'Parque Simon Bolivar, Bogota',
    lineup: [{nombre:'DJ Prueba', escenario:'Escenario Norte', hora:'8:00 PM'}],
    agenda: [{dia:'Viernes', hora:'6:00 PM', actividad:'Apertura de puertas'}],
    categorias_entrada: [{tipo:'General', precio:'$80.000', disponibilidad:'Disponible'}, {tipo:'VIP', precio:'$200.000', disponibilidad:'Agotado'}],
    que_llevar: ['Protector solar', 'Documento de identidad'],
    prohibido: ['Ingreso de bebidas', 'Mascotas']
  },
  rating: 4.5, total_resenas: 10, creado_en: new Date(), actualizado_en: new Date()
};

const html = sandbox.module.exports.buildHTML(destinoEvento, {}, [], []);

function check(label, cond) {
  console.log((cond ? 'PASS' : 'FAIL') + ' - ' + label);
  if (!cond) process.exitCode = 1;
}

check('contiene seccion Fecha y sede', html.includes('id="evento-fechas"'));
check('fecha formateada (5 de Diciembre de 2026)', html.includes('5 de Diciembre de 2026'));
check('contiene Lineup / Artistas', html.includes('Lineup / Artistas') && html.includes('DJ Prueba'));
check('contiene Agenda del evento (secuencial)', html.includes('Agenda del evento') && html.includes('Apertura de puertas'));
check('contiene Tipos de entrada con 2 filas', (html.match(/entrada-tipo/g)||[]).length >= 2 && html.includes('General') && html.includes('VIP'));
check('Agotado se marca con tip-red', /Agotado<\/span>/.test(html) && html.includes('tip-red'));
check('contiene Que llevar (checklist)', html.includes('Protector solar') && html.includes('Ingreso de bebidas'));
check('sede y edicion visibles', html.includes('Parque Simon Bolivar') && html.includes('35a edicion'));

// Degradacion: evento SIN tags nuevos no debe generar secciones fantasma
const destinoEventoVacio = Object.assign({}, destinoEvento, { tags: {} });
const htmlVacio = sandbox.module.exports.buildHTML(destinoEventoVacio, {}, [], []);
check('degradacion: sin tags no aparece Lineup', !htmlVacio.includes('id="lineup"'));
check('degradacion: sin tags no aparece Agenda', !htmlVacio.includes('id="agenda"'));
check('degradacion: sin tags no aparece Tipos de entrada', !htmlVacio.includes('id="tipos-entrada"'));
check('degradacion: sin tags no aparece Que llevar', !htmlVacio.includes('id="que-llevar"'));

// Verificar que Sitio/Comida/Hostal no se rompieron (regresion)
const destinoSitio = Object.assign({}, destinoEvento, { categoria_slug:'sitio', tags: { tipo_actividad:'Caminata', dificultad:'Facil' } });
const htmlSitio = sandbox.module.exports.buildHTML(destinoSitio, {}, [], []);
check('regresion: Sitio sigue renderizando sin error', typeof htmlSitio === 'string' && htmlSitio.length > 100);
