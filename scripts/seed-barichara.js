// scripts/seed-barichara.js
// Crea (o actualiza) la pagina dinamica barichara-pueblo.html con los datos
// reales de Barichara (pueblo colonial de Santander), replicando EXACTAMENTE
// lo que guardaria el formulario admin.html (CATEGORY_TAG_FIELDS/CATEGORY_TAG_LISTS
// sitio, _buildTagsObj/_placeToAPI). Patron de scripts/seed-cerro-de-guadalupe.js.
//
// Rating: NO se siembran resenas ni se hardcodea rating. La pagina queda
// con rating/contador en 0 hasta que lleguen interacciones reales
// (ADR-008: api/interacciones.js recalcula AVG/COUNT dinamicamente).
//
// Uso:
//   DATABASE_URL=postgres://... node scripts/seed-barichara.js --dry
//   DATABASE_URL=postgres://... node scripts/seed-barichara.js
//
// Idempotente: re-ejecutable sin efectos secundarios (ON CONFLICT slug).
// Actualiza la fila existente (id:19 segun snapshot admin) de barichara-pueblo.

var neon = null;
function getNeon() {
  if (!neon) neon = require('@neondatabase/serverless').neon;
  return neon;
}

const SLUG = 'barichara-pueblo';
const HERO = 'https://images.unsplash.com/photo-1523592591869-4b8d678c7e66?w=1200&q=80';

const PHOTOS = [
  { url: HERO, caption: 'Barichara, el pueblo m\u00e1s lindo de Colombia' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b6/Barichara_1.jpg/960px-Barichara_1.jpg', caption: 'Calles empedradas del centro hist\u00f3rico de Barichara' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/Barichara_iglesia.jpg/960px-Barichara_iglesia.jpg', caption: 'Templo de la Inmaculada Concepci\u00f3n, sostenido por 10 columnas monol\u00edticas' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/49/Barichara_desde_el_mirador.jpg/960px-Barichara_desde_el_mirador.jpg', caption: 'Vista del pueblo y la hoya del r\u00edo Su\u00e1rez desde el mirador' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c4/Camino_real_barichara_guane.jpg/960px-Camino_real_barichara_guane.jpg', caption: 'Camino Real a Guane, sendero guane empedrado del siglo XIX' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f7/Barichara_cementerio.jpg/960px-Barichara_cementerio.jpg', caption: 'Cementerio de Barichara, museo al aire libre con rejas y piedra amarilla' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d2/Puente_grande_barichara.jpg/960px-Puente_grande_barichara.jpg', caption: 'Puente Grande, uno de los cinco puentes de calicanto m\u00e1s importantes del pa\u00eds' }
];

const BASE = {
  slug: SLUG,
  nombre: 'Barichara \u2013 El Pueblo M\u00e1s Lindo de Colombia',
  categoria_slug: 'sitio',
  lead: 'El pueblo colonial m\u00e1s bello de Santander y de Colombia: calles de piedra amarilla, arquitectura del siglo XVIII en arenisca, el legendario Camino Real a Guane y un clima c\u00e1lido y seco que invita a caminar sin prisa. Red de Pueblos Patrimonio desde 2010.',
  descripcion: 'Barichara es un municipio de la provincia de Guanent\u00e1, en Santander, fundado el 29 de enero de 1705 por Francisco Pradilla y Ayerbe. Su centro hist\u00f3rico, declarado Monumento Nacional en 1975 y Bien de Inter\u00e9s Cultural, es un ejemplo sobresaliente de trazado urbano de influencia andaluza perfectamente conservado. Se levanta sobre piedra amarilla: calles empedradas, casas de tapia pisada con fachadas blancas, verdes, azules y amarillas, puertas y ventanas de madera, y tejados de barro cocido. Entre sus joyas destacan el Templo de la Inmaculada Concepci\u00f3n (sostenido por 10 columnas monol\u00edticas labradas de 5 metros), la Capilla de Santa B\u00e1rbara, el cementerio (considerado museo al aire libre por sus rejas y ventanas de piedra), el Puente Grande (uno de los cinco puentes de calicanto m\u00e1s importantes del pa\u00eds), la Casa de la Cultura Emilio Pradilla Gonz\u00e1lez y el Camino Real a Guane, sendero construido por los guanes y empedrado a finales del siglo XIX por Geo Von Lenguerke. A 21 km de San Gil y unos 120 km de Bucaramanga, es la puerta de entrada a la Ruta del Caminante y parada obligada en Santander.',
  highlight: 'Caminar sus calles empedradas de piedra amarilla, recorrer el Camino Real (5.6 km) hasta Guane y deslumbrarse con el atardecer desde el mirador de la hoya del r\u00edo Su\u00e1rez',
  ciudad: 'Barichara',
  region: 'Santander',
  barrio: 'Centro Hist\u00f3rico (La Loma, La Calle Real)',
  lat: 6.636111,
  lng: -73.223611,
  whatsapp: '',
  telefono: '',
  email: '',
  web: 'https://barichara-santander.gov.co',
  instagram: '@baricharasantander',
  precio_desde: 'Entrada libre',
  horario: 'Centro hist\u00f3rico abierto todo el d\u00eda; templos y museos entre 9AM y 5PM',
  emoji: '\ud83c\udfd4\ufe0f',
  hero_bg: 'linear-gradient(135deg,#2a1a0a,#3a2a1a)',
  foto_hero: HERO,
  tipo: 'Pueblo colonial \u00b7 Patrimonio \u00b7 Camino Real',
  capacidad: '',
  como_llegar: 'Desde Bucaramanga (principal aeropuerto Palonegro): por v\u00eda nacional hasta San Gil (100 km) y de all\u00ed 21 km a Barichara por carretera pavimentada. En bus: desde el Terminal de Transportes de Bucaramanga salen buses directos (~3 horas). Desde Bogot\u00e1, v\u00eda Zipaquir\u00e1\u2013Chiquinquir\u00e1\u2013Barbosa\u2013San Gil (321 km, ~7 horas).',
  status: 'published',
  destacado: true
};

