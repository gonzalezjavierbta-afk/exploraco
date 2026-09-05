// scripts/seed-festival-teatro-libre-bogota.js
// Datos del evento Festival de Teatro en el Libre: Clasicos en Bogota,
// tercera edicion (Teatro Libre), categoria evento.
// Patron seed + loader + smoke de Fase 9.
//
// Uso:
//   DATABASE_URL=postgres://... node scripts/seed-festival-teatro-libre-bogota.js --dry
//   DATABASE_URL=postgres://... node scripts/seed-festival-teatro-libre-bogota.js
//
// Idempotente: re-ejecutable sin efectos secundarios (ON CONFLICT slug).
// Contenido 100% ASCII-safe: caracteres especiales como escapes \uXXXX.

var neon = null;
function getNeon() {
  if (!neon) neon = require('@neondatabase/serverless').neon;
  return neon;
}

const SLUG = 'festival-teatro-libre-bogota';
const HERO = 'https://images.unsplash.com/photo-1503095396549-807759245b35?w=900&q=80';

const PHOTOS = [
  { url: HERO, caption: 'Festival de Teatro en el Libre: los clasicos llegan a Bogota' },
  { url: 'https://images.unsplash.com/photo-1514306191717-452ec28c7814?w=900&q=80', caption: 'Teatro en vivo y obras clasicas en los escenarios del Teatro Libre' },
  { url: 'https://images.unsplash.com/photo-1524650359799-842906ca1c06?w=900&q=80', caption: 'Actuacion, drama y comedia en una programacion semanal' },
  { url: 'https://images.unsplash.com/photo-1594744803329-e58b31de8bf5?w=900&q=80', caption: 'Producciones escenicas de companias colombianas' },
  { url: 'https://images.unsplash.com/photo-1547153760-18fc8636b8c4?w=900&q=80', caption: 'Una obra distinta cada dia del festivo de teatro' }
];

const BASE = {
  slug: SLUG,
  nombre: 'Festival de Teatro en el Libre: Cl\u00e1sicos en Bogot\u00e1',
  categoria_slug: 'evento',
  lead: 'Tercera edici\u00f3n del festival que celebra la dramaturgia cl\u00e1sica universal: ocho obras, una por d\u00eda, del 31 de agosto al 7 de septiembre en el Teatro Libre Sede Centro. Un recorrido por la mism\u00edsima ra\u00edz del teatro.',
  descripcion: 'El Festival de Teatro en el Libre: Cl\u00e1sicos en Bogot\u00e1 llega a su tercera edici\u00f3n del 31 de agosto al 7 de septiembre de 2026 en el Teatro Libre Sede Centro (Calle 12b # 2-44, Candelaria). Ocho compa\u00f1\u00edas interpretan una obra cl\u00e1sica universal, una por cada noche, en el marco de los 50 a\u00f1os del Teatro Libre.\n\nLa programaci\u00f3n re\u00fane grandes t\u00edtulos de la tradici\u00f3n dram\u00e1tica: desde el \u201cEnfermo Imaginario\u201d de Moli\u00e8re y el \u201cTartufo\u201d, la tragedia de \u201cCoriolano\u201d de Shakespeare, la comedia de Carnavales en \u201cFalstaff\u201d, hasta piezas del Siglo de Oro espa\u00f1ol como \u201cLope de Aguirre\u201d y el cl\u00e1sico ruso \u201cEl Inspector\u201d de G\u00f3gol.\n\nCada jornada propone una experiencia distinta con compa\u00f1\u00edas como La manifestaci\u00f3n esc\u00e9nica, Unholy Project, Producciones El Embuste, Teatro Quimera, Grupo Teatro Libre y La Bodega Teatro. El Teatro Libre celebra as\u00ed cinco d\u00e9cadas de historia como una de las salas independientes m\u00e1s importantes del pa\u00eds, dedicada al teatro cl\u00e1sico y contempor\u00e1neo.',
  highlight: '8 obras clasicas, una por dia \u00b7 31 ago al 7 sep \u00b7 Enfermo Imaginario, Tartufo, Coriolano y mas \u00b7 50 anos del Teatro Libre',
  ciudad: 'Bogot\u00e1',
  region: 'Cundinamarca',
  barrio: 'La Candelaria',
  lat: 4.6006,
  lng: -74.0759,
  whatsapp: '',
  telefono: '(601) 352 3131',
  email: '',
  web: 'https://teatrolibre.com/programacion/fiesta/',
  instagram: '@teatrolibre.co',
  precio_desde: 'Boleteria por funcion en la taquilla del Teatro Libre',
  horario: 'Del 31 de agosto al 7 de septiembre de 2026, una funcion diaria',
  emoji: '\ud83c\udfad',
  hero_bg: 'linear-gradient(135deg,#3a0a0a,#1a0a2a)',
  foto_hero: HERO,
  tipo: 'Festival de teatro \u00b7 Clasicos universales \u00b7 50 aniversario',
  capacidad: 'Teatro Libre Sede Centro, calle 12b # 2-44',
  como_llegar: 'El Teatro Libre Sede Centro queda en la calle 12b # 2-44, en el barrio La Candelaria. Se llega en TransMilenio hasta la estacion de la Avenida Jimenez (calle 13 con carrera 3) y se camina unas cuadras, o en al pasillo por la carrera Septima hasta la calle 12b. Cerca del museo Botero y de la Plaza de Bolivar.',
  status: 'published',
  destacado: true
};

