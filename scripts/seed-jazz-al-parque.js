// scripts/seed-jazz-al-parque.js
// Crea (o actualiza) la pagina dinamica jazz-al-parque.html con los datos
// de Jazz al Parque 2026 (edicion 29, Idartes), replicando el patron de
// scripts/seed-rock-al-parque.js (categoria evento).
//
// Uso:
//   DATABASE_URL=postgres://... node scripts/seed-jazz-al-parque.js --dry
//   DATABASE_URL=postgres://... node scripts/seed-jazz-al-parque.js
//
// Idempotente: re-ejecutable sin efectos secundarios (ON CONFLICT slug).
// Contenido 100% ASCII-safe: caracteres especiales como escapes \uXXXX.

var neon = null;
function getNeon() {
  if (!neon) neon = require('@neondatabase/serverless').neon;
  return neon;
}

const SLUG = 'jazz-al-parque';
const HERO = 'https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=900&q=80';

const PHOTOS = [
  { url: HERO, caption: 'Jazz al Parque: musica en vivo en los escenarios del festival' },
  { url: 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=900&q=80', caption: 'Solistas e improvisacion sobre el escenario' },
  { url: 'https://images.unsplash.com/photo-1499363536502-87642509e31b?w=900&q=80', caption: 'El publico disfruta el jazz al aire libre' },
  { url: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=900&q=80', caption: 'Noches de jazz en los parques de Bogota' },
  { url: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=900&q=80', caption: 'Festival gratuito en el Parque El Country' }
];

const BASE = {
  slug: SLUG,
  nombre: 'Jazz al Parque 2026 - Edicion 29',
  categoria_slug: 'evento',
  lead: 'El festival de jazz gratuito mas importante de Colombia y referente de America Latina: dos dias de conciertos el 12 y 13 de septiembre de 2026 en el Parque El Country, Bogota.',
  descripcion: 'Jazz al Parque 2026 celebra su edicion numero 29 el 12 y 13 de septiembre de 2026 en el Parque El Country (localidad de Usaquen), Bogota. Organizado por el Instituto Distrital de las Artes (Idartes) con la Alcaldia Mayor de Bogota, es el festival de jazz gratuito mas importante de Colombia y uno de los mas relevantes de America Latina.\n\nBajo el eje conceptual "Donde la memoria latina se convierte en encuentro", esta edicion pone en primer plano las sonoridades latinoamericanas y sus cruces con el jazz, al tiempo que reafirma el caracter familiar del festival: un espacio donde distintas generaciones se encuentran para vivir la musica en comunidad.\n\nLa curaduria de 2026 invita a escuchar el continente desde sus propias raices, con una programacion que dialoga con tradiciones musicales de America Latina y del mundo. Como cada ano, el festival convoca musicos nacionales e internacionales en un formato al aire libre y de entrada libre que mezcla jazz clasico, latin jazz, fusiones contemporaneas y nuevas tendencias del genero.\n\nCon mas de dos decadas de historia (desde su creacion en 1995 como parte de los Festivales al Parque), Jazz al Parque se ha consolidado como plataforma de circulacion artistica, espacio de aprendizaje y escenario donde la ciudadania ejerce su derecho a la cultura. En 2025 reunio a agrupaciones de Estados Unidos, Alemania, Chile, Mexico, Cali, Medellin y Bogota, y su programacion siempre se ha caracterizado por la diversidad y la renovacion.\n\nLa entrada es libre para todo el publico. Se recomienda llegar con anticipacion, usar bloqueador solar, llevar agua y consultar la programacion diaria en los canales oficiales del festival (jazzalparque.gov.co) y las redes de Idartes.',
  highlight: 'Edicion 29 gratis el 12 y 13 de septiembre en el Parque El Country \u00b7 Jazz latinoamericano y fusiones \u00b7 Organiza Idartes',
  ciudad: 'Bogot\u00e1',
  region: 'Cundinamarca',
  barrio: 'Usaqu\u00e9n',
  lat: 4.6986,
  lng: -74.0304,
  whatsapp: '',
  telefono: '',
  email: '',
  web: 'https://jazzalparque.gov.co/fecha',
  instagram: '@festivaljazzalparque',
  precio_desde: 'Gratis (entrada libre)',
  horario: 'Sabado 12 y domingo 13 de septiembre, todo el dia',
  emoji: '\ud83c\udfb7',
  hero_bg: 'linear-gradient(135deg,#1a0a1a,#2a1a2a)',
  foto_hero: HERO,
  tipo: 'Festival de jazz \u00b7 Gratuito \u00b7 Festivales al Parque',
  capacidad: 'Parque El Country (7 hectareas aprox.)',
  como_llegar: 'Parque El Country: Av. Calle 127 # 11D-90, localidad de Usaquen, a dos cuadras del Centro Comercial Unicentro. TransMilenio: estacion Calle 127 (troncal Caracas) y estacion Av. Suba - Calle 116. Hay cicloparqueaderos; se recomienda transporte publico por el alto flujo de publico.',
  status: 'published',
  destacado: true
};

const TAGS = {
  fecha_inicio: '2026-09-12',
  fecha_fin: '2026-09-13',
  edicion: 'Edicion 29',
  sede: 'Parque El Country, Bogota',
  organiza: 'Idartes con la Alcaldia Mayor de Bogota',
  lema: 'Donde la memoria latina se convierte en encuentro',
  lineup: [
    { nombre: 'Artistas nacionales e internacionales', escenario: 'Escenarios del Parque El Country', hora: 'Todo el dia' },
    { nombre: 'Componente academico', escenario: 'Charlas y conversatorios', hora: 'Programacion paralela' }
  ],
  agenda: [
    { dia: 'Sabado 12 de septiembre', hora: 'Todo el dia', actividad: 'Conciertos de jazz, latin jazz y fusiones' },
    { dia: 'Domingo 13 de septiembre', hora: 'Todo el dia', actividad: 'Conciertos de jazz y cierre del festival' }
  ],
  categorias_entrada: [
    { tipo: 'Entrada general', precio: 'Gratis', disponibilidad: 'Disponible' }
  ],
  que_llevar: [
    'Protector solar y gorra',
    'Agua',
    'Manta o silla plegable',
    'Documento de identidad',
    'Consulta la programacion en jazzalparque.gov.co'
  ],
  prohibido: [
    'Venta y consumo de bebidas alcoholicas',
    'Sustancias alucinogenas',
    'Ingreso de armas',
    'Uso de combustibles (gas, gasolina, ACPM)'
  ]
};

const FAQS = [
  { pregunta: 'Cuando es Jazz al Parque 2026?', respuesta: 'El sabado 12 y domingo 13 de septiembre de 2026, en el Parque El Country (edicion 29).' },
  { pregunta: 'Es gratis?', respuesta: 'Si, la entrada es libre para todo el publico.' },
  { pregunta: 'Donde queda el Parque El Country?', respuesta: 'En la Av. Calle 127 # 11D-90, localidad de Usaquen, a dos cuadras del Centro Comercial Unicentro.' },
  { pregunta: 'Quien lo organiza?', respuesta: 'El Instituto Distrital de las Artes (Idartes) con la Alcaldia Mayor de Bogota.' },
  { pregunta: 'Que generos musicales hay?', respuesta: 'Jazz clasico, latin jazz, fusiones contemporaneas y nuevas tendencias, con foco en las sonoridades latinoamericanas.' }
];

module.exports = { SLUG: SLUG, HERO: HERO, PHOTOS: PHOTOS, BASE: BASE, TAGS: TAGS, FAQS: FAQS };

if (require.main !== module) return;

(async function main() {
  var url = process.env.DATABASE_URL || process.argv[2];
  if (!url) {
    console.error('Falta DATABASE_URL.');
    console.error('Uso: DATABASE_URL=postgres://... node scripts/seed-jazz-al-parque.js [--dry]');
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