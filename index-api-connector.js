// index-api-connector.js  v4
// Se incluye al final de index.html
// Reemplaza PL[], MAPA_PLACES[] y los contadores del hero con datos reales de /api/destinos

(function() {
  'use strict';

  var API = '/api/destinos';

  // ── Actualizar contadores del hero ──────────────────────────────
  function updateStats(stats) {
    var map = {
      // selector → valor
      '.stat-destinos':  stats.destinos,
      '.stat-ciudades':  stats.ciudades,
      '.stat-resenas':   stats.resenas  >= 1000
        ? (stats.resenas / 1000).toFixed(1) + 'K'
        : stats.resenas,
      '.stat-rating':    stats.rating ? stats.rating + '★' : null,
    };

    // También buscar por data-stat attribute
    document.querySelectorAll('[data-stat]').forEach(function(el) {
      var key = el.getAttribute('data-stat');
      if (key === 'destinos'  && stats.destinos)  el.textContent = stats.destinos;
      if (key === 'ciudades'  && stats.ciudades)  el.textContent = stats.ciudades;
      if (key === 'resenas'   && stats.resenas) {
        el.textContent = stats.resenas >= 1000
          ? (stats.resenas / 1000).toFixed(1) + 'K'
          : stats.resenas;
      }
      if (key === 'rating'    && stats.rating)    el.textContent = stats.rating;
    });

    Object.keys(map).forEach(function(sel) {
      var val = map[sel];
      if (!val) return;
      document.querySelectorAll(sel).forEach(function(el) {
        el.textContent = val;
      });
    });
  }

  // ── Convertir lugar al formato PL[] que usa el JS interno del index ─
  function toPlaceFormat(d) {
    return {
      id:        d.id,
      slug:      d.slug,
      name:      d.name,
      cat:       d.cat,
      city:      d.city,
      region:    d.region     || '',
      lead:      d.lead       || '',
      desc:      d.desc       || d.lead || '',
      highlight: d.highlight  || '',
      price:     d.price      || '',
      emoji:     d.emoji      || '📍',
      hero_bg:   d.hero_bg    || 'linear-gradient(135deg,#1a1a2e,#16213e)',
      lat:       d.lat        || 0,
      lng:       d.lng        || 0,
      rating:    d.rating     || 0,
      reviews:   d.reviews    || 0,
      destacado: d.destacado  || false,
      verificado:d.verificado || false,
      whatsapp:  d.whatsapp   || '',
      web:       d.web        || '',
      instagram: d.instagram  || '',
      booking:   d.booking    || '',
      hostelworld:d.hostelworld|| '',
      airbnb:    d.airbnb     || '',
      tipo:      d.tipo       || '',
      photos:    d.photos     || [],
      amenities: d.amenities  || [],
      habs:      d.habs       || [],
      faqs:      d.faqs       || [],
    };
  }

  // ── Formato para MAPA_PLACES[] ──────────────────────────────────
  function toMapPlace(d) {
    return {
      id:    d.id,
      slug:  d.slug,
      name:  d.name,
      cat:   d.cat,
      city:  d.city,
      lat:   d.lat || 0,
      lng:   d.lng || 0,
      emoji: d.emoji || '📍',
      foto:  d.photos && d.photos[0] ? d.photos[0].url : '',
      rating: d.rating || 0,
    };
  }

  // ── Reinicializar funciones del index si existen ─────────────────
  function reinitIndex(lugares) {
    // Muchos temas del index usan renderCards(), renderMap(), initFilters()
    // Los llamamos si existen después de actualizar PL
    if (typeof window.renderCards   === 'function') window.renderCards();
    if (typeof window.renderMap     === 'function') window.renderMap();
    if (typeof window.initFilters   === 'function') window.initFilters();
    if (typeof window.renderFeatured=== 'function') window.renderFeatured();
    if (typeof window.renderHome    === 'function') window.renderHome();
    if (typeof window.init          === 'function') window.init();
  }

  // ── Fetch y actualizar ───────────────────────────────────────────
  function loadIndex() {
    // 1. Cargar todos los lugares para PL[]
    fetch(API + '?limit=500')
      .then(function(r) { return r.json(); })
      .then(function(res) {
        if (!res.ok || !res.data) {
          console.warn('[index-api] Sin datos de /api/destinos');
          return;
        }

        var lugares = res.data.map(toPlaceFormat);

        // Reemplazar PL global
        if (typeof window.PL !== 'undefined') {
          window.PL = lugares;
        } else {
          window.PL = lugares;
        }

        // Stats reales
        if (res.stats) updateStats(res.stats);

        console.log('[index-api] ' + lugares.length + ' destinos cargados desde DB');
        reinitIndex(lugares);
      })
      .catch(function(e) {
        console.warn('[index-api] Error cargando destinos:', e.message);
      });

    // 2. Cargar mapa (solo places con lat/lng)
    fetch(API + '?modo=mapa')
      .then(function(r) { return r.json(); })
      .then(function(res) {
        if (!res.ok || !res.data) return;
        var mapPlaces = res.data.map(toMapPlace);

        if (typeof window.MAPA_PLACES !== 'undefined') {
          window.MAPA_PLACES = mapPlaces;
        } else {
          window.MAPA_PLACES = mapPlaces;
        }

        // Re-renderizar mapa si ya está inicializado
        if (typeof window.renderMapMarkers === 'function') window.renderMapMarkers(mapPlaces);
        if (typeof window.initMapa         === 'function') window.initMapa();

        console.log('[index-api] ' + mapPlaces.length + ' markers de mapa cargados');
      })
      .catch(function(e) {
        console.warn('[index-api] Error cargando mapa:', e.message);
      });
  }

  // Esperar a que el DOM esté listo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadIndex);
  } else {
    loadIndex();
  }

})();
