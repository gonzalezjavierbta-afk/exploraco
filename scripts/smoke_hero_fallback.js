// scripts/smoke_hero_fallback.js
// Smoke permanente y determinista de la cascada del HERO MOSAICO de
// api/pagina-destino.js (buildHTML). Congela la semantica ya implementada:
//   PASO A: comunidad (viajeros + albumes) con votos > 0 y tipo foto,
//           orden votos DESC.
//   PASO B: relleno con curadas ordenadas por es_hero DESC y luego orden ASC.
//   Sin PASO C: una foto de comunidad con 0 votos NUNCA entra al hero.
// Cero red, cero base de datos, cero DATABASE_URL: el motor se evalua en un
// sandbox vm con un require stub (mismo patron que
// scripts/check_buildHTML_inline.js).
// Uso: node scripts/smoke_hero_fallback.js
// Exit code != 0 si algun caso falla.
'use strict';

var fs = require('fs');
var path = require('path');
var vm = require('vm');

var ROOT = path.join(__dirname, '..');
var MOTOR = path.join(ROOT, 'api', 'pagina-destino.js');
var MAX_THUMBS = 3;

// ---------------------------------------------------------------- carga
function cargarBuildHTML() {
  if (!fs.existsSync(MOTOR)) {
    console.error('ERROR: no existe api/pagina-destino.js -> ' + MOTOR);
    process.exit(2);
  }
  var neonStub = function () {
    return function () { return Promise.resolve([]); };
  };
  function requireStub(nombre) {
    if (nombre === '@neondatabase/serverless') return { neon: neonStub };
    return {};
  }
  var consolaSilenciosa = { log: function () {}, error: function () {}, warn: function () {}, info: function () {} };
  var sandbox = {
    module: { exports: {} },
    require: requireStub,
    console: consolaSilenciosa,
    // env vacio: el smoke no puede tocar Neon ni ninguna variable real
    process: { env: {}, argv: [], platform: process.platform, version: process.version },
    Buffer: Buffer,
    URL: URL,
    URLSearchParams: URLSearchParams,
    setTimeout: setTimeout,
    clearTimeout: clearTimeout
  };
  sandbox.exports = sandbox.module.exports;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  var src = fs.readFileSync(MOTOR, 'utf8');
  vm.runInContext(src + '\nmodule.exports.buildHTML = buildHTML;\n', sandbox, { filename: 'api/pagina-destino.js' });
  var fn = sandbox.module.exports.buildHTML;
  if (typeof fn !== 'function') throw new Error('buildHTML no quedo exportada por el sandbox');
  return fn;
}

// ------------------------------------------------------------ extraccion
// esc() del motor convierte & < > " en entidades: se revierte para comparar.
function unesc(s) {
  return String(s)
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

// URL de la imagen principal (.psm) del hero.
function urlPrincipal(html) {
  var m = /class="psm"[^>]*background-image:url\('([^']*)'\)/.exec(html);
  return m ? unesc(m[1]) : '';
}

// URLs de las miniaturas (.pth), en el orden en que se emiten.
function urlsMiniaturas(html) {
  var out = [];
  var re = /class="pth" style="background-image:url\('([^']*)'\)/g;
  var m;
  while ((m = re.exec(html)) !== null) out.push(unesc(m[1]));
  return out;
}

function contarMiniaturas(html) {
  return (html.match(/class="pth"/g) || []).length;
}

function contieneProw(html) {
  return html.indexOf('<div class="prow">') !== -1;
}

// --------------------------------------------- metas sociales y JSON-LD
// Meta con content="..." localizada por atributo y clave (og:image /
// twitter:image). Mismo estilo de regex que urlPrincipal/urlsMiniaturas.
function metaContenido(html, atributo, clave) {
  var re = new RegExp('<meta ' + atributo + '="' + clave + '" content="([^"]*)"');
  var m = re.exec(html);
  return m ? unesc(m[1]) : '';
}

function ogImagen(html) {
  return metaContenido(html, 'property', 'og:image');
}

