// scripts/seed-mes-del-patrimonio-bogota.js
// Datos del evento Mes del Patrimonio 2026 (Instituto Distrital de Patrimonio
// Cultural - IDPC y Secretaria de Cultura, Recreacion y Deporte), Bogota,
// durante todo septiembre de 2026. Categoria evento.
// Patron seed + loader + smoke de Fase 9.
// Uso:
//   DATABASE_URL=postgres://... node scripts/seed-mes-del-patrimonio-bogota.js --dry
//   DATABASE_URL=postgres://... node scripts/seed-mes-del-patrimonio-bogota.js
// Idempotente (ON CONFLICT slug). 100% ASCII-safe.

var neon = null;
function getNeon() {
  if (!neon) neon = require('@neondatabase/serverless').neon;
  return neon;
}

const SLUG = 'mes-del-patrimonio-bogota';
const HERO = 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/56/Panor%C3%A1mica_Plaza_de_Bol%C3%ADvar_Bogot%C3%A1.jpg/960px-Panor%C3%A1mica_Plaza_de_Bol%C3%ADvar_Bogot%C3%A1.jpg';

const PHOTOS = [
  { url: HERO, caption: 'Panoramica de la Plaza de Bolivar, uno de los escenarios del Mes del Patrimonio 2026' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/2021_Bogot%C3%A1_-_Catedral_Primada_de_Colombia.jpg/960px-2021_Bogot%C3%A1_-_Catedral_Primada_de_Colombia.jpg', caption: 'Catedral Primada de Colombia, costado oriental de la plaza' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7e/Capitolio_Nacional%2C_Bogot%C3%A1.JPG/960px-Capitolio_Nacional%2C_Bogot%C3%A1.JPG', caption: 'Capitolio Nacional, parte del patrimonio del Centro Historico' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e7/Teatro_Col%C3%B3n_Bogot%C3%A1.jpg/800px-Teatro_Col%C3%B3n_Bogot%C3%A1.jpg', caption: 'Teatro Colon, patrimonio cultural de La Candelaria' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/Calle_empedrada_La_Candelaria.jpg/800px-Calle_empedrada_La_Candelaria.jpg', caption: 'Calles empedradas de La Candelaria, sede de recorridos patrimoniales' }
];

