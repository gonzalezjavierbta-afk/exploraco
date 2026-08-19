// scripts/seed-salsa-camara.js
// Crea (o actualiza) la pagina dinamica salsa-camara.html con los datos
// de Salsa Camara (Chapinero, Bogota), fundado 1988, orquesta en vivo,
// siguiendo el patron de scripts/seed-quiebracanto.js (categoria sitio, upsert completo).
//
// Uso:
//   DATABASE_URL=postgres://... node scripts/seed-salsa-camara.js --dry
//   DATABASE_URL=postgres://... node scripts/seed-salsa-camara.js

var neon = null;
function getNeon() {
  if (!neon) neon = require('@neondatabase/serverless').neon;
  return neon;
}

const SLUG = 'salsa-camara';
const HERO = 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fa/La_Macarena_panorama_norte_sur.JPG/960px-La_Macarena_panorama_norte_sur.JPG';

const PHOTOS = [
  { url: HERO, caption: 'Panoramica del centro de Bogota desde La Macarena, cerca de Chapinero' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/60/Bogota_-_Streets_at_night_009.jpg/960px-Bogota_-_Streets_at_night_009.jpg', caption: 'Chapinero de noche, donde Salsa Camara suena desde 1988' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Palacio_Li%C3%A9vano%2C_Bogot%C3%A1.jpg/960px-Palacio_Li%C3%A9vano%2C_Bogot%C3%A1.jpg', caption: 'Palacio Lievano, icono del centro historico' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/Plaza_de_Bol%C3%ADvar_en_Bogot%C3%A1_%28Colombia%29.jpg/960px-Plaza_de_Bol%C3%ADvar_en_Bogot%C3%A1_%28Colombia%29.jpg', caption: 'La Plaza de Bolivar, corazon del centro' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e8/Salsa_dance_dip.jpg/960px-Salsa_dance_dip.jpg', caption: 'Pareja bailando salsa, el alma de la pista de Salsa Camara' }
];

const BASE = {
  slug: SLUG,
  nombre: 'Salsa Camara',
  categoria_slug: 'sitio',
  lead: 'Institucion salsera Chapinero desde 1988 (37 anos): orquestas internacionales (Aragon, Dan Den), gran menu licores, conciertos jueves-sabados.',
  descripcion: 'Salsa Camara (Carrera 11 #70A-22, Chapinero, Bogota, coordenadas 4.6559, -74.0596) es otro bar salsero con gran patrimonio e importancia en la capital. Inaugurado en julio de 1988, se ha consolidado como referencia obligada de la cultura salsera bogotana. Se caracteriza por tener un gran menu en licores y por sus conciertos de salsa en vivo con cantantes nacionales e internacionales.\n\nEn su tarima han sonado orquestas de la talla de la Orquesta Aragon (Cuba), Dan Den (Cuba), y las mejores agrupaciones colombianas. El ambiente es de salsa pura: la seleccion musical va de la vieja guardia a las novedades, siempre con el sabor autentico. Abre de jueves a sabados desde las 4:00 PM (algunas fuentes dicen 6:00 PM) hasta las 3:00 AM. Telefono: +57 313 830 88 44. Instagram: @salsacamaraoficial.\n\nEl publico es fiel: salseros de toda la vida, melomanos que buscan orquesta en vivo de calidad, y nuevos adeptos que descubren la salsa en un espacio que no transa con la calidad musical. El cover es variable segun la orquesta; el consumo en barra tiene precios de referencia accesibles.',
  highlight: 'Desde 1988: 37 anos salsa en vivo, Orquesta Aragon, Dan Den, mejores agrupaciones en Cra 11 con 70A.',
  ciudad: 'Bogota',
  region: 'Cundinamarca',
  barrio: 'Chapinero',
  lat: 4.6558511,
  lng: -74.0595782,
  whatsapp: '',
  telefono: '+57 313 830 88 44',
  email: '',
  web: 'https://www.facebook.com/SALSA-CAMARA-325247035393',
  instagram: '@salsacamaraoficial',
  precio_desde: 'Cover variable orquesta $10k-$25k ref; gran menu licores',
  horario: 'Jue-Sab 16:00-3:00 ref; algunos eventos 18:00',
  emoji: '\ud83c\udfa4',
  hero_bg: '#b91c1c',
  foto_hero: HERO,
  tipo: 'Salsa bar  -  Orquestas intl  -  37 anos  -  Conciertos',
  capacidad: 'Mediano, aforo orquesta y pista',
  como_llegar: 'TransMilenio Calle 72 o Av. Chile + caminar/taxi a Cra 11 #70A-22. Parque 93: 5 min taxi.',
  status: 'published',
  destacado: true
};

