// scripts/seed-bioplaza-restaurante-organico-bogota.js
// Crea (o actualiza) la pagina dinamica bioplaza-restaurante-organico-bogota.html
// con los datos de BioPlaza Organico & Vegetariano (Cl. 79B # 7-45, Rosales /
// El Nogal, Bogota), replicando el patron de
// scripts/seed-origen-bistro-bogota.js (categoria comida, upsert completo,
// contenido ASCII-safe).
//
// Uso:
//   DATABASE_URL=postgres://... node scripts/seed-bioplaza-restaurante-organico-bogota.js --dry
//   DATABASE_URL=postgres://... node scripts/seed-bioplaza-restaurante-organico-bogota.js
//
// Idempotente: re-ejecutable sin efectos secundarios (ON CONFLICT slug).

var neon = null;
function getNeon() {
  if (!neon) neon = require('@neondatabase/serverless').neon;
  return neon;
}

const SLUG = 'bioplaza-restaurante-organico-bogota';
const HERO = 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/Fresh_vegetables_and_fruits_at_the_market.jpg/960px-Fresh_vegetables_and_fruits_at_the_market.jpg';

const PHOTOS = [
  { url: HERO, caption: 'Vegetales y frutas frescas, la despensa del ecomercado de BioPlaza' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c0/Organic_Salad_Bowl_%2844474092361%29.jpg/960px-Organic_Salad_Bowl_%2844474092361%29.jpg', caption: 'Bowl de ensalada organica con vegetales de cosecha' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/Organic_-_Vegetables_at_Farmers_Market_%2830297519628%29.jpg/960px-Organic_-_Vegetables_at_Farmers_Market_%2830297519628%29.jpg', caption: 'Vegetales agroecologicos de fincas campesinas de la Sabana' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/64/Healthy_quinoa_salad_with_dried_fruit.jpg/960px-Healthy_quinoa_salad_with_dried_fruit.jpg', caption: 'Ensalada de quinoa y frutos secos del menu' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/76/Blueberry_muffin_-_Cosy_Cottage_2025-04-21.jpg/960px-Blueberry_muffin_-_Cosy_Cottage_2025-04-21.jpg', caption: 'Reposteria integral recien horneada' }
];

const BASE = {
  slug: SLUG,
  nombre: 'BioPlaza Org\u00e1nico & Vegetariano',
  categoria_slug: 'comida',
  lead: 'El mercado y restaurante org\u00e1nico referente de Rosales con cosechas limpias y men\u00fas balansados.',
  descripcion: 'BioPlaza pionero desde hace m\u00e1s de dos d\u00e9cadas en promover la alimentaci\u00f3n consciente en Bogot\u00e1. Integra en un solo lugar restaurante vegetariano/vegano y ecomercado especializado.\n\nSus platos se preparan con vegetales agroecol\u00f3gicos certificados provenientes de fincas campesinas cercanas a la Sabana de Bogot\u00e1.\n\nOfrece men\u00fas ejecutivos diarios, reposter\u00eda integral, caf\u00e9 org\u00e1nico y zumos prensados en fr\u00edo.',
  highlight: 'Mercado & Bistro \u00b7 100% Org\u00e1nico \u00b7 Vegetales agroecol\u00f3gicos \u00b7 Rosales',
  ciudad: 'Bogot\u00e1',
  region: 'Cundinamarca',
  barrio: 'Rosales / El Nogal',
  lat: 4.6612,
  lng: -74.0531,
  whatsapp: '',
  telefono: '',
  email: '',
  web: 'https://www.bioplaza.com.co',
  instagram: '@bioplazaorganico',
  precio_desde: 'Men\u00fa del d\u00eda desde $30.000',
  horario: 'Lun-S\u00e1b 8:00 AM - 8:00 PM \u00b7 Dom 9:00 AM - 5:00 PM',
  emoji: '\ud83e\udd57',
  hero_bg: 'linear-gradient(135deg, #2d5a27 0%, #111111 100%)',
  foto_hero: HERO,
  tipo: 'Restaurante \u00b7 Mercado Org\u00e1nico',
  capacidad: '45 comensales',
  como_llegar: 'Carrera 7 con Calle 79B. Cl. 79B # 7-45',
  status: 'published',
  destacado: false
};

const TAGS = {
  tipo_comida: 'Vegetariana / Org\u00e1nica',
  cocina: 'Saludable / Consciente',
  ambiente: 'R\u00fastico, fresco y m\u00e1s tradicional',
  precio_promedio: '$35.000 - $55.000 por persona',
  terraza: 'Si',
  reservas: 'No',
  domicilio: 'Si',
  menu_destacado: [
    { nombre: 'Men\u00fa del D\u00eda Agroecol\u00f3gico', precio: '$32.000', badge: 'popular' },
    { nombre: 'Lasa\u00f1a de Berenjena y Tofu', precio: '$36.000' },
    { nombre: 'Sopa de Auyama y Curcuma', precio: '$18.000' },
    { nombre: 'Muffin Integral de Ar\u00e1ndanos', precio: '$10.000' }
  ],
  opciones_dieta: ['Vegetariano', 'Vegano', 'Sin Gluten', 'Sin Lactosa'],
  horario_detallado: {
    Lunes:     { abre: '08:00', cierra: '20:00' },
    Martes:    { abre: '08:00', cierra: '20:00' },
    Miercoles: { abre: '08:00', cierra: '20:00' },
    Jueves:    { abre: '08:00', cierra: '20:00' },
    Viernes:   { abre: '08:00', cierra: '20:00' },
    Sabado:    { abre: '08:00', cierra: '20:00' },
    Domingo:   { abre: '09:00', cierra: '17:00' }
  },
  domicilio_plataformas: ['Rappi', 'Domicilios Propios']
};

const FAQS = [
  { pregunta: '\u00bfVenden insumos para cocinar en casa?', respuesta: 'S\u00ed, cuentan con ecomercado completo de granos, frutas y verduras.' }
];

module.exports = { SLUG: SLUG, HERO: HERO, PHOTOS: PHOTOS, BASE: BASE, TAGS: TAGS, FAQS: FAQS };

if (require.main !== module) return;

(async function main() {
  var url = process.env.DATABASE_URL || process.argv[2];
  if (!url) {
    console.error('Falta DATABASE_URL.');
    console.error('Uso: DATABASE_URL=postgres://... node scripts/seed-bioplaza-restaurante-organico-bogota.js [--dry]');
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
