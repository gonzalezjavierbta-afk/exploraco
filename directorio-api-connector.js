/**
 * ExploraCO — Directorio API Connector
 * Reemplaza los arrays PL[], PHOTOS{} y FEAT[] hardcodeados
 * con datos reales desde /api/destinos
 *
 * Incluir en cada directorio-*.html ANTES del </body>:
 * <script src="directorio-api-connector.js"></script>
 *
 * El script detecta la categoría automáticamente según el slug del archivo.
 */

(function () {
  'use strict';

  var API_BASE = '';  // mismo dominio Netlify

  // Detectar categoría según la URL actual
  var path = window.location.pathname;
  var categoria = 'hostal';
  if (path.indexOf('comida') !== -1)  categoria = 'comida';
  if (path.indexOf('sitio') !== -1)   categoria = 'sitio';
  if (path.indexOf('evento') !== -1)  categoria = 'evento';

  // ── Convertir destino de API → formato del directorio ──────
  function apiToLocal(d, index) {
    return {
      id:       index + 1,              // ID numérico local para PHOTOS/FEAT
      _uuid:    d.id,                   // UUID real de Neon
      slug:     d.slug,
      name:     d.nombre,
      cat:      d.categoria_slug,
      city:     d.ciudad,
      region:   d.region || 'Colombia',
      lead:     d.lead || '',
      price:    d.precio_desde || '',
      emoji:    d.emoji || '📍',
      hero_bg:  d.hero_bg || 'linear-gradient(135deg,#111,#222)',
      rating:   parseFloat(d.rating) || 0,
      rev:      parseInt(d.total_resenas) || 0,
      destacado: d.destacado || false,
      lat:      parseFloat(d.lat) || 0,
      lng:      parseFloat(d.lng) || 0,
      whatsapp: d.whatsapp || '',
      web:      d.web || '',
      instagram: d.instagram || '',
      // Hostal-specific (si vienen en el response)
      checkin:  d.checkin || '',
      checkout: d.checkout || '',
    };
  }

  // ── Mostrar estado de carga ─────────────────────────────────
  function showLoading(msg) {
    var grid = document.getElementById('dir-grid');
    if (!grid) return;
    grid.style.display = 'block';
    grid.innerHTML = '<div style="'
      + 'grid-column:1/-1;text-align:center;padding:60px 20px;'
      + 'color:#888;font-size:14px;font-family:inherit'
      + '">'
      + '<div style="font-size:32px;margin-bottom:12px">⏳</div>'
      + '<div>' + msg + '</div>'
      + '</div>';
  }

  function showError(msg) {
    var grid = document.getElementById('dir-grid');
    if (!grid) return;
    grid.innerHTML = '<div style="'
      + 'grid-column:1/-1;text-align:center;padding:60px 20px;'
      + 'color:#ef4444;font-size:13px'
      + '">'
      + '<div style="font-size:28px;margin-bottom:10px">⚠️</div>'
      + '<div>' + msg + '</div>'
      + '<button onclick="location.reload()" style="'
      + 'margin-top:14px;padding:8px 18px;border:1px solid #e5e0d8;'
      + 'border-radius:20px;background:#fff;cursor:pointer;font-size:12px'
      + '">Reintentar</button>'
      + '</div>';
  }

  // ── Cargar datos desde la API ───────────────────────────────
  function cargarDesdeAPI() {
    // Solo ejecutar si estamos en Netlify (no en file://)
    if (window.location.protocol === 'file:') {
      console.log('[directorio-api] Modo local (file://) — usando datos hardcodeados');
      return;
    }

    showLoading('Cargando lugares desde la base de datos...');

    var url = API_BASE + '/api/destinos?categoria=' + categoria + '&limit=200';

    fetch(url)
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (data) {
        if (!data.ok || !data.data || !data.data.length) {
          throw new Error('Sin datos disponibles');
        }

        var destinos = data.data;
        console.log('[directorio-api] ' + destinos.length + ' lugares cargados desde DB');

        // Convertir al formato del directorio
        var newPL     = destinos.map(apiToLocal);
        var newPHOTOS = {};
        var newFEAT   = [];

        destinos.forEach(function (d, i) {
          var localId = i + 1;
          // PHOTOS: usar foto_hero si existe
          if (d.foto_hero) {
            newPHOTOS[localId] = d.foto_hero;
          } else if (d.photos && d.photos.length) {
            var ph = d.photos[0];
            newPHOTOS[localId] = typeof ph === 'string' ? ph : (ph.url || '');
          }
          // FEAT: los destacados van primero
          if (d.destacado) newFEAT.push(localId);
        });

        // Reemplazar los arrays globales
        window.PL     = newPL;
        window.PHOTOS = newPHOTOS;
        window.FEAT   = newFEAT.length ? newFEAT : [1, 2, 3];

        // Re-renderizar el directorio
        if (typeof window.renderDir === 'function') {
          window.renderDir();
        } else {
          // Si renderDir aún no está definido, esperar un momento
          setTimeout(function () {
            if (typeof window.renderDir === 'function') {
              window.renderDir();
            }
          }, 500);
        }

        // Actualizar contador en el header si existe
        var countEl = document.getElementById('dir-count');
        if (countEl) countEl.textContent = destinos.length;

        // Badge de estado
        var badge = document.getElementById('api-status-badge');
        if (badge) {
          badge.textContent = '🟢 ' + destinos.length + ' lugares en vivo';
          badge.style.color = '#16a34a';
        }
      })
      .catch(function (err) {
        console.warn('[directorio-api] Error cargando desde API:', err.message);
        // Fallback: usar PL hardcodeado si existe
        if (window.PL && window.PL.length) {
          console.log('[directorio-api] Usando datos locales como fallback (' + window.PL.length + ' lugares)');
          if (typeof window.renderDir === 'function') window.renderDir();
        } else {
          showError('No se pudieron cargar los lugares. ' + err.message);
        }
      });
  }

  // ── Esperar a que el DOM esté listo ─────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      setTimeout(cargarDesdeAPI, 100);
    });
  } else {
    setTimeout(cargarDesdeAPI, 100);
  }

})();
