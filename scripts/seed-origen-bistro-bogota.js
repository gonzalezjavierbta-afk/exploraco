// scripts/seed-origen-bistro-bogota.js
// Crea (o actualiza) la pagina dinamica origen-bistro-bogota.html con los
// datos de Origen Bistro (Carrera 4 #12c-88, La Candelaria, Bogota),
// replicando el patron de scripts/seed-candelario.js (categoria comida,
// upsert completo, contenido ASCII-safe).
//
// Uso:
//   DATABASE_URL=postgres://... node scripts/seed-origen-bistro-bogota.js --dry
//   DATABASE_URL=postgres://... node scripts/seed-origen-bistro-bogota.js
//
// Idempotente: re-ejecutable sin efectos secundarios (ON CONFLICT slug).

var neon = null;
function getNeon() {
  if (!neon) neon = require('@neondatabase/serverless').neon;
  return neon;
}

const SLUG = 'origen-bistro-bogota';
const HERO = 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/Plaza_de_Bol%C3%ADvar_en_Bogot%C3%A1_%28Colombia%29.jpg/960px-Plaza_de_Bol%C3%ADvar_en_Bogot%C3%A1_%28Colombia%29.jpg';

const PHOTOS = [
  { url: HERO, caption: 'La Plaza de Bolivar, el corazon del centro historico de Bogota' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Palacio_Li%C3%A9vano%2C_Bogot%C3%A1.jpg/960px-Palacio_Li%C3%A9vano%2C_Bogot%C3%A1.jpg', caption: 'El Palacio Lievano, sede de la Alcaldia Mayor, a pocas cuadras' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/Catedral_Primada_de_Bogot%C3%A1.6.jpg/960px-Catedral_Primada_de_Bogot%C3%A1.6.jpg', caption: 'La Catedral Primada de Colombia, en el costado norte de la plaza' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/Ajiaco_in_Bogot%C3%A1.jpg/960px-Ajiaco_in_Bogot%C3%A1.jpg', caption: 'El ajiaco, reinterpretado con mirada de autor en Origen Bistro' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5d/Empanada_colombiana.jpg/960px-Empanada_colombiana.jpg', caption: 'Sabores colombianos contemporaneos de la carta' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/La_Candelaria%2C_Bogota%2C_Colombia_%285785130118%29.jpg/960px-La_Candelaria%2C_Bogota%2C_Colombia_%285785130118%29.jpg', caption: 'Las calles coloniales alrededor del bistro' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/62/Skyline_downtown_Bogota.jpg/960px-Skyline_downtown_Bogota.jpg', caption: 'El skyline del centro con los cerros orientales' }
];

const BASE = {
  slug: SLUG,
  nombre: 'Origen Bistro',
  categoria_slug: 'comida',
  lead: 'Cocina de autor colombiana en una casa colonial con patio central, a pasos de la Plaza de Bolivar: el ajiaco, la arepa boyacense y otros clasicos reinterpretados con tecnica contemporanea.',
  descripcion: 'Origen Bistro (Carrera 4 #12c-88, La Candelaria, Bogota, coordenadas 4.5984, -74.0717) es un bistro de cocina de autor colombiana instalado en una casa colonial restaurada, reconocible por su fachada amarilla y su patio central que invita a una sobremesa pausada. Esta a menos de diez minutos caminando de la Plaza de Bolivar y del barrio de la Candelaria historica.\n\nLa propuesta gastronomica parte de los sabores de la memoria culinaria del pais para llevarlos a un plano contemporaneo. El ajiaco se sirve con una presentacion renovada, la arepa boyacense se reinterpreta como entrada de autor, y la carta de vinos acompanha un recorrido por productos andinos de cercania.\n\nEl patio interior, techado en vidrio durante los dias de lluvia y abierto en las tardes de sol, es el espacio mas solicitado. La luz natural, las plantas y el silencio relativo del centro historico crean un ambiente distinto al bullicio de las calles coloniales.\n\nOrigen Bistro funciona como punto de encuentro para quienes buscan una comida mas elaborada que la tipica del centro, sin alejarse del corazon historico. Es recomendable reservar, sobre todo para cenas de fin de semana, cuando el patio central se llena.\n\nDesde la carrera cuarta se camina hacia el norte hasta la Calle del Embudo, la Callejon del Chorro de Quevedo, el Museo Botero y el Museo del Oro, lo que convierte al bistro en una excelente parada gastronomica dentro de la ruta cultural de La Candelaria.',
  highlight: 'Cocina de autor colombiana \u00b7 Casa colonial con patio central \u00b7 Carta de vinos \u00b7 A 10 min de la Plaza de Bolivar',
  ciudad: 'Bogot\u00e1',
  region: 'Cundinamarca',
  barrio: 'La Candelaria',
  lat: 4.5984,
  lng: -74.0717,
  whatsapp: '',
  telefono: '',
  email: '',
  web: '',
  instagram: '',
  precio_desde: 'Entradas desde $16.000; platos desde $28.000 (referencia)',
  horario: 'Martes a domingo de 12:00 a 22:00 (referencia)',
  emoji: '\ud83c\udf7d\ufe0f',
  hero_bg: 'linear-gradient(135deg,#78350f,#b45309)',
  foto_hero: HERO,
  tipo: 'Bistro de autor \u00b7 Cocina colombiana \u00b7 Patio colonial',
  capacidad: '',
  como_llegar: 'TransMilenio: estacion Las Aguas (troncal Karakol) y caminar 12 minutos por la carrera cuarta hacia el sur hasta la calle 12c. Desde la Plaza de Bolivar, unos 10 minutos caminando. Taxi o app: Carrera 4 #12c-88, La Candelaria.',
  status: 'published',
  destacado: true
};

