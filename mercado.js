/* mercado.js - ExploraCO
 * Mercado de Emprendedores (backend api/interacciones.js v28 / migracion 034).
 *
 * Asset compartido (mismo patron que mapa-cultural.js / media-actions.js):
 *   - comunidad.html -> tab "Mercado"  -> window.Mercado.cargar()
 *   - mi-perfil.html -> card "Emprendedor" -> window.Mercado.cargarMi()
 *
 * API PUBLICA (contrato):
 *   Mercado.cargar()              carga/repinta el panel de comunidad (#mercado-cuerpo)
 *   Mercado.cargarMi()            carga/repinta la card de perfil (#pf-mercado)
 *   Mercado.setCasa(casa)         cambia la Casa activa del panel
 *   Mercado.onOrigenChange()      repuebla el select de items segun el origen
 *   Mercado.toggleForm(v)         abre/cierra el formulario de publicacion
 *   Mercado.toggleProducir(v)     abre/cierra el formulario de produccion
 *   Mercado.publicar()            POST mercado_publicar
 *   Mercado.comprar(id, inputId)  POST mercado_comprar
 *   Mercado.cancelar(id)          POST mercado_cancelar
 *   Mercado.producir()            POST mercado_producir
 *   Mercado.irAlMercado()         navega a comunidad.html#mercado
 *   Mercado.login()               abre el login (window.ExploraCO.mostrarLogin)
 *
 * Sesion: window.ExploraCO (usuario-session.js). Los POST mandan
 * Authorization: Bearer <jwt> y reintentan una vez via refreshJwt() si el
 * backend responde 401 (mismo mecanismo que comunidad.html/mi-perfil.html;
 * Regla de No-Duplicidad: la sesion NO se reimplementa aqui).
 *
 * ASCII-safe (ADR-002): sin caracteres > 127 ni backticks; las tildes van
 * como escapes \uXXXX simples (sin doble escape, BUG-002).
 */
