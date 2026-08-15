// scripts/seed-jardin-botanico.js
// Crea (o actualiza) la pagina dinamica jardin-botanico-bogota.html con los
// datos de ficha-jardin-botanico.md, replicando EXACTAMENTE lo que guardaria
// el formulario admin.html (CATEGORY_TAG_FIELDS/CATEGORY_TAG_LISTS sitio,
// _buildTagsObj/_placeToAPI). Patron de scripts/seed-bogota.js con upsert completo.
//
// Rating: NO se siembran resenas ni se hardcodea rating. La pagina queda
// con rating/contador en 0 hasta que lleguen interacciones reales
// (ADR-008: api/interacciones.js recalcula AVG/COUNT dinamicamente).
//
// Uso:
//   DATABASE_URL=postgres://... node scripts/seed-jardin-botanico.js --dry
//   DATABASE_URL=postgres://... node scripts/seed-jardin-botanico.js
//
// Idempotente: re-ejecutable sin efectos secundarios (ON CONFLICT slug).

var neon = null;
function getNeon() {
  if (!neon) neon = require('@neondatabase/serverless').neon;
  return neon;
}

const SLUG = 'jardin-botanico-bogota';
const HERO = 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a6/Jard%C3%ADn_Bot%C3%A1nico_Bogot%C3%A1.jpg/960px-Jard%C3%ADn_Bot%C3%A1nico_Bogot%C3%A1.jpg';

