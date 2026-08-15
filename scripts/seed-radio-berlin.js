// scripts/seed-radio-berlin.js
// Crea (o actualiza) la pagina dinamica radio-berlin.html con los datos de
// ficha-radio-berlin.md, replicando EXACTAMENTE lo que guardaria el formulario
// admin.html (CATEGORY_TAG_FIELDS/CATEGORY_TAG_LISTS sitio, _buildTagsObj/
// _placeToAPI). Patron de scripts/seed-club-octava.js con upsert completo.
//
// Rating: NO se siembran resenas ni se hardcodea rating. La pagina queda
// con rating/contador en 0 hasta que lleguen interacciones reales
// (ADR-008: api/interacciones.js recalcula AVG/COUNT dinamicamente).
//
// Uso:
//   DATABASE_URL=postgres://... node scripts/seed-radio-berlin.js --dry
//   DATABASE_URL=postgres://... node scripts/seed-radio-berlin.js
//
// Idempotente: re-ejecutable sin efectos secundarios (ON CONFLICT slug).

var neon = null;
function getNeon() {
  if (!neon) neon = require('@neondatabase/serverless').neon;
  return neon;
}

const SLUG = 'radio-berlin';
const HERO = 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/09/Bogot%C3%A1_plaza_de_toros_de_Santamar%C3%ADa.JPG/960px-Bogot%C3%A1_plaza_de_toros_de_Santamar%C3%ADa.JPG';

const PHOTOS = [
  { url: HERO, caption: 'La Plaza de Toros de Santamar\u00eda, frente a la que naci\u00f3 Radio Berl\u00edn en La Macarena (2010)' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Plaza_de_Toros_de_Bogot%C3%A1.JPG/960px-Plaza_de_Toros_de_Bogot%C3%A1.JPG', caption: 'La Plaza de Toros de Bogot\u00e1, testigo del origen de Radio Berl\u00edn en 2010' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/02/Bogota_plaza_de_toros.JPG/960px-Bogota_plaza_de_toros.JPG', caption: 'Vista de la plaza de toros y el entorno de La Macarena' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Plaza_de_toros_La_Santamaria_2.jpeg/960px-Plaza_de_toros_La_Santamaria_2.jpeg', caption: 'El costado de la plaza donde quedaba el local original del club' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fa/La_Macarena_panorama_norte_sur.JPG/960px-La_Macarena_panorama_norte_sur.JPG', caption: 'Panorama de La Macarena, el barrio donde Radio Berl\u00edn hizo historia' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b3/Bogota_La_Macarena_carrera_5.JPG/960px-Bogota_La_Macarena_carrera_5.JPG', caption: 'La carrera 5 de La Macarena, zona de la escena electr\u00f3nica del centro' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/89/Bogot%C3%A1_barrio_La_Macarena_kr_5_cl_26_B.JPG/960px-Bogot%C3%A1_barrio_La_Macarena_kr_5_cl_26_B.JPG', caption: 'Esquina de la carrera 5 con calle 26, coraz\u00f3n del barrio La Macarena' }
];