function twImagen(html) {
  return metaContenido(html, 'name', 'twitter:image');
}

// image del bloque application/ld+json (JSON real, no regex sobre el JSON).
function ldImagen(html) {
  var m = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(html);
  if (!m) return '';
  var obj;
  try {
    obj = JSON.parse(m[1]);
  } catch (e) {
    return '';
  }
  return (obj && obj.image) ? unesc(String(obj.image)) : '';
}

// og:image/twitter:image se emiten ABSOLUTAS (BASE + hero). Los fixtures ya
// son absolutos; esto normaliza por si algun dia no lo fueran.
function normalizarUrl(u) {
  var s = unesc(String(u || '')).trim();
  if (!s) return '';
  if (/^https?:\/\//i.test(s)) return s;
  return 'https://latawel.com' + (s.charAt(0) === '/' ? '' : '/') + s;
}

// --------------------------------------------------------------- fixtures
function destino(extra) {
  var base = {
    id: 9001,
    slug: 'smoke-hero',
    nombre: 'Smoke Hero',
    categoria_slug: 'sitio',
    ciudad: 'Salento',
    region: 'Quindio',
    descripcion: 'Ficha sintetica para el smoke del hero.',
    rating: 0,
    total_resenas: 0,
    lat: 4.5,
    lng: -75.7,
    tags: {},
    foto_hero: '',
    foto: '',
    hero_bg: '',
    creado_en: '2026-01-01T00:00:00.000Z',
    actualizado_en: '2026-01-01T00:00:00.000Z'
  };
  var k;
  if (extra) {
    for (k in extra) {
      if (Object.prototype.hasOwnProperty.call(extra, k)) base[k] = extra[k];
    }
  }
  return base;
}

function curada(url, esHero, orden) {
  return { url: url, es_hero: esHero ? true : false, orden: orden };
}

function comu(url, votos, tipo) {
  return { url: url, votos: votos, foto_type: tipo || 'foto', rating_promedio: 4.5 };
}

function terminaCon(str, suf) {
  return str.length >= suf.length && str.slice(str.length - suf.length) === suf;
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

// --------------------------------------------------------------- ejecucion
var BUILD = cargarBuildHTML();

function render(d, fotos, viajeros, album) {
  return BUILD(d, {}, fotos || [], [], null, [], {}, null, viajeros || [], album || []);
}

var RESULTADOS = [];

function caso(nombre, fn) {
  var fallos = [];
  function ok(cond, detalle) {
    if (!cond) fallos.push(detalle);
  }
  try {
    fn(ok);
  } catch (e) {
    fallos.push('excepcion: ' + (e && e.message ? e.message : String(e)));
  }
  var pasa = fallos.length === 0;
  RESULTADOS.push(pasa);
  console.log((pasa ? 'PASS' : 'FAIL') + ' ' + nombre + (pasa ? '' : ' | ' + fallos.join(' ; ')));
}

// A) 3+ fotos de comunidad votadas: 3 miniaturas de comunidad, votos DESC,
//    ninguna curada en las miniaturas.
caso('A comunidad votos DESC llena el mosaico', function (ok) {
  var d = destino();
  var fotos = [
    curada('https://cdn.test/cur-a1.jpg', false, 1),
    curada('https://cdn.test/cur-a2.jpg', false, 2)
  ];
  var viajeros = [
    comu('https://cdn.test/com-a1.jpg', 9),
    comu('https://cdn.test/com-a2.jpg', 5),
    comu('https://cdn.test/com-a3.jpg', 3),
    comu('https://cdn.test/com-a4.jpg', 1)
  ];
  var html = render(d, fotos, viajeros);
  var th = urlsMiniaturas(html);
  ok(th.length === MAX_THUMBS, 'miniaturas=' + th.length + ' esperado=' + MAX_THUMBS);
  ok(th[0] === 'https://cdn.test/com-a1.jpg', 'thumb0=' + th[0]);
  ok(th[1] === 'https://cdn.test/com-a2.jpg', 'thumb1=' + th[1]);
  ok(th[2] === 'https://cdn.test/com-a3.jpg', 'thumb2=' + th[2]);
  ok(th.join(' ').indexOf('/cur-a') === -1, 'curada se colo en miniaturas: ' + th.join(','));
});

// B) 0 fotos de comunidad: las miniaturas son curadas por es_hero DESC y
//    orden ASC. La curada es_hero:true encabeza la cascada, por lo que es la
//    imagen PRINCIPAL y las miniaturas son el resto en ese mismo orden.
caso('B curadas por es_hero DESC y orden ASC', function (ok) {
  var d = destino();
  var fotos = [
    curada('https://cdn.test/cur-b1.jpg', false, 5),
    curada('https://cdn.test/cur-b2.jpg', true, 2),
    curada('https://cdn.test/cur-b3.jpg', false, 1),
    curada('https://cdn.test/cur-b4.jpg', false, 9)
  ];
  var html = render(d, fotos, [], []);
  var th = urlsMiniaturas(html);
  ok(urlPrincipal(html) === 'https://cdn.test/cur-b2.jpg', 'principal=' + urlPrincipal(html) + ' esperado=cur-b2 (es_hero)');
  ok(th.length === MAX_THUMBS, 'miniaturas=' + th.length + ' esperado=' + MAX_THUMBS);
  ok(th[0] === 'https://cdn.test/cur-b3.jpg', 'thumb0=' + th[0] + ' esperado=cur-b3 (orden 1)');
  ok(th[1] === 'https://cdn.test/cur-b1.jpg', 'thumb1=' + th[1] + ' esperado=cur-b1 (orden 5)');
  ok(th[2] === 'https://cdn.test/cur-b4.jpg', 'thumb2=' + th[2] + ' esperado=cur-b4 (orden 9)');
});

// C) Mezcla: 1 comunidad votada + curadas = 1 comunidad + 2 curadas.
caso('C mezcla 1 comunidad + 2 curadas', function (ok) {
  var d = destino();
  var fotos = [
    curada('https://cdn.test/cur-c1.jpg', false, 1),
    curada('https://cdn.test/cur-c2.jpg', false, 2),
    curada('https://cdn.test/cur-c3.jpg', false, 3),
    curada('https://cdn.test/cur-c4.jpg', false, 4)
  ];
  var viajeros = [comu('https://cdn.test/com-c1.jpg', 2)];
  var html = render(d, fotos, viajeros);
  var th = urlsMiniaturas(html);
  ok(th.length === MAX_THUMBS, 'miniaturas=' + th.length + ' esperado=' + MAX_THUMBS);
  ok(th[0] === 'https://cdn.test/com-c1.jpg', 'thumb0=' + th[0] + ' esperado=comunidad');
  ok(th[1] === 'https://cdn.test/cur-c2.jpg', 'thumb1=' + th[1] + ' esperado=cur-c2');
  ok(th[2] === 'https://cdn.test/cur-c3.jpg', 'thumb2=' + th[2] + ' esperado=cur-c3');
});

// D) Umbral estricto: comunidad con votos 0 no entra aunque haya hueco.
caso('D comunidad con votos 0 excluida (umbral estricto)', function (ok) {
  var d = destino();
  var fotos = [
    curada('https://cdn.test/cur-d1.jpg', false, 1),
    curada('https://cdn.test/cur-d2.jpg', false, 2),
    curada('https://cdn.test/cur-d3.jpg', false, 3)
  ];
  var viajeros = [comu('https://cdn.test/com-d-cero.jpg', 0)];
  var html = render(d, fotos, viajeros);
  var th = urlsMiniaturas(html);
  ok(th.join(' ').indexOf('com-d-cero') === -1, 'comunidad con 0 votos entro: ' + th.join(','));
  ok(th.length === 2, 'miniaturas=' + th.length + ' esperado=2 (sin hueco rellenado)');
  ok(th[0] === 'https://cdn.test/cur-d2.jpg', 'thumb0=' + th[0] + ' esperado=cur-d2');
  ok(th[1] === 'https://cdn.test/cur-d3.jpg', 'thumb1=' + th[1] + ' esperado=cur-d3');
});

// E) Guard de formato: video/audio etiquetados y .mp4 fuera; URL de CDN sin
//    extension se conserva.
caso('E guard de formato (video/audio/mp4 fuera, CDN sin extension entra)', function (ok) {
  var d = destino();
  var fotos = [
    { url: 'https://cdn.test/img-sin-extension', es_hero: false, orden: 1 },
    { url: 'https://cdn.test/clip.mp4', es_hero: false, orden: 2 },
    { url: 'https://cdn.test/marcada-video.jpg', es_hero: false, orden: 3, foto_type: 'video' },
    { url: 'https://cdn.test/marcada-audio.jpg', es_hero: false, orden: 4, media_type: 'audio' }
  ];
  var html = render(d, fotos, [], []);
  var principal = urlPrincipal(html);
  var th = urlsMiniaturas(html);
  var todos = principal + ' ' + th.join(' ');
  ok(principal === 'https://cdn.test/img-sin-extension', 'principal=' + principal + ' esperado=CDN sin extension');
  ok(todos.indexOf('.mp4') === -1, 'mp4 entro al hero: ' + todos);
  ok(todos.indexOf('marcada-video') === -1, 'foto_type:video entro al hero: ' + todos);
  ok(todos.indexOf('marcada-audio') === -1, 'media_type:audio entro al hero: ' + todos);
  ok(th.length === 0, 'miniaturas=' + th.length + ' esperado=0');
});

// F) Foto principal: con d.foto_hero vacio manda la primera curada por
//    es_hero/orden, no el Unsplash generico.
caso('F principal = primera curada, no Unsplash generico', function (ok) {
  var d = destino({ foto_hero: '', foto: '' });
  var fotos = [
    curada('https://cdn.test/cur-f1.jpg', false, 4),
    curada('https://cdn.test/cur-f2.jpg', true, 7)
  ];
  var html = render(d, fotos, [], []);
  var principal = urlPrincipal(html);
  ok(principal === 'https://cdn.test/cur-f2.jpg', 'principal=' + principal + ' esperado=cur-f2');
  ok(principal.indexOf('images.unsplash.com') === -1, 'cayo al Unsplash: ' + principal);
});

// G) Dedupe: la URL de la principal no se repite como miniatura.
caso('G dedupe principal vs miniaturas', function (ok) {
  var d = destino({ foto_hero: 'https://cdn.test/cur-g2.jpg' });
  var fotos = [
    curada('https://cdn.test/cur-g1.jpg', false, 1),
    curada('https://cdn.test/cur-g2.jpg', false, 1),
    curada('https://cdn.test/cur-g3.jpg', false, 3),
    curada('https://cdn.test/cur-g4.jpg', false, 4)
  ];
  var html = render(d, fotos, [], []);
  var principal = urlPrincipal(html);
  var th = urlsMiniaturas(html);
  ok(principal === 'https://cdn.test/cur-g2.jpg', 'principal=' + principal + ' esperado=cur-g2 (foto_hero)');
  ok(th.join(' ').indexOf(principal) === -1, 'principal repetida como miniatura: ' + th.join(','));
  ok(sinDuplicados(th), 'miniaturas con duplicados: ' + th.join(','));
  ok(th.length === MAX_THUMBS, 'miniaturas=' + th.length + ' esperado=' + MAX_THUMBS);
});

// H) Sin fotos: cae al Unsplash por categoria y no emite contenedor vacio.
caso('H sin fotos: Unsplash por categoria y 0 miniaturas', function (ok) {
  var d = destino({ foto_hero: '', foto: '' });
  var html = render(d, [], [], []);
  var principal = urlPrincipal(html);
  ok(principal.indexOf('images.unsplash.com/photo-1501854140801') !== -1, 'principal=' + principal + ' esperado=Unsplash sitio');
  ok(contarMiniaturas(html) === 0, 'miniaturas=' + contarMiniaturas(html) + ' esperado=0');
  ok(!contieneProw(html), 'se emitio <div class="prow"> vacio');
});

// I) Compatibilidad: items string legacy y llamada con menos argumentos.
caso('I compatibilidad legacy (strings y args reducidos)', function (ok) {
  var d = destino();
  var fotos = [
    'https://cdn.test/leg-1.jpg',
    'https://cdn.test/leg-2.jpg',
    'https://cdn.test/leg-3.jpg',
    'https://cdn.test/leg-4.jpg'
  ];
  var html = render(d, fotos, [], []);
  ok(urlPrincipal(html) === 'https://cdn.test/leg-1.jpg', 'principal=' + urlPrincipal(html) + ' esperado=leg-1');
  var th = urlsMiniaturas(html);
  ok(th.length === MAX_THUMBS, 'miniaturas=' + th.length + ' esperado=' + MAX_THUMBS);
  ok(th[0] === 'https://cdn.test/leg-2.jpg', 'thumb0=' + th[0]);
  var corto = BUILD(d, {}, [], []);
  ok(typeof corto === 'string' && corto.length > 1000, 'llamada con 4 args: tipo=' + typeof corto + ' len=' + (corto ? corto.length : 0));
});

// J) Guard de formato en las METAS: un foto_hero de video/audio no debe
//    publicarse como og:image / twitter:image / JSON-LD image. Las tres
//    emisiones comparten el valor resuelto por la cascada del hero.
caso('J1 metas: foto_hero .mp4 cae a la foto valida', function (ok) {
  var d = destino({
    foto_hero: 'https://cdn.test/hero-j1.mp4',
    foto: 'https://cdn.test/foto-j1.jpg'
  });
  var html = render(d, [], [], []);
  var esperado = normalizarUrl('https://cdn.test/foto-j1.jpg');
  var og = normalizarUrl(ogImagen(html));
  var tw = normalizarUrl(twImagen(html));
  var ld = normalizarUrl(ldImagen(html));
  ok(og === esperado, 'og:image=' + og + ' esperado=' + esperado);
  ok(tw === esperado, 'twitter:image=' + tw + ' esperado=' + esperado);
  ok(ld === esperado, 'JSON-LD image=' + ld + ' esperado=' + esperado);
  ok(og.indexOf('.mp4') === -1, 'og:image publico el mp4: ' + og);
});

caso('J2 metas: todo video/audio cae al Unsplash de categoria', function (ok) {
  var d = destino({
    foto_hero: 'https://cdn.test/hero-j2.mp4',
    foto: 'https://cdn.test/foto-j2.mp3'
  });
  var html = render(d, [], [], []);
  var og = normalizarUrl(ogImagen(html));
  var tw = normalizarUrl(twImagen(html));
  var ld = normalizarUrl(ldImagen(html));
  ok(og.indexOf('.mp4') === -1 && og.indexOf('.mp3') === -1, 'og:image con video/audio: ' + og);
  ok(tw.indexOf('.mp4') === -1 && tw.indexOf('.mp3') === -1, 'twitter:image con video/audio: ' + tw);
  ok(ld.indexOf('.mp4') === -1 && ld.indexOf('.mp3') === -1, 'JSON-LD con video/audio: ' + ld);
  ok(og.indexOf('images.unsplash.com/photo-1501854140801') !== -1, 'og:image no cayo al Unsplash de sitio: ' + og);
  ok(og === tw && og === ld, 'metas incoherentes: og=' + og + ' tw=' + tw + ' ld=' + ld);
});

// ---------------------------------------------------------------- cierre
var total = RESULTADOS.length;
var pasan = 0;
var i;
for (i = 0; i < RESULTADOS.length; i++) {
  if (RESULTADOS[i]) pasan++;
}
console.log('RESULTADO: ' + pasan + '/' + total + ' PASS');
process.exit(pasan === total ? 0 : 1);
