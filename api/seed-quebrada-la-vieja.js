// api/seed-quebrada-la-vieja.js
// Crea (o actualiza) la pagina dinamica quebrada-la-vieja.html con los datos
// de ficha-quebrada-la-vieja.md, replicando EXACTAMENTE lo que guardaria el
// formulario admin.html (CATEGORY_TAG_FIELDS/CATEGORY_TAG_LISTS sitio,
// _buildTagsObj/_placeToAPI). Patron de api/seed-museo-del-oro.js.
//
// Rating: NO se siembran resenas ni se hardcodea rating. La pagina queda
// con rating/contador en 0 hasta que lleguen interacciones reales
// (ADR-008: api/interacciones.js recalcula AVG/COUNT dinamicamente).
//
// Uso:
//   DATABASE_URL=postgres://... node api/seed-quebrada-la-vieja.js --dry
//   DATABASE_URL=postgres://... node api/seed-quebrada-la-vieja.js
//
// Idempotente: re-ejecutable sin efectos secundarios (ON CONFLICT slug).

var neon = null;
function getNeon() {
  if (!neon) neon = require('@neondatabase/serverless').neon;
  return neon;
}

const SLUG = 'quebrada-la-vieja';
const HERO = 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Panor%C3%A1mica_desde_los_cerros_orientales_de_Bogot%C3%A1_01.jpg/960px-Panor%C3%A1mica_desde_los_cerros_orientales_de_Bogot%C3%A1_01.jpg';

const PHOTOS = [
  { url: HERO, caption: 'Vista panor\u00e1mica de Bogot\u00e1 desde los Cerros Orientales' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1f/2016_Quebrada_La_Vieja_Bogot%C3%A1.jpg/960px-2016_Quebrada_La_Vieja_Bogot%C3%A1.jpg', caption: 'El sendero y el cauce de la Quebrada La Vieja en los Cerros Orientales' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/92/BOG_Quebrada_La_Vieja_2.JPG/960px-BOG_Quebrada_La_Vieja_2.JPG', caption: 'La quebrada en la calle 71 con carrera 1, zona de la entrada del sendero' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/01/Alameda_Quebrada_La_Vieja_Bogot%C3%A1.jpg/960px-Alameda_Quebrada_La_Vieja_Bogot%C3%A1.jpg', caption: 'Alameda / Ronda Urbana de acceso en el barrio Rosales' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Quebrada_La_Vieja_-_panoramio_-_aalozadag.jpg/960px-Quebrada_La_Vieja_-_panoramio_-_aalozadag.jpg', caption: 'Vista del entorno natural de la Quebrada La Vieja' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Vista_quebrada_La_vieja.jpg/960px-Vista_quebrada_La_vieja.jpg', caption: 'Zona h\u00eddrica y rural de la quebrada, Chapinero' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/75/2016_quebrada_La_Vieja_en_Bogot%C3%A1.jpg/960px-2016_quebrada_La_Vieja_en_Bogot%C3%A1.jpg', caption: 'La quebrada La Vieja en Bogot\u00e1' }
];

