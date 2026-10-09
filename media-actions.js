/* media-actions.js - LATAWEL
 * Abstraccion compartida de acciones de media: CALIFICACION de 1-5 estrellas
 * + guardado. Sustituye la logica duplicada de galeria.html (No-Duplicidad).
 * Consumidores: galeria.html, comunidad.html, mi-perfil.html, mapa-cultural.js.
 *
 * CALIFICACION (contrato vigente, ver api/interacciones.js): opinion entero
 * 1-5, OBLIGATORIA, DEFINITIVA y actualizable. NO existe unlike ni 409 de
 * duplicado: es un upsert idempotente por (usuario_id, fuente, item_id).
 * Reenviar la misma nota N veces es un no-op y el XP se paga SOLO en el ALTA
 * (es_alta), por lo que cambiar 3 -> 5 no vuelve a pagar XP.
 *
 * API PUBLICA (contrato fijo, los 4 consumidores dependen de estos nombres):
 *
 *   window.MediaActions.calificar(cont, ctx, nota)
 *     ctx  = {fuente, itemId, miPuntuacion, rating, votos, esPropia}
 *     nota = entero 1-5 (el backend responde 400 'puntuacion invalida' sin ella)
 *     - Sin usuario (window.ExploraCO.usuario.id) -> opts.pedirLogin.
 *     - ctx.esPropia -> toast informativo y return (sin POST).
 *     - Nota fuera de 1-5 o no entera -> NO se envia el POST (CHECK 23514).
 *     - Nota igual a la ya puesta -> no-op silencioso (no hay unlike).
 *     - Repintado optimista (estrellas + contadores al instante) y REVERT al
 *       estado previo si el POST falla. Nunca se muestra una nota no aceptada.
 *     - POST /api/interacciones {tipo:'media_voto', usuario_id, fuente,
 *       item_id, puntuacion} con Authorization: Bearer (authHeaders()).
 *     - 200 {ok, xp, xp_detalle, votos, total_votos, rating_promedio, promedio,
 *       mi_puntuacion, ya_votado, es_alta}: rating_promedio/promedio es el mismo
 *       numero ya parseado o null; null = SIN VOTOS y jamas se pinta como 0.
 *     - Gates: 401 -> pedirLogin, 429 -> mostrarEstadoCupo, red -> warn + toast.
 *
 *   window.MediaActions.voto(cont, ctx, nota)
 *     Alias retrocompatible: misma funcion, con la nota en 3.er parametro.
 *     Sin nota derivable no se envia nada (console.warn), nunca se adivina.
 *
 *   window.MediaActions.guardar(btn, ctx)
 *     ctx = {fuente, itemId, yaGuardado}
 *     - POST {tipo: yaGuardado ? 'quitar_guardado_media' : 'guardar_media', usuario_id,
 *       fuente, item_id} (mismo endpoint; Bearer igual que hacia galeria.html).
 *     - Maneja 503 ('guardados no disponibles todavia'), 400/401, red.
 *
 *   window.MediaActions.sync(root)
 *     - Construye/pinta el widget de 5 estrellas de cada [data-ma-voto] dentro
 *       de root y el estado de cada [data-ma-save], leyendo los data-ma-* locales.
 *
 *   window.MediaActions.bind(root, opts)
 *     opts = {toast: fn(msg,color), pedirLogin: fn(msg)}
 *     - UN solo listener de click delegado en root (closest). Evita doble bind
 *       marcando root.__maBound. Delega desde la estrella al CONTENEDOR de la
 *       media ([data-ma-voto]), nunca a una estrella suelta. Los opts quedan
 *       activos a nivel de modulo (el ultimo bind gana). Sin opts usa un toast
 *       minimo propio: ExploraCO.mostrarToast si existe; si no, console.warn.
 *
 * WIDGET (lo genera sync dentro del contenedor [data-ma-voto]):
 *   [data-ma-estrellas][role=radiogroup][aria-label]
 *     [data-ma-estrella][role=radio][aria-checked][tabindex][aria-label] x5
 *   [data-ma-rating-texto] -> "4.2" | "sin valorar"   (nunca 0 ni 0.0)
 *   [data-ma-count]         -> numero de evaluaciones
 *   Teclado: Tab entra, flechas/Home/End mueven (tabindex roving), Enter o
 *   Espacio califican. Hover: preview visual (rellena N) SIN calificar ni enviar.
 *   Clases para CSS: .ma-estrellas .ma-estrella .is-on .is-preview .is-empty
 *   .is-hover .is-busy .ma-valorado .ma-calificable .ma-rating-texto .ma-votos-num
 *
 * Atributos DATA (contrato de marcado):
 *   Like:    data-ma-voto data-ma-fuente="album_foto" data-ma-item="<id>"
 *            data-ma-puntuacion="1..5"     nota actual del usuario (ausente si no hay)
 *            data-ma-mi-puntuacion="1..5"  alias del mismo valor
 *            data-ma-rating="4.2" | ""     promedio; vacio = sin votos
 *            data-ma-votos="N"             numero de evaluaciones (tolerante)
 *            data-ma-es-propia="0|1"
 *            data-ma-ya-votado="0|1"       legacy tolerante, ya no manda
 *   Guardar: data-ma-save data-ma-fuente data-ma-item data-ma-ya-guardado="0|1"
 *
 * ASCII-safe (ADR-002): sin caracteres > 127 ni backticks.
 */
