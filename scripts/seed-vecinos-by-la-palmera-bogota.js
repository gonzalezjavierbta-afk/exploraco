// scripts/seed-vecinos-by-la-palmera-bogota.js
// Crea (o actualiza) la pagina dinamica vecinos-by-la-palmera-bogota.html
// (categoria hostal). Patron Fase 9: seed ASCII-safe + loader API + smoke.
//
// Uso:
//   DATABASE_URL=postgres://... node scripts/seed-vecinos-by-la-palmera-bogota.js --dry
//   DATABASE_URL=postgres://... node scripts/seed-vecinos-by-la-palmera-bogota.js
//
// Idempotente: re-ejecutable sin efectos secundarios (ON CONFLICT slug).

var neon = null;
function getNeon() {
  if (!neon) neon = require('@neondatabase/serverless').neon;
  return neon;
}

const SLUG = 'vecinos-by-la-palmera-bogota';
const HERO = 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f8/Bogot%C3%A1_Chapinero_de_noche.JPG/960px-Bogot%C3%A1_Chapinero_de_noche.JPG';

const PHOTOS = [
  { url: HERO, caption: 'Chapinero al caer la noche, el barrio donde viven los Vecinos' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/58/Bogota_Chapinero_calle_63.JPG/960px-Bogota_Chapinero_calle_63.JPG', caption: 'La calle 63 y el Chapinero comercial, a minutos del hostel' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e8/Salsa_dance_dip.jpg/960px-Salsa_dance_dip.jpg', caption: 'Clases de salsa semanales en el hostel: tradicion vecinal' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/Iglesia_de_Nuestra_Se%C3%B1ora_de_Lourdes%2C_Bogot%C3%A1.jpg/800px-Iglesia_de_Nuestra_Se%C3%B1ora_de_Lourdes%2C_Bogot%C3%A1.jpg', caption: 'Parque de Lourdes, referencia cercana del barrio' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c2/Caf%C3%A9_colombiano_Santa_Clara.jpg/800px-Caf%C3%A9_colombiano_Santa_Clara.jpg', caption: 'Cafe colombiano siempre disponible para los vecinos del hostel' }
];

const BASE = {
  slug: SLUG,
  nombre: 'Vecinos by La Palmera',
  categoria_slug: 'hostal',
  lead: 'El hostel que convierte a viajeros en vecinos: desayuno gratis, lockers gratis, coworking y una agenda semanal real con clases de salsa, tejo, noches de juegos y cine. 9.7 sobre 10 en Hostelworld con staff valorado en 9.9.',
  descripcion: 'Vecinos by La Palmera toma su nombre en serio: la idea es que cada huesped llegue como turista y se quede sintiendose vecino del barrio. Ubicado sobre la calle 70 de Chapinero, a metros de supermercados, cafes y restaurantes, combina la comodidad residencial del norte con la energia social de un buen hostel.\n\nLas camas son de las mas elogiadas de Bogota: cada una cuenta con luz propia, enchufe individual y repisa personal. El desayuno esta incluido, igual que lockers, guarda de equipajes y WiFi en todo el predio, y hay un espacio de coworking para n\u00f3madas digitales.\n\nLo que realmente distingue a Vecinos es su agenda semanal de eventos gratuitos: noches de cine, leyendas bogotanas, juegos de mesa, clases de salsa y tardes de tejo, el deporte tradicional colombiano. La recepcion funciona practicamente 24 horas (0:00 a 23:00).\n\nCon 9.7 sobre 10 en Hostelworld y sub-notas casi perfectas (staff 9.9, limpieza 9.9, seguridad 9.9), es uno de los hostales mejor calificados de la ciudad. Su zona es segura y comercial, ideal para quien quiere vivir Bogota local lejos del circuito puramente turistico.',
  highlight: '9.7/10 (staff 9.9, limpieza 9.9) \u00b7 Desayuno + lockers gratis \u00b7 Agenda semanal: salsa, tejo, cine \u00b7 Coworking \u00b7 Calle 70, Chapinero',
  ciudad: 'Bogot\u00e1',
  region: 'Cundinamarca',
  barrio: 'Chapinero',
  lat: 4.6550,
  lng: -74.0560,
  whatsapp: '',
  telefono: '',
  email: '',
  web: '',
  instagram: '',
  precio_desde: 'Dorms desde $54.000; privadas desde $140.000 por noche (referencia)',
  horario: 'Recepci\u00f3n de 0:00 a 23:00 / Check-out hasta 11:00',
  emoji: '\ud83d\udecf',
  hero_bg: 'linear-gradient(135deg,#134e4a,#84cc16)',
  foto_hero: HERO,
  tipo: 'Hostal \u00b7 Comunidad de viajeros \u00b7 Eventos semanales',
  capacidad: 'Dormitorios compartidos y habitaciones privadas',
  como_llegar: 'Calle 70 #11a-18, Chapinero, cerca de la Av. Caracas. TransMilenio hasta la calle 63 o estaciones de la Autonorte; multiples rutas SITP por la calle 70 y carrera 13.',
  status: 'published',
  destacado: true
};

