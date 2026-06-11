// /api/pagina-destino.js
// Sirve páginas individuales de destinos dinámicamente desde Neon DB
// CommonJS — igual patrón que el resto del proyecto
// vercel.json rewrite: "/:slug.html" → "/api/pagina-destino?slug=:slug"

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 1,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 10000,
});

var CAT_ICONS  = { hostal:'🏨', comida:'🍽️', sitio:'🏔️', evento:'🎉' };
var CAT_LABELS = { hostal:'Hospedaje', comida:'Comida & Restaurantes', sitio:'Lugares & Sitios', evento:'Eventos' };
var CAT_DIR    = { hostal:'directorio-hostal.html', comida:'directorio-comida.html', sitio:'directorio-sitio.html', evento:'directorio-evento.html' };

function fmtCOP(n) {
  if (!n) return null;
  return '$' + Number(n).toLocaleString('es-CO');
}
function esc(s) {
  if (!s) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function renderHTML(destino, detalles, fotos, resenas, catSlug) {
  var d       = detalles || {};
  var icon    = CAT_ICONS[catSlug]  || '📍';
  var catLbl  = CAT_LABELS[catSlug] || 'Destino';
  var catDir  = CAT_DIR[catSlug]    || 'index.html';
  var precio  = fmtCOP(destino.precio_desde);
  var mainFoto= destino.foto_principal || 'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=900&q=80';
  var rating  = destino.rating ? Number(destino.rating).toFixed(1) : '—';
  var nRes    = destino.total_resenas || 0;

  // Galería
  var galeriaHTML = (fotos || []).map(function(f) {
    return '<div class="gi"><img src="'+esc(f.url)+'" alt="'+esc(f.caption || destino.nombre)+'" loading="lazy"></div>';
  }).join('');

  // Habitaciones
  var habs = d.habitaciones || [];
  var habHTML = habs.length ? '<section id="habitaciones" class="sec"><h2>'+icon+' Habitaciones</h2>'
    +'<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Tipo</th><th>Camas</th><th>Precio</th><th></th></tr></thead><tbody>'
    + habs.map(function(h){
        return '<tr><td><strong>'+esc(h.nombre)+'</strong>'+(h.badge?'<span class="badge">'+esc(h.badge)+'</span>':'')+'</td>'
          +'<td>'+esc(h.camas)+'</td><td>'+(fmtCOP(h.precio)||'—')+'</td>'
          +'<td>'+(d.whatsapp?'<a href="https://wa.me/'+esc(d.whatsapp)+'" class="btn-wa" target="_blank">Reservar</a>':'')+'</td></tr>';
      }).join('')
    +'</tbody></table></div></section>' : '';

  // Amenidades
  var amenidades = d.amenidades || [];
  var amenHTML = amenidades.length ? '<section id="servicios" class="sec"><h2>✅ Servicios</h2>'
    +'<div class="chips">'+amenidades.map(function(a){ return '<span class="chip">✓ '+esc(a)+'</span>'; }).join('')+'</div></section>' : '';

  // FAQs
  var faqs = d.faqs || [];
  var faqHTML = faqs.length ? '<section id="faq" class="sec"><h2>❓ FAQ</h2>'
    + faqs.map(function(f){
        return '<details class="faq"><summary>'+esc(f.pregunta)+'</summary><p>'+esc(f.respuesta)+'</p></details>';
      }).join('')
    +'</section>' : '';

  // Reservar
  var rLinks = [];
  if(d.whatsapp)       rLinks.push('<a href="https://wa.me/'+esc(d.whatsapp)+'" class="rbtn wa" target="_blank">💬 WhatsApp</a>');
  if(d.booking_url)    rLinks.push('<a href="'+esc(d.booking_url)+'" class="rbtn bk" target="_blank">🏨 Booking.com</a>');
  if(d.hostelworld_url)rLinks.push('<a href="'+esc(d.hostelworld_url)+'" class="rbtn hw" target="_blank">🌍 Hostelworld</a>');
  if(d.airbnb_url)     rLinks.push('<a href="'+esc(d.airbnb_url)+'" class="rbtn ab" target="_blank">🏡 Airbnb</a>');
  var reservarHTML = rLinks.length ? '<section id="reservar" class="sec"><h2>📅 Reservar</h2>'
    +'<div class="rbtns">'+rLinks.join('')+'</div></section>' : '';

  // Mapa
  var mapaHTML = (destino.lat && destino.lng) ? '<section id="mapa" class="sec"><h2>🗺️ Ubicación</h2>'
    +'<iframe width="100%" height="280" style="border:0;border-radius:10px" loading="lazy" '
    +'src="https://www.google.com/maps?q='+destino.lat+','+destino.lng+'&z=15&output=embed"></iframe></section>' : '';

  // Reseñas
  var resenasHTML = resenas.length ? '<section id="resenas" class="sec"><h2>💬 Reseñas <span class="rbadge">⭐ '+rating+'</span></h2>'
    + resenas.map(function(r){
        return '<div class="rv"><div class="rv-h"><span class="av">'+esc((r.usuario_nombre||'V').slice(0,2).toUpperCase())+'</span>'
          +'<div><strong>'+esc(r.usuario_nombre||'Viajero')+'</strong>'
          +'<span class="stars">'+'★'.repeat(r.puntuacion||5)+'☆'.repeat(5-(r.puntuacion||5))+'</span></div></div>'
          +(r.texto?'<p>'+esc(r.texto)+'</p>':'')+'</div>';
      }).join('')
    +'</section>' : '<section id="resenas" class="sec"><h2>💬 Reseñas</h2><p style="color:#888;font-size:.9rem">Sé el primero en dejar una reseña.</p></section>';

  // Contacto aside
  var ctLinks = [];
  if(d.whatsapp)  ctLinks.push('<a href="https://wa.me/'+esc(d.whatsapp)+'" target="_blank">💬 WhatsApp</a>');
  if(d.instagram) ctLinks.push('<a href="https://instagram.com/'+esc(d.instagram.replace('@',''))+'" target="_blank">📷 @'+esc(d.instagram.replace('@',''))+'</a>');
  if(d.sitio_web) ctLinks.push('<a href="'+esc(d.sitio_web)+'" target="_blank">🌐 Web</a>');
  if(d.email)     ctLinks.push('<a href="mailto:'+esc(d.email)+'" target="_blank">✉️ '+esc(d.email)+'</a>');

  var pendingBanner = destino.status === 'pending'
    ? '<div style="background:#fff3cd;border:1px solid #ffc107;color:#856404;padding:.875rem 1.25rem;border-radius:10px;font-size:.9rem;text-align:center;margin-bottom:1rem">⏳ Este lugar está pendiente de revisión y será publicado pronto.</div>'
    : '';

  return '<!DOCTYPE html>\n<html lang="es">\n<head>\n'
    +'<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width,initial-scale=1.0">\n'
    +'<title>'+esc(destino.nombre)+' – ExploraCO</title>\n'
    +'<meta name="description" content="'+esc(destino.descripcion_corta)+'">\n'
    +'<meta property="og:title" content="'+esc(destino.nombre)+' – ExploraCO">\n'
    +'<meta property="og:image" content="'+esc(mainFoto)+'">\n'
    +'<meta name="theme-color" content="#E8A020">\n'
    +'<link rel="canonical" href="https://exploraco.vercel.app/'+esc(destino.slug)+'.html">\n'
    +'<style>\n'
    +':root{--gold:#E8A020;--gold-d:#c47c0a;--bg:#f9f7f4;--card:#fff;--text:#1a1a1a;--muted:#666;--r:12px}\n'
    +'*{box-sizing:border-box;margin:0;padding:0}body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:var(--bg);color:var(--text)}\n'
    +'a{color:var(--gold-d);text-decoration:none}a:hover{text-decoration:underline}\n'
    +'.nav{background:#fff;border-bottom:1px solid #eee;padding:0 1rem;display:flex;align-items:center;justify-content:space-between;height:52px;position:sticky;top:0;z-index:100;box-shadow:0 1px 6px rgba(0,0,0,.06)}\n'
    +'.nav-logo{font-size:1.2rem;font-weight:900;letter-spacing:-0.5px}.nav-logo em{color:var(--gold);font-style:normal}\n'
    +'.breadcrumb{padding:.6rem 1rem;font-size:.8rem;color:var(--muted);max-width:900px;margin:0 auto}\n'
    +'.breadcrumb a{color:var(--muted)}\n'
    +'.hero{height:320px;background:#111;overflow:hidden;position:relative}\n'
    +'@media(min-width:600px){.hero{height:440px}}\n'
    +'.hero img{width:100%;height:100%;object-fit:cover;opacity:.82}\n'
    +'.hero-ov{position:absolute;inset:0;background:linear-gradient(to top,rgba(0,0,0,.72) 0%,rgba(0,0,0,.08) 60%)}\n'
    +'.hero-c{position:absolute;bottom:0;left:0;right:0;padding:1.25rem;max-width:900px;margin:0 auto}\n'
    +'.hero-cat{display:inline-block;background:var(--gold);color:#fff;font-size:.7rem;font-weight:800;padding:2px 9px;border-radius:20px;margin-bottom:.375rem;letter-spacing:.5px}\n'
    +'.hero-title{font-size:1.875rem;font-weight:900;color:#fff;line-height:1.1;margin-bottom:.375rem}\n'
    +'@media(min-width:600px){.hero-title{font-size:2.5rem}}\n'
    +'.hero-sub{color:rgba(255,255,255,.8);font-size:.9rem;margin-bottom:.625rem}\n'
    +'.hero-meta{display:flex;flex-wrap:wrap;gap:.625rem;color:rgba(255,255,255,.85);font-size:.8125rem}\n'
    +'.anav{background:#fff;border-bottom:1px solid #eee;overflow-x:auto;white-space:nowrap}\n'
    +'.anav a{display:inline-block;padding:.75rem .875rem;font-size:.8125rem;color:var(--muted);border-bottom:3px solid transparent;transition:all .15s}\n'
    +'.anav a:hover{color:var(--text);text-decoration:none;border-color:var(--gold)}\n'
    +'.body{max-width:900px;margin:0 auto;padding:1.25rem 1rem 3rem;display:flex;gap:1.5rem;flex-direction:column}\n'
    +'@media(min-width:768px){.body{flex-direction:row}}\n'
    +'.main{flex:1;min-width:0;display:flex;flex-direction:column;gap:1.5rem}\n'
    +'.aside{width:100%}@media(min-width:768px){.aside{width:268px;flex-shrink:0}}\n'
    +'.sec{background:var(--card);border-radius:var(--r);padding:1.375rem;box-shadow:0 2px 12px rgba(0,0,0,.07)}\n'
    +'.sec h2{font-size:1rem;font-weight:700;margin-bottom:.875rem}\n'
    +'.desc-txt{font-size:.9375rem;line-height:1.7;color:#333}\n'
    +'.frase{background:#fff8ec;border-left:4px solid var(--gold);padding:.875rem 1rem;border-radius:0 var(--r) var(--r) 0;margin-bottom:.875rem}\n'
    +'.frase p{font-size:.9rem;color:#7a5000;font-style:italic}\n'
    +'.gal{display:grid;grid-template-columns:repeat(2,1fr);gap:.375rem}\n'
    +'@media(min-width:480px){.gal{grid-template-columns:repeat(3,1fr)}}\n'
    +'.gi img{width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:7px;cursor:pointer}\n'
    +'.tbl-wrap{overflow-x:auto}.tbl{width:100%;border-collapse:collapse;font-size:.8125rem}\n'
    +'.tbl th{background:#f5f5f5;padding:.5rem .625rem;text-align:left;font-weight:700;border-bottom:2px solid #eee}\n'
    +'.tbl td{padding:.5rem .625rem;border-bottom:1px solid #f0f0f0;vertical-align:middle}\n'
    +'.badge{background:#fff3cd;color:#7a5000;font-size:.65rem;padding:1px 6px;border-radius:8px;margin-left:5px;font-weight:700}\n'
    +'.chips{display:flex;flex-wrap:wrap;gap:.4rem}\n'
    +'.chip{background:#f0faf0;color:#2d6a2d;border:1px solid #c8e6c9;padding:.3rem .65rem;border-radius:20px;font-size:.78rem;font-weight:500}\n'
    +'.faq{border:1px solid #eee;border-radius:8px;margin-bottom:.4rem;overflow:hidden}\n'
    +'.faq summary{padding:.75rem .875rem;cursor:pointer;font-weight:500;font-size:.875rem;list-style:none;display:flex;justify-content:space-between}\n'
    +'.faq summary::-webkit-details-marker{display:none}.faq summary::after{content:"+"}\n'
    +'.faq[open] summary::after{content:"−"}.faq p{padding:.625rem .875rem .875rem;font-size:.8125rem;color:#444;line-height:1.6}\n'
    +'.rbtns{display:flex;flex-direction:column;gap:.5rem}\n'
    +'.rbtn{display:block;text-align:center;padding:.75rem;border-radius:9px;font-weight:600;font-size:.9rem;color:#fff!important;transition:opacity .15s}\n'
    +'.rbtn:hover{opacity:.88;text-decoration:none}.wa{background:#25D366}.bk{background:#003580}.hw{background:#f0593a}.ab{background:#FF5A5F}\n'
    +'.btn-wa{display:inline-block;background:#25D366;color:#fff!important;padding:.3rem .75rem;border-radius:7px;font-size:.78rem;font-weight:600}\n'
    +'.rbadge{background:var(--gold);color:#fff;font-size:.72rem;padding:2px 7px;border-radius:20px;font-weight:700;margin-left:5px}\n'
    +'.rv{border:1px solid #f0f0f0;border-radius:9px;padding:.875rem;margin-bottom:.625rem;background:#fafafa}\n'
    +'.rv-h{display:flex;align-items:center;gap:.625rem;margin-bottom:.4rem}\n'
    +'.av{width:35px;height:35px;border-radius:50%;background:var(--gold);color:#fff;font-weight:700;display:flex;align-items:center;justify-content:center;font-size:.8rem;flex-shrink:0}\n'
    +'.stars{color:#f5a623;font-size:.8rem;margin-top:1px;display:block}.rv p{font-size:.8125rem;color:#444;line-height:1.5}\n'
    +'.aside-card{background:var(--card);border-radius:var(--r);padding:1.125rem;box-shadow:0 2px 12px rgba(0,0,0,.07);margin-bottom:.875rem}\n'
    +'.aside-card h3{font-size:.9375rem;font-weight:700;margin-bottom:.75rem}\n'
    +'.info-row{display:flex;gap:.5rem;margin-bottom:.5rem;font-size:.8125rem;color:#444}\n'
    +'.info-row .ic{width:20px;text-align:center;flex-shrink:0}\n'
    +'.ct-links{display:flex;flex-direction:column;gap:.375rem}\n'
    +'.ct-links a{display:block;padding:.625rem .875rem;background:#f5f5f5;border-radius:7px;font-size:.875rem;color:var(--text)!important;transition:background .15s}\n'
    +'.ct-links a:hover{background:#ebebeb;text-decoration:none}\n'
    +'.form-rv{display:flex;flex-direction:column;gap:.625rem}\n'
    +'.form-rv label{font-size:.78rem;font-weight:700;color:var(--muted)}\n'
    +'.form-rv input,.form-rv textarea{width:100%;padding:.5rem .7rem;border:1.5px solid #ddd;border-radius:8px;font-size:.875rem;font-family:inherit;transition:border-color .15s}\n'
    +'.form-rv input:focus,.form-rv textarea:focus{outline:none;border-color:var(--gold)}\n'
    +'.stars-inp{display:flex;gap:3px;flex-direction:row-reverse;justify-content:flex-end}\n'
    +'.stars-inp input{display:none}\n'
    +'.stars-inp label{font-size:1.375rem;color:#ddd;cursor:pointer;transition:color .12s}\n'
    +'.stars-inp input:checked~label,.stars-inp label:hover,.stars-inp label:hover~label{color:#f5a623}\n'
    +'.btn-rv{background:var(--gold);color:#fff;border:none;padding:.7rem;border-radius:9px;font-weight:700;font-size:.9rem;cursor:pointer;width:100%;transition:background .15s}\n'
    +'.btn-rv:hover{background:var(--gold-d)}.btn-rv:disabled{background:#ccc;cursor:not-allowed}\n'
    +'.rv-ok{display:none;background:#d4edda;color:#155724;padding:.875rem;border-radius:9px;text-align:center;font-weight:700}\n'
    +'.footer{background:#111;color:rgba(255,255,255,.55);padding:1.75rem 1rem;text-align:center;font-size:.8rem}\n'
    +'.footer .logo{font-size:1.2rem;font-weight:900;color:#fff;margin-bottom:.375rem}.footer .logo em{color:var(--gold);font-style:normal}\n'
    +'</style>\n</head>\n<body>\n'

    // NAV
    +'<nav class="nav">\n'
    +'<a class="nav-logo" href="/index.html">EXPLORA<em>CO</em></a>\n'
    +'<a href="/'+esc(catDir)+'" style="font-size:.8rem;color:var(--muted)">← '+esc(catLbl)+'</a>\n'
    +'</nav>\n'

    // BREADCRUMB
    +'<div class="breadcrumb"><a href="/index.html">Inicio</a> › <a href="/'+esc(catDir)+'">'+icon+' '+esc(catLbl)+'</a> › '+esc(destino.nombre)+'</div>\n'

    // PENDING BANNER
    +(destino.status==='pending'?'<div style="max-width:900px;margin:.5rem auto;padding:0 1rem"><div style="background:#fff3cd;border:1px solid #ffc107;color:#856404;padding:.75rem 1.1rem;border-radius:10px;font-size:.875rem;text-align:center">⏳ Este lugar está pendiente de revisión por el equipo de ExploraCO.</div></div>':'')

    // HERO
    +'<div class="hero">\n'
    +'<img src="'+esc(mainFoto)+'" alt="'+esc(destino.nombre)+'" loading="eager">\n'
    +'<div class="hero-ov"></div>\n'
    +'<div class="hero-c">\n'
    +'<span class="hero-cat">'+icon+' '+esc(catLbl)+'</span>\n'
    +'<h1 class="hero-title">'+esc(destino.nombre)+'</h1>\n'
    +'<p class="hero-sub">'+esc(destino.descripcion_corta)+'</p>\n'
    +'<div class="hero-meta">\n'
    +'<span>📍 '+esc(destino.ciudad||'Colombia')+(destino.departamento?', '+esc(destino.departamento):'')+'</span>\n'
    +(nRes>0?'<span>⭐ '+esc(rating)+' · '+nRes+' reseñas</span>':'')
    +(precio?'<span>💰 Desde '+esc(precio)+'</span>':'')
    +'</div>\n</div>\n</div>\n'

    // ANCHOR NAV
    +'<nav class="anav">\n'
    +'<a href="#descripcion">Sobre</a>\n'
    +(fotos.length?'<a href="#galeria">Fotos</a>':'')
    +(habs.length?'<a href="#habitaciones">Habitaciones</a>':'')
    +(rLinks.length?'<a href="#reservar">Reservar</a>':'')
    +(amenidades.length?'<a href="#servicios">Servicios</a>':'')
    +((destino.lat&&destino.lng)?'<a href="#mapa">Mapa</a>':'')
    +(faqs.length?'<a href="#faq">FAQ</a>':'')
    +'<a href="#resenas">Reseñas</a>\n</nav>\n'

    // BODY
    +'<div class="body">\n'
    +'<main class="main">\n'

    // DESCRIPCIÓN
    +'<section id="descripcion" class="sec">\n<h2>📋 Sobre este lugar</h2>\n'
    +(d.frase_destacada?'<div class="frase"><p>'+esc(d.frase_destacada)+'</p></div>':'')
    +'<p class="desc-txt">'+esc(destino.descripcion_larga||destino.descripcion_corta||'').replace(/\n/g,'<br>')+'</p>\n</section>\n'

    // GALERÍA
    +(fotos.length?'<section id="galeria" class="sec"><h2>📷 Fotos</h2><div class="gal">'+galeriaHTML+'</div></section>':'')

    // HABITACIONES
    +habHTML

    // RESERVAR
    +reservarHTML

    // SERVICIOS
    +amenHTML

    // MAPA
    +mapaHTML

    // FAQs
    +faqHTML

    // RESEÑAS
    +resenasHTML

    +'</main>\n'
    +'<aside class="aside">\n'

    // INFO RÁPIDA
    +'<div class="aside-card">\n<h3>ℹ️ Información</h3>\n'
    +(destino.ciudad?'<div class="info-row"><span class="ic">📍</span><span>'+esc(destino.ciudad)+(destino.departamento?', '+esc(destino.departamento):'')+'</span></div>':'')
    +(d.barrio?'<div class="info-row"><span class="ic">🏘️</span><span>'+esc(d.barrio)+'</span></div>':'')
    +(d.tipo_alojamiento?'<div class="info-row"><span class="ic">🏠</span><span>'+esc(d.tipo_alojamiento)+'</span></div>':'')
    +(d.checkin?'<div class="info-row"><span class="ic">⏰</span><span>Check-in '+esc(d.checkin)+' · Out '+esc(d.checkout||'?')+'</span></div>':'')
    +(precio?'<div class="info-row"><span class="ic">💰</span><span>Desde <strong>'+esc(precio)+'</strong></span></div>':'')
    +(nRes>0?'<div class="info-row"><span class="ic">⭐</span><span>'+esc(rating)+' · '+nRes+' reseñas</span></div>':'')
    +'</div>\n'

    // CONTACTO ASIDE
    +(ctLinks.length?'<div class="aside-card"><h3>📞 Contacto</h3><div class="ct-links">'+ctLinks.join('')+'</div></div>':'')

    // FORM RESEÑA
    +'<div class="aside-card">\n<h3>✍️ Escribe una reseña</h3>\n'
    +'<div class="form-rv" id="form-rv">\n'
    +'<div><label>Tu nombre</label><input type="text" id="rv-nom" placeholder="Ej: María García"></div>\n'
    +'<div><label>Puntuación</label>\n'
    +'<div class="stars-inp"><input type="radio" name="st" id="s5" value="5"><label for="s5">★</label>'
    +'<input type="radio" name="st" id="s4" value="4"><label for="s4">★</label>'
    +'<input type="radio" name="st" id="s3" value="3"><label for="s3">★</label>'
    +'<input type="radio" name="st" id="s2" value="2"><label for="s2">★</label>'
    +'<input type="radio" name="st" id="s1" value="1"><label for="s1">★</label></div></div>\n'
    +'<div><label>Tu experiencia</label><textarea id="rv-txt" rows="4" placeholder="¿Qué te pareció este lugar?"></textarea></div>\n'
    +'<button class="btn-rv" onclick="submitRv()">Publicar reseña →</button>\n'
    +'<div class="rv-ok" id="rv-ok">🎉 ¡Gracias por tu reseña!</div>\n'
    +'</div>\n</div>\n'

    +'</aside>\n</div>\n'

    // FOOTER
    +'<footer class="footer">\n'
    +'<div class="logo">EXPLORA<em>CO</em></div>\n'
    +'<p>El directorio turístico más completo de Colombia</p>\n'
    +'<p style="margin-top:.4rem"><a href="/index.html" style="color:var(--gold)">Inicio</a> · <a href="/'+esc(catDir)+'" style="color:var(--gold)">'+esc(catLbl)+'</a> · <a href="/admin.html" style="color:var(--gold)">Admin</a></p>\n'
    +'</footer>\n'

    +'<script>\n'
    +'var DID="'+esc(String(destino.id))+'",DSLUG="'+esc(destino.slug)+'";\n'
    +'function submitRv(){\n'
    +'  var nom=document.getElementById("rv-nom").value.trim();\n'
    +'  var txt=document.getElementById("rv-txt").value.trim();\n'
    +'  var st=document.querySelector("input[name=st]:checked");\n'
    +'  if(!st){alert("Selecciona una puntuación");return;}\n'
    +'  if(!nom){alert("Ingresa tu nombre");return;}\n'
    +'  var btn=document.querySelector(".btn-rv");btn.disabled=true;btn.textContent="Publicando...";\n'
    +'  fetch("/api/interacciones",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({tipo:"resena",destino_id:DID,usuario_nombre:nom,puntuacion:parseInt(st.value),texto:txt||null})})\n'
    +'  .then(function(r){return r.json();})\n'
    +'  .then(function(d){\n'
    +'    if(d.ok||d.id){document.getElementById("rv-ok").style.display="block";document.getElementById("form-rv").style.opacity=".4";document.getElementById("form-rv").style.pointerEvents="none";}\n'
    +'    else{btn.disabled=false;btn.textContent="Publicar reseña →";alert("Error al publicar");}\n'
    +'  }).catch(function(){btn.disabled=false;btn.textContent="Publicar reseña →";alert("Error de conexión");});\n'
    +'}\n'
    +'</script>\n'
    +'<script src="/pagina-connector.js" onerror="void 0"></script>\n'
    +'<script src="/usuario-session.js" onerror="void 0"></script>\n'
    +'</body>\n</html>';
}

module.exports = async function handler(req, res) {
  var slug = req.query.slug || '';
  if (!slug) return res.status(400).send('<h1>Slug requerido</h1>');

  var client;
  try {
    client = await pool.connect();

    var dRes = await client.query(
      `SELECT d.*, c.slug AS cat_slug, c.nombre AS cat_nombre
       FROM destinos d
       LEFT JOIN categorias c ON d.categoria_id = c.id
       WHERE d.slug = $1 LIMIT 1`,
      [slug]
    );

    if (dRes.rows.length === 0) {
      return res.status(404).send(
        '<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>No encontrado – ExploraCO</title>'
        +'<meta name="viewport" content="width=device-width,initial-scale=1">'
        +'<style>body{font-family:sans-serif;text-align:center;padding:4rem 1rem;background:#f9f7f4}a{color:#E8A020}</style></head>'
        +'<body><h1>404 · Lugar no encontrado</h1><p>El destino "<strong>'+esc(slug)+'</strong>" no existe.</p>'
        +'<p><a href="/index.html">← Volver al inicio</a></p></body></html>'
      );
    }

    var destino = dRes.rows[0];

    var detRes = await client.query('SELECT datos FROM destinos_detalles WHERE destino_id = $1 LIMIT 1', [destino.id]);
    var detalles = (detRes.rows.length > 0 && detRes.rows[0].datos) ? detRes.rows[0].datos : {};

    var fotosRes = await client.query(
      'SELECT url, caption FROM destinos_fotos WHERE destino_id = $1 ORDER BY orden ASC LIMIT 12',
      [destino.id]
    );

    var resenasRes = await client.query(
      `SELECT i.puntuacion, i.texto, COALESCE(u.nombre, i.usuario_nombre, 'Viajero') AS usuario_nombre
       FROM interacciones i
       LEFT JOIN usuarios u ON i.usuario_id = u.id
       WHERE i.destino_id = $1 AND i.tipo = 'resena'
       ORDER BY i.created_at DESC LIMIT 10`,
      [destino.id]
    );

    var html = renderHTML(destino, detalles, fotosRes.rows, resenasRes.rows, destino.cat_slug);

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    return res.status(200).send(html);

  } catch (err) {
    console.error('[pagina-destino] Error:', err.message);
    return res.status(500).send(
      '<h1>Error interno</h1><p>'+esc(err.message)+'</p>'
    );
  } finally {
    if (client) client.release();
  }
};
