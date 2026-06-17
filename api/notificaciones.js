// api/notificaciones.js — Paso 13
// Envía emails al admin cuando:
//   - Llega una nueva reseña (llamado desde api/interacciones.js POST tipo=resena)
//   - Llega una nueva solicitud de publicación (llamado desde api/publicar-lugar.js)
// Usa fetch a la API de Resend (gratuita hasta 3000 emails/mes)
// Variable de entorno requerida: RESEND_API_KEY
// Variable de entorno opcional: ADMIN_EMAIL (default: admin@exploraco.co)

const { neon } = require('@neondatabase/serverless');

var RESEND_API = 'https://api.resend.com/emails';
var FROM_EMAIL = 'ExploraCO <noreply@exploraco.co>';
var ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@exploraco.co';

async function sendEmail(to, subject, html) {
  var apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('[notificaciones] RESEND_API_KEY no configurada — email no enviado');
    return { ok: false, reason: 'no_api_key' };
  }

  try {
    var resp = await fetch(RESEND_API, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': 'Bearer ' + apiKey,
      },
      body: JSON.stringify({ from: FROM_EMAIL, to: [to], subject, html }),
    });
    var data = await resp.json();
    if (!resp.ok) throw new Error(data.message || 'Resend error ' + resp.status);
    return { ok: true, id: data.id };
  } catch(err) {
    console.error('[notificaciones] Email error:', err.message);
    return { ok: false, error: err.message };
  }
}

// ── Templates de email ──────────────────────────────────────────
function templateResena(resena) {
  var estrellas = '★'.repeat(Math.round(resena.rating || 0))
                + '☆'.repeat(5 - Math.round(resena.rating || 0));
  return `<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8"><style>
  body{font-family:-apple-system,sans-serif;background:#f9f7f4;margin:0;padding:2rem}
  .card{background:#fff;border-radius:12px;padding:2rem;max-width:540px;margin:0 auto;box-shadow:0 2px 16px rgba(0,0,0,.08)}
  .badge{display:inline-block;background:#E8A020;color:#fff;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:700;margin-bottom:1rem}
  .stars{color:#f5a623;font-size:1.25rem}
  .texto{background:#f5f5f5;border-radius:8px;padding:1rem;font-size:14px;color:#444;line-height:1.6;margin:1rem 0}
  .btn{display:inline-block;background:#E8A020;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:700;margin-top:1rem}
  .muted{color:#888;font-size:12px}
</style></head><body>
<div class="card">
  <div class="badge">⭐ Nueva reseña</div>
  <h2 style="margin:0 0 .5rem;font-size:1.25rem">${resena.destino_nombre}</h2>
  <p style="color:#666;font-size:13px;margin:0 0 1rem">📍 ${resena.destino_ciudad || ''}</p>
  <div class="stars">${estrellas}</div>
  <div class="texto">"${resena.texto || '(Sin texto)'}"</div>
  <p class="muted">Por: ${resena.usuario_nombre || 'Visitante anónimo'}</p>
  <a href="https://exploraco.co/${resena.destino_slug}.html" class="btn">Ver la página →</a>
  <p class="muted" style="margin-top:1.5rem">Puedes eliminar esta reseña desde el <a href="https://exploraco.vercel.app/admin.html#reviews">panel admin</a>.</p>
</div>
</body></html>`;
}

function templateSolicitud(lugar) {
  return `<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8"><style>
  body{font-family:-apple-system,sans-serif;background:#f9f7f4;margin:0;padding:2rem}
  .card{background:#fff;border-radius:12px;padding:2rem;max-width:540px;margin:0 auto;box-shadow:0 2px 16px rgba(0,0,0,.08)}
  .badge{display:inline-block;background:#6366f1;color:#fff;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:700;margin-bottom:1rem}
  .field{margin:.5rem 0;font-size:13px;color:#444}
  .label{font-weight:700;color:#1a1a1a}
  .btn{display:inline-block;background:#E8A020;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:700;margin-top:1rem;margin-right:.5rem}
  .btn-outline{background:#fff;color:#1a1a1a;border:1.5px solid #ddd}
</style></head><body>
<div class="card">
  <div class="badge">🔔 Nueva solicitud de publicación</div>
  <h2 style="margin:0 0 1rem;font-size:1.25rem">${lugar.nombre}</h2>
  <div class="field"><span class="label">Categoría:</span> ${lugar.categoria}</div>
  <div class="field"><span class="label">Ciudad:</span> ${lugar.ciudad}</div>
  <div class="field"><span class="label">WhatsApp:</span> <a href="https://wa.me/${lugar.whatsapp}">${lugar.whatsapp}</a></div>
  <div class="field"><span class="label">Descripción:</span> ${lugar.descripcion_corta}</div>
  ${lugar.precio_desde ? `<div class="field"><span class="label">Precio desde:</span> ${lugar.precio_desde}</div>` : ''}
  <div style="margin-top:1.5rem">
    <a href="https://exploraco.vercel.app/admin.html" class="btn">Revisar en admin →</a>
  </div>
  <p style="color:#888;font-size:12px;margin-top:1.5rem">El lugar está en estado <strong>borrador</strong> hasta que lo apruebes desde el panel de Solicitudes.</p>
</div>
</body></html>`;
}

// ── Handler principal ───────────────────────────────────────────
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Internal-Secret');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Verificar secret interno para que solo nuestros endpoints llamen esto
  var secret = req.headers['x-internal-secret'] || '';
  if (secret !== (process.env.ADMIN_SECRET || 'exploraco12345')) {
    return res.status(401).json({ ok: false, error: 'No autorizado' });
  }

  var body = req.body || {};
  var tipo = body.tipo; // 'resena' | 'solicitud'

  if (tipo === 'resena') {
    var result = await sendEmail(
      ADMIN_EMAIL,
      '⭐ Nueva reseña en ExploraCO — ' + (body.destino_nombre || 'Lugar'),
      templateResena(body)
    );
    return res.status(200).json(result);
  }

  if (tipo === 'solicitud') {
    var result2 = await sendEmail(
      ADMIN_EMAIL,
      '🔔 Nueva solicitud de publicación — ' + (body.nombre || 'Sin nombre'),
      templateSolicitud(body)
    );
    return res.status(200).json(result2);
  }

  return res.status(400).json({ ok: false, error: 'tipo debe ser: resena | solicitud' });
};
