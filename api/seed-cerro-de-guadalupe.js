// api/seed-cerro-de-guadalupe.js
// Crea (o actualiza) la pagina dinamica cerro-de-guadalupe.html con los datos
// de ficha-cerro-de-guadalupe.md, replicando EXACTAMENTE lo que guardaria el
// formulario admin.html (CATEGORY_TAG_FIELDS/CATEGORY_TAG_LISTS sitio,
// _buildTagsObj/_placeToAPI). Patron de api/seed-museo-del-oro.js.
//
// Rating: NO se siembran resenas ni se hardcodea rating. La pagina queda
// con rating/contador en 0 hasta que lleguen interacciones reales
// (ADR-008: api/interacciones.js recalcula AVG/COUNT dinamicamente).
//
// Uso:
//   DATABASE_URL=postgres://... node api/seed-cerro-de-guadalupe.js --dry
//   DATABASE_URL=postgres://... node api/seed-cerro-de-guadalupe.js
//
// Idempotente: re-ejecutable sin efectos secundarios (ON CONFLICT slug).

var neon = null;
function getNeon() {
  if (!neon) neon = require('@neondatabase/serverless').neon;
  return neon;
}

const SLUG = 'cerro-de-guadalupe';
const HERO = 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Guadalupe_Bogot%C3%A1.jpg/960px-Guadalupe_Bogot%C3%A1.jpg';

const PHOTOS = [
  { url: HERO, caption: 'Santuario y estatua de la Virgen en la cima del Cerro de Guadalupe' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/60/Bog_-_Virgen_de_Guadalupe.JPG/960px-Bog_-_Virgen_de_Guadalupe.JPG', caption: 'Estatua monumental de la Inmaculada Concepci\u00f3n (15 m, Gustavo Arcila Uribe)' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d8/Bog_-_Ermita_de_Guadalupe.JPG/960px-Bog_-_Ermita_de_Guadalupe.JPG', caption: 'Ermita de Nuestra Se\u00f1ora de Guadalupe, costado lateral' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/Cerro_de_Guadalupe_-_Al_fondo_cerro_de_Monserrate_2.jpg/960px-Cerro_de_Guadalupe_-_Al_fondo_cerro_de_Monserrate_2.jpg', caption: 'Vista desde el mirador con el Cerro de Monserrate al fondo' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/84/Cerro_de_Guadalupe_-_Ermita_de_Ntra_Sra_de_Guadalupe_-_Fachada.jpg/960px-Cerro_de_Guadalupe_-_Ermita_de_Ntra_Sra_de_Guadalupe_-_Fachada.jpg', caption: 'Fachada de la ermita del santuario' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7c/Bogot%C3%A1_cerros_desde_el_santiuario_de_Guadalupe.JPG/960px-Bogot%C3%A1_cerros_desde_el_santiuario_de_Guadalupe.JPG', caption: 'Cerros orientales de Bogot\u00e1 vistos desde el santuario' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6a/Cerro_de_Guadalupe_-_Carretera_al_cerro.jpg/960px-Cerro_de_Guadalupe_-_Carretera_al_cerro.jpg', caption: 'V\u00eda carreteable de ascenso al cerro, construida en 1967' }
];

