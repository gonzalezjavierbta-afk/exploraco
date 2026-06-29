// api/pagina-destino.js — v7 limpio
// Sirve /{slug}.html desde Neon DB
// vercel.json: { "source":"/:slug.html", "destination":"/api/pagina-destino?slug=:slug" }

const { neon } = require('@neondatabase/serverless');

var BASE    = 'https://exploraco.co';
var CAT_ICON  = { hostal:'\u{1F3E8}', comida:'\u{1F37D}\uFE0F', sitio:'\u{1F3D4}\uFE0F', evento:'\u{1F389}' };
var CAT_LABEL = { hostal:'Hospedaje', comida:'Comida & Restaurantes', sitio:'Lugares & Sitios', evento:'Eventos' };
var CAT_DIR   = { hostal:'directorio-hostal.html', comida:'directorio-comida.html', sitio:'directorio-sitio.html', evento:'directorio-evento.html' };

function esc(s) {
  if (s === null || s === undefined) return '';
  return String(s)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');
}

function safeJSON(v) {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  try { return JSON.parse(v); } catch(_) { return []; }
}

function stars(n) {
  var r = Math.min(5, Math.max(0, Math.round(parseFloat(n)||0)));
  return '\u2605'.repeat(r) + '\u2606'.repeat(5-r);
}

function schemaLD(d, cat, fotos, resenas) {
  var tipos = { hostal:'LodgingBusiness', comida:'FoodEstablishment', sitio:'TouristAttraction', evento:'Event' };
  var schema = {
    '@context': 'https://schema.org',
    '@type':    tipos[cat] || 'TouristAttraction',
    'name':     d.nombre || '',
    'description': d.lead || '',
    'url':      BASE + '/' + (d.slug||'') + '.html',
  };
  if (d.foto_hero)      schema['image'] = d.foto_hero;
  if (d.ciudad)         schema['address'] = { '@type':'PostalAddress', 'addressLocality':d.ciudad, 'addressCountry':'CO' };
  if (d.lat && d.lng)   schema['geo']    = { '@type':'GeoCoordinates', 'latitude':parseFloat(d.lat), 'longitude':parseFloat(d.lng) };
  if (d.rating && d.total_resenas > 0) {
    schema['aggregateRating'] = { '@type':'AggregateRating', 'ratingValue':parseFloat(d.rating).toFixed(1), 'ratingCount':d.total_resenas, 'bestRating':'5', 'worstRating':'1' };
  }
  if (d.precio_desde) schema['priceRange'] = d.precio_desde;
  if (d.telefono)     schema['telephone']  = d.telefono;
  return '<script type="application/ld+json">\n' + JSON.stringify(schema, null, 2) + '\n<\/script>';
}

