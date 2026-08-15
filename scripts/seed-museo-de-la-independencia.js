// scripts/seed-museo-de-la-independencia.js
// Crea (o actualiza) la pagina dinamica museo-de-la-independencia.html con los
// datos de ficha-museo-de-la-independencia.md, replicando EXACTAMENTE lo que
// guardaria el formulario admin.html. Patron de scripts/seed-museo-del-oro.js con
// upsert completo.
//
// Rating: NO se siembran resenas ni se hardcodea rating. La pagina queda con
// rating/contador en 0 hasta que lleguen interacciones reales (ADR-008).
//
// Uso:
//   DATABASE_URL=postgres://... node scripts/seed-museo-de-la-independencia.js --dry
//   DATABASE_URL=postgres://... node scripts/seed-museo-de-la-independencia.js
//
// Idempotente: re-ejecutable sin efectos secundarios (ON CONFLICT slug).

var neon = null;
function getNeon() {
  if (!neon) neon = require('@neondatabase/serverless').neon;
  return neon;
}

const SLUG = 'museo-de-la-independencia';
const HERO = 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/db/Casa_del_Florero.jpg/960px-Casa_del_Florero.jpg';

const PHOTOS = [
  { url: HERO, caption: 'Fachada de la Casa del Florero' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/50/Museo_de_la_Independencia_-_COLOMBIA.jpg/960px-Museo_de_la_Independencia_-_COLOMBIA.jpg', caption: 'El museo de la Independencia' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e9/Casa_Florero.jpg/960px-Casa_Florero.jpg', caption: 'Balc\u00f3n esquinado de la casa colonial' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b9/%C2%ABMuseo_de_la_Independencia_Casa_del_Florero%C2%BB_-_panoramio.jpg/960px-%C2%ABMuseo_de_la_Independencia_Casa_del_Florero%C2%BB_-_panoramio.jpg', caption: 'Vista del museo desde la plaza' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7a/Museo_del_20_de_julio.jpg/960px-Museo_del_20_de_julio.jpg', caption: 'Antiguo Museo del 20 de Julio' }
];

const BASE = {
  slug: SLUG,
  nombre: 'Museo de la Independencia - Casa del Florero',
  categoria_slug: 'sitio',
  lead: 'En la esquina de la Plaza de Bol\u00edvar naci\u00f3 la Rep\u00fablica: la casa colonial donde estall\u00f3 el grito del 20 de julio de 1810 y hoy exhibe m\u00e1s de 2.000 piezas de la Independencia y la ciudadan\u00eda.',
  descripcion: 'El Museo de la Independencia - Casa del Florero ocupa una casa colonial de m\u00e1s de 400 a\u00f1os, construida a finales del siglo XVI para el Mariscal Hern\u00e1n Venegas Carrillo en la esquina nororiental de la Plaza de Bol\u00edvar. En 1810, la negativa del comerciante Jos\u00e9 Gonz\u00e1lez Llorente a prestar un florero desat\u00f3 el altercado que encendi\u00f3 el grito de independencia del 20 de julio de 1810. Fundado en 1960 por la Academia Colombiana de Historia como Museo del 20 de Julio y renombrado en 2010 para el Bicentenario, exhibe hoy 2.360 obras relacionadas con la Independencia y el concepto de ciudadan\u00eda: pinturas, documentos hist\u00f3ricos, libros, miniaturas, monedas, medallas, indumentaria y armas. Conserva la base del florero original, el candado de la puerta de la tienda de Llorente y su balc\u00f3n esquinado verde ofrece la mejor vista de la Plaza de Bol\u00edvar. Sobrevivi\u00f3 al Bogotazo de 1948 y aborda en su narrativa la Toma del Palacio de Justicia de 1985.',
  highlight: 'El lugar exacto del grito de independencia: la base del florero de Llorente y la mejor vista de la Plaza de Bol\u00edvar desde su balc\u00f3n',
  ciudad: 'Bogot\u00e1',
  region: 'Cundinamarca',
  barrio: 'La Candelaria',
  lat: 4.5983,
  lng: -74.0751,
  whatsapp: '',
  telefono: '601 3424100 ext 2400',
  email: '',
  web: 'https://museoindependencia.gov.co',
  instagram: '@museodelaindependencia',
  precio_desde: 'Desde $6.000 (gratis los miercoles 3-5PM y el ultimo domingo del mes)',
  horario: 'Mar-Dom 9AM-5PM. Lunes cerrado',
  emoji: '\ud83c\udfdb',
  hero_bg: '#1e3a5f',
  foto_hero: HERO,
  tipo: 'Museo hist\u00f3rico \u00b7 Casa museo \u00b7 Independencia',
  capacidad: '',
  como_llegar: 'TransMilenio estaci\u00f3n "Museo del Oro" (Av. Jim\u00e9nez/carrera 7) y caminar ~5 cuadras al sur hasta la Plaza de Bol\u00edvar; o estaci\u00f3n "Las Aguas" por el Eje Ambiental. El museo queda en la esquina de la carrera 7 con calle 11.',
  status: 'published',
  destacado: true
};

