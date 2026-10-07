// api/destinos.js  v7 -- motor de busqueda unificado (ADR-090 Wave 1).
// Extiende el mismo endpoint existente (8/8 funciones Vercel intactas):
//   q, cerca_de, radio_km, orden=relevancia|distancia|rating, sugerir=1
// Compatibilidad total: categoria, ciudad, destacados, limit, offset, modo=mapa.
// Degradacion D11: si el motor no esta disponible (053 ausente) cae al
// comportamiento legacy ILIKE sin romper la respuesta.
// ASCII-safe (ADR-002): 0 backticks, 0 bytes > 127.

const { neon } = require('@neondatabase/serverless');
const BUSQ = require('../busqueda.js');
const { esFalloEsquema } = require('../lib/score.js');

const CAT_EMOJI  = { hostal:'\ud83c\udfe8', comida:'\ud83c\udf7d\ufe0f', sitio:'\ud83c\udfd4\ufe0f', evento:'\ud83c\udf89', blog:'\ud83d\udcdd' };
const CAT_COLORS = {
  hostal: 'linear-gradient(135deg,#1a3a5c,#2a4a7c)',
  comida: 'linear-gradient(135deg,#3a1a0a,#4a2a1a)',
  sitio:  'linear-gradient(135deg,#0a2a1a,#1a3a2a)',
  evento: 'linear-gradient(135deg,#1a051a,#3a1a3a)',
  blog:   'linear-gradient(135deg,#3a0a1a,#4a1a2a)',
};
const PIN_COLORS = {
  hostal:'#2196F3', comida:'#FF9800', sitio:'#4CAF50', evento:'#A855F7', blog:'#EC4899',
};
// Abreviaturas de mes para AGENDA_EVENTS (formato que usan index.html y agenda.html)
const MONTHS_ABBR = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

const Q_MAX = 80;

function safeJSON(val) {
  if (!val) return null;
  if (typeof val === 'object') return val;
  try { return JSON.parse(val); } catch(_) { return null; }
}

function toPlace(row) {
  var cat   = row.categoria_slug || 'sitio';
  var emoji = row.emoji || CAT_EMOJI[cat] || '\ud83d\udccd';
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
    creado_en:   row.creado_en     || null,
    slug:        row.slug          || '',
    name:        row.nombre        || '',
    cat:         cat,
    subcategoria: tags.subcategoria || '',
    city:        row.ciudad        || '',
    region:      row.region        || '',
    barrio:      row.barrio        || '',
    zona:        row.zona          || '',
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
    // Links de reserva -- destinos_detalles > columnas directas
    booking:     row.booking_url      || row.booking     || '',
    hostelworld: row.hostelworld_url  || row.hostelworld || '',
    airbnb:      row.airbnb_url       || row.airbnb      || '',
    checkin:     row.checkin          || (tags.checkin  || ''),
    checkout:    row.checkout         || (tags.checkout || ''),
    amenities:   amenidades,
    // Blog (Sprint Inspirate): tema es el sub-filtro del modal
    // "Comparte tu experiencia" (aventura/gastro/cultura/naturaleza/
    // tips), ver publicar-lugar.js BLOG_TEMAS. Un post puede tener
    // varios temas (tags.temas[]); tema conserva el principal para
    // compatibilidad con el grid actual.
    tema:        tags.tema || '',
    temas:       (Array.isArray(tags.temas) && tags.temas.length)
                 ? tags.temas
                 : (tags.tema ? [tags.tema] : []),
    habs:        habitaciones,
    faqs:        faqs,
    // Campos especificos para AGENDA_EVENTS (eventos)
    // day/month se derivan de tags.fecha_inicio ('YYYY-MM-DD') cuando la
    // fila no tiene columnas event_day/event_month (los seeds de evento
    // solo escriben tags.fecha_inicio). Fecha real del evento, no la de hoy.
    day:         (typeof tags.fecha_inicio === 'string' && tags.fecha_inicio.length >= 10
                  ? parseInt(tags.fecha_inicio.slice(8,10), 10) || null
                  : null) || row.event_day || null,
    month:       (typeof tags.fecha_inicio === 'string' && tags.fecha_inicio.length >= 10
                  ? (MONTHS_ABBR[parseInt(tags.fecha_inicio.slice(5,7), 10) - 1] || null)
                  : null) || row.event_month || null,
    time:        row.horario          || 'Consultar',
    // tags completos: fecha_inicio/fecha_fin/sede/lineup/edicion se leen en
    // agenda.html (loadApiEvents) e index-api-connector.js (toAgendaEvent)
    tags:        tags,
  };
}

