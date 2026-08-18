// scripts/seed-quiebracanto.js
// Crea (o actualiza) la pagina dinamica quiebracanto.html con los datos del
// legendario bar de salsa Quiebracanto (La Candelaria, Bogota), siguiendo el
// patron de scripts/seed-gate-club.js (categoria sitio, upsert completo).
//
// Uso:
//   DATABASE_URL=postgres://... node scripts/seed-quiebracanto.js --dry
//   DATABASE_URL=postgres://... node scripts/seed-quiebracanto.js

var neon = null;
function getNeon() {
  if (!neon) neon = require('@neondatabase/serverless').neon;
  return neon;
}

const SLUG = 'quiebracanto';
const HERO = 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fa/La_Macarena_panorama_norte_sur.JPG/960px-La_Macarena_panorama_norte_sur.JPG';

const PHOTOS = [
  { url: HERO, caption: 'Panoramica del centro de Bogota desde La Macarena, cerca del barrio de Quiebracanto' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f8/Bogot%C3%A1_Chapinero_de_noche.JPG/960px-Bogot%C3%A1_Chapinero_de_noche.JPG', caption: 'Bogota de noche, cuando la rumba salsera toma la ciudad' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Palacio_Li%C3%A9vano%2C_Bogot%C3%A1.jpg/960px-Palacio_Li%C3%A9vano%2C_Bogot%C3%A1.jpg', caption: 'Palacio Lievano, icono del centro historico' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Plaza_de_Bol%C3%ADvar%2C_Bogot%C3%A1.jpg/1200px-Plaza_de_Bol%C3%ADvar%2C_Bogot%C3%A1.jpg', caption: 'La Plaza de Bolivar, corazon del centro' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/Calle_empedrada_La_Candelaria.jpg/800px-Calle_empedrada_La_Candelaria.jpg', caption: 'Las calles empedradas del centro historico' }
];

const BASE = {
  slug: SLUG,
  nombre: 'Quiebracanto',
  categoria_slug: 'sitio',
  lead: 'El templo de la salsa de Bogota: fundado en 1979, vive la noche en una casa del centro historico con orquestas en vivo los fines de semana.',
  descripcion: 'Quiebracanto (Carrera 5 #17-76, La Candelaria, Bogota, coordenadas 4.6030, -74.0715) es uno de los bares de salsa mas legendarios de Colombia. Fundado en octubre de 1979 en el barrio Las Aguas por un grupo de estudiantes y amigos encabezados por Alvaro Manosalva, nacio como un local pequeno de ambiente universitario donde sonaba salsa y se vendia cerveza barata. Con los anos, la rumba salsera del Quiebra se volvio un ritual del centro de Bogota.\n\nEn 1982, la sede se traslado a la carrera quinta entre calles 17 y 18, la ubicacion actual, y el lugar se convirtio en un punto de tertulia, musica y baile. La historia del Quiebra incluye otras sedes: una en la septima entre calles 45 y 46 (semisotano underground con excelente sonido), otra en La Macarena (carrera quinta con calle 29) y mas tarde en El Lago y Cedritos. En 1993, la familia Manosalva llevo el mismo espiritu a Cartagena, en el edificio Puerta del Sol de Getsemani, donde el bar sigue vivo.\n\nLo que hace especial a Quiebracanto no son las pantallas ni las luces: es la musica. La seleccion de salsa vieja que se escucha aqui es la que se baila en todo el pais, de costa a costa, de Buenaventura a Cali, Bogota, Cartagena y Barranquilla. Los DJs del bar se han criado dentro de la casa y son cultores de esta musica, y los fines de semana las orquestas en vivo toman la tarima para que la pista de baile hierva.\n\nLa pista de Quiebracanto ha visto a generaciones de bailadores: desde los parroquianos de los anos ochenta hasta los jovenes que hoy redescubren la salsa. Es un museo vivo de la rumba, un lugar donde se siente que el tiempo no pasa. En noches de fin de semana, el bar se llena de gente que llega a bailar en serio, con un cover que como referencia ha estado entre 5.000 y 10.000 pesos en presentaciones de orquesta.\n\nEl publico es una mezcla deliciosa: desde cartageneros asiduos hasta viajeros que llegan buscando bailar salsa en un templo de verdad. Si no sabes bailar, es igual: la atmosfera te atrapa, y entre cerveza y cubalibre cualquiera se anima a dar sus primeros pasos al ritmo de la musica caribe\u00f1a.\n\nComo llegar es facil: la Carrera 5 #17-76 esta en el corazon del centro historico, a pocas cuadras de la estacion Las Aguas del TransMilenio (troncal Karakol). Desde la Plaza de Bolivar se camina por la carrera quinta hacia el norte unos quince minutos. En taxi o aplicacion se pide Quiebracanto, carrera quinta con calle 17.',
  highlight: 'Desde 1979, el bar de salsa que le da nombre a la rumba del centro: orquestas en vivo, salsa vieja de costa a costa y una pista que no perdona',
  ciudad: 'Bogota',
  region: 'Cundinamarca',
  barrio: 'La Candelaria',
  lat: 4.6030,
  lng: -74.0715,
  whatsapp: '',
  telefono: '',
  email: '',
  web: 'https://www.quiebracanto.com',
  instagram: '',
  precio_desde: 'Cover de orquesta entre $5.000 y $10.000 (referencia); cerveza y cubalibres en barra',
  horario: 'Jueves 18:00-3:00; viernes y sabados 16:00-3:00 (referencia)',
  emoji: '\ud83d\udc83',
  hero_bg: '#9f1239',
  foto_hero: HERO,
  tipo: 'Salsa bar \u00b7 Orquestas en vivo \u00b7 Historia de la rumba',
  capacidad: '',
  como_llegar: 'TransMilenio: estacion Las Aguas (troncal Karakol) y caminar por la carrera quinta hacia el norte hasta la calle 17. Desde la Plaza de Bolivar, quince minutos caminando. Taxi o app: Carrera 5 #17-76, La Candelaria.',
  status: 'published',
  destacado: true
};

