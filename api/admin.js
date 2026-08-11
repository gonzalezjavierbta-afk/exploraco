// api/admin.js -- endpoint unificado para todas las funciones del admin (ASCII-safe: 0 backticks, 0 no-ASCII)
// Ruta por ?recurso=X:
//   solicitudes  -> moderar-destinos (listar/aprobar/rechazar)
//   resenas      -> resenas-admin (listar/eliminar resenas)
//   destacado    -> destacar (activar/desactivar perfiles)
//   notificaciones -> envio de emails
// Auth: Bearer exploraco12345 en todos los casos

const { neon } = require('@neondatabase/serverless');

var RESEND_API  = 'https://api.resend.com/emails';
var FROM_EMAIL  = 'ExploraCO <noreply@exploraco.co>';
var ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@exploraco.co';

var PLANES = {
  mensual:    { precio: 49000,  dias: 30,  label: 'Mensual'    },
  trimestral: { precio: 120000, dias: 90,  label: 'Trimestral' },
  anual:      { precio: 390000, dias: 365, label: 'Anual'       },
};

function auth(req) {
  return (req.headers['authorization']||'').replace('Bearer ','').trim()
    === (process.env.ADMIN_SECRET || 'exploraco12345');
}
function authInternal(req) {
  return (req.headers['x-internal-secret']||'').trim()
    === (process.env.ADMIN_SECRET || 'exploraco12345');
}

// -- EMAIL ----------------------------------------------------------
async function sendEmail(to, subject, html) {
  var key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false, reason: 'no_api_key' };
  try {
    var r = await fetch(RESEND_API, {
      method: 'POST',
      headers: { 'Content-Type':'application/json', 'Authorization':'Bearer '+key },
      body: JSON.stringify({ from: FROM_EMAIL, to: [to], subject, html }),
    });
    var d = await r.json();
    if (!r.ok) throw new Error(d.message || 'Resend '+r.status);
    return { ok: true, id: d.id };
  } catch(e) { return { ok: false, error: e.message }; }
}

function emailResena(b) {
  var s = '\u2605'.repeat(Math.round(b.rating||0))+'\u2606'.repeat(5-Math.round(b.rating||0));
  return '<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:2rem">'
    + '<h2 style="color:#E8A020">\u2b50 Nueva rese\u00f1a \u2014 ' + (b.destino_nombre||'') + '</h2>'
    + '<p><strong>Por:</strong> ' + (b.usuario_nombre||'Visitante') + '</p>'
    + '<p><strong>Rating:</strong> ' + s + '</p>'
    + '<p><strong>Texto:</strong> ' + (b.texto||'(sin texto)') + '</p>'
    + '<p><a href="https://exploraco.vercel.app/admin.html" style="background:#E8A020;color:#fff;padding:8px 16px;border-radius:6px;text-decoration:none">Ver en admin \u2192</a></p>'
    + '</div>';
}
function emailSolicitud(b) {
  return '<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:2rem">'
    + '<h2 style="color:#6366f1">\ud83d\udd14 Nueva solicitud \u2014 ' + (b.nombre||'') + '</h2>'
    + '<p><strong>Ciudad:</strong> ' + (b.ciudad||'') + '</p>'
    + '<p><strong>Categor\u00eda:</strong> ' + (b.categoria||'') + '</p>'
    + '<p><strong>WhatsApp:</strong> <a href="https://wa.me/' + b.whatsapp + '">' + b.whatsapp + '</a></p>'
    + '<p><strong>Descripci\u00f3n:</strong> ' + (b.descripcion_corta||'') + '</p>'
    + '<p><a href="https://exploraco.vercel.app/admin.html" style="background:#E8A020;color:#fff;padding:8px 16px;border-radius:6px;text-decoration:none">Revisar en admin \u2192</a></p>'
    + '</div>';
}

