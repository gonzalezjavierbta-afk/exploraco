// scripts/seed-bahia-malaga.js
// Crea (o actualiza) la pagina dinamica bahia-malaga.html con los datos
// de ficha-bahia-malaga.json (Parque Nacional Natural Uramba Bahia Malaga,
// cat sitio, slug bahia-malaga). Patron de scripts/seed-canon-del-guejar.js.
//
// Rating: NO se siembran resenas ni se hardcodea rating. La pagina queda
// con rating/contador en 0 hasta que lleguen interacciones reales (ADR-009).
//
// Uso:
//   DATABASE_URL=postgres://... node scripts/seed-bahia-malaga.js --dry
//   DATABASE_URL=postgres://... node scripts/seed-bahia-malaga.js
//
// Idempotente: re-ejecutable sin efectos secundarios (ON CONFLICT slug).

var neon = null;
function getNeon() {
  if (!neon) neon = require('@neondatabase/serverless').neon;
  return neon;
}

var SLUG = 'bahia-malaga';
var HERO = 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/89/Ballena_jorobada_y_ballenato_en_Bah%C3%ADa_M%C3%A1laga.JPG/960px-Ballena_jorobada_y_ballenato_en_Bah%C3%ADa_M%C3%A1laga.JPG';

var PHOTOS = [
  { url: HERO, caption: 'Ballena jorobada y ballenato en Bahia Malaga' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Ballena_jorobada_o_ballena_yubarta_%28Megaptera_novaeangliae%29.jpg/960px-Ballena_jorobada_o_ballena_yubarta_%28Megaptera_novaeangliae%29.jpg', caption: 'Ballena jorobada (Megaptera novaeangliae) en aguas del Pacifico' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/Mangrove_in_Bah%C3%ADa_Solano%2C_Choco%2C_Colombia.jpg/960px-Mangrove_in_Bah%C3%ADa_Solano%2C_Choco%2C_Colombia.jpg', caption: 'Manglares y esteros del Pacifico colombiano' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/af/Calle_de_Juanchaco%2C_Buenaventura.jpg/960px-Calle_de_Juanchaco%2C_Buenaventura.jpg', caption: 'Calle de Juanchaco, puerta de entrada a Bahia Malaga' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Playa_de_Juanchaco.jpg/960px-Playa_de_Juanchaco.jpg', caption: 'Playa de Juanchaco en el litoral pacifico' }
];

