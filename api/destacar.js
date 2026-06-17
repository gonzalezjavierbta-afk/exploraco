// api/destacar.js
// Sistema de perfiles destacados — monetización
// GET  /api/destacar?slug=X        → ver estado de destacado de un lugar
// POST /api/destacar               → activar destacado (admin) o generar link de pago
// DELETE /api/destacar?slug=X      → quitar destacado (admin)

const { neon } = require('@neondatabase/serverless');

function auth(req) {
  return (req.headers['authorization']||'').replace('Bearer ','').trim()
    === (process.env.ADMIN_SECRET || 'exploraco12345');
}

// Planes disponibles
var PLANES = {
  mensual:   { precio: 49000,  dias: 30,  label: 'Mensual',   ahorro: '' },
  trimestral:{ precio: 120000, dias: 90,  label: 'Trimestral',ahorro: 'Ahorras $27.000' },
  anual:     { precio: 390000, dias: 365, label: 'Anual',      ahorro: 'Ahorras $198.000' },
};

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    var sql = neon(process.env.DATABASE_URL);

    // ── GET: estado de destacado ─────────────────────────────────
    if (req.method === 'GET') {
      var slug = req.query.slug;
      if (!slug) {
        // Sin slug → listar todos los destacados (admin)
        if (!auth(req)) return res.status(401).json({ ok:false, error:'No autorizado' });
        var todos = await sql(
          `SELECT slug, nombre, ciudad, categoria_slug, destacado,
                  tags->>'destacado_hasta' AS destacado_hasta,
                  tags->>'plan' AS plan
           FROM destinos
           WHERE status='published'
           ORDER BY destacado DESC, rating DESC NULLS LAST`
        );
        return res.status(200).json({ ok:true, data: todos });
      }

      var rows = await sql(
        `SELECT id, slug, nombre, ciudad, categoria_slug, destacado,
                tags->>'destacado_hasta' AS destacado_hasta,
                tags->>'plan' AS plan
         FROM destinos WHERE slug=$1 LIMIT 1`,
        [slug]
      );
      if (!rows.length) return res.status(404).json({ ok:false, error:'No encontrado' });

      var d = rows[0];
      var hasta = d.destacado_hasta ? new Date(d.destacado_hasta) : null;
      var activo = d.destacado && hasta && hasta > new Date();

      return res.status(200).json({
        ok: true,
        slug: d.slug,
        nombre: d.nombre,
        destacado: d.destacado || false,
        activo,
        plan: d.plan || null,
        destacado_hasta: d.destacado_hasta || null,
        dias_restantes: activo
          ? Math.ceil((hasta - new Date()) / 86400000)
          : 0,
        planes: PLANES,
      });
    }

    // ── POST: activar destacado (admin lo activa manualmente) ────
    if (req.method === 'POST') {
      if (!auth(req)) return res.status(401).json({ ok:false, error:'No autorizado' });

      var body = req.body || {};
      var slug2 = body.slug;
      var plan  = body.plan || 'mensual';

      if (!slug2) return res.status(400).json({ ok:false, error:'slug requerido' });
      if (!PLANES[plan]) return res.status(400).json({ ok:false, error:'plan inválido' });

      var diasPlan = PLANES[plan].dias;
      var hasta2   = new Date(Date.now() + diasPlan * 86400000).toISOString();

      // Actualizar tags JSONB con info del plan + destacado=true
      var updRows = await sql(
        `UPDATE destinos
         SET
           destacado = true,
           tags = COALESCE(tags, '{}') || $2::jsonb,
           actualizado_en = NOW()
         WHERE slug = $1
         RETURNING id, slug, nombre`,
        [
          slug2,
          JSON.stringify({
            destacado_hasta: hasta2,
            plan: plan,
            precio: PLANES[plan].precio,
          }),
        ]
      );

      if (!updRows.length) return res.status(404).json({ ok:false, error:'Destino no encontrado' });

      return res.status(200).json({
        ok: true,
        mensaje: '✅ Perfil destacado activado — plan '+PLANES[plan].label,
        hasta:   hasta2,
        dias:    diasPlan,
        destino: updRows[0],
      });
    }

    // ── DELETE: quitar destacado ─────────────────────────────────
    if (req.method === 'DELETE') {
      if (!auth(req)) return res.status(401).json({ ok:false, error:'No autorizado' });

      var slug3 = req.query.slug;
      if (!slug3) return res.status(400).json({ ok:false, error:'slug requerido' });

      await sql(
        `UPDATE destinos
         SET
           destacado = false,
           tags = COALESCE(tags,'{}') - 'destacado_hasta' - 'plan' - 'precio',
           actualizado_en = NOW()
         WHERE slug = $1`,
        [slug3]
      );

      return res.status(200).json({ ok:true, mensaje:'Destacado removido' });
    }

    return res.status(405).json({ ok:false, error:'Method not allowed' });

  } catch(err) {
    console.error('[destacar]', err.message);
    return res.status(500).json({ ok:false, error:err.message });
  }
};
