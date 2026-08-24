// scripts/seed-cranky-croc-hostel-bogota.js
// Crea (o actualiza) la pagina dinamica cranky-croc-hostel-bogota.html
// (categoria hostal). Patron Fase 9: seed ASCII-safe + loader API + smoke.
//
// Uso:
//   DATABASE_URL=postgres://... node scripts/seed-cranky-croc-hostel-bogota.js --dry
//   DATABASE_URL=postgres://... node scripts/seed-cranky-croc-hostel-bogota.js
//
// Idempotente: re-ejecutable sin efectos secundarios (ON CONFLICT slug).

var neon = null;
function getNeon() {
  if (!neon) neon = require('@neondatabase/serverless').neon;
  return neon;
}

const SLUG = 'cranky-croc-hostel-bogota';
const HERO = 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/Calle_empedrada_La_Candelaria.jpg/800px-Calle_empedrada_La_Candelaria.jpg';

const PHOTOS = [
  { url: HERO, caption: 'Calles empedradas de La Candelaria, el barrio donde vive The Cranky Croc' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/Plaza_de_Bol%C3%ADvar_en_Bogot%C3%A1_%28Colombia%29.jpg/960px-Plaza_de_Bol%C3%ADvar_en_Bogot%C3%A1_%28Colombia%29.jpg', caption: 'La Plaza de Bolivar, a pocas cuadras caminando del hostal' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/Iglesia_del_Chorro_de_Quevedo%2C_Bogot%C3%A1.jpg/960px-Iglesia_del_Chorro_de_Quevedo%2C_Bogot%C3%A1.jpg', caption: 'La capilla del Chorro de Quevedo, punto de partida del centro historico' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b0/Museo-del-Oro-Fachada_%2827842494739%29.jpg/960px-Museo-del-Oro-Fachada_%2827842494739%29.jpg', caption: 'Fachada del Museo del Oro, imperdible vecino del hostel' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/Santuario_de_Monserrate%2C_Bogot%C3%A1.jpg/960px-Santuario_de_Monserrate%2C_Bogot%C3%A1.jpg', caption: 'Monserrate, la caminata clasica que el staff recomienda a cada huesped' }
];

const BASE = {
  slug: SLUG,
  nombre: 'The Cranky Croc Hostel',
  categoria_slug: 'hostal',
  lead: 'El hostal mas iconico de La Candelaria: casa colonial colorida con patio, terraza y restaurante, a pasos de la Plaza de Bolivar. El mejor calificado en volumen de Bogota en Hostelworld (9.7 sobre 10 con miles de resenas).',
  descripcion: 'The Cranky Croc Hostel es, para buena parte de los mochileros que recorren Colombia, LA referencia de Bogota. Opera en una casa colonial restaurada en pleno corazon de La Candelaria, pintada con los colores vivos que lo hicieron famoso, y combina dormitorios compartidos con habitaciones privadas a precios que siguen siendo de los mejores del centro historico.\n\nSu ubicacion es su gran ventaja competitiva: en pocas cuadras se alcanzan caminando la Plaza de Bolivar, el Museo del Oro, el Museo Botero y la Plazoleta del Chorro de Quevedo. El staff organiza y recomienda free walking tours, salidas al graffiti tour y las subidas a Monserrate, por lo que es un punto de partida natural para quien llega a la ciudad sin plan cerrado.\n\nLas zonas sociales son el alma del lugar: jardin interior, salon comun, terraza y restaurante donde los viajeros cocinan, trabajan e intercambian rutas por Colombia. El ambiente es social pero ordenado, con un publico mixto de mochileros europeos, norteamericanos y latinoamericanos que suelen quedarse varios dias.\n\nCon una puntuacion de 9.7 sobre 10 en Hostelworld respaldada por casi cuatro mil resenas, es uno de los hostales mejor valorados del pais. Los dormitorios incluyen lockers y enchufes individuales, y las privadas son ideales para parejas que buscan precio y ubicacion en el centro.',
  highlight: '9.7/10 con casi 4.000 resenas \u00b7 Casa colonial iconica de La Candelaria \u00b7 Patio, terraza y restaurante \u00b7 A pasos de la Plaza de Bolivar',
  ciudad: 'Bogot\u00e1',
  region: 'Cundinamarca',
  barrio: 'La Candelaria',
  lat: 4.5968,
  lng: -74.0706,
  whatsapp: '',
  telefono: '',
  email: '',
  web: '',
  instagram: '',
  precio_desde: 'Dorms desde $92.000; privadas desde $106.000 por noche (referencia)',
  horario: 'Check-in desde 15:00 / Check-out hasta 11:00',
  emoji: '\ud83d\udecf',
  hero_bg: 'linear-gradient(135deg,#3b0764,#c2410c)',
  foto_hero: HERO,
  tipo: 'Hostal boutique \u00b7 Casa colonial \u00b7 Ambiente social',
  capacidad: 'Dormitorios compartidos y habitaciones privadas',
  como_llegar: 'En el corazon de La Candelaria, entre las carreras 3 y 4 con calle 12D. TransMilenio o SITP hasta el centro (Museo del Oro / Las Aguas) y 5-10 minutos a pie. Desde la Plaza de Bolivar, 4 cuadras hacia el oriente.',
  status: 'published',
  destacado: true
};

