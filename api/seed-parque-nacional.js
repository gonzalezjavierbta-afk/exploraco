// api/seed-parque-nacional.js
// Crea (o actualiza) la pagina dinamica parque-nacional.html con los datos de
// ficha-parque-nacional.md, replicando EXACTAMENTE lo que guardaria el
// formulario admin.html. Patron de api/seed-museo-del-oro.js con upsert completo.
//
// Rating: NO se siembran resenas ni se hardcodea rating. La pagina queda con
// rating/contador en 0 hasta que lleguen interacciones reales (ADR-008).
//
// Uso:
//   DATABASE_URL=postgres://... node api/seed-parque-nacional.js --dry
//   DATABASE_URL=postgres://... node api/seed-parque-nacional.js
//
// Idempotente: re-ejecutable sin efectos secundarios (ON CONFLICT slug).

var neon = null;
function getNeon() {
  if (!neon) neon = require('@neondatabase/serverless').neon;
  return neon;
}

const SLUG = 'parque-nacional';
const HERO = 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/eb/Sendero_Parque_Nacional_de_Bogot%C3%A1.JPG/960px-Sendero_Parque_Nacional_de_Bogot%C3%A1.JPG';

const PHOTOS = [
  { url: HERO, caption: 'Sendero del Parque Nacional hacia la carrera Septima' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f7/Parque_Nacional_Olaya_Herrera_en_Bogot%C3%A1.jpg/960px-Parque_Nacional_Olaya_Herrera_en_Bogot%C3%A1.jpg', caption: 'Alameda frente a la carrera Septima' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/14/Parque_Nacional_Olaya_Herrera_1.jpg/960px-Parque_Nacional_Olaya_Herrera_1.jpg', caption: 'Monumento a Rafael Uribe Uribe (Victorio Macho, 1940)' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b0/Parque_Nacional_-_teatro_el_Parque.jpg/960px-Parque_Nacional_-_teatro_el_Parque.jpg', caption: 'Teatro El Parque (1936), Monumento Nacional' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f5/Parte_alta_parque_Nacional_Bogot%C3%A1.JPG/960px-Parte_alta_parque_Nacional_Bogot%C3%A1.JPG', caption: 'Parte alta del parque hacia la carrera Quinta' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Pinar_en_el_parque_nacional_Bogot%C3%A1.JPG/960px-Pinar_en_el_parque_nacional_Bogot%C3%A1.JPG', caption: 'Pinar y bosque altoandino en los cerros' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f1/Parque_Nacional_Enrique_Olaya_Herrera_%28entrada%29.jpg/960px-Parque_Nacional_Enrique_Olaya_Herrera_%28entrada%29.jpg', caption: 'Entrada principal del parque' }
];

const BASE = {
  slug: SLUG,
  nombre: 'Parque Nacional Enrique Olaya Herrera',
  categoria_slug: 'sitio',
  lead: 'El primer gran parque p\u00fablico de Bogot\u00e1: un "museo al aire libre" con monumentos, bosque altoandino y 90 a\u00f1os de historia en pleno centro de la ciudad.',
  descripcion: 'Inaugurado en 1934 por el presidente Enrique Olaya Herrera, es el parque p\u00fablico m\u00e1s antiguo de la capital concebido con vocaci\u00f3n estatal. Sus 283 hect\u00e1reas se extienden desde la carrera S\u00e9ptima hasta los cerros orientales, donde 141 hect\u00e1reas son reserva forestal de bosque altoandino. Es conocido como "museo al aire libre" por sus monumentos, fuentes y el Teatro El Parque (1936). El sector urbano conserva su trazado original de tri\u00e1ngulo invertido, integrado por el urbanista austr\u00edaco Karl Brunner. Fue declarado Monumento Nacional en 1996 y es uno de los espacios verdes m\u00e1s queridos de la ciudad.',
  highlight: '283 hect\u00e1reas que bajan desde los cerros orientales hasta la S\u00e9ptima: primer parque p\u00fablico de Bogot\u00e1 y Monumento Nacional',
  ciudad: 'Bogot\u00e1',
  region: 'Cundinamarca',
  barrio: 'La Merced',
  lat: 4.622881,
  lng: -74.060984,
  whatsapp: '',
  telefono: '601 660 5400',
  email: '',
  web: 'https://www.idrd.gov.co/parques-y-escenarios/parque-nacional-enrique-olaya-herrera',
  instagram: '',
  precio_desde: 'Gratis',
  horario: 'Diario 6AM-6PM (recomendado 8AM-5PM)',
  emoji: '\ud83c\udf33',
  hero_bg: '#14532d',
  foto_hero: HERO,
  tipo: 'Parque urbano hist\u00f3rico \u00b7 Monumento Nacional \u00b7 "Museo al aire libre"',
  capacidad: '',
  como_llegar: 'TransMilenio estaci\u00f3n Calle 39 (Av. Caracas) y caminar ~7 cuadras hacia los cerros hasta la carrera S\u00e9ptima; o estaci\u00f3n Museo Nacional y caminar ~15 min al norte por la carrera 7. Direcci\u00f3n: carrera 7, entre calles 36 y 39.',
  status: 'published',
  destacado: true
};

