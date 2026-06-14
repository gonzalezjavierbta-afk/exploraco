// api/diagnostico.js  v2 — temporal, eliminar después de confirmar
const { neon } = require('@neondatabase/serverless');

module.exports = async function handler(req, res) {
  if (req.query.secret !== (process.env.ADMIN_SECRET || 'exploraco12345'))
    return res.status(401).json({ error: 'No autorizado' });

  try {
    var sql = neon(process.env.DATABASE_URL);

    var tablas = await sql(`SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename`);

    // Columnas de cada tabla
    var columnas = {};
    var tablaNombres = tablas.map(function(r){ return r.tablename; });

    for (var i = 0; i < tablaNombres.length; i++) {
      var t = tablaNombres[i];
      var cols = await sql(
        `SELECT column_name, data_type, is_nullable
         FROM information_schema.columns
         WHERE table_name=$1 AND table_schema='public'
         ORDER BY ordinal_position`,
        [t]
      );
      columnas[t] = cols.map(function(c){
        return c.column_name + ':' + c.data_type + (c.is_nullable==='NO'?' NOT NULL':'');
      });
    }

    // Constraints CHECK de todas las tablas
    var constraints = await sql(`
      SELECT tc.table_name, tc.constraint_name, cc.check_clause
      FROM information_schema.table_constraints tc
      JOIN information_schema.check_constraints cc
        ON tc.constraint_name = cc.constraint_name
      WHERE tc.constraint_type = 'CHECK'
        AND tc.table_schema = 'public'
      ORDER BY tc.table_name
    `);

    // Muestra de datos de interacciones
    var interSample = await sql(
      `SELECT * FROM interacciones ORDER BY created_at DESC LIMIT 3`
    ).catch(function(e){ return [{ error: e.message }]; });

    // Muestra de usuarios
    var userSample = await sql(
      `SELECT * FROM usuarios LIMIT 2`
    ).catch(function(e){ return [{ error: e.message }]; });

    return res.status(200).json({
      ok: true,
      node_version: process.version,
      database_url_preview: (process.env.DATABASE_URL||'').slice(0,45)+'...',
      tablas: tablaNombres,
      columnas: columnas,
      constraints: constraints,
      interacciones_sample: interSample,
      usuarios_sample: userSample,
    });

  } catch(err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
};
