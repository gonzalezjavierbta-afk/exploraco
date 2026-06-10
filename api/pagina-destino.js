// /api/pagina-destino.js
// Sirve el HTML completo de una página individual de destino leyendo desde Neon DB.
// Usar con rewrite en vercel.json: /destino/:slug → /api/pagina-destino?slug=:slug
// O llamar directamente: /api/pagina-destino?slug=hostal-casa-medina

import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

const CATEGORIA_ICONS = {
  hostal: '🏨',
  comida: '🍽️',
  sitio: '🏔️',
  evento: '🎉',
};

const CATEGORIA_LABELS = {
  hostal: 'Hospedaje',
  comida: 'Comida & Restaurantes',
  sitio: 'Lugares & Sitios',
  evento: 'Eventos & Festivales',
};

const CATEGORIA_DIR = {
  hostal: 'directorio-hostal.html',
  comida: 'directorio-comida.html',
  sitio: 'directorio-sitio.html',
  evento: 'directorio-evento.html',
};

function formatCOP(n) {
  if (!n) return null;
  return '$' + Number(n).toLocaleString('es-CO');
}

function safeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderHtml(destino, detalles, fotos, reseñas, categoria) {
  const d = detalles || {};
  const icon = CATEGORIA_ICONS[categoria?.slug] || '📍';
  const catLabel = CATEGORIA_LABELS[categoria?.slug] || 'Destino';
  const catDir = CATEGORIA_DIR[categoria?.slug] || 'index.html';
  const precio = formatCOP(destino.precio_desde);
  const mainFoto = destino.foto_principal || 'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=900&q=80';
  const ratingStr = destino.rating ? Number(destino.rating).toFixed(1) : '—';
  const totalResenas = destino.total_resenas || 0;

  // Galería HTML
  const galeriaItems = fotos.map(f => `
    <div class="gallery-item">
      <img src="${safeHtml(f.url)}" alt="${safeHtml(f.caption || destino.nombre)}" loading="lazy">
    </div>`).join('');

  // Habitaciones HTML (para hospedajes)
  const habitaciones = d.habitaciones || [];
  const habitacionesHTML = habitaciones.length > 0 ? `
    <section id="habitaciones" class="section">
      <h2>${icon} Tipos de habitación</h2>
      <div class="rooms-table-wrap">
        <table class="rooms-table">
          <thead><tr><th>Tipo</th><th>Camas</th><th>Precio</th><th></th></tr></thead>
          <tbody>
            ${habitaciones.map(h => `
              <tr>
                <td><strong>${safeHtml(h.nombre)}</strong>${h.badge ? `<span class="badge">${safeHtml(h.badge)}</span>` : ''}</td>
                <td>${safeHtml(h.camas)}</td>
                <td>${formatCOP(h.precio) || '—'}</td>
                <td><a href="https://wa.me/${safeHtml(d.whatsapp)}" class="btn-reservar" target="_blank">Reservar</a></td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </section>` : '';

  // Amenidades HTML
  const amenidades = d.amenidades || [];
  const amenidadesHTML = amenidades.length > 0 ? `
    <section id="servicios" class="section">
      <h2>✅ Servicios incluidos</h2>
      <div class="amenidades-grid">
        ${amenidades.map(a => `<span class="amenidad-chip">✓ ${safeHtml(a)}</span>`).join('')}
      </div>
    </section>` : '';

  // FAQs HTML
  const faqs = d.faqs || [];
  const faqsHTML = faqs.length > 0 ? `
    <section id="faq" class="section">
      <h2>❓ Preguntas frecuentes</h2>
      <div class="faqs">
        ${faqs.map(f => `
          <details class="faq-item">
            <summary>${safeHtml(f.pregunta)}</summary>
            <p>${safeHtml(f.respuesta)}</p>
          </details>`).join('')}
      </div>
    </section>` : '';

  // Reservar HTML
  const reservarLinks = [];
  if (d.whatsapp) reservarLinks.push(`<a href="https://wa.me/${safeHtml(d.whatsapp)}" class="btn-reservar btn-wa" target="_blank">💬 Reservar por WhatsApp</a>`);
  if (d.booking_url) reservarLinks.push(`<a href="${safeHtml(d.booking_url)}" class="btn-reservar btn-booking" target="_blank">🏨 Booking.com</a>`);
  if (d.hostelworld_url) reservarLinks.push(`<a href="${safeHtml(d.hostelworld_url)}" class="btn-reservar btn-hw" target="_blank">🌍 Hostelworld</a>`);
  if (d.airbnb_url) reservarLinks.push(`<a href="${safeHtml(d.airbnb_url)}" class="btn-reservar btn-airbnb" target="_blank">🏡 Airbnb</a>`);

  const reservarHTML = reservarLinks.length > 0 ? `
    <section id="reservar" class="section">
      <h2>📅 Reservar</h2>
      <div class="reservar-btns">${reservarLinks.join('')}</div>
    </section>` : '';

  // Reseñas HTML
  const resenasHTML = reseñas.length > 0 ? `
    <section id="resenas" class="section">
      <h2>💬 Reseñas de viajeros <span class="rating-badge">⭐ ${ratingStr} · ${totalResenas} reseñas</span></h2>
      <div id="resenas-lista">
        ${reseñas.map(r => `
          <div class="resena-card">
            <div class="resena-header">
              <span class="resena-avatar">${(r.usuario_nombre || 'V').slice(0,2).toUpperCase()}</span>
              <div>
                <strong>${safeHtml(r.usuario_nombre || 'Viajero')}</strong>
                <span class="resena-stars">${'★'.repeat(r.puntuacion || 5)}${'☆'.repeat(5-(r.puntuacion||5))}</span>
              </div>
            </div>
            ${r.texto ? `<p class="resena-texto">${safeHtml(r.texto)}</p>` : ''}
          </div>`).join('')}
      </div>
      <div id="resenas-extra"></div>
    </section>` : '';

  // Mapa HTML (si hay coords)
  const mapaHTML = (destino.lat && destino.lng) ? `
    <section id="mapa" class="section">
      <h2>🗺️ Ubicación</h2>
      <div id="mapa-container" style="height:300px;border-radius:12px;overflow:hidden;">
        <iframe
          width="100%" height="300" style="border:0;border-radius:12px"
          loading="lazy"
          src="https://www.google.com/maps?q=${destino.lat},${destino.lng}&z=15&output=embed">
        </iframe>
      </div>
      <p class="mapa-coords">📍 ${safeHtml(destino.ciudad)}${destino.departamento ? ', ' + safeHtml(destino.departamento) : ''}</p>
    </section>` : '';

  // Contacto HTML
  const contactoItems = [];
  if (d.whatsapp) contactoItems.push(`<a href="https://wa.me/${safeHtml(d.whatsapp)}" target="_blank">💬 WhatsApp</a>`);
  if (d.instagram) contactoItems.push(`<a href="https://instagram.com/${safeHtml(d.instagram.replace('@',''))}" target="_blank">📷 @${safeHtml(d.instagram.replace('@',''))}</a>`);
  if (d.sitio_web) contactoItems.push(`<a href="${safeHtml(d.sitio_web)}" target="_blank">🌐 Sitio web</a>`);
  if (d.email) contactoItems.push(`<a href="mailto:${safeHtml(d.email)}" target="_blank">✉️ ${safeHtml(d.email)}</a>`);

  const contactoHTML = contactoItems.length > 0 ? `
    <section id="contacto" class="section">
      <h2>📞 Contacto</h2>
      <div class="contacto-btns">${contactoItems.join('')}</div>
    </section>` : '';

  const descLarga = destino.descripcion_larga || destino.descripcion_corta || '';
  const frase = d.frase_destacada || null;

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>${safeHtml(destino.nombre)} – ExploraCO</title>
  <meta name="description" content="${safeHtml(destino.descripcion_corta)}">
  <meta property="og:title" content="${safeHtml(destino.nombre)} – ExploraCO">
  <meta property="og:description" content="${safeHtml(destino.descripcion_corta)}">
  <meta property="og:image" content="${safeHtml(mainFoto)}">
  <meta property="og:type" content="place">
  <meta name="theme-color" content="#E8A020">
  <link rel="canonical" href="https://exploraco.vercel.app/${safeHtml(destino.slug)}.html">
  <style>
    :root {
      --brand: #E8A020;
      --brand-dark: #c47c0a;
      --text: #1a1a1a;
      --muted: #666;
      --bg: #f9f7f4;
      --card: #fff;
      --radius: 12px;
      --shadow: 0 2px 16px rgba(0,0,0,.08);
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: var(--bg); color: var(--text); }
    a { color: var(--brand-dark); text-decoration: none; }
    a:hover { text-decoration: underline; }

    /* NAV */
    .nav { background: #fff; border-bottom: 1px solid #eee; padding: 0 1rem; display: flex; align-items: center; justify-content: space-between; height: 56px; position: sticky; top: 0; z-index: 100; box-shadow: 0 1px 8px rgba(0,0,0,.06); }
    .nav-logo { font-size: 1.3rem; font-weight: 800; letter-spacing: -0.5px; color: var(--text); }
    .nav-logo em { color: var(--brand); font-style: normal; }
    .nav-back { font-size: .875rem; color: var(--muted); display: flex; align-items: center; gap: 6px; }

    /* BREADCRUMB */
    .breadcrumb { padding: .75rem 1rem; font-size: .8125rem; color: var(--muted); display: flex; gap: 6px; align-items: center; max-width: 900px; margin: 0 auto; }
    .breadcrumb a { color: var(--muted); }

    /* HERO */
    .hero { position: relative; background: #111; height: 340px; overflow: hidden; }
    @media(min-width:600px){ .hero { height: 460px; } }
    .hero img { width: 100%; height: 100%; object-fit: cover; opacity: .85; }
    .hero-overlay { position: absolute; inset: 0; background: linear-gradient(to top, rgba(0,0,0,.7) 0%, rgba(0,0,0,.1) 60%); }
    .hero-content { position: absolute; bottom: 0; left: 0; right: 0; padding: 1.5rem; max-width: 900px; margin: 0 auto; }
    .hero-cat { display: inline-block; background: var(--brand); color: #fff; font-size: .75rem; font-weight: 700; padding: 3px 10px; border-radius: 20px; margin-bottom: .5rem; letter-spacing: .5px; }
    .hero-title { font-size: 2rem; font-weight: 900; color: #fff; line-height: 1.1; margin-bottom: .5rem; }
    @media(min-width:600px){ .hero-title { font-size: 2.75rem; } }
    .hero-sub { color: rgba(255,255,255,.85); font-size: .9375rem; margin-bottom: .75rem; }
    .hero-meta { display: flex; flex-wrap: wrap; gap: .75rem; color: rgba(255,255,255,.9); font-size: .875rem; }
    .hero-meta span { display: flex; align-items: center; gap: 4px; }
    .hero-actions { position: absolute; top: 1rem; right: 1rem; display: flex; gap: .5rem; }
    .btn-hero { background: rgba(255,255,255,.15); backdrop-filter: blur(8px); border: 1px solid rgba(255,255,255,.3); color: #fff; padding: .5rem .9rem; border-radius: 8px; cursor: pointer; font-size: .875rem; transition: background .2s; }
    .btn-hero:hover { background: rgba(255,255,255,.25); }

    /* ANCHOR NAV */
    .anchor-nav { background: #fff; border-bottom: 1px solid #eee; overflow-x: auto; white-space: nowrap; }
    .anchor-nav-inner { display: flex; gap: 0; max-width: 900px; margin: 0 auto; padding: 0 .5rem; }
    .anchor-nav a { display: inline-block; padding: .875rem 1rem; font-size: .875rem; color: var(--muted); border-bottom: 3px solid transparent; transition: color .2s, border-color .2s; }
    .anchor-nav a:hover { color: var(--text); text-decoration: none; border-color: var(--brand); }

    /* LAYOUT */
    .page-body { max-width: 900px; margin: 0 auto; padding: 1.5rem 1rem 3rem; display: flex; gap: 2rem; flex-direction: column; }
    @media(min-width:768px){ .page-body { flex-direction: row; } }
    .page-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2rem; }
    .page-aside { width: 100%; }
    @media(min-width:768px){ .page-aside { width: 280px; flex-shrink: 0; } }

    /* SECTIONS */
    .section { background: var(--card); border-radius: var(--radius); padding: 1.5rem; box-shadow: var(--shadow); }
    .section h2 { font-size: 1.125rem; font-weight: 700; margin-bottom: 1rem; color: var(--text); }

    /* FRASE DESTACADA */
    .frase-box { background: #fff8ec; border-left: 4px solid var(--brand); padding: 1rem 1.25rem; border-radius: 0 var(--radius) var(--radius) 0; margin-bottom: 1rem; }
    .frase-box p { font-size: .9375rem; color: #7a5000; font-style: italic; }

    /* DESCRIPCIÓN */
    .desc-text { font-size: .9375rem; line-height: 1.7; color: #333; }

    /* GALERÍA */
    .gallery-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: .5rem; }
    @media(min-width:500px){ .gallery-grid { grid-template-columns: repeat(3, 1fr); } }
    .gallery-item img { width: 100%; aspect-ratio: 4/3; object-fit: cover; border-radius: 8px; cursor: pointer; transition: opacity .2s; }
    .gallery-item img:hover { opacity: .85; }

    /* HABITACIONES */
    .rooms-table-wrap { overflow-x: auto; }
    .rooms-table { width: 100%; border-collapse: collapse; font-size: .875rem; }
    .rooms-table th { background: #f5f5f5; padding: .625rem .75rem; text-align: left; font-weight: 600; border-bottom: 2px solid #eee; }
    .rooms-table td { padding: .625rem .75rem; border-bottom: 1px solid #f0f0f0; vertical-align: middle; }
    .badge { display: inline-block; background: #fff3cd; color: #7a5000; font-size: .7rem; padding: 2px 7px; border-radius: 10px; margin-left: 6px; font-weight: 600; }

    /* AMENIDADES */
    .amenidades-grid { display: flex; flex-wrap: wrap; gap: .5rem; }
    .amenidad-chip { background: #f0faf0; color: #2d6a2d; border: 1px solid #c8e6c9; padding: .375rem .75rem; border-radius: 20px; font-size: .8125rem; font-weight: 500; }

    /* FAQS */
    .faq-item { border: 1px solid #eee; border-radius: 8px; margin-bottom: .5rem; overflow: hidden; }
    .faq-item summary { padding: .875rem 1rem; cursor: pointer; font-weight: 500; font-size: .9rem; list-style: none; display: flex; justify-content: space-between; align-items: center; }
    .faq-item summary::-webkit-details-marker { display: none; }
    .faq-item summary::after { content: '+'; font-size: 1.25rem; color: var(--brand); }
    .faq-item[open] summary::after { content: '−'; }
    .faq-item p { padding: .75rem 1rem 1rem; font-size: .875rem; color: #444; line-height: 1.6; }

    /* RESERVAR */
    .reservar-btns { display: flex; flex-direction: column; gap: .625rem; }
    .btn-reservar { display: block; text-align: center; padding: .875rem 1rem; border-radius: 10px; font-weight: 600; font-size: .9375rem; transition: opacity .15s; color: #fff !important; }
    .btn-reservar:hover { opacity: .88; text-decoration: none; }
    .btn-wa { background: #25D366; }
    .btn-booking { background: #003580; }
    .btn-hw { background: #f0593a; }
    .btn-airbnb { background: #FF5A5F; }

    /* CONTACTO */
    .contacto-btns { display: flex; flex-direction: column; gap: .5rem; }
    .contacto-btns a { display: block; padding: .75rem 1rem; background: #f5f5f5; border-radius: 8px; font-size: .9rem; color: var(--text) !important; transition: background .15s; }
    .contacto-btns a:hover { background: #ebebeb; text-decoration: none; }

    /* RESEÑAS */
    .rating-badge { background: var(--brand); color: #fff; font-size: .75rem; padding: 3px 8px; border-radius: 20px; font-weight: 600; margin-left: 6px; }
    .resena-card { border: 1px solid #f0f0f0; border-radius: 10px; padding: 1rem; margin-bottom: .75rem; background: #fafafa; }
    .resena-header { display: flex; align-items: center; gap: .75rem; margin-bottom: .5rem; }
    .resena-avatar { width: 38px; height: 38px; border-radius: 50%; background: var(--brand); color: #fff; font-weight: 700; display: flex; align-items: center; justify-content: center; font-size: .875rem; flex-shrink: 0; }
    .resena-stars { color: #f5a623; font-size: .875rem; margin-top: 2px; display: block; }
    .resena-texto { font-size: .875rem; color: #444; line-height: 1.5; }

    /* ASIDE - CARD */
    .aside-card { background: var(--card); border-radius: var(--radius); padding: 1.25rem; box-shadow: var(--shadow); margin-bottom: 1rem; }
    .aside-card h3 { font-size: 1rem; font-weight: 700; margin-bottom: .875rem; }
    .aside-info-row { display: flex; align-items: flex-start; gap: .625rem; margin-bottom: .625rem; font-size: .875rem; color: #444; }
    .aside-info-row .icon { width: 22px; flex-shrink: 0; text-align: center; }

    /* FORM RESEÑA */
    .form-resena { display: flex; flex-direction: column; gap: .75rem; }
    .form-resena label { font-size: .8125rem; font-weight: 600; color: var(--muted); }
    .form-resena input, .form-resena textarea {
      width: 100%; padding: .625rem .75rem; border: 1px solid #ddd; border-radius: 8px;
      font-size: .875rem; font-family: inherit; transition: border-color .2s;
    }
    .form-resena input:focus, .form-resena textarea:focus { outline: none; border-color: var(--brand); }
    .stars-input { display: flex; gap: 4px; flex-direction: row-reverse; justify-content: flex-end; }
    .stars-input input { display: none; }
    .stars-input label { font-size: 1.5rem; color: #ddd; cursor: pointer; transition: color .15s; }
    .stars-input input:checked ~ label,
    .stars-input label:hover,
    .stars-input label:hover ~ label { color: #f5a623; }
    .btn-submit-resena { background: var(--brand); color: #fff; border: none; padding: .75rem 1rem; border-radius: 10px; font-weight: 600; font-size: .9375rem; cursor: pointer; transition: background .2s; width: 100%; }
    .btn-submit-resena:hover { background: var(--brand-dark); }
    .resena-success { display: none; background: #d4edda; color: #155724; padding: 1rem; border-radius: 10px; text-align: center; font-weight: 600; }

    /* MAPA */
    .mapa-coords { margin-top: .5rem; font-size: .8125rem; color: var(--muted); }

    /* FOOTER */
    .page-footer { background: #111; color: rgba(255,255,255,.6); padding: 2rem 1rem; text-align: center; font-size: .8125rem; }
    .page-footer a { color: var(--brand); }
    .page-footer .logo { font-size: 1.25rem; font-weight: 800; color: #fff; margin-bottom: .5rem; }
    .page-footer .logo em { color: var(--brand); font-style: normal; }

    /* PENDING BANNER */
    .pending-banner { background: #fff3cd; border: 1px solid #ffc107; color: #7a5000; padding: 1rem 1.25rem; border-radius: var(--radius); font-size: .9rem; text-align: center; }
  </style>
</head>
<body>

<!-- NAV -->
<nav class="nav">
  <a class="nav-logo" href="/index.html">EXPLORA<em>CO</em></a>
  <a class="nav-back" href="/${catDir}">← ${catLabel}</a>
</nav>

<!-- BREADCRUMB -->
<div class="breadcrumb">
  <a href="/index.html">Inicio</a> › 
  <a href="/${catDir}">${icon} ${catLabel}</a> › 
  ${safeHtml(destino.nombre)}
</div>

${destino.status === 'pending' ? `
<div style="max-width:900px;margin:.5rem auto;padding:0 1rem">
  <div class="pending-banner">⏳ Este lugar está pendiente de revisión por el equipo de ExploraCO y será publicado pronto.</div>
</div>` : ''}

<!-- HERO -->
<div class="hero">
  <img src="${safeHtml(mainFoto)}" alt="${safeHtml(destino.nombre)}" loading="eager">
  <div class="hero-overlay"></div>
  <div class="hero-content">
    <span class="hero-cat">${icon} ${catLabel}</span>
    <h1 class="hero-title">${safeHtml(destino.nombre)}</h1>
    <p class="hero-sub">${safeHtml(destino.descripcion_corta)}</p>
    <div class="hero-meta">
      <span>📍 ${safeHtml(destino.ciudad)}${destino.departamento ? ', ' + safeHtml(destino.departamento) : ''}</span>
      ${totalResenas > 0 ? `<span>⭐ ${ratingStr} · ${totalResenas} reseñas</span>` : ''}
      ${precio ? `<span>💰 Desde ${precio}</span>` : ''}
    </div>
  </div>
  <div class="hero-actions">
    <button class="btn-hero" id="btn-share" onclick="sharePlace()">↗ Compartir</button>
    <button class="btn-hero" id="btn-save" onclick="savePlace()">♡ Guardar</button>
  </div>
</div>

<!-- ANCHOR NAV -->
<nav class="anchor-nav">
  <div class="anchor-nav-inner">
    <a href="#descripcion">Sobre</a>
    ${fotos.length > 0 ? '<a href="#galeria">Fotos</a>' : ''}
    ${habitaciones.length > 0 ? '<a href="#habitaciones">Habitaciones</a>' : ''}
    ${reservarLinks.length > 0 ? '<a href="#reservar">Reservar</a>' : ''}
    ${amenidades.length > 0 ? '<a href="#servicios">Servicios</a>' : ''}
    ${(destino.lat && destino.lng) ? '<a href="#mapa">Mapa</a>' : ''}
    ${faqs.length > 0 ? '<a href="#faq">FAQ</a>' : ''}
    <a href="#resenas">Reseñas</a>
  </div>
</nav>

<!-- BODY -->
<div class="page-body">
  <!-- MAIN -->
  <main class="page-main">

    <!-- DESCRIPCIÓN -->
    <section id="descripcion" class="section">
      <h2>📋 Sobre este lugar</h2>
      ${frase ? `<div class="frase-box"><p>${safeHtml(frase)}</p></div>` : ''}
      <p class="desc-text">${safeHtml(descLarga).replace(/\n/g, '<br>')}</p>
    </section>

    <!-- GALERÍA -->
    ${fotos.length > 0 ? `
    <section id="galeria" class="section">
      <h2>📷 Galería de fotos</h2>
      <div class="gallery-grid">${galeriaItems}</div>
    </section>` : ''}

    <!-- HABITACIONES (hospedajes) -->
    ${habitacionesHTML}

    <!-- RESERVAR -->
    ${reservarHTML}

    <!-- SERVICIOS -->
    ${amenidadesHTML}

    <!-- MAPA -->
    ${mapaHTML}

    <!-- FAQs -->
    ${faqsHTML}

    <!-- RESEÑAS -->
    ${resenasHTML}
    ${reseñas.length === 0 ? `
    <section id="resenas" class="section">
      <h2>💬 Reseñas</h2>
      <p style="color:var(--muted);font-size:.9rem">Aún no hay reseñas. ¡Sé el primero en compartir tu experiencia!</p>
    </section>` : ''}

  </main>

  <!-- ASIDE -->
  <aside class="page-aside">

    <!-- INFO RÁPIDA -->
    <div class="aside-card">
      <h3>ℹ️ Información</h3>
      ${destino.ciudad ? `<div class="aside-info-row"><span class="icon">📍</span><span>${safeHtml(destino.ciudad)}${destino.departamento ? ', ' + safeHtml(destino.departamento) : ''}</span></div>` : ''}
      ${d.barrio ? `<div class="aside-info-row"><span class="icon">🏘️</span><span>${safeHtml(d.barrio)}</span></div>` : ''}
      ${d.tipo_alojamiento ? `<div class="aside-info-row"><span class="icon">🏠</span><span>${safeHtml(d.tipo_alojamiento)}</span></div>` : ''}
      ${d.checkin ? `<div class="aside-info-row"><span class="icon">⏰</span><span>Check-in ${safeHtml(d.checkin)} · Out ${safeHtml(d.checkout || '?')}</span></div>` : ''}
      ${precio ? `<div class="aside-info-row"><span class="icon">💰</span><span>Desde <strong>${precio}</strong></span></div>` : ''}
      ${totalResenas > 0 ? `<div class="aside-info-row"><span class="icon">⭐</span><span>${ratingStr} · ${totalResenas} reseñas</span></div>` : ''}
    </div>

    <!-- CONTACTO -->
    ${contactoHTML ? `<div class="aside-card">${contactoHTML}</div>` : ''}

    <!-- FORMULARIO RESEÑA -->
    <div class="aside-card">
      <h3>✍️ Escribe una reseña</h3>
      <div class="form-resena" id="form-resena">
        <div>
          <label>Tu nombre</label>
          <input type="text" id="r-nombre" placeholder="Ej: María García">
        </div>
        <div>
          <label>Email (no se publica)</label>
          <input type="email" id="r-email" placeholder="tu@email.com">
        </div>
        <div>
          <label>Puntuación</label>
          <div class="stars-input">
            <input type="radio" name="stars" id="s5" value="5"><label for="s5">★</label>
            <input type="radio" name="stars" id="s4" value="4"><label for="s4">★</label>
            <input type="radio" name="stars" id="s3" value="3"><label for="s3">★</label>
            <input type="radio" name="stars" id="s2" value="2"><label for="s2">★</label>
            <input type="radio" name="stars" id="s1" value="1"><label for="s1">★</label>
          </div>
        </div>
        <div>
          <label>Tu experiencia</label>
          <textarea id="r-texto" rows="4" placeholder="¿Qué te pareció este lugar?"></textarea>
        </div>
        <button class="btn-submit-resena" onclick="submitResena()">Publicar reseña →</button>
        <div class="resena-success" id="resena-success">🎉 ¡Reseña publicada! Gracias por compartir tu experiencia.</div>
      </div>
    </div>

  </aside>
</div>

<!-- FOOTER -->
<footer class="page-footer">
  <div class="logo">EXPLORA<em>CO</em></div>
  <p>El directorio turístico más completo de Colombia</p>
  <p style="margin-top:.5rem"><a href="/index.html">Inicio</a> · <a href="/${catDir}">${catLabel}</a> · <a href="/admin.html">Admin</a></p>
</footer>

<script>
  const DESTINO_ID = '${destino.id}';
  const DESTINO_SLUG = '${safeHtml(destino.slug)}';

  // Compartir
  function sharePlace() {
    if (navigator.share) {
      navigator.share({ title: '${safeHtml(destino.nombre)}', url: window.location.href });
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('¡Enlace copiado!');
    }
  }

  // Guardar (integración con usuario-session.js si está disponible)
  function savePlace() {
    const saved = JSON.parse(localStorage.getItem('mymapa_saved') || '[]');
    const idx = saved.indexOf(DESTINO_ID);
    if (idx === -1) {
      saved.push(DESTINO_ID);
      localStorage.setItem('mymapa_saved', JSON.stringify(saved));
      document.getElementById('btn-save').textContent = '♥ Guardado';
    } else {
      saved.splice(idx, 1);
      localStorage.setItem('mymapa_saved', JSON.stringify(saved));
      document.getElementById('btn-save').textContent = '♡ Guardar';
    }
  }

  // Verificar si ya está guardado
  (function() {
    const saved = JSON.parse(localStorage.getItem('mymapa_saved') || '[]');
    if (saved.includes(DESTINO_ID)) {
      document.getElementById('btn-save').textContent = '♥ Guardado';
    }
  })();

  // Submit reseña
  async function submitResena() {
    const nombre = document.getElementById('r-nombre').value.trim();
    const email  = document.getElementById('r-email').value.trim();
    const texto  = document.getElementById('r-texto').value.trim();
    const stars  = document.querySelector('input[name="stars"]:checked');

    if (!stars) { alert('Por favor selecciona una puntuación'); return; }
    if (!nombre) { alert('Por favor ingresa tu nombre'); return; }

    const btn = document.querySelector('.btn-submit-resena');
    btn.disabled = true; btn.textContent = 'Publicando...';

    try {
      const resp = await fetch('/api/interacciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: 'resena',
          destino_id: DESTINO_ID,
          usuario_nombre: nombre,
          usuario_email: email || null,
          puntuacion: parseInt(stars.value),
          texto: texto || null
        })
      });
      const data = await resp.json();
      if (data.ok || resp.ok) {
        document.getElementById('resena-success').style.display = 'block';
        document.getElementById('form-resena').style.opacity = '.4';
        document.getElementById('form-resena').style.pointerEvents = 'none';
      } else {
        throw new Error(data.error || 'Error');
      }
    } catch(err) {
      btn.disabled = false; btn.textContent = 'Publicar reseña →';
      alert('Error al publicar. Por favor intenta de nuevo.');
    }
  }
</script>

<!-- Cargar pagina-connector.js si existe (compatibilidad con sistema anterior) -->
<script src="/pagina-connector.js" onerror="void 0"></script>
<script src="/usuario-session.js" onerror="void 0"></script>

</body>
</html>`;
}

