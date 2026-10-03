// Smoke de mapa-cultural.js (entrega 2026-09-19): valida la
// normalizacion unificada (shape index + shape tipo=mapa), que
// setPlaces antes de init no lanza, el clustering por proximidad a
// 40px y el filtro default de la capa multimedia (excluye
// origen='album', incluye destino/destino_album con slug coincidente).
// Patron vm de los smokes existentes del repo.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function check(label, cond) {
  console.log((cond ? 'PASS' : 'FAIL') + ' - ' + label);
  if (!cond) process.exitCode = 1;
}

const src = fs.readFileSync(path.join(__dirname, '..', 'mapa-cultural.js'), 'utf8');
const sandbox = { window: {}, console };
vm.createContext(sandbox);
vm.runInContext(src, sandbox, { filename: 'mapa-cultural.js' });

const MC = sandbox.window.MapaCultural;
check('API: window.MapaCultural expuesto', !!MC);
// Version explicita (no comodin): 1.3.0 sumo ratingMin (filtro de puntaje
// de pines y capa multimedia) y el selector parametrizado de medios. Si el
// motor vuelve a 1.2.0 o sube de 1.3.0, el smoke debe detectar la regresion.
check('API: version 1.3.0', MC && MC.version === '1.3.0');
['create', 'init', 'refresh', 'setPlaces', 'setMedia', 'setMediaEnabled',
 'setMediaTypes', 'getMap', 'openDrawer', 'closeDrawer', 'normalizePlace',
 'normalizeMedia', 'esc', 'starHtml', 'photoPlaceholderHTML', 'haversineKm']
  .forEach(function (fn) {
    check('API: existe ' + fn, MC && typeof MC[fn] === 'function');
  });

// ---- (1) normalizePlace: shape index (MAPA_PLACES) ------------------
const idxRaw = {
  id: 7, _uuid: 'uuid-uno', slug: 'hostal-x', name: 'Hostal X',
  cat: 'hostal', city: 'Bogota', region: 'Cundinamarca', rating: 4.5,
  emoji: '\uD83C\uDFE8', color: '#2196F3',
  hero_bg: 'linear-gradient(135deg,#1a3a5c,#2a4a7c)',
  foto_hero: 'https://ejemplo/a.jpg', photos: [{ url: 'https://ejemplo/b.jpg', cap: 'b' }],
  lat: '4.6000', lng: '-74.1000'
};
const pIdx = MC.normalizePlace(idxRaw);
check('normalizePlace index: key = id posicional', pIdx && pIdx.key === 7);
check('normalizePlace index: uuid desde _uuid', pIdx && pIdx.uuid === 'uuid-uno');
check('normalizePlace index: nombre desde name', pIdx && pIdx.nombre === 'Hostal X');
check('normalizePlace index: cat, ciudad y region', pIdx && pIdx.cat === 'hostal' && pIdx.ciudad === 'Bogota' && pIdx.region === 'Cundinamarca');
check('normalizePlace index: rating 4.5', pIdx && pIdx.rating === 4.5);
check('normalizePlace index: color/emoji/foto/fotos', pIdx && pIdx.color === '#2196F3' && pIdx.emoji === '\uD83C\uDFE8' && pIdx.foto === 'https://ejemplo/a.jpg' && pIdx.fotos.length === 1);
check('normalizePlace index: lat/lng numericos', pIdx && pIdx.lat === 4.6 && pIdx.lng === -74.1);
check('normalizePlace index: conserva raw', pIdx && pIdx.raw === idxRaw);
check('normalizePlace index: subcat ausente -> \'\'', pIdx && pIdx.subcat === '');
check('normalizePlace: subcat desde subcategoria', MC.normalizePlace({ slug: 'z', cat: 'sitio', subcategoria: 'parque', lat: 4, lng: -74 }) && MC.normalizePlace({ slug: 'z', cat: 'sitio', subcategoria: 'parque', lat: 4, lng: -74 }).subcat === 'parque');
check('mdCatLabel: sitio ya no es Naturaleza', MC.mdCatLabel('sitio') === 'Sitio');
check('mdCatLabel: evento singular', MC.mdCatLabel('evento') === 'Evento');
check('mdSubcatLabel: parque -> Parque Urbano', MC.mdSubcatLabel('parque') === 'Parque Urbano');
check('mdSubcatLabel: museo -> Museo', MC.mdSubcatLabel('museo') === 'Museo');
check('mdSubcatLabel: desconocida pasa tal cual', MC.mdSubcatLabel('pelagatos') === 'pelagatos');

// ---- (1b) normalizePlace: shape tipo=mapa --------------------------
const mapRaw = {
  destino_id: 'uuid-dos', nombre: 'Cafe Y', slug: 'cafe-y', foto_hero: '',
  ciudad: 'Medellin', categoria_slug: 'comida', lat: 6.25, lng: -75.56
};
const pMap = MC.normalizePlace(mapRaw);
check('normalizePlace tipo=mapa: key/uuid desde destino_id', pMap && pMap.key === 'uuid-dos' && pMap.uuid === 'uuid-dos');
check('normalizePlace tipo=mapa: cat desde categoria_slug', pMap && pMap.cat === 'comida');
check('normalizePlace tipo=mapa: rating default 0', pMap && pMap.rating === 0);
check('normalizePlace tipo=mapa: color PIN_COLORS.comida', pMap && pMap.color === '#FF9800');
check('normalizePlace tipo=mapa: emoji por categoria', pMap && typeof pMap.emoji === 'string' && pMap.emoji.length > 0);
check('normalizePlace tipo=mapa: ciudad desde ciudad', pMap && pMap.ciudad === 'Medellin');
check('normalizePlace: lat/lng no finitos -> null', MC.normalizePlace({ slug: 'z', lat: 'abc', lng: 3 }) === null);