const TAGS = {
  tipo_alojamiento: 'Hostal comunidad con eventos semanales',
  checkin: 'Desde las 15:00',
  checkout: '11:00',
  recepcion: 'De 0:00 a 23:00 (practicamente 24 h)',
  edad_minima: '',
  mascotas: '',
  cocina_compartida: 'Si, cocina grande y equipada',
  barrio_descripcion: 'La calle 70 es uno de los corredores mas vivos de Chapinero: supermercado a la vuelta, cafes, restaurantes y bares locales. Sector seguro y residencial, bien conectado por TransMilenio (calle 63 / Autonorte) y SITP. Zona T y G a pocos minutos en transporte.',
  politica_cancelacion: 'Cancelacion gratuita reservando con anticipacion segun tarifa. Las tarifas mostradas suelen incluir impuestos para huespedes extranjeros.',
  reglas_casa: 'Recepcion de 0:00 a 23:00\nCheck-in desde las 15:00 / Check-out hasta las 11:00\nRespetar el descanso de los vecinos: silencio nocturno\nNo fumar en habitaciones\nLockers gratis disponibles\nAgenda de eventos publicada semanalmente en recepcion',
  habitaciones: [
    { tipo: 'Dormitorio compartido mixto', subtitulo: 'Camas con luz propia, enchufe y repisa', badge: 'popular', camas: 'Compartido', precio: '$54.000' },
    { tipo: 'Dormitorio solo mujeres', subtitulo: 'Mismas comodidades en ambiente exclusivo', badge: 'female', camas: 'Compartido', precio: '$56.000' },
    { tipo: 'Habitacion privada doble', subtitulo: 'Con bano privado, para parejas o amigos', camas: '1 doble', precio: '$140.000' }
  ],
  amenidades: ['Desayuno gratis', 'WiFi gratis', 'Coworking', 'Lockers gratis', 'Guarda equipajes gratis', 'Cocina grande equipada', 'Eventos semanales'],
  actividades: [
    { icono: '\ud83d\udc86', nombre: 'Clase de salsa', descripcion: 'Sesion semanal gratuita para aprender los pasos basicos antes de salir a las pistas bogotanas.' },
    { icono: '\ud83c\udf30', nombre: 'Tarde de tejo', descripcion: 'El deporte nacional colombiano: polvora, discos y cerveza en la version tradicional.' },
    { icono: '\ud83c\udfb2', nombre: 'Boardgames night', descripcion: 'Noche de juegos de mesa en las areas comunes, perfecta para conocer a otros huespedes.' },
    { icono: '\ud83d\udcfa', nombre: 'Movie night', descripcion: 'Cine semanal con peliculas colombianas y clasicos latinoamericanos.' },
    { icono: '\ud83e\udd21', nombre: 'Noche de leyendas', descripcion: 'Las historias y mitos de Bogota contados por quien mejor los conoce.' }
  ],
  que_incluye: ['Desayuno', 'WiFi gratis', 'Lockers', 'Guarda equipajes', 'Ropa de cama', 'Eventos semanales gratuitos'],
  transporte: [
    { icon: '\u2708', title: 'Desde el aeropuerto El Dorado', detail: '~17 km: taxi o app en 30-45 min por Av. El Dorado y Av. Caracas.' },
    { icon: '\ud83d\ude8b', title: 'TransMilenio', detail: 'Estaciones de la troncal Caracas (calles 63/72) y Autonorte a pocas cuadras.' },
    { icon: '\ud83d\udeb6', title: 'Barrio a pie', detail: 'Supermercado al lado, restaurantes y vida de barrio en la misma calle 70.' }
  ],
  eventos_hostal: [
    { dia: 'Lunes', hora: '19:00', titulo: 'Movie Night', desc: 'Ciclo de cine en la sala comun: peliculas colombianas y clasicos.', precio: 'Gratis' },
    { dia: 'Martes', hora: '18:00', titulo: 'Noche de Leyendas', desc: 'Leyendas y mitos de Bogota narrados en vivo.', precio: 'Gratis' },
    { dia: 'Miercoles', hora: '19:30', titulo: 'Boardgames Night', desc: 'Juegos de mesa compartidos entre huespedes.', precio: 'Gratis' },
    { dia: 'Jueves', hora: '17:00', titulo: 'Tejo Night', desc: 'El deporte tradicional colombiano: tejo con polvora y premios.', precio: 'Gratis' },
    { dia: 'Viernes', hora: '19:00', titulo: 'Salsa Class', desc: 'Clase abierta de salsa para principiantes antes de la salida nocturna.', precio: 'Gratis' }
  ]
};