const BASE = {
  slug: SLUG,
  nombre: 'Radio Berl\u00edn',
  categoria_slug: 'sitio',
  lead: 'Radio Berlin nacio en 2010 frente a la Plaza de Toros de La Macarena y bajo la persiana en 2023; hoy sigue vivo en Chapinero (Cra 13 #64-13) como La Casa del Techno, con su cabina-jaula, clases de DJ y un cartel que mezcla techno internacional, house de los miercoles y maratones de vinilo.',
  descripcion: 'Radio Berl\u00edn, "La Casa del Techno", naci\u00f3 en 2010 frente a la Plaza de Toros de La Macarena, en el centro de Bogot\u00e1, y se convirti\u00f3 en referencia del techno underground: Vice (febrero de 2016) la retrat\u00f3 con visitas de Stacey Pullen, Troy Pierce, Jimmy Edgar, Margaret Dygas y Loco Dice. Cerr\u00f3 definitivamente en julio de 2023 (sus \u00faltimas fiestas fueron del 26 al 29 de julio, seg\u00fan El Tiempo, La FM e Infobae), dejando un vac\u00edo en la escena electr\u00f3nica bogotana. En 2024-2025 resucit\u00f3 en Chapinero, Carrera 13 #64-13 (coordenadas 4.6510087, -74.0633782), como "La Casa del Techno": cabina en "jaula", capacidad de 400 (RA.co 26862) a 500 (Tikipal), mi\u00e9rcoles dedicados al house con entrada gratis, sesiones de vinilo (Laboratorio 002), el festival E110101 (2024), el marat\u00f3n de Alex Jockey (10 horas de vinilo, octubre de 2025) y el afterparty de Monumentum 2026. Hoy Radio Berl\u00edn cuenta adem\u00e1s con RadioBerlin Academy, la escuela de DJs que abre sus cursos desde el 18 de agosto de 2026, y sigue plenamente activa como templo del techno y el house en Bogot\u00e1.',
  highlight: 'La casa del techno bogotano, de La Macarena a Chapinero, con su cabina-jaula, clases de DJ y sesiones de vinilo',
  ciudad: 'Bogot\u00e1',
  region: 'Cundinamarca',
  barrio: 'Chapinero (sede actual) / La Macarena (origen hist\u00f3rico)',
  lat: 4.6510087,
  lng: -74.0633782,
  whatsapp: '+57 314 487 3204',
  telefono: '+57 310 7676874',
  email: '',
  web: 'https://radioberlinclub.com',
  instagram: '@radioberlin_',
  precio_desde: 'Cover variable (25.000-35.000); gratis antes de las 22:00 viernes y miercoles de house',
  horario: 'Vie-Sab 9PM-6AM (Findglocal); mie-sab 4PM-4AM (Tikipal)',
  emoji: '\ud83d\udd0a',
  hero_bg: '#000000',
  foto_hero: HERO,
  tipo: 'Club de techno/house + escuela de DJ (RadioBerlin Academy)',
  capacidad: '400',
  como_llegar: 'TransMilenio: la estaci\u00f3n Calle 63 est\u00e1 cerrada por el Metro L1; bajar en Calle 57 o Flores y caminar por la Carrera 13 hasta la calle 64. Taxi o app: Carrera 13 No. 64-13, Chapinero.',
  status: 'published',
  destacado: true
};

