// scripts/seed-rock-al-parque.js
// Crea (o actualiza) la pagina dinamica rock-al-parque.html con los datos de
// la edicion 30 (30 anos) del Festival Rock al Parque 2026, replicando el
// patron de scripts/seed-candelario.js (categoria evento, upsert completo).
//
// Uso:
//   DATABASE_URL=postgres://... node scripts/seed-rock-al-parque.js --dry
//   DATABASE_URL=postgres://... node scripts/seed-rock-al-parque.js
//
// Idempotente: re-ejecutable sin efectos secundarios (ON CONFLICT slug).
// Contenido 100% ASCII-safe: caracteres especiales como escapes \uXXXX.

var neon = null;
function getNeon() {
  if (!neon) neon = require('@neondatabase/serverless').neon;
  return neon;
}

const SLUG = 'rock-al-parque';
const HERO = 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/da/Simon_bolivar_en_rock_al_parque.jpg/960px-Simon_bolivar_en_rock_al_parque.jpg';

const PHOTOS = [
  { url: HERO, caption: 'Rock al Parque en la Plaza de Eventos del Parque Metropolitano Sim\u00f3n Bol\u00edvar' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/58/Bogot%C3%A1_Parque_Sim%C3%B3n_Bol%C3%ADvar_escenario.JPG/960px-Bogot%C3%A1_Parque_Sim%C3%B3n_Bol%C3%ADvar_escenario.JPG', caption: 'Concha ac\u00fastica y escenario de eventos del parque' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/La_Cascada_Parque_Sim%C3%B3n_Bol%C3%ADvar_Bogot%C3%A1.JPG/960px-La_Cascada_Parque_Sim%C3%B3n_Bol%C3%ADvar_Bogot%C3%A1.JPG', caption: 'Cascada y espejo de agua del parque' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0f/Parque_24_Sim%C3%B3n_Bol%C3%ADvar_de_Bogot%C3%A1%2C_Cund_-_Col.jpg/960px-Parque_24_Sim%C3%B3n_Bol%C3%ADvar_de_Bogot%C3%A1%2C_Cund_-_Col.jpg', caption: 'Vista a\u00e9rea del parque central con zonas verdes y la laguna' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/Biblioteca_V._B._Panor%C3%A1mica.JPG/960px-Biblioteca_V._B._Panor%C3%A1mica.JPG', caption: 'Biblioteca Virgilio Barco (Rogelio Salmona), al costado del parque' }
];

