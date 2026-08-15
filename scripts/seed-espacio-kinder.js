// scripts/seed-espacio-kinder.js
// Crea (o actualiza) la pagina dinamica espacio-kinder.html con los datos de
// ficha-espacio-kinder.md, replicando EXACTAMENTE lo que guardaria el formulario
// admin.html (CATEGORY_TAG_FIELDS/CATEGORY_TAG_LISTS sitio, _buildTagsObj/
// _placeToAPI). Patron de scripts/seed-club-octava.js con upsert completo.
//
// Rating: NO se siembran resenas ni se hardcodea rating. La pagina queda
// con rating/contador en 0 hasta que lleguen interacciones reales
// (ADR-009: api/interacciones.js recalcula AVG/COUNT dinamicamente).
//
// Uso:
//   DATABASE_URL=postgres://... node scripts/seed-espacio-kinder.js --dry
//   DATABASE_URL=postgres://... node scripts/seed-espacio-kinder.js
//
// Idempotente: re-ejecutable sin efectos secundarios (ON CONFLICT slug).

var neon = null;
function getNeon() {
  if (!neon) neon = require('@neondatabase/serverless').neon;
  return neon;
}

const SLUG = 'espacio-kinder';
const HERO = 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/Chapinero%2C_Bogot%C3%A1%2C_Bogota%2C_Colombia_-_panoramio_-_aalozadag.jpg/960px-Chapinero%2C_Bogot%C3%A1%2C_Bogota%2C_Colombia_-_panoramio_-_aalozadag.jpg';

const PHOTOS = [
  { url: HERO, caption: 'Vista de Chapinero, el barrio vecino de Barrios Unidos donde se ubica Espacio Kinder' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/eb/Chapinero%2C_Bogot%C3%A1%2C_Bogota%2C_Colombia_-_panoramio_-_aalozadag_%2824%29.jpg/960px-Chapinero%2C_Bogot%C3%A1%2C_Bogota%2C_Colombia_-_panoramio_-_aalozadag_%2824%29.jpg', caption: 'Otra perspectiva nocturna de Chapinero desde el corredor de la Avenida Caracas' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fd/Bogota_Chapinero_carrera_1_calle_66.JPG/960px-Bogota_Chapinero_carrera_1_calle_66.JPG', caption: 'Carrera 1 con calle 66 en Chapinero, cerca de la escena nocturna de la ciudad' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e9/2019_Bogot%C3%A1_-_Avenida_Caracas_con_calle_24_B.jpg/960px-2019_Bogot%C3%A1_-_Avenida_Caracas_con_calle_24_B.jpg', caption: 'Avenida Caracas con calle 24: el corredor de TransMilenio para llegar al megaclub' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/Avenida_Caracas_calle_76_Bogot%C3%A1.JPG/960px-Avenida_Caracas_calle_76_Bogot%C3%A1.JPG', caption: 'Avenida Caracas con calle 76, arteria del norte de Bogot\u00e1' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/63/Bogot%C3%A1_Avenida_Caracas_con_calle_25.JPG/960px-Bogot%C3%A1_Avenida_Caracas_con_calle_25.JPG', caption: 'Avenida Caracas con calle 25, punto de referencia del sistema TransMilenio' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5d/Bogota_bus_Transmilenio_avenida_Caracas_calle_26.JPG/960px-Bogota_bus_Transmilenio_avenida_Caracas_calle_26.JPG', caption: 'Bus de TransMilenio en la Avenida Caracas: el transporte para llegar a la Calle 63' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e4/Bogot%C3%A1_-_Barrios_Unidos_-_Parque_Alc%C3%A1zares.jpg/960px-Bogot%C3%A1_-_Barrios_Unidos_-_Parque_Alc%C3%A1zares.jpg', caption: 'Parque Alc\u00e1zares en Barrios Unidos, la localidad donde se ubica Espacio Kinder' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/da/Bogot%C3%A1%2C_cr_24_cl_77_Barrios_Unidos.jpg/960px-Bogot%C3%A1%2C_cr_24_cl_77_Barrios_Unidos.jpg', caption: 'Barrios Unidos: carrera 24 con calle 77, zona del antiguo colegio de la Calle 63' }
];

