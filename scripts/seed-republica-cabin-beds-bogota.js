// scripts/seed-republica-cabin-beds-bogota.js
// Crea (o actualiza) la pagina dinamica republica-cabin-beds-cabin... (categoria hostal).
// Patron Fase 9: seed ASCII-safe + loader API + smoke.
//
// Uso:
//   DATABASE_URL=postgres://... node scripts/seed-republica-cabin-beds-bogota.js --dry
//   DATABASE_URL=postgres://... node scripts/seed-republica-cabin-beds-bogota.js
//
// Idempotente: re-ejecutable sin efectos secundarios (ON CONFLICT slug).

var neon = null;
function getNeon() {
  if (!neon) neon = require('@neondatabase/serverless').neon;
  return neon;
}

const SLUG = 'republica-cabin-beds-bogota';
const HERO = 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f8/Bogot%C3%A1_Chapinero_de_noche.JPG/960px-Bogot%C3%A1_Chapinero_de_noche.JPG';

const PHOTOS = [
  { url: HERO, caption: 'Chapinero de noche: el barrio que alberga Republica Bogota Cabin Beds' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/Iglesia_de_Nuestra_Se%C3%B1ora_de_Lourdes%2C_Bogot%C3%A1.jpg/800px-Iglesia_de_Nuestra_Se%C3%B1ora_de_Lourdes%2C_Bogot%C3%A1.jpg', caption: 'Iglesia de Lourdes y Parque Lourdes, a pocas cuadras del hostal' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/Panoramica_Chapinero_%28Bogot%C3%A1%29.jpg/960px-Panoramica_Chapinero_%28Bogot%C3%A1%29.jpg', caption: 'Panoramica de Chapinero desde los cerros orientales' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e9/2019_Bogot%C3%A1_-_Avenida_Caracas_con_calle_24_B.jpg/960px-2019_Bogot%C3%A1_-_Avenida_Caracas_con_calle_24_B.jpg', caption: 'Avenida Caracas, eje de transporte rapido hacia todo Bogota' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/eb/Bogot%C3%A1_desde_el_parque_nacional%2C_Chapinero_Alto.jpg/960px-Bogot%C3%A1_desde_el_parque_nacional%2C_Chapinero_Alto.jpg', caption: 'Vista del sector Chapinero Alto, vecino de Quinta Camacho' }
];

const BASE = {
  slug: SLUG,
  nombre: 'Rep\u00fablica Bogot\u00e1 Cabin Beds',
  categoria_slug: 'hostal',
  lead: 'Camas cabina con cortinas blackout en la Quinta Camacho de Chapinero: privacidad total dentro del dormitorio compartido. Bar con karaoke, jardin y terraza en un hostel solo para adultos (8.8 sobre 10 con cientos de resenas).',
  descripcion: 'Republica Bogota Cabin Beds reinventa el dormitorio compartido: cada cama es una cabina individual equipada con cortinas blackout para oscuridad total, luz propia, enchufe y casillero. La formula responde a la pregunta clasica del mochilero adulto: como compartir habitacion sin sacrificar privacidad ni descanso.\n\nEl hostel ocupa una casa del barrio Quinta Camacho, el sector patrimonial de Chapinero entre las calles 67 y 70, rodeado de arquitectura inglesa, cafes y restaurantes. Esta a 10 minutos caminando del Parque de la 93 y a menos de 2 km de las zonas T y G, epicentros de vida nocturna de la ciudad.\n\nLa casa combina cabin beds mixtas y femeninas con habitaciones dobles privadas con bano. Sus areas sociales incluyen jardin, terraza, bar con noches de karaoke, cocina compartida y recepcion 24 horas con WiFi gratis en todo el predio.\n\nEs un espacio exclusivo para adultos: no se admiten ninos ni mascotas, lo que mantiene un ambiente tranquilo y ordenado. Con 8.8 sobre 10 acumulado en cientos de resenas (Airpaz y agencias), es la opcion favorita para profesionales en viaje, n\u00f3madas digitales y parejas que buscan precio de hostel con experiencia superior.',
  highlight: 'Cabin beds con cortina blackout + enchufe \u00b7 Solo adultos \u00b7 Bar con karaoke \u00b7 Quinta Camacho, entre Parque 93 y Zona T \u00b7 8.8/10',
  ciudad: 'Bogot\u00e1',
  region: 'Cundinamarca',
  barrio: 'Quinta Camacho (Chapinero)',
  lat: 4.6498,
  lng: -74.0590,
  whatsapp: '',
  telefono: '',
  email: '',
  web: '',
  instagram: '',
  precio_desde: 'Cabin beds desde $45.000; privadas desde $130.000 por noche (referencia)',
  horario: 'Check-in 15:00 - 23:00 / Check-out hasta 12:00',
  emoji: '\ud83d\udecf',
  hero_bg: 'linear-gradient(135deg,#111827,#4f46e5)',
  foto_hero: HERO,
  tipo: 'Hostal adults-only \u00b7 Cabin beds \u00b7 Quinta Camacho',
  capacidad: 'Cabin beds compartidas y habitaciones privadas',
  como_llegar: 'Carrera 12 #68-28, Quinta Camacho, Chapinero. TransMilenio hasta la calle 63 o estacion H\u00e9roes y caminar 5-10 minutos; tambien sirven multiples rutas SITP por la carrera 13 y calle 70.',
  status: 'published',
  destacado: true
};

