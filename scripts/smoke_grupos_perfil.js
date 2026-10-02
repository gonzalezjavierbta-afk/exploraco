'use strict';

/*
 * smoke_grupos_perfil.js
 * Smoke permanente (y barato) de la agrupacion plegable de "Mi perfil".
 *
 * Cubre los 4 modulos que usan el helper generico pfGruposRender():
 *   1. Museo         -> #museo-recursos-grid      (foto | video | audio)
 *   2. Guardados     -> #mis-guardados-media-grid (fuente)
 *   3. Niveles       -> #pf-niveles               (era) + auto-apertura
 *   4. Mis Albumes  -> #mis-albumes-grid          (tope, sin agrupar)
 *
 * Que comprueba y por que:
 *   - Sintaxis y ASCII no se comprueban aqui (los hace express_check.js).
 *   - El fallo que justifica este script es la PERDIDA DE ITEMS: un
 *     agrupamiento mal escrito se come elementos. Por eso la asercion central
 *     es que el numero de items renderizados sea exactamente el numero de items
 *     de entrada, que cada item caiga en un unico grupo y que el contador de la
 *     cabecera coincida con los items que realmente contiene.
 *   - El balance de <div> del HTML completo, porque un wrapper de grupo sin
 *     cerrar rompe el layout entero.
 *
 * Metodo: NO hay jsdom ni red. Se extraen por nombre las funciones y los
 * arrays reales del HTML, se ejecutan en un vm con un mini-DOM propio y se
 * comparan los datos de entrada con el HTML renderizado.
 *
 * Los datos de entrada son PARAMETRIZABLES (objeto CASOS al final): si alguien
 * anade items reales, cambia el reparto o el numero de grupos, el script sigue
 * en verde sin reescribirlo. El unico numero que si es contrato (el tope de
 * albumes) esta declarado y marcado como tal.
 *
 * Uso:  node scripts/smoke_grupos_perfil.js     (sin argumentos ni env)
 * Salida: una linea por comprobacion + resumen N/N. Exit 0 si todo pasa, 1 si algo falla.
 */

var fs = require('fs');
var os = require('os');
var path = require('path');
var vm = require('vm');
var cp = require('child_process');

var ROOT = path.resolve(__dirname, '..');
var HTML_REL = 'mi-perfil.html';
var HTML_ABS = path.resolve(ROOT, HTML_REL);
var DOT = '\u00B7'; // separador de .pf-grupo-count

/* ------------------------------------------------------------------ *
 * Corrida de comprobaciones
 * ------------------------------------------------------------------ */

var pass = 0;
var fail = 0;

function log(msg) {
  process.stdout.write(String(msg) + '\n');
}

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

function igual(id, real, esperado, extra) {
  return ok(id, real === esperado,
    'real=' + JSON.stringify(real) + ' esperado=' + JSON.stringify(esperado) +
    (extra ? ' (' + extra + ')' : ''));
}

function seccion(titulo) {
  log('');
  log('--- ' + titulo + ' ---');
}

/* ------------------------------------------------------------------ *
 * Utilidades de texto
 * ------------------------------------------------------------------ */

function contar(src, re) {
  var m = src.match(re);
  return m ? m.length : 0;
}

/* Escaneo balanceado de llaves/corchetes respetando cadenas y comentarios,
   para extraer funciones y arrays sin depender de los numeros de linea. */
function bloque(str, inicio, cierre) {
  var prof = 0;
  var i = inicio;
  var n = str.length;
  var abre = str.charAt(inicio);
  while (i < n) {
    var c = str.charAt(i);
    if (c === '/' && str.charAt(i + 1) === '/') {
      i = str.indexOf('\n', i);
      if (i === -1) return -1;
      continue;
    }
    if (c === '/' && str.charAt(i + 1) === '*') {
      i = str.indexOf('*/', i + 2);
      if (i === -1) return -1;
      i += 2;
      continue;
    }
    if (c === '"' || c === "'" || c === String.fromCharCode(96)) {
      var q = c;
      i += 1;
      while (i < n) {
        if (str.charAt(i) === '\\') { i += 2; continue; }
        if (str.charAt(i) === q) { i += 1; break; }
        i += 1;
      }
      continue;
    }
    if (c === cierre) prof -= 1;
    else if (c === abre) prof += 1;
    if (prof === 0) return i;
    i += 1;
  }
  return -1;
}

function extraerFuncion(src, nombre) {
  var idx = src.indexOf('function ' + nombre + '(');
  if (idx === -1) return null;
  var llave = src.indexOf('{', idx);
  if (llave === -1) return null;
  var fin = bloque(src, llave, '}');
  if (fin === -1) return null;
  return src.slice(idx, fin + 1);
}

/* Devuelve el texto de la expresion inicial de "var NOMBRE = <expr>;" */
function extraerVar(src, nombre) {
  var re = new RegExp('\\bvar\\s+' + nombre + '\\s*=\\s*', 'g');
  var m = re.exec(src);
  if (!m) return null;
  var i = m.index + m[0].length;
  var c = src.charAt(i);
  var fin = -1;
  var cerrado = false;
  if (c === '{') { fin = bloque(src, i, '}'); cerrado = true; }
  else if (c === '[') { fin = bloque(src, i, ']'); cerrado = true; }
  else fin = src.indexOf(';', i);
  if (fin === -1) return null;
  return src.slice(i, cerrado ? fin + 1 : fin);
}

/* ------------------------------------------------------------------ *
 * Mini-DOM (lo justo que usan pfGruposRender/pfGruposToggle/misAlbumesPintar)
 * ------------------------------------------------------------------ */

var VOID_TAGS = {
  area: 1, base: 1, br: 1, col: 1, embed: 1, hr: 1, img: 1,
  input: 1, link: 1, meta: 1, param: 1, source: 1, track: 1, wbr: 1
};
var RAW_TAGS = { script: 1, style: 1, textarea: 1, title: 1 };

