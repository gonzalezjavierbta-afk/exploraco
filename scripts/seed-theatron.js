// scripts/seed-theatron.js
// Crea (o actualiza) la pagina dinamica theatron.html con los datos de
// ficha-theatron.md, replicando EXACTAMENTE lo que guardaria el formulario
// admin.html (CATEGORY_TAG_FIELDS/CATEGORY_TAG_LISTS sitio, _buildTagsObj/
// _placeToAPI). Patron de scripts/seed-museo-del-oro.js con upsert completo.
//
// Rating: NO se siembran resenas ni se hardcodea rating. La pagina queda
// con rating/contador en 0 hasta que lleguen interacciones reales
// (ADR-008: api/interacciones.js recalcula AVG/COUNT dinamicamente).
//
// Uso:
//   DATABASE_URL=postgres://... node scripts/seed-theatron.js --dry
//   DATABASE_URL=postgres://... node scripts/seed-theatron.js
//
// Idempotente: re-ejecutable sin efectos secundarios (ON CONFLICT slug).

var neon = null;
function getNeon() {
  if (!neon) neon = require('@neondatabase/serverless').neon;
  return neon;
}

const SLUG = 'theatron';
const HERO = 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/Zona_rosa%28Bogot%C3%A1%29.jpg/960px-Zona_rosa%28Bogot%C3%A1%29.jpg';

