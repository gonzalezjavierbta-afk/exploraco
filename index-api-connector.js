// index-api-connector.js  v8 \u2014 completo y definitivo
// Actualiza: PL[], DEST_PHOTOS{}, MAPA_PLACES[], DEST_FEATURED_IDS[],
//            AGENDA_EVENTS[] (secci\u00f3n eventos), stats reales, b\u00fasqueda en tiempo real

(function () {
  'use strict';

  var CAT_COLORS = {
    hostal: 'linear-gradient(135deg,#1a3a5c,#2a4a7c)',
    comida: 'linear-gradient(135deg,#3a1a0a,#4a2a1a)',
    sitio:  'linear-gradient(135deg,#0a2a1a,#1a3a2a)',
    evento: 'linear-gradient(135deg,#1a051a,#3a1a3a)',
  };

  // Color del pin del mapa por categor\u00eda \u2014 MAPA_PLACES necesita p.color
  var PIN_COLORS = {
    hostal: '#2196F3',
    comida: '#FF9800',
    sitio:  '#4CAF50',
    evento: '#A855F7',
  };

  // Mapeo cat DB \u2192 cat de agenda (para AGENDA_EVENTS)
  var AGENDA_CAT_MAP = {
    hostal:  'alojamiento',
    comida:  'gastro',
    sitio:   'naturaleza',
    evento:  'festival',
  };

  // Formato exacto de PL[] confirmado del index.html real.
  // FIX 2: foto por defecto es '' (cadena vac\u00eda). NUNCA se inyecta una URL
  // externa (Unsplash, placeholder, etc.). Si item.foto / item.photos[0].url
  // falta o viene vac\u00eda, se devuelve '' y el render del index muestra el
  // placeholder NEUTRO (photoPlaceholderHTML del index.html). Mantener esto
  // ASCII-safe: ning\u00fan caracter >127 ni backticks.
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
      emoji:     item.emoji      || '\uD83D\uDCCD',
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

  // Formato MAPA_PLACES[] \u2014 necesita p.color para los pins de Leaflet.
  // FIX 2: igual que toPlace, NUNCA se inyecta una URL externa de fallback.
  // Si el destino no tiene foto real, place.foto queda '' y el placeholder
  // neutro del index.html se muestra via photoPlaceholderHTML(emoji, 'hero').
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
      emoji:   item.emoji   || '\uD83D\uDCCD',
      lat:     parseFloat(item.lat) || 0,
      lng:     parseFloat(item.lng) || 0,
      lead:    item.lead    || '',
      price:   item.price   || '',
      hero_bg: item.hero_bg || CAT_COLORS[item.cat] || CAT_COLORS.sitio,
      foto:    item.foto_hero || item.foto || '',
      // Galeria completa del destino (max 8) para el drawer del mapa.
      // Shape normalizado {url,cap}; index.html puede consumir place.photos
      // sin sorpresas (spec: galeria completa, no solo la hero).
      photos:   (item.photos && item.photos.length) ? item.photos.slice(0, 8).map(function (p) { return { url: p.url || '', cap: p.cap || '' }; }) : [],
      color:   PIN_COLORS[item.cat] || '#666666', // \u2190 campo requerido por initMapaSection()
    };
  }

  // Colores de categor\u00eda para la agenda (mismo set que los filtros del home)
  var AGENDA_CAT_COLOR = {
    festival:   '#A855F7',
    musica:     '#3B82F6',
    gastro:     '#EF4444',
    naturaleza: '#22C55E',
    cultura:    '#EC4899',
  };

  // Convierte lugar de DB al formato AGENDA_EVENTS[] que usa renderAgenda()
  // Solo para lugares con cat='evento'. RANGO [fecha_inicio, fecha_fin]:
  // el evento queda activo en TODOS los dias vigentes (multidia).
  function toAgendaEvent(item, idx) {
    var AU = window.AgendaUtil || null;
    var MONTHS = AU ? AU.MONTHS : ['Ene','Feb','Mar','Abr','May','Jun',
                                   'Jul','Ago','Sep','Oct','Nov','Dic'];
    var t = item.tags || {};
    var d = new Date();
    var startDate = AU ? AU.parseISO(t.fecha_inicio) : null;
    var endDate = AU && t.fecha_fin ? AU.parseISO(t.fecha_fin) : startDate;
    var cat = AU ? AU.detectEventCat(item.name, t) : (AGENDA_CAT_MAP[item.cat] || 'festival');
    return {
      id:       1000 + idx,
      name:     item.name || '',
      cat:      cat,
      city:     item.city || '',
      day:      startDate ? startDate.getDate() : (item.day   || d.getDate()),
      month:    startDate ? MONTHS[startDate.getMonth()]
                          : (item.month || MONTHS[d.getMonth()]),
      time:     item.horario || 'Variable',
      price:    item.price || 'Consultar',
      loc:      t.sede
                  ? t.sede
                  : (item.barrio ? (item.barrio + ', ' + (item.city || '')) : (item.city || '')),
      emoji:    item.emoji   || '\uD83C\uDF89',
      color:    AGENDA_CAT_COLOR[cat] || PIN_COLORS.evento,
      url:      item.slug + '.html',
      featured: item.destacado || false,
      start:    startDate,
      end:      endDate,
      tags:     t,
    };
  }

  // Actualizar stats con IDs a\u00f1adidos al HTML
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
      get('stat-rating').textContent = stats.rating + '\u2605';
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

  // \u2500\u2500 B\u00daSQUEDA EN TIEMPO REAL \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
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
          // Sin b\u00fasqueda \u2014 restaurar PL completo
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

  // \u2500\u2500 FETCH Y ACTUALIZAR \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  function fetchAndUpdate(q) {
    var url = '/api/destinos?limit=500&_t=' + Date.now() + (q ? '&q=' + encodeURIComponent(q) : '');
    fetch(url)
      .then(function (r) { return r.json(); })
      .then(function (d) { applyData(d, q); })
      .catch(function (e) { console.warn('[index-api] Error:', e.message); });
  }

  function applyData(d, q) {
    if (!d.ok || !d.data) {
      console.warn('[index-api] Sin datos:', d.error || 'vac\u00edo');
      return;
    }

    var apiData = d.data;

    // 1. PL[]
    var nuevoPL = apiData.map(toPlace);
    if (typeof PL !== 'undefined') replArr(PL, nuevoPL);

    // 2. DEST_PHOTOS{} -- FIX 2: ahora poblado desde la API con fotos
    //    REALES por destino (index.html ya no hardcodea URLs externas).
    //    Si un destino no tiene foto, queda '' y se muestra el
    //    placeholder neutro (photoPlaceholderHTML).
    var nuevosPhotos = {};
    nuevoPL.forEach(function (p) {
      if (p.photos && p.photos[0]) nuevosPhotos[p.id] = p.photos[0].url;
    });
    if (typeof DEST_PHOTOS !== 'undefined') replObj(DEST_PHOTOS, nuevosPhotos);

    // 3. MAPA_PLACES[] \u2014 solo con coords + campo color
    var nuevoMapa = apiData
      .filter(function (item) { return item.lat && item.lng && item.lat !== 0 && item.lng !== 0; })
      .map(function (item) {
        var idx = apiData.indexOf(item);
        return toMapPlace(item, idx);
      });
    if (typeof MAPA_PLACES !== 'undefined') replArr(MAPA_PLACES, nuevoMapa);

    // 3b. MAPA_MEDIA[] - multimedia del mapa cultural del endpoint
    //     publico GET /api/interacciones?tipo=multimedia_mapa
    var mediaUrl = '/api/interacciones?tipo=multimedia_mapa&origen=album&_t=' + Date.now();
    fetch(mediaUrl)
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (!d.ok || !d.data) {
          console.warn('[index-api] Sin multimedia de mapa:', d.error || 'vacio');
          return;
        }
        var nuevoMedia = d.data.filter(function (m) {
          return m.media_url
            && m.lat != null && m.lat !== 0
            && m.lng != null && m.lng !== 0;
        });
        if (typeof MAPA_MEDIA !== 'undefined') replArr(MAPA_MEDIA, nuevoMedia);
        // Re-render de la capa media: sin esto, si el usuario abre el mapa
        // antes de que llegue la respuesta, la capa queda vacia hasta la
        // siguiente interaccion (auditoria QA -> hallazgo M1).
        if (typeof refreshMapaMarkers === 'function') { try { refreshMapaMarkers(); } catch (e) { console.warn('[index-api] refresh tras multimedia:', e.message); } }
        console.log('[index-api] MAPA_MEDIA:' + nuevoMedia.length);
      })
      .catch(function (e) { console.warn('[index-api] Error multimedia mapa:', e.message); });

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

    // 5. AGENDA_EVENTS[] \u2014 eventos de la DB + los hardcodeados originales
    //    Orden: mas recientes primero (creado_en DESC) para que los eventos
    //    recien cargados aparezcan arriba de la agenda del home, sin quedar
    //    enterrados bajo eventos legacy con rating alto.
    var eventosDB = apiData
      .filter(function (item) { return item.cat === 'evento'; })
      .sort(function (a, b) {
        var ca = a.creado_en || '', cb = b.creado_en || '';
        return ca < cb ? 1 : (ca > cb ? -1 : 0);
      })
      .map(toAgendaEvent);

    if (eventosDB.length > 0 && typeof AGENDA_EVENTS !== 'undefined') {
      // Mantener eventos hardcodeados, a\u00f1adir los de DB al principio si no son duplicados
      var slugsDB = eventosDB.map(function (e) { return e.url; });
      var eventosOriginalesFiltrados = AGENDA_EVENTS.filter(function (e) {
        return !slugsDB.includes(e.url);
      });
      replArr(AGENDA_EVENTS, eventosDB.concat(eventosOriginalesFiltrados));
    }

    // 6. Stats reales (solo en carga inicial, no en b\u00fasquedas)
    if (!q && d.stats) updateStats(d.stats);

    console.log('[index-api] \u2713 PL:' + nuevoPL.length
      + ' | mapa:' + nuevoMapa.length
      + (q ? ' | b\u00fasqueda:"' + q + '"' : ''));

    // 7. Re-render
    if (typeof renderDest      === 'function') renderDest();
    if (typeof renderAgenda    === 'function') renderAgenda(
      typeof agendaCat !== 'undefined' ? agendaCat : 'all',
      typeof agendaDayFilter !== 'undefined' ? agendaDayFilter : null
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

  // \u2500\u2500 INIT \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  function init() {
    loadAndRender();
    setupSearch();
    // Hook para que el index restaure el PL completo al limpiar la
    // b\u00fasqueda (los clear del hero/directorio no disparan 'input').
    window.ExploraReloadDestinos = loadAndRender;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(init, 200); });
  } else {
    setTimeout(init, 200);
  }

}());
