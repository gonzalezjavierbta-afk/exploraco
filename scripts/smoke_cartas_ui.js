// scripts/smoke_cartas_ui.js
// SMOKE de comportamiento de cartas-ui.js (066 / ADR-121) sin red y sin navegador.
//
// QUE VIGILA: que los campos NUEVOS que ya devuelve el backend (familia,
// subtipo, edicion, supply_max, emitidas, precio_xp, stats, nivel, poder) se
// pinten en la ficha y en la rejilla, que el POST carta_subir_nivel degrade a
// un mensaje legible, y -sobre todo- que una carta SIN campos nuevos se pinte
// EXACTAMENTE como antes: sin chips vacios, sin "undefined" y sin NaN.
//
// QUE NO VIGILA: el handler del servidor (eso es smoke_cartas_db_tx /
// smoke_cartas_economia) ni el CSS (estatico en smoke_gaming_v61).
//
// DOM minimo al estilo de los smokes del repo: cero jsdom, cero dependencias.
// fetch SIEMPRE en stub. CommonJS, ASCII-safe (ADR-002), 0 backticks.
// Run: node scripts/smoke_cartas_ui.js

'use strict';

var fs = require('fs');
var path = require('path');
var vm = require('vm');

var ROOT = path.join(__dirname, '..');
var SRC = fs.readFileSync(path.join(ROOT, 'cartas-ui.js'), 'utf8');

var total = 0;
var pass = 0;
var fails = 0;

function ok(label) { total++; pass++; console.log('PASS - ' + label); }
function ko(label, detalle) {
  total++; fails++;
  console.log('FAIL - ' + label + (detalle ? ' :: ' + detalle : ''));
}
function assert(cond, label, detalle) { if (cond) ok(label); else ko(label, detalle); }

/* ---------------------------------------------------------------------------
   DOM minimo: solo lo que cartas-ui.js toca de verdad.
   --------------------------------------------------------------------------- */
function Elemento(tag) {
  var e = {
    tagName: String(tag || 'div').toUpperCase(),
    nodeType: 1,
    id: '',
    className: '',
    innerHTML: '',
    textContent: '',
    style: {},
    attrs: {},
    hijos: [],
    parentNode: null,
    disabled: false,
    setAttribute: function (k, v) { e.attrs[String(k)] = String(v); },
    getAttribute: function (k) {
      return Object.prototype.hasOwnProperty.call(e.attrs, k) ? e.attrs[k] : null;
    },
    removeAttribute: function (k) { delete e.attrs[String(k)]; },
    appendChild: function (n) { n.parentNode = e; e.hijos.push(n); return n; },
    addEventListener: function () {},
    removeEventListener: function () {},
    focus: function () {},
    querySelector: function () { return null; },
    classList: null,
    contains: function (n) {
      var c = n;
      while (c) { if (c === e) return true; c = c.parentNode; }
      return false;
    }
  };
  e.classList = {
    add: function (c) { if (!e.classList.contains(c)) e.className = (e.className ? e.className + ' ' : '') + c; },
    remove: function (c) {
      var out = [];
      e.className.split(' ').forEach(function (x) { if (x && x !== c) out.push(x); });
      e.className = out.join(' ');
    },
    contains: function (c) { return (' ' + e.className + ' ').indexOf(' ' + c + ' ') >= 0; }
  };
  return e;
}

function buscar(nodo, id) {
  for (var i = 0; i < nodo.hijos.length; i++) {
    if (nodo.hijos[i].id === id) return nodo.hijos[i];
    var hondo = buscar(nodo.hijos[i], id);
    if (hondo) return hondo;
  }
  return null;
}