var BASE = {
  slug: SLUG,
  nombre: 'Parque Nacional Natural Uramba Bahia Malaga',
  categoria_slug: 'sitio',
  lead: 'Descubre el Parque Nacional Natural Uramba Bahia Malaga, una de las zonas de mayor biodiversidad del planeta y el santuario favorito de las ballenas jorobadas en el Pacifico colombiano.',
  descripcion: 'El Parque Nacional Natural Uramba Bahia Malaga, creado en 2010 y ubicado en el municipio de Buenaventura (Valle del Cauca), abarca cerca de 47.094 hectareas de ecosistemas continentales, costeros y marinos. Es reconocido mundialmente por ser un area clave para la reproduccion, crianza y lactancia de la ballena jorobada (Megaptera novaeangliae), que migra miles de kilometros desde la Antartida entre julio y octubre.\n\nAdemas del avistamiento de cetaceos, Bahia Malaga se destaca por sus pristinos bosques de manglar, esteros, cascadas de agua dulce que desembocan directamente en el mar e islas de acantilados cubiertos de vegetacion selvaica. La zona alberga una rica diversidad de aves marinas, reptiles, peces y moluscos, configurando un mosaico ecologico protegido conjuntamente entre Parques Nacionales Naturales de Colombia y las comunidades afrodescendientes ancestrales agrupadas en sus Consejos Comunitarios.\n\nLa experiencia turistica en Uramba integra recorridos ecoturisticos guiados por sabedores locales, visitas a caidas de agua emblematicas como La Sierpe, paseos en kayak o canoa tradicional por los tuneles de manglar y exploracion de playas virgenes. El turismo responsable apoya directamente la conservacion de la biodiversidad marina y el desarrollo sostenible de las comunidades locales de Juanchaco, Ladrilleros, La Plata y Puerto Chiple.',
  highlight: 'Parque Nacional Natural - Avistamiento de Ballenas Jorobadas - Eco-destino de alta biodiversidad',
  ciudad: 'Buenaventura',
  region: 'Valle del Cauca',
  barrio: 'Corregimiento de Bahia Malaga',
  lat: 3.9333,
  lng: -77.35,
  whatsapp: '573128834789',
  telefono: '576022415100',
  email: 'uramba@parquesnacionales.gov.co',
  web: 'https://www.parquesnacionales.gov.co/nuestros-parques/pnn-uramba-bahia-malaga/',
  instagram: '@parquescolombia',
  precio_desde: 'Tasa muelle desde $20.000 COP; Tours desde $70.000 COP',
  horario: 'Lun-Dom 06:00-17:00 (Sujeto a mares e itinerarios de lancha)',
  emoji: '\ud83d\udc0b',
  hero_bg: 'linear-gradient(135deg, #0b3d91 0%, #1e88e5 100%)',
  foto_hero: HERO,
  tipo: 'Sitio Natural - Parque Nacional Natural - Avistamiento de Fauna',
  capacidad: 'Capacidad de carga regulada por PNN y Consejos Comunitarios',
  como_llegar: 'Desde Buenaventura abordar lancha rapida autorizada en el Muelle Turistico hasta el corregimiento de Juanchaco.',
  status: 'published',
  destacado: true
};

