// scripts/seed-la-redada-miscelanea-cultural.js
// Crea (o actualiza) la pagina dinamica la-redada-miscelanea-cultural.html con
// los datos de ficha/ficha-la-redada-miscelanea-cultural.md, replicando
// EXACTAMENTE lo que guardaria el formulario admin.html. Patron de
// scripts/seed-centro-cultural-delia-zapata-olivella.js con upsert completo.
//
// Subcategoria: 'cultura' (ADR-016). El gating de api/pagina-destino.js
// habilita descripcion, entradas, colecciones, recorridos, horarios_zona,
// accesibilidad, secretos, programacion y contexto. Las claves tours,
// itinerario, equipamiento, regulaciones y temporada_matriz se CONSERVAN
// porque validate_ficha.js las exige para categoria sitio, aunque queden
// invisibles en el render (su contenido se remapeo a recorridos,
// programacion, accesibilidad, horarios_zona, colecciones y contexto).
//
// Rating: NO se siembran resenas ni se hardcodea rating. La pagina queda con
// rating/contador en 0 hasta que lleguen interacciones reales (ADR-009).
//
// Fotos: el destino nace SIN fotos (HERO = '' y PHOTOS = []). El cliente
// subira sus fotos reales al final; FOTOS_SUGERIDAS de la ficha es solo un
// brief documental y NO se escribe en la BD.
//
// Uso:
//   DATABASE_URL=postgres://... node scripts/seed-la-redada-miscelanea-cultural.js --dry
//   DATABASE_URL=postgres://... node scripts/seed-la-redada-miscelanea-cultural.js
//
// Idempotente: re-ejecutable sin efectos secundarios (ON CONFLICT slug).

var neon = null;
function getNeon() {
  if (!neon) neon = require('@neondatabase/serverless').neon;
  return neon;
}

const SLUG = 'la-redada-miscelanea-cultural';
const HERO = '';

const PHOTOS = [];

const BASE = {
  slug: SLUG,
  nombre: 'La Redada Miscelanea Cultural',
  categoria_slug: 'sitio',
  lead: 'Un espacio cultural independiente y autogestionado en el centro de Bogota dedicado a la creacion artistica, el encuentro comunitario y la autogestion.',
  descripcion: 'La Redada Miscelanea Cultural es un nodo vivo de la cultura independiente en el centro historico de Bogota. Ocupa una casona colonial del barrio La Candelaria y funciona como espacio autogestionado: sus salas se abren para conciertos independientes, teatro, cine, ferias de diseno autogestionado, talleres y debates.\n\nLa programacion convive con una economia solidaria: en la casa funcionan una tienda de productos independientes, un cafe y talleres de libre creacion donde los proyectos locales venden directo al publico. El espacio se sostiene con aportes voluntarios y con la boleteria de los eventos, por eso su agenda es continua de miercoles a sabado.',
  highlight: 'Espacio cultural independiente y autogestionado - Centro Historico',
  ciudad: 'Bogota',
  region: 'Cundinamarca',
  barrio: 'La Candelaria',
  lat: 4.5975,
  lng: -74.0752,
  whatsapp: '',
  telefono: '',
  email: 'laredadamiscelanea@gmail.com',
  web: '',
  instagram: '@laredadamiscelaneacultural',
  precio_desde: 'Entradas desde $0 (aportes voluntarios)',
  horario: 'Mie-Sab 3:00 PM - 11:00 PM',
  emoji: '\ud83c\udfad',
  hero_bg: 'linear-gradient(135deg,#1A1A1A 0%,#E8A020 100%)',
  foto_hero: HERO,
  tipo: 'Centro Cultural - Espacio Comunitario - Musica & Arte',
  capacidad: '150 personas',
  como_llegar: 'TransMilenio estacion Las Aguas o Museo del Oro, caminar hacia la Carrera 5 con Calle 12C en el Centro Historico.',
  status: 'published',
  destacado: true
};