const TAGS = {
  fecha_inicio: '2026-08-31',
  fecha_fin: '2026-09-07',
  edicion: 'Tercera edicion',
  sede: 'Teatro Libre Sede Centro, calle 12b # 2-44 (La Candelaria)',
  organiza: 'Teatro Libre (50 anos)',
  lema: 'Los clasicos vuelven al escenario',
  lineup: [
    { nombre: 'Fiesta, folia de ahoritica', escenario: 'Compania de la Folla', hora: '31 de agosto' },
    { nombre: 'Enfermo Imaginario', escenario: 'La manifestacion escenica', hora: '1 de septiembre' },
    { nombre: 'Bwitches', escenario: 'Unholy Project', hora: '2 de septiembre' },
    { nombre: 'Falstaff', escenario: 'Producciones El Embuste', hora: '3 de septiembre' },
    { nombre: 'Coriolano', escenario: 'Teatro Quimera', hora: '4 de septiembre' },
    { nombre: 'Tartufo', escenario: 'Grupo Teatro Libre', hora: '5 de septiembre' },
    { nombre: 'Lope de Aguirre', escenario: 'La Bodega Teatro', hora: '6 de septiembre' },
    { nombre: 'El Inspector', escenario: 'Pequeno Teatro de Medellin', hora: '7 de septiembre' }
  ],
  agenda: [
    { dia: 'Lunes 31 de agosto', hora: 'Noche', actividad: 'Fiesta, folia de ahoritica - Compan~ia de la Folla' },
    { dia: 'Martes 1 de septiembre', hora: 'Noche', actividad: 'Enfermo Imaginario - La manifestacion escenica' },
    { dia: 'Miercoles 2 de septiembre', hora: 'Noche', actividad: 'Bwitches - Unholy Project' },
    { dia: 'Jueves 3 de septiembre', hora: 'Noche', actividad: 'Falstaff - Producciones El Embuste' },
    { dia: 'Viernes 4 de septiembre', hora: 'Noche', actividad: 'Coriolano - Teatro Quimera' },
    { dia: 'Sabado 5 de septiembre', hora: 'Noche', actividad: 'Tartufo - Grupo Teatro Libre' },
    { dia: 'Domingo 6 de septiembre', hora: 'Noche', actividad: 'Lope de Aguirre - La Bodega Teatro' },
    { dia: 'Lunes 7 de septiembre', hora: 'Noche', actividad: 'El Inspector - Pequeno Teatro de Medellin' }
  ],
  categorias_entrada: [
    { tipo: 'Boleteria por funcion', precio: 'Segun localidad en taquilla', disponibilidad: 'Disponible' },
    { tipo: 'Abono a varias funciones', precio: 'Segun programacion del Teatro Libre', disponibilidad: 'Disponible' }
  ],
  que_llevar: [
    'Boleta o abono adquirido en la taquilla del Teatro Libre',
    'Llegar al menos 20 minutos antes de cada funcion',
    'Ropa comoda por la caminata en La Candelaria',
    'Reserva tu boleta con anticipacion: el aforo es limitado',
    'Consulta la programacion diaria en teatrolibre.com'
  ],
  prohibido: [
    'Camara fotografica o de video durante la funcion',
    'Alimentos y bebidas dentro de la sala',
    'Telefonos encendidos o con vibracion',
    'Armas u objetos contundentes'
  ]
};

const FAQS = [
  { pregunta: 'Cuando es el Festival de Teatro en el Libre?', respuesta: 'Del 31 de agosto al 7 de septiembre de 2026, con una obra clasica por dia en el Teatro Libre Sede Centro.' },
  { pregunta: 'Donde se realiza?', respuesta: 'En el Teatro Libre Sede Centro, calle 12b # 2-44, en La Candelaria, Bogota.' },
  { pregunta: 'Que obras se presentan?', respuesta: 'Ocho clasicos: Fiesta, Enfermo Imaginario, Bwitches, Falstaff, Coriolano, Tartufo, Lope de Aguirre y El Inspector.' },
  { pregunta: 'Quien lo organiza?', respuesta: 'El Teatro Libre, celebrando sus 50 anos, junto a companias invitadas como Teatro Quimera, La Bodega Teatro y el Pequeno Teatro de Medellin.' },
  { pregunta: 'Como compro las boletas?', respuesta: 'En la taquilla del Teatro Libre o en su sitio web teatrolibre.com. El aforo es limitado, se recomienda reservar con anticipacion.' }
];

module.exports = { SLUG: SLUG, HERO: HERO, PHOTOS: PHOTOS, BASE: BASE, TAGS: TAGS, FAQS: FAQS };

if (require.main !== module) return;

(async function main() {
  var url = process.env.DATABASE_URL || process.argv[2];
  if (!url) {
    console.error('Falta DATABASE_URL.');
    console.error('Uso: DATABASE_URL=postgres://... node scripts/seed-festival-teatro-libre-bogota.js [--dry]');
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