(function () {
  'use strict';

  var VERSION = '1.0.0';
  var ENDPOINT = '/api/interacciones';

  var CASAS = [
    { id: 'condor', nombre: 'C\u00f3ndor', icono: '\uD83E\uDD85' },
    { id: 'jaguar', nombre: 'Jaguar',     icono: '\uD83D\uDC06' },
    { id: 'delfin', nombre: 'Delf\u00edn', icono: '\uD83D\uDC2C' }
  ];
  var TIERS = [0, 100, 250, 450, 700];

  /* Mensajes amigables por codigo de error del backend (v28). */
  var ERR = {
    NIVEL_INSUFICIENTE: 'Necesitas nivel 2 o mas para operar en el Mercado.',
    CASA_REQUERIDA: 'Elige tu Casa en Mi Perfil antes de operar en el Mercado.',
    MERCADO_INACTIVO: 'El Mercado de esa Casa esta inactivo por ahora.',
    PRECIO_FUERA_DE_RANGO: 'El precio esta fuera del rango permitido.',
    NODO_INSUFICIENTE: 'Tu nodo de Mercado aun no habilita esta accion.',
    PRODUCCION_DESHABILITADA: 'La produccion no esta habilitada en esa Casa.',
    CONSUMIBLE_NO_PRODUCIBLE: 'Ese item no se puede producir.',
    SIN_SLOTS: 'No tienes espacios de oferta libres. Cancela una oferta o sube de nodo.',
    INVENTARIO_INSUFICIENTE: 'No tienes suficientes unidades en tu inventario.',
    OFERTA_NO_DISPONIBLE: 'Esa oferta ya no esta disponible.',
    OFERTA_NO_ENCONTRADA: 'Esa oferta no existe.',
    OFERTA_NO_ACTIVA: 'Esa oferta ya no esta activa.',
    OFERTA_INVALIDA: 'No se pudo publicar la oferta (item invalido).',
    CANTIDAD_INSUFICIENTE: 'No queda esa cantidad en la oferta.',
    NO_ES_TU_OFERTA: 'Esa oferta no es tuya.',
    XP_INSUFICIENTE: 'No te alcanza el XP para esta operacion.',
    AUTOCOMPRA_PROHIBIDA: 'No puedes comprar tu propia oferta.',
    CROSS_CASA_NO_PERMITIDO: 'Esa Casa no permite operar entre Casas.',
    LIMITE_COMPRAS_24H: 'Alcanzaste el limite de 20 compras en 24 horas.',
    SCHEMA_NOT_MIGRATED: 'El Mercado se esta habilitando. Vuelve pronto.',
    SESION_REQUERIDA: 'Inicia sesion para operar en el Mercado.',
    SESION_EXPIRADA: 'Tu sesion expiro. Vuelve a entrar.',
    SESION_INVALIDA: 'Tu sesion no es valida. Vuelve a entrar.'
  };

  /* ---- Estado del modulo (una sola copia; ambas paginas la comparten) ---- */
  var _config = null;   // filas de mercado_config
  var _casaSel = '';    // Casa seleccionada en el panel de comunidad
  var _ofertas = [];    // ofertas de la Casa seleccionada
  var _mi = null;       // respuesta de mercado_mi
  var _inv = {};        // inventario (consumibles -> cantidad)
  var _catalogo = null; // catalogo de consumibles
  var _form = false;    // formulario de publicacion abierto
  var _prod = false;    // formulario de produccion abierto

  /* ---- Helpers ---- */
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function num(v) { var n = Number(v); return isFinite(n) ? n : 0; }
  function fmt(v) {
    var n = Math.round(num(v) * 100) / 100;
    try { return n.toLocaleString('es-CO', { maximumFractionDigits: 2 }); }
    catch (e) { return String(n); }
  }
  function usuario() { return (window.ExploraCO && window.ExploraCO.usuario) || null; }
  function jwt() {
    if (window.ExploraCO && typeof window.ExploraCO.obtenerJwt === 'function') {
      try { var t = window.ExploraCO.obtenerJwt(); if (t) return t; } catch (e) {}
    }
    var u = usuario();
    return (u && u.jwt) ? u.jwt : '';
  }
  function toast(msg, color) {
    if (window.ExploraCO && typeof window.ExploraCO.mostrarToast === 'function') {
      window.ExploraCO.mostrarToast(msg, color); return;
    }
    if (window.console && window.console.warn) window.console.warn('[mercado] ' + msg);
  }
  function pedirLogin() {
    if (window.ExploraCO && typeof window.ExploraCO.mostrarLogin === 'function') {
      window.ExploraCO.mostrarLogin();
    } else {
      window.location.href = 'index.html#comunidad';
    }
  }
  function casaDelUsuario() {
    var u = usuario();
    return (u && u.casa) ? String(u.casa).toLowerCase() : '';
  }
  function casaInfo(id) {
    for (var i = 0; i < CASAS.length; i++) if (CASAS[i].id === id) return CASAS[i];
    return { id: id, nombre: id, icono: '\uD83C\uDFF4' };
  }
  function cfgDe(casa) {
    var lista = _config || [];
    for (var i = 0; i < lista.length; i++) if (String(lista[i].casa) === casa) return lista[i];
    return null;
  }
  function filaMi(casa) {
    if (!casa || !_mi || !_mi.casas) return null;
    for (var i = 0; i < _mi.casas.length; i++) {
      if (String(_mi.casas[i].casa) === casa) return _mi.casas[i];
    }
    return null;
  }
  function tierInfo(puntos) {
    var p = num(puntos), idx = 0;
    for (var i = 0; i < TIERS.length; i++) if (p >= TIERS[i]) idx = i;
    var esTope = idx >= TIERS.length - 1;
    var next = esTope ? null : TIERS[idx + 1];
    var pct = esTope ? 100 : Math.round((p - TIERS[idx]) / (next - TIERS[idx]) * 100);
    if (!isFinite(pct)) pct = 0;
    if (pct < 0) pct = 0;
    if (pct > 100) pct = 100;
    return { nodo: idx + 1, min: TIERS[idx], next: next, pct: pct, esTope: esTope };
  }
  function errorMsg(body) {
    var code = (body && body.error) || '';
    var msg = ERR[code] || code || 'No se pudo completar la operacion.';
    if (code === 'PRECIO_FUERA_DE_RANGO' && body && body.precio_min != null && body.precio_max != null) {
      msg += ' Rango: ' + fmt(body.precio_min) + ' a ' + fmt(body.precio_max) + ' XP.';
    }
    return msg;
  }
  function val(id) { var e = document.getElementById(id); return e ? String(e.value || '').trim() : ''; }

  /* ---- HTTP ---- */
  function getJSON(qs) {
    return fetch(ENDPOINT + '?' + qs)
      .then(function (r) { return r.json().catch(function () { return {}; }); });
  }
  function post(body) {
    var h = { 'Content-Type': 'application/json' };
    var t = jwt();
    if (t) h['Authorization'] = 'Bearer ' + t;
    return fetch(ENDPOINT, { method: 'POST', headers: h, body: JSON.stringify(body) })
      .then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (j) {
          return { status: r.status, body: j };
        });
      })
      .then(function (res) {
        var err = res.body && res.body.error;
        var esSesion = res.status === 401 &&
          (err === 'SESION_REQUERIDA' || err === 'SESION_EXPIRADA' || err === 'SESION_INVALIDA');
        if (esSesion && window.ExploraCO && typeof window.ExploraCO.refreshJwt === 'function') {
          return window.ExploraCO.refreshJwt().then(function (nj) {
            if (!nj) return res.body;
            var h2 = { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + nj };
            return fetch(ENDPOINT, { method: 'POST', headers: h2, body: JSON.stringify(body) })
              .then(function (r2) { return r2.json().catch(function () { return {}; }); });
          });
        }
        return res.body;
      });
  }

  /* ---- Carga de datos ---- */
  function cargarConfig() {
    if (_config) return Promise.resolve(_config);
    return getJSON('tipo=mercado_config')
      .then(function (res) { _config = (res && res.data) || []; return _config; })
      .catch(function () { _config = []; return _config; });
  }
  function cargarMiData() {
    var u = usuario();
    if (!u || !u.id) return Promise.resolve(null);
    return getJSON('tipo=mercado_mi&usuario_id=' + encodeURIComponent(u.id))
      .then(function (res) { _mi = (res && res.data) || null; return _mi; })
      .catch(function () { _mi = null; return null; });
  }
  function cargarCatalogo() {
    if (_catalogo) return Promise.resolve(_catalogo);
    return getJSON('tipo=consumibles')
      .then(function (res) { _catalogo = (res && res.data) || []; return _catalogo; })
      .catch(function () { _catalogo = []; return _catalogo; });
  }
  function cargarInventario() {
    var u = usuario();
    if (!u || !u.id) { _inv = {}; return Promise.resolve({}); }
    return getJSON('tipo=inventario&usuario_id=' + encodeURIComponent(u.id))
      .then(function (res) {
        _inv = (res && res.data && res.data.consumibles) || {};
        return _inv;
      })
      .catch(function () { _inv = {}; return _inv; });
  }
  function cargarOfertas() {
    if (!_casaSel) return Promise.resolve([]);
    return getJSON('tipo=mercado_ofertas&casa=' + encodeURIComponent(_casaSel))
      .then(function (res) { _ofertas = (res && res.data) || []; return _ofertas; })
      .catch(function () { _ofertas = []; return _ofertas; });
  }
  function producibles() {
    return (_catalogo || []).filter(function (c) {
      return String(c.tipo_canje || '') === 'producir';
    });
  }
  function itemsInventario() {
    return Object.keys(_inv || {}).filter(function (k) {
      return (parseInt((_inv[k] || {}).cantidad, 10) || 0) > 0;
    });
  }

  /* ---- Render: comunidad (tab Mercado) ---- */
  function gateHtml() {
    return '<div class="mk-gate">'
      + '<div class="mk-gate-t">\uD83D\uDD12 Mercado de Emprendedores</div>'
      + '<div class="mk-gate-d">Inicia sesion para comprar, vender y producir consumibles en el Mercado de tu Casa.</div>'
      + '<button type="button" class="pand-btn" onclick="Mercado.login()">\uD83D\uDD11 Iniciar sesion</button>'
      + '</div>';
  }
  function dato(l, v) {
    return '<div class="mk-dato"><span>' + esc(l) + '</span><b>' + esc(v) + '</b></div>';
  }
  function selectorCasasHtml(casaU) {
    var h = '<div class="mk-casas">';
    CASAS.forEach(function (c) {
      var on = (c.id === _casaSel) ? ' on' : '';
      var mia = (c.id === casaU) ? ' <span class="mk-mia">Tu Casa</span>' : '';
      h += '<button type="button" class="mk-casa' + on + '" onclick="Mercado.setCasa(\'' + c.id + '\')">'
        + '<span class="mk-casa-ico">' + c.icono + '</span>' + esc(c.nombre) + mia + '</button>';
    });
    h += '</div>';
    return h;
  }
  function normaHtml() {
    var cfg = cfgDe(_casaSel) || {};
    var fila = filaMi(_casaSel);
    var imp = (fila && fila.impuesto_efectivo_pct != null) ? fila.impuesto_efectivo_pct : cfg.impuesto_base_pct;
    var arancel = (fila && fila.arancel_inter_casa_pct != null) ? fila.arancel_inter_casa_pct : cfg.arancel_inter_casa_pct;
    var slots = fila ? (fila.slots_usados + ' / ' + fila.slots_totales)
      : (cfg.slots_base != null ? (cfg.slots_base + ' base') : '-');
    var pmin = (fila && fila.precio_min != null) ? fila.precio_min : cfg.precio_min;
    var pmax = (fila && fila.precio_max != null) ? fila.precio_max : cfg.precio_max;
    var horas = (fila && fila.duracion_oferta_horas) ? fila.duracion_oferta_horas : cfg.duracion_oferta_horas;
    var cross = (fila && fila.permite_cross_casa != null) ? fila.permite_cross_casa : cfg.permite_cross_casa;
    var prod = (fila && fila.permite_produccion != null) ? fila.permite_produccion : cfg.permite_produccion;
    return '<div class="mk-norma">'
      + '<div class="mk-norma-t">Norma de la Casa ' + esc(casaInfo(_casaSel).nombre)
      + (cfg.activo === false ? ' \u00b7 inactiva' : '') + '</div>'
      + '<div class="mk-norma-grid">'
      + dato('Impuesto', fmt(imp) + '%')
      + dato('Arancel inter-Casa', fmt(arancel) + '%')
      + dato('Slots', slots)
      + dato('Precio', fmt(pmin) + ' - ' + fmt(pmax) + ' XP')
      + dato('Duracion', (horas || '-') + ' h')
      + dato('Cross-Casa', cross ? 'Si' : 'No')
      + dato('Produccion', prod ? 'Si' : 'No')
      + '</div></div>';
  }
  function accionesHtml() {
    var mi = _mi || {};
    var h = '<div class="mk-acciones">';
    h += '<button type="button" class="pand-btn" onclick="Mercado.toggleForm(' + (_form ? 'false' : 'true') + ')">'
      + (_form ? 'Cerrar' : '+ Publicar oferta') + '</button>';
    if (mi.produce) {
      h += '<button type="button" class="pand-btn pand-btn-outline" onclick="Mercado.toggleProducir(' + (_prod ? 'false' : 'true') + ')">'
        + (_prod ? 'Cerrar produccion' : '\u2699 Producir') + '</button>';
    }
    if (mi.mercado_puntos != null) {
      h += '<span class="mk-puntos">' + fmt(mi.mercado_puntos) + ' pts \u00b7 '
        + esc(mi.mercado_nodo_nombre || '') + '</span>';
    }
    h += '</div>';
    return h;
  }
  function opcionesItems(origen) {
    var list = [];
    if (origen === 'produccion') {
      list = producibles().map(function (c) { return { clave: c.clave, nombre: c.nombre || c.clave }; });
    } else {
      list = itemsInventario().map(function (k) {
        var it = _inv[k] || {};
        return { clave: k, nombre: (it.nombre || k) + ' (x' + (parseInt(it.cantidad, 10) || 0) + ')' };
      });
    }
    if (!list.length) return '<option value="">Sin items disponibles</option>';
    return list.map(function (o) {
      return '<option value="' + esc(o.clave) + '">' + esc(o.nombre) + '</option>';
    }).join('');
  }
  function opcionesProducibles() {
    var list = producibles();
    if (!list.length) return '<option value="">Sin items producibles</option>';
    return list.map(function (c) {
      var costo = (c.precio_xp_base != null) ? (' \u00b7 ' + fmt(c.precio_xp_base) + ' XP') : '';
      return '<option value="' + esc(c.clave) + '">' + esc((c.nombre || c.clave) + costo) + '</option>';
    }).join('');
  }
  function formPublicarHtml() {
    var fila = filaMi(casaDelUsuario());
    var cfg = cfgDe(_casaSel) || {};
    var pmin = (fila && fila.precio_min != null) ? fila.precio_min : cfg.precio_min;
    var pmax = (fila && fila.precio_max != null) ? fila.precio_max : cfg.precio_max;
    var ph = (pmin != null || pmax != null) ? (fmt(pmin) + ' - ' + fmt(pmax) + ' XP') : 'Precio unitario (XP)';
    return '<div class="mk-form">'
      + '<div class="mk-form-t">Publicar oferta</div>'
      + '<label class="mk-lbl">Origen</label>'
      + '<select class="chat-inp mk-inp" id="mk-origen" onchange="Mercado.onOrigenChange()">'
      + '<option value="inventario">Desde mi inventario</option>'
      + ((_mi && _mi.produce) ? '<option value="produccion">Produccion</option>' : '')
      + '</select>'
      + '<label class="mk-lbl">Item</label>'
      + '<select class="chat-inp mk-inp" id="mk-item">' + opcionesItems('inventario') + '</select>'
      + '<div class="mk-row">'
      + '<div><label class="mk-lbl">Cantidad</label><input class="chat-inp mk-inp" id="mk-cant" type="number" min="1" max="999" value="1"></div>'
      + '<div><label class="mk-lbl">Precio unitario (XP)</label><input class="chat-inp mk-inp" id="mk-precio" type="number" min="0" step="0.01" placeholder="' + esc(ph) + '"></div>'
      + '</div>'
      + '<div class="mk-form-actions">'
      + '<button type="button" class="chat-send" onclick="Mercado.publicar()">Publicar</button>'
      + '<button type="button" class="mk-btn-ghost" onclick="Mercado.toggleForm(false)">Cancelar</button>'
      + '</div></div>';
  }
  function formProducirHtml() {
    return '<div class="mk-form">'
      + '<div class="mk-form-t">Producir consumible</div>'
      + '<label class="mk-lbl">Item producible</label>'
      + '<select class="chat-inp mk-inp" id="mk-prod-item">' + opcionesProducibles() + '</select>'
      + '<label class="mk-lbl">Cantidad (max 10)</label>'
      + '<input class="chat-inp mk-inp" id="mk-prod-cant" type="number" min="1" max="10" value="1">'
      + '<div class="mk-form-actions">'
      + '<button type="button" class="chat-send" onclick="Mercado.producir()">Producir</button>'
      + '<button type="button" class="mk-btn-ghost" onclick="Mercado.toggleProducir(false)">Cancelar</button>'
      + '</div></div>';
  }
  function ofertasHtml(miId) {
    var h = '<div class="mk-sec-t">Ofertas en ' + esc(casaInfo(_casaSel).nombre) + '</div>';
    if (!_ofertas.length) {
      return h + '<div class="mk-msg">No hay ofertas activas en esta Casa. Se el primero en publicar.</div>';
    }
    h += '<div class="mk-ofertas">';
    _ofertas.forEach(function (o) {
      var propia = String(o.vendedor_id) === String(miId);
      var restante = parseInt(o.cantidad_restante, 10) || 0;
      var ref = (o.precio_referencia != null)
        ? (' \u00b7 referencia ' + fmt(o.precio_referencia) + ' XP') : '';
      h += '<div class="mk-oferta"><div class="mk-of-main">'
        + '<div class="mk-of-nombre">' + esc(o.nombre || o.clave || 'Item')
        + (propia ? ' <span class="mk-mia">Tuya</span>' : '') + '</div>'
        + '<div class="mk-of-meta">' + fmt(o.precio_unitario) + ' XP c/u'
        + ' \u00b7 quedan ' + restante + ref + '</div>'
        + '</div>';
      if (!propia && restante > 0) {
        var inputId = 'mk-q-' + String(o.id);
        h += '<div class="mk-of-buy">'
          + '<input class="chat-inp mk-qty" id="' + esc(inputId) + '" type="number" min="1" max="' + restante + '" value="1">'
          + '<button type="button" class="pand-btn" onclick="Mercado.comprar(\'' + esc(String(o.id)) + '\',\'' + esc(inputId) + '\')">Comprar</button>'
          + '</div>';
      } else if (propia) {
        h += '<div class="mk-of-buy"><span class="mk-of-propia">En venta</span></div>';
      }
      h += '</div>';
    });
    h += '</div>';
    return h;
  }
  function misOfertasHtml() {
    var ofertas = (_mi && _mi.ofertas) || [];
    var h = '<div class="mk-sec-t">Mis ofertas</div>';
    if (!ofertas.length) return h + '<div class="mk-msg">Aun no tienes ofertas activas.</div>';
    h += '<div class="mk-ofertas">';
    ofertas.forEach(function (o) {
      var restante = parseInt(o.cantidad_restante, 10) || 0;
      h += '<div class="mk-oferta"><div class="mk-of-main">'
        + '<div class="mk-of-nombre">' + esc(o.nombre || o.clave || 'Item')
        + ' <span class="mk-mia">' + esc(casaInfo(String(o.casa || '')).nombre) + '</span></div>'
        + '<div class="mk-of-meta">' + fmt(o.precio_unitario) + ' XP c/u \u00b7 ' + restante
        + ' de ' + (parseInt(o.cantidad, 10) || 0) + ' disponibles</div>'
        + '</div>'
        + '<div class="mk-of-buy"><button type="button" class="pand-btn pand-btn-danger" onclick="Mercado.cancelar(\'' + esc(String(o.id)) + '\')">Cancelar</button></div>'
        + '</div>';
    });
    h += '</div>';
    return h;
  }
  function renderComunidad() {
    var el = document.getElementById('mercado-cuerpo');
    if (!el) return;
    var u = usuario();
    if (!u || !u.id) { el.innerHTML = gateHtml(); return; }
    var casaU = casaDelUsuario();
    var html = '<div class="mk-head">'
      + '<div class="mk-title">\uD83D\uDED2 Mercado de Emprendedores</div>'
      + '<div class="mk-sub">Compra, vende y produce consumibles dentro de tu Casa.</div>'
      + '</div>'
      + selectorCasasHtml(casaU)
      + normaHtml()
      + accionesHtml();
    if (_form) html += formPublicarHtml();
    if (_prod) html += formProducirHtml();
    html += ofertasHtml(u.id);
    html += misOfertasHtml();
    el.innerHTML = html;
  }
  function cargar() {
    var el = document.getElementById('mercado-cuerpo');
    if (!el) return Promise.resolve();
    var u = usuario();
    if (!u || !u.id) { el.innerHTML = gateHtml(); return Promise.resolve(); }
    el.innerHTML = '<div class="mk-msg">Cargando Mercado\u2026</div>';
    _casaSel = casaDelUsuario() || _casaSel || 'condor';
    return Promise.all([cargarConfig(), cargarMiData(), cargarCatalogo(), cargarInventario()])
      .then(function () { return cargarOfertas(); })
      .then(function () { renderComunidad(); })
      .catch(function () {
        el.innerHTML = '<div class="mk-msg">No se pudo cargar el Mercado. Intenta de nuevo.</div>';
      });
  }

  /* ---- Render: mi-perfil (card Emprendedor) ---- */
  function barraHtml(t) {
    var falta = t.next == null ? 0 : (t.next - num(_mi && _mi.mercado_puntos));
    var txt = t.esTope ? 'Nodo maximo alcanzado' : (fmt(falta) + ' pts para el siguiente nodo');
    return '<div class="pf-mercado-bar"><div class="pf-mercado-fill" style="width:' + t.pct + '%"></div></div>'
      + '<div class="pf-casa-dato">' + esc(txt) + '</div>';
  }
  function renderPerfil() {
    var el = document.getElementById('pf-mercado');
    if (!el) return;
    var u = usuario();
    if (!u || !u.id) {
      el.innerHTML = '<div class="pf-casa"><div class="pf-casa-nota">Inicia sesion para ver tu panel de Emprendedor.</div></div>';
      return;
    }
    var mi = _mi || {};
    var casaU = casaDelUsuario();
    var fila = filaMi(casaU);
    var t = tierInfo(mi.mercado_puntos);
    var html = '<div class="pf-casa">'
      + '<div class="pf-casa-cabeza">'
      + '<span class="facc-current">\uD83D\uDED2 Emprendedor</span>'
      + '<span class="pf-casa-meta">' + fmt(mi.mercado_puntos) + ' pts de Mercado</span>'
      + '</div>'
      + '<div class="pf-casa-nota">Nodo ' + t.nodo + ': ' + esc(mi.mercado_nodo_nombre || 'Aprendiz de Mercado') + '</div>'
      + barraHtml(t);
    if (casaU && fila) {
      html += '<div class="pf-casa-dato">Casa ' + esc(casaInfo(casaU).nombre)
        + ' \u00b7 slots ' + fila.slots_usados + '/' + fila.slots_totales + '</div>'
        + '<div class="pf-casa-dato">Impuesto efectivo ' + fmt(fila.impuesto_efectivo_pct)
        + '% \u00b7 arancel inter-Casa ' + fmt(fila.arancel_inter_casa_pct) + '%</div>';
    } else {
      html += '<div class="pf-casa-nota">Elige tu Casa en la pestana Clase para operar en el Mercado.</div>';
    }
    html += '<div style="margin-top:10px">'
      + '<a class="pf-mkt-btn" href="comunidad.html#mercado">Ir al Mercado</a>'
      + '</div></div>';
    el.innerHTML = html;
  }
  function cargarMi() {
    var el = document.getElementById('pf-mercado');
    if (!el) return Promise.resolve();
    var u = usuario();
    if (!u || !u.id) {
      el.innerHTML = '<div class="pf-casa"><div class="pf-casa-nota">Inicia sesion para ver tu panel de Emprendedor.</div></div>';
      return Promise.resolve();
    }
    el.innerHTML = '<div class="pf-casa"><div class="pf-casa-nota">Cargando panel de Emprendedor\u2026</div></div>';
    return Promise.all([cargarConfig(), cargarMiData()])
      .then(function () { renderPerfil(); })
      .catch(function () {
        el.innerHTML = '<div class="pf-casa"><div class="pf-casa-nota">No se pudo cargar el panel de Emprendedor.</div></div>';
      });
  }

  /* ---- Acciones ---- */
  function recargar() {
    return Promise.all([cargarMiData(), cargarInventario()])
      .then(function () { return cargarOfertas(); })
      .then(function () {
        if (document.getElementById('mercado-cuerpo')) renderComunidad();
        if (document.getElementById('pf-mercado')) renderPerfil();
      })
      .catch(function () {});
  }
  function setCasa(casa) {
    casa = String(casa || '').toLowerCase();
    if (casa === _casaSel) return;
    _casaSel = casa;
    var el = document.getElementById('mercado-cuerpo');
    if (el) el.innerHTML = '<div class="mk-msg">Cargando ofertas\u2026</div>';
    cargarOfertas().then(renderComunidad);
  }
  function toggleForm(v) { _form = !!v; renderComunidad(); }
  function toggleProducir(v) { _prod = !!v; renderComunidad(); }
  function onOrigenChange() {
    var sel = document.getElementById('mk-origen');
    var item = document.getElementById('mk-item');
    if (sel && item) item.innerHTML = opcionesItems(sel.value || 'inventario');
  }
  function publicar() {
    var origen = val('mk-origen') || 'inventario';
    var clave = val('mk-item');
    var cant = parseInt(val('mk-cant'), 10);
    if (!isFinite(cant) || cant < 1) cant = 1;
    var precio = Number(val('mk-precio'));
    if (!clave) { toast('Elige un item para ofertar', '#ef4444'); return; }
    if (!(precio > 0)) { toast('Escribe un precio valido', '#ef4444'); return; }
    post({ tipo: 'mercado_publicar', origen: origen, clave: clave, cantidad: cant, precio_unitario: precio })
      .then(function (res) {
        if (res && res.ok) {
          toast('\u2705 Oferta publicada', '#16a34a');
          _form = false;
          recargar();
        } else { toast(errorMsg(res), '#ef4444'); }
      })
      .catch(function () { toast('Error de conexion', '#ef4444'); });
  }
  function comprar(ofertaId, inputId) {
    var cant = parseInt(val(inputId), 10);
    if (!isFinite(cant) || cant < 1) cant = 1;
    post({ tipo: 'mercado_comprar', oferta_id: ofertaId, cantidad: cant })
      .then(function (res) {
        if (res && res.ok) {
          toast('\u2705 Compra realizada (' + fmt(res.subtotal_xp) + ' XP)', '#16a34a');
          recargar();
        } else { toast(errorMsg(res), '#ef4444'); }
      })
      .catch(function () { toast('Error de conexion', '#ef4444'); });
  }
  function cancelar(ofertaId) {
    post({ tipo: 'mercado_cancelar', oferta_id: ofertaId })
      .then(function (res) {
        if (res && res.ok) {
          var extra = res.devueltas ? (' (' + res.devueltas + ' devueltas)') : '';
          toast('\u2705 Oferta cancelada' + extra, '#16a34a');
          recargar();
        } else { toast(errorMsg(res), '#ef4444'); }
      })
      .catch(function () { toast('Error de conexion', '#ef4444'); });
  }
  function producir() {
    var clave = val('mk-prod-item');
    var cant = parseInt(val('mk-prod-cant'), 10);
    if (!isFinite(cant) || cant < 1) cant = 1;
    if (!clave) { toast('Elige un item producible', '#ef4444'); return; }
    post({ tipo: 'mercado_producir', clave: clave, cantidad: cant })
      .then(function (res) {
        if (res && res.ok) {
          toast('\u2705 Producido (' + fmt(res.costo_xp) + ' XP)', '#16a34a');
          _prod = false;
          recargar();
        } else { toast(errorMsg(res), '#ef4444'); }
      })
      .catch(function () { toast('Error de conexion', '#ef4444'); });
  }
  function irAlMercado() { window.location.href = 'comunidad.html#mercado'; }

  window.Mercado = {
    version: VERSION,
    cargar: cargar,
    cargarMi: cargarMi,
    setCasa: setCasa,
    onOrigenChange: onOrigenChange,
    toggleForm: toggleForm,
    toggleProducir: toggleProducir,
    publicar: publicar,
    comprar: comprar,
    cancelar: cancelar,
    producir: producir,
    irAlMercado: irAlMercado,
    login: pedirLogin
  };
})();
