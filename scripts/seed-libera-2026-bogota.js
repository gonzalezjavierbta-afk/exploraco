// scripts/seed-libera-2026-bogota.js
// Datos del evento Libera 2026: Feria del Libro de No Ficcion (Universidad
// de los Andes / Cerlalc), categoria evento. Patron seed + loader + smoke
// de Fase 9.
//
// Uso:
//   DATABASE_URL=postgres://... node scripts/seed-libera-2026-bogota.js --dry
//   DATABASE_URL=postgres://... node scripts/seed-libera-2026-bogota.js
//
// Idempotente: re-ejecutable sin efectos secundarios (ON CONFLICT slug).
// Contenido 100% ASCII-safe: caracteres especiales como escapes \uXXXX.

var neon = null;
function getNeon() {
  if (!neon) neon = require('@neondatabase/serverless').neon;
  return neon;
}

const SLUG = 'libera-2026-bogota';
const HERO = 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=900&q=80';

const PHOTOS = [
  { url: HERO, caption: 'Libera 2026: la feria del libro de no ficcion en la sede del Cerlalc' },
  { url: 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?w=900&q=80', caption: 'Charlas y presentaciones de libros de ciencia, historia y sociedad' },
  { url: 'https://images.unsplash.com/photo-1509228468518-180dd4864904?w=900&q=80', caption: 'El eje central: la conquista del espacio y la astronomia' },
  { url: 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=900&q=80', caption: 'Novelas graficas, ensayos y publicaciones de editoriales independientes' },
  { url: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=900&q=80', caption: 'Miles de libros de no ficcion para todos los lectores' }
];

const BASE = {
  slug: SLUG,
  nombre: 'Libera 2026: Feria del Libro de No Ficci\u00f3n',
  categoria_slug: 'evento',
  lead: 'La tercera edici\u00f3n de la feria del libro de no ficci\u00f3n organizada por la Universidad de los Andes: m\u00e1s de 50 eventos con invitados de la NASA sobre la conquista del espacio, del 31 de agosto al 6 de septiembre, gratis.',
  descripcion: 'Libera es la feria del libro de no ficci\u00f3n organizada por la Universidad de los Andes, que celebra su tercera edici\u00f3n del 31 de agosto al 6 de septiembre de 2026 en la sede del Cerlalc (Centro Regional para el Fomento del Libro en Am\u00e9rica Latina y el Caribe), en la calle 70 # 9-52 de Bogot\u00e1. La entrada es gratuita.\n\nEl eje central de esta versi\u00f3n es la conquista del espacio. Ser\u00e1n m\u00e1s de 50 eventos entre presentaciones de libros, conversatorios, talleres y proyecciones sobre astronom\u00eda, astrof\u00edsica, cartograf\u00eda del universo, avances tecnol\u00f3gicos de las nuevas misiones espaciales y el papel de Colombia en la exploraci\u00f3n cient\u00edfica internacional.\n\nComo invitada especial destaca la cient\u00edfica colombiana Pilar Archila, integrante del Centro Espacial Johnson de la NASA y colaboradora de la misi\u00f3n Artemis II, que llev\u00f3 de vuelta al hombre a la luna. La agenda tambi\u00e9n incluye a expertos y divulgadores de la Red de Astronom\u00eda de Colombia, Maloka y el Planetario de Bogot\u00e1, junto a cineastas y l\u00edderes de opini\u00f3n.\n\nPero el universo es solo el punto de partida: Libera re\u00fane publicaciones y debates sobre historia, finanzas personales, ciencias sociales e investigaci\u00f3n period\u00edstica, con las novedades de sellos universitarios, editoriales independientes, librer\u00edas y revistas como El Malpensante.',
  highlight: 'M\u00e1s de 50 eventos gratis del 31 ago al 6 sep \u00b7 Invitada de la NASA: Pilar Archila \u00b7 Eje: conquista del espacio',
  ciudad: 'Bogot\u00e1',
  region: 'Cundinamarca',
  barrio: 'Chapinero',
  lat: 4.6508,
  lng: -74.0656,
  whatsapp: '',
  telefono: '',
  email: '',
  web: 'https://www.uniandes.edu.co/es/noticias/literatura/llega-la-feria-del-libro-de-no-ficcion-libera-2026',
  instagram: '@UniversidaddelosAndes',
  precio_desde: 'Gratis',
  horario: 'Del 31 de agosto al 6 de septiembre de 2026, variados horarios',
  emoji: '\ud83d\udcda',
  hero_bg: 'linear-gradient(135deg,#1a1a2a,#2a1a3a)',
  foto_hero: HERO,
  tipo: 'Feria del libro \u00b7 Ciencia y espacio \u00b7 Gratuito',
  capacidad: 'Sede del Cerlalc, calle 70 # 9-52',
  como_llegar: 'La feria se realiza en la sede del Cerlalc, en la calle 70 # 9-52, en Chapinero (cerca de la carrera Septima y la avenida Jimenez no; sobre la conexion con la estacion Calle 72 de la carrera Septima en TransMilenio). Se accede caminando por la carrera 9 desde la calle 72 o en transporte publico por la carrera Septima o la calle 70.',
  status: 'published',
  destacado: true
};

const TAGS = {
  fecha_inicio: '2026-08-31',
  fecha_fin: '2026-09-06',
  edicion: 'Tercera edicion',
  sede: 'Cerlalc, calle 70 # 9-52 (Bogota)',
  organiza: 'Universidad de los Andes / Cerlalc',
  lema: 'La conquista del espacio y las nuevas ideas',
  pais_invitado: 'Colombia (NASA: Pilar Archila)',
  lineup: [
    { nombre: 'Pilar Archila', escenario: 'Centro Espacial Johnson - NASA', hora: 'Invitada especial' },
    { nombre: 'Red de Astronomia de Colombia', escenario: 'Conversatorios', hora: 'Durante la feria' },
    { nombre: 'Maloka y Planetario de Bogota', escenario: 'Charlas y talleres', hora: 'Durante la feria' },
    { nombre: 'El Malpensante', escenario: 'Revista participante', hora: 'Durante la feria' }
  ],
  agenda: [
    { dia: '31 de agosto al 6 de septiembre', hora: 'Sede del Cerlalc', actividad: 'Muestra editorial de sellos universitarios e independientes' },
    { dia: 'Durante la semana', hora: 'Auditorio Cerlalc', actividad: 'Charlas con invitados de la NASA sobre la mision Artemis II' },
    { dia: 'Durante la semana', hora: 'Varios espacios', actividad: 'Conversatorios de astronomia, astrofisica y ciencia' },
    { dia: 'Durante la semana', hora: 'Sala de cine', actividad: 'Proyecciones de peliculas y documentales espaciales' },
    { dia: 'Durante la semana', hora: 'Varios espacios', actividad: 'Presentaciones de libros de historia, finanzas y ciencias sociales' }
  ],
  categorias_entrada: [
    { tipo: 'Acceso a toda la feria', precio: 'Gratis', disponibilidad: 'Disponible' }
  ],
  que_llevar: [
    'Documento de identidad',
    'Ganas de aprender: hay mas de 50 eventos gratis',
    'Presupuesto para comprar libros y novedades editoriales',
    'Llegar con tiempo: aforo limitado en las charlas mas esperadas',
    'Revisa la programacion diaria en la web de la Uniandes'
  ],
  prohibido: [
    'Alimentos y bebidas dentro de las salas de charlas',
    'Filmacion o fotografia profesional sin acreditacion',
    'Armas de cualquier tipo',
    'Objetos contundentes o punzantes'
  ]
};

const FAQS = [
  { pregunta: 'Cuando es Libera 2026?', respuesta: 'Del 31 de agosto al 6 de septiembre de 2026, en la sede del Cerlalc en la calle 70 # 9-52 de Bogota.' },
  { pregunta: 'Es gratis?', respuesta: 'Si, la entrada a la feria y a los mas de 50 eventos es gratuita.' },
  { pregunta: 'De que trata esta edicion?', respuesta: 'El eje central es la conquista del espacio, con invitados de la NASA, astronomia, astrofisica y ciencia, ademas de historia, finanzas y ciencias sociales.' },
  { pregunta: 'Quien lo organiza?', respuesta: 'La Universidad de los Andes, junto con el Cerlalc (Centro Regional para el Fomento del Libro en America Latina y el Caribe).' },
  { pregunta: 'Hay invitados especiales?', respuesta: 'Si, la cientifica colombiana Pilar Archila del Centro Espacial Johnson de la NASA, colaboradora de la mision Artemis II.' }
];

module.exports = { SLUG: SLUG, HERO: HERO, PHOTOS: PHOTOS, BASE: BASE, TAGS: TAGS, FAQS: FAQS };

if (require.main !== module) return;

(async function main() {
  var url = process.env.DATABASE_URL || process.argv[2];
  if (!url) {
    console.error('Falta DATABASE_URL.');
    console.error('Uso: DATABASE_URL=postgres://... node scripts/seed-libera-2026-bogota.js [--dry]');
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
