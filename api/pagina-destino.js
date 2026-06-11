// /api/pagina-destino.js  v3
// Sirve páginas individuales dinámicamente desde Neon DB
// CommonJS — auto-detecta driver neon o pg

var DATABASE_URL = process.env.DATABASE_URL;

async function getClient() {
  try {
    var neonMod = require('@neondatabase/serverless');
    var sql = neonMod.neon(DATABASE_URL);
    return { type: 'neon', sql: sql };
  } catch (e1) {
    try {
      var pg = require('pg');
      var pool = new pg.Pool({
        connectionString: DATABASE_URL,
        ssl: { rejectUnauthorized: false },
        max: 1, connectionTimeoutMillis: 10000,
      });
      var client = await pool.connect();
      return { type: 'pg', client: client };
    } catch (e2) {
      throw new Error('No DB driver: ' + e1.message + ' / ' + e2.message);
    }
  }
}

async function query(db, sql, params) {
  if (db.type === 'neon') {
    var r = await db.sql(sql, params);
    return Array.isArray(r) ? r : (r.rows || []);
  }
  var r = await db.client.query(sql, params);
  return r.rows;
}

function releaseDB(db) {
  try { if (db && db.type === 'pg' && db.client) db.client.release(); } catch(e) {}
}

var CAT_ICONS  = { hostal:'🏨', comida:'🍽️', sitio:'🏔️', evento:'🎉' };
var CAT_LABELS = { hostal:'Hospedaje', comida:'Comida & Restaurantes', sitio:'Lugares & Sitios', evento:'Eventos' };
var CAT_DIR    = { hostal:'directorio-hostal.html', comida:'directorio-comida.html', sitio:'directorio-sitio.html', evento:'directorio-evento.html' };