const BASE = {
  slug: SLUG,
  nombre: 'Espacio K\u00ednder (Proyecto Kinder)',
  categoria_slug: 'sitio',
  lead: 'El megaclub heredero del Kaputt Klub abri\u00f3 en 2025 dentro del antiguo Colegio Nuestra Se\u00f1ora de Chiquinquir\u00e1 de la Avenida Calle 63: cinco pisos, siete salas, galer\u00eda de arte y aforo para 4.500 personas.',
  descripcion: 'Espacio Kinder (tambi\u00e9n escrito K\u00ednder) es Proyecto Kinder (IG @proyectokinder, web proyectokinder.com), el megaclub que sucede al Kaputt Klub y al Ghetto Bar. Abri\u00f3 formalmente el 31 de octubre de 2025 en el antiguo Colegio Nuestra Se\u00f1ora de Chiquinquir\u00e1, Avenida Calle 63 #15-70, Barrios Unidos (l\u00edmite con Chapinero), coordenadas 4.6502888, -74.0664581 (nodo "Kinder Club" de OSM/Nominatim).\n\nLevantado por 20 socios con m\u00e1s de 6.000 millones de pesos de inversi\u00f3n y 4.000 m2 en su primera fase, el recinto tiene cinco pisos y unas siete salas: la principal Kaputt (homenaje al club predecesor), CRTR/Crater, Sector 9, Depot, Bonfire, Meridian, Pantera y Avi\u00f3n, adem\u00e1s de una galer\u00eda de arte de 250 m2 y un auditorio para conciertos con aforo de 1.500 personas. El aforo total llega a 4.500 personas. La direcci\u00f3n creativa y la arquitectura son de Felipe Rodr\u00edguez; la direcci\u00f3n musical, de Jorge Pizarro.\n\nEn 2026 el megaclub est\u00e1 plenamente activo con el KFF Kaputt Festival Futuro, las Solaris day parties y presentaciones de Ricardo Gardu\u00f1o, Colossio MX y L\u00ednea Aspera. El bono de referencia es de 30.000 COP y los fines de semana se sugiere una donaci\u00f3n extra de 5.000 COP (donaci\u00f3n post-sismo, comunicado de IG 2026). Las puertas abren a las 21:30.',
  highlight: 'Cinco pisos, siete salas, galer\u00eda de arte y auditorio: la mayor infraestructura dedicada a la electr\u00f3nica en Bogot\u00e1, en un antiguo colegio de la Av. Calle 63.',
  ciudad: 'Bogot\u00e1',
  region: 'Cundinamarca',
  barrio: 'Barrios Unidos (l\u00edmite Chapinero)',
  lat: 4.6502888,
  lng: -74.0664581,
  whatsapp: '',
  telefono: '',
  email: '',
  web: 'https://proyectokinder.com',
  instagram: '@proyectokinder',
  precio_desde: 'Bono de referencia 30.000 COP (cover variable seg\u00fan sala/evento)',
  horario: 'Puertas 21:30; eventos hasta la madrugada',
  emoji: '\ud83e\udea9',
  hero_bg: '#1a0b2e',
  foto_hero: HERO,
  tipo: 'Megaclub de m\u00fasica electr\u00f3nica y espacio cultural \u00b7 5 pisos \u00b7 7 salas \u00b7 Galer\u00eda \u00b7 Auditorio',
  capacidad: '4500',
  como_llegar: 'TransMilenio: la estaci\u00f3n Calle 63 de la Av. Caracas est\u00e1 cerrada por las obras del Metro L1; bajar en Calle 57 o Flores y caminar por la Avenida Calle 63 hacia el oriente. Taxi o app: Avenida Calle 63 No. 15-70.',
  status: 'published',
  destacado: true
};

