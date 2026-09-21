// api/admin-destinos.js v2.2 (ASCII-safe: 0 backticks, 0 no-ASCII)
// GET    ?limit=N           -> listar destinos (auth)
// GET    ?id=UUID           -> obtener uno
// POST                      -> crear destino
// PUT    ?id=UUID           -> actualizar destino
// DELETE ?id=UUID           -> eliminar destino
// DIAGNOSTICO: buscar 'admin-destinos-v2' en consola para confirmar version
// v2.2: MERGE transaccional de galeria (BUG-079): preserva ids de destinos_fotos
//       en el UPDATE (votos/comentarios curados cuelgan de id::text), sin DELETE+re-INSERT.

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

// Normaliza el resumen corto (sintro): colapsa saltos/tabs y espacios
// multiples a un espacio, recorta a 200 caracteres y devuelve null si
// queda vacio (permite limpiar el campo desde el admin, ADR-034).
function normSintro(v) {
  if (v === undefined || v === null) return null;
  var s = String(v).replace(/[\r\n\t]+/g, ' ').replace(/\s{2,}/g, ' ').trim();
  return s ? s.slice(0, 200) : null;
}

// Normaliza la galeria: descarta items sin url valida, deduplica por url (trim),
// conserva el orden de entrada, el flag es_hero y el id real de Neon cuando
// viene (uuid canonico o serial numerico -> se preserva para el MERGE, BUG-079).
// Sin id o id invalido -> null (foto nueva). Clientes viejos que envien fotos
// sin id siguen funcionando (fallback por url en el merge). Unico lugar de la regla.
function normFotosGaleria(lista) {
  var vistas  = {};
  var limpias = [];
  for (var i = 0; i < lista.length; i++) {
    var f = lista[i];
    if (!f || !f.url) continue;
    var url = String(f.url).trim();
    if (!url || vistas[url]) continue;
    vistas[url] = true;
    var pid = null;
    if (typeof f.id === 'string') {
      var idv = f.id.trim();
      // El tipo real de destinos_fotos.id no esta versionado (preflight 6.1 de
      // la migracion 023, patron BUG-021): se acepta uuid o serial numerico.
      if (idv && /^(?:[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}|[0-9]{1,10})$/.test(idv)) {
        pid = idv;
      }
    }
    limpias.push({
      id:      pid,
      url:     url,
      caption: f.caption || '',
      orden:   (typeof f.orden === 'number' ? f.orden : limpias.length),
      es_hero: f.es_hero === true,
    });
  }
  return limpias;
}