const TAGS = {
  tipo_actividad: 'Salsa bar',
  dificultad: 'Facil',
  dificultad_desc: 'Bar con pista de baile a nivel; ideal para bailar. Requiere ser mayor de 18 anos. Las noches de fin de semana son concurridas.',
  duracion: '3-6 horas',
  altitud: '2600',
  temporada: ['Todo el ano', 'Fines de semana con orquesta', 'Festivos y eventos especiales'],
  precio_entrada: 'Cover de orquesta entre 5.000 y 10.000 pesos (referencia); el consumo se paga por separado en la barra.',
  distancia: 'Carrera 5 #17-76, La Candelaria, Bogota. A pocas cuadras de la estacion Las Aguas del TransMilenio.',
  como_llegar: BASE.como_llegar,
  permisos: 'Mayor de 18 anos con documento de identidad valido.',
  temporada_nota: 'Los fines de semana Quiebracanto ofrece orquesta en vivo y el cover se ajusta segun la presentacion. Las noches de jueves tambien hay ambiente salsero.',
  fauna_flora: JSON.stringify([
    { emoji: '\ud83c\udfb5', nombre: 'Salsa de verdad', hecho: 'Seleccion que va de costa a costa: de Cali a Cartagena, de Buenaventura a Barranquilla' },
    { emoji: '\ud83d\udc83', nombre: 'La pista', hecho: 'Una pista de baile que ha visto a generaciones de bailadores desde 1979' },
    { emoji: '\ud83c\udfa4', nombre: 'Orquestas en vivo', hecho: 'Fines de semana con banda y tarima' },
    { emoji: '\ud83c\udfdb\ufe0f', nombre: 'Historia viva', hecho: 'Fundado en 1979, hoy es un museo vivo de la rumba bogotana' }
  ]),
  secretos: JSON.stringify([
    { icono: '\ud83d\udc83', titulo: 'La pista no perdona', texto: 'Viernes y sabados la pista se llena de bailadores en serio: llega con ganas de baile o siembrate a mirar los mejores pasos de la ciudad.', tag: 'Imperdible', tag_color: 'gold' },
    { icono: '\ud83c\udfa4', titulo: 'Noches de orquesta', texto: 'Los fines de semana la tarima recibe orquestas en vivo; el cover de referencia ronda los 5.000-10.000 pesos.', tag: 'Eventos', tag_color: 'blue' },
    { icono: '\ud83c\udfb5', titulo: 'Salsa de coleccion', texto: 'Los DJs de la casa son cultores de la salsa vieja: pide un clasico y escucha como suena en serio.', tag: 'Musica', tag_color: 'green' },
    { icono: '\ud83c\udfdb\ufe0f', titulo: 'Historia del Quiebra', texto: 'Desde 1979: el bar nacio en Las Aguas y en 1982 se mudo a la carrera quinta, donde sigue la rumba.', tag: 'Historia', tag_color: 'brown' }
  ]),
  regulaciones: 'Mayor de 18 anos con documento de identidad valido. Cover variable en noches de orquesta. No se permite el ingreso de alimentos ni bebidas externas. Se reserva el derecho de admision.',
  checklist_tip: 'Llega antes de la orquesta si quieres mesa: las noches de fin de semana el bar se llena y la pista no descansa.',
  entradas: [
    { tipo: 'Noche regular', precio: 'sin cover', incluye: 'Acceso a la barra y la pista en noches sin orquesta (referencia)', link: 'https://www.quiebracanto.com' },
    { tipo: 'Noche de orquesta', precio: '5.000-10.000', incluye: 'Acceso con banda en vivo (referencia)', link: 'https://www.quiebracanto.com' }
  ],
  tours: [
    {
      nombre: 'Noche de salsa',
      precio: 'Cover de orquesta', precio_sub: '5.000-10.000 referencia',
      duracion: '3-6 horas', tipo_tour: 'Experiencia', idioma: 'Espanol', max_personas: 'Abierto',
      rating: '4.7', review_count: 22,
      descripcion: 'La experiencia Quiebracanto: salsa vieja, pista de baile y orquesta en vivo los fines de semana.',
      incluye: ['Acceso al bar', 'Orquesta en vivo (fin de semana)', 'Pista de baile'],
      no_incluye: ['Bebidas', 'Transporte'],
      link_reserva: 'https://www.quiebracanto.com',
      featured: true
    },
    {
      nombre: 'Ruta salsera del centro',
      precio: 'Variable', precio_sub: 'segun plan',
      duracion: '3-4 horas', tipo_tour: 'Ruta', idioma: 'Espanol', max_personas: 'Grupos',
      rating: '4.6', review_count: 10,
      descripcion: 'Un recorrido por los bares de musica del centro que tiene a Quiebracanto como parada obligada.',
      incluye: ['Itinerario por el centro', 'Parada en el bar', 'Guia del grupo'],
      no_incluye: ['Bebidas', 'Transporte'],
      link_reserva: 'https://www.quiebracanto.com',
      featured: false
    },
    {
      nombre: 'Historia del Quiebra',
      precio: 'Sin costo extra', precio_sub: 'con consumo',
      duracion: '1 hora', tipo_tour: 'Conversatorio', idioma: 'Espanol', max_personas: 'Abierto',
      rating: '4.5', review_count: 7,
      descripcion: 'Charla con los cultores del bar sobre la historia de la salsa en Bogota desde 1979.',
      incluye: ['Historias del bar', 'Contexto de la salsa bogotana', 'Ambiente del lugar'],
      no_incluye: ['Bebidas', 'Transporte'],
      link_reserva: 'https://www.quiebracanto.com',
      featured: false
    }
  ],
  equipamiento: [
    { item: 'Documento de identidad (mayor de 18)', prioridad: 'Obligatorio' },
    { item: 'Efectivo o tarjeta para el consumo y el cover', prioridad: 'Recomendado' },
    { item: 'Calzado comodo para bailar', prioridad: 'Recomendado' },
    { item: 'Abrigo para la noche en el centro', prioridad: 'Recomendado' }
  ],
  itinerario: [
    { dia: 'Jueves', hora: '8:00 pm', titulo: 'Apertura salsera', icono: '\ud83c\udfb5', detalle: 'Salsa desde la barra, ambiente para empezar', tags: ['Salsa'] },
    { dia: 'Viernes', hora: '9:00 pm', titulo: 'La orquesta suena', icono: '\ud83c\udfa4', detalle: 'Banda en vivo, cover de referencia 5.000-10.000', tags: ['Orquesta'] },
    { dia: 'Viernes', hora: '11:00 pm', titulo: 'Pista llena', icono: '\ud83d\udc83', detalle: 'Los mejores bailadores toman la pista', tags: ['Baile'] },
    { dia: 'Sabado', hora: '10:00 pm', titulo: 'La noche grande', icono: '\ud83c\udf1f', detalle: 'Rumba salsera hasta la madrugada', tags: ['Rumba'] }
  ],
  dificultad_tags: [
    { texto: 'Bar con pista de baile a nivel', apto: true },
    { texto: 'Zona centro historico caminable', apto: true },
    { texto: 'Noches de fin de semana muy concurridas', apto: false },
    { texto: 'Cover en noches de orquesta', apto: false },
    { texto: 'Requiere ser mayor de 18', apto: false }
  ],
  temporada_matriz: {
    Ene: 'ideal', Feb: 'ideal', Mar: 'ideal', Abr: 'posible', May: 'posible',
    Jun: 'ideal', Jul: 'ideal', Ago: 'ideal', Sep: 'posible', Oct: 'posible', Nov: 'posible', Dic: 'ideal'
  }
};

