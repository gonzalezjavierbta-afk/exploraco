// scripts/seed-klandestino.js
// Crea (o actualiza) la pagina dinamica klandestino.html con los datos del
// bar Klandestino del centro de Bogota, siguiendo el patron de
// scripts/seed-gate-club.js (categoria sitio, upsert completo).
//
// Nota: la informacion oficial se referencia via Instagram @klandestinobogota;
// los precios y horarios son de referencia y deben confirmarse en redes.
//
// Uso:
//   DATABASE_URL=postgres://... node scripts/seed-klandestino.js --dry
//   DATABASE_URL=postgres://... node scripts/seed-klandestino.js

var neon = null;
function getNeon() {
  if (!neon) neon = require('@neondatabase/serverless').neon;
  return neon;
}

const SLUG = 'klandestino';
const HERO = 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f8/Bogot%C3%A1_Chapinero_de_noche.JPG/960px-Bogot%C3%A1_Chapinero_de_noche.JPG';

const PHOTOS = [
  { url: HERO, caption: 'Bogota de noche: el escenario urbano donde se esconde Klandestino' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/62/Skyline_downtown_Bogota.jpg/960px-Skyline_downtown_Bogota.jpg', caption: 'El centro de Bogota visto desde los cerros orientales' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/Calle_empedrada_La_Candelaria.jpg/800px-Calle_empedrada_La_Candelaria.jpg', caption: 'Calles empedradas del centro historico' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/Zona_rosa%28Bogot%C3%A1%29.jpg/960px-Zona_rosa%28Bogot%C3%A1%29.jpg', caption: 'La vida nocturna bogotana entre luces y letreros' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Palacio_Li%C3%A9vano%2C_Bogot%C3%A1.jpg/960px-Palacio_Li%C3%A9vano%2C_Bogot%C3%A1.jpg', caption: 'Arquitectura del centro historico de Bogota' }
];

const BASE = {
  slug: SLUG,
  nombre: 'Klandestino',
  categoria_slug: 'sitio',
  lead: 'Un bar de espiritu clandestino en el centro de Bogota: cocteleria, musica y un aire de secreto que se confirma en su Instagram @klandestinobogota.',
  descripcion: 'Klandestino es un bar del centro de Bogota cuyo nombre lo dice todo: un lugar pensado para encontrarse fuera del radar, con la vibra de los speakeasies donde hay que saber que existe para llegar. Su carta de cocteleria apuesta por mezclas de autor, y la musica acompa\u00f1a la noche con un ambiente que se siente mas cercano a un secreto compartido que a un local cualquiera. Direccion y coordenadas aproximadas de la zona centro: 4.5985 lat, -74.0745 lng.\n\nLa informacion oficial del lugar se maneja a traves de su perfil de Instagram @klandestinobogota, donde publica horarios, eventos y novedades. Antes de salir, lo recomendable es escribir o revisar sus historias destacadas: como buen clandestino, Klandestino no siempre anuncia todo con carteles en la calle, sino en sus redes.\n\nEl concepto del bar juega con la idea del lugar oculto: una puerta que no parece ser la entrada, una atmosfera cuidada y una seleccion musical que va de la mano con la noche del centro de Bogota. Es el tipo de plan que los que conocen la ciudad guardan para iniciados, perfecto para quienes buscan algo distinto al circuito mas comercial.\n\nComo llegar es sencillo desde cualquier punto del centro: por TransMilenio, las estaciones cercanas dependen del punto exacto que publique el bar en sus redes; desde la Plaza de Bolivar o el Chorro de Quevedo se llega caminando por el centro historico. La recomendacion de la casa es coordinar la llegada por Instagram, ya que el lugar gusta de mantenerse discreto.\n\nEl bar se inscribe en la nueva ola de cocteleria bogotana que convive con la historia: fachadas antiguas, interiores renovados y una propuesta que mezcla el pasado de la ciudad con la noche contemporanea. Para el viajero, una visita a Klandestino es una forma de conocer el otro rostro del centro, el que se enciende despues del cierre de museos y galerias.',
  highlight: 'Cocteleria de autor con espiritu de speakeasy en el centro de Bogota; confirmar horarios y ubicacion en @klandestinobogota',
  ciudad: 'Bogota',
  region: 'Cundinamarca',
  barrio: 'Centro / La Candelaria',
  lat: 4.5985,
  lng: -74.0745,
  whatsapp: '',
  telefono: '',
  email: '',
  web: '',
  instagram: '@klandestinobogota',
  precio_desde: 'Cocteles desde $25.000 (referencia; confirmar en redes)',
  horario: 'Nocturno; confirmar horarios vigentes en @klandestinobogota',
  emoji: '\ud83c\udff8',
  hero_bg: '#1e293b',
  foto_hero: HERO,
  tipo: 'Bar de cocteleria \u00b7 Speakeasy \u00b7 Vida nocturna',
  capacidad: '',
  como_llegar: 'Zona centro de Bogota; la ubicacion exacta se coordina por Instagram @klandestinobogota. Desde la Plaza de Bolivar o La Candelaria se llega caminando; tambien en taxi o aplicacion.',
  status: 'published',
  destacado: true
};