const BASE = {
  slug: SLUG,
  nombre: 'Cerro de Guadalupe',
  categoria_slug: 'sitio',
  lead: 'El mirador natural m\u00e1s alto y uno de los menos concurridos de Bogot\u00e1, coronado por la estatua monumental de la Virgen que vigila la ciudad desde 1946. Silencio, fe y una de las panor\u00e1micas m\u00e1s amplias de la capital, a un paso de Monserrate.',
  descripcion: 'En la cima se alzan una estatua de 15 metros -obra del escultor Gustavo Arcila Uribe, erigida en 1946 en ferrocemento por piezas sobre la ermita- y una peque\u00f1a ermita consagrada a Nuestra Se\u00f1ora de Guadalupe. La imagen en realidad es la Virgen de la Inmaculada Concepci\u00f3n, patrona de la Arquidi\u00f3cesis de Bogot\u00e1 (no la Virgen mexicana). Es mucho menos concurrido que Monserrate (unos 1.000 personas los fines de semana), se llega por carretera (en carro, bus o bicicleta) y ofrece una de las mejores vistas de Bogot\u00e1 con el santuario y mirador en la cima. Con 3.360 m de altura es m\u00e1s alto que Monserrate (3.152 m) y uno de los dos cerros tutelares de Bogot\u00e1 junto a \u00e9l.',
  highlight: 'La vista panor\u00e1mica m\u00e1s alta de Bogot\u00e1 y la estatua monumental de la Virgen (15 m) que se ve desde toda la ciudad',
  ciudad: 'Bogot\u00e1',
  region: 'Cundinamarca',
  barrio: 'Santa Fe (Cerros Orientales)',
  lat: 4.59194,
  lng: -74.05440,
  whatsapp: '',
  telefono: '(601) 2465937',
  email: '',
  web: 'https://www.arquibogota.org.co',
  instagram: '@arquidiocesisbogota',
  precio_desde: 'Gratis',
  horario: 'Todos los d\u00edas aprox. 7AM-8PM; sendero Guadalupe-Aguanoso fines de semana',
  emoji: '\ud83c\udfdb',
  hero_bg: '#455a64',
  foto_hero: HERO,
  tipo: 'Mirador \u00b7 Santuario religioso \u00b7 Monta\u00f1a',
  capacidad: '',
  como_llegar: 'En carro por Circunvalar - v\u00eda a Choach\u00ed (desv\u00edo km 6.7) o en bus a Choach\u00ed desde calle 6 con cra 15 + caminata de 2 km. No hay funicular ni telef\u00e9rico (la canasta del barrio Egipto es de Monserrate).',
  status: 'published',
  destacado: true
};

