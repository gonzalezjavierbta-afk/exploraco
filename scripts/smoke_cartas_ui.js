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
    oyentes: {},
    setAttribute: function (k, v) { e.attrs[String(k)] = String(v); },
    getAttribute: function (k) {
      return Object.prototype.hasOwnProperty.call(e.attrs, k) ? e.attrs[k] : null;
    },
    removeAttribute: function (k) { delete e.attrs[String(k)]; },
    appendChild: function (n) { n.parentNode = e; e.hijos.push(n); return n; },
    addEventListener: function (t, fn) {
      var k = String(t);
      if (!e.oyentes[k]) e.oyentes[k] = [];
      e.oyentes[k].push(fn);
    },
    removeEventListener: function (t, fn) {
      var k = String(t);
      var l = e.oyentes[k] || [];
      var out = [];
      for (var i = 0; i < l.length; i++) { if (l[i] !== fn) out.push(l[i]); }
      e.oyentes[k] = out;
    },
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
    oyentes: {},
    addEventListener: function (t, fn) {
      var k = String(t);
      if (!doc.oyentes[k]) doc.oyentes[k] = [];
      doc.oyentes[k].push(fn);
    },
    removeEventListener: function (t, fn) {
      var k = String(t);
      var l = doc.oyentes[k] || [];
      var out = [];
      for (var i = 0; i < l.length; i++) { if (l[i] !== fn) out.push(l[i]); }
      doc.oyentes[k] = out;
    },
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
   13) NATURALEZA (flora/fauna) y 14) COSMETICA (sin ejes jugables).
   --------------------------------------------------------------------------- */
function cartaNaturaleza(subtipo) {
  var c = cartaCompleta();
  c.id = 'ct_nat_01';
  c.nombre = 'Frailejon';
  c.familia = 'naturaleza';
  c.subtipo = subtipo;
  return c;
}

function cartaCosmetica() {
  return {
    id: 'ct_cosm_01',
    nombre: 'Aura de humedal',
    rareza: 'raro',
    variante: 'base',
    set_slug: 'leyenda',
    imagen_url: '',
    emisor_tipo: 'sistema',
    marca_nombre: null,
    descripcion: 'Cosmetico puro.',
    stats_json: { presencia: 12 },
    familia: 'cosmetica',
    subtipo: 'aura',
    stats: { alcance: 0, oficio: 0, fortuna: 0, rendimiento: 0, presencia: 12 },
    nivel: 2,
    poder: 0
  };
}

(function () {
  var env = crearEntorno();
  var UI = env.UI;
  if (!UI) return;
  var html = render(UI, cartaNaturaleza('flora'));
  assert(html.indexOf('c-chip c-chip--juego c-chip--oliva') >= 0,
    'naturaleza pinta chip de capa juego con tono oliva propio del silo');
  assert(html.indexOf('>Naturaleza<') >= 0, 'el chip de naturaleza lleva su etiqueta');
  assert(html.indexOf('c-chip--juego"') < 0,
    'la naturaleza no se queda con el jade generico de lugar');
  assert(html.indexOf('c-ficha-sub">flora') >= 0,
    'subtipo flora se pinta en texto pequeno de la ficha');
  var htmlFauna = render(UI, cartaNaturaleza('fauna'));
  assert(htmlFauna.indexOf('c-ficha-sub">fauna') >= 0
    && UI.cardMeta(cartaNaturaleza('fauna')).indexOf('c-meta-sub">fauna') >= 0,
    'subtipo fauna se pinta en texto pequeno en ficha y rejilla');
  assert(UI.cardMeta(cartaNaturaleza('fauna')).indexOf('c-chip--oliva') >= 0,
    'cardMeta reutiliza el chip oliva en la rejilla');
  assert(html.indexOf('NaN') < 0 && html.indexOf('undefined') < 0,
    'naturaleza no produce NaN ni undefined');
})();

