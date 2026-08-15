// scripts/seed-parque-simon-bolivar.js
// Crea (o actualiza) la pagina dinamica parque-simon-bolivar.html con los
// datos de ficha-parque-simon-bolivar.md, replicando EXACTAMENTE lo que
// guardaria el formulario admin.html (CATEGORY_TAG_FIELDS/CATEGORY_TAG_LISTS
// sitio, _buildTagsObj/_placeToAPI). Patron de scripts/seed-museo-del-oro.js.
//
// Rating: NO se siembran resenas ni se hardcodea rating. La pagina queda
// con rating/contador en 0 hasta que lleguen interacciones reales
// (ADR-008: api/interacciones.js recalcula AVG/COUNT dinamicamente).
//
// Uso:
//   DATABASE_URL=postgres://... node scripts/seed-parque-simon-bolivar.js --dry
//   DATABASE_URL=postgres://... node scripts/seed-parque-simon-bolivar.js
//
// Idempotente: re-ejecutable sin efectos secundarios (ON CONFLICT slug).

var neon = null;
function getNeon() {
  if (!neon) neon = require('@neondatabase/serverless').neon;
  return neon;
}

const SLUG = 'parque-simon-bolivar';
const HERO = 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0f/Parque_24_Sim%C3%B3n_Bol%C3%ADvar_de_Bogot%C3%A1%2C_Cund_-_Col.jpg/960px-Parque_24_Sim%C3%B3n_Bol%C3%ADvar_de_Bogot%C3%A1%2C_Cund_-_Col.jpg';

const PHOTOS = [
  { url: HERO, caption: 'Vista a\u00e9rea del parque central con zonas verdes y la laguna' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9d/Parque_pan_4_Sim%C3%B3n_Bol%C3%ADvar_de_Bogot%C3%A1%2C_Cund_-_Col.jpeg/960px-Parque_pan_4_Sim%C3%B3n_Bol%C3%ADvar_de_Bogot%C3%A1%2C_Cund_-_Col.jpeg', caption: 'Panor\u00e1mica de la laguna artificial del parque' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/La_Cascada_Parque_Sim%C3%B3n_Bol%C3%ADvar_Bogot%C3%A1.JPG/960px-La_Cascada_Parque_Sim%C3%B3n_Bol%C3%ADvar_Bogot%C3%A1.JPG', caption: 'Cascada y espejo de agua del parque' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/82/Parque_Simon_Bolivar_Playa_artificial.JPG/960px-Parque_Simon_Bolivar_Playa_artificial.JPG', caption: 'Actividades en el lago / playa artificial' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9c/Parque_Central_Sim%C3%B3n_Bol%C3%ADvar_-_Pista_todoterreno.jpg/960px-Parque_Central_Sim%C3%B3n_Bol%C3%ADvar_-_Pista_todoterreno.jpg', caption: 'Zona deportiva: pista de ciclomonta\u00f1a (ciclopaseo)' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/58/Bogot%C3%A1_Parque_Sim%C3%B3n_Bol%C3%ADvar_escenario.JPG/960px-Bogot%C3%A1_Parque_Sim%C3%B3n_Bol%C3%ADvar_escenario.JPG', caption: 'Escenario de eventos / concha ac\u00fastica' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/da/Simon_bolivar_en_rock_al_parque.jpg/960px-Simon_bolivar_en_rock_al_parque.jpg', caption: 'Rock al Parque en la Plaza de Eventos' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/ba/Templete_del_Parque_Sim%C3%B3n_Bol%C3%ADvar%2C_Colombia_DSC00080.JPG/960px-Templete_del_Parque_Sim%C3%B3n_Bol%C3%ADvar%2C_Colombia_DSC00080.JPG', caption: 'Templete Eucar\u00edstico de 1968' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/Biblioteca_V._B._Panor%C3%A1mica.JPG/960px-Biblioteca_V._B._Panor%C3%A1mica.JPG', caption: 'Biblioteca Virgilio Barco (Rogelio Salmona), al costado del parque' }
];

