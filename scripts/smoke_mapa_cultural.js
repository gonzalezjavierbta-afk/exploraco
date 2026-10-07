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

// Comparacion NUMERICA con tolerancia. El rating se cuantiza a paso 0.2 con
// Math.round(n*5)/5, y la coma flotante puede devolver 0.6000000000000001 en
// vez de 0.6: el smoke debe tolerar el numero, no exigir la cadena exacta.
function numEq(a, b, tol) {
  var t = (tol === undefined) ? 1e-9 : tol;
  return typeof a === 'number' && Math.abs(a - b) <= t;
}

const src = fs.readFileSync(path.join(__dirname, '..', 'mapa-cultural.js'), 'utf8');
const sandbox = { window: {}, console };
vm.createContext(sandbox);
vm.runInContext(src, sandbox, { filename: 'mapa-cultural.js' });

const MC = sandbox.window.MapaCultural;
check('API: window.MapaCultural expuesto', !!MC);
// Version explicita (no comodin): 1.3.0 sumo ratingMin (filtro de puntaje
// de pines y capa multimedia) y el selector parametrizado de medios. 1.4.0
// sustituyo el acoplamiento entre canales por toggleFilter('cat'|'media'|
// 'rating'), subio el paso del rating de 0.5 a 0.2 y anadio mediaSoloMio y
// persistKey. 1.4.1 es un bump FUNCIONAL de patch: el gate de sesion de
// mediaSoloMio se aplico tambien al RESTAURAR la preferencia persistida
// (antes solo se comprobaba al activar), asi que la restauracion sin
// sesion cae a false en vez de dejar el filtro mentirosamente encendido.
// 1.4.2 es un bump FUNCIONAL de patch: el toggle rapido de Directorio pasa a
// ser un ver/no-ver real (syncCatBtns reconcilia los chips con activeCat) y
// en Medios etiqueta/chips se derivan de mediaEnabled.
// Si el motor vuelve a 1.4.1 o sube de 1.4.2, el smoke debe detectar la
// regresion.
check('API: version 1.4.2', MC && MC.version === '1.4.2');
['create', 'init', 'refresh', 'setPlaces', 'setMedia', 'setMediaEnabled',
 'setMediaTypes', 'getMap', 'getState', 'openDrawer', 'closeDrawer', 'normalizePlace',
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
 'setMediaTypes', 'setRatingMin', 'getRatingMin', 'setMediaVista', 'getMediaVista',
 'setMediaSoloMio', 'getMediaSoloMio', 'toggleFilter', 'isFilterOn',
 'onFilterChange', 'getMap', 'getState', 'filtroSnapshot', 'openDrawer', 'closeDrawer',
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

// ---- (9) REGRESION: el clic "Todo" ya NO toca la capa de media -------
// REPLACED (no borrado). Lo que este bloque afirmaba era exactamente el bug
// D1: filterPins('all') encendia st.mediaEnabled al elegir el directorio
// "Todos", un filtro de categoria se pisaba el de medios y el usuario veia
// una capa de fotos que no habia pedido. En v1.4.0 filterPins ya no mira
// enableMediaOnAll y la API toggleFilter('cat'|'media'|'rating') sustituyo
// el atajo; enableMediaOnAll se conserva como opcion INERTE. Se mantiene la
// instancia con enableMediaOnAll:true precisamente para demostrar que la
// opcion ya no enciende nada, y las tres aserciones quedan INVERTIDAS: el clic
// en "Todos" no habilita la capa, no rellena los tipos y no pinta el pin.
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
check('regresion Todo: clic data-cat=all NO habilita la capa de media', allSt.mediaEnabled === false);
check('regresion Todo: clic data-cat=all NO activa los 3 tipos', allSt.mediaTypes.foto === false && allSt.mediaTypes.video === false && allSt.mediaTypes.audio === false);

check('regresion Todo: clic data-cat=all NO altera mediaVista', allSt.mediaVista === 'sueltos');

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
// El motor expone setRatingMin/getRatingMin; el estado nace en 0 y el valor
// se cuantiza a pasos de 0.2 con Math.round(n*5)/5 y clamp a [0, 5]. Acepta
// number, string o el propio input .value del anfitrion.
// REPLACED (no borrado): con el paso 0.5 un umbral como 3.3 se convertia en
// 3.5 y ocultaba destinos validos que el anfitrion si podia pedir, asi que
// v1.4.0 bajo el paso a DECIMAS. Los tres valores esperados de abajo se
// recalcularon contra la regla real, no se copiaron: 3.3*5=16.5->17/5=3.4,
// 2.4*5=12->12/5=2.4 y 4.4*5=22->22/5=4.4. Los clamps no cambian.
groups.length = 0;
var rateA = MC2.create({ map: 'mm-personal-map', mediaFilter: false });
check('ratingMin: default 0', rateA.getRatingMin() === 0);
check('ratingMin: cuantiza 3.3 -> 3.4', numEq(rateA.setRatingMin(3.3), 3.4));
check('ratingMin: cuantiza string 2.4 -> 2.4', numEq(rateA.setRatingMin('2.4'), 2.4));
check('ratingMin: clamp inferior -1 -> 0', rateA.setRatingMin(-1) === 0);
check('ratingMin: clamp superior 9 -> 5', rateA.setRatingMin(9) === 5);
check('ratingMin: acepta input.value 4.4 -> 4.4', numEq(rateA.setRatingMin({ value: '4.4' }), 4.4));
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
  // step="0.2": el markup debe seguir declarando el paso REAL del motor. Con
  // 0.5 el range no podia ofrecer los umbrales intermedios que el motor v1.4.0
  // acepta (guarda de contrato: markup y setRatingMin no pueden divergir).
  check('markup ' + n + ': 1 solo #mf-rating con min/max/step', countRe(/id="mf-rating"/g, h) === 1 && /id="mf-rating"[^>]*min="0"[^>]*max="5"[^>]*step="0\.2"/.test(h));
  check('markup ' + n + ': 1 [data-mf-rating-out] de markup', countRe(/data-mf-rating-out[>\s]/g, h) === 1);
  check('markup ' + n + ': exactamente 1 [data-cat="visitados"]', countRe(/data-cat="visitados"/g, h) === 1);
  check('markup ' + n + ': 0 [data-cat="visitados"] dentro de .mf-panel', insideMfPanel(h, 'data-cat="visitados"') === false);
  var a = a11yToggles(h);
  check('markup ' + n + ': aria-controls apunta a panel existente', a.ctl);
  check('markup ' + n + ': cada toggle tiene aria-label', a.lbl);
});
// REPLACED (no borrado): eran 4 porque index.traia un cuarto boton libre
// "Solo mio" junto a Visitados/Cerca de mi/Colombia. En v1.4.0 "Solo mio" es
// un item del desplegable de medios (data-media), no un boton suelto del
// directorio, asi que el conteo real del archivo es 3 (ADR-006: el archivo
// manda; los tres que quedan siguen siendo los de siempre).
check('markup index: 3 botones libres (visitados/locate/colombia)', mfFreeButtons(indexHtml) === 3
  && /data-cat="visitados"/.test(indexHtml) && /id="mf-locate"/.test(indexHtml) && /resetMapaColombia/.test(indexHtml));
