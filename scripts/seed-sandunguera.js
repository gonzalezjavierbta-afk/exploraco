// scripts/seed-sandunguera.js
// Crea (o actualiza) la pagina dinamica sandunguera.html con los datos
// del Templo de la Salsa Clasica Sandunguera (Chapinero, Bogota), fundado 1994,
// siguiendo el patron de scripts/seed-quiebracanto.js (categoria sitio, upsert completo).
//
// Uso:
//   DATABASE_URL=postgres://... node scripts/seed-sandunguera.js --dry
//   DATABASE_URL=postgres://... node scripts/seed-sandunguera.js

var neon = null;
function getNeon() {
  if (!neon) neon = require('@neondatabase/serverless').neon;
  return neon;
}

const SLUG = 'sandunguera';
const HERO = 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e8/Salsa_dance_dip.jpg/960px-Salsa_dance_dip.jpg';

const PHOTOS = [
  { url: HERO, caption: 'Pareja bailando salsa clasica, la esencia del Templo de Sandunguera' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b3/Bogota_-_Streets_at_night_003.jpg/960px-Bogota_-_Streets_at_night_003.jpg', caption: 'Chapinero de noche, donde vive Sandunguera desde 1994' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fa/La_Macarena_panorama_norte_sur.JPG/960px-La_Macarena_panorama_norte_sur.JPG', caption: 'Panoramica del centro de Bogota desde La Macarena' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/31/Bogot%C3%A1%2C_La_Candelaria%2C_2023-06_CN-01.jpg/960px-Bogot%C3%A1%2C_La_Candelaria%2C_2023-06_CN-01.jpg', caption: 'Calles empedradas de La Candelaria, centro historico' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f8/Bogot%C3%A1_Chapinero_de_noche.JPG/960px-Bogot%C3%A1_Chapinero_de_noche.JPG', caption: 'Chapinero de noche, epicentro de la vida nocturna' }
];

const BASE = {
  slug: SLUG,
  nombre: 'Sandunguera',
  categoria_slug: 'sitio',
  lead: 'Templo Salsa Clasica desde 1994: vieja guardia, clases Mie/Jue/Sab 19-21h, 31 anos de rumba autentica en Chapinero.',
  descripcion: 'Sandunguera (Calle 64 #13-52, Chapinero, Bogota, coordenadas 4.6791, -74.0480) es conocido popularmente como "El Templo de la Salsa Clasica". Fundado en 1994, lleva mas de 30 anos difundiendo la salsa de la vieja guardia y la musica cubana autentica. Es un espacio cultural que combina la pasion por la musica en vivo con la alegria de bailar, creando un rincon donde la comunidad se encuentra para celebrar la cultura caribena.\n\nLa propuesta incluye musica en vivo los fines de semana y DJs especializados en salsa clasica, son cubano, guaguanco y timba. Los miercoles, jueves y sabados de 7:00 a 9:00 PM ofrece clases de baile de salsa para principiantes y expertos, una tradicion desde el ano 2000. El ambiente es intimo, con pista de baile a nivel, barra bien surtida y un publico que va a bailar en serio.\n\nHorarios: Miercoles a sabados de 6:00 PM a 3:00 AM; viernes, sabados y domingos pre-festivos de 5:00 PM a 3:00 AM. Telefonos: 317 639 2533 / 316 316 3483. Instagram: @sandunguera.salsabar. Es un lugar donde la salsa no es moda, es forma de vida.',
  highlight: 'Desde 1994: Templo Salsa Clasica, vieja guardia, clases 3 dias/semana, pista que no perdona.',
  ciudad: 'Bogota',
  region: 'Cundinamarca',
  barrio: 'Chapinero',
  lat: 4.6791195,
  lng: -74.0480116,
  whatsapp: '',
  telefono: '317 639 2533',
  email: 'sandunguera@gmail.com',
  web: 'https://sandunguera.neocities.org',
  instagram: '@sandunguera.salsabar',
  precio_desde: 'Cover variable segun evento; consumo barra',
  horario: 'Mie-Sab 18:00-3:00; Vie/Sab/Dom pref 17:00-3:00; Clases 19-21h',
  emoji: '\ud83c\udfb5',
  hero_bg: '#8b1a1a',
  foto_hero: HERO,
  tipo: 'Salsa bar  -  Templo Clasica  -  Clases  -  31 anos',
  capacidad: 'Intimo, aforo medio',
  como_llegar: 'TransMilenio Calle 63 o Av. Chile + caminar/taxi a Cl 64 #13-52. Parque 93: 10 min taxi.',
  status: 'published',
  destacado: true
};

