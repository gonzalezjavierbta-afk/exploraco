// api/destinos.js  v4 — schema real confirmado
// Devuelve destinos published en el formato exacto que esperan:
//   - index-api-connector.js  → PL[] y MAPA_PLACES[]
//   - directorio-api-connector.js → PL[]
//   - Campos del objeto interno del admin: name, cat, city, region, price, lead,
//     emoji, hero_bg, photos, rating, reviews, slug, lat, lng, whatsapp, web, instagram

const { neon } = require('@neondatabase/serverless');

// Mapeo emoji por categoría (fallback si la DB no lo tiene)
const CAT_EMOJI  = { hostal:'🏨', comida:'🍽️', sitio:'🏔️', evento:'🎉' };
const CAT_COLORS = {
  hostal:  'linear-gradient(135deg,#1a3a5c,#2a4a7c)',
  comida:  'linear-gradient(135deg,#3a1a0a,#4a2a1a)',
  sitio:   'linear-gradient(135deg,#0a2a1a,#1a3a2a)',
  evento:  'linear-gradient(135deg,#1a051a,#3a1a3a)',
};

// Convierte una fila de Neon al formato PL[] que usan los connectors y el admin
function toPlace(d) {
  var cat    = d.categoria_slug || 'sitio';
  var emoji  = d.emoji || CAT_EMOJI[cat] || '📍';
  var heroBg = d.hero_bg || CAT_COLORS[cat] || 'linear-gradient(135deg,#1a1a2e,#16213e)';
  var foto   = d.foto_hero || '';

  // tags JSONB → amenidades, habitaciones, etc.
  var tags = {};
  if (d.tags) {
    try { tags = typeof d.tags === 'string' ? JSON.parse(d.tags) : d.tags; } catch(_) {}
  }

  return {
    id:        d.id,
    slug:      d.slug       || '',
    name:      d.nombre     || '',
    cat:       cat,
    city:      d.ciudad     || '',
    region:    d.region     || '',
    barrio:    d.barrio     || '',
    lead:      d.lead       || '',
    desc:      d.descripcion|| d.lead || '',
    highlight: d.highlight  || '',
    price:     d.precio_desde || '',
    emoji:     emoji,
    hero_bg:   heroBg,
    lat:       d.lat   ? parseFloat(d.lat)   : 0,
    lng:       d.lng   ? parseFloat(d.lng)   : 0,
    rating:    d.rating       ? parseFloat(d.rating)       : 0,
    reviews:   d.total_resenas ? parseInt(d.total_resenas) : 0,
    status:    d.status       || 'published',
    destacado: d.destacado    || false,
    verificado:d.verificado   || false,
    whatsapp:  d.whatsapp  || '',
    tel:       d.telefono  || '',
    email:     d.email     || '',
    web:       d.web       || '',
    instagram: d.instagram || '',
    horario:   d.horario   || '',
    como_llegar: d.como_llegar || '',
    booking:     d.booking    || '',
    hostelworld: d.hostelworld|| '',
    airbnb:      d.airbnb     || '',
    tipo:        d.tipo       || '',
    capacidad:   d.capacidad  || '',
    // Foto principal como primer elemento de photos[]
    photos: foto ? [{ url: foto, cap: d.nombre || '' }] : [],
    // Desde tags JSONB
    amenities:    tags.amenidades   || [],
    habs:         tags.habitaciones || [],
    faqs:         tags.faqs         || [],
    checkin:      tags.checkin      || '',
    checkout:     tags.checkout     || '',
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

    // Parámetros de filtro
    var cat       = req.query.categoria  || req.query.cat || null;
    var ciudad    = req.query.ciudad     || req.query.city || null;
    var destacado = req.query.destacados === 'true' || req.query.destacado === 'true';
    var modo      = req.query.modo       || null;     // 'mapa' → devuelve solo lat/lng/id/slug/name/cat
    var busqueda  = req.query.q          || null;
    var limit     = Math.min(parseInt(req.query.limit)  || 500, 500);
    var offset    = Math.max(parseInt(req.query.offset) || 0, 0);

    // Construir WHERE dinámico
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
      conditions.push('(d.nombre ILIKE $' + pi + ' OR d.lead ILIKE $' + pi + ' OR d.ciudad ILIKE $' + pi + ')');
      params.push('%' + busqueda + '%');
      pi++;
    }

    var where = conditions.join(' AND ');

    // Modo mapa: solo campos mínimos para markers
    if (modo === 'mapa') {
      var mapaRows = await sql(
        `SELECT id, slug, nombre, categoria_slug, ciudad, lat, lng,
                emoji, foto_hero, rating, total_resenas
         FROM destinos d
         WHERE ${where} AND lat IS NOT NULL AND lng IS NOT NULL
         ORDER BY destacado DESC, rating DESC NULLS LAST
         LIMIT $${pi} OFFSET $${pi+1}`,
        [...params, limit, offset]
      );

      return res.status(200).json({
        ok:   true,
        modo: 'mapa',
        total: mapaRows.length,
        data: mapaRows.map(function(d) {
          return {
            id:    d.id,
            slug:  d.slug,
            name:  d.nombre,
            cat:   d.categoria_slug,
            city:  d.ciudad,
            lat:   parseFloat(d.lat),
            lng:   parseFloat(d.lng),
            emoji: d.emoji || CAT_EMOJI[d.categoria_slug] || '📍',
            foto:  d.foto_hero || '',
            rating: d.rating ? parseFloat(d.rating) : 0,
          };
        })
      });
    }

    // Modo normal: todos los campos
    var rows = await sql(
      `SELECT d.*
       FROM destinos d
       WHERE ${where}
       ORDER BY d.destacado DESC, d.rating DESC NULLS LAST, d.creado_en DESC
       LIMIT $${pi} OFFSET $${pi+1}`,
      [...params, limit, offset]
    );

    // Total para paginación
    var countRows = await sql(
      `SELECT COUNT(*) AS n FROM destinos d WHERE ${where}`,
      params
    );

    // Stats reales para el homepage
    var statsRows = await sql(
      `SELECT
         COUNT(*)                              AS total_destinos,
         COUNT(DISTINCT ciudad)               AS total_ciudades,
         SUM(total_resenas)                   AS total_resenas,
         AVG(rating)                          AS rating_promedio
       FROM destinos WHERE status='published'`
    );
    var stats = statsRows[0] || {};

    return res.status(200).json({
      ok:    true,
      total: parseInt((countRows[0] || {}).n || 0),
      stats: {
        destinos:  parseInt(stats.total_destinos  || 0),
        ciudades:  parseInt(stats.total_ciudades  || 0),
        resenas:   parseInt(stats.total_resenas   || 0),
        rating:    stats.rating_promedio ? parseFloat(parseFloat(stats.rating_promedio).toFixed(1)) : 0,
      },
      data: rows.map(toPlace),
    });

  } catch(err) {
    console.error('[api/destinos]', err.message);
    return res.status(500).json({ ok: false, error: err.message });
  }
};