check('markup comunidad: boton libre Visitados presente', mfFreeButtons(comunidadHtml) === 1);
check('markup comunidad: 0 boton Solo mio', comunidadHtml.indexOf('mm-solo-mio') === -1 && comunidadHtml.indexOf('Solo mio') === -1);

// ---- (20) migracion: toggleVistaAlbumes / filtrarMapaAV retirados ---
var mymapaJs = fs.readFileSync(path.join(__dirname, '..', 'mymapa.js'), 'utf8');
check('migracion: mymapa.js sin toggleVistaAlbumes', mymapaJs.indexOf('toggleVistaAlbumes') === -1);
check('migracion: mymapa.js sin filtrarMapaAV', mymapaJs.indexOf('filtrarMapaAV') === -1);
check('migracion: comunidad.html sin toggleVistaAlbumes', comunidadHtml.indexOf('toggleVistaAlbumes') === -1);
check('migracion: comunidad.html sin filtrarMapaAV', comunidadHtml.indexOf('filtrarMapaAV') === -1);

// =====================================================================
// (21) v1.4.0 - GUARDA 1: INDEPENDENCIA DE LOS CANALES DE FILTRO
// El bug D1 era justo lo contrario: elegir categoria encendia medios. Con
// toggleFilter cada canal es un boton independiente, asi que girar uno NO
// puede pisar el estado de los otros dos. Se comprueba en los dos sentidos.
// =====================================================================
groups.length = 0;
var indInst = MC2.create({
  map: 'mm-personal-map',
  categories: '#mm-personal-cats',
  mediaFilter: false,
  mediaEnabled: true
});
indInst.setPlaces([
  MC.normalizePlace({ slug: 'indep-a', cat: 'hostal', lat: 4.60, lng: -74.10, rating: 4 }),
  MC.normalizePlace({ slug: 'indep-b', cat: 'comida', lat: 4.61, lng: -74.11, rating: 4 })
]);
indInst.setMedia([
  { origen: 'destino', origen_id: 'indep-a', media_url: 'im-a', media_type: 'foto', lat: 4.6, lng: -74.1 },
  { origen: 'destino_album', origen_id: 'indep-a', media_url: 'im-b', media_type: 'album', lat: 4.6, lng: -74.1 }
]);
// Boton PROPIO de este bloque: el handler de bindCategories alterna 'on' con
// 'off' en el mismo elemento, asi que reutilizar btnHostal (ya pulsado en
// bloques anteriores) haria que el segundo clic apagara en vez de seleccionar.
var btnIndHostal = mkEl('');
btnIndHostal.getAttribute = function (n) { return (n === 'data-cat') ? 'hostal' : null; };
btnIndHostal.closest = function (s) { return (s === '[data-cat]') ? this : null; };
catsRoot._on.push(btnIndHostal);
var clickInd = catsRoot.__handlers.click;
clickInd({ target: btnIndHostal }); // categoria CONCRETA activa, no 'all'
var indBase = indInst.getState();
check('independencia: base con hostal activo, capa encendida, 3 tipos y vista sueltos',
  indBase.activeCat === 'hostal' && indBase.mediaEnabled === true
  && indBase.mediaTypes.foto === true && indBase.mediaTypes.video === true
  && indBase.mediaTypes.audio === true && indBase.mediaVista === 'sueltos');
indInst.toggleFilter('cat');
var indTrasCat = indInst.getState();
check('independencia: toggleFilter(cat) SI cambia activeCat (hostal -> off)', indTrasCat.activeCat === 'off');
check('independencia: toggleFilter(cat) NO toca mediaEnabled', indTrasCat.mediaEnabled === indBase.mediaEnabled);
check('independencia: toggleFilter(cat) NO toca mediaTypes',
  indTrasCat.mediaTypes.foto === indBase.mediaTypes.foto
  && indTrasCat.mediaTypes.video === indBase.mediaTypes.video
  && indTrasCat.mediaTypes.audio === indBase.mediaTypes.audio);
check('independencia: toggleFilter(cat) NO toca mediaVista', indTrasCat.mediaVista === indBase.mediaVista);
indInst.toggleFilter('cat'); // off -> memoria: restaura la categoria previa
check('independencia: toggleFilter(cat) de vuelta restaura la categoria previa (hostal)', indInst.getState().activeCat === 'hostal');
// La categoria concreta (hostal) ya quedo activa al restaurar la memoria del
// toggle, asi que NO se re-pulsa el chip: con el nuevo bindCategories un clic
// sobre el chip ya activo lo apagaria. indCatFija es el punto de partida de la
// prueba de independencia del canal de medios.
var indCatFija = indInst.getState();
var snapMedia = indInst.toggleFilter('media');
check('independencia: toggleFilter(media) apaga la capa', snapMedia.mediaEnabled === false);
check('independencia: toggleFilter(media) NO toca activeCat', indInst.getState().activeCat === indCatFija.activeCat);
check('independencia: toggleFilter(media) NO borra los tipos elegidos',
  indInst.getState().mediaTypes.foto === true);
check('independencia: isFilterOn refleja cada canal sin mutar nada',
  indInst.isFilterOn('cat') === true && indInst.isFilterOn('media') === false && indInst.isFilterOn('rating') === false
  && indInst.getState().activeCat === 'hostal');
indInst.toggleFilter('media');
check('independencia: reencender medios recupera la combinacion previa',
  indInst.getState().mediaEnabled === true && indInst.getState().activeCat === 'hostal');
var snapLoco = indInst.toggleFilter('canal-inexistente');
check('independencia: canal desconocido no cambia nada y devuelve snapshot',
  !!snapLoco && snapLoco.activeCat === 'hostal' && snapLoco.mediaEnabled === true);

// =====================================================================
// (22) v1.4.0 - GUARDA 2: PASO 0.2 DEL FILTRO DE PUNTUAJE
// Con paso 0.5 el anfitrion no podia pedir umbrales intermedios (3.3 se
// volvia 3.5 y ocultaba destinos validos). Se verifica la regla real
// Math.round(n*5)/5 sobre casos de borde, tolerando coma flotante.
// =====================================================================
groups.length = 0;
var qInst = MC2.create({ map: 'mm-personal-map', mediaFilter: false });
check('paso 0.2: 0.6 se conserva (ya es multiplo de 0.2)', numEq(qInst.setRatingMin(0.6), 0.6));
check('paso 0.2: 0.3 sube a 0.4', numEq(qInst.setRatingMin(0.3), 0.4));
check('paso 0.2: getRatingMin coincide con getState().ratingMin',
  numEq(qInst.getRatingMin(), qInst.getState().ratingMin));
