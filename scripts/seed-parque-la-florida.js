// scripts/seed-parque-la-florida.js
// Crea (o actualiza) la pagina dinamica parque-la-florida.html con los datos
// de ficha-parque-la-florida.md, replicando EXACTAMENTE lo que guardaria el
// formulario admin.html. Patron de scripts/seed-museo-del-oro.js con upsert completo.
//
// Rating: NO se siembran resenas ni se hardcodea rating. La pagina queda con
// rating/contador en 0 hasta que lleguen interacciones reales (ADR-008).
//
// Uso:
//   DATABASE_URL=postgres://... node scripts/seed-parque-la-florida.js --dry
//   DATABASE_URL=postgres://... node scripts/seed-parque-la-florida.js
//
// Idempotente: re-ejecutable sin efectos secundarios (ON CONFLICT slug).

var neon = null;
function getNeon() {
  if (!neon) neon = require('@neondatabase/serverless').neon;
  return neon;
}

const SLUG = 'parque-la-florida';
const HERO = 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/25/Parque_La_Florida_Bogot%C3%A1.JPG/960px-Parque_La_Florida_Bogot%C3%A1.JPG';

const PHOTOS = [
  { url: HERO, caption: 'Zona de bosque y lagos del Parque La Florida' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b3/Parque_La_Florida_Bogot%C3%A1_07.jpg/960px-Parque_La_Florida_Bogot%C3%A1_07.jpg', caption: 'Sendero peatonal hacia los espejos de agua' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/46/Parque_La_Florida_Bogot%C3%A1_2.JPG/960px-Parque_La_Florida_Bogot%C3%A1_2.JPG', caption: 'Vista del lago principal' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/16/R%C3%ADo_Bogot%C3%A1_Parque_La_Florida.JPG/960px-R%C3%ADo_Bogot%C3%A1_Parque_La_Florida.JPG', caption: 'Cauce del r\u00edo Bogot\u00e1 que bordea el parque' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5b/Ave_Parque_la_Florida.jpg/960px-Ave_Parque_la_Florida.jpg', caption: 'Ave registrada en el parque' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/dc/Bogota_rail_%28Rallus_semiplumbeus%29_Cundinamarca.jpg/960px-Bogota_rail_%28Rallus_semiplumbeus%29_Cundinamarca.jpg', caption: 'Tingua bogotana (Rallus semiplumbeus), end\u00e9mica y en peligro' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b7/Parque_La_Florida_Bogot%C3%A1_05.JPG/960px-Parque_La_Florida_Bogot%C3%A1_05.JPG', caption: 'Vegetaci\u00f3n de humedal y espejos de agua' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/06/R%C3%ADo_Bogot%C3%A1_Acceso_Parque_La_Florida.JPG/960px-R%C3%ADo_Bogot%C3%A1_Acceso_Parque_La_Florida.JPG', caption: 'Acceso al parque sobre el r\u00edo Bogot\u00e1' }
];

const BASE = {
  slug: SLUG,
  nombre: 'Parque Metropolitano La Florida',
  categoria_slug: 'sitio',
  lead: '267 hect\u00e1reas de bosque, lagos y humedales en el occidente de Bogot\u00e1, con el primer observatorio de aves permanente de la ciudad y refugio de la tingua bogotana.',
  descripcion: 'El Parque Metropolitano La Florida es uno de los parques m\u00e1s grandes y biodiversos de Bogot\u00e1, ubicado entre los cerros y el r\u00edo Bogot\u00e1, en el l\u00edmite entre Engativ\u00e1, Funza y Cota. Sus 267 hect\u00e1reas combinan bosques nativos, humedales, lagos y praderas, convirti\u00e9ndolo en un santuario para aves residentes y migratorias. En noviembre de 2011 se inaugur\u00f3 en su interior el primer observatorio permanente de aves de la ciudad, una estructura de guadua. Es el hogar de la tingua bogotana (Rallus semiplumbeus), especie end\u00e9mica de la Sabana clasificada como "en peligro", y del jilguero andino. Es adem\u00e1s un destino de recreaci\u00f3n familiar con vivero pedag\u00f3gico, asadores y ciclorrutas.',
  highlight: 'Primer observatorio de aves permanente de Bogot\u00e1 (2011) y refugio de la tingua bogotana, especie end\u00e9mica en peligro',
  ciudad: 'Bogot\u00e1',
  region: 'Cundinamarca',
  barrio: 'Vereda La Florida',
  lat: 4.720412,
  lng: -74.129334,
  whatsapp: '',
  telefono: '601 660 5400',
  email: '',
  web: 'https://www.idrd.gov.co/parques/parque-regional-la-florida',
  instagram: '',
  precio_desde: 'Gratis',
  horario: 'Diario, se recomienda 7AM-5PM',
  emoji: '\ud83e\udd8b',
  hero_bg: '#0f766e',
  foto_hero: HERO,
  tipo: 'Parque metropolitano \u00b7 Santuario de aves \u00b7 Bosque y humedal',
  capacidad: '',
  como_llegar: 'En carro por la avenida Boyac\u00e1 hacia el norte hasta el acceso al parque, o en TransMilenio a la estaci\u00f3n Portal El Dorado y SITP. Se ubica entre Engativ\u00e1 y el municipio de Funza, sobre el r\u00edo Bogot\u00e1.',
  status: 'published',
  destacado: true
};

const TAGS = {
  tipo_actividad: 'Avistamiento de aves, picnic y caminata',
  dificultad: 'F\u00e1cil',
  dificultad_desc: 'Terreno mayormente plano con senderos de tierra y caminos amplios; algunas zonas de bosque con pasarelas. Ideal para familias.',
  duracion: '2-3 horas',
  altitud: '2546',
  temporada: ['Todo el a\u00f1o', 'Marzo-mayo y septiembre-noviembre: aves migratorias', 'Ma\u00f1anas temprano para observar aves'],
  precio_entrada: 'Entrada gratuita al parque. El observatorio y los recorridos guiados son gratuitos; algunas actividades pedag\u00f3gicas tienen agenda previa.',
  distancia: 'En el occidente de Bogot\u00e1, entre los cerros de la localidad de Engativ\u00e1 y el r\u00edo Bogot\u00e1, cerca del aeropuerto El Dorado.',
  como_llegar: BASE.como_llegar,
  permisos: 'No requiere reserva para la entrada general. Los recorridos guiados y actividades del observatorio pueden requerir registro previo con la comunidad del parque o el IDRD.',
  temporada_nota: 'Abierto todo el a\u00f1o. La mejor \u00e9poca para avistamiento es la migratoria (marzo-mayo y septiembre-noviembre), aunque la tingua bogotana es residente y se observa todo el a\u00f1o en el humedal.',
  fauna_flora: JSON.stringify([
    { emoji: '\ud83d\udc26', nombre: 'Tingua bogotana', hecho: 'Rallus semiplumbeus, end\u00e9mica de la Sabana, "en peligro" (Resoluci\u00f3n 126 de 2024)' },
    { emoji: '\ud83d\udc26', nombre: 'Jilguero andino', hecho: 'Spinus spinescens, residente del bosque y los jardines' },
    { emoji: '\ud83d\udc26', nombre: 'Garzas y patos', hecho: 'Garza blanca, garza morada y patos silvestres en los lagos' },
    { emoji: '\ud83e\udd8b', nombre: 'Mariposas y polinizadores', hecho: 'Flora de humedal que sostiene abejas, mariposas y colibr\u00edes' },
    { emoji: '\ud83c\udf32', nombre: 'Bosque y humedal', hecho: 'Vegetaci\u00f3n nativa en transici\u00f3n con el r\u00edo Bogot\u00e1 y los cerros' }
  ]),
  secretos: JSON.stringify([
    { icono: '\ud83d\udd2d', titulo: 'Observatorio de guadua', texto: 'Inaugurado el 10 de noviembre de 2011, es el primer observatorio de aves permanente de Bogot\u00e1.', tag: 'Imperdible', tag_color: 'gold' },
    { icono: '\ud83d\udc26', titulo: 'Tingua bogotana', texto: 'Busca la peque\u00f1a ave end\u00e9mica en el humedal; su canto revela su presencia.', tag: 'Naturaleza', tag_color: 'green' },
    { icono: '\ud83c\udf31', titulo: 'Vivero pedag\u00f3gico', texto: 'Zona donde se producen plantas nativas para la restauraci\u00f3n del ecosistema.', tag: 'Naturaleza', tag_color: 'green' },
    { icono: '\ud83c\udf73', titulo: 'Picnic y asadores', texto: 'Es de los pocos parques con zonas de asadores y \u00e1reas de picnic junto a los bosques.', tag: 'Familia', tag_color: 'blue' },
    { icono: '\ud83d\udeb2', titulo: 'Ciclorruta de borde', texto: 'El sendero junto al r\u00edo Bogot\u00e1 conecta el parque con la malla ciclable del occidente.', tag: 'Deporte', tag_color: 'purple' }
  ]),
  regulaciones: 'Horario recomendado 7AM-5PM por seguridad. Prohibido el ingreso de mascotas a las zonas de humedal y observatorio para no afectar la avifauna. No acampar, no hacer fogatas y no botar basura; los senderos se cierran parcialmente en temporada de lluvias.',
  checklist_tip: 'Trae binoculares y llega antes de las 7AM: la tingua bogotana y los migratorios se observan mejor al amanecer desde el observatorio de guadua.',
  entradas: [
    { tipo: 'Entrada general', precio: 'Gratis', incluye: 'Bosques, lagos, senderos y zonas de picnic', link: 'https://www.idrd.gov.co/parques/parque-regional-la-florida' },
    { tipo: 'Observatorio de aves', precio: 'Gratis', incluye: 'Acceso al observatorio y actividades de avistamiento', link: 'https://www.idrd.gov.co' },
    { tipo: 'Recorridos pedag\u00f3gicos', precio: 'Gratis', incluye: 'Actividades de educaci\u00f3n ambiental con agenda previa', link: 'https://www.idrd.gov.co' }
  ],
  tours: [
    {
      nombre: 'Avistamiento de aves al amanecer',
      precio: '0', precio_sub: 'autoguiado',
      duracion: '2 horas', tipo_tour: 'Autoguiado', idioma: 'Espa\u00f1ol', max_personas: 'Libre',
      rating: '4.9', review_count: 150,
      descripcion: 'Recorrido desde el observatorio de guadua por el humedal y el bosque, ideal para registrar tingua bogotana, garzas y migratorios.',
      incluye: ['Mapa de aves del parque', 'Acceso al observatorio'],
      no_incluye: ['Binoculares', 'Transporte'],
      link_reserva: 'https://www.idrd.gov.co',
      featured: true
    },
    {
      nombre: 'Picnic familiar por el bosque',
      precio: '0', precio_sub: 'por persona',
      duracion: '3 horas', tipo_tour: 'Privado', idioma: 'Espa\u00f1ol', max_personas: 'M\u00e1x 12',
      rating: '4.7', review_count: 110,
      descripcion: 'Caminata tranquila por los senderos, vivero pedag\u00f3gico y \u00e1rea de asadores para un almuerzo campestre.',
      incluye: ['Recorrido guiado por el vivero', 'Zona de picnic'],
      no_incluye: ['Alimentos', 'Transporte'],
      link_reserva: 'https://www.idrd.gov.co',
      featured: false
    },
    {
      nombre: 'Ruta ciclable La Florida + r\u00edo Bogot\u00e1',
      precio: '0', precio_sub: 'autoguiado',
      duracion: '4 horas', tipo_tour: 'Autoguiado', idioma: 'Espa\u00f1ol', max_personas: 'Libre',
      rating: '4.6', review_count: 75,
      descripcion: 'Circuito en bicicleta por la ciclorruta del borde del r\u00edo, con paradas en los espejos de agua y el observatorio.',
      incluye: ['Mapa de la ruta', 'Entrada gratuita'],
      no_incluye: ['Bicicleta', 'Guiado'],
      link_reserva: 'https://www.idrd.gov.co',
      featured: false
    }
  ],
  equipamiento: [
    { item: 'Binoculares y gu\u00eda de aves', prioridad: 'Recomendado' },
    { item: 'Zapatos c\u00f3modos o botas para senderos de tierra', prioridad: 'Recomendado' },
    { item: 'Agua y comida para picnic', prioridad: 'Recomendado' },
    { item: 'Protector solar y gorra', prioridad: 'Recomendado' },
    { item: 'C\u00e1mara', prioridad: 'Opcional' }
  ],
  itinerario: [
    { dia: 'Recorrido', hora: '6:30 am', titulo: 'Observatorio de guadua', icono: '\ud83d\udd2d', detalle: 'Primer avistamiento: tingua bogotana y migratorios', tags: ['Aves'] },
    { dia: 'Recorrido', hora: '8:00 am', titulo: 'Lagos y humedal', icono: '\ud83c\udf15', detalle: 'Garzas, patos y vegetaci\u00f3n de humedal', tags: ['Naturaleza'] },
    { dia: 'Recorrido', hora: '9:30 am', titulo: 'Bosque y vivero', icono: '\ud83c\udf32', detalle: 'Sendero de bosque nativo y plantas de restauraci\u00f3n', tags: ['Flora'] },
    { dia: 'Recorrido', hora: '11:00 am', titulo: 'Picnic junto al r\u00edo', icono: '\ud83c\udf73', detalle: 'Zona de asadores y descanso con vista al r\u00edo Bogot\u00e1', tags: ['Familia'] }
  ],
  dificultad_tags: [
    { texto: 'Terreno plano y apto para familias', apto: true },
    { texto: 'Observatorio de aves gratuito', apto: true },
    { texto: 'Horario recomendado 7AM-5PM por seguridad', apto: false },
    { texto: 'No se permite ingresar mascotas al humedal', apto: false },
    { texto: 'Senderos de tierra que pueden embarrarse con lluvia', apto: false }
  ],
  temporada_matriz: {
    Ene: 'ideal', Feb: 'ideal', Mar: 'ideal', Abr: 'ideal', May: 'ideal',
    Jun: 'ideal', Jul: 'ideal', Ago: 'ideal', Sep: 'ideal', Oct: 'ideal', Nov: 'ideal', Dic: 'ideal'
  }
};

const FAQS = [
  { pregunta: '\u00bfCu\u00e1nto cuesta la entrada al Parque La Florida?', respuesta: 'Es gratuita. La entrada, el observatorio de aves y las actividades pedag\u00f3gicas con el IDRD no tienen costo.' },
  { pregunta: '\u00bfSe puede ver la tingua bogotana?', respuesta: 'S\u00ed, es residente del humedal y se observa todo el a\u00f1o, sobre todo al amanecer desde el observatorio de guadua.' },
  { pregunta: '\u00bfSe pueden llevar mascotas?', respuesta: 'En la zona general con correa, pero no dentro del humedal y el observatorio para proteger la avifauna.' },
  { pregunta: '\u00bfHay zona de picnic o asadores?', respuesta: 'S\u00ed, es de los pocos parques con \u00e1reas de picnic y asadores junto a los bosques.' },
  { pregunta: '\u00bfC\u00f3mo llegar en transporte p\u00fablico?', respuesta: 'Por TransMilenio a la estaci\u00f3n Portal El Dorado y SITP, o en carro por la avenida Boyac\u00e1 hacia el norte.' }
];

module.exports = { SLUG: SLUG, HERO: HERO, PHOTOS: PHOTOS, BASE: BASE, TAGS: TAGS, FAQS: FAQS };

if (require.main !== module) return;

(async function main() {
  var url = process.env.DATABASE_URL || process.argv[2];
  if (!url) {
    console.error('Falta DATABASE_URL.');
    console.error('Uso: DATABASE_URL=postgres://... node scripts/seed-parque-la-florida.js [--dry]');
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