var TAGS = {
  tipo_actividad: 'Avistamiento de fauna, senderismo acuatico, ecoturismo y fotografia',
  dificultad: 'Facil',
  dificultad_desc: 'Apto para todo publico. Se requiere precaucion basica durante el abordaje de embarcaciones.',
  duracion: '1 a 3 dias',
  altitud: '0',
  temporada: ['Julio', 'Agosto', 'Septiembre', 'Octubre'],
  precio_entrada: 'Entrada gratuita al PNN. Tasa de muelle e ingreso comunitario aprox. $20.000 COP.',
  distancia: 'A 45 km por mar desde la cabecera municipal de Buenaventura',
  como_llegar: 'Desde Buenaventura abordar lancha rapida autorizada en el Muelle Turistico hasta el corregimiento de Juanchaco.',
  permisos: 'Registro obligatorio al desembarcar en el puesto de Parques Nacionales / Consejo Comunitario.',
  temporada_nota: 'La temporada de ballenas jorobadas se extiende del 15 de julio al 15 de octubre.',
  fauna_flora: JSON.stringify([
    { emoji: '\ud83d\udc0b', nombre: 'Ballena Jorobada (Megaptera novaeangliae)', hecho: 'Migra desde la Antartida para parir y alimentar sus crias en aguas calidas.' },
    { emoji: '\ud83c\udf33', nombre: 'Manglares Rojos y Pinuelos', hecho: 'Bosques acuaticos sala cuna de cientos de especies marinas del Pacifico.' },
    { emoji: '\ud83e\udd85', nombre: 'Aves Marinas y Playeras', hecho: 'Refugio de pelicanos, fragatas y piqueros de patas azules.' },
    { emoji: '\ud83d\udc2c', nombre: 'Delfin Nariz de Botella', hecho: 'Especie residente que suele avistarse cerca de las embarcaciones.' }
  ]),
  secretos: JSON.stringify([
    { icono: '\ud83e\udd2b', titulo: 'Cascadas que caen al mar', texto: 'La Sierpe es una caida de agua dulce que desemboca directamente en los esteros salobres.', tag: 'Naturaleza', tag_color: 'green' },
    { icono: '\ud83d\udca1', titulo: 'Navegacion tradicional en Chingo', texto: 'Recorridos silenciosos a remo por los esteros para una observacion de aves sin ruido de motor.', tag: 'Cultura', tag_color: 'purple' },
    { icono: '\ud83c\udf0a', titulo: 'Tuneles naturales de manglar', texto: 'En marea alta se ingresa en embarcaciones pequenas por debajo de las copas de los mangles.', tag: 'Aventura', tag_color: 'blue' }
  ]),
  regulaciones: JSON.stringify([
    { icono: '\ud83d\udc33', titulo: 'Distancia minima con ballenas', desc: 'Mantener distancia minima de 200m con las ballenas jorobadas.', tipo: 'obligatorio' },
    { icono: '\ud83d\udeab', titulo: 'Sin plasticos de un solo uso', desc: 'Prohibido el uso de plastico de un solo uso dentro del area protegida.', tipo: 'obligatorio' },
    { icono: '\ud83d\udccc', titulo: 'Registro obligatorio', desc: 'Registrar visitante al desembarcar en el puesto de Parques Nacionales o Consejo Comunitario.', tipo: 'obligatorio' },
    { icono: '\ud83c\udf27', titulo: 'Clima pacifico', desc: 'Clima humedo tropical; llevar impermeable y protector solar biodegradable.', tipo: 'info' }
  ]),
  checklist_tip: 'Llevar suficiente dinero en efectivo en billetes de baja denominacion; no hay cajeros ni signal estable para datofonos.',
  entradas: [
    { tipo: 'Tasa de Muelle + Ingreso Comunitario', precio: '$20.000 COP', incluye: 'Tasa de embarque y aporte de desarrollo ambiental comunitario', link: 'https://www.parquesnacionales.gov.co/nuestros-parques/pnn-uramba-bahia-malaga/' }
  ],
  tours: [
    {
      nombre: 'Tour de Avistamiento de Ballenas Jorobadas',
      precio: '$80.000 COP', precio_sub: 'por persona',
      duracion: '2 horas', tipo_tour: 'Grupal', idioma: 'Espanol',
      max_personas: '20',
      rating: '', review_count: 0,
      descripcion: 'Navegacion autorizada con sabedor ambiental certificado para observar ballenas jorobadas.',
      incluye: ['Chaleco salvavidas', 'Guia comunitario', 'Navegacion 2 horas'],
      no_incluye: ['Alimentos', 'Tasa de muelle'],
      link_reserva: 'https://www.parquesnacionales.gov.co/nuestros-parques/pnn-uramba-bahia-malaga/',
      featured: true
    },
    {
      nombre: 'Ruta de Cascadas y Manglares (La Sierpe)',
      precio: '$110.000 COP', precio_sub: 'por persona',
      duracion: '4 horas', tipo_tour: 'Grupal', idioma: 'Espanol',
      max_personas: '12',
      rating: '', review_count: 0,
      descripcion: 'Recorrido por esteros hasta las cascadas La Sierpe y Ostional con tiempo para bano recreativo.',
      incluye: ['Lancha motorizada', 'Guia local', 'Acceso a pozos'],
      no_incluye: ['Almuerzo', 'Hidratacion'],
      link_reserva: 'https://www.parquesnacionales.gov.co/nuestros-parques/pnn-uramba-bahia-malaga/',
      featured: false
    }
  ],
  equipamiento: [
    { item: 'Chaleco salvavidas', prioridad: 'Obligatorio' },
    { item: 'Chaqueta impermeable / Capota', prioridad: 'Obligatorio' },
    { item: 'Calzado acuatico o sandalias sujetas', prioridad: 'Recomendado' },
    { item: 'Bolsa seca para celulares y camaras', prioridad: 'Recomendado' },
    { item: 'Protector solar biodegradable', prioridad: 'Recomendado' }
  ],
  itinerario: [
    { dia: 'Dia 1', hora: '08:00', titulo: 'Salida desde Buenaventura', icono: '\ud83d\udea2', detalle: 'Embarque en el Muelle Turistico en lancha rapida hacia Juanchaco.', tags: ['transporte', 'mar'] },
    { dia: 'Dia 1', hora: '09:15', titulo: 'Registro e induccion ecoturistica', icono: '\ud83d\udccb', detalle: 'Llegada a Juanchaco, registro de ingreso y charla sobre conservacion.', tags: ['conservacion', 'parques'] },
    { dia: 'Dia 1', hora: '10:00', titulo: 'Avistamiento de Ballenas Jorobadas', icono: '\ud83d\udc0b', detalle: 'Recorrido en lancha por la bahia para avistar y escuchar cetaceos.', tags: ['fauna', 'destacado'] },
    { dia: 'Dia 1', hora: '13:00', titulo: 'Almuerzo tipico del Pacifico', icono: '\ud83c\udf72', detalle: 'Degustacion de cazuela de mariscos o pescado frito en Ladrilleros.', tags: ['gastronomia'] },
    { dia: 'Dia 1', hora: '14:30', titulo: 'Excursion a Cascada La Sierpe', icono: '\ud83c\udf0a', detalle: 'Navegacion entre esteros y bano refrescante en caida de agua dulce.', tags: ['cascadas', 'naturaleza'] }
  ],
  dificultad_tags: [
    { texto: 'Apto para familias y adultos mayores', apto: true },
    { texto: 'Apto para personas con movilidad reducida severa', apto: false },
    { texto: 'Requiere caminata exigente en alta montana', apto: false }
  ],
  temporada_matriz: {
    Ene: 'posible', Feb: 'posible', Mar: 'posible', Abr: 'posible', May: 'posible',
    Jun: 'posible', Jul: 'ideal', Ago: 'ideal', Sep: 'ideal', Oct: 'ideal',
    Nov: 'posible', Dic: 'posible'
  }
};

