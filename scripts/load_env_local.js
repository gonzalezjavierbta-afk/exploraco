// load_env_local.js
// Carga DATABASE_URL desde el archivo local .env.local (ignorado por git,
// ver .gitignore "Entorno y secretos") para las herramientas de diagnostico
// READ-ONLY de ExploraCO. Nunca imprime el valor; solo lo pone en
// process.env.DATABASE_URL si aun no esta definido.
//
// Uso: require('./load_env_local')();
//
// Formato aceptado en .env.local:
//   DATABASE_URL=postgresql://usuario:clave@host:puerto/base
// Se toleran comillas simples/dobles alrededor del valor y se ignora todo lo
// que no empiece por DATABASE_URL= o que sea comentario (#).
//
// ASCII-safe (ADR-002): cero bytes > 127, cero backticks, CommonJS estricto.
'use strict';

var fs = require('fs');
var path = require('path');

function cargar() {
  if (process.env.DATABASE_URL && String(process.env.DATABASE_URL).trim() !== '') {
    return;
  }
  try {
    var archivo = path.join(__dirname, '..', '.env.local');
    if (!fs.existsSync(archivo)) return;
    var lineas = fs.readFileSync(archivo, 'utf8').split(/\r?\n/);
    var i;
    for (i = 0; i < lineas.length; i++) {
      var linea = lineas[i].trim();
      if (linea === '' || linea.charAt(0) === '#') continue;
      if (linea.indexOf('DATABASE_URL=') !== 0) continue;
      var valor = linea.slice('DATABASE_URL='.length).trim();
      if ((valor.charAt(0) === '"' && valor.charAt(valor.length - 1) === '"')
          || (valor.charAt(0) === "'" && valor.charAt(valor.length - 1) === "'")) {
        valor = valor.slice(1, -1);
      }
      if (valor === '') continue;
      process.env.DATABASE_URL = valor;
      return;
    }
  } catch (e) {
    // Falla silenciosa intencional y tipada: sin .env.local las herramientas
    // caen a modo fake. AGENTS.md 2.2 exige traza, no vacio ciego.
    process.env.REPORTAR_LOAD_ENV = String((e && e.message) ? e.message : e);
  }
}

module.exports = cargar;