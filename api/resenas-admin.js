// api/resenas-admin.js — Paso 16
// GET  → listar reseñas de la DB (con filtros)
// POST → aprobar (publicar), rechazar (eliminar) reseña
// Auth: Bearer exploraco12345

const { neon } = require('@neondatabase/serverless');

function auth(req) {
  return (req.headers['authorization'] || '').replace('Bearer ', '').trim()
    === (process.env.ADMIN_SECRET || 'exploraco12345');
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!auth(req)) return res.status(401).json({ ok: false, error: 'No autorizado' });

  try {
    var sql = neon(process.env.DATABASE_URL);

    // ── GET: listar reseñas ──────────────────────────────────────
    if (req.method === 'GET') {
      var limit    = Math.min(parseInt(req.query.limit)  || 50, 200);
      var offset   = Math.max(parseInt(req.query.offset) || 0, 0);
      var destSlug = req.query.slug || null;
      var minRating= req.query.min_rating ? parseFloat(req.query.min_rating) : null;

      var conds  = ["i.tipo = 'resena'"];
      var params = [];
      var pi     = 1;

      if (destSlug) {
        conds.push('d.slug = $' + pi++);
        params.push(destSlug);
      }
      if (minRating !== null) {
        conds.push('i.rating >= $' + pi++);
        params.push(minRating);
      }

      var where = conds.join(' AND ');

      var rows = await sql(
        `SELECT
           i.id,
           i.rating,
           i.texto,
           i.creado_en,
           i.xp_ganado,
           u.nombre    AS usuario_nombre,
           u.email     AS usuario_email,
           d.id        AS destino_id,
           d.slug      AS destino_slug,
           d.nombre    AS destino_nombre,
           d.ciudad    AS destino_ciudad
         FROM interacciones i
         LEFT JOIN usuarios u ON u.id = i.usuario_id
         LEFT JOIN destinos d ON d.id = i.destino_id
         WHERE ${where}
         ORDER BY i.creado_en DESC
         LIMIT $${pi} OFFSET $${pi+1}`,
        [...params, limit, offset]
      );

      var countRows = await sql(
        `SELECT COUNT(*) AS n
         FROM interacciones i
         LEFT JOIN destinos d ON d.id = i.destino_id
         WHERE ${where}`,
        params
      );

      // Stats generales
      var stats = await sql(
        `SELECT
           COUNT(*)                       AS total,
           ROUND(AVG(rating)::numeric, 2) AS rating_promedio,
           COUNT(CASE WHEN rating >= 4 THEN 1 END) AS positivas,
           COUNT(CASE WHEN rating <= 2 THEN 1 END) AS negativas
         FROM interacciones
         WHERE tipo = 'resena'`
      );

      return res.status(200).json({
        ok:    true,
        total: parseInt((countRows[0] || {}).n || 0),
        stats: stats[0] || {},
        data:  rows.map(function(r) {
          // Extraer nombre del prefijo [nombre] si no hay usuario registrado
          var texto = r.texto || '';
          var match = texto.match(/^\[([^\]]+)\]\s*/);
          var nombreExtraido = match ? match[1] : null;
          var textoLimpio    = match ? texto.slice(match[0].length) : texto;

          return {
            id:             r.id,
            rating:         r.rating ? parseFloat(r.rating) : 0,
            texto:          textoLimpio,
            fecha:          r.creado_en,
            xp:             r.xp_ganado || 0,
            usuario: {
              nombre: r.usuario_nombre || nombreExtraido || 'Anónimo',
              email:  r.usuario_email  || null,
            },
            destino: {
              id:     r.destino_id,
              slug:   r.destino_slug   || '',
              nombre: r.destino_nombre || '',
              ciudad: r.destino_ciudad || '',
            },
          };
        }),
      });
    }

    // ── DELETE: eliminar reseña ──────────────────────────────────
    if (req.method === 'DELETE') {
      var id = req.query.id || (req.body && req.body.id);
      if (!id) return res.status(400).json({ ok: false, error: 'id requerido' });

      // Obtener destino_id antes de eliminar (para recalcular rating)
      var resena = await sql(
        'SELECT destino_id FROM interacciones WHERE id=$1 LIMIT 1', [id]
      );
      if (!resena.length) return res.status(404).json({ ok: false, error: 'Reseña no encontrada' });

      var destinoId = resena[0].destino_id;

      // Eliminar
      await sql('DELETE FROM interacciones WHERE id=$1', [id]);

      // Recalcular rating del destino
      await sql(
        `UPDATE destinos SET
           rating = (
             SELECT ROUND(AVG(rating)::numeric, 2)
             FROM interacciones
             WHERE destino_id=$1 AND tipo='resena' AND rating IS NOT NULL
           ),
           total_resenas = (
             SELECT COUNT(*) FROM interacciones
             WHERE destino_id=$1 AND tipo='resena'
           ),
           actualizado_en = NOW()
         WHERE id=$1`,
        [destinoId]
      ).catch(function() {});

      return res.status(200).json({ ok: true, mensaje: 'Reseña eliminada' });
    }

    return res.status(405).json({ ok: false, error: 'Method not allowed' });

  } catch(err) {
    console.error('[resenas-admin]', err.message);
    return res.status(500).json({ ok: false, error: err.message });
  }
};
