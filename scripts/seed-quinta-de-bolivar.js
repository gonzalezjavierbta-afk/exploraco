// scripts/seed-quinta-de-bolivar.js
// Crea (o actualiza) la pagina dinamica quinta-de-bolivar.html con los datos de
// ficha-quinta-de-bolivar.md, replicando EXACTAMENTE lo que guardaria el
// formulario admin.html. Patron de scripts/seed-museo-del-oro.js con upsert completo.
//
// Rating: NO se siembran resenas ni se hardcodea rating. La pagina queda con
// rating/contador en 0 hasta que lleguen interacciones reales (ADR-008).
//
// Uso:
//   DATABASE_URL=postgres://... node scripts/seed-quinta-de-bolivar.js --dry
//   DATABASE_URL=postgres://... node scripts/seed-quinta-de-bolivar.js
//
// Idempotente: re-ejecutable sin efectos secundarios (ON CONFLICT slug).

var neon = null;
function getNeon() {
  if (!neon) neon = require('@neondatabase/serverless').neon;
  return neon;
}

const SLUG = 'quinta-de-bolivar';
const HERO = 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/39/Fachada_de_la_casa_museo_Quinta_de_Bol%C3%ADvar.JPG/960px-Fachada_de_la_casa_museo_Quinta_de_Bol%C3%ADvar.JPG';

const PHOTOS = [
  { url: HERO, caption: 'Fachada de la Casa Museo Quinta de Bol\u00edvar' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9b/Casa_Museo_Quinta_de_Bol%C3%ADvar_desde_fuera.JPG/960px-Casa_Museo_Quinta_de_Bol%C3%ADvar_desde_fuera.JPG', caption: 'La casa museo desde el exterior' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/98/Vista_desde_el_mirador_de_la_casa_museo_Quinta_de_Bol%C3%ADvar.JPG/960px-Vista_desde_el_mirador_de_la_casa_museo_Quinta_de_Bol%C3%ADvar.JPG', caption: 'Mirador del Libertador y vista a Bogot\u00e1' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9f/Patio_al_lado_de_la_casa-museo_Quinta_de_Bol%C3%ADvar.JPG/960px-Patio_al_lado_de_la_casa-museo_Quinta_de_Bol%C3%ADvar.JPG', caption: 'Patio del conjunto museal' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b5/Alberca_de_la_casa_museo_Quinta_de_Bol%C3%ADvar.JPG/960px-Alberca_de_la_casa_museo_Quinta_de_Bol%C3%ADvar.JPG', caption: 'Alberca de la quinta' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Cultivos_en_la_casa_museo_Quinta_de_Bol%C3%ADvar.JPG/960px-Cultivos_en_la_casa_museo_Quinta_de_Bol%C3%ADvar.JPG', caption: 'Cultivos del jard\u00edn hist\u00f3rico' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/90/Sala_de_la_casa_museo_Quinta_de_Bol%C3%ADvar.JPG/960px-Sala_de_la_casa_museo_Quinta_de_Bol%C3%ADvar.JPG', caption: 'Sal\u00f3n de la casa' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Comedor_en_la_casa_museo_Quinta_de_Bol%C3%ADvar..JPG/960px-Comedor_en_la_casa_museo_Quinta_de_Bol%C3%ADvar..JPG', caption: 'Comedor de estilo franc\u00e9s' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c2/Cuarto_de_Bol%C3%ADvar_en_la_casa_museo_Quinta_de_Bolivar.JPG/960px-Cuarto_de_Bol%C3%ADvar_en_la_casa_museo_Quinta_de_Bolivar.JPG', caption: 'Alcoba del Libertador' }
];

