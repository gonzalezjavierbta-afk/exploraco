// scripts/seed-habana-93.js
// Crea (o actualiza) la pagina dinamica habana-93.html con los datos
// de Habana 93 (Parque 93, Bogota), restobar caribeno 18 anos, salsa en vivo,
// siguiendo el patron de scripts/seed-quiebracanto.js (categoria sitio, upsert completo).
//
// Uso:
//   DATABASE_URL=postgres://... node scripts/seed-habana-93.js --dry
//   DATABASE_URL=postgres://... node scripts/seed-habana-93.js

var neon = null;
function getNeon() {
  if (!neon) neon = require('@neondatabase/serverless').neon;
  return neon;
}

const SLUG = 'habana-93';
const HERO = 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cf/Bogota_city_skyline_at_night_seen_from_the_Monseratte_sanctuary.png/960px-Bogota_city_skyline_at_night_seen_from_the_Monseratte_sanctuary.png';

const PHOTOS = [
  { url: HERO, caption: 'Bogota nocturna desde Monserrate, el cielo del Parque de la 93' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b3/Bogota_-_Streets_at_night_003.jpg/960px-Bogota_-_Streets_at_night_003.jpg', caption: 'Calles del Parque 93 vibrando con son cubano y salsa' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f8/Bogot%C3%A1_Chapinero_de_noche.JPG/960px-Bogot%C3%A1_Chapinero_de_noche.JPG', caption: 'Chapinero de noche, vecino del Parque 93' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Palacio_Li%C3%A9vano%2C_Bogot%C3%A1.jpg/960px-Palacio_Li%C3%A9vano%2C_Bogot%C3%A1.jpg', caption: 'Palacio Lievano, icono del centro historico' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e8/Salsa_dance_dip.jpg/960px-Salsa_dance_dip.jpg', caption: 'Pareja bailando salsa, el ritmo que vive en Habana 93' }
];

const BASE = {
  slug: SLUG,
  nombre: 'Habana 93',
  categoria_slug: 'sitio',
  lead: 'Restobar caribeno Parque 93 (18 anos): lunch $29.900 (12-16h), salsa/son en vivo diario, mojitos, rones, abierto todos los dias.',
  descripcion: 'Habana 93 (Calle 93A #11A-47, Parque 93, Chico Norte, Bogota, coordenadas 4.6768, -74.0483) es un restaurante con 18 anos de tradicion que ha decidido dar un paso adelante en su constante innovacion. Se ha consolidado como un referente gracias a su sazon autentico caribeno, adaptado a la rutina de quienes trabajan o visitan la zona. La gran noticia es el lanzamiento del "lunch": un almuerzo completo y reconfortante por solo $29.900, disponible todos los dias de 12:00 m. a 4:00 p.m.\n\nCada visita esta acompanada de son cubano y salsa en vivo, lo que convierte el almuerzo o la cena en una experiencia festiva. No es solo ir a comer, es ir a disfrutar. La musica en vivo (son cubano, salsa) suena todos los dias, creando un ambiente alegre donde es facil relajarse, bailar o simplemente dejarse llevar por el ritmo. Los mojitos y cuba libres son protagonistas, con ron de calidad.\n\nHorarios: Domingo a Jueves 12:00-22:00; Viernes y Sabado 12:00-00:00 (medianoche). Reservas: 311 511 6751 / 601 805 3170. Web: habana93.com. Es el plan perfecto para quien busca sabor caribeno, musica en vivo y buen ambiente en el corazon del Parque 93.',
  highlight: '18 anos Parque 93: lunch $29.900 (12-16h), son/salsa en vivo diario, mojitos de autor.',
  ciudad: 'Bogota',
  region: 'Cundinamarca',
  barrio: 'Chico Norte (Parque 93)',
  lat: 4.6767680,
  lng: -74.0482874,
  whatsapp: '3115116751',
  telefono: '601 805 3170',
  email: '',
  web: 'https://www.habana93.com',
  instagram: '@habana93',
  precio_desde: 'Lunch $29.900 (12-16h); cena/copas variable; mojitos/ron',
  horario: 'Dom-Jue 12-22; Vie-Sab 12-00; musica vivo diario',
  emoji: '\ud83c\udf78',
  hero_bg: '#0d9488',
  foto_hero: HERO,
  tipo: 'Restobar  -  Salsa vivo  -  Caribe  -  18 anos',
  capacidad: 'Restaurante + barra, aforo medio',
  como_llegar: 'TransMilenio Virrey/Calle 100 + 5 min caminando. Taxi: Calle 93A #11A-47, Chico Norte. Centro: 20 min.',
  status: 'published',
  destacado: true
};

