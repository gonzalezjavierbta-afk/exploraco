/* media-actions.js - ExploraCO
 * Abstraccion compartida de acciones de media (voto + guardado).
 * Sustituye la logica duplicada de galeria.html (Regla de No-Duplicidad).
 *
 * API PUBLICA (contrato fijo):
 *
 *   window.MediaActions.voto(btn, ctx)
 *     ctx = {fuente, itemId, votos, yaVotado, esPropia}
 *     - Sin usuario (window.ExploraCO.usuario.id) -> opts.pedirLogin (o login por defecto).
 *     - ctx.esPropia -> toast informativo y return.
 *     - accion = ctx.yaVotado ? 'unlike' : 'like'.
 *     - POST /api/interacciones {tipo:'media_voto', usuario_id, fuente, item_id, accion}
 *       con Authorization: Bearer (window.ExploraCO.authHeaders()).
 *     - Pinta contador/clase/estado en el boton y devuelve la promesa.
 *
 *   window.MediaActions.guardar(btn, ctx)
 *     ctx = {fuente, itemId, yaGuardado}
 *     - POST {tipo: yaGuardado ? 'quitar_guardado_media' : 'guardar_media', usuario_id, fuente, item_id}
 *       (mismo endpoint; se envia Bearer igual que hacia galeria.html).
 *     - Maneja 503 ('guardados no disponibles todavia'), 400/401, red.
 *
 *   window.MediaActions.sync(root)
 *     - Pinta estado inicial de [data-ma-voto] / [data-ma-save] dentro de root
 *       leyendo solo los data-ma-* del propio boton.
 *
 *   window.MediaActions.bind(root, opts)
 *     opts = {toast: fn(msg,color), pedirLogin: fn(msg)}
 *     - UN solo listener de click delegado en root (closest). Evita doble bind
 *       marcando root.__maBound. Los opts quedan activos a nivel de modulo
 *       (el ultimo bind gana) y son usados tambien por voto()/guardar().
 *     - Sin opts usa un toast minimo propio: window.ExploraCO.mostrarToast si
 *       existe; si no, console.warn (y alert como ultimo recurso).
 *
 * Atributos DATA (contrato de marcado):
 *   Like:    data-ma-voto data-ma-fuente="album_foto" data-ma-item="<id>"
 *            data-ma-votos="N" data-ma-ya-votado="0|1" data-ma-es-propia="0|1"
 *   Guardar: data-ma-save data-ma-fuente="album_foto" data-ma-item="<id>"
 *            data-ma-ya-guardado="0|1"
 *   Opcionales dentro del boton:
 *            [data-ma-count] -> recibe el contador de votos.
 *            [data-ma-label] -> recibe el texto Guardar/Guardado.
 *
 * ASCII-safe (ADR-002): sin caracteres > 127 ni backticks.
 */
