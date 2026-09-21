/**
 * ExploraCO - Sesion de guardado compartida del directorio (ASCII-safe).
 * Centraliza para los 5 listados (directorio, hostal, comida, sitio,
 * evento) el toggle de guardado (localStorage + DB) y la hidratacion de
 * guardados desde Neon.
 *
 * Identificador local: SLUG (estable; el catalogo embebido y el que
 * reemplaza directorio-api-connector.js comparten slug, pero NO el id
 * posicional, que cambia al recargar desde la API).
 * Identificador de DB: UUID real del destino.
 *
 * Requiere que usuario-session.js se cargue ANTES de este archivo.
 */
(function () {
  'use strict';

  var _uuidRe = /^[0-9a-fA-F-]{10,}$/;
  var _uuidCache = {};      // slug -> uuid (resuelto via /api/destinos)
  var _uuidCargando = null;
  var _embebido = null;        // snapshot del catalogo embebido (items sin _uuid)
  var _firmaCatalogo = null;   // huella del ultimo catalogo migrado
  var _hidratado = false;
  var _hookPrevio = window.onExploraCOUpdate;

  // -- Catalogo de tarjetas (cada directorio define uno de estos) --
  function _fuentes() {
    var out = [];
    ['PLACES', 'PL', 'MAPA_PLACES'].forEach(function (n) {
      if (Array.isArray(window[n])) out.push(window[n]);
    });
    return out;
  }
  function _buscarEn(cols, match) {
    for (var i = 0; i < cols.length; i++) {
      var hit = cols[i].filter(match)[0];
      if (hit) return hit;
    }
    return null;
  }
  function _buscar(match) {
    return _buscarEn(_fuentes(), match);
  }
  function _porSlug(slug) {
    return _buscar(function (p) { return p && p.slug === slug; });
  }
  // Resuelve id posicional -> slug. Prueba el catalogo activo (embebido o el
  // del API con _uuid) y cae al snapshot embebido si el connector ya lo piso.
  function _slugDeId(id) {
    var it = _buscar(function (p) { return p && p.id === id; });
    if (it && it.slug) return it.slug;
    var emb = _embebido && _buscarEn(_embebido, function (p) { return p && p.id === id; });
    return emb && emb.slug ? emb.slug : null;
  }
  function _mmSaved() {
    if (!Array.isArray(window.mmSaved)) window.mmSaved = [];
    return window.mmSaved;
  }
  function _guardarLocal() {
    try { localStorage.setItem('mm_saved', JSON.stringify(_mmSaved())); } catch (e) {}
  }
  function _render() {
    if (typeof window.renderDir === 'function') window.renderDir();
  }

  // -- Migracion legacy: id posicional -> slug (idempotente). Solo reescribe
  //    cuando el id resuelve a un slug real; un id no mapeable se conserva
  //    tal cual para reintentar en el siguiente render. --
  function _migrar() {
    var arr = _mmSaved(), cambio = false;
    for (var i = 0; i < arr.length; i++) {
      if (typeof arr[i] !== 'number') continue;
      var slug = _slugDeId(arr[i]);
      if (slug) { arr[i] = slug; cambio = true; }
    }
    if (cambio) _guardarLocal();
    return cambio;
  }
  function _pendientes() {
    var arr = _mmSaved(), n = 0;
    for (var i = 0; i < arr.length; i++) if (typeof arr[i] === 'number') n++;
    return n;
  }
  // Copia el primer catalogo SIN _uuid (el embebido) para resolver sus ids
  // posicionales aunque el connector ya haya reemplazado PLACES por el API.
  function _capturarEmbebido() {
    if (_embebido) return;
    var fs = _fuentes();
    for (var i = 0; i < fs.length; i++) {
      if (fs[i].length && !fs[i][0]._uuid) { _embebido = [fs[i].slice()]; return; }
    }
  }
  // Huella barata del catalogo: largo + si ya trae _uuid (catalogo del API).
  function _firma() {
    var fs = _fuentes(), out = [];
    for (var i = 0; i < fs.length; i++) {
      out.push(fs[i].length + (fs[i].length && fs[i][0]._uuid ? 'u' : '-'));
    }
    return out.join('|');
  }
  // Re-ejecutable (sin latch): reintenta si cambio el catalogo o si aun
  // quedan numericos sin mapear. Correr de nuevo sin cambios es inofensivo
  // porque _migrar() ya es idempotente.
  function _asegurarMigracion() {
    if (!_fuentes().length) return;
    _capturarEmbebido();
    var firma = _firma();
    if (firma === _firmaCatalogo && !_pendientes()) return;
    _firmaCatalogo = firma;
    if (_migrar()) _render();
  }

  // -- slug -> UUID real. Prefiere el _uuid del catalogo; si falta, lo
  //    resuelve una sola vez via /api/destinos (mismo patron que
  //    usuario-session.js.sincronizarGuardados). --
  function _cargarUuids() {
    if (_uuidCargando) return _uuidCargando;
    _uuidCargando = fetch('/api/destinos?limit=500')
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (d && d.ok && d.data) {
          d.data.forEach(function (x) {
            if (x && x.slug && _uuidRe.test(x.id || '')) _uuidCache[x.slug] = x.id;
          });
        }
        return _uuidCache;
      })
      .catch(function () { return _uuidCache; });
    return _uuidCargando;
  }
  function _uuidDeSlug(slug) {
    if (!slug) return Promise.resolve(null);
    var it = _porSlug(slug);
    if (it && _uuidRe.test(it._uuid || '')) return Promise.resolve(it._uuid);
    if (_uuidCache[slug]) return Promise.resolve(_uuidCache[slug]);
    return _cargarUuids().then(function () { return _uuidCache[slug] || null; });
  }

  // -- XP local + toast (comportamiento previo, preservado) --
  function _xpLocal() {
    try {
      var pts = JSON.parse(localStorage.getItem('user_points') || '{}');
      pts.xp = (pts.xp || 0) + 5;
      pts.saved = (pts.saved || 0) + 1;
      if (!pts.history) pts.history = [];
      pts.history.unshift({ action: 'guardar', xp: 5, label: 'Lugar guardado en Mi Mapa', ts: Date.now() });
      if (pts.history.length > 50) pts.history.length = 50;
      localStorage.setItem('user_points', JSON.stringify(pts));
    } catch (e) {}
    var t = document.getElementById('xp-dir-toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'xp-dir-toast';
      t.style.cssText = 'position:fixed;bottom:24px;right:20px;background:#111;color:#E8A020;padding:8px 16px;border-radius:5px;font-size:12px;font-weight:700;z-index:9999;border:1px solid rgba(232,160,32,.3);pointer-events:none;opacity:0;transform:translateY(20px);transition:all .2s';
      document.body.appendChild(t);
    }
    t.textContent = '+5 XP \u2014 Guardado en Mi Mapa \u2665';
    t.style.opacity = '1'; t.style.transform = 'translateY(0)';
    clearTimeout(t._t);
    t._t = setTimeout(function () {
      t.style.opacity = '0'; t.style.transform = 'translateY(20px)';
    }, 2500);
  }

  // -- Toggle de guardado: alterna local (+XP) y persiste en DB --
  function tSave(slug, btn) {
    slug = String(slug);
    var arr = _mmSaved();
    var idx = arr.indexOf(slug);
    var isNew = idx === -1;
    if (isNew) arr.push(slug); else arr.splice(idx, 1);
    if (btn) {
      btn.textContent = isNew ? '\u2665' : '\u2661';
      if (isNew) btn.classList.add('saved'); else btn.classList.remove('saved');
    }
    _guardarLocal();
    if (isNew) _xpLocal();
    var usuario = window.ExploraCO && window.ExploraCO.usuario;
    if (!usuario) return;
    _uuidDeSlug(slug).then(function (uuid) {
      if (!uuid) return;
      var fn = isNew ? window.ExploraCO.guardarDestino : window.ExploraCO.quitarGuardado;
      if (typeof fn === 'function') Promise.resolve(fn(uuid)).catch(function () {});
    });
  }

  // -- Hidratacion: guardados locales (migrados) + DB (cargarMiMapa) --
  function hidratar() {
    _asegurarMigracion();
    if (_hidratado) return;
    var usuario = window.ExploraCO && window.ExploraCO.usuario;
    if (!usuario || !usuario.id) return;
    if (typeof window.ExploraCO.cargarMiMapa !== 'function') return;
    _hidratado = true;
    Promise.resolve(window.ExploraCO.cargarMiMapa()).then(function (items) {
      var arr = _mmSaved(), nuevos = 0;
      (items || []).forEach(function (it) {
        var slug = it && it.slug;
        if (slug && arr.indexOf(slug) === -1) { arr.push(slug); nuevos++; }
      });
      if (nuevos > 0) { _guardarLocal(); _render(); }
    }).catch(function (e) {
      console.warn('[directorio] hidratacion DB fallo:', e && e.message);
    });
  }

  // -- Reaccionar al fin de carga de la sesion (hook encadenado, no
  //    se pisa un hook previo si existiera). --
  window.onExploraCOUpdate = function () {
    if (typeof _hookPrevio === 'function') {
      try { _hookPrevio(); } catch (e) {}
    }
    try { hidratar(); } catch (e) {}
  };

  // -- Reintentar en cada render (idempotente): cubre que el catalogo
  //    o la sesion terminen de cargar despues de este script. --
  var _origRenderDir = window.renderDir;
  if (typeof _origRenderDir === 'function') {
    window.renderDir = function () {
      var r = _origRenderDir.apply(this, arguments);
      hidratar();
      return r;
    };
  }

  // Reemplaza la definicion local de tSave de cada HTML.
  window.tSave = tSave;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', hidratar);
  } else {
    hidratar();
  }
}());
