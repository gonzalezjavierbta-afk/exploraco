// /api/publicar-lugar.js  v4 — schema real de Neon
// Columnas reales: slug, nombre, categoria_slug, lead, descripcion, highlight,
// ciudad, region, barrio, lat, lng, whatsapp, telefono, email, web, instagram,
// precio_desde(varchar), horario, emoji, foto_hero, status, destacado,
// booking, hostelworld, airbnb, tipo, tags(jsonb), capacidad, como_llegar

const { neon } = require('@neondatabase/serverless');

function generarSlug(nombre, ciudad) {
  var base = ((nombre||'') + '-' + (ciudad||''))
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-z0-9\s-]/g,'')
    .trim()
    .replace(/\s+/g,'-')
    .replace(/-+/g,'-')
    .slice(0,55);
  return base + '-' + Math.random().toString(36).slice(2,6);
}

// Mapea categoría del formulario al slug real de la tabla
var CAT_MAP = {
  hostal:'hostal', hotel:'hostal', finca:'hostal',
  glamping:'hostal', 'aparta-hotel':'hostal', posada:'hostal',
  restaurante:'comida', cafe:'comida', bar:'comida',
  sitio:'sitio', parque:'sitio', museo:'sitio', natural:'sitio',
  evento:'evento', festival:'evento',
};

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!req.body || typeof req.body !== 'object') {
    return res.status(400).json({ error: 'Body JSON requerido' });
  }

  var d = req.body;

  // Validación campos requeridos
  var reqs = ['nombre','categoria','ciudad','descripcion_corta','whatsapp'];
  for (var i = 0; i < reqs.length; i++) {
    if (!d[reqs[i]] || !String(d[reqs[i]]).trim()) {
      return res.status(400).json({ error: 'Campo requerido: ' + reqs[i] });
    }
  }

  try {
    var sql = neon(process.env.DATABASE_URL);

    var catSlug = CAT_MAP[(d.categoria||'').toLowerCase()] || 'sitio';
    var slug    = generarSlug(d.nombre, d.ciudad);

    // Precio: guardar como string (así está la columna)
    var precio = d.precio_desde ? String(d.precio_desde).replace(/[^\d]/g,'') : null;
    if (precio) precio = '$' + Number(precio).toLocaleString('es-CO');

    // Tags/amenidades como JSONB
    var tags = {};
    if (d.amenidades && d.amenidades.length) tags.amenidades = d.amenidades;
    if (d.habitaciones && d.habitaciones.length) tags.habitaciones = d.habitaciones;
    if (d.faqs && d.faqs.length) tags.faqs = d.faqs;
    if (d.checkin) tags.checkin = d.checkin;
    if (d.checkout) tags.checkout = d.checkout;
    if (d.contacto_nombre) tags.contacto_nombre = d.contacto_nombre;

    var rows = await sql(
      `INSERT INTO destinos (
        slug, nombre, categoria_slug,
        lead, descripcion, highlight,
        ciudad, region, barrio,
        lat, lng,
        whatsapp, telefono, email, web, instagram,
        precio_desde, horario,
        foto_hero,
        booking, hostelworld, airbnb,
        tipo, tags,
        status, destacado, verificado,
        creado_en, actualizado_en
      ) VALUES (
        $1,  $2,  $3,
        $4,  $5,  $6,
        $7,  $8,  $9,
        $10, $11,
        $12, $13, $14, $15, $16,
        $17, $18,
        $19,
        $20, $21, $22,
        $23, $24,
        'pending', false, false,
        NOW(), NOW()
      )
      RETURNING id, slug`,
      [
        slug,
        String(d.nombre).trim(),
        catSlug,
        // lead = descripcion_corta (columna lead es el resumen corto)
        String(d.descripcion_corta).trim(),
        // descripcion = descripcion_larga
        d.descripcion_larga || null,
        // highlight = frase_destacada
        d.frase_destacada || null,
        String(d.ciudad).trim(),
        d.departamento || null,       // region
        d.barrio || null,
        d.latitud  ? parseFloat(d.latitud)  || null : null,
        d.longitud ? parseFloat(d.longitud) || null : null,
        d.whatsapp || null,
        d.telefono || null,
        d.email    || null,
        d.sitio_web || null,          // web
        d.instagram || null,
        precio,
        d.horario || null,
        d.foto_principal || null,     // foto_hero
        d.booking_url    || null,     // booking
        d.hostelworld_url|| null,     // hostelworld
        d.airbnb_url     || null,     // airbnb
        d.tipo_alojamiento || null,   // tipo
        JSON.stringify(tags),         // tags JSONB
      ]
    );

    // Guardar fotos de galería en destinos_fotos
    if (Array.isArray(d.fotos_galeria)) {
      for (var j = 0; j < d.fotos_galeria.length; j++) {
        var foto = d.fotos_galeria[j];
        if (!foto || !foto.url) continue;
        try {
          await sql(
            'INSERT INTO destinos_fotos (destino_id, url, caption, orden) VALUES ($1,$2,$3,$4)',
            [rows[0].id, foto.url, foto.caption||'', j]
          );
        } catch(e) { /* no fatal */ }
      }
    }

    return res.status(200).json({
      ok: true,
      mensaje: '¡Solicitud recibida! El equipo revisará y publicará tu lugar en 24-48h.',
      slug: rows[0].slug,
      id:   rows[0].id,
      status: 'pending'
    });

  } catch (err) {
    console.error('[publicar-lugar] ERROR:', err.message);
    return res.status(500).json({
      error: 'Error interno al guardar.',
      detalle: err.message
    });
  }
};