function crearEntorno() {
  var body = Elemento('body');
  var doc = {
    body: body,
    activeElement: null,
    documentElement: { contains: function () { return true; } },
    getElementById: function (id) { return buscar(body, id); },
    createElement: function (t) { return Elemento(t); },
    addEventListener: function () {},
    removeEventListener: function () {},
    dispatchEvent: function () { return true; }
  };
  var win = {};
  var sandbox = {
    window: win,
    document: doc,
    console: { log: function () {}, warn: function () {}, error: function () {} },
    fetch: function () { return Promise.reject(new Error('sin red')); }
  };
  win.document = doc;
  sandbox.CustomEvent = function (tipo, init) { this.type = tipo; this.detail = init && init.detail; };
  vm.createContext(sandbox);
  vm.runInContext(SRC, sandbox, { filename: 'cartas-ui.js' });
  return { sandbox: sandbox, win: win, doc: doc, UI: win.CartasUI };
}

/* Cartas de prueba: contratos REALES de cartas_mias / museo_cartas. */
function cartaCompleta() {
  return {
    id: 'ct_leyenda_01',
    nombre: 'Sierra Nevada',
    rareza: 'dorado',
    variante: 'base',
    set_slug: 'leyenda',
    imagen_url: '',
    emisor_tipo: 'sistema',
    marca_nombre: null,
    descripcion: 'Macizo costero.',
    stats_json: { primario: 'alcance', alcance: 14, oficio: 0, fortuna: 10, rendimiento: 0 },
    familia: 'lugar',
    subtipo: 'territorio',
    edicion: 'limitada',
    supply_max: 500,
    emitidas: 120,
    precio_xp: 1500,
    stats: { alcance: 15, oficio: 0, fortuna: 10, rendimiento: 0, presencia: 0, primario: 'alcance' },
    nivel: 3,
    poder: 25,
    nivel_tope: 5,
    coste_nivel_xp: 900
  };
}

function cartaSinCamposNuevos() {
  return {
    id: 'ct_comun_01',
    nombre: 'Mercado viejo',
    rareza: 'comun',
    variante: 'base',
    set_slug: 'comun',
    imagen_url: '',
    emisor_tipo: 'sistema',
    marca_nombre: null,
    descripcion: 'Dato viejo, pre 066.',
    stats_json: { bonus_xp_pct: 5 },
    cantidad: 2,
    activa: true
  };
}

function render(UI, carta, opciones) {
  var host = UI.abrirFicha(carta, opciones || { contexto: 'coleccion' });
  return host ? String(host.innerHTML) : '';
}

/* ---------------------------------------------------------------------------
   1) Carta COMPLETA: todos los campos nuevos se pintan.
   --------------------------------------------------------------------------- */
(function () {
  var env = crearEntorno();
  var UI = env.UI;
  assert(!!UI, 'cartas-ui.js expone window.CartasUI');
  if (!UI) return;

  var html = render(UI, cartaCompleta());
  assert(html.indexOf('c-chip c-chip--juego') >= 0,
    'familia lugar pinta chip con color de capa juego');
  assert(html.indexOf('territorio') >= 0, 'subtipo se pinta en texto pequeno');
  assert(html.indexOf('c-pn-poder') >= 0 && html.indexOf('25') >= 0,
    'poder se pinta como numero destacado');
  assert(html.indexOf('Nivel <b>3</b>/5') >= 0, 'nivel se pinta como N/5');
  assert(html.indexOf('c-eje-bar') >= 0, 'los 4 ejes se pintan con barras finas');
  assert(html.indexOf('>Presencia') >= 0 && html.indexOf('estetica') >= 0,
    'presencia se marca como cosmetica');
  assert(html.indexOf('Edicion limitada') >= 0, 'edicion se pinta');
  assert(html.indexOf('tirada 120 / 500') >= 0, 'tirada como emitidas / supply_max');
  assert(html.indexOf('Acunacion: 1.500 XP') >= 0, 'precio_xp lleva separador de miles');
  assert(html.indexOf('data-c-subir-nivel="1"') >= 0, 'nivel 3 ofrece subir de nivel');
  assert(html.indexOf('900 XP') >= 0, 'el boton muestra el coste en XP del servidor');
  assert(html.indexOf('undefined') < 0 && html.indexOf('NaN') < 0,
    'carta completa no produce undefined ni NaN');

  var meta = UI.cardMeta(cartaCompleta());
  assert(meta.indexOf('c-chip--juego') >= 0 && meta.indexOf('<b>25</b> poder') >= 0
    && meta.indexOf('3/5') >= 0,
    'cardMeta pinta chip + poder + nivel en la rejilla');
})();

