// netlify/functions/admin-destinos.js
const { neon } = require('@neondatabase/serverless');

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };

  const auth = event.headers?.authorization || event.headers?.Authorization || '';
  const ADMIN_SECRET = process.env.ADMIN_SECRET || 'exploracо-admin-2024';
  if (auth !== 'Bearer ' + ADMIN_SECRET) {
    return { statusCode: 401, headers, body: JSON.stringify({ ok: false, error: 'No autorizado' }) };
  }

  try {
    const sql = neon(process.env.DATABASE_URL);
    const params = event.queryStringParameters || {};
    const method = event.httpMethod;

    if (method === 'GET') {
      const limit  = parseInt(params.limit  || '500');
      const offset = parseInt(params.offset || '0');
      const rows = await sql`
        SELECT d.*, dd.habitaciones, dd.amenidades, dd.checkin, dd.checkout,
               dd.booking_url, dd.hostelworld_url, dd.faqs, dd.transporte, dd.scores
        FROM destinos d
        LEFT JOIN destinos_detalles dd ON d.id = dd.destino_id
        ORDER BY d.creado_en DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
      const total = await sql`SELECT COUNT(*) as n FROM destinos`;
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, total: parseInt(total[0].n), data: rows }) };
    }

    if (method === 'POST') {
      const b = JSON.parse(event.body || '{}');
      if (!b.nombre || !b.categoria_slug) {
        return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: 'nombre y categoria_slug requeridos' }) };
      }
      if (!b.slug) b.slug = b.nombre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
      const rows = await sql`
        INSERT INTO destinos (slug, nombre, categoria_slug, lead, descripcion, ciudad, region,
          lat, lng, whatsapp, email, web, instagram, booking, precio_desde, emoji, hero_bg,
          rating, total_resenas, status, destacado)
        VALUES (${b.slug}, ${b.nombre}, ${b.categoria_slug}, ${b.lead||''}, ${b.desc||''},
          ${b.city||''}, ${b.region||''}, ${b.lat||null}, ${b.lng||null},
          ${b.whatsapp||''}, ${b.email||''}, ${b.web||''}, ${b.instagram||''},
          ${b.booking||''}, ${b.price||''}, ${b.emoji||'📍'},
          ${b.hero_bg||'linear-gradient(135deg,#111,#222)'},
          ${b.rating||0}, ${b.reviews||0}, ${b.status||'draft'}, ${b.destacado||false})
        ON CONFLICT (slug) DO UPDATE SET
          nombre = EXCLUDED.nombre, lead = EXCLUDED.lead, status = EXCLUDED.status,
          actualizado_en = NOW()
        RETURNING id, slug, nombre
      `;
      return { statusCode: 201, headers, body: JSON.stringify({ ok: true, data: rows[0] }) };
    }

    if (method === 'PUT') {
      const { id } = params;
      if (!id) return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: 'Falta id' }) };
      const b = JSON.parse(event.body || '{}');
      await sql`
        UPDATE destinos SET
          nombre       = COALESCE(${b.nombre||null}, nombre),
          lead         = COALESCE(${b.lead||null}, lead),
          descripcion  = COALESCE(${b.desc||null}, descripcion),
          ciudad       = COALESCE(${b.city||null}, ciudad),
          status       = COALESCE(${b.status||null}, status),
          destacado    = COALESCE(${b.destacado??null}, destacado),
          actualizado_en = NOW()
        WHERE id = ${id}
      `;
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, id }) };
    }

    if (method === 'DELETE') {
      const { id } = params;
      if (!id) return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: 'Falta id' }) };
      await sql`DELETE FROM destinos WHERE id = ${id}`;
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    }

    return { statusCode: 405, headers, body: JSON.stringify({ ok: false, error: 'Método no permitido' }) };
  } catch (err) {
    console.error('[admin-destinos]', err.message);
    return { statusCode: 500, headers, body: JSON.stringify({ ok: false, error: err.message }) };
  }
};