const TAGS = {
  tipo_alojamiento: 'Hostal boutique en casa colonial',
  checkin: '15:00',
  checkout: '11:00',
  recepcion: 'Recepcion diurna con consigna',
  edad_minima: '',
  mascotas: '',
  cocina_compartida: 'Si, cocina compartida para huespedes',
  barrio_descripcion: 'La Candelaria es el barrio historico de Bogota: calles empedradas, casonas coloniales, graffiti, museos y universidades. Es la zona con mas oferta de hostales de la ciudad y la mejor conectada al centro. Como todo centro historico, se recomienda moverse con precaucion en la noche y usar apps de transporte para trayectos largos.',
  politica_cancelacion: 'Cancelacion gratuita reservando con mas de 2 dias de antelaci\u00f3n (politica estandar de Hostelworld). Cancelaciones tardias o no-show pueden cobrar la primera noche.',
  reglas_casa: 'Check-in desde las 15:00 / Check-out hasta las 11:00\nAmbiente social respetuoso: silencio en dormitorios despues de medianoche\nNo se permite fumar en habitaciones (solo zonas exteriores)\nVisitas externas solo en zonas comunes\nLockers disponibles: traer candado\nPago en efectivo y tarjeta al llegar',
  habitaciones: [
    { tipo: 'Dormitorio compartido mixto', subtitulo: 'Camas con locker y enchufe individual', badge: 'popular', camas: 'Compartido', precio: '$92.000' },
    { tipo: 'Dormitorio solo mujeres', subtitulo: 'Para viajeras que prefieren espacio exclusivo', badge: 'female', camas: 'Compartido', precio: '$96.000' },
    { tipo: 'Habitacion privada doble', subtitulo: 'Ideal para parejas, bano compartido', camas: '1 doble', precio: '$106.000' }
  ],
  amenidades: ['WiFi gratis', 'Desayuno', 'Restaurante', 'Terraza', 'Jardin', 'Salon comun', 'Cocina compartida', 'Lockers', 'Consigna', 'Tours e informacion turistica'],
  actividades: [
    { icono: '\ud83d\udeb6', nombre: 'Free walking tour', descripcion: 'Recorridos a pie por La Candelaria que parten cerca del hostal; el staff ayuda a reservar cupo.' },
    { icono: '\ud83c\udfa8', nombre: 'Graffiti tour', descripcion: 'El street art del centro historico es de los mejores de Latinoamerica y se explora caminando desde la puerta.' },
    { icono: '\u26f0', nombre: 'Subida a Monserrate', descripcion: 'El clasico de Bogota: a pie por el camino del santuario o en funicular, con vista total de la sabana.' },
    { icono: '\ud83c\udfdb', nombre: 'Museos del centro', descripcion: 'Museo del Oro, Museo Botero y Plaza de Bolivar en un radio de menos de 10 minutos caminando.' },
    { icono: '\ud83c\udfb6', nombre: 'Noches sociales', descripcion: 'El patio y el restaurante concentran la vida del hostel: intercambio de rutas, juegos y cenas compartidas.' }
  ],
  que_incluye: ['WiFi gratis', 'Lockers en dormitorios', 'Guarda equipajes', 'Mapas de la ciudad', 'Cafe y desayuno', 'Recomendaciones de tours'],
  transporte: [
    { icon: '\u2708', title: 'Desde el aeropuerto El Dorado', detail: 'Aproximadamente 45-60 minutos en taxi o app (14 km). Tambien hay transfer coordinado por el hostal previa solicitud.' },
    { icon: '\ud83d\ude8b', title: 'TransMilenio y SITP', detail: 'Estaciones del centro (Museo del Oro, Las Aguas) a menos de 15 minutos caminando.' },
    { icon: '\ud83d\udeb6', title: 'Centro historico a pie', detail: 'Plaza de Bolivar, Museo del Oro, Chorro de Quevedo y Museo Botero se cubren todos caminando.' }
  ],
  eventos_hostal: []
};

const FAQS = [
  { pregunta: 'Donde queda The Cranky Croc Hostel?', respuesta: 'En La Candelaria, el centro historico de Bogota, a pocas cuadras de la Plaza de Bolivar y del Museo del Oro.' },
  { pregunta: 'Cuanto cuesta dormir en Cranky Croc?', respuesta: 'Los dormitorios compartidos arrancan alrededor de $92.000 COP por noche y las privadas dobles desde $106.000 (precios de referencia que varian por temporada).' },
  { pregunta: 'Por que es tan famoso?', respuesta: 'Es el hostal mejor valorado de Bogota en volumen: 9.7 sobre 10 en Hostelworld con casi 4.000 resenas, en una casa colonial colorida con patio, terraza y restaurante.' },
  { pregunta: 'Incluye desayuno?', respuesta: 'Si, el hostal ofrece desayuno y ademas cuenta con restaurante y cocina compartida para los huespedes.' },
  { pregunta: 'Es seguro alojarse en La Candelaria?', respuesta: 'La zona de hostales es activa y vigilada durante el dia; en la noche se recomienda usar transporte por app para desplazamientos fuera del barrio.' }
];

module.exports = { SLUG: SLUG, HERO: HERO, PHOTOS: PHOTOS, BASE: BASE, TAGS: TAGS, FAQS: FAQS };

if (require.main !== module) return;

(async function main() {
  var url = process.env.DATABASE_URL || process.argv[2];
  if (!url) {
    console.error('Falta DATABASE_URL.');
    console.error('Uso: DATABASE_URL=postgres://... node scripts/seed-cranky-croc-hostel-bogota.js [--dry]');
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
