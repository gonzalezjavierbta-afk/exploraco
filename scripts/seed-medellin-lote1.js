// scripts/seed-medellin-lote1.js
//
// SEED POR LOTE (patron seed-eventos-2026-09-08.js / seed-bogota.js), con la
// CONDICION DE ADMISION de ADR-100: nada se publica porque si.
//
// Que hace distinto a los seeds historicos:
//   1. Calcula la completitud OFFLINE con lib/completitud.js (normalizarFila +
//      calcular + persistible). Prohibido escribir un numero a mano: la
//      aritmetica tiene una sola fuente (ADR-099 D4) y el seed la CONSUME.
//   2. Escribe status='published' SOLO si la completitud >= 40
//      (UMBRAL_INTERMEDIO) y pasan las guardas duras: nombre, categoria,
//      ciudad, descripcion_corta >= 30, coordenadas, foto_hero. Por debajo o
//      con una guarda rota -> status='draft' y se reporta en el --dry.
//   3. Escribe las cinco claves pub_* de persistible() y NINGUNA clave de XP
//      ni de autor: autor_id, pub_xp_estado y pub_geo NO se escriben (una fila
//      de seed no tiene autor; ADR-099 D6 + ADR-100 D3).
//   4. Deriva region y zona del catalogo geo-ciudades.js (ADR-097 D1-D3), con
//      shim de window porque es un artefacto de navegador. zona fuera de la
//      lista cerrada o vacia -> NULL, jamas '' (un '' provoca 500).
//   5. ciudad se escribe en grafia canonica con tilde ('Medell\u00edn'), igual
//      que los seeds existentes: dos grafias parten el filtro de ciudad.
//   6. Upsert por slug, sin DELETE: es el unico camino idempotente NO
//      destructivo (api/admin-destinos.js:509-512 borra interacciones con un
//      .catch silencioso; por eso el load-*-api.js queda como via secundaria).
//
// Uso:
//   node scripts/seed-medellin-lote1.js                 -> DRY (defecto)
//   node scripts/seed-medellin-lote1.js --slug=<slug>   -> DRY de una ficha
//   DATABASE_URL=... node scripts/seed-medellin-lote1.js --write
//   DATABASE_URL=... node scripts/seed-medellin-lote1.js --write --slug=<slug>
//
// --dry ES EL DEFECTO: sin bandera el script NO escribe. La bandera que
// habilita escritura es --write (o --apply). --dry siempre gana.
//
// ASCII-safe estricto (ADR-002): 0 bytes > 127, 0 backticks.

'use strict';

var fs = require('fs');
var path = require('path');
var C = require('../lib/completitud.js');
var W = require('./ejecucion/wikimedia-url.js');

var ROOT = path.resolve(__dirname, '..');
var FICHA_DIR = path.join(ROOT, 'ficha');
var INFORME_FOTOS = path.join(FICHA_DIR, '_informe-fotos.json');
var ANCHO_FOTO = 1280;
var UMBRAL = C.UMBRAL_INTERMEDIO;
var ZONAS = C.ZONAS;

// Lote 1 de Medellin: 6 fichas validadas (validate_ficha.js PASS 6/6) con
// 30/30 fotos verificadas HEAD 200 en miniatura de 1280 px.
var LOTE = [
  'comuna-13-san-javier-medellin',
  'feria-de-las-flores-medellin',
  'plaza-botero-medellin',
  'museo-de-antioquia',
  'parque-explora-medellin',
  'jardin-botanico-medellin'
];

// ---------------------------------------------------------------------------
// Geografia derivada (ADR-097 + ADR-100 D4)
// ---------------------------------------------------------------------------

// geo-ciudades.js es un artefacto generado para navegador: hace
// window.GEO_CIUDADES = {...}. En Node se carga con este shim, que es el unico
// modo de consumir el catalogo sin duplicar el mapa de ADR-097 D2.
function cargarGeo() {
  var teniaWindow = Object.prototype.hasOwnProperty.call(global, 'window');
  var anterior = global.window;
  global.window = global;
  try {
    var geo = require(path.join(ROOT, 'geo-ciudades.js'));
    var dados = global.GEO_CIUDADES || (global.window && global.window.GEO_CIUDADES) || geo;
    if (!dados || !Array.isArray(dados.items)) {
      throw new Error('geo-ciudades.js no expone items[]');
    }
    return dados;
  } finally {
    if (teniaWindow) global.window = anterior;
    else delete global.window;
  }
}

