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

  // ── Niveles XP (fuente de verdad, 40 niveles) ────────────
  // XP_LEVELS[i] = xp minimo para alcanzar el nivel (i+1).
  // Nivel 1 = 0 XP, Nivel 40 = 100000 XP (curva v7, 5 Eras).
  // Espejo de api/usuarios.js NIVELES; validado por
  // scripts/smoke_niveles_espejos.js.
  // TODO ADR-040/ADR-053: migrar a window.NivelesData.XP_LEVELS
  // (evita la copia; hoy se conserva por costo de red/carga).
  var XP_LEVELS = [
    0, 150, 500, 1000, 1650, 2500, 3450, 4550, 5800, 7150,
    8650, 10250, 12000, 13850, 15800, 17900, 20100, 22450, 24850, 27400,
    30050, 32800, 35700, 38650, 41750, 44900, 48200, 51600, 55050, 58700,
    62400, 66150, 70050, 74050, 78150, 82300, 86600, 90950, 95450, 100000
  ];
  var MAX_NIVEL = 40; // 40

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

  // ---- Desglose de XP (ADR-053 Decision 13): fuente unica del toast ----
  // Recibe el xp_detalle del servidor (shape de armarXpDetalle en
  // api/interacciones.js) y devuelve una linea breve y legible:
  //   +32.60 XP  (base 20.00 x 1.63) [ + bono 25.00] [ . cap aplicado]
  // Reusa fmtXp (helper unico de formato, ADR-035): NO crea otro
  // formateador (Regla de No-Duplicidad). El multiplicador efectivo es
  // mult_global (post-cap); si el backend marco un recorte
  // (cap_aplicado !== 'ninguno') se indica para que el numero sea
  // explicable. Devuelve '' si no hay total: el caller no muestra nada.
  function fmtXpDetalle(detalle) {
    if (!detalle || typeof detalle !== 'object') return '';
    var total = Number(detalle.total);
    if (!isFinite(total)) return '';
    var txt = '+' + fmtXp(total) + ' XP';
    var base = Number(detalle.base);
    var mult = Number(detalle.mult_global);
    if (isFinite(base) && isFinite(mult)) {
      txt += '  (base ' + fmtXp(base) + ' x ' + mult.toFixed(2) + ')';
    }
    var bonos = Number(detalle.bonos_planos);
    if (isFinite(bonos) && bonos > 0) txt += ' + bono ' + fmtXp(bonos);
    if (detalle.cap_aplicado && detalle.cap_aplicado !== 'ninguno') {
      txt += ' \u00b7 cap aplicado';
    }
    return txt;
  }
  window.ExploraCO.fmtXpDetalle = fmtXpDetalle;

  // ---- Progreso al siguiente nivel (ADR-053 Decision 13) ----
  // Umbrales SIEMPRE desde window.NivelesData.XP_LEVELS (fuente unica
  // cliente, ADR-040) con fallback a XP_LEVELS de esta sesion: la UI
  // NUNCA escribe umbrales (Regla de No-Duplicidad). Devuelve
  // {nivel, min, minSiguiente, pct}; minSiguiente = null en el tope.
  function nivelesFuente() {
    if (typeof window !== 'undefined' && window.NivelesData
        && Array.isArray(window.NivelesData.XP_LEVELS)
        && window.NivelesData.XP_LEVELS.length) {
      return window.NivelesData.XP_LEVELS;
    }
    // Fallback: XP_LEVELS de esta sesion es un arreglo PLANO de umbrales
    // (numeros), a diferencia del arreglo de objetos de NivelesData.
    // Se normaliza a {min} para un unico contrato de lectura.
    return XP_LEVELS.map(function (m) { return { min: Number(m) }; });
  }
  function progresoNivel(xpTotal) {
    var tabla = nivelesFuente();
    var xp = Number(xpTotal) || 0;
    if (xp < 0) xp = 0;
    var idx = 0;
    for (var i = tabla.length - 1; i >= 0; i--) {
      if (xp >= tabla[i].min) { idx = i; break; }
    }
    var min = tabla[idx].min;
    var esTope = idx >= tabla.length - 1;
    var minSig = esTope ? null : tabla[idx + 1].min;
    var pct = esTope ? 100 : Math.round((xp - min) / (minSig - min) * 100);
    if (!isFinite(pct)) pct = 0;
    if (pct < 0) pct = 0;
    if (pct > 100) pct = 100;
    return { nivel: idx + 1, min: min, minSiguiente: minSig, pct: pct };
  }
  window.ExploraCO.nivelesFuente = nivelesFuente;
  window.ExploraCO.progresoNivel = progresoNivel;

  // ---- UI informativa de cupo / enfriamiento (ADR-053 Decision 13.2) ----
  // Sustituye al Rising Star Decay (descartado): SOLO informa, NUNCA
  // bloquea por cuenta propia (la verdad la aplica el backend).
  // Contrato esperado del campo `estado_cupo` que el backend DEBE exponer
  // por accion (hoy solo algunas acciones lo informan de forma parcial):
  //   { tipo:'cupo'|'cooldown', mensaje?:string,
  //     reinicia_en_seg?:number, restante?:number, limite?:number,
  //     usado?:number }
  // TODO ADR-053/estado_cupo: pedir al backend que adjunte `estado_cupo`
  // en la respuesta de cada accion capada (visitas 30/dia, ao_proponer
  // 3/dia, ao_checkin 90s+30/dia, plan_crear 3/dia, plan_unirse 5/dia,
  // chat 10 XP/dia, compartir 50 XP/24h). Mientras no venga, esta
  // funcion no muestra nada (no inventa campos).
  function fmtEstadoCupo(estado) {
    if (!estado || typeof estado !== 'object') return '';
    if (estado.mensaje) return String(estado.mensaje);
    var seg = Number(estado.reinicia_en_seg);
    var haySeg = isFinite(seg) && seg >= 0;
    if (estado.tipo === 'cooldown') {
      return haySeg ? ('Enfriamiento activo ' + Math.ceil(seg / 60) + ' min') : 'Enfriamiento activo';
    }
    if (estado.tipo === 'cupo') {
      if (!haySeg) return 'Cupo diario alcanzado';
      var cuando = seg >= 3600 ? (Math.ceil(seg / 3600) + ' h') : (Math.ceil(seg / 60) + ' min');
      return 'Cupo diario alcanzado \u00b7 vuelve en ' + cuando;
    }
    return '';
  }
  // Unico punto que muestra el estado de cupo (no se copia por accion).
  function mostrarEstadoCupo(estado, color) {
    var txt = fmtEstadoCupo(estado);
    if (txt) mostrarToast(txt, color || '#E8A020');
    return txt;
  }
  window.ExploraCO.fmtEstadoCupo = fmtEstadoCupo;
  window.ExploraCO.mostrarEstadoCupo = mostrarEstadoCupo;

  // ── Mapa de capacidades por umbral de nivel ───────────────
  // Clave = nivel minimo, valor = nombre de la capacidad.
  // Una capacidad esta activa si nivelActual >= umbral.
  var CAPACIDADES_POR_NIVEL = {
    1:  'perfil_viajero',
    6:  'crear_planes',
    7:  'emojis_premium',
    8:  'insignia_caminante',
    9:  'avatar_era',
    10: 'sello_sala',
    11: 'organizar_actividad',
    12: 'marco_bronce',
    13: 'cromo_ciudad',
    14: 'fundar_pandilla',
    15: 'moderar_galerias',
    16: 'cromo_dorado',
    17: 'mariscal_parche',
    18: 'tema_mapa',
    19: 'inmortal',
    20: 'insignia_explorador',
    21: 'editor_itinerarios',
    22: 'plantillas_planes',
    23: 'destacar_resena',
    24: 'marco_plata',
    25: 'colecciones_curadas',
    26: 'eventos_propios',
    27: 'resenas_verificadas',
    28: 'insignia_cronista',
    29: 'cromo_temporada',
    30: 'tema_perfil',
    31: 'impulso_xp',
    32: 'apadrinar_viajeros',
    33: 'voto_plataforma',
    34: 'marco_oro',
    35: 'insignia_leyenda',
    36: 'marco_mitico',
    37: 'acceso_beta',
    38: 'nombre_color',
    39: 'insignia_ancestral',
    40: 'titulo_mito'
  };

  window.ExploraCO.CAPACIDADES_POR_NIVEL = CAPACIDADES_POR_NIVEL;

  // ---- Sistema de eras + titulos por nivel (v7: 40 niveles / 5 eras) ----
  // Catalogo local puro (sin BD). Los titulos con tilde o enie usan
  // escapes Unicode para mantener ASCII puro (ADR-002).
  var TITULOS_POR_NIVEL = {
    1:'Caminante Novato', 2:'Rastreador Local', 3:'Explorador Urbano', 4:'Aventurero Regional',
    5:'Vanguardia Territorial', 6:'Embajador de Zona', 7:'Fot\u00f3grafo de Ruta',
    8:'Cronista de Historias', 9:'Buscador de Leyendas', 10:'Gu\u00eda de Fronteras',
    11:'Estratega Comunitario', 12:'Documentalista Visual', 13:'Se\u00f1or del Spot',
    14:'Cart\u00f3grafo de Cine', 15:'Protector del Patrimonio', 16:'Curador de Colombia',
    17:'Mariscal de Parche', 18:'Cineasta de Territorio', 19:'Inmortal del Mapa',
    20:'Gran Maestro ExploraCO', 21:'Tejedor de Rutas', 22:'Cronista de Regiones',
    23:'Curador de Relatos', 24:'Guardi\u00e1n de Tradiciones', 25:'Arquitecto de Itinerarios',
    26:'Maestro de Ceremonias', 27:'Cronista Mayor', 28:'Embajador Cultural',
    29:'Historiador de Territorio', 30:'Sabio de los Caminos', 31:'Leyenda Emergente',
    32:'Forjador de Leyendas', 33:'H\u00e9roe del Mapa', 34:'Tit\u00e1n de las Rutas',
    35:'Leyenda Viva', 36:'Mito Naciente', 37:'Semidi\u00f3s del Viaje',
    38:'Guardi\u00e1n Ancestral', 39:'Esp\u00edritu del Territorio', 40:'Mito Eterno ExploraCO'
  };

  var ERAS = [
    { nombre:'Caminante', niveles:[1,10], emoji:'\uD83E\uDDED', color:'#6B7280',
      beneficios:['XP por visitas y rese\u00f1as','Acceso al mapa y al chat b\u00e1sico','Creaci\u00f3n de perfil'],
      mecanicas:['Explorar puntos culturales','Registrar visitas con geocerca'] },
    { nombre:'Explorador', niveles:[11,20], emoji:'\uD83C\uDFC6', color:'#E8A020',
      beneficios:['Crear planes de viaje','Emojis premium en el chat','Sello de sala'],
      mecanicas:['Misiones de Casa','Bonos de XP por actividad grupal'] },
    { nombre:'Cronista', niveles:[21,30], emoji:'\uD83D\uDCD6', color:'#6366F1',
      beneficios:['Organizar actividades','Fundar parches','Moderar galer\u00edas'],
      mecanicas:['Liderar Casas','Misiones colectivas de alto valor'] },
    { nombre:'Leyenda', niveles:[31,35], emoji:'\uD83D\uDC51', color:'#EC4899',
      beneficios:['Cromo dorado','Mariscal de parche','XP que nunca decae'],
      mecanicas:['Recompensas exclusivas de temporada','Voto en decisiones de la plataforma'] },
    { nombre:'Mito', niveles:[36,40], emoji:'\uD83C\uDF0C', color:'#8B5CF6',
      beneficios:['Insignias miticas','Marco de avatar legendario','Acceso anticipado a betas'],
      mecanicas:['Retos de temporada final','Legado permanente en el ranking global'] }
  ];

  function expEra_getEra(nivel) {
    for (var i = 0; i < ERAS.length; i++) {
      if (nivel >= ERAS[i].niveles[0] && nivel <= ERAS[i].niveles[1]) return ERAS[i];
    }
    return ERAS[0];
  }
  window.ExploraCO.getEra = expEra_getEra;
  window.ExploraCO.TITULOS_POR_NIVEL = TITULOS_POR_NIVEL;
  window.ExploraCO.ERAS = ERAS;

  // ---- Modales de nivel-up y cambio de era (v5) ----
  // DOM inyectado al vuelo y auto-limpiante: no requiere HTML previo.
  // Todo texto nuevo usa escapes Unicode (ASCII puro, ADR-002).

  function expNvl_cerrarModal() {
    var ov = document.getElementById('expNvl-modal-overlay');
    if (ov && ov.parentNode) ov.parentNode.removeChild(ov);
  }

  function expNvl_mostrarModalNivelUp(nivelAnterior, nivelNuevo) {
    if (!nivelNuevo || nivelNuevo < 1) return;
    expNvl_cerrarModal();

    var titulo = TITULOS_POR_NIVEL[nivelNuevo] || ('Nivel ' + nivelNuevo);
    var desbloqueadas = [];
    for (var k in CAPACIDADES_POR_NIVEL) {
      if (!Object.prototype.hasOwnProperty.call(CAPACIDADES_POR_NIVEL, k)) continue;
      var umbral = parseInt(k, 10);
      if (umbral > nivelAnterior && umbral <= nivelNuevo) {
        desbloqueadas.push(CAPACIDADES_POR_NIVEL[k]);
      }
    }

    var overlay = document.createElement('div');
    overlay.id = 'expNvl-modal-overlay';
    overlay.style.cssText = [
      'position:fixed;top:0;left:0;right:0;bottom:0;z-index:10000;',
      'display:flex;align-items:center;justify-content:center;',
      'background:rgba(0,0,0,.72);padding:20px;font-family:inherit;'
    ].join('');

    var card = document.createElement('div');
    card.style.cssText = [
      'max-width:420px;width:100%;text-align:center;',
      'background:linear-gradient(160deg,#111827,#0d1117);',
      'border:1px solid rgba(232,160,32,.55);border-radius:18px;',
      'padding:26px 22px;color:#F9FAFB;',
      'box-shadow:0 24px 60px rgba(0,0,0,.55);'
    ].join('');

    var emoji = document.createElement('div');
    emoji.textContent = '\uD83C\uDF89';
    emoji.style.cssText = 'font-size:44px;line-height:1;margin-bottom:8px;';
    card.appendChild(emoji);

    var kicker = document.createElement('div');
    kicker.textContent = 'Nivel alcanzado';
    kicker.style.cssText = 'font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#E8A020;font-weight:700;';
    card.appendChild(kicker);

    var numero = document.createElement('div');
    numero.textContent = String(nivelNuevo);
    numero.style.cssText = 'font-size:54px;font-weight:800;line-height:1.1;color:#fff;';
    card.appendChild(numero);

    var tituloEl = document.createElement('div');
    tituloEl.textContent = titulo;
    tituloEl.style.cssText = 'font-size:18px;font-weight:700;margin-bottom:14px;';
    card.appendChild(tituloEl);

    if (desbloqueadas.length) {
      var capTitle = document.createElement('div');
      capTitle.textContent = 'Nuevas capacidades';
      capTitle.style.cssText = 'font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#9CA3AF;margin:10px 0 6px;';
      card.appendChild(capTitle);

      var ul = document.createElement('ul');
      ul.style.cssText = 'list-style:none;margin:0 0 12px;padding:0;text-align:left;';
      for (var i = 0; i < desbloqueadas.length; i++) {
        var li = document.createElement('li');
        li.textContent = '\u2705 ' + String(desbloqueadas[i]).replace(/_/g, ' ');
        li.style.cssText = 'padding:5px 0;font-size:14px;color:#E5E7EB;';
        ul.appendChild(li);
      }
      card.appendChild(ul);
    }

    var xpAhora = (window.ExploraCO.usuario && Number(window.ExploraCO.usuario.xp_total)) || 0;
    var tip = document.createElement('div');
    tip.style.cssText = 'font-size:13px;color:#9CA3AF;margin:8px 0 16px;';
    if (nivelNuevo < MAX_NIVEL) {
      var xpSig = XP_LEVELS[nivelNuevo];
      var falta = Math.max(0, redondearXp(xpSig - xpAhora));
      tip.textContent = 'Pro-tip: te faltan ' + fmtXp(falta) + ' XP para el Nivel ' + (nivelNuevo + 1) + '.';
    } else {
      tip.textContent = 'Has alcanzado el nivel maximo. Leyenda de Colombia.';
    }
    card.appendChild(tip);

    var btnCerrar = document.createElement('button');
    btnCerrar.id = 'expNvl-btn-cerrar';
    btnCerrar.textContent = 'Cerrar';
    btnCerrar.style.cssText = [
      'width:100%;padding:11px 16px;border-radius:10px;border:0;',
      'background:#E8A020;color:#0d1117;font-weight:700;font-size:14px;',
      'cursor:pointer;font-family:inherit;'
    ].join('');
    btnCerrar.onclick = function () { expNvl_cerrarModal(); };
    card.appendChild(btnCerrar);

    if (document.getElementById('btn-perfil-viajero')) {
      var btnInfo = document.createElement('button');
      btnInfo.textContent = 'Ampliar info';
      btnInfo.style.cssText = [
        'width:100%;padding:10px 16px;border-radius:10px;margin-top:8px;',
        'background:transparent;color:#E8A020;border:1px solid rgba(232,160,32,.55);',
        'font-weight:600;font-size:14px;cursor:pointer;font-family:inherit;'
      ].join('');
      btnInfo.onclick = function () {
        expNvl_cerrarModal();
        var pb = document.getElementById('btn-perfil-viajero');
        if (pb) pb.click();
      };
      card.appendChild(btnInfo);
    }

    overlay.appendChild(card);
    document.body.appendChild(overlay);
  }

  function expEra_mostrarModalCambioEra(eraAnterior, eraNueva) {
    if (!eraNueva) return;
    var previo = document.getElementById('expEra-modal-overlay');
    if (previo && previo.parentNode) previo.parentNode.removeChild(previo);

    var color = eraNueva.color || '#E8A020';
    var overlay = document.createElement('div');
    overlay.id = 'expEra-modal-overlay';
    overlay.style.cssText = [
      'position:fixed;top:0;left:0;right:0;bottom:0;z-index:10001;',
      'display:flex;align-items:center;justify-content:center;',
      'background:rgba(0,0,0,.82);padding:20px;font-family:inherit;'
    ].join('');

    var card = document.createElement('div');
    card.style.cssText = [
      'max-width:460px;width:100%;text-align:center;',
      'background:#0d1117;border:1px solid ' + color + ';',
      'border-radius:18px;padding:28px 22px;color:#F9FAFB;',
      'box-shadow:0 24px 60px rgba(0,0,0,.6);'
    ].join('');

    var emoji = document.createElement('div');
    emoji.textContent = eraNueva.emoji || '';
    emoji.style.cssText = 'font-size:52px;line-height:1;margin-bottom:10px;';
    card.appendChild(emoji);

    var kicker = document.createElement('div');
    kicker.textContent = 'Nueva era';
    kicker.style.cssText = 'font-size:12px;letter-spacing:2px;text-transform:uppercase;color:' + color + ';font-weight:700;';
    card.appendChild(kicker);

    var nombre = document.createElement('div');
    nombre.textContent = eraNueva.nombre;
    nombre.style.cssText = 'font-size:26px;font-weight:800;margin-bottom:16px;';
    card.appendChild(nombre);

    function bloqueEra(titulo, items) {
      var t = document.createElement('div');
      t.textContent = titulo;
      t.style.cssText = 'font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#9CA3AF;margin:12px 0 6px;text-align:left;';
      card.appendChild(t);
      var lista = document.createElement('ul');
      lista.style.cssText = 'list-style:none;margin:0 0 8px;padding:0;text-align:left;';
      (items || []).forEach(function (it) {
        var li = document.createElement('li');
        li.textContent = '\u2022 ' + it;
        li.style.cssText = 'padding:4px 0;font-size:14px;color:#E5E7EB;';
        lista.appendChild(li);
      });
      card.appendChild(lista);
    }

    bloqueEra('Beneficios', eraNueva.beneficios);
    bloqueEra('Mecanicas', eraNueva.mecanicas);

    var btn = document.createElement('button');
    btn.textContent = 'Entendido';
    btn.style.cssText = [
      'width:100%;padding:11px 16px;border-radius:10px;border:0;margin-top:14px;',
      'background:' + color + ';color:#0d1117;font-weight:700;font-size:14px;',
      'cursor:pointer;font-family:inherit;'
    ].join('');
    btn.onclick = function () {
      var ov = document.getElementById('expEra-modal-overlay');
      if (ov && ov.parentNode) ov.parentNode.removeChild(ov);
    };
    card.appendChild(btn);

    overlay.appendChild(card);
    document.body.appendChild(overlay);
  }

  window.ExploraCO.mostrarModalNivelUp = expNvl_mostrarModalNivelUp;
  window.ExploraCO.mostrarModalCambioEra = expEra_mostrarModalCambioEra;

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
        // Bono de bienvenida por referido: solo en el alta NUEVA que uso
        // un codigo de referido (perfil.bonus_referido === true). Se
        // difiere para que la sesion y la UI ya esten listas.
        if (perfil.bonus_referido === true) {
          setTimeout(function () {
            window.ExploraCO.mostrarSelectorBonoReferido(perfil);
          }, 400);
        }
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
      if (data.ok && (data.xp > 0 || data.xp_detalle)) {
        // Antes decia data.xp_ganado, pero interacciones.js siempre
        // devuelve el campo como 'xp'. ADR-053 Dec 13.1: un unico helper
        // encadena la acreditacion y deduplica el toast local (sin numero
        // si el servidor manda xp_detalle).
        toastAccionXp(data, '\u2665 Guardado', '#E8A020');
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

    // Publicar resena exige sesion: la atribucion es siempre la cuenta.
    // Sin sesion se abre el modal de login (ya NO se crea cuenta temporal
    // con el nombre del input).
    if (!usuario) {
      mostrarModalLogin('Inicia sesi\u00f3n para publicar tu rese\u00f1a');
      return { ok: false, requiere_login: true };
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
        // data.xp_ganado, interacciones.js devuelve 'xp'. ADR-053 Dec 13.1:
        // dedup del toast local + acreditacion en un unico helper.
        toastAccionXp(data, '\u2B50 Rese\u00f1a publicada', '#16a34a');
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
        if (data.xp > 0 || data.xp_detalle) {
          toastAccionXp(data, '\u2665 Guardado', '#E8A020');
        } else {
          mostrarToast('\u2665 Guardado de nuevo en Tu Mapa', '#E8A020');
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

  // Consultar si el usuario actual ya marco "estuve aqui".
  // Reutiliza el GET de mapa (?tipo=mapa) que ya devuelve
  // data.visitados; no hay endpoint dedicado de visita.
  window.ExploraCO.estaVisitado = async function (destinoUUID) {
    var usuario = window.ExploraCO.usuario;
    if (!usuario) return false;
    try {
      var res = await fetch(
        API + '/api/interacciones?tipo=mapa&usuario_id=' + encodeURIComponent(usuario.id)
      );
      var data = await res.json();
      var visitados = (data && data.ok && data.data && data.data.visitados) || [];
      var objetivo = String(destinoUUID);
      for (var i = 0; i < visitados.length; i++) {
        var d = visitados[i] || {};
        if (String(d.id) === objetivo) return true;
        if (d.slug && String(d.slug) === objetivo) return true;
      }
      return false;
    } catch (err) {
      console.warn('[session] estaVisitado error:', err.message);
      return false;
    }
  };

  // Estado del destino para el usuario actual (precarga).
  // Agrega guardado + visitado + voto en una sola llamada; con
  // Promise.all los tres GET corren en paralelo.
  window.ExploraCO.estadoDestino = async function (destinoUUID) {
    if (!window.ExploraCO.usuario) {
      return { guardado: false, visitado: false, voto: null };
    }
    try {
      var r = await Promise.all([
        window.ExploraCO.estaGuardado(destinoUUID),
        window.ExploraCO.estaVisitado(destinoUUID),
        window.ExploraCO.obtenerMiVoto(destinoUUID),
      ]);
      return {
        guardado: !!r[0],
        visitado: !!r[1],
        voto: (r[2] && r[2].voto) || null,
      };
    } catch (err) {
      console.warn('[session] estadoDestino error:', err.message);
      return { guardado: false, visitado: false, voto: null };
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
        // ADR-053 Dec 13.2: cupo/cooldown por el helper unico; el resto de
        // errores (NONCE, geocerca, precision, sesion) conserva su mensaje.
        if (data.code === 'RATE_LIMIT') { mostrarEstadoCupo({ tipo: 'cooldown' }); return false; }
        if (data.code === 'LIMITE_DIARIO') { mostrarEstadoCupo({ tipo: 'cupo' }); return false; }
        mostrarToast(mensajeErrorVisita(data), '#ef4444');
        return false;
      }
      if (data.xp > 0 || data.xp_detalle) {
        var extra = (data.dist_m != null)
          ? ' a ' + data.dist_m + ' m' + (data.zona ? ', zona ' + data.zona : '')
          : '';
        toastAccionXp(data, 'Visita confirmada' + extra, '#16a34a', data.xp);
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
        // ADR-053 Dec 13.1: dedup del toast local + acreditacion unica.
        toastAccionXp(data, '\u2B50 Voto guardado', '#16a34a');
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

  // ── Bono de bienvenida por referido ────────────────────────
  // El backend expone las opciones (GET tipo=bonus_referido) y aplica
  // la elegida (POST tipo=reclamar_bonus_referido). Se muestra solo a
  // registros NUEVOS que llegaron con un codigo de referido
  // (perfil.bonus_referido === true en la respuesta de login).
  window.ExploraCO.mostrarSelectorBonoReferido = async function (perfil) {
    if (!perfil || !perfil.id) return;

    // Evitar duplicados: si ya hay un modal, se retira el previo.
    var previo = document.getElementById('ec-bono-ref');
    if (previo && previo.parentNode) previo.parentNode.removeChild(previo);

    var opciones = [];
    try {
      var res = await fetch(API + '/api/interacciones?tipo=bonus_referido&usuario_id=' + encodeURIComponent(perfil.id));
      var data = await res.json();
      opciones = (data && data.opciones) || [];
    } catch (err) {
      console.warn('[bono-ref] no se pudieron cargar las opciones:', err && err.message);
      return;
    }
    if (!opciones.length) return;

    var overlay = document.createElement('div');
    overlay.id = 'ec-bono-ref';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.style.cssText = [
      'position:fixed;top:0;left:0;right:0;bottom:0;z-index:10002;',
      'display:flex;align-items:center;justify-content:center;',
      'background:rgba(0,0,0,.75);padding:20px;font-family:inherit;'
    ].join('');

    var card = document.createElement('div');
    card.style.cssText = [
      'max-width:440px;width:100%;',
      'background:linear-gradient(160deg,#111827,#0d1117);',
      'border:1px solid rgba(232,160,32,.55);border-radius:18px;',
      'padding:24px 20px;color:#F9FAFB;max-height:88vh;overflow:auto;',
      'box-shadow:0 24px 60px rgba(0,0,0,.55);'
    ].join('');

    var titulo = document.createElement('div');
    titulo.textContent = 'Elige tu bono de bienvenida';
    titulo.style.cssText = 'font-size:20px;font-weight:800;margin-bottom:6px;';
    card.appendChild(titulo);

    var sub = document.createElement('div');
    sub.textContent = 'Llegaste con un enlace de referido. Escoge uno de estos bonos para empezar:';
    sub.style.cssText = 'font-size:13px;color:#9CA3AF;margin-bottom:16px;line-height:1.4;';
    card.appendChild(sub);

    function cerrarBonoRef() {
      var el = document.getElementById('ec-bono-ref');
      if (el && el.parentNode) el.parentNode.removeChild(el);
    }

    opciones.forEach(function (opcion) {
      var item = document.createElement('div');
      item.style.cssText = [
        'border:1px solid rgba(255,255,255,.12);border-radius:12px;',
        'padding:12px 14px;margin-bottom:10px;',
        'display:flex;align-items:center;justify-content:space-between;gap:12px;'
      ].join('');

      var info = document.createElement('div');
      info.style.cssText = 'flex:1;min-width:0;';

      var nom = document.createElement('div');
      nom.textContent = opcion.nombre || opcion.clave || '';
      nom.style.cssText = 'font-size:15px;font-weight:700;margin-bottom:2px;';
      info.appendChild(nom);

      if (opcion.descripcion) {
        var desc = document.createElement('div');
        desc.textContent = opcion.descripcion;
        desc.style.cssText = 'font-size:12.5px;color:#9CA3AF;line-height:1.35;';
        info.appendChild(desc);
      }
      item.appendChild(info);

      var btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = 'Elegir';
      btn.style.cssText = [
        'flex:0 0 auto;padding:9px 14px;border-radius:10px;border:0;',
        'background:#E8A020;color:#0d1117;font-weight:700;font-size:13px;',
        'cursor:pointer;font-family:inherit;'
      ].join('');
      btn.onclick = function () {
        btn.disabled = true;
        btn.style.opacity = '.6';
        fetch(API + '/api/interacciones', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tipo: 'reclamar_bonus_referido',
            usuario_id: perfil.id,
            clave: opcion.clave,
          }),
        })
          .then(function (r) { return r.json(); })
          .then(function (d) {
            if (d && d.ok) {
              mostrarToast('Bono activado: ' + (opcion.nombre || opcion.clave), '#16a34a');
              cerrarBonoRef();
              ['cargarInventario', 'cargarTienda'].forEach(function (fn) {
                if (typeof window[fn] === 'function') {
                  try { window[fn](); } catch (e) {}
                }
              });
              if (window.ExploraCO && typeof window.ExploraCO.cargarInventario === 'function') {
                try { window.ExploraCO.cargarInventario(); } catch (e) {}
              }
            } else {
              mostrarToast('No se pudo activar el bono', '#ef4444');
              btn.disabled = false;
              btn.style.opacity = '1';
            }
          })
          .catch(function (err) {
            console.warn('[bono-ref] no se pudo reclamar:', err && err.message);
            mostrarToast('No se pudo activar el bono', '#ef4444');
            btn.disabled = false;
            btn.style.opacity = '1';
          });
      };
      item.appendChild(btn);

      card.appendChild(item);
    });

    overlay.appendChild(card);
    document.body.appendChild(overlay);
  };

  // Consulta si el usuario en sesion tiene un bono por referido
  // pendiente y, de ser asi, abre el selector. No se llama en init()
  // para no molestar; la exponen paginas como mi-perfil.html.
  window.ExploraCO.verificarBonoReferidoPendiente = async function () {
    var u = window.ExploraCO.usuario;
    if (!u || !u.id) return;
    try {
      var res = await fetch(API + '/api/interacciones?tipo=bonus_referido&usuario_id=' + encodeURIComponent(u.id));
      var data = await res.json();
      if (data && data.pendiente === true && !data.reclamado_clave) {
        window.ExploraCO.mostrarSelectorBonoReferido(u);
      }
    } catch (err) {
      console.warn('[bono-ref] verificacion de pendiente fallo:', err && err.message);
    }
  };

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
  function mostrarMisionesToast(misiones, offsetMs) {
    if (!misiones || !misiones.length) return;
    var base = Number(offsetMs) || 0;
    misiones.forEach(function (m, i) {
      setTimeout(function () {
        mostrarToast('🏆 Misión completada: ' + m.nombre + ' · +' + fmtXp(m.xp) + ' XP', '#E8A020');
      }, base + i * 1600);
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
  function mostrarLogrosToast(logros, offsetMs) {
    if (!logros || !logros.length) return;
    var base = Number(offsetMs) || 0;
    logros.forEach(function (l, i) {
      setTimeout(function () {
        mostrarToast((l.emoji || '🏆') + ' Trofeo desbloqueado: ' + l.nombre + ' · +' + fmtXp(l.xp) + ' XP', '#E8A020');
      }, base + i * 1600 + 900);
    });
  }

  // Aplica el resultado de una accion de XP que un caller externo
  // ejecuto por su cuenta (ej. compartir.js, que hace su propio POST a
  // tipo=compartir): suma la XP de la accion + los bonos de misiones y
  // logros al perfil local, persiste la sesion, refresca la UI y dispara
  // los toasts correspondientes. Un unico punto para no duplicar el
  // patron de acreditacion (Regla de No-Duplicidad); los toasts de
  // misiones/logros reusan las funciones ya existentes.
  function aplicarResultadoXp(data) {
    if (!data || !data.ok) return 0;
    var misionesXp = sumaMisionesXp(data.misiones);
    var logrosXp = sumaLogrosXp(data.logros);
    var total = redondearXp((Number(data.xp) || 0) + misionesXp + logrosXp);
    if (window.ExploraCO.usuario) {
      aplicarDesbloqueos(data.misiones);
      window.ExploraCO.usuario.xp_total = redondearXp((Number(window.ExploraCO.usuario.xp_total) || 0) + total);
      // Deteccion de subida de nivel: el nivel previo se reconstruye
      // restando el delta ya acreditado (xp_total en L1085 ya es el nuevo).
      var nvlAnt = calcularNivel((Number(window.ExploraCO.usuario.xp_total) || 0) - total);
      var nvlNvo = calcularNivel(window.ExploraCO.usuario.xp_total);
      if (nvlNvo > nvlAnt) {
        setTimeout(function() { expNvl_mostrarModalNivelUp(nvlAnt, nvlNvo); }, 600);
        var eraAnt = expEra_getEra(nvlAnt);
        var eraNva = expEra_getEra(nvlNvo);
        if (eraNva && eraAnt && eraNva.nombre !== eraAnt.nombre) {
          setTimeout(function() { expEra_mostrarModalCambioEra(eraAnt, eraNva); }, 3200);
        }
      }
      guardarSesion(window.ExploraCO.usuario);
      actualizarUI();
    }
    // ADR-053 Decision 13.1: el servidor es la fuente unica del toast de
    // XP. Si la respuesta trae xp_detalle se muestra el desglose y los
    // callers locales DEBEN suprimir su toast propio (dedup, NEXT.md:246).
    if (data.xp_detalle) {
      var txtXp = fmtXpDetalle(data.xp_detalle);
      if (txtXp) mostrarToast(txtXp, '#E8A020');
    }
    // Si hubo desglose de XP, se retrasan misiones/logros para no pisar
    // el toast de XP en el mismo instante.
    var offsetToast = data.xp_detalle ? 1600 : 0;
    mostrarMisionesToast(data.misiones, offsetToast);
    mostrarLogrosToast(data.logros, offsetToast);
    return total;
  }
  window.ExploraCO.aplicarResultadoXp = aplicarResultadoXp;

  // ── Toast local de exito de una accion de XP (ADR-053 Dec 13.1) ──
  // Un unico punto (Regla de No-Duplicidad) que reutiliza aplicarResultadoXp
  // y fmtXp: encadena la acreditacion (XP + misiones/logros) y muestra el
  // mensaje local de exito. Si el servidor trae xp_detalle, el numero de XP
  // lo da UNICAMENTE el toast de desglose, asi que el mensaje local va SIN
  // '+X XP' (dedup; evita el doble toast de NEXT.md:246). Sin xp_detalle se
  // conserva el '+X XP' de siempre. `xp` permite mostrar un valor distinto
  // de data.xp (p. ej. la visita, donde data.xp es el total acreditado).
  function toastAccionXp(data, msg, color, xp) {
    var detalle = !!(data && data.xp_detalle);
    var n = (xp === undefined || xp === null) ? (Number(data && data.xp) || 0) : (Number(xp) || 0);
    var texto = msg;
    if (!detalle && n > 0) texto += ' \u00b7 +' + fmtXp(n) + ' XP';
    if (texto) mostrarToast(texto, color || '#16a34a');
    // Emite el desglose del servidor (si viene) y encadena misiones/logros.
    aplicarResultadoXp(data);
    return texto;
  }

  // Deriva el contador de compartidos del catalogo de logros
  // (GET ?tipo=logros). Los tres logros de ADR-036 son acumulativos y
  // estan encadenados por 'requiere': manda el de mayor umbral visible.
  // Helper compartido por index.html / comunidad.html / mi-perfil.html
  // para evaluar la insignia 'compartido' sin duplicar el mapeo.
  function compartidosDeLogros(logros) {
    var done = {};
    (logros || []).forEach(function (l) { if (l.estado === 'completada') done[l.id] = true; });
    if (done['logr_viral_100']) return 100;
    if (done['logr_compartidor_25']) return 25;
    if (done['logr_primer_compartido']) return 1;
    return 0;
  }
  window.ExploraCO.compartidosDeLogros = compartidosDeLogros;

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
        // Barra de progreso del navbar (ADR-053 Decision 13): umbrales
        // desde nivelesFuente() (window.NivelesData con fallback), nunca
        // escritos en la UI.
        var prg = progresoNivel(usuario.xp_total);
        var xpFill = document.getElementById('perfil-xp-fill');
        if (xpFill) xpFill.style.width = prg.pct + '%';
        perfilBtn.title = prg.minSiguiente
          ? ('Nivel ' + prg.nivel + ' \u00b7 faltan ' + fmtXp(prg.minSiguiente - (Number(usuario.xp_total) || 0)) + ' XP para el siguiente')
          : ('Nivel ' + prg.nivel + ' \u00b7 nivel maximo');
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
