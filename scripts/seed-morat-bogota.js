// scripts/seed-morat-bogota.js
// Crea (o actualiza) la pagina dinamica morat-bogota.html con los datos del
// concierto de Morat en Bogota (Ya Es Manana World Tour, Movistar Arena),
// replicando el patron de scripts/seed-rock-al-parque.js (categoria evento).
//
// Uso:
//   DATABASE_URL=postgres://... node scripts/seed-morat-bogota.js --dry
//   DATABASE_URL=postgres://... node scripts/seed-morat-bogota.js
//
// Idempotente: re-ejecutable sin efectos secundarios (ON CONFLICT slug).
// Contenido 100% ASCII-safe: caracteres especiales como escapes \uXXXX.

var neon = null;
function getNeon() {
  if (!neon) neon = require('@neondatabase/serverless').neon;
  return neon;
}

const SLUG = 'morat-bogota';
const HERO = 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=900&q=80';

const PHOTOS = [
  { url: HERO, caption: 'Morat en concierto: la banda bogotana de pop-folk ante miles de fans' },
  { url: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=900&q=80', caption: 'Luces y ambiente de arena llena durante la gira' },
  { url: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=900&q=80', caption: 'El publico corea cada cancion de principio a fin' },
  { url: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=900&q=80', caption: 'Noche de musica en vivo en el Movistar Arena' },
  { url: 'https://images.unsplash.com/photo-1531058020387-3be344556be6?w=900&q=80', caption: 'Concierto multitudinario en Bogota' }
];

const BASE = {
  slug: SLUG,
  nombre: 'Morat en Bogota: Ya Es Manana World Tour',
  categoria_slug: 'evento',
  lead: 'La banda bogotana Morat regresa a casa con seis conciertos en el Movistar Arena como parte de su gira mundial: del 14 al 23 de agosto de 2026, con Casa Morat y varias fechas agotadas.',
  descripcion: 'Morat, la banda de pop-folk bogotana mas exitosa de la ultima decada, regresa a su ciudad natal con el concierto mas ambicioso de su carrera: seis presentaciones en el Movistar Arena dentro del Ya Es Manana World Tour, que se realizan el 14, 15, 16, 21, 22 y 23 de agosto de 2026.\n\nLas tres primeras funciones (14, 15 y 16 de agosto) agotaron su boleteria en tiempo record, lo que llevo a la banda a sumar tres fechas adicionales (21, 22 y 23 de agosto) para responder a la alta demanda. La gira encadena 24 conciertos con entradas agotadas en Latinoamerica y Espana, y es el arranque de una etapa que llevara a Morat por Chile, Argentina, Barcelona, Pamplona, Valencia, Sevilla y Madrid durante septiembre y octubre de 2026.\n\nEl show celebra el momento mas alto de la carrera del grupo: en 2025 ganaron su primer Latin Grammy al mejor album pop/rock por Ya es manana, cerraron la gira de estadios Asuntos pendientes y fueron confirmados en el cartel del Festival Coachella 2026. Para Morat, tocar en Bogota es distinto a tocar en cualquier otro lugar: es la ciudad que los vio nacer y este concierto es el regalo para quienes han vivido la ciudad junto a ellos.\n\nAdemas de los conciertos, la banda presenta Casa Morat, una experiencia inmersiva abierta del 14 al 23 de agosto que permite a los fanaticos recorrer el universo creativo del grupo antes de cada show.\n\nLas puertas abren antes de las 9:00 pm, hora en la que inicia el espectaculo. La edad minima es de 8 anos acompanados y 16 anos sin acompanamiento. La boleteria se vende exclusivamente por los canales oficiales (Tu Boleta); se recomienda evitar reventa y verificar la disponibilidad de las fechas del 21 al 23 de agosto, que aun cuentan con boletas.',
  highlight: '6 conciertos en el Movistar Arena (14 al 23 de agosto) + Casa Morat, experiencia inmersiva. Primer Latin Grammy 2025 por Ya es manana',
  ciudad: 'Bogot\u00e1',
  region: 'Cundinamarca',
  barrio: 'El Camp\u00edn',
  lat: 4.6652,
  lng: -74.0839,
  whatsapp: '',
  telefono: '',
  email: '',
  web: 'https://movistararena.co/evento/morat-yem-world-tour-ya-es-manana/',
  instagram: '@morat',
  precio_desde: 'Boleteria por Tu Boleta (funciones 21-23 de agosto con disponibilidad)',
  horario: 'Puertas y show desde las 9:00 pm',
  emoji: '\ud83c\udfb8',
  hero_bg: 'linear-gradient(135deg,#0a1a2a,#1a2a3a)',
  foto_hero: HERO,
  tipo: 'Concierto \u00b7 Pop-folk \u00b7 Gira mundial',
  capacidad: 'Movistar Arena hasta 14.000 personas',
  como_llegar: 'Movistar Arena: avenida NQS con avenida Jose Celestino Mutis (El Campin). TransMilenio: estacion Movistar Arena (troncal Norte-Quito-Sur). Hay parqueaderos cerca del escenario; se recomienda llegar con anticipacion por el alto flujo de publico.',
  status: 'published',
  destacado: true
};

const TAGS = {
  fecha_inicio: '2026-08-14',
  fecha_fin: '2026-08-23',
  edicion: 'Ya Es Manana World Tour',
  sede: 'Movistar Arena, Bogota',
  organiza: 'Morat / Movistar Arena',
  lema: 'Seis funciones en casa: 14, 15, 16, 21, 22 y 23 de agosto',
  lineup: [
    { nombre: 'Morat', escenario: 'Escenario principal', hora: '9:00 pm' }
  ],
  agenda: [
    { dia: 'Viernes 14 de agosto', hora: '9:00 pm', actividad: 'Concierto 1 (agotado)' },
    { dia: 'Sabado 15 de agosto', hora: '9:00 pm', actividad: 'Concierto 2 (agotado)' },
    { dia: 'Domingo 16 de agosto', hora: '9:00 pm', actividad: 'Concierto 3 (agotado)' },
    { dia: 'Viernes 21 de agosto', hora: '9:00 pm', actividad: 'Concierto 4' },
    { dia: 'Sabado 22 de agosto', hora: '9:00 pm', actividad: 'Concierto 5' },
    { dia: 'Domingo 23 de agosto', hora: '9:00 pm', actividad: 'Concierto 6 (cierre en Bogota)' },
    { dia: '14 al 23 de agosto', hora: 'Antes de cada show', actividad: 'Casa Morat: experiencia inmersiva' }
  ],
  categorias_entrada: [
    { tipo: 'Entradas 14-16 de agosto', precio: 'Agotado', disponibilidad: 'Agotado' },
    { tipo: 'Entradas 21-23 de agosto', precio: 'Via Tu Boleta', disponibilidad: 'Disponible' }
  ],
  que_llevar: [
    'Documento de identidad',
    'Boleteria oficial (Tu Boleta)',
    'Abrigo: las noches de Bogota son frias',
    'Llegar con anticipacion por el flujo de publico'
  ],
  prohibido: [
    'Camaras profesionales o de video',
    'Bebidas y alimentos externos',
    'Armas de cualquier tipo',
    'Objetos contundentes o punzantes'
  ]
};

const FAQS = [
  { pregunta: 'Cuando son los conciertos de Morat en Bogota?', respuesta: 'Seis funciones en el Movistar Arena: 14, 15, 16, 21, 22 y 23 de agosto de 2026, con show a las 9:00 pm.' },
  { pregunta: 'Hay entradas disponibles?', respuesta: 'Las funciones del 14 al 16 de agosto estan agotadas. Las del 21, 22 y 23 de agosto mantienen disponibilidad en los canales oficiales (Tu Boleta).' },
  { pregunta: 'Que es Casa Morat?', respuesta: 'Una experiencia inmersiva abierta del 14 al 23 de agosto que permite recorrer el universo creativo de la banda antes de cada show.' },
  { pregunta: 'Donde queda el Movistar Arena?', respuesta: 'En la avenida NQS con avenida Jose Celestino Mutis (sector El Campin), Bogota.' },
  { pregunta: 'Cual es la edad minima?', respuesta: '8 anos acompanados y 16 anos sin acompanamiento.' }
];

module.exports = { SLUG: SLUG, HERO: HERO, PHOTOS: PHOTOS, BASE: BASE, TAGS: TAGS, FAQS: FAQS };

if (require.main !== module) return;

(async function main() {
  var url = process.env.DATABASE_URL || process.argv[2];
  if (!url) {
    console.error('Falta DATABASE_URL.');
    console.error('Uso: DATABASE_URL=postgres://... node scripts/seed-morat-bogota.js [--dry]');
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