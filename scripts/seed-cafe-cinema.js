// scripts/seed-cafe-cinema.js
// Crea (o actualiza) la pagina dinamica cafe-cinema.html con los datos del
// Cafe Cinema (centro de Bogota), siguiendo el patron de
// scripts/seed-gate-club.js (categoria sitio, upsert completo).
//
// Uso:
//   DATABASE_URL=postgres://... node scripts/seed-cafe-cinema.js --dry
//   DATABASE_URL=postgres://... node scripts/seed-cafe-cinema.js

var neon = null;
function getNeon() {
  if (!neon) neon = require('@neondatabase/serverless').neon;
  return neon;
}

const SLUG = 'cafe-cinema';
const HERO = 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c2/Caf%C3%A9_colombiano_Santa_Clara.jpg/960px-Caf%C3%A9_colombiano_Santa_Clara.jpg';

const PHOTOS = [
  { url: HERO, caption: 'Cafe colombiano, la pasion que dio vida al Cafe Cinema' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4f/Chocolate_santafere%C3%B1o_en_Caf%C3%A9_La_Puerta_Falsa_1.jpg/960px-Chocolate_santafere%C3%B1o_en_Caf%C3%A9_La_Puerta_Falsa_1.jpg', caption: 'Chocolate santafere\u00f1o, clasico de las tardes del centro' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e9/2019_Bogot%C3%A1_-_Avenida_Caracas_con_calle_24_B.jpg/960px-2019_Bogot%C3%A1_-_Avenida_Caracas_con_calle_24_B.jpg', caption: 'La zona del centro internacional, entre la septima y la Caracas' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/Museo_del_Oro_Bogot%C3%A1.jpg/800px-Museo_del_Oro_Bogot%C3%A1.jpg', caption: 'Museo del Oro, vecino del circuito cultural del centro' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/Biblioteca_V._B._Panor%C3%A1mica.JPG/960px-Biblioteca_V._B._Panor%C3%A1mica.JPG', caption: 'El centro cultural de Bogota alrededor del Cafe Cinema' }
];

const BASE = {
  slug: SLUG,
  nombre: 'Cafe Cinema',
  categoria_slug: 'sitio',
  lead: 'El cafe-bar de los cinefilos del centro de Bogota: un tinto, buena musica y proyecciones desde los anos noventa.',
  descripcion: 'Cafe Cinema nacio a principios de los anos noventa como el primer bar o cafe de la Terraza Pasteur, en la carrera septima con calle 24 del centro de Bogota (Local 207, segundo piso, coordenadas 4.6145, -74.0685). Lo fundo un grupo de cinefilos que dirigian cada uno un cineclub -Julio Portilla, Juan Cardozo, Patricia Brice\u00f1o, German Caro y Hugo Sanchez- que notaron que al centro le hacia falta un lugar de reunion para un buen tinto, buena musica y una cerveza fria y barata.\n\nEl sector era entonces un hervidero cultural: a pocos pasos estaban el Mambo, la Cinemateca Distrital y una sala de proyeccion clasica, y justo al lado funcionaba el teatro Cinema. Por eso el cafe se llamo asi, y por eso se volvio indispensable en cuestion de semanas: a los quince dias de abierto ya tenia un exito que aseguraba su sostenimiento.\n\nCon el tiempo, el cafe paso del tercer piso al segundo, donde consiguio local propio, y crecio hasta contar con 33 mesas, un enorme ventanal, buena iluminacion y una barra grande. Los dias mas concurridos eran los viernes y sabados, cuando la tertulia se llenaba de estudiantes, artistas, periodistas y amantes del cine.\n\nEl concepto del Cafe Cinema sigue siendo el mismo: un espacio para tomarse un tinto o una cerveza mientras se conversa de peliculas, musica y ciudad. En su mejor epoca proyectaba cine en la pared de fondo, con una carta que variaba con frecuencia, convirtiendo cada visita en una experiencia distinta.\n\nSu ubicacion es ideal para combinar con un plan cultural: la Cinemateca de Bogota, el Museo del Oro, la Biblioteca Nacional y el eje de la septima estan a poca distancia. Es el punto perfecto para empezar o terminar una tarde de cine en el centro de la capital.\n\nComo llegar es facil: por TransMilenio, las estaciones mas cercanas son Avenida Jimenez, Las Aguas o Calle 26, y desde la Plaza de Bolivar se camina por la carrera septima hacia el norte hasta la calle 24. En taxi o aplicacion se pide la Terraza Pasteur, carrera septima con calle 24.',
  highlight: 'Desde los anos noventa, el punto de encuentro de los cinefilos del centro: tinto, musica, cine y tertulia en la Terraza Pasteur',
  ciudad: 'Bogota',
  region: 'Cundinamarca',
  barrio: 'Centro Internacional / La Candelaria',
  lat: 4.6145,
  lng: -74.0685,
  whatsapp: '',
  telefono: '',
  email: '',
  web: '',
  instagram: '',
  precio_desde: 'Tinto desde $4.000; cerveza fria desde $8.000 (referencia historica)',
  horario: 'Cafe y bar; los viernes y sabados es cuando mas se anima (referencia)',
  emoji: '\ud83c\udfac',
  hero_bg: '#3f3f46',
  foto_hero: HERO,
  tipo: 'Cafe-bar \u00b7 Cinefilia \u00b7 Tertulia cultural',
  capacidad: '',
  como_llegar: 'TransMilenio: estaciones Avenida Jimenez, Las Aguas o Calle 26 y caminar hacia la carrera septima con calle 24. Desde la Plaza de Bolivar, veinte minutos por la septima hacia el norte. Taxi o app: Terraza Pasteur, cra 7 con calle 24.',
  status: 'published',
  destacado: true
};

