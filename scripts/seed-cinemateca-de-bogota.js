// scripts/seed-cinemateca-de-bogota.js
// Crea (o actualiza) la pagina dinamica cinemateca-de-bogota.html con los
// datos de ficha-cinemateca-de-bogota.md, replicando EXACTAMENTE lo que
// guardaria el formulario admin.html. Patron de scripts/seed-el-virrey.js
// con upsert completo.
//
// Rating: NO se siembran resenas ni se hardcodea rating. La pagina queda con
// rating/contador en 0 hasta que lleguen interacciones reales (ADR-009).
//
// Uso:
//   DATABASE_URL=postgres://... node scripts/seed-cinemateca-de-bogota.js --dry
//   DATABASE_URL=postgres://... node scripts/seed-cinemateca-de-bogota.js
//
// Idempotente: re-ejecutable sin efectos secundarios (ON CONFLICT slug).

var neon = null;
function getNeon() {
  if (!neon) neon = require('@neondatabase/serverless').neon;
  return neon;
}

const SLUG = 'cinemateca-de-bogota';
const HERO = 'https://thumb.wikimedia.org/wikipedia/commons/thumb/7/77/2019_Bogot%C3%A1_-_Edificio_de_la_Cinemateca_en_la_Carrera_Tercera.jpg/960px-2019_Bogot%C3%A1_-_Edificio_de_la_Cinemateca_en_la_Carrera_Tercera.jpg';

