/* map-picker.js - Modulo compartido de mapa Leaflet para ExploraCO
 *
 * Encapsula la logica que antes vivia inline en admin.html:
 *   - mini-mapa con pin draggable sincronizado a inputs lat/lng
 *   - map-picker modal full-screen con click-to-pin y confirmar
 *   - geocoder Nominatim (una llamada por busqueda, User-Agent polite)
 *
 * USO EN admin.html (editor de lugares):
 *   1) Leaflet CDN ya lo carga admin.html. NO incluye el CDN aqui.
 *   2) <script src="map-picker.js"></script> (despues del CDN de Leaflet)
 *   3) En el script principal de admin:
 *        var MapPicker = initMapPicker({ toast: showAdminToast });
 *      y wrappers finos para oninput/onclick existentes:
 *        function updateMiniMap(){ MapPicker.updateMiniMap(); }
 *        function buscarCoordenadas(){ MapPicker.buscarCoordenadas(); }
 *        function openMapPicker(){ MapPicker.openMapPicker(); }
 *        function closeMapPicker(){ MapPicker.closeMapPicker(); }
 *        function confirmMapPicker(){ MapPicker.confirmMapPicker(); }
 *   4) IDs por defecto (compatibles con admin.html): f-lat, f-lng,
 *      f-city / f-nombre, esb-mini-map, map-picker-modal,
 *      map-picker-el, map-picker-coords, clase CSS 'open'.
 *
 * USO EN mi-perfil.html (T7, localizacion al crear recurso del Museo):
 *   var MP = initMapPicker({
 *     latInput: '<id input lat>',
 *     lngInput: '<id input lng>',
 *     cityInputs: ['<id input ciudad>'],
 *     miniMapEl: '<id div mini-mapa>',
 *     modalEl: '<id modal>', mapEl: '<id contenedor leaflet>',
 *     coordsEl: '<id display coords>',
 *     precision: 6,
 *     showCityGeocoder: true,          // boton "Buscar por ciudad"
 *     openClass: 'open',               // clase que abre el modal (CSS del host)
 *     toast: function (msg, type) {},  // notificaciones del host
 *     onPick: function (lat, lng) {}   // callback post-confirmar
 *   });
 *   Luego MP.openMapPicker() / MP.updateMiniMap() desde tus botones.
 *
 * CONTRATO VISUAL CON EL HOST:
 *   - El host provee el CSS de ::hover/.open del modal y las variables
 *     CSS var(--muted), var(--bg2), var(--r), var(--gold) usadas en el
 *     placeholder del mini-mapa (mismas que usa admin.html).
 *
 * NOTAS DE COMPATIBILIDAD:
 *   - ASCII puro (ADR-002): sin tildes, sin emojis literales, sin
 *     backticks. Los emojis del placeholder/toasts usan escapes \u.
 *   - CommonJS (BUG-001): exportado con module.exports si existe, y
 *     tambien asignado a window.initMapPicker para uso via <script>.
 *   - node --check valido (referencias a document/window/L solo se
 *     ejecutan en runtime del navegador).
 */
