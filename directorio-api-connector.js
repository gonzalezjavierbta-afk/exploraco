// directorio-api-connector.js  v7 — completo y definitivo
// Variables confirmadas: PLACES[], PHOTOS{}, FEAT[], PL[]
// Función de render: renderDir()
// Detecta categoría por URL o window.DIR_CAT

(function () {
  'use strict';

  var CAT_COLORS = {
    hostal: 'linear-gradient(135deg,#1a3a5c,#2a4a7c)',
    comida: 'linear-gradient(135deg,#3a1a0a,#4a2a1a)',
    sitio:  'linear-gradient(135deg,#0a2a1a,#1a3a2a)',
    evento: 'linear-gradient(135deg,#1a051a,#3a1a3a)',
  };

  function detectCat() {
    if (window.DIR_CAT) return window.DIR_CAT;
    var p = location.pathname.toLowerCase();
    if (p.includes('hostal'))  return 'hostal';
    if (p.includes('comida'))  return 'comida';
    if (p.includes('sitio'))   return 'sitio';
    if (p.includes('evento'))  return 'evento';
    return null;
  }

  function toPlace(item, idx) {
    var foto = item.foto
      || (item.photos && item.photos[0] ? item.photos[0].url : '')
      || '';
    return {
      id:          idx + 1,
      _uuid:       item.id,
      slug:        item.slug        || '',
      name:        item.name        || '',
      cat:         item.cat         || 'sitio',
      city:        item.city        || '',
      region:      item.region      || '',
      barrio:      item.barrio      || '',
      address:     '',
      lead:        item.lead        || '',
      desc:        item.desc        || item.lead || '',
      highlight:   item.highlight   || '',
      price:       item.price       || '',
      emoji:       item.emoji       || '📍',
      hero_bg:     item.hero_bg     || CAT_COLORS[item.cat] || CAT_COLORS.sitio,
      rating:      item.rating      || 0,
      rev:         item.reviews     || 0,
      whatsapp:    item.whatsapp    || '',
      tel:         item.tel         || '',
      email:       item.email       || '',
      web:         item.web         || '',
      instagram:   item.instagram   || '',
      booking:     item.booking     || '',
      hostelworld: item.hostelworld || '',
      airbnb:      item.airbnb      || '',
      tipo:        item.tipo        || '',
      horario:     item.horario     || '',
      capacidad:   item.capacidad   || '',
      lat:         item.lat         || 0,
      lng:         item.lng         || 0,
      photos:      foto ? [{ type: 'photo', url: foto, cap: item.name || '' }] : [],
      amenities:   item.amenities   || [],
      habs:        item.habs        || [],
      faqs:        item.faqs        || [],
      scores:      {},
      status:      'published',
      destacado:   item.destacado   || false,
    };
  }

  function replArr(name, newArr) {
    if (typeof window[name] !== 'undefined' && Array.isArray(window[name])) {
      window[name].length = 0;
      newArr.forEach(function (i) { window[name].push(i); });
    } else {
      window[name] = newArr;
    }
  }

  function replObj(name, newObj) {
    if (typeof window[name] !== 'undefined' && typeof window[name] === 'object') {
      Object.keys(window[name]).forEach(function (k) { delete window[name][k]; });
      Object.keys(newObj).forEach(function (k) { window[name][k] = newObj[k]; });
    } else {
      window[name] = newObj;
    }
  }

  // ── BÚSQUEDA EN DIRECTORIO ─────────────────────────────────────
  var searchTimer = null;

  function setupSearch(cat) {
    // El directorio usa fSearch — buscar el input
    var inputs = [
      document.getElementById('dir-search'),
      document.getElementById('search-input'),
      document.querySelector('input[type="search"]'),
      document.querySelector('.dir-search input'),
      document.querySelector('#dir-filters input[type="text"]'),
    ].filter(Boolean);

    inputs.forEach(function (inp) {
      inp.addEventListener('input', function (e) {
        var q = e.target.value.trim();
        // Actualizar variable fSearch si existe
        if (typeof window.fSearch !== 'undefined') window.fSearch = q;
        // Re-render local inmediato (ya tenemos todos en PLACES)
        if (typeof renderDir === 'function') renderDir();
      });
    });
  }

  function loadDirectorio() {
    var cat = detectCat();
    var url = '/api/destinos?limit=500&_t=' + Date.now() + (cat ? '&categoria=' + encodeURIComponent(cat) : '');

    fetch(url)
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (!d.ok || !d.data || !d.data.length) {
          console.warn('[directorio-api] sin datos:', d.error || url);
          return;
        }

        var apiData = d.data;
        var lugares = apiData.map(toPlace);

        // PLACES[] — variable principal del directorio
        replArr('PLACES', lugares);

        // PHOTOS{} — imágenes por id numérico
        var nuevosPhotos = {};
        lugares.forEach(function (p) {
          if (p.photos && p.photos[0] && p.photos[0].url) {
            nuevosPhotos[p.id] = p.photos[0].url;
          }
        });
        replObj('PHOTOS', nuevosPhotos);

        // FEAT[] — ids destacados
        var featIds = lugares
          .filter(function (p) { return p.destacado; })
          .map(function (p) { return p.id; });
        if (!featIds.length) {
          featIds = lugares.slice()
            .sort(function (a, b) { return b.rating - a.rating; })
            .slice(0, 10)
            .map(function (p) { return p.id; });
        }
        replArr('FEAT', featIds);

        // PL[] — compatibilidad (algunos directorios también la usan)
        replArr('PL', lugares);
        // DEST_FEATURED_IDS[] — alias
        replArr('DEST_FEATURED_IDS', featIds);
        // DEST_PHOTOS{} — alias
        replObj('DEST_PHOTOS', nuevosPhotos);

        // Actualizar contador del header si existe
        var contadores = document.querySelectorAll('.dir-count, [data-dir-count], .dir-total');
        contadores.forEach(function (el) {
          el.textContent = d.total || lugares.length;
        });

        console.log('[directorio-api] ✓ ' + lugares.length + ' lugares'
          + (cat ? ' (cat:' + cat + ')' : ''));

        // Re-render
        if      (typeof renderDir   === 'function') renderDir();
        else if (typeof renderCards === 'function') renderCards();
        else if (typeof render      === 'function') render();

        // Activar búsqueda
        setupSearch(cat);
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