// ---- normalizeMedia: conserva shape y agrega key -------------------
const mNorm = MC.normalizeMedia({ id: 3, origen: 'destino', origen_id: 'cafe-y', media_url: 'u', media_type: 'foto', extra: 1 });
check('normalizeMedia: conserva shape del backend', mNorm && mNorm.media_type === 'foto' && mNorm.origen_id === 'cafe-y' && mNorm.extra === 1);
check('normalizeMedia: agrega key', mNorm && mNorm.key === '3');

// ---- (2) setPlaces antes de init no lanza --------------------------
let ok = true;
try {
  var inst = MC.create({});
  inst.setPlaces([mapRaw]);
  var st0 = inst.getState();
  check('setPlaces antes de init: no lanza y almacena', st0.initialized === false && st0.places.length === 1);
} catch (e) {
  ok = false;
  console.log('FAIL - setPlaces antes de init lanzo: ' + e.message);
  process.exitCode = 1;
}
check('setPlaces antes de init: ejecucion sin excepcion', ok);

// ---- (3) clustering por proximidad a 40px --------------------------
const project = function (lat, lng) { return { x: lng * 100000, y: lat * 100000 }; };
const cerca = [
  { key: 'a', lat: 4.7000, lng: -74.0700 },
  { key: 'b', lat: 4.7001, lng: -74.0701 }
];
const clCerca = MC.clusterize(cerca, project, 40);
check('clusterize: dos puntos cercanos -> 1 cluster', clCerca.length === 1 && clCerca[0].cnt === 2);
const lejos = [
  { key: 'c', lat: 4.0, lng: -74.0 },
  { key: 'd', lat: 3.0, lng: -75.0 }
];
const clLejos = MC.clusterize(lejos, project, 40);
check('clusterize: dos puntos lejanos -> 2 clusters', clLejos.length === 2);
const mixto = MC.clusterize(cerca.concat(lejos), project, 40);
check('clusterize: mixto -> 3 clusters (1+2)', mixto.length === 3);

// ---- (4) filtro default de media -----------------------------------
const places = [MC.normalizePlace(mapRaw)]; // slug 'cafe-y'
const items = [
  { origen: 'album', origen_id: 'album-1', media_url: 'a', media_type: 'foto' },
  { origen: 'destino', origen_id: 'cafe-y', media_url: 'b', media_type: 'foto' },
  { origen: 'destino_album', origen_id: 'cafe-y', media_url: 'c', media_type: 'album' },
  { origen: 'destino', origen_id: 'otro-slug', media_url: 'd', media_type: 'foto' },
  { origen: 'destino_album', origen_id: 'otro-slug', media_url: 'e', media_type: 'album' }
];
const filtrado = MC.filterMediaDefault(items, places);
const origenes = filtrado.map(function (it) { return it.origen_id + ':' + it.origen; });
check('filterMediaDefault: excluye origen album', filtrado.every(function (it) { return it.origen !== 'album'; }));
check('filterMediaDefault: incluye destino/destino_album con slug activo', filtrado.length === 2 && origenes.indexOf('cafe-y:destino') !== -1 && origenes.indexOf('cafe-y:destino_album') !== -1);
check('filterMediaDefault: descarta origen_id sin slug activo', filtrado.every(function (it) { return it.origen_id === 'cafe-y'; }));

// ---- (5) index-compat: mediaFilter:false = capa SIN filtro ---------
const mediaMixta = [
  { origen: 'album', origen_id: 'album-1', media_url: 'a', media_type: 'foto' },
  { origen: 'destino', origen_id: 'sin-slug', media_url: 'b', media_type: 'foto' }
];
const instAll = MC.create({ mediaFilter: false });
instAll.setMedia(mediaMixta);
check('mediaFilter false: capa usa TODA la media (index)', instAll.getState().mediaFiltered.length === 2);
const instStrict = MC.create({});
instStrict.setMedia(mediaMixta);
check('mediaFilter default: capa filtra estricto (comunidad)', instStrict.getState().mediaFiltered.length === 0);

// ---- (extra) instancia: metodos del contrato -----------------------
['init', 'refresh', 'destroy', 'setPlaces', 'setMedia', 'setMediaEnabled',
 'setMediaTypes', 'getMap', 'getState', 'openDrawer', 'closeDrawer',
 'geolocate', 'resetColombia'].forEach(function (fn) {
  check('instancia: metodo ' + fn, inst && typeof inst[fn] === 'function');
});