/* ---------------------------------------------------------------------------
   2) Carta SIN campos nuevos: markup identico al de antes (degradacion).
   --------------------------------------------------------------------------- */
(function () {
  var env = crearEntorno();
  var UI = env.UI;
  if (!UI) return;
  var html = render(UI, cartaSinCamposNuevos());
  assert(html.indexOf('c-chip') < 0, 'sin familia no hay chip');
  assert(html.indexOf('c-meta') < 0, 'sin campos nuevos no hay bloque de metadatos');
  assert(html.indexOf('c-ficha-det') < 0, 'sin campos nuevos no hay bloque de detalle');
  assert(html.indexOf('c-pn-poder') < 0 && html.indexOf('c-pn-nivel') < 0,
    'sin poder/nivel no se pinta la linea destacada');
  assert(html.indexOf('data-c-subir-nivel') < 0, 'sin nivel no hay boton de subir');
  assert(html.indexOf('undefined') < 0 && html.indexOf('NaN') < 0,
    'carta vieja no produce undefined ni NaN');
  assert(UI.cardMeta(cartaSinCamposNuevos()) === '',
    'cardMeta devuelve cadena vacia con datos viejos');
})();

/* ---------------------------------------------------------------------------
   3) Carta con campos nuevos pero SIN objeto stats: no hay vector.
   --------------------------------------------------------------------------- */
(function () {
  var env = crearEntorno();
  var UI = env.UI;
  if (!UI) return;
  var c = cartaCompleta();
  delete c.stats;
  delete c.stats_json;
  var html = render(UI, c);
  assert(html.indexOf('c-eje') < 0, 'sin stats no se pinta el vector');
  assert(html.indexOf('c-pn-poder') >= 0, 'sin stats el poder del servidor si se pinta');
  assert(html.indexOf('tirada 120 / 500') >= 0, 'sin stats la tirada si se pinta');
  assert(html.indexOf('undefined') < 0 && html.indexOf('NaN') < 0,
    'sin stats no aparece undefined ni NaN');
})();

/* ---------------------------------------------------------------------------
   4) Nivel 5 (tope): sin boton y sin coste.
   --------------------------------------------------------------------------- */
(function () {
  var env = crearEntorno();
  var UI = env.UI;
  if (!UI) return;
  var c = cartaCompleta();
  c.nivel = 5;
  c.poder = 27;
  c.coste_nivel_xp = 0;
  var html = render(UI, c);
  assert(html.indexOf('Nivel <b>5</b>/5') >= 0, 'nivel 5 se pinta como 5/5');
  assert(html.indexOf('data-c-subir-nivel') < 0, 'nivel 5 no ofrece subir de nivel');
})();

/* ---------------------------------------------------------------------------
   5) Subida de nivel: exito y errores legibles, sin red real.
   --------------------------------------------------------------------------- */
