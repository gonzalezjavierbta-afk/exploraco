// Smoke de mapa-tiles.js (A3): valida la lista de proveedores, la capa base
// con fallback por 'tileerror' y el aviso de reintento cuando todos fallan.
// Patron vm de los smokes existentes del repo (sin red, sin DOM real).
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function check(label, cond) {
  console.log((cond ? 'PASS' : 'FAIL') + ' - ' + label);
  if (!cond) process.exitCode = 1;
}

const src = fs.readFileSync(path.join(__dirname, '..', 'mapa-tiles.js'), 'utf8');

// ---- (1) API y catalogo de proveedores -----------------------------
const sb = { window: {}, console };
vm.createContext(sb);
vm.runInContext(src, sb, { filename: 'mapa-tiles.js' });
const MT = sb.window.MapaTiles;
check('API: window.MapaTiles expuesto', !!MT);
check('API: aplicar', MT && typeof MT.aplicar === 'function');
check('API: reintentar', MT && typeof MT.reintentar === 'function');
check('API: estado', MT && typeof MT.estado === 'function');
check('API: listaPara', MT && typeof MT.listaPara === 'function');
check('proveedores: >= 2', MT && Array.isArray(MT.PROVEEDORES) && MT.PROVEEDORES.length >= 2);
check('proveedores: primero CARTO (no OSM)', MT && MT.PROVEEDORES[0].url.indexOf('cartocdn.com') !== -1);
check('proveedores: ultimo OSM', MT && MT.PROVEEDORES[MT.PROVEEDORES.length - 1].url.indexOf('openstreetmap') !== -1);
check('proveedores: todos con maxZoom', MT && MT.PROVEEDORES.every(function (p) { return !!p.maxZoom; }));

check('porcentajeDe: 50/100 = 50', MT.porcentajeDe(50, 100) === 50);
check('porcentajeDe: total 0 = 0', MT.porcentajeDe(5, 0) === 0);

// ---- (2) lista efectiva con URL custom -----------------------------
const listaCustom = MT.listaPara({ url: 'https://tiles.mi-proveedor.test/{z}/{x}/{y}.png' });
check('listaPara: URL custom va primero', listaCustom[0].url === 'https://tiles.mi-proveedor.test/{z}/{x}/{y}.png');
check('listaPara: conserva los proveedores conocidos despues', listaCustom.length === MT.PROVEEDORES.length + 1);
const listaConocida = MT.listaPara({ url: MT.PROVEEDORES[0].url });
check('listaPara: URL conocida no duplica', listaConocida.length === MT.PROVEEDORES.length);

// ---- (3) fallback por tileerror (sandbox con L y document stubs) ----
function mkLayer() {
  return {
    _handlers: {},
    on: function (t, fn) { this._handlers[t] = fn; return this; },
    off: function (t) { delete this._handlers[t]; return this; },
    addTo: function (m) { if (m && typeof m.addLayer === 'function') { m.addLayer(this); } return this; },
    fire: function (t) { if (this._handlers[t]) { this._handlers[t](); } }
  };
}
const capas = [];
const L = {
  tileLayer: function (url, opts) { const l = mkLayer(); l.url = url; l.opts = opts; capas.push(l); return l; }
};
const contEl = {
  _kids: [],
  appendChild: function (n) { this._kids.push(n); return n; },
  querySelector: function (sel) { return null; },
  removeChild: function () {}
};
const mapStub = {
  _layers: [],
  addLayer: function (l) { this._layers.push(l); return this; },
  removeLayer: function (l) { const i = this._layers.indexOf(l); if (i >= 0) this._layers.splice(i, 1); return this; },
  getContainer: function () { return contEl; }
};
const documentStub = {
  createElement: function () {
    return { className: '', style: {}, children: [], setAttribute: function () {}, appendChild: function (c) { this.children.push(c); return c; }, onclick: null, textContent: '' };
  }
};
const sb2 = { window: {}, console, L: L, document: documentStub };
vm.createContext(sb2);
vm.runInContext(src, sb2, { filename: 'mapa-tiles.js' });
const MT2 = sb2.window.MapaTiles;

const capa0 = MT2.aplicar(mapStub, {});
check('aplicar: monta una capa con la URL del primer proveedor', capas.length === 1 && capa0.url === MT2.PROVEEDORES[0].url);
check('aplicar: estado proveedor 0', MT2.estado().proveedor === 0);

for (let i = 0; i < MT2.UMBRAL_ERRORES; i++) { capa0.fire('tileerror'); }
check('fallback: tras el umbral cambia de proveedor (1)', MT2.estado().proveedor === 1);
check('fallback: la capa anterior se quito del mapa', mapStub._layers.length === 1 && mapStub._layers[0].url === MT2.PROVEEDORES[1].url);
check('fallback: no crea capas de mas (2 en total)', capas.length === 2);

const capa1 = mapStub._layers[0];
for (let i = 0; i < MT2.UMBRAL_ERRORES; i++) { capa1.fire('tileerror'); }
check('fallback: cambio al segundo proveedor (2)', MT2.estado().proveedor === 2);
const capa2 = mapStub._layers[0];
for (let i = 0; i < MT2.UMBRAL_ERRORES; i++) { capa2.fire('tileerror'); }
check('fallback: agotado tras el ultimo proveedor', MT2.estado().agotado === true);
check('fallback: aviso con reintento insertado en el contenedor', contEl._kids.length === 1);

console.log(process.exitCode ? 'SMOKE MAPA TILES: FAIL' : 'SMOKE MAPA TILES: OK');
