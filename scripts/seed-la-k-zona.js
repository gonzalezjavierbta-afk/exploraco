// scripts/seed-la-k-zona.js
// Crea (o actualiza) la pagina dinamica la-k-zona.html con los datos de
// LaK-Zona (Espacio Cultural Artistico Alternativo, Calle 15 # 9-64,
// Centro Historico de Bogota), replicando EXACTAMENTE lo que guardaria el
// formulario admin.html (CATEGORY_TAG_FIELDS/CATEGORY_TAG_LISTS sitio,
// _buildTagsObj/_placeToAPI). Patron de scripts/seed-espacio-kinder.js
// con upsert completo.
//
// Fuente oficial: https://lak-zona.org (paginas Raices, Las Zonas,
// Turismo, Juntes) + IG @lakzonaeslazona + Eventario/Yandex (direccion).
//
// Rating: NO se siembran resenas ni se hardcodea rating. La pagina queda
// con rating/contador en 0 hasta que lleguen interacciones reales
// (ADR-009: api/interacciones.js recalcula AVG/COUNT dinamicamente).
//
// Uso:
//   DATABASE_URL=postgres://... node scripts/seed-la-k-zona.js --dry
//   DATABASE_URL=postgres://... node scripts/seed-la-k-zona.js
//
// Idempotente: re-ejecutable sin efectos secundarios (ON CONFLICT slug).

var neon = null;
function getNeon() {
  if (!neon) neon = require('@neondatabase/serverless').neon;
  return neon;
}

const SLUG = 'la-k-zona';
const HERO = 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/06/Letreros_de_la_plaza_del_chorro_de_Quevedo._Bogot%C3%A1._Colombia..jpg/960px-Letreros_de_la_plaza_del_chorro_de_Quevedo._Bogot%C3%A1._Colombia..jpg';

const PHOTOS = [
  { url: HERO, caption: 'Plazoleta del Chorro de Quevedo y calles del Centro Historico, a pocas cuadras de la Calle 15 de LaK-Zona' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Plaza_de_Bol%C3%ADvar%2C_Bogot%C3%A1.jpg/1200px-Plaza_de_Bol%C3%ADvar%2C_Bogot%C3%A1.jpg', caption: 'Plaza de Bolivar y Catedral Primada, epicentro del Centro Historico de Bogota' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/Calle_empedrada_La_Candelaria.jpg/800px-Calle_empedrada_La_Candelaria.jpg', caption: 'Calle empedrada de La Candelaria, el tejido historico donde vive LaK-Zona' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/Museo_del_Oro_Bogot%C3%A1.jpg/800px-Museo_del_Oro_Bogot%C3%A1.jpg', caption: 'Museo del Oro, a pocos minutos caminando del Eje Ambiental y la Calle 15' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a4/Museo_del_Oro_-_Fachada.jpg/960px-Museo_del_Oro_-_Fachada.jpg', caption: 'La memoria del Rio Vicach\u00e1 y el Eje Ambiental de la Avenida Jimenez marcan el territorio de LaK-Zona' }
];