const BASE = {
  slug: SLUG,
  nombre: 'Quebrada La Vieja',
  categoria_slug: 'sitio',
  lead: 'A los pies de los Cerros Orientales, en el coraz\u00f3n del barrio Rosales, la Quebrada La Vieja es el sendero m\u00e1s famoso de Bogot\u00e1: un corredor de bosque andino y p\u00e1ramo donde caminas entre frailejones, bromelias y neblina mientras la ciudad queda abajo. Gratis, con reserva previa online, es el plan perfecto de amanecer para los bogotanos y el mejor balc\u00f3n natural de la capital.',
  descripcion: 'Corredor ecol\u00f3gico de unos 2,7 km que sube el cerro hasta los 3.200 m de altura. Es la quebrada m\u00e1s famosa de Bogot\u00e1 y est\u00e1 dentro de la Reserva Forestal Protectora Bosque Oriental de Bogot\u00e1 (localidad de Chapinero). La caminata dura 2-3 horas ida y vuelta en los tramos cortos (Claro de Luna, La Virgen) y hasta 5-6 horas en los largos (Alto de la Cruz, P\u00e1ramo-Piedra Ballena). Es gratuito pero exige registro previo online obligatorio. Lo administra la Empresa de Acueducto y Alcantarillado de Bogot\u00e1 (EAAB-ESP). Tramos: Ingreso-Claro de Luna, Claro de Luna-La Virgen, Claro de Luna-La Cruz, Claro de Luna-P\u00e1ramo y P\u00e1ramo-El Verj\u00f3n.',
  highlight: 'Vista panor\u00e1mica de Bogot\u00e1 desde los cerros: toda la sabana, la ciudad extendida y Monserrate a lo lejos',
  ciudad: 'Bogot\u00e1',
  region: 'Cundinamarca',
  barrio: 'Rosales',
  lat: 4.6501285,
  lng: -74.0485573,
  whatsapp: '',
  telefono: '(601) 344 7000',
  email: '',
  web: 'https://caminos.eaab.gov.co',
  instagram: '@acueductodebogota',
  precio_desde: 'Gratis (con registro previo online)',
  horario: 'Mar-Dom 6AM-11AM (semana) y 6AM-12M (fines de semana). Lunes cerrado',
  emoji: '\ud83c\udf3f',
  hero_bg: '#2e7d32',
  foto_hero: HERO,
  tipo: 'Sendero ecotur\u00edstico \u00b7 Caminata urbana \u00b7 Bosque andino',
  capacidad: 'M\u00e1x 15 por grupo',
  como_llegar: 'TransMilenio estaci\u00f3n "Flores - Areandina" o "Calle 76 San Felipe" (la estaci\u00f3n Calle 72 est\u00e1 cerrada por obras), camina por la Calle 71 al oriente hasta la Av. Circunvalar. SITP: paradero de la Cra 7 con Calle 71/72 y camina al oriente. Taxi o carro: Av. Circunvalar hasta la Calle 71 (no hay parqueadero en la entrada).',
  status: 'published',
  destacado: true
};

