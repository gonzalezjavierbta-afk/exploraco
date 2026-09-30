'use strict';
/*
 * scripts/rebrand/codemod-latawel.js
 * Re-skineo de identidad ExploraCO -> LATAWEL para los HTML de la raiz.
 *
 * Uso:
 *   node scripts/rebrand/codemod-latawel.js            (dry-run, no escribe)
 *   node scripts/rebrand/codemod-latawel.js --apply    (escribe los HTML)
 *
 * Reglas:
 *   R1 logo markup   R2 CSS del logo   R3 colores
 *   R4 texto marca   R5 dominio        R6 <head>
 *   R7 tipografia: sin cambios.
 *
 * CommonJS, ASCII-safe, idempotente.
 */

var fs = require('fs');
var path = require('path');

var APPLY = process.argv.indexOf('--apply') !== -1;
var ROOT = path.resolve(__dirname, '..', '..');
var EXCLUDE = { 'admin.html': true };

var DARK = ['tl', 'hlogo', 'hlogo2', 'md-logo', 'gate-logo', 'tb-logo', 'logo', 'flogo', 'bltop', 'btop'];

var LOGO_LITERAL = 'EXPLORA<em>CO</em>';
var VAR_WHITE = '/assets/brand/latawel-logo-horizontal-white.png';
var VAR_COLOR = '/assets/brand/latawel-logo-horizontal.png';
var OG_IMAGE = 'https://latawel.com/assets/brand/og/latawel-og-1200x630.png';

var EN_DASH = '\u2013';
var EM_DASH = '\u2014';
var CYR_O_UPPER = '\u041e';
var CYR_O_LOWER = '\u043e';

var PROT_PREFIX = '\u0001P';
var PROT_SUFFIX = '\u0001';

var DENY = [
  'window.ExploraCO',
  'window.onExploraCOUpdate',
  'exploraco-share-style',
  'exploraco12345',
  'exploraco.vercel.app',
  'exploraco desarrollo'
];

var HEX_MAP = {
  '#E8A020': '#FF4A00',
  '#FFB400': '#FF4A00',
  '#F5B301': '#FF4A00',
  '#C8860A': '#FFB84D',
  '#B98A2F': '#FFB84D',
  '#B8860B': '#FFB84D',
  '#A8873A': '#FFB84D',
  '#8A6D1F': '#FFB84D',
  '#E8C36A': '#FFB84D',
  '#FDF3E0': '#E5E7EB',
  '#FFF7E6': '#E5E7EB',
  '#FDF1D7': '#E5E7EB',
  '#F5E9D0': '#E5E7EB',
  '#EACB7F': '#E5E7EB',
  '#F5D28A': '#E5E7EB',
  '#F5E6D0': '#E5E7EB',
  '#F8F7F3': '#E5E7EB',
  '#FBF8F2': '#E5E7EB',
  '#EDE8E0': '#E5E7EB',
  '#E5E3DD': '#E5E7EB',
  '#EEE': '#E5E7EB',
  '#E2D9CC': '#E5E7EB',
  '#FBF7F1': '#E5E7EB',
  '#111': '#0F1419',
  '#0A1628': '#0F1419',
  '#101623': '#0F1419',
  '#1A2E4A': '#0F1419',
  '#223344': '#0F1419',
  '#4A3410': '#0F1419'
};

var NEW_PALETTE = { 'FF4A00': true, 'FFB84D': true, 'E5E7EB': true, '0F1419': true };

/* ---------- utilidades de conteo ---------- */

function repStr(s, find, repl) {
  var parts = s.split(find);
  return { text: parts.join(repl), n: parts.length - 1 };
}

function repRe(s, re, repl) {
  var n = 0;
  var text = s.replace(re, function () {
    n++;
    if (typeof repl === 'function') return repl.apply(null, arguments);
    return repl;
  });
  return { text: text, n: n };
}

/* ---------- denylist ---------- */

function protect(s) {
  DENY.forEach(function (lit, i) {
    s = s.split(lit).join(PROT_PREFIX + i + PROT_SUFFIX);
  });
  return s;
}

function restore(s) {
  DENY.forEach(function (lit, i) {
    s = s.split(PROT_PREFIX + i + PROT_SUFFIX).join(lit);
  });
  return s;
}

/* ---------- R1: logo markup ---------- */

