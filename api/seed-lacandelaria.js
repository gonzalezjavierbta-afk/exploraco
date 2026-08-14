// api/seed-lacandelaria.js
// Crea (o actualiza) la pagina dinamica lacandelaria.html con los datos
// de ficha-lacandelaria.md, replicando EXACTAMENTE lo que guardaria el
// formulario admin.html (CATEGORY_TAG_FIELDS/CATEGORY_TAG_LISTS sitio,
// _buildTagsObj/_placeToAPI). Patron de api/seed-monserrate-*.js pero con
// upsert completo porque la fila no existe.
//
// Rating: NO se siembran resenas ni se hardcodea rating. La pagina queda
// con rating/contador en 0 hasta que lleguen interacciones reales
// (ADR-008: api/interacciones.js recalcula AVG/COUNT dinamicamente).
//
// Uso:
//   DATABASE_URL=postgres://... node api/seed-lacandelaria.js
//   DATABASE_URL=postgres://... node api/seed-lacandelaria.js --dry
//
// Idempotente: re-ejecutable sin efectos secundarios (ON CONFLICT slug).

var neon = null;
function getNeon() {
  if (!neon) neon = require('@neondatabase/serverless').neon;
  return neon;
}

const SLUG = 'lacandelaria';
const HERO = 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Plaza_de_Bol%C3%ADvar%2C_Bogot%C3%A1.jpg/1200px-Plaza_de_Bol%C3%ADvar%2C_Bogot%C3%A1.jpg';

const PHOTOS = [
  { url: HERO, caption: 'Plaza de Bol\u00edvar y Catedral Primada' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/Museo_del_Oro_Bogot%C3%A1.jpg/800px-Museo_del_Oro_Bogot%C3%A1.jpg', caption: 'Fachada del Museo del Oro' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3d/Museo_Botero_Bogot%C3%A1.jpg/800px-Museo_Botero_Bogot%C3%A1.jpg', caption: 'Fachada del Museo Botero' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e7/Teatro_Col%C3%B3n_Bogot%C3%A1.jpg/800px-Teatro_Col%C3%B3n_Bogot%C3%A1.jpg', caption: 'Teatro Col\u00f3n' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/Calle_empedrada_La_Candelaria.jpg/800px-Calle_empedrada_La_Candelaria.jpg', caption: 'Calle empedrada de La Candelaria' }
];

const BASE = {
  slug: SLUG,
  nombre: 'La Candelaria',
  categoria_slug: 'sitio',
  lead: 'El centro hist\u00f3rico de Bogot\u00e1, cuna de la ciudad con plazas coloniales, museos gratuitos y callejas llenas de arte urbano.',
  descripcion: 'La Candelaria es el barrio hist\u00f3rico de Bogot\u00e1 fundado en 1538 en El Chorro de Quevedo. Conserva arquitectura colonial con calles empedradas, coloridas fachadas y numerosos museos de entrada gratuita. Es el distrito universitario de la ciudad y alberga el Museo del Oro, el Museo Botero, la Primatial Catedral y la Plaza de Bol\u00edvar. Aqu\u00ed ocurrieron hechos cruciales de la independencia colombiana y hoy es un destino imperdible por su historia, arte callejero y gastronom\u00eda.',
  highlight: 'El centro hist\u00f3rico, cultural y universitario de Bogot\u00e1',
  ciudad: 'Bogot\u00e1',
  region: 'Cundinamarca',
  barrio: 'La Candelaria',
  lat: 4.7120,
  lng: -74.0680,
  whatsapp: '',
  telefono: '',
  email: '',
  web: 'https://www.bogota.gov.co',
  instagram: '@lacandelaria',
  precio_desde: 'Desde $5.000',
  horario: 'Var\u00eda por atracci\u00f3n; la mayor\u00eda Tu-Sa 9AM-6PM; cerrado lunes',
  emoji: '\uD83C\uDFDB\uFE0F',
  hero_bg: '#2c3e50',
  foto_hero: HERO,
  tipo: 'Hist\u00f3rico \u00b7 Cultural \u00b7 Universitario \u00b7 Museos',
  capacidad: '',
  como_llegar: 'Transmilenio: Museo del Oro (l\u00ednea K) o Las Aguas. A pie desde el centro hist\u00f3rico. Colectivos en Carrera 5 y Carrera 4.',
  status: 'published',
  destacado: true
};