const TAGS = {
  tipo_alojamiento: 'Hostal adults-only con cabin beds',
  checkin: '15:00 - 23:00',
  checkout: '12:00',
  recepcion: '24 horas',
  edad_minima: '18',
  mascotas: 'No se admiten mascotas',
  cocina_compartida: 'Si, cocina compartida',
  barrio_descripcion: 'Quinta Camacho es un barrio patrimonial de Chapinero con casas de estilo ingles convertidas en cafes, restaurantes y hostales. Queda entre el Parque de la 93 (10 min a pie), la Zona T/Zona G (~2 km) y el parque Lourdes. Sector seguro, comercial y muy bien conectado por TransMilenio y SITP.',
  politica_cancelacion: 'Cancelacion gratuita hasta 1 dia antes de la llegada (politica estandar). Impuestos (19%) no incluidos para residentes colombianos; huespedes extranjeros con pasaporte quedan exentos.',
  reglas_casa: 'Check-in entre 15:00 y 23:00 / Check-out hasta las 12:00\nHostel solo para adultos (+18): no se admiten ninos\nNo se admiten mascotas\nSilencio en cabinas durante la noche\nNo fumar en habitaciones ni areas interiores\nLockers disponibles: traer candado\nToallas en alquiler',
  habitaciones: [
    { tipo: 'Cabin bed en dormitorio mixto', subtitulo: 'Cortina blackout, luz propia, enchufe y locker', badge: 'popular', camas: 'Compartido (cama cabina)', precio: '$45.000' },
    { tipo: 'Cabin bed en dormitorio femenino', subtitulo: 'Cabina exclusiva en habitacion solo mujeres', badge: 'female', camas: 'Compartido (cama cabina)', precio: '$47.000' },
    { tipo: 'Habitacion privada doble', subtitulo: 'Con bano privado, para parejas o amigos', camas: '1 doble', precio: '$130.000' }
  ],
  amenidades: ['WiFi gratis', 'Bar', 'Karaoke', 'Jardin', 'Terraza', 'Recepcion 24h', 'Cocina compartida', 'Lockers'],
  actividades: [
    { icono: '\ud83c\udfa4', nombre: 'Noches de karaoke', descripcion: 'El bar del hostel organiza noches de karaoke: el plan social por excelencia de la casa.' },
    { icono: '\u2615', nombre: 'Ruta de cafes Camacho', descripcion: 'El barrio Quinta Camacho concentra algunos de los mejores cafes de especialidad de Bogota.' },
    { icono: '\ud83d\udcd0', nombre: 'Parque de la 93 y Zona T', descripcion: 'Restaurantes, bares y vida urbana a menos de 15 minutos caminando.' },
    { icono: '\ud83c\udfdf', nombre: 'El Campin', descripcion: 'El estadio Nemesio Camacho El Campin esta a 3 km: conciertos y partidos de seleccion.' }
  ],
  que_incluye: ['WiFi gratis', 'Casilleros', 'Ropa de cama', 'Guarda equipajes', 'Mapas y recomendaciones'],
  transporte: [
    { icon: '\u2708', title: 'Desde el aeropuerto El Dorado', detail: 'Aproximadamente 30-40 min en taxi o app (~16 km) por la Av. El Dorado y calle 100 o Av. Caracas.' },
    { icon: '\ud83d\ude8b', title: 'TransMilenio', detail: 'Estaciones de la troncal Autonorte (calle 63, H\u00e9roes) y multiples rutas zonales por cra 13.' },
    { icon: '\ud83d\udeb6', title: 'Zonas de ocio a pie', detail: 'Parque Lourdes (7 min), Parque de la 93 (10 min), Zona T y G (20 min).' }
  ],
  eventos_hostal: []
};

const FAQS = [
  { pregunta: 'Donde queda Republica Bogota Cabin Beds?', respuesta: 'En la carrera 12 #68-28, barrio Quinta Camacho de Chapinero, cerca del Parque de la 93.' },
  { pregunta: 'Que es una cabin bed?', respuesta: 'Una cama cabina individual dentro del dormitorio compartido, cerrada con cortinas blackout y equipada con luz propia, enchufe y casillero: privacidad total al precio de hostel.' },
  { pregunta: 'Hay restriccion de edad?', respuesta: 'Si, es un hostel solo para adultos (18+); no se admiten ninos.' },
  { pregunta: 'Cuanto cuesta dormir ahi?', respuesta: 'Las cabin beds arrancan alrededor de $45.000 COP por noche y las dobles privadas desde $130.000 (precios referenciales).' },
  { pregunta: 'Incluye desayuno y toallas?', respuesta: 'El desayuno no esta incluido y las toallas se ofrecen en alquiler; confirma detalles al reservar.' }
];

module.exports = { SLUG: SLUG, HERO: HERO, PHOTOS: PHOTOS, BASE: BASE, TAGS: TAGS, FAQS: FAQS };

if (require.main !== module) return;

(async function main() {
  var url = process.env.DATABASE_URL || process.argv[2];
  if (!url) {
    console.error('Falta DATABASE_URL.');
    console.error('Uso: DATABASE_URL=postgres://... node scripts/seed-republica-cabin-beds-bogota.js [--dry]');
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
