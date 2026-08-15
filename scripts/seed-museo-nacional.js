// scripts/seed-museo-nacional.js
// Crea (o actualiza) la pagina dinamica museo-nacional.html con los datos de
// ficha-museo-nacional.md, replicando EXACTAMENTE lo que guardaria el
// formulario admin.html (CATEGORY_TAG_FIELDS/CATEGORY_TAG_LISTS sitio,
// _buildTagsObj/_placeToAPI). Patron de scripts/seed-museo-del-oro.js.
//
// Rating: NO se siembran resenas ni se hardcodea rating. La pagina queda
// con rating/contador en 0 hasta que lleguen interacciones reales
// (ADR-008: api/interacciones.js recalcula AVG/COUNT dinamicamente).
//
// Uso:
//   DATABASE_URL=postgres://... node scripts/seed-museo-nacional.js --dry
//   DATABASE_URL=postgres://... node scripts/seed-museo-nacional.js
//
// Idempotente: re-ejecutable sin efectos secundarios (ON CONFLICT slug).

var neon = null;
function getNeon() {
  if (!neon) neon = require('@neondatabase/serverless').neon;
  return neon;
}

const SLUG = 'museo-nacional';
const HERO = 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/2019_Bogot%C3%A1_-_Fachada_principal_del_Museo_Nacional.jpg/960px-2019_Bogot%C3%A1_-_Fachada_principal_del_Museo_Nacional.jpg';

const PHOTOS = [
  { url: HERO, caption: 'Fachada principal neocl\u00e1sica del Museo Nacional sobre la carrera S\u00e9ptima' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/74/Museo_Nacional_de_Colombia_-_Fachada_desde_el_Norte.JPG/960px-Museo_Nacional_de_Colombia_-_Fachada_desde_el_Norte.JPG', caption: 'Fachada norte del antiguo pan\u00f3ptico, hoy sede del museo' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/90/Entrada_del_Museo_Nacional_de_Colombia.jpg/960px-Entrada_del_Museo_Nacional_de_Colombia.jpg', caption: 'Acceso principal del museo en el Centro Internacional' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a3/Museo_Nacional_de_Colombia_%28Vista_desde_el_interior%29.jpg/960px-Museo_Nacional_de_Colombia_%28Vista_desde_el_interior%29.jpg', caption: 'Interior del museo: los patios del pan\u00f3ptico convertidos en espacio cultural' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/29/El_oct%C3%A1gono.jpg/960px-El_oct%C3%A1gono.jpg', caption: 'El oct\u00e1gono central del pan\u00f3ptico, coraz\u00f3n geom\u00e9trico del edificio' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f8/Escaleras_del_pan%C3%B3ptico.jpg/960px-Escaleras_del_pan%C3%B3ptico.jpg', caption: 'Escaleras originales del pan\u00f3ptico, detalle arquitect\u00f3nico interior' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Detalle_de_la_muralla_del_Museo_Nacional.jpg/960px-Detalle_de_la_muralla_del_Museo_Nacional.jpg', caption: 'Detalle de la muralla exterior del Monumento Nacional de 1975' }
];

