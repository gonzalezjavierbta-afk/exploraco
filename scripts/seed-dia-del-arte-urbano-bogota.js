// scripts/seed-dia-del-arte-urbano-bogota.js
// Datos del evento Dia del Arte Urbano de Bogota (31 de agosto de 2026),
// categoria evento. Patron seed + loader + smoke de Fase 9.
//
// Uso:
//   DATABASE_URL=postgres://... node scripts/seed-dia-del-arte-urbano-bogota.js --dry
//   DATABASE_URL=postgres://... node scripts/seed-dia-del-arte-urbano-bogota.js
//
// Idempotente: re-ejecutable sin efectos secundarios (ON CONFLICT slug).
// Contenido 100% ASCII-safe: caracteres especiales como escapes \uXXXX.

var neon = null;
function getNeon() {
  if (!neon) neon = require('@neondatabase/serverless').neon;
  return neon;
}

const SLUG = 'dia-del-arte-urbano-bogota';
const HERO = 'https://images.unsplash.com/photo-1547447134-cd3f5c716030?w=900&q=80';

const PHOTOS = [
  { url: HERO, caption: 'Dia del Arte Urbano: Bogota vibra con el color del graffiti' },
  { url: 'https://images.unsplash.com/photo-1531384189578-cac4e4b6b206?w=900&q=80', caption: 'Muros, mensajes y color por toda la ciudad creadora' },
  { url: 'https://images.unsplash.com/photo-1554188248-986adbb73be4?w=900&q=80', caption: 'Artistas y colectivos urbanos en la celebracion del 31 de agosto' },
  { url: 'https://images.unsplash.com/photo-1552072805-2a9039d00e57?w=900&q=80', caption: 'El arte urbano como expresion de la cultura y la memoria de Bogota' },
  { url: 'https://images.unsplash.com/photo-1533681904393-9ab6eee7e408?w=900&q=80', caption: 'Pintura en vivo y activaciones en los espacios publicos' }
];

const BASE = {
  slug: SLUG,
  nombre: 'D\u00eda del Arte Urbano Bogot\u00e1',
  categoria_slug: 'evento',
  lead: 'Cada 31 de agosto Bogot\u00e1 festeja el arte urbano con muros, intervenciones y activaciones en vivo en toda la ciudad: una fecha para celebrar la creaci\u00f3n, el color y la identidad de la capital.',
  descripcion: 'Desde 2016, cada 31 de agosto Bogot\u00e1 celebra el D\u00eda del Arte Urbano, una verdadera fiesta de la creaci\u00f3n, el color y la alegr\u00eda que encabeza el Comit\u00e9 para la Pr\u00e1ctica Responsable del Grafiti. Es una jornada para reconocer el grafiti y las artes urbanas como expresiones leg\u00edtimas de la cultura y la memoria de la ciudad.\n\nEn la fecha se desarrollan intervenciones de muralismo en diferentes localidades, caminatas por el distrito de arte urbano de la ciudad, talleres, conversatorios y actividades que integran grafiti, video mapping, m\u00fasica y artes pl\u00e1sticas. A lo largo de agosto, en paralelo, se realizan eventos en el marco de la Fiesta de Bogot\u00e1, como el ciclopaseo nocturno con intervenciones digitales de colectivos urbanos.\n\nEl Comit\u00e9 para la Pr\u00e1ctica Responsable del Grafiti invita a la ciudadan\u00eda a disfrutar muros y escenarios en los puntos habilitados, respetando los espacios p\u00fablicos y la pr\u00e1ctica responsable del arte urbano.',
  highlight: '31 de agosto \u00b7 Muralismo, graffiti y activaciones en vivo \u00b7 Arte urbano responsable \u00b7 En toda la ciudad',
  ciudad: 'Bogot\u00e1',
  region: 'Cundinamarca',
  barrio: 'Toda la ciudad',
  lat: 4.6409,
  lng: -74.0888,
  whatsapp: '',
  telefono: '',
  email: '',
  web: 'https://www.bogotadistritografiti.gov.co/index.php/parche-grafitero/dia-del-arte-urbano',
  instagram: '',
  precio_desde: 'Gratis',
  horario: '31 de agosto de 2026, variados horarios',
  emoji: '\ud83c\udfa8',
  hero_bg: 'linear-gradient(135deg,#3a1020,#101a3a)',
  foto_hero: HERO,
  tipo: 'Arte urbano \u00b7 Muralismo \u00b7 Gratuito',
  capacidad: 'Multiples puntos de la ciudad',
  como_llegar: 'El Dia del Arte Urbano se celebra en multiples puntos de Bogota con intervenciones de muralismo en diferentes localidades, ademas de conversatorios y talleres. Consulta la programacion oficial de Bogota Distrito Grafiti para conocer las actividades y puntos de encuentro habilitados.',
  status: 'published',
  destacado: true
};

