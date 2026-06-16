// api/destinos.js  v6 — schema real, completo y definitivo
// JOIN destinos_detalles, stats reales, modo=mapa con color, campos evento

const { neon } = require('@neondatabase/serverless');

const CAT_EMOJI  = { hostal:'🏨', comida:'🍽️', sitio:'🏔️', evento:'🎉' };
const CAT_COLORS = {
  hostal: 'linear-gradient(135deg,#1a3a5c,#2a4a7c)',
  comida: 'linear-gradient(135deg,#3a1a0a,#4a2a1a)',
  sitio:  'linear-gradient(135deg,#0a2a1a,#1a3a2a)',
  evento: 'linear-gradient(135deg,#1a051a,#3a1a3a)',
};
const PIN_COLORS = {
  hostal:'#2196F3', comida:'#FF9800', sitio:'#4CAF50', evento:'#A855F7',
};

function safeJSON(val) {
  if (!val) return null;
  if (typeof val === 'object') return val;
  try { return JSON.parse(val); } catch(_) { return null; }
}

function toPlace(row) {
  var cat   = row.categoria_slug || 'sitio';
  var emoji = row.emoji || CAT_EMOJI[cat] || '📍';
  var foto  = row.foto_hero || '';

  var amenidades   = safeJSON(row.amenidades)   || [];
  var habitaciones = safeJSON(row.habitaciones) || [];
  var faqs         = safeJSON(row.faqs)         || [];
  var tags         = safeJSON(row.tags)         || {};

  if (!amenidades.length   && tags.amenidades)   amenidades   = tags.amenidades;
  if (!habitaciones.length && tags.habitaciones) habitaciones = tags.habitaciones;
  if (!faqs.length         && tags.faqs)         faqs         = tags.faqs;

  return {
    id:          row.id,
    slug:        row.slug          || '',
    name:        row.nombre        || '',
    cat:         cat,
    city:        row.ciudad        || '',
    region:      row.region        || '',
    barrio:      row.barrio        || '',
    lead:        row.lead          || '',
    desc:        row.descripcion   || row.lead || '',
    highlight:   row.highlight     || '',
    price:       row.precio_desde  || '',
    emoji:       emoji,
    hero_bg:     row.hero_bg       || CAT_COLORS[cat] || '',
    color:       PIN_COLORS[cat]   || '#666',
    foto:        foto,
    photos:      foto ? [{ url: foto, cap: row.nombre || '' }] : [],
    lat:         row.lat  ? parseFloat(row.lat)  : 0,
    lng:         row.lng  ? parseFloat(row.lng)  : 0,
    rating:      row.rating        ? parseFloat(row.rating)        : 0,
    reviews:     row.total_resenas ? parseInt(row.total_resenas)   : 0,
    status:      row.status        || 'published',
    destacado:   row.destacado     || false,
    verificado:  row.verificado    || false,
    whatsapp:    row.whatsapp      || '',
    tel:         row.telefono      || '',
    email:       row.email         || '',
    web:         row.web           || '',
    instagram:   row.instagram     || '',
    horario:     row.horario       || '',
    como_llegar: row.como_llegar   || '',
    tipo:        row.tipo          || '',
    capacidad:   row.capacidad     || '',
    // Links de reserva — destinos_detalles > columnas directas
    booking:     row.booking_url      || row.booking     || '',
    hostelworld: row.hostelworld_url  || row.hostelworld || '',
    airbnb:      row.airbnb_url       || row.airbnb      || '',
    checkin:     row.checkin          || (tags.checkin  || ''),
    checkout:    row.checkout         || (tags.checkout || ''),
    amenities:   amenidades,
    habs:        habitaciones,
    faqs:        faqs,
    // Campos específicos para AGENDA_EVENTS (eventos)
    day:         row.event_day        || null,
    month:       row.event_month      || null,
    time:        row.horario          || 'Consultar',
  };
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    var sql = neon(process.env.DATABASE_URL);

    var cat      = req.query.categoria || req.query.cat  || null;
    var ciudad   = req.query.ciudad    || req.query.city || null;
    var dest     = req.query.destacados === 'true'       || false;
    var modo     = req.query.modo                        || null;
    var q        = req.query.q                           || null;
    var limit    = Math.min(parseInt(req.query.limit)    || 500, 500);
    var offset   = Math.max(parseInt(req.query.offset)   || 0, 0);

    // WHERE dinámico
    var conds  = ["d.status = 'published'"];
    var params = [];
    var pi     = 1;

    if (cat) {
      conds.push('d.categoria_slug = $' + pi++);
      params.push(cat);
    }
    if (ciudad) {
      conds.push('d.ciudad ILIKE $' + pi++);
      params.push('%' + ciudad + '%');
    }
    if (dest) {
      conds.push('d.destacado = true');
    }
    if (q) {
      conds.push(
        '(d.nombre ILIKE $' + pi +
        ' OR d.lead ILIKE $' + pi +
        ' OR d.ciudad ILIKE $' + pi +
        ' OR d.descripcion ILIKE $' + pi + ')'
      );
      params.push('%' + q + '%');
      pi++;
    }

    var where = conds.join(' AND ');

    // ── Modo mapa: campos mínimos + color ────────────────────────
    if (modo === 'mapa') {
      var mapaRows = await sql(
        `SELECT id, slug, nombre, categoria_slug, ciudad, region,
                lat, lng, emoji, hero_bg, foto_hero, rating, total_resenas, destacado
         FROM destinos d
         WHERE ${where} AND lat IS NOT NULL AND lng IS NOT NULL
         ORDER BY destacado DESC, rating DESC NULLS LAST
         LIMIT $${pi} OFFSET $${pi+1}`,
        [...params, limit, offset]
      );

      return res.status(200).json({
        ok: true, modo: 'mapa',
        total: mapaRows.length,
        data: mapaRows.map(function(d) {
          var cat = d.categoria_slug || 'sitio';
          return {
            id:       d.id,
            slug:     d.slug,
            name:     d.nombre,
            cat:      cat,
            city:     d.ciudad || '',
            region:   d.region || '',
            lat:      parseFloat(d.lat),
            lng:      parseFloat(d.lng),
            emoji:    d.emoji   || CAT_EMOJI[cat] || '📍',
            hero_bg:  d.hero_bg || CAT_COLORS[cat] || '',
            color:    PIN_COLORS[cat] || '#666',   // ← requerido por Leaflet markers
            foto:     d.foto_hero || '',
            rating:   d.rating ? parseFloat(d.rating) : 0,
            reviews:  d.total_resenas ? parseInt(d.total_resenas) : 0,
            destacado:d.destacado || false,
          };
        }),
      });
    }

    // ── Modo normal: JOIN con destinos_detalles ───────────────────
    var rows = await sql(
      `SELECT d.*,
              dd.checkin, dd.checkout,
              dd.habitaciones, dd.amenidades, dd.faqs,
              dd.booking_url, dd.hostelworld_url, dd.airbnb_url
       FROM destinos d
       LEFT JOIN destinos_detalles dd ON dd.destino_id = d.id
       WHERE ${where}
       ORDER BY d.destacado DESC, d.rating DESC NULLS LAST, d.creado_en DESC
       LIMIT $${pi} OFFSET $${pi+1}`,
      [...params, limit, offset]
    );

    var countRows = await sql(
      `SELECT COUNT(*) AS n FROM destinos d WHERE ${where}`,
      params
    );

    // Stats reales para homepage
    var statsRows = await sql(
      `SELECT
         COUNT(*)                          AS total_destinos,
         COUNT(DISTINCT ciudad)            AS total_ciudades,
         COALESCE(SUM(total_resenas), 0)  AS total_resenas,
         ROUND(AVG(rating)::numeric, 1)   AS rating_promedio
       FROM destinos WHERE status = 'published'`
    );
    var st = statsRows[0] || {};

    return res.status(200).json({
      ok:    true,
      total: parseInt((countRows[0] || {}).n || 0),
      stats: {
        destinos: parseInt(st.total_destinos  || 0),
        ciudades: parseInt(st.total_ciudades  || 0),
        resenas:  parseInt(st.total_resenas   || 0),
        rating:   st.rating_promedio ? parseFloat(st.rating_promedio) : 0,
      },
      data: rows.map(toPlace),
    });

  } catch(err) {
    console.error('[api/destinos]', err.message);
    return res.status(500).json({ ok: false, error: err.message });
  }
};