// ---- (6) bindCategories / filtros por categoria --------------------
// Guarda de regresion: el sandbox original NO tiene document, por eso
// bindCategories nunca se ejecutaba y un selector mal formado pasaba
// inadvertido. Aqui se crea un SEGUNDO sandbox con stubs minimos de
// document + L que permiten montar el mapa y enganchar los filtros.
function mkEl(id) {
  return {
    id: id, style: {}, __handlers: {}, _on: [],
    classList: {
      _s: {},
      add: function (c) { this._s[c] = true; },
      remove: function (c) { delete this._s[c]; },
      contains: function (c) { return !!this._s[c]; },
      toggle: function (c, v) { if (v) this._s[c] = true; else delete this._s[c]; }
    },
    addEventListener: function (t, fn) { this.__handlers[t] = fn; },
    removeEventListener: function () {},
    querySelectorAll: function () { return this._on; },
    querySelector: function () { return null; },
    insertBefore: function () {}, appendChild: function () {},
    setAttribute: function () {}, getAttribute: function () { return null; }
  };
}

var mapEl = mkEl('mm-personal-map');
var catsRoot = mkEl('mm-personal-cats');
var btnAll = mkEl('');
btnAll.getAttribute = function (n) { return (n === 'data-cat') ? 'all' : null; };
btnAll.closest = function (s) { return (s === '[data-cat]') ? this : null; };
var btnHostal = mkEl('');
btnHostal.getAttribute = function (n) { return (n === 'data-cat') ? 'hostal' : null; };
btnHostal.closest = function (s) { return (s === '[data-cat]') ? this : null; };
catsRoot._on = [btnAll, btnHostal];

var doc = {
  getElementById: function (id) { return (id === 'mm-personal-map') ? mapEl : null; },
  // El motor resuelve options.categories con document.querySelector(sel)
  // cuando llega como string; por eso debe ser un selector valido como
  // '#mm-personal-cats'. Un id sin '#' se interpreta como selector de
  // etiqueta y NO engancha: aqui devuelve null a proposito.
  querySelector: function (sel) { return (sel === '#mm-personal-cats') ? catsRoot : null; },
  querySelectorAll: function () { return []; },
  createElement: function () { return mkEl(''); },
  body: { appendChild: function () {} },
  addEventListener: function () {}
};

// Stubs ampliados para los casos de regresion (no se toca el motor):
//  - map: guarda handlers y permite disparar 'moveend' con __fire();
//    el bounds es configurable via __boundsContains para simular paneo.
//  - layerGroup: registra los layers agregados en __added para poder
//    contar los pines de media tras cada renderMedia().
//  - marker: instancia nueva por llamada; addTo() delega en layer.addLayer.
//  - setTimeout/clearTimeout: cola falsa con flush sincrono (el motor
//    difiere onMoved 150 ms, que el smoke ejecuta a mano).
var groups = [];
var lastMapStub = null;
function mkMapStub() {
  var ms = {
    __handlers: {},
    __boundsContains: true,
    __layers: [],
    setView: function () { return this; },
    getZoom: function () { return 14; },
    project: function () { return { x: 0, y: 0 }; },
    on: function (t, fn) { this.__handlers[t] = fn; return this; },
    off: function () { return this; },
    __fire: function (t) {
      var fn = this.__handlers[t];
      if (typeof fn === 'function') return fn({ type: t, target: this });
      return undefined;
    },
    hasLayer: function () { return false; },
    addLayer: function (l) { this.__layers.push(l); return this; },
    removeLayer: function () { return this; },
    remove: function () {},
    fitBounds: function () { return this; },
    panTo: function () { return this; },
    flyTo: function () { return this; },
    getBounds: function () {
      var self = this;
      return { contains: function () { return self.__boundsContains; } };
    }
  };
  lastMapStub = ms;
  return ms;
}
function layerStub() {
  return {
    __added: [],
    addTo: function (m) { if (m && typeof m.addLayer === 'function') m.addLayer(this); return this; },
    clearLayers: function () { this.__added = []; },
    addLayer: function (l) { this.__added.push(l); return this; },
    removeLayer: function () { return this; },
    bindPopup: function () { return this; },
    openPopup: function () { return this; }
  };
}
function mkMarker() {
  return {
    on: function () { return this; },
    addTo: function (layer) {
      if (layer && typeof layer.addLayer === 'function') layer.addLayer(this);
      return this;
    },
    bindPopup: function () { return this; },
    bindTooltip: function () { return this; },
    openPopup: function () { return this; },
    getLatLng: function () { return { lat: 0, lng: 0 }; }
  };
}
var L2 = {
  _markers: [],
  _tileCalls: 0,
  map: function () { return mkMapStub(); },
  tileLayer: function () { L2._tileCalls++; return { addTo: function () { return this; } }; },
  layerGroup: function () { var g = layerStub(); groups.push(g); return g; },
  marker: function () { var m = mkMarker(); L2._markers.push(m); return m; },
  divIcon: function () { return {}; }
};

var timerSeq = 0;
var pendingTimers = {};
function fakeSetTimeout(fn) { timerSeq++; pendingTimers[timerSeq] = fn; return timerSeq; }
function fakeClearTimeout(id) { if (id) delete pendingTimers[id]; }
function flushTimers() {
  var ids = Object.keys(pendingTimers);
  for (var i = 0; i < ids.length; i++) {
    var fn = pendingTimers[ids[i]];
    delete pendingTimers[ids[i]];
    if (typeof fn === 'function') fn();
  }
}

