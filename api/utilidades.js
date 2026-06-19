// api/utilidades.js  v2 — sitemap + visitas + diagnostico + fotos (Paso 17)
// ?tipo=sitemap     → genera sitemap.xml dinámico (sin auth)
// ?tipo=visitas     → tracking visitas (POST sin auth, GET con auth)
// ?tipo=diagnostico → info sistema (auth)
// ?tipo=fotos       → CRUD galería destinos_fotos (GET sin auth, resto con auth)

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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  var tipo = req.query.tipo || '';
  var sql  = neon(process.env.DATABASE_URL);

  // ══ SITEMAP ══════════════════════════════════════════════════════
  if (tipo === 'sitemap' || !tipo) {
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
        var pri  = CAT_PRIORITY[r.categoria_slug] || '0.75';
        if ((r.total_resenas||0) > 10) pri = '0.90';
        if ((r.total_resenas||0) > 50) pri = '0.95';
        var fecha = r.actualizado_en
          ? new Date(r.actualizado_en).toISOString().slice(0,10)
          : new Date().toISOString().slice(0,10);
        urls += '\n  <url><loc>'+xe(BASE+'/'+r.slug+'.html')+'</loc>'
          +'<changefreq>weekly</changefreq><priority>'+pri+'</priority>'
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
        '<?xml version="1.0" encoding="UTF-8"?>'
        +'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
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
      if (!slug) return res.status(400).json({ ok:false, error:'slug requerido' });
      var isAdm = auth(req);
      var dr = await sql(
        'SELECT id,nombre,ciudad,rating,total_resenas,status FROM destinos WHERE slug=$1 LIMIT 1',
        [slug]
      );
      if (!dr.length) return res.status(404).json({ ok:false, error:'No encontrado' });
      var d = dr[0];
      if (d.status !== 'published' && !isAdm)
        return res.status(403).json({ ok:false, error:'No autorizado' });
      var ahora = new Date();
      var h30   = new Date(ahora-30*86400000).toISOString();
      var h7    = new Date(ahora-7*86400000).toISOString();
      var v  = await sql(
        `SELECT COUNT(*) AS total,
                COUNT(CASE WHEN creado_en>=$2 THEN 1 END) AS v30,
                COUNT(CASE WHEN creado_en>=$3 THEN 1 END) AS v7
         FROM interacciones WHERE destino_id=$1 AND tipo='visita'`,
        [d.id, h30, h7]
      );
      var g  = await sql(
        `SELECT COUNT(*) AS n FROM interacciones WHERE destino_id=$1 AND tipo='guardado'`,
        [d.id]
      );
      var rv = await sql(
        `SELECT COUNT(*) AS n, ROUND(AVG(rating)::numeric,1) AS avg
         FROM interacciones WHERE destino_id=$1 AND tipo='resena'`,
        [d.id]
      );
      var hist = await sql(
        `SELECT DATE(creado_en AT TIME ZONE 'America/Bogota') AS dia, COUNT(*) AS n
         FROM interacciones
         WHERE destino_id=$1 AND tipo='visita' AND creado_en>=$2
         GROUP BY dia ORDER BY dia ASC`,
        [d.id, h30]
      );
      var vv = v[0]||{};
      return res.status(200).json({
        ok:true,
        destino:  { slug, nombre:d.nombre, ciudad:d.ciudad,
                    rating:d.rating?parseFloat(d.rating):0,
                    total_resenas:d.total_resenas||0 },
        stats:    { visitas_total:parseInt(vv.total||0),
                    visitas_30d:parseInt(vv.v30||0),
                    visitas_7d:parseInt(vv.v7||0),
                    guardados:parseInt((g[0]||{}).n||0),
                    resenas:parseInt((rv[0]||{}).n||0),
                    rating_promedio:parseFloat((rv[0]||{}).avg||0) },
        historico: hist.map(function(r){ return { dia:r.dia, visitas:parseInt(r.n) }; }),
      });
    }
  }

  // ══ FOTOS (Paso 17) ═══════════════════════════════════════════════
  // GET ?tipo=fotos&destino_id=UUID  → listar fotos (sin auth)
  // GET ?tipo=fotos&slug=X           → listar fotos por slug (sin auth)
  // POST ?tipo=fotos                 → agregar fotos (auth)
  // PUT  ?tipo=fotos&id=N            → actualizar foto (auth)
  // DELETE ?tipo=fotos&id=N          → eliminar foto (auth)
  if (tipo === 'fotos') {

    if (req.method === 'GET') {
      var destId2 = req.query.destino_id || null;
      var slug2   = req.query.slug       || null;
      if (!destId2 && slug2) {
        var sr = await sql('SELECT id FROM destinos WHERE slug=$1 LIMIT 1',[slug2]);
        if (sr.length) destId2 = sr[0].id;
      }
      if (!destId2) return res.status(400).json({ ok:false, error:'destino_id o slug requerido' });
      var fotos = await sql(
        `SELECT id, url, caption, orden, es_hero, creado_en
         FROM destinos_fotos
         WHERE destino_id=$1
         ORDER BY es_hero DESC NULLS LAST, orden ASC NULLS LAST, creado_en ASC`,
        [destId2]
      );
      return res.status(200).json({ ok:true, total:fotos.length, data:fotos });
    }

    if (req.method === 'POST') {
      if (!auth(req)) return res.status(401).json({ ok:false, error:'No autorizado' });
      var b2      = req.body || {};
      var destId3 = b2.destino_id;
      if (!destId3) return res.status(400).json({ ok:false, error:'destino_id requerido' });
      var lista = Array.isArray(b2.fotos) ? b2.fotos
                : b2.url ? [{ url:b2.url, caption:b2.caption||'', orden:b2.orden||0, es_hero:b2.es_hero||false }]
                : [];
      if (!lista.length) return res.status(400).json({ ok:false, error:'Falta url o fotos[]' });
      var insertadas = [];
      for (var i = 0; i < lista.length; i++) {
        var f = lista[i];
        if (!f.url) continue;
        var r2 = await sql(
          `INSERT INTO destinos_fotos (destino_id,url,caption,orden,es_hero,creado_en)
           VALUES ($1,$2,$3,$4,$5,NOW()) ON CONFLICT DO NOTHING
           RETURNING id,url,caption,orden,es_hero`,
          [destId3, f.url.trim(), f.caption||'',
           typeof f.orden==='number'?f.orden:i, f.es_hero||false]
        );
        if (r2.length) insertadas.push(r2[0]);
      }
      // Hero: primera foto si destino no tiene foto_hero aún
      var heroF = lista.find(function(f){ return f.es_hero&&f.url; });
      if (!heroF && lista[0]&&lista[0].url) {
        var ex = await sql('SELECT foto_hero FROM destinos WHERE id=$1 LIMIT 1',[destId3]);
        if (ex.length && !ex[0].foto_hero) heroF = lista[0];
      }
      if (heroF) {
        await sql(
          'UPDATE destinos SET foto_hero=$1,actualizado_en=NOW() WHERE id=$2',
          [heroF.url, destId3]
        ).catch(function(){});
      }
      return res.status(200).json({
        ok:true, mensaje:insertadas.length+' foto(s) guardadas', data:insertadas
      });
    }

    if (req.method === 'PUT') {
      if (!auth(req)) return res.status(401).json({ ok:false, error:'No autorizado' });
      var fid  = req.query.id || (req.body&&req.body.id);
      var b3   = req.body || {};
      if (!fid) return res.status(400).json({ ok:false, error:'id requerido' });
      var upd = await sql(
        `UPDATE destinos_fotos
         SET caption=COALESCE($2,caption), orden=COALESCE($3,orden), es_hero=COALESCE($4,es_hero)
         WHERE id=$1 RETURNING id,url,caption,orden,es_hero`,
        [fid,
         b3.caption!==undefined?b3.caption:null,
         b3.orden!==undefined?b3.orden:null,
         b3.es_hero!==undefined?b3.es_hero:null]
      );
      if (!upd.length) return res.status(404).json({ ok:false, error:'Foto no encontrada' });
      if (b3.es_hero===true) {
        var dr2 = await sql('SELECT destino_id FROM destinos_fotos WHERE id=$1 LIMIT 1',[fid]);
        if (dr2.length) {
          await sql(
            'UPDATE destinos SET foto_hero=$1,actualizado_en=NOW() WHERE id=$2',
            [upd[0].url, dr2[0].destino_id]
          ).catch(function(){});
        }
      }
      return res.status(200).json({ ok:true, data:upd[0] });
    }

    if (req.method === 'DELETE') {
      if (!auth(req)) return res.status(401).json({ ok:false, error:'No autorizado' });
      var fid2 = req.query.id || (req.body&&req.body.id);
      if (!fid2) return res.status(400).json({ ok:false, error:'id requerido' });
      var fr = await sql(
        'SELECT url,destino_id,es_hero FROM destinos_fotos WHERE id=$1 LIMIT 1',[fid2]
      );
      if (!fr.length) return res.status(404).json({ ok:false, error:'Foto no encontrada' });
      await sql('DELETE FROM destinos_fotos WHERE id=$1',[fid2]);
      if (fr[0].es_hero) {
        var sig = await sql(
          `SELECT url FROM destinos_fotos WHERE destino_id=$1
           ORDER BY orden ASC NULLS LAST LIMIT 1`,
          [fr[0].destino_id]
        );
        await sql(
          'UPDATE destinos SET foto_hero=$1,actualizado_en=NOW() WHERE id=$2',
          [sig.length?sig[0].url:'', fr[0].destino_id]
        ).catch(function(){});
      }
      return res.status(200).json({ ok:true, mensaje:'Foto eliminada' });
    }
  }

  // ══ DIAGNÓSTICO ══════════════════════════════════════════════════
  if (tipo === 'diagnostico') {
    if (!auth(req)) return res.status(401).json({ ok:false, error:'No autorizado' });
    var tbls = await sql(
      `SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename`
    );
    var cols = {};
    for (var j = 0; j < tbls.length; j++) {
      var t = tbls[j].tablename;
      var c = await sql(
        `SELECT column_name,data_type FROM information_schema.columns
         WHERE table_name=$1 AND table_schema='public' ORDER BY ordinal_position`,[t]
      );
      cols[t] = c.map(function(x){ return x.column_name+':'+x.data_type; });
    }
    var cats = await sql('SELECT id,slug,nombre FROM categorias ORDER BY id');
    return res.status(200).json({
      ok:true, node_version:process.version,
      db_url:(process.env.DATABASE_URL||'').slice(0,45)+'...',
      tablas:tbls.map(function(r){ return r.tablename; }),
      columnas:cols, categorias:cats,
    });
  }

  return res.status(400).json({
    ok:false,
    error:'?tipo requerido: sitemap | visitas | fotos | diagnostico',
  });
};
