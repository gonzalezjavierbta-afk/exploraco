// api/visitas.js
// POST → registrar visita a una página de destino (llamado desde pagina-destino.js)
// GET  → obtener stats de visitas para el owner de un lugar
// Guarda en interacciones con tipo='visita'

const { neon } = require('@neondatabase/serverless');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    var sql = neon(process.env.DATABASE_URL);

    // ── POST: registrar visita ───────────────────────────────────
    if (req.method === 'POST') {
      var body      = req.body || {};
      var destinoId = body.destino_id;
      var ref       = body.referrer || '';   // desde dónde vino
      var ua        = (req.headers['user-agent'] || '').slice(0, 200);

      if (!destinoId) return res.status(400).json({ ok: false, error: 'destino_id requerido' });

      // No contar bots
      if (/bot|crawler|spider|google|bing|baidu|yandex/i.test(ua)) {
        return res.status(200).json({ ok: true, counted: false });
      }

      // Insertar como interacción tipo visita
      await sql(
        `INSERT INTO interacciones (destino_id, tipo, texto, xp_ganado, creado_en)
         VALUES ($1, 'visita', $2, 0, NOW())`,
        [destinoId, ref || null]
      ).catch(function() {}); // no fatal

      return res.status(200).json({ ok: true, counted: true });
    }

    // ── GET: stats de analítica para un destino ──────────────────
    if (req.method === 'GET') {
      var slug = req.query.slug || null;
      var auth = (req.headers['authorization'] || '').replace('Bearer ', '').trim();
      var isAdmin = auth === (process.env.ADMIN_SECRET || 'exploraco12345');

      if (!slug) return res.status(400).json({ ok: false, error: 'slug requerido' });

      // Verificar que el destino existe
      var destRows = await sql(
        `SELECT id, nombre, ciudad, rating, total_resenas, status
         FROM destinos WHERE slug = $1 LIMIT 1`,
        [slug]
      );
      if (!destRows.length) return res.status(404).json({ ok: false, error: 'Destino no encontrado' });
      var dest = destRows[0];

      // Solo mostrar a admin o si el destino es public
      if (dest.status !== 'published' && !isAdmin) {
        return res.status(403).json({ ok: false, error: 'No autorizado' });
      }

      // Stats de visitas
      var ahora    = new Date();
      var hace7d   = new Date(ahora - 7  * 86400000).toISOString();
      var hace30d  = new Date(ahora - 30 * 86400000).toISOString();

      var visitas = await sql(
        `SELECT
           COUNT(*)                                         AS total,
           COUNT(CASE WHEN creado_en >= $2 THEN 1 END)     AS ultimos_30d,
           COUNT(CASE WHEN creado_en >= $3 THEN 1 END)     AS ultimos_7d
         FROM interacciones
         WHERE destino_id = $1 AND tipo = 'visita'`,
        [dest.id, hace30d, hace7d]
      );

      // Visitas por día (últimos 30 días) para gráfica
      var visitasDia = await sql(
        `SELECT
           DATE(creado_en AT TIME ZONE 'America/Bogota') AS dia,
           COUNT(*) AS n
         FROM interacciones
         WHERE destino_id=$1 AND tipo='visita' AND creado_en >= $2
         GROUP BY dia ORDER BY dia ASC`,
        [dest.id, hace30d]
      );

      // Stats de guardados
      var guardados = await sql(
        `SELECT COUNT(*) AS total FROM interacciones
         WHERE destino_id=$1 AND tipo='guardado'`,
        [dest.id]
      );

      // Stats de reseñas
      var resenas = await sql(
        `SELECT COUNT(*) AS total, ROUND(AVG(rating)::numeric,1) AS avg_rating
         FROM interacciones
         WHERE destino_id=$1 AND tipo='resena'`,
        [dest.id]
      );

      return res.status(200).json({
        ok: true,
        destino: {
          slug:          slug,
          nombre:        dest.nombre,
          ciudad:        dest.ciudad,
          rating:        dest.rating ? parseFloat(dest.rating) : 0,
          total_resenas: dest.total_resenas || 0,
        },
        stats: {
          visitas_total:  parseInt((visitas[0] || {}).total    || 0),
          visitas_30d:    parseInt((visitas[0] || {}).ultimos_30d || 0),
          visitas_7d:     parseInt((visitas[0] || {}).ultimos_7d  || 0),
          guardados:      parseInt((guardados[0] || {}).total  || 0),
          resenas:        parseInt((resenas[0]  || {}).total   || 0),
          rating_promedio:parseFloat((resenas[0] || {}).avg_rating || 0),
        },
        historico: visitasDia.map(function(r) {
          return { dia: r.dia, visitas: parseInt(r.n) };
        }),
      });
    }

    return res.status(405).json({ ok: false, error: 'Method not allowed' });

  } catch(err) {
    console.error('[visitas]', err.message);
    return res.status(500).json({ ok: false, error: err.message });
  }
};
