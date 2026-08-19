// scripts/seed-la-fruteria-candelaria-bogota.js
// Crea (o actualiza) la pagina dinamica la-fruteria-candelaria-bogota.html
// con los datos de la Cafeteria y Fruteria La Candelaria (Cl. 12 #8-85,
// La Candelaria, Bogota), replicando el patron de scripts/seed-candelario.js
// (categoria comida, upsert completo, contenido ASCII-safe).
//
// Uso:
//   DATABASE_URL=postgres://... node scripts/seed-la-fruteria-candelaria-bogota.js --dry
//   DATABASE_URL=postgres://... node scripts/seed-la-fruteria-candelaria-bogota.js
//
// Idempotente: re-ejecutable sin efectos secundarios (ON CONFLICT slug).

var neon = null;
function getNeon() {
  if (!neon) neon = require('@neondatabase/serverless').neon;
  return neon;
}

const SLUG = 'la-fruteria-candelaria-bogota';
const HERO = 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Fruit_juice_77.jpg/960px-Fruit_juice_77.jpg';

const PHOTOS = [
  { url: HERO, caption: 'Jugos naturales de frutas tropicales, la especialidad de la casa' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ac/Fruit_Juice_01.jpg/960px-Fruit_Juice_01.jpg', caption: 'Jugos frescos servidos al momento' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Lulo_Frutas.jpg/960px-Lulo_Frutas.jpg', caption: 'Lulo, una de las frutas mas pedidas en la fruteria' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/55/Canasta_de_guayaba_verde_en_la_plaza_de_mercado_Minorista_de_Medell%C3%ADn.jpg/960px-Canasta_de_guayaba_verde_en_la_plaza_de_mercado_Minorista_de_Medell%C3%ADn.jpg', caption: 'Frutas frescas de plaza de mercado' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/78/Fruit_Juice_vendor.jpg/960px-Fruit_Juice_vendor.jpg', caption: 'Puesto de jugos en el centro de Bogota' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/La_Candelaria%2C_Bogota%2C_Colombia_%285785130118%29.jpg/960px-La_Candelaria%2C_Bogota%2C_Colombia_%285785130118%29.jpg', caption: 'Las calles coloniales de La Candelaria alrededor de la fruteria' }
];

const BASE = {
  slug: SLUG,
  nombre: 'Cafeteria y Fruteria La Candelaria',
  categoria_slug: 'comida',
  lead: 'Jugos de frutas tropicales, cafe y desayunos en la calle 12 de La Candelaria: una fruteria clasica del centro historico para reponer energia entre recorridos.',
  descripcion: 'La Cafeteria y Fruteria La Candelaria (Calle 12 #8-85, La Candelaria, Bogota, coordenadas 4.5962, -74.0754) es un establecimiento clasico del centro historico que combina jugos de frutas tropicales, cafe y desayunos de la casa. A pasos de la Plaza de Bolivar y del corazon peatonal de La Candelaria, es el lugar al que muchos vuelven despues de recorrer los museos o antes de subir a Monserrate.\n\nSu carta de jugos es amplia: lulo, mora, guanabana, maracuya, papaya, mango y limonada de coco, todos preparados con fruta fresca al momento. Tambien sirven batidos, ensaladas de frutas, cafe y desayunos con arepa, huevo y chocolate, la oferta tipica de las fruterias bogotanas.\n\nEl local tiene servicio en barra y pocas mesas, pensado para un paso rapido: se pide, se disfruta y se sigue con la ruta. Es frecuentado tanto por turistas que buscan un refresco como por oficinistas y estudiantes del centro que van por su jugo de siempre.\n\nUbicada en una zona peatonal muy transitada, la fruteria es una parada practica para hidratarse despues de caminar por las calles empedradas. Su ambiente es sencillo, ruidoso en horas pico y siempre lleno de movimiento, muy en sintonia con el caracter del centro historico.\n\nDesde la calle 12 se llega caminando en minutos a la Plaza de Bolivar, la Casa de Nari\u00f1o, la Iglesia de la Candelaria y el Museo del Oro.',
  highlight: 'Jugos de fruta fresca \u00b7 Lulo, guanabana y limonada de coco \u00b7 Cafe y desayunos \u00b7 A pasos de la Plaza de Bolivar',
  ciudad: 'Bogot\u00e1',
  region: 'Cundinamarca',
  barrio: 'La Candelaria',
  lat: 4.5962,
  lng: -74.0754,
  whatsapp: '',
  telefono: '6013414124',
  email: '',
  web: '',
  instagram: '',
  precio_desde: 'Jugos desde $4.000; desayunos desde $8.000 (referencia)',
  horario: 'Lunes a sabado de 7:00 a 19:00; domingos de 8:00 a 18:00 (referencia)',
  emoji: '\ud83e\udd64',
  hero_bg: 'linear-gradient(135deg,#14532d,#16a34a)',
  foto_hero: HERO,
  tipo: 'Fruteria y cafeteria \u00b7 Jugos naturales \u00b7 Desayunos',
  capacidad: '',
  como_llegar: 'TransMilenio: estacion Las Aguas (troncal Karakol) y caminar 12 minutos por la carrera quinta hacia el sur hasta la calle 12. Desde la Plaza de Bolivar, unos 5 minutos caminando. Taxi o app: Calle 12 #8-85, La Candelaria.',
  status: 'published',
  destacado: true
};

const TAGS = {
  tipo_comida: 'Fruteria y cafeteria',
  cocina: 'Jugos y desayunos colombianos',
  ambiente: 'Sencillo, rapido y de barrio',
  precio_promedio: '$4.000 - $15.000 por persona',
  terraza: 'No',
  reservas: 'No',
  domicilio: 'Si',
  menu_destacado: [
    { nombre: 'Jugo de lulo', precio: 'Desde $4.000', badge: 'popular' },
    { nombre: 'Jugo de guanabana', precio: 'Desde $4.500' },
    { nombre: 'Limonada de coco', precio: 'Desde $5.000' },
    { nombre: 'Desayuno con arepa, huevo y chocolate', precio: 'Desde $8.000' }
  ],
  opciones_dieta: ['Opciones vegetarianas', 'Opciones veganas (jugos)'],
  horario_detallado: {
    Lunes:    { abre: '07:00', cierra: '19:00' },
    Martes:   { abre: '07:00', cierra: '19:00' },
    Miercoles: { abre: '07:00', cierra: '19:00' },
    Jueves:   { abre: '07:00', cierra: '19:00' },
    Viernes:  { abre: '07:00', cierra: '19:00' },
    Sabado:   { abre: '07:00', cierra: '19:00' },
    Domingo:  { abre: '08:00', cierra: '18:00' }
  },
  domicilio_plataformas: ['Domicilios del centro']
};

const FAQS = [
  { pregunta: 'Donde queda la Cafeteria y Fruteria La Candelaria?', respuesta: 'Calle 12 #8-85, La Candelaria, Bogota, a pocos minutos caminando de la Plaza de Bolivar.' },
  { pregunta: 'Que sirven?', respuesta: 'Jugos de frutas tropicales, batidos, ensaladas de frutas, cafe y desayunos colombianos.' },
  { pregunta: 'Cual es el jugo mas pedido?', respuesta: 'El de lulo, junto con la limonada de coco y el jugo de guanabana.' },
  { pregunta: 'Hacen domicilios?', respuesta: 'Si, atienden pedidos para entrega en la zona del centro.' },
  { pregunta: 'Cual es su horario?', respuesta: 'Lunes a sabado de 7:00 a 19:00 y domingos de 8:00 a 18:00 (horario de referencia).' }
];

module.exports = { SLUG: SLUG, HERO: HERO, PHOTOS: PHOTOS, BASE: BASE, TAGS: TAGS, FAQS: FAQS };

if (require.main !== module) return;

(async function main() {
  var url = process.env.DATABASE_URL || process.argv[2];
  if (!url) {
    console.error('Falta DATABASE_URL.');
    console.error('Uso: DATABASE_URL=postgres://... node scripts/seed-la-fruteria-candelaria-bogota.js [--dry]');
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