// api/interacciones.js — Vercel Serverless Function
const { neon } = require('@neondatabase/serverless');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const sql = neon(process.env.DATABASE_URL);
    const { tipo, usuario_id, destino_id, limit = '20' } = req.query;

    if (req.method === 'GET') {
      if (tipo === 'mapa' && usuario_id) {
        const rows = await sql`
          SELECT d.id, d.slug, d.nombre, d.categoria_slug, d.emoji, d.lead,
                 d.ciudad, d.lat, d.lng, d.rating, d.foto_hero, d.hero_bg,
                 i.creado_en AS guardado_en
          FROM interacciones i
          JOIN destinos d ON i.destino_id = d.id
          WHERE i.usuario_id = ${usuario_id}
            AND i.tipo = 'guardado'
            AND d.status = 'published'
          ORDER BY i.creado_en DESC
        `;
        return res.json({ ok: true, data: rows });
      }
      if (tipo === 'resenas' && destino_id) {
        const rows = await sql`
          SELECT i.id, i.rating, i.texto, i.creado_en,
                 u.nombre AS usuario_nombre,
                 u.avatar_url AS usuario_avatar,
                 u.badge_actual AS usuario_badge
          FROM interacciones i
          JOIN usuarios u ON i.usuario_id = u.id
          WHERE i.destino_id = ${destino_id} AND i.tipo = 'resena'
          ORDER BY i.creado_en DESC
          LIMIT ${parseInt(limit)}
        `;
        return res.json({ ok: true, data: rows });
      }
      if (tipo === 'is_guardado' && usuario_id && destino_id) {
        const rows = await sql`
          SELECT 1 FROM interacciones
          WHERE usuario_id = ${usuario_id}
            AND destino_id = ${destino_id}
            AND tipo = 'guardado'
        `;
        return res.json({ ok: true, guardado: rows.length > 0 });
      }
      return res.status(400).json({ ok: false, error: 'Parámetros inválidos' });
    }

    if (req.method === 'POST') {
      const { tipo: tipoBody, usuario_id: uid, destino_id: did, rating, texto } = req.body || {};
      if (!uid || !did || !tipoBody) {
        return res.status(400).json({ ok: false, error: 'Faltan: tipo, usuario_id, destino_id' });
      }
      if (tipoBody === 'guardado') {
        const rows = await sql`
          INSERT INTO interacciones (usuario_id, destino_id, tipo)
          VALUES (${uid}, ${did}, 'guardado')
          ON CONFLICT (usuario_id, destino_id, tipo) DO NOTHING
          RETURNING xp_ganado
        `;
        return res.json({ ok: true, xp_ganado: rows[0]?.xp_ganado || 0 });
      }
      if (tipoBody === 'quitar_guardado') {
        await sql`
          DELETE FROM interacciones
          WHERE usuario_id = ${uid} AND destino_id = ${did} AND tipo = 'guardado'
        `;
        return res.json({ ok: true });
      }
      if (tipoBody === 'resena') {
        if (!rating) return res.status(400).json({ ok: false, error: 'Rating requerido (1-5)' });
        const rows = await sql`
          INSERT INTO interacciones (usuario_id, destino_id, tipo, rating, texto)
          VALUES (${uid}, ${did}, 'resena', ${rating}, ${texto || null})
          ON CONFLICT (usuario_id, destino_id, tipo) DO UPDATE
            SET rating = EXCLUDED.rating, texto = EXCLUDED.texto
          RETURNING xp_ganado
        `;
        return res.json({ ok: true, xp_ganado: rows[0]?.xp_ganado || 0 });
      }
    }

    return res.status(405).json({ ok: false, error: 'Método no permitido' });

  } catch (err) {
    console.error('[interacciones]', err.message);
    return res.status(500).json({ ok: false, error: err.message });
  }
};