(function () {
  'use strict';

  var OPT = {};
  var ESTRELLA = '\u2605';        // rellena
  var CONTORNO = '\u2606';        // de contorno
  var SIN_VOTOS = 'sin valorar';
  var ETIQUETA_GRUPO = 'Valorar esta media';

  function warn(msg) {
    if (window.console && window.console.warn) { window.console.warn('[media-actions] ' + msg); }
  }

  function toast(msg, color) {
    if (OPT && typeof OPT.toast === 'function') { OPT.toast(msg, color); return; }
    if (window.ExploraCO && typeof window.ExploraCO.mostrarToast === 'function') {
      window.ExploraCO.mostrarToast(msg, color);
      return;
    }
    warn(msg);
    if (window.alert) { window.alert(msg); }
  }

  function pedirLogin(msg) {
    if (OPT && typeof OPT.pedirLogin === 'function') { OPT.pedirLogin(msg); return; }
    toast(msg, '#FF4A00');
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
      catch (e) { warn('authHeaders'); }
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

  /* Entero 1-5 o null. Un rating de 0 estrellas no existe: se trata como
   * ausencia (sin votos), jamas como cero. */
  function nota5(v) {
    if (v == null || v === '') { return null; }
    var n = parseInt(v, 10);
    if (isNaN(n) || n < 1 || n > 5) { return null; }
    return n;
  }

  function promedio(v) {
    if (v == null || v === '') { return null; }
    var n = parseFloat(v);
    if (isNaN(n) || n <= 0) { return null; }
    return n;
  }

  function fmt(n) {
    return String(Math.round(n * 10) / 10);
  }

  function attr(el, name) {
    return (el && typeof el.getAttribute === 'function') ? el.getAttribute(name) : null;
  }

  function tiene(el, name) {
    return !!(el && typeof el.hasAttribute === 'function' && el.hasAttribute(name));
  }

  function quitar(el, name) {
    if (el && typeof el.removeAttribute === 'function') { el.removeAttribute(name); }
  }

  function poner(el, name, value) {
    if (el && typeof el.setAttribute === 'function') { el.setAttribute(name, value); }
  }

  function flag(el, name) {
    return attr(el, name) === '1';
  }

  function clase(el, nombre, on) {
    if (!el || !el.classList) { return; }
    if (on) { el.classList.add(nombre); } else { el.classList.remove(nombre); }
  }

  function normalizarVoto(cont, ctx) {
    var src = ctx || {};
    var nota = src.miPuntuacion;
    if (nota == null && src.puntuacion != null) { nota = src.puntuacion; }
    if (nota == null && tiene(cont, 'data-ma-puntuacion')) { nota = attr(cont, 'data-ma-puntuacion'); }
    var rat = src.rating;
    if (rat == null && tiene(cont, 'data-ma-rating')) { rat = attr(cont, 'data-ma-rating'); }
    return {
      fuente: src.fuente || attr(cont, 'data-ma-fuente') || '',
      itemId: (src.itemId != null ? String(src.itemId) : '') || attr(cont, 'data-ma-item') || '',
      miPuntuacion: nota5(nota),
      rating: promedio(rat),
      votos: (src.votos != null ? num(src.votos) : (tiene(cont, 'data-ma-votos') ? num(attr(cont, 'data-ma-votos')) : 0)),
      esPropia: src.esPropia != null ? !!src.esPropia : flag(cont, 'data-ma-es-propia')
    };
  }

  function normalizarSave(btn, ctx) {
    var src = ctx || {};
    return {
      fuente: src.fuente || attr(btn, 'data-ma-fuente') || '',
      itemId: (src.itemId != null ? String(src.itemId) : '') || attr(btn, 'data-ma-item') || '',
      yaGuardado: src.yaGuardado != null ? !!src.yaGuardado : flag(btn, 'data-ma-ya-guardado')
    };
  }

  /* ---- widget de estrellas ------------------------------------------- */

  function crearEstrella(i) {
    var s = document.createElement('span');
    s.className = 'ma-estrella';
    poner(s, 'data-ma-estrella', '1');
    poner(s, 'data-ma-nota', String(i));
    poner(s, 'role', 'radio');
    poner(s, 'aria-checked', 'false');
    poner(s, 'aria-label', i === 1 ? 'Valorar con 1 estrella' : 'Valorar con ' + i + ' estrellas');
    poner(s, 'tabindex', i === 1 ? '0' : '-1');
    s.textContent = CONTORNO;
    return s;
  }

  /* Construye el widget una sola vez y limpia el marcado legacy del boton
   * (corazon + contador) sin perder el [data-ma-count] que ya trae la vista. */
  function asegurarWidget(cont) {
    if (!cont || typeof document === 'undefined') { return null; }
    var grp = cont.querySelector('[data-ma-estrellas]');
    if (grp) { return grp; }
    var i, kids = [];
    // childNodes es un NodeList (no tiene .slice): se copia a array por indice.
    if (cont.childNodes) {
      for (i = 0; i < cont.childNodes.length; i++) { kids.push(cont.childNodes[i]); }
    }
    grp = document.createElement('span');
    grp.className = 'ma-estrellas';
    poner(grp, 'data-ma-estrellas', '1');
    poner(grp, 'role', 'radiogroup');
    poner(grp, 'aria-label', ETIQUETA_GRUPO);
    for (i = 1; i <= 5; i++) { grp.appendChild(crearEstrella(i)); }
    var txt = document.createElement('span');
    txt.className = 'ma-rating-texto';
    poner(txt, 'data-ma-rating-texto', '1');
    txt.textContent = SIN_VOTOS;
    var numEl = cont.querySelector('[data-ma-count]');
    if (!numEl) {
      numEl = document.createElement('span');
      numEl.className = 'ma-votos-num';
      poner(numEl, 'data-ma-count', '1');
    }
    cont.insertBefore(grp, cont.firstChild);
    cont.insertBefore(txt, grp.nextSibling);
    if (numEl.parentNode !== cont) { cont.insertBefore(numEl, txt.nextSibling); }
    for (i = 0; i < kids.length; i++) {
      var k = kids[i];
      if (k === grp || k === txt || k === numEl) { continue; }
      if (k.nodeType === 3 && !/\S/.test(k.nodeValue || '')) { continue; }
      if (k.nodeType === 1 && tiene(k, 'data-ma-count')) { continue; }
      if (cont.removeChild) { cont.removeChild(k); }
    }
    clase(cont, 'ma-calificable', true);
    // Un <button> legacy no puede envolver un radiogroup: pierde semantica de
    // toggle para no anidar controles interactivos.
    if (cont.tagName === 'BUTTON') {
      poner(cont, 'role', 'group');
      quitar(cont, 'aria-pressed');
      poner(cont, 'type', 'button');
    }
    eventosWidget(cont, grp);
    return grp;
  }

  function estrellaDe(grp, ev) {
    var t = ev && ev.target;
    if (!t || typeof t.closest !== 'function') { return null; }
    var s = t.closest('[data-ma-estrella], [data-ma-nota]');
    return (s && grp.contains(s)) ? s : null;
  }

  function eventosWidget(cont, grp) {
    grp.addEventListener('click', function (ev) {
      var s = estrellaDe(grp, ev);
      if (!s) { return; }
      if (ev.stopPropagation) { ev.stopPropagation(); }
      calificar(cont, null, nota5(attr(s, 'data-ma-nota')));
    });
    grp.addEventListener('mouseover', function (ev) {
      var s = estrellaDe(grp, ev);
      if (s) { preview(cont, nota5(attr(s, 'data-ma-nota'))); }
    });
    grp.addEventListener('mouseout', function (ev) {
      if (ev.relatedTarget && grp.contains(ev.relatedTarget)) { return; }
      preview(cont, null);
    });
    grp.addEventListener('focusout', function (ev) {
      if (ev.relatedTarget && grp.contains(ev.relatedTarget)) { return; }
      preview(cont, null);
    });
    grp.addEventListener('keydown', function (ev) {
      var s = estrellaDe(grp, ev);
      if (!s) { return; }
      var act = nota5(attr(s, 'data-ma-nota'));
      var sig = ev.key || '';
      if (sig === 'Enter' || sig === ' ' || sig === 'Spacebar') {
        if (ev.preventDefault) { ev.preventDefault(); }
        calificar(cont, null, act);
        return;
      }
      var n = 0;
      if (sig === 'ArrowRight' || sig === 'ArrowUp') { n = act >= 5 ? 5 : act + 1; }
      else if (sig === 'ArrowLeft' || sig === 'ArrowDown') { n = act <= 1 ? 1 : act - 1; }
      else if (sig === 'Home') { n = 1; }
      else if (sig === 'End') { n = 5; }
      if (!n) { return; }
      if (ev.preventDefault) { ev.preventDefault(); }
      preview(cont, n, true);
      var destino = grp.querySelector('[data-ma-nota="' + n + '"]');
      if (destino && typeof destino.focus === 'function') { destino.focus(); }
    });
  }

  /* Un solo pintor de las 5 estrellas.
   * ctx.miPuntuacion es el estado real (pinta aria-checked e is-on);
   * hover != null es SOLO preview visual: rellena N sin calificar, sin enviar y
   * sin tocar aria-checked. Sin preview vuelve al estado real, no al vacio. */
  function pintarEstrellas(cont, ctx, hover, fijarFoco) {
    var grp = asegurarWidget(cont);
    if (!grp) { return; }
    var nota = ctx.miPuntuacion;
    var base = (hover == null) ? nota : hover;
    var foco = hover || nota || 1;
    var st = grp.querySelectorAll('[data-ma-estrella]');
    var i, v;
    for (i = 0; i < st.length; i++) {
      v = nota5(attr(st[i], 'data-ma-nota'));
      st[i].textContent = (base && v <= base) ? ESTRELLA : CONTORNO;
      poner(st[i], 'aria-checked', nota === v ? 'true' : 'false');
      poner(st[i], 'aria-disabled', ctx.esPropia ? 'true' : 'false');
      if (fijarFoco || hover != null) { poner(st[i], 'tabindex', v === foco ? '0' : '-1'); }
      clase(st[i], 'is-on', nota === v);
      clase(st[i], 'is-preview', !!(hover && v <= hover));
    }
    clase(grp, 'is-empty', nota == null);
    clase(grp, 'is-hover', hover != null);
    poner(grp, 'aria-disabled', ctx.esPropia ? 'true' : 'false');
    if (ctx.esPropia && cont.tagName === 'BUTTON') { cont.disabled = true; }
  }

  function preview(cont, n, fijarFoco) {
    if (!cont || !cont.querySelector || !cont.querySelector('[data-ma-estrellas]')) { return; }
    pintarEstrellas(cont, normalizarVoto(cont, null), n, fijarFoco);
  }

  function pintarRating(cont, ctx) {
    if (!cont) { return; }
    if (ctx.miPuntuacion == null) {
      quitar(cont, 'data-ma-puntuacion');
      quitar(cont, 'data-ma-mi-puntuacion');
    } else {
      poner(cont, 'data-ma-puntuacion', String(ctx.miPuntuacion));
      poner(cont, 'data-ma-mi-puntuacion', String(ctx.miPuntuacion));
    }
    poner(cont, 'data-ma-rating', ctx.rating == null ? '' : fmt(ctx.rating));
    poner(cont, 'data-ma-votos', String(ctx.votos));
    poner(cont, 'data-ma-ya-votado', ctx.miPuntuacion == null ? '0' : '1');
    if (ctx.esPropia) { poner(cont, 'data-ma-es-propia', '1'); }
    var c = cont.querySelector ? cont.querySelector('[data-ma-count]') : null;
    if (c) { c.textContent = String(ctx.votos); }
    var rt = cont.querySelector ? cont.querySelector('[data-ma-rating-texto]') : null;
    if (rt) {
      rt.textContent = ctx.rating == null ? SIN_VOTOS : fmt(ctx.rating);
      poner(rt, 'data-sin-votos', ctx.rating == null ? '1' : '0');
    }
    clase(cont, 'ma-valorado', ctx.miPuntuacion != null);
    pintarEstrellas(cont, ctx);
  }

  /* Rating optimista: (promedio*votes + nota nueva - nota previa) / votes
   * finales. Si no hay base de calculo se queda null (sin votos). */
  function estimar(prev, n, primera) {
    var cnt = num(prev.votos) + (primera ? 1 : 0);
    if (cnt <= 0) { return null; }
    var suma = (prev.rating == null ? 0 : prev.rating) * num(prev.votos) + n - (primera ? 0 : (prev.miPuntuacion || 0));
    var v = suma / cnt;
    return (v > 0 && isFinite(v)) ? v : null;
  }

  function busy(cont, on) {
    cont.__maBusy = !!on;
    poner(cont, 'aria-busy', on ? 'true' : 'false');
    clase(cont, 'is-busy', !!on);
  }

  function calificar(cont, ctx, nota) {
    if (!cont) { return Promise.resolve(null); }
    var c = normalizarVoto(cont, ctx);
    if (!c.itemId) { return Promise.resolve(null); }
    var n = nota5(nota);
    if (n == null && c.miPuntuacion != null) { n = c.miPuntuacion; }
    if (n == null) {
      // Nunca se adivina una nota: sin 1-5 el POST seria un 400 y el CHECK 23514.
      warn('calificar sin nota valida (entero 1-5): no se envio nada');
      return Promise.resolve(null);
    }
    var uid = usuarioId();
    if (!uid) { pedirLogin('Inicia sesi\u00f3n para valorar esta foto.'); return Promise.resolve(null); }
    if (c.esPropia) { toast('No puedes valorar tu propia foto.', '#FF4A00'); return Promise.resolve(null); }
    if (cont.__maBusy) { return Promise.resolve(null); }
    if (c.miPuntuacion === n) { return Promise.resolve(null); } // no-op: no hay unlike

    var prev = { fuente: c.fuente, itemId: c.itemId, esPropia: c.esPropia, miPuntuacion: c.miPuntuacion, rating: c.rating, votos: c.votos };
    var primera = (c.miPuntuacion == null);
    var opt = {
      fuente: c.fuente, itemId: c.itemId, esPropia: c.esPropia,
      miPuntuacion: n,
      rating: estimar(c, n, primera),
      votos: primera ? num(c.votos) + 1 : num(c.votos)
    };
    pintarRating(cont, opt);
    busy(cont, true);
    return postJson({ tipo: 'media_voto', usuario_id: uid, fuente: c.fuente, item_id: c.itemId, puntuacion: n }, true)
      .then(function (res) {
        busy(cont, false);
        if (res.ok) {
          var r = (res.rating_promedio !== undefined) ? res.rating_promedio : res.promedio;
          var vts = (res.total_votos !== undefined) ? res.total_votos : res.votos;
          pintarRating(cont, {
            fuente: c.fuente, itemId: c.itemId, esPropia: c.esPropia,
            miPuntuacion: (res.mi_puntuacion != null) ? nota5(res.mi_puntuacion) : n,
            rating: promedio(r),
            votos: num(vts)
          });
          // ADR-053 Dec 13.1: el servidor es la fuente unica del toast de XP.
          // Con xp_detalle manda aplicarResultadoXp (desglose); se suprime el
          // toast local para no duplicar (NEXT.md:246). Sin xp_detalle NO se
          // pinta XP: el backend solo lo envia en el alta (es_alta).
          var aplicaXp = (window.ExploraCO && typeof window.ExploraCO.aplicarResultadoXp === 'function')
            ? window.ExploraCO.aplicarResultadoXp : null;
          if (res.xp_detalle && aplicaXp) {
            aplicaXp(res);
          } else {
            if (num(res.xp) > 0) { toast('+' + num(res.xp) + ' XP', '#16a34a'); }
            if (aplicaXp) { aplicaXp(res); }
          }
          return res;
        }
        pintarRating(cont, prev); // revertir: nunca mostrar una nota rechazada
        if (res.__status === 401) { pedirLogin('Inicia sesi\u00f3n para valorar esta foto.'); return res; }
        if (res.__status === 429) {
          // ADR-053 Dec 13.2: el cupo/enfriamiento se informa con el helper
          // unico de usuario-session.js (la UI solo informa, nunca bloquea).
          if (window.ExploraCO && typeof window.ExploraCO.mostrarEstadoCupo === 'function') {
            window.ExploraCO.mostrarEstadoCupo({ tipo: 'cupo', mensaje: res.error || '' });
          } else {
            toast(res.error || 'Limite de votos por dia alcanzado', '#FF4A00');
          }
          return res;
        }
        toast(res.error || 'No se pudo registrar tu valoraci\u00f3n', '#ef4444');
        return res;
      })
      .catch(function (e) {
        busy(cont, false);
        pintarRating(cont, prev);
        warn('calificar');
        toast('Error de red al valorar', '#ef4444');
        return null;
      });
  }

  /* Alias retrocompatible: los 4 consumidores siguen llamando voto(btn, ctx);
   * la nota llega ahora en 3.er parametro (o por data-ma-puntuacion). */
  function voto(cont, ctx, nota) {
    return calificar(cont, ctx, nota);
  }

  /* ---- guardar (sin cambios de contrato) ----------------------------- */

  function pintarSave(btn, ctx) {
    if (!btn) { return; }
    poner(btn, 'data-ma-ya-guardado', ctx.yaGuardado ? '1' : '0');
    var label = btn.querySelector ? btn.querySelector('[data-ma-label]') : null;
    if (label) { label.textContent = ctx.yaGuardado ? 'Guardado' : 'Guardar'; }
    else { btn.textContent = ctx.yaGuardado ? 'Guardado' : 'Guardar'; }
    clase(btn, 'on', ctx.yaGuardado);
    poner(btn, 'aria-pressed', ctx.yaGuardado ? 'true' : 'false');
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
          if (res.__status === 503) { toast('Los guardados no estan disponibles todavia', '#FF4A00'); return res; }
          if (res.__status === 400 || res.__status === 401) { pedirLogin('Inicia sesi\u00f3n para guardar esta foto.'); return res; }
          toast(res.error || 'No se pudo guardar', '#ef4444');
          return res;
        }
        c.yaGuardado = (res.guardado === undefined) ? !c.yaGuardado : !!res.guardado;
        pintarSave(btn, c);
        toast(c.yaGuardado ? 'Guardado en Tu Mapa' : 'Quitado de tus guardados', c.yaGuardado ? '#FF4A00' : '#888');
        return res;
      })
      .catch(function (e) {
        btn.disabled = false;
        warn('guardar');
        toast('Error de red al guardar', '#ef4444');
        return null;
      });
  }

  function sync(root) {
    var el = raiz(root);
    if (!el) { return; }
    var i, list;
    list = el.querySelectorAll('[data-ma-voto]');
    for (i = 0; i < list.length; i++) { pintarRating(list[i], normalizarVoto(list[i], null)); }
    list = el.querySelectorAll('[data-ma-save]');
    for (i = 0; i < list.length; i++) { pintarSave(list[i], normalizarSave(list[i], null)); }
    if (attr(el, 'data-ma-voto') !== null) { pintarRating(el, normalizarVoto(el, null)); }
    if (attr(el, 'data-ma-save') !== null) { pintarSave(el, normalizarSave(el, null)); }
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
      // El closest debe resolver al CONTENEDOR de la media: una estrella suelta
      // no lleva fuente/item, el contenedor [data-ma-voto] si.
      var b = target.closest('[data-ma-voto], [data-ma-save]');
      if (!b || !el.contains(b)) { return; }
      if (attr(b, 'data-ma-voto') !== null) {
        var s = target.closest('[data-ma-estrella], [data-ma-nota]');
        // Sin estrella el click cae en el contenedor: no-op, nunca se adivina.
        if (!s || !b.contains(s)) { return; }
        calificar(b, null, nota5(attr(s, 'data-ma-nota')));
        return;
      }
      if (attr(b, 'data-ma-save') !== null) { guardar(b, null); }
    });
    return true;
  }

  window.MediaActions = {
    voto: voto,
    calificar: calificar,
    guardar: guardar,
    sync: sync,
    bind: bind
  };
})();