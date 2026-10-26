/* media-embed.js -- Modulo compartido de resolucion de URLs de media (ExploraCO).
 *
 * Regla de No-Duplicidad: mi-perfil.html, galeria.html y comunidad.html cargan
 * este modulo y delegan en window.ExploraMediaEmbed; mapa-cultural.js tambien
 * delega en el, pero solo si esta presente (degrada a null si no lo esta).
 *
 * Alcance del soporte:
 *   - YouTube  (youtube.com/watch?v=..., youtu.be/..., youtube.com/shorts/...,
 *               youtube.com/embed/...)
 *   - Vimeo    (vimeo.com/<id numerico>)
 *   - Spotify  SOLO tipo "track" (episode, album, playlist y show NO se soportan)
 *   - directo  (.mp3 .m4a .aac .wav .ogg .opus .mp4 .webm .mov .m4v)
 *
 * ASCII-safety (ADR-002): 0 bytes > 127 en todo el archivo. Sin acentos, sin
 * em dash, sin comillas tipograficas. Si necesitas un caracter, usa \uXXXX.
 *
 * ES5 puro: sin const/let, sin arrow functions, sin template literals.
 * No hace fetch ni peticiones de red: la caratula de Spotify se resuelve en el
 * navegador llamando a spotifyOembedUrl(url) y haciendo el GET ahi.
 *
 * Caratula DERIVADA (v2): si un item de YouTube no trae imagen de muestra, o
 * trae como miniatura algo que NO es pintable en un <img> (un medio directo o
 * una URL de servicio de embed), la caratula NO es obligatoria: se deriva del
 * link con youtubeThumb(url), que es una URL de imagen determinista (sin fetch,
 * sin clave de API). mediaDe() la usa cuando kind === 'youtube'. Vimeo y los
 * medios directos (.mp3/.mp4) sin miniatura pintable se quedan con el
 * placeholder del consumidor: para ellos no hay derivada.
 *
 * Uso:  <script src="media-embed.js?v=3"></script>
 */
