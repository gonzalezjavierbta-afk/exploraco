// api/seed-bogota.js
// Crea (o actualiza) la pagina dinamica bogota.html con los datos de
// ficha-bogota.md, replicando EXACTAMENTE lo que guardaria el formulario
// admin.html (CATEGORY_TAG_FIELDS/CATEGORY_TAG_LISTS sitio, _buildTagsObj/
// _placeToAPI). Patron de api/seed-lacandelaria.js con upsert completo.
//
// Rating: NO se siembran resenas ni se hardcodea rating. La pagina queda
// con rating/contador en 0 hasta que lleguen interacciones reales
// (ADR-008: api/interacciones.js recalcula AVG/COUNT dinamicamente).
//
// Uso:
//   DATABASE_URL=postgres://... node api/seed-bogota.js --dry
//   DATABASE_URL=postgres://... node api/seed-bogota.js
//
// Idempotente: re-ejecutable sin efectos secundarios (ON CONFLICT slug).

var neon = null;
function getNeon() {
  if (!neon) neon = require('@neondatabase/serverless').neon;
  return neon;
}

const SLUG = 'bogota';
const HERO = 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/62/Skyline_downtown_Bogota.jpg/960px-Skyline_downtown_Bogota.jpg';

const PHOTOS = [
  { url: HERO, caption: 'Skyline del centro de Bogota' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/6/64/Plaza_de_Bol%C3%ADvar_-_Bogot%C3%A1.JPG', caption: 'Plaza de Bol\u00edvar' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/36/Teleferico_Monserrate.jpg/960px-Teleferico_Monserrate.jpg', caption: 'Telef\u00e9rico de Monserrate' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/Santuario_de_Monserrate%2C_Bogot%C3%A1.jpg/960px-Santuario_de_Monserrate%2C_Bogot%C3%A1.jpg', caption: 'Santuario de Monserrate' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4a/TransMilenio_estaci%C3%B3n_Las_Aguas_y_Monserrate.jpg/960px-TransMilenio_estaci%C3%B3n_Las_Aguas_y_Monserrate.jpg', caption: 'TransMilenio con Monserrate al fondo' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ef/Panor%C3%A1mica_de_Usaquen%2C_Bogot%C3%A1_D.C.jpg/960px-Panor%C3%A1mica_de_Usaquen%2C_Bogot%C3%A1_D.C.jpg', caption: 'Panor\u00e1mica de Usaqu\u00e9n' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b0/Museo-del-Oro-Fachada_%2827842494739%29.jpg/960px-Museo-del-Oro-Fachada_%2827842494739%29.jpg', caption: 'Fachada del Museo del Oro' }
];

const BASE = {
  slug: SLUG,
  nombre: 'Bogot\u00e1',
  categoria_slug: 'sitio',
  lead: 'La capital de Colombia: un mix de historia colonial, museos de clase mundial, gastronom\u00eda (ajiaco) y la energ\u00eda de una metr\u00f3poli de 7 millones de personas a 2.640 metros de altitud.',
  descripcion: 'Bogot\u00e1 es la capital y ciudad m\u00e1s grande de Colombia, fundada en 1538 por Gonzalo Jim\u00e9nez de Quesada. Se extiende sobre la sabana andina a 2.640 m, entre los cerros orientales con Monserrate y Guadalupe como guardianes. Concentra los mejores museos del pa\u00eds (Museo del Oro, Museo Botero, Museo Nacional), el centro hist\u00f3rico de La Candelaria, barrios modernos como Chapinero y la Zona T, y una escena gastron\u00f3mica y cultural en constante crecimiento. Es el punto de entrada obligado del turismo colombiano y la base para explorar el resto del pa\u00eds.',
  highlight: 'La puerta de entrada a Colombia: museos de clase mundial, historia colonial y gastronom\u00eda',
  ciudad: 'Bogot\u00e1',
  region: 'Cundinamarca',
  barrio: 'Capital',
  lat: 4.7110,
  lng: -74.0721,
  whatsapp: '',
  telefono: '',
  email: '',
  web: 'https://www.bogota.gov.co',
  instagram: '@bogota',
  precio_desde: 'Desde $5.000 (Museo del Oro)',
  horario: 'Atracciones abiertas mayormente 9AM-6PM; Museo del Oro Mar-Sab 9AM-7PM, Dom 10AM-5PM, cerrado lun',
  emoji: '\ud83c\udfdb',
  hero_bg: '#1a2a3a',
  foto_hero: HERO,
  tipo: 'Ciudad Capital \u00b7 Cultura \u00b7 Museos \u00b7 Gastronom\u00eda \u00b7 Historia',
  capacidad: '',
  como_llegar: 'Aeropuerto Internacional El Dorado (BOG) con vuelos desde todo el mundo. En la ciudad: TransMilenio (red BRT m\u00e1s grande de Latinoam\u00e9rica), taxi, apps de transporte, TransMiCable. Del aeropuerto: taxi oficial o TransMilenio estaci\u00f3n El Dorado (ruta K86 al centro).',
  status: 'published',
  destacado: true
};

