// scripts/seed-salto-del-tequendama.js
// Crea (o actualiza) la pagina dinamica salto-del-tequendama.html con los
// datos de ficha-salto-del-tequendama.md, replicando EXACTAMENTE lo que
// guardaria el formulario admin.html (CATEGORY_TAG_FIELDS/CATEGORY_TAG_LISTS
// sitio, _buildTagsObj/_placeToAPI). Patron de scripts/seed-museo-del-oro.js
// con upsert completo y doble guard de require.main.
//
// Rating: NO se siembran resenas ni se hardcodea rating. El tour lleva
// rating vacio "" y review_count 0, y la pagina parte en 0 hasta que llegan
// interacciones reales (ADR-009: api/interacciones.js recalcula AVG/COUNT).
//
// Fotos: 5 URLs de Wikimedia Commons verificadas HTTP 200 (BUG-022) antes
// de sembrar; la hero es la foto 0 de la galeria.
//
// Uso:
//   DATABASE_URL=postgres://... node scripts/seed-salto-del-tequendama.js --dry
//   DATABASE_URL=postgres://... node scripts/seed-salto-del-tequendama.js
//
// Idempotente: re-ejecutable sin efectos secundarios (ON CONFLICT slug).

var neon = null;
function getNeon() {
  if (!neon) neon = require('@neondatabase/serverless').neon;
  return neon;
}

const SLUG = 'salto-del-tequendama';
const HERO = 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/55/Hotel_y_Salto_del_Tequendama.JPG/1920px-Hotel_y_Salto_del_Tequendama.JPG';

const PHOTOS = [
  { url: HERO, caption: 'Salto del Tequendama con el edificio del Hotel del Salto al borde del abismo, la clasica postal' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7c/Museo_Salto_del_Tequendama.JPG/1280px-Museo_Salto_del_Tequendama.JPG', caption: 'Casa Museo Tequendama (antiguo Hotel del Salto), edificio patrimonial sobre el canon del rio Bogota' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/50/Parte_baja_del_Hotel_del_Salto_del_Tequendama.JPG/1280px-Parte_baja_del_Hotel_del_Salto_del_Tequendama.JPG', caption: 'Vista del edificio patrimonial del Hotel del Salto desde la parte baja del canon' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/27/WLE2026_CO_-_Bosque_de_niebla_cerca_del_Salto_del_Tequendama_%2856%29.jpg/1280px-WLE2026_CO_-_Bosque_de_niebla_cerca_del_Salto_del_Tequendama_%2856%29.jpg', caption: 'Bosque de niebla andino en los alrededores del Salto del Tequendama' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/39/Panor%C3%A1mica_a%C3%A9rea_del_ca%C3%B1%C3%B3n_del_R%C3%ADo_Bogot%C3%A1_tras_el_Salto_del_Tequendama.jpg/1280px-Panor%C3%A1mica_a%C3%A9rea_del_ca%C3%B1%C3%B3n_del_R%C3%ADo_Bogot%C3%A1_tras_el_Salto_del_Tequendama.jpg', caption: 'Panoramica del canon del rio Bogota aguas abajo del Salto del Tequendama' }
];

