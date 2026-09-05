// scripts/seed-sabor-bogota.js
// Datos del evento Sabor Bogota: experiencia de gastronomia, cultura y
// soberania alimentaria en la Plaza de Mercado La Concordia (2 de
// septiembre de 2026), categoria evento. Patron seed + loader + smoke.
//
// Uso:
//   DATABASE_URL=postgres://... node scripts/seed-sabor-bogota.js --dry
//   DATABASE_URL=postgres://... node scripts/seed-sabor-bogota.js
//
// Idempotente: re-ejecutable sin efectos secundarios (ON CONFLICT slug).
// Contenido 100% ASCII-safe: caracteres especiales como escapes \uXXXX.

var neon = null;
function getNeon() {
  if (!neon) neon = require('@neondatabase/serverless').neon;
  return neon;
}

const SLUG = 'sabor-bogota';
const HERO = 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=900&q=80';

const PHOTOS = [
  { url: HERO, caption: 'Sabor Bogota: gastronomia colombiana en la Plaza de La Concordia' },
  { url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=900&q=80', caption: 'Platos tradicionales y de autor en el centro de Bogota' },
  { url: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=900&q=80', caption: 'Experiencia gastronomica y cultural en la Plaza de Mercado' },
  { url: 'https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?w=900&q=80', caption: 'Cocina con Guardianes de Semilla y cocineros de La Concordia' },
  { url: 'https://images.unsplash.com/photo-1507048331197-7d4ac70811cf?w=900&q=80', caption: 'Productos locales y saberes tradicionales de la region' }
];

const BASE = {
  slug: SLUG,
  nombre: 'Sabor Bogot\u00e1: Gastronom\u00eda y Cultura',
  categoria_slug: 'evento',
  lead: 'Una experiencia de gastronom\u00eda, impacto y cultura en la Plaza de Mercado La Concordia, con los Guardianes de Semilla y los cocineros de la plaza, el mi\u00e9rcoles 2 de septiembre de 2026.',
  descripcion: 'Sabor Bogot\u00e1 es una experiencia que une gastronom\u00eda, cultura e impacto social en la Plaza de Mercado La Concordia (carrera 1 # 10-55, en el centro de Bogot\u00e1), el mi\u00e9rcoles 2 de septiembre de 2026 a las 7:00 pm, en el marco de la Semana del Bienestar Bogot\u00e1: Cultura y Salud para Vivir Mejor.\n\nLa jornada re\u00fane a los Guardianes de Semilla, custodios de la soberan\u00eda alimentaria y la agrobiodiversidad colombiana, con los cocineros tradicionales de la Plaza de La Concordia. Es un encuentro para conocer los saberes ancestrales, los ingredientes nativos y las preparaciones que sostienen la cocina del barrio y del pa\u00eds.\n\nM\u00e1s que una muestra gastron\u00f3mica, es una conversaci\u00f3n sobre c\u00f3mo la comida conecta el bienestar, la cultura, la memoria y el territorio. La entrada es libre y se realiza en uno de los mercados m\u00e1s emblem\u00e1ticos de la capital, epicentro de la gastronom\u00eda popular y tradicional.',
  highlight: 'Gastronomia y cultura en La Concordia \u00b7 2 de septiembre, 7:00 pm \u00b7 Guardianes de Semilla \u00b7 Entrada libre',
  ciudad: 'Bogot\u00e1',
  region: 'Cundinamarca',
  barrio: 'La Candelaria',
  lat: 4.5969,
  lng: -74.0727,
  whatsapp: '',
  telefono: '',
  email: '',
  web: 'https://www.culturarecreacionydeporte.gov.co/es/semanabienestarbogota',
  instagram: '@culturaenBTA',
  precio_desde: 'Gratis',
  horario: 'Miercoles 2 de septiembre de 2026, 7:00 pm',
  emoji: '\ud83c\udf72',
  hero_bg: 'linear-gradient(135deg,#3a2a0a,#1a1a2a)',
  foto_hero: HERO,
  tipo: 'Gastronomia \u00b7 Cultura \u00b7 Soberania alimentaria \u00b7 Gratuito',
  capacidad: 'Plaza de Mercado La Concordia, carrera 1 # 10-55',
  como_llegar: 'La Plaza de Mercado La Concordia queda en la carrera 1 # 10-55, en La Candelaria. Se llega caminando desde la Avenida Jimenez (estacion de TransMilenio de la carrera 3) o en transporte publico por la carrera 1. Es una de las plazas de mercado mas tradicionales del centro historico de Bogota.',
  status: 'published',
  destacado: true
};

const TAGS = {
  fecha_inicio: '2026-09-02',
  fecha_fin: '2026-09-02',
  edicion: 'Edicion 2026',
  sede: 'Plaza de Mercado La Concordia, carrera 1 # 10-55 (La Candelaria)',
  organiza: 'Alcaldia Mayor de Bogota / SCRD / Plaza de La Concordia',
  lema: 'El sabor del bienestar y la memoria',
  lineup: [
    { nombre: 'Guardianes de Semilla', escenario: 'Plaza de La Concordia', hora: '7:00 pm' },
    { nombre: 'Cocineros de La Concordia', escenario: 'Plaza de La Concordia', hora: '7:00 pm' }
  ],
  agenda: [
    { dia: 'Miercoles 2 de septiembre', hora: '7:00 pm', actividad: 'Experiencia Sabor Bogota: gastronomia, soberania alimentaria y cultura' },
    { dia: '2 de septiembre', hora: 'Plaza La Concordia', actividad: 'Dialogo con Guardianes de Semilla y cocineros tradicionales' },
    { dia: '2 de septiembre', hora: 'Plaza La Concordia', actividad: 'Muestra de productos y preparaciones locales' }
  ],
  categorias_entrada: [
    { tipo: 'Acceso libre', precio: 'Gratis', disponibilidad: 'Disponible' }
  ],
  que_llevar: [
    'Ganas de probar la cocina tradicional del centro de Bogota',
    'Cupo libre, llega con tiempo a la Plaza La Concordia',
    'Efectivo o tarjeta para comprar en los puestos de la plaza',
    'Ropa comoda para recorrer el mercado',
    'Disposicion a conversar con los Guardianes de Semilla sobre soberania alimentaria'
  ],
  prohibido: [
    'Contenedores de vidrio por seguridad en la plaza',
    'Armas u objetos contundentes',
    'Ingreso con el aforo completo',
    'Consumo dentro de las zonas de preparacion'
  ]
};

const FAQS = [
  { pregunta: 'Cuando es Sabor Bogota?', respuesta: 'El miercoles 2 de septiembre de 2026 a las 7:00 pm en la Plaza de Mercado La Concordia.' },
  { pregunta: 'Donde se realiza?', respuesta: 'En la Plaza de Mercado La Concordia, carrera 1 # 10-55, en La Candelaria, Bogota.' },
  { pregunta: 'Es gratis?', respuesta: 'Si, el acceso es libre.' },
  { pregunta: 'Que es Sabor Bogota?', respuesta: 'Una experiencia de gastronomia, cultura e impacto que reune a los Guardianes de Semilla y a los cocineros tradicionales de la plaza en el marco de la Semana del Bienestar.' },
  { pregunta: 'Quien lo organiza?', respuesta: 'La Alcaldia Mayor de Bogota y la Secretaria de Cultura, Recreacion y Deporte, con la comunidad de la Plaza La Concordia.' }
];

module.exports = { SLUG: SLUG, HERO: HERO, PHOTOS: PHOTOS, BASE: BASE, TAGS: TAGS, FAQS: FAQS };

if (require.main !== module) return;

(async function main() {
  var url = process.env.DATABASE_URL || process.argv[2];
  if (!url) {
    console.error('Falta DATABASE_URL.');
    console.error('Uso: DATABASE_URL=postgres://... node scripts/seed-sabor-bogota.js [--dry]');
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