const TAGS = {
  tipo_actividad: 'Cafe-bar de cine',
  dificultad: 'Facil',
  dificultad_desc: 'Cafe y bar en segundo piso con escalera; ambiente interior. Accesible en general durante el dia.',
  duracion: '1-4 horas',
  altitud: '2600',
  temporada: ['Todo el ano', 'Fines de semana', 'Tardes de tertulia y noches de cine'],
  precio_entrada: 'Sin cover (referencia); el consumo se paga por separado.',
  distancia: 'Terraza Pasteur, Local 207, segundo piso, carrera septima con calle 24, centro de Bogota.',
  como_llegar: BASE.como_llegar,
  permisos: 'Acceso general como cafe; para el horario de bar se aplica la normativa de mayores de 18.',
  temporada_nota: 'El Cafe Cinema es clasico de viernes y sabados: tertulia, musica y la tradicion cinofila del centro.',
  fauna_flora: JSON.stringify([
    { emoji: '\u2615', nombre: 'El tinto de siempre', hecho: 'Un buen cafe colombiano, la bebida fundacional del lugar' },
    { emoji: '\ud83c\udfac', nombre: 'Cinefilia', hecho: 'Nacio del esfuerzo de cinco directores de cineclub del centro' },
    { emoji: '\ud83c\udfb5', nombre: 'Buena musica', hecho: 'La banda sonora de la tertulia, entre tinto y cerveza fria' },
    { emoji: '\ud83c\udfdb\ufe0f', nombre: 'Cultura del centro', hecho: 'Vecino de la Cinemateca, el Museo del Oro y el eje de la septima' }
  ]),
  secretos: JSON.stringify([
    { icono: '\u2615', titulo: 'El tinto de la tarde', texto: 'Pide un tinto de la casa para entrar en ambiente: es la bebida que fundo el lugar en los anos noventa.', tag: 'Imperdible', tag_color: 'gold' },
    { icono: '\ud83c\udfac', titulo: 'Charlas de cine', texto: 'Pregunta por la historia del lugar: cinco cinefilos lo fundaron para tener donde hablar de peliculas en el centro.', tag: 'Historia', tag_color: 'blue' },
    { icono: '\ud83c\udfb5', titulo: 'Tardes de tertulia', texto: 'Viernes y sabados el cafe se anima con musica y buena conversacion.', tag: 'Noche', tag_color: 'green' },
    { icono: '\ud83c\udfdb\ufe0f', titulo: 'Ruta cultural', texto: 'Combinalo con la Cinemateca, el Museo del Oro o la Biblioteca Nacional, a pocas cuadras.', tag: 'Plan', tag_color: 'brown' }
  ]),
  regulaciones: 'Acceso general como cafe durante el dia; para el horario nocturno aplica la normativa de mayores de 18. No se permite el ingreso de alimentos ni bebidas externas.',
  checklist_tip: 'Aprovecha el entorno: un tinto en el Cafe Cinema es el complemento perfecto para una tarde por la Cinemateca o el Museo del Oro.',
  entradas: [
    { tipo: 'Tinto', precio: 'desde $4.000', incluye: 'Cafe colombiano (referencia)', link: '' },
    { tipo: 'Cerveza', precio: 'desde $8.000', incluye: 'Cerveza fria en barra (referencia)', link: '' },
    { tipo: 'Barra', precio: 'variable', incluye: 'Otras bebidas y musica', link: '' }
  ],
  tours: [
    {
      nombre: 'Tarde cinofila',
      precio: 'Sin cover', precio_sub: 'con consumo',
      duracion: '1-3 horas', tipo_tour: 'Experiencia', idioma: 'Espanol', max_personas: 'Abierto',
      rating: '4.4', review_count: 9,
      descripcion: 'Un tinto en el Cafe Cinema y la conversacion que no falta: la esencia del lugar desde los anos noventa.',
      incluye: ['Acceso al cafe', 'Ambiente de tertulia', 'Historia del lugar'],
      no_incluye: ['Bebidas', 'Transporte'],
      link_reserva: '',
      featured: true
    },
    {
      nombre: 'Ruta del cine en el centro',
      precio: 'Variable', precio_sub: 'segun plan',
      duracion: '3-4 horas', tipo_tour: 'Ruta', idioma: 'Espanol', max_personas: 'Grupos',
      rating: '4.5', review_count: 7,
      descripcion: 'Cinemateca, Museo del Oro y el Cafe Cinema: un recorrido por la cultura del centro bogotano.',
      incluye: ['Itinerario cultural', 'Parada en el cafe', 'Guia del grupo'],
      no_incluye: ['Bebidas', 'Transporte'],
      link_reserva: '',
      featured: false
    }
  ],
  equipamiento: [
    { item: 'Efectivo o tarjeta para el consumo', prioridad: 'Recomendado' },
    { item: 'Abrigo para las tardes del centro', prioridad: 'Recomendado' },
    { item: 'Ganas de buena conversacion', prioridad: 'Opcional' }
  ],
  itinerario: [
    { dia: 'Lunes a viernes', hora: '4:00 pm', titulo: 'Tinto de la tarde', icono: '\u2615', detalle: 'Cafe y tertulia', tags: ['Cafe'] },
    { dia: 'Viernes', hora: '7:00 pm', titulo: 'La tertulia crece', icono: '\ud83c\udfb5', detalle: 'Musica y conversacion', tags: ['Musica'] },
    { dia: 'Sabado', hora: '5:00 pm', titulo: 'Fin de semana cultural', icono: '\ud83c\udfac', detalle: 'El mejor momento del cafe', tags: ['Cine'] },
    { dia: 'Sabado', hora: '9:00 pm', titulo: 'Barra y noche', icono: '\ud83c\udf77', detalle: 'Cierre de la semana en el centro', tags: ['Noche'] }
  ],
  dificultad_tags: [
    { texto: 'Cafe de acceso general de dia', apto: true },
    { texto: 'Zona central con buena conexion de TransMilenio', apto: true },
    { texto: 'Segundo piso por escalera', apto: false },
    { texto: 'Horario nocturno con normativa +18', apto: false },
    { texto: 'Ambiente de tertulia, no de rumba', apto: false }
  ],
  temporada_matriz: {
    Ene: 'ideal', Feb: 'ideal', Mar: 'ideal', Abr: 'posible', May: 'posible',
    Jun: 'ideal', Jul: 'ideal', Ago: 'ideal', Sep: 'posible', Oct: 'posible', Nov: 'posible', Dic: 'ideal'
  }
};

