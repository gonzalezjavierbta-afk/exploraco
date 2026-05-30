// netlify/functions/interacciones.js
const { neon } = require('@neondatabase/serverless');

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };

  try {
    const sql = neon(process.env.DATABASE_URL);
    const params = event.queryStringParameters || {};

    if (event.httpMethod === 'GET') {
      if (params.tipo === 'mapa' && params.usuario_id) {
        const rows = await sql`
          SELECT d.id, d.slug, d.nombre, d.categoria_slug, d.emoji, d.lead,
                 d.ciudad, d.lat, d.lng, d.rating, d.foto_hero, d.hero_bg,
                 i.creado_en AS guardado_en
          FROM interacciones i
          JOIN destinos d ON i.destino_id = d.id
          WHERE i.usuario_id = ${params.usuario_id} AND i.tipo = 'guardado'
          ORDER BY i.creado_en DESC
        `;
        return { statusCode: 200, headers, body: JSON.stringify({ ok: true, data: rows }) };
      }
      if (params.tipo === 'resenas' && params.destino_id) {
        const rows = await sql`
          SELECT i.id, i.rating, i.texto, i.creado_en,
                 u.nombre AS usuario_nombre, u.avatar_url AS usuario_avatar, u.badge_actual AS usuario_badge
          FROM interacciones i JOIN usuarios u ON i.usuario_id = u.id
          WHERE i.destino_id = ${params.destino_id} AND i.tipo = 'resena'
          ORDER BY i.creado_en DESC LIMIT 20
        `;
        return { statusCode: 200, headers, body: JSON.stringify({ ok: true, data: rows }) };
      }
      if (params.tipo === 'is_guardado' && params.usuario_id && params.destino_id) {
        const rows = await sql`
          SELECT 1 FROM interacciones
          WHERE usuario_id = ${params.usuario_id} AND destino_id = ${params.destino_id} AND tipo = 'guardado'
        `;
        return { statusCode: 200, headers, body: JSON.stringify({ ok: true, guardado: rows.length > 0 }) };
      }
    }

    if (event.httpMethod === 'POST') {
      const b = JSON.parse(event.body || '{}');
      const { tipo, usuario_id, destino_id } = b;
      if (!usuario_id || !destino_id || !tipo) {
        return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: 'Faltan campos' }) };
      }
      if (tipo === 'guardado') {
        const rows = await sql`
          INSERT INTO interacciones (usuario_id, destino_id, tipo)
          VALUES (${usuario_id}, ${destino_id}, 'guardado')
          ON CONFLICT (usuario_id, destino_id, tipo) DO NOTHING
          RETURNING xp_ganado
        `;
        return { statusCode: 200, headers, body: JSON.stringify({ ok: true, xp_ganado: rows[0]?.xp_ganado || 0 }) };
      }
      if (tipo === 'quitar_guardado') {
        await sql`DELETE FROM interacciones WHERE usuario_id = ${usuario_id} AND destino_id = ${destino_id} AND tipo = 'guardado'`;
        return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
      }
      if (tipo === 'resena') {
        if (!b.rating) return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: 'Rating requerido' }) };
        const rows = await sql`
          INSERT INTO interacciones (usuario_id, destino_id, tipo, rating, texto)
          VALUES (${usuario_id}, ${destino_id}, 'resena', ${b.rating}, ${b.texto || null})
          ON CONFLICT (usuario_id, destino_id, tipo) DO UPDATE SET rating = EXCLUDED.rating, texto = EXCLUDED.texto
          RETURNING xp_ganado
        `;
        return { statusCode: 200, headers, body: JSON.stringify({ ok: true, xp_ganado: rows[0]?.xp_ganado || 0 }) };
      }
    }

    return { statusCode: 405, headers, body: JSON.stringify({ ok: false, error: 'Método no permitido' }) };
  } catch (err) {
    console.error('[interacciones]', err.message);
    return { statusCode: 500, headers, body: JSON.stringify({ ok: false, error: err.message }) };
  }
};