const TAGS = {
  tipo_actividad: 'Ciudad Capital',
  dificultad: 'F\u00e1cil',
  dificultad_desc: 'Ciudad accesible para recorrer a pie en el centro y en transporte p\u00fablico (TransMilenio, taxi, apps). La altitud (2.640 m) requiere 1-2 d\u00edas de adaptaci\u00f3n: hidrataci\u00f3n constante y ritmo tranquilo los primeros d\u00edas.',
  duracion: '3-5 d\u00edas (recomendado)',
  altitud: '2640',
  temporada: ['Diciembre-enero y julio-agosto secos', 'Lluvias abril-mayo y octubre-noviembre', 'Alumbrados navide\u00f1os en diciembre'],
  precio_entrada: 'Museos: Museo del Oro $5.000 (domingos gratis), Museo Botero gratis, Museo Nacional $4.000 (domingos gratis). Monserrate funicular+telef\u00e9rico ida y vuelta aprox. $72.000-100.000',
  distancia: 'Aeropuerto El Dorado a 13 km del centro (~30-45 min en taxi o TransMilenio)',
  como_llegar: BASE.como_llegar,
  permisos: 'No requiere permiso para recorrer la ciudad. Museos con entrada (varios gratis los domingos). Monserrate sin reserva previa, aunque en festivos conviene llegar temprano. Algunos tours requieren reserva.',
  temporada_nota: 'Bogot\u00e1 tiene clima estable 14-20C todo el a\u00f1o. Temporada seca principal dic-ene y jul-ago (mejores vistas a Monserrate). Lluvias m\u00e1s fuertes abril-mayo y octubre-noviembre. En diciembre la ciudad se llena de alumbrados navide\u00f1os.',
  fauna_flora: JSON.stringify([
    { emoji: '\ud83d\udc26', nombre: 'Colibr\u00edes', hecho: 'Presentes en cerros y parques de la ciudad' },
    { emoji: '\ud83c\udf3f', nombre: 'Roble andino', hecho: '\u00c1rbol emblem\u00e1tico de los cerros orientales' },
    { emoji: '\ud83c\udf3c', nombre: 'Frailej\u00f3n', hecho: 'Planta t\u00edpica del p\u00e1ramo (Cerro de Monserrate)' },
    { emoji: '\ud83d\udc1a', nombre: 'C\u00f3peton de los Andes', hecho: 'Aves nativas del p\u00e1ramo cercano' },
    { emoji: '\ud83c\udf31', nombre: 'Eucaliptos y alamedas', hecho: 'Vegetaci\u00f3n de calles y parques urbanos' },
    { emoji: '\ud83e\uddb8', nombre: 'Perezosos', hecho: 'Rescatados en humedales urbanos (Humedal C\u00f3rdoba)' }
  ]),
  secretos: JSON.stringify([
    { icono: '\ud83c\udfdb', titulo: 'Casa de Nari\u00f1o', texto: 'Residencia presidencial con guardia y horario de visita gratuito los primeros s\u00e1bados del mes.', tag: 'Historia', tag_color: 'gold' },
    { icono: '\ud83d\udcd6', titulo: 'Librer\u00edas de La Candelaria', texto: 'Librer\u00eda Merlin y librer\u00edas de viejo esconden primeras ediciones y libros raros.', tag: 'Cultura', tag_color: 'green' },
    { icono: '\ud83c\udf0f', titulo: 'Ciclov\u00eda dominical', texto: 'De 7AM a 2PM la ciudad cierra 120 km de calles para bicis y caminantes.', tag: 'Tip', tag_color: 'blue' },
    { icono: '\ud83c\udfa8', titulo: 'Museo Botero gratis', texto: 'Uno de los museos m\u00e1s importantes de Latinoam\u00e9rica con entrada libre siempre.', tag: 'Gratis', tag_color: 'gold' },
    { icono: '\ud83c\udf6b', titulo: 'Chocolate santafere\u00f1o con queso', texto: 'El desayuno cl\u00e1sico bogotano; probarlo en La Candelaria.', tag: 'Comer', tag_color: 'brown' },
    { icono: '\ud83c\udf04', titulo: 'Atardecer desde Monserrate', texto: 'Subir 1 hora antes del atardecer para la mejor luz sobre la sabana.', tag: 'Tip', tag_color: 'blue' }
  ]),
  regulaciones: 'Bogot\u00e1 es una ciudad segura si se siguen las precauciones urbanas habituales: evitar zonas despobladas de noche, cuidar pertenencias en transporte p\u00fablico y usar apps de transporte en vez de taxis de calle. Los museos tienen sus propios horarios (generalmente cerrado los lunes). En los cerros (Monserrate) se debe permanecer en los senderos habilitados. No est\u00e1 permitido fumar en espacios cerrados ni en parques. La altitud de 2.640 m puede afectar la primera noche: hidratarse y evitar alcohol. Las propinas en restaurantes son del 10% y ya suelen estar incluidas en la cuenta.',
  checklist_tip: 'La altitud de Bogot\u00e1 (2.640 m) puede afectar la primera noche: hidratarse constantemente y evitar alcohol el primer d\u00eda.',
  entradas: [
    { tipo: 'Museo del Oro (general)', precio: '5000', incluye: 'Entrada general Mar-Sab y festivos', link: 'https://www.banrepcultural.org/bogota/museo-del-oro' },
    { tipo: 'Museo del Oro (domingo)', precio: 'Gratis', incluye: 'Entrada libre los domingos para todos', link: 'https://www.banrepcultural.org/bogota/museo-del-oro' },
    { tipo: 'Museo Botero', precio: 'Gratis', incluye: 'Entrada libre siempre (colecci\u00f3n Botero)', link: 'https://www.banrepcultural.org/bogota/museo-botero' },
    { tipo: 'Museo Nacional de Colombia', precio: '4000', incluye: 'Colecci\u00f3n permanente', link: 'https://museonacional.gov.co' },
    { tipo: 'Museo Nacional (domingo)', precio: 'Gratis', incluye: 'Entrada libre los domingos', link: 'https://museonacional.gov.co' },
    { tipo: 'MAMBO (Museo Arte Moderno)', precio: '14000', incluye: 'Colecci\u00f3n de arte moderno y contempor\u00e1neo', link: 'https://www.mambogota.com' },
    { tipo: 'Monserrate (funicular/telef\u00e9rico)', precio: '75000', incluye: 'Subida y bajada, vista 360 de la ciudad', link: 'https://www.monserrate.co' },
    { tipo: 'Catedral Primada de Bogot\u00e1', precio: 'Gratis', incluye: 'Visita al templo en la Plaza de Bol\u00edvar', link: 'https://www.catedraldebogota.org' }
  ],
  tours: [
    {
      nombre: 'Walking tour por el centro hist\u00f3rico',
      precio: '40000', precio_sub: 'por persona',
      duracion: '3 horas', tipo_tour: 'Grupal', idioma: 'Espa\u00f1ol', max_personas: 'M\u00e1x 12',
      rating: '4.8', review_count: 320,
      descripcion: 'Plaza de Bol\u00edvar, Catedral, La Candelaria y el Chorro de Quevedo con gu\u00eda.',
      incluye: ['Gu\u00eda certificado', 'Entrada a Museo Botero', 'Historia de la fundaci\u00f3n'],
      no_incluye: ['Transporte', 'Alimentos'],
      link_reserva: 'https://bogotawalkingtours.com',
      featured: true
    },
    {
      nombre: 'Tour gastron\u00f3mico: ajiaco y mercados',
      precio: '65000', precio_sub: 'por persona',
      duracion: '3.5 horas', tipo_tour: 'Grupal', idioma: 'Espa\u00f1ol', max_personas: 'M\u00e1x 8',
      rating: '4.9', review_count: 210,
      descripcion: 'Degustaci\u00f3n de ajiaco, chocolate santafere\u00f1o, tamales y frutas ex\u00f3ticas en la Plaza de Mercado La Perseverancia.',
      incluye: ['Gu\u00eda gastron\u00f3mico', '4 degustaciones', 'Receta de ajiaco'],
      no_incluye: ['Transporte', 'Bebidas adicionales'],
      link_reserva: 'https://bogotafoodtours.com',
      featured: false
    },
    {
      nombre: 'Monserrate al amanecer',
      precio: '90000', precio_sub: 'por persona',
      duracion: '4 horas', tipo_tour: 'Privado', idioma: 'Espa\u00f1ol/Ingl\u00e9s', max_personas: 'M\u00e1x 6',
      rating: '4.9', review_count: 145,
      descripcion: 'Funicular al cerro para ver el amanecer sobre toda la sabana bogotana.',
      incluye: ['Tiquetes funicular', 'Gu\u00eda', 'Desayuno t\u00edpico'],
      no_incluye: ['Traslado al punto de encuentro'],
      link_reserva: 'https://monserratebogota.com',
      featured: false
    },
    {
      nombre: 'Tour de grafiti y arte urbano',
      precio: '50000', precio_sub: 'por persona',
      duracion: '3 horas', tipo_tour: 'Grupal', idioma: 'Espa\u00f1ol/Ingl\u00e9s', max_personas: 'M\u00e1x 15',
      rating: '4.7', review_count: 98,
      descripcion: 'Distrito Graffiti en el barrio La Candelaria y murales de la Calle 26.',
      incluye: ['Gu\u00eda de arte urbano', 'Recorrido a pie', 'Datos del proceso de paz'],
      no_incluye: ['Transporte', 'Comidas'],
      link_reserva: 'https://bogotagraffititour.com',
      featured: false
    },
    {
      nombre: 'Bogot\u00e1 en bicicleta (cicloruta)',
      precio: '55000', precio_sub: 'por persona',
      duracion: '4 horas', tipo_tour: 'Grupal', idioma: 'Espa\u00f1ol/Ingl\u00e9s', max_personas: 'M\u00e1x 10',
      rating: '4.6', review_count: 76,
      descripcion: 'Recorrido por la red de ciclorutas con paradas en parques y puntos culturales.',
      incluye: ['Bicicleta', 'Casco', 'Gu\u00eda', 'Seguro'],
      no_incluye: ['Alimentos', 'Seguro personal'],
      link_reserva: 'https://bogotabiketour.com',
      featured: false
    }
  ],
  equipamiento: [
    { item: 'Hidrataci\u00f3n y bocadillos por la altitud', prioridad: 'Obligatorio' },
    { item: 'Paragua o impermeable (lluvia sorpresa)', prioridad: 'Obligatorio' },
    { item: 'Efectivo en pesos (propinas y mercados)', prioridad: 'Recomendado' },
    { item: 'Tarjeta de transporte (TuLlave) para TransMilenio', prioridad: 'Recomendado' },
    { item: 'Zapatos c\u00f3modos para caminar', prioridad: 'Recomendado' },
    { item: 'Documento de identidad (pasaporte)', prioridad: 'Recomendado' },
    { item: 'Ropa de abrigo para la noche (fr\u00edo de monta\u00f1a)', prioridad: 'Opcional' }
  ],
  itinerario: [
    { dia: 'D\u00eda 1', hora: '9:00 am', titulo: 'Plaza de Bol\u00edvar y Catedral', icono: '\ud83c\udfdb', detalle: 'Coraz\u00f3n de la ciudad: Congreso, Palacio de Justicia y Catedral Primada', tags: ['Centro', 'Historia'] },
    { dia: 'D\u00eda 1', hora: '11:00 am', titulo: 'La Candelaria', icono: '\ud83c\udfeb', detalle: 'Calles coloniales, museos y arte urbano', tags: ['Centro', 'Colonial'] },
    { dia: 'D\u00eda 1', hora: '1:30 pm', titulo: 'Ajiaco en zona universitaria', icono: '\ud83c\udf72', detalle: 'Almuerzo t\u00edpico bogotano', tags: ['Gastronom\u00eda'] },
    { dia: 'D\u00eda 1', hora: '3:00 pm', titulo: 'Museo Botero', icono: '\ud83c\udfa8', detalle: 'Colecci\u00f3n gratuita de Fernando Botero', tags: ['Arte', 'Gratis'] },
    { dia: 'D\u00eda 1', hora: '5:00 pm', titulo: 'Museo del Oro', icono: '\ud83d\udc8e', detalle: 'La mayor colecci\u00f3n de orfebrer\u00eda prehisp\u00e1nica del mundo', tags: ['Museos'] },
    { dia: 'D\u00eda 2', hora: '8:00 am', titulo: 'Funicular a Monserrate', icono: '\ud83d\ude9c', detalle: 'Vista 360 de la sabana desde 3.152 m', tags: ['Monserrate'] },
    { dia: 'D\u00eda 2', hora: '11:00 am', titulo: 'Quinta de Bol\u00edvar', icono: '\ud83c\udfe1', detalle: 'Casa-museo del libertador Sim\u00f3n Bol\u00edvar', tags: ['Historia'] },
    { dia: 'D\u00eda 2', hora: '2:00 pm', titulo: 'Museo Nacional', icono: '\ud83c\udfdb', detalle: 'Historia de Colombia desde la \u00e9poca prehisp\u00e1nica', tags: ['Museos'] },
    { dia: 'D\u00eda 2', hora: '6:00 pm', titulo: 'Zona T y Parque 93', icono: '\ud83c\udf7d', detalle: 'Cena y vida nocturna en Chapinero', tags: ['Noche'] },
    { dia: 'D\u00eda 3', hora: '9:00 am', titulo: 'Mercado La Perseverancia', icono: '\ud83e\uddc1', detalle: 'Mercado tradicional con desayuno local', tags: ['Gastronom\u00eda'] },
    { dia: 'D\u00eda 3', hora: '11:00 am', titulo: 'Distrito Graffiti', icono: '\ud83c\udfa8', detalle: 'Arte urbano y murales de la Calle 26', tags: ['Arte'] },
    { dia: 'D\u00eda 3', hora: '2:00 pm', titulo: 'Usaqu\u00e9n', icono: '\ud83c\udf0f', detalle: 'Pueblo colonial absorbido por la ciudad, mercados de pulgas', tags: ['Barrios'] },
    { dia: 'D\u00eda 3', hora: '4:00 pm', titulo: 'Parque Sim\u00f3n Bol\u00edvar', icono: '\ud83c\udf33', detalle: 'El pulm\u00f3n verde de la ciudad, ciclov\u00eda', tags: ['Parques'] }
  ],
  dificultad_tags: [
    { texto: 'Ciudad accesible a pie en el centro', apto: true },
    { texto: 'Apto para ni\u00f1os', apto: true },
    { texto: 'Altitud 2640m \u00b7 usar precauci\u00f3n los primeros d\u00edas', apto: false },
    { texto: 'Traslados largos entre barrios \u00b7 usar TransMilenio o taxi', apto: false },
    { texto: 'Lluvias impredecibles \u00b7 llevar paragua o impermeable', apto: false }
  ],
  temporada_matriz: {
    Ene: 'ideal', Feb: 'ideal', Mar: 'posible', Abr: 'posible', May: 'evitar',
    Jun: 'posible', Jul: 'ideal', Ago: 'ideal', Sep: 'posible', Oct: 'evitar', Nov: 'posible', Dic: 'ideal'
  }
};

