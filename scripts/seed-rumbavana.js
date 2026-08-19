// scripts/seed-rumbavana.js
// Crea (o actualiza) la pagina dinamica rumbavana.html con los datos
// de Rumbavana (Carrera 19A con 16, Bogota), discoteca salsa 33 anos,
// rumba calena en Bogota, siguiendo el patron de scripts/seed-quiebracanto.js.
//
// Uso:
//   DATABASE_URL=postgres://... node scripts/seed-rumbavana.js --dry
//   DATABASE_URL=postgres://... node scripts/seed-rumbavana.js

var neon = null;
function getNeon() {
  if (!neon) neon = require('@neondatabase/serverless').neon;
  return neon;
}

const SLUG = 'rumbavana';
const HERO = 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Plaza_de_Bol%C3%ADvar%2C_Bogot%C3%A1.jpg/1200px-Plaza_de_Bol%C3%ADvar%2C_Bogot%C3%A1.jpg';

const PHOTOS = [
  { url: HERO, caption: 'Plaza de Bolivar, corazon del centro donde late la rumba calena de Rumbavana' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/60/Bogota_-_Streets_at_night_009.jpg/960px-Bogota_-_Streets_at_night_009.jpg', caption: 'Calles del centro de Bogota de noche, ruta a Rumbavana' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fa/La_Macarena_panorama_norte_sur.JPG/960px-La_Macarena_panorama_norte_sur.JPG', caption: 'Panoramica del centro de Bogota desde La Macarena' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f8/Bogot%C3%A1_Chapinero_de_noche.JPG/960px-Bogot%C3%A1_Chapinero_de_noche.JPG', caption: 'Chapinero de noche, contraste con la rumba del centro' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/31/Bogot%C3%A1%2C_La_Candelaria%2C_2023-06_CN-01.jpg/960px-Bogot%C3%A1%2C_La_Candelaria%2C_2023-06_CN-01.jpg', caption: 'Calles empedradas de La Candelaria, camino a la 19A con 16' }
];

const BASE = {
  slug: SLUG,
  nombre: 'Rumbavana',
  categoria_slug: 'sitio',
  lead: 'Rumba calena en Bogota desde 1992 (33 anos): discoteca hermanos Soto en 19A con 16, salsa calena pura, Mie-Sab 20h-3AM.',
  descripcion: 'Rumbavana (Carrera 19A con Calle 16, Los Martires/Santa Fe, Bogota, coordenadas 4.6016, -74.0897) es la discoteca que trajo la rumba calena a Bogota. Fundada en 1992 por los hermanos Soto, lleva 33 anos siendo el embajador de la salsa del Pacifico en la capital. Aqui no suena salsa "de salon": suena salsa calena, la de Grupo Niche, Guayacan, Fruko, La Misma Gente, el sonido de la Feria de Cali transportado a la 19A con 16.\n\nEl espacio es una discoteca clasica: pista grande, sonido potente, barra amplia y el ambiente de rumba que no para. Abre de miercoles a sabados de 8:00 PM a 3:00 AM. Telefono: +57 319 493 37 17. Instagram: @rumbavana / @rumbavanasalsa. Web: rumbavanadiscoteca.wix.com/rumbavanad. Facebook: facebook.com/rumbavanasalsa.\n\nEl publico es una mezcla de calenos residentes en Bogota, bogotanos que aprendieron a bailar en la 19A, y visitantes que buscan la autentica salsa del Pacifico. No hay clases, no hay orquesta en vivo (salvo eventos especiales): hay DJs que saben programar una noche de salsa calena de principio a fin. El cover es variable segun la noche.',
  highlight: 'Desde 1992: rumba calena en Bogota, 33 anos salsa Pacifico en 19A con 16, Mie-Sab hasta 3 AM.',
  ciudad: 'Bogota',
  region: 'Cundinamarca',
  barrio: 'Los Martires (19A con 16)',
  lat: 4.6016153,
  lng: -74.0896631,
  whatsapp: '',
  telefono: '+57 319 493 37 17',
  email: '',
  web: 'https://rumbavanadiscoteca.wix.com/rumbavanad',
  instagram: '@rumbavana',
  precio_desde: 'Cover variable noche; consumo barra (cerveza, licores)',
  horario: 'Miercoles a sabados 20:00-3:00 (referencia)',
  emoji: '\ud83c\udf1f',
  hero_bg: '#7c1a1a',
  foto_hero: HERO,
  tipo: 'Discoteca salsa  -  Rumba calena  -  33 anos  -  Soto',
  capacidad: 'Discoteca, aforo grande',
  como_llegar: 'TransMilenio Museo del Oro o San Victorino + taxi 5 min a Cra 19A con Cl 16. Taxi directo: Cra 19A con Cl 16.',
  status: 'published',
  destacado: true
};

