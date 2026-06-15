// directorio-api-connector.js  v5
// Formato exacto que usan los directorios generados por el admin:
//   PL[]:   id(num), rev(num), photos[]{type,url,cap}, hero_bg, emoji
//   FOTOS{}: { id_numerico: 'url_string' }  — alias de DEST_PHOTOS en index
//   FEAT[]:  array de ids numéricos destacados
//   Función de render: renderDir() o renderCards()

(function() {
  'use strict';

  var CAT_COLORS = {
    hostal: 'linear-gradient(135deg,#1a3a5c,#2a4a7c)',
    comida: 'linear-gradient(135deg,#3a1a0a,#4a2a1a)',
    sitio:  'linear-gradient(135deg,#0a2a1a,#1a3a2a)',
    evento: 'linear-gradient(135deg,#1a051a,#3a1a3a)',
  };

  // Detectar categoría del directorio actual
  function detectarCat() {
    if (window.DIR_CAT) return window.DIR_CAT;
    var path = window.location.pathname.toLowerCase();
    if (path.includes('hostal'))  return 'hostal';
    if (path.includes('comida'))  return 'comida';
    if (path.includes('sitio'))   return 'sitio';
    if (path.includes('evento'))  return 'evento';
    return null;
  }

  // Formato EXACTO de PL[] que genera el admin para los directorios
  function toPlaceFormat(d, idx) {
    var foto = d.foto || (d.photos && d.photos[0] ? d.photos[0].url : '') || '';
    var photos = foto ? [{ type:'photo', url: foto, cap: d.name || '' }] : [];

    return {
      id:        idx + 1,
      _uuid:     d.id,
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
      rev:       d.reviews    || 0,   // "rev" no "reviews"
      whatsapp:  d.whatsapp   || '',
      tel:       d.tel        || '',
      email:     d.email      || '',
      web:       d.web        || '',
      instagram: d.instagram  || '',
      booking:   d.booking    || '',
      hostelworld: d.hostelworld || '',
      airbnb:    d.airbnb     || '',
      tipo:      d.tipo       || '',
      horario:   d.horario    || '',
      capacidad: d.capacidad  || '',
      lat:       d.lat        || 0,
      lng:       d.lng        || 0,
      photos:    photos,
      amenities: d.amenities  || [],
      habs:      d.habs       || [],
      faqs:      d.faqs       || [],
      scores:    {},
      status:    'published',
      destacado: d.destacado  || false,
    };
  }

  // Construye FOTOS{ id_numerico: url } — igual que DEST_PHOTOS en el index
  function buildFotos(lugares) {
    var fotos = {};
    lugares.forEach(function(p) {
      if (p.photos && p.photos.length > 0 && p.photos[0].url) {
        fotos[p.id] = p.photos[0].url;
      }
    });
    return fotos;
  }

  // FEAT[] — ids de los destacados
  function buildFeat(lugares) {
    var featIds = lugares.filter(function(p) { return p.destacado; }).map(function(p) { return p.id; });
    if (!featIds.length) {
      // Sin destacados: usar los 5 con mejor rating
      featIds = lugares.slice().sort(function(a,b){ return b.rating - a.rating; })
        .slice(0, 5).map(function(p){ return p.id; });
    }
    return featIds;
  }

  // Actualizar contador del header del directorio
  function updateCounter(total, cat) {
    var labels = { hostal:'hospedajes', comida:'restaurantes y cafés', sitio:'sitios turísticos', evento:'eventos' };
    var label  = labels[cat] || 'destinos';
    // Buscar por clase o data-attr
    document.querySelectorAll('.dir-count, [data-dir-count], .dir-total').forEach(function(el) {
      if (el.classList.contains('dir-total')) el.textContent = total;
      else el.textContent = total + ' ' + label;
    });
  }

  // Re-renderizar el directorio
  function reinitDir() {
    if (typeof window.renderDir   === 'function') { window.renderDir();   return; }
    if (typeof window.renderCards === 'function') { window.renderCards(); return; }
    if (typeof window.renderGrid  === 'function') { window.renderGrid();  return; }
    if (typeof window.render      === 'function') { window.render();      return; }
    // Fallback: disparar evento
    document.dispatchEvent(new CustomEvent('exploraco:reload'));
  }

  // Mostrar skeleton mientras carga
  function showSkeleton() {
    var grid = document.querySelector('#dir-grid, .dir-grid, #cards-container, .cards-grid');
    if (!grid || grid.children.length > 2) return;
    var sk = '';
    for (var i = 0; i < 6; i++) {
      sk += '<div style="height:280px;background:#f0f0f0;border-radius:12px;animation:pulse 1.5s ease-in-out infinite"></div>';
    }
    grid.innerHTML = sk;
    if (!document.getElementById('sk-css')) {
      var s = document.createElement('style');
      s.id = 'sk-css';
      s.textContent = '@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}';
      document.head.appendChild(s);
    }
  }

  // ── Fetch y actualizar ──────────────────────────────────────────
  function loadDirectorio() {
    var cat = detectarCat();
    var url = '/api/destinos?limit=500' + (cat ? '&categoria=' + encodeURIComponent(cat) : '');

    showSkeleton();

    fetch(url)
      .then(function(r) { return r.json(); })
      .then(function(res) {
        if (!res.ok || !res.data) {
          console.warn('[directorio-api] Sin datos:', url, res);
          return;
        }

        // Convertir al formato exacto de PL[]
        var lugares = res.data.map(toPlaceFormat);

        // Actualizar PL[] — puede ser const en directorios generados
        if (typeof PL !== 'undefined') {
          PL.length = 0;
          lugares.forEach(function(p) { PL.push(p); });
        } else {
          window.PL = lugares;
        }

        // FOTOS{}
        var fotos = buildFotos(lugares);
        if (typeof FOTOS !== 'undefined') {
          Object.keys(FOTOS).forEach(function(k) { delete FOTOS[k]; });
          Object.assign(FOTOS, fotos);
        } else {
          window.FOTOS = fotos;
        }
        // Alias DEST_PHOTOS por si el directorio lo usa con ese nombre
        if (typeof DEST_PHOTOS !== 'undefined') {
          Object.keys(DEST_PHOTOS).forEach(function(k) { delete DEST_PHOTOS[k]; });
          Object.assign(DEST_PHOTOS, fotos);
        } else {
          window.DEST_PHOTOS = fotos;
        }

        // FEAT[]
        var feat = buildFeat(lugares);
        if (typeof FEAT !== 'undefined') {
          FEAT.length = 0;
          feat.forEach(function(id) { FEAT.push(id); });
        } else {
          window.FEAT = feat;
        }
        // Alias DEST_FEATURED_IDS
        if (typeof DEST_FEATURED_IDS !== 'undefined') {
          DEST_FEATURED_IDS.length = 0;
          feat.forEach(function(id) { DEST_FEATURED_IDS.push(id); });
        } else {
          window.DEST_FEATURED_IDS = feat;
        }

        // Contador
        updateCounter(res.total || lugares.length, cat);

        console.log('[directorio-api] ' + lugares.length + ' lugares cargados' + (cat ? ' (cat:' + cat + ')' : ''));

        // Re-render
        reinitDir();
      })
      .catch(function(e) {
        console.warn('[directorio-api] Error:', e.message);
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { setTimeout(loadDirectorio, 100); });
  } else {
    setTimeout(loadDirectorio, 100);
  }

})();
