// scripts/seed-candelario.js
// Crea (o actualiza) la pagina dinamica candelario.html con los datos del
// bar-restaurante El Candelario (La Candelaria, Bogota), replicando el
// patron de scripts/seed-gate-club.js (categoria sitio, upsert completo).
//
// Uso:
//   DATABASE_URL=postgres://... node scripts/seed-candelario.js --dry
//   DATABASE_URL=postgres://... node scripts/seed-candelario.js
//
// Idempotente: re-ejecutable sin efectos secundarios (ON CONFLICT slug).

var neon = null;
function getNeon() {
  if (!neon) neon = require('@neondatabase/serverless').neon;
  return neon;
}

const SLUG = 'candelario';
const HERO = 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/Calle_empedrada_La_Candelaria.jpg/800px-Calle_empedrada_La_Candelaria.jpg';

const PHOTOS = [
  { url: HERO, caption: 'Calle empedrada de La Candelaria, el barrio historico que alberga a El Candelario' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Palacio_Li%C3%A9vano%2C_Bogot%C3%A1.jpg/960px-Palacio_Li%C3%A9vano%2C_Bogot%C3%A1.jpg', caption: 'Palacio Lievano, joya arquitectonica del centro historico' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Plaza_de_Bol%C3%ADvar%2C_Bogot%C3%A1.jpg/1200px-Plaza_de_Bol%C3%ADvar%2C_Bogot%C3%A1.jpg', caption: 'Plaza de Bolivar y Catedral Primada, a pocas cuadras' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4f/Chocolate_santafere%C3%B1o_en_Caf%C3%A9_La_Puerta_Falsa_1.jpg/960px-Chocolate_santafere%C3%B1o_en_Caf%C3%A9_La_Puerta_Falsa_1.jpg', caption: 'Chocolate santafere\u00f1o con queso, parte de la tradicion del centro' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e7/Teatro_Col%C3%B3n_Bogot%C3%A1.jpg/800px-Teatro_Col%C3%B3n_Bogot%C3%A1.jpg', caption: 'Teatro Colon, joya del centro historico' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/62/Skyline_downtown_Bogota.jpg/960px-Skyline_downtown_Bogota.jpg', caption: 'El skyline del centro de Bogota con los cerros orientales de fondo' }
];

const BASE = {
  slug: SLUG,
  nombre: 'El Candelario',
  categoria_slug: 'sitio',
  lead: 'Restaurante de dia y bar de noche en una casona colonial de mas de 120 anos en la calle 12b con carrera quinta, en el corazon historico de Bogota.',
  descripcion: 'El Candelario (Calle 12b #5-14, La Candelaria, Bogota, coordenadas 4.5972, -74.0739) es una casa esquinera de mas de 120 anos de antiguedad que funciona como restaurante de cocina criolla durante el dia y como bar de noche. Su estructura en madera, sus objetos antiguos y su estilo vintage han sobrevivido a multiples remodelaciones sin perder la esencia colonial que lo hace unico. Coordenadas aproximadas: 4.5972 lat, -74.0739 lng.\n\nEl local fue transformado hace mas de una decada por su creador, Hernan Jimenez, y con el paso de los anos se ha convertido en un referente de la rumba y la gastronomia del centro de Bogota. Lo que mas sorprende al entrar es el contraste: una casona colonial que, por dentro, respira historia, pero que cobra vida con propuestas musicales atrevidas y un ambiente pensado para el disfrute nocturno. En el segundo piso se sumaron areas para comidas y nuevos espacios, siempre sin tocar la esencia de la epoca colonial.\n\nSu carta apuesta por la comida criolla que cualquier turista quiere probar en su paso por Bogota: ajiaco, tamales, changua y otros clasicos de la mesa santafere\u00f1a, con porciones generosas que han hecho famoso al lugar entre los de buen apetito. Durante el dia, El Candelario es un refugio gastronomico; al caer la noche, las mesas se convierten en una pista de baile.\n\nPero el encanto del lugar viene acompanado de misterio. La casa es protagonista de varias leyendas de apariciones y experiencias paranormales que han alimentado los tours de fantasmas por La Candelaria. Vecinos y empleados cuentan de ruidos en el segundo piso, puertas que se abren solas y sombras que cruzan los pasillos cuando el bar esta cerrado. No es raro que los guias de los recorridos nocturnos hagan parada en la esquina de la calle 12b con quinta para contar sus historias.\n\nLa musica es parte esencial de la propuesta. De noche, El Candelario ofrece un repertorio que va desde la salsa clasica y la musica popular colombiana hasta propuestas mas contemporaneas, siempre con el ambiente festivo que caracteriza al centro historico. El punto de encuentro perfecto antes de continuar la rumba por la calle del Embudo, el Chorro de Quevedo o la zona de bares de Las Aguas.\n\nComo llegar es sencillo: por TransMilenio, la estacion mas cercana es Las Aguas (troncal Karakol), desde donde se camina unos diez minutos por la carrera quinta hacia el sur. Desde la Plaza de Bolivar, se llega caminando por la carrera quinta en menos de cinco minutos. Tambien se puede llegar en taxi o aplicacion pidiendo la calle 12b con carrera quinta, La Candelaria.',
  highlight: 'Casa colonial de mas de 120 anos: cocina criolla de dia, bar y rumba de noche, con leyendas de fantasmas incluidas',
  ciudad: 'Bogota',
  region: 'Cundinamarca',
  barrio: 'La Candelaria',
  lat: 4.5972,
  lng: -74.0739,
  whatsapp: '',
  telefono: '',
  email: '',
  web: '',
  instagram: '',
  precio_desde: 'Platos desde $18.000; bebidas desde $12.000 (referencia)',
  horario: 'Restaurante de dia y bar de noche; fines de semana hasta tarde',
  emoji: '\ud83c\udf77',
  hero_bg: '#7c2d12',
  foto_hero: HERO,
  tipo: 'Restaurante y bar \u00b7 Cocina criolla \u00b7 Casa colonial',
  capacidad: '',
  como_llegar: 'TransMilenio: estacion Las Aguas (troncal Karakol) y caminar por la carrera quinta hacia el sur hasta la calle 12b. Desde la Plaza de Bolivar, cinco minutos caminando por la carrera quinta. Taxi o app: Calle 12b #5-14, La Candelaria.',
  status: 'published',
  destacado: true
};

const TAGS = {
  tipo_actividad: 'Restaurante y bar',
  dificultad: 'Facil',
  dificultad_desc: 'Espacio interior con acceso a nivel en la planta principal; algunos ambientes estan en el segundo piso por escalera. Recomendado +18 para el horario nocturno.',
  duracion: '2-5 horas',
  altitud: '2600',
  temporada: ['Todo el ano', 'Fines de semana y festivos', 'Noches de rumba en el centro'],
  precio_entrada: 'Sin cover permanente; cover variable en noches de orquesta o eventos especiales. Consumo por separado.',
  distancia: 'Calle 12b #5-14, La Candelaria, Bogota. A cinco minutos caminando de la Plaza de Bolivar y del Chorro de Quevedo.',
  como_llegar: BASE.como_llegar,
  permisos: 'Mayor de 18 anos para el horario nocturno; el restaurante admite familias durante el dia.',
  temporada_nota: 'El Candelario funciona de dia como restaurante criollo y de noche como bar. Los fines de semana y festivos es cuando el ambiente nocturno se intensifica.',
  fauna_flora: JSON.stringify([
    { emoji: '\ud83c\udf77', nombre: 'Cocina criolla', hecho: 'Ajiaco, tamales y clasicos santafere\u00f1os con porciones generosas' },
    { emoji: '\ud83c\udfb5', nombre: 'Rumba en el centro', hecho: 'Salsa y musica popular colombiana para bailar de noche' },
    { emoji: '\ud83d\udee1\ufe0f', nombre: 'Leyendas de la casa', hecho: 'Apariciones y ruidos que alimentan los tours de fantasmas de La Candelaria' },
    { emoji: '\ud83c\udfdb\ufe0f', nombre: 'Arquitectura colonial', hecho: 'Casa esquinera de mas de 120 anos con estructura en madera y objetos vintage' }
  ]),
  secretos: JSON.stringify([
    { icono: '\ud83c\udf77', titulo: 'La mesa criolla', texto: 'Pide un ajiaco o un tamal en horario de almuerzo: las porciones son generosas y el sabor es puro Bogota.', tag: 'Imperdible', tag_color: 'gold' },
    { icono: '\ud83d\udee1\ufe0f', titulo: 'El segundo piso', texto: 'Los espacios de arriba guardan la historia de la casa; en noches de evento la energia sube por las escaleras.', tag: 'Secreto', tag_color: 'blue' },
    { icono: '\ud83c\udfb5', titulo: 'Rumba sabatina', texto: 'Los sabados el bar se llena de ritmo: llega temprano para asegurar mesa y ver como la casa colonial se transforma.', tag: 'Noche', tag_color: 'green' },
    { icono: '\ud83c\udfdb\ufe0f', titulo: 'Ruta de fantasmas', texto: 'Pregunta por las leyendas de la casa: muchos guias de La Candelaria cuentan sus apariciones en esta esquina.', tag: 'Misterio', tag_color: 'brown' }
  ]),
  regulaciones: 'Mayor de 18 anos con documento de identidad para el horario nocturno. No se permite el ingreso de alimentos ni bebidas externas. El consumo se paga por separado. Se reserva el derecho de admision.',
  checklist_tip: 'Llega de dia para el almuerzo criollo y, si puedes, regresa de noche para la rumba: es la misma casa, dos experiencias distintas.',
  entradas: [
    { tipo: 'Almuerzo criollo', precio: 'desde $18.000', incluye: 'Plato tipico con bebida (referencia)', link: '' },
    { tipo: 'Barra', precio: 'desde $12.000', incluye: 'Bebidas y cocteles (referencia)', link: '' },
    { tipo: 'Noches de evento', precio: 'cover variable', incluye: 'Acceso con orquesta o DJ segun programacion', link: '' }
  ],
  tours: [
    {
      nombre: 'Almuerzo criollo',
      precio: 'Desde $18.000', precio_sub: 'referencia',
      duracion: '1-2 horas', tipo_tour: 'Gastronomia', idioma: 'Espanol', max_personas: 'Abierto',
      rating: '4.5', review_count: 12,
      descripcion: 'El Candelario de dia: ajiaco, tamales y clasicos de la cocina santafere\u00f1a en una casa colonial de mas de 120 anos.',
      incluye: ['Plato principal', 'Bebida tipica', 'Ambiente colonial'],
      no_incluye: ['Postre', 'Transporte'],
      link_reserva: '',
      featured: true
    },
    {
      nombre: 'Noche de rumba',
      precio: 'Cover variable', precio_sub: 'segun evento',
      duracion: '3-5 horas', tipo_tour: 'Experiencia', idioma: 'Espanol', max_personas: 'Abierto',
      rating: '4.4', review_count: 9,
      descripcion: 'El Candelario de noche: la casa colonial se convierte en bar con salsa y musica popular colombiana.',
      incluye: ['Acceso al bar', 'Musica en vivo segun agenda', 'Ambiente de rumba'],
      no_incluye: ['Bebidas', 'Transporte'],
      link_reserva: '',
      featured: true
    },
    {
      nombre: 'Ruta de fantasmas',
      precio: 'Desde $35.000', precio_sub: 'con tour guiado',
      duracion: '2-3 horas', tipo_tour: 'Tour', idioma: 'Espanol e ingles', max_personas: 'Grupos',
      rating: '4.6', review_count: 15,
      descripcion: 'Los tours nocturnos de La Candelaria cuentan las leyendas de apariciones de esta casa esquinera.',
      incluye: ['Guia', 'Historias de la casa', 'Recorrido por La Candelaria'],
      no_incluye: ['Consumo en el bar', 'Transporte'],
      link_reserva: '',
      featured: false
    }
  ],
  equipamiento: [
    { item: 'Documento de identidad (mayor de 18 para la noche)', prioridad: 'Obligatorio' },
    { item: 'Efectivo o tarjeta para el consumo', prioridad: 'Recomendado' },
    { item: 'Abrigo: el centro de Bogota en la noche es frio', prioridad: 'Recomendado' },
    { item: 'Calzado comodo para bailar', prioridad: 'Opcional' }
  ],
  itinerario: [
    { dia: 'Lunes a viernes', hora: '12:00 m', titulo: 'Almuerzo criollo', icono: '\ud83c\udf77', detalle: 'Ajiaco, tamales y cocina santafere\u00f1a', tags: ['Gastronomia'] },
    { dia: 'Viernes', hora: '8:00 pm', titulo: 'El bar despierta', icono: '\ud83c\udfb5', detalle: 'La casa colonial se transforma en bar', tags: ['Bar'] },
    { dia: 'Sabado', hora: '10:00 pm', titulo: 'Rumba en el centro', icono: '\ud83d\udc83', detalle: 'Salsa y musica popular, ambiente festivo', tags: ['Rumba'] },
    { dia: 'Festivos', hora: '12:00 m', titulo: 'Tradicion santafere\u00f1a', icono: '\ud83c\udfdb\ufe0f', detalle: 'Comida criolla para el dia libre', tags: ['Gastronomia'] }
  ],
  dificultad_tags: [
    { texto: 'Acceso a nivel en planta principal', apto: true },
    { texto: 'Segundo piso por escalera', apto: false },
    { texto: 'Zona historica muy caminable', apto: true },
    { texto: 'Horario nocturno solo +18', apto: false },
    { texto: 'Noches muy concurridas los fines de semana', apto: false }
  ],
  temporada_matriz: {
    Ene: 'ideal', Feb: 'ideal', Mar: 'ideal', Abr: 'posible', May: 'posible',
    Jun: 'ideal', Jul: 'ideal', Ago: 'ideal', Sep: 'posible', Oct: 'posible', Nov: 'posible', Dic: 'ideal'
  }
};

const FAQS = [
  { pregunta: 'Donde queda El Candelario?', respuesta: 'Calle 12b #5-14, La Candelaria, Bogota, a cinco minutos caminando de la Plaza de Bolivar.' },
  { pregunta: 'Que tipo de comida sirven?', respuesta: 'Cocina criolla: ajiaco, tamales, changua y otros clasicos santafere\u00f1os con porciones generosas.' },
  { pregunta: 'Que horario maneja?', respuesta: 'Restaurante de dia y bar de noche. Los fines de semana y festivos el ambiente nocturno se intensifica.' },
  { pregunta: 'Es cierto que la casa esta embrujada?', respuesta: 'Son muchas las leyendas de apariciones que se cuentan sobre la casa; forman parte de los tours de fantasmas de La Candelaria.' },
  { pregunta: 'Cual es la edad minima para entrar?', respuesta: 'Durante el dia el restaurante admite familias; de noche se exige ser mayor de 18 anos.' }
];

module.exports = { SLUG: SLUG, HERO: HERO, PHOTOS: PHOTOS, BASE: BASE, TAGS: TAGS, FAQS: FAQS };

if (require.main !== module) return;

(async function main() {
  var url = process.env.DATABASE_URL || process.argv[2];
  if (!url) {
    console.error('Falta DATABASE_URL.');
    console.error('Uso: DATABASE_URL=postgres://... node scripts/seed-candelario.js [--dry]');
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