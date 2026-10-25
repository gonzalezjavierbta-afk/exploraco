// scripts/smoke_completitud.js -- SMOKE DEL MODULO COMPARTIDO DE COMPLETITUD
// (ADR-099 D3 + D4). Sin red y sin base de datos: 100% en memoria.
//
// Que congela:
//   1. Los 13 fixtures dorados F1-F13 de D3.4, con sus puntos y su tier.
//   2. Monotonia (D3.5): rellenar un campo ausente nunca baja puntos ni tier.
//   3. Paridad de superficies (D4): module.exports y window.ECCompletitud
//      devuelven lo MISMO en los 13 fixtures.
//   4. Regla puntos <=> faltantes de D3.0, campo por campo.
//   5. Formula unica de fotos de D3.1 (hero dentro de la galeria).
//   6. Guardas duras de D3.2 (80 puntos con 2 fotos no-hero = intermedio).
//
// Uso: node scripts/smoke_completitud.js
// Salida: una linea por grupo con N/N y un TOTAL. Sale con codigo != 0 si
// falla cualquier assert.
//
// ASCII-safe (ADR-002): cero bytes > 127, cero backticks.
'use strict';

var fs = require('fs');
var path = require('path');
var vm = require('vm');

var RUTA_MODULO = path.join(__dirname, '..', 'lib', 'completitud.js');
var EC = require(RUTA_MODULO);

var TOTAL = 0;
var OK = 0;
var FALLOS = [];

function ass(cond, msg) {
  TOTAL++;
  if (cond) { OK++; return true; }
  FALLOS.push(msg);
  return false;
}

function grupo(nombre, fn) {
  var t0 = TOTAL;
  var o0 = OK;
  fn();
  var n = TOTAL - t0;
  var o = OK - o0;
  var etiqueta = '[' + nombre + ']';
  var relleno = ' ................................';
  console.log(etiqueta + relleno.slice(0, Math.max(2, 34 - etiqueta.length)) + ' ' + o + '/' + n);
  return { ok: o, n: n };
}

function rep(n) {
  var s = '';
  while (s.length < n) s += 'x';
  return s;
}

function clonar(o) {
  if (Array.isArray(o)) return o.map(clonar);
  if (o && typeof o === 'object') {
    var r = {};
    var k;
    for (k in o) { if (Object.prototype.hasOwnProperty.call(o, k)) r[k] = clonar(o[k]); }
    return r;
  }
  return o;
}

function rango(tier) {
  if (tier === 'completo') return 2;
  if (tier === 'intermedio') return 1;
  return 0;
}

// ---------------------------------------------------------------------------
// Fixtures. Base "ficha completa" de D3.4: identidad 15 + relato 15 +
// ubicacion 10 + contacto 10 + extras 20 = 70 SIN medios.
// ---------------------------------------------------------------------------
function base() {
  return {
    nombre: 'Parque de prueba',
    categoria: 'parque',
    subcategoria: 'naturaleza',
    ciudad: 'Bogota',
    departamento: 'Cundinamarca',
    zona: 'andina',
    descripcion_corta: rep(40),
    descripcion_larga: rep(210),
    lat: 4.6097,
    lng: -74.0817,
    whatsapp: '3001234567',
    fotos_total: 0,
    fotos_no_hero: 0,
    extras: {
      precio: '$20.000',
      horario: 'Lun a Dom 8:00 a 18:00',
      faqs: [{ q: 'Hay parqueadero?', a: 'Si' }],
      amenidades: ['parqueadero'],
      habitaciones: ['doble'],
      como_llegar: 'Transmilenio estacion X',
      temporada: 'Todo el ano',
      dificultad: 'media',
      duracion: '2 horas',
      precio_entrada: '$5.000'
    }
  };
}

function variante(total, noHero, coords, video) {
  var o = base();
  o.fotos_total = total;
  o.fotos_no_hero = noHero;
  if (!coords) { o.lat = null; o.lng = null; }
  if (video) o.video_url = 'https://www.youtube.com/watch?v=abc123';
  return o;
}

// F10 -- blog: 5 fotos + video + email, sin extras. Vale 78 y NO 80 porque
// 'blog' no tiene lista cerrada de subcategorias en ADR-016: la subcategoria
// llega, pero no puntua. Es la prueba de que la lista cerrada manda.
function fixtureF10() {
  var o = base();
  o.categoria = 'blog';
  o.subcategoria = 'naturaleza';
  o.whatsapp = '';
  o.email = 'autor@ejemplo.com';
  o.extras = {};
  o.fotos_total = 5;
  o.fotos_no_hero = 5;
  o.video_url = 'https://www.youtube.com/watch?v=abc123';
  return o;
}