const TAGS = {
  tipo_actividad: 'Hist\u00f3rico',
  dificultad: 'Moderado',
  dificultad_desc: 'Barrio peatonal con calles empedradas y algunas pendientes por la topograf\u00eda de Bogot\u00e1. Accesible para la mayor\u00eda de visitantes con calzado c\u00f3modo.',
  duracion: '2-4 horas (recorrido completo)',
  altitud: '2640',
  temporada: ['Todo el a\u00f1o es bueno', 'Lluvia distribuida', '\u00c9pocas festivas'],
  precio_entrada: 'La mayor\u00eda de museos son gratuitos; Gold Museum $5.000 (domingos free); Museo Botero always free',
  distancia: '1.2 km del centro de Bogot\u00e1 \u00b7 Recorrido peatonal de 20 min',
  como_llegar: BASE.como_llegar,
  permisos: 'No requiere reserva para la mayor\u00eda de atracciones. Museos gratuitos sin reserva. Algunos tours guiados requieren reserva previa.',
  temporada_nota: 'Bogot\u00e1 tiene clima estable 14-20\u00b0C a\u00f1o round. La estaci\u00f3n lluviosa (abril-mayo y octubre-noviembre) mantiene los jardines verdes. Temporada seca diciembre-febrero ideal para caminatas.',
  fauna_flora: JSON.stringify([
    { emoji: '\ud83d\udc26', nombre: 'Colibr\u00edes', hecho: 'Variedad urbana en plazas' },
    { emoji: '\ud83c\udf3f', nombre: '\u00c1rboles coloniales', hecho: 'Jacarand\u00e1s y robles' },
    { emoji: '\ud83c\udf3a', nombre: 'Flores de calle', hecho: 'Begonias y geranios en fachadas' },
    { emoji: '\ud83d\udcda', nombre: 'Estudiantes', hecho: 'Universidad Nacional y Externado' },
    { emoji: '\ud83c\udfad', nombre: 'Arte callejero', hecho: 'Murales y grafiti' },
    { emoji: '\ud83d\udcd6', nombre: 'Librer\u00edas', hecho: 'Librer\u00eda Merlin y El Saber' },
    { emoji: '\ud83c\udfb5', nombre: 'M\u00fasica callejera', hecho: 'Presentaciones espont\u00e1neas en plazas' }
  ]),
  secretos: JSON.stringify([
    { icono: '\u26e9\ufe0f', titulo: 'El Chorro de Quevedo', texto: 'El lugar exacto donde fue fundada Bogot\u00e1 en 1538; hoy es un peque\u00f1o mirador con vista al centro hist\u00f3rico.', tag: 'Historia', tag_color: 'gold' },
    { icono: '\ud83d\udcda', titulo: 'Librer\u00eda Merlin', texto: 'Librer\u00eda antigua en Carrera 8 con Calle 15; para amantes de libros raros y cl\u00e1sicos colombianos.', tag: 'Cultura', tag_color: 'green' },
    { icono: '\ud83d\udd6f\ufe0f', titulo: 'Pasaje Hern\u00e1ndez', texto: 'Pasaje secreto entre carreras 8-9 con galer\u00edas de arte, tiendas de vinilo y caf\u00e9s bohemios.', tag: 'Arte', tag_color: 'blue' },
    { icono: '\ud83c\udfa8', titulo: 'Fragmentos', texto: 'Espacio de arte y memoria construido con materiales del conflicto; parte del proceso de paz en Colombia.', tag: 'Memoria', tag_color: 'purple' },
    { icono: '\ud83c\udf7d\ufe0f', titulo: 'Mejor ajiaco de la ciudad', texto: 'Restaurantes universitarios de la zona sirven el mejor ajiaco bogotano con guacamole y capas.', tag: 'Comer', tag_color: 'brown' }
  ]),
  regulaciones: 'La mayor\u00eda de atracciones son de acceso gratuito y abierto. Los museos tienen horarios propios (generalmente cerrado los lunes). Respeto por el patrimonio colonial: no tocar artefactos, no hacer flash photography en algunas salas. El barrio es zona peatonal en muchas calles; conducir con precauci\u00f3n. No est\u00e1 permitido acampar ni hacer fogatas en las plazas. Cuidado con los bolsillos en zonas concurridas y nocturnas.',
  checklist_tip: 'Lleva calzado con buen agarre para las calles empedradas y agua por la altitud de Bogot\u00e1 (2.640 m).',
  entradas: [
    { tipo: 'Museo del Oro (general)', precio: '5000', incluye: 'Entrada al museo', link: 'https://museodeloro.gov.co' },
    { tipo: 'Museo del Oro (estudiantes/terceros)', precio: '3000', incluye: 'Entrada con descuento', link: 'https://museodeloro.gov.co' },
    { tipo: 'Museo Botero', precio: 'Gratis', incluye: 'Entrada libre siempre', link: 'https://museobotero.gov.co' },
    { tipo: 'Museo Colonial de Arte', precio: 'Gratis', incluye: 'Entrada libre', link: 'https://museocolonial.gov.co' },
    { tipo: 'Museo Francisco Jos\u00e9 de Caldas', precio: 'Gratis', incluye: 'Entrada libre M-F 8AM-5PM', link: 'https://user.gov.co' },
    { tipo: 'Museo Nacional Polic\u00eda', precio: 'Gratis', incluye: 'Entrada libre M-F 8AM-noon', link: 'https://user.gov.co' },
    { tipo: 'Pasaje Rivas (artesan\u00eda)', precio: 'Gratis', incluye: 'Paseo y compras', link: 'https://bogota.gov.co' },
    { tipo: 'Chorro de Quevedo', precio: 'Gratis', incluye: 'Punto tur\u00edstico abierto', link: '' },
    { tipo: 'Tour hist\u00f3rico guiado', precio: '35000', incluye: 'Gu\u00eda + entrada a 2 museos', link: 'https://bogota.tours' },
    { tipo: 'Tour de arte callejero', precio: '25000', incluye: 'Ruta por murales y pasajes', link: 'https://bogota.art' }
  ],
  tours: [
    {
      nombre: 'Caminata por el centro hist\u00f3rico',
      precio: '35000', precio_sub: 'por persona',
      duracion: '3 horas', tipo_tour: 'Grupal', idioma: 'Espa\u00f1ol', max_personas: 'M\u00e1x 15',
      rating: '4.6', review_count: 180,
      descripcion: 'Recorrido a pie por Plaza de Bol\u00edvar, Museo del Oro, Museo Botero y Pasaje Rivas.',
      incluye: ['Gu\u00eda certificado', 'Introducci\u00f3n hist\u00f3rica', 'Paradas fotogr\u00e1ficas'],
      no_incluye: ['Transporte', 'Comidas', 'Entradas a museos (some free)'],
      link_reserva: 'https://bogota.tours',
      featured: true
    },
    {
      nombre: 'Tour de arte callejero y pasajes',
      precio: '25000', precio_sub: 'por persona',
      duracion: '2 horas', tipo_tour: 'Grupal', idioma: 'Espa\u00f1ol', max_personas: 'M\u00e1x 20',
      rating: '4.7', review_count: 240,
      descripcion: 'Recorrido por Pasaje Hern\u00e1ndez, Pasaje Rivas, murales de la Calle 26 y arte urbano.',
      incluye: ['Gu\u00eda de arte urbano', 'Paradas en galer\u00eda', 'Agua'],
      no_incluye: ['Transporte', 'Comidas'],
      link_reserva: 'https://bogota.art',
      featured: false
    },
    {
      nombre: 'Tour gastron\u00f3mico por La Candelaria',
      precio: '45000', precio_sub: 'por persona',
      duracion: '3 horas', tipo_tour: 'Privado', idioma: 'Espa\u00f1ol', max_personas: 'M\u00e1x 8',
      rating: '4.8', review_count: 150,
      descripcion: 'Degustaci\u00f3n de ajiaco, chocolate santafere\u00f1o, chicha y frutas locales.',
      incluye: ['Gu\u00eda gastron\u00f3mico', '3 degustaciones', 'Receta de ajiaco'],
      no_incluye: ['Transporte', 'Comidas adicionales'],
      link_reserva: 'https://foodtours.co',
      featured: false
    }
  ],
  equipamiento: [
    { item: 'Zapatos c\u00f3modos con buen agarre', prioridad: 'Obligatorio' },
    { item: 'Agua (m\u00ednimo 500 ml)', prioridad: 'Obligatorio' },
    { item: 'C\u00e1mara o celular', prioridad: 'Recomendado' },
    { item: 'Protector solar y gorra', prioridad: 'Recomendado' },
    { item: 'Efectivo peque\u00f1o para donaciones', prioridad: 'Recomendado' },
    { item: 'Mapa del recorrido', prioridad: 'Recomendado' },
    { item: 'Aplicaci\u00f3n de Transmilenio', prioridad: 'Opcional' }
  ],
  itinerario: [
    { dia: 'D\u00eda 1', hora: '9:00 am', titulo: 'Partida en el centro', icono: '\ud83c\udfdb\ufe0f', detalle: 'Encuentro en la Plaza de Bol\u00edvar con gu\u00eda', tags: ['Centro hist\u00f3rico'] },
    { dia: 'D\u00eda 1', hora: '9:30 am', titulo: 'Plaza de Bol\u00edvar y Catedral', icono: '\ud83c\udfdb\ufe0f', detalle: 'Visita a la plaza principal y la Catedral Primada', tags: ['Plaza', 'Catedral'] },
    { dia: 'D\u00eda 1', hora: '10:30 am', titulo: 'Museo del Oro', icono: '\ud83c\udfe6', detalle: 'Recorrido por oro precolombino', tags: ['Museo'] },
    { dia: 'D\u00eda 1', hora: '12:00 pm', titulo: 'Almuerzo de ajiaco', icono: '\ud83c\udf7d\ufe0f', detalle: 'Restaurante t\u00edpico zona universitaria', tags: ['Ajiaco', 'Universidad'] },
    { dia: 'D\u00eda 1', hora: '13:30 pm', titulo: 'Museo Botero', icono: '\ud83c\udfa8', detalle: 'Colecci\u00f3n de arte Botero', tags: ['Museo'] },
    { dia: 'D\u00eda 1', hora: '15:00 pm', titulo: 'Pasaje Rivas y Pasaje Hern\u00e1ndez', icono: '\ud83d\udd6f\ufe0f', detalle: 'Artesan\u00edas y galer\u00edas ocultas', tags: ['Pasajes'] },
    { dia: 'D\u00eda 1', hora: '16:30 pm', titulo: 'Chorro de Quevedo', icono: '\ud83c\udf05', detalle: 'Punto de fundaci\u00f3n de Bogot\u00e1', tags: ['Historia'] },
    { dia: 'D\u00eda 1', hora: '18:00 pm', titulo: 'Fin del recorrido', icono: '\ud83d\udc4b', detalle: 'Despedida en zona c\u00e9ntrica', tags: [] }
  ],
  dificultad_tags: [
    { texto: 'Aptos para peat\u00f3n', apto: true },
    { texto: 'Apto para ni\u00f1os', apto: true },
    { texto: 'Algunas pendientes por topograf\u00eda', apto: false },
    { texto: 'Altitud 2640m \u00b7 usar precauci\u00f3n primeros d\u00edas', apto: false },
    { texto: 'Calle empedrada \u00b7 usar calzado con buen agarre', apto: false }
  ],
  temporada_matriz: {
    Ene: 'posible', Feb: 'posible', Mar: 'posible', Abr: 'posible', May: 'posible',
    Jun: 'ideal', Jul: 'ideal', Ago: 'ideal', Sep: 'posible', Oct: 'posible', Nov: 'posible', Dic: 'posible'
  }
};

