// api/admin-destinos.js v2.1 (ASCII-safe: 0 backticks, 0 no-ASCII)
// GET    ?limit=N           -> listar destinos (auth)
// GET    ?id=UUID           -> obtener uno
// POST                      -> crear destino
// PUT    ?id=UUID           -> actualizar destino
// DELETE ?id=UUID           -> eliminar destino
// DIAGNOSTICO: buscar 'admin-destinos-v2' en consola para confirmar version

const { neon } = require('@neondatabase/serverless');

function auth(req) {
  return (req.headers['authorization'] || '').replace('Bearer ', '').trim()
    === (process.env.ADMIN_SECRET || 'exploraco12345');
}

function safeJSON(v) {
  if (!v) return null;
  if (typeof v === 'object') return v;
  try { return JSON.parse(v); } catch(_) { return null; }
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!auth(req)) return res.status(401).json({ ok: false, error: 'No autorizado' });

  console.log('[admin-destinos-v2]', req.method, req.query.id || req.query.limit || 'new');

  try {
    var sql = neon(process.env.DATABASE_URL);
    var b   = req.body || {};

    // -- GET: listar o buscar uno --------------------------------
    if (req.method === 'GET') {
      if (req.query.id) {
        var rows = await sql(
          'SELECT d.*, '
          + 'dd.checkin, dd.checkout, dd.habitaciones, dd.amenidades, '
          + 'dd.faqs, dd.booking_url, dd.hostelworld_url, dd.airbnb_url, dd.scores '
          + 'FROM destinos d '
          + 'LEFT JOIN destinos_detalles dd ON dd.destino_id = d.id '
          + 'WHERE d.id = $1 LIMIT 1',
          [req.query.id]
        );
        if (!rows.length) return res.status(404).json({ ok: false, error: 'No encontrado' });
        return res.json({ ok: true, data: rows[0] });
      }

      var limit  = Math.min(parseInt(req.query.limit) || 50, 500);
      var offset = Math.max(parseInt(req.query.offset) || 0, 0);
      var status = req.query.status || null;

      var conds = status ? ['d.status = $1'] : [];
      var params = status ? [status] : [];
      var pi = params.length + 1;

      var rows2 = await sql(
        'SELECT d.id, d.slug, d.nombre, d.categoria_slug, d.ciudad, d.region, '
        + 'd.lead, d.descripcion, d.highlight, d.foto_hero, d.hero_bg, '
        + 'd.lat, d.lng, d.whatsapp, d.telefono, d.email, d.web, d.instagram, '
        + 'd.precio_desde, d.horario, d.emoji, d.status, d.destacado, '
        + 'd.booking, d.hostelworld, d.airbnb, d.tipo, d.capacidad, '
        + 'd.como_llegar, d.tags, d.rating, d.total_resenas, '
        + 'd.creado_en, d.actualizado_en, '
        + 'dd.checkin, dd.checkout, dd.habitaciones, dd.amenidades, '
        + 'dd.faqs, dd.booking_url, dd.hostelworld_url, dd.airbnb_url '
        + 'FROM destinos d '
        + 'LEFT JOIN destinos_detalles dd ON dd.destino_id = d.id '
        + (conds.length ? 'WHERE ' + conds.join(' AND ') : '') + ' '
        + 'ORDER BY d.creado_en DESC '
        + 'LIMIT $' + pi + ' OFFSET $' + (pi + 1),
        [...params, limit, offset]
      );

      var total = await sql(
        'SELECT COUNT(*) AS n FROM destinos' + (status ? ' WHERE status=$1' : ''),
        status ? [status] : []
      );

      return res.json({ ok: true, total: parseInt((total[0]||{}).n||0), data: rows2 });
    }

    // -- POST: crear destino --------------------------------------
    if (req.method === 'POST') {
      if (!b.slug || !b.nombre) {
        return res.status(400).json({ ok: false, error: 'slug y nombre son requeridos' });
      }

      // Slug limpio
      var slug = String(b.slug).trim()
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');

      var tags = safeJSON(b.tags) || {};

      var inserted = await sql(
        'INSERT INTO destinos ( '
        + 'slug, nombre, categoria_slug, '
        + 'lead, descripcion, highlight, '
        + 'ciudad, region, barrio, '
        + 'lat, lng, '
        + 'whatsapp, telefono, email, web, instagram, '
        + 'precio_desde, horario, emoji, hero_bg, foto_hero, '
        + 'booking, hostelworld, airbnb, '
        + 'tipo, capacidad, como_llegar, '
        + 'status, destacado, tags, '
        + 'creado_en, actualizado_en '
        + ') VALUES ( '
        + '$1, $2, $3, '
        + '$4, $5, $6, '
        + '$7, $8, $9, '
        + '$10, $11, '
        + '$12, $13, $14, $15, $16, '
        + '$17, $18, $19, $20, $21, '
        + '$22, $23, $24, '
        + '$25, $26, $27, '
        + '$28, $29, $30, '
        + 'NOW(), NOW() '
        + ') '
        + 'ON CONFLICT (slug) DO UPDATE SET '
        + 'nombre = EXCLUDED.nombre, '
        + 'actualizado_en = NOW() '
        + 'RETURNING id, slug, nombre, status',
        [
          slug,
          String(b.nombre||'').trim(),
          String(b.categoria_slug||b.cat||'sitio').trim(),
          String(b.lead||'').trim(),
          String(b.descripcion||b.desc||'').trim(),
          String(b.highlight||'').trim(),
          String(b.ciudad||b.city||'').trim(),
          String(b.region||'').trim(),
          String(b.barrio||'').trim(),
          b.lat ? parseFloat(b.lat) : null,
          b.lng ? parseFloat(b.lng) : null,
          String(b.whatsapp||'').trim(),
          String(b.telefono||b.tel||'').trim(),
          String(b.email||'').trim(),
          String(b.web||'').trim(),
          String(b.instagram||'').trim(),
          String(b.precio_desde||b.price||'').trim(),
          String(b.horario||'').trim(),
          String(b.emoji||'').trim(),
          String(b.hero_bg||'').trim(),
          String(b.foto_hero||'').trim(),
          String(b.booking||b.booking_url||'').trim(),
          String(b.hostelworld||b.hostelworld_url||'').trim(),
          String(b.airbnb||b.airbnb_url||'').trim(),
          String(b.tipo||'').trim(),
          String(b.capacidad||'').trim(),
          String(b.como_llegar||'').trim(),
          String(b.status||'draft').trim(),
          Boolean(b.destacado||false),
          JSON.stringify(tags),
        ]
      );

      var newId = inserted[0].id;

      // Guardar detalles si hay datos
      var habs  = safeJSON(b.habitaciones) || safeJSON(b.habs) || [];
      var amens = safeJSON(b.amenidades)   || safeJSON(b.amenities) || [];
      var faqs  = safeJSON(b.faqs) || [];
      if (habs.length || amens.length || faqs.length || b.checkin) {
        await sql(
          'INSERT INTO destinos_detalles (destino_id, checkin, checkout, habitaciones, amenidades, faqs, booking_url, hostelworld_url, airbnb_url) '
          + 'VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) '
          + 'ON CONFLICT (destino_id) DO UPDATE SET '
          + 'checkin=EXCLUDED.checkin, checkout=EXCLUDED.checkout, '
          + 'habitaciones=EXCLUDED.habitaciones, amenidades=EXCLUDED.amenidades, '
          + 'faqs=EXCLUDED.faqs',
          [newId, b.checkin||null, b.checkout||null,
           JSON.stringify(habs), JSON.stringify(amens), JSON.stringify(faqs),
           b.booking_url||null, b.hostelworld_url||null, b.airbnb_url||null]
        ).catch(function(){});
      }

      // Guardar fotos de galeria
      if (b.fotos_galeria && b.fotos_galeria.length) {
        for (var i = 0; i < b.fotos_galeria.length; i++) {
          var fg = b.fotos_galeria[i];
          if (!fg.url) continue;
          await sql(
            'INSERT INTO destinos_fotos (destino_id, url, caption, orden, es_hero, creado_en) '
            + 'VALUES ($1,$2,$3,$4,false,NOW()) ON CONFLICT DO NOTHING',
            [newId, fg.url, fg.caption||'', fg.orden||i]
          ).catch(function(){});
        }
      }

      return res.status(201).json({ ok: true, data: inserted[0] });
    }

    // -- PUT: actualizar destino -----------------------------------
    if (req.method === 'PUT') {
      var id = req.query.id;
      if (!id) return res.status(400).json({ ok: false, error: 'id requerido' });

      var tags2 = safeJSON(b.tags) || {};

      // Construir SET dinamico -- solo actualizar campos que vienen en el body
      var sets = ['actualizado_en = NOW()'];
      var vals = [];
      var pi2  = 1;

      var fieldMap = {
        nombre:         b.nombre,
        categoria_slug: b.categoria_slug || b.cat,
        lead:           b.lead,
        descripcion:    b.descripcion || b.desc,
        highlight:      b.highlight,
        ciudad:         b.ciudad || b.city,
        region:         b.region,
        barrio:         b.barrio,
        whatsapp:       b.whatsapp,
        telefono:       b.telefono || b.tel,
        email:          b.email,
        web:            b.web,
        instagram:      b.instagram,
        precio_desde:   b.precio_desde || b.price,
        horario:        b.horario,
        emoji:          b.emoji,
        hero_bg:        b.hero_bg,
        foto_hero:      b.foto_hero,
        tipo:           b.tipo,
        capacidad:      b.capacidad,
        como_llegar:    b.como_llegar,
        status:         b.status,
      };

      Object.keys(fieldMap).forEach(function(col) {
        var val = fieldMap[col];
        if (val !== undefined && val !== null && val !== '') {
          sets.push(col + ' = $' + pi2++);
          vals.push(String(val).trim());
        }
      });

      // Campos numericos
      if (b.lat !== undefined && b.lat !== null) {
        sets.push('lat = $' + pi2++);
        vals.push(parseFloat(b.lat) || null);
      }
      if (b.lng !== undefined && b.lng !== null) {
        sets.push('lng = $' + pi2++);
        vals.push(parseFloat(b.lng) || null);
      }
      if (b.destacado !== undefined) {
        sets.push('destacado = $' + pi2++);
        vals.push(Boolean(b.destacado));
      }

      // Tags JSONB -- merge con los existentes
      if (Object.keys(tags2).length > 0) {
        sets.push('tags = COALESCE(tags, \'{}\'::jsonb) || $' + pi2++ + '::jsonb');
        vals.push(JSON.stringify(tags2));
      }

      vals.push(id); // WHERE id = $N

      var updated = await sql(
        'UPDATE destinos SET ' + sets.join(', ') + ' WHERE id = $' + pi2
        + ' RETURNING id, slug, nombre, ciudad, foto_hero, lat, lng, status',
        vals
      );

      if (!updated.length) return res.status(404).json({ ok: false, error: 'No encontrado' });

      // Actualizar detalles si hay datos
      var habs2  = safeJSON(b.habitaciones) || safeJSON(b.habs) || null;
      var amens2 = safeJSON(b.amenidades)   || safeJSON(b.amenities) || null;
      var faqs2  = safeJSON(b.faqs) || null;
      if (habs2 || amens2 || faqs2 || b.checkin || b.booking_url) {
        await sql(
          'INSERT INTO destinos_detalles (destino_id, checkin, checkout, habitaciones, amenidades, faqs, booking_url, hostelworld_url, airbnb_url) '
          + 'VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) '
          + 'ON CONFLICT (destino_id) DO UPDATE SET '
          + 'checkin=COALESCE(EXCLUDED.checkin, destinos_detalles.checkin), '
          + 'checkout=COALESCE(EXCLUDED.checkout, destinos_detalles.checkout), '
          + 'habitaciones=COALESCE(EXCLUDED.habitaciones, destinos_detalles.habitaciones), '
          + 'amenidades=COALESCE(EXCLUDED.amenidades, destinos_detalles.amenidades), '
          + 'faqs=COALESCE(EXCLUDED.faqs, destinos_detalles.faqs), '
          + 'booking_url=COALESCE(EXCLUDED.booking_url, destinos_detalles.booking_url)',
          [id, b.checkin||null, b.checkout||null,
           habs2 ? JSON.stringify(habs2) : null,
           amens2 ? JSON.stringify(amens2) : null,
           faqs2 ? JSON.stringify(faqs2) : null,
           b.booking_url||null, b.hostelworld_url||null, b.airbnb_url||null]
        ).catch(function(){});
      }

      // Guardar fotos de galeria
      if (b.fotos_galeria && b.fotos_galeria.length) {
        for (var j = 0; j < b.fotos_galeria.length; j++) {
          var fg2 = b.fotos_galeria[j];
          if (!fg2.url) continue;
          await sql(
            'INSERT INTO destinos_fotos (destino_id, url, caption, orden, es_hero, creado_en) '
            + 'VALUES ($1,$2,$3,$4,false,NOW()) ON CONFLICT DO NOTHING',
            [id, fg2.url, fg2.caption||'', fg2.orden||j]
          ).catch(function(){});
        }
      }

      return res.json({ ok: true, data: updated[0] });
    }

    // -- DELETE -------------------------------------------------------
    if (req.method === 'DELETE') {
      var delId = req.query.id;
      if (!delId) return res.status(400).json({ ok: false, error: 'id requerido' });

      await sql('DELETE FROM destinos_fotos    WHERE destino_id = $1', [delId]).catch(function(){});
      await sql('DELETE FROM destinos_detalles WHERE destino_id = $1', [delId]).catch(function(){});
      await sql('DELETE FROM interacciones     WHERE destino_id = $1', [delId]).catch(function(){});
      var del = await sql('DELETE FROM destinos WHERE id = $1 RETURNING id, slug, nombre', [delId]);

      if (!del.length) return res.status(404).json({ ok: false, error: 'No encontrado' });
      return res.json({ ok: true, deleted: del[0] });
    }

    return res.status(405).json({ ok: false, error: 'Method not allowed' });

  } catch(err) {
    console.error('[admin-destinos-v2]', err.message);
    return res.status(500).json({ ok: false, error: err.message });
  }
};
