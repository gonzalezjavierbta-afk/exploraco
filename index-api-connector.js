/**
 * ExploraCO — Index API Connector
 * Reemplaza PL[] y MAPA_PLACES[] de index.html con datos reales de Neon
 *
 * Incluir en index.html ANTES del </body>:
 * <script src="index-api-connector.js"></script>
 *
 * Estrategia:
 * 1. La página carga instantáneo con datos hardcodeados (sin flash)
 * 2. En segundo plano llama a /api/destinos
 * 3. Reemplaza PL y MAPA_PLACES con datos frescos
 * 4. Re-renderiza las tarjetas y el mapa
 */

(function () {
  'use strict';

  // Solo en Netlify — no en file://
  if (window.location.protocol === 'file:') {
    console.log('[index-api] Modo local — usando datos hardcodeados');
    return;
  }

  // ── Convertir destino de API → formato de index.html ───────
  function apiToPL(d, index) {
    return {
      id:       index + 1,
      _uuid:    d.id,
      slug:     d.slug,
      name:     d.nombre,
      cat:      d.categoria_slug,
      city:     d.ciudad     || '',
      region:   d.region     || 'Colombia',
      barrio:   d.barrio     || '',
      lead:     d.lead       || '',
      desc:     d.descripcion|| '',
      price:    d.precio_desde|| '',
      emoji:    d.emoji      || '📍',
      hero_bg:  d.hero_bg    || 'linear-gradient(135deg,#111,#222)',
      photo:    d.foto_hero  || '',
      rating:   parseFloat(d.rating)       || 0,
      rev:      parseInt(d.total_resenas)  || 0,
      destacado: d.destacado || false,
      lat:      parseFloat(d.lat) || 0,
      lng:      parseFloat(d.lng) || 0,
      whatsapp: d.whatsapp   || '',
      web:      d.web        || '',
      instagram:d.instagram  || '',
    };
  }

  function apiToMapa(d, index) {
    return {
      id:     index + 1,
      slug:   d.slug,
      name:   d.nombre,
      cat:    d.categoria_slug,
      city:   d.ciudad || '',
      region: d.region || '',
      rating: parseFloat(d.rating) || 0,
      emoji:  d.emoji  || '📍',
      lat:    parseFloat(d.lat) || 0,
      lng:    parseFloat(d.lng) || 0,
      lead:   d.lead   || '',
      price:  d.precio_desde || '',
      hero_bg:d.hero_bg|| '',
    };
  }

  // ── Cargar todos los destinos ───────────────────────────────
  function cargarDestinos() {
    fetch('/api/destinos?limit=200')
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (data) {
        if (!data.ok || !data.data || !data.data.length) {
          throw new Error('Sin datos');
        }

        var destinos = data.data;
        console.log('[index-api] ' + destinos.length + ' destinos cargados desde DB');

        // Reemplazar PL
        window.PL = destinos.map(apiToPL);

        // Reemplazar MAPA_PLACES (solo los que tienen coords)
        window.MAPA_PLACES = destinos
          .filter(function (d) { return d.lat && d.lng; })
          .map(apiToMapa);

        // Actualizar DEST_FEATURED_IDS con los destacados
        var featuredIds = [];
        window.PL.forEach(function (p) {
          if (p.destacado) featuredIds.push(p.id);
        });
        if (featuredIds.length && typeof window.DEST_FEATURED_IDS !== 'undefined') {
          window.DEST_FEATURED_IDS = featuredIds;
        }

        // Re-renderizar tarjetas del directorio
        if (typeof window.renderDest === 'function') {
          window.renderDest();
        }

        // Actualizar marcadores del mapa si está inicializado
        if (typeof window.updateMMMarkers === 'function') {
          window.updateMMMarkers();
        }

        // Actualizar el mapa principal de la homepage si existe
        if (typeof window.mapaMap !== 'undefined' && window.mapaMap) {
          recargarMapaPrincipal();
        }

        // Actualizar el hero slider si usa PL
        if (typeof window.buildSlides === 'function') {
          window.buildSlides();
        }

        console.log('[index-api] ✓ Homepage actualizada con datos reales');
      })
      .catch(function (err) {
        console.warn('[index-api] Fallback a datos locales:', err.message);
        // No hacer nada — PL ya tiene los datos hardcodeados
      });
  }

  // ── Cargar datos del mapa desde endpoint especializado ──────
  function cargarMapa() {
    fetch('/api/destinos?modo=mapa')
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (!data.ok || !data.data) return;

        // Reemplazar MAPA_PLACES con datos optimizados para el mapa
        window.MAPA_PLACES = data.data.map(function (d, i) {
          return {
            id:     i + 1,
            slug:   d.slug,
            name:   d.nombre,
            cat:    d.categoria_slug,
            city:   d.ciudad || '',
            rating: parseFloat(d.rating) || 0,
            emoji:  d.emoji  || '📍',
            lat:    parseFloat(d.lat) || 0,
            lng:    parseFloat(d.lng) || 0,
          };
        });

        // Refrescar marcadores
        if (typeof window.updateMMMarkers === 'function') {
          window.updateMMMarkers();
        }
        recargarMapaPrincipal();
      })
      .catch(function () {});
  }

  // ── Re-dibujar el mapa principal con los nuevos datos ───────
  function recargarMapaPrincipal() {
    var mapaMap = window.mapaMap;
    if (!mapaMap || typeof L === 'undefined') return;
    if (!window.MAPA_PLACES || !window.MAPA_PLACES.length) return;

    // Colores por categoría
    var CAT_COLOR = {
      hostal: '#3B82F6',
      comida: '#EF4444',
      sitio:  '#8B5CF6',
      evento: '#F59E0B',
    };

    // Limpiar marcadores viejos si existen
    if (window._mapaMarkers) {
      window._mapaMarkers.forEach(function (m) { m.remove(); });
    }
    window._mapaMarkers = [];

    window.MAPA_PLACES.forEach(function (p) {
      if (!p.lat || !p.lng) return;
      var color = CAT_COLOR[p.cat] || '#E8A020';
      var icon = L.divIcon({
        html: '<div style="'
          + 'width:32px;height:32px;border-radius:50% 50% 50% 0;'
          + 'transform:rotate(-45deg);background:' + color + ';'
          + 'display:flex;align-items:center;justify-content:center;'
          + 'box-shadow:0 2px 8px rgba(0,0,0,.3);border:2px solid #fff'
          + '"><span style="transform:rotate(45deg);font-size:13px">'
          + (p.emoji || '📍')
          + '</span></div>',
        iconSize:   [32, 32],
        iconAnchor: [16, 32],
        className:  '',
      });

      var marker = L.marker([p.lat, p.lng], { icon: icon })
        .addTo(mapaMap)
        .bindPopup(
          '<div style="min-width:160px;font-family:sans-serif">'
          + '<div style="font-weight:700;font-size:13px;margin-bottom:4px">' + p.name + '</div>'
          + '<div style="font-size:11px;color:#888;margin-bottom:8px">📍 ' + p.city + '</div>'
          + (p.rating ? '<div style="color:#E8A020;font-size:12px;margin-bottom:8px">★ ' + p.rating + '</div>' : '')
          + '<a href="' + p.slug + '.html" style="'
          + 'display:block;text-align:center;background:#E8A020;color:#000;'
          + 'padding:5px 10px;border-radius:5px;text-decoration:none;'
          + 'font-size:11px;font-weight:700'
          + '">Ver detalles →</a>'
          + '</div>'
        );

      window._mapaMarkers.push(marker);
    });
  }

  // ── Inicializar ─────────────────────────────────────────────
  function init() {
    // Cargar destinos para las tarjetas (prioridad)
    cargarDestinos();

    // Cargar datos del mapa (después de 500ms para no bloquear)
    setTimeout(cargarMapa, 500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      setTimeout(init, 200);
    });
  } else {
    setTimeout(init, 200);
  }

})();