// F11 -- semilla de D7: nombre + categoria + ciudad = 3 + 3 + 3 = 9.
function fixtureF11() {
  return { nombre: 'Semilla', categoria: 'sitio', ciudad: 'Bogota' };
}

// F13 -- hero promovido desde la galeria: 3 en galeria, 1 es hero.
// Se construye con normalizarFila() para ejercitar la formula de D3.1 y no
// solo los conteos ya dados.
function filaF13() {
  return {
    nombre: 'Hero promovido',
    categoria_slug: 'sitio',
    subcategoria: 'naturaleza',
    ciudad: 'Bogota',
    region: 'Cundinamarca',
    zona: 'andina',
    lat: 4.6097,
    lng: -74.0817,
    whatsapp: '3001234567',
    lead: rep(40),
    descripcion: rep(210),
    foto_hero: 'https://cdn.ejemplo/1.jpg',
    tags: {
      precio: '$20.000',
      horario: 'Lun a Dom 8:00 a 18:00',
      faqs: [{ q: 'Hay parqueadero?', a: 'Si' }],
      amenidades: ['parqueadero'],
      habitaciones: ['doble'],
      como_llegar: 'Transmilenio estacion X',
      temporada: 'Todo el ano',
      dificultad: 'media',
      duracion: '2 horas',
      precio_entrada: '$5.000'
    }
  };
}

function fotosF13() {
  return [
    { url: 'https://cdn.ejemplo/1.jpg', es_hero: true },
    { url: 'https://cdn.ejemplo/2.jpg', es_hero: false },
    { url: 'https://cdn.ejemplo/3.jpg', es_hero: false }
  ];
}

var FIXTURES = [
  { id: 'F1', entrada: variante(0, 0, true, false), puntos: 70, tier: 'intermedio' },
  { id: 'F2', entrada: variante(1, 1, true, false), puntos: 80, tier: 'intermedio' },
  { id: 'F3', entrada: variante(2, 2, true, false), puntos: 90, tier: 'intermedio' },
  { id: 'F4', entrada: variante(3, 3, true, false), puntos: 90, tier: 'completo' },
  { id: 'F5', entrada: variante(4, 4, true, false), puntos: 90, tier: 'completo' },
  { id: 'F6', entrada: variante(5, 5, true, false), puntos: 95, tier: 'completo' },
  { id: 'F7', entrada: variante(5, 5, true, true), puntos: 100, tier: 'completo' },
  { id: 'F8', entrada: variante(5, 5, false, true), puntos: 90, tier: 'intermedio' },
  { id: 'F9', entrada: variante(1, 1, true, true), puntos: 85, tier: 'intermedio' },
  { id: 'F10', entrada: fixtureF10(), puntos: 78, tier: 'completo' },
  { id: 'F11', entrada: fixtureF11(), puntos: 9, tier: 'basico' },
  { id: 'F12', entrada: variante(12, 12, true, true), puntos: 100, tier: 'completo' },
  { id: 'F13', entrada: EC.normalizarFila(filaF13(), fotosF13()), puntos: 90, tier: 'intermedio' }
];

// ---------------------------------------------------------------------------
// 1 -- Fixtures dorados
// ---------------------------------------------------------------------------
function testFixtures() {
  var i, fx, r;
  for (i = 0; i < FIXTURES.length; i++) {
    fx = FIXTURES[i];
    r = EC.calcular(fx.entrada);
    ass(r.puntos === fx.puntos,
      fx.id + ': puntos ' + r.puntos + ' != esperado ' + fx.puntos);
    ass(r.tier === fx.tier,
      fx.id + ': tier ' + r.tier + ' != esperado ' + fx.tier);
  }
}