check('paso 0.2: 0.1 -> 0.2 tolerando coma flotante', numEq(qInst.setRatingMin(0.1), 0.2, 1e-9));
check('paso 0.2: 1.1 -> 1.2 tolerando coma flotante', numEq(qInst.setRatingMin(1.1), 1.2, 1e-9));
check('paso 0.2: 3.3 -> 3.4 (no 3.5)', numEq(qInst.setRatingMin(3.3), 3.4));
// Barrido: TODO umbral devuelto debe ser multiplo de 0.2 dentro de [0,5].
var qBarridoOk = true;
for (var qi = 0; qi <= 50; qi++) {
  var qv = qInst.setRatingMin(qi / 10);
  if (!(qv >= 0 && qv <= 5)) { qBarridoOk = false; break; }
  if (Math.abs(qv * 5 - Math.round(qv * 5)) > 1e-9) { qBarridoOk = false; break; }
}
check('paso 0.2: barrido 0..5 solo devuelve multiplos de 0.2', qBarridoOk);
// 0.2 es un umbral REAL: con el paso 0.5 no existia y no habria forma de
// pedirlo, asi que ademas se comprueba que filtra de verdad.
qInst.setPlaces([
  MC.normalizePlace({ slug: 'q-45', cat: 'hostal', lat: 4.6, lng: -74.1, rating: 4.5 }),
  MC.normalizePlace({ slug: 'q-40', cat: 'hostal', lat: 4.61, lng: -74.11, rating: 4 }),
  MC.normalizePlace({ slug: 'q-35', cat: 'hostal', lat: 4.62, lng: -74.12, rating: 3.5 })
]);
qInst.setRatingMin(0.2);
check('paso 0.2: umbral 0.2 deja visibles los 3 destinos',
  qInst.getState().visible.length === 3);
qInst.setRatingMin(4.2);
var qVis = qInst.getState().visible;
check('paso 0.2: umbral 4.2 solo deja el destino 4.5',
  qVis.length === 1 && qVis[0].slug === 'q-45');

// =====================================================================
// (23) v1.4.0 - GUARDA 3: MEMORIA DEL UMBRAL DE PUNTUAJE
// Poner el umbral en 0 significa "sin filtro" y NO puede borrar el valor al
// que el toggle quiere volver: de ahi ratingMinPrevio. Sin umbral previo el
// primer clic es un no-op en vez de inventarse un valor.
// =====================================================================
groups.length = 0;
var memInst = MC2.create({ map: 'mm-personal-map', mediaFilter: false });
memInst.setRatingMin(3.4);
check('memoria rating: getState() expone ratingMinPrevio', numEq(memInst.getState().ratingMinPrevio, 3.4));
check('memoria rating: isFilterOn(rating) true con umbral', memInst.isFilterOn('rating') === true);
var memOff = memInst.toggleFilter('rating');
check('memoria rating: 1er toggle apaga el filtro', numEq(memOff.ratingMin, 0) && memInst.isFilterOn('rating') === false);
var memOn = memInst.toggleFilter('rating');
check('memoria rating: 2o toggle recupera el 3.4', numEq(memOn.ratingMin, 3.4) && memInst.isFilterOn('rating') === true);
check('memoria rating: el umbral recuperado es el mismo numero', numEq(memInst.getRatingMin(), 3.4));
// Instancia nueva: ratingMinPrevio nace en 0, luego no hay nada que recuperar.
groups.length = 0;
var memVacia = MC2.create({ map: 'mm-personal-map', mediaFilter: false });
var memVaciaSt = memVacia.getState();
check('memoria rating: ratingMinPrevio nace en 0', memVaciaSt.ratingMinPrevio === 0);
var memVaciaSnap = memVacia.toggleFilter('rating');
check('memoria rating: sin umbral previo el toggle NO inventa valor',
  numEq(memVaciaSnap.ratingMin, 0) && memVacia.getRatingMin() === 0);
// Y un umbral nuevo sobreescribe la memoria (no queda el viejo colgado).
memVacia.setRatingMin(1.4);
memVacia.toggleFilter('rating');
memVacia.toggleFilter('rating');
check('memoria rating: un umbral nuevo reemplaza al previo',
  numEq(memVacia.getRatingMin(), 1.4) && numEq(memVacia.getState().ratingMinPrevio, 1.4));

// =====================================================================
// (24) v1.4.0 - GUARDA 4: VISTA DE ALBUMES
// setMediaVista('albumes') es la migracion de toggleVistaAlbumes de mymapa.js:
// enciende la capa, avisa al anfitrion por onMediaVistaChange (que recarga los
// albumes) y filtra la capa a los albumes de destino. Al apagar la capa con
// toggleFilter('media') la vista ELEGUDA no se pierde, porque reencender debe
// devolver al usuario donde estaba.
// =====================================================================
groups.length = 0;
var vistaCalls = [];
var albInst = MC2.create({
  map: 'mm-personal-map',
  mediaFilter: false,
  mediaEnabled: false,
  onMediaVistaChange: function (v) { vistaCalls.push(v); }
});
albInst.setPlaces([MC.normalizePlace({ slug: 'alb-a', cat: 'hostal', lat: 4.6, lng: -74.1, rating: 4 })]);
albInst.setMedia([
  { origen: 'destino', origen_id: 'alb-a', media_url: 'alb-suelto', media_type: 'foto', lat: 4.6, lng: -74.1 },
  { origen: 'destino_album', origen_id: 'alb-a', media_url: 'alb-foto', media_type: 'album', lat: 4.6, lng: -74.1 }
]);
var albLayer = groups[groups.length - 1];
var albSt = albInst.getState();
check('vista albumes: arranca en sueltos con la capa apagada', albSt.mediaVista === 'sueltos' && albSt.mediaEnabled === false);
albInst.setMediaVista('albumes');
albSt = albInst.getState();
check('vista albumes: setMediaVista("albumes") devuelve y guarda albumes',
  albInst.setMediaVista('albumes') === 'albumes' && albSt.mediaVista === 'albumes');
check('vista albumes: enciende la capa de medios', albSt.mediaEnabled === true);
check('vista albumes: onMediaVistaChange recibio "albumes"',
  vistaCalls.length >= 1 && vistaCalls[0] === 'albumes');
check('vista albumes: el snapshot expone mediaVista',
  albInst.filtroSnapshot().mediaVista === 'albumes');
// En vista albumes la capa solo pinta los albumes de destino, no la foto suelta.
albInst.setMediaVista('albumes');
var albLayer2 = groups[groups.length - 1];
check('vista albumes: la capa filtra a los albumes de destino', albLayer2.__added.length === 1);
albInst.setMediaVista('sueltos');
check('vista albumes: volver a sueltos avisa y repinta la capa',
  vistaCalls[vistaCalls.length - 1] === 'sueltos' && albInst.getState().mediaVista === 'sueltos');
albInst.setMediaVista('albumes');
var antesDeApagar = albInst.getState();
albInst.toggleFilter('media');
var albApagada = albInst.getState();
check('vista albumes: toggleFilter(media) apaga la capa', albApagada.mediaEnabled === false);
check('vista albumes: apagar la capa NO pierde la vista elegida',
  albApagada.mediaVista === antesDeApagar.mediaVista && albApagada.mediaVista === 'albumes');
albInst.toggleFilter('media');
check('vista albumes: reencender recupera la vista albumes',
  albInst.getState().mediaEnabled === true && albInst.getState().mediaVista === 'albumes');

