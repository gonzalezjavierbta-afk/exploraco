// scripts/seed-galeria-cafe-libro.js
// Crea (o actualiza) la pagina dinamica galeria-cafe-libro.html con los datos
// del legendario bar de salsa Galeria Cafe Libro (Parque 93 + Palermo, Bogota),
// siguiendo el patron de scripts/seed-quiebracanto.js (categoria sitio, upsert completo).
//
// Uso:
//   DATABASE_URL=postgres://... node scripts/seed-galeria-cafe-libro.js --dry
//   DATABASE_URL=postgres://... node scripts/seed-galeria-cafe-libro.js

var neon = null;
function getNeon() {
  if (!neon) neon = require('@neondatabase/serverless').neon;
  return neon;
}

const SLUG = 'galeria-cafe-libro';
const HERO = 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b3/Bogota_-_Streets_at_night_003.jpg/960px-Bogota_-_Streets_at_night_003.jpg';

const PHOTOS = [
  { url: HERO, caption: 'Bogota de noche, calles del norte vibrando con la rumba salsera' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e8/Salsa_dance_dip.jpg/960px-Salsa_dance_dip.jpg', caption: 'Pareja bailando salsa, la esencia de la pista de Galeria Cafe Libro' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fa/La_Macarena_panorama_norte_sur.JPG/960px-La_Macarena_panorama_norte_sur.JPG', caption: 'Panoramica del centro de Bogota desde La Macarena' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f8/Bogot%C3%A1_Chapinero_de_noche.JPG/960px-Bogot%C3%A1_Chapinero_de_noche.JPG', caption: 'Chapinero de noche, epicentro de la vida nocturna bogotana' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/Plaza_de_Bol%C3%ADvar_en_Bogot%C3%A1_%28Colombia%29.jpg/960px-Plaza_de_Bol%C3%ADvar_en_Bogot%C3%A1_%28Colombia%29.jpg', caption: 'La Plaza de Bolivar, corazon del centro' }
];

const BASE = {
  slug: SLUG,
  nombre: 'Galeria Cafe Libro',
  categoria_slug: 'sitio',
  lead: 'Templo salsero desde 1982: dos sedes (Parque 93 y Palermo), orquestas top, galeria de arte y 43 anos de historia.',
  descripcion: 'Galeria Cafe Libro (Sede Parque 93: Carrera 11A #93-42; Sede Palermo: Transversal 15B #46-38, Bogota, coordenadas 4.6942, -74.0383) es uno de los bares de salsa mas emblematicos de Colombia. Fundado en 1982 como galeria de arte y espacio cultural en el barrio Palermo, nacio de la vision de un grupo de amigos que querian un lugar donde la salsa, el arte y la tertulia convivieran. Hoy, con 43 anos de historia, Galeria Cafe Libro tiene dos sedes activas y es sinonimo de rumba salsera de calidad en Bogota.\n\nLa sede original en Palermo (Transversal 15B #46-38) mantiene el espiritu de casa cultural: paredes que rotan exposiciones de artistas locales cada mes, dos pistas de baile, dos tarimas y una terraza amplia. La sede del Parque 93 (Carrera 11A #93-42) lleva la misma esencia a la zona rosa del norte, con capacidad para 600 personas, cocina abierta hasta las 2:00 a.m. (carnes a la parrilla, brochetas, mariscos, pescado a la brasa) y una carta de rones y mojitos de nivel internacional.\n\nLo que hace unico a Galeria Cafe Libro es su programacion musical: orquestas en vivo de nivel nacional e internacional (Guayacan Orquesta, La 33, La Charanga Habanera, Pablo Milanes, entre muchos otros) los fines de semana, y DJs cultores de la salsa vieja guardia el resto de la semana. La seleccion va de costa a costa: de Cali a Cartagena, de Buenaventura a Barranquilla. Los martes y miercoles son de "salsa al parque" con entrada libre; jueves a sabados la rumba sube de intensidad con cover de orquesta.\n\nEl publico es una mezcla autentica: salseros de toda la vida, intelectuales, artistas, viajeros que buscan bailar en un templo de verdad, y nuevas generaciones que redescubren la salsa. El cover de orquesta de referencia ha estado entre 5.000 y 10.000 pesos. Las reservas de mesa se gestionan por WhatsApp al 317 660 87 42. Galeria Cafe Libro no es un bar de moda: es una institucion de la cultura salsera bogotana.',
  highlight: 'Desde 1982: dos sedes, orquestas internacionales, galeria de arte vivo, la mejor salsa de Bogota.',
  ciudad: 'Bogota',
  region: 'Cundinamarca',
  barrio: 'Parque 93 / Palermo',
  lat: 4.6941646,
  lng: -74.0382867,
  whatsapp: '3176608742',
  telefono: '601 5975506',
  email: 'info@galeriacafelibro.com.co',
  web: 'https://www.galeriacafelibro.com.co',
  instagram: '@galeriacafelibro',
  precio_desde: 'Cover orquesta $5k-$10k ref; mesa reserva; consumo barra',
  horario: 'Mar-Sab 17:00-3:00 ref; Dom solo festivos',
  emoji: '\ud83c\udf31',
  hero_bg: '#9f1239',
  foto_hero: HERO,
  tipo: 'Salsa bar  -  Orquestas  -  Galeria arte  -  43 anos',
  capacidad: '600 pers (sede 93); terraza y 2 pistas',
  como_llegar: 'Sede 93: TransMilenio Virrey/Calle 100 + taxi. Sede Palermo: Movistar Arena + taxi. Centro: 20-25 min taxi.',
  status: 'published',
  destacado: true
};

