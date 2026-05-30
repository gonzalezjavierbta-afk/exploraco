// netlify/functions/admin-destinos.ts
// API privada para el panel admin — CRUD completo de destinos
// Requiere header: Authorization: Bearer ADMIN_SECRET
// GET    /api/admin/destinos          — lista todos (incl. draft/archived)
// POST   /api/admin/destinos          — crear nuevo
// PUT    /api/admin/destinos?id=...   — actualizar
// DELETE /api/admin/destinos?id=...   — eliminar

import type { Handler } from '@netlify/functions';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

const ADMIN_SECRET = process.env.ADMIN_SECRET || 'exploracо-admin-2024';

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// ── Auth middleware ────────────────────────────────────────
function isAuthorized(event: any): boolean {
  const auth = event.headers?.authorization || event.headers?.Authorization || '';
  return auth === `Bearer ${ADMIN_SECRET}`;
}

function err(msg: string, code = 400) {
  return { statusCode: code, headers, body: JSON.stringify({ ok: false, error: msg }) };
}

function ok(data: any, code = 200) {
  return { statusCode: code, headers, body: JSON.stringify({ ok: true, ...data }) };
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (!isAuthorized(event)) return err('No autorizado — incluye Authorization: Bearer TOKEN', 401);

  const method = event.httpMethod;
  const params = event.queryStringParameters || {};

  try {
    // ── GET — listar todos los destinos ─────────────────────
    if (method === 'GET') {
      const { categoria, status, busqueda, limit = '100', offset = '0' } = params;
      const conditions: string[] = [];
      const args: any[] = [];
      let i = 1;

      if (categoria) { conditions.push(`d.categoria_slug = $${i++}`); args.push(categoria); }
      if (status)    { conditions.push(`d.status = $${i++}`);         args.push(status); }
      if (busqueda)  {
        conditions.push(`(d.nombre ILIKE $${i} OR d.ciudad ILIKE $${i})`);
        args.push(`%${busqueda}%`); i++;
      }

      const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

      const rows = await sql(
        `SELECT d.*, dd.habitaciones, dd.amenidades, dd.checkin, dd.checkout,
                dd.booking_url, dd.hostelworld_url, dd.airbnb_url,
                dd.faqs, dd.transporte, dd.eventos_hostal, dd.scores
         FROM destinos d
         LEFT JOIN destinos_detalles dd ON d.id = dd.destino_id
         ${where}
         ORDER BY d.creado_en DESC
         LIMIT $${i++} OFFSET $${i++}`,
        [...args, parseInt(limit), parseInt(offset)]
      );

      const total = await sql(
        `SELECT COUNT(*) as n FROM destinos ${where}`,
        args
      );

      return ok({ total: parseInt((total[0] as any).n), data: rows });
    }

    // ── POST — crear destino ─────────────────────────────────
    if (method === 'POST') {
      const b = JSON.parse(event.body || '{}');
      if (!b.nombre || !b.categoria_slug) return err('nombre y categoria_slug son requeridos');

      // Generar slug si no viene
      if (!b.slug) {
        b.slug = slugify(b.nombre) + '-' + b.ciudad ? slugify(b.ciudad) : '';
      }

      const rows = await sql`
        INSERT INTO destinos (
          slug, nombre, categoria_slug, lead, descripcion, highlight,
          ciudad, region, barrio, direccion, lat, lng,
          whatsapp, telefono, email, web, instagram, booking,
          precio_desde, emoji, hero_bg, foto_hero,
          rating, total_resenas, status, destacado
        ) VALUES (
          ${b.slug}, ${b.nombre}, ${b.categoria_slug},
          ${b.lead || ''}, ${b.desc || b.descripcion || ''},
          ${b.highlight || ''},
          ${b.city || b.ciudad || ''}, ${b.region || ''},
          ${b.barrio || ''}, ${b.address || b.direccion || ''},
          ${b.lat || null}, ${b.lng || null},
          ${b.whatsapp || ''}, ${b.tel || b.telefono || ''},
          ${b.email || ''}, ${b.web || ''},
          ${b.instagram || ''}, ${b.booking || ''},
          ${b.price || b.precio_desde || ''},
          ${b.emoji || '📍'},
          ${b.hero_bg || 'linear-gradient(135deg,#1a3a5c,#2a4a7c)'},
          ${b.foto_hero || null},
          ${b.rating || 0}, ${b.reviews || 0},
          ${b.status || 'draft'}, ${b.destacado || false}
        )
        RETURNING id, slug, nombre
      `;

      const destino = rows[0] as any;

      // Insertar detalles si es hostal
      if (b.categoria_slug === 'hostal') {
        await sql`
          INSERT INTO destinos_detalles (
            destino_id, habitaciones, amenidades, scores,
            transporte, eventos_hostal, faqs,
            checkin, checkout, booking_url, hostelworld_url, airbnb_url
          ) VALUES (
            ${destino.id},
            ${JSON.stringify(b.habs || [])},
            ${JSON.stringify(b.amenities || [])},
            ${JSON.stringify(b.scores || {})},
            ${JSON.stringify(b.transport || [])},
            ${JSON.stringify(b.hostalEvents || [])},
            ${JSON.stringify(b.faqs || [])},
            ${b.checkin || null}, ${b.checkout || null},
            ${b.bookingUrl || null}, ${b.hostelworld || null}, ${b.airbnb || null}
          )
        `;
      }

      // Insertar fotos
      if (b.photos && b.photos.length) {
        for (let idx = 0; idx < b.photos.length; idx++) {
          const ph  = b.photos[idx];
          const url = typeof ph === 'string' ? ph : (ph.url || '');
          const cap = typeof ph === 'object' ? (ph.cap || '') : '';
          if (url) await sql`
            INSERT INTO destinos_fotos (destino_id, url, caption, orden, es_hero)
            VALUES (${destino.id}, ${url}, ${cap}, ${idx}, ${idx === 0})
            ON CONFLICT DO NOTHING
          `;
        }
      }

      return ok({ data: destino, message: `Destino creado: ${destino.slug}` }, 201);
    }

    // ── PUT — actualizar destino ─────────────────────────────
    if (method === 'PUT') {
      const { id } = params;
      if (!id) return err('Falta id en query params');
      const b = JSON.parse(event.body || '{}');

      await sql`
        UPDATE destinos SET
          nombre        = COALESCE(${b.nombre || null}, nombre),
          categoria_slug = COALESCE(${b.categoria_slug || null}, categoria_slug),
          lead          = COALESCE(${b.lead || null}, lead),
          descripcion   = COALESCE(${b.desc || b.descripcion || null}, descripcion),
          highlight     = COALESCE(${b.highlight || null}, highlight),
          ciudad        = COALESCE(${b.city || b.ciudad || null}, ciudad),
          region        = COALESCE(${b.region || null}, region),
          barrio        = COALESCE(${b.barrio || null}, barrio),
          lat           = COALESCE(${b.lat || null}, lat),
          lng           = COALESCE(${b.lng || null}, lng),
          whatsapp      = COALESCE(${b.whatsapp || null}, whatsapp),
          email         = COALESCE(${b.email || null}, email),
          web           = COALESCE(${b.web || null}, web),
          instagram     = COALESCE(${b.instagram || null}, instagram),
          precio_desde  = COALESCE(${b.price || b.precio_desde || null}, precio_desde),
          emoji         = COALESCE(${b.emoji || null}, emoji),
          hero_bg       = COALESCE(${b.hero_bg || null}, hero_bg),
          foto_hero     = COALESCE(${b.foto_hero || null}, foto_hero),
          status        = COALESCE(${b.status || null}, status),
          destacado     = COALESCE(${b.destacado ?? null}, destacado),
          actualizado_en = NOW()
        WHERE id = ${id}
      `;

      // Actualizar detalles hostal si vienen
      if (b.habs || b.amenities || b.scores || b.faqs) {
        await sql`
          INSERT INTO destinos_detalles (destino_id)
          VALUES (${id})
          ON CONFLICT (destino_id) DO NOTHING
        `;
        await sql`
          UPDATE destinos_detalles SET
            habitaciones   = COALESCE(${b.habs ? JSON.stringify(b.habs) : null}::jsonb, habitaciones),
            amenidades     = COALESCE(${b.amenities ? JSON.stringify(b.amenities) : null}::jsonb, amenidades),
            scores         = COALESCE(${b.scores ? JSON.stringify(b.scores) : null}::jsonb, scores),
            faqs           = COALESCE(${b.faqs ? JSON.stringify(b.faqs) : null}::jsonb, faqs),
            transporte     = COALESCE(${b.transport ? JSON.stringify(b.transport) : null}::jsonb, transporte),
            eventos_hostal = COALESCE(${b.hostalEvents ? JSON.stringify(b.hostalEvents) : null}::jsonb, eventos_hostal),
            checkin        = COALESCE(${b.checkin || null}, checkin),
            checkout       = COALESCE(${b.checkout || null}, checkout),
            booking_url    = COALESCE(${b.bookingUrl || null}, booking_url),
            hostelworld_url = COALESCE(${b.hostelworld || null}, hostelworld_url),
            airbnb_url     = COALESCE(${b.airbnb || null}, airbnb_url)
          WHERE destino_id = ${id}
        `;
      }

      return ok({ message: 'Destino actualizado', id });
    }

    // ── DELETE — eliminar destino ────────────────────────────
    if (method === 'DELETE') {
      const { id } = params;
      if (!id) return err('Falta id en query params');

      await sql`DELETE FROM destinos WHERE id = ${id}`;
      return ok({ message: 'Destino eliminado', id });
    }

    return err('Método no soportado', 405);

  } catch (e: any) {
    console.error('[admin-destinos]', e);
    return err(e.message || 'Error interno', 500);
  }
};

function slugify(str: string) {
  return str.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
