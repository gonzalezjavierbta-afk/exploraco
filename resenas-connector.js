/**
 * ExploraCO — Reseñas Connector
 * Conecta el formulario subRv() de páginas individuales con Neon DB
 * Incluir en cada página de hostal/lugar ANTES del </body>:
 * <script src="../resenas-connector.js"></script>
 * o en la misma carpeta:
 * <script src="resenas-connector.js"></script>
 */

(function () {
  'use strict';

  if (window.location.protocol === 'file:') return;

  var API = '';

  // ── Cargar reseñas reales desde DB ────────────────────────
  async function cargarResenasDB(destinoUUID) {
    if (!destinoUUID) return;
    try {
      var res  = await fetch(API + '/api/interacciones?tipo=resenas&destino_id=' + destinoUUID + '&limit=20');
      var data = await res.json();
      if (!data.ok || !data.data.length) return;

      var rvList = document.getElementById('rvlist');
      if (!rvList) return;

      // Limpiar reseñas del localStorage y mostrar las de DB
      rvList.innerHTML = '';
      data.data.forEach(function (rv) {
        var fecha = new Date(rv.creado_en).toLocaleDateString('es-CO', {
          year: 'numeric', month: 'short', day: 'numeric',
        });
        var stars = '★'.repeat(Math.round(rv.rating)) + '☆'.repeat(5 - Math.round(rv.rating));
        var div = document.createElement('div');
        div.className = 'rv-item';
        div.innerHTML = [
          '<div class="rv-header">',
          '  <div class="rv-avatar" style="background:#E8A020;width:36px;height:36px;border-radius:50%;',
          '    display:flex;align-items:center;justify-content:center;color:#000;font-weight:700;font-size:14px;flex-shrink:0">',
          '    ' + (rv.usuario_nombre || 'V')[0].toUpperCase(),
          '  </div>',
          '  <div>',
          '    <div class="rv-name" style="font-weight:700;font-size:13px">' + (rv.usuario_nombre || 'Viajero') + '</div>',
          '    <div style="font-size:10px;color:#aaa">' + (rv.usuario_badge || 'Viajero Novato') + ' · ' + fecha + '</div>',
          '  </div>',
          '  <div class="rv-stars" style="margin-left:auto;color:#E8A020;font-size:14px">' + stars + '</div>',
          '</div>',
          rv.texto ? '<div class="rv-text" style="font-size:13px;color:#555;line-height:1.6;margin-top:8px">' + rv.texto + '</div>' : '',
        ].join('');
        rvList.appendChild(div);
      });

      // Actualizar contador
      var rvCount = document.getElementById('rv-count');
      if (rvCount) rvCount.textContent = data.data.length;

    } catch (err) {
      console.warn('[resenas] cargar error:', err.message);
    }
  }

  // ── Obtener UUID del destino por slug ──────────────────────
  async function obtenerDestinoUUID(slug) {
    // Intentar desde la API buscando por slug
    try {
      var res  = await fetch(API + '/api/destinos?limit=200');
      var data = await res.json();
      if (!data.ok) return null;
      var destino = data.data.find(function (d) { return d.slug === slug; });
      return destino ? destino.id : null;
    } catch (err) {
      return null;
    }
  }

  // ── Parchear subRv para guardar en DB ─────────────────────
  function patchSubRv(destinoUUID) {
    var _subRv = window.subRv;
    if (typeof _subRv !== 'function') return;

    window.subRv = async function () {
      // Ejecutar la función original (guarda en localStorage, muestra en UI)
      _subRv.apply(this, arguments);

      // Además guardar en DB
      var nombre  = (document.getElementById('wrn') || {}).value || '';
      var texto   = (document.getElementById('wrt') || {}).value || '';
      var rating  = window.ps || 0;  // ps = puntuación seleccionada en el hostal

      if (!rating || !destinoUUID) return;

      // Usar sesión si existe, o crear usuario temporal con el nombre
      var usuario = window.ExploraCO && window.ExploraCO.usuario;

      if (!usuario && nombre.trim()) {
        // Crear usuario temporal con el nombre ingresado
        if (window.ExploraCO && window.ExploraCO.loginConEmail) {
          var emailTemp = nombre.trim().toLowerCase()
            .replace(/\s+/g, '.').replace(/[^a-z0-9.]/g, '') + '@explorador.co';
          usuario = await window.ExploraCO.loginConEmail(emailTemp, nombre.trim());
        }
      }

      if (!usuario) return;

      try {
        var res = await fetch(API + '/api/interacciones', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tipo:       'resena',
            usuario_id: usuario.id,
            destino_id: destinoUUID,
            rating:     rating,
            texto:      texto,
          }),
        });
        var data = await res.json();
        if (data.ok && data.xp_ganado > 0) {
          // Mostrar XP ganado
          var xpBadge = document.createElement('div');
          xpBadge.style.cssText = [
            'position:fixed;bottom:24px;right:24px;',
            'background:#16a34a;color:#fff;',
            'padding:10px 18px;border-radius:8px;',
            'font-weight:700;font-size:13px;z-index:9999;',
          ].join('');
          xpBadge.textContent = '⭐ Reseña guardada · +' + data.xp_ganado + ' XP';
          document.body.appendChild(xpBadge);
          setTimeout(function () { xpBadge.remove(); }, 3000);

          // Actualizar XP en sesión local
          if (window.ExploraCO && window.ExploraCO.usuario) {
            window.ExploraCO.usuario.xp_total = (window.ExploraCO.usuario.xp_total || 0) + data.xp_ganado;
          }
        }
      } catch (err) {
        console.warn('[resenas] guardar error:', err.message);
      }
    };
    console.log('[resenas] subRv patched — reseñas van a DB');
  }

  // ── Inicializar ────────────────────────────────────────────
  async function init() {
    // Detectar el slug de esta página
    var path = window.location.pathname;
    var slug = path.split('/').pop().replace('.html', '');
    if (!slug || slug === 'index') return;

    console.log('[resenas] Inicializando para:', slug);

    // Obtener UUID del destino
    var uuid = await obtenerDestinoUUID(slug);
    if (!uuid) {
      console.warn('[resenas] No se encontró UUID para:', slug);
      return;
    }

    console.log('[resenas] UUID encontrado:', uuid);

    // Cargar reseñas desde DB (reemplaza las del localStorage)
    await cargarResenasDB(uuid);

    // Parchear subRv para guardar en DB
    patchSubRv(uuid);

    // Exponer UUID para que otros scripts puedan usarlo
    window.DESTINO_UUID = uuid;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      setTimeout(init, 300);
    });
  } else {
    setTimeout(init, 300);
  }

})();
