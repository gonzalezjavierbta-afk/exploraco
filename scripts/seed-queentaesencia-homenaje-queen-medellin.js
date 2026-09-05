// scripts/seed-queentaesencia-homenaje-queen-medellin.js
// Datos de Queentaesencia, tributo a Queen, en Trilogia Live Bar (Barrio Colombia,
// Medellin), viernes 11 de septiembre de 2026. Categoria evento.
// Patron seed + loader + smoke de Fase 9.
// Uso:
//   DATABASE_URL=postgres://... node scripts/seed-queentaesencia-homenaje-queen-medellin.js --dry
//   DATABASE_URL=postgres://... node scripts/seed-queentaesencia-homenaje-queen-medellin.js
// Idempotente (ON CONFLICT slug). 100% ASCII-safe.

var neon = null;
function getNeon() {
  if (!neon) neon = require('@neondatabase/serverless').neon;
  return neon;
}

const SLUG = 'queentaesencia-homenaje-queen-medellin';
const HERO = 'https://images.unsplash.com/photo-1483412033650-1015ddeb83d1?w=900&q=80';

const PHOTOS = [
  { url: HERO, caption: 'Guitarra electrica para la noche Queen en Medellin' },
  { url: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=900&q=80', caption: 'El publico canta Bohemian Rhapsody a todo pulmon' },
  { url: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=900&q=80', caption: 'Luces de Trilogia Live Bar' },
  { url: 'https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?w=900&q=80', caption: 'Queen y sus clasicos: We Will Rock You, Somebody to Love' }
];

const BASE = {
  slug: SLUG,
  nombre: 'Queentaesencia: Tributo a Queen en Trilog\u00eda Bar Medell\u00edn',
  categoria_slug: 'evento',
  lead: 'El tributo que recorre el legado de Queen se toma Trilog\u00eda Live Bar el viernes 11 de septiembre: puertas 6:00 pm, show 6:30 pm y cover de $50.000.',
  descripcion: 'Queentaesencia recrea la energia de Freddie Mercury y la maquina sonora de Queen sobre el escenario de Trilog\u00eda Live Bar, en el Barrio Colombia de Medell\u00edn, este viernes 11 de septiembre.\n\nLa agenda arranca con la apertura de puertas a las 6:00 pm y el show musical a las 6:30 pm, con repertorio que recorre cl\u00e1sicos como Bohemian Rhapsody, We Are the Champions, Somebody to Love y Don\u2019t Stop Me Now.\n\nEl cover es de $50.000 por persona. Tras el tributo, la noche del viernes contin\u00faa con el grupo de la casa en el formato del bar. La reserva se gestiona a trav\u00e9s de la plataforma de boleter\u00eda de Trilog\u00eda Bar.',
  highlight: 'Viernes 11 sep \u00b7 cover $50.000 \u00b7 puertas 6:00 pm',
  ciudad: 'Medell\u00edn',
  region: 'Antioquia',
  barrio: 'Barrio Colombia',
  lat: 6.22564,
  lng: -75.57228,
  whatsapp: '',
  telefono: '',
  email: '',
  web: 'https://trilogiabar.com',
  instagram: 'trilogiabar',
  precio_desde: '$50.000 por persona',
  horario: 'Puertas 6:00 pm - show 6:30 pm',
  emoji: '\ud83c\udfb8',
  hero_bg: 'linear-gradient(135deg,#111,#7a1a1a)',
  foto_hero: HERO,
  tipo: 'Tributo musical en vivo',
  capacidad: 'Trilog\u00eda Live Bar (hasta 290 personas)',
  como_llegar: 'Trilog\u00eda Live Bar queda en el Barrio Colombia, cerca al sector de la calle 43G con carrera 23. Se llega f\u00e1cil desde el centro de Medell\u00edn o El Poblado en Metro (L\u00ednea A o B) y 5 minutos caminando, o en taxi/plataforma. La zona tiene parqueaderos cerca al bar.',
  status: 'published',
  destacado: true
};

const TAGS = {
  fecha_inicio: '2026-09-11',
  fecha_fin: '2026-09-11',
  edicion: 'Noche Queen - Tributo Queentaesencia',
  sede: 'Trilog\u00eda Live Bar, Barrio Colombia, Medell\u00edn',
  organiza: 'Trilog\u00eda Live Bar',
  lema: 'Bohemian Rhapsody a un paso de tu tarima',
  lineup: [
    { nombre: 'Queentaesencia (tributo a Queen)', escenario: 'Escenario principal' }
  ],
  agenda: [
    { dia: 'Viernes 11 de septiembre', hora: '6:00 pm', actividad: 'Apertura de puertas' },
    { dia: 'Viernes 11 de septiembre', hora: '6:30 pm', actividad: 'Inicio del show tributo a Queen' },
    { dia: 'Viernes 11 de septiembre', hora: '9:00 pm', actividad: 'La noche sigue con el grupo de la casa' }
  ],
  categorias_entrada: [
    { tipo: 'Cover general', precio: '$50.000 por persona', disponibilidad: 'Disponible' }
  ],
  que_llevar: [
    'Reserva de boleter\u00eda de trilogiabar.com',
    'Documento de identidad',
    'Ganas de cantar los cl\u00e1sicos de Queen'
  ],
  prohibido: [
    'Ingreso de bebidas del exterior',
    'C\u00e1maras de grabaci\u00f3n profesional',
    'Objetos contundentes'
  ]
};

const FAQS = [
  { pregunta: '\u00bfCu\u00e1ndo es el tributo a Queen en Medell\u00edn?', respuesta: 'Viernes 11 de septiembre de 2026 en Trilog\u00eda Live Bar. Puertas 6:00 pm, show 6:30 pm.' },
  { pregunta: '\u00bfCu\u00e1nto cuesta la entrada?', respuesta: 'El cover es de $50.000 por persona y la reserva se hace por trilogiabar.com.' },
  { pregunta: '\u00bfQu\u00e9 canciones van a sonar?', respuesta: 'El repertorio recorre cl\u00e1sicos de Queen: Bohemian Rhapsody, We Are the Champions, Somebody to Love y Don\u2019t Stop Me Now, entre otros.' },
  { pregunta: '\u00bfD\u00f3nde queda el bar?', respuesta: 'En el Barrio Colombia de Medell\u00edn, junto a la calle 43G, a pocos minutos del centro de la ciudad.' },
  { pregunta: '\u00bfQu\u00e9 pasa despu\u00e9s del tributo?', respuesta: 'La noche del viernes contin\u00faa en el mismo bar con la m\u00fasica del grupo de la casa.' }
];

module.exports = { SLUG: SLUG, HERO: HERO, PHOTOS: PHOTOS, BASE: BASE, TAGS: TAGS, FAQS: FAQS };

if (require.main !== module) return;

(async function main() {
  var url = process.env.DATABASE_URL || process.argv[2];
  if (!url) {
    console.error('Falta DATABASE_URL.');
    console.error('Uso: DATABASE_URL=postgres://... node scripts/seed-queentaesencia-homenaje-queen-medellin.js [--dry]');
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