// scripts/seed-festival-cordillera-2026.js
// Datos del Festival Cordillera 2026 (12 y 13 de septiembre, Parque Metropolitano
// Simon Bolivar, Bogota). Categoria evento.
// Patron seed + loader + smoke de Fase 9.
// Uso:
//   DATABASE_URL=postgres://... node scripts/seed-festival-cordillera-2026.js --dry
//   DATABASE_URL=postgres://... node scripts/seed-festival-cordillera-2026.js
// Idempotente (ON CONFLICT slug). 100% ASCII-safe.

var neon = null;
function getNeon() {
  if (!neon) neon = require('@neondatabase/serverless').neon;
  return neon;
}

const SLUG = 'festival-cordillera-2026';
const HERO = 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=900&q=80';

const PHOTOS = [
  { url: HERO, caption: 'Crowd del Festival Cordillera en el Simon Bolivar' },
  { url: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=900&q=80', caption: 'Mas de 40 shows en dos escenarios' },
  { url: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=900&q=80', caption: 'La tribu crece cada edicion' },
  { url: 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=900&q=80', caption: 'Sabados y domingos de musica latina en Bogota' }
];

const BASE = {
  slug: SLUG,
  nombre: 'Festival Cordillera 2026: El futuro es latino',
  categoria_slug: 'evento',
  lead: 'Ricky Martin, Andr\u00e9s Calamaro, Caifanes, Sean Paul y m\u00e1s de 30 artistas se re\u00fanen el 12 y 13 de septiembre en el Parque Sim\u00f3n Bol\u00edvar con 41 shows: "El futuro es latino".',
  descripcion: 'Cordillera vuelve al Parque Metropolitano Sim\u00f3n Bol\u00edvar el s\u00e1bado 12 y domingo 13 de septiembre para celebrar "El futuro es latino", con m\u00e1s de 40 presentaciones y 30+ artistas en dos escenarios.\n\nEl s\u00e1bado 12 suben a tarima Andr\u00e9s Calamaro, Sean Paul, Pante\u00f3n Rococ\u00f3 y la noche contin\u00faa hasta la medianoche con Kany Garc\u00eda, Jarabe de Palo, Los de Adentro y Bonka. El domingo 13 llegan Ricky Martin, Caifanes y Andr\u00e9s Cepeda, con la salsa de Grupo Niche y Latin Brothers, el reencuentro de Poligamia, Dread Mar I, Flor de Lava, Doctor Kr\u00e1pula, Diamante El\u00e9ctrico y M\u00e4go de Oz, entre otros.\n\nLas puertas abren a las 12:00 m (mediod\u00eda) y los shows arrancan cerca a las 2:00 pm, con boleter\u00eda por etapas en Ticketmaster.',
  highlight: '12 y 13 septiembre \u00b7 41 shows \u00b7 2 escenarios \u00b7 puertas 12:00 m',
  ciudad: 'Bogot\u00e1',
  region: 'Cundinamarca',
  barrio: 'Teusaquillo',
  lat: 4.6627,
  lng: -74.0911,
  whatsapp: '',
  telefono: '',
  email: '',
  web: 'https://cordillerafestival.com',
  instagram: 'cordillerafestival',
  precio_desde: '$489.000',
  horario: 'Puertas 12:00 m - shows desde las 2:00 pm',
  emoji: '\ud83c\udfb6',
  hero_bg: 'linear-gradient(135deg,#1b3a2a,#3a1b45)',
  foto_hero: HERO,
  tipo: 'Festival de m\u00fasica latina \u00b7 m\u00e1s de 40 shows en 2 escenarios',
  capacidad: 'Parque Metropolitano Sim\u00f3n Bol\u00edvar (Bogot\u00e1)',
  como_llegar: 'El Parque Sim\u00f3n Bol\u00edvar queda entre la Av. Calle 63, la Carrera 60 y la Av. Bolivia (Carrera 68). Llegas por TransMilenio en las estaciones Calle 63 (troncal Am\u00e9ricas/NQS) o Salitre-Simon Bolivar, y de all\u00ed caminas 10 minutos. Hay bici-parqueadero y rutas de alimentadores. Las v\u00edas aleda\u00f1as se cierran durante el festival, se recomienda transporte p\u00fablico.',
  status: 'published',
  destacado: true
};

const TAGS = {
  fecha_inicio: '2026-09-12',
  fecha_fin: '2026-09-13',
  edicion: 'El futuro es latino',
  sede: 'Parque Metropolitano Sim\u00f3n Bol\u00edvar, Bogot\u00e1',
  organiza: 'Cordillera Festival (P\u00e1ramo)',
  lema: 'Somos am\u00e9rica, somos cordillera',
  lineup: [
    { nombre: 'Ricky Martin', escenario: 'Escenario principal (domingo 13)' },
    { nombre: 'Andr\u00e9s Calamaro', escenario: 'Escenario principal (s\u00e1bado 12)' },
    { nombre: 'Caifanes', escenario: 'Escenario principal (domingo 13)' },
    { nombre: 'Sean Paul', escenario: 'Escenario principal (s\u00e1bado 12)' },
    { nombre: 'Kany Garc\u00eda', escenario: 'Escenario principal' },
    { nombre: 'Cultura Prof\u00e9tica', escenario: 'Escenario principal' },
    { nombre: 'Pante\u00f3n Rococ\u00f3', escenario: 'Escenario principal' },
    { nombre: 'M\u00e4go de Oz', escenario: 'Escenario principal' },
    { nombre: 'Miguel Mateos', escenario: 'Escenario principal' },
    { nombre: 'Tan Bionica', escenario: 'Escenario principal' },
    { nombre: 'Jarabe de Palo', escenario: 'Escenario principal' },
    { nombre: 'Los de Adentro', escenario: 'Escenario principal' },
    { nombre: 'Bonka', escenario: 'Escenario principal' },
    { nombre: 'Andr\u00e9s Cepeda', escenario: 'Escenario principal (domingo 13)' },
    { nombre: 'Flor de Lava', escenario: 'Escenario principal' },
    { nombre: 'Doctor Kr\u00e1pula', escenario: 'Escenario principal' },
    { nombre: 'Diamante El\u00e9ctrico', escenario: 'Escenario principal' },
    { nombre: 'Poligamia (reencuentro)', escenario: 'Escenario principal' },
    { nombre: 'Grupo Niche', escenario: 'Escenario principal' },
    { nombre: 'Dread Mar I', escenario: 'Escenario principal' }
  ],
  agenda: [
    { dia: 'S\u00e1bado 12 de septiembre', hora: '12:00 m', actividad: 'Apertura de puertas' },
    { dia: 'S\u00e1bado 12 de septiembre', hora: '2:00 pm', actividad: 'Inicio de los shows en ambos escenarios' },
    { dia: 'S\u00e1bado 12 de septiembre', hora: '12:00 am', actividad: 'Cierre de la jornada' },
    { dia: 'Domingo 13 de septiembre', hora: '12:00 m', actividad: 'Apertura de puertas' },
    { dia: 'Domingo 13 de septiembre', hora: '2:00 pm', actividad: 'Inicio de los shows en ambos escenarios' },
    { dia: 'Domingo 13 de septiembre', hora: '11:00 pm', actividad: 'Cierre del festival' }
  ],
  categorias_entrada: [
    { tipo: 'General Etapa 3', precio: 'Desde $569.000', disponibilidad: 'Disponible' },
    { tipo: 'General Etapa 1', precio: 'Desde $489.000', disponibilidad: 'Agotado' },
    { tipo: 'Combo General (2 d\u00edas)', precio: 'Desde $799.000', disponibilidad: 'Disponible' },
    { tipo: 'Combo VIP', precio: 'Desde $1.949.000', disponibilidad: 'Disponible' }
  ],
  que_llevar: [
    'Boleta oficial Ticketmaster (no compres reventa)',
    'Gorra, bloqueador y gafas de sol',
    'Carrusel y carpa para los aguaceros de Bogot\u00e1',
    'Agua y snacks en envases permitidos por el festival'
  ],
  prohibido: [
    'Sombrillas, vapeadores, pitos y l\u00e1seres',
    'Bebidas alcoh\u00f3licas y envases de vidrio',
    'Art\u00edculos pirot\u00e9cnicos y armas',
    'C\u00e1maras profesionales o con lente desmontable'
  ]
};

const FAQS = [
  { pregunta: '\u00bfCu\u00e1ndo es el Festival Cordillera 2026?', respuesta: 'S\u00e1bado 12 y domingo 13 de septiembre de 2026 en el Parque Metropolitano Sim\u00f3n Bol\u00edvar. Puertas 12:00 m y shows desde las 2:00 pm.' },
  { pregunta: '\u00bfD\u00f3nde compro las boletas?', respuesta: 'En Ticketmaster, por etapas. La Etapa 1 se agot\u00f3; hay Etapa 3 general, combos de 2 d\u00edas y combos VIP disponibles.' },
  { pregunta: '\u00bfQui\u00e9nes se presentan este a\u00f1o?', respuesta: 'Ricky Martin, Andr\u00e9s Calamaro, Caifanes, Sean Paul, Kany Garc\u00eda, Pante\u00f3n Rococ\u00f3, M\u00e4go de Oz, Grupo Niche, Poligamia, Diamante El\u00e9ctrico y m\u00e1s de 30 artistas en 41 shows.' },
  { pregunta: '\u00bfQu\u00e9 puedo llevar al festival?', respuesta: 'Gorra, bloqueador, carpa de lluvia y agua en envases permitidos. Est\u00e1n prohibidos sombrillas, l\u00e1seres, vapeadores y c\u00e1maras profesionales.' },
  { pregunta: '\u00bfC\u00f3mo llego al Parque Sim\u00f3n Bol\u00edvar?', respuesta: 'TransMilenio estaciones Calle 63 o Salitre-Simon Bolivar y 10 minutos caminando; hay bici-parqueadero. Las v\u00edas aleda\u00f1as se cierran, se recomienda transporte p\u00fablico.' }
];

module.exports = { SLUG: SLUG, HERO: HERO, PHOTOS: PHOTOS, BASE: BASE, TAGS: TAGS, FAQS: FAQS };

if (require.main !== module) return;

(async function main() {
  var url = process.env.DATABASE_URL || process.argv[2];
  if (!url) {
    console.error('Falta DATABASE_URL.');
    console.error('Uso: DATABASE_URL=postgres://... node scripts/seed-festival-cordillera-2026.js [--dry]');
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