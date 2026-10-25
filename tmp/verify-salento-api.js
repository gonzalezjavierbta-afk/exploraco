// tmp/verify-salento-api.js - resolve titles via Commons API imageinfo (one batch), then curl -L HEAD code
// ASCII-safe (ADR-002). Escritura solo en tmp/.
var fs = require('fs');
var cp = require('child_process');
var f = JSON.parse(fs.readFileSync(__dirname + '/ficha-salento.json', 'utf8'));
var UA = 'ExploraCO-ficha-verify/1.0 (https://exploraco.co; ops@exploraco.co)';

var titles = [];
f.FOTOS_SUGERIDAS.forEach(function (t) { t.nombres_archivo_wikimedia.forEach(function (n) { titles.push(n); }); });
var api = 'https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=url|size&iiurlwidth=1600&titles=' + encodeURIComponent(titles.join('|'));

var raw = cp.execFileSync('curl.exe', ['-s', '-L', '--max-time', '60', '-H', 'User-Agent: ' + UA, api], { encoding: 'utf8' });
fs.writeFileSync(__dirname + '/commons-salento.json', raw);
var j = JSON.parse(raw);
var pages = j.query && j.query.pages ? j.query.pages : {};
var map = {};
Object.keys(pages).forEach(function (k) {
  var p = pages[k];
  if (p.missing !== undefined || !p.imageinfo) { map[p.title] = null; return; }
  map[p.title] = p.imageinfo[0].thumburl || p.imageinfo[0].url;
});

function code(url) {
  try {
    var out = cp.execFileSync('curl.exe', ['-s', '-L', '-o', 'NUL', '-w', '%{http_code}', '--max-time', '45', '-H', 'User-Agent: ' + UA, url], { encoding: 'utf8' });
    return String(out).trim();
  } catch (e) { return 'ERR'; }
}

// normalize: API returns titles with underscores -> spaces, first char upper
function norm(n) {
  var t = n.replace(/^File:/, '').replace(/_/g, ' ');
  return 'File:' + t.charAt(0).toUpperCase() + t.slice(1);
}

console.log('MISSING_KEYS=' + Object.keys(map).length);
Object.keys(map).forEach(function (k) { console.log('API | ' + k + ' | ' + (map[k] ? map[k] : 'MISSING')); });

f.FOTOS_SUGERIDAS.forEach(function (t, i) {
  var picked = null;
  t.nombres_archivo_wikimedia.forEach(function (n) {
    var u = map[norm(n)] || map[n] || null;
    if (u && !picked) { picked = { name: n, url: u }; }
  });
  if (!picked) { console.log('RESULT | ' + (i + 1) + ' | SIN MATCH'); return; }
  var c = code(picked.url);
  console.log('RESULT | ' + (i + 1) + ' | ' + picked.name + ' | ' + picked.url + ' | ' + c);
});
