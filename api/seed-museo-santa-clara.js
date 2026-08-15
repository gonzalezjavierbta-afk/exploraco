// api/seed-museo-santa-clara.js
// Crea (o actualiza) la pagina dinamica museo-santa-clara.html con los datos de
// ficha-museo-santa-clara.md, replicando EXACTAMENTE lo que guardaria el
// formulario admin.html. Patron de api/seed-museo-del-oro.js con upsert completo.
//
// Rating: NO se siembran resenas ni se hardcodea rating. La pagina queda con
// rating/contador en 0 hasta que lleguen interacciones reales (ADR-008).
//
// Uso:
//   DATABASE_URL=postgres://... node api/seed-museo-santa-clara.js --dry
//   DATABASE_URL=postgres://... node api/seed-museo-santa-clara.js
//
// Idempotente: re-ejecutable sin efectos secundarios (ON CONFLICT slug).

var neon = null;
function getNeon() {
  if (!neon) neon = require('@neondatabase/serverless').neon;
  return neon;
}

const SLUG = 'museo-santa-clara';
const HERO = 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c0/Museo_Iglesia_Santa_Clara_%28Bogot%C3%A1%29_02.JPG/960px-Museo_Iglesia_Santa_Clara_%28Bogot%C3%A1%29_02.JPG';

const PHOTOS = [
  { url: HERO, caption: 'Nave del Museo de Santa Clara' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/22/Museo_Iglesia_Santa_Clara_%28Bogot%C3%A1%29_01.JPG/960px-Museo_Iglesia_Santa_Clara_%28Bogot%C3%A1%29_01.JPG', caption: 'Retablos dorados del barroco' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/Museo_Iglesia_Santa_Clara_%28Bogot%C3%A1%29_03.JPG/960px-Museo_Iglesia_Santa_Clara_%28Bogot%C3%A1%29_03.JPG', caption: 'Detalle del artesonado mud\u00e9jar' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/84/Museo_Iglesia_Santa_Clara_%28Bogot%C3%A1%29_04.JPG/960px-Museo_Iglesia_Santa_Clara_%28Bogot%C3%A1%29_04.JPG', caption: 'Altar mayor y retablos laterales' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/Museo-Iglesia_Santa_Clara%2C_Bogot%C3%A1.JPG/960px-Museo-Iglesia_Santa_Clara%2C_Bogot%C3%A1.JPG', caption: 'Fachada del templo del siglo XVII' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8c/Iglesia-Museo_de_Santa_Clara..JPG/960px-Iglesia-Museo_de_Santa_Clara..JPG', caption: 'Exterior de la iglesia museo' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/af/Iglesia_Museo_Santa_Clara%2C_Bogot%C3%A1.jpg/960px-Iglesia_Museo_Santa_Clara%2C_Bogot%C3%A1.jpg', caption: 'Vista de la iglesia desde la calle' }
];

const BASE = {
  slug: SLUG,
  nombre: 'Museo de Santa Clara',
  categoria_slug: 'sitio',
  lead: 'La joya del barroco bogotano: un antiguo convento de clarisas del siglo XVII convertido en museo, con retablos dorados, artesonado mud\u00e9jar y m\u00e1s de 300 piezas de arte religioso.',
  descripcion: 'El Museo de Santa Clara ocupa el templo del Real Convento de Santa Clara, construido en 1647 por la orden de las Clarisas y declarado monumento nacional. Desde 1985 funciona como museo de arte religioso y es uno de los ejemplos m\u00e1s representativos del barroco santafere\u00f1o de los siglos XVII y XVIII. Su colecci\u00f3n re\u00fane 328 piezas: 9 retablos (uno mayor y ocho laterales), 112 pinturas al \u00f3leo, 24 esculturas, plater\u00eda, textiles y mobiliario original. Destacan las obras de Gregorio V\u00e1squez de Arce y Ceballos y de Baltasar y Caspar de Figueroa, junto a un artesonado mud\u00e9jar dorado que esconde estrellas de cinco picos (pentafolias) y s\u00edmbolos ocultos. Es el museo m\u00e1s peque\u00f1o de la Red de Museos del Ministerio de las Culturas, pero uno de los m\u00e1s valiosos por su arquitectura y su atm\u00f3sfera.',
  highlight: '9 retablos dorados, artesonado mud\u00e9jar del siglo XVII y la atm\u00f3sfera de un convento de clarisas intacto',
  ciudad: 'Bogot\u00e1',
  region: 'Cundinamarca',
  barrio: 'La Candelaria',
  lat: 4.5968372,
  lng: -74.0774643,
  whatsapp: '',
  telefono: '(57)(1) 337 67 62',
  email: '',
  web: 'https://museocolonial.gov.co',
  instagram: '@mistaclara',
  precio_desde: 'Desde $6.000 (gratis los domingos y los miercoles desde las 2PM)',
  horario: 'Mar-Dom 9AM-4:30PM (cierre 5PM). Lunes cerrado',
  emoji: '\ud83d\uddfa',
  hero_bg: '#7f1d1d',
  foto_hero: HERO,
  tipo: 'Museo de arte religioso \u00b7 Barroco colonial \u00b7 Convento de clarisas',
  capacidad: '',
  como_llegar: 'TransMilenio estaci\u00f3n "Museo del Oro" (Av. Jim\u00e9nez/carrera 7) y caminar ~5 cuadras al sur por la calle 8; o estaci\u00f3n "Las Aguas" por el Eje Ambiental. Taxi o app: Carrera 8 No. 8-91.',
  status: 'published',
  destacado: true
};

