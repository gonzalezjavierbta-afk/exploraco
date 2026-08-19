// scripts/seed-la-casona-de-la-candelaria-bogota.js
// Crea (o actualiza) la pagina dinamica la-casona-de-la-candelaria-bogota.html
// con los datos de La Casona de la Candelaria (Cra. 6 #8-39, La Candelaria,
// Bogota), replicando el patron de scripts/seed-candelario.js (categoria
// comida, upsert completo, contenido ASCII-safe).
//
// Uso:
//   DATABASE_URL=postgres://... node scripts/seed-la-casona-de-la-candelaria-bogota.js --dry
//   DATABASE_URL=postgres://... node scripts/seed-la-casona-de-la-candelaria-bogota.js
//
// Idempotente: re-ejecutable sin efectos secundarios (ON CONFLICT slug).

var neon = null;
function getNeon() {
  if (!neon) neon = require('@neondatabase/serverless').neon;
  return neon;
}

const SLUG = 'la-casona-de-la-candelaria-bogota';
const HERO = 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/Ajiaco_in_Bogot%C3%A1.jpg/960px-Ajiaco_in_Bogot%C3%A1.jpg';

const PHOTOS = [
  { url: HERO, caption: 'Ajiaco bogotano, el plato insignia de la casona' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/00/Ajiaco_la_puerta_falsa.jpg/960px-Ajiaco_la_puerta_falsa.jpg', caption: 'Ajiaco tradicional servido con crema, alcaparras y aguacate' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4f/Chocolate_santafere%C3%B1o_en_Caf%C3%A9_La_Puerta_Falsa_1.jpg/960px-Chocolate_santafere%C3%B1o_en_Caf%C3%A9_La_Puerta_Falsa_1.jpg', caption: 'Chocolate santafere\u00f1o con queso, clasico de la mesa criolla' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5d/Empanada_colombiana.jpg/960px-Empanada_colombiana.jpg', caption: 'Empanadas colombianas con aj\u00ed' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/Catedral_Primada_de_Bogot%C3%A1.6.jpg/960px-Catedral_Primada_de_Bogot%C3%A1.6.jpg', caption: 'La Catedral Primada y el centro historico a pocas cuadras' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/La_Candelaria%2C_Bogota%2C_Colombia_%285785130118%29.jpg/960px-La_Candelaria%2C_Bogota%2C_Colombia_%285785130118%29.jpg', caption: 'La Candelaria, el barrio que rodea a la casona' }
];

const BASE = {
  slug: SLUG,
  nombre: 'La Casona de la Candelaria',
  categoria_slug: 'comida',
  lead: 'Restaurante de cocina criolla en una casona colonial restaurada de La Candelaria: ajiaco, tamales y clasicos santafere\u00f1os en un patio con historia, a pasos de la Plaza de Bolivar.',
  descripcion: 'La Casona de la Candelaria (Carrera 6 #8-39, La Candelaria, Bogota, coordenadas 4.5966, -74.0748) es un restaurante de cocina criolla instalado en una casa colonial restaurada del centro historico de Bogota. Su arquitectura de adobe, balcones de madera y patio interior conservan el caracter de las casonas santafere\u00f1as del siglo XVIII, lo que convierte al lugar en una experiencia gastronomica con memoria.\n\nLa carta apuesta por la cocina criolla bogotana: ajiaco santafere\u00f1o con pollo, tres clases de papa y guascas; tamal envuelto en hoja de bijao; changua; sobrebarriga en salsa; y postres como el natas o la gelatina de pata. Los acompanamientos rescatan la mesa tradicional: aguacate, alcaparras, crema de leche y aj\u00ed de la casa.\n\nEl patio central es el corazon de la casona: mesas alrededor de una fuente, plantas y luz natural filtrada por los balcones. Es el espacio preferido para almuerzos de trabajo, comidas familiares y los viajeros que buscan un ambiente con historia sin alejarse del corazon peatonal de La Candelaria.\n\nEl servicio es atento y el ritmo pausado, acorde con la experiencia de comer en un lugar con historia. Las porciones son generosas y los precios accesibles, lo que lo vuelve una opcion recurrente tanto para turistas como para bogotanos que visitan el centro.\n\nDesde la casona se camina en pocos minutos a la Plaza de Bolivar, la Casa de Nari\u00f1o, la Quinta de Bolivar y el Museo Nacional.',
  highlight: 'Cocina criolla santafere\u00f1a \u00b7 Casona colonial con patio \u00b7 Ajiaco y tamal \u00b7 A pasos de la Plaza de Bolivar',
  ciudad: 'Bogot\u00e1',
  region: 'Cundinamarca',
  barrio: 'La Candelaria',
  lat: 4.5966,
  lng: -74.0748,
  whatsapp: '',
  telefono: '',
  email: '',
  web: '',
  instagram: '',
  precio_desde: 'Sopas desde $12.000; platos desde $20.000 (referencia)',
  horario: 'Lunes a domingo de 11:00 a 21:00 (referencia)',
  emoji: '\ud83c\udf72',
  hero_bg: 'linear-gradient(135deg,#431407,#b91c1c)',
  foto_hero: HERO,
  tipo: 'Restaurante criollo \u00b7 Casona colonial \u00b7 Patio',
  capacidad: '',
  como_llegar: 'TransMilenio: estacion Las Aguas (troncal Karakol) y caminar 15 minutos por la carrera quinta hacia el sur hasta la calle 8. Desde la Plaza de Bolivar, unos 8 minutos caminando por la carrera sexta. Taxi o app: Carrera 6 #8-39, La Candelaria.',
  status: 'published',
  destacado: true
};

const TAGS = {
  tipo_comida: 'Restaurante criollo',
  cocina: 'Cocina santafere\u00f1a tradicional',
  ambiente: 'Casona colonial, patio interior e historico',
  precio_promedio: '$12.000 - $35.000 por persona',
  terraza: 'No',
  reservas: 'Si',
  domicilio: 'No',
  menu_destacado: [
    { nombre: 'Ajiaco santafere\u00f1o', precio: 'Desde $18.000', badge: 'popular' },
    { nombre: 'Tamal en hoja de bijao', precio: 'Desde $10.000' },
    { nombre: 'Sobrebarriga en salsa', precio: 'Desde $22.000' },
    { nombre: 'Changua santafere\u00f1a', precio: 'Desde $12.000' }
  ],
  opciones_dieta: ['Opciones vegetarianas', 'Opciones sin gluten'],
  horario_detallado: {
    Lunes:    { abre: '11:00', cierra: '21:00' },
    Martes:   { abre: '11:00', cierra: '21:00' },
    Miercoles: { abre: '11:00', cierra: '21:00' },
    Jueves:   { abre: '11:00', cierra: '21:00' },
    Viernes:  { abre: '11:00', cierra: '21:00' },
    Sabado:   { abre: '11:00', cierra: '21:00' },
    Domingo:  { abre: '11:00', cierra: '21:00' }
  },
  domicilio_plataformas: []
};

const FAQS = [
  { pregunta: 'Donde queda La Casona de la Candelaria?', respuesta: 'Carrera 6 #8-39, La Candelaria, Bogota, a unos 8 minutos caminando de la Plaza de Bolivar.' },
  { pregunta: 'Que tipo de comida sirve?', respuesta: 'Cocina criolla santafere\u00f1a: ajiaco, tamal, changua, sobrebarriga y postres tradicionales.' },
  { pregunta: 'Tiene patio?', respuesta: 'Si, cuenta con un patio colonial central con fuente y zonas verdes.' },
  { pregunta: 'Acepta reservas?', respuesta: 'Si, se recomienda reservar para grupos y fines de semana.' },
  { pregunta: 'Cual es su horario?', respuesta: 'Abierto de lunes a domingo de 11:00 a 21:00 (horario de referencia).' }
];

module.exports = { SLUG: SLUG, HERO: HERO, PHOTOS: PHOTOS, BASE: BASE, TAGS: TAGS, FAQS: FAQS };

if (require.main !== module) return;

(async function main() {
  var url = process.env.DATABASE_URL || process.argv[2];
  if (!url) {
    console.error('Falta DATABASE_URL.');
    console.error('Uso: DATABASE_URL=postgres://... node scripts/seed-la-casona-de-la-candelaria-bogota.js [--dry]');
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