// api/interacciones.js  v3 - fix de fraude (visita/guardado/resena)
// interacciones columnas: rating (no puntuacion), creado_en (no created_at)
// tipo CHECK: resena, guardado, visita, foto, rating
// rating CHECK: 1-5
// usuario_nombre NO existe - se guarda en texto como prefijo
//
// REQUIERE MIGRACION ANTES DE DESPLEGAR (ver nota de entrega):
//   ALTER TABLE interacciones
//     ADD COLUMN IF NOT EXISTS activo boolean NOT NULL DEFAULT true;
//
// v3: cierra 3 vectores de fraude de XP encontrados en v2:
//  1) 'visita' ahora requiere usuario_id y se deduplica (antes: XP
//     infinito con solo repetir el POST).
//  2) 'guardado'/'quitar_guardado' ahora usan la columna 'activo' en vez
//     de DELETE (Cero Borrado Logico). Antes: ciclo guardar/quitar/
//     guardar otorgaba XP sin limite.
//  3) 'resena' ahora deduplica por usuario_id+destino_id cuando hay
//     usuario_id (antes: resenas repetidas del mismo usuario sumaban XP
//     sin limite y distorsionaban el rating promedio del destino).

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
          'SELECT i.destino_id, d.nombre, d.slug, d.foto_hero, d.ciudad, d.categoria_slug'
          + ' FROM interacciones i'
          + ' JOIN destinos d ON d.id = i.destino_id'
          + ' WHERE i.usuario_id = $1 AND i.tipo = \'guardado\' AND i.activo = true'
          + '   AND d.status = \'published\''
          + ' ORDER BY i.creado_en DESC',
          [usuarioId]
        );
        return res.status(200).json({ ok: true, data: guardados });
      }

      // ¿Está guardado?
      if (tipo === 'is_guardado' && destinoId && usuarioId) {
        var check = await sql(
          'SELECT id FROM interacciones WHERE destino_id=$1 AND usuario_id=$2 AND tipo=\'guardado\' AND activo=true LIMIT 1',
          [destinoId, usuarioId]
        );
        return res.status(200).json({ ok: true, guardado: check.length > 0 });
      }

      // Mapa de guardados de un usuario
      if (tipo === 'mapa' && usuarioId) {
        var mapaGuardados = await sql(
          'SELECT DISTINCT i.destino_id FROM interacciones i'
          + ' WHERE i.usuario_id = $1 AND i.tipo = \'guardado\' AND i.activo = true',
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

        // Un usuario identificado solo puede resenar un destino una vez
        // (BUG de fraude: antes se podian repetir resenas y sumar XP sin
        // limite). Si usuario_id es null (resena anonima, caso actual de
        // produccion en pagina-destino.js) no hay como deduplicar todavia
        // -- queda cubierto cuando se conecte la sesion real ahi.
        if (usuarioId2) {
          var yaReseno = await sql(
            'SELECT id FROM interacciones WHERE destino_id=$1 AND usuario_id=$2 AND tipo=\'resena\' LIMIT 1',
            [destinoId2, usuarioId2]
          );
          if (yaReseno.length > 0)
            return res.status(409).json({ ok: false, error: 'Ya rese\u00f1aste este lugar', ya_reseno: true });
        }

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

        // Notificar al admin (no bloquea la respuesta)
        try {
          var destinoInfo = await sql(
            'SELECT nombre, ciudad, slug FROM destinos WHERE id=$1 LIMIT 1',
            [destinoId2]
          );
          if (destinoInfo.length > 0) {
            fetch(
              (process.env.VERCEL_URL ? 'https://' + process.env.VERCEL_URL : 'https://exploraco.vercel.app')
              + '/api/notificaciones',
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'X-Internal-Secret': process.env.ADMIN_SECRET || 'exploraco12345',
                },
                body: JSON.stringify({
                  tipo:            'resena',
                  rating:          ratingVal,
                  texto:           textoFinal,
                  usuario_nombre:  body.usuario_nombre || 'Visitante',
                  destino_nombre:  destinoInfo[0].nombre,
                  destino_ciudad:  destinoInfo[0].ciudad,
                  destino_slug:    destinoInfo[0].slug,
                }),
              }
            ).catch(function() {}); // fire & forget
          }
        } catch(_) {}

        return res.status(200).json({ ok: true, id: result[0].id, xp: xpGanado });
      }

      // ── Guardado ──
      if (tipo2 === 'guardado') {
        if (!usuarioId2)
          return res.status(400).json({ ok: false, error: 'usuario_id requerido para guardar' });

        // Verificar si ya existe (activo o previamente quitado). Se
        // guarda 'activo' junto con el id para poder distinguir un
        // guardado vigente de uno reactivable sin una segunda consulta.
        var existe = await sql(
          'SELECT id, activo FROM interacciones WHERE destino_id=$1 AND usuario_id=$2 AND tipo=\'guardado\' LIMIT 1',
          [destinoId2, usuarioId2]
        );

        if (existe.length > 0 && existe[0].activo)
          return res.status(200).json({ ok: true, ya_guardado: true });

        if (existe.length > 0 && !existe[0].activo) {
          // Reactivar un guardado previamente quitado. Cero Borrado
          // Logico (Reglas de Oro punto 3): se reactiva la fila original
          // en vez de insertar una nueva, y no se otorga XP de nuevo
          // (evita el ciclo guardar/quitar/guardar para granjear XP).
          await sql(
            'UPDATE interacciones SET activo=true WHERE id=$1',
            [existe[0].id]
          );
          return res.status(200).json({ ok: true, reactivado: true, xp: 0 });
        }

        var xpGuardado = 5;
        await sql(
          'INSERT INTO interacciones (destino_id, usuario_id, tipo, xp_ganado, creado_en) VALUES ($1, $2, \'guardado\', $3, NOW())',
          [destinoId2, usuarioId2, xpGuardado]
        );

        // total_guardados queda como contador historico (nunca baja al
        // quitar), igual que el patron ya usado por el motor de puntos
        // local en index.html (userPoints.saved via Math.max()). Sirve
        // como base fiable para futuras insignias/misiones ("guardaste
        // 5 lugares alguna vez"), sin depender del estado activo actual.
        await sql(
          'UPDATE usuarios SET xp_total=xp_total+$1, total_guardados=total_guardados+1 WHERE id=$2',
          [xpGuardado, usuarioId2]
        ).catch(function(){});

        return res.status(200).json({ ok: true, xp: xpGuardado });
      }

      // ── Quitar guardado ──
      if (tipo2 === 'quitar_guardado') {
        if (!usuarioId2)
          return res.status(400).json({ ok: false, error: 'usuario_id requerido' });

        // Cero Borrado Logico (Reglas de Oro punto 3): se desactiva la
        // fila, nunca se borra. Antes esto era un DELETE, lo que permitia
        // un ciclo guardar/quitar/guardar para ganar XP sin limite -- ver
        // el bloque 'guardado' arriba, que ahora reactiva en vez de
        // re-insertar y no vuelve a pagar XP.
        await sql(
          'UPDATE interacciones SET activo=false WHERE destino_id=$1 AND usuario_id=$2 AND tipo=\'guardado\' AND activo=true',
          [destinoId2, usuarioId2]
        );
        return res.status(200).json({ ok: true });
      }

      // ── Visita ──
      if (tipo2 === 'visita') {
        // Antes se podia llamar sin usuario_id y sin limite: cada POST
        // sencillo otorgaba +20 XP de forma infinita. Ahora requiere
        // usuario_id (igual que 'guardado') y se deduplica por
        // usuario+destino. Nota: hoy ningun caller real en produccion usa
        // este tipo (pagina-destino.js registra visitas de pagina via
        // /api/utilidades?tipo=visitas, un contador distinto y no
        // gamificado); este fix queda listo para cuando exista un boton
        // real de "marcar como visitado" conectado a la sesion.
        if (!usuarioId2)
          return res.status(400).json({ ok: false, error: 'usuario_id requerido para marcar visita' });

        var yaVisitado = await sql(
          'SELECT id FROM interacciones WHERE destino_id=$1 AND usuario_id=$2 AND tipo=\'visita\' LIMIT 1',
          [destinoId2, usuarioId2]
        );
        if (yaVisitado.length > 0)
          return res.status(200).json({ ok: true, ya_visitado: true, xp: 0 });

        await sql(
          'INSERT INTO interacciones (destino_id, usuario_id, tipo, xp_ganado, creado_en) VALUES ($1, $2, \'visita\', 20, NOW())',
          [destinoId2, usuarioId2]
        );
        await sql(
          'UPDATE usuarios SET xp_total=xp_total+20, total_visitas=total_visitas+1 WHERE id=$1',
          [usuarioId2]
        ).catch(function(){});

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
