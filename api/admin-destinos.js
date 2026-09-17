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

// Normaliza la galeria: descarta items sin url valida, deduplica por url (trim),
// conserva el orden de entrada y el flag es_hero (unico lugar de la regla).
function normFotosGaleria(lista) {
  var vistas  = {};
  var limpias = [];
  for (var i = 0; i < lista.length; i++) {
    var f = lista[i];
    if (!f || !f.url) continue;
    var url = String(f.url).trim();
    if (!url || vistas[url]) continue;
    vistas[url] = true;
    limpias.push({
      url:     url,
      caption: f.caption || '',
      orden:   (typeof f.orden === 'number' ? f.orden : limpias.length),
      es_hero: f.es_hero === true,
    });
  }
  return limpias;
}

// Replace seguro de destinos_fotos: NUNCA borra si la lista normalizada queda vacia
// (auditoria QA: el DELETE previo a un bucle sin inserciones dejaba el destino sin fotos).
// Devuelve {ok:false} sin tocar la base en ese caso; el caller responde 400.
async function reemplazarFotosGaleria(sql, destinoId, lista) {
  var limpias = normFotosGaleria(lista);
  if (!limpias.length) return { ok: false, total: 0 };
  await sql('DELETE FROM destinos_fotos WHERE destino_id = $1', [destinoId]);
  for (var i = 0; i < limpias.length; i++) {
    var f = limpias[i];
    await sql(
      'INSERT INTO destinos_fotos (destino_id, url, caption, orden, es_hero, creado_en) '
      + 'VALUES ($1,$2,$3,$4,$5,NOW()) ON CONFLICT DO NOTHING',
      [destinoId, f.url, f.caption, f.orden, f.es_hero]
    ).catch(function(e){
      console.error('[admin-destinos] insert foto galeria:', e && e.message);
    });
  }
  return { ok: true, total: limpias.length };
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
        + 'd.lat, d.lng, d.radio_m, d.whatsapp, d.telefono, d.email, d.web, d.instagram, '
        + 'd.precio_desde, d.horario, d.emoji, d.status, d.destacado, d.verificado, '
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
        + 'ciudad, region, barrio, address, '
        + 'lat, lng, '
        + 'whatsapp, telefono, email, web, instagram, '
        + 'precio_desde, horario, emoji, hero_bg, foto_hero, '
        + 'booking, hostelworld, airbnb, '
        + 'tipo, capacidad, como_llegar, '
        + 'status, destacado, verificado, tags, radio_m, '
        + 'creado_en, actualizado_en '
        + ') VALUES ( '
        + '$1, $2, $3, '
        + '$4, $5, $6, '
        + '$7, $8, $9, $10, '
        + '$11, $12, '
        + '$13, $14, $15, $16, $17, '
        + '$18, $19, $20, $21, $22, '
        + '$23, $24, $25, '
        + '$26, $27, $28, '
        + '$29, $30, $31, $32, $33, '
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
          String(b.address||'').trim(),
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
          Boolean(b.verificado||false),
          JSON.stringify(tags),
          (function(){
            var rm = parseInt(b.radio_m, 10);
            return (b.radio_m !== undefined && b.radio_m !== null && b.radio_m !== ''
              && isFinite(rm) && rm >= 25 && rm <= 100000) ? rm : null;
          })(),
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

      // Guardar fotos de galeria. El INSERT de arriba es un UPSERT por slug
      // (ON CONFLICT (slug) DO UPDATE RETURNING id), asi que newId puede apuntar a un
      // destino preexistente: se aplica el mismo replace seguro del PUT.
      if (b.fotos_galeria && b.fotos_galeria.length) {
        var repN = await reemplazarFotosGaleria(sql, newId, b.fotos_galeria);
        if (!repN.ok) {
          return res.status(400).json({ ok: false, error: 'Ninguna foto con url valida' });
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
        address:        b.address,
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
      // ADR-033: radio de verificacion de "Estuve aqui" (metros). Permite
      // vaciar el radio (null = heuristica adaptativa).
      if (b.radio_m !== undefined) {
        var rmUpd = parseInt(b.radio_m, 10);
        sets.push('radio_m = $' + pi2++);
        vals.push((b.radio_m !== null && b.radio_m !== '' && isFinite(rmUpd)
          && rmUpd >= 25 && rmUpd <= 100000) ? rmUpd : null);
      }
      if (b.destacado !== undefined) {
        sets.push('destacado = $' + pi2++);
        vals.push(Boolean(b.destacado));
      }
      if (b.verificado !== undefined) {
        sets.push('verificado = $' + pi2++);
        vals.push(Boolean(b.verificado));
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

      // Galeria: semantica replace (DELETE + reinsert deduplicado por url).
      // Auditoria QA: si el payload trae items pero NINGUNO pasa el filtro (sin url
      // valida), la lista limpia queda vacia -> NO se borra nada y se responde 400.
      if (b.fotos_galeria && b.fotos_galeria.length) {
        var repP = await reemplazarFotosGaleria(sql, id, b.fotos_galeria);
        if (!repP.ok) {
          return res.status(400).json({ ok: false, error: 'Ninguna foto con url valida' });
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
