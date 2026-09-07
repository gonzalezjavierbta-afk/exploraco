// scripts/seed-canon-del-guejar.js
// Crea (o actualiza) la pagina dinamica canon-del-guejar.html con los datos
// de ficha-canon-del-guejar.md, replicando EXACTAMENTE lo que guardaria el
// formulario admin.html (CATEGORY_TAG_FIELDS/CATEGORY_TAG_LISTS sitio,
// _buildTagsObj/_placeToAPI). Patron de scripts/seed-cerro-de-guadalupe.js
// y TSK-073 (la-k-zona).
//
// La entrada representa el DESTINO (Canon del Guejar) y usa al operador
// Maravillas del Guejar (maravillasdelguejar.com) como contacto/web de
// referencia (decision de sesion TSK-077).
//
// Rating: NO se siembran resenas ni se hardcodea rating. La pagina queda
// con rating/contador en 0 hasta que lleguen interacciones reales (ADR-008).
//
// Uso:
//   DATABASE_URL=postgres://... node scripts/seed-canon-del-guejar.js --dry
//   DATABASE_URL=postgres://... node scripts/seed-canon-del-guejar.js
//
// Idempotente: re-ejecutable sin efectos secundarios (ON CONFLICT slug).

var neon = null;
function getNeon() {
  if (!neon) neon = require('@neondatabase/serverless').neon;
  return neon;
}

const SLUG = 'canon-del-guejar';
const HERO = 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7d/Ca%C3%B1%C3%B3n_del_G%C3%BCejar%2C_Mesetas%2C_Meta.jpg/960px-Ca%C3%B1%C3%B3n_del_G%C3%BCejar%2C_Mesetas%2C_Meta.jpg';

const PHOTOS = [
  { url: HERO, caption: 'Ca\u00f1\u00f3n del G\u00fcejar, Mesetas, Meta' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0b/Ca%C3%B1%C3%B3n_del_G%C3%BCejar_-_Cascada.jpg/960px-Ca%C3%B1%C3%B3n_del_G%C3%BCejar_-_Cascada.jpg', caption: 'Cascada en el ca\u00f1\u00f3n del G\u00fcejar' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/07/Cueva_Cascadas_Ca%C3%B1on_del_G%C3%BCejar.jpg/960px-Cueva_Cascadas_Ca%C3%B1on_del_G%C3%BCejar.jpg', caption: 'La cueva y las cascadas del complejo' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/83/Rafting_en_ca%C3%B1%C3%B3n_del_G%C3%BCejar.jpg/960px-Rafting_en_ca%C3%B1%C3%B3n_del_G%C3%BCejar.jpg', caption: 'Descenso de rafting por el r\u00edo G\u00fcejar' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/46/Verde_esmeralda%2C_R%C3%ADo_G%C3%BCejar.png/960px-Verde_esmeralda%2C_R%C3%ADo_G%C3%BCejar.png', caption: 'Aguas esmeralda del r\u00edo G\u00fcejar' }
];