const TAGS = {
  tipo_actividad: 'Salsa bar',
  dificultad: 'Facil',
  dificultad_desc: 'Discoteca con pista grande a nivel; sonido potente. Requiere ser mayor de 18 anos. Zona centro (19A con 16): precaucion nocturna, taxi/app recomendado.',
  duracion: '4-6 horas',
  altitud: '2600',
  temporada: ['Todo el ano', 'Miercoles a sabados noche', 'Festivos y eventos especiales', 'Temporada de Feria de Cali (diciembre)'],
  precio_entrada: 'Cover variable segun noche/evento; consumo en barra.',
  distancia: 'Carrera 19A con Calle 16, Los Martires/Santa Fe. Cerca a TransMilenio Museo del Oro y San Victorino.',
  como_llegar: BASE.como_llegar,
  permisos: 'Mayor de 18 anos con documento de identidad valido.',
  temporada_nota: 'Miercoles a sabados 8PM-3AM. Diciembre (Feria de Cali) programacion especial. Verificar en @rumbavana / @rumbavanasalsa.',
  fauna_flora: JSON.stringify([
    { emoji: '\ud83c\udf1f', nombre: 'Salsa calena pura', hecho: 'Grupo Niche, Guayacan, Fruko, La Misma Gente, Piper Pimienta: el sonido de la Feria de Cali en Bogota' },
    { emoji: '\ud83c\udfa4', nombre: 'DJs especializados', hecho: 'No hay orquesta en vivo regular: DJs que saben armar una noche de salsa del Pacifico de principio a fin' },
    { emoji: '\ud83d\udc6b', nombre: 'Hermanos Soto, 33 anos', hecho: 'Fundadores y guardianes de la rumba calena en Bogota desde 1992' },
    { emoji: '\ud83d\udc83', nombre: 'Pista de discoteca', hecho: 'Espacio grande, sonido potente, para bailar en serio toda la noche' }
  ]),
  secretos: JSON.stringify([
    { icono: '\ud83c\udf1f', titulo: 'La Feria de Cali en Bogota', texto: 'En diciembre la programacion se vuelve loca: eventos especiales, invitados de Cali, rumba extendida. Es la epoca dorada de Rumbavana.', tag: 'Eventos', tag_color: 'blue' },
    { icono: '\ud83c\udfa4', titulo: 'Solo salsa calena', texto: 'Aqui no suena reggaeton, no suena crossover: solo Niche, Guayacan, Fruko, La Misma Gente, Son de Cali. Puristas bienvenidos.', tag: 'Musica', tag_color: 'green' },
    { icono: '\ud83d\udc6b', titulo: 'Los hermanos Soto', texto: 'Ellos son la institucion: 33 anos poniendo la misma musica, cuidando el mismo sonido, defendiendo la misma rumba.', tag: 'Historia', tag_color: 'brown' },
    { icono: '\ud83d\udc83', titulo: 'Pista para bailar duro', texto: 'La pista es grande y el sonido pega en el pecho. Llega con energia: aca se baila hasta el suelo.', tag: 'Zona', tag_color: 'gold' }
  ]),
  regulaciones: 'Mayor de 18 anos con documento de identidad valido. Solo miercoles a sabados. Zona centro: taxi/app recomendado de noche. No se permite ingreso de alimentos ni bebidas externas. Se reserva el derecho de admision.',
  checklist_tip: 'Taxi/app directo a la 19A con 16. Lleva efectivo para cover y consumo. No esperes orquesta: esperas el mejor DJ de salsa calena de Bogota.',
  entradas: [
    { tipo: 'Noche regular (Mie-Sab)', precio: 'variable', incluye: 'Acceso, pista, DJs salsa calena, barra', link: 'https://www.instagram.com/rumbavana/' },
    { tipo: 'Evento especial (Feria de Cali, invitados)', precio: 'variable', incluye: 'Segun programacion', link: 'https://www.instagram.com/rumbavana/' }
  ],
  tours: [
    {
      nombre: 'La rumba calena en Bogota',
      precio: 'Cover de la noche', precio_sub: 'variable',
      duracion: '5-7 horas', tipo_tour: 'Experiencia', idioma: 'Espanol', max_personas: 'Abierto',
      rating: '4.8', review_count: 67,
      descripcion: 'La experiencia Rumbavana: 33 anos de salsa del Pacifico, pista grande, sonido de discoteca y DJs que saben lo que ponen.',
      incluye: ['Acceso a la discoteca', 'DJs salsa calena', 'Pista grande', 'Sonido potente', 'Barra completa'],
      no_incluye: ['Bebidas', 'Transporte', 'Taxi/app a zona centro'],
      link_reserva: 'https://www.instagram.com/rumbavana/',
      featured: true
    },
    {
      nombre: 'Diciembre: Feria de Cali en la 19A',
      precio: 'Variable', precio_sub: 'eventos especiales',
      duracion: '6-8 horas', tipo_tour: 'Evento', idioma: 'Espanol', max_personas: 'Abierto',
      rating: '4.9', review_count: 23,
      descripcion: 'La temporada mas esperada: invitados de Cali, orquestas, rumba extendida y la 19A convertida en un pedazo de la Feria.',
      incluye: ['Acceso a eventos especiales', 'Invitados de Cali', 'Programacion extendida', 'Ambiente ferial'],
      no_incluye: ['Bebidas', 'Transporte'],
      link_reserva: 'https://www.instagram.com/rumbavana/',
      featured: false
    },
    {
      nombre: 'Ruta centro salsero: Rumbavana + Goce Pagano + Quiebracanto',
      precio: 'Variable', precio_sub: 'segun consumo en los 3',
      duracion: '5-6 horas', tipo_tour: 'Ruta', idioma: 'Espanol', max_personas: 'Grupos pequenos',
      rating: '4.7', review_count: 11,
      descripcion: 'Los 3 templos del centro: Rumbavana (calena, 1992), El Goce Pagano (intelectual, 1978), Quiebracanto (historia, 1979). Todos a 10-15 min en taxi.',
      incluye: ['Itinerario centro', 'Parada en 3 bares', 'Contexto salsa bogotana por zona'],
      no_incluye: ['Bebidas', 'Transporte (taxis entre bares)', 'Covers'],
      link_reserva: 'https://www.instagram.com/rumbavana/',
      featured: false
    }
  ],
  equipamiento: [
    { item: 'Documento de identidad (mayor de 18)', prioridad: 'Obligatorio' },
    { item: 'Efectivo para cover y consumo', prioridad: 'Recomendado' },
    { item: 'Taxi/app para ir y volver (zona centro)', prioridad: 'Recomendado' },
    { item: 'Calzado comodo para bailar toda la noche', prioridad: 'Recomendado' },
    { item: 'Energia para salsa calena rapida', prioridad: 'Recomendado' }
  ],
  itinerario: [
    { dia: 'Miercoles', hora: '8:00 pm', titulo: 'Apertura calena', icono: '\ud83c\udf1f', detalle: 'Primeros Niche y Guayacan, la pista se calienta', tags: ['Apertura'] },
    { dia: 'Viernes', hora: '10:00 pm', titulo: 'La rumba fuerte', icono: '\ud83d\udc83', detalle: 'Pista llena, salsa rapida, sonido en el pecho', tags: ['Rumba'] },
    { dia: 'Sabado', hora: '11:00 pm', titulo: 'Hasta las 3 AM', icono: '\ud83c\udfa4', detalle: 'Cierre con los clasicos de la Feria de Cali', tags: ['Cierre'] }
  ],
  dificultad_tags: [
    { texto: 'Discoteca con pista grande a nivel', apto: true },
    { texto: 'TransMilenio Museo del Oro / San Victorino cercano', apto: true },
    { texto: 'Zona centro requiere taxi/app nocturno', apto: false },
    { texto: 'Solo abre 4 noches/semana (Mie-Sab)', apto: false },
    { texto: 'Requiere ser mayor de 18', apto: false }
  ],
  temporada_matriz: {
    Ene: 'ideal', Feb: 'ideal', Mar: 'ideal', Abr: 'ideal', May: 'posible',
    Jun: 'ideal', Jul: 'ideal', Ago: 'ideal', Sep: 'ideal', Oct: 'ideal', Nov: 'ideal', Dic: 'ideal'
  }
};