// =====================================================================
// (25) v1.4.0 - GUARDA 5: ALCANCE PROPIO, CON Y SIN SESION
// El flag "solo mi media" lo aplica el anfitrion, pero el GATE de sesion vive
// en el motor: pedir "mi media" sin sesion no tiene sentido, asi que se avisa y
// se devuelve el valor anterior en vez de dejar un toggle encendido que nadie
// puede satisfacer. Desactivar SIEMPRE funciona. sandbox2.window.ExploraCO
// se installs aqui (y no antes) para poder observar el aviso sin tocar el
// camino de pedirLogin por defecto, que ademas cae en window.loginGate.
// =====================================================================
var loginVistos = [];
sandbox2.window.ExploraCO = {
  usuario: null,
  mostrarLogin: function (msg) { loginVistos.push(msg); }
};
groups.length = 0;
var soloSinSesion = MC2.create({ map: 'mm-personal-map', mediaFilter: false });
check('solo mio: arranca apagado', soloSinSesion.getMediaSoloMio() === false);
var rSin = soloSinSesion.setMediaSoloMio(true);
check('solo mio: SIN sesion devuelve false', rSin === false);
check('solo mio: SIN sesion NO cambia el estado',
  soloSinSesion.getMediaSoloMio() === false
  && soloSinSesion.getState().mediaSoloMio === false
  && soloSinSesion.filtroSnapshot().mediaSoloMio === false);
check('solo mio: SIN sesion invoca el aviso de login', loginVistos.length === 1);
// Con sesion el mismo camino enciende de verdad.
groups.length = 0;
var soloConSesion = MC2.create({ map: 'mm-personal-map', mediaFilter: false, usuario: { id: 42, nombre: 'Ana' } });
var rCon = soloConSesion.setMediaSoloMio(true);
check('solo mio: CON sesion devuelve true', rCon === true);
check('solo mio: CON sesion el estado queda activo',
  soloConSesion.getMediaSoloMio() === true
  && soloConSesion.getState().mediaSoloMio === true
  && soloConSesion.filtroSnapshot().mediaSoloMio === true);
check('solo mio: CON sesion NO vuelve a pedir login', loginVistos.length === 1);
check('solo mio: el snapshot de persistencia lo incluye',
  soloConSesion.filtroSnapshot().hasOwnProperty('mediaSoloMio'));
// Desactivar siempre, con o sin sesion.
var rOff = soloConSesion.setMediaSoloMio(false);
check('solo mio: desactivar CON sesion funciona', rOff === false && soloConSesion.getMediaSoloMio() === false);
soloSinSesion.setMediaSoloMio(true); // vuelve a fallar el gate, no cambia nada
check('solo mio: desactivar SIN sesion tambien funciona',
  soloSinSesion.getMediaSoloMio() === false && loginVistos.length === 2);
check('solo mio: un valor no booleano se normaliza',
  soloConSesion.setMediaSoloMio(1) === true && soloConSesion.setMediaSoloMio(0) === false);

// =====================================================================
// (26) v1.4.0 - GUARDA 6: PERSISTENCIA DE PREFERENCIA (persistKey)
// Es una PREFERENCIA de visualizacion, ciega a la sesion, y por eso es
// opcional (sin clave no se toca localStorage) y va toda en try/catch: en modo
// privado puede lanzar y una preferencia no puede tumbar el mapa. La
// restauracion es ESTRICTAMENTE silenciosa, y eso se comprueba por sus proxies
// observables: no escribe en localStorage, no dispara onMediaVistaChange y no
// llama a pedirLogin durante el arranque.
// =====================================================================
function mkLS() {
  var data = {};
  var ls = {
    __data: data,
    __writes: 0,
    __throwOnSet: false,
    getItem: function (k) { return Object.prototype.hasOwnProperty.call(data, k) ? data[k] : null; },
    setItem: function (k, v) {
      ls.__writes++;
      if (ls.__throwOnSet) throw new Error('QuotaExceededError (simulado)');
      data[k] = String(v);
    },
    removeItem: function (k) { delete data[k]; }
  };
  return ls;
}
function mkSand3(ls) {
  var s = { window: {}, console: console, document: doc, L: L2, setTimeout: fakeSetTimeout, clearTimeout: fakeClearTimeout };
  if (ls) s.localStorage = ls;
  vm.createContext(s);
  vm.runInContext(src, s, { filename: 'mapa-cultural.js' });
  return s.window.MapaCultural;
}

var lsA = mkLS();
var MC3 = mkSand3(lsA);
var KEY = 'mc_smoke_pref_v140';
// usuario pasado por opcion: sin el, el gate de sesion de setMediaSoloMio
// rechazaria el 'true' y la preferencia guardada nunca tendria esa llave.
var prefInst = MC3.create({ map: 'mm-personal-map', mediaFilter: false, persistKey: KEY, usuario: { id: 7 } });
// El motor publica el estado al arrancar (renderMarkers -> filterPins ->
// fireFilterChange), asi que la clave existe desde el primer momento: lo que
// se comprueba es que lo publicado sea el estado REAL y no uno inventado.
var inicial = null;
try { inicial = JSON.parse(lsA.__data[KEY]); } catch (e) { inicial = null; }
check('persistencia: el arranque publica el estado actual y no uno inventado',
  !!inicial && inicial.activeCat === 'all' && numEq(inicial.ratingMin, 0)
  && inicial.mediaVista === 'sueltos' && inicial.mediaSoloMio === false);
prefInst.setMediaTypes({ foto: true, video: true, audio: false });
prefInst.setRatingMin(3.4);
prefInst.setMediaVista('albumes');
prefInst.setMediaSoloMio(true); // con usuario: el gate de sesion no bloquea
check('persistencia: el filtro se escribe en la clave pedida', lsA.__data[KEY] !== undefined);
var guardado = null;
try { guardado = JSON.parse(lsA.__data[KEY]); } catch (e) { guardado = null; }
check('persistencia: el valor guardado es JSON parseable', !!guardado);
check('persistencia: shape plano con las 6 llaves del snapshot',
  !!guardado && ['activeCat', 'ratingMin', 'mediaEnabled', 'mediaTypes', 'mediaVista', 'mediaSoloMio']
    .every(function (k) { return guardado.hasOwnProperty(k); }));
check('persistencia: mediaTypes guardado con las 3 llaves',
  !!guardado && ['foto', 'video', 'audio'].every(function (k) { return guardado.mediaTypes.hasOwnProperty(k); })
  && guardado.mediaTypes.audio === false);
check('persistencia: no guarda funciones ni referencias al mapa',
  !!guardado && JSON.stringify(guardado).indexOf('function') === -1 && guardado.map === undefined
  && Array.isArray(guardado.places) === false);
