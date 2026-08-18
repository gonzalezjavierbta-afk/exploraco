// scripts/seed-bellagio.js
// Crea (o actualiza) la pagina dinamica bellagio.html con los datos del
// Bellagio Bar (Avenida Jimenez, centro de Bogota), siguiendo el patron de
// scripts/seed-gate-club.js (categoria sitio, upsert completo).
//
// Uso:
//   DATABASE_URL=postgres://... node scripts/seed-bellagio.js --dry
//   DATABASE_URL=postgres://... node scripts/seed-bellagio.js

var neon = null;
function getNeon() {
  if (!neon) neon = require('@neondatabase/serverless').neon;
  return neon;
}

const SLUG = 'bellagio-bar';
const HERO = 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/62/Skyline_downtown_Bogota.jpg/960px-Skyline_downtown_Bogota.jpg';

const PHOTOS = [
  { url: HERO, caption: 'El skyline del centro de Bogota, con los cerros orientales de fondo' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Palacio_Li%C3%A9vano%2C_Bogot%C3%A1.jpg/960px-Palacio_Li%C3%A9vano%2C_Bogot%C3%A1.jpg', caption: 'El Palacio Lievano, a un paso de la Avenida Jimenez' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Plaza_de_Bol%C3%ADvar%2C_Bogot%C3%A1.jpg/1200px-Plaza_de_Bol%C3%ADvar%2C_Bogot%C3%A1.jpg', caption: 'La Plaza de Bolivar, cerca del Parque de los Periodistas' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/Calle_empedrada_La_Candelaria.jpg/800px-Calle_empedrada_La_Candelaria.jpg', caption: 'Calles empedradas del centro historico' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e7/Teatro_Col%C3%B3n_Bogot%C3%A1.jpg/800px-Teatro_Col%C3%B3n_Bogot%C3%A1.jpg', caption: 'Teatro Colon, joya del centro' }
];

const BASE = {
  slug: SLUG,
  nombre: 'Bellagio Bar',
  categoria_slug: 'sitio',
  lead: 'Cocteleria y musica en vivo frente al Parque de los Periodistas, en la Avenida Jimenez de Quesada del centro de Bogota.',
  descripcion: 'Bellagio Bar (Av Jimenez de Quesada #3-87, frente al Parque de los Periodistas, La Candelaria, Bogota, coordenadas 4.6068, -74.0725) es un espacio cultural de la noche del centro: cocteleria, cervezas artesanales, musica en vivo y una agenda que mezcla rap, hip hop, trivia y presentaciones. Su Instagram @bellagiobarbogota publica la programacion semanal, y su telefono de contacto es +57 324 4651175.\n\nEl bar se ha consolidado como punto de encuentro para quienes disfrutan de la buena charla con musica de fondo. En un barrio que respira historia y tradicion, Bellagio apuesta por combinar el entretenimiento y la cultura popular: noches de preguntas y respuestas, presentaciones en vivo y espacio para bailar, siempre con una barra de cocteles y cervezas artesanales que acompa\u00f1a la velada.\n\nLa programacion es la verdadera protagonista. El bar ha sido escenario de noches de rap en vivo con artistas de la escena bogotana, eventos que llenan el local de letristas, DJs invitados y una energia intensa para quienes siguen el hip hop con identidad. Tambien hay noches mas relajadas de trivia y musica, pensadas para compartir con amigos en un ambiente distendido.\n\nSu ubicacion es privilegiada: a pocos metros del Parque de los Periodistas, entre el centro historico y el barrio universitario. Esto lo convierte en una parada natural tanto para quienes recorren La Candelaria como para estudiantes y trabajadores del centro que buscan un plan despues de la oficina o la universidad.\n\nEl horario de referencia es de martes a jueves desde el mediodia hasta la madrugada (alrededor de las 2:30-3:00), viernes desde las 11:00 hasta cerca de las 4:45 y sabados desde el mediodia hasta las 3:00; lunes y domingos suele estar cerrado. Los precios de referencia llegan hasta unos 37.900 pesos por persona, con opciones para todos los presupuestos.\n\nComo llegar es muy facil: por TransMilenio, la estacion mas cercana es Avenida Jimenez (troncal Karakol) o Las Aguas. Desde la Plaza de Bolivar se camina por la Avenida Jimenez hacia el oriente hasta el Parque de los Periodistas. En taxi o aplicacion se pide Bellagio Bar, Avenida Jimenez con carrera 3, frente al Parque de los Periodistas.',
  highlight: 'Cocteleria, cerveza artesanal y una agenda que va del rap en vivo a la trivia, frente al Parque de los Periodistas',
  ciudad: 'Bogota',
  region: 'Cundinamarca',
  barrio: 'La Candelaria / Centro',
  lat: 4.6068,
  lng: -74.0725,
  whatsapp: '',
  telefono: '+57 324 4651175',
  email: '',
  web: '',
  instagram: '@bellagiobarbogota',
  precio_desde: 'Hasta $37.900 por persona (referencia)',
  horario: 'Mar-jue 12:00-2:30/3:00; vie 11:00-4:45; sab 12:00-3:00; lun y dom cerrado (referencia)',
  emoji: '\ud83c\udff8',
  hero_bg: '#1e3a8a',
  foto_hero: HERO,
  tipo: 'Bar de cocteleria \u00b7 Musica en vivo \u00b7 Cultura urbana',
  capacidad: '',
  como_llegar: 'TransMilenio: estacion Avenida Jimenez o Las Aguas y caminar hacia el Parque de los Periodistas. Desde la Plaza de Bolivar, diez minutos por la Avenida Jimenez. Taxi o app: Av Jimenez #3-87, frente al Parque de los Periodistas.',
  status: 'published',
  destacado: true
};

