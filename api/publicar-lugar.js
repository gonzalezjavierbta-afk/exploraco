// /api/publicar-lugar.js
// Recibe datos del formulario publicar.html, crea destino en Neon con status='pending'
// CommonJS — mismo patrón que los otros endpoints del proyecto

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 1,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 10000,
});

const CATEGORIA_MAP = {
  'hostal': 'hostal', 'hotel': 'hostal', 'finca': 'hostal',
  'glamping': 'hostal', 'aparta-hotel': 'hostal', 'posada': 'hostal',
  'restaurante': 'comida', 'cafe': 'comida', 'bar': 'comida',
  'sitio': 'sitio', 'parque': 'sitio', 'museo': 'sitio', 'natural': 'sitio',
  'evento': 'evento', 'festival': 'evento',
};

function generarSlug(nombre, ciudad) {
  var base = ((nombre || '') + '-' + (ciudad || ''))
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 55);
  var rand = Math.random().toString(36).slice(2, 6);
  return base + '-' + rand;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  var client;
  try {
    var data = req.body || {};

    // Validación básica
    var required = ['nombre', 'categoria', 'ciudad', 'descripcion_corta', 'whatsapp'];
    for (var i = 0; i < required.length; i++) {
      var campo = required[i];
      if (!data[campo] || String(data[campo]).trim() === '') {
        return res.status(400).json({ error: 'Campo requerido: ' + campo });
      }
    }

    client = await pool.connect();

    // Buscar categoria_id
    var catKey = (data.categoria || '').toLowerCase();
    var catSlug = CATEGORIA_MAP[catKey] || 'sitio';
    var catRes = await client.query('SELECT id FROM categorias WHERE slug = $1 LIMIT 1', [catSlug]);
    
    // Si no encuentra por slug exacto, intentar con nombre
    var categoriaId;
    if (catRes.rows.length > 0) {
      categoriaId = catRes.rows[0].id;
    } else {
      // Fallback: primera categoría disponible
      var catFallback = await client.query('SELECT id FROM categorias LIMIT 1');
      if (catFallback.rows.length === 0) {
        return res.status(500).json({ error: 'No hay categorías en la base de datos' });
      }
      categoriaId = catFallback.rows[0].id;
    }

    var slug = generarSlug(data.nombre, data.ciudad);
    var precio = data.precio_desde ? parseInt(String(data.precio_desde).replace(/\D/g, '')) || null : null;
    var lat = data.latitud ? parseFloat(data.latitud) || null : null;
    var lng = data.longitud ? parseFloat(data.longitud) || null : null;

    // Insertar destino con status='pending'
    var insertRes = await client.query(
      `INSERT INTO destinos (
        slug, nombre, categoria_id, ciudad, departamento,
        descripcion_corta, descripcion_larga, foto_principal,
        precio_desde, lat, lng, status, destacado, created_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'pending',false,NOW())
      RETURNING id, slug`,
      [
        slug,
        String(data.nombre).trim(),
        categoriaId,
        String(data.ciudad).trim(),
        data.departamento || null,
        String(data.descripcion_corta).trim(),
        data.descripcion_larga || null,
        data.foto_principal || null,
        precio,
        lat,
        lng
      ]
    );

    var destino = insertRes.rows[0];

    // Guardar detalles en JSONB
    var detalles = {
      tipo_alojamiento: data.tipo_alojamiento || null,
      checkin: data.checkin || null,
      checkout: data.checkout || null,
      whatsapp: data.whatsapp || null,
      contacto_nombre: data.contacto_nombre || null,
      instagram: data.instagram || null,
      sitio_web: data.sitio_web || null,
      email: data.email || null,
      telefono: data.telefono || null,
      booking_url: data.booking_url || null,
      hostelworld_url: data.hostelworld_url || null,
      airbnb_url: data.airbnb_url || null,
      amenidades: data.amenidades || [],
      habitaciones: data.habitaciones || [],
      faqs: data.faqs || [],
      frase_destacada: data.frase_destacada || null,
      barrio: data.barrio || null,
      direccion: data.direccion || null,
      _submitted_at: new Date().toISOString(),
    };

    // ON CONFLICT: intentar sin constraint primero
    try {
      await client.query(
        `INSERT INTO destinos_detalles (destino_id, datos) VALUES ($1, $2)
         ON CONFLICT (destino_id) DO UPDATE SET datos = $2`,
        [destino.id, JSON.stringify(detalles)]
      );
    } catch (e) {
      // Si falla el ON CONFLICT (constraint no existe), intentar solo INSERT
      try {
        await client.query(
          'INSERT INTO destinos_detalles (destino_id, datos) VALUES ($1, $2)',
          [destino.id, JSON.stringify(detalles)]
        );
      } catch (e2) {
        // No fatal — los detalles son opcionales
        console.warn('[publicar-lugar] detalles insert failed:', e2.message);
      }
    }

    // Guardar fotos de galería
    if (data.fotos_galeria && Array.isArray(data.fotos_galeria)) {
      for (var j = 0; j < data.fotos_galeria.length; j++) {
        var foto = data.fotos_galeria[j];
        if (!foto || !foto.url) continue;
        try {
          await client.query(
            'INSERT INTO destinos_fotos (destino_id, url, caption, orden) VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING',
            [destino.id, foto.url, foto.caption || '', j]
          );
        } catch (e) { /* no fatal */ }
      }
    }

    return res.status(200).json({
      ok: true,
      mensaje: '¡Solicitud recibida! El equipo revisará y publicará tu lugar en 24-48h.',
      slug: destino.slug,
      id: destino.id,
      status: 'pending'
    });

  } catch (err) {
    console.error('[publicar-lugar] Error:', err.message, err.stack);
    return res.status(500).json({
      error: 'Error interno al guardar. Por favor intenta de nuevo.',
      detalle: err.message
    });
  } finally {
    if (client) client.release();
  }
};