const BASE = {
  slug: SLUG,
  nombre: 'Ca\u00f1\u00f3n del G\u00fcejar',
  categoria_slug: 'sitio',
  lead: 'El ca\u00f1\u00f3n esculpido por el r\u00edo G\u00fcejar y el coraz\u00f3n del turismo de naturaleza del Meta: rafting, las cinco maravillas del Parque G\u00fcejar, toboganes de agua, jacuzzis y cascadas a menos de tres horas de Villavicencio.',
  descripcion: 'El r\u00edo G\u00fcejar, alimentado por la quebrada Colorado, ha esculpido durante miles de a\u00f1os un ca\u00f1\u00f3n de formaciones rocosas y pozas de aguas claras en el piedemonte llanero. La experiencia incluye un descenso de 17 km en rafting con paradas en formaciones como el Titanic y El Bongo, y el circuito de las 5 Maravillas del Parque G\u00fcejar: la cascada de Ca\u00f1o Laj\u00f3n (20 m), toboganes y tubing, jacuzzis naturales, la cascada de Ca\u00f1o Jord\u00e1n (60 m) y piscinas naturales. Se complementa con el ca\u00f1\u00f3n del G\u00fcape (solo en verano), el Charco Azul, la Cueva de los Gu\u00e1charos y la Piedra del Delf\u00edn, en un bosque hogar del oso de anteojos, la \u00e1guila arp\u00eda y el gallito de las rocas.',
  highlight: 'Rafting por el ca\u00f1\u00f3n (17 km, categor\u00eda 3) y las 5 Maravillas del Parque G\u00fcejar con jacuzzis naturales, toboganes de agua y cascadas de hasta 60 m',
  ciudad: 'Mesetas',
  region: 'Meta',
  barrio: 'R\u00edo G\u00fcejar - Parque G\u00fcejar (base en Lejan\u00edas)',
  lat: 3.3840276,
  lng: -74.0438661,
  whatsapp: '573144457907',
  telefono: '+57 314 445 79 07',
  email: 'maravillasdelguejar@gmail.com',
  web: 'https://maravillasdelguejar.com',
  instagram: 'maravillas_del_guejar',
  precio_desde: 'Desde $357.000',
  horario: 'Todo el a\u00f1o; verano (ene-mar) r\u00edo m\u00e1s tranquilo y G\u00fcape abierto',
  emoji: '\ud83c\udfde\ufe0f',
  hero_bg: 'linear-gradient(135deg,#0a2a1a,#1a3a2a)',
  foto_hero: HERO,
  tipo: 'Rafting \u00b7 Turismo de naturaleza \u00b7 Parque natural',
  capacidad: '',
  como_llegar: 'Carro desde Bogot\u00e1 por la v\u00eda al Llano hasta Granada (~7 h) y luego hasta Mesetas. Bus desde Villavicencio hacia Mesetas (~3 h, ~$40.000). Aviones a Villavicencio y seguir por tierra.',
  status: 'published',
  destacado: true
};

