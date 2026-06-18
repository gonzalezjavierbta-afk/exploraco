// api/fotos.js — Paso 17
// Gestión de fotos de galería en Neon (destinos_fotos)
// GET    ?destino_id=UUID          → listar fotos de un destino
// POST                             → agregar foto(s) a un destino
// DELETE ?id=ID_FOTO               → eliminar foto específica
// PUT    ?id=ID_FOTO               → actualizar caption/orden

const { neon } = require('@neondatabase/serverless');

function auth(req) {
  return (req.headers['authorization']||'').replace('Bearer ','').trim()
    === (process.env.ADMIN_SECRET || 'exploraco12345');
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    var sql = neon(process.env.DATABASE_URL);

    // ── GET: listar fotos de un destino ─────────────────────────
    if (req.method === 'GET') {
      var destId = req.query.destino_id || null;
      var slug   = req.query.slug       || null;

      // Resolver destino_id desde slug si hace falta
      if (!destId && slug) {
        var dr = await sql('SELECT id FROM destinos WHERE slug=$1 LIMIT 1', [slug]);
        if (dr.length) destId = dr[0].id;
      }
      if (!destId) return res.status(400).json({ ok:false, error:'destino_id o slug requerido' });

      var fotos = await sql(
        `SELECT id, url, caption, orden, es_hero, creado_en
         FROM destinos_fotos
         WHERE destino_id = $1
         ORDER BY es_hero DESC NULLS LAST, orden ASC NULLS LAST, creado_en ASC`,
        [destId]
      );

      return res.status(200).json({ ok:true, total: fotos.length, data: fotos });
    }

    // ── POST: agregar foto(s) ────────────────────────────────────
    if (req.method === 'POST') {
      if (!auth(req)) return res.status(401).json({ ok:false, error:'No autorizado' });

      var body   = req.body || {};
      var destId2 = body.destino_id;
      if (!destId2) return res.status(400).json({ ok:false, error:'destino_id requerido' });

      // Aceptar una foto o array de fotos
      var fotos2 = [];
      if (Array.isArray(body.fotos)) {
        fotos2 = body.fotos;
      } else if (body.url) {
        fotos2 = [{ url: body.url, caption: body.caption||'', orden: body.orden||0, es_hero: body.es_hero||false }];
      }

      if (!fotos2.length) return res.status(400).json({ ok:false, error:'Falta url o fotos[]' });

      // Insertar cada foto — ON CONFLICT DO NOTHING para no duplicar URLs
      var insertadas = [];
      for (var i = 0; i < fotos2.length; i++) {
        var f = fotos2[i];
        if (!f.url) continue;
        var r = await sql(
          `INSERT INTO destinos_fotos (destino_id, url, caption, orden, es_hero, creado_en)
           VALUES ($1, $2, $3, $4, $5, NOW())
           ON CONFLICT DO NOTHING
           RETURNING id, url, caption, orden, es_hero`,
          [
            destId2,
            f.url.trim(),
            f.caption || '',
            typeof f.orden === 'number' ? f.orden : i,
            f.es_hero || false,
          ]
        );
        if (r.length) insertadas.push(r[0]);
      }

      // Si hay foto marcada como hero, actualizar foto_hero en destinos
      var heroFoto = fotos2.find(function(f){ return f.es_hero && f.url; });
      if (!heroFoto && fotos2[0] && fotos2[0].url) {
        // Primera foto del batch como hero si no hay hero_actual
        var existing = await sql(
          'SELECT foto_hero FROM destinos WHERE id=$1 LIMIT 1', [destId2]
        );
        if (existing.length && !existing[0].foto_hero) {
          heroFoto = fotos2[0];
        }
      }
      if (heroFoto) {
        await sql(
          'UPDATE destinos SET foto_hero=$1, actualizado_en=NOW() WHERE id=$2',
          [heroFoto.url, destId2]
        ).catch(function(){});
      }

      return res.status(200).json({
        ok:      true,
        mensaje: insertadas.length + ' foto(s) guardadas en Neon',
        data:    insertadas,
      });
    }

    // ── PUT: actualizar caption u orden ─────────────────────────
    if (req.method === 'PUT') {
      if (!auth(req)) return res.status(401).json({ ok:false, error:'No autorizado' });

      var fotoId = req.query.id || (req.body && req.body.id);
      var body3  = req.body || {};
      if (!fotoId) return res.status(400).json({ ok:false, error:'id requerido' });

      var upd = await sql(
        `UPDATE destinos_fotos
         SET caption = COALESCE($2, caption),
             orden   = COALESCE($3, orden),
             es_hero = COALESCE($4, es_hero)
         WHERE id = $1
         RETURNING id, url, caption, orden, es_hero`,
        [
          fotoId,
          body3.caption !== undefined ? body3.caption : null,
          body3.orden   !== undefined ? body3.orden   : null,
          body3.es_hero !== undefined ? body3.es_hero : null,
        ]
      );

      if (!upd.length) return res.status(404).json({ ok:false, error:'Foto no encontrada' });

      // Si se marcó como hero, actualizar destinos.foto_hero
      if (body3.es_hero === true) {
        var destRow = await sql(
          'SELECT destino_id FROM destinos_fotos WHERE id=$1 LIMIT 1', [fotoId]
        );
        if (destRow.length) {
          await sql(
            'UPDATE destinos SET foto_hero=$1, actualizado_en=NOW() WHERE id=$2',
            [upd[0].url, destRow[0].destino_id]
          ).catch(function(){});
        }
      }

      return res.status(200).json({ ok:true, data: upd[0] });
    }

    // ── DELETE: eliminar foto ────────────────────────────────────
    if (req.method === 'DELETE') {
      if (!auth(req)) return res.status(401).json({ ok:false, error:'No autorizado' });

      var fotoId2 = req.query.id || (req.body && req.body.id);
      if (!fotoId2) return res.status(400).json({ ok:false, error:'id requerido' });

      // Verificar si es la foto hero antes de eliminar
      var fotoRow = await sql(
        'SELECT url, destino_id, es_hero FROM destinos_fotos WHERE id=$1 LIMIT 1',
        [fotoId2]
      );
      if (!fotoRow.length) return res.status(404).json({ ok:false, error:'Foto no encontrada' });

      await sql('DELETE FROM destinos_fotos WHERE id=$1', [fotoId2]);

      // Si era la foto hero, asignar la siguiente
      if (fotoRow[0].es_hero) {
        var siguiente = await sql(
          `SELECT url FROM destinos_fotos WHERE destino_id=$1
           ORDER BY orden ASC NULLS LAST LIMIT 1`,
          [fotoRow[0].destino_id]
        );
        var nuevaHero = siguiente.length ? siguiente[0].url : '';
        await sql(
          'UPDATE destinos SET foto_hero=$1, actualizado_en=NOW() WHERE id=$2',
          [nuevaHero, fotoRow[0].destino_id]
        ).catch(function(){});
      }

      return res.status(200).json({ ok:true, mensaje:'Foto eliminada' });
    }

    return res.status(405).json({ ok:false, error:'Method not allowed' });

  } catch(err) {
    console.error('[fotos]', err.message);
    return res.status(500).json({ ok:false, error:err.message });
  }
};