const TAGS = {
  tipo_actividad: 'Salsa bar',
  dificultad: 'Facil',
  dificultad_desc: 'Bar con pista de baile a nivel; clases de baile incluidas. Requiere ser mayor de 18 anos. Zona Chapinero segura y caminable.',
  duracion: '3-5 horas',
  altitud: '2600',
  temporada: ['Todo el ano', 'Miercoles a sabados noche', 'Clases Mie/Jue/Sab 19-21h', 'Festivos y eventos especiales'],
  precio_entrada: 'Cover variable segun noche/evento; clases de baile incluidas en el cover; consumo en barra.',
  distancia: 'Calle 64 #13-52, Chapinero. Cerca a TransMilenio Calle 63 y Av. Chile.',
  como_llegar: BASE.como_llegar,
  permisos: 'Mayor de 18 anos con documento de identidad valido.',
  temporada_nota: 'Clases de salsa miercoles, jueves y sabados 7-9 PM (incluidas en cover). Miercoles a sabados abierto. Verificar en @sandunguera.salsabar.',
  fauna_flora: JSON.stringify([
    { emoji: '\ud83c\udfb5', nombre: 'Salsa vieja guardia', hecho: 'Seleccion de clasicos: Fruko, Grupo Niche, Joe Arroyo, Sonora Carruseles, musica cubana autentica' },
    { emoji: '\ud83d\udc83', nombre: 'Clases de baile 3 dias', hecho: 'Miercoles, jueves y sabados 19:00-21:00: principiantes y avanzados comparten pista' },
    { emoji: '\ud83c\udfa4', nombre: 'Musica en vivo fines de semana', hecho: 'Orquestas y grupos de salsa clasica en tarima viernes y sabados' },
    { emoji: '\ud83c\udfdb\ufe0f', nombre: '31 anos de historia', hecho: 'Fundado en 1994, referencia obligada de la salsa bogotana' }
  ]),
  secretos: JSON.stringify([
    { icono: '\ud83d\udc83', titulo: 'Clases gratis con el cover', texto: 'Miercoles, jueves y sabados 7-9 PM: clases de salsa para todos los niveles incluidas. Llega a las 6:30 PM para calentar.', tag: 'Imperdible', tag_color: 'gold' },
    { icono: '\ud83c\udfb5', titulo: 'Vieja guardia de verdad', texto: 'Los DJs no ponen "salsa comercial": aqui suena Fruko, Niche, Joe Arroyo, Celia Cruz, Willie Colon, Hector Lavoe, la Sonora Carruseles.', tag: 'Musica', tag_color: 'green' },
    { icono: '\ud83c\udfa4', titulo: 'Pista de bailadores', texto: 'La pista es para bailar en serio. Si no sabes, las clases son tu entrada. Si sabes, vienes a sudar la camisa.', tag: 'Zona', tag_color: 'blue' },
    { icono: '\ud83c\udfdb\ufe0f', titulo: 'Templo desde 1994', texto: 'Mas de 30 anos sin cambiar la formula: salsa clasica, clases y comunidad. Eso es lo que lo hace eterno.', tag: 'Historia', tag_color: 'brown' }
  ]),
  regulaciones: 'Mayor de 18 anos con documento de identidad valido. No se permite ingreso de alimentos ni bebidas externas. Se reserva el derecho de admision. Clases incluidas en cover de la noche.',
  checklist_tip: 'Llega a las 6:30 PM en dias de clase (Mie/Jue/Sab) para tomar la clase completa. Viernes/sabados: llega temprano que la pista se llena.',
  entradas: [
    { tipo: 'Noche regular (Mie-Jue)', precio: 'variable', incluye: 'Acceso, pista, clase de salsa (Mie/Jue 19-21h)', link: 'https://www.instagram.com/sandunguera.salsabar/' },
    { tipo: 'Noche fin de semana (Vie-Sab)', precio: 'variable', incluye: 'Acceso, musica en vivo/DJ, pista', link: 'https://www.instagram.com/sandunguera.salsabar/' },
    { tipo: 'Domingo pre-festivo', precio: 'variable', incluye: 'Acceso, ambiente festivo', link: 'https://www.instagram.com/sandunguera.salsabar/' }
  ],
  tours: [
    {
      nombre: 'Clase + Rumba: la experiencia Sandunguera',
      precio: 'Cover de la noche', precio_sub: 'incluye clase 19-21h',
      duracion: '4-6 horas', tipo_tour: 'Experiencia', idioma: 'Espanol', max_personas: 'Abierto',
      rating: '4.8', review_count: 52,
      descripcion: 'La experiencia completa: clase de salsa 7-9 PM y despues rumba con DJs de vieja guardia o musica en vivo.',
      incluye: ['Clase de salsa (Mie/Jue/Sab)', 'Acceso a la pista', 'DJs de salsa clasica', 'Ambiente de Templo'],
      no_incluye: ['Bebidas', 'Transporte'],
      link_reserva: 'https://www.instagram.com/sandunguera.salsabar/',
      featured: true
    },
    {
      nombre: 'Solo rumba: viernes/sabado noche',
      precio: 'Cover variable', precio_sub: 'sin clase',
      duracion: '4-5 horas', tipo_tour: 'Experiencia', idioma: 'Espanol', max_personas: 'Abierto',
      rating: '4.7', review_count: 31,
      descripcion: 'La noche de los bailadores: musica en vivo o DJs especializados, pista llena hasta las 3 AM.',
      incluye: ['Acceso al bar', 'Musica en vivo/DJ', 'Pista de baile', 'Barra surtida'],
      no_incluye: ['Bebidas', 'Transporte', 'Clase de baile'],
      link_reserva: 'https://www.instagram.com/sandunguera.salsabar/',
      featured: false
    },
    {
      nombre: 'Ruta Chapinero salsero: Sandunguera + Salsa Camara',
      precio: 'Variable', precio_sub: 'segun consumo en ambos',
      duracion: '4-5 horas', tipo_tour: 'Ruta', idioma: 'Espanol', max_personas: 'Grupos pequenos',
      rating: '4.6', review_count: 14,
      descripcion: 'Los dos templos de Chapinero: Sandunguera (clasica, clases) y Salsa Camara (orquestas internacionales, 1988). A 10 min caminando.',
      incluye: ['Itinerario Chapinero', 'Parada en ambos bares', 'Contexto salsa bogotana'],
      no_incluye: ['Bebidas', 'Transporte', 'Covers'],
      link_reserva: 'https://www.instagram.com/sandunguera.salsabar/',
      featured: false
    }
  ],
  equipamiento: [
    { item: 'Documento de identidad (mayor de 18)', prioridad: 'Obligatorio' },
    { item: 'Efectivo o tarjeta para consumo', prioridad: 'Recomendado' },
    { item: 'Calzado comodo para bailar (clase + rumba)', prioridad: 'Recomendado' },
    { item: 'Ropa comoda para moverse', prioridad: 'Recomendado' }
  ],
  itinerario: [
    { dia: 'Miercoles', hora: '7:00 pm', titulo: 'Clase de salsa', icono: '\ud83d\udc83', detalle: 'Principiantes y avanzados, 2 horas, incluido en cover', tags: ['Clase'] },
    { dia: 'Jueves', hora: '7:00 pm', titulo: 'Clase + rumba', icono: '\ud83c\udfb5', detalle: 'Clase 19-21h, despues DJs de vieja guardia', tags: ['Clase', 'Rumba'] },
    { dia: 'Viernes', hora: '9:00 pm', titulo: 'Musica en vivo', icono: '\ud83c\udfa4', detalle: 'Orquesta o grupo de salsa clasica en tarima', tags: ['En vivo'] },
    { dia: 'Sabado', hora: '7:00 pm', titulo: 'Clase + noche grande', icono: '\ud83c\udf1f', detalle: 'Clase temprano, rumba hasta las 3 AM', tags: ['Clase', 'Rumba'] }
  ],
  dificultad_tags: [
    { texto: 'Bar con pista de baile a nivel', apto: true },
    { texto: 'Clases de salsa incluidas 3 dias/semana', apto: true },
    { texto: 'Chapinero zona segura y con TransMilenio', apto: true },
    { texto: 'Cover variable segun noche', apto: false },
    { texto: 'Requiere ser mayor de 18', apto: false }
  ],
  temporada_matriz: {
    Ene: 'ideal', Feb: 'ideal', Mar: 'ideal', Abr: 'ideal', May: 'posible',
    Jun: 'ideal', Jul: 'ideal', Ago: 'ideal', Sep: 'ideal', Oct: 'ideal', Nov: 'ideal', Dic: 'ideal'
  }
};

