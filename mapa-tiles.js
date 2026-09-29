/* mapa-tiles.js - ExploraCO
 * Capa base de Leaflet con proveedores de respaldo (A3).
 * El sintoma "se ven pines pero no el mapa base" ocurre cuando el proveedor
 * de tiles falla (red, adblock, bloqueo del CDN). Este helper monta la capa
 * base y, si detecta errores repetidos de tiles, conmuta a un proveedor
 * alternativo; si todos fallan, deja un aviso visible con reintento.
 *
 * API:
 *   window.MapaTiles.aplicar(map, opts) -> <L.TileLayer>
 *     opts.url/opts.attribution/opts.maxZoom/opts.subdomains: preferencia.
 *     Si opts.url NO es uno de los proveedores conocidos, se usa como base
 *     y la cadena de respaldo son los proveedores conocidos.
 *   window.MapaTiles.estado()  -> { proveedor, total, errores, agotado }
 *   window.MapaTiles.reintentar(map, opts)
 *
 * ASCII-safe (sin bytes > 127 ni backticks).
 */
(function () {
  'use strict';

  var PROVEEDORES = [
    { id: 'osm',          url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',                                                               attribution: '&copy; OpenStreetMap',        subdomains: 'abc', maxZoom: 19 },
    { id: 'osm-hot',      url: 'https://tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',                                                            attribution: '&copy; OpenStreetMap France', subdomains: 'abc', maxZoom: 19 },
    { id: 'esri-imagery', url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',                 attribution: '&copy; Esri',                 subdomains: 'abc', maxZoom: 19 }
  ];

  var UMBRAL_ERRORES = 5;

  var _estado = { proveedor: 0, total: PROVEEDORES.length, errores: 0, agotado: false, capa: null, map: null, lista: null, opts: null };

  function porcentajeDe(n, total) {
    if (!total || total <= 0) { return 0; }
    return Math.max(0, Math.min(100, Math.round((n / total) * 100)));
  }

  /* Construye la lista efectiva de proveedores para esta llamada. Si el
     usuario pide una URL propia, esa va PRIMERO y luego los conocidos. */
  function listaEfectiva(opts) {
    var lista = PROVEEDORES.slice();
    if (opts && opts.url) {
      for (var i = 0; i < lista.length; i++) { if (lista[i].url === opts.url) { return lista; } }
      lista.unshift({
        id: 'custom',
        url: opts.url,
        attribution: opts.attribution || '',
        subdomains: opts.subdomains || 'abc',
        maxZoom: opts.maxZoom || 19
      });
    }
    return lista;
  }

  function indiceInicial(lista, opts) {
    if (!opts || !opts.url) { return 0; }
    for (var i = 0; i < lista.length; i++) { if (lista[i].url === opts.url) { return i; } }
    return 0;
  }

  function quitarAviso(map) {
    if (typeof document === 'undefined' || !map) { return; }
    var cont = map.getContainer ? map.getContainer() : null;
    var aviso = cont && cont.querySelector ? cont.querySelector('.mt-aviso') : null;
    if (aviso && aviso.parentNode) { aviso.parentNode.removeChild(aviso); }
  }

  function mostrarAviso(map, onRetry) {
    if (typeof document === 'undefined' || !map) { return; }
    var cont = map.getContainer ? map.getContainer() : null;
    if (!cont) { return; }
    quitarAviso(map);
    var aviso = document.createElement('div');
    aviso.className = 'mt-aviso';
    aviso.setAttribute('role', 'status');
    aviso.style.cssText = 'position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);z-index:800;max-width:260px;padding:14px 16px;background:rgba(15,23,42,.94);border:1px solid rgba(232,160,32,.5);border-radius:12px;color:#fff;font-family:Outfit,sans-serif;font-size:13px;text-align:center';
    var msj = document.createElement('div');
    msj.textContent = 'No pudimos cargar el mapa base.';
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = 'Reintentar';
    btn.style.cssText = 'margin-top:10px;padding:7px 14px;background:#E8A020;color:#111;border:none;border-radius:8px;font-weight:700;cursor:pointer';
    btn.onclick = function () { if (typeof onRetry === 'function') { onRetry(); } };
    aviso.appendChild(msj);
    aviso.appendChild(btn);
    cont.appendChild(aviso);
  }

  function montar(map, indice) {
    if (!map || typeof L === 'undefined') { return null; }
    var lista = _estado.lista || PROVEEDORES;
    var base = lista[indice] || lista[0];
    var opciones = { attribution: base.attribution, maxZoom: base.maxZoom, subdomains: base.subdomains };
    var capa = L.tileLayer(base.url, opciones).addTo(map);
    _estado.proveedor = indice;
    _estado.total = lista.length;
    _estado.errores = 0;
    _estado.capa = capa;
    _estado.map = map;
    if (capa && typeof capa.on === 'function') {
      capa.on('tileerror', function () {
        _estado.errores++;
        if (_estado.errores >= UMBRAL_ERRORES && !_estado.agotado) { cambiar(); }
      });
      capa.on('tileload', function () {
        if (_estado.errores > 0) { _estado.errores = 0; }
        quitarAviso(map);
      });
    }
    return capa;
  }

  function cambiar() {
    var map = _estado.map;
    var lista = _estado.lista || PROVEEDORES;
    var siguiente = _estado.proveedor + 1;
    if (siguiente >= lista.length) {
      _estado.agotado = true;
      mostrarAviso(map, function () {
        _estado.agotado = false;
        if (_estado.capa && map && typeof map.removeLayer === 'function') { map.removeLayer(_estado.capa); }
        montar(map, 0);
      });
      return false;
    }
    if (_estado.capa && map && typeof map.removeLayer === 'function') { map.removeLayer(_estado.capa); }
    montar(map, siguiente);
    return true;
  }

  function aplicar(map, opts) {
    opts = opts || {};
    var lista = listaEfectiva(opts);
    _estado.lista = lista;
    _estado.opts = opts;
    _estado.agotado = false;
    quitarAviso(map);
    var indice = indiceInicial(lista, opts);
    return montar(map, indice);
  }

  function reintentar(map, opts) {
    return aplicar(map || _estado.map, opts || _estado.opts);
  }

  window.MapaTiles = {
    PROVEEDORES: PROVEEDORES,
    UMBRAL_ERRORES: UMBRAL_ERRORES,
    aplicar: aplicar,
    reintentar: reintentar,
    porcentajeDe: porcentajeDe,
    listaPara: listaEfectiva,
    estado: function () {
      return { proveedor: _estado.proveedor, total: _estado.total, errores: _estado.errores, agotado: _estado.agotado };
    }
  };
})();
