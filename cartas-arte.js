// cartas-arte.js
// Capa de ARTE del mercado de cartas: resuelve QUE lamina corresponde a una clave
// y pinta el HUECO cuando no hay lamina. No pinta la carta completa (eso es
// cartas-ui.js): se mantiene aparte para que el silo CSS .cartas-silo no dependa
// de datos del catalogo y para poder sustituir el arte sin tocar el render.
//
// ASCII-safe (ADR-002): 0 bytes > 127, 0 backticks, tildes como \uXXXX.
// Vanilla JS (ADR-001), sin dependencias, CommonJS-compatible al final.
'use strict';

(function () {
  var raiz = (typeof window !== 'undefined' && window) ? window : null;

  // RATIO fijo 1086x1448 == 0.75. Las laminas maestras y sus copias en
  // assets/cartas/ comparten ese tamano exacto, asi el hueco reserva alto y ancho
  // sin reflow: evita CLS cuando la imagen carga en una lista larga del mercado.
  var RATIO = 1086 / 1448;

  // Rutas relativas a la raiz del sitio: las paginas que enlazan el silo
  // (comunidad.html, mi-perfil.html, perfil.html) viven en la raiz.
  // Son COPIAS renombradas por clave de cartas/jpg/: los maestros de cartas/
  // quedan fuera del deploy via .vercelignore.
  var ARTE = {
    consumible_catalejo_explorador: 'assets/cartas/consumible_catalejo_explorador.png',
    consumible_pluma_creador: 'assets/cartas/consumible_pluma_creador.png',
    consumible_lupa_curador: 'assets/cartas/consumible_lupa_curador.png',
    consumible_lente_artista: 'assets/cartas/consumible_lente_artista.png',
    'marca:ancestral': 'assets/cartas/marca_ancestral.png'
  };

  // EDITORIAL duplica numero/tipo/familia que YA estan horneados dentro del PNG.
  // El HTML no los repite cuando hay arte (el alt los describe), pero el hueco
  // vacio, los filtros y el inventario de faltantes necesitan el dato sin abrir
  // la imagen. numero null = sin numero editorial asignado.
  var EDITORIAL = {
    consumible_catalejo_explorador: { numero: 1, tipo: 'HERRAMIENTA', familia: 'C' },
    consumible_pluma_creador: { numero: 2, tipo: 'HERRAMIENTA', familia: 'C' },
    consumible_lupa_curador: { numero: 3, tipo: 'HERRAMIENTA', familia: 'C' },
    consumible_lente_artista: { numero: 4, tipo: 'HERRAMIENTA', familia: 'C' },
    'marca:ancestral': { numero: 5, tipo: 'MARCA', familia: 'M' }
  };

  var FALLBACK = { numero: null, tipo: 'CARTA', familia: 'C' };

  var MAPA_ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

  // Esc local identico a CartasUI.esc: si cartas-ui.js ya cargo se reutiliza
  // (una sola fuente de escape), si no, este modulo sigue siendo seguro solo.
  function esc(s) {
    if (s === null || s === undefined) return '';
    var ui = raiz ? raiz.CartasUI : null;
    if (ui && typeof ui.esc === 'function') return ui.esc(String(s));
    return String(s).replace(/[&<>"']/g, function (c) { return MAPA_ESC[c]; });
  }

  // slug: normaliza el nombre comercial de una marca a la clave de arte.
  // Sin normalize('NFD') para no depender de Unicode extendido en el cliente:
  // las vocales acentuadas se mapean con escapes ASCII-safe.
  function slug(s) {
    if (s === null || s === undefined) return '';
    var t = String(s).toLowerCase();
    t = t.replace(/[\u00e1\u00e0\u00e4\u00e2]/g, 'a')
         .replace(/[\u00e9\u00e8\u00eb\u00ea]/g, 'e')
         .replace(/[\u00ed\u00ec\u00ef\u00ee]/g, 'i')
         .replace(/[\u00f3\u00f2\u00f6\u00f4]/g, 'o')
         .replace(/[\u00fa\u00f9\u00fc\u00fb]/g, 'u')
         .replace(/\u00f1/g, 'n');
    t = t.replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    return t;
  }

  // claveDe: resuelve la clave de arte por las dos vias del catalogo:
  // consumible (clave directa) y marca (prefijo marca: + slug del nombre).
  function claveDe(opts) {
    if (!opts) return '';
    if (opts.clave !== null && opts.clave !== undefined && opts.clave !== '') {
      return String(opts.clave);
    }
    if (opts.marca !== null && opts.marca !== undefined && opts.marca !== '') {
      return 'marca:' + slug(opts.marca);
    }
    return '';
  }

  // arteDe: prioridad explicita -> clave -> marca -> sin arte.
  // imagenUrl gana porque permite arte subido por el usuario sin tocar el mapa.
  // Devuelve null si no hay nada: el llamador decide si pinta hueco.
  function arteDe(opts) {
    if (!opts) return null;
    var clave = claveDe(opts);
    var archivo = '';
    if (opts.imagenUrl !== null && opts.imagenUrl !== undefined && opts.imagenUrl !== '') {
      archivo = String(opts.imagenUrl);
    } else if (clave && Object.prototype.hasOwnProperty.call(ARTE, clave)) {
      archivo = ARTE[clave];
    }
    if (!archivo) return null;
    var ed = (clave && Object.prototype.hasOwnProperty.call(EDITORIAL, clave))
      ? EDITORIAL[clave] : FALLBACK;
    return {
      archivo: archivo,
      tipo: ed.tipo,
      familia: ed.familia,
      numero: ed.numero
    };
  }

  // slotHtml: devuelve SOLO el hueco de arte de la carta. Nunca lanza y nunca
  // devuelve null: un hueco vacio siempre se puede pintar, la lista no se rompe.
  function slotHtml(opts) {
    var o = opts || {};
    var arte = arteDe(o);
    var nombre = (o.nombre !== null && o.nombre !== undefined && o.nombre !== '')
      ? String(o.nombre) : claveDe(o);
    var xp = (o.xp !== null && o.xp !== undefined && o.xp !== '') ? String(o.xp) : '';

    if (arte) {
      // alt describe lo que la lamina ya dice (nombre + XP): el texto del PNG no
      // es accesible para lectores de pantalla ni buscadores.
      var alt = xp ? (nombre + ' - ' + xp + ' XP') : nombre;
      return '<div class="c-card-arte">'
        + '<img class="c-card-img" src="' + esc(arte.archivo) + '"'
        + ' alt="' + esc(alt) + '"'
        + ' width="1086" height="1448" loading="lazy" decoding="async"'
        + ' onerror="this.remove()"></div>';
    }

    // Hueco vacio: familia M solo cuando la clave es de marca (el tipo MARCA
    // define el marco morado del silo). numero se omite si no hay dato.
    var familia = (o.familia !== null && o.familia !== undefined && o.familia !== '')
      ? String(o.familia)
      : (claveDe(o).indexOf('marca:') === 0 ? 'M' : 'C');
    var tipo = (o.tipo !== null && o.tipo !== undefined && o.tipo !== '')
      ? String(o.tipo) : 'CARTA';
    var numero = (o.numero !== null && o.numero !== undefined && o.numero !== '')
      ? String(o.numero) : '';
    var clases = 'c-card-arte c-card-arte--vacia';
    if (familia === 'M') clases += ' c-card-arte--marca';

    var html = '<div class="' + clases + '">'
      + '<span class="c-card-fam">' + esc(familia) + '</span>'
      + '<span class="c-card-tipo">' + esc(tipo) + '</span>';
    if (numero) html += '<span class="c-card-num">#' + esc(numero) + '</span>';
    html += '<div class="c-card-ph-n">' + esc(nombre) + '</div>';
    if (xp) html += '<div class="c-card-ph-x">' + esc(xp) + ' XP</div>';
    // "Diseno pendiente" va sin tilde a proposito: ASCII puro en el DOM tambien
    // para que el texto no dependa del charset del script que lo inyecta.
    html += '<span class="c-card-ph-tag">Diseno pendiente</span></div>';
    return html;
  }

  // faltantes: claves del inventario SIN lamina, para medir la deuda de arte.
  // Tolerante a null y a claves repetidas; mantiene el orden de entrada.
  function faltantes(lista) {
    var out = [];
    if (!lista || typeof lista.length !== 'number') return out;
    for (var i = 0; i < lista.length; i++) {
      var k = lista[i];
      if (k === null || k === undefined || k === '') continue;
      if (arteDe({ clave: k }) === null) out.push(k);
    }
    return out;
  }

  var API = {
    RATIO: RATIO,
    ARTE: ARTE,
    EDITORIAL: EDITORIAL,
    esc: esc,
    slug: slug,
    arteDe: arteDe,
    slotHtml: slotHtml,
    faltantes: faltantes
  };

  if (raiz) raiz.CartasArte = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})();