function fmtCOP(n) { return n ? '$'+Number(n).toLocaleString('es-CO') : null; }
function esc(s) {
  if (s === null || s === undefined) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function buildHTML(destino, detalles, fotos, resenas, catSlug) {
  var d      = (typeof detalles === 'string' ? JSON.parse(detalles) : detalles) || {};
  var icon   = CAT_ICONS[catSlug]  || '📍';
  var catLbl = CAT_LABELS[catSlug] || 'Destino';
  var catDir = CAT_DIR[catSlug]    || 'index.html';
  var precio = fmtCOP(destino.precio_desde);
  var foto0  = destino.foto_principal || 'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=1200&q=80';
  var rating = destino.rating ? Number(destino.rating).toFixed(1) : null;
  var nRes   = parseInt(destino.total_resenas || 0);

  // ── Bloques reutilizables ──
  var galeriaHTML = (fotos||[]).map(function(f){
    return '<div class="gi"><img src="'+esc(f.url)+'" alt="'+esc(f.caption||destino.nombre)+'" loading="lazy"></div>';
  }).join('');

  var habs = d.habitaciones || [];
  var habHTML = habs.length ? `<section id="habitaciones" class="sec"><h2>${icon} Habitaciones</h2>
    <div class="tbl-w"><table class="tbl"><thead><tr><th>Tipo</th><th>Camas</th><th>Precio</th><th></th></tr></thead><tbody>
    ${habs.map(function(h){return `<tr><td><b>${esc(h.nombre)}</b>${h.badge?'<span class="badge">'+esc(h.badge)+'</span>':''}</td><td>${esc(h.camas)}</td><td>${fmtCOP(h.precio)||'—'}</td><td>${d.whatsapp?'<a href="https://wa.me/'+esc(d.whatsapp)+'" class="bwa" target="_blank">Reservar</a>':''}</td></tr>`;}).join('')}
    </tbody></table></div></section>` : '';

  var amenidades = d.amenidades || [];
  var amenHTML = amenidades.length ? `<section id="servicios" class="sec"><h2>✅ Servicios</h2>
    <div class="chips">${amenidades.map(function(a){return '<span class="chip">✓ '+esc(a)+'</span>';}).join('')}</div></section>` : '';

  var faqs = d.faqs || [];
  var faqHTML = faqs.length ? `<section id="faq" class="sec"><h2>❓ Preguntas frecuentes</h2>
    ${faqs.map(function(f){return `<details class="faq"><summary>${esc(f.pregunta)}</summary><p>${esc(f.respuesta)}</p></details>`;}).join('')}</section>` : '';

  var rLinks = [];
  if(d.whatsapp)        rLinks.push('<a href="https://wa.me/'+esc(d.whatsapp)+'" class="rbtn wa" target="_blank">💬 Reservar por WhatsApp</a>');
  if(d.booking_url)     rLinks.push('<a href="'+esc(d.booking_url)+'" class="rbtn bk" target="_blank">🏨 Booking.com</a>');
  if(d.hostelworld_url) rLinks.push('<a href="'+esc(d.hostelworld_url)+'" class="rbtn hw" target="_blank">🌍 Hostelworld</a>');
  if(d.airbnb_url)      rLinks.push('<a href="'+esc(d.airbnb_url)+'" class="rbtn ab" target="_blank">🏡 Airbnb</a>');
  var reservarHTML = rLinks.length ? `<section id="reservar" class="sec"><h2>📅 Reservar</h2><div class="rbtns">${rLinks.join('')}</div></section>` : '';

  var mapaHTML = (destino.lat && destino.lng) ? `<section id="mapa" class="sec"><h2>🗺️ Ubicación</h2>
    <iframe width="100%" height="280" style="border:0;border-radius:10px" loading="lazy"
    src="https://www.google.com/maps?q=${destino.lat},${destino.lng}&z=15&output=embed"></iframe></section>` : '';

  var resenasHTML = (resenas||[]).length
    ? `<section id="resenas" class="sec"><h2>💬 Reseñas ${rating?'<span class="rbadge">⭐ '+rating+'</span>':''}</h2>
      ${resenas.map(function(r){return `<div class="rv"><div class="rvh"><span class="av">${esc((r.usuario_nombre||'V').slice(0,2).toUpperCase())}</span><div><b>${esc(r.usuario_nombre||'Viajero')}</b><span class="stars">${'★'.repeat(r.puntuacion||5)}${'☆'.repeat(5-(r.puntuacion||5))}</span></div></div>${r.texto?'<p>'+esc(r.texto)+'</p>':''}</div>`;}).join('')}</section>`
    : `<section id="resenas" class="sec"><h2>💬 Reseñas</h2><p style="color:#888;font-size:.875rem">Sé el primero en dejar una reseña.</p></section>`;

  var ctLinks = [];
  if(d.whatsapp)  ctLinks.push('<a href="https://wa.me/'+esc(d.whatsapp)+'" target="_blank">💬 WhatsApp</a>');
  if(d.instagram) ctLinks.push('<a href="https://instagram.com/'+esc((d.instagram||'').replace('@',''))+'" target="_blank">📷 @'+esc((d.instagram||'').replace('@',''))+'</a>');
  if(d.sitio_web) ctLinks.push('<a href="'+esc(d.sitio_web)+'" target="_blank">🌐 Sitio web</a>');
  if(d.email)     ctLinks.push('<a href="mailto:'+esc(d.email)+'">✉️ '+esc(d.email)+'</a>');

  var anchorLinks = ['<a href="#descripcion">Sobre</a>'];
  if(fotos && fotos.length)   anchorLinks.push('<a href="#galeria">Fotos</a>');
  if(habs.length)              anchorLinks.push('<a href="#habitaciones">Habitaciones</a>');
  if(rLinks.length)            anchorLinks.push('<a href="#reservar">Reservar</a>');
  if(amenidades.length)        anchorLinks.push('<a href="#servicios">Servicios</a>');
  if(destino.lat && destino.lng) anchorLinks.push('<a href="#mapa">Mapa</a>');
  if(faqs.length)              anchorLinks.push('<a href="#faq">FAQ</a>');
  anchorLinks.push('<a href="#resenas">Reseñas</a>');

  var css = `
:root{--gold:#E8A020;--gold-d:#c47c0a;--bg:#f9f7f4;--card:#fff;--text:#1a1a1a;--muted:#666;--r:12px}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:var(--bg);color:var(--text)}
a{color:var(--gold-d);text-decoration:none}a:hover{text-decoration:underline}
.nav{background:#fff;border-bottom:1px solid #eee;padding:0 1rem;display:flex;align-items:center;justify-content:space-between;height:52px;position:sticky;top:0;z-index:100;box-shadow:0 1px 6px rgba(0,0,0,.06)}
.nav-logo{font-size:1.2rem;font-weight:900;letter-spacing:-.5px}.nav-logo em{color:var(--gold);font-style:normal}
.bc{padding:.5rem 1rem;font-size:.78rem;color:var(--muted);max-width:900px;margin:0 auto}.bc a{color:var(--muted)}
.hero{height:320px;background:#111;overflow:hidden;position:relative}
@media(min-width:600px){.hero{height:440px}}
.hero img{width:100%;height:100%;object-fit:cover;opacity:.82}
.hero-ov{position:absolute;inset:0;background:linear-gradient(to top,rgba(0,0,0,.72) 0%,rgba(0,0,0,.08) 60%)}
.hero-c{position:absolute;bottom:0;left:0;right:0;padding:1.25rem;max-width:900px;margin:0 auto}
.hcat{display:inline-block;background:var(--gold);color:#fff;font-size:.7rem;font-weight:800;padding:2px 9px;border-radius:20px;margin-bottom:.35rem;letter-spacing:.5px}
.htitle{font-size:1.875rem;font-weight:900;color:#fff;line-height:1.1;margin-bottom:.35rem}
@media(min-width:600px){.htitle{font-size:2.5rem}}
.hsub{color:rgba(255,255,255,.8);font-size:.875rem;margin-bottom:.55rem}
.hmeta{display:flex;flex-wrap:wrap;gap:.55rem;color:rgba(255,255,255,.85);font-size:.8rem}
.anav{background:#fff;border-bottom:1px solid #eee;overflow-x:auto;white-space:nowrap}
.anav a{display:inline-block;padding:.7rem .875rem;font-size:.8125rem;color:var(--muted);border-bottom:3px solid transparent;transition:all .15s}
.anav a:hover{color:var(--text);text-decoration:none;border-color:var(--gold)}
.body{max-width:900px;margin:0 auto;padding:1.25rem 1rem 3rem;display:flex;gap:1.5rem;flex-direction:column}
@media(min-width:768px){.body{flex-direction:row}}
.main{flex:1;min-width:0;display:flex;flex-direction:column;gap:1.5rem}
.aside{width:100%}@media(min-width:768px){.aside{width:268px;flex-shrink:0}}
.sec{background:var(--card);border-radius:var(--r);padding:1.375rem;box-shadow:0 2px 12px rgba(0,0,0,.07)}
.sec h2{font-size:1rem;font-weight:700;margin-bottom:.875rem}
.desc-txt{font-size:.9375rem;line-height:1.7;color:#333}
.frase{background:#fff8ec;border-left:4px solid var(--gold);padding:.8rem 1rem;border-radius:0 var(--r) var(--r) 0;margin-bottom:.875rem}
.frase p{font-size:.875rem;color:#7a5000;font-style:italic}
.gal{display:grid;grid-template-columns:repeat(2,1fr);gap:.375rem}
@media(min-width:480px){.gal{grid-template-columns:repeat(3,1fr)}}
.gi img{width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:7px;cursor:pointer;transition:opacity .15s}
.gi img:hover{opacity:.85}
.tbl-w{overflow-x:auto}.tbl{width:100%;border-collapse:collapse;font-size:.8125rem}
.tbl th{background:#f5f5f5;padding:.5rem .625rem;text-align:left;font-weight:700;border-bottom:2px solid #eee}
.tbl td{padding:.5rem .625rem;border-bottom:1px solid #f0f0f0;vertical-align:middle}
.badge{background:#fff3cd;color:#7a5000;font-size:.65rem;padding:1px 6px;border-radius:8px;margin-left:5px;font-weight:700}
.bwa{display:inline-block;background:#25D366;color:#fff!important;padding:.3rem .7rem;border-radius:7px;font-size:.78rem;font-weight:600}
.chips{display:flex;flex-wrap:wrap;gap:.4rem}
.chip{background:#f0faf0;color:#2d6a2d;border:1px solid #c8e6c9;padding:.3rem .65rem;border-radius:20px;font-size:.78rem;font-weight:500}
.faq{border:1px solid #eee;border-radius:8px;margin-bottom:.4rem}
.faq summary{padding:.7rem .875rem;cursor:pointer;font-weight:500;font-size:.875rem;list-style:none;display:flex;justify-content:space-between}
.faq summary::-webkit-details-marker{display:none}.faq summary::after{content:"+"}
.faq[open] summary::after{content:"−"}.faq p{padding:.5rem .875rem .875rem;font-size:.8125rem;color:#444;line-height:1.6}
.rbtns{display:flex;flex-direction:column;gap:.5rem}
.rbtn{display:block;text-align:center;padding:.75rem;border-radius:9px;font-weight:600;font-size:.9rem;color:#fff!important;transition:opacity .15s}
.rbtn:hover{opacity:.88;text-decoration:none}.wa{background:#25D366}.bk{background:#003580}.hw{background:#f0593a}.ab{background:#FF5A5F}
.rbadge{background:var(--gold);color:#fff;font-size:.72rem;padding:2px 7px;border-radius:20px;font-weight:700;margin-left:5px}
.rv{border:1px solid #f0f0f0;border-radius:9px;padding:.875rem;margin-bottom:.625rem;background:#fafafa}
.rvh{display:flex;align-items:center;gap:.625rem;margin-bottom:.4rem}
.av{width:34px;height:34px;border-radius:50%;background:var(--gold);color:#fff;font-weight:700;display:flex;align-items:center;justify-content:center;font-size:.78rem;flex-shrink:0}
.stars{color:#f5a623;font-size:.78rem;margin-top:1px;display:block}.rv p{font-size:.8125rem;color:#444;line-height:1.5}
.aside-card{background:var(--card);border-radius:var(--r);padding:1.125rem;box-shadow:0 2px 12px rgba(0,0,0,.07);margin-bottom:.875rem}
.aside-card h3{font-size:.9375rem;font-weight:700;margin-bottom:.75rem}
.irow{display:flex;gap:.5rem;margin-bottom:.5rem;font-size:.8125rem;color:#444}
.irow .ic{width:20px;text-align:center;flex-shrink:0}
.ctlinks{display:flex;flex-direction:column;gap:.375rem}
.ctlinks a{display:block;padding:.6rem .875rem;background:#f5f5f5;border-radius:7px;font-size:.875rem;color:var(--text)!important;transition:background .15s}
.ctlinks a:hover{background:#ebebeb;text-decoration:none}
.frv{display:flex;flex-direction:column;gap:.6rem}
.frv label{font-size:.78rem;font-weight:700;color:var(--muted)}
.frv input,.frv textarea{width:100%;padding:.5rem .7rem;border:1.5px solid #ddd;border-radius:8px;font-size:.875rem;font-family:inherit;transition:border-color .15s}
.frv input:focus,.frv textarea:focus{outline:none;border-color:var(--gold)}
.sinp{display:flex;gap:3px;flex-direction:row-reverse;justify-content:flex-end}
.sinp input{display:none}
.sinp label{font-size:1.375rem;color:#ddd;cursor:pointer;transition:color .12s}
.sinp input:checked~label,.sinp label:hover,.sinp label:hover~label{color:#f5a623}
.btn-rv{background:var(--gold);color:#fff;border:none;padding:.7rem;border-radius:9px;font-weight:700;font-size:.9rem;cursor:pointer;width:100%;transition:background .15s}
.btn-rv:hover{background:var(--gold-d)}.btn-rv:disabled{background:#ccc;cursor:not-allowed}
.rv-ok{display:none;background:#d4edda;color:#155724;padding:.875rem;border-radius:9px;text-align:center;font-weight:700;font-size:.875rem}
.footer{background:#111;color:rgba(255,255,255,.5);padding:1.75rem 1rem;text-align:center;font-size:.78rem}
.footer .flogo{font-size:1.2rem;font-weight:900;color:#fff;margin-bottom:.35rem}
.footer .flogo em{color:var(--gold);font-style:normal}
.pend-banner{background:#fff3cd;border:1px solid #ffc107;color:#856404;padding:.75rem 1.1rem;border-radius:10px;font-size:.875rem;text-align:center;margin:.5rem 0}
`;

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${esc(destino.nombre)} – ExploraCO</title>
<meta name="description" content="${esc(destino.descripcion_corta)}">
<meta property="og:title" content="${esc(destino.nombre)} – ExploraCO">
<meta property="og:description" content="${esc(destino.descripcion_corta)}">
<meta property="og:image" content="${esc(foto0)}">
<meta name="theme-color" content="#E8A020">
<link rel="canonical" href="https://exploraco.vercel.app/${esc(destino.slug)}.html">
<style>${css}</style>
</head>
<body>

<nav class="nav">
  <a class="nav-logo" href="/index.html">EXPLORA<em>CO</em></a>
  <a href="/${esc(catDir)}" style="font-size:.8rem;color:var(--muted)">← ${esc(catLbl)}</a>
</nav>

<div class="bc">
  <a href="/index.html">Inicio</a> › <a href="/${esc(catDir)}">${icon} ${esc(catLbl)}</a> › ${esc(destino.nombre)}
</div>

${destino.status==='pending' ? `<div style="max-width:900px;margin:.5rem auto;padding:0 1rem"><div class="pend-banner">⏳ Este lugar está pendiente de revisión por el equipo de ExploraCO.</div></div>` : ''}

<div class="hero">
  <img src="${esc(foto0)}" alt="${esc(destino.nombre)}" loading="eager">
  <div class="hero-ov"></div>
  <div class="hero-c">
    <span class="hcat">${icon} ${esc(catLbl)}</span>
    <h1 class="htitle">${esc(destino.nombre)}</h1>
    <p class="hsub">${esc(destino.descripcion_corta)}</p>
    <div class="hmeta">
      <span>📍 ${esc(destino.ciudad||'Colombia')}${destino.departamento ? ', '+esc(destino.departamento) : ''}</span>
      ${nRes > 0 ? `<span>⭐ ${esc(String(rating))} · ${nRes} reseñas</span>` : ''}
      ${precio ? `<span>💰 Desde ${esc(precio)}</span>` : ''}
    </div>
  </div>
</div>

<nav class="anav">${anchorLinks.join('')}</nav>

<div class="body">
<main class="main">

  <section id="descripcion" class="sec">
    <h2>📋 Sobre este lugar</h2>
    ${d.frase_destacada ? `<div class="frase"><p>${esc(d.frase_destacada)}</p></div>` : ''}
    <p class="desc-txt">${esc(destino.descripcion_larga || destino.descripcion_corta || '').replace(/\n/g,'<br>')}</p>
  </section>

  ${(fotos&&fotos.length) ? `<section id="galeria" class="sec"><h2>📷 Fotos</h2><div class="gal">${galeriaHTML}</div></section>` : ''}
  ${habHTML}
  ${reservarHTML}
  ${amenHTML}
  ${mapaHTML}
  ${faqHTML}
  ${resenasHTML}

</main>
<aside class="aside">

  <div class="aside-card">
    <h3>ℹ️ Información</h3>
    ${destino.ciudad ? `<div class="irow"><span class="ic">📍</span><span>${esc(destino.ciudad)}${destino.departamento?', '+esc(destino.departamento):''}</span></div>` : ''}
    ${d.barrio ? `<div class="irow"><span class="ic">🏘️</span><span>${esc(d.barrio)}</span></div>` : ''}
    ${d.tipo_alojamiento ? `<div class="irow"><span class="ic">🏠</span><span>${esc(d.tipo_alojamiento)}</span></div>` : ''}
    ${d.checkin ? `<div class="irow"><span class="ic">⏰</span><span>Check-in ${esc(d.checkin)} · Out ${esc(d.checkout||'?')}</span></div>` : ''}
    ${precio ? `<div class="irow"><span class="ic">💰</span><span>Desde <b>${esc(precio)}</b></span></div>` : ''}
    ${nRes > 0 ? `<div class="irow"><span class="ic">⭐</span><span>${esc(String(rating))} · ${nRes} reseñas</span></div>` : ''}
  </div>

  ${ctLinks.length ? `<div class="aside-card"><h3>📞 Contacto</h3><div class="ctlinks">${ctLinks.join('')}</div></div>` : ''}

  <div class="aside-card">
    <h3>✍️ Escribe una reseña</h3>
    <div class="frv" id="frv">
      <div><label>Tu nombre</label><input type="text" id="rv-nom" placeholder="Ej: María García"></div>
      <div>
        <label>Puntuación</label>
        <div class="sinp">
          <input type="radio" name="st" id="s5" value="5"><label for="s5">★</label>
          <input type="radio" name="st" id="s4" value="4"><label for="s4">★</label>
          <input type="radio" name="st" id="s3" value="3"><label for="s3">★</label>
          <input type="radio" name="st" id="s2" value="2"><label for="s2">★</label>
          <input type="radio" name="st" id="s1" value="1"><label for="s1">★</label>
        </div>
      </div>
      <div><label>Tu experiencia</label><textarea id="rv-txt" rows="4" placeholder="¿Qué te pareció este lugar?"></textarea></div>
      <button class="btn-rv" onclick="submitRv()">Publicar reseña →</button>
      <div class="rv-ok" id="rv-ok">🎉 ¡Gracias por tu reseña!</div>
    </div>
  </div>

</aside>
</div>

<footer class="footer">
  <div class="flogo">EXPLORA<em>CO</em></div>
  <p>El directorio turístico más completo de Colombia</p>
  <p style="margin-top:.4rem">
    <a href="/index.html" style="color:var(--gold)">Inicio</a> ·
    <a href="/${esc(catDir)}" style="color:var(--gold)">${esc(catLbl)}</a> ·
    <a href="/admin.html" style="color:var(--gold)">Admin</a>
  </p>
</footer>

<script>
var DID="${esc(String(destino.id))}";
function submitRv(){
  var nom=document.getElementById("rv-nom").value.trim();
  var txt=document.getElementById("rv-txt").value.trim();
  var st=document.querySelector("input[name=st]:checked");
  if(!st){alert("Selecciona una puntuación");return;}
  if(!nom){alert("Ingresa tu nombre");return;}
  var btn=document.querySelector(".btn-rv");
  btn.disabled=true;btn.textContent="Publicando...";
  fetch("/api/interacciones",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({tipo:"resena",destino_id:DID,usuario_nombre:nom,puntuacion:parseInt(st.value),texto:txt||null})
  }).then(function(r){return r.json();}).then(function(d){
    if(d.ok||d.id){
      document.getElementById("rv-ok").style.display="block";
      document.getElementById("frv").style.opacity=".4";
      document.getElementById("frv").style.pointerEvents="none";
    } else {
      btn.disabled=false;btn.textContent="Publicar reseña →";
      alert("Error: "+(d.error||"No se pudo publicar"));
    }
  }).catch(function(){
    btn.disabled=false;btn.textContent="Publicar reseña →";
    alert("Error de conexión");
  });
}
</script>
<script src="/pagina-connector.js" onerror="void 0"></script>
<script src="/usuario-session.js" onerror="void 0"></script>
</body>
</html>`;
}

module.exports = async function handler(req, res) {
  var slug = (req.query.slug || '').trim();
  if (!slug) return res.status(400).send('<h1>400 — Slug requerido</h1>');

  var db;
  try {
    db = await getClient();

    var rows = await query(db,
      `SELECT d.*, c.slug AS cat_slug, c.nombre AS cat_nombre
       FROM destinos d
       LEFT JOIN categorias c ON d.categoria_id = c.id
       WHERE d.slug = $1 LIMIT 1`,
      [slug]
    );

    if (!rows.length) {
      return res.status(404).send(
        `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
        <title>No encontrado – ExploraCO</title>
        <meta name="viewport" content="width=device-width,initial-scale=1">
        <style>body{font-family:sans-serif;text-align:center;padding:4rem 1rem;background:#f9f7f4}a{color:#E8A020}</style>
        </head><body>
        <h1 style="font-size:2rem;margin-bottom:1rem">404</h1>
        <p>El destino <strong>${esc(slug)}</strong> no existe o fue eliminado.</p>
        <p style="margin-top:1rem"><a href="/index.html">← Volver al inicio</a></p>
        </body></html>`
      );
    }

    var destino = rows[0];

    var detRows = await query(db,
      'SELECT datos FROM destinos_detalles WHERE destino_id=$1 LIMIT 1', [destino.id]
    );
    var detalles = detRows.length ? detRows[0].datos : {};

    var fotosRows = await query(db,
      'SELECT url,caption FROM destinos_fotos WHERE destino_id=$1 ORDER BY orden ASC LIMIT 12', [destino.id]
    );

    var resenasRows = await query(db,
      `SELECT i.puntuacion, i.texto,
              COALESCE(u.nombre, i.usuario_nombre, 'Viajero') AS usuario_nombre
       FROM interacciones i
       LEFT JOIN usuarios u ON i.usuario_id = u.id
       WHERE i.destino_id=$1 AND i.tipo='resena'
       ORDER BY i.created_at DESC LIMIT 10`,
      [destino.id]
    );

    var html = buildHTML(destino, detalles, fotosRows, resenasRows, destino.cat_slug);

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    return res.status(200).send(html);

  } catch (err) {
    console.error('[pagina-destino] FATAL:', err.message);
    return res.status(500).send(
      `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Error – ExploraCO</title></head>
      <body style="font-family:sans-serif;padding:2rem">
      <h1>Error interno</h1><pre style="background:#f5f5f5;padding:1rem;border-radius:8px">${esc(err.message)}</pre>
      <p><a href="/index.html">← Inicio</a></p></body></html>`
    );
  } finally {
    releaseDB(db);
  }
};