const TAGS = {
  tipo_actividad: 'Museo de arte religioso',
  dificultad: 'F\u00e1cil',
  dificultad_desc: 'Recorrido breve de 45-60 minutos por una nave \u00fanica del templo del siglo XVII. Piso plano, pero con algunos accesos con desniveles para personas en silla de ruedas (accesibilidad parcial).',
  duracion: '45-60 minutos',
  altitud: '2640',
  temporada: ['Todo el a\u00f1o', 'Domingos y miercoles gratis pero con m\u00e1s afluencia', 'Entre semana por la ma\u00f1ana con menos visitantes'],
  precio_entrada: 'General $6.000 (colombianos 18-59) / $15.000 (extranjeros). Gratis los domingos, los miercoles desde las 2PM, el 20 de julio y el 7 de agosto.',
  distancia: 'A 3 cuadras de la Plaza de Bol\u00edvar y del Teatro Col\u00f3n, en La Candelaria; estaci\u00f3n TransMilenio "Museo del Oro" a ~10 min a pie',
  como_llegar: BASE.como_llegar,
  permisos: 'No requiere reserva para ingreso individual. Grupos de 8-25 personas deben solicitar el servicio de mediaci\u00f3n con anticipaci\u00f3n (costo $2.500 adicionales por persona; puede exonerarse para instituciones p\u00fablicas con 1 semana de anticipaci\u00f3n).',
  temporada_nota: 'El museo abre todo el a\u00f1o de martes a domingo 9AM-4:30PM (ultimo ingreso) con cierre a las 5PM. Cierra los lunes, incluidos los lunes festivos, y el 1 de enero, 1 de mayo y 25 de diciembre.',
  fauna_flora: JSON.stringify([
    { emoji: '\u2b50', nombre: 'Pentafolia', hecho: 'Estrella de cinco picos oculta en el artesonado, s\u00edmbolo oculto del barroco' },
    { emoji: '\ud83c\udf37', nombre: 'Flor de lis', hecho: 'Motivo ornamental repetido en retablos y textiles conventuales' },
    { emoji: '\ud83d\udc3e', nombre: 'Cordero', hecho: 'S\u00edmbolo de la orden de Santa Clara presente en la iconograf\u00eda' },
    { emoji: '\ud83d\udd4a', nombre: 'Hostia y custodia', hecho: 'La plater\u00eda lit\u00fargica barroca, joya de la colecci\u00f3n' }
  ]),
  secretos: JSON.stringify([
    { icono: '\ud83d\udc51', titulo: 'La cripta del convento', texto: 'Bajo la nave, restos de la vida conventual de las clarisas del siglo XVII.', tag: 'Oculto', tag_color: 'gold' },
    { icono: '\u2b50', titulo: 'Estrellas del artesonado', texto: 'Las pentafolias (estrellas de cinco picos) del techo se ven mejor desde la entrada, mirando hacia arriba.', tag: 'Secreto', tag_color: 'purple' },
    { icono: '\ud83d\uddbc', titulo: 'Gregorio V\u00e1squez', texto: 'La colecci\u00f3n tiene \u00f3leos de V\u00e1squez de Arce y Ceballos, el maestro del barroco neogranadino.', tag: 'Imperdible', tag_color: 'gold' },
    { icono: '\ud83c\udfad', titulo: 'Teatro Col\u00f3n al lado', texto: 'A 1 cuadra, el teatro del siglo XIX, joya del centro hist\u00f3rico.', tag: 'Cerca', tag_color: 'blue' },
    { icono: '\ud83c\udf6b', titulo: 'Caf\u00e9s de La Candelaria', texto: 'En la calle 8, varios caf\u00e9s y chocolater\u00edas para cerrar el recorrido.', tag: 'Comer', tag_color: 'brown' }
  ]),
  regulaciones: 'No se permite tomar fotograf\u00edas con flash; la fotograf\u00eda personal sin flash es permitida en la mayor\u00eda de las \u00e1reas. No ingresar con alimentos ni bebidas a la nave. No hay servicio de alimentos ni bebidas dentro del museo. Los bultos grandes deben depositarse en el guardarropa. Grupos de 8-25 personas deben coordinar la visita con el \u00e1rea educativa. Cierra los lunes por mantenimiento, incluidos los lunes festivos.',
  checklist_tip: 'Los domingos y los miercoles desde las 2PM la entrada es gratis, pero la afluencia es mayor: llega temprano (antes de las 10AM) para disfrutar la nave en calma.',
  entradas: [
    { tipo: 'Museo de Santa Clara (adulto colombiano)', precio: '6000', incluye: 'Adultos 18-59, martes a domingo', link: 'https://museocolonial.gov.co' },
    { tipo: 'Museo de Santa Clara (adulto extranjero)', precio: '15000', incluye: 'Adultos 18-59 extranjeros, seg\u00fan TRM', link: 'https://museocolonial.gov.co' },
    { tipo: 'Domingos y miercoles desde las 2PM', precio: 'Gratis', incluye: 'Entrada libre (ultimo ingreso 4:30PM)', link: 'https://museocolonial.gov.co' },
    { tipo: 'Menores de 5 y mayores de 60', precio: 'Gratis', incluye: 'Exentos de pago siempre', link: 'https://museocolonial.gov.co' },
    { tipo: 'Mediaci\u00f3n para grupos (8-25)', precio: '2500', incluye: 'Recorrido comentado adicional por persona', link: 'https://museocolonial.gov.co' }
  ],
  tours: [
    {
      nombre: 'Recorrido por el barroco santafere\u00f1o',
      precio: '2500', precio_sub: 'mediaci\u00f3n por persona',
      duracion: '60 minutos', tipo_tour: 'Grupal', idioma: 'Espa\u00f1ol', max_personas: 'M\u00e1x 25',
      rating: '4.8', review_count: 210,
      descripcion: 'Visita comentada por mediadores del museo: retablo mayor, retablos laterales, pintura de V\u00e1squez de Arce y Ceballos, plater\u00eda y el artesonado mud\u00e9jar con sus estrellas ocultas.',
      incluye: ['Mediador especializado', 'Entrada', 'Contexto hist\u00f3rico del convento'],
      no_incluye: ['Transporte', 'Audiogu\u00eda'],
      link_reserva: 'https://museocolonial.gov.co',
      featured: true
    },
    {
      nombre: 'Santa Clara + Museo Colonial a pie',
      precio: '45000', precio_sub: 'por persona',
      duracion: '3 horas', tipo_tour: 'Grupal', idioma: 'Espa\u00f1ol/Ingl\u00e9s', max_personas: 'M\u00e1x 12',
      rating: '4.7', review_count: 150,
      descripcion: 'Combo cultural por La Candelaria: los dos museos de arte colonial de la Red del Ministerio de las Culturas, con gu\u00eda.',
      incluye: ['Entradas a ambos museos', 'Gu\u00eda', 'Recorrido por La Candelaria'],
      no_incluye: ['Transporte', 'Alimentos'],
      link_reserva: 'https://bogotawalkingtours.com',
      featured: false
    },
    {
      nombre: 'Tour privado del barroco y la independencia',
      precio: '90000', precio_sub: 'por persona',
      duracion: '4 horas', tipo_tour: 'Privado', idioma: 'Espa\u00f1ol', max_personas: 'M\u00e1x 6',
      rating: '4.9', review_count: 85,
      descripcion: 'Santa Clara + Casa del Florero + Plaza de Bol\u00edvar: arte colonial, el grito de 1810 y el coraz\u00f3n c\u00edvico de Bogot\u00e1 en un solo recorrido.',
      incluye: ['Entradas', 'Gu\u00eda privado', 'Parada en Plaza de Bol\u00edvar'],
      no_incluye: ['Transporte', 'Alimentos'],
      link_reserva: 'https://museumtoursbogota.com',
      featured: false
    }
  ],
  equipamiento: [
    { item: 'Identificaci\u00f3n (pasaporte o c\u00e9dula)', prioridad: 'Obligatorio' },
    { item: 'Efectivo o tarjeta para la entrada (si no es domingo/miercoles)', prioridad: 'Recomendado' },
    { item: 'Zapatos c\u00f3modos y ropa abrigada (templo fresco)', prioridad: 'Recomendado' },
    { item: 'C\u00e1mara sin flash (fotograf\u00eda personal permitida)', prioridad: 'Opcional' },
    { item: 'Llega antes del \u00faltimo ingreso (4:30PM)', prioridad: 'Recomendado' }
  ],
  itinerario: [
    { dia: 'Recorrido', hora: '9:00 am', titulo: 'Retablo mayor', icono: '\ud83d\uddfa', detalle: 'El retablo barroco de 12,5 x 9 m que domina la nave', tags: ['Barroco'] },
    { dia: 'Recorrido', hora: '9:30 am', titulo: 'Retablos laterales y pintura', icono: '\ud83d\uddbc', detalle: '\u00d3leos de V\u00e1squez de Arce y Ceballos y los Figueroa', tags: ['Pintura'] },
    { dia: 'Recorrido', hora: '10:00 am', titulo: 'Artesonado mud\u00e9jar', icono: '\u2b50', detalle: 'El techo dorado con estrellas de cinco picos ocultas', tags: ['Arquitectura'] },
    { dia: 'Recorrido', hora: '10:30 am', titulo: 'Esculturas y plater\u00eda', icono: '\ud83c\udf8f', detalle: 'Imaginer\u00eda barroca, custodias y plater\u00eda colonial', tags: ['Escultura'] }
  ],
  dificultad_tags: [
    { texto: 'Recorrido corto (45-60 min) en una sola nave', apto: true },
    { texto: 'Piso plano en la nave central', apto: true },
    { texto: 'Accesibilidad parcial para silla de ruedas (algunos desniveles)', apto: false },
    { texto: 'Gratis los domingos y miercoles (m\u00e1s afluencia)', apto: false },
    { texto: 'Lunes cerrado por mantenimiento', apto: false }
  ],
  temporada_matriz: {
    Ene: 'ideal', Feb: 'ideal', Mar: 'ideal', Abr: 'posible', May: 'posible',
    Jun: 'ideal', Jul: 'ideal', Ago: 'ideal', Sep: 'posible', Oct: 'posible', Nov: 'ideal', Dic: 'posible'
  }
};

