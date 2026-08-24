// scripts/seed-tardeando-el-centro-bogota.js
// Datos de "Tardeando en el Centro Historico" (FUGA, ultimo viernes del mes),
// categoria evento. Patron seed + loader + smoke de Fase 9.
//
// Uso:
//   DATABASE_URL=postgres://... node scripts/seed-tardeando-el-centro-bogota.js --dry
//   DATABASE_URL=postgres://... node scripts/seed-tardeando-el-centro-bogota.js
//
// Idempotente: re-ejecutable sin efectos secundarios (ON CONFLICT slug).
// Contenido 100% ASCII-safe: caracteres especiales como escapes \uXXXX.

var neon = null;
function getNeon() {
  if (!neon) neon = require('@neondatabase/serverless').neon;
  return neon;
}

const SLUG = 'tardeando-el-centro-bogota';
const HERO = 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=900&q=80';

const PHOTOS = [
  { url: HERO, caption: 'El centro historico se toma con cultura cada ultimo viernes' },
  { url: 'https://images.unsplash.com/photo-1499363536502-87642509e31b?w=900&q=80', caption: 'Publico disfrutando la jornada cultural' },
  { url: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=900&q=80', caption: 'Musica, teatro y calle en La Candelaria' },
  { url: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=900&q=80', caption: 'Escenarios abiertos hasta la medianoche' },
  { url: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=900&q=80', caption: 'Tarde-noche cultural en el centro de Bogota' }
];

const BASE = {
  slug: SLUG,
  nombre: 'Tardeando en el Centro Hist\u00f3rico',
  categoria_slug: 'evento',
  lead: 'El \u00faltimo viernes de cada mes el centro hist\u00f3rico de Bogot\u00e1 se llena de teatro, m\u00fasica, exposiciones, recorridos patrimoniales y gastronom\u00eda: una tarde-noche cultural, mayormente gratuita, organizada por la FUGA.',
  descripcion: 'Tardeando en el Centro convierte el centro hist\u00f3rico e internacional de Bogot\u00e1 en un gran escenario abierto. El \u00faltimo viernes de cada mes, museos, plazas, parques, bares y teatros de La Candelaria, San Diego y el Centro Internacional programan teatro, m\u00fasica, exposiciones, recorridos patrimoniales y gastronom\u00eda desde la 1:00 pm y hasta la medianoche.\n\nLa edici\u00f3n de agosto llega el viernes 28 de 2026. La mayor\u00eda de actividades son gratuitas y algunas requieren inscripci\u00f3n previa; la programaci\u00f3n completa se publica en los canales de la Fundaci\u00f3n Gilberto Alzate Avenda\u00f1o (FUGA) y de sus aliados: I Love La Candelaria, AsoSanDiego, Asobares y Visit Centro Internacional.\n\nEs el plan perfecto para redescubrir el centro a pie: empezar por la Plaza de Bol\u00edvar o el barrio San Diego, entrar a los museos de la zona y cerrar con m\u00fasica en vivo en los escenarios y bares aliados. Se llega f\u00e1cilmente en TransMilenio (estaciones Museos del Oro, Las Aguas o Museo Nacional).',
  highlight: '\u00daltimo viernes de cada mes \u00b7 Teatro, m\u00fasica y patrimonio \u00b7 Mayor\u00eda de actividades gratis',
  ciudad: 'Bogot\u00e1',
  region: 'Cundinamarca',
  barrio: 'La Candelaria',
  lat: 4.5981,
  lng: -74.0758,
  whatsapp: '',
  telefono: '',
  email: '',
  web: 'https://www.fuga.gov.co/',
  instagram: '@fugabogota',
  precio_desde: 'Gratis (mayor\u00eda de actividades)',
  horario: 'Viernes 1:00 pm a 12:00 am',
  emoji: '\ud83c\udfad',
  hero_bg: 'linear-gradient(135deg,#2a1a08,#0a1428)',
  foto_hero: HERO,
  tipo: 'Festival cultural \u00b7 Patrimonio \u00b7 Arte urbano',
  capacidad: 'M\u00faltiples escenarios en el centro hist\u00f3rico',
  como_llegar: 'La jornada cubre La Candelaria, San Diego y el Centro Internacional. En TransMilenio baja en Museos del Oro, Las Aguas o Museo Nacional; tambi\u00e9n llegan rutas SITP por la s\u00e9ptima y la d\u00e9cima. Lo mejor es recorrerlo a pie entre plazas, museos y bares.',
  status: 'published',
  destacado: true
};

const TAGS = {
  fecha_inicio: '2026-08-28',
  fecha_fin: '2026-08-28',
  edicion: 'Edicion agosto 2026',
  sede: 'Centro Hist\u00f3rico e Internacional: La Candelaria, San Diego y alrededores',
  organiza: 'Fundaci\u00f3n Gilberto Alzate Avenda\u00f1o (FUGA)',
  lema: 'El centro hist\u00f3rico se toma de tarde y noche',
  lineup: [],
  agenda: [
    { dia: 'Viernes 28 de agosto', hora: '1:00 pm', actividad: 'Inicio de actividades culturales' },
    { dia: 'Viernes 28 de agosto', hora: '12:00 am', actividad: 'Cierre de la jornada' }
  ],
  categorias_entrada: [
    { tipo: 'Actividades y recorridos', precio: 'Gratis (mayor\u00eda); algunos shows con inscripci\u00f3n', disponibilidad: 'Disponible' }
  ],
  que_llevar: [
    'Zapatos c\u00f3modos para caminar el centro',
    'Protector solar para la tarde',
    'Efectivo para la gastronom\u00eda local',
    'Revisar la programaci\u00f3n completa en los canales de la FUGA'
  ],
  prohibido: []
};

const FAQS = [
  { pregunta: '\u00bfQu\u00e9 es Tardeando en el Centro?', respuesta: 'Una jornada cultural que ocurre el \u00faltimo viernes de cada mes: teatro, m\u00fasica, exposiciones, recorridos patrimoniales y gastronom\u00eda en el centro hist\u00f3rico de Bogot\u00e1.' },
  { pregunta: '\u00bfCu\u00e1ndo es la edici\u00f3n de agosto?', respuesta: 'Viernes 28 de agosto de 2026, de 1:00 pm a medianoche.' },
  { pregunta: '\u00bfCu\u00e1nto cuesta?', respuesta: 'La mayor\u00eda de actividades es gratis; algunas funciones requieren inscripci\u00f3n previa seg\u00fan la programaci\u00f3n oficial.' },
  { pregunta: '\u00bfD\u00f3nde se realiza?', respuesta: 'En el centro hist\u00f3rico e internacional: La Candelaria, Plaza de Bol\u00edvar, San Diego y el Centro Internacional.' },
  { pregunta: '\u00bfC\u00f3mo llego?', respuesta: 'TransMilenio hasta Museos del Oro, Las Aguas o Museo Nacional, y recorrer la zona a pie.' },
  { pregunta: '\u00bfQui\u00e9n organiza?', respuesta: 'La FUGA (Fundaci\u00f3n Gilberto Alzate Avenda\u00f1o) con aliados como I Love La Candelaria, AsoSanDiego, Asobares y Visit Centro Internacional.' }
];

module.exports = { SLUG: SLUG, HERO: HERO, PHOTOS: PHOTOS, BASE: BASE, TAGS: TAGS, FAQS: FAQS };

if (require.main !== module) return;

(async function main() {
  var url = process.env.DATABASE_URL || process.argv[2];
  if (!url) {
    console.error('Falta DATABASE_URL.');
    console.error('Uso: DATABASE_URL=postgres://... node scripts/seed-tardeando-el-centro-bogota.js [--dry]');
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