const TAGS = {
  tipo_actividad: 'Mirador / santuario religioso',
  dificultad: 'Media',
  dificultad_desc: 'Se llega en veh\u00edculo por carretera hasta la cima; a pie desde el desv\u00edo del km 6.7 son 2 km de subida (30-60 min). La altura (3.360 m) puede causar fatiga y falta de aire.',
  duracion: '2-3 horas',
  altitud: '3360',
  temporada: ['Todo el a\u00f1o', 'Amanecer con cielos despejados', 'Atardecer sobre la ciudad'],
  precio_entrada: 'Gratis (bus y parqueadero son los gastos asociados). Bus a Choach\u00ed $3.000-6.000; parqueadero voluntario $3.000-4.000; van de descenso ~$10.000.',
  distancia: 'A 15 min por carretera de Monserrate; acceso por el sector de Egipto / Voto Nacional (calle 6 con carrera 15)',
  como_llegar: BASE.como_llegar,
  permisos: 'No requiere permiso; el sendero Guadalupe-Aguanoso opera los fines de semana con registro seg\u00fan programaci\u00f3n del IDRD.',
  temporada_nota: 'Habilitado todos los d\u00edas aprox. de 7AM a 8PM. El sendero peatonal Guadalupe-Aguanoso funciona principalmente s\u00e1bados y domingos (ingreso 6:30-9AM, cierre 12M). Misas los domingos a las 9:00, 10:30 y 12:00M.',
  fauna_flora: JSON.stringify([
    { emoji: '\ud83c\udf3f', nombre: 'Bosque alto andino', hecho: 'Vegetaci\u00f3n densa con encenillo y gaque en la v\u00eda al cerro' },
    { emoji: '\ud83c\udf32', nombre: 'Frailejones', hecho: 'Presentes en los tramos altos y p\u00e1ramos del complejo' },
    { emoji: '\ud83d\udc26', nombre: 'Colibr\u00edes', hecho: 'Aves nectar\u00edvoras que se ven entre la vegetaci\u00f3n de la monta\u00f1a' },
    { emoji: '\ud83d\udc3a', nombre: 'Fauna de cerro', hecho: 'Cusumbos y zorros habitan la reserva del Bosque Oriental' }
  ]),
  secretos: JSON.stringify([
    { icono: '\ud83c\udf19', titulo: 'No es la Virgen mexicana', texto: 'La estatua es la Inmaculada Concepci\u00f3n; el nombre "Guadalupe" viene de la Virgen de Guadalupe de Extremadura, Espa\u00f1a.', tag: 'Dato', tag_color: 'gold' },
    { icono: '\ud83d\udc7f', titulo: 'Chiguach\u00ed, pie de abuela', texto: 'Los muiscas llamaban Chiguach\u00ed a este cerro y a Monserrate "pie de abuelo"; ambos son los cerros tutelares.', tag: 'Historia', tag_color: 'blue' },
    { icono: '\ud83d\ude97', titulo: 'La v\u00eda de 1967', texto: 'La carretera fue construida en 1967 por el sacerdote Luis Jim\u00e9nez para subir a los fieles.', tag: 'Dato', tag_color: 'gold' },
    { icono: '\ud83c\udf00', titulo: 'La estatua iluminada', texto: 'De noche se ilumina y se ve desde kil\u00f3metros: es icono del skyline bogotano.', tag: 'Imperdible', tag_color: 'gold' },
    { icono: '\ud83c\udfdb', titulo: 'Monserrate al lado', texto: 'A 15 min por carretera; combinable el mismo d\u00eda con funicular y telef\u00e9rico.', tag: 'Cerca', tag_color: 'blue' }
  ]),
  regulaciones: 'No hay funicular ni telef\u00e9rico; se llega por carretera (carro, bus o a pie). El sendero Guadalupe-Aguanoso opera solo fines de semana con registro seg\u00fan el IDRD. No salirse de la v\u00eda ni del sendero; es reserva del Bosque Oriental. No dejar basura; llevar los residuos de vuelta. Respetar las ceremonias religiosas en la ermita. Con altura (3.360 m), hidratarse y evitar esfuerzos bruscos.',
  checklist_tip: 'Ve de ma\u00f1ana temprano con cielo despejado: la vista del amanecer desde los 3.360 m es la mejor. Lleva abrigo: en la cima hace viento y neblina.',
  entradas: [
    { tipo: 'Acceso al cerro', precio: 'Gratis', incluye: 'Santuario y mirador en la cima', link: 'https://www.arquibogota.org.co' },
    { tipo: 'Bus hacia Choach\u00ed', precio: '3000', incluye: 'Desde calle 6 con cra 15, bajarse en el desv\u00edo del km 6.7', link: 'https://bogota.gov.co' },
    { tipo: 'Parqueadero voluntario', precio: '3000', incluye: 'Zona de parqueo cerca del santuario', link: 'https://bogota.gov.co' },
    { tipo: 'Van de descenso al centro', precio: '10000', incluye: 'Bajada hasta el centro desde la cima', link: 'https://bogota.gov.co' },
    { tipo: 'Sendero Guadalupe-Aguanoso', precio: 'Gratis', incluye: 'Fin de semana, registro seg\u00fan IDRD', link: 'https://www.idrd.gov.co' }
  ],
  tours: [
    {
      nombre: 'Subida en carro al santuario y mirador',
      precio: '30000', precio_sub: 'por veh\u00edculo',
      duracion: '3 horas', tipo_tour: 'Privado', idioma: 'Espa\u00f1ol', max_personas: 'M\u00e1x 4',
      rating: '4.8', review_count: 190,
      descripcion: 'Recorrido por la v\u00eda carreteable de 1967 hasta la cima: ermita, estatua de la Virgen y la panor\u00e1mica de Bogot\u00e1 desde los 3.360 m.',
      incluye: ['Conductor/gu\u00eda', 'Paradas en miradores', 'Contexto hist\u00f3rico'],
      no_incluye: ['Entrada a Monserrate', 'Alimentos'],
      link_reserva: 'https://bogotawalkingtours.com',
      featured: true
    },
    {
      nombre: 'Cerro de Guadalupe + Monserrate',
      precio: '60000', precio_sub: 'por persona',
      duracion: '6 horas', tipo_tour: 'Grupal', idioma: 'Espa\u00f1ol', max_personas: 'M\u00e1x 8',
      rating: '4.9', review_count: 220,
      descripcion: 'Combo de los dos cerros tutelares: amanecer en Guadalupe (gratis) y subida a Monserrate con funicular o telef\u00e9rico.',
      incluye: ['Gu\u00eda', 'Transporte entre cerros', 'Entrada a Monserrate'],
      no_incluye: ['Alimentos', 'Souvenirs'],
      link_reserva: 'https://bogotawalkingtours.com',
      featured: false
    },
    {
      nombre: 'Sendero Guadalupe-Aguanoso a pie',
      precio: '25000', precio_sub: 'por persona',
      duracion: '4 horas', tipo_tour: 'Grupal', idioma: 'Espa\u00f1ol', max_personas: 'M\u00e1x 12',
      rating: '4.7', review_count: 110,
      descripcion: 'Caminata ecol\u00f3gica de fin de semana entre bosque alto andino desde el cerro hacia Aguanoso con gu\u00eda local.',
      incluye: ['Gu\u00eda', 'Registro del sendero', 'Contexto ecol\u00f3gico'],
      no_incluye: ['Transporte', 'Equipo personal'],
      link_reserva: 'https://www.idrd.gov.co',
      featured: false
    }
  ],
  equipamiento: [
    { item: 'Ropa de abrigo (altura 3.360 m, viento y neblina)', prioridad: 'Obligatorio' },
    { item: 'Efectivo para bus, parqueadero o van de descenso', prioridad: 'Recomendado' },
    { item: 'Zapatos c\u00f3modos (2 km de subida si vas a pie)', prioridad: 'Recomendado' },
    { item: 'C\u00e1mara para la estatua y la vista de Bogot\u00e1', prioridad: 'Recomendado' },
    { item: 'Agua y snack para la altura', prioridad: 'Recomendado' }
  ],
  itinerario: [
    { dia: 'Recorrido', hora: '7:00 am', titulo: 'V\u00eda a Choach\u00ed (km 6.7)', icono: '\ud83d\ude97', detalle: 'Desv\u00edo se\u00f1alizado a la derecha por la carretera de 1967', tags: ['Acceso'] },
    { dia: 'Recorrido', hora: '8:00 am', titulo: 'Ermita de Guadalupe', icono: '\ud83d\udcdd', detalle: 'La peque\u00f1a capilla consagrada a Nuestra Se\u00f1ora', tags: ['Fe'] },
    { dia: 'Recorrido', hora: '8:30 am', titulo: 'Estatua de la Virgen (15 m)', icono: '\ud83c\udf19', detalle: 'La Inmaculada Concepci\u00f3n de Gustavo Arcila Uribe, icono del skyline', tags: ['Icono'] },
    { dia: 'Recorrido', hora: '9:00 am', titulo: 'Mirador panor\u00e1mico', icono: '\ud83c\udff7', detalle: 'Bogot\u00e1 y la sabana desde los 3.360 m con Monserrate al fondo', tags: ['Mirador'] }
  ],
  dificultad_tags: [
    { texto: 'Se llega en veh\u00edculo hasta la cima por carretera', apto: true },
    { texto: 'Vista panor\u00e1mica de Bogot\u00e1 desde los 3.360 m', apto: true },
    { texto: 'A pie son 2 km de subida exigente', apto: false },
    { texto: 'La altura (3.360 m) puede causar fatiga y falta de aire', apto: false },
    { texto: 'No hay funicular ni telef\u00e9rico (solo carretera o bus)', apto: false }
  ],
  temporada_matriz: {
    Ene: 'ideal', Feb: 'ideal', Mar: 'ideal', Abr: 'posible', May: 'posible',
    Jun: 'ideal', Jul: 'ideal', Ago: 'ideal', Sep: 'posible', Oct: 'posible', Nov: 'ideal', Dic: 'posible'
  }
};

