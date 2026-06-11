// /api/moderar-destinos.js  v3
// CommonJS — auto-detecta driver neon o pg igual que publicar-lugar.js

var DATABASE_URL = process.env.DATABASE_URL;

async function getClient() {
  try {
    var neonMod = require('@neondatabase/serverless');
    var sql = neonMod.neon(DATABASE_URL);
    return { type: 'neon', sql: sql };
  } catch (e1) {
    try {
      var pg = require('pg');
      var pool = new pg.Pool({
        connectionString: DATABASE_URL,
        ssl: { rejectUnauthorized: false },
        max: 1, connectionTimeoutMillis: 10000,
      });
      var client = await pool.connect();
      return { type: 'pg', client: client };
    } catch (e2) {
      throw new Error('No DB driver: ' + e1.message + ' / ' + e2.message);
    }
  }
}

async function query(db, sql, params) {
  if (db.type === 'neon') {
    var r = await db.sql(sql, params);
    return Array.isArray(r) ? r : (r.rows || []);
  }
  var r = await db.client.query(sql, params);
  return r.rows;
}

function releaseDB(db) {
  try { if (db && db.type === 'pg' && db.client) db.client.release(); } catch(e) {}
}

function checkAuth(req) {
  var auth = req.headers['authorization'] || '';
  return auth.replace('Bearer ', '').trim() === (process.env.ADMIN_SECRET || 'exploraco12345');
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!checkAuth(req)) return res.status(401).json({ ok: false, error: 'No autorizado' });

  var db;
  try {
    db = await getClient();

    // ── GET: listar por status ──
    if (req.method === 'GET') {
      var status = req.query.status || 'pending';
      var allowed = ['pending','published','draft','rejected','archived'];
      if (!allowed.includes(status)) status = 'pending';
      var limit  = Math.min(parseInt(req.query.limit)  || 15, 100);
      var offset = Math.max(parseInt(req.query.offset) || 0,  0);

      var rows = await query(db,
        `SELECT d.id, d.slug, d.nombre, d.ciudad, d.departamento,
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

      var countRows = await query(db,
        'SELECT COUNT(*) AS n FROM destinos WHERE status = $1', [status]
      );

      return res.status(200).json({
        ok: true, status,
        total: parseInt((countRows[0] || {}).n || 0),
        items: rows
      });
    }

    // ── POST: aprobar / rechazar / pendiente ──
    if (req.method === 'POST') {
      var body = req.body || {};
      var id = body.id, accion = body.accion;
      if (!id || !accion) return res.status(400).json({ ok: false, error: 'Falta id o accion' });
      if (!['aprobar','rechazar','pendiente'].includes(accion)) {
        return res.status(400).json({ ok: false, error: 'accion inválida' });
      }
      var nuevoStatus = accion==='aprobar' ? 'published' : accion==='rechazar' ? 'rejected' : 'pending';

      var upd = await query(db,
        `UPDATE destinos SET status=$1, destacado=$2 WHERE id=$3 RETURNING id, slug, nombre, status`,
        [nuevoStatus, Boolean(body.destacado||false), id]
      );
      if (!upd.length) return res.status(404).json({ ok: false, error: 'Destino no encontrado' });

      return res.status(200).json({
        ok: true,
        mensaje: nuevoStatus==='published' ? 'Publicado en el directorio'
                : nuevoStatus==='rejected' ? 'Solicitud rechazada' : 'Movido a pendientes',
        destino: upd[0]
      });
    }

    return res.status(405).json({ ok: false, error: 'Method not allowed' });

  } catch (err) {
    console.error('[moderar-destinos] FATAL:', err.message);
    return res.status(500).json({ ok: false, error: err.message });
  } finally {
    releaseDB(db);
  }
};