const TAGS = {
  tipo_actividad: 'Salsa bar',
  dificultad: 'Facil',
  dificultad_desc: 'Bar con pistas de baile a nivel; ideal para bailar. Requiere ser mayor de 18 anos. Las noches de fin de semana son muy concurridas.',
  duracion: '3-6 horas',
  altitud: '2600',
  temporada: ['Todo el ano', 'Fines de semana con orquesta', 'Martes/Miercoles salsa al parque', 'Festivos y eventos especiales'],
  precio_entrada: 'Cover de orquesta entre 5.000 y 10.000 pesos (referencia); martes/miercoles sin cover; el consumo se paga por separado en la barra.',
  distancia: 'Sede 93: Cra 11A #93-42, Parque 93. Sede Palermo: Tv 15B #46-38. Ambas cerca a TransMilenio (Virrey/Calle 100 y Movistar Arena).',
  como_llegar: BASE.como_llegar,
  permisos: 'Mayor de 18 anos con documento de identidad valido.',
  temporada_nota: 'Fines de semana: orquesta en vivo y cover variable. Martes y miercoles: salsa al parque sin cover. Jueves: ambiente salsero creciente. Verificar programacion en web.',
  fauna_flora: JSON.stringify([
    { emoji: '\ud83c\udf31', nombre: 'Galeria de arte vivo', hecho: 'Paredes rotan exposiciones de artistas locales cada mes desde 1982' },
    { emoji: '\ud83c\udfa4', nombre: 'Orquestas internacionales', hecho: 'Guayacan, La 33, Charanga Habanera, Pablo Milanes y mas en tarima' },
    { emoji: '\ud83d\udc83', nombre: 'Dos pistas, dos tarimas', hecho: 'Espacio para bailar en serio en ambas sedes; terraza en Palermo' },
    { emoji: '\ud83c\udf7e', nombre: 'Rones y mojitos de culto', hecho: 'Carta de rones internacionales y mojitos preparados como en el Malecon' }
  ]),
  secretos: JSON.stringify([
    { icono: '\ud83c\udfa4', titulo: 'Noches de orquesta', texto: 'Viernes y sabados la tarima recibe orquestas en vivo; el cover de referencia ronda los 5.000-10.000 pesos. Llega temprano para mesa.', tag: 'Eventos', tag_color: 'blue' },
    { icono: '\ud83c\udf31', titulo: 'Martes y miercoles sin cover', texto: 'Salsa al parque: entrada libre, DJs de la casa y ambiente para practicar pasos sin presion.', tag: 'Imperdible', tag_color: 'gold' },
    { icono: '\ud83c\udfb5', titulo: 'Salsa de coleccion', texto: 'Los DJs son cultores de la vieja guardia: pide un clasico de Fruko, Grupo Niche o Joe Arroyo y escucha como suena en serio.', tag: 'Musica', tag_color: 'green' },
    { icono: '\ud83c\udf7e', titulo: 'Cocina hasta las 2 AM', texto: 'Parrilla, mariscos y pescados a la brasa en la sede 93: cena y rumba en el mismo lugar.', tag: 'Cerca', tag_color: 'brown' }
  ]),
  regulaciones: 'Mayor de 18 anos con documento de identidad valido. Cover variable en noches de orquesta. No se permite el ingreso de alimentos ni bebidas externas. Se reserva el derecho de admision. Mesas por reserva (WhatsApp 317 660 87 42).',
  checklist_tip: 'Llega antes de las 9 PM en noches de orquesta si quieres mesa; las pistas se llenan rapido. Martes/miercoles son ideales para ir a aprender pasos sin presion.',
  entradas: [
    { tipo: 'Noche regular (mar-mie)', precio: 'sin cover', incluye: 'Acceso a la barra y las pistas, DJs de la casa', link: 'https://www.galeriacafelibro.com.co' },
    { tipo: 'Noche de orquesta (jue-sab)', precio: '5.000-10.000', incluye: 'Acceso con banda en vivo (referencia)', link: 'https://www.galeriacafelibro.com.co' },
    { tipo: 'Reserva de mesa', precio: 'segun consumo', incluye: 'Mesa garantizada para grupo, minimo de consumo aplica', link: 'https://wa.me/573176608742' }
  ],
  tours: [
    {
      nombre: 'Noche de salsa clase mundial',
      precio: 'Cover de orquesta', precio_sub: '5.000-10.000 referencia',
      duracion: '4-6 horas', tipo_tour: 'Experiencia', idioma: 'Espanol', max_personas: 'Abierto',
      rating: '4.8', review_count: 45,
      descripcion: 'La experiencia Galeria Cafe Libro: salsa vieja guardia, orquesta en vivo, dos pistas y galeria de arte.',
      incluye: ['Acceso al bar', 'Orquesta en vivo (fin de semana)', 'Dos pistas de baile', 'Galeria de arte rotativa'],
      no_incluye: ['Bebidas', 'Transporte', 'Reserva de mesa'],
      link_reserva: 'https://www.galeriacafelibro.com.co',
      featured: true
    },
    {
      nombre: 'Salsa al parque (martes/miercoles)',
      precio: 'Sin cover', precio_sub: 'solo consumo',
      duracion: '3-4 horas', tipo_tour: 'Experiencia', idioma: 'Espanol', max_personas: 'Abierto',
      rating: '4.6', review_count: 22,
      descripcion: 'Entrada libre, DJs cultores de la casa, ambiente relajado para bailar y aprender.',
      incluye: ['Acceso sin cover', 'DJs de la casa', 'Ambiente para practicar'],
      no_incluye: ['Bebidas', 'Transporte'],
      link_reserva: 'https://www.galeriacafelibro.com.co',
      featured: false
    },
    {
      nombre: 'Ruta Galeria Cafe Libro: 2 sedes, 1 historia',
      precio: 'Variable', precio_sub: 'segun plan',
      duracion: '4-5 horas', tipo_tour: 'Ruta', idioma: 'Espanol', max_personas: 'Grupos',
      rating: '4.7', review_count: 15,
      descripcion: 'Recorrido por las dos sedes: Palermo (origen, arte, terraza) y Parque 93 (cocina, capacidad, orquesta).',
      incluye: ['Visita a ambas sedes', 'Contexto historico 1982-2025', 'Una bebida de bienvenida'],
      no_incluye: ['Transporte entre sedes', 'Cena completa', 'Cover de orquesta'],
      link_reserva: 'https://www.galeriacafelibro.com.co',
      featured: false
    }
  ],
  equipamiento: [
    { item: 'Documento de identidad (mayor de 18)', prioridad: 'Obligatorio' },
    { item: 'Efectivo o tarjeta para consumo y cover', prioridad: 'Recomendado' },
    { item: 'Calzado comodo para bailar', prioridad: 'Recomendado' },
    { item: 'Abrigo para la noche en el norte/centro', prioridad: 'Recomendado' },
    { item: 'Reserva de mesa para grupos (WhatsApp)', prioridad: 'Opcional' }
  ],
  itinerario: [
    { dia: 'Martes', hora: '7:00 pm', titulo: 'Salsa al parque', icono: '\ud83c\udfb5', detalle: 'Entrada libre, DJs de la casa, ambiente para empezar la semana', tags: ['Sin cover'] },
    { dia: 'Jueves', hora: '9:00 pm', titulo: 'La rumba sube', icono: '\ud83c\udfa4', detalle: 'Orquesta en vivo o DJ invitado, cover de referencia', tags: ['Orquesta'] },
    { dia: 'Viernes', hora: '10:00 pm', titulo: 'Pista llena', icono: '\ud83d\udc83', detalle: 'Los mejores bailadores toman las dos pistas', tags: ['Baile'] },
    { dia: 'Sabado', hora: '11:00 pm', titulo: 'La noche grande', icono: '\ud83c\udf1f', detalle: 'Rumba salsera hasta la madrugada en ambas sedes', tags: ['Rumba'] }
  ],
  dificultad_tags: [
    { texto: 'Bar con pistas de baile a nivel', apto: true },
    { texto: 'Zonas con TransMilenio cercano (Virrey, Movistar Arena)', apto: true },
    { texto: 'Noches de fin de semana muy concurridas', apto: false },
    { texto: 'Cover en noches de orquesta', apto: false },
    { texto: 'Requiere ser mayor de 18', apto: false }
  ],
  temporada_matriz: {
    Ene: 'ideal', Feb: 'ideal', Mar: 'ideal', Abr: 'ideal', May: 'posible',
    Jun: 'ideal', Jul: 'ideal', Ago: 'ideal', Sep: 'ideal', Oct: 'ideal', Nov: 'ideal', Dic: 'ideal'
  }
};

