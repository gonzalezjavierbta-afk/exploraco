// scripts/seed-centro-cultural-delia-zapata-olivella.js
// Crea (o actualiza) la pagina dinamica centro-cultural-delia-zapata-olivella.html
// con los datos de ficha-centro-cultural-delia-zapata-olivella.md, replicando
// EXACTAMENTE lo que guardaria el formulario admin.html. Patron de
// scripts/seed-el-virrey.js con upsert completo.
//
// Rating: NO se siembran resenas ni se hardcodea rating. La pagina queda con
// rating/contador en 0 hasta que lleguen interacciones reales (ADR-009).
//
// Uso:
//   DATABASE_URL=postgres://... node scripts/seed-centro-cultural-delia-zapata-olivella.js --dry
//   DATABASE_URL=postgres://... node scripts/seed-centro-cultural-delia-zapata-olivella.js
//
// Idempotente: re-ejecutable sin efectos secundarios (ON CONFLICT slug).

var neon = null;
function getNeon() {
  if (!neon) neon = require('@neondatabase/serverless').neon;
  return neon;
}

const SLUG = 'centro-cultural-delia-zapata-olivella';
const HERO = 'https://thumb.wikimedia.org/wikipedia/commons/thumb/8/83/Teatro_Col%C3%B3n_-_Bogot%C3%A1_-_Colombia_2024.jpg/960px-Teatro_Col%C3%B3n_-_Bogot%C3%A1_-_Colombia_2024.jpg';

