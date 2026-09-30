// scripts/rebrand/audit-latawel.js
// Auditoria post-rebranding ExploraCO -> LATAWEL. Solo lectura, no escribe.
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const DIV = /<div\b/g;
const DIVC = /<\/div>/g;
const countDiv = (s) => ((s.match(DIV) || []).length - (s.match(DIVC) || []).length);

function gitHead(file) {
  try {
    return execFileSync('git', ['show', 'HEAD:' + file], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28 });
  } catch (e) {
    return null;
  }
}

function gitChanged() {
  try {
    const out = execFileSync('git', ['diff', '--name-only'], { cwd: ROOT, encoding: 'utf8' });
    return out.split(/\r?\n/).filter(Boolean);
  } catch (e) {
    return [];
  }
}

console.log('=== A. BALANCE DE DIVS (comparado con HEAD) ===');
let htmlCount = 0;
let divRegressions = 0;
for (const f of fs.readdirSync(ROOT)) {
  if (!f.endsWith('.html')) continue;
  htmlCount++;
  const cur = fs.readFileSync(path.join(ROOT, f), 'utf8');
  const head = gitHead(f);
  const a = countDiv(cur);
  const b = head === null ? a : countDiv(head);
  if (a !== b) {
    divRegressions++;
    console.log('  DELTA: ' + f + '  HEAD=' + b + ' NOW=' + a);
  }
}
console.log('  HTML revisados: ' + htmlCount + ' | regresiones de divs: ' + divRegressions);

console.log('');
console.log('=== B. COLORES LEGACY RESTANTES (repo, excl. node_modules/.git) ===');
const legacy = ['#E8A020', '#C8860A', '#FDF3E0', '#ffb400', 'rgba(232,160,32'];
const skipDir = new Set(['node_modules', '.git', 'tmp', 'logos', 'assets']);
const exts = new Set(['.html', '.js', '.css', '.json', '.txt', '.md', '.xml']);
let legacyHits = 0;
function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (skipDir.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { walk(p); continue; }
    if (!exts.has(path.extname(e.name))) continue;
    if (e.name === 'package-lock.json' || e.name === 'audit-latawel.js') continue;
    let s;
    try { s = fs.readFileSync(p, 'utf8'); } catch (_) { continue; }
    const low = s.toLowerCase();
    for (const pat of legacy) {
      const n = low.split(pat.toLowerCase()).length - 1;
      if (n) { console.log('  ' + path.relative(ROOT, p) + ' :: ' + pat + '=' + n); legacyHits += n; }
    }
  }
}
walk(ROOT);
console.log('  Total colores legacy restantes: ' + legacyHits);

console.log('');
console.log('=== C. ExploraCO FUERA DE LA DENYLIST ===');
const allow = [/window\.ExploraCO/, /onExploraCOUpdate/, /ExploraCO\./, /ExploraCO_/];
let brandLeft = 0;
function walkBrand(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (skipDir.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { walkBrand(p); continue; }
    if (!exts.has(path.extname(e.name))) continue;
    if (e.name === 'audit-latawel.js') continue;
    let s;
    try { s = fs.readFileSync(p, 'utf8'); } catch (_) { continue; }
    let i = 0;
    while ((i = s.indexOf('ExploraCO', i)) !== -1) {
      const ctx = s.slice(Math.max(0, i - 45), i + 45).replace(/\r?\n/g, ' ');
      if (!allow.some((r) => r.test(ctx))) {
        brandLeft++;
        if (brandLeft <= 30) console.log('  ' + path.relative(ROOT, p) + ' :: ...' + ctx + '...');
      }
      i += 9;
    }
  }
}
walkBrand(ROOT);
console.log('  Ocurrencias fuera de denylist: ' + brandLeft);

console.log('');
console.log('=== D. BALANCE DE LLAVES CSS ===');
for (const f of ['_motor.css', '_premium.css', 'assets/brand/latawel-brand.css']) {
  const p = path.join(ROOT, f);
  if (!fs.existsSync(p)) continue;
  const s = fs.readFileSync(p, 'utf8');
  const open = (s.match(/\{/g) || []).length;
  const close = (s.match(/\}/g) || []).length;
  console.log('  ' + f + ': {=' + open + ' }=' + close + ' delta=' + (open - close));
}

console.log('');
console.log('=== E. ARCHIVOS MODIFICADOS (git) ===');
const changed = gitChanged();
console.log('  Total: ' + changed.length);
