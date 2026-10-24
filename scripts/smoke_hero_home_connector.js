// scripts/smoke_hero_home_connector.js
// Smoke permanente y determinista del contrato window.ExploraCOHero.cargar
// que vive en index-api-connector.js (bloque HERO DEL HOME, ~lineas 499-729).
// Hoy ese contrato solo se probo con un harness temporal fuera del repo: si
// alguien rompe el orden, el umbral o el anti-martilleo, nada avisa.
//
// Contrato congelado (ya implementado, NO se redisenia aqui):
//   cargar(cb) entrega SIEMPRE una sola vez un array de { url, nombre, votos }
//   con maximo 6 items, sin URLs repetidas y solo imagenes.
//   Precedencia (MEZCLA por orden, relleno hasta 6): modulo manual (slots
//   activa === true, posicion ASC, votos 0) -> comunidad (votos > 0, votos
//   DESC) -> destacados (rating DESC, nombre ASC, votos 0) -> [] (gradiente).
//   El modulo va PRIMERO y solo CORTO-CIRCUITA si ya llena los 6 (entonces no
//   se pide comunidad). Sin modulo el resultado es el de siempre:
//   comunidad -> destacados -> vacio.
//
// Cero red, cero base de datos: el conector se evalua en un sandbox vm con
// fetch simulado, window/document/localStorage minimos y console silenciosa
// (mismo patron que scripts/check_buildHTML_inline.js y
// scripts/smoke_hero_fallback.js). El init del conector (setTimeout) NUNCA se
// ejecuta: el sandbox solo registra el temporizador.
//
// Uso: node scripts/smoke_hero_home_connector.js
// Exit code != 0 si algun caso falla.
//
// SMOKE_HERO_CONECTOR=<ruta>: unica finalidad, el CONTROL NEGATIVO (apuntar el
// smoke a una COPIA mutada del conector fuera del repo). Por defecto siempre
// lee el index-api-connector.js real.
'use strict';

var fs = require('fs');
var path = require('path');
var vm = require('vm');

var ROOT = path.join(__dirname, '..');
var CONECTOR = process.env.SMOKE_HERO_CONECTOR
  ? path.resolve(String(process.env.SMOKE_HERO_CONECTOR))
  : path.join(ROOT, 'index-api-connector.js');
var HERO_MAX = 6;

// ------------------------------------------------------------------ fuente
var FUENTE = null;

function fuente() {
  if (FUENTE !== null) return FUENTE;
  if (!fs.existsSync(CONECTOR)) {
    console.error('ERROR: no existe el conector -> ' + CONECTOR);
    process.exit(2);
  }
  FUENTE = fs.readFileSync(CONECTOR, 'utf8');
  return FUENTE;
}

// Sonda de OBSERVACION: se inyecta dentro del IIFE para leer el estado privado
// (MEDIA_LISTO / MEDIA_PIDIDA / MEDIA_TOKEN / MAPA_MEDIA) y para poblar el
// respaldo por la MISMA via que applyData (heroFijarDestacados). No altera
// ninguna rama del conector: solo expone lectores/escritores. Si el cierre del
// IIFE cambia, el smoke aborta con exit 2 en vez de pasar en falso.
var PROBE = [
  '',
  '  // -- sonda de observacion del smoke (no altera la logica) --',
  '  window.__heroEstado = function () {',
  '    return { MEDIA_LISTO: MEDIA_LISTO, MEDIA_PIDIDA: MEDIA_PIDIDA, MEDIA_TOKEN: MEDIA_TOKEN, MAPA_MEDIA: MAPA_MEDIA };',
  '  };',
  '  window.__heroFijarDestacados = function (filas) { heroFijarDestacados(filas); return HERO_DESTACADOS.length; };',
  ''
].join('\n');

var CIERRE_IIFE = '}());';

function codigoInstrumentado() {
  var src = fuente();
  var pos = src.lastIndexOf(CIERRE_IIFE);
  if (pos < 0) {
    console.error('ERROR: no se encontro el cierre del IIFE (' + CIERRE_IIFE + ') en ' + CONECTOR);
    process.exit(2);
  }
  var cola = src.slice(pos + CIERRE_IIFE.length);
  if (cola.replace(/\s+/g, '') !== '') {
    console.error('ERROR: el cierre del IIFE no es el ultimo bloque del archivo -> '
      + JSON.stringify(cola.slice(0, 40)));
    process.exit(2);
  }
  return src.slice(0, pos) + PROBE + CIERRE_IIFE + cola;
}

// ------------------------------------------------------------------ entorno
function nop() {}

function crearEntorno(op) {
  op = op || {};
  var peticiones = [];
  var temporizadores = [];
  var modo = op.fetch || 'ok';
  var datos = (op.datos === undefined) ? { ok: true, data: [] } : op.datos;
  // TRAMO 1 (modulo manual). Por defecto responde degradado:true, es decir
  // "no hay modulo", que es lo que hacian los casos A..H antes de existir.
  var modulo = (op.heroModulo === undefined)
    ? { ok: true, degradado: true, total: 0, data: [] }
    : op.heroModulo;

  function esModulo(url) {
    return String(url).indexOf('tipo=hero_home') !== -1;
  }

  function respuesta(d) {
    return Promise.resolve({
      ok: true,
      status: 200,
      json: function () { return Promise.resolve(d); }
    });
  }

  function fetchStub(url, cfg) {
    peticiones.push({ url: String(url), cfg: cfg || null, modulo: esModulo(url) });
    if (esModulo(url)) {
      if (op.fetchModulo === 'rechaza') return Promise.reject(new Error('red caida modulo simulada'));
      if (op.fetchModulo === 'lanza') throw new Error('fetch modulo no disponible simulado');
      return respuesta(modulo);
    }
    if (modo === 'rechaza') return Promise.reject(new Error('red caida simulada'));
    if (modo === 'lanza') throw new Error('fetch no disponible simulado');
    return respuesta(datos);
  }

  var sandbox = {
    // window === global: el conector publica window.ExploraCOHero y lee
    // window.ExploraCO.authHeaders.
    document: {
      readyState: 'complete',
      getElementById: function () { return null; },
      querySelector: function () { return null; },
      querySelectorAll: function () { return []; },
      addEventListener: function () {}
    },
    fetch: fetchStub,
    console: { log: nop, warn: nop, error: nop, info: nop, debug: nop },
    // El init del conector se registra y NO se ejecuta: cero trafico de
    // /api/destinos y cero render.
    setTimeout: function (fn, ms) { temporizadores.push({ fn: fn, ms: ms }); return temporizadores.length; },
    clearTimeout: nop,
    setInterval: function () { return 0; },
    clearInterval: nop,
    localStorage: { getItem: function () { return null; }, setItem: nop, removeItem: nop },
    navigator: { userAgent: 'smoke-hero' },
    // Globales del index.html que el conector consulta con typeof.
    PL: op.PL || [],
    MAPA_MEDIA: op.MAPA_MEDIA || [],
    MAPA_PLACES: [],
    DEST_PHOTOS: {},
    AGENDA_EVENTS: [],
    DEST_FEATURED_IDS: [],
    ExploraCO: op.ExploraCO || null
  };
  sandbox.window = sandbox;

  vm.createContext(sandbox);
  vm.runInContext(codigoInstrumentado(), sandbox, { filename: 'index-api-connector.js' });

  var hero = sandbox.ExploraCOHero;
  if (!hero || typeof hero.cargar !== 'function') {
    console.error('ERROR: el conector no expuso window.ExploraCOHero.cargar');
    process.exit(2);
  }
  if (typeof sandbox.__heroEstado !== 'function' || typeof sandbox.__heroFijarDestacados !== 'function') {
    console.error('ERROR: la sonda del smoke no quedo instalada (revisar el cierre del IIFE)');
    process.exit(2);
  }

  return {
    sandbox: sandbox,
    cargar: hero.cargar,
    estado: sandbox.__heroEstado,
    fijarDestacados: sandbox.__heroFijarDestacados,
    peticiones: peticiones,
    temporizadores: temporizadores
  };
}

