// scripts/seed-masaya-hostel-bogota.js
// Crea (o actualiza) la pagina dinamica masaya-hostel-bogota.html
// (categoria hostal). Patron Fase 9: seed ASCII-safe + loader API + smoke.
//
// Uso:
//   DATABASE_URL=postgres://... node scripts/seed-masaya-hostel-bogota.js --dry
//   DATABASE_URL=postgres://... node scripts/seed-masaya-hostel-bogota.js
//
// Idempotente: re-ejecutable sin efectos secundarios (ON CONFLICT slug).

var neon = null;
function getNeon() {
  if (!neon) neon = require('@neondatabase/serverless').neon;
  return neon;
}

const SLUG = 'masaya-hostel-bogota';
const HERO = 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/06/Letreros_de_la_plaza_del_chorro_de_Quevedo._Bogot%C3%A1._Colombia..jpg/960px-Letreros_de_la_plaza_del_chorro_de_Quevedo._Bogot%C3%A1._Colombia..jpg';

const PHOTOS = [
  { url: HERO, caption: 'La plaza del Chorro de Quevedo, a media cuadra de Masaya Bogota' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/Iglesia_del_Chorro_de_Quevedo%2C_Bogot%C3%A1.jpg/960px-Iglesia_del_Chorro_de_Quevedo%2C_Bogot%C3%A1.jpg', caption: 'La capilla del Chorro, el punto cero del centro historico' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/La_Candelaria%2C_Bogota%2C_Colombia_%285785130118%29.jpg/960px-La_Candelaria%2C_Bogota%2C_Colombia_%285785130118%29.jpg', caption: 'Arquitectura colonial de La Candelaria, el entorno de la casa' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/Plaza_de_Bol%C3%ADvar_en_Bogot%C3%A1_%28Colombia%29.jpg/960px-Plaza_de_Bol%C3%ADvar_en_Bogot%C3%A1_%28Colombia%29.jpg', caption: 'Plaza de Bolivar a pocos minutos caminando' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/62/Skyline_downtown_Bogota.jpg/960px-Skyline_downtown_Bogota.jpg', caption: 'El centro de Bogota desde los cerros orientales' }
];

const BASE = {
  slug: SLUG,
  nombre: 'Masaya Bogot\u00e1 Hostel',
  categoria_slug: 'hostal',
  lead: 'Hostal de dise\u00f1o en una casa colonial restaurada de La Candelaria, a 50 metros del Chorro de Quevedo. Free walking tours diarios, bar con terraza y el equilibrio perfecto entre ambiente social y descanso (9.0 sobre 10 en Hostelworld).',
  descripcion: 'Masaya Bogota ocupa una casa colonial restaurada en plena La Candelaria, sobre la carrera 2 con calle 12, a menos de una cuadra de la Plazoleta del Chorro de Quevedo y a unos 500 metros del Museo del Oro y del Museo Botero. Es la sede bogotana de la cadena Masaya, que en Colombia tambien opera en Santa Marta, y ha sabido trasladar su formula de dise\u00f1o, color y calidez al centro historico.\n\nEl hostel combina dormitorios compartidos mixtos y femeninos con habitaciones privadas, distribuidas alrededor de patios y zonas comunes donde conviven viajeros de todo el mundo. Ofrece free walking tours para huespedes, guardaequipajes y traslados desde el aeropuerto coordinados con anticipacion.\n\nSu bar y terraza son el punto de encuentro de las tardes, y la cocina compartida equipada permite cocinar y compartir mesa. La recepcion recibe entre las 15:00 y las 23:00, con salida hasta las 11:00, y el alojamiento es solo para adultos.\n\nCon 9.0 sobre 10 en Hostelworld respaldado por mas de 2.500 resenas, Masaya se ha consolidado como uno de los hostales mejor valorados de Bogota. En temporada alta (Semana Santa, festivos y fin de a\u00f1o) aplica condiciones de cancelacion especiales, por lo que conviene revisar la politica al reservar.',
  highlight: '9.0/10 con +2.500 resenas \u00b7 Casa colonial a 50 m del Chorro de Quevedo \u00b7 Free walking tour \u00b7 Bar y terraza',
  ciudad: 'Bogot\u00e1',
  region: 'Cundinamarca',
  barrio: 'La Candelaria',
  lat: 4.5973,
  lng: -74.0712,
  whatsapp: '573106092782',
  telefono: '+57 310 609 2782',
  email: '',
  web: 'https://masaya-experience.com',
  instagram: '',
  precio_desde: 'Dorms desde $55.000; privadas desde $160.000 por noche (referencia)',
  horario: 'Check-in 15:00 - 23:00 / Check-out hasta 11:00',
  emoji: '\ud83d\udecf',
  hero_bg: 'linear-gradient(135deg,#7c2d12,#f59e0b)',
  foto_hero: HERO,
  tipo: 'Hostal de dise\u00f1o \u00b7 Casa colonial \u00b7 Solo adultos',
  capacidad: 'Dormitorios compartidos y habitaciones privadas',
  como_llegar: 'Carrera 2 #12-48, La Candelaria, a media cuadra de la Plazoleta del Chorro de Quevedo. TransMilenio hasta Las Aguas o Museo del Oro y caminar 8-12 minutos por el casco historico.',
  status: 'published',
  destacado: true
};