function Nodo(tag) {
  this.tag = tag;
  this.attrs = {};
  this.hijos = [];
  this.padre = null;
  this.textos = [];
  this.style = {};
  var self = this;
  /* El DOM real refleja "el.id = 'x'" en getElementById. Este harness solo
     miraba attrs.id, asi que un nodo creado con createElement y etiquetado por
     propiedad (caso real: el boton de ver-mas de Albumes) era invisible para
     el harness y producia falsos FAIL. Sin este getter/setter la asercion de
     "el boton existe" miente. */
  Object.defineProperty(this, 'id', {
    get: function () { return self.attrs.id || ''; },
    set: function (v) { self.attrs.id = v; }
  });
  this.classList = {
    contains: function (c) { return self.clases().indexOf(c) !== -1; },
    add: function (c) {
      var l = self.clases();
      if (l.indexOf(c) === -1) l.push(c);
      self.attrs['class'] = l.join(' ');
    },
    remove: function (c) {
      var l = self.clases();
      var i = l.indexOf(c);
      if (i !== -1) l.splice(i, 1);
      self.attrs['class'] = l.join(' ');
    },
    toggle: function (c, force) {
      var on = force === undefined ? self.classList.contains(c) === false : !!force;
      if (on) self.classList.add(c); else self.classList.remove(c);
      return on;
    }
  };
}

Nodo.prototype.clases = function () {
  var s = String(this.attrs['class'] || '');
  return s ? s.split(/\s+/) : [];
};

Nodo.prototype.getAttribute = function (k) {
  var v = this.attrs[k];
  return v === undefined ? null : v;
};

Nodo.prototype.setAttribute = function (k, v) {
  this.attrs[k] = String(v);
};

Object.defineProperty(Nodo.prototype, 'textoTotal', {
  get: function () {
    var s = this.textos.join('');
    for (var i = 0; i < this.hijos.length; i++) s += this.hijos[i].textoTotal;
    return s;
  }
});

Nodo.prototype.appendChild = function (hijo) {
  hijo.padre = this;
  this.hijos.push(hijo);
  this.textos = [];
  return hijo;
};

Nodo.prototype.limpiar = function () {
  this.hijos = [];
  this.textos = [];
};

Nodo.prototype.buscar = function (sel, todos) {
  var tag = null;
  var cls = null;
  var m = /^([A-Za-z][\w-]*)?(?:\.([\w-]+))?$/.exec(String(sel).trim());
  if (!m) return todos ? [] : null;
  tag = m[1] ? m[1].toLowerCase() : null;
  cls = m[2] || null;
  var out = [];
  var stack = this.hijos.slice();
  while (stack.length) {
    var nd = stack.shift();
    var good = true;
    if (tag && nd.tag !== tag) good = false;
    if (good && cls && !nd.classList.contains(cls)) good = false;
    if (good) {
      out.push(nd);
      if (!todos) return nd;
    }
    stack = stack.concat(nd.hijos);
  }
  return todos ? out : null;
};

Nodo.prototype.querySelector = function (sel) { return this.buscar(sel, false); };
Nodo.prototype.querySelectorAll = function (sel) { return this.buscar(sel, true); };
Nodo.prototype.getElementsByClassName = function (c) {
  var out = [];
  var stack = this.hijos.slice();
  while (stack.length) {
    var nd = stack.shift();
    if (nd.classList.contains(c)) out.push(nd);
    stack = stack.concat(nd.hijos);
  }
  return out;
};

Object.defineProperty(Nodo.prototype, 'className', {
  get: function () { return String(this.attrs['class'] || ''); },
  set: function (v) { this.attrs['class'] = String(v); }
});

Object.defineProperty(Nodo.prototype, 'innerHTML', {
  get: function () { return serializar(this); },
  set: function (html) {
    this.limpiar();
    var raices = parsear(String(html));
    for (var i = 0; i < raices.length; i++) this.appendChild(raices[i]);
  }
});

Object.defineProperty(Nodo.prototype, 'textContent', {
  get: function () { return this.textoTotal; },
  set: function (t) {
    this.limpiar();
    this.textos = [String(t)];
  }
});

function serializar(nd) {
  if (nd.textos.length && !nd.hijos.length) return nd.textos.join('');
  var attrs = '';
  var keys = Object.keys(nd.attrs);
  for (var i = 0; i < keys.length; i++) {
    attrs += ' ' + keys[i] + '="' + nd.attrs[keys[i]] + '"';
  }
  if (VOID_TAGS[nd.tag]) return '<' + nd.tag + attrs + '>';
  var out = '<' + nd.tag + attrs + '>';
  out += nd.textos.join('');
  for (var j = 0; j < nd.hijos.length; j++) out += serializar(nd.hijos[j]);
  return out + '</' + nd.tag + '>';
}

/* Fin de etiqueta respetando comillas dentro de los atributos. */
function finDeEtiqueta(src, desde) {
  var q = '';
  var i = desde;
  while (i < src.length) {
    var c = src.charAt(i);
    if (q) {
      if (c === q) q = '';
    } else if (c === '"' || c === "'") {
      q = c;
    } else if (c === '>') {
      return i;
    }
    i += 1;
  }
  return -1;
}