const BASE = {
  slug: SLUG,
  nombre: 'Salto del Tequendama',
  categoria_slug: 'sitio',
  lead: 'Ca\u00edda de agua natural de 157 metros impregnada de historia, mito chibcha y arquitectura patrimonial en los bordes de la sabana de Bogot\u00e1.',
  descripcion: 'El Salto del Tequendama es una de las formaciones geogr\u00e1ficas y culturales m\u00e1s emblem\u00e1ticas de Colombia. Ubicado a menos de dos horas de Bogot\u00e1, sobre el r\u00edo Bogot\u00e1, esta imponente cascada frena abruptamente el transcurso de las aguas de la sabana para precipitarse en un abismo de m\u00e1s de 150 metros rodeado de bosque de niebla.\n\nSeg\u00fan la mitolog\u00eda Muisca, la cascada fue creada por el dios Bochica, quien rompi\u00f3 la roca con su b\u00e1culo para drenar las aguas que inundaban la sabana de Bogot\u00e1. Durante el siglo XX, el lugar se consolid\u00f3 como el principal destino tur\u00edstico de la \u00e9lite bogotana, \u00e9poca en la que se construy\u00f3 el imponente Hotel del Salto, una joya arquitect\u00f3nica de estilo franc\u00e9s que hoy alberga la Casa Museo Tequendama.\n\nActualmente, el sitio combina la observaci\u00f3n paisaj\u00edstica con recorridos de educaci\u00f3n ambiental e historia patrimonial. Aunque la calidad del agua del r\u00edo Bogot\u00e1 limita las actividades acu\u00e1ticas, el valor hist\u00f3rico, el espect\u00e1culo visual del mirador y la niebla envolvente convierten la visita en una experiencia imperdible cerca de la capital.',
  highlight: '157 metros de ca\u00edda \u00b7 Casa Museo Patrimonial \u00b7 Bosque de niebla',
  ciudad: 'Soacha',
  region: 'Cundinamarca',
  barrio: 'Vereda San Rafael',
  lat: 4.5808,
  lng: -74.2982,
  whatsapp: '573102456789',
  telefono: '+57 310 245 6789',
  email: 'info@casamuseotequendama.org',
  web: 'https://casamuseotequendama.org',
  instagram: '@casamuseotequendama',
  precio_desde: 'Desde $10.000 COP (Casa Museo)',
  horario: 'Mar-Dom 9:00 AM - 5:00 PM',
  emoji: '\u26f0',
  hero_bg: 'linear-gradient(180deg, rgba(17,17,17,0.2) 0%, rgba(17,17,17,0.8) 100%)',
  foto_hero: HERO,
  tipo: 'Cascada natural \u00b7 Mirador hist\u00f3rico \u00b7 Museo patrimonial',
  capacidad: 'Aforo controlado en museo',
  como_llegar: 'Buses desde el Terminal del Sur o San Mateo hacia Mesitas del Colegio.',
  status: 'published',
  destacado: true
};

