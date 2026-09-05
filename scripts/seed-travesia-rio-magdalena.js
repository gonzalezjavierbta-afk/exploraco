// scripts/seed-travesia-rio-magdalena.js
// Datos del evento Travesia por el Rio Magdalena 2026 (brida el rio
// navegable mas importante de Colombia con 20 embarcaciones y 5 dias de
// navegacion), categoria evento. Patron seed + loader + smoke de Fase 9.
//
// Uso:
//   DATABASE_URL=postgres://... node scripts/seed-travesia-rio-magdalena.js --dry
//   DATABASE_URL=postgres://... node scripts/seed-travesia-rio-magdalena.js
//
// Idempotente: re-ejecutable sin efectos secundarios (ON CONFLICT slug).
// Contenido 100% ASCII-safe: caracteres especiales como escapes \uXXXX.

var neon = null;
function getNeon() {
  if (!neon) neon = require('@neondatabase/serverless').neon;
  return neon;
}

const SLUG = 'travesia-rio-magdalena';
const HERO = 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=900&q=80';

const PHOTOS = [
  { url: HERO, caption: 'Travesia por el Rio Magdalena 2026: 5 dias de navegacion' },
  { url: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=900&q=80', caption: 'Recorre el rio navegable mas importante de Colombia' },
  { url: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=900&q=80', caption: 'Experiencias con las comunidades riberenas' },
  { url: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=900&q=80', caption: 'Naturaleza, fauna y paisajes del Magdalena' },
  { url: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=900&q=80', caption: 'Un viaje distinto, profundo y cambiante' }
];

const BASE = {
  slug: SLUG,
  nombre: 'Traves\u00eda por el R\u00edo Magdalena 2026',
  categoria_slug: 'evento',
  lead: 'Navega el r\u00edo m\u00e1s importante de Colombia durante 5 d\u00edas con 20 embarcaciones y encuentros con las comunidades ribere\u00f1as, del 2 al 6 de septiembre de 2026 en el brazo de Loba (Bol\u00edvar).',
  descripcion: 'La Traves\u00eda por el R\u00edo Magdalena 2026 es una expedici\u00f3n fluvial de 5 d\u00edas que parte del 2 al 6 de septiembre de 2026, recorriendo el r\u00edo navegable m\u00e1s importante de Colombia. La caravana est\u00e1 compuesta por 20 embarcaciones de madera construidas por los maestros ribere\u00f1os de Tenerife y Mompox, que navegan el brazo de Loba, en Bol\u00edvar.\n\nDurante el recorrido los participantes viven la cultura del r\u00edo, visitan pueblos como Pinillos y Hatillo de Loba, y disfrutan de presentaciones de joropo, currulao, gaita y tambora, adem\u00e1s de talleres, caminatas guiadas por la fauna y kayakismo.\n\nLa jornada t\u00edpica termina con campamentos en las riberas, fogatas y noches para contemplar las estrellas. Es una oportunidad para viajar lento, reconectarse con la naturaleza y conocer de cerca a las comunidades que viven del r\u00edo. Los interesados consultan fechas y puntos de partida en la p\u00e1gina oficial de la organizaci\u00f3n, que tambi\u00e9n considera una segunda salida del 16 al 20 de septiembre.',
  highlight: '5 d\u00edas de navegaci\u00f3n \u00b7 20 embarcaciones de madera \u00b7 Brazo de Loba (Bol\u00edvar) \u00b7 Campamentos ribere\u00f1os',
  ciudad: 'Brazo de Loba',
  region: 'Bol\u00edvar',
  barrio: 'R\u00edbera del Magdalena',
  lat: 9.0,
  lng: -74.3,
  whatsapp: '',
  telefono: '',
  email: 'info@travesiapormagdalena.com',
  web: 'https://www.travesiapormagdalena.com',
  instagram: '@travesiariomagdalena',
  precio_desde: 'Paquete por travesia (incluye embarque y campamentos)',
  horario: 'Del 2 al 6 de septiembre de 2026',
  emoji: '\u26f5',
  hero_bg: 'linear-gradient(135deg,#0a1a2a,#0a2a1a)',
  foto_hero: HERO,
  tipo: 'Expedicion fluvial \u00b7 Naturaleza \u00b7 Cultura riberena',
  capacidad: '20 embarcaciones de madera',
  como_llegar: 'La travesia navega el brazo de Loba, en Bolivar, partiendo desde la zona de Tenerife y Mompox. Los inscritos reciben los puntos exactos de encuentro y embarque al confirmar su cupo, ademas de instrucciones de logistica para llegar a las poblaciones de partida.',
  status: 'published',
  destacado: true
};

const TAGS = {
  fecha_inicio: '2026-09-02',
  fecha_fin: '2026-09-06',
  edicion: 'Edicion 2026',
  sede: 'Brazo de Loba, Bolivar',
  organiza: 'Travesia por el Rio Magdalena',
  lema: 'Viaja lento por el rio mas importante de Colombia',
  pais_invitado: 'Colombia',
  lineup: [
    { nombre: 'Presentaciones de joropo, currulao, gaita y tambora', escenario: 'Riberas del Magdalena', hora: 'Ocasos durante la travesia' },
    { nombre: 'Talleres de oficios riberenos', escenario: 'Pueblos del brazo de Loba', hora: 'Segun itinerario' },
    { nombre: 'Muestras de gastronomia de Mompox', escenario: 'Campamentos riberenos', hora: 'Noches' },
    { nombre: 'Caminatas guiadas por la fauna', escenario: 'Ribera del rio', hora: 'Mananas' },
    { nombre: 'Kayakismo por calas del Magdalena', escenario: 'Afluentes del brazo de Loba', hora: 'Tardes' }
  ],
  agenda: [
    { dia: 'Miercoles 2 de septiembre', hora: 'Partida', actividad: 'Embarque de la caravana de 20 embarcaciones y primer campamento ribereno' },
    { dia: 'Jueves 3 de septiembre', hora: 'Navegacion', actividad: 'Visita a Pinillos y talleres de oficios riberenos' },
    { dia: 'Viernes 4 de septiembre', hora: 'Navegacion', actividad: 'Hatillo de Loba, caminatas de fauna y kayakismo' },
    { dia: 'Sabado 5 de septiembre', hora: 'Navegacion', actividad: 'Presentaciones de joropo, currulao y gastronomia de Mompox' },
    { dia: 'Domingo 6 de septiembre', hora: 'Llegada', actividad: 'Retorno y cierre de la expedicion' }
  ],
  categorias_entrada: [
    { tipo: 'Paquete de travesia completa (5 dias)', precio: 'Segun cupo', disponibilidad: 'Cupos limitados' },
    { tipo: 'Segunda salida (16 al 20 de septiembre)', precio: 'Segun cupo', disponibilidad: 'Consultar' }
  ],
  que_llevar: [
    'Ropa comoda y fresca para 5 dias de navegacion',
    'Proteccion solar, gorra y repelente de insectos',
    'Capa impermeable y bolsa seca para tus pertenencias',
    'Zapatos de agua o sandalias firmes',
    'Agua reutilizable y snacks para el trayecto'
  ],
  prohibido: [
    'Contaminar el rio o dejar residuos en las riberas',
    'Materiales de un solo uso no reciclables',
    'Armas u objetos contundentes',
    'Perturbar la fauna silvestre'
  ]
};

const FAQS = [
  { pregunta: 'Cuando es la travesia?', respuesta: 'Del 2 al 6 de septiembre de 2026, con una segunda salida del 16 al 20 de septiembre.' },
  { pregunta: 'Donde se realiza?', respuesta: 'Navega el brazo de Loba, en Bolivar, partiendo desde la zona de Tenerife y Mompox.' },
  { pregunta: 'Cuantas embarcaciones hay?', respuesta: '20 embarcaciones de madera construidas por los maestros riberenos de Tenerife y Mompox.' },
  { pregunta: 'Que incluye?', respuesta: 'Embarque, campamentos riberenos, los talleres y actividades, y un cronograma guiado por las comunidades.' },
  { pregunta: 'Donde me inscribo?', respuesta: 'En la pagina oficial de Travesia por el Rio Magdalena, donde se confirman los puntos de encuentro.' }
];

module.exports = { SLUG: SLUG, HERO: HERO, PHOTOS: PHOTOS, BASE: BASE, TAGS: TAGS, FAQS: FAQS };

if (require.main !== module) return;

(async function main() {
  var url = process.env.DATABASE_URL || process.argv[2];
  if (!url) {
    console.error('Falta DATABASE_URL.');
    console.error('Uso: DATABASE_URL=postgres://... node scripts/seed-travesia-rio-magdalena.js [--dry]');
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
    + 'lat=EXCLUDED.lat, lng=EXCLUDED.lng, email=EXCLUDED.email, web=EXCLUDED.web, instagram=EXCLUDED.instagram, '
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
