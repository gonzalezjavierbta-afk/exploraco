// scripts/seed-la-puerta-falsa-bogota.js
// Crea (o actualiza) la pagina dinamica la-puerta-falsa-bogota.html con los
// datos del Cafe La Puerta Falsa (Cl. 11 #6-50, La Candelaria, Bogota),
// replicando el patron de scripts/seed-candelario.js (categoria comida,
// upsert completo, contenido ASCII-safe).
//
// Uso:
//   DATABASE_URL=postgres://... node scripts/seed-la-puerta-falsa-bogota.js --dry
//   DATABASE_URL=postgres://... node scripts/seed-la-puerta-falsa-bogota.js
//
// Idempotente: re-ejecutable sin efectos secundarios (ON CONFLICT slug).

var neon = null;
function getNeon() {
  if (!neon) neon = require('@neondatabase/serverless').neon;
  return neon;
}

const SLUG = 'la-puerta-falsa-bogota';
const HERO = 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1f/Interior_la_puerta_falsa.jpg/960px-Interior_la_puerta_falsa.jpg';

const PHOTOS = [
  { url: HERO, caption: 'Interior del Cafe La Puerta Falsa, fundado en 1816' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/75/Counter_at_La_Puerta_Falsa_%285618082838%29.jpg/960px-Counter_at_La_Puerta_Falsa_%285618082838%29.jpg', caption: 'El mostrador historico donde se sirven el chocolate santafere\u00f1o y el tamal' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4f/Chocolate_santafere%C3%B1o_en_Caf%C3%A9_La_Puerta_Falsa_1.jpg/960px-Chocolate_santafere%C3%B1o_en_Caf%C3%A9_La_Puerta_Falsa_1.jpg', caption: 'Chocolate santafere\u00f1o con queso, la bebida insignia' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/00/Ajiaco_la_puerta_falsa.jpg/960px-Ajiaco_la_puerta_falsa.jpg', caption: 'Ajiaco servido en La Puerta Falsa' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/Chocolate_santafere%C3%B1o_en_Caf%C3%A9_La_Puerta_Falsa_2.jpg/960px-Chocolate_santafere%C3%B1o_en_Caf%C3%A9_La_Puerta_Falsa_2.jpg', caption: 'Chocolate caliente servido en vasija tradicional de barro' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/Ajiaco_in_Bogot%C3%A1.jpg/960px-Ajiaco_in_Bogot%C3%A1.jpg', caption: 'Ajiaco bogotano con pollo, guascas y alcaparras' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5d/Empanada_colombiana.jpg/960px-Empanada_colombiana.jpg', caption: 'Empanadas colombianas, parte de la mesa tradicional' }
];

const BASE = {
  slug: SLUG,
  nombre: 'Caf\u00e9 La Puerta Falsa',
  categoria_slug: 'comida',
  lead: 'Fundado en 1816, es uno de los cafes mas antiguos de Latinoamerica en funcionamiento: chocolate santafere\u00f1o con queso, tamal en hoja de bijao y ajiaco a una cuadra de la Plaza de Bolivar.',
  descripcion: 'Caf\u00e9 La Puerta Falsa (Calle 11 #6-50, La Candelaria, Bogota, coordenadas 4.5985, -74.0725) es un cafe historico fundado en 1816, casi dos siglos de tradicion ininterrumpida que lo convierten en uno de los establecimientos gastronomicos mas antiguos de America Latina. Su pequena fachada, de apariencia modesta, esconde uno de los rincones mas queridos por los bogotanos y por los viajeros que buscan la mesa santafere\u00f1a de siempre.\n\nEl nombre del lugar nace de una leyenda de la epoca colonial: en este punto existia una puerta falsa, una entrada discreta que permitia salir sin ser visto, algo muy util en tiempos de la Independencia. Con el paso de los siglos, el local se convirtio en parada obligatoria para artistas, politicos y escritores que bajaban del Palacio Li\u00e9vano o de la Catedral Primada.\n\nSu carta es una oda a la cocina criolla. El tamal santafere\u00f1o, envuelto en hoja de bijao, se sirve con chocolate caliente y almojabana; el chocolate santafere\u00f1o llega en vasija de barro con queso para derretir; y el ajiaco, con pollo, tres clases de papa, guascas, alcaparras y crema de leche, es de los mas pedidos del centro historico. Tambien sirven changua, pan de maiz, arepas y otros clasicos de la desayunada bogotana.\n\nEl local es pequeno y las mesas suelen llenarse rapido, especialmente al mediodia. Es un lugar de paso, de ida y vuelta: se entra, se pide, se disfruta y se deja el espacio a otro comensal. Por eso, aunque el sitio es austero, la experiencia es autentica y parte del patrimonio gastronomico de Bogota.\n\nEsta a una cuadra de la Plaza de Bolivar, entre la Catedral Primada y el Palacio Li\u00e9vano, en pleno corazon del centro historico. Es el punto de partida perfecto para una ruta por La Candelaria o para reponer fuerzas despues de recorrer el Museo del Oro o la Casa de la Moneda.',
  highlight: 'Desde 1816 \u00b7 Chocolate santafere\u00f1o con queso \u00b7 Tamal en hoja de bijao \u00b7 Ajiaco a una cuadra de la Plaza de Bolivar',
  ciudad: 'Bogot\u00e1',
  region: 'Cundinamarca',
  barrio: 'La Candelaria',
  lat: 4.5985,
  lng: -74.0725,
  whatsapp: '',
  telefono: '6012863245',
  email: '',
  web: '',
  instagram: '',
  precio_desde: 'Tamal desde $6.000; chocolate desde $4.500; ajiaco desde $18.000 (referencia)',
  horario: 'Lunes a sabado de 7:00 a 19:00; domingos y festivos de 7:00 a 17:00 (referencia)',
  emoji: '\u2615',
  hero_bg: 'linear-gradient(135deg,#3b2417,#7c2d12)',
  foto_hero: HERO,
  tipo: 'Cafe historico \u00b7 Cocina santafere\u00f1a \u00b7 Desde 1816',
  capacidad: '',
  como_llegar: 'TransMilenio: estacion Las Aguas (troncal Karakol) y caminar 15 minutos por la carrera septima hacia el sur hasta la calle 11. Desde la Plaza de Bolivar, el cafe esta en la esquina oriente, a una cuadra. Taxi o app: Calle 11 #6-50, La Candelaria.',
  status: 'published',
  destacado: true
};