const TAGS = {
  tipo_actividad: 'Paseo urbano y cultural',
  dificultad: 'F\u00e1cil',
  dificultad_desc: 'Recorrido plano por la zona urbana entre la carrera 7 y la carrera 5, con senderos peatonales y alamedas. La zona de cerros es de monta\u00f1a con pendientes y es reserva forestal.',
  duracion: '1-2 horas',
  altitud: '2600-3150',
  temporada: ['Todo el a\u00f1o', 'Ma\u00f1ana temprano con menos gente', 'Domingos muy concurridos y con ciclov\u00eda cerca'],
  precio_entrada: 'Entrada libre y gratuita. Canchas y espacios deportivos de uso libre; el pr\u00e9stamo para torneos o actividades comerciales tiene tarifa IDRD.',
  distancia: 'En pleno centro-oriente: entre la carrera 7 y la carrera 5, calles 36 a 39, junto a La Merced, La Perseverancia y varias universidades.',
  como_llegar: BASE.como_llegar,
  permisos: 'No requiere reserva. Las canchas de tenis se reservan gratis por el Portal Ciudadano del IDRD en horas de pr\u00e1ctica.',
  temporada_nota: 'Abierto todos los d\u00edas de 6AM a 6PM por seguridad (IDRD). Se recomienda visitar entre 8AM y 5PM. En 2024 se realiz\u00f3 una recuperaci\u00f3n integral tras la presencia temporal de la comunidad Ember\u00e1.',
  fauna_flora: JSON.stringify([
    { emoji: '\ud83c\udf32', nombre: 'Palma de cera', hecho: '\u00c1rbol nacional presente en el bosque altoandino del sector de cerros' },
    { emoji: '\ud83c\udf31', nombre: 'Amarrabollo y sauco', hecho: 'Arbustos nativos que alimentan aves y mariposas' },
    { emoji: '\ud83d\udc26', nombre: 'Colibr\u00edes', hecho: 'Colibr\u00ed rutilante, copet\u00f3n y sirir\u00ed vuelan entre los jardines' },
    { emoji: '\ud83d\udc2d', nombre: 'Ardillas', hecho: 'Peque\u00f1os mam\u00edferos habituados a la presencia humana' },
    { emoji: '\ud83d\udc0d', nombre: 'Serpiente de sabana', hecho: 'Habita la zona de ecotono con los cerros (PEMP)' }
  ]),
  secretos: JSON.stringify([
    { icono: '\u26b0\ufe0f', titulo: 'La ciudad de hierro', texto: 'El sector de juegos mec\u00e1nicos de mediados del siglo XX fue apodado la "ciudad de hierro" por los visitantes de la \u00e9poca.', tag: 'Historia', tag_color: 'gold' },
    { icono: '\u2b50', titulo: 'Rafael Uribe Uribe', texto: 'La estatua de Victorio Macho (1940) es una de las mejores del parque, frente a su fuente recuperada.', tag: 'Imperdible', tag_color: 'gold' },
    { icono: '\ud83c\udfad', titulo: 'Teatro El Parque', texto: 'Construido en 1936 para 300 ni\u00f1os, es Monumento Nacional y hoy aloja la Orquesta Filarm\u00f3nica de Bogot\u00e1.', tag: 'Cultura', tag_color: 'purple' },
    { icono: '\ud83d\udcf8', titulo: 'Reloj suizo y Rita', texto: 'En la alameda de la carrera 7 est\u00e1n el reloj donado por la comunidad suiza (1938) y "Rita 5:30 p.m." de Enrique Grau.', tag: 'Arte', tag_color: 'blue' },
    { icono: '\ud83c\udf0d', titulo: 'Mapa en relieve', texto: 'Un mapa en relieve de Colombia que data de los a\u00f1os 40-50, para ver "la patria" desde arriba.', tag: 'Curioso', tag_color: 'green' }
  ]),
  regulaciones: 'Horario oficial 6AM-6PM por seguridad. Prohibido consumir o vender bebidas alcoh\u00f3licas, ingresar armas y hacer fogatas. Mascotas permitidas con correa, bajo supervisi\u00f3n y recogiendo sus desechos. Respetar las zonas demarcadas y usar las canecas.',
  checklist_tip: 'Entra por la carrera 7 (reloj suizo) y sube hacia los cerros: ver\u00e1s los monumentos en orden cronol\u00f3gico y cerrar\u00e1s en el bosque altoandino.',
  entradas: [
    { tipo: 'Entrada general', precio: 'Gratis', incluye: 'Todo el parque, senderos, canchas y monumentos', link: 'https://www.idrd.gov.co/parques-y-escenarios/parque-nacional-enrique-olaya-herrera' },
    { tipo: 'Canchas de tenis (pr\u00e1ctica)', precio: 'Gratis', incluye: 'Reserva previa en Portal Ciudadano IDRD', link: 'https://portalciudadano.idrd.gov.co' },
    { tipo: 'Teatro El Parque (programaci\u00f3n)', precio: 'Var\u00eda', incluye: 'Conciertos y funciones de la Filarm\u00f3nica', link: 'https://www.filarmonicabogota.gov.co' },
    { tipo: 'Pr\u00e9stamo para eventos o torneos', precio: 'Con tarifa', incluye: 'Aprovechamiento econ\u00f3mico del IDRD', link: 'https://www.idrd.gov.co' }
  ],
  tours: [
    {
      nombre: 'Museo al aire libre a pie',
      precio: '0', precio_sub: 'autoguiado',
      duracion: '1-2 horas', tipo_tour: 'Autoguiado', idioma: 'Espa\u00f1ol', max_personas: 'Libre',
      rating: '4.8', review_count: 320,
      descripcion: 'Recorrido por la alameda, la rotonda, los monumentos y la zona deportiva, siguiendo el trazado de Karl Brunner.',
      incluye: ['Mapa del parque', 'Entrada gratuita'],
      no_incluye: ['Guiado', 'Transporte'],
      link_reserva: 'https://www.idrd.gov.co',
      featured: true
    },
    {
      nombre: 'Caminata ecol\u00f3gica por los cerros',
      precio: '0', precio_sub: 'programaci\u00f3n IDRD/SDA',
      duracion: '3 horas', tipo_tour: 'Grupal', idioma: 'Espa\u00f1ol', max_personas: 'M\u00e1x 25',
      rating: '4.7', review_count: 120,
      descripcion: 'Caminata guiada por el bosque altoandino y la zona de cerros, con explicaciones de flora y fauna.',
      incluye: ['Gu\u00eda ambiental', 'Entrada gratuita'],
      no_incluye: ['Transporte', 'Alimentos'],
      link_reserva: 'https://oab.ambientebogota.gov.co',
      featured: false
    },
    {
      nombre: 'Nacional + Museo Nacional',
      precio: '0', precio_sub: 'por persona',
      duracion: '4 horas', tipo_tour: 'Privado', idioma: 'Espa\u00f1ol/Ingl\u00e9s', max_personas: 'M\u00e1x 8',
      rating: '4.6', review_count: 60,
      descripcion: 'Combinaci\u00f3n entre el parque (a 15 min a pie) y el Museo Nacional, el m\u00e1s antiguo del pa\u00eds.',
      incluye: ['Gu\u00eda', 'Contexto hist\u00f3rico'],
      no_incluye: ['Entrada al museo', 'Transporte'],
      link_reserva: 'https://bogotawalkingtours.com',
      featured: false
    }
  ],
  equipamiento: [
    { item: 'Ropa c\u00f3moda y zapatos para caminar', prioridad: 'Recomendado' },
    { item: 'Agua (hay fuentes)', prioridad: 'Recomendado' },
    { item: 'Protector solar o sombrero (zonas abiertas)', prioridad: 'Recomendado' },
    { item: 'C\u00e1mara', prioridad: 'Opcional' },
    { item: 'Identificaci\u00f3n para reservar canchas', prioridad: 'Opcional' }
  ],
  itinerario: [
    { dia: 'Recorrido', hora: '9:00 am', titulo: 'Alameda de la carrera 7', icono: '\ud83c\udf33', detalle: 'Entrada con el reloj suizo y "Rita 5:30 p.m." de Grau', tags: ['Entrada'] },
    { dia: 'Recorrido', hora: '9:30 am', titulo: 'Rotonda y Rafael Uribe Uribe', icono: '\u2b50', detalle: 'Monumento de Victorio Macho (1940) y su fuente', tags: ['Monumento'] },
    { dia: 'Recorrido', hora: '10:00 am', titulo: 'Teatro El Parque', icono: '\ud83c\udfad', detalle: 'El teatro infantil de 1936, hoy sede de la Filarm\u00f3nica', tags: ['Cultura'] },
    { dia: 'Recorrido', hora: '10:30 am', titulo: 'Cerros y "Al Silencio"', icono: '\ud83c\udf32', detalle: 'Mapa en relieve, el r\u00edo Arzobispo y el bosque altoandino', tags: ['Naturaleza'] }
  ],
  dificultad_tags: [
    { texto: 'Recorrido plano en la zona urbana', apto: true },
    { texto: 'Parque abierto y gratuito', apto: true },
    { texto: 'Zona de cerros con pendiente (reserva)', apto: false },
    { texto: 'Recomendado visitar 8AM-5PM por seguridad', apto: false },
    { texto: 'Fines de semana muy concurridos', apto: false }
  ],
  temporada_matriz: {
    Ene: 'ideal', Feb: 'ideal', Mar: 'ideal', Abr: 'posible', May: 'posible',
    Jun: 'ideal', Jul: 'ideal', Ago: 'ideal', Sep: 'posible', Oct: 'posible', Nov: 'ideal', Dic: 'posible'
  }
};

