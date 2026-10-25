// tmp/verify-salento-extra.js - HEAD 200 for proposed replacements + one more willys search
var cp = require('child_process');
var UA = 'ExploraCO-ficha-verify/1.0 (https://exploraco.co; ops@exploraco.co)';
function code(url) {
  try { return String(cp.execFileSync('curl.exe', ['-s', '-L', '-o', 'NUL', '-w', '%{http_code}', '--max-time', '45', '-H', 'User-Agent: ' + UA, url], { encoding: 'utf8' })).trim(); } catch (e) { return 'ERR'; }
}
function api(path) {
  var raw = cp.execFileSync('curl.exe', ['-s', '-L', '--max-time', '60', '-H', 'User-Agent: ' + UA, 'https://commons.wikimedia.org/w/api.php?action=query&format=json&' + path], { encoding: 'utf8' });
  return JSON.parse(raw);
}
var props = ['File:Callerealsalento.JPG', 'File:Plaza Principal de Salento - Iglesia al fondo - panoramio.jpg', 'File:Atardecer en Salento..jpg'];
var q = api('prop=imageinfo&iiprop=url|size&iiurlwidth=1600&titles=' + encodeURIComponent(props.join('|')));
var ps = q.query.pages;
Object.keys(ps).forEach(function (k) {
  var p = ps[k];
  if (p.missing !== undefined) { console.log('PROP | ' + p.title + ' | MISSING'); return; }
  var ii = p.imageinfo[0];
  console.log('PROP | ' + p.title + ' | ' + ii.width + 'x' + ii.height + ' | ' + ii.size + ' | ' + ii.url.split('?')[0] + ' | ' + code(ii.url.split('?')[0]));
});
['Willys Quindio', 'Salento Colombia jeep', 'Salento plaza Quindio'].forEach(function (s) {
  cp.execFileSync('powershell.exe', ['-NoProfile', '-Command', 'Start-Sleep -Seconds 3']);
  var r = api('generator=search&gsrnamespace=6&gsrlimit=6&gsrsearch=' + encodeURIComponent(s));
  var pages = (r.query && r.query.pages) ? r.query.pages : {};
  console.log('SEARCH | ' + s);
  Object.keys(pages).forEach(function (k) { console.log('  CAND | ' + pages[k].title); });
});
