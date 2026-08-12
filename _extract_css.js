const fs = require('fs');
const src = fs.readFileSync('api/pagina-destino.js', 'utf8');
const m = src.match(/var CSS = ([\s\S]*?);\s*\/\/ -- COMPARADOR/);
if (!m) { console.error('CSS no encontrado'); process.exit(1); }
let css;
try { css = eval(m[1]); }
catch (e) { console.error('eval fallo: ' + e.message); process.exit(1); }
fs.writeFileSync('_motor.css', css, 'utf8');
console.log('CSS extraido: ' + css.length + ' chars');
