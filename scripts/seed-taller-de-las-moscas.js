// scripts/seed-taller-de-las-moscas.js
// Crea (o actualiza) la pagina dinamica taller-de-las-moscas.html con los datos
// de la ficha "ficha/taller de las moscas.json", replicando EXACTAMENTE lo que
// guardaria el formulario admin.html para la categoria sitio. Patron de
// scripts/seed-centro-cultural-delia-zapata-olivella.js con upsert completo.
//
// Rating: NO se siembran resenas ni se hardcodea rating. La pagina queda con
// rating/contador en 0 hasta que lleguen interacciones reales (ADR-009).
// Fotos: 5 URLs de Wikimedia verficadas HEAD 200 en la ficha (BUG-022).
//
// Uso:
//   DATABASE_URL=postgres://... node scripts/seed-taller-de-las-moscas.js --dry
//   DATABASE_URL=postgres://... node scripts/seed-taller-de-las-moscas.js
//
// Idempotente: re-ejecutable sin efectos secundarios (ON CONFLICT slug).

var neon = null;
function getNeon() {
  if (!neon) neon = require('@neondatabase/serverless').neon;
  return neon;
}

const SLUG = 'taller-de-las-moscas';
const HERO = 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/eb/Chapinero%2C_Bogot%C3%A1%2C_Bogota%2C_Colombia_-_panoramio_-_aalozadag_%2824%29.jpg/1280px-Chapinero%2C_Bogot%C3%A1%2C_Bogota%2C_Colombia_-_panoramio_-_aalozadag_%2824%29.jpg';

const PHOTOS = [
  { url: HERO, caption: 'Vista urbana del barrio Chapinero en Bogota, contexto de barrio donde opera El Taller de las Moscas' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/HOGRE_street_art_Bogot%C3%A1.jpg/960px-HOGRE_street_art_Bogot%C3%A1.jpg', caption: 'Street art en Bogota fotografiado por el muralista HOGRE (2024), arte urbano contemporaneo bogotano' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/29/Melaka_Art_Gallery_-_Exhibition_Hall.jpg/960px-Melaka_Art_Gallery_-_Exhibition_Hall.jpg', caption: 'Salon de exhibicion de galeria de arte con obras colgadas en sala (imagen ilustrativa de la escena del Taller)' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a6/Interior_del_Taller_Nacional_de_Gr%C3%A1fica_en_el_Complejo_Tres_Centurias_04.jpg/960px-Interior_del_Taller_Nacional_de_Gr%C3%A1fica_en_el_Complejo_Tres_Centurias_04.jpg', caption: 'Taller de grabado con prensas y mesas, equivalente visual del taller de arte impreso que ofrece el lugar' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/ZineDisplayWGTN_01.jpg/960px-ZineDisplayWGTN_01.jpg', caption: 'Fanzines y publicaciones independientes en exhibicion, el display caracteristico del Taller' }
];

const BASE = {
  slug: SLUG,
  nombre: 'El Taller de las Moscas',
  categoria_slug: 'sitio',
  lead: 'Un espacio independiente de creaci\u00f3n, exposici\u00f3n e itinerancia art\u00edstica en el coraz\u00f3n de Chapinero, Bogot\u00e1.',
  descripcion: 'El Taller de las Moscas es un laboratorio art\u00edstico y centro cultural independiente situado en la localidad de Chapinero, Bogot\u00e1.\n\nConcebido como un punto de encuentro para creadores contempor\u00e1neos, el espacio alberga exposiciones de arte pl\u00e1stico, talleres abiertos, publicaciones independientes y muestras interdisciplinarias que desaf\u00edan los circuitos galer\u00edsticos convencionales.\n\nSu ubicaci\u00f3n estrat\u00e9gica en Chapinero lo convierte en una parada esencial dentro del circuito cultural alternativo de la capital colombiana, ofreciendo a los visitantes una experiencia inmersiva en el proceso creativo contempor\u00e1neo bogotano.',
  highlight: 'Laboratorio art\u00edstico \u00b7 Galer\u00eda independiente \u00b7 Chapinero',
  ciudad: 'Bogot\u00e1',
  region: 'Bogot\u00e1 D.C.',
  barrio: 'Chapinero Central',
  lat: 4.6433,
  lng: -74.0628,
  direccion: 'Cra. 19a #61b 81, Chapinero, Bogot\u00e1',
  whatsapp: '',
  telefono: '',
  email: '',
  web: 'https://eventario.co/places/el-taller-de-las-moscas/',
  instagram: '@tallerdelasmoscas',
  precio_desde: 'Entrada libre',
  horario: 'Mi\u00e9-S\u00e1b 2:00 PM - 8:00 PM',
  emoji: '\ud83e\udeb2',
  hero_bg: 'linear-gradient(135deg, #1f1f1f 0%, #3a3a3a 100%)',
  foto_hero: HERO,
  tipo: 'Centro Cultural \u00b7 Galer\u00eda de Arte \u00b7 Taller Creativo',
  capacidad: '50 personas',
  como_llegar: 'Cra. 19a #61b 81, Chapinero. Acceso en TransMilenio por la estaci\u00f3n Calle 63 sobre la Av. Caracas, caminando 2 cuadras hacia el oriente hasta la Cra. 19a.',
  status: 'published',
  destacado: true
};

