// /api/moderar-destinos.js
// Lista solicitudes pendientes y permite aprobar/rechazar
// Auth: Bearer exploraco12345 — CommonJS, mismo patrón que admin-destinos.js

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 1,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 10000,
});

function checkAuth(req) {
  var auth = req.headers['authorization'] || '';
  var token = auth.replace('Bearer ', '').trim();
  return token === (process.env.ADMIN_SECRET || 'exploraco12345');
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (!checkAuth(req)) {
    return res.status(401).json({ ok: false, error: 'No autorizado' });
  }

  var client;
  try {
    client = await pool.connect();

    // ── GET: listar por status ──
    if (req.method === 'GET') {
      var status = req.query.status || 'pending';
      var limit  = Math.min(parseInt(req.query.limit)  || 15, 100);
      var offset = parseInt(req.query.offset) || 0;

      // Validar status permitidos
      if (!['pending','published','draft','rejected','archived'].includes(status)) {
        return res.status(400).json({ ok: false, error: 'status inválido' });
      }

      var rows = await client.query(
        `SELECT
          d.id, d.slug, d.nombre, d.ciudad, d.departamento,
          d.descripcion_corta, d.foto_principal, d.precio_desde,
          d.lat, d.lng, d.status, d.destacado, d.created_at,
          c.slug  AS categoria,
          c.nombre AS categoria_nombre,
          dd.datos AS detalles
        FROM destinos d
        LEFT JOIN categorias c  ON d.categoria_id = c.id
        LEFT JOIN destinos_detalles dd ON dd.destino_id = d.id
        WHERE d.status = $1
        ORDER BY d.created_at DESC
        LIMIT $2 OFFSET $3`,
        [status, limit, offset]
      );

      var totalRes = await client.query(
        'SELECT COUNT(*) AS n FROM destinos WHERE status = $1',
        [status]
      );

      return res.status(200).json({
        ok: true,
        status: status,
        total: parseInt(totalRes.rows[0].n || 0),
        items: rows.rows
      });
    }

    // ── POST: aprobar / rechazar / pendiente ──
    if (req.method === 'POST') {
      var body   = req.body || {};
      var id     = body.id;
      var accion = body.accion;
      var destacado = body.destacado || false;

      if (!id || !accion) {
        return res.status(400).json({ ok: false, error: 'Falta id o accion' });
      }
      if (!['aprobar','rechazar','pendiente'].includes(accion)) {
        return res.status(400).json({ ok: false, error: 'accion debe ser: aprobar, rechazar, pendiente' });
      }

      var nuevoStatus = accion === 'aprobar'   ? 'published'
                       : accion === 'rechazar' ? 'rejected'
                       : 'pending';

      var upd = await client.query(
        `UPDATE destinos
         SET status = $1, destacado = $2
         WHERE id = $3
         RETURNING id, slug, nombre, status`,
        [nuevoStatus, Boolean(destacado), id]
      );

      if (upd.rows.length === 0) {
        return res.status(404).json({ ok: false, error: 'Destino no encontrado' });
      }

      return res.status(200).json({
        ok: true,
        mensaje: nuevoStatus === 'published' ? 'Publicado en el directorio'
                : nuevoStatus === 'rejected' ? 'Solicitud rechazada'
                : 'Movido a pendientes',
        destino: upd.rows[0]
      });
    }

    return res.status(405).json({ ok: false, error: 'Method not allowed' });

  } catch (err) {
    console.error('[moderar-destinos] Error:', err.message);
    return res.status(500).json({
      ok: false,
      error: 'Error interno del servidor',
      detalle: err.message
    });
  } finally {
    if (client) client.release();
  }
};