var sandbox2 = { window: {}, console: console, document: doc, L: L2, setTimeout: fakeSetTimeout, clearTimeout: fakeClearTimeout };
vm.createContext(sandbox2);
vm.runInContext(src, sandbox2, { filename: 'mapa-cultural.js' });
var MC2 = sandbox2.window.MapaCultural;

var inst2 = MC2.create({ map: 'mm-personal-map', categories: '#mm-personal-cats' });
check('bindCategories: init con document/L -> initialized', inst2.getState().initialized === true);
check('A3: el motor registra la capa base (L.tileLayer)', L2._tileCalls >= 1);
check('bindCategories: engancha click en el root de categorias', typeof catsRoot.__handlers.click === 'function');
var clickCat = catsRoot.__handlers.click;
clickCat({ target: btnHostal });
check('bindCategories: click data-cat=hostal -> activeCat hostal', inst2.getState().activeCat === 'hostal');
clickCat({ target: btnAll });
check('bindCategories: click data-cat=all -> activeCat all', inst2.getState().activeCat === 'all');
clickCat({ target: btnAll });
check('bindCategories: re-click en activo -> activeCat off (oculta pines)', inst2.getState().activeCat === 'off');
check('bindCategories: selector sin "#" no resuelve (stub)', doc.querySelector('mm-personal-cats') === null);

// ---- (7) filterMediaPropios: el drawer solo muestra medios con vinculo
//          explicito al espacio (fotos de la ficha / su album). Ni fotos
//          de otros lugares ni video/audio de comunidad (origen 'album')
//          entran, aunque esten en la misma ciudad. ----------------------
const mProp = MC.filterMediaPropios;
check('filterMediaPropios: API exportada', typeof mProp === 'function');
const r10 = { slug: 'hostal-r10-bogota', uuid: 'uuid-r10', ciudad: 'Bogota', lat: 4.6, lng: -74.06 };
const mediosMixtos = [
  { origen: 'destino', origen_id: 'hostal-r10-bogota', media_url: 'r10-a', media_type: 'foto' },
  { origen: 'destino', origen_id: 'hostal-r10-bogota', media_url: 'r10-b', media_type: 'foto' },
  { origen: 'destino_album', origen_id: 'hostal-r10-bogota', media_url: 'r10-c', media_type: 'album' },
  // Mismo lugar y cercania: otra ciudad no, mismo barrio si.
  { origen: 'destino', origen_id: 'la-candelaria-bogota', media_url: 'cand', media_type: 'foto' },
  { origen: 'destino', origen_id: 'monserrate-bogota', media_url: 'mons', media_type: 'foto' },
  // Album de usuario (misma ciudad): NUNCA debe entrar.
  { origen: 'album', origen_id: 'album-u1', media_url: 'alb', media_type: 'foto' }
];
const propios = mProp(mediosMixtos, r10);
const propiosUrls = propios.map(function (it) { return it.media_url; });
check('filterMediaPropios: solo medios del slug abierto', propios.length === 3 && propiosUrls.indexOf('cand') === -1 && propiosUrls.indexOf('mons') === -1);
check('filterMediaPropios: incluye destino y destino_album del espacio', propiosUrls.indexOf('r10-a') !== -1 && propiosUrls.indexOf('r10-c') !== -1);
check('filterMediaPropios: excluye album de usuario', propiosUrls.indexOf('alb') === -1);
check('filterMediaPropios: deduplica por URL', mProp([{ origen: 'destino', origen_id: 'x', media_url: 'u' }, { origen: 'destino', origen_id: 'x', media_url: 'u' }], { slug: 'x' }).length === 1);
check('filterMediaPropios: place sin slug/uuid -> vacio', mProp(mediosMixtos, {}).length === 0);

// Videos/audios de la comunidad (origen 'album'): YA NO se muestran en el
// drawer aunque esten en la misma ciudad. Solo entra media con vinculo
// explicito (origen_id === slug/uuid del lugar).
const conMedia = mediosMixtos.concat([
  { origen: 'album', origen_id: 'album-v1', media_url: 'vid-ciudad', media_type: 'video', ciudad: 'Bogota', lat: 4.65, lng: -74.10 },
  { origen: 'album', origen_id: 'album-a1', media_url: 'aud-ciudad', media_type: 'audio', ciudad: 'Bogota' },
  { origen: 'album', origen_id: 'album-v2', media_url: 'vid-lejos', media_type: 'video', ciudad: 'Cali', lat: 3.45, lng: -76.53 }
]);
const conMediaUrls = mProp(conMedia, r10).map(function (it) { return it.media_url; });
check('filterMediaPropios: excluye video/audio de comunidad (misma ciudad)', conMediaUrls.indexOf('vid-ciudad') === -1 && conMediaUrls.indexOf('aud-ciudad') === -1);
check('filterMediaPropios: excluye video de otra ciudad lejana', conMediaUrls.indexOf('vid-lejos') === -1);
check('filterMediaPropios: foto de album de usuario sigue oculta', conMediaUrls.indexOf('alb') === -1);