check('persistencia: el umbral guardado sale cuantizado a paso 0.2', numEq(guardado.ratingMin, 3.4));
// Instancia nueva con la MISMA clave: el estado se restaura.
groups.length = 0;
var restInstCall = 0;
var corInst = null;
var restInst = MC3.create({
  map: 'mm-personal-map',
  mediaFilter: false,
  persistKey: KEY,
  onMediaVistaChange: function () { restInstCall++; }
});
var writesAntes = lsA.__writes;
var restSt = restInst.getState();
check('persistencia: restaura el umbral', numEq(restSt.ratingMin, 3.4));
check('persistencia: restaura la vista de albumes', restSt.mediaVista === 'albumes');
check('persistencia: restaura los tipos y la capa',
  restSt.mediaTypes.foto === true && restSt.mediaTypes.video === true && restSt.mediaTypes.audio === false);
// REPLACED (no borrado): 'persistencia: restaura mediaSoloMio' afirmaba el
// contrato PRE-fix de v1.4.0: montaba la instancia restauradora SIN usuario y
// exigia que el valor persistido quedara en true. Ese contrato ERA el bug
// (el filtro misrepresentationado al cerrar sesion), asi que al arreglarse el
// motor el check paso a FAIL. Motivo del reemplazo: un unico caso no puede
// cubrir las dos rutas del gate; el MISMO valor persistido debe dar true CON
// sesion y false SIN ella, y la caida a false tiene que seguir siendo
// silenciosa. Los dos casos de la seccion (26b) lo cubren con sandboxes
// independientes. Este bloque conserva el resto del contrato de restauracion
// (umbral, vista, tipos y capa), que sigue siendo valido sin sesion. Este
// sandbox se monta SIN usuario, asi que el contrato correcto del gate es que
// mediaSoloMio caiga a false mientras el resto del snapshot se conserva.
check('persistencia: sin sesion NO restaura mediaSoloMio y conserva el resto del snapshot',
  restSt.mediaSoloMio === false && numEq(restSt.ratingMin, 3.4)
  && restSt.mediaVista === 'albumes' && restSt.activeCat === 'all'
  && restSt.mediaTypes.foto === true && restSt.mediaTypes.video === true && restSt.mediaTypes.audio === false);
check('persistencia: la restauracion es silenciosa (0 escrituras al arrancar)', lsA.__writes === writesAntes);
check('persistencia: la restauracion es silenciosa (no dispara onMediaVistaChange)', restInstCall === 0);
check('persistencia: la restauracion es silenciosa (no pide login)', loginVistos.length === 2);

// =====================================================================
// (26b) v1.4.1 - GATE DE SESION AL RESTAURAR LA PREFERENCIA PERSISTIDA
// El activador (setMediaSoloMio) comprobaba la sesion; restoreFiltro no. El
// fallo real: al cerrar sesion, el "true" persistido se restauraba igual, el
// anfitrion consultaba la capa publica (su uid es null) y el filtro quedaba
// encendido sin nada que Satisfacer. El gate se aplico tambien al restaurar.
// Este caso SIN sesion es el que cierra el bug; el CON sesion prueba que el
// fix no rompio la preferencia de quien si tiene sesion.
//
// AISLAMIENTO: cada caso monta su PROPIO sandbox, su PROPIO localStorage y su
// PROPIO stub de sesion. Si el caso con sesion dejara un usuario colgado en un
// stub compartido, el caso sin sesion pasaria por alto justo lo que debe
// probar, y un fallo del gate seria invisible.
// =====================================================================
// Snapshot minimo con TODAS las llaves del contrato y mediaSoloMio en true:
// es el estado que dejaria un visitante con sesion al usar el mapa.
var SNAP_GATE = {
  activeCat: 'hostal',
  ratingMin: 3.4,
  mediaEnabled: true,
  mediaTypes: { foto: true, video: true, audio: false },
  mediaVista: 'albumes',
  mediaSoloMio: true
};
var KEY_GATE = 'mc_smoke_pref_gate_141';

// Stub de sesion OBSERVABLE: cuenta avisos de login y de toast. usuario null
// es el estado real de "sesion cerrada", no la ausencia de ExploraCO: asi el
// caso sin sesion puede distinguir "no hablo" de "no tenia a quien hablarle".
function mkSesionStub(c, usuario) {
  return {
    usuario: usuario,
    mostrarLogin: function (m) { c.avisos.push('login:' + m); },
    mostrarToast: function (m) { c.avisos.push('toast:' + m); }
  };
}
// Elemento que cuenta ESCRITURAS (textContent, innerHTML, className, style,
// classList, setAttribute, appendChild): el silencio del restore se mide de
// verdad y no por el valor final del flag.
function mkCountingEl(id, c) {
  var el = mkEl(id);
  ['textContent', 'innerText', 'innerHTML', 'className'].forEach(function (k) {
    var v = '';
    Object.defineProperty(el, k, {
      get: function () { return v; },
      set: function (x) { c.escrituras++; v = x; }
    });
  });
  el.style = new Proxy({}, {
    set: function (t, k, v) { c.escrituras++; t[k] = v; return true; }
  });
  ['add', 'remove', 'toggle'].forEach(function (m) {
    var orig = el.classList[m];
    el.classList[m] = function () { c.escrituras++; return orig.apply(el.classList, arguments); };
  });
  ['setAttribute', 'removeAttribute', 'appendChild', 'insertBefore'].forEach(function (m) {
    var orig = el[m];
    el[m] = function () { c.escrituras++; return orig.apply(el, arguments); };
  });
  return el;
}
function mkDocCounter(c) {
  var mapEl = mkCountingEl('mm-personal-map', c);
  return {
    mapEl: mapEl,
    doc: {
      getElementById: function (id) { return (id === 'mm-personal-map') ? mapEl : null; },
      querySelector: function () { return null; },
      querySelectorAll: function () { return []; },
      createElement: function () { return mkCountingEl('', c); },
      body: { appendChild: function () { c.escrituras++; } },
      addEventListener: function () {}
    }
  };
}
// Sandbox independiente por caso: contadores nuevos, localStorage nuevo y
// stub de sesion nuevo. fetch devuelve un thenable que no resuelve (asi una
// llamada espuria no queda colgada en await ni genera rechazo sin manejar).
function mkSandPrefGate(seed, usuario) {
  var c = { escrituras: 0, avisos: [], fetches: 0 };
  var ls = mkLS();
  if (seed) ls.setItem(KEY_GATE, JSON.stringify(seed));
  var dc = mkDocCounter(c);
  var s = {
    window: {},
    console: console,
    document: dc.doc,
    L: L2,
    localStorage: ls,
    setTimeout: fakeSetTimeout,
    clearTimeout: fakeClearTimeout,
    fetch: function () { c.fetches++; return { then: function () { return this; } }; }
  };
  s.window.ExploraCO = mkSesionStub(c, usuario);
  vm.createContext(s);
  vm.runInContext(src, s, { filename: 'mapa-cultural.js' });
  return { MC: s.window.MapaCultural, ls: ls, c: c };
}