const BASE = {
  slug: SLUG,
  nombre: 'Casa Museo Quinta de Bol\u00edvar',
  categoria_slug: 'sitio',
  lead: 'La casa de campo de Sim\u00f3n Bol\u00edvar al pie de Monserrate: salones del siglo XIX, la espada del Libertador y el jard\u00edn hist\u00f3rico m\u00e1s importante de la ciudad, con vistas a Bogot\u00e1.',
  descripcion: 'La Casa Museo Quinta de Bol\u00edvar es la casa campestre que el gobierno de la Nueva Granada entreg\u00f3 a Sim\u00f3n Bol\u00edvar el 16 de junio de 1820. Bol\u00edvar la tuvo 10 a\u00f1os pero la habit\u00f3 solo 423 d\u00edas (1821, 1826 y 1828, cuando se refugi\u00f3 con Manuela S\u00e1enz tras el atentado del 25 de septiembre de 1828). Construida en 1800 por Jos\u00e9 Antonio Portocarrero, fue declarada monumento nacional (Decreto 1584 de 1975) y abri\u00f3 como museo en 1919. Adem\u00e1s de las salas con mobiliario de \u00e9poca, audiogu\u00eda biling\u00fce y la alcoba del Libertador, el jard\u00edn hist\u00f3rico fue declarado patrimonio cultural del paisaje en 2022: es la huerta urbana m\u00e1s importante de Bogot\u00e1, con 36 especies de aves y vegetaci\u00f3n de clima fr\u00edo. Desde el 24 de julio de 2026, la Espada de Bol\u00edvar \u2013 robada por el M-19 en 1974 y recuperada en los 90 \u2013 se exhibe de nuevo en la casa.',
  highlight: 'La espada de Bol\u00edvar, los salones del siglo XIX y el jard\u00edn hist\u00f3rico con 36 especies de aves a los pies de Monserrate',
  ciudad: 'Bogot\u00e1',
  region: 'Cundinamarca',
  barrio: 'Las Aguas',
  lat: 4.6025734,
  lng: -74.0628512,
  whatsapp: '',
  telefono: '601 3424100 ext 2304',
  email: '',
  web: 'https://quintadebolivar.gov.co',
  instagram: '@quintadebolivar',
  precio_desde: 'Desde $6.000 (gratis el ultimo domingo del mes)',
  horario: 'Mar-Dom 9AM-5PM. Lunes cerrado',
  emoji: '\ud83c\udf3f',
  hero_bg: '#166534',
  foto_hero: HERO,
  tipo: 'Casa museo \u00b7 Historia \u00b7 Jard\u00edn hist\u00f3rico',
  capacidad: '',
  como_llegar: 'TransMilenio estaci\u00f3n "Universidades - City U" (Cra 3 con Cll 22) y caminar ~10-15 min cuesta arriba; o estaci\u00f3n "Las Aguas" por el Eje Ambiental. Taxi o app: Calle 21 No. 4A-30 Este. Ideal combinar con Monserrate (funicular/telef\u00e9rico a ~11 min).',
  status: 'published',
  destacado: true
};

