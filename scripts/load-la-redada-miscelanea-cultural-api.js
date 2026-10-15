// scripts/load-la-redada-miscelanea-cultural-api.js
// Carga la pagina dinamica la-redada-miscelanea-cultural.html a traves de la
// API de admin (/api/admin-destinos), enviando el MISMO payload que genera
// admin.html (_placeToAPI/_buildTagsObj) para la categoria sitio.
//
// IMPORTANTE: el destino nace SIN fotos (foto_hero vacio y PHOTOS = []), por
// eso el payload OMITE foto_hero y fotos_galeria. Enviar una
// fotos_galeria no vacia sin URLs validas hace que api/admin-destinos.js
// responda 400 "Ninguna foto con url valida"; omitida o vacia, el alta
// responde 201.
//
// Uso:
//   node scripts/load-la-redada-miscelanea-cultural-api.js [URL] [TOKEN]
//   URL por defecto: https://latawel.com (dominio CANONICO de produccion de
//     ExploraCO y el que emite sitemap.xml). https://exploraco.vercel.app es
//     solo el alias de Vercel y NO es el canonico.
//   TOKEN por defecto: exploraco12345 (ADMIN_SECRET de desarrollo)
//
// Idempotente: borra la fila existente por slug y la re-crea (DELETE+POST).

const { SLUG, BASE, TAGS, FAQS } = require('./seed-la-redada-miscelanea-cultural.js');

const BASE_URL = process.argv[2] || 'https://latawel.com';
const TOKEN    = process.argv[3] || process.env.ADMIN_SECRET || 'exploraco12345';

function toPlacePayload() {
  return {
    slug:           BASE.slug,
    nombre:         BASE.nombre,
    categoria_slug: BASE.categoria_slug,
    lead:           BASE.lead,
    descripcion:    BASE.descripcion,
    highlight:      BASE.highlight,
    ciudad:         BASE.ciudad,
    region:         BASE.region,
    barrio:         BASE.barrio,
    lat:            BASE.lat,
    lng:            BASE.lng,
    whatsapp:       BASE.whatsapp,
    telefono:       BASE.telefono,
    email:          BASE.email,
    web:            BASE.web,
    instagram:      BASE.instagram,
    precio_desde:   BASE.precio_desde,
    horario:        BASE.horario,
    emoji:          BASE.emoji,
    hero_bg:        BASE.hero_bg,
    // foto_hero y fotos_galeria OMITIDOS a proposito: el destino nace sin fotos.
    tipo:           BASE.tipo,
    capacidad:      BASE.capacidad,
    como_llegar:    BASE.como_llegar,
    status:         'published',
    destacado:      true,
    tags:           TAGS,
    faqs:           FAQS,
    habitaciones:   [],
    amenidades:     [],
    scores:         {}
  };
}

(async function main() {
  var payload = toPlacePayload();

  var auth = { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + TOKEN };

  var list = await fetch(BASE_URL + '/api/admin-destinos?limit=500&status=published', { headers: auth });
  var listJson = await list.json();
  if (!listJson.ok) {
    console.error('ERROR listando: ' + JSON.stringify(listJson));
    process.exit(1);
  }
  var existing = (listJson.data || []).filter(function(d) { return d.slug === SLUG; });

  if (existing.length) {
    var del = await fetch(BASE_URL + '/api/admin-destinos?id=' + existing[0].id, {
      method: 'DELETE', headers: auth
    });
    var delJson = await del.json();
    if (!delJson.ok) {
      console.error('ERROR borrando previo: ' + JSON.stringify(delJson));
      process.exit(1);
    }
    console.log('Previo ' + SLUG + ' eliminado (para re-sembrar limpio)');
  }

  var res = await fetch(BASE_URL + '/api/admin-destinos', {
    method: 'POST',
    headers: auth,
    body: JSON.stringify(payload)
  });

  var json = await res.json();
  if (!res.ok) {
    console.error('ERROR ' + res.status + ': ' + JSON.stringify(json));
    process.exit(1);
  }

  console.log('HTTP ' + res.status + ' - destino ' + json.data.slug + ' (' + json.data.id + ') status=' + json.data.status);
  console.log('Foto hero: omitida (destino sin fotos) | FAQs: ' + FAQS.length);
  console.log('Verifica: ' + BASE_URL + '/' + SLUG + '.html');
})().catch(function(err) {
  console.error('ERROR:', err.message);
  process.exit(1);
});
