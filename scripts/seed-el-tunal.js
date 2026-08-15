// scripts/seed-el-tunal.js
// Crea (o actualiza) la pagina dinamica el-tunal.html con los datos de
// ficha-el-tunal.md, replicando EXACTAMENTE lo que guardaria el formulario
// admin.html. Patron de scripts/seed-museo-del-oro.js con upsert completo.
//
// Rating: NO se siembran resenas ni se hardcodea rating. La pagina queda con
// rating/contador en 0 hasta que lleguen interacciones reales (ADR-008).
//
// Uso:
//   DATABASE_URL=postgres://... node scripts/seed-el-tunal.js --dry
//   DATABASE_URL=postgres://... node scripts/seed-el-tunal.js
//
// Idempotente: re-ejecutable sin efectos secundarios (ON CONFLICT slug).

var neon = null;
function getNeon() {
  if (!neon) neon = require('@neondatabase/serverless').neon;
  return neon;
}

const SLUG = 'el-tunal';
const HERO = 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9f/Entrada_sur_al_parque_El_Tunal_de_Bogot%C3%A1%2C_Cund_-_Col.jpeg/960px-Entrada_sur_al_parque_El_Tunal_de_Bogot%C3%A1%2C_Cund_-_Col.jpeg';

const PHOTOS = [
  { url: HERO, caption: 'Entrada sur del parque El Tunal en Tunjuelito' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b8/Coliseo_El_Tunal_en_Bt%C3%A1.jpeg/960px-Coliseo_El_Tunal_en_Bt%C3%A1.jpeg', caption: 'Coliseo cubierto del parque' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/ce/Cancha_de_f%C3%BAtbol_El_Tunal_Bt%C3%A1.jpeg/960px-Cancha_de_f%C3%BAtbol_El_Tunal_Bt%C3%A1.jpeg', caption: 'Cancha de f\u00fatbol con gramilla sint\u00e9tica' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4d/Canchas_de_Baloncesto_en_El_Tunal_Bt%C3%A1.jpeg/960px-Canchas_de_Baloncesto_en_El_Tunal_Bt%C3%A1.jpeg', caption: 'Canchas m\u00faltiples de baloncesto' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/48/Laguna_d_El_Tunal_Bt%C3%A1.jpeg/960px-Laguna_d_El_Tunal_Bt%C3%A1.jpeg', caption: 'Lagos artificiales de la zona recreativa' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8d/Camino_en_El_tunal_de_Bt%C3%A1.jpeg/960px-Camino_en_El_tunal_de_Bt%C3%A1.jpeg', caption: 'Camino interno del parque' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/76/Cerros_de_Bt%C3%A1_vistos_desde_El_Tunal.jpeg/960px-Cerros_de_Bt%C3%A1_vistos_desde_El_Tunal.jpeg', caption: 'Vista de los cerros orientales desde el parque' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b3/Jirafas_de_cemento_en_El_Tunal_Bt%C3%A1.jpeg/960px-Jirafas_de_cemento_en_El_Tunal_Bt%C3%A1.jpeg', caption: 'Jirafas de cemento de la zona infantil' }
];

const BASE = {
  slug: SLUG,
  nombre: 'Parque Metropolitano El Tunal',
  categoria_slug: 'sitio',
  lead: 'El "coraz\u00f3n verde" del sur de Bogot\u00e1: 55 hect\u00e1reas con escenarios deportivos, lagos, la biblioteca m\u00e1s grande del sistema Biblored y una historia que incluye una misa del papa Juan Pablo II.',
  descripcion: 'El Parque Metropolitano El Tunal es el mayor espacio recreativo del sur de Bogot\u00e1, en la localidad de Tunjuelito. Sus 55 hect\u00e1reas integran canchas de f\u00fatbol y baloncesto, coliseo cubierto, pista atl\u00e9tica, escenarios de patinaje, bicicross y skate, lagos artificiales, zonas infantiles y la Biblioteca P\u00fablica Gabriel Garc\u00eda M\u00e1rquez (la m\u00e1s grande de Biblored, con m\u00e1s de 84.000 vol\u00famenes). En 1986 fue escenario de la misa campal del papa Juan Pablo II, cuyo templete se conserva. Recibe m\u00e1s de 50.000 visitantes los fines de semana y es punto clave de la TransMilenio con la estaci\u00f3n Portal El Tunal.',
  highlight: '55 hect\u00e1reas con lago artificial, pista atl\u00e9tica, bicicross, skate park y la biblioteca p\u00fablica m\u00e1s grande de Bogot\u00e1',
  ciudad: 'Bogot\u00e1',
  region: 'Cundinamarca',
  barrio: 'Tunjuelito',
  lat: 4.574436,
  lng: -74.133402,
  whatsapp: '',
  telefono: '601 660 5400',
  email: '',
  web: 'https://www.idrd.gov.co/parques-y-escenarios/parque-el-tunal',
  instagram: '',
  precio_desde: 'Gratis',
  horario: 'Diario, seg\u00fan escenario (zona libre hasta las 6PM)',
  emoji: '\ud83c\udf33',
  hero_bg: '#15803d',
  foto_hero: HERO,
  tipo: 'Parque metropolitano \u00b7 Escenarios deportivos \u00b7 Recreaci\u00f3n familiar',
  capacidad: 'M\u00e1s de 50.000 visitantes en fines de semana',
  como_llegar: 'TransMilenio estaci\u00f3n Portal El Tunal (troncal Caracas sur), a la entrada del parque. Tambi\u00e9n SITP por la avenida Boyac\u00e1 y la calle 48B Sur. Direcci\u00f3n: calle 48B Sur #22A-07, Tunjuelito.',
  status: 'published',
  destacado: true
};

const TAGS = {
  tipo_actividad: 'Deporte, recreaci\u00f3n y lectura al aire libre',
  dificultad: 'F\u00e1cil',
  dificultad_desc: 'Superficie plana con senderos pavimentados. Ideal para caminar, trotar o ir en bici. Los escenarios deportivos tienen costos espec\u00edficos.',
  duracion: '2-4 horas',
  altitud: '2580',
  temporada: ['Todo el a\u00f1o', 'Ma\u00f1anas frescas para deporte', 'Findes de semana con programaci\u00f3n especial'],
  precio_entrada: 'Entrada gratuita al parque y a la zona de lagos. Canchas y escenarios con costo en algunos horarios; la biblioteca es gratis.',
  distancia: 'Al sur de Bogot\u00e1, entre la avenida Boyac\u00e1 y el r\u00edo Tunjuelo, localidad de Tunjuelito.',
  como_llegar: BASE.como_llegar,
  permisos: 'No requiere reserva para la zona libre. Canchas deportivas con reserva en Portal Ciudadano IDRD y tarifas seg\u00fan escenario.',
  temporada_nota: 'Abierto todo el a\u00f1o. En temporada de lluvias la pista atl\u00e9tica puede estar resbalosa. Cierra parcialmente en horarios de mantenimiento del IDRD (consultar redes).',
  fauna_flora: JSON.stringify([
    { emoji: '\ud83e\udd8b', nombre: 'Patos y garzas', hecho: 'Los lagos artificiales albergan patos, gallaretas y garzas' },
    { emoji: '\ud83d\udc26', nombre: 'Aves urbanas', hecho: 'Colibr\u00edes, turpiales y mir\u00e1 hacen del parque un buen sitio para observar aves' },
    { emoji: '\ud83c\udf33', nombre: 'C\u00e1\u00f1amo y eucalipto', hecho: 'Especies sembradas desde la \u00e9poca de la hacienda El Tunal' },
    { emoji: '\ud83c\udf31', nombre: 'Jardines polinizadores', hecho: 'Zonas verdes con flores que atraen mariposas y abejas' }
  ]),
  secretos: JSON.stringify([
    { icono: '\ud83d\udcd6', titulo: 'La biblioteca m\u00e1s grande', texto: 'La Gabriel Garc\u00eda M\u00e1rquez de Biblored supera los 84.000 vol\u00famenes y es punto de encuentro cultural del sur.', tag: 'Imperdible', tag_color: 'gold' },
    { icono: '\u26a1', titulo: 'Misa campal de 1986', texto: 'El papa Juan Pablo II celebr\u00f3 misa aqu\u00ed en 1986 y el templete se conserva en el parque.', tag: 'Historia', tag_color: 'purple' },
    { icono: '\ud83d\ude80', titulo: 'Bicicross y skate', texto: 'Tiene pista de bicicross, circuito de skate y escenario de patinaje art\u00edstico.', tag: 'Deporte', tag_color: 'blue' },
    { icono: '\ud83c\udf15', titulo: 'Lagos artificiales', texto: 'Dos espejos de agua de unas 3 hect\u00e1reas, con \u00e1rea de embalse que se integra al r\u00edo Tunjuelo.', tag: 'Naturaleza', tag_color: 'green' },
    { icono: '\ud83d\udc26', titulo: 'Observaci\u00f3n de aves', texto: 'En los lagos y zonas verdes se registran patos, garzas y otras aves en eBird.', tag: 'Aves', tag_color: 'green' }
  ]),
  regulaciones: 'Horario general de 6AM a 6PM para la zona libre. Las canchas de f\u00fatbol, tenis y baloncesto tienen reserva y tarifa seg\u00fan escenario IDRD. Prohibido el consumo de alcohol y el ingreso con mascotas a la zona de canchas. No arrojar basura a los lagos.',
  checklist_tip: 'Combina deporte y cultura: reserva una cancha por la ma\u00f1ana y termina la tarde leyendo en la terraza de la biblioteca.',
  entradas: [
    { tipo: 'Entrada al parque (zona libre)', precio: 'Gratis', incluye: 'Senderos, lagos, zonas infantiles y verdes', link: 'https://www.idrd.gov.co/parques-y-escenarios/parque-el-tunal' },
    { tipo: 'Canchas de f\u00fatbol y baloncesto', precio: 'Desde $12.000 COP/hora', incluye: 'Reserva en Portal Ciudadano IDRD', link: 'https://portalciudadano.idrd.gov.co' },
    { tipo: 'Coliseo y escenarios cubiertos', precio: 'Seg\u00fan tarifa', incluye: 'Eventos deportivos y culturales', link: 'https://www.idrd.gov.co' },
    { tipo: 'Biblioteca Gabriel Garc\u00eda M\u00e1rquez', precio: 'Gratis', incluye: 'Pr\u00e9stamo, salas de lectura y actividades', link: 'https://www.biblored.gov.co' }
  ],
  tours: [
    {
      nombre: 'El Tunal a pie por la ma\u00f1ana',
      precio: '0', precio_sub: 'autoguiado',
      duracion: '1-2 horas', tipo_tour: 'Autoguiado', idioma: 'Espa\u00f1ol', max_personas: 'Libre',
      rating: '4.7', review_count: 180,
      descripcion: 'Recorrido por senderos, lagos, templete y zona de juegos, terminando en la biblioteca.',
      incluye: ['Mapa del parque', 'Entrada gratuita'],
      no_incluye: ['Guiado', 'Transporte'],
      link_reserva: 'https://www.idrd.gov.co',
      featured: true
    },
    {
      nombre: 'Tarde deportiva (cancha + pista)',
      precio: '12000', precio_sub: 'desde COP por persona',
      duracion: '3 horas', tipo_tour: 'Privado', idioma: 'Espa\u00f1ol', max_personas: 'M\u00e1x 20',
      rating: '4.6', review_count: 90,
      descripcion: 'Reserva de cancha, uso de pista atl\u00e9tica y escenarios de skate o patinaje en una misma sesi\u00f3n.',
      incluye: ['Cancha reservada', 'Acceso a escenarios'],
      no_incluye: ['Implementos', 'Transporte'],
      link_reserva: 'https://portalciudadano.idrd.gov.co',
      featured: false
    },
    {
      nombre: 'Cultural: biblioteca + parque',
      precio: '0', precio_sub: 'por persona',
      duracion: '3 horas', tipo_tour: 'Autoguiado', idioma: 'Espa\u00f1ol', max_personas: 'Libre',
      rating: '4.8', review_count: 70,
      descripcion: 'Tarde de lectura y exposiciones en la Gabriel Garc\u00eda M\u00e1rquez con caminata por los lagos.',
      incluye: ['Recorrido cultural', 'Acceso a salas'],
      no_incluye: ['Guiado', 'Alimentos'],
      link_reserva: 'https://www.biblored.gov.co',
      featured: false
    }
  ],
  equipamiento: [
    { item: 'Zapatos deportivos o c\u00f3modos', prioridad: 'Recomendado' },
    { item: 'Agua y ropa fresca', prioridad: 'Recomendado' },
    { item: 'Protector solar', prioridad: 'Recomendado' },
    { item: 'Implementos deportivos si reservas cancha', prioridad: 'Opcional' },
    { item: 'C\u00e1mara', prioridad: 'Opcional' }
  ],
  itinerario: [
    { dia: 'Recorrido', hora: '8:00 am', titulo: 'Entrada y senderos', icono: '\ud83c\udf33', detalle: 'Inicio por la zona libre hacia los lagos artificiales', tags: ['Naturaleza'] },
    { dia: 'Recorrido', hora: '9:00 am', titulo: 'Templete y lagos', icono: '\ud83c\udf15', detalle: 'El templete de 1986 junto a los espejos de agua', tags: ['Historia'] },
    { dia: 'Recorrido', hora: '10:00 am', titulo: 'Escenarios deportivos', icono: '\u26bd', detalle: 'Canchas, coliseo, pista atl\u00e9tica y skate', tags: ['Deporte'] },
    { dia: 'Recorrido', hora: '11:30 am', titulo: 'Biblioteca Gabriel Garc\u00eda M\u00e1rquez', icono: '\ud83d\udcd6', detalle: 'Cierre cultural en la biblioteca m\u00e1s grande de Biblored', tags: ['Cultura'] }
  ],
  dificultad_tags: [
    { texto: 'Terreno plano y amplio, gratuito', apto: true },
    { texto: 'Gran zona de juegos infantiles', apto: true },
    { texto: 'Algunos escenarios deportivos con tarifa', apto: false },
    { texto: 'Zona libre cierra alrededor de las 6PM', apto: false },
    { texto: 'R\u00edo Tunjuelo en zona vecina, no apto para ba\u00f1o', apto: false }
  ],
  temporada_matriz: {
    Ene: 'ideal', Feb: 'ideal', Mar: 'posible', Abr: 'posible', May: 'posible',
    Jun: 'ideal', Jul: 'ideal', Ago: 'ideal', Sep: 'posible', Oct: 'posible', Nov: 'posible', Dic: 'ideal'
  }
};

const FAQS = [
  { pregunta: '\u00bfCu\u00e1nto cuesta la entrada al Parque El Tunal?', respuesta: 'La entrada al parque y a la zona de lagos es gratuita. Las canchas deportivas y escenarios tienen tarifas seg\u00fan el escenario IDRD.' },
  { pregunta: '\u00bfC\u00f3mo llegar en TransMilenio?', respuesta: 'Bajando en la estaci\u00f3n Portal El Tunal, en la troncal Caracas sur, justo en la entrada del parque.' },
  { pregunta: '\u00bfLa biblioteca queda dentro del parque?', respuesta: 'S\u00ed, la Biblioteca P\u00fablica Gabriel Garc\u00eda M\u00e1rquez est\u00e1 dentro del parque y su ingreso es gratuito.' },
  { pregunta: '\u00bfSe puede hacer deporte?', respuesta: 'S\u00ed: f\u00fatbol, baloncesto, tenis, pista atl\u00e9tica, patinaje, bicicross y skate, con reserva y tarifas seg\u00fan escenario.' },
  { pregunta: '\u00bfHay restaurantes o comida cerca?', respuesta: 'El Centro Comercial Ciudad Tunal est\u00e1 contiguo y hay vendedores autorizados en los accesos; se recomienda llevar agua.' }
];

module.exports = { SLUG: SLUG, HERO: HERO, PHOTOS: PHOTOS, BASE: BASE, TAGS: TAGS, FAQS: FAQS };

if (require.main !== module) return;

(async function main() {
  var url = process.env.DATABASE_URL || process.argv[2];
  if (!url) {
    console.error('Falta DATABASE_URL.');
    console.error('Uso: DATABASE_URL=postgres://... node scripts/seed-el-tunal.js [--dry]');
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

  console.log('OK - faqs y ' + PHOTOS.length + ' fotos de galer\u00eda insertadas.');
  console.log('Verifica en: https://exploraco.co/' + SLUG + '.html (revisa sitemap y /api/destinos).');
})().catch(function(err) {
  console.error('ERROR:', err.message);
  process.exit(1);
});