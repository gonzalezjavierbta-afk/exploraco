/* =====================================================================
   cartas-ui.js  --  Modulo compartido de UI de cartas (LATAWEL)
   Regla de No-Duplicidad: las tres vistas que pintan cartas (album
   privado en mi-perfil.html, vitrina publica en perfil.html y libro
   del mercado en mercado.js) consumen ESTE fichero. Nadie reimplementa
   etiquetas, colores ni badges por su cuenta.

   Scope: navegador, vanilla puro, sin dependencias, IIFE.
   Expone: window.CartasUI

   Lo que NO vive aqui (a proposito):
   - El catalogo de cartas (vive en cartas_catalogo, llega por API).
   - El coste en XP de la fusion (lo devuelve el servidor en
     fusion_coste_xp; la UI lo lee de la respuesta y si no llega lo
     oculta, nunca lo inventa).
   - Las clases .r-comun/.r-raro/.r-epico/.r-dorado (ya existen en el
     CSS del perfil; aqui solo se referencian).

   ASCII-safe (ADR-002): cero bytes > 127. Los emojis de los emisores
   van como entidades HTML numericas, nunca como caracteres literales.
   ===================================================================== */
(function (w) {
  'use strict';

  /* Techo del museo publico (migracion 061 / MUSEO_TOPE del backend). */
  var TOPE_MUSEO = 12;

  /* ------------------------------------------------------------------
     Emisores de carta. `icono` es una entidad HTML, no un caracter.
     ------------------------------------------------------------------ */
  var EMISORES = {
    sistema: { label: 'Sistema', icono: '&#127918;' },
    ugc: { label: 'Creador de la comunidad', icono: '&#127912;' },
    marca: { label: 'Marca aliada', icono: '&#129309;' }
  };

  /* Rarezas: `clase` es EXACTAMENTE la que ya usa el CSS del perfil. */
  var RAREZAS = {
    comun: { label: 'Comun', clase: 'r-comun' },
    raro: { label: 'Raro', clase: 'r-raro' },
    epico: { label: 'Epico', clase: 'r-epico' },
    dorado: { label: 'Dorado', clase: 'r-dorado' }
  };

  /* Variantes: `base` no anade clase; `shiny` anade .c-shiny. */
  var VARIANTES = {
    base: { label: 'Base', clase: '' },
    shiny: { label: 'Shiny', clase: 'c-shiny' }
  };

  /* ------------------------------------------------------------------
     esc(s): escape de HTML basico. Tolerante a null/undefined.
     Todo dato de servidor que acabe en innerHTML pasa por aqui.
     ------------------------------------------------------------------ */
  function esc(s) {
    if (s === null || s === undefined) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /* ------------------------------------------------------------------
     claseRareza(rareza, variante) -> cadena de clases combinada.
     Tolerante: valor desconocido o nulo cae a `comun`.
     ------------------------------------------------------------------ */
  function claseRareza(rareza, variante) {
    var rKey = String(rareza === null || rareza === undefined ? '' : rareza)
      .toLowerCase().trim();
    var r = RAREZAS[rKey] || RAREZAS.comun;
    var vKey = String(variante === null || variante === undefined ? '' : variante)
      .toLowerCase().trim();
    var v = VARIANTES[vKey];
    if (v && v.clase) return r.clase + ' ' + v.clase;
    return r.clase;
  }

  /* ------------------------------------------------------------------
     badgeEmisor(emisorTipo, marcaNombre) -> HTML del badge.
     Con emisorTipo 'marca' y nombre de marca, el texto es la marca.
     ------------------------------------------------------------------ */
  function badgeEmisor(emisorTipo, marcaNombre) {
    var key = String(emisorTipo === null || emisorTipo === undefined ? '' : emisorTipo)
      .toLowerCase().trim();
    var e = EMISORES[key] || EMISORES.sistema;
    var texto = e.label;
    if (key === 'marca') {
      var mn = marcaNombre === null || marcaNombre === undefined
        ? '' : String(marcaNombre).trim();
      if (mn) texto = mn;
    }
    return '<span class="c-badge-emisor">' + e.icono + ' ' + esc(texto) + '</span>';
  }

  /* ------------------------------------------------------------------
     statsTexto(statsJson) -> efectos legibles, texto corto.
     Acepta el objeto ya parseado o el string JSON del servidor.
     Claves conocidas: bonus_xp_pct, capacidad_gate. El resto se ignora.
     ------------------------------------------------------------------ */
  function statsTexto(statsJson) {
    var obj = statsJson;
    if (typeof obj === 'string') {
      var raw = obj.trim();
      if (!raw) return '';
      try {
        obj = JSON.parse(raw);
      } catch (eParse) {
        return '';
      }
    }
    if (!obj || typeof obj !== 'object' || Object.prototype.toString.call(obj) === '[object Array]') {
      return '';
    }
    var partes = [];
    var xp = obj.bonus_xp_pct;
    if (xp !== null && xp !== undefined && xp !== '' && isFinite(Number(xp))) {
      var n = Number(xp);
      if (n !== 0) partes.push((n > 0 ? '+' : '') + n + '% XP');
    }
    if (obj.capacidad_gate) partes.push('Desbloquea capacidad');
    return partes.join(' - ');
  }

  /* ------------------------------------------------------------------
     urlMuseo(usuarioId) -> lectura del museo de cartas equipadas.
     Rama del backend: GET /api/usuarios?tipo=museo_cartas.
     OJO: el antiguo nombre de este tipo ya esta tomado en
     api/interacciones.js por la lectura del arbol de casas del perfil
     publico, que NO son cartas. Por eso aqui se usa museo_cartas, cuyo
     handler vive en api/usuarios.js. El contrato de fetchMuseo no cambia:
     {ok:true, cartas, tope} / {ok:false, error}.
     ------------------------------------------------------------------ */
  function urlMuseo(usuarioId) {
    var id = usuarioId === null || usuarioId === undefined ? '' : String(usuarioId);
    return '/api/usuarios?tipo=museo_cartas&usuario_id=' + encodeURIComponent(id);
  }

  function normalizar(data) {
    var d = data && typeof data === 'object' ? data : {};
    var cartas = d.cartas;
    if (Object.prototype.toString.call(cartas) !== '[object Array]') cartas = [];
    var tope = Number(d.museo_tope);
    if (!isFinite(tope) || tope <= 0) tope = TOPE_MUSEO;
    return { ok: true, cartas: cartas, tope: tope };
  }

  /* Lee una Response y NUNCA rechaza: degrada a {ok:false, error:...}. */
  function leerMuseo(res) {
    var st = res && res.status ? Number(res.status) : 0;
    if (st === 403) return Promise.resolve({ ok: false, error: 'PERFIL_PRIVADO' });
    if (st === 503) return Promise.resolve({ ok: false, error: 'SCHEMA_NOT_MIGRATED' });
    var cuerpo;
    try {
      cuerpo = res.json();
    } catch (eJson) {
      return Promise.resolve({ ok: false, error: 'RESPUESTA_INVALIDA' });
    }
    return Promise.resolve(cuerpo).then(function (j) {
      if (st === 404) return { ok: false, error: 'NO_ENCONTRADO' };
      if (!res || !res.ok || !j || j.ok !== true) {
        var code = j ? (j.error || (j.data && j.data.error)) : null;
        return { ok: false, error: code ? String(code) : 'SERVIDOR' };
      }
      return normalizar(j.data);
    }, function () {
      return { ok: false, error: 'RESPUESTA_INVALIDA' };
    });
  }

  /* ------------------------------------------------------------------
     fetchMuseo(usuarioId) -> Promise. NUNCA lanza, siempre resuelve:
       { ok:true, cartas:[], tope:N }
       { ok:false, error:'PERFIL_PRIVADO'|'SCHEMA_NOT_MIGRATED'|'CONEXION'|... }
     ------------------------------------------------------------------ */
  function fetchMuseo(usuarioId) {
    var url = urlMuseo(usuarioId);
    return Promise.resolve().then(function () {
      return fetch(url, { method: 'GET', headers: { 'Accept': 'application/json' } });
    }).then(function (res) {
      return leerMuseo(res);
    }, function () {
      return { ok: false, error: 'CONEXION' };
    });
  }

  /* ==================================================================
     FICHA DE CARTA COMPARTIDA (ADR-113)
     ------------------------------------------------------------------
     Un unico host #c-ficha appended a body BAJO DEMANDA, compartido por
     las tres superficies (coleccion, album, vitrina publica y mercado).
     El contrato DOM de aqui esta fijado con cartas-ui.css: si cambia
     una clase o el orden de los hijos, el CSS deja de casar.

     Lo que este bloque NO hace, a proposito:
     - NO hace fetch ni define logica de negocio: opciones.acciones es
       HTML ya construido por la pagina con SUS funciones
       (v61PublicarCarta, cmCartaComprar, ...). Aqui solo se inserta.
     - NO lee precios ni cantidades de otra fuente que la carta recibida.
     - NO inventa datos ausentes: cada linea del bloque "Como funciona"
       se pinta solo si su campo existe y es del tipo esperado (ADR-008).
     ================================================================== */

  var FICHA_ID = 'c-ficha';
  var FICHA_CONTEXTOS = {
    coleccion: 1,
    album: 1,
    'vitrina-publica': 1,
    mercado: 1
  };
  /* Etiqueta de cantidad POR CONTEXTO (D4). Prohibido "tienes" fuera de
     coleccion: la misma palabra en una vitrina ajena o en el mercado
     seria una mentira sobre la propiedad de la carta. */
  var FICHA_ETIQ_CANTIDAD = {
    coleccion: 'Cantidad en tu coleccion',
    album: 'Cantidad en tu coleccion',
    'vitrina-publica': 'En su museo',
    mercado: 'Disponible'
  };
  var FICHA_DESC_VACIA = 'Este catalogo todavia no tiene descripcion editorial';

  /* Listeners vivos de la ficha (uno solo a la vez, nunca huerfanos). */
  var fichaListeners = null;
  /* Callback de la pagina tras subir nivel (repintado sin recargar). */
  var fichaOnNivel = null;
  /* Elemento disparador al que se devuelve el foco al cerrar. */
  var fichaFocoPrev = null;
  /* Valor previo de body.overflow, para no pisarlo al cerrar. */
  var fichaOverflowPrev = null;

  function fichaHost() {
    return document.getElementById(FICHA_ID);
  }

  /* Primer valor no vacio de una lista de alias de campo. */
  function fichaCampo(carta, alias) {
    if (!carta || typeof carta !== 'object') return '';
    for (var i = 0; i < alias.length; i++) {
      var v = carta[alias[i]];
      if (v !== null && v !== undefined && v !== '') return v;
    }
    return '';
  }

  /* stats_json llega como objeto jsonb o como string JSON: las dos valen. */
  function fichaStats(statsJson) {
    var obj = statsJson;
    if (typeof obj === 'string') {
      var raw = obj.trim();
      if (!raw) return null;
      try {
        obj = JSON.parse(raw);
      } catch (eStats) {
        return null;
      }
    }
    if (!obj || typeof obj !== 'object') return null;
    if (Object.prototype.toString.call(obj) === '[object Array]') return null;
    return obj;
  }

  /* Numero seguro: helper unico del fichero. Devuelve 'def' cuando el dato no
     es numerico, asi que jamas se pinta NaN, Infinity ni undefined. */
  function safeNum(v, def) {
    if (v === null || v === undefined || v === '' || typeof v === 'boolean') return def;
    var n = Number(v);
    if (!isFinite(n)) return def;
    return n;
  }

  /* Entero seguro, o null si el dato no es numerico. */
  function fichaEntero(v) {
    return safeNum(v, null);
  }

  /* Separador de miles con punto (es-CO) y sin decimales. ASCII puro. */
  function miles(v) {
    var n = safeNum(v, null);
    if (n === null) return '';
    var ent = Math.round(n);
    var s = String(Math.abs(ent));
    var out = '';
    var i = s.length;
    while (i > 3) {
      out = '.' + s.slice(i - 3, i) + out;
      i -= 3;
    }
    return (ent < 0 ? '-' : '') + s.slice(0, i) + out;
  }

  /* Booleano tolerante: jsonb puede traer true, 1 o "true". */
  function fichaSi(v) {
    if (v === true || v === 1) return true;
    if (typeof v === 'string') {
      var s = v.toLowerCase().trim();
      return s === 'true' || s === '1' || s === 'si';
    }
    return false;
  }

  function fichaTexto(v) {
    if (v === null || v === undefined) return '';
    return String(v).trim();
  }

  function fichaRarezaLabel(rareza) {
    var r = RAREZAS[fichaTexto(rareza).toLowerCase()];
    return r ? r.label : '';
  }

  function fichaVarianteLabel(variante) {
    var v = VARIANTES[fichaTexto(variante).toLowerCase()];
    return v ? v.label : '';
  }

  /* ==================================================================
     TAXONOMIA Y METADATOS NUEVOS (066 / ADR-121)
     ------------------------------------------------------------------
     familia, subtipo, edicion, supply_max, emitidas, precio_xp,
     stats, nivel y poder YA viajan en cartas_mias y museo_cartas.
     Aqui solo se PINTAN: cero calculo de poder en cliente (el servidor manda
     poder ya derivado) y cero claves inventadas. Si un campo no llega, no
     se pinta NADA: la carta se ve exactamente como antes de la 066.
     La capa NO se persiste: se deriva de la familia (spec 2.1).
     ================================================================== */
  var FAMILIAS = {
    lugar: { label: 'Lugar', capa: 'juego' },
    personaje: { label: 'Personaje', capa: 'juego' },
    artista: { label: 'Artista', capa: 'juego' },
    marca: { label: 'Marca', capa: 'juego' },
    producto: { label: 'Producto', capa: 'economia' },
    consumible: { label: 'Consumible', capa: 'economia' },
    cosmetica: { label: 'Cosmetica', capa: 'estatus' }
  };
  var CAPAS = { juego: 'Juego', economia: 'Economia', estatus: 'Estatus' };

  /* Orden EXACTO de CARTA_EJES_STATS. 'presencia' es estatus puro: se pinta
     marcada como cosmetica y NUNCA entra en poder (peso 0 en el servidor). */
  var EJES = [
    { k: 'alcance', l: 'Alcance' },
    { k: 'oficio', l: 'Oficio' },
    { k: 'fortuna', l: 'Fortuna' },
    { k: 'rendimiento', l: 'Rendimiento' },
    { k: 'presencia', l: 'Presencia', cosmetica: 1 }
  ];
  var STATS_TOPE = 40;
  var NIVEL_TOPE = 5;

  function familiaDe(carta) {
    var k = fichaTexto(carta && carta.familia).toLowerCase();
    if (!k || !Object.prototype.hasOwnProperty.call(FAMILIAS, k)) return '';
    return k;
  }

  /* Vector normalizado del contrato (spec 3.3). null cuando la carta NO trae
     el objeto stats (dato viejo): entonces no hay bloque que pintar. */
  function vectorStats(carta) {
    var src = carta && carta.stats;
    if (!src || typeof src !== 'object'
        || Object.prototype.toString.call(src) === '[object Array]') return null;
    var out = { valores: [], suma: 0, primario: '' };
    out.primario = fichaTexto(src.primario).toLowerCase();
    for (var i = 0; i < EJES.length; i++) {
      var n = safeNum(src[EJES[i].k], 0);
      if (n < 0) n = 0;
      if (n > STATS_TOPE) n = STATS_TOPE;
      out.valores.push(n);
      if (!EJES[i].cosmetica) out.suma += n;
    }
    return out;
  }

  /* Chip de familia con color por CAPA (juego / economia / estatus). */
  function chipFamilia(carta) {
    var k = familiaDe(carta);
    if (!k) return '';
    var f = FAMILIAS[k];
    return '<span class="c-chip c-chip--' + f.capa + '" title="Capa ' + CAPAS[f.capa] + '">'
      + esc(f.label) + '</span>';
  }

  /* Metadatos de carta para la REJILLA (coleccion y museo). Cadena vacia si
     no hay ningun campo nuevo: el markup de la carta no cambia ni un byte. */
  function cardMeta(carta) {
    if (!carta || typeof carta !== 'object') return '';
    var partes = chipFamilia(carta);
    var sub = fichaTexto(carta.subtipo).toLowerCase();
    if (sub) partes += '<span class="c-meta-sub">' + esc(sub) + '</span>';
    var poder = safeNum(carta.poder, null);
    if (poder !== null) {
      partes += '<span class="c-meta-poder" title="Poder de la carta">'
        + '<b>' + esc(miles(poder)) + '</b> poder</span>';
    }
    var nivel = safeNum(carta.nivel, null);
    if (nivel !== null && nivel >= 1) {
      partes += '<span class="c-meta-nivel" title="Nivel de la carta">'
        + esc(nivel) + '/' + NIVEL_TOPE + '</span>';
    }
    return partes ? '<div class="c-meta">' + partes + '</div>' : '';
  }

  /* Poder y nivel destacados dentro de la ficha. Solo si el servidor los mando. */
  function fichaPoderNivel(carta) {
    var poder = safeNum(carta.poder, null);
    var nivel = safeNum(carta.nivel, null);
    var conNivel = nivel !== null && nivel >= 1;
    if (poder === null && !conNivel) return '';
    var out = '<div class="c-ficha-pn">';
    if (poder !== null) {
      out += '<span class="c-pn-poder"><b>' + esc(miles(poder)) + '</b> poder</span>';
    }
    if (conNivel) {
      out += '<span class="c-pn-nivel">Nivel <b>' + esc(nivel) + '</b>/' + NIVEL_TOPE + '</span>';
    }
    return out + '</div>';
  }

  /* Como se obtiene la carta: dato de stats si existe, si no el emisor. */
  function fichaObtencion(emisorTipo, stats) {
    if (stats && typeof stats.obtencion === 'string' && stats.obtencion.trim()) {
      return 'Se obtiene: ' + stats.obtencion.trim();
    }
    var em = fichaTexto(emisorTipo).toLowerCase();
    if (em === 'marca') return 'Se obtiene en sobres de la marca y en el mercado de cartas';
    if (em === 'ugc') return 'Se obtiene en el mercado de cartas';
    if (em === 'sistema') return 'Se obtiene en sobres';
    return '';
  }

  /* Lineas del bloque "Como funciona". Cada una, solo si su campo existe. */
  function fichaComoFunciona(carta, stats) {
    var out = [];
    if (stats) {
      var xp = fichaEntero(stats.bonus_xp_pct);
      if (xp !== null && xp !== 0) {
        out.push('Acredita un bonus de XP del ' + (xp > 0 ? '+' : '') + xp + '%');
      }
      var cap = stats.capacidad_gate;
      if (typeof cap === 'string' && cap.trim()) {
        out.push('Desbloquea la capacidad ' + cap.trim());
      }
    }
    var nivel = fichaEntero(carta.nivel_gate);
    if (nivel !== null && nivel > 0) {
      out.push('Se desbloquea al alcanzar el nivel ' + nivel);
    }
    if (fichaSi(carta.es_evento)) out.push('Es una carta de evento');
    if (fichaSi(carta.fusionable)) out.push('Consume 4 copias base y acredita 1 shiny');
    if (fichaSi(carta.es_canjeable_qr)) out.push('Se puede canjear con un codigo QR');
    var obt = fichaObtencion(carta.emisor_tipo, stats);
    if (obt) out.push(obt);
    return out;
  }

  /* --- Vector de stats: 4 ejes jugables + presencia cosmetica --------- */
  function fichaEjes(vec) {
    if (!vec) return '';
    var filas = '';
    for (var i = 0; i < EJES.length; i++) {
      var v = vec.valores[i];
      var esPrim = !!(vec.primario && vec.primario === EJES[i].k);
      var pct = Math.round((v / STATS_TOPE) * 100);
      if (pct < 0) pct = 0;
      if (pct > 100) pct = 100;
      filas += '<div class="c-eje' + (EJES[i].cosmetica ? ' c-eje--cosm' : '') + '">'
        + '<span class="c-eje-l">' + esc(EJES[i].l)
        + (esPrim ? ' <span class="c-eje-p">primario</span>' : '')
        + (EJES[i].cosmetica ? ' <span class="c-eje-cosm">estetica</span>' : '')
        + '</span>'
        + '<span class="c-eje-bar" aria-hidden="true"><i style="width:' + pct + '%"></i></span>'
        + '<span class="c-eje-n">' + esc(v) + '</span>'
        + '</div>';
    }
    return '<div class="c-det">'
      + '<div class="c-det-t">Vector</div>'
      + filas
      + '<div class="c-det-pie">Poder = alcance + oficio + fortuna + rendimiento. '
      + 'La presencia es estatus: no da poder ni XP.</div>'
      + '</div>';
  }

  /* --- Tirada y valor de acunacion (spec 4.1) ------------------------ */
  function fichaTirada(carta) {
    var ed = fichaTexto(carta.edicion).toLowerCase();
    var supply = safeNum(carta.supply_max, null);
    var emitidas = safeNum(carta.emitidas, null);
    /* Sin NINGUN campo de tirada (dato pre 066) no se pinta nada: "tirada
       abierta" solo se afirma cuando el backend lo dijo, nunca por ausencia. */
    if (!ed && supply === null && emitidas === null) return '';
    if (ed === 'abierta' && supply === null && emitidas === null) return 'Tirada abierta';
    var partes = [];
    if (ed) partes.push('Edicion ' + ed);
    if (supply !== null) {
      partes.push(emitidas !== null
        ? 'tirada ' + miles(emitidas) + ' / ' + miles(supply)
        : 'tirada maxima ' + miles(supply));
    } else if (emitidas !== null) {
      partes.push('emitidas ' + miles(emitidas));
    } else if (!ed) {
      partes.push('tirada abierta');
    }
    return partes.join(' - ');
  }

  function fichaPrecio(carta) {
    var p = safeNum(carta.precio_xp, null);
    if (p === null || p <= 0) return '';
    return 'Acunacion: ' + miles(p) + ' XP';
  }

  /* Bloque completo de detalle. Devuelve '' si no hay NADA nuevo que decir. */
  function fichaDetalle(carta) {
    var vec = vectorStats(carta);
    var ejeHtml = (vec && (vec.suma > 0 || vec.primario)) ? fichaEjes(vec) : '';
    var lineas = [];
    var tirada = fichaTirada(carta);
    if (tirada) lineas.push(tirada);
    var precio = fichaPrecio(carta);
    if (precio) lineas.push(precio);
    var datosHtml = '';
    if (lineas.length) {
      var lis = [];
      for (var i = 0; i < lineas.length; i++) lis.push('<li>' + esc(lineas[i]) + '</li>');
      datosHtml = '<ul class="c-det-datos">' + lis.join('') + '</ul>';
    }
    if (!ejeHtml && !datosHtml) return '';
    return '<div class="c-ficha-det">' + ejeHtml + datosHtml + '</div>';
  }

  /* --- Subida de nivel (spec 4.9, handler YA existente) -------------- */
  /* Variante de posesion: la de la carta, o la primera poseida, o base. */
  function varianteDeCarta(carta) {
    var v = fichaTexto(carta && carta.variante).toLowerCase();
    if (VARIANTES[v]) return v;
    var arr = carta ? carta.variantes : null;
    if (Object.prototype.toString.call(arr) === '[object Array]') {
      for (var i = 0; i < arr.length; i++) {
        var it = arr[i];
        if (!it || it.activa !== true) continue;
        if (safeNum(it.cantidad, 0) < 1) continue;
        var k = fichaTexto(it.variante).toLowerCase();
        if (VARIANTES[k]) return k;
      }
    }
    return 'base';
  }

  function fichaSubirNivel(carta, contexto, variante) {
    if (contexto !== 'coleccion' && contexto !== 'album') return '';
    var id = fichaTexto(fichaCampo(carta, ['id', 'carta_id']));
    if (!id) return '';
    var nivel = safeNum(carta.nivel, null);
    if (nivel === null || nivel < 1 || nivel >= NIVEL_TOPE) return '';
    /* El coste lo manda el servidor (costeSubidaNivel). Si no llega, no se
       inventa: sin coste no hay boton. */
    var coste = safeNum(carta.coste_nivel_xp, null);
    if (coste === null || coste <= 0) return '';
    return '<div class="c-nivel">'
      + '<button type="button" class="c-subir" data-c-subir-nivel="1"'
      + ' data-carta-id="' + esc(id) + '" data-variante="' + esc(variante) + '"'
      + ' data-nivel="' + esc(nivel) + '">Subir a nivel ' + esc(nivel + 1)
      + '<span class="c-subir-xp">' + esc(miles(coste)) + ' XP</span></button>'
      + '<span class="c-nivel-msg" role="status" aria-live="polite"></span>'
      + '</div>';
  }

  /* --- POST de subida de nivel: NUNCA rechaza, siempre resuelve -------- */
  var NIVEL_ERRORES = {
    PUNTOS_INSUFICIENTES: 'XP insuficiente para subir el nivel.',
    NIVEL_MAX: 'Esta carta ya esta en el nivel maximo.',
    NIVEL_DESACTUALIZADO: 'El nivel cambio en otra pestana. Vuelve a abrir la ficha.',
    CARTA_NO_ENCONTRADA: 'La carta ya no esta en el catalogo.',
    NO_POSEE: 'Necesitas una copia activa de esta carta.',
    SESION_REQUERIDA: 'Inicia sesion para subir el nivel.',
    SCHEMA_NOT_MIGRATED: 'El nivel de carta aun no esta disponible.',
    CONEXION: 'Sin conexion. Intenta de nuevo.',
    SERVIDOR: 'No se pudo subir el nivel. Intenta de nuevo.'
  };

  /* JWT de la sesion, con el mismo contrato que el resto del sitio. */
  function cabecerasPost() {
    var h = { 'Content-Type': 'application/json', 'Accept': 'application/json' };
    var E = w.ExploraCO;
    if (E && typeof E.authHeaders === 'function') {
      try {
        var a = E.authHeaders() || {};
        for (var k in a) {
          if (Object.prototype.hasOwnProperty.call(a, k)) h[k] = a[k];
        }
      } catch (eAuth) {}
    }
    return h;
  }

  function leerCuerpo(res) {
    try {
      return Promise.resolve(res && res.json ? res.json() : null);
    } catch (eJson) {
      return Promise.resolve(null);
    }
  }

  /* POST /api/interacciones?tipo=carta_subir_nivel (handler ya desplegado).
     Resuelve {ok:true, data} o {ok:false, error, mensaje}. */
  function subirNivelCarta(cartaId, variante, nivelEsperado) {
    var cuerpo = { carta_id: String(cartaId), variante: String(variante || 'base') };
    var esp = safeNum(nivelEsperado, null);
    if (esp !== null) cuerpo.nivel_esperado = esp;
    return Promise.resolve().then(function () {
      return fetch('/api/interacciones?tipo=carta_subir_nivel', {
        method: 'POST',
        credentials: 'same-origin',
        headers: cabecerasPost(),
        body: JSON.stringify(cuerpo)
      });
    }).then(function (res) {
      var st = res && res.status ? Number(res.status) : 0;
      return leerCuerpo(res).then(function (j) {
        if (j && j.ok === true && j.data) return { ok: true, data: j.data };
        var code = j && j.error ? String(j.error) : '';
        if (!code) code = (st === 402) ? 'PUNTOS_INSUFICIENTES' : 'SERVIDOR';
        var msg = NIVEL_ERRORES[code] || NIVEL_ERRORES.SERVIDOR;
        if (code === 'PUNTOS_INSUFICIENTES') {
          var coste = safeNum(j && j.coste_xp, null);
          var disp = safeNum(j && j.xp_disponible, null);
          if (coste !== null && disp !== null) {
            msg = 'Necesitas ' + miles(coste) + ' XP y tienes ' + miles(disp) + '.';
          }
        }
        return { ok: false, error: code, mensaje: msg };
      }, function () {
        return { ok: false, error: 'SERVIDOR', mensaje: NIVEL_ERRORES.SERVIDOR };
      });
    }, function () {
      return { ok: false, error: 'CONEXION', mensaje: NIVEL_ERRORES.CONEXION };
    });
  }

  /* Handler del boton de la ficha. Un solo vuelo por boton (disabled). */
  function subirNivelDesdeBoton(btn) {
    if (!btn || btn.disabled) return;
    var cartaId = fichaTexto(btn.getAttribute('data-carta-id'));
    var variante = fichaTexto(btn.getAttribute('data-variante')) || 'base';
    var nivel = safeNum(btn.getAttribute('data-nivel'), null);
    if (!cartaId || nivel === null) return;
    var caja = btn.parentNode;
    var msg = caja && caja.querySelector ? caja.querySelector('.c-nivel-msg') : null;
    var htmlPrevio = btn.innerHTML;
    btn.disabled = true;
    btn.setAttribute('aria-busy', 'true');
    if (msg) {
      msg.textContent = 'Subiendo nivel...';
      if (msg.classList) msg.classList.remove('is-error');
    }
    subirNivelCarta(cartaId, variante, nivel).then(function (res) {
      if (!res || res.ok !== true) {
        if (msg) {
          msg.textContent = (res && res.mensaje) || NIVEL_ERRORES.SERVIDOR;
          if (msg.classList) msg.classList.add('is-error');
        }
        btn.disabled = false;
        btn.removeAttribute('aria-busy');
        btn.innerHTML = htmlPrevio;
        return;
      }
      var data = res.data || {};
      var nuevo = safeNum(data.nivel, nivel + 1);
      if (msg) {
        msg.textContent = 'Nivel ' + nuevo + ' alcanzado.';
        if (msg.classList) msg.classList.remove('is-error');
      }
      btn.innerHTML = 'Nivel ' + esc(nuevo) + ' de ' + NIVEL_TOPE;
      var nodoNivel = fichaHost();
      var pn = nodoNivel && nodoNivel.querySelector ? nodoNivel.querySelector('.c-pn-nivel') : null;
      if (pn) pn.innerHTML = 'Nivel <b>' + esc(nuevo) + '</b>/' + NIVEL_TOPE;
      /* El poder lo DERIVA el servidor: se avisa a la pagina para que repinte
         desde cartas_mias. Aqui no se reimplementa la suma (una sola fuente). */
      var detalle = { carta_id: cartaId, variante: variante, nivel: nuevo };
      var cb = fichaOnNivel;
      if (typeof document !== 'undefined' && document.dispatchEvent && w.CustomEvent) {
        try {
          document.dispatchEvent(new w.CustomEvent('cartas:nivel', { detail: detalle }));
        } catch (eEv) {}
      }
      if (typeof cb === 'function') {
        try {
          cb(detalle);
        } catch (eCb) {}
        cerrarFicha();
      }
    });
  }

  /* Lamina: delega en CartasArte.slotHtml y NUNCA deja la ficha rota. */
  function fichaArte(clave, imagenUrl, marca, nombre) {
    var CA = w.CartasArte;
    if (!CA || typeof CA.slotHtml !== 'function') return '';
    try {
      var html = CA.slotHtml({
        clave: clave,
        imagenUrl: imagenUrl,
        marca: marca,
        nombre: nombre
      });
      return typeof html === 'string' ? html : '';
    } catch (eSlot) {
      return '';
    }
  }

  /* HTML completo del interior del host. Todo dato de servidor pasa por esc. */
  function fichaHtml(carta, opciones, contexto) {
    var modoMercado = contexto === 'mercado';
    var id = fichaCampo(carta, modoMercado ? ['carta_id', 'id'] : ['id', 'carta_id']);
    var nombre = fichaTexto(fichaCampo(carta, ['nombre', 'carta_nombre']));
    var rareza = fichaCampo(carta, ['rareza']);
    var variante = fichaCampo(carta, ['variante']);
    var setSlug = fichaTexto(fichaCampo(carta, ['set_slug']));
    var imagenUrl = fichaCampo(carta, ['imagen_url']);
    var marca = fichaCampo(carta, ['marca_nombre']);
    var emisor = fichaCampo(carta, ['emisor_tipo']);
    var descripcion = fichaTexto(fichaCampo(carta, ['descripcion']));
    var statsJson = fichaCampo(carta, ['stats_json']);
    var stats = fichaStats(statsJson);

    /* --- Identidad: una linea de lectura ---------------------------- */
    var tags = [];
    var chipFam = chipFamilia(carta);
    if (chipFam) tags.push(chipFam);
    var subTipo = fichaTexto(carta.subtipo).toLowerCase();
    if (subTipo) tags.push('<span class="c-ficha-sub">' + esc(subTipo) + '</span>');
    var rl = fichaRarezaLabel(rareza);
    if (rl) tags.push('<span class="c-ficha-tag">' + esc(rl) + '</span>');
    var vl = fichaVarianteLabel(variante);
    if (vl && fichaTexto(variante)) tags.push('<span class="c-ficha-tag">' + esc(vl) + '</span>');
    if (setSlug) tags.push('<span class="c-ficha-tag">' + esc(setSlug) + '</span>');
    var resumenStats = statsTexto(statsJson);
    if (resumenStats) tags.push('<span class="c-ficha-tag">' + esc(resumenStats) + '</span>');
    tags.push(badgeEmisor(emisor, marca));

    /* --- Cantidad etiquetada por contexto (D4) ---------------------- */
    var etiquetaQty = fichaTexto(opciones.etiquetaCantidad) || FICHA_ETIQ_CANTIDAD[contexto];
    var cantidadCruda = opciones.cantidad;
    if (cantidadCruda === null || cantidadCruda === undefined || cantidadCruda === '') {
      cantidadCruda = fichaCampo(carta, modoMercado
        ? ['cantidad_restante', 'cantidad']
        : ['cantidad', 'cantidad_restante']);
    }
    var qtyPartes = [];
    var cantidadNum = fichaEntero(cantidadCruda);
    if (cantidadNum !== null) {
      qtyPartes.push(etiquetaQty + ': ' + cantidadNum);
    } else if (fichaTexto(cantidadCruda)) {
      qtyPartes.push(etiquetaQty + ': ' + fichaTexto(cantidadCruda));
    }
    /* D5: el precio SOLO tiene sentido en el mercado. En coleccion y en
       vitrina es presion de venta sobre algo que no esta a la venta. */
    if (modoMercado) {
      var precio = fichaTexto(opciones.precio);
      if (!precio) {
        var pxp = fichaEntero(fichaCampo(carta, ['precio_xp']));
        if (pxp !== null && pxp > 0) precio = pxp + ' XP';
      }
      if (precio) qtyPartes.push('Precio: ' + precio);
    }
    var nota = fichaTexto(opciones.nota);
    if (nota) qtyPartes.push(nota);

    /* --- Descripcion editorial integra (sin truncar ni reescribir) --- */
    var desc = descripcion || FICHA_DESC_VACIA;

    /* --- Bloque "Como funciona": generado, o inexistente ------------ */
    var lineas = fichaComoFunciona(carta, stats);
    var bloqueCf = '';
    if (lineas.length) {
      var lis = [];
      for (var i = 0; i < lineas.length; i++) {
        lis.push('<li>' + esc(lineas[i]) + '</li>');
      }
      bloqueCf = '<div class="c-ficha-cf">'
        + '<div class="c-ficha-cf-t">Como funciona</div>'
        + '<ul class="c-ficha-cf-l">' + lis.join('') + '</ul>'
        + '</div>';
    }

    /* --- Arte: obligatorio en mercado (el backend manda ambos campos) */
    var arte = fichaArte(id, imagenUrl, marca, nombre);
    if (!arte) arte = '<div class="c-ficha-arte-hueco" aria-hidden="true"></div>';

    /* --- 066: poder/nivel, vector+tirada+valor y subida de nivel ------ */
    var bloquePn = fichaPoderNivel(carta);
    var bloqueDet = fichaDetalle(carta);
    var varianteNivel = fichaTexto(opciones.variante).toLowerCase()
      || varianteDeCarta(carta);
    var bloqueNivel = fichaSubirNivel(carta, contexto, varianteNivel);

    return '<div class="c-ficha-bd" data-c-ficha-cerrar></div>'
      + '<div class="c-ficha-box" role="dialog" aria-modal="true" aria-labelledby="c-ficha-tit">'
      + '<button type="button" class="c-ficha-x" data-c-ficha-cerrar aria-label="Cerrar">&times;</button>'
      + '<div class="c-ficha-arte">' + arte + '</div>'
      + '<div class="c-ficha-info">'
      + '<h3 id="c-ficha-tit" class="c-ficha-n ' + esc(claseRareza(rareza, variante)) + '">'
      + esc(nombre || 'Carta') + '</h3>'
      + '<div class="c-ficha-tags">' + tags.join('') + '</div>'
      + bloquePn
      + '<div class="c-ficha-qty">' + esc(qtyPartes.join(' - ')) + '</div>'
      + '<p class="c-ficha-desc">' + esc(desc) + '</p>'
      + bloqueCf
      + bloqueDet
      + bloqueNivel
      + '</div>'
      /* Vitrina publica: sin acciones, aunque la pagina las mande. */
      + (contexto !== 'vitrina-publica' && typeof opciones.acciones === 'string'
        && fichaTexto(opciones.acciones)
        ? '<div id="c-ficha-acciones" class="c-ficha-acc">' + opciones.acciones + '</div>'
        : '')
      + '<button type="button" class="c-ficha-cerrar" data-c-ficha-cerrar>Cerrar</button>'
      + '</div>';
  }

  /* Retira los listeners de la ficha abierta. Idempotente. */
  function fichaRetirarListeners() {
    if (!fichaListeners) return;
    var l = fichaListeners;
    fichaListeners = null;
    if (l.host && l.onClick) l.host.removeEventListener('click', l.onClick);
    if (l.onKey) document.removeEventListener('keydown', l.onKey);
  }

  /* Instala los listeners SOLO mientras la ficha esta abierta. */
  function fichaInstalarListeners(host) {
    fichaRetirarListeners();
    var onClick = function (e) {
      var t = e.target;
      if (!t) return;
      var marca = null;
      if (t.closest) {
        /* 066: el boton de subir nivel vive DENTRO del host y NO cierra. */
        var subir = t.closest('[data-c-subir-nivel]');
        if (subir && host.contains(subir)) {
          subirNivelDesdeBoton(subir);
          return;
        }
        marca = t.closest('[data-c-ficha-cerrar]');
      } else {
        var n = t;
        while (n && n !== host) {
          if (n.nodeType === 1 && n.getAttribute && n.getAttribute('data-c-ficha-cerrar') !== null) {
            marca = n;
            break;
          }
          n = n.parentNode;
        }
      }
      if (marca && host.contains(marca)) cerrarFicha();
    };
    var onKey = function (e) {
      var k = e.key || '';
      if (k === 'Escape' || k === 'Esc' || e.keyCode === 27) cerrarFicha();
    };
    host.addEventListener('click', onClick);
    document.addEventListener('keydown', onKey);
    fichaListeners = { host: host, onClick: onClick, onKey: onKey };
  }

  function fichaEnfocar() {
    var host = fichaHost();
    if (!host) return;
    var btn = host.querySelector('.c-ficha-x');
    if (btn && btn.focus) {
      try {
        btn.focus();
      } catch (eFoco) {
        return;
      }
    }
  }

  /* ------------------------------------------------------------------
     abrirFicha(carta, opciones)
     opciones = { contexto, acciones, etiquetaCantidad, cantidad, precio,
                  nota } -- todas opcionales.
     De paso: host created, content rewritten, listeners mounted, scroll
     blocked. Nunca lanza por datos raros: carta vacia -> ficha con hueco.
     ------------------------------------------------------------------ */
  function abrirFicha(carta, opciones) {
    if (typeof document === 'undefined' || !document.body) return null;
    var c = carta && typeof carta === 'object' ? carta : {};
    var o = opciones && typeof opciones === 'object' ? opciones : {};
    fichaOnNivel = typeof o.onNivelSubido === 'function' ? o.onNivelSubido : null;
    var ctx = fichaTexto(o.contexto).toLowerCase();
    if (!FICHA_CONTEXTOS[ctx]) ctx = 'coleccion';

    var host = fichaHost();
    var yaAbierta = !!(host && host.classList.contains('open'));
    if (!host) {
      host = document.createElement('div');
      host.id = FICHA_ID;
      host.className = 'c-ficha';
      document.body.appendChild(host);
    }
    if (!yaAbierta) {
      /* El disparador y el overflow previos se guardan UNA vez por ciclo. */
      fichaFocoPrev = document.activeElement || null;
      fichaOverflowPrev = document.body.style.overflow;
    }

    host.innerHTML = fichaHtml(c, o, ctx);
    host.style.display = '';
    host.classList.add('open');
    document.body.style.overflow = 'hidden';

    fichaInstalarListeners(host);
    fichaEnfocar();
    return host;
  }

  /* ------------------------------------------------------------------
     cerrarFicha(): idempotente. Restaura scroll y devuelve el foco.
     ------------------------------------------------------------------ */
  function cerrarFicha() {
    fichaRetirarListeners();
    var host = fichaHost();
    if (!host) return false;
    var estabaAbierta = host.classList.contains('open');
    host.classList.remove('open');
    host.style.display = 'none';
    if (typeof document !== 'undefined' && document.body) {
      document.body.style.overflow = (fichaOverflowPrev === null || fichaOverflowPrev === undefined)
        ? '' : fichaOverflowPrev;
    }
    var prev = fichaFocoPrev;
    fichaFocoPrev = null;
    fichaOverflowPrev = null;
    fichaOnNivel = null;
    if (prev && prev.focus && document.documentElement.contains(prev)) {
      try {
        prev.focus();
      } catch (eVolver) {
        return estabaAbierta;
      }
    }
    return estabaAbierta;
  }

  /* Util para las paginas: evita abrir una ficha encima de otra. */
  function fichaAbierta() {
    var host = fichaHost();
    return !!(host && host.classList.contains('open'));
  }

  w.CartasUI = {
    EMISORES: EMISORES,
    RAREZAS: RAREZAS,
    VARIANTES: VARIANTES,
    claseRareza: claseRareza,
    badgeEmisor: badgeEmisor,
    esc: esc,
    statsTexto: statsTexto,
    safeNum: safeNum,
    miles: miles,
    FAMILIAS: FAMILIAS,
    CAPAS: CAPAS,
    cardMeta: cardMeta,
    chipFamilia: chipFamilia,
    urlMuseo: urlMuseo,
    fetchMuseo: fetchMuseo,
    TOPE_MUSEO: TOPE_MUSEO,
    abrirFicha: abrirFicha,
    cerrarFicha: cerrarFicha,
    fichaAbierta: fichaAbierta,
    subirNivelCarta: subirNivelCarta
  };

}(window));