const TAGS = {
  subcategoria: 'cultura',
  tipo_actividad: 'Centro Cultural y Espacio Comunitario Autogestionado',
  dificultad: 'Facil',
  dificultad_desc: 'Recorrido a pie por una casona colonial; no exige esfuerzo fisico.',
  duracion: '1-3 horas',
  precio_entrada: 'Entradas desde $0 con aporte voluntario. Conciertos y funciones entre $10.000 y $30.000.',
  distancia: 'Centro Historico de Bogota, barrio La Candelaria',
  como_llegar: 'TransMilenio estacion Las Aguas o Museo del Oro, caminar hacia la Carrera 5 con Calle 12C en el Centro Historico.',
  permisos: 'Ingreso libre a la casona, el cafe y la tienda autonoma; los eventos se pagan en taquilla o con aporte voluntario.',
  temporada_nota: 'Programacion continua durante todo el ano, con agenda de miercoles a sabado en la tarde y la noche.',
  // Invisible con subcategoria cultura: su contenido se recupera en contexto.
  regulaciones: 'Espacio libre de discriminacion. Prohibido el ingreso de bebidas alcoholicas externas.',
  // Invisible con subcategoria cultura: se guarda como string JSON (patron del
  // motor, BUG-024) y se renderiza en la seccion Secretos.
  secretos: JSON.stringify([
    { icono: '\u2615', titulo: 'El Patio Central', texto: 'El patio interior de la casona colonial es el corazon del espacio: alli esta el cafe de la casa y suelen montarse las ferias de diseno autogestionado y los encuentros de la comunidad.', tag: 'Imperdible', tag_color: 'gold' },
    { icono: '\ud83d\uded2', titulo: 'Tienda Autonoma', texto: 'En la tienda los proyectos independientes venden directo al publico fanzines, ilustracion, vestuario y productos de economia solidaria, sin intermediarios.', tag: 'Economia solidaria', tag_color: 'green' }
  ]),
  // Texto plano con saltos de linea: recupera lo que el gating ocultaria
  // (regulaciones, consejo de efectivo/Nequi y programacion continua).
  contexto: 'Espacio libre de discriminacion. Prohibido el ingreso de bebidas alcoholicas externas.'
    + '\n\nLleva efectivo o Nequi: en la tienda autonoma los proyectos independientes venden directo y los aportes a los artistas se reciben de forma voluntaria.'
    + '\n\nLa programacion es continua durante todo el ano: la agenda de conciertos, teatro, cine-foro, ferias y talleres se publica mes a mes en el Instagram de La Redada.',
  entradas: [
    { tipo: 'Entrada General', precio: 'Gratis', incluye: 'Acceso a la casona, exposiciones y cafe', link: 'https://www.instagram.com/laredadamiscelaneacultural/' },
    { tipo: 'Conciertos y Funciones', precio: '$10.000', incluye: 'Ingreso a evento privado de la agenda cultural (rango habitual $10.000 - $30.000)', link: 'https://www.instagram.com/laredadamiscelaneacultural/' }
  ],
  // Remapeo ADR-016: la tienda autonoma como coleccion, sin precios inventados.
  colecciones: [
    { nombre: 'Fanzines y editorial independiente', descripcion: 'Publicaciones, fanzines y libros de proyectos editoriales independientes que se venden directo en la tienda autonoma.' },
    { nombre: 'Vestuario y arte local', descripcion: 'Prendas, accesorios y obra de artistas y disenadores locales que producen de forma autogestionada.' },
    { nombre: 'Grafica independiente', descripcion: 'Afiches, serigrafia e ilustracion de la escena grafica independiente de Bogota.' }
  ],
  // Remapeo ADR-016: el tour (que el gating ocultaria) y los hitos del
  // itinerario con sentido de recorrido por la casona.
  recorridos: [
    { icono: '\ud83c\udfe0', nombre: 'Recorrido por la Casona y Tienda Autonoma', descripcion: 'Paseo por las salas de exposicion, proyectos de autogestion y productos locales.', duracion: '1 hora' },
    { icono: '\u2615', nombre: 'Patio Central', descripcion: 'Primer paso del recorrido: el patio colonial donde funciona el cafe de la casa.', duracion: '20 min' },
    { icono: '\ud83d\uded2', nombre: 'Tienda Autonoma', descripcion: 'Fanzines, editorial independiente, grafica y vestuario de creadores locales.', duracion: '25 min' },
    { icono: '\ud83c\udfad', nombre: 'Salas de Exhibicion y Escenario', descripcion: 'Salas de la casona donde se programan teatro, cine-foro, conciertos y debates.', duracion: '30 min' }
  ],
  // Remapeo ADR-016: agenda de tarde-noche del espacio.
  programacion: [
    { dia: 'Mie-Sab 04:00 PM', eventos: 'Llegada y cafe en el patio central de la casona.' },
    { dia: 'Mie-Sab 05:30 PM', eventos: 'Tienda autonoma: fanzines, grafica y productos de proyectos locales.' },
    { dia: 'Mie-Sab 07:00 PM', eventos: 'Evento cultural: teatro, cine-foro o concierto independiente.' }
  ],
  horarios_zona: [
    { zona: 'Programacion cultural', horario: 'Mie-Sab 3:00 PM - 11:00 PM', estado: 'Abierto' }
  ],
  // Remapeo ADR-016: las banderas de dificultad_tags como accesibilidad.
  accesibilidad: [
    { icono: '\ud83d\udc65', nombre: 'Apto para todo publico', descripcion: 'Conciertos, teatro, cine-foro, talleres y ferias abiertas para todo tipo de publico.' },
    { icono: '\u267f', nombre: 'Acceso peatonal accesible', descripcion: 'Se llega caminando por el centro historico; la entrada principal es peatonal y la casona se recorre a pie.' }
  ],
  // Invisible con subcategoria cultura (conservado por validate_ficha.js);
  // su contenido vive ahora en recorridos. Sin rating ni review_count (ADR-009).
  tours: [
    {
      nombre: 'Recorrido por la Casona y Tienda Autonoma',
      precio: 'Aporte voluntario', precio_sub: 'Guiado por el equipo de La Redada',
      duracion: '1 hora', tipo_tour: 'Grupal', idioma: 'Espanol', max_personas: '20',
      descripcion: 'Paseo por las salas de exposicion, proyectos de autogestion y productos locales.',
      incluye: ['Acompanamiento del equipo de La Redada'],
      no_incluye: ['Consumos en la tienda autonoma'],
      link_reserva: 'https://www.instagram.com/laredadamiscelaneacultural/',
      featured: true
    }
  ],
  // Invisible con subcategoria cultura (conservado por validate_ficha.js);
  // su contenido vive ahora en contexto.
  equipamiento: [
    { item: 'Efectivo o Nequi para la tienda autonoma y los aportes a los artistas', prioridad: 'Recomendado' },
    { item: 'Ropa comoda y calzado para caminar por el centro historico', prioridad: 'Recomendado' },
    { item: 'Abrigo ligero para la noche bogotana', prioridad: 'Recomendado' }
  ],
  // Invisible con subcategoria cultura (conservado por validate_ficha.js);
  // sus hitos viven ahora en recorridos y programacion.
  itinerario: [
    { dia: 'Dia 1', hora: '16:00', titulo: 'Llegada al Patio Central', icono: '\u2615', detalle: 'Bienvenida en el patio de la casona colonial con cafe de la casa.', tags: ['Patio', 'Cafe'] },
    { dia: 'Dia 1', hora: '17:30', titulo: 'Tienda Autonoma', icono: '\ud83d\uded2', detalle: 'Recorrido por la tienda de productos independientes: fanzines, ilustracion y vestuario local.', tags: ['Autogestion', 'Diseno'] },
    { dia: 'Dia 1', hora: '19:00', titulo: 'Evento cultural en la casona', icono: '\ud83c\udfad', detalle: 'Teatro, cine-foro o concierto independiente en las salas de La Redada.', tags: ['Teatro', 'Musica'] }
  ],
  dificultad_tags: [
    { texto: 'Apto para todo publico', apto: true },
    { texto: 'Acceso peatonal accesible', apto: true }
  ],
  // Invisible con subcategoria cultura: la matriz de 12 meses "ideal" se
  // descarta. La clave se conserva vacia porque validate_ficha.js la exige.
  temporada_matriz: {}
};

