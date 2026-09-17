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

  // ── Niveles XP (fuente de verdad, 20 niveles) ────────────
  // XP_LEVELS[i] = xp minimo para alcanzar el nivel (i+1).
  // Nivel 1 = 0 XP, Nivel 20 = 30000 XP.
  var XP_LEVELS = [
    0, 100, 250, 450, 700, 1000, 1400, 1900, 2500, 3200,
    4000, 5200, 6800, 8500, 10500, 13000, 16000, 19500, 24000, 30000
  ];
  var MAX_NIVEL = XP_LEVELS.length; // 20

  // ── Calcular nivel a partir de XP total ───────────────────
  function calcularNivel(xpTotal) {
    var xp = Number(xpTotal) || 0;
    if (xp < 0) xp = 0;
    for (var i = XP_LEVELS.length - 1; i >= 0; i--) {
      if (xp >= XP_LEVELS[i]) return i + 1;
    }
    return 1;
  }

  window.ExploraCO.calcularNivel = calcularNivel;
  window.ExploraCO.XP_LEVELS = XP_LEVELS;
  window.ExploraCO.MAX_NIVEL = MAX_NIVEL;

  // ---- Helpers canonicos de XP (ADR-035: numeric(12,2)) ----
  // Fuente unica del cliente. redondearXp se usa en la ACREDITACION
  // (nunca al leer) y fmtXp en TODA superficie que muestre XP, con 2
  // decimales fijos en formato es-CO.
  function redondearXp(n) {
    var v = Number(n);
    if (!isFinite(v)) v = 0;
    return Math.round((v + Number.EPSILON) * 100) / 100;
  }

  function fmtXp(n) {
    return redondearXp(n).toLocaleString('es-CO', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  window.ExploraCO.redondearXp = redondearXp;
  window.ExploraCO.fmtXp = fmtXp;

  // ── Mapa de capacidades por umbral de nivel ───────────────
  // Clave = nivel minimo, valor = nombre de la capacidad.
  // Una capacidad esta activa si nivelActual >= umbral.
  var CAPACIDADES_POR_NIVEL = {
    6:  'crear_planes',
    7:  'emojis_premium',
    10: 'sello_sala',
    11: 'organizar_actividad',
    14: 'fundar_pandilla',
    15: 'moderar_galerias',
    16: 'cromo_dorado',
    17: 'mariscal_parche',
    19: 'inmortal'
  };

  window.ExploraCO.CAPACIDADES_POR_NIVEL = CAPACIDADES_POR_NIVEL;

  // ---- Catalogo global de vocaciones (backend usuario-session) ----
  // Mismo catalogo que expone el backend para que los frontends lo
  // lean sin fetch. Acentos y emojis SOLO como escapes \uXXXX
  // (ADR-002: ASCII puro en este archivo).
  var VOCACIONES = [
    {
      id: 'musico',
      nombre: 'Musico',
      emoji: '\uD83C\uDFB5',
      nivel: 5,
      habilidades: ['Vitrina musical', 'Setlist destacado', 'Sello de interprete']
    },
    {
      id: 'cine',
      nombre: 'Cine',
      emoji: '\uD83C\uDFAC',
      nivel: 5,
      habilidades: ['Reel de cine', 'Cartelera propia', 'Sello de cineasta']
    },
    {
      id: 'artista_grafico',
      nombre: 'Artista Grafico',
      emoji: '\uD83C\uDFA8',
      nivel: 5,
      habilidades: ['Galeria de obra', 'Paleta de marca', 'Sello de autor']
    },
    {
      id: 'escritor',
      nombre: 'Escritor',
      emoji: '\u270D\uFE0F',
      nivel: 5,
      habilidades: ['Pluma de relatos', 'Bitacora de ruta', 'Sello de cronista']
    }
  ];

  window.ExploraCO.vocaciones = VOCACIONES;

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

  // --- Fingerprint de dispositivo (Entrega 016 - Gaming v5.0) ---
  // ID persistente por navegador. Se envia como device_hash en el
  // upsert de /api/usuarios; el backend lo acumula en device_hashes
  // (JSONB). No necesita ser un hash criptografico: basta un
  // identificador consistente construido con userAgent + id local.
  var DEVICE_KEY = 'exploraco_device_id';

  function obtenerDeviceId() {
    var id = null;
    try { id = localStorage.getItem(DEVICE_KEY); } catch (e) { id = null; }
    if (id) return id;
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
      id = window.crypto.randomUUID();
    } else {
      id = 'dev-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 12);
    }
    try { localStorage.setItem(DEVICE_KEY, id); } catch (e) { console.warn('exploraco: device id no persistido', e && e.name); }
    return id;
  }

  function obtenerDeviceHash() {
    var ua = (typeof navigator !== 'undefined' && navigator.userAgent)
      ? navigator.userAgent
      : 'unknown';
    return ua + '|' + obtenerDeviceId();
  }

  window.ExploraCO.obtenerDeviceId = obtenerDeviceId;
  window.ExploraCO.obtenerDeviceHash = obtenerDeviceHash;

  // ── Captura global de referidos (?ref=) ────────────────────
  // El backend (api/usuarios.js) acepta codigo_referido en el body del
  // alta y lo aplica SOLO en el INSERT real: el ON CONFLICT DO UPDATE
  // no toca referido_por, así un relogin con un código ajeno no
  // corrompe el árbol. Aquí se preservan 30 días el último ?ref= visto
  // para que el alta, aunque ocurra en otra navegación, lo propague.
  var REF_KEY = 'exploraco_ref';
  var REF_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 días

  // Devuelve el código vigente o null. Si el TTL venció, borra la
  // clave y lo trata como ausente.
  function obtenerRefPendiente() {
    var raw = null;
    try {
      raw = localStorage.getItem(REF_KEY);
    } catch (e) {
      console.warn('exploraco: ref no legible', e && e.name);
      return null;
    }
    if (!raw) return null;
    var ref = null;
    try {
      ref = JSON.parse(raw);
    } catch (e) {
      // Valor corrupto: se descarta para no bloquear futuras capturas.
      limpiarRefPendiente();
      return null;
    }
    if (!ref || !ref.codigo || !ref.exp || ref.exp <= Date.now()) {
      limpiarRefPendiente();
      return null;
    }
    return ref.codigo;
  }

  // Solo escribe cuando la URL trae un ?ref= nuevo (último clic manda).
  // Sin ?ref= en la URL, el ref vigente se conserva hasta su TTL.
  function capturarRefUrl() {
    try {
      var params = new URLSearchParams(window.location.search || '');
      var ref = (params.get('ref') || '').trim();
      if (!ref) return;
      localStorage.setItem(REF_KEY, JSON.stringify({
        codigo: ref,
        exp: Date.now() + REF_TTL_MS,
      }));
    } catch (e) {
      // URLSearchParams/localStorage no disponibles (p. ej. modo
      // privado): nunca romper init() por el referido.
      console.warn('exploraco: ref no capturado', e && e.name);
    }
  }

  function limpiarRefPendiente() {
    try { localStorage.removeItem(REF_KEY); } catch (e) {}
  }

  window.ExploraCO.obtenerRefPendiente = obtenerRefPendiente;
  window.ExploraCO.limpiarRefPendiente = limpiarRefPendiente;

  // --- Soporte JWT (Entrega 016 - Gaming v5.0) -----------------
  // usuarios.js v9 devuelve jwt y jwt_expira_en en el upsert.
  // Quedan guardados dentro de la misma sesion (exploraco_user) y
  // se exponen aqui para que las paginas autentiquen sus llamadas
  // con el header Authorization: Bearer.
  window.ExploraCO.obtenerJwt = function () {
    var u = window.ExploraCO.usuario;
    if (u && u.jwt) return u.jwt;
    try {
      var raw = localStorage.getItem(SESSION_KEY);
      if (raw) {
        var sesion = JSON.parse(raw);
        if (sesion && sesion.jwt) return sesion.jwt;
      }
    } catch (e) {}
    return null;
  };

  window.ExploraCO.authHeaders = function () {
    var jwt = window.ExploraCO.obtenerJwt();
    return jwt ? { Authorization: 'Bearer ' + jwt } : {};
  };

  // Refresh silencioso: re-upsert de la sesion para obtener un JWT
  // nuevo. Las paginas lo llaman al recibir 401 SESION_REQUERIDA.
  // Si el backend no responde ok, se limpia la sesion local.
  window.ExploraCO.refreshJwt = async function () {
    var u = window.ExploraCO.usuario;
    if (!u || !u.auth_id || !u.email) return null;
    try {
      var res = await fetch(API + '/api/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auth_id:       u.auth_id,
          email:         u.email,
          nombre:        u.nombre,
          auth_provider: u.auth_provider || 'email',
          device_hash:   obtenerDeviceHash(),
        }),
      });
      var data = await res.json();
      if (!data.ok || !data.data) return limpiarSesionParaJwt();
      var perfil = data.data;
      if (data.jwt && !perfil.jwt) perfil.jwt = data.jwt;
      if (data.jwt_expira_en && !perfil.jwt_expira_en) perfil.jwt_expira_en = data.jwt_expira_en;
      if (!perfil.jwt) return limpiarSesionParaJwt();
      guardarSesion(perfil);
      actualizarUI();
      return perfil.jwt;
    } catch (err) {
      console.warn('[session] refreshJwt error:', err.message);
      return limpiarSesionParaJwt();
    }
  };

  function limpiarSesionParaJwt() {
    window.ExploraCO.usuario = null;
    try { localStorage.removeItem(SESSION_KEY); } catch (e) {}
    actualizarUI();
    return null;
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
  // codigoRef (opcional): código de referido explícito. Si no llega se
  // usa el ?ref= pendiente guardado por capturarRefUrl(). Las llamadas
  // históricas loginConEmail(email, nombre) siguen funcionando igual.
  window.ExploraCO.loginConEmail = async function (email, nombre, codigoRef) {
    if (!email || !email.includes('@')) {
      mostrarToast('Email inválido', '#ef4444');
      return null;
    }

    // Preferencia: argumento explícito > ref pendiente en localStorage.
    // Sin ref, refAplicado queda vacío y la clave se omite del body.
    var refAplicado = codigoRef || obtenerRefPendiente() || '';

    try {
      var res = await fetch(API + '/api/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auth_id:       'email:' + email.toLowerCase().trim(),
          email:          email.toLowerCase().trim(),
          nombre:         nombre || email.split('@')[0],
          auth_provider: 'email',
          device_hash:    obtenerDeviceHash(),
          codigo_referido: refAplicado || undefined,
        }),
      });
      var data = await res.json();
      if (data.ok) {
        var perfil = data.data || {};
        // JWT puede venir en la raiz o dentro de data.data
        if (data.jwt && !perfil.jwt) perfil.jwt = data.jwt;
        if (data.jwt_expira_en && !perfil.jwt_expira_en) perfil.jwt_expira_en = data.jwt_expira_en;
        // Consumo del referido: el backend devuelve es_insert (columna
        // (xmax = 0) del RETURNING) y referido_por. Solo se limpia el
        // ref local si es un alta NUEVA y el código quedó realmente
        // aplicado; si esos campos no vienen (backend viejo) o es un
        // relogin, NO se limpia: se deja vencer el TTL para no perder
        // un referido válido.
        if (refAplicado && perfil.es_insert === true && perfil.referido_por) {
          limpiarRefPendiente();
        }
        guardarSesion(perfil);
        actualizarUI();
        mostrarToast('¡Bienvenido, ' + perfil.nombre + '! +XP por explorar', '#16a34a');
        // Sincronizar guardados locales con DB
        sincronizarGuardados();
        return perfil;
      }
    } catch (err) {
      console.warn('[session] Login error:', err.message);
      mostrarToast('Error de conexión', '#ef4444');
    }
    return null;
  };

  // ── Sincronizar guardados/visitas del localStorage → DB ────
  // Tras la migracion estructural de Mi Mapa, mm_saved/mm_visited
  // guardan SLUGS (no ids posicionales). Aqui se cargan los destinos
  // y se mapea slug → UUID real para persistir en Neon.
  async function sincronizarGuardados() {
    var usuario = window.ExploraCO.usuario;
    if (!usuario) return;

    // mmSaved/mmVisited vienen del index.html (arrays de slugs)
    var localSaved = [];
    try {
      localSaved = JSON.parse(localStorage.getItem('mm_saved') || '[]');
    } catch (e) {}

    if (!localSaved.length) return;

    try {
      var res = await fetch(API + '/api/destinos?limit=200');
      var data = await res.json();
      if (!data.ok) return;

      // slug → UUID real
      var uuidBySlug = {};
      data.data.forEach(function (d) { if (d.slug) uuidBySlug[d.slug] = d.id; });

      // Guardar cada slug de mmSaved en DB
      var synced = 0;
      for (var i = 0; i < localSaved.length; i++) {
        var uuid = uuidBySlug[localSaved[i]];
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
          console.warn('[session] sync error for slug', localSaved[i], e.message);
        }
      }

      // ADR-024: las visitas exigen presencia fisica (lat/lng) y ya no se
      // pueden migrar desde el cache local (mmVisited) sin coordenadas.
      // Solo se sincronizan guardados; las visitas se confirman en destino.

      if (synced > 0) mostrarToast('✓ ' + synced + ' lugares sincronizados con tu cuenta', '#16a34a');
    } catch (err) {
      console.warn('[session] Sync error:', err.message);
    }
  }

  // ── Cargar Mi Mapa desde DB ────────────────────────────────
  // El endpoint /api/interacciones?tipo=mapa responde
  //   data: { guardados: [ {slug, nombre, lat, lng, ...} ], visitados: [...] }
  // Tras el fix de la spec "mapas publicos/privados" (2026-09-05) el
  // endpoint devuelve objetos completos de destino (slug incluido),
  // no UUIDs; el frontend puede usar slug/lat/lng directamente.
  window.ExploraCO.cargarMiMapa = async function () {
    var usuario = window.ExploraCO.usuario;
    if (!usuario) return [];

    try {
      var res = await fetch(API + '/api/interacciones?tipo=mapa&usuario_id=' + usuario.id);
      var data = await res.json();
      if (data.ok && data.data) return data.data.guardados || [];
    } catch (e) {}
    return [];
  };

  // ── Cargar visitas confirmadas desde DB ─────────────────────
  window.ExploraCO.cargarVisitas = async function () {
    var usuario = window.ExploraCO.usuario;
    if (!usuario) return [];

    try {
      var res = await fetch(API + '/api/interacciones?tipo=mapa&usuario_id=' + usuario.id);
      var data = await res.json();
      if (data.ok && data.data) return data.data.visitados || [];
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
      if (data.ok && data.xp > 0) {
        // Antes decia data.xp_ganado, pero interacciones.js siempre
        // devuelve el campo como 'xp' -- este toast nunca disparaba con
        // el XP real (quedaba en silencio, ok seguia siendo true).
        mostrarToast('♥ Guardado · +' + fmtXp(data.xp) + ' XP', '#E8A020');
        // Actualizar perfil local con nuevo XP (accion + bonus de misiones)
        if (window.ExploraCO.usuario) {
          var misionesXp = sumaMisionesXp(data.misiones);
          var logrosXp = sumaLogrosXp(data.logros);
          aplicarDesbloqueos(data.misiones);
          window.ExploraCO.usuario.xp_total = redondearXp((Number(window.ExploraCO.usuario.xp_total) || 0) + data.xp + misionesXp + logrosXp);
          guardarSesion(window.ExploraCO.usuario);
          actualizarUI();
        }
        mostrarMisionesToast(data.misiones);
        mostrarLogrosToast(data.logros);
      }
      return data.ok;
    } catch (err) {
      console.warn('[session] guardarDestino error:', err.message);
      return false;
    }
  };

  // ── Publicar reseña en DB ──────────────────────────────────
  window.ExploraCO.publicarResena = async function (destinoUUID, rating, texto, nombre, dims, travellerType) {
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
          tipo:           'resena',
          usuario_id:     usuario.id,
          destino_id:     destinoUUID,
          rating:         rating,
          texto:          texto,
          dims:           dims || {},
          traveller_type: travellerType || null,
        }),
      });
      var data = await res.json();
      if (data.ok) {
        // Mismo bug de nombre de campo que guardarDestino: era
        // data.xp_ganado, interacciones.js devuelve 'xp'.
        mostrarToast('⭐ Reseña publicada · +' + fmtXp(data.xp || 0) + ' XP', '#16a34a');
        if (window.ExploraCO.usuario) {
          var misionesXp = sumaMisionesXp(data.misiones);
          var logrosXp = sumaLogrosXp(data.logros);
          aplicarDesbloqueos(data.misiones);
          window.ExploraCO.usuario.xp_total = redondearXp((Number(window.ExploraCO.usuario.xp_total) || 0) + (data.xp || 0) + misionesXp + logrosXp);
          guardarSesion(window.ExploraCO.usuario);
          actualizarUI();
        }
        mostrarMisionesToast(data.misiones);
        mostrarLogrosToast(data.logros);
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
          mostrarToast('♥ Guardado · +' + fmtXp(data.xp) + ' XP', '#E8A020');
          var misionesXp = sumaMisionesXp(data.misiones);
          var logrosXp = sumaLogrosXp(data.logros);
          aplicarDesbloqueos(data.misiones);
          window.ExploraCO.usuario.xp_total = redondearXp((Number(window.ExploraCO.usuario.xp_total) || 0) + data.xp + misionesXp + logrosXp);
          guardarSesion(window.ExploraCO.usuario);
          actualizarUI();
          mostrarMisionesToast(data.misiones);
          mostrarLogrosToast(data.logros);
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

  // ── Obtener la ubicacion actual del navegador (ADR-024) ────
  // Resuelve {lat, lng, accuracy, ts} o null si el usuario
  // deniega el permiso o el navegador no soporta geolocalizacion.
  function obtenerUbicacion() {
    return new Promise(function (resolve) {
      if (typeof navigator === 'undefined' || !navigator.geolocation) {
        mostrarToast('Tu navegador no soporta ubicación', '#ef4444');
        resolve(null);
        return;
      }
      // Mensajes por codigo de GeolocationPositionError:
      // 1 = permiso denegado por el sitio, 2 = posicion no disponible,
      // 3 = tiempo agotado.
      var msgGeo = {
        1: 'Bloqueaste la ubicaci\u00f3n para este sitio; act\u00edvala en el navegador',
        2: 'Tu ubicaci\u00f3n no est\u00e1 disponible en este momento. Intenta de nuevo.',
        3: 'No pudimos obtener tu ubicaci\u00f3n a tiempo, sal al aire libre e intenta de nuevo',
      };

      function intentar(opciones, esReintento) {
        navigator.geolocation.getCurrentPosition(function (pos) {
          resolve({
            lat:      pos.coords.latitude,
            lng:      pos.coords.longitude,
            accuracy: Math.round(pos.coords.accuracy),
            ts:       Date.now(),
          });
        }, function (err) {
          var code = err && err.code;
          // Codigos 2/3: el GPS no fijo dentro del timeout. Un unico
          // reintento de baja precision con cache reciente suele resolverlo.
          if (!esReintento && (code === 2 || code === 3)) {
            console.warn('[session] geolocation codigo ' + code + ', reintentando baja precision');
            intentar({ enableHighAccuracy: false, timeout: 12000, maximumAge: 60000 }, true);
            return;
          }
          mostrarToast(
            msgGeo[code] || 'No pudimos obtener tu ubicaci\u00f3n. Intenta de nuevo.',
            '#ef4444'
          );
          resolve(null);
        }, opciones);
      }

      intentar({ enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }, false);
    });
  }

  window.ExploraCO.obtenerUbicacion = obtenerUbicacion;

  // Solicita un nonce anti-replay (ADR-025) de un solo uso para el
  // checkin geolocalizado. Devuelve el string nonce o null si falla.
  async function solicitarNonceVisita(usuarioId) {
    try {
      var res = await fetch(
        API + '/api/interacciones?tipo=geo_nonce_solicitar&usuario_id='
          + encodeURIComponent(usuarioId),
        { headers: window.ExploraCO.authHeaders() }
      );
      var data = await res.json();
      if (!data.ok || !data.data || !data.data.nonce) {
        console.warn('[session] nonce de visita no disponible:', data && data.error);
        return null;
      }
      return data.data.nonce;
    } catch (err) {
      console.warn('[session] solicitarNonceVisita error:', err.message);
      return null;
    }
  }

  // ── Traducir los codigos de error del backend de visitas ────
  function mensajeErrorVisita(data) {
    var d = data || {};
    // El backend de sesion responde los fallos 401 como {ok:false, error:'SESION_*'}
    // (sin campo code), por eso se normaliza aqui.
    var code = d.code || d.error || '';
    if (code === 'FUERA_DE_RANGO') {
      return 'Estas a ' + (d.dist_m != null ? d.dist_m : '?') + ' m del lugar (max '
        + (d.radio_m != null ? d.radio_m : '?') + ' m). Acercate para confirmar.';
    }
    if (code === 'PRECISION_INSUFICIENTE' || code === 'ACCURACY_INVALIDA') {
      return 'Senal GPS imprecisa. Intenta al aire libre.';
    }
    if (code === 'COORDENADAS_REQUERIDAS' || code === 'COORDENADAS_INVALIDAS') {
      return 'No pudimos validar tu ubicación. Activa el GPS e intenta de nuevo.';
    }
    if (code === 'RATE_LIMIT') {
      return 'Espera un momento antes de marcar otra visita.';
    }
    if (code === 'LIMITE_DIARIO') {
      return 'Alcanzaste el límite de visitas de hoy.';
    }
    if (code === 'VELOCIDAD_IMPOSIBLE') {
      return 'Detectamos un desplazamiento imposible. Espera e intenta desde el lugar.';
    }
    if (code === 'VISITA_NO_PERMITIDA' || code === 'DESTINO_NO_ENCONTRADO') {
      return 'Este lugar no permite confirmar visitas.';
    }
    if (code === 'NONCE_REQUERIDO' || code === 'NONCE_INVALIDO') {
      return 'No pudimos validar tu ubicaci\u00f3n, intenta de nuevo';
    }
    if (code === 'SESION_REQUERIDA' || code === 'SESION_INVALIDA' || code === 'SESION_EXPIRADA') {
      return 'Tu sesi\u00f3n expir\u00f3, vuelve a iniciar sesi\u00f3n';
    }
    return d.error || 'No se pudo registrar la visita';
  }

  // ── Marcar destino como visitado (accion deliberada del usuario, ──
  // ── no el contador automatico de vistas de pagina) ─────────────
  // ADR-024: exige presencia fisica; el backend valida el geofence
  // con lat/lng obligatorios.
  window.ExploraCO.marcarVisitado = async function (destinoUUID) {
    var usuario = window.ExploraCO.usuario;
    if (!usuario) {
      mostrarModalLogin('Inicia sesión para marcar que estuviste aquí');
      return false;
    }

    var pos = await obtenerUbicacion();
    if (!pos) return false;

    var nonce = await solicitarNonceVisita(usuario.id);
    if (!nonce) {
      mostrarToast(mensajeErrorVisita({ error: 'NONCE_REQUERIDO' }), '#ef4444');
      return false;
    }

    // POST de visita reutilizable: el reintento tras refreshJwt necesita
    // un nonce nuevo (el primero pudo consumirse antes del 401).
    var ejecutarVisita = async function (nonceActual) {
      var headers = window.ExploraCO.authHeaders();
      headers['Content-Type'] = 'application/json';
      var res = await fetch(API + '/api/interacciones', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
          tipo:       'visita',
          usuario_id: usuario.id,
          destino_id: destinoUUID,
          lat:        pos.lat,
          lng:        pos.lng,
          accuracy:   pos.accuracy,
          ts:         pos.ts,
          nonce:      nonceActual,
        }),
      });
      return { status: res.status, data: await res.json() };
    };

    try {
      var r = await ejecutarVisita(nonce);

      // 401 (SESION_*): un refresh silencioso y un unico reintento con
      // nonce nuevo. Si vuelve a fallar, se degrada sin silenciar.
      if (r.status === 401) {
        var jwtNuevo = await window.ExploraCO.refreshJwt();
        if (!jwtNuevo) {
          mostrarToast(mensajeErrorVisita(r.data), '#ef4444');
          return false;
        }
        var nonceNuevo = await solicitarNonceVisita(usuario.id);
        if (!nonceNuevo) {
          mostrarToast(mensajeErrorVisita({ error: 'NONCE_REQUERIDO' }), '#ef4444');
          return false;
        }
        r = await ejecutarVisita(nonceNuevo);
        if (r.status === 401) {
          console.warn('[session] visita rechazada tras refreshJwt:', r.data && r.data.error);
          mostrarToast(mensajeErrorVisita(r.data), '#ef4444');
          return false;
        }
      }

      var data = r.data;
      if (!data.ok || data.code) {
        mostrarToast(mensajeErrorVisita(data), '#ef4444');
        return false;
      }
      if (data.xp > 0) {
        var extra = (data.dist_m != null)
          ? ' a ' + data.dist_m + ' m' + (data.zona ? ', zona ' + data.zona : '')
          : '';
        mostrarToast('Visita confirmada' + extra + ' · +' + fmtXp(data.xp) + ' XP', '#16a34a');
        var misionesXp = sumaMisionesXp(data.misiones);
          aplicarDesbloqueos(data.misiones);
        var logrosXp = sumaLogrosXp(data.logros);
        window.ExploraCO.usuario.xp_total = redondearXp((Number(window.ExploraCO.usuario.xp_total) || 0) + data.xp + misionesXp + logrosXp);
        guardarSesion(window.ExploraCO.usuario);
        actualizarUI();
        mostrarMisionesToast(data.misiones);
        mostrarLogrosToast(data.logros);
      } else if (data.ya_visitado) {
        mostrarToast('Ya habías marcado que estuviste aquí', '#888');
      } else {
        mostrarToast('Visita confirmada', '#16a34a');
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

  // ── Quitar visita confirmada en DB (boton 'Desmarcar' / clearMyMap)
  window.ExploraCO.quitarVisita = async function (destinoUUID) {
    var usuario = window.ExploraCO.usuario;
    if (!usuario) return false;
    try {
      var res = await fetch(API + '/api/interacciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo:       'quitar_visita',
          usuario_id: usuario.id,
          destino_id: destinoUUID,
        }),
      });
      var data = await res.json();
      return !!data.ok;
    } catch (err) {
      console.warn('[session] quitarVisita error:', err.message);
      return false;
    }
  };

  // ── Voto rápido (1-5 estrellas, sin texto) en DB ──────────
  // TSK-015: el voto rápido es SOLO para usuarios con sesión.
  // Si no hay sesión se abre el modal de login (no se crea sesión
  // temporal, a diferencia de publicarResena).
  window.ExploraCO.votar = async function (destinoUUID, rating) {
    var usuario = window.ExploraCO.usuario;
    if (!usuario) {
      mostrarModalLogin('Inicia sesión para calificar este lugar');
      return { ok: false, necesita_login: true };
    }

    try {
      var res = await fetch(API + '/api/interacciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo:       'rating',
          usuario_id: usuario.id,
          destino_id: destinoUUID,
          rating:     rating,
        }),
      });
      var data = await res.json();
      if (data.ok) {
        mostrarToast('⭐ Voto guardado · +' + fmtXp(data.xp || 0) + ' XP', '#16a34a');
        if (window.ExploraCO.usuario) {
          var misionesXp = sumaMisionesXp(data.misiones);
          var logrosXp = sumaLogrosXp(data.logros);
          aplicarDesbloqueos(data.misiones);
          window.ExploraCO.usuario.xp_total = redondearXp((Number(window.ExploraCO.usuario.xp_total) || 0) + (data.xp || 0) + misionesXp + logrosXp);
          guardarSesion(window.ExploraCO.usuario);
          actualizarUI();
        }
        mostrarMisionesToast(data.misiones);
        mostrarLogrosToast(data.logros);
        return { ok: true };
      }
      if (data.ya_votado) {
        mostrarToast(data.error || 'Ya calificaste este lugar', '#888');
        return { ok: false, ya_votado: true, voto_previo: data.voto_previo || null };
      }
      mostrarToast(data.error || 'No se pudo guardar tu voto', '#ef4444');
      return { ok: false, error: data.error || 'No se pudo guardar tu voto' };
    } catch (err) {
      console.warn('[session] votar error:', err.message);
      mostrarToast('Error de conexión', '#ef4444');
      return { ok: false, error: 'Error de conexión' };
    }
  };

  // ── Consultar el voto del usuario en un destino (precarga) ─
  window.ExploraCO.obtenerMiVoto = async function (destinoUUID) {
    var usuario = window.ExploraCO.usuario;
    if (!usuario) return { ok: true, voto: null };
    try {
      var res = await fetch(API + '/api/interacciones?tipo=mi_rating&destino_id=' + destinoUUID + '&usuario_id=' + usuario.id);
      var data = await res.json();
      return { ok: true, voto: data.voto || null };
    } catch (err) {
      console.warn('[session] obtenerMiVoto error:', err.message);
      return { ok: false, error: 'Error de conexión' };
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
    var toast = document.getElementById('exploraco-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'exploraco-toast';
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

  // ── Misiones (Fase 3) ───────────────────────────────────────
  // Las respuestas de /api/interacciones ahora pueden traer un array
  // 'misiones' con los hitos que se completaron en esa misma llamada
  // (ver api/interacciones.js, evaluarMisiones()). El XP de mision ya
  // esta sumado en Neon; aqui solo se refleja localmente y se avisa.
  function sumaMisionesXp(misiones) {
    if (!misiones || !misiones.length) return 0;
    return misiones.reduce(function (s, m) { return s + (Number(m.xp) || 0); }, 0);
  }
  function aplicarDesbloqueos(misiones) {
    if (!misiones || !misiones.length || !window.ExploraCO.usuario) return;
    window.ExploraCO.usuario.capacidades = window.ExploraCO.usuario.capacidades || {};
    misiones.forEach(function (m) {
      if (m.desbloquea) window.ExploraCO.usuario.capacidades[m.desbloquea] = true;
    });
  }
  function mostrarMisionesToast(misiones) {
    if (!misiones || !misiones.length) return;
    misiones.forEach(function (m, i) {
      setTimeout(function () {
        mostrarToast('🏆 Misión completada: ' + m.nombre + ' · +' + fmtXp(m.xp) + ' XP', '#E8A020');
      }, i * 1600);
    });
  }

  // ── Logros / trofeos (v5, estilo consola) ────────────────────
  // Las respuestas de /api/interacciones ahora pueden traer un array
  // 'logros' con los trofeos desbloqueados en esa misma llamada (ver
  // api/interacciones.js, evaluarLogros()). El XP ya esta sumado en
  // Neon; aqui solo se refleja localmente y se avisa con toast, con un
  // pequeno desfase para que no pise los toasts de misiones.
  function sumaLogrosXp(logros) {
    if (!logros || !logros.length) return 0;
    return logros.reduce(function (s, l) { return s + (Number(l.xp) || 0); }, 0);
  }
  function mostrarLogrosToast(logros) {
    if (!logros || !logros.length) return;
    logros.forEach(function (l, i) {
      setTimeout(function () {
        mostrarToast((l.emoji || '🏆') + ' Trofeo desbloqueado: ' + l.nombre + ' · +' + fmtXp(l.xp) + ' XP', '#E8A020');
      }, i * 1600 + 900);
    });
  }

  // ── Gasto de XP con de-nivel real ─────────────────────────
  // Descuenta XP del usuario y detecta si baja de nivel.
  // Devuelve: { ok, xpAnterior, xpNuevo, nivelAnterior, nivelNuevo,
  //             bajoDeNivel, capacidadesRevocadas[] } o { ok:false, motivo }.
  //
  // Mini-test inline (casos esperados):
  //   Caso A: usuario con 9000 XP gasta 500 -> queda 8500 XP,
  //     nivel 14 (>= 8500) = nivelAnterior 14 -> no baja, bajoDeNivel=false.
  //   Caso B: usuario con 8500 XP gasta 800 -> queda 7700 XP,
  //     nivelAnterior=14 (>= 8500), nivelNuevo=13 (>= 6800, < 8500),
  //     bajoDeNivel=true, capacidadesRevocadas=['fundar_pandilla'] (nivel 14).
  function gastarXp(xpGastado) {
    var usuario = window.ExploraCO.usuario;
    if (!usuario) {
      return { ok: false, motivo: 'sin_sesion' };
    }

    var xpGastar = redondearXp(xpGastado);
    var xpActual = redondearXp(usuario.xp_total);

    if (xpGastar <= 0) {
      return { ok: false, motivo: 'xp_invalida' };
    }
    if (xpActual < xpGastar) {
      return { ok: false, motivo: 'xp_insuficiente' };
    }

    var nivelAnterior = calcularNivel(xpActual);
    var xpNuevo = redondearXp(xpActual - xpGastar);
    var nivelNuevo = calcularNivel(xpNuevo);
    var bajoDeNivel = nivelNuevo < nivelAnterior;

    // Capacidades revocadas: todas las que estaban activas en
    // nivelAnterior pero dejan de estarlo en nivelNuevo.
    var capacidadesRevocadas = [];
    if (bajoDeNivel) {
      var umbrales = Object.keys(CAPACIDADES_POR_NIVEL)
        .map(Number)
        .sort(function (a, b) { return a - b; });
      for (var i = 0; i < umbrales.length; i++) {
        if (umbrales[i] > nivelNuevo && umbrales[i] <= nivelAnterior) {
          capacidadesRevocadas.push(CAPACIDADES_POR_NIVEL[umbrales[i]]);
        }
      }
    }

    // Aplicar cambio
    usuario.xp_total = xpNuevo;
    if (bajoDeNivel) {
      // Marcar flag de capacidades revocadas en la sesion
      usuario.capacidadesRevocadas = capacidadesRevocadas;
    }
    guardarSesion(usuario);
    actualizarUI();

    return {
      ok: true,
      xpAnterior: xpActual,
      xpNuevo: xpNuevo,
      nivelAnterior: nivelAnterior,
      nivelNuevo: nivelNuevo,
      bajoDeNivel: bajoDeNivel,
      capacidadesRevocadas: capacidadesRevocadas
    };
  }

  window.ExploraCO.gastarXp = gastarXp;

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
        if (xpEl)   xpEl.textContent   = fmtXp(usuario.xp_total) + ' XP';
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

  // ── Refrescar sesión desde Neon (capacidades, XP, nivel, badges) ──
  // Al cargar con una sesión guardada en localStorage los datos pueden
  // quedar viejos (p. ej. nuevas capacidades desbloqueadas en otra
  // visita). Se re-fetcha el perfil para que los gates (subir_fotos,
  // chat, moderador_chat, crear_chat, organizar_actividad) reflejen el
  // estado real.
  function refrescarSesion() {
    var u = window.ExploraCO.usuario;
    if (!u || !u.id) return;
    // WP-3 (TSK-103 / ADR-028): el backend devuelve un subconjunto PUBLICO
    // a quien no se autentique como el dueno. Como este refresco es del
    // PROPIO usuario, enviamos su JWT para recibir todos los campos.
    // authHeaders() devuelve {} si no hay JWT (respuesta publica aceptable).
    fetch(API + '/api/usuarios?id=' + encodeURIComponent(u.id), {
      headers: window.ExploraCO.authHeaders(),
    })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (!d || !d.ok || !d.data) return;
        // La respuesta privada trae email; la publica NO. Nunca pisar la
        // sesion con la publica: se perderian email/auth_id/jwt/email_verificado.
        if (!d.data.email) {
          var pub = window.ExploraCO.usuario;
          if (pub && pub.auth_id && pub.email && typeof window.ExploraCO.refreshJwt === 'function') {
            window.ExploraCO.refreshJwt();
          }
          return;
        }
        var actual = window.ExploraCO.usuario || {};
        var merged = Object.assign({}, actual, d.data);
        // GET ?id= nunca devuelve jwt: conservar el vigente.
        if (!merged.jwt && actual.jwt) merged.jwt = actual.jwt;
        if (!merged.jwt_expira_en && actual.jwt_expira_en) merged.jwt_expira_en = actual.jwt_expira_en;
        window.ExploraCO.usuario = merged;
        try { localStorage.setItem(SESSION_KEY, JSON.stringify(merged)); } catch (e) {}
        actualizarUI();
      })
      .catch(function () {});
  }

  // ── Inicializar ────────────────────────────────────────────
  function init() {
    // Solo en Vercel/servidor — no en file://
    if (window.location.protocol === 'file:') return;

    obtenerDeviceId();
    capturarRefUrl();
    cargarSesion();
    actualizarUI();
    refrescarSesion();

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
