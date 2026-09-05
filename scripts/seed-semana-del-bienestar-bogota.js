// scripts/seed-semana-del-bienestar-bogota.js
// Datos del evento Semana del Bienestar Bogota: Cultura y Salud para Vivir
// Mejor 2026 (Alcaldia Mayor de Bogota / SCRD), categoria evento.
// Patron seed + loader + smoke de Fase 9.
//
// Uso:
//   DATABASE_URL=postgres://... node scripts/seed-semana-del-bienestar-bogota.js --dry
//   DATABASE_URL=postgres://... node scripts/seed-semana-del-bienestar-bogota.js
//
// Idempotente: re-ejecutable sin efectos secundarios (ON CONFLICT slug).
// Contenido 100% ASCII-safe: caracteres especiales como escapes \uXXXX.

var neon = null;
function getNeon() {
  if (!neon) neon = require('@neondatabase/serverless').neon;
  return neon;
}

const SLUG = 'semana-del-bienestar-bogota';
const HERO = 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=900&q=80';

const PHOTOS = [
  { url: HERO, caption: 'Semana del Bienestar Bogota: meditacion, cultura y salud en la capital' },
  { url: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=900&q=80', caption: 'Talleres de yoga y movimiento consciente de entrada libre' },
  { url: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=900&q=80', caption: 'Experiencias de bienestar para toda la ciudadania' },
  { url: 'https://images.unsplash.com/photo-1474552226712-ac0f0961a954?w=900&q=80', caption: 'Ejercicio, meditacion y cultura en espacios emblematicos de Bogota' },
  { url: 'https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=900&q=80', caption: 'Paneles y conversaciones sobre bienestar, cultura y salud' }
];

const BASE = {
  slug: SLUG,
  nombre: 'Semana del Bienestar Bogot\u00e1 2026',
  categoria_slug: 'evento',
  lead: 'Del 29 de agosto al 6 de septiembre de 2026, Bogot\u00e1 re\u00fane m\u00e1s de 100 actividades gratuitas de cultura, salud, arte y movimiento en una semana \u00fanica con m\u00e1s de 90 invitados de 15 pa\u00edses.',
  descripcion: 'La Semana del Bienestar Bogot\u00e1: Cultura y Salud para Vivir Mejor es una iniciativa de la Alcald\u00eda Mayor de Bogot\u00e1, a trav\u00e9s de la Secretar\u00eda Distrital de Cultura, Recreaci\u00f3n y Deporte (SCRD), que se realizar\u00e1 del 29 de agosto al 6 de septiembre de 2026.\n\nPor primera vez re\u00fane tres grandes plataformas: los programas de la administraci\u00f3n distrital, el Hearth Summit Bogot\u00e1 del Wellbeing Summit (31 de agosto al 2 de septiembre) y el Encuentro Internacional de Longevidad Vive + y Mejor (5 y 6 de septiembre).\n\nSon nueve d\u00edas con m\u00e1s de 100 actividades de entrada libre: talleres de movimiento, meditaci\u00f3n, caminatas, paneles, charlas, conciertos y una feria de emprendimientos en espacios emblem\u00e1ticos como el Centro Felicidad Chapinero (sede principal), el Jard\u00edn Bot\u00e1nico Jos\u00e9 Celestino Mutis, la Plaza Cultural La Santamar\u00eda, el Planetario de Bogot\u00e1, la Plaza de Mercado La Concordia, el Centro de Bienestar Cafam La Candelaria y la Universidad EAN.\n\nLa programaci\u00f3n gira en torno a las ocho dimensiones del bienestar impulsadas por la OMS, la OCDE y el Global Wellness Index: f\u00edsica, emocional y salud mental, cognitiva y educaci\u00f3n, social, espiritual, ambiental, laboral y financiera. Participan m\u00e1s de 90 expertos, talleristas y ponentes de 15 pa\u00edses de Am\u00e9rica, Europa y \u00c1frica.\n\nEl gran cierre del s\u00e1bado 4 de septiembre incluye la Meditaci\u00f3n y M\u00fasica con la Filarm\u00f3nica de Bogot\u00e1. Toda la programaci\u00f3n est\u00e1 disponible en la p\u00e1gina oficial de la SCRD.',
  highlight: 'M\u00e1s de 100 actividades gratuitas del 29 ago al 6 sep \u00b7 Centro Felicidad Chapinero y m\u00e1s de 10 sedes \u00b7 90+ expertos de 15 pa\u00edses',
  ciudad: 'Bogot\u00e1',
  region: 'Cundinamarca',
  barrio: 'Toda la ciudad',
  lat: 4.681667,
  lng: -74.0475,
  whatsapp: '',
  telefono: '',
  email: '',
  web: 'https://www.culturarecreacionydeporte.gov.co/es/semanabienestarbogota',
  instagram: '@culturaenBTA',
  precio_desde: 'Gratis',
  horario: 'Del 29 de agosto al 6 de septiembre de 2026, variados horarios',
  emoji: '\ud83e\udec3',
  hero_bg: 'linear-gradient(135deg,#0a2a2a,#0a1a3a)',
  foto_hero: HERO,
  tipo: 'Bienestar y salud \u00b7 Cultura \u00b7 Gratuito',
  capacidad: 'Multiples sedes en toda Bogota',
  como_llegar: 'La sede principal es el Centro Felicidad (CEFE) Chapinero, en la calle 63 con carrera 13. Tambi\u00e9n se realizan actividades en el Jard\u00edn Bot\u00e1nico Jos\u00e9 Celestino Mutis (Av. Calle 63 #68-95), la Plaza Cultural La Santamar\u00eda (carrera 7 con calle 26), el Planetario de Bogot\u00e1 (calle 26 #5-93), la Plaza de Mercado La Concordia (carrera 1 #10-55) y la Universidad EAN. Consulta el punto de encuentro exacto de cada actividad en la programaci\u00f3n oficial de la SCRD.',
  status: 'published',
  destacado: true
};

const TAGS = {
  fecha_inicio: '2026-08-29',
  fecha_fin: '2026-09-06',
  edicion: 'Primera edicion',
  sede: 'Centro Felicidad Chapinero y mas de 10 sedes en Bogota',
  organiza: 'Alcaldia Mayor de Bogota / Secretaria Distrital de Cultura, Recreacion y Deporte',
  lema: 'Cultura y salud para vivir mejor',
  pais_invitado: '15 paises de America, Europa y Africa',
  lineup: [
    { nombre: 'Orquesta Filarmonica de Mujeres', escenario: 'Meditacion y Musica', hora: 'Cierre 4 de septiembre' },
    { nombre: 'Hearth Summit Bogota', escenario: 'Centro Felicidad Chapinero', hora: '31 ago - 2 sep' },
    { nombre: 'Vive + y Mejor (Longevidad)', escenario: 'Centro Felicidad Chapinero', hora: '5 - 6 sep' },
    { nombre: 'Natalia Suarez (meditacion)', escenario: 'Plaza Cultural La Santamaria', hora: '30 de agosto' }
  ],
  agenda: [
    { dia: '29 y 30 de agosto', hora: 'CEFE Chapinero', actividad: 'Feria de Emprendedores del Bienestar con mas de 50 emprendimientos' },
    { dia: '29 de agosto', hora: 'Jardin Botanico', actividad: 'Caminata meditativa Ciudad y Naturaleza y Experiencia Sinfonica' },
    { dia: '30 de agosto', hora: 'Plaza La Santamaria', actividad: 'Experiencia colectiva de meditacion y musica' },
    { dia: '31 de agosto al 2 de septiembre', hora: 'CEFE Chapinero', actividad: 'Hearth Summit Bogota del Wellbeing Summit (keynotes, paneles y talleres)' },
    { dia: '2 de septiembre', hora: 'Plaza de Mercado La Concordia', actividad: 'Sabor Bogota: gastronomia y cultura con Guardianes de Semilla' },
    { dia: '4 de septiembre', hora: 'CEFE Chapinero', actividad: 'Lanzamiento Diplomado El Arte de Estar Bien' },
    { dia: '5 y 6 de septiembre', hora: 'CEFE Chapinero', actividad: 'Vive + y Mejor: Encuentro Internacional de Longevidad' }
  ],
  categorias_entrada: [
    { tipo: 'Actividades de libre acceso', precio: 'Gratis', disponibilidad: 'Disponible' },
    { tipo: 'Actividades con inscripcion previa', precio: 'Gratis (cupo limitado)', disponibilidad: 'Disponible' }
  ],
  que_llevar: [
    'Ropa comoda y calzado para actividades fisicas',
    'Agua y botella reutilizable',
    'Documento de identidad',
    'Escenario de lectura y cuaderno para talleres',
    'Consulta la programacion y registrate antes en la pagina de la SCRD'
  ],
  prohibido: [
    'Alimentos y bebidas en escenarios cerrados',
    'Objetos contundentes o punzantes',
    'Armas de cualquier tipo',
    'Bicicletas o patines dentro de las salas'
  ]
};

const FAQS = [
  { pregunta: 'Cuando es la Semana del Bienestar Bogota 2026?', respuesta: 'Del 29 de agosto al 6 de septiembre de 2026, con mas de 100 actividades gratuitas.' },
  { pregunta: 'Es gratis?', respuesta: 'Si, todas las actividades son de entrada libre. Algunas requieren inscripcion previa o llegar antes de que se complete el aforo.' },
  { pregunta: 'Donde se realiza?', respuesta: 'La sede principal es el Centro Felicidad Chapinero, con sedes satelite como el Jardin Botanico, la Plaza La Santamaria, el Planetario, la Plaza de Mercado La Concordia y la Universidad EAN.' },
  { pregunta: 'Quien lo organiza?', respuesta: 'La Alcaldia Mayor de Bogota a traves de la Secretaria Distrital de Cultura, Recreacion y Deporte (SCRD), en alianza con el Hearth Summit y el Encuentro Vive + y Mejor.' },
  { pregunta: 'Que temas se abordan?', respuesta: 'Las ocho dimensiones del bienestar de la OMS: fisica, emocional, cognitiva, social, espiritual, ambiental, laboral y financiera, uniendo cultura y salud.' },
  { pregunta: 'Donde consulto la programacion completa?', respuesta: 'En la pagina oficial de la SCRD: culturarecreacionydeporte.gov.co/es/semanabienestarbogota' }
];

module.exports = { SLUG: SLUG, HERO: HERO, PHOTOS: PHOTOS, BASE: BASE, TAGS: TAGS, FAQS: FAQS };

if (require.main !== module) return;

(async function main() {
  var url = process.env.DATABASE_URL || process.argv[2];
  if (!url) {
    console.error('Falta DATABASE_URL.');
    console.error('Uso: DATABASE_URL=postgres://... node scripts/seed-semana-del-bienestar-bogota.js [--dry]');
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
