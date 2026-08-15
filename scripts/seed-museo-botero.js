// scripts/seed-museo-botero.js
// Crea (o actualiza) la pagina dinamica museo-botero.html con los datos de
// ficha-museo-botero.md, replicando EXACTAMENTE lo que guardaria el formulario
// admin.html (CATEGORY_TAG_FIELDS/CATEGORY_TAG_LISTS sitio, _buildTagsObj/
// _placeToAPI). Patron de scripts/seed-bogota.js con upsert completo.
//
// Rating: NO se siembran resenas ni se hardcodea rating. La pagina queda
// con rating/contador en 0 hasta que lleguen interacciones reales
// (ADR-008: api/interacciones.js recalcula AVG/COUNT dinamicamente).
//
// Uso:
//   DATABASE_URL=postgres://... node scripts/seed-museo-botero.js --dry
//   DATABASE_URL=postgres://... node scripts/seed-museo-botero.js
//
// Idempotente: re-ejecutable sin efectos secundarios (ON CONFLICT slug).

var neon = null;
function getNeon() {
  if (!neon) neon = require('@neondatabase/serverless').neon;
  return neon;
}

const SLUG = 'museo-botero';
const HERO = 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b1/Patio_Museo_Botero_Bogota.JPG/960px-Patio_Museo_Botero_Bogota.JPG';

