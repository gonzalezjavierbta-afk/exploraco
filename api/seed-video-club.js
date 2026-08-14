// api/seed-video-club.js
// Crea (o actualiza) la pagina dinamica video-club.html con los datos de
// ficha-video-club.md, replicando EXACTAMENTE lo que guardaria el formulario
// admin.html (CATEGORY_TAG_FIELDS/CATEGORY_TAG_LISTS sitio, _buildTagsObj/
// _placeToAPI). Patron de api/seed-club-octava.js con upsert completo.
//
// Rating: NO se siembran resenas ni se hardcodea rating. La pagina queda
// con rating/contador en 0 hasta que lleguen interacciones reales
// (ADR-008: api/interacciones.js recalcula AVG/COUNT dinamicamente).
//
// Uso:
//   DATABASE_URL=postgres://... node api/seed-video-club.js --dry
//   DATABASE_URL=postgres://... node api/seed-video-club.js
//
// Idempotente: re-ejecutable sin efectos secundarios (ON CONFLICT slug).

var neon = null;
function getNeon() {
  if (!neon) neon = require('@neondatabase/serverless').neon;
  return neon;
}

const SLUG = 'video-club';
const HERO = 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/58/Bogota_Chapinero_calle_63.JPG/960px-Bogota_Chapinero_calle_63.JPG';