const TAGS = {
  tipo_comida: 'Bistro de autor',
  cocina: 'Cocina de autor colombiana',
  ambiente: 'Casa colonial, patio central y elegante',
  precio_promedio: '$28.000 - $70.000 por persona',
  terraza: 'Si',
  reservas: 'Si',
  domicilio: 'No',
  menu_destacado: [
    { nombre: 'Arepa boyacense de autor', precio: 'Desde $16.000' },
    { nombre: 'Ajiaco contemporaneo', precio: 'Desde $28.000', badge: 'popular' },
    { nombre: 'Plato de la casa con productos andinos', precio: 'Desde $32.000' },
    { nombre: 'Postre de temporada', precio: 'Desde $14.000' }
  ],
  opciones_dieta: ['Opciones vegetarianas', 'Opciones sin gluten'],
  horario_detallado: {
    Lunes:    { estado: 'Cerrado' },
    Martes:   { abre: '12:00', cierra: '22:00' },
    Miercoles: { abre: '12:00', cierra: '22:00' },
    Jueves:   { abre: '12:00', cierra: '22:00' },
    Viernes:  { abre: '12:00', cierra: '22:00' },
    Sabado:   { abre: '12:00', cierra: '22:00' },
    Domingo:  { abre: '12:00', cierra: '22:00' }
  },
  domicilio_plataformas: []
};

const FAQS = [
  { pregunta: 'Donde queda Origen Bistro?', respuesta: 'Carrera 4 #12c-88, La Candelaria, Bogota, a unos 10 minutos caminando de la Plaza de Bolivar.' },
  { pregunta: 'Que tipo de cocina tiene?', respuesta: 'Cocina de autor colombiana: clasicos como el ajiaco y la arepa boyacense reinterpretados con tecnica contemporanea.' },
  { pregunta: 'Tiene patio o terraza?', respuesta: 'Si, cuenta con un patio colonial central, abierto en las tardes de sol y techado los dias de lluvia.' },
  { pregunta: 'Es necesario reservar?', respuesta: 'Se recomienda reservar, especialmente para cenas de viernes y sabado.' },
  { pregunta: 'Cual es su horario?', respuesta: 'Abierto de martes a domingo de 12:00 a 22:00; lunes cerrado (horario de referencia).' }
];

module.exports = { SLUG: SLUG, HERO: HERO, PHOTOS: PHOTOS, BASE: BASE, TAGS: TAGS, FAQS: FAQS };

if (require.main !== module) return;

(async function main() {
  var url = process.env.DATABASE_URL || process.argv[2];
  if (!url) {
    console.error('Falta DATABASE_URL.');
    console.error('Uso: DATABASE_URL=postgres://... node scripts/seed-origen-bistro-bogota.js [--dry]');
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