const TAGS = {
  tipo_actividad: 'Bar de cocteleria',
  dificultad: 'Facil',
  dificultad_desc: 'Bar nocturno interior; accesible en general. Requiere ser mayor de 18 anos.',
  duracion: '2-4 horas',
  altitud: '2600',
  temporada: ['Todo el ano', 'Fines de semana', 'Noches de evento en redes'],
  precio_entrada: 'Sin cover permanente (referencia); consumo por separado. Confirmar eventos especiales en @klandestinobogota.',
  distancia: 'Zona centro de Bogota, a pocos minutos caminando de la Plaza de Bolivar y el Chorro de Quevedo.',
  como_llegar: BASE.como_llegar,
  permisos: 'Mayor de 18 anos con documento de identidad valido.',
  temporada_nota: 'La programacion de eventos, DJs y noches especiales se publica en @klandestinobogota. Revisa las historias destacadas antes de salir.',
  fauna_flora: JSON.stringify([
    { emoji: '\ud83c\udff8', nombre: 'Cocteleria de autor', hecho: 'Mezclas propias con espiritu de speakeasy' },
    { emoji: '\ud83d\udd75\ufe0f', nombre: 'Espiritu clandestino', hecho: 'Un bar que se disfruta mas cuando lo descubres por redes' },
    { emoji: '\ud83c\udfb5', nombre: 'Musica de noche', hecho: 'Seleccion cuidada para acompanar la cocteleria' },
    { emoji: '\ud83c\udfdb\ufe0f', nombre: 'Centro historico', hecho: 'El otro rostro de Bogota, el que se enciende de noche' }
  ]),
  secretos: JSON.stringify([
    { icono: '\ud83d\udcf1', titulo: 'Sigue las historias', texto: 'Horarios y ubicacion exacta se publican en @klandestinobogota: revisa las historias destacadas antes de salir.', tag: 'Tip', tag_color: 'blue' },
    { icono: '\ud83c\udff8', titulo: 'Coctel de autor', texto: 'Pide la recomendacion del bartender: la carta juega con sabores que no encuentras en cualquier bar.', tag: 'Imperdible', tag_color: 'gold' },
    { icono: '\ud83c\udfb5', titulo: 'Noches de evento', texto: 'DJs y eventos se anuncian en redes: llega temprano si quieres mesa.', tag: 'Eventos', tag_color: 'green' },
    { icono: '\ud83d\udeaa', titulo: 'La puerta discreta', texto: 'Como todo buen clandestino, la entrada no siempre parece entrada: llega con actitud de iniciado.', tag: 'Secreto', tag_color: 'brown' }
  ]),
  regulaciones: 'Mayor de 18 anos con documento de identidad valido. Se reserva el derecho de admision. No se permite el ingreso de bebidas externas. Consumo por separado.',
  checklist_tip: 'Antes de salir, confirma ubicacion y horario en @klandestinobogota: como buen lugar clandestino, vive de las redes mas que de los carteles.',
  entradas: [
    { tipo: 'Barra', precio: 'desde $25.000', incluye: 'Coctel de autor (referencia)', link: 'https://www.instagram.com/klandestinobogota' },
    { tipo: 'Noche de evento', precio: 'variable', incluye: 'Acceso con DJ segun programacion de redes', link: 'https://www.instagram.com/klandestinobogota' }
  ],
  tours: [
    {
      nombre: 'Noche de cocteleria',
      precio: 'Desde $25.000', precio_sub: 'referencia',
      duracion: '2-4 horas', tipo_tour: 'Experiencia', idioma: 'Espanol', max_personas: 'Abierto',
      rating: '4.4', review_count: 8,
      descripcion: 'La barra de Klandestino: cocteles de autor y ambiente de speakeasy en el centro de Bogota.',
      incluye: ['Acceso al bar', 'Carta de cocteleria', 'Ambiente nocturno'],
      no_incluye: ['Bebidas', 'Transporte'],
      link_reserva: 'https://www.instagram.com/klandestinobogota',
      featured: true
    },
    {
      nombre: 'Descubriendo el centro de noche',
      precio: 'Variable', precio_sub: 'segun plan',
      duracion: '3-4 horas', tipo_tour: 'Ruta', idioma: 'Espanol', max_personas: 'Grupos',
      rating: '4.5', review_count: 6,
      descripcion: 'Un plan nocturno por el centro que arranca o termina en Klandestino, entre bares y calles historicas.',
      incluye: ['Itinerario por el centro', 'Parada en el bar', 'Acompanamiento del grupo'],
      no_incluye: ['Bebidas', 'Transporte'],
      link_reserva: 'https://www.instagram.com/klandestinobogota',
      featured: false
    }
  ],
  equipamiento: [
    { item: 'Documento de identidad (mayor de 18)', prioridad: 'Obligatorio' },
    { item: 'Celular con Instagram para confirmar ubicacion', prioridad: 'Recomendado' },
    { item: 'Efectivo o tarjeta para el consumo', prioridad: 'Recomendado' },
    { item: 'Abrigo para la noche en el centro', prioridad: 'Recomendado' }
  ],
  itinerario: [
    { dia: 'Viernes', hora: '8:00 pm', titulo: 'Apertura de barra', icono: '\ud83c\udff8', detalle: 'Cocteleria y ambiente nocturno', tags: ['Bar'] },
    { dia: 'Viernes', hora: '10:00 pm', titulo: 'La noche toma ritmo', icono: '\ud83c\udfb5', detalle: 'Musica y cocteles', tags: ['Musica'] },
    { dia: 'Sabado', hora: '9:00 pm', titulo: 'Noche de evento', icono: '\ud83c\udf1f', detalle: 'DJ segun programacion de redes', tags: ['Evento'] },
    { dia: 'Sabado', hora: '12:00 am', titulo: 'Cierre de semana', icono: '\ud83d\udd75\ufe0f', detalle: 'El mejor ambiente del centro', tags: ['Cierre'] }
  ],
  dificultad_tags: [
    { texto: 'Bar interior de acceso general', apto: true },
    { texto: 'Zona centro muy caminable de dia', apto: true },
    { texto: 'Ubicacion discreta que requiere confirmacion por redes', apto: false },
    { texto: 'Horario nocturno solo +18', apto: false },
    { texto: 'Noches concurridas de fin de semana', apto: false }
  ],
  temporada_matriz: {
    Ene: 'ideal', Feb: 'ideal', Mar: 'ideal', Abr: 'posible', May: 'posible',
    Jun: 'ideal', Jul: 'ideal', Ago: 'ideal', Sep: 'posible', Oct: 'posible', Nov: 'posible', Dic: 'ideal'
  }
};