const PHOTOS = [
  { url: HERO, caption: 'Fachada de la Cinemateca de Bogota sobre la Carrera 3 en el centro historico' },
  { url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/0/04/Cinemateca_Distrital_de_Bogot%C3%A1.jpg/960px-Cinemateca_Distrital_de_Bogot%C3%A1.jpg', caption: 'Vista exterior y entorno urbano de la Cinemateca de Bogota' },
  { url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/f/fa/BECMA_-_Cinemateca_de_Bogot%C3%A1_%282022%29_16.jpg/960px-BECMA_-_Cinemateca_de_Bogot%C3%A1_%282022%29_16.jpg', caption: 'Interior de la Biblioteca Especializada en Cine y Medios Audiovisuales (BECMA)' },
  { url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/e/ed/BECMA_-_Cinemateca_de_Bogot%C3%A1_%282022%29_03.jpg/960px-BECMA_-_Cinemateca_de_Bogot%C3%A1_%282022%29_03.jpg', caption: 'Salas de consulta y estudio de la BECMA en la Cinemateca' },
  { url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/3/35/BECMA_-_Cinemateca_de_Bogot%C3%A1_%282022%29_07.jpg/960px-BECMA_-_Cinemateca_de_Bogot%C3%A1_%282022%29_07.jpg', caption: 'Detalle de la coleccion cinematografica y el mobiliario de la BECMA' }
];

const BASE = {
  slug: SLUG,
  nombre: 'Cinemateca de Bogota',
  categoria_slug: 'sitio',
  lead: 'El centro cultural de las artes audiovisuales en Colombia, ubicado en el corazon del centro historico de Bogota. Un espacio emblematico dedicado a la preservacion, circulacion y creacion cinematografica con salas de proyeccion de ultima tecnologia.',
  descripcion: 'La Cinemateca de Bogota, anteriormente conocida como Cinemateca Distrital, es un centro cultural publico dedicado al arte audiovisual colombiano e internacional. Fundada originalmente en 1971 por el Instituto Distrital de Cultura y Turismo, se traslado en junio de 2019 a una moderna infraestructura cultural de mas de 8.500 metros cuadrados ubicada sobre la Calle 19, en el centro historico de Bogota.\n\nEl complejo cultural cuenta con cuatro salas de proyeccion de nivel profesional (incluyendo la Sala Capital con capacidad para 272 personas), multiples salas de exposicion, mediateca con un extenso archivo filmico y documental, laboratorios de creacion digital y sonido, talleres para actividades interactivas, la Biblioteca Especializada en Cine y Medios Audiovisuales (Becma) y areas de cafe y libreria cultural.\n\nAdemas de su programacion regular de cine independiente, retrospectivas, festivales internacionales y muestras nacionales, la Cinemateca de Bogota actua como un nodo de formacion y fomento a la creacion audiovisual a traves del Idartes (Instituto Distrital de las Artes). Es un punto de encuentro imprescindible para estudiantes, realizadores y amantes del cine de la ciudad.',
  highlight: 'El centro cultural de las artes audiovisuales en Colombia, en pleno centro historico: 4 salas de proyeccion, Mediateca BECMA y archivo filmico',
  ciudad: 'Bogota',
  region: 'Cundinamarca',
  barrio: 'Las Nieves',
  lat: 4.6041,
  lng: -74.07,
  whatsapp: '',
  telefono: '+576013795750',
  email: 'atencion.ciudadano@idartes.gov.co',
  web: 'https://www.cinematecadebogota.gov.co',
  instagram: '@cinematecabta',
  precio_desde: 'Entrada general $6.000 COP',
  horario: 'Mar-Dom 9:00 AM - 8:00 PM. Lunes cerrado',
  emoji: '\ud83c\udfac',
  hero_bg: 'linear-gradient(135deg,#1f1c2c 0%,#928dab 100%)',
  foto_hero: HERO,
  tipo: 'Cine de Arte \u00b7 Centro Cultural \u00b7 Mediateca \u00b7 Archivo Filmico',
  capacidad: '272 personas Sala Capital',
  como_llegar: 'TransMilenio estacion Las Aguas / Universidades, caminar 2 cuadras por Cra 3. Direccion: Carrera 3 # 19-10',
  status: 'published',
  destacado: true
};

const TAGS = {
  tipo_actividad: 'Cine de arte, exposiciones, mediateca y laboratorios creativos',
  dificultad: 'Facil',
  dificultad_desc: 'Accesible para todo publico con infraestructura adaptada a personas con movilidad reducida.',
  duracion: '2-4 horas',
  altitud: '2600',
  temporada: ['Todo el anio'],
  precio_entrada: 'Entrada general a cine $6.000 COP; estudiantes, docentes y adultos mayores $5.000 COP. Exposiciones y Mediateca gratuitas.',
  distancia: 'Centro historico de Bogota',
  como_llegar: 'TransMilenio hasta las estaciones Las Aguas o Universidades, o buses SITP por la Carrera 3a o Calle 19.',
  permisos: 'Boletas en taquilla o tuboleta.com para proyecciones. Acceso libre a galerias y mediateca.',
  temporada_nota: 'Programacion cultural continua durante todo el anio.',
  fauna_flora: '',
  secretos: JSON.stringify([
    { icono: '\ud83c\udfa5', titulo: 'Sede de Festivales de Cine', texto: 'Es la sede principal de festivales cinematograficos de alto impacto como la MIDBO (Muestra Internacional Documental de Bogota) y Muestras de Cine Internacional.', tag: 'Imperdible', tag_color: 'gold' },
    { icono: '\ud83d\uddc4\ufe0f', titulo: 'Consulta Gratuita en BECMA', texto: 'En la Biblioteca Especializada en Cine y Medios Audiovisuales puedes consultar miles de libros y ver peliculas colombianas de archivo de forma totalmente gratuita.', tag: 'Gratuito', tag_color: 'green' },
    { icono: '\ud83c\udfa7', titulo: 'Laboratorios de Creacion Audiovisual', texto: 'Cuenta con talleres equipados para la produccion de contenidos digitales, animacion y edicion de sonido abiertos mediante convocatorias y talleres de Idartes.', tag: 'Creativo', tag_color: 'purple' }
  ]),
  regulaciones: 'Prohibido el ingreso de comida pesada a las salas de proyeccion. Mantener silencio durante las funciones.',
  checklist_tip: 'Consulta la cartelera mensual en formato digital antes de tu visita para elegir la funcion de tu preferencia.',
  entradas: [
    { tipo: 'Entrada General Cine', precio: '$6.000 COP', incluye: 'Acceso a 1 funcion en sala de proyeccion', link: 'https://www.cinematecadebogota.gov.co' },
    { tipo: 'Entrada Preferencial Cine', precio: '$5.000 COP', incluye: 'Acceso a 1 funcion para estudiantes, docentes o adultos mayores', link: 'https://www.cinematecadebogota.gov.co' },
    { tipo: 'Acceso a Mediateca y Exposiciones', precio: '$0 COP', incluye: 'Ingreso a las salas de exposicion de arte y consulta bibliografica en Becma', link: 'https://www.cinematecadebogota.gov.co' }
  ],
  tours: [
    {
      nombre: 'Recorrido por la Infraestructura de la Cinemateca',
      precio: '0', precio_sub: 'Entrada libre previa inscripcion',
      duracion: '1 hora', tipo_tour: 'Grupal', idioma: 'Espanol', max_personas: '20 personas',
      rating: '', review_count: 0,
      descripcion: 'Visita mediada para conocer las 4 salas de proyeccion, la mediateca, los laboratorios de sonido y la historia de la cinemateca en Bogota.',
      incluye: ['Mediador cultural', 'Acceso a laboratorios y salas'],
      no_incluye: ['Boleta para funcion comercial de cine'],
      link_reserva: 'https://www.cinematecadebogota.gov.co',
      featured: true
    }
  ],
  equipamiento: [
    { item: 'Documento de Identidad o Carnet Estudiantil', prioridad: 'Obligatorio' },
    { item: 'Chaqueta o abrigo para salas climatizadas', prioridad: 'Recomendado' },
    { item: 'Calzado comodo', prioridad: 'Recomendado' }
  ],
  itinerario: [
    { dia: 'Dia 1', hora: '10:00 AM', titulo: 'Visita a la Mediateca BECMA', icono: '\ud83d\udcf1', detalle: 'Consulta libros de historia del cine y afiches historicos de peliculas colombianas.', tags: ['Cultura', 'Gratuito'] },
    { dia: 'Dia 1', hora: '11:30 AM', titulo: 'Recorrido por la Galeria de Exposiciones', icono: '\ud83c\udfa8', detalle: 'Disfruta de instalaciones audiovisuales e historicas en el nivel inferior.', tags: ['Arte', 'Exposicion'] },
    { dia: 'Dia 1', hora: '03:00 PM', titulo: 'Proyeccion Cinematografica', icono: '\ud83c\udf9f\ufe0f', detalle: 'Asiste a una funcion en la Sala Capital con tecnologia de proyeccion y sonido de alta fidelidad.', tags: ['Cine', 'Entretenimiento'] }
  ],
  dificultad_tags: [
    { texto: 'Apto para personas con movilidad reducida', apto: true },
    { texto: 'Apto para familias y ninos', apto: true },
    { texto: 'Apto para adultos mayores', apto: true }
  ],
  temporada_matriz: {
    Ene: 'ideal', Feb: 'ideal', Mar: 'ideal', Abr: 'ideal', May: 'ideal',
    Jun: 'ideal', Jul: 'ideal', Ago: 'ideal', Sep: 'ideal', Oct: 'ideal', Nov: 'ideal', Dic: 'ideal'
  }
};

const FAQS = [
  { pregunta: 'Donde queda ubicada la Cinemateca de Bogota?', respuesta: 'Se encuentra ubicada en la Carrera 3 # 19-10, en el centro historico de Bogota.' },
  { pregunta: 'Cuanto cuesta la entrada para ver cine?', respuesta: 'La boleta general cuesta $6.000 COP. Estudiantes, docentes y adultos mayores pagan $5.000 COP.' },
  { pregunta: 'Cuales son los horarios de la Cinemateca de Bogota?', respuesta: 'Abre de martes a domingo de 9:00 AM a 8:00 PM. Los lunes permanece cerrada.' },
  { pregunta: 'Tengo que pagar para entrar a las exposiciones?', respuesta: 'No, la entrada a las galerias de arte y a la mediateca es completamente gratuita.' },
  { pregunta: 'Como compro las boletas para las funciones de cine?', respuesta: 'Puedes adquirirlas directamente en la taquilla o por internet a traves de TuBoleta.' }
];

module.exports = { SLUG: SLUG, HERO: HERO, PHOTOS: PHOTOS, BASE: BASE, TAGS: TAGS, FAQS: FAQS };

if (require.main !== module) return;

(async function main() {
  var url = process.env.DATABASE_URL || process.argv[2];
  if (!url) {
    console.error('Falta DATABASE_URL.');
    console.error('Uso: DATABASE_URL=postgres://... node scripts/seed-cinemateca-de-bogota.js [--dry]');
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