const FAQS = [
  { pregunta: '\u00bfC\u00f3mo llego?', respuesta: 'En carro por Circunvalar - v\u00eda a Choach\u00ed (desv\u00edo km 6.7) o en bus a Choach\u00ed desde calle 6 con cra 15 + caminata de 2 km. No hay funicular ni telef\u00e9rico.' },
  { pregunta: '\u00bfCu\u00e1nto cuesta?', respuesta: 'El acceso es gratis; el bus cuesta $3.000-6.000 y el parqueadero $3.000-4.000.' },
  { pregunta: '\u00bfCu\u00e1nto tiempo toma?', respuesta: 'De 30 min a 1 hora de caminata desde el desv\u00edo; la visita completa dura 2-3 horas.' },
  { pregunta: '\u00bfVale la pena vs Monserrate?', respuesta: 'S\u00ed: es m\u00e1s alto, gratis, con menos multitudes y la misma o mejor vista; Monserrate tiene funicular, restaurantes e infraestructura mayor.' },
  { pregunta: '\u00bfCu\u00e1les son los horarios?', respuesta: 'Todos los d\u00edas aprox. 7:00AM-8:00PM; misas los domingos a las 9:00, 10:30 y 12:00M.' }
];

module.exports = { SLUG: SLUG, HERO: HERO, PHOTOS: PHOTOS, BASE: BASE, TAGS: TAGS, FAQS: FAQS };

if (require.main !== module) return;

(async function main() {
  var url = process.env.DATABASE_URL || process.argv[2];
  if (!url) {
    console.error('Falta DATABASE_URL.');
    console.error('Uso: DATABASE_URL=postgres://... node api/seed-cerro-de-guadalupe.js [--dry]');
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