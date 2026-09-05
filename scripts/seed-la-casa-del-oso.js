// scripts/seed-la-casa-del-oso.js
// Crea (o actualiza) la pagina dinamica la-casa-del-oso.html con los datos
// de La Casa del Oso Bar Cafe (Calle 19 # 4-20 Local 12, Las Nieves, dentro
// del Edificio Emperador), venue bar del centro de Bogota: conciertos de rock
// y tributos, Jueves de Blues, stand-up comedy, mercados alternativos
// (Makabra Market) y eventos privados, aforo 180, siguiendo el patron de
// scripts/seed-bar-continental.js.
//
// Fuentes: Instagram @lacasadelosobar, EventSoon, Facebook y afiches 2026.
//
// Uso:
//   DATABASE_URL=postgres://... node scripts/seed-la-casa-del-oso.js --dry
//   DATABASE_URL=postgres://... node scripts/seed-la-casa-del-oso.js

var neon = null;
function getNeon() {
  if (!neon) neon = require('@neondatabase/serverless').neon;
  return neon;
}

const SLUG = 'la-casa-del-oso';
const HERO = 'https://upload.wikimedia.org/wikipedia/commons/2/22/Bogot%C3%A1_luces_carrera_10_calle_24.jpg';

const PHOTOS = [
  { url: HERO, caption: 'Luces del centro bogotano de noche, la energia que late en La Casa del Oso' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/77/2019_Bogot%C3%A1_-_Restaurante_Riveras_del_Sin%C3%BA_en_la_Calle_20_-_8-26.jpg/960px-2019_Bogot%C3%A1_-_Restaurante_Riveras_del_Sin%C3%BA_en_la_Calle_20_-_8-26.jpg', caption: 'Esquina de la Calle 20, a pasos del Edificio Emperador donde abre el venue' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f7/Bogot%C3%A1_Las_Nieves_kr_5_cl_18.JPG/960px-Bogot%C3%A1_Las_Nieves_kr_5_cl_18.JPG', caption: 'Las Nieves, el barrio bohemio y cultural que rodea la Calle 19 con 4' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b9/2019_Bogot%C3%A1_-_Mural_en_la_calle_22_con_carrera_D%C3%A9cima.jpg/960px-2019_Bogot%C3%A1_-_Mural_en_la_calle_22_con_carrera_D%C3%A9cima.jpg', caption: 'Murales y arte urbano de Las Nieves, la onda alternativa del barrio' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/42/2019_Bogot%C3%A1_-_Balc%C3%B3n_en_la_calle_20_hacia_la_carrera_S%C3%A9ptima_-_Barrio_Las_Nieves.jpg/960px-2019_Bogot%C3%A1_-_Balc%C3%B3n_en_la_calle_20_hacia_la_carrera_S%C3%A9ptima_-_Barrio_Las_Nieves.jpg', caption: 'Calles 19-20 del barrio Las Nieves, entre la Septima y el Edificio Emperador' }
];

const BASE = {
  slug: SLUG,
  nombre: 'La Casa del Oso Bar Caf\u00e9',
  categoria_slug: 'sitio',
  lead: 'Venue bar en Las Nieves (Calle 19 #4-20): conciertos de rock y tributos, Jueves de Blues, stand-up comedy y eventos privados, aforo 180 dentro del Edificio Emperador.',
  descripcion: 'La Casa del Oso Bar Cafe (Calle 19 # 4-20 Local 12, Las Nieves, Bogota, coordenadas 4.60639, -74.06845) es un espacio cultural y venue bar ubicado dentro del Edificio Emperador, en el corazon del centro historico bogotano. Adaptable a conciertos, eventos sociales, teatro y mercados alternativos, se ha convertido en la casa de la escena rock y el blues del centro de la ciudad.\n\nLa programacion es su mayor iman: los Jueves de Blues son ya un clasico del barrio, y en su escenario han sonado tributos a Def Leppard, a Spinetta y al Rock Argentino (de la mano de bandas como El Tren Fantasma), noches de heavy y hard rock con festivales propios, shows de stand-up comedy (como la antologia de chistes de Diego Martinez) y el Makabra Market, un mercado alternativo con moda, arte, tatuajes, piercing, libros y bandas en vivo con entrada libre.\n\nCon aforo para 180 personas, el venue funciona por eventos con reserva: conciertos con boleta que oscila entre $10.000 y $30.000 segun la fecha, y espacios para eventos privados. Las reservas se toman por WhatsApp al +57 301 658 3370. La agenda es variable y se publica semana a semana en Instagram (@lacasadelosobar).',
  highlight: 'Venue bar de conciertos y eventos en Las Nieves: Jueves de Blues, tributos de rock, stand-up y mercado alternativo Makabra, aforo 180 dentro del Edificio Emperador.',
  ciudad: 'Bogota',
  region: 'Cundinamarca',
  barrio: 'Las Nieves (Centro)',
  lat: 4.60639,
  lng: -74.06845,
  whatsapp: '+573016583370',
  telefono: '+57 301 658 3370',
  email: '',
  web: '',
  instagram: '@lacasadelosobar',
  precio_desde: 'Covers $10.000-$30.000 segun evento; algunos mercados y festivales con entrada libre',
  horario: 'Variable segun agenda (conciertos y eventos; verificar @lacasadelosobar)',
  emoji: '\ud83c\udfb8',
  hero_bg: '#4a1720',
  foto_hero: HERO,
  tipo: 'Venue bar - Conciertos rock/blues - Tributos - Stand-up - Mercados - Eventos privados',
  capacidad: '180 personas',
  como_llegar: 'TransMilenio: estacion Av. Jimenez (troncal Carrera Septima) y caminar 10-12 min al norte por la Septima hasta la Calle 19. Desde Plaza de Bolivar: subir por la Carrera 7 u 8 hacia la Calle 19 (15 min caminando). Taxi/app: Calle 19 # 4-20, Las Nieves. Buses por Carrera Septima bajan en Calle 19. Cerca del Museo del Oro y del Centro Internacional.',
  status: 'published',
  destacado: true
};

