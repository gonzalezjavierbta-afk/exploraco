// /api/moderar-destinos.js  v4 — schema real de Neon
// Columnas de destinos: status (varchar), destacado (boolean)

const { neon } = require('@neondatabase/serverless');

function checkAuth(req) {
  var auth = req.headers['authorization'] || '';
  return auth.replace('Bearer ','').trim() === (process.env.ADMIN_SECRET || 'exploraco12345');
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!checkAuth(req)) return res.status(401).json({ ok:false, error:'No autorizado' });

  try {
    var sql = neon(process.env.DATABASE_URL);

    // ── GET: listar por status ──
    if (req.method === 'GET') {
      var status  = req.query.status || 'pending';
      var allowed = ['pending','published','draft','rejected','archived'];
      if (!allowed.includes(status)) status = 'pending';
      var limit  = Math.min(parseInt(req.query.limit)  || 15, 100);
      var offset = Math.max(parseInt(req.query.offset) || 0,  0);

      // Usar los nombres de columna reales:
      // categoria_slug, lead (=descripcion corta), foto_hero, region, creado_en
      var rows = await sql(
        `SELECT
          d.id, d.slug, d.nombre,
          d.categoria_slug AS categoria,
          c.nombre         AS categoria_nombre,
          d.ciudad, d.region AS departamento,
          d.lead           AS descripcion_corta,
          d.foto_hero      AS foto_principal,
          d.precio_desde,
          d.lat, d.lng,
          d.status, d.destacado,
          d.creado_en      AS created_at,
          d.whatsapp, d.email, d.instagram, d.web,
          d.tags           AS detalles
         FROM destinos d
         LEFT JOIN categorias c ON c.slug = d.categoria_slug
         WHERE d.status = $1
         ORDER BY d.creado_en DESC
         LIMIT $2 OFFSET $3`,
        [status, limit, offset]
      );

      var countRows = await sql(
        'SELECT COUNT(*) AS n FROM destinos WHERE status = $1', [status]
      );

      return res.status(200).json({
        ok: true,
        status,
        total: parseInt((countRows[0]||{}).n || 0),
        items: rows
      });
    }

    // ── POST: aprobar / rechazar / pendiente ──
    if (req.method === 'POST') {
      var body   = req.body || {};
      var id     = body.id;
      var accion = body.accion;
      if (!id || !accion) return res.status(400).json({ ok:false, error:'Falta id o accion' });
      if (!['aprobar','rechazar','pendiente'].includes(accion)) {
        return res.status(400).json({ ok:false, error:'accion inválida' });
      }

      var nuevoStatus = accion==='aprobar'  ? 'published'
                      : accion==='rechazar' ? 'rejected'
                      : 'pending';

      var upd = await sql(
        `UPDATE destinos
         SET status=$1, destacado=$2, actualizado_en=NOW()
         WHERE id=$3
         RETURNING id, slug, nombre, status`,
        [nuevoStatus, Boolean(body.destacado||false), id]
      );

      if (!upd.length) return res.status(404).json({ ok:false, error:'Destino no encontrado' });

      return res.status(200).json({
        ok: true,
        mensaje: nuevoStatus==='published' ? 'Publicado en el directorio'
                : nuevoStatus==='rejected' ? 'Rechazado'
                : 'Movido a pendientes',
        destino: upd[0]
      });
    }

    return res.status(405).json({ ok:false, error:'Method not allowed' });

  } catch (err) {
    console.error('[moderar-destinos] ERROR:', err.message);
    return res.status(500).json({ ok:false, error:err.message });
  }
};
