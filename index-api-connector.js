// index-api-connector.js  v6 — formato confirmado del index.html real
// PL[]: id(num), rev(num), photos[{type,url,cap}], hero_bg, emoji, scores{}
// DEST_PHOTOS{}: { id_num: 'url' }
// DEST_FEATURED_IDS[]: ids numéricos
// MAPA_PLACES[]: id,slug,name,cat,city,region,rating,emoji,lat,lng,lead,price,hero_bg
// Stats IDs: #stat-destinos, #stat-resenas, #stat-ciudades, #stat-rating
// Render fn: renderDest(), initMapaSection()

(function () {
  'use strict';

  var CAT_COLORS = {
    hostal: 'linear-gradient(135deg,#1a3a5c,#2a4a7c)',
    comida: 'linear-gradient(135deg,#3a1a0a,#4a2a1a)',
    sitio:  'linear-gradient(135deg,#0a2a1a,#1a3a2a)',
    evento: 'linear-gradient(135deg,#1a051a,#3a1a3a)',
  };

  // Formato EXACTO de PL[] del index.html
  function toPlace(d, idx) {
    var foto = d.foto || (d.photos && d.photos[0] ? d.photos[0].url : '') || '';
    return {
      id:        idx + 1,          // numérico secuencial — renderDest lo necesita
      _uuid:     d.id,             // UUID Neon — para operaciones DB
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
      rev:       d.reviews    || 0,  // ← "rev" no "reviews"
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
      photos:    foto ? [{ type: 'photo', url: foto, cap: d.name || '' }] : [],
      scores:    {},
      status:    'published',
      destacado: d.destacado  || false,
    };
  }

  // Formato EXACTO de MAPA_PLACES[] — sin campo color
  function toMapPlace(d, idx) {
    return {
      id:      idx + 1,
      slug:    d.slug     || '',
      name:    d.name     || '',
      cat:     d.cat      || 'sitio',
      city:    d.city     || '',
      region:  d.region   || '',
      rating:  d.rating   || 0,
      emoji:   d.emoji    || '📍',
      lat:     parseFloat(d.lat) || 0,
      lng:     parseFloat(d.lng) || 0,
      lead:    d.lead     || '',
      price:   d.price    || '',
      hero_bg: d.hero_bg  || CAT_COLORS[d.cat] || CAT_COLORS.sitio,
    };
  }

  // Actualizar stats con IDs exactos añadidos al HTML
  function updateStats(stats) {
    var elDest = document.getElementById('stat-destinos');
    var elRes  = document.getElementById('stat-resenas');
    var elCiud = document.getElementById('stat-ciudades');
    var elRat  = document.getElementById('stat-rating');

    if (elDest && stats.destinos) elDest.textContent = stats.destinos;
    if (elCiud && stats.ciudades) elCiud.textContent = stats.ciudades;
    if (elRes  && stats.resenas) {
      elRes.textContent = stats.resenas >= 1000
        ? (stats.resenas / 1000).toFixed(1) + 'K'
        : stats.resenas;
    }
    if (elRat && stats.rating) elRat.textContent = stats.rating + '★';
  }

  // Reemplazar array existente sin romper referencias
  function replaceArray(arrName, newArr) {
    if (typeof window[arrName] !== 'undefined' && Array.isArray(window[arrName])) {
      window[arrName].length = 0;
      newArr.forEach(function (item) { window[arrName].push(item); });
    } else {
      window[arrName] = newArr;
    }
  }

  // Reemplazar objeto sin romper referencias
  function replaceObj(objName, newObj) {
    if (typeof window[objName] !== 'undefined' && typeof window[objName] === 'object') {
      Object.keys(window[objName]).forEach(function (k) { delete window[objName][k]; });
      Object.keys(newObj).forEach(function (k) { window[objName][k] = newObj[k]; });
    } else {
      window[objName] = newObj;
    }
  }

  function loadIndex() {
    fetch('/api/destinos?limit=500')
      .then(function (r) { return r.json(); })
      .then(function (res) {
        if (!res.ok || !Array.isArray(res.data) || !res.data.length) {
          console.warn('[index-api] Sin datos:', res.error || 'vacío');
          return;
        }

        var apiData = res.data;

        // 1. PL[] en formato exacto con ids numéricos
        var nuevoPL = apiData.map(toPlace);

        // 2. DEST_PHOTOS{ id_num: url }
        var nuevasPhotos = {};
        nuevoPL.forEach(function (p) {
          if (p.photos && p.photos[0]) nuevasPhotos[p.id] = p.photos[0].url;
        });

        // 3. MAPA_PLACES[] — solo con coords válidas
        var nuevoMapa = apiData
          .filter(function (d) { return d.lat && d.lng && d.lat !== 0 && d.lng !== 0; })
          .map(function (d) {
            var idx = apiData.indexOf(d);
            return toMapPlace(d, idx);
          });

        // 4. DEST_FEATURED_IDS[] — destacados primero, luego mejor rating
        var featIds = nuevoPL
          .filter(function (p) { return p.destacado; })
          .map(function (p) { return p.id; });
        if (!featIds.length) {
          featIds = nuevoPL
            .slice()
            .sort(function (a, b) { return b.rating - a.rating; })
            .slice(0, 10)
            .map(function (p) { return p.id; });
        }

        // 5. Aplicar al DOM global
        replaceArray('PL',                nuevoPL);
        replaceObj(  'DEST_PHOTOS',       nuevasPhotos);
        replaceArray('MAPA_PLACES',       nuevoMapa);
        replaceArray('DEST_FEATURED_IDS', featIds);

        // 6. Stats reales
        if (res.stats) updateStats(res.stats);

        console.log('[index-api] ✓ ' + nuevoPL.length + ' destinos | ' + nuevoMapa.length + ' markers');

        // 7. Re-render
        if (typeof renderDest       === 'function') renderDest();
        if (typeof initMapaSection  === 'function') initMapaSection();

      })
      .catch(function (e) {
        console.warn('[index-api] Error fetch:', e.message);
      });
  }

  // Cargar después de que el JS inline del index esté listo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(loadIndex, 150); });
  } else {
    setTimeout(loadIndex, 150);
  }

}());
