// scripts/seed-de-raiz-restaurante-bogota.js
// Crea (o actualiza) la pagina dinamica de-raiz-restaurante-bogota.html con los
// datos de De Raiz - Cocina a Base de Plantas (Calle 69 # 9-08, Zona G /
// Quinta Camacho, Bogota), replicando el patron de
// scripts/seed-origen-bistro-bogota.js (categoria comida, upsert completo,
// contenido ASCII-safe).
//
// Uso:
//   DATABASE_URL=postgres://... node scripts/seed-de-raiz-restaurante-bogota.js --dry
//   DATABASE_URL=postgres://... node scripts/seed-de-raiz-restaurante-bogota.js
//
// Idempotente: re-ejecutable sin efectos secundarios (ON CONFLICT slug).

var neon = null;
function getNeon() {
  if (!neon) neon = require('@neondatabase/serverless').neon;
  return neon;
}

const SLUG = 'de-raiz-restaurante-bogota';
const HERO = 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/af/Vegan_Burger_%285841255378%29.jpg/960px-Vegan_Burger_%285841255378%29.jpg';

const PHOTOS = [
  { url: HERO, caption: 'Hamburguesas y platos 100% vegetales, el sello de De Raiz' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cf/No_Bake_Vegan_Cheezecake_with_Raspberry_Sauce_%283754215964%29.jpg/960px-No_Bake_Vegan_Cheezecake_with_Raspberry_Sauce_%283754215964%29.jpg', caption: 'Cheesecake de cashews y frutos rojos, uno de los postres de la casa' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/eb/Vegan_Cashew_Cream_Cheese_%288529348099%29.jpg/960px-Vegan_Cashew_Cream_Cheese_%288529348099%29.jpg', caption: 'Quesos de frutos secos madurados en casa' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/dd/Pasta_primavera.jpg/960px-Pasta_primavera.jpg', caption: 'Pastas frescas artesanales con vegetales de temporada' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f9/2019_Bogot%C3%A1_-_Barrio_Quinta_Camacho_-_Casas_en_la_calle_69_hacia_la_carrera_8.jpg/960px-2019_Bogot%C3%A1_-_Barrio_Quinta_Camacho_-_Casas_en_la_calle_69_hacia_la_carrera_8.jpg', caption: 'Quinta Camacho, el barrio de casonas que rodea a De Raiz' }
];

const BASE = {
  slug: SLUG,
  nombre: 'De Ra\u00edz - Cocina a Base de Plantas',
  categoria_slug: 'comida',
  lead: 'Pionero de la alta cocina vegana e ingeniosa en Zona G, con platos creativos y ambiente sofisticado.',
  descripcion: 'De Ra\u00edz redefini\u00f3 la propuesta vegetal en Bogot\u00e1 ofreciendo recetas confortables y contempor\u00e1neas 100% libres de ingredientes animales. Su propuesta abarca desde desayunos artesanales hasta cenas maridadas con vinos org\u00e1nicos.\n\nUbicado en una casona conservada de Quinta Camacho / Zona G, cuenta con espacios iluminados, terraza pet-friendly y un mercado de productos bot\u00e1nicos de productores locales.\n\nEntre sus platos insignia destacan sus quesos de frutos secos madurados en casa, pastas frescas artesanales y postres sin az\u00facar refinada.',
  highlight: 'Plant-Based 100% \u00b7 Zona G \u00b7 Terraza pet-friendly \u00b7 Alta cocina vegana',
  ciudad: 'Bogot\u00e1',
  region: 'Cundinamarca',
  barrio: 'Zona G / Quinta Camacho',
  lat: 4.6531,
  lng: -74.0558,
  whatsapp: '',
  telefono: '',
  email: '',
  web: 'https://deraiz.co',
  instagram: '@deraiz_restaurante',
  precio_desde: 'Platos desde $28.000',
  horario: 'Lun-S\u00e1b 8:00 AM - 10:00 PM \u00b7 Dom 8:00 AM - 5:00 PM',
  emoji: '\ud83c\udf31',
  hero_bg: 'linear-gradient(135deg, #1b382b 0%, #111111 100%)',
  foto_hero: HERO,
  tipo: 'Restaurante \u00b7 Plant-Based \u00b7 Caf\u00e9',
  capacidad: '60 comensales',
  como_llegar: 'TransMilenio Estaci\u00f3n Calle 72 o Flores. Calle 69 # 9-08',
  status: 'published',
  destacado: true
};

const TAGS = {
  tipo_comida: 'Vegana / Saludable Gourmet',
  cocina: 'Internacional & Colombia Fusi\u00f3n',
  ambiente: 'Moderno, acogedor, luminoso y pet-friendly',
  precio_promedio: '$45.000 - $70.000 por persona',
  terraza: 'Si',
  reservas: 'Si',
  domicilio: 'Si',
  menu_destacado: [
    { nombre: 'Hamburguesa de Girasol y Setas', precio: '$34.000', badge: 'popular' },
    { nombre: 'Bowl de Quinoa y Camote Asado', precio: '$29.000' },
    { nombre: 'Tacos de Goulash de Setas al Pastor', precio: '$32.000', badge: 'popular' },
    { nombre: 'Cheesecake de Cashews y Frutos Rojos', precio: '$18.000' }
  ],
  opciones_dieta: ['100% Vegano', 'Opciones Sin Gluten', 'Sin Az\u00facar Refinada'],
  horario_detallado: {
    Lunes:     { abre: '08:00', cierra: '22:00' },
    Martes:    { abre: '08:00', cierra: '22:00' },
    Miercoles: { abre: '08:00', cierra: '22:00' },
    Jueves:    { abre: '08:00', cierra: '22:00' },
    Viernes:   { abre: '08:00', cierra: '22:00' },
    Sabado:    { abre: '08:00', cierra: '22:00' },
    Domingo:   { abre: '08:00', cierra: '17:00' }
  },
  domicilio_plataformas: ['Rappi', 'Directo WhatsApp']
};

const FAQS = [
  { pregunta: '\u00bfAceptan mascotas?', respuesta: 'S\u00ed, la zona de terraza y primer piso es totalmente pet-friendly.' },
  { pregunta: '\u00bfTienen opciones para cel\u00edacos?', respuesta: 'S\u00ed, m\u00e1s del 60% de la carta est\u00e1 marcada libre de gluten.' }
];

module.exports = { SLUG: SLUG, HERO: HERO, PHOTOS: PHOTOS, BASE: BASE, TAGS: TAGS, FAQS: FAQS };

if (require.main !== module) return;

(async function main() {
  var url = process.env.DATABASE_URL || process.argv[2];
  if (!url) {
    console.error('Falta DATABASE_URL.');
    console.error('Uso: DATABASE_URL=postgres://... node scripts/seed-de-raiz-restaurante-bogota.js [--dry]');
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
