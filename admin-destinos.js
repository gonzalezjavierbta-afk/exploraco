// api/admin-destinos.js -- Vercel Serverless Function (v3)
// Contrato de payload verificado contra admin.html _placeToAPI() (linea 4254).
// Nombres de columna = nombres reales de Neon. Ver BLUEPRINT.md seccion 3
// y BUGS_HISTORICOS.md BUG-007.
const { neon } = require('@neondatabase/serverless');

// Helper: castea un valor a JSON string para insertar como ::jsonb.
// Devuelve null si no hay dato (para que COALESCE no borre datos existentes
// en UPDATE -- Protocolo Cero Borrado Logico, Reglas de Oro v5 punto 3).
function toJsonOrNull(val, isArray) {
  if (val === undefined || val === null) return null;
  if (isArray && Array.isArray(val) && val.length === 0) return null;
  if (!isArray && typeof val === 'object' && Object.keys(val).length === 0) return null;
  return JSON.stringify(val);
}

// Upsert en destinos_detalles (checkin/checkout/habitaciones/amenidades/
// faqs/booking_url/transporte/scores). Solo se ejecuta si hay al menos un
// campo relevante en el payload, para no crear filas vacias en categorias
// que no usan destinos_detalles (ej. Sitio).
async function upsertDetalles(sql, destinoId, b) {
  var hasData = b.checkin || b.checkout || b.booking_url
    || (b.habitaciones && b.habitaciones.length)
    || (b.amenidades && b.amenidades.length)
    || (b.faqs && b.faqs.length)
    || (b.transporte && b.transporte.length)
    || (b.scores && Object.keys(b.scores).length);
  if (!hasData) return;

  var habJson   = toJsonOrNull(b.habitaciones, true);
  var amenJson  = toJsonOrNull(b.amenidades, true);
  var faqsJson  = toJsonOrNull(b.faqs, true);
  var transJson = toJsonOrNull(b.transporte, true);
  var scoresJson = toJsonOrNull(b.scores, false);

  await sql`
    INSERT INTO destinos_detalles (
      destino_id, checkin, checkout, habitaciones, amenidades,
      faqs, booking_url, transporte, scores
    ) VALUES (
      ${destinoId}, ${b.checkin || null}, ${b.checkout || null},
      ${habJson}::jsonb, ${amenJson}::jsonb, ${faqsJson}::jsonb,
      ${b.booking_url || null}, ${transJson}::jsonb, ${scoresJson}::jsonb
    )
    ON CONFLICT (destino_id) DO UPDATE SET
      checkin      = COALESCE(EXCLUDED.checkin,      destinos_detalles.checkin),
      checkout     = COALESCE(EXCLUDED.checkout,     destinos_detalles.checkout),
      habitaciones = COALESCE(EXCLUDED.habitaciones, destinos_detalles.habitaciones),
      amenidades   = COALESCE(EXCLUDED.amenidades,   destinos_detalles.amenidades),
      faqs         = COALESCE(EXCLUDED.faqs,         destinos_detalles.faqs),
      booking_url  = COALESCE(EXCLUDED.booking_url,  destinos_detalles.booking_url),
      transporte   = COALESCE(EXCLUDED.transporte,   destinos_detalles.transporte),
      scores       = COALESCE(EXCLUDED.scores,       destinos_detalles.scores)
  `;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(204).end();

  const auth = req.headers.authorization || '';
  const ADMIN_SECRET = process.env.ADMIN_SECRET || 'exploraco12345';
  if (auth !== 'Bearer ' + ADMIN_SECRET) {
    return res.status(401).json({ ok: false, error: 'No autorizado' });
  }

  try {
    const sql = neon(process.env.DATABASE_URL);
    const { id, limit = '500', offset = '0' } = req.query;

    if (req.method === 'GET') {
      const rows = await sql`
        SELECT d.*, dd.habitaciones, dd.amenidades, dd.checkin, dd.checkout,
               dd.booking_url, dd.hostelworld_url, dd.faqs, dd.transporte, dd.scores
        FROM destinos d
        LEFT JOIN destinos_detalles dd ON d.id = dd.destino_id
        ORDER BY d.creado_en DESC
        LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}
      `;
      const total = await sql`SELECT COUNT(*) as n FROM destinos`;
      return res.json({ ok: true, total: parseInt(total[0].n), data: rows });
    }

    if (req.method === 'POST') {
      const b = req.body || {};
      if (!b.nombre || !b.categoria_slug) {
        return res.status(400).json({ ok: false, error: 'nombre y categoria_slug requeridos' });
      }
      if (!b.slug) {
        b.slug = b.nombre.toLowerCase()
          .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      }

      // Mapeo BUG-007: nombre correcto de Neon primero, alias legado como
      // respaldo por compatibilidad (nunca al reves).
      const ciudad      = b.ciudad      || b.city  || '';
      const descripcion = b.descripcion || b.desc  || '';
      const telefono    = b.telefono    || b.tel   || '';
      const precioDesde = b.precio_desde || b.price || '';
      const tagsJson     = JSON.stringify(b.tags || {});

      const rows = await sql`
        INSERT INTO destinos (
          slug, nombre, categoria_slug, lead, descripcion, highlight,
          ciudad, region, barrio, lat, lng, whatsapp, telefono, email, web,
          instagram, booking, hostelworld, airbnb, precio_desde, horario,
          emoji, hero_bg, foto_hero, tipo, capacidad, como_llegar,
          rating, total_resenas, status, destacado, tags
        ) VALUES (
          ${b.slug}, ${b.nombre}, ${b.categoria_slug},
          ${b.lead || ''}, ${descripcion}, ${b.highlight || ''},
          ${ciudad}, ${b.region || ''}, ${b.barrio || ''},
          ${b.lat || null}, ${b.lng || null}, ${b.whatsapp || ''},
          ${telefono}, ${b.email || ''}, ${b.web || ''},
          ${b.instagram || ''}, ${b.booking || ''}, ${b.hostelworld || ''},
          ${b.airbnb || ''}, ${precioDesde}, ${b.horario || ''},
          ${b.emoji || '\uD83D\uDCCD'},
          ${b.hero_bg || 'linear-gradient(135deg,#111,#222)'},
          ${b.foto_hero || ''}, ${b.tipo || ''}, ${b.capacidad || ''},
          ${b.como_llegar || ''},
          ${b.rating || 0}, ${b.total_resenas || b.reviews || 0},
          ${b.status || 'draft'}, ${b.destacado || false}, ${tagsJson}::jsonb
        )
        ON CONFLICT (slug) DO UPDATE SET
          nombre         = EXCLUDED.nombre,
          categoria_slug = EXCLUDED.categoria_slug,
          lead           = EXCLUDED.lead,
          descripcion    = COALESCE(NULLIF(EXCLUDED.descripcion,''), destinos.descripcion),
          highlight      = COALESCE(NULLIF(EXCLUDED.highlight,''),   destinos.highlight),
          ciudad         = COALESCE(NULLIF(EXCLUDED.ciudad,''),      destinos.ciudad),
          region         = COALESCE(NULLIF(EXCLUDED.region,''),      destinos.region),
          barrio         = COALESCE(NULLIF(EXCLUDED.barrio,''),      destinos.barrio),
          telefono       = COALESCE(NULLIF(EXCLUDED.telefono,''),    destinos.telefono),
          precio_desde   = COALESCE(NULLIF(EXCLUDED.precio_desde,''),destinos.precio_desde),
          status         = EXCLUDED.status,
          destacado      = EXCLUDED.destacado,
          tags           = COALESCE(destinos.tags,'{}') || EXCLUDED.tags,
          actualizado_en = NOW()
        RETURNING id, slug, nombre
      `;

      const destinoId = rows[0].id;
      await upsertDetalles(sql, destinoId, b);

      return res.status(201).json({ ok: true, data: rows[0] });
    }

    if (req.method === 'PUT') {
      if (!id) return res.status(400).json({ ok: false, error: 'Falta id' });
      const b = req.body || {};

      const ciudad      = b.ciudad      || b.city  || null;
      const descripcion = b.descripcion || b.desc  || null;
      const telefono    = b.telefono    || b.tel   || null;
      const precioDesde = b.precio_desde || b.price || null;
      const tagsJson = (b.tags && Object.keys(b.tags).length) ? JSON.stringify(b.tags) : null;

      await sql`
        UPDATE destinos SET
          nombre         = COALESCE(${b.nombre || null},         nombre),
          categoria_slug = COALESCE(${b.categoria_slug || null}, categoria_slug),
          lead           = COALESCE(${b.lead || null},           lead),
          descripcion    = COALESCE(${descripcion},               descripcion),
          highlight      = COALESCE(${b.highlight || null},      highlight),
          ciudad         = COALESCE(${ciudad},                    ciudad),
          region         = COALESCE(${b.region || null},         region),
          barrio         = COALESCE(${b.barrio || null},         barrio),
          lat            = COALESCE(${b.lat || null},            lat),
          lng            = COALESCE(${b.lng || null},            lng),
          whatsapp       = COALESCE(${b.whatsapp || null},       whatsapp),
          telefono       = COALESCE(${telefono},                  telefono),
          email          = COALESCE(${b.email || null},          email),
          web            = COALESCE(${b.web || null},            web),
          instagram      = COALESCE(${b.instagram || null},      instagram),
          booking        = COALESCE(${b.booking || null},        booking),
          hostelworld    = COALESCE(${b.hostelworld || null},    hostelworld),
          airbnb         = COALESCE(${b.airbnb || null},         airbnb),
          precio_desde   = COALESCE(${precioDesde},               precio_desde),
          horario        = COALESCE(${b.horario || null},        horario),
          emoji          = COALESCE(${b.emoji || null},          emoji),
          hero_bg        = COALESCE(${b.hero_bg || null},        hero_bg),
          foto_hero      = COALESCE(${b.foto_hero || null},      foto_hero),
          tipo           = COALESCE(${b.tipo || null},           tipo),
          capacidad      = COALESCE(${b.capacidad || null},      capacidad),
          como_llegar    = COALESCE(${b.como_llegar || null},    como_llegar),
          status         = COALESCE(${b.status || null},         status),
          destacado      = COALESCE(${b.destacado ?? null},      destacado),
          tags           = COALESCE(tags,'{}') || COALESCE(${tagsJson}::jsonb, '{}'::jsonb),
          actualizado_en = NOW()
        WHERE id = ${id}
      `;

      await upsertDetalles(sql, id, b);

      return res.json({ ok: true, id });
    }

    if (req.method === 'DELETE') {
      if (!id) return res.status(400).json({ ok: false, error: 'Falta id' });
      await sql`DELETE FROM destinos WHERE id = ${id}`;
      return res.json({ ok: true });
    }

    return res.status(405).json({ ok: false, error: 'M\u00e9todo no permitido' });

  } catch (err) {
    console.error('[admin-destinos]', err.message);
    return res.status(500).json({ ok: false, error: err.message });
  }
};
