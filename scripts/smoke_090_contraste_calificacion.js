// scripts/smoke_090_contraste_calificacion.js
//
// Smoke ESTATICO de regresion del widget de calificacion de media (estrellas 1-5
// de media-actions.js) en los TRES silos CSS: galeria.html, comunidad.html y
// mi-perfil.html.
//
// Motivo: el fallo era INVISIBLE para el Escudo GOLD (que es estatico:
// sintaxis, ASCII y balance de divs) porque solo se manifiestaba al RENDERIZAR.
// El estado "sin nota" multiplicaba opacidades en dos pisos:
//     .ma-estrellas.is-empty{opacity:.62}  x  ... .ma-estrella{opacity:.2}
// daba alfa efectivo 0.077-0.102 y contraste 1.1-1.3:1 sobre --black #0F1419.
// Ademas .ma-estrella declaraba cursor:default, anulando el cursor:pointer del
// contenedor. Este smoke relee los silos REALES y vuelve a medirlo en cada
// ejecucion, para que la regresion no pueda volver a colarse.
//
// 7 checks: doble piso de opacidad, alfa efectivo, cursor, contraste en REPOSO,
// aislamiento atomico, consistencia entre silos y contraste en HOVER.
//
// El contraste se mide en los DOS estados (reposo y hover) y por la misma via:
// una sola medicion (mideContraste) y una sola cascada (resuelve), de modo que
// los dos estados no puedan divergir por tener cada uno su propia formula.
// El hover importa aparte porque un alfa legal puede aun asi dar contraste
// bajo en la superficie cuyo color heredado es mas apagado: el check 2 (alfa
// >= 0.70) no lo ve, el 7 si.
//
// 100% LOCAL: sin red, sin DB, sin fetch. Solo fs + regex + aritmetica WCAG.
// ASCII-safe (ADR-002): 0 bytes > 127, 0 backticks, escapes \uXXXX simples.
// CommonJS estricto (BUG-001).
//
// USO: node scripts/smoke_090_contraste_calificacion.js
//      SMOKE_DUMP=1 node scripts/smoke_090_contraste_calificacion.js
'use strict';

var path = require('path');
var fs = require('fs');

var RAIZ = path.join(__dirname, '..');

var passed = 0;
var failed = 0;
function check(label, cond, detalle) {
  if (cond) { passed++; console.log('PASS - ' + label + (detalle ? '  [' + detalle + ']' : '')); }
  else { failed++; console.log('FAIL - ' + label + (detalle ? '  [' + detalle + ']' : '')); process.exitCode = 1; }
}

// =====================================================================
// 0. Configuracion de los 3 silos.
//    El SELECTOR del contenedor NO es un dato inventado: es el que cada
//    pagina emite de verdad junto a data-ma-voto (g-act en galeria,
//    av-act en comunidad, pf-museo-btn ghost en mi-perfil). El COLOR lo
//    lee el smoke del archivo, nunca se hardcodea.
// =====================================================================
var SILOS = [
  { nombre: 'galeria',   archivo: 'galeria.html',   contenedor: '.g-act' },
  { nombre: 'comunidad', archivo: 'comunidad.html', contenedor: '.av-act' },
  { nombre: 'mi-perfil', archivo: 'mi-perfil.html', contenedor: '.pf-museo-btn.ghost' }
];

var PISO_ALFA = 0.70;       // alfa efectivo minimo del glifo sin nota
var PISO_CONTRASTE = 4.5;   // WCAG AA para texto pequeno

// =====================================================================
// 1. Lectura y aislamiento del silo CSS.
// =====================================================================
function leer(rel) { return fs.readFileSync(path.join(RAIZ, rel), 'utf8'); }

// Quita comentarios /* ... */: un comentario no es CSS y aqui ensuciaria
// tanto el parseo (puede traer llaves) como los conteos de variables.
// SUSTITUYE cada caracter del comentario por un espacio y CONSERVA los saltos
// de linea. Importa: la cascada se desempata por linea de fuente, luego si
// esto comprimiera lineas los numeros serian falsos y el hover volveria a
// leerse mal. No se puede borrar de raiz porque el marcador del silo esta
// dentro de un comentario.
function sinComentarios(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, function(m) {
    return m.replace(/[^\n]/g, ' ');
  });
}

