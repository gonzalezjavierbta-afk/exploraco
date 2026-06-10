// /api/moderar-destinos.js
// Permite al admin listar destinos pending y aprobarlos/rechazarlos
// Auth: Bearer exploraco12345

import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

function checkAuth(req) {
  const auth = req.headers['authorization'] || '';
  const token = auth.replace('Bearer ', '').trim();
  return token === process.env.ADMIN_SECRET;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (!checkAuth(req)) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  // GET: listar pendientes
  if (req.method === 'GET') {
    const status = req.query.status || 'pending';
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    const rows = await sql`
      SELECT
        d.id, d.slug, d.nombre, d.ciudad, d.departamento,
        d.descripcion_corta, d.foto_principal, d.precio_desde,
        d.lat, d.lng, d.status, d.destacado, d.created_at,
        c.slug as categoria, c.nombre as categoria_nombre,
        dd.datos as detalles
      FROM destinos d
      LEFT JOIN categorias c ON d.categoria_id = c.id
      LEFT JOIN destinos_detalles dd ON dd.destino_id = d.id
      WHERE d.status = ${status}
      ORDER BY d.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const total = await sql`
      SELECT COUNT(*) as n FROM destinos WHERE status = ${status}
    `;

    return res.status(200).json({
      ok: true,
      status,
      total: parseInt(total[0]?.n || 0),
      items: rows
    });
  }

  // POST: aprobar o rechazar
  if (req.method === 'POST') {
    const { id, accion, destacado } = req.body;

    if (!id || !accion) {
      return res.status(400).json({ error: 'Falta id o accion' });
    }

    if (!['aprobar', 'rechazar', 'pendiente'].includes(accion)) {
      return res.status(400).json({ error: 'accion debe ser: aprobar, rechazar, pendiente' });
    }

    const nuevoStatus = accion === 'aprobar' ? 'published' : accion === 'rechazar' ? 'rejected' : 'pending';

    const [updated] = await sql`
      UPDATE destinos
      SET
        status = ${nuevoStatus},
        destacado = ${destacado !== undefined ? Boolean(destacado) : false}
      WHERE id = ${id}
      RETURNING id, slug, nombre, status
    `;

    if (!updated) {
      return res.status(404).json({ error: 'Destino no encontrado' });
    }

    return res.status(200).json({
      ok: true,
      mensaje: `Destino ${nuevoStatus === 'published' ? 'aprobado y publicado' : nuevoStatus}`,
      destino: updated
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