var FAQS = [
  { pregunta: 'Cual es la mejor epoca para ver ballenas en Bahia Malaga?', respuesta: 'Entre mediados de julio y mediados de octubre, siendo agosto y septiembre los meses con mayor presencia de cetaceos.' },
  { pregunta: 'Como se llega a Bahia Malaga desde Cali?', respuesta: 'Viajando por tierra de Cali a Buenaventura (3h) y tomando lancha rapida en el Muelle Turistico hasta Juanchaco (1h).' },
  { pregunta: 'Hay que pagar boleta de entrada al PNN Uramba Bahia Malaga?', respuesta: 'No cobra entrada estatal, pero se paga la tasa de muelle y un aporte ecoturistico comunitario ($20.000 COP aprox.).' },
  { pregunta: 'Es seguro realizar el avistamiento de ballenas?', respuesta: 'Si, utilizando embarcaciones autorizadas con motores ecologicos y guias capacitados por Parques Nacionales.' },
  { pregunta: 'Existen cajeros automaticos en Juanchaco o Ladrilleros?', respuesta: 'No existen cajeros automaticos en la zona. Es indispensable llevar dinero en efectivo suficiente desde Buenaventura.' }
];

module.exports = { SLUG: SLUG, HERO: HERO, PHOTOS: PHOTOS, BASE: BASE, TAGS: TAGS, FAQS: FAQS };

if (require.main !== module) return;

(async function main() {
  var url = process.env.DATABASE_URL || process.argv[2];
  if (!url) {
    console.error('Falta DATABASE_URL.');
    console.error('Uso: DATABASE_URL=postgres://... node scripts/seed-bahia-malaga.js [--dry]');
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

  // FAQs en destinos_detalles
  if (FAQS.length) {
    await sql(
      'INSERT INTO destinos_detalles (destino_id, faqs, creado_en) VALUES ($1,$2,NOW()) '
      + 'ON CONFLICT (destino_id) DO UPDATE SET faqs=EXCLUDED.faqs',
      [id, JSON.stringify(FAQS)]
    ).catch(function(){});
  }

  // Galeria en destinos_fotos (la hero es la foto 0)
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