const BASE = {
  slug: SLUG,
  nombre: 'Mes del Patrimonio 2026: Memoria que construye futuro',
  categoria_slug: 'evento',
  lead: 'Durante todo septiembre de 2026, Bogot\u00e1 celebra el Mes del Patrimonio con m\u00e1s de 50 actividades y eventos gratis del IDPC y la Secretar\u00eda de Cultura: recorridos, rodadas, talleres, jornadas acad\u00e9micas y foros.',
  descripcion: 'El Mes del Patrimonio 2026 es una conmemoraci\u00f3n a nivel distrital que se articula con los 20 a\u00f1os del Instituto Distrital de Patrimonio Cultural (IDPC) y cuenta con el apoyo de la Secretar\u00eda de Cultura, Recreaci\u00f3n y Deporte (SDCRD). Bajo el lema "Memoria que construye futuro", la programaci\u00f3n busca poner en di\u00e1logo pr\u00e1cticas, territorios y espacios de Bogot\u00e1 con los retos y decisiones que definir\u00e1n la ciudad del futuro.\n\nDurante septiembre hay m\u00e1s de 50 actividades y eventos gratis: recorridos patrimoniales, rodadas, jornadas acad\u00e9micas, activaciones, talleres, carreras de observaci\u00f3n y concursos.\n\nEl primer gran momento ser\u00e1 el 18 de septiembre en la Plaza de Bol\u00edvar, con jornada de aprobat\u00f3n de tr\u00e1mites, exhibici\u00f3n de libros del Sello Editorial y del Centro de Documentaci\u00f3n, el ABC del PEMP, juegos patrimoniales y recorridos patrimoniales con una experiencia de luz sobre la historia de la plaza.\n\nLa oferta acad\u00e9mica incluye el encuentro "El patrimonio que seremos: Memorias vivas para imaginar la ciudad del futuro" (24 de septiembre, Auditorio Huitaca de la Alcald\u00eda Mayor, 8:00 a. m. a 5:00 p. m., con inscripci\u00f3n previa) y, de cierre, el Foro del Mes del Patrimonio: Memoria que construye futuro, liderado por el IDPC los d\u00edas 29 y 30 de septiembre (entrada libre con inscripci\u00f3n previa).\n\nTambi\u00e9n hay recorridos por barrios como Las Cruces, La Porci\u00fancula (Chapinero), Las Nieves (Santa Fe), Primero de Mayo (San Crist\u00f3bal), Eduardo Santos (Los M\u00e1rtires), las Casas del IDPC en La Candelaria, el Cementerio Central, el Parque Arqueol\u00f3gico y de Patrimonio de Usme, la Universidad de los Andes, Teusaquillo y Niza Sur. El 16 de septiembre se realiza la muestra de proceso del Plan Especial de Salvaguardia del Teatro de Creaci\u00f3n Colectiva en el Teatro Quimera y el 19 de septiembre un taller te\u00f3rico-pr\u00e1ctico de creaci\u00f3n colectiva y comparsa para j\u00f3venes de 11 a 25 a\u00f1os.',
  highlight: 'M\u00e1s de 50 actividades gratis en septiembre \u00b7 20 a\u00f1os del IDPC \u00b7 recorridos patrimoniales por toda Bogot\u00e1',
  ciudad: 'Bogot\u00e1',
  region: 'Cundinamarca',
  barrio: 'La Candelaria',
  lat: 4.59806,
  lng: -74.07580,
  whatsapp: '',
  telefono: '',
  email: '',
  web: 'https://idpc.gov.co',
  instagram: '@patrimoniobta',
  precio_desde: 'Gratis',
  horario: 'Todo septiembre de 2026, variados horarios',
  emoji: '\ud83c\udfdb',
  hero_bg: 'linear-gradient(135deg,#2a1a0a,#3a2a0a)',
  foto_hero: HERO,
  tipo: 'Conmemoracion patrimonial \u00b7 actividades y eventos gratis',
  capacidad: 'Multiples sedes en toda Bogota',
  como_llegar: 'La mayor\u00eda de actividades se concentran en el centro hist\u00f3rico: Plaza de Bol\u00edvar (carrera 7 con calle 11), el Auditorio Huitaca de la Alcald\u00eda Mayor, el Teatro Quimera, las Casas del IDPC en La Candelaria y la Biblioteca P\u00fablica Virgilio Barco. Los recorridos cubren barrios como Las Cruces, La Porci\u00fancula, Las Nieves, Eduardo Santos y Teusaquillo. Consulta el punto de encuentro exacto de cada actividad en idpc.gov.co.',
  status: 'published',
  destacado: true
};

