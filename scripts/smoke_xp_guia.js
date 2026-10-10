// scripts/smoke_xp_guia.js
// GATE del catalogo de la guia "Como ganar XP" contra el motor real de XP.
//
// Fuente motor : api/interacciones.js -> XP_BASES (bases reales de cada accion).
// Fuente guia  : usuario-session.js   -> EC_XP_CATALOGO / EC_XP_GRUPOS (texto).
//
// Nada verificaba hoy que la guia (usuario-session.js) siguiera casando con el
// motor (api/interacciones.js): una clave nueva en el motor sin fila en la guia
// pasaba desapercibida. Este smoke lo impide.
//
//   Assert A cobertura : clave de XP_BASES (sin exclusiones) tiene fila en la guia.
//   Assert B fantasmas : clave de la guia existe en XP_BASES.
//   Assert C unicidad  : sin claves repetidas y conteo == esperado.
//   Assert D nivel     : {nivel:N} de la guia == gate real del backend.
//   Assert E ASCII     : el rango de EC_XP_CATALOGO es ASCII puro (ADR-002).
//
// PARSEO DE TEXTO a proposito: NO se hace require() de api/interacciones.js
// (es una funcion serverless de Vercel) ni se ejecuta el IIFE del navegador de
// usuario-session.js. Solo se leen bytes y se recortan bloques de objeto.
//
// ASCII-safe (ADR-002), CommonJS (BUG-001), 0 backticks.
// Run: node scripts/smoke_xp_guia.js
'use strict';

var fs = require('fs');
var path = require('path');

var ROOT = path.join(__dirname, '..');
var MOTOR = 'api/interacciones.js';
var GUIA = 'usuario-session.js';

var ESPERADO_FILAS = 19;

// EXCLUSIONES: claves de XP_BASES que no son fuente de un jugador desde la UI,
// por lo que NO se exige fila en la guia. Comentario de cada una:
//   publicar_basico|publicar_intermedio|publicar_completo|publicar_bono_geo|
//     publicar_bono_foto -> las reparte el admin server-to-server con ADMIN_SECRET
//     (api/interacciones.js:15439); nunca las dispara un jugador.
//   spot_atributos     -> verificada huerfana: 0 call-sites desde la UI.
//   visita_bono_rural  -> modificador automatico que ACOMPANA a `visita` (bono
//     rural cuando el destino esta en zona rural); la guia lo documenta dentro
//     de la fila `visita`, no es una accion que el jugador ejecute por separado.
var EXCLUSIONES = {
  publicar_basico: true,
  publicar_intermedio: true,
  publicar_completo: true,
  publicar_bono_geo: true,
  publicar_bono_foto: true,
  spot_atributos: true,
  visita_bono_rural: true
};

var total = 0;
var pass = 0;
var fails = 0;
function ok(label) { total++; pass++; console.log('PASS - ' + label); }
function ko(label, detalle) {
  total++; fails++;
  console.log('FAIL - ' + label + (detalle ? ' :: ' + detalle : ''));
}

function leer(rel) { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); }
function leerBytes(rel) { return fs.readFileSync(path.join(ROOT, rel)); }
function unicosMenos(lista, excluidos) {
  return lista.filter(function(k) { return !excluidos[k]; });
}
function soloEn(a, setB) { return a.filter(function(k) { return !setB[k]; }); }

// Recorta el bloque de objeto balanceado desde el marcador hasta su '}' de cierre.
// Devuelve indices en el texto recibido: marcador, llave de apertura y cierre.
function rangoObjeto(texto, marcador) {
  var i = texto.indexOf(marcador);
  if (i < 0) return null;
  var abrir = texto.indexOf('{', i);
  if (abrir < 0) return null;
  var nivel = 0;
  for (var k = abrir; k < texto.length; k++) {
    var c = texto.charAt(k);
    if (c === '{') nivel++;
    else if (c === '}') {
      nivel--;
      if (nivel === 0) return { marca: i, abrir: abrir, cierra: k };
    }
  }
  return null;
}

