'use strict';

/*
 * smoke_media_actions_widget.js
 * Smoke permanente (sin red, sin jsdom) del widget de estrellas de
 * media-actions.js (window.MediaActions).
 *
 * Falla que justifica este script (BUG en produccion):
 *   asegurarWidget() hacia cont.childNodes.slice(0). childNodes es un NodeList,
 *   que NO tiene .slice(); el TypeError reventaba ANTES de insertar las
 *   estrellas, asi que el widget jamas se construia y galeria.html dejaba de
 *   calificar. El mini-DOM de este smoke modela childNodes/querySelectorAll
 *   como ARRAY-LIKE SIN .slice() ni .forEach(), para que el bug no pueda
 *   volver sin que este script se ponga en rojo.
 *
 * Cubre:
 *   1. MediaActions.sync(root) no lanza sobre un [data-ma-voto] real.
 *   2. Tras sync: 5 [data-ma-estrella] + 1 [data-ma-rating-texto] y el
 *      [data-ma-count] original se conserva.
 *   3. Click sobre una estrella -> POST /api/interacciones {tipo:'media_voto',
 *      puntuacion entero 1-5}.
 *   4. Click sobre el contenedor [data-ma-voto] sin estrella -> NO fetch y
 *      ningun warn "calificar sin nota valida".
 *
 * Uso:  node scripts/smoke_media_actions_widget.js
 * Salida: PASS/FALLA por assert + resumen. Exit 0 si todo pasa, 1 si algo falla.
 */

var fs = require('fs');
var path = require('path');
var vm = require('vm');

var ROOT = path.resolve(__dirname, '..');
var SRC = path.resolve(ROOT, 'media-actions.js');

var pass = 0;
var fail = 0;
var fetchCalls = [];

function log(msg) { process.stdout.write(String(msg) + '\n'); }

function ok(id, cond, detalle) {
  if (cond) {
    pass += 1;
    log('  PASS ' + id + (detalle ? ' -> ' + detalle : ''));
  } else {
    fail += 1;
    log('  FAIL ' + id + ' -> ' + (detalle || 'condicion no cumplida'));
  }
  return !!cond;
}

function igual(id, real, esperado) {
  return ok(id, real === esperado,
    'real=' + JSON.stringify(real) + ' esperado=' + JSON.stringify(esperado));
}

/* ------------------------------------------------------------------ *
 * Selector engine minimo: [attr], [attr="val"], tag, .clase (lista por coma)
 * ------------------------------------------------------------------ */

function parseSel(sel) {
  var partes = String(sel).split(',');
  var out = [];
  for (var i = 0; i < partes.length; i++) {
    var s = partes[i].trim();
    if (!s) { continue; }
    var m = /^\[([\w-]+)(?:="([^"]*)")?\]$/.exec(s);
    if (m) { out.push({ attr: m[1], val: m[2] === undefined ? null : m[2], tag: null, cls: null }); continue; }
    var m2 = /^([A-Za-z][\w-]*)\.([\w-]+)$/.exec(s);
    if (m2) { out.push({ tag: m2[1].toLowerCase(), cls: m2[2], attr: null, val: null }); continue; }
    var m3 = /^\.([\w-]+)$/.exec(s);
    if (m3) { out.push({ tag: null, cls: m3[1], attr: null, val: null }); continue; }
    var m4 = /^([A-Za-z][\w-]*)$/.exec(s);
    if (m4) { out.push({ tag: m4[1].toLowerCase(), cls: null, attr: null, val: null }); continue; }
    out.push(null);
  }
  return out;
}

function tieneAttr(node, k) {
  return Object.prototype.hasOwnProperty.call(node.attrs, k);
}

function matchPart(node, p) {
  if (!node || node.nodeType !== 1 || !p) { return false; }
  if (p.tag && node.tagName.toLowerCase() !== p.tag) { return false; }
  if (p.attr && !tieneAttr(node, p.attr)) { return false; }
  if (p.attr && p.val !== null && node.getAttribute(p.attr) !== p.val) { return false; }
  if (p.cls && !node.classList.contains(p.cls)) { return false; }
  return true;
}

function matchAny(node, partes) {
  for (var i = 0; i < partes.length; i++) { if (matchPart(node, partes[i])) { return true; } }
  return false;
}

/* Array-like SIN .slice()/.forEach(): reproduce la semantica real de NodeList. */
function arrayLike(arr) {
  var o = {};
  for (var i = 0; i < arr.length; i++) { o[i] = arr[i]; }
  o.length = arr.length;
  return o;
}

/* ------------------------------------------------------------------ *
 * Mini-DOM (lo justo que usa media-actions.js)
 * ------------------------------------------------------------------ */