const TAGS = {
  tipo_actividad: 'Salsa bar',
  dificultad: 'Facil',
  dificultad_desc: 'Restaurante-bar con pista/espacio para bailar a nivel; musica en vivo diario. Requiere ser mayor de 18 anos para consumo de alcohol. Zona Parque 93 muy segura.',
  duracion: '2-4 horas (almuerzo/cena + copa)',
  altitud: '2600',
  temporada: ['Todo el ano', 'Almuerzo diario 12-16h', 'Musica en vivo diario', 'Fines de semana hasta medianoche'],
  precio_entrada: 'Sin cover; almuerzo $29.900; cena y copas a la carta; mojitos y rones premium.',
  distancia: 'Calle 93A #11A-47, Parque 93, Chico Norte. TransMilenio Virrey/Calle 100 a 5 min caminando.',
  como_llegar: BASE.como_llegar,
  permisos: 'Mayor de 18 anos para alcohol. Menores acompanados solo en horario familiar (almuerzo).',
  temporada_nota: 'Abierto todos los dias. Almuerzo ejecutivo 12-4pm ($29.900). Musica en vivo (son cubano/salsa) diario. Viernes/sabados hasta medianoche.',
  fauna_flora: JSON.stringify([
    { emoji: '\ud83c\udf78', nombre: 'Almuerzo caribeno $29.900', hecho: 'Plato completo con sabor autentico del Caribe, disponible diario 12-4pm' },
    { emoji: '\ud83c\udfb5', nombre: 'Son cubano y salsa en vivo', hecho: 'Musicos en tarima todos los dias: la banda sonora de tu almuerzo y cena' },
    { emoji: '\ud83c\udf78', nombre: 'Mojitos y rones de autor', hecho: 'Carta de rones premium y mojitos preparados como en el Malecon habanero' },
    { emoji: '\ud83c\udfdb\ufe0f', nombre: '18 anos en el Parque 93', hecho: 'Casi dos decadas siendo referente gastronomico y musical de la zona rosa' }
  ]),
  secretos: JSON.stringify([
    { icono: '\ud83c\udf78', titulo: 'El lunch del Goce', texto: 'Almuerzo caribeno completo por $29.900 (12-4pm): la mejor relacion sabor-precio del Parque 93 con musica en vivo incluida.', tag: 'Imperdible', tag_color: 'gold' },
    { icono: '\ud83c\udfb5', titulo: 'Salsa en el almuerzo', texto: 'No esperes a la noche: aqui la musica en vivo (son cubano, salsa) suena desde el mediodia. Bailar entre bocado y bocado es la norma.', tag: 'Musica', tag_color: 'green' },
    { icono: '\ud83c\udf78', titulo: 'Mojito Habana Vieja', texto: 'Ron blanco, hierbabuena, limon, azucar y soda: el clasico cubano en su version mas autentica. Pide el de la casa.', tag: 'Cerca', tag_color: 'blue' },
    { icono: '\ud83c\udfdb\ufe0f', titulo: '18 anos de constancia', texto: 'En una zona donde los locales abren y cierran, Habana 93 sigue ahi desde 2006: sazon, musica y servicio.', tag: 'Historia', tag_color: 'brown' }
  ]),
  regulaciones: 'Mayor de 18 anos para consumo de alcohol. Menores acompanados solo en horario familiar (almuerzo 12-4pm). No se permite ingreso de alimentos ni bebidas externas. Se reserva el derecho de admision.',
  checklist_tip: 'Ve al almuerzo (12-4pm) por $29.900 con musica en vivo: es el secreto mejor guardado del Parque 93. Reserva al 311 511 6751 para grupos.',
  entradas: [
    { tipo: 'Almuerzo ejecutivo (12-16h)', precio: '$29.900', incluye: 'Plato fuerte, bebida, postre, musica en vivo', link: 'https://www.habana93.com' },
    { tipo: 'Cena y copas (noche)', precio: 'a la carta', incluye: 'Menu caribeno, mojitos, rones, salsa en vivo', link: 'https://www.habana93.com' },
    { tipo: 'Reserva grupo', precio: 'segun consumo', incluye: 'Mesa garantizada, atencion preferencial', link: 'https://wa.me/573115116751' }
  ],
  tours: [
    {
      nombre: 'Almuerzo caribeno con salsa en vivo',
      precio: '$29.900', precio_sub: 'incluye plato, bebida, postre, musica',
      duracion: '2-3 horas', tipo_tour: 'Experiencia', idioma: 'Espanol', max_personas: 'Abierto',
      rating: '4.7', review_count: 89,
      descripcion: 'El plan estrella: almuerzo caribeno completo con son cubano y salsa en vivo por $29.900. Disponible diario 12-4pm.',
      incluye: ['Almuerzo completo', 'Bebida y postre', 'Son cubano/salsa en vivo', 'Ambiente Parque 93'],
      no_incluye: ['Copas adicionales', 'Transporte'],
      link_reserva: 'https://www.habana93.com',
      featured: true
    },
    {
      nombre: 'Noche de mojitos y salsa',
      precio: 'a la carta', precio_sub: 'mojitos $25k-$35k',
      duracion: '3-4 horas', tipo_tour: 'Experiencia', idioma: 'Espanol', max_personas: 'Abierto',
      rating: '4.6', review_count: 44,
      descripcion: 'Cena caribena, mojitos de autor y salsa en vivo en el corazon del Parque 93. Viernes/sabados hasta medianoche.',
      incluye: ['Cena caribena', 'Mojitos y rones', 'Salsa en vivo', 'Terraza/barra'],
      no_incluye: ['Transporte'],
      link_reserva: 'https://www.habana93.com',
      featured: false
    },
    {
      nombre: 'Ruta Parque 93: Habana 93 + Galeria Cafe Libro',
      precio: 'Variable', precio_sub: 'segun consumo en ambos',
      duracion: '3-4 horas', tipo_tour: 'Ruta', idioma: 'Espanol', max_personas: 'Grupos',
      rating: '4.6', review_count: 18,
      descripcion: 'Los dos iconos del Parque 93: Habana 93 (almuerzo caribeno, salsa diaria) y Galeria Cafe Libro (orquestas fin de semana, 43 anos). A 2 min caminando.',
      incluye: ['Itinerario Parque 93', 'Parada en ambos', 'Contexto salsa/gastronomia'],
      no_incluye: ['Bebidas', 'Transporte', 'Covers'],
      link_reserva: 'https://www.habana93.com',
      featured: false
    }
  ],
  equipamiento: [
    { item: 'Documento de identidad (mayor de 18 para alcohol)', prioridad: 'Obligatorio' },
    { item: 'Reserva recomendada para grupos (WhatsApp/telefono)', prioridad: 'Recomendado' },
    { item: 'Efectivo o tarjeta', prioridad: 'Recomendado' },
    { item: 'Ganas de bailar entre bocados', prioridad: 'Opcional' }
  ],
  itinerario: [
    { dia: 'Lunes', hora: '1:00 pm', titulo: 'Almuerzo con son', icono: '\ud83c\udf78', detalle: 'Lunch $29.900, musica en vivo desde la primera cucharada', tags: ['Almuerzo', 'En vivo'] },
    { dia: 'Viernes', hora: '7:00 pm', titulo: 'Copa y salsa', icono: '\ud83c\udf78', detalle: 'Mojito en mano, son cubano en tarima, hasta medianoche', tags: ['Noche', 'Mojito'] },
    { dia: 'Sabado', hora: '2:00 pm', titulo: 'Almuerzo tardio', icono: '\ud83c\udfb5', detalle: 'Llegada tardia al lunch, misma calidad, misma musica', tags: ['Almuerzo'] }
  ],
  dificultad_tags: [
    { texto: 'Restaurante-bar con espacio para bailar a nivel', apto: true },
    { texto: 'Parque 93: zona muy segura, TransMilenio Virrey/Calle 100', apto: true },
    { texto: 'Musica en vivo TODOS los dias (incluido almuerzo)', apto: true },
    { texto: 'Almuerzo $29.900: mejor valor del sector', apto: true },
    { texto: 'Requiere ser mayor de 18 para alcohol', apto: false }
  ],
  temporada_matriz: {
    Ene: 'ideal', Feb: 'ideal', Mar: 'ideal', Abr: 'ideal', May: 'posible',
    Jun: 'ideal', Jul: 'ideal', Ago: 'ideal', Sep: 'ideal', Oct: 'ideal', Nov: 'ideal', Dic: 'ideal'
  }
};

