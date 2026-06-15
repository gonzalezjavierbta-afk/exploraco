// index-api-connector.js  v5 — reemplaza PL[], DEST_PHOTOS{}, MAPA_PLACES[] y stats
// Formato EXACTO que espera el index.html:
//   PL[]:          id(num), rev(num), photos[]{type,url,cap}, hero_bg, emoji...
//   DEST_PHOTOS{}: { id_numerico: 'url_string' }
//   MAPA_PLACES[]: id(num), slug, name, cat, city, region, rating, emoji, lat, lng, lead, price, hero_bg, color
//   Stats:         .hstn dentro de .hstats (sin IDs — buscamos por posición en .hstatsdivs)

(function() {
  'use strict';

  var CAT_COLORS = {
    hostal: 'linear-gradient(135deg,#1a3a5c,#2a4a7c)',
    comida: 'linear-gradient(135deg,#3a1a0a,#4a2a1a)',
    sitio:  'linear-gradient(135deg,#0a2a1a,#1a3a2a)',
    evento: 'linear-gradient(135deg,#1a051a,#3a1a3a)',
  };
  var CAT_PIN_COLORS = {
    hostal: '#2196F3', comida: '#FF9800', sitio: '#4CAF50', evento: '#9C27B0',
  };

  // Convierte datos de /api/destinos al formato EXACTO de PL[]
  function toPlaceFormat(d, idx) {
    var foto = d.foto || (d.photos && d.photos[0] ? d.photos[0].url : '') || '';
    var photos = foto
      ? [{ type:'photo', url: foto, cap: d.name || '' }]
      : [];

    return {
      // id numérico secuencial — el index usa indexOf con estos IDs para featured/save
      id:        idx + 1,
      _uuid:     d.id,           // UUID real de Neon — para operaciones DB
      slug:      d.slug       || '',
      name:      d.name       || '',
      cat:       d.cat        || 'sitio',
      city:      d.city       || '',
      region:    d.region     || '',
      barrio:    d.barrio     || '',
      address:   '',
      lead:      d.lead       || '',
      desc:      d.desc       || d.lead || '',
      highlight: d.highlight  || '',
      price:     d.price      || '',
      emoji:     d.emoji      || '📍',
      hero_bg:   d.hero_bg    || CAT_COLORS[d.cat] || CAT_COLORS.sitio,
      rating:    d.rating     || 0,
      rev:       d.reviews    || 0,   // PL usa "rev", no "reviews"
      whatsapp:  d.whatsapp   || '',
      tel:       d.tel        || '',
      email:     d.email      || '',
      web:       d.web        || '',
      instagram: d.instagram  || '',
      booking:   d.booking    || '',
      hostelworld: d.hostelworld || '',
      airbnb:    d.airbnb     || '',
      lat:       d.lat        || 0,
      lng:       d.lng        || 0,
      photos:    photos,
      scores:    {},
      status:    'published',
      destacado: d.destacado  || false,
    };
  }

  // Construye DEST_PHOTOS{ id_numerico: url } que usa renderDest()
  function buildDestPhotos(lugares) {
    var fotos = {};
    lugares.forEach(function(p) {
      if (p.photos && p.photos.length > 0) {
        fotos[p.id] = p.photos[0].url || '';
      }
    });
    return fotos;
  }

  // Construye MAPA_PLACES[] con formato exacto del index
  function toMapPlace(d, idx) {
    return {
      id:      idx + 1,
      _uuid:   d.id,
      slug:    d.slug     || '',
      name:    d.name     || '',
      cat:     d.cat      || 'sitio',
      city:    d.city     || '',
      region:  d.region   || '',
      rating:  d.rating   || 0,
      emoji:   d.emoji    || '📍',
      lat:     d.lat      || 0,
      lng:     d.lng      || 0,
      lead:    d.lead     || '',
      price:   d.price    || '',
      hero_bg: d.hero_bg  || CAT_COLORS[d.cat] || CAT_COLORS.sitio,
      color:   CAT_PIN_COLORS[d.cat] || '#666',
    };
  }

  // Actualiza los 4 contadores del hero (.hstats .hstn)
  function updateStats(stats) {
    var hstn = document.querySelectorAll('.hstats .hstn');
    if (hstn.length >= 4) {
      // Orden en el HTML: Destinos | Reseñas | Ciudades | Promedio
      if (stats.destinos)  hstn[0].textContent = stats.destinos;
      if (stats.resenas) {
        hstn[1].textContent = stats.resenas >= 1000
          ? (stats.resenas / 1000).toFixed(1) + 'K'
          : stats.resenas;
      }
      if (stats.ciudades)  hstn[2].textContent = stats.ciudades;
      if (stats.rating)    hstn[3].textContent = stats.rating + '★';
    }
  }

  // Re-inicializa el index tras actualizar PL[]
  function reinitIndex() {
    // renderDest() es la función real del index
    if (typeof window.renderDest === 'function') {
      window.renderDest();
      console.log('[index-api] ✓ renderDest() ejecutado');
    }
    // initMapaSection maneja MAPA_PLACES con Leaflet
    if (typeof window.initMapaSection === 'function') {
      window.initMapaSection();
      console.log('[index-api] ✓ initMapaSection() ejecutado');
    }
    // Algunos temas usan initMapa o renderMap
    if (typeof window.renderMap === 'function') window.renderMap();
    if (typeof window.initMapa === 'function') window.initMapa();
  }

  // ── Fetch principal ──────────────────────────────────────────────
  function loadIndex() {
    fetch('/api/destinos?limit=500')
      .then(function(r) { return r.json(); })
      .then(function(res) {
        if (!res.ok || !res.data || !res.data.length) {
          console.warn('[index-api] Sin datos de /api/destinos:', res);
          return;
        }

        var lugares = res.data;

        // 1. Construir PL[] con ids numéricos secuenciales
        var nuevoPL = lugares.map(toPlaceFormat);

        // 2. Construir DEST_PHOTOS{}
        var nuevasPhotos = buildDestPhotos(nuevoPL);

        // 3. Construir MAPA_PLACES[] — solo los que tienen lat/lng
        var nuevoMapa = lugares
          .filter(function(d) { return d.lat && d.lng && d.lat !== 0 && d.lng !== 0; })
          .map(function(d, i) {
            // Buscar el índice original para mantener id coherente
            var idxOriginal = lugares.indexOf(d);
            return toMapPlace(d, idxOriginal);
          });

        // 4. Actualizar variables globales
        if (typeof PL !== 'undefined') {
          // Vaciar y rellenar el array existente (mantiene referencias)
          PL.length = 0;
          nuevoPL.forEach(function(p) { PL.push(p); });
        } else {
          window.PL = nuevoPL;
        }

        // DEST_PHOTOS es var (no const) — reemplazar directamente
        if (typeof DEST_PHOTOS !== 'undefined') {
          Object.keys(DEST_PHOTOS).forEach(function(k) { delete DEST_PHOTOS[k]; });
          Object.assign(DEST_PHOTOS, nuevasPhotos);
        } else {
          window.DEST_PHOTOS = nuevasPhotos;
        }

        // MAPA_PLACES es const — necesitamos vaciar y rellenar
        if (typeof MAPA_PLACES !== 'undefined') {
          MAPA_PLACES.length = 0;
          nuevoMapa.forEach(function(p) { MAPA_PLACES.push(p); });
        } else {
          window.MAPA_PLACES = nuevoMapa;
        }

        // 5. DEST_FEATURED_IDS: los primeros destacados
        var featIds = nuevoPL
          .filter(function(p) { return p.destacado; })
          .map(function(p) { return p.id; });
        if (featIds.length === 0) {
          // Sin destacados: usar los primeros 8 con mejor rating
          featIds = nuevoPL
            .slice()
            .sort(function(a,b){ return b.rating - a.rating; })
            .slice(0, 8)
            .map(function(p){ return p.id; });
        }
        if (typeof DEST_FEATURED_IDS !== 'undefined') {
          DEST_FEATURED_IDS.length = 0;
          featIds.forEach(function(id) { DEST_FEATURED_IDS.push(id); });
        } else {
          window.DEST_FEATURED_IDS = featIds;
        }

        // 6. Stats
        if (res.stats) updateStats(res.stats);

        console.log('[index-api] ' + nuevoPL.length + ' destinos cargados desde DB');
        console.log('[index-api] ' + nuevoMapa.length + ' markers en el mapa');

        // 7. Re-render
        reinitIndex();
      })
      .catch(function(e) {
        console.warn('[index-api] Error:', e.message);
      });
  }

  // Esperar a que las funciones del index estén definidas
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      // Pequeño delay para que el JS del index termine de inicializarse
      setTimeout(loadIndex, 100);
    });
  } else {
    setTimeout(loadIndex, 100);
  }

})();