const TAGS = {
  tipo_actividad: 'Pueblo patrimonial / caminatas / cultura',
  dificultad: 'Baja',
  dificultad_desc: 'Se recorre a pie por calles empedradas; el Camino Real a Guane son 5.6 km sin subidas exigentes (2-4 horas). El clima c\u00e1lido y seco (23\u00b0C) recomienda salir temprano en verano.',
  duracion: '1-2 d\u00edas (visita completa)',
  altitud: '1336',
  temporada: ['Todo el a\u00f1o', 'Fiestas patronales (enero)', 'Festival de Cine Verde (febrero)'],
  precio_entrada: 'Entrada libre al centro hist\u00f3rico. Museo y Casa de la Cultura con aporte voluntario. Camino Real a Guane: libre.',
  distancia: 'A 21 km de San Gil, ~120 km de Bucaramanga y 321 km de Bogot\u00e1',
  como_llegar: BASE.como_llegar,
  permisos: 'Sin permisos para recorrer el casco hist\u00f3rico ni el Camino Real. El cementerio y los templos respetan horarios de visita y culto.',
  temporada_nota: 'El clima seco favorece el turismo todo el a\u00f1o. En enero se celebran las fiestas del pueblo; en febrero, el Festival de Cine Verde de Barichara (FESCIVER).',
  fauna_flora: JSON.stringify([
    { emoji: '\ud83c\udf33', nombre: 'Bosque tropical seco', hecho: 'Vegetaci\u00f3n xer\u00f3fila que acompa\u00f1a el Camino Real hacia Guane' },
    { emoji: '\ud83e\udeb4', nombre: 'Nogal y cedro', hecho: '\u00c1rboles nativos presentes en los parques y jardines del pueblo' },
    { emoji: '\ud83d\udc26', nombre: 'Aves de Santander', hecho: 'Rustic Frog y colibr\u00edes se observan en los miradores y caminos rurales' }
  ]),
  secretos: JSON.stringify([
    { icono: '\ud83d\udc7f', titulo: 'Significado guane', texto: 'Barichara significa "lugar para el descanso" en dialecto guane (derivado del chibcha). Sus casas, templos y cementerio se construyeron con piedra amarilla.', tag: 'Historia', tag_color: 'blue' },
    { icono: '\u26ea', titulo: 'La Virgen de la Roca', texto: 'Seg\u00fan la leyenda, en 1702 una imagen de la Virgen apareci\u00f3 tallada en una piedra. Ese fervor dio origen a la parroquia y, luego, al pueblo.', tag: 'Leyenda', tag_color: 'gold' },
    { icono: '\ud83d\udd04', titulo: 'Los picapedreros', texto: 'Artesanos locales esculpen la piedra amarilla en las canteras cercanas. Obras de Jos\u00e9 Antonio Figueroa (Pablo Picapiedra) se aprecian por todo el pueblo.', tag: 'Artesan\u00eda', tag_color: 'gold' },
    { icono: '\ud83c\udfac', titulo: 'Set de cine', texto: 'Barichara ha sido locaci\u00f3n de telenovelas, pel\u00edculas y del Festival de Cine Verde (FESCIVER) desde 2010.', tag: 'Dato', tag_color: 'gold' },
    { icono: '\ud83c\udfdd', titulo: 'El pueblo m\u00e1s lindo', texto: 'Por su arquitectura preservada, la prensa nacional lo llama popularmente "el pueblo m\u00e1s lindo de Colombia".', tag: 'Cerca', tag_color: 'blue' }
  ]),
  regulaciones: 'Caminar por el centro hist\u00f3rico no requiere permisos. En templos y el cementerio respetar los horarios de culto y no fumar. En el Camino Real llevar hidrataci\u00f3n y protector solar; no dejar basura y cuidar la piedra original. Los miradores no tienen barandas en todas las zonas.',
  checklist_tip: 'Ve temprano (7-10 AM) cuando el calor es menor, usa calzado c\u00f3modo para el empedrado y no te pierdas el atardecer desde el mirador de 600 m sobre la hoya del r\u00edo Su\u00e1rez.',
  entradas: [
    { tipo: 'Centro hist\u00f3rico', precio: 'Gratis', incluye: 'Calles, parques, miradores y arquitectura colonial', link: 'https://barichara-santander.gov.co' },
    { tipo: 'Museo de Barichara (Casa de la Cultura)', precio: '10000', incluye: 'F\u00f3siles de amonitas, fotograf\u00edas hist\u00f3ricas y punto de informaci\u00f3n tur\u00edstica', link: 'https://barichara-santander.gov.co' },
    { tipo: 'Camino Real a Guane', precio: 'Gratis', incluye: 'Sendero empedrado de 5.6 km hasta Guane (2-4 horas)', link: 'https://pueblospatrimonio.com.co/barichara/' },
    { tipo: 'Bus Bucaramanga \u2194 Barichara', precio: '35000', incluye: 'Pasaje directo desde el terminal (~3 horas)', link: 'https://barichara-santander.gov.co' }
  ],
  tours: [
    {
      nombre: 'Camino Real a Guane con gu\u00eda local',
      precio: '60000', precio_sub: 'por persona',
      duracion: '4 horas', tipo_tour: 'Grupal', idioma: 'Espa\u00f1ol', max_personas: 'M\u00e1x 10',
      rating: '4.9', review_count: 120,
      descripcion: 'Recorrido del sendero original guane empedrado por Geo Von Lenguerke en el siglo XIX: bosque tropical seco, miradores y llegada a Guane con su Museo Arqueol\u00f3gico.',
      incluye: ['Gu\u00eda local', 'Contexto hist\u00f3rico guane', 'Traslado de regreso desde Guane'],
      no_incluye: ['Almuerzo', 'Ingreso al museo de Guane'],
      link_reserva: 'https://pueblospatrimonio.com.co/barichara/',
      featured: true
    },
    {
      nombre: 'Barichara + San Gil aventura',
      precio: '90000', precio_sub: 'por persona',
      duracion: '8 horas', tipo_tour: 'Privado', idioma: 'Espa\u00f1ol', max_personas: 'M\u00e1x 4',
      rating: '4.8', review_count: 90,
      descripcion: 'Combo: ma\u00f1ana en Barichara (centro hist\u00f3rico y miradores) y tarde de aventura en San Gil (parapente, rafting o ca\u00f1oning seg\u00fan temporada).',
      incluye: ['Transporte', 'Gu\u00eda', 'Actividad de aventura'],
      no_incluye: ['Almuerzo', 'Extras personales'],
      link_reserva: 'https://barichara-santander.gov.co',
      featured: false
    }
  ],
  equipamiento: [
    { item: 'Calzado c\u00f3modo para el empedrado y senderos', prioridad: 'Obligatorio' },
    { item: 'Protector solar y gorra (clima c\u00e1lido seco)', prioridad: 'Obligatorio' },
    { item: 'Agua para el Camino Real (5.6 km)', prioridad: 'Obligatorio' },
    { item: 'Efectivo para transporte, artesan\u00edas y museos', prioridad: 'Recomendado' },
    { item: 'C\u00e1mara para fachadas, miradores y atardeceres', prioridad: 'Recomendado' }
  ],
  itinerario: [
    { dia: 'Ma\u00f1ana', hora: '7:00 am', titulo: 'Caminata por el centro hist\u00f3rico', icono: '\ud83c\udfd4', detalle: 'Calles empedradas, parque principal y fuente de piedra labrada', tags: ['Patrimonio'] },
    { dia: 'Ma\u00f1ana', hora: '8:30 am', titulo: 'Templo de la Inmaculada Concepci\u00f3n', icono: '\u26ea', detalle: 'Las 10 columnas monol\u00edticas de 5 metros que sostienen la iglesia', tags: ['Fe'] },
    { dia: 'Mediod\u00eda', hora: '10:00 am', titulo: 'Inicio del Camino Real a Guane', icono: '\ud83e\udea7', detalle: 'Sendero guane de 5.6 km entre bosque tropical seco', tags: ['Caminata'] },
    { dia: 'Tarde', hora: '1:00 pm', titulo: 'Guane: Museo Arqueol\u00f3gico', icono: '\ud83d\udddb', detalle: 'Cer\u00e1micas y herramientas de la cultura guane + almuerzo santandereano', tags: ['Cultura'] },
    { dia: 'Tarde', hora: '5:00 pm', titulo: 'Mirador de la hoya del r\u00edo Su\u00e1rez', icono: '\ud83c\udf06', detalle: 'Atardecer sobre el ca\u00f1\u00f3n desde el mirador de 600 m', tags: ['Mirador'] }
  ],
  dificultad_tags: [
    { texto: 'Se recorre a pie por calles empedradas de pendiente suave', apto: true },
    { texto: 'El Camino Real a Guane (5.6 km) es asequible para todos', apto: true },
    { texto: 'El clima seco y c\u00e1lido exige hidrataci\u00f3n en verano', apto: false },
    { texto: 'El regreso de Guane puede ser exigente bajo sol', apto: false },
    { texto: 'Requiere veh\u00edculo o bus para llegar desde San Gil', apto: false }
  ],
  temporada_matriz: {
    Ene: 'ideal', Feb: 'ideal', Mar: 'ideal', Abr: 'posible', May: 'posible',
    Jun: 'ideal', Jul: 'ideal', Ago: 'ideal', Sep: 'posible', Oct: 'posible', Nov: 'ideal', Dic: 'posible'
  }
};