var geoCache = null;
var geoIndice = null;

function indiceGeo() {
  if (geoIndice) return geoIndice;
  if (!geoCache) geoCache = cargarGeo();
  var idx = {};
  geoCache.items.forEach(function (fila) {
    if (!Array.isArray(fila) || !fila[0]) return;
    var clave = claveCiudad(fila[0]);
    if (!clave) return;
    if (!idx[clave]) idx[clave] = [];
    idx[clave].push({ ciudad: fila[0], departamento: fila[1], zona: fila[2] });
  });
  geoIndice = idx;
  return idx;
}

function sinTildes(s) {
  var t = String(s === null || s === undefined ? '' : s);
  t = t.toUpperCase();
  if (t.normalize) t = t.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return t.replace(/\s+/g, ' ').trim();
}

function claveCiudad(s) {
  return sinTildes(s);
}

// 'MEDELL\u00cdN' -> 'Medell\u00edn' (grafia canonica del catalogo, con tilde)
function titulo(s) {
  var t = String(s === null || s === undefined ? '' : s).toLowerCase();
  return t.split(' ').map(function (palabra) {
    if (!palabra) return palabra;
    return palabra.charAt(0).toUpperCase() + palabra.slice(1);
  }).join(' ');
}

// Devuelve { ciudad, region, zona, encontrada, candidatos }.
// zona solo sale de la lista cerrada; cualquier otro valor -> null.
function derivarGeo(ciudadTexto) {
  var clave = claveCiudad(ciudadTexto);
  var hits = indiceGeo()[clave] || [];
  if (!hits.length) {
    return { ciudad: '', region: '', zona: null, encontrada: false, candidatos: 0 };
  }
  var hit = hits[0];
  var zona = (hit.zona && ZONAS.indexOf(String(hit.zona)) !== -1) ? String(hit.zona) : null;
  return {
    ciudad: titulo(hit.ciudad),
    region: titulo(hit.departamento),
    zona: zona,
    encontrada: true,
    candidatos: hits.length
  };
}

// ---------------------------------------------------------------------------
// Lectura de la ficha y del informe de fotos
// ---------------------------------------------------------------------------

function rutaFicha(slug) {
  return path.join(FICHA_DIR, 'ficha-' + slug + '.json');
}

function leerJSON(archivo) {
  return JSON.parse(fs.readFileSync(archivo, 'utf8'));
}

// Fuente PRIMARIA de fotos: la ficha (FOTOS_SUGERIDAS). El informe de fotos es
// un OVERRIDE OPCIONAL: si no existe, si esta ilegible o si no indexa el slug,
// las URLs se recomponen con urlMiniatura() (1280 px) y la ficha NUNCA queda en
// 0 fotos. Regresion que esto cierra: el informe se regenero con solo 6 slugs
// (lote 1) y cualquier otro lote caia a 0 fotos y a status='draft'.
var informeCache = null;
var informeAvisado = false;

function cargarInforme() {
  if (informeCache) return informeCache;
  if (!fs.existsSync(INFORME_FOTOS)) {
    if (!informeAvisado) {
      console.log('[aviso] no existe ficha/_informe-fotos.json; URLs de foto recompuestas con urlMiniatura()');
      informeAvisado = true;
    }
    informeCache = { fichas: [] };
    return informeCache;
  }
  try {
    informeCache = leerJSON(INFORME_FOTOS);
  } catch (e) {
    console.log('[aviso] ficha/_informe-fotos.json ilegible: ' + e.message + '; URLs de foto recompuestas con urlMiniatura()');
    informeCache = { fichas: [] };
  }
  return informeCache;
}

function informeDeSlug(slug, informe) {
  var lista = (informe && informe.fichas) || [];
  for (var i = 0; i < lista.length; i++) {
    if (lista[i].slug === slug) return lista[i];
  }
  return null;
}

