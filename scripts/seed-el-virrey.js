// scripts/seed-el-virrey.js
// Crea (o actualiza) la pagina dinamica el-virrey.html con los datos de
// ficha-el-virrey.md, replicando EXACTAMENTE lo que guardaria el formulario
// admin.html. Patron de scripts/seed-museo-del-oro.js con upsert completo.
//
// Rating: NO se siembran resenas ni se hardcodea rating. La pagina queda con
// rating/contador en 0 hasta que lleguen interacciones reales (ADR-008).
//
// Uso:
//   DATABASE_URL=postgres://... node scripts/seed-el-virrey.js --dry
//   DATABASE_URL=postgres://... node scripts/seed-el-virrey.js
//
// Idempotente: re-ejecutable sin efectos secundarios (ON CONFLICT slug).

var neon = null;
function getNeon() {
  if (!neon) neon = require('@neondatabase/serverless').neon;
  return neon;
}

const SLUG = 'el-virrey';
const HERO = 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/Canal_parque_El_virrey_5582.jpg/960px-Canal_parque_El_virrey_5582.jpg';

const PHOTOS = [
  { url: HERO, caption: 'El canal de la quebrada El Virrey cerca de la Autopista Norte' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/10/Escultura_Negret_El_Virrey.JPG/960px-Escultura_Negret_El_Virrey.JPG', caption: 'Escultura Gran Cascada de Edgar Negret' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/33/Sendero_en_el_parque_El_Virrey.JPG/960px-Sendero_en_el_parque_El_Virrey.JPG', caption: 'Sendero peatonal del corredor ecol\u00f3gico' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/39/Virrey%2C_%C3%A1rboles.JPG/960px-Virrey%2C_%C3%A1rboles.JPG', caption: 'Antiguos urapanes del recorrido' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/49/Quebrada_El_Virrey.JPG/960px-Quebrada_El_Virrey.JPG', caption: 'La quebrada que da nombre al parque' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3b/Fuente_parque_El_Virrey.JPG/960px-Fuente_parque_El_Virrey.JPG', caption: 'Fuente en la carrera 15 con calle 88' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/32/%C3%81rea_de_juegos_pque_El_Virrey_5640.jpg/960px-%C3%81rea_de_juegos_pque_El_Virrey_5640.jpg', caption: 'Zona infantil del parque' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b8/Bogot%C3%A1_-_Parte_alta_del_parque_El_Virrey.jpg/960px-Bogot%C3%A1_-_Parte_alta_del_parque_El_Virrey.jpg', caption: 'Parte alta del parque, cerca de la carrera 7' }
];

const BASE = {
  slug: SLUG,
  nombre: 'Parque El Virrey',
  categoria_slug: 'sitio',
  lead: 'Un pulm\u00f3n verde en el norte de Bogot\u00e1 donde una quebrada escondida sostiene un "zool\u00f3gico" urbano con m\u00e1s de 600 especies en plena ciudad.',
  descripcion: 'El parque lineal El Virrey es uno de los corredores ecol\u00f3gicos m\u00e1s emblem\u00e1ticos de Bogot\u00e1, construido a lo largo de la ronda de la quebrada El Virrey (r\u00edo Negro), que nace en los cerros orientales. Se extiende unos 1,7 km entre la Autopista Norte y la carrera S\u00e9ptima siguiendo el eje de la calle 88, con unas 10,4 hect\u00e1reas y m\u00e1s de 3.300 \u00e1rboles y arbustos. Es refugio de aves residentes y migratorias y espacio de recreaci\u00f3n pasiva, comparado con el Central Park de Nueva York. Forma parte del Sendero Ambiental Gran Chic\u00f3, que conecta con el Parque de la 93 y el humedal Chic\u00fa.',
  highlight: 'M\u00e1s de 600 especies identificadas en zona urbana, incluida la abeja andina cornuda, end\u00e9mica, y 5 especies de murci\u00e9lagos',
  ciudad: 'Bogot\u00e1',
  region: 'Cundinamarca',
  barrio: 'La Cabrera',
  lat: 4.67424,
  lng: -74.0563,
  whatsapp: '',
  telefono: '601 660 5400',
  email: '',
  web: '',
  instagram: '',
  precio_desde: 'Gratis',
  horario: 'Diario, se recomienda 6AM-6PM',
  emoji: '\ud83c\udf3f',
  hero_bg: '#166534',
  foto_hero: HERO,
  tipo: 'Parque lineal ecol\u00f3gico \u00b7 Corredor de biodiversidad \u00b7 Avistamiento de aves',
  capacidad: '',
  como_llegar: 'TransMilenio estaci\u00f3n El Virrey (Autopista Norte), en el extremo occidental del parque; o SITP por la carrera 15, 11 o 7 y bajar en la calle 87. Acceso por la calle 88, entre carrera 7 y Autopista Norte.',
  status: 'published',
  destacado: true
};

const TAGS = {
  tipo_actividad: 'Paseo ecol\u00f3gico y running',
  dificultad: 'F\u00e1cil',
  dificultad_desc: 'Corredor plano y ancho (~92 m), con senderos peatonales y ciclorrutas. Ideal para caminar, trotar o pasear en bicicleta; 3 circuitos de running suman unos 3,4 km.',
  duracion: '1-2 horas',
  altitud: '2600',
  temporada: ['Todo el a\u00f1o', 'Marzo-mayo y septiembre-noviembre: aves migratorias', 'Ma\u00f1ana y tarde con mejor luz para avistamiento'],
  precio_entrada: 'Entrada gratuita todo el a\u00f1o. Es un espacio de recreaci\u00f3n pasiva: prohibidas actividades de alto impacto (fallo del Consejo de Estado de 2006).',
  distancia: 'Al norte de Bogot\u00e1, en el barrio La Cabrera (Chapinero), entre la Autopista Norte y la carrera 7 sobre la calle 88; cerca del Parque de la 93.',
  como_llegar: BASE.como_llegar,
  permisos: 'No requiere reserva ni permiso. Est\u00e1 prohibido jugar f\u00fatbol y realizar eventos masivos por el fallo del Consejo de Estado (Sentencia 8201 de 2006).',
  temporada_nota: 'Abierto todo el a\u00f1o. Por seguridad se recomienda visitar entre 6AM y 6PM. En temporada migratoria (marzo-mayo y septiembre-noviembre) el corredor recibe gavilanes, t\u00e1ngaras y reinitas.',
  fauna_flora: JSON.stringify([
    { emoji: '\ud83d\udc26', nombre: 'Aves residentes y migratorias', hecho: '71 a 100+ especies: b\u00fahos, jilgueros, colibr\u00edes, t\u00e1ngaras y reinitas' },
    { emoji: '\ud83e\udda7', nombre: 'Murci\u00e9lagos', hecho: '5 especies, con refugios artificiales instalados por la EAAB' },
    { emoji: '\ud83d\udc1d', nombre: 'Abeja andina cornuda', hecho: 'Especie end\u00e9mica y representativa del parque' },
    { emoji: '\ud83e\udd8b', nombre: 'Mariposas y polinizadores', hecho: '20 tipos de mariposas, 10 clases de abejas y 4 lib\u00e9lulas' },
    { emoji: '\ud83c\udf33', nombre: 'Bosque urbano', hecho: 'M\u00e1s de 3.300 \u00e1rboles y arbustos; 16 jardineras de polinizadores con el Jard\u00edn Bot\u00e1nico' }
  ]),
  secretos: JSON.stringify([
    { icono: '\ud83d\udd2d', titulo: 'Totems con QR', texto: 'Gu\u00edas de biodiversidad con QR sobre murci\u00e9lagos, mariposas, aves y plantas, hechas por el Grupo Ecomunitario.', tag: 'Imperdible', tag_color: 'gold' },
    { icono: '\ud83c\udfa8', titulo: 'Arte urbano cient\u00edfico', texto: 'Grafitis de especies de la sabana en los muros que limitan con el parque.', tag: 'Arte', tag_color: 'purple' },
    { icono: '\ud83d\udc1d', titulo: 'Jardines de polinizadores', texto: 'Fucsias, lavandas y salvia sembradas para alimentar colibr\u00edes y abejas todo el a\u00f1o.', tag: 'Naturaleza', tag_color: 'green' },
    { icono: '\ud83d\udcf8', titulo: 'Negret a la vista', texto: 'La escultura "Gran Cascada" de Edgar Negret est\u00e1 en la Plazoleta de las Flores.', tag: 'Arte', tag_color: 'blue' },
    { icono: '\ud83d\ude89', titulo: 'CAI dentro del parque', texto: 'Hay un CAI de Polic\u00eda en el corredor, que refuerza la seguridad.', tag: 'Dato', tag_color: 'gray' }
  ]),
  regulaciones: 'Destino de recreaci\u00f3n pasiva: prohibido jugar f\u00fatbol y hacer actividades de alto impacto o eventos masivos (fallo del Consejo de Estado 8201 de 2006). Mascotas con correa y recogiendo desechos; hay bebederos para mascotas. Horario sugerido 6AM-6PM por seguridad.',
  checklist_tip: 'Llega temprano (6-7AM): adem\u00e1s de menos gente, la luz favorece el avistamiento de aves en los jardines de polinizadores.',
  entradas: [
    { tipo: 'Entrada general', precio: 'Gratis', incluye: 'Todo el corredor, senderos, plazoletas y zonas infantiles', link: 'https://www.idrd.gov.co' },
    { tipo: 'Avistamiento de aves guiado', precio: 'Gratis', incluye: 'Recorridos del Grupo Ecomunitario (agenda abierta)', link: 'https://senderogranchico.com' },
    { tipo: 'Running / ciclismo', precio: 'Gratis', incluye: '3 circuitos de trote y ciclorruta', link: 'https://www.idrd.gov.co' }
  ],
  tours: [
    {
      nombre: 'Sendero Gran Chic\u00f3 a pie',
      precio: '0', precio_sub: 'autoguiado',
      duracion: '2 horas', tipo_tour: 'Autoguiado', idioma: 'Espa\u00f1ol', max_personas: 'Libre',
      rating: '4.8', review_count: 210,
      descripcion: 'Recorrido de la Autopista Norte a la carrera 7 pasando por la Plazoleta de las Flores, la escultura de Negret y los jardines de polinizadores.',
      incluye: ['Mapa del sendero', 'Totems con QR'],
      no_incluye: ['Guiado', 'Transporte'],
      link_reserva: 'https://senderogranchico.com',
      featured: true
    },
    {
      nombre: 'Avistamiento de aves con expertos',
      precio: '0', precio_sub: 'ciencia ciudadana',
      duracion: '2 horas', tipo_tour: 'Grupal', idioma: 'Espa\u00f1ol', max_personas: 'M\u00e1x 15',
      rating: '4.9', review_count: 95,
      descripcion: 'Caminata guiada por el Grupo Ecomunitario para registrar especies en eBird e iNaturalist, con binoculares.',
      incluye: ['Gu\u00eda especializado', 'Registro cient\u00edfico'],
      no_incluye: ['Binoculares', 'Transporte'],
      link_reserva: 'https://senderogranchico.com',
      featured: false
    },
    {
      nombre: 'El Virrey + Parque de la 93',
      precio: '0', precio_sub: 'por persona',
      duracion: '3 horas', tipo_tour: 'Privado', idioma: 'Espa\u00f1ol/Ingl\u00e9s', max_personas: 'M\u00e1x 8',
      rating: '4.7', review_count: 60,
      descripcion: 'Caminata que conecta El Virrey con el Parque de la 93 y la Zona G, cerrando con caf\u00e9.',
      incluye: ['Gu\u00eda', 'Contexto de biodiversidad urbana'],
      no_incluye: ['Alimentos', 'Transporte'],
      link_reserva: 'https://bogotawalkingtours.com',
      featured: false
    }
  ],
  equipamiento: [
    { item: 'Zapatos c\u00f3modos para caminar o trotar', prioridad: 'Recomendado' },
    { item: 'Agua y bebederos para mascotas', prioridad: 'Recomendado' },
    { item: 'Binoculares si quieres ver aves', prioridad: 'Opcional' },
    { item: 'Camara', prioridad: 'Opcional' },
    { item: 'Correa para mascotas', prioridad: 'Recomendado' }
  ],
  itinerario: [
    { dia: 'Recorrido', hora: '6:30 am', titulo: 'Inicio en Autopista Norte', icono: '\ud83d\udc26', detalle: 'Sector m\u00e1s ancho, jardines de polinizadores y refugios de murci\u00e9lagos', tags: ['Aves'] },
    { dia: 'Recorrido', hora: '7:15 am', titulo: 'Plazoleta de las Flores', icono: '\ud83c\udf3f', detalle: 'Escultura Gran Cascada de Negret y las 12 plazoletas', tags: ['Arte'] },
    { dia: 'Recorrido', hora: '8:00 am', titulo: 'Hacia la carrera 7', icono: '\ud83c\udf09', detalle: 'Sendero angosto junto a la quebrada y escaleras para entrenar', tags: ['Naturaleza'] },
    { dia: 'Recorrido', hora: '8:30 am', titulo: 'Regreso por ciclorruta', icono: '\ud83d\udeb2', detalle: 'Ida y vuelta completa ~3,4 km por el corredor', tags: ['Running'] }
  ],
  dificultad_tags: [
    { texto: 'Corredor plano, ancho y gratuito', apto: true },
    { texto: 'Pet friendly con bebederos', apto: true },
    { texto: 'Prohibido f\u00fatbol y eventos masivos', apto: false },
    { texto: 'Horario sugerido 6AM-6PM por seguridad', apto: false },
    { texto: 'Fines de semana concurridos para trotar', apto: false }
  ],
  temporada_matriz: {
    Ene: 'ideal', Feb: 'ideal', Mar: 'ideal', Abr: 'ideal', May: 'ideal',
    Jun: 'ideal', Jul: 'ideal', Ago: 'ideal', Sep: 'ideal', Oct: 'ideal', Nov: 'ideal', Dic: 'ideal'
  }
};

const FAQS = [
  { pregunta: '\u00bfEs gratis el Parque El Virrey?', respuesta: 'S\u00ed, la entrada es completamente gratuita y el parque est\u00e1 abierto todo el a\u00f1o.' },
  { pregunta: '\u00bfSe puede llevar perro?', respuesta: 'S\u00ed, es uno de los parques favoritos de Bogot\u00e1 para pasear mascotas, con correa y recogiendo desechos; hay bebederos.' },
  { pregunta: '\u00bfSe puede correr o jugar f\u00fatbol?', respuesta: 'Correr y trotar s\u00ed (hay 3 circuitos, ~3,4 km). Jugar f\u00fatbol no: est\u00e1 prohibido por un fallo del Consejo de Estado.' },
  { pregunta: '\u00bfCu\u00e1l es la mejor hora para ver aves?', respuesta: 'Muy temprano (6-8AM) o al final de la tarde (4-6PM); en temporada migratoria (marzo-mayo y septiembre-noviembre) hay m\u00e1s especies.' },
  { pregunta: '\u00bfD\u00f3nde est\u00e1 el Sendero Gran Chic\u00f3?', respuesta: 'El Virrey es parte de este sendero urbano, que va de la Autopista Norte a la carrera 7 y conecta con el Parque de la 93.' }
];

module.exports = { SLUG: SLUG, HERO: HERO, PHOTOS: PHOTOS, BASE: BASE, TAGS: TAGS, FAQS: FAQS };

if (require.main !== module) return;

(async function main() {
  var url = process.env.DATABASE_URL || process.argv[2];
  if (!url) {
    console.error('Falta DATABASE_URL.');
    console.error('Uso: DATABASE_URL=postgres://... node scripts/seed-el-virrey.js [--dry]');
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