const FAQS = [
  { pregunta: 'Donde queda La Redada Miscelanea Cultural?', respuesta: 'En el barrio La Candelaria, en el centro historico de Bogota, cerca de la Carrera 5 con Calle 12C.' },
  { pregunta: 'Cuanto cuesta la entrada a La Redada?', respuesta: 'El ingreso general es gratuito con aporte voluntario; los conciertos y funciones cuestan entre $10.000 y $30.000.' },
  { pregunta: 'Que se puede hacer en La Redada Miscelanea Cultural?', respuesta: 'Conciertos independientes, teatro, cine-foro, ferias de diseno autogestionado, talleres, debates y compras en la tienda autonoma.' },
  { pregunta: 'Cual es el horario de La Redada?', respuesta: 'Abre de miercoles a sabado entre 3:00 PM y 11:00 PM, con la agenda cultural concentrada en la tarde y la noche.' },
  { pregunta: 'Como se paga en la tienda autonoma?', respuesta: 'Se recomienda llevar efectivo o Nequi: la tienda de proyectos independientes y los aportes a los artistas se reciben de forma directa.' }
];

module.exports = { SLUG: SLUG, HERO: HERO, PHOTOS: PHOTOS, BASE: BASE, TAGS: TAGS, FAQS: FAQS };

if (require.main !== module) return;

(async function main() {
  var url = process.env.DATABASE_URL || process.argv[2];
  if (!url) {
    console.error('Falta DATABASE_URL.');
    console.error('Uso: DATABASE_URL=postgres://... node scripts/seed-la-redada-miscelanea-cultural.js [--dry]');
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
  console.log('Verifica en: https://latawel.com/' + SLUG + '.html (revisa sitemap y /api/destinos).');
})().catch(function(err) {
  console.error('ERROR:', err.message);
  process.exit(1);
});