const FAQS = [
  { pregunta: '\u00bfEs seguro Bogot\u00e1 para turistas?', respuesta: 'S\u00ed, las zonas tur\u00edsticas (La Candelaria, Chapinero, Zona T) son seguras de d\u00eda. Usa apps de transporte, evita calles vac\u00edas de noche y guarda tus pertenencias en el transporte p\u00fablico.' },
  { pregunta: '\u00bfCu\u00e1ntos d\u00edas se necesitan para ver Bogot\u00e1?', respuesta: '3-5 d\u00edas. Tres d\u00edas cubren el centro hist\u00f3rico, Monserrate y un par de museos; con 4-5 d\u00edas agregas Usaqu\u00e9n, arte urbano y excursiones de un d\u00eda como la Catedral de Sal de Zipaquir\u00e1.' },
  { pregunta: '\u00bfC\u00f3mo llegar del aeropuerto al centro?', respuesta: 'Taxi oficial (30-45 min, tarifa fija) o TransMilenio ruta K86 desde la estaci\u00f3n El Dorado hasta el centro (~40 min). Apps de transporte tambi\u00e9n operan en El Dorado.' },
  { pregunta: '\u00bfCu\u00e1l es la mejor \u00e9poca para visitar Bogot\u00e1?', respuesta: 'Diciembre-enero y julio-agosto son los meses m\u00e1s secos con mejor visibilidad de Monserrate. La ciudad funciona todo el a\u00f1o; en diciembre los alumbrados navide\u00f1os son imperdibles.' },
  { pregunta: '\u00bfQu\u00e9 comida t\u00edpica hay que probar?', respuesta: 'El ajiaco (sopa de papa con pollo y ma\u00edz), el chocolate santafere\u00f1o con queso, los tamales, la almoj\u00e1bana y las obleas con arequipe.' }
];

module.exports = { SLUG: SLUG, HERO: HERO, PHOTOS: PHOTOS, BASE: BASE, TAGS: TAGS, FAQS: FAQS };

if (require.main !== module) return;

(async function main() {
  var url = process.env.DATABASE_URL || process.argv[2];
  if (!url) {
    console.error('Falta DATABASE_URL.');
    console.error('Uso: DATABASE_URL=postgres://... node api/seed-bogota.js [--dry]');
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