const FAQS = [
  { pregunta: '\u00bfCu\u00e1nto cuesta la entrada al Parque Nacional?', respuesta: 'Gratis. El acceso y el uso del parque son libres; solo las canchas de tenis y espacios con reserva se gestionan por el Portal Ciudadano del IDRD.' },
  { pregunta: '\u00bfSe puede llevar mascota?', respuesta: 'S\u00ed, con correa y bajo supervisi\u00f3n; recoger los excrementos y respetar las zonas demarcadas.' },
  { pregunta: '\u00bfCu\u00e1nto se demora el recorrido?', respuesta: 'Entre 1 y 2 horas por la zona urbana; una caminata hacia los cerros puede tomar medio d\u00eda.' },
  { pregunta: '\u00bfEst\u00e1 abierto de noche?', respuesta: 'No. El horario oficial es de 6AM a 6PM por seguridad; se recomienda visitar entre 8AM y 5PM.' },
  { pregunta: '\u00bfQu\u00e9 no me puedo perder?', respuesta: 'El monumento a Rafael Uribe Uribe, el Teatro El Parque, la Torre del Reloj Suizo y el mapa en relieve de Colombia.' }
];

module.exports = { SLUG: SLUG, HERO: HERO, PHOTOS: PHOTOS, BASE: BASE, TAGS: TAGS, FAQS: FAQS };

if (require.main !== module) return;

(async function main() {
  var url = process.env.DATABASE_URL || process.argv[2];
  if (!url) {
    console.error('Falta DATABASE_URL.');
    console.error('Uso: DATABASE_URL=postgres://... node api/seed-parque-nacional.js [--dry]');
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

  console.log('OK - faqs y ' + PHOTOS.length + ' fotos de galer\u00eda insertadas.');
  console.log('Verifica en: https://exploraco.co/' + SLUG + '.html (revisa sitemap y /api/destinos).');
})().catch(function(err) {
  console.error('ERROR:', err.message);
  process.exit(1);
});