// ---- (8) REGRESION: onMoved re-renderiza la capa media -------------
// Bug corregido: onMoved() solo llamaba recluster(); los pines de media
// (filtrados por st.map.getBounds() en renderMedia) quedaban congelados
// fuera del viewport al mover/zoom el mapa. El fix agrega renderMedia()
// dentro del setTimeout de 150 ms. Aqui se simula el paneo con un bounds
// artificial que primero EXCLUYE la media y luego la incluye, y se usa la
// cola falsa de timers para flush sincrono del debounce.
groups.length = 0;
L2._markers.length = 0;
var regInst = MC2.create({ map: 'mm-personal-map', mediaFilter: false });
check('regresion onMoved: init crea la capa media (2 layerGroups)', regInst.getState().initialized === true && groups.length === 2);
var mediaLayer = groups[1];
lastMapStub.__boundsContains = false; // media fuera del viewport
regInst.setMedia([
  { origen: 'destino', origen_id: 'cafe-y', media_url: 'rm-in', media_type: 'foto', lat: 4.6, lng: -74.1 }
]);
// setMediaEnabled(true) rellena foto/video/audio; con bounds cerrado la
// media queda fuera y renderMedia no pinta nada (0 pines).
regInst.setMediaEnabled(true);
var rSt = regInst.getState();
check('regresion onMoved: capa media activa con tipos rellenos', rSt.mediaEnabled === true && rSt.mediaTypes.foto === true);
check('regresion onMoved: sin paneo (media fuera de bounds) -> 0 pines', mediaLayer.__added.length === 0);
// El usuario mueve/hace zoom: la media entra al viewport; Leaflet dispara
// 'moveend' y el fix debe re-renderizar la capa media.
lastMapStub.__boundsContains = true;
lastMapStub.__fire('moveend');
flushTimers();
check('regresion onMoved: moveend re-renderiza y CREA el pin de media', mediaLayer.__added.length === 1);

// ---- (9) REGRESION: clic "Todo" rellena mediaTypes -----------------
// Bug corregido: el atajo de filterPins('all') encendia st.mediaEnabled
// sin rellenar st.mediaTypes (foto/video/audio), por lo que renderMedia
// descartaba toda la media (L1038). El fix delega en setMediaEnabled(true)
// cuando !mediaEnabled o mediaTiposActivos() === 0.
groups.length = 0;
var allInst = MC2.create({
  map: 'mm-personal-map',
  categories: '#mm-personal-cats',
  enableMediaOnAll: true,
  mediaEnabled: false,
  mediaFilter: false
});
allInst.setMedia([
  { origen: 'destino', origen_id: 'cafe-y', media_url: 'rm-all', media_type: 'foto', lat: 4.6, lng: -74.1 }
]);
var allLayer = groups[1];
var allSt = allInst.getState();
check('regresion Todo: arranque con capa apagada y 3 tipos off', allSt.mediaEnabled === false && allSt.mediaTypes.foto === false && allSt.mediaTypes.video === false && allSt.mediaTypes.audio === false);
clickCat = catsRoot.__handlers.click; // el bind mas reciente pertenece a allInst
clickCat({ target: btnAll });
allSt = allInst.getState();
check('regresion Todo: clic data-cat=all -> capa media habilitada', allSt.mediaEnabled === true);
check('regresion Todo: clic data-cat=all -> 3 tipos activos', allSt.mediaTypes.foto === true && allSt.mediaTypes.video === true && allSt.mediaTypes.audio === true);
check('regresion Todo: clic data-cat=all -> renderMedia pinta el pin', allLayer.__added.length === 1);

// ---- (10) A3: CSS de Leaflet + capa base en los consumidores --------
const comunidadHtml = fs.readFileSync(path.join(__dirname, '..', 'comunidad.html'), 'utf8');
const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
check('A3: comunidad carga leaflet.css 1.9.4', /leaflet@1\.9\.4\/dist\/leaflet\.css/.test(comunidadHtml));
check('A3: index carga leaflet.css 1.9.4', /leaflet@1\.9\.4\/dist\/leaflet\.css/.test(indexHtml));
check('A3: comunidad enlaza mapa-cultural.css', /mapa-cultural\.css/.test(comunidadHtml));
check('A3: mapa-tiles.js cargado en comunidad', /mapa-tiles\.js\?v=1/.test(comunidadHtml));
check('A3: mapa-tiles.js cargado en index', /mapa-tiles\.js\?v=1/.test(indexHtml));
check('A3: comunidad usa el helper MapaTiles sin proveedor hardcodeado', /MapaTiles\.aplicar/.test(comunidadHtml) && comunidadHtml.indexOf('cartocdn') === -1 && comunidadHtml.indexOf('basemaps') === -1);

// ---- (11) 1.2.0: los mapas de Comunidad se unificaron en UNA instancia --
// El invariante unico de la unificacion es que el motor no monta un segundo
// Leaflet: init() es idempotente (DEF se crea una vez y se reutiliza), y el
// consumidor (comunidad.html) delega en MyMap.getMap() con la guarda
// _leaflet_id en vez de inicializar su propio mapa.
const def1 = MC.init();
const def2 = MC.init({ mediaFilter: false });
check('1.2.0 init: dos llamadas devuelven la MISMA instancia', def1 === def2);
check('1.2.0 init: la instancia default expone el contrato', !!def1 && typeof def1.getState === 'function' && typeof def1.getMap === 'function');
check('1.2.0 comunidad.html delega el mapa en MyMap (sin 2o Leaflet)', /window\.MyMap\.init/.test(comunidadHtml) && /window\.MyMap\.getMap/.test(comunidadHtml));
check('1.2.0 comunidad.html guarda doble init con _leaflet_id', /_leaflet_id/.test(comunidadHtml));