(function () {
  'use strict';

  var OPT = {};

  function toast(msg, color) {
    if (OPT && typeof OPT.toast === 'function') { OPT.toast(msg, color); return; }
    if (window.ExploraCO && typeof window.ExploraCO.mostrarToast === 'function') {
      window.ExploraCO.mostrarToast(msg, color);
      return;
    }
    if (window.console && window.console.warn) { window.console.warn('[media-actions] ' + msg); return; }
    if (window.alert) { window.alert(msg); }
  }

  function pedirLogin(msg) {
    if (OPT && typeof OPT.pedirLogin === 'function') { OPT.pedirLogin(msg); return; }
    toast(msg, '#E8A020');
    if (window.ExploraCO && typeof window.ExploraCO.mostrarLogin === 'function') {
      window.ExploraCO.mostrarLogin();
    }
  }

  function usuarioId() {
    var u = window.ExploraCO && window.ExploraCO.usuario;
    return (u && u.id) ? String(u.id) : null;
  }

  function authHeaders() {
    if (window.ExploraCO && typeof window.ExploraCO.authHeaders === 'function') {
      try { return window.ExploraCO.authHeaders() || {}; }
      catch (e) { if (window.console && window.console.warn) { window.console.warn('[media-actions] authHeaders', e); } }
    }
    return {};
  }

  function postJson(body, withAuth) {
    var headers = { 'Content-Type': 'application/json' };
    if (withAuth) {
      var auth = authHeaders();
      for (var k in auth) {
        if (Object.prototype.hasOwnProperty.call(auth, k)) { headers[k] = auth[k]; }
      }
    }
    return fetch('/api/interacciones', { method: 'POST', headers: headers, body: JSON.stringify(body) })
      .then(function (r) {
        return r.json().catch(function () {
          return { ok: false, error: 'Respuesta invalida del servidor' };
        }).then(function (j) {
          j = j || {};
          j.__status = r.status;
          return j;
        });
      });
  }

  function raiz(root) {
    if (!root) { return null; }
    if (typeof root === 'string') { return document.querySelector(root); }
    return root;
  }

  function num(v) {
    var n = parseInt(v, 10);
    return isNaN(n) ? 0 : n;
  }

  function flag(btn, name) {
    return !!btn && btn.getAttribute(name) === '1';
  }

  function normalizarVoto(btn, ctx) {
    var src = ctx || {};
    var out = {
      fuente: src.fuente || (btn ? btn.getAttribute('data-ma-fuente') : '') || '',
      itemId: (src.itemId != null ? String(src.itemId) : '') || (btn ? btn.getAttribute('data-ma-item') : '') || '',
      votos: (src.votos != null ? num(src.votos) : (btn && btn.hasAttribute('data-ma-votos') ? num(btn.getAttribute('data-ma-votos')) : 0)),
      yaVotado: src.yaVotado != null ? !!src.yaVotado : flag(btn, 'data-ma-ya-votado'),
      esPropia: src.esPropia != null ? !!src.esPropia : flag(btn, 'data-ma-es-propia')
    };
    return out;
  }

  function normalizarSave(btn, ctx) {
    var src = ctx || {};
    var out = {
      fuente: src.fuente || (btn ? btn.getAttribute('data-ma-fuente') : '') || '',
      itemId: (src.itemId != null ? String(src.itemId) : '') || (btn ? btn.getAttribute('data-ma-item') : '') || '',
      yaGuardado: src.yaGuardado != null ? !!src.yaGuardado : flag(btn, 'data-ma-ya-guardado')
    };
    return out;
  }

  function pintarVoto(btn, ctx) {
    if (!btn) { return; }
    btn.setAttribute('data-ma-votos', String(ctx.votos));
    btn.setAttribute('data-ma-ya-votado', ctx.yaVotado ? '1' : '0');
    btn.setAttribute('data-ma-es-propia', ctx.esPropia ? '1' : '0');
    var contador = btn.querySelector('[data-ma-count]');
    if (contador) { contador.textContent = String(ctx.votos); }
    else { btn.textContent = '\u2B50 ' + ctx.votos; }
    if (ctx.yaVotado) { btn.classList.add('on'); } else { btn.classList.remove('on'); }
    btn.setAttribute('aria-pressed', ctx.yaVotado ? 'true' : 'false');
    if (ctx.esPropia) { btn.disabled = true; }
  }

  function pintarSave(btn, ctx) {
    if (!btn) { return; }
    btn.setAttribute('data-ma-ya-guardado', ctx.yaGuardado ? '1' : '0');
    var label = btn.querySelector('[data-ma-label]');
    if (label) { label.textContent = ctx.yaGuardado ? 'Guardado' : 'Guardar'; }
    else { btn.textContent = ctx.yaGuardado ? 'Guardado' : 'Guardar'; }
    if (ctx.yaGuardado) { btn.classList.add('on'); } else { btn.classList.remove('on'); }
    btn.setAttribute('aria-pressed', ctx.yaGuardado ? 'true' : 'false');
  }

  function voto(btn, ctx) {
    if (!btn) { return Promise.resolve(null); }
    var c = normalizarVoto(btn, ctx);
    if (!c.itemId) { return Promise.resolve(null); }
    var uid = usuarioId();
    if (!uid) { pedirLogin('Inicia sesi\u00f3n para votar esta foto.'); return Promise.resolve(null); }
    if (c.esPropia) { toast('No puedes votar tu propia foto.', '#E8A020'); return Promise.resolve(null); }
    var accion = c.yaVotado ? 'unlike' : 'like';
    btn.disabled = true;
    return postJson({ tipo: 'media_voto', usuario_id: uid, fuente: c.fuente, item_id: c.itemId, accion: accion }, true)
      .then(function (res) {
        btn.disabled = !!c.esPropia;
        if (res.ok) {
          c.yaVotado = !!res.ya_votado;
          c.votos = num(res.votos);
          pintarVoto(btn, c);
          if (res.xp > 0) { toast('+' + res.xp + ' XP', '#16a34a'); }
          return res;
        }
        if (res.__status === 409) { c.yaVotado = true; pintarVoto(btn, c); return res; }
        if (res.__status === 400 || res.__status === 401) { pedirLogin('Inicia sesi\u00f3n para votar esta foto.'); return res; }
        if (res.__status === 429) { toast(res.error || 'Limite de votos por dia alcanzado', '#E8A020'); return res; }
        toast(res.error || 'No se pudo registrar tu voto', '#ef4444');
        return res;
      })
      .catch(function (e) {
        btn.disabled = !!c.esPropia;
        if (window.console && window.console.warn) { window.console.warn('[media-actions] voto', e); }
        toast('Error de red al votar', '#ef4444');
        return null;
      });
  }

  function guardar(btn, ctx) {
    if (!btn) { return Promise.resolve(null); }
    var c = normalizarSave(btn, ctx);
    if (!c.itemId) { return Promise.resolve(null); }
    var uid = usuarioId();
    if (!uid) { pedirLogin('Inicia sesi\u00f3n para guardar esta foto.'); return Promise.resolve(null); }
    var tipo = c.yaGuardado ? 'quitar_guardado_media' : 'guardar_media';
    btn.disabled = true;
    return postJson({ tipo: tipo, usuario_id: uid, fuente: c.fuente, item_id: c.itemId }, true)
      .then(function (res) {
        btn.disabled = false;
        if (!res.ok) {
          if (res.__status === 503) { toast('Los guardados no estan disponibles todavia', '#E8A020'); return res; }
          if (res.__status === 400 || res.__status === 401) { pedirLogin('Inicia sesi\u00f3n para guardar esta foto.'); return res; }
          toast(res.error || 'No se pudo guardar', '#ef4444');
          return res;
        }
        c.yaGuardado = (res.guardado === undefined) ? !c.yaGuardado : !!res.guardado;
        pintarSave(btn, c);
        toast(c.yaGuardado ? 'Guardado en Tu Mapa' : 'Quitado de tus guardados', c.yaGuardado ? '#E8A020' : '#888');
        return res;
      })
      .catch(function (e) {
        btn.disabled = false;
        if (window.console && window.console.warn) { window.console.warn('[media-actions] guardar', e); }
        toast('Error de red al guardar', '#ef4444');
        return null;
      });
  }

  function sync(root) {
    var el = raiz(root);
    if (!el) { return; }
    var i, listV, listS;
    listV = el.querySelectorAll('[data-ma-voto]');
    for (i = 0; i < listV.length; i++) { pintarVoto(listV[i], normalizarVoto(listV[i], null)); }
    listS = el.querySelectorAll('[data-ma-save]');
    for (i = 0; i < listS.length; i++) { pintarSave(listS[i], normalizarSave(listS[i], null)); }
    if (el.getAttribute && el.getAttribute('data-ma-voto') !== null) { pintarVoto(el, normalizarVoto(el, null)); }
    if (el.getAttribute && el.getAttribute('data-ma-save') !== null) { pintarSave(el, normalizarSave(el, null)); }
  }

  function bind(root, opts) {
    var el = raiz(root);
    if (!el) { return false; }
    if (opts && typeof opts === 'object') { OPT = opts; }
    if (el.__maBound) { return false; }
    el.__maBound = true;
    el.addEventListener('click', function (ev) {
      var target = ev.target;
      if (!target || typeof target.closest !== 'function') { return; }
      var b = target.closest('[data-ma-voto], [data-ma-save]');
      if (!b || !el.contains(b)) { return; }
      if (b.getAttribute('data-ma-voto') !== null) { voto(b, null); return; }
      if (b.getAttribute('data-ma-save') !== null) { guardar(b, null); }
    });
    return true;
  }

  window.MediaActions = {
    voto: voto,
    guardar: guardar,
    sync: sync,
    bind: bind
  };
})();