// ---------------------------------------------------------------------------
// 2 -- Monotonia (D3.5). Rellenar un campo ausente no puede bajar nada.
// ---------------------------------------------------------------------------
function rellenar(fx, clave) {
  var o = clonar(fx);
  if (clave === 'coords') { o.lat = 4.6097; o.lng = -74.0817; return o; }
  if (clave === 'foto') {
    o.fotos_total = Math.max(1, o.fotos_total || 0);
    return o;
  }
  if (clave === 'fotos_3') {
    var nh = (o.fotos_no_hero || 0) + 3;
    o.fotos_no_hero = nh;
    o.fotos_total = Math.max(o.fotos_total || 0, nh);
    return o;
  }
  if (clave === 'video') { o.video_url = 'https://youtu.be/abc123'; return o; }
  if (clave === 'contacto') { o.whatsapp = '3001234567'; return o; }
  if (clave === 'descripcion_corta') { o.descripcion_corta = rep(40); return o; }
  if (clave === 'descripcion_larga') { o.descripcion_larga = rep(210); return o; }
  if (clave === 'nombre') { o.nombre = 'Nombre'; return o; }
  if (clave === 'categoria') { o.categoria = 'sitio'; return o; }
  if (clave === 'subcategoria') { o.subcategoria = 'naturaleza'; return o; }
  if (clave === 'ciudad') { o.ciudad = 'Bogota'; return o; }
  if (clave === 'departamento') { o.departamento = 'Cundinamarca'; return o; }
  if (clave === 'zona') { o.zona = 'andina'; return o; }
  if (!o.extras) o.extras = {};
  o.extras[clave] = (clave === 'faqs' || clave === 'amenidades' || clave === 'habitaciones')
    ? ['x'] : 'x';
  return o;
}

function testMonotonia() {
  var i, j, fx, antes, despues, clave;
  for (i = 0; i < FIXTURES.length; i++) {
    fx = FIXTURES[i];
    antes = EC.calcular(fx.entrada);
    var subio = false;
    var bajo = null;
    for (j = 0; j < antes.faltantes.length; j++) {
      clave = antes.faltantes[j];
      despues = EC.calcular(rellenar(fx.entrada, clave));
      if (despues.puntos < antes.puntos || rango(despues.tier) < rango(antes.tier)) {
        bajo = clave;
        break;
      }
      if (despues.puntos > antes.puntos || rango(despues.tier) > rango(antes.tier)) subio = true;
    }
    if (bajo) {
      ass(false, fx.id + ': rellenar "' + bajo + '" BAJO puntos o tier ('
        + antes.puntos + '/' + antes.tier + ')');
    } else {
      ass(true, fx.id + ': monotonia');
    }
  }
}

// ---------------------------------------------------------------------------
// 3 -- Paridad de superficies (D4): CommonJS vs rama navegador.
// Se carga el MISMO fichero en un contexto vm sin 'module', de modo que solo
// se ejecute la rama que escribe en globalThis (window.ECCompletitud).
// ---------------------------------------------------------------------------
function cargarNavegador() {
  var src = fs.readFileSync(RUTA_MODULO, 'utf8');
  var sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(src, sandbox, { filename: 'lib/completitud.js' });
  return sandbox.ECCompletitud;
}

function testParidad() {
  var NAV = cargarNavegador();
  ass(!!NAV && typeof NAV.calcular === 'function',
    'la rama navegador no expuso window.ECCompletitud.calcular');
  ass(typeof EC.calcular === 'function' && typeof EC.persistible === 'function',
    'la rama CommonJS no expone el contrato completo');
  if (!NAV || typeof NAV.calcular !== 'function') return;
  var i, fx, a, b;
  for (i = 0; i < FIXTURES.length; i++) {
    fx = FIXTURES[i];
    a = JSON.stringify(EC.calcular(fx.entrada));
    b = JSON.stringify(NAV.calcular(fx.entrada));
    ass(a === b, fx.id + ': paridad de superficies rota');
  }
}

// ---------------------------------------------------------------------------
// 4 -- Regla puntos <=> faltantes (D3.0), campo por campo.
// ---------------------------------------------------------------------------
function testEquivalencia() {
  var i, j, fx, r, clave, conPuntos, enFaltantes;
  for (i = 0; i < FIXTURES.length; i++) {
    fx = FIXTURES[i];
    r = EC.calcular(fx.entrada);
    var roto = null;
    for (j = 0; j < EC.PUNTUABLES.length; j++) {
      clave = EC.PUNTUABLES[j];
      conPuntos = r.campos[clave] > 0;
      enFaltantes = r.faltantes.indexOf(clave) !== -1;
      if (conPuntos === enFaltantes) { roto = clave; break; }
    }
    if (!roto) {
      // Sin duplicados y sin claves inventadas.
      var vistos = {};
      for (j = 0; j < r.faltantes.length; j++) {
        clave = r.faltantes[j];
        if (vistos[clave]) { roto = clave + ' (duplicada)'; break; }
        vistos[clave] = 1;
        if (EC.ORDEN.indexOf(clave) === -1) { roto = clave + ' (desconocida)'; break; }
      }
    }
    ass(!roto, fx.id + ': puntos <=> faltantes roto en "' + roto + '"');
  }
}

