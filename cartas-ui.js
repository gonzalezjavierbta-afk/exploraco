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
    TOPE_MUSEO: TOPE_MUSEO
  };

}(window));
