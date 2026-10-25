// scripts/ejecucion/indexar-prompt-medellin.js
//
// Indexa las fichas de Medellin que viven en prompt.txt (raiz del repo) y
// escribe UN archivo por ficha en ficha/ficha-<slug>.json.
//
// Contrato:
//   - prompt.txt debe ser un JSON array valido de 36 objetos con las claves
//     BASE / TAGS / FAQS / FOTOS_SUGERIDAS / FUENTES.
//   - Salida JSON en ASCII-safe estricto (ADR-002): todo caracter fuera de
//     [0x00-0x7F] se serializa como escape \uXXXX simple.
//   - Idempotente: solo reescribe si el contenido cambia (created/updated/
//     unchanged). Nunca borra ni renombra fichas existentes.
//   - Escribe ademas ficha/_indice-medellin.json con la lista ordenada de
//     slugs, que consumen los otros scripts de esta carpeta.
//
// Uso:
//   node scripts/ejecucion/indexar-prompt-medellin.js [--esperado=36]
//
// Exit code 0 = OK, 1 = error de contrato. Solo lectura de prompt.txt.
// ASCII-safe: cero bytes > 127 en este archivo.

var fs = require('fs');
var path = require('path');

var ROOT = path.resolve(__dirname, '..', '..');
var SRC = path.join(ROOT, 'prompt.txt');
var OUT_DIR = path.join(ROOT, 'ficha');
var INDEX_FILE = path.join(OUT_DIR, '_indice-medellin.json');

var ROOT_KEYS = ['BASE', 'TAGS', 'FAQS', 'FOTOS_SUGERIDAS', 'FUENTES'];
var SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function die(msg) {
  console.error('[FAIL] ' + msg);
  process.exit(1);
}

// Serializa a JSON con indentacion 2, saltos CRLF (convencion del repo) y
// todo caracter no ASCII convertido a escape \uXXXX simple.
function toAsciiJson(value) {
  var txt = JSON.stringify(value, null, 2);
  txt = txt.replace(/[^\x00-\x7F]/g, function (ch) {
    var hex = ch.charCodeAt(0).toString(16);
    while (hex.length < 4) hex = '0' + hex;
    return '\\u' + hex;
  });
  txt = txt.replace(/\r?\n/g, '\r\n');
  return txt + '\r\n';
}

function assertAscii(text, label) {
  for (var i = 0; i < text.length; i++) {
    if (text.charCodeAt(i) > 127) {
      die('caracter no ASCII en ' + label + ' (posicion ' + i + ')');
    }
  }
}

function writeAsciiJson(file, value) {
  var text = toAsciiJson(value);
  assertAscii(text, path.basename(file));
  var prev = null;
  try {
    prev = fs.readFileSync(file, 'utf8');
  } catch (e) {
    prev = null;
  }
  if (prev === text) return 'unchanged';
  fs.writeFileSync(file, text, 'utf8');
  return prev === null ? 'created' : 'updated';
}

function expectedCount(argv) {
  var arg = argv.filter(function (a) { return a.indexOf('--esperado=') === 0; })[0];
  if (!arg) return 36;
  var n = parseInt(arg.split('=')[1], 10);
  if (!isFinite(n) || n <= 0) die('--esperado invalido');
  return n;
}

function main() {
  var esperado = expectedCount(process.argv.slice(2));

  if (!fs.existsSync(SRC)) die('no existe prompt.txt en la raiz del repo');

  var raw = fs.readFileSync(SRC, 'utf8');
  var data;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    die('prompt.txt no es JSON valido: ' + e.message);
  }
  if (!Array.isArray(data)) die('prompt.txt no contiene un JSON array');
  if (data.length !== esperado) {
    die('se esperaban ' + esperado + ' objetos y hay ' + data.length);
  }

  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  var seen = {};
  var stats = { created: 0, updated: 0, unchanged: 0 };
  var index = [];
  var problems = [];

  data.forEach(function (item, i) {
    var where = 'ficha[' + i + ']';
    if (!item || typeof item !== 'object') {
      problems.push(where + ': no es un objeto');
      return;
    }
    ROOT_KEYS.forEach(function (k) {
      if (!(k in item)) problems.push(where + ': falta ' + k);
    });
    if (!item.BASE || typeof item.BASE.slug !== 'string') {
      problems.push(where + ': falta BASE.slug');
      return;
    }
    var slug = item.BASE.slug;
    if (!SLUG_RE.test(slug)) {
      problems.push(where + ': slug invalido (' + slug + ')');
      return;
    }
    if (seen[slug]) {
      problems.push(where + ': slug duplicado (' + slug + ')');
      return;
    }
    seen[slug] = true;

    var file = path.join(OUT_DIR, 'ficha-' + slug + '.json');
    var state = writeAsciiJson(file, item);
    stats[state]++;

    index.push({
      slug: slug,
      archivo: 'ficha/ficha-' + slug + '.json',
      nombre: item.BASE.nombre || '',
      categoria_slug: item.BASE.categoria_slug || ''
    });
  });

  if (problems.length) {
    problems.forEach(function (p) { console.error('[FAIL] ' + p); });
    die(problems.length + ' problema(s) de contrato; no se escribio el indice');
  }

  var idxState = writeAsciiJson(INDEX_FILE, index);

  console.log('prompt.txt: ' + data.length + ' objetos, JSON valido');
  console.log('fichas escritas: ' + data.length +
    ' (created ' + stats.created +
    ', updated ' + stats.updated +
    ', unchanged ' + stats.unchanged + ')');
  console.log('indice: ' + path.relative(ROOT, INDEX_FILE).replace(/\\/g, '/') +
    ' (' + index.length + ' slugs, ' + idxState + ')');
  console.log('ASCII-safe: 0 bytes > 127 en las ' + (data.length + 1) + ' salidas JSON');
}

main();