function Nodo(tag) {
  this.tagName = String(tag).toUpperCase();
  this.nodeType = 1;
  this.attrs = {};
  this.children = [];
  this.parentNode = null;
  this.textContent = '';
  this.style = {};
  this.disabled = false;
  this.__listeners = {};
  var self = this;

  function clases() {
    var s = String(self.attrs['class'] || '');
    return s ? s.split(/\s+/) : [];
  }

  this.classList = {
    contains: function (c) { return clases().indexOf(c) !== -1; },
    add: function (c) { var l = clases(); if (l.indexOf(c) === -1) { l.push(c); } self.attrs['class'] = l.join(' '); },
    remove: function (c) { var l = clases(); var i = l.indexOf(c); if (i !== -1) { l.splice(i, 1); } self.attrs['class'] = l.join(' '); },
    toggle: function (c, f) { var on = f === undefined ? clases().indexOf(c) === -1 : !!f; if (on) { self.classList.add(c); } else { self.classList.remove(c); } return on; }
  };

  Object.defineProperty(this, 'className', {
    get: function () { return String(self.attrs['class'] || ''); },
    set: function (v) { self.attrs['class'] = String(v); }
  });

  Object.defineProperty(this, 'childNodes', {
    get: function () { return arrayLike(self.children); }
  });

  Object.defineProperty(this, 'firstChild', {
    get: function () { return self.children.length ? self.children[0] : null; }
  });

  Object.defineProperty(this, 'nextSibling', {
    get: function () {
      if (!self.parentNode) { return null; }
      var sib = self.parentNode.children;
      var i = sib.indexOf(self);
      return (i !== -1 && i + 1 < sib.length) ? sib[i + 1] : null;
    }
  });
}

Nodo.prototype.getAttribute = function (k) { return tieneAttr(this, k) ? String(this.attrs[k]) : null; };
Nodo.prototype.setAttribute = function (k, v) { this.attrs[k] = String(v); };
Nodo.prototype.hasAttribute = function (k) { return tieneAttr(this, k); };
Nodo.prototype.removeAttribute = function (k) { delete this.attrs[k]; };

Nodo.prototype.appendChild = function (c) { c.parentNode = this; this.children.push(c); return c; };

Nodo.prototype.insertBefore = function (c, ref) {
  c.parentNode = this;
  if (!ref) { this.children.push(c); return c; }
  var i = this.children.indexOf(ref);
  if (i === -1) { this.children.push(c); return c; }
  this.children.splice(i, 0, c);
  return c;
};

Nodo.prototype.removeChild = function (c) {
  var i = this.children.indexOf(c);
  if (i !== -1) { this.children.splice(i, 1); c.parentNode = null; }
  return c;
};

Nodo.prototype.contains = function (n) {
  var x = n;
  while (x) { if (x === this) { return true; } x = x.parentNode; }
  return false;
};

Nodo.prototype.closest = function (sel) {
  var partes = parseSel(sel);
  var x = this;
  while (x) {
    if (x.nodeType === 1 && matchAny(x, partes)) { return x; }
    x = x.parentNode;
  }
  return null;
};

Nodo.prototype.querySelectorAll = function (sel) {
  var partes = parseSel(sel);
  var out = [];
  var stack = this.children.slice();
  while (stack.length) {
    var nd = stack.shift();
    if (matchAny(nd, partes)) { out.push(nd); }
    if (nd.children) { stack = stack.concat(nd.children); }
  }
  return arrayLike(out);
};

Nodo.prototype.querySelector = function (sel) {
  var a = this.querySelectorAll(sel);
  return a.length ? a[0] : null;
};

Nodo.prototype.addEventListener = function (t, fn) {
  if (!this.__listeners[t]) { this.__listeners[t] = []; }
  this.__listeners[t].push(fn);
};

Nodo.prototype.fire = function (t, ev) {
  var l = this.__listeners[t] || [];
  for (var i = 0; i < l.length; i++) { l[i](ev); }
};

function crearDocumento() {
  var body = new Nodo('body');
  return {
    body: body,
    createElement: function (t) { return new Nodo(String(t).toLowerCase()); },
    querySelector: function (s) { return body.querySelector(s); },
    querySelectorAll: function (s) { return body.querySelectorAll(s); }
  };
}

/* ------------------------------------------------------------------ *
 * Sandbox vm
 * ------------------------------------------------------------------ */

function crearSandbox(doc) {
  var warns = [];
  var capture = {
    warn: function (m) { warns.push(String(m)); },
    log: function () {},
    error: function () {}
  };
  var ctx = {
    document: doc,
    console: capture,
    JSON: JSON,
    Math: Math,
    Date: Date,
    Number: Number,
    String: String,
    Array: Array,
    Object: Object,
    Promise: Promise,
    parseInt: parseInt,
    parseFloat: parseFloat,
    isNaN: isNaN,
    isFinite: isFinite,
    setTimeout: setTimeout
  };
  ctx.window = ctx;
  ctx.self = ctx;
  ctx.__warns = warns;
  ctx.ExploraCO = { usuario: { id: '1' }, mostrarToast: function () {} };
  ctx.alert = function () {};
  ctx.fetch = function (url, opts) {
    var body = (opts && opts.body) ? JSON.parse(opts.body) : null;
    var resp = {
      ok: true, xp: 5, votos: 4, total_votos: 4,
      rating_promedio: 4.2, promedio: 4.2,
      mi_puntuacion: body ? body.puntuacion : null,
      ya_votado: true, es_alta: true
    };
    fetchCalls.push({ url: url, opts: opts, body: body, response: resp });
    return Promise.resolve({
      status: 200,
      json: function () { return Promise.resolve(resp); }
    });
  };
  vm.createContext(ctx);
  var src = fs.readFileSync(SRC, 'utf8');
  vm.runInContext(src, ctx, { filename: 'media-actions.js' });
  return ctx;
}

