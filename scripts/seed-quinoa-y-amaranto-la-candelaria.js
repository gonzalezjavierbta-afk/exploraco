// scripts/seed-quinoa-y-amaranto-la-candelaria.js
// Crea (o actualiza) la pagina dinamica quinoa-y-amaranto-la-candelaria.html
// con los datos de Quinoa y Amaranto (Calle 11 # 2-95, La Candelaria, Bogota),
// replicando el patron de scripts/seed-origen-bistro-bogota.js (categoria
// comida, upsert completo, contenido ASCII-safe).
//
// Uso:
//   DATABASE_URL=postgres://... node scripts/seed-quinoa-y-amaranto-la-candelaria.js --dry
//   DATABASE_URL=postgres://... node scripts/seed-quinoa-y-amaranto-la-candelaria.js
//
// Idempotente: re-ejecutable sin efectos secundarios (ON CONFLICT slug).

var neon = null;
function getNeon() {
  if (!neon) neon = require('@neondatabase/serverless').neon;
  return neon;
}

const SLUG = 'quinoa-y-amaranto-la-candelaria';
const HERO = 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/eb/Sopa_de_Quinoa.jpg/960px-Sopa_de_Quinoa.jpg';

const PHOTOS = [
  { url: HERO, caption: 'La sopa de quinoa, el plato que abre el menu casero andino' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/57/Amaranth_Seed.jpg/960px-Amaranth_Seed.jpg', caption: 'Amaranto, uno de los superalimentos andinos de la casa' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/dc/Quinoa_Salad_%285045982815%29.jpg/960px-Quinoa_Salad_%285045982815%29.jpg', caption: 'Ensaladas y guarniciones con quinoa del menu del dia' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b7/Lulo_juice.jpg/960px-Lulo_juice.jpg', caption: 'Jugo natural de lulo con maca' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bf/La_Candelaria%2C_Bogota%2C_Colombia_%285774703616%29.jpg/960px-La_Candelaria%2C_Bogota%2C_Colombia_%285774703616%29.jpg', caption: 'Las calles coloniales de La Candelaria, a pasos del restaurante' }
];

const BASE = {
  slug: SLUG,
  nombre: 'Quinoa y Amaranto',
  categoria_slug: 'comida',
  lead: 'El secreto vegetariano m\u00e1s entra\u00f1able del centro hist\u00f3rico con saz\u00f3n casera e ingredientes andinos.',
  descripcion: 'En pleno coraz\u00f3n colonial de La Candelaria, Quinoa y Amaranto destaca por sus almuerzos caseros preparados cada d\u00eda con productos locales frescos y superalimentos ancestrales.\n\nEs un espacio peque\u00f1o, c\u00e1lido y familiar que atiende principalmente a mediod\u00eda ofreciendo una sopa casera, plato fuerte equilibrado, jugo natural y postre tradicional.\n\nMuy popular entre viajeros internacionales y locales que buscan comida vegetariana nutritiva a un precio muy accesible.',
  highlight: 'Saz\u00f3n Andina \u00b7 Centro Hist\u00f3rico \u00b7 Menu casero vegetariano \u00b7 Ingredientes andinos',
  ciudad: 'Bogot\u00e1',
  region: 'Cundinamarca',
  barrio: 'La Candelaria',
  lat: 4.5975,
  lng: -74.0702,
  whatsapp: '',
  telefono: '',
  email: '',
  web: '',
  instagram: '@quinoayamaranto',
  precio_desde: 'Men\u00fa completo desde $22.000',
  horario: 'Lun-S\u00e1b 12:00 PM - 4:00 PM \u00b7 Domingo cerrado',
  emoji: '\ud83c\udf3e',
  hero_bg: 'linear-gradient(135deg, #8c6239 0%, #111111 100%)',
  foto_hero: HERO,
  tipo: 'Restaurante Casero \u00b7 Andino',
  capacidad: '25 comensales',
  como_llegar: 'A dos cuadras de la Plaza de Bol\u00edvar. Calle 11 # 2-95',
  status: 'published',
  destacado: false
};

const TAGS = {
  tipo_comida: 'Vegetariana Casera / Andina',
  cocina: 'Colombiana Tradicional Vegetal',
  ambiente: 'Hogare\u00f1o, art\u00edstico y tranquilo',
  precio_promedio: '$22.000 - $30.000 por persona',
  terraza: 'No',
  reservas: 'No',
  domicilio: 'No',
  menu_destacado: [
    { nombre: 'Men\u00fa del D\u00eda con Sopa de Quinoa', precio: '$22.000', badge: 'popular' },
    { nombre: 'Croquetas de Amaranto y Lenteja', precio: '$18.000' },
    { nombre: 'Jugo Natural de Lulo con Maca', precio: '$6.000' },
    { nombre: 'Dulce Casero de Papayuela', precio: '$5.000' }
  ],
  opciones_dieta: ['Vegetariano', 'Vegano'],
  horario_detallado: {
    Lunes:     { abre: '12:00', cierra: '16:00' },
    Martes:    { abre: '12:00', cierra: '16:00' },
    Miercoles: { abre: '12:00', cierra: '16:00' },
    Jueves:    { abre: '12:00', cierra: '16:00' },
    Viernes:   { abre: '12:00', cierra: '16:00' },
    Sabado:    { abre: '12:00', cierra: '16:00' },
    Domingo:   { estado: 'Cerrado' }
  },
  domicilio_plataformas: []
};