const BASE = {
  slug: SLUG,
  nombre: 'Parque Metropolitano Sim\u00f3n Bol\u00edvar',
  categoria_slug: 'sitio',
  lead: 'Un pulm\u00f3n verde de 113 hect\u00e1reas en el coraz\u00f3n de Bogot\u00e1, con un lago navegable, 16 km de senderos, 4 km de ciclorruta y la mayor plaza de conciertos al aire libre de la ciudad. Es el punto de encuentro por excelencia de los bogotanos.',
  descripcion: 'El parque central se cre\u00f3 jur\u00eddicamente con la Ley 31 de 1979 para conmemorar los 200 a\u00f1os del nacimiento de Bol\u00edvar; la primera etapa se entreg\u00f3 en 1983 y el Parque Central se inaugur\u00f3 oficialmente el 15 de diciembre de 1991, sobre los terrenos de la antigua Hacienda El Salitre (donde en 1968 se celebr\u00f3 una misa campal del papa Pablo VI, recuerdo que conserva el Templete Eucar\u00edstico). Cuenta con laguna artificial navegable, ciclorruta perimetral de 4 km, ciclopaseo de 3.650 m, pista de trote de 3.160 m, canchas, parque canino, zona de picnics, concha ac\u00fastica y la Plaza de Eventos (37.000 m\u00b2, capacidad para 80.000-140.000 personas), sede de Rock al Parque, el Festival de Verano y los Festivales al Parque. Al costado est\u00e1 la Biblioteca Virgilio Barco de Rogelio Salmona.',
  highlight: 'El pulm\u00f3n verde de Bogot\u00e1 con laguna navegable, deportes y los mayores conciertos al aire libre de Colombia',
  ciudad: 'Bogot\u00e1',
  region: 'Cundinamarca',
  barrio: 'Teusaquillo',
  lat: 4.658056,
  lng: -74.093889,
  whatsapp: '',
  telefono: '(601) 660 5400',
  email: '',
  web: 'https://www.idrd.gov.co/parques-y-escenarios/parque-simon-bolivar',
  instagram: '@idrdbogota',
  precio_desde: 'Gratis',
  horario: 'Lunes a domingo 5AM-6PM',
  emoji: '\ud83c\udf33',
  hero_bg: '#1b5e20',
  foto_hero: HERO,
  tipo: 'Parque urbano \u00b7 Recreaci\u00f3n al aire libre \u00b7 Lago',
  capacidad: 'Plaza de Eventos hasta 140.000 personas',
  como_llegar: 'TransMilenio estaci\u00f3n "Salitre - El Greco" (Av. 68) y caminar 10 min por la Av. 68 hasta la calle 53. Tambi\u00e9n "Movistar Arena", "7 de Agosto", "El Tiempo - C\u00e1mara de Comercio" y "CAN". Carro/SITP: Av. 68, calle 63, calle 53, Av. Boyac\u00e1.',
  status: 'published',
  destacado: true
};

