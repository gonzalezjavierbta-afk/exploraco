// api/destinos.js  v5 — schema 100% real confirmado
// destinos_detalles: checkin, checkout, habitaciones, amenidades, faqs (JSONB separados)
// interacciones: rating (no puntuacion), creado_en (no created_at)
// destinos: tags JSONB para datos del formulario público

const { neon } = require('@neondatabase/serverless');

const CAT_EMOJI  = { hostal:'🏨', comida:'🍽️', sitio:'🏔️', evento:'🎉' };
const CAT_COLORS = {
  hostal: 'linear-gradient(135deg,#1a3a5c,#2a4a7c)',
  comida: 'linear-gradient(135deg,#3a1a0a,#4a2a1a)',
  sitio:  'linear-gradient(135deg,#0a2a1a,#1a3a2a)',
  evento: 'linear-gradient(135deg,#1a051a,#3a1a3a)',
};

function safeJSON(val) {
  if (!val) return null;
  if (typeof val === 'object') return val;
  try { return JSON.parse(val); } catch(_) { return null; }
}

function toPlace(d, det) {
  var cat    = d.categoria_slug || 'sitio';
  var emoji  = d.emoji || CAT_EMOJI[cat] || '📍';
  var heroBg = d.hero_bg || CAT_COLORS[cat] || '';
  var foto   = d.foto_hero || '';

  // Detalles de destinos_detalles (JSONB separados)
  var amenidades   = safeJSON(det && det.amenidades)   || [];
  var habitaciones = safeJSON(det && det.habitaciones) || [];
  var faqs         = safeJSON(det && det.faqs)         || [];

  // Fallback a tags JSONB en destinos (para lugares del formulario público)
  var tags = safeJSON(d.tags) || {};
  if (!amenidades.length   && tags.amenidades)   amenidades   = tags.amenidades;
  if (!habitaciones.length && tags.habitaciones) habitaciones = tags.habitaciones;
  if (!faqs.length         && tags.faqs)         faqs         = tags.faqs;

  // Links de reserva
  var booking     = (det && det.booking_url)     || d.booking     || '';
  var hostelworld = (det && det.hostelworld_url) || d.hostelworld || '';
  var airbnb      = (det && det.airbnb_url)      || d.airbnb      || '';

  return {
    id:         d.id,
    slug:       d.slug        || '',
    name:       d.nombre      || '',
    cat:        cat,
    city:       d.ciudad      || '',
    region:     d.region      || '',
    barrio:     d.barrio      || '',
    lead:       d.lead        || '',
    desc:       d.descripcion || d.lead || '',
    highlight:  d.highlight   || '',
    price:      d.precio_desde|| '',
    emoji:      emoji,
    hero_bg:    heroBg,
    foto:       foto,
    lat:        d.lat  ? parseFloat(d.lat)  : 0,
    lng:        d.lng  ? parseFloat(d.lng)  : 0,
    rating:     d.rating        ? parseFloat(d.rating)        : 0,
    reviews:    d.total_resenas ? parseInt(d.total_resenas)   : 0,
    status:     d.status        || 'published',
    destacado:  d.destacado     || false,
    verificado: d.verificado    || false,
    whatsapp:   d.whatsapp   || '',
    tel:        d.telefono   || '',
    email:      d.email      || '',
    web:        d.web        || '',
    instagram:  d.instagram  || '',
    horario:    d.horario    || '',
    como_llegar:d.como_llegar|| '',
    tipo:       d.tipo       || '',
    capacidad:  d.capacidad  || '',
    booking,
    hostelworld,
    airbnb,
    checkin:    (det && det.checkin)  || tags.checkin  || '',
    checkout:   (det && det.checkout) || tags.checkout || '',
    // photos[] para los connectors frontend
    photos: foto ? [{ url: foto, cap: d.nombre || '' }] : [],
    amenities:    amenidades,
    habs:         habitaciones,
    faqs:         faqs,
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

    var cat       = req.query.categoria || req.query.cat || null;
    var ciudad    = req.query.ciudad    || req.query.city || null;
    var destacado = req.query.destacados === 'true' || req.query.destacado === 'true';
    var modo      = req.query.modo      || null;
    var busqueda  = req.query.q         || null;
    var limit     = Math.min(parseInt(req.query.limit)  || 500, 500);
    var offset    = Math.max(parseInt(req.query.offset) || 0, 0);

    // WHERE dinámico
    var conditions = ["d.status = 'published'"];
    var params = [];
    var pi = 1;

    if (cat) {
      conditions.push('d.categoria_slug = $' + pi++);
      params.push(cat);
    }
    if (ciudad) {
      conditions.push('d.ciudad ILIKE $' + pi++);
      params.push('%' + ciudad + '%');
    }
    if (destacado) {
      conditions.push('d.destacado = true');
    }
    if (busqueda) {
      conditions.push(
        '(d.nombre ILIKE $'+pi+' OR d.lead ILIKE $'+pi+' OR d.ciudad ILIKE $'+pi+')'
      );
      params.push('%' + busqueda + '%');
      pi++;
    }

    var where = conditions.join(' AND ');

    // ── Modo mapa: mínimo de campos ──────────────────────────────
    if (modo === 'mapa') {
      var mapaRows = await sql(
        `SELECT id, slug, nombre, categoria_slug, ciudad, lat, lng,
                emoji, foto_hero, rating, total_resenas, destacado
         FROM destinos d
         WHERE ${where} AND lat IS NOT NULL AND lng IS NOT NULL
         ORDER BY destacado DESC, rating DESC NULLS LAST
         LIMIT $${pi} OFFSET $${pi+1}`,
        [...params, limit, offset]
      );

      return res.status(200).json({
        ok:    true,
        modo:  'mapa',
        total: mapaRows.length,
        data:  mapaRows.map(function(d) {
          return {
            id:     d.id,
            slug:   d.slug,
            name:   d.nombre,
            cat:    d.categoria_slug,
            city:   d.ciudad,
            lat:    parseFloat(d.lat),
            lng:    parseFloat(d.lng),
            emoji:  d.emoji || CAT_EMOJI[d.categoria_slug] || '📍',
            foto:   d.foto_hero || '',
            rating: d.rating ? parseFloat(d.rating) : 0,
            destacado: d.destacado || false,
          };
        }),
      });
    }

    // ── Modo normal: destinos + detalles JOIN ────────────────────
    var rows = await sql(
      `SELECT d.*,
              dd.checkin, dd.checkout, dd.recepcion,
              dd.habitaciones, dd.amenidades, dd.faqs,
              dd.booking_url, dd.hostelworld_url, dd.airbnb_url,
              dd.scores, dd.transporte
       FROM destinos d
       LEFT JOIN destinos_detalles dd ON dd.destino_id = d.id
       WHERE ${where}
       ORDER BY d.destacado DESC, d.rating DESC NULLS LAST, d.creado_en DESC
       LIMIT $${pi} OFFSET $${pi+1}`,
      [...params, limit, offset]
    );

    // Total
    var countRows = await sql(
      `SELECT COUNT(*) AS n FROM destinos d WHERE ${where}`,
      params
    );

    // Stats reales para contadores del homepage
    var statsRows = await sql(
      `SELECT
         COUNT(*)                           AS total_destinos,
         COUNT(DISTINCT ciudad)             AS total_ciudades,
         COALESCE(SUM(total_resenas), 0)   AS total_resenas,
         ROUND(AVG(rating)::numeric, 1)    AS rating_promedio
       FROM destinos
       WHERE status='published'`
    );
    var st = statsRows[0] || {};

    return res.status(200).json({
      ok:    true,
      total: parseInt((countRows[0]||{}).n || 0),
      stats: {
        destinos: parseInt(st.total_destinos  || 0),
        ciudades: parseInt(st.total_ciudades  || 0),
        resenas:  parseInt(st.total_resenas   || 0),
        rating:   st.rating_promedio ? parseFloat(st.rating_promedio) : 0,
      },
      data: rows.map(function(row) {
        // Separar columnas de destinos_detalles del resto
        var det = {
          checkin:        row.checkin,
          checkout:       row.checkout,
          habitaciones:   row.habitaciones,
          amenidades:     row.amenidades,
          faqs:           row.faqs,
          booking_url:    row.booking_url,
          hostelworld_url:row.hostelworld_url,
          airbnb_url:     row.airbnb_url,
        };
        return toPlace(row, det);
      }),
    });

  } catch(err) {
    console.error('[api/destinos]', err.message);
    return res.status(500).json({ ok: false, error: err.message });
  }
};
