// scripts/seed-salsa-al-parque.js
// Crea (o actualiza) la pagina dinamica salsa-al-parque.html con los datos
// de Salsa al Parque 2026 (edicion 27, Idartes), replicando el patron de
// scripts/seed-rock-al-parque.js (categoria evento).
//
// Uso:
//   DATABASE_URL=postgres://... node scripts/seed-salsa-al-parque.js --dry
//   DATABASE_URL=postgres://... node scripts/seed-salsa-al-parque.js
//
// Idempotente: re-ejecutable sin efectos secundarios (ON CONFLICT slug).
// Contenido 100% ASCII-safe: caracteres especiales como escapes \uXXXX.

var neon = null;
function getNeon() {
  if (!neon) neon = require('@neondatabase/serverless').neon;
  return neon;
}

const SLUG = 'salsa-al-parque';
const HERO = 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=900&q=80';

const PHOTOS = [
  { url: HERO, caption: 'Salsa al Parque: la energia de la salsa en el Parque Simon Bolivar' },
  { url: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=900&q=80', caption: 'Multitud bailando al ritmo de grandes orquestas' },
  { url: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=900&q=80', caption: 'Conciertos gratuitos y ambiente festivo' },
  { url: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=900&q=80', caption: 'El festival de salsa mas grande de Colombia' },
  { url: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=900&q=80', caption: 'Cierre de los Festivales al Parque 2026' }
];

const BASE = {
  slug: SLUG,
  nombre: 'Salsa al Parque 2026 - Edicion 27',
  categoria_slug: 'evento',
  lead: 'El festival gratuito de salsa mas grande de Colombia: cierre de los Festivales al Parque con la edicion 27 el 28 y 29 de noviembre de 2026 en el Parque Metropolitano Simon Bolivar, Bogota.',
  descripcion: 'Salsa al Parque 2026 celebra su edicion numero 27 el 28 y 29 de noviembre de 2026 en el Parque Metropolitano Simon Bolivar, Bogota. Organizado por el Instituto Distrital de las Artes (Idartes) con la Alcaldia Mayor de Bogota, es el festival gratuito de salsa mas grande de Colombia y uno de los eventos mas festivos del ano en la capital.\n\nBajo el eje conceptual "La revolucion que nunca deja de sonar", esta edicion reafirma la vigencia de la salsa: mas que una evocacion nostalgica, el festival demuestra que la salsa, como fenomeno cultural, sigue reinventandose en dialogo con nuevas generaciones y consolidandose como uno de los lenguajes mas vivos de la ciudad.\n\nComo cada ano, el festival convoca grandes orquestas nacionales e internacionales y artistas emergentes, con musica en vivo, clases abiertas de baile y la participacion de agrupaciones locales e internacionales. La programacion celebra la tradicion salsera colombiana y caribena en todas sus expresiones.\n\nSalsa al Parque hace parte del programa Festivales al Parque, la politica cultural de Idartes que convierte el espacio publico en escenario de encuentro ciudadano. En 2025, el circuito de festivales reunio a mas de 660.000 asistentes en nueve eventos; en 2026, Salsa al Parque cierra la temporada como el gran final del calendario de festivales distritales.\n\nLa entrada es libre para todo el publico. Se recomienda llegar con anticipacion, usar bloqueador solar, llevar agua y consultar la programacion diaria en los canales oficiales del festival (salsaalparque.gov.co) y las redes de Idartes.',
  highlight: 'Edicion 27 gratis el 28 y 29 de noviembre en el Parque Simon Bolivar \u00b7 Cierre de los Festivales al Parque \u00b7 Grandes orquestas',
  ciudad: 'Bogot\u00e1',
  region: 'Cundinamarca',
  barrio: 'Parque Sim\u00f3n Bol\u00edvar',
  lat: 4.658056,
  lng: -74.093889,
  whatsapp: '',
  telefono: '',
  email: '',
  web: 'https://salsaalparque.gov.co/fecha',
  instagram: '@salsaalparque',
  precio_desde: 'Gratis (entrada libre)',
  horario: 'Sabado 28 y domingo 29 de noviembre, todo el dia',
  emoji: '\ud83c\udfb6',
  hero_bg: 'linear-gradient(135deg,#1a0a0a,#2a1a0a)',
  foto_hero: HERO,
  tipo: 'Festival de salsa \u00b7 Gratuito \u00b7 Festivales al Parque',
  capacidad: 'Parque Metropolitano Simon Bolivar',
  como_llegar: 'Parque Metropolitano Simon Bolivar: entre la Av. 68 y la Av. Quito (NQS), sector La Granja. TransMilenio: estacion Simon Bolivar (troncal Norte-Quito-Sur) y estaciones de la Av. 68. Hay parqueaderos y cicloparqueaderos; se recomienda transporte publico por el alto flujo de publico.',
  status: 'published',
  destacado: true
};

const TAGS = {
  fecha_inicio: '2026-11-28',
  fecha_fin: '2026-11-29',
  edicion: 'Edicion 27',
  sede: 'Parque Metropolitano Simon Bolivar, Bogota',
  organiza: 'Idartes con la Alcaldia Mayor de Bogota',
  lema: 'La revolucion que nunca deja de sonar',
  lineup: [
    { nombre: 'Orquestas nacionales e internacionales', escenario: 'Plaza de Eventos', hora: 'Todo el dia' },
    { nombre: 'Clases abiertas de baile', escenario: 'Zona de danza', hora: 'Programacion paralela' }
  ],
  agenda: [
    { dia: 'Sabado 28 de noviembre', hora: 'Todo el dia', actividad: 'Conciertos de salsa, orquestas y clases de baile' },
    { dia: 'Domingo 29 de noviembre', hora: 'Todo el dia', actividad: 'Conciertos de cierre de los Festivales al Parque 2026' }
  ],
  categorias_entrada: [
    { tipo: 'Entrada general', precio: 'Gratis', disponibilidad: 'Disponible' }
  ],
  que_llevar: [
    'Protector solar y gorra',
    'Agua',
    'Manta o silla plegable',
    'Zapatos comodos para bailar',
    'Consulta la programacion en salsaalparque.gov.co'
  ],
  prohibido: [
    'Venta y consumo de bebidas alcoholicas',
    'Sustancias alucinogenas',
    'Ingreso de armas',
    'Objetos contundentes o punzantes'
  ]
};

const FAQS = [
  { pregunta: 'Cuando es Salsa al Parque 2026?', respuesta: 'El sabado 28 y domingo 29 de noviembre de 2026, en el Parque Metropolitano Simon Bolivar (edicion 27).' },
  { pregunta: 'Es gratis?', respuesta: 'Si, la entrada es libre para todo el publico.' },
  { pregunta: 'Donde queda el Parque Simon Bolivar?', respuesta: 'Entre la Av. 68 y la Av. Quito (NQS), sector La Granja, Bogota.' },
  { pregunta: 'Quien lo organiza?', respuesta: 'El Instituto Distrital de las Artes (Idartes) con la Alcaldia Mayor de Bogota.' },
  { pregunta: 'Que incluye la programacion?', respuesta: 'Conciertos de grandes orquestas nacionales e internacionales, artistas emergentes, musica en vivo y clases abiertas de baile.' }
];

module.exports = { SLUG: SLUG, HERO: HERO, PHOTOS: PHOTOS, BASE: BASE, TAGS: TAGS, FAQS: FAQS };

if (require.main !== module) return;

(async function main() {
  var url = process.env.DATABASE_URL || process.argv[2];
  if (!url) {
    console.error('Falta DATABASE_URL.');
    console.error('Uso: DATABASE_URL=postgres://... node scripts/seed-salsa-al-parque.js [--dry]');
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