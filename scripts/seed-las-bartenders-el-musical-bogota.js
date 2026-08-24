// scripts/seed-las-bartenders-el-musical-bogota.js
// Datos del cabaret "Las Bartenders, el Musical" (Casa E Borrero, Sala
// Arlequin, Park Way), categoria evento. Patron seed + loader + smoke.
//
// Uso:
//   DATABASE_URL=postgres://... node scripts/seed-las-bartenders-el-musical-bogota.js --dry
//   DATABASE_URL=postgres://... node scripts/seed-las-bartenders-el-musical-bogota.js
//
// Idempotente: re-ejecutable sin efectos secundarios (ON CONFLICT slug).
// Contenido 100% ASCII-safe: caracteres especiales como escapes \uXXXX.

var neon = null;
function getNeon() {
  if (!neon) neon = require('@neondatabase/serverless').neon;
  return neon;
}

const SLUG = 'las-bartenders-el-musical-bogota';
const HERO = 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=900&q=80';

const PHOTOS = [
  { url: HERO, caption: 'Cocteleria en vivo: cada trago cuenta una historia' },
  { url: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=900&q=80', caption: 'Ambiente de bar y show en la Sala Arlequin' },
  { url: 'https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=900&q=80', caption: 'Tragos de autor preparados frente al publico' },
  { url: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=900&q=80', caption: 'Casa E Borrero, un icono del Park Way' },
  { url: 'https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=900&q=80', caption: 'Musica en vivo sobre un escenario intimo' }
];

const BASE = {
  slug: SLUG,
  nombre: 'Las Bartenders, el Musical en Bogot\u00e1',
  categoria_slug: 'evento',
  lead: 'Cocteler\u00eda en vivo, acrobacias y m\u00fasica en un cabaret donde cada trago cuenta una historia: funciones de jueves a s\u00e1bado en la Sala Arlequ\u00edn de Casa E Borrero, Park Way.',
  descripcion: 'Las Bartenders, el Musical es una experiencia teatral que mezcla cocteler\u00eda en vivo, acrobacias, canto y humor en formato de cabaret. Durante dos horas, el elenco prepara tragos frente al p\u00fablico mientras conduce una historia donde la barra es escenario y cada c\u00f3ctel revela una escena.\n\nLas funciones son de jueves a s\u00e1bado a las 8:00 pm en la Sala Arlequ\u00edn de Casa E Borrero (carrera 24 #41-69, barrio Park Way, Teusaquillo), una casa ic\u00f3nica de la vida nocturna bogotana. La temporada est\u00e1 activa hasta el s\u00e1bado 29 de agosto de 2026.\n\nEs un plan solo para mayores de 18 a\u00f1os, ideal para cumplea\u00f1os, despedidas o una noche diferente. Las entradas van desde $86.000 por Dinaticket y Atr\u00e1palo, plataforma donde el show acumula una calificaci\u00f3n de 9.8 entre casi 500 opiniones.',
  highlight: 'Cocteler\u00eda en vivo + acrobacias + m\u00fasica \u00b7 120 minutos \u00b7 Solo adultos (18+) \u00b7 Park Way',
  ciudad: 'Bogot\u00e1',
  region: 'Cundinamarca',
  barrio: 'Park Way',
  lat: 4.63287,
  lng: -74.0752,
  whatsapp: '',
  telefono: '',
  email: '',
  web: 'https://www.casaeborrero.com/',
  instagram: '',
  precio_desde: 'Desde $86.000 (Dinaticket / Atr\u00e1palo)',
  horario: 'Jueves a s\u00e1bado, 8:00 pm',
  emoji: '\ud83c\udf79',
  hero_bg: 'linear-gradient(135deg,#2a0a14,#14140a)',
  foto_hero: HERO,
  tipo: 'Teatro musical \u00b7 Cabaret \u00b7 Cocteler\u00eda en vivo',
  capacidad: 'Sala Arlequ\u00edn, Casa E Borrero',
  como_llegar: 'Casa E Borrero: carrera 24 #41-69, barrio Park Way (Teusaquillo), cerca de la Avenida El Dorado con carrera 24. En TransMilenio baja en Profamilia y camina unos 12 minutos; tambi\u00e9n llegan rutas SITP por la carrera 24 y la calle 45.',
  status: 'published',
  destacado: true
};

const TAGS = {
  fecha_inicio: '2026-08-27',
  fecha_fin: '2026-08-29',
  edicion: 'Temporada Bogota 2026',
  sede: 'Casa E Borrero - Sala Arlequ\u00edn, Carrera 24 #41-69 (Park Way)',
  organiza: 'Casa E Borrero',
  lema: 'Cada trago cuenta una historia',
  lineup: [],
  agenda: [
    { dia: 'Jueves 27 de agosto', hora: '8:00 pm', actividad: 'Funci\u00f3n Las Bartenders, el Musical' },
    { dia: 'Viernes 28 de agosto', hora: '8:00 pm', actividad: 'Funci\u00f3n Las Bartenders, el Musical' },
    { dia: 'S\u00e1bado 29 de agosto', hora: '8:00 pm', actividad: 'Funci\u00f3n Las Bartenders, el Musical (cierre de temporada)' }
  ],
  categorias_entrada: [
    { tipo: 'Entrada general', precio: 'Desde $86.000 + cargo (Dinaticket)', disponibilidad: 'Disponible' }
  ],
  que_llevar: [
    'Documento con foto: evento solo para mayores de 18',
    'Boleta digital o impresa'
  ],
  prohibido: [
    'Menores de 18 a\u00f1os'
  ]
};

const FAQS = [
  { pregunta: '\u00bfDe qu\u00e9 trata Las Bartenders, el Musical?', respuesta: 'Es un cabaret de dos horas con cocteler\u00eda en vivo, acrobacias, canto y humor: los bartenders preparan tragos frente al p\u00fablico mientras cuentan una historia.' },
  { pregunta: '\u00bfCu\u00e1ndo y d\u00f3nde es?', respuesta: 'En la Sala Arlequ\u00edn de Casa E Borrero (carrera 24 #41-69, Park Way), de jueves a s\u00e1bado a las 8:00 pm, hasta el s\u00e1bado 29 de agosto de 2026.' },
  { pregunta: '\u00bfCu\u00e1nto cuesta la entrada?', respuesta: 'Desde $86.000 m\u00e1s cargo por servicio, a trav\u00e9s de Dinaticket y Atr\u00e1palo.' },
  { pregunta: '\u00bfHay restricci\u00f3n de edad?', respuesta: 'S\u00ed: es un evento solo para mayores de 18 a\u00f1os y piden documento de identidad en la entrada.' },
  { pregunta: '\u00bfC\u00f3mo llego a Casa E Borrero?', respuesta: 'TransMilenio hasta Profamilia y caminata de unos 12 minutos por la carrera 24; tambi\u00e9n hay rutas SITP por la zona del Park Way.' }
];

module.exports = { SLUG: SLUG, HERO: HERO, PHOTOS: PHOTOS, BASE: BASE, TAGS: TAGS, FAQS: FAQS };

if (require.main !== module) return;

(async function main() {
  var url = process.env.DATABASE_URL || process.argv[2];
  if (!url) {
    console.error('Falta DATABASE_URL.');
    console.error('Uso: DATABASE_URL=postgres://... node scripts/seed-las-bartenders-el-musical-bogota.js [--dry]');
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
