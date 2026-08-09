/**
 * ExploraCO — Sistema de Sesión de Viajeros
 * Identificación simple por email — sin contraseña
 * Incluir en index.html y en cada página de hostal ANTES del </body>
 *
 * <script src="usuario-session.js"></script>
 */

(function () {
  'use strict';

  var API = '';
  var SESSION_KEY = 'exploraco_user';

  // ── Estado global del usuario ─────────────────────────────
  window.ExploraCO = window.ExploraCO || {};
  window.ExploraCO.usuario = null;

  // ── Leer sesión del localStorage ──────────────────────────
  function cargarSesion() {
    try {
      var raw = localStorage.getItem(SESSION_KEY);
      if (raw) {
        window.ExploraCO.usuario = JSON.parse(raw);
        return true;
      }
    } catch (e) {}
    return false;
  }

  // ── Guardar sesión ─────────────────────────────────────────
  function guardarSesion(usuario) {
    window.ExploraCO.usuario = usuario;
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(usuario));
    } catch (e) {}
  }

  // ── Cerrar sesión ──────────────────────────────────────────
  window.ExploraCO.cerrarSesion = function () {
    window.ExploraCO.usuario = null;
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem('mm_saved');
    actualizarUI();
    mostrarToast('Sesión cerrada', '#888');
  };

  // ── Registrar / Login por email ────────────────────────────
  window.ExploraCO.loginConEmail = async function (email, nombre) {
    if (!email || !email.includes('@')) {
      mostrarToast('Email inválido', '#ef4444');
      return null;
    }

    try {
      var res = await fetch(API + '/api/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auth_id:       'email:' + email.toLowerCase().trim(),
          email:          email.toLowerCase().trim(),
          nombre:         nombre || email.split('@')[0],
          auth_provider: 'email',
        }),
      });
      var data = await res.json();
      if (data.ok) {
        guardarSesion(data.data);
        actualizarUI();
        mostrarToast('¡Bienvenido, ' + data.data.nombre + '! +XP por explorar', '#16a34a');
        // Sincronizar guardados locales con DB
        sincronizarGuardados();
        return data.data;
      }
    } catch (err) {
      console.warn('[session] Login error:', err.message);
      mostrarToast('Error de conexión', '#ef4444');
    }
    return null;
  };

  // ── Sincronizar guardados del localStorage → DB ────────────
  async function sincronizarGuardados() {
    var usuario = window.ExploraCO.usuario;
    if (!usuario) return;

    // mmSaved viene del index.html
    var localSaved = [];
    try {
      localSaved = JSON.parse(localStorage.getItem('mm_saved') || '[]');
    } catch (e) {}

    if (!localSaved.length) return;

    // Cargar los destinos para mapear IDs locales → UUIDs
    try {
      var res = await fetch(API + '/api/destinos?limit=200');
      var data = await res.json();
      if (!data.ok) return;

      // Mapa de posición Y de id local → UUID
      var uuidMap = {};
      data.data.forEach(function (d, i) {
        uuidMap[i + 1] = d.id;        // posición 1-based → UUID
        if (d.id_local) uuidMap[d.id_local] = d.id;  // id local si existe
      });

      // Guardar cada uno en DB
      var synced = 0;
      for (var i = 0; i < localSaved.length; i++) {
        var localId = localSaved[i];
        var uuid = uuidMap[localId];
        if (!uuid || typeof uuid !== 'string' || uuid.length < 10) continue;
        if (!usuario.id || usuario.id.length < 10) continue;
        try {
          var syncRes = await fetch(API + '/api/interacciones', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              tipo:       'guardado',
              usuario_id: usuario.id,
              destino_id: uuid,
            }),
          });
          if (syncRes.ok) synced++;
        } catch (e) {
          console.warn('[session] sync error for id', localId, e.message);
        }
      }
      if (synced > 0) mostrarToast('✓ ' + synced + ' lugares sincronizados con tu cuenta', '#16a34a');
    } catch (err) {
      console.warn('[session] Sync error:', err.message);
    }
  }

  // ── Cargar Mi Mapa desde DB ────────────────────────────────
  window.ExploraCO.cargarMiMapa = async function () {
    var usuario = window.ExploraCO.usuario;
    if (!usuario) return [];

    try {
      var res = await fetch(API + '/api/interacciones?tipo=mapa&usuario_id=' + usuario.id);
      var data = await res.json();
      if (data.ok) return data.data;
    } catch (e) {}
    return [];
  };

  // ── Guardar destino en DB ──────────────────────────────────
  window.ExploraCO.guardarDestino = async function (destinoUUID) {
    var usuario = window.ExploraCO.usuario;
    if (!usuario) {
      mostrarModalLogin('Inicia sesión para guardar este lugar en Tu Mapa');
      return false;
    }

    try {
      var res = await fetch(API + '/api/interacciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo:       'guardado',
          usuario_id: usuario.id,
          destino_id: destinoUUID,
        }),
      });
      var data = await res.json();
      if (data.ok && data.xp_ganado > 0) {
        mostrarToast('♥ Guardado · +' + data.xp_ganado + ' XP', '#E8A020');
        // Actualizar perfil local con nuevo XP
        if (window.ExploraCO.usuario) {
          window.ExploraCO.usuario.xp_total = (window.ExploraCO.usuario.xp_total || 0) + data.xp_ganado;
          guardarSesion(window.ExploraCO.usuario);
          actualizarUI();
        }
      }
      return data.ok;
    } catch (err) {
      console.warn('[session] guardarDestino error:', err.message);
      return false;
    }
  };

  // ── Publicar reseña en DB ──────────────────────────────────
  window.ExploraCO.publicarResena = async function (destinoUUID, rating, texto, nombre) {
    var usuario = window.ExploraCO.usuario;

    // Si no hay sesión, crear una temporal con el nombre
    if (!usuario && nombre) {
      usuario = await window.ExploraCO.loginConEmail(
        nombre.replace(/\s+/g, '.').toLowerCase() + '@explorador.co',
        nombre
      );
    }

    if (!usuario) {
      mostrarModalLogin('Inicia sesión para publicar tu reseña');
      return false;
    }

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
      if (data.ok) {
        mostrarToast('⭐ Reseña publicada · +' + (data.xp_ganado || 0) + ' XP', '#16a34a');
        if (window.ExploraCO.usuario) {
          window.ExploraCO.usuario.xp_total = (window.ExploraCO.usuario.xp_total || 0) + (data.xp_ganado || 0);
          guardarSesion(window.ExploraCO.usuario);
          actualizarUI();
        }
      } else {
        // Antes un rechazo del backend (ej. reseña duplicada, ver
        // api/interacciones.js v3) quedaba en silencio para el usuario.
        mostrarToast(data.error || 'No se pudo publicar tu reseña', '#ef4444');
      }
      return data.ok;
    } catch (err) {
      console.warn('[session] publicarResena error:', err.message);
      mostrarToast('Error de conexión', '#ef4444');
      return false;
    }
  };

  // ── Guardar / quitar destino en DB (toggle) ────────────────
  window.ExploraCO.toggleGuardado = async function (destinoUUID, btnEl) {
    var usuario = window.ExploraCO.usuario;
    if (!usuario) {
      mostrarModalLogin('Inicia sesión para guardar este lugar en Tu Mapa');
      return false;
    }

    var estabaGuardado = !!(btnEl && btnEl.classList.contains('activo'));
    var tipoAccion = estabaGuardado ? 'quitar_guardado' : 'guardado';
    if (btnEl) btnEl.disabled = true;

    try {
      var res = await fetch(API + '/api/interacciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo:       tipoAccion,
          usuario_id: usuario.id,
          destino_id: destinoUUID,
        }),
      });
      var data = await res.json();
      if (!data.ok) {
        mostrarToast(data.error || 'No se pudo actualizar', '#ef4444');
        return false;
      }

      var ahoraGuardado = !estabaGuardado;
      if (btnEl) btnEl.classList.toggle('activo', ahoraGuardado);

      if (ahoraGuardado) {
        if (data.xp > 0) {
          mostrarToast('♥ Guardado · +' + data.xp + ' XP', '#E8A020');
          window.ExploraCO.usuario.xp_total = (parseInt(window.ExploraCO.usuario.xp_total) || 0) + data.xp;
          guardarSesion(window.ExploraCO.usuario);
          actualizarUI();
        } else {
          mostrarToast('♥ Guardado de nuevo en Tu Mapa', '#E8A020');
        }
      } else {
        mostrarToast('Quitado de Tu Mapa', '#888');
      }
      return true;
    } catch (err) {
      console.warn('[session] toggleGuardado error:', err.message);
      mostrarToast('Error de conexión', '#ef4444');
      return false;
    } finally {
      if (btnEl) btnEl.disabled = false;
    }
  };

  // ── Consultar si el usuario actual ya guardo este destino ──
  window.ExploraCO.estaGuardado = async function (destinoUUID) {
    var usuario = window.ExploraCO.usuario;
    if (!usuario) return false;
    try {
      var res = await fetch(
        API + '/api/interacciones?tipo=is_guardado&destino_id=' + encodeURIComponent(destinoUUID)
        + '&usuario_id=' + encodeURIComponent(usuario.id)
      );
      var data = await res.json();
      return !!(data.ok && data.guardado);
    } catch (e) {
      return false;
    }
  };

  // ── Marcar destino como visitado (accion deliberada del usuario, ──
  // ── no el contador automatico de vistas de pagina) ─────────────
  window.ExploraCO.marcarVisitado = async function (destinoUUID) {
    var usuario = window.ExploraCO.usuario;
    if (!usuario) {
      mostrarModalLogin('Inicia sesión para marcar que estuviste aquí');
      return false;
    }
    try {
      var res = await fetch(API + '/api/interacciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo:       'visita',
          usuario_id: usuario.id,
          destino_id: destinoUUID,
        }),
      });
      var data = await res.json();
      if (!data.ok) {
        mostrarToast(data.error || 'No se pudo registrar la visita', '#ef4444');
        return false;
      }
      if (data.xp > 0) {
        mostrarToast('✓ Visita registrada · +' + data.xp + ' XP', '#16a34a');
        window.ExploraCO.usuario.xp_total = (parseInt(window.ExploraCO.usuario.xp_total) || 0) + data.xp;
        guardarSesion(window.ExploraCO.usuario);
        actualizarUI();
      } else if (data.ya_visitado) {
        mostrarToast('Ya habías marcado que estuviste aquí', '#888');
      }
      return true;
    } catch (err) {
      console.warn('[session] marcarVisitado error:', err.message);
      mostrarToast('Error de conexión', '#ef4444');
      return false;
    }
  };

  // ── Quitar destino guardado en DB (sin necesitar un boton con estado,
  // a diferencia de toggleGuardado) ──────────────────────────────
  window.ExploraCO.quitarGuardado = async function (destinoUUID) {
    var usuario = window.ExploraCO.usuario;
    if (!usuario) return false;
    try {
      var res = await fetch(API + '/api/interacciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo:       'quitar_guardado',
          usuario_id: usuario.id,
          destino_id: destinoUUID,
        }),
      });
      var data = await res.json();
      if (data.ok) mostrarToast('Quitado de Tu Mapa', '#888');
      return !!data.ok;
    } catch (err) {
      console.warn('[session] quitarGuardado error:', err.message);
      return false;
    }
  };

  // ── Modal de login ─────────────────────────────────────────
  function mostrarModalLogin(mensaje) {
    var modal = document.getElementById('login-modal');
    if (!modal) {
      // Crear modal si no existe
      modal = document.createElement('div');
      modal.id = 'login-modal';
      modal.style.cssText = [
        'position:fixed;inset:0;background:rgba(0,0,0,.6);',
        'z-index:9999;display:flex;align-items:center;justify-content:center;',
        'font-family:inherit',
      ].join('');
      modal.innerHTML = [
        '<div style="background:#fff;border-radius:12px;padding:28px;width:min(380px,90vw);box-shadow:0 20px 60px rgba(0,0,0,.3)">',
        '  <div style="font-size:28px;margin-bottom:8px">🗺️</div>',
        '  <div style="font-weight:700;font-size:18px;margin-bottom:6px">Guarda tus lugares</div>',
        '  <div id="login-msg" style="font-size:13px;color:#888;margin-bottom:18px">Crea tu perfil de viajero gratis</div>',
        '  <input id="login-nombre" placeholder="Tu nombre" style="',
        '    width:100%;padding:10px 12px;border:1px solid #e5e0d8;border-radius:6px;',
        '    font-size:13px;font-family:inherit;box-sizing:border-box;margin-bottom:8px">',
        '  <input id="login-email" type="email" placeholder="Tu email" style="',
        '    width:100%;padding:10px 12px;border:1px solid #e5e0d8;border-radius:6px;',
        '    font-size:13px;font-family:inherit;box-sizing:border-box;margin-bottom:16px">',
        '  <button id="login-submit" style="',
        '    width:100%;padding:11px;background:#E8A020;color:#000;border:none;',
        '    border-radius:6px;font-weight:700;font-size:14px;cursor:pointer;font-family:inherit',
        '  ">Continuar →</button>',
        '  <div style="text-align:center;margin-top:12px">',
        '    <button onclick="document.getElementById(\'login-modal\').remove()" style="',
        '      background:none;border:none;color:#aaa;font-size:12px;cursor:pointer',
        '    ">Cancelar</button>',
        '  </div>',
        '</div>',
      ].join('');
      document.body.appendChild(modal);

      document.getElementById('login-submit').onclick = async function () {
        var email  = document.getElementById('login-email').value.trim();
        var nombre = document.getElementById('login-nombre').value.trim();
        if (!email) { mostrarToast('Escribe tu email', '#ef4444'); return; }
        this.textContent = 'Cargando...';
        var user = await window.ExploraCO.loginConEmail(email, nombre);
        if (user) modal.remove();
        else this.textContent = 'Continuar →';
      };

      // Enter key
      modal.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') document.getElementById('login-submit').click();
      });
    }

    // Actualizar mensaje
    var msgEl = document.getElementById('login-msg');
    if (msgEl && mensaje) msgEl.textContent = mensaje;

    modal.style.display = 'flex';
    setTimeout(function () {
      var emailInput = document.getElementById('login-email');
      if (emailInput) emailInput.focus();
    }, 100);
  }

  window.ExploraCO.mostrarLogin = mostrarModalLogin;

  // ── Toast de notificación ──────────────────────────────────
  function mostrarToast(msg, color) {
    // Reusar el toast del admin si existe, o crear uno nuevo
    var toast = document.getElementById('exploracо-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'exploracо-toast';
      toast.style.cssText = [
        'position:fixed;bottom:24px;right:24px;',
        'padding:10px 18px;border-radius:8px;color:#fff;',
        'font-size:13px;font-weight:600;font-family:inherit;',
        'z-index:9998;transform:translateY(60px);opacity:0;',
        'transition:all .3s;pointer-events:none;',
      ].join('');
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.style.background = color || '#0d1117';
    toast.style.transform = 'translateY(0)';
    toast.style.opacity = '1';
    setTimeout(function () {
      toast.style.transform = 'translateY(60px)';
      toast.style.opacity = '0';
    }, 3000);
  }

  window.ExploraCO.mostrarToast = mostrarToast;

  // ── Actualizar UI según estado de sesión ───────────────────
  function actualizarUI() {
    var usuario = window.ExploraCO.usuario;

    // Botón de login/perfil en el header
    var loginBtn = document.getElementById('btn-login-viajero');
    var perfilBtn = document.getElementById('btn-perfil-viajero');

    if (usuario) {
      if (loginBtn) loginBtn.style.display = 'none';
      if (perfilBtn) {
        perfilBtn.style.display = 'flex';
        var nameEl = document.getElementById('perfil-nombre');
        var xpEl   = document.getElementById('perfil-xp');
        var badge  = document.getElementById('perfil-badge');
        if (nameEl) nameEl.textContent = usuario.nombre;
        if (xpEl)   xpEl.textContent   = (parseInt(usuario.xp_total) || 0) + ' XP';
        if (badge)  badge.textContent   = usuario.badge_actual || 'Viajero Novato';
      }
    } else {
      if (loginBtn) loginBtn.style.display = '';
      if (perfilBtn) perfilBtn.style.display = 'none';
    }

    // Actualizar botones de guardar que tengan data-uuid
    document.querySelectorAll('[data-save-uuid]').forEach(function (btn) {
      // Los botones se actualizan individualmente cuando se interactúa
    });

    // Hook para paginas con su propio widget de nivel/insignias (ej.
    // index.html, ver updatePointsUI + window.onExploraCOUpdate ahi).
    // Se usa un hook global en vez de un evento porque este script se
    // carga al final del body: sin el hook, la pagina que lo incluye
    // no tendria forma de saber cuando termino de cargar la sesion.
    if (typeof window.onExploraCOUpdate === 'function') {
      try { window.onExploraCOUpdate(); } catch (e) {}
    }
  }

  // ── Inicializar ────────────────────────────────────────────
  function init() {
    // Solo en Vercel/servidor — no en file://
    if (window.location.protocol === 'file:') return;

    cargarSesion();
    actualizarUI();

    // Exponer función de login al hacer clic en botones con class login-trigger
    document.querySelectorAll('.login-trigger').forEach(function (el) {
      el.addEventListener('click', function () {
        mostrarModalLogin();
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
