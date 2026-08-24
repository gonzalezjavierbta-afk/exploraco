// scripts/seed-82hostel-bogota.js
// Crea (o actualiza) la pagina dinamica 82hostel-bogota.html
// (categoria hostal). Patron Fase 9: seed ASCII-safe + loader API + smoke.
//
// Uso:
//   DATABASE_URL=postgres://... node scripts/seed-82hostel-bogota.js --dry
//   DATABASE_URL=postgres://... node scripts/seed-82hostel-bogota.js
//
// Idempotente: re-ejecutable sin efectos secundarios (ON CONFLICT slug).

var neon = null;
function getNeon() {
  if (!neon) neon = require('@neondatabase/serverless').neon;
  return neon;
}

const SLUG = '82hostel-bogota';
const HERO = 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/58/Bogota_Chapinero_calle_63.JPG/960px-Bogota_Chapinero_calle_63.JPG';

const PHOTOS = [
  { url: HERO, caption: 'La calle 63 de Chapinero, corredor vivo cerca del 82Hostel' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f8/Bogot%C3%A1_Chapinero_de_noche.JPG/960px-Bogot%C3%A1_Chapinero_de_noche.JPG', caption: 'Noche de Chapinero: bares y restaurantes a minutos del hostel' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/Iglesia_de_Nuestra_Se%C3%B1ora_de_Lourdes%2C_Bogot%C3%A1.jpg/800px-Iglesia_de_Nuestra_Se%C3%B1ora_de_Lourdes%2C_Bogot%C3%A1.jpg', caption: 'Parque de Lourdes, punto de referencia del norte chapinero' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/Avenida_Caracas_con_calle_76._Bogot%C3%A1._Colombia..jpg/960px-Avenida_Caracas_con_calle_76._Bogot%C3%A1._Colombia..jpg', caption: 'Av. Caracas con calle 76, a metros del hostel' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/eb/Bogot%C3%A1_desde_el_parque_nacional%2C_Chapinero_Alto.jpg/960px-Bogot%C3%A1_desde_el_parque_nacional%2C_Chapinero_Alto.jpg', caption: 'Vista del sector Chapinero desde el Parque Nacional' }
];

const BASE = {
  slug: SLUG,
  nombre: '82Hostel Bogot\u00e1',
  categoria_slug: 'hostal',
  lead: 'Hostal relajado en Chapinero Alto con sala de juegos, cocina integrada y aparcamiento propio, a 950 m del Parque El Virrey. La opcion economica bien ubicada para vivir el Chapinero local (8.1 promedio en cientos de opiniones).',
  descripcion: '82Hostel opera en una casa adaptada del barrio Chic\u00f3, en el Chapinero alto bogotano, sobre la carrera 19 con calle 80: el nombre viene directo de su direccion. Es un hostal sin pretensiones pensado para viajeros que priorizan ubicacion y precio en el norte moderno de la ciudad.\n\nSu area social gira alrededor de la sala de juegos y una cocina integrada donde los huespedes cocinan y comparten. Ofrece WiFi gratuito en todas las areas, recepcion 24 horas, caja fuerte, guarda de equipaje y servicio de traslado al aeropuerto con costo adicional.\n\nA diferencia de casi todos sus competidores, cuenta con aparcamiento propio, algo valioso para quien viaja en carro por Colombia. Admite mascotas y recibe familias con ninos, lo que lo vuelve versatil frente a los hostales solo-adultos del centro.\n\nLa ubicacion es su activo principal: el Parque El Virrey queda a 950 metros, el Parque de la 93 a unos 25 minutos a pie y el CC Atlantis y la parada de buses H\u00e9roes a menos de 150 metros. Con 8.1 de calificacion media en cientos de opiniones (Booking y TripAdvisor), es la base economica ideal para explorar Chapinero, la Zona T y el norte de Bogota.',
  highlight: 'Parqueo propio \u00b7 Sala de juegos + cocina integrada \u00b7 Acepta mascotas y familias \u00b7 Virrey a 950 m / parada H\u00e9roes a 150 m \u00b7 Precio economico en Chapinero',
  ciudad: 'Bogot\u00e1',
  region: 'Cundinamarca',
  barrio: 'Chic\u00f3 (Chapinero)',
  lat: 4.6688,
  lng: -74.0520,
  whatsapp: '',
  telefono: '',
  email: '',
  web: '',
  instagram: '',
  precio_desde: 'Dorms desde $42.000; privadas desde $110.000 por noche (referencia)',
  horario: 'Check-in desde 14:00 / Check-out hasta 11:00 / Recepcion 24 h',
  emoji: '\ud83d\udecf',
  hero_bg: 'linear-gradient(135deg,#065f46,#0ea5e9)',
  foto_hero: HERO,
  tipo: 'Hostal econ\u00f3mico \u00b7 Ambiente relajado \u00b7 Familiar',
  capacidad: 'Habitaciones compartidas y privadas',
  como_llegar: 'Carrera 19 #80-14, barrio Chic\u00f3, Chapinero. TransMilenio hasta la estacion H\u00e9roes (Autonorte) o rutas SITP por la carrera 13 / Av. Chile; la parada H\u00e9roes queda a 150 m.',
  status: 'published',
  destacado: false
};