export default async function handler(req, res) {
  const slug = req.query.slug || '';

  if (!slug) {
    return res.status(400).send('<h1>Slug requerido</h1>');
  }

  try {
    // Buscar destino
    const [destino] = await sql`
      SELECT d.*, c.slug as cat_slug, c.nombre as cat_nombre
      FROM destinos d
      LEFT JOIN categorias c ON d.categoria_id = c.id
      WHERE d.slug = ${slug}
      LIMIT 1
    `;

    if (!destino) {
      return res.status(404).send(`<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8"><title>No encontrado – ExploraCO</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>body{font-family:sans-serif;text-align:center;padding:4rem 1rem;background:#f9f7f4}
a{color:#E8A020}</style></head>
<body><h1>404 · Lugar no encontrado</h1><p>El destino "<strong>${safeHtml(slug)}</strong>" no existe o fue eliminado.</p>
<p><a href="/index.html">← Volver al inicio</a></p></body></html>`);
    }

    // Solo mostrar pending si el admin lo ve (por ahora lo mostramos con banner)
    // En el futuro: verificar si el request viene con auth header

    const categoria = { slug: destino.cat_slug, nombre: destino.cat_nombre };

    // Detalles
    const [detallesRow] = await sql`
      SELECT datos FROM destinos_detalles WHERE destino_id = ${destino.id} LIMIT 1
    `;
    const detalles = detallesRow?.datos || {};

    // Fotos
    const fotos = await sql`
      SELECT url, caption FROM destinos_fotos
      WHERE destino_id = ${destino.id}
      ORDER BY orden ASC
      LIMIT 12
    `;

    // Reseñas recientes
    const reseñas = await sql`
      SELECT i.puntuacion, i.texto, u.nombre as usuario_nombre
      FROM interacciones i
      LEFT JOIN usuarios u ON i.usuario_id = u.id
      WHERE i.destino_id = ${destino.id} AND i.tipo = 'resena'
      ORDER BY i.created_at DESC
      LIMIT 10
    `;

    const html = renderHtml(destino, detalles, fotos, reseñas, categoria);

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    // Cache: 5 min en edge, revalidar en background
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    return res.status(200).send(html);

  } catch (err) {
    console.error('[pagina-destino] Error:', err);
    return res.status(500).send(`<h1>Error interno</h1><p>${process.env.NODE_ENV === 'development' ? err.message : 'Por favor intenta más tarde.'}</p>`);
  }
}
