// /api/publicar-lugar.js
// Recibe datos del formulario publicar.html, crea destino en Neon con status='pending'
// No requiere auth — es público. El admin aprueba después desde admin.html

import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

// Genera slug único a partir del nombre
function generarSlug(nombre, ciudad) {
  const base = `${nombre} ${ciudad}`
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // quitar tildes
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 60);
  const rand = Math.random().toString(36).slice(2, 6);
  return `${base}-${rand}`;
}

// Mapea categoría del formulario a la tabla categorias
const CATEGORIA_MAP = {
  'hostal': 'hostal',
  'hotel': 'hostal',
  'finca': 'hostal',
  'glamping': 'hostal',
  'aparta-hotel': 'hostal',
  'posada': 'hostal',
  'restaurante': 'comida',
  'cafe': 'comida',
  'bar': 'comida',
  'sitio': 'sitio',
  'parque': 'sitio',
  'museo': 'sitio',
  'natural': 'sitio',
  'evento': 'evento',
  'festival': 'evento',
};

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const data = req.body;

    // Validación básica
    const required = ['nombre', 'categoria', 'ciudad', 'descripcion_corta', 'whatsapp'];
    for (const campo of required) {
      if (!data[campo] || String(data[campo]).trim() === '') {
        return res.status(400).json({ error: `Campo requerido: ${campo}` });
      }
    }

    // Determinar categoria_id en la tabla categorias
    const catKey = (data.categoria || '').toLowerCase();
    const categoriaNombre = CATEGORIA_MAP[catKey] || 'sitio';

    const [categoriaRow] = await sql`
      SELECT id FROM categorias WHERE slug = ${categoriaNombre} LIMIT 1
    `;
    if (!categoriaRow) {
      return res.status(500).json({ error: 'Categoría no encontrada en DB' });
    }

    const slug = generarSlug(data.nombre, data.ciudad);

    // Construir objeto destino
    const precio = data.precio_desde ? parseInt(data.precio_desde.toString().replace(/\D/g,'')) : null;
    const lat = data.latitud ? parseFloat(data.latitud) : null;
    const lng = data.longitud ? parseFloat(data.longitud) : null;

    // Insertar en destinos con status='pending'
    const [destino] = await sql`
      INSERT INTO destinos (
        slug,
        nombre,
        categoria_id,
        ciudad,
        departamento,
        descripcion_corta,
        descripcion_larga,
        foto_principal,
        precio_desde,
        lat,
        lng,
        status,
        destacado,
        created_at
      ) VALUES (
        ${slug},
        ${data.nombre.trim()},
        ${categoriaRow.id},
        ${data.ciudad.trim()},
        ${data.departamento || null},
        ${data.descripcion_corta.trim()},
        ${data.descripcion_larga || null},
        ${data.foto_principal || null},
        ${precio},
        ${lat},
        ${lng},
        'pending',
        false,
        NOW()
      )
      RETURNING id, slug
    `;

    // Guardar detalles adicionales en destinos_detalles (JSONB)
    const detalles = {
      tipo_alojamiento: data.tipo_alojamiento || null,
      checkin: data.checkin || null,
      checkout: data.checkout || null,
      whatsapp: data.whatsapp,
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
      // Metadata del submit
      _submitted_at: new Date().toISOString(),
      _ip: req.headers['x-forwarded-for'] || req.socket?.remoteAddress || null,
    };

    await sql`
      INSERT INTO destinos_detalles (destino_id, datos)
      VALUES (${destino.id}, ${JSON.stringify(detalles)})
      ON CONFLICT (destino_id) DO UPDATE SET datos = ${JSON.stringify(detalles)}
    `;

    // Guardar fotos de galería
    if (data.fotos_galeria && Array.isArray(data.fotos_galeria) && data.fotos_galeria.length > 0) {
      for (let i = 0; i < data.fotos_galeria.length; i++) {
        const foto = data.fotos_galeria[i];
        if (!foto || !foto.url) continue;
        await sql`
          INSERT INTO destinos_fotos (destino_id, url, caption, orden)
          VALUES (${destino.id}, ${foto.url}, ${foto.caption || ''}, ${i})
          ON CONFLICT DO NOTHING
        `;
      }
    }

    return res.status(200).json({
      ok: true,
      mensaje: '¡Solicitud recibida! El equipo de ExploraCO revisará y publicará tu lugar en 24-48h.',
      slug: destino.slug,
      id: destino.id,
      status: 'pending'
    });

  } catch (err) {
    console.error('[publicar-lugar] Error:', err);
    return res.status(500).json({
      error: 'Error interno al guardar. Por favor intenta de nuevo.',
      detalle: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
}
