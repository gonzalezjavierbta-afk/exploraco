// Smoke test de Milestones v2 (prompt gsming, ADR-014): niveles 15,
// GET tabla_destino (3 senderos + patrocinios), bloque "Lider del Spot"
// en buildHTML y POST review_voto (validacion de reglas de la migracion
// 007). Reutiliza el patron de smoke_test_blog_voto.js.
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
// El handler llama neon(process.env.DATABASE_URL) -> devuelve una
// funcion sql. Para el GET tabla_destino se inyecta un mock por global.
require('fs').writeFileSync(path.join(__dirname,'fake_neon.js'),
  'module.exports = { neon: function(){ return function(q){ return global.__MOCKSQL__ ? global.__MOCKSQL__(q) : []; }; } };');

const fs = require('fs');
const vm = require('vm');

function check(label, cond) {
  console.log((cond ? 'PASS' : 'FAIL') + ' - ' + label);
  if (!cond) process.exitCode = 1;
}

// ---- 1) NIVELES 15 en api/usuarios.js -----------------------------
const srcUsu = fs.readFileSync(path.join(__dirname, '..', 'api', 'usuarios.js'), 'utf8');
const sandboxUsu = { module: { exports: {} }, require, console, process };
sandboxUsu.exports = sandboxUsu.module.exports;
vm.createContext(sandboxUsu);
vm.runInContext(srcUsu + '\nmodule.exports.NIVELES = NIVELES; module.exports.calcularNivel = calcularNivel;', sandboxUsu, { filename: 'api/usuarios.js' });
const NIVELES = sandboxUsu.module.exports.NIVELES;
const calcularNivel = sandboxUsu.module.exports.calcularNivel;
check('NIVELES: 15 rangos (3 Eras)', NIVELES.length === 15);
const umbrales = NIVELES.map(function(n){ return n.min; });
check('NIVELES: umbrales del prompt (0,100,250,450,700,1000,1400,1900,2500,3200,4000,5000,6500,8500,11000)',
  JSON.stringify(umbrales) === JSON.stringify([0,100,250,450,700,1000,1400,1900,2500,3200,4000,5000,6500,8500,11000]));
check('NIVELES: Maestro ExploraCO en 11000', NIVELES[14].nombre.indexOf('Maestro') !== -1);
check('NIVELES: calcularNivel(0) -> nivel 1', calcularNivel(0).nivel === 1);
check('NIVELES: calcularNivel(11000) -> nivel 15', calcularNivel(11000).nivel === 15);
check('NIVELES: calcularNivel(2000) -> nivel 8 (Cartografo, 1900<=2000<2500)', calcularNivel(2000).nivel === 8);

// ---- 2) GET tabla_destino (3 senderos + patrocinios) ---------------
// Se evalua la logica de forma directa: el GET vive en el handler; aqui
// se valida el shape esperado por mi-perfil.html (senderos con fama,
// acciones y sendero {nivel, total}; patrocinios siempre []).
const srcInt = fs.readFileSync(path.join(__dirname, '..', 'api', 'interacciones.js'), 'utf8');
const sandboxInt = { module: { exports: {} }, require, console, process, fetch: function(){ return Promise.resolve({ json: function(){ return Promise.resolve({}); } }); } };
sandboxInt.exports = sandboxInt.module.exports;
vm.createContext(sandboxInt);
vm.runInContext(srcInt + '\nmodule.exports.MISIONES = MISIONES; module.exports.LOGROS = LOGROS; module.exports.esLiderDeCiudad = esLiderDeCiudad; module.exports.handler = module.exports;', sandboxInt, { filename: 'api/interacciones.js' });
const MISIONES = sandboxInt.module.exports.MISIONES;
const LOGROS = sandboxInt.module.exports.LOGROS;
const esLiderDeCiudad = sandboxInt.module.exports.esLiderDeCiudad;

const misIds = MISIONES.map(function(m){ return m.id; });
check('MISIONES: incluye mis_own_spot_bogota', misIds.indexOf('mis_own_spot_bogota') !== -1);
check('MISIONES: incluye mis_gran_arquitecto', misIds.indexOf('mis_gran_arquitecto') !== -1);
check('MISIONES: incluye mis_itinerario_perfeccion', misIds.indexOf('mis_itinerario_perfeccion') !== -1);
const misOwn = MISIONES.filter(function(m){ return m.id === 'mis_own_spot_bogota'; })[0];
check('MISIONES: mis_own_spot_bogota otorga +75 XP', misOwn.xp === 75);

const logrIds = LOGROS.map(function(l){ return l.id; });
check('LOGROS: incluye logr_spot_domado', logrIds.indexOf('logr_spot_domado') !== -1);
check('LOGROS: incluye logr_especialista_gastro', logrIds.indexOf('logr_especialista_gastro') !== -1);
check('LOGROS: incluye logr_cazador_rarezas', logrIds.indexOf('logr_cazador_rarezas') !== -1);

