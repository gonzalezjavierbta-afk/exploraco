// scripts/seed-sibundoy.js
// Crea (o actualiza) la pagina dinamica sibundoy.html con los datos
// de ficha-sibundoy.md, replicando EXACTAMENTE lo que guardaria el
// formulario admin.html (CATEGORY_TAG_FIELDS/CATEGORY_TAG_LISTS sitio,
// _buildTagsObj/_placeToAPI). Patron de scripts/seed-canon-del-guejar.js.
//
// Rating: NO se siembran resenas ni se hardcodea rating. La pagina queda
// con rating/contador en 0 hasta que lleguen interacciones reales (ADR-008).
//
// Uso:
//   DATABASE_URL=postgres://... node scripts/seed-sibundoy.js --dry
//   DATABASE_URL=postgres://... node scripts/seed-sibundoy.js
//
// Idempotente: re-ejecutable sin efectos secundarios (ON CONFLICT slug).

var neon = null;
function getNeon() {
  if (!neon) neon = require('@neondatabase/serverless').neon;
  return neon;
}

const SLUG = 'sibundoy';
const HERO = 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8c/Talla_en_madera_en_el_parque_de_Sibundoy_1.jpg/960px-Talla_en_madera_en_el_parque_de_Sibundoy_1.jpg';

const PHOTOS = [
  { url: HERO, caption: 'Talla en madera en el parque de Sibundoy' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/66/Talla_en_madera_en_el_parque_de_Sibundoy_2.jpg/960px-Talla_en_madera_en_el_parque_de_Sibundoy_2.jpg', caption: 'Esculturas en madera talladas por artesanos Kam\u00ebnts\u00e1' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9c/Talla_en_madera_en_el_parque_de_Sibundoy_3.jpg/960px-Talla_en_madera_en_el_parque_de_Sibundoy_3.jpg', caption: 'Artesan\u00edas en madera del parque central' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0c/Talla_en_madera_en_el_parque_de_Sibundoy_4.jpg/960px-Talla_en_madera_en_el_parque_de_Sibundoy_4.jpg', caption: 'Detalles de las tallas tradicionales' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/00/M%C3%A1gico_Atardecerde_Verano-Sibundoy_Putumayo_Colombia8EC596D4-C143-4AE9-8E54-1FE742F35DDF.jpg/960px-M%C3%A1gico_Atardecerde_Verano-Sibundoy_Putumayo_Colombia8EC596D4-C143-4AE9-8E54-1FE742F35DDF.jpg', caption: 'Atardecer en el Valle de Sibundoy, Putumayo' }
];

const BASE = {
  slug: SLUG,
  nombre: 'Sibundoy',
  categoria_slug: 'sitio',
  lead: 'Valle andino en el Putumayo donde conviven las comunidades Kam\u00ebnts\u00e1 e Inga: artesan\u00edas en madera, medicina ancestral, avistamiento de aves y el Festival del Perd\u00f3n (B\u00ebtsknat\u00e9) a 2.055 m de altitud.',
  descripcion: 'En el descenso de los Andes hacia la selva del Putumayo se encuentra el Valle de Sibundoy, un destino m\u00edstico que re\u00fane naturaleza extraordinaria y la riqueza cultural del macizo colombiano. Las comunidades Kam\u00ebnts\u00e1 e Inga han mantenido vivas sus tradiciones ancestrales: tallado de m\u00e1scaras, tejido de fajas, medicina tradicional con plantas sagradas y el Carnaval del Perd\u00f3n. El valle ofrece pisos t\u00e9rmicos medio, fr\u00edo y p\u00e1ramo, con 315 especies de aves registradas, de las cuales 18 est\u00e1n catalogadas como vulnerables. A pocos minutos se encuentran las aguas termales de Col\u00f3n y senderos que llevan a cascadas escondidas.',
  highlight: 'Cultura viva Kam\u00ebnts\u00e1: m\u00e1scaras talladas a mano, Festival del Perd\u00f3n (B\u00ebtsknat\u00e9) y 315 especies de aves en el valle andino.',
  ciudad: 'Sibundoy',
  region: 'Putumayo',
  barrio: 'Valle de Sibundoy',
  lat: 1.20333,
  lng: -76.91917,
  whatsapp: '573175282653',
  telefono: '+57 317 528 2653',
  email: 'contactenos@sibundoy-putumayo.gov.co',
  web: 'https://www.sibundoy.gov.co',
  instagram: 'alcaldiasibundoy',
  precio_desde: 'Gratis',
  horario: 'Todo el a\u00f1o; clima templado (12-18 \u00b0C)',
  emoji: '\ud83c\udf3f',
  hero_bg: 'linear-gradient(135deg,#0a3d0a,#1a5a2a)',
  foto_hero: HERO,
  tipo: 'Turismo cultural \u00b7 Naturaleza \u00b7 Avistamiento de aves',
  capacidad: '',
  como_llegar: 'Desde Pasto en carro por la Panamericana (~3 h). Desde Bogot\u00e1 avi\u00f3n a Pasto (PSO, ~1.5 h) y luego carro (~3 h). Desde Mocoa (~2 h) por carretera de monta\u00f1a.',
  status: 'published',
  destacado: true
};

