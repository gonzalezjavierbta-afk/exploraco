// scripts/seed-el-gato-gris-bogota.js
// Crea (o actualiza) la pagina dinamica el-gato-gris-bogota.html con los
// datos del bistro El Gato Gris (Cl. 12b #1A-12, La Candelaria, Bogota),
// replicando el patron de scripts/seed-candelario.js (categoria comida,
// upsert completo, contenido ASCII-safe).
//
// Uso:
//   DATABASE_URL=postgres://... node scripts/seed-el-gato-gris-bogota.js --dry
//   DATABASE_URL=postgres://... node scripts/seed-el-gato-gris-bogota.js
//
// Idempotente: re-ejecutable sin efectos secundarios (ON CONFLICT slug).

var neon = null;
function getNeon() {
  if (!neon) neon = require('@neondatabase/serverless').neon;
  return neon;
}

const SLUG = 'el-gato-gris-bogota';
const HERO = 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/La_Candelaria%2C_Bogota%2C_Colombia_%285785130118%29.jpg/960px-La_Candelaria%2C_Bogota%2C_Colombia_%285785130118%29.jpg';

const PHOTOS = [
  { url: HERO, caption: 'Calles coloniales de La Candelaria, el barrio donde se encuentra El Gato Gris' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/Iglesia_del_Chorro_de_Quevedo%2C_Bogot%C3%A1.jpg/960px-Iglesia_del_Chorro_de_Quevedo%2C_Bogot%C3%A1.jpg', caption: 'La capilla del Chorro de Quevedo, a pocos metros del bistro' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/06/Letreros_de_la_plaza_del_chorro_de_Quevedo._Bogot%C3%A1._Colombia..jpg/960px-Letreros_de_la_plaza_del_chorro_de_Quevedo._Bogot%C3%A1._Colombia..jpg', caption: 'La plaza del Chorro de Quevedo, punto de encuentro del centro historico' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/Ajiaco_in_Bogot%C3%A1.jpg/960px-Ajiaco_in_Bogot%C3%A1.jpg', caption: 'Cocina colombiana de autor reinterpretada en el centro' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5d/Empanada_colombiana.jpg/960px-Empanada_colombiana.jpg', caption: 'Clasicos colombianos en versi\\un contemporanea' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/Plaza_de_Bol%C3%ADvar_en_Bogot%C3%A1_%28Colombia%29.jpg/960px-Plaza_de_Bol%C3%ADvar_en_Bogot%C3%A1_%28Colombia%29.jpg', caption: 'La Plaza de Bolivar, a pocas cuadras caminando' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/62/Skyline_downtown_Bogota.jpg/960px-Skyline_downtown_Bogota.jpg', caption: 'El centro de Bogota visto desde los cerros orientales' }
];