const FAQS = [
  { pregunta: '\u00bfAbren de noche?', respuesta: 'No, el restaurante solo presta servicio de almuerzo hasta las 4:00 PM.' }
];

module.exports = { SLUG: SLUG, HERO: HERO, PHOTOS: PHOTOS, BASE: BASE, TAGS: TAGS, FAQS: FAQS };

if (require.main !== module) return;

(async function main() {
  var url = process.env.DATABASE_URL || process.argv[2];
  if (!url) {
    console.error('Falta DATABASE_URL.');
    console.error('Uso: DATABASE_URL=postgres://... node scripts/seed-quinoa-y-amaranto-la-candelaria.js [--dry]');
    process.exit(1);
  }

  var sql = getNeon()(url);
  var dry = process.argv.indexOf('--dry') !== -1;

  var existing = await sql('SELECT id, slug FROM destinos WHERE slug=$1 LIMIT 1', [SLUG]);

  if (dry) {
    console.log('[dry-run] ' + (existing.length ? 'UPDATE (fila existe)' : 'INSERT (nueva fila)') + ' para slug=' + SLUG);
    console.log('[dry-run] base:\n' + JSON.stringify(BASE, null, 2));
    console.log('[dry-run] tags (' + Object.keys(TAGS).length + ' claves):\n' + JSON.stringify(TAGS, null, 2));
    console.log('[dry-run] fotos galeria: ' + PHOTOS.length + ' | faqs: ' + FAQS.length);
    return;
  }

  var tagPayload = JSON.stringify(TAGS);
  var inserted = await sql(
    'INSERT INTO destinos ( '
    + 'slug, nombre, categoria_slug, lead, descripcion, highlight, '
    + 'ciudad, region, barrio, lat, lng, '
    + 'whatsapp, telefono, email, web, instagram, '
    + 'precio_desde, horario, emoji, hero_bg, foto_hero, '
    + 'tipo, capacidad, como_llegar, '
    + 'status, destacado, tags, creado_en, actualizado_en '
    + ') VALUES ( '
    + '$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,'
    + '$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,NOW(),NOW() '
    + ') '
    + 'ON CONFLICT (slug) DO UPDATE SET '
    + 'nombre=EXCLUDED.nombre, lead=EXCLUDED.lead, descripcion=EXCLUDED.descripcion, '
    + 'ciudad=EXCLUDED.ciudad, region=EXCLUDED.region, barrio=EXCLUDED.barrio, '
    + 'lat=EXCLUDED.lat, lng=EXCLUDED.lng, web=EXCLUDED.web, instagram=EXCLUDED.instagram, '
    + 'precio_desde=EXCLUDED.precio_desde, horario=EXCLUDED.horario, emoji=EXCLUDED.emoji, '
    + 'hero_bg=EXCLUDED.hero_bg, foto_hero=EXCLUDED.foto_hero, tipo=EXCLUDED.tipo, '
    + 'como_llegar=EXCLUDED.como_llegar, status=EXCLUDED.status, destacado=EXCLUDED.destacado, '
    + 'tags = COALESCE(destinos.tags, \'{}\'::jsonb) || EXCLUDED.tags, '
    + 'actualizado_en = NOW() '
    + 'RETURNING id, slug, nombre, status',
    [
      BASE.slug, BASE.nombre, BASE.categoria_slug, BASE.lead, BASE.descripcion, BASE.highlight,
      BASE.ciudad, BASE.region, BASE.barrio, BASE.lat, BASE.lng,
      BASE.whatsapp, BASE.telefono, BASE.email, BASE.web, BASE.instagram,
      BASE.precio_desde, BASE.horario, BASE.emoji, BASE.hero_bg, BASE.foto_hero,
      BASE.tipo, BASE.capacidad, BASE.como_llegar,
      BASE.status, BASE.destacado, tagPayload
    ]
  );

  var id = inserted[0].id;
  console.log('OK - destino ' + inserted[0].slug + ' (' + id + ') status=' + inserted[0].status);

  if (FAQS.length) {
    await sql(
      'INSERT INTO destinos_detalles (destino_id, faqs, creado_en) VALUES ($1,$2,NOW()) '
      + 'ON CONFLICT (destino_id) DO UPDATE SET faqs=EXCLUDED.faqs',
      [id, JSON.stringify(FAQS)]
    ).catch(function(){});
  }

  for (var i = 0; i < PHOTOS.length; i++) {
    var esHero = (i === 0);
    await sql(
      'INSERT INTO destinos_fotos (destino_id, url, caption, orden, es_hero, creado_en) '
      + 'VALUES ($1,$2,$3,$4,$5,NOW()) ON CONFLICT DO NOTHING',
      [id, PHOTOS[i].url, PHOTOS[i].caption, i, esHero]
    ).catch(function(){});
  }

  console.log('OK - faqs y ' + PHOTOS.length + ' fotos de galeria insertadas.');
  console.log('Verifica en: https://exploraco.co/' + SLUG + '.html (revisa sitemap y /api/destinos).');
})().catch(function(err) {
  console.error('ERROR:', err.message);
  process.exit(1);
});