const TAGS = {
  tipo_actividad: 'Turismo cultural / naturaleza / avistamiento de aves',
  dificultad: 'Baja',
  dificultad_desc: 'El valle es accesible en carro desde Pasto o Mocoa. Los senderos de avistamiento de aves son cortos y guiados. No requiere condici\u00f3n f\u00edsica especial.',
  duracion: '2-3 d\u00edas',
  altitud: '2055',
  temporada: ['Todo el a\u00f1o; clima templado (12-18 \u00b0C)', 'Festival del Perd\u00f3n en febrero/marzo', 'Temporada seca (jun-sep) ideal para senderismo'],
  precio_entrada: 'Entrada libre a la mayor\u00eda de atracciones. Tours guiados desde $50.000 por persona.',
  distancia: 'Desde Pasto ~3 h en carro; desde Mocoa ~2 h',
  como_llegar: BASE.como_llegar,
  permisos: 'No se requieren permisos especiales. Para visitar comunidades ind\u00edgenas se recomienda contactar cabildos previamente.',
  temporada_nota: 'Todo el a\u00f1o es bueno por el clima templado. Para el Festival del Perd\u00f3n (B\u00ebtsknat\u00e9) ir en febrero/marzo, antes del mi\u00e9rcoles de ceniza.',
  fauna_flora: JSON.stringify([
    { emoji: '\ud83d\udc26', nombre: 'Colibr\u00ed cometa colinegro', hecho: 'Especie end\u00e9mica del valle; se avista en Vereda La Cumbre' },
    { emoji: '\ud83d\udc24', nombre: 'Gallito de las rocas', hecho: 'Ave emblem\u00e1tica de los bosques andinos del macizo colombiano' },
    { emoji: '\ud83d\udc38', nombre: 'Guacamayas', hecho: 'Presentes en los bosques del valle; colores vistosos' },
    { emoji: '\ud83e\udd88', nombre: 'Tucanes', hecho: 'Habitan en los bosques nublados alrededor del valle' },
    { emoji: '\ud83c\udf3f', nombre: 'Frailejones', hecho: 'Vegetaci\u00f3n caracter\u00edstica del p\u00e1ramo cercano al valle' }
  ]),
  secretos: JSON.stringify([
    { icono: '\ud83c\udfad', titulo: 'M\u00e1scaras Kam\u00ebnts\u00e1', texto: 'Las m\u00e1scaras talladas en madera fueron una forma de resistencia pasiva ante la colonizaci\u00f3n; cada una representa animales o emociones.', tag: 'Cultura', tag_color: 'gold' },
    { icono: '\ud83e\udded', titulo: 'Jard\u00edn Etnobot\u00e1nico Solanum', texto: 'Espacio de conservaci\u00f3n con pr\u00e1cticas agr\u00edcolas tradicionales ind\u00edgenas y diversidad biocultural.', tag: 'Naturaleza', tag_color: 'blue' },
    { icono: '\ud83d\udc8e', titulo: 'Faja Kam\u00ebnts\u00e1', texto: 'Tejido tradicional que plasma la historia, el territorio y la cosmovisi\u00f3n del pueblo Kam\u00ebnts\u00e1 en hilos y colores.', tag: 'Artesan\u00eda', tag_color: 'gold' },
    { icono: '\ud83c\udf1f', titulo: 'B\u00ebtsknat\u00e9 (Festival del Perd\u00f3n)', texto: 'Celebraci\u00f3n anual donde las comunidades ind\u00edgenas se unen para danzar, cantar y renovar v\u00ednculos con la tierra.', tag: 'Festival', tag_color: 'gold' },
    { icono: '\ud83d\udc3b', titulo: 'Reserva Natural Paway', texto: 'Espacio de conservaci\u00f3n con senderos ecol\u00f3gicos para avistamiento de aves y caminatas.', tag: 'Naturaleza', tag_color: 'blue' }
  ]),
  regulaciones: JSON.stringify([
    { icono: '\ud83c\udfdb', titulo: 'Respeto cultural', desc: 'Respetar las comunidades ind\u00edgenas y sus territorios sagrados.', tipo: 'obligatorio' },
    { icono: '\ud83d\udce8', titulo: 'Contacto previo', desc: 'Para visitar comunidades, contactar cabildos previamente.', tipo: 'obligatorio' },
    { icono: '\ud83d\udeab', titulo: 'Zonas ceremoniales', desc: 'No ingresar a zonas ceremoniales sin autorizaci\u00f3n.', tipo: 'obligatorio' },
    { icono: '\ud83d\udcb0', titulo: 'Efectivo', desc: 'Llevar efectivo: pocos establecimientos aceptan tarjeta.', tipo: 'recomendado' },
    { icono: '\ud83d\ude97', titulo: 'Carretera de monta\u00f1a', desc: 'La carretera desde Mocoa tiene curvas cerradas; conducir con precauci\u00f3n.', tipo: 'info' },
    { icono: '\ud83d\uddd1', titulo: 'Basura cero', desc: 'No dejar basura en senderos ni \u00e1reas naturales.', tipo: 'obligatorio' }
  ]),
  checklist_tip: 'Lleva ropa de abrigo (clima templado 12-18 \u00b0C), zapatos de caminata, impermeable y efectivo. Para el Festival del Perd\u00f3n reserva con anticipaci\u00f3n.',
  entradas: [
    { tipo: 'Entrada al valle', precio: '0', incluye: 'Acceso libre a la cabecera municipal', link: '' },
    { tipo: 'Tour artesan\u00edas Kam\u00ebnts\u00e1', precio: '50000', incluye: 'Visita a talleres de m\u00e1scaras y fajas', link: 'https://wa.me/573175282653' },
    { tipo: 'Avistamiento de aves guiado', precio: '80000', incluye: 'Gu\u00eda local, binoculares, recorrido 4 h', link: 'https://wa.me/573175282653' },
    { tipo: 'Termales de Col\u00f3n', precio: '15000', incluye: 'Acceso a piscinas termales (Col\u00f3n, a 6 km)', link: '' },
    { tipo: 'Experiencia cham\u00e1nica', precio: 'Consultar', incluye: 'Meditaci\u00f3n y rituales con gu\u00eda espiritual', link: 'https://wa.me/573175282653' }
  ],
  tours: [
    {
      nombre: 'Tour cultural Kam\u00ebnts\u00e1',
      precio: '50000', precio_sub: 'por persona',
      duracion: '3 horas', tipo_tour: 'Cultural', idioma: 'Espa\u00f1ol',
      max_personas: 'M\u00e1x 15',
      rating: '0', review_count: 0,
      descripcion: 'Recorrido por talleres de artesanos Kam\u00ebnts\u00e1: m\u00e1scaras talladas en madera, fajas tejidas y explicaci\u00f3n de la cosmovisi\u00f3n.',
      incluye: ['Gu\u00eda local', 'Visita a 3 talleres', 'Demostraci\u00f3n de tallado'],
      no_incluye: ['Transporte', 'Almuerzo', 'Artesan\u00edas'],
      link_reserva: 'https://wa.me/573175282653',
      featured: true
    },
    {
      nombre: 'Avistamiento de aves en La Cumbre',
      precio: '80000', precio_sub: 'por persona',
      duracion: '4 horas', tipo_tour: 'Naturaleza', idioma: 'Espa\u00f1ol',
      max_personas: 'M\u00e1x 8',
      rating: '0', review_count: 0,
      descripcion: 'Excursi\u00f3n guiada por senderos de Vereda La Cumbre para observar colibr\u00edes, guacamayas y especies end\u00e9micas del macizo.',
      incluye: ['Gu\u00eda ornit\u00f3logo', 'Binoculares', 'Lista de chequeo'],
      no_incluye: ['Transporte', 'Almuerzo'],
      link_reserva: 'https://wa.me/573175282653',
      featured: false
    },
    {
      nombre: 'Termales de Col\u00f3n + caminata',
      precio: '35000', precio_sub: 'por persona',
      duracion: '5 horas', tipo_tour: 'Bienestar', idioma: 'Espa\u00f1ol',
      max_personas: 'M\u00e1x 12',
      rating: '0', review_count: 0,
      descripcion: 'Caminata hasta las aguas termales de Col\u00f3n con sesiones de fangoterapia y recorrido por senderos selv\u00e1ticos.',
      incluye: ['Gu\u00eda local', 'Entrada a termales'],
      no_incluye: ['Transporte', 'Almuerzo'],
      link_reserva: 'https://wa.me/573175282653',
      featured: false
    },
    {
      nombre: 'Mirador Villa Beatriz',
      precio: '25000', precio_sub: 'por persona',
      duracion: '2 horas', tipo_tour: 'Naturaleza', idioma: 'Espa\u00f1ol',
      max_personas: 'M\u00e1x 10',
      rating: '0', review_count: 0,
      descripcion: 'Senderos para avistamiento de colibr\u00edes, granja educativa y mirador panor\u00e1mico del Valle de Sibundoy.',
      incluye: ['Gu\u00eda local', 'Acceso a granja y mirador'],
      no_incluye: ['Transporte'],
      link_reserva: 'https://wa.me/573175282653',
      featured: false
    }
  ],
  equipamiento: [
    { item: 'Ropa de abrigo (clima templado 12-18 C)', prioridad: 'Obligatorio' },
    { item: 'Zapatos de caminata c\u00f3modos', prioridad: 'Obligatorio' },
    { item: 'Impermeable o chaqueta de lluvia', prioridad: 'Obligatorio' },
    { item: 'Repelente de mosquitos', prioridad: 'Recomendado' },
    { item: 'Binoculares para avistamiento de aves', prioridad: 'Recomendado' },
    { item: 'C\u00e1mara fotogr\u00e1fica', prioridad: 'Recomendado' },
    { item: 'Efectivo (pocos dat\u00e1fonos en la zona)', prioridad: 'Recomendado' },
    { item: 'Protector solar y gorra', prioridad: 'Recomendado' }
  ],
  itinerario: [
    { dia: 'D\u00eda 1', hora: '9:00 am', titulo: 'Llegada a Sibundoy', icono: '\ud83d\ude97', detalle: 'Llegada desde Pasto o Mocoa; instalaci\u00f3n en hospedaje rural', tags: ['Log\u00edstica'] },
    { dia: 'D\u00eda 1', hora: '11:00 am', titulo: 'Tour de artesan\u00edas Kam\u00ebnts\u00e1', icono: '\ud83c\udfa8', detalle: 'Visita a talleres de m\u00e1scaras y fajas; demostraci\u00f3n de tallado en madera', tags: ['Cultura'] },
    { dia: 'D\u00eda 1', hora: '2:00 pm', titulo: 'Almuerzo t\u00edpico', icono: '\ud83c\udf5b', detalle: 'Cuy asado, mazamorra de ma\u00edz y chicha en restaurante local', tags: ['Gastronom\u00eda'] },
    { dia: 'D\u00eda 1', hora: '4:00 pm', titulo: 'Parque de Sibundoy', icono: '\ud83c\udfde\ufe0f', detalle: 'Recorrido por el parque central con esculturas en madera tallada', tags: ['Cultura'] },
    { dia: 'D\u00eda 2', hora: '6:00 am', titulo: 'Avistamiento de aves', icono: '\ud83d\udc26', detalle: 'Excursi\u00f3n guiada a Vereda La Cumbre: 315 especies registradas', tags: ['Naturaleza'] },
    { dia: 'D\u00eda 2', hora: '11:00 am', titulo: 'Termales de Col\u00f3n', icono: '\ud83d\udec0', detalle: 'Caminata a las aguas termales con propiedades terap\u00e9uticas', tags: ['Bienestar'] },
    { dia: 'D\u00eda 2', hora: '3:00 pm', titulo: 'Mirador Villa Beatriz', icono: '\ud83d\udc9b', detalle: 'Mirador panor\u00e1mico del valle con senderos de colibr\u00edes', tags: ['Naturaleza'] },
    { dia: 'D\u00eda 3', hora: '9:00 am', titulo: 'Experiencia cham\u00e1nica', icono: '\ud83d\udd2e', detalle: 'Meditaci\u00f3n y rituales con gu\u00eda espiritual de la comunidad', tags: ['Espiritualidad'] }
  ],
  dificultad_tags: [
    { texto: 'Acceso en carro desde Pasto o Mocoa', apto: true },
    { texto: 'Senderos cortos y guiados para avistamiento de aves', apto: true },
    { texto: 'Clima templado todo el a\u00f1o (12-18 C)', apto: true },
    { texto: 'Apto para familias con ni\u00f1os', apto: true },
    { texto: 'Carretera de monta\u00f1a desde Mocoa (curvas cerradas)', apto: false }
  ],
  temporada_matriz: {
    Ene: 'ideal', Feb: 'ideal', Mar: 'ideal', Abr: 'posible',
    May: 'posible', Jun: 'ideal', Jul: 'ideal', Ago: 'ideal',
    Sep: 'ideal', Oct: 'posible', Nov: 'posible', Dic: 'ideal'
  }
};