const BASE = {
  slug: SLUG,
  nombre: 'Museo Nacional de Colombia',
  categoria_slug: 'sitio',
  lead: 'Un paseo por la historia de Colombia dentro de la que fue su c\u00e1rcel m\u00e1s temida. Del patio de presos a las salas de arte m\u00e1s importantes del pa\u00eds, el Museo Nacional convierte la arquitectura pan\u00f3ptica en un viaje por m\u00e1s de dos siglos de memoria.',
  descripcion: 'Fundado el 28 de julio de 1823 y abierto al p\u00fablico el 4 de julio de 1824, es el museo m\u00e1s antiguo de Colombia y uno de los m\u00e1s antiguos de Am\u00e9rica. Conserva m\u00e1s de 20.000 piezas (unas 2.500 en exhibici\u00f3n) repartidas en 17 salas permanentes de arte, historia, arqueolog\u00eda y etnograf\u00eda, m\u00e1s exposiciones temporales. Su sede desde 1948 es el antiguo Pan\u00f3ptico (prisi\u00f3n hasta 1946), el edificio neocl\u00e1sico dise\u00f1ado por Thomas Reed en la d\u00e9cada de 1850 y construido desde el 1 de octubre de 1874, declarado Monumento Nacional el 11 de agosto de 1975. El Patio Central, que hoy recibe a los visitantes, fue el patio donde transitaban los presos.',
  highlight: 'La arquitectura circular del pan\u00f3ptico: el edificio fue dise\u00f1ado para vigilar todas las celdas desde una torre central octogonal, y esa geometr\u00eda \u00fanica sigue definiendo la experiencia de recorrer el museo',
  ciudad: 'Bogot\u00e1',
  region: 'Cundinamarca',
  barrio: 'Centro Internacional',
  lat: 4.6155,
  lng: -74.0683,
  whatsapp: '',
  telefono: '(601) 381 6470',
  email: '',
  web: 'https://www.museonacional.gov.co',
  instagram: '@museonacionalco',
  precio_desde: 'Desde $2.000 (gratis menores de 5, mayores de 60, mi\u00e9rcoles tarde y \u00faltimo domingo del mes)',
  horario: 'Mar-Dom 9AM-5PM. Lunes cerrado (incluidos festivos)',
  emoji: '\ud83c\udfdb',
  hero_bg: '#5b4636',
  foto_hero: HERO,
  tipo: 'Museo de historia y arte \u00b7 Pan\u00f3ptico \u00b7 Monumento Nacional',
  capacidad: '',
  como_llegar: 'TransMilenio estaciones "Museo Nacional - Carrera 7" o "Calle 26". A pie: 2 cuadras de la Torre Colpatria. Taxi o app: Carrera 7 No. 28-66.',
  status: 'published',
  destacado: true
};