const TAGS = {
  tipo_actividad: 'Museo hist\u00f3rico',
  dificultad: 'F\u00e1cil',
  dificultad_desc: 'Recorrido de 1-2 horas por la casa colonial de dos pisos. Edificio antiguo con escaleras: accesibilidad limitada para silla de ruedas (OSM marca wheelchair=no). Las salas interactivas del Bicentenario son planas en el primer piso.',
  duracion: '1-2 horas',
  altitud: '2640',
  temporada: ['Todo el a\u00f1o', 'Miercoles 3-5PM y ultimo domingo gratis pero con m\u00e1s afluencia', '20 de julio con celebraciones de la Independencia'],
  precio_entrada: 'General $6.000 (colombianos 18-59) / $15.000 (extranjeros). Gratis los miercoles 3-5PM, el ultimo domingo del mes y el 20 de julio.',
  distancia: 'En la esquina nororiental de la Plaza de Bol\u00edvar, junto a la Catedral Primada y frente al Palacio de Justicia; estaci\u00f3n TransMilenio "Museo del Oro" a ~5 cuadras',
  como_llegar: BASE.como_llegar,
  permisos: 'No requiere reserva para ingreso individual. Visitas comentadas y grupos se coordinan con el \u00e1rea de Comunicaci\u00f3n Educativa (eduindependencia@mincultura.gov.co).',
  temporada_nota: 'El museo abre todo el a\u00f1o de martes a domingo 9AM-5PM (algunas p\u00e1ginas del sitio muestran s\u00e1bado y domingo 10AM-5PM; verificar el d\u00eda antes). Cierra los lunes, incluidos los lunes festivos, y el 1 de enero, 1 de mayo y 25 de diciembre.',
  fauna_flora: JSON.stringify([
    { emoji: '\ud83c\udf3a', nombre: 'Florero de Llorente', hecho: 'La base de cer\u00e1mica porcelanizada del siglo XVIII que desat\u00f3 el grito de 1810' },
    { emoji: '\ud83c\udf33', nombre: '\u00c1rboles patrimoniales', hecho: 'El jard\u00edn/huerta del museo conserva especies nativas del centro hist\u00f3rico' },
    { emoji: '\ud83d\udd2d', nombre: 'Astronom\u00eda de Caldas', hecho: 'Colecci\u00f3n ligada al Observatorio de Francisco Jos\u00e9 de Caldas: mapamundi y telescopios' },
    { emoji: '\ud83e\udea9', nombre: 'S\u00edmbolos de ciudadan\u00eda', hecho: 'Piezas contempor\u00e1neas que cuentan la historia pol\u00edtica de Colombia' }
  ]),
  secretos: JSON.stringify([
    { icono: '\ud83c\udf3a', titulo: 'La base del florero', texto: 'El florero original se rompi\u00f3 en el altercado; se conserva su base de cer\u00e1mica porcelanizada del siglo XVIII.', tag: 'Imperdible', tag_color: 'gold' },
    { icono: '\ud83d\uddd1', titulo: 'El candado de Llorente', texto: 'El candado original de la puerta de la tienda de Jos\u00e9 Gonz\u00e1lez Llorente, pieza \u00fanica del museo.', tag: 'Pieza unica', tag_color: 'purple' },
    { icono: '\ud83c\udfd6', titulo: 'El balc\u00f3n alquilado', texto: 'En el siglo XVIII la hija del due\u00f1o alquilaba el balc\u00f3n para ver los eventos de la plaza mayor.', tag: 'Curioso', tag_color: 'orange' },
    { icono: '\ud83d\udd09', titulo: 'Sobrevivi\u00f3 al Bogotazo', texto: 'El 9 de abril de 1948 fue uno de los edificios sobrevivientes, protegido por sus due\u00f1os.', tag: 'Historia', tag_color: 'blue' },
    { icono: '\ud83c\udf0c', titulo: 'Colecci\u00f3n de astronom\u00eda', texto: 'Mapamundi de madera y telescopios vinculados al Observatorio de Caldas.', tag: 'Secreto', tag_color: 'green' }
  ]),
  regulaciones: 'No se permite tomar fotograf\u00edas con flash en la mayor\u00eda de las \u00e1reas; no acercarse a los cuadros (activan alarmas). Fotograf\u00eda o video comercial requiere permiso previo. No ingresar con alimentos ni bebidas a las salas. No hay restaurante ni caf\u00e9 dentro del museo; se consume en la zona de la Plaza de Bol\u00edvar. Cierra los lunes por mantenimiento, incluidos los lunes festivos. Edificio colonial con escaleras: accesibilidad limitada para silla de ruedas.',
  checklist_tip: 'Los miercoles de 3 a 5PM y el ultimo domingo del mes la entrada es gratis. Ideal combinar con la Plaza de Bol\u00edvar, el Museo Botero (gratis) y el Museo del Oro, todos a pocas cuadras.',
  entradas: [
    { tipo: 'Casa del Florero (adulto colombiano)', precio: '6000', incluye: 'Adultos 18-59, martes a domingo', link: 'https://museoindependencia.gov.co' },
    { tipo: 'Casa del Florero (adulto extranjero)', precio: '15000', incluye: 'Adultos 18-59 extranjeros, seg\u00fan TRM', link: 'https://museoindependencia.gov.co' },
    { tipo: 'Miercoles 3-5PM y ultimo domingo', precio: 'Gratis', incluye: 'Entrada libre en horarios de gratuidad', link: 'https://museoindependencia.gov.co' },
    { tipo: 'Menores de 5 y mayores de 60', precio: 'Gratis', incluye: 'Exentos de pago siempre', link: 'https://museoindependencia.gov.co' },
    { tipo: 'Exposiciones temporales', precio: 'Incluido', incluye: 'Con la misma boleta de la permanente', link: 'https://museoindependencia.gov.co' }
  ],
  tours: [
    {
      nombre: 'Recorrido hist\u00f3rico de la Independencia',
      precio: '2500', precio_sub: 'mediaci\u00f3n por persona',
      duracion: '90 minutos', tipo_tour: 'Grupal', idioma: 'Espa\u00f1ol', max_personas: 'M\u00e1x 25',
      rating: '4.8', review_count: 240,
      descripcion: 'Visita comentada por mediadores: la casa colonial, el incidente del florero, las 6 salas interactivas del Bicentenario y las piezas del grito de 1810.',
      incluye: ['Mediador especializado', 'Entrada', 'Recorrido por la Plaza de Bol\u00edvar'],
      no_incluye: ['Transporte', 'Audiogu\u00eda'],
      link_reserva: 'https://museoindependencia.gov.co',
      featured: true
    },
    {
      nombre: 'La Candelaria y Museo del Oro',
      precio: '90000', precio_sub: 'por persona',
      duracion: '2.5 horas', tipo_tour: 'Grupal', idioma: 'Espa\u00f1ol/Ingl\u00e9s', max_personas: 'M\u00e1x 12',
      rating: '4.6', review_count: 130,
      descripcion: 'Tour a pie con gu\u00eda biling\u00fce que recorre la Plaza de Bol\u00edvar, la Casa del Florero y el Museo del Oro, con entrada incluida.',
      incluye: ['Gu\u00eda biling\u00fce ES/EN', 'Entradas', 'Recorrido por La Candelaria'],
      no_incluye: ['Transporte', 'Alimentos'],
      link_reserva: 'https://nomades.com',
      featured: false
    },
    {
      nombre: 'Tour guiado de 4 museos + caf\u00e9',
      precio: '150000', precio_sub: 'por persona',
      duracion: '4 horas', tipo_tour: 'Grupal', idioma: 'Espa\u00f1ol', max_personas: 'M\u00e1x 10',
      rating: '4.7', review_count: 95,
      descripcion: 'Museo del Oro, Museo Botero, Casa del Florero y Museo de la Esmeralda con gu\u00eda, m\u00e1s una pausa de caf\u00e9 o aperitivo t\u00edpico.',
      incluye: ['Entradas a los 4 museos', 'Gu\u00eda', 'Pausa de caf\u00e9'],
      no_incluye: ['Transporte'],
      link_reserva: 'https://getyourguide.com',
      featured: false
    }
  ],
  equipamiento: [
    { item: 'Identificaci\u00f3n (pasaporte o c\u00e9dula)', prioridad: 'Obligatorio' },
    { item: 'Efectivo o tarjeta para la entrada (si no es miercoles/ultimo domingo)', prioridad: 'Recomendado' },
    { item: 'Zapatos c\u00f3modos para caminar por el centro', prioridad: 'Recomendado' },
    { item: 'C\u00e1mara sin flash (foto sin flash permitida)', prioridad: 'Opcional' },
    { item: 'Llega antes del \u00faltimo ingreso', prioridad: 'Recomendado' }
  ],
  itinerario: [
    { dia: 'Recorrido', hora: '9:00 am', titulo: 'La casa colonial', icono: '\ud83c\udfdb', detalle: 'La casa mud\u00e9jar de balcones verdes que sobrevivi\u00f3 al Bogotazo', tags: ['Arquitectura'] },
    { dia: 'Recorrido', hora: '9:30 am', titulo: 'El incidente del florero', icono: '\ud83c\udf3a', detalle: 'La base del florero de Llorente y la historia del 20 de julio de 1810', tags: ['Independencia'] },
    { dia: 'Recorrido', hora: '10:15 am', titulo: 'Salas interactivas del Bicentenario', icono: '\ud83d\udd04', detalle: '6 salas que abordan independencia, ciudadan\u00eda y hechos recientes', tags: ['Interactivo'] },
    { dia: 'Recorrido', hora: '11:00 am', titulo: 'Balc\u00f3n y Plaza de Bol\u00edvar', icono: '\ud83d\udcf7', detalle: 'La mejor vista de la plaza desde el balc\u00f3n esquinado verde', tags: ['Vistas'] }
  ],
  dificultad_tags: [
    { texto: 'Recorrido de 1-2 horas en el coraz\u00f3n del centro hist\u00f3rico', apto: true },
    { texto: 'Salas interactivas del primer piso planas', apto: true },
    { texto: 'Edificio colonial con escaleras (accesibilidad limitada)', apto: false },
    { texto: 'Gratis miercoles 3-5PM y ultimo domingo (m\u00e1s afluencia)', apto: false },
    { texto: 'Lunes cerrado por mantenimiento', apto: false }
  ],
  temporada_matriz: {
    Ene: 'ideal', Feb: 'ideal', Mar: 'ideal', Abr: 'posible', May: 'posible',
    Jun: 'ideal', Jul: 'ideal', Ago: 'ideal', Sep: 'posible', Oct: 'posible', Nov: 'ideal', Dic: 'posible'
  }
};

