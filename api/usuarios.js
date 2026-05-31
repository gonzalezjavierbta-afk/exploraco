// api/usuarios.js — Vercel Serverless Function
const { neon } = require('@neondatabase/serverless');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const sql = neon(process.env.DATABASE_URL);
    const { id, tipo, limit = '10' } = req.query;

    if (req.method === 'GET') {
      if (tipo === 'leaderboard') {
        const rows = await sql`
          SELECT id, nombre, avatar_url, perfil_tipo, xp_total, nivel,
                 badge_actual, total_resenas, total_guardados
          FROM usuarios WHERE activo = true
          ORDER BY xp_total DESC
          LIMIT ${parseInt(limit)}
        `;
        return res.json({ ok: true, data: rows });
      }
      if (id) {
        const rows = await sql`SELECT * FROM usuarios WHERE id = ${id}`;
        if (!rows.length) return res.status(404).json({ ok: false, error: 'No encontrado' });
        return res.json({ ok: true, data: rows[0] });
      }
      return res.status(400).json({ ok: false, error: 'Falta id o tipo' });
    }

    if (req.method === 'POST') {
      const { auth_id, email, nombre, avatar_url, auth_provider } = req.body || {};
      if (!auth_id || !email || !nombre) {
        return res.status(400).json({ ok: false, error: 'Faltan: auth_id, email, nombre' });
      }
      const rows = await sql`
        INSERT INTO usuarios (auth_id, email, nombre, avatar_url, auth_provider)
        VALUES (${auth_id}, ${email}, ${nombre}, ${avatar_url || null}, ${auth_provider || 'email'})
        ON CONFLICT (auth_id) DO UPDATE SET
          nombre = EXCLUDED.nombre,
          avatar_url = COALESCE(EXCLUDED.avatar_url, usuarios.avatar_url),
          ultimo_acceso = NOW()
        RETURNING *
      `;
      return res.json({ ok: true, data: rows[0] });
    }

    return res.status(405).json({ ok: false, error: 'Método no permitido' });

  } catch (err) {
    console.error('[usuarios]', err.message);
    return res.status(500).json({ ok: false, error: err.message });
  }
};