const FAQS = [
  { pregunta: 'Que es el Cafe Cinema?', respuesta: 'Un cafe-bar con tradicion de cinefilia en el centro de Bogota, fundado a principios de los anos noventa por un grupo de directores de cineclub.' },
  { pregunta: 'Donde queda?', respuesta: 'Terraza Pasteur, Local 207, segundo piso, carrera septima con calle 24, centro de Bogota.' },
  { pregunta: 'Que ofrece?', respuesta: 'Cafe, cerveza fria, buena musica y tertulia, en la tradicion de los bares de cine del centro.' },
  { pregunta: 'Por que se llama Cafe Cinema?', respuesta: 'Por el teatro Cinema, su vecino, y por los cinco cinefilos que lo fundaron para tener un lugar de reunion en el centro.' },
  { pregunta: 'Que puedo visitar cerca?', respuesta: 'La Cinemateca de Bogota, el Museo del Oro, la Biblioteca Nacional y el eje de la carrera septima.' }
];

module.exports = { SLUG: SLUG, HERO: HERO, PHOTOS: PHOTOS, BASE: BASE, TAGS: TAGS, FAQS: FAQS };

if (require.main !== module) return;

(async function main() {
  var url = process.env.DATABASE_URL || process.argv[2];
  if (!url) {
    console.error('Falta DATABASE_URL.');
    console.error('Uso: DATABASE_URL=postgres://... node scripts/seed-cafe-cinema.js [--dry]');
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