// Claves de primer nivel de un bloque de objeto por indentacion fija.
// Ej.: indent '  ' -> lineas '  clave:'; indent '    ' -> lineas '    clave: {'.
function clavesPorIndent(raw, indent) {
  var re = new RegExp('^' + indent + '([a-z_][a-z0-9_]*):', 'gm');
  var out = [];
  var m;
  while ((m = re.exec(raw)) !== null) out.push({ key: m[1], idx: m.index });
  return out;
}

console.log('=== SMOKE XP GUIA (catalogo de la guia vs motor real de XP) ===');
console.log('');

var motorSrc = leer(MOTOR);
var guiaSrc = leer(GUIA);

// ---- Extraccion por parseo -------------------------------------------
var rangoBases = rangoObjeto(motorSrc, 'var XP_BASES = {');
if (!rangoBases) {
  ko('parsear bloque XP_BASES en ' + MOTOR, 'marcador no encontrado');
}
var basesRaw = rangoBases ? motorSrc.slice(rangoBases.abrir, rangoBases.cierra + 1) : '';
var basesKeys = clavesPorIndent(basesRaw, '  ')
  .map(function(o) { return o.key; });

var rangoCat = rangoObjeto(guiaSrc, 'var EC_XP_CATALOGO');
if (!rangoCat) {
  ko('parsear bloque EC_XP_CATALOGO en ' + GUIA, 'marcador no encontrado');
}
var catRaw = rangoCat ? guiaSrc.slice(rangoCat.abrir, rangoCat.cierra + 1) : '';
var catKeysInfo = clavesPorIndent(catRaw, '    ');
var catKeys = catKeysInfo.map(function(o) { return o.key; });

var basesSet = {};
basesKeys.forEach(function(k) { basesSet[k] = true; });
var catSet = {};
catKeys.forEach(function(k) { catSet[k] = true; });

// ---- Assert A: cobertura (motor -> guia) -----------------------------
var exigidas = unicosMenos(basesKeys, EXCLUSIONES);
var sinFila = soloEn(exigidas, catSet);
if (sinFila.length === 0) {
  ok('Assert A cobertura: ' + exigidas.length + ' claves de XP_BASES (sin exclusiones) tienen fila');
} else {
  ko('Assert A cobertura: claves de XP_BASES sin fila en la guia', sinFila.join(', '));
}

// ---- Assert B: sin fantasmas (guia -> motor) -------------------------
var fantasmas = soloEn(catKeys, basesSet);
if (fantasmas.length === 0) {
  ok('Assert B fantasmas: las ' + catKeys.length + ' claves de la guia existen en XP_BASES');
} else {
  ko('Assert B fantasmas: claves de la guia ausentes en XP_BASES', fantasmas.join(', '));
}

// ---- Assert C: unicidad + conteo -------------------------------------
var vistas = {};
var repetidas = [];
catKeys.forEach(function(k) {
  if (vistas[k]) repetidas.push(k);
  vistas[k] = true;
});
if (repetidas.length === 0) {
  ok('Assert C unicidad: sin claves repetidas en EC_XP_CATALOGO');
} else {
  ko('Assert C unicidad: claves repetidas', repetidas.join(', '));
}
if (catKeys.length === ESPERADO_FILAS) {
  ok('Assert C conteo: EC_XP_CATALOGO tiene ' + ESPERADO_FILAS + ' filas');
} else {
  ko('Assert C conteo: EC_XP_CATALOGO tiene ' + ESPERADO_FILAS + ' filas',
    'tiene ' + catKeys.length);
}

// ---- Assert D: requisitos de nivel contra el gate real ---------------
// Gates leidos del archivo real (no de memoria).
var mAlbum = /requiere nivel (\d+)/.exec(motorSrc);
var gateAlbum = mAlbum ? parseInt(mAlbum[1], 10) : null;
var mAo = /numXp\(aoVUsr\[0\]\.xp_total\)\)\.nivel < (\d+)/.exec(motorSrc);
var gateAo = mAo ? parseInt(mAo[1], 10) : null;