function fixLogo(s, cssText, report) {
  var out = '';
  var idx = 0;
  var n = 0;
  while (true) {
    var i = s.indexOf(LOGO_LITERAL, idx);
    if (i < 0) break;
    var before = s.slice(0, i);
    var lt = before.lastIndexOf('<');
    var tagOpen = lt >= 0 ? before.slice(lt) : '';
    var cm = tagOpen.match(/class="([^"]*)"/);
    var classes = cm ? cm[1].split(/\s+/).filter(function (c) { return c.length > 0; }) : [];
    var variant = variantFor(classes, cssText);
    report.logoVariants[variant] = (report.logoVariants[variant] || 0) + 1;
    var url = variant === 'white' ? VAR_WHITE : VAR_COLOR;
    out += s.slice(idx, i);
    out += '<img class="latawel-logo" src="' + url + '" alt="LATAWEL" height="30">';
    idx = i + LOGO_LITERAL.length;
    n++;
  }
  out += s.slice(idx);
  return { text: out, n: n };
}

function variantFor(classes, cssText) {
  var i;
  for (i = 0; i < classes.length; i++) {
    if (DARK.indexOf(classes[i]) >= 0) return 'white';
  }
  var sawLight = false;
  for (i = 0; i < classes.length; i++) {
    if (cssBgIsDark(cssText, classes[i]) === false) sawLight = true;
  }
  return sawLight ? 'color' : 'white';
}

function cssBgIsDark(css, cls) {
  var esc = cls.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  var re = new RegExp('\\.' + esc + '\\s*\\{([^}]*)\\}', 'i');
  var m = css.match(re);
  if (!m) return null;
  var bm = m[1].match(/background(?:-color)?\s*:\s*([^;]+)/i);
  if (!bm) return null;
  var val = bm[1].trim().toLowerCase();
  if (val.indexOf('var(--black') >= 0 || val.indexOf('var(--dark') >= 0) return true;
  var rm = val.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (rm) {
    var r = parseInt(rm[1], 10), g = parseInt(rm[2], 10), b = parseInt(rm[3], 10);
    return (r + g + b) < 260;
  }
  var hm = val.match(/#([0-9a-f]{6}|[0-9a-f]{3})/i);
  if (hm) return isDarkHex(hm[1]);
  return false;
}

function isDarkHex(h) {
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  var r = parseInt(h.substr(0, 2), 16);
  var g = parseInt(h.substr(2, 2), 16);
  var b = parseInt(h.substr(4, 2), 16);
  return (r + g + b) < 260;
}

function extractCss(s) {
  var css = '';
  var re = /<style[^>]*>([\s\S]*?)<\/style>/gi;
  var m;
  while ((m = re.exec(s)) !== null) css += '\n' + m[1];
  return css;
}

/* ---------- R6: head ---------- */

function fixImageMeta(s, attr, val) {
  var re = new RegExp('<meta[^>]*' + attr + '="' + val + '"(?!:)[^>]*>', 'i');
  var m = s.match(re);
  if (!m) return { text: s, existed: false, replaced: false };
  var tag = m[0];
  var cm = tag.match(/content="([^"]*)"/i);
  if (cm && /unsplash\.com|placeholder|placehold|dummyimage/i.test(cm[1])) {
    var newTag = tag.replace(cm[0], 'content="' + OG_IMAGE + '"');
    return { text: s.replace(tag, newTag), existed: true, replaced: true };
  }
  return { text: s, existed: true, replaced: false };
}

function fixHead(s, report) {
  if (s.indexOf('/assets/brand/favicon/favicon.ico') === -1) {
    var fav = '\n<link rel="icon" href="/assets/brand/favicon/favicon.ico">'
      + '\n<link rel="icon" type="image/png" sizes="32x32" href="/assets/brand/favicon/favicon-32.png">'
      + '\n<link rel="icon" type="image/png" sizes="16x16" href="/assets/brand/favicon/favicon-16.png">'
      + '\n<link rel="apple-touch-icon" sizes="180x180" href="/assets/brand/favicon/favicon-180.png">\n';
    var rFav = repRe(s, /<\/head>/i, fav + '</head>');
    if (rFav.n > 0) { report.faviconAdded = true; s = rFav.text; }
  }

  var og = fixImageMeta(s, 'property', 'og:image');
  s = og.text;
  if (!og.existed) {
    var meta = '\n<meta property="og:image" content="' + OG_IMAGE + '">\n';
    var rAdd = repRe(s, /<\/head>/i, meta + '</head>');
    if (rAdd.n > 0) { report.ogImageAdded = true; s = rAdd.text; }
  } else if (og.replaced) {
    report.ogImageReplaced = true;
  }

  var tw = fixImageMeta(s, 'name', 'twitter:image');
  s = tw.text;
  if (tw.replaced) report.twitterImageReplaced = true;

  return s;
}