// URL de foto desde el informe: manda url_real (HEAD 200, BUG-022).
function urlDeInforme(archivo, ancho) {
  if (archivo && archivo.url_real && archivo.status === 200) return String(archivo.url_real);
  var nombre = archivo && archivo.nombre;
  if (nombre) return W.urlMiniatura(nombre, ancho);
  return '';
}

// Primera URL valida entre los nombres de archivo sugeridos por la ficha.
function urlDeSugerida(sug, ancho) {
  var nombres = (sug && sug.nombres_archivo_wikimedia) || [];
  if (!Array.isArray(nombres) || !nombres.length) return '';
  var nombre = String(nombres[0] || '').trim();
  if (!nombre) return '';
  return W.urlMiniatura(nombre, ancho);
}

// Fotos: indice a indice sobre FOTOS_SUGERIDAS (fuente primaria). El informe
// solo aporta url_real cuando indexa el slug y el archivo dio HEAD 200.
function fotosDeFicha(slug, ficha, informe) {
  var info = informeDeSlug(slug, informe);
  var sugeridas = ficha.FOTOS_SUGERIDAS || [];
  var infoFotos = (info && Array.isArray(info.fotos)) ? info.fotos : [];
  var salida = [];
  var usadas = {};

  sugeridas.forEach(function (sug, i) {
    var fo = infoFotos[i] || null;
    var url = '';
    var fuente = 'wikimedia';
    if (fo && Array.isArray(fo.archivos)) {
      for (var j = 0; j < fo.archivos.length && !url; j++) {
        var cand = urlDeInforme(fo.archivos[j], ANCHO_FOTO);
        if (cand) {
          url = cand;
          fuente = 'informe';
        }
      }
    }
    if (!url) url = urlDeSugerida(sug, ANCHO_FOTO);
    if (!url || usadas[url]) return;
    usadas[url] = true;
    salida.push({
      url: url,
      caption: String((sug && (sug.caption || sug.tema)) || (fo && fo.tema) || '').trim(),
      orden: salida.length,
      es_hero: (sug && sug.es_hero === true) || (fo && fo.es_hero === true) || false,
      fuente: fuente
    });
  });

  return salida;
}

// Control anti-regresion del --dry: cuantas fotos se resolvieron y de donde.
// fuente='informe' si al menos una URL vino del informe; si no, 'wikimedia'.
function resumenFotos(fotos) {
  var lista = Array.isArray(fotos) ? fotos : [];
  var nInforme = 0;
  lista.forEach(function (fo) {
    if (fo && fo.fuente === 'informe') nInforme++;
  });
  return 'fotos_resueltas=' + lista.length + ' fuente=' + (nInforme > 0 ? 'informe' : 'wikimedia');
}

// ---------------------------------------------------------------------------
// Normalizacion de tags para el motor de render
// ---------------------------------------------------------------------------

// Claves que api/pagina-destino.js trata como TEXTO y luego JSON.parse:
//   tags.secretos      (linea 1511 + 1516)
//   tags.fauna_flora   (linea 1466, JSON.parse y fallback .split)
// Si se siembran como array JSONB el render revienta (fauna: .split sobre un
// array) o queda vacio. Se guardan como STRING JSON, patron del motor
// (BUG-024) y de los seeds existentes. Un array vacio se descarta para que la
// seccion no se pinte en blanco.
var CLAVES_TEXTO_JSON = ['secretos', 'fauna_flora'];

function normalizarTags(tags) {
  var origen = (tags && typeof tags === 'object') ? tags : {};
  var salida = {};
  Object.keys(origen).forEach(function (k) {
    salida[k] = origen[k];
  });
  CLAVES_TEXTO_JSON.forEach(function (k) {
    var v = salida[k];
    if (v === null || v === undefined) {
      delete salida[k];
      return;
    }
    if (Array.isArray(v)) {
      if (!v.length) { delete salida[k]; return; }
      salida[k] = JSON.stringify(v);
      return;
    }
    if (typeof v === 'object') {
      if (!Object.keys(v).length) { delete salida[k]; return; }
      salida[k] = JSON.stringify(v);
      return;
    }
    if (typeof v === 'string' && !v.trim()) delete salida[k];
  });
  return salida;
}