const TAGS = {
  tipo_actividad: 'Sendero ecotur\u00edstico',
  dificultad: 'Media',
  dificultad_desc: 'Subida constante por camino de piedra y tierra en bosque andino. Los tramos cortos (2-3 horas) son aptos con buen calzado; los tramos largos (5-6 horas) exigen condici\u00f3n f\u00edsica y ropa de abrigo.',
  duracion: '2-3 horas (tramos cortos); hasta 5-6 horas (tramos largos)',
  altitud: '3200',
  temporada: ['Todo el a\u00f1o', 'Ideal entre semana por la ma\u00f1ana temprano', 'Amanecer con cielo despejado'],
  precio_entrada: 'Gratis, con registro previo obligatorio (QR). Aforo: fines de semana 775 visitantes/d\u00eda, entre semana 419/d\u00eda.',
  distancia: 'En el barrio Rosales, inicio en la Av. Circunvalar con Calle 71; estaciones TransMilenio "Flores - Areandina" o "Calle 76 San Felipe"',
  como_llegar: BASE.como_llegar,
  permisos: 'Registro previo obligatorio en caminos.eaab.gov.co o la app "Caminos de los Cerros Orientales"; el QR se exige en la entrada.',
  temporada_nota: 'Martes a domingo y festivos. Entre semana 6AM-11AM (salida m\u00e1xima 11AM); fines de semana y festivos 6AM-12M. Lunes cerrado (salvo festivo) y un domingo al mes por acuerdo comunitario.',
  fauna_flora: JSON.stringify([
    { emoji: '\ud83c\udf3f', nombre: 'Bromelias', hecho: 'Ep\u00edfitas abundantes del bosque alto andino' },
    { emoji: '\ud83c\udf32', nombre: 'Frailejones', hecho: 'Flora de p\u00e1ramo en los tramos altos, planta end\u00e9mica de los Andes' },
    { emoji: '\ud83d\udc26', nombre: 'Pava andina', hecho: 'Ave t\u00edpica del bosque andino que se escucha en el cerro' },
    { emoji: '\ud83d\udc3a', nombre: 'Zorro y cusumbo', hecho: 'Mam\u00edferos que habitan la reserva del Bosque Oriental' },
    { emoji: '\ud83c\udf0a', nombre: 'La quebrada misma', hecho: 'Nace a 3.200 m y desemboca en el r\u00edo Salitre; abastec\u00eda el antiguo acueducto' }
  ]),
  secretos: JSON.stringify([
    { icono: '\ud83c\udff7', titulo: 'El amanecer es el plan', texto: 'Salir a las 6AM con cielo despejado regala la mejor luz dorada sobre la sabana.', tag: 'Imperdible', tag_color: 'gold' },
    { icono: '\ud83d\udc3a', titulo: 'Reserva de Bosque Oriental', texto: 'El sendero est\u00e1 dentro de la reserva protegida; el agua de la quebrada abastec\u00eda el acueducto de Chapinero desde 1947.', tag: 'Dato', tag_color: 'gold' },
    { icono: '\ud83c\udfdb', titulo: 'Monserrate a lo lejos', texto: 'Desde los miradores se ve Monserrate; se puede combinar el mismo d\u00eda.', tag: 'Cerca', tag_color: 'blue' },
    { icono: '\ud83c\udf31', titulo: 'Parque Nacional', texto: 'A 2 km al sur: verde, monumentos y rutas de ciclov\u00eda los domingos.', tag: 'Verde', tag_color: 'green' },
    { icono: '\ud83c\udf6d', titulo: 'Zona Rosa y Zona G', texto: 'Al norte: restaurantes y cafeter\u00edas para el plan despu\u00e9s de bajar del cerro.', tag: 'Comer', tag_color: 'brown' }
  ]),
  regulaciones: 'El ingreso es solo con registro previo y QR (app Caminos de los Cerros Orientales o caminos.eaab.gov.co). Llegar 5 minutos antes de la hora reservada. Prohibido llevar mascotas. No salirse del sendero; es reserva forestal protegida. No dejar basura; hay puntos de reciclaje. No recolectar flora ni fauna. Lunes cerrado (salvo festivo) y un domingo al mes por acuerdo comunitario.',
  checklist_tip: 'Reserva tu cupo en caminos.eaab.gov.co con anticipaci\u00f3n: los fines de semana se agotan r\u00e1pido. Lleva el QR descargado.',
  entradas: [
    { tipo: 'Ingreso Quebrada La Vieja', precio: 'Gratis', incluye: 'Registro previo obligatorio, QR en la entrada', link: 'https://caminos.eaab.gov.co' },
    { tipo: 'Tramo Ingreso - Claro de Luna', precio: 'Gratis', incluye: '2-3 horas ida y vuelta, nivel medio', link: 'https://caminos.eaab.gov.co' },
    { tipo: 'Tramo Claro de Luna - La Virgen', precio: 'Gratis', incluye: 'Mirador de La Virgen, nivel medio', link: 'https://caminos.eaab.gov.co' },
    { tipo: 'Tramo Claro de Luna - P\u00e1ramo', precio: 'Gratis', incluye: '5-6 horas, exige condici\u00f3n f\u00edsica', link: 'https://caminos.eaab.gov.co' },
    { tipo: 'Visita guiada (grupos)', precio: 'Gratis', incluye: 'Grupos hasta 30 con reserva', link: 'https://caminos.eaab.gov.co' }
  ],
  tours: [
    {
      nombre: 'Caminata de amanecer a La Virgen',
      precio: 'Gratis', precio_sub: 'con registro previo',
      duracion: '3 horas', tipo_tour: 'Grupal', idioma: 'Espa\u00f1ol', max_personas: 'M\u00e1x 15',
      rating: '4.9', review_count: 480,
      descripcion: 'Salida temprano por el tramo Claro de Luna - La Virgen con la mejor vista de Bogot\u00e1 al amanecer entre bosque andino y neblina.',
      incluye: ['Gu\u00eda', 'Registro del cupo', 'Contexto ecol\u00f3gico del cerro'],
      no_incluye: ['Transporte', 'Equipo personal'],
      link_reserva: 'https://caminos.eaab.gov.co',
      featured: true
    },
    {
      nombre: 'Trekking al P\u00e1ramo - Piedra Ballena',
      precio: '35000', precio_sub: 'por persona',
      duracion: '6 horas', tipo_tour: 'Grupal', idioma: 'Espa\u00f1ol', max_personas: 'M\u00e1x 10',
      rating: '4.8', review_count: 210,
      descripcion: 'El tramo largo de la quebrada hasta el p\u00e1ramo con frailejones, ideal para senderistas con condici\u00f3n f\u00edsica.',
      incluye: ['Gu\u00eda de monta\u00f1a', 'Registro del cupo', 'Seguridad del sector'],
      no_incluye: ['Transporte', 'Snacks', 'Equipo personal'],
      link_reserva: 'https://caminos.eaab.gov.co',
      featured: false
    },
    {
      nombre: 'Quebrada La Vieja + Monserrate en un d\u00eda',
      precio: '80000', precio_sub: 'por persona',
      duracion: '8 horas', tipo_tour: 'Privado', idioma: 'Espa\u00f1ol', max_personas: 'M\u00e1x 6',
      rating: '4.7', review_count: 120,
      descripcion: 'Combo de cerros: amanecer en La Vieja, almuerzo en Rosales y subida a Monserrate por la tarde.',
      incluye: ['Gu\u00eda', 'Registros', 'Entrada a Monserrate'],
      no_incluye: ['Transporte', 'Almuerzo'],
      link_reserva: 'https://bogotawalkingtours.com',
      featured: false
    }
  ],
  equipamiento: [
    { item: 'Reserva tu cupo en caminos.eaab.gov.co (QR obligatorio)', prioridad: 'Obligatorio' },
    { item: 'Zapatos de trekking o buen agarre', prioridad: 'Obligatorio' },
    { item: 'Ropa de abrigo e impermeable (clima de bosque andino)', prioridad: 'Recomendado' },
    { item: 'Agua y snack de energ\u00eda', prioridad: 'Recomendado' },
    { item: 'Gorra y bloqueador solar', prioridad: 'Recomendado' }
  ],
  itinerario: [
    { dia: 'Recorrido', hora: '6:00 am', titulo: 'Ingreso por la Ronda Urbana', icono: '\ud83c\udf33', detalle: 'Corredor peatonal ecol\u00f3gico de la Cra 2 a la puerta del sendero', tags: ['Acceso'] },
    { dia: 'Recorrido', hora: '6:30 am', titulo: 'Bosque andino', icono: '\ud83c\udf3f', detalle: 'Bromelias, hongos y neblina entre los \u00e1rboles', tags: ['Naturaleza'] },
    { dia: 'Recorrido', hora: '8:00 am', titulo: 'Mirador La Virgen', icono: '\ud83c\udff7', detalle: 'La vista panor\u00e1mica de Bogot\u00e1 desde el cerro', tags: ['Mirador'] },
    { dia: 'Recorrido', hora: '9:00 am', titulo: 'Descenso', icono: '\ud83c\udf30', detalle: 'Regreso por el mismo sendero con la ciudad a los pies', tags: ['Regreso'] }
  ],
  dificultad_tags: [
    { texto: 'Tramos cortos aptos con buen calzado', apto: true },
    { texto: 'Vista panor\u00e1mica de Bogot\u00e1 desde el mirador', apto: true },
    { texto: 'Tramos largos (P\u00e1ramo) exigen condici\u00f3n f\u00edsica', apto: false },
    { texto: 'Requiere registro previo obligatorio (QR en la entrada)', apto: false },
    { texto: 'Prohibido llevar mascotas', apto: false }
  ],
  temporada_matriz: {
    Ene: 'ideal', Feb: 'ideal', Mar: 'ideal', Abr: 'posible', May: 'posible',
    Jun: 'ideal', Jul: 'ideal', Ago: 'ideal', Sep: 'posible', Oct: 'posible', Nov: 'ideal', Dic: 'posible'
  }
};