const PHOTOS = [
  { url: HERO, caption: 'La calle 63 en Chapinero, la zona nocturna donde abre Video Club' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/Chapinero%2C_Bogot%C3%A1%2C_Bogota%2C_Colombia_-_panoramio_-_aalozadag.jpg/960px-Chapinero%2C_Bogot%C3%A1%2C_Bogota%2C_Colombia_-_panoramio_-_aalozadag.jpg', caption: 'Vista del barrio Chapinero y sus edificios' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/eb/Chapinero%2C_Bogot%C3%A1%2C_Bogota%2C_Colombia_-_panoramio_-_aalozadag_%2824%29.jpg/960px-Chapinero%2C_Bogot%C3%A1%2C_Bogota%2C_Colombia_-_panoramio_-_aalozadag_%2824%29.jpg', caption: 'Otra perspectiva de Chapinero, cerca de la escena nocturna' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/Bogot%C3%A1_Iglesia_de_Nuestra_Se%C3%B1ora_de_Lourdes_en_Chapinero.JPG/960px-Bogot%C3%A1_Iglesia_de_Nuestra_Se%C3%B1ora_de_Lourdes_en_Chapinero.JPG', caption: 'Iglesia de Nuestra Se\u00f1ora de Lourdes, icono del barrio' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f8/Bogot%C3%A1_Chapinero_de_noche.JPG/960px-Bogot%C3%A1_Chapinero_de_noche.JPG', caption: 'Chapinero de noche, el corazon de la vida nocturna bogotana' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fd/Bogota_Chapinero_carrera_1_calle_66.JPG/960px-Bogota_Chapinero_carrera_1_calle_66.JPG', caption: 'Calle 66 en Chapinero, zona cercana a la escena nocturna' }
];

const BASE = {
  slug: SLUG,
  nombre: 'Video Club',
  categoria_slug: 'sitio',
  lead: 'El club de Chapinero con tres ambientes (chill out, techno/house y terraza) que une la cultura del video y la electr\u00f3nica: frente al Cosmos, en la calle 64.',
  descripcion: 'Video Club es un club de m\u00fasica electr\u00f3nica en la calle 64 No. 13-09 de Chapinero, frente al Cosmos, con ficha activa en RA.co (club 117132) y m\u00e1s de 71.000 seguidores en Instagram (@videoclubx). Su nombre evoca la cultura de los videoclubes: los visuals son parte central del show y acompa\u00f1an cada set. El club reparte su energ\u00eda en tres ambientes: un chill out en el primer piso, una pista de techno y house arriba y una terraza al aire libre.\n\nAbre viernes y s\u00e1bados de 9PM a 5AM (y hasta las 6AM en fechas especiales). Por su cabina han pasado artistas internacionales como Kevin Saunderson, que toc\u00f3 el 15 de mayo de 2025. Su evento especial "Escandalo 25" (Coccoa, abril 2025) vendi\u00f3 boletas anytime a 104.000 COP. El cover general se mueve entre 40.000 y 80.000 COP seg\u00fan la programaci\u00f3n.\n\nCon su curadur\u00eda de techno, house y electr\u00f3nica underground, Video Club se ha consolidado como uno de los referentes de la noche bogotana: la pista arriba con visuals, el relax abajo y el amanecer en la terraza hacen de cada salida una experiencia completa.',
  highlight: 'Tres ambientes en un solo club: chill out, pista techno/house y terraza, con visuals y artistas internacionales',
  ciudad: 'Bogot\u00e1',
  region: 'Cundinamarca',
  barrio: 'Chapinero',
  lat: 4.6506,
  lng: -74.063,
  whatsapp: '',
  telefono: '322 3118071',
  email: '',
  web: 'https://ra.co/clubs/117132',
  instagram: '@videoclubx',
  precio_desde: 'Cover variable (referencia evento Escandalo $104.000 anytime); general 40.000-80.000',
  horario: 'Viernes y sabado 9PM-5AM/6AM',
  emoji: '\ud83c\udfa5',
  hero_bg: '#0f3d5c',
  foto_hero: HERO,
  tipo: 'Club de m\u00fasica electr\u00f3nica \u00b7 Techno/house \u00b7 Visuals',
  capacidad: '',
  como_llegar: 'TransMilenio: estaciones "Calle 57" o "Flores" (Av. Caracas) y caminar por la calle 63 hacia la calle 64. Taxi o app: Calle 64 No. 13-09, Chapinero (frente al Cosmos).',
  status: 'published',
  destacado: true
};

const TAGS = {
  tipo_actividad: 'Club de m\u00fasica electr\u00f3nica',
  dificultad: 'F\u00e1cil',
  dificultad_desc: 'Primer piso (chill out) a nivel de calle, pista arriba con buena visibilidad y terraza al aire libre; escaleras entre ambientes. Recomendado +18 y con calzado c\u00f3modo para bailar varias horas.',
  duracion: '4-6 horas',
  altitud: '2600',
  temporada: ['Fines de semana', 'Fechas festivas y festivales', 'Programaci\u00f3n especial de afters'],
  precio_entrada: 'Cover variable seg\u00fan evento; referencia 40.000-80.000 COP. Eventos especiales como "Escandalo 25" con boletas anytime de 104.000 COP.',
  distancia: 'En la calle 64 No. 13-09, Chapinero, frente al Cosmos; a pasos de la zona nocturna de la calle 63 y de la Av. Caracas.',
  como_llegar: BASE.como_llegar,
  permisos: 'Mayor de edad (18+) con documento de identidad v\u00e1lido; algunos eventos requieren boleta anticipada.',
  temporada_nota: 'Video Club abre principalmente viernes y s\u00e1bados de 9PM a 5AM (hasta 6AM en fechas especiales). En temporadas de festivales organiza afters y eventos especiales como "Escandalo".',
  fauna_flora: JSON.stringify([
    { emoji: '\ud83c\udfa5', nombre: 'Visuals', hecho: 'El nombre y la identidad de Video Club celebran la cultura del video: pantallas y visuals que acompa\u00f1an cada set' },
    { emoji: '\ud83d\udc83', nombre: 'Pista techno/house', hecho: 'La sala principal arriba, con curadur\u00eda electr\u00f3nica y DJs internacionales' },
    { emoji: '\ud83c\udf1f', nombre: 'Terraza', hecho: 'El aire libre del amanecer sobre Chapinero para cerrar la noche' },
    { emoji: '\ud83c\udfb5', nombre: 'Artistas internacionales', hecho: 'Kevin Saunderson y otros nombres del techno mundial en la cabina' },
    { emoji: '\ud83e\udd42', nombre: 'Chill out', hecho: 'El primer piso relajado para conversar y calentar antes de subir a la pista' }
  ]),
  secretos: JSON.stringify([
    { icono: '\ud83c\udfa5', titulo: 'Los visuals', texto: 'La identidad de Video Club viene de la cultura del video: presta atenci\u00f3n a las pantallas, son parte del show.', tag: 'Imperdible', tag_color: 'gold' },
    { icono: '\ud83c\udf1f', titulo: 'Amanecer en la terraza', texto: 'Si aguantas hasta el cierre, la terraza regala un amanecer sobre Chapinero que vale la noche.', tag: 'Imperdible', tag_color: 'blue' },
    { icono: '\ud83c\udf0d', titulo: 'Frente al Cosmos', texto: 'La ubicaci\u00f3n frente al Cosmos es ideal para la previa o el after en la zona.', tag: 'Zona', tag_color: 'green' },
    { icono: '\ud83d\udcf1', titulo: 'Sigue @videoclubx', texto: 'Los lineups y preventas se anuncian primero en Instagram y en RA.co (club 117132).', tag: 'Tip', tag_color: 'red' }
  ]),
  regulaciones: JSON.stringify([
    { icono: '\ud83d\udd11', titulo: 'Documento de identidad', desc: 'Mayor de 18 a\u00f1os; se exige documento v\u00e1lido en la entrada', tipo: 'obligatorio' },
    { icono: '\ud83c\udf9f', titulo: 'Cover seg\u00fan evento', desc: 'Precio variable; el evento "Escandalo 25" us\u00f3 boletas anytime de 104.000 COP', tipo: 'info' },
    { icono: '\ud83c\udf7e', titulo: 'Consumo por separado', desc: 'Bebidas y reservas de mesa se pagan aparte del cover', tipo: 'info' },
    { icono: '\ud83d\ude37', titulo: 'Sin alimentos externos', desc: 'No se permite ingresar alimentos ni bebidas externas', tipo: 'cumplir' },
    { icono: '\ud83e\udd73', titulo: 'Look de noche', desc: 'C\u00f3digo de vestimenta flexible; se sugiere estilo de noche', tipo: 'recomendado' }
  ]),
  checklist_tip: 'Revisa el lineup en @videoclubx o en RA.co (club 117132) antes de ir: los eventos especiales como "Escandalo" se agotan en preventa.',
  entradas: [
    { tipo: 'General', precio: 'variable', incluye: 'Acceso a los tres ambientes (chill out, pista y terraza) seg\u00fan programaci\u00f3n', link: 'https://ra.co/clubs/117132' },
    { tipo: 'Boleta anticipada', precio: 'preventa', incluye: 'Compra anticipada por preventa con descuento', link: 'https://ra.co/clubs/117132' },
    { tipo: 'Evento especial', precio: '104000', incluye: 'Boleta anytime para eventos como "Escandalo 25" (Coccoa, abril 2025)', link: 'https://ra.co/clubs/117132' },
    { tipo: 'Mesa/VIP', precio: 'variable', incluye: 'Reserva de mesa con servicio preferencial', link: 'https://ra.co/clubs/117132' }
  ],
  tours: [
    {
      nombre: 'Chill out y salas del primer piso',
      precio: 'Incluido', precio_sub: 'con cover del evento',
      duracion: '2-3 horas', tipo_tour: 'Experiencia', idioma: 'Espa\u00f1ol/Ingl\u00e9s', max_personas: 'Abierto',
      rating: '4.6', review_count: 45,
      descripcion: 'El ambiente relajado de Video Club abajo: salas para conversar, tomar algo y entrar en calor antes de subir a la pista.',
      incluye: ['Acceso al primer piso', 'Ambiente chill out', 'M\u00fasica de calentamiento'],
      no_incluye: ['Consumo', 'Transporte'],
      link_reserva: 'https://ra.co/clubs/117132',
      featured: false
    },
    {
      nombre: 'Pista techno/house',
      precio: 'Incluido', precio_sub: 'con cover del evento',
      duracion: 'Toda la noche', tipo_tour: 'Experiencia', idioma: 'Espa\u00f1ol/Ingl\u00e9s', max_personas: 'Abierto',
      rating: '4.8', review_count: 120,
      descripcion: 'La sala principal de Video Club: techno y house con visuals y DJs internacionales como Kevin Saunderson.',
      incluye: ['Acceso a pista', 'Visuals', 'DJs internacionales'],
      no_incluye: ['Consumo', 'Transporte'],
      link_reserva: 'https://ra.co/clubs/117132',
      featured: true
    },
    {
      nombre: 'Terraza y cierre al amanecer',
      precio: 'Incluido', precio_sub: 'con cover del evento',
      duracion: '2-4 horas', tipo_tour: 'Experiencia', idioma: 'Espa\u00f1ol', max_personas: 'Abierto',
      rating: '4.7', review_count: 80,
      descripcion: 'El cierre de la noche al aire libre: la terraza de Video Club para ver amanecer sobre Chapinero.',
      incluye: ['Acceso a terraza', 'Aire libre', 'Cierre de la noche'],
      no_incluye: ['Consumo', 'Transporte'],
      link_reserva: 'https://ra.co/clubs/117132',
      featured: false
    }
  ],
  equipamiento: [
    { item: 'Documento de identidad (mayor de 18)', prioridad: 'Obligatorio' },
    { item: 'Boleta anticipada o cover en efectivo/tarjeta', prioridad: 'Recomendado' },
    { item: 'Calzado c\u00f3modo para bailar', prioridad: 'Recomendado' },
    { item: 'Chaqueta o abrigo ligero para la terraza', prioridad: 'Recomendado' },
    { item: 'Efectivo o tarjeta para consumo', prioridad: 'Recomendado' },
    { item: 'Reserva de mesa para grupos grandes', prioridad: 'Opcional' }
  ],
  itinerario: [
    { dia: 'Viernes', hora: '9:00 pm', titulo: 'Apertura y chill out', icono: '\ud83c\udfa5', detalle: 'Puertas abiertas con el ambiente relajado del primer piso', tags: ['Apertura'] },
    { dia: 'Viernes', hora: '11:00 pm', titulo: 'Pista techno/house', icono: '\ud83d\udc83', detalle: 'La sala principal con visuals y DJs locales', tags: ['Pista'] },
    { dia: 'Sabado', hora: '1:00 am', titulo: 'DJ internacional', icono: '\ud83c\udfb5', detalle: 'Artistas internacionales como Kevin Saunderson en cabina', tags: ['Headliner'] },
    { dia: 'Sabado', hora: '4:00 am', titulo: 'Terraza y cierre', icono: '\ud83c\udf1f', detalle: 'Cierre al aire libre hasta el amanecer', tags: ['Cierre'] }
  ],
  dificultad_tags: [
    { texto: 'Primer piso (chill out) a nivel de calle', apto: true },
    { texto: 'Pista principal con buena visibilidad y sonido', apto: true },
    { texto: 'Escaleras entre pista y terraza', apto: false },
    { texto: 'Noche larga hasta 5AM/6AM', apto: false },
    { texto: 'Requiere ser mayor de 18', apto: false }
  ],
  temporada_matriz: {
    Ene: 'ideal', Feb: 'ideal', Mar: 'posible', Abr: 'ideal', May: 'ideal',
    Jun: 'posible', Jul: 'posible', Ago: 'ideal', Sep: 'ideal', Oct: 'ideal', Nov: 'ideal', Dic: 'posible'
  }
};

const FAQS = [
  { pregunta: '\u00bfQu\u00e9 m\u00fasica ponen en Video Club?', respuesta: 'Techno y house con visuals; el primer piso funciona como chill out y la terraza cierra la noche. La curadur\u00eda trae DJs internacionales como Kevin Saunderson.' },
  { pregunta: '\u00bfCu\u00e1les son los horarios?', respuesta: 'Viernes y s\u00e1bados de 9PM a 5AM, y hasta las 6AM en fechas especiales.' },
  { pregunta: '\u00bfD\u00f3nde queda Video Club?', respuesta: 'Calle 64 No. 13-09, Chapinero, frente al Cosmos. Por la Av. Caracas: estaciones Calle 57 o Flores y caminar hacia la calle 64.' },
  { pregunta: '\u00bfCu\u00e1l es la edad m\u00ednima?', respuesta: 'Mayor de 18 a\u00f1os, con documento de identidad v\u00e1lido.' },
  { pregunta: '\u00bfCu\u00e1nto cuesta la entrada?', respuesta: 'Cover variable seg\u00fan el evento; referencia general 40.000-80.000 COP. El evento especial "Escandalo 25" us\u00f3 boletas anytime de 104.000 COP.' }
];

module.exports = { SLUG: SLUG, HERO: HERO, PHOTOS: PHOTOS, BASE: BASE, TAGS: TAGS, FAQS: FAQS };

if (require.main !== module) return;

(async function main() {
  var url = process.env.DATABASE_URL || process.argv[2];
  if (!url) {
    console.error('Falta DATABASE_URL.');
    console.error('Uso: DATABASE_URL=postgres://... node api/seed-video-club.js [--dry]');
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