// scripts/ejecucion/test-paginas-medellin.js
//
// Lanza el smoke test de cada una de las 36 fichas de Medellin indexadas en
// ficha/_indice-medellin.json.
//
// Contrato:
//   - Para cada slug busca scripts/smoke_test_<slug>.js y sus variantes de
//     nombre (guiones -> guiones bajos, con y sin sufijo -medellin).
//   - Si no existe ninguno, el slug se lista como "pendiente" y NO rompe el
//     proceso.
//   - Ejecuta los existentes en secuencia con el mismo binario de Node.
//   - Salida final: "PASS n/n, pendientes m". Exit code 0 solo si todos los
//     smoke tests existentes pasan.
//
// Uso:
//   node scripts/ejecucion/test-paginas-medellin.js [--timeout=120000]
//
// ASCII-safe: 0 bytes > 127.

var fs = require('fs');
var path = require('path');
var child = require('child_process');

var ROOT = path.resolve(__dirname, '..', '..');
var SCRIPTS_DIR = path.join(ROOT, 'scripts');
var INDEX_FILE = path.join(ROOT, 'ficha', '_indice-medellin.json');

function argValue(name, def) {
  var hit = process.argv.slice(2).filter(function (a) { return a.indexOf('--' + name + '=') === 0; })[0];
  if (!hit) return def;
  return hit.split('=')[1];
}

function loadIndex() {
  if (!fs.existsSync(INDEX_FILE)) {
    console.error('[FAIL] no existe ficha/_indice-medellin.json; corre antes indexar-prompt-medellin.js');
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(INDEX_FILE, 'utf8'));
}

function candidates(slug) {
  var base = slug.replace(/-medellin$/, '');
  var names = [slug, base];
  var out = [];
  names.forEach(function (n) {
    [n, n.replace(/-/g, '_')].forEach(function (v) {
      var f = 'smoke_test_' + v + '.js';
      if (out.indexOf(f) === -1) out.push(f);
    });
  });
  var seen = {};
  return out.filter(function (f) {
    if (seen[f]) return false;
    seen[f] = true;
    return fs.existsSync(path.join(SCRIPTS_DIR, f));
  });
}

function runSmoke(fileRel, timeoutMs) {
  var res = child.spawnSync(process.execPath, [path.join(SCRIPTS_DIR, fileRel)], {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: timeoutMs,
    maxBuffer: 8 * 1024 * 1024
  });
  var salida = ((res.stdout || '') + (res.stderr || '')).trim();
  var lines = salida ? salida.split(/\r?\n/) : [];
  return {
    archivo: fileRel,
    status: res.status,
    ok: res.status === 0,
    error: res.error ? String(res.error.message) : '',
    resumen: lines.length ? lines[lines.length - 1].slice(0, 160) : ''
  };
}

function main() {
  var timeoutMs = parseInt(argValue('timeout', '120000'), 10);
  if (!isFinite(timeoutMs) || timeoutMs <= 0) timeoutMs = 120000;

  var index = loadIndex();
  var ejecutados = 0;
  var pasados = 0;
  var pendientes = [];
  var fallidos = [];

  index.forEach(function (e) {
    var slug = e.slug;
    var found = candidates(slug);
    if (!found.length) {
      pendientes.push(slug);
      console.log('PENDIENTE ' + slug + ' (sin smoke_test)');
      return;
    }
    found.forEach(function (fileRel) {
      var r = runSmoke(fileRel, timeoutMs);
      ejecutados++;
      if (r.ok) {
        pasados++;
        console.log('PASS ' + slug + ' <- ' + fileRel);
      } else {
        fallidos.push({ slug: slug, archivo: fileRel, status: r.status, resumen: r.resumen });
        console.log('FAIL ' + slug + ' <- ' + fileRel + ' (exit ' + r.status + (r.error ? ', ' + r.error : '') +
          ')' + (r.resumen ? ' | ' + r.resumen : ''));
      }
    });
  });

  console.log('---');
  console.log('PASS ' + pasados + '/' + ejecutados + ', pendientes ' + pendientes.length);
  if (pendientes.length) console.log('pendientes: ' + pendientes.join(', '));
  if (fallidos.length) {
    console.log('fallidos:');
    fallidos.forEach(function (x) {
      console.log('  - ' + x.slug + ' (' + x.archivo + ') exit ' + x.status);
    });
  }

  process.exit(fallidos.length === 0 ? 0 : 1);
}

main();