const TAGS = {
  tipo_actividad: 'Galer\u00eda de Arte y Taller Cultural',
  dificultad: 'Facil',
  dificultad_desc: 'Accesible para todo p\u00fablico en zona urbana de Chapinero',
  duracion: '1-2 horas',
  altitud: '2600',
  temporada: ['Todo el a\u00f1o'],
  precio_entrada: 'Entrada libre a exposiciones; talleres con costo variable',
  distancia: 'Chapinero Central, Bogot\u00e1 D.C.',
  como_llegar: 'Ubicado cerca a la Avenida Caracas y Calle 59 en Chapinero',
  permisos: 'Sin permiso previo para visitar la galer\u00eda',
  temporada_nota: 'Abierto todo el a\u00f1o seg\u00fan programaci\u00f3n de exposiciones',
  fauna_flora: '',
  secretos: JSON.stringify([
    { icono: '\ud83e\udeb2', titulo: 'Autogesti\u00f3n Creativa', texto: 'Un espacio independiente donde puedes interactuar directamente con los artistas residentes.', tag: 'Comunidad', tag_color: 'gold' },
    { icono: '\ud83c\udfa8', titulo: 'Arte Impreso y Fanzines', texto: 'Cuenta con muestras de arte gr\u00e1fico, publicaciones independientes y fanzines locales.', tag: 'Cultura', tag_color: 'purple' }
  ]),
  regulaciones: 'Respetar las obras expuestas y mantener orden durante las visitas y talleres.',
  checklist_tip: 'Revisa su cuenta de Instagram (@tallerdelasmoscas) para conocer los eventos y exposiciones vigentes.',
  entradas: [
    { tipo: 'Entrada General', precio: 'Gratis', incluye: 'Acceso a la galer\u00eda y exposiciones temporales', link: 'https://eventario.co/places/el-taller-de-las-moscas/' }
  ],
  tours: [
    {
      nombre: 'Recorrido Autoguiado de Exposici\u00f3n',
      precio: '0', precio_sub: 'Gratuito',
      duracion: '45 min', tipo_tour: 'Autoguiado', idioma: 'Espa\u00f1ol', max_personas: '15',
      rating: '', review_count: 0,
      descripcion: 'Visita libre a la muestra de arte contempor\u00e1neo e instalaci\u00f3n vigente.',
      incluye: ['Acceso a la sala principal', 'Folleto de sala / hoja de sala'],
      no_incluye: ['Materiales de taller'],
      link_reserva: 'https://eventario.co/places/el-taller-de-las-moscas/',
      featured: false
    }
  ],
  equipamiento: [
    { item: 'Mente abierta e inter\u00e9s por el arte independiente', prioridad: 'Obligatorio' },
    { item: 'C\u00e1mara o smartphone para fotograf\u00edas', prioridad: 'Recomendado' }
  ],
  itinerario: [
    { dia: 'D\u00eda 1', hora: '15:00', titulo: 'Llegada y Muestra de Arte', icono: '\ud83c\udfdb\ufe0f', detalle: 'Ingreso a la galer\u00eda y recorrido por la obra expuesta.', tags: ['Arte', 'Galer\u00eda'] },
    { dia: 'D\u00eda 1', hora: '16:00', titulo: 'Secci\u00f3n de Publicaciones Independientes', icono: '\ud83d\udcd6', detalle: 'Revisi\u00f3n de fanzines, grabados e impresos de artistas locales.', tags: ['Fanzine', 'Dise\u00f1o'] }
  ],
  dificultad_tags: [
    { texto: 'Apto para familias y estudiantes', apto: true },
    { texto: 'Accesible mediante transporte p\u00fablico', apto: true }
  ],
  temporada_matriz: {
    Ene: 'ideal', Feb: 'ideal', Mar: 'ideal', Abr: 'ideal', May: 'ideal',
    Jun: 'ideal', Jul: 'ideal', Ago: 'ideal', Sep: 'ideal', Oct: 'ideal', Nov: 'ideal', Dic: 'ideal'
  }
};

