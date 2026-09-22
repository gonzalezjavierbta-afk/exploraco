// scripts/load-taller-de-las-moscas-api.js
// Carga la pagina dinamica taller-de-las-moscas.html a traves de la API de
// admin de produccion (/api/admin-destinos), enviando el MISMO payload que
// genera admin.html (_placeToAPI/_buildTagsObj) para la categoria sitio.
//
// Uso:
//   node scripts/load-taller-de-las-moscas-api.js [URL] [TOKEN]
//   URL por defecto: https://exploraco.vercel.app
//   TOKEN por defecto: exploraco12345 (ADMIN_SECRET de desarrollo)
//
// Idempotente: borra el slug canonico y el huerfano taller-delas-moscas-
// bogota-4qfn (creado desde admin con data de hostal incoherente, sin fotos)
// y re-crea el destino limpio (DELETE+POST).

const { SLUG, HERO, PHOTOS, BASE, TAGS, FAQS } = require('./seed-taller-de-las-moscas.js');

const SLUGS_A_LIMPIAR = [SLUG, 'taller-delas-moscas-bogota-4qfn'];

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
    address:        BASE.direccion,
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

  var auth = { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + TOKEN };

  // Listado sin filtro de status para capturar el huerfano en cualquier estado.
  var list = await fetch(BASE_URL + '/api/admin-destinos?limit=500', { headers: auth });
  var listJson = await list.json();
  if (!listJson.ok) {
    console.error('ERROR listando: ' + JSON.stringify(listJson));
    process.exit(1);
  }

  var bySlug = {};
  (listJson.data || []).forEach(function(d) {
    if (!bySlug[d.slug]) bySlug[d.slug] = d;
  });

  for (var i = 0; i < SLUGS_A_LIMPIAR.length; i++) {
    var ex = bySlug[SLUGS_A_LIMPIAR[i]];
    if (!ex) {
      console.log('Sin previo para ' + SLUGS_A_LIMPIAR[i] + ' (no existe)');
      continue;
    }
    var del = await fetch(BASE_URL + '/api/admin-destinos?id=' + ex.id, {
      method: 'DELETE', headers: auth
    });
    var delJson = await del.json();
    if (!delJson.ok) {
      console.error('ERROR borrando previo ' + SLUGS_A_LIMPIAR[i] + ': ' + JSON.stringify(delJson));
      process.exit(1);
    }
    console.log('Previo ' + SLUGS_A_LIMPIAR[i] + ' eliminado (para re-sembrar limpio)');
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

  console.log('OK - destino ' + json.data.slug + ' (' + json.data.id + ') status=' + json.data.status);
  console.log('Fotos galeria: ' + PHOTOS.length + ' | FAQs: ' + FAQS.length);
  console.log('Verifica: ' + BASE_URL + '/' + SLUG + '.html');
})().catch(function(err) {
  console.error('ERROR:', err.message);
  process.exit(1);
});