// ---------------------------------------------------------------------------
// Construccion de la ficha lista para escribir
// ---------------------------------------------------------------------------

function hoyISO() {
  return new Date().toISOString().slice(0, 10);
}

function fechaCaducada(tags) {
  var fin = String((tags && tags.fecha_fin) || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fin)) return false;
  return fin < hoyISO();
}

function esNumero(v) {
  return typeof v === 'number' && isFinite(v);
}

function construirFicha(slug, informe) {
  var archivo = rutaFicha(slug);
  if (!fs.existsSync(archivo)) throw new Error('no existe ' + path.relative(ROOT, archivo));
  var ficha = leerJSON(archivo);
  var inf = informe || cargarInforme();

  var baseFicha = ficha.BASE || {};
  var tags = normalizarTags(ficha.TAGS);
  var faqs = Array.isArray(ficha.FAQS) ? ficha.FAQS : [];
  var fotos = fotosDeFicha(slug, ficha, inf);

  var hero = '';
  for (var i = 0; i < fotos.length; i++) {
    if (fotos[i].es_hero) { hero = fotos[i].url; break; }
  }
  if (!hero && fotos.length) {
    hero = fotos[0].url;
    fotos[0].es_hero = true;
  }

  var geo = derivarGeo(baseFicha.ciudad);
  var ciudad = geo.ciudad || '';
  var region = geo.region || '';
  var zona = geo.zona || null;

  var base = {
    slug: slug,
    nombre: String(baseFicha.nombre || '').trim(),
    categoria_slug: String(baseFicha.categoria_slug || '').trim(),
    lead: String(baseFicha.lead || '').trim(),
    descripcion: String(baseFicha.descripcion || '').trim(),
    highlight: String(baseFicha.highlight || '').trim(),
    ciudad: ciudad,
    region: region,
    barrio: String(baseFicha.barrio || '').trim(),
    zona: zona,
    lat: baseFicha.lat,
    lng: baseFicha.lng,
    whatsapp: String(baseFicha.whatsapp || '').trim(),
    telefono: String(baseFicha.telefono || '').trim(),
    email: String(baseFicha.email || '').trim(),
    web: String(baseFicha.web || '').trim(),
    instagram: String(baseFicha.instagram || '').trim(),
    precio_desde: String(baseFicha.precio_desde || '').trim(),
    horario: String(baseFicha.horario || '').trim(),
    emoji: baseFicha.emoji || '',
    hero_bg: baseFicha.hero_bg || '',
    foto_hero: hero,
    tipo: String(baseFicha.tipo || '').trim(),
    capacidad: String(baseFicha.capacidad || '').trim(),
    como_llegar: String(baseFicha.como_llegar || '').trim(),
    destacado: true
  };

  // -- Completitud OFFLINE: fuente unica de la aritmetica (ADR-099 D4) -------
  // 'faqs' se pasa en la fila porque el seed SI las escribe (destinos_detalles
  // upsert): puntuarlas es fiel a lo que la pagina publicada muestra.
  var fila = {
    nombre: base.nombre,
    categoria_slug: base.categoria_slug,
    ciudad: base.ciudad,
    region: base.region,
    zona: base.zona,
    lat: base.lat,
    lng: base.lng,
    lead: base.lead,
    descripcion: base.descripcion,
    foto_hero: base.foto_hero,
    whatsapp: base.whatsapp,
    telefono: base.telefono,
    email: base.email,
    web: base.web,
    instagram: base.instagram,
    precio_desde: base.precio_desde,
    horario: base.horario,
    faqs: faqs,
    tags: tags
  };
  var normalizada = C.normalizarFila(fila, fotos);
  var resultado = C.calcular(normalizada);
  var pub = C.persistible(resultado);

  // -- Guardas duras (ADR-100 D2) -------------------------------------------
  var guardas = [];
  if (!base.nombre) guardas.push('nombre');
  if (!base.categoria_slug) guardas.push('categoria_slug');
  if (!base.ciudad) guardas.push('ciudad');
  if (!base.lead || base.lead.length < 30) guardas.push('descripcion_corta>=30');
  if (!esNumero(base.lat) || !esNumero(base.lng)) guardas.push('coordenadas');
  if (!base.foto_hero) guardas.push('foto_hero');

  var status = 'draft';
  var motivo = '';
  if (guardas.length) {
    motivo = 'guardas:' + guardas.join(',');
  } else if (pub.pub_completitud < UMBRAL) {
    motivo = 'completitud ' + pub.pub_completitud + ' < ' + UMBRAL;
  } else if (base.categoria_slug === 'evento' && fechaCaducada(tags)) {
    // ADR-100 D6: un evento con fecha_fin pasada queda en draft salvo anuncio
    // oficial verificable. Nada en el repo caduca eventos publicados.
    motivo = 'evento caducado (fecha_fin ' + String(tags.fecha_fin) + ')';
  } else if (String(baseFicha.status || '') === 'draft') {
    // La ficha puede venir ya marcada como borrador (p.ej. fechas 2026 sin
    // anuncio 2027): el seed respeta ese techo y no publica.
    motivo = 'ficha marcada draft';
  } else {
    status = 'published';
  }

  return {
    slug: slug,
    archivo: path.relative(ROOT, archivo),
    categoria: base.categoria_slug,
    subcategoria: String(tags.subcategoria || ''),
    base: base,
    tags: tags,
    faqs: faqs,
    fotos: fotos,
    hero: hero,
    geo: geo,
    completitud: {
      puntos: pub.pub_completitud,
      tier: pub.pub_tier,
      faltantes: pub.pub_faltantes,
      fotos_total: pub.pub_fotos_total,
      fotos_no_hero: pub.pub_fotos_no_hero,
      version: resultado.version,
      bloques: resultado.bloques
    },
    pub: pub,
    guardas: guardas,
    status: status,
    motivo: motivo
  };
}