/* ------------------------------------------------------------------ *
 * Corrida
 * ------------------------------------------------------------------ */

function correr() {
  log('smoke_media_actions_widget - widget de estrellas de MediaActions');

  if (!fs.existsSync(SRC)) {
    ok('src-existe', false, 'no se encuentra media-actions.js en ' + ROOT);
    return;
  }

  var doc = crearDocumento();
  var ctx = null;
  var errArranque = '';
  try {
    ctx = crearSandbox(doc);
  } catch (e) {
    errArranque = String(e && e.message ? e.message : e);
  }
  ok('sandbox-arranca', ctx !== null, errArranque);
  if (!ctx || !ctx.MediaActions) {
    ok('api-publica', false, 'window.MediaActions no existe');
    return;
  }
  ok('api-publica', true, 'voto/calificar/guardar/sync/bind');

  /* Contenedor [data-ma-voto] con el contador que ya trae la vista. */
  var root = doc.createElement('div');
  root.setAttribute('data-ma-voto', '1');
  root.setAttribute('data-ma-fuente', 'album_foto');
  root.setAttribute('data-ma-item', 'foto-1');
  root.setAttribute('data-ma-votos', '3');
  root.setAttribute('data-ma-rating', '4.2');
  doc.body.appendChild(root);

  var numOriginal = doc.createElement('span');
  numOriginal.setAttribute('data-ma-count', '1');
  numOriginal.textContent = '3';
  root.appendChild(numOriginal);

  /* 1. sync no lanza (aqui reventaba childNodes.slice). */
  var errSync = '';
  try {
    ctx.MediaActions.sync(root);
  } catch (e) {
    errSync = String(e && e.message ? e.message : e);
  }
  ok('sync-sin-excepcion', errSync === '', errSync || 'sync(root) completo');

  /* 2. widget construido y contador conservado. */
  var estrellas = root.querySelectorAll('[data-ma-estrella]');
  igual('estrellas-5', estrellas.length, 5);
  igual('rating-texto-1', root.querySelectorAll('[data-ma-rating-texto]').length, 1);
  ok('count-conservado', root.querySelector('[data-ma-count]') === numOriginal,
    'el [data-ma-count] original sigue siendo el mismo nodo');
  igual('count-texto', numOriginal.textContent, '3');

  /* bind: un solo listener delegado en root. */
  var bindOk = ctx.MediaActions.bind(root);
  igual('bind-activo', bindOk, true);

  /* 3. click sobre una estrella -> POST media_voto. */
  var estrella4 = root.querySelector('[data-ma-nota="4"]');
  ok('estrella-4-existe', estrella4 !== null);
  var antes = fetchCalls.length;
  root.fire('click', { target: estrella4, stopPropagation: function () {}, preventDefault: function () {} });
  igual('click-estrella-post', fetchCalls.length, antes + 1, 'una llamada a fetch');
  var llamada = fetchCalls[fetchCalls.length - 1] || {};
  igual('post-endpoint', llamada.url, '/api/interacciones');
  igual('post-tipo', llamada.body && llamada.body.tipo, 'media_voto');
  var punt = llamada.body ? llamada.body.puntuacion : null;
  ok('post-puntuacion-1-5', typeof punt === 'number' && punt === Math.floor(punt) && punt >= 1 && punt <= 5,
    'puntuacion=' + JSON.stringify(punt));
  igual('post-usuario', llamada.body && llamada.body.usuario_id, '1');
  igual('respuesta-ok', llamada.response && llamada.response.ok, true);

  /* 4. click sobre el contenedor sin estrella -> no-op, sin fetch ni warn. */
  var antes2 = fetchCalls.length;
  root.fire('click', { target: root, stopPropagation: function () {}, preventDefault: function () {} });
  igual('click-contenedor-sin-fetch', fetchCalls.length, antes2, 'no se dispara el POST');
  var warnSinNota = 0;
  for (var w = 0; w < ctx.__warns.length; w++) {
    if (ctx.__warns[w].indexOf('sin nota valida') !== -1) { warnSinNota += 1; }
  }
  igual('click-contenedor-sin-warn', warnSinNota, 0, 'no hay warn "sin nota valida"');

  log('');
  log('RESULTADO: ' + pass + '/' + (pass + fail) + ' asserts PASS');
  if (fail > 0) { log('FALLARON ' + fail + ' assert(s).'); }
}

correr();
process.exit(fail > 0 ? 1 : 0);
