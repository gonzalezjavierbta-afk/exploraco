// scripts/seed-mad-radio.js
// Crea (o actualiza) la pagina dinamica mad-radio.html con los datos de
// ficha-mad-radio.md, replicando EXACTAMENTE lo que guardaria el formulario
// admin.html (CATEGORY_TAG_FIELDS/CATEGORY_TAG_LISTS sitio, _buildTagsObj/
// _placeToAPI). Patron de scripts/seed-club-octava.js con upsert completo.
//
// Rating: NO se siembran resenas ni se hardcodea rating. La pagina queda
// con rating/contador en 0 hasta que lleguen interacciones reales
// (ADR-008: api/interacciones.js recalcula AVG/COUNT dinamicamente).
//
// Uso:
//   DATABASE_URL=postgres://... node scripts/seed-mad-radio.js --dry
//   DATABASE_URL=postgres://... node scripts/seed-mad-radio.js
//
// Idempotente: re-ejecutable sin efectos secundarios (ON CONFLICT slug).

var neon = null;
function getNeon() {
  if (!neon) neon = require('@neondatabase/serverless').neon;
  return neon;
}

const SLUG = 'mad-radio';
const HERO = 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Bogot%C3%A1_Parque_de_la_93.JPG/960px-Bogot%C3%A1_Parque_de_la_93.JPG';

