// api/utilidades.js — endpoint unificado para sitemap, diagnostico y visitas
// Ruta por ?tipo=X:
//   sitemap     → genera XML (sin auth)
//   visitas     → tracking de visitas (POST sin auth, GET con auth)
//   diagnostico → info del sistema (auth requerida)

const { neon } = require('@neondatabase/serverless');

var BASE = 'https://exploraco.co';
var STATIC_PAGES = [
  { loc:'/',                        priority:'1.0', freq:'daily'   },
  { loc:'/directorio-hostal.html',  priority:'0.9', freq:'daily'   },
  { loc:'/directorio-comida.html',  priority:'0.9', freq:'daily'   },
  { loc:'/directorio-sitio.html',   priority:'0.9', freq:'daily'   },
  { loc:'/directorio-evento.html',  priority:'0.9', freq:'daily'   },
  { loc:'/publicar.html',           priority:'0.6', freq:'monthly' },
  { loc:'/viajeros.html',           priority:'0.5', freq:'weekly'  },
];
var CAT_PRIORITY = { hostal:'0.85', comida:'0.80', sitio:'0.80', evento:'0.75' };

function auth(req) {
  return (req.headers['authorization']||'').replace('Bearer ','').trim()
    === (process.env.ADMIN_SECRET || 'exploraco12345');
}
function xe(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  var tipo = req.query.tipo || '';
  var sql  = neon(process.env.DATABASE_URL);

  // ══ SITEMAP ══════════════════════════════════════════════════════
  if (tipo === 'sitemap' || req.url === '/sitemap.xml' || !tipo) {
    try {
      var rows = await sql(
        `SELECT slug, categoria_slug, actualizado_en, total_resenas
         FROM destinos WHERE status='published' ORDER BY actualizado_en DESC NULLS LAST`
      );
      var urls = STATIC_PAGES.map(function(p){
        return '\n  <url><loc>'+xe(BASE+p.loc)+'</loc>'
          +'<changefreq>'+p.freq+'</changefreq>'
          +'<priority>'+p.priority+'</priority>'
          +'<lastmod>'+new Date().toISOString().slice(0,10)+'</lastmod></url>';
      }).join('');
      rows.forEach(function(r){
        var pri = CAT_PRIORITY[r.categoria_slug] || '0.75';
        if ((r.total_resenas||0) > 10) pri = '0.90';
        if ((r.total_resenas||0) > 50) pri = '0.95';
        var fecha = r.actualizado_en ? new Date(r.actualizado_en).toISOString().slice(0,10) : new Date().toISOString().slice(0,10);
        urls += '\n  <url><loc>'+xe(BASE+'/'+r.slug+'.html')+'</loc>'
          +'<changefreq>weekly</changefreq>'
          +'<priority>'+pri+'</priority>'
          +'<lastmod>'+fecha+'</lastmod></url>';
      });
      res.setHeader('Content-Type','application/xml; charset=utf-8');
      res.setHeader('Cache-Control','s-maxage=3600, stale-while-revalidate=7200');
      return res.status(200).send(
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        +'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+urls+'\n</urlset>'
      );
    } catch(e) {
      res.setHeader('Content-Type','application/xml');
      return res.status(200).send(
        '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
        +'<url><loc>'+BASE+'/</loc><priority>1.0</priority></url></urlset>'
      );
    }
  }

  // ══ VISITAS ═══════════════════════════════════════════════════════
  if (tipo === 'visitas') {
    if (req.method === 'POST') {
      var body   = req.body || {};
      var destId = body.destino_id;
      if (!destId) return res.status(400).json({ ok:false, error:'destino_id requerido' });
      var ua = (req.headers['user-agent']||'').slice(0,200);
      if (/bot|crawler|spider|google|bing|baidu|yandex/i.test(ua))
        return res.status(200).json({ ok:true, counted:false });
      await sql(
        `INSERT INTO interacciones (destino_id, tipo, texto, xp_ganado, creado_en)
         VALUES ($1,'visita',$2,0,NOW())`,
        [destId, body.referrer||null]
      ).catch(function(){});
      return res.status(200).json({ ok:true, counted:true });
    }

    if (req.method === 'GET') {
      var slug = req.query.slug;
      var isAdmin = auth(req);
      if (!slug) return res.status(400).json({ ok:false, error:'slug requerido' });
      var dr = await sql(
        'SELECT id,nombre,ciudad,rating,total_resenas,status FROM destinos WHERE slug=$1 LIMIT 1',
        [slug]
      );
      if (!dr.length) return res.status(404).json({ ok:false, error:'No encontrado' });
      var d = dr[0];
      if (d.status !== 'published' && !isAdmin)
        return res.status(403).json({ ok:false, error:'No autorizado' });
      var ahora = new Date();
      var h30   = new Date(ahora - 30*86400000).toISOString();
      var h7    = new Date(ahora -  7*86400000).toISOString();
      var v = await sql(
        `SELECT COUNT(*) AS total,
                COUNT(CASE WHEN creado_en>=$2 THEN 1 END) AS v30,
                COUNT(CASE WHEN creado_en>=$3 THEN 1 END) AS v7
         FROM interacciones WHERE destino_id=$1 AND tipo='visita'`,
        [d.id, h30, h7]
      );
      var g = await sql(`SELECT COUNT(*) AS n FROM interacciones WHERE destino_id=$1 AND tipo='guardado'`,[d.id]);
      var rv = await sql(
        `SELECT COUNT(*) AS n, ROUND(AVG(rating)::numeric,1) AS avg
         FROM interacciones WHERE destino_id=$1 AND tipo='resena'`,[d.id]
      );
      var hist = await sql(
        `SELECT DATE(creado_en AT TIME ZONE 'America/Bogota') AS dia, COUNT(*) AS n
         FROM interacciones WHERE destino_id=$1 AND tipo='visita' AND creado_en>=$2
         GROUP BY dia ORDER BY dia ASC`,
        [d.id, h30]
      );
      var vv = v[0]||{};
      return res.status(200).json({ ok:true,
        destino:{ slug, nombre:d.nombre, ciudad:d.ciudad, rating:d.rating?parseFloat(d.rating):0, total_resenas:d.total_resenas||0 },
        stats:{ visitas_total:parseInt(vv.total||0), visitas_30d:parseInt(vv.v30||0), visitas_7d:parseInt(vv.v7||0),
          guardados:parseInt((g[0]||{}).n||0), resenas:parseInt((rv[0]||{}).n||0),
          rating_promedio:parseFloat((rv[0]||{}).avg||0) },
        historico: hist.map(function(r){ return { dia:r.dia, visitas:parseInt(r.n) }; }),
      });
    }
  }

  // ══ DIAGNÓSTICO ══════════════════════════════════════════════════
  if (tipo === 'diagnostico') {
    if (!auth(req)) return res.status(401).json({ ok:false, error:'No autorizado' });
    var tablas = await sql(`SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename`);
    var cols   = {};
    for (var i = 0; i < tablas.length; i++) {
      var t = tablas[i].tablename;
      var c = await sql(
        `SELECT column_name, data_type FROM information_schema.columns
         WHERE table_name=$1 AND table_schema='public' ORDER BY ordinal_position`, [t]
      );
      cols[t] = c.map(function(x){ return x.column_name+':'+x.data_type; });
    }
    var cats = await sql('SELECT id,slug,nombre FROM categorias ORDER BY id');
    return res.status(200).json({
      ok:true, node_version: process.version,
      db_url: (process.env.DATABASE_URL||'').slice(0,45)+'...',
      tablas: tablas.map(function(r){ return r.tablename; }),
      columnas: cols, categorias: cats,
    });
  }

  return res.status(400).json({
    ok:false,
    error:'?tipo requerido: sitemap | visitas | diagnostico',
  });
};