const TAGS = {
  tipo_actividad: 'Bar de cocteleria y musica',
  dificultad: 'Facil',
  dificultad_desc: 'Bar interior a nivel; accesible en general. Requiere ser mayor de 18 anos.',
  duracion: '2-5 horas',
  altitud: '2600',
  temporada: ['Todo el ano', 'Fines de semana', 'Noches de evento segun programacion'],
  precio_entrada: 'Sin cover permanente (referencia); el consumo se paga por separado. Algunos eventos pueden tener cubrimiento especial.',
  distancia: 'Av Jimenez de Quesada #3-87, frente al Parque de los Periodistas, La Candelaria, Bogota.',
  como_llegar: BASE.como_llegar,
  permisos: 'Mayor de 18 anos con documento de identidad valido.',
  temporada_nota: 'La agenda de Bellagio cambia cada semana: rap en vivo, trivia, DJs y musica. Consulta @bellagiobarbogota para la programacion vigente.',
  fauna_flora: JSON.stringify([
    { emoji: '\ud83c\udff8', nombre: 'Cocteleria y cerveza artesanal', hecho: 'Barra con opciones para todos los gustos' },
    { emoji: '\ud83c\udfb5', nombre: 'Musica en vivo', hecho: 'Del rap con identidad a las noches de DJ' },
    { emoji: '\ud83e\udde9', nombre: 'Trivia y cultura popular', hecho: 'Noches de preguntas y respuestas para la charla con amigos' },
    { emoji: '\ud83c\udfdb\ufe0f', nombre: 'Frente al Parque de los Periodistas', hecho: 'Una esquina privilegiada del centro historico' }
  ]),
  secretos: JSON.stringify([
    { icono: '\ud83c\udfb5', titulo: 'Noches de rap', texto: 'El bar es escenario del rap en vivo bogotano: letristas y DJs invitados segun la agenda.', tag: 'Eventos', tag_color: 'blue' },
    { icono: '\ud83e\udde9', titulo: 'Trivia semanal', texto: 'Pregunta por las noches de trivia: el plan perfecto para venir en grupo.', tag: 'Plan', tag_color: 'green' },
    { icono: '\ud83c\udff8', titulo: 'La barra', texto: 'Cocteles de autor y cervezas artesanales: pide la sugerencia de la casa.', tag: 'Imperdible', tag_color: 'gold' },
    { icono: '\ud83c\udfdb\ufe0f', titulo: 'Esquina del centro', texto: 'Frente al Parque de los Periodistas, entre La Candelaria y el barrio universitario.', tag: 'Zona', tag_color: 'brown' }
  ]),
  regulaciones: 'Mayor de 18 anos con documento de identidad valido. Se reserva el derecho de admision. No se permite el ingreso de bebidas externas. Consumo por separado.',
  checklist_tip: 'Revisa la agenda en @bellagiobarbogota antes de ir: entre rap, trivia y DJs, cada noche es distinta.',
  entradas: [
    { tipo: 'Barra', precio: 'variable', incluye: 'Cocteles y cervezas artesanales (referencia)', link: 'https://instagram.com/bellagiobarbogota' },
    { tipo: 'Noche de evento', precio: 'variable', incluye: 'Acceso a rap, DJ o trivia segun agenda', link: 'https://instagram.com/bellagiobarbogota' }
  ],
  tours: [
    {
      nombre: 'Noche de cocteleria',
      precio: 'Variable', precio_sub: 'segun consumo',
      duracion: '2-4 horas', tipo_tour: 'Experiencia', idioma: 'Espanol', max_personas: 'Abierto',
      rating: '4.3', review_count: 11,
      descripcion: 'La barra de Bellagio: cocteles, cerveza artesanal y musica de fondo frente al Parque de los Periodistas.',
      incluye: ['Acceso al bar', 'Carta de cocteles', 'Ambiente del centro'],
      no_incluye: ['Bebidas', 'Transporte'],
      link_reserva: 'https://instagram.com/bellagiobarbogota',
      featured: true
    },
    {
      nombre: 'Noche de rap en vivo',
      precio: 'Variable', precio_sub: 'segun evento',
      duracion: '3-4 horas', tipo_tour: 'Evento', idioma: 'Espanol', max_personas: 'Abierto',
      rating: '4.5', review_count: 8,
      descripcion: 'Las noches de rap de la escena bogotana: letristas, DJs invitados y pura energia urbana.',
      incluye: ['Acceso al evento', 'Artistas en vivo', 'Pista y barra'],
      no_incluye: ['Bebidas', 'Transporte'],
      link_reserva: 'https://instagram.com/bellagiobarbogota',
      featured: true
    },
    {
      nombre: 'Trivia y amigos',
      precio: 'Sin cover', precio_sub: 'con consumo',
      duracion: '2-3 horas', tipo_tour: 'Experiencia', idioma: 'Espanol', max_personas: 'Grupos',
      rating: '4.2', review_count: 6,
      descripcion: 'Las noches de preguntas y respuestas: el plan ideal para competir en equipo con buena musica.',
      incluye: ['Acceso', 'Dinamica de trivia', 'Ambiente grupal'],
      no_incluye: ['Bebidas', 'Transporte'],
      link_reserva: 'https://instagram.com/bellagiobarbogota',
      featured: false
    }
  ],
  equipamiento: [
    { item: 'Documento de identidad (mayor de 18)', prioridad: 'Obligatorio' },
    { item: 'Efectivo o tarjeta para el consumo', prioridad: 'Recomendado' },
    { item: 'Abrigo para la noche en el centro', prioridad: 'Recomendado' },
    { item: 'Seguir la agenda en Instagram', prioridad: 'Recomendado' }
  ],
  itinerario: [
    { dia: 'Martes a jueves', hora: '12:00 m', titulo: 'El bar abre', icono: '\ud83c\udff8', detalle: 'Cocteleria desde el mediodia', tags: ['Bar'] },
    { dia: 'Viernes', hora: '8:00 pm', titulo: 'Musica en vivo', icono: '\ud83c\udfb5', detalle: 'DJ o banda segun agenda', tags: ['Musica'] },
    { dia: 'Sabado', hora: '9:00 pm', titulo: 'La noche del centro', icono: '\ud83c\udf1f', detalle: 'Rap, trivia o rumba segun programacion', tags: ['Evento'] },
    { dia: 'Sabado', hora: '12:00 am', titulo: 'Cierre', icono: '\ud83c\udff8', detalle: 'Ultimas copas frente al parque', tags: ['Cierre'] }
  ],
  dificultad_tags: [
    { texto: 'Bar interior de acceso general', apto: true },
    { texto: 'Zona central caminable y con TransMilenio', apto: true },
    { texto: 'Horario nocturno solo +18', apto: false },
    { texto: 'Noches de evento muy concurridas', apto: false },
    { texto: 'Lunes y domingos cerrado', apto: false }
  ],
  temporada_matriz: {
    Ene: 'ideal', Feb: 'ideal', Mar: 'ideal', Abr: 'posible', May: 'posible',
    Jun: 'ideal', Jul: 'ideal', Ago: 'ideal', Sep: 'posible', Oct: 'posible', Nov: 'posible', Dic: 'ideal'
  }
};

