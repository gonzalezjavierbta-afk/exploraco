// scripts/seed-parque-mundo-aventura.js
// Crea (o actualiza) la pagina dinamica parque-mundo-aventura.html con los
// datos de ficha-parque-mundo-aventura.md, replicando EXACTAMENTE lo que
// guardaria el formulario admin.html (CATEGORY_TAG_FIELDS/CATEGORY_TAG_LISTS
// sitio, _buildTagsObj/_placeToAPI). Patron de scripts/seed-parque-simon-bolivar.js.
//
// Rating: NO se siembran resenas ni se hardcodea rating. La pagina queda
// con rating/contador en 0 hasta que lleguen interacciones reales
// (ADR-009: api/interacciones.js recalcula AVG/COUNT dinamicamente).
// Los tours del seed llevan rating '0' y review_count 0 (vienen asi en la ficha).
//
// Uso:
//   DATABASE_URL=postgres://... node scripts/seed-parque-mundo-aventura.js --dry
//   DATABASE_URL=postgres://... node scripts/seed-parque-mundo-aventura.js
//
// Idempotente: re-ejecutable sin efectos secundarios (ON CONFLICT slug).

var neon = null;
function getNeon() {
  if (!neon) neon = require('@neondatabase/serverless').neon;
  return neon;
}

const SLUG = 'parque-mundo-aventura';
const HERO = 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/66/Mundoaventura.jpg/960px-Mundoaventura.jpg';