// -- HANDLER PRINCIPAL ------------------------------------------------
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Internal-Secret');
  if (req.method === 'OPTIONS') return res.status(200).end();

  var recurso = req.query.recurso || '';
  var sql     = neon(process.env.DATABASE_URL);
  var body    = req.body || {};

  // == SOLICITUDES (moderar-destinos) ==================================
  if (recurso === 'solicitudes') {
    if (!auth(req)) return res.status(401).json({ ok:false, error:'No autorizado' });

    if (req.method === 'GET') {
      var status  = req.query.status || 'draft';
      var allowed = ['draft','published','archived'];
      if (!allowed.includes(status)) status = 'draft';
      var limit  = Math.min(parseInt(req.query.limit)  || 15, 100);
      var offset = Math.max(parseInt(req.query.offset) || 0, 0);

      var rows = await sql(
        'SELECT d.id, d.slug, d.nombre, '
        + 'd.categoria_slug AS categoria, c.nombre AS categoria_nombre, '
        + 'd.ciudad, d.region AS departamento, '
        + 'd.lead AS descripcion_corta, d.foto_hero AS foto_principal, '
        + 'd.precio_desde, d.lat, d.lng, d.status, d.destacado, '
        + 'd.creado_en AS created_at, '
        + 'd.whatsapp, d.email, d.web, d.instagram, '
        + 'd.tags AS detalles '
        + 'FROM destinos d '
        + 'LEFT JOIN categorias c ON c.slug = d.categoria_slug '
        + 'WHERE d.status = $1 '
        + 'ORDER BY d.creado_en DESC LIMIT $2 OFFSET $3',
        [status, limit, offset]
      );
      var total = await sql('SELECT COUNT(*) AS n FROM destinos WHERE status=$1',[status]);
      return res.status(200).json({ ok:true, status, total: parseInt((total[0]||{}).n||0), items:rows });
    }

    if (req.method === 'POST') {
      var acciones = { aprobar:'published', rechazar:'archived', pendiente:'draft' };
      if (!body.id || !acciones[body.accion])
        return res.status(400).json({ ok:false, error:'Falta id o accion v\u00e1lida' });
      var nuevo = acciones[body.accion];
      var upd = await sql(
        'UPDATE destinos SET status=$1, destacado=$2, actualizado_en=NOW() '
        + 'WHERE id=$3 RETURNING id, slug, nombre, status',
        [nuevo, Boolean(body.destacado||false), body.id]
      );
      if (!upd.length) return res.status(404).json({ ok:false, error:'No encontrado' });
      var msgs = { published:'\u2705 Publicado', archived:'\ud83d\uddc4\ufe0f Archivado', draft:'\u23f3 Borrador' };
      return res.status(200).json({
        ok:true, mensaje: msgs[nuevo],
        url: nuevo==='published' ? 'https://exploraco.vercel.app/'+upd[0].slug+'.html' : null,
        destino: upd[0],
      });
    }
  }

  // == RESENAS (resenas-admin) ==========================================
  if (recurso === 'resenas') {
    if (!auth(req)) return res.status(401).json({ ok:false, error:'No autorizado' });

    if (req.method === 'GET') {
      var limit2  = Math.min(parseInt(req.query.limit)||50, 200);
      var offset2 = Math.max(parseInt(req.query.offset)||0, 0);
      var slug2   = req.query.slug || null;

      var conds2 = ["i.tipo='resena'"]; var params2=[]; var pi2=1;
      if (slug2) { conds2.push('d.slug=$'+pi2++); params2.push(slug2); }

      var rows2 = await sql(
        'SELECT i.id, i.rating, i.texto, i.creado_en, i.xp_ganado, '
        + 'u.nombre AS usuario_nombre, u.email AS usuario_email, '
        + 'd.id AS destino_id, d.slug AS destino_slug, '
        + 'd.nombre AS destino_nombre, d.ciudad AS destino_ciudad '
        + 'FROM interacciones i '
        + 'LEFT JOIN usuarios u ON u.id=i.usuario_id '
        + 'LEFT JOIN destinos d ON d.id=i.destino_id '
        + 'WHERE ' + conds2.join(' AND ') + ' '
        + 'ORDER BY i.creado_en DESC LIMIT $' + pi2 + ' OFFSET $' + (pi2+1),
        [...params2, limit2, offset2]
      );
      var total2 = await sql(
        'SELECT COUNT(*) AS n, ROUND(AVG(i.rating)::numeric,2) AS avg, '
        + 'COUNT(CASE WHEN i.rating>=4 THEN 1 END) AS pos, '
        + 'COUNT(CASE WHEN i.rating<=2 THEN 1 END) AS neg '
        + 'FROM interacciones i LEFT JOIN destinos d ON d.id=i.destino_id '
        + 'WHERE ' + conds2.join(' AND '), params2
      );
      var st2 = total2[0]||{};
      return res.status(200).json({
        ok:true, total: parseInt(st2.n||0),
        stats: { total:parseInt(st2.n||0), rating_promedio:parseFloat(st2.avg||0), positivas:parseInt(st2.pos||0), negativas:parseInt(st2.neg||0) },
        data: rows2.map(function(r){
          var txt=r.texto||''; var m=txt.match(/^\[([^\]]+)\]\s*/);
          return { id:r.id, rating: r.rating?parseFloat(r.rating):0, texto: m?txt.slice(m[0].length):txt,
            fecha:r.creado_en, xp:r.xp_ganado||0,
            usuario:{ nombre:r.usuario_nombre||(m?m[1]:'An\u00f3nimo'), email:r.usuario_email||null },
            destino:{ id:r.destino_id, slug:r.destino_slug||'', nombre:r.destino_nombre||'', ciudad:r.destino_ciudad||'' }};
        }),
      });
    }

    if (req.method === 'DELETE') {
      var rid = req.query.id || body.id;
      if (!rid) return res.status(400).json({ ok:false, error:'id requerido' });
      var rv = await sql('SELECT destino_id FROM interacciones WHERE id=$1 LIMIT 1',[rid]);
      if (!rv.length) return res.status(404).json({ ok:false, error:'No encontrada' });
      await sql('DELETE FROM interacciones WHERE id=$1',[rid]);
      await sql(
        'UPDATE destinos SET '
        + 'rating=(SELECT ROUND(AVG(rating)::numeric,2) FROM interacciones WHERE destino_id=$1 AND tipo=\'resena\' AND rating IS NOT NULL), '
        + 'total_resenas=(SELECT COUNT(*) FROM interacciones WHERE destino_id=$1 AND tipo=\'resena\'), '
        + 'actualizado_en=NOW() WHERE id=$1',
        [rv[0].destino_id]
      ).catch(function(){});
      return res.status(200).json({ ok:true, mensaje:'Rese\u00f1a eliminada' });
    }
  }

  // == DESTACADO =========================================================
  if (recurso === 'destacado') {
    if (!auth(req)) return res.status(401).json({ ok:false, error:'No autorizado' });

    if (req.method === 'GET') {
      var slug3 = req.query.slug;
      if (!slug3) {
        var todos = await sql(
          'SELECT slug,nombre,ciudad,categoria_slug,destacado, '
          + 'tags->>\'destacado_hasta\' AS destacado_hasta, tags->>\'plan\' AS plan '
          + 'FROM destinos WHERE status=\'published\' ORDER BY destacado DESC, rating DESC NULLS LAST'
        );
        return res.status(200).json({ ok:true, data:todos });
      }
      var dr = await sql(
        'SELECT id,slug,nombre,ciudad,destacado, '
        + 'tags->>\'destacado_hasta\' AS destacado_hasta, tags->>\'plan\' AS plan '
        + 'FROM destinos WHERE slug=$1 LIMIT 1', [slug3]
      );
      if (!dr.length) return res.status(404).json({ ok:false, error:'No encontrado' });
      var dd = dr[0];
      var hasta3 = dd.destacado_hasta ? new Date(dd.destacado_hasta) : null;
      var activo3 = dd.destacado && hasta3 && hasta3 > new Date();
      return res.status(200).json({ ok:true, slug:dd.slug, nombre:dd.nombre, destacado:dd.destacado||false,
        activo:activo3, plan:dd.plan||null, destacado_hasta:dd.destacado_hasta||null,
        dias_restantes: activo3 ? Math.ceil((hasta3-new Date())/86400000) : 0, planes:PLANES });
    }

    if (req.method === 'POST') {
      var plan3 = body.plan || 'mensual';
      if (!body.slug || !PLANES[plan3]) return res.status(400).json({ ok:false, error:'slug/plan inv\u00e1lido' });
      var hasta4 = new Date(Date.now()+PLANES[plan3].dias*86400000).toISOString();
      var upd3 = await sql(
        'UPDATE destinos SET destacado=true, '
        + 'tags=COALESCE(tags,\'{}\')||$2::jsonb, actualizado_en=NOW() '
        + 'WHERE slug=$1 RETURNING id,slug,nombre',
        [body.slug, JSON.stringify({ destacado_hasta:hasta4, plan:plan3, precio:PLANES[plan3].precio })]
      );
      if (!upd3.length) return res.status(404).json({ ok:false, error:'No encontrado' });
      return res.status(200).json({ ok:true, mensaje:'\u2705 Destacado activado \u2014 plan '+PLANES[plan3].label, hasta:hasta4, destino:upd3[0] });
    }

    if (req.method === 'DELETE') {
      var slug4 = req.query.slug;
      if (!slug4) return res.status(400).json({ ok:false, error:'slug requerido' });
      await sql(
        'UPDATE destinos SET destacado=false, '
        + 'tags=COALESCE(tags,\'{}\')-\'destacado_hasta\'-\'plan\'-\'precio\', actualizado_en=NOW() '
        + 'WHERE slug=$1', [slug4]
      );
      return res.status(200).json({ ok:true, mensaje:'Destacado removido' });
    }
  }

  // == NOTIFICACIONES (email) ============================================
  if (recurso === 'notificaciones') {
    if (!auth(req) && !authInternal(req))
      return res.status(401).json({ ok:false, error:'No autorizado' });
    if (req.method !== 'POST') return res.status(405).end();

    if (body.tipo === 'resena') {
      var r4 = await sendEmail(ADMIN_EMAIL,
        '\u2b50 Nueva rese\u00f1a \u2014 '+(body.destino_nombre||''), emailResena(body));
      return res.status(200).json(r4);
    }
    if (body.tipo === 'solicitud') {
      var r5 = await sendEmail(ADMIN_EMAIL,
        '\ud83d\udd14 Nueva solicitud \u2014 '+(body.nombre||''), emailSolicitud(body));
      return res.status(200).json(r5);
    }
    return res.status(400).json({ ok:false, error:'tipo debe ser: resena | solicitud' });
  }

  // == Sin recurso reconocido =============================================
  return res.status(400).json({
    ok: false,
    error: 'recurso inv\u00e1lido. Usa ?recurso=solicitudes|resenas|destacado|notificaciones',
  });
};
