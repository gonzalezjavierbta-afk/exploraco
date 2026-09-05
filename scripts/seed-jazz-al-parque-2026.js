// scripts/seed-jazz-al-parque-2026.js
// Datos de Jazz al Parque edicion 29 (12 y 13 de septiembre de 2026, Parque El
// Country, Bogota), dedicada al jazz latinoamericano. Categoria evento.
// Patron seed + loader + smoke de Fase 9.
// Uso:
//   DATABASE_URL=postgres://... node scripts/seed-jazz-al-parque-2026.js --dry
//   DATABASE_URL=postgres://... node scripts/seed-jazz-al-parque-2026.js
// Idempotente (ON CONFLICT slug). 100% ASCII-safe.

var neon = null;
function getNeon() {
  if (!neon) neon = require('@neondatabase/serverless').neon;
  return neon;
}

const SLUG = 'jazz-al-parque-2026';
const HERO = 'https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=900&q=80';

const PHOTOS = [
  { url: HERO, caption: 'Saxofon al atardecer en el Parque El Country' },
  { url: 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=900&q=80', caption: 'Clarinete y conversaciones de jazz' },
  { url: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=900&q=80', caption: 'El Country se llena de musica' },
  { url: 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=900&q=80', caption: 'La salsa y el latin jazz suenan gratis en Bogota' }
];

const BASE = {
  slug: SLUG,
  nombre: 'Jazz al Parque 2026: Bogot\u00e1 se encuentra con el jazz latinoamericano',
  categoria_slug: 'evento',
  lead: 'La edici\u00f3n 29 del festival gratuito con m\u00e1s tradici\u00f3n de los Festivales al Parque re\u00fane 17 agrupaciones de Am\u00e9rica Latina y Colombia el 12 y 13 de septiembre en el Parque El Country.',
  descripcion: 'Jazz al Parque celebra su edici\u00f3n 29 dedicada al jazz latinoamericano, con 17 agrupaciones de pa\u00edses como Cuba, M\u00e9xico, Brasil y Estados Unidos, adem\u00e1s de las bandas de la escena nacional y distrital.\n\nEl tel\u00f3n lo abre la Afro Latin Jazz Orchestra del maestro Arturo O\u2019Farrill; tambi\u00e9n pasar\u00e1n por el escenario Cimafunk y La Tribu (Cuba), Iraida Noriega (M\u00e9xico), Uli Costa AfroSambaJazz (Brasil), BALTA y Tlapaler\u00eda Don Chuy (M\u00e9xico).\n\nDe Colombia llegan Domingo S\u00e1nchez (Barranquilla), Madera Jazz Classic (Medell\u00edn) y Ricardo Gallo Cuarteto (Bogot\u00e1), junto a la selecci\u00f3n distrital con Urpi Barco, Solange Prat, Masato, fatso, Dorado Kandua y Daniel Gonz\u00e1lez Rodr\u00edguez.\n\nLa entrada es libre y gratuita para todas las jornadas, que inician desde la 1:00 pm y van hasta las 9:00 pm, en el Parque El Country (Usaqu\u00e9n).',
  highlight: '29\u00aa edici\u00f3n \u00b7 17 agrupaciones \u00b7 gratis \u00b7 el jazz de Am\u00e9rica Latina',
  ciudad: 'Bogot\u00e1',
  region: 'Cundinamarca',
  barrio: 'Usaqu\u00e9n',
  lat: 4.6706,
  lng: -74.0705,
  whatsapp: '',
  telefono: '',
  email: '',
  web: 'https://jazzalparque.gov.co',
  instagram: 'idartes',
  precio_desde: 'Gratis',
  horario: 'Conciertos desde la 1:00 pm hasta las 9:00 pm',
  emoji: '\ud83c\udfb7',
  hero_bg: 'linear-gradient(135deg,#1c1c2a,#3a0f3a)',
  foto_hero: HERO,
  tipo: 'Festival de jazz gratuito \u00b7 edici\u00f3n 29',
  capacidad: 'Parque El Country (Usaqu\u00e9n)',
  como_llegar: 'El Parque El Country queda en la calle 120 #9-10 (Av. 9\u00aa con calle 120), Usaqu\u00e9n. Se llega caminando desde la estaci\u00f3n Calle 127 de TransMilenio (troncal Caracas) o con alimentadores; tambi\u00e9n hay acceso en bicicleta por la Cicloruta de la calle 127. Los parqueaderos cercanos se llenan temprano: llega en transporte p\u00fablico.',
  status: 'published',
  destacado: true
};

const TAGS = {
  fecha_inicio: '2026-09-12',
  fecha_fin: '2026-09-13',
  edicion: 'Edici\u00f3n 29 - Jazz latinoamericano',
  sede: 'Parque El Country, Bogot\u00e1 (Av. 9\u00aa con calle 120)',
  organiza: 'Instituto Distrital de las Artes (Idartes)',
  lema: 'Bogot\u00e1 se encuentra con el jazz latinoamericano',
  lineup: [
    { nombre: 'Afro Latin Jazz Orchestra - Arturo O\u2019Farrill', escenario: 'Escenario principal' },
    { nombre: 'Cimafunk y La Tribu (Cuba)', escenario: 'Escenario principal' },
    { nombre: 'Iraida Noriega (M\u00e9xico)', escenario: 'Escenario principal' },
    { nombre: 'Uli Costa AfroSambaJazz (Brasil)', escenario: 'Escenario principal' },
    { nombre: 'BALTA (M\u00e9xico)', escenario: 'Escenario principal' },
    { nombre: 'Tlapaler\u00eda Don Chuy (M\u00e9xico)', escenario: 'Escenario principal' },
    { nombre: 'Domingo S\u00e1nchez (Barranquilla)', escenario: 'Escenario principal' },
    { nombre: 'Madera Jazz Classic (Medell\u00edn)', escenario: 'Escenario principal' },
    { nombre: 'Ricardo Gallo Cuarteto (Bogot\u00e1)', escenario: 'Escenario principal' },
    { nombre: 'Urpi Barco', escenario: 'Escenario principal' },
    { nombre: 'Solange Prat', escenario: 'Escenario principal' },
    { nombre: 'Masato', escenario: 'Escenario principal' },
    { nombre: 'fatsO', escenario: 'Escenario principal' },
    { nombre: 'Dorado Kandua', escenario: 'Escenario principal' },
    { nombre: 'Daniel Gonz\u00e1lez Rodr\u00edguez', escenario: 'Escenario principal' }
  ],
  agenda: [
    { dia: 'S\u00e1bado 12 de septiembre', hora: '11:00 am', actividad: 'Apertura de puertas del parque' },
    { dia: 'S\u00e1bado 12 de septiembre', hora: '1:00 pm', actividad: 'Inicio de los conciertos' },
    { dia: 'S\u00e1bado 12 de septiembre', hora: '9:00 pm', actividad: 'Cierre de jornada' },
    { dia: 'Domingo 13 de septiembre', hora: '11:00 am', actividad: 'Apertura de puertas del parque' },
    { dia: 'Domingo 13 de septiembre', hora: '1:00 pm', actividad: 'Inicio de los conciertos' },
    { dia: 'Domingo 13 de septiembre', hora: '9:00 pm', actividad: 'Cierre del festival' }
  ],
  categorias_entrada: [
    { tipo: 'Entrada a todos los conciertos', precio: 'Gratis', disponibilidad: 'Entrada libre' }
  ],
  que_llevar: [
    'Impermeable o carpa para el aguacero de la tarde',
    'Lonas y sudadera para la gramilla',
    'Agua y snacks (sin envases de vidrio)'
  ],
  prohibido: [
    'Sombrillas y palos de selfie',
    'Envases de vidrio y bebidas alcoh\u00f3licas',
    'Pitos, vapeadores y l\u00e1seres'
  ]
};

const FAQS = [
  { pregunta: '\u00bfCu\u00e1ndo es Jazz al Parque 2026?', respuesta: 'S\u00e1bado 12 y domingo 13 de septiembre de 2026 en el Parque El Country. Conciertos desde la 1:00 pm hasta las 9:00 pm.' },
  { pregunta: '\u00bfCu\u00e1nto cuesta la entrada?', respuesta: 'Es gratis: todos los conciertos son de entrada libre hasta completar el aforo del parque.' },
  { pregunta: '\u00bfQui\u00e9nes se presentan?', respuesta: '17 agrupaciones: la Afro Latin Jazz Orchestra de Arturo O\u2019Farrill, Cimafunk y La Tribu, Iraida Noriega, Uli Costa, BALTA, m\u00e1s la escena nacional y distrital.' },
  { pregunta: '\u00bfQu\u00e9 puedo llevar?', respuesta: 'Impermeable, carpa de lluvia y lonas. Est\u00e1n prohibidos los envases de vidrio, sombrillas y l\u00e1seres.' },
  { pregunta: '\u00bfC\u00f3mo llego al Parque El Country?', respuesta: 'TransMilenio hasta la estaci\u00f3n Calle 127 y caminar hacia la Av. 9\u00aa, o en bici por la ciclorruta. Los parqueaderos se llenan temprano.' }
];

module.exports = { SLUG: SLUG, HERO: HERO, PHOTOS: PHOTOS, BASE: BASE, TAGS: TAGS, FAQS: FAQS };

if (require.main !== module) return;

(async function main() {
  var url = process.env.DATABASE_URL || process.argv[2];
  if (!url) {
    console.error('Falta DATABASE_URL.');
    console.error('Uso: DATABASE_URL=postgres://... node scripts/seed-jazz-al-parque-2026.js [--dry]');
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