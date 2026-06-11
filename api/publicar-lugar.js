// /api/publicar-lugar.js  v3
// CommonJS — usa el mismo cliente que admin-destinos.js ya existente en el proyecto
// Si el proyecto usa @neondatabase/serverless con neon(), lo detecta y lo usa también

var DATABASE_URL = process.env.DATABASE_URL;

// ── Helper: obtener cliente DB compatible con lo que tenga el proyecto ──
async function getClient() {
  // Intentar primero con @neondatabase/serverless (http, sin pool)
  try {
    var neonMod = require('@neondatabase/serverless');
    var sql = neonMod.neon(DATABASE_URL);
    return { type: 'neon', sql: sql };
  } catch (e1) {
    // Fallback a pg
    try {
      var pg = require('pg');
      var pool = new pg.Pool({
        connectionString: DATABASE_URL,
        ssl: { rejectUnauthorized: false },
        max: 1,
        connectionTimeoutMillis: 10000,
      });
      var client = await pool.connect();
      return { type: 'pg', client: client, pool: pool };
    } catch (e2) {
      throw new Error('No DB driver: neon=' + e1.message + ' pg=' + e2.message);
    }
  }
}

// ── Ejecutar query según el driver disponible ──
async function query(db, sql, params) {
  if (db.type === 'neon') {
    // neon() usa template literals — convertir a llamada directa
    var result = await db.sql(sql, params);
    // neon() devuelve array directamente
    return Array.isArray(result) ? result : (result.rows || []);
  } else {
    var r = await db.client.query(sql, params);
    return r.rows;
  }
}

async function releaseDB(db) {
  try {
    if (db.type === 'pg' && db.client) db.client.release();
  } catch (e) {}
}

// ── Generador de slug ──
function generarSlug(nombre, ciudad) {
  var base = ((nombre || '') + '-' + (ciudad || ''))
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 55);
  return base + '-' + Math.random().toString(36).slice(2, 6);
}