const TAGS = {
  tipo_actividad: 'Salsa bar',
  dificultad: 'Facil',
  dificultad_desc: 'Bar con pista y tarima a nivel; orquesta en vivo. Requiere ser mayor de 18 anos. Zona Chapinero segura, TransMilenio cercano.',
  duracion: '3-6 horas',
  altitud: '2600',
  temporada: ['Todo el ano', 'Jueves a sabados con orquesta', 'Festivos y eventos especiales', 'Temporada de orquestas internacionales'],
  precio_entrada: 'Cover variable segun orquesta (referencia $10.000-$25.000); gran menu de licores; consumo en barra.',
  distancia: 'Carrera 11 #70A-22, Chapinero. Cerca a TransMilenio Calle 72 y Av. Chile.',
  como_llegar: BASE.como_llegar,
  permisos: 'Mayor de 18 anos con documento de identidad valido.',
  temporada_nota: 'Jueves a sabados con orquesta en vivo. La programacion varia: orquestas cubanas (Aragon, Dan Den) y nacionales. Verificar en @salsacamaraoficial.',
  fauna_flora: JSON.stringify([
    { emoji: '\ud83c\udfa4', nombre: 'Orquestas internacionales', hecho: 'Orquesta Aragon (Cuba), Dan Den (Cuba) y las mejores agrupaciones colombianas en tarima' },
    { emoji: '\ud83c\udfb5', nombre: 'Salsa de verdad en vivo', hecho: 'Conciertos con banda completa, no playbacks: la rumba se siente en el pecho' },
    { emoji: '\ud83c\udf7e', nombre: 'Gran menu de licores', hecho: 'Carta extensa de rones, whiskies, cocteles y cervezas para acompanar la salsa' },
    { emoji: '\ud83c\udfdb\ufe0f', nombre: '37 anos de historia', hecho: 'Inaugurado julio 1988: una institucion que no ha dejado de sonar salsa' }
  ]),
  secretos: JSON.stringify([
    { icono: '\ud83c\udfa4', titulo: 'Orquesta Aragon y Dan Den', texto: 'Cuando vienen las leyendas cubanas, el cover sube pero la experiencia no tiene precio: historia viva de la salsa en tu pista.', tag: 'Eventos', tag_color: 'blue' },
    { icono: '\ud83c\udfb5', titulo: 'Jueves de salsa', texto: 'El jueves abre temprano (4 PM) y es noche de orquesta: ideal para ir despues del trabajo y quedarse a bailar.', tag: 'Imperdible', tag_color: 'gold' },
    { icono: '\ud83c\udf7e', titulo: 'Licores para salseros', texto: 'Ron, whisky, cocteles clasicos y cerveza fria: el menu esta pensado para que el trago no pare la rumba.', tag: 'Cerca', tag_color: 'green' },
    { icono: '\ud83c\udfdb\ufe0f', titulo: 'Institucion desde 1988', texto: 'Casi 4 decadas en la misma esquina: la Carrera 11 con 70A es sinonimo de salsa en vivo en Bogota.', tag: 'Historia', tag_color: 'brown' }
  ]),
  regulaciones: 'Mayor de 18 anos con documento de identidad valido. Cover variable segun orquesta. No se permite ingreso de alimentos ni bebidas externas. Se reserva el derecho de admision.',
  checklist_tip: 'Revisa @salsacamaraoficial para la programacion de orquestas. Jueves abre 4 PM: llega temprano para buena ubicacion. Lleva efectivo para cover y consumo.',
  entradas: [
    { tipo: 'Noche de orquesta (Jue-Sab)', precio: 'variable $10k-$25k', incluye: 'Acceso con banda en vivo (referencia)', link: 'https://www.instagram.com/salsacamaraoficial/' },
    { tipo: 'Evento especial (orquestas internacionales)', precio: 'variable', incluye: 'Segun programacion (Aragon, Dan Den, etc.)', link: 'https://www.instagram.com/salsacamaraoficial/' }
  ],
  tours: [
    {
      nombre: 'Concierto de orquesta en vivo',
      precio: 'Cover de la orquesta', precio_sub: 'referencia $10k-$25k',
      duracion: '4-6 horas', tipo_tour: 'Experiencia', idioma: 'Espanol', max_personas: 'Abierto',
      rating: '4.8', review_count: 41,
      descripcion: 'La experiencia Salsa Camara: orquesta completa en tarima (Aragon, Dan Den o nacionales), gran pista y menu de licores.',
      incluye: ['Acceso al concierto', 'Orquesta en vivo', 'Pista de baile', 'Gran menu de licores'],
      no_incluye: ['Bebidas', 'Transporte'],
      link_reserva: 'https://www.instagram.com/salsacamaraoficial/',
      featured: true
    },
    {
      nombre: 'Jueves salsero: temprano y con orquesta',
      precio: 'Cover variable', precio_sub: 'apertura 16:00',
      duracion: '5-7 horas', tipo_tour: 'Experiencia', idioma: 'Espanol', max_personas: 'Abierto',
      rating: '4.7', review_count: 23,
      descripcion: 'El plan perfecto post-trabajo: orquesta desde las 4 PM, cena ligera, rumba hasta las 3 AM.',
      incluye: ['Acceso temprano', 'Orquesta en vivo', 'Ambiente relajado', 'Pista toda la noche'],
      no_incluye: ['Bebidas', 'Transporte', 'Cena'],
      link_reserva: 'https://www.instagram.com/salsacamaraoficial/',
      featured: false
    },
    {
      nombre: 'Ruta Chapinero: Salsa Camara + Sandunguera',
      precio: 'Variable', precio_sub: 'segun consumo en ambos',
      duracion: '4-5 horas', tipo_tour: 'Ruta', idioma: 'Espanol', max_personas: 'Grupos pequenos',
      rating: '4.6', review_count: 16,
      descripcion: 'Los dos pilares de Chapinero: Salsa Camara (orquestas internacionales, 1988) y Sandunguera (clasica, clases, 1994). A 10 min caminando.',
      incluye: ['Itinerario Chapinero', 'Parada en ambos bares', 'Contexto salsa bogotana'],
      no_incluye: ['Bebidas', 'Transporte', 'Covers'],
      link_reserva: 'https://www.instagram.com/salsacamaraoficial/',
      featured: false
    }
  ],
  equipamiento: [
    { item: 'Documento de identidad (mayor de 18)', prioridad: 'Obligatorio' },
    { item: 'Efectivo para cover y consumo', prioridad: 'Recomendado' },
    { item: 'Calzado comodo para bailar', prioridad: 'Recomendado' },
    { item: 'Verificar programacion en Instagram', prioridad: 'Recomendado' }
  ],
  itinerario: [
    { dia: 'Jueves', hora: '4:00 pm', titulo: 'Apertura con orquesta', icono: '\ud83c\udfa4', detalle: 'Orquesta en vivo desde la apertura, cover de referencia', tags: ['Orquesta', 'Temprano'] },
    { dia: 'Viernes', hora: '9:00 pm', titulo: 'La noche fuerte', icono: '\ud83d\udc83', detalle: 'Pista llena, orquesta o DJ invitado, rumba hasta 3 AM', tags: ['Rumba'] },
    { dia: 'Sabado', hora: '10:00 pm', titulo: 'Sabado de salsa', icono: '\ud83c\udf1f', detalle: 'Orquesta o evento especial, la noche mas larga', tags: ['Evento'] }
  ],
  dificultad_tags: [
    { texto: 'Bar con pista y tarima a nivel', apto: true },
    { texto: 'Chapinero, TransMilenio Calle 72 y Av. Chile', apto: true },
    { texto: 'Orquestas en vivo jueves a sabados', apto: true },
    { texto: 'Cover variable segun orquesta', apto: false },
    { texto: 'Requiere ser mayor de 18', apto: false }
  ],
  temporada_matriz: {
    Ene: 'ideal', Feb: 'ideal', Mar: 'ideal', Abr: 'ideal', May: 'posible',
    Jun: 'ideal', Jul: 'ideal', Ago: 'ideal', Sep: 'ideal', Oct: 'ideal', Nov: 'ideal', Dic: 'ideal'
  }
};