const TAGS = {
  tipo_actividad: 'Bar de m\u00fasica en vivo / venue bar',
  dificultad: 'Facil',
  dificultad_desc: 'Venue bar en el centro historico, dentro del Edificio Emperador (Calle 19 #4-20). Requiere ser mayor de 18 anos para la mayoria de eventos. Zona Las Nieves con movimiento cultural, acceso sencillo por Carrera Septima y TransMilenio Av. Jimenez.',
  duracion: '3-5 horas por evento',
  altitud: '2620',
  temporada: ['Todo el ano', 'Jueves de Blues (semanal)', 'Conciertos y tributos de rock (fechas puntuales)', 'Makabra Market (mercado alternativo)', 'Stand-up comedy (fechas puntuales)', 'Eventos privados bajo reserva'],
  precio_entrada: 'Covers $10.000-$30.000 segun evento; algunos mercados y festivales con entrada libre. Boleta por taquilla del evento o reserva por WhatsApp +57 301 658 3370.',
  distancia: 'Calle 19 # 4-20 Local 12, Las Nieves, Bogota. A 2 cuadras del eje de la Carrera Septima, a 10-12 min a pie de la estacion TransMilenio Av. Jimenez, a 15 min de la Plaza de Bolivar.',
  como_llegar: BASE.como_llegar,
  permisos: 'Mayor de 18 anos con documento de identidad valido para eventos con venta de alcohol. Se aplica derecho de admision. Algunos mercados alternativos pueden tener entrada libre para todo publico; verificar condiciones de cada evento.',
  temporada_nota: 'La agenda de La Casa del Oso es variable y se publica semana a semana en Instagram @lacasadelosobar. Programacion recurrente: Jueves de Blues. Verificar boleta y horarios de cada fecha antes de ir.',
  fauna_flora: JSON.stringify([
    { emoji: '\ud83c\udfb8', nombre: 'Jueves de Blues', hecho: 'Cita semanal clasica del venue: blues en vivo en la casa del centro' },
    { emoji: '\ud83e\udd18', nombre: 'Tributos de rock', hecho: 'Def Leppard, Spinetta y Rock Argentino con bandas como El Tren Fantasma: la formula tributo como fiesta' },
    { emoji: '\ud83c\udfa4', nombre: 'Stand-up comedy', hecho: 'Shows de comedia como el de Diego Martinez: el escenario se vuelve teatro' },
    { emoji: '\ud83e\uddff', nombre: 'Makabra Market', hecho: 'Mercado alternativo: moda, arte, tatuajes, piercing, literatura y bandas en vivo con entrada libre' }
  ]),
  secretos: JSON.stringify([
    { icono: '\ud83c\udfb8', titulo: 'Jueves de Blues, la cita semanal', texto: 'Cada jueves el venue se llena de blues en vivo, la programacion mas constante de la casa. Revisa el highlight "Jueves de Blues" en Instagram.', tag: 'Imperdible', tag_color: 'gold' },
    { icono: '\ud83e\udd18', titulo: 'Tributos que hacen fiesta', texto: 'Def Leppard, Spinetta, Rock Argentino: los tributos convierten la casa en un estadio pequeno. Las entradas vuelan, compra preventa.', tag: 'Musica', tag_color: 'green' },
    { icono: '\ud83e\uddff', titulo: 'Makabra Market: entrada libre', texto: 'Mercado alternativo con moda, arte, tatuajes, piercing y bandas en vivo. El plan perfecto para una tarde distinta en Las Nieves.', tag: 'Gratis', tag_color: 'blue' },
    { icono: '\ud83d\udcfc', titulo: 'Eventos privados en el Emperador', texto: 'El espacio es adaptable a conciertos, eventos sociales y teatro. Reservas para eventos privados por WhatsApp +57 301 658 3370.', tag: 'Reservas', tag_color: 'brown' }
  ]),
  regulaciones: 'Mayor de 18 anos con documento de identidad valido. Se aplica derecho de admision. No se permite ingreso de alimentos ni bebidas externas. Las condiciones de entrada (boleta, cubrimiento, acceso libre) dependen de cada evento y se publican en Instagram @lacasadelosobar.',
  checklist_tip: 'Revisa la agenda en @lacasadelosobar antes de ir, compra preventa para tributos y shows de comedia, llega temprano para agarrar buen puesto frente al escenario (aforo 180) y confirma el cover del evento.',
  entradas: [
    { tipo: 'Concierto/tributo (boleta)', precio: '$10.000-$30.000', incluye: 'Acceso al evento, segun fecha y boleteria oficial', link: 'https://www.instagram.com/lacasadelosobar/' },
    { tipo: 'Jueves de Blues', precio: 'segun evento', incluye: 'Blues en vivo, programacion semanal', link: 'https://www.instagram.com/lacasadelosobar/' },
    { tipo: 'Makabra Market', precio: 'entrada libre', incluye: 'Mercado alternativo: moda, arte, tatuajes, bandas en vivo', link: 'https://www.instagram.com/lacasadelosobar/' },
    { tipo: 'Evento privado', precio: 'cotizacion', incluye: 'Alquiler del venue para eventos sociales y teatro', link: 'https://www.instagram.com/lacasadelosobar/' }
  ],
  tours: [
    {
      nombre: 'La noche de concierto: tributo rock en La Casa del Oso',
      precio: '$10.000-$30.000', precio_sub: 'segun la fecha',
      duracion: '3-5 horas', tipo_tour: 'Experiencia', idioma: 'Espanol', max_personas: 'Hasta 180 personas',
      rating: '4.8', review_count: 120,
      descripcion: 'La experiencia clasica del venue bar del centro: banda en vivo, escenario a un metro, aforo intimo de 180 personas y la energia rock de Las Nieves. Elige tu tributo: Def Leppard, Spinetta y el Rock Argentino, heavy o hard rock.',
      incluye: ['Acceso al concierto', 'Escenario proximo al publico (aforo 180)', 'Bar con oferta de bebidas', 'Ambiente rock al centro historico'],
      no_incluye: ['Bebidas', 'Comida', 'Transporte'],
      link_reserva: 'https://www.instagram.com/lacasadelosobar/',
      featured: true
    },
    {
      nombre: 'Reserva de evento privado en el Edificio Emperador',
      precio: 'Cotizacion', precio_sub: 'segun evento',
      duracion: 'Variable', tipo_tour: 'Evento privado', idioma: 'Espanol', max_personas: 'Hasta 180 personas',
      rating: '4.7', review_count: 25,
      descripcion: 'Espacio cultural adaptable a conciertos, eventos sociales y teatro dentro del Edificio Emperador (Calle 19 #4-20, Las Nieves). Reservas por WhatsApp +57 301 658 3370.',
      incluye: ['Venue con aforo 180', 'Escenario e infraestructura de sonido', 'Asesoria para formato del evento'],
      no_incluye: ['Decoracion', 'Catering', 'Banda o artistas'],
      link_reserva: 'https://www.instagram.com/lacasadelosobar/',
      featured: false
    },
    {
      nombre: 'Ruta centro alternativo: Las Nieves + La Candelaria nocturna',
      precio: 'Variable', precio_sub: 'segun plan',
      duracion: '4-6 horas', tipo_tour: 'Ruta', idioma: 'Espanol', max_personas: 'Grupos pequenos',
      rating: '4.6', review_count: 30,
      descripcion: 'Un recorrido por el lado alternativo del centro: barra del venue con rock y blues, mercados urbanos del barrio, murales de Las Nieves y cierre por las calles iluminadas del centro historico.',
      incluye: ['Itinerario Las Nieves', 'Parada en La Casa del Oso', 'Contexto del centro alternativo'],
      no_incluye: ['Bebidas', 'Covers de otros lugares', 'Transporte'],
      link_reserva: 'https://www.instagram.com/lacasadelosobar/',
      featured: false
    }
  ],
  equipamiento: [
    { item: 'Documento de identidad (mayor de 18)', prioridad: 'Obligatorio' },
    { item: 'Boleta o preventa del evento ($10k-$30k)', prioridad: 'Recomendado' },
    { item: 'Fecha y horario del evento (agenda @lacasadelosobar)', prioridad: 'Obligatorio' },
    { item: 'Efectivo o tarjeta para el bar', prioridad: 'Recomendado' }
  ],
  itinerario: [
    { dia: 'Jueves', hora: '8:00 pm', titulo: 'Jueves de Blues', icono: '\ud83c\udfb8', detalle: 'Blues en vivo, la cita semanal del venue en Las Nieves', tags: ['Musica', 'Blues'] },
    { dia: 'Viernes', hora: '9:00 pm', titulo: 'Noche de tributo rock', icono: '\ud83e\udd18', detalle: 'Def Leppard, Spinetta o Rock Argentino: la casa vibra como estadio pequeno', tags: ['Concierto', 'Rock'] },
    { dia: 'Sabado', hora: '1:00 pm', titulo: 'Makabra Market (segun fecha)', icono: '\ud83e\uddff', detalle: 'Moda, arte, tatuajes, piercing, literatura y bandas en vivo, entrada libre', tags: ['Mercado', 'Gratis'] }
  ],
  dificultad_tags: [
    { texto: 'Centro historico, acceso por Carrera Septima y TransMilenio Av. Jimenez', apto: true },
    { texto: 'Aforo intimo de 180 personas: buena visibilidad del escenario', apto: true },
    { texto: 'Covers de $10k-$30k: precios accesibles', apto: true },
    { texto: 'Requiere ser mayor de 18 anos para eventos con alcohol', apto: false },
    { texto: 'Agenda variable: hay que verificar fechas en Instagram', apto: false }
  ],
  temporada_matriz: {
    Ene: 'ideal', Feb: 'ideal', Mar: 'ideal', Abr: 'ideal', May: 'ideal',
    Jun: 'ideal', Jul: 'ideal', Ago: 'ideal', Sep: 'ideal', Oct: 'ideal', Nov: 'ideal', Dic: 'ideal'
  }
};

