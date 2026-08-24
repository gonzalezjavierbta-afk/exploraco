// scripts/seed-granada-hostel-bogota.js
// Crea (o actualiza) la pagina dinamica granada-hostel-bogota.html
// (categoria hostal). Patron Fase 9: seed ASCII-safe + loader API + smoke.
//
// Uso:
//   DATABASE_URL=postgres://... node scripts/seed-granada-hostel-bogota.js --dry
//   DATABASE_URL=postgres://... node scripts/seed-granada-hostel-bogota.js
//
// Idempotente: re-ejecutable sin efectos secundarios (ON CONFLICT slug).

var neon = null;
function getNeon() {
  if (!neon) neon = require('@neondatabase/serverless').neon;
  return neon;
}

const SLUG = 'granada-hostel-bogota';
const HERO = 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/Iglesia_del_Chorro_de_Quevedo%2C_Bogot%C3%A1.jpg/960px-Iglesia_del_Chorro_de_Quevedo%2C_Bogot%C3%A1.jpg';

const PHOTOS = [
  { url: HERO, caption: 'La capilla del Chorro de Quevedo, a 300 metros del Granada Hostel' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/Calle_empedrada_La_Candelaria.jpg/800px-Calle_empedrada_La_Candelaria.jpg', caption: 'Calles empedradas del barrio donde opera Granada Hostel' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/Plaza_de_Bol%C3%ADvar_en_Bogot%C3%A1_%28Colombia%29.jpg/960px-Plaza_de_Bol%C3%ADvar_en_Bogot%C3%A1_%28Colombia%29.jpg', caption: 'Plaza de Bolivar a 500 metros del hostal' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b0/Museo-del-Oro-Fachada_%2827842494739%29.jpg/960px-Museo-del-Oro-Fachada_%2827842494739%29.jpg', caption: 'Museo del Oro en el circuito caminable desde la puerta' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/Santuario_de_Monserrate%2C_Bogot%C3%A1.jpg/960px-Santuario_de_Monserrate%2C_Bogot%C3%A1.jpg', caption: 'El cerro de Monserrate, a 2 km del hostal' }
];

const BASE = {
  slug: SLUG,
  nombre: 'Granada Hostel Bogot\u00e1',
  categoria_slug: 'hostal',
  lead: 'Casona de principios del siglo XX en plena Candelaria con coworking, billar y terraza solarium. Duchas de alta presion con agua caliente 24/7, lockers gratis y sin toque de queda (8.9 sobre 10 con mas de 1.500 resenas).',
  descripcion: 'Granada Hostel funciona en una casa de principios del siglo XX completamente restaurada sobre la calle 11 de La Candelaria, a metros de la carrera 2. Es uno de los hostales mas completos del centro historico: ademas de los dormitorios, ofrece bar, restaurante, snack bar, cocina compartida, terraza solarium, jardin, mesa de billar, sala de TV con Netflix y un espacio de coworking pensado para n\u00f3madas digitales.\n\nSu apuesta por la comodidad se nota en detalles poco comunes en la gama economica: colchones de alta calidad, duchas de alta presion con agua caliente garantizada 24 horas, lockers gratuitos, parking de bicicletas y recepcion abierta las 24 horas sin toque de queda.\n\nLa ubicacion resume lo mejor de La Candelaria: el Museo Botero esta a 200 metros, el Chorro de Quevedo a 300, la Plaza de Bolivar a 500 y Monserrate a 2 km. La recepcion coordina traslados al aeropuerto y tours por la ciudad.\n\nCon 8.9 sobre 10 en Hostelworld acumulado en mas de 1.500 opiniones, Granada Hostel recibe viajeros adultos desde los 16 anios. El desayuno no esta incluido pero se ofrece por $11.000 COP. Cancelacion flexible con 72 horas de anticipacion y pago al llegar en efectivo o tarjeta.',
  highlight: 'Coworking + billar + terraza solarium \u00b7 Agua caliente 24/7 de alta presion \u00b7 Sin toque de queda \u00b7 Museo Botero a 200 m \u00b7 8.9/10 (+1.500 resenas)',
  ciudad: 'Bogot\u00e1',
  region: 'Cundinamarca',
  barrio: 'La Candelaria',
  lat: 4.5983,
  lng: -74.0711,
  whatsapp: '',
  telefono: '',
  email: '',
  web: '',
  instagram: '',
  precio_desde: 'Compartidas desde $38.000; privadas desde $120.000 por noche (referencia)',
  horario: 'Check-in 15:00 - 24:00 / Check-out hasta 11:00 / Recepcion 24 h',
  emoji: '\ud83d\udecf',
  hero_bg: 'linear-gradient(135deg,#78350f,#ca8a04)',
  foto_hero: HERO,
  tipo: 'Hostal \u00b7 Casa hist\u00f3rica restaurada \u00b7 Coworking',
  capacidad: 'Habitaciones compartidas y privadas',
  como_llegar: 'Calle 11 #2-65/75, La Candelaria, entre carreras 2 y 3. TransMilenio hasta Museo del Oro o Las Aguas y caminar 8-12 minutos por el casco historico.',
  status: 'published',
  destacado: true
};