// ---------------------------------------------------------------------------
// 5 -- Formula unica de fotos (D3.1): 5 fotos con 1 = foto_hero -> 4.
// ---------------------------------------------------------------------------
function testFormulaFotos() {
  var fotos = [
    { url: 'https://cdn.ejemplo/a.jpg' },
    { url: 'https://cdn.ejemplo/b.jpg' },
    { url: 'https://cdn.ejemplo/c.jpg' },
    { url: 'https://cdn.ejemplo/d.jpg' },
    { url: 'https://cdn.ejemplo/e.jpg' }
  ];
  var c = EC.contarFotos(fotos, 'https://cdn.ejemplo/c.jpg');
  ass(c.galeria_n === 5 && c.total === 5 && c.no_hero === 4,
    'contarFotos: galeria_n=' + c.galeria_n + ' total=' + c.total
    + ' no_hero=' + c.no_hero + ' (esperado 5/5/4)');

  // El mismo caso por la ruta publica: fila + fotos -> normalizado -> calcular.
  var row = filaF13();
  row.foto_hero = 'https://cdn.ejemplo/a.jpg';
  var norm = EC.normalizarFila(row, fotos);
  ass(norm.fotos_total === 5 && norm.fotos_no_hero === 4,
    'normalizarFila: fotos_total=' + norm.fotos_total
    + ' fotos_no_hero=' + norm.fotos_no_hero + ' (esperado 5/4)');

  // El hero FUERA de la galeria (caso publicar.html: la columna foto_hero se
  // escribe y el hero nunca entra en destinos_fotos) suma 1 al total y 0 al
  // conteo de no-hero.
  var row2 = filaF13();
  row2.foto_hero = 'https://cdn.ejemplo/hero.jpg';
  var norm2 = EC.normalizarFila(row2, fotos.slice(0, 2));
  ass(norm2.fotos_total === 3 && norm2.fotos_no_hero === 2,
    'normalizarFila hero fuera de galeria: total=' + norm2.fotos_total
    + ' no_hero=' + norm2.fotos_no_hero + ' (esperado 3/2)');
}

// ---------------------------------------------------------------------------
// 6 -- Guardas duras (D3.2): 80 puntos con 2 fotos no-hero no son 'completo'.
// ---------------------------------------------------------------------------
function testGuardas() {
  var o = base();
  o.fotos_total = 1;
  o.fotos_no_hero = 2;
  var r = EC.calcular(o);
  ass(r.puntos === 80 && r.tier === 'intermedio' && r.guardas.cumple_completo === false,
    'guardas: ' + r.puntos + ' puntos / ' + r.guardas.fotos_no_hero
    + ' fotos no-hero / tier ' + r.tier + ' (esperado 80 / 2 / intermedio)');

  // Control positivo: con 3 no-hero y los mismos 80 puntos, el techo se levanta.
  var o2 = base();
  o2.fotos_total = 1;
  o2.fotos_no_hero = 3;
  var r2 = EC.calcular(o2);
  ass(r2.tier === 'completo', 'guardas: control positivo deberia ser completo, es '
    + r2.tier);

  // Persistencia (D3.6): cinco claves pub_*, planas y sin tocar el resto de tags.
  var p = EC.persistible(r);
  var claves = Object.keys(p).sort().join(',');
  ass(claves === 'pub_completitud,pub_faltantes,pub_fotos_no_hero,pub_fotos_total,pub_tier',
    'persistible: claves inesperadas -> ' + claves);
  ass(p.pub_completitud === 80 && p.pub_tier === 'intermedio'
    && p.pub_fotos_total === 1 && p.pub_fotos_no_hero === 2,
    'persistible: valores no reflejan el resultado');
}

// ---------------------------------------------------------------------------
// Ejecucion
// ---------------------------------------------------------------------------
console.log('smoke_completitud -- ADR-099 D3/D4 -- version del modulo: ' + EC.VERSION);
console.log('');

var g1 = grupo('1 fixtures F1-F13', testFixtures);
var g2 = grupo('2 monotonia D3.5', testMonotonia);
var g3 = grupo('3 paridad D4', testParidad);
var g4 = grupo('4 puntos <=> faltantes', testEquivalencia);
var g5 = grupo('5 formula fotos D3.1', testFormulaFotos);
var g6 = grupo('6 guardas D3.2 + D3.6', testGuardas);

console.log('');
if (FALLOS.length) {
  console.log('FALLOS (' + FALLOS.length + '):');
  var i;
  for (i = 0; i < FALLOS.length; i++) console.log('  - ' + FALLOS[i]);
  console.log('');
}
console.log('TOTAL ' + OK + '/' + TOTAL + '  ->  ' + (OK === TOTAL ? 'PASS' : 'FAIL'));

process.exitCode = (OK === TOTAL) ? 0 : 1;