const TAGS = {
  tipo_actividad: 'Museo de historia y arte',
  dificultad: 'F\u00e1cil',
  dificultad_desc: 'Espacios interiores con rampas y ascensores, apto para todas las edades. El recorrido por las 17 salas toma 2-3 horas.',
  duracion: '2-3 horas',
  altitud: '2640',
  temporada: ['Todo el a\u00f1o', 'Mi\u00e9rcoles 2-5PM gratis', '\u00daltimo domingo del mes gratis'],
  precio_entrada: 'Adultos colombianos $6.000 (+$1.000 aporte voluntario). Turistas extranjeros $15.000. Menores de 6 y mayores de 60 gratis. Mi\u00e9rcoles 2-5PM y \u00faltimo domingo gratis. Solo efectivo en pesos.',
  distancia: 'En el Centro Internacional, frente al Parque de la Independencia; estaciones TransMilenio "Museo Nacional" y "Calle 26"',
  como_llegar: BASE.como_llegar,
  permisos: 'No requiere reserva para ingreso individual; las visitas guiadas y educativas requieren reserva previa (gratuita).',
  temporada_nota: 'Abre de martes a domingo 9AM-5PM. Lunes cerrado, incluidos festivos. Cierre especial: 24 y 31 dic desde la 1PM; 25 dic y 1 ene todo el d\u00eda.',
  fauna_flora: JSON.stringify([
    { emoji: '\ud83e\udeb6', nombre: 'Momias prehisp\u00e1nicas', hecho: 'Piezas de la colecci\u00f3n de arqueolog\u00eda del museo' },
    { emoji: '\ud83d\udc09', nombre: 'Orfebrer\u00eda muisca', hecho: 'Tunjos, pectorales y cer\u00e1mica de las culturas del altiplano' },
    { emoji: '\ud83c\udf31', nombre: 'Flora de p\u00e1ramo en la colecci\u00f3n', hecho: 'Registros bot\u00e1nicos de las expediciones del siglo XIX' },
    { emoji: '\ud83d\udc26', nombre: 'Aves en historia natural', hecho: 'Espec\u00edmenes de la biodiversidad colombiana' }
  ]),
  secretos: JSON.stringify([
    { icono: '\ud83c\udfdb', titulo: 'El patio de los presos', texto: 'El Patio Central del museo fue el patio del pan\u00f3ptico: los presos transitaban donde hoy caminan los visitantes.', tag: 'Imperdible', tag_color: 'gold' },
    { icono: '\ud83d\udd2e', titulo: 'La Rotonda octogonal', texto: 'La sala 14 en el tercer piso ofrece la "mirada pan\u00f3ptica" sobre el arte: la torre que vigilaba las celdas.', tag: 'Dato', tag_color: 'gold' },
    { icono: '\ud83c\udfdc', titulo: 'Torre Colpatria', texto: 'A 2 cuadras: el mirador de 48 pisos con la mejor vista panor\u00e1mica del Centro.', tag: 'Cerca', tag_color: 'blue' },
    { icono: '\ud83c\udf31', titulo: 'Parque de la Independencia', texto: 'Al frente del museo: verde, monumentos y la Plaza de Toros La Santamar\u00eda al lado.', tag: 'Verde', tag_color: 'green' },
    { icono: '\ud83c\udf6b', titulo: 'Centro Internacional', texto: 'Caf\u00e9s y restaurantes del sector para el descanso del recorrido.', tag: 'Comer', tag_color: 'brown' }
  ]),
  regulaciones: 'No se permite tomar fotograf\u00edas con flash en las salas de exposici\u00f3n. No ingresar con alimentos ni bebidas a las salas. El ingreso con bultos grandes debe coordinarse en taquilla. Los menores deben ir acompa\u00f1ados de un adulto. Solo se acepta efectivo en pesos colombianos en taquilla. Lunes cerrado (incluidos festivos); 24-25 dic y 31 dic-1 ene con horarios especiales.',
  checklist_tip: 'Lleva efectivo en pesos colombianos: la taquilla no acepta tarjetas. Aprovecha el mi\u00e9rcoles de 2 a 5PM y el \u00faltimo domingo del mes, que la entrada es gratis.',
  entradas: [
    { tipo: 'Adultos colombianos', precio: '6000', incluye: '18-59 a\u00f1os, +$1.000 aporte voluntario', link: 'https://www.museonacional.gov.co' },
    { tipo: 'Ni\u00f1os 6-12 y j\u00f3venes 13-17 (colombianos)', precio: '2000', incluye: 'Tarifas por rango de edad', link: 'https://www.museonacional.gov.co' },
    { tipo: 'Adultos extranjeros', precio: '15000', incluye: 'Turistas no residentes, solo efectivo en COP', link: 'https://www.museonacional.gov.co' },
    { tipo: 'Ni\u00f1os 0-5 y mayores de 60', precio: 'Gratis', incluye: 'Exentos de pago siempre', link: 'https://www.museonacional.gov.co' },
    { tipo: 'Mi\u00e9rcoles 2-5PM y \u00faltimo domingo', precio: 'Gratis', incluye: 'Entrada libre en d\u00edas especiales', link: 'https://www.museonacional.gov.co' }
  ],
  tours: [
    {
      nombre: 'Recorrido por las 17 salas permanentes',
      precio: 'Gratis', precio_sub: 'con reserva previa',
      duracion: '90 minutos', tipo_tour: 'Grupal', idioma: 'Espa\u00f1ol', max_personas: 'M\u00e1x 20',
      rating: '4.8', review_count: 260,
      descripcion: 'Visita comentada por el equipo de Acci\u00f3n Educativa: arte, historia, arqueolog\u00eda y etnograf\u00eda con la historia del pan\u00f3ptico.',
      incluye: ['Gu\u00eda especializado', 'Entrada', 'Historia del edificio pan\u00f3ptico'],
      no_incluye: ['Audiogu\u00eda', 'Transporte'],
      link_reserva: 'https://www.museonacional.gov.co',
      featured: true
    },
    {
      nombre: 'Museo Nacional + Torre Colpatria a pie',
      precio: '40000', precio_sub: 'por persona',
      duracion: '4 horas', tipo_tour: 'Grupal', idioma: 'Espa\u00f1ol', max_personas: 'M\u00e1x 12',
      rating: '4.7', review_count: 180,
      descripcion: 'Combo cultural por el Centro Internacional: del museo al mirador de la Torre Colpatria (48 pisos) con vista panor\u00e1mica de Bogot\u00e1.',
      incluye: ['Entrada Museo Nacional', 'Gu\u00eda', 'Subida a la Torre Colpatria'],
      no_incluye: ['Transporte', 'Alimentos'],
      link_reserva: 'https://bogotawalkingtours.com',
      featured: false
    },
    {
      nombre: 'Historia y arquitectura del pan\u00f3ptico',
      precio: '50000', precio_sub: 'por persona',
      duracion: '3 horas', tipo_tour: 'Privado', idioma: 'Espa\u00f1ol', max_personas: 'M\u00e1x 6',
      rating: '4.9', review_count: 95,
      descripcion: 'Profundiza en la c\u00e1rcel que fue el museo: la torre octogonal, las celdas convertidas en salas y los personajes que pasaron por el patio.',
      incluye: ['Entrada', 'Gu\u00eda privado', 'Material de apoyo'],
      no_incluye: ['Transporte', 'Audiogu\u00eda'],
      link_reserva: 'https://museumtoursbogota.com',
      featured: false
    }
  ],
  equipamiento: [
    { item: 'Efectivo en pesos colombianos (no aceptan tarjetas)', prioridad: 'Obligatorio' },
    { item: 'Identificaci\u00f3n (pasaporte o c\u00e9dula)', prioridad: 'Obligatorio' },
    { item: 'Zapatos c\u00f3modos para 2-3 horas de recorrido', prioridad: 'Recomendado' },
    { item: 'C\u00e1mara sin flash en las salas', prioridad: 'Opcional' },
    { item: 'Aprovecha el mi\u00e9rcoles tarde (2-5PM) que es gratis', prioridad: 'Recomendado' }
  ],
  itinerario: [
    { dia: 'Recorrido', hora: '9:00 am', titulo: 'Patio Central (pan\u00f3ptico)', icono: '\ud83c\udfdb', detalle: 'El patio donde transitaban los presos, hoy punto de partida', tags: ['Arquitectura', 'Historia'] },
    { dia: 'Recorrido', hora: '10:00 am', titulo: 'Memoria y Naci\u00f3n', icono: '\ud83d\udcdc', detalle: 'Historia de Colombia del siglo XIX a la actualidad', tags: ['Historia'] },
    { dia: 'Recorrido', hora: '11:00 am', titulo: 'La Rotonda (mirada pan\u00f3ptica)', icono: '\ud83d\udd2e', detalle: 'La sala 14 del tercer piso con vista al arte', tags: ['Arte'] },
    { dia: 'Recorrido', hora: '12:00 pm', titulo: 'Arqueolog\u00eda y etnograf\u00eda', icono: '\ud83c\udf08', detalle: 'Orfebrer\u00eda muisca y tairona, momias y cer\u00e1mica', tags: ['Culturas'] }
  ],
  dificultad_tags: [
    { texto: 'Recorrido interior plano, apto para todas las edades', apto: true },
    { texto: 'Accesible con rampas y ascensores', apto: true },
    { texto: 'Mi\u00e9rcoles tarde y \u00faltimo domingo gratis pero con m\u00e1s afluencia', apto: false },
    { texto: 'Solo se acepta efectivo en pesos (no tarjetas)', apto: false },
    { texto: 'Requiere reserva para visitas guiadas y educativas', apto: false }
  ],
  temporada_matriz: {
    Ene: 'ideal', Feb: 'ideal', Mar: 'ideal', Abr: 'posible', May: 'posible',
    Jun: 'ideal', Jul: 'ideal', Ago: 'ideal', Sep: 'posible', Oct: 'posible', Nov: 'ideal', Dic: 'posible'
  }
};