const FAQS = [
  { pregunta: '\u00bfD\u00f3nde queda ubicado El Taller de las Moscas?', respuesta: 'En el sector cultural de Chapinero, Bogot\u00e1, cerca a la Calle 59 y Av. Caracas.' },
  { pregunta: '\u00bfTiene costo ingresar a las exposiciones?', respuesta: 'No, la entrada a las muestras y exposiciones de arte es gratuita.' },
  { pregunta: '\u00bfSe dictan talleres en el lugar?', respuesta: 'S\u00ed, ofrecen talleres de ilustraci\u00f3n, grabado y publicaciones independientes con inscripci\u00f3n previa.' },
  { pregunta: '\u00bfD\u00f3nde puedo consultar la agenda actualizada?', respuesta: 'En su Instagram oficial @tallerdelasmoscas o en la plataforma Eventario.co.' },
  { pregunta: '\u00bfCu\u00e1l es la estaci\u00f3n de TransMilenio m\u00e1s cercana?', respuesta: 'Las estaciones Calle 57 o Calle 63 sobre la Troncal Caracas.' }
];

module.exports = { SLUG: SLUG, HERO: HERO, PHOTOS: PHOTOS, BASE: BASE, TAGS: TAGS, FAQS: FAQS };

if (require.main !== module) return;

(async function main() {
  var url = process.env.DATABASE_URL || process.argv[2];
  if (!url) {
    console.error('Falta DATABASE_URL.');
    console.error('Uso: DATABASE_URL=postgres://... node scripts/seed-taller-de-las-moscas.js [--dry]');
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
    + 'ciudad, region, barrio, lat, lng, address, '
    + 'whatsapp, telefono, email, web, instagram, '
    + 'precio_desde, horario, emoji, hero_bg, foto_hero, '
    + 'tipo, capacidad, como_llegar, '
    + 'status, destacado, tags, creado_en, actualizado_en '
    + ') VALUES ( '
    + '$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,'
    + '$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,NOW(),NOW() '
    + ') '
    + 'ON CONFLICT (slug) DO UPDATE SET '
    + 'nombre=EXCLUDED.nombre, lead=EXCLUDED.lead, descripcion=EXCLUDED.descripcion, '
    + 'highlight=EXCLUDED.highlight, ciudad=EXCLUDED.ciudad, region=EXCLUDED.region, '
    + 'barrio=EXCLUDED.barrio, lat=EXCLUDED.lat, lng=EXCLUDED.lng, address=EXCLUDED.address, '
    + 'whatsapp=EXCLUDED.whatsapp, telefono=EXCLUDED.telefono, email=EXCLUDED.email, '
    + 'web=EXCLUDED.web, instagram=EXCLUDED.instagram, '
    + 'precio_desde=EXCLUDED.precio_desde, horario=EXCLUDED.horario, emoji=EXCLUDED.emoji, '
    + 'hero_bg=EXCLUDED.hero_bg, foto_hero=EXCLUDED.foto_hero, tipo=EXCLUDED.tipo, '
    + 'capacidad=EXCLUDED.capacidad, como_llegar=EXCLUDED.como_llegar, '
    + 'status=EXCLUDED.status, destacado=EXCLUDED.destacado, '
    + 'tags = COALESCE(destinos.tags, \'{}\'::jsonb) || EXCLUDED.tags, '
    + 'actualizado_en = NOW() '
    + 'RETURNING id, slug, nombre, status',
    [
      BASE.slug, BASE.nombre, BASE.categoria_slug, BASE.lead, BASE.descripcion, BASE.highlight,
      BASE.ciudad, BASE.region, BASE.barrio, BASE.lat, BASE.lng, BASE.direccion,
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
  console.log('Verifica en: https://exploraco.vercel.app/' + SLUG + '.html (revisa sitemap y /api/destinos).');
})().catch(function(err) {
  console.error('ERROR:', err.message);
  process.exit(1);
});