// ---- (12) ratingMin: contrato (default, cuantizacion, clamp) --------
// El motor expone setRatingMin/getRatingMin; el estado nace en 0 y el
// valor se redondea a pasos de 0.5 con clamp a [0, 5]. Acepta number,
// string o el propio input .value del anfitrion.
groups.length = 0;
var rateA = MC2.create({ map: 'mm-personal-map', mediaFilter: false });
check('ratingMin: default 0', rateA.getRatingMin() === 0);
check('ratingMin: cuantiza 3.3 -> 3.5', rateA.setRatingMin(3.3) === 3.5);
check('ratingMin: cuantiza string 2.4 -> 2.5', rateA.setRatingMin('2.4') === 2.5);
check('ratingMin: clamp inferior -1 -> 0', rateA.setRatingMin(-1) === 0);
check('ratingMin: clamp superior 9 -> 5', rateA.setRatingMin(9) === 5);
check('ratingMin: acepta input.value 4.4 -> 4.5', rateA.setRatingMin({ value: '4.4' }) === 4.5);
check('ratingMin: no numerico -> 0', rateA.setRatingMin('abc') === 0);

// ---- (13) ratingMin filtra PINES; rating 0/null ocultos -------------
// Con ratingMin > 0 un destino sin resenas (rating 0 o no numerico, que
// normalizePlace/placeRating tratan como 0) queda OCULTO. Volver a 0 lo
// restaura: el umbral es el unico motivo de la desaparicion.
var ratePlaces = [
  MC.normalizePlace({ slug: 'alta', cat: 'hostal', nombre: 'Alta', lat: 4.6, lng: -74.1, rating: 4.5 }),
  MC.normalizePlace({ slug: 'cero', cat: 'hostal', nombre: 'Cero', lat: 4.7, lng: -74.2, rating: 0 }),
  MC.normalizePlace({ slug: 'nula', cat: 'hostal', nombre: 'Nula', lat: 4.8, lng: -74.3, rating: null })
];
groups.length = 0;
var rateB = MC2.create({ map: 'mm-personal-map', mediaFilter: false });
rateB.setPlaces(ratePlaces);
check('ratingMin pines: sin umbral los 3 visibles', rateB.getState().visible.length === 3);
rateB.setRatingMin(0.5);
var visB = rateB.getState().visible;
check('ratingMin pines: rating 0/null ocultos, >=0.5 visible', visB.length === 1 && visB[0].slug === 'alta');
check('ratingMin pines: no numerico cuenta como 0 (oculto)', visB.every(function (p) { return p.slug !== 'nula' && p.slug !== 'cero'; }));
rateB.setRatingMin(0);
check('ratingMin pines: volver a 0 restaura los 3', rateB.getState().visible.length === 3);

// ---- (14) ratingMin filtra la CAPA multimedia -----------------------
// El mismo umbral que oculta pines oculta la media con vinculo explicito
// a un destino por debajo del minimo; no es un filtro solo de pines.
groups.length = 0;
var rateC = MC2.create({ map: 'mm-personal-map', mediaFilter: false });
rateC.setPlaces([
  MC.normalizePlace({ slug: 'alta', cat: 'hostal', lat: 4.6, lng: -74.1, rating: 4.5 }),
  MC.normalizePlace({ slug: 'cero', cat: 'hostal', lat: 4.7, lng: -74.2, rating: 0 })
]);
rateC.setMedia([
  { origen: 'destino', origen_id: 'alta', media_url: 'mA', media_type: 'foto', lat: 4.6, lng: -74.1 },
  { origen: 'destino', origen_id: 'cero', media_url: 'mC', media_type: 'foto', lat: 4.7, lng: -74.2 }
]);
var mediaLayerC = groups[groups.length - 1];
rateC.setMediaEnabled(true);
check('ratingMin media: sin umbral pinta los 2 pines de media', mediaLayerC.__added.length === 2);
rateC.setRatingMin(1);
check('ratingMin media: umbral oculta el pin de media con rating 0', mediaLayerC.__added.length === 1);

// ---- (15) ratingMin es interseccion con la categoria (AND) ----------
// Con categoria activa y ratingMin > 0 el resultado es cat Y rating.
groups.length = 0;
var rateD = MC2.create({ map: 'mm-personal-map', categories: '#mm-personal-cats', mediaFilter: false });
rateD.setPlaces([
  MC.normalizePlace({ slug: 'hostal-alta', cat: 'hostal', lat: 4.6, lng: -74.1, rating: 4.5 }),
  MC.normalizePlace({ slug: 'hostal-cero', cat: 'hostal', lat: 4.61, lng: -74.11, rating: 0 }),
  MC.normalizePlace({ slug: 'comida-alta', cat: 'comida', lat: 4.7, lng: -74.2, rating: 4.5 }),
  MC.normalizePlace({ slug: 'comida-cero', cat: 'comida', lat: 4.71, lng: -74.21, rating: 0 })
]);
var clickD = catsRoot.__handlers.click;
clickD({ target: btnHostal });
rateD.setRatingMin(1);
var visD = rateD.getState().visible;
check('ratingMin + categoria: interseccion (solo hostal-alta)', visD.length === 1 && visD[0].slug === 'hostal-alta' && visD[0].cat === 'hostal');