// MERGE de destinos_fotos (BUG-079) dentro de UNA transaccion por request
// (sql.transaction del driver neon 0.9.x: lote no-interactivo atomico).
// Reemplaza la semantica DELETE + re-INSERT de ids nuevos, que dejaba huerfanos
// los votos/comentarios curados (media_votos/media_comentarios cuelgan de
// destinos_fotos.id::text con fuente='curada').
// Pasos: 1) lee las filas actuales del destino (id::text, url) fuera de la
// transaccion; 2) por cada foto normalizada: si trae id de una fila existente
// u match por id -> UPDATE conservando el id; sin id -> match por url unica sin
// usar (fallback legacy de clientes sin ids), UPDATE conservando el id; sin
// match -> INSERT con id nuevo; 3) DELETE parametrico (lista dinamica de $n)
// de filas no usadas (fotos que el usuario retiro); 4) coherencia del hero:
// foto_hero explicito (fotoHeroUrl) marca es_hero en su foto, y sin foto_hero
// explicito se sincroniza destinos.foto_hero desde la foto es_hero del payload.
// Devuelve {ok:false} sin tocar la base si la lista normalizada queda vacia
// (auditoria QA: el DELETE previo a un bucle sin inserciones dejaba el destino
// sin fotos).
async function reemplazarFotosGaleria(sql, destinoId, lista, fotoHeroUrl) {
  var limpias = normFotosGaleria(lista);
  if (!limpias.length) return { ok: false, total: 0 };

  var existentes = await sql(
    'SELECT id::text AS id, url FROM destinos_fotos '
    + 'WHERE destino_id = $1 ORDER BY orden ASC NULLS LAST, creado_en ASC',
    [destinoId]
  );

  var porId = {};
  for (var i = 0; i < existentes.length; i++) porId[existentes[i].id] = existentes[i];

  var usados  = {};
  var plan    = [];
  var heroUrl = null;

  for (var j = 0; j < limpias.length; j++) {
    var f    = limpias[j];
    var hero = f.es_hero === true || !!(fotoHeroUrl && f.url === fotoHeroUrl);
    if (hero) heroUrl = f.url;
    var blanco = null;
    if (f.id && porId[f.id]) {
      blanco = porId[f.id];
    } else {
      for (var k = 0; k < existentes.length; k++) {
        var ex = existentes[k];
        if (!usados[ex.id] && ex.url === f.url) { blanco = ex; break; }
      }
    }
    if (blanco) {
      usados[blanco.id] = true;
      plan.push({ update: true, fila: blanco, f: f, hero: hero });
    } else {
      plan.push({ update: false, f: f, hero: hero });
    }
  }

  var quer = [];

  for (var q = 0; q < plan.length; q++) {
    var op = plan[q];
    if (op.update) {
      quer.push({
        sql: 'UPDATE destinos_fotos SET url = $1, caption = $2, orden = $3, es_hero = $4 '
          + 'WHERE id = $5 AND destino_id = $6',
        params: [op.f.url, op.f.caption, op.f.orden, op.hero, op.fila.id, destinoId]
      });
    } else {
      quer.push({
        sql: 'INSERT INTO destinos_fotos (destino_id, url, caption, orden, es_hero, creado_en) '
          + 'VALUES ($1,$2,$3,$4,$5,NOW()) ON CONFLICT DO NOTHING',
        params: [destinoId, op.f.url, op.f.caption, op.f.orden, op.hero]
      });
    }
  }

  // Filas existentes que el usuario retiro: DELETE parametrico por lista de ids
  // ($n dinamicos; los valores nunca se concatenan al SQL).
  var sobran = [];
  for (var s = 0; s < existentes.length; s++) {
    if (!usados[existentes[s].id]) sobran.push(existentes[s].id);
  }
  if (sobran.length) {
    var phs = [];
    var pv  = [destinoId];
    for (var d = 0; d < sobran.length; d++) {
      phs.push('$' + (d + 2));
      pv.push(sobran[d]);
    }
    quer.push({
      sql: 'DELETE FROM destinos_fotos WHERE destino_id = $1 AND id IN (' + phs.join(',') + ')',
      params: pv
    });
  }

  // Coherencia del hero: sin foto_hero explicito, la foto es_hero del payload
  // pasa a destinos.foto_hero (misma semantica que el POST de utilidades).
  if (!fotoHeroUrl && heroUrl) {
    quer.push({
      sql: 'UPDATE destinos SET foto_hero = $1, actualizado_en = NOW() WHERE id = $2',
      params: [heroUrl, destinoId]
    });
  }

  await sql.transaction(function(tx) {
    var out = [];
    for (var t = 0; t < quer.length; t++) {
      out.push(tx(quer[t].sql, quer[t].params));
    }
    return out;
  }).catch(function(e) {
    console.error('[admin-destinos] merge galeria en transaccion:', e && e.message);
    throw e;
  });

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
        'SELECT d.id, d.slug, d.nombre, d.categoria_slug, d.ciudad, d.region, d.zona, '
        + 'd.lead, d.descripcion, d.highlight, d.sintro, d.foto_hero, d.hero_bg, '
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
        + 'ciudad, region, barrio, zona, address, '
        + 'lat, lng, '
        + 'whatsapp, telefono, email, web, instagram, '
        + 'precio_desde, horario, emoji, hero_bg, foto_hero, '
        + 'booking, hostelworld, airbnb, '
        + 'tipo, capacidad, como_llegar, '
        + 'status, destacado, verificado, tags, radio_m, sintro, '
        + 'creado_en, actualizado_en '
        + ') VALUES ( '
        + '$1, $2, $3, '
        + '$4, $5, $6, '
        + '$7, $8, $9, $10, $11, '
        + '$12, $13, '
        + '$14, $15, $16, $17, $18, '
        + '$19, $20, $21, $22, $23, '
        + '$24, $25, $26, '
        + '$27, $28, $29, '
        + '$30, $31, $32, $33, $34, $35, '
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
          (b.zona ? String(b.zona).trim() : null),
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
          normSintro(b.sintro),
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
      // destino preexistente: se aplica el mismo MERGE seguro del PUT (preserva
      // ids de fotos existentes y sus votos, BUG-079).
      if (b.fotos_galeria && b.fotos_galeria.length) {
        var repN = await reemplazarFotosGaleria(
          sql, newId, b.fotos_galeria,
          b.foto_hero ? String(b.foto_hero).trim() : null
        );
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
        zona:           b.zona,
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
      // ADR-034: resumen corto (sintro). Se persiste normalizado y permite
      // limpiar el campo (vacio -> null) sin romper el fieldMap generico.
      if (b.sintro !== undefined) {
        sets.push('sintro = $' + pi2++);
        vals.push(normSintro(b.sintro));
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

      // Galeria: semantica MERGE (BUG-079) en una transaccion. Las fotos con id
      // existente se actualizan conservando el id (los votos/comentarios curados
      // cuelgan de destinos_fotos.id); las nuevas se insertan; las retiradas se
      // borran. Auditoria QA: si el payload trae items pero NINGUNO pasa el
      // filtro (sin url valida), la lista limpia queda vacia -> NO se borra nada
      // y se responde 400.
      if (b.fotos_galeria && b.fotos_galeria.length) {
        var repP = await reemplazarFotosGaleria(
          sql, id, b.fotos_galeria,
          b.foto_hero ? String(b.foto_hero).trim() : null
        );
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
