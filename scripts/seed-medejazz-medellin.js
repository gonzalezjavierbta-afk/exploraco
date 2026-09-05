// scripts/seed-medejazz-medellin.js
// Datos del evento Festival Internacional Medellin de Jazz y Musicas del
// Mundo 2026 (30 aniversario), categoria evento. Patron seed + loader +
// smoke de Fase 9.
//
// Uso:
//   DATABASE_URL=postgres://... node scripts/seed-medejazz-medellin.js --dry
//   DATABASE_URL=postgres://... node scripts/seed-medejazz-medellin.js
//
// Idempotente: re-ejecutable sin efectos secundarios (ON CONFLICT slug).
// Contenido 100% ASCII-safe: caracteres especiales como escapes \uXXXX.

var neon = null;
function getNeon() {
  if (!neon) neon = require('@neondatabase/serverless').neon;
  return neon;
}

const SLUG = 'medejazz-medellin';
const HERO = 'https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=900&q=80';

const PHOTOS = [
  { url: HERO, caption: 'MedeJazz 2026: 30 anos de jazz y musicas del mundo en Medellin' },
  { url: 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=900&q=80', caption: 'Once conciertos en tres escenarios de la ciudad' },
  { url: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=900&q=80', caption: 'Saxofon, piano y ritmos de Cuba, Holanda, Venezuela y Colombia' },
  { url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=900&q=80', caption: 'Conciertos de entrada libre en el Jardin Botanico y Plaza Mayor' },
  { url: 'https://images.unsplash.com/photo-1508974239320-0a029497e820?w=900&q=80', caption: 'Un festival que marca los 30 anos de la capital antioquena' }
];

const BASE = {
  slug: SLUG,
  nombre: 'MedeJazz 2026: Festival de Jazz y M\u00fasicas del Mundo',
  categoria_slug: 'evento',
  lead: 'El festival internacional de jazz m\u00e1s querido de Medell\u00edn celebra 30 a\u00f1os: once conciertos, diez de entrada libre, con invitados de Cuba, Venezuela y Holanda, del 5 al 19 de septiembre en Plaza Mayor y el Jard\u00edn Bot\u00e1nico.',
  descripcion: 'El Festival Internacional Medell\u00edn de Jazz y M\u00fasicas del Mundo (MedeJazz) celebra su 30 aniversario del 5 al 19 de septiembre de 2026, despu\u00e9s de tres d\u00e9cadas difundiendo m\u00fasicas del mundo en la capital antioque\u00f1a.\n\nLa programaci\u00f3n trae once conciertos de diversas sonoridades, diez de ellos con entrada libre, y cuatro clases maestras tambi\u00e9n gratuitas. De Cuba llegan la Orquesta Arag\u00f3n y Andr\u00e9s Hern\u00e1ndez; de Venezuela, Joseph Amado; de Holanda, Michael Varekamp & The Legends; y por Antioquia participan nueve agrupaciones: ARZ Sexteto, Claudia G\u00f3mez, Far\u00edbula, JS Ram\u00edrez Latin Jazz Quinteto, Kanajazz, Magangu\u00e9 Orchestra, MCO/MYTHOS, SH Jazz Project y Shades of Blues.\n\nLos tres escenarios son el Gran Sal\u00f3n de Plaza Mayor y la Tarima SURA del Jard\u00edn Bot\u00e1nico, esta \u00faltima en el marco de la Fiesta del Libro y la Cultura de Medell\u00edn. La inauguraci\u00f3n del s\u00e1bado 5 de septiembre a las 7:00 pm en el Gran Sal\u00f3n de Plaza Mayor re\u00fane a la Orquesta Arag\u00f3n con la Orquesta Sinf\u00f3nica de EAFIT, adem\u00e1s de Joseph Amado y Andr\u00e9s Hern\u00e1ndez.',
  highlight: '30 aniversario \u00b7 5 al 19 de septiembre \u00b7 Orquesta Aragon, Joseph Amado y Michael Varekamp \u00b7 10 conciertos gratuitos',
  ciudad: 'Medell\u00edn',
  region: 'Antioquia',
  barrio: 'La Candelaria / El Poblado',
  lat: 6.2442,
  lng: -75.5812,
  whatsapp: '',
  telefono: '',
  email: '',
  web: 'https://www.medejazz.com',
  instagram: '@medellinjazz',
  precio_desde: 'Gratis (10 de 11 conciertos); inauguracion con boleteria',
  horario: 'Del 5 al 19 de septiembre de 2026',
  emoji: '\ud83c\udfb7',
  hero_bg: 'linear-gradient(135deg,#1a0a1a,#0a1a1a)',
  foto_hero: HERO,
  tipo: 'Festival de jazz \u00b7 Musicas del mundo \u00b7 30 aniversario',
  capacidad: 'Gran Salon de Plaza Mayor y Tarima SURA del Jardin Botanico',
  como_llegar: 'MedeJazz se realiza en el Gran Salon de Plaza Mayor (carrera 58 # 42-125, zona de Alpujarra) y en la Tarima SURA del Jardin Botanico (calle 73 # 51D-14), en el marco de la Fiesta del Libro y la Cultura. Ambos escenarios quedan cerca del Metro de Medellin (estaciones Plaza Mayor/Estadio o Alpujarra).',
  status: 'published',
  destacado: true
};

const TAGS = {
  fecha_inicio: '2026-09-05',
  fecha_fin: '2026-09-19',
  edicion: 'Edicion 30 (aniversario)',
  sede: 'Gran Salon de Plaza Mayor y Tarima SURA del Jardin Botanico',
  organiza: 'Festival Internacional Medellin de Jazz y Musicas del Mundo',
  lema: 'Tres decadas de jazz y musicas del mundo',
  pais_invitado: 'Cuba, Venezuela y Holanda',
  lineup: [
    { nombre: 'Orquesta Aragon + Sinfonica EAFIT', escenario: 'Gran Salon de Plaza Mayor', hora: 'Inauguracion - 5 de septiembre' },
    { nombre: 'Joseph Amado', escenario: 'Gran Salon de Plaza Mayor', hora: '5 de septiembre' },
    { nombre: 'Andres Hernandez', escenario: 'Gran Salon de Plaza Mayor', hora: '5 de septiembre' },
    { nombre: 'ARZ Sexteto', escenario: 'Tarima SURA, Jardin Botanico', hora: '11 de septiembre' },
    { nombre: 'Michael Varekamp & The Legends', escenario: 'Tarima SURA, Jardin Botanico', hora: '12 de septiembre' },
    { nombre: 'Magangue Orchestra', escenario: 'Tarima SURA, Jardin Botanico', hora: '11 de septiembre' }
  ],
  agenda: [
    { dia: 'Sabado 5 de septiembre', hora: '7:00 pm', actividad: 'Inauguracion: Orquesta Aragon con Sinfonica EAFIT, Joseph Amado y Andres Hernandez' },
    { dia: 'Viernes 11 de septiembre', hora: '5:00 - 6:30 pm', actividad: 'ARZ Sexteto y Magangue Orchestra en la Tarima SURA' },
    { dia: 'Sabado 12 de septiembre', hora: '6:30 pm', actividad: 'Michael Varekamp & The Legends (Holanda) en la Tarima SURA' },
    { dia: 'Martes 15 de septiembre', hora: '6:30 - 8:00 pm', actividad: 'SH Jazz Project y Faribula en el Jardin Botanico' },
    { dia: 'Miercoles 16 de septiembre', hora: '8:00 pm', actividad: 'Kanajazz en la Tarima SURA' },
    { dia: 'Jueves 17 de septiembre', hora: '6:30 - 8:00 pm', actividad: 'Claudia Gomez y JS Ramirez Latin Jazz Quinteto' },
    { dia: 'Viernes 18 de septiembre', hora: '5:00 pm', actividad: 'MCO/MYTHOS en la Tarima SURA' },
    { dia: 'Sabado 19 de septiembre', hora: '8:00 pm', actividad: 'Cierre con Shades of Blues' }
  ],
  categorias_entrada: [
    { tipo: 'Conciertos de entrada libre', precio: 'Gratis', disponibilidad: 'Disponible' },
    { tipo: 'Inauguracion en Plaza Mayor', precio: 'Segun boleteria en TicketExpress', disponibilidad: 'Disponible' }
  ],
  que_llevar: [
    'Revisa la programacion por fecha y escenario en medejazz.com',
    'Llega temprano: los conciertos libres son hasta completar aforo',
    'Ropa y calzado comodo para el Jardin Botanico',
    'Efectivo o tarjeta para alimentos y souvenirs',
    'Consulta los horarios exactos de cada concierto en la web oficial'
  ],
  prohibido: [
    'Alimentos y bebidas dentro de las salas cerradas',
    'Camara profesional o de video en conciertos',
    'Armas u objetos contundentes',
    'Sombrillas con punta metalica en zonas de gran aforo'
  ]
};

const FAQS = [
  { pregunta: 'Cuando es MedeJazz 2026?', respuesta: 'Del 5 al 19 de septiembre de 2026, celebrando su 30 aniversario.' },
  { pregunta: 'Donde se realiza?', respuesta: 'En el Gran Salon de Plaza Mayor y la Tarima SURA del Jardin Botanico, en el marco de la Fiesta del Libro y la Cultura.' },
  { pregunta: 'Es gratis?', respuesta: 'Si, diez de los once conciertos y las cuatro clases maestras son de entrada libre. La inauguracion del 5 de septiembre tiene boleteria.' },
  { pregunta: 'Quienes son los invitados?', respuesta: 'La Orquesta Aragon (Cuba), Joseph Amado (Venezuela), Michael Varekamp (Holanda) y nueve agrupaciones antioquenas.' },
  { pregunta: 'Donde compro la boleta de inauguracion?', respuesta: 'En TicketExpress para el concierto del 5 de septiembre en el Gran Salon de Plaza Mayor.' }
];

module.exports = { SLUG: SLUG, HERO: HERO, PHOTOS: PHOTOS, BASE: BASE, TAGS: TAGS, FAQS: FAQS };

if (require.main !== module) return;

(async function main() {
  var url = process.env.DATABASE_URL || process.argv[2];
  if (!url) {
    console.error('Falta DATABASE_URL.');
    console.error('Uso: DATABASE_URL=postgres://... node scripts/seed-medejazz-medellin.js [--dry]');
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