function renderHTML(d, det, fotos, resenas) {
  var cat   = d.categoria_slug || 'sitio';
  var icon  = CAT_ICON[cat]  || '\u{1F4CD}';
  var label = CAT_LABEL[cat] || 'Destino';
  var dir   = CAT_DIR[cat]   || 'index.html';
  var hero  = d.foto_hero    || 'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=1200&q=80';
  var rat   = d.rating       ? parseFloat(d.rating).toFixed(1) : null;
  var nRes  = parseInt(d.total_resenas || 0);

  // Detalles de destinos_detalles + fallback a tags JSONB
  var tags  = safeJSON(d.tags && typeof d.tags === 'object' ? JSON.stringify(d.tags) : d.tags);
  if (!Array.isArray(tags)) tags = [];
  var det2  = det || {};
  var amenidades   = safeJSON(det2.amenidades)   .length ? safeJSON(det2.amenidades)   : (Array.isArray((d.tags||{}).amenidades)   ? d.tags.amenidades   : []);
  var habitaciones = safeJSON(det2.habitaciones) .length ? safeJSON(det2.habitaciones) : (Array.isArray((d.tags||{}).habitaciones) ? d.tags.habitaciones : []);
  var faqs         = safeJSON(det2.faqs)         .length ? safeJSON(det2.faqs)         : (Array.isArray((d.tags||{}).faqs)         ? d.tags.faqs         : []);
  var checkin      = det2.checkin  || (d.tags && d.tags.checkin)  || '';
  var checkout     = det2.checkout || (d.tags && d.tags.checkout) || '';
  var bookingUrl   = det2.booking_url     || d.booking     || '';
  var hwUrl        = det2.hostelworld_url || d.hostelworld || '';
  var airbnbUrl    = det2.airbnb_url      || d.airbnb      || '';

  // Galería
  var galHTML = (fotos||[]).map(function(f){
    return '<div class="gi"><img src="'+esc(f.url)+'" alt="'+esc(f.caption||d.nombre)+'" loading="lazy"></div>';
  }).join('');

  // Botones de reserva
  var rbtns = [];
  if (d.whatsapp)  rbtns.push('<a href="https://wa.me/'+esc(d.whatsapp)+'" class="rbtn rwa" target="_blank">\u{1F4AC} Reservar por WhatsApp</a>');
  if (bookingUrl)  rbtns.push('<a href="'+esc(bookingUrl)+'" class="rbtn rbk" target="_blank">\u{1F3E8} Booking.com</a>');
  if (hwUrl)       rbtns.push('<a href="'+esc(hwUrl)+'" class="rbtn rhw" target="_blank">\u{1F30D} Hostelworld</a>');
  if (airbnbUrl)   rbtns.push('<a href="'+esc(airbnbUrl)+'" class="rbtn rab" target="_blank">\u{1F3E1} Airbnb</a>');

  // Mapa con coordenadas reales
  var mapaHTML = '';
  if (d.lat && d.lng && parseFloat(d.lat) !== 0 && parseFloat(d.lng) !== 0) {
    mapaHTML = '<section id="mapa" class="sec">'
      + '<h2>\u{1F5FA}\uFE0F Ubicaci\u00f3n</h2>'
      + '<iframe width="100%" height="280" style="border:0;border-radius:10px" loading="lazy" '
      + 'src="https://www.google.com/maps?q='+esc(d.lat)+','+esc(d.lng)+'&z=15&output=embed"></iframe>'
      + '</section>';
  }

  // Rese\u00f1as
  var rvHTML = (resenas||[]).length
    ? '<section id="resenas" class="sec"><h2>\u{1F4AC} Rese\u00f1as'+(rat?' <span class="rbadge">\u2B50 '+esc(rat)+'</span>':'')+'</h2>'
      + resenas.map(function(r){
          var nombre = r.usuario_nombre || 'Viajero';
          var texto  = r.texto || '';
          // Extraer nombre del prefijo [nombre] si no hay usuario
          var match  = texto.match(/^\[([^\]]+)\]\s*/);
          if (match) { if (!r.usuario_nombre) nombre = match[1]; texto = texto.slice(match[0].length); }
          return '<div class="rv"><div class="rvh">'
            + '<span class="av">'+esc(nombre.slice(0,2).toUpperCase())+'</span>'
            + '<div><b>'+esc(nombre)+'</b><span class="str">'+stars(r.rating)+'</span></div>'
            + '</div>'+(texto?'<p>'+esc(texto)+'</p>':'')+'</div>';
        }).join('')
      + '</section>'
    : '<section id="resenas" class="sec"><h2>\u{1F4AC} Rese\u00f1as</h2><p style="color:#888;font-size:.875rem">S\u00e9 el primero en dejar una rese\u00f1a.</p></section>';

  var css = ':root{--g:#E8A020;--gd:#c47c0a;--bg:#f9f7f4;--card:#fff;--text:#1a1a1a;--mu:#666;--r:12px}'
    + '*{box-sizing:border-box;margin:0;padding:0}'
    + 'body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:var(--bg);color:var(--text);line-height:1.5}'
    + 'a{color:var(--gd);text-decoration:none}a:hover{text-decoration:underline}img{display:block;max-width:100%}'
    + '.nav{background:#fff;border-bottom:1px solid #eee;padding:0 1.25rem;display:flex;align-items:center;justify-content:space-between;height:54px;position:sticky;top:0;z-index:100;box-shadow:0 1px 6px rgba(0,0,0,.06)}'
    + '.logo{font-size:1.2rem;font-weight:900;color:var(--text)}.logo em{color:var(--g);font-style:normal}'
    + '.bc{padding:.5rem 1.25rem;font-size:.78rem;color:var(--mu);max-width:960px;margin:0 auto}.bc a{color:var(--mu)}'
    + '.hero{position:relative;height:320px;background:#111;overflow:hidden}'
    + '@media(min-width:600px){.hero{height:440px}}'
    + '.hero img{width:100%;height:100%;object-fit:cover;opacity:.82}'
    + '.hero-ov{position:absolute;inset:0;background:linear-gradient(to top,rgba(0,0,0,.72),rgba(0,0,0,.08) 65%)}'
    + '.hero-c{position:absolute;bottom:0;left:0;right:0;padding:1.5rem 1.25rem;max-width:960px;margin:0 auto}'
    + '.hcat{display:inline-block;background:var(--g);color:#fff;font-size:.7rem;font-weight:800;padding:2px 10px;border-radius:20px;margin-bottom:.4rem}'
    + '.htitle{font-size:1.875rem;font-weight:900;color:#fff;line-height:1.1;margin-bottom:.4rem}'
    + '@media(min-width:600px){.htitle{font-size:2.5rem}}'
    + '.hsub{color:rgba(255,255,255,.82);font-size:.9rem;margin-bottom:.55rem}'
    + '.hmeta{display:flex;flex-wrap:wrap;gap:.55rem;color:rgba(255,255,255,.85);font-size:.8rem}'
    + '.anav{background:#fff;border-bottom:1px solid #eee;overflow-x:auto;white-space:nowrap}'
    + '.anav a{display:inline-block;padding:.75rem .875rem;font-size:.8125rem;color:var(--mu);border-bottom:3px solid transparent}'
    + '.anav a:hover{color:var(--text);text-decoration:none;border-color:var(--g)}'
    + '.body{max-width:960px;margin:0 auto;padding:1.5rem 1.25rem 4rem;display:flex;gap:1.75rem;flex-direction:column}'
    + '@media(min-width:768px){.body{flex-direction:row}}'
    + '.main{flex:1;min-width:0;display:flex;flex-direction:column;gap:1.5rem}'
    + '.aside{width:100%}@media(min-width:768px){.aside{width:276px;flex-shrink:0}}'
    + '.sec{background:var(--card);border-radius:var(--r);padding:1.5rem;box-shadow:0 2px 12px rgba(0,0,0,.07)}'
    + '.sec h2{font-size:1.0625rem;font-weight:700;margin-bottom:1rem}'
    + '.dtxt{font-size:.9375rem;line-height:1.75;color:#333}'
    + '.hl{background:#fff8ec;border-left:4px solid var(--g);padding:.875rem 1rem;border-radius:0 var(--r) var(--r) 0;margin-bottom:.875rem}'
    + '.gal{display:grid;grid-template-columns:repeat(2,1fr);gap:.4rem}'
    + '@media(min-width:480px){.gal{grid-template-columns:repeat(3,1fr)}}'
    + '.gi img{width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:8px;cursor:pointer}'
    + '.chips{display:flex;flex-wrap:wrap;gap:.4rem}'
    + '.chip{background:#f0faf0;color:#1e5c1e;border:1px solid #c3e6c3;padding:.3rem .7rem;border-radius:20px;font-size:.78rem}'
    + '.faq{border:1px solid #eee;border-radius:8px;margin-bottom:.4rem}'
    + '.faq summary{padding:.75rem .875rem;cursor:pointer;font-weight:600;font-size:.875rem;list-style:none;display:flex;justify-content:space-between}'
    + '.faq summary::-webkit-details-marker{display:none}.faq summary::after{content:"+";color:var(--g)}'
    + '.faq[open] summary::after{content:"\u2212"}.faq p{padding:.5rem .875rem .875rem;font-size:.8125rem;color:#444;line-height:1.6}'
    + '.rbtns{display:flex;flex-direction:column;gap:.5rem}'
    + '.rbtn{display:block;text-align:center;padding:.875rem;border-radius:10px;font-weight:700;font-size:.9rem;color:#fff!important}'
    + '.rwa{background:#25D366}.rbk{background:#003580}.rhw{background:#f0593a}.rab{background:#FF5A5F}'
    + '.rbadge{background:var(--g);color:#fff;font-size:.72rem;padding:2px 8px;border-radius:20px;font-weight:700;margin-left:6px}'
    + '.rv{border:1px solid #f0f0f0;border-radius:10px;padding:.875rem;margin-bottom:.625rem;background:#fafafa}'
    + '.rvh{display:flex;align-items:center;gap:.625rem;margin-bottom:.4rem}'
    + '.av{width:36px;height:36px;border-radius:50%;background:var(--g);color:#fff;font-weight:700;display:flex;align-items:center;justify-content:center;font-size:.8rem;flex-shrink:0}'
    + '.str{color:#f5a623;font-size:.78rem;display:block}.rv p{font-size:.8125rem;color:#444;line-height:1.55}'
    + '.ac{background:var(--card);border-radius:var(--r);padding:1.25rem;box-shadow:0 2px 12px rgba(0,0,0,.07);margin-bottom:1rem}'
    + '.ac h3{font-size:.9375rem;font-weight:700;margin-bottom:.75rem}'
    + '.ir{display:flex;gap:.5rem;margin-bottom:.5rem;font-size:.8125rem;color:#444}'
    + '.ic{width:22px;text-align:center;flex-shrink:0}'
    + '.ctl{display:flex;flex-direction:column;gap:.375rem}'
    + '.ctl a{display:block;padding:.625rem .875rem;background:#f5f5f5;border-radius:8px;font-size:.875rem;color:var(--text)!important}'
    + '.frv{display:flex;flex-direction:column;gap:.625rem}'
    + '.frv label{font-size:.78rem;font-weight:700;color:var(--mu)}'
    + '.frv input,.frv textarea{width:100%;padding:.55rem .75rem;border:1.5px solid #ddd;border-radius:8px;font-size:.875rem;font-family:inherit}'
    + '.frv input:focus,.frv textarea:focus{outline:none;border-color:var(--g)}'
    + '.sinp{display:flex;gap:3px;flex-direction:row-reverse;justify-content:flex-end}'
    + '.sinp input{display:none}.sinp label{font-size:1.5rem;color:#ddd;cursor:pointer}'
    + '.sinp input:checked~label,.sinp label:hover,.sinp label:hover~label{color:#f5a623}'
    + '.btnrv{background:var(--g);color:#fff;border:none;padding:.75rem;border-radius:10px;font-weight:700;font-size:.9375rem;cursor:pointer;width:100%}'
    + '.btnrv:hover{background:var(--gd)}.btnrv:disabled{background:#ccc;cursor:not-allowed}'
    + '.rvok{display:none;background:#d4edda;color:#155724;padding:.875rem;border-radius:10px;text-align:center;font-weight:600;font-size:.875rem}'
    + '.foot{background:#111;color:rgba(255,255,255,.5);padding:2rem 1.25rem;text-align:center;font-size:.8rem}'
    + '.flogo{font-size:1.2rem;font-weight:900;color:#fff;margin-bottom:.375rem}.flogo em{color:var(--g);font-style:normal}'
    + '.pbanner{background:#fff3cd;border:1px solid #ffc107;color:#856404;padding:.75rem 1.25rem;border-radius:10px;font-size:.875rem;text-align:center;margin:.5rem auto;max-width:960px}';

  return '<!DOCTYPE html>\n'
    + '<html lang="es">\n<head>\n'
    + '<meta charset="UTF-8">\n'
    + '<meta name="viewport" content="width=device-width,initial-scale=1.0">\n'
    + '<title>'+esc(d.nombre)+' \u2013 ExploraCO</title>\n'
    + '<meta name="description" content="'+esc(d.lead||d.nombre)+'">\n'
    + '<meta property="og:title" content="'+esc(d.nombre)+' \u2013 ExploraCO">\n'
    + '<meta property="og:description" content="'+esc(d.lead||'')+'">\n'
    + '<meta property="og:image" content="'+esc(hero)+'">\n'
    + '<meta property="og:type" content="place">\n'
    + '<meta name="theme-color" content="#E8A020">\n'
    + '<link rel="canonical" href="'+BASE+'/'+esc(d.slug)+'.html">\n'
    + schemaLD(d, cat, fotos, resenas) + '\n'
    + '<style>'+css+'</style>\n'
    + '</head>\n<body>\n\n'

    // NAV
    + '<nav class="nav">\n'
    + '  <a class="logo" href="/index.html">EXPLORA<em>CO</em></a>\n'
    + '  <a href="/'+esc(dir)+'" style="font-size:.8rem;color:var(--mu)">\u2190 '+esc(label)+'</a>\n'
    + '</nav>\n\n'

    // BREADCRUMB
    + '<div class="bc"><a href="/index.html">Inicio</a> \u203a <a href="/'+esc(dir)+'">'+icon+' '+esc(label)+'</a> \u203a '+esc(d.nombre)+'</div>\n\n'

    // BANNER DRAFT
    + (d.status==='draft' ? '<div class="pbanner">\u23f3 Este lugar est\u00e1 pendiente de revisi\u00f3n por el equipo de ExploraCO.</div>\n\n' : '')

    // HERO
    + '<div class="hero">\n'
    + '  <img src="'+esc(hero)+'" alt="'+esc(d.nombre)+'" loading="eager">\n'
    + '  <div class="hero-ov"></div>\n'
    + '  <div class="hero-c">\n'
    + '    <span class="hcat">'+icon+' '+esc(label)+'</span>\n'
    + '    <h1 class="htitle">'+esc(d.nombre)+'</h1>\n'
    + (d.lead ? '    <p class="hsub">'+esc(d.lead)+'</p>\n' : '')
    + '    <div class="hmeta">\n'
    + '      <span>\ud83d\udccd '+esc(d.ciudad||'Colombia')+(d.region?', '+esc(d.region):'')+'</span>\n'
    + (nRes>0 ? '      <span>\u2b50 '+esc(rat)+' \u00b7 '+nRes+' rese\u00f1as</span>\n' : '')
    + (d.precio_desde ? '      <span>\ud83d\udcb0 Desde '+esc(d.precio_desde)+'</span>\n' : '')
    + '    </div>\n  </div>\n</div>\n\n'

    // ANCHOR NAV
    + '<nav class="anav">'
    + '<a href="#descripcion">Sobre</a>'
    + (fotos&&fotos.length ? '<a href="#galeria">Fotos</a>' : '')
    + (rbtns.length ? '<a href="#reservar">Reservar</a>' : '')
    + (amenidades.length ? '<a href="#servicios">Servicios</a>' : '')
    + (d.lat&&d.lng&&parseFloat(d.lat)!==0 ? '<a href="#mapa">Mapa</a>' : '')
    + (faqs.length ? '<a href="#faq">FAQ</a>' : '')
    + '<a href="#resenas">Rese\u00f1as</a>'
    + '</nav>\n\n'

    // BODY
    + '<div class="body">\n<main class="main">\n\n'

    // DESCRIPCIÓN
    + '<section id="descripcion" class="sec">\n'
    + '  <h2>\ud83d\udccb Sobre este lugar</h2>\n'
    + (d.highlight ? '  <div class="hl"><p>'+esc(d.highlight)+'</p></div>\n' : '')
    + '  <p class="dtxt">'+esc(d.descripcion||d.lead||'').replace(/\n/g,'<br>')+'</p>\n'
    + (d.como_llegar ? '  <div style="margin-top:1rem;padding-top:1rem;border-top:1px solid #f0f0f0"><h3 style="font-size:.9rem;font-weight:700;margin-bottom:.5rem">\ud83d\ude8c C\u00f3mo llegar</h3><p style="font-size:.875rem;color:#444;line-height:1.65">'+esc(d.como_llegar)+'</p></div>\n' : '')
    + '</section>\n\n'

    // GALERÍA
    + (fotos&&fotos.length ? '<section id="galeria" class="sec"><h2>\ud83d\udcf7 Galer\u00eda</h2><div class="gal">'+galHTML+'</div></section>\n\n' : '')

    // RESERVAR
    + (rbtns.length ? '<section id="reservar" class="sec"><h2>\ud83d\udcc5 Reservar</h2><div class="rbtns">'+rbtns.join('')+'</div></section>\n\n' : '')

    // AMENIDADES
    + (amenidades.length ? '<section id="servicios" class="sec"><h2>\u2705 Servicios incluidos</h2><div class="chips">'+amenidades.map(function(a){return '<span class="chip">\u2713 '+esc(typeof a==='string'?a:a.nombre||'')+'</span>';}).join('')+'</div></section>\n\n' : '')

    // MAPA
    + mapaHTML + '\n'

    // FAQ
    + (faqs.length ? '<section id="faq" class="sec"><h2>\u2753 Preguntas frecuentes</h2>'+faqs.map(function(f){return '<details class="faq"><summary>'+esc(f.pregunta||f.q||'')+'</summary><p>'+esc(f.respuesta||f.a||'')+'</p></details>';}).join('')+'</section>\n\n' : '')

    // RESEÑAS
    + rvHTML + '\n\n'

    + '</main>\n<aside class="aside">\n\n'

    // INFO
    + '<div class="ac"><h3>\u2139\ufe0f Informaci\u00f3n</h3>\n'
    + (d.ciudad ? '<div class="ir"><span class="ic">\ud83d\udccd</span><span>'+esc(d.ciudad)+(d.region?', '+esc(d.region):'')+'</span></div>\n' : '')
    + (d.barrio ? '<div class="ir"><span class="ic">\ud83c\udfe0</span><span>'+esc(d.barrio)+'</span></div>\n' : '')
    + (d.tipo   ? '<div class="ir"><span class="ic">\ud83c\udfe0</span><span>'+esc(d.tipo)+'</span></div>\n' : '')
    + (checkin  ? '<div class="ir"><span class="ic">\u23f0</span><span>Check-in '+esc(checkin)+' \u00b7 Out '+esc(checkout||'?')+'</span></div>\n' : '')
    + (d.horario? '<div class="ir"><span class="ic">\ud83d\udd50</span><span>'+esc(d.horario)+'</span></div>\n' : '')
    + (d.precio_desde ? '<div class="ir"><span class="ic">\ud83d\udcb0</span><span>Desde <b>'+esc(d.precio_desde)+'</b></span></div>\n' : '')
    + (nRes>0 ? '<div class="ir"><span class="ic">\u2b50</span><span>'+esc(rat)+' \u00b7 '+nRes+' rese\u00f1as</span></div>\n' : '')
    + '</div>\n\n'

    // CONTACTO
    + (d.whatsapp||d.web||d.instagram||d.email ? '<div class="ac"><h3>\ud83d\udcde Contacto</h3><div class="ctl">'
      + (d.whatsapp  ? '<a href="https://wa.me/'+esc(d.whatsapp)+'" target="_blank">\ud83d\udcac WhatsApp</a>' : '')
      + (d.instagram ? '<a href="https://instagram.com/'+esc((d.instagram||'').replace('@',''))+'" target="_blank">\ud83d\udcf7 @'+esc((d.instagram||'').replace('@',''))+'</a>' : '')
      + (d.web       ? '<a href="'+esc(d.web)+'" target="_blank">\ud83c\udf10 Sitio web</a>' : '')
      + (d.email     ? '<a href="mailto:'+esc(d.email)+'">\u2709\ufe0f '+esc(d.email)+'</a>' : '')
      + '</div></div>\n\n' : '')

    // FORM RESEÑA
    + '<div class="ac"><h3>\u270d\ufe0f Escribe una rese\u00f1a</h3><div class="frv" id="frv">'
    + '<div><label>Tu nombre</label><input type="text" id="rvn" placeholder="Ej: Mar\u00eda Garc\u00eda" autocomplete="name"></div>'
    + '<div><label>Puntuaci\u00f3n</label><div class="sinp">'
    + '<input type="radio" name="st" id="s5" value="5"><label for="s5">\u2605</label>'
    + '<input type="radio" name="st" id="s4" value="4"><label for="s4">\u2605</label>'
    + '<input type="radio" name="st" id="s3" value="3"><label for="s3">\u2605</label>'
    + '<input type="radio" name="st" id="s2" value="2"><label for="s2">\u2605</label>'
    + '<input type="radio" name="st" id="s1" value="1"><label for="s1">\u2605</label>'
    + '</div></div>'
    + '<div><label>Tu experiencia</label><textarea id="rvt" rows="4" placeholder="\u00bfQu\u00e9 te pareci\u00f3 este lugar?"></textarea></div>'
    + '<button class="btnrv" onclick="submitRv()">Publicar rese\u00f1a \u2192</button>'
    + '<div class="rvok" id="rvok">\ud83c\udf89 \u00a1Gracias por tu rese\u00f1a!</div>'
    + '</div></div>\n\n'

    + '</aside>\n</div>\n\n'

    // FOOTER
    + '<footer class="foot">'
    + '<div class="flogo">EXPLORA<em>CO</em></div>'
    + '<p>El directorio tur\u00edstico m\u00e1s completo de Colombia</p>'
    + '<p style="margin-top:.4rem">'
    + '<a href="/index.html" style="color:var(--g)">Inicio</a> \u00b7 '
    + '<a href="/'+esc(dir)+'" style="color:var(--g)">'+esc(label)+'</a>'
    + '</p></footer>\n\n'

    // SCRIPT
    + '<script>\n'
    + 'var DID="'+esc(String(d.id))+'";\n'
    + 'function submitRv(){\n'
    + '  var nom=document.getElementById("rvn").value.trim();\n'
    + '  var txt=document.getElementById("rvt").value.trim();\n'
    + '  var st=document.querySelector("input[name=st]:checked");\n'
    + '  if(!st){alert("Selecciona una puntuaci\u00f3n");return;}\n'
    + '  if(!nom){alert("Ingresa tu nombre");return;}\n'
    + '  var btn=document.querySelector(".btnrv");\n'
    + '  btn.disabled=true;btn.textContent="Publicando...";\n'
    + '  fetch("/api/interacciones",{method:"POST",headers:{"Content-Type":"application/json"},'
    + '  body:JSON.stringify({tipo:"resena",destino_id:DID,rating:parseInt(st.value),texto:"["+nom+"] "+txt})})\n'
    + '  .then(function(r){return r.json();})\n'
    + '  .then(function(d){\n'
    + '    if(d.ok||d.id){\n'
    + '      document.getElementById("rvok").style.display="block";\n'
    + '      document.getElementById("frv").style.opacity=".4";\n'
    + '    }else{btn.disabled=false;btn.textContent="Publicar rese\u00f1a \u2192";alert("Error: "+(d.error||"No se pudo publicar"));}\n'
    + '  }).catch(function(){\n'
    + '    btn.disabled=false;btn.textContent="Publicar rese\u00f1a \u2192";alert("Error de conexi\u00f3n.");\n'
    + '  });\n'
    + '}\n'
    + '// Registrar visita\n'
    + 'fetch("/api/utilidades?tipo=visitas",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({destino_id:DID})}).catch(function(){});\n'
    + '<\/script>\n'
    + '</body>\n</html>';
}

