// api/mis-resenas.js — Paso 14
// GET /api/mis-resenas?usuario_id=UUID
// Devuelve todas las reseñas de un usuario con info del destino
// Usado por el tab "Mis Reseñas" en mi-perfil.html

const { neon } = require('@neondatabase/serverless');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  var usuarioId = req.query.usuario_id || null;
  if (!usuarioId) return res.status(400).json({ ok: false, error: 'usuario_id requerido' });

  try {
    var sql = neon(process.env.DATABASE_URL);

    var rows = await sql(
      `SELECT
         i.id,
         i.rating,
         i.texto,
         i.creado_en,
         i.xp_ganado,
         d.id        AS destino_id,
         d.slug,
         d.nombre,
         d.ciudad,
         d.region,
         d.foto_hero,
         d.categoria_slug,
         d.rating    AS destino_rating
       FROM interacciones i
       JOIN destinos d ON d.id = i.destino_id
       WHERE i.usuario_id = $1
         AND i.tipo = 'resena'
       ORDER BY i.creado_en DESC`,
      [usuarioId]
    );

    return res.status(200).json({
      ok:    true,
      total: rows.length,
      data:  rows.map(function(r) {
        // Extraer nombre del usuario del texto si está como prefijo [nombre]
        var texto = r.texto || '';
        var match = texto.match(/^\[([^\]]+)\]\s*/);
        var textoLimpio = match ? texto.slice(match[0].length) : texto;

        return {
          id:            r.id,
          rating:        r.rating     ? parseFloat(r.rating)  : 0,
          texto:         textoLimpio,
          fecha:         r.creado_en,
          xp:            r.xp_ganado || 0,
          destino: {
            id:           r.destino_id,
            slug:         r.slug,
            nombre:       r.nombre,
            ciudad:       r.ciudad || '',
            region:       r.region || '',
            foto:         r.foto_hero || '',
            categoria:    r.categoria_slug || 'sitio',
            rating_total: r.destino_rating ? parseFloat(r.destino_rating) : 0,
          },
        };
      }),
    });

  } catch(err) {
    console.error('[mis-resenas]', err.message);
    return res.status(500).json({ ok: false, error: err.message });
  }
};
