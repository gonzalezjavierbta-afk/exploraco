// scripts/seed-juanpis-live-show-bogota.js
// Datos de The Juanpis Live Show "Si Nos Organizamos Cabemos Todos"
// (concierto benefico agotado, Movistar Arena), categoria evento.
// Patron seed + loader + smoke de Fase 9.
//
// Uso:
//   DATABASE_URL=postgres://... node scripts/seed-juanpis-live-show-bogota.js --dry
//   DATABASE_URL=postgres://... node scripts/seed-juanpis-live-show-bogota.js
//
// Idempotente: re-ejecutable sin efectos secundarios (ON CONFLICT slug).
// Contenido 100% ASCII-safe: caracteres especiales como escapes \uXXXX.

var neon = null;
function getNeon() {
  if (!neon) neon = require('@neondatabase/serverless').neon;
  return neon;
}

const SLUG = 'juanpis-live-show-bogota';
const HERO = 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=900&q=80';

const PHOTOS = [
  { url: HERO, caption: 'Movistar Arena listo para el concierto benefico del ano' },
  { url: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=900&q=80', caption: 'Luces y produccion de gran formato' },
  { url: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=900&q=80', caption: 'El publico canta por el Choco' },
  { url: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=900&q=80', caption: 'Los artistas mas grandes de Colombia en un solo escenario' },
  { url: 'https://images.unsplash.com/photo-1531058020387-3be344556be6?w=900&q=80', caption: 'Una noche para ayudar tras el terremoto del Choco' }
];

const BASE = {
  slug: SLUG,
  nombre: 'The Juanpis Live Show en Bogot\u00e1: Si Nos Organizamos Cabemos Todos',
  categoria_slug: 'evento',
  lead: 'Alejandro Ria\u00f1o, con Juanpis Gonz\u00e1lez como anfitri\u00f3n, re\u00fane a las voces m\u00e1s grandes de Colombia en el Movistar Arena por el Choc\u00f3: un concierto ben\u00e9fico ya AGOTADO cuyo recaudo se donar\u00e1 a la Fundaci\u00f3n PLAN.',
  descripcion: 'Tras el terremoto de magnitud 7.4 que golpe\u00f3 al Choc\u00f3 el 10 de agosto, Alejandro Ria\u00f1o convoc\u00f3 una cruzada art\u00edstica sin precedentes: The Juanpis Live Show - Si Nos Organizamos Cabemos Todos. El s\u00e1bado 29 de agosto de 2026, el Movistar Arena ser\u00e1 escenario de un marat\u00f3n musical ben\u00e9fico con puertas desde las 2:00 pm y show de 4:00 pm a 11:00 pm.\n\nEl cartel re\u00fane a Juanpis Gonz\u00e1lez como anfitri\u00f3n junto a Feid, Carlos Vives, Kapo, Manuel Turizo, Mike Bah\u00eda, Santiago Cruz, Luis Alfonso, Nidia G\u00f3ngora, ChocQuibTown, Piso 21, Manuel Medrano y Monsieur Perin\u00e9. La entrada es exclusivamente para mayores de 18 a\u00f1os (PULEP PQB187).\n\nLas boletas funcionaron como zonas de donaci\u00f3n: Azul ($130.000), Roja ($230.000), Plata ($290.000) y Dorada ($330.000), vendidas por Tuboleta. Todo el recaudo ser\u00e1 entregado a la Fundaci\u00f3n PLAN para la ayuda humanitaria en el Choc\u00f3. El evento est\u00e1 AGOTADO: la organizaci\u00f3n pide no comprar a revendedores.\n\nEl evento es organizado por Ria\u00f1o Producciones y BeatHub Entertainment con apoyo de Tuboleta. Se recomienda llegar temprano por la alta afluencia en la Avenida NQS y usar TransMilenio (estaciones Camp\u00edn y U.N.).',
  highlight: 'Concierto ben\u00e9fico AGOTADO por el Choc\u00f3 \u00b7 Feid, Carlos Vives, Kapo, Manuel Turizo y m\u00e1s \u00b7 100% a la Fundaci\u00f3n PLAN',
  ciudad: 'Bogot\u00e1',
  region: 'Cundinamarca',
  barrio: 'El Camp\u00edn',
  lat: 4.6652,
  lng: -74.0839,
  whatsapp: '',
  telefono: '',
  email: '',
  web: 'https://tuboleta.com/',
  instagram: '',
  precio_desde: 'AGOTADO - Zonas de donaci\u00f3n entre $130.000 y $330.000',
  horario: 'Puertas 2:00 pm - Show 4:00 pm a 11:00 pm',
  emoji: '\ud83c\udfab',
  hero_bg: 'linear-gradient(135deg,#0a1a2a,#1a0a2a)',
  foto_hero: HERO,
  tipo: 'Concierto ben\u00e9fico \u00b7 M\u00fasica colombiana',
  capacidad: 'Movistar Arena, Bogot\u00e1',
  como_llegar: 'Movistar Arena: Avenida NQS con Avenida Jos\u00e9 Celestino Mutis, barrio El Camp\u00edn. En TransMilenio usa las estaciones Camp\u00edn o Universidad Nacional; tambi\u00e9n llegan rutas SITP por la NQS. Los parqueaderos del complejo tienen alta demanda: llega temprano.',
  status: 'published',
  destacado: true
};

const TAGS = {
  fecha_inicio: '2026-08-29',
  fecha_fin: '2026-08-29',
  edicion: 'Si Nos Organizamos Cabemos Todos',
  sede: 'Movistar Arena, Avenida NQS con Avenida Jos\u00e9 Celestino Mutis (El Camp\u00edn)',
  organiza: 'Ria\u00f1o Producciones / BeatHub Entertainment / Tuboleta',
  lema: 'Todo el recaudo va para el Choc\u00f3 a trav\u00e9s de la Fundaci\u00f3n PLAN',
  pulep: 'PQB187',
  lineup: [
    { nombre: 'Juanpis Gonz\u00e1lez (Alejandro Ria\u00f1o)', escenario: 'Anfitrion' },
    { nombre: 'Feid', escenario: 'Escenario principal' },
    { nombre: 'Carlos Vives', escenario: 'Escenario principal' },
    { nombre: 'Kapo', escenario: 'Escenario principal' },
    { nombre: 'Manuel Turizo', escenario: 'Escenario principal' },
    { nombre: 'Mike Bah\u00eda', escenario: 'Escenario principal' },
    { nombre: 'Santiago Cruz', escenario: 'Escenario principal' },
    { nombre: 'Luis Alfonso', escenario: 'Escenario principal' },
    { nombre: 'Nidia G\u00f3ngora', escenario: 'Escenario principal' },
    { nombre: 'ChocQuibTown', escenario: 'Escenario principal' },
    { nombre: 'Piso 21', escenario: 'Escenario principal' },
    { nombre: 'Manuel Medrano', escenario: 'Escenario principal' },
    { nombre: 'Monsieur Perin\u00e9', escenario: 'Escenario principal' }
  ],
  agenda: [
    { dia: 'S\u00e1bado 29 de agosto', hora: '2:00 pm', actividad: 'Apertura de puertas' },
    { dia: 'S\u00e1bado 29 de agosto', hora: '4:00 pm', actividad: 'Inicio del show ben\u00e9fico' },
    { dia: 'S\u00e1bado 29 de agosto', hora: '11:00 pm', actividad: 'Cierre del evento' }
  ],
  categorias_entrada: [
    { tipo: 'Zona Azul', precio: '$130.000 (zona de donaci\u00f3n)', disponibilidad: 'Agotado' },
    { tipo: 'Zona Roja', precio: '$230.000 (zona de donaci\u00f3n)', disponibilidad: 'Agotado' },
    { tipo: 'Zona Plata', precio: '$290.000 (zona de donaci\u00f3n)', disponibilidad: 'Agotado' },
    { tipo: 'Zona Dorada', precio: '$330.000 (zona de donaci\u00f3n)', disponibilidad: 'Agotado' }
  ],
  que_llevar: [
    'Documento con foto: evento solo para mayores de 18',
    'Entrada digital o f\u00edsica de Tuboleta',
    'Abrigo: las noches son fr\u00edas en Bogot\u00e1',
    'Hidrataci\u00f3n: el show dura siete horas'
  ],
  prohibido: [
    'Menores de 18 a\u00f1os, incluidos beb\u00e9s',
    'C\u00e1maras profesionales o de video',
    'Alimentos y bebidas externos',
    'Armas u objetos contundentes'
  ]
};

const FAQS = [
  { pregunta: '\u00bfQu\u00e9 es The Juanpis Live Show: Si Nos Organizamos Cabemos Todos?', respuesta: 'Un concierto ben\u00e9fico organizado por Alejandro Ria\u00f1o para ayudar al Choc\u00f3 tras el terremoto de magnitud 7.4 del 10 de agosto, con los artistas m\u00e1s representativos de Colombia.' },
  { pregunta: '\u00bfCu\u00e1ndo y d\u00f3nde es?', respuesta: 'S\u00e1bado 29 de agosto de 2026 en el Movistar Arena (Av. NQS con Av. Jos\u00e9 Celestino Mutis). Puertas 2:00 pm; show de 4:00 pm a 11:00 pm.' },
  { pregunta: '\u00bfD\u00f3nde consigo boletas?', respuesta: 'El evento est\u00e1 AGOTADO. Las zonas de donaci\u00f3n se vendieron por Tuboleta; la organizaci\u00f3n pide desconfiar de revendedores.' },
  { pregunta: '\u00bfA d\u00f3nde va el dinero?', respuesta: 'El 100% del recaudo de las zonas de donaci\u00f3n ser\u00e1 entregado a la Fundaci\u00f3n PLAN para la ayuda humanitaria en el Choc\u00f3.' },
  { pregunta: '\u00bfQui\u00e9nes se presentan?', respuesta: 'Juanpis Gonz\u00e1lez como anfitri\u00f3n, con Feid, Carlos Vives, Kapo, Manuel Turizo, Mike Bah\u00eda, Santiago Cruz, Luis Alfonso, Nidia G\u00f3ngora, ChocQuibTown, Piso 21, Manuel Medrano y Monsieur Perin\u00e9.' },
  { pregunta: '\u00bfHay restricci\u00f3n de edad o PULEP?', respuesta: 'Solo mayores de 18 a\u00f1os (incluidos beb\u00e9s). PULEP: PQB187.' }
];

module.exports = { SLUG: SLUG, HERO: HERO, PHOTOS: PHOTOS, BASE: BASE, TAGS: TAGS, FAQS: FAQS };

if (require.main !== module) return;

(async function main() {
  var url = process.env.DATABASE_URL || process.argv[2];
  if (!url) {
    console.error('Falta DATABASE_URL.');
    console.error('Uso: DATABASE_URL=postgres://... node scripts/seed-juanpis-live-show-bogota.js [--dry]');
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