// WHERE base comun (status + categoria + ciudad + destacados). La ciudad
// conserva el ILIKE legacy para compatibilidad total del contrato.
function buildBase(cat, ciudad, dest) {
  var conds = ["d.status = 'published'"];
  var params = [];
  var pi = 1;
  if (cat) {
    conds.push('d.categoria_slug = $' + pi++);
    params.push(cat);
  } else {
    conds.push("d.categoria_slug != 'blog'");
  }
  if (ciudad) {
    conds.push('d.ciudad ILIKE $' + pi++);
    params.push('%' + ciudad + '%');
  }
  if (dest) {
    conds.push('d.destacado = true');
  }
  return { conds: conds, params: params, pi: pi };
}

// Consulta legacy ILIKE (D11: fallback si el motor no puede usar las columnas).
async function legacyNormal(sql, cat, ciudad, dest, limit, offset, q) {
  var b = buildBase(cat, ciudad, dest);
  var conds = b.conds, params = b.params, pi = b.pi;
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
  var rows = await sql(
    'SELECT d.*, '
    + 'dd.checkin, dd.checkout, '
    + 'dd.habitaciones, dd.amenidades, dd.faqs, '
    + 'dd.booking_url, dd.hostelworld_url, dd.airbnb_url '
    + 'FROM destinos d '
    + 'LEFT JOIN destinos_detalles dd ON dd.destino_id = d.id '
    + 'WHERE ' + where + ' '
    + 'ORDER BY d.destacado DESC, d.rating DESC NULLS LAST, d.creado_en DESC '
    + 'LIMIT $' + pi + ' OFFSET $' + (pi + 1),
    [...params, limit, offset]
  );
  var countRows = await sql('SELECT COUNT(*) AS n FROM destinos d WHERE ' + where, params);
  return { rows: rows, countRows: countRows };
}

async function legacyMapa(sql, cat, ciudad, dest, limit, offset, q) {
  var b = buildBase(cat, ciudad, dest);
  var conds = b.conds, params = b.params, pi = b.pi;
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
  var rows = await sql(
    'SELECT id, slug, nombre, categoria_slug, ciudad, region, zona, '
    + 'lat, lng, emoji, hero_bg, foto_hero, rating, total_resenas, destacado, '
    + 'tags->>\'subcategoria\' AS subcategoria '
    + 'FROM destinos d '
    + 'WHERE ' + where + ' AND lat IS NOT NULL AND lng IS NOT NULL AND lat != 0 AND lng != 0 '
    + 'ORDER BY destacado DESC, rating DESC NULLS LAST '
    + 'LIMIT $' + pi + ' OFFSET $' + (pi + 1),
    [...params, limit, offset]
  );
  return { rows: rows };
}