function parsear(html) {
  var raices = [];
  var pila = [];
  var i = 0;
  var n = html.length;
  var raiz = null;
  function actual() { return pila.length ? pila[pila.length - 1] : null; }
  while (i < n) {
    var lt = html.indexOf('<', i);
    if (lt === -1) {
      var a = actual();
      if (a && lt < 0) break;
      if (a && i < n) a.textos.push(html.slice(i));
      break;
    }
    if (lt > i) {
      var padre = actual();
      if (padre) padre.textos.push(html.slice(i, lt));
    }
    if (html.substr(lt, 4) === '<!--') {
      var fc = html.indexOf('-->', lt + 4);
      i = fc === -1 ? n : fc + 3;
      continue;
    }
    if (html.charAt(lt + 1) === '/') {
      var gt = finDeEtiqueta(html, lt + 2);
      var nombre = html.slice(lt + 2, gt === -1 ? n : gt).trim().toLowerCase();
      for (var p = pila.length - 1; p >= 0; p--) {
        if (pila[p].tag === nombre) { pila.length = p; break; }
      }
      i = gt === -1 ? n : gt + 1;
      continue;
    }
    var gt2 = finDeEtiqueta(html, lt + 1);
    if (gt2 === -1) break;
    var dentro = html.slice(lt + 1, gt2);
    var auto = dentro.charAt(dentro.length - 1) === '/';
    if (auto) dentro = dentro.slice(0, -1);
    var m = /^([A-Za-z][\w:-]*)/.exec(dentro);
    if (!m) { i = gt2 + 1; continue; }
    var tag = m[1].toLowerCase();
    var nodo = new Nodo(tag);
    var reAttr = /([\w:-]+)\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/g;
    var ma;
    while ((ma = reAttr.exec(dentro)) !== null) {
      var val = ma[3] !== undefined ? ma[3] : (ma[4] !== undefined ? ma[4] : (ma[5] || ''));
      nodo.attrs[ma[1].toLowerCase()] = val;
    }
    if (nodo.attrs.style) {
      nodo.style.cssText = nodo.attrs.style;
      var decl = nodo.attrs.style.split(';');
      for (var d = 0; d < decl.length; d++) {
        var pv = decl[d].split(':');
        if (pv.length >= 2) {
          nodo.style[pv[0].trim().toLowerCase()] = pv.slice(1).join(':').trim();
        }
      }
    }
    if (!pila.length) { raiz = raiz || nodo; raices.push(nodo); }
    else actual().appendChild(nodo);
    if (RAW_TAGS[tag]) {
      var cierre = html.toLowerCase().indexOf('</' + tag, gt2);
      i = cierre === -1 ? n : cierre;
      continue;
    }
    if (!auto && !VOID_TAGS[tag]) pila.push(nodo);
    i = gt2 + 1;
  }
  return raices;
}

function crearDocumento() {
  var raiz = new Nodo('#doc');
  return {
    body: raiz,
    createElement: function (tag) { return new Nodo(String(tag).toLowerCase()); },
    getElementById: function (id) {
      var stack = [raiz];
      while (stack.length) {
        var nd = stack.shift();
        if (nd.attrs && nd.attrs.id === id) return nd;
        stack = stack.concat(nd.hijos);
      }
      return null;
    },
    _raiz: raiz
  };
}

/* ------------------------------------------------------------------ *
 * Lectores del HTML renderizado por pfGruposRender
 * ------------------------------------------------------------------ */

function itemsDe(nodo) {
  if (!nodo) return [];
  return nodo.getElementsByClassName('pf-item');
}

function idItems(nodo) {
  var out = [];
  var its = itemsDe(nodo);
  for (var i = 0; i < its.length; i++) out.push(its[i].getAttribute('data-item-id'));
  return out;
}

function gruposDe(grid) {
  var wraps = grid ? grid.getElementsByClassName('pf-grupo') : [];
  var out = [];
  for (var i = 0; i < wraps.length; i++) {
    var w = wraps[i];
    var btn = w.querySelector('.pf-grupo-btn');
    var cnt = w.querySelector('.pf-grupo-count');
    var nom = w.querySelector('.pf-grupo-nombre');
    var body = w.querySelector('.pf-grupo-body');
    var m = /(\d+)\s*$/.exec(cnt ? cnt.textContent : '');
    out.push({
      wrap: w,
      id: w.getAttribute('id') || '',
      etiqueta: nom ? nom.textContent : '',
      abierto: w.classList.contains('pf-grupo-abierto'),
      aria: btn ? btn.getAttribute('aria-expanded') : null,
      display: body && body.style ? body.style.display : null,
      declarado: m ? Number(m[1]) : NaN,
      items: itemsDe(body),
      claves: {}
    });
  }
  for (var g = 0; g < out.length; g++) {
    var its = out[g].items;
    for (var j = 0; j < its.length; j++) {
      var k = its[j].getAttribute('data-key');
      out[g].claves[k] = (out[g].claves[k] || 0) + 1;
    }
  }
  return out;
}

function gridDe(doc, id) { return doc.getElementById(id); }

function estadoDe(gs, id) {
  for (var i = 0; i < gs.length; i++) if (gs[i].id === id) return gs[i].abierto ? 'abierto' : 'cerrado';
  return 'inexistente';
}

function abiertosDe(gs) {
  var out = [];
  for (var i = 0; i < gs.length; i++) if (gs[i].abierto) out.push(gs[i].id);
  return out;
}

/* ------------------------------------------------------------------ *
 * Sandbox
 * ------------------------------------------------------------------ */

function crearEsc() {
  return function esc(s) {
    if (!s) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };
}

var SRC_ITEM = [
  'function __pfItem(it, clave){',
  '  return \'<div class="pf-item" data-item-id="\' + esc(it.id) + \'" data-key="\' + esc(clave(it)) + \'">\' + esc(it.id) + \'</div>\';',
  '}'
].join('\n');

var SRC_RENDER = [
  'function __pfRender(gridId, items, clave, grupos){',
  '  var grid = document.getElementById(gridId);',
  '  grid.innerHTML = pfGruposRender(gridId, items, clave, grupos, function(it){ return __pfItem(it, clave); });',
  '  return grid;',
  '}'
].join('\n');

var SRC_NIVELES = [
  'function __pfNiveles(items, curIdx){',
  '  var cur = items[curIdx];',
  '  pfNivelesAutoAbrirGrupo(cur, curIdx);',
  '  var el = document.getElementById(\'pf-niveles\');',
  '  el.innerHTML = pfGruposRender(\'pf-niveles\', items, nivelesGrupoClave, NIVELES_ERAS, function(l){ return __pfItem(l, nivelesGrupoClave); });',
  '  return el;',
  '}'
].join('\n');

var SRC_RESET = [
  'function __pfReset(){',
  '  _pfGruposAbiertos = {};',
  '  _pfNivelesGrupoAuto = \'\';',
  '  misAlbumesVerMas.expandido = false;',
  '}'
].join('\n');

function crearSandbox(chunks, grids) {
  var doc = crearDocumento();
  var ctx = {
    document: doc,
    esc: crearEsc(),
    console: console,
    JSON: JSON,
    Math: Math,
    Date: Date,
    Number: Number,
    String: String
  };
  ctx.window = ctx;
  ctx.self = ctx;
  vm.createContext(ctx);
  for (var i = 0; i < grids.length; i++) {
    var g = doc.createElement('div');
    g.attrs.id = grids[i];
    doc.body.appendChild(g);
  }
  vm.runInContext(chunks.join('\n'), ctx, { filename: 'mi-perfil-inline.js' });
  return ctx;
}

