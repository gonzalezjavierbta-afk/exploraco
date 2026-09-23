/* =============================================================
   mapa-cultural.js -- Motor compartido del Mapa Cultural ExploraCO
   Version 1.1.0. IIFE, ASCII-safe estricto, sin backticks.

   Porta a un modulo reusable el motor del mapa de index.html
   (pines, clustering por proximidad, capa multimedia y drawer
   lateral) para que lo consuma mymapa.js (comunidad.html) y, en una
   entrega posterior, el propio index.html.

   API PUBLICA (window.MapaCultural):
     version
     create(opts)  -> instancia (multi-instancia por pagina)
     init(opts)    -> instancia default; idempotente
     refresh, setPlaces, setMedia, setMediaEnabled, setMediaTypes,
     getMap, openDrawer, closeDrawer,
     normalizePlace, normalizeMedia, esc, starHtml,
     photoPlaceholderHTML, haversineKm
     (extras de apoyo a pruebas: clusterize, filterMediaDefault,
      filterMediaPropios)

   Instancia:
     { init, refresh, destroy, setPlaces, setMedia, setMediaEnabled,
       setMediaTypes, getMap, getState, openDrawer, closeDrawer,
       geolocate, resetColombia, fitBounds }

   Opciones index-compatibles (default = comportamiento comunidad):
     enableMediaOnAll (false): al seleccionar la categoria 'all' por clic
       de usuario se enciende la capa media (equivalente al index).
     mediaEnabled (false): estado inicial de la capa media.
     mediaFilter (null): null/undefined usa filterMediaDefault (estricto,
       comunidad); false desactiva el filtro y usa TODA la media (index,
       que pinta toda la capa). La seccion multimedia del drawer usa
       SIEMPRE st.media filtrada por filterMediaPropios: SOLO media con
       vinculo explicito al espacio (origen 'destino'/'destino_album' y
       origen_id === slug/uuid); sin cercania geografica.
     clusterLinksNavigate (false): true deja que "Ver" del popup de
       cluster navegue por href (index); false abre el drawer (comunidad).
     list: si se define, los items de la lista delegan en setActive
       (pan + drawer) como el index.

   Dependencias externas permitidas: Leaflet (window.L) y, con
   guard, las utilidades de sesion de window.ExploraCO.
   ============================================================= */