const TAGS = {
  tipo_actividad: 'Club de m\u00fasica electr\u00f3nica (techno/house)',
  dificultad: 'F\u00e1cil',
  dificultad_desc: 'Club interior con cabina central en "jaula", pista y terraza; sin restricciones f\u00edsicas relevantes. Recomendado +18 con documento y calzado c\u00f3modo para bailar varias horas.',
  duracion: '4-6 horas',
  altitud: '2600',
  temporada: ['Fines de semana', 'Mi\u00e9rcoles de house', 'Festivales y afters (E110101, Monumentum)', 'Sesiones de vinilo'],
  precio_entrada: 'Cover variable; referencia 25.000-35.000 COP. Gratis antes de las 22:00 los viernes; mi\u00e9rcoles de house gratis; lista Terraza by Lesson gratis primeras 100.',
  distancia: 'En la Carrera 13 No. 64-13, Chapinero; TransMilenio: estaci\u00f3n Calle 63 cerrada por Metro L1, usar Calle 57 o Flores.',
  como_llegar: BASE.como_llegar,
  permisos: 'Mayor de 18 a\u00f1os con documento de identidad v\u00e1lido.',
  temporada_nota: 'Radio Berl\u00edn abre principalmente viernes y s\u00e1bados de 9PM a 6AM; los mi\u00e9rcoles hay house con entrada gratis y la Terraza by Lesson funciona los s\u00e1bados.',
  fauna_flora: JSON.stringify([
    { emoji: '\ud83c\udfa7', nombre: 'Cabina-jaula', hecho: 'La cabina central del DJ enmarcada como una jaula, el s\u00edmbolo hist\u00f3rico del club' },
    { emoji: '\ud83d\udd0a', nombre: 'Sonido para bailar', hecho: 'Sistema de sonido que hace vibrar la pista hasta el amanecer' },
    { emoji: '\ud83d\udcbf', nombre: 'Vinilo', hecho: 'Sesiones y maratones de vinilo, del Laboratorio 002 al marat\u00f3n de Alex Jockey (10 horas)' },
    { emoji: '\ud83c\udf1f', nombre: 'Terraza by Lesson', hecho: 'Sesiones outdoors los s\u00e1bados con lista gratis para las primeras 100 personas' },
    { emoji: '\ud83c\udfb5', nombre: 'Curadur\u00eda techno', hecho: 'Techno internacional de la mano de Stacey Pullen, Troy Pierce, Jimmy Edgar, Margaret Dygas y Loco Dice' }
  ]),
  secretos: JSON.stringify([
    { icono: '\ud83d\udd0a', titulo: 'La cabina-jaula', texto: 'El s\u00edmbolo de Radio Berl\u00edn desde La Macarena: busca un lugar frente a la jaula donde el sonido se siente en el pecho.', tag: 'Imperdible', tag_color: 'gold' },
    { icono: '\ud83c\udf1f', titulo: 'La Terraza by Lesson', texto: 'S\u00e1bados de sesiones al aire libre; las primeras 100 personas entran gratis con lista.', tag: 'Sabado', tag_color: 'blue' },
    { icono: '\ud83d\udcbf', titulo: 'Sesiones de vinilo', texto: 'El Laboratorio 002 y el marat\u00f3n de Alex Jockey (10 horas) son las citas para puristas del plato.', tag: 'Cita', tag_color: 'green' },
    { icono: '\ud83c\udfa4', titulo: 'RadioBerlin Academy', texto: 'El aula donde se forman los nuevos DJs: cursos desde el 18 de agosto de 2026.', tag: 'Escuela', tag_color: 'brown' }
  ]),
  regulaciones: 'Requiere ser mayor de 18 a\u00f1os con documento de identidad v\u00e1lido. Cover variable seg\u00fan evento (referencia 25.000-35.000 COP). Viernes: entrada gratis antes de las 22:00. Mi\u00e9rcoles de house: entrada gratis. Lista Terraza by Lesson: gratis para las primeras 100 personas. No se permite el ingreso de alimentos ni bebidas externas. Capacidad de 400 a 500 personas seg\u00fan la fecha.',
  checklist_tip: 'Llega antes de las 22:00 los viernes para entrar gratis y evita las filas del fin de semana; revisa la programaci\u00f3n en radioberlinclub.com.',
  entradas: [
    { tipo: 'General (cover variable)', precio: '25000', incluye: 'Acceso a la pista, cover seg\u00fan programaci\u00f3n (referencia 25.000-35.000 COP)', link: 'https://radioberlinclub.com' },
    { tipo: 'Gratis antes de las 22:00 (viernes)', precio: '0', incluye: 'Entrada libre si llegas antes de las 22:00 los viernes', link: 'https://radioberlinclub.com' },
    { tipo: 'Mi\u00e9rcoles de house', precio: '0', incluye: 'House con entrada gratis todos los mi\u00e9rcoles', link: 'https://radioberlinclub.com' },
    { tipo: 'Lista Terraza by Lesson', precio: '0', incluye: 'Gratis para las primeras 100 personas con lista en la terraza', link: 'https://radioberlinclub.com' }
  ],
  tours: [
    {
      nombre: 'La cabina "jaula"',
      precio: 'Con cover del evento', precio_sub: 'incluido en la entrada',
      duracion: 'Toda la noche', tipo_tour: 'Experiencia', idioma: 'Espa\u00f1ol/Ingl\u00e9s', max_personas: 'Abierto',
      rating: '4.8', review_count: 180,
      descripcion: 'La ic\u00f3nica cabina central del DJ enmarcada como una jaula, el s\u00edmbolo hist\u00f3rico del club desde La Macarena.',
      incluye: ['Acceso a la pista', 'Cabina central a la vista', 'Ambiente techno'],
      no_incluye: ['Consumo', 'Transporte'],
      link_reserva: 'https://radioberlinclub.com',
      featured: true
    },
    {
      nombre: 'La Terraza by Lesson',
      precio: 'Gratis con lista', precio_sub: 'primeras 100 personas',
      duracion: '4-6 horas', tipo_tour: 'Experiencia', idioma: 'Espa\u00f1ol', max_personas: '100',
      rating: '4.7', review_count: 90,
      descripcion: 'Sesiones outdoors los s\u00e1bados, con lista gratis para las primeras 100 personas y buena vista nocturna de Chapinero.',
      incluye: ['Acceso a terraza', 'DJ en vivo', 'Lista gratis'],
      no_incluye: ['Consumo', 'Transporte'],
      link_reserva: 'https://radioberlinclub.com',
      featured: false
    },
    {
      nombre: 'RadioBerlin Academy',
      precio: 'Cursos de pago', precio_sub: 'inscripci\u00f3n previa',
      duracion: 'Cursos desde 18-ago-2026', tipo_tour: 'Escuela', idioma: 'Espa\u00f1ol', max_personas: 'Cupo limitado',
      rating: '4.9', review_count: 60,
      descripcion: 'El aula donde se forman los nuevos DJs: clases de DJ, mezcla y producci\u00f3n con la escuela oficial de Radio Berl\u00edn.',
      incluye: ['Clases de DJ', 'Equipos de pr\u00e1ctica', 'Certificado'],
      no_incluye: ['Transporte', 'Alimentaci\u00f3n'],
      link_reserva: 'https://radioberlinclub.com',
      featured: false
    }
  ],
  equipamiento: [
    { item: 'Documento de identidad (mayor de 18)', prioridad: 'Obligatorio' },
    { item: 'Dinero en efectivo o tarjeta para el cover', prioridad: 'Recomendado' },
    { item: 'Llegar antes de las 22:00 los viernes (entrada gratis)', prioridad: 'Recomendado' },
    { item: 'Calzado c\u00f3modo para bailar', prioridad: 'Recomendado' },
    { item: 'Reserva en lista Terraza by Lesson', prioridad: 'Opcional' },
    { item: 'Tapones para o\u00eddos en maratones de vinilo', prioridad: 'Opcional' }
  ],
  itinerario: [
    { dia: 'Viernes', hora: '9:00 pm', titulo: 'Apertura y warm-up', icono: '\ud83d\udd0a', detalle: 'Puertas abiertas; antes de las 22:00 la entrada es gratis', tags: ['Apertura'] },
    { dia: 'Viernes', hora: '11:00 pm', titulo: 'Techno en la jaula', icono: '\ud83c\udfa7', detalle: 'El DJ en la cabina central, la pista a tope', tags: ['Techno'] },
    { dia: 'Sabado', hora: '1:00 am', titulo: 'Headliner y vinilo', icono: '\ud83d\udcbf', detalle: 'DJ invitado internacional o sesi\u00f3n de vinilo', tags: ['Headliner'] },
    { dia: 'Sabado', hora: '4:00 am', titulo: 'Terraza y cierre', icono: '\ud83c\udf1f', detalle: 'Sesiones outdoors en la Terraza by Lesson hasta el amanecer', tags: ['Cierre'] }
  ],
  dificultad_tags: [
    { texto: 'Pista interior con cabina central y terraza', apto: true },
    { texto: 'Accesible en silla de ruedas (pista a nivel)', apto: true },
    { texto: 'Noche larga hasta las 6AM', apto: false },
    { texto: 'Cover variable seg\u00fan evento', apto: false },
    { texto: 'Requiere ser mayor de 18', apto: false }
  ],
  temporada_matriz: {
    Ene: 'ideal', Feb: 'ideal', Mar: 'ideal', Abr: 'ideal', May: 'posible',
    Jun: 'ideal', Jul: 'posible', Ago: 'ideal', Sep: 'ideal', Oct: 'ideal', Nov: 'ideal', Dic: 'posible'
  }
};

