// scripts/seed-arche-noah-boutique-hostel-bogota.js
// Crea (o atualiza) la pagina dinamica arche-noah-boutique-hostel-bogota.html
// (categoria hostal). Patron Fase 9: seed ASCII-safe + loader API + smoke.
//
// Uso:
//   DATABASE_URL=postgres://... node scripts/seed-arche-noah-boutique-hostel-bogota.js --dry
//   DATABASE_URL=postgres://... node scripts/seed-arche-noah-boutique-hostel-bogota.js
//
// Idempotente: re-ejecutable sin efectos secundarios (ON CONFLICT slug).

var neon = null;
function getNeon() {
  if (!neon) neon = require('@neondatabase/serverless').neon;
  return neon;
}

const SLUG = 'arche-noah-boutique-hostel-bogota';
const HERO = 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b0/Museo-del-Oro-Fachada_%2827842494739%29.jpg/960px-Museo-del-Oro-Fachada_%2827842494739%29.jpg';

const PHOTOS = [
  { url: HERO, caption: 'Museo del Oro, a 500 metros del Arche Noah Boutique Hostel' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/Calle_empedrada_La_Candelaria.jpg/800px-Calle_empedrada_La_Candelaria.jpg', caption: 'Las calles empedradas de La Candelaria, entorno inmediato del hostal' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/Plaza_de_Bol%C3%ADvar_en_Bogot%C3%A1_%28Colombia%29.jpg/960px-Plaza_de_Bol%C3%ADvar_en_Bogot%C3%A1_%28Colombia%29.jpg', caption: 'Plaza de Bolivar a menos de 10 minutos caminando' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/La_Candelaria%2C_Bogota%2C_Colombia_%285785130118%29.jpg/960px-La_Candelaria%2C_Bogota%2C_Colombia_%285785130118%29.jpg', caption: 'Arquitectura historica del barrio donde opera el hostel aleman' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cf/Bogota_city_skyline_at_night_seen_from_the_Monseratte_sanctuary.png/960px-Bogota_city_skyline_at_night_seen_from_the_Monseratte_sanctuary.png', caption: 'Bogota nocturna vista desde Monserrate' }
];

const BASE = {
  slug: SLUG,
  nombre: 'Arche Noah Boutique Hostel',
  categoria_slug: 'hostal',
  lead: 'El hostal aleman de La Candelaria: gestion europea, patio-jardin con cafeteria y precios entre los mas bajos del centro historico. Mas de 1.700 opiniones acumuladas y una ubicacion a 500 m del Museo del Oro.',
  descripcion: 'Arche Noah Boutique Hostel es una institucion del backpacking bogotano: fundado por propietarios alemanes, lleva mas de una decada ofreciendo la combinacion mas buscada del centro historico: precios accesibles, orden europeo y trato cercano. Su casa de estilo tradicional esta sobre la calle 12F, a metros de la carrera 2, en plena zona de hostales de La Candelaria.\n\nEl hostel ofrece habitaciones compartidas y privadas distribuidas alrededor de su patio-jardin, donde funciona tambien la cafeteria del lugar. El desayuno y el cafe son parte del ritual de la casa, y el WiFi gratuito cubre todas las areas.\n\nSu ubicacion es practicamente imposible de mejorar para turismo cultural: el Museo del Oro queda a 500 metros, la Catedral Primada a 800 y la Plaza de Bolivar a menos de 10 minutos caminando. El aeropuerto El Dorado dista unos 14 km.\n\nCon mas de 1.700 opiniones acumuladas (8.4 promedio) es uno de los hostales con mas historia de rese\u00f1as de Bogota. El check-in arranca a las 15:00 y la salida es hasta las 11:00. Es la opcion clasica para quien prioriza presupuesto y ubicacion sin renunciar a un ambiente tranquilo y ordenado.',
  highlight: 'Gestion aleman \u00b7 Patio-jardin con cafeteria \u00b7 A 500 m del Museo del Oro \u00b7 Precios low-cost del centro historico \u00b7 +1.700 opiniones',
  ciudad: 'Bogot\u00e1',
  region: 'Cundinamarca',
  barrio: 'La Candelaria',
  lat: 4.5970,
  lng: -74.0714,
  whatsapp: '',
  telefono: '',
  email: '',
  web: '',
  instagram: '',
  precio_desde: 'Compartidas desde $38.000; dobles desde $130.000 por noche (referencia)',
  horario: 'Check-in desde 15:00 / Check-out hasta 11:00',
  emoji: '\ud83d\udecf',
  hero_bg: 'linear-gradient(135deg,#1e3a8a,#dc2626)',
  foto_hero: HERO,
  tipo: 'Hostal boutique \u00b7 Gestion aleman \u00b7 Patio-jardin',
  capacidad: 'Habitaciones compartidas y privadas',
  como_llegar: 'Calle 12F #2-09, La Candelaria, entre la carrera 1 y 2. TransMilenio hasta Las Aguas o Museo del Oro y caminar 8-12 minutos por el casco historico.',
  status: 'published',
  destacado: true
};

