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
  var BUSQ_UMBRALES = {
    SIM_LARGO: 0.34,
    SIM_CORTO: 0.5,
    LARGO_DESDE: 5
  };

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
  // 6. PARSER DE LENGUAJE NATURAL (D6) -- data-driven, nunca lanza
  // ==================================================================
  function parseNL(q) {
    var tokens = (Array.isArray(q) ? q.slice() : normTokens(q));
    var out = { tokens: tokens, libres: [], categorias: [], subcategorias: [],
      precios: [], zonas: [], categoria: null, orden: 'relevancia' };
    tokens.forEach(function (t) {
      if (Object.prototype.hasOwnProperty.call(LEXICO_CATEGORIA, t)) {
        var slug = LEXICO_CATEGORIA[t];
        if (out.categorias.indexOf(slug) === -1) out.categorias.push(slug);
        if (!out.categoria) out.categoria = slug;
      } else if (Object.prototype.hasOwnProperty.call(SUBCAT_A_CAT, t)) {
        var sc = SUBCAT_A_CAT[t];
        if (out.subcategorias.indexOf(t) === -1) out.subcategorias.push(t);
        if (out.categorias.indexOf(sc) === -1) out.categorias.push(sc);
        if (!out.categoria) out.categoria = sc;
      } else if (Object.prototype.hasOwnProperty.call(LEXICO_PRECIO, t)) {
        if (out.precios.indexOf(LEXICO_PRECIO[t]) === -1) out.precios.push(LEXICO_PRECIO[t]);
      } else if (Object.prototype.hasOwnProperty.call(ALIAS_CIUDAD, t)) {
        if (out.zonas.indexOf(ALIAS_CIUDAD[t]) === -1) out.zonas.push(ALIAS_CIUDAD[t]);
      } else {
        out.libres.push(t);
      }
    });
    return out;
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

  // CASE de match_score por token. i = indice del placeholder del token;
  // tg = placeholder del array de trigramas (o null).
  function sqlMatchTokenCase(i, tg) {
    var p = '$' + i;
    var trgm = '0';
    if (tg) {
      trgm = '(' + MATCH.TRGM + ' * (CASE WHEN cardinality(' + tg + '::text[]) = 0 THEN 0 ELSE '
        + '(SELECT COUNT(*)::numeric FROM ('
        + 'SELECT unnest(COALESCE(d.search_trgm, ARRAY[]::text[])) '
        + 'INTERSECT SELECT unnest(' + tg + '::text[])) bq)::numeric '
        + '/ cardinality(' + tg + '::text[]) END))';
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

  // Condiciones + match_score del texto libre. Anade params a state.
  function sqlTexto(tokens, state) {
    var conds = [];
    var scoreParts = [];
    tokens.forEach(function (t) {
      var idx = state.pi;
      state.params.push(t);
      state.pi++;
      var p = '$' + idx;
      var ors = [
        'd.nombre_norm = ' + p,
        "d.nombre_norm LIKE " + p + " || '%'",
        "(' ' || COALESCE(d.nombre_norm,'') || ' ') LIKE '% ' || " + p + " || '%'",
        "d.search_norm LIKE '%' || " + p + " || '%'",
        "d.tags_norm LIKE '%' || " + p + " || '%'",
        'd.ciudad_norm = ' + p,
        'd.region_norm = ' + p,
        'd.barrio_norm = ' + p,
        "d.ciudad_norm LIKE " + p + " || '%'",
        "d.region_norm LIKE " + p + " || '%'",
        "d.barrio_norm LIKE " + p + " || '%'"
      ];
      var tg = null;
      var trgm = trigramas(t);
      if (trgm.length) {
        tg = '$' + state.pi;
        state.params.push(trgm);
        state.pi++;
        ors.push('d.search_trgm && ' + tg + '::text[]');
      }
      conds.push('(' + ors.join(' OR ') + ')');
      scoreParts.push(sqlMatchTokenCase(idx, tg));
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

  // Builder completo de la busqueda normal (q + geo + score + orden).
  function buildBusqueda(opts) {
    opts = opts || {};
    var state = { params: [], pi: 1 };
    var tokens = normTokens(opts.q || '');
    var orden = normalizarOrden(opts.orden);
    var result = {
      tokens: tokens, conds: [], params: state.params,
      matchSql: '0', scoreSql: '0', distSql: null, orderSql: '', geo: null,
      orden: orden, degradado: []
    };

    if (tokens.length) {
      var tx = sqlTexto(tokens, state);
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

  // Builder del modo sugerir=1 (autocompletado, top-N ligero).
  function buildSugerir(opts) {
    opts = opts || {};
    var state = { params: [], pi: 1 };
    var tokens = normTokens(opts.q || '');
    if (!tokens.length) {
      return {
        tokens: [], conds: [], params: [],
        orderSql: 'd.destacado DESC, d.rating DESC NULLS LAST, d.id ASC'
      };
    }
    var conds = [];
    var scoreParts = [];
    tokens.forEach(function (t) {
      var idx = state.pi;
      state.params.push(t);
      state.pi++;
      var p = '$' + idx;
      conds.push('(d.nombre_norm LIKE ' + p + " || '%'"
        + " OR d.search_norm LIKE '%' || " + p + " || '%'"
        + " OR d.ciudad_norm LIKE " + p + " || '%')");
      scoreParts.push('(CASE WHEN d.nombre_norm LIKE ' + p + " || '%' THEN 2"
        + ' WHEN d.ciudad_norm LIKE ' + p + " || '%' THEN 1 ELSE 0 END)");
    });
    return {
      tokens: tokens,
      conds: [conds.join(' AND ')],
      params: state.params,
      orderSql: '(' + scoreParts.join(' + ') + ') DESC, d.rating DESC NULLS LAST, d.id ASC'
    };
  }

  // Hook Wave 2: la logica social NO se implementa en Wave 1 (D10).
  function buildRecomendar() {
    return { wave: WAVE.RECOMENDAR, implemented: false, motivo: 'ADR-090 D10 (Wave 2)' };
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
    popScore: popScore,
    matchTokenScore: matchTokenScore,
    rankScore: rankScore,
    // construccion SQL
    buildBusqueda: buildBusqueda,
    buildSugerir: buildSugerir,
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
    SUBCAT_LISTA: SUBCAT_LISTA,
    buildRecomendar: buildRecomendar
  };
});