const TAGS = {
  tipo_actividad: 'Parque urbano',
  dificultad: 'F\u00e1cil',
  dificultad_desc: 'Terreno plano con senderos, laguna y zonas verdes; apto para todas las edades y movilidad reducida. La laguna navegable permite kayak y botes de pedal.',
  duracion: '2-4 horas',
  altitud: '2560',
  temporada: ['Todo el a\u00f1o', 'Domingos con ciclov\u00eda y picnic', 'Conciertos masivos en la Plaza de Eventos'],
  precio_entrada: 'Gratis. Alquiler de botes/kayak y eventos privados con tarifa; el resto de servicios es libre.',
  distancia: 'Al costado de la Biblioteca Virgilio Barco y la Unidad Deportiva El Salitre; estaci\u00f3n TransMilenio "Salitre - El Greco"',
  como_llegar: BASE.como_llegar,
  permisos: 'No requiere permiso; acceso libre. Eventos privados y alquiler de lanchas con tarifa.',
  temporada_nota: 'Lunes a domingo de 5AM a 6PM. Las instalaciones deportivas (UDS, atletismo) pueden extenderse hasta las 10PM.',
  fauna_flora: JSON.stringify([
    { emoji: '\ud83e\udda9', nombre: 'Patos y garzas', hecho: 'Aves que habitan la laguna artificial del parque' },
    { emoji: '\ud83c\udf31', nombre: 'Cedros y palmas', hecho: '\u00c1rboles t\u00edpicos de las zonas verdes del parque' },
    { emoji: '\ud83c\udf34', nombre: 'Eucaliptos de la antigua hacienda', hecho: 'Algunos ejemplares sobreviven de la Hacienda El Salitre' },
    { emoji: '\ud83d\udc3e', nombre: 'Mascotas del parque canino', hecho: 'Zona delimitada para perros con juegos y agua' }
  ]),
  secretos: JSON.stringify([
    { icono: '\ud83c\udfdb', titulo: 'El Templete Eucar\u00edstico de 1968', texto: 'Recuerdo de la misa campal del papa Pablo VI; en 1986 Juan Pablo II reuni\u00f3 a m\u00e1s de 1 mill\u00f3n de personas aqu\u00ed.', tag: 'Historia', tag_color: 'blue' },
    { icono: '\ud83c\udfa4', titulo: 'Rock al Parque', texto: 'El festival gratuito de rock m\u00e1s grande de Latinoam\u00e9rica se celebra en la Plaza de Eventos cada a\u00f1o.', tag: 'Imperdible', tag_color: 'gold' },
    { icono: '\ud83d\udcda', titulo: 'Biblioteca Virgilio Barco', texto: 'La obra maestra de Rogelio Salmona, con sus ladrillos y jardines acu\u00e1ticos, al costado del parque.', tag: 'Cultura', tag_color: 'gold' },
    { icono: '\ud83c\udfdc', titulo: 'Estadio El Camp\u00edn', texto: 'A pocos minutos: el estadio Nemesio Camacho El Camp\u00edn y la Movistar Arena.', tag: 'Cerca', tag_color: 'blue' },
    { icono: '\ud83c\udf3f', titulo: 'Jard\u00edn Bot\u00e1nico', texto: 'Al otro lado de la Av. 68: el pulm\u00f3n verde con Tropicario a pocos minutos.', tag: 'Cerca', tag_color: 'green' }
  ]),
  regulaciones: 'Acceso gratuito y libre, de 5AM a 6PM todos los d\u00edas. Prohibidas patinetas y bicicletas el\u00e9ctricas operando dentro del parque. Las mascotas deben ir con correa o arn\u00e9s y recoger sus desechos. No arrojar basura; hay puntos de reciclaje. Los d\u00edas de concierto masivo hay controles de acceso y objetos permitidos. El alquiler de lanchas y eventos privados tiene tarifas; los dem\u00e1s servicios son gratuitos.',
  checklist_tip: 'Ve en la ma\u00f1ana entre semana para el parque con menos gente; los domingos hay ciclov\u00eda y ambiente de picnic junto al lago.',
  entradas: [
    { tipo: 'Acceso al parque', precio: 'Gratis', incluye: 'Todos los d\u00edas 5AM-6PM', link: 'https://www.idrd.gov.co' },
    { tipo: 'Alquiler de botes y kayak (laguna)', precio: '10000', incluye: 'Pedal, remo y kayak por hora aprox.', link: 'https://www.idrd.gov.co' },
    { tipo: 'Parque canino', precio: 'Gratis', incluye: 'Zona delimitada para mascotas', link: 'https://www.idrd.gov.co' },
    { tipo: 'Eventos y conciertos (Plaza de Eventos)', precio: 'Gratis', incluye: 'Rock al Parque, Festival de Verano y Festivales al Parque', link: 'https://www.idrd.gov.co' },
    { tipo: 'Canchas y zonas deportivas', precio: 'Gratis', incluye: 'F\u00fatbol, voleibol, baloncesto y patinodromo', link: 'https://www.idrd.gov.co' }
  ],
  tours: [
    {
      nombre: 'Picnic en el parque con lago',
      precio: '25000', precio_sub: 'por persona',
      duracion: '3 horas', tipo_tour: 'Grupal', idioma: 'Espa\u00f1ol', max_personas: 'M\u00e1x 15',
      rating: '4.8', review_count: 340,
      descripcion: 'Experiencia de picnic junto a la laguna con canasta, mantas y deportes; el plan cl\u00e1sico bogotano al aire libre.',
      incluye: ['Canasta de picnic', 'Mantas', 'Actividades junto al lago'],
      no_incluye: ['Transporte', 'Alquiler de botes'],
      link_reserva: 'https://bogotapicnics.com',
      featured: true
    },
    {
      nombre: 'Kayak y botes en la laguna',
      precio: '30000', precio_sub: 'por persona',
      duracion: '90 minutos', tipo_tour: 'Grupal', idioma: 'Espa\u00f1ol', max_personas: 'M\u00e1x 10',
      rating: '4.7', review_count: 210,
      descripcion: 'Remar en la laguna artificial de 10-11 hect\u00e1reas con instructor y chaleco: kayak, pedal y remo.',
      incluye: ['Instructor', 'Chaleco', 'Alquiler de bote/kayak'],
      no_incluye: ['Transporte', 'Snacks'],
      link_reserva: 'https://idrd.gov.co',
      featured: false
    },
    {
      nombre: 'Ciclov\u00eda por la ciclorruta del parque',
      precio: '15000', precio_sub: 'por persona',
      duracion: '2 horas', tipo_tour: 'Grupal', idioma: 'Espa\u00f1ol', max_personas: 'M\u00e1x 12',
      rating: '4.6', review_count: 160,
      descripcion: 'Recorrido guiado por la ciclorruta perimetral de 4 km y el ciclopaseo interno de 3.650 m entre laguna y zonas verdes.',
      incluye: ['Bicicleta', 'Casco', 'Gu\u00eda'],
      no_incluye: ['Transporte', 'Alimentos'],
      link_reserva: 'https://bogotabikes.com',
      featured: false
    }
  ],
  equipamiento: [
    { item: 'Manta para picnic y protector solar', prioridad: 'Recomendado' },
    { item: 'Ropa c\u00f3moda y zapatos para caminar', prioridad: 'Recomendado' },
    { item: 'Efectivo para alquiler de botes y snacks', prioridad: 'Opcional' },
    { item: 'Bicicleta si quieres la ciclorruta de 4 km', prioridad: 'Opcional' },
    { item: 'C\u00e1mara para la laguna y los monumentos', prioridad: 'Opcional' }
  ],
  itinerario: [
    { dia: 'Recorrido', hora: '8:00 am', titulo: 'Laguna artificial', icono: '\ud83d\udea3', detalle: 'Remar en kayak o botes de pedal entre patos y garzas', tags: ['Lago'] },
    { dia: 'Recorrido', hora: '10:00 am', titulo: 'Ciclorruta y senderos', icono: '\ud83d\udeb2', detalle: '4 km perimetrales y ciclopaseo interno de 3.650 m', tags: ['Deporte'] },
    { dia: 'Recorrido', hora: '12:00 pm', titulo: 'Picnic junto al lago', icono: '\ud83e\uddc9', detalle: 'Zona de picnics con vista a la laguna', tags: ['Descanso'] },
    { dia: 'Recorrido', hora: '3:00 pm', titulo: 'Biblioteca Virgilio Barco', icono: '\ud83d\udcda', detalle: 'La obra maestra de Rogelio Salmona al costado del parque', tags: ['Arquitectura'] }
  ],
  dificultad_tags: [
    { texto: 'Terreno plano con senderos amplios, apto para todas las edades', apto: true },
    { texto: 'Accesible para movilidad reducida', apto: true },
    { texto: 'Laguna navegable con kayak y botes de pedal', apto: true },
    { texto: 'Los d\u00edas de concierto masivos la Plaza de Eventos se congestiona', apto: false },
    { texto: 'Prohibidas patinetas y bicicletas el\u00e9ctricas operando dentro', apto: false }
  ],
  temporada_matriz: {
    Ene: 'ideal', Feb: 'ideal', Mar: 'ideal', Abr: 'posible', May: 'posible',
    Jun: 'ideal', Jul: 'ideal', Ago: 'ideal', Sep: 'posible', Oct: 'posible', Nov: 'ideal', Dic: 'posible'
  }
};