function mapMapa(rows) {
  return rows.map(function(d) {
    var cat = d.categoria_slug || 'sitio';
    var o = {
      id:       d.id,
      slug:     d.slug,
      name:     d.nombre,
      cat:      cat,
      subcat:   d.subcategoria || '',
      city:     d.ciudad || '',
      region:   d.region || '',
      zona:     d.zona   || '',
      lat:      parseFloat(d.lat),
      lng:      parseFloat(d.lng),
      emoji:    d.emoji   || CAT_EMOJI[cat] || '\ud83d\udccd',
      hero_bg:  d.hero_bg || CAT_COLORS[cat] || '',
      color:    PIN_COLORS[cat] || '#666',
      foto:     d.foto_hero || '',
      rating:   d.rating ? parseFloat(d.rating) : 0,
      reviews:  d.total_resenas ? parseInt(d.total_resenas) : 0,
      destacado:d.destacado || false,
    };
    if (d.dist_m !== undefined && d.dist_m !== null) o.dist_m = parseFloat(d.dist_m);
    return o;
  });
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  // Cache corto en CDN -- los datos cambian frecuentemente (nuevos lugares, ediciones)
  res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate=30');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    var sql = neon(process.env.DATABASE_URL);

    var cat      = req.query.categoria || req.query.cat  || null;
    var ciudad   = req.query.ciudad    || req.query.city || null;
    var dest     = req.query.destacados === 'true'       || false;
    var modo     = req.query.modo                        || null;
    var qRaw     = req.query.q != null ? String(req.query.q) : '';
    var q        = qRaw.slice(0, Q_MAX).trim();
    var limit    = Math.min(parseInt(req.query.limit)    || 500, 500);
    var offset   = Math.max(parseInt(req.query.offset)   || 0, 0);
    var cercaRaw = req.query.cerca_de || null;
    var radioKm  = BUSQ.clampRadio(req.query.radio_km);
    var ordenRaw = req.query.orden || null;
    var sugerir  = String(req.query.sugerir || '') === '1';

    // Wave 2 (D7/D10): el endpoint IGNORA recomendar/semilla y degrada a normal.
    // (Los hooks viven en busqueda.js: BUSQ.buildRecomendar / WAVE.)

    var cerca  = BUSQ.parseParLatLng(cercaRaw);
    var tokens = BUSQ.normTokens(q);
    var usaMotor = sugerir || tokens.length > 0 || !!cerca
                   || (ordenRaw && ordenRaw !== 'relevancia');

    // ---- Modo sugerir=1 (autocompletado ligero, ignora filtros salvo q) ----
    if (sugerir) {
      var sg = BUSQ.buildSugerir({ q: q });
      var sLimit = Math.min(limit, 10);
      var sConds = ["d.status = 'published'", "d.categoria_slug != 'blog'"];
      if (sg.conds.length) sConds = sConds.concat(sg.conds);
      var sWhere = sConds.join(' AND ');
      var sP = sg.params.concat([sLimit]);
      try {
        var sRows = await sql(
          'SELECT id, slug, nombre, categoria_slug, ciudad, region '
          + 'FROM destinos d WHERE ' + sWhere + ' ORDER BY ' + sg.orderSql
          + ' LIMIT $' + sP.length,
          sP
        );
        return res.status(200).json({
          ok: true, modo: 'sugerir', total: sRows.length,
          sugerencias: sRows.map(function(r) {
            return { id: r.id, slug: r.slug, name: r.nombre,
              nombre: r.nombre, cat: r.categoria_slug || 'sitio',
              city: r.ciudad || '', ciudad: r.ciudad || '', region: r.region || '' };
          }),
        });
      } catch (eSug) {
        if (!esFalloEsquema(eSug)) throw eSug;
        var like = '%' + q + '%';
        var lRows = await sql(
          'SELECT id, slug, nombre, categoria_slug, ciudad, region FROM destinos d '
          + "WHERE d.status = 'published' AND d.categoria_slug != 'blog' "
          + 'AND (d.nombre ILIKE $1 OR d.ciudad ILIKE $1) '
          + 'ORDER BY d.rating DESC NULLS LAST LIMIT $2',
          [like, sLimit]
        );
        return res.status(200).json({
          ok: true, modo: 'sugerir', total: lRows.length,
          sugerencias: lRows.map(function(r) {
            return { id: r.id, slug: r.slug, name: r.nombre,
              nombre: r.nombre, cat: r.categoria_slug || 'sitio',
              city: r.ciudad || '', ciudad: r.ciudad || '', region: r.region || '' };
          }),
        });
      }
    }

    // ---- Modo mapa ----
    if (modo === 'mapa') {
      if (!usaMotor) {
        var ml = await legacyMapa(sql, cat, ciudad, dest, limit, offset, null);
        return res.status(200).json({
          ok: true, modo: 'mapa', total: ml.rows.length, data: mapMapa(ml.rows),
        });
      }
      var mb = buildBase(cat, ciudad, dest);
      var mBusq = BUSQ.buildBusqueda({ q: q, cerca_de: cercaRaw, radio_km: radioKm, orden: ordenRaw });
      var mConds = mb.conds.concat(mBusq.conds);
      var mWhere = mConds.join(' AND ');
      var mParams = mb.params.concat(mBusq.params);
      var mN = mParams.length;
      var mDistSel = mBusq.distSql ? (', ' + mBusq.distSql + ' AS dist_m') : '';
      var mSql = 'SELECT id, slug, nombre, categoria_slug, ciudad, region, zona, '
        + 'lat, lng, emoji, hero_bg, foto_hero, rating, total_resenas, destacado, '
        + 'tags->>\'subcategoria\' AS subcategoria' + mDistSel + ' '
        + 'FROM destinos d '
        + 'WHERE ' + mWhere + ' AND lat IS NOT NULL AND lng IS NOT NULL AND lat != 0 AND lng != 0 '
        + 'ORDER BY ' + mBusq.orderSql
        + ' LIMIT $' + (mN + 1) + ' OFFSET $' + (mN + 2);
      try {
        var mRows = await sql(mSql, mParams.concat([limit, offset]));
        return res.status(200).json({
          ok: true, modo: 'mapa', total: mRows.length, data: mapMapa(mRows),
        });
      } catch (eM) {
        if (!esFalloEsquema(eM)) throw eM;
        var ml2 = await legacyMapa(sql, cat, ciudad, dest, limit, offset, q);
        return res.status(200).json({
          ok: true, modo: 'mapa', total: ml2.rows.length, data: mapMapa(ml2.rows),
        });
      }
    }

    // ---- Modo normal ----
    var rows, countRows;
    if (!usaMotor) {
      // Regresion cero: sin q/geo/orden, el listado se comporta igual que v6.
      var lg = await legacyNormal(sql, cat, ciudad, dest, limit, offset, null);
      rows = lg.rows; countRows = lg.countRows;
    } else {
      var nb = buildBase(cat, ciudad, dest);
      var nBusq = BUSQ.buildBusqueda({ q: q, cerca_de: cercaRaw, radio_km: radioKm, orden: ordenRaw });
      var nConds = nb.conds.concat(nBusq.conds);
      var nWhere = nConds.join(' AND ');
      var nParams = nb.params.concat(nBusq.params);
      var nN = nParams.length;
      var nDistSel = nBusq.distSql ? (', ' + nBusq.distSql + ' AS dist_m') : '';
      var nSql = 'SELECT d.*, '
        + 'dd.checkin, dd.checkout, '
        + 'dd.habitaciones, dd.amenidades, dd.faqs, '
        + 'dd.booking_url, dd.hostelworld_url, dd.airbnb_url'
        + nDistSel + ' '
        + 'FROM destinos d '
        + 'LEFT JOIN destinos_detalles dd ON dd.destino_id = d.id '
        + 'WHERE ' + nWhere + ' '
        + 'ORDER BY ' + nBusq.orderSql
        + ' LIMIT $' + (nN + 1) + ' OFFSET $' + (nN + 2);
      try {
        rows = await sql(nSql, nParams.concat([limit, offset]));
        countRows = await sql('SELECT COUNT(*) AS n FROM destinos d WHERE ' + nWhere, nParams);
      } catch (eN) {
        if (!esFalloEsquema(eN)) throw eN;
        // D11: 42703/42P01 -> 053 ausente -> reintento legacy.
        var lg2 = await legacyNormal(sql, cat, ciudad, dest, limit, offset, qRaw);
        rows = lg2.rows; countRows = lg2.countRows;
      }
    }

    // Stats reales para homepage (independientes del filtro)
    var statsRows = await sql(
      'SELECT '
      + '  COUNT(*) AS total_destinos, '
      + '  COUNT(DISTINCT ciudad) AS total_ciudades, '
      + '  COALESCE(SUM(total_resenas), 0) AS total_resenas, '
      + '  ROUND(AVG(rating)::numeric, 1) AS rating_promedio '
      + 'FROM destinos WHERE status = \'published\' AND categoria_slug != \'blog\''
    );
    var st = statsRows[0] || {};

    var data = rows.map(toPlace);
    if (usaMotor) {
      data.forEach(function(p, i) {
        var dm = rows[i] ? rows[i].dist_m : null;
        if (dm !== undefined && dm !== null) p.dist_m = parseFloat(dm);
      });
    }

    return res.status(200).json({
      ok:    true,
      total: parseInt((countRows[0] || {}).n || 0),
      stats: {
        destinos: parseInt(st.total_destinos  || 0),
        ciudades: parseInt(st.total_ciudades  || 0),
        resenas:  parseInt(st.total_resenas   || 0),
        rating:   st.rating_promedio ? parseFloat(st.rating_promedio) : 0,
      },
      data: data,
    });

  } catch(err) {
    console.error('[api/destinos]', err.message);
    return res.status(500).json({ ok: false, error: err.message });
  }
};
