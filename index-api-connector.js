// index-api-connector.js  v8 — completo y definitivo
// Actualiza: PL[], DEST_PHOTOS{}, MAPA_PLACES[], DEST_FEATURED_IDS[],
//            AGENDA_EVENTS[] (sección eventos), stats reales, búsqueda en tiempo real

(function () {
  'use strict';

  var CAT_COLORS = {
    hostal: 'linear-gradient(135deg,#1a3a5c,#2a4a7c)',
    comida: 'linear-gradient(135deg,#3a1a0a,#4a2a1a)',
    sitio:  'linear-gradient(135deg,#0a2a1a,#1a3a2a)',
    evento: 'linear-gradient(135deg,#1a051a,#3a1a3a)',
  };

  // Color del pin del mapa por categoría — MAPA_PLACES necesita p.color
  var PIN_COLORS = {
    hostal: '#2196F3',
    comida: '#FF9800',
    sitio:  '#4CAF50',
    evento: '#A855F7',
  };

  // Mapeo cat DB → cat de agenda (para AGENDA_EVENTS)
  var AGENDA_CAT_MAP = {
    hostal:  'alojamiento',
    comida:  'gastro',
    sitio:   'naturaleza',
    evento:  'festival',
  };

  // Formato exacto de PL[] confirmado del index.html real
  function toPlace(item, idx) {
    var foto = item.foto
      || (item.photos && item.photos[0] ? item.photos[0].url : '')
      || '';
    return {
      id:        idx + 1,
      _uuid:     item.id,
      slug:      item.slug       || '',
      name:      item.name       || '',
      cat:       item.cat        || 'sitio',
      city:      item.city       || '',
      region:    item.region     || '',
      barrio:    item.barrio     || '',
      address:   '',
      lead:      item.lead       || '',
      desc:      item.desc       || item.lead || '',
      highlight: item.highlight  || '',
      price:     item.price      || '',
      emoji:     item.emoji      || '📍',
      hero_bg:   item.hero_bg    || CAT_COLORS[item.cat] || CAT_COLORS.sitio,
      rating:    item.rating     || 0,
      rev:       item.reviews    || 0,
      whatsapp:  item.whatsapp   || '',
      tel:       item.tel        || '',
      email:     item.email      || '',
      web:       item.web        || '',
      instagram: item.instagram  || '',
      booking:   item.booking    || '',
      hostelworld: item.hostelworld || '',
      airbnb:    item.airbnb     || '',
      lat:       item.lat        || 0,
      lng:       item.lng        || 0,
      photos:    foto ? [{ type: 'photo', url: foto, cap: item.name || '' }] : [],
      scores:    {},
      status:    'published',
      destacado: item.destacado  || false,
    };
  }

  // Formato MAPA_PLACES[] — necesita p.color para los pins de Leaflet
  function toMapPlace(item, idx) {
    return {
      id:      idx + 1,
      _uuid:   item.id,
      slug:    item.slug    || '',
      name:    item.name    || '',
      cat:     item.cat     || 'sitio',
      city:    item.city    || '',
      region:  item.region  || '',
      rating:  item.rating  || 0,
      emoji:   item.emoji   || '📍',
      lat:     parseFloat(item.lat) || 0,
      lng:     parseFloat(item.lng) || 0,
      lead:    item.lead    || '',
      price:   item.price   || '',
      hero_bg: item.hero_bg || CAT_COLORS[item.cat] || CAT_COLORS.sitio,
      color:   PIN_COLORS[item.cat] || '#666666', // ← campo requerido por initMapaSection()
    };
  }

  // Convierte lugar de DB al formato AGENDA_EVENTS[] que usa renderAgenda()
  // Solo para lugares con cat='evento'
  function toAgendaEvent(item, idx) {
    var d = new Date();
    var fechaInicio = item.tags && item.tags.fecha_inicio;
    var startDate = null;
    if (fechaInicio && typeof fechaInicio === 'string' && fechaInicio.length >= 10) {
      startDate = new Date(
        parseInt(fechaInicio.slice(0, 4), 10),
        parseInt(fechaInicio.slice(5, 7), 10) - 1,
        parseInt(fechaInicio.slice(8, 10), 10)
      );
    }
    return {
      id:       1000 + idx,
      name:     item.name || '',
      cat:      AGENDA_CAT_MAP[item.cat] || 'festival',
      city:     item.city || '',
      day:      startDate ? startDate.getDate() : (item.day   || d.getDate()),
      month:    startDate ? ['Ene','Feb','Mar','Abr','May','Jun',
                             'Jul','Ago','Sep','Oct','Nov','Dic'][startDate.getMonth()]
                          : (item.month || ['Ene','Feb','Mar','Abr','May','Jun',
                             'Jul','Ago','Sep','Oct','Nov','Dic'][d.getMonth()]),
      time:     item.horario || 'Consultar',
      price:    item.price || 'Consultar',
      loc:      item.barrio
                  ? (item.barrio + ', ' + (item.city || ''))
                  : (item.city || ''),
      emoji:    item.emoji   || '🎉',
      color:    PIN_COLORS.evento,
      url:      item.slug + '.html',
      featured: item.destacado || false,
    };
  }

  // Actualizar stats con IDs añadidos al HTML
  function updateStats(stats) {
    var get = function (id) { return document.getElementById(id); };
    // Antes usaba "&& stats.X" (truthiness), asi que un valor real de 0
    // (ej. 0 resenas antes de que existiera la tabla interacciones) se
    // trataba como "sin dato" y dejaba el placeholder hardcodeado del
    // HTML (18.4K) para siempre. "!= null" cubre null/undefined sin
    // excluir el 0 legitimo.
    if (get('stat-destinos') && stats.destinos != null) get('stat-destinos').textContent = stats.destinos;
    if (get('stat-ciudades') && stats.ciudades != null) get('stat-ciudades').textContent = stats.ciudades;
    if (get('stat-resenas')  && stats.resenas != null) {
      get('stat-resenas').textContent = stats.resenas >= 1000
        ? (stats.resenas / 1000).toFixed(1) + 'K'
        : stats.resenas;
    }
    if (get('stat-rating') && stats.rating != null) {
      get('stat-rating').textContent = stats.rating + '★';
    }
  }

  // Reemplazar array sin romper la referencia (mutacion in-place).
  // IMPORTANTE: recibe el ARRAY REAL por referencia (ej. PL, no
  // 'PL' como string). PL/MAPA_PLACES/AGENDA_EVENTS estan declarados
  // con `const` en index.html -- las declaraciones `const`/`let` de
  // nivel superior en un <script> NO se exponen como propiedades de
  // `window` (solo `var` y las funciones si lo hacen). Buscar por
  // `window[name]` con esos tres arrays SIEMPRE fallaba el chequeo
  // `typeof window[name] !== 'undefined'` y terminaba creando una
  // propiedad `window.PL`/`window.MAPA_PLACES`/`window.AGENDA_EVENTS`
  // nueva y desconectada -- que nada mas en la pagina lee -- mientras
  // el `const PL`/`const MAPA_PLACES`/`const AGENDA_EVENTS` real (el
  // que usan renderDest()/refreshMapaMarkers()/renderAgenda()) se
  // quedaba vacio para siempre. Por eso el log mostraba "PL:95" pero
  // la grilla y el mapa nunca se poblaban (ver BUGS_HISTORICOS.md
  // BUG-020). Recibir el array por referencia evita el problema por
  // completo, sin importar si fue declarado con var/let/const.
  function replArr(targetArr, newArr) {
    if (!Array.isArray(targetArr)) return;
    targetArr.length = 0;
    newArr.forEach(function (i) { targetArr.push(i); });
  }

  // Reemplazar objeto sin romper la referencia (mismo razonamiento que
  // replArr -- recibe el OBJETO REAL, no un string).
  function replObj(targetObj, newObj) {
    if (!targetObj || typeof targetObj !== 'object') return;
    Object.keys(targetObj).forEach(function (k) { delete targetObj[k]; });
    Object.keys(newObj).forEach(function (k) { targetObj[k] = newObj[k]; });
  }

  // ── BÚSQUEDA EN TIEMPO REAL ────────────────────────────────────
  // Conectar el input del hero (#sinp) y el input de destinos (#dest-input)
  // a la API con debounce 300ms
  var searchTimer = null;

  function setupSearch() {
    var inputs = [
      document.getElementById('sinp'),
      document.getElementById('dest-input'),
    ].filter(Boolean);

    inputs.forEach(function (inp) {
      inp.addEventListener('input', function (e) {
        var q = e.target.value.trim();
        clearTimeout(searchTimer);
        if (q.length === 0) {
          // Sin búsqueda — restaurar PL completo
          loadAndRender();
          return;
        }
        if (q.length < 2) return; // esperar al menos 2 chars
        searchTimer = setTimeout(function () {
          fetchAndUpdate(q);
        }, 300);
      });
    });
  }

  // ── FETCH Y ACTUALIZAR ─────────────────────────────────────────
  function fetchAndUpdate(q) {
    var url = '/api/destinos?limit=500&_t=' + Date.now() + (q ? '&q=' + encodeURIComponent(q) : '');
    fetch(url)
      .then(function (r) { return r.json(); })
      .then(function (d) { applyData(d, q); })
      .catch(function (e) { console.warn('[index-api] Error:', e.message); });
  }

  function applyData(d, q) {
    if (!d.ok || !d.data) {
      console.warn('[index-api] Sin datos:', d.error || 'vacío');
      return;
    }

    var apiData = d.data;

    // 1. PL[]
    var nuevoPL = apiData.map(toPlace);
    if (typeof PL !== 'undefined') replArr(PL, nuevoPL);

    // 2. DEST_PHOTOS{}
    var nuevosPhotos = {};
    nuevoPL.forEach(function (p) {
      if (p.photos && p.photos[0]) nuevosPhotos[p.id] = p.photos[0].url;
    });
    if (typeof DEST_PHOTOS !== 'undefined') replObj(DEST_PHOTOS, nuevosPhotos);

    // 3. MAPA_PLACES[] — solo con coords + campo color
    var nuevoMapa = apiData
      .filter(function (item) { return item.lat && item.lng && item.lat !== 0 && item.lng !== 0; })
      .map(function (item) {
        var idx = apiData.indexOf(item);
        return toMapPlace(item, idx);
      });
    if (typeof MAPA_PLACES !== 'undefined') replArr(MAPA_PLACES, nuevoMapa);

    // 4. DEST_FEATURED_IDS[]
    var featIds = nuevoPL
      .filter(function (p) { return p.destacado; })
      .map(function (p) { return p.id; });
    if (!featIds.length) {
      featIds = nuevoPL.slice()
        .sort(function (a, b) { return b.rating - a.rating; })
        .slice(0, 10)
        .map(function (p) { return p.id; });
    }
    if (typeof DEST_FEATURED_IDS !== 'undefined') replArr(DEST_FEATURED_IDS, featIds);

    // 5. AGENDA_EVENTS[] — eventos de la DB + los hardcodeados originales
    var eventosDB = apiData
      .filter(function (item) { return item.cat === 'evento'; })
      .map(toAgendaEvent);

    if (eventosDB.length > 0 && typeof AGENDA_EVENTS !== 'undefined') {
      // Mantener eventos hardcodeados, añadir los de DB al principio si no son duplicados
      var slugsDB = eventosDB.map(function (e) { return e.url; });
      var eventosOriginalesFiltrados = AGENDA_EVENTS.filter(function (e) {
        return !slugsDB.includes(e.url);
      });
      replArr(AGENDA_EVENTS, eventosDB.concat(eventosOriginalesFiltrados));
    }

    // 6. Stats reales (solo en carga inicial, no en búsquedas)
    if (!q && d.stats) updateStats(d.stats);

    console.log('[index-api] ✓ PL:' + nuevoPL.length
      + ' | mapa:' + nuevoMapa.length
      + (q ? ' | búsqueda:"' + q + '"' : ''));

    // 7. Re-render
    if (typeof renderDest      === 'function') renderDest();
    if (typeof renderAgenda    === 'function') renderAgenda(
      typeof agendaCat !== 'undefined' ? agendaCat : 'all'
    );
    // Mapa: si el Leaflet map YA existe (mapaMap truthy), solo refrescar
    // markers. Si TODAVIA no existe, inicializarlo ahora mismo en vez
    // de esperar a que el usuario llegue a la seccion de mapa via
    // scroll/IntersectionObserver/timeout de 2s. initMapaSection() ya
    // llama a refreshMapaMarkers() internamente, y MAPA_PLACES ya esta
    // poblado en este punto del codigo (mapaMap SI esta declarado con
    // var en index.html, por eso window.mapaMap funciona aqui).
    if (typeof window.mapaMap !== 'undefined' && window.mapaMap) {
      if (typeof refreshMapaMarkers === 'function') refreshMapaMarkers();
    } else if (typeof initMapaSection === 'function') {
      initMapaSection();
    }
    // Mi Mapa personal: MAPA_PLACES acaba de poblarse/cambiarse, pero
    // este ciclo nunca lo repintaba -- quedaba congelado en el estado
    // vacio del primer render (riesgo conocido en NEXT.md, BUG TSK-070:
    // "al iniciar no muestra los sitios guardados"). renderMMList limpia
    // su contenedor antes de pintar, asi que repetir la llamada no
    // duplica items.
    if (typeof renderMyMap === 'function') renderMyMap();
  }

  function loadAndRender() {
    fetchAndUpdate('');
  }

  // ── INIT ───────────────────────────────────────────────────────
  function init() {
    loadAndRender();
    setupSearch();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(init, 200); });
  } else {
    setTimeout(init, 200);
  }

}());