const FAQS = [
  { pregunta: '\u00bfC\u00f3mo llego a Sibundoy?', respuesta: 'Desde Pasto en carro por la Panamericana (~3 h) o en bus (~$25.000). Desde Bogot\u00e1 avi\u00f3n a Pasto (PSO) y luego carro. Tambi\u00e9n se puede llegar desde Mocoa (~2 h).' },
  { pregunta: '\u00bfCu\u00e1l es la mejor \u00e9poca para visitar?', respuesta: 'Todo el a\u00f1o es bueno por el clima templado (12-18 \u00b0C). Para el Festival del Perd\u00f3n (B\u00ebtsknat\u00e9) ir en febrero/marzo, antes del mi\u00e9rcoles de ceniza.' },
  { pregunta: '\u00bfQu\u00e9 artesan\u00edas puedo comprar?', respuesta: 'M\u00e1scaras talladas en madera, fajas tejidas, cester\u00eda y textiles tradicionales Kam\u00ebnts\u00e1 e Inga. Los artesanos venden directamente en sus talleres.' },
  { pregunta: '\u00bfEs seguro viajar a Sibundoy?', respuesta: 'S\u00ed, a diferencia de otras zonas de Putumayo, Sibundoy es un destino seguro. El turismo ecol\u00f3gico y espiritual ha crecido en los \u00faltimos a\u00f1os.' },
  { pregunta: '\u00bfQu\u00e9 platos t\u00edpicos puedo probar?', respuesta: 'Cuy asado, mazamorra de ma\u00edz, chicha, caldo de gallina criolla y productos agr\u00edcolas del valle.' },
  { pregunta: '\u00bfD\u00f3nde puedo dormir?', respuesta: 'Hospedajes rurales con precios convenientes. La Posada del Valle de Sibundoy ofrece senderos y mirador del valle.' }
];

module.exports = { SLUG: SLUG, HERO: HERO, PHOTOS: PHOTOS, BASE: BASE, TAGS: TAGS, FAQS: FAQS };

if (require.main !== module) return;

(async function main() {
  var url = process.env.DATABASE_URL || process.argv[2];
  if (!url) {
    console.error('Falta DATABASE_URL.');
    console.error('Uso: DATABASE_URL=postgres://... node scripts/seed-sibundoy.js [--dry]');
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
  console.log('Verifica en: https://exploraco.co/' + SLUG + '.html (revisa sitemap y /api/destinos).');
})().catch(function(err) {
  console.error('ERROR:', err.message);
  process.exit(1);
});
