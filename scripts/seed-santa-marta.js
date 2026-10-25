// scripts/seed-santa-marta.js
// Crea (o actualiza) la pagina dinamica santa-marta.html, categoria sitio /
// subcategoria ciudad (las 12 secciones de
// SITIO_SECCIONES_POR_SUBCATEGORIA.ciudad en api/pagina-destino.js:62).
//
// Los datos NO se re-escriben aqui: se leen de la ficha cruda ya validada
// (scripts/santa-marta.ficha.json, PASS con validate_ficha.js --estricto) y de
// las fotos reales verificadas HEAD 200 (scripts/santa-marta.fotos.json, 5/5).
// Este script solo aplica 4 reglas:
//   1) BASE.foto_hero = url real de la foto con es_hero:true (no "FOTO 1").
//   2) TAGS.subcategoria = 'ciudad' (gating ADR-016 en el motor).
//   3) Galeria con las 4 fotos restantes y su credito obligatorio
//      (autor + licencia CC BY-SA) dentro del caption, que es el unico campo de
//      texto que admin-destinos / destinos_fotos conservan.
//   4) TAGS.creditos_fotos deja la trazabilidad de autor/licencia en el JSONB.
//
// Rating: NO se siembran resenas ni se hardcodea rating (ADR-009). La pagina
// queda en 0 hasta que lleguen interacciones reales (api/interacciones.js).
//
// Uso:
//   node scripts/seed-santa-marta.js            (dry-run, por defecto)
//   DATABASE_URL=postgres://... node scripts/seed-santa-marta.js --write
//
// Idempotente: ON CONFLICT (slug) DO UPDATE y galeria re-sembrada en bloque
// (sin duplicar filas al re-ejecutar).

var neon = null;
function getNeon() {
  if (!neon) neon = require('@neondatabase/serverless').neon;
  return neon;
}

var ficha = require('./santa-marta.ficha.json');
var fotosJson = require('./santa-marta.fotos.json');

var SLUG = 'santa-marta';

// -- Fotos: 5 reales de Wikimedia Commons, 5/5 HEAD 200 (BUG-022) ------------
var PHOTOS = (fotosJson.fotos || []).map(function (f) {
  return {
    url: String(f.url || ''),
    caption: String(f.caption || ''),
    es_hero: !!f.es_hero,
    status: f.status,
    autor: String(f.autor || ''),
    licencia: String(f.licencia || '')
  };
});

var HERO = '';
var heroes = 0;
for (var i = 0; i < PHOTOS.length; i++) {
  if (PHOTOS[i].es_hero) { heroes++; if (!HERO) HERO = PHOTOS[i].url; }
}
if (!HERO && PHOTOS.length) HERO = PHOTOS[0].url;

// Credito obligatorio: la galeria viaja con "Foto: autor (licencia)".
function conCredito(p) {
  var cred = p.autor;
  if (p.licencia) cred += (cred ? ' / ' : '') + p.licencia;
  if (!cred) return p.caption;
  return p.caption + (p.caption ? ' - ' : '') + 'Foto: ' + cred;
}

var GALERIA = PHOTOS.filter(function (p) { return p.url !== HERO; }).map(function (p) {
  return { url: p.url, caption: conCredito(p), autor: p.autor, licencia: p.licencia, es_hero: false };
});

// -- FUENTES: trazabilidad editorial dentro del JSONB ------------------------
var FUENTES = (ficha.FUENTES || []).map(function (f) {
  return { tipo: f.tipo, url: String(f.url || ''), que_respalda: f.que_respalda };
});

var BASE = Object.assign({}, ficha.BASE, {
  slug: SLUG,
  foto_hero: HERO,
  status: 'published',
  destacado: true
});

// ADR-009: ningun marcador tipo "9.6/10" puede viajar en el highlight. La ficha
// de Santa Marta no trae score editorial, pero se deja la red de seguridad.
BASE.highlight = String(BASE.highlight || '')
  .replace(/^\s*[0-9]+(?:[.,][0-9]+)?\s*\/\s*10\s*[-:]?\s*/, '')
  .trim();
if (!BASE.highlight) BASE.highlight = 'Bahia, historia colonial y Sierra Nevada';

