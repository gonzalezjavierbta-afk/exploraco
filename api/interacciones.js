// api/interacciones.js  v2 — schema real confirmado
// interacciones columnas: rating (no puntuacion), creado_en (no created_at)
// tipo CHECK: resena, guardado, visita, foto, rating
// rating CHECK: 1-5
// usuario_nombre NO existe — se guarda en texto como prefijo

const { neon } = require('@neondatabase/serverless');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    var sql = neon(process.env.DATABASE_URL);

    // ── GET ──────────────────────────────────────────────────────
    if (req.method === 'GET') {
      var tipo     = req.query.tipo       || null;
      var destinoId= req.query.destino_id || null;
      var usuarioId= req.query.usuario_id || null;

      // Reseñas de un destino
      if (tipo === 'resenas' && destinoId) {
        var rows = await sql(
          `SELECT i.id, i.rating, i.texto, i.creado_en,
                  u.nombre AS usuario_nombre, u.badge_actual
           FROM interacciones i
           LEFT JOIN usuarios u ON i.usuario_id = u.id
           WHERE i.destino_id = $1 AND i.tipo = 'resena'
           ORDER BY i.creado_en DESC
           LIMIT 20`,
          [destinoId]
        );
        return res.status(200).json({ ok: true, data: rows });
      }

      // Guardados de un usuario
      if (tipo === 'guardados' && usuarioId) {
        var guardados = await sql(
          `SELECT i.destino_id, d.nombre, d.slug, d.foto_hero, d.ciudad, d.categoria_slug
           FROM interacciones i
           JOIN destinos d ON d.id = i.destino_id
           WHERE i.usuario_id = $1 AND i.tipo = 'guardado'
             AND d.status = 'published'
           ORDER BY i.creado_en DESC`,
          [usuarioId]
        );
        return res.status(200).json({ ok: true, data: guardados });
      }

      // ¿Está guardado?
      if (tipo === 'is_guardado' && destinoId && usuarioId) {
        var check = await sql(
          `SELECT id FROM interacciones
           WHERE destino_id=$1 AND usuario_id=$2 AND tipo='guardado' LIMIT 1`,
          [destinoId, usuarioId]
        );
        return res.status(200).json({ ok: true, guardado: check.length > 0 });
      }

      // Mapa de guardados de un usuario
      if (tipo === 'mapa' && usuarioId) {
        var mapaGuardados = await sql(
          `SELECT DISTINCT i.destino_id
           FROM interacciones i
           WHERE i.usuario_id = $1 AND i.tipo = 'guardado'`,
          [usuarioId]
        );
        return res.status(200).json({
          ok: true,
          data: mapaGuardados.map(function(r){ return r.destino_id; })
        });
      }

      return res.status(400).json({ ok: false, error: 'Parámetros insuficientes' });
    }

    // ── POST ─────────────────────────────────────────────────────
    if (req.method === 'POST') {
      var body = req.body || {};
      var tipo2     = body.tipo;
      var destinoId2= body.destino_id;
      var usuarioId2= body.usuario_id || null;

      if (!tipo2 || !destinoId2)
        return res.status(400).json({ ok: false, error: 'tipo y destino_id son requeridos' });

      // Validar tipo contra constraint real
      var tiposValidos = ['resena','guardado','visita','foto','rating'];
      if (!tiposValidos.includes(tipo2))
        return res.status(400).json({ ok: false, error: 'tipo inválido: ' + tipo2 });

      // ── Reseña ──
      if (tipo2 === 'resena') {
        var ratingVal = parseInt(body.rating || body.puntuacion || 0);
        if (ratingVal < 1 || ratingVal > 5)
          return res.status(400).json({ ok: false, error: 'rating debe ser entre 1 y 5' });

        // usuario_nombre no existe en la tabla → guardarlo en texto como prefijo
        var nombrePrefijo = body.usuario_nombre
          ? '[' + body.usuario_nombre.slice(0,50) + '] '
          : '';
        var textoFinal = body.texto
          ? (nombrePrefijo + body.texto).slice(0, 2000)
          : (body.usuario_nombre ? nombrePrefijo.trim() : null);

        var xpGanado = textoFinal && textoFinal.replace(nombrePrefijo,'').trim().length > 50
          ? 25 : 10;

        var result = await sql(
          `INSERT INTO interacciones
             (destino_id, usuario_id, tipo, rating, texto, xp_ganado, creado_en)
           VALUES ($1, $2, 'resena', $3, $4, $5, NOW())
           RETURNING id`,
          [destinoId2, usuarioId2, ratingVal, textoFinal, xpGanado]
        );

        // Actualizar rating promedio y total_resenas en destinos
        await sql(
          `UPDATE destinos SET
             rating = (
               SELECT ROUND(AVG(rating)::numeric, 2)
               FROM interacciones
               WHERE destino_id=$1 AND tipo='resena' AND rating IS NOT NULL
             ),
             total_resenas = (
               SELECT COUNT(*) FROM interacciones
               WHERE destino_id=$1 AND tipo='resena'
             ),
             actualizado_en = NOW()
           WHERE id = $1`,
          [destinoId2]
        );

        // Sumar XP al usuario si está logueado
        if (usuarioId2) {
          await sql(
            `UPDATE usuarios SET
               xp_total = xp_total + $1,
               total_resenas = total_resenas + 1,
               ultimo_acceso = NOW()
             WHERE id = $2`,
            [xpGanado, usuarioId2]
          ).catch(function(){});
        }

        return res.status(200).json({ ok: true, id: result[0].id, xp: xpGanado });
      }

      // ── Guardado ──
      if (tipo2 === 'guardado') {
        if (!usuarioId2)
          return res.status(400).json({ ok: false, error: 'usuario_id requerido para guardar' });

        // Verificar si ya existe
        var existe = await sql(
          `SELECT id FROM interacciones
           WHERE destino_id=$1 AND usuario_id=$2 AND tipo='guardado' LIMIT 1`,
          [destinoId2, usuarioId2]
        );
        if (existe.length > 0)
          return res.status(200).json({ ok: true, ya_guardado: true });

        await sql(
          `INSERT INTO interacciones (destino_id, usuario_id, tipo, xp_ganado, creado_en)
           VALUES ($1, $2, 'guardado', 5, NOW())`,
          [destinoId2, usuarioId2]
        );

        await sql(
          `UPDATE usuarios SET xp_total=xp_total+5, total_guardados=total_guardados+1
           WHERE id=$1`,
          [usuarioId2]
        ).catch(function(){});

        return res.status(200).json({ ok: true, xp: 5 });
      }

      // ── Quitar guardado ──
      if (tipo2 === 'quitar_guardado') {
        if (!usuarioId2)
          return res.status(400).json({ ok: false, error: 'usuario_id requerido' });

        await sql(
          `DELETE FROM interacciones
           WHERE destino_id=$1 AND usuario_id=$2 AND tipo='guardado'`,
          [destinoId2, usuarioId2]
        );
        return res.status(200).json({ ok: true });
      }

      // ── Visita ──
      if (tipo2 === 'visita') {
        await sql(
          `INSERT INTO interacciones (destino_id, usuario_id, tipo, xp_ganado, creado_en)
           VALUES ($1, $2, 'visita', 20, NOW())`,
          [destinoId2, usuarioId2]
        );
        if (usuarioId2) {
          await sql(
            `UPDATE usuarios SET xp_total=xp_total+20, total_visitas=total_visitas+1
             WHERE id=$1`,
            [usuarioId2]
          ).catch(function(){});
        }
        return res.status(200).json({ ok: true, xp: 20 });
      }

      // ── Solo rating (sin texto) ──
      if (tipo2 === 'rating') {
        var rVal = parseInt(body.rating || 0);
        if (rVal < 1 || rVal > 5)
          return res.status(400).json({ ok: false, error: 'rating debe ser 1-5' });

        await sql(
          `INSERT INTO interacciones (destino_id, usuario_id, tipo, rating, xp_ganado, creado_en)
           VALUES ($1, $2, 'rating', $3, 10, NOW())`,
          [destinoId2, usuarioId2, rVal]
        );

        await sql(
          `UPDATE destinos SET
             rating = (SELECT ROUND(AVG(rating)::numeric,2) FROM interacciones
                       WHERE destino_id=$1 AND tipo IN ('resena','rating') AND rating IS NOT NULL),
             actualizado_en = NOW()
           WHERE id=$1`,
          [destinoId2]
        ).catch(function(){});

        return res.status(200).json({ ok: true, xp: 10 });
      }

      return res.status(400).json({ ok: false, error: 'tipo no implementado: ' + tipo2 });
    }

    return res.status(405).json({ ok: false, error: 'Method not allowed' });

  } catch(err) {
    console.error('[interacciones]', err.message);
    return res.status(500).json({ ok: false, error: err.message });
  }
};