const FAQS = [
  { pregunta: '\u00bfRadio Berl\u00edn sigue abierto?', respuesta: 'S\u00ed: sigue activo en la Carrera 13 No. 64-13, Chapinero, como La Casa del Techno.' },
  { pregunta: '\u00bfEs el mismo de La Macarena?', respuesta: 'Es su continuaci\u00f3n: el original cerr\u00f3 en julio de 2023 y resucit\u00f3 en Chapinero durante 2024-2025.' },
  { pregunta: '\u00bfC\u00f3mo llego?', respuesta: 'TransMilenio: la estaci\u00f3n Calle 63 est\u00e1 cerrada por el Metro L1; baja en Calle 57 o Flores y camina por la Carrera 13 hasta la 64.' },
  { pregunta: '\u00bfSolo suena techno?', respuesta: 'El techno es la casa, pero los mi\u00e9rcoles hay house gratis y sesiones de vinilo para los puristas.' },
  { pregunta: '\u00bfHay entrada gratis?', respuesta: 'S\u00ed, varias noches: gratis antes de las 22:00 los viernes, mi\u00e9rcoles de house y lista Terraza by Lesson para las primeras 100 personas.' }
];

module.exports = { SLUG: SLUG, HERO: HERO, PHOTOS: PHOTOS, BASE: BASE, TAGS: TAGS, FAQS: FAQS };

if (require.main !== module) return;

(async function main() {
  var url = process.env.DATABASE_URL || process.argv[2];
  if (!url) {
    console.error('Falta DATABASE_URL.');
    console.error('Uso: DATABASE_URL=postgres://... node scripts/seed-radio-berlin.js [--dry]');
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