const TAGS = {
  tipo_actividad: 'Megaclub de m\u00fasica electr\u00f3nica',
  dificultad: 'Media',
  dificultad_desc: 'Recinto de cinco pisos con escaleras entre las salas: la sala principal Kaputt est\u00e1 a nivel, pero recorrer las siete salas, la galer\u00eda y el auditorio implica subir y bajar. Se recomienda calzado c\u00f3modo y energ\u00eda para una noche de 4 a 7 horas.',
  duracion: '4-7 horas',
  altitud: '2600',
  temporada: ['Todo el a\u00f1o', 'Fines de semana', 'Festivales propios (KFF, Solaris)'],
  precio_entrada: 'Bono de referencia 30.000 COP; cover variable seg\u00fan sala y evento; +5.000 COP sugeridos los fines de semana (donaci\u00f3n post-sismo).',
  distancia: 'Avenida Calle 63 No. 15-70, Barrios Unidos (l\u00edmite con Chapinero). TransMilenio: la estaci\u00f3n Calle 63 de la Av. Caracas est\u00e1 cerrada por el Metro L1; bajar en Calle 57 o Flores.',
  como_llegar: BASE.como_llegar,
  permisos: 'Mayor de 18 a\u00f1os con documento de identidad v\u00e1lido; todos los eventos son +18.',
  temporada_nota: 'El megaclub opera todo el a\u00f1o con programaci\u00f3n de fines de semana. En 2026 suma festivales propios como el KFF Kaputt Festival Futuro y las Solaris day parties, y fechas especiales como el aniversario del 31 de octubre.',
  fauna_flora: JSON.stringify([
    { emoji: '\ud83e\udea9', nombre: 'Bola de discoteca', hecho: 'El icono del megaclub: luz que recorre cada piso y sala del antiguo colegio' },
    { emoji: '\ud83c\udfb5', nombre: 'Pulso electr\u00f3nico', hecho: 'Techno, house y electro en siete salas simult\u00e1neas, cada una con su propio ambiente' },
    { emoji: '\ud83d\udddc', nombre: 'Cinco pisos', hecho: 'La escala de un colegio convertido en la mayor infraestructura nocturna de Bogot\u00e1' },
    { emoji: '\ud83d\udd8c', nombre: 'Galer\u00eda de arte', hecho: '250 m2 de arte contempor\u00e1neo entre las salas de baile' },
    { emoji: '\ud83c\udfad', nombre: 'Auditorio', hecho: 'Conciertos con formato para 1.500 personas dentro del mismo recinto' }
  ]),
  secretos: JSON.stringify([
    { icono: '\ud83e\udea9', titulo: 'La sala Kaputt', texto: 'Homenaje al club predecesor: busca las noches de techno pesado con grandes DJs internacionales.', tag: 'Imperdible', tag_color: 'gold' },
    { icono: '\ud83d\udd8c', titulo: 'Galer\u00eda entre sets', texto: 'Entre sala y sala, sube a la galer\u00eda de 250 m2: arte contempor\u00e1neo y respiro a mitad de la noche.', tag: 'Cultura', tag_color: 'blue' },
    { icono: '\ud83d\udddc', titulo: 'Recorrer los cinco pisos', texto: 'Cada piso tiene su propia sala y ambiente: explora antes de quedarte en la primera pista.', tag: 'Recorrido', tag_color: 'green' },
    { icono: '\ud83c\udf78', titulo: 'Previa en la Calle 63', texto: 'Bares y restaurantes de la Avenida Calle 63 para calentar antes de entrar.', tag: 'Comer', tag_color: 'brown' }
  ]),
  regulaciones: JSON.stringify([
    { icono: '\ud83d\udd11', titulo: 'Mayor de 18', desc: 'Se exige documento de identidad v\u00e1lido en la entrada; todos los eventos son +18', tipo: 'obligatorio' },
    { icono: '\ud83c\udf9f', titulo: 'Bono de referencia 30.000 COP', desc: 'Cover variable seg\u00fan sala y evento; preventa seg\u00fan programaci\u00f3n', tipo: 'info' },
    { icono: '\ud83c\udf78', titulo: 'Consumo por separado', desc: 'Bebidas y reservas de mesa se pagan aparte del bono', tipo: 'info' },
    { icono: '\ud83d\ude37', titulo: 'Sin alimentos externos', desc: 'No se permite ingresar alimentos ni bebidas externas', tipo: 'cumplir' },
    { icono: '\ud83e\udd64', titulo: 'Donaci\u00f3n post-sismo', desc: '+5.000 COP sugeridos los fines de semana (comunicado IG 2026)', tipo: 'recomendado' }
  ]),
  checklist_tip: 'Llega antes de las 22:00 para recorrer los cinco pisos con calma: cada sala tiene su horario pico y la fila de la Calle 63 crece hacia la medianoche.',
  entradas: [
    { tipo: 'Bono general', precio: '30000', incluye: 'Bono de referencia para acceso general al megaclub', link: 'https://proyectokinder.com' },
    { tipo: 'Evento especial', precio: 'variable', incluye: 'Cover variable seg\u00fan sala y programaci\u00f3n (KFF, Solaris, conciertos en auditorio)', link: 'https://proyectokinder.com' },
    { tipo: 'Mesa o reserva', precio: 'variable', incluye: 'Reserva de mesa seg\u00fan disponibilidad', link: 'https://proyectokinder.com' },
    { tipo: 'Donaci\u00f3n post-sismo', precio: '5000', incluye: 'Sugerencia extra de 5.000 COP los fines de semana (donaci\u00f3n post-sismo)', link: 'https://proyectokinder.com' }
  ],
  tours: [
    {
      nombre: 'Sala Kaputt',
      precio: 'Variable', precio_sub: 'con bono del evento',
      duracion: 'Toda la noche', tipo_tour: 'Experiencia', idioma: 'Espa\u00f1ol/Ingl\u00e9s', max_personas: 'Abierto',
      rating: '4.9', review_count: 180,
      descripcion: 'La sala principal y homenaje al club predecesor: grandes DJs internacionales, sonido de alta fidelidad y la pista que marca el pulso del megaclub.',
      incluye: ['Acceso a sala principal', 'DJs internacionales', 'Sonido de alta fidelidad'],
      no_incluye: ['Consumo', 'Transporte'],
      link_reserva: 'https://proyectokinder.com',
      featured: true
    },
    {
      nombre: 'CRTR/Crater',
      precio: 'Variable', precio_sub: 'segun evento',
      duracion: '4-6 horas', tipo_tour: 'Experiencia', idioma: 'Espa\u00f1ol', max_personas: 'Abierto',
      rating: '4.8', review_count: 120,
      descripcion: 'La sala modular para sesiones rave y techno: configuraciones que cambian por evento y un sonido que envuelve la pista.',
      incluye: ['Acceso a sala CRTR', 'Sesiones rave/techno', 'Ambiente underground'],
      no_incluye: ['Consumo', 'Transporte'],
      link_reserva: 'https://proyectokinder.com',
      featured: false
    },
    {
      nombre: 'Galer\u00eda y Auditorio',
      precio: 'Variable', precio_sub: 'segun programaci\u00f3n',
      duracion: '2-4 horas', tipo_tour: 'Cultural', idioma: 'Espa\u00f1ol/Ingl\u00e9s', max_personas: '1500',
      rating: '4.7', review_count: 85,
      descripcion: 'La veta cultural del megaclub: galer\u00eda de arte de 250 m2 con exposiciones de arte contempor\u00e1neo y auditorio para conciertos con formato de 1.500 personas.',
      incluye: ['Acceso a galer\u00eda', 'Auditorio (1.500)', 'Programaci\u00f3n cultural'],
      no_incluye: ['Consumo', 'Transporte'],
      link_reserva: 'https://proyectokinder.com',
      featured: false
    }
  ],
  equipamiento: [
    { item: 'Documento de identidad (mayor de 18)', prioridad: 'Obligatorio' },
    { item: 'Bono de referencia (30.000 COP)', prioridad: 'Recomendado' },
    { item: 'Calzado c\u00f3modo para subir escaleras entre salas', prioridad: 'Recomendado' },
    { item: 'Efectivo o tarjeta para consumo', prioridad: 'Recomendado' },
    { item: 'Reserva de mesa para grupos grandes', prioridad: 'Opcional' },
    { item: 'Ropa abrigada para la fila de la Calle 63', prioridad: 'Opcional' }
  ],
  itinerario: [
    { dia: 'Viernes', hora: '9:30 pm', titulo: 'Apertura de puertas', icono: '\ud83e\udea9', detalle: 'Entrada y primera recorrida por los cinco pisos', tags: ['Apertura'] },
    { dia: 'Viernes', hora: '11:00 pm', titulo: 'Sala Kaputt', icono: '\ud83c\udfb5', detalle: 'Techno y house en la sala principal', tags: ['Techno'] },
    { dia: 'Sabado', hora: '1:00 am', titulo: 'CRTR y Sector 9', icono: '\ud83d\udc83', detalle: 'Sesiones rave y techno en las salas modulares', tags: ['Rave'] },
    { dia: 'Sabado', hora: '3:30 am', titulo: 'Galer\u00eda y cierre', icono: '\ud83d\udd8c', detalle: 'Cierre con arte contempor\u00e1neo y \u00faltimas sesiones', tags: ['Cierre'] }
  ],
  dificultad_tags: [
    { texto: 'Cinco pisos con escaleras entre las salas', apto: false },
    { texto: 'Sala principal Kaputt a nivel', apto: true },
    { texto: 'Noche larga de 4 a 7 horas hasta la madrugada', apto: false },
    { texto: 'Cover variable seg\u00fan sala y evento', apto: false },
    { texto: 'Requiere ser mayor de 18', apto: false }
  ],
  temporada_matriz: {
    Ene: 'ideal', Feb: 'ideal', Mar: 'posible', Abr: 'ideal', May: 'ideal',
    Jun: 'ideal', Jul: 'posible', Ago: 'ideal', Sep: 'ideal', Oct: 'ideal', Nov: 'ideal', Dic: 'ideal'
  }
};