// ---- caso 1: CON sesion -> el 'true' persistido se restaura ----------
var gateCon = mkSandPrefGate(SNAP_GATE, { id: 7, nombre: 'Ana' });
var gateConVista = 0;
groups.length = 0;
var instGateCon = gateCon.MC.create({
  map: 'mm-personal-map',
  mediaFilter: false,
  persistKey: KEY_GATE,
  onMediaVistaChange: function () { gateConVista++; }
});
var stGateCon = instGateCon.getState();
check('gate restore: CON sesion restaura mediaSoloMio en true',
  stGateCon.mediaSoloMio === true && instGateCon.getMediaSoloMio() === true
  && instGateCon.filtroSnapshot().mediaSoloMio === true);
check('gate restore: CON sesion conserva el resto del snapshot (umbral, vista, tipos, categoria)',
  numEq(stGateCon.ratingMin, 3.4) && stGateCon.mediaVista === 'albumes'
  && stGateCon.activeCat === 'hostal' && stGateCon.mediaEnabled === true
  && stGateCon.mediaTypes.foto === true && stGateCon.mediaTypes.video === true
  && stGateCon.mediaTypes.audio === false);
check('gate restore: CON sesion la restauracion no dispara onMediaVistaChange ni fetch',
  gateConVista === 0 && gateCon.c.fetches === 0 && gateCon.c.avisos.length === 0);

// ---- caso 2: SIN sesion -> el mismo 'true' cae a false, en silencio ----
var gateSin = mkSandPrefGate(SNAP_GATE, null);
var gateSinVista = 0;
groups.length = 0;
var instGateSin = gateSin.MC.create({
  map: 'mm-personal-map',
  mediaFilter: false,
  persistKey: KEY_GATE,
  onMediaVistaChange: function () { gateSinVista++; }
});
var stGateSin = instGateSin.getState();
check('gate restore: SIN sesion el flag persistido cae a false (filtro no mentiroso)',
  stGateSin.mediaSoloMio === false && instGateSin.getMediaSoloMio() === false
  && instGateSin.filtroSnapshot().mediaSoloMio === false);
check('gate restore: SIN sesion el resto del snapshot SI se restaura (solo cae el flag)',
  numEq(stGateSin.ratingMin, 3.4) && stGateSin.mediaVista === 'albumes'
  && stGateSin.activeCat === 'hostal' && stGateSin.mediaEnabled === true
  && stGateSin.mediaTypes.foto === true && stGateSin.mediaTypes.video === true
  && stGateSin.mediaTypes.audio === false);
check('gate restore: SIN sesion la caida es silenciosa (sin aviso, sin red, sin callback)',
  gateSin.c.avisos.length === 0 && gateSin.c.fetches === 0 && gateSinVista === 0);
// CONTROL de escrituras al DOM: misma instancia sin preferencia guardada debe
// escribir EXACTAMENTE lo mismo. Si el restore escribiera en el DOM (un aviso
// propio, un texto de etiqueta), los conteos diferirian. Se exige ademas que el
// control escriba algo (> 0) para que la igualdad no sea una comprobacion vacia.
var gateCtl = mkSandPrefGate(null, null);
groups.length = 0;
gateCtl.MC.create({ map: 'mm-personal-map', mediaFilter: false, persistKey: KEY_GATE });
check('gate restore: SIN sesion no escribe nada en el DOM (mismas escrituras que sin preferencia)',
  gateCtl.c.escrituras === gateSin.c.escrituras && gateSin.c.escrituras > 0);
check('gate restore: el control de escrituras ES observador (el arranque escribe de verdad)',
  gateCtl.c.escrituras > 0);
// Sin ExploraCO en absoluto (anfitrion sin usuario-session.js): mismo contrato.
var gateSinCO = mkSandPrefGate(SNAP_GATE, undefined);
groups.length = 0;
var instGateSinCO = gateSinCO.MC.create({ map: 'mm-personal-map', mediaFilter: false, persistKey: KEY_GATE });
check('gate restore: sin ExploraCO tampoco restaura el true (mismo gate)',
  instGateSinCO.getMediaSoloMio() === false && gateSinCO.c.avisos.length === 0 && gateSinCO.c.fetches === 0);
// Prueba de que los sandboxes NO comparten estado de sesion: el mismo motor,
// con el mismo stub, da resultados opuestos segun el usuario del sandbox. Si
// el caso con sesion hubiera dejado un usuario colgado en un stub compartido,
// estas dos aserciones no podrian cumplirse a la vez.
// La instancia anterior YA republished el snapshot al arrancar, asi que aqui
// se vuelve a sembrar la clave: sin resiembra el caso sin sesion seria un
// chequeo vacio (ya no habria un 'true' que descartar).
gateCon.ls.setItem(KEY_GATE, JSON.stringify(SNAP_GATE));
gateSin.ls.setItem(KEY_GATE, JSON.stringify(SNAP_GATE));
check('gate restore: los sandboxes son independientes (mismo motor, resultado opuesto por sesion)',
  gateCon.MC.create({ map: 'mm-personal-map', persistKey: KEY_GATE }).getMediaSoloMio() === true
  && gateSin.MC.create({ map: 'mm-personal-map', persistKey: KEY_GATE }).getMediaSoloMio() === false);
// Y la razon del bug, enunciada como check: sin sesion el estado NO puede
// sostener el 'true' ni aunque se le pase ademas por opcion.
gateSin.ls.setItem(KEY_GATE, JSON.stringify(SNAP_GATE));
check('gate restore: sin sesion no restaura el true ni con la opcion pedida',
  gateSin.MC.create({ map: 'mm-personal-map', mediaSoloMio: true, persistKey: KEY_GATE }).getMediaSoloMio() === false);
gateCon.ls.setItem(KEY_GATE, JSON.stringify(SNAP_GATE));
check('gate restore: con sesion la opcion y la preferencia coinciden',
  gateCon.MC.create({ map: 'mm-personal-map', mediaSoloMio: true, persistKey: KEY_GATE }).getMediaSoloMio() === true);
// JSON corrupto: arranca con defaults y NO lanza.
lsA.__data['mc_smoke_corrupto'] = '{esto no es json';
var corThrow = true;
var corSt = null;
try { corInst = MC3.create({ map: 'mm-personal-map', mediaFilter: false, persistKey: 'mc_smoke_corrupto' }); corSt = corInst.getState(); } catch (e) { corThrow = false; }
check('persistencia: JSON corrupto no lanza', corThrow);
check('persistencia: JSON corrupto arranca con defaults',
  !!corSt && numEq(corSt.ratingMin, 0) && corSt.mediaVista === 'sueltos' && corSt.mediaSoloMio === false && corSt.activeCat === 'all');
// localStorage que LANZA al escribir: no rompe nada.
lsA.__throwOnSet = true;
var lsThrow = true;
try {
  groups.length = 0;
  var throwInst = MC3.create({ map: 'mm-personal-map', mediaFilter: false, persistKey: 'mc_smoke_quota' });
  throwInst.setRatingMin(4);
  throwInst.setMediaVista('albumes');
} catch (e) { lsThrow = false; }
lsA.__throwOnSet = false;
check('persistencia: localStorage que lanza al escribir no rompe nada', lsThrow);
// persistKey null: no escribe NADA.
lsA.__writes = 0;
groups.length = 0;
var sinKey = MC3.create({ map: 'mm-personal-map', mediaFilter: false });
sinKey.setRatingMin(2);
sinKey.setMediaEnabled(true);
sinKey.setMediaVista('albumes');
check('persistencia: persistKey null no escribe nada',
  lsA.__writes === 0 && Object.keys(lsA.__data).length === 2);