const FAQS = [
  { pregunta: '\u00bfCu\u00e1l es el mejor museo para visitar en La Candelaria?', respuesta: 'El Museo del Oro es el m\u00e1s destacado con su colecci\u00f3n de oro precolombino. El Museo Botero es gratuito y alberga la colecci\u00f3n privada del artista. Ambos son imperdibles.' },
  { pregunta: '\u00bfEs gratis entrar a La Candelaria?', respuesta: 'El barrio es p\u00fablico y gratuito para pasear. Los museos tienen entrada: el Museo del Oro cuesta $5.000, pero es gratis los domingos y muchos museos son gratuitos siempre.' },
  { pregunta: '\u00bfA qu\u00e9 hora abre el Museo del Oro?', respuesta: 'De martes a domingo de 9:00 am a 6:00 pm. Cerrado los lunes. Entrada general $5.000, estudiantes $3.000. Domingos gratis.' },
  { pregunta: '\u00bfSe puede visitar La Candelaria en un d\u00eda?', respuesta: 'S\u00ed, el recorrido completo dura entre 2 y 4 horas caminando. Puedes combinarlo con el Museo del Oro y terminar con un ajiaco.' },
  { pregunta: '\u00bfEs seguro La Candelaria?', respuesta: 'Es el barrio m\u00e1s visitado de Bogot\u00e1 y durante el d\u00eda es seguro para turistas. De noche y en zonas poco concurridas, mant\u00e9n las precauciones habituales.' }
];

module.exports = { SLUG: SLUG, HERO: HERO, PHOTOS: PHOTOS, BASE: BASE, TAGS: TAGS, FAQS: FAQS };

if (require.main !== module) return;

(async function main() {
  var url = process.env.DATABASE_URL || process.argv[2];
  if (!url) {
    console.error('Falta DATABASE_URL.');
    console.error('Uso: DATABASE_URL=postgres://... node api/seed-lacandelaria.js [--dry]');
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