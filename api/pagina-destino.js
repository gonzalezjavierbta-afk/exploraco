// api/pagina-destino.js  v5 — schema 100% real confirmado
// interacciones: rating (no puntuacion), creado_en (no created_at), sin usuario_nombre
// destinos_detalles: habitaciones, amenidades, faqs como JSONB separados
// destinos: tags JSONB para datos extra del formulario público

const { neon } = require('@neondatabase/serverless');

const ICONS  = { hostal:'🏨', comida:'🍽️', sitio:'🏔️', evento:'🎉' };
const LABELS = { hostal:'Hospedaje', comida:'Comida & Restaurantes', sitio:'Lugares & Sitios', evento:'Eventos' };
const DIRS   = { hostal:'directorio-hostal.html', comida:'directorio-comida.html', sitio:'directorio-sitio.html', evento:'directorio-evento.html' };

function e(s) {
  if (s===null||s===undefined) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function safeJSON(val) {
  if (!val) return null;
  if (typeof val === 'object') return val;
  try { return JSON.parse(val); } catch(_) { return null; }
}

// Schema.org JSON-LD por tipo de lugar
function buildSchemaLD(d, detalles, fotos, resenas, catSlug) {
  var BASE    = 'https://exploraco.co';
  var url     = BASE + '/' + (d.slug || '') + '.html';
  var foto    = d.foto_hero || '';
  var rat     = d.rating    ? parseFloat(d.rating).toFixed(1) : null;
  var nRes    = parseInt(d.total_resenas || 0);
  var det     = detalles || {};

  // Tipo de Schema según categoría
  var typeMap = {
    hostal: 'LodgingBusiness',
    comida: 'FoodEstablishment',
    sitio:  'TouristAttraction',
    evento: 'Event',
  };
  var schemaType = typeMap[catSlug] || 'TouristAttraction';

  // Base común
  var schema = {
    '@context':    'https://schema.org',
    '@type':       schemaType,
    'name':        d.nombre   || '',
    'description': d.lead     || d.descripcion || '',
    'url':         url,
  };

  if (foto) schema['image'] = foto;

  // Dirección
  if (d.ciudad) {
    schema['address'] = {
      '@type':           'PostalAddress',
      'addressLocality': d.ciudad  || '',
      'addressRegion':   d.region  || '',
      'addressCountry':  'CO',
    };
    if (d.barrio || d.direccion) {
      schema['address']['streetAddress'] = d.barrio || d.direccion || '';
    }
  }

  // Coordenadas
  if (d.lat && d.lng) {
    schema['geo'] = {
      '@type':     'GeoCoordinates',
      'latitude':  parseFloat(d.lat),
      'longitude': parseFloat(d.lng),
    };
  }

  // Rating agregado
  if (rat && nRes > 0) {
    schema['aggregateRating'] = {
      '@type':       'AggregateRating',
      'ratingValue': rat,
      'ratingCount': nRes,
      'bestRating':  '5',
      'worstRating': '1',
    };
  }

  // Precio
  if (d.precio_desde) {
    schema['priceRange'] = d.precio_desde;
  }

  // Contacto
  if (d.telefono) schema['telephone'] = d.telefono;
  if (d.email)    schema['email']     = d.email;
  if (d.web)      schema['url']       = d.web;

  // Horario
  if (d.horario) {
    schema['openingHours'] = d.horario;
  }

  // Campos específicos por tipo
  if (catSlug === 'hostal' && d.precio_desde) {
    schema['checkinTime']  = det.checkin  || 'T14:00';
    schema['checkoutTime'] = det.checkout || 'T11:00';
  }

  if (catSlug === 'comida') {
    schema['servesCuisine'] = 'Colombian';
  }

  // Reseñas individuales (máx 3 para no inflar el JSON-LD)
  if (resenas && resenas.length > 0) {
    schema['review'] = resenas.slice(0, 3).map(function(r) {
      return {
        '@type':       'Review',
        'author':      { '@type': 'Person', 'name': r.usuario_nombre || 'Viajero' },
        'reviewRating': {
          '@type':       'Rating',
          'ratingValue': String(r.rating || 5),
          'bestRating':  '5',
        },
        'reviewBody': r.texto || '',
      };
    });
  }

  // Organización publicadora
  schema['publisher'] = {
    '@type': 'Organization',
    'name':  'ExploraCO',
    'url':   BASE,
    'logo':  BASE + '/favicon.png',
  };

  return '<script type="application/ld+json">\n'
    + JSON.stringify(schema, null, 2)
    + '\n</script>';
}


function buildHTML(d, detalles, fotos, resenas) {
  var cat    = d.categoria_slug || 'sitio';
  var icon   = ICONS[cat]  || '📍';
  var label  = LABELS[cat] || 'Destino';
  var dir    = DIRS[cat]   || 'index.html';
  var hero   = d.foto_hero || 'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=1200&q=80';
  var rat    = d.rating ? Number(d.rating).toFixed(1) : null;
  var nRes   = parseInt(d.total_resenas||0);
  var precio = d.precio_desde || null;

  // Datos de destinos_detalles (columnas JSONB separadas)
  var det       = detalles || {};
  var amenidades   = safeJSON(det.amenidades)   || [];
  var habitaciones = safeJSON(det.habitaciones) || [];
  var faqs         = safeJSON(det.faqs)         || [];
  var checkin      = det.checkin  || '';
  var checkout     = det.checkout || '';

  // Datos extra del formulario (guardados en tags JSONB de destinos)
  var tags = safeJSON(d.tags) || {};
  // Merge: destinos_detalles tiene prioridad sobre tags
  if (!amenidades.length   && tags.amenidades)   amenidades   = tags.amenidades;
  if (!habitaciones.length && tags.habitaciones) habitaciones = tags.habitaciones;
  if (!faqs.length         && tags.faqs)         faqs         = tags.faqs;
  if (!checkin             && tags.checkin)       checkin      = tags.checkin;
  if (!checkout            && tags.checkout)      checkout     = tags.checkout;

  // Links de reserva — destinos_detalles o columnas directas
  var bookingUrl     = det.booking_url     || d.booking     || '';
  var hostelworldUrl = det.hostelworld_url || d.hostelworld || '';
  var airbnbUrl      = det.airbnb_url      || d.airbnb      || '';

  // Galería
  var galHTML = (fotos||[]).map(f =>
    `<div class="gi"><img src="${e(f.url)}" alt="${e(f.caption||d.nombre)}" loading="lazy"></div>`
  ).join('');

  // Habitaciones
  var habHTML = habitaciones.length ? `
  <section id="habitaciones" class="sec">
    <h2>${icon} Habitaciones</h2>
    <div class="tblw"><table class="tbl">
      <thead><tr><th>Tipo</th><th>Camas</th><th>Precio</th><th></th></tr></thead>
      <tbody>${habitaciones.map(h=>`<tr>
        <td><b>${e(h.nombre||h.name||'')}</b></td>
        <td>${e(h.camas||h.beds||'')}</td>
        <td>${e(h.precio||h.price||'—')}</td>
        <td>${d.whatsapp?`<a href="https://wa.me/${e(d.whatsapp)}" class="bwa" target="_blank">Reservar</a>`:''}</td>
      </tr>`).join('')}</tbody>
    </table></div>
  </section>` : '';

  // Servicios
  var amenHTML = amenidades.length ? `
  <section id="servicios" class="sec">
    <h2>✅ Servicios incluidos</h2>
    <div class="chips">${amenidades.map(a=>`<span class="chip">✓ ${e(typeof a==='string'?a:a.nombre||'')}</span>`).join('')}</div>
  </section>` : '';

  // FAQs
  var faqHTML = faqs.length ? `
  <section id="faq" class="sec">
    <h2>❓ Preguntas frecuentes</h2>
    ${faqs.map(f=>`<details class="faq"><summary>${e(f.pregunta||f.q||'')}</summary><p>${e(f.respuesta||f.a||'')}</p></details>`).join('')}
  </section>` : '';

  // Reservar
  var rbtns = [];
  if(d.whatsapp)   rbtns.push(`<a href="https://wa.me/${e(d.whatsapp)}" class="rbtn rwa" target="_blank">💬 Reservar por WhatsApp</a>`);
  if(bookingUrl)   rbtns.push(`<a href="${e(bookingUrl)}" class="rbtn rbk" target="_blank">🏨 Booking.com</a>`);
  if(hostelworldUrl) rbtns.push(`<a href="${e(hostelworldUrl)}" class="rbtn rhw" target="_blank">🌍 Hostelworld</a>`);
  if(airbnbUrl)    rbtns.push(`<a href="${e(airbnbUrl)}" class="rbtn rab" target="_blank">🏡 Airbnb</a>`);
  var reservarHTML = rbtns.length ? `
  <section id="reservar" class="sec">
    <h2>📅 Reservar</h2>
    <div class="rbtns">${rbtns.join('')}</div>
  </section>` : '';

  // Mapa
  var mapaHTML = (d.lat && d.lng) ? `
  <section id="mapa" class="sec">
    <h2>🗺️ Ubicación</h2>
    <iframe width="100%" height="280" style="border:0;border-radius:10px" loading="lazy"
      src="https://www.google.com/maps?q=${d.lat},${d.lng}&z=15&output=embed"></iframe>
  </section>` : '';

  // Reseñas — rating (no puntuacion), creado_en (no created_at), nombre de usuario
  var rvHTML = (resenas||[]).length ? `
  <section id="resenas" class="sec">
    <h2>💬 Reseñas ${rat?`<span class="rbadge">⭐ ${e(rat)}</span>`:''}</h2>
    ${resenas.map(r=>`<div class="rv">
      <div class="rvh">
        <span class="av">${e((r.usuario_nombre||'V').slice(0,2).toUpperCase())}</span>
        <div>
          <b>${e(r.usuario_nombre||'Viajero')}</b>
          <span class="stars">${'★'.repeat(Math.round(r.rating||0))}${'☆'.repeat(5-Math.round(r.rating||0))}</span>
        </div>
      </div>
      ${r.texto?`<p>${e(r.texto)}</p>`:''}
    </div>`).join('')}
  </section>` : `
  <section id="resenas" class="sec">
    <h2>💬 Reseñas</h2>
    <p style="color:#888;font-size:.875rem">Sé el primero en dejar una reseña.</p>
  </section>`;

  // Contacto aside
  var ctHTML = [];
  if(d.whatsapp)  ctHTML.push(`<a href="https://wa.me/${e(d.whatsapp)}" target="_blank">💬 WhatsApp</a>`);
  if(d.instagram) ctHTML.push(`<a href="https://instagram.com/${e((d.instagram||'').replace('@',''))}" target="_blank">📷 @${e((d.instagram||'').replace('@',''))}</a>`);
  if(d.web)       ctHTML.push(`<a href="${e(d.web)}" target="_blank">🌐 Sitio web</a>`);
  if(d.email)     ctHTML.push(`<a href="mailto:${e(d.email)}">✉️ ${e(d.email)}</a>`);

  var anchors = ['<a href="#descripcion">Sobre</a>'];
  if(fotos&&fotos.length)  anchors.push('<a href="#galeria">Fotos</a>');
  if(habitaciones.length)  anchors.push('<a href="#habitaciones">Habitaciones</a>');
  if(rbtns.length)         anchors.push('<a href="#reservar">Reservar</a>');
  if(amenidades.length)    anchors.push('<a href="#servicios">Servicios</a>');
  if(d.lat && d.lng)       anchors.push('<a href="#mapa">Mapa</a>');
  if(faqs.length)          anchors.push('<a href="#faq">FAQ</a>');
  anchors.push('<a href="#resenas">Reseñas</a>');

  var css = `
:root{--g:#E8A020;--gd:#c47c0a;--bg:#f9f7f4;--card:#fff;--text:#1a1a1a;--mu:#666;--r:12px}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:var(--bg);color:var(--text);line-height:1.5}
a{color:var(--gd);text-decoration:none}a:hover{text-decoration:underline}img{display:block;max-width:100%}
.nav{background:#fff;border-bottom:1px solid #eee;padding:0 1.25rem;display:flex;align-items:center;justify-content:space-between;height:54px;position:sticky;top:0;z-index:100;box-shadow:0 1px 6px rgba(0,0,0,.06)}
.logo{font-size:1.2rem;font-weight:900;letter-spacing:-.5px;color:var(--text)}.logo em{color:var(--g);font-style:normal}
.bc{padding:.5rem 1.25rem;font-size:.78rem;color:var(--mu);max-width:960px;margin:0 auto}.bc a{color:var(--mu)}
.hero{position:relative;height:320px;background:#111;overflow:hidden}
@media(min-width:600px){.hero{height:440px}}
.hero img{width:100%;height:100%;object-fit:cover;opacity:.82}
.hero-ov{position:absolute;inset:0;background:linear-gradient(to top,rgba(0,0,0,.72),rgba(0,0,0,.08) 65%)}
.hero-c{position:absolute;bottom:0;left:0;right:0;padding:1.5rem 1.25rem;max-width:960px;margin:0 auto}
.hcat{display:inline-block;background:var(--g);color:#fff;font-size:.7rem;font-weight:800;padding:2px 10px;border-radius:20px;margin-bottom:.4rem;letter-spacing:.5px}
.htitle{font-size:1.875rem;font-weight:900;color:#fff;line-height:1.1;margin-bottom:.4rem}
@media(min-width:600px){.htitle{font-size:2.5rem}}
.hsub{color:rgba(255,255,255,.82);font-size:.9rem;margin-bottom:.55rem}
.hmeta{display:flex;flex-wrap:wrap;gap:.55rem;color:rgba(255,255,255,.85);font-size:.8rem}
.pbanner{background:#fff3cd;border:1px solid #ffc107;color:#856404;padding:.75rem 1.25rem;border-radius:10px;font-size:.875rem;text-align:center}
.anav{background:#fff;border-bottom:1px solid #eee;overflow-x:auto;white-space:nowrap;-webkit-overflow-scrolling:touch}
.anav a{display:inline-block;padding:.75rem .875rem;font-size:.8125rem;color:var(--mu);border-bottom:3px solid transparent;transition:all .15s}
.anav a:hover{color:var(--text);text-decoration:none;border-color:var(--g)}
.body{max-width:960px;margin:0 auto;padding:1.5rem 1.25rem 4rem;display:flex;gap:1.75rem;flex-direction:column}
@media(min-width:768px){.body{flex-direction:row}}
.main{flex:1;min-width:0;display:flex;flex-direction:column;gap:1.5rem}
.aside{width:100%}@media(min-width:768px){.aside{width:276px;flex-shrink:0}}
.sec{background:var(--card);border-radius:var(--r);padding:1.5rem;box-shadow:0 2px 12px rgba(0,0,0,.07)}
.sec h2{font-size:1.0625rem;font-weight:700;margin-bottom:1rem}
.dtxt{font-size:.9375rem;line-height:1.75;color:#333}
.hl{background:#fff8ec;border-left:4px solid var(--g);padding:.875rem 1rem;border-radius:0 var(--r) var(--r) 0;margin-bottom:.875rem}
.hl p{font-size:.875rem;color:#7a5000;font-style:italic;line-height:1.6}
.gal{display:grid;grid-template-columns:repeat(2,1fr);gap:.4rem}
@media(min-width:480px){.gal{grid-template-columns:repeat(3,1fr)}}
.gi img{width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:8px;cursor:pointer;transition:opacity .15s}
.gi img:hover{opacity:.85}
.tblw{overflow-x:auto}.tbl{width:100%;border-collapse:collapse;font-size:.8125rem}
.tbl th{background:#f5f5f5;padding:.5rem .625rem;text-align:left;font-weight:700;border-bottom:2px solid #eee}
.tbl td{padding:.5rem .625rem;border-bottom:1px solid #f0f0f0;vertical-align:middle}
.bwa{display:inline-block;background:#25D366;color:#fff!important;padding:.3rem .75rem;border-radius:7px;font-size:.78rem;font-weight:600}
.chips{display:flex;flex-wrap:wrap;gap:.4rem}
.chip{background:#f0faf0;color:#1e5c1e;border:1px solid #c3e6c3;padding:.3rem .7rem;border-radius:20px;font-size:.78rem;font-weight:500}
.faq{border:1px solid #eee;border-radius:8px;margin-bottom:.4rem}
.faq summary{padding:.75rem .875rem;cursor:pointer;font-weight:600;font-size:.875rem;list-style:none;display:flex;justify-content:space-between;align-items:center}
.faq summary::-webkit-details-marker{display:none}.faq summary::after{content:'+';font-size:1.1rem;color:var(--g)}
.faq[open] summary::after{content:'−'}.faq p{padding:.5rem .875rem .875rem;font-size:.8125rem;color:#444;line-height:1.6}
.rbtns{display:flex;flex-direction:column;gap:.5rem}
.rbtn{display:block;text-align:center;padding:.875rem;border-radius:10px;font-weight:700;font-size:.9rem;color:#fff!important;transition:opacity .15s}
.rbtn:hover{opacity:.88;text-decoration:none}
.rwa{background:#25D366}.rbk{background:#003580}.rhw{background:#f0593a}.rab{background:#FF5A5F}
.rbadge{background:var(--g);color:#fff;font-size:.72rem;padding:2px 8px;border-radius:20px;font-weight:700;margin-left:6px}
.rv{border:1px solid #f0f0f0;border-radius:10px;padding:.875rem;margin-bottom:.625rem;background:#fafafa}
.rvh{display:flex;align-items:center;gap:.625rem;margin-bottom:.4rem}
.av{width:36px;height:36px;border-radius:50%;background:var(--g);color:#fff;font-weight:700;display:flex;align-items:center;justify-content:center;font-size:.8rem;flex-shrink:0}
.stars{color:#f5a623;font-size:.78rem;display:block;margin-top:1px}.rv p{font-size:.8125rem;color:#444;line-height:1.55}
.ac{background:var(--card);border-radius:var(--r);padding:1.25rem;box-shadow:0 2px 12px rgba(0,0,0,.07);margin-bottom:1rem}
.ac h3{font-size:.9375rem;font-weight:700;margin-bottom:.75rem}
.ir{display:flex;gap:.5rem;margin-bottom:.5rem;font-size:.8125rem;color:#444}
.ir .ic{width:22px;text-align:center;flex-shrink:0}
.ctl{display:flex;flex-direction:column;gap:.375rem}
.ctl a{display:block;padding:.625rem .875rem;background:#f5f5f5;border-radius:8px;font-size:.875rem;color:var(--text)!important;transition:background .15s}
.ctl a:hover{background:#ebebeb;text-decoration:none}
.frv{display:flex;flex-direction:column;gap:.625rem}
.frv label{font-size:.78rem;font-weight:700;color:var(--mu)}
.frv input,.frv textarea{width:100%;padding:.55rem .75rem;border:1.5px solid #ddd;border-radius:8px;font-size:.875rem;font-family:inherit;transition:border-color .15s}
.frv input:focus,.frv textarea:focus{outline:none;border-color:var(--g);box-shadow:0 0 0 3px rgba(232,160,32,.12)}
.sinp{display:flex;gap:3px;flex-direction:row-reverse;justify-content:flex-end}
.sinp input{display:none}
.sinp label{font-size:1.5rem;color:#ddd;cursor:pointer;transition:color .12s}
.sinp input:checked~label,.sinp label:hover,.sinp label:hover~label{color:#f5a623}
.btnrv{background:var(--g);color:#fff;border:none;padding:.75rem;border-radius:10px;font-weight:700;font-size:.9375rem;cursor:pointer;width:100%;transition:background .15s}
.btnrv:hover{background:var(--gd)}.btnrv:disabled{background:#ccc;cursor:not-allowed}
.rvok{display:none;background:#d4edda;color:#155724;padding:.875rem;border-radius:10px;text-align:center;font-weight:600;font-size:.875rem}
.foot{background:#111;color:rgba(255,255,255,.5);padding:2rem 1.25rem;text-align:center;font-size:.8rem}
.flogo{font-size:1.2rem;font-weight:900;color:#fff;margin-bottom:.375rem}.flogo em{color:var(--g);font-style:normal}
`;

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${e(d.nombre)} – ExploraCO</title>
<meta name="description" content="${e(d.lead||d.nombre)}">
<meta property="og:title" content="${e(d.nombre)} – ExploraCO">
<meta property="og:description" content="${e(d.lead||'')}">
<meta property="og:image" content="${e(hero)}">
<meta property="og:type" content="place">
<meta name="theme-color" content="#E8A020">
<link rel="canonical" href="https://exploraco.co/${e(d.slug)}.html">
${buildSchemaLD(d, detalles, fotosRows, resenasRows, cat)}
<style>${css}</style>
</head>
<body>

<nav class="nav">
  <a class="logo" href="/index.html">EXPLORA<em>CO</em></a>
  <a href="/${e(dir)}" style="font-size:.8rem;color:var(--mu)">← ${e(label)}</a>
</nav>

<div class="bc">
  <a href="/index.html">Inicio</a> › <a href="/${e(dir)}">${icon} ${e(label)}</a> › ${e(d.nombre)}
</div>

${d.status==='draft'?`<div style="max-width:960px;margin:.5rem auto;padding:0 1.25rem"><div class="pbanner">⏳ Este lugar está pendiente de revisión por el equipo de ExploraCO.</div></div>`:''}

<div class="hero">
  <img src="${e(hero)}" alt="${e(d.nombre)}" loading="eager">
  <div class="hero-ov"></div>
  <div class="hero-c">
    <span class="hcat">${icon} ${e(label)}</span>
    <h1 class="htitle">${e(d.nombre)}</h1>
    <p class="hsub">${e(d.lead||'')}</p>
    <div class="hmeta">
      <span>📍 ${e(d.ciudad||'Colombia')}${d.region?', '+e(d.region):''}</span>
      ${nRes>0?`<span>⭐ ${e(String(rat))} · ${nRes} reseñas</span>`:''}
      ${precio?`<span>💰 Desde ${e(precio)}</span>`:''}
    </div>
  </div>
</div>

<nav class="anav">${anchors.join('')}</nav>

<div class="body">
<main class="main">

  <section id="descripcion" class="sec">
    <h2>📋 Sobre este lugar</h2>
    ${d.highlight?`<div class="hl"><p>${e(d.highlight)}</p></div>`:''}
    <p class="dtxt">${e(d.descripcion||d.lead||'').replace(/\n/g,'<br>')}</p>
    ${d.como_llegar?`<div style="margin-top:1rem;padding-top:1rem;border-top:1px solid #f0f0f0">
      <h3 style="font-size:.9rem;font-weight:700;margin-bottom:.5rem">🚌 Cómo llegar</h3>
      <p style="font-size:.875rem;color:#444;line-height:1.65">${e(d.como_llegar)}</p>
    </div>`:''}
  </section>

  ${(fotos&&fotos.length)?`<section id="galeria" class="sec"><h2>📷 Galería</h2><div class="gal">${galHTML}</div></section>`:''}
  ${habHTML}
  ${reservarHTML}
  ${amenHTML}
  ${mapaHTML}
  ${faqHTML}
  ${rvHTML}

</main>
<aside class="aside">

  <div class="ac">
    <h3>ℹ️ Información</h3>
    ${d.ciudad?`<div class="ir"><span class="ic">📍</span><span>${e(d.ciudad)}${d.region?', '+e(d.region):''}</span></div>`:''}
    ${d.barrio?`<div class="ir"><span class="ic">🏘️</span><span>${e(d.barrio)}</span></div>`:''}
    ${d.tipo?`<div class="ir"><span class="ic">🏠</span><span>${e(d.tipo)}</span></div>`:''}
    ${checkin?`<div class="ir"><span class="ic">⏰</span><span>Check-in ${e(checkin)} · Out ${e(checkout||'?')}</span></div>`:''}
    ${d.horario?`<div class="ir"><span class="ic">🕐</span><span>${e(d.horario)}</span></div>`:''}
    ${precio?`<div class="ir"><span class="ic">💰</span><span>Desde <b>${e(precio)}</b></span></div>`:''}
    ${nRes>0?`<div class="ir"><span class="ic">⭐</span><span>${e(String(rat))} · ${nRes} reseñas</span></div>`:''}
  </div>

  ${ctHTML.length?`<div class="ac"><h3>📞 Contacto</h3><div class="ctl">${ctHTML.join('')}</div></div>`:''}

  <div class="ac">
    <h3>✍️ Escribe una reseña</h3>
    <div class="frv" id="frv">
      <div><label>Tu nombre</label><input type="text" id="rvn" placeholder="Ej: María García" autocomplete="name"></div>
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
      <div><label>Tu experiencia</label><textarea id="rvt" rows="4" placeholder="¿Qué te pareció este lugar?"></textarea></div>
      <button class="btnrv" onclick="submitRv()">Publicar reseña →</button>
      <div class="rvok" id="rvok">🎉 ¡Gracias por tu reseña!</div>
    </div>
  </div>

</aside>
</div>

<footer class="foot">
  <div class="flogo">EXPLORA<em>CO</em></div>
  <p>El directorio turístico más completo de Colombia</p>
  <p style="margin-top:.4rem">
    <a href="/index.html" style="color:var(--g)">Inicio</a> ·
    <a href="/${e(dir)}" style="color:var(--g)">${e(label)}</a> ·
    <a href="/admin.html" style="color:var(--g)">Admin</a>
  </p>
</footer>

<script>
var DID="${e(String(d.id))}";
function submitRv(){
  var nom=document.getElementById('rvn').value.trim();
  var txt=document.getElementById('rvt').value.trim();
  var st=document.querySelector('input[name=st]:checked');
  if(!st){alert('Selecciona una puntuación');return;}
  if(!nom){alert('Ingresa tu nombre');return;}
  var btn=document.querySelector('.btnrv');
  btn.disabled=true;btn.textContent='Publicando...';
  // usuario_nombre no existe en interacciones — guardamos en texto
  // tipo='resena', rating=valor numérico (1-5)
  fetch('/api/interacciones',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({
      tipo:'resena',
      destino_id:DID,
      rating:parseInt(st.value),
      texto:(nom+': '+txt).slice(0,1000)||null
    })
  }).then(r=>r.json()).then(data=>{
    if(data.ok||data.id){
      document.getElementById('rvok').style.display='block';
      document.getElementById('frv').style.opacity='.4';
      document.getElementById('frv').style.pointerEvents='none';
    }else{
      btn.disabled=false;btn.textContent='Publicar reseña →';
      alert('Error: '+(data.error||'No se pudo publicar'));
    }
  }).catch(()=>{
    btn.disabled=false;btn.textContent='Publicar reseña →';
    alert('Error de conexión. Intenta de nuevo.');
  });
}
</script>
<script src="/pagina-connector.js" onerror="void 0"></script>
<script src="/usuario-session.js" onerror="void 0"></script>
</body>
</html>`;
}

module.exports = async function handler(req, res) {
  var slug = (req.query.slug||'').trim().replace(/\.html$/,'');
  if (!slug) return res.status(400).send('<h1>400 — Slug requerido</h1>');

  try {
    var sql = neon(process.env.DATABASE_URL);

    // Destino principal
    var rows = await sql(
      `SELECT d.*, c.nombre AS categoria_nombre
       FROM destinos d
       LEFT JOIN categorias c ON c.slug = d.categoria_slug
       WHERE d.slug = $1 LIMIT 1`,
      [slug]
    );

    if (!rows.length) return res.status(404).send(`<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8"><title>No encontrado – ExploraCO</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>body{font-family:sans-serif;text-align:center;padding:4rem 1rem;background:#f9f7f4}
a{color:#E8A020}h1{font-size:3rem;margin-bottom:1rem}</style>
</head><body>
<h1>404</h1>
<p>El lugar <b>${e(slug)}</b> no existe o fue eliminado.</p>
<p style="margin-top:1.5rem"><a href="/index.html">← Volver al inicio</a></p>
</body></html>`);

    var d = rows[0];

    // Detalles (columnas separadas en destinos_detalles)
    var detRows = await sql(
      `SELECT * FROM destinos_detalles WHERE destino_id=$1 LIMIT 1`,
      [d.id]
    );
    var detalles = detRows.length ? detRows[0] : {};

    // Fotos de galería
    var fotosRows = await sql(
      `SELECT url, caption FROM destinos_fotos
       WHERE destino_id=$1 AND (es_hero IS NULL OR es_hero=false)
       ORDER BY orden ASC NULLS LAST LIMIT 12`,
      [d.id]
    );

    // Reseñas — columnas reales: rating (no puntuacion), creado_en (no created_at)
    // usuario_nombre no existe → tomar de texto o usar nombre de usuario
    var resenasRows = await sql(
      `SELECT i.rating, i.texto, u.nombre AS usuario_nombre
       FROM interacciones i
       LEFT JOIN usuarios u ON i.usuario_id = u.id
       WHERE i.destino_id=$1 AND i.tipo='resena'
       ORDER BY i.creado_en DESC LIMIT 10`,
      [d.id]
    );

    var html = buildHTML(d, detalles, fotosRows, resenasRows);
    res.setHeader('Content-Type','text/html; charset=utf-8');
    res.setHeader('Cache-Control','s-maxage=300, stale-while-revalidate=600');
    return res.status(200).send(html);

  } catch(err) {
    console.error('[pagina-destino]', err.message);
    return res.status(500).send(`<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Error – ExploraCO</title></head>
<body style="font-family:sans-serif;padding:2rem">
<h1>Error interno</h1>
<pre style="background:#f5f5f5;padding:1rem;border-radius:8px;margin-top:1rem;overflow-x:auto">${e(err.message)}</pre>
<p style="margin-top:1rem"><a href="/index.html">← Inicio</a></p>
</body></html>`);
  }
};

// Registrar visita
fetch('/api/utilidades?tipo=visitas', {
  method: 'POST',
  headers: {'Content-Type':'application/json'},
  body: JSON.stringify({ destino_id: DID })
}).catch(function(){});