/* ------------------------------------------------------------------ *
 * Datos de entrada PARAMETRIZABLES (aqui se tocan, no en las aserciones)
 * ------------------------------------------------------------------ */

var CASOS = [
  {
    id: 'museo',
    titulo: 'Museo',
    grid: 'museo-recursos-grid',
    gruposVar: 'MUSEO_GRUPOS',
    claveFn: 'museoGrupoClave',
    /* Se usa cada uno de los tres campos que el backend escribe, para que el
       test ejercite tambien la cadena de fallback. */
    reparto: { foto: 143, video: 41, audio: 16 }
  },
  {
    id: 'guardados',
    titulo: 'Guardados',
    grid: 'mis-guardados-media-grid',
    gruposVar: 'GUARDADOS_GRUPOS',
    claveFn: 'guardadosGrupoClave',
    reparto: { album: 6, album_foto: 6, viajero_foto: 6, curada: 7 }
  },
  {
    id: 'niveles',
    titulo: 'Niveles',
    grid: 'pf-niveles',
    gruposVar: 'NIVELES_ERAS',
    claveFn: 'nivelesGrupoClave',
    reparto: { Caminante: 10, Explorador: 10, Cronista: 10, Leyenda: 5, Mito: 5 }
  }
];

var ALBUMES = {
  total: 50,
  minimo: 5,
  exacto: 24
};
/* CONTRATO (no dato): ADR-077 fija el tope de albumes visibles en 24. Si alguien
   lo cambia en mi-perfil.html, este script debe FALLAR, novolarse. */
var TOPE_ALBUMES_CONTRATO = 24;
var CASO_ESCALA = 1000;

function itemCaso(caso, clave, i) {
  var id = caso.id + '-' + clave + '-' + i;
  if (caso.id === 'museo') {
    var campo = ['media_type', 'foto_type', 'tipo_media'][i % 3];
    var it = { id: id, foto_url: 'https://f/' + id };
    it[campo] = clave;
    return it;
  }
  if (caso.id === 'guardados') {
    return { id: id, fuente: clave, foto_url: 'https://f/' + id, mi_album_id: null };
  }
  return { id: id, era: clave, min: i * 100, max: i * 100 + 99, nombre: 'N' + i, emoji: '*' };
}

function generarItems(caso) {
  var items = [];
  var claves = Object.keys(caso.reparto);
  var n = 0;
  for (var i = 0; i < claves.length; i++) {
    var c = claves[i];
    for (var j = 0; j < caso.reparto[c]; j++) {
      items.push(itemCaso(caso, c, n));
      n += 1;
    }
  }
  return items;
}

