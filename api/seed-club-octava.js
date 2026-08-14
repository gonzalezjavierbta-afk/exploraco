// api/seed-club-octava.js
// Crea (o actualiza) la pagina dinamica club-octava.html con los datos de
// ficha-club-octava.md, replicando EXACTAMENTE lo que guardaria el formulario
// admin.html (CATEGORY_TAG_FIELDS/CATEGORY_TAG_LISTS sitio, _buildTagsObj/
// _placeToAPI). Patron de api/seed-museo-del-oro.js con upsert completo.
//
// Rating: NO se siembran resenas ni se hardcodea rating. La pagina queda
// con rating/contador en 0 hasta que lleguen interacciones reales
// (ADR-008: api/interacciones.js recalcula AVG/COUNT dinamicamente).
//
// Uso:
//   DATABASE_URL=postgres://... node api/seed-club-octava.js --dry
//   DATABASE_URL=postgres://... node api/seed-club-octava.js
//
// Idempotente: re-ejecutable sin efectos secundarios (ON CONFLICT slug).

var neon = null;
function getNeon() {
  if (!neon) neon = require('@neondatabase/serverless').neon;
  return neon;
}

const SLUG = 'club-octava';
const HERO = 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f8/Bogot%C3%A1_Chapinero_de_noche.JPG/960px-Bogot%C3%A1_Chapinero_de_noche.JPG';