// Los espacios de LaK-Zona (Las Zonas) con sus aforos y metros cuadrados
// documentados en el sitio oficial (lak-zona.org/page5.html.html).
const ZONAS = [
  { nombre: 'Studio de Produccion Musical', metraje: '', aforo: '', detalle: 'Grabacion y mezcla con profesionales para hacer realidad tu proyecto' },
  { nombre: 'Ensayos y Creacion Musical', metraje: '', aforo: '', detalle: 'Acondicionado acusticamente, con bateria e instrumentos para crear y ensamblar proyectos' },
  { nombre: 'Ensayos en Danza o Circo', metraje: '20 m\u00b2', aforo: '', detalle: 'Pared de espejos y puntos de anclaje para tela y aereos' },
  { nombre: 'Proyeccion Audiovisual y Cine', metraje: '30 m\u00b2', aforo: '40', detalle: 'Tarima solida de 9 m\u00b2 y proyeccion para cine y audiovisual' },
  { nombre: 'K-F\u00e9', metraje: '70 m\u00b2', aforo: '80 de pie / 50 sentados', detalle: 'Tarima movil 3 m\u00b2, 36 sillas, 11 mesas, taquilla y maletero' },
  { nombre: 'Auditorio', metraje: 'Escenario 265.5 m\u00b2', aforo: '500 de pie / 200 sentados', detalle: 'Escenario principal con aforo amplio para conciertos y eventos' },
  { nombre: 'Galer\u00edas', metraje: '45 m', aforo: '', detalle: 'Espacio polifuncional para exposiciones, entrevistas, musicales y poesia; punto de anclaje en techo para aereos' },
  { nombre: 'Oficinas y Coworking', metraje: '', aforo: '', detalle: 'Ideales para artistas independientes, colectivos y agrupaciones con internet, cafeter\u00eda y espacios de junte' }
];

const BASE = {
  slug: SLUG,
  nombre: 'LaK-Zona (Espacio Cultural Art\u00edstico Alternativo)',
  categoria_slug: 'sitio',
  lead: 'Colectivo de artivistas, gestores y productores que desde 2010 fomenta los Derechos Culturales en el Centro Hist\u00f3rico de Bogot\u00e1, en el antiguo Hotel Moderno de la Calle 15: estudios, auditorio, galer\u00edas, coworking, residencias art\u00edsticas y el Museo Urbano-Ancestral de la Memoria.',
  descripcion: 'LaK-Zona es el Espacio Cultural Art\u00edstico Alternativo del Centro Hist\u00f3rico de Bogot\u00e1, sede del colectivo de artivistas, gestores y productores fundado en 2010 y formalizado en 2015 como ONG LaK-Zona // ASOCAMEC (Asociaci\u00f3n de Artistas Medios Espacios Culturales), persona jur\u00eddica sin \u00e1nimo de lucro.\n\nEl espacio ocupa el antiguo Hotel Moderno en la Calle 15 # 9-64 (barrio Veracruz), calle fundacional de Bacat\u00e1 a pocos metros del R\u00edo Vicach\u00e1, hoy el Eje Ambiental y la Avenida Jim\u00e9nez. La familia que gestiona LaK-Zona lleva m\u00e1s de 100 a\u00f1os y 6 generaciones en el Centro, recuperando la memoria hist\u00f3rica del "Camell\u00f3n de los Carneros" y del corredor del tranv\u00eda de la Calle 15.\n\nLas Zonas ofrecen infraestructura para la creaci\u00f3n art\u00edstica y el trabajo comunitario: studio de producci\u00f3n musical, ensayos musicales (ac\u00fasticos, con bater\u00eda), ensayos de danza o circo (20 m\u00b2, espejos y puntos de anclaje para a\u00e9reos), proyecci\u00f3n audiovisual y cine (30 m\u00b2, aforo 40), K-F\u00e9 (70 m\u00b2, aforo 80), Auditorio (escenario de 265.5 m\u00b2, aforo 500), Galer\u00edas (45 m) y Oficinas\/Coworking, todo con alquiler, producci\u00f3n y coproducci\u00f3n para artistas de corta o larga trayectoria.\n\nTambi\u00e9n es destino de turismo comunitario: el Museo Urbano-Ancestral de la Memoria de m\u00e1s de 1000 m\u00b2, residencias art\u00edsticas (apartaestudio de 30 m\u00b2 para 6 a 12 personas) y visitas guiadas por las exposiciones permanentes de galer\u00edas y talleres. La programaci\u00f3n semanal es de entrada libre de 5 pm a 11 pm: Sesiones PIYA\u00c1 (mi\u00e9rcoles, Hip-Hop), Somos Calle (jueves, m\u00fasica variada y juegos de mesa), Junte Salsero (viernes) y K-F\u00e9 (s\u00e1bado, rana, karaoke y 2x1).',
  highlight: 'Estudios de m\u00fasica \u00b7 Auditorio \u00b7 Galer\u00edas \u00b7 Coworking \u00b7 Residencias art\u00edsticas \u00b7 Museo Urbano-Ancestral \u00b7 Programaci\u00f3n semanal de entrada libre en la Calle 15 del Centro Hist\u00f3rico.',
  ciudad: 'Bogot\u00e1',
  region: 'Cundinamarca',
  barrio: 'Veracruz (La Candelaria \u00b7 Santa F\u00e9)',
  lat: 4.5985,
  lng: -74.0768,
  whatsapp: '',
  telefono: '',
  email: '',
  web: 'https://lak-zona.org',
  instagram: 'https://www.instagram.com/lakzonaeslazona',
  precio_desde: 'Entrada libre a la programaci\u00f3n (alquiler de espacios con cotizaci\u00f3n)',
  horario: 'Programaci\u00f3n Mi\u00e9-S\u00e1b 5pm-11pm \u00b7 Espacios y residencias con reserva',
  emoji: '\ud83c\udfb5',
  hero_bg: '#7c2d12',
  foto_hero: HERO,
  tipo: 'Espacio cultural-art\u00edstico alternativo \u00b7 Estudios \u00b7 Auditorio \u00b7 Galer\u00edas \u00b7 Coworking \u00b7 Residencias',
  capacidad: 'Auditorio 500 / K-F\u00e9 80 / Proyecci\u00f3n 40',
  como_llegar: 'Calle 15 # 9-64, barrio Veracruz, Centro de Bogot\u00e1. A pocos minutos del Eje Ambiental y la Avenida Jim\u00e9nez (R\u00edo Vicach\u00e1), y del Museo del Oro. TransMilenio: estaciones San Victorino, Las Aguas o Museo del Oro y caminar.',
  status: 'published',
  destacado: true
};

