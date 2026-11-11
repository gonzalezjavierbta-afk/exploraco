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

Promise.all([cadenaSubida, cadenaAcunar]).then(resumen, resumen);