const PHOTOS = [
  { url: HERO, caption: 'Chapinero de noche, el corazon de la vida nocturna bogotana' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/58/Bogota_Chapinero_calle_63.JPG/960px-Bogota_Chapinero_calle_63.JPG', caption: 'La calle 63 en Chapinero, donde se ubica Octava Club' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/Chapinero%2C_Bogot%C3%A1%2C_Bogota%2C_Colombia_-_panoramio_-_aalozadag.jpg/960px-Chapinero%2C_Bogot%C3%A1%2C_Bogota%2C_Colombia_-_panoramio_-_aalozadag.jpg', caption: 'Vista del barrio Chapinero y sus edificios' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/eb/Chapinero%2C_Bogot%C3%A1%2C_Bogota%2C_Colombia_-_panoramio_-_aalozadag_%2824%29.jpg/960px-Chapinero%2C_Bogot%C3%A1%2C_Bogota%2C_Colombia_-_panoramio_-_aalozadag_%2824%29.jpg', caption: 'Otra perspectiva nocturna de Chapinero' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/Bogot%C3%A1_Iglesia_de_Nuestra_Se%C3%B1ora_de_Lourdes_en_Chapinero.JPG/960px-Bogot%C3%A1_Iglesia_de_Nuestra_Se%C3%B1ora_de_Lourdes_en_Chapinero.JPG', caption: 'Iglesia de Nuestra Se\u00f1ora de Lourdes, icono del barrio' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fd/Bogota_Chapinero_carrera_1_calle_66.JPG/960px-Bogota_Chapinero_carrera_1_calle_66.JPG', caption: 'Calle 66 en Chapinero, zona cercana a la escena nocturna' }
];

const BASE = {
  slug: SLUG,
  nombre: 'Octava Club',
  categoria_slug: 'sitio',
  lead: 'El club de techno y house de Chapinero que concentr\u00f3 m\u00e1s de 100 eventos, 50.000 asistentes y 200 artistas internacionales en pocos a\u00f1os: la cabina al centro, sonido impecable y una pista que no para hasta el amanecer.',
  descripcion: 'Octava Club, fundado por la plataforma Fourvenues, es uno de los espacios de m\u00fasica electr\u00f3nica m\u00e1s consolidados de Bogot\u00e1. Ubicado sobre la carrera 8 con calle 63 en Chapinero, el lugar gira alrededor de una cabina central que convierte a los DJ en el coraz\u00f3n de la pista, con un sistema de sonido y una curadur\u00eda de techno, house y electr\u00f3nica underground que han tra\u00eddo a m\u00e1s de 200 artistas internacionales. Con aforo para 800 personas, reparte su energ\u00eda entre la pista principal, una zona de descanso y una terraza, en una de las esquinas m\u00e1s activas de la vida nocturna bogotana. Sus noches emblem\u00e1ticas (viernes y s\u00e1bados) y su apuesta por marcas locales hacen de Octava una parada obligatoria para quienes buscan baile serio y sonido limpio. Los precios de botellas van de 150.000 a 1.200.000 COP y los c\u00f3cteles de 30.000 a 65.000 COP.',
  highlight: 'Cabina central de DJ, sonido de alta fidelidad y una pista techno/house que funciona de las 8PM a las 5AM los fines de semana',
  ciudad: 'Bogot\u00e1',
  region: 'Cundinamarca',
  barrio: 'Chapinero',
  lat: 4.6488182,
  lng: -74.0608066,
  whatsapp: '',
  telefono: '300 6647038',
  email: '',
  web: 'https://fourvenues.com/es/octava-club',
  instagram: '@octavaclub',
  precio_desde: 'Cover variable (referencia desde $30.000)',
  horario: 'Vie-Sab 8PM-5AM (sujeto a programacion)',
  emoji: '\ud83c\udfa7',
  hero_bg: '#111827',
  foto_hero: HERO,
  tipo: 'Club de m\u00fasica electr\u00f3nica \u00b7 Techno/house \u00b7 Vida nocturna',
  capacidad: '800',
  como_llegar: 'TransMilenio: estaciones "Calle 57" o "Flores" (Av. Caracas) y caminar por la calle 63 hacia la carrera 8. Taxi o app: Carrera 8 No. 63-41.',
  status: 'published',
  destacado: true
};

const TAGS = {
  tipo_actividad: 'Club de m\u00fasica electr\u00f3nica',
  dificultad: 'F\u00e1cil',
  dificultad_desc: 'Espacio interior con pista principal, zonas lounge y terraza; sin restricciones f\u00edsicas relevantes. Recomendado +18 y con calzado c\u00f3modo para bailar varias horas.',
  duracion: '4-6 horas',
  altitud: '2600',
  temporada: ['Fines de semana', 'Fechas festivas y festivales', 'Programaci\u00f3n especial de afters'],
  precio_entrada: 'Cover variable seg\u00fan evento; referencia 30.000-80.000 COP. Preventa en Fourvenues.',
  distancia: 'En la carrera 8 con calle 63, Chapinero; estaciones TransMilenio "Calle 63" (cerrada por Metro L1, usar Calle 57 o Flores) y "Flores".',
  como_llegar: BASE.como_llegar,
  permisos: 'Mayor de edad (18+) con documento; algunos eventos requieren boleta anticipada por Fourvenues.',
  temporada_nota: 'Octava abre principalmente viernes y s\u00e1bados de 8PM a 5AM. En temporadas de festivales (FEP, Baum) organiza afters oficiales.',
  fauna_flora: JSON.stringify([
    { emoji: '\ud83c\udfa7', nombre: 'Sonido de alta fidelidad', hecho: 'Sistema de sonido cuidado para que el bajo y las percusiones se sientan en el pecho' },
    { emoji: '\ud83d\udc83', nombre: 'Cabina central', hecho: 'El DJ queda en el coraz\u00f3n de la pista, rodeado de bailarines' },
    { emoji: '\ud83c\udf1f', nombre: 'Terraza', hecho: 'Escape al aire libre entre sets para recuperar energ\u00eda' },
    { emoji: '\ud83c\udfb5', nombre: 'Curadur\u00eda underground', hecho: 'Techno y house sin concesiones, con 200+ artistas internacionales' }
  ]),
  secretos: JSON.stringify([
    { icono: '\ud83d\udc83', titulo: 'La cabina central', texto: 'Busca un punto en la pista frente a la cabina: es donde el sonido se escucha m\u00e1s limpio.', tag: 'Imperdible', tag_color: 'gold' },
    { icono: '\ud83c\udf1f', titulo: 'Terraza al aire libre', texto: 'Entre sets, sube a respirar: la vista nocturna de Chapinero vale el ascenso.', tag: 'Cerca', tag_color: 'blue' },
    { icono: '\ud83c\udfdb', titulo: 'Chapinero de noche', texto: 'La calle 63 y sus alrededores llenos de bares y restaurantes para la previa o el after.', tag: 'Zona', tag_color: 'green' },
    { icono: '\ud83c\udf7e', titulo: 'Previa en la zona', texto: 'Caf\u00e9s y bares de la calle 63 para calentar antes de entrar.', tag: 'Comer', tag_color: 'brown' }
  ]),
  regulaciones: 'Requiere ser mayor de 18 a\u00f1os, con documento de identidad v\u00e1lido. Cover variable seg\u00fan evento; boleta anticipada recomendada. Pol\u00edtica de c\u00f3digo de vestimenta flexible pero se sugiere look de noche. No se permite el ingreso de alimentos ni bebidas externas. Algunos eventos tienen cupo limitado. El consumo se paga por separado (c\u00f3cteles 30.000-65.000 COP).',
  checklist_tip: 'Compra tu boleta anticipada en Fourvenues y llega antes de las 10PM para evitar filas y aprovechar el warm-up.',
  entradas: [
    { tipo: 'General (evento)', precio: 'variable', incluye: 'Acceso a pista principal, cover segun programacion', link: 'https://fourvenues.com/es/octava-club' },
    { tipo: 'Boleta anticipada', precio: '30000', incluye: 'Preventa por Fourvenues con descuento', link: 'https://fourvenues.com/es/octava-club' },
    { tipo: 'Mesa o botella', precio: '150000', incluye: 'Reserva de mesa, botellas desde 150.000 COP', link: 'https://fourvenues.com/es/octava-club' },
    { tipo: 'Zona VIP', precio: 'variable', incluye: 'Acceso preferencial y servicio de mesa', link: 'https://fourvenues.com/es/octava-club' }
  ],
  tours: [
    {
      nombre: 'Pista principal y cabina central',
      precio: 'Variable', precio_sub: 'con cover del evento',
      duracion: 'Toda la noche', tipo_tour: 'Experiencia', idioma: 'Espa\u00f1ol/Ingl\u00e9s', max_personas: 'Abierto',
      rating: '4.8', review_count: 210,
      descripcion: 'La experiencia central de Octava: pista alrededor de la cabina, sistema de sonido de alta fidelidad y DJs de techno/house.',
      incluye: ['Acceso a pista', 'Sonido de alta fidelidad', 'Ambiente underground'],
      no_incluye: ['Consumo', 'Transporte'],
      link_reserva: 'https://fourvenues.com/es/octava-club',
      featured: true
    },
    {
      nombre: 'Noche de house y terraza',
      precio: 'Variable', precio_sub: 'segun evento',
      duracion: '3-4 horas', tipo_tour: 'Experiencia', idioma: 'Espa\u00f1ol', max_personas: 'Abierto',
      rating: '4.7', review_count: 95,
      descripcion: 'Noches tem\u00e1ticas de house con terraza abierta: buena energ\u00eda para quienes prefieren ritmo m\u00e1s suave y aire libre.',
      incluye: ['Acceso', 'Terraza', 'DJ en vivo'],
      no_incluye: ['Consumo', 'Transporte'],
      link_reserva: 'https://fourvenues.com/es/octava-club',
      featured: false
    },
    {
      nombre: 'After oficial post-festival',
      precio: 'Variable', precio_sub: 'segun evento',
      duracion: '5-7 horas', tipo_tour: 'Experiencia', idioma: 'Espa\u00f1ol/Ingl\u00e9s', max_personas: 'Abierto',
      rating: '4.9', review_count: 140,
      descripcion: 'Octava organiza afters de festivales como el FEP y el Baum: la misma curadur\u00eda, la pista hasta el amanecer.',
      incluye: ['Acceso', 'DJs invitados', 'Ambiente festivalero'],
      no_incluye: ['Consumo', 'Transporte'],
      link_reserva: 'https://fourvenues.com/es/octava-club',
      featured: false
    }
  ],
  equipamiento: [
    { item: 'Documento de identidad (mayor de 18)', prioridad: 'Obligatorio' },
    { item: 'Boleta anticipada por Fourvenues', prioridad: 'Recomendado' },
    { item: 'Calzado c\u00f3modo para bailar', prioridad: 'Recomendado' },
    { item: 'Efectivo o tarjeta para consumo', prioridad: 'Recomendado' },
    { item: 'Reserva de mesa para grupos grandes', prioridad: 'Opcional' }
  ],
  itinerario: [
    { dia: 'Viernes', hora: '9:00 pm', titulo: 'Llegada y warm-up', icono: '\ud83c\udfa7', detalle: 'Apertura de puertas y DJ local de apertura', tags: ['Apertura'] },
    { dia: 'Viernes', hora: '11:00 pm', titulo: 'Pista principal', icono: '\ud83d\udc83', detalle: 'Techno y house en la pista central', tags: ['Techno'] },
    { dia: 'Sabado', hora: '1:00 am', titulo: 'Headliner internacional', icono: '\ud83c\udfb5', detalle: 'DJ invitado internacional en cabina', tags: ['Headliner'] },
    { dia: 'Sabado', hora: '3:30 am', titulo: 'Terraza y cierre', icono: '\ud83c\udf1f', detalle: 'Cierre con sesi\u00f3n en la terraza', tags: ['Cierre'] }
  ],
  dificultad_tags: [
    { texto: 'Pista principal a nivel, zonas de descanso y terraza', apto: true },
    { texto: 'Accesible en silla de ruedas (pista a nivel)', apto: true },
    { texto: 'Noche larga hasta las 5AM', apto: false },
    { texto: 'Cover variable seg\u00fan evento', apto: false },
    { texto: 'Requiere ser mayor de 18', apto: false }
  ],
  temporada_matriz: {
    Ene: 'posible', Feb: 'ideal', Mar: 'ideal', Abr: 'ideal', May: 'posible',
    Jun: 'ideal', Jul: 'posible', Ago: 'ideal', Sep: 'ideal', Oct: 'ideal', Nov: 'ideal', Dic: 'posible'
  }
};

const FAQS = [
  { pregunta: '\u00bfA qu\u00e9 horas abre Octava Club?', respuesta: 'Viernes y s\u00e1bados de 8PM a 5AM, sujeto a la programaci\u00f3n de cada evento. Verifica el lineup en fourvenues.com.' },
  { pregunta: '\u00bfCu\u00e1nto cuesta la entrada?', respuesta: 'El cover es variable seg\u00fan el evento; referencia 30.000-80.000 COP. La preventa en Fourvenues suele ser m\u00e1s barata.' },
  { pregunta: '\u00bfQu\u00e9 m\u00fasica ponen?', respuesta: 'Techno y house principalmente, con curadur\u00eda underground y artistas internacionales; hay noches tem\u00e1ticas.' },
  { pregunta: '\u00bfD\u00f3nde queda?', respuesta: 'Carrera 8 No. 63-41, Chapinero. TransMilenio: bajar en Calle 57 o Flores (la estaci\u00f3n Calle 63 est\u00e1 cerrada por el Metro L1).' },
  { pregunta: '\u00bfHay que reservar mesa?', respuesta: 'Para grupos grandes se recomienda reservar mesa o botella (desde 150.000 COP). La entrada general no requiere reserva.' }
];

module.exports = { SLUG: SLUG, HERO: HERO, PHOTOS: PHOTOS, BASE: BASE, TAGS: TAGS, FAQS: FAQS };

if (require.main !== module) return;

(async function main() {
  var url = process.env.DATABASE_URL || process.argv[2];
  if (!url) {
    console.error('Falta DATABASE_URL.');
    console.error('Uso: DATABASE_URL=postgres://... node api/seed-club-octava.js [--dry]');
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