(function () {
  var env = crearEntorno();
  var UI = env.UI;
  if (!UI) return;
  var sandbox = env.sandbox;

  function conRespuesta(status, cuerpo) {
    sandbox.fetch = function () {
      return Promise.resolve({
        status: status,
        ok: status >= 200 && status < 300,
        json: function () { return Promise.resolve(cuerpo); }
      });
    };
  }

  var cadena = Promise.resolve();

  cadena = cadena.then(function () {
    sandbox.fetch = function () { return Promise.reject(new Error('sin red')); };
    return UI.subirNivelCarta('ct_leyenda_01', 'base', 3).then(function (r) {
      assert(r && r.ok === false && r.error === 'CONEXION',
        'error de red se degrada a CONEXION');
      assert(!!r.mensaje && r.mensaje.indexOf('conexion') >= 0,
        'error de red trae mensaje legible');
    });
  });

  cadena = cadena.then(function () {
    conRespuesta(200, { ok: true, data: { nivel: 4, coste_xp: 900, nivel_tope: 5 } });
    return UI.subirNivelCarta('ct_leyenda_01', 'base', 3).then(function (r) {
      assert(r && r.ok === true && r.data && r.data.nivel === 4,
        'exito devuelve el nivel nuevo');
    });
  });

  cadena = cadena.then(function () {
    conRespuesta(400, { ok: false, error: 'PUNTOS_INSUFICIENTES', coste_xp: 1800, xp_disponible: 40 });
    return UI.subirNivelCarta('ct_leyenda_01', 'base', 4).then(function (r) {
      assert(r && r.error === 'PUNTOS_INSUFICIENTES',
        'PUNTOS_INSUFICIENTES se propaga como codigo');
      assert(r.mensaje && r.mensaje.indexOf('1.800 XP') >= 0 && r.mensaje.indexOf('40') >= 0,
        'PUNTOS_INSUFICIENTES dice cuanto falta y cuanto hay');
    });
  });

  cadena = cadena.then(function () {
    conRespuesta(409, { ok: false, error: 'NIVEL_DESACTUALIZADO', nivel_actual: 4, nivel_esperado: 3 });
    return UI.subirNivelCarta('ct_leyenda_01', 'base', 3).then(function (r) {
      assert(r && r.error === 'NIVEL_DESACTUALIZADO' && r.mensaje.indexOf('otra pestana') >= 0,
        'NIVEL_DESACTUALIZADO trae mensaje legible');
    });
  });

  cadena = cadena.then(function () {
    conRespuesta(409, { ok: false, error: 'NIVEL_MAX', nivel: 5, nivel_tope: 5 });
    return UI.subirNivelCarta('ct_leyenda_01', 'base', 5).then(function (r) {
      assert(r && r.error === 'NIVEL_MAX' && /maximo/.test(r.mensaje),
        'NIVEL_MAX se explica como nivel maximo');
    });
  });

  cadena = cadena.then(function () {
    conRespuesta(404, { ok: false, error: 'CARTA_NO_ENCONTRADA' });
    return UI.subirNivelCarta('ct_borrada', 'base', 2).then(function (r) {
      assert(r && r.error === 'CARTA_NO_ENCONTRADA' && /catalogo/.test(r.mensaje),
        'CARTA_NO_ENCONTRADA trae mensaje legible');
    });
  });

  return cadena;
})().then(function () {
  return null;
}, function (e) {
  ko('cadena de subida de nivel', e && e.message);
});

/* ---------------------------------------------------------------------------
   6) Escapado: el nombre dinamico no puede inyectar HTML.
   --------------------------------------------------------------------------- */
(function () {
  var env = crearEntorno();
  var UI = env.UI;
  if (!UI) return;
  var c = cartaCompleta();
  c.nombre = '<img src=x onerror=alert(1)>';
  c.subtipo = '<b>malo</b>';
  var html = render(UI, c);
  assert(html.indexOf('<img src=x') < 0, 'nombre dinamico se escapa en la ficha');
  assert(UI.cardMeta(c).indexOf('<b>malo</b>') < 0, 'subtipo dinamico se escapa en la rejilla');
  assert(html.indexOf('<b>malo</b>') < 0, 'subtipo dinamico se escapa en la ficha');
})();

/* ---------------------------------------------------------------------------
   Resumen
   --------------------------------------------------------------------------- */
console.log('');
console.log('Checks: ' + total + ' total, ' + pass + ' PASS, ' + fails + ' FAIL');
if (fails === 0) {
  console.log('RESULTADO: OK - ' + pass + ' verificaciones pasaron.');
  process.exit(0);
}
console.log('RESULTADO: FAIL - ' + fails + ' de ' + total + ' verificaciones fallaron.');
process.exit(1);
