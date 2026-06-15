// index-api-connector.js  v7 — código exacto confirmado funcional en consola
(function () {
  var CAT_COLORS = {
    hostal: 'linear-gradient(135deg,#1a3a5c,#2a4a7c)',
    comida: 'linear-gradient(135deg,#3a1a0a,#4a2a1a)',
    sitio:  'linear-gradient(135deg,#0a2a1a,#1a3a2a)',
    evento: 'linear-gradient(135deg,#1a051a,#3a1a3a)',
  };

  function loadAndRender() {
    fetch('/api/destinos?limit=500')
      .then(function(r) { return r.json(); })
      .then(function(d) {
        if (!d.ok || !d.data || !d.data.length) {
          console.warn('[index-api] sin datos:', d.error || 'vacío');
          return;
        }

        var apiData = d.data;

        // ── Reemplazar PL[] ─────────────────────────────────────────
        PL.length = 0;
        apiData.forEach(function(item, i) {
          var foto = item.foto
            || (item.photos && item.photos[0] ? item.photos[0].url : '')
            || '';
          PL.push({
            id:        i + 1,
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
          });
          // DEST_PHOTOS{ id_num: url }
          if (foto) DEST_PHOTOS[i + 1] = foto;
        });

        // ── DEST_FEATURED_IDS[] ─────────────────────────────────────
        var featIds = PL
          .filter(function(p) { return p.destacado; })
          .map(function(p) { return p.id; });
        if (!featIds.length) {
          featIds = PL.slice()
            .sort(function(a, b) { return b.rating - a.rating; })
            .slice(0, 10)
            .map(function(p) { return p.id; });
        }
        DEST_FEATURED_IDS.length = 0;
        featIds.forEach(function(id) { DEST_FEATURED_IDS.push(id); });

        // ── MAPA_PLACES[] ───────────────────────────────────────────
        MAPA_PLACES.length = 0;
        apiData.forEach(function(item, i) {
          if (!item.lat || !item.lng || item.lat === 0 || item.lng === 0) return;
          MAPA_PLACES.push({
            id:      i + 1,
            slug:    item.slug    || '',
            name:    item.name    || '',
            cat:     item.cat     || 'sitio',
            city:    item.city    || '',
            region:  item.region  || '',
            rating:  item.rating  || 0,
            emoji:   item.emoji   || '📍',
            lat:     parseFloat(item.lat),
            lng:     parseFloat(item.lng),
            lead:    item.lead    || '',
            price:   item.price   || '',
            hero_bg: item.hero_bg || CAT_COLORS[item.cat] || CAT_COLORS.sitio,
          });
        });

        // ── Stats reales ─────────────────────────────────────────────
        if (d.stats) {
          var el = function(id) { return document.getElementById(id); };
          if (el('stat-destinos')) el('stat-destinos').textContent = d.stats.destinos;
          if (el('stat-ciudades')) el('stat-ciudades').textContent = d.stats.ciudades;
          if (el('stat-resenas') && d.stats.resenas) {
            el('stat-resenas').textContent = d.stats.resenas >= 1000
              ? (d.stats.resenas / 1000).toFixed(1) + 'K'
              : d.stats.resenas;
          }
          if (el('stat-rating') && d.stats.rating) {
            el('stat-rating').textContent = d.stats.rating + '★';
          }
        }

        console.log('[index-api] ✓ ' + PL.length + ' destinos | ' + MAPA_PLACES.length + ' markers');

        // ── Re-render ────────────────────────────────────────────────
        if (typeof renderDest      === 'function') renderDest();
        if (typeof initMapaSection === 'function') initMapaSection();
      })
      .catch(function(e) {
        console.warn('[index-api] Error:', e.message);
      });
  }

  // Ejecutar después de que el JS inline del index esté listo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { setTimeout(loadAndRender, 200); });
  } else {
    setTimeout(loadAndRender, 200);
  }
}());
