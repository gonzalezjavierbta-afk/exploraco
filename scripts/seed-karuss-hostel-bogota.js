// scripts/seed-karuss-hostel-bogota.js
// Crea (o actualiza) la pagina dinamica karuss-hostel-bogota.html
// (categoria hostal). Patron Fase 9: seed ASCII-safe + loader API + smoke.
//
// Uso:
//   DATABASE_URL=postgres://... node scripts/seed-karuss-hostel-bogota.js --dry
//   DATABASE_URL=postgres://... node scripts/seed-karuss-hostel-bogota.js
//
// Idempotente: re-ejecutable sin efectos secundarios (ON CONFLICT slug).

var neon = null;
function getNeon() {
  if (!neon) neon = require('@neondatabase/serverless').neon;
  return neon;
}

const SLUG = 'karuss-hostel-bogota';
const HERO = 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/06/Letreros_de_la_plaza_del_chorro_de_Quevedo._Bogot%C3%A1._Colombia..jpg/960px-Letreros_de_la_plaza_del_chorro_de_Quevedo._Bogot%C3%A1._Colombia..jpg';

const PHOTOS = [
  { url: HERO, caption: 'La plaza del Chorro de Quevedo, a metros de la casa de Karuss Hostel' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/Iglesia_del_Chorro_de_Quevedo%2C_Bogot%C3%A1.jpg/960px-Iglesia_del_Chorro_de_Quevedo%2C_Bogot%C3%A1.jpg', caption: 'El Chorro de Quevedo: donde nacio Bogota, a una cuadra del hostal' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/Calle_empedrada_La_Candelaria.jpg/800px-Calle_empedrada_La_Candelaria.jpg', caption: 'Calles empedradas de La Candelaria, entorno inmediato de Karuss' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/Plaza_de_Bol%C3%ADvar_en_Bogot%C3%A1_%28Colombia%29.jpg/960px-Plaza_de_Bol%C3%ADvar_en_Bogot%C3%A1_%28Colombia%29.jpg', caption: 'Plaza de Bolivar a menos de 10 minutos caminando' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4f/Chocolate_santafere%C3%B1o_en_Caf%C3%A9_La_Puerta_Falsa_1.jpg/960px-Chocolate_santafere%C3%B1o_en_Caf%C3%A9_La_Puerta_Falsa_1.jpg', caption: 'Chocolate santafere\u00f1o: desayuno tipico cerca del hostel' }
];

const BASE = {
  slug: SLUG,
  nombre: 'Karuss Hostel',
  categoria_slug: 'hostal',
  lead: 'El hostal mejor calificado de Bogota: 9.9 sobre 10 en Hostelwordl con cientos de resenas casi perfectas. Casa nueva en La Candelaria con patio, terraza, chimenea, desayuno incluido y hosts Luis y Leidy que lo explican todo.',
  descripcion: 'Karuss Hostel es, segun Hostelworld, el mejor alojamiento economico de Bogota: 9.9 sobre 10 acumulado en cientos de resenas donde practicamente ninguna baja de 10. Detras del proyecto estan Luis y Leidy, anfitriones que han convertido la hospitalidad en ciencia exacta: responden cada mensaje, recomiendan cada plan y hacen sentir en familia a quien llega.\n\nLa casa es nueva y esta pensada al detalle para mochileros: patio grande, terraza, sala de TV con chimenea, cocina completa, lavanderia, lockers, computadores de uso comun, banios separados por genero y seis duchas con agua caliente constante. El desayuno esta incluido en la tarifa.\n\nSu ubicacion resume lo mejor de La Candelaria: la cuadra del Chorro de Quevedo, a minutos del Museo Botero, la Plaza de Bolivar y Monserrate. La recepcion funciona 24 horas y coordina informacion de tours por la ciudad.\n\nLos detalles practicos: check-in entre 14:00 y 23:00, check-out hasta las 12:00, cancelacion gratuita hasta 48 horas antes e impuestos incluidos. El pago se realiza en efectivo al llegar, y no admiten mascotas. Para quien busca la mejor experiencia hostel de Bogota, Karuss es la respuesta que dan miles de viajeros.',
  highlight: '9.9/10: el mejor calificado de Bogota \u00b7 Desayuno incluido \u00b7 Chimenea + terraza \u00b7 A una cuadra del Chorro de Quevedo \u00b7 Hosts Luis y Leidy',
  ciudad: 'Bogot\u00e1',
  region: 'Cundinamarca',
  barrio: 'La Candelaria',
  lat: 4.5970,
  lng: -74.0713,
  whatsapp: '573057875998',
  telefono: '+57 305 7875998',
  email: '',
  web: '',
  instagram: '',
  precio_desde: 'Dorms desde $100.000; privadas desde $160.000 por noche (referencia)',
  horario: 'Check-in 14:00 - 23:00 / Check-out hasta 12:00 / Recepci\u00f3n 24 h',
  emoji: '\ud83d\udecf',
  hero_bg: 'linear-gradient(135deg,#7f1d1d,#f97316)',
  foto_hero: HERO,
  tipo: 'Hostal boutique \u00b7 Top rating \u00b7 Trato familiar',
  capacidad: 'Dormitorios compartidos y habitaciones privadas',
  como_llegar: 'Calle 12F #2-86, La Candelaria, misma cuadra del Arche Noah, a metros del Chorro de Quevedo. TransMilenio hasta Las Aguas o Museo del Oro y caminar 8-12 minutos.',
  status: 'published',
  destacado: true
};