check('persistencia: persistKey null no deja rastro de sus cambios',
  lsA.__data['mc_smoke_quota'] === undefined && lsA.__data[KEY] !== undefined && sinKey.getRatingMin() === 2);
// Sin sandbox con localStorage en absoluto (navegador que no lo expone).
var MC4 = mkSand3(null);
var sinLS = true;
try { MC4.create({ map: 'mm-personal-map', mediaFilter: false, persistKey: 'k' }).setRatingMin(1); } catch (e) { sinLS = false; }
check('persistencia: sin objeto localStorage no lanza', sinLS);

// =====================================================================
// (27) v1.4.0 - LA FACADE EXPONE getState()
// mymapa.js e index-api-connector.js arman sus queries desde el estado del
// motor y antes se veian obligados a leer por window.mcMapa, que NO existe
// igual en los dos anfitriones. getState() en la facade estatica es lo que
// elimina esa fragilidad: mismo patron de delegacion (defaultInst()) que el
// resto de metodos, sin duplicar la logica ni compartir referencias mutables.
// =====================================================================
check('facade: existe getState', typeof MC2.getState === 'function');
var facadeInst = MC2.init();
var facadeSt = MC2.getState();
check('facade: getState() devuelve el estado de la instancia default',
  !!facadeInst && facadeSt && facadeInst === MC2.init()
  && facadeSt.ratingMin === facadeInst.getState().ratingMin
  && facadeSt.activeCat === facadeInst.getState().activeCat
  && facadeSt.mediaEnabled === facadeInst.getState().mediaEnabled
  && facadeSt.mediaVista === facadeInst.getState().mediaVista
  && facadeSt.mediaSoloMio === facadeInst.getState().mediaSoloMio);
check('facade: getState() incluye mediaSoloMio y ratingMinPrevio',
  facadeSt.hasOwnProperty('mediaSoloMio') && facadeSt.hasOwnProperty('ratingMinPrevio'));
var facadeA = MC2.getState();
var facadeB = MC2.getState();
check('facade: getState() devuelve un objeto NUEVO en cada llamada',
  facadeA !== facadeB && facadeA.places !== facadeB.places && facadeA.mediaTypes !== facadeB.mediaTypes);
facadeA.mediaTypes.foto = 'CONTAMINADO';
facadeA.places.push('CONTAMINADO');
check('facade: mutar lo devuelto NO pisa el estado interno',
  MC2.getState().mediaTypes.foto !== 'CONTAMINADO' && MC2.getState().places.indexOf('CONTAMINADO') === -1);
// filtroSnapshot() vive en la INSTANCIA (es parte del contrato v1.4.0, junto
// a getState) y debe ser coherente con ella: mismo shape, mismos valores.
var fsnap = facadeInst.filtroSnapshot();
check('instancia: filtroSnapshot() tiene las 6 llaves del contrato',
  ['activeCat', 'ratingMin', 'mediaEnabled', 'mediaTypes', 'mediaVista', 'mediaSoloMio']
    .every(function (k) { return fsnap.hasOwnProperty(k); }));
check('instancia: filtroSnapshot() coincide con getState()',
  fsnap.activeCat === facadeSt.activeCat && fsnap.ratingMin === facadeSt.ratingMin
  && fsnap.mediaEnabled === facadeSt.mediaEnabled && fsnap.mediaVista === facadeSt.mediaVista
  && fsnap.mediaSoloMio === facadeSt.mediaSoloMio
  && JSON.stringify(fsnap.mediaTypes) === JSON.stringify(facadeSt.mediaTypes));
check('instancia: filtroSnapshot() es serializable (se puede persistir)',
  typeof JSON.stringify(fsnap) === 'string' && JSON.parse(JSON.stringify(fsnap)).mediaSoloMio === fsnap.mediaSoloMio);

// =====================================================================
// (28) DIRECTORIO como ver/no-ver + syncCatBtns (fuente unica del DOM)
// El bug: el item del panel decidia por el DOM (.on) mientras el toggle
// rapido iba al motor, y NADA reconciliaba los chips [data-cat] con
// activeCat. Ahora activeCat es la unica fuente: toggleFilter('cat') oculta
// si algo se ve y restaura la categoria previa (activeCatPrevio) si esta
// oculto; syncCatBtns marca exactamente el chip activo (o ninguno en 'off').
// =====================================================================
function mkCatChip(cat) {
  var el = mkEl('');
  el.getAttribute = function (n) { return (n === 'data-cat') ? cat : null; };
  el.closest = function (s) { return (s === '[data-cat]') ? this : null; };
  return el;
}
function countOn(chips) {
  var n = 0;
  for (var ci = 0; ci < chips.length; ci++) { if (chips[ci].classList.contains('on')) n++; }
  return n;
}
groups.length = 0;
var chipAllD = mkCatChip('all');
var chipHostalD = mkCatChip('hostal');
var catsRootD = mkEl('mc-cats-ver');
catsRootD._on = [chipAllD, chipHostalD];
var dInst = MC2.create({ map: 'mm-personal-map', categories: catsRootD, mediaFilter: false });
dInst.setPlaces([
  MC.normalizePlace({ slug: 'vv-hostal', cat: 'hostal', lat: 4.60, lng: -74.10, rating: 4 }),
  MC.normalizePlace({ slug: 'vv-comida', cat: 'comida', lat: 4.70, lng: -74.20, rating: 4 })
]);
check('ver/no-ver dir: init marca SOLO el chip all y activeCat all',
  dInst.getState().activeCat === 'all' && chipAllD.classList.contains('on') && !chipHostalD.classList.contains('on'));
check('ver/no-ver dir: isFilterOn(cat) true con all', dInst.isFilterOn('cat') === true);
check('ver/no-ver dir: antes del toggle los 2 pines visibles', dInst.getState().visible.length === 2);
var dOff = dInst.toggleFilter('cat');
check('ver/no-ver dir: toggle desde all -> off y oculta los pines',
  dOff.activeCat === 'off' && dInst.getState().visible.length === 0);
check('ver/no-ver dir: isFilterOn(cat) false con off y ningun chip encendido',
  dInst.isFilterOn('cat') === false && countOn([chipAllD, chipHostalD]) === 0);
var dAll = dInst.toggleFilter('cat');
check('ver/no-ver dir: segundo toggle recupera all (no hay previa distinta)',
  dAll.activeCat === 'all' && dInst.getState().visible.length === 2
  && chipAllD.classList.contains('on') && countOn([chipAllD, chipHostalD]) === 1);
// Desde un slug concreto el toggle oculta y luego recupera ESE slug.
var clickD2 = catsRootD.__handlers.click;
clickD2({ target: chipHostalD });
check('ver/no-ver dir: clic en chip hostal -> hostal, chip coherente y 1 pin visible',
  dInst.getState().activeCat === 'hostal' && chipHostalD.classList.contains('on')
  && !chipAllD.classList.contains('on') && dInst.isFilterOn('cat') === true
  && dInst.getState().visible.length === 1);