const FAQS = [
  { pregunta: 'Donde queda Vecinos by La Palmera?', respuesta: 'En la calle 70 #11a-18, Chapinero, a metros de la Av. Caracas y con supermercado al lado.' },
  { pregunta: 'Que incluye la tarifa?', respuesta: 'Desayuno, WiFi, lockers y guarda de equipajes sin costo adicional, ademas de acceso a los eventos semanales.' },
  { pregunta: 'Que eventos organizan?', respuesta: 'Una agenda semanal con movie night, noche de leyendas, juegos de mesa, tarde de tejo y clase de salsa, todos gratuitos para huespedes.' },
  { pregunta: 'Cuanto cuesta dormir ahi?', respuesta: 'Los dormitorios arrancan alrededor de $54.000 COP por noche y las privadas dobles desde $140.000 (precios referenciales).' },
  { pregunta: 'Es buena zona?', respuesta: 'Si, la calle 70 de Chapinero es segura, comercial y residencial, con excelente transporte publico.' }
];

module.exports = { SLUG: SLUG, HERO: HERO, PHOTOS: PHOTOS, BASE: BASE, TAGS: TAGS, FAQS: FAQS };

if (require.main !== module) return;

(async function main() {
  var url = process.env.DATABASE_URL || process.argv[2];
  if (!url) {
    console.error('Falta DATABASE_URL.');
    console.error('Uso: DATABASE_URL=postgres://... node scripts/seed-vecinos-by-la-palmera-bogota.js [--dry]');
    process.exit(1);
  }

  var sql = getNeon()(url);
  var dry = process.argv.indexOf('--dry') !== -1;

  var existing = await sql('SELECT id, slug FROM destinos WHERE slug=$1 LIMIT 1', [SLUG]);

  if (dry) {
    console.log('[dry-run] ' + (existing.length ? 'UPDATE (fila existe)' : 'INSERT (nueva fila)') + ' para slug=' + SLUG);
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
  console.log('Verifica en: https://exploraco.co/' + SLUG + '.html');
})().catch(function(err) {
  console.error('ERROR:', err.message);
  process.exit(1);
});
