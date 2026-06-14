// api/moderar-destinos.js
// GET  → lista destinos por status (pending/published/rejected)
// POST → aprueba, rechaza o vuelve a pending

const { neon } = require('@neondatabase/serverless');

function auth(req) {
  return (req.headers['authorization']||'').replace('Bearer ','').trim()
      === (process.env.ADMIN_SECRET||'exploraco12345');
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!auth(req)) return res.status(401).json({ ok:false, error:'No autorizado' });

  try {
    var sql = neon(process.env.DATABASE_URL);

    // ── GET ──────────────────────────────────────────────────────
    if (req.method === 'GET') {
      var status  = req.query.status || 'draft';
      var allowed = ['draft','published','archived'];
      if (!allowed.includes(status)) status = 'draft';
      var limit  = Math.min(parseInt(req.query.limit)  || 15, 100);
      var offset = Math.max(parseInt(req.query.offset) || 0,  0);

      var rows = await sql(
        `SELECT
           d.id, d.slug, d.nombre,
           d.categoria_slug                AS categoria,
           c.nombre                        AS categoria_nombre,
           d.ciudad,
           d.region                        AS departamento,
           d.lead                          AS descripcion_corta,
           d.foto_hero                     AS foto_principal,
           d.precio_desde,
           d.lat, d.lng,
           d.status, d.destacado,
           d.creado_en                     AS created_at,
           d.whatsapp, d.email, d.web, d.instagram,
           d.tags                          AS detalles
         FROM destinos d
         LEFT JOIN categorias c ON c.slug = d.categoria_slug
         WHERE d.status = $1
         ORDER BY d.creado_en DESC
         LIMIT $2 OFFSET $3`,
        [status, limit, offset]
      );

      var total = await sql(
        'SELECT COUNT(*) AS n FROM destinos WHERE status=$1', [status]
      );

      return res.status(200).json({
        ok: true, status,
        total: parseInt((total[0]||{}).n || 0),
        items: rows,
      });
    }

    // ── POST ─────────────────────────────────────────────────────
    if (req.method === 'POST') {
      var body = req.body||{};
      if (!body.id || !body.accion)
        return res.status(400).json({ ok:false, error:'Falta id o accion' });

      // Solo los 3 valores que acepta el CHECK CONSTRAINT de la tabla
      var acciones = { aprobar:'published', rechazar:'archived', pendiente:'draft' };
      if (!acciones[body.accion])
        return res.status(400).json({ ok:false, error:'accion debe ser: aprobar, rechazar, pendiente' });

      var nuevoStatus = acciones[body.accion];

      var upd = await sql(
        `UPDATE destinos
         SET status=$1, destacado=$2, actualizado_en=NOW()
         WHERE id=$3
         RETURNING id, slug, nombre, status`,
        [nuevoStatus, Boolean(body.destacado||false), body.id]
      );

      if (!upd.length)
        return res.status(404).json({ ok:false, error:'Destino no encontrado' });

      var msgs = {
        published: '✅ Publicado — ya aparece en el directorio y en el mapa',
        archived:  '🗄️ Archivado',
        draft:     '⏳ Movido a borradores',
      };

      return res.status(200).json({
        ok: true,
        mensaje: msgs[nuevoStatus],
        url: nuevoStatus === 'published'
          ? 'https://exploraco.vercel.app/' + upd[0].slug + '.html'
          : null,
        destino: upd[0],
      });
    }

    return res.status(405).json({ ok:false, error:'Method not allowed' });

  } catch(err) {
    console.error('[moderar-destinos]', err.message);
    return res.status(500).json({ ok:false, error:err.message });
  }
};