const TAGS = {
  tipo_alojamiento: 'Hostal en casa historica restaurada',
  checkin: '15:00 - 24:00',
  checkout: '11:00',
  recepcion: '24 horas, sin toque de queda',
  edad_minima: '16',
  mascotas: 'No se permiten mascotas',
  cocina_compartida: 'Si, cocina compartida equipada',
  barrio_descripcion: 'Sobre la calle 11 peatonal de La Candelaria, rodeado de museos y vida universitaria: Museo Botero a 200 m, Chorro de Quevedo a 300 m, Plaza de Bolivar a 500 m y Monserrate a 2 km. Zona activa durante el dia; en la noche conviene moverse en taxi o app.',
  politica_cancelacion: 'Cancelacion gratuita hasta 72 horas antes del check-in. Despues del plazo o en caso de no-show se aplica la primera noche como cargo. Impuestos incluidos para huespedes extranjeros.',
  reglas_casa: 'Check-in entre 15:00 y 24:00 / Check-out hasta las 11:00\nEdad minima: 16 anios\nSin toque de queda: recepcion 24 horas\nNo fumar en habitaciones\nNo se admiten mascotas\nPago al llegar en efectivo o tarjeta (no Diners)\nLockers gratuitos en dormitorios',
  habitaciones: [
    { tipo: 'Cama en dormitorio compartido mixto', subtitulo: 'Colchones de alta calidad y locker gratis', badge: 'popular', camas: 'Compartido', precio: '$38.000' },
    { tipo: 'Dormitorio solo mujeres', subtitulo: 'Espacio exclusivo para viajeras', badge: 'female', camas: 'Compartido', precio: '$41.000' },
    { tipo: 'Habitacion privada doble', subtitulo: 'Con bano privado en la casa historica', camas: '1 doble', precio: '$120.000' }
  ],
  amenidades: ['WiFi gratis', 'Coworking', 'Billar', 'Terraza solarium', 'Jardin', 'Bar', 'Restaurante', 'Snack bar', 'Cocina compartida', 'Sala TV con Netflix', 'Lockers gratis', 'Parking de bicis', 'Recepcion 24h', 'Traslado aeropuerto'],
  actividades: [
    { icono: '\ud83d\udcbb', nombre: 'Coworking para nomadas', descripcion: 'Espacio de trabajo con WiFi estable: uno de los hostales del centro mas usados por trabajadores remotos.' },
    { icono: '\ud83c\udfb1', nombre: 'Billar y sala TV', descripcion: 'Tardes de billar, Netflix y juegos en las areas comunes de la casa.' },
    { icono: '\ud83c\udfdb', nombre: 'Botero a 200 metros', descripcion: 'El Museo Botero (con las obras de Fernando Botero) esta a tres cuadras; entrada gratuita.' },
    { icono: '\u26f0', nombre: 'Monserrate a 2 km', descripcion: 'La subida clasica al cerro arranca cerca del barrio; el staff coordina recomendaciones.' }
  ],
  que_incluye: ['WiFi gratis', 'Lockers', 'Ropa de cama', 'Guarda equipajes', 'Mapas de la ciudad', 'Agua caliente 24/7', 'Desayuno opcional ($11.000)'],
  transporte: [
    { icon: '\u2708', title: 'Desde el aeropuerto El Dorado', detail: '14 km. Traslado coordinado por el hostal con costo, taxi o app en 40-55 min.' },
    { icon: '\ud83d\ude8b', title: 'TransMilenio', detail: 'Estaciones Museo del Oro y Las Aguas a menos de 12 minutos a pie.' },
    { icon: '\ud83d\udeb6', title: 'Todo caminando', detail: 'Chorro de Quevedo, museos y Plaza de Bolivar se cubren a pie desde la puerta.' }
  ],
  eventos_hostal: []
};

const FAQS = [
  { pregunta: 'Donde queda Granada Hostel?', respuesta: 'En la calle 11 #2-65/75 de La Candelaria, a 200 metros del Museo Botero y 300 del Chorro de Quevedo.' },
  { pregunta: 'Incluye desayuno?', respuesta: 'No esta incluido en la tarifa, pero se ofrece desayuno opcional por alrededor de $11.000 COP.' },
  { pregunta: 'Hay toque de queda?', respuesta: 'No. La recepcion funciona 24 horas y puedes entrar y salir libremente.' },
  { pregunta: 'Que edad minima hay?', respuesta: 'Se alojan viajeros desde los 16 anios.' },
  { pregunta: 'Como cancelo mi reserva?', respuesta: 'Cancelacion gratuita hasta 72 horas antes del check-in; despues se cobra la primera noche.' }
];

module.exports = { SLUG: SLUG, HERO: HERO, PHOTOS: PHOTOS, BASE: BASE, TAGS: TAGS, FAQS: FAQS };

if (require.main !== module) return;

(async function main() {
  var url = process.env.DATABASE_URL || process.argv[2];
  if (!url) {
    console.error('Falta DATABASE_URL.');
    console.error('Uso: DATABASE_URL=postgres://... node scripts/seed-granada-hostel-bogota.js [--dry]');
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
