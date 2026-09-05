// scripts/seed-parranda-vallenata-barranquilla.js
// Datos de la Parranda Vallenata con Samuel Morales y Jaime Luis Campillo
// en TRUQ Music Hall, Barranquilla, sabado 5 de septiembre de 2026.
// Patron seed + loader + smoke de Fase 9.
// Uso:
//   DATABASE_URL=postgres://... node scripts/seed-parranda-vallenata-barranquilla.js --dry
//   DATABASE_URL=postgres://... node scripts/seed-parranda-vallenata-barranquilla.js
// Idempotente (ON CONFLICT slug). 100% ASCII-safe.

var neon = null;
function getNeon() {
  if (!neon) neon = require('@neondatabase/serverless').neon;
  return neon;
}

const SLUG = 'parranda-vallenata-barranquilla';
const HERO = 'https://images.unsplash.com/photo-1509281373149-e957c6296406?w=900&q=80';

const PHOTOS = [
  { url: HERO, caption: 'Voz, acorde\u00f3n y caja en la noche barranquillera' },
  { url: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=900&q=80', caption: 'Ambiente musical en TRUQ Music Hall' },
  { url: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=900&q=80', caption: 'El p\u00fablico prendido al vallenato' },
  { url: 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=900&q=80', caption: 'Barranquilla le da la bienvenida a la tradici\u00f3n' }
];

const BASE = {
  slug: SLUG,
  nombre: 'Parranda Vallenata: Samuel Morales y Jaime Luis Campillo en Barranquilla',
  categoria_slug: 'evento',
  lead: 'El Rey Vallenato Jaime Luis Campillo acompa\u00f1a a Samuel Morales, "El Heredero", en la velada de parranda vallenata del s\u00e1bado 5 de septiembre en TRUQ Music Hall, abriendo el mes de Amor y Amistad en Barranquilla.',
  descripcion: 'La tradici\u00f3n vallenata toma la capital del Atl\u00e1ntico con una parranda en vivo protagonizada por Samuel Morales, apodado "El Heredero", quien llega acompa\u00f1ado al acorde\u00f3n del cantante Jaime Luis Campillo, ganador del Festival de la Leyenda Vallenata.\n\nLa cita es el s\u00e1bado 5 de septiembre en TRUQ Music Hall, el escenario que marca el arranque del mes de Amor y Amistad en Barranquilla con una agenda de conciertos y parrandas.\n\nLa velada hace homenaje al canto tradicional del Magdalena Grande: paseo, son y merengue en formato de parranda, con entrada libre seg\u00fan la programaci\u00f3n anunciada por la casa. Consulta en TRUQ los palcos y la boleter\u00eda preferencial.',
  highlight: 'Entrada libre \u00b7 parranda vallenata en vivo para abrir Amor y Amistad',
  ciudad: 'Barranquilla',
  region: 'Atl\u00e1ntico',
  barrio: 'Norte',
  lat: 11.0065,
  lng: -74.8096,
  whatsapp: '',
  telefono: '',
  email: '',
  web: '',
  instagram: '',
  precio_desde: 'Gratis',
  horario: 'Noche vallenata - desde las 8:00 pm',
  emoji: '\ud83e\ude98',
  hero_bg: 'linear-gradient(135deg,#5c1a11,#1b2a41)',
  foto_hero: HERO,
  tipo: 'Velada vallenata en vivo',
  capacidad: 'TRUQ Music Hall',
  como_llegar: 'TRUQ Music Hall queda en el norte de Barranquilla, zona de rumba de la carrera 53 / calle 76. Llega en taxi (muy econ\u00f3mico en la ciudad) o en trasporte particular; la zona cuenta con parqueaderos cercanos. Si vienes de otras ciudades, la Terminal Metropolitana est\u00e1 a 25 minutos.',
  status: 'published',
  destacado: true
};

const TAGS = {
  fecha_inicio: '2026-09-05',
  fecha_fin: '2026-09-05',
  edicion: 'Mes de Amor y Amistad - Apertura en TRUQ',
  sede: 'TRUQ Music Hall, Barranquilla (Atl\u00e1ntico)',
  organiza: 'TRUQ',
  lema: 'Voz, acorde\u00f3n y caja prendidos',
  lineup: [
    { nombre: 'Samuel Morales (El Heredero) - voz', escenario: 'Escenario principal' },
    { nombre: 'Jaime Luis Campillo - acorde\u00f3n y canto', escenario: 'Escenario principal' },
    { nombre: 'Banda de parranda en vivo', escenario: 'Escenario principal' }
  ],
  agenda: [
    { dia: 'S\u00e1bado 5 de septiembre', hora: '7:00 pm', actividad: 'Apertura de puertas' },
    { dia: 'S\u00e1bado 5 de septiembre', hora: '8:00 pm', actividad: 'Inicio de la parranda vallenata' },
    { dia: 'S\u00e1bado 5 de septiembre', hora: '11:30 pm', actividad: 'Cierre de la velada' }
  ],
  categorias_entrada: [
    { tipo: 'Entrada general', precio: 'Gratis', disponibilidad: 'Entrada libre' },
    { tipo: 'Palcos y zonas preferenciales', precio: 'Informaci\u00f3n en TRUQ', disponibilidad: 'Consultar' }
  ],
  que_llevar: [
    'Documento de identidad para el ingreso',
    'Ganas de bailar vallenato toda la noche',
    'Efectivo o tarjeta para la barra'
  ],
  prohibido: [
    'Ingreso de bebidas y alimentos del exterior',
    'Menores de edad sin compa\u00f1\u00eda adulta',
    'Objetos contundentes'
  ]
};

const FAQS = [
  { pregunta: '\u00bfCu\u00e1ndo es la Parranda Vallenata en Barranquilla?', respuesta: 'S\u00e1bado 5 de septiembre de 2026 en TRUQ Music Hall, desde las 8:00 pm.' },
  { pregunta: '\u00bfQui\u00e9nes se presentan?', respuesta: 'Samuel Morales, "El Heredero", con el acorde\u00f3n de Jaime Luis Campillo, Rey Vallenato, en formato de parranda.' },
  { pregunta: '\u00bfCu\u00e1l es el costo?', respuesta: 'La entrada general es libre (gratis) seg\u00fan la programaci\u00f3n anunciada; palcos y zonas preferenciales se consultan directamente en TRUQ.' },
  { pregunta: '\u00bfEs apto para menores?', respuesta: 'Es una parranda en un establecimiento nocturno; los menores deben ingresar con compa\u00f1\u00eda de un adulto responsable.' },
  { pregunta: '\u00bfD\u00f3nde queda TRUQ?', respuesta: 'En el norte de Barranquilla, sector de la carrera 53 / calle 76, con parqueaderos cercanos.' }
];

module.exports = { SLUG: SLUG, HERO: HERO, PHOTOS: PHOTOS, BASE: BASE, TAGS: TAGS, FAQS: FAQS };

if (require.main !== module) return;

(async function main() {
  var url = process.env.DATABASE_URL || process.argv[2];
  if (!url) {
    console.error('Falta DATABASE_URL.');
    console.error('Uso: DATABASE_URL=postgres://... node scripts/seed-parranda-vallenata-barranquilla.js [--dry]');
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