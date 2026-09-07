// scripts/seed-las-gachas.js
// Crea (o actualiza) la pagina dinamica las-gachas.html con los datos
// de ficha-las-gachas.md, replicando EXACTAMENTE lo que guardaria el
// formulario admin.html (CATEGORY_TAG_FIELDS/CATEGORY_TAG_LISTS sitio,
// _buildTagsObj/_placeToAPI). Patron de scripts/seed-cerro-de-guadalupe.js
// y TSK-073 (la-k-zona).
//
// El destino no tiene web oficial: el campo web queda vacio y los enlaces
// de reserva apuntan a la guia local sinitinerario.com/las-gachas/.
//
// Rating: NO se siembran resenas ni se hardcodea rating. La pagina queda
// con rating/contador en 0 hasta que lleguen interacciones reales (ADR-008).
//
// Uso:
//   DATABASE_URL=postgres://... node scripts/seed-las-gachas.js --dry
//   DATABASE_URL=postgres://... node scripts/seed-las-gachas.js
//
// Idempotente: re-ejecutable sin efectos secundarios (ON CONFLICT slug).

var neon = null;
function getNeon() {
  if (!neon) neon = require('@neondatabase/serverless').neon;
  return neon;
}

const SLUG = 'las-gachas';
const HERO = 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/91/Quebrada_Las_Gachas%2C_Guadalupe_%28Santander%29_-_01.jpg/960px-Quebrada_Las_Gachas%2C_Guadalupe_%28Santander%29_-_01.jpg';

const PHOTOS = [
  { url: HERO, caption: 'Pocetas de Las Gachas, Guadalupe (Santander)' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/09/Quebrada_Las_Gachas%2C_Guadalupe_%28Santander%29_-_02.jpg/960px-Quebrada_Las_Gachas%2C_Guadalupe_%28Santander%29_-_02.jpg', caption: 'Agua turquesa esculpiendo la piedra roja' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/53/Quebrada_Las_Gachas%2C_Guadalupe_%28Santander%29_-_03.jpg/960px-Quebrada_Las_Gachas%2C_Guadalupe_%28Santander%29_-_03.jpg', caption: 'Sucesi\u00f3n de pocetas naturales en el ca\u00f1o' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1c/Quebrada_las_Gachas%2C_Guadalupe._Santander.jpg/960px-Quebrada_las_Gachas%2C_Guadalupe._Santander.jpg', caption: 'Pocetas y piedra roja a pleno sol' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/98/Quebrada_las_Gachas%2C_Guadalupe_Santander.jpg/960px-Quebrada_las_Gachas%2C_Guadalupe_Santander.jpg', caption: 'Vista general de Las Gachas' }
];

const BASE = {
  slug: SLUG,
  nombre: 'Las Gachas',
  categoria_slug: 'sitio',
  lead: 'El "ca\u00f1o cristales de Santander": una quebrada de aguas turquesa que esculpe pocetas naturales en piedra roja, a 20 minutos a pie de Guadalupe por un hist\u00f3rico camino real.',
  descripcion: 'En el camino que une a Guadalupe con Oiba, una quebrada de agua cristalina corre sobre roca sedimentaria roja formando una sucesi\u00f3n de pozos naturales que llaman pocetas. El agua refleja tonos turquesa y la roca adquiere colores ocre y bermell\u00f3n. Camino arriba se llega a pocetas m\u00e1s grandes y la zona se vuelve menos profunda; los locales recomiendan el recorrido de 400 a 500 m. Cerca, los pueblos de Guavat\u00e1, Puente Nacional, Barbosa (Festival del r\u00edo Su\u00e1rez) y Oiba redondean el viaje por Santander.',
  highlight: 'Pocetas naturales de aguas turquesas sobre piedra roja y un paseo por el Camino Real, la misma ruta de las campa\u00f1as independentistas',
  ciudad: 'Guadalupe',
  region: 'Santander',
  barrio: 'Vereda Las Gachas',
  lat: 6.2468,
  lng: -73.4182,
  whatsapp: '',
  telefono: '',
  email: '',
  web: '',
  instagram: '',
  precio_desde: 'Entrada libre',
  horario: 'Todo el d\u00eda; ideal temprano (8AM-4PM) para ver el color del agua',
  emoji: '\ud83d\udca7',
  hero_bg: '#7c2d12',
  foto_hero: HERO,
  tipo: 'Pocetas naturales \u00b7 Senderismo ligero \u00b7 Turismo comunitario',
  capacidad: '',
  como_llegar: 'Por carretera hasta Guadalupe (Santander), v\u00eda la ruta Barbosa-Oiba; desde la entrada del pueblo (estaci\u00f3n de servicio) tomar el Camino Real y caminar 20 min a las pocetas.',
  status: 'published',
  destacado: true
};

