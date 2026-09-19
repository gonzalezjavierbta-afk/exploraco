'use strict';

/*
 * express_check.js
 * Automatizacion de la sugerencia F del modo express: un unico comando
 * para las verificaciones minimas.
 *
 * Uso:
 *   node scripts/express_check.js
 *     -> verifica el set por defecto: api/*.js + scripts/*.js (sintaxis y
 *        ASCII-safety) y el set HTML clave (balance de divs).
 *   node scripts/express_check.js <archivo1> <archivo2> ...
 *     -> verifica solo esos archivos.
 *
 * Sin dependencias externas: solo fs, path y child_process.
 * No escribe archivos ni accede a la red.
 */

var fs = require('fs');
var path = require('path');
var childProcess = require('child_process');

var ROOT = path.resolve(__dirname, '..');
var BACKSLASH = String.fromCharCode(92);
var BACKTICK_CHAR = String.fromCharCode(96);
var DOUBLE_ESCAPE = BACKSLASH + BACKSLASH + 'u';

var HTML_SET = ['index.html', 'admin.html', 'mi-perfil.html', 'comunidad.html', 'galeria.html'];

var passChecks = 0;
var failChecks = 0;
var failures = [];
var warnings = [];
var skipped = [];

function log(msg) {
  process.stdout.write(String(msg) + '\n');
}

function pass() {
  passChecks += 1;
}

function fail(file, check, reason) {
  failChecks += 1;
  failures.push({ file: file, check: check, reason: reason });
}

function toPosix(rel) {
  return String(rel).split(path.sep).join('/');
}

function lineNumberAt(text, index) {
  var line = 1;
  for (var i = 0; i < index; i += 1) {
    if (text.charCodeAt(i) === 10) {
      line += 1;
    }
  }
  return line;
}

function findOccurrences(text, needle) {
  var lines = [];
  var count = 0;
  var from = 0;
  if (needle.length === 0) {
    return { count: 0, lines: lines };
  }
  var idx = text.indexOf(needle, from);
  while (idx !== -1) {
    count += 1;
    if (lines.length < 8) {
      lines.push(lineNumberAt(text, idx));
    }
    from = idx + needle.length;
    idx = text.indexOf(needle, from);
  }
  return { count: count, lines: lines };
}

function listDirFiles(dirName) {
  var abs = path.join(ROOT, dirName);
  var stat = null;
  try {
    stat = fs.statSync(abs);
  } catch (err) {
    warnings.push('Directorio no disponible: ' + dirName + ' (' + err.message + ')');
    return [];
  }
  if (!stat.isDirectory()) {
    warnings.push('La ruta no es un directorio: ' + dirName);
    return [];
  }
  var names = null;
  try {
    names = fs.readdirSync(abs);
  } catch (err) {
    warnings.push('No se pudo leer el directorio ' + dirName + ': ' + err.message);
    return [];
  }
  var files = [];
  for (var i = 0; i < names.length; i += 1) {
    if (/\.js$/.test(names[i])) {
      files.push(path.join(abs, names[i]));
    }
  }
  files.sort();
  return files;
}

function extractLineInfo(detail) {
  var match = /:(\d+)/.exec(detail);
  if (match) {
    return 'linea ' + match[1];
  }
  return '';
}

function checkSyntax(abs, rel) {
  try {
    childProcess.execFileSync('node', ['--check', abs], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    });
    pass();
    log('  PASS sintaxis  ' + rel);
  } catch (err) {
    var detail = '';
    if (err && err.stderr) {
      detail = String(err.stderr).replace(/\r?\n/g, ' ').trim();
    } else if (err && err.message) {
      detail = String(err.message);
    } else {
      detail = 'fallo desconocido de node --check';
    }
    var lineInfo = extractLineInfo(detail);
    if (lineInfo) {
      detail = detail + ' (' + lineInfo + ')';
    }
    fail(rel, 'sintaxis', detail);
    log('  FAIL sintaxis  ' + rel + ' -> ' + detail);
  }
}