// Extrae el bloque del silo del widget: desde el marcador de la cabecera
// hasta el cierre del <style> que lo contiene.
// El marcador VIVE dentro de un comentario, luego la busqueda va sobre el
// fuente CRUDO; los comentarios se quitan despues, ya para parsear.
function siloDe(src) {
  var marca = src.indexOf('SILO MEDIA-ACTIONS');
  if (marca === -1) return null;
  var ini = src.lastIndexOf('/* =====', marca);
  if (ini === -1) ini = marca;
  var fin = src.indexOf('</style>', ini);
  if (fin === -1) fin = src.length;
  return { ini: ini, fin: fin, texto: src.slice(ini, fin) };
}

// Los 3 planos de la cadena del glifo en estado "sin nota":
//   [data-ma-voto] -> .ma-estrellas.is-empty -> .ma-estrella (ni is-on ni is-preview)
function cadenaVacia(hover) {
  return [
    { classes: hover ? ['is-hover'] : [], attrs: { 'data-ma-voto': true }, pseudo: hover ? ['hover'] : [] },
    { classes: ['ma-estrellas', 'is-empty'], attrs: {}, pseudo: [] },
    { classes: ['ma-estrella'], attrs: {}, pseudo: [] }
  ];
}

// =====================================================================
// 2. Parser de CSS. Aplanador de @media/@keyframes + cascada con
//    especificidad y orden, para resolver un valor REAL y no leerlo a ojo.
// =====================================================================
// Mapa de lineas: lineaMap[k] = indice del caracter donde empieza la linea k
// dentro del texto que se pasa al parser. Permite traducir el desplazamiento
// de una regla a su NUMERO DE LINEA REAL, que es lo que desempata la cascada.
function lineaMap(txt) {
  var m = [0], i;
  for (i = 0; i < txt.length; i++) if (txt.charAt(i) === '\n') m.push(i + 1);
  return m;
}

// base: desplazamiento de css[0] respecto al texto del silo completo.
// lmap y lbase: mapa de lineas y linea inicial ABSOLUTA del silo en el archivo.
function parseCss(css, media, out, base, lmap, lbase) {
  base = base || 0;
  lbase = lbase || 1;
  var i = 0, n = css.length;
  while (i < n) {
    while (i < n && /\s/.test(css[i])) i++;
    if (i >= n) break;
    var ini = i, llave = -1;
    while (i < n) {
      if (css[i] === '{') { llave = i; break; }
      if (css[i] === ';') { i++; break; }
      i++;
    }
    var prel = css.slice(ini, llave === -1 ? i : llave).trim();
    if (llave === -1) continue;
    var d = 0, j = llave;
    for (; j < n; j++) {
      if (css[j] === '{') d++;
      else if (css[j] === '}') { d--; if (d === 0) break; }
    }
    var cuerpo = css.slice(llave + 1, j);
    var linea = lmap ? (lbase + posicionLinea(lmap, base + ini)) : (lbase + i);
    if (prel.indexOf('@keyframes') === 0) {
      // El contenido de un keyframe NO es un selector: se ignora a proposito.
    } else if (prel.charAt(0) === '@') {
      parseCss(cuerpo, (media ? media + ' && ' : '') + prel, out, base + llave + 1, lmap, lbase);
    } else if (prel) {
      out.push({
        sel: prel.split(',').map(function(s) { return s.trim(); }).filter(Boolean),
        decls: parseDecls(cuerpo),
        media: media || '',
        orden: out.length,
        linea: linea
      });
    }
    i = j + 1;
  }
  return out;
}

function posicionLinea(lmap, pos) {
  var lo = 0, hi = lmap.length - 1, mid;
  while (lo < hi) {
    mid = Math.ceil((lo + hi) / 2);
    if (lmap[mid] <= pos) lo = mid; else hi = mid - 1;
  }
  return lo;
}

function parseDecls(cuerpo) {
  var d = {}, partes = cuerpo.split(';'), i, p, c, k;
  for (i = 0; i < partes.length; i++) {
    p = partes[i]; c = p.indexOf(':');
    if (c === -1) continue;
    k = p.slice(0, c).trim().toLowerCase();
    if (!k) continue;
    d[k] = p.slice(c + 1).trim().replace(/\s+/g, ' ');
  }
  return d;
}

// Separa los :not(...) del resto del selector: sus argumentos SI aportan
// especificidad, pero su resultado se aplica al elemento NEGADO.
function splitNots(sel) {
  var nots = [];
  var base = sel.replace(/:not\(([^()]*)\)/g, function(m, inner) { nots.push(inner); return ' '; });
  return { base: base, nots: nots };
}

