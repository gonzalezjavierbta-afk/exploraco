// tmp/verify-salento-fotos.js - verificacion puntual HEAD/GET 200 (BUG-022)
// Solo lectura de tmp/ficha-salento.json + curl.exe. ASCII-safe (ADR-002).
var fs = require('fs');
var cp = require('child_process');
var f = JSON.parse(fs.readFileSync(__dirname + '/ficha-salento.json', 'utf8'));

function code(url) {
  try {
    var out = cp.execFileSync('curl.exe', ['-s', '-L', '-o', 'NUL', '-w', '%{http_code}', '--max-time', '30', url], { encoding: 'utf8' });
    return String(out).trim();
  } catch (e) { return 'ERR'; }
}

function filePath(name) {
  var t = name.replace(/^File:/, '');
  return 'https://commons.wikimedia.org/wiki/Special:FilePath/' + encodeURIComponent(t) + '?width=1600';
}

var temas = f.FOTOS_SUGERIDAS;
for (var i = 0; i < temas.length; i++) {
  var t = temas[i];
  var picked = null;
  for (var j = 0; j < t.nombres_archivo_wikimedia.length; j++) {
    var n = t.nombres_archivo_wikimedia[j];
    var u = filePath(n);
    var c = code(u);
    console.log('TRY | ' + (i + 1) + ' | ' + n + ' | ' + c);
    if ((c === '200') && !picked) { picked = { name: n, url: u, code: c }; }
  }
  console.log('RESULT | ' + (i + 1) + ' | ' + (picked ? picked.name + ' | ' + picked.url + ' | ' + picked.code : 'SIN MATCH 200'));
}

var fu = f.FUENTES;
for (var k = 0; k < fu.length; k++) {
  var c2 = code(fu[k].url);
  console.log('FUENTE | ' + fu[k].url + ' | ' + c2);
}
