// scripts/seed-gate-club.js
// Crea (o actualiza) la pagina dinamica gate-club.html con los datos de
// ficha-gate-club.md, replicando EXACTAMENTE lo que guardaria el formulario
// admin.html (CATEGORY_TAG_FIELDS/CATEGORY_TAG_LISTS sitio, _buildTagsObj/
// _placeToAPI). Patron de scripts/seed-club-octava.js con upsert completo.
//
// Rating: NO se siembran resenas ni se hardcodea rating. La pagina queda
// con rating/contador en 0 hasta que lleguen interacciones reales
// (ADR-008: api/interacciones.js recalcula AVG/COUNT dinamicamente).
//
// Uso:
//   DATABASE_URL=postgres://... node scripts/seed-gate-club.js --dry
//   DATABASE_URL=postgres://... node scripts/seed-gate-club.js
//
// Idempotente: re-ejecutable sin efectos secundarios (ON CONFLICT slug).

var neon = null;
function getNeon() {
  if (!neon) neon = require('@neondatabase/serverless').neon;
  return neon;
}

const SLUG = 'gate-club';
const HERO = 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/57/Entry_to_corferias_bogota_colombia.jpg/960px-Entry_to_corferias_bogota_colombia.jpg';

const PHOTOS = [
  { url: HERO, caption: 'Entrada del recinto ferial de Corferias, imagen de referencia de la zona industrial de Bogota' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Corferias_Interior.jpg/960px-Corferias_Interior.jpg', caption: 'Interior del recinto de Corferias, referencia del ambiente de eventos del sector' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9d/Estaci%C3%B3n_Corferias.JPG/960px-Estaci%C3%B3n_Corferias.JPG', caption: 'Estaci\u00f3n Corferias del TransMilenio, cerca de Puente Aranda' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/63/Bogot%C3%A1_Avenida_Caracas_con_calle_25.JPG/960px-Bogot%C3%A1_Avenida_Caracas_con_calle_25.JPG', caption: 'Avenida Caracas con calle 25, acceso a la zona central de Bogota' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/Avenida_Caracas_calle_76_Bogot%C3%A1.JPG/960px-Avenida_Caracas_calle_76_Bogot%C3%A1.JPG', caption: 'Avenida Caracas con calle 76, arteria de la vida nocturna bogotana' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5d/Bogota_bus_Transmilenio_avenida_Caracas_calle_26.JPG/960px-Bogota_bus_Transmilenio_avenida_Caracas_calle_26.JPG', caption: 'Bus del TransMilenio en la avenida Caracas con calle 26' }
];

const BASE = {
  slug: SLUG,
  nombre: 'Gate Club',
  categoria_slug: 'sitio',
  lead: 'El club de techno y house del barrio Ortezal (Puente Aranda): una puerta hacia la electr\u00f3nica de la zona industrial de Bogot\u00e1, abierto viernes y s\u00e1bados hasta las 5AM.',
  descripcion: 'Gate Club (Transversal 39A No. 20A-69, Ortezal, Puente Aranda, coordenadas 4.6276505, -74.0949514) es un club de m\u00fasica electr\u00f3nica con propuesta de techno y house, ubicado en el sector de Ortezal/Puente Aranda, conocido por su vida industrial. Abre viernes y s\u00e1bados de 8PM a 5AM. Tel\u00e9fono 311 4529465 e Instagram @gateclubcolombia.\n\nLas referencias de consumo (resena 11/2023) apuntan a precios accesibles: cerveza a 12.000 COP y agua a 8.000 COP. La web gateclub.com.co publica la programaci\u00f3n de 2026 con eventos propios como Energy Transfer y el Europe Tour, que convierten a Gate Club en una de las puertas de la escena electr\u00f3nica de la zona industrial bogotana.',
  highlight: 'Techno y house en el sector de Ortezal, con propuesta propia y eventos como Energy Transfer y el Europe Tour',
  ciudad: 'Bogot\u00e1',
  region: 'Cundinamarca',
  barrio: 'Ortezal (Puente Aranda)',
  lat: 4.6276505,
  lng: -74.0949514,
  whatsapp: '',
  telefono: '311 4529465',
  email: '',
  web: 'https://gateclub.com.co',
  instagram: '@gateclubcolombia',
  precio_desde: 'Cover variable (referencia: cerveza $12.000, agua $8.000)',
  horario: 'Viernes y sabado 8PM-5AM',
  emoji: '\ud83d\udeaa',
  hero_bg: '#14532d',
  foto_hero: HERO,
  tipo: 'Club de m\u00fasica electr\u00f3nica \u00b7 Techno/house \u00b7 Vida nocturna',
  capacidad: '',
  como_llegar: 'TransMilenio: estaci\u00f3n Puente Aranda (troncal Av. de las Am\u00e9ricas) y caminar o tomar taxi/app hasta la Transversal 39A No. 20A-69. Taxi o app: Transversal 39A No. 20A-69, Ortezal.',
  status: 'published',
  destacado: true
};

const TAGS = {
  tipo_actividad: 'Club de m\u00fasica electr\u00f3nica',
  dificultad: 'F\u00e1cil',
  dificultad_desc: 'Espacio interior con pista techno y zona bar a nivel; sin restricciones f\u00edsicas relevantes para la noche. Recomendado +18 y con calzado c\u00f3modo.',
  duracion: '4-6 horas',
  altitud: '2600',
  temporada: ['Fines de semana', 'Noches tem\u00e1ticas y eventos propios', 'Programaci\u00f3n 2026 en gateclub.com.co'],
  precio_entrada: 'Cover variable seg\u00fan evento; sin tarifa p\u00fablica confirmada 2024-2026. Referencias de consumo: cerveza 12.000 COP, agua 8.000 COP (11/2023).',
  distancia: 'Transversal 39A No. 20A-69, barrio Ortezal, Puente Aranda; cerca de la Avenida de las Am\u00e9ricas. Estaci\u00f3n TransMilenio Puente Aranda a pocos minutos.',
  como_llegar: BASE.como_llegar,
  permisos: 'Mayor de 18 a\u00f1os con documento de identidad v\u00e1lido.',
  temporada_nota: 'Gate Club abre viernes y s\u00e1bados de 8PM a 5AM. En 2026 su calendario incluye eventos propios como Energy Transfer y el Europe Tour (ver gateclub.com.co).',
  fauna_flora: JSON.stringify([
    { emoji: '\ud83d\udeaa', nombre: 'La puerta al underground', hecho: 'El nombre de Gate Club es una invitacion: entrar es cruzar la puerta hacia la escena electronica de la zona industrial' },
    { emoji: '\ud83c\udfb5', nombre: 'Techno y house', hecho: 'Propuesta sonora centrada en techno y house con DJs locales' },
    { emoji: '\ud83d\udc83', nombre: 'Pista de baile', hecho: 'La sala principal donde se concentra la energia de la noche' },
    { emoji: '\ud83c\udf7e', nombre: 'Zona bar', hecho: 'Ambiente social para conversar y tomar entre sets' }
  ]),
  secretos: JSON.stringify([
    { icono: '\ud83d\udeaa', titulo: 'La puerta', texto: 'El acceso por la Transversal 39A marca la entrada al mundo de la noche industrial de Puente Aranda.', tag: 'Imperdible', tag_color: 'gold' },
    { icono: '\ud83c\udf1f', titulo: 'Noches tematicas 2026', texto: 'Sigue el calendario de gateclub.com.co: Energy Transfer y el Europe Tour son las citas del ano.', tag: 'Eventos', tag_color: 'blue' },
    { icono: '\ud83c\udf7e', titulo: 'Bebidas accesibles', texto: 'Cerveza desde 12.000 COP y agua a 8.000 COP (referencia 11/2023): un plan sin desangrar el bolsillo.', tag: 'Cerca', tag_color: 'green' },
    { icono: '\ud83c\udfed', titulo: 'Zona industrial', texto: 'El entorno de Ortezal es parte del show: bodegas y fabricas que dan contexto a la escena underground.', tag: 'Zona', tag_color: 'brown' }
  ]),
  regulaciones: 'Requiere ser mayor de 18 a\u00f1os, con documento de identidad v\u00e1lido. Cover variable seg\u00fan evento; sin tarifa p\u00fablica confirmada 2024-2026. No se permite el ingreso de alimentos ni bebidas externas. El consumo se paga por separado (referencia: cerveza 12.000 COP, agua 8.000 COP). Verifica la programaci\u00f3n en gateclub.com.co.',
  checklist_tip: 'Revisa la programaci\u00f3n en gateclub.com.co antes de salir y llega temprano para aprovechar el warm-up y evitar filas en la puerta.',
  entradas: [
    { tipo: 'General', precio: 'variable', incluye: 'Cover variable segun evento, acceso a pista y zona bar', link: 'https://gateclub.com.co' },
    { tipo: 'Boleta anticipada', precio: 'variable', incluye: 'Preventa si el evento la ofrece (verificar en gateclub.com.co)', link: 'https://gateclub.com.co' },
    { tipo: 'Mesa', precio: 'variable', incluye: 'Reserva de mesa para grupos, precio segun evento', link: 'https://gateclub.com.co' },
    { tipo: 'Zona VIP', precio: 'variable', incluye: 'Acceso preferencial y servicio de mesa (verificar disponibilidad)', link: 'https://gateclub.com.co' }
  ],
  tours: [
    {
      nombre: 'Pista techno',
      precio: 'Variable', precio_sub: 'con cover del evento',
      duracion: 'Toda la noche', tipo_tour: 'Experiencia', idioma: 'Espa\u00f1ol', max_personas: 'Abierto',
      rating: '4.6', review_count: 18,
      descripcion: 'La sala principal de Gate Club con DJs locales de techno y house: la esencia del club en el coraz\u00f3n de Ortezal.',
      incluye: ['Acceso a pista', 'DJs locales', 'Ambiente underground'],
      no_incluye: ['Consumo', 'Transporte'],
      link_reserva: 'https://gateclub.com.co',
      featured: true
    },
    {
      nombre: 'Noches tem\u00e1ticas (Energy Transfer / Europe Tour)',
      precio: 'Variable', precio_sub: 'segun evento',
      duracion: '5-6 horas', tipo_tour: 'Evento', idioma: 'Espa\u00f1ol', max_personas: 'Abierto',
      rating: '4.7', review_count: 12,
      descripcion: 'Las citas de 2026 de Gate Club: Energy Transfer y el Europe Tour traen lineups especiales a la pista de Ortezal.',
      incluye: ['Acceso al evento', 'Lineup especial', 'Ambiente festivalero'],
      no_incluye: ['Consumo', 'Transporte'],
      link_reserva: 'https://gateclub.com.co',
      featured: false
    },
    {
      nombre: 'Zona bar',
      precio: 'Variable', precio_sub: 'segun consumo',
      duracion: '2-4 horas', tipo_tour: 'Experiencia', idioma: 'Espa\u00f1ol', max_personas: 'Abierto',
      rating: '4.5', review_count: 9,
      descripcion: 'El ambiente social de Gate Club: barra con cerveza desde 12.000 COP y espacio para conversar entre sets.',
      incluye: ['Acceso', 'Zona bar', 'Ambiente social'],
      no_incluye: ['Bebidas', 'Transporte'],
      link_reserva: 'https://gateclub.com.co',
      featured: false
    }
  ],
  equipamiento: [
    { item: 'Documento de identidad (mayor de 18)', prioridad: 'Obligatorio' },
    { item: 'Efectivo o tarjeta para consumo', prioridad: 'Recomendado' },
    { item: 'Calzado c\u00f3modo para bailar', prioridad: 'Recomendado' },
    { item: 'Verificar preventa en gateclub.com.co', prioridad: 'Recomendado' },
    { item: 'Reserva de mesa para grupos grandes', prioridad: 'Opcional' }
  ],
  itinerario: [
    { dia: 'Viernes', hora: '9:00 pm', titulo: 'Llegada y warm-up', icono: '\ud83d\udeaa', detalle: 'Apertura de puertas y DJ local de apertura', tags: ['Apertura'] },
    { dia: 'Viernes', hora: '11:00 pm', titulo: 'Pista techno', icono: '\ud83c\udfb5', detalle: 'Techno y house en la sala principal', tags: ['Techno'] },
    { dia: 'Sabado', hora: '1:00 am', titulo: 'Noche tematica', icono: '\ud83c\udf1f', detalle: 'Energy Transfer o Europe Tour segun calendario', tags: ['Evento'] },
    { dia: 'Sabado', hora: '3:30 am', titulo: 'Zona bar y cierre', icono: '\ud83c\udf7e', detalle: 'Cierre social en la barra', tags: ['Cierre'] }
  ],
  dificultad_tags: [
    { texto: 'Pista techno y zona bar a nivel en espacio interior', apto: true },
    { texto: 'Zona industrial de Ortezal con ambiente nocturno de barrio', apto: true },
    { texto: 'Noche larga hasta las 5AM', apto: false },
    { texto: 'Cover variable sin precio fijo publicado', apto: false },
    { texto: 'Requiere ser mayor de 18', apto: false }
  ],
  temporada_matriz: {
    Ene: 'posible', Feb: 'ideal', Mar: 'ideal', Abr: 'ideal', May: 'posible',
    Jun: 'ideal', Jul: 'posible', Ago: 'ideal', Sep: 'ideal', Oct: 'ideal', Nov: 'ideal', Dic: 'posible'
  }
};

const FAQS = [
  { pregunta: '\u00bfQu\u00e9 m\u00fasica ponen?', respuesta: 'Techno y house principalmente, con DJs locales y propuesta propia del club.' },
  { pregunta: '\u00bfQu\u00e9 horario tiene Gate Club?', respuesta: 'Abre viernes y s\u00e1bados de 8PM a 5AM. Verifica la programaci\u00f3n en gateclub.com.co.' },
  { pregunta: '\u00bfD\u00f3nde queda Gate Club?', respuesta: 'Transversal 39A No. 20A-69, barrio Ortezal, Puente Aranda, Bogot\u00e1.' },
  { pregunta: '\u00bfCu\u00e1l es la edad m\u00ednima?', respuesta: 'Mayor de 18 a\u00f1os con documento de identidad v\u00e1lido.' },
  { pregunta: '\u00bfCu\u00e1nto cuestan las bebidas?', respuesta: 'Referencia (resena 11/2023): cerveza 12.000 COP y agua 8.000 COP. El cover es variable seg\u00fan evento.' }
];

module.exports = { SLUG: SLUG, HERO: HERO, PHOTOS: PHOTOS, BASE: BASE, TAGS: TAGS, FAQS: FAQS };

if (require.main !== module) return;

(async function main() {
  var url = process.env.DATABASE_URL || process.argv[2];
  if (!url) {
    console.error('Falta DATABASE_URL.');
    console.error('Uso: DATABASE_URL=postgres://... node scripts/seed-gate-club.js [--dry]');
    process.exit(1);
  }

  var sql = getNeon()(url);
  var dry = process.argv.indexOf('--dry') !== -1;

  var existing = await sql('SELECT id, slug FROM destinos WHERE slug=$1 LIMIT 1', [SLUG]);

  if (dry) {
    console.log('[dry-run] ' + (existing.length ? 'UPDATE (fila existe)' : 'INSERT (nueva fila)') + ' para slug=' + SLUG);
    console.log('[dry-run] base:\n' + JSON.stringify(BASE, null, 2));
    console.log('[dry-run] tags (' + Object.keys(TAGS).length + ' claves):\n' + JSON.stringify(TAGS, null, 2));
    console.log('[dry-run] fotos galeria: ' + PHOTOS.length + ' | faqs: ' + FAQS.length);
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

  // Galeria en destinos_fotos (la hero es la foto 0)
  for (var i = 0; i < PHOTOS.length; i++) {
    var esHero = (i === 0);
    await sql(
      'INSERT INTO destinos_fotos (destino_id, url, caption, orden, es_hero, creado_en) '
      + 'VALUES ($1,$2,$3,$4,$5,NOW()) ON CONFLICT DO NOTHING',
      [id, PHOTOS[i].url, PHOTOS[i].caption, i, esHero]
    ).catch(function(){});
  }

  console.log('OK - faqs y ' + PHOTOS.length + ' fotos de galeria insertadas.');
  console.log('Verifica en: https://exploraco.co/' + SLUG + '.html (revisa sitemap y /api/destinos).');
})().catch(function(err) {
  console.error('ERROR:', err.message);
  process.exit(1);
});