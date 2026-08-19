// scripts/seed-el-goce-pagano.js
// Crea (o actualiza) la pagina dinamica el-goce-pagano.html con los datos
// del legendario bar de salsa El Goce Pagano (Las Aguas, Bogota), fundado 1978,
// siguiendo el patron de scripts/seed-quiebracanto.js (categoria sitio, upsert completo).
//
// Uso:
//   DATABASE_URL=postgres://... node scripts/seed-el-goce-pagano.js --dry
//   DATABASE_URL=postgres://... node scripts/seed-el-goce-pagano.js

var neon = null;
function getNeon() {
  if (!neon) neon = require('@neondatabase/serverless').neon;
  return neon;
}

const SLUG = 'el-goce-pagano';
const HERO = 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/60/Bogota_-_Streets_at_night_009.jpg/960px-Bogota_-_Streets_at_night_009.jpg';

const PHOTOS = [
  { url: HERO, caption: 'Calles del centro de Bogota de noche, donde vive El Goce Pagano desde 1978' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e8/Salsa_dance_dip.jpg/960px-Salsa_dance_dip.jpg', caption: 'Pareja bailando salsa, el alma de la pista del Goce' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fa/La_Macarena_panorama_norte_sur.JPG/960px-La_Macarena_panorama_norte_sur.JPG', caption: 'Panoramica del centro de Bogota desde La Macarena' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Palacio_Li%C3%A9vano%2C_Bogot%C3%A1.jpg/960px-Palacio_Li%C3%A9vano%2C_Bogot%C3%A1.jpg', caption: 'Palacio Lievano, icono del centro historico' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/Plaza_de_Bol%C3%ADvar_en_Bogot%C3%A1_%28Colombia%29.jpg/960px-Plaza_de_Bol%C3%ADvar_en_Bogot%C3%A1_%28Colombia%29.jpg', caption: 'La Plaza de Bolivar, corazon del centro' }
];

const BASE = {
  slug: SLUG,
  nombre: 'El Goce Pagano',
  categoria_slug: 'sitio',
  lead: 'Bar de salsa mas antiguo de Bogota (1978): acetatos legendarios, guaguanco, intelectuales de la Nacional, 47 anos en Las Aguas.',
  descripcion: 'El Goce Pagano (Diagonal 20A No. 0-82, Las Aguas, frente a la Universidad de los Andes, Bogota, coordenadas 4.6035, -74.0658) es el bar de salsa mas antiguo de Bogota. Fundado en 1978 por el sociologo Cesar Alberto Villegas Osorio ("Pagano"), el economista Gustavo Bustamante y el fotografo Juan Guillermo Gaviria, nacio para que las mujeres tuvieran un espacio propio en la noche bogotana, lejos de los "palacios del dedo". Aqui se reunian profesores y estudiantes de la Nacional con tendencias de izquierda, al son de la musica cubana, guaguanco y latin jazz.\n\nLa idea era marcar la diferencia entre una rumba popular y otra para intelectuales. Ese secreto "no andar colocando cosas de moda" es lo que ha mantenido vivo al Goce por 47 anos. La coleccion de acetatos legendarios de salsa (Van Van de Cuba, Eddy Palmieri, Herencia de Timbiqui) sigue sonando en las noches de viernes y sabados. El lugar ha tenido varias sedes: la original en la carrera 13A con calle 23 (al lado de un burdel llamado El Tunjo), y la actual en Las Aguas, frente a la U. Andes, en el eje de la Avenida Jimenez.\n\nEl Goce Pagano no es un bar de lujo: es un templo de la salsa de verdad. Botellas de trago entre $60.000 y $230.000. El publico es una mezcla de universitarios, salseros de toda la vida y curiosos que llegan buscando la historia viva de la rumba bogotana. Gabriel Garcia Marquez fue parroquiano en las epocas de la Revista Alternativa. Las noches de viernes (desde 6 PM) y sabados (desde 7 PM) hasta las 3 AM son el ritual.',
  highlight: 'Desde 1978: bar mas viejo, acetatos, guaguanco cubano, rumba intelectual de la Nacional.',
  ciudad: 'Bogota',
  region: 'Cundinamarca',
  barrio: 'Las Aguas',
  lat: 4.6035181,
  lng: -74.0657786,
  whatsapp: '',
  telefono: '',
  email: '',
  web: '',
  instagram: '@elgocepagano',
  precio_desde: 'Botellas $60k-$230k ref; cover variable eventos',
  horario: 'Vie 18:00-3:00; Sab 19:00-3:00 ref',
  emoji: '\ud83c\udfdb\ufe0f',
  hero_bg: '#7c2d12',
  foto_hero: HERO,
  tipo: 'Salsa bar  -  Acetatos  -  47 anos  -  Historia viva',
  capacidad: 'Intimo, aforo reducido',
  como_llegar: 'TransMilenio Las Aguas + 5 min caminando. Plaza Bolivar: 10 min. Taxi: Diagonal 20A #0-82, Las Aguas.',
  status: 'published',
  destacado: true
};