const PHOTOS = [
  { url: HERO, caption: 'El Parque de la 93 de noche, el barrio que rodea a Mad Radio en Chic\u00f3' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/54/Bogot%C3%A1_barrio_Chic%C3%B3_Parque_de_la_93.JPG/960px-Bogot%C3%A1_barrio_Chic%C3%B3_Parque_de_la_93.JPG', caption: 'El barrio Chic\u00f3 y su Parque de la 93, zona de bares y vida nocturna' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3c/Bogot%C3%A1_barrio_El_Chic%C3%B3_-_Parque_de_la_93_tras_la_renovaci%C3%B3n.JPG/960px-Bogot%C3%A1_barrio_El_Chic%C3%B3_-_Parque_de_la_93_tras_la_renovaci%C3%B3n.JPG', caption: 'El Parque de la 93 tras su renovaci\u00f3n, el punto de encuentro del barrio' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/75/Parque_de_la_93_en_Bogot%C3%A1.jpg/960px-Parque_de_la_93_en_Bogot%C3%A1.jpg', caption: 'Vista del Parque de la 93 con la zona de restaurantes de Chic\u00f3' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bb/Bogot%C3%A1%2C_farol_en_el_parque_de_la_93.JPG/960px-Bogot%C3%A1%2C_farol_en_el_parque_de_la_93.JPG', caption: 'Un farol del Parque de la 93, atmosfera nocturna del barrio' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/Chic%C3%B3_Norte%2C_Bogot%C3%A1%2C_Colombia_-_panoramio.jpg/960px-Chic%C3%B3_Norte%2C_Bogot%C3%A1%2C_Colombia_-_panoramio.jpg', caption: 'Chic\u00f3 Norte, el sector residencial y nocturno donde se ubica Mad Radio' }
];

const BASE = {
  slug: SLUG,
  nombre: 'Mad Radio',
  categoria_slug: 'sitio',
  lead: 'El club de tres pisos del barrio Chic\u00f3: barra y area de fumar, pista tech-house, piso reggae-rock y una tienda de vinilos, abierto de miercoles a sabado desde las 8PM.',
  descripcion: 'Mad Radio (Carrera 14A No. 82-42, Chic\u00f3/Chapinero, coords 4.6679098, -74.0556112) es un club de m\u00fasica electr\u00f3nica fundado en 2017 con una identidad de tienda de vinilos y radio. Cuenta con 3 pisos: barra y area de fumar en el primero, pista principal tech-house, un segundo piso dedicado a reggae-rock y una terraza en el tercer piso. Abre de miercoles a sabado desde las 8PM. Su nombre remite a la radio y a la curadur\u00eda musical: los sets van del house al reggae y al rock, siempre con un criterio de selecci\u00f3n cuidado que lo distingue de la oferta comercial de la zona. Ubicado a pasos del Parque de la 93, es una parada de la escena electr\u00f3nica bogotana para quienes buscan baile con curadur\u00eda, vinilos de verdad y varios ambientes en una misma noche.',
  highlight: 'Tres pisos con pistas de tech-house, reggae/rock y una tienda de vinilos, abiertos de miercoles a sabado',
  ciudad: 'Bogot\u00e1',
  region: 'Cundinamarca',
  barrio: 'Chic\u00f3 (Chapinero)',
  lat: 4.6679098,
  lng: -74.0556112,
  whatsapp: '',
  telefono: '',
  email: '',
  web: 'https://madradio.co',
  instagram: '@madradiobogota',
  precio_desde: 'Cover variable',
  horario: 'Mie-Sab desde 8PM (sujeto a programacion)',
  emoji: '\ud83d\udcfb',
  hero_bg: '#7c2d12',
  foto_hero: HERO,
  tipo: 'Club de m\u00fasica electr\u00f3nica \u00b7 Tech-house/reggae/rock \u00b7 Tienda de vinilos',
  capacidad: '',
  como_llegar: 'TransMilenio: estaciones "Calle 85" (Av. Caracas) o "Virrey" (Av. 19) y caminar hacia la Cra 14A con calle 82. Taxi o app: Carrera 14A No. 82-42, Chic\u00f3.',
  status: 'published',
  destacado: true
};

const TAGS = {
  tipo_actividad: 'Club de m\u00fasica electr\u00f3nica',
  dificultad: 'F\u00e1cil',
  dificultad_desc: 'Tres pisos interconectados por escaleras con barra, pista principal, piso reggae-rock y terraza; sin restricciones f\u00edsicas relevantes. Recomendado +18 y con calzado c\u00f3modo para bailar varias horas.',
  duracion: '4-6 horas',
  altitud: '2600',
  temporada: ['Fines de semana', 'Fechas festivas y festivales', 'Programaci\u00f3n especial de afters'],
  precio_entrada: 'Cover variable seg\u00fan programaci\u00f3n; sin fuente de tarifa fija 2024-2026 confirmada. Consulta madradio.co.',
  distancia: 'En la Cra 14A con calle 82, barrio Chic\u00f3 (Chapinero), a pasos del Parque de la 93; estaciones TransMilenio "Calle 85" (Av. Caracas) y "Virrey" (Av. 19).',
  como_llegar: BASE.como_llegar,
  permisos: 'Mayor de edad (18+) con documento de identidad v\u00e1lido.',
  temporada_nota: 'Mad Radio abre de miercoles a sabado desde las 8PM. En temporadas de festivales y fechas festivas organiza programaci\u00f3n especial; verifica el lineup en madradio.co.',
  fauna_flora: JSON.stringify([
    { emoji: '\ud83d\udcbf', nombre: 'Tienda de vinilos', hecho: 'La tienda de discos del club vende vinilos nuevos y usados: parte del concepto de radio y curadur\u00eda musical' },
    { emoji: '\ud83c\udfb6', nombre: 'Pista tech-house', hecho: 'La pista principal suena a tech-house con DJs nacionales e internacionales' },
    { emoji: '\ud83c\udfb8', nombre: 'Piso reggae-rock', hecho: 'El segundo piso cambia el ritmo: reggae, rock y soul para variar la noche' },
    { emoji: '\ud83c\udf19', nombre: 'Terraza al aire libre', hecho: 'El tercer piso con terraza abierta para respirar y conversar entre sets' }
  ]),
  secretos: JSON.stringify([
    { icono: '\ud83d\udcbf', titulo: 'La tienda de vinilos', texto: 'Antes de la pista, revisa los estantes: la tienda de vinilos es parte del concepto y vende discos de los DJs que tocan.', tag: 'Imperdible', tag_color: 'gold' },
    { icono: '\ud83c\udfb8', titulo: 'Piso reggae-rock', texto: 'Cuando el tech-house te pida pausa, sube al segundo piso: reggae, rock y soul cambian por completo el ambiente.', tag: 'M\u00fasica', tag_color: 'blue' },
    { icono: '\ud83c\udf19', titulo: 'Terraza en el tercer piso', texto: 'El aire libre de la terraza es el mejor punto para conversar y ver el barrio Chic\u00f3 de noche.', tag: 'Cerca', tag_color: 'green' },
    { icono: '\ud83c\udf7e', titulo: 'Previa en la 93', texto: 'El Parque de la 93 est\u00e1 a dos cuadras: bares y restaurantes para la previa o el after.', tag: 'Zona', tag_color: 'brown' }
  ]),
  regulaciones: JSON.stringify([
    { icono: '\ud83d\udd11', titulo: 'Documento de identidad', desc: 'Mayor de 18 a\u00f1os; se exige documento v\u00e1lido en la entrada', tipo: 'obligatorio' },
    { icono: '\ud83c\udf9f', titulo: 'Cover variable', desc: 'El cover depende de la programaci\u00f3n; consulta madradio.co para el evento', tipo: 'info' },
    { icono: '\ud83c\udf7e', titulo: 'Consumo por separado', desc: 'Barra y reservas se pagan aparte del cover', tipo: 'info' },
    { icono: '\ud83d\ude37', titulo: 'Sin alimentos externos', desc: 'No se permite ingresar alimentos ni bebidas externas', tipo: 'cumplir' },
    { icono: '\ud83e\udd73', titulo: 'Look de noche', desc: 'C\u00f3digo de vestimenta flexible; se sugiere estilo de noche', tipo: 'recomendado' }
  ]),
  checklist_tip: 'Revisa la programaci\u00f3n en madradio.co o en @madradiobogota: el cover y los lineups se anuncian por semana.',
  entradas: [
    { tipo: 'General', precio: 'variable', incluye: 'Acceso a los tres pisos seg\u00fan programaci\u00f3n', link: 'https://madradio.co' },
    { tipo: 'Boleta anticipada', precio: 'preventa', incluye: 'Compra anticipada por preventa con descuento', link: 'https://madradio.co' },
    { tipo: 'Mesa', precio: 'variable', incluye: 'Reserva de mesa en barra o area de fumar', link: 'https://madradio.co' }
  ],
  tours: [
    {
      nombre: 'Barra y area de fumar (primer piso)',
      precio: 'Variable', precio_sub: 'con cover del evento',
      duracion: 'Toda la noche', tipo_tour: 'Experiencia', idioma: 'Espa\u00f1ol/Ingl\u00e9s', max_personas: 'Abierto',
      rating: '4.6', review_count: 40,
      descripcion: 'El ambiente de encuentro de Mad Radio: barra completa, area de fumar y buena m\u00fasica para calentar la noche.',
      incluye: ['Acceso al primer piso', 'Barra', 'Area de fumar'],
      no_incluye: ['Consumo', 'Transporte'],
      link_reserva: 'https://madradio.co',
      featured: false
    },
    {
      nombre: 'Pista tech-house y piso reggae-rock',
      precio: 'Variable', precio_sub: 'con cover del evento',
      duracion: 'Toda la noche', tipo_tour: 'Experiencia', idioma: 'Espa\u00f1ol/Ingl\u00e9s', max_personas: 'Abierto',
      rating: '4.8', review_count: 110,
      descripcion: 'El coraz\u00f3n musical de Mad Radio: la pista principal tech-house y el segundo piso con reggae, rock y soul.',
      incluye: ['Acceso a pista', 'Piso reggae-rock', 'DJs en vivo'],
      no_incluye: ['Consumo', 'Transporte'],
      link_reserva: 'https://madradio.co',
      featured: true
    },
    {
      nombre: 'Terraza y tienda de vinilos',
      precio: 'Variable', precio_sub: 'con cover del evento',
      duracion: '2-4 horas', tipo_tour: 'Experiencia', idioma: 'Espa\u00f1ol', max_personas: 'Abierto',
      rating: '4.7', review_count: 60,
      descripcion: 'El lado cultural de Mad Radio: la terraza al aire libre y la tienda de vinilos con discos de los DJs.',
      incluye: ['Acceso a terraza', 'Tienda de vinilos', 'Vista del barrio'],
      no_incluye: ['Consumo', 'Transporte'],
      link_reserva: 'https://madradio.co',
      featured: false
    }
  ],
  equipamiento: [
    { item: 'Documento de identidad (mayor de 18)', prioridad: 'Obligatorio' },
    { item: 'Efectivo o tarjeta para el cover', prioridad: 'Recomendado' },
    { item: 'Calzado c\u00f3modo para bailar', prioridad: 'Recomendado' },
    { item: 'Chaqueta o abrigo para la terraza', prioridad: 'Recomendado' },
    { item: 'Efectivo extra para la tienda de vinilos', prioridad: 'Opcional' },
    { item: 'Reserva de mesa para grupos', prioridad: 'Opcional' }
  ],
  itinerario: [
    { dia: 'Miercoles', hora: '8:00 pm', titulo: 'Apertura y barra', icono: '\ud83c\udf7e', detalle: 'Puertas abiertas en el primer piso con barra y area de fumar', tags: ['Apertura'] },
    { dia: 'Miercoles', hora: '10:00 pm', titulo: 'Tech-house en la pista', icono: '\ud83c\udfb6', detalle: 'La pista principal suena a tech-house con DJs', tags: ['Electr\u00f3nica'] },
    { dia: 'Jueves', hora: '12:00 am', titulo: 'Piso reggae-rock', icono: '\ud83c\udfb8', detalle: 'El segundo piso alterna reggae, rock y soul', tags: ['Reggae'] },
    { dia: 'Jueves', hora: '2:00 am', titulo: 'Terraza y cierre', icono: '\ud83c\udf19', detalle: '\u00daltimas horas al aire libre en la terraza del tercer piso', tags: ['Cierre'] }
  ],
  dificultad_tags: [
    { texto: 'Tres pisos con pistas a nivel y terraza', apto: true },
    { texto: 'Escaleras entre ambientes (sin ascensor p\u00fablico)', apto: false },
    { texto: 'Noche larga de miercoles a sabado hasta altas horas', apto: false },
    { texto: 'Cover variable seg\u00fan programaci\u00f3n', apto: false },
    { texto: 'Requiere ser mayor de 18', apto: false }
  ],
  temporada_matriz: {
    Ene: 'posible', Feb: 'ideal', Mar: 'ideal', Abr: 'ideal', May: 'posible',
    Jun: 'ideal', Jul: 'posible', Ago: 'ideal', Sep: 'ideal', Oct: 'ideal', Nov: 'ideal', Dic: 'posible'
  }
};

const FAQS = [
  { pregunta: '\u00bfQu\u00e9 m\u00fasica ponen?', respuesta: 'Tech-house en la pista principal, reggae y rock en el segundo piso y curadur\u00eda variada seg\u00fan la noche; el nombre remite a la radio y a la curadur\u00eda musical.' },
  { pregunta: '\u00bfCu\u00e1les son los horarios?', respuesta: 'Miercoles a sabado desde las 8PM; el cierre depende de la programaci\u00f3n de cada noche. Verifica en madradio.co.' },
  { pregunta: '\u00bfD\u00f3nde queda Mad Radio?', respuesta: 'Carrera 14A No. 82-42, barrio Chic\u00f3 (Chapinero), a pasos del Parque de la 93.' },
  { pregunta: '\u00bfCu\u00e1l es la edad m\u00ednima?', respuesta: 'Mayor de 18 a\u00f1os con documento de identidad v\u00e1lido.' },
  { pregunta: '\u00bfHay tienda de vinilos?', respuesta: 'S\u00ed, la tienda de vinilos es parte del concepto: vende discos nuevos y usados y rota los LPs de los DJs invitados.' }
];

module.exports = { SLUG: SLUG, HERO: HERO, PHOTOS: PHOTOS, BASE: BASE, TAGS: TAGS, FAQS: FAQS };

if (require.main !== module) return;

(async function main() {
  var url = process.env.DATABASE_URL || process.argv[2];
  if (!url) {
    console.error('Falta DATABASE_URL.');
    console.error('Uso: DATABASE_URL=postgres://... node scripts/seed-mad-radio.js [--dry]');
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