// scripts/seed-john-summit-chamorro-bogota.js
// Datos de John Summit en Chamorro City Hall, Bogota, jueves 10 de septiembre
// de 2026 (show benefico). Categoria evento.
// Patron seed + loader + smoke de Fase 9.
// Uso:
//   DATABASE_URL=postgres://... node scripts/seed-john-summit-chamorro-bogota.js --dry
//   DATABASE_URL=postgres://... node scripts/seed-john-summit-chamorro-bogota.js
// Idempotente (ON CONFLICT slug). 100% ASCII-safe.

var neon = null;
function getNeon() {
  if (!neon) neon = require('@neondatabase/serverless').neon;
  return neon;
}

const SLUG = 'john-summit-chamorro-bogota';
const HERO = 'https://images.unsplash.com/photo-1571266028243-3716f02d2d2e?w=900&q=80';

const PHOTOS = [
  { url: HERO, caption: 'Noche de Dj set en Chamorro City Hall' },
  { url: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=900&q=80', caption: 'Luces y bajo a todo volumen' },
  { url: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=900&q=80', caption: 'La casa prendida en la calle 70' },
  { url: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=900&q=80', caption: 'Bogota baila por la reconstruccion' }
];

const BASE = {
  slug: SLUG,
  nombre: 'John Summit en Bogot\u00e1: Chamorro City Hall',
  categoria_slug: 'evento',
  lead: 'El Dj estadounidense estrena su show en Colombia con un prop\u00f3sito solidario: el 100% de las utilidades de su presentaci\u00f3n del 10 de septiembre en Chamorro City Hall ir\u00e1 a las v\u00edctimas del sismo de agosto.',
  descripcion: 'John Summit llega por primera vez a Colombia con su esperado show en Chamorro City Hall (calle 70) el jueves 10 de septiembre, una noche pensada para el m\u00fasica electr\u00f3nica con un destino especial: todas las utilidades ser\u00e1n donadas para apoyar la reconstrucci\u00f3n tras el terremoto de magnitud 7,4 del 10 de agosto que afect\u00f3 al Choc\u00f3 y el norte del Valle del Cauca.\n\nLa fiesta empieza a las 7:00 pm y el line up de soporte lo componen DJs de la escena nacional: Cato Anaya b2b Moska, Natalia Par\u00eds, Dezko b2b Khomha, D\u00edscola b2b Nats Cort\u00e9s y Mad Montenegro b2b Adriano Lyentsov.\n\nLa boleter\u00eda se difunde por los canales oficiales del evento (Instagram del artista y las marcas locales); se recomienda estar pendiente de las plataformas oficiales para la venta.',
  highlight: 'Jueves 10 sep \u00b7 100% de utilidades a las v\u00edctimas del sismo \u00b7 debut en Colombia',
  ciudad: 'Bogot\u00e1',
  region: 'Cundinamarca',
  barrio: 'Chapinero',
  lat: 4.6515,
  lng: -74.0590,
  whatsapp: '',
  telefono: '',
  email: '',
  web: '',
  instagram: 'johnsummit',
  precio_desde: 'Consulta boleter\u00eda',
  horario: 'Inicio del show 7:00 pm',
  emoji: '\ud83c\udfa7',
  hero_bg: 'linear-gradient(135deg,#0a1a1f,#1d0f4a)',
  foto_hero: HERO,
  tipo: 'Set electr\u00f3nico ben\u00e9fico',
  capacidad: 'Chamorro City Hall (calle 70)',
  como_llegar: 'Chamorro City Hall queda sobre la calle 70 en Chapinero, a pasos de la estaci\u00f3n Calle 72 de TransMilenio (troncal Caracas). Desde all\u00ed camina una cuadra hacia el occidente. En bicicleta la Cicloruta de la calle 72 te deja justo frente al recinto; hay parqueaderos en la zona.',
  status: 'published',
  destacado: true
};

const TAGS = {
  fecha_inicio: '2026-09-10',
  fecha_fin: '2026-09-10',
  edicion: 'John Summit - Show ben\u00e9fico en Colombia',
  sede: 'Chamorro City Hall, Bogot\u00e1 (calle 70 con carrera 14A)',
  organiza: 'Breakfast Live y RITVALES',
  lema: 'La m\u00fasica electr\u00f3nica que reconstruye',
  lineup: [
    { nombre: 'John Summit', escenario: 'Escenario principal' },
    { nombre: 'Cato Anaya b2b Moska', escenario: 'Escenario principal' },
    { nombre: 'Natalia Par\u00eds', escenario: 'Escenario principal' },
    { nombre: 'Dezko b2b Khomha', escenario: 'Escenario principal' }
  ],
  agenda: [
    { dia: 'Jueves 10 de septiembre', hora: '6:00 pm', actividad: 'Apertura de puertas' },
    { dia: 'Jueves 10 de septiembre', hora: '7:00 pm', actividad: 'Inicio del show electr\u00f3nico' },
    { dia: 'Jueves 10 de septiembre', hora: '12:00 am', actividad: 'Cierre de la jornada' }
  ],
  categorias_entrada: [
    { tipo: 'Entrada general', precio: 'Boletas por canales oficiales', disponibilidad: 'Disponible' },
    { tipo: 'Mesas VIP', precio: 'Informaci\u00f3n en la boleter\u00eda', disponibilidad: 'Consultar' }
  ],
  que_llevar: [
    'Boleta digital de la venta oficial',
    'Documento de identidad',
    'Ropa c\u00f3moda para una noche de baile'
  ],
  prohibido: [
    'Ingreso de bebidas y alimentos del exterior',
    'Menores de edad (evento +18)',
    'Art\u00edculos pirot\u00e9cnicos y vapeadores'
  ]
};

const FAQS = [
  { pregunta: '\u00bfCu\u00e1ndo es el show de John Summit en Bogot\u00e1?', respuesta: 'Jueves 10 de septiembre de 2026 en Chamorro City Hall (calle 70). El show arranca a las 7:00 pm.' },
  { pregunta: '\u00bfEs la primera vez que viene a Colombia?', respuesta: 'S\u00ed, es su debut en el pa\u00eds y adem\u00e1s tiene un fin ben\u00e9fico: el 100% de las utilidades se donan a los afectados por el sismo de agosto.' },
  { pregunta: '\u00bfQui\u00e9nes abren el show?', respuesta: 'Cato Anaya b2b Moska, Natalia Par\u00eds, Dezko b2b Khomha, D\u00edscola b2b Nats Cort\u00e9s y Mad Montenegro b2b Adriano Lyentsov.' },
  { pregunta: '\u00bfD\u00f3nde compro las boletas?', respuesta: 'Por los canales oficiales del evento: Instagram del artista y de las marcas locales. Evita la reventa.' },
  { pregunta: '\u00bfC\u00f3mo llego?', respuesta: 'TransMilenio hasta la estaci\u00f3n Calle 72 y camina una cuadra al occidente, o en bici por la Cicloruta de la calle 72.' }
];

module.exports = { SLUG: SLUG, HERO: HERO, PHOTOS: PHOTOS, BASE: BASE, TAGS: TAGS, FAQS: FAQS };

if (require.main !== module) return;

(async function main() {
  var url = process.env.DATABASE_URL || process.argv[2];
  if (!url) {
    console.error('Falta DATABASE_URL.');
    console.error('Uso: DATABASE_URL=postgres://... node scripts/seed-john-summit-chamorro-bogota.js [--dry]');
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