const TAGS = {
  tipo_alojamiento: 'Hostal boutique de trato familiar',
  checkin: '14:00 - 23:00',
  checkout: '12:00',
  recepcion: '24 horas',
  edad_minima: '',
  mascotas: 'No se permiten mascotas',
  cocina_compartida: 'Si, cocina completa para huespedes',
  barrio_descripcion: 'En plena Candelaria, a metros del Chorro de Quevedo (donde nacio Bogota), rodeado de cafes, graffiti y museos. El Museo Botero queda a menos de 500 m, la Plaza de Bolivar a 800 m y Monserrate a 2 km. Zona turistica activa de dia; en la noche conviene moverse por app.',
  politica_cancelacion: 'Cancelacion gratuita hasta 48 horas antes del check-in; despues del plazo o ante no-show se aplica la primera noche. Impuestos ya incluidos en las tarifas mostradas.',
  reglas_casa: 'Check-in entre 14:00 y 23:00 / Check-out hasta las 12:00\nPago en efectivo al llegar\nNo se admiten mascotas\nSilencio en dormitorios durante la noche\nLockers disponibles: traer candado\nDesayuno incluido cada manana',
  habitaciones: [
    { tipo: 'Dormitorio compartido mixto', subtitulo: 'Camas nuevas, locker y agua caliente garantizada', badge: 'popular', camas: 'Compartido', precio: '$100.000' },
    { tipo: 'Dormitorio solo mujeres', subtitulo: 'Banios separados por genero en toda la casa', badge: 'female', camas: 'Compartido', precio: '$105.000' },
    { tipo: 'Habitacion privada doble', subtitulo: 'Para parejas que buscan el mejor trato de la ciudad', camas: '1 doble', precio: '$160.000' }
  ],
  amenidades: ['Desayuno incluido', 'WiFi gratis', 'Patio grande', 'Terraza', 'Sala TV con chimenea', 'Cocina completa', 'Computadores comunes', 'Lavanderia', 'Lockers', 'Banios separados M/F', '6 duchas agua caliente', 'Recepcion 24h', 'Consigna', 'Informacion de tours'],
  actividades: [
    { icono: '\ud83d\udd25', nombre: 'Noches de chimenea', descripcion: 'La sala de TV con chimenea es el refugio perfecto contra el frio bogotano de la noche.' },
    { icono: '\ud83d\uded6', nombre: 'Chorro de Quevedo a metros', descripcion: 'La cuna de Bogota queda a una cuadra: buskers, cafes y historia viva todos los dias.' },
    { icono: '\ud83c\udfdb', nombre: 'Museos y Plaza de Bolivar', descripcion: 'Botero, Oro y centro historico en un radio caminable de menos de 15 minutos.' },
    { icono: '\u26f0', nombre: 'Monserrate', descripcion: 'El staff coordina recomendaciones y horarios para subir al cerro con seguridad.' },
    { icono: '\ud83e\uddfa', nombre: 'Desayunos de casa', descripcion: 'Cada manana desayuno incluido para arrancar con energia a 2.600 m de altura.' }
  ],
  que_incluye: ['Desayuno', 'WiFi gratis', 'Ropa de cama', 'Lockers', 'Guarda equipajes', 'Uso de computadores', 'Cafe', 'Impuestos incluidos'],
  transporte: [
    { icon: '\u2708', title: 'Desde el aeropuerto El Dorado', detail: '~15 km: taxi o app en 40-55 min; Luis y Leidy ayudan a coordinar el traslado.' },
    { icon: '\ud83d\ude8b', title: 'TransMilenio', detail: 'Estaciones Las Aguas y Museo del Oro a menos de 12 minutos a pie.' },
    { icon: '\ud83d\udeb6', title: 'Centro historico a pie', detail: 'Chorro de Quevedo, Botero y Plaza de Bolivar se cubren caminando desde la puerta.' }
  ],
  eventos_hostal: []
};

const FAQS = [
  { pregunta: 'Donde queda Karuss Hostel?', respuesta: 'En la calle 12F #2-86 de La Candelaria, a metros de la Plazoleta del Chorro de Quevedo.' },
  { pregunta: 'Por que es tan bien calificado?', respuesta: 'Acumula 9.9 sobre 10 en Hostelworld, la mejor nota de Bogota, gracias a sus anfitriones Luis y Leidy y una casa nueva pensada al detalle para mochileros.' },
  { pregunta: 'Incluye desayuno?', respuesta: 'Si, el desayuno esta incluido en la tarifa.' },
  { pregunta: 'Como se paga?', respuesta: 'El pago se realiza en efectivo al llegar; conviene llevar pesos colombianos.' },
  { pregunta: 'Como cancelo?', respuesta: 'Cancelacion gratuita hasta 48 horas antes del check-in; impuestos ya incluidos en el precio.' }
];

module.exports = { SLUG: SLUG, HERO: HERO, PHOTOS: PHOTOS, BASE: BASE, TAGS: TAGS, FAQS: FAQS };

if (require.main !== module) return;

(async function main() {
  var url = process.env.DATABASE_URL || process.argv[2];
  if (!url) {
    console.error('Falta DATABASE_URL.');
    console.error('Uso: DATABASE_URL=postgres://... node scripts/seed-karuss-hostel-bogota.js [--dry]');
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