var CATEGORIA_MAP = {
  hostal: 'hostal', hotel: 'hostal', finca: 'hostal',
  glamping: 'hostal', 'aparta-hotel': 'hostal', posada: 'hostal',
  restaurante: 'comida', cafe: 'comida', bar: 'comida',
  sitio: 'sitio', parque: 'sitio', museo: 'sitio', natural: 'sitio',
  evento: 'evento', festival: 'evento',
};

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // ── Diagnóstico rápido si no hay body válido ──
  if (!req.body || typeof req.body !== 'object') {
    return res.status(400).json({ error: 'Body JSON requerido. Verifica Content-Type: application/json' });
  }

  var data = req.body;
  var required = ['nombre', 'categoria', 'ciudad', 'descripcion_corta', 'whatsapp'];
  for (var i = 0; i < required.length; i++) {
    var campo = required[i];
    if (!data[campo] || String(data[campo]).trim() === '') {
      return res.status(400).json({ error: 'Campo requerido faltante: ' + campo });
    }
  }

  var db;
  try {
    db = await getClient();

    var catSlug = CATEGORIA_MAP[(data.categoria || '').toLowerCase()] || 'sitio';

    // ── Buscar categoria_id con múltiples estrategias ──
    var categoriaId = null;

    // Estrategia 1: buscar por slug
    try {
      var catRows = await query(db, 'SELECT id FROM categorias WHERE slug = $1 LIMIT 1', [catSlug]);
      if (catRows.length > 0) categoriaId = catRows[0].id;
    } catch (e) {}

    // Estrategia 2: buscar por nombre
    if (!categoriaId) {
      try {
        var catNames = { hostal: 'hostal', comida: 'comida', sitio: 'sitio', evento: 'evento' };
        var catRows2 = await query(db, 'SELECT id FROM categorias WHERE nombre ILIKE $1 LIMIT 1', ['%' + catSlug + '%']);
        if (catRows2.length > 0) categoriaId = catRows2[0].id;
      } catch (e) {}
    }

    // Estrategia 3: primera categoría disponible
    if (!categoriaId) {
      try {
        var catRows3 = await query(db, 'SELECT id FROM categorias ORDER BY id LIMIT 1', []);
        if (catRows3.length > 0) categoriaId = catRows3[0].id;
      } catch (e) {}
    }

    // Estrategia 4: hardcode UUID si la tabla tiene UUIDs conocidos
    // (no aplica aquí, pero el destino se puede insertar sin categoria_id si la columna es nullable)

    var slug = generarSlug(data.nombre, data.ciudad);
    var precio = data.precio_desde ? (parseInt(String(data.precio_desde).replace(/\D/g, '')) || null) : null;
    var lat = data.latitud  ? (parseFloat(data.latitud)  || null) : null;
    var lng = data.longitud ? (parseFloat(data.longitud) || null) : null;

    // ── INSERT destino ──
    // Construir dinámicamente para manejar categoria_id nullable
    var insertSQL, insertParams;
    if (categoriaId) {
      insertSQL = `INSERT INTO destinos
        (slug, nombre, categoria_id, ciudad, departamento,
         descripcion_corta, descripcion_larga, foto_principal,
         precio_desde, lat, lng, status, destacado, created_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'pending',false,NOW())
        RETURNING id, slug`;
      insertParams = [
        slug, String(data.nombre).trim(), categoriaId,
        String(data.ciudad).trim(), data.departamento || null,
        String(data.descripcion_corta).trim(), data.descripcion_larga || null,
        data.foto_principal || null, precio, lat, lng
      ];
    } else {
      // Sin categoria_id — intentar sin esa columna
      insertSQL = `INSERT INTO destinos
        (slug, nombre, ciudad, departamento,
         descripcion_corta, descripcion_larga, foto_principal,
         precio_desde, lat, lng, status, destacado, created_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'pending',false,NOW())
        RETURNING id, slug`;
      insertParams = [
        slug, String(data.nombre).trim(),
        String(data.ciudad).trim(), data.departamento || null,
        String(data.descripcion_corta).trim(), data.descripcion_larga || null,
        data.foto_principal || null, precio, lat, lng
      ];
    }

    var insertRows = await query(db, insertSQL, insertParams);
    if (!insertRows || insertRows.length === 0) {
      throw new Error('INSERT destinos no retornó filas');
    }
    var destino = insertRows[0];

    // ── INSERT detalles (no fatal si falla) ──
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
      _submitted_at: new Date().toISOString(),
    };

    var detallesJSON = JSON.stringify(detalles);

    // Intentar con ON CONFLICT primero
    try {
      await query(db,
        `INSERT INTO destinos_detalles (destino_id, datos) VALUES ($1,$2)
         ON CONFLICT (destino_id) DO UPDATE SET datos = EXCLUDED.datos`,
        [destino.id, detallesJSON]
      );
    } catch (e1) {
      // Si falla el constraint, intentar sin ON CONFLICT
      try {
        await query(db,
          'INSERT INTO destinos_detalles (destino_id, datos) VALUES ($1,$2)',
          [destino.id, detallesJSON]
        );
      } catch (e2) {
        // No fatal: continuar sin detalles
        console.warn('[publicar-lugar] detalles failed:', e2.message);
      }
    }

    // ── INSERT fotos (no fatal) ──
    if (Array.isArray(data.fotos_galeria)) {
      for (var j = 0; j < data.fotos_galeria.length; j++) {
        var foto = data.fotos_galeria[j];
        if (!foto || !foto.url) continue;
        try {
          await query(db,
            'INSERT INTO destinos_fotos (destino_id, url, caption, orden) VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING',
            [destino.id, foto.url, foto.caption || '', j]
          );
        } catch (e) {}
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
    console.error('[publicar-lugar] FATAL:', err.message, '\nStack:', err.stack);
    return res.status(500).json({
      error: 'Error interno al guardar.',
      detalle: err.message   // siempre visible para diagnóstico
    });
  } finally {
    if (db) releaseDB(db);
  }
};