const PHOTOS = [
  { url: HERO, caption: 'El parque de atracciones en la localidad de Kennedy' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/d/d9/Mundo_Aventura%2C_Bogot%C3%A1.jpg', caption: 'Vista del parque Mundo Aventura en Bogot\u00e1' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/Mundo_Aventura_monta%C3%B1a_rusa.JPG/960px-Mundo_Aventura_monta%C3%B1a_rusa.JPG', caption: 'Monta\u00f1a rusa de Mundo Aventura' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Mundo_Aventura_rueda_de_la_fortuna.JPG/960px-Mundo_Aventura_rueda_de_la_fortuna.JPG', caption: 'Rueda de la fortuna (mini rueda) del parque' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c6/Mundo_aventura_entrada.JPG/960px-Mundo_aventura_entrada.JPG', caption: 'Entrada al parque Mundo Aventura' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/35/Parque_tem%C3%A1tico_Mundo_Aventura.jpg/960px-Parque_tem%C3%A1tico_Mundo_Aventura.jpg', caption: 'Zonas tem\u00e1ticas del parque Mundo Aventura' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ee/Mundo_Aventura_juego_mecanico.JPG/960px-Mundo_Aventura_juego_mecanico.JPG', caption: 'Juego mec\u00e1nico de Mundo Aventura' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/92/Entrada_P_Mundo_Aven_Bogot%C3%A1.jpg/960px-Entrada_P_Mundo_Aven_Bogot%C3%A1.jpg', caption: 'Entrada del parque en Bogot\u00e1' }
];

const BASE = {
  slug: SLUG,
  nombre: 'Parque Mundo Aventura',
  categoria_slug: 'sitio',
  lead: 'El parque de atracciones n\u00famero uno de Colombia por visitantes: 13 hect\u00e1reas en Kennedy con monta\u00f1as rusas, la torre de ca\u00edda libre m\u00e1s alta del pa\u00eds (Gravity, 57 m) y entrada gratuita al parque; solo se paga por usar las atracciones.',
  descripcion: 'Mundo Aventura abri\u00f3 sus puertas el 30 de enero de 1998 como un aporte de la C\u00e1mara de Comercio de Bogot\u00e1 a la ciudad, operado por Corparques (Corporaci\u00f3n para el Desarrollo de los Parques y la Recreaci\u00f3n en Bogot\u00e1), una entidad sin \u00e1nimo de lucro. Desde su inauguraci\u00f3n m\u00e1s de 9 millones de personas lo han visitado, lo que lo convierte en el parque de diversiones n\u00famero uno de Colombia por n\u00famero de visitantes y en ganador del premio Rosa de los Vientos de ACOPET. Se construy\u00f3 en los terrenos aleda\u00f1os al antiguo Hip\u00f3dromo de Techo (hoy Estadio Metropolitano de Techo), en la localidad de Kennedy, junto al centro comercial Plaza de las Am\u00e9ricas y la estaci\u00f3n de TransMilenio que antiguamente llevaba su nombre. El parque re\u00fane m\u00e1s de 40 atracciones repartidas en zonas tem\u00e1ticas: Mundo Pombo (atracciones infantiles inspiradas en los cuentos de Rafael Pombo), Sabana Precolombina (atracciones extremas), Mundo Natural (la \u00fanica granja dentro de un parque de diversiones en la ciudad), Bogot\u00e1 Tur\u00edstica y el restaurante tem\u00e1tico Araza con show animatr\u00f3nico de la selva amaz\u00f3nica. Entre sus iconos est\u00e1n Gravity, la torre de ca\u00edda libre m\u00e1s alta de Colombia (57 m, inaugurada en 2023), X-Treme (47 m), Vertical Swing (41 m), Sky Coaster, Quantum, la Monta\u00f1ita Rusa, la mini rueda y el carrusel cl\u00e1sico. Su modelo de acceso es \u00fanico en el pa\u00eds: el ingreso al parque es gratuito y solo se paga por el uso de las atracciones, ya sea con un pasaporte (Kids, Silver o Gold) o con boletas individuales por atracci\u00f3n. Desde 2021, cada octubre acoge Terror al Parque, un evento de Halloween con estaciones de terror y shows en vivo, y en 2026 estrena una nueva carpa para conciertos.',
  highlight: 'Gravity, la torre de ca\u00edda libre m\u00e1s alta de Colombia (57 m), inaugurada en 2023',
  ciudad: 'Bogot\u00e1',
  region: 'Cundinamarca',
  barrio: 'Kennedy (Hipotecho)',
  lat: 4.622054,
  lng: -74.134912,
  whatsapp: '573183471921',
  telefono: '(601) 414 2700',
  email: '',
  web: 'https://mundoaventura.com.co',
  instagram: 'mundo_aventura',
  precio_desde: 'Entrada gratis; pasaportes desde $73.000',
  horario: 'Jue 12:30PM-5PM \u00b7 Vie 10:30AM-5PM \u00b7 Sab-Dom 10:30AM-6PM \u00b7 Festivos 10AM-7PM \u00b7 Lun-Mie cerrado',
  emoji: '\ud83c\udfa1',
  hero_bg: '#be123c',
  foto_hero: HERO,
  tipo: 'Atracciones mec\u00e1nicas \u00b7 Parque de diversiones familiar \u00b7 Granja tem\u00e1tica',
  capacidad: 'M\u00e1s de 40 atracciones en 13 hect\u00e1reas',
  como_llegar: 'En TransMilenio bajarse en la estaci\u00f3n Americas - Avenida Boyaca (antes "Mundo Aventura") de la troncal Av. Americas con las rutas F23, F32, F51, 5, J23 y E32, o en la estaci\u00f3n Marsella a pocas cuadras; tambi\u00e9n llegan rutas SITP como 8-10, C1 y T40. En carro por la avenida Boyaca o la avenida de Las Americas; el parqueadero (aforo limitado) se accede por la carrera 71D.',
  status: 'published',
  destacado: true
};

const TAGS = {
  tipo_actividad: 'Atracciones mec\u00e1nicas, parque de diversiones familiar y granja tem\u00e1tica',
  dificultad: 'F\u00e1cil',
  dificultad_desc: 'Parque urbano plano y accesible para caminar; la exigencia depende de cada atracci\u00f3n. Las extremas (Gravity, X-Treme, Sky Coaster, Quantum, Vertical Swing) requieren estatura m\u00ednima de 120-130 cm y aptitud f\u00edsica.',
  duracion: '3-4 horas (media jornada)',
  altitud: '2560',
  temporada: ['Todo el a\u00f1o', 'Fines de semana y festivos con operaci\u00f3n plena', 'Octubre: temporada de Terror al Parque', 'Mar-may y sep-nov: cierres parciales por lluvia'],
  precio_entrada: 'Ingreso gratuito; pasaportes desde $73.000',
  distancia: 'Sur occidente de Bogot\u00e1, localidad de Kennedy, costado oriental de la avenida Boyac\u00e1 entre la avenida Primero de Mayo y la avenida de Las Americas, junto al CC Plaza de las Americas y el Estadio Metropolitano de Techo.',
  como_llegar: BASE.como_llegar,
  permisos: 'No se requiere reserva para el pasaporte general (taquilla o pasaportes.mundoaventura.com.co). Los menores deben ingresar con un adulto responsable. El pasaporte es personal e intransferible, se ajusta en la mu\u00f1eca izquierda y es v\u00e1lido solo el d\u00eda de compra.',
  temporada_nota: 'En 2026 el parque opera de jueves a domingo y festivos: jueves (Pasaporte Jueves X) 12:30PM-5PM, viernes 10:30AM-5PM, s\u00e1bados y domingos 10:30AM-6PM y festivos 10AM-7PM. Lunes a mi\u00e9rcoles cierra. La venta de boleter\u00eda y el ingreso se cierran 2 horas antes del cierre total; los horarios pueden cambiar sin previo aviso (verificar la web).',
  fauna_flora: JSON.stringify([
    { emoji: '\ud83d\udc10', nombre: 'Granja Mundo Natural', hecho: 'Cabras, ovejas y vacas de la \u00fanica granja dentro de un parque de diversiones en la ciudad' },
    { emoji: '\ud83d\udc14', nombre: 'Aves de corral', hecho: 'Gallinas y patos que se alimentan en los recorridos interactivos de la granja' },
    { emoji: '\ud83d\udc07', nombre: 'Conejos', hecho: 'Zona de contacto infantil para acariciar y alimentar a los conejos de la granja' },
    { emoji: '\ud83d\udc26', nombre: 'Aves urbanas', hecho: 'Copetones, mirlas y palomas que habitan el arbolado del parque en medio de Kennedy' },
    { emoji: '\ud83c\udf33', nombre: 'Flora urbana', hecho: 'Arboles y jardines ornamentales que dan sombra a las 13 hect\u00e1reas y a las plazoletas' }
  ]),
  secretos: JSON.stringify([
    { icono: '\ud83c\udf83', titulo: 'Gravity, ca\u00edda de 57 m', texto: 'Inaugurada en 2023, es la torre de ca\u00edda libre m\u00e1s alta de Colombia: lanza a 44 km/h hasta 57 m y cae a 11 m/s con 2,5 g.', tag: 'Imperdible', tag_color: 'gold' },
    { icono: '\ud83d\ude8d', titulo: 'Estaci\u00f3n "Mundo Aventura"', texto: 'La estaci\u00f3n de TransMilenio frente al parque se llamaba Mundo Aventura y hoy se llama Americas - Avenida Boyaca.', tag: 'Dato curioso', tag_color: 'blue' },
    { icono: '\ud83d\udc0d', titulo: 'Terror al Parque', texto: 'Desde 2021, cada octubre el parque se convierte en un evento de Halloween con estaciones de terror, zonas de itinerancia y shows en vivo.', tag: 'Evento', tag_color: 'purple' },
    { icono: '\ud83d\udc0d', titulo: 'Show animatr\u00f3nico Araza', texto: 'El restaurante tem\u00e1tico recrea la selva amaz\u00f3nica con animatr\u00f3nicos que interact\u00faan cada 30 minutos.', tag: 'Dato curioso', tag_color: 'blue' },
    { icono: '\ud83c\udfc5', titulo: 'Antiguo Hip\u00f3dromo de Techo', texto: 'El parque se levant\u00f3 en los terrenos aleda\u00f1os al antiguo Hip\u00f3dromo de Techo, hoy Estadio Metropolitano de Techo.', tag: 'Historia', tag_color: 'green' }
  ]),
  regulaciones: 'El ingreso al parque es gratuito; el pasaporte es personal e intransferible, se ajusta en la mu\u00f1eca izquierda y es v\u00e1lido solo el d\u00eda de compra. La venta de boleter\u00eda y el ingreso se cierran 2 horas antes del cierre total; las puertas del parque se cierran con antelaci\u00f3n. Los menores de edad deben permanecer bajo la responsabilidad exclusiva del adulto acompa\u00f1ante. Las atracciones extremas exigen estatura m\u00ednima (120-130 cm) y pueden tener restricciones de salud; no se permite el ingreso con elementos sueltos. Las atracciones al aire libre cierran por lluvia o tormenta; se pueden cortar filas sin previo aviso y existe bono por lluvia.',
  checklist_tip: 'Compra el pasaporte online o en taquilla temprano: la venta se cierra 2 horas antes del cierre y los fines de semana las filas crecen r\u00e1pido.',
  entradas: [
    { tipo: 'Ingreso al parque', precio: 'Gratis', incluye: 'Areas comunes, zonas tem\u00e1ticas, plazoleta de comidas y restaurante Araza', link: 'https://mundoaventura.com.co' },
    { tipo: 'Pasaporte Kids', precio: '$73.000', incluye: '21 atracciones infantiles y familiares; estatura m\u00ednima 70 cm', link: 'https://pasaportes.mundoaventura.com.co' },
    { tipo: 'Pasaporte Silver', precio: '$84.000', incluye: '29 atracciones; estatura m\u00ednima 120 cm', link: 'https://pasaportes.mundoaventura.com.co' },
    { tipo: 'Pasaporte Gold', precio: '$95.000', incluye: '33 atracciones incluyendo las extremas; estatura m\u00ednima 130 cm', link: 'https://pasaportes.mundoaventura.com.co' },
    { tipo: 'FilaExpress', precio: '$73.000', incluye: 'Fila preferencial en las atracciones del pasaporte; no v\u00e1lido en Sky Coaster, Teatro 5D y paseo a caballo', link: 'https://pasaportes.mundoaventura.com.co' }
  ],
  tours: [
    {
      nombre: 'Dia extremo: Gravity, Quantum y Sky Coaster',
      precio: '$95.000', precio_sub: 'pasaporte Gold',
      duracion: '4 horas', tipo_tour: 'Autoguiado', idioma: 'Espa\u00f1ol', max_personas: 'Libre',
      rating: '0', review_count: 0,
      descripcion: 'Circuito por las atracciones extremas del parque: la torre de ca\u00edda libre Gravity (57 m), Quantum, Sky Coaster, X-Treme y Vertical Swing, con paradas en la plazoleta de comidas.',
      incluye: ['Acceso a 33 atracciones', 'Mapa del parque'],
      no_incluye: ['Transporte', 'Comidas'],
      link_reserva: 'https://pasaportes.mundoaventura.com.co',
      featured: true
    },
    {
      nombre: 'Plan familiar en Mundo Pombo y Mundo Natural',
      precio: '$73.000', precio_sub: 'pasaporte Kids',
      duracion: '3 horas', tipo_tour: 'Autoguiado', idioma: 'Espa\u00f1ol', max_personas: 'Libre',
      rating: '0', review_count: 0,
      descripcion: 'Recorrido infantil por el carrusel, la mini rueda, los mini chocones y el Paseo de Piratas, m\u00e1s la granja de Mundo Natural donde se alimentan los animales de corral.',
      incluye: ['Acceso a 21 atracciones infantiles', 'Entrada a Mundo Natural'],
      no_incluye: ['Transporte', 'Alimentos para los animales'],
      link_reserva: 'https://pasaportes.mundoaventura.com.co',
      featured: false
    },
    {
      nombre: 'Membres\u00eda SuperFan por un a\u00f1o',
      precio: '$125.000', precio_sub: 'anual',
      duracion: '1 a\u00f1o', tipo_tour: 'Membres\u00eda', idioma: 'Espa\u00f1ol', max_personas: '1 titular',
      rating: '0', review_count: 0,
      descripcion: 'Membres\u00eda con 50% de descuento en pasaportes durante un a\u00f1o, fila preferencial en todas las visitas y 3 pasaportes Silver gratuitos en fechas espec\u00edficas.',
      incluye: ['50% de descuento en pasaportes', 'Fila preferencial', '3 pasaportes Silver gratis en fechas espec\u00edficas'],
      no_incluye: ['Pasaportes de acompa\u00f1antes'],
      link_reserva: 'https://mundoaventura.com.co/conoce-el-parque-mundo-aventura/super-fan/',
      featured: false
    }
  ],
  equipamiento: [
    { item: 'Comprar el pasaporte online o en taquilla temprano (la venta se cierra 2 horas antes del cierre)', prioridad: 'Recomendado' },
    { item: 'Zapatos cerrados y ropa c\u00f3moda para las atracciones', prioridad: 'Recomendado' },
    { item: 'Impermeable: las atracciones al aire libre cierran con lluvia', prioridad: 'Recomendado' },
    { item: 'Gorra, protector solar e hidrataci\u00f3n (altitud 2560 m)', prioridad: 'Recomendado' },
    { item: 'C\u00e1mara y espacio para los premios de juegos de destreza', prioridad: 'Opcional' }
  ],
  itinerario: [
    { dia: 'D\u00eda de parque', hora: '10:30 am', titulo: 'Pasaportes y entrada', icono: '\ud83c\udf81', detalle: 'Taquilla o compra online; el ingreso al parque es gratis y el pasaporte se ajusta en la mu\u00f1eca', tags: ['Familia'] },
    { dia: 'D\u00eda de parque', hora: '11:00 am', titulo: 'Zona extrema', icono: '\ud83c\udf83', detalle: 'Gravity, Sky Coaster, Quantum y X-Treme para quienes superen la estatura m\u00ednima', tags: ['Adrenalina'] },
    { dia: 'D\u00eda de parque', hora: '1:00 pm', titulo: 'Plazoleta y Araza', icono: '\ud83c\udf73', detalle: 'Hamburguesas, pollo y pizza, o el show animatr\u00f3nico de la selva del restaurante Araza', tags: ['Gastro'] },
    { dia: 'D\u00eda de parque', hora: '2:30 pm', titulo: 'Mundo Pombo y Mundo Natural', icono: '\ud83c\udfa1', detalle: 'Carrusel, mini rueda, Paseo de Piratas y la granja con animales de corral', tags: ['Familia'] }
  ],
  dificultad_tags: [
    { texto: 'Areas comunes, zonas tem\u00e1ticas y restaurantes accesibles sin restricci\u00f3n', apto: true },
    { texto: 'Atracciones infantiles de Mundo Pombo (carrusel, mini rueda, mini chocones) sin exigencia f\u00edsica', apto: true },
    { texto: 'Atracciones extremas con estatura m\u00ednima (120-130 cm) y restricciones de salud', apto: false },
    { texto: 'Cierres por lluvia o tormenta de atracciones al aire libre', apto: false },
    { texto: 'Altitud 2560 m; ca\u00eddas como Gravity exigen aptitud f\u00edsica y estado de salud', apto: false }
  ],
  temporada_matriz: {
    Ene: 'ideal', Feb: 'ideal', Mar: 'posible', Abr: 'posible', May: 'posible',
    Jun: 'ideal', Jul: 'ideal', Ago: 'ideal', Sep: 'posible', Oct: 'posible', Nov: 'posible', Dic: 'ideal'
  }
};

const FAQS = [
  { pregunta: '\u00bfCu\u00e1nto cuesta la entrada a Mundo Aventura?', respuesta: 'El ingreso al parque es gratuito; solo se paga por usar las atracciones. Pasaportes 2026: Kids $73.000 (21 atracciones), Silver $84.000 (29) y Gold $95.000 (33). Las boletas individuales van desde $8.000.' },
  { pregunta: '\u00bfQu\u00e9 d\u00edas abre el parque?', respuesta: 'En 2026 opera de jueves a domingo y festivos: jueves (Jueves X) 12:30PM-5PM, viernes 10:30AM-5PM, s\u00e1bados y domingos 10:30AM-6PM y festivos 10AM-7PM. Lunes a mi\u00e9rcoles cierra. La venta de pasaportes se cierra 2 horas antes.' },
  { pregunta: '\u00bfC\u00f3mo llegar en TransMilenio?', respuesta: 'Bajarse en la estaci\u00f3n Americas - Avenida Boyaca (antes Mundo Aventura) de la troncal Av. Americas con las rutas F23, F32, F51, 5 y J23; tambi\u00e9n sirve la estaci\u00f3n Marsella a pocas cuadras. En carro por la avenida Boyaca o Las Americas.' },
  { pregunta: '\u00bfCu\u00e1l es la atracci\u00f3n m\u00e1s alta?', respuesta: 'Gravity, inaugurada en 2023: torre de ca\u00edda libre de 57 m, la m\u00e1s alta de Colombia. Le siguen X-Treme (47 m) y Vertical Swing (41 m). Se accede con el Pasaporte Gold (estatura m\u00ednima 130 cm).' },
  { pregunta: '\u00bfHay descuentos o membres\u00eda?', respuesta: 'La membres\u00eda SuperFan cuesta $125.000 al a\u00f1o e incluye 50% de descuento en pasaportes, fila preferencial y 3 pasaportes Silver gratis en fechas espec\u00edficas. Tambi\u00e9n hay convenios y bono por lluvia.' }
];

module.exports = { SLUG: SLUG, HERO: HERO, PHOTOS: PHOTOS, BASE: BASE, TAGS: TAGS, FAQS: FAQS };

if (require.main !== module) return;

(async function main() {
  var url = process.env.DATABASE_URL || process.argv[2];
  if (!url) {
    console.error('Falta DATABASE_URL.');
    console.error('Uso: DATABASE_URL=postgres://... node scripts/seed-parque-mundo-aventura.js [--dry]');
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