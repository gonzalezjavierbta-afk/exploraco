// lib/completitud.js -- MODELO UNICO DE COMPLETITUD DE FICHA (ADR-099 D3 + D4)
//
// POR QUE VIVE EN lib/ Y NO EN api/: los 8 ficheros de api/ son 8/8
// funciones serverless (presupuesto Vercel Hobby AGOTADO). Este modulo no es
// endpoint: es la libreria que api/publicar-lugar.js y api/interacciones.js
// requirean, y que publicar.html y admin.html cargan con
// <script src="/lib/completitud.js">. Vercel lo incluye en el bundle por
// trazado de dependencias (nft), sin consumir funcion.
//
// DOBLE SUPERFICIE (D4). Es el PRIMER archivo de lib/ con dos salidas:
// lib/score.js es precedente de modulo COMPARTIDO, no de doble superficie
// (expone solo module.exports y ningun HTML lo carga). Aqui:
//   - Node/CommonJS: require('../lib/completitud.js') -> module.exports
//   - Navegador:     window.ECCompletitud (via globalThis)
// El smoke scripts/smoke_completitud.js prueba que las dos ramas devuelven lo
// MISMO en los 13 fixtures dorados. El servidor es siempre la autoridad: el
// cliente solo previsualiza (D4).
//
// UNA SOLA ARITMETICA. Si esta formula se copia dentro de un api/*.js o de un
// HTML, el tier del servidor y el del formulario dejan de ser comparables y
// el XP se paga de menos en silencio. Es el fallo que ADR-099 D4 prohibe.
//
// FUNCION PURA Y DETERMINISTA: sin Date, sin red, sin base de datos, sin DOM
// al cargar. La galeria NO se consulta aqui: D3.1 la cuenta el servidor en el
// SELECT (galeria_n / hero_en_galeria) y llega como fotos_total y
// fotos_no_hero ya contados. contarFotos() existe solo para que el formulario
// y el admin previsualicen con la misma formula sobre sus propias fotos.
//
// MONOTONIA (D3.5): rellenar un campo NUNCA baja puntos ni tier. Cada bloque
// es una funcion no decreciente de su entrada (los rangos de fotos crecen, el
// video suma, los extras topan) y los bloques son independientes.
// UNICA EXCEPCION DECLARADA: promover una foto de galeria a hero (es_hero mas
// sincronizacion de foto_hero, admin-destinos.js:102,127,133,159) reduce
// fotos_no_hero en 1 y puede BAJAR el tier. Fixture F13: 3 en galeria con 1
// hero -> 90 puntos y aun asi 'intermedio'. Se acepta porque el hero deja de
// ser galeria y porque la regla del operador es literal ("excluyendo la que
// coincide con foto_hero"); se mitiga mostrando los dos conteos en el editor
// del admin antes de guardar y porque D5 no reescribe filas ya 'otorgado'.
// La excepcion SOLO se alcanza llamando a normalizarFila() con un es_hero /
// foto_hero NUEVO: calcular() con los conteos ya dados no puede bajar nada.
//
// ASCII-safe estricto (ADR-002): 0 bytes > 127, 0 backticks. CommonJS en la
// rama Node, UMD sin build y sin dependencias, cero ES modules.
(function (raiz, fabrica) {
  'use strict';
  var api = fabrica();
  if (typeof module !== 'undefined' && module && module.exports) module.exports = api;
  if (raiz) raiz.ECCompletitud = api;
})(typeof globalThis !== 'undefined' ? globalThis
  : (typeof window !== 'undefined' ? window
    : (typeof self !== 'undefined' ? self : null)), function () {
  'use strict';

  // Version corta de la aritmetica. Se persiste y se compara: si los pesos
  // cambian, cambia la version y las filas viejas son identificables.
  var VERSION = '1';

  // D3.2 -- Umbrales y guardas duras. 'completo' exige LAS TRES cosas.
  var UMBRAL_INTERMEDIO = 40;
  var UMBRAL_COMPLETO = 75;
  var GUARDA_FOTOS_NO_HERO = 3;

  // D3 -- Pesos declarados. Una tabla, no numeros magicos dispersos.
  var BLOQUES_MAX = {
    identidad: 15,
    relato: 15,
    ubicacion: 10,
    contacto: 10,
    medios: 30,
    extras: 20
  };
  var PESOS = {
    nombre: 3,
    categoria: 3,
    subcategoria: 2,
    ciudad: 3,
    departamento: 2,
    zona: 2,
    descripcion_corta: 7,
    descripcion_larga: 8,
    coords: 10,
    contacto: 10,
    foto_1: 10,
    foto_2_a_4: 20,
    foto_5_o_mas: 25,
    video: 5,
    extra_por_campo: 2
  };

  // D3.0 -- Tabla campo -> puntos del bloque Identidad. El orden de este
  // vector es el orden ESTABLE de 'faltantes' (contrato del smoke).
  var ORDEN = [
    'nombre', 'categoria', 'subcategoria', 'ciudad', 'departamento', 'zona',
    'descripcion_corta', 'descripcion_larga',
    'coords', 'contacto',
    'foto', 'fotos_3', 'video',
    'precio', 'horario', 'faqs', 'amenidades', 'habitaciones', 'como_llegar',
    'temporada', 'dificultad', 'duracion', 'precio_entrada'
  ];
  // 'fotos_3' es la guarda de D3.2, no un campo puntuable: aparece en
  // 'faltantes' y NO en 'campos'. La equivalencia de D3.0 se asserta sobre
  // PUNTUABLES, que es exactamente ORDEN sin la guarda.
  var PUNTUABLES = ORDEN.filter(function (k) { return k !== 'fotos_3'; });

  // Lista CERRADA de 5 zonas naturales. Es la misma que acepta la constraint
  // CHECK destinos_zona_chk. D3.0 exige que la zona venga YA resuelta por
  // resolverZona() (api/publicar-lugar.js:327): aqui solo se comprueba que
  // el valor pertenezca a la lista. El modulo NO re-deriva la zona desde el
  // departamento a proposito: el mapa DEPTO_ZONA vive en un solo sitio
  // (scripts/generar-geo-ciudades.js) y api/publicar-lugar.js ya tiene su
  // copia acotada; una tercera copia seria una tercera verdad.
  var ZONAS = ['andina', 'amazonica', 'caribe', 'pacifico', 'llanos'];

  // COPIA SINCRONIZADA A MANO de CAT_MAP (api/publicar-lugar.js:14) y de
  // SUBCAT_LISTA (api/publicar-lugar.js:29). D3.0 pide literalmente "resuelta
  // a un categoria_slug valido (CAT_MAP o blog)" y "subcategoria en la lista
  // cerrada de la categoria (ADR-016)", asi que el modulo necesita las dos
  // tablas para puntuar sin llamar al backend. Si divergen, el smoke de
  // fixtures lo delata (F10 = 78 depende de que 'blog' NO tenga lista).
  var CAT_MAP = {
    hostal: 'hostal', hotel: 'hostal', finca: 'hostal',
    glamping: 'hostal', 'aparta-hotel': 'hostal', posada: 'hostal',
    restaurante: 'comida', cafe: 'comida', cafeteria: 'comida', bar: 'comida',
    sitio: 'sitio', parque: 'sitio', museo: 'sitio', natural: 'sitio', lugar: 'sitio',
    evento: 'evento', festival: 'evento', concierto: 'evento'
  };
  var BLOG_TEMAS = ['aventura', 'gastro', 'cultura', 'naturaleza', 'tips'];
  var CAT_SLUGS = ['hostal', 'comida', 'sitio', 'evento', 'blog'];
  var SUBCAT_LISTA = {
    sitio: ['naturaleza', 'museo', 'cultura', 'bar', 'parque', 'espacio-publico',
      'sitio-historico', 'religioso', 'aventura'],
    comida: ['restaurante', 'cafe', 'gastrobar', 'comida-rapida', 'dulces'],
    evento: ['concierto', 'festival', 'teatro', 'exposicion', 'deporte', 'cine', 'fiesta']
  };

  // COPIA SINCRONIZADA A MANO de VIDEO_HOSTS (api/publicar-lugar.js:211).
  // Match EXACTO de host, nunca por sufijo (un endsWith dejaria pasar
  // 'evilspotify.com' y 'spotify.com.attacker.net'). Se evalua con regex y
  // operaciones de cadena, no con new URL(): asi la funcion es identica en
  // Node y en cualquier navegador y no depende de globals del runtime.
  var VIDEO_HOSTS = [
    'youtube.com', 'www.youtube.com', 'youtu.be', 'vimeo.com', 'www.vimeo.com',
    'open.spotify.com', 'play.spotify.com'
  ];

  // Bloque "Extras de categoria": 10 campos x 2 puntos, tope 20 (D3). El tope
  // y 10*2 coinciden exactamente, luego ningun campo puntuado se queda fuera
  // del computo y la regla puntos <=> faltantes se cumple sin excepciones.
  var EXTRAS = [
    { clave: 'precio', fuentes: ['precio', 'precio_desde'] },
    { clave: 'horario', fuentes: ['horario', 'horario_visita', 'sitio_horario'] },
    { clave: 'faqs', fuentes: ['faqs'] },
    { clave: 'amenidades', fuentes: ['amenidades'] },
    { clave: 'habitaciones', fuentes: ['habitaciones'] },
    { clave: 'como_llegar', fuentes: ['como_llegar', 'sitio_como_llegar'] },
    { clave: 'temporada', fuentes: ['temporada'] },
    { clave: 'dificultad', fuentes: ['dificultad'] },
    { clave: 'duracion', fuentes: ['duracion'] },
    { clave: 'precio_entrada', fuentes: ['precio_entrada', 'sitio_precio_entrada'] }
  ];

  // Claves de persistencia de D3.6. Se exportan para que backend y admin
  // asserten contra la misma lista y nadie invente un nombre nuevo.
  var CLAVES_PERSISTIDAS = [
    'pub_completitud', 'pub_faltantes', 'pub_tier',
    'pub_fotos_total', 'pub_fotos_no_hero'
  ];

  // -------------------------------------------------------------------------
  // Helpers de lectura. Todo devuelve un valor normalizado o null/''.
  // -------------------------------------------------------------------------
  function txt(v) {
    if (v === null || v === undefined) return '';
    if (typeof v === 'string') return v.trim();
    if (typeof v === 'number' && isFinite(v)) return String(v);
    return '';
  }

  function numero(v) {
    if (v === null || v === undefined) return null;
    if (typeof v === 'string' && v.trim() === '') return null;
    var n = Number(v);
    return isFinite(n) ? n : null;
  }

  function entero(v) {
    var n = numero(v);
    return n === null ? 0 : Math.round(n);
  }

  function tieneValor(v) {
    if (v === null || v === undefined) return false;
    if (typeof v === 'string') return v.trim().length > 0;
    if (typeof v === 'number') return isFinite(v);
    if (typeof v === 'boolean') return v === true;
    if (Object.prototype.toString.call(v) === '[object Array]') return v.length > 0;
    if (typeof v === 'object') {
      var k;
      for (k in v) { if (Object.prototype.hasOwnProperty.call(v, k)) return true; }
      return false;
    }
    return false;
  }

  // JSONB de Neon: puede llegar como objeto o como cadena JSON.
  function leerTags(v) {
    if (!v) return {};
    if (typeof v === 'string') {
      try {
        var p = JSON.parse(v);
        return (p && typeof p === 'object') ? p : {};
      } catch (e) { return {}; }
    }
    return (typeof v === 'object') ? v : {};
  }

  // Busca la primera clave con valor en extras -> tags -> raiz. Asi la MISMA
  // funcion consume la fila normalizada, el payload del formulario y el body
  // con tags anidado, sin tres ramas de codigo.
  function primer(o, nombres) {
    var fuentes = [o.extras, o.tags, o];
    var i, j, f, v;
    for (i = 0; i < fuentes.length; i++) {
      f = fuentes[i];
      if (!f || typeof f !== 'object') continue;
      for (j = 0; j < nombres.length; j++) {
        v = f[nombres[j]];
        if (tieneValor(v)) return v;
      }
    }
    return null;
  }

  // -------------------------------------------------------------------------
  // D3.1 -- FORMULA UNICA DE CONTEO DE FOTOS.
  // galeria_n        = COUNT(DISTINCT url) de destinos_fotos
  // hero_en_galeria  = COUNT(*) con url = destinos.foto_hero
  // fotos_total      = galeria_n + (1 si foto_hero y hero_en_galeria = 0)
  // fotos_no_hero    = galeria_n - (1 si hero_en_galeria > 0)
  // El 1 + COUNT(*) duplicaba el hero cuando el admin lo promovio y no lo
  // contaba cuando la fila vino de publicar.html.
  // -------------------------------------------------------------------------
  function contarFotos(fotos, fotoHero) {
    var lista = (Object.prototype.toString.call(fotos) === '[object Array]') ? fotos : [];
    var vistos = {};
    var galeriaN = 0;
    var hero = txt(fotoHero);
    var i, f, u;
    for (i = 0; i < lista.length; i++) {
      f = lista[i];
      u = txt((f && typeof f === 'object') ? f.url : f);
      if (!u) continue;
      if (!vistos[u]) { vistos[u] = 1; galeriaN++; }
    }
    // Sincronizacion que ya hace admin-destinos.js:159: si la columna
    // foto_hero esta vacia pero hay una foto marcada es_hero, ese es el hero.
    if (!hero) {
      for (i = 0; i < lista.length; i++) {
        f = lista[i];
        if (f && typeof f === 'object' && f.es_hero === true) {
          u = txt(f.url);
          if (u) { hero = u; break; }
        }
      }
    }
    var heroEnGaleria = (hero && vistos[hero]) ? 1 : 0;
    return {
      total: galeriaN + ((hero && !heroEnGaleria) ? 1 : 0),
      no_hero: Math.max(0, galeriaN - heroEnGaleria),
      galeria_n: galeriaN,
      hero_en_galeria: heroEnGaleria,
      hero: hero
    };
  }

  function esVideoUrlSegura(u) {
    var s = txt(u);
    if (!s) return false;
    var m = /^https?:\/\/([^\/?#]+)/i.exec(s);
    if (!m) return false;
    var host = m[1].toLowerCase();
    // userinfo: 'https://youtube.com@evil.com/x' -> el host real es evil.com.
    var at = host.lastIndexOf('@');
    if (at !== -1) host = host.slice(at + 1);
    var colon = host.indexOf(':');
    if (colon !== -1) host = host.slice(0, colon);
    return VIDEO_HOSTS.indexOf(host) !== -1;
  }

  function resolverCategoria(cat) {
    var s = txt(cat).toLowerCase();
    if (!s) return '';
    if (CAT_SLUGS.indexOf(s) !== -1) return s;
    // El orden importa: publicar-lugar.js:294 evalua BLOG_TEMAS ANTES de
    // CAT_MAP, y 'naturaleza'/'cultura'/'aventura' son temas de blog y a la
    // vez subcategorias de 'sitio'. Manda el mismo criterio que el backend.
    if (BLOG_TEMAS.indexOf(s) !== -1) return 'blog';
    if (CAT_MAP[s]) return CAT_MAP[s];
    return '';
  }

  function subcategoriaValida(catSlug, sub) {
    if (!catSlug) return false;
    var lista = SUBCAT_LISTA[catSlug];
    // 'blog' y 'hostal' NO tienen lista cerrada en ADR-016, luego no puntuan
    // subcategoria. Es la razon aritmetica de F10 = 78 (y no 80).
    if (!lista) return false;
    return lista.indexOf(txt(sub).toLowerCase()) !== -1;
  }

  function zonaValida(z) {
    return ZONAS.indexOf(txt(z).toLowerCase()) !== -1;
  }

  function coordsValidas(lat, lng) {
    var a = numero(lat), b = numero(lng);
    if (a === null || b === null) return false;
    if (a < -90 || a > 90) return false;
    if (b < -180 || b > 180) return false;
    if (a === 0 && b === 0) return false; // Null Island no es una coordenada
    return true;
  }

  function puntosFotos(total) {
    var n = entero(total);
    if (n >= 5) return PESOS.foto_5_o_mas;
    if (n >= 2) return PESOS.foto_2_a_4;
    if (n >= 1) return PESOS.foto_1;
    return 0;
  }

  // -------------------------------------------------------------------------
  // Normalizacion de entrada. Acepta la fila de destinos, el body del
  // formulario o el objeto que devuelve normalizarFila(). No muta el original.
  // -------------------------------------------------------------------------
  function normalizarEntrada(obj) {
    var src = (obj && typeof obj === 'object') ? obj : {};
    var o = {};
    var k;
    for (k in src) { if (Object.prototype.hasOwnProperty.call(src, k)) o[k] = src[k]; }
    o.tags = leerTags(src.tags);

    var total = numero(o.fotos_total);
    var noHero = numero(o.fotos_no_hero);
    if (total === null && Object.prototype.toString.call(o.fotos) === '[object Array]') {
      var c = contarFotos(o.fotos, o.foto_hero);
      total = c.total;
      noHero = c.no_hero;
    }
    if (total === null) total = 0;
    total = Math.max(0, Math.round(total));
    if (noHero === null) {
      // Default CONSERVADOR, no permisivo: si solo llega fotos_total y hay
      // foto_hero, la galeria es total-1 (D3.1, hero fuera de la galeria).
      // Nunca se regala la guarda de 3 fotos por un dato ausente.
      noHero = Math.max(0, total - (txt(o.foto_hero) ? 1 : 0));
    }
    noHero = Math.max(0, Math.round(noHero));

    var e = {
      nombre: txt(primer(o, ['nombre'])),
      categoria: txt(primer(o, ['categoria_slug', 'categoria'])),
      subcategoria: txt(primer(o, ['subcategoria'])),
      ciudad: txt(primer(o, ['ciudad'])),
      departamento: txt(primer(o, ['departamento', 'region'])),
      zona: txt(primer(o, ['zona'])),
      descripcion_corta: txt(primer(o, ['descripcion_corta', 'lead'])),
      descripcion_larga: txt(primer(o, ['descripcion_larga', 'descripcion'])),
      lat: numero(primer(o, ['lat', 'latitud'])),
      lng: numero(primer(o, ['lng', 'longitud'])),
      whatsapp: txt(primer(o, ['whatsapp'])),
      email: txt(primer(o, ['email', 'correo'])),
      web: txt(primer(o, ['web', 'sitio_web'])),
      instagram: txt(primer(o, ['instagram'])),
      video_url: txt(primer(o, ['video_url'])),
      fotos_total: total,
      fotos_no_hero: noHero,
      extras: {}
    };
    var i;
    for (i = 0; i < EXTRAS.length; i++) {
      e.extras[EXTRAS[i].clave] = primer(o, EXTRAS[i].fuentes);
    }
    return e;
  }

  // -------------------------------------------------------------------------
  // D3 + D3.0 + D3.2 -- evaluacion pura.
  // -------------------------------------------------------------------------
  function evaluarCompletitud(obj) {
    var e = normalizarEntrada(obj);
    var campos = {};
    var bloques = {};
    var faltantes = [];
    var catSlug = resolverCategoria(e.categoria);
    var extrasPuntos = 0;
    var i, x;

    // D3.0 -- Identidad, credito parcial campo por campo.
    campos.nombre = e.nombre ? PESOS.nombre : 0;
    campos.categoria = catSlug ? PESOS.categoria : 0;
    campos.subcategoria = subcategoriaValida(catSlug, e.subcategoria) ? PESOS.subcategoria : 0;
    campos.ciudad = e.ciudad ? PESOS.ciudad : 0;
    campos.departamento = e.departamento ? PESOS.departamento : 0;
    campos.zona = zonaValida(e.zona) ? PESOS.zona : 0;

    // Relato.
    campos.descripcion_corta = (e.descripcion_corta.length >= 30) ? PESOS.descripcion_corta : 0;
    campos.descripcion_larga = (e.descripcion_larga.length >= 200) ? PESOS.descripcion_larga : 0;

    // Ubicacion y contacto.
    campos.coords = coordsValidas(e.lat, e.lng) ? PESOS.coords : 0;
    campos.contacto = (e.whatsapp || e.email || e.web || e.instagram) ? PESOS.contacto : 0;

    // Medios: fotos por rango + video.
    campos.foto = puntosFotos(e.fotos_total);
    campos.video = esVideoUrlSegura(e.video_url) ? PESOS.video : 0;

    // Extras de categoria.
    for (i = 0; i < EXTRAS.length; i++) {
      x = EXTRAS[i];
      if (tieneValor(e.extras[x.clave])) {
        campos[x.clave] = PESOS.extra_por_campo;
        extrasPuntos += PESOS.extra_por_campo;
      } else {
        campos[x.clave] = 0;
      }
    }

    bloques.identidad = {
      puntos: campos.nombre + campos.categoria + campos.subcategoria
        + campos.ciudad + campos.departamento + campos.zona,
      max: BLOQUES_MAX.identidad
    };
    bloques.relato = {
      puntos: campos.descripcion_corta + campos.descripcion_larga,
      max: BLOQUES_MAX.relato
    };
    bloques.ubicacion = { puntos: campos.coords, max: BLOQUES_MAX.ubicacion };
    bloques.contacto = { puntos: campos.contacto, max: BLOQUES_MAX.contacto };
    bloques.medios = { puntos: campos.foto + campos.video, max: BLOQUES_MAX.medios };
    bloques.extras = {
      puntos: Math.min(extrasPuntos, BLOQUES_MAX.extras),
      max: BLOQUES_MAX.extras
    };

    var puntos = bloques.identidad.puntos + bloques.relato.puntos
      + bloques.ubicacion.puntos + bloques.contacto.puntos
      + bloques.medios.puntos + bloques.extras.puntos;
    if (puntos > 100) puntos = 100;
    if (puntos < 0) puntos = 0;

    // Faltantes: mismo recorrido que los puntos, luego la equivalencia de D3.0
    // (puntua <=> no figura en faltantes) es estructural, no una coincidencia.
    for (i = 0; i < ORDEN.length; i++) {
      var clave = ORDEN[i];
      if (clave === 'fotos_3') {
        if (e.fotos_no_hero < GUARDA_FOTOS_NO_HERO) faltantes.push(clave);
      } else if (campos[clave] === 0) {
        faltantes.push(clave);
      }
    }

    // D3.2 -- Guardas duras de 'completo'.
    var tieneCoords = campos.coords > 0;
    var tier;
    if (puntos >= UMBRAL_COMPLETO
      && e.fotos_no_hero >= GUARDA_FOTOS_NO_HERO
      && tieneCoords) {
      tier = 'completo';
    } else if (puntos >= UMBRAL_INTERMEDIO) {
      tier = 'intermedio';
    } else {
      tier = 'basico';
    }

    return {
      puntos: puntos,
      tier: tier,
      faltantes: faltantes,
      bloques: bloques,
      guardas: {
        fotos_no_hero: e.fotos_no_hero,
        tiene_coords: tieneCoords,
        cumple_completo: tier === 'completo'
      },
      version: VERSION,
      // Extensiones ADITIVAS al contrato (no lo rompen): D3.6 necesita los
      // dos conteos para persistirlos y D3.0 necesita el credito por campo
      // para que el admin explique por que no llego a 'completo'.
      campos: campos,
      fotos_total: e.fotos_total,
      fotos_no_hero: e.fotos_no_hero
    };
  }

  // -------------------------------------------------------------------------
  // Fila de destinos + array de destinos_fotos -> objeto normalizado.
  // row: { nombre, categoria_slug, ciudad, region, zona, lat, lng, lead,
  //        descripcion, foto_hero, whatsapp, email, web, instagram,
  //        precio_desde, horario, tags }
  // fotos: [{ url, es_hero }]
  // -------------------------------------------------------------------------
  function normalizarFila(row, fotos) {
    var r = (row && typeof row === 'object') ? row : {};
    var tags = leerTags(r.tags);
    var conteo = contarFotos(fotos, r.foto_hero);
    var base = {
      nombre: txt(r.nombre),
      categoria_slug: txt(r.categoria_slug || r.categoria),
      subcategoria: txt(tags.subcategoria || r.subcategoria),
      ciudad: txt(r.ciudad),
      departamento: txt(r.region || r.departamento),
      zona: txt(r.zona),
      descripcion_corta: txt(r.lead || r.descripcion_corta),
      descripcion_larga: txt(r.descripcion || r.descripcion_larga),
      lat: numero(r.lat),
      lng: numero(r.lng),
      whatsapp: txt(r.whatsapp || tags.whatsapp),
      email: txt(r.email || tags.email),
      web: txt(r.web || r.sitio_web || tags.web),
      instagram: txt(r.instagram || tags.instagram),
      foto_hero: conteo.hero,
      fotos_total: conteo.total,
      fotos_no_hero: conteo.no_hero,
      video_url: txt(tags.video_url || r.video_url),
      extras: {}
    };
    var i, j, fuentes, v, asignado;
    for (i = 0; i < EXTRAS.length; i++) {
      fuentes = EXTRAS[i].fuentes;
      asignado = null;
      for (j = 0; j < fuentes.length && asignado === null; j++) {
        v = tags[fuentes[j]];
        if (tieneValor(v)) asignado = v;
      }
      for (j = 0; j < fuentes.length && asignado === null; j++) {
        v = r[fuentes[j]];
        if (tieneValor(v)) asignado = v;
      }
      base.extras[EXTRAS[i].clave] = asignado;
    }
    return base;
  }

  // -------------------------------------------------------------------------
  // D3.6 -- Objeto plano listo para COALESCE(tags,'{}'::jsonb) || $N::jsonb.
  // NUNCA reemplaza tags: solo aporta las cinco claves pub_*.
  // -------------------------------------------------------------------------
  function persistible(resultado) {
    var res = (resultado && typeof resultado === 'object') ? resultado : {};
    var faltantes = (Object.prototype.toString.call(res.faltantes) === '[object Array]')
      ? res.faltantes.slice() : [];
    var total = numero(res.fotos_total);
    if (total === null) total = 0;
    var noHero = numero(res.fotos_no_hero);
    if (noHero === null) {
      noHero = (res.guardas && numero(res.guardas.fotos_no_hero) !== null)
        ? numero(res.guardas.fotos_no_hero) : 0;
    }
    return {
      pub_completitud: entero(res.puntos),
      pub_faltantes: faltantes,
      pub_tier: txt(res.tier),
      pub_fotos_total: entero(total),
      pub_fotos_no_hero: entero(noHero)
    };
  }

  return {
    VERSION: VERSION,
    UMBRAL_INTERMEDIO: UMBRAL_INTERMEDIO,
    UMBRAL_COMPLETO: UMBRAL_COMPLETO,
    GUARDA_FOTOS_NO_HERO: GUARDA_FOTOS_NO_HERO,
    BLOQUES_MAX: BLOQUES_MAX,
    PESOS: PESOS,
    ORDEN: ORDEN,
    PUNTUABLES: PUNTUABLES,
    CLAVES_PERSISTIDAS: CLAVES_PERSISTIDAS,
    ZONAS: ZONAS,
    SUBCAT_LISTA: SUBCAT_LISTA,
    VIDEO_HOSTS: VIDEO_HOSTS,
    // D4 nombra evaluarCompletitud(); el contrato del formulario y del admin
    // usa calcular(). Es la MISMA funcion, con dos nombres y cero duplicacion.
    evaluarCompletitud: evaluarCompletitud,
    calcular: evaluarCompletitud,
    normalizarFila: normalizarFila,
    persistible: persistible,
    contarFotos: contarFotos,
    esVideoUrlSegura: esVideoUrlSegura,
    resolverCategoria: resolverCategoria
  };
});