const FAQS = [
  { pregunta: '\u00bfEs gratis?', respuesta: 'S\u00ed, 100% gratis; solo debes reservar cupo con anticipaci\u00f3n (sin reserva no puedes ingresar).' },
  { pregunta: '\u00bfC\u00f3mo me registro?', respuesta: 'Descarga la app "Caminos de los Cerros Orientales" o entra a caminos.eaab.gov.co, elige Quebrada La Vieja, tramo, d\u00eda y hora; recibes un QR por correo.' },
  { pregunta: '\u00bfCu\u00e1nto dura?', respuesta: 'De 2 a 3 horas ida y vuelta en los tramos cortos (Claro de Luna, La Virgen); los largos (Alto de la Cruz, P\u00e1ramo) toman hasta 5-6 horas.' },
  { pregunta: '\u00bfQu\u00e9 ropa llevar?', respuesta: 'Zapatos de buen agarre/trekking, ropa de abrigo e impermeable (clima fr\u00edo de bosque andino), gorra y bloqueador, agua y snack; prohibido llevar mascotas.' },
  { pregunta: '\u00bfCu\u00e1ndo ir?', respuesta: 'De martes a domingo desde las 6AM (lunes cerrado); ideal entre semana por la ma\u00f1ana temprano para evitar multitudes y disfrutar el amanecer.' }
];

module.exports = { SLUG: SLUG, HERO: HERO, PHOTOS: PHOTOS, BASE: BASE, TAGS: TAGS, FAQS: FAQS };

if (require.main !== module) return;

(async function main() {
  var url = process.env.DATABASE_URL || process.argv[2];
  if (!url) {
    console.error('Falta DATABASE_URL.');
    console.error('Uso: DATABASE_URL=postgres://... node api/seed-quebrada-la-vieja.js [--dry]');
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