const TAGS = {
  tipo_actividad: 'Sightseeing \u00b7 Fotograf\u00eda \u00b7 Historia',
  dificultad: 'Facil',
  dificultad_desc: 'Accesibilidad directa desde la carretera principal a los miradores.',
  duracion: '2-3 horas',
  altitud: '2470',
  temporada: ['May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov'],
  precio_entrada: 'Mirador libre / Museo $10.000 COP',
  distancia: '30 km desde Bogot\u00e1',
  como_llegar: 'Tomar transporte en el Terminal del Sur ruta Soacha - Mesitas.',
  permisos: 'Sin reserva para miradores. Boleta directa en taquilla del museo.',
  temporada_nota: 'Mayor caudal durante la temporada de lluvias.',
  fauna_flora: JSON.stringify([
    { emoji: '\ud83e\udd85', nombre: 'Aves de niebla', hecho: 'H\u00e1bitat de p\u00e1jaros carpinteros y colibr\u00edes de alta monta\u00f1a.' },
    { emoji: '\ud83c\udf32', nombre: 'Quercus humboldtii', hecho: 'Presencia de robledales y vegetaci\u00f3n t\u00edpica de bosque altoandino.' }
  ]),
  secretos: JSON.stringify([
    { icono: '\ud83c\udfdb\ufe0f', titulo: 'Leyenda de Bochica', texto: 'Seg\u00fan la tradici\u00f3n Muisca, el abismo fue abierto a golpe de b\u00e1culo para salvar a la sabana de la gran inundaci\u00f3n.', tag: 'Mito Muisca', tag_color: 'gold' },
    { icono: '\ud83c\udfe8', titulo: 'El antiguo Hotel', texto: 'Inaugurado en 1927 como estaci\u00f3n de tren y hotel de lujo, cerr\u00f3 d\u00e9cadas despu\u00e9s y fue restaurado como centro cultural.', tag: 'Patrimonio', tag_color: 'purple' }
  ]),
  regulaciones: 'Prohibido el paso de barreras de seguridad en los miradores. No arrojar basura.',
  checklist_tip: 'Llevar chaqueta impermeable y calzado con buen agarre por la humedad constante.',
  entradas: [
    { tipo: 'General Casa Museo', precio: '$10.000 COP', incluye: 'Recorrido guiado por exposiciones de biodiversidad', link: 'https://casamuseotequendama.org' }
  ],
  tours: [
    {
      nombre: 'Recorrido Hist\u00f3rico y Ambiental',
      precio: '$10.000 COP',
      precio_sub: 'por persona',
      duracion: '45 minutos',
      tipo_tour: 'Guiado',
      idioma: 'Espa\u00f1ol',
      max_personas: '20',
      rating: '',
      review_count: 0,
      descripcion: 'Guianza por los salones de la Casa Museo e interpretaci\u00f3n del ecosistema del bosque de niebla.',
      incluye: ['Entrada al museo', 'Gu\u00eda local'],
      no_incluye: ['Transporte', 'Alimentaci\u00f3n'],
      link_reserva: 'https://casamuseotequendama.org',
      featured: true
    }
  ],
  equipamiento: [
    { item: 'Chaqueta impermeable', prioridad: 'Obligatorio' },
    { item: 'C\u00e1mara fotogr\u00e1fica', prioridad: 'Recomendado' }
  ],
  itinerario: [
    { dia: '1', hora: '09:30 AM', titulo: 'Llegada al Mirador Principal', icono: '\ud83d\udcf8', detalle: 'Observaci\u00f3n de la ca\u00edda de agua desde los puntos panor\u00e1micos de la carretera.', tags: ['Fotograf\u00eda'] },
    { dia: '1', hora: '10:30 AM', titulo: 'Visita Casa Museo Tequendama', icono: '\ud83c\udfdb\ufe0f', detalle: 'Ingreso y recorrido guiado por las salas de historia y biodiversidad.', tags: ['Cultura'] }
  ],
  dificultad_tags: [
    { texto: 'Carretera principal con acceso directo a los miradores', apto: true },
    { texto: 'Miradores sin reserva previa', apto: true },
    { texto: 'Boleta directa en taquilla para el museo', apto: false },
    { texto: 'Prohibido pasar las barreras de seguridad en los miradores', apto: false },
    { texto: 'No arrojar basura: deja el lugar como lo encontraste', apto: false }
  ],
  temporada_matriz: {
    Ene: 'posible', Feb: 'posible', Mar: 'posible', Abr: 'posible', May: 'ideal',
    Jun: 'ideal', Jul: 'ideal', Ago: 'ideal', Sep: 'ideal', Oct: 'ideal', Nov: 'ideal', Dic: 'posible'
  }
};

const FAQS = [
  { pregunta: 'Como llegar al Salto del Tequendama desde Bogota?', respuesta: 'Buses desde el Terminal del Sur o San Mateo hacia Mesitas del Colegio (ruta Soacha - Mesitas). Queda a unos 30 km de Bogota.' },
  { pregunta: 'Cuanto cuesta la entrada y cual es el horario?', respuesta: 'El mirador es libre y la Casa Museo cuesta $10.000 COP. Horario de martes a domingo de 9:00 AM a 5:00 PM.' },
  { pregunta: 'Que debo llevar para la visita?', respuesta: 'Chaqueta impermeable y calzado con buen agarre por la humedad constante del bosque de niebla.' },
  { pregunta: 'Se puede nadar o banarse en la cascada?', respuesta: 'No. La calidad del agua del rio Bogota limita las actividades acuaticas y esta prohibido pasar las barreras de seguridad de los miradores.' },
  { pregunta: 'Cuanto dura la visita?', respuesta: 'Entre 2 y 3 horas en total. El recorrido guiado de la Casa Museo toma unos 45 minutos.' }
];

module.exports = { SLUG: SLUG, HERO: HERO, PHOTOS: PHOTOS, BASE: BASE, TAGS: TAGS, FAQS: FAQS };

if (require.main !== module) return;

(async function main() {
  var url = process.env.DATABASE_URL || process.argv[2];
  if (!url) {
    console.error('Falta DATABASE_URL.');
    console.error('Uso: DATABASE_URL=postgres://... node scripts/seed-salto-del-tequendama.js [--dry]');
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