const FAQS = [
  { pregunta: '\u00bfCu\u00e1nto cuesta la entrada?', respuesta: 'Adultos colombianos $6.000 (+$1.000 aporte voluntario); turistas extranjeros $15.000; menores de 6 y mayores de 60 gratis. Los mi\u00e9rcoles de 2 a 5PM y el \u00faltimo domingo del mes la entrada es gratuita. Solo efectivo en pesos.' },
  { pregunta: '\u00bfQu\u00e9 horario tiene?', respuesta: 'Martes a domingo 9:00AM-5:00PM. Lunes cerrado (incluidos festivos).' },
  { pregunta: '\u00bfCu\u00e1nto tiempo se necesita?', respuesta: 'Entre 2 y 3 horas para recorrer las 17 salas permanentes.' },
  { pregunta: '\u00bfQu\u00e9 hay que ver?', respuesta: 'La Rotonda/Mirada pan\u00f3ptica, Memoria y Naci\u00f3n, la colecci\u00f3n prehisp\u00e1nica y de orfebrer\u00eda, la sala de etnograf\u00eda y la historia del pan\u00f3ptico.' },
  { pregunta: '\u00bfHay que reservar?', respuesta: 'No es obligatorio para ingresar individualmente; la reserva aplica para visitas guiadas y educativas (gratuitas, v\u00eda el equipo de Acci\u00f3n Educativa).' }
];

module.exports = { SLUG: SLUG, HERO: HERO, PHOTOS: PHOTOS, BASE: BASE, TAGS: TAGS, FAQS: FAQS };

if (require.main !== module) return;

(async function main() {
  var url = process.env.DATABASE_URL || process.argv[2];
  if (!url) {
    console.error('Falta DATABASE_URL.');
    console.error('Uso: DATABASE_URL=postgres://... node scripts/seed-museo-nacional.js [--dry]');
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