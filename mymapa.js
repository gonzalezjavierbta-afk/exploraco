/* =============================================================
   mymapa.js -- Modulo compartido "Mis mapas personalizados"
   LATAWEL. Expone window.MyMap (IIFE, ASCII-safe, sin backticks).

   Canonico para la gestion de mapas tematicos. index.html y
   comunidad.html lo consumen; no duplicar esta logica en las paginas.

   Endpoints existentes usados (no crea backend):
     GET  /api/interacciones?tipo=mapas_mios&usuario_id=<uuid>
     GET  /api/interacciones?tipo=mapa&usuario_id=<uuid>
          -> { guardados:[...lat/lng] } (contenido de "Mi Mapa")
     GET  /api/interacciones?tipo=mapa_detalle&id=<id>&usuario_id=<uuid>
     GET  /api/interacciones?tipo=mis_guardados_media
          -> { data:[{fuente,item_id}] } (exige sesion Bearer, ADR-054)
     POST /api/interacciones  (mapa_crear|mapa_editar|mapa_eliminar)

   Dependencias externas permitidas: Leaflet (window.L), el motor
   compartido window.MapaCultural (mapa-cultural.js) y las utilidades
   de sesion en window.ExploraCO (mostrarLogin/mostrarToast).

   T3 -- MAPA UNIFICADO: si el contenedor resuelto lleva el atributo
   data-cm-mapa="1", la pagina declara que ese div es el UNICO mapa de
   la pestana. Este modulo crea ahi la unica instancia de
   window.MapaCultural (una sola carga de tiles) y deja que la media
   audiovisual se pinte en esa misma capa, en vez de crear un segundo
   mapa. En ese modo la superficie de control de la capa multimedia es el
   desplegable "Medios" de la pagina (#mm-personal-media): el motor
   engancha sus items [data-media] (incluida la vista de albumes) y este
   modulo solo aporta los datos, avisado por onMediaVistaChange.

   ADR-116: capa UNIFICADA de medios (mediaUnion), chips sin "Todo"
   (Fotos/Videos/Audios/Albumes/Solo mio), fusion de las dos variantes
   con el helper del motor y repintado por zoom SIN red.
   ============================================================= */