const FAQS = [
  { pregunta: 'Que es Sandunguera?', respuesta: 'El Templo de la Salsa Clasica de Bogota, fundado en 1994 en Chapinero (Calle 64 #13-52), famoso por salsa vieja guardia, clases de baile y musica en vivo.' },
  { pregunta: 'Que dias hay clases de baile?', respuesta: 'Miercoles, jueves y sabados de 7:00 a 9:00 PM. Las clases estan incluidas en el cover de la noche.' },
  { pregunta: 'Cuales son los horarios?', respuesta: 'Miercoles a sabados 18:00-3:00; Viernes/Sabados/Domingos pre-festivos 17:00-3:00. Clases Mie/Jue/Sab 19:00-21:00.' },
  { pregunta: 'Que musica ponen?', respuesta: 'Salsa clasica vieja guardia: Fruko, Grupo Niche, Joe Arroyo, Celia Cruz, Willie Colon, Hector Lavoe, Sonora Carruseles, musica cubana autentica.' },
  { pregunta: 'Cuanto cuesta la entrada?', respuesta: 'Cover variable segun la noche/evento. Las clases de baile (Mie/Jue/Sab) estan incluidas. Consumo en barra aparte.' },
  { pregunta: 'Cual es la edad minima?', respuesta: 'Mayor de 18 anos con documento de identidad valido.' }
];

module.exports = { SLUG: SLUG, HERO: HERO, PHOTOS: PHOTOS, BASE: BASE, TAGS: TAGS, FAQS: FAQS };

if (require.main !== module) return;

(async function main() {
  var url = process.env.DATABASE_URL || process.argv[2];
  if (!url) {
    console.error('Falta DATABASE_URL.');
    console.error('Uso: DATABASE_URL=postgres://... node scripts/seed-sandunguera.js [--dry]');
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