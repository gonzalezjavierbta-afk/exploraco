// scripts/seed-plaza-de-bolivar.js
// Crea (o actualiza) la pagina dinamica plaza-de-bolivar.html con los datos de
// ficha-plaza-de-bolivar.md, replicando EXACTAMENTE lo que guardaria el
// formulario admin.html (CATEGORY_TAG_FIELDS/CATEGORY_TAG_LISTS sitio,
// _buildTagsObj/_placeToAPI). Patron de scripts/seed-museo-del-oro.js.
//
// Rating: NO se siembran resenas ni se hardcodea rating. La pagina queda
// con rating/contador en 0 hasta que lleguen interacciones reales
// (ADR-008: api/interacciones.js recalcula AVG/COUNT dinamicamente).
//
// Uso:
//   DATABASE_URL=postgres://... node scripts/seed-plaza-de-bolivar.js --dry
//   DATABASE_URL=postgres://... node scripts/seed-plaza-de-bolivar.js
//
// Idempotente: re-ejecutable sin efectos secundarios (ON CONFLICT slug).

var neon = null;
function getNeon() {
  if (!neon) neon = require('@neondatabase/serverless').neon;
  return neon;
}

const SLUG = 'plaza-de-bolivar';
const HERO = 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/56/Panor%C3%A1mica_Plaza_de_Bol%C3%ADvar_Bogot%C3%A1.jpg/960px-Panor%C3%A1mica_Plaza_de_Bol%C3%ADvar_Bogot%C3%A1.jpg';

const PHOTOS = [
  { url: HERO, caption: 'Panor\u00e1mica de la Plaza de Bol\u00edvar con la estatua de Sim\u00f3n Bol\u00edvar y el Capitolio al fondo' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1f/Plaza_de_Bol%C3%ADvar_-_Bogot%C3%A1_-_Colombia_2024.jpg/960px-Plaza_de_Bol%C3%ADvar_-_Bogot%C3%A1_-_Colombia_2024.jpg', caption: 'Vista amplia de la plaza en 2024 con la Catedral y el Palacio de Justicia' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/2021_Bogot%C3%A1_-_Catedral_Primada_de_Colombia.jpg/960px-2021_Bogot%C3%A1_-_Catedral_Primada_de_Colombia.jpg', caption: 'Catedral Primada de Colombia, costado oriental de la plaza' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7e/Capitolio_Nacional%2C_Bogot%C3%A1.JPG/960px-Capitolio_Nacional%2C_Bogot%C3%A1.JPG', caption: 'Capitolio Nacional, sede del Congreso de la Rep\u00fablica' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c0/Palacio_de_Justicia_Bogot%C3%A1.JPG/960px-Palacio_de_Justicia_Bogot%C3%A1.JPG', caption: 'Palacio de Justicia, sede de las altas cortes' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Palacio_Li%C3%A9vano%2C_Bogot%C3%A1.jpg/960px-Palacio_Li%C3%A9vano%2C_Bogot%C3%A1.jpg', caption: 'Palacio Li\u00e9vano, sede de la Alcald\u00eda Mayor de Bogot\u00e1' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/12/Sim%C3%B3n_Bolivar_junto_al_palacio_de_justicia.jpg/960px-Sim%C3%B3n_Bolivar_junto_al_palacio_de_justicia.jpg', caption: 'La estatua ecuestre de Sim\u00f3n Bol\u00edvar frente al Palacio de Justicia' }
];

