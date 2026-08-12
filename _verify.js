const fs = require('fs');
const html = fs.readFileSync(process.argv[2], 'utf8');

const open = (html.match(/<div\b/g) || []).length;
const close = (html.match(/<\/div>/g) || []).length;
console.log('divs abiertos: ' + open + ' | cerrados: ' + close + ' | balance: ' + (open - close));

const scripts = [...html.matchAll(/<script(?![^>]*src=)(?![^>]*ld\+json)[^>]*>([\s\S]*?)<\/script>/g)];
const inline = scripts.map(m => m[1]).join('\n');
fs.writeFileSync(process.argv[3], inline, 'utf8');
console.log('JS inline extraido: ' + inline.length + ' chars en ' + scripts.length + ' bloques');

const links = new Set();
for (const m of html.matchAll(/(?:href|src)="(\/[^"#?]*\.html|[^"]*\.html)"/g)) links.add(m[1]);
const missing = [...links].filter(l => !l.startsWith('/') ? false : !fs.existsSync('.' + l));
console.log('links locales: ' + [...links].join(', '));
console.log('faltantes: ' + (missing.length ? missing.join(', ') : 'ninguno'));