// ---- (16) VISITADOS sigue EXCLUYENTE frente a ratingMin -------------
// Con 'visitados' activo manda el estado visitado: el filtro de puntaje
// NO se le aplica. Un lugar visitado con rating 0 debe seguir visible.
var btnVisitados = mkEl('');
btnVisitados.getAttribute = function (n) { return (n === 'data-cat') ? 'visitados' : null; };
btnVisitados.closest = function (s) { return (s === '[data-cat]') ? this : null; };
catsRoot._on.push(btnVisitados);
groups.length = 0;
var rateE = MC2.create({ map: 'mm-personal-map', categories: '#mm-personal-cats', mediaFilter: false });
rateE.setPlaces([
  MC.normalizePlace({ slug: 'vis', cat: 'hostal', visitado: true, rating: 0, lat: 4.6, lng: -74.1 }),
  MC.normalizePlace({ slug: 'novis', cat: 'hostal', visitado: false, rating: 5, lat: 4.7, lng: -74.2 })
]);
var clickE = catsRoot.__handlers.click;
clickE({ target: btnVisitados });
rateE.setRatingMin(2);
var visE = rateE.getState().visible;
check('visitados excluyente: ratingMin no se aplica (visita rating 0 visible)', visE.length === 1 && visE[0].slug === 'vis');

// ---- (17) sincronizacion de ETIQUETAS del filtro --------------------
// H3: si el anfitrion trae [data-mf-label] / [data-mf-rating-out] en su
// raiz (filterRoot), el motor actualiza su texto al cambiar el filtro.
// Si esas etiquetas no existen, no revienta.
var lblDir = { textContent: '', getAttribute: function (n) { return (n === 'data-mf-label') ? 'dir' : null; } };
var lblMed = { textContent: '', getAttribute: function (n) { return (n === 'data-mf-label') ? 'med' : null; } };
var lblPunt = { textContent: '', getAttribute: function (n) { return (n === 'data-mf-label') ? 'punt' : null; } };
var outPunt = { textContent: '' };
var filterRoot = {
  querySelectorAll: function (sel) {
    if (sel === '[data-mf-label="dir"]') return [lblDir];
    if (sel === '[data-mf-label="med"]') return [lblMed];
    if (sel === '[data-mf-label="punt"]') return [lblPunt];
    if (sel === '[data-mf-rating-out]') return [outPunt];
    return [];
  }
};
groups.length = 0;
var lblInst = MC2.create({ map: 'mm-personal-map', mediaFilter: false, filterRoot: filterRoot });
lblInst.setRatingMin(2);
check('labels: [data-mf-label="punt"] refleja el umbral', lblPunt.textContent === '2\u2605');
check('labels: [data-mf-rating-out] refleja el umbral', outPunt.textContent === '2\u2605');
check('labels: [data-mf-label="dir"] refleja la categoria', lblDir.textContent === 'Todos');
var emptyRoot = { querySelectorAll: function () { return []; } };
var noLblThrow = true;
try {
  var noLblInst = MC2.create({ map: 'mm-personal-map', mediaFilter: false, filterRoot: emptyRoot });
  noLblInst.setRatingMin(3);
} catch (e) { noLblThrow = false; }
check('labels: raiz sin etiquetas no revienta', noLblThrow);

// ---- (18) mediaBtnSelector parametrizado ----------------------------
// H2: el motor engancha los items [data-media] DENTRO de la raiz del
// anfitrion con el selector que este pase, no con '.mf-btn' hardcodeado.
var seenSelectors = [];
var mediaRoot = {
  addEventListener: function (t, fn) { this.__handlers = this.__handlers || {}; this.__handlers[t] = fn; },
  querySelector: function (sel) {
    if (sel === '[data-media="all"]') return { classList: { toggle: function () {} } };
    return null;
  },
  querySelectorAll: function (sel) {
    seenSelectors.push(sel);
    if (sel === '.custom-mbtn[data-media]') {
      return [{ getAttribute: function (n) { return (n === 'data-media') ? 'foto' : null; }, classList: { toggle: function () {} } }];
    }
    return [];
  },
  contains: function () { return true; }
};
groups.length = 0;
MC2.create({ map: 'mm-personal-map', mediaFilter: false, mediaControls: mediaRoot, mediaBtnSelector: '.custom-mbtn[data-media]' });
check('mediaBtnSelector: el motor consulta el selector pasado', seenSelectors.indexOf('.custom-mbtn[data-media]') !== -1);
check('mediaBtnSelector: no usa el hardcode .mf-btn[data-media]', seenSelectors.indexOf('.mf-btn[data-media]') === -1);

