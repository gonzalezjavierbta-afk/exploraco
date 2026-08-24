// scripts/seed-viajero-bogota-hostel-spa.js
// Crea (o actualiza) la pagina dinamica viajero-bogota-hostel-spa.html
// (categoria hostal). Patron Fase 9: seed ASCII-safe + loader API + smoke.
//
// Uso:
//   DATABASE_URL=postgres://... node scripts/seed-viajero-bogota-hostel-spa.js --dry
//   DATABASE_URL=postgres://... node scripts/seed-viajero-bogota-hostel-spa.js
//
// Idempotente: re-ejecutable sin efectos secundarios (ON CONFLICT slug).

var neon = null;
function getNeon() {
  if (!neon) neon = require('@neondatabase/serverless').neon;
  return neon;
}

const SLUG = 'viajero-bogota-hostel-spa';
const HERO = 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cf/Bogota_city_skyline_at_night_seen_from_the_Monseratte_sanctuary.png/960px-Bogota_city_skyline_at_night_seen_from_the_Monseratte_sanctuary.png';

const PHOTOS = [
  { url: HERO, caption: 'El centro de Bogota al atardecer, el marco del barrio Las Nieves' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e7/Teatro_Colon_%28Bogot%C3%A1%29.jpg/800px-Teatro_Colon_%28Bogot%C3%A1%29.jpg', caption: 'Teatro Colon de Bogota, a pocas cuadras del hostal' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/Plaza_de_Bol%C3%ADvar_en_Bogot%C3%A1_%28Colombia%29.jpg/960px-Plaza_de_Bol%C3%ADvar_en_Bogot%C3%A1_%28Colombia%29.jpg', caption: 'Plaza de Bolivar a minutos caminando por el Eje Ambiental' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4f/Estaci%C3%B3n_Las_Aguas_TransMilenio.jpg/800px-Estaci%C3%B3n_Las_Aguas_TransMilenio.jpg', caption: 'TransMilenio Las Aguas, conexion directa con todo el centro' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/Ajiaco_in_Bogot%C3%A1.jpg/960px-Ajiaco_in_Bogot%C3%A1.jpg', caption: 'Ajiaco santafere\u00f1o: la sopa que hay que probar cerca del hostel' }
];

const BASE = {
  slug: SLUG,
  nombre: 'Viajero Bogot\u00e1 Hostel & Spa',
  categoria_slug: 'hostal',
  lead: 'El unico hostel del centro con spa propio: sauna, turco e hidromasaje gratis para privadas (descuento en dorms) tras un dia de caminar Monserrate. Restaurante La Nevera, bar y 9.5 sobre 10 en Hostelworld.',
  descripcion: 'Viajero Bogota Hostel & Spa trajo a la capital la formula de la cadena Viajero: hospitalidad latina, dise\u00f1o cuidado y servicios que ningun otro hostel del centro historico ofrece. La joya de la corona es su Spa Monserrate, con sauna, turco e hidromasaje: acceso gratuito para quienes reservan habitaciones privadas y tarifa preferencial para huespedes de dormitorios.\n\nLa propiedad esta en el barrio Las Nieves, entre el centro internacional y La Candelaria: se camina al Museo del Oro, a la Plaza de Bolivar o al Teatro Colon en pocos minutos. El restaurante La Nevera sirve menu colombiano e internacional todo el dia, acompanado de un bar con cocteles y cervezas artesanales.\n\nEl hostel combina dormitorios compartidos modernos con privadas boutique. El desayuno no esta incluido en tarifas de dormitorio pero puede adicionarse; en privadas va incluido segun tarifa. Se aceptan mascotas solo en habitaciones privadas con costo adicional.\n\nCon 9.5 sobre 10 en Hostelworld respaldado por mas de mil resenas, Viajero es hoy uno de los mejores valorados de Bogota. Su agenda social incluye eventos Linkup para conectar viajeros, y el spa funciona como argumento definitivo despues de subir Monserrate o recorrer La Candelaria a pie.',
  highlight: 'Spa con sauna/turco/hidromasaje \u00b7 Restaurante La Nevera + bar \u00b7 Eventos Linkup \u00b7 Entre centro internacional y La Candelaria \u00b7 9.5/10 en Hostelworld',
  ciudad: 'Bogot\u00e1',
  region: 'Cundinamarca',
  barrio: 'Las Nieves (Centro)',
  lat: 4.6038,
  lng: -74.0718,
  whatsapp: '',
  telefono: '',
  email: '',
  web: 'https://viajerohostels.com',
  instagram: '',
  precio_desde: 'Dorms desde $58.000; privadas desde $150.000 por noche (referencia)',
  horario: 'Check-in 15:00 - 23:00 / Check-out hasta 11:00',
  emoji: '\ud83d\udecf',
  hero_bg: 'linear-gradient(135deg,#701a75,#0891b2)',
  foto_hero: HERO,
  tipo: 'Hostal & Spa \u00b7 Dise\u00f1o moderno \u00b7 Ambiente social',
  capacidad: 'Dormitorios compartidos y habitaciones privadas boutique',
  como_llegar: 'Carrera 3 #20-35, barrio Las Nieves, entre la Av. Jimenez y la calle 22. TransMilenio hasta Museo del Oro o Av. Jimenez y caminar menos de 10 minutos.',
  status: 'published',
  destacado: true
};