const PHOTOS = [
  { url: HERO, caption: 'Zona Rosa de Bogot\u00e1, zona cercana al epicentro nocturno de Chapinero' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f8/Bogot%C3%A1_Chapinero_de_noche.JPG/960px-Bogot%C3%A1_Chapinero_de_noche.JPG', caption: 'Chapinero de noche, escenario del Chapigay' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/58/Bogota_Chapinero_calle_63.JPG/960px-Bogota_Chapinero_calle_63.JPG', caption: 'Calle 63 en Chapinero, eje de la vida nocturna' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/Bogot%C3%A1_Iglesia_de_Nuestra_Se%C3%B1ora_de_Lourdes_en_Chapinero.JPG/960px-Bogot%C3%A1_Iglesia_de_Nuestra_Se%C3%B1ora_de_Lourdes_en_Chapinero.JPG', caption: 'Iglesia de Lourdes, icono del barrio' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Bogot%C3%A1_Parque_de_la_93.JPG/960px-Bogot%C3%A1_Parque_de_la_93.JPG', caption: 'Parque de la 93, otro corazon nocturno de la ciudad' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5d/Bogota_bus_Transmilenio_avenida_Caracas_calle_26.JPG/960px-Bogota_bus_Transmilenio_avenida_Caracas_calle_26.JPG', caption: 'TransMilenio en la Av. Caracas, la forma de llegar a Chapinero' }
];

const BASE = {
  slug: SLUG,
  nombre: 'Theatron',
  categoria_slug: 'sitio',
  lead: 'El megaclub m\u00e1s grande de Latinoam\u00e9rica y epicentro del Chapigay: 20 salas, m\u00e1s de 5.000 personas de capacidad y la fiesta m\u00e1s inclusiva de Bogot\u00e1 en un antiguo teatro de la calle 58.',
  descripcion: 'Theatron es uno de los clubes m\u00e1s grandes del mundo y el coraz\u00f3n de la escena LGBTQ+ de Bogot\u00e1. Inaugurado en 2002 en un antiguo teatro de Chapinero, la calle 58 se transform\u00f3 en el epicentro del llamado "Chapigay", un eje de bares y discotecas alrededor de su esquina. Con 20 salas tem\u00e1ticas (Theatron, Teatrino, Templo, El Muro, Eva, Musiclab, Plaza Rosa, Metro, Beerlin Bar, \u00c9poca, La Cantina, Palma, Bar\u00fa, Lotus, La Capilla, Subthe 58, Caixa, Los J*tos, Glow Garden y SkyTop), capacidad de 5.000 a 7.000 personas y shows de drag en vivo los s\u00e1bados, ofrece de todo: del pop y reggaet\u00f3n al techno y el house. Fue reconocido en el ranking World\u2019s 100 Best Clubs 2024 (#68). El cover es de 30.000 COP antes de las 10PM y 50.000 despu\u00e9s. Abre jueves de 9PM a 5AM, y viernes y s\u00e1bados en doble jornada (mediod\u00eda-tarde y noche). Cuenta con sala exclusiva para mujeres.',
  highlight: '20 salas tem\u00e1ticas, shows drag en vivo, capacidad para m\u00e1s de 5.000 personas y el sello de uno de los mejores clubes del mundo en 2024',
  ciudad: 'Bogot\u00e1',
  region: 'Cundinamarca',
  barrio: 'Chapinero (Chapigay)',
  lat: 4.64509,
  lng: -74.0639,
  whatsapp: '',
  telefono: '+57 1 2356879',
  email: '',
  web: 'https://portaltheatron.co',
  instagram: '@theatronbogota',
  precio_desde: 'Desde $30.000 (antes de las 10PM)',
  horario: 'Jue 9PM-5AM; Vie-Sab doble jornada (mediodia-tarde y 9PM-5AM)',
  emoji: '\ud83c\udf7f',
  hero_bg: '#7f1d1d',
  foto_hero: HERO,
  tipo: 'Megaclub LGBTQ+ \u00b7 Discoteca multiformato \u00b7 20 salas',
  capacidad: '5000',
  como_llegar: 'TransMilenio: estaciones "Calle 57" o "Flores" (Av. Caracas) y caminar hacia la calle 58 con carrera 10. Taxi o app: Calle 58 Bis No. 10-32. El "Chapigay" es el eje nocturno de la zona.',
  status: 'published',
  destacado: true
};

const TAGS = {
  tipo_actividad: 'Megaclub LGBTQ+ / discoteca multiformato',
  dificultad: 'F\u00e1cil',
  dificultad_desc: '20 salas distribuidas en varios pisos del antiguo teatro; hay ascensores y rampas, aunque la movilidad entre salas implica subir escaleras. La experiencia completa puede tomar 3-5 horas.',
  duracion: '3-5 horas',
  altitud: '2600',
  temporada: ['Todo el a\u00f1o', 'Fines de semana con mayor afluencia', 'Jueves de noches tem\u00e1ticas'],
  precio_entrada: 'Cover 30.000 COP antes de las 10PM y 50.000 despu\u00e9s. Mesas VIP aparte.',
  distancia: 'Calle 58 con carrera 10, Chapinero; a pasos del eje "Chapigay". Estaciones TransMilenio cercanas: Calle 57 o Flores.',
  como_llegar: BASE.como_llegar,
  permisos: 'Mayor de edad (18+) con documento. No requiere reserva para entrada general; mesas VIP disponibles.',
  temporada_nota: 'Theatron abre todo el a\u00f1o. Jueves de 9PM a 5AM; viernes y s\u00e1bados en doble jornada (mediod\u00eda-tarde y noche). Shows drag los s\u00e1bados.',
  fauna_flora: JSON.stringify([
    { emoji: '\ud83c\udf7f', nombre: '20 salas tem\u00e1ticas', hecho: 'De la electr\u00f3nica al reggaet\u00f3n, cada sala tiene su propio mundo' },
    { emoji: '\ud83d\udc51', nombre: 'Shows drag', hecho: 'Los s\u00e1bados la escena drag colombiana brilla en el escenario central' },
    { emoji: '\ud83c\udfdb', nombre: 'Chapigay', hecho: 'La calle 58 se convirti\u00f3 en el eje LGBTQ+ m\u00e1s famoso de Bogot\u00e1' },
    { emoji: '\ud83c\udf1f', nombre: 'Glow Garden', hecho: 'Sala exterior con jard\u00edn luminoso para el amanecer' }
  ]),
  secretos: JSON.stringify([
    { icono: '\ud83d\udc51', titulo: 'Show drag del s\u00e1bado', texto: 'Es el show m\u00e1s esperado de la semana; llega temprano para buen lugar en la sala principal.', tag: 'Imperdible', tag_color: 'gold' },
    { icono: '\ud83c\udf7f', titulo: 'La sala para mujeres', texto: 'Theatron cuenta con una sala exclusiva para mujeres, una de sus apuestas m\u00e1s celebradas.', tag: '\u00danico', tag_color: 'blue' },
    { icono: '\ud83c\udfdb', titulo: 'El Chapigay', texto: 'La calle 58 alrededor de Theatron concentra bares y cafeter\u00edas inclusivos para la previa.', tag: 'Zona', tag_color: 'green' },
    { icono: '\ud83c\udf1f', titulo: 'SkyTop', texto: 'La terraza en el piso alto: aire libre y vista de Chapinero entre set y set.', tag: 'Cerca', tag_color: 'brown' }
  ]),
  regulaciones: 'Requiere ser mayor de 18 a\u00f1os, con documento de identidad v\u00e1lido. Cover de 30.000 COP antes de las 10PM y 50.000 despu\u00e9s. Pol\u00edtica de c\u00f3digo de vestimenta flexible; se recomienda look de fiesta. No se permite el ingreso de alimentos ni bebidas externas. Theatron promueve un ambiente inclusivo y de respeto; cero tolerancia a la discriminaci\u00f3n. Hay guardarropa; objetos grandes deben depositarse en consigna.',
  checklist_tip: 'Llega antes de las 10PM para pagar cover de 30.000 y aprovechar la apertura. Verifica el lineup de shows drag de los s\u00e1bados.',
  entradas: [
    { tipo: 'Cover antes de las 10PM', precio: '30000', incluye: 'Acceso a las 20 salas desde las 9PM', link: 'https://portaltheatron.co' },
    { tipo: 'Cover despues de las 10PM', precio: '50000', incluye: 'Acceso a las 20 salas en horario pico', link: 'https://portaltheatron.co' },
    { tipo: 'Mesa VIP', precio: 'variable', incluye: 'Mesa preferencial con servicio', link: 'https://portaltheatron.co' },
    { tipo: 'Show drag (sabados)', precio: 'incluido', incluye: 'Incluido con el cover del sabado', link: 'https://portaltheatron.co' }
  ],
  tours: [
    {
      nombre: 'Recorrido por las 20 salas',
      precio: '30000', precio_sub: 'cover antes de las 10PM',
      duracion: '3-5 horas', tipo_tour: 'Experiencia', idioma: 'Espa\u00f1ol', max_personas: 'Abierto',
      rating: '4.7', review_count: 380,
      descripcion: 'De Theatron a Glow Garden pasando por El Muro, Eva, Plaza Rosa y SkyTop: cada sala con su propio g\u00e9nero musical y est\u00e9tica.',
      incluye: ['Acceso a todas las salas', 'Diversidad de g\u00e9neros', 'Ambiente LGBTQ+'],
      no_incluye: ['Consumo', 'Transporte'],
      link_reserva: 'https://portaltheatron.co',
      featured: true
    },
    {
      nombre: 'Show drag y noche tem\u00e1tica',
      precio: 'variable', precio_sub: 'segun evento',
      duracion: '2-3 horas', tipo_tour: 'Experiencia', idioma: 'Espa\u00f1ol', max_personas: 'Abierto',
      rating: '4.9', review_count: 220,
      descripcion: 'Los s\u00e1bados Theatron presenta shows drag en vivo con las artistas m\u00e1s famosas de la escena bogotana.',
      incluye: ['Show drag', 'Acceso', 'Ambiente festivo'],
      no_incluye: ['Consumo', 'Transporte'],
      link_reserva: 'https://portaltheatron.co',
      featured: false
    },
    {
      nombre: 'Theatron + tour del Chapigay',
      precio: 'variable', precio_sub: 'ruta libre',
      duracion: 'Toda la noche', tipo_tour: 'Experiencia', idioma: 'Espa\u00f1ol', max_personas: 'Abierto',
      rating: '4.6', review_count: 150,
      descripcion: 'Recorre el eje de la calle 58: bares, discotecas y restaurantes alrededor de Theatron que forman el Chapigay.',
      incluye: ['Acceso', 'Gu\u00eda de zona', 'Ruta nocturna'],
      no_incluye: ['Consumo', 'Transporte'],
      link_reserva: 'https://portaltheatron.co',
      featured: false
    }
  ],
  equipamiento: [
    { item: 'Documento de identidad (mayor de 18)', prioridad: 'Obligatorio' },
    { item: 'Llegar antes de las 10PM para cover de 30.000', prioridad: 'Recomendado' },
    { item: 'Verificar programaci\u00f3n de shows drag', prioridad: 'Recomendado' },
    { item: 'Calzado c\u00f3modo para recorrer 20 salas', prioridad: 'Recomendado' },
    { item: 'Reservar mesa VIP para grupos', prioridad: 'Opcional' }
  ],
  itinerario: [
    { dia: 'Viernes', hora: '9:00 pm', titulo: 'Theatron y Teatrino', icono: '\ud83c\udf7f', detalle: 'Las salas principales: pop, house y electr\u00f3nica', tags: ['Principal'] },
    { dia: 'Viernes', hora: '11:00 pm', titulo: 'Plaza Rosa y El Muro', icono: '\ud83d\udc83', detalle: 'Ritmos latinos y reggaet\u00f3n en salas tem\u00e1ticas', tags: ['Tematica'] },
    { dia: 'Sabado', hora: '1:00 am', titulo: 'Show drag en vivo', icono: '\ud83d\udc51', detalle: 'Artistas drag de la escena bogotana', tags: ['Show'] },
    { dia: 'Sabado', hora: '3:30 am', titulo: 'Glow Garden y SkyTop', icono: '\ud83c\udf1f', detalle: 'Cierre en la sala exterior y la terraza', tags: ['Cierre'] }
  ],
  dificultad_tags: [
    { texto: '20 salas tem\u00e1ticas en varios pisos', apto: true },
    { texto: 'Ascensores y rampas disponibles', apto: true },
    { texto: 'Noche larga y multitud de miles de personas', apto: false },
    { texto: 'Cover m\u00e1s alto despu\u00e9s de las 10PM', apto: false },
    { texto: 'Requiere ser mayor de 18', apto: false }
  ],
  temporada_matriz: {
    Ene: 'ideal', Feb: 'ideal', Mar: 'ideal', Abr: 'posible', May: 'posible',
    Jun: 'ideal', Jul: 'ideal', Ago: 'ideal', Sep: 'posible', Oct: 'ideal', Nov: 'ideal', Dic: 'posible'
  }
};

const FAQS = [
  { pregunta: '\u00bfQu\u00e9 tan grande es Theatron?', respuesta: 'Tiene 20 salas tem\u00e1ticas y capacidad de 5.000 a 7.000 personas: uno de los clubes m\u00e1s grandes de Latinoam\u00e9rica.' },
  { pregunta: '\u00bfCu\u00e1nto cuesta la entrada?', respuesta: 'Cover de 30.000 COP antes de las 10PM y 50.000 despu\u00e9s. Las mesas VIP son aparte.' },
  { pregunta: '\u00bfEs un lugar solo para la comunidad LGBTQ+?', respuesta: 'Theatron es el epicentro del Chapigay y su ambiente es abiertamente inclusivo; todos son bienvenidos con respeto.' },
  { pregunta: '\u00bfQu\u00e9 d\u00edas abre?', respuesta: 'Jueves de 9PM a 5AM y viernes/s\u00e1bados en doble jornada (mediod\u00eda-tarde y noche). Los s\u00e1bados hay shows drag.' },
  { pregunta: '\u00bfD\u00f3nde queda?', respuesta: 'Calle 58 Bis No. 10-32, Chapinero. TransMilenio: Calle 57 o Flores, y caminar por la calle 58.' }
];

module.exports = { SLUG: SLUG, HERO: HERO, PHOTOS: PHOTOS, BASE: BASE, TAGS: TAGS, FAQS: FAQS };

if (require.main !== module) return;

(async function main() {
  var url = process.env.DATABASE_URL || process.argv[2];
  if (!url) {
    console.error('Falta DATABASE_URL.');
    console.error('Uso: DATABASE_URL=postgres://... node scripts/seed-theatron.js [--dry]');
    process.exit(1);
  }

  var sql = getNeon()(url);
  var dry = process.argv.indexOf('--dry') !== -1;

  var existing = await sql('SELECT id, slug FROM destinos WHERE slug=$1 LIMIT 1', [SLUG]);

  if (dry) {
    console.log('[dry-run] ' + (existing.length ? 'UPDATE (fila existe)' : 'INSERT (nueva fila)') + ' para slug=' + SLUG);
    console.log('[dry-run] base:\n' + JSON.stringify(BASE, null, 2));
    console.log('[dry-run] tags (' + Object.keys(TAGS).length + ' claves):\n' + JSON.stringify(TAGS, null, 2));
    console.log('[dry-run] fotos galer\u00eda: ' + PHOTOS.length + ' | faqs: ' + FAQS.length);
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

  // FAQs en destinos_detalles
  if (FAQS.length) {
    await sql(
      'INSERT INTO destinos_detalles (destino_id, faqs, creado_en) VALUES ($1,$2,NOW()) '
      + 'ON CONFLICT (destino_id) DO UPDATE SET faqs=EXCLUDED.faqs',
      [id, JSON.stringify(FAQS)]
    ).catch(function(){});
  }

  // Galer\u00eda en destinos_fotos (la hero es la foto 0)
  for (var i = 0; i < PHOTOS.length; i++) {
    var esHero = (i === 0);
    await sql(
      'INSERT INTO destinos_fotos (destino_id, url, caption, orden, es_hero, creado_en) '
      + 'VALUES ($1,$2,$3,$4,$5,NOW()) ON CONFLICT DO NOTHING',
      [id, PHOTOS[i].url, PHOTOS[i].caption, i, esHero]
    ).catch(function(){});
  }

  console.log('OK - faqs y ' + PHOTOS.length + ' fotos de galer\u00eda insertadas.');
  console.log('Verifica en: https://exploraco.co/' + SLUG + '.html (revisa sitemap y /api/destinos).');
})().catch(function(err) {
  console.error('ERROR:', err.message);
  process.exit(1);
});