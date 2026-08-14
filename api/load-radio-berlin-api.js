// api/load-radio-berlin-api.js
// Carga la pagina dinamica radio-berlin.html a traves de la API de admin
// de produccion (/api/admin-destinos), enviando el MISMO payload que
// genera admin.html (_placeToAPI/_buildTagsObj) para la categoria sitio.
//
// Uso:
//   node api/load-radio-berlin-api.js [URL] [TOKEN]
//   URL por defecto: https://exploraco.vercel.app
//   TOKEN por defecto: exploraco12345 (ADMIN_SECRET de desarrollo)
//
// Idempotente: borra la fila existente por slug y la re-crea (DELETE+POST),
// cumpliendo la regla "si ya existe en BD, borrar y crear la nueva".

const { SLUG, HERO, PHOTOS, BASE, TAGS, FAQS } = require('./seed-radio-berlin.js');

const BASE_URL = process.argv[2] || 'https://exploraco.vercel.app';
const TOKEN    = process.argv[3] || process.env.ADMIN_SECRET || 'exploraco12345';

function toPlacePayload() {
  var galeria = PHOTOS.slice(1).map(function(p, i) {
    return { url: p.url, caption: p.caption, orden: i + 1 };
  });
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
    foto_hero:      HERO,
    fotos_galeria:  galeria,
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

  // 1) Buscar fila existente por slug para borrarla (idempotencia total:
  //    el POST solo actualiza nombre en conflicto, asi que re-creamos).
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

  // 2) Crear desde cero (mismo payload que admin.html)
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

  console.log('OK - destino ' + json.data.slug + ' (' + json.data.id + ') status=' + json.data.status);
  console.log('Fotos galeria: ' + PHOTOS.length + ' | FAQs: ' + FAQS.length);
  console.log('Verifica: ' + BASE_URL + '/' + SLUG + '.html');
})().catch(function(err) {
  console.error('ERROR:', err.message);
  process.exit(1);
});
