// scripts/seed-radio-estrella.js
// Crea (o actualiza) la pagina dinamica radio-estrella.html con los datos de
// ficha-radio-estrella.md, replicando EXACTAMENTE lo que guardaria el formulario
// admin.html (CATEGORY_TAG_FIELDS/CATEGORY_TAG_LISTS sitio, _buildTagsObj/
// _placeToAPI). Patron de scripts/seed-museo-del-oro.js con upsert completo.
//
// Rating: NO se siembran resenas ni se hardcodea rating. La pagina queda
// con rating/contador en 0 hasta que lleguen interacciones reales
// (ADR-008: api/interacciones.js recalcula AVG/COUNT dinamicamente).
//
// Uso:
//   DATABASE_URL=postgres://... node scripts/seed-radio-estrella.js --dry
//   DATABASE_URL=postgres://... node scripts/seed-radio-estrella.js
//
// Idempotente: re-ejecutable sin efectos secundarios (ON CONFLICT slug).

var neon = null;
function getNeon() {
  if (!neon) neon = require('@neondatabase/serverless').neon;
  return neon;
}

const SLUG = 'radio-estrella';
const HERO = 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c2/Bogot%C3%A1%2C_casa_en_el_barrio_Chic%C3%B3.jpg/960px-Bogot%C3%A1%2C_casa_en_el_barrio_Chic%C3%B3.jpg';