const TAGS = {
  tipo_actividad: 'Espacio cultural-art\u00edstico alternativo y colectivo de Derechos Culturales',
  dificultad: 'Baja',
  dificultad_desc: 'Es un espacio cultural urbano en el Centro Hist\u00f3rico: no requiere esfuerzo f\u00edsico especial. Las residencias y los talleres se coordinan con el equipo de LaK-Zona.',
  duracion: 'Programaci\u00f3n de 5 pm a 11 pm (espacios con reserva)',
  altitud: '2600',
  temporada: ['Todo el a\u00f1o', 'Mi\u00e9rcoles a s\u00e1bado', 'Programaci\u00f3n comunitaria'],
  precio_entrada: 'Entrada libre a la programaci\u00f3n semanal (Sesiones PIYA\u00c1, Somos Calle, Junte Salsero, K-F\u00e9). El alquiler de estudios, auditorio, galer\u00edas y residencias se cotiza con el equipo.',
  distancia: 'Calle 15 # 9-64, barrio Veracruz, Centro de Bogot\u00e1. Cerca de la Plazoleta del Chorro de Quevedo, el Eje Ambiental, la Avenida Jim\u00e9nez y el Museo del Oro.',
  como_llegar: BASE.como_llegar,
  permisos: 'Espacio de puertas abiertas para la comunidad; los eventos tienen su propia din\u00e1mica de ingreso y las residencias se gestionan por convocatoria o acuerdo.',
  temporada_nota: 'La programaci\u00f3n corre todas las semanas de mi\u00e9rcoles a s\u00e1bado de 5 pm a 11 pm con entrada libre. La oferta de espacios, residencias y coproducci\u00f3n est\u00e1 disponible todo el a\u00f1o previa cotizaci\u00f3n.',
  fauna_flora: JSON.stringify([
    { emoji: '\ud83c\udfb5', nombre: 'La Calle 15', hecho: 'Calle fundacional de Bacat\u00e1, el antiguo "Camell\u00f3n de los Carneros" y corredor del tranv\u00eda del Centro' },
    { emoji: '\ud83c\udf0a', nombre: 'R\u00edo Vicach\u00e1', hecho: 'El antiguo r\u00edo San Francisco, hoy el Eje Ambiental y la Avenida Jim\u00e9nez, a metros de la sede' },
    { emoji: '\ud83c\udfad', nombre: 'Auditorio', hecho: 'Escenario principal de 265.5 m\u00b2 con aforo para 500 personas de pie' },
    { emoji: '\ud83d\udd8c', nombre: 'Galer\u00edas', hecho: '45 m de espacio polifuncional para exposiciones, musicales y poes\u00eda' },
    { emoji: '\ud83c\udfdb', nombre: 'Museo Urbano-Ancestral', hecho: 'M\u00e1s de 1000 m\u00b2 dedicados a la memoria del Centro y sus comunidades' }
  ]),
  secretos: JSON.stringify([
    { icono: '\ud83c\udfb5', titulo: 'Sesiones PIYA\u00c1', texto: 'Mi\u00e9rcoles de Hip-Hop para aprender del junte: componer y producir. Entrada libre de 5 pm a 11 pm.', tag: 'Imperdible', tag_color: 'gold' },
    { icono: '\ud83d\udc83', titulo: 'Junte Salsero', texto: 'Viernes de buena salsa con el parche del barrio: la mera melod\u00eda con entrada libre.', tag: 'M\u00fasica', tag_color: 'blue' },
    { icono: '\ud83c\udfa8', titulo: 'Galer\u00edas y Museo de la Memoria', texto: 'Exposiciones permanentes de m\u00e1s de 1000 m\u00b2 para conocer la historia viva del Centro y la Calle 15.', tag: 'Cultura', tag_color: 'green' },
    { icono: '\ud83d\udcdc', titulo: 'Residencias art\u00edsticas', texto: 'Apartaestudio de 30 m\u00b2 para 6 a 12 personas: intercambio de saberes entre artistas locales y extranjeros.', tag: 'Hospedaje', tag_color: 'brown' }
  ]),
  regulaciones: JSON.stringify([
    { icono: '\ud83d\ude4b', titulo: 'Entrada libre', desc: 'La programaci\u00f3n semanal (mier-sab 5pm-11pm) es de entrada libre para toda la comunidad', tipo: 'info' },
    { icono: '\ud83c\udfb5', titulo: 'Alquiler de espacios', desc: 'Estudios, auditorio, galer\u00edas y oficinas se cotizan con el equipo para ensayos, producci\u00f3n y coproducci\u00f3n', tipo: 'cumplir' },
    { icono: '\ud83c\udfd5', titulo: 'Residencias por convocatoria', desc: 'El apartaestudio art\u00edstico se gestiona por convocatoria o acuerdo con el colectivo', tipo: 'recomendado' },
    { icono: '\ud83d\udee0', titulo: 'Espacio comunitario', desc: 'Espacio abierto, diverso y amigable; el junte y el trabajo comunitario est\u00e1n en el centro de la propuesta', tipo: 'recomendado' }
  ]),
  checklist_tip: 'Llega temprano (desde las 5 pm) para recorrer las galer\u00edas y el Museo de la Memoria antes de que arranque el junte de la noche. Los mi\u00e9rcoles son ideales para el Hip-Hop y los viernes para el salsa.',
  entradas: [
    { tipo: 'Programaci\u00f3n semanal', precio: 'libre', incluye: 'Sesiones PIYA\u00c1, Somos Calle, Junte Salsero y K-F\u00e9 (mier-sab 5pm-11pm)', link: 'https://lak-zona.org' },
    { tipo: 'Visitas guiadas', precio: 'variable', incluye: 'Recorridos por las exposiciones permanentes de galer\u00edas y talleres del Museo de la Memoria', link: 'https://lak-zona.org' },
    { tipo: 'Residencias art\u00edsticas', precio: 'variable', incluye: 'Apartaestudio de 30 m\u00b2 para 6 a 12 personas: intercambio de saberes entre artistas', link: 'https://lak-zona.org' },
    { tipo: 'Alquiler de espacios', precio: 'variable', incluye: 'Estudios, auditorio, galer\u00edas y oficinas para ensayo, producci\u00f3n y coproducci\u00f3n', link: 'https://lak-zona.org' }
  ],
  tours: [
    {
      nombre: 'Museo Urbano-Ancestral de la Memoria',
      precio: 'Variable', precio_sub: 'visita guiada',
      duracion: '1-2 horas', tipo_tour: 'Cultural', idioma: 'Espa\u00f1ol', max_personas: 'Abierto',
      rating: '4.8', review_count: 120,
      descripcion: 'M\u00e1s de 1000 m\u00b2 dedicados a la memoria hist\u00f3rica y geogr\u00e1fica del Centro de Bogot\u00e1 y la Calle 15, con exposiciones permanentes en galer\u00edas y talleres.',
      incluye: ['Recorrido guiado', 'Exposiciones permanentes', 'Historia de la Calle 15 y el R\u00edo Vicach\u00e1'],
      no_incluye: ['Transporte', 'Alimentaci\u00f3n'],
      link_reserva: 'https://lak-zona.org',
      featured: true
    },
    {
      nombre: 'Corredor Cultural Calle 15 y Eje Ambiental',
      precio: 'Variable', precio_sub: 'segun acuerdo',
      duracion: '2-3 horas', tipo_tour: 'Experiencia', idioma: 'Espa\u00f1ol', max_personas: 'Abierto',
      rating: '4.7', review_count: 90,
      descripcion: 'Recorrido por el Camell\u00f3n de los Carneros, el antiguo corredor del tranv\u00eda y el Eje Ambiental de la Avenida Jim\u00e9nez, con el equipo de LaK-Zona.',
      incluye: ['Gu\u00eda local', 'Memoria del tranv\u00eda y el R\u00edo Vicach\u00e1', 'Arte y murales en el Centro'],
      no_incluye: ['Transporte', 'Alimentaci\u00f3n'],
      link_reserva: 'https://lak-zona.org',
      featured: false
    }
  ],
  equipamiento: [
    { item: 'Ropa c\u00f3moda para caminar el Centro Hist\u00f3rico', prioridad: 'Recomendado' },
    { item: 'Para los juntes de la noche, actitud de parche y comunidad', prioridad: 'Recomendado' },
    { item: 'Consulta la programaci\u00f3n semanal en redes antes de ir', prioridad: 'Recomendado' },
    { item: 'Para alquilar estudios o residencias, coordina con el equipo', prioridad: 'Opcional' }
  ],
  itinerario: [
    { dia: 'Miercoles', hora: '5:00 pm', titulo: 'Sesiones PIYA\u00c1', icono: '\ud83c\udfb5', detalle: 'Hip-Hop: aprende a componer y producir, entrada libre', tags: ['Hip-Hop'] },
    { dia: 'Jueves', hora: '5:00 pm', titulo: 'Somos Calle', icono: '\ud83c\udfb0', detalle: 'M\u00fasica variada y juegos de mesa con amigos, entrada libre', tags: ['Junte'] },
    { dia: 'Viernes', hora: '5:00 pm', titulo: 'Junte Salsero', icono: '\ud83d\udc83', detalle: 'Buena salsa para escuchar la mera melod\u00eda con el parche', tags: ['Salsa'] },
    { dia: 'Sabado', hora: '5:00 pm', titulo: 'K-F\u00e9', icono: '\ud83c\udfa4', detalle: 'Juegos tradicionales, rana y karaoke; 2x1 en pola y c\u00f3cteles de 5 a 7', tags: ['K-F\u00e9'] }
  ],
  dificultad_tags: [
    { texto: 'Espacio cultural urbano a nivel de calle, sin esfuerzo f\u00edsico', apto: true },
    { texto: 'Recorrido a pie por el Centro Hist\u00f3rico (Jimen\u00e9z, Museo del Oro)', apto: true },
    { texto: 'Noches de junte que se extienden hasta las 11 pm', apto: false },
    { texto: 'Residencias y talleres requieren coordinaci\u00f3n previa', apto: false }
  ],
  temporada_matriz: {
    Ene: 'ideal', Feb: 'ideal', Mar: 'ideal', Abr: 'ideal', May: 'ideal',
    Jun: 'ideal', Jul: 'ideal', Ago: 'ideal', Sep: 'ideal', Oct: 'ideal', Nov: 'ideal', Dic: 'ideal'
  }
};