(function () {
  'use strict';

  var VERSION = '1.1.0';

  // Paleta de pines por categoria (paridad con index-api-connector.js
  // y refreshMapaMarkers de index.html).
  var PIN_COLORS = {
    hostal: '#2196F3',
    comida: '#FF9800',
    sitio: '#4CAF50',
    evento: '#A855F7'
  };

  // Emoji por categoria cuando la fila no trae uno propio (las filas
  // de tipo=mapa del backend NO traen emoji).
  var EMOJI_POR_CAT = {
    hostal: '\uD83D\uDECF\uFE0F',
    comida: '\uD83C\uDF7D\uFE0F',
    sitio: '\uD83C\uDF32',
    evento: '\uD83C\uDF89'
  };

  var PIN_DEFECTO = '\uD83D\uDCCD';
  var CAMARA = '\uD83D\uDCF7';
  var TOPE_MEDIA_PINS = 300;

  var TILE_VOYAGER = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
  var TILE_OSM = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
  var ATTR_VOYAGER = '&copy; OpenStreetMap &copy; CARTO';
  var ATTR_OSM = 'OSM';

  var GRAD_POR_DEFECTO = 'linear-gradient(135deg,#1a3a5c,#2a4a7c)';

  function has(o, k) { return Object.prototype.hasOwnProperty.call(o, k); }

  function log(msg, e) {
    if (typeof console !== 'undefined' && console.warn) {
      console.warn('[mapa-cultural] ' + msg, e || '');
    }
  }

  /* ---------- utilidades puras ---------- */

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function starHtml(n, cls) {
    var c = cls || 'rst';
    var s = '';
    for (var i = 1; i <= 5; i++) s += '<span class="' + c + (i <= Math.round(n) ? ' on' : '') + '">\u2605</span>';
    return s;
  }

  // Placeholder NEUTRO (nunca URL externa): emoji sobre el fondo del
  // contenedor padre. variant 'hero' => .md-hero-ph, resto => .photo-ph.
  function photoPlaceholderHTML(emoji, variant) {
    var e = emoji || PIN_DEFECTO;
    if (variant === 'hero') return '<div class="md-hero-ph">' + e + '</div>';
    return '<span class="photo-ph">' + e + '</span>';
  }

  function haversineKm(lat1, lng1, lat2, lng2) {
    var R = 6371;
    var dLat = (lat2 - lat1) * Math.PI / 180;
    var dLng = (lng2 - lng1) * Math.PI / 180;
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
      + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180)
      * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 10) / 10;
  }

  /* ---------- normalizacion unificada ---------- */

  function normalizeMedia(raw) {
    if (!raw) return null;
    var m = {};
    for (var k in raw) { if (has(raw, k)) m[k] = raw[k]; }
    m.key = (raw.id != null)
      ? String(raw.id)
      : String(raw.origen || '') + ':' + String(raw.origen_id || '') + ':' + String(raw.media_url || '');
    return m;
  }

  function normalizePlace(raw) {
    if (!raw) return null;
    var cat = raw.categoria_slug || raw.cat || '';
    var lat = Number(raw.lat), lng = Number(raw.lng);
    if (!isFinite(lat) || !isFinite(lng)) return null;

    var key = (raw.id != null) ? raw.id : (raw.destino_id || raw._uuid || raw.slug || null);
    if (key == null) return null;

    var fotos = [];
    var rawPhotos = raw.photos || [];
    for (var i = 0; i < rawPhotos.length; i++) {
      var ph = rawPhotos[i];
      if (!ph) continue;
      if (typeof ph === 'string') fotos.push({ url: ph, cap: '' });
      else fotos.push({ url: ph.url || '', cap: ph.cap || ph.caption || '' });
    }

    var foto = raw.foto_hero || raw.foto
      || (raw.photos && raw.photos[0] && (raw.photos[0].url || (typeof raw.photos[0] === 'string' ? raw.photos[0] : '')))
      || '';

    return {
      _mcPlace: true,
      key: key,
      uuid: raw._uuid || raw.destino_id || raw.uuid || null,
      slug: raw.slug || '',
      nombre: raw.nombre || raw.name || 'Destino',
      cat: cat,
      subcat: raw.subcategoria || '',
      ciudad: raw.ciudad || raw.city || '',
      region: raw.region || '',
      lat: lat,
      lng: lng,
      // Importante: las filas tipo=mapa NO traen rating; default 0.
      rating: Number(raw.rating) || 0,
      emoji: raw.emoji || EMOJI_POR_CAT[cat] || PIN_DEFECTO,
      color: raw.color || PIN_COLORS[cat] || '#E8A020',
      heroBg: raw.hero_bg || '',
      foto: foto,
      fotos: fotos.slice(0, 8),
      lead: raw.lead || '',
      price: raw.price || '',
      raw: raw
    };
  }

  function asPlace(p) {
    if (!p) return null;
    return p._mcPlace ? p : normalizePlace(p);
  }

  /* ---------- capa de media: filtro default ---------- */

  // Filtro default de la capa multimedia del mapa: SOLO items con
  // origen 'destino' o 'destino_album' cuyo origen_id (que el backend
  // emite como SLUG) coincide con el slug de algun place activo.
  // Se EXCLUYE SIEMPRE origen 'album' porque un album de usuario no
  // tiene vinculo directo al destino activo (decision de producto).
  function filterMediaDefault(items, places) {
    var slugs = {};
    (places || []).forEach(function (p) {
      if (p && p.slug) slugs[p.slug] = true;
    });
    return (items || []).filter(function (it) {
      if (!it || !it.media_url) return false;
      if (it.origen === 'album') return false;
      if (it.origen === 'destino' || it.origen === 'destino_album') {
        return !!(it.origen_id && slugs[it.origen_id]);
      }
      return false;
    });
  }

  // Filtro de los medios que muestra el drawer de un espacio:
  // SOLO media con vinculo explicito al propio espacio: origen
  // 'destino' / 'destino_album' cuyo origen_id coincide con el
  // slug/uuid del lugar (fotos curadas de su ficha y su album).
  // Los videos/audios de comunidad (origen 'album') NO se muestran
  // en el drawer: la cercania geografica (misma ciudad o <=10 km)
  // se descarto porque adjuntaba media de otros lugares a cualquier
  // pin de la ciudad (p.ej. todos los videos de Bogota en el pin de
  // r10). La capa del mapa sigue mostrando esos pines en su lugar.
  // Puro: testeable sin mapa.
  function filterMediaPropios(items, place) {
    var slug = String((place && place.slug) || '');
    var uuid = String((place && (place.uuid || place._uuid)) || '');
    var vistos = {};
    var out = [];
    (items || []).forEach(function (it) {
      if (!it || !it.media_url) return;
      var propio = false;
      if (it.origen === 'destino' || it.origen === 'destino_album') {
        var oid = String(it.origen_id || '');
        propio = !!((slug && oid === slug) || (uuid && oid === uuid));
      }
      if (!propio) return;
      if (vistos[it.media_url]) return;
      vistos[it.media_url] = true;
      out.push(it);
    });
    return out;
  }

  /* ---------- clustering por proximidad de pixeles ---------- */

  // Agrupa places cuyo centroide este a <= cellSize px. projectFn
  // recibe (lat, lng) y devuelve {x, y} (Leaflet: map.project([lat,lng], z)).
  // Puro: no depende de Leaflet, por eso es testeable sin mapa.
  function clusterize(places, projectFn, cellSize) {
    var cs = cellSize || 40;
    var out = [];
    (places || []).forEach(function (p) {
      if (!p) return;
      var pt = projectFn(p.lat, p.lng);
      if (!pt) return;
      var joined = null;
      for (var i = 0; i < out.length; i++) {
        var cp = projectFn(out[i].lat, out[i].lng);
        var dx = cp.x - pt.x, dy = cp.y - pt.y;
        if (dx * dx + dy * dy <= cs * cs) { joined = out[i]; break; }
      }
      if (joined) {
        joined.lat = (joined.lat * joined.cnt + p.lat) / (joined.cnt + 1);
        joined.lng = (joined.lng * joined.cnt + p.lng) / (joined.cnt + 1);
        joined.cnt++;
        joined.keys.push(p.key);
      } else {
        out.push({ lat: p.lat, lng: p.lng, cnt: 1, keys: [p.key] });
      }
    });
    return out;
  }

  /* ---------- helpers de presentacion ---------- */

  function mdCatLabel(cat) {
    if (cat === 'hostal') return 'Hospedaje';
    if (cat === 'comida') return 'Comida';
    if (cat === 'sitio') return 'Sitio';
    if (cat === 'evento') return 'Evento';
    return 'Sitio';
  }

  // Etiquetas de subcategoria (mirror de SUBCAT_LABEL de pagina-destino.js,
  // ASCII-safe: tildes como escapes).
  function mdSubcatLabel(sc) {
    if (!sc) return '';
    var scMap = {
      'naturaleza': 'Naturaleza',
      'museo': 'Museo',
      'cultura': 'Cultura',
      'bar': 'Bar',
      'parque': 'Parque Urbano',
      'espacio-publico': 'Espacio P\u00fablico',
      'sitio-historico': 'Sitio Hist\u00f3rico',
      'religioso': 'Religioso',
      'aventura': 'Aventura',
      'restaurante': 'Restaurante',
      'cafe': 'Caf\u00e9',
      'gastrobar': 'Gastrobar',
      'comida-rapida': 'Comida R\u00e1pida',
      'dulces': 'Dulces',
      'concierto': 'Concierto',
      'festival': 'Festival',
      'teatro': 'Teatro',
      'exposicion': 'Exposici\u00f3n',
      'deporte': 'Deporte',
      'cine': 'Cine',
      'fiesta': 'Fiesta'
    };
    return scMap[sc] || sc;
  }

  function mdMediaBadge(tipo) {
    if (tipo === 'video') return 'Video';
    if (tipo === 'audio') return 'Audio';
    return 'Foto';
  }

  function mdCapMedia(titulo, autor, votos) {
    var c = titulo || '';
    if (autor) c += ' \u00b7 ' + autor;
    if (votos && votos > 0) c += ' \u2B50 ' + votos;
    return c;
  }

  // Solo acepta un gradiente CSS plano sin comillas (anti-inyeccion).
  function mdHeroBgSafe(bg, fallback) {
    if (typeof bg === 'string' && /^linear-gradient\([^"']{1,200}\)$/.test(bg)) return bg;
    return fallback;
  }

  function mdVideoEmbedHTML(url) {
    if (!url) return '';
    var yt = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})/.exec(url);
    if (yt && yt[1]) {
      return '<iframe class="md-lb-media" src="https://www.youtube.com/embed/' + yt[1]
        + '" frameborder="0" allowfullscreen></iframe>';
    }
    var vm = /vimeo\.com\/(\d+)/.exec(url);
    if (vm && vm[1]) {
      return '<iframe class="md-lb-media" src="https://player.vimeo.com/video/' + vm[1]
        + '" frameborder="0" allowfullscreen></iframe>';
    }
    return '<video class="md-lb-media" controls src="' + esc(url) + '"></video>';
  }

  /* =============================================================
     Fabrica de instancias
     ============================================================= */

  var UID = 0;

  function baseOptions() {
    return {
      map: null,
      tiles: 'carto-voyager',
      center: [4.711, -74.072],
      zoom: 14,
      maxZoom: 19,
      clusterPx: 40,
      drawer: false,
      list: null,
      note: null,
      categories: null,
      mediaControls: null,
      onMapReady: null,
      onPlaceClick: null,
      isSaved: null,
      onToggleSave: null,
      mediaFilter: null,
      mediaEnabled: false,
      enableMediaOnAll: false,
      clusterLinksNavigate: false,
      mediaPhotoIcon: null,
      cargarAlbumOficial: null,
      usuario: null,
      mostrarLogin: null,
      mostrarToast: null,
      authHeaders: null,
      safeMode: true,
      apiBase: '',
      fitOnPlaces: false
    };
  }

  function mergeOptions(a, b) {
    var o = {}, k;
    for (k in a) { if (has(a, k)) o[k] = a[k]; }
    for (k in b) { if (has(b, k) && b[k] !== undefined) o[k] = b[k]; }
    return o;
  }

  function createInstance(opts) {
    var st = {
      options: mergeOptions(baseOptions(), opts || {}),
      map: null,
      clusterLayer: null,
      mediaLayer: null,
      markers: {},
      places: [],
      visible: [],
      media: [],
      mediaEnabled: false,
      mediaTypes: { foto: false, video: false, audio: false },
      userPos: null,
      activeId: null,
      activeCat: 'all',
      initialized: false,
      drawerEl: null,
      contentEl: null,
      titleEl: null,
      lbox: null,
      ownDrawer: false,
      drawerBound: false,
      mediaRoot: null,
      catRoot: null,
      listBound: false,
      reclusterTimer: null,
      noteTimer: null
    };

    /* ---------- accesos de sesion / red ---------- */

    function usuarioActual() {
      var o = st.options;
      if (o.usuario !== null && o.usuario !== undefined) return o.usuario;
      if (typeof window !== 'undefined' && window.ExploraCO) return window.ExploraCO.usuario || null;
      return null;
    }

    function toast(msg, color) {
      var f = st.options.mostrarToast;
      if (typeof f !== 'function' && typeof window !== 'undefined' && window.ExploraCO) f = window.ExploraCO.mostrarToast;
      if (typeof f === 'function') f(msg, color || '#E8A020');
    }

    function pedirLogin(msg) {
      var f = st.options.mostrarLogin;
      if (typeof f !== 'function' && typeof window !== 'undefined' && window.ExploraCO) f = window.ExploraCO.mostrarLogin;
      if (typeof f === 'function') { f(msg); return; }
      if (typeof window !== 'undefined') {
        if (typeof window.loginGate === 'function') window.loginGate();
        else if (typeof window.mostrarModalLogin === 'function') window.mostrarModalLogin();
      }
    }

    function authHeaders() {
      var f = st.options.authHeaders;
      if (typeof f !== 'function' && typeof window !== 'undefined' && window.ExploraCO) f = window.ExploraCO.authHeaders;
      return (typeof f === 'function') ? f() : {};
    }

    function apiPref() { return st.options.apiBase || ''; }

    // Emoji de "foto" del modulo de media/capa (index usa 1F4F8 y la
    // comunidad 1F4F7). El hero y el album-loc conservan CAMARA.
    function fotoIcon() { return st.options.mediaPhotoIcon || CAMARA; }

    function fetchJson(url) {
      return fetch(apiPref() + url).then(function (r) { return r.json(); });
    }

    function albumOficial(uuid) {
      var f = st.options.cargarAlbumOficial;
      if (typeof f === 'function') return Promise.resolve(f(uuid));
      if (typeof window !== 'undefined' && typeof window.cargarAlbumOficialDestino === 'function') {
        return Promise.resolve(window.cargarAlbumOficialDestino(uuid));
      }
      return Promise.resolve([]);
    }

    function uuidBySlug(slug) {
      for (var i = 0; i < st.places.length; i++) {
        if (st.places[i].slug === slug && st.places[i].uuid) return st.places[i].uuid;
      }
      return null;
    }

    /* ---------- drawer propio / reutilizado ---------- */

    function resolveDrawer(val) {
      if (val === true) {
        if (typeof document === 'undefined' || !document.body) return null;
        var uid = 'mc' + (++UID);
        var idContent = document.getElementById('md-content') ? (uid + '-md-content') : 'md-content';
        var idTitle = document.getElementById('md-mapa-destino-titulo') ? (uid + '-md-mapa-destino-titulo') : 'md-mapa-destino-titulo';
        var el = document.createElement('div');
        el.id = document.getElementById('mc-drawer') ? (uid + '-drawer') : 'mc-drawer';
        el.className = 'mc-root mapa-drawer';
        el.setAttribute('aria-hidden', 'true');
        el.innerHTML = '<div class="md-backdrop"></div>'
          + '<aside class="md-panel" role="dialog" aria-label="Detalle del lugar">'
          + '<button type="button" class="md-close" aria-label="Cerrar">&times;</button>'
          + '<div class="md-mapa-destino-titulo" id="' + idTitle + '"></div>'
          + '<div class="md-content" id="' + idContent + '"></div>'
          + '</aside>';
        document.body.appendChild(el);
        st.ownDrawer = true;
        return el;
      }
      if (typeof val === 'string') {
        if (typeof document === 'undefined') return null;
        var ex = document.getElementById(val);
        return ex || null;
      }
      return null;
    }

    function wireDrawer() {
      st.drawerEl = resolveDrawer(st.options.drawer);
      if (!st.drawerEl) { st.contentEl = null; st.titleEl = null; return; }
      if (String(st.drawerEl.className).indexOf('mc-root') === -1) {
        st.drawerEl.className = (st.drawerEl.className ? st.drawerEl.className + ' ' : '') + 'mc-root';
      }
      st.contentEl = st.drawerEl.querySelector('.md-content');
      st.titleEl = st.drawerEl.querySelector('.md-mapa-destino-titulo')
        || st.drawerEl.querySelector('#md-mapa-destino-titulo');
    }

    function setTitulo(txt) {
      if (st.titleEl) st.titleEl.textContent = txt || '';
    }

    function onDrawerClick(e) {
      var t = e.target;
      if (!t || !t.closest) return;
      if (t.closest('.md-close') || (t.classList && t.classList.contains('md-backdrop'))) {
        closeDrawer();
        return;
      }
      var tab = t.closest('.md-tab');
      if (tab) {
        var scope = tab.closest('.md-media') || st.drawerEl;
        switchTab(scope, tab, tab.getAttribute('data-mc-tab'));
        return;
      }
      var thumb = t.closest('.md-thumb');
      if (thumb) { fotoLightbox(thumb.getAttribute('data-url'), thumb.getAttribute('data-cap')); return; }
      var mcard = t.closest('.md-mcard');
      if (mcard) {
        videoLightbox(mcard.getAttribute('data-url'), mcard.getAttribute('data-cap'),
          mcard.getAttribute('data-autor'), parseInt(mcard.getAttribute('data-votos'), 10) || 0);
        return;
      }
      var aph = t.closest('.md-album-photo');
      if (aph) { fotoLightbox(aph.getAttribute('data-url'), aph.getAttribute('data-cap')); return; }
      var voto = t.closest('[data-mc-votar]');
      if (voto) { votarMedia(voto.getAttribute('data-mc-votar'), voto.getAttribute('data-mc-fuente'), voto); return; }
      var gu = t.closest('[data-mc-guardar]');
      if (gu) { guardarMedia(gu.getAttribute('data-mc-fuente'), gu.getAttribute('data-mc-item'), gu); return; }
      var al = t.closest('[data-mc-album]');
      if (al) { openAlbumModal(al.getAttribute('data-mc-album')); return; }
      var com = t.closest('[data-mc-comments]');
      if (com) {
        if (typeof window !== 'undefined' && window.AlbumComments && window.AlbumComments.toggle) window.AlbumComments.toggle(com);
        return;
      }
      var af = t.closest('[data-mc-albumficha]');
      if (af) { albumDestinoFicha(af.getAttribute('data-mc-albumficha')); return; }
      var mv = t.closest('[data-mc-mapview]');
      if (mv) {
        var la = parseFloat(mv.getAttribute('data-mc-lat'));
        var ln = parseFloat(mv.getAttribute('data-mc-lng'));
        if (st.map && isFinite(la) && isFinite(ln)) {
          try { st.map.setView([la, ln], 13); } catch (err) { log('mapview', err); }
        }
        closeDrawer();
        return;
      }
    }

    function bindDrawerOnce() {
      if (st.drawerBound || !st.drawerEl) return;
      st.drawerBound = true;
      st.drawerEl.addEventListener('click', onDrawerClick);
    }

    // El lightbox vive fuera del drawer (holder propio), por eso sus
    // fotos y botones requieren su propia delegacion.
    function onLboxClick(e) {
      var t = e.target;
      if (!t || !t.closest) return;
      var aph = t.closest('.md-album-photo');
      if (aph) { fotoLightbox(aph.getAttribute('data-url'), aph.getAttribute('data-cap')); return; }
      var voto = t.closest('[data-mc-votar]');
      if (voto) { votarMedia(voto.getAttribute('data-mc-votar'), voto.getAttribute('data-mc-fuente'), voto); return; }
      var gu = t.closest('[data-mc-guardar]');
      if (gu) { guardarMedia(gu.getAttribute('data-mc-fuente'), gu.getAttribute('data-mc-item'), gu); return; }
      var com = t.closest('[data-mc-comments]');
      if (com) {
        if (typeof window !== 'undefined' && window.AlbumComments && window.AlbumComments.toggle) window.AlbumComments.toggle(com);
        return;
      }
      var af = t.closest('[data-mc-albumficha]');
      if (af) { albumDestinoFicha(af.getAttribute('data-mc-albumficha')); return; }
    }

    function closeDrawer() {
      setTitulo('');
      if (st.contentEl) st.contentEl.innerHTML = '';
      if (st.drawerEl) {
        st.drawerEl.classList.remove('open');
        st.drawerEl.setAttribute('aria-hidden', 'true');
      }
      closeLightbox();
    }

    function openPanel() {
      if (!st.drawerEl) return;
      st.drawerEl.classList.add('open');
      st.drawerEl.setAttribute('aria-hidden', 'false');
    }

    /* ---------- lightbox ---------- */

    function ensureLightbox() {
      if (st.lbox) return st.lbox;
      if (typeof document === 'undefined' || !document.body) return null;
      var holder = document.createElement('div');
      holder.className = 'mc-root';
      var lb = document.createElement('div');
      lb.className = 'md-lbox';
      holder.appendChild(lb);
      document.body.appendChild(holder);
      lb.addEventListener('click', function (e) {
        if (e && e.target === lb) { closeLightbox(); return; }
        if (e && e.target && e.target.closest && e.target.closest('.md-lb-close')) { closeLightbox(); return; }
        onLboxClick(e);
      });
      st.lbox = lb;
      return lb;
    }

    function openLightbox(html, cap) {
      var lb = ensureLightbox();
      if (!lb) return;
      lb.innerHTML = '<button type="button" class="md-lb-close" aria-label="Cerrar">&times;</button>'
        + '<div class="md-lb-wrap">' + html + '</div>'
        + (cap ? '<div class="md-lb-cap">' + esc(cap) + '</div>' : '');
      lb.classList.add('open');
    }

    function closeLightbox() {
      if (!st.lbox) return;
      st.lbox.classList.remove('open');
      st.lbox.innerHTML = '';
    }

    function fotoLightbox(url, cap) {
      openLightbox('<img class="md-lb-media" src="' + esc(url) + '" alt="' + esc(cap || '') + '">', cap);
    }

    function videoLightbox(url, cap, autor, votos) {
      openLightbox(mdVideoEmbedHTML(url), mdCapMedia(cap, autor, votos));
    }

    function switchTab(scope, btn, tab) {
      if (!scope) return;
      var tabs = scope.querySelectorAll('.md-tab');
      for (var i = 0; i < tabs.length; i++) tabs[i].classList.remove('on');
      btn.classList.add('on');
      var panes = scope.querySelectorAll('.md-pane');
      for (var j = 0; j < panes.length; j++) {
        panes[j].classList.toggle('on', panes[j].getAttribute('data-mdpane') === tab);
      }
    }

    /* ---------- mapa: pines y clustering ---------- */

    function onMoved() {
      clearTimeout(st.reclusterTimer);
      st.reclusterTimer = setTimeout(function () { recluster(); renderMedia(); }, 150);
    }

    function placeByKey(key) {
      for (var i = 0; i < st.places.length; i++) {
        if (st.places[i].key === key) return st.places[i];
      }
      return null;
    }

    function markerIcon(p) {
      var color = p.color || '#E8A020';
      var emoji = p.emoji || PIN_DEFECTO;
      return L.divIcon({
        html: '<div style="width:30px;height:30px;border-radius:50% 50% 50% 0;'
          + 'transform:rotate(-45deg);background:' + color + ';'
          + 'display:flex;align-items:center;justify-content:center;'
          + 'box-shadow:0 3px 10px rgba(0,0,0,.35);border:2.5px solid #fff">'
          + '<span style="transform:rotate(45deg);font-size:12px;display:block">' + emoji + '</span>'
          + '</div>',
        iconSize: [30, 30], iconAnchor: [15, 30], className: ''
      });
    }

    function clusterIcon(count, emoji) {
      var size = count < 10 ? 40 : (count < 100 ? 46 : 54);
      return L.divIcon({
        html: '<div class="mapa-cluster" style="width:' + size + 'px;height:' + size + 'px">'
          + '<span class="mapa-cl-emoji">' + emoji + '</span>'
          + '<span class="mapa-cl-num">' + count + '</span></div>',
        iconSize: [size, size], iconAnchor: [size / 2, size / 2], className: ''
      });
    }

    function mediaIcon(item) {
      var tipo = item.media_type || 'foto';
      var esDestino = (item.origen === 'destino');
      var esAlbumDestino = (item.origen === 'destino_album');
      // Color base por tipo de media: video=rojo, audio=verde, fotos=morado.
      // Los items individuales van en pin REDONDO; el album curado del
      // destino (destino_album) conserva su ambar como contenedor y se pinta
      // CUADRADO (clase mpa-media-pin-album) para distinguirse de los items.
      var color = (tipo === 'video') ? '#e74c3c' : ((tipo === 'audio') ? '#2ecc71' : '#8e44ad');
      if (esAlbumDestino) color = '#d97706';
      var ico = esAlbumDestino ? '\uD83D\uDCDA' : ((tipo === 'video') ? '\u25B6' : ((tipo === 'audio') ? '\u266B' : fotoIcon()));
      var cls = 'mpa-media-pin'
        + (esDestino ? ' mpa-media-pin-dest' : '')
        + (esAlbumDestino ? ' mpa-media-pin-album' : '')
        + (!esAlbumDestino && !esDestino && tipo === 'video' ? ' mpa-media-pin-video' : '');
      return L.divIcon({
        html: '<div class="' + cls + '" style="background:' + color + '">' + ico + '</div>',
        iconSize: [34, 34], iconAnchor: [17, 17], className: ''
      });
    }

    function renderMarkers() {
      if (!st.initialized || !st.map || typeof L === 'undefined') return;
      Object.keys(st.markers).forEach(function (k) {
        try { st.map.removeLayer(st.markers[k]); } catch (e) { log('remove marker', e); }
      });
      st.markers = {};
      var added = 0;
      st.places.forEach(function (p) {
        if (!isFinite(p.lat) || !isFinite(p.lng)) return;
        try {
          var marker = L.marker([p.lat, p.lng], { icon: markerIcon(p) });
          marker.on('click', function () { onPlaceClick(p); });
          st.markers[p.key] = marker;
          added++;
        } catch (e) {
          log('marker error ' + p.nombre, e);
        }
      });
      if (st.options.fitOnPlaces && st.places.length) fitBounds();
      filterPins(st.activeCat || 'all');
      log(added + ' markers de ' + st.places.length + ' lugares');
    }

    function onPlaceClick(p) {
      if (typeof st.options.onPlaceClick === 'function') {
        try { st.options.onPlaceClick(p); } catch (e) { log('onPlaceClick', e); }
        return;
      }
      setActive(p.key);
    }

    function clAislable(keys) {
      if (!st.map) return false;
      var z = 18;
      for (var i = 0; i < keys.length; i++) {
        var p = placeByKey(keys[i]);
        if (!p) continue;
        var a = st.map.project([p.lat, p.lng], z);
        var isolated = true;
        for (var j = 0; j < keys.length; j++) {
          if (j === i) continue;
          var q = placeByKey(keys[j]);
          if (!q) continue;
          var b = st.map.project([q.lat, q.lng], z);
          var dx = a.x - b.x, dy = a.y - b.y;
          if (dx * dx + dy * dy < 45 * 45) { isolated = false; break; }
        }
        if (isolated) return true;
      }
      return false;
    }

    function openClusterPopup(keys, lat, lng) {
      if (!st.map) return;
      var items = keys.map(function (k) { return placeByKey(k); }).filter(Boolean);
      var html = '<div style="min-width:200px;max-width:270px;max-height:280px;overflow:auto;font-family:Outfit,sans-serif">'
        + '<div class="lp-name">\uD83D\uDDC2\uFE0F ' + items.length + ' lugar' + (items.length !== 1 ? 'es' : '') + ' aqu\u00ed</div>';
      items.forEach(function (p) {
        var saved = false;
        if (typeof st.options.isSaved === 'function') {
          try { saved = !!st.options.isSaved(p); } catch (e) { log('isSaved', e); }
        }
        html += '<div style="display:flex;align-items:center;gap:8px;padding:7px 0;border-top:1px solid rgba(0,0,0,.06)">'
          + '<span style="font-size:15px;width:18px;text-align:center;flex-shrink:0">' + (p.emoji || PIN_DEFECTO) + '</span>'
          + '<div style="flex:1;min-width:0">'
          + '<div style="font-size:12px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(p.nombre) + '</div>'
          + '<div style="font-size:10px;color:#888">' + esc(p.ciudad) + '</div></div>'
          + '<a class="lp-li-go" href="' + esc(p.slug) + '.html" data-mc-go="' + esc(String(p.key)) + '">Ver \u2192</a>'
          + '<button type="button" class="lp-li-save' + (saved ? ' saved' : '') + '" data-mc-save="' + esc(String(p.key)) + '">'
          + (saved ? '\u2665' : '\u2661') + '</button></div>';
      });
      html += '</div>';
      var cm = L.marker([lat, lng], { opacity: 0, interactive: false });
      cm.addTo(st.clusterLayer);
      cm.bindPopup(html, { maxWidth: 290 }).openPopup();
      cm.on('popupopen', function (ev) {
        var node = (ev && ev.popup && ev.popup.getElement) ? ev.popup.getElement() : null;
        if (!node) return;
        var saves = node.querySelectorAll('[data-mc-save]');
        for (var i = 0; i < saves.length; i++) {
          (function (btn) {
            btn.addEventListener('click', function () { toggleSave(btn.getAttribute('data-mc-save'), btn); });
          })(saves[i]);
        }
        // Index: "Ver" navega por href (paridad con el popup del index).
        // Comunidad: "Ver" abre el drawer del lugar.
        if (!st.options.clusterLinksNavigate) {
          var gos = node.querySelectorAll('[data-mc-go]');
          for (var j = 0; j < gos.length; j++) {
            (function (a) {
              a.addEventListener('click', function (e) {
                e.preventDefault();
                setActive(a.getAttribute('data-mc-go'));
              });
            })(gos[j]);
          }
        }
      });
      cm.on('popupclose', function () {
        try { st.clusterLayer.removeLayer(cm); } catch (e) { log('popupclose', e); }
      });
    }

    function toggleSave(key, el) {
      if (typeof st.options.onToggleSave === 'function') {
        try { st.options.onToggleSave(placeByKey(key), el); } catch (e) { log('onToggleSave', e); }
      }
    }

    function recluster() {
      if (!st.initialized || !st.clusterLayer) return;
      st.clusterLayer.clearLayers();
      var zoom = st.map.getZoom();
      var clusters = clusterize(st.visible, function (la, ln) {
        return st.map.project([la, ln], zoom);
      }, st.options.clusterPx || 40);

      clusters.forEach(function (cl) {
        if (cl.keys.length === 1) {
          var solo = st.markers[cl.keys[0]];
          if (solo) st.clusterLayer.addLayer(solo);
          return;
        }
        var emoCounts = {};
        cl.keys.forEach(function (key) {
          var p = placeByKey(key);
          if (!p) return;
          var e = p.emoji || PIN_DEFECTO;
          emoCounts[e] = (emoCounts[e] || 0) + 1;
        });
        var topEmoji = PIN_DEFECTO, topN = 0;
        Object.keys(emoCounts).forEach(function (e) {
          if (emoCounts[e] > topN) { topN = emoCounts[e]; topEmoji = e; }
        });
        var cm = L.marker([cl.lat, cl.lng], { icon: clusterIcon(cl.keys.length, topEmoji) });
        cm.on('click', function () {
          if (zoom >= 17 || !clAislable(cl.keys)) {
            openClusterPopup(cl.keys, cl.lat, cl.lng);
            return;
          }
          var next = Math.min(zoom + 2, 18);
          st.map.flyTo([cl.lat, cl.lng], next, { animate: true });
        });
        cm.addTo(st.clusterLayer);
      });
    }

    function firstIsolatedZoom(key, startZ) {
      var p = placeByKey(key);
      if (!p || !st.map) return startZ;
      for (var z = startZ; z <= 18; z++) {
        var pt = st.map.project([p.lat, p.lng], z);
        var isolated = true;
        st.visible.forEach(function (o) {
          if (o.key === key) return;
          var m = st.markers[o.key];
          if (!m) return;
          var op = st.map.project(m.getLatLng(), z);
          var dx = op.x - pt.x, dy = op.y - pt.y;
          if (Math.sqrt(dx * dx + dy * dy) < 45) isolated = false;
        });
        if (isolated) return z;
      }
      return 18;
    }

    function recomputeDists() {
      if (!st.userPos) return;
      st.places.forEach(function (p) {
        p._dist = haversineKm(st.userPos.lat, st.userPos.lng, p.lat, p.lng);
      });
    }

    /* ---------- lista / activacion / notas ---------- */

    function renderList(cat) {
      if (!st.options.list || typeof document === 'undefined') return;
      var el = document.getElementById(st.options.list);
      if (!el) return;
      if (cat === 'off') {
        el.innerHTML = '<div style="font-size:11px;color:rgba(255,255,255,.4);text-align:center;padding:16px">Sin categoria seleccionada - activa una para ver destinos</div>';
        return;
      }
      var arr = (cat === 'all') ? st.places.slice() : st.places.filter(function (p) { return p.cat === cat; });
      if (st.userPos) {
        arr.sort(function (a, b) {
          return ((a._dist != null) ? a._dist : 1e9) - ((b._dist != null) ? b._dist : 1e9);
        });
      }
      var html = '';
      arr.forEach(function (p) {
        var ac = (st.activeId === p.key) ? ' active' : '';
        var dist = (st.userPos && p._dist != null) ? ' \u00b7 ' + p._dist + ' km' : '';
        html += '<a class="mapa-list-item' + ac + '" href="' + esc(p.slug) + '.html" data-mc-go="' + esc(String(p.key)) + '">'
          + '<div class="mapa-li-ico" style="background:' + p.color + '22">' + p.emoji + '</div>'
          + '<div><div class="mapa-li-name">' + esc(p.nombre) + '</div><div class="mapa-li-loc">' + PIN_DEFECTO + ' ' + esc(p.ciudad) + dist + '</div></div>'
          + '<div class="mapa-li-stars">\u2605' + p.rating.toFixed(1) + '</div>'
          + '</a>';
      });
      el.innerHTML = html;
    }

    function setActive(key) {
      st.activeId = key;
      var p = placeByKey(key);
      if (!p || !st.map) return;
      var curZ = st.map.getZoom();
      var targetZ = Math.max(curZ, firstIsolatedZoom(key, curZ));
      if (targetZ === curZ) {
        st.map.panTo([p.lat, p.lng], { animate: true });
      } else {
        st.map.flyTo([p.lat, p.lng], targetZ, { animate: true });
      }
      openDrawer(p);
      renderList(st.activeCat);
    }

    function filterPins(cat, fromUser) {
      st.activeCat = cat;
      if (!st.map) return;
      if (cat === 'off') st.visible = [];
      else if (cat === 'all') st.visible = st.places.slice();
      else st.visible = st.places.filter(function (p) { return p.cat === cat; });
      recluster();
      renderList(cat);
      // Index-compat: al seleccionar "Todo" con clic de usuario se enciende
      // la capa media (equivalente a index L2309-2318). Se delega en
      // setMediaEnabled(true), que ademas rellena los tipos foto/video/audio
      // cuando estan todos apagados (si no, renderMedia los descartaria por
      // st.mediaTypes). No se aplica en los refresh internos para conservar
      // el arranque apagado.
      if (fromUser && cat === 'all' && st.options.enableMediaOnAll) {
        if (!st.mediaEnabled || mediaTiposActivos() === 0) setMediaEnabled(true);
        else renderMedia();
      }
    }

    function showNote(msg) {
      if (!st.options.note || typeof document === 'undefined') return;
      var el = document.getElementById(st.options.note);
      if (!el) return;
      clearTimeout(st.noteTimer);
      if (!msg) { el.classList.remove('show'); return; }
      el.textContent = msg;
      el.classList.add('show');
      st.noteTimer = setTimeout(function () { el.classList.remove('show'); }, 4500);
    }

    function geolocate() {
      if (typeof navigator === 'undefined' || !navigator.geolocation) {
        showNote('Tu navegador no soporta geolocalizacion - mostrando Bogota.');
        return;
      }
      try {
        navigator.geolocation.getCurrentPosition(function (pos) {
          st.userPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          recomputeDists();
          renderList(st.activeCat);
          showNote(null);
          if (st.map) st.map.flyTo([st.userPos.lat, st.userPos.lng], 16, { animate: true });
        }, function () {
          st.userPos = null;
          showNote('No pudimos obtener tu ubicacion - mostrando Bogota.');
        }, { timeout: 10000, maximumAge: 300000 });
      } catch (e) {
        st.userPos = null;
        showNote('No pudimos obtener tu ubicacion - mostrando Bogota.');
        log('geolocate', e);
      }
    }

    function resetColombia() {
      if (!st.map) return;
      st.map.flyTo([5.5, -74.5], 6, { animate: true });
    }

    function fitBounds() {
      if (!st.map || !st.places.length) return;
      var pts = [];
      st.places.forEach(function (p) {
        if (isFinite(p.lat) && isFinite(p.lng)) pts.push([p.lat, p.lng]);
      });
      if (!pts.length) return;
      try { st.map.fitBounds(pts, { padding: [30, 30], maxZoom: 12 }); } catch (e) { log('fitBounds', e); }
    }

    /* ---------- capa multimedia ---------- */

    function mediaItems() {
      // mediaFilter === false => capa SIN filtro (comportamiento index,
      // que pinta toda la media). null/undefined => filtro default
      // estricto de comunidad.
      if (st.options.mediaFilter === false) return st.media.slice();
      if (typeof st.options.mediaFilter === 'function') {
        try { return st.options.mediaFilter(st.media, st.places) || []; }
        catch (e) { log('mediaFilter', e); return []; }
      }
      return filterMediaDefault(st.media, st.places);
    }

    function mediaTiposActivos() {
      var n = 0;
      if (st.mediaTypes.foto) n++;
      if (st.mediaTypes.video) n++;
      if (st.mediaTypes.audio) n++;
      return n;
    }

    function renderMedia() {
      if (!st.initialized || !st.mediaLayer || typeof L === 'undefined') return;
      st.mediaLayer.clearLayers();
      if (!st.mediaEnabled) return;
      var items = mediaItems();
      if (!items.length) return;
      var bounds = st.map.getBounds();
      var n = 0;
      var destinosVistos = {};
      var albumesVistos = {};
      items.forEach(function (item) {
        var lat = parseFloat(item.lat);
        var lng = parseFloat(item.lng);
        if (!lat || !lng) return;
        var esAlbumDestino = (item.origen === 'destino_album');
        if (!esAlbumDestino && !st.mediaTypes[item.media_type]) return;
        if (!bounds.contains([lat, lng])) return;
        if (n >= TOPE_MEDIA_PINS) return;
        if (item.origen === 'destino' && item.origen_id) {
          if (destinosVistos[item.origen_id]) return;
          destinosVistos[item.origen_id] = true;
        }
        if (esAlbumDestino && item.origen_id) {
          if (albumesVistos[item.origen_id]) return;
          albumesVistos[item.origen_id] = true;
        }
        try {
          var marker = L.marker([lat, lng], { icon: mediaIcon(item) });
          marker.on('click', function () { openMediaDrawer(item); });
          if (esAlbumDestino) {
            marker.bindTooltip((item.album_titulo || '\u00c1lbum del destino') + ' \u00b7 ' + (parseInt(item.fotos_count, 10) || 0) + ' fotos');
          }
          marker.addTo(st.mediaLayer);
          n++;
        } catch (e) {
          log('media marker error', e);
        }
      });
    }

    function syncMediaBtns() {
      if (!st.mediaRoot) return;
      var btnAll = st.mediaRoot.querySelector('[data-media="all"]');
      if (btnAll) btnAll.classList.toggle('on', st.mediaEnabled);
      var btns = st.mediaRoot.querySelectorAll('.mf-btn[data-media]');
      for (var i = 0; i < btns.length; i++) {
        var t = btns[i].getAttribute('data-media');
        if (t === 'all') continue;
        btns[i].classList.toggle('on', st.mediaTypes[t] === true);
      }
    }

    function addMediaLayer() {
      if (st.map && st.mediaLayer && !st.map.hasLayer(st.mediaLayer)) st.mediaLayer.addTo(st.map);
    }

    function removeMediaLayer() {
      if (st.map && st.mediaLayer && st.map.hasLayer(st.mediaLayer)) st.map.removeLayer(st.mediaLayer);
    }

    function setMediaEnabled(v) {
      st.mediaEnabled = !!v;
      if (st.mediaEnabled && mediaTiposActivos() === 0) {
        st.mediaTypes.foto = true;
        st.mediaTypes.video = true;
        st.mediaTypes.audio = true;
      }
      if (st.mediaEnabled) addMediaLayer(); else removeMediaLayer();
      syncMediaBtns();
      renderMedia();
    }

    function setMediaTypes(obj) {
      if (obj) {
        for (var k in obj) { if (has(obj, k) && has(st.mediaTypes, k)) st.mediaTypes[k] = !!obj[k]; }
      }
      if (mediaTiposActivos() === 0) {
        st.mediaEnabled = false;
        removeMediaLayer();
      } else if (!st.mediaEnabled) {
        st.mediaEnabled = true;
        addMediaLayer();
      }
      syncMediaBtns();
      renderMedia();
    }

    function setMediaItems(items) {
      var out = [];
      (items || []).forEach(function (it) {
        var m = normalizeMedia(it);
        if (m) out.push(m);
      });
      st.media = out;
      if (st.initialized) renderMedia();
    }

    function bindMediaControls() {
      if (st.mediaRoot || typeof document === 'undefined') return;
      var root = st.options.mediaControls;
      root = (typeof root === 'string') ? document.querySelector(root) : root;
      if (!root) return;
      st.mediaRoot = root;
      root.addEventListener('click', function (e) {
        var b = (e.target && e.target.closest) ? e.target.closest('[data-media]') : null;
        if (!b) return;
        var tipo = b.getAttribute('data-media');
        if (tipo === 'all') {
          setMediaEnabled(!st.mediaEnabled);
        } else {
          var nt = {};
          nt[tipo] = !st.mediaTypes[tipo];
          setMediaTypes(nt);
        }
        syncMediaBtns();
      });
      syncMediaBtns();
    }

    function bindCategories() {
      if (st.catRoot || typeof document === 'undefined') return;
      var root = st.options.categories;
      root = (typeof root === 'string') ? document.querySelector(root) : root;
      if (!root) return;
      st.catRoot = root;
      root.addEventListener('click', function (e) {
        var b = (e.target && e.target.closest) ? e.target.closest('[data-cat]') : null;
        if (!b) return;
        var ya = b.classList.contains('on');
        var all = root.querySelectorAll('[data-cat]');
        for (var i = 0; i < all.length; i++) all[i].classList.remove('on');
        if (ya) { filterPins('off', true); return; }
        b.classList.add('on');
        filterPins(b.getAttribute('data-cat'), true);
      });
    }

    // Los items de la lista abren drawer + encuadran (index). Solo aplica
    // cuando se configura list (comunidad pasa list:null => sin efecto).
    function bindList() {
      if (st.listBound || !st.options.list || typeof document === 'undefined') return;
      var root = document.getElementById(st.options.list);
      if (!root) return;
      st.listBound = true;
      root.addEventListener('click', function (e) {
        var a = (e.target && e.target.closest) ? e.target.closest('[data-mc-go]') : null;
        if (!a) return;
        if (e.preventDefault) e.preventDefault();
        setActive(a.getAttribute('data-mc-go'));
      });
    }

    /* ---------- drawer: contenido ---------- */

    function mediasCercanas(place) {
      // Nombre historico: el drawer muestra SOLO los medios del propio
      // espacio (ficha / su album) con vinculo explicito. La proximidad
      // ciudad/radio se descarto del todo: mezclaba fotos Y videos/audios
      // de otros lugares en cualquier pin de la misma ciudad.
      return filterMediaPropios(st.media, place).slice(0, 40);
    }

    function tabHtml(place) {
      var cercanas = mediasCercanas(place);
      var videos = [], audios = [], fotosMedia = [];
      cercanas.forEach(function (it) {
        if (it.media_type === 'video') videos.push(it);
        else if (it.media_type === 'audio') audios.push(it);
        else fotosMedia.push(it);
      });
      var fotosArr = [];
      (place.fotos || []).forEach(function (ph) {
        var u = (typeof ph === 'string') ? ph : (ph.url || '');
        if (u && fotosArr.indexOf(u) === -1) fotosArr.push(u);
      });
      if (place.foto && fotosArr.indexOf(place.foto) === -1) fotosArr.push(place.foto);
      // Evita duplicados: la galeria propia del lugar (place.fotos) ya
      // puede contener las mismas URLs que la capa de media curada del
      // espacio. Se deduplica por URL antes de calcular hasFotos.
      var galeriaVistas = {};
      fotosArr.forEach(function (u) { galeriaVistas[u] = true; });
      fotosMedia = fotosMedia.filter(function (it) {
        var u = it && it.media_url;
        if (!u || galeriaVistas[u]) return false;
        galeriaVistas[u] = true;
        return true;
      });
      var hasFotos = fotosArr.length > 0 || fotosMedia.length > 0;
      var hasVideos = videos.length > 0;
      var hasAudios = audios.length > 0;

      var html = '<div class="md-media"><h4>' + fotoIcon() + ' Multimedia</h4>';
      if (!hasFotos && !hasVideos && !hasAudios) {
        html += '<div class="md-no-media"><div class="md-nm-ico">' + fotoIcon() + '</div>'
          + '<div class="md-nm-t">Sin multimedia cercana a\u00fan</div>'
          + '<div class="md-nm-s">\u00a1S\u00e9 el primero en subir fotos y videos de este lugar!</div></div>';
        html += '</div>';
        return html;
      }
      html += '<div class="md-tabs">';
      if (hasFotos) html += '<button type="button" class="md-tab on" data-mc-tab="fotos">Fotos</button>';
      if (hasVideos) html += '<button type="button" class="md-tab' + (hasFotos ? '' : ' on') + '" data-mc-tab="videos">Videos</button>';
      if (hasAudios) html += '<button type="button" class="md-tab' + ((hasFotos || hasVideos) ? '' : ' on') + '" data-mc-tab="audios">Audios</button>';
      html += '</div>';

      html += '<div class="md-pane' + (hasFotos ? ' on' : '') + '" data-mdpane="fotos"><div class="md-thumbs">';
      if (hasFotos) {
        fotosArr.forEach(function (u) {
          html += '<div class="md-thumb" data-url="' + esc(u) + '" data-cap="' + esc(place.nombre || 'Foto') + '">'
            + '<img src="' + esc(u) + '" alt="' + esc(place.nombre || '') + '" loading="lazy">'
            + '<span class="md-thb-ico">' + fotoIcon() + '</span></div>';
        });
        fotosMedia.forEach(function (it) {
          var itVotos = parseInt(it.votos, 10) || 0;
          var votoCtrl;
          if (it.id && it.fuente) {
            votoCtrl = '<button type="button" style="position:absolute;top:4px;right:4px;background:rgba(0,0,0,.55);color:var(--gold);border:1px solid rgba(232,160,32,.35);border-radius:3px;padding:1px 6px;font-size:10px;font-weight:700;cursor:pointer;line-height:1.4"'
              + ' data-mc-votar="' + esc(String(it.id)) + '" data-mc-fuente="' + esc(String(it.fuente)) + '">\u2B50 ' + itVotos + '</button>';
          } else {
            votoCtrl = '<span style="position:absolute;top:4px;right:4px;background:rgba(0,0,0,.55);color:rgba(255,255,255,.7);border-radius:3px;padding:1px 6px;font-size:10px;font-weight:700;line-height:1.4">\u2B50 ' + itVotos + '</span>';
          }
          html += '<div class="md-thumb" data-url="' + esc(it.media_url) + '" data-cap="' + esc(mdCapMedia(it.media_title, it.autor_nombre, it.votos)) + '">'
            + '<img src="' + esc(it.media_url) + '" alt="' + esc(it.media_title || '') + '" loading="lazy">'
            + '<span class="md-thb-ico">' + fotoIcon() + '</span>' + votoCtrl + '</div>';
        });
      }
      html += '</div></div>';

      if (hasVideos) {
        html += '<div class="md-pane' + (hasFotos ? '' : ' on') + '" data-mdpane="videos">';
        videos.forEach(function (it) {
          html += '<div class="md-mcard" data-url="' + esc(it.media_url) + '" data-cap="' + esc(it.media_title || 'Video') + '"'
            + ' data-autor="' + esc(it.autor_nombre || '') + '" data-votos="' + (parseInt(it.votos, 10) || 0) + '">'
            + '<span class="md-mcard-ico md-mcard-video">\u25B6</span>'
            + '<div class="md-mcard-body"><div class="md-mcard-t">' + esc(it.media_title || 'Video') + '</div>'
            + (it.autor_nombre ? '<div class="md-mcard-a">' + esc(it.autor_nombre) + '</div>' : '')
            + (it.votos > 0 ? '<div class="md-mcard-v">\u2B50 ' + it.votos + '</div>' : '')
            + '</div><span class="md-mcard-type video">Video</span></div>';
        });
        html += '</div>';
      }

      if (hasAudios) {
        html += '<div class="md-pane' + ((hasFotos || hasVideos) ? '' : ' on') + '" data-mdpane="audios">';
        audios.forEach(function (it) {
          html += '<div class="md-audio-row"><div class="md-audio-t">' + esc(it.media_title || 'Audio') + '</div>'
            + (it.autor_nombre ? '<div class="md-audio-a">' + esc(it.autor_nombre) + '</div>' : '')
            + '<audio controls preload="metadata" src="' + esc(it.media_url) + '"></audio></div>';
        });
        html += '</div>';
      }
      html += '</div>';
      return html;
    }

    function openDrawer(place) {
      var p = asPlace(place);
      if (!p || !st.contentEl || !st.drawerEl) return;
      setTitulo(p.nombre || '');
      var heroBg = mdHeroBgSafe(p.heroBg, GRAD_POR_DEFECTO);
      var foto = p.foto || '';
      var rating = parseFloat(p.rating) || 0;
      var html = '<div class="md-hero" style="background:' + heroBg + '">';
      if (foto) {
        html += '<img src="' + esc(foto) + '" alt="' + esc(p.nombre || '') + '" loading="lazy"'
          + ' onerror="this.style.display=\'none\';this.parentNode.querySelector(\'.md-hero-ph\').style.display=\'flex\';">';
        html += photoPlaceholderHTML(p.emoji || CAMARA, 'hero').replace('class="md-hero-ph"', 'class="md-hero-ph" style="display:none"');
      } else {
        html += photoPlaceholderHTML(p.emoji || CAMARA, 'hero');
      }
      html += '</div>';
      html += '<div class="md-head">';
      html += '<span class="md-badge md-cat-' + esc(p.cat || 'sitio') + '">' + mdCatLabel(p.cat) + '</span>';
      if (p.subcat) html += '<span class="md-subcat-chip">' + esc(mdSubcatLabel(p.subcat)) + '</span>';
      html += '<div class="md-title">' + esc(p.nombre || '') + '</div>';
      html += '<div class="md-meta">' + PIN_DEFECTO + ' ' + esc(p.ciudad || '') + (p.region ? ' \u00b7 ' + esc(p.region) : '') + '</div>';
      html += '<div class="md-stars">' + starHtml(rating) + ' ' + rating.toFixed(1) + '</div>';
      if (p.price) html += '<div class="md-price">' + esc(p.price) + '</div>';
      if (p.lead) html += '<div class="md-lead">' + esc(p.lead) + '</div>';
      if (p.slug) html += '<a class="md-link" href="' + esc(p.slug) + '.html">Ver lugar completo \u2192</a>';
      html += '</div>';
      html += tabHtml(p);
      st.contentEl.innerHTML = html;
      openPanel();
    }

    // Album oficial (fotos curadas) del destino. Requiere uuid REAL.
    function mdMapaAlbumOficial(destinoUuid, contenedorSel) {
      if (!destinoUuid) return;
      albumOficial(destinoUuid).then(function (fotos) {
        if (!fotos || !fotos.length) return;
        var cont = (typeof document !== 'undefined') ? document.querySelector(contenedorSel) : null;
        if (!cont) return;
        if (cont.querySelector('.md-album-oficial')) return;
        var celdas = '';
        var n = 0;
        for (var i = 0; i < fotos.length; i++) {
          var f = fotos[i] || {};
          var url = f.url || '';
          if (!url) continue;
          var cap = f.caption || '';
          celdas += '<div class="md-album-cell">'
            + '<div class="md-album-photo" data-url="' + esc(url) + '" data-cap="' + esc(cap) + '">'
            + '<img src="' + esc(url) + '" alt="' + esc(cap) + '" loading="lazy">'
            + '</div></div>';
          n++;
        }
        if (!n) return;
        cont.insertAdjacentHTML('beforeend',
          '<div class="md-album-oficial" style="margin-top:16px">'
          + '<div class="md-album-head">'
          + '<div class="md-album-t">\u00C1lbum oficial</div>'
          + '<div class="md-album-loc">' + CAMARA + ' ' + n + ' fotos</div>'
          + '</div><div class="md-album-grid">' + celdas + '</div></div>');
      }, function (e) { log('album oficial', e); });
    }

    function openMediaDrawer(item) {
      if (!item || !st.contentEl || !st.drawerEl) return;
      if (item.origen === 'destino_album' && item.origen_id) {
        openAlbumDestino(item);
        return;
      }
      if (item.origen === 'destino' && item.origen_id) {
        var found = null;
        st.places.forEach(function (p) { if (p.slug === item.origen_id) found = p; });
        if (found) {
          openDrawer(found);
          mdMapaAlbumOficial(uuidBySlug(String(item.origen_id)), '.md-content');
          return;
        }
      }
      var html = '<div class="md-feat">';
      if (item.media_type === 'video') html += mdVideoEmbedHTML(item.media_url);
      else if (item.media_type === 'audio') html += '<audio controls preload="metadata" src="' + esc(item.media_url) + '"></audio>';
      else {
        html += '<img src="' + esc(item.media_url) + '" alt="' + esc(item.media_title || '') + '" loading="lazy"'
          + ' onerror="this.parentNode.innerHTML=\'' + photoPlaceholderHTML(CAMARA, 'hero') + '\';">';
      }
      html += '</div>';
      html += '<div class="md-head">';
      var catMedia = (item.media_type === 'video') ? 'evento' : ((item.media_type === 'audio') ? 'comida' : 'sitio');
      html += '<span class="md-badge md-cat-' + catMedia + '">' + mdMediaBadge(item.media_type) + '</span>';
      var esDestMedia = (item.origen === 'destino');
      var tituloMedia = item.media_title || item.album_titulo || 'Multimedia';
      var subMedia = (item.album_titulo && item.album_titulo !== tituloMedia) ? item.album_titulo : '';
      html += '<div class="md-title">' + esc(tituloMedia) + '</div>';
      if (subMedia) html += '<div class="md-meta">' + esc(subMedia) + '</div>';
      if (esDestMedia) html += '<div class="md-meta">' + fotoIcon() + ' Foto del destino</div>';

      if (item.usuario_id) {
        var nombreAut = item.usuario_nombre || item.autor_nombre || '';
        var inicial = (nombreAut || '?').charAt(0).toUpperCase();
        var avHtml;
        if (item.usuario_avatar) {
          avHtml = '<img class="md-author-av" src="' + esc(item.usuario_avatar) + '" alt="' + esc(nombreAut) + '"'
            + ' onerror="this.style.display=\'none\';this.nextSibling.style.display=\'flex\';">'
            + '<span class="md-author-av-fb" style="display:none">' + esc(inicial) + '</span>';
        } else {
          avHtml = '<span class="md-author-av-fb">' + esc(inicial) + '</span>';
        }
        html += '<a class="md-author" href="/mi-perfil.html?id=' + encodeURIComponent(item.usuario_id) + '">'
          + avHtml + '<span class="md-author-name">' + esc(nombreAut) + '</span></a>';
      } else if (item.autor_nombre) {
        html += '<div class="md-meta">Por ' + esc(item.autor_nombre) + '</div>';
      }

      if (item.votos > 0) html += '<div class="md-stars">\u2B50 ' + item.votos + ' votos</div>';
      if (item.ciudad) html += '<div class="md-meta">' + PIN_DEFECTO + ' ' + esc(item.ciudad) + '</div>';
      setTitulo(item.album_titulo || tituloMedia);

      if (item.album_id) {
        html += '<button type="button" class="md-link" data-mc-album="' + esc(String(item.album_id)) + '">\uD83D\uDCDA Ver \u00e1lbum</button>';
      }
      if (item.ciudad && item.lat && item.lng) {
        html += '<button type="button" class="md-link" data-mc-mapview="1" data-mc-lat="' + parseFloat(item.lat) + '" data-mc-lng="' + parseFloat(item.lng) + '">' + PIN_DEFECTO + ' Ver en el mapa</button>';
      }
      html += '</div>';
      st.contentEl.innerHTML = html;
      openPanel();
    }

    // Album curado de un destino (origen='destino_album'): visor con la
    // galeria completa de la ficha (GET galeria_destino&slug=<slug>).
    function openAlbumDestino(item) {
      if (!item || !item.origen_id) return;
      var slug = String(item.origen_id);
      var lb = ensureLightbox();
      if (!lb) return;
      lb.innerHTML = '<button type="button" class="md-lb-close" aria-label="Cerrar">&times;</button>'
        + '<div class="md-album-wrap"><div class="md-album-loading">Cargando galer\u00eda\u2026</div></div>';
      lb.classList.add('open');
      fetchJson('/api/interacciones?tipo=galeria_destino&slug=' + encodeURIComponent(slug))
        .then(function (res) {
          var wrap = lb.querySelector('.md-album-wrap');
          if (!wrap) return;
          var fotos = (res && res.ok && res.items) ? res.items : [];
          var titulo = item.album_titulo || 'Galer\u00eda del destino';
          var html = '<div class="md-album-head">'
            + '<div class="md-album-t">' + esc(titulo) + '</div>'
            + '<div class="md-album-loc">' + CAMARA + ' ' + fotos.length + ' fotos</div>'
            + '</div>';
          if (!fotos.length) {
            html += '<div class="md-album-empty">Este destino a\u00fan no tiene fotos.</div>';
          } else {
            html += '<div class="md-album-grid">';
            for (var i = 0; i < fotos.length; i++) {
              var f = fotos[i] || {};
              var url = f.url || f.foto_url || f.media_url || '';
              if (!url) continue;
              var cap = f.caption || f.media_title || titulo;
              html += '<div class="md-album-cell">'
                + '<div class="md-album-photo" data-url="' + esc(url) + '" data-cap="' + esc(cap) + '">'
                + '<img src="' + esc(url) + '" alt="' + esc(cap) + '" loading="lazy">'
                + '</div></div>';
            }
            html += '</div>';
          }
          html += '<div class="md-album-actions">'
            + '<button type="button" class="md-link" data-mc-albumficha="' + esc(slug) + '">Ver ficha</button>'
            + '</div>';
          wrap.innerHTML = html;
        })
        .catch(function (e) {
          log('galeria destino', e);
          var wrap = lb.querySelector('.md-album-wrap');
          if (wrap) wrap.innerHTML = '<div class="md-album-empty">Error de conexi\u00f3n.</div>';
        });
    }

    function albumDestinoFicha(slug) {
      closeLightbox();
      var found = null;
      st.places.forEach(function (p) { if (p.slug === slug) found = p; });
      if (found) openDrawer(found);
    }

    // Cabeceras JSON que adjuntan Authorization cuando la sesion la expone.
    // Evita postear usuario_id sin token (mitiga el vector de BUG-061).
    function jsonAuthHeaders() {
      var headers = { 'Content-Type': 'application/json' };
      var auth = authHeaders();
      for (var k in auth) { if (has(auth, k)) headers[k] = auth[k]; }
      return headers;
    }

    function guardarMedia(fuente, itemId, btn) {
      var u = usuarioActual();
      if (!u || !u.id) { pedirLogin('Inicia sesi\u00f3n para guardar'); return; }
      if (!itemId) return;
      if (btn) btn.disabled = true;
      fetch(apiPref() + '/api/interacciones', {
        method: 'POST', headers: jsonAuthHeaders(),
        body: JSON.stringify({ tipo: 'guardar_media', usuario_id: u.id, fuente: fuente, item_id: itemId })
      })
        .then(function (r) { return r.json(); })
        .then(function (d) {
          if (btn) { btn.disabled = false; if (d && d.ok) { btn.classList.add('on'); btn.textContent = '\u2713 Guardado'; } }
          toast((d && d.ok) ? 'Guardado en tu museo' : 'No se pudo guardar', (d && d.ok) ? '#16a34a' : '#ef4444');
        })
        .catch(function (e) { if (btn) btn.disabled = false; log('guardarMedia', e); });
    }

    function votarMedia(itemId, fuente, btn) {
      var u = usuarioActual();
      if (!u || !u.id) { pedirLogin('Inicia sesi\u00f3n para votar'); return; }
      if (!itemId || !fuente) return;
      if (btn) btn.disabled = true;
      var headers = jsonAuthHeaders();
      fetch(apiPref() + '/api/interacciones?tipo=media_voto', {
        method: 'POST', headers: headers,
        body: JSON.stringify({ tipo: 'media_voto', usuario_id: String(u.id), fuente: fuente, item_id: String(itemId) })
      })
        .then(function (r) {
          if (r.status === 401) {
            if (btn) btn.disabled = false;
            pedirLogin('Sesi\u00f3n expirada - vuelve a iniciar');
            return null;
          }
          return r.json();
        })
        .then(function (d) {
          if (!d) return;
          if (btn) btn.disabled = false;
          if (d && d.ok) {
            if (btn) btn.textContent = '\u2B50 ' + (d.votos != null ? d.votos : '');
            toast('Voto registrado', '#16a34a');
          } else if (d && d.error) {
            toast(d.error, '#E8A020');
          }
        })
        .catch(function (e) { if (btn) btn.disabled = false; log('votarMedia', e); });
    }

    function openAlbumModal(albumId) {
      if (!albumId) return;
      var lb = ensureLightbox();
      if (!lb) return;
      lb.innerHTML = '<button type="button" class="md-lb-close" aria-label="Cerrar">&times;</button>'
        + '<div class="md-album-wrap"><div class="md-album-loading">Cargando \u00e1lbum\u2026</div></div>';
      lb.classList.add('open');
      fetchJson('/api/interacciones?tipo=album_detalle&album_id=' + encodeURIComponent(albumId))
        .then(function (res) {
          var wrap = lb.querySelector('.md-album-wrap');
          if (!wrap) return;
          if (!res || !res.ok || !res.album) {
            wrap.innerHTML = '<div class="md-album-empty">No se pudo cargar el \u00e1lbum.</div>';
            return;
          }
          var al = res.album;
          var fotos = res.fotos || [];
          var html = '<div class="md-album-head">'
            + '<div class="md-album-t">' + esc(al.titulo || al.nombre || '\u00c1lbum') + '</div>'
            + (al.ciudad ? '<div class="md-album-loc">' + PIN_DEFECTO + ' ' + esc(al.ciudad) + '</div>' : '')
            + '</div>';
          if (!fotos.length) {
            html += '<div class="md-album-empty">Este \u00e1lbum a\u00fan no tiene fotos.</div>';
          } else {
            html += '<div class="md-album-grid">';
            for (var i = 0; i < fotos.length; i++) {
              var f = fotos[i];
              var url = (typeof f === 'string') ? f : (f.foto_url || f.url || f.media_url || '');
              var cap = (typeof f === 'string') ? (al.titulo || '') : (f.cap || f.media_title || al.titulo || '');
              if (!url) continue;
              html += '<div class="md-album-cell">'
                + '<div class="md-album-photo" data-url="' + esc(url) + '" data-cap="' + esc(cap) + '">'
                + '<img src="' + esc(url) + '" alt="' + esc(cap) + '" loading="lazy"></div>';
              if (typeof f !== 'string' && f.id) {
                html += '<button type="button" class="md-album-com-btn" data-comments-for="' + esc(String(f.id)) + '"'
                + ' data-comments-fuente="album_foto" data-mc-comments="' + esc(String(f.id)) + '" data-mc-comments-fuente="album_foto">\uD83D\uDCAC Comentarios'
                  + (f.comentarios ? '<span data-ac-btn-count> (' + parseInt(f.comentarios, 10) + ')</span>' : '') + '</button>'
                  + '<div class="md-album-comments" data-comments-for="' + esc(String(f.id)) + '" style="display:none"></div>'
                  + '<button type="button" class="md-album-com-btn" data-mc-guardar="1" data-mc-fuente="album_foto" data-mc-item="' + esc(String(f.id)) + '">\uD83D\uDD16 Guardar</button>'
                  + '<button type="button" class="md-album-com-btn" data-mc-votar="' + esc(String(f.id)) + '" data-mc-fuente="album_foto">\u2B50 '
                  + (f.ya_votado ? 'Votado' : ((typeof f.votos === 'number' && f.votos > 0) ? 'Votar \u00b7 ' + f.votos : 'Votar'))
                  + '</button>';
              }
              html += '</div>';
            }
            html += '</div>';
          }
          if (fotos.length) {
            html += '<div class="md-album-actions">'
              + '<button type="button" class="md-album-com-btn" data-mc-guardar="1" data-mc-fuente="album" data-mc-item="' + esc(String(albumId)) + '">\uD83D\uDD16 Guardar \u00e1lbum</button>'
              + '</div>';
          }
          wrap.innerHTML = html;
        })
        .catch(function (e) {
          log('album modal', e);
          var wrap = lb.querySelector('.md-album-wrap');
          if (wrap) wrap.innerHTML = '<div class="md-album-empty">Error de conexi\u00f3n.</div>';
        });
    }

    /* ---------- ciclo de vida ---------- */

    function setPlaces(arr) {
      var out = [];
      (arr || []).forEach(function (r) {
        var p = normalizePlace(r);
        if (p) out.push(p);
      });
      st.places = out;
      if (st.initialized) renderMarkers();
      return inst;
    }

    function refresh() {
      if (!st.initialized) return inst;
      renderMarkers();
      renderMedia();
      return inst;
    }

    function destroy() {
      if (st.map) {
        try { st.map.off(); st.map.remove(); } catch (e) { log('destroy', e); }
      }
      st.map = null;
      st.markers = {};
      st.clusterLayer = null;
      st.mediaLayer = null;
      st.initialized = false;
      if (st.drawerEl) {
        if (st.drawerBound) st.drawerEl.removeEventListener('click', onDrawerClick);
        if (st.ownDrawer && st.drawerEl.parentNode) st.drawerEl.parentNode.removeChild(st.drawerEl);
        st.drawerEl = null; st.contentEl = null; st.titleEl = null; st.drawerBound = false;
      }
      if (st.lbox && st.lbox.parentNode) st.lbox.parentNode.removeChild(st.lbox);
      st.lbox = null;
      return inst;
    }

    function getState() {
      return {
        initialized: !!st.initialized,
        places: st.places.slice(),
        media: st.media.slice(),
        mediaEnabled: st.mediaEnabled,
        mediaTypes: { foto: st.mediaTypes.foto, video: st.mediaTypes.video, audio: st.mediaTypes.audio },
        mediaFiltered: mediaItems(),
        activeId: st.activeId,
        activeCat: st.activeCat,
        map: st.map,
        clusterPx: st.options.clusterPx
      };
    }

    function init(options) {
      if (options) st.options = mergeOptions(st.options, options);
      wireDrawer();
      bindDrawerOnce();
      if (st.map) {
        bindList();
        if (st.initialized) { renderMarkers(); renderMedia(); }
        return inst;
      }
      var o = st.options;
      if (typeof document === 'undefined' || typeof L === 'undefined') return inst;
      var cont = o.map ? document.getElementById(o.map) : null;
      if (!cont) return inst;
      if (cont) cont.classList.add('mc-root');
      try {
        if (cont._leaflet_id) { L.map(cont).remove(); cont._leaflet_id = null; }
      } catch (e) { log('cleanup leaflet', e); }
      try {
        st.map = L.map(o.map, {
          center: o.center, zoom: o.zoom,
          scrollWheelZoom: true, tap: false, maxZoom: o.maxZoom
        });
        L.tileLayer(o.tiles === 'osm' ? TILE_OSM : TILE_VOYAGER, {
          attribution: (o.tiles === 'osm' ? ATTR_OSM : ATTR_VOYAGER),
          maxZoom: o.maxZoom
        }).addTo(st.map);
        st.clusterLayer = L.layerGroup().addTo(st.map);
        // Estado inicial de la capa media pedido por opcion (index arranca
        // APAGADA). Solo se aplica al construir el mapa, no en re-init.
        st.mediaEnabled = !!o.mediaEnabled;
        st.mediaLayer = L.layerGroup();
        if (st.mediaEnabled) st.mediaLayer.addTo(st.map);
        st.map.on('moveend', onMoved);
        st.initialized = true;
        if (typeof o.onMapReady === 'function') {
          try { o.onMapReady(st.map); } catch (e) { log('onMapReady', e); }
        }
        bindCategories();
        bindMediaControls();
        bindList();
        renderMarkers();
        renderMedia();
      } catch (e) {
        log('init error', e);
      }
      return inst;
    }

    var inst = {
      init: init,
      refresh: refresh,
      destroy: destroy,
      setPlaces: setPlaces,
      setMedia: setMediaItems,
      setMediaEnabled: setMediaEnabled,
      setMediaTypes: setMediaTypes,
      getMap: function () { return st.map; },
      getState: getState,
      openDrawer: openDrawer,
      closeDrawer: closeDrawer,
      geolocate: geolocate,
      resetColombia: resetColombia,
      fitBounds: fitBounds
    };

    init(opts);
    return inst;
  }

  /* ---------- instancia default ---------- */

  var DEF = null;

  function defaultInst(opts) {
    if (!DEF) DEF = createInstance(opts || {});
    else if (opts) DEF.init(opts);
    return DEF;
  }

  window.MapaCultural = {
    version: VERSION,
    create: function (opts) { return createInstance(opts || {}); },
    init: function (opts) { return defaultInst(opts); },
    refresh: function () { return defaultInst().refresh(); },
    setPlaces: function (a) { return defaultInst().setPlaces(a); },
    setMedia: function (a) { return defaultInst().setMedia(a); },
    setMediaEnabled: function (v) { return defaultInst().setMediaEnabled(v); },
    setMediaTypes: function (o) { return defaultInst().setMediaTypes(o); },
    getMap: function () { return defaultInst().getMap(); },
    openDrawer: function (p) { return defaultInst().openDrawer(p); },
    closeDrawer: function () { return defaultInst().closeDrawer(); },
    normalizePlace: normalizePlace,
    normalizeMedia: normalizeMedia,
    esc: esc,
    starHtml: starHtml,
    photoPlaceholderHTML: photoPlaceholderHTML,
    haversineKm: haversineKm,
    clusterize: clusterize,
    filterMediaDefault: filterMediaDefault,
    filterMediaPropios: filterMediaPropios,
    mdCatLabel: mdCatLabel,
    mdSubcatLabel: mdSubcatLabel
  };
})();