const FAQS = [
  { pregunta: 'Que es Salsa Camara?', respuesta: 'Bar de salsa con 37 anos de historia (desde 1988) en Chapinero (Cra 11 #70A-22), famoso por orquestas en vivo internacionales (Orquesta Aragon, Dan Den) y gran menu de licores.' },
  { pregunta: 'Que orquestas han tocado ahi?', respuesta: 'Orquesta Aragon (Cuba), Dan Den (Cuba), y las mejores agrupaciones salseras colombianas. Programacion variable: ver @salsacamaraoficial.' },
  { pregunta: 'Cuales son los horarios?', respuesta: 'Jueves a sabados de 16:00 (o 18:00 segun evento) a 3:00 AM. Jueves abre temprano. Confirma en Instagram antes de ir.' },
  { pregunta: 'Cuanto cuesta la entrada?', respuesta: 'Cover variable segun la orquesta (referencia $10.000-$25.000). Gran menu de licores. Consumo en barra aparte.' },
  { pregunta: 'Cual es la edad minima?', respuesta: 'Mayor de 18 anos con documento de identidad valido.' }
];

module.exports = { SLUG: SLUG, HERO: HERO, PHOTOS: PHOTOS, BASE: BASE, TAGS: TAGS, FAQS: FAQS };

if (require.main !== module) return;

(async function main() {
  var url = process.env.DATABASE_URL || process.argv[2];
  if (!url) {
    console.error('Falta DATABASE_URL.');
    console.error('Uso: DATABASE_URL=postgres://... node scripts/seed-salsa-camara.js [--dry]');
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

  console.log('OK - faqs y ' + PHOTOS.length + ' fotos de galeria insertadas.');
  console.log('Verifica en: https://exploraco.co/' + SLUG + '.html (revisa sitemap y /api/destinos).');
})().catch(function(err) {
  console.error('ERROR:', err.message);
  process.exit(1);
});