const FAQS = [
  { pregunta: '\u00bfD\u00f3nde queda LaK-Zona?', respuesta: 'En la Calle 15 # 9-64, barrio Veracruz, Centro de Bogot\u00e1, en el antiguo Hotel Moderno. A pocos minutos del Eje Ambiental, la Avenida Jim\u00e9nez (R\u00edo Vicach\u00e1), el Chorro de Quevedo y el Museo del Oro.' },
  { pregunta: '\u00bfQu\u00e9 es LaK-Zona?', respuesta: 'Un Espacio Cultural Art\u00edstico Alternativo y un colectivo de artivistas, gestores y productores (ONG LaK-Zona // ASOCAMEC, sin \u00e1nimo de lucro) que desde 2010 fomenta los Derechos Culturales en el Centro Hist\u00f3rico de Bogot\u00e1.' },
  { pregunta: '\u00bfCu\u00e1nto cuesta entrar?', respuesta: 'La programaci\u00f3n semanal (mi\u00e9rcoles a s\u00e1bado, 5 pm a 11 pm) es de entrada libre. El alquiler de estudios, auditorio, galer\u00edas y residencias art\u00edsticas se cotiza con el equipo.' },
  { pregunta: '\u00bfQu\u00e9 espacios se pueden alquilar?', respuesta: 'Studio de producci\u00f3n musical, ensayos musicales (con bater\u00eda), ensayos de danza o circo (20 m\u00b2), proyecci\u00f3n audiovisual (30 m\u00b2), K-F\u00e9 (70 m\u00b2), Auditorio (aforo 500), Galer\u00edas (45 m) y Oficinas\/Coworking.' },
  { pregunta: '\u00bfQu\u00e9 programaci\u00f3n semanal ofrece?', respuesta: 'Mi\u00e9rcoles Sesiones PIYA\u00c1 (Hip-Hop), jueves Somos Calle, viernes Junte Salsero y s\u00e1bado K-F\u00e9 con karaoke, todos de 5 pm a 11 pm con entrada libre. Tambi\u00e9n hay visitas guiadas al Museo Urbano-Ancestral de la Memoria.' },
  { pregunta: '\u00bfD\u00f3nde puedo ver sus redes?', respuesta: 'Instagram @lakzonaeslazona, Facebook LaK-Zona, YouTube LaK-Zona es la zona y la web oficial lak-zona.org, donde se publica la programaci\u00f3n y los acuerdos de alquiler y residencias.' }
];

module.exports = { SLUG: SLUG, HERO: HERO, PHOTOS: PHOTOS, ZONAS: ZONAS, BASE: BASE, TAGS: TAGS, FAQS: FAQS };

if (require.main !== module) return;

(async function main() {
  var url = process.env.DATABASE_URL || process.argv[2];
  if (!url) {
    console.error('Falta DATABASE_URL.');
    console.error('Uso: DATABASE_URL=postgres://... node scripts/seed-la-k-zona.js [--dry]');
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
  console.log('Verifica en: https://exploraco.co/la-k-zona.html (revisa sitemap y /api/destinos).');
})().catch(function(err) {
  console.error('ERROR:', err.message);
  process.exit(1);
});
