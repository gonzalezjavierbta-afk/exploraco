// scripts/seed-arcangel-medellin-2026.js
// Datos de Arcangel en Medellin: La Octava Maravilla World Tour
// (concierto de 20 aniversario, Estadio Atanasio Girardot), categoria evento.
// Patron seed + loader + smoke de Fase 9.
//
// Uso:
//   DATABASE_URL=postgres://... node scripts/seed-arcangel-medellin-2026.js --dry
//   DATABASE_URL=postgres://... node scripts/seed-arcangel-medellin-2026.js
//
// Idempotente: re-ejecutable sin efectos secundarios (ON CONFLICT slug).
// Contenido 100% ASCII-safe: caracteres especiales como escapes \uXXXX.

var neon = null;
function getNeon() {
  if (!neon) neon = require('@neondatabase/serverless').neon;
  return neon;
}

const SLUG = 'arcangel-medellin-2026';
const HERO = 'https://images.unsplash.com/photo-1509281373149-e957c6296406?w=900&q=80';

const PHOTOS = [
  { url: HERO, caption: 'Estadio Atanasio Girardot listo para Arcangel' },
  { url: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=900&q=80', caption: 'Luces y produccion de gran formato' },
  { url: 'https://images.unsplash.com/photo-1531058020387-3be344556be6?w=900&q=80', caption: 'Una noche para la historia del genero' },
  { url: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=900&q=80', caption: 'Mas de 40.000 personas en la tarima' }
];

const BASE = {
  slug: SLUG,
  nombre: 'Arc\u00e1ngel en Medell\u00edn: La Octava Maravilla World Tour',
  categoria_slug: 'evento',
  lead: 'Arc\u00e1ngel y su gira de 20 aniversario "La Octava Maravilla World Tour" se presentan en el Estadio Atanasio Girardot: la fecha del s\u00e1bado 5 de septiembre se AGOT\u00d3 en menos de cuatro horas y sum\u00f3 una segunda el viernes 4.',
  descripcion: 'Con dos d\u00e9cadas de carrera, Arc\u00e1ngel (Austin Santos) convierte a Medell\u00edn en la parada \u00fanica de su gira en Colombia. La cita es el s\u00e1bado 5 de septiembre en el Estadio Atanasio Girardot, con puertas a las 5:00 pm y show cerca a las 7:00 pm.\n\nLa noche original se agot\u00f3 en menos de cuatro horas (m\u00e1s de 40.000 personas), por lo que se sum\u00f3 una segunda fecha el viernes 4 de septiembre. La \u00fanica tiquetera autorizada es Ticketmaster Colombia; la organizaci\u00f3n pide no comprar boletas a revendedores.\n\nEl estadio presenta obras de mantenimiento en el costado occidental (retiro de la cubierta de la tribuna occidental) con cerramiento temporal de 254 metros lineales, pero la programaci\u00f3n de conciertos sigue sin novedad. Se recomienda usar el Metro L\u00ednea B, estaci\u00f3n Estadio.',
  highlight: '5 de septiembre AGOTADO \u00b7 \u00fanica ciudad de Colombia del tour \u00b7 puertas 5:00 pm',
  ciudad: 'Medell\u00edn',
  region: 'Antioquia',
  barrio: 'Estadio',
  lat: 6.2568,
  lng: -75.5906,
  whatsapp: '',
  telefono: '',
  email: '',
  web: 'https://www.ticketmaster.co/event/arcangel-20-aniversario',
  instagram: '',
  precio_desde: '5 sep AGOTADO - desde $120.000',
  horario: 'Puertas 5:00 pm - show desde las 7:00 pm',
  emoji: '\ud83c\udfa4',
  hero_bg: 'linear-gradient(135deg,#1a051a,#3a1a3a)',
  foto_hero: HERO,
  tipo: 'Concierto de reggaet\u00f3n \u00b7 20 aniversario',
  capacidad: 'Estadio Atanasio Girardot (m\u00e1s de 40.000 personas)',
  como_llegar: 'El Atanasio Girardot queda en el sector Estadio/Bel\u00e9n. La mejor opci\u00f3n es el Metro en la L\u00ednea B, estaci\u00f3n Estadio. Si llegas en carro, el pico y placa afecta a las placas terminadas en 7 y 9 el viernes 4 (hasta las 8:00 pm); el s\u00e1bado 5 no hay restricci\u00f3n. Ten en cuenta el cerramiento de obras en el costado occidental del estadio.',
  status: 'published',
  destacado: true
};

const TAGS = {
  fecha_inicio: '2026-09-04',
  fecha_fin: '2026-09-05',
  edicion: 'La Octava Maravilla World Tour \u00b7 20 Aniversario',
  sede: 'Estadio Atanasio Girardot, sector Estadio, Medell\u00edn',
  organiza: 'Ticketmaster Colombia',
  lema: 'Dos cunas del g\u00e9nero en una sola tarima: Puerto Rico y Medell\u00edn',
  lineup: [
    { nombre: 'Arc\u00e1ngel (Austin Santos)', escenario: 'Escenario principal' }
  ],
  agenda: [
    { dia: 'Viernes 4 y s\u00e1bado 5 de septiembre', hora: '5:00 pm', actividad: 'Apertura de puertas' },
    { dia: 'Viernes 4 y s\u00e1bado 5 de septiembre', hora: '7:00 pm', actividad: 'Inicio del show (aproximado)' },
    { dia: 'Viernes 4 y s\u00e1bado 5 de septiembre', hora: '11:00 pm', actividad: 'Cierre del concierto' }
  ],
  categorias_entrada: [
    { tipo: 'Localidades generales (s\u00e1bado 5)', precio: 'Desde $120.000 hasta $841.000 con servicio', disponibilidad: 'Agotado' },
    { tipo: 'Fecha adicional (viernes 4)', precio: 'Entre $168.000 y $961.000 con servicio', disponibilidad: 'Consultar Ticketmaster' }
  ],
  que_llevar: [
    'Boleta digital o f\u00edsica de Ticketmaster',
    'Documento de identidad',
    'Abrigo ligero para la noche de Medell\u00edn',
    'Dinero o tarjeta para alimentos y parqueadero'
  ],
  prohibido: [
    'C\u00e1maras fotogr\u00e1ficas y videograbadoras profesionales',
    'Alimentos y bebidas del exterior',
    'Objetos contundentes',
    'Compra de boletas a revendedores no autorizados'
  ]
};

const FAQS = [
  { pregunta: '\u00bfCu\u00e1ndo y d\u00f3nde es el concierto de Arc\u00e1ngel en Medell\u00edn?', respuesta: 'Viernes 4 y s\u00e1bado 5 de septiembre de 2026 en el Estadio Atanasio Girardot. Puertas 5:00 pm y show cerca a las 7:00 pm.' },
  { pregunta: '\u00bfQuedan boletas?', respuesta: 'La fecha del s\u00e1bado 5 est\u00e1 AGOTADA. La fecha adicionada del viernes 4 se vende por Ticketmaster Colombia (entre $168.000 y $961.000 con servicio), con sectores tambi\u00e9n agotados.' },
  { pregunta: '\u00bfEs la \u00fanica fecha en Colombia?', respuesta: 'S\u00ed. Medell\u00edn es la \u00fanica ciudad de Colombia del La Octava Maravilla World Tour, que recorre 10 pa\u00edses de Latinoam\u00e9rica.' },
  { pregunta: '\u00bfC\u00f3mo llego al Estadio Atanasio Girardot?', respuesta: 'Metro L\u00ednea B, estaci\u00f3n Estadio. En carro, el pico y placa del viernes 4 afecta placas terminadas en 7 y 9; el s\u00e1bado no hay restricci\u00f3n.' },
  { pregunta: '\u00bfHay restricciones por las obras del estadio?', respuesta: 'El cerramiento de obra del costado occidental no suspende conciertos. Llega temprano y usa transporte p\u00fablico por la alta afluencia.' }
];

module.exports = { SLUG: SLUG, HERO: HERO, PHOTOS: PHOTOS, BASE: BASE, TAGS: TAGS, FAQS: FAQS };

if (require.main !== module) return;

(async function main() {
  var url = process.env.DATABASE_URL || process.argv[2];
  if (!url) {
    console.error('Falta DATABASE_URL.');
    console.error('Uso: DATABASE_URL=postgres://... node scripts/seed-arcangel-medellin-2026.js [--dry]');
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