// ---------------------------------------------------------------------------
// Escritura (upsert por slug, sin DELETE)
// ---------------------------------------------------------------------------

var SQL_UPSERT = 'INSERT INTO destinos ( '
  + 'slug, nombre, categoria_slug, lead, descripcion, highlight, '
  + 'ciudad, region, barrio, zona, lat, lng, '
  + 'whatsapp, telefono, email, web, instagram, '
  + 'precio_desde, horario, emoji, hero_bg, foto_hero, '
  + 'tipo, capacidad, como_llegar, '
  + 'status, destacado, tags, creado_en, actualizado_en '
  + ') VALUES ( '
  + '$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,'
  + '$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,NOW(),NOW() '
  + ') '
  + 'ON CONFLICT (slug) DO UPDATE SET '
  + 'nombre=EXCLUDED.nombre, categoria_slug=EXCLUDED.categoria_slug, '
  + 'lead=EXCLUDED.lead, descripcion=EXCLUDED.descripcion, highlight=EXCLUDED.highlight, '
  + 'ciudad=EXCLUDED.ciudad, region=EXCLUDED.region, barrio=EXCLUDED.barrio, zona=EXCLUDED.zona, '
  + 'lat=EXCLUDED.lat, lng=EXCLUDED.lng, '
  + 'whatsapp=EXCLUDED.whatsapp, telefono=EXCLUDED.telefono, email=EXCLUDED.email, '
  + 'web=EXCLUDED.web, instagram=EXCLUDED.instagram, '
  + 'precio_desde=EXCLUDED.precio_desde, horario=EXCLUDED.horario, '
  + 'emoji=EXCLUDED.emoji, hero_bg=EXCLUDED.hero_bg, foto_hero=EXCLUDED.foto_hero, '
  + 'tipo=EXCLUDED.tipo, capacidad=EXCLUDED.capacidad, como_llegar=EXCLUDED.como_llegar, '
  + 'status=EXCLUDED.status, destacado=EXCLUDED.destacado, '
  + 'tags = COALESCE(destinos.tags, \'{}\'::jsonb) || EXCLUDED.tags, '
  + 'actualizado_en = NOW() '
  + 'RETURNING id, slug, nombre, status, zona';

