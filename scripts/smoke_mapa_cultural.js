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
check('API: version 1.0.0', MC && MC.version === '1.0.0');
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

// ---- (extra) instancia: metodos del contrato -----------------------
['init', 'refresh', 'destroy', 'setPlaces', 'setMedia', 'setMediaEnabled',
 'setMediaTypes', 'getMap', 'getState', 'openDrawer', 'closeDrawer',
 'geolocate', 'resetColombia'].forEach(function (fn) {
  check('instancia: metodo ' + fn, inst && typeof inst[fn] === 'function');
});

console.log(process.exitCode ? 'SMOKE MAPA CULTURAL: FAIL' : 'SMOKE MAPA CULTURAL: OK');