function generarAlbumes(total) {
  var out = [];
  for (var i = 0; i < total; i++) {
    out.push({
      id: 'al-' + i,
      titulo: 'Album ' + i,
      fotos_count: i,
      votos_count: i,
      lat: 4.6,
      lng: -74.0,
      portada_url: 'https://f/al-' + i + '.jpg'
    });
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * Comprobaciones
 * ------------------------------------------------------------------ */

function correr() {
  var tmpDir = null;
  try {
    if (!fs.existsSync(HTML_ABS)) {
      seccion('Archivo');
      ok('html-existe', false, 'no se encuentra ' + HTML_REL + ' en ' + ROOT);
      return;
    }
    var html = fs.readFileSync(HTML_ABS, 'utf8');
    log('smoke_grupos_perfil - agrupacion plegable de Mi perfil');
    log('Archivo: ' + HTML_REL + ' (' + html.length + ' bytes)');

    /* ---------------- 1. HTML: balance y sintaxis ---------------- */
    seccion('1. HTML: balance de divs y sintaxis de los scripts inline');
    var abre = contar(html, /<div\b/gi);
    var cierra = contar(html, /<\/div\s*>/gi);
    igual('html-balance-divs', abre - cierra, 0, '<div>=' + abre + ' </div>=' + cierra);
    ok('html-tiene-divs', abre > 100, 'divs abiertos=' + abre);

    var prof = 0;
    var minProf = 0;
    var reDiv = /<\/?div\b[^>]*>/gi;
    var md;
    while ((md = reDiv.exec(html)) !== null) {
      prof += md[0].charAt(1) === '/' ? -1 : 1;
      if (prof < minProf) minProf = prof;
    }
    igual('html-divs-anidados', prof, 0, 'profundidad final');
    ok('html-divs-no-sobran-cierres', minProf === 0, 'profundidad minima=' + minProf);

    var scripts = extraerScriptsInline(html);
    ok('html-scripts-inline', scripts.length >= 1, 'scripts inline=' + scripts.length);
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'smoke-grupos-'));
    var fallosSint = 0;
    var detalleSint = '';
    for (var s = 0; s < scripts.length; s++) {
      var ext = scripts[s].module ? '.mjs' : '.js';
      var f = path.join(tmpDir, 'inline-' + s + ext);
      fs.writeFileSync(f, scripts[s].contenido, 'utf8');
      var r = cp.spawnSync(process.execPath, ['--check', f], { encoding: 'utf8' });
      if (r.status !== 0) {
        fallosSint += 1;
        if (!detalleSint) {
          detalleSint = 'bloque ' + (s + 1) + ': ' + primeraLineaUtil(String(r.stderr || r.stdout || ''));
        }
      }
    }
    igual('html-scripts-node-check', fallosSint, 0, scripts.length + ' bloque(s) ' + detalleSint);

    /* ---------------- 2. Extraccion del helper ---------------- */
    seccion('2. Extraccion del helper generico desde ' + HTML_REL);
    var nombres = ['pfGruposToggle', 'pfGruposRender', 'museoGrupoClave',
      'guardadosGrupoClave', 'nivelesGrupoClave', 'pfNivelesAutoAbrirGrupo',
      'misAlbumesBoton', 'misAlbumesToggleVerMas', 'misAlbumesPintar'];
    var faltan = [];
    var chunks = [];
    for (var nf = 0; nf < nombres.length; nf++) {
      var fx = extraerFuncion(html, nombres[nf]);
      if (!fx) faltan.push(nombres[nf]);
      else chunks.push(fx);
    }
    var vars = ['_pfGruposAbiertos', '_pfNivelesGrupoAuto', 'misAlbumesVerMas',
      'MIS_ALBUMES_VER_MAS', 'MUSEO_GRUPOS', 'GUARDADOS_GRUPOS', 'NIVELES_ERAS'];
    var faltanVars = [];
    for (var nv = 0; nv < vars.length; nv++) {
      var vx = extraerVar(html, vars[nv]);
      if (vx === null) faltanVars.push(vars[nv]);
      else chunks.push('var ' + vars[nv] + ' = ' + vx + ';');
    }
    igual('helper-funcionanes', faltan.join(','), '');
    igual('helper-variables', faltanVars.join(','), '');

    var fxRender = extraerFuncion(html, 'pfGruposRender');
    var fxToggle = extraerFuncion(html, 'pfGruposToggle');
    var fxNiveles = extraerFuncion(html, 'renderNiveles');
    ok('helper-no-toca-dom-directo', fxRender !== null && !/innerHTML\s*=/.test(fxRender),
      'pfGruposRender solo devuelve el string');
    ok('helper-sin-data-tab', fxRender !== null && !/data-tab/.test(fxRender),
      'los wrappers no pueden llevar data-tab (ADR-077)');
    ok('helper-toggle-activa-clase', fxToggle !== null && /pf-grupo-abierto/.test(fxToggle) &&
      /aria-expanded/.test(fxToggle) && /pf-grupo-body/.test(fxToggle),
      'pfGruposToggle alterna clase, aria-expanded y cuerpo');
    var iAuto = fxNiveles ? fxNiveles.indexOf('pfNivelesAutoAbrirGrupo') : -1;
    var iRen = fxNiveles ? fxNiveles.indexOf('pfGruposRender') : -1;
    ok('niveles-auto-antes-de-render', iAuto !== -1 && iRen !== -1 && iAuto < iRen,
      'renderNiveles auto-abre y despues agrupa');

    var grids = ['grid-generico'];
    var casosDefs = [];
    for (var ci = 0; ci < CASOS.length; ci++) {
      var caso = CASOS[ci];
      grids.push(caso.grid);
      casosDefs.push(caso);
    }
    grids.push('mis-albumes-grid');

    var fuenteSandbox = [chunks.join('\n'), SRC_ITEM, SRC_RENDER, SRC_NIVELES, SRC_RESET].join('\n');
    var ctx = null;
    var errSandbox = '';
    try {
      ctx = crearSandbox([fuenteSandbox], grids);
    } catch (err) {
      errSandbox = String(err && err.message ? err.message : err);
    }
    ok('sandbox-arranca', ctx !== null, errSandbox);
    if (!ctx) return;

    var tope = Number(ctx.MIS_ALBUMES_VER_MAS);
    igual('albumes-tope-contrato', tope, TOPE_ALBUMES_CONTRATO,
      'MIS_ALBUMES_VER_MAS debe seguir en ' + TOPE_ALBUMES_CONTRATO);

    /* ---------------- 3. Integridad de la agrupacion por modulo ---------------- */
    for (var c2 = 0; c2 < casosDefs.length; c2++) {
      var caso2 = casosDefs[c2];
      var pre = caso2.titulo.toLowerCase() + ' ';
      var items = generarItems(caso2);
      var claveFn = ctx[caso2.claveFn];
      var grupos = ctx[caso2.gruposVar];
      ctx.__pfReset();
      var grid = ctx.__pfRender(caso2.grid, items, claveFn, grupos);
      var gs = gruposDe(grid);
      var total = 0;
      for (var t = 0; t < gs.length; t++) total += gs[t].items.length;
      var prefixo = pre;

      igual(prefixo + 'items-preservados', total, items.length,
        'entrada=' + items.length + ' renderizados=' + total);

      var vistos = {};
      var duplicados = [];
      for (var v = 0; v < gs.length; v++) {
        var suid = gs[v].items;
        for (var v2 = 0; v2 < suid.length; v2++) {
          var iid = suid[v2].getAttribute('data-item-id');
          if (vistos[iid]) duplicados.push(iid);
          vistos[iid] = true;
        }
      }
      var perdidos = [];
      for (var p = 0; p < items.length; p++) {
        if (!vistos[items[p].id]) perdidos.push(items[p].id);
      }
      ok(prefixo + 'ningun-item-duplicado', duplicados.length === 0,
        duplicados.length ? 'duplicados: ' + duplicados.slice(0, 3).join(',') : 'ok');
      ok(prefixo + 'ningun-item-perdido', perdidos.length === 0,
        perdidos.length ? 'perdidos: ' + perdidos.slice(0, 3).join(',') : 'ok');

      var malas = [];
      for (var g2 = 0; g2 < gs.length; g2++) {
        if (gs[g2].declarado !== gs[g2].items.length) {
          malas.push(gs[g2].etiqueta + ': cabecera=' + gs[g2].declarado + ' real=' + gs[g2].items.length);
        }
      }
      ok(prefixo + 'contador-cabecera-coincide', malas.length === 0,
        malas.length ? malas.join(' | ') : gs.length + ' grupos, todos cuadran');

      var clavesDistintas = {};
      for (var kk = 0; kk < gs.length; kk++) {
        var kk2 = Object.keys(gs[kk].claves);
        for (var k3 = 0; k3 < kk2.length; k3++) clavesDistintas[kk2[k3]] = true;
      }
      var sinItems = [];
      for (var g3 = 0; g3 < gs.length; g3++) if (gs[g3].items.length === 0) sinItems.push(gs[g3].etiqueta);
      igual(prefixo + 'grupos-solo-con-items', sinItems.join(','), '');
      igual(prefixo + 'grupos-creados', gs.length, Object.keys(clavesDistintas).length,
        'claves distintas en los items');

      var malaClave = [];
      var prefijoId = caso2.grid + '-grp-';
      for (var g4 = 0; g4 < gs.length; g4++) {
        if (gs[g4].id.indexOf(prefijoId) !== 0) {
          malaClave.push('id:' + gs[g4].id);
          continue;
        }
        var sufijo = gs[g4].id.slice(prefijoId.length);
        for (var m2 = 0; m2 < gs[g4].items.length; m2++) {
          var dk = gs[g4].items[m2].getAttribute('data-key');
          if (dk !== sufijo) malaClave.push(gs[g4].items[m2].getAttribute('data-item-id') + '->' + dk);
        }
      }
      ok(prefixo + 'clave-de-grupo-correcta', malaClave.length === 0,
        malaClave.length ? malaClave.slice(0, 3).join(',') : 'cada item cae en el grupo de su clave');

      var plegados = 0;
      for (var g5 = 0; g5 < gs.length; g5++) {
        if (!gs[g5].abierto && gs[g5].aria === 'false' && gs[g5].display === 'none') plegados += 1;
      }
      igual(prefixo + 'arranca-plegado', plegados, gs.length,
        gs.length + ' grupos deben arrancar plegados');
    }

    /* ---------------- 4. Plegado: toggle y re-render ---------------- */
    seccion('4. Plegado: toggle, conservacion de estado y claves no previstas');
    var casoM = casosDefs[0];
    var itemsM = generarItems(casoM);
    ctx.__pfReset();
    var gridM = ctx.__pfRender(casoM.grid, itemsM, ctx[casoM.claveFn], ctx[casoM.gruposVar]);
    var gsM = gruposDe(gridM);
    var antes = idItems(gridM);
    var clave0 = gsM.length ? Object.keys(gsM[0].claves)[0] : null;

    ctx.pfGruposToggle(casoM.grid, clave0);
    var gsA = gruposDe(gridM);
    var abierto = null;
    var otrosCerrados = true;
    for (var q = 0; q < gsA.length; q++) {
      if (gsA[q].items.length && gsA[q].items[0].getAttribute('data-key') === clave0) abierto = gsA[q];
      else if (gsA[q].abierto || gsA[q].aria !== 'false' || gsA[q].display !== 'none') otrosCerrados = false;
    }
    ok('toggle-abre-aria-y-visibilidad', abierto !== null && abierto.abierto &&
      abierto.aria === 'true' && abierto.display === 'grid',
      abierto ? 'clave=' + clave0 + ' aria=' + abierto.aria + ' display=' + abierto.display : 'grupo no encontrado');
    igual('toggle-no-abre-los-demas', otrosCerrados, true);

    var despues = idItems(gridM);
    var mismo = antes.length === despues.length;
    for (var u = 0; mismo && u < antes.length; u++) if (antes[u] !== despues[u]) mismo = false;
    igual('toggle-no-altera-items', mismo, true,
      'mismos items en el mismo orden (' + despues.length + ')');
    igual('toggle-no-duplica-grupos', gruposDe(gridM).length, gsM.length,
      'numero de grupos invariante');

    ctx.pfGruposToggle(casoM.grid, clave0);
    var gsC = gruposDe(gridM);
    var cerrada = null;
    for (var q2 = 0; q2 < gsC.length; q2++) {
      if (gsC[q2].items.length && gsC[q2].items[0].getAttribute('data-key') === clave0) cerrada = gsC[q2];
    }
    ok('toggle-cierra', cerrada !== null && !cerrada.abierto && cerrada.aria === 'false' &&
      cerrada.display === 'none', 'vuelve al estado inicial');

    ctx.pfGruposToggle(casoM.grid, clave0);
    var gridM2 = ctx.__pfRender(casoM.grid, itemsM, ctx[casoM.claveFn], ctx[casoM.gruposVar]);
    var gsR = gruposDe(gridM2);
    var sigueAbierto = false;
    for (var q3 = 0; q3 < gsR.length; q3++) {
      if (gsR[q3].items.length && gsR[q3].items[0].getAttribute('data-key') === clave0 && gsR[q3].abierto) sigueAbierto = true;
    }
    ok('re-render-conserva-abierto', sigueAbierto, 'el estado vive fuera del DOM');

    /* Clave no declarada en el array de grupos: debe agruparse al final. */
    ctx.__pfReset();
    var sueltos = [];
    for (var e = 0; e < 7; e++) sueltos.push({ id: 'x-' + e, tipo: e % 2 === 0 ? 'k1' : 'k9' });
    var gridS = ctx.__pfRender('grid-generico', sueltos,
      function (it) { return it.tipo; },
      [{ clave: 'k1', etiqueta: 'K1' }]);
    var gsS = gruposDe(gridS);
    var totalS = 0;
    for (var e2 = 0; e2 < gsS.length; e2++) totalS += gsS[e2].items.length;
    igual('clave-no-declarada-no-se-pierde', totalS, sueltos.length,
      'items=' + sueltos.length + ' grupos=' + gsS.length + ' (declarados=1)');

    /* ---------------- 5. Niveles: auto-apertura del grupo actual ---------------- */
    seccion('5. Niveles: auto-apertura del grupo del nivel actual');
    var casoNv = casosDefs[2];
    var itemsNv = generarItems(casoNv);
    ctx.__pfReset();
    var gridNv = ctx.__pfNiveles(itemsNv, 0);
    var gsN1 = gruposDe(gridNv);
    var abiertosN1 = [];
    for (var n1 = 0; n1 < gsN1.length; n1++) if (gsN1[n1].abierto) abiertosN1.push(gsN1[n1].id);
    igual('niveles-auto-abre-una-sola-vez', abiertosN1.length, 1,
      abiertosN1.length ? abiertosN1[0] : 'ninguno abierto');
    var claveActual = itemsNv[0].era;
    var grupoActual = casoNv.grid + '-grp-' + claveActual;
    igual('niveles-auto-abre-la-era-actual', abiertosN1.join(','), grupoActual,
      'nivel 1 era=' + claveActual);

    var totalN1 = 0;
    for (var n2 = 0; n2 < gsN1.length; n2++) totalN1 += gsN1[n2].items.length;
    igual('niveles-auto-no-pierde-items', totalN1, itemsNv.length,
      'entrada=' + itemsNv.length);

    /* El grupo del nivel actual ya esta abierto tras el primer render: un
       toggle lo cierra y el veto del usuario debe sobrevivir al re-render. */
    ctx.pfGruposToggle(casoNv.grid, claveActual);
    ctx.__pfNiveles(itemsNv, 0);
    igual('niveles-veto-cierre-del-usuario', estadoDe(gruposDe(gridNv), grupoActual), 'cerrado',
      'el usuario cerro el grupo: la auto-apertura no lo reabre');

    /* El usuario abre una OTRA era: debe seguir abierta tras el re-render
       (el estado vive fuera del DOM) y la auto-apertura no debe pisarla. */
    var claveOtra = '';
    for (var nk = 0; nk < itemsNv.length; nk++) {
      if (itemsNv[nk].era !== claveActual) { claveOtra = itemsNv[nk].era; break; }
    }
    if (claveOtra) {
      ctx.pfGruposToggle(casoNv.grid, claveOtra);
      ctx.__pfNiveles(itemsNv, 0);
      var gsN2 = gruposDe(gridNv);
      igual('niveles-respeta-apertura-manual', estadoDe(gsN2, casoNv.grid + '-grp-' + claveOtra), 'abierto',
        'el usuario abrio la era=' + claveOtra);
      igual('niveles-auto-no-reabre-la-era-cerrada', estadoDe(gsN2, grupoActual), 'cerrado',
        'la era cerrada por el usuario sigue cerrada');
      igual('niveles-auto-no-impone-tras-toggle', abiertosDe(gsN2).length, 1,
        'solo queda abierto el grupo que el usuario abrio a mano');
    }

    /* Con una decision del usuario, ningun re-render vuelve a imponer nada. */
    ctx.__pfReset();
    ctx.__pfNiveles(itemsNv, 0);
    ctx.pfGruposToggle(casoNv.grid, claveActual);
    ctx.pfGruposToggle(casoNv.grid, claveActual);
    ctx.pfGruposToggle(casoNv.grid, claveActual);
    ctx.__pfNiveles(itemsNv, 0);
    igual('niveles-auto-solo-en-primer-render', abiertosDe(gruposDe(gridNv)).length, 0,
      'tras decidir el usuario, ningun re-render vuelve a imponer nada');

    /* Sube de nivel: la era nueva se abre sola si el usuario no decidio sobre
       ella, y la era que el usuario CERRO se queda cerrada (veto). */
    var primeraDeOtraEra = -1;
    for (var n6 = 0; n6 < itemsNv.length; n6++) {
      if (itemsNv[n6].era !== claveActual) { primeraDeOtraEra = n6; break; }
    }
    if (primeraDeOtraEra !== -1) {
      ctx.__pfReset();
      ctx.__pfNiveles(itemsNv, 0);
      var otraClave = itemsNv[primeraDeOtraEra].era;
      ctx.pfGruposToggle(casoNv.grid, claveActual);
      ctx.__pfNiveles(itemsNv, primeraDeOtraEra);
      var gsN5 = gruposDe(gridNv);
      igual('niveles-auto-abre-era-nueva-al-subir',
        estadoDe(gsN5, casoNv.grid + '-grp-' + otraClave), 'abierto',
        'subio a era=' + otraClave);
      igual('niveles-no-reabre-la-era-que-cerro-el-usuario', estadoDe(gsN5, grupoActual), 'cerrado',
        'el veto del usuario sobrevive al cambio de nivel');
      igual('niveles-auto-abre-solo-la-era-nueva', abiertosDe(gsN5).length, 1,
        'solo la era nueva, nada mas');
    }

    /* ---------------- 6. Mis Albumes: tope y boton ---------------- */
    seccion('6. Mis Albumes: tope de visibles, boton y ver mas');
    ctx.__pfReset();
    ctx.misAlbumesPintar(generarAlbumes(ALBUMES.total));
    var gridAl = gridDe(ctx.document, 'mis-albumes-grid');
    var cards = gridAl.getElementsByClassName('pf-album-card');
    var visibles = 0;
    for (var ac = 0; ac < cards.length; ac++) {
      if (cards[ac].style.display !== 'none') visibles += 1;
    }
    igual('albumes-cards-en-dom', cards.length, ALBUMES.total,
      'ningun item se borra del DOM (ADR-003)');
    igual('albumes-visibles-tope', visibles, tope,
      'tope=' + tope + ' de ' + ALBUMES.total);
    var ocultos = cards.length - visibles;
    igual('albumes-ocultos', ocultos, ALBUMES.total - tope, 'display:none, no eliminados');

    var btn = gridDe(ctx.document, 'mis-albumes-ver-mas');
    ok('albumes-boton-presente', btn !== null,
      'boton presente con ' + ALBUMES.total + ' albumes');
    if (btn) {
      var txt = btn.textContent;
      ok('albumes-boton-contador', txt.indexOf('+' + ocultos) !== -1,
        'texto="' + txt + '" esperado +' + ocultos);
    }

    var cardsAntes = cards.length;
    ctx.misAlbumesToggleVerMas();
    var cards2 = gridAl.getElementsByClassName('pf-album-card');
    var visibles2 = 0;
    for (var ac2 = 0; ac2 < cards2.length; ac2++) {
      if (cards2[ac2].style.display !== 'none') visibles2 += 1;
    }
    igual('albumes-ver-mas-muestra-todo', visibles2, ALBUMES.total, 'todos visibles');
    igual('albumes-ver-mas-no-duplica', cards2.length, cardsAntes,
      'mismo numero de tarjetas en el DOM');
    var btn2 = gridDe(ctx.document, 'mis-albumes-ver-mas');
    ok('albumes-ver-mas-cambia-boton', btn2 !== null && btn2.textContent.indexOf('+') === -1,
      btn2 ? 'texto="' + btn2.textContent + '"' : 'sin boton');

    ctx.misAlbumesToggleVerMas();
    var visibles3 = 0;
    var cards3 = gridAl.getElementsByClassName('pf-album-card');
    for (var ac3 = 0; ac3 < cards3.length; ac3++) {
      if (cards3[ac3].style.display !== 'none') visibles3 += 1;
    }
    igual('albumes-ver-mas-vuelve-al-tope', visibles3, tope, 'segundo toggle');

    ctx.__pfReset();
    ctx.misAlbumesPintar(generarAlbumes(tope));
    var gridAl2 = gridDe(ctx.document, 'mis-albumes-grid');
    var cardsE = gridAl2.getElementsByClassName('pf-album-card');
    var visE = 0;
    for (var ae = 0; ae < cardsE.length; ae++) if (cardsE[ae].style.display !== 'none') visE += 1;
    igual('albumes-sin-boton-cuando-cabe', gridDe(ctx.document, 'mis-albumes-ver-mas') === null, true,
      'con ' + tope + ' albumes no se pinta boton');
    igual('albumes-todo-visible-cuando-cabe', visE, cardsE.length, cardsE.length + ' visibles');

    ctx.misAlbumesPintar(generarAlbumes(ALBUMES.minimo));
    var gridAl3 = gridDe(ctx.document, 'mis-albumes-grid');
    igual('albumes-minimo-sin-boton', gridDe(ctx.document, 'mis-albumes-ver-mas') === null, true,
      ALBUMES.minimo + ' albumes, sin boton');
    igual('albumes-minimo-todas-visibles',
      gridAl3.getElementsByClassName('pf-album-card').length, ALBUMES.minimo, 'DOM completo');

    /* ---------------- 7. Robustez: nada de numeros fijos ---------------- */
    seccion('7. Robustez ante cambios de tamano');
    var casoEsc = casosDefs[0];
    var repartoEscala = {};
    var clavesEsc = Object.keys(casoEsc.reparto);
    var repartos = clavesEsc.map(function (k) { return casoEsc.reparto[k]; });
    var sumaEsc = repartos.reduce(function (a, b) { return a + b; }, 0);
    var acum = 0;
    for (var re = 0; re < clavesEsc.length; re++) {
      var cuota = Math.round(CASO_ESCALA * (repartos[re] / sumaEsc));
      if (re === clavesEsc.length - 1) cuota = CASO_ESCALA - acum;
      acum += cuota;
      repartoEscala[clavesEsc[re]] = cuota;
    }
    var itemsEsc = [];
    var cont = 0;
    for (var re2 = 0; re2 < clavesEsc.length; re2++) {
      for (var re3 = 0; re3 < repartoEscala[clavesEsc[re2]]; re3++) {
        itemsEsc.push(itemCaso(casoEsc, clavesEsc[re2], cont));
        cont += 1;
      }
    }
    ctx.__pfReset();
    var gridEsc = ctx.__pfRender(casoEsc.grid, itemsEsc, ctx[casoEsc.claveFn], ctx[casoEsc.gruposVar]);
    var gsEsc = gruposDe(gridEsc);
    var totalEsc = 0;
    for (var e3 = 0; e3 < gsEsc.length; e3++) totalEsc += gsEsc[e3].items.length;
    igual('escala-' + CASO_ESCALA + '-items-preservados', totalEsc, itemsEsc.length,
      'reparto=' + JSON.stringify(repartoEscala));

    ctx.__pfReset();
    var gridVacio = ctx.__pfRender(casoEsc.grid, [], ctx[casoEsc.claveFn], ctx[casoEsc.gruposVar]);
    igual('lista-vacia-sin-grupos', gridVacio.getElementsByClassName('pf-grupo').length, 0,
      'ningun grupo vacio se pinta');
    igual('lista-vacia-sin-items', gridVacio.getElementsByClassName('pf-item').length, 0, 'ok');

    /* Items sin tipo declarado: caen al grupo de fallback, nunca se pierden.
       (undefined/null no se prueban: museoGrupoClave no los contempla y el
       script debe fallar si algun dia eso cambia, no silenciarlo.) */
    ctx.__pfReset();
    var ctxWin = ctx;
    ctxWin.sinTipo = [
      { id: 'z-1' },
      { id: 'z-2', media_type: '' },
      { id: 'z-3', media_type: null },
      { id: 'z-4', foto_type: undefined }
    ];
    var gridLimpio = ctx.__pfRender(casoEsc.grid, ctxWin.sinTipo, ctx[casoEsc.claveFn], ctx[casoEsc.gruposVar]);
    igual('items-sin-clave-no-se-pierden',
      gridLimpio.getElementsByClassName('pf-item').length, ctxWin.sinTipo.length,
      'items sin media_type/fuente caen al grupo de fallback');
  } finally {
    if (tmpDir) {
      try {
        var varfiles = fs.readdirSync(tmpDir);
        for (var fi = 0; fi < varfiles.length; fi++) {
          try { fs.unlinkSync(path.join(tmpDir, varfiles[fi])); } catch (e) { /* ignorar */ }
        }
        fs.rmdirSync(tmpDir);
      } catch (e) { /* ignorar */ }
    }
  }
}

