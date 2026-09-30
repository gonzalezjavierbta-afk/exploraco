/* mapa-fullscreen.js - Control de pantalla completa para los mapas de LATAWEL
 *
 * Un solo control reutilizable por index.html (mapa cultural) y admin.html
 * (mini-mapa del editor + map-picker modal). Evita duplicar la logica y NO
 * toca los motores compartidos (mapa-cultural.js / map-picker.js).
 *
 * USO:
 *   window.MapaFullscreen.attach({
 *     target: 'mapa-map-container',        // id del contenedor que aloja el mapa
 *     mapEl:  'leaflet-map',               // opcional: id del div Leaflet que
 *                                          // debe llenar el contenedor al entrar
 *     getMap: function () { return mc; },  // devuelve la instancia Leaflet o null
 *     label:  'Pantalla completa del mapa' // aria-label / title del boton
 *   });
 *
 * COMPORTAMIENTO:
 *   - Inyecta un boton arriba-derecha DENTRO del target. La esquina
 *     superior-derecha esta libre en los mapas del proyecto (arriba-izquierda
 *     la ocupa el zoom de Leaflet y abajo-derecha la atribucion).
 *   - Fullscreen API nativa cuando existe; si no (iPhone Safari), fallback por
 *     clase CSS (.mfs-pseudo) que fija el contenedor al viewport.
 *   - Al entrar y salir llama map.invalidateSize(): el motor NO observa el
 *     tamano del contenedor, asi que el re-encuadre es responsabilidad de este
 *     control. Sin eso el mapa queda en blanco/desplazado.
 *   - ESC cierra en ambos modos. El boton alterna entre expandir y cerrar (X) y
 *     es tactil (44px) en pantallas <=860px.
 *   - Idempotente: llamar attach dos veces sobre el mismo target reusa la
 *     instancia. Si el boton fue removido (innerHTML de un host), se reinserta.
 *
 * NOTAS DE COMPATIBILIDAD:
 *   - ASCII puro (ADR-002): sin tildes, sin emojis literales (escapes \u),
 *     sin backticks. Los iconos son \u26F6 (expandir) y \u2715 (cerrar).
 *   - IIFE ES5 (ADR-001, sin frameworks). CommonJS: module.exports + window.
 *   - node --check valido (document/window/L solo se tocan en runtime).
 */
