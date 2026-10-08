// busqueda.js -- ADR-090 D4: motor UNICO de busqueda de ExploraCO.
// UMD-lite: module.exports en Node (CommonJS, para api/*.js) y
// window.ExploraBusqueda como script global en el navegador (Wave 3).
// ASCII-safe estricto (ADR-002): 0 bytes > 127, 0 backticks. Todos los
// diacriticos se referencian por rango Unicode (\uXXXX), nunca como bytes.
'use strict';

(function (root, factory) {
  var api = factory();
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else if (root) {
    root.ExploraBusqueda = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis
   : (typeof self !== 'undefined' ? self : this), function () {
  'use strict';

  // ==================================================================
  // 0. CONSTANTES CANONICAS (un unico catalogo; ADR-090 D1/D7/D8)
  // ==================================================================
  var TIERRA_RADIO_M = 6371008.8; // identico a api/interacciones.js

  // Umbrales de similitud de trigramas (D1). Defaults declarados, no
  // validados por EXPLAIN ANALYZE (ver ADR-090 seccion seguimiento).
  // PRECIO_BAJO / PRECIO_ALTO son los cortes de parseNL (A3): parametros
  // configurables aqui, nunca literales dispersos. precio_desde es texto
  // descriptivo ("Desde $5.000"); el filtro los extrae best-effort.
  var BUSQ_UMBRALES = {
    SIM_LARGO: 0.34,
    SIM_CORTO: 0.5,
    LARGO_DESDE: 5,
    PRECIO_BAJO: 100000,
    PRECIO_ALTO: 500000
  };

  // Constantes v1 FIJAS de la senal social (D10 / Enmienda Wave 2 A4).
  // NO administrables en BD: mismo criterio que los pesos de ranking.
  //   MIN_COOC_USER: usuarios distintos minimos para que la co-ocurrencia
  //                  cuente como senal suficiente; por debajo se degrada.
  //   MAX_COOC:      normalizador v1 fijo de social_score (cap 1.0). Fijo a
  //                  proposito: un normalizador por maximo observado satura
  //                  con semillas populares.
  //   REF_DECAY / REF_MAX_NIVEL: decaimiento 0.5^d de la red de referidos
  //                  (1.0 el propio usuario, 0.5 nivel 1, ...) hasta 5 niveles.
  var MIN_COOC_USER = 3;
  var MAX_COOC = 10;
  var REF_DECAY = 0.5;
  var REF_MAX_NIVEL = 5;
  // Cap de candidatos de recomendar (review: el GIN && solo garantiza
  // solape>0; hay que acotar los candidatos que se traen a JS).
  var RECOMENDAR_CAP = 200;

  // Pesos globales del ranking (D8). Constantes v1 definitivas.
  var BUSQ_PESOS = { MATCH: 3.0, POP: 1.5, GEO: 2.5, SOCIAL: 1.0, DESTACADO: 0.5 };

  // Pesos de match_score por campo (D8).
  var MATCH = {
    NOMBRE_EXACTO: 1.00,
    NOMBRE_PREFIJO: 0.90,
    PALABRA_PREFIJO: 0.75,
    CONTIENE: 0.55,
    ZONA_EXACTO: 0.50,
    ZONA_PREFIJO: 0.40,
    TRGM: 0.40,
    TAGS: 0.35
  };

  var ORDENES = ['relevancia', 'distancia', 'rating'];
  var DEFAULTS = { radio_km: 50, orden: 'relevancia', limit: 500 };
  var RADIO_MIN = 1, RADIO_MAX = 500, Q_MAX = 80, LIMIT_MAX = 500;

  // Contrato canonico de query params (ADR-090 D7). wave=0 es compatibilidad.
  var PARAMS = [
    { name: 'q', wave: 1, tipo: 'texto', max: Q_MAX },
    { name: 'cerca_de', wave: 1, tipo: 'lat,lng' },
    { name: 'radio_km', wave: 1, tipo: 'numero', def: DEFAULTS.radio_km, min: RADIO_MIN, max: RADIO_MAX },
    { name: 'orden', wave: 1, tipo: 'enum', valores: ORDENES, def: DEFAULTS.orden },
    { name: 'sugerir', wave: 1, tipo: 'flag' },
    { name: 'recomendar', wave: 2, tipo: 'flag' },
    { name: 'semilla', wave: 2, tipo: 'uuid' },
    { name: 'categoria', wave: 0, tipo: 'compat' },
    { name: 'ciudad', wave: 0, tipo: 'compat' },
    { name: 'destacados', wave: 0, tipo: 'compat' },
    { name: 'limit', wave: 0, tipo: 'compat', max: LIMIT_MAX },
    { name: 'offset', wave: 0, tipo: 'compat' },
    { name: 'modo', wave: 0, tipo: 'compat' }
  ];
  var WAVE = { RECOMENDAR: 2, SEMILLA: 2 };

  // Alias de ciudad (espejo de ADR-058 api/interacciones.js ALIAS_CIUDAD).
  var ALIAS_CIUDAD = {
    'b quilla': 'barranquilla',
    'bquilla': 'barranquilla',
    'sta marta': 'santa marta',
    'bogota d c': 'bogota'
  };

  // Listas cerradas del repo (publicar-lugar.js / BLUEPRINT seccion 4).
  var SUBCAT_LISTA = {
    sitio: ['naturaleza', 'museo', 'cultura', 'bar', 'parque', 'espacio-publico',
            'sitio-historico', 'religioso', 'aventura'],
    comida: ['restaurante', 'cafe', 'gastrobar', 'comida-rapida', 'dulces'],
    evento: ['concierto', 'festival', 'teatro', 'exposicion', 'deporte', 'cine', 'fiesta']
  };
  var CATEGORIA_SLUGS = ['hostal', 'comida', 'sitio', 'evento', 'blog'];

  // CATEGORY_TAG_LISTS estatico (D6/A3): listas cerradas del repo con las
  // que el cliente UMD degrada cuando NO hay lexico inyectado por el servidor.
  // El servidor SIEMPRE inyecta el lexico data-driven (categoria_slug y
  // ciudad_norm/region_norm/barrio_norm distintos + geo_ciudades).
  var CATEGORY_TAG_LISTS = {
    hostal: SUBCAT_LISTA.hostal || [],
    comida: SUBCAT_LISTA.comida || [],
    sitio:  SUBCAT_LISTA.sitio  || [],
    evento: SUBCAT_LISTA.evento || []
  };

  // Lexico de parseNL (D6). Categorias -> slug. No lanza nunca.
  var LEXICO_CATEGORIA = {
    hostal: 'hostal', hostales: 'hostal', hostel: 'hostal', hospedaje: 'hostal',
    alojamiento: 'hostal', hotel: 'hostal', posada: 'hostal',
    comida: 'comida', comer: 'comida', restaurante: 'comida', restaurantes: 'comida',
    cafe: 'comida', cafeteria: 'comida', gastrobar: 'comida', bar: 'comida',
    sitio: 'sitio', lugar: 'sitio', museo: 'sitio', parque: 'sitio', plaza: 'sitio',
    evento: 'evento', concierto: 'evento', festival: 'evento', teatro: 'evento',
    fiesta: 'evento', deporte: 'evento', cine: 'evento', exposicion: 'evento'
  };
  var LEXICO_PRECIO = {
    barato: 'bajo', barata: 'bajo', economico: 'bajo', economica: 'bajo', bajo: 'bajo',
    caro: 'alto', cara: 'alto', lujo: 'alto', lujoso: 'alto', premium: 'alto'
  };

  // Subcategoria -> slug de categoria (inverso de SUBCAT_LISTA).
  var SUBCAT_A_CAT = (function () {
    var m = {};
    Object.keys(SUBCAT_LISTA).forEach(function (cat) {
      SUBCAT_LISTA[cat].forEach(function (sub) { m[sub] = cat; });
    });
    return m;
  })();

  // Deny-list de claves/valores ruido de tags (ADR-090 D2). UNICO origen;
  // se aplica en TIEMPO DE CONSULTA, nunca en la migracion 053.
  var TAGS_DENY_KEYS = [
    'emoji', 'icono', 'icon', 'color', 'mapa', 'lat', 'lng', 'orden', 'peso',
    'url', 'link', 'href', 'foto', 'fotos', 'imagen', 'img', 'video', 'embed'
  ];
  var RE_URL = /(https?:)?\/\/|^www\.|\//i;
  var RE_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  var RE_NUM = /^-?[0-9]+(\.[0-9]+)?$/;
  var RE_SOLO_SIGNOS = /^[^a-z0-9]+$/i;

  // ==================================================================
  // 1. NORMALIZADOR (espejo JS de public.exploraco_norm, NFD-equivalente)
  // ==================================================================
  // Identico a normGeo de api/interacciones.js: NFD + strip de diacriticos
  // [\u0300-\u036f] + lower + [^a-z0-9 ] -> espacio + colapso + trim.
  function normGeo(s) {
    var v = String(s == null ? '' : s);
    v = v.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    v = v.toLowerCase();
    v = v.replace(/[^a-z0-9 ]/g, ' ');
    v = v.replace(/ +/g, ' ').trim();
    return v;
  }

  function normGeoAlias(nc) {
    var v = String(nc == null ? '' : nc);
    return Object.prototype.hasOwnProperty.call(ALIAS_CIUDAD, v) ? ALIAS_CIUDAD[v] : v;
  }

  // Tokens normalizados de una consulta q (multi-palabra).
  function normTokens(q) {
    var n = normGeo(q);
    if (!n) return [];
    return n.split(' ').filter(function (t) { return t.length > 0; });
  }

  // ==================================================================
  // 2. TRIGRAMAS (espejo JS de public.exploraco_trgm, D1)
  // ==================================================================
  // norm + pad '  ' + s + ' ' + ventanas deslizantes de 3, unicas, ORDENADAS.
  function trigramas(s) {
    var pad = '  ' + normGeo(s) + ' ';
    var visto = {};
    var out = [];
    for (var i = 0; i + 3 <= pad.length; i++) {
      var w = pad.substr(i, 3);
      if (!Object.prototype.hasOwnProperty.call(visto, w)) {
        visto[w] = 1;
        out.push(w);
      }
    }
    out.sort();
    return out;
  }

  // Umbral de similitud segun largo del token (D1).
  function umbralSim(token) {
    var t = String(token == null ? '' : token);
    return (t.length >= BUSQ_UMBRALES.LARGO_DESDE)
      ? BUSQ_UMBRALES.SIM_LARGO : BUSQ_UMBRALES.SIM_CORTO;
  }

  // ==================================================================
  // 3. WRAPPERS SQL de las funciones canonicas (D4: explotar el esquema)
  // ==================================================================
  // NO reimplementan normalizacion: delegan en exploraco_norm/exploraco_trgm.
  function sqlNormGeo(expr) {
    return 'public.exploraco_norm(' + String(expr) + ')';
  }
  function sqlTrgmExpr(expr) {
    return 'public.exploraco_trgm(public.exploraco_norm(' + String(expr) + '))';
  }
  function sqlAliasCiudad(exprNorm) {
    var e = String(exprNorm);
    var partes = ['CASE ' + e];
    Object.keys(ALIAS_CIUDAD).forEach(function (k) {
      partes.push(" WHEN '" + k + "' THEN '" + ALIAS_CIUDAD[k] + "'");
    });
    partes.push(' ELSE ' + e + ' END');
    return '(' + partes.join('') + ')';
  }

  // ==================================================================
  // 4. DENY-LIST de tags (ADR-090 D2) -- en consulta, unico origen
  // ==================================================================
  function esClaveRuidoTags(k, v) {
    var key = String(k == null ? '' : k).toLowerCase();
    var vTrim = String(v == null ? '' : v).trim();
    if (TAGS_DENY_KEYS.indexOf(key) !== -1) return true;
    if (key === 'id' || /_id$/.test(key)) return true;
    if (vTrim === '' || RE_SOLO_SIGNOS.test(vTrim)) return true;
    if (RE_URL.test(key) || RE_URL.test(vTrim)) return true;
    if (RE_NUM.test(vTrim) || RE_UUID.test(vTrim)) return true;
    return false;
  }

  // Texto normalizado de tags aplicando la deny-list (JS, tiempo de consulta).
  // Ordena las claves para que sea determinista (espejo del ORDER BY t.k SQL).
  function tagsNormText(tags) {
    if (!tags || typeof tags !== 'object') return '';
    var vals = [];
    Object.keys(tags).sort().forEach(function (k) {
      var v = tags[k];
      if (v === null || v === undefined) return;
      if (Array.isArray(v)) { v = v.join(' '); }
      else if (typeof v === 'object') { return; }
      if (esClaveRuidoTags(k, v)) return;
      vals.push(String(v));
    });
    return normGeo(vals.join(' '));
  }

  // Espejo SQL de tagsNormText: reconstruye el blob normalizado de tags
  // filtrando la deny-list EN TIEMPO DE CONSULTA (best-effort; el camino
  // indexado usa la columna materializada tags_norm). ASCII-safe.
  function sqlTagsNormExpr(expr) {
    var e = String(expr);
    var denyList = TAGS_DENY_KEYS.map(function (k) { return "'" + k + "'"; }).join(',');
    return 'public.exploraco_norm(COALESCE(('
      + "SELECT string_agg(t.v, ' ' ORDER BY t.k) FROM jsonb_each_text(" + e + ') AS t(k, v) '
      + 'WHERE lower(t.k) <> ALL(ARRAY[' + denyList + ']::text[]) '
      + "AND lower(t.k) !~ '(_id)$' AND lower(t.k) <> 'id' "
      + "AND t.v !~* '^(https?:)?//|^www\\.|/' "
      + "AND t.v !~ '^-?[0-9]+(\\.[0-9]+)?$' "
      + "AND t.v !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' "
      + "AND btrim(t.v) <> '' AND t.v ~* '[a-z0-9]'"
      + "), ''))";
  }

  // ==================================================================
  // 5. GEO: haversine (UNICA implementacion JS/SQL, D9)
  // ==================================================================
  function tieneCoordsValidas(lat, lng) {
    return typeof lat === 'number' && typeof lng === 'number'
      && isFinite(lat) && isFinite(lng) && lat !== 0 && lng !== 0;
  }

  function haversineMetros(lat1, lng1, lat2, lng2) {
    var rad = Math.PI / 180;
    var dLat = (lat2 - lat1) * rad;
    var dLng = (lng2 - lng1) * rad;
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
      + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return TIERRA_RADIO_M * c;
  }

  function haversineKm(lat1, lng1, lat2, lng2) {
    return haversineMetros(lat1, lng1, lat2, lng2) / 1000;
  }

  // Espejo SQL de haversineMetros (devuelve km). Mismo radio. NULL-safe.
  function sqlHaversineKm(exprLat1, exprLng1, exprLat2, exprLng2) {
    var sLat = 'sin(radians((' + exprLat2 + ') - (' + exprLat1 + ')) / 2)';
    var sLng = 'sin(radians((' + exprLng2 + ') - (' + exprLng1 + ')) / 2)';
    var a = '(' + sLat + ' * ' + sLat
      + ' + cos(radians(' + exprLat1 + ')) * cos(radians(' + exprLat2 + '))'
      + ' * ' + sLng + ' * ' + sLng + ')';
    return '(' + (TIERRA_RADIO_M / 1000)
      + ' * 2 * atan2(sqrt(' + a + '), sqrt(1 - (' + a + '))))';
  }

  // Presupuesto de radio (D7): numero 1..500, default 50.
  function clampRadio(v) {
    var n = parseInt(v, 10);
    if (!isFinite(n)) return DEFAULTS.radio_km;
    if (n < RADIO_MIN) return RADIO_MIN;
    if (n > RADIO_MAX) return RADIO_MAX;
    return n;
  }

  function normalizarOrden(v) {
    return (ORDENES.indexOf(v) !== -1) ? v : DEFAULTS.orden;
  }

  // Parseo y validacion de cerca_de=lat,lng (semantica tieneCoordsValidas).
  function parseParLatLng(s) {
    if (s === null || s === undefined) return null;
    var partes = String(s).split(',');
    if (partes.length !== 2) return null;
    var lat = parseFloat(partes[0]);
    var lng = parseFloat(partes[1]);
    if (!tieneCoordsValidas(lat, lng)) return null;
    return { lat: lat, lng: lng };
  }

  // Caja (bbox) para el pre-filtro del indice (lat,lng) (D9).
  function bbox(cerca, radioKm) {
    var km = clampRadio(radioKm);
    var dLat = km / 111.32;
    var cosv = Math.cos(cerca.lat * Math.PI / 180);
    if (Math.abs(cosv) < 0.01) cosv = cosv < 0 ? -0.01 : 0.01;
    var dLng = km / (111.32 * Math.abs(cosv));
    return {
      lat_min: cerca.lat - dLat, lat_max: cerca.lat + dLat,
      lng_min: cerca.lng - dLng, lng_max: cerca.lng + dLng
    };
  }

  // ==================================================================
  // 6. PARSER DE LENGUAJE NATURAL (D6 / Enmienda Wave 2 A3)
  //    DATA-DRIVEN, contrato {filtros, libres, consumidos}, NUNCA lanza.
  //    El lexico es SERVER-ONLY (lo inyecta el servidor); el cliente UMD
  //    degrada a CATEGORY_TAG_LISTS / LEXICO_CATEGORIA estatico y a precio.
  // ==================================================================
  function mergeMap(dst, src) {
    if (!src || typeof src !== 'object') return;
    Object.keys(src).forEach(function (k) {
      var v = src[k];
      if (typeof v === 'string' && v) dst[k] = v;
    });
  }
  function mergeZonas(dst, src) {
    if (!src || typeof src !== 'object') return;
    Object.keys(src).forEach(function (k) {
      var v = src[k];
      if (v && typeof v === 'object' && v.campo && v.valor) {
        dst[k] = { campo: String(v.campo), valor: String(v.valor) };
      } else if (typeof v === 'string' && v) {
        dst[k] = { campo: 'ciudad', valor: v };
      }
    });
  }

  // Lexico por defecto (cliente / degradacion): categorias cerradas +
  // alias de ciudad + precio. Sin zonas data-driven (no hay BD en cliente).
  function normalizarLexico(lexico) {
    var base = {
      categorias: {}, subcategorias: {}, zonas: {}, precio: {},
      umbral_bajo: BUSQ_UMBRALES.PRECIO_BAJO,
      umbral_alto: BUSQ_UMBRALES.PRECIO_ALTO
    };
    Object.keys(LEXICO_CATEGORIA).forEach(function (k) { base.categorias[k] = LEXICO_CATEGORIA[k]; });
    Object.keys(SUBCAT_A_CAT).forEach(function (k) { base.subcategorias[k] = SUBCAT_A_CAT[k]; });
    Object.keys(LEXICO_PRECIO).forEach(function (k) { base.precio[k] = LEXICO_PRECIO[k]; });
    Object.keys(ALIAS_CIUDAD).forEach(function (k) {
      base.zonas[k] = { campo: 'ciudad', valor: ALIAS_CIUDAD[k] };
    });
    if (lexico && typeof lexico === 'object') {
      mergeMap(base.categorias, lexico.categorias);
      mergeMap(base.subcategorias, lexico.subcategorias);
      mergeZonas(base.zonas, lexico.zonas);
      mergeMap(base.precio, lexico.precio);
      if (typeof lexico.umbral_bajo === 'number') base.umbral_bajo = lexico.umbral_bajo;
      if (typeof lexico.umbral_alto === 'number') base.umbral_alto = lexico.umbral_alto;
    }
    return base;
  }

  function parseNL(q, lexico) {
    var out = {
      filtros: { categoria_slug: null, ciudad: null, region: null, barrio: null,
                 precio_min: null, precio_max: null },
      libres: [], consumidos: []
    };
    try {
      var nq = normGeo(Array.isArray(q) ? q.join(' ') : q);
      var tokens = nq ? nq.split(' ') : [];
      var lex = normalizarLexico(lexico);
      var usado = [];
      var i, k, n;
      // (1) zonas: frase mas larga primero (hasta 3 tokens). Aditivo.
      for (n = 3; n >= 1; n--) {
        for (i = 0; i + n <= tokens.length; i++) {
          var libre = true;
          for (k = 0; k < n; k++) { if (usado[i + k]) { libre = false; break; } }
          if (!libre) continue;
          var frase = tokens.slice(i, i + n).join(' ');
          var z = lex.zonas[frase];
          if (z) {
            if (z.campo === 'ciudad' && !out.filtros.ciudad) out.filtros.ciudad = z.valor;
            else if (z.campo === 'region' && !out.filtros.region) out.filtros.region = z.valor;
            else if (z.campo === 'barrio' && !out.filtros.barrio) out.filtros.barrio = z.valor;
            for (k = 0; k < n; k++) { usado[i + k] = true; out.consumidos.push(tokens[i + k]); }
          }
        }
      }
      // (2) categoria / subcategoria / precio / libre (orden de tokens).
      for (i = 0; i < tokens.length; i++) {
        if (usado[i]) continue;
        var t = tokens[i];
        if (lex.categorias[t]) {
          if (!out.filtros.categoria_slug) out.filtros.categoria_slug = lex.categorias[t];
          out.consumidos.push(t);
        } else if (lex.subcategorias[t]) {
          if (!out.filtros.categoria_slug) out.filtros.categoria_slug = lex.subcategorias[t];
          out.consumidos.push(t);
        } else if (lex.precio[t] === 'bajo') {
          out.filtros.precio_max = (out.filtros.precio_max == null)
            ? lex.umbral_bajo : Math.min(out.filtros.precio_max, lex.umbral_bajo);
          out.consumidos.push(t);
        } else if (lex.precio[t] === 'alto') {
          out.filtros.precio_min = (out.filtros.precio_min == null)
            ? lex.umbral_alto : Math.max(out.filtros.precio_min, lex.umbral_alto);
          out.consumidos.push(t);
        } else {
          out.libres.push(t);
        }
      }
    } catch (e) {
      out.libres = normTokens(Array.isArray(q) ? q.join(' ') : q);
    }
    return out;
  }

  // Construye el lexico data-driven desde filas {tipo, valor} (SQL_LEXICO).
  function lexicoDesdeFilas(rows) {
    var lex = { categorias: {}, zonas: {} };
    (rows || []).forEach(function (r) {
      if (!r) return;
      var tipo = String(r.tipo || '');
      if (r.valor == null) return;
      if (tipo === 'categoria') {
        var slug = String(r.valor);
        var kk = normGeo(slug);
        if (kk) lex.categorias[kk] = slug;
      } else if (tipo === 'zona' || tipo === 'ciudad' || tipo === 'region' || tipo === 'barrio') {
        var v = normGeo(r.valor);
        if (!v) return;
        var campo = (tipo === 'zona' || tipo === 'ciudad') ? 'ciudad' : tipo;
        if (!lex.zonas[v]) lex.zonas[v] = { campo: campo, valor: v };
      }
    });
    return lex;
  }

  // SQL del lexico server-only (una sola consulta; UNION).
  var SQL_LEXICO = "SELECT 'categoria' AS tipo, categoria_slug AS valor "
    + "FROM public.destinos WHERE status = 'published' AND categoria_slug IS NOT NULL "
    + "UNION SELECT 'ciudad', ciudad_norm FROM public.destinos "
    + "WHERE status = 'published' AND ciudad_norm IS NOT NULL AND ciudad_norm <> '' "
    + "UNION SELECT 'region', region_norm FROM public.destinos "
    + "WHERE status = 'published' AND region_norm IS NOT NULL AND region_norm <> '' "
    + "UNION SELECT 'barrio', barrio_norm FROM public.destinos "
    + "WHERE status = 'published' AND barrio_norm IS NOT NULL AND barrio_norm <> '' "
    + "UNION SELECT 'zona', nombre_normalizado FROM public.geo_ciudades "
    + "WHERE activo = true AND nombre_normalizado IS NOT NULL AND nombre_normalizado <> ''";

  // SQL de sinonimos (D5): expansion aditiva server-side.
  var SQL_SINONIMOS = 'SELECT termino_norm, canonico_norm FROM public.busqueda_sinonimos '
    + 'WHERE activo = true AND termino_norm = ANY($1::text[])';

  // Cache del lexico (TTL): evita 1 consulta por request en instancia caliente.
  var LEXICO_TTL_MS = 300000;
  var _lexicoCache = { expira: 0, valor: null };
  function lexicoCacheado() {
    if (_lexicoCache.valor && Date.now() < _lexicoCache.expira) return _lexicoCache.valor;
    return null;
  }
  function guardarLexico(v) { _lexicoCache = { expira: Date.now() + LEXICO_TTL_MS, valor: v }; }

  // Carga (con cache) del lexico server-only. Degrada a null (lexico estatico)
  // si falta el esquema (053/038). NUNCA lanza por ese motivo.
  function cargarLexico(sql) {
    var c = lexicoCacheado();
    if (c) return Promise.resolve(c);
    return Promise.resolve(sql(SQL_LEXICO)).then(function (rows) {
      var lex = lexicoDesdeFilas(rows); guardarLexico(lex); return lex;
    }).catch(function (e) {
      if (esFalloEsquemaLocal(e)) return null;
      throw e;
    });
  }

  function expansionesDesdeFilas(rows) {
    var map = {};
    (rows || []).forEach(function (r) {
      if (!r || !r.termino_norm || !r.canonico_norm) return;
      var t = String(r.termino_norm);
      if (!map[t]) map[t] = [];
      if (map[t].indexOf(String(r.canonico_norm)) === -1) map[t].push(String(r.canonico_norm));
    });
    return map;
  }

  // Carga de sinonimos para los tokens libres. Degrada a {} sin esquema.
  function cargarExpansiones(sql, tokens) {
    if (!tokens || !tokens.length) return Promise.resolve({});
    return Promise.resolve(sql(SQL_SINONIMOS, [tokens])).then(function (rows) {
      return expansionesDesdeFilas(rows);
    }).catch(function (e) {
      if (esFalloEsquemaLocal(e)) return {};
      throw e;
    });
  }

  // ==================================================================
  // 7. RANKING JS (D8) -- usado por el cliente y como referencia
  // ==================================================================
  function popScore(rating, reviews) {
    var r = Math.min(Math.max(Number(rating) || 0, 0), 5) / 5;
    var n = Math.max(Number(reviews) || 0, 0);
    var p = Math.log(1 + n) / Math.log(1001);
    return 0.6 * r + 0.4 * Math.min(p, 1);
  }

  function matchTokenScore(token, f) {
    var best = 0;
    var nom = f.nombre_norm || '';
    if (nom === token) {
      best = Math.max(best, MATCH.NOMBRE_EXACTO);
    } else {
      if (nom.indexOf(token) === 0) best = Math.max(best, MATCH.NOMBRE_PREFIJO);
      if ((' ' + nom + ' ').indexOf(' ' + token) !== -1) best = Math.max(best, MATCH.PALABRA_PREFIJO);
    }
    var search = f.search_norm || '';
    if (search.indexOf(token) !== -1) best = Math.max(best, MATCH.CONTIENE);
    ['ciudad_norm', 'region_norm', 'barrio_norm'].forEach(function (k) {
      var z = f[k] || '';
      if (z === token) best = Math.max(best, MATCH.ZONA_EXACTO);
      else if (z.indexOf(token) === 0) best = Math.max(best, MATCH.ZONA_PREFIJO);
    });
    var tags = f.tags_norm || '';
    if (tags.indexOf(token) !== -1) best = Math.max(best, MATCH.TAGS);
    if (f.search_trgm && f.search_trgm.length) {
      var qt = trigramas(token);
      if (qt.length) {
        var setq = {};
        qt.forEach(function (x) { setq[x] = 1; });
        var inter = 0;
        f.search_trgm.forEach(function (x) { if (setq[x]) inter++; });
        best = Math.max(best, MATCH.TRGM * (inter / qt.length));
      }
    }
    return best;
  }

  function rankScore(input, ctx) {
    input = input || {};
    ctx = ctx || {};
    var tags = input.tags;
    var f = {
      nombre_norm: input.nombre_norm != null ? input.nombre_norm : normGeo(input.nombre || input.name || ''),
      ciudad_norm: input.ciudad_norm != null ? input.ciudad_norm : normGeo(input.ciudad || input.city || ''),
      region_norm: input.region_norm != null ? input.region_norm : normGeo(input.region || ''),
      barrio_norm: input.barrio_norm != null ? input.barrio_norm : normGeo(input.barrio || ''),
      tags_norm: input.tags_norm != null ? input.tags_norm : (tags ? tagsNormText(tags) : normGeo(input.tags_norm || '')),
      search_norm: input.search_norm || '',
      search_trgm: input.search_trgm || null
    };
    if (!f.search_norm) {
      f.search_norm = normGeo([f.nombre_norm, f.ciudad_norm, f.region_norm, f.barrio_norm, f.tags_norm].join(' '));
    }
    var tokens = ctx.tokens || normTokens(input.q || ctx.q || '');
    var match = 0;
    if (tokens.length) {
      var acc = 0;
      tokens.forEach(function (t) { acc += matchTokenScore(t, f); });
      match = acc / tokens.length;
    }
    var pop = popScore(input.rating, input.total_resenas != null ? input.total_resenas : input.reviews);
    var geo = 0;
    var cerca = ctx.cerca || null;
    var radioKm = clampRadio(ctx.radio_km || DEFAULTS.radio_km);
    var lat = Number(input.lat), lng = Number(input.lng);
    if (cerca && tieneCoordsValidas(cerca.lat, cerca.lng) && tieneCoordsValidas(lat, lng)) {
      geo = Math.exp(-haversineMetros(cerca.lat, cerca.lng, lat, lng) / (radioKm * 1000));
    }
    var social = Number(input.social_score) || 0;
    var boost = input.destacado ? 1 : 0;
    return BUSQ_PESOS.MATCH * match + BUSQ_PESOS.POP * pop
      + BUSQ_PESOS.GEO * geo + BUSQ_PESOS.SOCIAL * social
      + BUSQ_PESOS.DESTACADO * boost;
  }

  // ==================================================================
  // 8. CONSTRUCCION DE SQL (fragmentos con placeholders $n y/o valores)
  // ==================================================================
  // Convencion: state = { params: [], pi: 1 }. Cada helper anade sus
  // params y usa el placeholder $pi, devolviendo fragmentos. Los numeros
  // geo (validados finitos) van como literales; el texto, como $n.
  function num(x) {
    var n = Number(x);
    if (!isFinite(n)) n = 0;
    return (Math.round(n * 1e6) / 1e6).toString();
  }

  // Fallo de esquema local (42703 columna inexistente / 42P01 tabla
  // inexistente) para degradar D11 sin depender de lib/score.js en cliente.
  function esFalloEsquemaLocal(e) {
    return !!(e && (e.code === '42P01' || e.code === '42703'));
  }

  // Similitud de trigramas de forma INLINE (recall-oriented): la correccion
  // del veredicto ADR-090 (INTERSECT no opera sobre arrays). Se evalua por
  // fila, por eso el llamador debe acotar candidatos con sqlTrgmCond.
  function sqlSimExpr(tg) {
    return '(CASE WHEN cardinality(' + tg + '::text[]) = 0 THEN 0 ELSE '
      + '(SELECT COUNT(*)::numeric FROM ('
      + 'SELECT unnest(COALESCE(d.search_trgm, ARRAY[]::text[])) '
      + 'INTERSECT SELECT unnest(' + tg + '::text[])) bq)::numeric '
      + '/ cardinality(' + tg + '::text[]) END)';
  }

  // Condicion de typo POR TOKEN: exige GIN (&&, solape>0) Y sim >= umbral.
  // Sin el umbral, el GIN && aceptaria cualquier fila con un trigrama comun
  // (review Wave 2). El umbral segun largo del token es el CAP efectivo de
  // candidatos; el LIMIT de la consulta acota el total.
  function sqlTrgmCond(tg, simMin) {
    return '(d.search_trgm && ' + tg + '::text[] AND ' + sqlSimExpr(tg)
      + ' >= ' + num(simMin) + ')';
  }

  // Condiciones de los filtros estructurados de parseNL (A3). Aditivas al
  // WHERE de texto. precio_desde es texto libre: extraction best-effort del
  // primer numero (NULL si no hay) para precio_min/precio_max.
  function sqlFiltros(filtros, state) {
    var conds = [];
    if (!filtros) return conds;
    if (filtros.categoria_slug) {
      conds.push('d.categoria_slug = $' + state.pi);
      state.params.push(String(filtros.categoria_slug)); state.pi++;
    }
    if (filtros.ciudad) {
      conds.push("d.ciudad_norm LIKE $" + state.pi + " || '%'");
      state.params.push(String(filtros.ciudad)); state.pi++;
    }
    if (filtros.region) {
      conds.push("d.region_norm LIKE $" + state.pi + " || '%'");
      state.params.push(String(filtros.region)); state.pi++;
    }
    if (filtros.barrio) {
      conds.push("d.barrio_norm LIKE $" + state.pi + " || '%'");
      state.params.push(String(filtros.barrio)); state.pi++;
    }
    if (filtros.precio_min != null || filtros.precio_max != null) {
      var pr = "NULLIF(regexp_replace(COALESCE(d.precio_desde,''), '[^0-9]', '', 'g'), '')::numeric";
      if (filtros.precio_min != null) {
        conds.push(pr + ' >= $' + state.pi);
        state.params.push(Number(filtros.precio_min)); state.pi++;
      }
      if (filtros.precio_max != null) {
        conds.push(pr + ' <= $' + state.pi);
        state.params.push(Number(filtros.precio_max)); state.pi++;
      }
    }
    return conds;
  }

  // CASE de match_score por token. i = indice del placeholder del token;
  // tg = placeholder del array de trigramas (o null). El typo (0.40*sim)
  // queda SIEMPRE por debajo de contiene (0.55): (0.40*sim) <= 0.40.
  function sqlMatchTokenCase(i, tg) {
    var p = '$' + i;
    var trgm = '0';
    if (tg) {
      trgm = '(' + MATCH.TRGM + ' * ' + sqlSimExpr(tg) + ')';
    }
    return 'CASE '
      + 'WHEN d.nombre_norm = ' + p + ' THEN ' + MATCH.NOMBRE_EXACTO
      + " WHEN d.nombre_norm LIKE " + p + " || '%' THEN " + MATCH.NOMBRE_PREFIJO
      + " WHEN (' ' || COALESCE(d.nombre_norm,'') || ' ') LIKE '% ' || " + p + " || '%' THEN " + MATCH.PALABRA_PREFIJO
      + " WHEN d.search_norm LIKE '%' || " + p + " || '%' THEN " + MATCH.CONTIENE
      + ' WHEN d.ciudad_norm = ' + p + ' OR d.region_norm = ' + p + ' OR d.barrio_norm = ' + p + ' THEN ' + MATCH.ZONA_EXACTO
      + " WHEN d.ciudad_norm LIKE " + p + " || '%' OR d.region_norm LIKE " + p + " || '%' OR d.barrio_norm LIKE " + p + " || '%' THEN " + MATCH.ZONA_PREFIJO
      + " WHEN d.tags_norm LIKE '%' || " + p + " || '%' THEN " + MATCH.TAGS
      + ' ELSE ' + trgm + ' END';
  }

  // Condiciones + match_score del texto libre. grupos = array de arrays:
  // cada grupo es un token y sus sinonimos canonicos (D5, OR interno); los
  // grupos se combinan con AND (D8). Anade params a state.
  function sqlTexto(grupos, state) {
    var conds = [];
    var scoreParts = [];
    (grupos || []).forEach(function (grupo) {
      var ors = [];
      var sp = [];
      (grupo || []).forEach(function (t) {
        var idx = state.pi;
        state.params.push(t);
        state.pi++;
        var p = '$' + idx;
        ors.push('d.nombre_norm = ' + p);
        ors.push("d.nombre_norm LIKE " + p + " || '%'");
        ors.push("(' ' || COALESCE(d.nombre_norm,'') || ' ') LIKE '% ' || " + p + " || '%'");
        ors.push("d.search_norm LIKE '%' || " + p + " || '%'");
        ors.push("d.tags_norm LIKE '%' || " + p + " || '%'");
        ors.push('d.ciudad_norm = ' + p);
        ors.push('d.region_norm = ' + p);
        ors.push('d.barrio_norm = ' + p);
        ors.push("d.ciudad_norm LIKE " + p + " || '%'");
        ors.push("d.region_norm LIKE " + p + " || '%'");
        ors.push("d.barrio_norm LIKE " + p + " || '%'");
        var tg = null;
        var trgm = trigramas(t);
        if (trgm.length) {
          tg = '$' + state.pi;
          state.params.push(trgm);
          state.pi++;
          ors.push(sqlTrgmCond(tg, umbralSim(t)));
        }
        sp.push(sqlMatchTokenCase(idx, tg));
      });
      if (!sp.length) return;
      conds.push('(' + ors.join(' OR ') + ')');
      // Un grupo con sinonimos aporta el MEJOR match de sus variantes; la
      // agregacion multi-grupo sigue siendo la media (D8: media ponderada).
      scoreParts.push(sp.length > 1 ? 'GREATEST(' + sp.join(', ') + ')' : sp[0]);
    });
    var matchSql = scoreParts.length
      ? '((' + scoreParts.join(' + ') + ') / ' + scoreParts.length + '.0)' : '0';
    return { conds: conds, matchSql: matchSql };
  }

  // ORDER BY canonico (D8).
  function sqlOrden(orden, o) {
    if (orden === 'distancia' && o && o.distSql) {
      return o.distSql + ' ASC NULLS LAST, d.rating DESC NULLS LAST, '
        + 'd.total_resenas DESC NULLS LAST, d.actualizado_en DESC NULLS LAST, d.id ASC';
    }
    if (orden === 'rating') {
      return 'd.rating DESC NULLS LAST, d.total_resenas DESC NULLS LAST, d.id ASC';
    }
    return o.scoreSql + ' DESC, d.rating DESC NULLS LAST, '
      + 'd.total_resenas DESC NULLS LAST, d.actualizado_en DESC NULLS LAST, d.id ASC';
  }

  // Agrupa tokens con sus expansion por sinonimos (D5): cada grupo es un
  // token + sus canonicos; dentro del grupo OR, entre grupos AND.
  function gruposDe(tokens, expansiones) {
    var exp = expansiones || {};
    return (tokens || []).map(function (t) {
      var g = [t];
      var alt = exp[t];
      if (Array.isArray(alt)) {
        alt.forEach(function (x) {
          var v = String(x == null ? '' : x);
          if (v && g.indexOf(v) === -1) g.push(v);
        });
      }
      return g;
    });
  }

  // Builder completo de la busqueda normal (q + geo + score + orden).
  // opts.filtros     = salida de parseNL (A3), aditiva al WHERE.
  // opts.expansiones = mapa token -> [canonico_norm] (D5).
  function buildBusqueda(opts) {
    opts = opts || {};
    var state = { params: [], pi: 1 };
    var tokens = normTokens(opts.q || '');
    var grupos = gruposDe(tokens, opts.expansiones);
    var orden = normalizarOrden(opts.orden);
    var result = {
      tokens: tokens, grupos: grupos, conds: [], params: state.params,
      matchSql: '0', scoreSql: '0', distSql: null, orderSql: '', geo: null,
      orden: orden, degradado: []
    };

    if (opts.filtros) {
      result.conds = result.conds.concat(sqlFiltros(opts.filtros, state));
    }

    if (grupos.length) {
      var tx = sqlTexto(grupos, state);
      result.conds = result.conds.concat(tx.conds);
      result.matchSql = tx.matchSql;
    }

    var cerca = parseParLatLng(opts.cerca_de);
    var radioKm = clampRadio(opts.radio_km);
    if (cerca) {
      var bb = bbox(cerca, radioKm);
      result.conds.push('d.lat BETWEEN ' + num(bb.lat_min) + ' AND ' + num(bb.lat_max)
        + ' AND d.lng BETWEEN ' + num(bb.lng_min) + ' AND ' + num(bb.lng_max)
        + ' AND d.lat IS NOT NULL AND d.lng IS NOT NULL AND d.lat <> 0 AND d.lng <> 0');
      result.distSql = '(' + sqlHaversineKm('d.lat', 'd.lng', num(cerca.lat), num(cerca.lng)) + ' * 1000)';
      result.geo = { cerca: cerca, radio_km: radioKm, distSql: result.distSql };
    } else if (orden === 'distancia') {
      // D11: orden=distancia sin cerca_de cae a relevancia.
      orden = 'relevancia';
      result.orden = orden;
      result.degradado.push('distancia-sin-cerca');
    }

    var pop = '(' + BUSQ_PESOS.POP + ' * (0.6 * (LEAST(COALESCE(d.rating,0),5)/5.0)'
      + ' + 0.4 * LEAST(ln(1 + COALESCE(d.total_resenas,0))/ln(1001.0), 1)))';
    var boost = '(' + BUSQ_PESOS.DESTACADO + ' * (CASE WHEN d.destacado THEN 1 ELSE 0 END))';
    var geoScore = result.distSql
      ? '(' + BUSQ_PESOS.GEO + ' * exp(-1 * ' + result.distSql + ' / ' + (radioKm * 1000) + '.0))'
      : '0';
    result.scoreSql = '(' + BUSQ_PESOS.MATCH + ' * ' + result.matchSql + ' + ' + pop
      + ' + ' + geoScore + ' + 0 + ' + boost + ')';
    result.orderSql = sqlOrden(orden, result);
    return result;
  }

  // Builder del modo sugerir=1 (autocompletado) con MOTOR COMPLETO:
  // normalizacion + typos por trigramas (search_trgm) + expansion por
  // sinonimos. Expone viaSql: 'normal' | 'sinonimo' | 'typo'.
  //   normal   = match directo/normalizado del token base.
  //   sinonimo = match por un canonico expandido (busqueda_sinonimos).
  //   typo     = match SOLO por similitud de trigramas.
  function buildSugerir(opts) {
    opts = opts || {};
    var state = { params: [], pi: 1 };
    var tokens = normTokens(opts.q || '');
    var exp = opts.expansiones || {};
    if (!tokens.length) {
      return {
        tokens: [], conds: [], params: [], viaSql: "'normal'",
        orderSql: 'd.destacado DESC, d.rating DESC NULLS LAST, d.id ASC'
      };
    }
    var conds = [];
    var normalOrs = [];
    var sinonOrs = [];
    var scoreParts = [];
    tokens.forEach(function (t) {
      var alts = Array.isArray(exp[t]) ? exp[t] : [];
      var groupOrs = [];
      var groupNormal = [];
      var groupSinon = [];
      var groupScore = [];
      // Token base: match directo/normalizado + typo.
      var idx = state.pi; state.params.push(t); state.pi++;
      var p = '$' + idx;
      groupNormal.push('d.nombre_norm LIKE ' + p + " || '%'");
      groupNormal.push("d.search_norm LIKE '%' || " + p + " || '%'");
      groupNormal.push('d.ciudad_norm LIKE ' + p + " || '%'");
      groupScore.push('(CASE WHEN d.nombre_norm LIKE ' + p + " || '%' THEN 2"
        + ' WHEN d.ciudad_norm LIKE ' + p + " || '%' THEN 1 ELSE 0 END)");
      var trgm = trigramas(t);
      if (trgm.length) {
        var tg = '$' + state.pi; state.params.push(trgm); state.pi++;
        groupOrs.push(sqlTrgmCond(tg, umbralSim(t)));
      }
      // Canonicos expandidos (sinonimos): match directo + typo.
      alts.forEach(function (a) {
        var ia = state.pi; state.params.push(a); state.pi++;
        var pa = '$' + ia;
        groupSinon.push('d.nombre_norm LIKE ' + pa + " || '%'");
        groupSinon.push("d.search_norm LIKE '%' || " + pa + " || '%'");
        groupSinon.push('d.ciudad_norm LIKE ' + pa + " || '%'");
        groupScore.push('(CASE WHEN d.nombre_norm LIKE ' + pa + " || '%' THEN 2"
          + ' WHEN d.ciudad_norm LIKE ' + pa + " || '%' THEN 1 ELSE 0 END)");
        var ta = trigramas(a);
        if (ta.length) {
          var tga = '$' + state.pi; state.params.push(ta); state.pi++;
          groupSinon.push(sqlTrgmCond(tga, umbralSim(a)));
        }
      });
      conds.push('(' + groupNormal.concat(groupSinon, groupOrs).join(' OR ') + ')');
      normalOrs.push('(' + groupNormal.join(' OR ') + ')');
      if (groupSinon.length) sinonOrs.push('(' + groupSinon.join(' OR ') + ')');
      scoreParts.push(groupScore.length > 1
        ? 'GREATEST(' + groupScore.join(', ') + ')' : groupScore[0]);
    });
    var viaSql = "CASE WHEN (" + normalOrs.join(' OR ') + ") THEN 'normal' "
      + (sinonOrs.length ? "WHEN (" + sinonOrs.join(' OR ') + ") THEN 'sinonimo' " : '')
      + "ELSE 'typo' END";
    return {
      tokens: tokens,
      conds: [conds.join(' AND ')],
      params: state.params,
      viaSql: viaSql,
      orderSql: '(' + scoreParts.join(' + ') + ') DESC, d.rating DESC NULLS LAST, d.id ASC'
    };
  }

  // ==================================================================
  // 8-bis. IDENTIDAD (reusa el mecanismo EXISTENTE de api/interacciones.js)
  // ==================================================================
  // HMAC-SHA256 sobre payload base64url con SESSION_JWT_SECRET, header
  // Authorization: Bearer <b64.sig>. NO inventa token nuevo. Server-only:
  // en navegador require no existe; solo lo invocan api/destinos.js y
  // api/utilidades.js. La derivacion del usuario es la MISMA (payload.sub).
  function parseSesion(req) {
    try {
      if (typeof require !== 'function') return { ok: false, razon: 'SIN_NODE' };
      var crypto = require('crypto');
      if (!req || !req.headers) return { ok: false, razon: 'SIN_REQ' };
      var encabezado = req.headers['authorization'] || '';
      if (encabezado.indexOf('Bearer ') !== 0) return { ok: false, razon: 'SESION_REQUERIDA' };
      var token = encabezado.slice(7).trim();
      var punto = token.indexOf('.');
      if (punto <= 0 || punto === token.length - 1) return { ok: false, razon: 'SESION_INVALIDA' };
      var payloadB64 = token.slice(0, punto);
      var firma = token.slice(punto + 1);
      var secreto = (typeof process !== 'undefined' && process.env && process.env.SESSION_JWT_SECRET) || 'dev_secret';
      var firmaEsperada = crypto.createHmac('sha256', secreto).update(payloadB64).digest('base64url');
      var fa = Buffer.from(firma, 'utf8');
      var fb = Buffer.from(firmaEsperada, 'utf8');
      if (fa.length !== fb.length) return { ok: false, razon: 'SESION_INVALIDA' };
      if (!crypto.timingSafeEqual(fa, fb)) return { ok: false, razon: 'SESION_INVALIDA' };
      var payload = null;
      try { payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8')); }
      catch (e) { return { ok: false, razon: 'SESION_INVALIDA' }; }
      if (!payload || !payload.exp || !payload.sub) return { ok: false, razon: 'SESION_INVALIDA' };
      if (payload.exp <= Math.floor(Date.now() / 1000)) return { ok: false, razon: 'SESION_EXPIRADA' };
      return { ok: true, usuario_id: String(payload.sub) };
    } catch (e) {
      return { ok: false, razon: 'SESION_INVALIDA' };
    }
  }

  // v1 = UN SOLO uuid (A4). Multisemilla queda FUERA: no se reserva
  // ctx.semillas[]. Devuelve el uuid normalizado o null.
  function parseSemilla(s) {
    if (s == null) return null;
    var v = String(s).trim().toLowerCase();
    return RE_UUID.test(v) ? v : null;
  }

  // ==================================================================
  // 8-ter. SOCIAL (D10 / Enmienda Wave 2 A4/A5): co-ocurrencia
  // ==================================================================
  // SQL de co-ocurrencia. rows: { destino_id, n_usuarios, peso_suma }.
  // Personalizado: red de referidos (CTE recursiva, 0.5^d hasta $2).
  // Global: conteo de usuarios distintos. Ambos JOIN a destinos (status).
  function sqlCoocurrencia(opts) {
    opts = opts || {};
    var semilla = opts.semilla;
    var cap = opts.cap || RECOMENDAR_CAP;
    var joins = 'FROM public.interacciones i1 '
      + 'JOIN public.interacciones i2 ON i2.usuario_id = i1.usuario_id '
      + 'AND i2.destino_id <> i1.destino_id '
      + 'JOIN public.destinos d ON d.id = i2.destino_id ';
    var wheres = 'WHERE i1.destino_id = $SEM AND i1.activo = true AND i2.activo = true '
      + "AND i1.tipo IN ('visita','guardado','rating','resena') "
      + "AND d.status = 'published' AND d.categoria_slug <> 'blog' ";
    if (opts.personalizado && opts.usuario_id) {
      var p1 = [opts.usuario_id, REF_MAX_NIVEL, REF_DECAY, semilla, cap];
      var cat1 = '';
      if (opts.categoria) { p1.push(String(opts.categoria)); cat1 = ' AND d.categoria_slug = $' + p1.length + ' '; }
      var sq = 'WITH RECURSIVE red AS ('
        + 'SELECT $1::uuid AS usuario_id, 0 AS nivel '
        + 'UNION ALL '
        + 'SELECT u.id, r.nivel + 1 FROM public.usuarios u '
        + 'JOIN red r ON u.referido_por = r.usuario_id WHERE r.nivel < $2'
        + ') '
        + 'SELECT i2.destino_id, '
        + 'COUNT(DISTINCT i2.usuario_id) AS n_usuarios, '
        + 'COALESCE(SUM(power($3::numeric, r.nivel)), 0) AS peso_suma '
        + joins
        + 'JOIN red r ON r.usuario_id = i1.usuario_id '
        + wheres.replace('$SEM', '$4') + cat1
        + 'GROUP BY i2.destino_id '
        + 'ORDER BY peso_suma DESC, i2.destino_id ASC '
        + 'LIMIT $5';
      return { sql: sq, params: p1 };
    }
    var p2 = [semilla, cap];
    var cat2 = '';
    if (opts.categoria) { p2.push(String(opts.categoria)); cat2 = ' AND d.categoria_slug = $' + p2.length + ' '; }
    var sg = 'SELECT i2.destino_id, '
      + 'COUNT(DISTINCT i2.usuario_id) AS n_usuarios, '
      + 'COUNT(DISTINCT i2.usuario_id)::numeric AS peso_suma '
      + joins
      + wheres.replace('$SEM', '$1') + cat2
      + 'GROUP BY i2.destino_id '
      + 'ORDER BY n_usuarios DESC, i2.destino_id ASC '
      + 'LIMIT $2';
    return { sql: sg, params: p2 };
  }

  // Contrato: buildRecomendar(rows, ctx) -> [{ destino_id, social_score }].
  // ctx = { semilla, personalizado, max_cooc, ref_decay, ref_max_nivel }.
  // Filtra por MIN_COOC_USER; normaliza con max_cooc (cap 1.0); excluye la
  // semilla; orden DETERMINISTA (score DESC, id ASC).
  function buildRecomendar(rows, ctx) {
    rows = Array.isArray(rows) ? rows : [];
    ctx = ctx || {};
    var maxCooc = (typeof ctx.max_cooc === 'number' && ctx.max_cooc > 0) ? ctx.max_cooc : MAX_COOC;
    var semilla = ctx.semilla != null ? String(ctx.semilla) : null;
    var out = [];
    rows.forEach(function (r) {
      if (!r) return;
      var id = r.destino_id != null ? String(r.destino_id) : (r.id != null ? String(r.id) : null);
      if (!id) return;
      if (semilla && id === semilla) return;
      var n = Number(r.n_usuarios != null ? r.n_usuarios : r.usuarios);
      if (!isFinite(n) || n < MIN_COOC_USER) return;
      var peso = Number(r.peso_suma != null ? r.peso_suma : n);
      if (!isFinite(peso)) peso = n;
      var score = peso / maxCooc;
      if (score > 1) score = 1;
      if (score < 0) score = 0;
      out.push({ destino_id: id, social_score: score });
    });
    out.sort(function (a, b) {
      if (b.social_score !== a.social_score) return b.social_score - a.social_score;
      if (a.destino_id < b.destino_id) return -1;
      if (a.destino_id > b.destino_id) return 1;
      return 0;
    });
    return out;
  }

  // Cascada DETERMINISTA de degradacion (A4): 1 personalizado -> 2 global por
  // semilla -> 3 global pura (candidatos vacios). Nunca deja sin respuesta.
  function recomendarCascada(sql, opts) {
    opts = opts || {};
    var semilla = opts.semilla || null;
    var categoria = opts.categoria ? String(opts.categoria) : null;
    if (!semilla) return Promise.resolve({ nivel: 3, candidatos: [] });
    var ctx = { semilla: semilla, max_cooc: MAX_COOC, ref_decay: REF_DECAY, ref_max_nivel: REF_MAX_NIVEL };
    function nivel2() {
      var q2 = sqlCoocurrencia({ semilla: semilla, categoria: categoria });
      return Promise.resolve(sql(q2.sql, q2.params)).then(function (rows) {
        return { nivel: 2, candidatos: buildRecomendar(rows, ctx) };
      }).catch(function (e) {
        if (esFalloEsquemaLocal(e)) return { nivel: 3, candidatos: [] };
        throw e;
      });
    }
    if (opts.usuario_id) {
      var q1 = sqlCoocurrencia({ semilla: semilla, personalizado: true,
        usuario_id: opts.usuario_id, categoria: categoria });
      return Promise.resolve(sql(q1.sql, q1.params)).then(function (rows) {
        var cand = buildRecomendar(rows, ctx);
        if (cand.length) return { nivel: 1, candidatos: cand };
        return nivel2();
      }).catch(function (e) {
        if (esFalloEsquemaLocal(e)) return nivel2();
        throw e;
      });
    }
    return nivel2();
  }

  // ==================================================================
  // 9. EXPORTS (D4)
  // ==================================================================
  return {
    // normalizacion
    normGeo: normGeo,
    normGeoAlias: normGeoAlias,
    normTokens: normTokens,
    ALIAS_CIUDAD: ALIAS_CIUDAD,
    // trigramas
    trigramas: trigramas,
    umbralSim: umbralSim,
    // wrappers SQL
    sqlNormGeo: sqlNormGeo,
    sqlTrgmExpr: sqlTrgmExpr,
    sqlAliasCiudad: sqlAliasCiudad,
    // deny-list de tags (tiempo de consulta)
    TAGS_DENY_KEYS: TAGS_DENY_KEYS,
    esClaveRuidoTags: esClaveRuidoTags,
    tagsNormText: tagsNormText,
    sqlTagsNormExpr: sqlTagsNormExpr,
    // geo (unica implementacion)
    TIERRA_RADIO_M: TIERRA_RADIO_M,
    tieneCoordsValidas: tieneCoordsValidas,
    haversineMetros: haversineMetros,
    haversineKm: haversineKm,
    sqlHaversineKm: sqlHaversineKm,
    parseParLatLng: parseParLatLng,
    bbox: bbox,
    clampRadio: clampRadio,
    normalizarOrden: normalizarOrden,
    // NL + ranking
    parseNL: parseNL,
    normalizarLexico: normalizarLexico,
    lexicoDesdeFilas: lexicoDesdeFilas,
    cargarLexico: cargarLexico,
    cargarExpansiones: cargarExpansiones,
    expansionesDesdeFilas: expansionesDesdeFilas,
    SQL_LEXICO: SQL_LEXICO,
    SQL_SINONIMOS: SQL_SINONIMOS,
    popScore: popScore,
    matchTokenScore: matchTokenScore,
    rankScore: rankScore,
    // identidad (mecanismo existente de api/interacciones.js)
    parseSesion: parseSesion,
    parseSemilla: parseSemilla,
    // construccion SQL
    buildBusqueda: buildBusqueda,
    buildSugerir: buildSugerir,
    gruposDe: gruposDe,
    sqlFiltros: sqlFiltros,
    sqlOrden: sqlOrden,
    // contrato
    PARAMS: PARAMS,
    DEFAULTS: DEFAULTS,
    ORDENES: ORDENES,
    BUSQ_PESOS: BUSQ_PESOS,
    BUSQ_UMBRALES: BUSQ_UMBRALES,
    MATCH: MATCH,
    WAVE: WAVE,
    CATEGORIA_SLUGS: CATEGORIA_SLUGS,
    CATEGORY_TAG_LISTS: CATEGORY_TAG_LISTS,
    SUBCAT_LISTA: SUBCAT_LISTA,
    // social (D10 / Wave 2)
    MIN_COOC_USER: MIN_COOC_USER,
    MAX_COOC: MAX_COOC,
    REF_DECAY: REF_DECAY,
    REF_MAX_NIVEL: REF_MAX_NIVEL,
    RECOMENDAR_CAP: RECOMENDAR_CAP,
    sqlCoocurrencia: sqlCoocurrencia,
    buildRecomendar: buildRecomendar,
    recomendarCascada: recomendarCascada,
    esFalloEsquemaLocal: esFalloEsquemaLocal
  };
});