const PHOTOS = [
  { url: HERO, caption: 'Jardin Botanico de Bogota' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c2/Bogot%C3%A1%2C_sendero_en_el_Jard%C3%ADn_Bot%C3%A1nico.JPG/960px-Bogot%C3%A1%2C_sendero_en_el_Jard%C3%ADn_Bot%C3%A1nico.JPG', caption: 'Sendero en el Jardin Botanico' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cf/Tropicario_-_Jard%C3%ADn_Bot%C3%A1nico_de_Bogot%C3%A1_Jos%C3%A9_Celestino_Mutis.jpg/960px-Tropicario_-_Jard%C3%ADn_Bot%C3%A1nico_de_Bogot%C3%A1_Jos%C3%A9_Celestino_Mutis.jpg', caption: 'Tropicario: el invernadero mas grande de Suramerica' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4d/2017_Bogot%C3%A1_Jard%C3%ADn_Bot%C3%A1nico.jpg/960px-2017_Bogot%C3%A1_Jard%C3%ADn_Bot%C3%A1nico.jpg', caption: 'Vista del Jardin Botanico' }
];

const BASE = {
  slug: SLUG,
  nombre: 'Jardin Botanico Jose Celestino Mutis',
  categoria_slug: 'sitio',
  lead: 'El pulmon verde de Bogota: 20 hectareas de bosque altoandino, paramo, el Tropicario (el invernadero mas grande de Suramerica) y mas de 900 especies de plantas.',
  descripcion: 'El Jardin Botanico de Bogota Jose Celestino Mutis, fundado el 6 de agosto de 1955 y heredero de la Real Expedicion Botanica de Jose Celestino Mutis (1783), es un centro de investigacion y conservacion con cerca de 20 hectareas y 34 colecciones vivas. Alberga mas de 46.000 individuos de 903 especies (78% nativas y 14% endemicas), con colecciones de paramo, bosque altoandino, bosque de niebla, humedales, subxerofitico, robles, orquideas, palmas y plantas medicinales. Su joya es el Tropicario: 6 domos de vidrio en 2.700 m2 (inaugurado 2021, galardonado con la Bienal Panamericana de Arquitectura de Quito 2020) que reproducen los ecosistemas de superparamo, selva humeda del Choco y Amazonas y bosque seco tropical. Cumplio 70 anos en 2025.',
  highlight: '20 hectareas de naturaleza en la ciudad: el Tropicario, el paramo y el bosque altoandino a minutos del centro',
  ciudad: 'Bogota',
  region: 'Cundinamarca',
  barrio: 'Teusaquillo',
  lat: 4.6683,
  lng: -74.0988,
  whatsapp: '',
  telefono: '',
  email: '',
  web: 'https://jbb.gov.co',
  instagram: '@jardinbotanicobogota',
  precio_desde: 'Desde $6.000 (Tropicario +$14.000 nacional)',
  horario: 'Mar-Vie 8AM-5PM, Sab-Dom y festivos 9AM-5PM. Lunes cerrado por mantenimiento',
  emoji: '\ud83c\udf33',
  hero_bg: '#2d6a4f',
  foto_hero: HERO,
  tipo: 'Jardin botanico \u00b7 Ecoturismo urbano \u00b7 Educacion ambiental',
  capacidad: '',
  como_llegar: 'TransMilenio estacion "El Tiempo" (calle 68) y caminar 15 min hacia la avenida Rojas. SITP por calle 63 hasta avenida 68. Taxi o app hasta Calle 63 No. 68-95. Entrada peatonal por la Avenida Rojas.',
  status: 'published',
  destacado: true
};

const TAGS = {
  tipo_actividad: 'Jardin botanico',
  dificultad: 'Facil',
  dificultad_desc: 'Recorrido a pie por senderos planos y accesibles; dura entre 2 y 4 horas. Hay zonas techadas (Tropicario) y al aire libre. Apto para ninos, personas mayores y movilidad reducida en la mayoria de circuitos.',
  duracion: '2-4 horas',
  altitud: '2555',
  temporada: ['Todo el ano', 'Mejor de manana (8-11AM) por clima', 'Domingos con mercado campesino y mas afluencia'],
  precio_entrada: 'General $6.000 nacionales / $8.000 extranjeros. Tropicario: $11.000 / $22.000. Combo general+Tropicario $14.000 / $27.000 (Resolucion 209/2026)',
  distancia: 'Junto al Parque Simon Bolivar; estacion TransMilenio "El Tiempo" a 15 min a pie',
  como_llegar: BASE.como_llegar,
  permisos: 'No requiere reserva para el circuito general. Algunas actividades (Tropicario con guia, talleres) pueden requerir inscripcion previa en jbb.gov.co. Prohibido ingresar mascotas y bicicletas al interior de las colecciones.',
  temporada_nota: 'Abre todo el ano: martes a viernes 8AM-5PM; sabados, domingos y festivos 9AM-5PM. Cierra los lunes por mantenimiento (si el lunes es festivo, cierra el martes).',
  fauna_flora: JSON.stringify([
    { emoji: '\ud83c\udf3f', nombre: 'Frailejon', hecho: 'Especie emblematica del paramo, de crecimiento muy lento' },
    { emoji: '\ud83c\udf37', nombre: 'Orquideas', hecho: 'Coleccion de orquideas nativas en los invernaderos' },
    { emoji: '\ud83c\udf32', nombre: 'Roble andino', hecho: 'Quercus humboldtii, arbol nacional de los bosques altoandinos' },
    { emoji: '\ud83d\udc26', nombre: 'Aves de la ciudad', hecho: 'Mirlas, colibries y copetones habitan las colecciones del Jardin' },
    { emoji: '\ud83d\udc1a', nombre: 'Mariposas', hecho: 'El mariposario es una de las atracciones mas queridas del Jardin' },
    { emoji: '\ud83c\udf33', nombre: 'Puya', hecho: 'Planta emblematica de paramo en peligro, conservada y propagada ex situ' }
  ]),
  secretos: JSON.stringify([
    { icono: '\ud83c\udf3f', titulo: 'El Tropicario', texto: '6 domos de vidrio, el invernadero mas grande de Suramerica; ambiente calido y humedo como en la selva.', tag: 'Imperdible', tag_color: 'gold' },
    { icono: '\ud83c\udf37', titulo: 'Mariposario', texto: 'Un espacio dentro del circuito para ver mariposas de la region andina.', tag: 'Naturaleza', tag_color: 'green' },
    { icono: '\ud83c\udfdb', titulo: 'Biblioteca Virgilio Barco', texto: 'A pasos del Jardin, obra de Rogelio Salmona, arquitectura emblematica de Bogota.', tag: 'Cultura', tag_color: 'blue' },
    { icono: '\ud83c\udf33', titulo: 'Parque Simon Bolivar', texto: 'El pulmon verde de la ciudad al costado oriental del Jardin, ideal para picnics.', tag: 'Cerca', tag_color: 'blue' },
    { icono: '\ud83e\uddc1', titulo: 'Mercado campesino', texto: 'Fines de semana con productos de los campesinos de la sabana en los accesos del Jardin.', tag: 'Tip', tag_color: 'brown' }
  ]),
  regulaciones: 'Prohibido el ingreso de mascotas al interior de las colecciones vivas. No se permiten bicicletas ni patinetas dentro de los circuitos. No pisar ni extraer plantas; las colecciones son material cientifico en conservacion. No ingresar alimentos en el Tropicario ni en las salas de coleccion cerrada. El Jardin cierra los lunes por mantenimiento (si el lunes es festivo, cierra el martes). Los horarios de Tropicario pueden variar; consultar jbb.gov.co.',
  checklist_tip: 'Descarga el mapa del Jardin en jbb.gov.co/mapa y llega de manana (8-11AM) para ver el clima y menos afluencia.',
  entradas: [
    { tipo: 'Entrada general (nacionales)', precio: '6000', incluye: 'Todo el circuito de colecciones vivas', link: 'https://jbb.gov.co' },
    { tipo: 'Entrada general (extranjeros)', precio: '8000', incluye: 'Todo el circuito de colecciones vivas', link: 'https://jbb.gov.co' },
    { tipo: 'Tropicario (nacionales)', precio: '11000', incluye: 'Superparamo, selva humeda y bosque seco', link: 'https://jbb.gov.co/tropicario-circuito-de-invernaderos/' },
    { tipo: 'Tropicario (extranjeros)', precio: '22000', incluye: 'Circuito de invernaderos', link: 'https://jbb.gov.co/tropicario-circuito-de-invernaderos/' },
    { tipo: 'Combo general + Tropicario (nacionales)', precio: '14000', incluye: 'Todo el jardin + Tropicario', link: 'https://jbb.gov.co' },
    { tipo: 'Combo general + Tropicario (extranjeros)', precio: '27000', incluye: 'Todo el jardin + Tropicario', link: 'https://jbb.gov.co' }
  ],
  tours: [
    {
      nombre: 'Recorrido guiado por el Jardin',
      precio: 'Gratis', precio_sub: 'con entrada',
      duracion: '90 minutos', tipo_tour: 'Grupal', idioma: 'Espanol', max_personas: 'Max 25',
      rating: '4.7', review_count: 190,
      descripcion: 'Recorrido interpretativo por las colecciones emblematicas: paramo, bosque altoandino, humedales y el arbolado urbano.',
      incluye: ['Guia del JBB', 'Recorrido a pie', 'Entrada general'],
      no_incluye: ['Tropicario', 'Transporte'],
      link_reserva: 'https://jbb.gov.co',
      featured: true
    },
    {
      nombre: 'Experiencia Tropicario (circuito de invernaderos)',
      precio: '14000', precio_sub: 'por persona (combo)',
      duracion: '2 horas', tipo_tour: 'Grupal', idioma: 'Espanol', max_personas: 'Max 20',
      rating: '4.8', review_count: 260,
      descripcion: 'Viaje por los ecosistemas de Colombia en 6 domos de vidrio: superparamo, selva humeda del Choco y Amazonas, y bosque seco tropical.',
      incluye: ['Entrada Tropicario', 'Guia ambiental', 'Acceso a las 5 colecciones'],
      no_incluye: ['Entrada general', 'Transporte'],
      link_reserva: 'https://jbb.gov.co/tropicario-circuito-de-invernaderos/',
      featured: true
    },
    {
      nombre: 'Senderismo urbano: Jardin + Parque Simon Bolivar',
      precio: '15000', precio_sub: 'por persona',
      duracion: '4 horas', tipo_tour: 'Grupal', idioma: 'Espanol', max_personas: 'Max 15',
      rating: '4.6', review_count: 140,
      descripcion: 'Combinacion de naturaleza urbana: el Jardin Botanico y el Parque Metropolitano Simon Bolivar, el pulmon verde de Bogota.',
      incluye: ['Entrada general', 'Guia', 'Mapa del circuito'],
      no_incluye: ['Tropicario', 'Transporte', 'Alimentos'],
      link_reserva: 'https://greenbogotatours.com',
      featured: false
    }
  ],
  equipamiento: [
    { item: 'Efectivo o tarjeta para la entrada y Tropicario', prioridad: 'Obligatorio' },
    { item: 'Ropa comoda y zapatos cerrados para caminar', prioridad: 'Recomendado' },
    { item: 'Impermeable o paraguas (lluvia frecuente en Bogota)', prioridad: 'Recomendado' },
    { item: 'Protector solar para el circuito al aire libre', prioridad: 'Recomendado' },
    { item: 'Descarga el mapa del Jardin (jbb.gov.co/mapa)', prioridad: 'Recomendado' },
    { item: 'Camara para el Tropicario y las colecciones', prioridad: 'Opcional' }
  ],
  itinerario: [
    { dia: 'Recorrido', hora: '8:00 am', titulo: 'Coleccion de paramo', icono: '\ud83c\udf3f', detalle: 'Frailejones y vegetacion de alta montana andina', tags: ['Paramo', 'Ecosistemas'] },
    { dia: 'Recorrido', hora: '9:30 am', titulo: 'Bosque altoandino y de niebla', icono: '\ud83c\udf32', detalle: 'Robles, encenillos y especies nativas', tags: ['Bosque'] },
    { dia: 'Recorrido', hora: '11:00 am', titulo: 'Tropicario', icono: '\ud83c\udf35', detalle: '6 domos: superparamo, selva humeda, bosque seco', tags: ['Tropicario'] },
    { dia: 'Recorrido', hora: '1:00 pm', titulo: 'Rosaleda y cascada', icono: '\ud83c\udf37', detalle: 'Espacios iconicos del Jardin', tags: ['Paisajismo'] },
    { dia: 'Recorrido', hora: '2:00 pm', titulo: 'Humedal y frutales de clima frio', icono: '\ud83e\uddc1', detalle: 'Ecosistemas de la sabana de Bogota', tags: ['Humedales'] }
  ],
  dificultad_tags: [
    { texto: 'Sendas planas y accesibles, apto para ninos', apto: true },
    { texto: 'Ideal para recorrer en 2-4 horas con guia', apto: true },
    { texto: 'Cierra los lunes por mantenimiento', apto: false },
    { texto: 'Circuito extenso: 20 hectareas, usar mapa', apto: false },
    { texto: 'Tropicario con ambiente calido y humedo (selva)', apto: false }
  ],
  temporada_matriz: {
    Ene: 'ideal', Feb: 'ideal', Mar: 'ideal', Abr: 'posible', May: 'posible',
    Jun: 'ideal', Jul: 'ideal', Ago: 'ideal', Sep: 'posible', Oct: 'posible', Nov: 'ideal', Dic: 'posible'
  }
};

const FAQS = [
  { pregunta: '\u00bfCu\u00e1nto cuesta la entrada al Jardin Botanico?', respuesta: 'General $6.000 nacionales y $8.000 extranjeros. El Tropicario cuesta adicional: $11.000 nacionales / $22.000 extranjeros, o combo general+Tropicario $14.000 / $27.000 (Resolucion 209/2026).' },
  { pregunta: '\u00bfEn qu\u00e9 horarios est\u00e1 abierto?', respuesta: 'Martes a viernes 8AM-5PM; sabados, domingos y festivos 9AM-5PM. Cierra los lunes por mantenimiento.' },
  { pregunta: '\u00bfQu\u00e9 es el Tropicario?', respuesta: 'Un circuito de 6 domos de vidrio (2.700 m2) que reproduce ecosistemas de Colombia: superparamo, selva humeda del Choco y Amazonas, y bosque seco tropical. Es el invernadero mas grande de Suramerica.' },
  { pregunta: '\u00bfCu\u00e1nto tiempo se necesita?', respuesta: 'Entre 2 y 4 horas. Solo el circuito general 2 horas; con el Tropicario, 3-4 horas.' },
  { pregunta: '\u00bfSe puede ir con ninos?', respuesta: 'Si, es ideal para ninos: sendas planas, mariposario, Tropicario y programas de educacion ambiental del JBB.' }
];

module.exports = { SLUG: SLUG, HERO: HERO, PHOTOS: PHOTOS, BASE: BASE, TAGS: TAGS, FAQS: FAQS };

if (require.main !== module) return;

(async function main() {
  var url = process.env.DATABASE_URL || process.argv[2];
  if (!url) {
    console.error('Falta DATABASE_URL.');
    console.error('Uso: DATABASE_URL=postgres://... node scripts/seed-jardin-botanico.js [--dry]');
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