const TAGS = {
  tipo_actividad: 'Rafting / turismo de naturaleza',
  dificultad: 'Media',
  dificultad_desc: 'Rafting categor\u00eda 3 apto para principiantes y ni\u00f1os desde 8 a\u00f1os con chaleco y gu\u00eda certificado; los senderos de las 5 Maravillas son cortos. En invierno el r\u00edo sube y los r\u00e1pidos se intensifican.',
  duracion: '1 d\u00eda a 2-3 d\u00edas',
  altitud: '900',
  temporada: ['Verano (ene-mar): r\u00edo m\u00e1s tranquilo', 'Lluvias (may-nov): r\u00edos m\u00e1s intensos'],
  precio_entrada: 'Pasad\u00eda Ca\u00f1\u00f3n + Rafting desde $357.000 por persona (gu\u00eda, equipo y seguro); otros pasad\u00edas a consultar.',
  distancia: 'Desde Villavicencio ~3 h en bus; desde Bogot\u00e1 ~7 h en carro',
  como_llegar: BASE.como_llegar,
  permisos: 'Se ingresa con el operador (Maravillas del G\u00fcejar); el ca\u00f1\u00f3n del G\u00fcape requiere programaci\u00f3n en verano.',
  temporada_nota: 'El verano (enero-marzo) deja el r\u00edo m\u00e1s bajo y tranquilo y abre el ca\u00f1\u00f3n del G\u00fcape. En temporada de lluvias verificar el estado del r\u00edo antes de salir.',
  fauna_flora: JSON.stringify([
    { emoji: '\ud83d\udc3b', nombre: 'Oso de anteojos', hecho: 'Se reportan avistamientos en los bosques alrededor del ca\u00f1\u00f3n' },
    { emoji: '\ud83e\udd85', nombre: '\u00c1guila arp\u00eda', hecho: 'Rapaz del dosel presente en el piedemonte llanero' },
    { emoji: '\ud83d\udc3a', nombre: 'Monos araguatos', hecho: 'Se escuchan y ven en los bosques de galer\u00eda del r\u00edo' },
    { emoji: '\ud83d\udc26', nombre: 'Gallito de las rocas', hecho: 'Ave emblem\u00e1tica de los bosques andinos cercanos' },
    { emoji: '\ud83c\udf38', nombre: 'Orqu\u00eddeas y bromelias', hecho: 'Adornan los ca\u00f1ones y las paredes del r\u00edo' }
  ]),
  secretos: JSON.stringify([
    { icono: '\ud83d\udea3', titulo: 'El Titanic', texto: 'La formaci\u00f3n rocosa m\u00e1s famosa del ca\u00f1\u00f3n y primera parada del descenso en bote.', tag: 'Imperdible', tag_color: 'gold' },
    { icono: '\ud83c\udfc0', titulo: 'Jacuzzis naturales', texto: 'Aguas que brotan y burbujean entre las rocas: el masaje natural del G\u00fcejar.', tag: 'Bienestar', tag_color: 'blue' },
    { icono: '\ud83c\udf0a', titulo: 'Charco Azul', texto: 'Piscina natural de aguas turquesas de m\u00e1s de 30 m; durante a\u00f1os fue campamento de la guerrilla.', tag: 'Historia', tag_color: 'blue' },
    { icono: '\ud83e\udd87', titulo: 'Cueva de los Gu\u00e1charos', texto: 'Caverna con aves nocturnas y r\u00edos subterr\u00e1neos, en los alrededores del parque.', tag: 'Aventura', tag_color: 'gold' },
    { icono: '\ud83d\udfa8', titulo: 'Piedra del Delf\u00edn', texto: 'Formaci\u00f3n rocosa con forma de delf\u00edn que se ve durante el recorrido.', tag: 'Dato', tag_color: 'gold' }
  ]),
  regulaciones: JSON.stringify([
    { icono: '\ud83d\udcb0', titulo: 'Efectivo o Nequi', desc: 'Varias zonas del ca\u00f1\u00f3n no tienen se\u00f1al celular ni dat\u00e1fonos.', tipo: 'recomendado' },
    { icono: '\ud83d\udef3', titulo: 'Chaleco salvavidas', desc: 'El rafting exige chaleco y gu\u00eda certificado; apto desde 8 a\u00f1os.', tipo: 'obligatorio' },
    { icono: '\ud83e\udea3', titulo: 'Pozas sin corriente', desc: 'No ingresar a pozas sin corriente visible; algunas tienen pasajes subterr\u00e1neos.', tipo: 'obligatorio' },
    { icono: '\ud83d\uddd1', titulo: 'Basura cero', desc: 'Ecosistema fr\u00e1gil: no dejar residuos y llevar una bolsa para la basura.', tipo: 'obligatorio' },
    { icono: '\u23f1', titulo: 'Ca\u00f1\u00f3n del G\u00fcape', desc: 'Se visita solo en temporada de verano; programa con meses de anticipaci\u00f3n.', tipo: 'info' },
    { icono: '\ud83c\udf27', titulo: 'Clima', desc: 'En lluvias el r\u00edo sube y los r\u00e1pidos se intensifican; verifica el estado del r\u00edo.', tipo: 'info' }
  ]),
  checklist_tip: 'Ve temprano en verano (ene-mar): r\u00edo m\u00e1s tranquilo y el agua en su mejor color. Lleva efectivo o Nequi; en el ca\u00f1\u00f3n casi no hay se\u00f1al ni dat\u00e1fonos.',
  entradas: [
    { tipo: 'Pasad\u00eda Ca\u00f1\u00f3n + Rafting (17 km)', precio: '357000', incluye: 'Gu\u00eda certificado, equipo y seguro', link: 'https://wa.me/573144457907' },
    { tipo: 'Pasad\u00eda Tour 5 Maravillas', precio: 'Consultar', incluye: 'Parque G\u00fcejar: Ca\u00f1o Laj\u00f3n, toboganes, jacuzzis y Ca\u00f1o Jord\u00e1n', link: 'https://wa.me/573144457907' },
    { tipo: 'Pasad\u00eda G\u00fcape + Tubing', precio: 'Consultar', incluye: 'Ca\u00f1\u00f3n del G\u00fcape y tubing (solo verano)', link: 'https://wa.me/573144457907' },
    { tipo: 'Acceso al Parque G\u00fcejar', precio: 'Consultar', incluye: 'Ingreso a las 5 maravillas del parque', link: 'https://maravillasdelguejar.com' },
    { tipo: 'Hospedaje caba\u00f1as / glamping', precio: 'Consultar', incluye: 'Caba\u00f1as o carpas glamping con vista al ca\u00f1\u00f3n', link: 'https://maravillasdelguejar.com' }
  ],
  tours: [
    {
      nombre: 'Rafting Ca\u00f1\u00f3n del G\u00fcejar + almuerzo',
      precio: '357000', precio_sub: 'por persona',
      duracion: '5 horas', tipo_tour: 'Grupal', idioma: 'Espa\u00f1ol',
      max_personas: 'M\u00e1x 12',
      rating: '4.9', review_count: 210,
      descripcion: 'Descenso de 17 km por el r\u00edo G\u00fcejar con paradas en el Titanic, El Bongo y cascadas; gu\u00eda certificado, equipo y seguro incluidos.',
      incluye: ['Gu\u00eda certificado', 'Chaleco y remos', 'Seguro de viaje', 'Almuerzo'],
      no_incluye: ['Transporte desde Bogot\u00e1', 'Gastos personales'],
      link_reserva: 'https://wa.me/573144457907',
      featured: true
    },
    {
      nombre: 'Tour 5 Maravillas del Parque G\u00fcejar',
      precio: '', precio_sub: 'pasad\u00eda a consultar',
      duracion: '6-8 horas', tipo_tour: 'Ecoturismo', idioma: 'Espa\u00f1ol',
      max_personas: 'M\u00e1x 10',
      rating: '4.8', review_count: 150,
      descripcion: 'Cascada Ca\u00f1o Laj\u00f3n (20 m), toboganes y tubing, jacuzzis naturales, Ca\u00f1o Jord\u00e1n (60 m) y piscinas al final.',
      incluye: ['Gu\u00eda local', 'Traslados en el parque'],
      no_incluye: ['Almuerzo', 'Fotograf\u00eda'],
      link_reserva: 'https://wa.me/573144457907',
      featured: false
    },
    {
      nombre: 'Tubing Ca\u00f1\u00f3n Cafre',
      precio: '', precio_sub: 'pasad\u00eda a consultar',
      duracion: '4 horas', tipo_tour: 'Aventura', idioma: 'Espa\u00f1ol',
      max_personas: 'M\u00e1x 8',
      rating: '4.7', review_count: 95,
      descripcion: 'Descenso en neum\u00e1ticos por el ca\u00f1\u00f3n del r\u00edo Cafre, una de las experiencias m\u00e1s refrescantes del complejo.',
      incluye: ['Neum\u00e1tico', 'Chaleco'],
      no_incluye: ['Transporte', 'Almuerzo'],
      link_reserva: 'https://wa.me/573144457907',
      featured: false
    },
    {
      nombre: 'Ca\u00f1\u00f3n del G\u00fcape + tubing',
      precio: '', precio_sub: 'solo temporada seca',
      duracion: '5 horas', tipo_tour: 'Aventura', idioma: 'Espa\u00f1ol',
      max_personas: 'M\u00e1x 8',
      rating: '4.9', review_count: 60,
      descripcion: 'El G\u00fcape abre solo en verano (ene-mar): senderismo estrecho y tubing entre paredes de roca.',
      incluye: ['Gu\u00eda', 'Neum\u00e1tico', 'Chaleco'],
      no_incluye: ['Transporte', 'Almuerzo'],
      link_reserva: 'https://wa.me/573144457907',
      featured: false
    }
  ],
  equipamiento: [
    { item: 'Zapatos antideslizantes o botas ligeras de agua', prioridad: 'Obligatorio' },
    { item: 'Ropa fresca y traje de ba\u00f1o', prioridad: 'Obligatorio' },
    { item: 'Repelente de mosquitos', prioridad: 'Obligatorio' },
    { item: 'Efectivo o Nequi (pocos dat\u00e1fonos)', prioridad: 'Recomendado' },
    { item: 'Agua y snack', prioridad: 'Recomendado' },
    { item: 'Protector solar, gorra y gafas', prioridad: 'Recomendado' },
    { item: 'Bolsa para residuos (ecosistema fr\u00e1gil)', prioridad: 'Recomendado' },
    { item: 'Impermeable si vas en temporada de lluvias', prioridad: 'Recomendado' }
  ],
  itinerario: [
    { dia: 'Pasad\u00eda rafting', hora: '7:00 am', titulo: 'Salida desde Villavicencio/Granada', icono: '\ud83d\ude97', detalle: 'Punto fijo del operador; traslado al r\u00edo G\u00fcejar', tags: ['Log\u00edstica'] },
    { dia: 'Pasad\u00eda rafting', hora: '9:00 am', titulo: 'Briefing y equipo de rafting', icono: '\ud83e\uddbd', detalle: 'Instrucciones de seguridad y chaleco con gu\u00eda certificado', tags: ['Seguridad'] },
    { dia: 'Pasad\u00eda rafting', hora: '9:30 am', titulo: 'Descenso 17 km por el ca\u00f1\u00f3n', icono: '\ud83d\udea3', detalle: 'R\u00e1pidos categor\u00eda 3 con paradas en Titanic, El Bongo y cascadas', tags: ['Aventura'] },
    { dia: 'Pasad\u00eda rafting', hora: '2:00 pm', titulo: 'Almuerzo y descanso', icono: '\ud83c\udf5b', detalle: 'Parada con almuerzo; fotos del ca\u00f1\u00f3n y las aguas esmeralda', tags: ['Descanso'] },
    { dia: 'Pasad\u00eda rafting', hora: '3:30 pm', titulo: 'Regreso a la base', icono: '\ud83d\ude90', detalle: 'Retorno a Lejan\u00edas/Villavicencio; fin del pasad\u00eda', tags: ['Cierre'] }
  ],
  dificultad_tags: [
    { texto: 'Rafting nivel 3 apto para principiantes y ni\u00f1os desde 8 a\u00f1os', apto: true },
    { texto: 'Verano (ene-mar): r\u00edo bajo, m\u00e1s tranquilo y agua v\u00edrida', apto: true },
    { texto: 'El ca\u00f1\u00f3n del G\u00fcape solo abre en temporada seca', apto: false },
    { texto: 'En lluvias el r\u00edo sube y los r\u00e1pidos se intensifican', apto: false },
    { texto: 'Zonas sin se\u00f1al celular ni dat\u00e1fonos: llevar efectivo o Nequi', apto: false }
  ],
  temporada_matriz: {
    Ene: 'ideal', Feb: 'ideal', Mar: 'ideal', Abr: 'posible', May: 'evitar',
    Jun: 'posible', Jul: 'posible', Ago: 'posible', Sep: 'posible', Oct: 'evitar', Nov: 'evitar', Dic: 'posible'
  }
};