function tokensFrag(frag) {
  var cls = [], at = [], ps = [], m;
  var rc = /\.(-?[A-Za-z0-9_-]+)/g;
  while ((m = rc.exec(frag)) !== null) cls.push(m[1]);
  var ra = /\[([^\]]+)\]/g;
  while ((m = ra.exec(frag)) !== null) at.push(m[0].slice(1, -1).trim());
  var rp = /::?-?([A-Za-z][A-Za-z0-9_-]*)/g;
  var limpio = frag.replace(/:not\([^()]*\)/g, ' ');
  while ((m = rp.exec(limpio)) !== null) ps.push(m[1].toLowerCase());
  return { cls: cls, at: at, ps: ps };
}

function subConj(frag, el) {
  var t = tokensFrag(frag), i;
  for (i = 0; i < t.cls.length; i++) if (el.classes.indexOf(t.cls[i]) === -1) return false;
  for (i = 0; i < t.at.length; i++) if (!el.attrs[t.at[i]]) return false;
  for (i = 0; i < t.ps.length; i++) if (el.pseudo.indexOf(t.ps[i]) === -1) return false;
  return true;
}

function compoundMatch(comp, el) {
  var sp = splitNots(comp), i;
  if (!subConj(sp.base, el)) return false;
  for (i = 0; i < sp.nots.length; i++) if (subConj(sp.nots[i], el)) return false;
  return true;
}

// Simplificacion DELIBERADA y suficiente para este silo: todos sus selectores
// son cadenas de descendientes ([data-ma-voto] A B C), luego el emparejamiento
// es "las partes del selector son una subsecuencia de la cadena del elemento".
function selectorMatch(sel, cadena) {
  var partes = sel.trim().split(/[\s>+~]+/).filter(Boolean), pi = 0, ci;
  for (ci = 0; ci < cadena.length && pi < partes.length; ci++) {
    if (compoundMatch(partes[pi], cadena[ci])) pi++;
  }
  return pi === partes.length;
}

// Especificidad CSS real: (atributos, clases+pseudo-clases, tipos).
//
// Las PSEUDO-CLASAS pesan EXACTAMENTE lo mismo que una clase y van en la misma
// columna. Omitirlas era un defecto real de este smoke: la regla del piso
// (.ma-estrellas.is-empty .ma-estrella:not(.is-on):not(.is-preview)) y la de
// hover (:hover ... :not(.is-preview)) empatan en (1,5,0), pero al no contar
// :hover el piso salia como (1,5,0) y el hover como (1,4,0), luego el piso
// ganaba SIEMPRE y el valor de hover jamas se leia.
//
// :not() es un selector FUNCIONAL: el no cuenta como pseudo-clase, y lo que
// suma es la especificidad de lo que contiene su argumento. splitNots() ya
// separa esos argumentos en sp.nots y los recorre por separado, asi que basta
// con no contarlos dos veces: se recorren todos los fragmentos, pero el
// :not() en si ya no esta en sp.base (se sustituyo por un espacio).
//
// Los pseudo-ELEMENTOS (::before) NO son pseudo-clases: valen 1 en la columna
// de tipos, asi que se separan antes de contar.
function especificidad(sel) {
  var sp = splitNots(sel), todos = [sp.base].concat(sp.nots);
  var a = 0, b = 0, c = 0, i, frag;
  for (i = 0; i < todos.length; i++) {
    frag = todos[i];
    a += (frag.match(/\[[^\]]+\]/g) || []).length;
    b += (frag.match(/\.[A-Za-z0-9_-]+/g) || []).length;
    // Pseudo-clases: ':' seguido de nombre. Los de doble ':' son
    // pseudo-elementos y van a la columna de tipos, asi que se apartan antes.
    var sinPE = frag.replace(/::[A-Za-z-]+/g, ' ');
    b += (sinPE.match(/:[A-Za-z-]+/g) || []).length;
    c += (frag.match(/::[A-Za-z-]+/g) || []).length;
    c += (sinPE.match(/(^|[\s>+~])([A-Za-z][A-Za-z0-9_-]*)/g) || []).length;
  }
  return [a, b, c];
}

function cmp4(a, b) {
  for (var i = 0; i < 4; i++) { if (a[i] !== b[i]) return a[i] - b[i]; }
  return 0;
}