// Tags que se escriben en destinos.tags. El upsert aplica
// COALESCE(destinos.tags,'{}'::jsonb) || EXCLUDED.tags: merge JSONB, nunca
// reemplazo.
//
// faqs va AQUI ademas de en destinos_detalles porque el motor
// (api/pagina-destino.js lineas 3117-3126) SOBRESCRIBE det.faqs con tags.faqs
// cuando destinos_detalles no trae amenidades (amenidades es la senal de
// hostal). Estos destinos no siembran amenidades, asi que el fallback dispara
// siempre: sin la copia en tags la seccion FAQ desaparece en produccion.
function tagsPersistidos(f) {
  var tags = {};
  Object.keys(f.tags).forEach(function (k) { tags[k] = f.tags[k]; });
  // Cinco claves pub_* de persistible(). NUNCA autor_id, pub_xp_estado ni
  // pub_geo: alta curada sin autor, sin XP (ADR-100 D3).
  tags.pub_tier = f.pub.pub_tier;
  tags.pub_completitud = f.pub.pub_completitud;
  tags.pub_faltantes = f.pub.pub_faltantes;
  tags.pub_fotos_total = f.pub.pub_fotos_total;
  tags.pub_fotos_no_hero = f.pub.pub_fotos_no_hero;
  if (f.faqs.length) tags.faqs = f.faqs;
  return tags;
}

function parametros(f) {
  var b = f.base;
  return [
    b.slug, b.nombre, b.categoria_slug, b.lead, b.descripcion, b.highlight,
    b.ciudad, b.region, b.barrio, b.zona, b.lat, b.lng,
    b.whatsapp, b.telefono, b.email, b.web, b.instagram,
    b.precio_desde, b.horario, b.emoji, b.hero_bg, b.foto_hero,
    b.tipo, b.capacidad, b.como_llegar,
    f.status, b.destacado, JSON.stringify(tagsPersistidos(f))
  ];
}

async function escribirFicha(sql, f) {
  var filas = await sql(SQL_UPSERT, parametros(f));
  var fila = filas[0];

  if (f.faqs.length) {
    // destinos_detalles NO tiene creado_en (medido contra information_schema
    // de produccion): mismo patron que scripts/seed-medellin.js:305-315.
    await sql(
      'INSERT INTO destinos_detalles (destino_id, faqs) VALUES ($1,$2) '
      + 'ON CONFLICT (destino_id) DO UPDATE SET faqs=EXCLUDED.faqs',
      [fila.id, JSON.stringify(f.faqs)]
    );
  }

  // Fotos: idempotente por (destino_id, url) sin asumir un indice unico y sin
  // borrar nada (un DELETE de destinos_fotos dejaria huerfanas las medias).
  for (var i = 0; i < f.fotos.length; i++) {
    var p = f.fotos[i];
    var ya = await sql(
      'SELECT id FROM destinos_fotos WHERE destino_id=$1 AND url=$2 LIMIT 1',
      [fila.id, p.url]
    );
    if (ya.length) {
      // UPDATE medido en produccion: la 2a pasada fallaba con
      // "could not determine data type of parameter $1" porque $1 viajaba en
      // el array sin aparecer en el SQL. Renumerado a $1..$4.
      await sql(
        'UPDATE destinos_fotos SET caption=$1, orden=$2, es_hero=$3 WHERE id=$4',
        [p.caption, p.orden, p.es_hero, ya[0].id]
      );
    } else {
      await sql(
        'INSERT INTO destinos_fotos (destino_id, url, caption, orden, es_hero, creado_en) '
        + 'VALUES ($1,$2,$3,$4,$5,NOW())',
        [fila.id, p.url, p.caption, p.orden, p.es_hero]
      );
    }
  }

  return fila;
}

// ---------------------------------------------------------------------------
// Resumen del --dry
// ---------------------------------------------------------------------------