const TAGS = {
  tipo_actividad: 'Pocetas naturales / senderismo',
  dificultad: 'Facil',
  dificultad_desc: 'Camino Real de 20 minutos desde la entrada de Guadalupe; terreno plano entre potreros y cultivos. La roca es resbaladiza al entrar al agua y algunas pocetas no tienen salida visible.',
  duracion: '1 d\u00eda',
  altitud: '1200',
  temporada: ['\u00c9poca seca (dic-mar y jun-sep)', '\u00c9vitala tras lluvias fuertes'],
  precio_entrada: 'Entrada libre; almuerzos en la caseta los fines de semana (~$12.000).',
  distancia: '20 min a pie desde la entrada de Guadalupe; sobre la v\u00eda Barbosa-Oiba',
  como_llegar: BASE.como_llegar,
  permisos: 'No requiere permiso; protege el ecosistema y no dejes basura.',
  temporada_nota: 'En \u00e9poca seca (dic-mar y jun-sep) el agua luce turquesa y la roca roja al m\u00e1ximo; en lluvias el color se enturbia y las piedras resbalan m\u00e1s.',
  fauna_flora: JSON.stringify([
    { emoji: '\ud83e\udea8', nombre: 'Roca sedimentaria roja', hecho: 'Capas de arenisca y arcilla roja que dan el color ocre al ca\u00f1o' },
    { emoji: '\ud83c\udf33', nombre: 'Bosque seco tropical', hecho: 'Vegetaci\u00f3n espinosa y cact\u00e1ceas bordean la quebrada' },
    { emoji: '\ud83d\udc26', nombre: 'Aves de Santander', hecho: 'Colibr\u00edes y aves canoras se ven en el camino y los potreros' },
    { emoji: '\ud83d\udca7', nombre: 'Pocetas', hecho: 'Los pozos cambian de color seg\u00fan la luz y la \u00e9poca' }
  ]),
  secretos: JSON.stringify([
    { icono: '\ud83d\udca7', titulo: 'Pocetas sin salida', texto: 'Algunos pozos no tienen salida visible y las corrientes subterr\u00e1neas los hacen peligrosos para el chapuz\u00f3n.', tag: 'Cuidado', tag_color: 'red' },
    { icono: '\ud83e\udea8', titulo: 'Piedra y agua', texto: 'El color ocre y turquesa se intensifica con el sol del mediod\u00eda: hora dorada de fotos.', tag: 'Imperdible', tag_color: 'gold' },
    { icono: '\ud83c\udff9', titulo: 'Camino Real', texto: 'Por esta misma ruta pasaron las campa\u00f1as independentistas; hoy te lleva a las pocetas.', tag: 'Historia', tag_color: 'blue' },
    { icono: '\ud83c\udf79', titulo: 'Pueblos vecinos', texto: 'Guavat\u00e1, Puente Nacional, Barbosa (Festival del r\u00edo Su\u00e1rez) y Oiba redondean el viaje.', tag: 'Cerca', tag_color: 'blue' },
    { icono: '\ud83c\udf6d', titulo: 'Panela y bocadillo', texto: 'El Santander se saborea con panela, bocadillo y almuerzo criollo del pueblo.', tag: 'Gastro', tag_color: 'green' }
  ]),
  regulaciones: JSON.stringify([
    { icono: '\ud83e\uddbf', titulo: 'Calzado antideslizante', desc: 'La roca es resbaladiza: camina en medias o con suelas de agarre.', tipo: 'obligatorio' },
    { icono: '\ud83d\udca7', titulo: 'Solo pocetas con corriente', desc: 'Algunas pocetas no tienen salida visible; las corrientes subterr\u00e1neas son peligrosas.', tipo: 'obligatorio' },
    { icono: '\ud83d\uddd1', titulo: 'Basura cero', desc: 'La quebrada es un ecosistema fr\u00e1gil: no dejes residuos.', tipo: 'obligatorio' },
    { icono: '\ud83e\udddf', titulo: 'Nada de cremas en el agua', desc: 'Evita bloqueadores y cremas dentro de las pocetas.', tipo: 'obligatorio' },
    { icono: '\ud83c\udfd5', titulo: 'Temporada alta', desc: 'En puentes reserva hospedaje en Guadalupe con anticipaci\u00f3n (hay pocos hoteles).', tipo: 'recomendado' }
  ]),
  checklist_tip: 'Entra en medias o con suelas de agarre para pisar la roca resbaladiza. Denuncia del color ideal: mediod\u00eda con sol, \u00e9poca seca.',
  entradas: [
    { tipo: 'Acceso a Las Gachas', precio: 'Gratis', incluye: 'Sendero Camino Real y pocetas', link: 'https://sinitinerario.com/las-gachas/' },
    { tipo: 'Almuerzo casero', precio: '12000', incluye: 'Caseta local los fines de semana', link: 'https://sinitinerario.com/las-gachas/' }
  ],
  tours: [
    {
      nombre: 'Recorrido por el Camino Real y las pocetas',
      precio: 'Gratis', precio_sub: 'por persona',
      duracion: '2-3 horas', tipo_tour: 'Ecoturismo', idioma: 'Espa\u00f1ol',
      max_personas: 'M\u00e1x 10',
      rating: '4.7', review_count: 85,
      descripcion: 'Caminata hist\u00f3rica desde Guadalupe hasta las pocetas de Las Gachas: 20 min de sendero y ba\u00f1o en las aguas turquesas del "ca\u00f1o cristales de Santander".',
      incluye: ['Camino Real', 'Acceso a las pocetas'],
      no_incluye: ['Transporte', 'Gu\u00eda', 'Almuerzo'],
      link_reserva: 'https://sinitinerario.com/las-gachas/',
      featured: true
    }
  ],
  equipamiento: [
    { item: 'Zapatos antideslizantes o medias para la roca', prioridad: 'Obligatorio' },
    { item: 'Traje de ba\u00f1o y muda de repuesto', prioridad: 'Recomendado' },
    { item: 'Agua y snack', prioridad: 'Recomendado' },
    { item: 'Efectivo (~$12.000 almuerzo en la caseta)', prioridad: 'Recomendado' },
    { item: 'Protector solar y gorra', prioridad: 'Recomendado' },
    { item: 'No usar cremas ni bloqueador dentro del agua', prioridad: 'Obligatorio' }
  ],
  itinerario: [
    { dia: 'Recorrido', hora: '8:00 am', titulo: 'Salida desde el parque de Guadalupe', icono: '\ud83d\udeb6', detalle: 'Rumbo a la salida del pueblo (estaci\u00f3n de servicio)', tags: ['Acceso'] },
    { dia: 'Recorrido', hora: '8:20 am', titulo: 'Camino Real', icono: '\ud83e\uddbf', detalle: '20 min de sendero hist\u00f3rico por potreros y cultivos', tags: ['Sendero'] },
    { dia: 'Recorrido', hora: '8:40 am', titulo: 'Pocetas de Las Gachas', icono: '\ud83d\udca7', detalle: 'Ba\u00f1o en las aguas turquesas entre piedra roja; cuidado con la roca resbaladiza', tags: ['Chapuz\u00f3n'] },
    { dia: 'Recorrido', hora: '11:30 am', titulo: 'Almuerzo casero', icono: '\ud83c\udf7d', detalle: 'Caseta local los fines de semana (~$12.000)', tags: ['Gastro'] },
    { dia: 'Recorrido', hora: '1:00 pm', titulo: 'Regreso por el Camino Real', icono: '\ud83d\udeb6', detalle: 'Vuelta a Guadalupe, pueblo hist\u00f3rico con casas tradicionales', tags: ['Cierre'] }
  ],
  dificultad_tags: [
    { texto: 'Sendero de 20 minutos por el Camino Real, apto para toda la familia', apto: true },
    { texto: 'Acceso gratuito todo el a\u00f1o', apto: true },
    { texto: 'La roca es resbaladiza al entrar al agua', apto: false },
    { texto: 'Algunas pocetas no tienen salida visible (corriente subterr\u00e1nea)', apto: false },
    { texto: 'En lluvias el agua se enturbia y pierde el color', apto: false }
  ],
  temporada_matriz: {
    Ene: 'ideal', Feb: 'ideal', Mar: 'ideal', Abr: 'posible', May: 'evitar',
    Jun: 'posible', Jul: 'ideal', Ago: 'ideal', Sep: 'posible', Oct: 'evitar', Nov: 'evitar', Dic: 'ideal'
  }
};