const TAGS = {
  tipo_alojamiento: 'Hostal economico familiar',
  checkin: '14:00',
  checkout: '11:00',
  recepcion: '24 horas',
  edad_minima: '',
  mascotas: 'Si, se permiten mascotas',
  cocina_compartida: 'Si, cocina integrada',
  barrio_descripcion: 'El barrio Chico de Chapinero mezcla residencial y comercio: restaurantes, supermercados y oficinas. El Parque El Virrey (corredor verde con cicloruta) queda a 950 m, el Parque de la 93 a ~25 min a pie y el CC Atlantis a pocos bloques. Sector seguro y muy bien comunicado por TransMilenio (estacion H\u00e9roes a 150 m).',
  politica_cancelacion: 'Cancelacion segun tarifa contratada; las tarifas flexibles permiten cancelar sin costo con anticipacion. Impuestos pueden no estar incluidos para residentes colombianos.',
  reglas_casa: 'Check-in desde las 14:00 / Check-out hasta las 11:00\nAmbiente relajado: apto familias y mascotas\nNo fumar en habitaciones\nLockers/caja fuerte disponible\nTraslado aeropuerto con costo adicional (solicitar antes)\nPago al llegar en efectivo o tarjeta',
  habitaciones: [
    { tipo: 'Cama en dormitorio compartido', subtitulo: 'Opcion economica con locker', badge: 'popular', camas: 'Compartido', precio: '$42.000' },
    { tipo: 'Dormitorio solo mujeres', subtitulo: 'Espacio exclusivo para viajeras', badge: 'female', camas: 'Compartido', precio: '$44.000' },
    { tipo: 'Habitacion privada doble', subtitulo: 'Con bano, apta para parejas o familia pequenia', camas: '1 doble', precio: '$110.000' }
  ],
  amenidades: ['WiFi gratis', 'Sala de juegos', 'Cocina integrada', 'Recepcion 24h', 'Caja fuerte', 'Guarda de equipaje', 'Aparcamiento propio', 'Traslado aeropuerto (pago)', 'Acepta mascotas'],
  actividades: [
    { icono: '\ud83c\udfae', nombre: 'Sala de juegos', descripcion: 'Juegos de mesa y videojuegos en la sala comun: plan recurrente de las noches del hostel.' },
    { icono: '\ud83c\udf33', nombre: 'Parque El Virrey', descripcion: 'Corredor lineal con cicloruta, food trucks y gimnasio al aire libre a 950 metros.' },
    { icono: '\ud83d\uded2', nombre: 'CC Atlantis y Parque 93', descripcion: 'Comercio, cines y restaurantes del Chico a menos de 25 minutos caminando.' },
    { icono: '\ud83c\udf79', nombre: 'Vida nocturna de Chapinero', descripcion: 'Bares de la zona G y la 85 a pocos minutos en transporte.' }
  ],
  que_incluye: ['WiFi gratis', 'Ropa de cama', 'Guarda de equipaje', 'Uso de sala de juegos', 'Informacion turistica'],
  transporte: [
    { icon: '\u2708', title: 'Desde el aeropuerto El Dorado', detail: '~18 km: traslado coordinado por el hostel (pago) o taxi/app en 30-45 min por Av. El Dorado.' },
    { icon: '\ud83d\ude8b', title: 'TransMilenio', detail: 'Estacion H\u00e9roes (troncal Autonorte) a 150 m del hostel.' },
    { icon: '\ud83d\ude97', title: 'En carro', detail: 'Aparcamiento propio disponible, rareza entre los hostales de Bogota.' }
  ],
  eventos_hostal: []
};

const FAQS = [
  { pregunta: 'Donde queda 82Hostel?', respuesta: 'En la carrera 19 #80-14, barrio Chic\u00f3 de Chapinero, a 150 metros de la estacion TransMilenio H\u00e9roes.' },
  { pregunta: 'Tiene parking?', respuesta: 'Si, es uno de los pocos hostales de Bogota con aparcamiento propio, util para quien viaja en carro.' },
  { pregunta: 'Aceptan mascotas y ninos?', respuesta: 'Si, admite mascotas y familias con ninos, a diferencia de los hostales solo-adultos del centro.' },
  { pregunta: 'Cuanto cuesta dormir ahi?', respuesta: 'Las compartidas arrancan alrededor de $42.000 COP por noche y las privadas dobles desde $110.000 (precios referenciales).' },
  { pregunta: 'Hay traslado desde el aeropuerto?', respuesta: 'Si, se ofrece traslado al aeropuerto con costo adicional solicitado con anticipacion.' }
];

module.exports = { SLUG: SLUG, HERO: HERO, PHOTOS: PHOTOS, BASE: BASE, TAGS: TAGS, FAQS: FAQS };

if (require.main !== module) return;

(async function main() {
  var url = process.env.DATABASE_URL || process.argv[2];
  if (!url) {
    console.error('Falta DATABASE_URL.');
    console.error('Uso: DATABASE_URL=postgres://... node scripts/seed-82hostel-bogota.js [--dry]');
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
