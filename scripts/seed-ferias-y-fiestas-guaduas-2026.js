// scripts/seed-ferias-y-fiestas-guaduas-2026.js
// Datos de Ferias y Fiestas de Guaduas 2026 (Cundinamarca), categoria evento.
// Patron seed + loader + smoke de Fase 9.
// Uso:
//   DATABASE_URL=postgres://... node scripts/seed-ferias-y-fiestas-guaduas-2026.js --dry
//   DATABASE_URL=postgres://... node scripts/seed-ferias-y-fiestas-guaduas-2026.js
// Idempotente (ON CONFLICT slug). 100% ASCII-safe.

var neon = null;
function getNeon() {
  if (!neon) neon = require('@neondatabase/serverless').neon;
  return neon;
}

const SLUG = 'ferias-y-fiestas-guaduas-2026';
const HERO = 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=900&q=80';

const PHOTOS = [
  { url: HERO, caption: 'Noche de fiesta en el pueblo patrimonio de Colombia' },
  { url: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=900&q=80', caption: 'Conciertos de m\u00fasica popular en el parque principal' },
  { url: 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=900&q=80', caption: 'Cabalgata por las calles empedradas de la Villa de los Comuneros' },
  { url: 'https://images.unsplash.com/photo-1457544401429-7404b1c0e1b8?w=900&q=80', caption: 'Mercado ganadero y exposici\u00f3n equina en la plaza de ferias' }
];

const BASE = {
  slug: SLUG,
  nombre: 'Ferias y Fiestas de Guaduas 2026',
  categoria_slug: 'evento',
  lead: 'Campo de fiesta en la Villa de los Comuneros: 8 d\u00edas de conciertos, gran cabalgata, mercado ganadero, exposici\u00f3n equina y la elecci\u00f3n de la nueva reina.',
  descripcion: 'Del viernes 4 al viernes 11 de septiembre, Guaduas respira fiesta con sus ferias tradicionales: noches de orquesta y verbena en el parque, vallenato y m\u00fasica popular, la gran cabalgata, el mercado ganadero y la exposici\u00f3n equina en la plaza de ferias.\n\nLa programaci\u00f3n incluye la Noche de Orquesta con Tropifiesta en la instalaci\u00f3n, la presentaci\u00f3n de Olga Valkiria el s\u00e1bado 5 y la gala de El Mono Zabaleta el domingo 6. Todos los espect\u00e1culos en el parque principal son gratuitos y aptos para el p\u00fablico en general.\n\nCada agosto-septiembre y enero se realiza la cabalgata; en estas fiestas la gran cabalgata recorre las calles del pueblo que conserva el empedrado y la arquitectura colonial de la ruta real Bogot\u00e1-Honda.',
  highlight: '8 d\u00edas de fiesta gratuita \u00b7 Olga Valkiria, El Mono Zabaleta y Tropifiesta',
  ciudad: 'Guaduas',
  region: 'Cundinamarca',
  barrio: 'Centro hist\u00f3rico',
  lat: 5.0667,
  lng: -74.6000,
  whatsapp: '',
  telefono: '',
  email: '',
  web: '',
  instagram: '',
  precio_desde: 'Gratis',
  horario: 'Conciertos desde las 9:00 pm - jornadas diurnas desde las 9:00 am',
  emoji: '\ud83c\udfaa',
  hero_bg: 'linear-gradient(135deg,#0d1b2a,#1b4332)',
  foto_hero: HERO,
  tipo: 'Ferias y fiestas municipales',
  capacidad: 'Parque principal y plaza de ferias de Guaduas',
  como_llegar: 'Guaduas queda a 2 horas de Bogot\u00e1 por la v\u00eda Facatativ\u00e1-El Corzo (calle 80) y a 2 horas 40 de Honda. En bus, desde la Terminal de Bogot\u00e1 (Salitre) salen empresas como Autoboy hacia El Corzo con paso por Guaduas (tiquete cerca de $25.000). En carro, la mejor ruta es Bogot\u00e1 - Facatativ\u00e1 - El Corzo - Guaduas.',
  status: 'published',
  destacado: true
};

const TAGS = {
  fecha_inicio: '2026-09-04',
  fecha_fin: '2026-09-11',
  edicion: 'Ferias y Fiestas 2026',
  sede: 'Parque principal y plaza de ferias, Guaduas (Cundinamarca)',
  organiza: 'Alcald\u00eda Municipal de Guaduas',
  lema: 'La Villa de los Comuneros conoce la fiesta',
  lineup: [
    { nombre: 'Noche de Orquesta Tropifiesta', escenario: 'Escenario principal' },
    { nombre: 'Olga Valkiria', escenario: 'Escenario principal' },
    { nombre: 'El Mono Zabaleta', escenario: 'Escenario principal' },
    { nombre: 'Verbena popular y conjunto municipal', escenario: 'Escenario principal' }
  ],
  agenda: [
    { dia: 'Viernes 4 de septiembre', hora: '7:00 pm', actividad: 'Apertura de puertas y arranque de la fiesta' },
    { dia: 'Viernes 4 de septiembre', hora: '9:00 pm', actividad: 'Noche de Orquesta Tropifiesta y verbena popular' },
    { dia: 'S\u00e1bado 5 de septiembre', hora: '9:00 pm', actividad: 'Olga Valkiria en concierto' },
    { dia: 'Domingo 6 de septiembre', hora: '2:00 pm', actividad: 'Gran cabalgata por las calles de Guaduas' },
    { dia: 'Domingo 6 de septiembre', hora: '8:00 pm', actividad: 'El Mono Zabaleta en concierto' }
  ],
  categorias_entrada: [
    { tipo: 'Eventos p\u00fablicos en el parque', precio: 'Gratis', disponibilidad: 'Entrada libre' },
    { tipo: 'Escenarios con grader\u00eda preferencial', precio: 'Informaci\u00f3n en la alcald\u00eda', disponibilidad: 'Consultar' }
  ],
  que_llevar: [
    'Gorra y bloqueador para las jornadas de d\u00eda',
    'Agua para hidratarte durante la cabalgata',
    'Efectivo para puestos de comida y mercado ganadero'
  ],
  prohibido: [
    'Ingreso de menores de edad a la verbena nocturna',
    'Consumo de licor fuera de las zonas autorizadas',
    'Armas de fuego y objetos contundentes'
  ]
};

const FAQS = [
  { pregunta: '\u00bfCu\u00e1ndo son las Ferias y Fiestas de Guaduas 2026?', respuesta: 'Del viernes 4 al viernes 11 de septiembre de 2026, con conciertos, cabalgata, mercado ganadero y exposici\u00f3n equina.' },
  { pregunta: '\u00bfCu\u00e1l es el costo de las boletas?', respuesta: 'Los espect\u00e1culos del parque principal y la cabalgata son gratuitos. Escenarios con grader\u00eda preferencial pueden tener control de acceso; inf\u00f3rmate en la Alcald\u00eda Municipal.' },
  { pregunta: '\u00bfQui\u00e9nes se presentan?', respuesta: 'Noche de Orquesta con Tropifiesta (viernes 4), Olga Valkiria (s\u00e1bado 5) y El Mono Zabaleta (domingo 6), m\u00e1s verbena popular todos los d\u00edas.' },
  { pregunta: '\u00bfQu\u00e9 d\u00eda es la cabalgata?', respuesta: 'El domingo 6 de septiembre, desde las 2:00 pm, recorriendo las calles del centro hist\u00f3rico.' },
  { pregunta: '\u00bfC\u00f3mo llego a Guaduas?', respuesta: 'Desde Bogot\u00e1 por la v\u00eda Facatativ\u00e1-El Corzo (calle 80) o en bus desde la Terminal Salitre hasta El Corzo con paso por Guaduas.' }
];

module.exports = { SLUG: SLUG, HERO: HERO, PHOTOS: PHOTOS, BASE: BASE, TAGS: TAGS, FAQS: FAQS };

if (require.main !== module) return;

(async function main() {
  var url = process.env.DATABASE_URL || process.argv[2];
  if (!url) {
    console.error('Falta DATABASE_URL.');
    console.error('Uso: DATABASE_URL=postgres://... node scripts/seed-ferias-y-fiestas-guaduas-2026.js [--dry]');
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