function extraerScriptsInline(html) {
  var out = [];
  var re = /<script\b([^>]*)>/gi;
  var m;
  while ((m = re.exec(html)) !== null) {
    var attrs = String(m[1] || '').toLowerCase();
    if (/\bsrc\s*=/.test(attrs)) continue;
    var tipo = /type\s*=\s*["']?([\w/+-]+)/.exec(attrs);
    var ext = '.js';
    if (tipo) {
      var t = tipo[1];
      if (t === 'module') ext = '.mjs';
      else if (t !== 'text/javascript' && t !== 'application/javascript') continue;
    }
    var ini = re.lastIndex;
    var fin = html.toLowerCase().indexOf('</script', ini);
    if (fin === -1) fin = html.length;
    out.push({ contenido: html.slice(ini, fin), module: ext === '.mjs' });
    re.lastIndex = fin;
  }
  return out;
}

function primeraLineaUtil(txt) {
  var lineas = String(txt).split(/\r?\n/);
  for (var i = 0; i < lineas.length; i++) {
    var l = lineas[i].trim();
    if (l && !/^\s*at /.test(l)) return l.slice(0, 120);
  }
  return 'error desconocido';
}

try {
  correr();
} catch (err) {
  fail += 1;
  log('  FAIL smoke-interno -> ' + String(err && err.stack ? err.stack.split('\n').slice(0, 3).join(' ') : err));
}

log('');
var totalChecks = pass + fail;
log('Resumen: ' + pass + '/' + totalChecks + ' comprobaciones PASS | FAIL ' + fail);
log('Resultado: ' + (fail === 0 ? 'OK' : 'FALLO') + ' (exit ' + (fail === 0 ? 0 : 1) + ')');
process.exitCode = fail === 0 ? 0 : 1;
