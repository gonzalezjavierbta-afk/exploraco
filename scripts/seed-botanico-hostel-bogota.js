// scripts/seed-botanico-hostel-bogota.js
// Crea (o actualiza) la pagina dinamica botanico-hostel-bogota.html
// (categoria hostal). Patron Fase 9: seed ASCII-safe + loader API + smoke.
//
// Uso:
//   DATABASE_URL=postgres://... node scripts/seed-botanico-hostel-bogota.js --dry
//   DATABASE_URL=postgres://... node scripts/seed-botanico-hostel-bogota.js
//
// Idempotente: re-ejecutable sin efectos secundarios (ON CONFLICT slug).

var neon = null;
function getNeon() {
  if (!neon) neon = require('@neondatabase/serverless').neon;
  return neon;
}

const SLUG = 'botanico-hostel-bogota';
const HERO = 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/La_Candelaria%2C_Bogota%2C_Colombia_%285785130118%29.jpg/960px-La_Candelaria%2C_Bogota%2C_Colombia_%285785130118%29.jpg';

const PHOTOS = [
  { url: HERO, caption: 'La Candelaria, el barrio historico que rodea al Botanico Hostel' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/Calle_empedrada_La_Candelaria.jpg/800px-Calle_empedrada_La_Candelaria.jpg', caption: 'Calles empedradas del centro historico, a la vuelta del hostal' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b0/Museo-del-Oro-Fachada_%2827842494739%29.jpg/960px-Museo-del-Oro-Fachada_%2827842494739%29.jpg', caption: 'Museo del Oro a menos de 1 km caminando' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Palacio_Li%C3%A9vano%2C_Bogot%C3%A1.jpg/960px-Palacio_Li%C3%A9vano%2C_Bogot%C3%A1.jpg', caption: 'Palacio Lievano y la Avenida Jimenez, cerca del hostel' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/36/Teleferico_Monserrate.jpg/960px-Teleferico_Monserrate.jpg', caption: 'Teleferico de Monserrate, plan clasico recomendado por el staff' }
];

const BASE = {
  slug: SLUG,
  nombre: 'Botanico Hostel Bogot\u00e1',
  categoria_slug: 'hostal',
  lead: 'Casa colonial renovada en La Candelaria con jardin tropical, rooftop con vista a la ciudad y clases de yoga diarias. Desayuno incluido, bar y ambiente social ganador (9.2 sobre 10 en Hostelworld con mas de 2.300 resenas).',
  descripcion: 'Botanico Hostel abrio en julio de 2017 dentro de una casa colonial completamente renovada de La Candelaria y rapidamente se volvio un favorito de los mochileros en Bogota. Su firma es el gran jardin tropical que atraviesa la propiedad y la terraza rooftop con vistas al centro historico, espacios que funcionan como salon social al aire libre todo el dia.\n\nOfrece dormitorios compartidos con cortinas de privacidad, enchufes y lockers individuales, ademas de habitaciones privadas. Cada manana hay desayuno continental incluido y, durante el dia, clases de yoga para huespedes, una rareza bienvenida entre los hostales del centro.\n\nLa ubicacion es inmejorable para el circuito cultural: a 600 metros del Capitolio Nacional, 450 metros del Museo Botero y menos de 1 km del Museo del Oro. La recepcion funciona 24 horas, sin toque de queda, lo que lo hace comodo para quien llega en vuelos tardios.\n\nCon 9.2 sobre 10 en Hostelworld (mas de 2.300 resenas), destaca en seguridad y atencion del personal. Acepta mascotas, tiene bar, cocina compartida y sala de juegos, y su ambiente social animado lo vuelve punto de encuentro de viajeros que arman grupo para seguir recorriendo Colombia.',
  highlight: '9.2/10 con +2.300 resenas \u00b7 Jardin tropical + rooftop con vistas \u00b7 Yoga diaria \u00b7 Desayuno incluido \u00b7 Recepcion 24h sin toque de queda',
  ciudad: 'Bogot\u00e1',
  region: 'Cundinamarca',
  barrio: 'La Candelaria',
  lat: 4.5990,
  lng: -74.0714,
  whatsapp: '',
  telefono: '',
  email: '',
  web: '',
  instagram: '',
  precio_desde: 'Dorms desde $35.000; privadas desde $110.000 por noche (referencia)',
  horario: 'Check-in 15:00 - 23:00 / Check-out hasta 11:00 / Recepcion 24 h',
  emoji: '\ud83d\udecf',
  hero_bg: 'linear-gradient(135deg,#14532d,#65a30d)',
  foto_hero: HERO,
  tipo: 'Hostal \u00b7 Casa colonial con jardin \u00b7 Ambiente social',
  capacidad: 'Dormitorios compartidos y habitaciones privadas',
  como_llegar: 'Carrera 2 #9-87, La Candelaria, cerca del Parque de los Periodistas y la Biblioteca Luis Angel Arango. TransMilenio hasta Las Aguas o Museo del Oro y caminar 10 minutos.',
  status: 'published',
  destacado: true
};