(function () {
  'use strict';

  var DEFAULTS = {
    contenedor: 'av-map-container',
    pills: 'mm-personal-pills',
    editbar: 'mm-personal-editbar',
    lista: 'mm-personal-list'
  };

  // Vista inicial del mapa unificado (pais completo): la media de la
  // comunidad y los destinos personales estan repartidos por todo el
  // territorio, no en un solo destino.
  var UNIFICADO_CENTRO = [4.6, -74.1];
  var UNIFICADO_ZOOM = 6;

  // Estado interno del modulo (una sola instancia por pagina).
  var S = {
    opts: null,      // ids resueltos de los contenedores
    mapas: [],       // mapas tematicos del usuario
    sel: null,       // id del mapa activo (null = "Mi Mapa")
    destinos: [],    // destinos del mapa activo (para pines y lista)
    modo: null,      // id en edicion dentro del modal (null = crear)
    unificado: false // el contenedor es el mapa unico de la pagina
  };

  // Motor del mapa: instancia perezosa del modulo compartido
  // mapa-cultural.js (window.MapaCultural). Reemplaza el Leaflet propio.
  var mc = null;

  // Cache del fetch de multimedia_mapa (endpoint existente) y bandera de
  // carga. La VISTA de la capa, mediaAlbumes y el alcance propio NO viven
  // aqui: los lleva el motor compartido (window.MapaCultural), unica fuente
  // de verdad y, con persistKey, persistidos. La cache solo apunta la FIRMA
  // del dataset que contiene (modo union/legacy + alcance propio): en modo
  // union el dataset es unico y la vista de album deja de identificarlo.
  var MEDIA_CACHE = null;        // items ya cargados (null = hay que pedir)
  var MEDIA_CLAVE = null;        // firma del dataset de esa cache
  var MEDIA_CON_ALBUMES = false; // la cache se construyo con la variante pedida
  var MEDIA_CARGANDO = false;
  // ADR-116: este host enciende el modo union del motor (dos variantes del
  // mismo endpoint, fusion con SU helper). Si el motor desplegado no expone
  // mergeMedia, el modo queda inerte: se pinta solo la variante default.
  var UNION_PEDIDO = true;
  var UNION_AVISO = false;
  // Clave de preferencia PROPIA de este mapa: el home y comunidad son mapas de
  // escalas distintas, asi que el filtro no debe pegarse entre los dos.
  var PERSIST_KEY = 'mapa_filtros_comunidad_v1';
  // Derivadas del MOTOR, no paralelas. MEDIA_TOCADO pasa a true cuando
  // onFilterChange entrega un cambio de filtro que NO provoco este modulo
  // (o sea, una eleccion del usuario o de la pagina) y desde ahi este modulo
  // deja de forzar el encendido automatico de la capa. MEDIA_PROG marca el
  // cambio en curso como propio y MEDIA_FIRMA guarda la ultima firma vista
  // para no contar dos veces el mismo cambio.
  var MEDIA_TOCADO = false;
  var MEDIA_PROG = false;
  var MEDIA_FIRMA = '';

  // Set de media guardada por el usuario con claves "fuente:item_id"
  // (contrato del backend: fuente album_foto|curada y media_id). Lo puebla
  // cargarGuardados() para que el filtro de la capa media incluya los
  // bookmarks aunque su album no pertenezca a un destino del mapa.
  var SET_GUARDADOS = {};

  function logWarn(msg, e) {
    if (typeof console !== 'undefined' && console.warn) {
      console.warn('[mymapa] ' + msg, e || '');
    }
  }

  /* ---------- utilidades ---------- */
  function el(id) { return document.getElementById(id); }

  function api() {
    return (typeof API !== 'undefined' && API) ? API : '';
  }

  function usuario() {
    return (window.ExploraCO && window.ExploraCO.usuario) || null;
  }

  // Escape minimo para inyectar texto de la API en HTML.
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function toast(msg, color) {
    if (window.ExploraCO && window.ExploraCO.mostrarToast) {
      window.ExploraCO.mostrarToast(msg, color || '#FF4A00');
    }
  }

  function pedirLogin(msg) {
    if (window.ExploraCO && window.ExploraCO.mostrarLogin) {
      window.ExploraCO.mostrarLogin(msg);
      return;
    }
    if (typeof window.loginGate === 'function') window.loginGate();
    else if (typeof window.mostrarModalLogin === 'function') window.mostrarModalLogin();
  }

  // fetch -> JSON con marca de status para distinguir 403 de error de red.
  function leerJson(r) {
    return r.json().then(function (d) {
      d.__status = r.status;
      return d;
    }, function () {
      return { ok: false, error: 'Respuesta invalida', __status: r.status };
    });
  }

  // Cabeceras con Authorization: Bearer, reutilizando el helper canonico
  // de sesion (usuario-session.js, window.ExploraCO.authHeaders). Sin
  // sesion devuelve {} para no romper los fetches publicos.
  function authHeaders() {
    if (window.ExploraCO && typeof window.ExploraCO.authHeaders === 'function') {
      try { return window.ExploraCO.authHeaders() || {}; }
      catch (e) { logWarn('authHeaders', e); return {}; }
    }
    return {};
  }

  // GET -> JSON. conAuth=true adjunta Authorization: Bearer para los
  // endpoints con sesion obligatoria (p.ej. mis_guardados_media, ADR-054).
  function getJson(url, conAuth) {
    var opts = conAuth ? { headers: authHeaders() } : undefined;
    return fetch(api() + url, opts).then(leerJson);
  }

  function postJson(body) {
    return fetch(api() + '/api/interacciones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }).then(leerJson);
  }

  function findMapa(id) {
    for (var i = 0; i < S.mapas.length; i++) {
      if (S.mapas[i].id === id) return S.mapas[i];
    }
    return null;
  }

  /* ---------- mapa compartido (mapa-cultural.js) ---------- */
  // Resuelve el id del contenedor del mapa. Prioridad:
  //   1) el id que pasa la pagina, si existe en el DOM;
  //   2) el contenedor unico declarado con data-cm-mapa (mapa unificado);
  //   3) el id por defecto (modulo en pagina con su propio mapa).
  function resolverContenedor(id) {
    if (id && document.getElementById(id)) return id;
    var uni = document.querySelector('[data-cm-mapa]');
    if (uni && uni.id) return uni.id;
    return id || DEFAULTS.contenedor;
  }

  // Marca S.unificado leyendo el DOM (no el motor): el mapa unico lo crea
  // este modulo, asi que la bandera debe estar lista ANTES de ensureMC().
  function detectarUnificado() {
    var nodo = el(S.opts.contenedor);
    S.unificado = !!(nodo && nodo.getAttribute && nodo.getAttribute('data-cm-mapa') === '1');
    return S.unificado;
  }

  // Vista de la capa segun el MOTOR (unica fuente de verdad): 'sueltos'
  // (fotos/videos/audio) o 'albumes' (grupos album_grupo / destino_album).
  // Si el motor aun no esta listo se cae a su default, 'sueltos'.
  function vistaMotor() {
    var m = ensureMC();
    if (m && typeof m.getMediaVista === 'function') {
      try { return (m.getMediaVista() === 'albumes') ? 'albumes' : 'sueltos'; }
      catch (e) { logWarn('getMediaVista', e); }
    }
    return 'sueltos';
  }

  // Firma de los campos de filtro que SYMPLEN en una decision de la capa.
  // Sirve para no contar dos veces el mismo cambio en onFilterChange.
  function firmaFiltro(s) {
    if (!s) return '';
    var t = s.mediaTypes || {};
    return (s.mediaEnabled ? '1' : '0')
      + (t.foto ? 'f' : '') + (t.video ? 'v' : '') + (t.audio ? 'a' : '')
      + '|' + String(s.mediaVista || '')
      // ADR-116: albumes es una CATEGORIA mas en modo union, asi que su
      // cambio tiene que contar como decision (y dispara la reposicion de la
      // variante si la cache se construyo sin ella).
      + '|' + (s.mediaAlbumes === false ? 'a0' : 'a1')
      + '|' + (s.mediaSoloMio ? 'm' : '');
  }

  // Marca el cambio como PROPIO mientras se ejecuta: el oyente de
  // onFilterChange no lo cuenta como eleccion del usuario. El motor dispara
  // los oyentes de forma sincrona dentro del metodo, asi que el flag cubre
  // exactamente la llamada.
  function propio(fn) {
    MEDIA_PROG = true;
    try { return fn(); } finally { MEDIA_PROG = false; }
  }

  // El motor restaura su preferencia (persistKey) en su propia creacion y lo
  // hace EN SILENCIO: si hay algo guardado, esa es la decision del usuario y
  // este modulo no enciende nada por encima.
  function hayPreferenciaGuardada() {
    try {
      if (typeof localStorage === 'undefined') return false;
      var raw = localStorage.getItem(PERSIST_KEY);
      if (!raw) return false;
      var d = JSON.parse(raw);
      return !!(d && typeof d === 'object' && !Array.isArray(d));
    } catch (e) { return false; }
  }

  // Crea (una sola vez) la instancia del Mapa Cultural sobre el
  // contenedor de MyMap. list:null porque MyMap conserva su lista
  // textual; drawer:true porque el modulo crea su propio panel.
  function ensureMC() {
    if (mc) return mc;
    if (typeof window.MapaCultural === 'undefined') return null;
    var cont = el(S.opts.contenedor);
    if (!cont) return null;
    var o = {
      map: S.opts.contenedor,
      tiles: 'carto-voyager',
      list: null,
      drawer: true,
      apiBase: api(),
      // Preferencia propia de este mapa: NO comparte clave con el home porque
      // son mapas de escalas distintas (el filtro no debe pegarse entre ellos).
      persistKey: PERSIST_KEY,
      mediaFilter: S.unificado ? false : filterMisMapa,
      // ADR-116: capa UNIFICADA. Con mediaUnion el motor pide DOS variantes
      // del MISMO endpoint (default + vista=albumes) y fusiona con SU helper;
      // este host no reimplementa la clave de identidad. Opt-in: si el motor
      // desplegado no lo soporta, queda inerte y manda la ruta legacy.
      mediaUnion: UNION_PEDIDO,
      // Barra de categorias que aporta comunidad.html. Se pasa el ELEMENTO
      // (no un string) para no depender del parseo de selector: el motor
      // engancha los clicks de [data-cat] y permite filtrar/ocultar pines.
      categories: document.getElementById('mm-personal-cats'),
      // Controles de medios: el desplegable "Medios" de la barra .mapa-filters
      // (ELEMENTO, igual que categories). El motor engancha sus clicks,
      // alterna los tipos foto/video/audio y lleva la vista de albumes.
      mediaControls: document.getElementById('mm-personal-media'),
      // Los items de medios del panel son .mf-item (NO .mf-btn, que es la
      // pildora de los botones libres): sin este selector el motor no los
      // encuentra y la vista de albumes queda sin reflejar. El toggle que
      // este modulo genera en modo clasico usa .mmx-mbtn.
      mediaBtnSelector: '.mf-item[data-media],.mmx-mbtn[data-media]',
      // La barra completa: aqui viven la etiqueta y el <output> de
      // Puntaje, que no estan dentro de las raices de categorias ni medios.
      filterRoot: document.querySelector('#cpanel-mapa .mapa-filters'),
      // Toda decision de filtro pasa por el motor. Lo que llega aqui y este
      // modulo no provoco es eleccion del usuario (o de la pagina): desde ese
      // momento la capa deja de encenderse por defecto. Derivado del motor,
      // no un flag paralelo escrito a mano.
      onFilterChange: function (snap) {
        var firma = firmaFiltro(snap);
        if (firma === MEDIA_FIRMA) return;
        MEDIA_FIRMA = firma;
        if (!MEDIA_PROG) MEDIA_TOCADO = true;
        // ADR-116 D3.1: si albumes pasa a encendido y la cache se construyo
        // sin esa variante (chip apagado en la carga), hay que pedirla. En el
        // resto de cambios NO se hace red: el motor repinta su copia.
        if (!MEDIA_PROG) reponerAlbumes();
      },
      // El motor decide la vista (item [data-media="albumes"]) y aqui cambia
      // la query del fetch de esta pagina, que sigue siendo su unico
      // escritor de la capa multimedia. No hay estado paralelo de vista: se
      // lee del motor (vistaMotor) cuando hace falta armar la query.
      onMediaVistaChange: function () {
        // Modo union: mediaVista se IGNORA y el dataset es unico, asi que no
        // hay nada que volver a pedir; se repinta desde cache (cero red).
        // Ruta legacy: la vista SI cambia la query y la cache se invalida.
        if (!(mc && modoUnion(mc))) MEDIA_CACHE = null;
        sincronizarToggleMedia();
        recargarMedia();
      },
      // onMapReady llega sincrono antes de que mc quede asignado:
      // por eso se usa el mapa recibido, no mc.getMap(). Tras
      // invalidateSize(), fuera del ciclo sincrono, mc ya esta asignado.
      onMapReady: function (map) {
        setTimeout(function () {
          try { map.invalidateSize(); } catch (e) { logWarn('invalidateSize', e); }
          if (mc && typeof mc.refresh === 'function') {
            try { mc.refresh(); } catch (e) { logWarn('refresh', e); }
          }
        }, 120);
      }
    };
    if (S.unificado) {
      // Mapa unico de la pestana: arranca en vista pais y con la capa
      // multimedia encendida (paridad con el mapa audiovisual), y sin el
      // agrupado de un pin por destino que usa index.html.
      o.center = UNIFICADO_CENTRO;
      o.zoom = UNIFICADO_ZOOM;
      o.mediaEnabled = true;
      o.mediaOnePinPerDestino = false;
    }
    mc = window.MapaCultural.create(o);
    return mc;
  }

  function invalidarTamano() {
    var map = (mc && mc.getMap) ? mc.getMap() : null;
    if (!map) return;
    setTimeout(function () {
      try { map.invalidateSize(); } catch (e) { logWarn('invalidateSize', e); }
      // Encuadra los destinos del mapa activo: garantiza que la media
      // cercana quede dentro de bounds y se pinte en el primer render
      // (sin encuadre el mapa quedaba en el centro por defecto y los
      // pines de media, que si filtran por bounds, no se dibujaban).
      if (mc && S.destinos.length && typeof mc.fitBounds === 'function') {
        try { mc.fitBounds(); } catch (e) { logWarn('fitBounds', e); }
      }
      if (mc && typeof mc.refresh === 'function') {
        try { mc.refresh(); } catch (e) { logWarn('refresh', e); }
      }
    }, 120);
  }

  /* ---------- capa de media: guardados + filtro ---------- */

  // Clave del contrato del backend: "fuente:media_id". Devuelve cadena
  // vacia si el item no trae ambos campos.
  function claveGuardado(it) {
    if (!it || !it.fuente || it.media_id == null) return '';
    return String(it.fuente) + ':' + String(it.media_id);
  }

  // Filtro de la capa media de "Mis mapas": conserva el filtro estricto
  // compartido (destino/destino_album con slug activo, reutilizado desde
  // mapa-cultural.js para no duplicar la regla) y ademas incluye la media
  // guardada por el usuario (SET_GUARDADOS) sin importar su origen. Asi un
  // video o foto de album guardado aparece como pin en el mapa.
  function filterMisMapa(items, places) {
    var arr = items || [];
    var estrictos = {};
    if (window.MapaCultural && typeof window.MapaCultural.filterMediaDefault === 'function') {
      window.MapaCultural.filterMediaDefault(arr, places).forEach(function (it) {
        if (it && it.key != null) estrictos[it.key] = true;
      });
    }
    return arr.filter(function (it) {
      if (!it || !it.media_url) return false;
      var k = claveGuardado(it);
      if (k && SET_GUARDADOS[k]) return true;
      // Media propia de album (fetch scope=mio): siempre visible en el
      // mapa personal, aunque filterMediaDefault la excluya por origen.
      if (it.origen === 'album' && it._propia) return true;
      if (it.origen === 'album_grupo' && it._propia) return true;
      return !!(it.key != null && estrictos[it.key]);
    });
  }

  // Carga los bookmarks de media del usuario y re-aplica la capa para que
  // los guardados salgan como pines. No bloquea el render de destinos: si
  // falla solo registra el aviso y conserva el set cargado previamente.
  function cargarGuardados() {
    var u = usuario();
    if (!u || !u.id) { SET_GUARDADOS = {}; return; }
    // mis_guardados_media exige sesion firmada (ADR-054) y deriva el
    // usuario del token: la URL ya NO envia usuario_id. Sin token no se
    // llama al endpoint y el mapa queda como esta.
    if (!authHeaders().Authorization) return;
    getJson('/api/interacciones?tipo=mis_guardados_media', true)
      .then(function (d) {
        if (!d || !d.ok) {
          // 401 = token ausente/vencido: se conserva el set previo.
          logWarn('guardados media status ' + (d && d.__status), d && d.error);
          return;
        }
        var set = {};
        (d.data || []).forEach(function (row) {
          if (!row) return;
          set[String(row.fuente) + ':' + String(row.item_id)] = true;
        });
        SET_GUARDADOS = set;
        if (mc) {
          mc.setMedia(MEDIA_CACHE || []);
          medirMediaActiva();
        }
      })
      .catch(function (e) { logWarn('guardados media', e); });
  }

  // ---- Capa de media (multimedia_mapa) --------------------------------
  // Clave de dedupe identica a la que usa el motor (normalizeMedia de
  // mapa-cultural.js: origen:origen_id:media_url). Reutiliza el helper
  // exportado para no duplicar la regla; si no esta disponible cae al
  // mismo formato local.
  function mediaKey(it) {
    if (window.MapaCultural && typeof window.MapaCultural.normalizeMedia === 'function') {
      var n = window.MapaCultural.normalizeMedia(it);
      if (n && n.key != null) return String(n.key);
    }
    return String(it.origen || '') + ':' + String(it.origen_id || '') + ':'
      + String(it.media_url || '');
  }

  // Merge de la lista publica con la del scope=mio. Todo item que llega
  // del fetch propio queda marcado _propia = true (tambien si ya existia
  // en la publica) para que filterMisMapa/medirMediaActiva lo reconozcan.
  function mergeMediaPropia(publicos, propios) {
    var out = (publicos || []).filter(Boolean);
    var vistos = {};
    out.forEach(function (it) { vistos[mediaKey(it)] = it; });
    (propios || []).forEach(function (it) {
      if (!it) return;
      it._propia = true;
      var k = mediaKey(it);
      if (vistos[k]) vistos[k]._propia = true;
      else { vistos[k] = it; out.push(it); }
    });
    return out;
  }

  // Aplica la lista final al motor y libera el flag de carga en un solo
  // sitio (exito, fallo propio o ausencia de sesion). La CLAVE del dataset se
  // anota AQUI, con los datos que se guardan, no al pedir: si una respuesta
  // llega tarde (el usuario cambio de alcance durante el vuelo) la cache sigue
  // describiendo lo que contiene y no se sirve como si fuera otra cosa.
  function aplicarMedia(lista, clave, conAlbumes) {
    MEDIA_CARGANDO = false;
    MEDIA_CACHE = lista || [];
    MEDIA_CLAVE = clave;
    MEDIA_CON_ALBUMES = !!conAlbumes;
    var mm = ensureMC();
    if (mm) mm.setMedia(MEDIA_CACHE);
    medirMediaActiva();
    if (mm && typeof mm.refresh === 'function') mm.refresh();
  }

  // Hay sesion utilizable: el alcance propio y el merge scope=mio la exigen.
  function haySesion() {
    var u = usuario();
    return !!(u && u.id);
  }

  // Modo union del motor (ADR-116 D3): el dataset es UNO y los albumes son un
  // flag. Sin mergeMedia no hay union: se pinta solo la variante default, con
  // aviso, porque una clave de identidad local haria divergir las dos capas.
  function modoUnion(m) {
    if (!m) return false;
    if (typeof m.getMediaUnion === 'function') {
      try { return m.getMediaUnion() === true; } catch (e) { logWarn('getMediaUnion', e); }
    }
    return UNION_PEDIDO && typeof m.mergeMedia === 'function';
  }

  // Chip de albumes LEIDO del motor (mediaAlbumes, default true).
  function albumesMotor(m) {
    if (m && typeof m.getMediaAlbumes === 'function') {
      try { return m.getMediaAlbumes() !== false; } catch (e) { logWarn('getMediaAlbumes', e); }
    }
    return true;
  }

  // Alcance propio ("Solo mio") LEIDO del motor. Sin sesion el motor no deja
  // activarlo (gate de ADR-021/ADR-031): aqui solo se refleja.
  function alcancePropio(m) {
    if (!m || !haySesion()) return false;
    if (typeof m.getMediaSoloMio === 'function') {
      try { return m.getMediaSoloMio() === true; } catch (e) { logWarn('getMediaSoloMio', e); }
    }
    var es = (typeof m.getState === 'function') ? m.getState() : null;
    return !!(es && es.mediaSoloMio === true);
  }

  // Clave de la cache: MODO (union / vista legacy) + ALCANCE propio. La vista
  // de album NO entra: en modo union el dataset es unico, y una clave nueva
  // nunca puede servir una respuesta de la vista vieja.
  function claveMedia(m) {
    var alc = alcancePropio(m) ? 'p' : (haySesion() ? 'm' : 'x');
    if (modoUnion(m)) return 'u|' + alc;
    return 'l|' + vistaMotor() + '|' + alc;
  }

  function urlMedia(vistaAlb, propio) {
    var q = api() + '/api/interacciones?tipo=multimedia_mapa';
    if (propio) q += '&scope=mio';
    if (vistaAlb) q += '&vista=albumes';
    return q;
  }

  // Una variante de la capa. alcance='propia' pide SOLO scope=mio (chip "Solo
  // mio"): UNA peticion con header de sesion. alcance='todo' pide la publica y,
  // solo en la ruta legacy (extraPropia), le fusiona la propia marcada _propia,
  // que es el contrato que consume filterMisMapa. En modo union no se anade esa
  // segunda peticion: el alcance propio ya es mediaSoloMio y la capa cuesta
  // exactamente dos viajes. No captura errores: el fail-soft de cada variante
  // lo decide quien llama.
  function pedirVariante(vistaAlb, alcance, extraPropia) {
    if (alcance === 'propia') {
      return fetch(urlMedia(vistaAlb, true), { headers: authHeaders() })
        .then(leerJson)
        .then(function (d) {
          var propios = (d && d.ok && d.data) ? d.data : [];
          propios.forEach(function (it) { if (it) it._propia = true; });
          return propios;
        });
    }
    return fetch(urlMedia(vistaAlb, false))
      .then(leerJson)
      .then(function (d) {
        var publicos = (d && d.ok && d.data) ? d.data : [];
        if (!extraPropia || !haySesion()) return publicos;
        return pedirVariante(vistaAlb, 'propia', false)
          .then(function (propios) { return mergeMediaPropia(publicos, propios); })
          .catch(function (e) { logWarn('media propia', e); return publicos; });
      });
  }

  // Fusion por el HELPER DEL MOTOR (ADR-116 D3.2/D3.3): el host NO reimplementa
  // la clave de identidad. Sin helper se pinta la variante default: dos claves
  // distintas es la forma mas segura de que las dos capas divergan.
  function fusionarVariantes(m, primarias, secundarias) {
    var base = primarias || [];
    if (!secundarias || !secundarias.length) return base;
    if (m && typeof m.mergeMedia === 'function') {
      try { return m.mergeMedia(base, secundarias) || base; }
      catch (e) { logWarn('mergeMedia', e); return base; }
    }
    if (window.MapaCultural && typeof window.MapaCultural.mergeMedia === 'function') {
      try { return window.MapaCultural.mergeMedia(base, secundarias) || base; }
      catch (e2) { logWarn('mergeMedia', e2); return base; }
    }
    if (!UNION_AVISO) {
      UNION_AVISO = true;
      logWarn('motor sin mergeMedia: se pinta solo la variante default');
    }
    return base;
  }

  // Repone la variante de albumes SOLO si la cache se construyo sin ella (chip
  // apagado en la carga) y el usuario la enciende ahora. Fuera de ese caso no
  // hay red: el motor filtra su copia en cache.
  function reponerAlbumes() {
    var m = mc;
    if (!m || !modoUnion(m)) return;
    if (!albumesMotor(m) || MEDIA_CON_ALBUMES) return;
    if (!MEDIA_CACHE) return;
    recargarMedia();
  }

  // Capa de media: UN dataset fusionado en modo union y la ruta legacy intacta
  // cuando el motor no soporta union. DOS peticiones por activacion de capa o
  // cambio de alcance (la de albumes es fail-soft) y CERO por zoom: el
  // repintado de zoomend/moveend lo hace el motor desde su copia en cache.
  // scope=mio exige sesion (400 SESION_REQUERIDA sin header) y el uuid del
  // dueno se deriva de ella. Si el fetch propio falla, se conserva la publica.
  function recargarMedia(forzar) {
    var m = ensureMC();
    if (!m) return;
    var clave = claveMedia(m);
    var unido = modoUnion(m);
    var quiereAlbumes = unido && albumesMotor(m);
    // La cache sirve si es del MISMO dataset y, en modo union, si incluye la
    // variante de albumes cuando el chip esta encendido.
    var completo = !quiereAlbumes || MEDIA_CON_ALBUMES;
    if (MEDIA_CACHE && !forzar && MEDIA_CLAVE === clave && completo) {
      m.setMedia(MEDIA_CACHE);
      medirMediaActiva();
      if (typeof m.refresh === 'function') m.refresh();
      return;
    }
    if (MEDIA_CARGANDO) return;
    MEDIA_CARGANDO = true;
    var alcance = alcancePropio(m) ? 'propia' : 'todo';
    if (!unido) {
      // Ruta legacy (motor sin union): misma peticion que antes, con la vista
      // del motor en la query y el merge scope=mio de siempre. La clave ya
      // distingue vista y alcance.
      var vistaAlb = (vistaMotor() === 'albumes');
      pedirVariante(vistaAlb, alcance, true)
        .then(function (lista) { aplicarMedia(lista, clave, vistaAlb); })
        .catch(function (e) {
          logWarn('media mapa', e);
          MEDIA_CARGANDO = false;
        });
      return;
    }
    // Modo union: la variante default manda y la de vista=albumes es
    // fail-soft. Si el chip de albumes esta apagado, la segunda se omite
    // (optimizacion permitida por D3.1: no cambia ningun pixel visible).
    // Sin scope=mio son DOS peticiones; con el, las dos llevan &scope=mio.
    var pDef = pedirVariante(false, alcance, false);
    var pAlb = quiereAlbumes
      ? pedirVariante(true, alcance, false).then(function (rows) {
          if (!rows || !rows.length) { logWarn('variante albumes vacia'); return null; }
          return rows;
        }, function (e) {
          logWarn('variante albumes', e);
          return null;
        })
      : Promise.resolve(null);
    Promise.all([pDef, pAlb])
      .then(function (res) {
        var alb = res[1];
        // El flag anota que la cache se construyo PIDIENDO la variante de
        // albumes (aunque volviera vacia): asi el fail-soft no se reintenta en
        // cada cambio de filtro. Si volvio vacia se pinta la default.
        aplicarMedia(fusionarVariantes(m, res[0], alb), clave, quiereAlbumes);
      })
      .catch(function (e) {
        logWarn('media mapa', e);
        MEDIA_CARGANDO = false;
      });
  }

  // Enciende el maestro por defecto si el mapa activo tiene media y el
  // usuario no ha elegido todavia: no hay decision tomada en esta sesion
  // (MEDIA_TOCADO, derivada de onFilterChange) ni preferencia guardada por el
  // motor (persistKey). Nunca se pisa una eleccion ya hecha.
  function medirMediaActiva() {
    var m = ensureMC();
    if (!m) return;
    var hay = false;
    if (S.unificado) {
      // Mapa unificado: la capa multimedia ES la de la comunidad (misma
      // fuente que el mapa AV). Si hay items se enciende para que ambos
      // origenes se vean a la vez; el filtro por tipo lo gobiernan los
      // botones del panel, no este modulo.
      hay = !!(MEDIA_CACHE && MEDIA_CACHE.length);
    } else {
      var slugs = {};
      S.destinos.forEach(function (d) { if (d && d.slug) slugs[d.slug] = true; });
      (MEDIA_CACHE || []).forEach(function (it) {
        if (hay || !it) return;
        var k = claveGuardado(it);
        if (k && SET_GUARDADOS[k]) { hay = true; return; }
        if (it.origen === 'album' || it.origen === 'album_grupo') {
          if (it._propia) hay = true;
          return;
        }
        if ((it.origen === 'destino' || it.origen === 'destino_album') && it.origen_id && slugs[it.origen_id]) hay = true;
      });
    }
    // Fuerza el encendido maestro cuando hay media para el mapa activo,
    // sin importar el estado previo: setMediaEnabled(true) rellena los
    // tipos (foto/video/audio) si estan en cero y vuelve a renderizar,
    // de modo que la capa no queda "marcada pero vacia".
    if (hay && !MEDIA_TOCADO && !hayPreferenciaGuardada()) {
      propio(function () { m.setMediaEnabled(true); });
      if (typeof m.refresh === 'function') m.refresh();
    }
    sincronizarToggleMedia();
  }

  function asegurarToggleMedia() {
    // Mapa unificado: los controles de media son los items [data-media] del
    // desplegable que trae la pagina (#mm-personal-media), y los engancha
    // el motor con mediaControls. No se crea el toggle duplicado .mmx-media
    // para no tener dos superficies de estado sobre la misma capa. En modo
    // clasico se conserva tal cual: la caja que se genera aqui es la MISMA
    // que el motor recibe en mediaControls, asi que el motor es el unico que
    // engancha sus clicks y el unico dueno del estado.
    // ADR-116: en los dos modos la fila lleva "Solo mio", que si no existe se
    // crea (uno solo por documento) y lo gobierna este modulo con gate.
    if (S.unificado) {
      var cajaPagina = document.getElementById('mm-personal-media');
      if (cajaPagina) asegurarChipMio(cajaPagina);
      return;
    }
    var existente = document.getElementById('mm-personal-media');
    if (existente) { existente.style.display = ''; asegurarChipMio(existente); return; }
    var card = document.querySelector('.mmx-card');
    if (!card) return;
    var head = card.querySelector('.mmx-head');
    var box = document.createElement('div');
    box.id = 'mm-personal-media';
    box.className = 'mmx-media';
    // CONTRATO UNICO de markup (ADR-116): la fila ofrece Fotos, Videos,
    // Audios, Albumes y "Solo mio". NO se pinta "Todo": el maestro es el boton
    // principal del panel y la rama 'all' queda inerte para hosts externos.
    // Los tipos y albumes llevan data-media (el mismo contrato de index.html y
    // comunidad.html) y los engancha el motor; el de ALBUMES no llama a
    // setMediaVista: lo gobierna mediaAlbumes. "Solo mio" usa data-mm-mio para
    // no chocar con el selector del motor.
    box.innerHTML = '<span class="mmx-media-lbl">Media</span>'
      + '<button type="button" class="mmx-mbtn" data-media="foto">Fotos</button>'
      + '<button type="button" class="mmx-mbtn" data-media="video">Videos</button>'
      + '<button type="button" class="mmx-mbtn" data-media="audio">Audios</button>'
      + '<button type="button" class="mmx-mbtn" data-media="albumes">&#x1F4DA; &#xC1;lbumes</button>';
    if (head && head.parentNode === card) card.insertBefore(box, head.nextSibling);
    else card.appendChild(box);
    asegurarChipMio(box);
  }

  // Chip "Solo mio": UNO solo en el documento. Si ya existe (el del panel de la
  // pagina o una pasada previa) se enlaza ese; si no, se crea al final de la
  // fila. Enciende la capa si estaba apagada y conserva el gate de sesion del
  // motor (ADR-116 D4.iv): sin sesion no se activa y se pide login.
  function asegurarChipMio(box) {
    if (!box) return null;
    var chip = document.getElementById('mm-personal-mio');
    if (!chip) chip = box.querySelector('[data-mm-mio]');
    if (!chip) {
      chip = document.createElement('button');
      chip.type = 'button';
      chip.id = 'mm-personal-mio';
      chip.className = (box.className && box.className.indexOf('mmx-media') >= 0)
        ? 'mmx-mbtn' : 'mf-item';
      chip.setAttribute('data-mm-mio', '1');
      chip.textContent = 'Solo mio';
      box.appendChild(chip);
    }
    if (chip.__mmMio) return chip;
    chip.__mmMio = true;
    chip.addEventListener('click', function (e) {
      if (e && e.preventDefault) e.preventDefault();
      alternarSoloMio();
    });
    return chip;
  }

  // "Solo mio" (ADR-116 D4.iv): enciende la capa si estaba apagada, delega el
  // flag en el motor (setMediaSoloMio) y recarga porque el alcance propio entra
  // en la clave de cache. Sin sesion NO se activa: no hay modo publico
  // alternativo.
  function alternarSoloMio() {
    var m = ensureMC();
    if (!m) return false;
    var quiero = !alcancePropio(m);
    if (quiero && !haySesion()) {
      pedirLogin('Inicia sesion para ver solo tu media');
      return false;
    }
    if (typeof m.setMediaSoloMio === 'function') {
      var real = false;
      try { real = m.setMediaSoloMio(quiero) === true; }
      catch (e) { logWarn('setMediaSoloMio', e); }
      // El motor tiene el gate de sesion: si lo rechaza, no se marca.
      if (quiero && real !== true) {
        pedirLogin('Inicia sesion para ver solo tu media');
        sincronizarToggleMedia();
        return false;
      }
    }
    var es = (typeof m.getState === 'function') ? m.getState() : null;
    if (quiero && (!es || !es.mediaEnabled)) {
      propio(function () { m.setMediaEnabled(true); });
    }
    sincronizarToggleMedia();
    recargarMedia();
    return true;
  }

  // Pinta el estado de los controles de media LEYENDOLO DEL MOTOR. En modo
  // union el chip data-media="albumes" es una CATEGORIA (mediaAlbumes, default
  // true) y en la ruta legacy sigue siendo la vista (mediaVista). Se acepta
  // tambien data-vista (el atributo que el markup genero antes) para no romper
  // si aparece en algun lado. La ETIQUETA la calcula el motor (getMediaLabel,
  // ADR-116 D6): el host deja de derivar el texto.
  function sincronizarToggleMedia() {
    var box = document.getElementById('mm-personal-media');
    if (!box) return;
    asegurarChipMio(box);
    var m = ensureMC();
    var estado = (m && typeof m.getState === 'function')
      ? m.getState()
      : { mediaEnabled: false, mediaTypes: {}, mediaVista: 'sueltos' };
    var unido = !!(estado && estado.mediaUnion === true) || modoUnion(m);
    var esAlbumes = unido
      ? !!(estado && estado.mediaAlbumes === true)
      : !!(estado && estado.mediaVista === 'albumes');
    var btns = box.querySelectorAll('[data-media],[data-vista]');
    for (var i = 0; i < btns.length; i++) {
      var b = btns[i];
      if (!b.classList) continue;
      var t = b.getAttribute('data-media');
      if (t != null) {
        if (t === 'all') b.classList.toggle('on', !!estado.mediaEnabled);
        else if (t === 'albumes') b.classList.toggle('on', esAlbumes);
        else b.classList.toggle('on', !!(estado.mediaTypes && estado.mediaTypes[t]));
        continue;
      }
      var v = b.getAttribute('data-vista');
      if (v != null) b.classList.toggle('on', esAlbumes && v === 'albumes');
    }
    var mios = box.querySelectorAll('[data-mm-mio]');
    for (var j = 0; j < mios.length; j++) {
      if (mios[j].classList) mios[j].classList.toggle('on', !!(estado && estado.mediaSoloMio));
    }
    var lbl = box.querySelector('.mmx-media-lbl');
    if (lbl && m && typeof m.getMediaLabel === 'function') {
      try { lbl.textContent = m.getMediaLabel(); }
      catch (ee) { logWarn('getMediaLabel', ee); }
    }
  }

  /* ---------- render: pills / editbar / lista ---------- */
  function renderPills() {
    var pills = el(S.opts.pills);
    if (!pills) return;
    var html = '<button type="button" class="mmx-pill' + (S.sel ? '' : ' on')
      + '" data-mm-id="mi">\uD83D\uDDFA\uFE0F Mi Mapa'
      + (S.sel ? '' : (S.destinos.length ? ' <span class="mmx-pill-n">' + S.destinos.length + '</span>' : ''))
      + '</button>';
    S.mapas.forEach(function (m) {
      html += '<button type="button" class="mmx-pill' + (S.sel === m.id ? ' on' : '')
        + '" data-mm-id="' + esc(String(m.id)) + '" title="' + esc(m.descripcion || '') + '">'
        + esc(m.emoji || '\uD83D\uDDFA\uFE0F') + ' ' + esc(m.nombre)
        + ' <span class="mmx-pill-n">' + (m.n_destinos != null ? m.n_destinos : 0) + '</span>'
        + ' ' + (m.publico ? '\uD83C\uDF0D' : '\uD83D\uDD12')
        + '</button>';
    });
    pills.innerHTML = html;
  }

  function renderEditbar() {
    var eb = el(S.opts.editbar);
    if (!eb) return;
    var m = S.sel ? findMapa(S.sel) : null;
    if (!m) {
      eb.style.display = 'none';
      eb.innerHTML = '';
      return;
    }
    eb.style.display = 'flex';
    var id = esc(String(m.id));
    var pub = !!m.publico;
    eb.innerHTML = '<span class="mmx-eb-name">' + esc(m.emoji || '\uD83D\uDDFA\uFE0F') + ' ' + esc(m.nombre) + '</span>'
      + '<button type="button" class="mmx-ebtn" data-mm-act="pub" data-mm-id="' + id + '" data-mm-pub="' + (pub ? '0' : '1') + '">'
      + (pub ? '\uD83D\uDD12 Hacer privado' : '\uD83C\uDF0D Hacer publico') + '</button>'
      + '<button type="button" class="mmx-ebtn" data-mm-act="edit" data-mm-id="' + id + '">Editar</button>'
      + '<button type="button" class="mmx-ebtn" data-mm-act="share" data-mm-id="' + id + '">Compartir</button>'
      + '<button type="button" class="mmx-ebtn mmx-ebtn-danger" data-mm-act="del" data-mm-id="' + id + '">Eliminar</button>'
      + '<button type="button" class="mmx-ebtn" data-mm-act="close">Cerrar</button>';
  }

  function renderList(errMsg) {
    var lista = el(S.opts.lista);
    if (!lista) return;
    if (errMsg) {
      lista.innerHTML = '<div class="mmx-empty">' + esc(errMsg) + '</div>';
      return;
    }
    if (!S.destinos.length) {
      lista.innerHTML = '<div class="mmx-empty">'
        + (S.sel ? 'Este mapa aun no tiene destinos.'
                 : 'Todavia no tienes lugares guardados. Usa el corazon en cualquier destino.')
        + '</div>';
      return;
    }
    var html = '<div class="mmx-list-title">' + (S.sel ? 'Destinos del mapa' : 'Tus guardados')
      + ' (' + S.destinos.length + ')</div>';
    html += S.destinos.map(function (d) {
      var nombre = esc(d.nombre || 'Destino');
      var ciudad = d.ciudad ? ' <span class="mmx-li-city">' + esc(d.ciudad) + '</span>' : '';
      if (d.slug) {
        return '<a class="mmx-item" href="/' + esc(d.slug) + '.html">' + nombre + ciudad + '</a>';
      }
      return '<div class="mmx-item">' + nombre + ciudad + '</div>';
    }).join('');
    lista.innerHTML = html;
  }

  function renderGuest() {
    S.mapas = [];
    S.sel = null;
    S.destinos = [];
    SET_GUARDADOS = {};
    var pills = el(S.opts.pills);
    if (pills) {
      pills.innerHTML = '<span class="mmx-empty">Inicia sesion para crear tus mapas</span>'
        + '<button type="button" class="mmx-login" data-mm-login="1">Iniciar sesion</button>';
    }
    var eb = el(S.opts.editbar);
    if (eb) { eb.style.display = 'none'; eb.innerHTML = ''; }
    var lista = el(S.opts.lista);
    if (lista) lista.innerHTML = '';
    var m = ensureMC();
    if (S.unificado) {
      // Mapa unificado: el invitado no tiene mapa personal, pero la media
      // audiovisual sigue siendo PUBLICA y debe seguir viendo en el
      // mismo mapa. Se limpian solo los lugares y se recarga la capa con
      // el fetch publico (sin scope=mio: recargarMedia lo omite si no hay
      // sesion). No se tocan los tipos ni el maestro de la capa: los gobiernan
      // los botones del panel y medirMediaActiva respeta la ultima eleccion.
      if (m) m.setPlaces([]);
      recargarMedia();
      var catsU = document.getElementById('mm-personal-cats');
      if (catsU) catsU.style.display = 'none';
      invalidarTamano();
      return;
    }
    if (m) { m.setPlaces([]); m.setMedia([]); }
    var map = (m && m.getMap) ? m.getMap() : null;
    if (map) map.setView([4.5, -74.0], 5);
    var box = document.getElementById('mm-personal-media');
    if (box) box.style.display = 'none';
    var cats = document.getElementById('mm-personal-cats');
    if (cats) cats.style.display = 'none';
    invalidarTamano();
  }

  /* ---------- carga de datos ---------- */
  function refresh() {
    var cont = el(S.opts.contenedor);
    if (!cont) return;
    var u = usuario();
    if (!u || !u.id) { renderGuest(); return; }
    // Re-muestra los controles que renderGuest() oculto si se inicio
    // sesion en caliente (guest -> login) sin recargar la pagina.
    var catsOn = document.getElementById('mm-personal-cats');
    if (catsOn) catsOn.style.display = '';
    getJson('/api/interacciones?tipo=mapas_mios&usuario_id=' + encodeURIComponent(u.id))
      .then(function (d) {
        if (!d || !d.ok) {
          toast((d && d.error) || 'No se pudieron cargar tus mapas', '#ef4444');
          return;
        }
        S.mapas = d.data || [];
        if (S.sel && !findMapa(S.sel)) S.sel = null;
        renderPills();
        renderEditbar();
        cargarGuardados();
        loadDestinos();
      })
      .catch(function () { toast('Error de red al cargar tus mapas', '#ef4444'); });
  }

  // Aplica los destinos activos al motor del mapa y recarga su capa de
  // media (cacheada). La lista textual sigue usando S.destinos crudo.
  function aplicarDestinos() {
    var m = ensureMC();
    if (m) m.setPlaces(S.destinos);
    asegurarToggleMedia();
    recargarMedia();
  }

  // Carga los destinos del mapa activo. Reutiliza un solo fetch tanto para
  // los pines del mapa como para la lista textual (nada duplicado).
  function loadDestinos() {
    var u = usuario();
    if (!u || !u.id) return;
    var esMiMapa = !S.sel;
    var url = esMiMapa
      ? '/api/interacciones?tipo=mapa&usuario_id=' + encodeURIComponent(u.id)
      : '/api/interacciones?tipo=mapa_detalle&id=' + encodeURIComponent(S.sel) + '&usuario_id=' + encodeURIComponent(u.id);
    getJson(url).then(function (d) {
      if (!d || !d.ok) {
        S.destinos = [];
        var msg = 'No se pudo cargar el mapa.';
        if (d && d.__status === 403) msg = 'Este mapa es privado y no te pertenece.';
        else if (d && d.error) msg = d.error;
        renderPills(); renderList(msg); aplicarDestinos(); invalidarTamano();
        return;
      }
      if (esMiMapa) {
        // Mi Mapa (Fase 1): fusiona guardados + visitados para poder ver y
        // filtrar los lugares ya visitados. Dedup por slug/destino_id/id y
        // marca visitado=true cuando el lugar esta en la lista de visitados.
        var claves = {};
        var fusion = [];
        var pushUnico = function (p, esVisita) {
          if (!p) return;
          var k = String(p.slug || p.destino_id || p.id || '');
          if (!k) return;
          if (claves[k]) { if (esVisita) claves[k].visitado = true; return; }
          p.visitado = !!esVisita;
          claves[k] = p;
          fusion.push(p);
        };
        ((d.data && d.data.guardados) || []).forEach(function (p) { pushUnico(p, false); });
        ((d.data && d.data.visitados) || []).forEach(function (p) { pushUnico(p, true); });
        S.destinos = fusion;
      } else {
        S.destinos = (d.data && d.data.destinos) || [];
      }
      renderPills(); renderList(''); aplicarDestinos(); invalidarTamano();
    }).catch(function (e) {
      logWarn('loadDestinos', e);
      S.destinos = [];
      renderPills(); renderList('Error de red al cargar el mapa.'); aplicarDestinos(); invalidarTamano();
    });
  }

  /* ---------- seleccion / acciones ---------- */
  function select(id) {
    if (!usuario()) { pedirLogin('Inicia sesion para organizar tus mapas'); return; }
    S.sel = id || null;
    renderPills();
    renderEditbar();
    loadDestinos();
  }

  function togglePublico(id, pub) {
    var u = usuario();
    if (!u) return;
    postJson({ tipo: 'mapa_editar', usuario_id: u.id, mapa_id: id, publico: !!pub })
      .then(function (d) {
        if (d && d.ok) {
          toast(pub ? 'Mapa publico' : 'Mapa privado', '#16a34a');
          refresh();
        } else {
          toast((d && d.error) || 'No se pudo actualizar el mapa', '#ef4444');
        }
      })
      .catch(function () { toast('Error de red al actualizar el mapa', '#ef4444'); });
  }

  function compartir(id) {
    var m = findMapa(id);
    if (!m) { toast('Mapa no encontrado', '#ef4444'); return; }
    if (!m.publico) { toast('Primero haz el mapa publico para compartirlo', '#FF4A00'); return; }
    var url = (window.location.origin || 'https://exploraco.vercel.app')
      + '/mapas.html?id=' + encodeURIComponent(id);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(function () {
        toast('Link copiado', '#16a34a');
      }, function () { window.prompt('Copia el link de tu mapa:', url); });
    } else {
      window.prompt('Copia el link de tu mapa:', url);
    }
  }

  function eliminar(id) {
    var u = usuario();
    if (!u) return;
    var m = findMapa(id);
    var nombre = (m && m.nombre) ? m.nombre : 'este mapa';
    if (!window.confirm('Eliminar ' + nombre + '? Tus lugares guardados en Mi Mapa NO se borran.')) return;
    postJson({ tipo: 'mapa_eliminar', usuario_id: u.id, mapa_id: id })
      .then(function (d) {
        if (d && d.ok) {
          if (S.sel === id) S.sel = null;
          toast('Mapa eliminado', '#16a34a');
          refresh();
        } else {
          toast((d && d.error) || 'No se pudo eliminar el mapa', '#ef4444');
        }
      })
      .catch(function () { toast('Error de red al eliminar el mapa', '#ef4444'); });
  }

  /* ---------- modal crear/editar ---------- */
  function onKeyEsc(e) {
    if (e.key === 'Escape') cerrarModal();
  }

  function cerrarModal() {
    var d = el('mm-personal-modal');
    if (d) d.remove();
    document.body.style.overflow = '';
    document.removeEventListener('keydown', onKeyEsc);
    S.modo = null;
  }

  function openModal(m) {
    var u = usuario();
    if (!u) { pedirLogin('Inicia sesion para crear tus mapas'); return; }
    cerrarModal();
    S.modo = m ? m.id : null;
    var ov = document.createElement('div');
    ov.id = 'mm-personal-modal';
    ov.className = 'mm-personal-modal';
    var pubBox = m
      ? '<label class="mm-personal-check"><input id="mm-personal-publico" type="checkbox"'
        + (m.publico ? ' checked' : '') + '><span>\uD83C\uDF0D Mapa publico (visible en /mapas.html)</span></label>'
      : '';
    ov.innerHTML = '<div class="mm-personal-box" role="dialog" aria-modal="true" aria-label="'
      + (m ? 'Editar mapa' : 'Nuevo mapa') + '">'
      + '<div class="mm-personal-head">' + (m ? 'Editar mapa' : 'Nuevo mapa') + '</div>'
      + '<label class="mm-personal-lbl">NOMBRE *</label>'
      + '<input id="mm-personal-nombre" class="mm-personal-inp" maxlength="80" value="'
      + (m ? esc(m.nombre) : '') + '" placeholder="Ruta gastronomica">'
      + '<label class="mm-personal-lbl">EMOJI (opcional)</label>'
      + '<input id="mm-personal-emoji" class="mm-personal-inp" maxlength="8" value="'
      + (m ? esc(m.emoji || '') : '\uD83D\uDDFA\uFE0F') + '">'
      + '<label class="mm-personal-lbl">DESCRIPCION (opcional)</label>'
      + '<textarea id="mm-personal-desc" class="mm-personal-inp" rows="3" maxlength="1000">'
      + (m ? esc(m.descripcion || '') : '') + '</textarea>'
      + pubBox
      + '<div class="mm-personal-actions">'
      + '<button type="button" class="mm-personal-btn ghost" id="mm-personal-cancel">Cancelar</button>'
      + '<button type="button" class="mm-personal-btn" id="mm-personal-save">' + (m ? 'Guardar' : 'Crear') + '</button>'
      + '</div></div>';
    document.body.appendChild(ov);
    document.body.style.overflow = 'hidden';
    ov.addEventListener('click', function (e) { if (e.target === ov) cerrarModal(); });
    document.addEventListener('keydown', onKeyEsc);
    var cancel = el('mm-personal-cancel');
    if (cancel) cancel.addEventListener('click', cerrarModal);
    var save = el('mm-personal-save');
    if (save) save.addEventListener('click', guardar);
    setTimeout(function () { var n = el('mm-personal-nombre'); if (n) n.focus(); }, 50);
  }

  function openNuevo() { openModal(null); }
  function openEditar(id) { openModal(findMapa(id)); }

  function guardar() {
    var u = usuario();
    if (!u) return;
    var nEl = el('mm-personal-nombre');
    var nombre = nEl ? nEl.value : '';
    if (!nombre.trim()) {
      toast('Ponle un nombre al mapa', '#ef4444');
      if (nEl) nEl.focus();
      return;
    }
    var body = { usuario_id: u.id, nombre: nombre.trim().slice(0, 80) };
    var eEl = el('mm-personal-emoji'), dEl = el('mm-personal-desc');
    var emoji = eEl ? eEl.value : '', desc = dEl ? dEl.value : '';
    if (emoji.trim()) body.emoji = emoji.trim().slice(0, 8);
    if (desc.trim()) body.descripcion = desc.trim().slice(0, 1000);
    var editId = S.modo;
    if (editId) {
      body.tipo = 'mapa_editar';
      body.mapa_id = editId;
      var pEl = el('mm-personal-publico');
      body.publico = !!(pEl && pEl.checked);
    } else {
      body.tipo = 'mapa_crear';
    }
    postJson(body).then(function (d) {
      if (d && d.ok) {
        cerrarModal();
        toast(editId ? 'Mapa actualizado' : 'Mapa creado', '#16a34a');
        refresh();
      } else {
        toast((d && d.error) || 'No se pudo guardar el mapa', '#ef4444');
      }
    }).catch(function () { toast('Error de red al guardar el mapa', '#ef4444'); });
  }

  /* ---------- binding (una sola vez) ---------- */
  function bind() {
    var pills = el(S.opts.pills);
    if (pills) {
      pills.addEventListener('click', function (e) {
        var t = e.target;
        if (!t || !t.closest) return;
        if (t.closest('[data-mm-login]')) { pedirLogin('Inicia sesion para crear tus mapas'); return; }
        var b = t.closest('[data-mm-id]');
        if (!b) return;
        var v = b.getAttribute('data-mm-id');
        select(v === 'mi' ? null : v);
      });
    }
    var eb = el(S.opts.editbar);
    if (eb) {
      eb.addEventListener('click', function (e) {
        var t = e.target;
        if (!t || !t.closest) return;
        var b = t.closest('[data-mm-act]');
        if (!b) return;
        var act = b.getAttribute('data-mm-act');
        var id = b.getAttribute('data-mm-id');
        if (act === 'pub') togglePublico(id, b.getAttribute('data-mm-pub') === '1');
        else if (act === 'edit') openEditar(id);
        else if (act === 'share') compartir(id);
        else if (act === 'del') eliminar(id);
        else if (act === 'close') select(null);
      });
    }
  }

  /* ---------- API publica ---------- */
  function init(opts) {
    opts = opts || {};
    S.opts = {
      contenedor: resolverContenedor(opts.contenedor || DEFAULTS.contenedor),
      pills: opts.pills || DEFAULTS.pills,
      editbar: opts.editbar || DEFAULTS.editbar,
      lista: opts.lista || DEFAULTS.lista
    };
    var cont = el(S.opts.contenedor);
    if (!cont) return; // no-op: la pagina no tiene el modulo
    if (!cont.__mmBound) { // idempotente: bind una sola vez
      cont.__mmBound = true;
      bind();
    }
    // La bandera va antes del motor: decide filtro de media, toggle
    // duplicado y punto de vista inicial.
    detectarUnificado();
    asegurarToggleMedia();
    // Crea el mapa aqui (y no de forma perezosa) para que la pagina pueda
    // engancharse a la MISMA instancia con MyMap.getMap() el mismo ciclo:
    // asi no se inicializa un segundo Leaflet sobre el mismo contenedor.
    ensureMC();
    refresh();
  }

  /* ---------- puente con la pagina (mapa unificado) ---------- */

  // Instancia Leaflet del mapa (null si la pagina no tiene el modulo).
  function getMap() {
    return (mc && mc.getMap) ? mc.getMap() : null;
  }

  // Instancia del motor compartido creada aqui. La pagina se engancha a
  // ESTA instancia (onFilterChange / setRatingMin): usar la facade estatica
  // window.MapaCultural crearia una instancia por defecto distinta, con otro
  // mapa. Devuelve null hasta que init() haya corrido.
  function getMC() {
    return mc;
  }

  // true si este modulo esta a cargo del mapa unico de la pagina.
  function esUnificado() {
    return !!S.unificado;
  }

  // Filtro por tipo de la capa multimedia (fotos/videos/audio). Lo usan los
  // botones del panel: el estado vive en el motor compartido para que los
  // pines personales nunca se mezclen con el filtro de media.
  function setMediaTipos(obj) {
    var m = ensureMC();
    if (!m || !obj) return false;
    // Decision de la pagina/usuario: no se marca como propia, asi que el
    // oyente de onFilterChange la cuenta y la capa deja de encenderse sola.
    m.setMediaTypes(obj);
    sincronizarToggleMedia();
    return true;
  }

  // Vista de la capa: 'sueltos' (media individual) o 'albumes' (grupos).
  // El estado lo lleva el motor compartido (item [data-media="albumes"] del
  // panel); aqui solo se delega. Con mediaUnion el motor IGNORA esta vista y
  // fuerza 'sueltos' (ADR-116 D3.4): un host antiguo no puede reintroducir la
  // exclusion de albumes. Ningun manejador local la fuerza.
  function setMediaVista(vista) {
    var m = ensureMC();
    if (!m || typeof m.setMediaVista !== 'function') return null;
    return m.setMediaVista(vista === 'albumes' ? 'albumes' : 'sueltos');
  }

  // Relanza la carga de la capa multimedia (misma fuente que usa el mapa).
  // Unica via de red de la capa: dos peticiones por activacion o cambio de
  // alcance y NINGUNA por zoom (el repintado sale de la copia en cache).
  function refrescarMedia() {
    if (!ensureMC()) return false;
    recargarMedia();
    return true;
  }

  // Boton "Mi ubicacion" de la barra de filtros de comunidad.html. El boton es
  // MARKUP ESTATICO de la pagina (id="mf-locate", ADR-006: el baseline es el
  // archivo real, no lo que inyecta el JS); aqui solo vive el handler de su
  // onclick. Reusa la instancia que creo ensureMC(): el motor ya pinta el pin
  // del usuario en las coordenadas exactas y hace el flyTo. Nunca se crea una
  // segunda instancia de MapaCultural (esa caeria en otro mapa, con otra capa).
  function geolocate() {
    if (!mc || typeof mc.geolocate !== 'function') return false;
    mc.geolocate();
    return true;
  }

  window.MyMap = {
    init: init,
    refresh: refresh,
    openNuevo: openNuevo,
    getMap: getMap,
    getMC: getMC,
    geolocate: geolocate,
    esUnificado: esUnificado,
    setMediaTipos: setMediaTipos,
    setMediaVista: setMediaVista,
    refrescarMedia: refrescarMedia
  };
})();
