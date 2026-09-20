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
check('API: version 1.1.0', MC && MC.version === '1.1.0');
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

var mapStub = {
  setView: function () { return this; },
  getZoom: function () { return 14; },
  project: function () { return { x: 0, y: 0 }; },
  on: function () { return this; },
  off: function () { return this; },
  hasLayer: function () { return false; },
  addLayer: function () { return this; },
  removeLayer: function () { return this; },
  remove: function () {},
  fitBounds: function () { return this; },
  panTo: function () { return this; },
  flyTo: function () { return this; },
  getBounds: function () { return { contains: function () { return true; } }; }
};
function layerStub() {
  return {
    addTo: function () { return this; },
    clearLayers: function () {},
    addLayer: function () { return this; },
    removeLayer: function () { return this; },
    bindPopup: function () { return this; },
    openPopup: function () { return this; }
  };
}
var markerStub = {
  on: function () { return this; },
  addTo: function () { return this; },
  bindPopup: function () { return this; },
  openPopup: function () { return this; },
  getLatLng: function () { return { lat: 0, lng: 0 }; }
};
var L2 = {
  map: function () { return mapStub; },
  tileLayer: function () { return { addTo: function () { return this; } }; },
  layerGroup: layerStub,
  marker: function () { return markerStub; },
  divIcon: function () { return {}; }
};

var sandbox2 = { window: {}, console: console, document: doc, L: L2, setTimeout: setTimeout, clearTimeout: clearTimeout };
vm.createContext(sandbox2);
vm.runInContext(src, sandbox2, { filename: 'mapa-cultural.js' });
var MC2 = sandbox2.window.MapaCultural;

var inst2 = MC2.create({ map: 'mm-personal-map', categories: '#mm-personal-cats' });
check('bindCategories: init con document/L -> initialized', inst2.getState().initialized === true);
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

console.log(process.exitCode ? 'SMOKE MAPA CULTURAL: FAIL' : 'SMOKE MAPA CULTURAL: OK');
