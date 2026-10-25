// scripts/seed-cartagena-de-indias.js
// Crea (o actualiza) la pagina dinamica cartagena-de-indias.html, categoria
// sitio / subcategoria ciudad (las 12 secciones de
// SITIO_SECCIONES_POR_SUBCATEGORIA.ciudad en api/pagina-destino.js:62).
//
// Los datos NO se re-escriben aqui: se leen de la ficha cruda ya corregida
// (scripts/cartagena-de-indias.ficha.json) y de las fotos verificadas HEAD 200
// (scripts/cartagena-de-indias.fotos.json). Este script solo aplica 4 reglas:
//   1) BASE.foto_hero = url real de la foto con es_hero:true (no "FOTO 1").
//   2) FUENTES: apex https://cartagena.gov.co (el host www da 403 por WAF).
//   3) TAGS.subcategoria = 'ciudad' (gating ADR-016 en el motor).
//   4) TAGS.entradas se conserva intacto: en ciudad el motor no la renderiza
//      (inerte); la tarifa del Castillo ya vive en el texto de atracciones.
//
// Rating: NO se siembran resenas ni se hardcodea rating (ADR-009). La pagina
// queda en 0 hasta que lleguen interacciones reales (api/interacciones.js).
//
// Uso:
//   node scripts/seed-cartagena-de-indias.js            (dry-run, por defecto)
//   DATABASE_URL=postgres://... node scripts/seed-cartagena-de-indias.js --write
//
// Idempotente: ON CONFLICT (slug) DO UPDATE, re-ejecutable sin duplicar.

var neon = null;
function getNeon() {
  if (!neon) neon = require('@neondatabase/serverless').neon;
  return neon;
}

var ficha = require('./cartagena-de-indias.ficha.json');
var fotosJson = require('./cartagena-de-indias.fotos.json');

var SLUG = 'cartagena-de-indias';

// -- Fotos: 5/5 verificadas HEAD 200 por @research-agent (BUG-022) ------------
var PHOTOS = (fotosJson.fotos || []).map(function (f) {
  return { url: String(f.url || ''), caption: String(f.caption || ''), es_hero: !!f.es_hero, status: f.status };
});

var HERO = '';
for (var i = 0; i < PHOTOS.length; i++) {
  if (PHOTOS[i].es_hero) { HERO = PHOTOS[i].url; break; }
}
if (!HERO && PHOTOS.length) HERO = PHOTOS[0].url;

// -- FUENTES: apex del distrito (el host www responde 403 por WAF) -----------
var FUENTES = (ficha.FUENTES || []).map(function (f) {
  var url = String(f.url || '');
  if (url === 'https://www.cartagena.gov.co') url = 'https://cartagena.gov.co';
  return { tipo: f.tipo, url: url, que_respalda: f.que_respalda };
});

var BASE = Object.assign({}, ficha.BASE, {
  slug: SLUG,
  foto_hero: HERO,
  status: 'published',
  destacado: true
});

// ADR-009: el highlight de la ficha abre con un score editorial ("9.6/10 - ...").
// Un numero sobre 10 se lee como rating hardcodeado, asi que se retira el
// marcador y se conserva el texto editorial. El rating real queda en 0 hasta
// que lleguen resenas de api/interacciones.js.
BASE.highlight = String(BASE.highlight || '')
  .replace(/^\s*[0-9]+(?:[.,][0-9]+)?\s*\/\s*10\s*[-:]?\s*/, '')
  .trim();
if (!BASE.highlight) BASE.highlight = 'Patrimonio UNESCO y playas del Caribe';

// tags.subcategoria manda el gating de secciones; fuentes queda como
// trazabilidad editorial dentro del JSONB (el motor no la renderiza).
var TAGS = Object.assign({}, ficha.TAGS, {
  subcategoria: 'ciudad',
  fuentes: FUENTES
});

var FAQS = (ficha.FAQS || []).map(function (f) {
  return { pregunta: String(f.pregunta || ''), respuesta: String(f.respuesta || '') };
});

module.exports = { SLUG: SLUG, HERO: HERO, PHOTOS: PHOTOS, BASE: BASE, TAGS: TAGS, FAQS: FAQS, FUENTES: FUENTES };

if (require.main !== module) return;

(async function main() {
  var dry = process.argv.indexOf('--write') === -1 && process.argv.indexOf('--apply') === -1;

  // Sanidad de insumos (no toca la BD)
  var problems = [];
  if (!HERO || HERO.indexOf('http') !== 0) problems.push('foto_hero no es una URL valida');
  if (PHOTOS.length !== 5) problems.push('se esperaban 5 fotos y hay ' + PHOTOS.length);
  for (var k = 0; k < PHOTOS.length; k++) {
    if (PHOTOS[k].status !== 200) problems.push('foto sin HEAD 200: ' + PHOTOS[k].url);
    if (PHOTOS[k].url.indexOf('%28') === -1 && PHOTOS[k].url.indexOf('(') !== -1) problems.push('URL con parentesis sin escapar');
  }
  if (FAQS.length < 5) problems.push('se esperaban 5 FAQs y hay ' + FAQS.length);
  if (TAGS.subcategoria !== 'ciudad') problems.push('tags.subcategoria debe ser ciudad');
  if (problems.length) {
    console.error('INSUMOS INVALIDOS: ' + problems.join(' | '));
    process.exit(1);
  }

  console.log('slug       : ' + SLUG);
  console.log('categoria  : ' + BASE.categoria_slug + ' / ' + TAGS.subcategoria);
  console.log('foto_hero  : ' + HERO);
  console.log('fotos      : ' + PHOTOS.length + ' (5/5 HEAD 200) | faqs: ' + FAQS.length);
  console.log('tags claves: ' + Object.keys(TAGS).length + ' | fuentes: ' + FUENTES.length);
  console.log('rating     : no se siembra (ADR-009)');

  if (dry) {
    console.log('[dry-run] sin escritura. Re-ejecuta con --write y DATABASE_URL para aplicar.');
    console.log('[dry-run] upsert: INSERT INTO destinos (...) ON CONFLICT (slug) DO UPDATE');
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

  // FAQs
  if (FAQS.length) {
    await sql(
      'INSERT INTO destinos_detalles (destino_id, faqs) VALUES ($1,$2) '
      + 'ON CONFLICT (destino_id) DO UPDATE SET faqs=EXCLUDED.faqs',
      [id, JSON.stringify(FAQS)]
    ).catch(function (e) { console.error('AVISO faqs: ' + e.message); });
  }

  // Galeria: la hero va en destinos.foto_hero, aqui las 4 restantes
  var gal = PHOTOS.filter(function (p) { return p.url !== HERO; });
  for (var g = 0; g < gal.length; g++) {
    await sql(
      'INSERT INTO destinos_fotos (destino_id, url, caption, orden, es_hero, creado_en) '
      + 'VALUES ($1,$2,$3,$4,$5,NOW()) ON CONFLICT DO NOTHING',
      [id, gal[g].url, gal[g].caption, g + 1, false]
    ).catch(function (e) { console.error('AVISO foto: ' + e.message); });
  }

  console.log('OK - faqs (' + FAQS.length + ') y ' + gal.length + ' fotos de galeria.');
  console.log('Siguiente: node scripts/load-cartagena-de-indias-api.js');
})().catch(function (err) {
  console.error('ERROR:', err.message);
  process.exit(1);
});