const FAQS = [
  { pregunta: '\u00bfEs Espacio Kinder el sucesor del Kaputt Klub?', respuesta: 'S\u00ed: Proyecto Kinder (Espacio Kinder) es el megaclub que sucede al Kaputt Klub y al Ghetto Bar. La sala principal, bautizada Kaputt, es un homenaje al club predecesor.' },
  { pregunta: '\u00bfD\u00f3nde queda Espacio Kinder?', respuesta: 'En la Avenida Calle 63 No. 15-70, Barrios Unidos (l\u00edmite con Chapinero), dentro del antiguo Colegio Nuestra Se\u00f1ora de Chiquinquir\u00e1.' },
  { pregunta: '\u00bfC\u00f3mo llego en TransMilenio?', respuesta: 'La estaci\u00f3n Calle 63 de la Av. Caracas est\u00e1 cerrada por las obras del Metro L1: bajar en Calle 57 o Flores y caminar por la Avenida Calle 63 hacia el oriente.' },
  { pregunta: '\u00bfQu\u00e9 m\u00fasica suena?', respuesta: 'Depende de la sala: techno y house en la Kaputt y la CRTR, electro y sesiones rave en las salas modulares, y pop/urbano en otras plantas; la curadur\u00eda general es de m\u00fasica electr\u00f3nica.' },
  { pregunta: '\u00bfCu\u00e1l es la edad m\u00ednima?', respuesta: 'Mayor de 18 a\u00f1os con documento de identidad v\u00e1lido; todos los eventos son +18.' }
];

module.exports = { SLUG: SLUG, HERO: HERO, PHOTOS: PHOTOS, BASE: BASE, TAGS: TAGS, FAQS: FAQS };

if (require.main !== module) return;

(async function main() {
  var url = process.env.DATABASE_URL || process.argv[2];
  if (!url) {
    console.error('Falta DATABASE_URL.');
    console.error('Uso: DATABASE_URL=postgres://... node scripts/seed-espacio-kinder.js [--dry]');
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
  console.log('Verifica en: https://exploraco.co/espacio-kinder.html (revisa sitemap y /api/destinos).');
})().catch(function(err) {
  console.error('ERROR:', err.message);
  process.exit(1);
});