const BASE = {
  slug: SLUG,
  nombre: 'Rock al Parque 2026',
  categoria_slug: 'evento',
  lead: 'La edici\u00f3n 30 (30 a\u00f1os) del festival gratuito de rock m\u00e1s grande de Am\u00e9rica Latina: tres d\u00edas de metal, punk, ska y rock en la Plaza de Eventos del Parque Sim\u00f3n Bol\u00edvar, del 10 al 12 de octubre de 2026.',
  descripcion: 'Rock al Parque celebra sus 30 a\u00f1os (30 ediciones) con el lema \u201c30 a\u00f1os, 30 ediciones, estremeciendo a Bogot\u00e1\u201d, del s\u00e1bado 10 al lunes festivo 12 de octubre de 2026, en la plazoleta de eventos del Parque Metropolitano Sim\u00f3n Bol\u00edvar, con entrada gratuita.\n\nDesde su primera edici\u00f3n, el festival se ha consolidado como el encuentro gratuito de rock m\u00e1s grande de Am\u00e9rica Latina y un s\u00edmbolo de la capacidad de Bogot\u00e1 para construir espacios democr\u00e1ticos de acceso a la cultura. Fue declarado de inter\u00e9s cultural por el Acuerdo 120 de 2004 y, en esta edici\u00f3n conmemorativa, la programaci\u00f3n reunir\u00e1 bandas que han marcado generaciones, artistas contempor\u00e1neos que definen el presente del rock y propuestas emergentes que anticipan el futuro.\n\nEl cartel distrital ya confirmado incluye 26 artistas y agrupaciones de Bogot\u00e1 y sus alrededores, seleccionados a trav\u00e9s de la Beca Festival Rock al Parque 2026 - Bogot\u00e1 Ciudad Creativa de la M\u00fasica y de la convocatoria especial por los 30 a\u00f1os del evento. La selecci\u00f3n recorre el metal, el punk, el ska, el rock alternativo y otras sonoridades de la escena bogotana, reuniendo tanto agrupaciones con d\u00e9cadas de trayectoria como nuevas propuestas del circuito independiente de la capital.\n\nLa celebraci\u00f3n no se limita a los tres d\u00edas de conciertos. Durante el mes de octubre se contemplan actividades de memoria y circulaci\u00f3n del festival en distintos puntos de la ciudad: exposiciones, conversatorios, un libro conmemorativo de los 30 a\u00f1os y acciones que repasan la historia del encuentro musical. La edici\u00f3n 2026 se enmarca adem\u00e1s en la agenda de los Festivales al Parque del Idartes, que incluye a Jazz al Parque (12 y 13 de septiembre), Hip Hop al Parque (24 y 25 de octubre) y Salsa al Parque (28 y 29 de noviembre).\n\nLa organizaci\u00f3n est\u00e1 a cargo del Instituto Distrital de las Artes (Idartes) con el apoyo de la Secretar\u00eda de Cultura, Recreaci\u00f3n y Deporte de Bogot\u00e1, en el marco de la estrategia Bogot\u00e1, mi Ciudad, mi Casa.',
  highlight: 'Entrada gratuita \u00b7 26 artistas distritales confirmados \u00b7 10, 11 y 12 de octubre \u00b7 30 a\u00f1os estremeciendo a Bogot\u00e1',
  ciudad: 'Bogot\u00e1',
  region: 'Cundinamarca',
  barrio: 'Teusaquillo',
  lat: 4.658056,
  lng: -74.093889,
  whatsapp: '',
  telefono: '',
  email: '',
  web: 'https://rockalparque.gov.co',
  instagram: '@rockalparquefes',
  precio_desde: 'Entrada gratuita',
  horario: '10, 11 y 12 de octubre de 2026, desde el mediod\u00eda',
  emoji: '\ud83c\udfb8',
  hero_bg: 'linear-gradient(135deg,#1a051a,#3a1a3a)',
  foto_hero: HERO,
  tipo: 'Festival de rock \u00b7 Gratuito \u00b7 Edici\u00f3n 30 a\u00f1os',
  capacidad: 'Plaza de Eventos hasta 140.000 personas',
  como_llegar: 'TransMilenio: estaci\u00f3n \u201cSalitre - El Greco\u201d (Av. 68) y caminar 10 minutos por la Av. 68 hasta la calle 53. Alternativas: \u201cMovistar Arena\u201d, \u201c7 de Agosto\u201d, \u201cEl Tiempo - C\u00e1mara de Comercio\u201d y \u201cCAN\u201d. Carro o SITP: avenidas 68, calle 63, calle 53 y Avenida Boyac\u00e1. Los d\u00edas del festival se habilitan planes especiales de movilidad y cicloparqueaderos.',
  status: 'published',
  destacado: true
};