/* ---------- hex dorado/crema restante ---------- */

function findGoldHex(s) {
  var out = {};
  var re = /#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})(?![0-9a-fA-F])/g;
  var m;
  while ((m = re.exec(s)) !== null) {
    var h = m[1].toUpperCase();
    if (NEW_PALETTE[h]) continue;
    var r, g, b;
    if (h.length === 3) {
      r = parseInt(h[0] + h[0], 16);
      g = parseInt(h[1] + h[1], 16);
      b = parseInt(h[2] + h[2], 16);
    } else {
      r = parseInt(h.substr(0, 2), 16);
      g = parseInt(h.substr(2, 2), 16);
      b = parseInt(h.substr(4, 2), 16);
    }
    if (r >= 180 && g >= 140 && b <= 140) out['#' + h] = true;
  }
  return Object.keys(out);
}

/* ---------- procesamiento por archivo ---------- */

function processFile(file) {
  var full = path.join(ROOT, file);
  var orig = fs.readFileSync(full, 'utf8');
  var s = orig;

  var report = {
    file: file,
    fragment: file.charAt(0) === '_',
    hasHead: /<head[\s>]/i.test(s),
    logoVariants: {},
    counts: { R1: 0, R2: 0, R3: 0, R4: 0, R5: 0 },
    faviconAdded: false,
    ogImageReplaced: false,
    ogImageAdded: false,
    twitterImageReplaced: false,
    goldLeft: [],
    changed: false
  };

  var cssText = extractCss(orig);

  /* R1 logo markup (antes de reemplazos de texto) */
  var r1 = fixLogo(s, cssText, report);
  s = r1.text;
  report.counts.R1 = r1.n;

  /* proteger identificadores */
  s = protect(s);

  /* R4 separadores de titulo */
  var seps = [
    ' ' + EN_DASH + ' ExploraCO',
    ' ' + EM_DASH + ' ExploraCO',
    ' - ExploraCO',
    EN_DASH + ' ExploraCO',
    EM_DASH + ' ExploraCO'
  ];
  seps.forEach(function (pat) {
    var r = repStr(s, pat, ' | LATAWEL');
    s = r.text;
    report.counts.R4 += r.n;
  });

  /* R4 cirilico */
  var rCyr = repRe(s, new RegExp('(?:ExploraC|EXPLORAC)(?:' + CYR_O_UPPER + '|' + CYR_O_LOWER + ')', 'g'), 'LATAWEL');
  s = rCyr.text;
  report.counts.R4 += rCyr.n;

  /* R5 dominio */
  [
    ['content="exploraco.co"', 'content="latawel.com"'],
    ['https://exploraco.co', 'https://latawel.com'],
    ['http://exploraco.co', 'https://latawel.com']
  ].forEach(function (pair) {
    var r = repStr(s, pair[0], pair[1]);
    s = r.text;
    report.counts.R5 += r.n;
  });

  /* R4 texto de marca */
  var rExpl = repRe(s, /ExploraCO/g, 'LATAWEL');
  s = rExpl.text;
  report.counts.R4 += rExpl.n;
  var rExplU = repRe(s, /EXPLORACO/g, 'LATAWEL');
  s = rExplU.text;
  report.counts.R4 += rExplU.n;

  /* restaurar identificadores */
  s = restore(s);

  /* R3 colores hex */
  Object.keys(HEX_MAP).forEach(function (k) {
    var re = new RegExp(k + '(?![0-9a-fA-F])', 'gi');
    var r = repRe(s, re, HEX_MAP[k]);
    s = r.text;
    report.counts.R3 += r.n;
  });
  var rRgba = repRe(s, /rgba\(\s*232\s*,\s*160\s*,\s*32\s*,/gi, 'rgba(255,74,0,');
  s = rRgba.text;
  report.counts.R3 += rRgba.n;

  /* R2 CSS del logo */
  var r2 = repRe(s, /\.(tl|hlogo2|hlogo|md-logo|gate-logo|tb-logo|logo|flogo|bltop|btop) em\{[^}]*\}/g, function (m, cls) {
    var h = cls === 'flogo' ? '34px' : '30px';
    return '.' + cls + ' img{display:block;height:' + h + ';width:auto}';
  });
  s = r2.text;
  report.counts.R2 = r2.n;

  /* R6 head */
  if (report.hasHead) s = fixHead(s, report);

  report.goldLeft = findGoldHex(s);
  report.changed = s !== orig;

  if (APPLY && report.changed) fs.writeFileSync(full, s, 'utf8');

  return report;
}