(function (root) {
  'use strict';

  /* Escapes Unicode para emojis (mantienen el archivo 100% ASCII):
     \uD83D\uDCCD = pin rojo (U+1F4CD), \uD83D\uDD0D = lupa (U+1F50D),
     \u2014 = em dash. */
  var PIN = '\uD83D\uDCCD';
  var SEARCH_ICON = '\uD83D\uDD0D';
  var EM_DASH = '\u2014';

  function hasLeaflet() {
    if (typeof root.L === 'undefined') {
      if (typeof console !== 'undefined' && console.warn) {
        console.warn('[map-picker] Leaflet (L) no esta cargado: agrega el CDN de Leaflet antes de map-picker.js');
      }
      return false;
    }
    return true;
  }

  function initMapPicker(opts) {
    opts = opts || {};

    var latInputId = opts.latInput || 'f-lat';
    var lngInputId = opts.lngInput || 'f-lng';
    var cityInputIds = opts.cityInputs || ['f-city', 'f-nombre'];
    var miniMapElId = opts.miniMapEl || 'esb-mini-map';
    var modalElId = opts.modalEl || 'map-picker-modal';
    var pickerMapElId = opts.mapEl || 'map-picker-el';
    var coordsDisplayId = opts.coordsEl || 'map-picker-coords';
    var precision = (opts.precision !== undefined) ? opts.precision : 6;
    var centerLat = (opts.centerLat !== undefined) ? opts.centerLat : 4.5981;
    var centerLng = (opts.centerLng !== undefined) ? opts.centerLng : -74.0759;
    var pickerZoom = (opts.pickerZoom !== undefined) ? opts.pickerZoom : 10;
    var miniZoom = (opts.miniZoom !== undefined) ? opts.miniZoom : 13;
    var openClass = opts.openClass || 'open';
    var showCityGeocoder = opts.showCityGeocoder !== false;
    var onPick = (typeof opts.onPick === 'function') ? opts.onPick : null;
    var toast = (typeof opts.toast === 'function') ? opts.toast : null;
    var tileUrl = opts.tileUrl || 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

    var miniMap = null;
    var miniMarker = null;
    var pickerMap = null;
    var pickerMarker = null;
    var pickerLatLng = null;

    function inputValue(id) {
      var el = document.getElementById(id);
      return el ? (el.value || '') : '';
    }

    function setInputValue(id, val) {
      var el = document.getElementById(id);
      if (el) el.value = val;
    }

    function callToast(msg, type) {
      if (toast) toast(msg, type);
    }

    function b64PlaceholderBtnId() {
      return miniMapElId + '-geo';
    }

    function placeholderHtml() {
      var html = '<div style="height:100%;display:flex;flex-direction:column;align-items:center;'
        + 'justify-content:center;gap:8px;color:var(--muted);font-size:12px;'
        + 'background:var(--bg2);border-radius:var(--r)">'
        + '<span style="font-size:24px">' + PIN + '</span>'
        + '<span>Ingresa lat/lng para ver el mapa</span>';
      if (showCityGeocoder) {
        html += '<button id="' + b64PlaceholderBtnId() + '" style="padding:5px 12px;'
          + 'background:var(--gold);color:#000;border:none;border-radius:6px;'
          + 'cursor:pointer;font-size:11px;font-weight:700">'
          + SEARCH_ICON + ' Buscar por ciudad</button>';
      }
      html += '</div>';
      return html;
    }

    function updateMiniMap() {
      if (!hasLeaflet()) return;
      var lat = parseFloat(inputValue(latInputId));
      var lng = parseFloat(inputValue(lngInputId));
      var el = document.getElementById(miniMapElId);
      if (!el) return;

      /* Sin coords: placeholder con boton de ayuda */
      if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
        if (!miniMap) {
          el.innerHTML = placeholderHtml();
          if (showCityGeocoder) {
            var geoBtn = document.getElementById(b64PlaceholderBtnId());
            if (geoBtn) geoBtn.addEventListener('click', buscarCoordenadas);
          }
        }
        return;
      }

      if (!miniMap) {
        /* Limpiar placeholder si existe */
        el.innerHTML = '';
        try {
          miniMap = root.L.map(miniMapElId, {
            zoomControl: true,
            scrollWheelZoom: false,
            dragging: true,
            tap: false
          }).setView([lat, lng], miniZoom);
          root.L.tileLayer(tileUrl, { attribution: '', maxZoom: 19 }).addTo(miniMap);
          miniMarker = root.L.marker([lat, lng], { draggable: true }).addTo(miniMap);
          /* Al arrastrar el marker, actualizar los inputs */
          miniMarker.on('dragend', function (e) {
            var pos = e.target.getLatLng();
            setInputValue(latInputId, pos.lat.toFixed(precision));
            setInputValue(lngInputId, pos.lng.toFixed(precision));
          });
        } catch (err) {
          if (typeof console !== 'undefined') console.warn('[map-picker] minimap init:', err && err.message);
          return;
        }
      } else {
        miniMap.setView([lat, lng], miniZoom);
        if (miniMarker) miniMarker.setLatLng([lat, lng]);
      }
      setTimeout(function () { if (miniMap) miniMap.invalidateSize(); }, 150);
    }

    /* Geocodifica '<ciudad>, Colombia' via Nominatim (gratuito, 1 llamada) */
    function buscarCoordenadas() {
      if (!hasLeaflet()) return;
      var ciudad = '';
      for (var i = 0; i < cityInputIds.length; i++) {
        ciudad = inputValue(cityInputIds[i]);
        if (ciudad) break;
      }
      if (!ciudad) {
        callToast('Primero escribe la ciudad del lugar', 'error');
        return;
      }
      var query = ciudad + ', Colombia';
      root.fetch('https://nominatim.openstreetmap.org/search?format=json&q='
        + encodeURIComponent(query) + '&limit=1', {
          headers: { 'Accept-Language': 'es', 'User-Agent': 'ExploraCO/1.0' }
        })
        .then(function (r) { return r.json(); })
        .then(function (results) {
          if (!results || !results.length) {
            callToast('No se encontraron coordenadas para "' + ciudad + '"', 'error');
            return;
          }
          var res = results[0];
          var lat = parseFloat(res.lat);
          var lng = parseFloat(res.lon);
          setInputValue(latInputId, lat.toFixed(precision));
          setInputValue(lngInputId, lng.toFixed(precision));
          /* Destruir mini-mapa anterior para reinicializar con el nuevo pin */
          if (miniMap) { miniMap.remove(); miniMap = null; miniMarker = null; }
          updateMiniMap();
          callToast(PIN + ' Coordenadas de ' + ciudad + ' cargadas ' + EM_DASH
            + ' arrastra el pin para ajustar');
        })
        .catch(function (e) {
          callToast('Error al buscar: ' + ((e && e.message) || String(e)), 'error');
        });
    }

    function openMapPicker() {
      if (!hasLeaflet()) return;
      var modal = document.getElementById(modalElId);
      if (!modal) return;
      modal.classList.add(openClass);
      setTimeout(function () {
        if (!pickerMap) {
          var lat = parseFloat(inputValue(latInputId)) || centerLat;
          var lng = parseFloat(inputValue(lngInputId)) || centerLng;
          pickerMap = root.L.map(pickerMapElId).setView([lat, lng], pickerZoom);
          root.L.tileLayer(tileUrl, { attribution: '&copy; CARTO', maxZoom: 19 }).addTo(pickerMap);
          pickerMap.on('click', function (e) {
            pickerLatLng = e.latlng;
            if (pickerMarker) pickerMarker.setLatLng(e.latlng);
            else pickerMarker = root.L.marker(e.latlng).addTo(pickerMap);
            var coordsEl = document.getElementById(coordsDisplayId);
            if (coordsEl) {
              coordsEl.textContent = PIN + ' ' + e.latlng.lat.toFixed(precision)
                + ', ' + e.latlng.lng.toFixed(precision);
            }
          });
        }
        if (pickerMap) pickerMap.invalidateSize();
      }, 200);
    }

    function closeMapPicker() {
      var modal = document.getElementById(modalElId);
      if (modal) modal.classList.remove(openClass);
    }

    function confirmMapPicker() {
      if (!pickerLatLng) return;
      setInputValue(latInputId, pickerLatLng.lat.toFixed(precision));
      setInputValue(lngInputId, pickerLatLng.lng.toFixed(precision));
      closeMapPicker();
      updateMiniMap();
      callToast(PIN + ' Coordenadas actualizadas');
      if (onPick) onPick(pickerLatLng.lat, pickerLatLng.lng);
    }

    return {
      updateMiniMap: updateMiniMap,
      buscarCoordenadas: buscarCoordenadas,
      openMapPicker: openMapPicker,
      closeMapPicker: closeMapPicker,
      confirmMapPicker: confirmMapPicker,
      getPickerMap: function () { return pickerMap; },
      getMiniMap: function () { return miniMap; }
    };
  }

  if (typeof module === 'object' && module.exports) {
    module.exports = initMapPicker;
  }
  root.initMapPicker = initMapPicker;

})(typeof window !== 'undefined' ? window : this);