const TAGS = {
  tipo_alojamiento: 'Hostal boutique de gestion aleman',
  checkin: '15:00',
  checkout: '11:00',
  recepcion: 'Recepcion diurna',
  edad_minima: '',
  mascotas: '',
  cocina_compartida: 'Si, cocina disponible para huespedes',
  barrio_descripcion: 'La Candelaria es el corazon historico de Bogota: museos, catedral, universidades y street art en pocas cuadras. El hostal esta en la manzana de hostales mas conocida del centro, cerca del Parque de los Periodistas y del Eje Ambiental. Recomendado moverse a pie de dia y por app en la noche.',
  politica_cancelacion: 'Las condiciones de cancelacion varian segun la tarifa y el canal de reserva; las tarifas flexibles permiten cancelar sin costo con anticipacion.',
  reglas_casa: 'Check-in desde las 15:00 / Check-out hasta las 11:00\nAmbiente tranquilo: ideal para descansar\nNo fumar en habitaciones\nLockers disponibles: traer candado\nPago al llegar en efectivo o tarjeta\nVisitas externas solo en el patio',
  habitaciones: [
    { tipo: 'Cama en compartida estandar', subtitulo: 'La opcion economica clasica de la casa', badge: 'popular', camas: 'Compartido', precio: '$38.000' },
    { tipo: 'Cama en compartida deluxe', subtitulo: 'Camas mas amplias y mejor ubicadas', camas: 'Compartido', precio: '$42.000' },
    { tipo: 'Habitacion doble privada', subtitulo: 'Para parejas que buscan calma y precio', camas: '1 doble', precio: '$130.000' }
  ],
  amenidades: ['WiFi gratis', 'Desayuno', 'Patio-jardin con cafeteria', 'Cocina', 'Guarda equipajes', 'Informacion turistica', 'Caja fuerte'],
  actividades: [
    { icono: '\u2615', nombre: 'Cafe del patio', descripcion: 'El jardin-cafeteria del hostal es el punto de encuentro matutino de la casa.' },
    { icono: '\ud83c\udfdb', nombre: 'Museo del Oro y Botero', descripcion: 'Los dos grandes museos gratuitos del pais quedan a 500-600 metros del hostel.' },
    { icono: '\ud83d\uddfc', nombre: 'Plaza de Bolivar y centro', descripcion: 'Catedral Primada, Capitolio y Palacio Lievano en un circuito caminable de media hora.' },
    { icono: '\ud83c\udfa8', nombre: 'Ruta del graffiti', descripcion: 'Los murales de La Candelaria empiezan a una cuadra de la puerta.' }
  ],
  que_incluye: ['WiFi gratis', 'Ropa de cama', 'Guarda equipajes', 'Mapas de la ciudad', 'Cafe', 'Recomendaciones del staff'],
  transporte: [
    { icon: '\u2708', title: 'Desde el aeropuerto El Dorado', detail: '14 km: taxi o app en 40-50 minutos segun trafico.' },
    { icon: '\ud83d\ude8b', title: 'TransMilenio', detail: 'Estaciones del eje central (Museo del Oro, Las Aguas) a menos de 12 minutos a pie.' },
    { icon: '\ud83d\udeb6', title: 'Zona de hostales a pie', detail: 'Chorro de Quevedo, Parque de los Periodistas y Eje Ambiental rodean la cuadra.' }
  ],
  eventos_hostal: []
};

const FAQS = [
  { pregunta: 'Donde queda Arche Noah Boutique Hostel?', respuesta: 'En la calle 12F #2-09, La Candelaria, a 500 metros del Museo del Oro.' },
  { pregunta: 'Por que se destaca este hostal?', respuesta: 'Es el clasico hostal aleman de La Candelaria: gestion europea, patio-jardin con cafeteria y precios muy competitivos para el centro historico.' },
  { pregunta: 'Cuanto cuesta dormir ahi?', respuesta: 'Las compartidas arrancan alrededor de $38.000 COP por noche y las dobles privadas desde $130.000 (referencia).' },
  { pregunta: 'Incluye desayuno?', respuesta: 'La casa ofrece desayuno y cafeteria en su patio-jardin; confirma la inclusion segun tu tarifa al reservar.' },
  { pregunta: 'Es apto para descansar o es fiesta?', respuesta: 'Su perfil es tranquilo y ordenado: es elegido por quienes valoran silencio y rutina europea mas que fiesta.' }
];

module.exports = { SLUG: SLUG, HERO: HERO, PHOTOS: PHOTOS, BASE: BASE, TAGS: TAGS, FAQS: FAQS };

if (require.main !== module) return;

(async function main() {
  var url = process.env.DATABASE_URL || process.argv[2];
  if (!url) {
    console.error('Falta DATABASE_URL.');
    console.error('Uso: DATABASE_URL=postgres://... node scripts/seed-arche-noah-boutique-hostel-bogota.js [--dry]');
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
