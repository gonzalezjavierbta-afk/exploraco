const { neon } = require('@neondatabase/serverless');

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };
  try {
    const sql = neon(process.env.DATABASE_URL);
    const rows = await sql`
      SELECT id, slug, nombre, categoria_slug, ciudad, rating
      FROM destinos
      WHERE status = 'published'
      ORDER BY rating DESC
      LIMIT 10
    `;
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ ok: true, total: rows.length, data: rows }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ ok: false, error: err.message }),
    };
  }
};