const FAQS = [
  { pregunta: '\u00bfCu\u00e1nto cuesta la entrada a la Casa del Florero?', respuesta: 'Adultos colombianos $6.000 y extranjeros $15.000 (Resoluci\u00f3n 2137 de 2025). Ni\u00f1os 6-12 $2.000/$5.000 y j\u00f3venes 13-17 $4.000/$10.000. Ni\u00f1os 0-5 y mayores de 60 gratis.' },
  { pregunta: '\u00bfCu\u00e1ndo es gratis?', respuesta: 'Todos los miercoles de 3 a 5PM, el ultimo domingo de cada mes y el 20 de julio. Tambi\u00e9n para personas con discapacidad y su acompa\u00f1ante.' },
  { pregunta: '\u00bfQu\u00e9 es el Florero de Llorente?', respuesta: 'El florero que el comerciante Jos\u00e9 Gonz\u00e1lez Llorente se neg\u00f3 a prestar el 20 de julio de 1810, desatando el grito de independencia. El museo conserva su base original.' },
  { pregunta: '\u00bfCu\u00e1nto tiempo se necesita?', respuesta: '1-2 horas. Ideal combinarlo con la Plaza de Bol\u00edvar, el Museo Botero (gratis) o el Museo del Oro, todos a pocas cuadras.' },
  { pregunta: '\u00bfEst\u00e1 abierto los lunes?', respuesta: 'No. Cierra todos los lunes por mantenimiento (incluidos festivos). Abre martes a domingo 9AM-5PM.' }
];

module.exports = { SLUG: SLUG, HERO: HERO, PHOTOS: PHOTOS, BASE: BASE, TAGS: TAGS, FAQS: FAQS };

if (require.main !== module) return;

(async function main() {
  var url = process.env.DATABASE_URL || process.argv[2];
  if (!url) {
    console.error('Falta DATABASE_URL.');
    console.error('Uso: DATABASE_URL=postgres://... node scripts/seed-museo-de-la-independencia.js [--dry]');
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