(function (root) {
  'use strict';

  var CSS_ID = 'mapa-fullscreen-css';
  var BTN_CLS = 'mfs-btn';
  var ON_CLS = 'mfs-on';
  var PSEUDO_CLS = 'mfs-pseudo';
  var EXPAND_ICON = '\u26F6';
  var CLOSE_ICON = '\u2715';

  var CSS = [
    '.mfs-btn{position:absolute;top:10px;right:10px;z-index:1000;width:34px;height:34px;padding:0;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,.92);border:1px solid rgba(0,0,0,.2);border-radius:4px;box-shadow:0 1px 5px rgba(0,0,0,.4);color:#333;font-size:17px;line-height:1;cursor:pointer;transition:background .15s,color .15s;font-family:inherit}',
    '.mfs-btn:hover{background:#fff}',
    '.mfs-btn:focus-visible{outline:2px solid #FF4A00;outline-offset:1px}',
    '.mfs-btn.mfs-on{background:rgba(20,24,30,.92);color:#fff;border-color:rgba(255,255,255,.3)}',
    '.mfs-pseudo{position:fixed;inset:0;z-index:10000;width:100%;height:100%;background:#0D1520}',
    '@media(max-width:860px){.mfs-btn{width:44px;height:44px;font-size:22px;top:8px;right:8px}}'
  ].join('\n');

  function injectCss() {
    if (typeof document === 'undefined') return;
    if (document.getElementById(CSS_ID)) return;
    var st = document.createElement('style');
    st.id = CSS_ID;
    st.type = 'text/css';
    st.appendChild(document.createTextNode(CSS));
    var head = document.head || document.documentElement;
    if (head) head.appendChild(st);
  }

  function fsElement() {
    if (typeof document === 'undefined') return null;
    return document.fullscreenElement
      || document.webkitFullscreenElement
      || document.msFullscreenElement
      || null;
  }

  function requestFs(el) {
    var fn = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
    if (!fn) return null;
    try {
      var p = fn.call(el);
      return (p && typeof p.catch === 'function') ? p : null;
    } catch (e) {
      return null;
    }
  }

  function exitFs() {
    var fn = document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen;
    if (!fn) return null;
    try {
      var p = fn.call(document);
      return (p && typeof p.catch === 'function') ? p : null;
    } catch (e) {
      return null;
    }
  }

  function hasNativeFs(el) {
    return !!((el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen)
      && (document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen));
  }

  function attach(opts) {
    if (typeof document === 'undefined') return null;
    opts = opts || {};
    var targetId = opts.target;
    if (!targetId) return null;
    var el = document.getElementById(targetId);
    if (!el) return null;

    injectCss();

    var getMap = (typeof opts.getMap === 'function') ? opts.getMap : null;
    var label = opts.label || 'Pantalla completa';
    var closeLabel = opts.closeLabel || 'Salir de pantalla completa';
    var mapEl = opts.mapEl ? document.getElementById(opts.mapEl) : null;

    /* Ya adjunto: si el boton sigue en el DOM, reusar; si un host lo borro
       (innerHTML=''), reinsertarlo y devolver la misma API. */
    if (el.__mfsApi) {
      var prev = el.__mfsApi;
      if (prev.button && prev.button.parentNode !== el) el.appendChild(prev.button);
      return prev;
    }

    var pseudo = false;
    var saved = null;

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = BTN_CLS;
    btn.setAttribute('aria-label', label);
    btn.title = label;
    btn.setAttribute('aria-pressed', 'false');
    btn.textContent = EXPAND_ICON;

    function isActive() {
      return pseudo || fsElement() === el;
    }

    function applyFill() {
      if (saved) return;
      saved = { t: el.style.width, th: el.style.height };
      el.style.width = '100%';
      el.style.height = '100%';
      if (mapEl && mapEl !== el) {
        saved.mw = mapEl.style.width;
        saved.mh = mapEl.style.height;
        mapEl.style.width = '100%';
        mapEl.style.height = '100%';
      }
    }

    function restoreFill() {
      if (!saved) return;
      el.style.width = saved.t;
      el.style.height = saved.th;
      if (mapEl && mapEl !== el) {
        mapEl.style.width = saved.mw;
        mapEl.style.height = saved.mh;
      }
      saved = null;
    }

    function invalidate() {
      var map = getMap ? getMap() : null;
      if (!map || typeof map.invalidateSize !== 'function') return;
      try { map.invalidateSize(); } catch (e) { /* el mapa aun no existe */ }
    }

    function ping() {
      invalidate();
      setTimeout(invalidate, 80);
      setTimeout(invalidate, 280);
    }

    function sync() {
      var on = isActive();
      btn.textContent = on ? CLOSE_ICON : EXPAND_ICON;
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      var lbl = on ? closeLabel : label;
      btn.setAttribute('aria-label', lbl);
      btn.title = lbl;
      if (on) btn.className = BTN_CLS + ' ' + ON_CLS;
      else btn.className = BTN_CLS;
    }

    function enterPseudo() {
      pseudo = true;
      el.classList.add(PSEUDO_CLS);
      if (document.body) document.body.style.overflow = 'hidden';
      applyFill();
      sync();
      ping();
    }

    function exitPseudo() {
      pseudo = false;
      el.classList.remove(PSEUDO_CLS);
      if (document.body) document.body.style.overflow = '';
      restoreFill();
      sync();
      ping();
    }

    function enter() {
      if (isActive()) return;
      if (!hasNativeFs(el)) { enterPseudo(); return; }
      var p = requestFs(el);
      if (p && typeof p.catch === 'function') { p.catch(function () { enterPseudo(); }); }
    }

    function exit() {
      if (pseudo) { exitPseudo(); return; }
      if (fsElement() === el) {
        var p = exitFs();
        if (p && typeof p.catch === 'function') { p.catch(function () {}); }
      }
    }

    function toggle() {
      if (isActive()) exit(); else enter();
    }

    function onFsChange() {
      if (pseudo && fsElement() === el) exitPseudo();
      sync();
      ping();
    }

    function onKey(e) {
      if (!pseudo) return;
      var k = e.key || e.keyCode;
      if (k === 'Escape' || k === 'Esc' || k === 27) exitPseudo();
    }

    btn.addEventListener('click', function (ev) {
      if (ev && ev.preventDefault) ev.preventDefault();
      toggle();
    });
    document.addEventListener('fullscreenchange', onFsChange);
    document.addEventListener('webkitfullscreenchange', onFsChange);
    document.addEventListener('keydown', onKey);

    el.appendChild(btn);

    var api = {
      el: el,
      button: btn,
      toggle: toggle,
      enter: enter,
      exit: exit,
      isActive: isActive,
      destroy: function () {
        if (fsElement() === el) exitFs();
        if (pseudo) exitPseudo();
        document.removeEventListener('fullscreenchange', onFsChange);
        document.removeEventListener('webkitfullscreenchange', onFsChange);
        document.removeEventListener('keydown', onKey);
        if (btn.parentNode) btn.parentNode.removeChild(btn);
        el.__mfsApi = null;
      }
    };
    el.__mfsApi = api;
    return api;
  }

  var MapaFullscreen = { attach: attach, version: '1.0.0' };

  if (typeof module === 'object' && module.exports) module.exports = MapaFullscreen;
  root.MapaFullscreen = MapaFullscreen;

})(typeof window !== 'undefined' ? window : this);