const TAGS = {
  tipo_alojamiento: 'Hostal boutique con spa',
  checkin: '15:00 - 23:00',
  checkout: '11:00',
  recepcion: 'Recepcion diurna con consigna',
  edad_minima: '',
  mascotas: 'Si, solo en habitaciones privadas (costo adicional ~$35.000 COP)',
  cocina_compartida: '',
  barrio_descripcion: 'Las Nieves es el puente entre el centro internacional y La Candelaria: bancos, teatros, cafes historicos y comercio popular. Desde la puerta se llega a pie al Eje Ambiental (5 min), Plaza de Bolivar (10 min), Museo del Oro (12 min) y Monserrate (25 min hasta el inicio del camino).',
  politica_cancelacion: 'Cancelacion gratuita reservando con mas de 2 dias de antelacion en tarifas flexibles. En temporada alta pueden aplicar condiciones especiales.',
  reglas_casa: 'Check-in entre 15:00 y 23:00 / Check-out hasta las 11:00\nAcceso al spa: gratis en privadas, tarifa preferencial para dormitorios\nSilencio en dormitorios en horario nocturno\nNo fumar en habitaciones ni areas interiores\nVisitas externas solo en zonas comunes\nLockers disponibles: traer candado',
  habitaciones: [
    { tipo: 'Dormitorio compartido mixto', subtitulo: 'Camas modernas con locker individual', badge: 'popular', camas: 'Compartido', precio: '$58.000' },
    { tipo: 'Dormitorio solo mujeres', subtitulo: 'Para viajeras, mismas comodidades', badge: 'female', camas: 'Compartido', precio: '$61.000' },
    { tipo: 'Habitacion privada doble boutique', subtitulo: 'Incluye acceso gratis al Spa Monserrate', badge: 'premium', camas: '1 doble', precio: '$150.000' }
  ],
  amenidades: ['Spa (sauna, turco, hidromasaje)', 'Restaurante La Nevera', 'Bar', 'WiFi gratis', 'Guarda equipajes', 'Salon comun', 'Terraza', 'Eventos sociales Linkup'],
  actividades: [
    { icono: '\ud83d\udecd', nombre: 'Spa Monserrate', descripcion: 'Sauna, turco e hidromasaje dentro del hostel: recuperarse despues de subir el cerro es parte del plan.' },
    { icono: '\ud83c\udf79', nombre: 'Bar y eventos Linkup', descripcion: 'La agenda social del hostel conecta viajeros con juegos, noches tematicas y cocteles.' },
    { icono: '\ud83c\udfad', nombre: 'Teatro Colon y centro', descripcion: 'Uno de los teatros mas hermosos de America Latina queda a pocas cuadras; hay visitas guiadas.' },
    { icono: '\ud83c\udfdb', nombre: 'Circuito cultural', descripcion: 'Eje Ambiental, Plaza de Bolivar, Museo del Oro y Botero forman una ruta caminable desde la puerta.' }
  ],
  que_incluye: ['WiFi gratis', 'Ropa de cama', 'Lockers', 'Guarda equipajes', 'Mapas de la ciudad', 'Acceso preferencial al spa (dorms)'],
  transporte: [
    { icon: '\u2708', title: 'Desde el aeropuerto El Dorado', detail: 'Aproximadamente 40-55 min en taxi o app (~15 km).' },
    { icon: '\ud83d\ude8b', title: 'TransMilenio', detail: 'Estaciones Av. Jimenez y Museo del Oro a menos de 10 minutos caminando.' },
    { icon: '\ud83d\udeb6', title: 'Centro a pie', detail: 'Eje Ambiental (5 min), Plaza de Bolivar (10 min), La Candelaria (15 min).' }
  ],
  eventos_hostal: []
};

const FAQS = [
  { pregunta: 'Donde queda Viajero Bogota Hostel & Spa?', respuesta: 'En la carrera 3 #20-35, barrio Las Nieves, entre el centro internacional y La Candelaria.' },
  { pregunta: 'Como funciona el spa?', respuesta: 'El Spa Monserrate (sauna, turco e hidromasaje) es gratis para huespedes de habitaciones privadas y con tarifa preferencial para quienes se alojan en dormitorios.' },
  { pregunta: 'Incluye desayuno?', respuesta: 'En tarifas de dormitorio el desayuno se adiciona; en muchas privadas va incluido segun la tarifa elegida.' },
  { pregunta: 'Cuanto cuesta dormir ahi?', respuesta: 'Los dormitorios arrancan alrededor de $58.000 COP por noche y las privadas dobles desde $150.000 (precios referenciales).' },
  { pregunta: 'Aceptan mascotas?', respuesta: 'Si, pero solo en habitaciones privadas y con costo adicional (~$35.000 COP).' }
];

module.exports = { SLUG: SLUG, HERO: HERO, PHOTOS: PHOTOS, BASE: BASE, TAGS: TAGS, FAQS: FAQS };

if (require.main !== module) return;

(async function main() {
  var url = process.env.DATABASE_URL || process.argv[2];
  if (!url) {
    console.error('Falta DATABASE_URL.');
    console.error('Uso: DATABASE_URL=postgres://... node scripts/seed-viajero-bogota-hostel-spa.js [--dry]');
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
