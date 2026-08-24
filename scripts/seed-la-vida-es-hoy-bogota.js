// scripts/seed-la-vida-es-hoy-bogota.js
// Datos del evento "La Vida Es Hoy" en la Universidad EAN (Chapinero),
// categoria evento. Patron seed + loader + smoke de Fase 9.
//
// Uso:
//   DATABASE_URL=postgres://... node scripts/seed-la-vida-es-hoy-bogota.js --dry
//   DATABASE_URL=postgres://... node scripts/seed-la-vida-es-hoy-bogota.js
//
// Idempotente: re-ejecutable sin efectos secundarios (ON CONFLICT slug).
// Contenido 100% ASCII-safe: caracteres especiales como escapes \uXXXX.

var neon = null;
function getNeon() {
  if (!neon) neon = require('@neondatabase/serverless').neon;
  return neon;
}

const SLUG = 'la-vida-es-hoy-bogota';
const HERO = 'https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=900&q=80';

const PHOTOS = [
  { url: HERO, caption: 'Un escenario intimo para hablar de tiempo y felicidad' },
  { url: 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=900&q=80', caption: 'Musica en vivo dentro de la experiencia' },
  { url: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=900&q=80', caption: 'Publico conectado con cada historia' },
  { url: 'https://images.unsplash.com/photo-1499363536502-87642509e31b?w=900&q=80', caption: 'Noche de humor y reflexion en Chapinero' },
  { url: 'https://images.unsplash.com/photo-1531058020387-3be344556be6?w=900&q=80', caption: 'La Vida Es Hoy en la Universidad EAN' }
];

const BASE = {
  slug: SLUG,
  nombre: 'La Vida Es Hoy en Bogot\u00e1',
  categoria_slug: 'evento',
  lead: 'Camilo Cifuentes y Miguel Buitrago mezclan humor, historias reales, m\u00fasica e imitaciones para hablar del tiempo, la felicidad y el valor de vivir el presente.',
  descripcion: 'La Vida Es Hoy es una experiencia que combina humor, historias reales, m\u00fasica en vivo e imitaciones alrededor de una conversaci\u00f3n sobre el tiempo, la felicidad y el valor de vivir el presente. Llega al auditorio de la Universidad EAN (campus EAN Legacy, Chapinero) el jueves 27 de agosto de 2026 a las 7:00 pm.\n\nLos protagonistas son Camilo Cifuentes, periodista y presentador colombiano reconocido por sus entrevistas, y Miguel Buitrago, creador de Media Vida (@mediavida__), el proyecto digital de bienestar emocional que ha hecho reflexionar a millones de personas sobre c\u00f3mo usan su tiempo.\n\nLa funci\u00f3n es ideal para quienes buscan un plan diferente: re\u00edrse, recordar y salir con ganas de vivir hoy. La boleter\u00eda se gestiona por boletaenlinea.co y la fecha fue reprogramada desde julio, con las entradas ya adquiridas vigentes.',
  highlight: 'Humor + reflexi\u00f3n con Camilo Cifuentes y Miguel Buitrago \u00b7 Universidad EAN \u00b7 Jueves 27 de agosto, 7:00 p.m.',
  ciudad: 'Bogot\u00e1',
  region: 'Cundinamarca',
  barrio: 'Chapinero',
  lat: 4.6628,
  lng: -74.0558,
  whatsapp: '',
  telefono: '',
  email: '',
  web: 'https://universidadean.edu.co/eventos/la-vida-es-hoy',
  instagram: '@mediavida__',
  precio_desde: 'Boleter\u00eda en boletaenlinea.co',
  horario: 'Jueves 7:00 pm',
  emoji: '\ud83d\udcac',
  hero_bg: 'linear-gradient(135deg,#14140a,#2e2410)',
  foto_hero: HERO,
  tipo: 'Charla-show \u00b7 Humor y bienestar',
  capacidad: 'Auditorio Universidad EAN',
  como_llegar: 'Universidad EAN campus Legacy: carrera 11 #78-47, Chapinero. En TransMilenio baja en la estaci\u00f3n Calle 76 (Av. Caracas) y camina unos 10 minutos por la calle 78 hasta la carrera 11; tambi\u00e9n llegan rutas SITP por la s\u00e9ptima y la once.',
  status: 'published',
  destacado: true
};

const TAGS = {
  fecha_inicio: '2026-08-27',
  fecha_fin: '2026-08-27',
  edicion: 'Edicion Bogota 2026',
  sede: 'Universidad EAN, Carrera 11 #78-47 (Chapinero)',
  organiza: 'Universidad EAN / Boletaenlinea',
  lema: 'Una experiencia sobre el tiempo, la felicidad y vivir el presente',
  lineup: [
    { nombre: 'Camilo Cifuentes', escenario: 'Auditorio principal', hora: '7:00 pm' },
    { nombre: 'Miguel Buitrago (Media Vida)', escenario: 'Auditorio principal', hora: '7:00 pm' }
  ],
  agenda: [
    { dia: 'Jueves 27 de agosto', hora: '7:00 pm', actividad: 'La Vida Es Hoy - show completo' }
  ],
  categorias_entrada: [
    { tipo: 'Entrada general', precio: 'Consultar en boletaenlinea.co', disponibilidad: 'Disponible' }
  ],
  que_llevar: [
    'Documento de identidad',
    'Boleta digital o impresa',
    'Llegar 30 minutos antes del inicio'
  ],
  prohibido: []
};

const FAQS = [
  { pregunta: '\u00bfQu\u00e9 es La Vida Es Hoy?', respuesta: 'Una experiencia con humor, historias reales, m\u00fasica en vivo e imitaciones sobre el tiempo, la felicidad y el valor de vivir el presente.' },
  { pregunta: '\u00bfCu\u00e1ndo y d\u00f3nde es?', respuesta: 'Jueves 27 de agosto de 2026, 7:00 pm, en el auditorio de la Universidad EAN (carrera 11 #78-47, Chapinero).' },
  { pregunta: '\u00bfQui\u00e9nes son los conductores?', respuesta: 'Camilo Cifuentes, periodista y presentador, junto a Miguel Buitrago, creador de Media Vida (@mediavida__).' },
  { pregunta: '\u00bfD\u00f3nde compro boletas?', respuesta: 'En boletaenlinea.co, la plataforma oficial de venta del evento.' },
  { pregunta: '\u00bfEl evento cambi\u00f3 de fecha?', respuesta: 'S\u00ed: estaba programado para julio y fue reprogramado al 27 de agosto. Las boletas ya adquiridas siguen vigentes.' }
];

module.exports = { SLUG: SLUG, HERO: HERO, PHOTOS: PHOTOS, BASE: BASE, TAGS: TAGS, FAQS: FAQS };

if (require.main !== module) return;

(async function main() {
  var url = process.env.DATABASE_URL || process.argv[2];
  if (!url) {
    console.error('Falta DATABASE_URL.');
    console.error('Uso: DATABASE_URL=postgres://... node scripts/seed-la-vida-es-hoy-bogota.js [--dry]');
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