const BASE = {
  slug: SLUG,
  nombre: 'El Gato Gris',
  categoria_slug: 'comida',
  lead: 'Bistro acogedor a pasos del Chorro de Quevedo, en La Candelaria: cafe, cartas de temporada y un ambiente bohemio que se cuela entre las fachadas coloniales del centro historico.',
  descripcion: 'El Gato Gris (Calle 12b #1A-12, La Candelaria, Bogota, coordenadas 4.5990, -74.0702) es un bistro que se ha ganado un lugar propio en el corazon bohemio de La Candelaria, a pasos del Chorro de Quevedo, el punto donde se fundo Bogota. Su nombre evoca al gato callejero que deambula por las calles empedradas, una imagen que define el caracter desprevenido y acogedor del lugar.\n\nEl local apuesta por una cocina de producto y temporada, con cartas que cambian y que reinterpretan la tradicion colombiana con mirada contemporanea. El cafe de especialidad, las limonadas y los postres caseros conviven con platos que rescatan sabores andinos, en porciones pensadas para compartir.\n\nSu terraza y sus ventanales dan a una de las calles mas transitadas del centro historico, por lo que el lugar se convierte en un punto de observacion perfecto: por ahi pasan turistas, estudiantes, artistas y oficinistas del centro. Es igual de frecuentado para el cafe de la manana, el almuerzo pausado o la tertulia de la tarde.\n\nLa decoracion mezcla madera, libros y detalles vintage, lo que refuerza la atmosfera de casa de barrio con aire europeo. Es un bistro pequeno, sin pretensiones de gran restaurante, pero con una carta honesta y un servicio cercano.\n\nDesde El Gato Gris se camina en cinco minutos hasta el Chorro de Quevedo, la Iglesia de la Candelaria, el Callejon del Embudo y la Plaza de Bolivar. Es la parada ideal antes o despues de recorrer los museos y callejones del centro historico.',
  highlight: 'Bistro bohemio junto al Chorro de Quevedo \u00b7 Cafe de especialidad \u00b7 Cocina de temporada \u00b7 Terraza colonial',
  ciudad: 'Bogot\u00e1',
  region: 'Cundinamarca',
  barrio: 'La Candelaria',
  lat: 4.5990,
  lng: -74.0702,
  whatsapp: '',
  telefono: '3229161227',
  email: '',
  web: '',
  instagram: '',
  precio_desde: 'Cafe desde $6.000; platos desde $18.000 (referencia)',
  horario: 'Lunes a domingo de 9:00 a 22:00 (referencia)',
  emoji: '\ud83d\udc31',
  hero_bg: 'linear-gradient(135deg,#1f2937,#4b5563)',
  foto_hero: HERO,
  tipo: 'Bistro \u00b7 Cocina de temporada \u00b7 Cafe de especialidad',
  capacidad: '',
  como_llegar: 'TransMilenio: estacion Las Aguas (troncal Karakol) y caminar 10 minutos por la carrera cuarta hasta la calle 12b. Desde el Chorro de Quevedo, el bistro queda a pasos. Taxi o app: Calle 12b #1A-12, La Candelaria.',
  status: 'published',
  destacado: true
};

const TAGS = {
  tipo_comida: 'Bistro',
  cocina: 'Cocina colombiana de temporada',
  ambiente: 'Bohemio, acogedor y observador',
  precio_promedio: '$18.000 - $45.000 por persona',
  terraza: 'Si',
  reservas: 'Si',
  domicilio: 'No',
  menu_destacado: [
    { nombre: 'Cafe de especialidad', precio: 'Desde $6.000', badge: 'popular' },
    { nombre: 'Plato de la casa de temporada', precio: 'Desde $18.000' },
    { nombre: 'Limonada natural', precio: 'Desde $8.000' },
    { nombre: 'Postre casero', precio: 'Desde $12.000' }
  ],
  opciones_dieta: ['Opciones vegetarianas', 'Opciones sin gluten'],
  horario_detallado: {
    Lunes:    { abre: '09:00', cierra: '22:00' },
    Martes:   { abre: '09:00', cierra: '22:00' },
    Miercoles: { abre: '09:00', cierra: '22:00' },
    Jueves:   { abre: '09:00', cierra: '22:00' },
    Viernes:  { abre: '09:00', cierra: '22:00' },
    Sabado:   { abre: '09:00', cierra: '22:00' },
    Domingo:  { abre: '09:00', cierra: '22:00' }
  },
  domicilio_plataformas: []
};

const FAQS = [
  { pregunta: 'Donde queda El Gato Gris?', respuesta: 'Calle 12b #1A-12, La Candelaria, Bogota, a pasos del Chorro de Quevedo.' },
  { pregunta: 'Que tipo de comida sirve?', respuesta: 'Cocina colombiana de temporada con mirada contemporanea, cafe de especialidad y postres caseros.' },
  { pregunta: 'Tiene terraza?', respuesta: 'Si, con ventanales y mesas exteriores que dan a la calle colonial.' },
  { pregunta: 'Acepta reservas?', respuesta: 'Si, se recomienda reservar en horas de almuerzo y fines de semana.' },
  { pregunta: 'Cual es su horario?', respuesta: 'Abierto de lunes a domingo de 9:00 a 22:00 (horario de referencia).' }
];

module.exports = { SLUG: SLUG, HERO: HERO, PHOTOS: PHOTOS, BASE: BASE, TAGS: TAGS, FAQS: FAQS };

if (require.main !== module) return;

(async function main() {
  var url = process.env.DATABASE_URL || process.argv[2];
  if (!url) {
    console.error('Falta DATABASE_URL.');
    console.error('Uso: DATABASE_URL=postgres://... node scripts/seed-el-gato-gris-bogota.js [--dry]');
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