// ---- (19) contrato de markup de los DESPLEGABLES (3 paginas) --------
// Parseo estatico de los HTML reales, sin simulacion.
function countRe(re, s) { var m = s.match(re); return m ? m.length : 0; }

function mfToggles(html) { return countRe(/data-mf-toggle="(dir|med|punt)"/g, html); }
function mfPanels(html) { return countRe(/data-mf-panel="(dir|med|punt)"/g, html); }
function mfPanelsHidden(html) { return countRe(/data-mf-panel="(dir|med|punt)"[^>]*\shidden\b/g, html); }
function mfLabels(html) { return countRe(/class="mf-drop-label" data-mf-label="(dir|med|punt)"/g, html); }
function mfMediaItems(html) { return countRe(/data-media="[^"]+"/g, html); }
function mfFreeButtons(html) { return countRe(/class="mf-btn(?=["\s])/g, html); }

// Paneles reales por conteo de <div>/</div> anidados. Devuelve true si el
// indice de la aguja cae dentro de algun [data-mf-panel].
function insideMfPanel(html, needle) {
  var idx = html.indexOf(needle);
  if (idx === -1) return false;
  var panelRe = /<div[^>]*data-mf-panel="[^"]*"[^>]*>/g;
  var tagRe = /<div\b[^>]*>|<\/div>/g;
  var m;
  while ((m = panelRe.exec(html))) {
    tagRe.lastIndex = m.index;
    var depth = 0, end = -1, t;
    while ((t = tagRe.exec(html))) {
      if (t[0].substr(0, 2) === '</') depth--; else depth++;
      if (depth === 0) { end = tagRe.lastIndex; break; }
    }
    if (end !== -1 && idx >= m.index && idx < end) return true;
  }
  return false;
}

function a11yToggles(html) {
  var ctl = true, lbl = true;
  ['dir', 'med', 'punt'].forEach(function (k) {
    var m = html.match(new RegExp('<button[^>]*data-mf-toggle="' + k + '"[^>]*>'));
    if (!m) { ctl = false; lbl = false; return; }
    var tag = m[0];
    var cm = tag.match(/aria-controls="([^"]+)"/);
    if (!cm || html.indexOf('id="' + cm[1] + '"') === -1) ctl = false;
    if (!/aria-label="[^"]+"/.test(tag)) lbl = false;
  });
  return { ctl: ctl, lbl: lbl };
}

var pages = [
  { nombre: 'index', html: indexHtml },
  { nombre: 'comunidad', html: comunidadHtml }
];
pages.forEach(function (pg) {
  var h = pg.html, n = pg.nombre;
  check('markup ' + n + ': 3 data-mf-toggle (dir/med/punt)', mfToggles(h) === 3);
  check('markup ' + n + ': 3 data-mf-panel con hidden', mfPanels(h) === 3 && mfPanelsHidden(h) === 3);
  check('markup ' + n + ': 3 data-mf-label', mfLabels(h) === 3);
  check('markup ' + n + ': 5 items [data-media] con albumes', mfMediaItems(h) === 5 && /data-media="albumes"/.test(h));
  check('markup ' + n + ': 1 solo #mf-rating con min/max/step', countRe(/id="mf-rating"/g, h) === 1 && /id="mf-rating"[^>]*min="0"[^>]*max="5"[^>]*step="0\.5"/.test(h));
  check('markup ' + n + ': 1 [data-mf-rating-out] de markup', countRe(/data-mf-rating-out[>\s]/g, h) === 1);
  check('markup ' + n + ': exactamente 1 [data-cat="visitados"]', countRe(/data-cat="visitados"/g, h) === 1);
  check('markup ' + n + ': 0 [data-cat="visitados"] dentro de .mf-panel', insideMfPanel(h, 'data-cat="visitados"') === false);
  var a = a11yToggles(h);
  check('markup ' + n + ': aria-controls apunta a panel existente', a.ctl);
  check('markup ' + n + ': cada toggle tiene aria-label', a.lbl);
});
check('markup index: 4 botones libres (visitados/locate/colombia/solo mio)', mfFreeButtons(indexHtml) === 4);
check('markup comunidad: boton libre Visitados presente', mfFreeButtons(comunidadHtml) === 1);
check('markup comunidad: 0 boton Solo mio', comunidadHtml.indexOf('mm-solo-mio') === -1 && comunidadHtml.indexOf('Solo mio') === -1);

// ---- (20) migracion: toggleVistaAlbumes / filtrarMapaAV retirados ---
var mymapaJs = fs.readFileSync(path.join(__dirname, '..', 'mymapa.js'), 'utf8');
check('migracion: mymapa.js sin toggleVistaAlbumes', mymapaJs.indexOf('toggleVistaAlbumes') === -1);
check('migracion: mymapa.js sin filtrarMapaAV', mymapaJs.indexOf('filtrarMapaAV') === -1);
check('migracion: comunidad.html sin toggleVistaAlbumes', comunidadHtml.indexOf('toggleVistaAlbumes') === -1);
check('migracion: comunidad.html sin filtrarMapaAV', comunidadHtml.indexOf('filtrarMapaAV') === -1);

console.log(process.exitCode ? 'SMOKE MAPA CULTURAL: FAIL' : 'SMOKE MAPA CULTURAL: OK');
