// scripts/seed-monserrate-entradas.js
// Aplica a la pagina dinamica de Monserrate las tarifas 2025 verificadas
// de la seccion "Entradas y precios" (tabla tags.entradas).
//
// Fuentes: monserrate.co/es/horarios-y-tarifas, bogota.gov.co,
// Caracol Radio (abr-2025). Links directos al sitio oficial.
//
// Uso:
//   DATABASE_URL=postgres://... node scripts/seed-monserrate-entradas.js
//   DATABASE_URL=postgres://... node scripts/seed-monserrate-entradas.js --dry
//
// Merge JSONB: reemplaza SOLO la clave tags.entradas, no pisa el resto.
// Idempotente: se puede re-ejecutar sin efectos secundarios.

const { neon } = require('@neondatabase/serverless');

const SLUG = 'monserrate';
const LINK = 'https://monserrate.co/es/horarios-y-tarifas/';

const ENTRADAS = [
  { tipo: 'Ida y regreso (L\u2013S y festivos)', precio: '32000', incluye: 'Funicular o telef\u00e9rico, ida y vuelta', link: LINK },
  { tipo: 'Ida y regreso (Domingos)', precio: '19000', incluye: 'Funicular o telef\u00e9rico, ida y vuelta', link: LINK },
  { tipo: 'Un solo trayecto (L\u2013S)', precio: '19000', incluye: 'Subida o bajada', link: LINK },
  { tipo: 'Un solo trayecto (Domingos)', precio: '11000', incluye: 'Subida o bajada', link: LINK },
  { tipo: 'Adulto mayor 62+ (L\u2013S)', precio: '27000', incluye: 'Ida y regreso con c\u00e9dula', link: LINK },
  { tipo: 'Adulto mayor 62+ (Domingos)', precio: '15000', incluye: 'Ida y regreso con c\u00e9dula', link: LINK },
  { tipo: 'Fast Pass', precio: '87500', incluye: 'Acceso prioritario sin fila', link: LINK },
  { tipo: 'Grupos adultos (20+)', precio: '27000', incluye: 'Ida y regreso por persona, reserva previa', link: LINK },
  { tipo: 'Grupos colegios (20+)', precio: '19000', incluye: 'Ida y regreso por estudiante, reserva previa', link: LINK },
  { tipo: 'Deportistas (5:30\u20139:00 L\u2013S)', precio: '10500', incluye: 'Solo descenso, no festivos, requiere tarjeta', link: LINK },
  { tipo: 'Mascotas (L\u2013S)', precio: '11500', incluye: 'Ida y regreso en guacal, no domingos ni temporadas altas', link: LINK },
  { tipo: 'Art\u00edculo personal adicional', precio: '7500', incluye: 'Bulto extra', link: LINK },
  { tipo: 'Sendero Paramuno 3h (general)', precio: '77000', incluye: 'Ingreso + guianza + seguro, requiere reserva', link: LINK },
  { tipo: 'Sendero Paramuno 3h (residente)', precio: '34500', incluye: 'Ingreso + guianza, c\u00e9dula colombiana', link: LINK },
  { tipo: 'Sendero Paramuno extendido 3+ h (general)', precio: '91000', incluye: 'Ingreso + guianza + seguro, requiere reserva', link: LINK },
  { tipo: 'Sendero Paramuno extendido 3+ h (residente)', precio: '49500', incluye: 'Ingreso + guianza, c\u00e9dula colombiana', link: LINK }
];

(async function main() {
  var url = process.env.DATABASE_URL || process.argv[2];
  if (!url) {
    console.error('Falta DATABASE_URL.');
    console.error('Uso: DATABASE_URL=postgres://... node scripts/seed-monserrate-entradas.js [--dry]');
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

  var payload = JSON.stringify({ entradas: ENTRADAS });

  if (dry) {
    console.log('[dry-run] tags.entradas (' + ENTRADAS.length + ' filas):\n' + JSON.stringify(ENTRADAS, null, 2));
    return;
  }

  var upd = await sql(
    "UPDATE destinos SET tags = COALESCE(tags, '{}'::jsonb) || $1::jsonb, actualizado_en = NOW() "
    + 'WHERE id = $2 RETURNING id, slug',
    [payload, found[0].id]
  );
  console.log('OK - tags.entradas actualizado (' + ENTRADAS.length + ' filas) en', upd[0].slug, '(' + upd[0].id + ')');
  console.log('Verifica en: https://exploraco.vercel.app/' + SLUG + '.html -> seccion #entradas');
})().catch(function(err) {
  console.error('ERROR:', err.message);
  process.exit(1);
});