(function (global) {
  'use strict';

  /* Guarda de idempotencia: si el script se carga dos veces (distinto ?v=, o
     doble inclusion), no se reasigna nada y no se pisan las referencias ya
     capturadas por los consumidores. */
  if (global.ExploraMediaEmbed) { return; }

  var API = {};

  /* ---------------------------------------------------------------------
     Constantes
     --------------------------------------------------------------------- */

  /* Alturas recomendadas (px) del iframe de Spotify. Spotify compacta la
     caratula a 300px de ancho; 152px es la altura oficial del embed de una
     pista y 232px da aire para el reproductor con controles visibles. */
  API.ALTURA_SPOTIFY_COMPACTA = 152;
  API.ALTURA_SPOTIFY_ANCHA = 232;

  var YOUTUBE_EMBED = 'https://www.youtube.com/embed/';
  /* Endpoint publico de thumbnails de YouTube: /vi/<ID>/<nombre>.jpg.
     hqdefault (480x360) existe para todo video publico subido, a diferencia de
     maxresdefault, que solo esta si el autor subio el video en HD. */
  var YOUTUBE_THUMB = 'https://img.youtube.com/vi/';
  var VIMEO_EMBED = 'https://player.vimeo.com/video/';
  var SPOTIFY_EMBED = 'https://open.spotify.com/embed/track/';
  var SPOTIFY_OEMBED = 'https://open.spotify.com/oembed?url=';

  /* Extension servible (audio o video) que se reproduce con <audio>/<video>.
     Se acepta cola de query o fragmento tras la extension. */
  var RE_DIRECTA = /\.(mp3|m4a|aac|wav|ogg|opus|mp4|webm|mov|m4v)(?:[?#].*)?$/i;

  /* Id de Spotify: exactamente 22 caracteres base62 [A-Za-z0-9].
     Si no cumple exactamente, se devuelve null (no se adivina ni se recorta). */
  var RE_SPOTIFY_ID = /^[A-Za-z0-9]{22}$/;

  /* Web: https://open.spotify.com/track/<ID> y sus variantes de locale
     (intl-es, intl-pt, ...) y de dominio (.us). Solo la ruta /track/.
     Anclado al inicio para que un host malicioso que empuje la URL de Spotify
     como parametro no colise. El tipo (track) va explicito, por eso un
     /episode/, /album/, /playlist/ o /show/ NO matchea y retorna null. */
  var RE_SPOTIFY_WEB = /^https?:\/\/open\.spotify\.(?:com|us)\/(?:intl-[A-Za-z]{2,5}\/)?track\/([A-Za-z0-9]{22})(?:[?#].*)?$/i;

  /* URI de Spotify: spotify:track:<ID> (sin https). */
  var RE_SPOTIFY_URI = /^spotify:track:([A-Za-z0-9]{22})(?:[?#].*)?$/i;

  /* YouTube: se conserva {6,} (era el umbral de galeria.html y comunidad.html).
     Mapa cultural usaba {11}; {6,} es un superconjunto, es decir solo puede
     resolver mas URLs, nunca menos: no rompe ninguna de las dos variantes. */
  var RE_YOUTUBE_WATCH = /youtube\.com\/watch\?v=([\w-]{6,})/i;
  var RE_YOUTUBE_SHORT = /youtu\.be\/([\w-]{6,})/i;
  /* YouTube Shorts: https://www.youtube.com/shorts/<ID> (y variantes m./www.).
     Mismo umbral {6,} que watch y youtu.be para no inventar ids cortos. */
  var RE_YOUTUBE_SHORTS = /youtube\.com\/shorts\/([\w-]{6,})/i;
  /* YouTube embed: https://www.youtube.com/embed/<ID> (src de un iframe ya
     montado). No es una imagen: reconocerlo aqui es lo que permite que el
     filtro de caratula lo DESCARTE y que youtubeThumb derive del id. */
  var RE_YOUTUBE_EMBED = /youtube\.com\/embed\/([\w-]{6,})/i;
  var RE_VIMEO = /vimeo\.com\/(\d+)/i;

  /* ---------------------------------------------------------------------
     Helpers internos
     --------------------------------------------------------------------- */

  /* Normaliza a string limpio (recorta espacios y no-break spaces).
     Acepta null/undefined/numeros sin lanzar. */
  function norm(url) {
    if (typeof url !== 'string') { return ''; }
    return url.replace(/^[\s\xA0]+/, '').replace(/[\s\xA0]+$/, '');
  }

  /* Devuelve el grupo 1 si el id cumple la forma de Spotify, o null. */
  function validaIdSpotify(candidato) {
    if (!candidato) { return null; }
    return RE_SPOTIFY_ID.test(candidato) ? candidato : null;
  }

  /* ---------------------------------------------------------------------
     API publica: extractores de id
     --------------------------------------------------------------------- */

  /* Id de YouTube (watch?v=, youtu.be/, shorts/ o embed/). Id valido o null. */
  API.youtubeId = function (url) {
    var s = norm(url);
    if (!s) { return null; }
    var m = RE_YOUTUBE_WATCH.exec(s);
    if (m) { return m[1]; }
    m = RE_YOUTUBE_SHORT.exec(s);
    if (m) { return m[1]; }
    m = RE_YOUTUBE_SHORTS.exec(s);
    if (m) { return m[1]; }
    m = RE_YOUTUBE_EMBED.exec(s);
    if (m) { return m[1]; }
    return null;
  };

  /* Caratula determinista de un video de YouTube (hqdefault). No hace fetch:
     la URL se deriva del id y el navegador la cachea como cualquier imagen.
     Defensiva: null/undefined/no-string o URL que no es de YouTube -> ''.
     Nunca devuelve null, para que el llamador pueda asignarla a un <img> sin
     guardas adicionales. */
  API.youtubeThumb = function (url) {
    var id = API.youtubeId(url);
    if (!id) { return ''; }
    return YOUTUBE_THUMB + id + '/hqdefault.jpg';
  };

  /* Id numerico de Vimeo. Id valido o null. */
  API.vimeoId = function (url) {
    var s = norm(url);
    if (!s) { return null; }
    var m = RE_VIMEO.exec(s);
    return m ? m[1] : null;
  };

  /* Id de Spotify de tipo "track" (22 chars base62), o null.
     Rechaza episode, album, playlist, show, hosts ajenos y cualquier id
     que no mida exactamente 22 caracteres. */
  API.spotifyTrackId = function (url) {
    var s = norm(url);
    if (!s) { return null; }
    var m = RE_SPOTIFY_WEB.exec(s);
    if (m) { return validaIdSpotify(m[1]); }
    m = RE_SPOTIFY_URI.exec(s);
    if (m) { return validaIdSpotify(m[1]); }
    return null;
  };

  /* URL del endpoint publico oEmbed de Spotify, lista para que el llamador
     haga el fetch en el navegador. Devuelve null si la URL no es un track.
     Respuesta: JSON con thumbnail_url = caratula del track. */
  API.spotifyOembedUrl = function (url) {
    var id = API.spotifyTrackId(url);
    if (!id) { return null; }
    return SPOTIFY_OEMBED + encodeURIComponent('https://open.spotify.com/track/' + id);
  };

  /* ---------------------------------------------------------------------
     API publica: resolucion
     --------------------------------------------------------------------- */

  /* URL de embed de YouTube, Vimeo o Spotify, o null si no aplica.
     Prioridad: YouTube > Vimeo > Spotify. */
  API.embedUrl = function (url) {
    var s = norm(url);
    if (!s) { return null; }

    var yid = API.youtubeId(s);
    if (yid) { return YOUTUBE_EMBED + yid; }

    var vid = API.vimeoId(s);
    if (vid) { return VIMEO_EMBED + vid; }

    var sid = API.spotifyTrackId(s);
    if (sid) { return SPOTIFY_EMBED + sid; }

    return null;
  };

  /* Clasifica la URL para que el llamador decida el render.
     'youtube' | 'vimeo' | 'spotify' | 'directo' | null */
  API.kind = function (url) {
    var s = norm(url);
    if (!s) { return null; }
    if (API.youtubeId(s)) { return 'youtube'; }
    if (API.vimeoId(s)) { return 'vimeo'; }
    if (API.spotifyTrackId(s)) { return 'spotify'; }
    if (API.isDirectMedia(s)) { return 'directo'; }
    return null;
  };

  /* true si la URL termina en una extension de audio/video servible. */
  API.isDirectMedia = function (url) {
    var s = norm(url);
    if (!s) { return false; }
    return RE_DIRECTA.test(s);
  };

  /* ---------------------------------------------------------------------
     API publica: normalizacion de un item de media
     --------------------------------------------------------------------- */

  /* Extension de audio servible. SOLO se usa para derivar el tipo cuando el
     backend no manda media_type/foto_type (kind === 'directo' ya garantiza
     que la URL es un medio servible). */
  var EXT_AUDIO = /\.(mp3|m4a|aac|wav|ogg|opus)(?:[?#].*)?$/i;

  /* mediaDe(item): NORMALIZA un objeto de media del backend a la forma que
     consumen los renderizadores. Concentra aqui el criterio de ALIAS de la
     miniatura para que galeria.html y comunidad.html no lo dupliquen (y no
     diverjan entre si):
       url       <- media_url | url | foto_url
       tipo      <- media_type | foto_type; si falta, se deriva de la URL
       miniatura <- miniatura_url | media_miniatura   (CRUDO, tal cual llega)
       caratula  <- la miniatura SOLO si es utilizable en un <img>/poster;
                    si falta, o si lo que llega NO es pintable (un medio
                    .mp3/.mp4 o una URL de servicio de embed Spotify/YouTube/
                    Vimeo), y el item es de YouTube, la caratula DERIVADA del
                    link (youtubeThumb); para cualquier otro caso no pintable
                    queda '' y el consumidor cae a su placeholder.
                    Invariante critica: NUNCA un <img> (ni un poster)
                    apuntando a algo que no sea una imagen.
       kind      <- youtube | vimeo | spotify | directo | null
     Es defensivo: acepta null/undefined/no-objeto y devuelve strings vacios,
     nunca lanza. Si el consumidor la envuelve en un try/catch no hace nada. */
  API.mediaDe = function (item) {
    var o = (item && typeof item === 'object') ? item : {};
    var url = norm(o.media_url) || norm(o.url) || norm(o.foto_url);
    var kind = API.kind(url);
    var tipo = norm(o.media_type) || norm(o.foto_type);
    if (tipo) {
      tipo = tipo.toLowerCase();
    } else if (kind === 'spotify') {
      tipo = 'audio';
    } else if (kind === 'youtube' || kind === 'vimeo') {
      tipo = 'video';
    } else if (kind === 'directo') {
      tipo = EXT_AUDIO.test(url) ? 'audio' : 'video';
    } else {
      tipo = 'foto';
    }
    var miniatura = norm(o.miniatura_url) || norm(o.media_miniatura);
    /* La miniatura es OPCIONAL, y ademas puede llegar como algo que no es una
       imagen: alguien pega la URL del video en el campo de miniatura. En ese
       caso NO se descarta el item: si el recurso es de YouTube se recupera la
       caratula DERIVADA del link, youtubeThumb es una URL de imagen real
       (img.youtube.com/vi/<ID>/hqdefault.jpg). Para Vimeo y para los medios
       directos sin miniatura pintable no hay derivada: el consumidor pinta su
       placeholder. */
    var candidata = (miniatura && !API.isDirectMedia(miniatura) && !API.kind(miniatura)) ? miniatura : '';
    if (!candidata && kind === 'youtube') { candidata = API.youtubeThumb(url); }
    /* caratula SOLO si la URL es claramente una imagen. kind() descarta a la
       vez los medios directos (.mp3/.mp4/...) y las URLs de servicio de embed
       (Spotify/YouTube/Vimeo), que tampoco son pintables en un <img>. Asi la
       invariante "un <img> NUNCA apunta a algo que no sea una imagen" queda
       garantizada aqui y no en cada consumidor. */
    return {
      url: url,
      tipo: tipo,
      kind: kind,
      esMedio: !!kind,
      miniatura: miniatura,
      caratula: (candidata && !API.isDirectMedia(candidata) && !API.kind(candidata)) ? candidata : ''
    };
  };

  /* ---------------------------------------------------------------------
     API publica: fragmento de render compartido
     --------------------------------------------------------------------- */

  /* Rango de alto aceptado para el iframe de Spotify. Cualquier alto fuera de
     rango, o que no sea un entero, cae a ALTURA_SPOTIFY_COMPACTA. */
  var ALTO_MIN_SPOTIFY = 40;
  var ALTO_MAX_SPOTIFY = 800;

  /* Alto a entero SEGURO.
     POR QUE se valida: el parametro 'alto' se interpola CRUDO en el atributo
     height="..." y dentro del style="...height:Npx" de un <iframe>. Este
     modulo esta exportado en 'window' como asset compartido, asi que cualquier
     consumidor futuro que le pase un valor derivado de datos (un parametro de
     URL, un campo de la BD) convertiria ese sink en inyeccion de atributos y
     de marcado: p.ej. 1" onload="alert(1) inyecta un atributo onload, y
     100;}</style><script>alert(1)</script> inyecta un <script>. Hoy los tres
     consumidores pasan constantes, pero la defensa va DENTRO del modulo, no
     en el call-site, para que no dependa de que todos lo hagan bien.
     parseInt recorta a la parte entera, asi que cualquier sufijo malicioso se
     descarta antes de concatenar; isFinite descarta NaN; el rango descarta
     negativos, cero y alturas absurdas. Solo sale un entero del rango. */
  function altoSeguro(alto) {
    var h = parseInt(alto, 10);
    if (!isFinite(h)) { return API.ALTURA_SPOTIFY_COMPACTA; }
    if (h < ALTO_MIN_SPOTIFY || h > ALTO_MAX_SPOTIFY) { return API.ALTURA_SPOTIFY_COMPACTA; }
    return h;
  }

  /* Solo el <iframe> de Spotify, ya con allow="encrypted-media" y
     loading="lazy", para que los tres consumidores no dupliquen ese markup.
     'alto' en px: se VALIDA (ver altoSeguro) y por defecto queda
     ALTURA_SPOTIFY_COMPACTA si no es un entero dentro de [40, 800].
     'clase' es opcional y se sanitiza a [A-Za-z0-9 _-] antes de inyectarse
     (mapa-cultural.js pasa 'md-lb-media', su clase de lightbox).
     Devuelve el string del iframe, o null si la URL no es un track.
     El src se arma desde un id base62 validado, asi que no necesita escape. */
  API.spotifyEmbedIframe = function (url, alto, clase) {
    var id = API.spotifyTrackId(url);
    if (!id) { return null; }
    var h = altoSeguro(alto);
    var cls = '';
    if (typeof clase === 'string' && /^[A-Za-z0-9 _-]{1,120}$/.test(clase)) {
      cls = ' class="' + clase + '"';
    }
    return '<iframe' + cls + ' src="' + SPOTIFY_EMBED + id + '"'
      + ' width="100%" height="' + h + '"'
      + ' style="border:0;display:block;width:100%;height:' + h + 'px"'
      + ' allow="encrypted-media" loading="lazy"></iframe>';
  };

  /* ---------------------------------------------------------------------
     Publicacion
     --------------------------------------------------------------------- */
  global.ExploraMediaEmbed = API;

}(typeof window !== 'undefined' ? window : this));
