/**
 * ExploraCO — Página Individual Connector (Paso 10)
 * Conecta páginas de hostal/lugar con datos dinámicos de Neon:
 *   - Rating en vivo (actualizado tras cada reseña)
 *   - Botón Guardar conectado a DB (+5 XP)
 *   - Reseñas cargadas desde DB
 *   - subRv() parchado para guardar en DB (+25 XP)
 *
 * Ya incluido en las 92 páginas como resenas-connector.js
 * Este archivo REEMPLAZA resenas-connector.js con funcionalidad completa
 *
 * Incluir antes de </body>:
 * <script src="usuario-session.js"></script>
 * <script src="pagina-connector.js"></script>
 */

(function () {
  'use strict';

  if (window.location.protocol === 'file:') return;

  var API  = '';
  var slug = window.location.pathname.split('/').pop().replace('.html', '');
  var DESTINO_UUID = null;

  // ── 1. Obtener UUID del destino por slug ──────────────────
  async function obtenerDestino() {
    try {
      var res  = await fetch(API + '/api/destinos?limit=200');
      var data = await res.json();
      if (!data.ok) return null;
      return data.data.find(function (d) { return d.slug === slug; }) || null;
    } catch (e) { return null; }
  }

  // ── 2. Actualizar rating en vivo en la página ─────────────
  function actualizarRating(destino) {
    if (!destino || !destino.rating) return;

    var rating    = parseFloat(destino.rating);
    var numResenas = parseInt(destino.total_resenas) || 0;

    // Número grande del score
    var soNum = document.querySelector('.so-number');
    if (soNum) soNum.textContent = rating.toFixed(1);

    // Estrellas
    var soStars = document.querySelector('.so-stars');
    if (soStars) {
      var filled = Math.round(rating / 2);  // 0-10 → 0-5 estrellas
      soStars.textContent = '★'.repeat(filled) + '☆'.repeat(5 - filled);
    }

    // Contador de reseñas
    var soLabel = document.querySelector('.so-label');
    if (soLabel && numResenas > 0) {
      var texto = soLabel.textContent;
      soLabel.textContent = texto.replace(/\d+ reseñas?/i, numResenas + ' reseñas');
    }

    // stnum (número de sección)
    var stnum = document.querySelector('#puntuacion .stnum');
    if (stnum) stnum.textContent = numResenas;

    // Título de reseñas
    var rvStnum = document.querySelector('#resenas .stnum');
    if (rvStnum) rvStnum.textContent = numResenas;

    console.log('[pagina] Rating actualizado:', rating, '(' + numResenas + ' reseñas)');
  }

  // ── 3. Cargar reseñas desde DB ────────────────────────────
  async function cargarResenas() {
    if (!DESTINO_UUID) return;
    try {
      var res  = await fetch(API + '/api/interacciones?tipo=resenas&destino_id=' + DESTINO_UUID + '&limit=20');
      var data = await res.json();
      if (!data.ok || !data.data.length) return;

      var rvList = document.getElementById('rvlist');
      if (!rvList) return;

      // Limpiar reseñas del localStorage
      rvList.innerHTML = '';

      data.data.forEach(function (rv) {
        var fecha  = new Date(rv.creado_en).toLocaleDateString('es-CO', {
          year: 'numeric', month: 'short', day: 'numeric'
        });
        var rating  = Math.round(rv.rating || 0);
        var stH     = [1,2,3,4,5].map(function (x) {
          return '<span class="rvst' + (x <= rating ? ' on' : '') + '">★</span>';
        }).join('');
        var nombre  = rv.usuario_nombre || 'Viajero';
        var initials = nombre.split(' ').map(function(w){return w[0]||'';}).join('').toUpperCase().slice(0,2);
        var badge   = rv.usuario_badge || '';

        var div = document.createElement('div');
        div.className = 'rvitem';
        div.innerHTML = [
          '<div class="rvhead">',
          '  <div class="rvav" style="background:#1a3a5c;color:#7eb8f0">' + initials + '</div>',
          '  <div>',
          '    <div class="rvname">' + nombre + '</div>',
          '    <div class="rvdate" style="font-size:10px;color:#aaa">' + (badge ? badge + ' · ' : '') + fecha + '</div>',
          '  </div>',
          '  <div class="rvstars">' + stH + '</div>',
          '</div>',
          rv.texto ? '<div class="rvtxt">' + rv.texto + '</div>' : '',
        ].join('');
        rvList.appendChild(div);
      });

      console.log('[pagina] ' + data.data.length + ' reseñas cargadas desde DB');

    } catch (err) {
      console.warn('[pagina] Error cargando reseñas:', err.message);
    }
  }

  // ── 4. Parchear subRv para guardar en DB ──────────────────
  function patchSubRv() {
    var _orig = window.subRv;
    if (typeof _orig !== 'function') return;

    window.subRv = async function () {
      // Ejecutar original (guarda en localStorage, muestra en UI)
      _orig.apply(this, arguments);

      var nombre  = (document.getElementById('wrn') || {}).value || '';
      var texto   = (document.getElementById('wrt') || {}).value || '';
      var rating  = window.ps || 0;

      if (!rating || !DESTINO_UUID) return;

      // Obtener o crear sesión de usuario
      var usuario = window.ExploraCO && window.ExploraCO.usuario;
      if (!usuario && nombre.trim()) {
        if (window.ExploraCO && window.ExploraCO.loginConEmail) {
          var emailAuto = nombre.trim().toLowerCase()
            .replace(/\s+/g, '.').replace(/[^a-z0-9.]/g, '') + '@explorador.co';
          usuario = await window.ExploraCO.loginConEmail(emailAuto, nombre.trim());
        }
      }
      if (!usuario) return;

      try {
        var res  = await fetch(API + '/api/interacciones', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tipo:       'resena',
            usuario_id: usuario.id,
            destino_id: DESTINO_UUID,
            rating:     rating,
            texto:      texto,
          }),
        });
        var data = await res.json();

        if (data.ok) {
          var xp = data.xp_ganado || 0;
          mostrarXpToast(xp > 0 ? '⭐ Reseña guardada · +' + xp + ' XP' : '⭐ Reseña guardada', '#16a34a');

          // Actualizar XP local
          if (window.ExploraCO && window.ExploraCO.usuario) {
            window.ExploraCO.usuario.xp_total = (window.ExploraCO.usuario.xp_total || 0) + xp;
          }

          // Recargar reseñas y rating después de 1s
          setTimeout(function () {
            cargarResenas();
            obtenerDestino().then(function (d) { if (d) actualizarRating(d); });
          }, 1000);
        }
      } catch (err) {
        console.warn('[pagina] subRv DB error:', err.message);
      }
    };
    console.log('[pagina] subRv → DB activado');
  }

  // ── 5. Parchear toggleSave para guardar en DB ─────────────
  function patchToggleSave() {
    var _orig = window.toggleSave;
    if (typeof _orig !== 'function') return;

    window.toggleSave = async function () {
      // Ejecutar original (localStorage)
      _orig.apply(this, arguments);

      if (!DESTINO_UUID) return;

      var usuario = window.ExploraCO && window.ExploraCO.usuario;
      if (!usuario) {
        if (window.ExploraCO && window.ExploraCO.mostrarLogin) {
          setTimeout(function () {
            window.ExploraCO.mostrarLogin('Inicia sesión para guardar este lugar permanentemente en Tu Mapa');
          }, 400);
        }
        return;
      }

      // Verificar si se está guardando o quitando
      var mmSaved = window.mmSaved || [];
      var saving  = mmSaved.indexOf(window.PLACE_ID) !== -1;

      try {
        var res = await fetch(API + '/api/interacciones', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tipo:       saving ? 'guardado' : 'quitar_guardado',
            usuario_id: usuario.id,
            destino_id: DESTINO_UUID,
          }),
        });
        var data = await res.json();

        if (data.ok && saving && data.xp_ganado > 0) {
          mostrarXpToast('♥ Guardado permanentemente · +' + data.xp_ganado + ' XP', '#E8A020');
          if (window.ExploraCO && window.ExploraCO.usuario) {
            window.ExploraCO.usuario.xp_total = (window.ExploraCO.usuario.xp_total || 0) + data.xp_ganado;
          }
        }
      } catch (err) {
        console.warn('[pagina] toggleSave DB error:', err.message);
      }
    };
    console.log('[pagina] toggleSave → DB activado');
  }

  // ── 6. Toast de XP ────────────────────────────────────────
  function mostrarXpToast(msg, color) {
    var t = document.getElementById('xp-toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'xp-toast';
      t.style.cssText = [
        'position:fixed;bottom:24px;right:24px;',
        'padding:10px 18px;border-radius:8px;color:#fff;',
        'font-size:13px;font-weight:600;font-family:inherit;',
        'z-index:9999;transition:all .3s;',
        'transform:translateY(60px);opacity:0;',
      ].join('');
      document.body.appendChild(t);
    }
    t.textContent  = msg;
    t.style.background = color || '#0d1117';
    t.style.transform  = 'translateY(0)';
    t.style.opacity    = '1';
    clearTimeout(t._timer);
    t._timer = setTimeout(function () {
      t.style.transform = 'translateY(60px)';
      t.style.opacity   = '0';
    }, 3000);
  }

  // ── 7. Inicializar todo ────────────────────────────────────
  async function init() {
    if (!slug || slug === 'index') return;
    console.log('[pagina] Inicializando:', slug);

    var destino = await obtenerDestino();
    if (!destino) {
      console.warn('[pagina] Destino no encontrado en DB:', slug);
      return;
    }

    DESTINO_UUID       = destino.id;
    window.DESTINO_UUID = destino.id;
    console.log('[pagina] UUID:', DESTINO_UUID);

    // Actualizar rating con datos frescos de DB
    actualizarRating(destino);

    // Cargar reseñas desde DB
    await cargarResenas();

    // Parchear funciones
    patchSubRv();
    patchToggleSave();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(init, 400); });
  } else {
    setTimeout(init, 400);
  }

})();