const FAQS = [
  { pregunta: 'Que es Rumbavana?', respuesta: 'Discoteca de salsa calena en Bogota (Cra 19A con Cl 16), fundada en 1992 por los hermanos Soto, 33 anos trayendo el sonido de la Feria de Cali a la capital.' },
  { pregunta: 'Que dias abre?', respuesta: 'Miercoles a sabados de 8:00 PM a 3:00 AM. Domingos, lunes y martes cerrado. Diciembre programacion especial Feria de Cali.' },
  { pregunta: 'Que musica ponen?', respuesta: 'Solo salsa calena: Grupo Niche, Guayacan, Fruko, La Misma Gente, Piper Pimienta, Son de Cali. DJs especializados, no orquesta en vivo regular.' },
  { pregunta: 'Cuanto cuesta la entrada?', respuesta: 'Cover variable segun la noche/evento. Consumo en barra aparte. Verificar en @rumbavana.' },
  { pregunta: 'Cual es la edad minima?', respuesta: 'Mayor de 18 anos con documento de identidad valido.' },
  { pregunta: 'Como llegar?', respuesta: 'Taxi/app directo a Cra 19A con Cl 16. TransMilenio Museo del Oro o San Victorino + taxi 5 min. Zona centro: precaucion nocturna.' }
];

module.exports = { SLUG: SLUG, HERO: HERO, PHOTOS: PHOTOS, BASE: BASE, TAGS: TAGS, FAQS: FAQS };

if (require.main !== module) return;

(async function main() {
  var url = process.env.DATABASE_URL || process.argv[2];
  if (!url) {
    console.error('Falta DATABASE_URL.');
    console.error('Uso: DATABASE_URL=postgres://... node scripts/seed-rumbavana.js [--dry]');
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