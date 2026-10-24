// index-api-connector.js  v8 \u2014 completo y definitivo
// Actualiza: PL[], DEST_PHOTOS{}, MAPA_PLACES[], DEST_FEATURED_IDS[],
//            AGENDA_EVENTS[] (secci\u00f3n eventos), stats reales, b\u00fasqueda en tiempo real

(function () {
  'use strict';

  var CAT_COLORS = {
    hostal: 'linear-gradient(135deg,#1a3a5c,#2a4a7c)',
    comida: 'linear-gradient(135deg,#3a1a0a,#4a2a1a)',
    sitio:  'linear-gradient(135deg,#0a2a1a,#1a3a2a)',
    evento: 'linear-gradient(135deg,#1a051a,#3a1a3a)',
  };

  // Color del pin del mapa por categor\u00eda \u2014 MAPA_PLACES necesita p.color
  var PIN_COLORS = {
    hostal: '#2196F3',
    comida: '#FF9800',
    sitio:  '#4CAF50',
    evento: '#A855F7',
  };

  // Mapeo cat DB \u2192 cat de agenda (para AGENDA_EVENTS)
  var AGENDA_CAT_MAP = {
    hostal:  'alojamiento',
    comida:  'gastro',
    sitio:   'naturaleza',
    evento:  'festival',
  };

  // Formato exacto de PL[] confirmado del index.html real.
  // FIX 2: foto por defecto es '' (cadena vac\u00eda). NUNCA se inyecta una URL
  // externa (Unsplash, placeholder, etc.). Si item.foto / item.photos[0].url
  // falta o viene vac\u00eda, se devuelve '' y el render del index muestra el
  // placeholder NEUTRO (photoPlaceholderHTML del index.html). Mantener esto
  // ASCII-safe: ning\u00fan caracter >127 ni backticks.
  function toPlace(item, idx) {
    var foto = item.foto
      || (item.photos && item.photos[0] ? item.photos[0].url : '')
      || '';
    return {
      id:        idx + 1,
      _uuid:     item.id,
      slug:      item.slug       || '',
      name:      item.name       || '',
      cat:       item.cat        || 'sitio',
      city:      item.city       || '',
      region:    item.region     || '',
      barrio:    item.barrio     || '',
      address:   '',
      lead:      item.lead       || '',
      desc:      item.desc       || item.lead || '',
      highlight: item.highlight  || '',
      price:     item.price      || '',
      emoji:     item.emoji      || '\uD83D\uDCCD',
      hero_bg:   item.hero_bg    || CAT_COLORS[item.cat] || CAT_COLORS.sitio,
      rating:    item.rating     || 0,
      rev:       item.reviews    || 0,
      whatsapp:  item.whatsapp   || '',
      tel:       item.tel        || '',
      email:     item.email      || '',
      web:       item.web        || '',
      instagram: item.instagram  || '',
      booking:   item.booking    || '',
      hostelworld: item.hostelworld || '',
      airbnb:    item.airbnb     || '',
      lat:       item.lat        || 0,
      lng:       item.lng        || 0,
      photos:    foto ? [{ type: 'photo', url: foto, cap: item.name || '' }] : [],
      scores:    {},
      status:    'published',
      destacado: item.destacado  || false,
    };
  }

  // Formato MAPA_PLACES[] \u2014 necesita p.color para los pins de Leaflet.
  // FIX 2: igual que toPlace, NUNCA se inyecta una URL externa de fallback.
  // Si el destino no tiene foto real, place.foto queda '' y el placeholder
  // neutro del index.html se muestra via photoPlaceholderHTML(emoji, 'hero').
  function toMapPlace(item, idx) {
    return {
      id:      idx + 1,
      _uuid:   item.id,
      slug:    item.slug    || '',
      name:    item.name    || '',
      cat:     item.cat     || 'sitio',
      subcategoria: item.subcategoria || '',
      city:    item.city    || '',
      region:  item.region  || '',
      rating:  item.rating  || 0,
      emoji:   item.emoji   || '\uD83D\uDCCD',
      lat:     parseFloat(item.lat) || 0,
      lng:     parseFloat(item.lng) || 0,
      lead:    item.lead    || '',
      price:   item.price   || '',
      hero_bg: item.hero_bg || CAT_COLORS[item.cat] || CAT_COLORS.sitio,
      foto:    item.foto_hero || item.foto || '',
      // Galeria completa del destino (max 8) para el drawer del mapa.
      // Shape normalizado {url,cap}; index.html puede consumir place.photos
      // sin sorpresas (spec: galeria completa, no solo la hero).
      photos:   (item.photos && item.photos.length) ? item.photos.slice(0, 8).map(function (p) { return { url: p.url || '', cap: p.cap || '' }; }) : [],
      color:   PIN_COLORS[item.cat] || '#666666', // \u2190 campo requerido por initMapaSection()
    };
  }

  // Colores de categor\u00eda para la agenda (mismo set que los filtros del home)
  var AGENDA_CAT_COLOR = {
    festival:   '#A855F7',
    musica:     '#3B82F6',
    gastro:     '#EF4444',
    naturaleza: '#22C55E',
    cultura:    '#EC4899',
  };

  // Convierte lugar de DB al formato AGENDA_EVENTS[] que usa renderAgenda()
  // Solo para lugares con cat='evento'. RANGO [fecha_inicio, fecha_fin]:
  // el evento queda activo en TODOS los dias vigentes (multidia).
  function toAgendaEvent(item, idx) {
    var AU = window.AgendaUtil || null;
    var MONTHS = AU ? AU.MONTHS : ['Ene','Feb','Mar','Abr','May','Jun',
                                   'Jul','Ago','Sep','Oct','Nov','Dic'];
    var t = item.tags || {};
    var d = new Date();
    var startDate = AU ? AU.parseISO(t.fecha_inicio) : null;
    var endDate = AU && t.fecha_fin ? AU.parseISO(t.fecha_fin) : startDate;
    var cat = AU ? AU.detectEventCat(item.name, t) : (AGENDA_CAT_MAP[item.cat] || 'festival');
    return {
      id:       1000 + idx,
      name:     item.name || '',
      cat:      cat,
      city:     item.city || '',
      day:      startDate ? startDate.getDate() : (item.day   || d.getDate()),
      month:    startDate ? MONTHS[startDate.getMonth()]
                          : (item.month || MONTHS[d.getMonth()]),
      time:     item.horario || 'Variable',
      price:    item.price || 'Consultar',
      loc:      t.sede
                  ? t.sede
                  : (item.barrio ? (item.barrio + ', ' + (item.city || '')) : (item.city || '')),
      emoji:    item.emoji   || '\uD83C\uDF89',
      color:    AGENDA_CAT_COLOR[cat] || PIN_COLORS.evento,
      url:      item.slug + '.html',
      featured: item.destacado || false,
      start:    startDate,
      end:      endDate,
      tags:     t,
    };
  }

  // Actualizar stats con IDs a\u00f1adidos al HTML
  function updateStats(stats) {
    var get = function (id) { return document.getElementById(id); };
    // Antes usaba "&& stats.X" (truthiness), asi que un valor real de 0
    // (ej. 0 resenas antes de que existiera la tabla interacciones) se
    // trataba como "sin dato" y dejaba el placeholder hardcodeado del
    // HTML (18.4K) para siempre. "!= null" cubre null/undefined sin
    // excluir el 0 legitimo.
    if (get('stat-destinos') && stats.destinos != null) get('stat-destinos').textContent = stats.destinos;
    if (get('stat-ciudades') && stats.ciudades != null) get('stat-ciudades').textContent = stats.ciudades;
    if (get('stat-resenas')  && stats.resenas != null) {
      get('stat-resenas').textContent = stats.resenas >= 1000
        ? (stats.resenas / 1000).toFixed(1) + 'K'
        : stats.resenas;
    }
    if (get('stat-rating') && stats.rating != null) {
      get('stat-rating').textContent = stats.rating + '\u2605';
    }
  }

  // Reemplazar array sin romper la referencia (mutacion in-place).
  // IMPORTANTE: recibe el ARRAY REAL por referencia (ej. PL, no
  // 'PL' como string). PL/MAPA_PLACES/AGENDA_EVENTS estan declarados
  // con const/let en index.html -- las declaraciones const/let de
  // nivel superior en un <script> NO se exponen como propiedades de
  // window (solo var y las funciones si lo hacen). Buscar por
  // window[name] con esos tres arrays SIEMPRE fallaba el chequeo
  // typeof window[name] !== 'undefined' y terminaba creando una
  // propiedad window.PL / window.MAPA_PLACES / window.AGENDA_EVENTS
  // nueva y desconectada -- que nada mas en la pagina lee -- mientras
  // el const PL / const MAPA_PLACES / const AGENDA_EVENTS real (el
  // que usan renderDest()/refreshMapaMarkers()/renderAgenda()) se
  // quedaba vacio para siempre. Por eso el log mostraba "PL:95" pero
  // la grilla y el mapa nunca se poblaban (ver BUGS_HISTORICOS.md
  // BUG-020). Recibir el array por referencia evita el problema por
  // completo, sin importar si fue declarado con var/let/const.
  function replArr(targetArr, newArr) {
    if (!Array.isArray(targetArr)) return;
    targetArr.length = 0;
    newArr.forEach(function (i) { targetArr.push(i); });
  }

  // Reemplazar objeto sin romper la referencia (mismo razonamiento que
  // replArr -- recibe el OBJETO REAL, no un string).
  function replObj(targetObj, newObj) {
    if (!targetObj || typeof targetObj !== 'object') return;
    Object.keys(targetObj).forEach(function (k) { delete targetObj[k]; });
    Object.keys(newObj).forEach(function (k) { targetObj[k] = newObj[k]; });
  }

  // \u2500\u2500 B\u00daSQUEDA EN TIEMPO REAL \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  // Conectar el input del hero (#sinp) y el input de destinos (#dest-input)
  // a la API con debounce 300ms
  var searchTimer = null;

  function setupSearch() {
    var inputs = [
      document.getElementById('sinp'),
      document.getElementById('dest-input'),
    ].filter(Boolean);

    inputs.forEach(function (inp) {
      inp.addEventListener('input', function (e) {
        var q = e.target.value.trim();
        clearTimeout(searchTimer);
        if (q.length === 0) {
          // Sin b\u00fasqueda \u2014 restaurar PL completo
          loadAndRender();
          return;
        }
        if (q.length < 2) return; // esperar al menos 2 chars
        searchTimer = setTimeout(function () {
          fetchAndUpdate(q);
        }, 300);
      });
    });
  }

  // \u2500\u2500 FETCH Y ACTUALIZAR \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  function fetchAndUpdate(q) {
    var url = '/api/destinos?limit=500&_t=' + Date.now() + (q ? '&q=' + encodeURIComponent(q) : '');
    fetch(url)
      .then(function (r) { return r.json(); })
      .then(function (d) { applyData(d, q); })
      .catch(function (e) { console.warn('[index-api] Error:', e.message); });
  }

  function applyData(d, q) {
    if (!d.ok || !d.data) {
      console.warn('[index-api] Sin datos:', d.error || 'vac\u00edo');
      return;
    }

    var apiData = d.data;

    // 1. PL[]
    var nuevoPL = apiData.map(toPlace);
    if (typeof PL !== 'undefined') replArr(PL, nuevoPL);

    // 2. DEST_PHOTOS{} -- FIX 2: ahora poblado desde la API con fotos
    //    REALES por destino (index.html ya no hardcodea URLs externas).
    //    Si un destino no tiene foto, queda '' y se muestra el
    //    placeholder neutro (photoPlaceholderHTML).
    var nuevosPhotos = {};
    nuevoPL.forEach(function (p) {
      if (p.photos && p.photos[0]) nuevosPhotos[p.id] = p.photos[0].url;
    });
    if (typeof DEST_PHOTOS !== 'undefined') replObj(DEST_PHOTOS, nuevosPhotos);

    // 3. MAPA_PLACES[] \u2014 solo con coords + campo color
    var nuevoMapa = apiData
      .filter(function (item) { return item.lat && item.lng && item.lat !== 0 && item.lng !== 0; })
      .map(function (item) {
        var idx = apiData.indexOf(item);
        return toMapPlace(item, idx);
      });
    // Fase 1: marca los lugares visitados (borde verde + filtro en el mapa
    // cultural). mmVisited es el set de slugs hidratado en index.html; se
    // reaplica en cada applyData porque MAPA_PLACES se reconstruye.
    var visitadosSlugs = (typeof window !== 'undefined' && window.mmVisited) ? window.mmVisited : [];
    nuevoMapa.forEach(function (p) {
      p.visitado = visitadosSlugs.indexOf(p.slug) !== -1;
    });
    if (typeof MAPA_PLACES !== 'undefined') replArr(MAPA_PLACES, nuevoMapa);

    // 3b. MAPA_MEDIA[] - multimedia del mapa cultural del endpoint
    //     GET /api/interacciones?tipo=multimedia_mapa. La CONSULTA de esta
    //     capa se hace en el paso 8, DESPUES de que exista el motor: la query
    //     se arma con el estado real del filtro (vista 'sueltos'|'albumes' y
    //     alcance propio) que el motor restaura de localStorage, y para leerlo
    //     el motor tiene que estar creado. Por defecto la capa es PUBLICA: se
    //     llama SIN usuario_id (trae albumes + destinos con fotos + albumes
    //     curados de destino origen='destino_album'). Solo con el alcance
    //     propio activo Y sesion se envia scope=mio&usuario_id=<id>.

    // 4. DEST_FEATURED_IDS[]
    var featIds = nuevoPL
      .filter(function (p) { return p.destacado; })
      .map(function (p) { return p.id; });
    if (!featIds.length) {
      featIds = nuevoPL.slice()
        .sort(function (a, b) { return b.rating - a.rating; })
        .slice(0, 10)
        .map(function (p) { return p.id; });
    }
    if (typeof DEST_FEATURED_IDS !== 'undefined') replArr(DEST_FEATURED_IDS, featIds);

    // 4b. HERO del home: respaldo del slideshow (window.ExploraCOHero) con la
    //     foto hero de los destinos destacado === true. Solo en la carga
    //     COMPLETA: una busqueda trae un subconjunto y no debe encogerlo.
    if (!q) heroFijarDestacados(apiData);

    // 5. AGENDA_EVENTS[] -- SOLO eventos reales de la API (DB).
    //    Orden: mas recientes primero (creado_en DESC) para que los eventos
    //    recien cargados aparezcan arriba de la agenda del home.
    //    Sin merge con eventos hardcodeados: si la API no devuelve eventos,
    //    la agenda queda [] y el home muestra el estado vacio neutro.
    var eventosDB = apiData
      .filter(function (item) { return item.cat === 'evento'; })
      .sort(function (a, b) {
        var ca = a.creado_en || '', cb = b.creado_en || '';
        return ca < cb ? 1 : (ca > cb ? -1 : 0);
      })
      .map(toAgendaEvent);

    if (typeof AGENDA_EVENTS !== 'undefined') replArr(AGENDA_EVENTS, eventosDB);

    // 6. Stats reales (solo en carga inicial, no en b\u00fasquedas)
    if (!q && d.stats) updateStats(d.stats);

    console.log('[index-api] \u2713 PL:' + nuevoPL.length
      + ' | mapa:' + nuevoMapa.length
      + (q ? ' | b\u00fasqueda:"' + q + '"' : ''));

    // 7. Re-render
    if (typeof renderDest      === 'function') renderDest();
    if (typeof renderAgenda    === 'function') renderAgenda(
      typeof agendaCat !== 'undefined' ? agendaCat : 'all',
      typeof agendaDayFilter !== 'undefined' ? agendaDayFilter : null
    );
    // Mapa: si el Leaflet map YA existe (mapaMap truthy), solo refrescar
    // markers. Si TODAVIA no existe, inicializarlo ahora mismo en vez
    // de esperar a que el usuario llegue a la seccion de mapa via
    // scroll/IntersectionObserver/timeout de 2s. initMapaSection() ya
    // llama a refreshMapaMarkers() internamente, y MAPA_PLACES ya esta
    // poblado en este punto del codigo (mapaMap SI esta declarado con
    // var en index.html, por eso window.mapaMap funciona aqui).
    if (typeof window.mapaMap !== 'undefined' && window.mapaMap) {
      if (typeof refreshMapaMarkers === 'function') refreshMapaMarkers();
    } else if (typeof initMapaSection === 'function') {
      initMapaSection();
    }
    // Mi Mapa personal: MAPA_PLACES acaba de poblarse/cambiarse, pero
    // este ciclo nunca lo repintaba -- quedaba congelado en el estado
    // vacio del primer render (riesgo conocido en NEXT.md, BUG TSK-070:
    // "al iniciar no muestra los sitios guardados"). renderMMList limpia
    // su contenedor antes de pintar, asi que repetir la llamada no
    // duplica items.
    if (typeof renderMyMap === 'function') renderMyMap();

    // 8. CAPA MULTIMEDIA (MAPA_MEDIA[]): se consulta con el motor ya
    //    inicializado (initMapaSection, mas arriba), para que la query salga
    //    del estado real que el motor restauro de localStorage: el PRIMER
    //    fetch ya lleva la vista y el alcance correctos, una sola descarga y
    //    sin parpadeo de capa vacia.
    cargarMapaMedia();
  }

  // -- MAPA_MEDIA: capa de multimedia del mapa cultural -----------------
  // FUENTE UNICA DEL FILTRO: el motor (mapa-cultural.js). Los antiguos
  // globals MAPA_MEDIA_VISTA y MAPA_MEDIA_SOLO_MIO se eliminaron: eran una
  // segunda fuente de verdad paralela al motor y por eso la vista de albumes
  // (y el alcance propio) nunca llegaban a la query de este fetch.
  var MEDIA_FIRMA = null;  // firma de la query ya pedida
  var MEDIA_PIDIDA = false;// esa query esta en vuelo
  var MEDIA_LISTO = false; // la ultima query respondio bien
  var MEDIA_TOKEN = 0;     // descarta respuestas obsoletas
  var MEDIA_SUB = null;    // instancia del motor ya escuchada

  // Instancia del motor que creo index.html con MapaCultural.init: es la
  // MISMA que devuelve la facade estatica, asi que se puede leer por
  // cualquiera de las dos sin crear un segundo mapa.
  function motorMedia() {
    return window.mcMapa || window.MapaCultural || null;
  }

  // Estado real del filtro de la capa: 'sueltos'|'albumes' y alcance propio.
  // Si el motor no esta disponible se cae a los defaults suyos (capa publica,
  // media suelta), que es lo que se piden sin filtro.
  function filtroMedia() {
    var f = { vista: 'sueltos', soloMio: false };
    var MC = motorMedia();
    if (!MC) return f;
    try {
      if (typeof MC.getMediaVista === 'function' && MC.getMediaVista() === 'albumes') f.vista = 'albumes';
      if (typeof MC.getMediaSoloMio === 'function' && MC.getMediaSoloMio() === true) f.soloMio = true;
    } catch (e) { console.warn('[index-api] filtro multimedia:', e.message); }
    return f;
  }

  // Recarga de la capa cuando el filtro del motor cambia. Idempotente: una
  // sola suscripcion por instancia. Solo vuelve a pedir si cambia la FIRMA de
  // la query (vista o alcance): mover el puntaje o la categoria no vuelve a
  // descargar la misma capa.
  function suscribirFiltroMedia() {
    var MC = motorMedia();
    if (!MC || typeof MC.onFilterChange !== 'function') return;
    if (MEDIA_SUB === MC) return;
    MEDIA_SUB = MC;
    try {
      MC.onFilterChange(function () { cargarMapaMedia(); });
    } catch (e) {
      console.warn('[index-api] onFilterChange:', e.message);
      MEDIA_SUB = null;
    }
  }

  // Carga (o recarga) la capa de multimedia. La query se arma SIEMPRE con el
  // estado del motor: &vista=albumes para la vista de grupos y
  // &scope=mio&usuario_id= para el alcance propio. forzar=true ignora la
  // deduplicacion por firma (recarga manual).
  function cargarMapaMedia(forzar) {
    suscribirFiltroMedia();
    var f = filtroMedia();
    var uid = (window.ExploraCO && window.ExploraCO.usuario && window.ExploraCO.usuario.id)
      ? String(window.ExploraCO.usuario.id) : '';
    var soloMio = (f.soloMio && !!uid);
    // Firma de lo que pide esta consulta: si no cambio, la capa ya esta.
    var firma = f.vista + '|' + (soloMio ? ('mio:' + uid) : 'publico');
    if (!forzar && firma === MEDIA_FIRMA && (MEDIA_LISTO || MEDIA_PIDIDA)) return;
    MEDIA_FIRMA = firma;
    MEDIA_PIDIDA = true;
    MEDIA_LISTO = false;
    var tok = ++MEDIA_TOKEN;
    var mediaUrl = '/api/interacciones?tipo=multimedia_mapa';
    // Vista de albumes: pide las filas agrupadas (album_grupo/destino_album).
    if (f.vista === 'albumes') mediaUrl += '&vista=albumes';
    // Solo con el alcance propio activo Y sesion se restringe el scope.
    if (soloMio) {
      mediaUrl += '&scope=mio&usuario_id=' + encodeURIComponent(uid);
    }
    mediaUrl += '&_t=' + Date.now();
    // scope=mio exige Authorization: Bearer (el uuid del dueno se deriva
    // de la sesion); la capa publica funciona con el objeto vacio.
    var authHeaders = (window.ExploraCO && typeof window.ExploraCO.authHeaders === 'function')
      ? (window.ExploraCO.authHeaders() || {})
      : {};
    fetch(mediaUrl, { headers: authHeaders })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (tok !== MEDIA_TOKEN) return; // respuesta obsoleta: otra vista ya pidio
        MEDIA_PIDIDA = false;
        if (!d.ok || !d.data) {
          // Sin exito la capa sigue SIN_LISTO: el siguiente ciclo la reintenta.
          console.warn('[index-api] Sin multimedia de mapa:', d.error || 'vacio');
          return;
        }
        MEDIA_LISTO = true;
        var nuevoMedia = d.data.filter(function (m) {
          return m.media_url
            && m.lat != null && m.lat !== 0
            && m.lng != null && m.lng !== 0;
        });
        if (typeof MAPA_MEDIA !== 'undefined') replArr(MAPA_MEDIA, nuevoMedia);
        // Re-render de la capa media: sin esto, si el usuario abre el mapa
        // antes de que llegue la respuesta, la capa queda vacia hasta la
        // siguiente interaccion (auditoria QA -> hallazgo M1).
        if (typeof refreshMapaMarkers === 'function') { try { refreshMapaMarkers(); } catch (e) { console.warn('[index-api] refresh tras multimedia:', e.message); } }
        console.log('[index-api] MAPA_MEDIA:' + nuevoMedia.length
          + ' | vista:' + f.vista + (soloMio ? ' (solo mio)' : ' (publico)'));
      })
      .catch(function (e) {
        if (tok === MEDIA_TOKEN) { MEDIA_PIDIDA = false; MEDIA_LISTO = false; }
        console.warn('[index-api] Error multimedia mapa:', e.message);
      });
  }

  // -- ALBUM OFICIAL (TSK-111 Fase 4): fotos curadas de un destino ------
  // GET /api/interacciones?tipo=multimedia_mapa&destino_id=<uuid> agrega la
  // clave album_oficial (max 12) al shape ya existente de la rama GET. Se
  // consulta por uuid REAL de Neon (destino_id), nunca por slug. Devuelve
  // SIEMPRE un array: uuid invalido, respuesta sin ok o caida de red
  // degradan a [] (la promesa nunca se rechaza, para que el drawer no
  // tenga que manejar errores ni dejar contenedores vacios).
  var ALBUM_OFICIAL_UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

  function cargarAlbumOficialDestino(destinoUuid) {
    var uuid = (destinoUuid == null) ? '' : String(destinoUuid).trim();
    if (!ALBUM_OFICIAL_UUID_RE.test(uuid)) return Promise.resolve([]);
    var url = '/api/interacciones?tipo=multimedia_mapa&destino_id='
      + encodeURIComponent(uuid) + '&_t=' + Date.now();
    return fetch(url)
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (!d || d.ok !== true || !Array.isArray(d.album_oficial)) {
          console.warn('[index-api] album_oficial no disponible:', (d && d.error) || 'vacio');
          return [];
        }
        return d.album_oficial;
      })
      .catch(function (e) {
        console.warn('[index-api] Error album oficial:', e.message);
        return [];
      });
  }

  // Expuesto al index.html (inline): el IIFE oculta el resto del modulo.
  window.cargarAlbumOficialDestino = cargarAlbumOficialDestino;

  // -- HERO DEL HOME: slideshow de fotos mas votadas ---------------------
  // Contrato publico: window.ExploraCOHero.cargar(cb). cb recibe UN array de
  // { url, nombre, votos } (maximo 6, sin URLs repetidas, solo imagenes) y se
  // llama SIEMPRE una vez: exito, vacio o error. Nunca lanza.
  // Precedencia decidida por el usuario (MEZCLA por orden, hasta 6):
  //   1) MODULO MANUAL: slots activa === true del panel, en orden de posicion
  //      ASC (maximo 6). Fuente: GET /api/utilidades?tipo=hero_home, PUBLICA
  //      (sin auth), que devuelve {posicion, url, caption, activa}. Van
  //      PRIMERO, siempre. degradado:true, total 0, error HTTP o red =>
  //      "sin modulo" y decide el tramo 2. Nunca lanza.
  //   2) COMUNIDAD: rellena los huecos que deje el modulo. Fotos de album de
  //      usuario con votos > 0, globales (sin ciudad ni destino), votos DESC.
  //      Fuente: el endpoint EXISTENTE
  //      GET /api/interacciones?tipo=multimedia_mapa&tipo_media=foto (capa
  //      publica, mismo patron de authHeaders que cargarMapaMedia).
  //   3) RESPALDO: si aun quedan huecos, foto hero de los destinos
  //      destacado === true que ya trae /api/destinos?limit=500 (la lista que
  //      alimenta las tarjetas). rating DESC y luego nombre ASC; votos = 0.
  //   4) Si no hay ninguna: [] (la home conserva su gradiente).
  // Total siempre <= 6 y sin URLs repetidas entre tramos: manda el tramo
  // anterior (si la misma URL viene del modulo, se queda su nombre y votos 0).
  // El CORTO-CIRCUITO solo se aplica si el modulo ya llena los 6 slots: en ese
  // caso no se pide comunidad ni se consulta el respaldo.
  // Estado PROPIO (HERO_*) y peticion PROPIA: cero efectos sobre MEDIA_*,
  // MAPA_MEDIA, los tokens anti-respuesta-obsoleta ni los markers del mapa.
  var HERO_MAX = 6;
  var HERO_REINTENTO_MS = 30000;
  var HERO_MEDIA_NO_IMG = /\.(mp4|webm|mov|m4v|avi|mp3|wav|m4a|ogg|oga|aac|flac)(\?|#|$)/i;
  var HERO_CACHE = null;      // ultimo array NO vacio ya entregado
  var HERO_PIDIDA = false;    // hay una peticion en vuelo
  var HERO_ESPERA = null;     // callbacks pendientes de esa peticion
  var HERO_ULTIMO = 0;        // ms de la ultima respuesta VACIA (anti-martilleo)
  var HERO_DESTACADOS = [];   // respaldo: [{url, nombre, rating}]
  var HERO_MODULO_QS = '/api/utilidades?tipo=hero_home'; // tramo 1, publico

  // Entrega defensiva: un callback roto del consumidor nunca rompe el conector.
  function heroEntregar(cb, arr) {
    try { cb(Array.isArray(arr) ? arr : []); }
    catch (e) { console.warn('[index-api] hero cb:', e && e.message); }
  }

  // Solo imagenes: fuera los data: que no sean imagen y las extensiones
  // evidentes de video/audio (la lista pedida, ampliada con equivalentes).
  function heroEsImagen(url) {
    var u = (url == null) ? '' : String(url).trim();
    if (!u) return false;
    if (u.indexOf('data:image/') === 0) return true;
    if (u.indexOf('data:') === 0) return false;
    return !HERO_MEDIA_NO_IMG.test(u);
  }

  // Tipo declarado del recurso: media_type/foto_type video|audio descarta.
  function heroTipoNoImagen(m) {
    var claves = [m.media_type, m.foto_type, m.tipo_media, m.media_kind];
    for (var i = 0; i < claves.length; i++) {
      var t = (claves[i] == null) ? '' : String(claves[i]).toLowerCase();
      if (t === 'video' || t === 'audio') return true;
    }
    return false;
  }

  // Votos por item. El handler SI emite el campo: api/interacciones.js:8246
  // (rama album_foto) y :8265 (rama curada) via sqlEstadisticasItem(...,'votos'),
  // y las filas agregadas del pin lo fijan a 0 en :8337. Sin numero valido => 0.
  function heroVotos(m) {
    var n = parseInt(m && m.votos, 10);
    if (!isFinite(n) || n < 0) n = 0;
    return n;
  }

  // Etiqueta visible. En las filas de destino album_titulo ES el nombre del
  // destino; en las de comunidad es el titulo del album (el unico texto que
  // esa fila trae). Sin texto => cadena vacia, como pide el contrato.
  function heroNombre(m) {
    var n = (m && (m.album_titulo || m.media_title)) || '';
    return String(n).replace(/\s+/g, ' ').trim();
  }

  // Fila util de la PRIMARIA: foto de album de usuario, imagen y >= 1 voto.
  // Fuera las filas AGREGADAS del pin (destino_album / album_grupo) y la rama
  // curada de destinos_fotos, que es la fuente del RESPALDO.
  function heroFilaComunidad(m) {
    if (!m || typeof m !== 'object') return false;
    if (!heroEsImagen(m.media_url)) return false;
    if (heroTipoNoImagen(m)) return false;
    var origen = String(m.origen || '').toLowerCase();
    if (origen === 'destino_album' || origen === 'album_grupo') return false;
    var fuente = (m.fuente == null) ? '' : String(m.fuente).toLowerCase();
    if (fuente !== 'album_foto') return false;
    return heroVotos(m) > 0;
  }

  // Orden de la primaria: votos DESC. Desempate: creado_en DESC si el payload
  // lo trae (esta rama NO lo selecciona), luego rating_promedio DESC (si viene
  // de media_estadisticas) y media_id ASC, para que el resultado sea estable.
  function heroOrdenComunidad(a, b) {
    var va = heroVotos(a), vb = heroVotos(b);
    if (va !== vb) return vb - va;
    var ca = (a.creado_en == null) ? '' : String(a.creado_en);
    var cb = (b.creado_en == null) ? '' : String(b.creado_en);
    if (ca !== cb) return (ca < cb) ? 1 : -1;
    var ra = Number(a.rating_promedio), rb = Number(b.rating_promedio);
    if (isFinite(ra) && isFinite(rb) && ra !== rb) return rb - ra;
    var ia = (a.media_id == null) ? '' : String(a.media_id);
    var ib = (b.media_id == null) ? '' : String(b.media_id);
    return (ia < ib) ? -1 : (ia > ib ? 1 : 0);
  }

  // Sin URLs repetidas (clave normalizada) y tope duro de elementos.
  function heroUnicos(lista, tope) {
    var vistos = {}, out = [];
    var max = tope || HERO_MAX;
    (lista || []).forEach(function (it) {
      if (!it || !it.url) return;
      var clave = String(it.url).trim().toLowerCase();
      if (!clave || vistos[clave]) return;
      vistos[clave] = true;
      out.push(it);
    });
    return out.slice(0, max);
  }

  // PRIMARIA: ordena y filtra las filas de multimedia_mapa.
  function heroDesdeComunidad(filas) {
    var pool = [];
    (filas || []).forEach(function (m) {
      if (!heroFilaComunidad(m)) return;
      pool.push({ fila: m, url: String(m.media_url).trim() });
    });
    pool.sort(function (a, b) { return heroOrdenComunidad(a.fila, b.fila); });
    return heroUnicos(pool.map(function (p) {
      return { url: p.url, nombre: heroNombre(p.fila), votos: heroVotos(p.fila) };
    }));
  }

  // RESPALDO: destacados con foto hero, rating DESC y nombre ASC, votos = 0.
  function heroDesdeDestacados(filas) {
    var pool = [];
    (filas || []).forEach(function (it) {
      if (!it || !heroEsImagen(it.url)) return;
      pool.push({
        url: String(it.url).trim(),
        nombre: String(it.nombre || '').replace(/\s+/g, ' ').trim(),
        rating: Number(it.rating) || 0
      });
    });
    pool.sort(function (a, b) {
      if (a.rating !== b.rating) return b.rating - a.rating;
      return (a.nombre < b.nombre) ? -1 : (a.nombre > b.nombre ? 1 : 0);
    });
    return heroUnicos(pool.map(function (p) {
      return { url: p.url, nombre: p.nombre, votos: 0 };
    }));
  }

  // Destacados disponibles AHORA: cache poblado por applyData (carga completa)
  // o, si aun no llego, la lista PL que ya alimenta las tarjetas.
  function heroDestacadosActuales() {
    if (HERO_DESTACADOS && HERO_DESTACADOS.length) return HERO_DESTACADOS.slice();
    var out = [];
    try {
      if (typeof PL !== 'undefined' && PL && PL.length) {
        PL.forEach(function (p) {
          if (!p || p.destacado !== true) return;
          var u = (p.photos && p.photos[0] && p.photos[0].url) ? p.photos[0].url : '';
          out.push({ url: u, nombre: p.name || '', rating: Number(p.rating) || 0 });
        });
      }
    } catch (e) { console.warn('[index-api] hero respaldo PL:', e && e.message); }
    return out;
  }

  // Cache del respaldo. Se recompone en cada carga COMPLETA de destinos, asi
  // el hero sigue lo que marque el admin sin una peticion extra.
  function heroFijarDestacados(filas) {
    var out = [];
    (filas || []).forEach(function (it) {
      if (!it || it.destacado !== true) return;
      var u = it.foto_hero || it.foto || '';
      if (!u) return;
      out.push({ url: u, nombre: it.name || '', rating: Number(it.rating) || 0 });
    });
    HERO_DESTACADOS = out;
  }

  // -- TRAMO 1: MODULO MANUAL (6 slots del panel, orden de posicion) --------
  // posicion valida => numero; ausente o basura => al final (no rompe el orden
  // de las que SI tienen posicion). El indice de llegada desempata.
  function heroPosicion(v) {
    var n = (v == null) ? NaN : Number(v);
    return isFinite(n) ? n : 1e9;
  }

  // Slots utiles: activa === true, url no vacia e imagen (mismo guard que la
  // comunidad: fuera video/audio por extension; las URLs de CDN sin extension
  // se conservan). Orden: posicion ASC.
  function heroSlotsModulo(d) {
    if (!d || d.ok !== true || d.degradado === true) return [];
    var filas = Array.isArray(d.data) ? d.data : [];
    var pool = [];
    for (var i = 0; i < filas.length; i++) {
      var it = filas[i];
      if (!it || typeof it !== 'object') continue;
      if (it.activa !== true) continue;
      var u = (it.url == null) ? '' : String(it.url).trim();
      if (!u || !heroEsImagen(u)) continue;
      pool.push({
        url: u,
        nombre: (it.caption == null) ? '' : String(it.caption).trim(),
        pos: heroPosicion(it.posicion),
        orden: i
      });
    }
    pool.sort(function (a, b) {
      if (a.pos !== b.pos) return a.pos - b.pos;
      return a.orden - b.orden;
    });
    return pool;
  }

  // Entrega del tramo 1: { url, nombre, votos: 0 }, sin repetidas, maximo 6.
  function heroDesdeModulo(d) {
    var pool = heroSlotsModulo(d);
    if (!pool.length) return [];
    return heroUnicos(pool.map(function (p) {
      return { url: p.url, nombre: p.nombre, votos: 0 };
    }));
  }

  // MEZCLA de tramos: los recorre EN ORDEN y rellena hasta HERO_MAX. El dedupe
  // es por URL normalizada y gana la PRIMERA aparicion, asi que un slot del
  // modulo conserva su nombre (caption) y sus votos 0 aunque la misma foto
  // venga tambien de comunidad o de destacados.
  function heroMezclar(tramos) {
    var out = [];
    var vistos = {};
    var t, i, it, clave, votos;
    for (t = 0; t < (tramos || []).length; t++) {
      var lista = tramos[t] || [];
      for (i = 0; i < lista.length; i++) {
        it = lista[i];
        if (!it || !it.url) continue;
        clave = String(it.url).trim().toLowerCase();
        if (!clave || vistos[clave]) continue;
        vistos[clave] = true;
        votos = Number(it.votos);
        out.push({
          url: String(it.url).trim(),
          nombre: (it.nombre == null) ? '' : String(it.nombre),
          votos: (isFinite(votos) && votos >= 0) ? votos : 0
        });
        if (out.length >= HERO_MAX) return out;
      }
    }
    return out;
  }

  // MEZCLA con relleno: modulo (ya filtrado y ordenado) -> comunidad ->
  // destacados. Los destacados SOLO se consultan si quedan huecos, para no
  // pagar trabajo de mas.
  function heroComponerMezcla(modulo, comunidad) {
    var base = heroMezclar([modulo, comunidad]);
    if (base.length >= HERO_MAX) return base;
    return heroMezclar([base, heroDesdeDestacados(heroDestacadosActuales())]);
  }

  // Cierra la peticion en vuelo: cachea si hay algo y responde a TODOS los
  // callbacks pendientes. Un resultado vacio no se cachea (permite reintento
  // cuando lleguen los destacados) pero si arranca la ventana anti-martilleo.
  function heroCerrar(arr) {
    var cola = HERO_ESPERA || [];
    var lista = Array.isArray(arr) ? arr : [];
    HERO_ESPERA = null;
    HERO_PIDIDA = false;
    if (lista.length) HERO_CACHE = lista.slice();
    else HERO_ULTIMO = Date.now();
    cola.forEach(function (cb) { heroEntregar(cb, lista.slice()); });
  }

  function cargarHero(cb) {
    if (typeof cb !== 'function') return;
    if (HERO_CACHE && HERO_CACHE.length) { heroEntregar(cb, HERO_CACHE.slice()); return; }
    if (HERO_ESPERA) { HERO_ESPERA.push(cb); return; }
    if (HERO_ULTIMO && (Date.now() - HERO_ULTIMO) < HERO_REINTENTO_MS) {
      // Ya se pregunto hace poco y no habia nada: no se martillea el endpoint.
      heroEntregar(cb, []);
      return;
    }
    HERO_ESPERA = [cb];
    HERO_PIDIDA = true;
    heroPedirModulo();
  }

  // TRAMO 2 (comunidad) + TRAMO 3 (destacados). La logica de comunidad es la
  // de siempre (authHeaders, votos DESC, umbral); lo unico nuevo es que rellena
  // los huecos que deja el modulo y que la entrega pasa por la mezcla.
  function heroPedirComunidad(modulo) {
    var previo = Array.isArray(modulo) ? modulo : [];
    // tipo_media=foto es un parametro EXISTENTE del mismo endpoint (filtra
    // af.foto_type); no abre ninguna ruta nueva ni toca api/.
    var url = '/api/interacciones?tipo=multimedia_mapa&tipo_media=foto&_t=' + Date.now();
    var authHeaders = (window.ExploraCO && typeof window.ExploraCO.authHeaders === 'function')
      ? (window.ExploraCO.authHeaders() || {})
      : {};
    try {
      fetch(url, { headers: authHeaders })
        .then(function (r) { return r.json(); })
        .then(function (d) {
          var filas = (d && d.ok === true && Array.isArray(d.data)) ? d.data : [];
          if (!filas.length) console.warn('[index-api] hero: multimedia_mapa sin filas', (d && d.error) || 'vacio');
          heroCerrar(heroComponerMezcla(previo, heroDesdeComunidad(filas)));
        })
        .catch(function (e) {
          // Red caida: el tramo 2 aporta 0, asi que rellena el respaldo (o el
          // propio modulo si ya traia algo).
          console.warn('[index-api] hero: fallo multimedia_mapa', e && e.message);
          heroCerrar(heroComponerMezcla(previo, []));
        });
    } catch (e) {
      console.warn('[index-api] hero: fetch no disponible', e && e.message);
      heroCerrar(heroComponerMezcla(previo, []));
    }
  }

  // TRAMO 1 en vuelo. Corto-circuito SOLO si el modulo ya llena los 6: en ese
  // caso no se pide comunidad ni se consulta el respaldo. Si aporta menos, se
  // pide comunidad para rellenar; si no aporta nada, el ciclo sigue igual que
  // antes (comunidad -> destacados -> []). Ningun fallo deja el callback sin
  // llamar.
  function heroPedirModulo() {
    try {
      fetch(HERO_MODULO_QS + '&_t=' + Date.now())
        .then(function (r) { return r.json(); })
        .then(function (d) {
          var lista = heroDesdeModulo(d);
          if (lista.length >= HERO_MAX) { heroCerrar(lista); return; }
          if (!lista.length && (!d || d.degradado === true || d.ok !== true)) {
            console.warn('[index-api] hero: modulo manual sin slots', (d && d.error) || 'degradado');
          }
          heroPedirComunidad(lista);
        })
        .catch(function (e) {
          console.warn('[index-api] hero: fallo modulo manual', e && e.message);
          heroPedirComunidad([]);
        });
    } catch (e) {
      console.warn('[index-api] hero: fetch no disponible (modulo)', e && e.message);
      heroPedirComunidad([]);
    }
  }

  // Contrato publico del slideshow del hero: solo la clave cargar.
  window.ExploraCOHero = { cargar: cargarHero };

  // Toggle "Solo mio": delega el estado en el MOTOR (que ademas aplica el
  // gate de sesion) y recarga la capa solo si el valor EFECTIVO cambio.
  window.setMapaMediaSoloMio = function (valor) {
    var MC = motorMedia();
    var want = (valor === true || valor === 'true');
    var antes = filtroMedia().soloMio;
    var eff = want;
    if (MC && typeof MC.setMediaSoloMio === 'function') {
      try { eff = MC.setMediaSoloMio(want) === true; }
      catch (e) { console.warn('[index-api] setMediaSoloMio:', e.message); eff = antes; }
    }
    // El onclick del markup alterna la clase del boton por su cuenta: se
    // repinta con el valor EFECTIVO, para que sin sesion no quede encendido
    // un filtro que nadie puede satisfacer. Se cubren las dos formas del
    // markup: id="mm-solo-mio" (pildora libre) y el item del panel
    // [data-media-scope="mio"].
    var btn = document.getElementById('mm-solo-mio')
      || document.querySelector('[data-media-scope="mio"]');
    if (btn && btn.classList) {
      btn.classList.toggle('on', eff);
      if (btn.hasAttribute('aria-pressed')) btn.setAttribute('aria-pressed', eff ? 'true' : 'false');
    }
    if (eff !== antes) cargarMapaMedia();
    return eff;
  };

  // Conmutador de vista Sueltos/Albumes: lee la vista del MOTOR y la invierte
  // (o aplica la explicita) via setMediaVista; despues recarga la capa. No
  // invierte ningun global propio: el boton se pinta con el valor efectivo.
  window.setMapaMediaVista = function (btn, vista) {
    var MC = motorMedia();
    var pedida = (typeof vista === 'string' && vista)
      ? (vista === 'albumes' ? 'albumes' : 'sueltos') : null;
    var nueva = pedida || (filtroMedia().vista === 'albumes' ? 'sueltos' : 'albumes');
    var eff = nueva;
    if (MC && typeof MC.setMediaVista === 'function') {
      try { eff = MC.setMediaVista(nueva); }
      catch (e) { console.warn('[index-api] setMediaVista:', e.message); }
    }
    if (btn && btn.classList) btn.classList.toggle('on', eff === 'albumes');
    // El motor ya aviso por onFilterChange; la firma evita el doble fetch.
    cargarMapaMedia();
    return eff;
  };

  // Recarga manual de la capa con el estado actual del motor.
  window.refreshMapaMedia = function () {
    cargarMapaMedia(true);
  };

  function loadAndRender() {
    fetchAndUpdate('');
  }

  // \u2500\u2500 INIT \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  function init() {
    loadAndRender();
    setupSearch();
    // Hook para que el index restaure el PL completo al limpiar la
    // b\u00fasqueda (los clear del hero/directorio no disparan 'input').
    window.ExploraReloadDestinos = loadAndRender;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(init, 200); });
  } else {
    setTimeout(init, 200);
  }

}());
