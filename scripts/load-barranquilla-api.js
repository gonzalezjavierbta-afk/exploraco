// scripts/load-barranquilla-api.js
// Carga la pagina dinamica barranquilla.html en produccion a traves de
// /api/admin-destinos, enviando el MISMO payload que genera admin.html
// (_placeToAPI/_buildTagsObj) para categoria sitio / subcategoria ciudad.
//
// Uso:
//   node scripts/load-barranquilla-api.js            (dry-run, por defecto)
//   node scripts/load-barranquilla-api.js --write [URL] [TOKEN]
//   URL por defecto  : https://exploraco.vercel.app
//   TOKEN por defecto: process.env.ADMIN_SECRET || exploraco12345
//
// Idempotente: DELETE previo por slug + POST nuevo (regla "si ya existe en BD,
// borrar y crear la nueva").

const { SLUG, HERO, GALERIA, BASE, TAGS, FAQS } = require('./seed-barranquilla.js');

const argv = process.argv.slice(2);
const DRY = argv.indexOf('--write') === -1;
const pos = argv.filter(function (a) { return a.indexOf('--') !== 0; });
const BASE_URL = pos[0] || 'https://exploraco.vercel.app';
const TOKEN = pos[1] || process.env.ADMIN_SECRET || 'exploraco12345';

function toPlacePayload() {
  var galeria = GALERIA.map(function (p, i) {
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

  console.log('destino : ' + payload.slug + ' (' + payload.categoria_slug + '/' + TAGS.subcategoria + ')');
  console.log('hero    : ' + payload.foto_hero);
  console.log('galeria : ' + payload.fotos_galeria.length + ' | faqs: ' + payload.faqs.length + ' | tags: ' + Object.keys(payload.tags).length);
  console.log('api     : ' + BASE_URL + '/api/admin-destinos');

  if (DRY) {
    console.log('[dry-run] sin red. Re-ejecuta con --write para DELETE+POST.');
    return;
  }

  // 1) Buscar fila existente por slug y borrarla (idempotencia total)
  var list = await fetch(BASE_URL + '/api/admin-destinos?limit=500&status=published', { headers: auth });
  var listJson = await list.json();
  if (!listJson.ok) {
    console.error('ERROR listando: ' + JSON.stringify(listJson));
    process.exit(1);
  }
  var existing = (listJson.data || []).filter(function (d) { return d.slug === SLUG; });

  if (existing.length) {
    var del = await fetch(BASE_URL + '/api/admin-destinos?id=' + existing[0].id, { method: 'DELETE', headers: auth });
    var delJson = await del.json();
    if (!delJson.ok) {
      console.error('ERROR borrando previo: ' + JSON.stringify(delJson));
      process.exit(1);
    }
    console.log('Previo ' + SLUG + ' eliminado (re-siembra limpia)');
  }

  // 2) Crear desde cero
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
  console.log('Verifica: ' + BASE_URL + '/' + SLUG + '.html');
})().catch(function (err) {
  console.error('ERROR:', err.message);
  process.exit(1);
});
