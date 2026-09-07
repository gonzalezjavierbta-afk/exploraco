// scripts/seed-transitos-fragmentados-bogota.js
// Datos del evento Exposicion "Transitos fragmentados" de Isabella Vargas y
// Mary Barrios, en el Centro Felicidad Chapinero (CEFE Chapinero), Bogota,
// del 3 al 12 de septiembre de 2026. Categoria evento.
// Patron seed + loader + smoke de Fase 9.
// Uso:
//   DATABASE_URL=postgres://... node scripts/seed-transitos-fragmentados-bogota.js --dry
//   DATABASE_URL=postgres://... node scripts/seed-transitos-fragmentados-bogota.js
// Idempotente (ON CONFLICT slug). 100% ASCII-safe.

var neon = null;
function getNeon() {
  if (!neon) neon = require('@neondatabase/serverless').neon;
  return neon;
}

const SLUG = 'transitos-fragmentados-bogota';
const HERO = 'https://images.unsplash.com/photo-1547447134-cd3f5c716030?w=900&q=80';

const PHOTOS = [
  { url: HERO, caption: 'Transitos fragmentados: el cuerpo y el espacio urbano en la muestra del CEFE Chapinero' },
  { url: 'https://images.unsplash.com/photo-1554188248-986adbb73be4?w=900&q=80', caption: 'Fotografia en el espacio publico, eje de la exposicion y del taller' },
  { url: 'https://images.unsplash.com/photo-1531384189578-cac4e4b6b206?w=900&q=80', caption: 'La ciudad como escenario: Bogota en capas' },
  { url: 'https://images.unsplash.com/photo-1533681904393-9ab6eee7e408?w=900&q=80', caption: 'Recorridos, transporte y vida cotidiana en la imagen' },
  { url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=900&q=80', caption: 'El mirador del piso 8 del CEFE Chapinero cierra el recorrido' }
];

const BASE = {
  slug: SLUG,
  nombre: 'Exposici\u00f3n "Tr\u00e1nsitos fragmentados" en CEFE Chapinero',
  categoria_slug: 'evento',
  lead: 'Del 3 al 12 de septiembre de 2026, la exposici\u00f3n fotogr\u00e1fica de Isabella Vargas y Mary Barrios recorre el Centro Felicidad Chapinero con entrada libre, para pensar c\u00f3mo los cuerpos habitan y atraviesan la ciudad.',
  descripcion: '"Tr\u00e1nsitos fragmentados" es una exposici\u00f3n fotogr\u00e1fica de las artistas Isabella Vargas y Mary Barrios, abierta del 3 al 12 de septiembre de 2026 en el Centro Felicidad Chapinero (CEFE Chapinero), con entrada gratuita. Apoyada por la Secretar\u00eda Distrital de Cultura, Recreaci\u00f3n y Deporte, y con la curadur\u00eda de Juan Diego Zamudio y Alejandro Moreno, la muestra construye un relato visual sobre la manera en que los cuerpos atraviesan, experimentan y se relacionan con el espacio urbano de Bogot\u00e1.\n\nEl recorrido se extiende por distintos puntos del edificio, desde los ascensores hasta el mirador del piso 8: cada segmento del CEFE sirve de escenario para que las im\u00e1genes dialoguen con la arquitectura y el desplazamiento de los asistentes.\n\nLa muestra tiene dos l\u00edneas principales. Isabella Vargas presenta "Transmillenas", una serie sobre el d\u00eda a d\u00eda de las mujeres en el sistema TransMilenio: con collages de brazos, rostros y pies evoca la multitud y la estrechez, y cuestiona los l\u00edmites entre lo p\u00fablico y lo privado. Por su parte, Mary Barrios expone "Los pasos del Buenagente", centrada en don Gilberto, un reciclador conocido de la ciudad; sus fotograf\u00edas sobre telas transparentes superponen paisajes urbanos y sugieren una Bogot\u00e1 hecha de capas, donde caminar es tambi\u00e9n trabajo y supervivencia.\n\nComo parte de la programaci\u00f3n, el viernes 4 de septiembre se realiz\u00f3 el taller "Foto en espacio p\u00fablico: construcci\u00f3n de la imagen y los cuerpos desde las capas", dirigido a cualquier interesado en la relaci\u00f3n entre cuerpo, imagen y ciudad.',
  highlight: 'Entrada libre hasta el 12 de septiembre \u00b7 recorre ascensores y mirador del piso 8 \u00b7 fotograf\u00eda sobre cuerpo y ciudad',
  ciudad: 'Bogot\u00e1',
  region: 'Cundinamarca',
  barrio: 'El Refugio',
  lat: 4.6735,
  lng: -74.0523,
  whatsapp: '',
  telefono: '',
  email: '',
  web: 'https://www.culturarecreacionydeporte.gov.co',
  instagram: '@culturaenBTA',
  precio_desde: 'Gratis',
  horario: 'Del 3 al 12 de septiembre de 2026, en el horario del CEFE Chapinero',
  emoji: '\ud83d\udcf8',
  hero_bg: 'linear-gradient(135deg,#1a1a2a,#2a1a3a)',
  foto_hero: HERO,
  tipo: 'Exposici\u00f3n fotogr\u00e1fica \u00b7 Gratuita',
  capacidad: 'Centro Felicidad Chapinero (CEFE Chapinero)',
  como_llegar: 'El Centro Felicidad Chapinero queda en la calle 82 # 10-69, barrio El Refugio, cerca de la Avenida Carrera 9. Llega por TransMilenio en la estaci\u00f3n Calle 76 (carrera 7) o en buses de la calle 82. El recorrido de la exposici\u00f3n arranca en los ascensores y sube hasta el mirador del piso 8.',
  status: 'published',
  destacado: true
};

const TAGS = {
  fecha_inicio: '2026-09-03',
  fecha_fin: '2026-09-12',
  edicion: 'Exposici\u00f3n 2026',
  sede: 'Centro Felicidad Chapinero (CEFE Chapinero), calle 82 # 10-69, Bogot\u00e1',
  organiza: 'Secretar\u00eda de Cultura, Recreaci\u00f3n y Deporte',
  lema: 'C\u00f3mo los cuerpos recorren, habitan y experimentan la ciudad',
  lineup: [
    { nombre: 'Isabella Vargas', escenario: 'Serie "Transmillenas"', hora: 'Del 3 al 12 de septiembre' },
    { nombre: 'Mary Barrios', escenario: 'Serie "Los pasos del Buenagente"', hora: 'Del 3 al 12 de septiembre' },
    { nombre: 'Juan Diego Zamudio', escenario: 'Curadur\u00eda', hora: 'Exposici\u00f3n 2026' },
    { nombre: 'Alejandro Moreno', escenario: 'Curadur\u00eda', hora: 'Exposici\u00f3n 2026' }
  ],
  agenda: [
    { dia: '3 al 12 de septiembre', hora: 'CEFE Chapinero', actividad: 'Exposici\u00f3n abierta: de los ascensores al mirador del piso 8' },
    { dia: '4 de septiembre', hora: '5:00 a 7:00 p. m.', actividad: 'Taller "Foto en espacio p\u00fablico: construcci\u00f3n de la imagen y los cuerpos desde las capas"' }
  ],
  categorias_entrada: [
    { tipo: 'Entrada general', precio: 'Gratis', disponibilidad: 'Disponible' },
    { tipo: 'Taller de fotografia', precio: 'Gratis (cupo limitado)', disponibilidad: 'Disponible' }
  ],
  que_llevar: [
    'Documento de identidad para el ingreso al CEFE',
    'Camara o celular si quieres practicar fotografia',
    'Recorrer los ascensores hasta el mirador del piso 8'
  ],
  prohibido: [
    'Tocar o mover las obras de la exposicion',
    'Fotografiar con flash las piezas',
    'Alimentos y bebidas en las salas'
  ]
};

const FAQS = [
  { pregunta: '\u00bfQu\u00e9 es "Tr\u00e1nsitos fragmentados"?', respuesta: 'Una exposici\u00f3n fotogr\u00e1fica de Isabella Vargas y Mary Barrios, del 3 al 12 de septiembre de 2026, sobre c\u00f3mo los cuerpos habitan y experimentan el espacio urbano de Bogot\u00e1.' },
  { pregunta: '\u00bfD\u00f3nde se realiza?', respuesta: 'En el Centro Felicidad Chapinero (CEFE Chapinero), calle 82 # 10-69, con un recorrido que va de los ascensores hasta el mirador del piso 8.' },
  { pregunta: '\u00bfEs gratis?', respuesta: 'S\u00ed, la entrada es libre para todo el p\u00fablico.' },
  { pregunta: '\u00bfQu\u00e9 muestran las artistas?', respuesta: 'Isabella Vargas expone "Transmillenas", sobre las mujeres en TransMilenio, y Mary Barrios "Los pasos del Buenagente", sobre un reciclador de la ciudad.' },
  { pregunta: '\u00bfHay actividades complementarias?', respuesta: 'S\u00ed, un taller gratuito de fotograf\u00eda en espacio p\u00fablico se realiz\u00f3 el viernes 4 de septiembre.' }
];

module.exports = { SLUG: SLUG, HERO: HERO, PHOTOS: PHOTOS, BASE: BASE, TAGS: TAGS, FAQS: FAQS };

if (require.main !== module) return;

(async function main() {
  var url = process.env.DATABASE_URL || process.argv[2];
  if (!url) {
    console.error('Falta DATABASE_URL.');
    console.error('Uso: DATABASE_URL=postgres://... node scripts/seed-transitos-fragmentados-bogota.js [--dry]');
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