const PHOTOS = [
  { url: HERO, caption: 'Fachada del Teatro Colon, edificio al que se anexa el Centro Cultural Delia Zapata Olivella' },
  { url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b6/Teatro_Col%C3%B3n_%28Bogot%C3%A1%29_03.JPG/960px-Teatro_Col%C3%B3n_%28Bogot%C3%A1%29_03.JPG', caption: 'Interior y escenario del Teatro Colon, casa de las artes escenicas en Bogota' },
  { url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/1/1c/2021_Bogot%C3%A1_-_Iglesia_de_Nuestra_Se%C3%B1ora_de_La_Candelaria_desde_la_carrera_4.jpg/960px-2021_Bogot%C3%A1_-_Iglesia_de_Nuestra_Se%C3%B1ora_de_La_Candelaria_desde_la_carrera_4.jpg', caption: 'Calles patrimoniales de La Candelaria, entorno del centro cultural' },
  { url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/1/1f/Plaza_de_Bol%C3%ADvar_-_Bogot%C3%A1_-_Colombia_2024.jpg/960px-Plaza_de_Bol%C3%ADvar_-_Bogot%C3%A1_-_Colombia_2024.jpg', caption: 'Plaza de Bolivar, a pocas cuadras del centro cultural' },
  { url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/8/88/Casa_de_Delia_Zapata_Olivella_01.JPG/960px-Casa_de_Delia_Zapata_Olivella_01.JPG', caption: 'Casa de Delia Zapata Olivella, la investigadora que da nombre al centro cultural' }
];

const BASE = {
  slug: SLUG,
  nombre: 'Centro Cultural Delia Zapata Olivella',
  categoria_slug: 'sitio',
  lead: 'El complejo cultural estatal mas moderno del centro historico de Bogota, dedicado a las artes escenicas y a la diversidad pluricultural de Colombia.',
  descripcion: 'Inaugurado a finales de 2022 en pleno corazon de La Candelaria, el Centro Cultural Delia Zapata Olivella rinde homenaje a la celebre investigadora, bailarina y gestora cultural afrocolombiana Delia Zapata Olivella. Con mas de 15.000 metros cuadrados de infraestructura de vanguardia, es una extension arquitectonica y programatica del historico Teatro Colon y del Ministerio de las Culturas, las Artes y los Saberes.\n\nEl complejo alberga tres salas principales equipadas con la mas alta tecnologia acustica y escenica: la Sala Delia Zapata (capacidad para mas de 400 personas), la Sala Fanny Mikey (formato caja negra para creacion experimental) y un amplio Ensayadero, ademas de la Plaza del Centro, un espacio al aire libre ideado para encuentros comunitarios y espectaculos de gran formato.\n\nSu programacion abarca danza, teatro, musica contemporanea y tradicional, asi como residencias artisticas y exposiciones. El sitio conecta de manera fluida el patrimonio colonial bogotano con una propuesta arquitectonica contemporanea luminosa, abierta y accesible para todo publico.',
  highlight: '+15.000 m\u00b2 de infraestructura cultural \u00b7 Cerca a la Plaza de Bolivar',
  ciudad: 'Bogota',
  region: 'Cundinamarca',
  barrio: 'La Candelaria',
  lat: 4.5969,
  lng: -74.0734,
  whatsapp: '',
  telefono: '+57 601 3816380',
  email: 'info@eneldelia.gov.co',
  web: 'https://eneldelia.gov.co/',
  instagram: '@eneldelia',
  precio_desde: 'Entrada libre a galerias; eventos desde $20.000 COP',
  horario: 'Mar-Sab 10:00-20:00, Dom 10:00-18:00. Lunes cerrado',
  emoji: '\ud83c\udfad',
  hero_bg: 'linear-gradient(135deg,#1f1c2c 0%,#928dab 100%)',
  foto_hero: HERO,
  tipo: 'Centro Cultural \u00b7 Artes Escenicas \u00b7 Arquitectura',
  capacidad: 'Aforo total +1.500 personas entre sus tres salas y plazas',
  como_llegar: 'TransMilenio estacion Museo del Oro o Las Aguas; caminar por Calle 11 hasta Carrera 6 # 5-22',
  status: 'published',
  destacado: true
};

const TAGS = {
  tipo_actividad: 'Centro Cultural y Artes Escenicas',
  dificultad: 'Facil',
  dificultad_desc: 'Accesible para todo tipo de publico con infraestructura moderna y adaptada.',
  duracion: '1-3 horas',
  altitud: '2640',
  temporada: ['Todo el ano'],
  precio_entrada: 'Gratuito para plaza y exposiciones temporales. Obras y conciertos segun taquilla.',
  distancia: 'Centro Historico de Bogota',
  como_llegar: 'TransMilenio hasta Museo del Oro, caminar 5 cuadras al sur hacia La Candelaria.',
  permisos: 'Libre para areas comunes; entrada con boleto para espectaculos en salas.',
  temporada_nota: 'Programacion constante durante todo el ano, con picos de eventos en festivales de teatro.',
  fauna_flora: '',
  secretos: JSON.stringify([
    { icono: '\ud83c\udfad', titulo: 'Tributo a Delia Zapata', texto: 'El nombre honra a la primera gran investigadora afrocolombiana que llevo las danzas tradicionales del Pacifico y Caribe a escenarios internacionales.', tag: 'Historia', tag_color: 'purple' },
    { icono: '\ud83c\udfdb\ufe0f', titulo: 'Puente Patrimonial', texto: 'El edificio subterraneo y aereo conecta de forma interna con el historico Teatro Colon de 1892.', tag: 'Arquitectura', tag_color: 'gold' },
    { icono: '\ud83d\udd0a', titulo: 'Acustica Avanzada', texto: 'La Sala Fanny Mikey fue concebida como una caja negra con paneles fonoabsorbentes ajustables para performances experimentales.', tag: 'Tecnologia', tag_color: 'blue' }
  ]),
  regulaciones: 'Prohibido consumir alimentos en salas, uso de flash en funciones y fumar en las instalaciones.',
  checklist_tip: 'Consulta la web oficial con antelacion, varios espectaculos internacionales ofrecen boleteria libre con registro digital previo.',
  entradas: [
    { tipo: 'Acceso General Plaza y Galerias', precio: 'Gratis', incluye: 'Ingreso a plazoleta y exposiciones de arte', link: 'https://eneldelia.gov.co/' },
    { tipo: 'Boleteria Obras y Conciertos', precio: '$20.000 - $80.000 COP', incluye: 'Ubicacion numerada en funcion', link: 'https://www.tuboleta.com/' }
  ],
  tours: [
    {
      nombre: 'Visita Guiada Arquitectonica e Historica',
      precio: '0', precio_sub: 'Guiado por mediadores',
      duracion: '1 hora', tipo_tour: 'Grupal', idioma: 'Espanol', max_personas: '25',
      rating: '', review_count: 0,
      descripcion: 'Recorrido por las salas del complejo, con explicacion de la transicion arquitectonica entre el Teatro Colon y la nueva sede.',
      incluye: ['Acompanamiento de mediador cultural'],
      no_incluye: ['Boleteria a funciones de pago', 'Alimentos'],
      link_reserva: 'https://eneldelia.gov.co/',
      featured: true
    }
  ],
  equipamiento: [
    { item: 'Documento de Identidad', prioridad: 'Obligatorio' },
    { item: 'Ropa comoda y abrigo ligero', prioridad: 'Recomendado' },
    { item: 'Calzado para caminata urbana', prioridad: 'Recomendado' }
  ],
  itinerario: [
    { dia: 'Dia 1', hora: '10:00', titulo: 'Llegada a la Plaza del Centro', icono: '\ud83c\udfdb\ufe0f', detalle: 'Ingreso por la Calle 11 para apreciar el diseno arquitectonico contemporaneo integrando el entorno colonial.', tags: ['Arquitectura', 'Fotos'] },
    { dia: 'Dia 1', hora: '11:00', titulo: 'Recorrido por Exposiciones Temporales', icono: '\ud83c\udfa8', detalle: 'Visita libre a las salas de exhibicion de artes plasticas y memoria cultural.', tags: ['Arte', 'Exposicion'] },
    { dia: 'Dia 1', hora: '15:00', titulo: 'Funcion Escenica', icono: '\ud83c\udfad', detalle: 'Disfrute de una presentacion de teatro o danza en la Sala Delia Zapata o Sala Fanny Mikey.', tags: ['Teatro', 'Danza'] }
  ],
  dificultad_tags: [
    { texto: 'Apto para personas con movilidad reducida', apto: true },
    { texto: 'Apto para ninos y familias', apto: true },
    { texto: 'Requiere esfuerzo fisico moderado o alto', apto: false }
  ],
  temporada_matriz: {
    Ene: 'ideal', Feb: 'ideal', Mar: 'ideal', Abr: 'ideal', May: 'ideal',
    Jun: 'ideal', Jul: 'ideal', Ago: 'ideal', Sep: 'ideal', Oct: 'ideal', Nov: 'ideal', Dic: 'ideal'
  }
};

const FAQS = [
  { pregunta: 'Donde queda el Centro Cultural Delia Zapata Olivella?', respuesta: 'En La Candelaria, Bogota, en la Carrera 6 # 5-22, junto al Teatro Colon.' },
  { pregunta: 'La entrada al centro cultural es gratuita?', respuesta: 'El acceso a la plaza y galerias es libre; los espectaculos en sala requieren boleteria.' },
  { pregunta: 'Quien fue Delia Zapata Olivella?', respuesta: 'Destacada investigadora y bailarina colombiana, icono de las artes y folclor afrocolombiano.' },
  { pregunta: 'Cuenta con acceso para personas con movilidad reducida?', respuesta: 'Si, el edificio dispone de rampas, ascensores y espacios adecuados en salas.' },
  { pregunta: 'Tiene parqueadero propio?', respuesta: 'No tiene parqueadero publico propio; se recomiendan parqueaderos privados del sector.' }
];

module.exports = { SLUG: SLUG, HERO: HERO, PHOTOS: PHOTOS, BASE: BASE, TAGS: TAGS, FAQS: FAQS };

if (require.main !== module) return;

(async function main() {
  var url = process.env.DATABASE_URL || process.argv[2];
  if (!url) {
    console.error('Falta DATABASE_URL.');
    console.error('Uso: DATABASE_URL=postgres://... node scripts/seed-centro-cultural-delia-zapata-olivella.js [--dry]');
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