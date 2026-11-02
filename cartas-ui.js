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

  /* Entero seguro, o null si el dato no es numerico. */
  function fichaEntero(v) {
    if (v === null || v === undefined || v === '' || typeof v === 'boolean') return null;
    var n = Number(v);
    if (!isFinite(n)) return null;
    return n;
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

    return '<div class="c-ficha-bd" data-c-ficha-cerrar></div>'
      + '<div class="c-ficha-box" role="dialog" aria-modal="true" aria-labelledby="c-ficha-tit">'
      + '<button type="button" class="c-ficha-x" data-c-ficha-cerrar aria-label="Cerrar">&times;</button>'
      + '<div class="c-ficha-arte">' + arte + '</div>'
      + '<div class="c-ficha-info">'
      + '<h3 id="c-ficha-tit" class="c-ficha-n ' + esc(claseRareza(rareza, variante)) + '">'
      + esc(nombre || 'Carta') + '</h3>'
      + '<div class="c-ficha-tags">' + tags.join('') + '</div>'
      + '<div class="c-ficha-qty">' + esc(qtyPartes.join(' - ')) + '</div>'
      + '<p class="c-ficha-desc">' + esc(desc) + '</p>'
      + bloqueCf
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
    urlMuseo: urlMuseo,
    fetchMuseo: fetchMuseo,
    TOPE_MUSEO: TOPE_MUSEO,
    abrirFicha: abrirFicha,
    cerrarFicha: cerrarFicha,
    fichaAbierta: fichaAbierta
  };

}(window));