const PHOTOS = [
  { url: HERO, caption: 'Casas del barrio Chic\u00f3, donde se ubica Radio Estrella' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Bogot%C3%A1_Parque_del_Chic%C3%B3_lago.JPG/960px-Bogot%C3%A1_Parque_del_Chic%C3%B3_lago.JPG', caption: 'Parque del Chic\u00f3 con su lago, cerca del club' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a3/Bogot%C3%A1_calle_92_con_carrera_15_El_Chic%C3%B3..JPG/960px-Bogot%C3%A1_calle_92_con_carrera_15_El_Chic%C3%B3..JPG', caption: 'Calle 92 con carrera 15 en El Chic\u00f3' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ef/Bogot%C3%A1_fuente_en_el_Parque_del_Chic%C3%B3.JPG/960px-Bogot%C3%A1_fuente_en_el_Parque_del_Chic%C3%B3.JPG', caption: 'Fuente en el Parque del Chic\u00f3' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/Chic%C3%B3_Norte%2C_Bogot%C3%A1%2C_Colombia_-_panoramio.jpg/960px-Chic%C3%B3_Norte%2C_Bogot%C3%A1%2C_Colombia_-_panoramio.jpg', caption: 'Vista de Chic\u00f3 Norte' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Bogot%C3%A1_Parque_de_la_93.JPG/960px-Bogot%C3%A1_Parque_de_la_93.JPG', caption: 'Parque de la 93, otro corazon nocturno cercano' }
];

const BASE = {
  slug: SLUG,
  nombre: 'Radio Estrella',
  categoria_slug: 'sitio',
  lead: 'El club de trance, fast techno y hard house del barrio Chic\u00f3: una radio de m\u00fasica dura en la carrera 15 con calle 99, abierta viernes y s\u00e1bados hasta las 5AM.',
  descripcion: 'Radio Estrella (Carrera 15 No. 99-23, Chic\u00f3, coords 4.684167, -74.048551) es un club de m\u00fasica electr\u00f3nica especializado en trance, fast techno, hard house y UKG (UK Garage), con una identidad de "radio" muy marcada. Abre viernes y s\u00e1bados de 10PM a 5AM. Su p\u00fablico es conocedor y fiel a los ritmos r\u00e1pidos y duros de la electr\u00f3nica europea. El lugar destaca por la curadur\u00eda de DJs locales e invitados, y su cercan\u00eda al centro comercial Chic\u00f3 Plaza (81 metros) lo hace f\u00e1cil de ubicar. Instagram @radioestrella.bog (~9.9K seguidores); tel\u00e9fono 322 2859170 y reservas 320 9083311.',
  highlight: 'Trance, fast techno, hard house y UKG en una sola pista, en pleno Chic\u00f3',
  ciudad: 'Bogot\u00e1',
  region: 'Cundinamarca',
  barrio: 'Chic\u00f3 (Chapinero)',
  lat: 4.684167,
  lng: -74.048551,
  whatsapp: '',
  telefono: '322 2859170',
  email: '',
  web: 'https://ra.co/clubs/228871',
  instagram: '@radioestrella.bog',
  precio_desde: 'Cover variable',
  horario: 'Vie-Sab 10PM-5AM',
  emoji: '\u2b50',
  hero_bg: '#1e1b4b',
  foto_hero: HERO,
  tipo: 'Club de m\u00fasica electr\u00f3nica \u00b7 Trance/fast techno/hard house \u00b7 UKG',
  capacidad: '',
  como_llegar: 'TransMilenio: estaciones "Calle 100" o "Calle 85" (Av. Caracas) y caminar hacia la carrera 15 con calle 99. Taxi o app: Carrera 15 No. 99-23, junto a Chic\u00f3 Plaza.',
  status: 'published',
  destacado: true
};

const TAGS = {
  tipo_actividad: 'Club de m\u00fasica electr\u00f3nica',
  dificultad: 'F\u00e1cil',
  dificultad_desc: 'Espacio interior con pista principal y zona bar; sin restricciones f\u00edsicas relevantes. Recomendado +18 y calzado c\u00f3modo para bailar al ritmo r\u00e1pido.',
  duracion: '4-6 horas',
  altitud: '2600',
  temporada: ['Fines de semana', 'Fechas festivas', 'Programaci\u00f3n especial'],
  precio_entrada: 'Cover variable seg\u00fan evento.',
  distancia: 'Carrera 15 No. 99-23, Chic\u00f3; a 81 metros del centro comercial Chic\u00f3 Plaza.',
  como_llegar: BASE.como_llegar,
  permisos: 'Mayor de edad (18+) con documento; reservas v\u00eda 320 9083311.',
  temporada_nota: 'Radio Estrella abre principalmente viernes y s\u00e1bados de 10PM a 5AM, con programaci\u00f3n especial en fechas festivas.',
  fauna_flora: JSON.stringify([
    { emoji: '\ud83c\udfb5', nombre: 'Trance y fast techno', hecho: 'Ritmos r\u00e1pidos heredados de la escena europea' },
    { emoji: '\ud83d\udd0a', nombre: 'Hard house y UKG', hecho: 'Noches tem\u00e1ticas de m\u00fasica dura brit\u00e1nica' },
    { emoji: '\u2b50', nombre: 'Radio Estrella', hecho: 'Identidad de radio que remite a la curadur\u00eda musical' },
    { emoji: '\ud83c\udfdb', nombre: 'Chic\u00f3', hecho: 'El barrio m\u00e1s exclusivo del norte de Bogot\u00e1' }
  ]),
  secretos: JSON.stringify([
    { icono: '\ud83c\udfb5', titulo: 'La pista de trance', texto: 'Busca el centro de la pista en los sets de fast techno: la energ\u00eda es brutal.', tag: 'Imperdible', tag_color: 'gold' },
    { icono: '\ud83c\udfdb', titulo: 'Chic\u00f3 Plaza', texto: 'A 81 metros del club: referencias, caf\u00e9s y estacionamiento para la llegada.', tag: 'Cerca', tag_color: 'blue' },
    { icono: '\ud83c\udf7e', titulo: 'Previa en el Chic\u00f3', texto: 'Bares y restaurantes del sector para calentar antes de entrar.', tag: 'Comer', tag_color: 'brown' },
    { icono: '\ud83c\udf1f', titulo: 'Cierre al amanecer', texto: 'Las noches terminan cerca de las 5AM: plan after en la zona o desayuno en Chic\u00f3.', tag: 'Cierre', tag_color: 'green' }
  ]),
  regulaciones: 'Requiere ser mayor de 18 a\u00f1os, con documento de identidad v\u00e1lido. Cover variable seg\u00fan evento; boleta anticipada recomendada. Pol\u00edtica de c\u00f3digo de vestimenta flexible. No se permite el ingreso de alimentos ni bebidas externas. Reservas para grupos v\u00eda 320 9083311. El consumo se paga por separado.',
  checklist_tip: 'Compra tu boleta anticipada en RA.co y llega antes de las 11PM para aprovechar el warm-up.',
  entradas: [
    { tipo: 'General (evento)', precio: 'variable', incluye: 'Acceso a pista principal, cover segun programacion', link: 'https://ra.co/clubs/228871' },
    { tipo: 'Boleta anticipada', precio: 'variable', incluye: 'Preventa por RA.co con descuento', link: 'https://ra.co/clubs/228871' },
    { tipo: 'Mesa o reserva', precio: 'variable', incluye: 'Reserva via 320 9083311', link: 'https://ra.co/clubs/228871' }
  ],
  tours: [
    {
      nombre: 'Pista principal de trance',
      precio: 'Variable', precio_sub: 'con cover del evento',
      duracion: 'Toda la noche', tipo_tour: 'Experiencia', idioma: 'Espa\u00f1ol/Ingl\u00e9s', max_personas: 'Abierto',
      rating: '4.6', review_count: 60,
      descripcion: 'La experiencia central de Radio Estrella: pista con trance, fast techno y hard house, con DJs de la escena bogotana.',
      incluye: ['Acceso a pista', 'DJs en vivo', 'Ambiente underground'],
      no_incluye: ['Consumo', 'Transporte'],
      link_reserva: 'https://ra.co/clubs/228871',
      featured: true
    },
    {
      nombre: 'Noche de hard house y UKG',
      precio: 'Variable', precio_sub: 'segun evento',
      duracion: '3-4 horas', tipo_tour: 'Experiencia', idioma: 'Espa\u00f1ol', max_personas: 'Abierto',
      rating: '4.5', review_count: 40,
      descripcion: 'Noches tem\u00e1ticas dedicadas al hard house y al UK Garage: ritmos duros para p\u00fablico conocedor.',
      incluye: ['Acceso', 'Tematica musical', 'DJ invitado'],
      no_incluye: ['Consumo', 'Transporte'],
      link_reserva: 'https://ra.co/clubs/228871',
      featured: false
    },
    {
      nombre: 'Zona bar y reservas',
      precio: 'Variable', precio_sub: 'segun consumo',
      duracion: '2-3 horas', tipo_tour: 'Experiencia', idioma: 'Espa\u00f1ol', max_personas: 'Grupos',
      rating: '4.4', review_count: 25,
      descripcion: 'Ambiente social en la zona bar con reservas para grupos grandes; servicio atento y c\u00f3cteles.',
      incluye: ['Acceso', 'Servicio de mesa', 'Reserva'],
      no_incluye: ['Consumo', 'Transporte'],
      link_reserva: 'https://ra.co/clubs/228871',
      featured: false
    }
  ],
  equipamiento: [
    { item: 'Documento de identidad (mayor de 18)', prioridad: 'Obligatorio' },
    { item: 'Boleta anticipada por RA.co', prioridad: 'Recomendado' },
    { item: 'Calzado c\u00f3modo para ritmos r\u00e1pidos', prioridad: 'Recomendado' },
    { item: 'Efectivo o tarjeta para consumo', prioridad: 'Recomendado' },
    { item: 'Reservar mesa para grupos', prioridad: 'Opcional' }
  ],
  itinerario: [
    { dia: 'Viernes', hora: '10:00 pm', titulo: 'Llegada y apertura', icono: '\u2b50', detalle: 'Apertura de puertas y DJ local', tags: ['Apertura'] },
    { dia: 'Viernes', hora: '12:00 am', titulo: 'Pista de trance', icono: '\ud83c\udfb5', detalle: 'Trance y fast techno en la pista', tags: ['Trance'] },
    { dia: 'Sabado', hora: '2:00 am', titulo: 'Hard house y UKG', icono: '\ud83d\udd0a', detalle: 'Ritmos duros con DJs invitados', tags: ['Hard'] },
    { dia: 'Sabado', hora: '4:00 am', titulo: 'Cierre', icono: '\ud83c\udf1f', detalle: 'Sesi\u00f3n final hasta el amanecer', tags: ['Cierre'] }
  ],
  dificultad_tags: [
    { texto: 'Pista principal a nivel con zona bar', apto: true },
    { texto: 'Accesible en silla de ruedas (pista a nivel)', apto: true },
    { texto: 'Ritmos r\u00e1pidos (fast techno) exigentes para bailar', apto: false },
    { texto: 'Noche larga hasta las 5AM', apto: false },
    { texto: 'Requiere ser mayor de 18', apto: false }
  ],
  temporada_matriz: {
    Ene: 'posible', Feb: 'ideal', Mar: 'ideal', Abr: 'ideal', May: 'posible',
    Jun: 'ideal', Jul: 'posible', Ago: 'ideal', Sep: 'ideal', Oct: 'ideal', Nov: 'ideal', Dic: 'posible'
  }
};

const FAQS = [
  { pregunta: '\u00bfQu\u00e9 m\u00fasica ponen?', respuesta: 'Trance, fast techno, hard house y UKG: ritmos r\u00e1pidos y duros de la electr\u00f3nica europea.' },
  { pregunta: '\u00bfA qu\u00e9 horas abre?', respuesta: 'Viernes y s\u00e1bados de 10PM a 5AM.' },
  { pregunta: '\u00bfD\u00f3nde queda?', respuesta: 'Carrera 15 No. 99-23, Chic\u00f3, a 81 metros del centro comercial Chic\u00f3 Plaza.' },
  { pregunta: '\u00bfCu\u00e1l es la edad m\u00ednima?', respuesta: 'Debes ser mayor de 18, con documento de identidad v\u00e1lido.' },
  { pregunta: '\u00bfC\u00f3mo reservo mesa?', respuesta: 'Reservas y boletas por RA.co (club 228871) o al tel\u00e9fono 320 9083311.' }
];

module.exports = { SLUG: SLUG, HERO: HERO, PHOTOS: PHOTOS, BASE: BASE, TAGS: TAGS, FAQS: FAQS };

if (require.main !== module) return;

(async function main() {
  var url = process.env.DATABASE_URL || process.argv[2];
  if (!url) {
    console.error('Falta DATABASE_URL.');
    console.error('Uso: DATABASE_URL=postgres://... node scripts/seed-radio-estrella.js [--dry]');
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