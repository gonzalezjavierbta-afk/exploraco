// netlify/functions/destinos.js
const { neon } = require('@neondatabase/serverless');

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'public, s-maxage=60',
  };

  try {
    const sql = neon(process.env.DATABASE_URL);
    const params = event.queryStringParameters || {};

    // Modo mapa — solo coords
    if (params.modo === 'mapa') {
      const rows = await sql`
        SELECT id, slug, nombre, categoria_slug, emoji, lat, lng, rating, ciudad
        FROM destinos
        WHERE status = 'published' AND lat IS NOT NULL AND lng IS NOT NULL
        ORDER BY rating DESC
      `;
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, data: rows }) };
    }

    // Filtros opcionales
    const categoria  = params.categoria  || null;
    const ciudad     = params.ciudad     || null;
    const destacados = params.destacados === 'true';
    const limit      = parseInt(params.limit  || '50');
    const offset     = parseInt(params.offset || '0');

    let rows;

    if (categoria && ciudad && destacados) {
      rows = await sql`
        SELECT d.id, d.slug, d.nombre, d.categoria_slug,
               c.nombre AS categoria_nombre, c.emoji AS categoria_emoji,
               d.lead, d.ciudad, d.region, d.barrio,
               d.lat, d.lng, d.precio_desde, d.emoji,
               d.hero_bg, d.foto_hero, d.rating, d.total_resenas,
               d.whatsapp, d.web, d.instagram, d.destacado, d.verificado
        FROM destinos d
        LEFT JOIN categorias c ON d.categoria_slug = c.slug
        WHERE d.status = 'published'
          AND d.categoria_slug = ${categoria}
          AND d.ciudad ILIKE ${'%' + ciudad + '%'}
          AND d.destacado = true
        ORDER BY d.rating DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
    } else if (categoria && ciudad) {
      rows = await sql`
        SELECT d.id, d.slug, d.nombre, d.categoria_slug,
               c.nombre AS categoria_nombre, c.emoji AS categoria_emoji,
               d.lead, d.ciudad, d.region, d.barrio,
               d.lat, d.lng, d.precio_desde, d.emoji,
               d.hero_bg, d.foto_hero, d.rating, d.total_resenas,
               d.whatsapp, d.web, d.instagram, d.destacado, d.verificado
        FROM destinos d
        LEFT JOIN categorias c ON d.categoria_slug = c.slug
        WHERE d.status = 'published'
          AND d.categoria_slug = ${categoria}
          AND d.ciudad ILIKE ${'%' + ciudad + '%'}
        ORDER BY d.destacado DESC, d.rating DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
    } else if (categoria && destacados) {
      rows = await sql`
        SELECT d.id, d.slug, d.nombre, d.categoria_slug,
               c.nombre AS categoria_nombre, c.emoji AS categoria_emoji,
               d.lead, d.ciudad, d.region, d.barrio,
               d.lat, d.lng, d.precio_desde, d.emoji,
               d.hero_bg, d.foto_hero, d.rating, d.total_resenas,
               d.whatsapp, d.web, d.instagram, d.destacado, d.verificado
        FROM destinos d
        LEFT JOIN categorias c ON d.categoria_slug = c.slug
        WHERE d.status = 'published'
          AND d.categoria_slug = ${categoria}
          AND d.destacado = true
        ORDER BY d.rating DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
    } else if (categoria) {
      rows = await sql`
        SELECT d.id, d.slug, d.nombre, d.categoria_slug,
               c.nombre AS categoria_nombre, c.emoji AS categoria_emoji,
               d.lead, d.ciudad, d.region, d.barrio,
               d.lat, d.lng, d.precio_desde, d.emoji,
               d.hero_bg, d.foto_hero, d.rating, d.total_resenas,
               d.whatsapp, d.web, d.instagram, d.destacado, d.verificado
        FROM destinos d
        LEFT JOIN categorias c ON d.categoria_slug = c.slug
        WHERE d.status = 'published'
          AND d.categoria_slug = ${categoria}
        ORDER BY d.destacado DESC, d.rating DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
    } else if (destacados) {
      rows = await sql`
        SELECT d.id, d.slug, d.nombre, d.categoria_slug,
               c.nombre AS categoria_nombre, c.emoji AS categoria_emoji,
               d.lead, d.ciudad, d.region, d.barrio,
               d.lat, d.lng, d.precio_desde, d.emoji,
               d.hero_bg, d.foto_hero, d.rating, d.total_resenas,
               d.whatsapp, d.web, d.instagram, d.destacado, d.verificado
        FROM destinos d
        LEFT JOIN categorias c ON d.categoria_slug = c.slug
        WHERE d.status = 'published' AND d.destacado = true
        ORDER BY d.rating DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
    } else {
      rows = await sql`
        SELECT d.id, d.slug, d.nombre, d.categoria_slug,
               c.nombre AS categoria_nombre, c.emoji AS categoria_emoji,
               d.lead, d.ciudad, d.region, d.barrio,
               d.lat, d.lng, d.precio_desde, d.emoji,
               d.hero_bg, d.foto_hero, d.rating, d.total_resenas,
               d.whatsapp, d.web, d.instagram, d.destacado, d.verificado
        FROM destinos d
        LEFT JOIN categorias c ON d.categoria_slug = c.slug
        WHERE d.status = 'published'
        ORDER BY d.destacado DESC, d.rating DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ ok: true, total: rows.length, data: rows }),
    };

  } catch (err) {
    console.error('[destinos]', err.message);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ ok: false, error: err.message }),
    };
  }
};