// Igual que resuelve(), pero ignorando las reglas cuyo ultimo compuesto NO es
// el elemento que se consulta. Sirve para el glifo: el contenedor comparte
// cadena de cascada con el, y aqui sus declaraciones no contam.
function resuelveGlifo(reglas, prop, cadena, hover) {
  var filtradas = reglas.filter(function(r) {
    return r.sel.some(function(x) { return apuntaGlifo(x); });
  });
  return resuelve(filtradas, prop, cadena, hover);
}

// Contexto de medios: en REPOSO solo aplican las reglas sin @media. El hover
// fino (@media (hover:hover)) se mide aparte como mejora, nunca como piso.
function mediaAplica(media, hover) {
  if (!media) return true;
  if (media.indexOf('(hover:hover)') !== -1) return !!hover;
  return false;
}

// Resuelve una propiedad por cascada REAL: especificidad y, a igualdad, orden.
function resuelve(reglas, prop, cadena, hover) {
  var mejor = null, mejorKey = null, i, s, key;
  for (i = 0; i < reglas.length; i++) {
    var r = reglas[i];
    if (!mediaAplica(r.media, hover)) continue;
    if (!Object.prototype.hasOwnProperty.call(r.decls, prop)) continue;
    for (s = 0; s < r.sel.length; s++) {
      if (!selectorMatch(r.sel[s], cadena)) continue;
      var sp = especificidad(r.sel[s]);
      // Desempate por ORDEN DE FUENTE (la linea real), que es lo que hace CSS
      // cuando dos selectores empatan en especificidad: gana el que aparece
      // despues. Sin esta cuarta componente la regla del piso y la de hover
      // empatan en (1,5,0) y el resultado dependia del orden de parseo.
      key = [sp[0], sp[1], sp[2], r.linea || 0];
      if (mejorKey === null || cmp4(key, mejorKey) > 0) { mejorKey = key; mejor = r.decls[prop]; }
    }
  }
  return mejor;
}

function alfa(valor) { return (valor === null || valor === undefined) ? 1 : parseFloat(valor); }

