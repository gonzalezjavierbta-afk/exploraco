// scripts/smoke_sin_foto_hero.js
// Smoke determinista del flag de fila tags.sin_foto_hero en
// api/pagina-destino.js (buildHTML).
//
// CONGELA el corte ADITIVO y CONDICIONAL del fallback Unsplash:
//   - fila sitio CON tags.sin_foto_hero=true, foto_hero NULL y 0 fotos:
//     el HTML NO contiene images.unsplash.com, el hero va con hero_bg/CAT_GRAD
//     + emoji y NO se emiten og:image, twitter:image ni JSON-LD image.
//   - la MISMA fila SIN el flag: cascada intacta (Unsplash de categoria y
//     og:image presente) -- regresion.
//   - una fila CON foto_hero y el flag activo sigue usando su foto real.
//   - las 3 formas del flag (true / 'true' / '1') dan el mismo resultado.
//
// Cero red, cero base de datos, cero DATABASE_URL: el motor se evalua en un
// sandbox vm con require stub (mismo patron que scripts/smoke_hero_fallback.js).
// Uso: node scripts/smoke_sin_foto_hero.js
// Exit code != 0 si algun caso falla.
'use strict';

var fs = require('fs');
var path = require('path');
var vm = require('vm');

var ROOT = path.join(__dirname, '..');
var MOTOR = path.join(ROOT, 'api', 'pagina-destino.js');

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
function unesc(s) {
  return String(s)
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

function contar(html, aguja) {
  return (String(html).split(aguja).length - 1);
}

// .psm del hero: style completo (background-image o background solido).
function estiloPrincipal(html) {
  var m = /class="psm" style="([^"]*)"/.exec(html);
  return m ? unesc(m[1]) : '';
}

function metaContenido(html, atributo, clave) {
  var re = new RegExp('<meta ' + atributo + '="' + clave + '" content="([^"]*)"');
  var m = re.exec(html);
  return m ? unesc(m[1]) : '';
}

function ogImagen(html) { return metaContenido(html, 'property', 'og:image'); }
function twImagen(html) { return metaContenido(html, 'name', 'twitter:image'); }

// image del bloque application/ld+json (JSON real, no regex sobre el JSON).
function ldImagen(html) {
  var m = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(html);
  if (!m) return '';
  var obj;
  try { obj = JSON.parse(m[1]); } catch (e) { return ''; }
  return (obj && obj.image) ? unesc(String(obj.image)) : '';
}

function ldTieneClaveImage(html) {
  var m = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(html);
  if (!m) return false;
  var obj;
  try { obj = JSON.parse(m[1]); } catch (e) { return false; }
  return !!(obj && Object.prototype.hasOwnProperty.call(obj, 'image'));
}

// Balance de divs del HTML generado.
function balanceDivs(html) {
  var abre = contar(html, '<div');
  var cierra = contar(html, '</div>');
  return { abre: abre, cierra: cierra, balance: abre - cierra };
}

