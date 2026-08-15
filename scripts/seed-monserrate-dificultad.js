// scripts/seed-monserrate-dificultad.js
// Aplica a la pagina dinamica de Monserrate los mismos datos de la
// seccion "Dificultad y epoca ideal" de Monserrate3.html (paridad).
//
// Uso:
//   DATABASE_URL=postgres://... node scripts/seed-monserrate-dificultad.js
//   DATABASE_URL=postgres://... node scripts/seed-monserrate-dificultad.js --dry
//
// Merge JSONB: solo toca dificultad/temporada, no pisa el resto de tags.
// Idempotente: se puede re-ejecutar sin efectos secundarios.
// Fuente: Monserrate3.html -> <section id="dificultad"> (lineas 1997-2049).

const { neon } = require('@neondatabase/serverless');

const SLUG = 'monserrate';

const TAGS = {
  dificultad: 'Moderado',
  dificultad_desc: 'El sendero peatonal sube 2,4 km con pendientes fuertes (600 m de desnivel). El funicular y el telef\u00e9rico son aptos para todos. La altura (3.152 m) puede causar fatiga y falta de aire.',
  dificultad_tags: [
    { texto: 'Aptos funicular y telef\u00e9rico', apto: true },
    { texto: 'Apto para ni\u00f1os', apto: true },
    { texto: 'Apto silla de ruedas (telef\u00e9rico)', apto: true },
    { texto: 'Sendero exige buen estado f\u00edsico', apto: false },
    { texto: 'La altura afecta a personas sensibles', apto: false }
  ],
  temporada_matriz: {
    Ene: 'ideal', Feb: 'ideal', Mar: 'ideal', Abr: 'posible', May: 'evitar', Jun: 'evitar',
    Jul: 'evitar', Ago: 'posible', Sep: 'posible', Oct: 'evitar', Nov: 'posible', Dic: 'ideal'
  },
  temporada_nota: 'Enero\u2013marzo y diciembre son los mejores meses: cielo despejado y visibilidad hasta 40 km. En temporada de lluvias la niebla puede tapar la vista en la cima.'
};

(async function main() {
  var url = process.env.DATABASE_URL || process.argv[2];
  if (!url) {
    console.error('Falta DATABASE_URL.');
    console.error('Uso: DATABASE_URL=postgres://... node scripts/seed-monserrate-dificultad.js [--dry]');
    process.exit(1);
  }

  var sql = neon(url);
  var dry = process.argv.indexOf('--dry') !== -1;

  var found = await sql('SELECT id, slug, nombre FROM destinos WHERE slug=$1 LIMIT 1', [SLUG]);
  if (!found.length) {
    console.error('No se encontro destino con slug=' + SLUG);
    process.exit(1);
  }
  console.log('Destino:', found[0].id, found[0].slug, found[0].nombre);

  if (dry) {
    console.log('[dry-run] tags a mergear:\n' + JSON.stringify(TAGS, null, 2));
    return;
  }

  var upd = await sql(
    "UPDATE destinos SET tags = COALESCE(tags, '{}'::jsonb) || $1::jsonb, actualizado_en = NOW() "
    + 'WHERE id = $2 RETURNING id, slug',
    [JSON.stringify(TAGS), found[0].id]
  );
  console.log('OK - tags actualizados en', upd[0].slug, '(' + upd[0].id + ')');
  console.log('Verifica en: https://exploraco.vercel.app/' + SLUG + '.html -> seccion #dificultad');
})().catch(function(err) {
  console.error('ERROR:', err.message);
  process.exit(1);
});