const TAGS = {
  tipo_alojamiento: 'Hostal en casa colonial con jardin tropical',
  checkin: '15:00 - 23:00',
  checkout: '11:00',
  recepcion: '24 horas, sin toque de queda',
  edad_minima: '',
  mascotas: 'Si, se permiten mascotas',
  cocina_compartida: 'Si, cocina compartida equipada',
  barrio_descripcion: 'Ubicado en la parte alta de La Candelaria, cerca del Parque de los Periodistas y de la Biblioteca Luis Angel Arango (5 min a pie). El Museo Botero queda a 450 m, el Capitolio a 600 m y el Museo del Oro a 800 m. Zona transitada por estudiantes y turistas durante el dia.',
  politica_cancelacion: 'Reservando con mas de 2 dias de antelacion aplica cancelacion gratuita. Impuestos incluidos en las tarifas mostradas en Hostelworld.',
  reglas_casa: 'Check-in entre 15:00 y 23:00 / Check-out hasta las 11:00\nRecepcion 24 horas: no hay toque de queda\nNo fumar en habitaciones\nSilencio en dormitorios despues de medianoche\nSe permiten mascotas: avisar al reservar\nPago al llegar en efectivo, tarjeta de credito o debito',
  habitaciones: [
    { tipo: 'Dormitorio compartido mixto', subtitulo: 'Camas con cortina, enchufe y locker', badge: 'popular', camas: 'Compartido', precio: '$35.000' },
    { tipo: 'Dormitorio solo mujeres', subtitulo: 'Con las mismas comodidades que el mixto', badge: 'female', camas: 'Compartido', precio: '$38.000' },
    { tipo: 'Habitacion privada doble', subtitulo: 'Ideal para parejas, con servicio completo', camas: '1 doble', precio: '$110.000' }
  ],
  amenidades: ['WiFi gratis', 'Desayuno continental incluido', 'Jardin tropical', 'Terraza rooftop con vistas', 'Bar', 'Cocina compartida', 'Clases de yoga', 'Sala de juegos', 'Recepcion 24 horas', 'Guarda equipajes', 'Lavanderia', 'Acepta mascotas'],
  actividades: [
    { icono: '\ud83e\udd38', nombre: 'Yoga diaria', descripcion: 'Clases de yoga para huespedes en las zonas comunes del jardin, ideales para arrancar el dia a 2.600 m de altura.' },
    { icono: '\ud83c\udf3f', nombre: 'Vida de jardin', descripcion: 'El jardin tropical y la terraza solarium concentran desayunos, tardes de lectura y happy hours.' },
    { icono: '\ud83d\udeb6', nombre: 'Centro historico a pie', descripcion: 'Biblioteca Luis Angel Arango a 5 minutos, Museo Botero a 450 m y Plaza de Bolivar a pocas cuadras.' },
    { icono: '\ud83c\udfb6', nombre: 'Ambiente social', descripcion: 'Bar, sala de juegos y cocina compartida: el formato clasico para conocer gente antes de seguir viaje.' }
  ],
  que_incluye: ['Desayuno continental', 'WiFi gratis', 'Lockers', 'Ropa de cama', 'Mapa de la ciudad gratis', 'Guarda equipajes', 'Clases de yoga', 'Cafe'],
  transporte: [
    { icon: '\u2708', title: 'Desde el aeropuerto El Dorado', detail: 'Unos 45 min en taxi o app (16 km). El hostal coordina traslado de pago previa solicitud.' },
    { icon: '\ud83d\ude8b', title: 'TransMilenio', detail: 'Estaciones Las Aguas y Museo del Oro a menos de 15 minutos caminando.' },
    { icon: '\ud83d\udeb2', title: 'Bicicleta', detail: 'El hostal tiene parking de bicis; la cicloruta de la calle 11 pasa a unas cuadras.' }
  ],
  eventos_hostal: []
};

const FAQS = [
  { pregunta: 'Donde queda Botanico Hostel?', respuesta: 'En la carrera 2 #9-87, La Candelaria, cerca del Parque de los Periodistas y la Biblioteca Luis Angel Arango.' },
  { pregunta: 'Que incluye la estadia?', respuesta: 'Desayuno continental, WiFi, lockers, ropa de cama, guarda equipajes, mapas y acceso a las clases de yoga diarias.' },
  { pregunta: 'Tiene toque de queda?', respuesta: 'No. La recepcion funciona 24 horas y no hay restriccion de horario para entrar.' },
  { pregunta: 'Cuanto cuesta?', respuesta: 'Los dormitorios arrancan alrededor de $35.000 COP por noche y las privadas dobles desde $110.000 (precios referenciales).' },
  { pregunta: 'Aceptan mascotas?', respuesta: 'Si, el hostal admite mascotas; conviene avisar con anticipacion al reservar.' }
];

module.exports = { SLUG: SLUG, HERO: HERO, PHOTOS: PHOTOS, BASE: BASE, TAGS: TAGS, FAQS: FAQS };

if (require.main !== module) return;

(async function main() {
  var url = process.env.DATABASE_URL || process.argv[2];
  if (!url) {
    console.error('Falta DATABASE_URL.');
    console.error('Uso: DATABASE_URL=postgres://... node scripts/seed-botanico-hostel-bogota.js [--dry]');
    process.exit(1);
  }

  var sql = getNeon()(url);
  var dry = process.argv.indexOf('--dry') !== -1;

  var existing = await sql('SELECT id, slug FROM destinos WHERE slug=$1 LIMIT 1', [SLUG]);

  if (dry) {
    console.log('[dry-run] ' + (existing.length ? 'UPDATE (fila existe)' : 'INSERT (nueva fila)') + ' para slug=' + SLUG);
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
  console.log('Verifica en: https://exploraco.co/' + SLUG + '.html');
})().catch(function(err) {
  console.error('ERROR:', err.message);
  process.exit(1);
});
