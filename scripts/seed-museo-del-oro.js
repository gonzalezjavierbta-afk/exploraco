// scripts/seed-museo-del-oro.js
// Crea (o actualiza) la pagina dinamica museo-del-oro.html con los datos de
// ficha-museo-del-oro.md, replicando EXACTAMENTE lo que guardaria el formulario
// admin.html (CATEGORY_TAG_FIELDS/CATEGORY_TAG_LISTS sitio, _buildTagsObj/
// _placeToAPI). Patron de scripts/seed-bogota.js con upsert completo.
//
// Rating: NO se siembran resenas ni se hardcodea rating. La pagina queda
// con rating/contador en 0 hasta que lleguen interacciones reales
// (ADR-008: api/interacciones.js recalcula AVG/COUNT dinamicamente).
//
// Uso:
//   DATABASE_URL=postgres://... node scripts/seed-museo-del-oro.js --dry
//   DATABASE_URL=postgres://... node scripts/seed-museo-del-oro.js
//
// Idempotente: re-ejecutable sin efectos secundarios (ON CONFLICT slug).

var neon = null;
function getNeon() {
  if (!neon) neon = require('@neondatabase/serverless').neon;
  return neon;
}

const SLUG = 'museo-del-oro';
const HERO = 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/dc/BOG_Museo_del_Oro.JPG/960px-BOG_Museo_del_Oro.JPG';

