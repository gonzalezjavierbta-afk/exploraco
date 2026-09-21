/* =============================================================
   mymapa.js -- Modulo compartido "Mis mapas personalizados"
   ExploraCO. Expone window.MyMap (IIFE, ASCII-safe, sin backticks).

   Canonico para la gestion de mapas tematicos. index.html y
   comunidad.html lo consumen; no duplicar esta logica en las paginas.

   Endpoints existentes usados (no crea backend):
     GET  /api/interacciones?tipo=mapas_mios&usuario_id=<uuid>
     GET  /api/interacciones?tipo=mapa&usuario_id=<uuid>
          -> { guardados:[...lat/lng] } (contenido de "Mi Mapa")
     GET  /api/interacciones?tipo=mapa_detalle&id=<id>&usuario_id=<uuid>
     GET  /api/interacciones?tipo=mis_guardados_media
          -> { data:[{fuente,item_id}] } (exige sesion Bearer, ADR-054)
     POST /api/interacciones  (mapa_crear|mapa_editar|mapa_eliminar)

   Dependencias externas permitidas: Leaflet (window.L), el motor
   compartido window.MapaCultural (mapa-cultural.js) y las utilidades
   de sesion en window.ExploraCO (mostrarLogin/mostrarToast).
   ============================================================= */