var dOffSlug = dInst.toggleFilter('cat');
check('ver/no-ver dir: toggle desde slug -> off (sin chip stale)',
  dOffSlug.activeCat === 'off' && countOn([chipAllD, chipHostalD]) === 0);
var dPrevSlug = dInst.toggleFilter('cat');
check('ver/no-ver dir: segundo toggle recupera ESE slug (hostal)',
  dPrevSlug.activeCat === 'hostal' && dInst.getState().activeCatPrevio === 'hostal'
  && chipHostalD.classList.contains('on') && countOn([chipAllD, chipHostalD]) === 1);
// bindCategories decide desde activeCat (no desde el .on del DOM).
var clickD3 = catsRootD.__handlers.click;
clickD3({ target: chipAllD }); // hostal activo -> all
check('ver/no-ver dir: clic en chip all cambia de hostal a all', dInst.getState().activeCat === 'all');
clickD3({ target: chipAllD }); // all activo -> off
check('ver/no-ver dir: clic en el chip ACTIVO -> off', dInst.getState().activeCat === 'off');
clickD3({ target: chipAllD }); // off -> all
check('ver/no-ver dir: clic en chip all estando off -> all',
  dInst.getState().activeCat === 'all' && chipAllD.classList.contains('on'));
// syncCatBtns tras RESTAURAR la preferencia persistida: el init reconcilia
// los chips con la categoria guardada (sin tocar el HTML por eso).
var lsCat = mkLS();
lsCat.setItem('mc_smoke_cat_restore', JSON.stringify({
  activeCat: 'hostal', ratingMin: 0, mediaEnabled: false,
  mediaTypes: { foto: false, video: false, audio: false },
  mediaVista: 'sueltos', mediaSoloMio: false
}));
var MC5 = mkSand3(lsCat);
groups.length = 0;
var chipAllR = mkCatChip('all');
var chipHostalR = mkCatChip('hostal');
var catsRootR = mkEl('mc-cats-restore');
catsRootR._on = [chipAllR, chipHostalR];
var restCat = MC5.create({ map: 'mm-personal-map', categories: catsRootR, mediaFilter: false, persistKey: 'mc_smoke_cat_restore' });
check('ver/no-ver dir: la restauracion persistida deja el chip coherente (hostal on)',
  restCat.getState().activeCat === 'hostal' && chipHostalR.classList.contains('on') && !chipAllR.classList.contains('on'));

// =====================================================================
// (29) MEDIOS: una sola fuente (mediaEnabled) y MISMO estado en los dos
// caminos ("Todos" del panel y toggleFilter('media')). Con la capa oculta
// ningun chip/etiqueta se ve encendido; "Todos" NO reescribe mediaVista.
// =====================================================================
function mkMediaChip(tipo) {
  var el = mkEl('');
  el.getAttribute = function (n) { return (n === 'data-media') ? tipo : null; };
  el.closest = function (s) { return (s === '[data-media]') ? this : null; };
  return el;
}
function mkMediaRootM(chips) {
  var r = mkEl('mc-media');
  r._on = chips;
  r.querySelector = function (sel) {
    if (sel === '[data-media="all"]') {
      for (var mi = 0; mi < chips.length; mi++) {
        if (chips[mi].getAttribute('data-media') === 'all') return chips[mi];
      }
    }
    return null;
  };
  r.querySelectorAll = function (sel) {
    if (sel === '.mf-btn[data-media]') return chips;
    return [];
  };
  r.contains = function () { return true; };
  return r;
}
function mkMediaLabelRoot() {
  var lbl = { textContent: '' };
  return { _lbl: lbl, querySelectorAll: function (sel) { return (sel === '[data-mf-label="med"]') ? [lbl] : []; } };
}
function mkMediaChips() {
  return [mkMediaChip('all'), mkMediaChip('foto'), mkMediaChip('video'), mkMediaChip('audio'), mkMediaChip('albumes')];
}
function chipsAllOff(chips) { return countOn(chips) === 0; }

// Camino A: API del motor. Camino B: clic en el item all del panel.
groups.length = 0;
var chipsA = mkMediaChips();
var rootA = mkMediaRootM(chipsA);
var lblA = mkMediaLabelRoot();
var pathA = MC2.create({ map: 'mm-personal-map', mediaFilter: false, mediaEnabled: true, mediaControls: rootA, filterRoot: lblA });
pathA.setMediaVista('albumes');
var aAntes = pathA.getState();
check('medios: punto de partida comun (capa on, vista albumes)', aAntes.mediaEnabled === true && aAntes.mediaVista === 'albumes');
pathA.toggleFilter('media');
var aOff = pathA.getState();
check('medios via API: toggleFilter(media) apaga y conserva la vista',
  aOff.mediaEnabled === false && aOff.mediaVista === 'albumes');
check('medios via API: con la capa oculta NINGUN chip encendido', chipsAllOff(chipsA));
check('medios via API: con la capa oculta la etiqueta NO dice Albumes', lblA._lbl.textContent === 'Todos');

groups.length = 0;
var chipsB = mkMediaChips();
var rootB = mkMediaRootM(chipsB);
var lblB = mkMediaLabelRoot();
var pathB = MC2.create({ map: 'mm-personal-map', mediaFilter: false, mediaEnabled: true, mediaControls: rootB, filterRoot: lblB });
pathB.setMediaVista('albumes');
var clickM = rootB.__handlers.click;
clickM({ target: chipsB[0] }); // data-media="all"
var bOff = pathB.getState();
check('medios via panel: el item all deja EXACTAMENTE el mismo estado que la API',
  bOff.mediaEnabled === aOff.mediaEnabled && bOff.mediaVista === aOff.mediaVista
  && bOff.mediaEnabled === false && bOff.mediaVista === 'albumes');
check('medios via panel: con la capa oculta NINGUN chip encendido', chipsAllOff(chipsB));
check('medios via panel: la etiqueta NO dice Albumes', lblB._lbl.textContent === 'Todos');
// Reencender por ambos caminos vuelve al MISMO estado (capa on, vista albumes).
pathA.toggleFilter('media');
clickM({ target: chipsB[0] });
var aOn = pathA.getState();
var bOn = pathB.getState();
check('medios: reencender por API y por panel da el mismo estado',
  aOn.mediaEnabled === true && bOn.mediaEnabled === true
  && aOn.mediaVista === bOn.mediaVista && aOn.mediaVista === 'albumes');
check('medios: con la capa on la etiqueta de ambos caminos dice Albumes',
  lblA._lbl.textContent === '\u00c1lbumes' && lblB._lbl.textContent === '\u00c1lbumes');
check('medios: isFilterOn(media) sigue a mediaEnabled',
  pathA.isFilterOn('media') === true && pathB.isFilterOn('media') === true);

console.log(process.exitCode ? 'SMOKE MAPA CULTURAL: FAIL' : 'SMOKE MAPA CULTURAL: OK');