// Varios turnos de microtask + un macrotask: la cadena fetch->json->cerrar del
// conector queda resuelta sin depender de tiempos reales.
function esperar() {
  return new Promise(function (resolver) { setTimeout(resolver, 0); });
}

// Llama a cargar N veces en el MISMO tick (como hace la home al montar) y
// devuelve los arrays entregados a cada callback.
function llamar(env, veces) {
  var llamadas = [];
  var lanzo = null;
  var i;
  try {
    for (i = 0; i < (veces || 1); i++) {
      env.cargar(function (arr) { llamadas.push(arr); });
    }
  } catch (e) {
    lanzo = e;
  }
  return esperar().then(function () {
    return { llamadas: llamadas, lanzo: lanzo };
  });
}

// ---------------------------------------------------------------- fixtures
function foto(url, votos, extra) {
  var base = {
    media_url: url,
    votos: votos,
    fuente: 'album_foto',
    origen: 'album_usuario',
    media_id: 'media-' + url,
    album_titulo: 'Album',
    lat: 4.6,
    lng: -75.7
  };
  var k;
  if (extra) {
    for (k in extra) {
      if (Object.prototype.hasOwnProperty.call(extra, k)) base[k] = extra[k];
    }
  }
  return base;
}

function urls(arr) {
  var out = [];
  var i;
  for (i = 0; i < (arr || []).length; i++) out.push(arr[i].url);
  return out;
}

// Peticiones por tramo. El conector pide primero el modulo manual
// (tipo=hero_home) y, si ese modulo no llena los 6 slots, pide la comunidad.
function peticionesDe(env, aguja) {
  var out = [];
  var i;
  for (i = 0; i < env.peticiones.length; i++) {
    if (env.peticiones[i].url.indexOf(aguja) !== -1) out.push(env.peticiones[i]);
  }
  return out;
}

function comunitarias(env) {
  return peticionesDe(env, 'tipo=multimedia_mapa');
}

function modulares(env) {
  return peticionesDe(env, 'tipo=hero_home');
}