const BASE = {
  slug: SLUG,
  nombre: 'Plaza de Bol\u00edvar',
  categoria_slug: 'sitio',
  lead: 'La plaza m\u00e1s emblem\u00e1tica de Colombia y coraz\u00f3n del Centro Hist\u00f3rico de Bogot\u00e1, donde conviven los tres poderes del Estado: el \u00fanico lugar del pa\u00eds donde se encuentran frente a frente el legislativo, el judicial y el ejecutivo. Escenario de la independencia, de manifestaciones, conciertos y del d\u00eda a d\u00eda bogotano entre palomas y vendedores de ma\u00edz.',
  descripcion: 'Fundada como Plaza Mayor en 1539 por los conquistadores espa\u00f1oles (sobre el antiguo poblado muisca de Teusac\u00e1), fue Plaza de la Constituci\u00f3n tras la independencia y desde 1846 lleva el nombre de Plaza de Bol\u00edvar. En 1819 recibi\u00f3 triunfante a Sim\u00f3n Bol\u00edvar y el Ej\u00e9rcito Libertador tras la Batalla de Boyac\u00e1. A su alrededor se concentran las sedes del poder nacional: al norte el Palacio de Justicia (altas cortes), al sur el Capitolio Nacional (Congreso de la Rep\u00fablica), al oeste el Palacio Li\u00e9vano (Alcald\u00eda Mayor) y al este la Catedral Primada de Colombia con la Capilla del Sagrario y el Palacio Cardenalicio. En la esquina suroriental queda el Colegio Mayor de San Bartolom\u00e9 y cerca, la Casa de Nari\u00f1o (presidencia) y el Museo de la Independencia \u2013 Casa del Florero. Declarada Bien de Inter\u00e9s Cultural Nacional en 1959 y Monumento Nacional en 1995. Tiene 13.903 m\u00b2 y capacidad para unas 55.600 personas.',
  highlight: 'El \u00fanico lugar de Colombia donde conviven frente a frente los poderes ejecutivo (Alcald\u00eda), legislativo (Congreso) y judicial (Cortes), junto a la sede eclesi\u00e1stica. La estatua ecuestre de Sim\u00f3n Bol\u00edvar, obra de Pietro Tenerani, preside el centro desde 1880',
  ciudad: 'Bogot\u00e1',
  region: 'Cundinamarca',
  barrio: 'La Candelaria',
  lat: 4.59806,
  lng: -74.07580,
  whatsapp: '',
  telefono: '',
  email: '',
  web: 'https://bogota.gov.co',
  instagram: '@alcaldiabogota',
  precio_desde: 'Gratis',
  horario: 'Plaza p\u00fablica abierta 24 horas; edificios con horarios propios',
  emoji: '\ud83c\udfdb',
  hero_bg: '#8b1a1a',
  foto_hero: HERO,
  tipo: 'Plaza hist\u00f3rica \u00b7 Espacio c\u00edvico \u00b7 Centro hist\u00f3rico',
  capacidad: '',
  como_llegar: 'TransMilenio estaci\u00f3n "Museo del Oro" (rutas por la Av. Jim\u00e9nez/carrera 7) y caminar 5 cuadras al sur por la carrera 7. Taxi o app: carrera 7 No. 11-10. Desde el Chorro de Quevedo a 10 min a pie.',
  status: 'published',
  destacado: true
};