// --------------------------------------------------------------- fixtures
function destino(extra) {
  var base = {
    id: 9101,
    slug: 'smoke-sin-foto-hero',
    nombre: 'Smoke Sin Foto Hero',
    categoria_slug: 'sitio',
    ciudad: 'Medellin',
    region: 'Antioquia',
    descripcion: 'Ficha sintetica para el smoke del flag sin_foto_hero.',
    emoji: '\uD83C\uDFD9',
    rating: 0,
    total_resenas: 0,
    lat: 6.25,
    lng: -75.56,
    tags: {},
    foto_hero: null,
    foto: null,
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

// --------------------------------------------------------------- ejecucion
var BUILD = cargarBuildHTML();

function render(d, fotos) {
  return BUILD(d, {}, fotos || [], [], null, [], {}, null, [], []);
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
  return pasa;
}

// A) Fila sitio CON el flag, foto_hero NULL y 0 fotos: degrada sin inventar.
caso('A flag activo: 0 Unsplash, 0 og:image, 0 JSON-LD image', function (ok) {
  var d = destino({ tags: { sin_foto_hero: true } });
  var html = render(d, []);
  ok(contar(html, 'images.unsplash.com') === 0, 'unsplash=' + contar(html, 'images.unsplash.com') + ' esperado=0');
  ok(ogImagen(html) === '', 'og:image="' + ogImagen(html) + '" esperado=ausente');
  ok(twImagen(html) === '', 'twitter:image="' + twImagen(html) + '" esperado=ausente');
  ok(contar(html, 'og:image') === 0, 'og:image emitido ' + contar(html, 'og:image') + ' veces');
  ok(contar(html, 'twitter:image') === 0, 'twitter:image emitido ' + contar(html, 'twitter:image') + ' veces');
  ok(!ldTieneClaveImage(html), 'JSON-LD sigue emitiendo image=' + ldImagen(html));
  var est = estiloPrincipal(html);
  ok(est.indexOf('background-image') === -1, '.psm con background-image: ' + est);
  ok(est.indexOf('linear-gradient') !== -1, '.psm sin gradiente solido: ' + est);
  // esc() del motor convierte >127 a entidad numerica: el emoji viaja ASCII.
  var emojiEnt = '&#' + d.emoji.codePointAt(0) + ';';
  ok(html.indexOf('font-size:48px">' + emojiEnt + '<') !== -1,
     'falta el placeholder del hero con el emoji de la fila (entidad ' + emojiEnt + ')');
});

// B) Misma fila SIN el flag: cascada intacta (regresion).
caso('B sin flag: Unsplash de categoria + og:image (intacto)', function (ok) {
  var d = destino({});
  var html = render(d, []);
  ok(contar(html, 'images.unsplash.com') > 0, 'unsplash=' + contar(html, 'images.unsplash.com') + ' esperado>0');
  ok(html.indexOf('images.unsplash.com/photo-1501854140801') !== -1, 'no uso el Unsplash de sitio');
  ok(ogImagen(html).indexOf('images.unsplash.com/photo-1501854140801') !== -1, 'og:image="' + ogImagen(html) + '"');
  ok(ogImagen(html) === twImagen(html), 'og/twitter incoherentes: og=' + ogImagen(html) + ' tw=' + twImagen(html));
  ok(ldImagen(html).indexOf('images.unsplash.com/photo-1501854140801') !== -1, 'JSON-LD image="' + ldImagen(html) + '"');
});

// C) Las 3 formas del flag dan el mismo resultado.
caso('C flag tolerante: true / "true" / "1"', function (ok) {
  var formas = [true, 'true', '1'];
  var i;
  for (i = 0; i < formas.length; i++) {
    var html = render(destino({ tags: { sin_foto_hero: formas[i] } }), []);
    ok(contar(html, 'images.unsplash.com') === 0, 'forma ' + JSON.stringify(formas[i]) + ': unsplash=' + contar(html, 'images.unsplash.com'));
    ok(contar(html, 'og:image') === 0, 'forma ' + JSON.stringify(formas[i]) + ': og:image emitido');
  }
});

// D) Flag inactivo explicito (false / '0' / ausente) no cambia nada.
caso('D flag inactivo: false / "0" / ausente conservan Unsplash', function (ok) {
  var formas = [false, '0', undefined];
  var i;
  for (i = 0; i < formas.length; i++) {
    var html = render(destino({ tags: { sin_foto_hero: formas[i] } }), []);
    ok(contar(html, 'images.unsplash.com') > 0, 'forma ' + JSON.stringify(formas[i]) + ': se corto el Unsplash');
    ok(ogImagen(html) !== '', 'forma ' + JSON.stringify(formas[i]) + ': og:image ausente');
  }
});

// E) Flag activo CON foto real: la foto propia manda (no se toca la cascada).
caso('E flag activo con foto_hero real: usa su foto y su og:image', function (ok) {
  var d = destino({ tags: { sin_foto_hero: true }, foto_hero: 'https://cdn.test/real-hero.jpg' });
  var html = render(d, [{ url: 'https://cdn.test/real-hero.jpg', es_hero: true, orden: 1 }]);
  ok(estiloPrincipal(html).indexOf('https://cdn.test/real-hero.jpg') !== -1, '.psm=' + estiloPrincipal(html));
  ok(ogImagen(html).indexOf('https://cdn.test/real-hero.jpg') !== -1, 'og:image="' + ogImagen(html) + '"');
  ok(ldImagen(html).indexOf('https://cdn.test/real-hero.jpg') !== -1, 'JSON-LD image="' + ldImagen(html) + '"');
  ok(contar(html, 'images.unsplash.com') === 0, 'se colo el Unsplash: ' + contar(html, 'images.unsplash.com'));
});

// F) Balance de divs en el caso con flag.
caso('F balance de divs del HTML con flag', function (ok) {
  var html = render(destino({ tags: { sin_foto_hero: true } }), []);
  var b = balanceDivs(html);
  ok(b.balance === 0, 'divs abre=' + b.abre + ' cierra=' + b.cierra + ' balance=' + b.balance);
  console.log('   balance divs: abre=' + b.abre + ' cierra=' + b.cierra + ' balance=' + b.balance);
});

// G) Regresion cruzada: otra categoria (hostal) sin flag intacta.
caso('G regresion hostal sin flag: Unsplash de hostal', function (ok) {
  var d = destino({ categoria_slug: 'hostal', emoji: '\uD83D\uDECF' });
  var html = render(d, []);
  ok(html.indexOf('images.unsplash.com/photo-1566073771259') !== -1, 'no uso el Unsplash de hostal');
  ok(ogImagen(html) !== '', 'og:image ausente en hostal');
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