// GET tabla_destino: se invoca el handler real con un sql mock que
// responde por contenido de query (usuarios existe, agregados en 0).
const mockSql = function(query) {
  if (query.indexOf('FROM usuarios WHERE id') !== -1) return Promise.resolve([{ id: 'u1' }]);
  if (query.indexOf('n_guardados') !== -1) return Promise.resolve([{ fama: 150, n_guardados: 20, n_visitas: 3 }]);
  if (query.indexOf('n_resenas') !== -1) return Promise.resolve([{ fama: 120, n_resenas: 4, n_votos: 2 }]);
  if (query.indexOf('n_mapas') !== -1) return Promise.resolve([{ n_mapas: 2, n_publicos: 1, n_destinos: 9 }]);
  return Promise.resolve([]);
};
function invokeTablaDestino() {
  return new Promise(function(resolve) {
    global.__MOCKSQL__ = mockSql;
    var req = { method: 'GET', query: { tipo: 'tabla_destino', usuario_id: 'u1' } };
    var res = { setHeader: function(){}, status: function(){ return this; }, json: function(payload){ resolve(payload); } };
    sandboxInt.module.exports(req, res).catch(function(err){ resolve({ ok: false, error: err.message }); });
  });
}
// esLiderDeCiudad degrada a false cuando la migracion 007 no corrio
// (votos_utiles inexistente -> catch -> false).
const sqlFallback = function(){ return Promise.reject(new Error('columna inexistente')); };
return invokeTablaDestino().then(function(td) {
  check('tabla_destino: ok=true', td.ok === true);
  check('tabla_destino: 3 senderos', td.data && td.data.senderos.length === 3);
  var ids = (td.data.senderos || []).map(function(s){ return s.id; });
  check('tabla_destino: senderos explorador/critico/organizador',
    JSON.stringify(ids) === JSON.stringify(['explorador','critico','organizador']));
  var org = td.data.senderos[2];
  check('tabla_destino: fama organizador = mapas*40 + destinos*5', org.fama === (2*40 + 9*5));
  check('tabla_destino: sendero expone nivel y total', typeof org.sendero.nivel === 'number' && org.sendero.total === 5);
  check('tabla_destino: patrocinios llega vacio (opcion abierta)',
    Array.isArray(td.data.patrocinios) && td.data.patrocinios.length === 0);

  // POST review_voto: el tipo esta registrado (no cae en "tipo
  // invalido"); sin usuario_id debe responder 400 con su mensaje propio.
  return new Promise(function(resolve) {
    global.__MOCKSQL__ = mockSql;
    var req = { method: 'POST', body: { tipo: 'review_voto', resena_id: 'r1' } };
    var res = { setHeader: function(){}, status: function(){ return this; }, json: function(p){ resolve(p); } };
    sandboxInt.module.exports(req, res).catch(function(err){ resolve({ ok: false, error: err.message }); });
  }).then(function(rv) {
    check('review_voto: sin usuario_id -> 400 (mensaje propio)',
      rv.ok === false && String(rv.error).indexOf('usuario_id') !== -1);
    return esLiderDeCiudad(sqlFallback, 'user', 'Bogota').then(function(es){
      check('Own the Spot: degrada a false si migracion 007 no corrio', es === false);
      return esLiderDeCiudad(sqlFallback, null, 'Bogota');
    });
  });
}).then(function(es2){

  // ---- 3) Bloque Lider del Spot en buildHTML -----------------------
  const srcPag = fs.readFileSync(path.join(__dirname, '..', 'api', 'pagina-destino.js'), 'utf8');
  const sandboxPag = { module: { exports: {} }, require, console, process };
  sandboxPag.exports = sandboxPag.module.exports;
  vm.createContext(sandboxPag);
  vm.runInContext(srcPag + '\nmodule.exports.buildHTML = buildHTML;', sandboxPag, { filename: 'api/pagina-destino.js' });

  const base = {
    slug: 'spot-de-prueba', nombre: 'Destino de Prueba', categoria_slug: 'sitio',
    ciudad: 'Bogota', region: 'Cundinamarca', barrio: '', lead: 'Lead',
    descripcion: 'Descripcion', highlight: '', foto_hero: '', hero_bg: '',
    lat: 4.6, lng: -74.06, whatsapp: '', telefono: '', email: '', web: '', instagram: '',
    precio_desde: '', horario: '', emoji: '', status: 'published', destacado: false,
    booking: '', hostelworld: '', airbnb: '', tipo: '', capacidad: '', como_llegar: '',
    tags: {}, rating: 4, total_resenas: 2, creado_en: new Date(), actualizado_en: new Date()
  };
  const resenas = [{ rating: 5, texto: '[Ana] Me encanto este lugar', dims: {}, traveller_type: 'Familia' }];
  const spotLider = { resena_id: 'x', rating: 5, texto: '[Ana] Me encanto este lugar', votos_utiles: 3, usuario_nombre: 'Ana' };

  const sinLider = sandboxPag.module.exports.buildHTML(base, {}, [], resenas, null, [], {}, null);
  check('Spot: sin lider no muestra bloque', !sinLider.includes('Lider del spot'));

  const conLider = sandboxPag.module.exports.buildHTML(base, {}, [], resenas, null, [], {}, spotLider);
  check('Spot: bloque Lider del spot presente', conLider.includes('Lider del spot'));
  check('Spot: nombre del lider visible', conLider.includes('Ana'));
  check('Spot: votos utiles visibles', conLider.includes('3 votos utiles'));
  check('Spot: hint x1.1 visible', conLider.includes('x1.1 XP en esta ciudad'));
  check('Spot: blog NO muestra spot (no aplica)', !sandboxPag.module.exports.buildHTML(Object.assign({}, base, { categoria_slug: 'blog' }), {}, [], resenas, null, [], {}, spotLider).includes('Lider del spot'));

  const abrir = (conLider.match(/<div/g)||[]).length;
  const cerrar = (conLider.match(/<\/div>/g)||[]).length;
  check('Spot: balance de divs (' + abrir + ' vs ' + cerrar + ')', abrir === cerrar);

  console.log('SMOKE MILESTONES V2: OK');
}).catch(function(err){
  console.log('FAIL - esLiderDeCiudad lanz\u00f3 error: ' + err.message);
  process.exitCode = 1;
});