const TAGS = {
  tipo_actividad: 'Plaza hist\u00f3rica',
  dificultad: 'F\u00e1cil',
  dificultad_desc: 'Espacio abierto plano y peatonal, apto para todas las edades y movilidad reducida. El recorrido a pie toma 1-2 horas.',
  duracion: '1-2 horas',
  altitud: '2640',
  temporada: ['Todo el a\u00f1o', 'Ideal por la ma\u00f1ana entre semana', 'Domingos con ambiente festivo y ciclov\u00eda'],
  precio_entrada: 'Gratis: plaza p\u00fablica de acceso libre 24 horas. Los edificios aleda\u00f1os tienen sus propios horarios y tarifas.',
  distancia: 'En el Centro Hist\u00f3rico, a 5 min a pie del Museo del Oro y a 10 min del Chorro de Quevedo',
  como_llegar: BASE.como_llegar,
  permisos: 'No requiere permiso; es espacio p\u00fablico. Las visitas guiadas al Capitolio (viernes) requieren inscripci\u00f3n previa.',
  temporada_nota: 'Abierta todo el a\u00f1o, 24 horas. Los edificios alrededor abren en horarios propios; el Capitolio ofrece visitas guiadas gratis los viernes de 9AM a 12:30PM con inscripci\u00f3n previa.',
  fauna_flora: JSON.stringify([
    { emoji: '\ud83d\udd4a', nombre: 'Palomas de la plaza', hecho: 'La imagen t\u00edpica: se alimentan con ma\u00edz que venden en la plaza' },
    { emoji: '\ud83c\udf33', nombre: '\u00c1rboles de cera', hecho: 'Cipreses y cerezos rodean el espacio p\u00fablico' },
    { emoji: '\ud83c\udf3f', nombre: 'Jardines del Capitolio', hecho: 'Peque\u00f1os jardines ornamentales en el costado sur' },
    { emoji: '\ud83d\udc26', nombre: 'Aves urbanas', hecho: 'Mirlas y gorriones comparten el espacio con las palomas' }
  ]),
  secretos: JSON.stringify([
    { icono: '\ud83d\uddfd', titulo: 'La estatua de Bol\u00edvar girada', texto: 'Fue instalada mirando a la Catedral y luego se gir\u00f3 para quedar frente al Palacio de Justicia.', tag: 'Dato', tag_color: 'gold' },
    { icono: '\ud83c\udfdb', titulo: 'Casa del Florero', texto: 'Museo de la Independencia en la esquina suroriental: donde estall\u00f3 el grito de 1810.', tag: 'Historia', tag_color: 'blue' },
    { icono: '\ud83d\udc66', titulo: 'Cambio de guardia', texto: 'La ceremonia de la Casa de Nari\u00f1o (a 2 cuadras) se disfruta al atardecer.', tag: 'Imperdible', tag_color: 'gold' },
    { icono: '\ud83d\udd4a', titulo: 'Alimentar las palomas', texto: 'El ritual cl\u00e1sico: comprar ma\u00edz a los vendedores para las miles de palomas.', tag: 'Divertido', tag_color: 'green' },
    { icono: '\ud83c\udf6b', titulo: 'Caf\u00e9s de La Candelaria', texto: 'A una cuadra, los caf\u00e9s santafere\u00f1os para un chocolate despu\u00e9s del recorrido.', tag: 'Comer', tag_color: 'brown' }
  ]),
  regulaciones: 'Es espacio p\u00fablico de uso libre; se permite la protesta pac\u00edfica regulada. No arrojar residuos; hay puntos de reciclaje. No escalar la estatua de Bol\u00edvar ni los monumentos. Alimentar palomas con ma\u00edz est\u00e1 permitido (tradici\u00f3n local). Si hay manifestaciones, respetar vallas y avisos de la polic\u00eda. El acceso a los edificios (Catedral, Capitolio, Alcald\u00eda) tiene sus propios horarios y requisitos.',
  checklist_tip: 'Si quieres entrar al Capitolio, inscr\u00edbete con anticipaci\u00f3n en la web de la C\u00e1mara (visitas guiadas gratis los viernes 9AM-12:30PM).',
  entradas: [
    { tipo: 'Plaza p\u00fablica', precio: 'Gratis', incluye: 'Acceso libre 24 horas', link: 'https://bogota.gov.co' },
    { tipo: 'Catedral Primada', precio: 'Gratis', incluye: 'Misas y visita del templo', link: 'https://www.catedraldebogota.org' },
    { tipo: 'Capitolio Nacional (visita guiada)', precio: 'Gratis', incluye: 'Viernes 9AM-12:30PM con inscripci\u00f3n previa', link: 'https://www.camara.gov.co' },
    { tipo: 'Palacio Li\u00e9vano (Alcald\u00eda)', precio: 'Gratis', incluye: 'Visitas guiadas seg\u00fan programaci\u00f3n', link: 'https://bogota.gov.co' },
    { tipo: 'Cambio de guardia (Casa de Nari\u00f1o)', precio: 'Gratis', incluye: 'Ceremonia frente a la presidencia a 2 cuadras', link: 'https://www.presidencia.gov.co' }
  ],
  tours: [
    {
      nombre: 'Free walking tour por el Centro Hist\u00f3rico',
      precio: 'Gratis', precio_sub: 'propina sugerida',
      duracion: '2.5 horas', tipo_tour: 'Grupal', idioma: 'Espa\u00f1ol', max_personas: 'M\u00e1x 20',
      rating: '4.9', review_count: 1200,
      descripcion: 'Recorrido a pie que arranca en la Plaza de Bol\u00edvar y cruza La Candelaria: Catedral, Capitolio, Palacio de Justicia, Chorro de Quevedo y los grafitis de la calle del Embudo.',
      incluye: ['Gu\u00eda local', 'Contexto hist\u00f3rico', 'Recomendaciones del sector'],
      no_incluye: ['Entradas a museos', 'Transporte'],
      link_reserva: 'https://bogotawalkingtours.com',
      featured: true
    },
    {
      nombre: 'Plaza de Bol\u00edvar + Museo Botero a pie',
      precio: '45000', precio_sub: 'por persona',
      duracion: '3 horas', tipo_tour: 'Grupal', idioma: 'Espa\u00f1ol', max_personas: 'M\u00e1x 12',
      rating: '4.8', review_count: 310,
      descripcion: 'De la plaza a la Manzana Cultural: Capitolio, Catedral y luego el Museo Botero (gratis) con obras de Botero, Picasso y Monet.',
      incluye: ['Gu\u00eda', 'Entrada Museo Botero', 'Recorrido La Candelaria'],
      no_incluye: ['Transporte', 'Alimentos'],
      link_reserva: 'https://bogotawalkingtours.com',
      featured: false
    },
    {
      nombre: 'Capitolio y Congreso con visita guiada',
      precio: 'Gratis', precio_sub: 'con reserva previa',
      duracion: '90 minutos', tipo_tour: 'Grupal', idioma: 'Espa\u00f1ol', max_personas: 'M\u00e1x 25',
      rating: '4.7', review_count: 140,
      descripcion: 'Visita gratuita al interior del Capitolio Nacional los viernes con inscripci\u00f3n previa: el recinto del Congreso de la Rep\u00fablica.',
      incluye: ['Gu\u00eda oficial', 'Ingreso al recinto', 'Historia de la Constituci\u00f3n'],
      no_incluye: ['Transporte', 'Alimentos'],
      link_reserva: 'https://www.camara.gov.co',
      featured: false
    }
  ],
  equipamiento: [
    { item: 'Identificaci\u00f3n (pasaporte o c\u00e9dula) si entras al Capitolio', prioridad: 'Obligatorio' },
    { item: 'Zapatos c\u00f3modos para caminar La Candelaria', prioridad: 'Recomendado' },
    { item: 'C\u00e1mara para la estatua de Bol\u00edvar y la Catedral', prioridad: 'Recomendado' },
    { item: 'Dinero en efectivo para el ma\u00edz de las palomas o vendedores', prioridad: 'Opcional' },
    { item: 'Evitar objetos de valor a la vista (zona muy transitada)', prioridad: 'Recomendado' }
  ],
  itinerario: [
    { dia: 'Recorrido', hora: '9:00 am', titulo: 'Estatua de Bol\u00edvar', icono: '\ud83d\uddfd', detalle: 'La escultura de Pietro Tenerani que preside la plaza desde 1880', tags: ['Historia', 'Bol\u00edvar'] },
    { dia: 'Recorrido', hora: '9:30 am', titulo: 'Catedral Primada', icono: '\u2696', detalle: 'El templo mayor de Colombia y su Capilla del Sagrario', tags: ['Arquitectura'] },
    { dia: 'Recorrido', hora: '10:00 am', titulo: 'Capitolio Nacional', icono: '\ud83c\udfdb', detalle: 'Sede del Congreso en el costado sur de la plaza', tags: ['Poder'] },
    { dia: 'Recorrido', hora: '10:30 am', titulo: 'Palacio de Justicia y Palacio Li\u00e9vano', icono: '\ud83c\udfdb', detalle: 'Las altas cortes al norte y la Alcald\u00eda al oeste', tags: ['Poder'] }
  ],
  dificultad_tags: [
    { texto: 'Espacio abierto plano, apto para todas las edades', apto: true },
    { texto: 'Accesible para movilidad reducida (suelo pavimentado)', apto: true },
    { texto: 'Zona muy transitada, cuidado con carteristas', apto: false },
    { texto: 'Evitar horas de manifestaciones', apto: false },
    { texto: 'Mejor de d\u00eda por seguridad', apto: false }
  ],
  temporada_matriz: {
    Ene: 'ideal', Feb: 'ideal', Mar: 'ideal', Abr: 'posible', May: 'posible',
    Jun: 'ideal', Jul: 'ideal', Ago: 'ideal', Sep: 'posible', Oct: 'posible', Nov: 'ideal', Dic: 'posible'
  }
};

