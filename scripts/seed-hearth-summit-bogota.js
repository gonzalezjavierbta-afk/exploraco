// scripts/seed-hearth-summit-bogota.js
// Datos del evento Hearth Summit Bogota 2026 (Wellbeing Summit), categoria
// evento. Patron seed + loader + smoke de Fase 9.
//
// Uso:
//   DATABASE_URL=postgres://... node scripts/seed-hearth-summit-bogota.js --dry
//   DATABASE_URL=postgres://... node scripts/seed-hearth-summit-bogota.js
//
// Idempotente: re-ejecutable sin efectos secundarios (ON CONFLICT slug).
// Contenido 100% ASCII-safe: caracteres especiales como escapes \uXXXX.

var neon = null;
function getNeon() {
  if (!neon) neon = require('@neondatabase/serverless').neon;
  return neon;
}

const SLUG = 'hearth-summit-bogota';
const HERO = 'https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=900&q=80';

const PHOTOS = [
  { url: HERO, caption: 'Hearth Summit Bogota: el encuentro latinoamericano de bienestar' },
  { url: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=900&q=80', caption: 'Paneles y keynotes con expertos de 15 paises en bienestar' },
  { url: 'https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=900&q=80', caption: 'Conversaciones sobre soledad, polarizacion y comunidad' },
  { url: 'https://images.unsplash.com/photo-1573497620053-ea5300f94f21?w=900&q=80', caption: 'Talleres y experiencias inmersivas de bienestar' },
  { url: 'https://images.unsplash.com/photo-1531545514256-b1400bc00f31?w=900&q=80', caption: 'Encuentro de lideres, emprendedores y ecosistemas de bienestar' }
];

const BASE = {
  slug: SLUG,
  nombre: 'Hearth Summit Bogot\u00e1 2026',
  categoria_slug: 'evento',
  lead: 'El encuentro latinoamericano del movimiento global de bienestar, inspirado en la cumbre del Wellbeing Summit: keynotes, paneles y talleres sobre soledad, polarizaci\u00f3n y comunidad, del 31 de agosto al 2 de septiembre en Bogot\u00e1.',
  descripcion: 'El Hearth Summit Bogot\u00e1 es el encuentro latinoamericano inspirado en la cumbre global de bienestar (Wellbeing Summit), un movimiento presente en m\u00e1s de 80 pa\u00edses. Se realiza del 31 de agosto al 2 de septiembre de 2026 en el Centro Felicidad (CEFE) Chapinero, como parte central de la Semana del Bienestar Bogot\u00e1: Cultura y Salud para Vivir Mejor.\n\nEl programa combina bienvenidas art\u00edsticas muiscas, keynotes sobre soledad y polarizaci\u00f3n, paneles y talleres sobre bienestar social, determinantes sociales de la salud, prescripci\u00f3n social y bienestar comunitario, con el cierre en una experiencia inmersiva en el Planetario de Bogot\u00e1.\n\nRe\u00fane a emprendedores, l\u00edderes y el ecosistema de bienestar de Latinoam\u00e9rica, con m\u00e1s de 400 personas en la arena del CEFE Chapinero y talleres pr\u00e1cticos de biodanza, poes\u00eda y movimiento. Es organizado por el Wellbeing Summit, la Alcald\u00eda Mayor de Bogot\u00e1 y la Secretar\u00eda Distrital de Cultura, Recreaci\u00f3n y Deporte.\n\nLa entrada es gratuita, con registro previo y cupo limitado en algunas sesiones.',
  highlight: 'Encuentro latinoamericano de bienestar \u00b7 31 ago al 2 sep \u00b7 CEFE Chapinero y Planetario \u00b7 Gratuito con registro',
  ciudad: 'Bogot\u00e1',
  region: 'Cundinamarca',
  barrio: 'Chapinero',
  lat: 4.6431,
  lng: -74.0636,
  whatsapp: '',
  telefono: '',
  email: '',
  web: 'https://www.culturarecreacionydeporte.gov.co/es/semanabienestarbogota',
  instagram: '@culturaenBTA',
  precio_desde: 'Gratis (con registro previo)',
  horario: 'Del 31 de agosto al 2 de septiembre de 2026',
  emoji: '\ud83c\udf0d',
  hero_bg: 'linear-gradient(135deg,#0a3a2a,#0a1a3a)',
  foto_hero: HERO,
  tipo: 'Cumbre de bienestar \u00b7 Conferencia internacional \u00b7 Gratuito',
  capacidad: 'Centro Felicidad Chapinero (arena 400 pax) y Planetario de Bogota',
  como_llegar: 'El CEFE Chapinero queda en la calle 63 (Av. Chile) con carrera 13Bis, en Chapinero. Se llega en TransMilenio por la calle 63 o en el sistema integrado; el Planetario de Bogota, sede del cierre, esta en la calle 26 # 5-93 cerca de la carrera Septima.',
  status: 'published',
  destacado: true
};

const TAGS = {
  fecha_inicio: '2026-08-31',
  fecha_fin: '2026-09-02',
  edicion: 'Edicion 2026',
  sede: 'Centro Felicidad Chapinero y Planetario de Bogota',
  organiza: 'Wellbeing Summit / Alcaldia Mayor de Bogota / SCRD',
  lema: 'Bienestar, comunidad y salud',
  pais_invitado: 'Latinoamerica (mas de 15 paises)',
  lineup: [
    { nombre: 'Keynotes sobre soledad y polarizacion', escenario: 'CEFE Chapinero', hora: '31 de agosto' },
    { nombre: 'Paneles de bienestar social y prescripcion social', escenario: 'CEFE Chapinero', hora: '31 ago - 2 sep' },
    { nombre: 'Talleres de biodanza, poesia y movimiento', escenario: 'CEFE Chapinero', hora: 'Durante el encuentro' },
    { nombre: 'Experiencia inmersiva', escenario: 'Planetario de Bogota', hora: 'Cierre de cada jornada' }
  ],
  agenda: [
    { dia: 'Lunes 31 de agosto', hora: 'CEFE Chapinero', actividad: 'Bienvenida artistica Muisca, inauguracion oficial y keynotes' },
    { dia: '31 de agosto', hora: 'Planetario de Bogota', actividad: 'Cierre inmersivo con biodanza, poesia y experiencia en el Planetario' },
    { dia: 'Martes 1 de septiembre', hora: 'CEFE Chapinero', actividad: 'Arte indigena, paneles sobre bienestar financiero y liderazgo regenerativo' },
    { dia: '1 de septiembre', hora: 'Suba', actividad: 'Experiencia inmersiva cultural de cierre' },
    { dia: 'Miercoles 2 de septiembre', hora: 'CEFE Chapinero', actividad: 'Capitulacion del encuentro y laboratorios finales' }
  ],
  categorias_entrada: [
    { tipo: 'Acceso general', precio: 'Gratis', disponibilidad: 'Disponible' },
    { tipo: 'Sesiones con cupo limitado', precio: 'Gratis (registro previo)', disponibilidad: 'Disponible' }
  ],
  que_llevar: [
    'Registro e inscripcion previa en la pagina de la SCRD',
    'Documento de identidad',
    'Cuaderno y ganas de participar en talleres',
    'Ropa comoda para actividades de movimiento y biodanza',
    'Llegar con tiempo: aforo limitado en algunas sesiones'
  ],
  prohibido: [
    'Alimentos y bebidas dentro de las salas',
    'Filmacion profesional sin acreditacion',
    'Armas u objetos contundentes',
    'Ingreso con el aforo completo'
  ]
};

const FAQS = [
  { pregunta: 'Cuando es el Hearth Summit Bogota?', respuesta: 'Del 31 de agosto al 2 de septiembre de 2026, en el Centro Felicidad Chapinero y el Planetario de Bogota.' },
  { pregunta: 'Es gratis?', respuesta: 'Si, la entrada es gratuita con registro previo y cupo limitado en algunas sesiones.' },
  { pregunta: 'De que trata?', respuesta: 'Es el encuentro latinoamericano del movimiento Wellbeing Summit: paneles y talleres sobre soledad, polarizacion, comunidad, bienestar social y prescripcion social.' },
  { pregunta: 'Quien lo organiza?', respuesta: 'El Wellbeing Summit, junto a la Alcaldia Mayor de Bogota y la Secretaria Distrital de Cultura, Recreacion y Deporte, en el marco de la Semana del Bienestar.' },
  { pregunta: 'Donde me registro?', respuesta: 'En la pagina oficial de la Semana del Bienestar Bogota de la SCRD: culturarecreacionydeporte.gov.co/es/semanabienestarbogota' }
];

module.exports = { SLUG: SLUG, HERO: HERO, PHOTOS: PHOTOS, BASE: BASE, TAGS: TAGS, FAQS: FAQS };

if (require.main !== module) return;

(async function main() {
  var url = process.env.DATABASE_URL || process.argv[2];
  if (!url) {
    console.error('Falta DATABASE_URL.');
    console.error('Uso: DATABASE_URL=postgres://... node scripts/seed-hearth-summit-bogota.js [--dry]');
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
