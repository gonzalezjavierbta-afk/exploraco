// scripts/load-medellin-lote5-api.js
//
// Carga del lote 5 de Medellin a traves de /api/admin-destinos (POST = UPSERT
// POR SLUG, api/admin-destinos.js:246 + :283).
//
// POR QUE NO HAY DELETE (ADR-100 D5 + dato 6 de ADR-100):
//   api/admin-destinos.js:509-512 borra destinos_fotos, destinos_detalles y
//   tambien interacciones del destino con tres .catch(function(){})
//   silenciosos. Un DELETE previo destruye votos, comentarios y media de
//   usuarios reales y el fallo es invisible. Este script NO borra nada.
//
// LIMITE CONOCIDO del endpoint (medido, no supuesto):
//   en conflicto de slug el POST solo refresca nombre y actualizado_en
//   (api/admin-destinos.js:283-285); galeria y detalles si se re-mergean
//   (BUG-079). Por eso la via AUTORITATIVA para un slug existente es el seed
//   (scripts/seed-medellin-lote5.js, upsert con merge de tags), y esta via
//   queda para el alta inicial.
//
// MODO DRY POR DEFECTO: sin --write solo imprime el payload y NO hace red.
// En esta fase NO se ejecuta contra produccion.
//
// Uso:
//   node scripts/load-medellin-lote5-api.js                        -> DRY
//   node scripts/load-medellin-lote5-api.js --slug=<slug>          -> DRY de 1
//   BASE_URL=https://exploraco.vercel.app ADMIN_SECRET=... node scripts/load-medellin-lote5-api.js --write
//
// ASCII-safe estricto (ADR-002): 0 bytes > 127, 0 backticks.

'use strict';

var seed = require('./seed-medellin-lote5.js');

var BASE_URL_DEFECTO = 'https://exploraco.vercel.app';
var TOKEN_DEFECTO = 'exploraco12345';

function args(argv) {
  var out = { write: false, slug: '', base: '', token: '' };
  argv.forEach(function (a) {
    if (a === '--write' || a === '--apply') out.write = true;
    if (a === '--dry') out.write = false;
    if (a.indexOf('--slug=') === 0) out.slug = a.split('=')[1].trim();
    if (a.indexOf('--base=') === 0) out.base = a.split('=')[1].trim();
    if (a.indexOf('--token=') === 0) out.token = a.split('=')[1].trim();
  });
  return out;
}

function tagsPersistibles(f) {
  var tags = {};
  Object.keys(f.tags).forEach(function (k) { tags[k] = f.tags[k]; });
  // Cinco claves de persistible(); NUNCA autor_id, pub_xp_estado ni pub_geo.
  tags.pub_tier = f.pub.pub_tier;
  tags.pub_completitud = f.pub.pub_completitud;
  tags.pub_faltantes = f.pub.pub_faltantes;
  tags.pub_fotos_total = f.pub.pub_fotos_total;
  tags.pub_fotos_no_hero = f.pub.pub_fotos_no_hero;
  // faqs va tambien en tags: api/pagina-destino.js:3122 SOBRESCRIBE det.faqs
  // con tags.faqs cuando destinos_detalles no trae amenidades. Sin la copia en
  // tags la seccion FAQ desaparece. Misma forma que tagsPersistidos() del seed.
  if (f.faqs.length) tags.faqs = f.faqs;
  return tags;
}

function construirPayload(f) {
  var b = f.base;
  return {
    slug: b.slug,
    nombre: b.nombre,
    categoria_slug: b.categoria_slug,
    lead: b.lead,
    descripcion: b.descripcion,
    highlight: b.highlight,
    ciudad: b.ciudad,
    region: b.region,
    barrio: b.barrio,
    zona: b.zona,
    lat: b.lat,
    lng: b.lng,
    whatsapp: b.whatsapp,
    telefono: b.telefono,
    email: b.email,
    web: b.web,
    instagram: b.instagram,
    precio_desde: b.precio_desde,
    horario: b.horario,
    emoji: b.emoji,
    hero_bg: b.hero_bg,
    foto_hero: b.hero,
    fotos_galeria: f.fotos.map(function (p) {
      return { url: p.url, caption: p.caption, orden: p.orden, es_hero: p.es_hero };
    }),
    tipo: b.tipo,
    capacidad: b.capacidad,
    como_llegar: b.como_llegar,
    status: f.status,
    destacado: b.destacado,
    tags: tagsPersistibles(f),
    faqs: f.faqs
  };
}

async function enviar(base, token, payload) {
  var res = await fetch(base + '/api/admin-destinos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
    body: JSON.stringify(payload)
  });
  var texto = await res.text();
  var json = null;
  try { json = JSON.parse(texto); } catch (e) { json = null; }
  return { status: res.status, ok: res.ok, json: json, texto: texto };
}

async function main() {
  var a = args(process.argv.slice(2));
  var base = a.base || process.env.BASE_URL || BASE_URL_DEFECTO;
  var token = a.token || process.env.ADMIN_SECRET || TOKEN_DEFECTO;
  var slugs = a.slug ? [a.slug] : seed.LOTE.slice();

  var informe = seed.cargarInforme();
  var fichas = slugs.map(function (slug) { return seed.construirFicha(slug, informe); });

  console.log('LOTE medellin-lote5 via API: ' + fichas.length + ' ficha(s)');
  console.log('Endpoint: POST ' + base + '/api/admin-destinos (upsert por slug, sin DELETE)');
  console.log('MODO: ' + (a.write ? 'WRITE' : 'DRY (defecto)'));
  if (!a.write) {
    console.log('AVISO: fase LOCAL. No se ejecuta contra produccion y no se envia nada por red.');
  }
  console.log('---');

  var pendientes = 0;
  for (var i = 0; i < fichas.length; i++) {
    var f = fichas[i];
    var payload = construirPayload(f);
    console.log(f.slug + ' | status=' + f.status + ' | completitud=' + f.completitud.puntos
      + ' | fotos=' + payload.fotos_galeria.length + ' | faqs=' + payload.faqs.length
      + ' | zona=' + (payload.zona || 'NULL') + ' | tags=' + Object.keys(payload.tags).length);
    if (!a.write) continue;

    var r = await enviar(base, token, payload);
    if (!r.ok) {
      pendientes++;
      console.log('  FAIL HTTP ' + r.status + ' :: ' + String(r.texto).slice(0, 200));
      continue;
    }
    var d = (r.json && r.json.data) || {};
    console.log('  OK id=' + d.id + ' slug=' + d.slug + ' status=' + d.status);
  }

  console.log('---');
  if (!a.write) {
    console.log('[dry] Nada enviado. Para enviar: ADMIN_SECRET=... node scripts/load-medellin-lote5-api.js --write');
    return;
  }
  if (pendientes) {
    console.log('Fallidas: ' + pendientes);
    process.exit(1);
  }
  console.log('Verifica /' + slugs[0] + '.html, /api/destinos?categoria=<cat> y sitemap.xml');
}

if (require.main === module) {
  main().catch(function (err) {
    console.error('ERROR: ' + (err && err.message ? err.message : String(err)));
    process.exit(1);
  });
}

module.exports = {
  construirPayload: construirPayload,
  tagsPersistibles: tagsPersistibles,
  args: args
};
