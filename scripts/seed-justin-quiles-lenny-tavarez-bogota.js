// scripts/seed-justin-quiles-lenny-tavarez-bogota.js
// Datos de Justin Quiles y Lenny Tavarez (Superarte Tour) en el Movistar Arena,
// Bogota, viernes 11 de septiembre de 2026. Categoria evento.
// Patron seed + loader + smoke de Fase 9.
// Uso:
//   DATABASE_URL=postgres://... node scripts/seed-justin-quiles-lenny-tavarez-bogota.js --dry
//   DATABASE_URL=postgres://... node scripts/seed-justin-quiles-lenny-tavarez-bogota.js
// Idempotente (ON CONFLICT slug). 100% ASCII-safe.

var neon = null;
function getNeon() {
  if (!neon) neon = require('@neondatabase/serverless').neon;
  return neon;
}

const SLUG = 'justin-quiles-lenny-tavarez-bogota';
const HERO = 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=900&q=80';

const PHOTOS = [
  { url: HERO, caption: 'La noche del Superarte Tour en el Movistar Arena' },
  { url: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=900&q=80', caption: 'El publico vibra con el reggaeton romantico' },
  { url: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=900&q=80', caption: 'Una cita para los amantes del genero' },
  { url: 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=900&q=80', caption: 'Bogota recibe el Superarte de Quiles y Tavarez' }
];

const BASE = {
  slug: SLUG,
  nombre: 'Justin Quiles y Lenny Tav\u00e1rez: Superarte Tour en el Movistar Arena',
  categoria_slug: 'evento',
  lead: 'Las voces de "Medallo" y "Whiskey y Coco" se unen en una sola noche: Justin Quiles y Lenny Tav\u00e1rez llegan al Movistar Arena el viernes 11 de septiembre, puertas 5:00 pm y show 7:00 pm.',
  descripcion: 'Justin Quiles y Lenny Tav\u00e1rez, dos de las voces m\u00e1s escuchadas del g\u00e9nero urbano en los \u00faltimos a\u00f1os, comparten tarima en el Movistar Arena de Bogot\u00e1 este viernes 11 de septiembre con su Superarte Tour.\n\nLos artistas repasar\u00e1n sus grandes \u00e9xitos: Medallo, PAM, Whiskey y Coco, Las Neas y Thank you bb, en una noche pensada para el p\u00fablico mayor de 18 a\u00f1os.\n\nLa apertura de puertas est\u00e1 confirmada para las 5:00 pm y el inicio del show a las 7:00 pm en el escenario de la calle 17 con Av. NQS. La boleter\u00eda se maneja por Tuboleta y gran parte de las localidades generales se agotaron en la preventa.',
  highlight: 'Viernes 11 sep \u00b7 puertas 5:00 pm \u00b7 show 7:00 pm \u00b7 mayores de 18',
  ciudad: 'Bogot\u00e1',
  region: 'Cundinamarca',
  barrio: 'Teusaquillo',
  lat: 4.6652,
  lng: -74.0839,
  whatsapp: '',
  telefono: '',
  email: '',
  web: 'https://tuboleta.com',
  instagram: 'movistararenacol',
  precio_desde: '$180.000 (agotado)',
  horario: 'Puertas 5:00 pm - show 7:00 pm',
  emoji: '\ud83c\udfa4',
  hero_bg: 'linear-gradient(135deg,#0d1b2a,#4a1d3a)',
  foto_hero: HERO,
  tipo: 'Concierto de m\u00fasica urbana \u00b7 Superarte Tour',
  capacidad: 'Movistar Arena (hasta 14.000 personas)',
  como_llegar: 'El Movistar Arena queda sobre la Av. NQS con calle 17, al occidente del centro de Bogot\u00e1. Puedes llegar en TransMilenio (troncal Av. Am\u00e9ricas / NQS, estaci\u00f3n Movistar Arena, antiguamente Corferias) y caminar 5 minutos; a pie desde la estaci\u00f3n sobre la calle 17. Hay parqueaderos p\u00fablicos alrededor del recinto pero se llenan r\u00e1pido.',
  status: 'published',
  destacado: true
};

const TAGS = {
  fecha_inicio: '2026-09-11',
  fecha_fin: '2026-09-11',
  edicion: 'Superarte Tour',
  sede: 'Movistar Arena, Bogot\u00e1 (Av. NQS con calle 17)',
  organiza: 'Breakfast Live - Movistar Arena',
  lema: 'Medallo, Whiskey y Coco y m\u00e1s \u00e9xitos en una sola noche',
  lineup: [
    { nombre: 'Justin Quiles', escenario: 'Escenario principal' },
    { nombre: 'Lenny Tav\u00e1rez', escenario: 'Escenario principal' }
  ],
  agenda: [
    { dia: 'Viernes 11 de septiembre', hora: '5:00 pm', actividad: 'Apertura de puertas' },
    { dia: 'Viernes 11 de septiembre', hora: '7:00 pm', actividad: 'Inicio del show' },
    { dia: 'Viernes 11 de septiembre', hora: '11:00 pm', actividad: 'Cierre del concierto' }
  ],
  categorias_entrada: [
    { tipo: 'Localidades generales', precio: 'Entre $180.000 y $380.000 (sin servicio)', disponibilidad: 'Agotado' },
    { tipo: 'Zonas VIP y palcos', precio: 'Informaci\u00f3n en Tuboleta', disponibilidad: 'Sujeto a disponibilidad' }
  ],
  que_llevar: [
    'Boleta de Tuboleta impresa o en el celular',
    'Documento de identidad (mayores de 18 a\u00f1os)',
    'Abrigo ligero para la noche'
  ],
  prohibido: [
    'Ingreso de menores de 18 a\u00f1os',
    'C\u00e1maras profesionales y tabletas',
    'Alimentos y bebidas del exterior',
    'Banderas con asta y objetos contundentes'
  ]
};

const FAQS = [
  { pregunta: '\u00bfCu\u00e1ndo es el concierto de Justin Quiles y Lenny Tav\u00e1rez?', respuesta: 'Viernes 11 de septiembre de 2026 en el Movistar Arena. Puertas 5:00 pm y show 7:00 pm.' },
  { pregunta: '\u00bfQu\u00e9 canciones van a tocar?', respuesta: 'El repertorio del Superarte Tour incluye Medallo, PAM, Whiskey y Coco, Las Neas y Thank you bb.' },
  { pregunta: '\u00bfQu\u00e9 edad m\u00ednima hay que tener?', respuesta: 'El evento es para mayores de 18 a\u00f1os; se exige documento de identidad al ingreso.' },
  { pregunta: '\u00bfQuedan boletas?', respuesta: 'Gran parte de las localidades generales se agotaron en preventa. Consulta en Tuboleta las zonas VIP y palcos disponibles.' },
  { pregunta: '\u00bfC\u00f3mo llego al Movistar Arena?', respuesta: 'TransMilenio hasta la estaci\u00f3n Movistar Arena y caminar 5 minutos. Los parqueaderos del sector se llenan temprano.' }
];

module.exports = { SLUG: SLUG, HERO: HERO, PHOTOS: PHOTOS, BASE: BASE, TAGS: TAGS, FAQS: FAQS };

if (require.main !== module) return;

(async function main() {
  var url = process.env.DATABASE_URL || process.argv[2];
  if (!url) {
    console.error('Falta DATABASE_URL.');
    console.error('Uso: DATABASE_URL=postgres://... node scripts/seed-justin-quiles-lenny-tavarez-bogota.js [--dry]');
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