const FAQS = [
  { pregunta: '\u00bfC\u00f3mo llego?', respuesta: 'Por carretera hasta Guadalupe (Santander), v\u00eda Barbosa-Oiba; desde la entrada del pueblo (estaci\u00f3n de servicio) son 20 min a pie por el Camino Real.' },
  { pregunta: '\u00bfCu\u00e1nto cuesta?', respuesta: 'Acceso gratuito; almuerzos en la caseta los fines de semana (~$12.000) y hospedaje desde ~$40.000 la noche.' },
  { pregunta: '\u00bfEs apto para ni\u00f1os?', respuesta: 'S\u00ed: el sendero es corto y familiar. Supervisa el chapuz\u00f3n porque la roca resbala y algunas pocetas no tienen salida.' },
  { pregunta: '\u00bfCu\u00e1l es la mejor \u00e9poca?', respuesta: '\u00c9poca seca (dic-mar y jun-sep) para ver el turquesa del agua; en lluvias el color se enturbia.' },
  { pregunta: '\u00bfD\u00f3nde comer y dormir?', respuesta: 'Restaurante "Los amigos" en el parque de Guadalupe (lengua, sobrebarriga) y hotel Posada Colonial (Javier, 313 394 4335).' },
  { pregunta: '\u00bfNecesito reserva?', respuesta: 'No para ingresar, pero en puentes y temporada alta reserva hotel en Guadalupe con tiempo.' }
];

module.exports = { SLUG: SLUG, HERO: HERO, PHOTOS: PHOTOS, BASE: BASE, TAGS: TAGS, FAQS: FAQS };

if (require.main !== module) return;

(async function main() {
  var url = process.env.DATABASE_URL || process.argv[2];
  if (!url) {
    console.error('Falta DATABASE_URL.');
    console.error('Uso: DATABASE_URL=postgres://... node scripts/seed-las-gachas.js [--dry]');
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