// tags.subcategoria manda el gating de secciones; fuentes y creditos quedan
// como trazabilidad editorial (el motor no las renderiza).
var TAGS = Object.assign({}, ficha.TAGS, {
  subcategoria: 'ciudad',
  fuentes: FUENTES,
  creditos_fotos: PHOTOS.map(function (p) {
    return { url: p.url, autor: p.autor, licencia: p.licencia, es_hero: p.es_hero };
  })
});

var FAQS = (ficha.FAQS || []).map(function (f) {
  return { pregunta: String(f.pregunta || ''), respuesta: String(f.respuesta || '') };
});

module.exports = {
  SLUG: SLUG, HERO: HERO, PHOTOS: PHOTOS, GALERIA: GALERIA,
  BASE: BASE, TAGS: TAGS, FAQS: FAQS, FUENTES: FUENTES
};

if (require.main !== module) return;

(async function main() {
  var dry = process.argv.indexOf('--write') === -1 && process.argv.indexOf('--apply') === -1;

  // Sanidad de insumos (no toca la BD)
  var problems = [];
  if (!HERO || HERO.indexOf('http') !== 0) problems.push('foto_hero no es una URL valida');
  if (PHOTOS.length !== 5) problems.push('se esperaban 5 fotos y hay ' + PHOTOS.length);
  if (heroes !== 1) problems.push('se esperaba exactamente 1 foto con es_hero y hay ' + heroes);
  for (var k = 0; k < PHOTOS.length; k++) {
    if (PHOTOS[k].status !== 200) problems.push('foto sin HEAD 200: ' + PHOTOS[k].url);
    if (!PHOTOS[k].autor) problems.push('foto sin autor: ' + PHOTOS[k].url);
    if (PHOTOS[k].licencia.indexOf('CC BY-SA') !== 0) problems.push('foto sin licencia CC BY-SA: ' + PHOTOS[k].url);
    if (PHOTOS[k].url.indexOf('%28') === -1 && PHOTOS[k].url.indexOf('(') !== -1) problems.push('URL con parentesis sin escapar');
  }
  if (GALERIA.length !== 4) problems.push('se esperaban 4 fotos de galeria y hay ' + GALERIA.length);
  if (FAQS.length < 5) problems.push('se esperaban 5 FAQs y hay ' + FAQS.length);
  if (TAGS.subcategoria !== 'ciudad') problems.push('tags.subcategoria debe ser ciudad');
  if (problems.length) {
    console.error('INSUMOS INVALIDOS: ' + problems.join(' | '));
    process.exit(1);
  }

  console.log('slug       : ' + SLUG);
  console.log('categoria  : ' + BASE.categoria_slug + ' / ' + TAGS.subcategoria);
  console.log('foto_hero  : ' + HERO);
  console.log('fotos      : ' + PHOTOS.length + ' (5/5 HEAD 200) | galeria: ' + GALERIA.length + ' | faqs: ' + FAQS.length);
  console.log('tags claves: ' + Object.keys(TAGS).length + ' | fuentes: ' + FUENTES.length);
  console.log('creditos   : ' + GALERIA.length + '/4 con autor + licencia CC BY-SA');
  console.log('rating     : no se siembra (ADR-009)');

  if (dry) {
    console.log('[dry-run] sin escritura. Re-ejecuta con --write y DATABASE_URL para aplicar.');
    console.log('[dry-run] upsert: INSERT INTO destinos (...) ON CONFLICT (slug) DO UPDATE');
    console.log('[dry-run] galeria: DELETE por destino_id + 4 INSERT (idempotente)');
    return;
  }

  var url = process.env.DATABASE_URL || '';
  if (!url) {
    console.error('Falta DATABASE_URL para --write.');
    process.exit(1);
  }

  var sql = getNeon()(url);
  var tagPayload = JSON.stringify(TAGS);

  var rows = await sql(
    'INSERT INTO destinos ( '
    + 'slug, nombre, categoria_slug, sintro, lead, descripcion, highlight, '
    + 'ciudad, region, barrio, lat, lng, '
    + 'whatsapp, telefono, email, web, instagram, '
    + 'precio_desde, horario, emoji, hero_bg, foto_hero, '
    + 'tipo, capacidad, como_llegar, '
    + 'status, destacado, tags, creado_en, actualizado_en '
    + ') VALUES ( '
    + '$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,'
    + '$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,NOW(),NOW() '
    + ') '
    + 'ON CONFLICT (slug) DO UPDATE SET '
    + 'nombre=EXCLUDED.nombre, categoria_slug=EXCLUDED.categoria_slug, sintro=EXCLUDED.sintro, '
    + 'lead=EXCLUDED.lead, descripcion=EXCLUDED.descripcion, highlight=EXCLUDED.highlight, '
    + 'ciudad=EXCLUDED.ciudad, region=EXCLUDED.region, barrio=EXCLUDED.barrio, '
    + 'lat=EXCLUDED.lat, lng=EXCLUDED.lng, whatsapp=EXCLUDED.whatsapp, '
    + 'telefono=EXCLUDED.telefono, email=EXCLUDED.email, web=EXCLUDED.web, '
    + 'instagram=EXCLUDED.instagram, precio_desde=EXCLUDED.precio_desde, '
    + 'horario=EXCLUDED.horario, emoji=EXCLUDED.emoji, hero_bg=EXCLUDED.hero_bg, '
    + 'foto_hero=EXCLUDED.foto_hero, tipo=EXCLUDED.tipo, capacidad=EXCLUDED.capacidad, '
    + 'como_llegar=EXCLUDED.como_llegar, status=EXCLUDED.status, '
    + 'destacado=EXCLUDED.destacado, '
    + 'tags = COALESCE(destinos.tags, \'{}\'::jsonb) || EXCLUDED.tags, '
    + 'actualizado_en = NOW() '
    + 'RETURNING id, slug, nombre, status',
    [
      BASE.slug, BASE.nombre, BASE.categoria_slug, BASE.sintro,
      BASE.lead, BASE.descripcion, BASE.highlight,
      BASE.ciudad, BASE.region, BASE.barrio, BASE.lat, BASE.lng,
      BASE.whatsapp, BASE.telefono, BASE.email, BASE.web, BASE.instagram,
      BASE.precio_desde, BASE.horario, BASE.emoji, BASE.hero_bg, BASE.foto_hero,
      BASE.tipo, BASE.capacidad, BASE.como_llegar,
      BASE.status, BASE.destacado, tagPayload
    ]
  );

  var id = rows[0].id;
  console.log('OK - destino ' + rows[0].slug + ' (' + id + ') status=' + rows[0].status);

  // FAQs (idempotente por destino_id)
  if (FAQS.length) {
    await sql(
      'INSERT INTO destinos_detalles (destino_id, faqs) VALUES ($1,$2) '
      + 'ON CONFLICT (destino_id) DO UPDATE SET faqs=EXCLUDED.faqs',
      [id, JSON.stringify(FAQS)]
    ).catch(function (e) { console.error('AVISO faqs: ' + e.message); });
  }

  // Galeria: la hero vive en destinos.foto_hero; aqui las 4 restantes con su
  // credito. Se borra primero el set previo del destino para que re-ejecutar no
  // duplique filas (destinos_fotos no tiene UNIQUE por url).
  await sql('DELETE FROM destinos_fotos WHERE destino_id = $1', [id])
    .catch(function (e) { console.error('AVISO limpieza galeria: ' + e.message); });

  for (var g = 0; g < GALERIA.length; g++) {
    await sql(
      'INSERT INTO destinos_fotos (destino_id, url, caption, orden, es_hero, creado_en) '
      + 'VALUES ($1,$2,$3,$4,$5,NOW())',
      [id, GALERIA[g].url, GALERIA[g].caption, g + 1, false]
    ).catch(function (e) { console.error('AVISO foto: ' + e.message); });
  }

  console.log('OK - faqs (' + FAQS.length + ') y ' + GALERIA.length + ' fotos de galeria.');
  console.log('Siguiente: node scripts/load-santa-marta-api.js');
})().catch(function (err) {
  console.error('ERROR:', err.message);
  process.exit(1);
});
