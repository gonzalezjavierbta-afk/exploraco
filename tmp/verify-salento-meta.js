// tmp/verify-salento-meta.js - sizes of found files + propose real Commons filenames for missing themes
var fs = require('fs');
var cp = require('child_process');
var UA = 'ExploraCO-ficha-verify/1.0 (https://exploraco.co; ops@exploraco.co)';
var j = JSON.parse(fs.readFileSync(__dirname + '/commons-salento.json', 'utf8'));
var pages = j.query.pages;
Object.keys(pages).forEach(function (k) {
  var p = pages[k];
  if (p.missing !== undefined) return;
  var ii = p.imageinfo[0];
  console.log('META | ' + p.title + ' | ' + ii.width + 'x' + ii.height + ' | ' + ii.size + ' bytes | ' + ii.url.split('?')[0]);
});

function search(q) {
  var api = 'https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrnamespace=6&gsrlimit=5&gsrsearch=' + encodeURIComponent(q);
  var raw = cp.execFileSync('curl.exe', ['-s', '-L', '--max-time', '60', '-H', 'User-Agent: ' + UA, api], { encoding: 'utf8' });
  var r = JSON.parse(raw);
  var ps = (r.query && r.query.pages) ? r.query.pages : {};
  console.log('SEARCH | ' + q);
  Object.keys(ps).forEach(function (k) { console.log('  CAND | ' + ps[k].title); });
  cp.execFileSync('powershell.exe', ['-NoProfile', '-Command', 'Start-Sleep -Seconds 2']);
}
search('Salento calle real Quindio');
search('Salento willys jeep Quindio');
search('Salento iglesia Quindio');