module.exports = async function handler(req, res) {
  // Slug desde query o URL
  var slug = (req.query.slug || '').trim().replace(/\.html$/, '');

  // Rechazar slugs inválidos antes de tocar la DB
  if (!slug || slug.length < 3 || /^[0-9]+$/.test(slug)) {
    return res.status(404).send('<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">'
      + '<title>No encontrado \u2013 ExploraCO</title>'
      + '<style>body{font-family:sans-serif;text-align:center;padding:4rem 1rem;background:#f9f7f4}a{color:#E8A020}</style>'
      + '</head><body><h1 style="font-size:3rem;margin-bottom:1rem">404</h1>'
      + '<p>P\u00e1gina no encontrada.</p>'
      + '<p style="margin-top:1.5rem"><a href="/index.html">\u2190 Volver al inicio</a></p>'
      + '</body></html>');
  }

  try {
    var sql = neon(process.env.DATABASE_URL);

    // Destino principal
    var rows = await sql(
      'SELECT d.* FROM destinos d WHERE d.slug = $1 LIMIT 1',
      [slug]
    );

    if (!rows.length) {
      return res.status(404).send('<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">'
        + '<title>No encontrado \u2013 ExploraCO</title>'
        + '<style>body{font-family:sans-serif;text-align:center;padding:4rem 1rem;background:#f9f7f4}a{color:#E8A020}</style>'
        + '</head><body><h1 style="font-size:3rem;margin-bottom:1rem">404</h1>'
        + '<p>El lugar <b>'+esc(slug)+'</b> no existe o fue eliminado.</p>'
        + '<p style="margin-top:1.5rem"><a href="/index.html">\u2190 Volver al inicio</a></p>'
        + '</body></html>');
    }

    var d = rows[0];

    // Detalles
    var detRows = await sql('SELECT * FROM destinos_detalles WHERE destino_id=$1 LIMIT 1', [d.id]);
    var det     = detRows.length ? detRows[0] : {};

    // Fotos
    var fotosRows = await sql(
      'SELECT url,caption FROM destinos_fotos WHERE destino_id=$1 ORDER BY orden ASC NULLS LAST, es_hero DESC LIMIT 12',
      [d.id]
    );

    // Rese\u00f1as
    var resenasRows = await sql(
      'SELECT i.rating, i.texto, u.nombre AS usuario_nombre FROM interacciones i LEFT JOIN usuarios u ON i.usuario_id=u.id WHERE i.destino_id=$1 AND i.tipo=\'resena\' ORDER BY i.creado_en DESC LIMIT 10',
      [d.id]
    );

    var html = renderHTML(d, det, fotosRows, resenasRows);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    return res.status(200).send(html);

  } catch (err) {
    console.error('[pagina-destino]', err.message);
    return res.status(500).send('<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">'
      + '<title>Error \u2013 ExploraCO</title>'
      + '<style>body{font-family:sans-serif;text-align:center;padding:4rem 1rem;background:#f9f7f4}a{color:#E8A020}</style>'
      + '</head><body><h1 style="font-size:2rem;margin-bottom:1rem">\u26a0\ufe0f Error temporal</h1>'
      + '<p>No pudimos cargar esta p\u00e1gina. Por favor intenta de nuevo.</p>'
      + '<p style="margin-top:1.5rem"><a href="/index.html">\u2190 Volver al inicio</a></p>'
      + '</body></html>');
  }
};