const FAQS = [
  { pregunta: 'Que es Habana 93?', respuesta: 'Restobar caribeno en el Parque 93 (Calle 93A #11A-47) con 18 anos de tradicion: almuerzo caribeno $29.900, salsa y son cubano en vivo diario, mojitos y rones.' },
  { pregunta: 'Cuales son los horarios?', respuesta: 'Domingo a Jueves 12:00-22:00; Viernes y Sabado 12:00-00:00. Musica en vivo TODOS los dias. Almuerzo 12-16h ($29.900).' },
  { pregunta: 'Que incluye el almuerzo de $29.900?', respuesta: 'Plato fuerte caribeno, bebida, postre y musica en vivo (son cubano/salsa). Disponible todos los dias 12:00-16:00.' },
  { pregunta: 'Que musica ponen?', respuesta: 'Son cubano y salsa en vivo TODOS los dias, tanto en almuerzo como en cena. No hay DJ: son musicos en tarima.' },
  { pregunta: 'Cual es la edad minima?', respuesta: 'Mayor de 18 anos para alcohol. Menores acompanados solo en horario de almuerzo familiar (12-16h).' },
  { pregunta: 'Como reservar?', respuesta: 'WhatsApp 311 511 6751 o telefono 601 805 3170. Web: habana93.com.' }
];

module.exports = { SLUG: SLUG, HERO: HERO, PHOTOS: PHOTOS, BASE: BASE, TAGS: TAGS, FAQS: FAQS };

if (require.main !== module) return;

(async function main() {
  var url = process.env.DATABASE_URL || process.argv[2];
  if (!url) {
    console.error('Falta DATABASE_URL.');
    console.error('Uso: DATABASE_URL=postgres://... node scripts/seed-habana-93.js [--dry]');
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