const TAGS = {
  fecha_inicio: '2026-09-01',
  fecha_fin: '2026-09-30',
  edicion: 'Mes del Patrimonio 2026',
  sede: 'Plaza de Bol\u00edvar, Auditorio Huitaca, Teatro Quimera y barrios con recorridos patrimoniales',
  organiza: 'Instituto Distrital de Patrimonio Cultural (IDPC) y Secretar\u00eda de Cultura, Recreaci\u00f3n y Deporte',
  lema: 'Memoria que construye futuro',
  lineup: [
    { nombre: 'Recorrido Las Cruces', escenario: 'Las Cruces', hora: 'Septiembre - inscripcion previa' },
    { nombre: 'Recorrido La Porci\u00fancula', escenario: 'Chapinero', hora: 'Septiembre - inscripcion previa' },
    { nombre: 'Recorrido Las Nieves', escenario: 'Santa Fe', hora: 'Septiembre - inscripcion previa' },
    { nombre: 'Recorrido Eduardo Santos', escenario: 'Los M\u00e1rtires', hora: 'Septiembre - inscripcion previa' },
    { nombre: 'Casas del IDPC', escenario: 'La Candelaria', hora: 'Septiembre' },
    { nombre: 'Parque Arqueol\u00f3gico y de Patrimonio', escenario: 'Usme', hora: 'Septiembre' }
  ],
  agenda: [
    { dia: 'Todo septiembre', hora: 'Diversos barrios', actividad: 'Recorridos patrimoniales, rodadas y activaciones' },
    { dia: '16 de septiembre', hora: 'Teatro Quimera', actividad: 'Muestra de proceso del PES del Teatro de Creaci\u00f3n Colectiva' },
    { dia: '18 de septiembre', hora: 'Plaza de Bol\u00edvar', actividad: 'Aprobat\u00f3n de tr\u00e1mites, exhibici\u00f3n de libros, ABC del PEMP y recorridos patrimoniales' },
    { dia: '18 de septiembre', hora: 'Biblioteca Virgilio Barco', actividad: 'Presentaci\u00f3n de tesis de maestr\u00eda sobre patrimonio cultural' },
    { dia: '19 de septiembre', hora: 'Por confirmar', actividad: 'Taller te\u00f3rico-pr\u00e1ctico de creaci\u00f3n colectiva y comparsa (11 a 25 a\u00f1os)' },
    { dia: '24 de septiembre', hora: 'Auditorio Huitaca', actividad: 'Encuentro "El patrimonio que seremos: Memorias vivas para imaginar la ciudad del futuro"' },
    { dia: '29 y 30 de septiembre', hora: 'IDPC', actividad: 'Foro del Mes del Patrimonio: Memoria que construye futuro' }
  ],
  categorias_entrada: [
    { tipo: 'Actividades de libre acceso', precio: 'Gratis', disponibilidad: 'Disponible' },
    { tipo: 'Actividades con inscripci\u00f3n previa', precio: 'Gratis (cupo limitado)', disponibilidad: 'Disponible' }
  ],
  que_llevar: [
    'Documento de identidad',
    'Ropa c\u00f3moda y calzado para caminar los recorridos',
    'Agua y botella reutilizable',
    'Inscribirte antes en las actividades que lo requieren'
  ],
  prohibido: [
    'Da\u00f1ar o intervenir bienes patrimoniales',
    'Alimentos y bebidas en espacios cerrados',
    'Objetos contundentes o punzantes'
  ]
};

const FAQS = [
  { pregunta: '\u00bfQu\u00e9 es el Mes del Patrimonio 2026?', respuesta: 'Es la conmemoraci\u00f3n distrital del patrimonio cultural, en septiembre de 2026, con m\u00e1s de 50 actividades y eventos gratis, en el marco de los 20 a\u00f1os del IDPC.' },
  { pregunta: '\u00bfEs gratis?', respuesta: 'S\u00ed, todas las actividades son gratuitas. Algunas requieren inscripci\u00f3n previa o llegar antes de completar aforo.' },
  { pregunta: '\u00bfQui\u00e9n lo organiza?', respuesta: 'El Instituto Distrital de Patrimonio Cultural (IDPC) con la Secretar\u00eda de Cultura, Recreaci\u00f3n y Deporte (SDCRD).' },
  { pregunta: '\u00bfCu\u00e1les son los eventos principales?', respuesta: 'El 18 de septiembre en la Plaza de Bol\u00edvar, el encuentro "El patrimonio que seremos" el 24 de septiembre y el Foro del Mes del Patrimonio el 29 y 30 de septiembre.' },
  { pregunta: '\u00bfD\u00f3nde consulto la programaci\u00f3n?', respuesta: 'En la p\u00e1gina oficial del IDPC: idpc.gov.co' }
];

module.exports = { SLUG: SLUG, HERO: HERO, PHOTOS: PHOTOS, BASE: BASE, TAGS: TAGS, FAQS: FAQS };

if (require.main !== module) return;

(async function main() {
  var url = process.env.DATABASE_URL || process.argv[2];
  if (!url) {
    console.error('Falta DATABASE_URL.');
    console.error('Uso: DATABASE_URL=postgres://... node scripts/seed-mes-del-patrimonio-bogota.js [--dry]');
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