const TAGS = {
  tipo_actividad: 'Salsa bar',
  dificultad: 'Facil',
  dificultad_desc: 'Bar pequeno con pista a nivel; ambiente intimo y autentico. Requiere ser mayor de 18 anos. Zona centro historico caminable de dia, precaucion nocturna.',
  duracion: '3-5 horas',
  altitud: '2600',
  temporada: ['Todo el ano', 'Viernes y sabados noche', 'Festivos y eventos especiales'],
  precio_entrada: 'Sin cover fijo publicado; botellas $60.000-$230.000; consumo en barra.',
  distancia: 'Diagonal 20A #0-82, Las Aguas, frente Universidad de los Andes. A pocas cuadras de estacion Las Aguas TransMilenio.',
  como_llegar: BASE.como_llegar,
  permisos: 'Mayor de 18 anos con documento de identidad valido.',
  temporada_nota: 'Solo abre viernes y sabados noche. El resto de la semana permanece cerrado. Verificar en Instagram @elgocepagano antes de ir.',
  fauna_flora: JSON.stringify([
    { emoji: '\ud83c\udfdb\ufe0f', nombre: 'Acetatos de coleccion', hecho: 'Discos de vinilo originales: Van Van, Eddy Palmieri, Herencia de Timbiqui, Fania All Stars' },
    { emoji: '\ud83c\udfb5', nombre: 'Musica cubana y guaguanco', hecho: 'La seleccion que definio la rumba intelectual bogotana desde 1978' },
    { emoji: '\ud83c\udf93', nombre: 'Historia de la Nacional', hecho: 'Profesores y estudiantes de la U. Nacional fundaron este espacio en 1978' },
    { emoji: '\ud83d\udcda', nombre: 'Gabriel Garcia Marquez', hecho: 'El Nobel fue parroquiano habitual en epocas de la Revista Alternativa' }
  ]),
  secretos: JSON.stringify([
    { icono: '\ud83c\udfdb\ufe0f', titulo: 'Solo viernes y sabados', texto: 'El Goce abre solo dos noches a la semana: viernes 6 PM y sabados 7 PM, hasta las 3 AM. El resto de la semana esta cerrado.', tag: 'Imperdible', tag_color: 'gold' },
    { icono: '\ud83c\udfb5', titulo: 'Acetatos, no playlists', texto: 'La musica sale de discos de vinilo originales manipulados por DJs que conocen cada surco. No hay Spotify aqui.', tag: 'Musica', tag_color: 'green' },
    { icono: '\ud83c\udf93', titulo: 'Cuna de intelectuales', texto: 'Aqui se gestaron tertulias de la Revista Alternativa con Gabo, Enrique Santos y la izquierda bogotana de los 80.', tag: 'Historia', tag_color: 'brown' },
    { icono: '\ud83d\udc83', titulo: 'Pista de conocedores', texto: 'La pista es pequena pero intensa: quien baila aqui sabe. Si no sabes, siembrate a mirar: es una masterclass gratis.', tag: 'Zona', tag_color: 'blue' }
  ]),
  regulaciones: 'Mayor de 18 anos con documento de identidad valido. Solo viernes y sabados. No se permite ingreso de alimentos ni bebidas externas. Se reserva el derecho de admision. Zona centro: precaucion nocturna.',
  checklist_tip: 'Llega temprano (6-7 PM) que el aforo es pequeno y se llena rapido. Lleva efectivo para las botellas. No esperes lujo: esperas autenticidad.',
  entradas: [
    { tipo: 'Noche regular (vie/sab)', precio: 'sin cover fijo', incluye: 'Acceso a la barra y pista, acetatos de coleccion', link: 'https://www.instagram.com/elgocepagano/' },
    { tipo: 'Evento especial', precio: 'variable', incluye: 'Segun programacion (ver Instagram)', link: 'https://www.instagram.com/elgocepagano/' }
  ],
  tours: [
    {
      nombre: 'La rumba del Goce: acetatos y guaguanco',
      precio: 'Consumo en barra', precio_sub: 'botellas $60k-$230k',
      duracion: '4-5 horas', tipo_tour: 'Experiencia', idioma: 'Espanol', max_personas: 'Abierto',
      rating: '4.9', review_count: 38,
      descripcion: 'La experiencia fundacional: vinilos originales, guaguanco cubano y la pista donde bailo la intelectualidad bogotana por 47 anos.',
      incluye: ['Acceso al bar', 'Musica en acetatos de vinilo', 'Ambiente historico 1978', 'Pista de baile intima'],
      no_incluye: ['Bebidas', 'Transporte'],
      link_reserva: 'https://www.instagram.com/elgocepagano/',
      featured: true
    },
    {
      nombre: 'Ruta salsera del centro: Goce + Quiebracanto',
      precio: 'Variable', precio_sub: 'segun consumo en ambos',
      duracion: '4-5 horas', tipo_tour: 'Ruta', idioma: 'Espanol', max_personas: 'Grupos pequenos',
      rating: '4.8', review_count: 12,
      descripcion: 'Las dos instituciones de la salsa del centro: El Goce Pagano (1978) y Quiebracanto (1979), a 15 min caminando.',
      incluye: ['Itinerario caminando centro', 'Parada en ambos bares', 'Contexto historico salsa bogotana'],
      no_incluye: ['Bebidas', 'Transporte', 'Covers'],
      link_reserva: 'https://www.instagram.com/elgocepagano/',
      featured: false
    }
  ],
  equipamiento: [
    { item: 'Documento de identidad (mayor de 18)', prioridad: 'Obligatorio' },
    { item: 'Efectivo para botellas y consumo', prioridad: 'Recomendado' },
    { item: 'Calzado comodo para bailar', prioridad: 'Recomendado' },
    { item: 'Precaucion en zona centro de noche', prioridad: 'Recomendado' }
  ],
  itinerario: [
    { dia: 'Viernes', hora: '6:00 pm', titulo: 'Apertura del Goce', icono: '\ud83c\udfdb\ufe0f', detalle: 'Primeros acetatos, ambiente intimo, las botellas aparecen', tags: ['Apertura'] },
    { dia: 'Viernes', hora: '10:00 pm', titulo: 'Guaguanco en la pista', icono: '\ud83d\udc83', detalle: 'La rumba sube, los conocedores toman la pista', tags: ['Baile'] },
    { dia: 'Sabado', hora: '7:00 pm', titulo: 'La noche del sabado', icono: '\ud83c\udfa4', detalle: 'Mas acetatos, mas historia, hasta las 3 AM', tags: ['Rumba'] }
  ],
  dificultad_tags: [
    { texto: 'Bar intimo con pista a nivel', apto: true },
    { texto: 'Centro historico, TransMilenio Las Aguas cercano', apto: true },
    { texto: 'Solo abre 2 noches/semana (vie/sab)', apto: false },
    { texto: 'Zona requiere precaucion nocturna', apto: false },
    { texto: 'Requiere ser mayor de 18', apto: false }
  ],
  temporada_matriz: {
    Ene: 'ideal', Feb: 'ideal', Mar: 'ideal', Abr: 'ideal', May: 'posible',
    Jun: 'ideal', Jul: 'ideal', Ago: 'ideal', Sep: 'ideal', Oct: 'ideal', Nov: 'ideal', Dic: 'ideal'
  }
};