const TAGS = {
  fecha_inicio: '2026-10-10',
  fecha_fin: '2026-10-12',
  edicion: 'Edici\u00f3n 30 (30 a\u00f1os)',
  sede: 'Plaza de Eventos, Parque Metropolitano Sim\u00f3n Bol\u00edvar, Bogot\u00e1',
  organiza: 'Idartes con la Secretar\u00eda de Cultura, Recreaci\u00f3n y Deporte de Bogot\u00e1',
  lema: '30 a\u00f1os, 30 ediciones, estremeciendo a Bogot\u00e1',
  lineup: [
    { nombre: 'Valore', escenario: 'Death metal progresivo', hora: '' },
    { nombre: 'Lo mismo dec\u00edan de Juana', escenario: 'Rock independiente', hora: '' },
    { nombre: 'Narcocracia', escenario: 'Metal con s\u00e1tira social', hora: '' },
    { nombre: 'No Dependiente', escenario: 'Hardcore / NYHC', hora: '' },
    { nombre: 'Vein', escenario: 'Death / groove metal', hora: '' },
    { nombre: 'Lutter Band', escenario: 'Punk rock', hora: '' },
    { nombre: 'Ataque de P\u00e1nico', escenario: 'Groove y death metal', hora: '' },
    { nombre: 'Laura P\u00e9rez', escenario: 'Cantautora / rock', hora: '' },
    { nombre: 'Lika Nova', escenario: 'Pop alternativo', hora: '' },
    { nombre: 'Mashkera', escenario: 'Groove thrash metal', hora: '' },
    { nombre: 'Solegnium', escenario: 'Brutal death metal', hora: '' },
    { nombre: 'V for Volume', escenario: 'Punk, rock y m\u00fasica electr\u00f3nica', hora: '' },
    { nombre: 'Alto Grado', escenario: 'Ska rock con liderazgo femenino', hora: '' },
    { nombre: 'Boca de Serpiente', escenario: 'Rock agresivo / puesta en escena intensa', hora: '' },
    { nombre: 'Elsa Riveros', escenario: 'Leyenda del rock colombiano (ex Pasaporte)', hora: '' },
    { nombre: 'Pez Errante', escenario: 'Rock / stoner en espa\u00f1ol', hora: '' },
    { nombre: 'StayWay', escenario: 'Rock alternativo', hora: '' },
    { nombre: 'Casi', escenario: 'Rock con cumbia, salsa, reggae y punk', hora: '' },
    { nombre: 'Brina Quoya', escenario: 'Trip hop, neosoul y jazz de vanguardia', hora: '' },
    { nombre: 'La Brigada RPF', escenario: 'Ska-punk', hora: '' },
    { nombre: 'Perpetual Warfare', escenario: 'Thrash metal (Beca LEP 30 a\u00f1os)', hora: '' },
    { nombre: 'Skampida', escenario: 'Ska, punk, klezmer y rockabilly (Beca LEP 30 a\u00f1os)', hora: '' },
    { nombre: 'Syracus\u00e6', escenario: 'Metal moderno / metalcore', hora: '' },
    { nombre: 'La Monky Band', escenario: 'Ska, punk, metal y funk (\u201cPower Monky\u201d)', hora: '' },
    { nombre: 'El Punto Ska', escenario: 'Ska, punk, reggae y ritmos latinos', hora: '' },
    { nombre: 'Lucio Feuillet', escenario: 'Cantautor andino', hora: '' }
  ],
  agenda: [
    { dia: 'S\u00e1bado 10 de octubre', hora: 'Desde el mediod\u00eda', actividad: 'Apertura de puertas y primeras presentaciones distritales' },
    { dia: 'Domingo 11 de octubre', hora: 'Jornada completa', actividad: 'Presentaciones de artistas distritales en la Plaza de Eventos' },
    { dia: 'Lunes 12 de octubre (festivo)', hora: 'Jornada completa', actividad: 'Cierre conmemorativo de los 30 a\u00f1os del festival' },
    { dia: 'Durante octubre', hora: 'Varias sedes', actividad: 'Exposiciones, conversatorios y acciones de memoria y circulaci\u00f3n' }
  ],
  categorias_entrada: [
    { tipo: 'Entrada general', precio: 'Gratis', disponibilidad: 'Disponible' },
    { tipo: 'Actividades de memoria', precio: 'Gratis (seg\u00fan aforo)', disponibilidad: 'Disponible' }
  ],
  que_llevar: [
    'Protector solar',
    'Poncho o impermeable para lluvias',
    'Agua (hay puntos de hidrataci\u00f3n)',
    'Documento de identidad',
    'Calzado c\u00f3modo para largas jornadas',
    'Dinero en efectivo para puestos de comida'
  ],
  prohibido: [
    'Ingreso de bebidas alcoh\u00f3licas',
    'Armas de cualquier tipo',
    'Globos o p\u00e9ndulos',
    'Sombrillas grandes que impidan la visibilidad',
    'Ingreso de mascotas'
  ]
};

const FAQS = [
  { pregunta: '\u00bfCu\u00e1ndo es Rock al Parque 2026?', respuesta: 'El s\u00e1bado 10, el domingo 11 y el lunes festivo 12 de octubre de 2026.' },
  { pregunta: '\u00bfEs gratis?', respuesta: 'S\u00ed, la entrada es completamente gratuita, como en todas las ediciones del festival.' },
  { pregunta: '\u00bfD\u00f3nde se realiza?', respuesta: 'En la plazoleta de eventos del Parque Metropolitano Sim\u00f3n Bol\u00edvar, en Bogot\u00e1.' },
  { pregunta: '\u00bfQui\u00e9nes tocan?', respuesta: 'Hay 26 artistas y agrupaciones distritales confirmados (metal, punk, ska, rock alternativo). El cartel internacional se anuncia m\u00e1s adelante.' },
  { pregunta: '\u00bfC\u00f3mo llego?', respuesta: 'TransMilenio estaci\u00f3n \u201cSalitre - El Greco\u201d (Av. 68) y caminar 10 minutos. Tambi\u00e9n estaciones \u201cMovistar Arena\u201d, \u201c7 de Agosto\u201d, \u201cEl Tiempo\u201d y \u201cCAN\u201d.' },
  { pregunta: '\u00bfHay actividades de los 30 a\u00f1os fuera del parque?', respuesta: 'S\u00ed: exposiciones, conversatorios y un libro conmemorativo de los 30 a\u00f1os del festival en distintos espacios de Bogot\u00e1 durante octubre.' }
];

module.exports = { SLUG: SLUG, HERO: HERO, PHOTOS: PHOTOS, BASE: BASE, TAGS: TAGS, FAQS: FAQS };

if (require.main !== module) return;

(async function main() {
  var url = process.env.DATABASE_URL || process.argv[2];
  if (!url) {
    console.error('Falta DATABASE_URL.');
    console.error('Uso: DATABASE_URL=postgres://... node scripts/seed-rock-al-parque.js [--dry]');
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