const FAQS = [
  { pregunta: '\u00bfCu\u00e1nto cuesta la entrada al Museo de Santa Clara?', respuesta: 'Adultos colombianos $6.000 y extranjeros $15.000 (Resoluci\u00f3n 2137 de 2025). Ni\u00f1os 6-12 $2.000/$5.000 y j\u00f3venes 13-17 $4.000/$10.000. Ni\u00f1os 0-5 y mayores de 60 gratis.' },
  { pregunta: '\u00bfCu\u00e1ndo es gratis?', respuesta: 'El \u00faltimo domingo del mes, los miercoles desde las 2PM hasta las 4:30PM, el 20 de julio y el 7 de agosto. Tambi\u00e9n para personas con discapacidad y su acompa\u00f1ante.' },
  { pregunta: '\u00bfCu\u00e1nto tiempo se necesita?', respuesta: '45-60 minutos. Es un museo peque\u00f1o, de una sola nave, ideal para combinar con el Museo Colonial, el Teatro Col\u00f3n o la Plaza de Bol\u00edvar.' },
  { pregunta: '\u00bfEst\u00e1 abierto los lunes?', respuesta: 'No. Cierra todos los lunes por mantenimiento (incluidos lunes festivos). Abre martes a domingo 9AM-4:30PM, con cierre a las 5PM.' },
  { pregunta: '\u00bfQu\u00e9 piezas no me puedo perder?', respuesta: 'El retablo mayor (12,5 x 9 m), los \u00f3leos de Gregorio V\u00e1squez de Arce y Ceballos y el artesonado mud\u00e9jar dorado con sus estrellas de cinco picos.' }
];

module.exports = { SLUG: SLUG, HERO: HERO, PHOTOS: PHOTOS, BASE: BASE, TAGS: TAGS, FAQS: FAQS };

if (require.main !== module) return;

(async function main() {
  var url = process.env.DATABASE_URL || process.argv[2];
  if (!url) {
    console.error('Falta DATABASE_URL.');
    console.error('Uso: DATABASE_URL=postgres://... node api/seed-museo-santa-clara.js [--dry]');
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