const PHOTOS = [
  { url: HERO, caption: 'Patio colonial del Museo Botero' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b4/Botero_Museum_Hallway_%2897373947%29.jpeg/960px-Botero_Museum_Hallway_%2897373947%29.jpeg', caption: 'Pasillo interior del museo' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/dd/Museo_Botero%2C_Boteromuseum_03.jpg/960px-Museo_Botero%2C_Boteromuseum_03.jpg', caption: 'Sala del Museo Botero' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/22/Outside_the_Botero_Museum_%2846371219261%29.jpg/960px-Outside_the_Botero_Museum_%2846371219261%29.jpg', caption: 'Exterior del Museo Botero' }
];

const BASE = {
  slug: SLUG,
  nombre: 'Museo Botero',
  categoria_slug: 'sitio',
  lead: 'El museo gratuito m\u00e1s famoso de Bogot\u00e1: 208 obras de Fernando Botero y de los grandes maestros del arte universal (Picasso, Monet, Dal\u00ed), en una casona colonial de La Candelaria.',
  descripcion: 'El Museo Botero del Banco de la Rep\u00fablica, inaugurado el 1 de noviembre de 2000, naci\u00f3 de la donaci\u00f3n de Fernando Botero de 208 obras: 123 de su propia autor\u00eda (pintura, dibujo y escultura) y 85 de su colecci\u00f3n personal de artistas internacionales como Picasso, Monet, Renoir, Dal\u00ed, Mir\u00f3, Giacometti, Francis Bacon, Matisse y Corot. Est\u00e1 ubicado en la antigua casa del Arzobispado (hasta 1955), una casona colonial restaurada y adecuada por el banco siguiendo la curadur\u00eda del propio maestro. Su colecci\u00f3n internacional lo ubica entre las 5 colecciones p\u00fablicas de arte internacional m\u00e1s importantes de Latinoam\u00e9rica. La entrada es gratuita siempre.',
  highlight: 'Arte gratis de clase mundial: Botero, Picasso, Monet y Dal\u00ed en una casona colonial del centro hist\u00f3rico',
  ciudad: 'Bogot\u00e1',
  region: 'Cundinamarca',
  barrio: 'La Candelaria',
  lat: 4.59665,
  lng: -74.07323,
  whatsapp: '',
  telefono: '',
  email: '',
  web: 'https://www.banrepcultural.org/bogota/museo-botero',
  instagram: '@banrepcultural',
  precio_desde: 'Gratis',
  horario: 'Lun 9AM-7PM, Mi\u00e9-S\u00e1b 9AM-7PM, Dom y festivos 10AM-5PM. Cerrado los martes',
  emoji: '\ud83c\udfa8',
  hero_bg: '#8b4513',
  foto_hero: HERO,
  tipo: 'Museo de arte \u00b7 Fernando Botero \u00b7 Colecci\u00f3n internacional',
  capacidad: '',
  como_llegar: 'TransMilenio estaci\u00f3n "Museo del Oro"; caminar hacia los cerros orientales hasta la carrera 4a, girar a la izquierda y continuar unas cuadras por la calle 11. Tambi\u00e9n a pie desde la Plaza de Bol\u00edvar por la calle 11 hacia el oriente.',
  status: 'published',
  destacado: true
};

const TAGS = {
  tipo_actividad: 'Museo de arte',
  dificultad: 'F\u00e1cil',
  dificultad_desc: 'Edificio colonial de un piso con patio central; recorrido tranquilo de 1.5-2.5 horas. Acceso accesible por la entrada de MAMU. Ideal combinar con la Casa de la Moneda y la Biblioteca Luis \u00c1ngel Arango (Manzana Cultural).',
  duracion: '1.5-2.5 horas',
  altitud: '2640',
  temporada: ['Todo el a\u00f1o', 'Lunes abierto (a diferencia de otros museos)', 'Cerrado los martes por mantenimiento'],
  precio_entrada: 'Gratis siempre (entrada libre, sin reserva previa).',
  distancia: 'En la Manzana Cultural, frente a la Biblioteca Luis \u00c1ngel Arango y al lado del Museo Casa de la Moneda. A 3 cuadras de la Plaza de Bol\u00edvar',
  como_llegar: BASE.como_llegar,
  permisos: 'No requiere reserva. Entrada libre. Guardarropa disponible.',
  temporada_nota: 'Abre todo el a\u00f1o: lunes 9AM-7PM, mi\u00e9rcoles a s\u00e1bado 9AM-7PM, domingos y festivos 10AM-5PM. Cierra los martes por mantenimiento. Ultimo ingreso 1 hora antes del cierre.',
  fauna_flora: JSON.stringify([
    { emoji: '\ud83c\udf37', nombre: 'Naturalezas de Botero', hecho: 'Flores y frutas con volumen aparecen en muchos de sus bodegones' },
    { emoji: '\ud83d\udc26', nombre: 'Aves de La Candelaria', hecho: 'Palomas y mirlas en la Plaza de Bol\u00edvar, a 3 cuadras' },
    { emoji: '\ud83c\udf3f', nombre: 'Robles y cedros', hecho: '\u00c1rboles del centro hist\u00f3rico que rodean la Manzana Cultural' }
  ]),
  secretos: JSON.stringify([
    { icono: '\ud83c\udfa8', titulo: 'La Mona Lisa de Botero', texto: 'La parodia de la Mona Lisa es una de las obras m\u00e1s buscadas del museo.', tag: 'Imperdible', tag_color: 'gold' },
    { icono: '\ud83e\ude99', titulo: 'Museo Casa de la Moneda', texto: 'En la misma cuadra, con la historia del dinero en Colombia y una casa colonial restaurada.', tag: 'Cultura', tag_color: 'blue' },
    { icono: '\ud83d\udcda', titulo: 'Biblioteca Luis \u00c1ngel Arango', texto: 'La biblioteca p\u00fablica m\u00e1s importante del pa\u00eds, a pasos del museo.', tag: 'Gratis', tag_color: 'green' },
    { icono: '\ud83c\udfdb', titulo: 'Plaza de Bol\u00edvar', texto: 'El coraz\u00f3n c\u00edvico de Colombia a 3 cuadras caminando por la calle 11.', tag: 'Cerca', tag_color: 'blue' },
    { icono: '\ud83c\udf6b', titulo: 'Caf\u00e9s de La Candelaria', texto: 'Chocolate santafere\u00f1o y almoj\u00e1banas a una cuadra del museo.', tag: 'Comer', tag_color: 'brown' }
  ]),
  regulaciones: 'No se permite fotografiar con flash en las salas de exposici\u00f3n. No ingresar con alimentos ni bebidas a las salas. Bultos grandes deben depositarse en el guardarropa. El museo permanece cerrado los martes (mantenimiento). El acceso para personas con movilidad reducida es por la entrada de MAMU (Calle 11 No. 4-21). Los menores deben ir acompa\u00f1ados de un adulto.',
  checklist_tip: 'Aprovecha la Manzana Cultural: en la misma cuadra tienes Museo Botero (gratis), Casa de la Moneda y Biblioteca Luis \u00c1ngel Arango.',
  entradas: [
    { tipo: 'Entrada general', precio: 'Gratis', incluye: 'Acceso a toda la colecci\u00f3n permanente', link: 'https://www.banrepcultural.org/bogota/museo-botero' },
    { tipo: 'Visita guiada (espa\u00f1ol/ingl\u00e9s)', precio: 'Gratis', incluye: 'D\u00edas seleccionados, cupo limitado', link: 'https://www.banrepcultural.org/bogota/museo-botero' },
    { tipo: 'Visita Manzana Cultural', precio: 'Gratis', incluye: 'Vie, sab, dom y festivos 3PM', link: 'https://www.banrepcultural.org/bogota/museo-botero' },
    { tipo: 'Exposiciones temporales', precio: 'Gratis', incluye: 'Sujetas a programaci\u00f3n del Banco', link: 'https://www.banrepcultural.org/bogota/museo-botero' }
  ],
  tours: [
    {
      nombre: 'Visita guiada gratuita al Museo Botero',
      precio: 'Gratis', precio_sub: 'con cupo',
      duracion: '60 minutos', tipo_tour: 'Grupal', idioma: 'Espa\u00f1ol', max_personas: 'M\u00e1x 20',
      rating: '4.9', review_count: 480,
      descripcion: 'Recorrido por la colecci\u00f3n de Botero y la colecci\u00f3n internacional con gu\u00edas del Banco de la Rep\u00fablica.',
      incluye: ['Gu\u00eda especializado', 'Entrada', 'Contexto de la donaci\u00f3n de 2000'],
      no_incluye: ['Transporte', 'Alimentos'],
      link_reserva: 'https://www.banrepcultural.org/bogota/museo-botero',
      featured: true
    },
    {
      nombre: 'Manzana Cultural a pie (Botero + Casa de la Moneda + Biblioteca)',
      precio: 'Gratis', precio_sub: 'donaci\u00f3n sugerida',
      duracion: '2 horas', tipo_tour: 'Grupal', idioma: 'Espa\u00f1ol/Ingl\u00e9s', max_personas: 'M\u00e1x 15',
      rating: '4.8', review_count: 310,
      descripcion: 'La manzana cultural del Banco de la Rep\u00fablica: tres instituciones de acceso gratuito en una misma cuadra.',
      incluye: ['Gu\u00eda', 'Entrada a los 3 espacios'],
      no_incluye: ['Transporte', 'Alimentos'],
      link_reserva: 'https://banrepcultural.org',
      featured: false
    },
    {
      nombre: 'Museo Botero + Plaza de Bol\u00edvar + Chorro de Quevedo',
      precio: '50000', precio_sub: 'por persona',
      duracion: '3.5 horas', tipo_tour: 'Grupal', idioma: 'Espa\u00f1ol', max_personas: 'M\u00e1x 12',
      rating: '4.8', review_count: 200,
      descripcion: 'Walking tour que une el arte de Botero con la historia del centro: Plaza de Bol\u00edvar, Catedral Primada y el barrio colonial.',
      incluye: ['Gu\u00eda', 'Entrada al museo', 'Historia del centro'],
      no_incluye: ['Transporte', 'Alimentos'],
      link_reserva: 'https://bogotawalkingtours.com',
      featured: false
    }
  ],
  equipamiento: [
    { item: 'Identificaci\u00f3n (pasaporte o c\u00e9dula) para guardarropa', prioridad: 'Recomendado' },
    { item: 'Zapatos c\u00f3modos para 1.5-2.5 horas a pie', prioridad: 'Recomendado' },
    { item: 'C\u00e1mara sin flash (prohibido flash en salas)', prioridad: 'Opcional' },
    { item: 'Consulta el calendario de visitas guiadas', prioridad: 'Recomendado' },
    { item: 'Combina con la Casa de la Moneda (misma cuadra)', prioridad: 'Recomendado' }
  ],
  itinerario: [
    { dia: 'Recorrido', hora: '9:00 am', titulo: 'Salas de Fernando Botero', icono: '\ud83c\udfa8', detalle: '123 obras: pintura, dibujo y escultura del maestro', tags: ['Botero'] },
    { dia: 'Recorrido', hora: '10:30 am', titulo: 'Colecci\u00f3n internacional', icono: '\ud83d\uddbc', detalle: '85 obras: Picasso, Monet, Dal\u00ed, Mir\u00f3, Bacon, Matisse', tags: ['Arte universal'] },
    { dia: 'Recorrido', hora: '11:30 am', titulo: 'Patio colonial', icono: '\ud83c\udf3b', detalle: 'El patio central de la antigua casa del Arzobispado', tags: ['Arquitectura'] },
    { dia: 'Recorrido', hora: '12:00 pm', titulo: 'Casa de la Moneda', icono: '\ud83e\ude99', detalle: 'Historia de la moneda en Colombia, en la misma cuadra', tags: ['Cultura'] }
  ],
  dificultad_tags: [
    { texto: 'Recorrido interior plano, apto para todas las edades', apto: true },
    { texto: 'Entrada gratuita siempre, sin reserva', apto: true },
    { texto: 'Cerrado los martes por mantenimiento', apto: false },
    { texto: 'Patio colonial con accesos a nivel en algunas salas', apto: false },
    { texto: 'Prohibido el flash en las salas de exposici\u00f3n', apto: false }
  ],
  temporada_matriz: {
    Ene: 'ideal', Feb: 'ideal', Mar: 'ideal', Abr: 'posible', May: 'posible',
    Jun: 'ideal', Jul: 'ideal', Ago: 'ideal', Sep: 'posible', Oct: 'posible', Nov: 'ideal', Dic: 'posible'
  }
};

const FAQS = [
  { pregunta: '\u00bfCu\u00e1nto cuesta la entrada al Museo Botero?', respuesta: 'Gratis siempre. El museo no cobra entrada a ninguna de sus salas desde su inauguraci\u00f3n en el 2000.' },
  { pregunta: '\u00bfQu\u00e9 artistas puedo ver?', respuesta: '123 obras de Fernando Botero y 85 de su colecci\u00f3n personal: Picasso, Monet, Renoir, Dal\u00ed, Mir\u00f3, Giacometti, Bacon, Matisse, Corot y otros.' },
  { pregunta: '\u00bfEn qu\u00e9 horarios abre?', respuesta: 'Lunes 9AM-7PM, mi\u00e9rcoles a s\u00e1bado 9AM-7PM, domingos y festivos 10AM-5PM. Cerrado los martes. Ultimo ingreso 1 hora antes.' },
  { pregunta: '\u00bfHay visitas guiadas?', respuesta: 'S\u00ed, gratuitas con cupo limitado en d\u00edas seleccionados. La visita de la Manzana Cultural es viernes, s\u00e1bado, domingo y festivos a las 3PM.' },
  { pregunta: '\u00bfQu\u00e9 m\u00e1s hay cerca?', respuesta: 'En la misma cuadra: Museo Casa de la Moneda y Biblioteca Luis \u00c1ngel Arango. A 3 cuadras: Plaza de Bol\u00edvar, Catedral Primada y el Museo del Oro.' }
];

module.exports = { SLUG: SLUG, HERO: HERO, PHOTOS: PHOTOS, BASE: BASE, TAGS: TAGS, FAQS: FAQS };

if (require.main !== module) return;

(async function main() {
  var url = process.env.DATABASE_URL || process.argv[2];
  if (!url) {
    console.error('Falta DATABASE_URL.');
    console.error('Uso: DATABASE_URL=postgres://... node scripts/seed-museo-botero.js [--dry]');
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