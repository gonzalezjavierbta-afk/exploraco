// scripts/load-palomino-api.js
// Carga la pagina dinamica /palomino.html a traves de la API de admin de
// produccion (/api/admin-destinos), enviando el MISMO payload que genera
// admin.html (_placeToAPI/_buildTagsObj) para la categoria sitio.
//
// Uso:
//   node scripts/load-palomino-api.js [URL] [TOKEN]
//   URL por defecto: https://exploraco.vercel.app
//   TOKEN por defecto: exploraco12345
//
// Idempotente: borra la fila existente por slug y la re-crea (DELETE + POST).
// Nota: admin-destinos hace ON CONFLICT (slug) DO UPDATE SET nombre/actualizado_en
// unicamente, asi que el DELETE previo es obligatorio para re-sembrar limpio.

var seed = require('./seed-palomino.js');

var SLUG = seed.SLUG;
var HERO = seed.HERO;
var PHOTOS = seed.PHOTOS;
var BASE = seed.BASE;
var TAGS = seed.TAGS;
var FAQS = seed.FAQS;

var BASE_URL = process.argv[2] || 'https://exploraco.vercel.app';
var TOKEN = process.argv[3] || process.env.ADMIN_SECRET || 'exploraco12345';

function toPlacePayload() {
  var galeria = PHOTOS.slice(1).map(function (p, i) {
    return { url: p.url, caption: p.caption, orden: i + 1 };
  });
  return {
    slug: BASE.slug,
    nombre: BASE.nombre,
    categoria_slug: BASE.categoria_slug,
    sintro: BASE.sintro,
    lead: BASE.lead,
    descripcion: BASE.descripcion,
    highlight: BASE.highlight,
    ciudad: BASE.ciudad,
    region: BASE.region,
    barrio: BASE.barrio,
    zona: BASE.zona,
    lat: BASE.lat,
    lng: BASE.lng,
    whatsapp: BASE.whatsapp,
    telefono: BASE.telefono,
    email: BASE.email,
    web: BASE.web,
    instagram: BASE.instagram,
    precio_desde: BASE.precio_desde,
    horario: BASE.horario,
    emoji: BASE.emoji,
    hero_bg: BASE.hero_bg,
    foto_hero: HERO,
    fotos_galeria: galeria,
    tipo: BASE.tipo,
    capacidad: BASE.capacidad,
    como_llegar: BASE.como_llegar,
    status: 'published',
    destacado: true,
    tags: TAGS,
    faqs: FAQS,
    habitaciones: [],
    amenidades: [],
    scores: {}
  };
}

(async function main() {
  var payload = toPlacePayload();
  var auth = { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + TOKEN };

  // 1) Borrar la fila previa por slug (idempotencia total).
  var list = await fetch(BASE_URL + '/api/admin-destinos?limit=500&status=published', { headers: auth });
  var listJson = await list.json();
  if (!listJson.ok) {
    console.error('ERROR listando: ' + JSON.stringify(listJson));
    process.exit(1);
  }
  var existing = (listJson.data || []).filter(function (d) { return d.slug === SLUG; });

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

  // 2) Crear desde cero.
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
  console.log('Fotos galeria: ' + (PHOTOS.length - 1) + ' | FAQs: ' + FAQS.length + ' | tags: ' + Object.keys(TAGS).length);
  console.log('Verifica: ' + BASE_URL + '/' + SLUG + '.html');
})().catch(function (err) {
  console.error('ERROR:', err.message);
  process.exit(1);
});