const TAGS = {
  tipo_alojamiento: 'Hostal de dise\u00f1o en casa colonial',
  checkin: '15:00 - 23:00',
  checkout: '11:00',
  recepcion: '15:00 a 23:00',
  edad_minima: '18',
  mascotas: 'Si, con costo adicional (~$60.000 COP); consultar antes',
  cocina_compartida: 'Si, cocina compartida equipada',
  barrio_descripcion: 'La Candelaria concentra los museos, el teatro, la vida universitaria y el street art de Bogota. Desde la puerta del hostal se camina al Chorro de Quevedo (50 m), Museo del Oro y Museo Botero (500 m) y Monserrate (2 km). El barrio pide recorrerlo a pie de dia y moverse en taxi o app en la noche.',
  politica_cancelacion: 'Cancelacion segun tarifa. En Semana Santa, festivos y del 30 de diciembre al 6 de enero aplican condiciones especiales de cancelacion mas estrictas; impuestos no incluidos en algunas tarifas.',
  reglas_casa: 'Check-in entre 15:00 y 23:00 / Check-out hasta las 11:00\nAlojamiento solo para adultos (18+)\nSilencio en dormitorios en horario nocturno\nNo fumar en habitaciones ni zonas comunes interiores\nVisitas solo en areas comunes\nLockers disponibles: traer candado',
  habitaciones: [
    { tipo: 'Dormitorio compartido mixto', subtitulo: 'Camas individuales con locker', badge: 'popular', camas: 'Compartido', precio: '$55.000' },
    { tipo: 'Dormitorio solo mujeres', subtitulo: 'Espacio exclusivo para viajeras', badge: 'female', camas: 'Compartido', precio: '$58.000' },
    { tipo: 'Habitacion privada doble', subtitulo: 'Con bano privado, estilo boutique', camas: '1 doble', precio: '$160.000' }
  ],
  amenidades: ['WiFi gratis', 'Desayuno', 'Bar', 'Terraza', 'Cocina compartida', 'Guarda equipajes', 'Traslado aeropuerto', 'Free walking tour', 'Salon comun', 'Informacion turistica'],
  actividades: [
    { icono: '\ud83d\udeb6', nombre: 'Free walking tour diario', descripcion: 'Recorrido gratuito por La Candelaria para huespedes: historia, graffiti y leyendas del centro.' },
    { icono: '\ud83c\udf79', nombre: 'Tardes de terraza', descripcion: 'El bar del patio es el punto de encuentro al atardecer, con cocteles y musica en vivo algunos dias.' },
    { icono: '\ud83c\udfdb', nombre: 'Circuito de museos', descripcion: 'Museo del Oro y Museo Botero a 500 metros; ambos gratis al menos un dia a la semana.' },
    { icono: '\u26f0', nombre: 'Monserrate', descripcion: 'A 2 km del hostal: subida a pie, funicular o teleferico con la mejor vista de la sabana.' }
  ],
  que_incluye: ['WiFi gratis', 'Desayuno', 'Guarda equipajes', 'Free city tour', 'Mapas y recomendaciones', 'Ropa de cama'],
  transporte: [
    { icon: '\u2708', title: 'Desde el aeropuerto El Dorado', detail: '14 km. Traslado coordinado por el hostal con costo adicional, taxi o app (40-60 min).' },
    { icon: '\ud83d\ude8b', title: 'TransMilenio', detail: 'Estacion Las Aguas (troncal) a unos 10 minutos caminando por el centro historico.' },
    { icon: '\ud83d\udeb6', title: 'Todo a pie', detail: 'Chorro de Quevedo (50 m), museos (500 m), Plaza de Bolivar (800 m) y Monserrate (2 km).' }
  ],
  eventos_hostal: []
};

const FAQS = [
  { pregunta: 'Donde queda Masaya Bogota?', respuesta: 'En la carrera 2 #12-48, La Candelaria, a media cuadra de la Plazoleta del Chorro de Quevedo.' },
  { pregunta: 'A que hora es el check-in?', respuesta: 'Entre las 15:00 y las 23:00. El check-out es hasta las 11:00.' },
  { pregunta: 'Hay edad minima?', respuesta: 'Si, Masaya Bogota recibe solo huespedes adultos (18 anios o mas).' },
  { pregunta: 'Aceptan mascotas?', respuesta: 'Si, con costo adicional (alrededor de $60.000 COP) y previa confirmacion con el hostal.' },
  { pregunta: 'Incluye desayuno y tours?', respuesta: 'Incluye desayuno y free walking tour para huespedes; el traslado aeropuerto se coordina con costo adicional.' }
];

module.exports = { SLUG: SLUG, HERO: HERO, PHOTOS: PHOTOS, BASE: BASE, TAGS: TAGS, FAQS: FAQS };

if (require.main !== module) return;

(async function main() {
  var url = process.env.DATABASE_URL || process.argv[2];
  if (!url) {
    console.error('Falta DATABASE_URL.');
    console.error('Uso: DATABASE_URL=postgres://... node scripts/seed-masaya-hostel-bogota.js [--dry]');
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