(function () {
  var env = crearEntorno();
  var UI = env.UI;
  if (!UI) return;
  function cuenta(s, sub) {
    var n = 0, i = 0;
    while ((i = s.indexOf(sub, i)) >= 0) { n++; i += sub.length; }
    return n;
  }
  var c = cartaCosmetica();
  var html = render(UI, c);
  assert(cuenta(html, 'c-eje-l') === 1,
    'cosmetica pinta UN eje, no cuatro ceros vacios');
  assert(html.indexOf('c-eje-n">0</span>') < 0,
    'cosmetica no pinta ningun eje jugable a cero');
  assert(html.indexOf('>Presencia') >= 0, 'la presencia de la cosmetica se ve');
  assert(html.indexOf('Cosmetico: sin efecto economico') >= 0,
    'la cosmetica se explica como sin efecto economico');
  assert(html.indexOf('<b>0</b> poder') < 0 && html.indexOf('estetico') >= 0,
    'poder 0 se pinta como estetico, no como un cero grande');
  assert(UI.cardMeta(c).indexOf('<b>0</b> poder') < 0,
    'cardMeta tampoco pinta el cero grande en la rejilla');
  assert(html.indexOf('NaN') < 0 && html.indexOf('undefined') < 0,
    'cosmetica no produce NaN ni undefined');
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
var cadenaSubida = (function () {
  var env = crearEntorno();
  var UI = env.UI;
  if (!UI) return Promise.resolve();
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
   7) Acunar: el boton aparece SOLO con precio y familia comerciable.
   --------------------------------------------------------------------------- */
(function () {
  var env = crearEntorno();
  var UI = env.UI;
  if (!UI) return;

  var html = render(UI, cartaCompleta());
  assert(html.indexOf('data-c-acunar="1"') >= 0,
    'carta comerciable con precio ofrece el boton de acunar');
  assert(html.indexOf('c-acunar-xp">1.500 XP') >= 0
    && html.indexOf('data-precio="1500" disabled') < 0,
    'el boton de acunar muestra el coste exacto y nace habilitado');
  assert(html.indexOf('id="c-acunar-btn"') >= 0,
    'el boton de acunar lleva id nuevo');

  var c0 = cartaCompleta();
  c0.precio_xp = 0;
  assert(render(UI, c0).indexOf('data-c-acunar') < 0,
    'precio_xp 0 no ofrece acunar');

  var cn = cartaCompleta();
  cn.precio_xp = null;
  var htmlNull = render(UI, cn);
  assert(htmlNull.indexOf('data-c-acunar') < 0,
    'precio_xp null no ofrece acunar (degradacion)');
  assert(htmlNull.indexOf('undefined') < 0 && htmlNull.indexOf('NaN') < 0,
    'sin precio_xp no aparece undefined ni NaN');

  var cp = cartaCompleta();
  cp.familia = 'producto';
  assert(render(UI, cp).indexOf('data-c-acunar') < 0,
    'producto (familia economica) no se acuna');

  var ca = cartaCompleta();
  ca.emitidas = 500;
  var htmlAgotada = render(UI, ca);
  assert(htmlAgotada.indexOf('data-precio="1500" disabled') >= 0
    && htmlAgotada.indexOf('>Agotada</button>') >= 0,
    'sin stock el boton sale disabled con el texto Agotada');

  var htmlVitrina = render(UI, cartaCompleta(), { contexto: 'vitrina-publica' });
  assert(htmlVitrina.indexOf('data-c-acunar') < 0,
    'la vitrina publica sigue sin acciones');
})();

/* ---------------------------------------------------------------------------
   8) Acunar: confirmacion, estados y errores legibles (fetch en stub).
   --------------------------------------------------------------------------- */
var cadenaAcunar = (function () {
  var env = crearEntorno();
  var UI = env.UI;
  if (!UI) return Promise.resolve();
  var sandbox = env.sandbox;

  /* Boton real del DOM minimo, con su caja y su aviso. */
  function cajaAcunar() {
    var caja = Elemento('div');
    var msg = Elemento('span');
    msg.classList.add('c-acunar-msg');
    caja.querySelector = function (sel) {
      return sel === '.c-acunar-msg' ? msg : null;
    };
    var btn = Elemento('button');
    btn.setAttribute('data-c-acunar', '1');
    btn.setAttribute('data-carta-id', 'ct_leyenda_01');
    btn.setAttribute('data-variante', 'base');
    btn.setAttribute('data-precio', '1500');
    btn.innerHTML = 'Acunar';
    caja.appendChild(btn);
    return { btn: btn, msg: msg };
  }

  function conRespuesta(status, cuerpo, contador) {
    sandbox.fetch = function () {
      contador.n++;
      return Promise.resolve({
        status: status,
        ok: status >= 200 && status < 300,
        json: function () { return Promise.resolve(cuerpo); }
      });
    };
  }

  /* Microtasks suficientes para que la cadena del handler se asiente. */
  function ticks(n) {
    var p = Promise.resolve();
    for (var i = 0; i < n; i++) p = p.then(function () {});
    return p;
  }

  var cadena = Promise.resolve();

  cadena = cadena.then(function () {
    var t = cajaAcunar();
    var contador = { n: 0 };
    var pregunta = '';
    env.win.confirm = function (txt) { pregunta = txt; return false; };
    sandbox.fetch = function () {
      contador.n++;
      return Promise.reject(new Error('sin red'));
    };
    UI.acunarDesdeBoton(t.btn);
    assert(contador.n === 0, 'cancelar la confirmacion no llama a fetch');
    assert(pregunta.indexOf('Acunar por 1.500 XP') >= 0,
      'la confirmacion muestra el coste exacto en XP');
    assert(t.btn.disabled === false, 'cancelar deja el boton habilitado');
  });

  cadena = cadena.then(function () {
    var t = cajaAcunar();
    var contador = { n: 0 };
    env.win.confirm = function () { return true; };
    conRespuesta(200, {
      ok: true,
      data: {
        carta_id: 'ct_leyenda_01', variante: 'base', cantidad: 3,
        emitidas: 121, nivel: 1, xp_gastado: 1500, xp_disponible: 500
      }
    }, contador);
    UI.acunarDesdeBoton(t.btn);
    assert(t.btn.disabled === true && t.btn.getAttribute('aria-busy') === 'true',
      'mientras envia el boton queda disabled con aria-busy');
    return ticks(8).then(function () {
      assert(contador.n === 1, 'el exito hace un solo POST');
      assert(t.btn.disabled === true && t.btn.innerHTML === 'Acunada',
        'tras acunar el boton queda deshabilitado: cero doble clic');
      assert(t.btn.getAttribute('aria-busy') === null,
        'tras acunar se retira aria-busy');
      assert(t.msg.textContent.indexOf('Copia acunada') >= 0
        && t.msg.textContent.indexOf('Tienes 3') >= 0,
        'el exito deja un aviso breve con la cantidad');
      assert(!t.msg.classList.contains('is-error'),
        'el aviso de exito no se pinta como error');
    });
  });

  cadena = cadena.then(function () {
    var t = cajaAcunar();
    var contador = { n: 0 };
    env.win.confirm = function () { return true; };
    conRespuesta(409, { ok: false, error: 'SIN_STOCK' }, contador);
    UI.acunarDesdeBoton(t.btn);
    return ticks(8).then(function () {
      assert(t.msg.textContent.indexOf('No quedan copias') >= 0,
        'SIN_STOCK se explica en texto legible');
      assert(t.btn.disabled === false && t.btn.innerHTML === 'Acunar',
        'un error rehabilita el boton y restaura su texto');
      assert(t.msg.classList.contains('is-error'), 'el error se marca como error');
    });
  });

  cadena = cadena.then(function () {
    var t = cajaAcunar();
    var contador = { n: 0 };
    env.win.confirm = function () { return true; };
    conRespuesta(400, { ok: false, error: 'PUNTOS_INSUFICIENTES', xp_disponible: 40 }, contador);
    UI.acunarDesdeBoton(t.btn);
    return ticks(8).then(function () {
      assert(t.msg.textContent.indexOf('1.500 XP') >= 0
        && t.msg.textContent.indexOf('40') >= 0,
        'PUNTOS_INSUFICIENTES dice el coste y el saldo disponible');
    });
  });

  cadena = cadena.then(function () {
    var t = cajaAcunar();
    var contador = { n: 0 };
    env.win.confirm = function () { return true; };
    conRespuesta(409, { ok: false, error: 'MEDIA_NO_APROBADA' }, contador);
    UI.acunarDesdeBoton(t.btn);
    return ticks(8).then(function () {
      assert(t.msg.textContent.indexOf('no esta aprobada') >= 0,
        'MEDIA_NO_APROBADA se explica en texto legible');
    });
  });

  cadena = cadena.then(function () {
    var t = cajaAcunar();
    var contador = { n: 0 };
    env.win.confirm = function () { return true; };
    conRespuesta(400, { ok: false, error: 'CARTA_NO_COMPRABLE' }, contador);
    UI.acunarDesdeBoton(t.btn);
    return ticks(8).then(function () {
      assert(t.msg.textContent.indexOf('no se compra con XP') >= 0,
        'CARTA_NO_COMPRABLE se explica en texto legible');
      assert(t.msg.textContent.indexOf('{') < 0 && t.msg.textContent.indexOf('undefined') < 0,
        'el mensaje de error no vuelca JSON crudo ni undefined');
    });
  });

  return cadena;
})();

/* ---------------------------------------------------------------------------
   9) CATALOGO: contrato del canal de adquisicion y tarjeta compacta.
   --------------------------------------------------------------------------- */
function cartaCatalogo() {
  return {
    id: 'ct_lugar_07',
    nombre: 'Cascada del Tequendama',
    familia: 'lugar',
    subtipo: 'territorio',
    rareza: 'epico',
    edicion: 'limitada',
    supply_max: 300,
    emitidas: 40,
    restantes: 260,
    precio_xp: 2400,
    poder: 31,
    nivel: 1,
    imagen_url: '',
    posee: false,
    cantidad: 0
  };
}

(function () {
  var env = crearEntorno();
  var UI = env.UI;
  if (!UI) return;

  var url = UI.catalogoUrl({ familia: 'lugar', rareza: 'raro', q: 'sierra' }, 3);
  assert(url.indexOf('/api/usuarios?tipo=cartas_catalogo') === 0
    && url.indexOf('limit=24') >= 0 && url.indexOf('page=3') >= 0,
    'catalogoUrl apunta al canal de adquisicion con limit 24 y page');
  assert(url.indexOf('familia=lugar') >= 0 && url.indexOf('rareza=raro') >= 0
    && url.indexOf('q=sierra') >= 0,
    'catalogoUrl transporta familia, rareza y q');
  assert(UI.catalogoUrl({}, 1).indexOf('familia=') < 0
    && UI.catalogoUrl({}, 1).indexOf('q=') < 0,
    'catalogoUrl no manda filtros vacios');

  var libre = cartaCatalogo();
  var html = UI.catalogoCartaHtml(libre);
  assert(html.indexOf('data-c-acunar="1"') >= 0 && html.indexOf('data-precio="2400"') >= 0,
    'carta libre ofrece Acunar con su precio exacto');
  assert(html.indexOf('1.500 XP') < 0 && html.indexOf('2.400 XP') >= 0,
    'el precio se pinta con separador de miles');
  assert(html.indexOf('tirada 40 / 300') >= 0, 'la tirada se pinta emitidas / supply_max');
  assert(html.indexOf('quedan 260') >= 0,
    'el stock restante del servidor se pinta tal cual llega');
  assert(html.indexOf('c-chip c-chip--juego') >= 0 && html.indexOf('<b>31</b> poder') >= 0,
    'la tarjeta reutiliza chip de familia y poder del servidor');
  assert(html.indexOf('c-cat-rar r-epico') >= 0, 'la rareza se pinta con su clase de color');

  var agotada = cartaCatalogo();
  agotada.restantes = 0;
  var htmlAg = UI.catalogoCartaHtml(agotada);
  assert(htmlAg.indexOf('>Agotada</span>') >= 0 && htmlAg.indexOf('data-c-acunar') < 0,
    'restantes 0 se pinta como Agotada y sin boton');

  var mia = cartaCatalogo();
  mia.posee = true;
  mia.cantidad = 2;
  var htmlMia = UI.catalogoCartaHtml(mia);
  assert(htmlMia.indexOf('Ya la tienes <b>2</b>') >= 0 && htmlMia.indexOf('data-c-acunar') < 0,
    'una carta que ya es tuya dice "Ya la tienes" y NUNCA ofrece Acunar');

  var abierta = cartaCatalogo();
  abierta.edicion = null;
  abierta.supply_max = null;
  abierta.emitidas = null;
  abierta.restantes = null;
  var htmlAb = UI.catalogoCartaHtml(abierta);
  assert(htmlAb.indexOf('Tirada abierta') >= 0,
    'restantes null con tirada abierta se dice, no se inventa');

  assert(UI.catalogoEstadoCarta(abierta) === 'libre'
    && UI.catalogoEstadoCarta(mia) === 'posee'
    && UI.catalogoEstadoCarta(agotada) === 'agotada',
    'catalogoEstadoCarta clasifica libre / posee / agotada');
})();

(function () {
  var env = crearEntorno();
  var UI = env.UI;
  if (!UI) return;

  var vacio = UI.catalogoGridHtml(UI.catalogoEstadoBase());
  assert(vacio.indexOf('No hay cartas con estos filtros.') >= 0,
    'sin resultados el estado vacio es legible');

  var estado = UI.catalogoEstadoBase();
  estado.filas = [cartaCatalogo(), cartaCatalogo()];
  estado.filas[1].id = 'ct_lugar_08';
  estado.total = 30;
  var rejilla = UI.catalogoGridHtml(estado);
  assert((rejilla.match(/c-cat-card/g) || []).length === 2
    && rejilla.indexOf('c-cat-rejilla') >= 0,
    'la rejilla pinta una tarjeta por fila del servidor');
  assert(UI.catalogoInfoTexto(estado).indexOf('Mostrando 2 de 30 cartas') >= 0,
    'la info dice cuantas se ven y cuantas hay');
  assert(UI.catalogoHayMas(estado) === true, 'con 2 de 30 queda Cargar mas');
  estado.filas = estado.filas.concat(estado.filas);
  estado.total = 4;
  assert(UI.catalogoHayMas(estado) === false, 'con todas cargadas no se ofrece Cargar mas');

  var conError = UI.catalogoEstadoBase();
  conError.error = 'Catalogo no disponible.';
  var htmlErr = UI.catalogoGridHtml(conError);
  assert(htmlErr.indexOf('data-c-cat-reintentar="1"') >= 0
    && htmlErr.indexOf('{') < 0 && htmlErr.indexOf('undefined') < 0,
    'el error pinta Reintentar sin volcar JSON crudo');

  var filtros = UI.catalogoFiltrosHtml({ familia: 'marca' });
  assert(filtros.indexOf('data-cat-fam="lugar"') >= 0
    && filtros.indexOf('data-cat-fam="cosmetica"') >= 0
    && filtros.indexOf('data-cat-fam="producto"') < 0,
    'los filtros de familia solo ofrecen familias con cartas');
  assert(filtros.indexOf('data-cat-fam="marca" aria-pressed="true"') >= 0,
    'la familia activa queda marcada con aria-pressed');
  assert(filtros.indexOf('data-cat-rar="dorado"') >= 0
    && filtros.indexOf('data-c-cat-q="1"') >= 0,
    'los filtros incluyen rareza y el buscador por nombre');
})();

/* ---------------------------------------------------------------------------
   10) CATALOGO: 503 degradado, red caida y acunacion aplicada al estado.
   --------------------------------------------------------------------------- */
var cadenaCatalogo = (function () {
  var env = crearEntorno();
  var UI = env.UI;
  if (!UI) return Promise.resolve();
  var sandbox = env.sandbox;
  var cadena = Promise.resolve();

  function conRespuesta(status, cuerpo) {
    sandbox.fetch = function () {
      return Promise.resolve({
        status: status,
        ok: status >= 200 && status < 300,
        json: function () { return Promise.resolve(cuerpo); }
      });
    };
  }

  cadena = cadena.then(function () {
    var n = UI.catalogoNormalizar({ ok: true, data: [cartaCatalogo()], total: 7, page: 1 }, 1, 200);
    assert(n.ok === true && n.filas.length === 1 && n.total === 7,
      'catalogoNormalizar acepta la respuesta real del canal');
  });

  cadena = cadena.then(function () {
    var n = UI.catalogoNormalizar(
      { ok: false, error: 'SCHEMA_PENDIENTE' }, 1, 503);
    assert(n.ok === false && n.error === 'NO_DISPONIBLE'
      && n.mensaje === 'Catalogo no disponible.',
      '503 degrada a "Catalogo no disponible" sin romper la pagina');
  });

  cadena = cadena.then(function () {
    conRespuesta(200, { ok: true, data: [cartaCatalogo()], total: 1, page: 1 });
    return UI.catalogoPedir({}, 1).then(function (r) {
      assert(r.ok === true && r.filas.length === 1,
        'catalogoPedir resuelve con datos cuando el GET responde');
    });
  });

  cadena = cadena.then(function () {
    conRespuesta(503, { ok: false, error: 'SCHEMA_PENDIENTE' });
    return UI.catalogoPedir({}, 2).then(function (r) {
      assert(r.ok === false && r.error === 'NO_DISPONIBLE',
        'un 503 real del endpoint se tipa NO_DISPONIBLE');
    });
  });

  cadena = cadena.then(function () {
    sandbox.fetch = function () { return Promise.reject(new Error('sin red')); };
    return UI.catalogoPedir({}, 1).then(function (r) {
      assert(r.ok === false && r.error === 'CONEXION'
        && r.mensaje.indexOf('Sin conexion') >= 0,
        'error de red se degrada a CONEXION con mensaje legible');
    });
  });

  cadena = cadena.then(function () {
    var estado = UI.catalogoEstadoBase();
    estado.filas = [cartaCatalogo()];
    estado.total = 1;
    var aplicado = UI.catalogoAplicarAcunar(estado, {
      carta_id: 'ct_lugar_07', variante: 'base', cantidad: 1, emitidas: 41
    });
    assert(aplicado === true && estado.filas[0].posee === true
      && estado.filas[0].cantidad === 1,
      'tras acunar la fila del catalogo queda marcada como poseida');
    assert(estado.filas[0].restantes === 259 && estado.filas[0].emitidas === 41,
      'tras acunar se refresca el stock de esa carta, no el de la pagina');
    assert(UI.catalogoEstadoCarta(estado.filas[0]) === 'posee',
      'la carta acunada ya no puede volver a ofrecer Acunar');
    var ajeno = UI.catalogoAplicarAcunar(estado, { carta_id: 'ct_otra' });
    assert(ajeno === false, 'acunar una carta fuera de la pagina no toca el estado');
  });

  cadena = cadena.then(function () {
    var c = cartaCatalogo();
    c.nombre = '<img src=x onerror=alert(1)>';
    c.imagen_url = 'foto.jpg" onerror="alert(1)';
    var html = UI.catalogoCartaHtml(c);
    assert(html.indexOf('<img src=x') < 0 && html.indexOf('onerror="alert(1)"') < 0,
      'nombre e imagen_url dinamicos no inyectan atributos');
    assert(html.indexOf(' class="c-cat-img"') >= 0 && html.indexOf('onerror=') >= 0,
      'la lamina del catalogo lleva onerror de fallback (ADR-008)');
  });

  cadena = cadena.then(function () {
    assert(UI.catalogoMontar('catalogo-inexistente') === false,
      'sin host en la pagina el catalogo no monta ni pide nada');
  });

  return cadena;
})();

/* ---------------------------------------------------------------------------
   12) D-28 ficha de lectura desde el catalogo + D-29 filtros recordados.
   --------------------------------------------------------------------------- */
var CLAVE_FILTROS = 'exploraco.catalogo.filtros';

/* Dispara un evento sobre los oyentes que registro el DOM minimo. */
function disparar(nodo, tipo, ev) {
  var l = (nodo && nodo.oyentes && nodo.oyentes[tipo]) || [];
  for (var i = 0; i < l.length; i++) l[i](ev);
}

/* sessionStorage de mentira: mismo contrato, datos en memoria. */
function almacenFalso(crudo) {
  var datos = {};
  if (typeof crudo === 'string') datos[CLAVE_FILTROS] = crudo;
  return {
    setItem: function (k, v) { datos[String(k)] = String(v); },
    getItem: function (k) {
      var c = String(k);
      return Object.prototype.hasOwnProperty.call(datos, c) ? datos[c] : null;
    },
    removeItem: function (k) { delete datos[String(k)]; }
  };
}

function esperar(n) {
  var p = Promise.resolve();
  for (var i = 0; i < n; i++) p = p.then(function () {});
  return p;
}

function veces(s, sub) {
  var n = 0;
  var i = 0;
  while ((i = String(s).indexOf(sub, i)) >= 0) { n++; i += sub.length; }
  return n;
}

function fichaActual(env) {
  var host = env.doc.getElementById('c-ficha');
  return host ? String(host.innerHTML) : '';
}

function nodoCon(attr, host) {
  var n = Elemento('div');
  n.setAttribute(attr, '1');
  n.parentNode = host;
  return n;
}

var cadenaFichaCatalogo = (function () {
  var env = crearEntorno();
  var UI = env.UI;
  if (!UI) return Promise.resolve();
  var cadena = Promise.resolve();
  var card = Elemento('article');

  cadena = cadena.then(function () {
    env.doc.activeElement = card;
    card.foco = 0;
    card.focus = function () { card.foco++; };
    var ctrl = { host: Elemento('div'), estado: { filas: [cartaCatalogo()] } };
    var abierto = UI.catalogoAbrirFicha(ctrl, 'ct_lugar_07', card);
    var html = fichaActual(env);
    assert(abierto === true && UI.fichaAbierta() === true
      && html.indexOf('Cascada del Tequendama') >= 0,
      'la tarjeta del catalogo abre la ficha compartida en modo lectura');
    assert(html.indexOf('role="dialog"') >= 0 && html.indexOf('aria-modal="true"') >= 0
      && html.indexOf('c-ficha-x') >= 0,
      'la ficha del catalogo es un dialogo modal con boton de cierre');
    assert(card.foco === 1, 'el foco se posa en la tarjeta antes de abrir la ficha');
  });

  cadena = cadena.then(function () {
    var html = fichaActual(env);
    assert(veces(html, 'data-c-acunar=') === 1,
      'la ficha del catalogo tiene UN solo boton Acunar');
    assert(html.indexOf('data-c-subir-nivel') < 0,
      'sin copia propia la ficha no ofrece subir nivel');
    assert(html.indexOf('Ya la tienes') < 0,
      'sin copia propia no se anuncia "Ya la tienes"');
    assert(html.indexOf('Disponible: 0') < 0,
      'sin copia propia la ficha no inventa una cantidad');
  });

  cadena = cadena.then(function () {
    card.foco = 0;
    disparar(env.doc, 'keydown', { key: 'Escape' });
    assert(UI.fichaAbierta() === false && card.foco === 1,
      'Escape cierra la ficha y devuelve el foco a la tarjeta');
  });

  cadena = cadena.then(function () {
    var ctrl = { host: Elemento('div'), estado: { filas: [cartaCatalogo()] } };
    UI.catalogoAbrirFicha(ctrl, 'ct_lugar_07', card);
    var host = env.doc.getElementById('c-ficha');
    disparar(host, 'click', { target: nodoCon('data-c-ficha-cerrar', host) });
    assert(UI.fichaAbierta() === false, 'el clic fuera del cuadro cierra la ficha');
    UI.catalogoAbrirFicha(ctrl, 'ct_lugar_07', card);
    var host2 = env.doc.getElementById('c-ficha');
    disparar(host2, 'click', { target: nodoCon('data-c-ficha-cerrar', host2) });
    assert(UI.fichaAbierta() === false, 'el boton X cierra la ficha del catalogo');
  });

  cadena = cadena.then(function () {
    var mia = cartaCatalogo();
    mia.posee = true;
    mia.cantidad = 2;
    mia.nivel = 3;
    mia.coste_nivel_xp = 900;
    var ctrl = { host: Elemento('div'), estado: { filas: [mia] } };
    UI.catalogoAbrirFicha(ctrl, 'ct_lugar_07', null);
    var html = fichaActual(env);
    assert(html.indexOf('Ya la tienes') >= 0,
      'con copia propia la ficha dice "Ya la tienes"');
    assert(html.indexOf('data-c-acunar') < 0,
      'con copia propia no se repite el boton Acunar');
    assert(html.indexOf('data-c-subir-nivel') >= 0 && html.indexOf('Subir a nivel 4') >= 0,
      'con copia propia y nivel < 5 se ofrece subir de nivel');
    assert(html.indexOf('Cantidad en tu coleccion: 2') >= 0,
      'con copia propia la ficha usa la cantidad de la fila');
    UI.cerrarFicha();
  });

  return cadena;
})();

var cadenaFiltrosCatalogo = (function () {
  var env = crearEntorno();
  var UI = env.UI;
  if (!UI) return Promise.resolve();
  var cadena = Promise.resolve();
  var llamadas = [];
  var panel = Elemento('div');

  cadena = cadena.then(function () {
    assert(UI.CATALOGO_FILTROS_KEY === CLAVE_FILTROS,
      'la clave de filtros es propia del catalogo');
    assert(UI.catalogoFiltrosHtml({}).indexOf('data-c-cat-limpiar') < 0
      && UI.catalogoFiltrosHtml({ familia: 'lugar' }).indexOf('data-c-cat-limpiar') >= 0,
      'Limpiar filtros aparece solo cuando hay filtros activos');
  });

  cadena = cadena.then(function () {
    env.win.sessionStorage = almacenFalso('{ roto');
    var f = UI.catalogoFiltrosLeer();
    assert(f.familia === '' && f.rareza === '' && f.q === '',
      'JSON corrupto en sessionStorage degrada a defaults sin lanzar');
  });

  cadena = cadena.then(function () {
    env.win.sessionStorage = almacenFalso(
      JSON.stringify({ familia: 'nope', rareza: 'mitico', q: '  sierra  ' }));
    var f = UI.catalogoFiltrosLeer();
    assert(f.familia === '' && f.rareza === '' && f.q === 'sierra',
      'un filtro fuera del contrato se descarta y q se restaura limpio');
  });

  cadena = cadena.then(function () {
    env.win.sessionStorage = almacenFalso(
      JSON.stringify({ familia: 'lugar', rareza: '', q: 'sierra' }));
    panel.id = 'catalogo-panel';
    env.doc.body.appendChild(panel);
    env.sandbox.fetch = function (url) {
      llamadas.push(String(url));
      return Promise.resolve({
        status: 200, ok: true,
        json: function () {
          return Promise.resolve({ ok: true, data: [cartaCatalogo()], total: 1, page: 1 });
        }
      });
    };
    llamadas = [];
    assert(UI.catalogoMontar('catalogo-panel') === true,
      'con host en la pagina el catalogo monta');
    disparar(panel, 'click', { target: nodoCon('data-c-cat-abrir', panel) });
    return esperar(2).then(function () {
      assert(llamadas.length === 1 && llamadas[0].indexOf('familia=lugar') >= 0
        && llamadas[0].indexOf('q=sierra') >= 0,
        'los filtros restaurados se piden UNA sola vez, ya filtrados');
      assert(panel.innerHTML.indexOf('data-cat-fam="lugar" aria-pressed="true"') >= 0
        && panel.innerHTML.indexOf('value="sierra"') >= 0,
        'la barra del catalogo se pinta con el filtro y la busqueda recordados');
    });
  });

  cadena = cadena.then(function () {
    var store = env.win.sessionStorage;
    var ctrl = {
      host: panel,
      estado: {
        q: 'sierra', familia: 'lugar', rareza: 'raro', page: 0,
        filas: [], total: null, cargando: false, error: ''
      },
      grid: null, info: null, mas: null, rejilla: null, timer: null
    };
    llamadas = [];
    UI.catalogoLimpiar(ctrl);
    return esperar(2).then(function () {
      assert(ctrl.estado.familia === '' && ctrl.estado.rareza === ''
        && ctrl.estado.q === '',
        'Limpiar filtros vuelve al estado inicial');
      assert(store.getItem(CLAVE_FILTROS) === null,
        'Limpiar filtros borra la clave recordada');
      assert(llamadas.length === 1 && llamadas[0].indexOf('familia=') < 0
        && llamadas[0].indexOf('q=') < 0,
        'Limpiar filtros pide el catalogo sin filtros, una sola vez');
    });
  });

  cadena = cadena.then(function () {
    var env2 = crearEntorno();
    var UI2 = env2.UI;
    var limpio = false;
    try {
      var f = UI2.catalogoFiltrosLeer();
      var g = UI2.catalogoFiltrosGuardar({ familia: 'lugar' });
      var h = UI2.catalogoFiltrosLimpiar();
      limpio = (f.familia === '' && f.rareza === '' && f.q === '')
        && g === false && h === false;
    } catch (eSinStorage) {
      limpio = false;
    }
    assert(limpio,
      'sin sessionStorage el catalogo arranca en defaults y no lanza');
  });

  return cadena;
})();

/* ---------------------------------------------------------------------------
   11) EXPEDICIONES: contrato del GET (11.9.8), estados y textos por codigo.
   --------------------------------------------------------------------------- */
function expPayload() {
  return {
    ok: true,
    vector: { alcance: 12, fortuna: 4 },
    poder: 16,
    cap: {
      usadas: 1, limite: 5, xp_dia: 25, limite_xp: 200,
      remanente_xp: 175, min_cobro_xp: 15
    },
    misiones: [
      {
        id: 'xpd_dif_mapa', expedicion_rama: 'difusion',
        nombre: 'Mapa que crece', descripcion: 'Guarda 3 destinos mas en Tu Mapa.',
        xp: 25, requiere_stats: { alcance: 8 },
        stats_usuario: { alcance: 12 }, faltan: { alcance: 0 },
        acciones: { total: 4, por_cobro: 3, elegibles: 1, cobros: 0 },
        disponible: true, bloqueo: null, senal_disponible: true,
        accion_ref: 'ref-a', motivo: null,
        acciones_pendientes: [
          { ref: 'ref-a', fecha: '2026-11-11T00:00:00.000Z', detalle: 'Cascada del Tequendama' }
        ]
      },
      {
        id: 'xpd_dif_resena', expedicion_rama: 'difusion',
        nombre: 'Voz que se lee', descripcion: 'Publica 2 resenas sustanciales.',
        xp: 40, requiere_stats: { alcance: 20 },
        stats_usuario: { alcance: 12 }, faltan: { alcance: 8 },
        acciones: { total: 0, por_cobro: 2, elegibles: 0, cobros: 0 },
        disponible: false, bloqueo: 'UMBRAL', senal_disponible: true,
        accion_ref: null, motivo: 'SIN_ACCION', acciones_pendientes: []
      },
      {
        id: 'xpd_for_album', expedicion_rama: 'hallazgo',
        nombre: 'Hallazgo guardado', descripcion: 'Guarda 2 fotos en tus albumes.',
        xp: 25, requiere_stats: { fortuna: 8 },
        stats_usuario: { fortuna: 8 }, faltan: { fortuna: 0 },
        acciones: { total: 4, por_cobro: 3, elegibles: 1, cobros: 1 },
        disponible: false, bloqueo: 'SIN_ACCION', senal_disponible: true,
        accion_ref: null, motivo: 'SIN_ACCION', acciones_pendientes: []
      },
      {
        id: 'xpd_dif_comparte', expedicion_rama: 'difusion',
        nombre: 'Difunde un destino', descripcion: 'Comparte un destino publicado.',
        xp: 15, requiere_stats: { alcance: 0 },
        stats_usuario: { alcance: 12 }, faltan: { alcance: 0 },
        acciones: { total: 0, por_cobro: 1, elegibles: 0, cobros: 0 },
        disponible: false, bloqueo: 'SIN_ACCION', senal_disponible: false,
        accion_ref: null, motivo: 'SIN_ACCION', acciones_pendientes: []
      },
      {
        id: 'xpd_for_visita', expedicion_rama: 'hallazgo',
        nombre: 'Primera incursion', descripcion: 'Confirma una visita.',
        xp: 15, requiere_stats: { fortuna: 0 },
        stats_usuario: { fortuna: 4 }, faltan: { fortuna: 0 },
        acciones: { total: 1, por_cobro: 1, elegibles: 1, cobros: 0 },
        disponible: false, bloqueo: 'CAP_DIARIO', senal_disponible: true,
        accion_ref: null, motivo: 'SIN_ACCION', acciones_pendientes: []
      }
    ],
    acciones_pendientes_total: 1
  };
}

function misionExp(id) {
  var lista = expPayload().misiones;
  for (var i = 0; i < lista.length; i++) if (lista[i].id === id) return lista[i];
  return null;
}

/* Las 4 ramas (11.10): payload base + una mision de cada rama nueva, sin
   tocar los conteos de 5 misiones que ya verifican los checks anteriores. */
function expPayloadCuatro() {
  var p = expPayload();
  p.misiones.push({
    id: 'xpd_obr_ugc', expedicion_rama: 'obra',
    nombre: 'Obra aprobada', descripcion: 'Consigue la aprobacion de una obra propia.',
    xp: 40, requiere_stats: { oficio: 20 },
    stats_usuario: { oficio: 5 }, faltan: { oficio: 15 },
    acciones: { total: 0, por_cobro: 1, elegibles: 0, cobros: 0 },
    disponible: false, bloqueo: 'UMBRAL', senal_disponible: true,
    accion_ref: null, motivo: 'SIN_ACCION', acciones_pendientes: []
  });
  p.misiones.push({
    id: 'xpd_obr_foto', expedicion_rama: 'obra',
    nombre: 'Foto de autor', descripcion: 'Sube una foto a un destino.',
    xp: 15, requiere_stats: { oficio: 0 },
    stats_usuario: { oficio: 5 }, faltan: { oficio: 0 },
    acciones: { total: 0, por_cobro: 1, elegibles: 0, cobros: 0 },
    disponible: false, bloqueo: 'SIN_ACCION', senal_disponible: true,
    accion_ref: null, motivo: 'SIN_ACCION', acciones_pendientes: []
  });
  p.misiones.push({
    id: 'xpd_eco_oferta', expedicion_rama: 'economia',
    nombre: 'Poner a la venta', descripcion: 'Publica una oferta en el mercado.',
    xp: 25, requiere_stats: { rendimiento: 8 },
    stats_usuario: { rendimiento: 2 }, faltan: { rendimiento: 6 },
    acciones: { total: 0, por_cobro: 1, elegibles: 0, cobros: 0 },
    disponible: false, bloqueo: 'UMBRAL', senal_disponible: true,
    accion_ref: null, motivo: 'SIN_ACCION', acciones_pendientes: []
  });
  p.misiones.push({
    id: 'xpd_eco_compra', expedicion_rama: 'economia',
    nombre: 'Primera compra', descripcion: 'Compra un consumible en la tienda.',
    xp: 15, requiere_stats: { rendimiento: 0 },
    stats_usuario: { rendimiento: 2 }, faltan: { rendimiento: 0 },
    acciones: { total: 1, por_cobro: 1, elegibles: 1, cobros: 0 },
    disponible: false, bloqueo: 'SIN_ACCION', senal_disponible: false,
    accion_ref: null, motivo: 'SIN_ACCION', acciones_pendientes: []
  });
  return p;
}

function misionCuatro(id) {
  var lista = expPayloadCuatro().misiones;
  for (var i = 0; i < lista.length; i++) if (lista[i].id === id) return lista[i];
  return null;
}

(function () {
  var env = crearEntorno();
  var UI = env.UI;
  if (!UI) return;

  assert(UI.expUrl('abc-123').indexOf('/api/interacciones?tipo=expediciones&usuario_id=abc-123') === 0,
    'expUrl apunta al GET de expediciones con el usuario de la sesion');

  var n = UI.expNormalizar(expPayload(), 200);
  assert(n.ok === true && n.datos.misiones.length === 5
    && n.datos.cap.limite === 5 && n.datos.cap.limite_xp === 200,
    'expNormalizar acepta el contrato real {ok,misiones,cap} del GET');

  var n401 = UI.expNormalizar({ ok: false, error: 'SESION_REQUERIDA' }, 401);
  assert(n401.ok === false && n401.mensaje === 'Entra para expedicionar.',
    'sin sesion el GET se degrada a "Entra para expedicionar"');

  var ramas = UI.expRamasHtml(UI.expNormalizar(expPayload(), 200).datos, null);
  assert(ramas.indexOf('data-c-exp-rama="difusion"') >= 0
    && ramas.indexOf('data-c-exp-rama="hallazgo"') >= 0,
    'las misiones se agrupan por rama difusion / hallazgo');
  assert((ramas.match(/class="c-exp-m"/g) || []).length === 5,
    'el render pinta una tarjeta por mision que manda el servidor');

  var htmlUmbral = UI.expMisionHtml(misionExp('xpd_dif_resena'), null);
  assert(htmlUmbral.indexOf('Umbral no alcanzado') >= 0
    && htmlUmbral.indexOf('faltan 8') >= 0
    && htmlUmbral.indexOf('c-exp-eje is-falta') >= 0,
    'el umbral se pinta por eje con el que falta marcado y su faltan');

  var htmlAcciones = UI.expMisionHtml(misionExp('xpd_for_album'), null);
  assert(htmlAcciones.indexOf('Te faltan 2 acciones') >= 0
    && htmlAcciones.indexOf('data-c-exp-go') < 0,
    'con el bloque incompleto dice cuantas acciones faltan y no ofrece boton');

  var htmlSinSenal = UI.expMisionHtml(misionExp('xpd_dif_comparte'), null);
  assert(htmlSinSenal.indexOf('Sin accion disponible') >= 0
    && htmlSinSenal.indexOf('data-c-exp-estado="sin_accion"') >= 0
    && htmlSinSenal.indexOf('data-c-exp-go') < 0,
    'SIN_ACCION se pinta sin boton Expedicionar');

  var htmlCap = UI.expMisionHtml(misionExp('xpd_for_visita'), null);
  assert(htmlCap.indexOf('>Cap diario<') >= 0 && htmlCap.indexOf('data-c-exp-go') < 0,
    'con el cap agotado la mision dice Cap diario y no ofrece boton');

  var htmlListo = UI.expMisionHtml(misionExp('xpd_dif_mapa'), null);
  assert(htmlListo.indexOf('Cumplida y lista') >= 0
    && htmlListo.indexOf('data-accion-ref="ref-a"') >= 0
    && htmlListo.indexOf('data-c-exp-estado="listo"') >= 0,
    'la mision disponible ofrece Expedicionar con la ref de acciones_pendientes[0]');

  var cabecera = UI.expCabeceraHtml(UI.expNormalizar(expPayload(), 200).datos);
  assert(cabecera.indexOf('<b>1</b>/5') >= 0 && cabecera.indexOf('<b>25</b>/200') >= 0,
    'la cabecera pinta usadas/limite 24 h y xp_hoy/200 tal como llegan');
  assert(cabecera.indexOf('Cap diario agotado') < 0,
    'con el cap libre no se avisa de cap agotado');

  var capLleno = expPayload();
  capLleno.cap.usadas = 5;
  capLleno.cap.xp_dia = 40;
  var cabLleno = UI.expCabeceraHtml(capLleno);
  assert(cabLleno.indexOf('Cap diario agotado: 5 de 5') >= 0
    && cabLleno.indexOf('is-full') >= 0,
    'cap agotado: aviso visible y barra marcada llena');

  assert(UI.expMensaje('CAP_DIARIO', { usadas: 5, limite: 5 }).indexOf('Cap diario agotado (5/5)') >= 0,
    'CAP_DIARIO se traduce a texto legible con el numero de cobros');
  assert(UI.expMensaje('ACCION_NO_VERIFICADA').indexOf('ya no es cobrable') >= 0,
    'ACCION_NO_VERIFICADA se traduce a texto legible sin volcar JSON');
  assert(UI.expMensaje('UMBRAL_NO_ALCANZADO', { faltan: { alcance: 8, fortuna: 2 } })
    .indexOf('faltan Alcance 8 y Fortuna 2') >= 0,
    'UMBRAL_NO_ALCANZADO resume el faltan por eje');
  assert(UI.expMensaje('CAP_RECOMPENSA', { remanente_xp: 10 })
    .indexOf('quedan 10') >= 0
    && UI.expMensaje('MISION_NO_ENCONTRADA').indexOf('{') < 0,
    'CAP_RECOMPENSA y MISION_NO_ENCONTRADA dan frases, nunca JSON crudo');

  assert(UI.expTextoConfirmacion(misionExp('xpd_dif_mapa')).indexOf('ganar 25 XP') >= 0,
    'la confirmacion dice la XP que se va a ganar');

  var vacio = UI.expVacioHtml();
  assert(vacio.indexOf('Entra para expedicionar.') >= 0
    && vacio.indexOf('data-c-exp-sin-sesion="1"') >= 0
    && vacio.indexOf('data-c-exp-go') < 0,
    'sin sesion el estado vacio pide entrar y no ofrece boton');

  var sucia = misionExp('xpd_dif_mapa');
  sucia.nombre = '<img src=x onerror=alert(1)>';
  sucia.descripcion = '"><script>alert(1)</script>';
  var htmlSucia = UI.expMisionHtml(sucia, null);
  assert(htmlSucia.indexOf('<img src=x') < 0 && htmlSucia.indexOf('<script>') < 0
    && htmlSucia.indexOf('undefined') < 0,
    'nombre y descripcion dinamicos se escapan y nunca pintan undefined');

  var ctrlPanel = {
    datos: UI.expNormalizar(expPayload(), 200).datos,
    aviso: { tipo: 'ok', texto: 'Cobraste 25 XP.' }
  };
  var panel = UI.expPanelHtml(ctrlPanel);
  assert(panel.indexOf('data-c-exp-panel="1"') >= 0
    && panel.indexOf('data-c-exp-aviso="ok"') >= 0
    && panel.indexOf('Cobraste 25 XP.') >= 0
    && (panel.match(/class="c-exp-m"/g) || []).length === 5,
    'expPanelHtml ensambla aviso, cabecera y misiones sin recalcular caps');

  var ctrlError = { datos: null, error: 'Expediciones no disponibles.' };
  assert(UI.expPanelHtml(ctrlError).indexOf('data-c-exp-refrescar="1"') >= 0,
    'un error de panel ofrece Reintentar sin romper el bloque');
})();

/* ---------------------------------------------------------------------------
   12) EXPEDICIONES con 4 ramas (11.10): obra/economia, umbral de oficio y
   los DOS vacios distintos (senal viva sin acciones vs fail-closed).
   --------------------------------------------------------------------------- */
(function () {
  var env = crearEntorno();
  var UI = env.UI;
  if (!UI) return;

  var datos = UI.expNormalizar(expPayloadCuatro(), 200).datos;
  var html = UI.expRamasHtml(datos, null);
  assert(html.indexOf('data-c-exp-rama="difusion"') >= 0
    && html.indexOf('data-c-exp-rama="hallazgo"') >= 0
    && html.indexOf('data-c-exp-rama="obra"') >= 0
    && html.indexOf('data-c-exp-rama="economia"') >= 0,
    'las 9 misiones se agrupan en las 4 ramas sin perder ninguna');
  assert((html.match(/class="c-exp-rama"/g) || []).length === 4
    && (html.match(/class="c-exp-m"/g) || []).length === 9,
    'el render pinta un bloque por rama y una tarjeta por mision');

  assert(html.indexOf('>Obra<') >= 0 && html.indexOf('Crea y publica') >= 0
    && html.indexOf('>Economia<') >= 0 && html.indexOf('Mueve el mercado') >= 0,
    'obra y economia llevan nombre y gancho corto, no la clave cruda');
  assert(html.indexOf('data-c-exp-eje-rama="oficio"') >= 0
    && html.indexOf('data-c-exp-eje-rama="rendimiento"') >= 0,
    'cada rama declara el eje que mide su umbral');

  var htmlOficio = UI.expMisionHtml(misionCuatro('xpd_obr_ugc'), null);
  assert(htmlOficio.indexOf('>Oficio<') >= 0 && htmlOficio.indexOf('faltan 15') >= 0
    && htmlOficio.indexOf('data-c-exp-eje="oficio"') >= 0,
    'un umbral de oficio se pinta con su nombre y su faltan');

  var htmlRend = UI.expMisionHtml(misionCuatro('xpd_eco_oferta'), null);
  assert(htmlRend.indexOf('>Rendimiento<') >= 0 && htmlRend.indexOf('faltan 6') >= 0,
    'la fila de ejes pinta rendimiento: no asume solo alcance y fortuna');

  var htmlSinAcciones = UI.expMisionHtml(misionCuatro('xpd_obr_foto'), null);
  assert(htmlSinAcciones.indexOf('Sin acciones todavia') >= 0
    && htmlSinAcciones.indexOf('data-c-exp-estado="sin_acciones"') >= 0
    && htmlSinAcciones.indexOf('Sin accion disponible') < 0
    && htmlSinAcciones.indexOf('data-c-exp-go') < 0,
    'senal viva con lista vacia y cero acciones dice "Sin acciones todavia"');

  var htmlSinSenal = UI.expMisionHtml(misionCuatro('xpd_eco_compra'), null);
  assert(htmlSinSenal.indexOf('Sin accion disponible') >= 0
    && htmlSinSenal.indexOf('Sin acciones todavia') < 0
    && htmlSinSenal.indexOf('data-c-exp-estado="sin_accion"') >= 0,
    'senal_disponible false sigue diciendo "Sin accion disponible", no "todavia"');

  var ugc = misionCuatro('xpd_obr_ugc');
  ugc.motivo = 'Necesitas una obra aprobada por moderacion.';
  var htmlMotivo = UI.expMisionHtml(ugc, null);
  assert(htmlMotivo.indexOf('Necesitas una obra aprobada por moderacion.') >= 0
    && htmlMotivo.indexOf('c-exp-m-motivo') >= 0
    && htmlMotivo.indexOf('<a ') < 0,
    'el motivo del servidor se pinta tal cual, sin inventar enlaces');

  ugc.motivo = '<b onmouseover="alert(1)">aprobada</b>';
  var htmlSuciaMotivo = UI.expMisionHtml(ugc, null);
  assert(htmlSuciaMotivo.indexOf('<b onmouseover') < 0
    && htmlSuciaMotivo.indexOf('&lt;b') >= 0,
    'el motivo se escapa: no inyecta etiquetas ni atributos');
})();

/* ---------------------------------------------------------------------------
   12) EXPEDICIONES: cobro, repetido, errores por codigo y refresco del panel.
   --------------------------------------------------------------------------- */
var cadenaExpediciones = (function () {
  var env = crearEntorno();
  var UI = env.UI;
  if (!UI) return Promise.resolve();
  var sandbox = env.sandbox;
  var cadena = Promise.resolve();
  var llamadas = [];
  var postCuerpo = null;
  var postStatus = 200;
  var postJson = null;

  function instalar(uid) {
    sandbox.window.ExploraCO = uid ? { usuario: { id: uid } } : null;
  }

  function conRed() {
    sandbox.fetch = function (url, opts) {
      var o = opts || {};
      llamadas.push({ url: String(url), cuerpo: o.body || null, metodo: o.method || 'GET' });
      if (o.method === 'POST') {
        return Promise.resolve({
          status: postStatus,
          ok: postStatus >= 200 && postStatus < 300,
          json: function () { return Promise.resolve(postJson); }
        });
      }
      return Promise.resolve({
        status: 200, ok: true,
        json: function () { return Promise.resolve(expPayload()); }
      });
    };
  }

  function nuevoCtrl() {
    var r = UI.expNormalizar(expPayload(), 200);
    return {
      host: Elemento('div'), datos: r.datos, error: null, aviso: null,
      enviando: '', cargando: false
    };
  }

  function boton(misionId, ref) {
    return {
      getAttribute: function (k) {
        if (k === 'data-mision-id') return misionId;
        if (k === 'data-accion-ref') return ref;
        return null;
      }
    };
  }

  cadena = cadena.then(function () {
    instalar(null);
    conRed();
    llamadas = [];
    var ctrl = nuevoCtrl();
    return UI.expCargar(ctrl).then(function (r) {
      assert(r === false && llamadas.length === 0
        && ctrl.host.innerHTML.indexOf('Entra para expedicionar.') >= 0,
        'sin sesion expCargar no dispara ninguna peticion (cero bucle)');
    });
  });

  cadena = cadena.then(function () {
    instalar('11111111-2222-3333-4444-555555555555');
    conRed();
    llamadas = [];
    var ctrl = nuevoCtrl();
    return UI.expCargar(ctrl).then(function (r) {
      assert(r === true && llamadas.length === 1
        && llamadas[0].url.indexOf('tipo=expediciones') >= 0,
        'con sesion el panel se pinta con un unico GET de expediciones');
      assert(ctrl.host.innerHTML.indexOf('Mapa que crece') >= 0
        && ctrl.host.innerHTML.indexOf('Cumplida y lista') >= 0,
        'el panel pintado incluye las misiones y su estado');
    });
  });

  cadena = cadena.then(function () {
    conRed();
    llamadas = [];
    postStatus = 200;
    postJson = {
      ok: true, mision_id: 'xpd_dif_mapa', xp: 25, xp_solicitado: 25,
      recortado: false, repetido: false, accion_ref: 'ref-a',
      usadas: 2, limite: 5, xp_dia: 50, limite_xp: 200, remanente_xp: 150
    };
    var ctrl = nuevoCtrl();
    return UI.expCobrarDesdeBoton(ctrl, boton('xpd_dif_mapa', 'ref-a')).then(function () {
      var cuerpo = JSON.parse(llamadas[0].cuerpo);
      assert(cuerpo.mision_id === 'xpd_dif_mapa' && cuerpo.accion_ref === 'ref-a'
        && cuerpo.usuario_id === '11111111-2222-3333-4444-555555555555',
        'el POST manda la ref EXACTA de acciones_pendientes[0] y el usuario de la sesion');
      assert(llamadas.length === 2 && llamadas[1].url.indexOf('tipo=expediciones') >= 0,
        'tras cobrar se refresca el panel con un GET, sin recargar la pagina');
      assert(ctrl.aviso && ctrl.aviso.tipo === 'ok'
        && ctrl.aviso.texto.indexOf('Cobraste 25 XP') >= 0,
        'el exito deja aviso con la XP cobrada');
    });
  });

  cadena = cadena.then(function () {
    conRed();
    llamadas = [];
    postStatus = 200;
    postJson = {
      ok: true, mision_id: 'xpd_dif_mapa', xp: 0, xp_solicitado: 25,
      recortado: false, repetido: true, accion_ref: null,
      usadas: 2, limite: 5, xp_dia: 50, limite_xp: 200, remanente_xp: 150
    };
    var ctrl = nuevoCtrl();
    return UI.expCobrarDesdeBoton(ctrl, boton('xpd_dif_mapa', 'ref-a')).then(function () {
      assert(ctrl.aviso && ctrl.aviso.tipo === 'ok'
        && ctrl.aviso.texto.indexOf('Ya la hiciste') >= 0,
        'repetido:true con xp:0 se avisa como "Ya la hiciste", no como error');
    });
  });

  cadena = cadena.then(function () {
    conRed();
    llamadas = [];
    postStatus = 409;
    postJson = {
      ok: false, code: 'CAP_DIARIO', usadas: 5, limite: 5,
      xp_dia: 200, limite_xp: 200
    };
    var ctrl = nuevoCtrl();
    return UI.expCobrarDesdeBoton(ctrl, boton('xpd_dif_mapa', 'ref-a')).then(function () {
      assert(ctrl.aviso && ctrl.aviso.tipo === 'error'
        && ctrl.aviso.texto.indexOf('Cap diario agotado (5/5)') >= 0,
        'CAP_DIARIO del POST se muestra legible y marcado como error');
    });
  });

  cadena = cadena.then(function () {
    conRed();
    llamadas = [];
    postStatus = 409;
    postJson = { ok: false, code: 'ACCION_NO_VERIFICADA', mision_id: 'xpd_dif_mapa' };
    var ctrl = nuevoCtrl();
    return UI.expCobrarDesdeBoton(ctrl, boton('xpd_dif_mapa', 'ref-a')).then(function () {
      assert(ctrl.aviso && ctrl.aviso.tipo === 'error'
        && ctrl.aviso.texto.indexOf('ya no es cobrable') >= 0
        && ctrl.aviso.texto.indexOf('{') < 0,
        'ACCION_NO_VERIFICADA del POST se muestra legible y sin JSON');
    });
  });

  cadena = cadena.then(function () {
    conRed();
    llamadas = [];
    var ctrl = nuevoCtrl();
    return UI.expCobrarDesdeBoton(ctrl, boton('xpd_dif_resena', null)).then(function () {
      assert(llamadas.length === 0,
        'una mision con umbral no alcanzado no dispara ningun POST');
    });
  });

  cadena = cadena.then(function () {
    assert(UI.expedicionesMontar('expediciones-inexistente') === false,
      'sin host en la pagina las expediciones no montan ni piden nada');
  });

  return cadena;
})();

/* ---------------------------------------------------------------------------
   13) El catalogo es MERCADO, no inventario (correccion de producto).
   El host #catalogo-panel vive en comunidad.html (pestana Mercado) y
   mi-perfil.html solo lo conserva inerte (ADR-003) con un puente al Mercado.
   --------------------------------------------------------------------------- */
var cadenaMercadoCatalogo = (function () {
  var comunidad = fs.readFileSync(path.join(ROOT, 'comunidad.html'), 'utf8');
  var perfil = fs.readFileSync(path.join(ROOT, 'mi-perfil.html'), 'utf8');
  var cadena = Promise.resolve();

  cadena = cadena.then(function () {
    assert(veces(comunidad, 'id="catalogo-panel"') === 1
      && comunidad.indexOf('data-c-cat-modo="mercado"') >= 0,
      'el catalogo monta en el MERCADO: comunidad.html trae UN host marcado "mercado"');
    assert(veces(perfil, 'id="catalogo-panel"') === 1
      && perfil.indexOf('data-c-cat-modo="inventario"') >= 0
      && perfil.indexOf('id="catalogo-panel" data-tab="inventario" data-c-cat-modo="inventario" hidden') >= 0,
      'Inventario conserva el host VACIO y oculto por ADR-003 (ningun ID se borra)');
    assert(veces(comunidad + perfil, 'data-c-cat-modo="mercado"') === 1,
      'un solo #catalogo-panel ACTIVO entre las dos paginas: el del Mercado');
  });

  cadena = cadena.then(function () {
    var abreMercado = comunidad.indexOf('id="cpanel-mercado"');
    var host = comunidad.indexOf('id="catalogo-panel"');
    var cierraMercado = comunidad.indexOf('id="cpanel-gobernanza"');
    assert(abreMercado >= 0 && host > abreMercado && host < cierraMercado,
      'el host del catalogo cuelga de la pestana Mercado, junto al mercado P2P');
    assert(comunidad.indexOf('data-c-cat-abrir="1" id="catalogo-abrir"') >= 0
      && comunidad.indexOf('Comprar cartas') >= 0,
      'el bloque de compra del sistema llega con su titulo y su boton de abrir');
    assert(veces(perfil, 'data-c-cat-abrir') === 0
      && perfil.indexOf('las cartas que aun no tienes') < 0,
      'Inventario no duplica la vitrina ni el boton de compra');
    assert(perfil.indexOf('href="comunidad.html#mercado"') >= 0
      && perfil.indexOf('Ver catalogo en el Mercado') >= 0,
      'Inventario sustituye la entrada por el enlace "Ver catalogo en el Mercado"');
  });

  cadena = cadena.then(function () {
    var env = crearEntorno();
    var UI = env.UI;
    if (!UI) return;
    var inerte = Elemento('div');
    inerte.id = 'catalogo-panel';
    inerte.setAttribute('data-c-cat-modo', 'inventario');
    env.doc.body.appendChild(inerte);
    assert(UI.catalogoMontar('catalogo-panel') === false,
      'con el host marcado "inventario" el catalogo NO monta ni pide nada');
    var mercado = Elemento('div');
    mercado.id = 'catalogo-mercado-test';
    mercado.setAttribute('data-c-cat-modo', 'mercado');
    env.doc.body.appendChild(mercado);
    assert(UI.catalogoMontar('catalogo-mercado-test') === true,
      'con el host marcado "mercado" el catalogo si monta');
  });

  return cadena;
})();

/* ---------------------------------------------------------------------------
   Resumen: se ESPERA a las cadenas con red. Sin esto, process.exit(0) se
   adelanta a los microtasks y los checks asincronos no llegan a contar.
   --------------------------------------------------------------------------- */
function resumen() {
  console.log('');
  console.log('Checks: ' + total + ' total, ' + pass + ' PASS, ' + fails + ' FAIL');
  if (fails === 0) {
    console.log('RESULTADO: OK - ' + pass + ' verificaciones pasaron.');
    process.exit(0);
  }
  console.log('RESULTADO: FAIL - ' + fails + ' de ' + total + ' verificaciones fallaron.');
  process.exit(1);
}

Promise.all([cadenaSubida, cadenaAcunar, cadenaCatalogo, cadenaFichaCatalogo,
  cadenaFiltrosCatalogo, cadenaExpediciones, cadenaMercadoCatalogo]).then(resumen, resumen);