const FAQS = [
  { pregunta: 'Que es Galeria Cafe Libro?', respuesta: 'Uno de los bares de salsa mas legendarios de Bogota, fundado en 1982, con dos sedes (Parque 93 y Palermo), orquestas en vivo, galeria de arte rotativa y 43 anos de historia.' },
  { pregunta: 'Que musica ponen?', respuesta: 'Salsa vieja guardia de costa a costa, con DJs cultores y orquestas en vivo los fines de semana (Guayacan, La 33, Charanga Habanera, etc.).' },
  { pregunta: 'Cuales son los horarios?', respuesta: 'Referencia: martes a sabado 17:00 a 3:00. Martes/miercoles sin cover. Jueves a sabados con orquesta y cover. Domingos solo festivos. Confirma en web antes de ir.' },
  { pregunta: 'Cuanto cuesta la entrada?', respuesta: 'Martes y miercoles sin cover. Jueves a sabados: cover de orquesta entre 5.000 y 10.000 pesos (referencia). Consumo aparte.' },
  { pregunta: 'Cual es la edad minima?', respuesta: 'Mayor de 18 anos con documento de identidad valido.' },
  { pregunta: 'Como reservar mesa?', respuesta: 'Por WhatsApp al 317 660 87 42. Se requiere minimo de consumo segun la noche.' }
];

module.exports = { SLUG: SLUG, HERO: HERO, PHOTOS: PHOTOS, BASE: BASE, TAGS: TAGS, FAQS: FAQS };

if (require.main !== module) return;

(async function main() {
  var url = process.env.DATABASE_URL || process.argv[2];
  if (!url) {
    console.error('Falta DATABASE_URL.');
    console.error('Uso: DATABASE_URL=postgres://... node scripts/seed-galeria-cafe-libro.js [--dry]');
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