// directorio-api-connector.js  v6 — variables exactas confirmadas del directorio real
// directorio usa: PLACES (no PL), PHOTOS (no FOTOS/DEST_PHOTOS), FEAT[]
// renderDir() filtra PLACES con getFiltered() y lee PHOTOS[p.id]

(function () {
  var CAT_COLORS = {
    hostal: 'linear-gradient(135deg,#1a3a5c,#2a4a7c)',
    comida: 'linear-gradient(135deg,#3a1a0a,#4a2a1a)',
    sitio:  'linear-gradient(135deg,#0a2a1a,#1a3a2a)',
    evento: 'linear-gradient(135deg,#1a051a,#3a1a3a)',
  };

  // Detectar categoría por URL
  function detectCat() {
    var path = location.pathname.toLowerCase();
    if (path.includes('hostal'))  return 'hostal';
    if (path.includes('comida'))  return 'comida';
    if (path.includes('sitio'))   return 'sitio';
    if (path.includes('evento'))  return 'evento';
    return null;
  }

  // Formato exacto que usa renderDir()
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
      tipo:      item.tipo       || '',
      horario:   item.horario    || '',
      lat:       item.lat        || 0,
      lng:       item.lng        || 0,
      photos:    foto ? [{ type: 'photo', url: foto, cap: item.name || '' }] : [],
      amenities: item.amenities  || [],
      habs:      item.habs       || [],
      faqs:      item.faqs       || [],
      scores:    {},
      status:    'published',
      destacado: item.destacado  || false,
    };
  }

  function loadDirectorio() {
    var cat = detectCat();
    var url = '/api/destinos?limit=500' + (cat ? '&categoria=' + cat : '');

    fetch(url)
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (!d.ok || !d.data || !d.data.length) {
          console.warn('[directorio-api] sin datos:', d.error || url);
          return;
        }

        var apiData = d.data;
        var lugares = apiData.map(toPlace);

        // ── PLACES[] — variable que usa getFiltered() y renderDir() ──
        if (typeof PLACES !== 'undefined') {
          PLACES.length = 0;
          lugares.forEach(function (p) { PLACES.push(p); });
        } else {
          window.PLACES = lugares;
        }

        // ── PHOTOS{} — variable que usa renderDir() para las imágenes ──
        if (typeof PHOTOS !== 'undefined') {
          // Limpiar y rellenar
          Object.keys(PHOTOS).forEach(function (k) { delete PHOTOS[k]; });
          lugares.forEach(function (p) {
            if (p.photos && p.photos[0] && p.photos[0].url) {
              PHOTOS[p.id] = p.photos[0].url;
            }
          });
        } else {
          window.PHOTOS = {};
          lugares.forEach(function (p) {
            if (p.photos && p.photos[0] && p.photos[0].url) {
              window.PHOTOS[p.id] = p.photos[0].url;
            }
          });
        }

        // ── FEAT[] — destacados por id ────────────────────────────────
        var featIds = lugares
          .filter(function (p) { return p.destacado; })
          .map(function (p) { return p.id; });
        if (!featIds.length) {
          featIds = lugares.slice()
            .sort(function (a, b) { return b.rating - a.rating; })
            .slice(0, 10)
            .map(function (p) { return p.id; });
        }
        if (typeof FEAT !== 'undefined') {
          FEAT.length = 0;
          featIds.forEach(function (id) { FEAT.push(id); });
        } else {
          window.FEAT = featIds;
        }

        // ── PL[] también (por compatibilidad) ────────────────────────
        if (typeof PL !== 'undefined') {
          PL.length = 0;
          lugares.forEach(function (p) { PL.push(p); });
        }

        console.log('[directorio-api] ✓ ' + lugares.length + ' lugares' + (cat ? ' (cat:' + cat + ')' : ''));

        // ── Re-render ─────────────────────────────────────────────────
        if (typeof renderDir   === 'function') renderDir();
        else if (typeof render === 'function') render();
      })
      .catch(function (e) {
        console.warn('[directorio-api] Error:', e.message);
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(loadDirectorio, 200); });
  } else {
    setTimeout(loadDirectorio, 200);
  }
}());
