// directorio-api-connector.js  v4
// Se incluye al final de cada directorio HTML:
//   directorio-hostal.html, directorio-comida.html,
//   directorio-sitio.html,  directorio-evento.html
//
// Detecta automáticamente la categoría por la URL o por window.DIR_CAT
// Reemplaza PL[], FOTOS{} y FEAT[] con datos reales de /api/destinos

(function() {
  'use strict';

  var API = '/api/destinos';

  // ── Detectar categoría desde URL o variable global ───────────────
  function detectarCategoria() {
    // 1. Variable explícita en el HTML: <script>window.DIR_CAT='hostal'</script>
    if (window.DIR_CAT) return window.DIR_CAT;

    // 2. Por nombre del archivo en la URL
    var path = window.location.pathname.toLowerCase();
    if (path.includes('hostal'))  return 'hostal';
    if (path.includes('comida'))  return 'comida';
    if (path.includes('sitio'))   return 'sitio';
    if (path.includes('evento'))  return 'evento';

    return null;  // Sin filtro → todos
  }

  // ── Convertir al formato PL[] que usan los directorios ───────────
  function toPlaceFormat(d) {
    return {
      id:        d.id,
      slug:      d.slug,
      name:      d.name,
      cat:       d.cat,
      city:      d.city,
      region:    d.region     || '',
      barrio:    d.barrio     || '',
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
      hostelworld:d.hostelworld || '',
      airbnb:    d.airbnb     || '',
      tipo:      d.tipo       || '',
      horario:   d.horario    || '',
      capacidad: d.capacidad  || '',
      photos:    d.photos     || [],
      amenities: d.amenities  || [],
      habs:      d.habs       || [],
      faqs:      d.faqs       || [],
    };
  }

  // ── Construir FOTOS{} — mapa de slug → array de fotos ───────────
  function buildFotos(lugares) {
    var fotos = {};
    lugares.forEach(function(p) {
      if (p.photos && p.photos.length > 0) {
        fotos[p.slug] = p.photos.map(function(f) {
          return typeof f === 'string' ? f : (f.url || '');
        });
      }
    });
    return fotos;
  }

  // ── Construir FEAT[] — lugares destacados ────────────────────────
  function buildFeat(lugares) {
    return lugares.filter(function(p) { return p.destacado; });
  }

  // ── Actualizar contador del header del directorio ────────────────
  function updateCounter(total, cat) {
    var labels = {
      hostal: 'hospedajes',
      comida: 'restaurantes y cafés',
      sitio:  'sitios turísticos',
      evento: 'eventos',
    };
    var label = labels[cat] || 'destinos';

    // Buscar elementos con clase o data-attr de contador
    document.querySelectorAll('.dir-count, [data-dir-count]').forEach(function(el) {
      el.textContent = total + ' ' + label;
    });
    document.querySelectorAll('.dir-total').forEach(function(el) {
      el.textContent = total;
    });
  }

  // ── Re-render: llamar funciones del directorio si existen ────────
  function reinitDir(lugares, cat) {
    if (typeof window.renderDir      === 'function') window.renderDir();
    if (typeof window.renderCards    === 'function') window.renderCards();
    if (typeof window.renderGrid     === 'function') window.renderGrid();
    if (typeof window.initFilters    === 'function') window.initFilters();
    if (typeof window.filterByCity   === 'function') window.filterByCity('all');
    if (typeof window.initSort       === 'function') window.initSort();
  }

  // ── Mostrar skeleton mientras carga ─────────────────────────────
  function showSkeleton() {
    var grid = document.querySelector('.dir-grid, .cards-grid, #dir-cards, #cards-container');
    if (!grid || grid.children.length > 0) return;
    var sk = '';
    for (var i = 0; i < 6; i++) {
      sk += '<div class="card-skeleton" style="height:280px;background:#f0f0f0;border-radius:12px;animation:pulse 1.5s infinite"></div>';
    }
    grid.innerHTML = sk;
    if (!document.getElementById('sk-style')) {
      var style = document.createElement('style');
      style.id = 'sk-style';
      style.textContent = '@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}';
      document.head.appendChild(style);
    }
  }

  // ── Fetch y actualizar ───────────────────────────────────────────
  function loadDirectorio() {
    var cat = detectarCategoria();
    var url = API + '?limit=500' + (cat ? '&categoria=' + cat : '');

    showSkeleton();

    fetch(url)
      .then(function(r) { return r.json(); })
      .then(function(res) {
        if (!res.ok || !res.data) {
          console.warn('[directorio-api] Sin datos:', url);
          return;
        }

        var lugares = res.data.map(toPlaceFormat);

        // Reemplazar arrays globales
        window.PL   = lugares;
        window.FOTOS = buildFotos(lugares);
        window.FEAT  = buildFeat(lugares);

        // Actualizar contador
        updateCounter(res.total || lugares.length, cat);

        console.log('[directorio-api] ' + lugares.length + ' lugares cargados' + (cat ? ' (cat: ' + cat + ')' : ''));

        // Re-render
        reinitDir(lugares, cat);
      })
      .catch(function(e) {
        console.warn('[directorio-api] Error:', e.message);
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadDirectorio);
  } else {
    loadDirectorio();
  }

})();
