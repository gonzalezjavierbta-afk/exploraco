// scripts/seed-festival-de-verano-bogota.js
// Crea (o actualiza) la pagina dinamica festival-de-verano-bogota.html con
// los datos de la edicion 29 del Festival de Verano 2026 de Bogota (IDRD),
// replicando el patron de scripts/seed-rock-al-parque.js (categoria evento).
//
// Uso:
//   DATABASE_URL=postgres://... node scripts/seed-festival-de-verano-bogota.js --dry
//   DATABASE_URL=postgres://... node scripts/seed-festival-de-verano-bogota.js
//
// Idempotente: re-ejecutable sin efectos secundarios (ON CONFLICT slug).
// Contenido 100% ASCII-safe: caracteres especiales como escapes \uXXXX.

var neon = null;
function getNeon() {
  if (!neon) neon = require('@neondatabase/serverless').neon;
  return neon;
}

const SLUG = 'festival-de-verano-bogota';
const HERO = 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=900&q=80';

const PHOTOS = [
  { url: HERO, caption: 'Festival de Verano: publico multitudinario en los eventos al aire libre' },
  { url: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=900&q=80', caption: 'Conciertos gratuitos y energia festiva en los parques de Bogota' },
  { url: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=900&q=80', caption: 'Actividad fisica, recreacion y deporte para toda la familia' },
  { url: 'https://images.unsplash.com/photo-1453928582365-b6ad33cbcf64?w=900&q=80', caption: 'Competencias deportivas nacionales e internacionales en la ciudad' },
  { url: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=900&q=80', caption: 'Los parques y escenarios publicos son los protagonistas del festival' }
];

const BASE = {
  slug: SLUG,
  nombre: 'Festival de Verano 2026',
  categoria_slug: 'evento',
  lead: 'La edicion 29 del evento gratuito mas grande de America Latina: mas de 60 actividades deportivas, recreativas, culturales y de grandes espectaculos del 31 de julio al 31 de agosto de 2026, en toda Bogota.',
  descripcion: 'El Festival de Verano 2026, organizado por el Instituto Distrital de Recreacion y Deporte (IDRD) con la Alcaldia Mayor de Bogota, celebra su edicion numero 29 del 31 de julio al 31 de agosto de 2026, con mas de 60 eventos y actividades gratuitas en parques, escenarios deportivos y espacios publicos de toda la ciudad.\n\nLa programacion se divide en cuatro categorias: Academica, Deportiva, Grandes Eventos y Recreacion y Actividad Fisica. En esta edicion, Mexico es el pais invitado, y la agenda coincide con la celebracion de los 488 anos de Bogota.\n\nEntre los eventos destacados estan la Parada del Circuito Sudamericano de Voleibol de Playa (31 de julio al 9 de agosto en el Parque Recreodeportivo El Salitre, con 32 equipos), la Copa Internacional de Taekwondo Ciudad de Bogota 2026, el Festival de Cometas, la Lunada de Verano, el Record Tren Humano en Patines, Sube Monserrate, el Festival de Porrismo, el Ciclopaseo Nocturno, el Red Bull Moto Urbano y el Strongman Bogota, junto a torneos nacionales e internacionales de tenis, softbol y balonmano playa.\n\nEl gran Conciertazo de Verano se realizo el 1 de agosto en la Plaza de Eventos del Parque Metropolitano Simon Bolivar con artistas como Calibre 50, Luister La Voz, Proyecto A y Jhon Onofre, en una celebracion gratuita que combino musica, entretenimiento y el ambiente festivo del festival.\n\nEl IDRD invita a la ciudadania a consultar la programacion completa en el sitio web del Festival de Verano 2026, las redes sociales de la entidad y la aplicacion movil Vive IDRD, donde se publica informacion sobre inscripciones, horarios y condiciones de acceso de cada actividad. La mayoria de las actividades son gratuitas y de libre acceso.',
  highlight: 'Mas de 60 actividades gratuitas del 31 jul al 31 ago \u00b7 Deporte, recreacion, cultura y Conciertazo \u00b7 Mexico pais invitado',
  ciudad: 'Bogot\u00e1',
  region: 'Cundinamarca',
  barrio: 'Toda la ciudad',
  lat: 4.658056,
  lng: -74.093889,
  whatsapp: '',
  telefono: '',
  email: '',
  web: 'https://www.idrd.gov.co/festivaldeverano',
  instagram: '@idrdbogota',
  precio_desde: 'Gratis',
  horario: 'Del 31 de julio al 31 de agosto de 2026, variados horarios',
  emoji: '\ud83c\udfdc',
  hero_bg: 'linear-gradient(135deg,#0a1a0a,#1a2a1a)',
  foto_hero: HERO,
  tipo: 'Festival de verano \u00b7 Deporte y recreacion \u00b7 Gratuito',
  capacidad: 'Multiples escenarios en toda la ciudad',
  como_llegar: 'El festival se realiza en multiples escenarios de Bogota: Parque Simon Bolivar (Plaza de Eventos), Parque Recreodeportivo El Salitre, Monserrate, escenarios deportivos y espacios publicos de las localidades. Cada actividad publica su punto de encuentro en la programacion del IDRD y la app Vive IDRD.',
  status: 'published',
  destacado: true
};

const TAGS = {
  fecha_inicio: '2026-07-31',
  fecha_fin: '2026-08-31',
  edicion: 'Edicion 29',
  sede: 'Parques y escenarios publicos de Bogota',
  organiza: 'IDRD con la Alcaldia Mayor de Bogota',
  lema: 'Deporte, recreacion, cultura y grandes espectaculos',
  pais_invitado: 'Mexico',
  lineup: [
    { nombre: 'Conciertazo de Verano', escenario: 'Plaza de Eventos, Parque Simon Bolivar', hora: '1 de agosto' },
    { nombre: 'Calibre 50', escenario: 'Plaza de Eventos', hora: '1 de agosto' },
    { nombre: 'Luister La Voz', escenario: 'Plaza de Eventos', hora: '1 de agosto' },
    { nombre: 'Proyecto A', escenario: 'Plaza de Eventos', hora: '1 de agosto' },
    { nombre: 'Jhon Onofre', escenario: 'Plaza de Eventos', hora: '1 de agosto' }
  ],
  agenda: [
    { dia: '31 de julio al 9 de agosto', hora: 'Parque El Salitre', actividad: 'Parada del Circuito Sudamericano de Voleibol de Playa (32 equipos)' },
    { dia: '1 de agosto', hora: 'Parque Simon Bolivar', actividad: 'Conciertazo de Verano con Calibre 50, Luister La Voz, Proyecto A y Jhon Onofre' },
    { dia: '6 de agosto', hora: 'Toda la ciudad', actividad: 'Celebracion de los 488 anos de Bogota' },
    { dia: '16 de agosto', hora: 'Vias de la ciudad', actividad: 'Record Tren Humano en Patines' },
    { dia: 'Durante agosto', hora: 'Escenarios deportivos', actividad: 'Copa Internacional de Taekwondo, tenis, softbol y balonmano playa' },
    { dia: 'Durante agosto', hora: 'Parques y espacios publicos', actividad: 'Festival de Cometas, Lunada de Verano, Sube Monserrate, Ciclopaseo Nocturno, Red Bull Moto Urbano y Strongman' }
  ],
  categorias_entrada: [
    { tipo: 'Actividades de libre acceso', precio: 'Gratis', disponibilidad: 'Disponible' },
    { tipo: 'Actividades con inscripcion previa', precio: 'Gratis (cupo limitado)', disponibilidad: 'Disponible' }
  ],
  que_llevar: [
    'Ropa comoda y calzado deportivo',
    'Protector solar y gorra',
    'Agua',
    'Documento de identidad',
    'Consulta la programacion en la app Vive IDRD'
  ],
  prohibido: [
    'Ingreso de bebidas alcoholicas en escenarios deportivos',
    'Objetos contundentes o punzantes',
    'Bicicletas o patines dentro de areas de espectaculos',
    'Armas de cualquier tipo'
  ]
};

const FAQS = [
  { pregunta: 'Cuando es el Festival de Verano 2026?', respuesta: 'Del 31 de julio al 31 de agosto de 2026, en su edicion numero 29.' },
  { pregunta: 'Es gratis?', respuesta: 'Si, la mayoria de las mas de 60 actividades son gratuitas y de libre acceso; algunas requieren inscripcion previa.' },
  { pregunta: 'Donde se realiza?', respuesta: 'En parques, escenarios deportivos y espacios publicos de toda Bogota. El gran Conciertazo de Verano fue en la Plaza de Eventos del Parque Simon Bolivar.' },
  { pregunta: 'Quien lo organiza?', respuesta: 'El Instituto Distrital de Recreacion y Deporte (IDRD) con la Alcaldia Mayor de Bogota. En 2026, Mexico es el pais invitado.' },
  { pregunta: 'Donde consulto la programacion?', respuesta: 'En el sitio web del Festival de Verano 2026 (idrd.gov.co/festivaldeverano), las redes del IDRD y la aplicacion movil Vive IDRD.' }
];

module.exports = { SLUG: SLUG, HERO: HERO, PHOTOS: PHOTOS, BASE: BASE, TAGS: TAGS, FAQS: FAQS };

if (require.main !== module) return;

(async function main() {
  var url = process.env.DATABASE_URL || process.argv[2];
  if (!url) {
    console.error('Falta DATABASE_URL.');
    console.error('Uso: DATABASE_URL=postgres://... node scripts/seed-festival-de-verano-bogota.js [--dry]');
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