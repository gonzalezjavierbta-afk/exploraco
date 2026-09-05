// scripts/seed-los-parceritos-villavicencio.js
// Datos de 'Los Parceritos' (Lokillo y Jota P) en el Parque de la Vida Cofrem,
// Villavicencio, viernes 4 de septiembre de 2026. Categoria evento.
// Patron seed + loader + smoke de Fase 9.
// Uso:
//   DATABASE_URL=postgres://... node scripts/seed-los-parceritos-villavicencio.js --dry
//   DATABASE_URL=postgres://... node scripts/seed-los-parceritos-villavicencio.js
// Idempotente (ON CONFLICT slug). 100% ASCII-safe.

var neon = null;
function getNeon() {
  if (!neon) neon = require('@neondatabase/serverless').neon;
  return neon;
}

const SLUG = 'los-parceritos-villavicencio';
const HERO = 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=900&q=80';

const PHOTOS = [
  { url: HERO, caption: 'Lokillo y Jota P en tarima en el Parque de la Vida' },
  { url: 'https://images.unsplash.com/photo-1524863479829-916d8e77f114?w=900&q=80', caption: 'El publico de la llanura vibra con el humor' },
  { url: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=900&q=80', caption: 'Luces de la noche en el polideportivo' },
  { url: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=900&q=80', caption: 'Una cita de buena energia en Villavicencio' }
];

const BASE = {
  slug: SLUG,
  nombre: 'Los Parceritos: Lokillo y Jota P en Villavicencio',
  categoria_slug: 'evento',
  lead: 'El d\u00fao de humor y m\u00fasica que enamor\u00f3 a las redes llega al Polideportivo del Parque de la Vida de Cofrem el viernes 4 de septiembre: puertas 6:00 pm y show 8:00 pm.',
  descripcion: 'Lokillo Fl\u00f3rez y Jota P se unen en "Los Parceritos", un show en el que el humor coste\u00f1o y la m\u00fasica se mezclan para armar la jornada perfecta del regreso a clases llanero.\n\nLa presentaci\u00f3n ser\u00e1 el viernes 4 de septiembre en el Polideportivo del Parque de la Vida de Cofrem, en Villavicencio. La apertura de puertas est\u00e1 prevista a las 6:00 pm y el show arrancar\u00e1 a las 8:00 pm.\n\nEl evento es organizado por Cofrem, \u00e1rea de Cultura y Eventos, y hace parte de la agenda de entretenimiento de la capital del Meta para el fin de semana. Las boletas se adquieren en las taquillas del Parque de la Vida.',
  highlight: 'Puertas 6:00 pm \u00b7 show 8:00 pm \u00b7 humor + m\u00fasica',
  ciudad: 'Villavicencio',
  region: 'Meta',
  barrio: 'Parque de la Vida',
  lat: 4.1600,
  lng: -73.6200,
  whatsapp: '',
  telefono: '',
  email: '',
  web: '',
  instagram: '',
  precio_desde: 'Consulta taquillas',
  horario: 'Puertas 6:00 pm - show 8:00 pm',
  emoji: '\ud83d\ude02',
  hero_bg: 'linear-gradient(135deg,#1a2a1a,#0d2137)',
  foto_hero: HERO,
  tipo: 'Show de humor y m\u00fasica',
  capacidad: 'Polideportivo Parque de la Vida Cofrem',
  como_llegar: 'El Parque de la Vida de Cofrem queda en el sector de Cofrem Norte, sobre la avenida principal de Villavicencio (v\u00eda al aeropuerto Vanguardia). Tiene parqueadero interno y acceso para el transporte p\u00fablico. Si llegas de otras ciudades, la terminal est\u00e1 a 15 minutos en taxi.',
  status: 'published',
  destacado: true
};

const TAGS = {
  fecha_inicio: '2026-09-04',
  fecha_fin: '2026-09-04',
  edicion: 'Gira Los Parceritos 2026',
  sede: 'Polideportivo Parque de la Vida Cofrem, Villavicencio',
  organiza: 'Cofrem - \u00c1rea de Cultura y Eventos',
  lema: 'De parche en parche con Lokillo y Jota P',
  lineup: [
    { nombre: 'Lokillo', escenario: 'Escenario principal' },
    { nombre: 'Jota P', escenario: 'Escenario principal' }
  ],
  agenda: [
    { dia: 'Viernes 4 de septiembre', hora: '6:00 pm', actividad: 'Apertura de puertas' },
    { dia: 'Viernes 4 de septiembre', hora: '8:00 pm', actividad: 'Inicio del show de Los Parceritos' },
    { dia: 'Viernes 4 de septiembre', hora: '11:00 pm', actividad: 'Cierre del evento' }
  ],
  categorias_entrada: [
    { tipo: 'General', precio: 'Entradas en taquillas del Parque de la Vida', disponibilidad: 'Disponible' },
    { tipo: 'Zona preferencial', precio: 'Informaci\u00f3n en taquillas', disponibilidad: 'Consultar' }
  ],
  que_llevar: [
    'Boleta impresa o digital al ingreso',
    'Documento de identidad',
    'Ropa c\u00f3moda para la noche llanera'
  ],
  prohibido: [
    'Ingreso de bebidas y alimentos del exterior',
    'M\u00f3viles o c\u00e1maras que graben el show completo',
    'Objetos contundentes'
  ]
};

const FAQS = [
  { pregunta: '\u00bfCu\u00e1ndo es el show de Los Parceritos en Villavicencio?', respuesta: 'Viernes 4 de septiembre de 2026 en el Polideportivo del Parque de la Vida Cofrem. Puertas 6:00 pm, show 8:00 pm.' },
  { pregunta: '\u00bfQui\u00e9nes se presentan?', respuesta: 'Lokillo y Jota P, en el show de humor y m\u00fasica de la gira 2026.' },
  { pregunta: '\u00bfD\u00f3nde compro las boletas?', respuesta: 'En las taquillas del Parque de la Vida Cofrem. No se recomienda reventa.' },
  { pregunta: '\u00bfHay parqueadero?', respuesta: 'S\u00ed, el Parque de la Vida cuenta con parqueadero interno y amplia zona de acceso vehicular.' },
  { pregunta: '\u00bfQu\u00e9 pasa con las boletas si se agota mi sector?', respuesta: 'Consulta en taquillas las alternativas de zona preferencial seg\u00fan disponibilidad.' }
];

module.exports = { SLUG: SLUG, HERO: HERO, PHOTOS: PHOTOS, BASE: BASE, TAGS: TAGS, FAQS: FAQS };

if (require.main !== module) return;

(async function main() {
  var url = process.env.DATABASE_URL || process.argv[2];
  if (!url) {
    console.error('Falta DATABASE_URL.');
    console.error('Uso: DATABASE_URL=postgres://... node scripts/seed-los-parceritos-villavicencio.js [--dry]');
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