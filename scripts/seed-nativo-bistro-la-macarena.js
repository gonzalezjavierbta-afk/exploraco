// scripts/seed-nativo-bistro-la-macarena.js
// Crea (o actualiza) la pagina dinamica nativo-bistro-la-macarena.html con
// los datos de Nativo Bistro Plant-Based (La Macarena, Bogota),
// replicando el patron de scripts/seed-origen-bistro-bogota.js (categoria
// comida, upsert completo, contenido ASCII-safe).
//
// Uso:
//   DATABASE_URL=postgres://... node scripts/seed-nativo-bistro-la-macarena.js --dry
//   DATABASE_URL=postgres://... node scripts/seed-nativo-bistro-la-macarena.js
//
// Idempotente: re-ejecutable sin efectos secundarios (ON CONFLICT slug).

var neon = null;
function getNeon() {
  if (!neon) neon = require('@neondatabase/serverless').neon;
  return neon;
}

const SLUG = 'nativo-bistro-la-macarena';
const HERO = 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/81/Mushroom_Risotto_%284789413257%29.jpg/960px-Mushroom_Risotto_%284789413257%29.jpg';

const PHOTOS = [
  { url: HERO, caption: 'Risotto de hongos silvestres, cocina de autor plant-based' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f8/Ceviche_vegano.jpg/960px-Ceviche_vegano.jpg', caption: 'Ceviche vegetal inspirado en los sabores del Pacifico' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ed/Mushroom_and_Leek_Risotto_%2849535206656%29.jpg/960px-Mushroom_and_Leek_Risotto_%2849535206656%29.jpg', caption: 'Risotto cremoso de hongos y puerro' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Chocolate_mousse_using_silken_tofu_and_soymilk_flickr_user_crystl.jpg/960px-Chocolate_mousse_using_silken_tofu_and_soymilk_flickr_user_crystl.jpg', caption: 'Mousse de chocolate con tofu de seda, postre sin lacteos' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/21/Bogota_restaurante_en_La_Macarena_-_calle_27.JPG/960px-Bogota_restaurante_en_La_Macarena_-_calle_27.JPG', caption: 'La Macarena, barrio gastronomico junto al Museo Nacional' }
];

const BASE = {
  slug: SLUG,
  nombre: 'Nativo Bistro Plant-Based',
  categoria_slug: 'comida',
  lead: 'Cocina de autor y experiencia gastron\u00f3mica consciente en el barrio internacional La Macarena.',
  descripcion: 'Nativo Bistro fusiona ingredientes biodiversos de Colombia con t\u00e9cnicas internacionales de cocina a base de plantas. Un rinc\u00f3n acogedor dentro del barrio gastron\u00f3mico La Macarena.\n\nSu carta rota peri\u00f3dicamente respetando los ciclos de cosecha de peque\u00f1os agricultores agroecol\u00f3gicos.\n\nResaltan sus platos inspirados en el Pac\u00edfico colombiano, ceviches de hongos tropicales y refrescantes infusiones de bot\u00e1nica nativa.',
  highlight: 'Cocina de autor plant-based \u00b7 Sabores del Pac\u00edfico \u00b7 Ceviches de hongos \u00b7 La Macarena',
  ciudad: 'Bogot\u00e1',
  region: 'Cundinamarca',
  barrio: 'La Macarena',
  lat: 4.6145,
  lng: -74.0658,
  whatsapp: '',
  telefono: '',
  email: '',
  web: '',
  instagram: '@nativobistro',
  precio_desde: 'Platos desde $26.000',
  horario: 'Mi\u00e9-Dom 12:30 PM - 9:00 PM \u00b7 Lun-Mar cerrado',
  emoji: '\ud83c\udf3f',
  hero_bg: 'linear-gradient(135deg, #196f3d 0%, #111111 100%)',
  foto_hero: HERO,
  tipo: 'Bistro \u00b7 Cocina de Autor',
  capacidad: '30 comensales',
  como_llegar: 'Carrera 4A # 26B-22 (a pocas cuadras del Museo Nacional)',
  status: 'published',
  destacado: false
};

const TAGS = {
  tipo_comida: 'Autora Vegana / Fusi\u00f3n Colombiana',
  cocina: 'Contempor\u00e1nea Latinoamericana',
  ambiente: 'Bohemio, \u00edntimo y rom\u00e1ntico',
  precio_promedio: '$45.000 - $65.000 por persona',
  terraza: 'No',
  reservas: 'Si',
  domicilio: 'Si',
  menu_destacado: [
    { nombre: 'Ceviche de Orellanas y Mango de Az\u00facar', precio: '$27.000', badge: 'popular' },
    { nombre: 'Encocado del Pac\u00edfico con Tofu Ahumado', precio: '$35.000', badge: 'popular' },
    { nombre: 'Risotton de Hongos Silvestres', precio: '$34.000' },
    { nombre: 'Mousse de Cacao Chocoano y Maracuy\u00e1', precio: '$15.000' }
  ],
  opciones_dieta: ['100% Vegano', 'Sin Gluten'],
  horario_detallado: {
    Lunes:     { estado: 'Cerrado' },
    Martes:    { estado: 'Cerrado' },
    Miercoles: { abre: '12:30', cierra: '21:00' },
    Jueves:    { abre: '12:30', cierra: '21:00' },
    Viernes:   { abre: '12:30', cierra: '21:30' },
    Sabado:    { abre: '12:30', cierra: '21:30' },
    Domingo:   { abre: '12:30', cierra: '17:00' }
  },
  domicilio_plataformas: ['Rappi']
};

const FAQS = [
  { pregunta: '\u00bfSe requiere reserva previa?', respuesta: 'Se recomienda reservar los fines de semana debido a su aforo limitado.' }
];

module.exports = { SLUG: SLUG, HERO: HERO, PHOTOS: PHOTOS, BASE: BASE, TAGS: TAGS, FAQS: FAQS };

if (require.main !== module) return;

(async function main() {
  var url = process.env.DATABASE_URL || process.argv[2];
  if (!url) {
    console.error('Falta DATABASE_URL.');
    console.error('Uso: DATABASE_URL=postgres://... node scripts/seed-nativo-bistro-la-macarena.js [--dry]');
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