const PHOTOS = [
  { url: HERO, caption: 'Fachada del Museo del Oro' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/2009-10-25_01_Gold_armlet_%E2%80%93_Museo_del_Oro%2C_Bogot%C3%A1%2C_Colombia.jpg/960px-2009-10-25_01_Gold_armlet_%E2%80%93_Museo_del_Oro%2C_Bogot%C3%A1%2C_Colombia.jpg', caption: 'Brazalete de oro prehisp\u00e1nico' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/62/Museo_del_Oro_Quimbaya.jpg/960px-Museo_del_Oro_Quimbaya.jpg', caption: 'Piezas de la cultura Quimbaya' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e4/Muisca_Raft_Gold_Museum_BOG_03_2018_8511.jpg/960px-Muisca_Raft_Gold_Museum_BOG_03_2018_8511.jpg', caption: 'La Balsa Muisca: el mito de El Dorado' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/Poporo_by_Turista_Perene.jpg/960px-Poporo_by_Turista_Perene.jpg', caption: 'Poporo Quimbaya' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/e/e1/Museo_del_Oro_-_Bogot%C3%A1_14.jpg', caption: 'Sala de exposiciones del Museo del Oro' }
];

const BASE = {
  slug: SLUG,
  nombre: 'Museo del Oro',
  categoria_slug: 'sitio',
  lead: 'La mayor colecci\u00f3n de orfebrer\u00eda prehisp\u00e1nica del mundo, en el coraz\u00f3n de La Candelaria: m\u00e1s de 55.000 piezas que cuentan la historia del oro en Colombia y el mito de El Dorado.',
  descripcion: 'El Museo del Oro del Banco de la Rep\u00fablica, fundado en 1939 e inaugurado en 1959, preserva la colecci\u00f3n de orfebrer\u00eda prehisp\u00e1nica m\u00e1s grande del mundo: m\u00e1s de 34.000 piezas de oro y aleaciones y cerca de 25.000 objetos de cer\u00e1mica, piedra, concha, hueso y textiles. Sus salas permanentes (El trabajo de los metales, La gente y el oro en la Colombia prehisp\u00e1nica, Cosmolog\u00eda y simbolismo, y La Sala de la Ofrenda) recorren las culturas muisca, quimbaya, tairona, calima, tolima y zen\u00fa. Su pieza m\u00e1s ic\u00f3nica es la Balsa Muisca, que representa la ceremonia de El Dorado en la Laguna de Guatavita, re-montada con nueva museograf\u00eda en diciembre de 2024. Reconocido por National Geographic en 2018 como uno de los mejores museos de historia del mundo, recibe m\u00e1s de 500.000 visitantes al a\u00f1o.',
  highlight: 'La colecci\u00f3n de oro prehisp\u00e1nico m\u00e1s grande del mundo y la Balsa Muisca: el mito de El Dorado en carne y hueso',
  ciudad: 'Bogot\u00e1',
  region: 'Cundinamarca',
  barrio: 'La Candelaria',
  lat: 4.6017,
  lng: -74.0720,
  whatsapp: '',
  telefono: '(57) 601 3432222',
  email: '',
  web: 'https://www.banrepcultural.org/bogota/museo-del-oro',
  instagram: '@museodeloro',
  precio_desde: 'Desde $5.000 (gratis los domingos)',
  horario: 'Mar-Sab 9AM-7PM, Dom y festivos 10AM-5PM. Cerrado los lunes',
  emoji: '\ud83d\udc8e',
  hero_bg: '#b8860b',
  foto_hero: HERO,
  tipo: 'Museo de arqueolog\u00eda \u00b7 Orfebrer\u00eda prehisp\u00e1nica \u00b7 El Dorado',
  capacidad: '',
  como_llegar: 'TransMilenio estaci\u00f3n "Museo del Oro" (rutas por la Av. Jim\u00e9nez/carrera 7). A pie: 5 min desde la Plaza de Bol\u00edvar por la calle 12. Taxi o app: Parque Santander (Carrera 6 No. 15-88).',
  status: 'published',
  destacado: true
};

const TAGS = {
  tipo_actividad: 'Museo de arqueolog\u00eda',
  dificultad: 'F\u00e1cil',
  dificultad_desc: 'Espacios interiores planos con rampas y ascensor, apto para todas las edades. El recorrido completo toma 2-3 horas con 4 salas permanentes y 2 de exposiciones temporales.',
  duracion: '2-3 horas',
  altitud: '2640',
  temporada: ['Todo el a\u00f1o', 'Domingos gratis pero con m\u00e1s afluencia', 'Mar-Sab por la ma\u00f1ana con menos filas'],
  precio_entrada: 'General $5.000 (mar-sab y festivos). Gratis los domingos, menores de 12 y mayores de 60. Audiogu\u00eda $8.000.',
  distancia: 'En el Parque Santander, junto a la carrera 7; estaci\u00f3n TransMilenio "Museo del Oro" a 1 cuadra',
  como_llegar: BASE.como_llegar,
  permisos: 'No requiere permiso; se recomienda reservar la visita en la web oficial ("Programa tu cita") para cupo garantizado.',
  temporada_nota: 'El museo abre todo el a\u00f1o. De martes a s\u00e1bado 9AM-7PM (ultimo ingreso 6PM); domingos y festivos 10AM-5PM (ultimo ingreso 4PM). Cierra los lunes, incluidos los lunes festivos.',
  fauna_flora: JSON.stringify([
    { emoji: '\ud83c\udf41', nombre: 'Oro aluvial', hecho: 'El oro de los r\u00edos era lavado en bateas y trabajado en cera perdida' },
    { emoji: '\ud83d\udc09', nombre: 'Rana y serpiente', hecho: 'Animales sagrados en la orfebrer\u00eda muisca y tairona' },
    { emoji: '\ud83c\udf31', nombre: 'Calabaza y guayac\u00e1n', hecho: 'Plantas representadas en los tunjos y pectorales' },
    { emoji: '\ud83d\udc8e', nombre: 'Tunjos', hecho: 'Figuras votivas usadas en ofrendas religiosas' }
  ]),
  secretos: JSON.stringify([
    { icono: '\ud83d\udc8e', titulo: 'La Sala de la Ofrenda', texto: 'Una experiencia inmersiva oscura que recrea la ceremonia de El Dorado; no te pierdas el audio.', tag: 'Imperdible', tag_color: 'gold' },
    { icono: '\ud83c\udfa8', titulo: 'Museo Botero gratis', texto: 'A 3 cuadras, en la Manzana Cultural, con obras de Botero, Picasso y Monet con entrada libre.', tag: 'Gratis', tag_color: 'green' },
    { icono: '\ud83c\udfdb', titulo: 'Parque Santander', texto: 'Detr\u00e1s del museo, con la estatua de Gonzalo Jim\u00e9nez de Quesada y chorros de agua.', tag: 'Cerca', tag_color: 'blue' },
    { icono: '\ud83d\udcd6', titulo: 'Museo Casa de la Moneda', texto: 'En la misma manzana cultural: historia de la moneda en Colombia.', tag: 'Cultura', tag_color: 'gold' },
    { icono: '\ud83c\udf6b', titulo: 'Chocolate santafere\u00f1o', texto: 'Caf\u00e9s de La Candelaria a una cuadra para el descanso del recorrido.', tag: 'Comer', tag_color: 'brown' }
  ]),
  regulaciones: 'No se permite tomar fotograf\u00edas con flash en las salas de exposici\u00f3n. No ingresar con alimentos ni bebidas a las salas. Los bultos grandes deben depositarse en el guardarropa (costo sugerido de aporte voluntario). Los menores deben ir acompa\u00f1ados de un adulto. El museo cuenta con protocolos de acceso preferencial para personas con movilidad reducida. Cierra los lunes, incluidos los lunes festivos.',
  checklist_tip: 'Reserva tu visita en la web oficial ("Programa tu cita") para cupo garantizado, sobre todo los domingos cuando la entrada es gratis y la afluencia mayor.',
  entradas: [
    { tipo: 'Museo del Oro (general)', precio: '5000', incluye: 'Mar-Sab 9AM-7PM', link: 'https://www.banrepcultural.org/bogota/museo-del-oro' },
    { tipo: 'Museo del Oro (domingo)', precio: 'Gratis', incluye: 'Entrada libre para todos los domingos', link: 'https://www.banrepcultural.org/bogota/museo-del-oro' },
    { tipo: 'Menores de 12 y mayores de 60', precio: 'Gratis', incluye: 'Exentos de pago siempre', link: 'https://www.banrepcultural.org/bogota/museo-del-oro' },
    { tipo: 'Audiogu\u00eda', precio: '8000', incluye: 'Recorrido autoguiado con audio en espa\u00f1ol', link: 'https://www.banrepcultural.org/bogota/museo-del-oro' },
    { tipo: 'Visita guiada', precio: 'Gratis', incluye: 'Con cupo limitado, reserva previa', link: 'https://www.banrepcultural.org/bogota/museo-del-oro' }
  ],
  tours: [
    {
      nombre: 'Recorrido guiado por las 4 salas',
      precio: 'Gratis', precio_sub: 'con cupo limitado',
      duracion: '90 minutos', tipo_tour: 'Grupal', idioma: 'Espa\u00f1ol', max_personas: 'M\u00e1x 15',
      rating: '4.8', review_count: 340,
      descripcion: 'Visita acompa\u00f1ada por gu\u00edas del museo: El trabajo de los metales, La gente y el oro, Cosmolog\u00eda y la Sala de la Ofrenda.',
      incluye: ['Gu\u00eda especializado', 'Entrada', 'Contexto hist\u00f3rico de la Balsa Muisca'],
      no_incluye: ['Audiogu\u00eda', 'Transporte'],
      link_reserva: 'https://www.banrepcultural.org/bogota/museo-del-oro',
      featured: true
    },
    {
      nombre: 'Museo del Oro + Museo Botero a pie',
      precio: '45000', precio_sub: 'por persona',
      duracion: '4 horas', tipo_tour: 'Grupal', idioma: 'Espa\u00f1ol/Ingl\u00e9s', max_personas: 'M\u00e1x 12',
      rating: '4.9', review_count: 260,
      descripcion: 'Combo cultural por La Candelaria: del Museo del Oro al Museo Botero (gratis) cruzando la Manzana Cultural del Banco de la Rep\u00fablica.',
      incluye: ['Entrada Museo del Oro', 'Gu\u00eda', 'Recorrido Manzana Cultural'],
      no_incluye: ['Transporte', 'Alimentos'],
      link_reserva: 'https://bogotawalkingtours.com',
      featured: false
    },
    {
      nombre: 'Tour de El Dorado y los muiscas',
      precio: '60000', precio_sub: 'por persona',
      duracion: '3 horas', tipo_tour: 'Privado', idioma: 'Espa\u00f1ol', max_personas: 'M\u00e1x 6',
      rating: '4.7', review_count: 120,
      descripcion: 'Profundiza en el mito de El Dorado: Balsa Muisca, Laguna de Guatavita y las t\u00e9cnicas de cera perdida.',
      incluye: ['Entrada', 'Gu\u00eda privado', 'Material de apoyo'],
      no_incluye: ['Transporte', 'Audiogu\u00eda'],
      link_reserva: 'https://museumtoursbogota.com',
      featured: false
    }
  ],
  equipamiento: [
    { item: 'Identificaci\u00f3n (pasaporte o c\u00e9dula)', prioridad: 'Obligatorio' },
    { item: 'Efectivo o tarjeta para la entrada (si no es domingo)', prioridad: 'Recomendado' },
    { item: 'Zapatos c\u00f3modos para 2-3 horas de recorrido', prioridad: 'Recomendado' },
    { item: 'C\u00e1mara sin flash (prohibido flash en salas)', prioridad: 'Opcional' },
    { item: 'Llega 30 min antes del \u00faltimo ingreso', prioridad: 'Recomendado' }
  ],
  itinerario: [
    { dia: 'Recorrido', hora: '9:00 am', titulo: 'Sala El trabajo de los metales', icono: '\ud83d\udd27', detalle: 'Or\u00edgenes y t\u00e9cnicas de la metalurgia prehisp\u00e1nica', tags: ['Museo', 'Oro'] },
    { dia: 'Recorrido', hora: '10:00 am', titulo: 'Gente y oro en la Colombia prehisp\u00e1nica', icono: '\ud83d\udc65', detalle: 'Roles sociales y religiosos del oro', tags: ['Culturas'] },
    { dia: 'Recorrido', hora: '11:00 am', titulo: 'Cosmolog\u00eda y simbolismo', icono: '\ud83c\udf0c', detalle: 'Interpretaciones espirituales y mitol\u00f3gicas', tags: ['Simbolismo'] },
    { dia: 'Recorrido', hora: '12:00 pm', titulo: 'Sala de la Ofrenda y Balsa Muisca', icono: '\ud83d\udc8e', detalle: 'La pieza m\u00e1s ic\u00f3nica: la ceremonia de El Dorado', tags: ['El Dorado'] }
  ],
  dificultad_tags: [
    { texto: 'Recorrido interior plano, apto para todas las edades', apto: true },
    { texto: 'Accesible con rampas y ascensor', apto: true },
    { texto: 'Domingos gratis pero con m\u00e1s afluencia', apto: false },
    { texto: 'Prohibido tomar fotos con flash en las salas', apto: false },
    { texto: 'Requiere reserva previa para garantizar cupo', apto: false }
  ],
  temporada_matriz: {
    Ene: 'ideal', Feb: 'ideal', Mar: 'ideal', Abr: 'posible', May: 'posible',
    Jun: 'ideal', Jul: 'ideal', Ago: 'ideal', Sep: 'posible', Oct: 'posible', Nov: 'ideal', Dic: 'posible'
  }
};

const FAQS = [
  { pregunta: '\u00bfCu\u00e1nto cuesta la entrada al Museo del Oro?', respuesta: 'General $5.000 de martes a s\u00e1bado y festivos. Los domingos la entrada es gratuita para todos. Menores de 12 y mayores de 60 entran gratis siempre.' },
  { pregunta: '\u00bfQu\u00e9 piezas no me puedo perder?', respuesta: 'La Balsa Muisca (renovada en diciembre de 2024), el Poporo Quimbaya, los tunjos y los pectorales tairona. La Sala de la Ofrenda es la m\u00e1s espectacular.' },
  { pregunta: '\u00bfCu\u00e1nto tiempo se necesita?', respuesta: 'Entre 2 y 3 horas para las 4 salas permanentes. Con exposiciones temporales o audiogu\u00eda, 3 horas.' },
  { pregunta: '\u00bfEst\u00e1 abierto los lunes?', respuesta: 'No. Cierra todos los lunes (incluidos festivos). Abre de martes a s\u00e1bado 9AM-7PM y domingos 10AM-5PM.' },
  { pregunta: '\u00bfHay que reservar?', respuesta: 'Se recomienda reservar en la web oficial ("Programa tu cita"). Los domingos y festivos, por la entrada gratis, la afluencia es mayor.' }
];

module.exports = { SLUG: SLUG, HERO: HERO, PHOTOS: PHOTOS, BASE: BASE, TAGS: TAGS, FAQS: FAQS };

if (require.main !== module) return;

(async function main() {
  var url = process.env.DATABASE_URL || process.argv[2];
  if (!url) {
    console.error('Falta DATABASE_URL.');
    console.error('Uso: DATABASE_URL=postgres://... node scripts/seed-museo-del-oro.js [--dry]');
    process.exit(1);
  }

  var sql = getNeon()(url);
  var dry = process.argv.indexOf('--dry') !== -1;

  var existing = await sql('SELECT id, slug FROM destinos WHERE slug=$1 LIMIT 1', [SLUG]);

  if (dry) {
    console.log('[dry-run] ' + (existing.length ? 'UPDATE (fila existe)' : 'INSERT (nueva fila)') + ' para slug=' + SLUG);
    console.log('[dry-run] base:\n' + JSON.stringify(BASE, null, 2));
    console.log('[dry-run] tags (' + Object.keys(TAGS).length + ' claves):\n' + JSON.stringify(TAGS, null, 2));
    console.log('[dry-run] fotos galer\u00eda: ' + PHOTOS.length + ' | faqs: ' + FAQS.length);
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

  // FAQs en destinos_detalles
  if (FAQS.length) {
    await sql(
      'INSERT INTO destinos_detalles (destino_id, faqs, creado_en) VALUES ($1,$2,NOW()) '
      + 'ON CONFLICT (destino_id) DO UPDATE SET faqs=EXCLUDED.faqs',
      [id, JSON.stringify(FAQS)]
    ).catch(function(){});
  }

  // Galer\u00eda en destinos_fotos (la hero es la foto 0)
  for (var i = 0; i < PHOTOS.length; i++) {
    var esHero = (i === 0);
    await sql(
      'INSERT INTO destinos_fotos (destino_id, url, caption, orden, es_hero, creado_en) '
      + 'VALUES ($1,$2,$3,$4,$5,NOW()) ON CONFLICT DO NOTHING',
      [id, PHOTOS[i].url, PHOTOS[i].caption, i, esHero]
    ).catch(function(){});
  }

  console.log('OK - faqs y ' + PHOTOS.length + ' fotos de galer\u00eda insertadas.');
  console.log('Verifica en: https://exploraco.co/' + SLUG + '.html (revisa sitemap y /api/destinos).');
})().catch(function(err) {
  console.error('ERROR:', err.message);
  process.exit(1);
});