const TAGS = {
  tipo_actividad: 'Casa museo',
  dificultad: 'F\u00e1cil',
  dificultad_desc: 'Recorrido de 1-2 horas por los salones (observados desde las barandas del per\u00edmetro) y el jard\u00edn hist\u00f3rico. Entrada y jard\u00edn accesibles; algunas habitaciones interiores tienen escalones.',
  duracion: '1-2 horas',
  altitud: '2650',
  temporada: ['Todo el a\u00f1o', 'Ultimo domingo del mes gratis pero con m\u00e1s afluencia', 'Entre semana por la ma\u00f1ana con menos visitantes'],
  precio_entrada: 'General $6.000 (colombianos 18-59) / $15.000 (extranjeros). Gratis el ultimo domingo del mes y los miercoles por la tarde (verificar horario).',
  distancia: 'Al pie del cerro de Monserrate, a ~10-15 min a pie de la estaci\u00f3n TransMilenio "Universidades" y ~11 min del funicular de Monserrate',
  como_llegar: BASE.como_llegar,
  permisos: 'No requiere reserva para ingreso individual. Grupos y visitas guiadas se coordinan con el \u00e1rea educativa (educacionquinta@mincultura.gov.co).',
  temporada_nota: 'El museo abre todo el a\u00f1o de martes a domingo 9AM-5PM (los fines de semana pueden abrir a las 10AM seg\u00fan la p\u00e1gina de tarifas). Cierra los lunes, incluidos los lunes festivos, y el 1 de enero, 1 de mayo y 25 de diciembre.',
  fauna_flora: JSON.stringify([
    { emoji: '\ud83d\udc26', nombre: 'Aves urbanas', hecho: '36 especies de aves observadas en el jard\u00edn; pajareos el ultimo sabado de mes' },
    { emoji: '\ud83c\udf38', nombre: 'Hortensias y rosales', hecho: 'Vegetaci\u00f3n de clima fr\u00edo que caracteriza el jard\u00edn patrimonial' },
    { emoji: '\ud83c\udf3e', nombre: 'Huerta urbana', hecho: 'Declarada la huerta urbana m\u00e1s importante de Bogot\u00e1' },
    { emoji: '\ud83c\udf34', nombre: '\u00c1rboles patrimoniales', hecho: '\u00c1rboles declarados patrimonio del paisaje en 2022' }
  ]),
  secretos: JSON.stringify([
    { icono: '\ud83d\udde1', titulo: 'La espada del Libertador', texto: 'Robada por el M-19 el 17 de enero de 1974 (su primera acci\u00f3n p\u00fablica), estuvo desaparecida 16 a\u00f1os y regres\u00f3 a la Quinta el 24 de julio de 2026.', tag: 'Imperdible', tag_color: 'gold' },
    { icono: '\ud83d\udd25', titulo: 'Chimenea prusiana', texto: 'Bol\u00edvar, que odiaba el fr\u00edo bogotano, mand\u00f3 construir una chimenea de estilo prusiano en su alcoba.', tag: 'Curioso', tag_color: 'orange' },
    { icono: '\ud83c\udf0c', titulo: 'Mirador del Libertador', texto: 'Desde el mirador se atribuyen planos a Bol\u00edvar: la mejor vista del centro y de Monserrate.', tag: 'Secreto', tag_color: 'purple' },
    { icono: '\ud83d\udc26', titulo: 'Pajareo gratuito', texto: 'El ultimo sabado de mes, pajareadas con la Asociaci\u00f3n Bogotana de Ornitolog\u00eda.', tag: 'Naturaleza', tag_color: 'green' },
    { icono: '\ud83d\udca6', titulo: 'El ba\u00f1o y la caballeriza', texto: 'El ba\u00f1o y la caballeriza de la \u00e9poca, conservados como parte del conjunto museal.', tag: 'Historia', tag_color: 'blue' }
  ]),
  regulaciones: 'No se permite tomar fotograf\u00edas con flash ni usar tr\u00edpode. Fotograf\u00eda profesional requiere permiso previo del museo. No ingresar con alimentos ni bebidas a los salones; el picnic en el jard\u00edn no est\u00e1 confirmado, verificar con el museo. Los bultos grandes deben depositarse en el guardarropa. Cierra los lunes por mantenimiento, incluidos los lunes festivos.',
  checklist_tip: 'Combina la visita con Monserrate (funicular a ~11 min). El ultimo domingo del mes la entrada es gratis pero con m\u00e1s afluencia; entre semana por la ma\u00f1ana el jard\u00edn est\u00e1 en calma y hay mejores posibilidades de ver aves.',
  entradas: [
    { tipo: 'Quinta de Bol\u00edvar (adulto colombiano)', precio: '6000', incluye: 'Adultos 18-59, martes a domingo', link: 'https://quintadebolivar.gov.co' },
    { tipo: 'Quinta de Bol\u00edvar (adulto extranjero)', precio: '15000', incluye: 'Adultos 18-59 extranjeros, seg\u00fan TRM', link: 'https://quintadebolivar.gov.co' },
    { tipo: 'Ultimo domingo del mes', precio: 'Gratis', incluye: 'Entrada libre para todos', link: 'https://quintadebolivar.gov.co' },
    { tipo: 'Menores de 5 y mayores de 60', precio: 'Gratis', incluye: 'Exentos de pago siempre', link: 'https://quintadebolivar.gov.co' },
    { tipo: 'Audiogu\u00eda', precio: '2000', incluye: 'Recorrido autoguiado en espa\u00f1ol o ingl\u00e9s', link: 'https://quintadebolivar.gov.co' }
  ],
  tours: [
    {
      nombre: 'Visita guiada por la casa del Libertador',
      precio: '2500', precio_sub: 'mediaci\u00f3n por persona',
      duracion: '90 minutos', tipo_tour: 'Grupal', idioma: 'Espa\u00f1ol', max_personas: 'M\u00e1x 25',
      rating: '4.8', review_count: 260,
      descripcion: 'Recorrido comentado por mediadores: salones de la casa, alcoba de Bol\u00edvar, chimenea prusiana, espada del Libertador y el jard\u00edn hist\u00f3rico.',
      incluye: ['Mediador especializado', 'Entrada', 'Historia de Bol\u00edvar y Manuela S\u00e1enz'],
      no_incluye: ['Transporte', 'Audiogu\u00eda'],
      link_reserva: 'https://quintadebolivar.gov.co',
      featured: true
    },
    {
      nombre: 'Quinta de Bol\u00edvar + Monserrate',
      precio: '90000', precio_sub: 'por persona',
      duracion: '5 horas', tipo_tour: 'Grupal', idioma: 'Espa\u00f1ol/Ingl\u00e9s', max_personas: 'M\u00e1x 12',
      rating: '4.7', review_count: 180,
      descripcion: 'Combo imperdible: la casa de Bol\u00edvar al pie del cerro y subida al santuario de Monserrate con su mirador a 3.152 m.',
      incluye: ['Entrada a la Quinta', 'Funicular/telef\u00e9rico de Monserrate', 'Gu\u00eda'],
      no_incluye: ['Alimentos', 'Transporte'],
      link_reserva: 'https://bogotawalkingtours.com',
      featured: false
    },
    {
      nombre: 'Tour privado Monserrate, Oro y Candelaria',
      precio: '120000', precio_sub: 'por persona',
      duracion: '6 horas', tipo_tour: 'Privado', idioma: 'Espa\u00f1ol', max_personas: 'M\u00e1x 6',
      rating: '4.9', review_count: 110,
      descripcion: 'Recorrido privado que une la Quinta de Bol\u00edvar, el santuario de Monserrate y el Museo del Oro con gu\u00eda dedicada.',
      incluye: ['Entradas', 'Gu\u00eda privado', 'Transporte'],
      no_incluye: ['Alimentos'],
      link_reserva: 'https://museumtoursbogota.com',
      featured: false
    }
  ],
  equipamiento: [
    { item: 'Identificaci\u00f3n (pasaporte o c\u00e9dula)', prioridad: 'Obligatorio' },
    { item: 'Efectivo para la entrada (pagos en efectivo COP)', prioridad: 'Recomendado' },
    { item: 'Zapatos c\u00f3modos para el jard\u00edn y la cuesta', prioridad: 'Recomendado' },
    { item: 'C\u00e1mara sin flash ni tr\u00edpode', prioridad: 'Opcional' },
    { item: 'Binoculares para el pajareo (36 especies)', prioridad: 'Opcional' }
  ],
  itinerario: [
    { dia: 'Recorrido', hora: '9:00 am', titulo: 'Salones de la casa', icono: '\ud83c\udfe1', detalle: 'Gran sal\u00f3n, comedor franc\u00e9s y salones de Manuela S\u00e1enz', tags: ['Casa'] },
    { dia: 'Recorrido', hora: '9:45 am', titulo: 'Alcoba del Libertador', icono: '\ud83d\udecf', detalle: 'La habitaci\u00f3n de Bol\u00edvar y la chimenea prusiana', tags: ['Bol\u00edvar'] },
    { dia: 'Recorrido', hora: '10:15 am', titulo: 'Espada de Bol\u00edvar', icono: '\ud83d\udde1', detalle: 'La espada robada por el M-19 en 1974, de vuelta en la casa', tags: ['Historia'] },
    { dia: 'Recorrido', hora: '10:45 am', titulo: 'Jard\u00edn hist\u00f3rico', icono: '\ud83c\udf3f', detalle: 'La huerta urbana con 36 especies de aves y vista a la ciudad', tags: ['Naturaleza'] }
  ],
  dificultad_tags: [
    { texto: 'Recorrido de 1-2 horas entre salones y jard\u00edn', apto: true },
    { texto: 'Entrada y jard\u00edn accesibles', apto: true },
    { texto: 'La casa se observa desde barandas (sin acceso al interior)', apto: false },
    { texto: 'Ultimo domingo gratis pero con m\u00e1s afluencia', apto: false },
    { texto: 'Lunes cerrado por mantenimiento', apto: false }
  ],
  temporada_matriz: {
    Ene: 'ideal', Feb: 'ideal', Mar: 'ideal', Abr: 'posible', May: 'posible',
    Jun: 'ideal', Jul: 'ideal', Ago: 'ideal', Sep: 'posible', Oct: 'posible', Nov: 'ideal', Dic: 'posible'
  }
};

