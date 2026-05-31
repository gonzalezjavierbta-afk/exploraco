// api/destinos.js — Vercel Serverless Function
const { neon } = require('@neondatabase/serverless');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', 'public, s-maxage=60');

  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const sql = neon(process.env.DATABASE_URL);
    const { modo, categoria, ciudad, destacados, limit = '50', offset = '0' } = req.query;

    if (modo === 'mapa') {
      const rows = await sql`
        SELECT id, slug, nombre, categoria_slug, emoji, lat, lng, rating, ciudad
        FROM destinos
        WHERE status = 'published' AND lat IS NOT NULL AND lng IS NOT NULL
        ORDER BY rating DESC
      `;
      return res.json({ ok: true, data: rows });
    }

    let rows;
    const lim = parseInt(limit);
    const off = parseInt(offset);

    if (categoria && destacados === 'true') {
      rows = await sql`
        SELECT d.id, d.slug, d.nombre, d.categoria_slug,
               c.nombre AS categoria_nombre, c.emoji AS categoria_emoji,
               d.lead, d.ciudad, d.region, d.barrio, d.lat, d.lng,
               d.precio_desde, d.emoji, d.hero_bg, d.foto_hero,
               d.rating, d.total_resenas, d.whatsapp, d.web, d.instagram,
               d.destacado, d.verificado
        FROM destinos d
        LEFT JOIN categorias c ON d.categoria_slug = c.slug
        WHERE d.status = 'published'
          AND d.categoria_slug = ${categoria}
          AND d.destacado = true
        ORDER BY d.rating DESC
        LIMIT ${lim} OFFSET ${off}
      `;
    } else if (categoria) {
      rows = await sql`
        SELECT d.id, d.slug, d.nombre, d.categoria_slug,
               c.nombre AS categoria_nombre, c.emoji AS categoria_emoji,
               d.lead, d.ciudad, d.region, d.barrio, d.lat, d.lng,
               d.precio_desde, d.emoji, d.hero_bg, d.foto_hero,
               d.rating, d.total_resenas, d.whatsapp, d.web, d.instagram,
               d.destacado, d.verificado
        FROM destinos d
        LEFT JOIN categorias c ON d.categoria_slug = c.slug
        WHERE d.status = 'published'
          AND d.categoria_slug = ${categoria}
        ORDER BY d.destacado DESC, d.rating DESC
        LIMIT ${lim} OFFSET ${off}
      `;
    } else if (destacados === 'true') {
      rows = await sql`
        SELECT d.id, d.slug, d.nombre, d.categoria_slug,
               c.nombre AS categoria_nombre, c.emoji AS categoria_emoji,
               d.lead, d.ciudad, d.region, d.barrio, d.lat, d.lng,
               d.precio_desde, d.emoji, d.hero_bg, d.foto_hero,
               d.rating, d.total_resenas, d.whatsapp, d.web, d.instagram,
               d.destacado, d.verificado
        FROM destinos d
        LEFT JOIN categorias c ON d.categoria_slug = c.slug
        WHERE d.status = 'published' AND d.destacado = true
        ORDER BY d.rating DESC
        LIMIT ${lim} OFFSET ${off}
      `;
    } else {
      rows = await sql`
        SELECT d.id, d.slug, d.nombre, d.categoria_slug,
               c.nombre AS categoria_nombre, c.emoji AS categoria_emoji,
               d.lead, d.ciudad, d.region, d.barrio, d.lat, d.lng,
               d.precio_desde, d.emoji, d.hero_bg, d.foto_hero,
               d.rating, d.total_resenas, d.whatsapp, d.web, d.instagram,
               d.destacado, d.verificado
        FROM destinos d
        LEFT JOIN categorias c ON d.categoria_slug = c.slug
        WHERE d.status = 'published'
        ORDER BY d.destacado DESC, d.rating DESC
        LIMIT ${lim} OFFSET ${off}
      `;
    }

    return res.json({ ok: true, total: rows.length, data: rows });

  } catch (err) {
    console.error('[destinos]', err.message);
    return res.status(500).json({ ok: false, error: err.message });
  }
};
