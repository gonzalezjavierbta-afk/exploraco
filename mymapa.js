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
     POST /api/interacciones  (mapa_crear|mapa_editar|mapa_eliminar)

   Dependencias externas permitidas: Leaflet (window.L) y las
   utilidades de sesion en window.ExploraCO (mostrarLogin/mostrarToast).
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
    map: null,       // instancia Leaflet propia
    layer: null,     // capa de marcadores
    mapas: [],       // mapas tematicos del usuario
    sel: null,       // id del mapa activo (null = "Mi Mapa")
    destinos: [],    // destinos del mapa activo (para pines y lista)
    modo: null       // id en edicion dentro del modal (null = crear)
  };

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

  function getJson(url) {
    return fetch(api() + url).then(leerJson);
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

  /* ---------- mapa Leaflet propio ---------- */
  function ensureMap() {
    var cont = el(S.opts.contenedor);
    if (!cont || typeof L === 'undefined') return null;
    if (S.map) return S.map;
    S.map = L.map(S.opts.contenedor).setView([4.5, -74.0], 5);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: 'OSM',
      maxZoom: 18
    }).addTo(S.map);
    S.layer = L.layerGroup().addTo(S.map);
    return S.map;
  }

  function invalidarTamano() {
    if (!S.map) return;
    setTimeout(function () {
      try { S.map.invalidateSize(); } catch (e) {}
    }, 120);
  }

  function drawMarkers() {
    var map = ensureMap();
    if (!map || !S.layer) return;
    S.layer.clearLayers();
    var pts = [];
    S.destinos.forEach(function (d) {
      var lat = parseFloat(d.lat), lng = parseFloat(d.lng);
      if (!isFinite(lat) || !isFinite(lng)) return;
      pts.push([lat, lng]);
      var foto = d.foto_hero
        ? '<img src="' + esc(d.foto_hero) + '" alt="" loading="lazy" style="width:100%;height:90px;object-fit:cover;border-radius:6px;margin-bottom:6px" onerror="this.style.display=\'none\'">'
        : '';
      var link = d.slug
        ? '<div style="margin-top:6px"><a class="mmx-pop-link" href="/' + esc(d.slug) + '.html">Ver destino \u2192</a></div>'
        : '';
      var html = '<div class="mmx-pop">' + foto
        + '<div class="mmx-pop-title">' + esc(d.nombre || 'Destino') + '</div>'
        + (d.ciudad ? '<div class="mmx-pop-meta">' + esc(d.ciudad) + '</div>' : '')
        + link + '</div>';
      L.marker([lat, lng]).bindPopup(html, { maxWidth: 230 }).addTo(S.layer);
    });
    if (pts.length) {
      try { map.fitBounds(pts, { padding: [30, 30], maxZoom: 12 }); } catch (e) {}
    } else {
      map.setView([4.5, -74.0], 5);
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
    var pills = el(S.opts.pills);
    if (pills) {
      pills.innerHTML = '<span class="mmx-empty">Inicia sesion para crear tus mapas</span>'
        + '<button type="button" class="mmx-login" data-mm-login="1">Iniciar sesion</button>';
    }
    var eb = el(S.opts.editbar);
    if (eb) { eb.style.display = 'none'; eb.innerHTML = ''; }
    var lista = el(S.opts.lista);
    if (lista) lista.innerHTML = '';
    var map = ensureMap();
    if (map) map.setView([4.5, -74.0], 5);
    invalidarTamano();
  }

  /* ---------- carga de datos ---------- */
  function refresh() {
    var cont = el(S.opts.contenedor);
    if (!cont) return;
    var u = usuario();
    if (!u || !u.id) { renderGuest(); return; }
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
        loadDestinos();
      })
      .catch(function () { toast('Error de red al cargar tus mapas', '#ef4444'); });
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
        renderPills(); drawMarkers(); renderList(msg); invalidarTamano();
        return;
      }
      S.destinos = (esMiMapa ? (d.data && d.data.guardados) : (d.data && d.data.destinos)) || [];
      renderPills(); drawMarkers(); renderList(''); invalidarTamano();
    }).catch(function () {
      S.destinos = [];
      renderPills(); drawMarkers(); renderList('Error de red al cargar el mapa.'); invalidarTamano();
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
    refresh();
  }

  window.MyMap = {
    init: init,
    refresh: refresh,
    openNuevo: openNuevo
  };
})();