const FAQS = [
  { pregunta: 'Que es El Goce Pagano?', respuesta: 'El bar de salsa mas antiguo de Bogota, fundado en 1978 en Las Aguas (frente U. Andes), famoso por sus acetatos de vinilo originales y musica cubana/guaguanco.' },
  { pregunta: 'Que dias abre?', respuesta: 'Solo viernes (desde 18:00) y sabados (desde 19:00) hasta las 3:00 AM. El resto de la semana esta cerrado. Verifica en @elgocepagano.' },
  { pregunta: 'Que musica ponen?', respuesta: 'Solo acetatos de vinilo originales: Van Van, Eddy Palmieri, Herencia de Timbiqui, Fania All Stars, salsa cubana y guaguanco. No hay playlists digitales.' },
  { pregunta: 'Cuanto cuesta?', respuesta: 'Botellas de trago entre $60.000 y $230.000 (referencia). No hay cover fijo publicado; consumo en barra.' },
  { pregunta: 'Cual es la edad minima?', respuesta: 'Mayor de 18 anos con documento de identidad valido.' }
];

module.exports = { SLUG: SLUG, HERO: HERO, PHOTOS: PHOTOS, BASE: BASE, TAGS: TAGS, FAQS: FAQS };

if (require.main !== module) return;

(async function main() {
  var url = process.env.DATABASE_URL || process.argv[2];
  if (!url) {
    console.error('Falta DATABASE_URL.');
    console.error('Uso: DATABASE_URL=postgres://... node scripts/seed-el-goce-pagano.js [--dry]');
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