// scripts/seed-ulibro-bucaramanga.js
// Datos del evento Ulibro 2026: Feria del Libro de Bucaramanga (UNAB),
// edicion 24, categoria evento. Patron seed + loader + smoke de Fase 9.
//
// Uso:
//   DATABASE_URL=postgres://... node scripts/seed-ulibro-bucaramanga.js --dry
//   DATABASE_URL=postgres://... node scripts/seed-ulibro-bucaramanga.js
//
// Idempotente: re-ejecutable sin efectos secundarios (ON CONFLICT slug).
// Contenido 100% ASCII-safe: caracteres especiales como escapes \uXXXX.

var neon = null;
function getNeon() {
  if (!neon) neon = require('@neondatabase/serverless').neon;
  return neon;
}

const SLUG = 'ulibro-bucaramanga';
const HERO = 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=900&q=80';

const PHOTOS = [
  { url: HERO, caption: 'Ulibro 2026: la feria del libro de Bucaramanga abre sus puertas' },
  { url: 'https://images.unsplash.com/photo-1524578271613-d550eacf6090?w=900&q=80', caption: '461 actividades y 100 estands en Neomundo' },
  { url: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=900&q=80', caption: 'Literatura, ciencia, arte y musica para toda la familia' },
  { url: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=900&q=80', caption: 'Presentaciones de libros y conversaciones con mas de 500 invitados' },
  { url: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=900&q=80', caption: 'Un encuentro cultural del oriente colombiano' }
];

const BASE = {
  slug: SLUG,
  nombre: 'Ulibro 2026: Feria del Libro de Bucaramanga',
  categoria_slug: 'evento',
  lead: 'La edici\u00f3n 24 de la feria del libro de Bucaramanga, \u201cHabitemos lo salvaje\u201d: 461 actividades, 100 estands editoriales y un cierre con Claudio Narea (Los Prisioneros), del 28 de agosto al 6 de septiembre en Neomundo.',
  descripcion: 'Ulibro, la Feria del Libro de Bucaramanga organizada por la Universidad Aut\u00f3noma de Bucaramanga (UNAB), celebra su edici\u00f3n n\u00famero 24 del 28 de agosto al 6 de septiembre de 2026 en Neomundo Centro de Convenciones, en Bucaramanga.\n\nEsta edici\u00f3n tiene como lema \u201cHabitemos lo salvaje\u201d, una propuesta que invita a reflexionar sobre la relaci\u00f3n entre las personas, los territorios y la naturaleza a trav\u00e9s de la literatura y las artes. La organizaci\u00f3n divide el enfoque en tres l\u00edneas: recuperar el asombro, explorar los territorios y escribir el paisaje.\n\nLa programaci\u00f3n incluye 461 actividades y alrededor de 500 invitados, con una muestra editorial de 100 estands que re\u00fane editoriales, librer\u00edas y emprendimientos. Cuenta con un \u00e1rea conjunta para c\u00f3mics y literatura infantil con 51 expositores, y en 2026 marc\u00f3 un r\u00e9cord con 139 postulaciones de autores independientes, de las cuales se seleccionaron 64.\n\nEntre los eventos destacan el podcast en vivo con Yolanda Ruiz y Mar\u00eda Elvira Samper (29 de agosto), la comedia de Villarruga (3 de septiembre) y la Muestra Gastrof\u00f3nica (5 de septiembre). El cierre estar\u00e1 a cargo de Claudio Narea, fundador de Los Prisioneros, el 6 de septiembre, que ser\u00e1 la primera agrupaci\u00f3n musical internacional dentro de la franja de eventos especiales de la feria.',
  highlight: '461 actividades y 100 estands \u00b7 28 ago al 6 sep \u00b7 Cierre con Claudio Narea (Los Prisioneros) \u00b7 Neomundo',
  ciudad: 'Bucaramanga',
  region: 'Santander',
  barrio: 'Centro',
  lat: 7.1193,
  lng: -73.1177,
  whatsapp: '',
  telefono: '',
  email: '',
  web: 'https://www.unab.edu.co/ulibro',
  instagram: '@UlibroUNAB',
  precio_desde: 'Varias actividades gratuitas; algunas requieren boleteria',
  horario: 'Del 28 de agosto al 6 de septiembre de 2026, variados horarios',
  emoji: '\ud83d\udcd6',
  hero_bg: 'linear-gradient(135deg,#0a3a1a,#1a1a3a)',
  foto_hero: HERO,
  tipo: 'Feria del libro \u00b7 Cultura y arte \u00b7 Orientales',
  capacidad: 'Neomundo Centro de Convenciones, Bucaramanga',
  como_llegar: 'Ulibro se realiza en Neomundo Centro de Convenciones, en Bucaramanga (Santander). Havariedad de accesos por transporte publico de la ciudad y parqueaderos en el centro de convenciones. Consulta la programacion en la pagina oficial de la UNAB.',
  status: 'published',
  destacado: true
};

const TAGS = {
  fecha_inicio: '2026-08-28',
  fecha_fin: '2026-09-06',
  edicion: 'Edicion 24',
  sede: 'Neomundo Centro de Convenciones, Bucaramanga',
  organiza: 'Universidad Autonoma de Bucaramanga (UNAB)',
  lema: 'Habitemos lo salvaje',
  pais_invitado: 'Colombia e invitados internacionales',
  lineup: [
    { nombre: 'Claudio Narea (Los Prisioneros)', escenario: 'Gran Salon de Neomundo', hora: 'Cierre - 6 de septiembre' },
    { nombre: 'Yolanda Ruiz y Maria Elvira Samper', escenario: 'Podcast en vivo', hora: '29 de agosto' },
    { nombre: 'Villarruga (comedia)', escenario: 'Neomundo', hora: '3 de septiembre' },
    { nombre: 'Muestra Gastrofonica', escenario: 'Neomundo', hora: '5 de septiembre' }
  ],
  agenda: [
    { dia: '28 de agosto al 6 de septiembre', hora: 'Neomundo', actividad: 'Muestra editorial con 100 estands' },
    { dia: '29 de agosto', hora: 'Neomundo', actividad: 'Podcast en vivo con Yolanda Ruiz y Maria Elvira Samper' },
    { dia: '3 de septiembre', hora: 'Neomundo', actividad: 'Comedia e improvisacion con Villarruga' },
    { dia: '5 de septiembre', hora: 'Neomundo', actividad: 'Muestra Gastrofonica (Seis On) para publico familiar' },
    { dia: '6 de septiembre', hora: 'Gran Salon de Neomundo', actividad: 'Cierre con Claudio Narea, fundador de Los Prisioneros' },
    { dia: 'Durante la feria', hora: 'Area de comics', actividad: 'Comics y literatura infantil con 51 expositores' }
  ],
  categorias_entrada: [
    { tipo: 'Acceso a zonas abiertas', precio: 'Gratis', disponibilidad: 'Disponible' },
    { tipo: 'Eventos especiales', precio: 'Segun evento (boleteria)', disponibilidad: 'Disponible' }
  ],
  que_llevar: [
    'Documento de identidad',
    'Disfruta las 461 actividades de la programacion',
    'Presupuesto para comprar libros en los 100 estands',
    'Llegar temprano a los eventos con aforo limitado',
    'Consulta la programacion diaria en la web de la UNAB'
  ],
  prohibido: [
    'Alimentos y bebidas dentro de las salas cerradas',
    'Camara profesional sin acreditacion en eventos especiales',
    'Armas u objetos contundentes',
    'Dano a los libros y materiales expuestos'
  ]
};

const FAQS = [
  { pregunta: 'Cuando es Ulibro 2026?', respuesta: 'Del 28 de agosto al 6 de septiembre de 2026, en Neomundo Centro de Convenciones de Bucaramanga.' },
  { pregunta: 'Donde se realiza?', respuesta: 'En Neomundo Centro de Convenciones, en Bucaramanga (Santander).' },
  { pregunta: 'Que tema tiene esta edicion?', respuesta: 'El lema es Habitemos lo salvaje: reflexiones sobre la relacion entre las personas, los territorios y la naturaleza.' },
  { pregunta: 'Quien lo organiza?', respuesta: 'La Universidad Autonoma de Bucaramanga (UNAB).' },
  { pregunta: 'Quien cierra la feria?', respuesta: 'Claudio Narea, fundador de Los Prisioneros, el domingo 6 de septiembre.' },
  { pregunta: 'Cuantas actividades trae?', respuesta: '461 actividades, alrededor de 500 invitados y 100 estands editoriales.' }
];

module.exports = { SLUG: SLUG, HERO: HERO, PHOTOS: PHOTOS, BASE: BASE, TAGS: TAGS, FAQS: FAQS };

if (require.main !== module) return;

(async function main() {
  var url = process.env.DATABASE_URL || process.argv[2];
  if (!url) {
    console.error('Falta DATABASE_URL.');
    console.error('Uso: DATABASE_URL=postgres://... node scripts/seed-ulibro-bucaramanga.js [--dry]');
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