// =====================================================================
// 3. Color: parseo, composicion alfa y contraste WCAG.
// =====================================================================
function hex2rgb(h) {
  h = String(h).trim().replace(/^#/, '');
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
function parseColor(v) {
  if (!v) return null;
  v = String(v).trim();
  var m = v.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/i);
  if (m) return [+m[1], +m[2], +m[3], m[4] === undefined ? 1 : +m[4]];
  if (v.charAt(0) === '#') return hex2rgb(v).concat([1]);
  return null;
}
function compon(fg, bg, a) {
  return [0, 1, 2].map(function(i) { return bg[i] + (fg[i] - bg[i]) * a; });
}
function luminancia(rgb) {
  var v = rgb.map(function(c) {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
}
function contraste(a, b) {
  var la = luminancia(a), lb = luminancia(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
function r2(n) { return Math.round(n * 100) / 100; }

// MEDICION UNICA DE CONTRASTE. La usan el check 4 (reposo) y el check 7 (hover):
// un solo sitio compone el alfa del color heredado con la opacidad efectiva y
// aplica la formula WCAG, de modo que los dos estados no pueden divergir por
// tener cada uno su propia copia de la formula.
//   s            silo ya cargado (fondo y color del contenedor)
//   efectivo     alfa efectivo medido por la cascada (reposo u hover)
function mideContraste(s, efectivo) {
  if (!s.fondo) return { error: 'SIN FONDO' };
  if (!s.colorCont) return { error: 'SIN COLOR' };
  var fg = [s.colorCont[0], s.colorCont[1], s.colorCont[2]];
  // El alfa TOTAL del glifo es el del color heredado por el alfa de opacidad:
  // el grupo compositor multiplica ambos, no se suman.
  var alpha = s.colorCont[3] * efectivo;
  return {
    alpha: alpha,
    fondo: s.fondo,
    compuesto: compon(fg, s.fondo, alpha),
    contraste: contraste(compon(fg, s.fondo, alpha), s.fondo)
  };
}

// =====================================================================
// 4. Lecturas auxiliares: :root, color del contenedor, reglas del widget.
// =====================================================================
function bloqueRoot(src) {
  var i = src.indexOf(':root');
  if (i === -1) return '';
  var a = src.indexOf('{', i);
  if (a === -1) return '';
  var d = 0, j = a;
  for (; j < src.length; j++) {
    if (src[j] === '{') d++;
    else if (src[j] === '}') { d--; if (d === 0) break; }
  }
  return src.slice(a + 1, j);
}
function colorContenedor(src, sel) {
  var esc = sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  var m = src.match(new RegExp('(^|[,\\s])' + esc + '\\s*\\{([^}]*)\\}'));
  if (!m) return null;
  var cm = m[2].match(/(^|;)\s*color\s*:\s*([^;]+)/);
  return cm ? parseColor(cm[2]) : null;
}
function esReglaWidget(r) {
  return r.sel.some(function(s) {
    return /ma-estrellas?|data-ma-estrellas?|maPulse|ma-rating-texto|ma-votos-num/.test(s);
  });
}
// Firma canonica de una regla para comparar silos entre si. La normalizacion
// acts sobre la DECLARACION COMPLETA (propiedad y valor), no sobre el valor
// suelto: por eso los patrones llevan "prop:valor". Solo se neutraliza la
// diferencia YA DOCUMENTADA de mi-perfil (glifo 13px vs 14px y su caja de
// 27px vs 26px), que es de diseno y no una deriva.
function firma(r) {
  var norm = function(pares) {
    return pares.map(function(kv) {
      return (kv[0] + ':' + kv[1]).replace(/\s+/g, '')
        .replace(/font-size:13px/, 'font-size:14px')
        .replace(/padding:7px0/, 'padding:6px0')
        .replace(/margin:-7px0/, 'margin:-6px0');
    }).join(';');
  };
  return r.media + ' || ' + r.sel.slice().sort().join(' , ') + ' {' + norm(
    Object.keys(r.decls).sort().map(function(k) { return [k, r.decls[k]]; })
  ) + '}';
}

// True si el ULTIMO compuesto del selector apunta al GLIFO y no al contenedor.
// Sin esto, la regla [data-ma-voto]{cursor:default} (que es correcta: el
// contenedor NO es pulsable por defecto) se contaria como si el glifo
// declarara cursor:default, que es el bug.
function apuntaGlifo(sel) {
  var partes = sel.trim().split(/[\s>+~]+/).filter(Boolean);
  if (!partes.length) return false;
  var ultimo = partes[partes.length - 1];
  return /\.ma-estrella(?![a-zA-Z-])/.test(ultimo) || /\[data-ma-estrella\]/.test(ultimo);
}

// =====================================================================
// 5. Los checks.
// =====================================================================
var silos = [];

function cargarSilos() {
  silos = SILOS.slice();
  silos.forEach(function(s) {
    var src = leer(s.archivo);
    var silo = siloDe(src);
    if (!silo) throw new Error('no se encontro el marcador SILO MEDIA-ACTIONS en ' + s.archivo);
    s.src = src;
    s.limpio = sinComentarios(src);
    s.silo = silo;
    // El silo se mide sobre el texto YA sin comentarios (linea por linea
    // preservada), y se ancla a la linea real del archivo en la que arranca
    // el bloque, para que r.linea sea la linea VERDADERA de galeria.html /
    // comunidad.html / mi-perfil.html y no un indice relativo al silo.
    var textoSilo = sinComentarios(silo.texto);
    var lmap = lineaMap(textoSilo);
    var lbase = posicionLinea(lineaMap(s.limpio), silo.ini) + 1;
    s.reglas = parseCss(textoSilo, '', [], 0, lmap, lbase);
    s.root = sinComentarios(bloqueRoot(src));
    s.fondo = parseColor((s.root.match(/--black\s*:\s*([^;]+)/) || [])[1]);
    s.colorCont = colorContenedor(s.limpio, s.contenedor);
    s.cadena = cadenaVacia(false);
    s.cadenaHover = cadenaVacia(true);
  });
}

function run() {
  cargarSilos();

  // ---------------------------------------------------------------
  // 1. SIN DOBLE PISO: el estado sin nota no puede bajar la opacidad del
  //    GRUPO y ademas la del GLIFO. Ese producto era el bug.
  // ---------------------------------------------------------------
  var d1 = [], doblePiso = [];
  silos.forEach(function(s) {
    var opGrupo = resuelve(s.reglas, 'opacity', s.cadena.slice(0, 2), false);
    var opGlifo = resuelve(s.reglas, 'opacity', s.cadena, false);
    var ag = alfa(opGrupo), agl = alfa(opGlifo);
    d1.push(s.nombre + ':grupo=' + (opGrupo === null ? '(sin regla)' : opGrupo)
      + ',glifo=' + (opGlifo === null ? '(sin regla)' : opGlifo));
    if (ag < 1 && agl < 1) doblePiso.push(s.nombre);
  });
  check('1 sin doble piso de opacidad en el estado sin nota (grupo x glifo)',
    doblePiso.length === 0,
    (doblePiso.length ? 'DOBLE PISO en ' + doblePiso.join(',') + ' | ' : '') + d1.join(' | '));

  // ---------------------------------------------------------------
  // 2. ALFA EFECTIVO >= 0.70: producto REAL de las tres dimensiones que
  //    aplican (contenedor, grupo, glifo) por cascada, no un numero fijo.
  // ---------------------------------------------------------------
  var d2 = [], flojo = [];
  silos.forEach(function(s) {
    var c = s.cadena, ch = s.cadenaHover;
    var a0 = resuelve(s.reglas, 'opacity', c.slice(0, 1), false);
    var a1 = resuelve(s.reglas, 'opacity', c.slice(0, 2), false);
    var a2 = resuelve(s.reglas, 'opacity', c, false);
var h1 = resuelve(s.reglas, 'opacity', ch.slice(0, 2), true);
    var h2 = resuelve(s.reglas, 'opacity', ch, true);
    s.efectivo = alfa(a0) * alfa(a1) * alfa(a2);
    s.efectivoHover = alfa(h1) * alfa(h2);
    if (s.efectivo < PISO_ALFA || s.efectivoHover < PISO_ALFA) flojo.push(s.nombre);
    d2.push(s.nombre + '=' + r2(s.efectivo) + ' (hover ' + r2(s.efectivoHover) + ')');
  });
  check('2 alfa efectivo del glifo sin nota >= ' + PISO_ALFA.toFixed(2),
    flojo.length === 0, (flojo.length ? 'POR DEBAJO en ' + flojo.join(',') + ' | ' : '') + d2.join(' | '));

  // ---------------------------------------------------------------
  // 3. .ma-estrella NO declara cursor:default (anulaba el pointer del
  //    contenedor, el mismo sintoma invisible del bug).
  // ---------------------------------------------------------------
  var d3 = [], conDefault = [];
  silos.forEach(function(s) {
    // Solo interesan las reglas cuyo ULTIMO compuesto es el GLIFO: la regla
    // del contenedor ([data-ma-voto]{cursor:default}) es correcta de verdad,
    // el contenedor no es pulsable salvo con .ma-calificable.
    var declarados = [];
    s.reglas.forEach(function(r) {
      var c = r.decls.cursor;
      if (c === undefined) return;
      if (r.sel.some(function(x) { return apuntaGlifo(x) && selectorMatch(x, s.cadena); })) {
        declarados.push(c);
      }
    });
    // El valor RESUELTO tiene en cuenta la herencia desde el contenedor, asi
    // que se resuelve sobre el glifo pero puede heredar; se acepta cualquier
    // valor salvo default, que es exactamente lo que hacia invisible el puntero.
    var resuelto = resuelveGlifo(s.reglas, 'cursor', s.cadena, false);
    var malo = resuelto === 'default' || declarados.indexOf('default') !== -1;
    if (malo) conDefault.push(s.nombre);
    d3.push(s.nombre + ':declarado=[' + declarados.join(',') + '],heredado=' + resuelto);
  });
  check('3 .ma-estrella no declara ni resuelve cursor:default',
    conDefault.length === 0,
    (conDefault.length ? 'DEFAULT en ' + conDefault.join(',') + ' | ' : '') + d3.join(' | '));

  // ---------------------------------------------------------------
  // 4. CONTRASTE EN REPOSO >= 4.5:1 contra --black.
  //
  // El contraste en hover se mide en el check 7, mas abajo, con la misma
  // mideContraste() y el mismo alfa que aqui (s.efectivo vs s.efectivoHover,
  // ambos resueltos por la cascada del check 2).
  // ---------------------------------------------------------------
  var d4 = [], bajo = [];
  silos.forEach(function(s) {
    var m = mideContraste(s, s.efectivo);
    if (m.error) { bajo.push(s.nombre + '(' + m.error + ')'); d4.push(s.nombre + '=' + m.error); return; }
    s.contraste = m.contraste;
    if (m.contraste < PISO_CONTRASTE) bajo.push(s.nombre + '=' + r2(m.contraste));
    d4.push(s.nombre + '=' + r2(m.contraste) + ':1 (alfa ' + r2(m.alpha) + ' sobre rgb('
      + m.fondo.map(Math.round).join(',') + '))');
  });
  check('4 contraste del glifo sin nota EN REPOSO >= ' + PISO_CONTRASTE + ':1 en las 3 superficies',
    bajo.length === 0,
    (bajo.length ? 'BAJO en ' + bajo.join(',') + ' | ' : '') + d4.join(' | '));

  // ---------------------------------------------------------------
  // 5. AISLAMIENTO ATOMICO (ADR-004): toda regla del widget cuelga de
  //    [data-ma-voto] y --gold/--star no se anaden a :root.
  // ---------------------------------------------------------------
  var d5 = [], sueltas = [], varsRoot = [];
  silos.forEach(function(s) {
    s.reglas.forEach(function(r) {
      if (r.sel.some(function(x) { return x.indexOf('[data-ma-voto]') === -1; })) {
        sueltas.push(s.nombre + ' {' + r.sel.join(',') + '}');
      }
    });
    // Reglas del widget por FUERA del silo, en cualquier <style> del archivo.
    // El recorrido va sobre el fuente CRUDO a proposito: el marcador del silo
    // esta dentro de un comentario, y sinComentarios no se podria reconocer
    // el <style> que SI es el silo (daria falso positivo con el propio silo).
    var fueraCss = '', m, re = /<style[^>]*>([\s\S]*?)<\/style>/gi;
    while ((m = re.exec(s.src)) !== null) {
      if (m[1].indexOf('SILO MEDIA-ACTIONS') !== -1) continue;
      fueraCss += sinComentarios(m[1]) + '\n';
    }
    parseCss(fueraCss, '', []).filter(esReglaWidget).forEach(function(r) {
      sueltas.push(s.nombre + '(fuera del silo) {' + r.sel.join(',') + '}');
    });
    // :root solo admite las 3 variables --gold de siempre: una --star nueva
    // o una --gold extra las delata.
    var props = (s.root.match(/--[A-Za-z0-9-]+\s*:/g) || [])
      .map(function(x) { return x.replace(/\s*:$/, ''); })
      .filter(function(x) { return /^--(gold|star)/i.test(x); });
    varsRoot.push(s.nombre + '=[' + props.join(',') + ']');
    props.forEach(function(p) {
      if (['--gold', '--gold-l', '--gold-d'].indexOf(p) === -1) sueltas.push(s.nombre + ' :root ' + p);
    });
  });
  check('5 todo el widget vive bajo [data-ma-voto] y :root no gana --gold/--star',
    sueltas.length === 0,
    (sueltas.length ? 'HUERFANAS: ' + sueltas.join(' ; ') + ' | ' : '') + varsRoot.join(' | '));

  // ---------------------------------------------------------------
  // 6. CONSISTENCIA entre silos: mismas reglas del widget, salvo el
  //    glifo 13px de mi-perfil (normalizado a 14px).
  // ---------------------------------------------------------------
  var base = silos[0], firmasBase = {};
  base.reglas.forEach(function(r) { firmasBase[firma(r)] = true; });
  var d6 = [], deriva = [];
  silos.slice(1).forEach(function(s) {
    var f = {}, falta = [], sobra = [];
    s.reglas.forEach(function(r) { f[firma(r)] = true; });
    Object.keys(firmasBase).forEach(function(k) { if (!f[k]) falta.push(k); });
    Object.keys(f).forEach(function(k) { if (!firmasBase[k]) sobra.push(k); });
    d6.push(s.nombre + ':' + s.reglas.length + ' reglas, faltan ' + falta.length + ', sobran ' + sobra.length);
    if (falta.length) deriva.push(s.nombre + ' FALTAN -> ' + falta.join(' ; '));
    if (sobra.length) deriva.push(s.nombre + ' SOBRAN -> ' + sobra.join(' ; '));
  });
  check('6 los 3 silos coinciden en las reglas del widget (13px normalizado a 14px)',
    deriva.length === 0,
    (deriva.length ? 'DERIVA | ' : '') + d6.join(' | '));

  // ---------------------------------------------------------------
  // 7. CONTRASTE EN HOVER >= 4.5:1 contra --black.
  //
  // Cubre el hueco que dejaban el 2 y el 4. Un hover con alfa LEGAL
  // (>= 0.70, luego el check 2 pasa) puede aun asi bajar de 4.5:1 en la
  // superficie mas apagada, porque alli el color heredado del contenedor ya
  // es mas oscuro y el alfa se multiplica por el. Ese es exactamente el caso
  // que el check 2 NO atrapa y este si.
  //
  // Se apoya en la MISMA via que el check 4: el alfa lo resuelve la cascada
  // del check 2 (s.efectivoHover) y la composicion + WCAG los hace
  // mideContraste(). No hay segunda formula que pueda divergir.
  // ---------------------------------------------------------------
  var d7 = [], bajo7 = [];
  silos.forEach(function(s) {
    var m = mideContraste(s, s.efectivoHover);
    if (m.error) { bajo7.push(s.nombre + '(' + m.error + ')'); d7.push(s.nombre + '=' + m.error); return; }
    s.contrasteHover = m.contraste;
    if (m.contraste < PISO_CONTRASTE) bajo7.push(s.nombre + '=' + r2(m.contraste));
    d7.push(s.nombre + '=' + r2(m.contraste) + ':1 (alfa ' + r2(m.alpha) + ' sobre rgb('
      + m.fondo.map(Math.round).join(',') + '))');
  });
  check('7 contraste del glifo sin nota EN HOVER >= ' + PISO_CONTRASTE + ':1 en las 3 superficies',
    bajo7.length === 0,
    (bajo7.length ? 'BAJO en ' + bajo7.join(',') + ' | ' : '') + d7.join(' | '));

  if (process.env.SMOKE_DUMP === '1') {
    console.log('');
    console.log('--- DUMP: firmas de ' + base.nombre + ' (' + base.reglas.length + ' reglas) ---');
    Object.keys(firmasBase).sort().forEach(function(k) { console.log('  ' + k); });
    silos.slice(1).forEach(function(s) {
      console.log('--- DUMP: diferencias con ' + base.nombre + ' (' + s.nombre + ') ---');
      var f = {};
      s.reglas.forEach(function(r) { f[firma(r)] = true; });
      Object.keys(f).sort().forEach(function(k) { if (!firmasBase[k]) console.log('  SOLO ' + s.nombre + ': ' + k); });
      Object.keys(firmasBase).sort().forEach(function(k) { if (!f[k]) console.log('  SOLO ' + base.nombre + ': ' + k); });
    });
    // Traza de cascada: para cada regla que opaca al glifo en el estado sin
    // nota, su especificidad REAL y su linea. Sirve para auditar de un vistazo
    // por que gana una regla y no la otra (si el piso y el hover no empatan,
    // el hover ya no depende del desempate por linea).
    silos.forEach(function(s) {
      console.log('--- DUMP: cascada de opacity del glifo sin nota en ' + s.nombre + ' ---');
      [[s.cadena, false, 'reposo'], [s.cadenaHover, true, 'hover']].forEach(function(v) {
        var cadena = v[0], hover = v[1], modo = v[2];
        console.log('  [' + modo + '] regla que gana: ' + resuelve(s.reglas, 'opacity', cadena, hover));
        s.reglas.forEach(function(r) {
          if (r.decls.opacity === undefined) return;
          if (!mediaAplica(r.media, hover)) return;
          if (!r.sel.some(function(x) { return apuntaGlifo(x) && selectorMatch(x, cadena); })) return;
          var sp = r.sel.map(especificidad).sort(function(a, b) {
            return (b[0] - a[0]) || (b[1] - a[1]) || (b[2] - a[2]);
          })[0];
          console.log('      linea ' + r.linea + '  (' + sp.join(',') + ',0)  '
            + (r.media ? '[' + r.media + '] ' : '') + r.sel[0] + '  {opacity:' + r.decls.opacity + '}');
        });
      });
    });
  }
}

function finish() {
  console.log('');
  console.log('=== SMOKE 090 CONTRASTE CALIFICACION MEDIA ===');
  console.log('Checks: 7 total, ' + passed + ' PASS, ' + failed + ' FAIL');
  console.log('Local: 0 peticiones de red, 0 escrituras. Lee galeria.html, comunidad.html y mi-perfil.html.');
  if (failed === 0) console.log('SMOKE 090 CONTRASTE CALIFICACION MEDIA: OK');
  else console.log('SMOKE 090 CONTRASTE CALIFICACION MEDIA: ' + failed + ' FALLO(S)');
}

try {
  run();
} catch (err) {
  failed++;
  console.log('FAIL - el smoke lanzo error: ' + (err && err.message));
  process.exitCode = 1;
}
finish();