/* ---------- reporte ---------- */

function main() {
  var files = fs.readdirSync(ROOT).filter(function (f) {
    return /\.html$/i.test(f) && !EXCLUDE[f];
  }).sort();

  var reports = files.map(processFile);

  var totals = { files: reports.length, R1: 0, R2: 0, R3: 0, R4: 0, R5: 0, favicon: 0, ogReplaced: 0, ogAdded: 0, twReplaced: 0, changed: 0 };
  reports.forEach(function (r) {
    totals.R1 += r.counts.R1;
    totals.R2 += r.counts.R2;
    totals.R3 += r.counts.R3;
    totals.R4 += r.counts.R4;
    totals.R5 += r.counts.R5;
    if (r.faviconAdded) totals.favicon++;
    if (r.ogImageReplaced) totals.ogReplaced++;
    if (r.ogImageAdded) totals.ogAdded++;
    if (r.twitterImageReplaced) totals.twReplaced++;
    if (r.changed) totals.changed++;
  });

  console.log('== codemod LATAWEL: ' + (APPLY ? 'APPLY (escribe)' : 'DRY-RUN (no escribe)') + ' ==');
  console.log('Raiz: ' + ROOT);
  console.log('Archivos HTML escaneados (excluye admin.html): ' + reports.length);
  console.log('');

  reports.forEach(function (r) {
    var lv = Object.keys(r.logoVariants).map(function (v) { return v + 'x' + r.logoVariants[v]; }).join(',') || '-';
    console.log((r.fragment ? '[FRAG] ' : '[PAGE] ') + r.file
      + ' | logo:' + lv
      + ' | R1:' + r.counts.R1 + ' R2:' + r.counts.R2 + ' R3:' + r.counts.R3 + ' R4:' + r.counts.R4 + ' R5:' + r.counts.R5
      + ' | favicon:' + (r.faviconAdded ? 'yes' : 'no')
      + ' og:img:' + (r.ogImageReplaced ? 'replaced' : (r.ogImageAdded ? 'added' : 'kept'))
      + ' tw:img:' + (r.twitterImageReplaced ? 'replaced' : 'kept')
      + (r.changed ? '' : ' (sin cambios)'));
  });

  console.log('');
  console.log('--- TOTALES ---');
  console.log('Archivos escaneados  : ' + totals.files);
  console.log('R1 logo markup       : ' + totals.R1);
  console.log('R2 CSS logo          : ' + totals.R2);
  console.log('R3 colores           : ' + totals.R3);
  console.log('R4 texto marca       : ' + totals.R4);
  console.log('R5 dominio           : ' + totals.R5);
  console.log('Favicons agregados   : ' + totals.favicon);
  console.log('og:image reemplazado : ' + totals.ogReplaced);
  console.log('og:image agregado    : ' + totals.ogAdded);
  console.log('twitter:image reempl.: ' + totals.twReplaced);
  console.log('Archivos con cambios : ' + totals.changed);
  console.log('');

  console.log('--- EXCEPCIONES / REVISION ---');
  var colorFiles = reports.filter(function (r) { return r.logoVariants.color; });
  console.log('Logo variante color (no white): ' + (colorFiles.length ? colorFiles.map(function (r) { return r.file; }).join(', ') : 'ninguno'));

  var goldFiles = reports.filter(function (r) { return r.goldLeft.length > 0; });
  if (goldFiles.length) {
    goldFiles.forEach(function (r) {
      console.log('Hex dorado/crema restante en ' + r.file + ': ' + r.goldLeft.join(' '));
    });
  } else {
    console.log('Hex dorado/crema restante: ninguno');
  }

  var noHead = reports.filter(function (r) { return !r.hasHead; });
  console.log('Sin <head> (R6 omitida): ' + (noHead.length ? noHead.map(function (r) { return r.file; }).join(', ') : 'ninguno'));

  var noChange = reports.filter(function (r) { return !r.changed; });
  console.log('Sin cambios: ' + (noChange.length ? noChange.map(function (r) { return r.file; }).join(', ') : 'ninguno'));

  if (!APPLY) console.log('');
  if (!APPLY) console.log('Modo DRY-RUN: no se escribio ningun archivo. Usa --apply para aplicar.');
}

main();
