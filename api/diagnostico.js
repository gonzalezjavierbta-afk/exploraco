// /api/diagnostico.js
// TEMPORAL — eliminar después de confirmar que todo funciona
// Visitar: https://exploraco.vercel.app/api/diagnostico
// Auth: ?secret=exploraco12345

module.exports = async function handler(req, res) {
  if (req.query.secret !== (process.env.ADMIN_SECRET || 'exploraco12345')) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  var results = {
    node_version: process.version,
    database_url_set: !!process.env.DATABASE_URL,
    database_url_preview: process.env.DATABASE_URL ? process.env.DATABASE_URL.slice(0,40)+'...' : null,
    admin_secret_set: !!process.env.ADMIN_SECRET,
  };

  // Test @neondatabase/serverless
  try {
    var neonMod = require('@neondatabase/serverless');
    results.neon_module = 'disponible';
    try {
      var sql = neonMod.neon(process.env.DATABASE_URL);
      var r = await sql('SELECT 1 AS ok');
      results.neon_connection = 'OK — ' + JSON.stringify(r[0] || r.rows && r.rows[0]);
    } catch(e) {
      results.neon_connection = 'FALLO: ' + e.message;
    }
  } catch(e) {
    results.neon_module = 'NO disponible: ' + e.message;
  }

  // Test pg
  try {
    var pg = require('pg');
    results.pg_module = 'disponible';
    try {
      var pool = new pg.Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
        max: 1, connectionTimeoutMillis: 8000,
      });
      var client = await pool.connect();
      var r2 = await client.query('SELECT 1 AS ok');
      client.release();
      results.pg_connection = 'OK — ' + JSON.stringify(r2.rows[0]);
    } catch(e) {
      results.pg_connection = 'FALLO: ' + e.message;
    }
  } catch(e) {
    results.pg_module = 'NO disponible: ' + e.message;
  }

  // Test tablas
  try {
    var nM = require('@neondatabase/serverless');
    var sql2 = nM.neon(process.env.DATABASE_URL);
    var tablas = await sql2('SELECT tablename FROM pg_tables WHERE schemaname=$1 ORDER BY tablename', ['public']);
    results.tablas = (Array.isArray(tablas) ? tablas : tablas.rows).map(function(r){ return r.tablename; });

    // Verificar columnas de destinos
    var cols = await sql2("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='destinos' ORDER BY ordinal_position");
    results.destinos_columnas = (Array.isArray(cols) ? cols : cols.rows).map(function(c){ return c.column_name+':'+c.data_type; });

    // Contar categorias
    var cats = await sql2('SELECT id, slug, nombre FROM categorias ORDER BY id');
    results.categorias = Array.isArray(cats) ? cats : cats.rows;

  } catch(e) {
    results.tablas_error = e.message;
  }

  return res.status(200).json(results);
};