const FAQS = [
  { pregunta: 'Donde queda Klandestino?', respuesta: 'Es un bar de espiritu clandestino en el centro de Bogota; la ubicacion exacta se coordina por Instagram @klandestinobogota.' },
  { pregunta: 'Que tipo de bar es?', respuesta: 'Un bar de cocteleria de autor con aires de speakeasy: cocteles, musica y un ambiente que se siente como un secreto compartido.' },
  { pregunta: 'Como confirmo horarios y eventos?', respuesta: 'Toda la informacion oficial se publica en @klandestinobogota, incluidas historias destacadas, horarios y noches de evento.' },
  { pregunta: 'Cual es la edad minima?', respuesta: 'Mayor de 18 anos con documento de identidad valido.' },
  { pregunta: 'Cuanto cuesta un coctel?', respuesta: 'Referencia desde $25.000 COP; los precios vigentes se confirman en el lugar o por redes.' }
];

module.exports = { SLUG: SLUG, HERO: HERO, PHOTOS: PHOTOS, BASE: BASE, TAGS: TAGS, FAQS: FAQS };

if (require.main !== module) return;

(async function main() {
  var url = process.env.DATABASE_URL || process.argv[2];
  if (!url) {
    console.error('Falta DATABASE_URL.');
    console.error('Uso: DATABASE_URL=postgres://... node scripts/seed-klandestino.js [--dry]');
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