function iguales(a, b) {
  if (a.length !== b.length) return false;
  var i;
  for (i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function sinDuplicados(arr) {
  var vistos = {};
  var i;
  for (i = 0; i < arr.length; i++) {
    if (vistos[arr[i]]) return false;
    vistos[arr[i]] = true;
  }
  return true;
}

function votosDescendentes(arr) {
  var i;
  for (i = 1; i < arr.length; i++) {
    if (arr[i - 1].votos < arr[i].votos) return false;
  }
  return true;
}

// --------------------------------------------------------------- ejecucion
var RESULTADOS = [];
// Los casos se encadenan en secuencia (no en paralelo): la salida es
// determinista y cada entorno se descarta al terminar su caso.
var COLA = Promise.resolve();

function correr(nombre, fn) {
  COLA = COLA.then(function () {
    var fallos = [];
    function ok(cond, detalle) {
      if (!cond) fallos.push(detalle);
    }
    return Promise.resolve()
      .then(function () { return fn(ok); })
      .then(function () {
        var pasa = fallos.length === 0;
        RESULTADOS.push(pasa);
        console.log((pasa ? 'PASS ' : 'FAIL ') + nombre + (pasa ? '' : ' | ' + fallos.join(' ; ')));
      }, function (e) {
        RESULTADOS.push(false);
        console.log('FAIL ' + nombre + ' | excepcion: ' + (e && e.message ? e.message : String(e)));
      });
  });
  return COLA;
}

// A) PRIMARIA: comunidad con votos variados + video + audio -> maximo 6,
//    votos DESC, sin video/audio, sin URLs repetidas. Los fixtures estan
//    INSERTADOS a proposito fuera del orden final: si se pierde el votos DESC
//    el caso falla (control negativo verificado en la entrega).
var FILAS_A = [
  foto('https://cdn.test/com-a4.jpg', 5, { album_titulo: 'Cuatro' }),
  foto('https://cdn.test/com-a1.jpg', 12, { album_titulo: 'Uno' }),
  foto('https://cdn.test/com-a2.jpg', 9, { media_id: 'b', rating_promedio: 4, album_titulo: 'Dos' }),
  foto('https://cdn.test/com-a3.jpg', 9, { media_id: 'a', rating_promedio: 4, album_titulo: 'Tres' }),
  foto('https://cdn.test/com-a7.jpg', 0, { album_titulo: 'Cero' }),
  foto('https://cdn.test/com-a8.jpg', 2, { album_titulo: 'Ocho' }),
  foto('https://cdn.test/clip.mp4', 50, { album_titulo: 'Video extension' }),
  foto('https://cdn.test/marcada-video.jpg', 40, { foto_type: 'video' }),
  foto('https://cdn.test/tema.mp3', 45, { album_titulo: 'Audio extension' }),
  foto('https://cdn.test/marcada-audio.jpg', 44, { media_type: 'audio' }),
  foto('https://cdn.test/com-a1.jpg', 12, { media_id: 'duplicado' }),
  foto('https://cdn.test/destino-album.jpg', 60, { origen: 'destino_album' }),
  foto('https://cdn.test/curada.jpg', 70, { fuente: 'curada' }),
  foto('https://cdn.test/com-a6.jpg', 1, { album_titulo: 'Seis' }),
  foto('https://cdn.test/com-a5.jpg', 3, { album_titulo: 'Cinco' })
];

var ESPERADO_A = [
  'https://cdn.test/com-a1.jpg',
  'https://cdn.test/com-a3.jpg',
  'https://cdn.test/com-a2.jpg',
  'https://cdn.test/com-a4.jpg',
  'https://cdn.test/com-a5.jpg',
  'https://cdn.test/com-a8.jpg'
];

correr('A primaria: maximo 6, votos DESC, sin video/audio ni duplicados', function (ok) {
  var env = crearEntorno({ datos: { ok: true, data: FILAS_A } });
  return llamar(env).then(function (res) {
    ok(res.lanzo === null, 'cargar lanzo: ' + (res.lanzo && res.lanzo.message));
    ok(res.llamadas.length === 1, 'callback llamado ' + res.llamadas.length + ' veces, esperado 1');
    var arr = res.llamadas[0] || [];
    ok(arr.length === HERO_MAX, 'items=' + arr.length + ' esperado=' + HERO_MAX);
    ok(iguales(urls(arr), ESPERADO_A), 'orden=' + urls(arr).join(' | ') + ' esperado=' + ESPERADO_A.join(' | '));
    ok(votosDescendentes(arr), 'votos no descendentes: ' + arr.map(function (x) { return x.votos; }).join(','));
    var crudo = urls(arr).join(' ');
    ok(crudo.indexOf('.mp4') === -1, 'video .mp4 entro al hero: ' + crudo);
    ok(crudo.indexOf('.mp3') === -1, 'audio .mp3 entro al hero: ' + crudo);
    ok(crudo.indexOf('marcada-video') === -1, 'foto_type video entro al hero: ' + crudo);
    ok(crudo.indexOf('marcada-audio') === -1, 'media_type audio entro al hero: ' + crudo);
    ok(crudo.indexOf('destino-album') === -1, 'fila origen destino_album entro al hero: ' + crudo);
    ok(crudo.indexOf('curada.jpg') === -1, 'fila fuente curada (respaldo) entro a la primaria: ' + crudo);
    ok(crudo.indexOf('com-a7') === -1, 'foto con votos 0 entro al hero: ' + crudo);
    ok(sinDuplicados(urls(arr)), 'URLs repetidas: ' + urls(arr).join(','));
    // Precedencia actual: 1) modulo manual (aqui degradado:true = sin modulo),
    // 2) comunidad. Dos peticiones por ciclo; el resultado es el de antes.
    ok(env.peticiones.length === 2, 'peticiones=' + env.peticiones.length + ' esperado=2 (modulo + comunidad)');
    var com = comunitarias(env);
    ok(com.length === 1, 'peticiones a multimedia_mapa=' + com.length + ' esperado=1');
    var u = com.length ? com[0].url : '';
    ok(u.indexOf('tipo=multimedia_mapa') !== -1, 'endpoint inesperado: ' + u);
    ok(u.indexOf('tipo_media=foto') !== -1, 'falta tipo_media=foto: ' + u);
  });
});

// B) UMBRAL: solo votos > 0 entra en la primaria.
var FILAS_B = [
  foto('https://cdn.test/com-b-cero1.jpg', 0),
  foto('https://cdn.test/com-b-cero2.jpg', 0),
  foto('https://cdn.test/com-b-cero3.jpg', 0),
  foto('https://cdn.test/com-b-uno.jpg', 1)
];

correr('B umbral: fotos con votos 0 no entran (solo votos > 0)', function (ok) {
  var env = crearEntorno({ datos: { ok: true, data: FILAS_B } });
  return llamar(env).then(function (res) {
    var arr = res.llamadas[0] || [];
    ok(arr.length === 1, 'items=' + arr.length + ' esperado=1 (solo la de votos 1)');
    ok(urls(arr)[0] === 'https://cdn.test/com-b-uno.jpg', 'url=' + urls(arr)[0]);
    var crudo = urls(arr).join(' ');
    ok(crudo.indexOf('com-b-cero') === -1, 'foto con votos 0 entro: ' + crudo);
    ok(arr.length === 0 || arr[0].votos === 1, 'votos=' + (arr[0] ? arr[0].votos : 'n/a'));
  });
});

// C) RESPALDO: primaria con 0 fotos utilizables + destacados con foto ->
//    esas fotos, rating DESC y luego nombre ASC, votos 0.
var FILAS_C = [
  foto('https://cdn.test/com-c-cero.jpg', 0),
  foto('https://cdn.test/clip-c.mp4', 30)
];

var DESTACADOS_C = [
  { destacado: true, name: 'Zeta Sur', foto: 'https://cdn.test/d-z.jpg', rating: 3.5 },
  { destacado: true, name: 'Alfa', foto: 'https://cdn.test/d-a.jpg', rating: 4.8 },
  { destacado: true, name: 'Beta', foto: 'https://cdn.test/d-b.jpg', rating: 4.8 },
  { destacado: true, name: 'Gamma', rating: 5 },
  { destacado: false, name: 'Delta', foto: 'https://cdn.test/d-d.jpg', rating: 5 },
  { destacado: true, name: 'Omega', foto_hero: 'https://cdn.test/d-o.jpg', rating: 1 },
  { destacado: true, name: 'Video', foto: 'https://cdn.test/d-v.mp4', rating: 9 }
];

correr('C respaldo: destacados con foto, rating DESC y nombre ASC, votos 0', function (ok) {
  var env = crearEntorno({ datos: { ok: true, data: FILAS_C } });
  var sembrados = env.fijarDestacados(DESTACADOS_C);
  // heroFijarDestacados cachea TODO destacado con foto (aqui 5: los 4 utiles
  // + el .mp4); el filtro de formato se aplica al ENTREGAR. Sin foto (Gamma)
  // y destacado !== true (Delta) no llegan a la cache.
  ok(sembrados === 5, 'destacados con foto en cache=' + sembrados + ' esperado=5');
  return llamar(env).then(function (res) {
    var arr = res.llamadas[0] || [];
    var esperado = [
      'https://cdn.test/d-a.jpg',
      'https://cdn.test/d-b.jpg',
      'https://cdn.test/d-z.jpg',
      'https://cdn.test/d-o.jpg'
    ];
    ok(arr.length === 4, 'items=' + arr.length + ' esperado=4');
    ok(iguales(urls(arr), esperado), 'orden=' + urls(arr).join(' | ') + ' esperado=' + esperado.join(' | '));
    var i;
    for (i = 0; i < arr.length; i++) {
      ok(arr[i].votos === 0, 'item ' + i + ' votos=' + arr[i].votos + ' esperado=0');
    }
    var crudo = urls(arr).join(' ');
    ok(crudo.indexOf('d-d.jpg') === -1, 'destacado false entro al respaldo: ' + crudo);
    ok(crudo.indexOf('.mp4') === -1, 'video entro al respaldo: ' + crudo);
    ok(arr.length && arr[0].nombre === 'Alfa', 'nombre0=' + (arr.length ? arr[0].nombre : 'n/a'));
    ok(arr.length === 4 && arr[2].nombre === 'Zeta Sur', 'nombre2=' + (arr.length === 4 ? arr[2].nombre : 'n/a'));
  });
});

// D) VACIO: sin primaria y sin destacados -> [] (la home conserva gradiente).
correr('D vacio: sin primaria ni destacados entrega []', function (ok) {
  var env = crearEntorno({ datos: { ok: true, data: [] } });
  return llamar(env).then(function (res) {
    ok(res.llamadas.length === 1, 'callback llamado ' + res.llamadas.length + ' veces');
    var arr = res.llamadas[0];
    ok(Array.isArray(arr), 'entrega no es array: ' + Object.prototype.toString.call(arr));
    ok(arr && arr.length === 0, 'items=' + (arr ? arr.length : 'n/a') + ' esperado=0');
  });
});

// E) ERROR DE RED: fetch que rechaza -> callback una sola vez con [] y sin lanzar.
correr('E error de red: callback una vez con [] y sin lanzar', function (ok) {
  var env = crearEntorno({ fetch: 'rechaza' });
  return llamar(env).then(function (res) {
    ok(res.lanzo === null, 'cargar lanzo sincronicamente: ' + (res.lanzo && res.lanzo.message));
    ok(res.llamadas.length === 1, 'callback llamado ' + res.llamadas.length + ' veces, esperado 1');
    var arr = res.llamadas[0];
    ok(Array.isArray(arr) && arr.length === 0, 'contenido=' + JSON.stringify(arr));
    // Con la precedencia nueva caen los DOS tramos (modulo y comunidad), pero
    // el contrato es el mismo: un callback, [] y sin lanzar.
    ok(env.peticiones.length === 2, 'peticiones=' + env.peticiones.length + ' esperado=2 (ambos tramos fallan)');
    ok(env.peticiones[0].modulo === true, 'la primera peticion no fue el modulo: ' + env.peticiones[0].url);
  });
});

// F) ANTI-MARTILLEO: dos llamadas seguidas -> una sola peticion y mismo array.
var FILAS_F = [
  foto('https://cdn.test/com-f1.jpg', 7),
  foto('https://cdn.test/com-f2.jpg', 4)
];

correr('F anti-martilleo: dos llamadas, una peticion, mismo array', function (ok) {
  var env = crearEntorno({ datos: { ok: true, data: FILAS_F } });
  return llamar(env, 2).then(function (res) {
    ok(res.llamadas.length === 2, 'callbacks=' + res.llamadas.length + ' esperado=2');
    ok(env.peticiones.length === 2, 'peticiones=' + env.peticiones.length + ' esperado=2 (modulo + comunidad, una sola vez)');
    var a = res.llamadas[0] || [];
    var b = res.llamadas[1] || [];
    ok(iguales(urls(a), urls(b)), 'arrays distintos: ' + urls(a).join(',') + ' vs ' + urls(b).join(','));
    ok(a.length === 2, 'items=' + a.length + ' esperado=2');
    return llamar(env, 1).then(function (tercero) {
      ok(env.peticiones.length === 2, 'peticiones tras tercera llamada=' + env.peticiones.length + ' esperado=2 (cache)');
      ok(iguales(urls(tercero.llamadas[0] || []), urls(a)), 'la tercera entrega difiere: ' + urls(tercero.llamadas[0] || []).join(','));
    });
  });
});

// G) AISLAMIENTO: el estado del mapa (MEDIA_*) y MAPA_MEDIA quedan intactos.
correr('G aislamiento: MEDIA_* y MAPA_MEDIA intactos tras cargar', function (ok) {
  var media = [
    { media_url: 'https://cdn.test/mapa-1.jpg', lat: 1.1, lng: -2.2 },
    { media_url: 'https://cdn.test/mapa-2.jpg', lat: 3.3, lng: -4.4 }
  ];
  var env = crearEntorno({ datos: { ok: true, data: FILAS_A }, MAPA_MEDIA: media });
  var refMedia = env.sandbox.MAPA_MEDIA;
  var antes = env.estado();
  var mediaAntes = JSON.stringify(refMedia);
  ok(antes.MEDIA_LISTO === false, 'MEDIA_LISTO inicial=' + antes.MEDIA_LISTO);
  ok(antes.MEDIA_PIDIDA === false, 'MEDIA_PIDIDA inicial=' + antes.MEDIA_PIDIDA);
  ok(antes.MEDIA_TOKEN === 0, 'MEDIA_TOKEN inicial=' + antes.MEDIA_TOKEN);
  return llamar(env).then(function (res) {
    ok(res.llamadas.length === 1 && (res.llamadas[0] || []).length === HERO_MAX,
      'precondicion: el hero no entrego lo esperado');
    var despues = env.estado();
    ok(despues.MEDIA_LISTO === antes.MEDIA_LISTO, 'MEDIA_LISTO muto: ' + antes.MEDIA_LISTO + ' -> ' + despues.MEDIA_LISTO);
    ok(despues.MEDIA_PIDIDA === antes.MEDIA_PIDIDA, 'MEDIA_PIDIDA muto: ' + antes.MEDIA_PIDIDA + ' -> ' + despues.MEDIA_PIDIDA);
    ok(despues.MEDIA_TOKEN === antes.MEDIA_TOKEN, 'MEDIA_TOKEN muto: ' + antes.MEDIA_TOKEN + ' -> ' + despues.MEDIA_TOKEN);
    ok(env.sandbox.MAPA_MEDIA === refMedia, 'MAPA_MEDIA cambio de referencia (replArr en la capa equivocada)');
    ok(JSON.stringify(refMedia) === mediaAntes, 'MAPA_MEDIA muto: ' + JSON.stringify(refMedia) + ' vs ' + mediaAntes);
    ok(refMedia.length === 2, 'MAPA_MEDIA length=' + refMedia.length + ' esperado=2');
  });
});

// H) FORMATO DE ENTREGA: url no vacia, nombre string, votos number (primaria
//    y respaldo).
function revisarFormato(ok, etiqueta, arr) {
  ok(Array.isArray(arr), etiqueta + ': no es array');
  var i;
  for (i = 0; i < (arr || []).length; i++) {
    var it = arr[i] || {};
    ok(typeof it.url === 'string' && it.url.trim() !== '', etiqueta + '[' + i + '].url invalida: ' + JSON.stringify(it.url));
    ok(typeof it.nombre === 'string', etiqueta + '[' + i + '].nombre no es string: ' + typeof it.nombre);
    ok(typeof it.votos === 'number' && isFinite(it.votos), etiqueta + '[' + i + '].votos no es number: ' + JSON.stringify(it.votos));
  }
}

correr('H formato: url no vacia, nombre string, votos number', function (ok) {
  var primaria = crearEntorno({ datos: { ok: true, data: FILAS_A } });
  return llamar(primaria).then(function (res) {
    revisarFormato(ok, 'primaria', res.llamadas[0]);
    var respaldo = crearEntorno({ datos: { ok: true, data: [] } });
    respaldo.fijarDestacados(DESTACADOS_C);
    return llamar(respaldo).then(function (res2) {
      revisarFormato(ok, 'respaldo', res2.llamadas[0]);
    });
  });
});

// ------------------------------------------------- MODULO MANUAL (tramo 1)
// I) El modulo va PRIMERO y RELLENA: 2 activas (una de CDN SIN extension) + 3
//    inactivas + comunidad disponible -> 2 del modulo en orden de posicion y 4
//    de comunidad por votos DESC, hasta 6. Ya no hay corto-circuito.
var MODULO_I = {
  ok: true,
  total: 5,
  data: [
    { posicion: 3, url: 'https://cdn.test/mod-c.jpg', caption: 'Slot C', activa: true },
    { posicion: 1, url: 'https://res.cloudinary.com/demo/image/upload/w_1200/hero-home', caption: 'Slot A', activa: true },
    { posicion: 2, url: 'https://cdn.test/mod-x.jpg', caption: 'Slot X', activa: false },
    { posicion: 4, url: 'https://cdn.test/mod-y.jpg', caption: '', activa: false },
    { posicion: 5, url: '', caption: 'Sin url', activa: true }
  ]
};

correr('I modulo: activas primero por posicion y comunidad rellena hasta 6', function (ok) {
  var env = crearEntorno({ datos: { ok: true, data: FILAS_A }, heroModulo: MODULO_I });
  var antes = env.estado();
  return llamar(env).then(function (res) {
    ok(res.lanzo === null, 'cargar lanzo: ' + (res.lanzo && res.lanzo.message));
    ok(res.llamadas.length === 1, 'callback llamado ' + res.llamadas.length + ' veces, esperado 1');
    var arr = res.llamadas[0] || [];
    var esperado = [
      'https://res.cloudinary.com/demo/image/upload/w_1200/hero-home',
      'https://cdn.test/mod-c.jpg',
      'https://cdn.test/com-a1.jpg',
      'https://cdn.test/com-a3.jpg',
      'https://cdn.test/com-a2.jpg',
      'https://cdn.test/com-a4.jpg'
    ];
    ok(arr.length === HERO_MAX, 'items=' + arr.length + ' esperado=' + HERO_MAX);
    ok(iguales(urls(arr), esperado), 'orden=' + urls(arr).join(' | ') + ' esperado=' + esperado.join(' | '));
    ok(arr.length === HERO_MAX && arr[0].nombre === 'Slot A', 'nombre0=' + (arr.length ? JSON.stringify(arr[0].nombre) : 'n/a'));
    ok(arr.length === HERO_MAX && arr[1].nombre === 'Slot C', 'nombre1=' + (arr.length > 1 ? JSON.stringify(arr[1].nombre) : 'n/a'));
    // El modulo entrega votos 0; la cola de comunidad sigue siendo votos DESC.
    var i;
    for (i = 0; i < 2 && i < arr.length; i++) {
      ok(arr[i].votos === 0, 'item modulo ' + i + ' votos=' + arr[i].votos + ' esperado=0');
    }
    ok(votosDescendentes(arr.slice(2)), 'cola de comunidad no descendente: '
      + arr.slice(2).map(function (x) { return x.votos; }).join(','));
    var crudo = urls(arr).join(' ');
    ok(crudo.indexOf('mod-x') === -1 && crudo.indexOf('mod-y') === -1, 'slot inactivo entro al hero: ' + crudo);
    ok(crudo.indexOf('com-a7') === -1, 'foto con votos 0 de comunidad entro: ' + crudo);
    ok(sinDuplicados(urls(arr)), 'URLs repetidas: ' + urls(arr).join(','));
    revisarFormato(ok, 'modulo', arr);
    // Relleno medido: se pide el modulo y despues la comunidad.
    ok(env.peticiones.length === 2, 'peticiones=' + env.peticiones.length + ' esperado=2 (modulo + comunidad)');
    ok(modulares(env).length === 1, 'peticiones tipo=hero_home=' + modulares(env).length + ' esperado=1');
    ok(comunitarias(env).length === 1, 'se esperaba 1 peticion a comunidad: ' + comunitarias(env).length);
    ok(env.peticiones[0].modulo === true, 'la primera peticion no fue el modulo: ' + env.peticiones[0].url);
    var despues = env.estado();
    ok(despues.MEDIA_LISTO === antes.MEDIA_LISTO && despues.MEDIA_PIDIDA === antes.MEDIA_PIDIDA
      && despues.MEDIA_TOKEN === antes.MEDIA_TOKEN, 'el modulo toco el estado MEDIA_*');
  });
});

// J) 6 slots, uno apagado EN MEDIO y el payload desordenado -> 5 del modulo en
//    orden de posicion y el ultimo hueco lo rellena la comunidad.
var MODULO_J = {
  ok: true,
  total: 6,
  data: [
    { posicion: 6, url: 'https://cdn.test/j6.jpg', caption: 'J6', activa: true },
    { posicion: 2, url: 'https://cdn.test/j2.jpg', caption: 'J2', activa: true },
    { posicion: 4, url: 'https://cdn.test/j4.jpg', caption: 'J4', activa: true },
    { posicion: 3, url: 'https://cdn.test/j3-apagada.jpg', caption: 'J3', activa: false },
    { posicion: 1, url: 'https://cdn.test/j1.jpg', caption: 'J1', activa: true },
    { posicion: 5, url: 'https://cdn.test/j5.jpg', caption: 'J5', activa: true }
  ]
};

correr('J modulo: hueco intermedio, 5 activas y 1 de comunidad al final', function (ok) {
  var env = crearEntorno({ datos: { ok: true, data: FILAS_A }, heroModulo: MODULO_J });
  return llamar(env).then(function (res) {
    ok(res.llamadas.length === 1, 'callback llamado ' + res.llamadas.length + ' veces, esperado 1');
    var arr = res.llamadas[0] || [];
    var esperado = [
      'https://cdn.test/j1.jpg',
      'https://cdn.test/j2.jpg',
      'https://cdn.test/j4.jpg',
      'https://cdn.test/j5.jpg',
      'https://cdn.test/j6.jpg',
      'https://cdn.test/com-a1.jpg'
    ];
    ok(arr.length === HERO_MAX, 'items=' + arr.length + ' esperado=' + HERO_MAX);
    ok(iguales(urls(arr), esperado), 'orden=' + urls(arr).join(' | ') + ' esperado=' + esperado.join(' | '));
    ok(urls(arr).join(' ').indexOf('j3-apagada') === -1, 'slot apagado intermedio entro al hero');
    ok(env.peticiones.length === 2, 'peticiones=' + env.peticiones.length + ' esperado=2 (hueco -> comunidad)');
    ok(comunitarias(env).length === 1, 'peticiones a comunidad=' + comunitarias(env).length + ' esperado=1');
    ok(arr.length === HERO_MAX && arr[HERO_MAX - 1].votos > 0,
      'el ultimo hueco no lo relleno la comunidad: ' + (arr.length ? JSON.stringify(arr[arr.length - 1]) : 'n/a'));
    ok(sinDuplicados(urls(arr)), 'URLs repetidas: ' + urls(arr).join(','));
  });
});

// K) Modulo con 0 activas -> cae a comunidad (mismo resultado que el caso A).
var MODULO_K = {
  ok: true,
  total: 2,
  data: [
    { posicion: 1, url: 'https://cdn.test/k1.jpg', caption: 'K1', activa: false },
    { posicion: 2, url: 'https://cdn.test/k2.jpg', caption: 'K2', activa: false }
  ]
};

correr('K modulo vacio: 0 activas -> comunidad intacta', function (ok) {
  var env = crearEntorno({ datos: { ok: true, data: FILAS_A }, heroModulo: MODULO_K });
  return llamar(env).then(function (res) {
    ok(res.llamadas.length === 1, 'callback llamado ' + res.llamadas.length + ' veces, esperado 1');
    var arr = res.llamadas[0] || [];
    ok(arr.length === HERO_MAX, 'items=' + arr.length + ' esperado=' + HERO_MAX);
    ok(iguales(urls(arr), ESPERADO_A), 'orden=' + urls(arr).join(' | ') + ' esperado=' + ESPERADO_A.join(' | '));
    ok(votosDescendentes(arr), 'votos no descendentes: ' + arr.map(function (x) { return x.votos; }).join(','));
    ok(urls(arr).join(' ').indexOf('k1.jpg') === -1, 'slot apagado entro al hero como si fuera modulo');
    ok(modulares(env).length === 1, 'peticiones al modulo=' + modulares(env).length + ' esperado=1');
    ok(comunitarias(env).length === 1, 'peticiones a comunidad=' + comunitarias(env).length + ' esperado=1');
  });
});

// L) Modulo degradado:true, error HTTP (ok:false) o red caida -> comunidad,
//    sin lanzar y con UNA sola invocacion del callback por ciclo.
correr('L modulo degradado o caido: comunidad, una sola invocacion', function (ok) {
  var degradado = crearEntorno({
    datos: { ok: true, data: FILAS_A },
    heroModulo: { ok: true, degradado: true, total: 0, data: [] }
  });
  return llamar(degradado).then(function (res) {
    ok(res.lanzo === null, 'degradado: lanzo ' + (res.lanzo && res.lanzo.message));
    ok(res.llamadas.length === 1, 'degradado: callback ' + res.llamadas.length + ' veces, esperado 1');
    ok(iguales(urls(res.llamadas[0] || []), ESPERADO_A), 'degradado: orden=' + urls(res.llamadas[0] || []).join(' | '));
    ok(modulares(degradado).length === 1, 'degradado: peticiones al modulo=' + modulares(degradado).length);
    ok(comunitarias(degradado).length === 1, 'degradado: peticiones a comunidad=' + comunitarias(degradado).length + ' esperado=1');
    var conError = crearEntorno({
      datos: { ok: true, data: FILAS_A },
      heroModulo: { ok: false, error: 'hero_home no disponible' }
    });
    return llamar(conError).then(function (res2) {
      ok(res2.llamadas.length === 1, 'ok:false -> callback ' + res2.llamadas.length + ' veces, esperado 1');
      ok(iguales(urls(res2.llamadas[0] || []), ESPERADO_A), 'ok:false -> orden=' + urls(res2.llamadas[0] || []).join(' | '));
      ok(comunitarias(conError).length === 1, 'ok:false -> peticiones a comunidad=' + comunitarias(conError).length);
      var sinRed = crearEntorno({ datos: { ok: true, data: FILAS_A }, fetchModulo: 'rechaza' });
      return llamar(sinRed).then(function (res3) {
        ok(res3.lanzo === null, 'red caida: lanzo ' + (res3.lanzo && res3.lanzo.message));
        ok(res3.llamadas.length === 1, 'red caida: callback ' + res3.llamadas.length + ' veces, esperado 1');
        ok(iguales(urls(res3.llamadas[0] || []), ESPERADO_A), 'red caida -> orden=' + urls(res3.llamadas[0] || []).join(' | '));
        ok(comunitarias(sinRed).length === 1, 'red caida -> peticiones a comunidad=' + comunitarias(sinRed).length);
      });
    });
  });
});

// M) Formato del modulo: un slot .mp4 se descarta. Con un unico slot activo
//    no utilizable, el tramo 1 da 0 y decide la comunidad.
var MODULO_M = {
  ok: true,
  total: 2,
  data: [
    { posicion: 1, url: 'https://cdn.test/m-clip.mp4', caption: 'Video', activa: true },
    { posicion: 2, url: 'https://cdn.test/m-apagada.jpg', caption: 'Apagada', activa: false }
  ]
};

correr('M modulo: slot .mp4 descartado y, si queda 0, comunidad', function (ok) {
  var env = crearEntorno({ datos: { ok: true, data: FILAS_A }, heroModulo: MODULO_M });
  return llamar(env).then(function (res) {
    ok(res.llamadas.length === 1, 'callback llamado ' + res.llamadas.length + ' veces, esperado 1');
    var arr = res.llamadas[0] || [];
    ok(urls(arr).join(' ').indexOf('.mp4') === -1, 'el .mp4 del modulo entro al hero: ' + urls(arr).join(','));
    ok(iguales(urls(arr), ESPERADO_A), 'orden=' + urls(arr).join(' | ') + ' esperado= ' + ESPERADO_A.join(' | '));
    ok(comunitarias(env).length === 1, 'peticiones a comunidad=' + comunitarias(env).length + ' esperado=1');
    // Mismo slot .mp4 acompanado de una imagen valida: se queda la imagen
    // PRIMERO y la comunidad rellena los 5 huecos restantes.
    var mixto = crearEntorno({
      datos: { ok: true, data: FILAS_A },
      heroModulo: {
        ok: true,
        total: 2,
        data: [
          { posicion: 1, url: 'https://cdn.test/mixto.mp4', caption: 'Video', activa: true },
          { posicion: 2, url: 'https://cdn.test/mixto-foto.jpg', caption: 'Foto', activa: true }
        ]
      }
    });
    return llamar(mixto).then(function (res2) {
      var arr2 = res2.llamadas[0] || [];
      var esperado2 = [
        'https://cdn.test/mixto-foto.jpg',
        'https://cdn.test/com-a1.jpg',
        'https://cdn.test/com-a3.jpg',
        'https://cdn.test/com-a2.jpg',
        'https://cdn.test/com-a4.jpg',
        'https://cdn.test/com-a5.jpg'
      ];
      ok(arr2.length === HERO_MAX, 'mixto: items=' + arr2.length + ' esperado=' + HERO_MAX);
      ok(iguales(urls(arr2), esperado2), 'mixto: orden=' + urls(arr2).join(' | ') + ' esperado=' + esperado2.join(' | '));
      ok(arr2.length && arr2[0].nombre === 'Foto', 'mixto: nombre=' + (arr2.length ? JSON.stringify(arr2[0].nombre) : 'n/a'));
      ok(arr2.length && arr2[0].votos === 0, 'mixto: votos0=' + (arr2.length ? arr2[0].votos : 'n/a'));
      ok(urls(arr2).join(' ').indexOf('mixto.mp4') === -1, 'mixto: el .mp4 entro al hero');
      ok(comunitarias(mixto).length === 1, 'mixto: peticiones a comunidad=' + comunitarias(mixto).length + ' esperado=1');
    });
  });
});

// ------------------------------------------- MEZCLA: casos del operador (N-Q)
// N) El caso reportado: UN solo slot activo en el panel + comunidad llena ->
//    el hero NO se queda con una foto: 1 del modulo PRIMERO (con su caption y
//    votos 0) y 5 de comunidad por votos DESC.
var MODULO_N = {
  ok: true,
  total: 1,
  data: [
    { posicion: 1, url: 'https://cdn.test/mod-n.jpg', caption: 'Portada N', activa: true }
  ]
};

correr('N mezcla: 1 slot del modulo + 5 de comunidad (no se queda en 1 foto)', function (ok) {
  var env = crearEntorno({ datos: { ok: true, data: FILAS_A }, heroModulo: MODULO_N });
  return llamar(env).then(function (res) {
    ok(res.lanzo === null, 'cargar lanzo: ' + (res.lanzo && res.lanzo.message));
    ok(res.llamadas.length === 1, 'callback llamado ' + res.llamadas.length + ' veces, esperado 1');
    var arr = res.llamadas[0] || [];
    var esperado = [
      'https://cdn.test/mod-n.jpg',
      'https://cdn.test/com-a1.jpg',
      'https://cdn.test/com-a3.jpg',
      'https://cdn.test/com-a2.jpg',
      'https://cdn.test/com-a4.jpg',
      'https://cdn.test/com-a5.jpg'
    ];
    ok(arr.length === HERO_MAX, 'items=' + arr.length + ' esperado=' + HERO_MAX);
    ok(iguales(urls(arr), esperado), 'orden=' + urls(arr).join(' | ') + ' esperado=' + esperado.join(' | '));
    ok(arr.length > 0 && arr[0].url === 'https://cdn.test/mod-n.jpg', 'el slot del modulo no va primero: ' + (arr[0] && arr[0].url));
    ok(arr.length > 0 && arr[0].nombre === 'Portada N', 'nombre0=' + (arr.length ? JSON.stringify(arr[0].nombre) : 'n/a'));
    ok(arr.length > 0 && arr[0].votos === 0, 'votos0=' + (arr.length ? arr[0].votos : 'n/a') + ' esperado=0');
    ok(votosDescendentes(arr.slice(1)), 'cola de comunidad no descendente: '
      + arr.slice(1).map(function (x) { return x.votos; }).join(','));
    ok(sinDuplicados(urls(arr)), 'URLs repetidas: ' + urls(arr).join(','));
    revisarFormato(ok, 'mezcla-n', arr);
    // Con 1 activa se piden DOS tramos: modulo y comunidad.
    ok(env.peticiones.length === 2, 'peticiones=' + env.peticiones.length + ' esperado=2 (modulo + comunidad)');
    ok(modulares(env).length === 1 && comunitarias(env).length === 1,
      'reparto de peticiones modulo=' + modulares(env).length + ' comunidad=' + comunitarias(env).length);
  });
});

// O) DEDUPE ENTRE FUENTES: la misma URL esta en el modulo y en comunidad ->
//    aparece UNA sola vez, con la del modulo (caption y votos 0), y el hueco se
//    rellena con la siguiente de comunidad.
var MODULO_O = {
  ok: true,
  total: 1,
  data: [
    { posicion: 1, url: 'https://cdn.test/com-a3.jpg', caption: 'Slot Doblado', activa: true }
  ]
};

correr('O dedupe: modulo y comunidad con la misma URL -> gana el modulo', function (ok) {
  var env = crearEntorno({ datos: { ok: true, data: FILAS_A }, heroModulo: MODULO_O });
  return llamar(env).then(function (res) {
    ok(res.llamadas.length === 1, 'callback llamado ' + res.llamadas.length + ' veces, esperado 1');
    var arr = res.llamadas[0] || [];
    var esperado = [
      'https://cdn.test/com-a3.jpg',
      'https://cdn.test/com-a1.jpg',
      'https://cdn.test/com-a2.jpg',
      'https://cdn.test/com-a4.jpg',
      'https://cdn.test/com-a5.jpg',
      'https://cdn.test/com-a8.jpg'
    ];
    ok(arr.length === HERO_MAX, 'items=' + arr.length + ' esperado=' + HERO_MAX);
    ok(iguales(urls(arr), esperado), 'orden=' + urls(arr).join(' | ') + ' esperado=' + esperado.join(' | '));
    var repetidas = 0;
    var i;
    for (i = 0; i < arr.length; i++) {
      if (String(arr[i].url).indexOf('com-a3.jpg') !== -1) repetidas++;
    }
    ok(repetidas === 1, 'la URL compartida aparece ' + repetidas + ' veces, esperado 1');
    ok(arr.length > 0 && arr[0].nombre === 'Slot Doblado',
      'no gano el nombre del modulo: ' + (arr.length ? JSON.stringify(arr[0].nombre) : 'n/a'));
    ok(arr.length > 0 && arr[0].votos === 0, 'la del modulo debe traer votos 0, trae ' + (arr.length ? arr[0].votos : 'n/a'));
    ok(sinDuplicados(urls(arr)), 'URLs repetidas: ' + urls(arr).join(','));
    ok(env.peticiones.length === 2, 'peticiones=' + env.peticiones.length + ' esperado=2 (modulo + comunidad)');
  });
});

// P) CORTO-CIRCUITO: el modulo ya llena los 6 -> NO se pide comunidad (ni se
//    consulta el respaldo): una unica peticion en todo el ciclo.
var MODULO_P = {
  ok: true,
  total: 6,
  data: [
    { posicion: 6, url: 'https://cdn.test/p6.jpg', caption: 'P6', activa: true },
    { posicion: 1, url: 'https://cdn.test/p1.jpg', caption: 'P1', activa: true },
    { posicion: 4, url: 'https://cdn.test/p4.jpg', caption: 'P4', activa: true },
    { posicion: 2, url: 'https://cdn.test/p2.jpg', caption: 'P2', activa: true },
    { posicion: 5, url: 'https://cdn.test/p5.jpg', caption: 'P5', activa: true },
    { posicion: 3, url: 'https://cdn.test/p3.jpg', caption: 'P3', activa: true }
  ]
};

correr('P corto-circuito: modulo con 6 activas -> no se pide comunidad', function (ok) {
  var env = crearEntorno({ datos: { ok: true, data: FILAS_A }, heroModulo: MODULO_P });
  return llamar(env).then(function (res) {
    ok(res.llamadas.length === 1, 'callback llamado ' + res.llamadas.length + ' veces, esperado 1');
    var arr = res.llamadas[0] || [];
    var esperado = [
      'https://cdn.test/p1.jpg',
      'https://cdn.test/p2.jpg',
      'https://cdn.test/p3.jpg',
      'https://cdn.test/p4.jpg',
      'https://cdn.test/p5.jpg',
      'https://cdn.test/p6.jpg'
    ];
    ok(arr.length === HERO_MAX, 'items=' + arr.length + ' esperado=' + HERO_MAX);
    ok(iguales(urls(arr), esperado), 'orden=' + urls(arr).join(' | ') + ' esperado=' + esperado.join(' | '));
    var i;
    for (i = 0; i < arr.length; i++) {
      ok(arr[i].votos === 0, 'item ' + i + ' votos=' + arr[i].votos + ' esperado=0');
    }
    ok(env.peticiones.length === 1, 'peticiones=' + env.peticiones.length + ' esperado=1 (solo modulo)');
    ok(modulares(env).length === 1, 'peticiones tipo=hero_home=' + modulares(env).length + ' esperado=1');
    ok(comunitarias(env).length === 0, 'se pidio comunidad con los 6 slots llenos: ' + comunitarias(env).length);
    ok(sinDuplicados(urls(arr)), 'URLs repetidas: ' + urls(arr).join(','));
  });
});

// Q) RELLENO FINAL CON DESTACADOS: 2 del modulo + 1 de comunidad + sin mas
//    comunidad -> 3 items y el resto lo pone el respaldo (rating DESC).
var MODULO_Q = {
  ok: true,
  total: 2,
  data: [
    { posicion: 2, url: 'https://cdn.test/q2.jpg', caption: 'Q2', activa: true },
    { posicion: 1, url: 'https://cdn.test/q1.jpg', caption: 'Q1', activa: true }
  ]
};

var FILAS_Q = [
  foto('https://cdn.test/com-q1.jpg', 5, { album_titulo: 'Comunidad Q' }),
  foto('https://cdn.test/com-q-cero.jpg', 0, { album_titulo: 'Sin votos' })
];

correr('Q relleno: modulo + comunidad + destacados hasta los 6', function (ok) {
  var env = crearEntorno({ datos: { ok: true, data: FILAS_Q }, heroModulo: MODULO_Q });
  env.fijarDestacados(DESTACADOS_C);
  return llamar(env).then(function (res) {
    ok(res.llamadas.length === 1, 'callback llamado ' + res.llamadas.length + ' veces, esperado 1');
    var arr = res.llamadas[0] || [];
    var esperado = [
      'https://cdn.test/q1.jpg',
      'https://cdn.test/q2.jpg',
      'https://cdn.test/com-q1.jpg',
      'https://cdn.test/d-a.jpg',
      'https://cdn.test/d-b.jpg',
      'https://cdn.test/d-z.jpg'
    ];
    ok(arr.length === HERO_MAX, 'items=' + arr.length + ' esperado=' + HERO_MAX);
    ok(iguales(urls(arr), esperado), 'orden=' + urls(arr).join(' | ') + ' esperado=' + esperado.join(' | '));
    ok(arr.length > 2 && arr[2].nombre === 'Comunidad Q', 'nombre2=' + (arr.length > 2 ? JSON.stringify(arr[2].nombre) : 'n/a'));
    ok(arr.length > 2 && arr[2].votos === 5, 'votos2=' + (arr.length > 2 ? arr[2].votos : 'n/a') + ' esperado=5');
    var i;
    for (i = 3; i < arr.length; i++) {
      ok(arr[i].votos === 0, 'relleno ' + i + ' votos=' + arr[i].votos + ' esperado=0');
    }
    ok(arr.length > 4 && arr[3].nombre === 'Alfa' && arr[4].nombre === 'Beta',
      'orden del respaldo roto: ' + [arr[3] && arr[3].nombre, arr[4] && arr[4].nombre].join(','));
    ok(urls(arr).join(' ').indexOf('com-q-cero') === -1, 'foto con votos 0 de comunidad entro: ' + urls(arr).join(','));
    ok(urls(arr).join(' ').indexOf('d-d.jpg') === -1, 'destacado false entro al relleno');
    ok(urls(arr).join(' ').indexOf('.mp4') === -1, 'video entro al relleno');
    ok(sinDuplicados(urls(arr)), 'URLs repetidas: ' + urls(arr).join(','));
    revisarFormato(ok, 'mezcla-q', arr);
    ok(env.peticiones.length === 2, 'peticiones=' + env.peticiones.length + ' esperado=2 (modulo + comunidad)');
    ok(comunitarias(env).length === 1, 'peticiones a comunidad=' + comunitarias(env).length + ' esperado=1');
  });
});

// ------------------------------------------------------------------ cierre
COLA.then(function () {
  var total = RESULTADOS.length;
  var pasan = 0;
  var k;
  for (k = 0; k < RESULTADOS.length; k++) {
    if (RESULTADOS[k]) pasan++;
  }
  console.log('RESULTADO: ' + pasan + '/' + total + ' PASS');
  process.exit(pasan === total && total > 0 ? 0 : 1);
}, function (e) {
  console.log('FAIL cola de casos | excepcion: ' + (e && e.message ? e.message : String(e)));
  console.log('RESULTADO: 0/' + RESULTADOS.length + ' PASS');
  process.exit(1);
});
