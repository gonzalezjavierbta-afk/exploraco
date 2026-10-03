/* mercado.js - LATAWEL
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
 *   Mercado.recargar()            recarga mi/inventario/ofertas del contexto activo
 *
 * T6 (vista de comunidad, solo lectura):
 *   Mercado.setFiltroCasa(v)      filtra las ofertas por Casa SIN red (cache)
 *   Mercado.setFiltroCat(v)       filtra el catalogo: todos | mios | otros
 *   Mercado.buscarCatalogo(q)     busca en el catalogo por nombre o clave
 *   Mercado.onItemChange()        recalcula el maximo publicable del formulario
 *
 * SEGURIDAD (T6): la vista amplia (todas las Casas + catalogo completo) es
 * SOLO LECTURA. Ampliar lo que se ve NO habilita publicar mas. El POST
 * publicar() revalida la propiedad contra _inv antes de enviar, y la
 * validacion autoritativa sigue en el servidor (api/interacciones.js,
 * rama mercado_publicar -> descontarInventario()): si la cantidad excede lo
 * poseido responde 409 INVENTARIO_INSUFICIENTE. Ese chequeo no se relaja.
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

  var VERSION = '1.1.0';
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
  var _config = null;        // filas de mercado_config
  var _casaSel = '';         // Casa seleccionada (define la NORMA que se muestra)
  var _ofertas = [];         // ofertas de _casaSel (compat)
  var _ofertasPorCasa = {};  // casa -> ofertas (T6: TODAS las Casas, en cache)
  var _ofertasListas = false;// las N consultas por Casa ya resolvieron
  var _filtroCasa = 'todas'; // 'todas' | id de Casa (filtro local, sin red)
  var _filtroCat = 'todos';  // 'todos' | 'mios' | 'otros' (catalogo)
  var _buscaCat = '';        // texto de busqueda en el catalogo
  var _mi = null;            // respuesta de mercado_mi
  var _inv = {};             // inventario (consumibles -> {cantidad, nombre})
  var _invListo = false;     // el inventario se cargo bien (gate de seguridad)
  var _catalogo = null;      // catalogo de consumibles
  var _form = false;         // formulario de publicacion abierto
  var _prod = false;         // formulario de produccion abierto

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
    if (!u || !u.id) { _inv = {}; _invListo = true; return Promise.resolve({}); }
    return getJSON('tipo=inventario&usuario_id=' + encodeURIComponent(u.id))
      .then(function (res) {
        var d = res && res.data;
        if (d && d.consumibles) {
          _inv = d.consumibles;
          _invListo = true;   // solo aqui: el POST depende de _inv
        } else {
          _inv = {};
          _invListo = false;  // fallo: no se puede autorizar la escritura
        }
        return _inv;
      })
      .catch(function () { _inv = {}; _invListo = false; return _inv; });
  }

  /* Casas con Mercado segun _config (mercado_config). Si la config no llega,
   * se cae a las 3 Casas del silo para no dejar la vista vacia. */
  function casasConMercado() {
    var lista = _config || [];
    var out = [];
    CASAS.forEach(function (c) {
      if (!lista.length || cfgDe(c.id)) out.push(c.id);
    });
    if (!out.length) {
      CASAS.forEach(function (c) { out.push(c.id); });
    }
    return out;
  }

  /* T6: una consulta por Casa al MISMO endpoint (GET tipo=mercado_ofertas&casa=).
   * No hay endpoint nuevo: se cicla el query param, en paralelo. Cada casa
   * queda cacheada en _ofertasPorCasa para que el filtro sea sin red. */
  function cargarOfertasTodas() {
    var casas = casasConMercado();
    _ofertasListas = false;
    return Promise.all(casas.map(function (c) {
      return getJSON('tipo=mercado_ofertas&casa=' + encodeURIComponent(c))
        .then(function (res) {
          _ofertasPorCasa[c] = (res && res.ok !== false && res.data) ? res.data : [];
          return _ofertasPorCasa[c];
        })
        .catch(function () { _ofertasPorCasa[c] = []; return []; });
    })).then(function () {
      _ofertasPorCasa[_casaSel] = _ofertasPorCasa[_casaSel] || [];
      _ofertas = _ofertasPorCasa[_casaSel];
      _ofertasListas = true;
    });
  }

  function invCant(clave) {
    var it = (_inv || {})[clave] || {};
    return parseInt(it.cantidad, 10) || 0;
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

  /* ---- CSS del silo (ADR-004): se inyecta una sola vez, todo bajo
   * #cpanel-mercado .mk-* (mismo criterio que el bloque de comunidad.html).
   * Nada suelto en :root. ---- */
  var CSS_ID = 'mk-css-t6';
  function inyectarCss() {
    if (!document.getElementById(CSS_ID)) {
      var s = document.createElement('style');
      s.id = CSS_ID;
      s.textContent = [
        '#cpanel-mercado .mk-vista{display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin:0 0 10px}',
        '#cpanel-mercado .mk-chip{padding:6px 12px;border-radius:20px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.04);color:rgba(255,255,255,.7);font-family:Outfit,sans-serif;font-size:11px;cursor:pointer;transition:all .18s}',
        '#cpanel-mercado .mk-chip:hover{background:rgba(255,255,255,.08);color:#fff}',
        '#cpanel-mercado .mk-chip.on{background:var(--gold);border-color:var(--gold);color:var(--black);font-weight:700}',
        '#cpanel-mercado .mk-chip-n{opacity:.65;margin-left:4px}',
        '#cpanel-mercado .mk-chip.on .mk-chip-n{opacity:.85}',
        '#cpanel-mercado .mk-busca{flex:1;min-width:150px;padding:7px 12px}',
        '#cpanel-mercado .mk-casa-grp{margin-bottom:14px}',
        '#cpanel-mercado .mk-grp-t{display:flex;align-items:center;gap:6px;font-family:Barlow Condensed,sans-serif;font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:1px;color:var(--gold);margin:12px 0 8px}',
        '#cpanel-mercado .mk-grp-n{font-size:10px;font-weight:400;letter-spacing:0;text-transform:none;color:rgba(255,255,255,.4)}',
        '#cpanel-mercado .mk-of-otra{display:inline-block;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;border:1px solid rgba(255,255,255,.18);border-radius:999px;padding:1px 7px;color:rgba(255,255,255,.6);margin-left:6px}',
        '#cpanel-mercado .mk-cat{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:8px}',
        '#cpanel-mercado .mk-cat-c{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);border-radius:8px;padding:10px 12px}',
        '#cpanel-mercado .mk-cat-n{font-size:12px;font-weight:700;color:#fff}',
        '#cpanel-mercado .mk-cat-meta{font-size:10px;color:rgba(255,255,255,.45);margin-top:3px;line-height:1.5}',
        '#cpanel-mercado .mk-cat-d{font-size:10px;color:rgba(255,255,255,.35);margin-top:4px;line-height:1.5}',
        '#cpanel-mercado .mk-cat-t{display:inline-block;font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:.6px;border-radius:999px;padding:2px 8px;margin-top:6px}',
        '#cpanel-mercado .mk-cat-t.tienes{background:rgba(34,197,94,.14);border:1px solid rgba(34,197,94,.45);color:#22C55E}',
        '#cpanel-mercado .mk-cat-t.falta{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.15);color:rgba(255,255,255,.55)}',
        '#cpanel-mercado .mk-cat-t.bloq{background:rgba(239,68,68,.12);border:1px solid rgba(239,68,68,.4);color:#fca5a5;margin-left:5px}',
        '#cpanel-mercado .mk-nota{font-size:10px;color:rgba(255,255,255,.35);padding:8px 2px;line-height:1.5}',
        '@media(max-width:540px){#cpanel-mercado .mk-cat{grid-template-columns:1fr}}'
      ].join('');
      document.head.appendChild(s);
    }
  }

  /* ---- Selectores de vista (T6): filtran en memoria, sin recargar pagina ---- */
  function chipCasasHtml() {
    var h = '<div class="mk-vista">';
    h += '<button type="button" class="mk-chip' + (_filtroCasa === 'todas' ? ' on' : '')
      + '" onclick="Mercado.setFiltroCasa(\'todas\')">Todas las Casas'
      + '<span class="mk-chip-n">' + totalOfertas() + '</span></button>';
    casasConMercado().forEach(function (id) {
      var ci = casaInfo(id);
      var n = (_ofertasPorCasa[id] || []).length;
      h += '<button type="button" class="mk-chip' + (_filtroCasa === id ? ' on' : '')
        + '" onclick="Mercado.setFiltroCasa(\'' + esc(id) + '\')">' + esc(ci.icono + ' ' + ci.nombre)
        + '<span class="mk-chip-n">' + n + '</span></button>';
    });
    h += '</div>';
    return h;
  }
  function casasVisibles() {
    var casas = casasConMercado();
    if (_filtroCasa === 'todas') return casas;
    return casas.filter(function (c) { return c === _filtroCasa; });
  }
  function totalOfertas() {
    var n = 0;
    casasConMercado().forEach(function (c) { n += (_ofertasPorCasa[c] || []).length; });
    return n;
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
  /* SEGURIDAD (T6): el formulario de publicar SOLO ofrece items poseidos.
   * El catalogo completo se muestra aparte (solo lectura); nunca se agrega
   * aqui un item que el usuario no tenga. El POST revalida igual. */
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
  /* Maximo publicable segun lo realmente poseido (T6). Refuerza el input,
   * pero NO es la validacion: esa vive en publicar() y en el servidor. */
  function maxPublicable(clave) {
    var n = clave ? invCant(clave) : 0;
    if (!n && itemsInventario().length) n = invCant(itemsInventario()[0]);
    return String(n > 0 ? n : 1);
  }
  function onItemChange() {
    var item = document.getElementById('mk-item');
    var cant = document.getElementById('mk-cant');
    if (!item || !cant) return;
    var owned = invCant(item.value);
    cant.max = String(owned > 0 ? owned : 1);
    var v = parseInt(cant.value, 10) || 1;
    if (v > owned) cant.value = String(owned > 0 ? owned : 1);
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
      + '<select class="chat-inp mk-inp" id="mk-item" onchange="Mercado.onItemChange()">' + opcionesItems('inventario') + '</select>'
      + '<div class="mk-row">'
      + '<div><label class="mk-lbl">Cantidad</label><input class="chat-inp mk-inp" id="mk-cant" type="number" min="1" max="' + maxPublicable('') + '" value="1"></div>'
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
  /* T6: una fila por oferta. Reutilizada por el grupo de cada Casa.
   * El boton Comprar solo depende de que sea ajena y quede stock; la
   * permiso real (cross-Casa, nivel, slots) lo aplica el servidor. */
  function ofertaFilaHtml(o, miId, casaId) {
    var propia = String(o.vendedor_id) === String(miId);
    var restante = parseInt(o.cantidad_restante, 10) || 0;
    var ref = (o.precio_referencia != null)
      ? (' \u00b7 referencia ' + fmt(o.precio_referencia) + ' XP') : '';
    var otra = (!propia && casaId && casaId !== casaDelUsuario())
      ? '<span class="mk-of-otra">otra Casa</span>' : '';
    var h = '<div class="mk-oferta"><div class="mk-of-main">'
      + '<div class="mk-of-nombre">' + esc(o.nombre || o.clave || 'Item')
      + (propia ? ' <span class="mk-mia">Tuya</span>' : '') + otra + '</div>'
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
    return h;
  }
  /* T6: TODAS las Casas agrupadas por Casa, con el nombre de cada una visible.
   * El filtro (_filtroCasa) se aplica sobre _ofertasPorCasa: cero red. */
  function ofertasHtml(miId) {
    var h = '<div class="mk-sec-t">Productos a la venta</div>';
    if (!_ofertasListas) return h + '<div class="mk-msg">Cargando ofertas de todas las Casas\u2026</div>';
    var visibles = casasVisibles();
    var h2 = '';
    var total = 0;
    visibles.forEach(function (casa) {
      var lista = _ofertasPorCasa[casa] || [];
      total += lista.length;
      var ci = casaInfo(casa);
      var cfg = cfgDe(casa);
      var inactiva = (cfg && cfg.activo === false);
      h2 += '<div class="mk-casa-grp">'
        + '<div class="mk-grp-t">' + esc(ci.icono + ' ' + ci.nombre)
        + '<span class="mk-grp-n">' + lista.length + (lista.length === 1 ? ' oferta' : ' ofertas')
        + (inactiva ? ' \u00b7 mercado inactivo' : '') + '</span></div>';
      if (!lista.length) {
        h2 += '<div class="mk-msg">Aun no hay ofertas activas en esta Casa.</div>';
      } else {
        h2 += '<div class="mk-ofertas">';
        lista.forEach(function (o) { h2 += ofertaFilaHtml(o, miId, casa); });
        h2 += '</div>';
      }
      h2 += '</div>';
    });
    if (!visibles.length) return h + '<div class="mk-msg">Elige una Casa para ver su mercado.</div>';
    if (!total) {
      return h + chipCasasHtml()
        + '<div class="mk-msg">No hay ofertas activas todavia. Se el primero en publicar.</div>';
    }
    return h + chipCasasHtml() + h2;
  }

  /* ---- Catalogo completo (T6): todo lo que existe, marcando lo que tienes.
   * Es informacion de solo lectura: no habilita publicar nada. ---- */
  function catalogoFiltrado() {
    var q = String(_buscaCat || '').toLowerCase().trim();
    return (_catalogo || []).filter(function (c) {
      var cant = invCant(String(c.clave || ''));
      if (_filtroCat === 'mios' && cant <= 0) return false;
      if (_filtroCat === 'otros' && cant > 0) return false;
      if (!q) return true;
      var nombre = String(c.nombre || '').toLowerCase();
      var clave = String(c.clave || '').toLowerCase();
      var desc = String(c.descripcion || '').toLowerCase();
      return nombre.indexOf(q) !== -1 || clave.indexOf(q) !== -1 || desc.indexOf(q) !== -1;
    });
  }
  function catalogoHtml() {
    var todo = _catalogo || [];
    var nMios = todo.filter(function (c) { return invCant(String(c.clave || '')) > 0; }).length;
    var h = '<div class="mk-sec-t">Catalogo de productos</div>';
    if (!todo.length) return h + '<div class="mk-msg">No se pudo cargar el catalogo de productos.</div>';
    h += '<div class="mk-vista">';
    h += '<button type="button" class="mk-chip' + (_filtroCat === 'todos' ? ' on' : '')
      + '" onclick="Mercado.setFiltroCat(\'todos\')">Todos<span class="mk-chip-n">' + todo.length + '</span></button>';
    h += '<button type="button" class="mk-chip' + (_filtroCat === 'mios' ? ' on' : '')
      + '" onclick="Mercado.setFiltroCat(\'mios\')">Lo tienes<span class="mk-chip-n">' + nMios + '</span></button>';
    h += '<button type="button" class="mk-chip' + (_filtroCat === 'otros' ? ' on' : '')
      + '" onclick="Mercado.setFiltroCat(\'otros\')">Disponible<span class="mk-chip-n">'
      + (todo.length - nMios) + '</span></button>';
    h += '<input class="chat-inp mk-busca" type="search" placeholder="Buscar producto o clave..."'
      + ' value="' + esc(_buscaCat) + '" oninput="Mercado.buscarCatalogo(this.value)">';
    h += '</div>';
    var list = catalogoFiltrado();
    if (!list.length) {
      return h + '<div class="mk-msg">Ningun producto coincide con ese filtro.</div>';
    }
    h += '<div class="mk-cat">';
    list.forEach(function (c) {
      var clave = String(c.clave || '');
      var cant = invCant(clave);
      var precio = (c.precio_xp != null) ? fmt(c.precio_xp) + ' XP' : '-';
      var extra = (c.precio_xp_base != null && c.precio_xp_base !== c.precio_xp)
        ? (' \u00b7 base ' + fmt(c.precio_xp_base) + ' XP') : '';
      var desc = String(c.descripcion || '');
      if (desc.length > 110) desc = desc.slice(0, 110) + '\u2026';
      var tags = (cant > 0)
        ? '<span class="mk-cat-t tienes">Lo tienes: x' + cant + '</span>'
        : '<span class="mk-cat-t falta">No lo tienes</span>';
      if (c.bloqueado) tags += '<span class="mk-cat-t bloq">Fuera de tu era</span>';
      h += '<div class="mk-cat-c">'
        + '<div class="mk-cat-n">' + esc(c.nombre || clave) + '</div>'
        + '<div class="mk-cat-meta">' + esc(clave) + ' \u00b7 ' + esc(precio) + extra
        + (c.categoria ? (' \u00b7 ' + esc(c.categoria)) : '') + '</div>'
        + (desc ? '<div class="mk-cat-d">' + esc(desc) + '</div>' : '')
        + tags + '</div>';
    });
    h += '</div>';
    h += '<div class="mk-nota">Ver el catalogo es solo lectura: solo puedes ofertar lo que tienes en tu inventario.</div>';
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
    inyectarCss();
    var u = usuario();
    if (!u || !u.id) { el.innerHTML = gateHtml(); return; }
    var casaU = casaDelUsuario();
    var html = '<div class="mk-head">'
      + '<div class="mk-title">\uD83D\uDED2 Mercado de Emprendedores</div>'
      + '<div class="mk-sub">Compra, vende y produce consumibles dentro de tu Casa.</div>'
      + '</div>'
      + selectorCasasHtml(casaU)
      + '<div class="mk-nota">La Casa seleccionada define tu norma (impuesto, arancel, slots y rango de precio). Debajo ves el producto a la venta de TODAS las Casas.</div>'
      + normaHtml()
      + accionesHtml();
    if (_form) html += formPublicarHtml();
    if (_prod) html += formProducirHtml();
    html += ofertasHtml(u.id);
    html += misOfertasHtml();
    html += catalogoHtml();
    el.innerHTML = html;
  }
  function cargar() {
    var el = document.getElementById('mercado-cuerpo');
    if (!el) return Promise.resolve();
    var u = usuario();
    if (!u || !u.id) { el.innerHTML = gateHtml(); return Promise.resolve(); }
    inyectarCss();
    el.innerHTML = '<div class="mk-msg">Cargando Mercado\u2026</div>';
    _casaSel = casaDelUsuario() || _casaSel || 'condor';
    _ofertasListas = false;
    return Promise.all([cargarConfig(), cargarMiData(), cargarCatalogo(), cargarInventario()])
      .then(function () { return cargarOfertasTodas(); })
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
  /* Deduce el contexto por que contenedor exista. En comunidad recarga las
   * ofertas de TODAS las Casas; en perfil solo lo propio (no hay panel de
   * ofertas ahi y no se paga el/request de mas). */
  function recargar() {
    var enComunidad = !!document.getElementById('mercado-cuerpo');
    var tareas = [cargarMiData(), cargarInventario()];
    if (enComunidad) {
      if (!_config) tareas.push(cargarConfig());
      if (!_catalogo) tareas.push(cargarCatalogo());
      tareas.push(cargarOfertasTodas());
    }
    return Promise.all(tareas)
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
    cargarOfertasTodas().then(renderComunidad);
  }
  /* Filtro de Casa del listado (T6): repinta desde _ofertasPorCasa, sin red. */
  function setFiltroCasa(v) {
    _filtroCasa = (v === 'todas' || !v) ? 'todas' : String(v).toLowerCase();
    renderComunidad();
  }
  function setFiltroCat(v) {
    _filtroCat = ['mios', 'otros'].indexOf(String(v || '')) !== -1 ? String(v) : 'todos';
    renderComunidad();
  }
  function buscarCatalogo(q) {
    _buscaCat = String(q == null ? '' : q).slice(0, 60);
    renderComunidad();
    var inp = document.querySelector('#mercado-cuerpo .mk-busca');
    if (inp && inp.focus) { inp.focus(); inp.setSelectionRange(_buscaCat.length, _buscaCat.length); }
  }
  function toggleForm(v) { _form = !!v; renderComunidad(); }
  function toggleProducir(v) { _prod = !!v; renderComunidad(); }
  function onOrigenChange() {
    var sel = document.getElementById('mk-origen');
    var item = document.getElementById('mk-item');
    if (sel && item) item.innerHTML = opcionesItems(sel.value || 'inventario');
    onItemChange();
  }

  /* POST mercado_publicar.
   *
   * REGLA INNEGOCIABLE (T6): la vista se abrio (todas las Casas + catalogo
   * completo) y la escritura NO se afloja. Antes de tocar la red se revalida
   * la PROPIEDAD contra _inv: nadie publica ni 1 unidad de algo que no tiene.
   * Esto aplica a los dos origenes, igual que en el servidor: la produccion
   * deposita en el inventario y publicarla lo descuenta.
   * La validacion REAL y autoritativa vive en el backend
   * (api/interacciones.js rama mercado_publicar -> descontarInventario():
   * UPDATE at\u00f3mico con la cantidad; si no alcanza devuelve
   * 409 INVENTARIO_INSUFICIENTE). Este chequeo del cliente es una capa
   * temprana, nunca un sustituto: no se relaj\u00f3 ninguna regla del servidor. */
  function publicar() {
    var origen = val('mk-origen') || 'inventario';
    var clave = val('mk-item');
    var cant = parseInt(val('mk-cant'), 10);
    if (!isFinite(cant) || cant < 1) cant = 1;
    var precio = Number(val('mk-precio'));
    if (!clave) { toast('Elige un item para ofertar', '#ef4444'); return; }
    if (!(precio > 0)) { toast('Escribe un precio valido', '#ef4444'); return; }
    if (!_invListo) {
      toast('No se pudo verificar tu inventario. Recarga e intenta de nuevo.', '#ef4444');
      return;
    }
    var owned = invCant(clave);
    if (owned <= 0) {
      toast('No tienes "' + ((_inv[clave] || {}).nombre || clave) + '" en tu inventario.', '#ef4444');
      return;
    }
    if (cant > owned) {
      toast('Solo tienes ' + owned + ' unidad(es) de ese item.', '#ef4444');
      return;
    }
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
    setFiltroCasa: setFiltroCasa,
    setFiltroCat: setFiltroCat,
    buscarCatalogo: buscarCatalogo,
    onOrigenChange: onOrigenChange,
    onItemChange: onItemChange,
    toggleForm: toggleForm,
    toggleProducir: toggleProducir,
    publicar: publicar,
    comprar: comprar,
    cancelar: cancelar,
    producir: producir,
    recargar: recargar,
    irAlMercado: irAlMercado,
    login: pedirLogin
  };
})();
