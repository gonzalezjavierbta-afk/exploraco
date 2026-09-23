// scripts/seed-herbivoro-vegano-chapinero.js
// Crea (o actualiza) la pagina dinamica herbivoro-vegano-chapinero.html con
// los datos de Herbivoro - Cocina Vegana (Chapinero Alto, Bogota),
// replicando el patron de scripts/seed-origen-bistro-bogota.js (categoria
// comida, upsert completo, contenido ASCII-safe).
//
// Uso:
//   DATABASE_URL=postgres://... node scripts/seed-herbivoro-vegano-chapinero.js --dry
//   DATABASE_URL=postgres://... node scripts/seed-herbivoro-vegano-chapinero.js
//
// Idempotente: re-ejecutable sin efectos secundarios (ON CONFLICT slug).

var neon = null;
function getNeon() {
  if (!neon) neon = require('@neondatabase/serverless').neon;
  return neon;
}

const SLUG = 'herbivoro-vegano-chapinero';
const HERO = 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/af/Vegan_Burger_%285841255378%29.jpg/960px-Vegan_Burger_%285841255378%29.jpg';

const PHOTOS = [
  { url: HERO, caption: 'Hamburguesa vegana artesanal, especialidad de la casa' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/97/Vegan_pizza_at_Pizza_Luc%C3%A9.jpg/960px-Vegan_pizza_at_Pizza_Luc%C3%A9.jpg', caption: 'Pizza artesanal de masa madre con quesos vegetales' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/71/Nachos_with_sour_cream%2C_salsa_and_guacamole.jpg/960px-Nachos_with_sour_cream%2C_salsa_and_guacamole.jpg', caption: 'Nachos supremos con guacamole y no-queso' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/a/a5/Milkshake_3.jpg', caption: 'Malteada con leche de avena y galleta' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/Chapinero%2C_Bogot%C3%A1%2C_Bogota%2C_Colombia_-_panoramio_-_aalozadag.jpg/960px-Chapinero%2C_Bogot%C3%A1%2C_Bogota%2C_Colombia_-_panoramio_-_aalozadag.jpg', caption: 'Chapinero Alto, el barrio joven y alternativo que rodea al local' }
];

const BASE = {
  slug: SLUG,
  nombre: 'Herb\u00edvoro - Cocina Vegana',
  categoria_slug: 'comida',
  lead: 'Cocina confort y comida r\u00e1pida artesanal 100% vegana en Chapinero Alto.',
  descripcion: 'Herb\u00edvoro naci\u00f3 con la misi\u00f3n de demostrar que la comida vegana puede ser abundante, sabrosa y muy divertida. Especializados en burgers, pizzas artesanales de masa madre y tacos cargados de sabor.\n\nUbicado en la vibrante zona de Chapinero Alto, es el punto de encuentro preferido por la juventud alternativa de Bogot\u00e1.\n\nDestacan sus carnes vegetales elaboradas a base de seit\u00e1n y prote\u00edna de arveja con recetas secretas de la casa.',
  highlight: 'Comfort food 100% vegano \u00b7 Burgers y pizzas artesanales \u00b7 Chapinero Alto',
  ciudad: 'Bogot\u00e1',
  region: 'Cundinamarca',
  barrio: 'Chapinero Alto',
  lat: 4.6421,
  lng: -74.0612,
  whatsapp: '',
  telefono: '',
  email: '',
  web: 'https://herbivoro.com',
  instagram: '@herbivoro_cocinavegana',
  precio_desde: 'Burgers desde $26.000',
  horario: 'Mar-Dom 12:00 PM - 9:30 PM \u00b7 Lunes cerrado',
  emoji: '\ud83c\udf54',
  hero_bg: 'linear-gradient(135deg, #78281f 0%, #111111 100%)',
  foto_hero: HERO,
  tipo: 'Comfort Food \u00b7 Vegano',
  capacidad: '35 comensales',
  como_llegar: 'Transversal 6 # 56-35 (cerca a la Universidad de La Salle)',
  status: 'published',
  destacado: false
};

const TAGS = {
  tipo_comida: 'Comida R\u00e1pida Artesanal Vegana',
  cocina: 'Urbana / Comfort Food',
  ambiente: 'Joven, alternativo y urbano',
  precio_promedio: '$35.000 - $50.000 por persona',
  terraza: 'No',
  reservas: 'No',
  domicilio: 'Si',
  menu_destacado: [
    { nombre: 'Burger Monstruo de Seit\u00e1n', precio: '$31.000', badge: 'popular' },
    { nombre: 'Pizza de Queso de Almendras y Champi\u00f1ones', precio: '$35.000' },
    { nombre: 'Nachos Supremos con Guacamole y No-Queso', precio: '$28.000', badge: 'popular' },
    { nombre: 'Malteada de Galleta OREO y Leche de Avena', precio: '$16.000' }
  ],
  opciones_dieta: ['100% Vegano', 'Opciones Sin Gluten'],
  horario_detallado: {
    Lunes:     { estado: 'Cerrado' },
    Martes:    { abre: '12:00', cierra: '21:30' },
    Miercoles: { abre: '12:00', cierra: '21:30' },
    Jueves:    { abre: '12:00', cierra: '21:30' },
    Viernes:   { abre: '12:00', cierra: '22:00' },
    Sabado:    { abre: '12:00', cierra: '22:00' },
    Domingo:   { abre: '12:00', cierra: '20:00' }
  },
  domicilio_plataformas: ['Rappi']
};

const FAQS = [
  { pregunta: '\u00bfHacen el seit\u00e1n en el restaurante?', respuesta: 'S\u00ed, todas las carnes vegetales son formuladas y elaboradas artesanalmente en su cocina.' }
];

module.exports = { SLUG: SLUG, HERO: HERO, PHOTOS: PHOTOS, BASE: BASE, TAGS: TAGS, FAQS: FAQS };

if (require.main !== module) return;

(async function main() {
  var url = process.env.DATABASE_URL || process.argv[2];
  if (!url) {
    console.error('Falta DATABASE_URL.');
    console.error('Uso: DATABASE_URL=postgres://... node scripts/seed-herbivoro-vegano-chapinero.js [--dry]');
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
