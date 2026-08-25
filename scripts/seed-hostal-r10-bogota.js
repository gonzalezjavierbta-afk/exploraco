// scripts/seed-hostal-r10-bogota.js
// Crea (o actualiza) la pagina dinamica hostal-r10-bogota.html
// (categoria hostal). Patron Fase 9: seed ASCII-safe + loader API + smoke.
//
// Datos fuente oficiales:
//   Hostelworld: 8.8/10 (679 reviews) - Calle 12B No 5-7, La Candelaria
//   Booking: 8.4/10 (1.858 reviews)
//   Web oficial: r10colombia.com  IG: @r10bog
//
// Uso:
//   DATABASE_URL=postgres://... node scripts/seed-hostal-r10-bogota.js --dry
//   DATABASE_URL=postgres://... node scripts/seed-hostal-r10-bogota.js

var neon = null;
function getNeon() {
  if (!neon) neon = require('@neondatabase/serverless').neon;
  return neon;
}

const SLUG = 'hostal-r10-bogota';
const HERO = 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/06/Letreros_de_la_plaza_del_chorro_de_Quevedo._Bogot%C3%A1._Colombia..jpg/960px-Letreros_de_la_plaza_del_chorro_de_Quevedo._Bogot%C3%A1._Colombia..jpg';

const PHOTOS = [
  { url: HERO, caption: 'Plazoleta del Chorro de Quevedo, a metros del Hostal R10 en La Candelaria' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/Plaza_de_Bol%C3%ADvar_en_Bogot%C3%A1_%28Colombia%29.jpg/960px-Plaza_de_Bol%C3%ADvar_en_Bogot%C3%A1_%28Colombia%29.jpg', caption: 'Plaza de Bolivar, a 10 minutos caminando del hostal' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/Calle_empedrada_La_Candelaria.jpg/800px-Calle_empedrada_La_Candelaria.jpg', caption: 'Calles empedradas de La Candelaria, el barrio del Hostal R10' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a4/Museo_del_Oro_-_Fachada.jpg/960px-Museo_del_Oro_-_Fachada.jpg', caption: 'Museo del Oro, a menos de 10 minutos caminando' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4f/Chocolate_santafere%C3%B1o_en_Caf%C3%A9_La_Puerta_Falsa_1.jpg/960px-Chocolate_santafere%C3%B1o_en_Caf%C3%A9_La_Puerta_Falsa_1.jpg', caption: 'Chocolate santafere\u00f1o: desayuno tipico cerca del hostal' }
];

const BASE = {
  slug: SLUG,
  nombre: 'Hostal R10',
  categoria_slug: 'hostal',
  lead: 'Casona historica remodelada en el corazon de La Candelaria, especializada en estudiantes de intercambio. 8.8/10 en Hostelworld (679 reviews), bar en primer piso, terraza con hamacas y literas privadas con espacio cerrado, lampara y enchufe propio.',
  highlight: '8.8/10 Hostelworld \u00b7 8.4 Booking \u00b7 Casona historica \u00b7 Literas privadas con espacio propio \u00b7 Bar + terraza \u00b7 18+ exclusivo',
  ciudad: 'Bogot\u00e1',
  region: 'Cundinamarca',
  barrio: 'La Candelaria',
  lat: 4.5989,
  lng: -74.0709,
  whatsapp: '',
  telefono: '',
  email: '',
  web: 'https://r10colombia.com/es/home',
  instagram: 'https://www.instagram.com/r10bog',
  precio_desde: '$55.000',
  horario: 'Check-in 15:00 - 24:00 / Check-out hasta 12:00 / Recepci\u00f3n 24 h',
  emoji: '\ud83c\udfe0',
  hero_bg: 'linear-gradient(135deg,#7f1d1d,#d97706)',
  foto_hero: HERO,
  tipo: 'Casona historica \u00b7 Para estudiantes de intercambio \u00b7 18+ exclusivo',
  capacidad: '4 dormitorios con literas privadas + 6 habitaciones privadas',
  como_llegar: 'Calle 12B #5-7, La Candelaria, entre Cra 5 y Cra 7. A metros de la Plazoleta del Rosario y Casa de la Moneda. TransMilenio hasta Las Aguas o Museo del Oro y caminar 8-10 minutos.',
  status: 'published',
  destacado: true
};

