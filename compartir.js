/**
 * ExploraCO - Boton Compartir (asset estatico, NO funcion serverless).
 *
 * Expone window.ExploraCompartir = { VERSION, init, compartir }.
 * Reusa la sesion y el toast de usuario-session.js (window.ExploraCO):
 *  - window.ExploraCO.usuario / authHeaders() / mostrarToast().
 *  - NO crea su propio sistema de toast.
 *
 * Auto-init en DOMContentLoaded: monta todo [data-share] leyendo
 * data-share-fuente / -item / -slug / -title.
 *
 * ES5 estricto, ASCII-safe (cero bytes > 127, cero backticks) y sin
 * template literals. Los acentos van como escapes Unicode simples.
 */
(function () {
  'use strict';

  var VERSION = '1';
  var BASE_URL = 'https://exploraco.co/';
  var POP_CLASS = 'share-pop';
  var STYLE_ID = 'exploraco-share-style';

  // -- Sesion (reusa usuario-session.js) ----------------------
  function usuarioIdDe() {
    var u = (window.ExploraCO && window.ExploraCO.usuario) ? window.ExploraCO.usuario : null;
    return (u && u.id) ? String(u.id) : '';
  }

  function authHeaders() {
    if (window.ExploraCO && typeof window.ExploraCO.authHeaders === 'function') {
      try { return window.ExploraCO.authHeaders() || {}; }
      catch (e) { if (window.console) console.warn('[compartir] authHeaders', e); }
    }
    return {};
  }

  function aviso(msg, color) {
    if (window.ExploraCO && typeof window.ExploraCO.mostrarToast === 'function') {
      window.ExploraCO.mostrarToast(msg, color);
      return;
    }
    if (window.console) console.log('[compartir] ' + msg);
  }

  // -- URL canonica -------------------------------------------
  function urlCanonica(slug) {
    var s = String(slug || '').trim();
    if (!s) return '';
    if (/^https?:\/\//i.test(s)) return s;
    s = s.replace(/^\/+/, '');
    if (!/\.html$/i.test(s)) s += '.html';
    return BASE_URL + s;
  }

  function textoPorDefecto(titulo) {
    return titulo ? ('Mira ' + titulo + ' en ExploraCO') : 'Descubre este destino en ExploraCO';
  }

  // -- Normalizacion del contexto -----------------------------
  function normalizarCtx(ctx) {
    var c = ctx || {};
    var titulo = c.titulo ? String(c.titulo) : '';
    return {
      usuarioId: c.usuarioId ? String(c.usuarioId) : usuarioIdDe(),
      destinoId: c.destinoId ? String(c.destinoId) : (c.itemId ? String(c.itemId) : ''),
      fuente: c.fuente ? String(c.fuente) : 'destino',
      itemId: c.itemId ? String(c.itemId) : '',
      url: c.url ? String(c.url) : urlCanonica(c.slug),
      titulo: titulo,
      texto: c.texto ? String(c.texto) : textoPorDefecto(titulo)
    };
  }

  // -- Registro de XP (best effort; nunca rompe el compartir) --
  function registrarXp(c, canal) {
    if (!c.usuarioId) {
      aviso('Inicia sesi\u00f3n para ganar XP', '#E8A020');
      return;
    }
    var headers = { 'Content-Type': 'application/json' };
    var auth = authHeaders();
    for (var k in auth) {
      if (Object.prototype.hasOwnProperty.call(auth, k)) headers[k] = auth[k];
    }
    var body = {
      tipo: 'compartir',
      usuario_id: c.usuarioId,
      destino_id: c.destinoId,
      fuente: c.fuente,
      item_id: String(c.itemId || c.destinoId || ''),
      canal: canal
    };
    fetch('/api/interacciones', { method: 'POST', headers: headers, body: JSON.stringify(body) })
      .then(function (r) {
        return r.json().then(
          function (d) { return { status: r.status, data: d }; },
          function () { return { status: r.status, data: {} }; }
        );
      })
      .then(function (res) {
        var data = (res && res.data) ? res.data : {};
        if (res && res.status === 401) { aviso('Inicia sesi\u00f3n para ganar XP', '#E8A020'); return; }
        if (!data.ok) return;
        if (data.tope_diario) { aviso('Cupo diario de XP alcanzado', '#E8A020'); return; }
        if (data.xp > 0) { aviso('+' + data.xp + ' XP', '#16a34a'); }
        // Misiones y logros nuevos + sincronizacion de XP local: delega
        // en usuario-session.js para no duplicar la acreditacion ni los
        // toasts (el backend los devuelve tras evaluar tras compartir).
        if (window.ExploraCO && typeof window.ExploraCO.aplicarResultadoXp === 'function') {
          window.ExploraCO.aplicarResultadoXp(data);
        }
      })
      .catch(function (e) {
        if (window.console) console.warn('[compartir] registrarXp', e);
      });
  }

  // -- Portapapeles (clipboard API + fallback textarea) -------
  function copiarLegacy(txt) {
    try {
      var ta = document.createElement('textarea');
      ta.value = txt;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.top = '0';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      var ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return !!ok;
    } catch (e) {
      if (window.console) console.warn('[compartir] copiarLegacy', e);
      return false;
    }
  }

  function copiarTexto(txt) {
    return new Promise(function (resolve) {
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(txt).then(
            function () { resolve(true); },
            function () { resolve(copiarLegacy(txt)); }
          );
          return;
        }
      } catch (e) {
        if (window.console) console.warn('[compartir] clipboard', e);
      }
      resolve(copiarLegacy(txt));
    });
  }

  // -- Popover fallback (.share-pop) --------------------------
  var popActual = null;

  function inyectarEstilos() {
    if (document.getElementById(STYLE_ID)) return;
    var css = '.share-pop{position:fixed;z-index:9999;left:50%;bottom:32px;transform:translateX(-50%);'
      + 'background:#fff;border:1px solid #EDE8E0;border-radius:10px;box-shadow:0 12px 40px rgba(0,0,0,.18);'
      + 'padding:10px;display:flex;gap:8px;align-items:center}'
      + '.share-pop-btn{background:#111;color:#fff;border:none;border-radius:4px;padding:9px 16px;'
      + 'font-family:\'Barlow Condensed\',sans-serif;font-size:13px;font-weight:800;letter-spacing:.6px;'
      + 'text-transform:uppercase;cursor:pointer}'
      + '.share-pop-btn:hover{background:#333}'
      + '.share-pop-close{background:none;border:none;color:#888;font-size:12px;cursor:pointer}';
    var st = document.createElement('style');
    st.id = STYLE_ID;
    st.appendChild(document.createTextNode(css));
    document.head.appendChild(st);
  }

  function cerrarPopover() {
    if (popActual && popActual.parentNode) popActual.parentNode.removeChild(popActual);
    popActual = null;
  }

  function abrirPopover(c, done) {
    cerrarPopover();
    inyectarEstilos();

    var pop = document.createElement('div');
    pop.className = POP_CLASS;

    var wa = document.createElement('button');
    wa.type = 'button';
    wa.className = 'share-pop-btn';
    wa.textContent = 'WhatsApp';

    var cp = document.createElement('button');
    cp.type = 'button';
    cp.className = 'share-pop-btn';
    cp.textContent = 'Copiar link';

    var cl = document.createElement('button');
    cl.type = 'button';
    cl.className = 'share-pop-close';
    cl.textContent = 'Cerrar';

    wa.onclick = function () {
      cerrarPopover();
      var texto = (c.titulo ? c.titulo + ' ' : '') + c.url;
      try { window.open('https://wa.me/?text=' + encodeURIComponent(texto), '_blank'); }
      catch (e) { if (window.console) console.warn('[compartir] whatsapp', e); }
      registrarXp(c, 'whatsapp');
      if (done) done({ canal: 'whatsapp' });
    };

    cp.onclick = function () {
      copiarTexto(c.url).then(function (ok) {
        cerrarPopover();
        aviso(ok ? 'Enlace copiado' : 'No se pudo copiar el enlace', ok ? '#16a34a' : '#ef4444');
        registrarXp(c, 'copiar');
        if (done) done({ canal: 'copiar' });
      });
    };

    cl.onclick = function () {
      cerrarPopover();
      if (done) done({ cancelado: true });
    };

    pop.appendChild(wa);
    pop.appendChild(cp);
    pop.appendChild(cl);
    document.body.appendChild(pop);
    popActual = pop;
  }

  // -- API publica --------------------------------------------
  function compartir(ctx) {
    return new Promise(function (resolve) {
      var c = normalizarCtx(ctx);
      if (navigator && typeof navigator.share === 'function') {
        navigator.share({ title: c.titulo || 'ExploraCO', text: c.texto || '', url: c.url || '' }).then(
          function () {
            registrarXp(c, 'web_share');
            resolve({ canal: 'web_share' });
          },
          function (err) {
            // El usuario cancelo: NO se registra XP ni se hace POST.
            if (err && err.name === 'AbortError') { resolve({ cancelado: true }); return; }
            if (window.console) console.warn('[compartir] navigator.share', err);
            abrirPopover(c, resolve);
          }
        );
        return;
      }
      abrirPopover(c, resolve);
    });
  }

  function leerCtx(btn) {
    if (!btn || !btn.getAttribute) return {};
    var slug = btn.getAttribute('data-share-slug') || '';
    var item = btn.getAttribute('data-share-item') || '';
    return {
      fuente: btn.getAttribute('data-share-fuente') || 'destino',
      itemId: item,
      destinoId: item,
      slug: slug,
      titulo: btn.getAttribute('data-share-title') || '',
      url: urlCanonica(slug)
    };
  }

  function init(btn, ctx) {
    if (btn && typeof btn.addEventListener === 'function' && !btn.getAttribute('data-share-mount')) {
      btn.setAttribute('data-share-mount', '1');
      btn.addEventListener('click', function (ev) {
        ev.preventDefault();
        compartir(ctx ? normalizarCtx(ctx) : leerCtx(btn));
      });
    }
    return ctx ? normalizarCtx(ctx) : leerCtx(btn);
  }

  function autoInit() {
    var btns = document.querySelectorAll('[data-share]');
    for (var i = 0; i < btns.length; i++) init(btns[i], null);
  }

  window.ExploraCompartir = {
    VERSION: VERSION,
    init: init,
    compartir: compartir
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoInit);
  } else {
    autoInit();
  }
})();
