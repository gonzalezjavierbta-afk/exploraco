// netlify/functions/usuarios.js
const { neon } = require('@neondatabase/serverless');

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  try {
    const sql = neon(process.env.DATABASE_URL);
    const params = event.queryStringParameters || {};

    if (event.httpMethod === 'GET') {
      if (params.tipo === 'leaderboard') {
        const rows = await sql`
          SELECT id, nombre, avatar_url, perfil_tipo, xp_total, nivel, badge_actual,
                 total_resenas, total_guardados
          FROM usuarios WHERE activo = true
          ORDER BY xp_total DESC LIMIT ${parseInt(params.limit || '10')}
        `;
        return { statusCode: 200, headers, body: JSON.stringify({ ok: true, data: rows }) };
      }
      if (params.id) {
        const rows = await sql`SELECT * FROM usuarios WHERE id = ${params.id}`;
        if (!rows.length) return { statusCode: 404, headers, body: JSON.stringify({ ok: false, error: 'No encontrado' }) };
        return { statusCode: 200, headers, body: JSON.stringify({ ok: true, data: rows[0] }) };
      }
    }

    if (event.httpMethod === 'POST') {
      const b = JSON.parse(event.body || '{}');
      if (!b.auth_id || !b.email || !b.nombre) {
        return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: 'Faltan campos' }) };
      }
      const rows = await sql`
        INSERT INTO usuarios (auth_id, email, nombre, avatar_url, auth_provider)
        VALUES (${b.auth_id}, ${b.email}, ${b.nombre}, ${b.avatar_url || null}, ${b.auth_provider || 'email'})
        ON CONFLICT (auth_id) DO UPDATE SET
          nombre = EXCLUDED.nombre,
          avatar_url = COALESCE(EXCLUDED.avatar_url, usuarios.avatar_url),
          ultimo_acceso = NOW()
        RETURNING *
      `;
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, data: rows[0] }) };
    }

    return { statusCode: 405, headers, body: JSON.stringify({ ok: false, error: 'Método no permitido' }) };
  } catch (err) {
    console.error('[usuarios]', err.message);
    return { statusCode: 500, headers, body: JSON.stringify({ ok: false, error: err.message }) };
  }
};