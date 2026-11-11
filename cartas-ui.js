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

  /* --- Acunacion con XP (spec 4.8, handler YA existente) -------------- */
  /* Familias comerciables: espejo de CARTA_FAMILIAS_SIN_PRECIO_XP
     (lib/cartas-config.js). El catalogo economico (producto/consumible)
     no se acuna: el backend lo rechaza con CARTA_NO_COMPRABLE. */
  var FAMILIAS_ACUNABLES = {
    lugar: 1,
    personaje: 1,
    artista: 1,
    marca: 1,
    cosmetica: 1
  };

  /* Precio de acunacion, o null si la carta no es acunable. */
  function fichaAcunable(carta) {
    if (!FAMILIAS_ACUNABLES[familiaDe(carta)]) return null;
    if (!fichaTexto(fichaCampo(carta, ['id', 'carta_id']))) return null;
    var p = safeNum(carta && carta.precio_xp, null);
    if (p === null || p <= 0) return null;
    return p;
  }

  /* Tirada cerrada y sin copias: el boton se pinta, pero agotado. */
  function fichaAgotada(carta) {
    var supply = safeNum(carta && carta.supply_max, null);
    if (supply === null) return false;
    var emitidas = safeNum(carta && carta.emitidas, 0);
    return emitidas >= supply;
  }

  /* Boton de acunar, junto al precio en XP del bloque de detalle. */
  function fichaAcunar(carta, contexto, variante) {
    /* Vitrina ajena: sin acciones, igual que el resto de la ficha. */
    if (contexto === 'vitrina-publica') return '';
    var precio = fichaAcunable(carta);
    if (precio === null) return '';
    var id = fichaTexto(fichaCampo(carta, ['id', 'carta_id']));
    var agotada = fichaAgotada(carta);
    var etiqueta = agotada
      ? 'Agotada'
      : 'Acunar<span class="c-acunar-xp">' + esc(miles(precio)) + ' XP</span>';
    return '<div class="c-acunar" id="c-acunar">'
      + '<button type="button" class="c-acunar-btn" id="c-acunar-btn" data-c-acunar="1"'
      + ' data-carta-id="' + esc(id) + '" data-variante="' + esc(variante) + '"'
      + ' data-precio="' + esc(precio) + '"' + (agotada ? ' disabled' : '') + '>'
      + etiqueta + '</button>'
      + '<span class="c-acunar-msg" role="status" aria-live="polite"></span>'
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
    SERVIDOR: 'No se pudo subir el nivel. Intenta de nuevo.',
    /* Solo acunacion (carta_acunar). */
    CARTA_NO_COMPRABLE: 'Esta carta no se compra con XP.',
    SIN_STOCK: 'No quedan copias de esta carta.',
    MEDIA_NO_APROBADA: 'La obra de esta carta aun no esta aprobada.'
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

  /* --- Acunacion: POST y handler del boton ----------------------------- */
  /* Los codigos que el mapa hereda con la palabra "nivel" se reescriben
     aqui: un solo mapa de errores, cero copia de la tabla. */
  function mensajeAcunar(code) {
    if (code === 'PUNTOS_INSUFICIENTES') return 'XP insuficiente para acunar esta carta.';
    if (code === 'SESION_REQUERIDA') return 'Inicia sesion para acunar esta carta.';
    if (code === 'SERVIDOR') return 'No se pudo acunar la carta. Intenta de nuevo.';
    return NIVEL_ERRORES[code] || 'No se pudo acunar la carta. Intenta de nuevo.';
  }

  /* POST /api/interacciones?tipo=carta_acunar (handler ya desplegado).
     Resuelve {ok:true, data} o {ok:false, error, mensaje}. Nunca rechaza. */
  function acunarCarta(cartaId, variante, precioXp) {
    var precio = safeNum(precioXp, null);
    var cuerpo = { carta_id: String(cartaId) };
    if (variante) cuerpo.variante = String(variante);
    return Promise.resolve().then(function () {
      return fetch('/api/interacciones?tipo=carta_acunar', {
        method: 'POST',
        credentials: 'same-origin',
        headers: cabecerasPost(),
        body: JSON.stringify(cuerpo)
      });
    }).then(function (res) {
      return leerCuerpo(res).then(function (j) {
        if (j && j.ok === true && j.data) return { ok: true, data: j.data };
        var code = j && j.error ? String(j.error) : 'SERVIDOR';
        var msg = mensajeAcunar(code);
        if (code === 'PUNTOS_INSUFICIENTES') {
          var disp = safeNum(j && j.xp_disponible, null);
          /* El handler de acunar no manda coste: se usa el precio del boton. */
          if (precio !== null && disp !== null) {
            msg = 'Necesitas ' + miles(precio) + ' XP y tienes ' + miles(disp) + '.';
          }
        }
        return { ok: false, error: code, mensaje: msg };
      }, function () {
        return { ok: false, error: 'SERVIDOR', mensaje: mensajeAcunar('SERVIDOR') };
      });
    }, function () {
      return { ok: false, error: 'CONEXION', mensaje: NIVEL_ERRORES.CONEXION };
    });
  }

  /* Handler del boton de acunar. Confirmacion con el coste exacto y un
     solo vuelo por boton: cancelar NO toca la red. */
  function acunarDesdeBoton(btn) {
    if (!btn || btn.disabled) return;
    var cartaId = fichaTexto(btn.getAttribute('data-carta-id'));
    var variante = fichaTexto(btn.getAttribute('data-variante')) || 'base';
    var precio = safeNum(btn.getAttribute('data-precio'), null);
    if (!cartaId || precio === null || precio <= 0) return;
    if (typeof w.confirm === 'function') {
      var pregunta = 'Acunar por ' + miles(precio) + ' XP. Continuar?';
      var acepta = false;
      try {
        acepta = w.confirm(pregunta) === true;
      } catch (eConf) {
        acepta = false;
      }
      if (!acepta) return;
    }
    var caja = btn.parentNode;
    var msg = caja && caja.querySelector ? caja.querySelector('.c-acunar-msg') : null;
    var htmlPrevio = btn.innerHTML;
    btn.disabled = true;
    btn.setAttribute('aria-busy', 'true');
    if (msg) {
      msg.textContent = 'Acunando...';
      if (msg.classList) msg.classList.remove('is-error');
    }
    acunarCarta(cartaId, variante, precio).then(function (res) {
      if (!res || res.ok !== true) {
        if (msg) {
          msg.textContent = (res && res.mensaje) || mensajeAcunar('SERVIDOR');
          if (msg.classList) msg.classList.add('is-error');
        }
        btn.disabled = false;
        btn.removeAttribute('aria-busy');
        btn.innerHTML = htmlPrevio;
        return;
      }
      var data = res.data || {};
      var cant = safeNum(data.cantidad, null);
      if (msg) {
        msg.textContent = 'Copia acunada.'
          + (cant !== null ? ' Tienes ' + miles(cant) + ' en tu coleccion.' : '');
        if (msg.classList) msg.classList.remove('is-error');
      }
      /* Queda deshabilitado a proposito: cero doble clic y cero doble cobro. */
      btn.innerHTML = 'Acunada';
      btn.removeAttribute('aria-busy');
      var detalle = {
        carta_id: cartaId,
        variante: variante,
        cantidad: cant,
        precio_xp: precio,
        emitidas: safeNum(data.emitidas, null),
        xp_disponible: safeNum(data.xp_disponible, null)
      };
      /* Mismo patron que la subida de nivel: evento + callback de la pagina.
         Aqui NO se cierra la ficha: el aviso tiene que verse. */
      if (typeof document !== 'undefined' && document.dispatchEvent && w.CustomEvent) {
        try {
          document.dispatchEvent(new w.CustomEvent('cartas:acunar', { detail: detalle }));
        } catch (eEv) {}
      }
      var cb = fichaOnNivel;
      if (typeof cb === 'function') {
        try {
          cb(detalle);
        } catch (eCb) {}
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
    var bloqueAcunar = fichaAcunar(carta, contexto, varianteNivel);

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
      + bloqueAcunar
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
        /* Acunar tampoco cierra: la confirmacion y el aviso viven dentro. */
        var acunar = t.closest('[data-c-acunar]');
        if (acunar && host.contains(acunar)) {
          acunarDesdeBoton(acunar);
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

  /* ==================================================================
     CATALOGO -- vitrina de cartas que el usuario NO posee
     ------------------------------------------------------------------
     Consume GET /api/usuarios?tipo=cartas_catalogo (canal de adquisicion
     ya desplegado). La UI NO decide precio ni stock: pinta el `poder`,
     `restantes` y `precio_xp` que manda el servidor, y la compra va por
     el handler YA existente (acunarCarta / acunarDesdeBoton): el boton
     de la tarjeta usa los mismos data-* que la ficha.
     `restantes === null` = tirada abierta (nunca se inventa un stock).
     El panel solo se monta si la pagina trae el host #catalogo-panel,
     asi que comunidad.html y perfil.html no pagan nada por cargarlo.
     ================================================================== */
  var CATALOGO_LIMIT = 24;
  var CATALOGO_FAMILIAS = ['lugar', 'personaje', 'marca', 'artista', 'cosmetica'];
  var CATALOGO_RAREZAS = ['comun', 'raro', 'epico', 'dorado'];

  function catalogoEstadoBase() {
    return {
      q: '', familia: '', rareza: '', page: 0,
      filas: [], total: null, cargando: false, error: ''
    };
  }

  /* URL del canal de adquisicion. Los filtros vacios NO viajan: el backend
     trata igual "" que ausente, pero la URL queda legible y cacheable. */
  function catalogoUrl(estado, page) {
    var e = estado || {};
    var p = safeNum(page, 1);
    if (p < 1) p = 1;
    var partes = ['tipo=cartas_catalogo', 'limit=' + CATALOGO_LIMIT];
    var fam = fichaTexto(e.familia).toLowerCase();
    if (fam) partes.push('familia=' + encodeURIComponent(fam));
    var rar = fichaTexto(e.rareza).toLowerCase();
    if (rar) partes.push('rareza=' + encodeURIComponent(rar));
    var q = fichaTexto(e.q);
    if (q) partes.push('q=' + encodeURIComponent(q));
    partes.push('page=' + p);
    return '/api/usuarios?' + partes.join('&');
  }

  /* Error tipado del catalogo. 503 (schema pendiente) degrada a un aviso
     corto: la pagina no se rompe ni se volca JSON crudo. */
  function catalogoError(status, code) {
    var st = safeNum(status, 0);
    var c = fichaTexto(code) || 'SERVIDOR';
    if (st === 503 || c === 'NO_DISPONIBLE' || c === 'SCHEMA_PENDIENTE') {
      return { ok: false, error: 'NO_DISPONIBLE', mensaje: 'Catalogo no disponible.' };
    }
    if (c === 'CONEXION') {
      return {
        ok: false, error: 'CONEXION',
        mensaje: 'Sin conexion. Revisa tu red e intenta de nuevo.'
      };
    }
    return { ok: false, error: 'SERVIDOR', mensaje: 'No se pudo cargar el catalogo. Intenta de nuevo.' };
  }

  function catalogoNormalizar(json, page, status) {
    if (!json || json.ok !== true) {
      return catalogoError(status, json && json.error);
    }
    var filas = json.data;
    if (!filas || typeof filas.length !== 'number') filas = [];
    return {
      ok: true,
      filas: filas,
      total: safeNum(json.total, filas.length),
      page: safeNum(json.page, safeNum(page, 1))
    };
  }

  /* GET sin rechazo: siempre resuelve {ok:true,...} o {ok:false,error,mensaje}. */
  function catalogoPedir(estado, page) {
    return Promise.resolve().then(function () {
      return fetch(catalogoUrl(estado, page), {
        method: 'GET',
        credentials: 'same-origin',
        /* Mismo constructor de cabeceras que el resto del modulo: sin el
           Bearer, el backend no puede rellenar `posee`/`cantidad` (la rama
           sigue siendo publica, pero el catalogo no sabria que ya es tuyo). */
        headers: cabecerasPost()
      });
    }).then(function (res) {
      var st = safeNum(res && res.status, 0);
      return leerCuerpo(res).then(function (j) {
        return catalogoNormalizar(j, page, st);
      }, function () {
        return catalogoError(st, 'SERVIDOR');
      });
    }, function () {
      return catalogoError(0, 'CONEXION');
    });
  }

  /* Estado de la tarjeta: 'posee' manda sobre todo lo demas. */
  function catalogoEstadoCarta(carta) {
    if (!carta || typeof carta !== 'object') return 'vacia';
    var cant = safeNum(carta.cantidad, null);
    if (fichaSi(carta.posee) || (cant !== null && cant > 0)) return 'posee';
    var rest = safeNum(carta.restantes, null);
    if (rest !== null && rest <= 0) return 'agotada';
    return 'libre';
  }

  /* Tirada compacta: reutiliza el formateo de la ficha sin su prefijo de
     edicion. Sin ningun dato de tirada, "Tirada abierta" (restantes null). */
  function catalogoTirada(carta) {
    var t = fichaTirada(carta);
    if (!t) return 'Tirada abierta';
    var i = t.indexOf(' - ');
    if (t.indexOf('Edicion ') === 0 && i > 0) return t.slice(i + 3);
    return t;
  }

  function catalogoChipRareza(carta) {
    var k = fichaTexto(carta && carta.rareza).toLowerCase();
    var r = RAREZAS[k];
    if (!r) return '';
    return '<span class="c-cat-rar ' + r.clase + '">' + esc(r.label) + '</span>';
  }

  function catalogoInicial(nombre) {
    var s = fichaTexto(nombre);
    return s ? s.charAt(0).toUpperCase() : '?';
  }

  /* Atributo seguro: esc() no toca las comillas dobles y un src/alt con "
     romperia el atributo. Solo para VALORES de atributo. */
  function catalogoAttr(v) {
    return esc(v).replace(/"/g, '&quot;');
  }

  /* Accion de la tarjeta. Nunca "Acunar" en una carta que ya es tuya: la
     copia extra se compra desde la ficha de la coleccion, no aqui. */
  function catalogoAccionHtml(carta, estado, precio) {
    if (estado === 'posee') {
      var cant = safeNum(carta.cantidad, null);
      return '<div class="c-cat-acc"><span class="c-cat-nota">Ya la tienes'
        + (cant !== null ? ' <b>' + esc(miles(cant)) + '</b>' : '') + '</span></div>';
    }
    if (estado === 'agotada') {
      return '<div class="c-cat-acc"><span class="c-cat-nota c-cat-nota--agotada">Agotada</span></div>';
    }
    if (precio === null || precio <= 0) {
      return '<div class="c-cat-acc"><span class="c-cat-nota">No disponible</span></div>';
    }
    return '<div class="c-cat-acc c-acunar">'
      + '<button type="button" class="c-acunar-btn" data-c-acunar="1"'
      + ' data-carta-id="' + catalogoAttr(fichaTexto(carta.id)) + '" data-variante="base"'
      + ' data-precio="' + catalogoAttr(precio) + '">Acunar'
      + ' <span class="c-acunar-xp">' + esc(miles(precio)) + ' XP</span></button>'
      + '<span class="c-acunar-msg"></span></div>';
  }

  /* Tarjeta compacta del catalogo. Todo dato de servidor pasa por esc. */
  function catalogoCartaHtml(carta) {
    if (!carta || typeof carta !== 'object') return '';
    var id = fichaTexto(carta.id);
    var nombre = fichaTexto(carta.nombre) || id || 'Carta';
    var estado = catalogoEstadoCarta(carta);
    var precio = safeNum(carta.precio_xp, null);
    var poder = safeNum(carta.poder, null);
    var img = fichaTexto(carta.imagen_url);
    var html = '<article class="c-cat-card" data-c-cat-id="' + catalogoAttr(id)
      + '" data-c-cat-estado="' + estado + '">';
    html += '<div class="c-cat-arte">'
      + '<span class="c-cat-fallo" aria-hidden="true">' + esc(catalogoInicial(nombre)) + '</span>';
    if (img) {
      html += '<img class="c-cat-img" src="' + catalogoAttr(img) + '" alt="' + catalogoAttr(nombre)
        + '" loading="lazy" onerror="this.style.display=\'none\'">';
    }
    html += '</div>';
    html += '<div class="c-cat-top"><span class="c-cat-n">' + esc(nombre) + '</span>'
      + catalogoChipRareza(carta) + '</div>';
    html += '<div class="c-cat-meta">' + chipFamilia(carta);
    if (poder !== null) {
      html += '<span class="c-meta-poder" title="Poder de la carta"><b>'
        + esc(miles(poder)) + '</b> poder</span>';
    }
    html += '</div>';
    html += '<div class="c-cat-datos"><span data-c-cat-stock="1">'
      + esc(catalogoTirada(carta)) + '</span>';
    var rest = safeNum(carta.restantes, null);
    if (rest !== null && rest > 0) {
      html += '<span class="c-cat-rest" data-c-cat-rest="1">quedan ' + esc(miles(rest)) + '</span>';
    }
    if (precio !== null && precio > 0) {
      html += '<span class="c-cat-precio">' + esc(miles(precio)) + ' XP</span>';
    }
    html += '</div>';
    return html + catalogoAccionHtml(carta, estado, precio) + '</article>';
  }

  function catalogoFiltrosHtml(estado) {
    var e = estado || {};
    var fam = fichaTexto(e.familia).toLowerCase();
    var rar = fichaTexto(e.rareza).toLowerCase();
    var i;
    var html = '<div class="c-cat-bar">'
      + '<div class="c-cat-grp" role="group" aria-label="Filtrar el catalogo por familia">'
      + '<button type="button" class="c-cat-f" data-cat-fam="" aria-pressed="'
      + (fam ? 'false' : 'true') + '">Todas</button>';
    for (i = 0; i < CATALOGO_FAMILIAS.length; i++) {
      var kf = CATALOGO_FAMILIAS[i];
      html += '<button type="button" class="c-cat-f" data-cat-fam="' + kf
        + '" aria-pressed="' + (fam === kf ? 'true' : 'false') + '">'
        + esc(FAMILIAS[kf].label) + '</button>';
    }
    html += '</div>'
      + '<div class="c-cat-grp" role="group" aria-label="Filtrar el catalogo por rareza">'
      + '<button type="button" class="c-cat-f" data-cat-rar="" aria-pressed="'
      + (rar ? 'false' : 'true') + '">Todas</button>';
    for (i = 0; i < CATALOGO_RAREZAS.length; i++) {
      var kr = CATALOGO_RAREZAS[i];
      html += '<button type="button" class="c-cat-f" data-cat-rar="' + kr
        + '" aria-pressed="' + (rar === kr ? 'true' : 'false') + '">'
        + esc(RAREZAS[kr].label) + '</button>';
    }
    return html + '</div>'
      + '<input type="search" class="c-cat-q" data-c-cat-q="1" id="c-cat-q"'
      + ' value="' + catalogoAttr(fichaTexto(e.q)) + '" autocomplete="off"'
      + ' placeholder="Buscar por nombre" aria-label="Buscar una carta por nombre">'
      + '</div>';
  }

  function catalogoInfoTexto(estado) {
    var e = estado || {};
    if (e.error) return e.error;
    var filas = e.filas || [];
    var total = safeNum(e.total, null);
    if (!filas.length) return e.cargando ? 'Cargando catalogo...' : '';
    if (total === null) return 'Mostrando ' + filas.length + ' cartas';
    return 'Mostrando ' + filas.length + ' de ' + miles(total) + ' cartas';
  }

  function catalogoHayMas(estado) {
    var e = estado || {};
    var total = safeNum(e.total, null);
    if (total === null || e.error) return false;
    return (e.filas || []).length < total;
  }

  /* Rejilla + estados. Devuelve SOLO el interior de #c-cat-grid. */
  function catalogoGridHtml(estado) {
    var e = estado || {};
    var i;
    if (e.error) {
      return '<div class="c-cat-vacio c-cat-vacio--error" role="status">' + esc(e.error)
        + ' <button type="button" class="c-cat-mas" data-c-cat-reintentar="1">Reintentar</button></div>';
    }
    var filas = e.filas || [];
    if (!filas.length) {
      if (e.cargando) return '<div class="c-cat-vacio" role="status">Cargando catalogo...</div>';
      return '<div class="c-cat-vacio" role="status">No hay cartas con estos filtros.</div>';
    }
    var html = '<div class="c-cat-rejilla">';
    for (i = 0; i < filas.length; i++) html += catalogoCartaHtml(filas[i]);
    return html + '</div>';
  }

  /* Tras acunar, la tarjeta pasa a "poseida" con la cantidad y el stock
     que devolvio el servidor. Funcion pura: tambien vale para tests. */
  function catalogoAplicarAcunar(estado, detalle) {
    if (!estado || !detalle) return false;
    var id = fichaTexto(detalle.carta_id);
    if (!id) return false;
    var filas = estado.filas || [];
    for (var i = 0; i < filas.length; i++) {
      if (fichaTexto(filas[i] && filas[i].id) !== id) continue;
      var cant = safeNum(detalle.cantidad, null);
      filas[i].posee = true;
      if (cant !== null) filas[i].cantidad = cant;
      var emit = safeNum(detalle.emitidas, null);
      if (emit !== null) filas[i].emitidas = emit;
      var sup = safeNum(filas[i].supply_max, null);
      if (sup !== null && emit !== null) {
        var rest = sup - emit;
        filas[i].restantes = rest < 0 ? 0 : rest;
      }
      return true;
    }
    return false;
  }

  var catalogoCtrl = null;

  /* Sube por el DOM hasta el host buscando un atributo. Sin closest: el DOM
     minimo de los smokes no lo trae y aqui no hace falta. */
  function catalogoCerca(nodo, attr, host) {
    var n = nodo;
    var vueltas = 0;
    while (n && n !== host && vueltas < 12) {
      if (n.getAttribute && n.getAttribute(attr) !== null) return n;
      n = n.parentNode;
      vueltas++;
    }
    return null;
  }

  function catalogoMarcarFiltros(ctrl) {
    var host = ctrl && ctrl.host;
    if (!host || typeof host.querySelectorAll !== 'function') return;
    var e = ctrl.estado;
    var fam = e.familia;
    var rar = e.rareza;
    var fbs = host.querySelectorAll('[data-cat-fam]');
    var i;
    for (i = 0; i < fbs.length; i++) {
      fbs[i].setAttribute('aria-pressed',
        String(fichaTexto(fbs[i].getAttribute('data-cat-fam')) === fam));
    }
    var rbs = host.querySelectorAll('[data-cat-rar]');
    for (i = 0; i < rbs.length; i++) {
      rbs[i].setAttribute('aria-pressed',
        String(fichaTexto(rbs[i].getAttribute('data-cat-rar')) === rar));
    }
  }

  /* Repinta estado. `desde` > 0 = solo las filas nuevas (Cargar mas conserva
     el scroll: no se reconstruyen las tarjetas que ya estaban). */
  function catalogoRefrescar(ctrl, desde) {
    if (!ctrl) return;
    var e = ctrl.estado;
    if (ctrl.info) ctrl.info.textContent = catalogoInfoTexto(e);
    if (ctrl.mas) {
      var hay = catalogoHayMas(e);
      ctrl.mas.hidden = !hay;
      ctrl.mas.disabled = !!e.cargando;
      ctrl.mas.style.display = hay ? '' : 'none';
    }
    var grid = ctrl.grid;
    if (!grid) return;
    if (typeof desde === 'number' && desde > 0 && ctrl.rejilla) {
      var extra = '';
      for (var i = desde; i < (e.filas || []).length; i++) extra += catalogoCartaHtml(e.filas[i]);
      if (extra) {
        if (typeof ctrl.rejilla.insertAdjacentHTML === 'function') {
          ctrl.rejilla.insertAdjacentHTML('beforeend', extra);
        } else {
          ctrl.rejilla.innerHTML += extra;
        }
      }
      return;
    }
    grid.innerHTML = catalogoGridHtml(e);
    ctrl.rejilla = (typeof grid.querySelector === 'function')
      ? grid.querySelector('.c-cat-rejilla') : null;
  }

  function catalogoCargar(ctrl, acumular) {
    if (!ctrl) return;
    var e = ctrl.estado;
    if (e.cargando) return;
    var page = acumular ? (safeNum(e.page, 0) + 1) : 1;
    var desde = acumular ? (e.filas || []).length : 0;
    e.cargando = true;
    e.error = '';
    if (!acumular) {
      e.filas = [];
      e.total = null;
      e.page = 0;
    }
    catalogoRefrescar(ctrl);
    catalogoPedir(e, page).then(function (res) {
      e.cargando = false;
      if (!res || res.ok !== true) {
        e.error = (res && res.mensaje) || catalogoError(0, 'SERVIDOR').mensaje;
        catalogoRefrescar(ctrl);
        return;
      }
      e.filas = acumular ? (e.filas || []).concat(res.filas) : res.filas;
      e.total = res.total;
      e.page = page;
      catalogoRefrescar(ctrl, desde);
    });
  }

  /* Panel abierto: barra de filtros + info + rejilla + Cargar mas. El host
     arranca con un boton "Abrir catalogo" para no gastar un GET al cargar
     la pagina. */
  function catalogoAbrir(ctrl) {
    if (!ctrl || ctrl.abierto) return;
    ctrl.abierto = true;
    var host = ctrl.host;
    host.innerHTML = catalogoFiltrosHtml(ctrl.estado)
      + '<div class="c-cat-info" id="c-cat-info" aria-live="polite"></div>'
      + '<div id="c-cat-grid"></div>'
      + '<button type="button" class="c-cat-mas" id="c-cat-mas" data-c-cat-mas="1" hidden>Cargar mas</button>';
    ctrl.info = (typeof host.querySelector === 'function') ? host.querySelector('#c-cat-info') : null;
    ctrl.grid = (typeof host.querySelector === 'function') ? host.querySelector('#c-cat-grid') : null;
    ctrl.mas = (typeof host.querySelector === 'function') ? host.querySelector('#c-cat-mas') : null;
    ctrl.rejilla = null;
    catalogoMarcarFiltros(ctrl);
    catalogoCargar(ctrl, false);
  }

  function catalogoFiltro(ctrl, clave, valor) {
    if (!ctrl) return;
    var v = fichaTexto(valor).toLowerCase();
    if (clave === 'familia' && v && CATALOGO_FAMILIAS.indexOf(v) < 0) return;
    if (clave === 'rareza' && v && CATALOGO_RAREZAS.indexOf(v) < 0) return;
    ctrl.estado[clave] = v;
    ctrl.estado.page = 0;
    catalogoMarcarFiltros(ctrl);
    catalogoCargar(ctrl, false);
  }

  /* Buscador con debounce: una sola consulta cuando el usuario para. */
  function catalogoBuscar(ctrl, valor) {
    if (!ctrl) return;
    var v = fichaTexto(valor);
    if (v === ctrl.estado.q) return;
    ctrl.estado.q = v;
    ctrl.estado.page = 0;
    if (ctrl.timer && typeof w.clearTimeout === 'function') w.clearTimeout(ctrl.timer);
    if (typeof w.setTimeout !== 'function') {
      catalogoCargar(ctrl, false);
      return;
    }
    ctrl.timer = w.setTimeout(function () {
      ctrl.timer = null;
      catalogoCargar(ctrl, false);
    }, 350);
  }

  function catalogoClick(ctrl, ev) {
    var t = ev && ev.target;
    if (!t) return;
    if (catalogoCerca(t, 'data-c-cat-abrir', ctrl.host)) {
      catalogoAbrir(ctrl);
      return;
    }
    if (catalogoCerca(t, 'data-c-cat-reintentar', ctrl.host)) {
      catalogoCargar(ctrl, false);
      return;
    }
    var fam = catalogoCerca(t, 'data-cat-fam', ctrl.host);
    if (fam) {
      catalogoFiltro(ctrl, 'familia', fam.getAttribute('data-cat-fam'));
      return;
    }
    var rar = catalogoCerca(t, 'data-cat-rar', ctrl.host);
    if (rar) {
      catalogoFiltro(ctrl, 'rareza', rar.getAttribute('data-cat-rar'));
      return;
    }
    if (catalogoCerca(t, 'data-c-cat-mas', ctrl.host)) {
      catalogoCargar(ctrl, true);
      return;
    }
    var btn = catalogoCerca(t, 'data-c-acunar', ctrl.host);
    if (btn) acunarDesdeBoton(btn);
  }

  /* Marca la tarjeta acunada en el DOM sin recargar la pagina. */
  function catalogoMarcarTarjeta(ctrl, detalle) {
    var host = ctrl && ctrl.host;
    if (!host || typeof host.querySelectorAll !== 'function' || !detalle) return;
    var id = fichaTexto(detalle.carta_id);
    var cards = host.querySelectorAll('[data-c-cat-id]');
    for (var i = 0; i < cards.length; i++) {
      if (fichaTexto(cards[i].getAttribute('data-c-cat-id')) !== id) continue;
      cards[i].setAttribute('data-c-cat-estado', 'posee');
      var cant = safeNum(detalle.cantidad, null);
      if (typeof cards[i].querySelector === 'function') {
        var acc = cards[i].querySelector('.c-cat-acc');
        if (acc) {
          acc.innerHTML = '<span class="c-cat-nota">Acunada'
            + (cant !== null ? ' - tienes <b>' + esc(miles(cant)) + '</b>' : '')
            + '</span>';
        }
        var stock = cards[i].querySelector('[data-c-cat-stock]');
        var rest = cards[i].querySelector('[data-c-cat-rest]');
        var filas = ctrl.estado.filas || [];
        for (var j = 0; j < filas.length; j++) {
          if (fichaTexto(filas[j] && filas[j].id) !== id) continue;
          if (stock) stock.textContent = catalogoTirada(filas[j]);
          var q = safeNum(filas[j].restantes, null);
          if (rest) rest.textContent = (q !== null && q > 0) ? 'quedan ' + miles(q) : '';
        }
      }
      return;
    }
  }

  /* Monta el panel si la pagina trae el host. Idempotente y barato: sin host
     (comunidad.html, perfil.html) devuelve false y no toca la red. */
  function catalogoMontar(idHost, opciones) {
    var doc = (typeof document !== 'undefined') ? document : null;
    if (!doc || typeof doc.getElementById !== 'function') return false;
    var id = fichaTexto(idHost) || 'catalogo-panel';
    var host = doc.getElementById(id);
    if (!host) return false;
    if (catalogoCtrl && catalogoCtrl.host === host) {
      if (opciones && opciones.auto) catalogoAbrir(catalogoCtrl);
      return true;
    }
    var ctrl = {
      host: host, estado: catalogoEstadoBase(), abierto: false,
      grid: null, info: null, mas: null, rejilla: null, timer: null
    };
    catalogoCtrl = ctrl;
    if (typeof host.addEventListener === 'function') {
      host.addEventListener('click', function (ev) { catalogoClick(ctrl, ev); });
      host.addEventListener('input', function (ev) {
        var q = catalogoCerca(ev && ev.target, 'data-c-cat-q', host);
        if (q) catalogoBuscar(ctrl, q.value);
      });
    }
    if (doc.addEventListener) {
      doc.addEventListener('cartas:acunar', function (ev) {
        var det = ev && ev.detail;
        if (!catalogoAplicarAcunar(ctrl.estado, det)) return;
        catalogoMarcarTarjeta(ctrl, det);
      });
    }
    if (opciones && opciones.auto) catalogoAbrir(ctrl);
    return true;
  }

  /* =====================================================================
     EXPEDICIONES -- misiones repetibles con ventana rodante de 24 h
     GET  /api/interacciones?tipo=expediciones&usuario_id=<uid>
     POST /api/interacciones?tipo=expedicion_cobrar {mision_id, accion_ref}

     Reglas que esta UI NO rompe:
     - Los caps (usadas/limite, xp_dia/limite_xp) se PINTAN tal como llegan:
       cero recalculo en cliente (el POST los re-valida de todos modos).
     - accion_ref sale SIEMPRE de acciones_pendientes[0].ref. Ni se inventa
       ni se reutiliza una ya cobrada: el backend solo acepta la derivada.
     - repetido:true (xp:0) NO es error: se dice "Ya la hiciste".
     ===================================================================== */
  var EXP_RAMAS = { difusion: 'Difusion', hallazgo: 'Hallazgo' };
  var EXP_RAMAS_ORDEN = ['difusion', 'hallazgo'];
  var EXP_URL_GET = '/api/interacciones?tipo=expediciones&usuario_id=';
  var EXP_URL_POST = '/api/interacciones?tipo=expedicion_cobrar';
  var expCtrl = null;

  /* uid de la sesion vigente. null = sin sesion (estado vacio, cero red). */
  function expUsuarioId() {
    var E = w.ExploraCO;
    var u = (E && E.usuario) || null;
    var id = fichaTexto(u && u.id);
    return id || null;
  }

  function expUrl(uid) {
    return EXP_URL_GET + encodeURIComponent(String(uid || ''));
  }

  /* Etiqueta de eje: 'alcance' -> 'Alcance'. Eje desconocido, tal cual. */
  function expEjeLabel(eje) {
    var s = fichaTexto(eje);
    if (!s) return '';
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  /* Acciones que faltan para cerrar el siguiente bloque de cobro. */
  function expAccionesFaltan(m) {
    var acc = (m && m.acciones) || {};
    var n = safeNum(acc.por_cobro, 1);
    var total = safeNum(acc.total, 0);
    var cobros = safeNum(acc.cobros, 0);
    if (!(n >= 1)) n = 1;
    var libre = total - cobros * n;
    if (libre >= n) return 0;
    if (libre < 0) libre = 0;
    return n - libre;
  }

  /* Estado visible de una mision. Solo LEE lo que manda el servidor. */
  function expEstadoMision(m) {
    var bloqueo = fichaTexto(m && m.bloqueo).toUpperCase();
    var pend = (m && m.acciones_pendientes) || [];
    var ref = fichaTexto(pend[0] && pend[0].ref);
    if (m && m.disponible === true && ref) {
      return { clave: 'listo', texto: 'Cumplida y lista' };
    }
    if (bloqueo === 'UMBRAL') {
      return { clave: 'umbral', texto: 'Umbral no alcanzado' };
    }
    if (bloqueo === 'CAP_DIARIO' || bloqueo === 'CAP_RECOMPENSA') {
      return { clave: 'cap', texto: 'Cap diario' };
    }
    /* senal_disponible false = fail-closed del backend: no hay accion que
       cobrar y no se inventa otra senal. */
    if (m && m.senal_disponible === false) {
      return { clave: 'sin_accion', texto: 'Sin accion disponible' };
    }
    if (bloqueo === 'SIN_ACCION' || (m && m.motivo === 'SIN_ACCION')) {
      var falta = expAccionesFaltan(m);
      if (falta > 0) {
        return { clave: 'acciones', texto: 'Te faltan ' + falta
          + (falta === 1 ? ' accion' : ' acciones') };
      }
      return { clave: 'sin_accion', texto: 'Sin accion disponible' };
    }
    return { clave: 'sin_accion', texto: 'Sin accion disponible' };
  }

  /* "faltan Alcance 4 y Fortuna 2" a partir del objeto que manda el POST. */
  function expFaltanTexto(faltan) {
    var f = faltan || {};
    var ejes = Object.keys(f);
    var out = [];
    var i, v;
    for (i = 0; i < ejes.length; i++) {
      v = safeNum(f[ejes[i]], 0);
      if (v > 0) out.push(expEjeLabel(ejes[i]) + ' ' + miles(v));
    }
    if (!out.length) return 'sin datos de umbral';
    return 'faltan ' + out.join(' y ');
  }

  /* Traduccion de codigo a frase legible. Nunca vuelca JSON crudo. */
  function expMensaje(code, body) {
    var c = fichaTexto(code).toUpperCase();
    var b = body || {};
    if (c === 'UMBRAL_NO_ALCANZADO') {
      return 'Aun no alcanzas el umbral: ' + expFaltanTexto(b.faltan) + '.';
    }
    if (c === 'CAP_DIARIO') {
      var usadas = safeNum(b.usadas, null);
      var lim = safeNum(b.limite, null);
      var det = (usadas !== null && lim !== null) ? ' (' + usadas + '/' + lim + ')' : '';
      return 'Cap diario agotado' + det + '. Vuelve cuando se libere la ventana de 24 h.';
    }
    if (c === 'CAP_RECOMPENSA') {
      var rem = safeNum(b.remanente_xp, null);
      return 'Ya no te queda XP de recompensa en esta ventana'
        + (rem !== null ? ' (quedan ' + miles(rem) + ')' : '') + '.';
    }
    if (c === 'ACCION_NO_VERIFICADA') {
      return 'Esa accion ya no es cobrable. Refresca el panel y vuelve a intentar.';
    }
    if (c === 'MISION_NO_ENCONTRADA') return 'Esa mision ya no existe.';
    if (c === 'SESION_REQUERIDA' || c === 'USUARIO_ID_INVALIDO') return 'Entra para expedicionar.';
    if (c === 'NO_DISPONIBLE') return 'Expediciones no disponibles.';
    if (c === 'CONEXION') return 'Sin conexion. Revisa tu red e intenta de nuevo.';
    return 'No se pudo cobrar la expedicion. Intenta de nuevo.';
  }

  /* Confirmacion con la XP que se va a ganar (nunca un si a ciegas). */
  function expTextoConfirmacion(m) {
    var xp = safeNum(m && m.xp, 0);
    var nombre = fichaTexto(m && m.nombre) || 'esta mision';
    return 'Vas a expedicionar "' + nombre + '" y ganar ' + miles(xp) + ' XP. Continuar?';
  }

  function expConfirmar(m) {
    var txt = expTextoConfirmacion(m);
    if (typeof w.confirm !== 'function') return true;
    try {
      return w.confirm(txt) === true;
    } catch (eConfirm) {
      return true;
    }
  }

  /* GET sin rechazo: siempre resuelve {ok:true,datos} o {ok:false,error,mensaje}. */
  function expNormalizar(json, status) {
    var st = safeNum(status, 0);
    if (!json || json.ok !== true) {
      var code = fichaTexto(json && (json.error || json.code)).toUpperCase();
      if (code === 'SESION_REQUERIDA' || st === 401) {
        return { ok: false, error: 'SESION_REQUERIDA', mensaje: 'Entra para expedicionar.' };
      }
      if (st === 503 || code === 'NO_DISPONIBLE' || code === 'SCHEMA_PENDIENTE') {
        return { ok: false, error: 'NO_DISPONIBLE', mensaje: expMensaje('NO_DISPONIBLE') };
      }
      return { ok: false, error: 'SERVIDOR',
        mensaje: 'No se pudieron cargar las expediciones. Intenta de nuevo.' };
    }
    var misiones = json.misiones;
    if (!misiones || typeof misiones.length !== 'number') {
      return { ok: false, error: 'SERVIDOR',
        mensaje: 'No se pudieron cargar las expediciones. Intenta de nuevo.' };
    }
    return {
      ok: true,
      datos: {
        cap: json.cap || {},
        misiones: misiones,
        vector: json.vector || {},
        acciones_pendientes_total: safeNum(json.acciones_pendientes_total, 0)
      }
    };
  }

  function expPedir(uid) {
    var u = fichaTexto(uid);
    if (!u) {
      return Promise.resolve({
        ok: false, error: 'SESION_REQUERIDA', mensaje: 'Entra para expedicionar.'
      });
    }
    return Promise.resolve().then(function () {
      return fetch(expUrl(u), {
        method: 'GET', credentials: 'same-origin', headers: cabecerasPost()
      });
    }).then(function (res) {
      var st = safeNum(res && res.status, 0);
      return leerCuerpo(res).then(function (j) {
        return expNormalizar(j, st);
      }, function () {
        return expNormalizar(null, st);
      });
    }, function () {
      return { ok: false, error: 'CONEXION', mensaje: expMensaje('CONEXION') };
    });
  }

  /* POST del cobro. La ref la pone SIEMPRE el llamador desde
     acciones_pendientes[0].ref; aqui no se deriva nada. */
  function expCobrar(misionId, accionRef) {
    var uid = expUsuarioId();
    var cuerpo = { mision_id: String(misionId), usuario_id: String(uid || '') };
    if (accionRef) cuerpo.accion_ref = String(accionRef);
    return Promise.resolve().then(function () {
      return fetch(EXP_URL_POST, {
        method: 'POST', credentials: 'same-origin',
        headers: cabecerasPost(), body: JSON.stringify(cuerpo)
      });
    }).then(function (res) {
      var st = safeNum(res && res.status, 0);
      return leerCuerpo(res).then(function (j) {
        if (j && j.ok === true) return { ok: true, status: st, datos: j };
        var code = fichaTexto(j && (j.code || j.error)).toUpperCase() || 'SERVIDOR';
        return {
          ok: false, status: st, code: code, datos: j,
          mensaje: expMensaje(code, j)
        };
      }, function () {
        return { ok: false, status: st, code: 'SERVIDOR',
          mensaje: expMensaje('SERVIDOR') };
      });
    }, function () {
      return { ok: false, status: 0, code: 'CONEXION', mensaje: expMensaje('CONEXION') };
    });
  }

  function expAvisoHtml(ctrl) {
    var a = ctrl && ctrl.aviso;
    if (!a || !a.texto) return '';
    var tipo = a.tipo === 'error' ? 'error' : 'ok';
    return '<div class="c-exp-aviso c-exp-aviso--' + tipo
      + '" role="status" aria-live="polite" data-c-exp-aviso="' + tipo + '">'
      + esc(a.texto) + '</div>';
  }

  /* Una barra por cap. El ancho es solo presentacion de lo que llega. */
  function expCapHtml(label, valor, limite) {
    var v = safeNum(valor, 0);
    var lim = safeNum(limite, 0);
    var pct = lim > 0 ? Math.min(100, Math.round((v / lim) * 100)) : 0;
    var lleno = lim > 0 && v >= lim;
    return '<div class="c-exp-cap' + (lleno ? ' is-full' : '') + '">'
      + '<span class="c-exp-cap-k">' + esc(label) + '</span>'
      + '<span class="c-exp-cap-v"><b>' + esc(miles(v)) + '</b>/' + esc(miles(lim)) + '</span>'
      + '<span class="c-exp-bar" role="img" aria-label="' + catalogoAttr(label) + ': '
      + catalogoAttr(miles(v)) + ' de ' + catalogoAttr(miles(lim)) + '">'
      + '<span class="c-exp-bar-f" style="width:' + pct + '%"></span></span></div>';
  }

  function expCabeceraHtml(datos) {
    var d = datos || {};
    var cap = d.cap || {};
    var usadas = safeNum(cap.usadas, 0);
    var limite = safeNum(cap.limite, 0);
    var xp = safeNum(cap.xp_dia, 0);
    var limXp = safeNum(cap.limite_xp, 0);
    var pend = safeNum(d.acciones_pendientes_total, 0);
    var html = '<div class="c-exp-head">'
      + '<div class="c-exp-head-t">'
      + '<span class="c-exp-head-n">Expediciones</span>'
      + '<span class="c-exp-head-p">' + esc(miles(pend)) + ' acciones pendientes</span>'
      + '</div><div class="c-exp-caps">'
      + expCapHtml('Cobros 24 h', usadas, limite)
      + expCapHtml('XP 24 h', xp, limXp)
      + '</div><button type="button" class="c-exp-refrescar" data-c-exp-refrescar="1">'
      + 'Refrescar</button></div>';
    if (limite > 0 && usadas >= limite) {
      html += '<div class="c-exp-aviso c-exp-aviso--cap" role="status">'
        + 'Cap diario agotado: ' + esc(miles(usadas)) + ' de ' + esc(miles(limite))
        + ' cobros en las ultimas 24 h.</div>';
    } else if (limXp > 0 && xp >= limXp) {
      html += '<div class="c-exp-aviso c-exp-aviso--cap" role="status">'
        + 'Tope de XP alcanzado: ' + esc(miles(xp)) + ' de ' + esc(miles(limXp))
        + ' XP en las ultimas 24 h.</div>';
    }
    return html;
  }

  /* Ejes: valor propio frente al umbral, con el que falta marcado. */
  function expEjesHtml(m) {
    var req = (m && m.requiere_stats) || {};
    var tus = (m && m.stats_usuario) || {};
    var fal = (m && m.faltan) || {};
    var ejes = Object.keys(req);
    var html = '<div class="c-exp-ejes">';
    var i, eje, min, act, falta, ok;
    for (i = 0; i < ejes.length; i++) {
      eje = ejes[i];
      min = safeNum(req[eje], 0);
      act = safeNum(tus[eje], 0);
      falta = safeNum(fal[eje], Math.max(0, min - act));
      ok = act >= min;
      html += '<span class="c-exp-eje' + (ok ? ' is-ok' : ' is-falta') + '"'
        + ' data-c-exp-eje="' + catalogoAttr(eje) + '">'
        + '<span class="c-exp-eje-k">' + esc(expEjeLabel(eje)) + '</span>'
        + '<b>' + esc(miles(act)) + '</b>'
        + '<span class="c-exp-eje-min">/' + esc(miles(min)) + '</span>'
        + (ok ? '' : '<i class="c-exp-eje-f">faltan ' + esc(miles(falta)) + '</i>')
        + '</span>';
    }
    return html + '</div>';
  }

  function expMisionHtml(m, ctrl) {
    var id = fichaTexto(m && m.id);
    var est = expEstadoMision(m);
    var xp = safeNum(m && m.xp, 0);
    var pend = (m && m.acciones_pendientes) || [];
    var ref = fichaTexto(pend[0] && pend[0].ref);
    var enviando = fichaTexto(ctrl && ctrl.enviando) === id;
    var puede = !enviando && m && m.disponible === true && !!ref;
    var html = '<li class="c-exp-m" data-c-exp-id="' + catalogoAttr(id)
      + '" data-c-exp-estado="' + est.clave + '">'
      + '<div class="c-exp-m-top">'
      + '<span class="c-exp-m-n">' + esc(fichaTexto(m && m.nombre) || id) + '</span>'
      + '<span class="c-exp-m-xp">' + esc(miles(xp)) + ' XP</span></div>';
    var desc = fichaTexto(m && m.descripcion);
    if (desc) html += '<p class="c-exp-m-d">' + esc(desc) + '</p>';
    html += expEjesHtml(m);
    var det = fichaTexto(pend[0] && pend[0].detalle);
    if (det) html += '<div class="c-exp-m-ref">Cobra: ' + esc(det) + '</div>';
    html += '<div class="c-exp-m-pie">'
      + '<span class="c-exp-m-est is-' + est.clave + '">' + esc(est.texto) + '</span>';
    if (puede) {
      html += '<button type="button" class="c-exp-go" data-c-exp-go="1"'
        + ' data-mision-id="' + catalogoAttr(id) + '"'
        + ' data-accion-ref="' + catalogoAttr(ref) + '">Expedicionar'
        + ' <span class="c-exp-go-xp">' + esc(miles(xp)) + ' XP</span></button>';
    } else if (enviando) {
      html += '<button type="button" class="c-exp-go" data-c-exp-go="1"'
        + ' data-mision-id="' + catalogoAttr(id) + '" disabled aria-busy="true">'
        + 'Enviando...</button>';
    }
    return html + '</div></li>';
  }

  /* Agrupa por rama respetando el orden del catalogo; una rama nueva que
     el backend anada manana no se pierde: cae en su propio grupo. */
  function expRamasHtml(datos, ctrl) {
    var misiones = (datos && datos.misiones) || [];
    var orden = [];
    var grupos = {};
    var i, rama;
    for (i = 0; i < EXP_RAMAS_ORDEN.length; i++) {
      orden.push(EXP_RAMAS_ORDEN[i]);
      grupos[EXP_RAMAS_ORDEN[i]] = [];
    }
    for (i = 0; i < misiones.length; i++) {
      rama = fichaTexto(misiones[i] && misiones[i].expedicion_rama) || 'otras';
      if (!grupos[rama]) {
        grupos[rama] = [];
        orden.push(rama);
      }
      grupos[rama].push(misiones[i]);
    }
    var html = '';
    for (i = 0; i < orden.length; i++) {
      rama = orden[i];
      var lote = grupos[rama] || [];
      if (!lote.length) continue;
      html += '<div class="c-exp-rama" data-c-exp-rama="' + catalogoAttr(rama) + '">'
        + '<div class="c-exp-rama-t">'
        + '<span class="c-exp-rama-n">' + esc(EXP_RAMAS[rama] || expEjeLabel(rama)) + '</span>'
        + '<span class="c-exp-rama-c">' + lote.length
        + (lote.length === 1 ? ' mision' : ' misiones') + '</span></div>'
        + '<ul class="c-exp-lista">';
      for (var j = 0; j < lote.length; j++) html += expMisionHtml(lote[j], ctrl);
      html += '</ul></div>';
    }
    if (!html) {
      return '<div class="c-exp-vacio" role="status">No hay expediciones disponibles.</div>';
    }
    return html;
  }

  function expVacioHtml() {
    return '<div class="c-exp-panel" data-c-exp-panel="1">'
      + '<div class="c-exp-vacio" role="status" data-c-exp-sin-sesion="1">'
      + '<span class="c-exp-vacio-t">Entra para expedicionar.</span>'
      + '<a class="c-exp-entrar" href="index.html">Iniciar sesion</a>'
      + '</div></div>';
  }

  /* Cuerpo completo del panel a partir del estado del controlador. */
  function expPanelHtml(ctrl) {
    var c = ctrl || {};
    var html = expAvisoHtml(c);
    if (c.error) {
      return '<div class="c-exp-panel" data-c-exp-panel="1">' + html
        + '<div class="c-exp-vacio c-exp-vacio--error" role="status">' + esc(c.error)
        + ' <button type="button" class="c-exp-mas" data-c-exp-refrescar="1">'
        + 'Reintentar</button></div></div>';
    }
    if (!c.datos) {
      return '<div class="c-exp-panel" data-c-exp-panel="1">' + html
        + '<div class="c-exp-vacio" role="status">Cargando expediciones...</div></div>';
    }
    return '<div class="c-exp-panel" data-c-exp-panel="1">' + html
      + expCabeceraHtml(c.datos) + expRamasHtml(c.datos, c) + '</div>';
  }

  function expPintar(ctrl, html) {
    if (!ctrl || !ctrl.host) return false;
    ctrl.host.innerHTML = html;
    return true;
  }

  function expMisionDe(ctrl, id) {
    var misiones = (ctrl && ctrl.datos && ctrl.datos.misiones) || [];
    for (var i = 0; i < misiones.length; i++) {
      if (fichaTexto(misiones[i] && misiones[i].id) === id) return misiones[i];
    }
    return null;
  }

  /* Refresca SOLO el panel (un GET), nunca recarga la pagina. */
  function expCargar(ctrl) {
    if (!ctrl) return Promise.resolve(false);
    var uid = expUsuarioId();
    if (!uid) {
      ctrl.datos = null;
      ctrl.error = null;
      ctrl.enviando = '';
      expPintar(ctrl, expVacioHtml());
      return Promise.resolve(false);
    }
    ctrl.cargando = true;
    return expPedir(uid).then(function (r) {
      ctrl.cargando = false;
      if (!r || r.ok !== true) {
        ctrl.datos = null;
        ctrl.error = (r && r.mensaje) || 'No se pudieron cargar las expediciones.';
        expPintar(ctrl, expPanelHtml(ctrl));
        return false;
      }
      ctrl.error = null;
      ctrl.datos = r.datos;
      expPintar(ctrl, expPanelHtml(ctrl));
      return true;
    });
  }

  function expCobrarDesdeBoton(ctrl, btn) {
    if (!ctrl || ctrl.enviando) return Promise.resolve(false);
    var misionId = fichaTexto(btn && btn.getAttribute('data-mision-id'));
    if (!misionId) return Promise.resolve(false);
    var m = expMisionDe(ctrl, misionId);
    if (!m || m.disponible !== true) return Promise.resolve(false);
    var pend = m.acciones_pendientes || [];
    var ref = fichaTexto(pend[0] && pend[0].ref);
    if (!ref) return Promise.resolve(false);
    if (!expConfirmar(m)) return Promise.resolve(false);
    ctrl.enviando = misionId;
    ctrl.aviso = { tipo: 'ok', texto: 'Enviando la expedicion...' };
    expPintar(ctrl, expPanelHtml(ctrl));
    return expCobrar(misionId, ref).then(function (r) {
      ctrl.enviando = '';
      if (!r || r.ok !== true) {
        ctrl.aviso = {
          tipo: 'error',
          texto: (r && r.mensaje) || expMensaje('SERVIDOR')
        };
      } else if (r.datos && r.datos.repetido === true) {
        ctrl.aviso = { tipo: 'ok', texto: 'Ya la hiciste: esta mision no da XP nueva.' };
      } else {
        ctrl.aviso = {
          tipo: 'ok',
          texto: 'Cobraste ' + miles(safeNum(r.datos && r.datos.xp, 0)) + ' XP con '
            + (fichaTexto(m.nombre) || 'la expedicion') + '.'
        };
      }
      return expCargar(ctrl).then(function () { return true; });
    });
  }

  function expClick(ctrl, ev) {
    if (!ctrl) return;
    var go = catalogoCerca(ev && ev.target, 'data-c-exp-go', ctrl.host);
    if (go) {
      expCobrarDesdeBoton(ctrl, go);
      return;
    }
    if (catalogoCerca(ev && ev.target, 'data-c-exp-refrescar', ctrl.host)) {
      expCargar(ctrl);
    }
  }

  function expedicionesMontar(idHost, opciones) {
    var doc = (typeof document !== 'undefined') ? document : null;
    if (!doc || typeof doc.getElementById !== 'function') return false;
    var id = fichaTexto(idHost) || 'expediciones-panel';
    var host = doc.getElementById(id);
    if (!host) return false;
    if (expCtrl && expCtrl.host === host) {
      if (opciones && opciones.auto) expCargar(expCtrl);
      return true;
    }
    var ctrl = {
      host: host, datos: null, error: null, aviso: null,
      enviando: '', cargando: false
    };
    expCtrl = ctrl;
    if (typeof host.addEventListener === 'function') {
      host.addEventListener('click', function (ev) { expClick(ctrl, ev); });
    }
    if (opciones && opciones.auto) {
      expCargar(ctrl);
      if (!expUsuarioId()) expEsperarSesion(ctrl, 0);
    }
    return true;
  }

  /* La pagina resuelve la sesion DESPUES de DOMContentLoaded (el perfil
     llega por API). Sin esto el panel se quedaria en "Entra para
     expedicionar" aunque el usuario ya tenga sesion. Sondeo ACOTADO y sin
     red: mientras no hay uid no sale ninguna peticion. */
  var EXP_ESPERA_MAX = 12;
  var EXP_ESPERA_MS = 500;

  function expEsperarSesion(ctrl, intentos) {
    if (!ctrl || expCtrl !== ctrl) return;
    if (expUsuarioId()) {
      expCargar(ctrl);
      return;
    }
    if (intentos >= EXP_ESPERA_MAX) return;
    if (!w || typeof w.setTimeout !== 'function') return;
    w.setTimeout(function () {
      expEsperarSesion(ctrl, intentos + 1);
    }, EXP_ESPERA_MS);
  }

  /* Auto-arranque: solo pinta los paneles en las paginas que los declaran. */
  if (typeof document !== 'undefined' && document.addEventListener) {
    var panelesArrancar = function () {
      catalogoMontar('catalogo-panel');
      expedicionesMontar('expediciones-panel', { auto: true });
    };
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', panelesArrancar);
    } else {
      panelesArrancar();
    }
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
    subirNivelCarta: subirNivelCarta,
    acunarCarta: acunarCarta,
    acunarDesdeBoton: acunarDesdeBoton,
    CATALOGO_LIMIT: CATALOGO_LIMIT,
    CATALOGO_FAMILIAS: CATALOGO_FAMILIAS,
    CATALOGO_RAREZAS: CATALOGO_RAREZAS,
    catalogoEstadoBase: catalogoEstadoBase,
    catalogoUrl: catalogoUrl,
    catalogoNormalizar: catalogoNormalizar,
    catalogoPedir: catalogoPedir,
    catalogoEstadoCarta: catalogoEstadoCarta,
    catalogoTirada: catalogoTirada,
    catalogoCartaHtml: catalogoCartaHtml,
    catalogoFiltrosHtml: catalogoFiltrosHtml,
    catalogoGridHtml: catalogoGridHtml,
    catalogoInfoTexto: catalogoInfoTexto,
    catalogoHayMas: catalogoHayMas,
    catalogoAplicarAcunar: catalogoAplicarAcunar,
    catalogoMontar: catalogoMontar,
    expUrl: expUrl,
    expAccionesFaltan: expAccionesFaltan,
    expEstadoMision: expEstadoMision,
    expFaltanTexto: expFaltanTexto,
    expMensaje: expMensaje,
    expTextoConfirmacion: expTextoConfirmacion,
    expNormalizar: expNormalizar,
    expPedir: expPedir,
    expCobrar: expCobrar,
    expCabeceraHtml: expCabeceraHtml,
    expMisionHtml: expMisionHtml,
    expRamasHtml: expRamasHtml,
    expPanelHtml: expPanelHtml,
    expVacioHtml: expVacioHtml,
    expCargar: expCargar,
    expCobrarDesdeBoton: expCobrarDesdeBoton,
    expedicionesMontar: expedicionesMontar
  };

}(window));