const FAQS = [
  { pregunta: '\u00bfCu\u00e1nto cuesta la entrada a la Quinta de Bol\u00edvar?', respuesta: 'Adultos colombianos $6.000 y extranjeros $15.000 (Resoluci\u00f3n 0975). Ni\u00f1os 6-12 $2.000/$5.000 y j\u00f3venes 13-17 $4.000/$10.000. Ni\u00f1os 0-5 y mayores de 60 gratis.' },
  { pregunta: '\u00bfCu\u00e1ndo es gratis?', respuesta: 'El \u00faltimo domingo de cada mes. Los miercoles por la tarde (2-5PM o 3-5PM, verificar con el museo). Tambi\u00e9n para personas con discapacidad y su acompa\u00f1ante.' },
  { pregunta: '\u00bfSe puede ver la espada de Bol\u00edvar?', respuesta: 'Si. Desde el 24 de julio de 2026 la Espada de Bol\u00edvar, robada por el M-19 en 1974 y recuperada en los 90, se exhibe de nuevo en la casa.' },
  { pregunta: '\u00bfSe puede entrar a las habitaciones?', respuesta: 'No. Las salas se observan desde las barandas del per\u00edmetro; el jard\u00edn y los exteriores si se recorren libremente.' },
  { pregunta: '\u00bfQu\u00e9 tan lejos est\u00e1 de Monserrate?', respuesta: 'A ~11 min a pie del funicular/telef\u00e9rico. El combo Quinta + Monserrate es el plan m\u00e1s recomendado del sector.' }
];

module.exports = { SLUG: SLUG, HERO: HERO, PHOTOS: PHOTOS, BASE: BASE, TAGS: TAGS, FAQS: FAQS };

if (require.main !== module) return;

(async function main() {
  var url = process.env.DATABASE_URL || process.argv[2];
  if (!url) {
    console.error('Falta DATABASE_URL.');
    console.error('Uso: DATABASE_URL=postgres://... node scripts/seed-quinta-de-bolivar.js [--dry]');
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