const TAGS = {
  fecha_inicio: '2026-08-31',
  fecha_fin: '2026-08-31',
  edicion: 'Edicion 2026 (desde 2016)',
  sede: 'Multiples puntos y distritos creativos de Bogota',
  organiza: 'Bogota Distrito Grafiti / Comite para la Practica Responsable del Grafiti',
  lema: 'La ciudad creadora vibra con el color',
  lineup: [
    { nombre: 'Muralismo en vivo', escenario: 'Varias localidades', hora: '31 de agosto' },
    { nombre: 'Conversatorios de arte urbano', escenario: 'Espacios culturales', hora: '31 de agosto' },
    { nombre: 'Colectivos urbanos (video mapping)', escenario: 'Distritos creativos', hora: 'Durante agosto' }
  ],
  agenda: [
    { dia: '31 de agosto', hora: 'Varias localidades', actividad: 'Intervenciones de muralismo y grafiti responsable' },
    { dia: '31 de agosto', hora: 'Espacios publicos', actividad: 'Activaciones de color, talleres y encuentros' },
    { dia: 'Durante agosto', hora: 'Ciclovia nocturna', actividad: 'Intervencion digital con historias de graffiti en el marco de la Fiesta de Bogota' }
  ],
  categorias_entrada: [
    { tipo: 'Acceso libre', precio: 'Gratis', disponibilidad: 'Disponible' }
  ],
  que_llevar: [
    'Camara o telefono para registrar los muros y murales',
    'Ropa comoda y bloqueador solar para recorrer la ciudad',
    'Respeto por los espacios publicos: arte urbano responsable',
    'Consulta el mapa de murales de Bogota Distrito Grafiti',
    'Llega temprano a las actividades con cupo'
  ],
  prohibido: [
    'Pintar fuera de los puntos autorizados (practica responsable)',
    'Dano a la propiedad privada y publica',
    'Armas u objetos contundentes',
    'Aerosoles en eventos cerrados sin autorizacion'
  ]
};

const FAQS = [
  { pregunta: 'Cuando es el Dia del Arte Urbano de Bogota?', respuesta: 'Cada 31 de agosto, desde 2016. En 2026 se celebra con intervenciones y activaciones en toda la ciudad.' },
  { pregunta: 'Es gratis?', respuesta: 'Si, las actividades de muralismo, conversatorios y talleres son de acceso libre.' },
  { pregunta: 'Donde se celebra?', respuesta: 'En multiples puntos de Bogota, con intervenciones de muralismo en diferentes localidades y eventos en espacios culturales y distritos creativos.' },
  { pregunta: 'Quien lo organiza?', respuesta: 'Bogota Distrito Grafiti y el Comite para la Practica Responsable del Grafiti.' },
  { pregunta: 'Puedo participar pintando?', respuesta: 'Solo en los puntos habilitados por la organizacion, respetando la practica responsable del arte urbano.' }
];

module.exports = { SLUG: SLUG, HERO: HERO, PHOTOS: PHOTOS, BASE: BASE, TAGS: TAGS, FAQS: FAQS };

if (require.main !== module) return;

(async function main() {
  var url = process.env.DATABASE_URL || process.argv[2];
  if (!url) {
    console.error('Falta DATABASE_URL.');
    console.error('Uso: DATABASE_URL=postgres://... node scripts/seed-dia-del-arte-urbano-bogota.js [--dry]');
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