const TAGS = {
  tipo_alojamiento: 'Casona historica remodelada para estudiantes de intercambio',
  checkin: '15:00 - 24:00',
  checkout: '12:00',
  recepcion: '24 horas',
  edad_minima: '18 anios',
  mascotas: '',
  cocina_compartida: 'Si, cocina compartida para huespedes',
  barrio_descripcion: 'La Candelaria historica: epicentro cultural de Bogota, rodeada de museos, cafeles y plazas. El Hostal R10 queda a minutos del Museo del Oro (500m), Museo Botero (225m), Biblioteca Luis Angel Arango (236m), Parque Santander (500m) y Plaza de Bolivar. Zona segura de dia; en la noche recomiendan moverse por app.',
  politica_cancelacion: 'Cancelacion gratuita hasta 24 horas antes del check-in; despues del plazo se aplica la primera noche. Impuestos NO incluidos en Colombia (19%). Pago con tarjeta tiene comision extra.',
  reglas_casa: 'Check-in desde 15:00 hasta 24:00 / Check-out antes de 12:00\nNo fumadores\nRestriccion de edad: 18+ anios\nPeriodo maximo de estadia: 14 dias\nPago en efectivo o tarjeta (tarjeta con comision extra)\nImpuestos no incluidos (19%)',
  habitaciones: [
    { tipo: 'Dormitorio compartido con litera privada', subtitulo: 'Espacio cerrado propio con lampara, enchufe, colchon nuevo y edredon', badge: 'popular', camas: 'Litera privada', precio: '$55.000' },
    { tipo: 'Habitacion privada doble con ba\u00f1o privado', subtitulo: 'Cama doble, mesita de noche, closet y escritorio', camas: '1 doble', precio: '$130.000' },
    { tipo: 'Habitacion privada doble sin ba\u00f1o privado', subtitulo: 'Cama doble, mesita de noche, closet y escritorio', camas: '1 doble', precio: '$100.000' }
  ],
  amenidades: ['WiFi gratis', 'Bar en primer piso', 'Terraza con hamacas', 'Recepcion 24h', 'Mini-mercado', 'Cocina compartida', 'Espacio coworking', 'Sala de reuniones', 'Parking bicicletas', 'Adaptadores electricos', 'City tour gratis', 'Mapa de la ciudad gratis', 'Internet gratis', 'Desayuno disponible'],
  actividades: [
    { icono: '\ud83c\udf7b', nombre: 'Bar en el hostal', descripcion: 'Bar en el primer piso para tomar algo antes de salir a disfrutar la noche bogotana.' },
    { icono: '\ud83c\udf1f', nombre: 'Terraza con hamacas', descripcion: 'Terraza fresca para relajarse y mirar el atardecer de la capital.' },
    { icono: '\ud83c\udf70', nombre: 'Sala de Netflix y partidos', descripcion: 'Sala de TV con sofa, TV enorme para Netflix, YouTube, Premier League y Champions League.' },
    { icono: '\ud83c\udfdb', nombre: 'Centro historico a pie', descripcion: 'Museo del Oro, Botero, Plaza de Bolivar y Biblioteca Luis Angel Arango se cubren caminando desde la puerta.' },
    { icono: '\ud83e\uddfa', nombre: 'City tour gratis', descripcion: 'El hostal ofrece un recorrido gratuito por La Candelaria para conocer la historia del centro.' }
  ],
  que_incluye: ['Ropa de cama', 'Lockers', 'City tour gratis', 'Mapa de la ciudad'],
  transporte: [
    { icon: '\u2708', title: 'Desde el aeropuerto El Dorado', detail: '15 km: taxi o app en 40-55 minutos. La recepcion puede ayudar a coordinar.' },
    { icon: '\ud83d\ude8b', title: 'TransMilenio', detail: 'Estaciones Las Aguas y Museo del Oro a menos de 10 minutos caminando.' },
    { icon: '\ud83d\udeb6', title: 'Centro historico a pie', detail: 'La Candelaria entera se recorre caminando: museos, plazas y restaurantes a metros.' }
  ],
  eventos_hostal: []
};

const FAQS = [
  { pregunta: 'Donde queda el Hostal R10?', respuesta: 'En la calle 12B #5-7 de La Candelaria, Bogota, entre Cra 5 y Cra 7, a metros de la Plazoleta del Rosario y Casa de la Moneda.' },
  { pregunta: 'Cual es el rating del hostal?', respuesta: '8.8 sobre 10 en Hostelworld (679 reviews) y 8.4 en Booking (1.858 reviews). Personal 9.1, ubicacion 9.4.' },
  { pregunta: 'A que hora es check-in y check-out?', respuesta: 'Check-in desde 15:00 hasta 24:00. Check-out antes de 12:00. Recepcion 24 horas.' },
  { pregunta: 'Hay restriccion de edad?', respuesta: 'Si, solo para mayores de 18 anios. Estadia maxima 14 dias.' },
  { pregunta: 'Como se paga?', respuesta: 'Al momento de la llegada, en efectivo o tarjeta de credito/debito. La tarjeta tiene una comision extra. Los impuestos (19%) no estan incluidos.' }
];

module.exports = { SLUG: SLUG, HERO: HERO, PHOTOS: PHOTOS, BASE: BASE, TAGS: TAGS, FAQS: FAQS };

if (require.main !== module) return;

(async function main() {
  var url = process.env.DATABASE_URL || process.argv[2];
  if (!url) {
    console.error('Falta DATABASE_URL.');
    console.error('Uso: DATABASE_URL=postgres://... node scripts/seed-hostal-r10-bogota.js [--dry]');
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