(function () {
  'use strict';

  var DEFAULTS = {
    contenedor: 'mm-personal-map',
    pills: 'mm-personal-pills',
    editbar: 'mm-personal-editbar',
    lista: 'mm-personal-list'
  };

  // Estado interno del modulo (una sola instancia por pagina).
  var S = {
    opts: null,      // ids resueltos de los contenedores
    mapas: [],       // mapas tematicos del usuario
    sel: null,       // id del mapa activo (null = "Mi Mapa")
    destinos: [],    // destinos del mapa activo (para pines y lista)
    modo: null       // id en edicion dentro del modal (null = crear)
  };

  // Motor del mapa: instancia perezosa del modulo compartido
  // mapa-cultural.js (window.MapaCultural). Reemplaza el Leaflet propio.
  var mc = null;

  // Cache del fetch unico de multimedia_mapa (endpoint existente) y
  // banderas de carga / interaccion del usuario con el toggle Media.
  var MEDIA_CACHE = null;
  var MEDIA_CARGANDO = false;
  var MEDIA_USER_TOUCHED = false;

  // Set de media guardada por el usuario con claves "fuente:item_id"
  // (contrato del backend: fuente album_foto|curada y media_id). Lo puebla
  // cargarGuardados() para que el filtro de la capa media incluya los
  // bookmarks aunque su album no pertenezca a un destino del mapa.
  var SET_GUARDADOS = {};

  function logWarn(msg, e) {
    if (typeof console !== 'undefined' && console.warn) {
      console.warn('[mymapa] ' + msg, e || '');
    }
  }

  /* ---------- utilidades ---------- */
  function el(id) { return document.getElementById(id); }

  function api() {
    return (typeof API !== 'undefined' && API) ? API : '';
  }

  function usuario() {
    return (window.ExploraCO && window.ExploraCO.usuario) || null;
  }

  // Escape minimo para inyectar texto de la API en HTML.
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function toast(msg, color) {
    if (window.ExploraCO && window.ExploraCO.mostrarToast) {
      window.ExploraCO.mostrarToast(msg, color || '#E8A020');
    }
  }

  function pedirLogin(msg) {
    if (window.ExploraCO && window.ExploraCO.mostrarLogin) {
      window.ExploraCO.mostrarLogin(msg);
      return;
    }
    if (typeof window.loginGate === 'function') window.loginGate();
    else if (typeof window.mostrarModalLogin === 'function') window.mostrarModalLogin();
  }

  // fetch -> JSON con marca de status para distinguir 403 de error de red.
  function leerJson(r) {
    return r.json().then(function (d) {
      d.__status = r.status;
      return d;
    }, function () {
      return { ok: false, error: 'Respuesta invalida', __status: r.status };
    });
  }

  // Cabeceras con Authorization: Bearer, reutilizando el helper canonico
  // de sesion (usuario-session.js, window.ExploraCO.authHeaders). Sin
  // sesion devuelve {} para no romper los fetches publicos.
  function authHeaders() {
    if (window.ExploraCO && typeof window.ExploraCO.authHeaders === 'function') {
      try { return window.ExploraCO.authHeaders() || {}; }
      catch (e) { logWarn('authHeaders', e); return {}; }
    }
    return {};
  }

  // GET -> JSON. conAuth=true adjunta Authorization: Bearer para los
  // endpoints con sesion obligatoria (p.ej. mis_guardados_media, ADR-054).
  function getJson(url, conAuth) {
    var opts = conAuth ? { headers: authHeaders() } : undefined;
    return fetch(api() + url, opts).then(leerJson);
  }

  function postJson(body) {
    return fetch(api() + '/api/interacciones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }).then(leerJson);
  }

  function findMapa(id) {
    for (var i = 0; i < S.mapas.length; i++) {
      if (S.mapas[i].id === id) return S.mapas[i];
    }
    return null;
  }

  /* ---------- mapa compartido (mapa-cultural.js) ---------- */
  // Crea (una sola vez) la instancia del Mapa Cultural sobre el
  // contenedor de MyMap. list:null porque MyMap conserva su lista
  // textual; drawer:true porque el modulo crea su propio panel.
  function ensureMC() {
    if (mc) return mc;
    if (typeof window.MapaCultural === 'undefined') return null;
    var cont = el(S.opts.contenedor);
    if (!cont) return null;
    mc = window.MapaCultural.create({
      map: S.opts.contenedor,
      tiles: 'carto-voyager',
      list: null,
      drawer: true,
      apiBase: api(),
      mediaFilter: filterMisMapa,
      // Barra de categorias que aporta comunidad.html. Se pasa el ELEMENTO
      // (no un string) para no depender del parseo de selector: el motor
      // engancha los clicks de [data-cat] y permite filtrar/ocultar pines.
      categories: document.getElementById('mm-personal-cats'),
      // onMapReady llega sincrono antes de que mc quede asignado:
      // por eso se usa el mapa recibido, no mc.getMap(). Tras
      // invalidateSize(), fuera del ciclo sincrono, mc ya esta asignado.
      onMapReady: function (map) {
        setTimeout(function () {
          try { map.invalidateSize(); } catch (e) { logWarn('invalidateSize', e); }
          if (mc && typeof mc.refresh === 'function') {
            try { mc.refresh(); } catch (e) { logWarn('refresh', e); }
          }
        }, 120);
      }
    });
    return mc;
  }

  function invalidarTamano() {
    var map = (mc && mc.getMap) ? mc.getMap() : null;
    if (!map) return;
    setTimeout(function () {
      try { map.invalidateSize(); } catch (e) { logWarn('invalidateSize', e); }
      // Encuadra los destinos del mapa activo: garantiza que la media
      // cercana quede dentro de bounds y se pinte en el primer render
      // (sin encuadre el mapa quedaba en el centro por defecto y los
      // pines de media, que si filtran por bounds, no se dibujaban).
      if (mc && S.destinos.length && typeof mc.fitBounds === 'function') {
        try { mc.fitBounds(); } catch (e) { logWarn('fitBounds', e); }
      }
      if (mc && typeof mc.refresh === 'function') {
        try { mc.refresh(); } catch (e) { logWarn('refresh', e); }
      }
    }, 120);
  }

  /* ---------- capa de media: guardados + filtro ---------- */

  // Clave del contrato del backend: "fuente:media_id". Devuelve cadena
  // vacia si el item no trae ambos campos.
  function claveGuardado(it) {
    if (!it || !it.fuente || it.media_id == null) return '';
    return String(it.fuente) + ':' + String(it.media_id);
  }

  // Filtro de la capa media de "Mis mapas": conserva el filtro estricto
  // compartido (destino/destino_album con slug activo, reutilizado desde
  // mapa-cultural.js para no duplicar la regla) y ademas incluye la media
  // guardada por el usuario (SET_GUARDADOS) sin importar su origen. Asi un
  // video o foto de album guardado aparece como pin en el mapa.
  function filterMisMapa(items, places) {
    var arr = items || [];
    var estrictos = {};
    if (window.MapaCultural && typeof window.MapaCultural.filterMediaDefault === 'function') {
      window.MapaCultural.filterMediaDefault(arr, places).forEach(function (it) {
        if (it && it.key != null) estrictos[it.key] = true;
      });
    }
    return arr.filter(function (it) {
      if (!it || !it.media_url) return false;
      var k = claveGuardado(it);
      if (k && SET_GUARDADOS[k]) return true;
      // Media propia de album (fetch scope=mio): siempre visible en el
      // mapa personal, aunque filterMediaDefault la excluya por origen.
      if (it.origen === 'album' && it._propia) return true;
      return !!(it.key != null && estrictos[it.key]);
    });
  }

  // Carga los bookmarks de media del usuario y re-aplica la capa para que
  // los guardados salgan como pines. No bloquea el render de destinos: si
  // falla solo registra el aviso y conserva el set cargado previamente.
  function cargarGuardados() {
    var u = usuario();
    if (!u || !u.id) { SET_GUARDADOS = {}; return; }
    // mis_guardados_media exige sesion firmada (ADR-054) y deriva el
    // usuario del token: la URL ya NO envia usuario_id. Sin token no se
    // llama al endpoint y el mapa queda como esta.
    if (!authHeaders().Authorization) return;
    getJson('/api/interacciones?tipo=mis_guardados_media', true)
      .then(function (d) {
        if (!d || !d.ok) {
          // 401 = token ausente/vencido: se conserva el set previo.
          logWarn('guardados media status ' + (d && d.__status), d && d.error);
          return;
        }
        var set = {};
        (d.data || []).forEach(function (row) {
          if (!row) return;
          set[String(row.fuente) + ':' + String(row.item_id)] = true;
        });
        SET_GUARDADOS = set;
        if (mc) {
          mc.setMedia(MEDIA_CACHE || []);
          medirMediaActiva();
        }
      })
      .catch(function (e) { logWarn('guardados media', e); });
  }

  // ---- Capa de media (multimedia_mapa) --------------------------------
  // Clave de dedupe identica a la que usa el motor (normalizeMedia de
  // mapa-cultural.js: origen:origen_id:media_url). Reutiliza el helper
  // exportado para no duplicar la regla; si no esta disponible cae al
  // mismo formato local.
  function mediaKey(it) {
    if (window.MapaCultural && typeof window.MapaCultural.normalizeMedia === 'function') {
      var n = window.MapaCultural.normalizeMedia(it);
      if (n && n.key != null) return String(n.key);
    }
    return String(it.origen || '') + ':' + String(it.origen_id || '') + ':'
      + String(it.media_url || '');
  }

  // Merge de la lista publica con la del scope=mio. Todo item que llega
  // del fetch propio queda marcado _propia = true (tambien si ya existia
  // en la publica) para que filterMisMapa/medirMediaActiva lo reconozcan.
  function mergeMediaPropia(publicos, propios) {
    var out = (publicos || []).filter(Boolean);
    var vistos = {};
    out.forEach(function (it) { vistos[mediaKey(it)] = it; });
    (propios || []).forEach(function (it) {
      if (!it) return;
      it._propia = true;
      var k = mediaKey(it);
      if (vistos[k]) vistos[k]._propia = true;
      else { vistos[k] = it; out.push(it); }
    });
    return out;
  }

  // Aplica la lista final al motor y libera el flag de carga en un solo
  // sitio (exito, fallo propio o ausencia de sesion).
  function aplicarMedia(lista) {
    MEDIA_CARGANDO = false;
    MEDIA_CACHE = lista || [];
    var mm = ensureMC();
    if (mm) mm.setMedia(MEDIA_CACHE);
    medirMediaActiva();
    if (mm && typeof mm.refresh === 'function') mm.refresh();
  }

  // Capa de media: fetch publico + (con sesion) fetch scope=mio firmado
  // con Authorization: Bearer. scope=mio exige sesion (400
  // SESION_REQUERIDA sin header) y el uuid del dueno se deriva de ella.
  // Si el fetch propio falla, se conserva la lista publica sin romper.
  function recargarMedia() {
    var m = ensureMC();
    if (!m) return;
    if (MEDIA_CACHE) {
      m.setMedia(MEDIA_CACHE);
      medirMediaActiva();
      if (typeof m.refresh === 'function') m.refresh();
      return;
    }
    if (MEDIA_CARGANDO) return;
    MEDIA_CARGANDO = true;
    fetch(api() + '/api/interacciones?tipo=multimedia_mapa')
      .then(leerJson)
      .then(function (d) {
        var publicos = (d && d.ok && d.data) ? d.data : [];
        var u = usuario();
        if (!u || !u.id) { aplicarMedia(publicos); return null; }
        return fetch(api() + '/api/interacciones?tipo=multimedia_mapa&scope=mio',
          { headers: authHeaders() })
          .then(leerJson)
          .then(function (p) {
            var propios = (p && p.ok && p.data) ? p.data : [];
            aplicarMedia(mergeMediaPropia(publicos, propios));
          })
          .catch(function (e) {
            logWarn('media propia', e);
            aplicarMedia(publicos);
          });
      })
      .catch(function (e) {
        logWarn('media mapa', e);
        MEDIA_CARGANDO = false;
      });
  }

  // Enciende el maestro por defecto si el mapa activo tiene media y el
  // usuario aun no ha tocado el toggle en esta sesion.
  function medirMediaActiva() {
    var m = ensureMC();
    if (!m) return;
    var slugs = {};
    S.destinos.forEach(function (d) { if (d && d.slug) slugs[d.slug] = true; });
    var hay = false;
    (MEDIA_CACHE || []).forEach(function (it) {
      if (hay || !it) return;
      var k = claveGuardado(it);
      if (k && SET_GUARDADOS[k]) { hay = true; return; }
      if (it.origen === 'album') {
        if (it._propia) hay = true;
        return;
      }
      if ((it.origen === 'destino' || it.origen === 'destino_album') && it.origen_id && slugs[it.origen_id]) hay = true;
    });
    // Fuerza el encendido maestro cuando hay media para el mapa activo,
    // sin importar el estado previo: setMediaEnabled(true) rellena los
    // tipos (foto/video/audio) si estan en cero y vuelve a renderizar,
    // de modo que la capa no queda "marcada pero vacia".
    if (hay && !MEDIA_USER_TOUCHED) {
      m.setMediaEnabled(true);
      if (typeof m.refresh === 'function') m.refresh();
    }
    sincronizarToggleMedia();
  }

  function asegurarToggleMedia() {
    var existente = document.getElementById('mm-personal-media');
    if (existente) { existente.style.display = ''; return; }
    var card = document.querySelector('.mmx-card');
    if (!card) return;
    var head = card.querySelector('.mmx-head');
    var box = document.createElement('div');
    box.id = 'mm-personal-media';
    box.className = 'mmx-media';
    box.innerHTML = '<span class="mmx-media-lbl">Media</span>'
      + '<button type="button" class="mmx-mbtn" data-media="all">Todo</button>'
      + '<button type="button" class="mmx-mbtn" data-media="foto">Fotos</button>'
      + '<button type="button" class="mmx-mbtn" data-media="video">Videos</button>'
      + '<button type="button" class="mmx-mbtn" data-media="audio">Audios</button>';
    if (head && head.parentNode === card) card.insertBefore(box, head.nextSibling);
    else card.appendChild(box);
    box.addEventListener('click', function (e) {
      var b = (e.target && e.target.closest) ? e.target.closest('[data-media]') : null;
      if (!b) return;
      var m = ensureMC();
      if (!m) return;
      MEDIA_USER_TOUCHED = true;
      var tipo = b.getAttribute('data-media');
      if (tipo === 'all') {
        m.setMediaEnabled(!m.getState().mediaEnabled);
      } else {
        var activos = m.getState().mediaTypes;
        var nt = {};
        nt[tipo] = !activos[tipo];
        m.setMediaTypes(nt);
      }
      sincronizarToggleMedia();
    });
  }

  function sincronizarToggleMedia() {
    var box = document.getElementById('mm-personal-media');
    if (!box) return;
    var m = ensureMC();
    var estado = m ? m.getState() : { mediaEnabled: false, mediaTypes: {} };
    var btns = box.querySelectorAll('[data-media]');
    for (var i = 0; i < btns.length; i++) {
      var t = btns[i].getAttribute('data-media');
      var on = (t === 'all') ? !!estado.mediaEnabled : !!(estado.mediaTypes && estado.mediaTypes[t]);
      btns[i].classList.toggle('on', on);
    }
  }

  /* ---------- render: pills / editbar / lista ---------- */
  function renderPills() {
    var pills = el(S.opts.pills);
    if (!pills) return;
    var html = '<button type="button" class="mmx-pill' + (S.sel ? '' : ' on')
      + '" data-mm-id="mi">\uD83D\uDDFA\uFE0F Mi Mapa'
      + (S.sel ? '' : (S.destinos.length ? ' <span class="mmx-pill-n">' + S.destinos.length + '</span>' : ''))
      + '</button>';
    S.mapas.forEach(function (m) {
      html += '<button type="button" class="mmx-pill' + (S.sel === m.id ? ' on' : '')
        + '" data-mm-id="' + esc(String(m.id)) + '" title="' + esc(m.descripcion || '') + '">'
        + esc(m.emoji || '\uD83D\uDDFA\uFE0F') + ' ' + esc(m.nombre)
        + ' <span class="mmx-pill-n">' + (m.n_destinos != null ? m.n_destinos : 0) + '</span>'
        + ' ' + (m.publico ? '\uD83C\uDF0D' : '\uD83D\uDD12')
        + '</button>';
    });
    pills.innerHTML = html;
  }

  function renderEditbar() {
    var eb = el(S.opts.editbar);
    if (!eb) return;
    var m = S.sel ? findMapa(S.sel) : null;
    if (!m) {
      eb.style.display = 'none';
      eb.innerHTML = '';
      return;
    }
    eb.style.display = 'flex';
    var id = esc(String(m.id));
    var pub = !!m.publico;
    eb.innerHTML = '<span class="mmx-eb-name">' + esc(m.emoji || '\uD83D\uDDFA\uFE0F') + ' ' + esc(m.nombre) + '</span>'
      + '<button type="button" class="mmx-ebtn" data-mm-act="pub" data-mm-id="' + id + '" data-mm-pub="' + (pub ? '0' : '1') + '">'
      + (pub ? '\uD83D\uDD12 Hacer privado' : '\uD83C\uDF0D Hacer publico') + '</button>'
      + '<button type="button" class="mmx-ebtn" data-mm-act="edit" data-mm-id="' + id + '">Editar</button>'
      + '<button type="button" class="mmx-ebtn" data-mm-act="share" data-mm-id="' + id + '">Compartir</button>'
      + '<button type="button" class="mmx-ebtn mmx-ebtn-danger" data-mm-act="del" data-mm-id="' + id + '">Eliminar</button>'
      + '<button type="button" class="mmx-ebtn" data-mm-act="close">Cerrar</button>';
  }

  function renderList(errMsg) {
    var lista = el(S.opts.lista);
    if (!lista) return;
    if (errMsg) {
      lista.innerHTML = '<div class="mmx-empty">' + esc(errMsg) + '</div>';
      return;
    }
    if (!S.destinos.length) {
      lista.innerHTML = '<div class="mmx-empty">'
        + (S.sel ? 'Este mapa aun no tiene destinos.'
                 : 'Todavia no tienes lugares guardados. Usa el corazon en cualquier destino.')
        + '</div>';
      return;
    }
    var html = '<div class="mmx-list-title">' + (S.sel ? 'Destinos del mapa' : 'Tus guardados')
      + ' (' + S.destinos.length + ')</div>';
    html += S.destinos.map(function (d) {
      var nombre = esc(d.nombre || 'Destino');
      var ciudad = d.ciudad ? ' <span class="mmx-li-city">' + esc(d.ciudad) + '</span>' : '';
      if (d.slug) {
        return '<a class="mmx-item" href="/' + esc(d.slug) + '.html">' + nombre + ciudad + '</a>';
      }
      return '<div class="mmx-item">' + nombre + ciudad + '</div>';
    }).join('');
    lista.innerHTML = html;
  }

  function renderGuest() {
    S.mapas = [];
    S.sel = null;
    S.destinos = [];
    SET_GUARDADOS = {};
    var pills = el(S.opts.pills);
    if (pills) {
      pills.innerHTML = '<span class="mmx-empty">Inicia sesion para crear tus mapas</span>'
        + '<button type="button" class="mmx-login" data-mm-login="1">Iniciar sesion</button>';
    }
    var eb = el(S.opts.editbar);
    if (eb) { eb.style.display = 'none'; eb.innerHTML = ''; }
    var lista = el(S.opts.lista);
    if (lista) lista.innerHTML = '';
    var m = ensureMC();
    if (m) { m.setPlaces([]); m.setMedia([]); }
    var map = (m && m.getMap) ? m.getMap() : null;
    if (map) map.setView([4.5, -74.0], 5);
    var box = document.getElementById('mm-personal-media');
    if (box) box.style.display = 'none';
    var cats = document.getElementById('mm-personal-cats');
    if (cats) cats.style.display = 'none';
    invalidarTamano();
  }

  /* ---------- carga de datos ---------- */
  function refresh() {
    var cont = el(S.opts.contenedor);
    if (!cont) return;
    var u = usuario();
    if (!u || !u.id) { renderGuest(); return; }
    // Re-muestra los controles que renderGuest() oculto si se inicio
    // sesion en caliente (guest -> login) sin recargar la pagina.
    var catsOn = document.getElementById('mm-personal-cats');
    if (catsOn) catsOn.style.display = '';
    getJson('/api/interacciones?tipo=mapas_mios&usuario_id=' + encodeURIComponent(u.id))
      .then(function (d) {
        if (!d || !d.ok) {
          toast((d && d.error) || 'No se pudieron cargar tus mapas', '#ef4444');
          return;
        }
        S.mapas = d.data || [];
        if (S.sel && !findMapa(S.sel)) S.sel = null;
        renderPills();
        renderEditbar();
        cargarGuardados();
        loadDestinos();
      })
      .catch(function () { toast('Error de red al cargar tus mapas', '#ef4444'); });
  }

  // Aplica los destinos activos al motor del mapa y recarga su capa de
  // media (cacheada). La lista textual sigue usando S.destinos crudo.
  function aplicarDestinos() {
    var m = ensureMC();
    if (m) m.setPlaces(S.destinos);
    asegurarToggleMedia();
    recargarMedia();
  }

  // Carga los destinos del mapa activo. Reutiliza un solo fetch tanto para
  // los pines del mapa como para la lista textual (nada duplicado).
  function loadDestinos() {
    var u = usuario();
    if (!u || !u.id) return;
    var esMiMapa = !S.sel;
    var url = esMiMapa
      ? '/api/interacciones?tipo=mapa&usuario_id=' + encodeURIComponent(u.id)
      : '/api/interacciones?tipo=mapa_detalle&id=' + encodeURIComponent(S.sel) + '&usuario_id=' + encodeURIComponent(u.id);
    getJson(url).then(function (d) {
      if (!d || !d.ok) {
        S.destinos = [];
        var msg = 'No se pudo cargar el mapa.';
        if (d && d.__status === 403) msg = 'Este mapa es privado y no te pertenece.';
        else if (d && d.error) msg = d.error;
        renderPills(); renderList(msg); aplicarDestinos(); invalidarTamano();
        return;
      }
      S.destinos = (esMiMapa ? (d.data && d.data.guardados) : (d.data && d.data.destinos)) || [];
      renderPills(); renderList(''); aplicarDestinos(); invalidarTamano();
    }).catch(function (e) {
      logWarn('loadDestinos', e);
      S.destinos = [];
      renderPills(); renderList('Error de red al cargar el mapa.'); aplicarDestinos(); invalidarTamano();
    });
  }

  /* ---------- seleccion / acciones ---------- */
  function select(id) {
    if (!usuario()) { pedirLogin('Inicia sesion para organizar tus mapas'); return; }
    S.sel = id || null;
    renderPills();
    renderEditbar();
    loadDestinos();
  }

  function togglePublico(id, pub) {
    var u = usuario();
    if (!u) return;
    postJson({ tipo: 'mapa_editar', usuario_id: u.id, mapa_id: id, publico: !!pub })
      .then(function (d) {
        if (d && d.ok) {
          toast(pub ? 'Mapa publico' : 'Mapa privado', '#16a34a');
          refresh();
        } else {
          toast((d && d.error) || 'No se pudo actualizar el mapa', '#ef4444');
        }
      })
      .catch(function () { toast('Error de red al actualizar el mapa', '#ef4444'); });
  }

  function compartir(id) {
    var m = findMapa(id);
    if (!m) { toast('Mapa no encontrado', '#ef4444'); return; }
    if (!m.publico) { toast('Primero haz el mapa publico para compartirlo', '#E8A020'); return; }
    var url = (window.location.origin || 'https://exploraco.vercel.app')
      + '/mapas.html?id=' + encodeURIComponent(id);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(function () {
        toast('Link copiado', '#16a34a');
      }, function () { window.prompt('Copia el link de tu mapa:', url); });
    } else {
      window.prompt('Copia el link de tu mapa:', url);
    }
  }

  function eliminar(id) {
    var u = usuario();
    if (!u) return;
    var m = findMapa(id);
    var nombre = (m && m.nombre) ? m.nombre : 'este mapa';
    if (!window.confirm('Eliminar ' + nombre + '? Tus lugares guardados en Mi Mapa NO se borran.')) return;
    postJson({ tipo: 'mapa_eliminar', usuario_id: u.id, mapa_id: id })
      .then(function (d) {
        if (d && d.ok) {
          if (S.sel === id) S.sel = null;
          toast('Mapa eliminado', '#16a34a');
          refresh();
        } else {
          toast((d && d.error) || 'No se pudo eliminar el mapa', '#ef4444');
        }
      })
      .catch(function () { toast('Error de red al eliminar el mapa', '#ef4444'); });
  }

  /* ---------- modal crear/editar ---------- */
  function onKeyEsc(e) {
    if (e.key === 'Escape') cerrarModal();
  }

  function cerrarModal() {
    var d = el('mm-personal-modal');
    if (d) d.remove();
    document.body.style.overflow = '';
    document.removeEventListener('keydown', onKeyEsc);
    S.modo = null;
  }

  function openModal(m) {
    var u = usuario();
    if (!u) { pedirLogin('Inicia sesion para crear tus mapas'); return; }
    cerrarModal();
    S.modo = m ? m.id : null;
    var ov = document.createElement('div');
    ov.id = 'mm-personal-modal';
    ov.className = 'mm-personal-modal';
    var pubBox = m
      ? '<label class="mm-personal-check"><input id="mm-personal-publico" type="checkbox"'
        + (m.publico ? ' checked' : '') + '><span>\uD83C\uDF0D Mapa publico (visible en /mapas.html)</span></label>'
      : '';
    ov.innerHTML = '<div class="mm-personal-box" role="dialog" aria-modal="true" aria-label="'
      + (m ? 'Editar mapa' : 'Nuevo mapa') + '">'
      + '<div class="mm-personal-head">' + (m ? 'Editar mapa' : 'Nuevo mapa') + '</div>'
      + '<label class="mm-personal-lbl">NOMBRE *</label>'
      + '<input id="mm-personal-nombre" class="mm-personal-inp" maxlength="80" value="'
      + (m ? esc(m.nombre) : '') + '" placeholder="Ruta gastronomica">'
      + '<label class="mm-personal-lbl">EMOJI (opcional)</label>'
      + '<input id="mm-personal-emoji" class="mm-personal-inp" maxlength="8" value="'
      + (m ? esc(m.emoji || '') : '\uD83D\uDDFA\uFE0F') + '">'
      + '<label class="mm-personal-lbl">DESCRIPCION (opcional)</label>'
      + '<textarea id="mm-personal-desc" class="mm-personal-inp" rows="3" maxlength="1000">'
      + (m ? esc(m.descripcion || '') : '') + '</textarea>'
      + pubBox
      + '<div class="mm-personal-actions">'
      + '<button type="button" class="mm-personal-btn ghost" id="mm-personal-cancel">Cancelar</button>'
      + '<button type="button" class="mm-personal-btn" id="mm-personal-save">' + (m ? 'Guardar' : 'Crear') + '</button>'
      + '</div></div>';
    document.body.appendChild(ov);
    document.body.style.overflow = 'hidden';
    ov.addEventListener('click', function (e) { if (e.target === ov) cerrarModal(); });
    document.addEventListener('keydown', onKeyEsc);
    var cancel = el('mm-personal-cancel');
    if (cancel) cancel.addEventListener('click', cerrarModal);
    var save = el('mm-personal-save');
    if (save) save.addEventListener('click', guardar);
    setTimeout(function () { var n = el('mm-personal-nombre'); if (n) n.focus(); }, 50);
  }

  function openNuevo() { openModal(null); }
  function openEditar(id) { openModal(findMapa(id)); }

  function guardar() {
    var u = usuario();
    if (!u) return;
    var nEl = el('mm-personal-nombre');
    var nombre = nEl ? nEl.value : '';
    if (!nombre.trim()) {
      toast('Ponle un nombre al mapa', '#ef4444');
      if (nEl) nEl.focus();
      return;
    }
    var body = { usuario_id: u.id, nombre: nombre.trim().slice(0, 80) };
    var eEl = el('mm-personal-emoji'), dEl = el('mm-personal-desc');
    var emoji = eEl ? eEl.value : '', desc = dEl ? dEl.value : '';
    if (emoji.trim()) body.emoji = emoji.trim().slice(0, 8);
    if (desc.trim()) body.descripcion = desc.trim().slice(0, 1000);
    var editId = S.modo;
    if (editId) {
      body.tipo = 'mapa_editar';
      body.mapa_id = editId;
      var pEl = el('mm-personal-publico');
      body.publico = !!(pEl && pEl.checked);
    } else {
      body.tipo = 'mapa_crear';
    }
    postJson(body).then(function (d) {
      if (d && d.ok) {
        cerrarModal();
        toast(editId ? 'Mapa actualizado' : 'Mapa creado', '#16a34a');
        refresh();
      } else {
        toast((d && d.error) || 'No se pudo guardar el mapa', '#ef4444');
      }
    }).catch(function () { toast('Error de red al guardar el mapa', '#ef4444'); });
  }

  /* ---------- binding (una sola vez) ---------- */
  function bind() {
    var pills = el(S.opts.pills);
    if (pills) {
      pills.addEventListener('click', function (e) {
        var t = e.target;
        if (!t || !t.closest) return;
        if (t.closest('[data-mm-login]')) { pedirLogin('Inicia sesion para crear tus mapas'); return; }
        var b = t.closest('[data-mm-id]');
        if (!b) return;
        var v = b.getAttribute('data-mm-id');
        select(v === 'mi' ? null : v);
      });
    }
    var eb = el(S.opts.editbar);
    if (eb) {
      eb.addEventListener('click', function (e) {
        var t = e.target;
        if (!t || !t.closest) return;
        var b = t.closest('[data-mm-act]');
        if (!b) return;
        var act = b.getAttribute('data-mm-act');
        var id = b.getAttribute('data-mm-id');
        if (act === 'pub') togglePublico(id, b.getAttribute('data-mm-pub') === '1');
        else if (act === 'edit') openEditar(id);
        else if (act === 'share') compartir(id);
        else if (act === 'del') eliminar(id);
        else if (act === 'close') select(null);
      });
    }
  }

  /* ---------- API publica ---------- */
  function init(opts) {
    opts = opts || {};
    S.opts = {
      contenedor: opts.contenedor || DEFAULTS.contenedor,
      pills: opts.pills || DEFAULTS.pills,
      editbar: opts.editbar || DEFAULTS.editbar,
      lista: opts.lista || DEFAULTS.lista
    };
    var cont = el(S.opts.contenedor);
    if (!cont) return; // no-op: la pagina no tiene el modulo
    if (!cont.__mmBound) { // idempotente: bind una sola vez
      cont.__mmBound = true;
      bind();
    }
    asegurarToggleMedia();
    refresh();
  }

  window.MyMap = {
    init: init,
    refresh: refresh,
    openNuevo: openNuevo
  };
})();
