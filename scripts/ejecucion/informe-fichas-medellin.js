// scripts/ejecucion/informe-fichas-medellin.js
//
// Genera un informe de contrato de las fichas de Medellin ya indexadas en
// ficha/ficha-<slug>.json (indice: ficha/_indice-medellin.json).
//
// Contrato evaluado (alineado con scripts/validate_ficha.js):
//   - FAQS con al menos 5 items
//   - FOTOS_SUGERIDAS con al menos 5 items y exactamente 1 con es_hero=true
//   - BASE.slug, BASE.categoria_slug y resto de claves raiz presentes
//
// Escribe ficha/_informe-fichas.json y resume por consola.
//
// Uso:
//   node scripts/ejecucion/informe-fichas-medellin.js [--strict]
//
// Exit code 0 = informe generado (con --strict: 1 si alguna ficha no cumple).
// ASCII-safe: 0 bytes > 127.

var fs = require('fs');
var path = require('path');

var ROOT = path.resolve(__dirname, '..', '..');
var FICHA_DIR = path.join(ROOT, 'ficha');
var INDEX_FILE = path.join(FICHA_DIR, '_indice-medellin.json');
var REPORT_FILE = path.join(FICHA_DIR, '_informe-fichas.json');

var ROOT_KEYS = ['BASE', 'TAGS', 'FAQS', 'FOTOS_SUGERIDAS', 'FUENTES'];
var MIN_FAQS = 5;
var MIN_FOTOS = 5;

function toAsciiJson(value) {
  var txt = JSON.stringify(value, null, 2);
  txt = txt.replace(/[^\x00-\x7F]/g, function (ch) {
    var hex = ch.charCodeAt(0).toString(16);
    while (hex.length < 4) hex = '0' + hex;
    return '\\u' + hex;
  });
  return txt.replace(/\r?\n/g, '\r\n') + '\r\n';
}

function writeAsciiJson(file, value) {
  var text = toAsciiJson(value);
  for (var i = 0; i < text.length; i++) {
    if (text.charCodeAt(i) > 127) throw new Error('contenido no ASCII en ' + file);
  }
  fs.writeFileSync(file, text, 'utf8');
}

function loadIndex() {
  if (!fs.existsSync(INDEX_FILE)) {
    console.error('[FAIL] no existe ficha/_indice-medellin.json; corre antes indexar-prompt-medellin.js');
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(INDEX_FILE, 'utf8'));
}

function pad(s, n) {
  s = String(s);
  while (s.length < n) s += ' ';
  return s.slice(0, n);
}

function evaluar(slug, archivo) {
  var full = path.join(ROOT, archivo);
  var out = {
    slug: slug,
    archivo: archivo,
    existe: fs.existsSync(full),
    parsea: false,
    categoria_slug: null,
    faqs: 0,
    fotos: 0,
    es_hero: 0,
    tiene_subcategoria: false,
    subcategoria: null,
    cumple_contrato: false,
    motivos: []
  };
  if (!out.existe) {
    out.motivos.push('archivo ausente');
    return out;
  }
  var data;
  try {
    data = JSON.parse(fs.readFileSync(full, 'utf8'));
  } catch (e) {
    out.motivos.push('JSON invalido');
    return out;
  }
  out.parsea = true;

  ROOT_KEYS.forEach(function (k) {
    if (!(k in data)) out.motivos.push('falta clave raiz ' + k);
  });

  var base = data.BASE || {};
  out.categoria_slug = base.categoria_slug || null;
  if (!base.slug) out.motivos.push('falta BASE.slug');
  if (!out.categoria_slug) out.motivos.push('falta BASE.categoria_slug');

  var tags = data.TAGS || {};
  out.tiene_subcategoria = Object.prototype.hasOwnProperty.call(tags, 'subcategoria') &&
    typeof tags.subcategoria === 'string' && tags.subcategoria.length > 0;
  out.subcategoria = out.tiene_subcategoria ? tags.subcategoria : null;

  out.faqs = Array.isArray(data.FAQS) ? data.FAQS.length : 0;
  out.fotos = Array.isArray(data.FOTOS_SUGERIDAS) ? data.FOTOS_SUGERIDAS.length : 0;
  out.es_hero = Array.isArray(data.FOTOS_SUGERIDAS)
    ? data.FOTOS_SUGERIDAS.filter(function (f) { return f && f.es_hero; }).length
    : 0;

  if (out.faqs < MIN_FAQS) out.motivos.push('FAQS ' + out.faqs + '/' + MIN_FAQS);
  if (out.fotos < MIN_FOTOS) out.motivos.push('FOTOS ' + out.fotos + '/' + MIN_FOTOS);
  if (out.es_hero !== 1) out.motivos.push('es_hero=' + out.es_hero + ' (debe ser 1)');

  out.cumple_contrato = out.motivos.length === 0;
  return out;
}

function main() {
  var strict = process.argv.indexOf('--strict') !== -1;
  var index = loadIndex();

  var informe = {
    generado: new Date().toISOString(),
    contrato: {
      min_faqs: MIN_FAQS,
      min_fotos: MIN_FOTOS,
      es_hero_exactos: 1,
      referencia: 'scripts/validate_ficha.js'
    },
    total: index.length,
    cumplen: 0,
    fuera_de_contrato: [],
    fichas: []
  };

  var rows = [];
  index.forEach(function (e) {
    var r = evaluar(e.slug, e.archivo || ('ficha/ficha-' + e.slug + '.json'));
    informe.fichas.push(r);
    if (r.cumple_contrato) informe.cumplen++;
    else informe.fuera_de_contrato.push({ slug: r.slug, motivos: r.motivos });
    rows.push(r);
  });

  writeAsciiJson(REPORT_FILE, informe);

  console.log(pad('slug', 46) + pad('categoria', 10) + pad('faqs', 6) + pad('fotos', 7) +
    pad('hero', 6) + pad('subcat', 8) + 'contrato');
  console.log(new Array(90).join('-'));
  rows.forEach(function (r) {
    console.log(pad(r.slug, 46) + pad(r.categoria_slug || '-', 10) + pad(r.faqs, 6) +
      pad(r.fotos, 7) + pad(r.es_hero, 6) + pad(r.tiene_subcategoria ? 'si' : 'no', 8) +
      (r.cumple_contrato ? 'OK' : 'FUERA'));
  });

  console.log('---');
  console.log('cumplen contrato: ' + informe.cumplen + '/' + informe.total);
  console.log('fuera de contrato: ' + informe.fuera_de_contrato.length);
  if (informe.fuera_de_contrato.length) {
    console.log('detalle:');
    informe.fuera_de_contrato.forEach(function (x) {
      console.log('  - ' + x.slug + ': ' + x.motivos.join('; '));
    });
  }
  console.log('informe: ' + path.relative(ROOT, REPORT_FILE).replace(/\\/g, '/'));

  if (strict && informe.fuera_de_contrato.length) process.exit(1);
  process.exit(0);
}

main();