function lineaResumen(f) {
  var tp = tagsPersistidos(f);
  var nTags = Array.isArray(tp.faqs) ? tp.faqs.length : 0;
  return f.slug
    + ' | status=' + f.status
    + ' | completitud=' + f.completitud.puntos
    + ' tier=' + f.completitud.tier
    + ' | fotos=' + f.fotos.length
    + ' | ' + resumenFotos(f.fotos)
    + ' | ' + f.base.ciudad + ' / ' + f.base.region + ' / ' + (f.base.zona || 'NULL')
    + ' | faqs=' + f.faqs.length + ' (detalles) + ' + nTags + ' (tags)'
    + ' | faltantes=' + (f.completitud.faltantes.length ? f.completitud.faltantes.join(',') : 'ninguno')
    + (f.motivo ? ' | motivo=' + f.motivo : '');
}

function parseArgs(argv) {
  var out = { write: false, dry: false, slug: '' };
  argv.forEach(function (a) {
    if (a === '--dry') out.dry = true;
    if (a === '--write' || a === '--apply') out.write = true;
    if (a.indexOf('--slug=') === 0) out.slug = a.split('=')[1].trim();
  });
  if (out.dry) out.write = false;
  return out;
}

async function main() {
  var args = parseArgs(process.argv.slice(2));
  var slugs = args.slug ? [args.slug] : LOTE.slice();
  var informe = cargarInforme();

  var fichas = slugs.map(function (slug) {
    return construirFicha(slug, informe);
  });

  console.log('LOTE medellin-lote1: ' + fichas.length + ' ficha(s)');
  console.log('MODO: ' + (args.write ? 'WRITE (upsert por slug)' : 'DRY (defecto)') + ' | ancho de foto: ' + ANCHO_FOTO + ' px');
  console.log('UMBRAL_INTERMEDIO=' + UMBRAL + ' | version de completitud=' + C.VERSION);
  console.log('---');
  fichas.forEach(function (f) {
    console.log(lineaResumen(f));
  });
  console.log('---');

  var pub = fichas.filter(function (f) { return f.status === 'published'; }).length;
  var draft = fichas.length - pub;
  console.log('Resumen: published=' + pub + ' draft=' + draft
    + ' | fotos=' + fichas.reduce(function (n, f) { return n + f.fotos.length; }, 0)
    + ' | faqs=' + fichas.reduce(function (n, f) { return n + f.faqs.length; }, 0)
    + ' (destinos_detalles) + '
    + fichas.reduce(function (n, f) {
      var tp = tagsPersistidos(f);
      return n + (Array.isArray(tp.faqs) ? tp.faqs.length : 0);
    }, 0) + ' (destinos.tags)');

  if (!args.write) {
    console.log('[dry] No se ha escrito nada. Para escribir: DATABASE_URL=... node scripts/seed-medellin-lote1.js --write');
    return;
  }

  var url = process.env.DATABASE_URL;
  if (!url) {
    console.error('Falta DATABASE_URL para escribir. Nada se ha tocado.');
    process.exit(1);
  }

  var sql = require('@neondatabase/serverless').neon(url);
  for (var i = 0; i < fichas.length; i++) {
    var fila = await escribirFicha(sql, fichas[i]);
    console.log('OK - ' + fila.slug + ' (' + fila.id + ') status=' + fila.status
      + ' zona=' + (fila.zona || 'NULL') + ' fotos=' + fichas[i].fotos.length
      + ' faqs=' + fichas[i].faqs.length);
  }
  console.log('Listo. Verifica /api/destinos?categoria=<cat> y el sitemap.');
}

if (require.main === module) {
  main().catch(function (err) {
    console.error('ERROR: ' + (err && err.message ? err.message : String(err)));
    process.exit(1);
  });
}

module.exports = {
  LOTE: LOTE,
  ANCHO_FOTO: ANCHO_FOTO,
  UMBRAL: UMBRAL,
  cargarInforme: cargarInforme,
  cargarGeo: cargarGeo,
  derivarGeo: derivarGeo,
  normalizarTags: normalizarTags,
  tagsPersistidos: tagsPersistidos,
  construirFicha: construirFicha,
  lineaResumen: lineaResumen,
  parseArgs: parseArgs
};