const FAQS = [
  { pregunta: 'Que es Quiebracanto?', respuesta: 'Uno de los bares de salsa mas legendarios de Bogota, fundado en 1979 y ubicado en la Carrera 5 #17-76, La Candelaria.' },
  { pregunta: 'Que musica ponen?', respuesta: 'Salsa vieja de costa a costa, con DJs cultores de la musica y orquestas en vivo los fines de semana.' },
  { pregunta: 'Que horario maneja?', respuesta: 'Referencia: jueves de 18:00 a 3:00 y viernes y sabados de 16:00 a 3:00. Confirma antes de ir.' },
  { pregunta: 'Cuanto cuesta la entrada?', respuesta: 'Sin cover en noches regulares; en noches de orquesta el cover de referencia ronda los 5.000-10.000 pesos.' },
  { pregunta: 'Cual es la edad minima?', respuesta: 'Mayor de 18 anos con documento de identidad valido.' }
];

module.exports = { SLUG: SLUG, HERO: HERO, PHOTOS: PHOTOS, BASE: BASE, TAGS: TAGS, FAQS: FAQS };

if (require.main !== module) return;

(async function main() {
  var url = process.env.DATABASE_URL || process.argv[2];
  if (!url) {
    console.error('Falta DATABASE_URL.');
    console.error('Uso: DATABASE_URL=postgres://... node scripts/seed-quiebracanto.js [--dry]');
    process.exit(1);
  }

  var sql = getNeon()(url);
  var dry = process.argv.indexOf('--dry') !== -1;

  var existing = await sql('SELECT id, slug FROM destinos WHERE slug=$1 LIMIT 1', [SLUG]);

  if (dry) {
    console.log('[dry-run] ' + (existing.length ? 'UPDATE (fila existe)' : 'INSERT (nueva fila)') + ' para slug=' + SLUG);
    console.log('[dry-run] base:\n' + JSON.stringify(BASE, null, 2));
    console.log('[dry-run] tags (' + Object.keys(TAGS).length + ' claves):\n' + JSON.stringify(TAGS, null, 2));
    console.log('[dry-run] fotos galeria: ' + PHOTOS.length + ' | faqs: ' + FAQS.length);
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
  console.log('Verifica en: https://exploraco.co/' + SLUG + '.html (revisa sitemap y /api/destinos).');
})().catch(function(err) {
  console.error('ERROR:', err.message);
  process.exit(1);
});