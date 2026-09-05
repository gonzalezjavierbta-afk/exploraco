// scripts/seed-vive-mejor-bogota.js
// Datos del evento Vive + y Mejor: Encuentro Internacional de Longevidad
// (Centro Felicidad Chapinero, 5 y 6 de septiembre de 2026), categoria
// evento. Patron seed + loader + smoke de Fase 9.
//
// Uso:
//   DATABASE_URL=postgres://... node scripts/seed-vive-mejor-bogota.js --dry
//   DATABASE_URL=postgres://... node scripts/seed-vive-mejor-bogota.js
//
// Idempotente: re-ejecutable sin efectos secundarios (ON CONFLICT slug).
// Contenido 100% ASCII-safe: caracteres especiales como escapes \uXXXX.

var neon = null;
function getNeon() {
  if (!neon) neon = require('@neondatabase/serverless').neon;
  return neon;
}

const SLUG = 'vive-mejor-bogota';
const HERO = 'https://images.unsplash.com/photo-1519834785169-98be25ec3f84?w=900&q=80';

const PHOTOS = [
  { url: HERO, caption: 'Vive y Mejor: el encuentro internacional de longevidad en Bogota' },
  { url: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=900&q=80', caption: 'Bienestar, ejercicio y salud para una vida plena a toda edad' },
  { url: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=900&q=80', caption: 'Paneles y talleres sobre envejecimiento saludable y la economia plateada' },
  { url: 'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?w=900&q=80', caption: 'Zonas Azules, tecnologia y nuevas formas de envejecer' },
  { url: 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=900&q=80', caption: 'Comunidad y bienestar para mayores de 50 y profesionales de la salud' }
];

const BASE = {
  slug: SLUG,
  nombre: 'Vive + y Mejor: Encuentro Internacional de Longevidad',
  categoria_slug: 'evento',
  lead: 'El encuentro internacional de longevidad creado por el doctor Oswaldo Restrepo: econom\u00eda plateada, tecnolog\u00eda para el envejecimiento saludable y el modelo de las Zonas Azules, el 5 y 6 de septiembre en Bogot\u00e1.',
  descripcion: 'Vive + y Mejor es el Encuentro Internacional de Longevidad creado por el doctor Oswaldo Restrepo, que se realiza el s\u00e1bado 5 y domingo 6 de septiembre de 2026 en el Centro Felicidad (CEFE) Chapinero, como cierre de la Semana del Bienestar Bogot\u00e1: Cultura y Salud para Vivir Mejor.\n\nEl encuentro aborda la nueva longevidad desde la econom\u00eda plateada, la tecnolog\u00eda aplicada al envejecimiento saludable y el modelo de las Zonas Azules (regiones del mundo con mayor esperanza de vida). Est\u00e1 dirigido a personal m\u00e9dico, terapeutas, referentes comunitarios, emprendedores mayores de 50 a\u00f1os y a toda la ciudadan\u00eda interesada en una vida larga y plena.\n\nDurante dos d\u00edas se desarrollan paneles, talleres y conversaciones sobre bienestar financiero en la madurez, cuidado de la salud mental, nutrici\u00f3n, actividad f\u00edsica y las dimensiones que impulsan el bienestar a lo largo de la vida. La entrada es gratuita, con algunas actividades sujetas a registro y aforo.',
  highlight: 'Encuentro internacional de longevidad \u00b7 5 y 6 de septiembre \u00b7 Dr. Oswaldo Restrepo \u00b7 Zonas Azules y economia plateada',
  ciudad: 'Bogot\u00e1',
  region: 'Cundinamarca',
  barrio: 'Chapinero',
  lat: 4.6431,
  lng: -74.0636,
  whatsapp: '',
  telefono: '',
  email: '',
  web: 'https://www.culturarecreacionydeporte.gov.co/es/semanabienestarbogota',
  instagram: '@culturaenBTA',
  precio_desde: 'Gratis (con registro en algunas actividades)',
  horario: 'Sabado 5 y domingo 6 de septiembre de 2026',
  emoji: '\ud83d\udcaa',
  hero_bg: 'linear-gradient(135deg,#2a0a3a,#0a2a3a)',
  foto_hero: HERO,
  tipo: 'Congreso de longevidad \u00b7 Bienestar \u00b7 Gratuito',
  capacidad: 'Centro Felicidad Chapinero',
  como_llegar: 'El Centro Felicidad (CEFE) Chapinero queda en la calle 63 (Av. Chile) con carrera 13Bis, en Chapinero. Se llega en TransMilenio por la calle 63 o en el sistema integrado de transporte publico de Bogota.',
  status: 'published',
  destacado: true
};

const TAGS = {
  fecha_inicio: '2026-09-05',
  fecha_fin: '2026-09-06',
  edicion: 'Edicion 2026',
  sede: 'Centro Felicidad Chapinero, calle 63 con carrera 13Bis',
  organiza: 'Dr. Oswaldo Restrepo / Alcaldia Mayor de Bogota / SCRD',
  lema: 'Vivir mas y mejor, en todas las edades',
  pais_invitado: 'Internacional',
  lineup: [
    { nombre: 'Dr. Oswaldo Restrepo', escenario: 'Paneles de longevidad', hora: '5 y 6 de septiembre' },
    { nombre: 'Economia plateada', escenario: 'Conversaciones', hora: '5 de septiembre' },
    { nombre: 'Modelo Zonas Azules', escenario: 'Charlas', hora: '6 de septiembre' }
  ],
  agenda: [
    { dia: 'Sabado 5 de septiembre', hora: 'CEFE Chapinero', actividad: 'Inicio del Encuentro de Longevidad: economia plateada y bienestar financiero en la madurez' },
    { dia: '5 de septiembre', hora: 'CEFE Chapinero', actividad: 'Paneles sobre tecnologia aplicada al envejecimiento saludable' },
    { dia: 'Domingo 6 de septiembre', hora: 'CEFE Chapinero', actividad: 'Modelo de las Zonas Azules y nuevas formas de envejecer' },
    { dia: '5 y 6 de septiembre', hora: 'CEFE Chapinero', actividad: 'Talleres de nutricion, actividad fisica y salud mental para mayores de 50' }
  ],
  categorias_entrada: [
    { tipo: 'Acceso general', precio: 'Gratis', disponibilidad: 'Disponible' },
    { tipo: 'Actividades con registro', precio: 'Gratis (cupo limitado)', disponibilidad: 'Disponible' }
  ],
  que_llevar: [
    'Documento de identidad',
    'Registro previo en las actividades con cupo limitado',
    'Cuaderno para tomar notas de los paneles',
    'Ropa comoda para los talleres de actividad fisica',
    'Curiosidad por la nueva longevidad y el modelo de Zonas Azules'
  ],
  prohibido: [
    'Alimentos y bebidas dentro de las salas',
    'Filmacion profesional sin acreditacion',
    'Armas u objetos contundentes',
    'Ingreso con el aforo completo'
  ]
};

const FAQS = [
  { pregunta: 'Cuando es Vivir y Mejor?', respuesta: 'El sabado 5 y domingo 6 de septiembre de 2026, en el Centro Felicidad Chapinero.' },
  { pregunta: 'Que es Vivir y Mejor?', respuesta: 'Es el Encuentro Internacional de Longevidad creado por el doctor Oswaldo Restrepo, que aborda la economia plateada, la tecnologia para el envejecimiento saludable y las Zonas Azules.' },
  { pregunta: 'Para quien es?', respuesta: 'Para personal medico, terapeutas, emprendedores mayores de 50 anos, referentes comunitarios y toda la ciudadania interesada en una vida larga y plena.' },
  { pregunta: 'Es gratis?', respuesta: 'Si, la entrada es gratuita; algunas actividades requieren registro previo y tienen cupo limitado.' },
  { pregunta: 'Donde me registro?', respuesta: 'En la pagina oficial de la Semana del Bienestar Bogota de la SCRD.' }
];

module.exports = { SLUG: SLUG, HERO: HERO, PHOTOS: PHOTOS, BASE: BASE, TAGS: TAGS, FAQS: FAQS };

if (require.main !== module) return;

(async function main() {
  var url = process.env.DATABASE_URL || process.argv[2];
  if (!url) {
    console.error('Falta DATABASE_URL.');
    console.error('Uso: DATABASE_URL=postgres://... node scripts/seed-vive-mejor-bogota.js [--dry]');
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