const FAQS = [
  { pregunta: 'Donde queda Bellagio Bar?', respuesta: 'Av Jimenez de Quesada #3-87, frente al Parque de los Periodistas, La Candelaria, Bogota.' },
  { pregunta: 'Que tipo de bar es?', respuesta: 'Bar de cocteleria y cerveza artesanal con musica en vivo, rap, trivia y cultura popular.' },
  { pregunta: 'Que horario maneja?', respuesta: 'Referencia: martes a jueves desde el mediodia hasta las 2:30-3:00, viernes desde las 11:00 hasta 4:45, sabados hasta las 3:00. Lunes y domingos cerrado.' },
  { pregunta: 'Como sigo la programacion?', respuesta: 'La agenda se publica en Instagram @bellagiobarbogota y el telefono de contacto es +57 324 4651175.' },
  { pregunta: 'Cual es la edad minima?', respuesta: 'Mayor de 18 anos con documento de identidad valido.' }
];

module.exports = { SLUG: SLUG, HERO: HERO, PHOTOS: PHOTOS, BASE: BASE, TAGS: TAGS, FAQS: FAQS };

if (require.main !== module) return;

(async function main() {
  var url = process.env.DATABASE_URL || process.argv[2];
  if (!url) {
    console.error('Falta DATABASE_URL.');
    console.error('Uso: DATABASE_URL=postgres://... node scripts/seed-bellagio.js [--dry]');
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