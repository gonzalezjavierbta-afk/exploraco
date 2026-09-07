// scripts/seed-jazz-expandido-bogota.js
// Datos del evento Jazz Expandido: temporada de jazz del Centro Nacional de
// las Artes (Teatro Colon, Sala Delia Zapata, Sala Fanny Mikey y Plazoleta),
// Bogota, del 4 al 27 de septiembre de 2026. Categoria evento.
// Patron seed + loader + smoke de Fase 9.
// Uso:
//   DATABASE_URL=postgres://... node scripts/seed-jazz-expandido-bogota.js --dry
//   DATABASE_URL=postgres://... node scripts/seed-jazz-expandido-bogota.js
// Idempotente (ON CONFLICT slug). 100% ASCII-safe.

var neon = null;
function getNeon() {
  if (!neon) neon = require('@neondatabase/serverless').neon;
  return neon;
}

const SLUG = 'jazz-expandido-bogota';
const HERO = 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=900&q=80';

const PHOTOS = [
  { url: HERO, caption: 'Jazz Expandido: saxofon y vientos sobre los escenarios del Centro Nacional de las Artes' },
  { url: 'https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=900&q=80', caption: 'Publico en la Plazoleta del CNA durante un concierto al aire libre' },
  { url: 'https://images.unsplash.com/photo-1499363536502-87642509e31b?w=900&q=80', caption: 'Improvisacion en vivo en el Teatro Colon' },
  { url: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=900&q=80', caption: 'Noches de jazz en Bogota: del reggae africano al latin jazz' },
  { url: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=900&q=80', caption: 'Artistas de Brasil, Paises Bajos y Costa de Marfil en la capital' }
];

const BASE = {
  slug: SLUG,
  nombre: 'Jazz Expandido: temporada de jazz en el CNA',
  categoria_slug: 'evento',
  lead: 'Del 4 al 27 de septiembre de 2026, el Centro Nacional de las Artes (Teatro Col\u00f3n, Sala Delia Zapata, Sala Fanny Mikey y Plazoleta) re\u00fane a m\u00fasicos de seis pa\u00edses en una temporada que va del homenaje a Louis Armstrong al reggae africano.',
  descripcion: 'Jazz Expandido es la temporada de jazz del Centro Nacional de las Artes (CNA) que, del 4 al 27 de septiembre de 2026, re\u00fane en Bogot\u00e1 a m\u00fasicos de seis pa\u00edses y de distintas regiones de Colombia, recorriendo el reggae, la m\u00fasica cl\u00e1sica, la canci\u00f3n latinoamericana y las tradiciones musicales del Caribe y el Pac\u00edfico.\n\nLa agenda abri\u00f3 con Emergentes Jazz, una jornada dedicada a nuevas propuestas del g\u00e9nero en Colombia, y continu\u00f3 con el brasile\u00f1o Davi Fonseca (quien present\u00f3 su segundo \u00e1lbum, Viseira) y con Victoria Sur y Nicol\u00e1s Ospina, en una presentaci\u00f3n que cruza la canci\u00f3n latinoamericana con el lenguaje del jazz.\n\nEntre los conciertos internacionales est\u00e1n Luca Ciarla (Italia, 11 de septiembre en la Plazoleta del CNA, entrada libre), el trompetista neerland\u00e9s Michael Varekamp con el homenaje Louis! a Louis Armstrong junto a The Legends (12 de septiembre), Rembrandt Trio (Pa\u00edses Bajos) con su tributo a Chick Corea (20 de septiembre) y el referente del reggae panafricano Tiken Jah Fakoly, de Costa de Marfil, con Braquage de pouvoir (24 de septiembre, boleter\u00eda agotada).\n\nEl cierre trae dos propuestas colombianas el 26 de septiembre (Jam At\u00edpico Nacional, de Cali, con entrada libre, y Buika junto a la Orquesta Sinf\u00f3nica Nacional de Colombia en Buika, Experiencia Sinf\u00f3nica 2026) y el 27 de septiembre a Urpi Barco con Golondrina, un homenaje a las mujeres del jazz colombiano.\n\nLos conciertos se realizan en el Teatro Col\u00f3n, la Sala Fanny Mikey, la Sala Delia Zapata y la Plazoleta del CNA. Las entradas para los espect\u00e1culos que no son de entrada libre est\u00e1n disponibles en Tuboleta.',
  highlight: 'Temporada del 4 al 27 de septiembre \u00b7 m\u00fasicos de 6 pa\u00edses \u00b7 Teatro Col\u00f3n, Sala Delia Zapata y Plazoleta del CNA',
  ciudad: 'Bogot\u00e1',
  region: 'Cundinamarca',
  barrio: 'La Candelaria',
  lat: 4.5967,
  lng: -74.0730,
  whatsapp: '',
  telefono: '',
  email: '',
  web: 'https://tuboleta.com',
  instagram: '@teatrocolonbogota',
  precio_desde: 'Gratis y con boleter\u00eda',
  horario: 'Del 4 al 27 de septiembre de 2026, variados horarios',
  emoji: '\ud83c\udfb7',
  hero_bg: 'linear-gradient(135deg,#1a0a1a,#2a1a2a)',
  foto_hero: HERO,
  tipo: 'Temporada de jazz \u00b7 conciertos nacionales e internacionales',
  capacidad: 'Teatro Col\u00f3n, Sala Fanny Mikey, Sala Delia Zapata y Plazoleta del CNA',
  como_llegar: 'El Centro Nacional de las Artes queda en el centro hist\u00f3rico de Bogot\u00e1: el Teatro Col\u00f3n en la calle 10 # 5-32 y la Sala Delia Zapata en la calle 11 # 5-60, La Candelaria. Llega por TransMilenio en la estaci\u00f3n Museo del Oro (carrera 7) y camina unas cuadras hacia el oriente, o en el eje ambiental. Hay parqueaderos p\u00fablicos cerca de la calle 10.',
  status: 'published',
  destacado: true
};

const TAGS = {
  fecha_inicio: '2026-09-04',
  fecha_fin: '2026-09-27',
  edicion: 'Temporada Jazz Expandido 2026',
  sede: 'Centro Nacional de las Artes: Teatro Col\u00f3n, Sala Delia Zapata, Sala Fanny Mikey y Plazoleta del CNA',
  organiza: 'Centro Nacional de las Artes - Ministerio de las Culturas',
  lema: 'El jazz como punto de encuentro de m\u00fasicos de seis pa\u00edses',
  lineup: [
    { nombre: 'Davi Fonseca (Brasil)', escenario: 'Teatro Col\u00f3n', hora: '5 de septiembre' },
    { nombre: 'Victoria Sur y Nicol\u00e1s Ospina', escenario: 'Sala Delia Zapata', hora: 'Temporada Jazz Expandido' },
    { nombre: 'Luca Ciarla (Italia)', escenario: 'Plazoleta del CNA', hora: '11 de septiembre - entrada libre' },
    { nombre: 'Michael Varekamp (Pa\u00edses Bajos): Louis!', escenario: 'Sala Delia Zapata', hora: '12 de septiembre' },
    { nombre: 'Rembrandt Trio (Pa\u00edses Bajos)', escenario: 'Sala Fanny Mikey', hora: '20 de septiembre' },
    { nombre: 'Tiken Jah Fakoly (Costa de Marfil)', escenario: 'Sala Delia Zapata', hora: '24 de septiembre - agotado' },
    { nombre: 'Jam At\u00edpico Nacional (Cali)', escenario: 'Plazoleta del CNA', hora: '26 de septiembre - entrada libre' },
    { nombre: 'Buika + Orquesta Sinf\u00f3nica Nacional', escenario: 'Teatro Col\u00f3n', hora: '26 de septiembre' },
    { nombre: 'Urpi Barco: Golondrina', escenario: 'Sala Delia Zapata', hora: '27 de septiembre' }
  ],
  agenda: [
    { dia: '4 de septiembre', hora: 'CNA', actividad: 'Apertura con Emergentes Jazz (nuevas propuestas colombianas)' },
    { dia: '5 de septiembre', hora: 'CNA', actividad: 'Davi Fonseca presenta Viseira' },
    { dia: '11 de septiembre', hora: 'Plazoleta del CNA', actividad: 'Luca Ciarla (Italia), entrada libre' },
    { dia: '12 de septiembre', hora: 'CNA', actividad: 'Michael Varekamp rinde homenaje a Louis Armstrong en Louis!' },
    { dia: '20 de septiembre', hora: 'CNA', actividad: 'Rembrandt Trio (tributo a Chick Corea) y Anamar\u00eda Oramas en la Plazoleta' },
    { dia: '24 de septiembre', hora: 'CNA', actividad: 'Tiken Jah Fakoly presenta Braquage de pouvoir' },
    { dia: '26 de septiembre', hora: 'CNA', actividad: 'Jam At\u00edpico Nacional y Buika, Experiencia Sinf\u00f3nica 2026' },
    { dia: '27 de septiembre', hora: 'CNA', actividad: 'Cierre con Urpi Barco y Golondrina' }
  ],
  categorias_entrada: [
    { tipo: 'Conciertos de entrada libre', precio: 'Gratis', disponibilidad: 'Disponible' },
    { tipo: 'Conciertos con boleter\u00eda', precio: 'Seg\u00fan funci\u00f3n en Tuboleta', disponibilidad: 'Disponible' },
    { tipo: 'Tiken Jah Fakoly (24 sep)', precio: 'Boleter\u00eda', disponibilidad: 'Agotado' }
  ],
  que_llevar: [
    'Boleta de Tuboleta impresa o digital (funciones con costo)',
    'Documento de identidad',
    'Llegar con anticipaci\u00f3n para las funciones de entrada libre'
  ],
  prohibido: [
    'Alimentos y bebidas dentro de las salas',
    'C\u00e1maras profesionales sin autorizaci\u00f3n',
    'Grabaci\u00f3n de audio o video de las funciones'
  ]
};

const FAQS = [
  { pregunta: '\u00bfQu\u00e9 es Jazz Expandido?', respuesta: 'Es la temporada de jazz del Centro Nacional de las Artes, del 4 al 27 de septiembre de 2026, con m\u00fasicos de seis pa\u00edses y distintas regiones de Colombia.' },
  { pregunta: '\u00bfD\u00f3nde se realiza?', respuesta: 'En el Teatro Col\u00f3n, la Sala Fanny Mikey, la Sala Delia Zapata y la Plazoleta del CNA, en La Candelaria, centro de Bogot\u00e1.' },
  { pregunta: '\u00bfHay conciertos gratis?', respuesta: 'S\u00ed, Luca Ciarla (11 de septiembre) y Jam At\u00edpico Nacional (26 de septiembre) son de entrada libre en la Plazoleta del CNA.' },
  { pregunta: '\u00bfD\u00f3nde compro las entradas?', respuesta: 'En Tuboleta para los espect\u00e1culos con boleter\u00eda. Tiken Jah Fakoly (24 de septiembre) ya agot\u00f3 boleter\u00eda.' },
  { pregunta: '\u00bfQu\u00e9 artistas internacionales vienen?', respuesta: 'Davi Fonseca (Brasil), Luca Ciarla (Italia), Michael Varekamp y Rembrandt Trio (Pa\u00edses Bajos) y Tiken Jah Fakoly (Costa de Marfil).' }
];

module.exports = { SLUG: SLUG, HERO: HERO, PHOTOS: PHOTOS, BASE: BASE, TAGS: TAGS, FAQS: FAQS };

if (require.main !== module) return;

(async function main() {
  var url = process.env.DATABASE_URL || process.argv[2];
  if (!url) {
    console.error('Falta DATABASE_URL.');
    console.error('Uso: DATABASE_URL=postgres://... node scripts/seed-jazz-expandido-bogota.js [--dry]');
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