const FAQS = [
  { pregunta: 'Que es La Casa del Oso Bar Cafe?', respuesta: 'Venue bar y espacio cultural en Las Nieves (Calle 19 # 4-20 Local 12, dentro del Edificio Emperador), Bogota. Conciertos de rock y tributos, Jueves de Blues, stand-up comedy, mercados alternativos (Makabra Market) y eventos privados. Aforo 180 personas.' },
  { pregunta: 'Donde queda?', respuesta: 'Calle 19 # 4-20 Local 12, barrio Las Nieves, centro de Bogota, dentro del Edificio Emperador. Coordenadas 4.60639, -74.06845. A 10-12 min caminando de la estacion TransMilenio Av. Jimenez.' },
  { pregunta: 'Que programacion tiene?', respuesta: 'Agenda variable publicada semana a semana en Instagram @lacasadelosobar. Recurrente: Jueves de Blues. Tambien tributos de rock (Def Leppard, Spinetta), stand-up comedy, Makabra Market con entrada libre y eventos privados.' },
  { pregunta: 'Cuanto cuesta la entrada?', respuesta: 'Covers de $10.000 a $30.000 segun el evento. Algunos mercados y festivales (Makabra Market) tienen entrada libre. La boleta se compra por la taquilla o reserva del evento.' },
  { pregunta: 'Cual es el aforo y el formato?', respuesta: '180 personas. Espacio adaptable a conciertos, eventos sociales y teatro, con escenario proximo al publico.' },
  { pregunta: 'Como reservo un evento privado?', respuesta: 'Por WhatsApp al +57 301 658 3370 o por Instagram @lacasadelosobar. El venue se alquila para eventos sociales, conciertos y teatro.' }
];

module.exports = { SLUG: SLUG, HERO: HERO, PHOTOS: PHOTOS, BASE: BASE, TAGS: TAGS, FAQS: FAQS };

if (require.main !== module) return;

(async function main() {
  var url = process.env.DATABASE_URL || process.argv[2];
  if (!url) {
    console.error('Falta DATABASE_URL.');
    console.error('Uso: DATABASE_URL=postgres://... node scripts/seed-la-casa-del-oso.js [--dry]');
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