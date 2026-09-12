/**
 * ExploraCO - album-comments.js
 * Componente compartido de comentarios sobre la media de albumes (ADR-023).
 *
 * Contrato:
 *   window.AlbumComments.mount(target, fotoId, opts)
 *     target   selector CSS o elemento DOM (se limpia y se renderiza)
 *     fotoId   id de album_fotos (la media comentada)
 *     opts     { usuarioId: string|null, compact: bool, maxIndent: 3,
 *                admin: bool, onCountChange: function(total) }
 *
 * Backend (api/interacciones.js, sin endpoints nuevos):
 *   GET  ?tipo=comentarios_foto&foto_id=<id>[&usuario_id=<id>]
 *   POST  tipo=comentario_foto    {usuario_id,foto_id,texto,parent_id}
 *   POST  tipo=comentario_voto    {usuario_id,comentario_id,accion}
 *   POST  tipo=comentario_eliminar{usuario_id,comentario_id}
 *
 * ASCII-safe, ES5, sin backticks y sin console.log. El CSS propio usa
 * prefijo .ac- (scoped, ADR-004) y se inyecta una sola vez.
 */
(function () {
  'use strict';

  if (window.AlbumComments) { return; }

  var AC_STYLE_ID = 'ac-styles';
  var AC_DEFAULT_MAX_INDENT = 3;
  var AC_INDENT_PX = 16;
  var AC_MAX_LEN = 1000;
  var AC_PALETTE = [
    ['#1a2e4a', '#7eb8f0'],
    ['#0a2a1a', '#7ef0b8'],
    ['#3a1a0a', '#f0a87e'],
    ['#2a1a3a', '#c9a0f0'],
    ['#3a2a0a', '#e0c07e'],
    ['#0a2a3a', '#7ed0f0']
  ];

  var AC_CSS = [
    '.ac-root{font-family:\'Outfit\',sans-serif;color:#fff;font-size:13px;line-height:1.55;text-align:left;-webkit-font-smoothing:antialiased}',
    '.ac-root *{box-sizing:border-box}',
    '.ac-root button{font-family:inherit}',
    '.ac-root button:focus-visible,.ac-root textarea:focus-visible{outline:2px solid #E8A020;outline-offset:2px}',
    '.ac-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}',
    '.ac-title{display:flex;align-items:center;gap:8px;font-family:\'Barlow Condensed\',sans-serif;font-size:17px;font-weight:900;text-transform:uppercase;letter-spacing:1.4px;color:#fff}',
    '.ac-count{font-family:\'Outfit\',sans-serif;font-size:11px;font-weight:700;letter-spacing:0;background:rgba(232,160,32,.16);color:#E8A020;border:1px solid rgba(232,160,32,.3);border-radius:20px;padding:1px 9px}',
    '.ac-form,.ac-reply-form{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.09);border-radius:10px;padding:10px}',
    '.ac-form{margin-bottom:16px}',
    '.ac-inp{width:100%;background:rgba(0,0,0,.25);border:1px solid rgba(255,255,255,.12);border-radius:7px;padding:9px 11px;color:#fff;font-family:\'Outfit\',sans-serif;font-size:12.5px;line-height:1.5;outline:none;resize:vertical;transition:border-color .15s}',
    '.ac-inp:focus{border-color:#E8A020}',
    '.ac-inp::placeholder{color:rgba(255,255,255,.35)}',
    '.ac-form-row{display:flex;align-items:center;gap:10px;margin-top:8px}',
    '.ac-msg{flex:1;font-size:11px;color:#f87171;min-height:14px}',
    '.ac-btn{background:#E8A020;color:#111;border:none;border-radius:6px;padding:8px 16px;font-family:\'Barlow Condensed\',sans-serif;font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:1px;cursor:pointer;transition:opacity .15s}',
    '.ac-btn:hover{opacity:.88}',
    '.ac-btn:disabled{opacity:.5;cursor:default}',
    '.ac-btn-ghost{background:transparent;border:1px solid rgba(232,160,32,.4);color:#E8A020}',
    '.ac-btn-ghost:hover{background:rgba(232,160,32,.12);opacity:1}',
    '.ac-cta{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;background:rgba(232,160,32,.07);border:1px solid rgba(232,160,32,.25);border-radius:10px;padding:12px 14px;margin-bottom:16px}',
    '.ac-cta-text{font-size:12px;color:rgba(255,255,255,.72)}',
    '.ac-list{display:flex;flex-direction:column;gap:2px}',
    '.ac-row{display:flex;gap:9px;align-items:flex-start;padding:7px 0}',
    '.ac-av{width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:\'Barlow Condensed\',sans-serif;font-size:12px;font-weight:900;flex-shrink:0;overflow:hidden}',
    '.ac-av img{width:100%;height:100%;object-fit:cover;display:block}',
    '.ac-body{flex:1;min-width:0}',
    '.ac-meta{display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;margin-bottom:2px}',
    '.ac-name{font-family:\'Barlow Condensed\',sans-serif;font-size:13px;font-weight:900;color:#fff;letter-spacing:.3px}',
    '.ac-time{font-size:10px;color:rgba(255,255,255,.35)}',
    '.ac-text{font-size:12.5px;color:rgba(255,255,255,.82);line-height:1.55;overflow-wrap:break-word;word-wrap:break-word}',
    '.ac-deleted{font-style:italic;color:rgba(255,255,255,.32)}',
    '.ac-actions{display:flex;align-items:center;gap:14px;margin-top:5px;flex-wrap:wrap}',
    '.ac-act{background:none;border:none;padding:0;color:rgba(255,255,255,.5);font-size:11px;font-weight:600;cursor:pointer;transition:color .12s}',
    '.ac-act:hover{color:#E8A020}',
    '.ac-act:disabled{color:rgba(255,255,255,.22);cursor:default}',
    '.ac-act.ac-on{color:#E8A020}',
    '.ac-act.ac-danger:hover{color:#f87171}',
    '.ac-reply-slot{margin-top:6px}',
    '.ac-empty,.ac-error{padding:22px 14px;text-align:center;font-size:12px;border-radius:10px}',
    '.ac-empty{color:rgba(255,255,255,.4);border:1px dashed rgba(255,255,255,.12)}',
    '.ac-error{color:#fca5a5;background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.25)}',
    '.ac-root.ac-compact{font-size:12px}',
    '.ac-root.ac-compact .ac-av{width:26px;height:26px;font-size:10px}',
    '.ac-root.ac-compact .ac-row{padding:4px 0}',
    '.ac-root.ac-compact .ac-form{padding:8px;margin-bottom:12px}',
    '.ac-btn-count{font-family:\'Outfit\',sans-serif;font-size:10px;font-weight:400;letter-spacing:0;text-transform:none;opacity:.85}'
  ].join('');

  // ---- Helpers -----------------------------------------------------------

  function acEsc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function acSafeUrl(u) {
    if (!u) { return ''; }
    var s = String(u).trim();
    return /^https?:\/\//i.test(s) ? s : '';
  }

  function acAttr(v) {
    return String(v == null ? '' : v).replace(/[^a-zA-Z0-9_-]/g, '');
  }

  function acInitials(name) {
    var n = String(name || 'Viajero').trim();
    if (!n) { n = 'Viajero'; }
    var parts = n.split(/\s+/);
    var ini = parts[0] ? parts[0].charAt(0) : 'V';
    if (parts.length > 1 && parts[1]) { ini += parts[1].charAt(0); }
    return ini.toUpperCase().slice(0, 2);
  }

  function acAvatarColor(name) {
    var n = String(name || 'Viajero');
    var h = 0;
    for (var i = 0; i < n.length; i++) { h = (h * 31 + n.charCodeAt(i)) | 0; }
    return AC_PALETTE[Math.abs(h) % AC_PALETTE.length];
  }

  function acRelTime(iso) {
    if (!iso) { return ''; }
    var t = new Date(iso).getTime();
    if (isNaN(t)) { return ''; }
    var diff = Math.floor((Date.now() - t) / 1000);
    if (diff < 0) { diff = 0; }
    if (diff < 60) { return 'hace un momento'; }
    var m = Math.floor(diff / 60);
    if (m < 60) { return 'hace ' + m + ' min'; }
    var h = Math.floor(m / 60);
    if (h < 24) { return 'hace ' + h + ' h'; }
    var d = Math.floor(h / 24);
    if (d < 30) { return 'hace ' + d + ' d'; }
    var mo = Math.floor(d / 30);
    if (mo < 12) { return 'hace ' + mo + ' mes' + (mo > 1 ? 'es' : ''); }
    var y = Math.floor(mo / 12);
    return 'hace ' + y + ' a\u00f1o' + (y > 1 ? 's' : '');
  }

  function acEnsureStyle() {
    if (document.getElementById(AC_STYLE_ID)) { return; }
    var style = document.createElement('style');
    style.id = AC_STYLE_ID;
    style.type = 'text/css';
    style.appendChild(document.createTextNode(AC_CSS));
    (document.head || document.documentElement).appendChild(style);
  }

  function acResolveTarget(target) {
    if (!target) { return null; }
    if (typeof target === 'string') { return document.querySelector(target); }
    if (target.nodeType === 1) { return target; }
    return null;
  }

  function acFindAct(node, root) {
    var el = node;
    while (el && el !== root) {
      if (el.getAttribute && el.getAttribute('data-ac-act')) { return el; }
      el = el.parentNode;
    }
    return null;
  }

  function acFindNode(nodes, id) {
    var target = String(id);
    for (var i = 0; i < (nodes || []).length; i++) {
      var n = nodes[i];
      if (String(n.id) === target) { return n; }
      var found = acFindNode(n.respuestas || [], id);
      if (found) { return found; }
    }
    return null;
  }

  function acPost(body) {
    return fetch('/api/interacciones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }).then(function (r) {
      return r.json().catch(function () {
        return { ok: false, error: 'Respuesta invalida del servidor' };
      }).then(function (j) {
        j = j || {};
        j.__status = r.status;
        return j;
      });
    });
  }

  function acErrMsg(res) {
    if (!res) { return 'No se pudo completar la accion'; }
    if (res.__status === 503 || res.code === 'SCHEMA_NOT_MIGRATED') {
      return 'Los comentarios no estan disponibles todavia';
    }
    if (res.__status === 429) {
      return res.error || 'Alcanzaste el limite de comentarios por hoy';
    }
    if (res.__status === 403) {
      return res.error || 'No tienes permisos para esta accion';
    }
    return res.error || 'No se pudo completar la accion';
  }

  // ---- Render ------------------------------------------------------------

  function acFormHTML(state) {
    if (state.usuarioId) {
      return '<div class="ac-form">'
        + '<textarea class="ac-inp" data-ac-input="root" rows="2" placeholder="Escribe un comentario..."></textarea>'
        + '<div class="ac-form-row">'
        + '<span class="ac-msg" data-ac-msg></span>'
        + '<button class="ac-btn" type="button" data-ac-act="submit">Comentar</button>'
        + '</div></div>';
    }
    return '<div class="ac-cta">'
      + '<span class="ac-cta-text">Inicia sesion para comentar</span>'
      + '<button class="ac-btn ac-btn-ghost" type="button" data-ac-act="login">Iniciar sesion</button>'
      + '</div>';
  }

  function acActionsHTML(state, n) {
    var h = '<div class="ac-actions">';
    var canLike = !!state.usuarioId && !n.es_mio;
    h += '<button class="ac-act' + (n.ya_like ? ' ac-on' : '') + '" type="button" data-ac-act="like" data-ac-id="'
      + acEsc(n.id) + '"' + (canLike ? '' : ' disabled') + '>'
      + (n.ya_like ? 'Ya no me gusta' : 'Me gusta')
      + (n.likes ? ' (' + (parseInt(n.likes, 10) || 0) + ')' : '')
      + '</button>';
    if (state.usuarioId) {
      h += '<button class="ac-act" type="button" data-ac-act="reply" data-ac-id="' + acEsc(n.id) + '">Responder</button>';
    }
    if (n.es_mio || state.admin) {
      h += '<button class="ac-act ac-danger" type="button" data-ac-act="delete" data-ac-id="' + acEsc(n.id) + '">Eliminar</button>';
    }
    h += '</div>';
    return h;
  }

  function acRenderNodes(state, nodes, parentDepth) {
    var html = '';
    (nodes || []).forEach(function (n) {
      var nivel = parseInt(n.nivel, 10) || 0;
      var depth = Math.min(nivel, state.maxIndent);
      var extra = depth - parentDepth;
      if (extra < 0) { extra = 0; }
      var deleted = !!n.eliminado;
      var autor = n.autor || {};
      var nombre = deleted ? '' : (autor.nombre || 'Viajero');
      var avatar = deleted ? '' : acSafeUrl(autor.avatar);
      var ini = deleted ? '?' : acInitials(nombre);
      var col = acAvatarColor(nombre || 'Viajero');

      html += '<div class="ac-node" data-ac-node="' + acEsc(n.id) + '"'
        + (extra > 0 ? ' style="margin-left:' + (extra * AC_INDENT_PX) + 'px"' : '') + '>';
      html += '<div class="ac-row">';
      html += '<div class="ac-av" style="background:' + col[0] + ';color:' + col[1] + '">';
      html += avatar
        ? '<img src="' + acEsc(avatar) + '" alt="" loading="lazy" onerror="this.style.display=\'none\'">'
        : acEsc(ini);
      html += '</div>';
      html += '<div class="ac-body">';
      if (deleted) {
        html += '<div class="ac-text ac-deleted">Comentario eliminado</div>';
      } else {
        html += '<div class="ac-meta"><span class="ac-name">' + acEsc(nombre) + '</span>'
          + '<span class="ac-time">' + acEsc(acRelTime(n.creado_en)) + '</span></div>';
        html += '<div class="ac-text">' + acEsc(n.texto) + '</div>';
        html += acActionsHTML(state, n);
      }
      html += '<div class="ac-reply-slot" data-ac-reply-slot="' + acEsc(n.id) + '"></div>';
      html += '</div></div>';
      html += acRenderNodes(state, n.respuestas || [], depth);
      html += '</div>';
    });
    return html;
  }

  function acRender(state) {
    var html = '';
    html += '<div class="ac-head"><div class="ac-title">Comentarios'
      + (state.total ? '<span class="ac-count">' + state.total + '</span>' : '')
      + '</div></div>';
    if (state.error) {
      html += '<div class="ac-error">' + acEsc(state.error) + '</div>';
    } else {
      html += acFormHTML(state);
      if (state.loading) {
        html += '<div class="ac-empty">Cargando comentarios...</div>';
      } else if (!state.data.length) {
        html += '<div class="ac-empty">Todavia no hay comentarios. Se el primero en comentar.</div>';
      } else {
        html += '<div class="ac-list">' + acRenderNodes(state, state.data, 0) + '</div>';
      }
    }
    state.el.innerHTML = html;
  }

  // ---- Acciones ----------------------------------------------------------

  function acNotify(state, msg, color) {
    var box = state.el.querySelector('[data-ac-msg]');
    if (box) { box.textContent = msg || ''; }
    if (msg && window.ExploraCO && typeof window.ExploraCO.mostrarToast === 'function') {
      window.ExploraCO.mostrarToast(msg, color || '#b91c1c');
    }
  }

  function acLoad(state) {
    state.loading = true;
    state.error = null;
    acRender(state);
    var url = '/api/interacciones?tipo=comentarios_foto&foto_id=' + encodeURIComponent(state.fotoId);
    if (state.usuarioId) { url += '&usuario_id=' + encodeURIComponent(state.usuarioId); }
    fetch(url).then(function (r) {
      return r.json().catch(function () {
        return { ok: false, error: 'Respuesta invalida del servidor' };
      }).then(function (j) {
        j = j || {};
        j.__status = r.status;
        return j;
      });
    }).then(function (res) {
      state.loading = false;
      if (!res.ok) {
        state.error = acErrMsg(res);
        acRender(state);
        return;
      }
      state.data = res.data || [];
      state.total = parseInt(res.total, 10) || 0;
      acRender(state);
      if (state.onCountChange) { state.onCountChange(state.total); }
    }).catch(function () {
      state.loading = false;
      state.error = 'No se pudieron cargar los comentarios';
      acRender(state);
    });
  }

  function acSubmitRoot(state) {
    var ta = state.el.querySelector('[data-ac-input="root"]');
    if (!ta) { return; }
    var texto = String(ta.value || '').trim();
    if (!texto) { acNotify(state, 'Escribe un comentario'); return; }
    if (texto.length > AC_MAX_LEN) { acNotify(state, 'El comentario supera los 1000 caracteres'); return; }
    ta.disabled = true;
    acPost({ tipo: 'comentario_foto', usuario_id: state.usuarioId, foto_id: state.fotoId, texto: texto, parent_id: null })
      .then(function (res) {
        if (!res.ok) { ta.disabled = false; acNotify(state, acErrMsg(res)); return; }
        if (res.xp > 0 && window.ExploraCO && typeof window.ExploraCO.mostrarToast === 'function') {
          window.ExploraCO.mostrarToast('Comentario publicado +' + res.xp + ' XP', '#16a34a');
        }
        acLoad(state);
      })
      .catch(function () { ta.disabled = false; acNotify(state, 'No se pudo publicar el comentario'); });
  }

  function acOpenReply(state, id) {
    if (!state.usuarioId) { acNotify(state, 'Inicia sesion para responder'); return; }
    var slot = state.el.querySelector('[data-ac-reply-slot="' + acAttr(id) + '"]');
    if (!slot) { return; }
    if (slot.getAttribute('data-ac-open') === '1') { acCloseReply(state, id); return; }
    slot.setAttribute('data-ac-open', '1');
    slot.innerHTML = '<div class="ac-reply-form">'
      + '<textarea class="ac-inp" data-ac-input="reply" rows="2" placeholder="Escribe una respuesta..."></textarea>'
      + '<div class="ac-form-row">'
      + '<button class="ac-btn" type="button" data-ac-act="submit-reply" data-ac-id="' + acEsc(id) + '">Responder</button>'
      + '<button class="ac-btn ac-btn-ghost" type="button" data-ac-act="cancel-reply" data-ac-id="' + acEsc(id) + '">Cancelar</button>'
      + '</div></div>';
    var ta = slot.querySelector('textarea');
    if (ta) { ta.focus(); }
  }

  function acCloseReply(state, id) {
    var slot = state.el.querySelector('[data-ac-reply-slot="' + acAttr(id) + '"]');
    if (!slot) { return; }
    slot.removeAttribute('data-ac-open');
    slot.innerHTML = '';
  }

  function acSubmitReply(state, id) {
    var slot = state.el.querySelector('[data-ac-reply-slot="' + acAttr(id) + '"]');
    if (!slot) { return; }
    var ta = slot.querySelector('textarea');
    var texto = ta ? String(ta.value || '').trim() : '';
    if (!texto) { acNotify(state, 'Escribe una respuesta'); return; }
    if (texto.length > AC_MAX_LEN) { acNotify(state, 'La respuesta supera los 1000 caracteres'); return; }
    if (ta) { ta.disabled = true; }
    acPost({ tipo: 'comentario_foto', usuario_id: state.usuarioId, foto_id: state.fotoId, texto: texto, parent_id: id })
      .then(function (res) {
        if (!res.ok) { if (ta) { ta.disabled = false; } acNotify(state, acErrMsg(res)); return; }
        if (res.xp > 0 && window.ExploraCO && typeof window.ExploraCO.mostrarToast === 'function') {
          window.ExploraCO.mostrarToast('Respuesta publicada +' + res.xp + ' XP', '#16a34a');
        }
        acLoad(state);
      })
      .catch(function () {
        if (ta) { ta.disabled = false; }
        acNotify(state, 'No se pudo publicar la respuesta');
      });
  }

  function acUpdateLikeBtn(btn, node) {
    if (!btn) { return; }
    var likes = parseInt(node.likes, 10) || 0;
    btn.textContent = (node.ya_like ? 'Ya no me gusta' : 'Me gusta') + (likes ? ' (' + likes + ')' : '');
    if (node.ya_like) { btn.classList.add('ac-on'); } else { btn.classList.remove('ac-on'); }
  }

  function acToggleLike(state, id, btn) {
    if (!state.usuarioId) { acNotify(state, 'Inicia sesion para dar me gusta'); return; }
    var accion = btn.classList.contains('ac-on') ? 'unlike' : 'like';
    btn.disabled = true;
    acPost({ tipo: 'comentario_voto', usuario_id: state.usuarioId, comentario_id: id, accion: accion })
      .then(function (res) {
        btn.disabled = false;
        if (!res.ok) { acNotify(state, acErrMsg(res)); return; }
        var node = acFindNode(state.data, id);
        if (node) {
          node.likes = parseInt(res.likes, 10) || 0;
          node.ya_like = !!res.ya_like;
          acUpdateLikeBtn(btn, node);
        } else {
          acUpdateLikeBtn(btn, { likes: res.likes, ya_like: res.ya_like });
        }
      })
      .catch(function () { btn.disabled = false; acNotify(state, 'No se pudo registrar el me gusta'); });
  }

  function acDelete(state, id) {
    if (!window.confirm('Eliminar este comentario?')) { return; }
    acPost({ tipo: 'comentario_eliminar', usuario_id: state.usuarioId, comentario_id: id })
      .then(function (res) {
        if (!res.ok) { acNotify(state, acErrMsg(res)); return; }
        acLoad(state);
      })
      .catch(function () { acNotify(state, 'No se pudo eliminar el comentario'); });
  }

  function acOnClick(state, e) {
    var btn = acFindAct(e.target, state.el);
    if (!btn) { return; }
    var act = btn.getAttribute('data-ac-act');
    var id = btn.getAttribute('data-ac-id');
    if (act === 'login') {
      if (window.ExploraCO && typeof window.ExploraCO.mostrarLogin === 'function') {
        window.ExploraCO.mostrarLogin();
      }
      return;
    }
    if (act === 'submit') { acSubmitRoot(state); return; }
    if (act === 'reply') { acOpenReply(state, id); return; }
    if (act === 'cancel-reply') { acCloseReply(state, id); return; }
    if (act === 'submit-reply') { acSubmitReply(state, id); return; }
    if (act === 'like') { acToggleLike(state, id, btn); return; }
    if (act === 'delete') { acDelete(state, id); return; }
  }

  // ---- Toggle helper (botones "Comentarios" de las miniaturas) ----------

  function acGetUid() {
    return (window.ExploraCO && window.ExploraCO.usuario)
      ? window.ExploraCO.usuario.id : null;
  }

  function acUpdateBtnCount(btn, total) {
    if (!btn) { return; }
    var span = btn.querySelector('[data-ac-btn-count]');
    if (!span) { return; }
    var n = parseInt(total, 10) || 0;
    span.textContent = n > 0 ? ' (' + n + ')' : '';
  }

  // Contrato: el boton tiene data-comments-for="<fotoId>" y el contenedor
  // oculto es el hermano siguiente (div con data-comments-for). Al primer
  // click se monta el componente (flag data-mounted); los siguientes solo
  // alternan la visibilidad del contenedor.
  function toggle(btn) {
    if (!btn) { return; }
    var fotoId = btn.getAttribute('data-comments-for');
    if (!fotoId) { return; }
    var box = btn.nextElementSibling;
    if (!box || box.getAttribute('data-comments-for') !== fotoId) { return; }
    if (box.style.display === 'none') {
      box.style.display = 'block';
      if (box.getAttribute('data-mounted') !== '1') {
        box.setAttribute('data-mounted', '1');
        mount(box, fotoId, {
          usuarioId: acGetUid(),
          compact: true,
          onCountChange: function (total) { acUpdateBtnCount(btn, total); }
        });
      }
    } else {
      box.style.display = 'none';
    }
  }

  // ---- API publica -------------------------------------------------------

  function mount(target, fotoId, opts) {
    opts = opts || {};
    var el = acResolveTarget(target);
    if (!el) { return null; }
    acEnsureStyle();
    if (!fotoId) {
      el.innerHTML = '<div class="ac-error">No se pudo identificar la publicacion.</div>';
      return null;
    }
    var state = {
      el: el,
      fotoId: String(fotoId),
      usuarioId: (opts.usuarioId == null || opts.usuarioId === '') ? null : String(opts.usuarioId),
      compact: !!opts.compact,
      admin: !!opts.admin,
      maxIndent: (typeof opts.maxIndent === 'number' && opts.maxIndent >= 0)
        ? opts.maxIndent : AC_DEFAULT_MAX_INDENT,
      onCountChange: (typeof opts.onCountChange === 'function') ? opts.onCountChange : null,
      data: [],
      total: 0,
      loading: true,
      error: null
    };
    el.classList.add('ac-root');
    if (state.compact) { el.classList.add('ac-compact'); } else { el.classList.remove('ac-compact'); }
    if (!el.__acBound) {
      el.__acBound = true;
      el.addEventListener('click', function (e) {
        var st = el.__acState;
        if (st) { acOnClick(st, e); }
      });
    }
    el.__acState = state;
    acLoad(state);
    return {
      reload: function () { acLoad(state); },
      state: state
    };
  }

  window.AlbumComments = {
    mount: mount,
    toggle: toggle,
    escape: acEsc,
    version: '1.1.0'
  };
})();