const FAQS = [
  { pregunta: '\u00bfCuesta entrar a la Plaza de Bol\u00edvar?', respuesta: 'No, es gratis y de acceso p\u00fablico 24 horas. Los edificios alrededor (Catedral, Capitolio, Palacio Li\u00e9vano) tienen sus propios horarios y algunos requieren reserva.' },
  { pregunta: '\u00bfQu\u00e9 se puede ver?', respuesta: 'La estatua de Sim\u00f3n Bol\u00edvar, la Catedral Primada, el Capitolio Nacional, el Palacio de Justicia y el Palacio Li\u00e9vano. A pocos pasos: el Museo Botero, el Museo del Oro y el Chorro de Quevedo.' },
  { pregunta: '\u00bfCu\u00e1nto tiempo se necesita?', respuesta: '1 hora para recorrer la plaza; medio d\u00eda si se incluyen los museos y La Candelaria.' },
  { pregunta: '\u00bfEs segura?', respuesta: 'Es zona muy transitada y con presencia policial constante, pero en el centro hay que tomar precauciones: evitar objetos de valor a la vista, cuidado con los carteristas y mejor visitar de d\u00eda. Si hay manifestaciones, revisar las noticias antes.' },
  { pregunta: '\u00bfCu\u00e1ndo es el cambio de guardia?', respuesta: 'La ceremonia de la Casa de Nari\u00f1o (a 2 cuadras) se realiza a las 5:00 pm los d\u00edas h\u00e1biles; se puede ver desde la reja de la presidencia.' }
];

module.exports = { SLUG: SLUG, HERO: HERO, PHOTOS: PHOTOS, BASE: BASE, TAGS: TAGS, FAQS: FAQS };

if (require.main !== module) return;

(async function main() {
  var url = process.env.DATABASE_URL || process.argv[2];
  if (!url) {
    console.error('Falta DATABASE_URL.');
    console.error('Uso: DATABASE_URL=postgres://... node scripts/seed-plaza-de-bolivar.js [--dry]');
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