const FAQS = [
  { pregunta: '\u00bfEs gratis?', respuesta: 'S\u00ed, entrada libre todos los d\u00edas; solo algunos servicios (botes, eventos privados) cobran.' },
  { pregunta: '\u00bfCu\u00e1l es el horario?', respuesta: '5:00AM a 6:00PM, lunes a domingo. Las instalaciones deportivas pueden extenderse hasta las 10PM.' },
  { pregunta: '\u00bfQu\u00e9 puedo hacer?', respuesta: 'Caminar, andar en bici, remar en el lago, patinar, trotar, jugar f\u00fatbol, hacer picnic, parque canino y asistir a conciertos.' },
  { pregunta: '\u00bfPuedo llevar mi mascota?', respuesta: 'S\u00ed, con correa o arn\u00e9s, recogiendo sus desechos; hay parque canino. No se permiten patinetas ni bicicletas el\u00e9ctricas operando dentro.' },
  { pregunta: '\u00bfD\u00f3nde hay conciertos?', respuesta: 'En la Plaza de Eventos / concha ac\u00fastica (Escenario M\u00f3vil), el Palacio de los Deportes y la Movistar Arena aleda\u00f1a; destacan Rock al Parque, Festival de Verano y los Festivales al Parque.' }
];

module.exports = { SLUG: SLUG, HERO: HERO, PHOTOS: PHOTOS, BASE: BASE, TAGS: TAGS, FAQS: FAQS };

if (require.main !== module) return;

(async function main() {
  var url = process.env.DATABASE_URL || process.argv[2];
  if (!url) {
    console.error('Falta DATABASE_URL.');
    console.error('Uso: DATABASE_URL=postgres://... node scripts/seed-parque-simon-bolivar.js [--dry]');
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