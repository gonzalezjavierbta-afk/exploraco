// api/admin-destinos.js — Vercel Serverless Function
const { neon } = require('@neondatabase/serverless');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(204).end();

  const auth = req.headers.authorization || '';
  const ADMIN_SECRET = process.env.ADMIN_SECRET || 'exploraco12345';
  if (auth !== 'Bearer ' + ADMIN_SECRET) {
    return res.status(401).json({ ok: false, error: 'No autorizado' });
  }

  try {
    const sql = neon(process.env.DATABASE_URL);
    const { id, limit = '500', offset = '0' } = req.query;

    if (req.method === 'GET') {
      const rows = await sql`
        SELECT d.*, dd.habitaciones, dd.amenidades, dd.checkin, dd.checkout,
               dd.booking_url, dd.hostelworld_url, dd.faqs, dd.transporte, dd.scores
        FROM destinos d
        LEFT JOIN destinos_detalles dd ON d.id = dd.destino_id
        ORDER BY d.creado_en DESC
        LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}
      `;
      const total = await sql`SELECT COUNT(*) as n FROM destinos`;
      return res.json({ ok: true, total: parseInt(total[0].n), data: rows });
    }

    if (req.method === 'POST') {
      const b = req.body || {};
      if (!b.nombre || !b.categoria_slug) {
        return res.status(400).json({ ok: false, error: 'nombre y categoria_slug requeridos' });
      }
      if (!b.slug) {
        b.slug = b.nombre.toLowerCase()
          .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      }
      const rows = await sql`
        INSERT INTO destinos (
          slug, nombre, categoria_slug, lead, descripcion, ciudad, region,
          lat, lng, whatsapp, email, web, instagram, booking,
          precio_desde, emoji, hero_bg, rating, total_resenas, status, destacado
        ) VALUES (
          ${b.slug}, ${b.nombre}, ${b.categoria_slug},
          ${b.lead||''}, ${b.desc||''}, ${b.city||''}, ${b.region||''},
          ${b.lat||null}, ${b.lng||null}, ${b.whatsapp||''},
          ${b.email||''}, ${b.web||''}, ${b.instagram||''},
          ${b.booking||''}, ${b.price||''}, ${b.emoji||'📍'},
          ${b.hero_bg||'linear-gradient(135deg,#111,#222)'},
          ${b.rating||0}, ${b.reviews||0},
          ${b.status||'draft'}, ${b.destacado||false}
        )
        ON CONFLICT (slug) DO UPDATE SET
          nombre = EXCLUDED.nombre, lead = EXCLUDED.lead,
          status = EXCLUDED.status, actualizado_en = NOW()
        RETURNING id, slug, nombre
      `;
      return res.status(201).json({ ok: true, data: rows[0] });
    }

    if (req.method === 'PUT') {
      if (!id) return res.status(400).json({ ok: false, error: 'Falta id' });
      const b = req.body || {};
      await sql`
        UPDATE destinos SET
          nombre      = COALESCE(${b.nombre||null},  nombre),
          lead        = COALESCE(${b.lead||null},    lead),
          descripcion = COALESCE(${b.desc||null},    descripcion),
          ciudad      = COALESCE(${b.city||null},    ciudad),
          status      = COALESCE(${b.status||null},  status),
          destacado   = COALESCE(${b.destacado??null}, destacado),
          actualizado_en = NOW()
        WHERE id = ${id}
      `;
      return res.json({ ok: true, id });
    }

    if (req.method === 'DELETE') {
      if (!id) return res.status(400).json({ ok: false, error: 'Falta id' });
      await sql`DELETE FROM destinos WHERE id = ${id}`;
      return res.json({ ok: true });
    }

    return res.status(405).json({ ok: false, error: 'Método no permitido' });

  } catch (err) {
    console.error('[admin-destinos]', err.message);
    return res.status(500).json({ ok: false, error: err.message });
  }
};
