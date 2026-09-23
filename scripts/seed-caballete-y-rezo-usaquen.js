// scripts/seed-caballete-y-rezo-usaquen.js
// Crea (o actualiza) la pagina dinamica caballete-y-rezo-usaquen.html con
// los datos de Caballete & Rezo - Veggie & Vegan Burger Bar (Usaquen, Bogota),
// replicando el patron de scripts/seed-origen-bistro-bogota.js (categoria
// comida, upsert completo, contenido ASCII-safe).
//
// Uso:
//   DATABASE_URL=postgres://... node scripts/seed-caballete-y-rezo-usaquen.js --dry
//   DATABASE_URL=postgres://... node scripts/seed-caballete-y-rezo-usaquen.js
//
// Idempotente: re-ejecutable sin efectos secundarios (ON CONFLICT slug).

var neon = null;
function getNeon() {
  if (!neon) neon = require('@neondatabase/serverless').neon;
  return neon;
}

const SLUG = 'caballete-y-rezo-usaquen';
const HERO = 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a1/Veggie_Burger_and_fries_%28July_2022%29.jpg/960px-Veggie_Burger_and_fries_%28July_2022%29.jpg';

const PHOTOS = [
  { url: HERO, caption: 'Hamburguesa vegetal con papas, el clasico del burger bar' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/TeKu_beerglass_with_Belgian_craft_beer.png/960px-TeKu_beerglass_with_Belgian_craft_beer.png', caption: 'Cerveza artesanal local, maridaje ideal para las burgers' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/22/Dargett_Craft_Beer_%281%29.jpg/960px-Dargett_Craft_Beer_%281%29.jpg', caption: 'Seleccion de cervezas artesanales de la casa' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/Fancy_Veggie_Burger_and_Fries_-_Joe%27s_Burger_House_2024-07-07.jpg/960px-Fancy_Veggie_Burger_and_Fries_-_Joe%27s_Burger_House_2024-07-07.jpg', caption: 'Hamburguesa veggie con papas a la francesa' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/79/Estacion_de_usaquen_Bogota%2CColombia.JPG/960px-Estacion_de_usaquen_Bogota%2CColombia.JPG', caption: 'Usaquen, el barrio colonial que rodea al local' }
];

const BASE = {
  slug: SLUG,
  nombre: 'Caballete & Rezo - Veggie & Vegan Burger Bar',
  categoria_slug: 'comida',
  lead: 'El burger bar de culto para amantes de las hamburguesas plant-based en Usaqu\u00e9n.',
  descripcion: 'Caballete & Rezo demostr\u00f3 que una hamburguesa vegana puede competirle de igual a igual a cualquier hamburguesa tradicional. Su local en Usaqu\u00e9n destaca por su est\u00e9tica r\u00fastica e industrial.\n\nCuentan con panader\u00eda propia, salsas artesanales y medallones a base de fr\u00edjol negro, lentejas, garbanzos o prote\u00edna vegetal texturizada.\n\nEs ideal para reuniones de amigos, cenas informales y maridajes con cerveza artesanal local.',
  highlight: 'Burger bar plant-based \u00b7 Panader\u00eda y salsas propias \u00b7 Cerveza artesanal \u00b7 Usaqu\u00e9n',
  ciudad: 'Bogot\u00e1',
  region: 'Cundinamarca',
  barrio: 'Usaqu\u00e9n',
  lat: 4.6982,
  lng: -74.0315,
  whatsapp: '',
  telefono: '',
  email: '',
  web: 'https://caballeteyrezo.com',
  instagram: '@caballeteyrezo',
  precio_desde: 'Hamburguesas desde $28.000',
  horario: 'Mar-Dom 12:00 PM - 10:00 PM \u00b7 Lunes cerrado',
  emoji: '\ud83c\udf7a',
  hero_bg: 'linear-gradient(135deg, #4a235a 0%, #111111 100%)',
  foto_hero: HERO,
  tipo: 'Burger Bar \u00b7 Cervecer\u00eda Vegana',
  capacidad: '50 comensales',
  como_llegar: 'A pocas cuadras del Parque Principal de Usaqu\u00e9n. Calle 120A # 6-25',
  status: 'published',
  destacado: false
};

const TAGS = {
  tipo_comida: 'Hamburguesas & Cerveza Artesanal',
  cocina: 'Norteamericana / Fusi\u00f3n Vegana',
  ambiente: 'R\u00fastico, industrial y amigable',
  precio_promedio: '$40.000 - $60.000 por persona',
  terraza: 'Si',
  reservas: 'Si',
  domicilio: 'Si',
  menu_destacado: [
    { nombre: 'Hamburguesa La Santanera (Fr\u00edjol y Ma\u00edz)', precio: '$29.000', badge: 'popular' },
    { nombre: 'Hamburguesa BBQ Smoke & Bacon Vegano', precio: '$33.000', badge: 'popular' },
    { nombre: 'Papas Caseras Trufadas', precio: '$16.000' },
    { nombre: 'Cerveza Artesanal BBC / Pint', precio: '$14.000' }
  ],
  opciones_dieta: ['Vegano', 'Vegetariano'],
  horario_detallado: {
    Lunes:     { estado: 'Cerrado' },
    Martes:    { abre: '12:00', cierra: '22:00' },
    Miercoles: { abre: '12:00', cierra: '22:00' },
    Jueves:    { abre: '12:00', cierra: '22:00' },
    Viernes:   { abre: '12:00', cierra: '23:00' },
    Sabado:    { abre: '12:00', cierra: '23:00' },
    Domingo:   { abre: '12:00', cierra: '20:00' }
  },
  domicilio_plataformas: ['Rappi', 'WhatsApp']
};

const FAQS = [
  { pregunta: '\u00bfTienen cerveza sin gluten?', respuesta: 'S\u00ed, cuentan con opciones de sidras y bebidas sin gluten en su carta.' }
];

module.exports = { SLUG: SLUG, HERO: HERO, PHOTOS: PHOTOS, BASE: BASE, TAGS: TAGS, FAQS: FAQS };

if (require.main !== module) return;

(async function main() {
  var url = process.env.DATABASE_URL || process.argv[2];
  if (!url) {
    console.error('Falta DATABASE_URL.');
    console.error('Uso: DATABASE_URL=postgres://... node scripts/seed-caballete-y-rezo-usaquen.js [--dry]');
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