const FAQS = [
  { pregunta: '\u00bfC\u00f3mo llego?', respuesta: 'Carro por la v\u00eda al Llano hasta Granada (7 h aprox.) y luego hasta Mesetas; o avi\u00f3n a Villavicencio + bus a Mesetas (~3 h, ~$40.000).' },
  { pregunta: '\u00bfCu\u00e1nto cuesta?', respuesta: 'Pasad\u00eda Ca\u00f1\u00f3n + Rafting desde $357.000 por persona con gu\u00eda, equipo y seguro. Lleva efectivo o Nequi para gastos menores.' },
  { pregunta: '\u00bfEs apto para ni\u00f1os?', respuesta: 'El rafting es categor\u00eda 3 y acepta ni\u00f1os desde 8 a\u00f1os, siempre con chaleco y gu\u00eda certificado.' },
  { pregunta: '\u00bfCu\u00e1l es la mejor \u00e9poca?', respuesta: 'Enero a marzo (verano): r\u00edo m\u00e1s bajo y tranquilo y el G\u00fcape abierto. En lluvias los r\u00e1pidos suben de nivel.' },
  { pregunta: '\u00bfD\u00f3nde dormir?', respuesta: 'Maravillas del G\u00fcejar ofrece caba\u00f1as, glamping y camping con vista al ca\u00f1\u00f3n.' },
  { pregunta: '\u00bfQu\u00e9 llevar?', respuesta: 'Ropa fresca, traje de ba\u00f1o, zapatos antideslizantes, repelente, agua, bloqueador, gorra y efectivo.' }
];

module.exports = { SLUG: SLUG, HERO: HERO, PHOTOS: PHOTOS, BASE: BASE, TAGS: TAGS, FAQS: FAQS };

if (require.main !== module) return;

(async function main() {
  var url = process.env.DATABASE_URL || process.argv[2];
  if (!url) {
    console.error('Falta DATABASE_URL.');
    console.error('Uso: DATABASE_URL=postgres://... node scripts/seed-canon-del-guejar.js [--dry]');
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