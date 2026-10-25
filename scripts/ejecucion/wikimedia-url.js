// scripts/ejecucion/wikimedia-url.js
//
// UNA SOLA implementacion de la URL de miniatura de upload.wikimedia.org.
// La consumen los seeds de lote (scripts/seed-medellin-lote1.js) y cualquier
// verificador de fotos; nadie reimplementa la formula dentro de un seed.
//
// Forma de la URL (medida en ficha/_informe-fotos.json, campo 'resolucion'):
//   https://upload.wikimedia.org/wikipedia/commons/thumb/<h0>/<h0h1>/<archivo>/<ancho>px-<archivo>
// donde <h> es el MD5 (hex) del nombre de archivo CON guiones bajos y SIN el
// prefijo 'File:', y <archivo> va percent-encoded en la ruta.
//
// No hace red: es una funcion pura de cadena. La verificacion HEAD 200 vive en
// scripts/ejecucion/verificar-fotos-fichas.js (BUG-022: la URL se incluye solo
// despues de un 200).
//
// Uso:
//   var w = require('./ejecucion/wikimedia-url.js');
//   w.urlMiniatura('File:Escaleras...03.jpg');        // ancho por defecto 1280
//   w.urlMiniatura('File:Escaleras...03.jpg', 640);
//
// ASCII-safe estricto (ADR-002): 0 bytes > 127, 0 backticks.

'use strict';

var crypto = require('crypto');

var ANCHO_DEFECTO = 1280;
var BASE_THUMB = 'https://upload.wikimedia.org/wikipedia/commons/thumb/';

// 'File:Foo bar.jpg' -> 'Foo_bar.jpg'. Acepta tambien 'Archivo:' e 'Image:'.
function normalizarNombre(nombreArchivo) {
  var s = (nombreArchivo === null || nombreArchivo === undefined)
    ? '' : String(nombreArchivo);
  s = s.trim();
  if (!s) return '';
  s = s.replace(/^(File|Archivo|Image|Imagen):/i, '');
  s = s.replace(/ /g, '_');
  return s;
}

function hashMd5(texto) {
  return crypto.createHash('md5').update(String(texto), 'utf8').digest('hex');
}

// Percent-encoding por segmento: conserva las barras, codifica tildes y demas.
function codificarRuta(archivo) {
  return String(archivo).split('/').map(function (seg) {
    return encodeURIComponent(seg);
  }).join('/');
}

function anchoValido(ancho) {
  var px = parseInt(ancho, 10);
  if (!isFinite(px) || px <= 0) return ANCHO_DEFECTO;
  return px;
}

// nombreArchivo: 'File:Ejemplo.jpg' | 'Ejemplo.jpg'
// ancho: pixeles de la miniatura (default 1280)
function urlMiniatura(nombreArchivo, ancho) {
  var archivo = normalizarNombre(nombreArchivo);
  if (!archivo) return '';
  var px = anchoValido(ancho);
  var h = hashMd5(archivo);
  var ruta = codificarRuta(archivo);
  return BASE_THUMB + h.charAt(0) + '/' + h.slice(0, 2) + '/' + ruta + '/'
    + px + 'px-' + ruta;
}

module.exports = {
  ANCHO_DEFECTO: ANCHO_DEFECTO,
  BASE_THUMB: BASE_THUMB,
  normalizarNombre: normalizarNombre,
  urlMiniatura: urlMiniatura
};