if (gateAlbum === 2) ok('Assert D gate album leido del motor: nivel 2');
else ko('Assert D gate album leido del motor', 'esperado 2, leido ' + gateAlbum);
if (gateAo === 5) ok('Assert D gate ao leido del motor: nivel 5');
else ko('Assert D gate ao leido del motor', 'esperado 5, leido ' + gateAo);

// Mapea cada fila de la guia a la clave de su `accion` y extrae {nivel:N}.
var conNivel = [];
for (var e = 0; e < catKeysInfo.length; e++) {
  var desde = catKeysInfo[e].idx;
  var hasta = (e + 1 < catKeysInfo.length) ? catKeysInfo[e + 1].idx : catRaw.length;
  var seg = catRaw.slice(desde, hasta);
  var mNivel = /nivel:\s*(\d+)/.exec(seg);
  if (mNivel) conNivel.push({ key: catKeysInfo[e].key, nivel: parseInt(mNivel[1], 10) });
}

var dErrores = [];
conNivel.forEach(function(item) {
  var esperado = null;
  if (item.key.indexOf('album') === 0) esperado = gateAlbum;
  else if (item.key === 'ao_votar') esperado = gateAo;
  if (esperado === null) {
    dErrores.push(item.key + ': sin gate mapeado');
  } else if (item.nivel !== esperado) {
    dErrores.push(item.key + ': guia nivel ' + item.nivel + ' != gate ' + esperado);
  }
});
if (conNivel.length === 0) {
  ko('Assert D nivel: no se hallo ningun requisito {nivel:N} en la guia');
} else if (dErrores.length === 0) {
  ok('Assert D nivel: ' + conNivel.length + ' entradas {nivel:N} coinciden con el gate real');
} else {
  ko('Assert D nivel: requisitos desincronizados del gate', dErrores.join(' | '));
}

// Assert D2: ao_proponer NO debe declarar {nivel:N}. El motor lo exime
// explicitamente ("propone sin gate de nivel", api/interacciones.js:10037)
// y solo pide email verificado; si la guia volviera a exigir nivel, aqui
// salta. Es la mitad del desync que Assert D no cubre.
var proposerConNivel = null;
for (var q = 0; q < conNivel.length; q++) {
  if (conNivel[q].key === 'ao_proponer') proposerConNivel = conNivel[q];
}
if (proposerConNivel) {
  ko('Assert D2 ao_proponer: la guia exige nivel ' + proposerConNivel.nivel
    + ' pero el motor no tiene gate de nivel');
} else {
  ok('Assert D2 ao_proponer: sin requisito de nivel, coincide con el motor');
}

// ---- Assert E: ASCII-safe del rango del catalogo ---------------------
// Se lee el archivo como bytes (latin1 = 1 char == 1 byte) para no confundir
// indices con los bytes multibyte previos del archivo.
var guiaBytes = leerBytes(GUIA);
var guiaLatin = guiaBytes.toString('latin1');
var rangoAscii = rangoObjeto(guiaLatin, 'var EC_XP_CATALOGO');
if (!rangoAscii) {
  ko('Assert E ASCII: rango de EC_XP_CATALOGO no encontrado');
} else {
  var noAscii = 0;
  for (var b = rangoAscii.marca; b <= rangoAscii.cierra; b++) {
    if (guiaBytes[b] > 127) noAscii++;
  }
  if (noAscii === 0) {
    ok('Assert E ASCII: rango EC_XP_CATALOGO [' + rangoAscii.marca + '..' + rangoAscii.cierra + '] sin bytes > 127');
  } else {
    ko('Assert E ASCII: rango EC_XP_CATALOGO con ' + noAscii + ' bytes > 127',
      '[' + rangoAscii.marca + '..' + rangoAscii.cierra + ']');
  }
}

console.log('');
if (fails === 0) {
  console.log('RESULTADO: OK - ' + pass + '/' + total + ' verificaciones pasaron.');
  process.exit(0);
} else {
  console.log('RESULTADO: FAIL - ' + fails + '/' + total + ' verificaciones fallaron.');
  process.exit(1);
}