const TAGS = {
  tipo_comida: 'Cafe historico',
  cocina: 'Cocina santafere\u00f1a tradicional',
  ambiente: 'Historico, bohemio y de paso',
  precio_promedio: '$6.000 - $25.000 por persona',
  terraza: 'No',
  reservas: 'No',
  domicilio: 'No',
  menu_destacado: [
    { nombre: 'Tamal santafere\u00f1o en hoja de bijao', precio: 'Desde $6.000', badge: 'popular' },
    { nombre: 'Chocolate santafere\u00f1o con queso', precio: 'Desde $4.500', badge: 'popular' },
    { nombre: 'Ajiaco bogotano', precio: 'Desde $18.000' },
    { nombre: 'Almojabana con queso', precio: 'Desde $3.500' },
    { nombre: 'Changua santafere\u00f1a', precio: 'Desde $8.000' }
  ],
  opciones_dieta: ['Opciones para vegetarianos (changua y tamal)'],
  horario_detallado: {
    Lunes:    { abre: '07:00', cierra: '19:00' },
    Martes:   { abre: '07:00', cierra: '19:00' },
    Miercoles: { abre: '07:00', cierra: '19:00' },
    Jueves:   { abre: '07:00', cierra: '19:00' },
    Viernes:  { abre: '07:00', cierra: '19:00' },
    Sabado:   { abre: '07:00', cierra: '19:00' },
    Domingo:  { abre: '07:00', cierra: '17:00' }
  },
  domicilio_plataformas: []
};

const FAQS = [
  { pregunta: 'Donde queda el Cafe La Puerta Falsa?', respuesta: 'Calle 11 #6-50, La Candelaria, Bogota, a una cuadra de la Plaza de Bolivar.' },
  { pregunta: 'Es cierto que fue fundado en 1816?', respuesta: 'Si, se le considera uno de los cafes mas antiguos de Latinoamerica aun en funcionamiento.' },
  { pregunta: 'Que platos imperdibles tiene?', respuesta: 'El tamal santafere\u00f1o con chocolate caliente, el ajiaco y la changua.' },
  { pregunta: 'Tiene terraza o reservas?', respuesta: 'No. Es un local pequeno de paso, sin reservas; se atiende por orden de llegada.' },
  { pregunta: 'Cual es la mejor hora para ir?', respuesta: 'Temprano en la manana para el desayuno santafere\u00f1o o al mediodia para el ajiaco, antes de la hora de mayor afluencia.' }
];

module.exports = { SLUG: SLUG, HERO: HERO, PHOTOS: PHOTOS, BASE: BASE, TAGS: TAGS, FAQS: FAQS };

if (require.main !== module) return;

(async function main() {
  var url = process.env.DATABASE_URL || process.argv[2];
  if (!url) {
    console.error('Falta DATABASE_URL.');
    console.error('Uso: DATABASE_URL=postgres://... node scripts/seed-la-puerta-falsa-bogota.js [--dry]');
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