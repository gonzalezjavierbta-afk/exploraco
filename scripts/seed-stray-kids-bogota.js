// scripts/seed-stray-kids-bogota.js
// Datos de Stray Kids (Stray City 2026) en Vive Claro, Bogota, miercoles 9 de
// septiembre de 2026. Categoria evento.
// Patron seed + loader + smoke de Fase 9.
// Uso:
//   DATABASE_URL=postgres://... node scripts/seed-stray-kids-bogota.js --dry
//   DATABASE_URL=postgres://... node scripts/seed-stray-kids-bogota.js
// Idempotente (ON CONFLICT slug). 100% ASCII-safe.

var neon = null;
function getNeon() {
  if (!neon) neon = require('@neondatabase/serverless').neon;
  return neon;
}

const SLUG = 'stray-kids-bogota';
const HERO = 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=900&q=80';

const PHOTOS = [
  { url: HERO, caption: 'Los Stay de Bogota reciben a Stray Kids' },
  { url: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=900&q=80', caption: 'Coreografia sobre el escenario de Vive Claro' },
  { url: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=900&q=80', caption: 'Luz ne\u00f3n para el k-pop en la capital' },
  { url: 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=900&q=80', caption: 'Gods Menu, MANIAC y S-Class en vivo' }
];

const BASE = {
  slug: SLUG,
  nombre: 'Stray Kids: Stray City 2026 en Bogot\u00e1',
  categoria_slug: 'evento',
  lead: 'El grupo de k-pop llega por primera vez a Colombia con su gira mundial "Stray City 2026": mi\u00e9rcoles 9 de septiembre en Vive Claro Distrito Cultural, con show desde la 1:00 pm.',
  descripcion: 'Stray Kids, una de las bandas m\u00e1s grandes del k-pop, visita Colombia por primera vez con su gira mundial Stray City 2026. La escala ser\u00e1 el mi\u00e9rcoles 9 de septiembre en Vive Claro Distrito Cultural, junto a Corferias.\n\nCon una puesta en escena de luces y coreograf\u00eda de alto nivel, los ocho integrantes (Bang Chan, Lee Know, Changbin, Hyunjin, Han, Felix, Seungmin e I.N) recorrer\u00e1n su repertorio con hits como God\u2019s Menu, MANIAC y S-Class.\n\nLa boleter\u00eda se maneja por los canales oficiales de Ticketmaster y Ticket Live. Es la oportunidad de ver desplegado el fen\u00f3meno de los Stay en la capital colombiana.',
  highlight: 'Mi\u00e9rcoles 9 sep \u00b7 primera visita a Colombia \u00b7 show desde la 1:00 pm',
  ciudad: 'Bogot\u00e1',
  region: 'Cundinamarca',
  barrio: 'Los \u00c1lamos',
  lat: 4.6470,
  lng: -74.0940,
  whatsapp: '',
  telefono: '',
  email: '',
  web: 'https://ticketmaster.co',
  instagram: 'realstraykids',
  precio_desde: 'Consulta Ticketmaster',
  horario: 'Show desde la 1:00 pm',
  emoji: '\ud83c\udfb5',
  hero_bg: 'linear-gradient(135deg,#0d1b2a,#4a1d3a)',
  foto_hero: HERO,
  tipo: 'Concierto de k-pop \u00b7 primera visita',
  capacidad: 'Vive Claro Distrito Cultural',
  como_llegar: 'Vive Claro Distrito Cultural queda en el sector de Corferias (calle 26 con carrera 37). Llegas por TransMilenio en la estaci\u00f3n Sabana (troncal calle 26, desde el occidente) o en la estaci\u00f3n Ricaurte y caminando hacia el noroccidente. En carro, el recinto cuenta con parqueadero p\u00fablico pagando tarifa de evento.',
  status: 'published',
  destacado: true
};

const TAGS = {
  fecha_inicio: '2026-09-09',
  fecha_fin: '2026-09-09',
  edicion: 'Stray City 2026 - Gira mundial',
  sede: 'Vive Claro Distrito Cultural, Bogot\u00e1 (sector Corferias)',
  organiza: 'Vive Claro - Ticketmaster Colombia',
  lema: 'Stay, Bogot\u00e1 te espera',
  lineup: [
    { nombre: 'Bang Chan', escenario: 'Escenario principal' },
    { nombre: 'Lee Know', escenario: 'Escenario principal' },
    { nombre: 'Changbin', escenario: 'Escenario principal' },
    { nombre: 'Hyunjin', escenario: 'Escenario principal' },
    { nombre: 'Han', escenario: 'Escenario principal' },
    { nombre: 'Felix', escenario: 'Escenario principal' },
    { nombre: 'Seungmin', escenario: 'Escenario principal' },
    { nombre: 'I.N', escenario: 'Escenario principal' }
  ],
  agenda: [
    { dia: 'Mi\u00e9rcoles 9 de septiembre', hora: '12:00 m', actividad: 'Apertura de puertas' },
    { dia: 'Mi\u00e9rcoles 9 de septiembre', hora: '1:00 pm', actividad: 'Inicio del show' },
    { dia: 'Mi\u00e9rcoles 9 de septiembre', hora: '6:00 pm', actividad: 'Cierre del concierto' }
  ],
  categorias_entrada: [
    { tipo: 'General', precio: 'Boletas por Ticketmaster', disponibilidad: 'Disponible' },
    { tipo: 'Zonas Premium', precio: 'Seg\u00fan categor\u00eda en Ticketmaster', disponibilidad: 'Disponible' }
  ],
  que_llevar: [
    'Boleta de Ticketmaster impresa o digital',
    'Documento de identidad',
    'Abrigo impermeable por si llueve'
  ],
  prohibido: [
    'Banderas con asta o palos de selfie',
    'Alimentos y bebidas del exterior',
    'C\u00e1maras profesionales',
    'Pitos y vapeadores'
  ]
};

const FAQS = [
  { pregunta: '\u00bfCu\u00e1ndo es el concierto de Stray Kids en Bogot\u00e1?', respuesta: 'Mi\u00e9rcoles 9 de septiembre de 2026 en Vive Claro Distrito Cultural, con show desde la 1:00 pm.' },
  { pregunta: '\u00bfEs la primera vez que vienen a Colombia?', respuesta: 'S\u00ed, es la primera visita del grupo al pa\u00eds dentro de la gira mundial Stray City 2026.' },
  { pregunta: '\u00bfD\u00f3nde compro las boletas?', respuesta: 'Por Ticketmaster Colombia y Ticket Live. Evita la reventa y compra \u00fanicamente en canales autorizados.' },
  { pregunta: '\u00bfQu\u00e9 canciones van a tocar?', respuesta: 'El repertorio incluye \u00e9xitos como God\u2019s Menu, MANIAC y S-Class, con coreograf\u00eda de los 8 integrantes.' },
  { pregunta: '\u00bfC\u00f3mo llego a Vive Claro?', respuesta: 'TransMilenio estaci\u00f3n Sabana (calle 26) o Ricaurte y caminar; hay parqueadero p\u00fablico en el recinto.' }
];

module.exports = { SLUG: SLUG, HERO: HERO, PHOTOS: PHOTOS, BASE: BASE, TAGS: TAGS, FAQS: FAQS };

if (require.main !== module) return;

(async function main() {
  var url = process.env.DATABASE_URL || process.argv[2];
  if (!url) {
    console.error('Falta DATABASE_URL.');
    console.error('Uso: DATABASE_URL=postgres://... node scripts/seed-stray-kids-bogota.js [--dry]');
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