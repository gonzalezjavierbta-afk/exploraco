// scripts/seed-medellin-lote6.js
//
// SEED POR LOTE 6 (patron seed-medellin-lote4.js, ADR-100).
//
// Que hace, identico al lote 4:
//   1. Calcula la completitud OFFLINE con lib/completitud.js (normalizarFila +
//      calcular + persistible). Ningun numero se escribe a mano (ADR-099 D4).
//   2. status='published' SOLO si completitud >= 40 (UMBRAL_INTERMEDIO) y pasan
//      las guardas duras: nombre, categoria, ciudad, lead >= 30, coordenadas,
//      foto_hero. Si no -> status='draft' con motivo reportado.
//   3. Escribe las cinco claves pub_* de persistible() y NINGUNA de XP ni de
//      autor: autor_id, pub_xp_estado y pub_geo NO se escriben (ADR-100 D3).
//   4. Deriva region y zona del catalogo geo-ciudades.js (ADR-097), con shim de
//      window porque es un artefacto de navegador. zona fuera de la lista
//      cerrada o vacia -> NULL, jamas '' (un '' provoca 500).
//   5. ciudad en grafia canonica con tilde ('Medell\u00edn'), salida del catalogo.
//   6. Upsert por slug, sin DELETE: unico camino idempotente NO destructivo
//      (api/admin-destinos.js:509-512 borra interacciones con .catch mudo).
//   7. FAQS se persisten DOS veces (destinos_detalles y destinos.tags) porque
//      api/pagina-destino.js:3122 hace det.faqs = tg.faqs cuando
//      destinos_detalles no trae amenidades: sin la copia en tags la seccion
//      FAQ desaparece en produccion.
//
// DIFERENCIA con los lotes 1 a 5: NO se lee ficha/_informe-fotos.json. Ese
// artefacto se regenera y ya provoco una regresion en el lote 3, asi que la
// UNICA fuente de URL es FOTOS_SUGERIDAS[].nombres_archivo_wikimedia[0]
// resuelta con urlMiniatura() de scripts/ejecucion/wikimedia-url.js. El script
// no hace red: la verificacion HEAD 200 vive en su propio verificador (BUG-022)
// y se hizo antes de sembrar.
//
// Uso:
//   node scripts/seed-medellin-lote6.js                 -> DRY (defecto)
//   node scripts/seed-medellin-lote6.js --slug=<slug>   -> DRY de una ficha
//   DATABASE_URL=... node scripts/seed-medellin-lote6.js --write
//   DATABASE_URL=... node scripts/seed-medellin-lote6.js --write --slug=<slug>
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
var ANCHO_FOTO = 1280;
var UMBRAL = C.UMBRAL_INTERMEDIO;
var ZONAS = C.ZONAS;

// Lote 6: 6 fichas validadas (validate_ficha.js PASS 6/6), 31/31 fotos con
// HEAD 200 y 36/36 en contrato segun informe-fichas-medellin.js.
// Los 3 eventos vienen en draft desde la ficha (sin anuncio 2027) y ademas su
// fecha_fin ya paso: la regla de evento caducado de ADR-100 D6 los mantiene en
// draft aunque la completitud sea alta.
var LOTE = [
  'festival-internacional-de-poesia-medellin',
  'desfile-de-autos-clasicos-y-antiguos-medellin',
  'festival-nacional-de-la-trova-medellin',
  'parque-de-los-pies-descalzos-medellin',
  'plaza-de-la-libertad-medellin',
  'parques-del-rio-medellin'
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
// Lectura de la ficha
// ---------------------------------------------------------------------------

function rutaFicha(slug) {
  return path.join(FICHA_DIR, 'ficha-' + slug + '.json');
}

function leerJSON(archivo) {
  return JSON.parse(fs.readFileSync(archivo, 'utf8'));
}

// Unica fuente de URL: FOTOS_SUGERIDAS[].nombres_archivo_wikimedia[0].
// No se consulta ficha/_informe-fotos.json (artefacto regenerable que ya
// provoco una regresion en el lote 3). Sin red: urlMiniatura es pura.
function fotosDeFicha(ficha) {
  var sugeridas = ficha.FOTOS_SUGERIDAS || [];
  var salida = [];
  var usadas = {};
  sugeridas.forEach(function (sug) {
    var nombres = (sug && sug.nombres_archivo_wikimedia) || [];
    var nombre = String(nombres[0] || '').trim();
    if (!nombre) return;
    var url = W.urlMiniatura(nombre, ANCHO_FOTO);
    if (!url || usadas[url]) return;
    usadas[url] = true;
    salida.push({
      url: url,
      caption: String((sug && (sug.caption || sug.tema)) || '').trim(),
      orden: salida.length,
      es_hero: sug && sug.es_hero === true
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
// (BUG-024). Un array/objeto vacio se descarta para no pintar seccion en
// blanco.
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

function construirFicha(slug) {
  var archivo = rutaFicha(slug);
  if (!fs.existsSync(archivo)) throw new Error('no existe ' + path.relative(ROOT, archivo));
  var ficha = leerJSON(archivo);

  var baseFicha = ficha.BASE || {};
  var tags = normalizarTags(ficha.TAGS);
  var faqs = Array.isArray(ficha.FAQS) ? ficha.FAQS : [];
  var fotos = fotosDeFicha(ficha);

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
    // oficial verificable. Los 3 eventos del lote 6 tienen fecha_fin 2026 ya
    // pasada, asi que esta guarda ES la que los mantiene en draft.
    motivo = 'evento caducado (fecha_fin ' + String(tags.fecha_fin) + ')';
  } else if (String(baseFicha.status || '') === 'draft') {
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
// (api/pagina-destino.js:3122) SOBRESCRIBE det.faqs con tags.faqs cuando
// destinos_detalles no trae amenidades. En evento y sitio el seed no siembra
// amenidades, asi que el fallback dispara siempre: sin la copia en tags la
// seccion FAQ desaparece.
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
    await sql(
      'INSERT INTO destinos_detalles (destino_id, faqs, creado_en) VALUES ($1,$2,NOW()) '
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
      await sql(
        'UPDATE destinos_fotos SET caption=$2, orden=$3, es_hero=$4 WHERE id=$5',
        [fila.id, p.caption, p.orden, p.es_hero, ya[0].id]
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
    + ' | cat=' + f.categoria
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

  var fichas = slugs.map(function (slug) {
    return construirFicha(slug);
  });

  console.log('LOTE medellin-lote6: ' + fichas.length + ' ficha(s)');
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
    console.log('[dry] No se ha escrito nada. Para escribir: DATABASE_URL=... node scripts/seed-medellin-lote6.js --write');
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
  CLAVES_TEXTO_JSON: CLAVES_TEXTO_JSON,
  cargarGeo: cargarGeo,
  derivarGeo: derivarGeo,
  normalizarTags: normalizarTags,
  fotosDeFicha: fotosDeFicha,
  tagsPersistidos: tagsPersistidos,
  construirFicha: construirFicha,
  lineaResumen: lineaResumen,
  parseArgs: parseArgs
};