function checkAscii(abs, rel) {
  var buf = null;
  try {
    buf = fs.readFileSync(abs);
  } catch (err) {
    fail(rel, 'ascii', 'No se pudo leer: ' + err.message);
    log('  FAIL ascii     ' + rel + ' -> no se pudo leer');
    return;
  }

  var text = buf.toString('latin1');
  var highCount = 0;
  var highLines = [];
  var line = 1;
  for (var i = 0; i < text.length; i += 1) {
    var code = text.charCodeAt(i);
    if (code === 10) {
      line += 1;
    } else if (code > 127) {
      highCount += 1;
      if (highLines.length < 8) {
        highLines.push(line);
      }
    }
  }

  var ticks = findOccurrences(text, BACKTICK_CHAR);
  var escapes = findOccurrences(text, DOUBLE_ESCAPE);

  var parts = [];
  if (highCount > 0) {
    parts.push('bytes>127=' + highCount + ' (linea ' + highLines.join(',') + ')');
  }
  if (ticks.count > 0) {
    parts.push('backticks=' + ticks.count + ' (linea ' + ticks.lines.join(',') + ')');
  }
  if (escapes.count > 0) {
    parts.push('doble-escape=' + escapes.count + ' (linea ' + escapes.lines.join(',') + ')');
  }

  if (parts.length === 0) {
    pass();
    log('  PASS ascii     ' + rel);
  } else {
    fail(rel, 'ascii', parts.join('; '));
    log('  FAIL ascii     ' + rel + ' -> ' + parts.join('; '));
  }
}

function checkDivs(abs, rel) {
  var content = null;
  try {
    content = fs.readFileSync(abs, 'utf8');
  } catch (err) {
    fail(rel, 'divs', 'No se pudo leer: ' + err.message);
    log('  FAIL divs      ' + rel + ' -> no se pudo leer');
    return;
  }

  var opens = (content.match(/<div/gi) || []).length;
  var closes = (content.match(/<\/div>/gi) || []).length;
  var diff = opens - closes;

  if (diff === 0) {
    pass();
    log('  PASS divs      ' + rel + ' (<div>=' + opens + ' </div>=' + closes + ')');
  } else {
    var reason = 'balance <div>=' + opens + ' </div>=' + closes + ' (diff=' + diff + ')';
    fail(rel, 'divs', reason);
    log('  FAIL divs      ' + rel + ' -> ' + reason);
  }
}

function verifyFile(abs, isDefaultHtml) {
  var rel = toPosix(path.relative(ROOT, abs));

  if (!fs.existsSync(abs)) {
    if (isDefaultHtml) {
      skipped.push(rel);
      log('  SKIP (no existe) ' + rel);
    } else {
      warnings.push('Archivo no encontrado: ' + rel);
      log('  SKIP (no existe) ' + rel);
    }
    return;
  }

  var ext = path.extname(abs).toLowerCase();

  if (ext === '.js') {
    checkSyntax(abs, rel);
    var posixRel = toPosix(path.relative(ROOT, abs));
    if (/^(api|scripts)\//.test(posixRel)) {
      checkAscii(abs, rel);
    }
  } else if (ext === '.html') {
    checkDivs(abs, rel);
  } else {
    warnings.push('Extension no soportada, se omite: ' + rel);
    log('  SKIP (extension) ' + rel);
  }
}

function main() {
  var args = process.argv.slice(2);
  var files = [];
  var isDefault = args.length === 0;

  if (!isDefault) {
    for (var a = 0; a < args.length; a += 1) {
      files.push(path.resolve(ROOT, args[a]));
    }
  } else {
    files = listDirFiles('api').concat(listDirFiles('scripts'));
    for (var h = 0; h < HTML_SET.length; h += 1) {
      files.push(path.resolve(ROOT, HTML_SET[h]));
    }
  }

  log('express_check - verificacion minima express');
  log('Raiz: ' + ROOT);
  log('Modo: ' + (isDefault ? 'set por defecto (api/*.js + scripts/*.js + HTML clave)' : 'archivos indicados'));
  log('Archivos a verificar: ' + files.length);
  log('');

  for (var i = 0; i < files.length; i += 1) {
    var abs = files[i];
    var isDefaultHtml = false;
    if (isDefault) {
      var base = path.basename(abs).toLowerCase();
      for (var j = 0; j < HTML_SET.length; j += 1) {
        if (HTML_SET[j].toLowerCase() === base && path.extname(abs).toLowerCase() === '.html') {
          isDefaultHtml = true;
          break;
        }
      }
    }
    verifyFile(abs, isDefaultHtml);
  }

  log('');
  if (warnings.length > 0) {
    log('Advertencias:');
    for (var w = 0; w < warnings.length; w += 1) {
      log('  WARN ' + warnings[w]);
    }
    log('');
  }

  if (failures.length > 0) {
    log('Fallos:');
    for (var f = 0; f < failures.length; f += 1) {
      log('  FAIL [' + failures[f].check + '] ' + failures[f].file + ' -> ' + failures[f].reason);
    }
    log('');
  }

  log('Resumen: PASS ' + passChecks + ', FAIL ' + failChecks +
    ' (omitidos ' + skipped.length + ')');

  process.exitCode = failChecks > 0 ? 1 : 0;
}

main();