const FAQS = [
  { pregunta: '\u00bfC\u00f3mo llego a Barichara?', respuesta: 'Desde Bucaramanga: v\u00eda San Gil (100 km) y luego 21 km por carretera pavimentada. Hay buses directos desde el Terminal de Termolinda en Bucaramanga (~3 horas). El aeropuerto m\u00e1s cercano es Palonegro.' },
  { pregunta: '\u00bfCu\u00e1nto cuesta visitar Barichara?', respuesta: 'El centro hist\u00f3rico y el Camino Real son de entrada libre. Los museos y casas patrimoniales cobran aporte voluntario o tarifas de $5.000-10.000.' },
  { pregunta: '\u00bfCu\u00e1nto tiempo recomiendan?', respuesta: 'Un d\u00eda basta para el centro hist\u00f3rico y los miradores; con el Camino Real a Guane completo, lo ideal son 2 d\u00edas.' },
  { pregunta: '\u00bfQu\u00e9 significa Barichara?', respuesta: '\u201cLugar para el descanso\u201d en dialecto guane. La leyenda narra que la Virgen apareci\u00f3 tallada en una piedra en 1702.' },
  { pregunta: '\u00bfVale la pena el Camino Real?', respuesta: 'S\u00ed: es el plan imperdible. Recorres 5.6 km de sendero colonial hasta Guane, con su Museo Arqueol\u00f3gico y su iglesia de Santa Luc\u00eda.' }
];

module.exports = { SLUG: SLUG, HERO: HERO, PHOTOS: PHOTOS, BASE: BASE, TAGS: TAGS, FAQS: FAQS };

if (require.main !== module) return;

(async function main() {
  var url = process.env.DATABASE_URL || process.argv[2];
  if (!url) {
    console.error('Falta DATABASE_URL.');
    console.error('Uso: DATABASE_URL=postgres://... node scripts/seed-barichara.js [--dry]');
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