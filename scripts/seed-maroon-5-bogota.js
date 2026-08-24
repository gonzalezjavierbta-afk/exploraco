// scripts/seed-maroon-5-bogota.js
// Datos del concierto de Maroon 5 en Bogota (Love Is Like Tour, Coliseo
// MedPlus), categoria evento. Patron seed + loader + smoke de Fase 9.
//
// Uso:
//   DATABASE_URL=postgres://... node scripts/seed-maroon-5-bogota.js --dry
//   DATABASE_URL=postgres://... node scripts/seed-maroon-5-bogota.js
//
// Idempotente: re-ejecutable sin efectos secundarios (ON CONFLICT slug).
// Contenido 100% ASCII-safe: caracteres especiales como escapes \uXXXX.

var neon = null;
function getNeon() {
  if (!neon) neon = require('@neondatabase/serverless').neon;
  return neon;
}

const SLUG = 'maroon-5-bogota';
const HERO = 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=900&q=80';

const PHOTOS = [
  { url: HERO, caption: 'Maroon 5 en concierto: Adam Levine frente a miles de fans' },
  { url: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=900&q=80', caption: 'Noche de pop global en un recinto lleno' },
  { url: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=900&q=80', caption: 'Produccion de gran formato y luces de arena' },
  { url: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=900&q=80', caption: 'Musica en vivo ante el publico colombiano' },
  { url: 'https://images.unsplash.com/photo-1531058020387-3be344556be6?w=900&q=80', caption: 'Concierto multitudinario en Bogota' }
];

const BASE = {
  slug: SLUG,
  nombre: 'Maroon 5 en Bogot\u00e1: Love Is Like Tour',
  categoria_slug: 'evento',
  lead: 'Adam Levine y Maroon 5 vuelven a Colombia tras m\u00e1s de una d\u00e9cada: una noche de pop global con sus grandes \u00e9xitos en el Coliseo MedPlus, el recinto cubierto m\u00e1s grande del pa\u00eds.',
  descripcion: 'Maroon 5, una de las bandas de pop rock m\u00e1s exitosas del siglo XXI, regresa a Colombia despu\u00e9s de m\u00e1s de diez a\u00f1os de ausencia con su gira mundial Love Is Like Tour. El concierto ser\u00e1 el jueves 27 de agosto de 2026 en el Coliseo MedPlus (Calle 80 km 1.5, v\u00eda Cota), el escenario cubierto m\u00e1s grande del pa\u00eds con capacidad para m\u00e1s de 24.000 personas. Las puertas abren a las 4:00 pm y el show inicia a las 9:00 pm.\n\nLa gira promociona Love Is Like, el octavo \u00e1lbum de estudio de la banda, y llega a Bogot\u00e1 dentro del tramo latinoamericano que tambi\u00e9n incluye Quito, Buenos Aires y S\u00e3o Paulo. La fecha original del 25 de abril fue reprogramada al 27 de agosto y las boletas ya adquiridas siguen vigentes.\n\nEl repertorio recorre dos d\u00e9cadas de \u00e9xitos: desde los cl\u00e1sicos de Songs About Jane (2002) como This Love y She Will Be Loved, pasando por Moves Like Jagger, Sugar, Girls Like You y Memories, hasta el material nuevo. La banda suma tres premios Grammy, m\u00e1s de 96 millones de \u00e1lbumes vendidos y certificaciones de oro y platino en m\u00e1s de 35 pa\u00edses.\n\nLa boleter\u00eda se vende exclusivamente por TaquillaLive, ticketera oficial del evento organizado por P\u00e1ramo Presenta. La edad m\u00ednima es de 14 a\u00f1os. Por la ubicaci\u00f3n del coliseo en la zona industrial de Siberia (municipio de Cota), se recomienda salir con anticipaci\u00f3n y revisar las opciones de transporte antes y despu\u00e9s del show.',
  highlight: 'Regreso tras m\u00e1s de 10 a\u00f1os \u00b7 Coliseo MedPlus (24.000 personas) \u00b7 De This Love y Sugar al nuevo \u00e1lbum Love Is Like',
  ciudad: 'Bogot\u00e1',
  region: 'Cundinamarca',
  barrio: '',
  lat: 4.7381,
  lng: -74.132,
  whatsapp: '',
  telefono: '',
  email: '',
  web: 'https://www.taquillalive.com/performance-details/?artist=maroon-5&event=TCL.EVN1153.PRF1',
  instagram: '@maroon5',
  precio_desde: 'Desde $294.000 (Etapa 1 + cargo por servicio)',
  horario: 'Puertas 4:00 pm - Show 9:00 pm',
  emoji: '\ud83c\udfa4',
  hero_bg: 'linear-gradient(135deg,#0a0a2a,#2a0a3a)',
  foto_hero: HERO,
  tipo: 'Concierto \u00b7 Pop rock \u00b7 Gira mundial',
  capacidad: 'Coliseo MedPlus hasta 24.000 personas',
  como_llegar: 'Coliseo MedPlus: Calle 80 km 1.5, v\u00eda Cota (zona industrial de Siberia). En TransMilenio hasta el Portal 80 y transbordo a ruta rural; alternativas: ruta D81 hasta Puente de Guadua o alimentador 1-4 Cortijo. En carro por la autopista Bogot\u00e1-Medell\u00edn, con parqueaderos aliados CityParking (m\u00e1s de 3.000 cupos). Tras el show hay alta demanda de transporte: planifica el regreso.',
  status: 'published',
  destacado: true
};

const TAGS = {
  fecha_inicio: '2026-08-27',
  fecha_fin: '2026-08-27',
  edicion: 'Love Is Like Tour',
  sede: 'Coliseo MedPlus, Calle 80 km 1.5 v\u00eda Cota (Cundinamarca)',
  organiza: 'P\u00e1ramo Presenta / TaquillaLive',
  lema: 'Dos d\u00e9cadas de \u00e9xitos del pop global en una sola noche',
  lineup: [
    { nombre: 'Maroon 5', escenario: 'Escenario principal', hora: '9:00 pm' }
  ],
  agenda: [
    { dia: 'Jueves 27 de agosto', hora: '4:00 pm', actividad: 'Apertura de puertas' },
    { dia: 'Jueves 27 de agosto', hora: '9:00 pm', actividad: 'Concierto Maroon 5 - Love Is Like Tour' }
  ],
  categorias_entrada: [
    { tipo: 'Localidades 115-120', precio: '$671.000 total (Etapa 1)', disponibilidad: 'Disponible' },
    { tipo: 'Localidades 113-114', precio: '$589.000 total (Etapa 1)', disponibilidad: 'Disponible' },
    { tipo: 'Platea 1', precio: '$530.000 total (Etapa 1)', disponibilidad: 'Disponible' },
    { tipo: 'Localidades 109-112', precio: '$471.000 total (Etapa 1)', disponibilidad: 'Disponible' },
    { tipo: 'Localidades 100-104', precio: '$412.000 total (Etapa 1)', disponibilidad: 'Disponible' },
    { tipo: 'Platea 2', precio: '$329.000 total (Etapa 1)', disponibilidad: 'Disponible' },
    { tipo: 'Localidades 105-108', precio: '$294.000 total (Etapa 1)', disponibilidad: 'Disponible' }
  ],
  que_llevar: [
    'Documento de identidad (edad m\u00ednima 14 a\u00f1os)',
    'Boleta digital: el PDF se habilita cerca del evento',
    'Abrigo o chaqueta: las noches son fr\u00edas en la sabana',
    'Efectivo o tarjeta para alimentos y souvenirs',
    'Llegar con anticipaci\u00f3n por la movilidad de la v\u00eda Cota'
  ],
  prohibido: [
    'C\u00e1maras profesionales o de video',
    'Bebidas y alimentos externos',
    'Armas de cualquier tipo',
    'Objetos contundentes o punzantes'
  ]
};

const FAQS = [
  { pregunta: '\u00bfCu\u00e1ndo y d\u00f3nde es el concierto de Maroon 5?', respuesta: 'Jueves 27 de agosto de 2026 en el Coliseo MedPlus (Calle 80 km 1.5, v\u00eda Cota). Puertas 4:00 pm y show 9:00 pm.' },
  { pregunta: '\u00bfD\u00f3nde compro las boletas?', respuesta: 'En TaquillaLive (taquillalive.com), la ticketera oficial. Los PDF de las entradas se habilitan cerca del evento desde tu cuenta.' },
  { pregunta: '\u00bfCu\u00e1nto cuestan las boletas?', respuesta: 'En Etapa 1 van desde $294.000 hasta $671.000 incluyendo cargo por servicio seg\u00fan localidad; en Etapa 2 cada localidad sube $60.000.' },
  { pregunta: '\u00bfC\u00f3mo llego al Coliseo MedPlus?', respuesta: 'TransMilenio hasta Portal 80 y transbordo a ruta rural, o carro por la autopista Bogot\u00e1-Medell\u00edn con parqueaderos aliados (m\u00e1s de 3.000 cupos).' },
  { pregunta: '\u00bfHay restricci\u00f3n de edad?', respuesta: 'S\u00ed, la edad m\u00ednima es de 14 a\u00f1os.' },
  { pregunta: '\u00bfEl evento cambi\u00f3 de fecha?', respuesta: 'S\u00ed: estaba programado para el 25 de abril y se reprogram\u00f3 al 27 de agosto. Las boletas originales siguen vigentes.' }
];

module.exports = { SLUG: SLUG, HERO: HERO, PHOTOS: PHOTOS, BASE: BASE, TAGS: TAGS, FAQS: FAQS };

if (require.main !== module) return;

(async function main() {
  var url = process.env.DATABASE_URL || process.argv[2];
  if (!url) {
    console.error('Falta DATABASE_URL.');
    console.error('Uso: DATABASE_URL=postgres://... node scripts/seed-maroon-5-bogota.js [--dry]');
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
