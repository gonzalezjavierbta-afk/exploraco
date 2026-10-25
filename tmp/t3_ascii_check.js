// Escudo GOLD (ADR-002/ADR-005): ASCII-safety de los dos archivos tocados.
// no-ASCII=0, backticks=0, doble escape (\\uXXXX) en codigo = 0.
var fs = require('fs');
var archivos = process.argv.slice(2);
var fallos = 0;
archivos.forEach(function (f) {
  var b = fs.readFileSync(f);
  var noAscii = 0;
  var lineas = [];
  var linea = 1;
  for (var i = 0; i < b.length; i++) {
    if (b[i] === 10) { linea++; continue; }
    if (b[i] > 127) { noAscii++; if (lineas.length < 6) lineas.push(linea); }
  }
  var txt = b.toString('utf8');
  var backticks = (txt.match(/`/g) || []).length;
  var dobleEscape = (txt.match(/\\\\u[0-9a-fA-F]{4}/g) || []).length;
  var importEs = (txt.match(/^\s*(import|export)\s/gm) || []).length;
  var ok = noAscii === 0 && backticks === 0 && dobleEscape === 0 && importEs === 0;
  if (!ok) fallos++;
  console.log((ok ? 'PASS ' : 'FAIL ') + f
    + ' | no-ascii=' + noAscii + ' backticks=' + backticks
    + ' doble-escape=' + dobleEscape + ' import/export=' + importEs
    + (lineas.length ? ' | lineas: ' + lineas.join(',') : ''));
});
console.log(fallos === 0 ? 'RESULTADO: OK' : 'RESULTADO: ' + fallos + ' FALLOS');
process.exit(fallos === 0 ? 0 : 1);
