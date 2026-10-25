// scripts/ejecucion/verificar-fotos-fichas.js
//
// Verifica las fotos sugeridas de las fichas resolviendo cada entrada de
// FOTOS_SUGERIDAS[].nombres_archivo_wikimedia a la URL que el seed va a
// consumir de verdad: la MINIATURA de upload.wikimedia.org a ancho 1280.
//
// Por que la miniatura y no el original (BUG medido 2026-10-25):
//   Un HEAD contra la URL ORIGINAL de Commons (Special:FilePath, que redirige
//   al binario original) recibe HTTP 429 de forma cuasi universal: el CDN
//   limita a proposito las descargas anonimas de originales. Medido: los
//   mismos archivos en la ruta de miniatura responden 200 y un archivo
//   inexistente en esa misma ruta responde 404. El verificador anterior
//   media la URL equivocada, no las fichas.
//
// Como se construye la URL (determinista, sin api.php ni llamadas extra):
//   md5 = md5(utf8 del nombre con espacios -> guiones bajos)
//   https://upload.wikimedia.org/wikipedia/commons/thumb/<h0>/<h0h1>/<nombre>/<ancho>px-<nombre>
//   Es exactamente la forma que persiste el seed; no se pide a la API.
//
// Politica de red:
//   - HEAD con redirect: follow (se guarda la URL final en url_real).
//   - Peticiones espaciadas (--pausa, 300 ms por defecto) y maximamente
//     secuenciales: el CDN devuelve 429 si se le bombardea.
//   - Reintentos con espera corta ante 429 / 5xx (--intentos, 3 por defecto).
//   - Un 404 NO se reintenta: es la prueba de que el archivo no existe y debe
//     quedar como FAIL-404, distinguible del 429 de politica.
//
// Contrato:
//   - Recorre las fichas del indice ficha/_indice-medellin.json (36). Con
//     --todas recorre cualquier ficha/ficha-*.json del directorio. Con
//     --fichas=slug1,slug2 acota el lote.
//   - Solo lectura de red: HEAD, no descarga binarios.
//   - Escribe ficha/_informe-fotos.json con url_real por archivo.
//   - Salida en ASCII-safe (ADR-002).
//
// Uso:
//   node scripts/ejecucion/verificar-fotos-fichas.js [--todas]
//        [--fichas=slug1,slug2] [--ancho=1280] [--pausa=300]
//        [--intentos=3] [--limite=1]
//   node scripts/ejecucion/verificar-fotos-fichas.js --probar="File:X.jpg"
//        (control negativo: una sola URL ad-hoc, no escribe informe)
//
// Exit code 0 = todas las fichas del lote tienen al menos 1 foto PASS.
// Exit code 1 = alguna ficha sin ninguna foto PASS (o error de entrada).
// ASCII-safe: 0 bytes > 127.

var fs = require('fs');
var path = require('path');
var crypto = require('crypto');

var ROOT = path.resolve(__dirname, '..', '..');
var FICHA_DIR = path.join(ROOT, 'ficha');
var INDEX_FILE = path.join(FICHA_DIR, '_indice-medellin.json');
var REPORT_FILE = path.join(FICHA_DIR, '_informe-fotos.json');

var THUMB_BASE = 'https://upload.wikimedia.org/wikipedia/commons/thumb/';
var UA = 'ExploraCO-ficha-check/1.1 (validacion de fichas del repo; Node fetch)';
var TIMEOUT_MS = 25000;
var ANCHO_DEF = 1280;
var PAUSA_DEF = 300;
var INTENTOS_DEF = 3;
var ESPERA_429_MS = 1200;

function argValue(name, def) {
  var hit = process.argv.slice(2).filter(function (a) { return a.indexOf('--' + name + '=') === 0; })[0];
  if (!hit) return def;
  return hit.split('=').slice(1).join('=');
}

function argAll(name) {
  return process.argv.slice(2).filter(function (a) { return a.indexOf('--' + name + '=') === 0; })
    .map(function (a) { return a.split('=').slice(1).join('='); });
}

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

function nombreNormalizado(nombre) {
  return String(nombre).replace(/^File:/i, '').replace(/ /g, '_');
}

function urlMiniatura(nombre, ancho) {
  var bare = nombreNormalizado(nombre);
  var hash = crypto.createHash('md5').update(bare, 'utf8').digest('hex');
  var enc = encodeURIComponent(bare);
  return THUMB_BASE + hash.charAt(0) + '/' + hash.substr(0, 2) + '/' + enc + '/' + ancho + 'px-' + enc;
}

function listFichas() {
  var usarTodas = process.argv.indexOf('--todas') !== -1;
  var solo = (argValue('fichas', '') || '').split(',').map(function (s) { return s.trim(); })
    .filter(function (s) { return s.length > 0; });
  var lista;
  if (!usarTodas && fs.existsSync(INDEX_FILE)) {
    var idx = JSON.parse(fs.readFileSync(INDEX_FILE, 'utf8'));
    lista = idx.map(function (e) {
      return { slug: e.slug, archivo: path.join(ROOT, e.archivo) };
    });
  } else {
    lista = fs.readdirSync(FICHA_DIR)
      .filter(function (f) { return /^ficha-.+\.json$/.test(f); })
      .sort()
      .map(function (f) {
        return { slug: f.replace(/^ficha-/, '').replace(/\.json$/, ''), archivo: path.join(FICHA_DIR, f) };
      });
  }
  if (solo.length) {
    lista = lista.filter(function (f) { return solo.indexOf(f.slug) !== -1; });
  }
  return lista;
}

function wikiTitles(ficha) {
  var out = [];
  (ficha.FOTOS_SUGERIDAS || []).forEach(function (foto) {
    (foto.nombres_archivo_wikimedia || []).forEach(function (n) {
      if (typeof n === 'string' && n.length && out.indexOf(n) === -1) out.push(n);
    });
  });
  return out;
}

function sleep(ms) {
  return new Promise(function (r) { setTimeout(r, ms); });
}

// Espaciado global: ninguna peticion arranca a menos de pausa ms de la anterior.
var ultimaPeticion = 0;
async function esperarTurno(pausa) {
  var delta = Date.now() - ultimaPeticion;
  if (delta < pausa) await sleep(pausa - delta);
  ultimaPeticion = Date.now();
}

async function headConReintentos(url, opts) {
  var ultimo = { status: 0, final: url, error: 'sin intento', intentos: 0 };
  for (var i = 1; i <= opts.intentos; i++) {
    await esperarTurno(opts.pausa);
    // AbortController explicito + clearTimeout: AbortSignal.timeout deja un
    // temporizador vivo y en Windows provoca un aborto de libuv al cerrar.
    var ctrl = new AbortController();
    var tid = setTimeout(function () { ctrl.abort(); }, TIMEOUT_MS);
    try {
      var res = await fetch(url, {
        method: 'HEAD',
        redirect: 'follow',
        headers: { 'User-Agent': UA },
        signal: ctrl.signal
      });
      ultimo = {
        status: res.status,
        final: res.url || url,
        error: res.ok ? '' : 'HTTP ' + res.status,
        intentos: i
      };
      if (res.status === 429 || res.status >= 500) {
        clearTimeout(tid);
        await sleep(ESPERA_429_MS * i);
        continue;
      }
      clearTimeout(tid);
      return ultimo;
    } catch (e) {
      clearTimeout(tid);
      ultimo = { status: 0, final: url, error: e.message, intentos: i };
      await sleep(ESPERA_429_MS * i);
    } finally {
      clearTimeout(tid);
    }
  }
  return ultimo;
}

function clasificar(h) {
  if (h.status === 200) return { estado: 'PASS', ok: true, motivo: '' };
  if (h.status === 404) {
    return { estado: '404_inexistente', ok: false, motivo: 'no existe en Commons (404)' };
  }
  if (h.status === 429) {
    return { estado: '429_politica', ok: false, motivo: 'rate limit del CDN tras ' + h.intentos + ' intentos (429)' };
  }
  if (h.status === 0) {
    return { estado: 'ERROR_RED', ok: false, motivo: h.error || 'error de red' };
  }
  return { estado: 'HTTP_' + h.status, ok: false, motivo: h.error || ('HTTP ' + h.status) };
}

async function checkArchivo(nombre, opts) {
  var url = urlMiniatura(nombre, opts.ancho);
  var h = await headConReintentos(url, opts);
  var c = clasificar(h);
  return {
    nombre: nombre,
    url_consulta: url,
    url_miniatura: url,
    url_real: c.ok ? (h.final || url) : null,
    status: h.status,
    intentos: h.intentos,
    estado: c.estado,
    ok: c.ok,
    motivo: c.motivo
  };
}

async function runLimited(items, limit, fn) {
  var out = new Array(items.length);
  var next = 0;
  var workers = [];
  var n = Math.max(1, Math.min(limit, items.length));
  for (var w = 0; w < n; w++) {
    workers.push((async function () {
      while (true) {
        var i = next++;
        if (i >= items.length) return;
        out[i] = await fn(items[i], i);
      }
    })());
  }
  await Promise.all(workers);
  return out;
}

function leerOpciones() {
  var ancho = parseInt(argValue('ancho', String(ANCHO_DEF)), 10);
  if (!isFinite(ancho) || ancho < 100) ancho = ANCHO_DEF;
  var pausa = parseInt(argValue('pausa', String(PAUSA_DEF)), 10);
  if (!isFinite(pausa) || pausa < 0) pausa = PAUSA_DEF;
  var intentos = parseInt(argValue('intentos', String(INTENTOS_DEF)), 10);
  if (!isFinite(intentos) || intentos < 1) intentos = INTENTOS_DEF;
  var limite = parseInt(argValue('limite', '1'), 10);
  if (!isFinite(limite) || limite < 1) limite = 1;
  return { ancho: ancho, pausa: pausa, intentos: intentos, limite: limite };
}

function resumenEstados(heads) {
  var r = { PASS: 0, '404_inexistente': 0, '429_politica': 0, otro: 0 };
  heads.forEach(function (h) {
    if (h.estado === 'PASS') r.PASS++;
    else if (h.estado === '404_inexistente') r['404_inexistente']++;
    else if (h.estado === '429_politica') r['429_politica']++;
    else r.otro++;
  });
  return r;
}

function detalleFallo(heads) {
  return heads.filter(function (h) { return !h.ok; })
    .map(function (h) { return h.estado + ':' + h.nombre; }).join('; ');
}

async function modoProbar(nombres, opts) {
  var fallos = 0;
  for (var i = 0; i < nombres.length; i++) {
    var r = await checkArchivo(nombres[i], opts);
    if (!r.ok) fallos++;
    console.log(r.estado + ' ' + r.status + ' (' + r.intentos + ' intento/s) ' + r.nombre);
    console.log('  url: ' + r.url_consulta);
  }
  process.exitCode = fallos === 0 ? 0 : 1;
}

async function main() {
  var opts = leerOpciones();

  if (!fs.existsSync(FICHA_DIR)) {
    console.error('[FAIL] no existe el directorio ficha/');
    process.exit(1);
  }

  var probar = argAll('probar');
  if (probar.length) return modoProbar(probar, opts);

  var fichas = listFichas();
  if (!fichas.length) {
    console.error('[FAIL] no se encontro ninguna ficha para el lote pedido');
    process.exit(1);
  }

  var report = {
    generado: new Date().toISOString(),
    resolucion: THUMB_BASE + '<h0>/<h0h1>/<archivo>/<ancho>px-<archivo>',
    metodo: 'HEAD a la miniatura de 1280 px de upload.wikimedia.org (redirect follow); url_real = URL final 200',
    ancho: opts.ancho,
    pausa_ms: opts.pausa,
    intentos: opts.intentos,
    total_fichas: fichas.length,
    total_archivos: 0,
    total_fotos: 0,
    archivos_pass: 0,
    archivos_fail: 0,
    archivos_fail_404: 0,
    archivos_fail_429: 0,
    archivos_fail_otro: 0,
    fotos_pass: 0,
    fotos_fail: 0,
    fichas_pass: 0,
    fichas_fail: 0,
    fichas: []
  };

  for (var i = 0; i < fichas.length; i++) {
    var f = fichas[i];
    var ficha;
    try {
      ficha = JSON.parse(fs.readFileSync(f.archivo, 'utf8'));
    } catch (e) {
      report.fichas.push({
        slug: f.slug,
        archivo: path.relative(ROOT, f.archivo).replace(/\\/g, '/'),
        pass: false, error: 'JSON invalido: ' + e.message, fotos: []
      });
      report.fichas_fail++;
      console.log('FAIL ' + f.slug + ' (JSON invalido) | 0 fotos PASS');
      continue;
    }

    var titles = wikiTitles(ficha);
    var heads = await runLimited(titles, opts.limite, async function (t) {
      return await checkArchivo(t, opts);
    });

    var fotos = (ficha.FOTOS_SUGERIDAS || []).map(function (foto, fi) {
      var archivos = (foto.nombres_archivo_wikimedia || []).map(function (n) {
        var hit = heads.filter(function (h) { return h.nombre === n; })[0];
        return hit || {
          nombre: n, url_consulta: null, url_miniatura: null, url_real: null,
          status: 0, intentos: 0, estado: 'SIN_RESOLVER', ok: false, motivo: 'no resuelto'
        };
      });
      var ok = archivos.filter(function (a) { return a.ok; }).length;
      return {
        indice: fi,
        tema: foto.tema || '',
        es_hero: !!foto.es_hero,
        archivos: archivos,
        ok: ok,
        pass: ok > 0,
        url_real: (archivos.filter(function (a) { return a.ok; })[0] || {}).url_real || null
      };
    });

    var cnt = resumenEstados(heads);
    var total = heads.length;
    var fotosOk = fotos.filter(function (p) { return p.pass; }).length;
    // PASS de ficha = al menos 1 foto con al menos 1 archivo verificado 200.
    var pass = fotosOk > 0;
    var passEstricto = total > 0 && cnt.PASS === total;

    report.total_archivos += total;
    report.total_fotos += fotos.length;
    report.archivos_pass += cnt.PASS;
    report.archivos_fail += (total - cnt.PASS);
    report.archivos_fail_404 += cnt['404_inexistente'];
    report.archivos_fail_429 += cnt['429_politica'];
    report.archivos_fail_otro += cnt.otro;
    report.fotos_pass += fotosOk;
    report.fotos_fail += (fotos.length - fotosOk);
    if (pass) report.fichas_pass++; else report.fichas_fail++;

    report.fichas.push({
      slug: f.slug,
      archivo: path.relative(ROOT, f.archivo).replace(/\\/g, '/'),
      pass: pass,
      pass_estricto: passEstricto,
      fotos_pass: fotosOk,
      fotos_total: fotos.length,
      archivos_ok: cnt.PASS,
      archivos_total: total,
      archivos_404: cnt['404_inexistente'],
      archivos_429: cnt['429_politica'],
      archivos_otro: cnt.otro,
      fotos: fotos
    });

    console.log((pass ? 'PASS ' : 'FAIL ') + f.slug + ' | fotos ' + fotosOk + '/' + fotos.length +
      ' | archivos 200=' + cnt.PASS + ' 404=' + cnt['404_inexistente'] +
      ' 429=' + cnt['429_politica'] + ' otro=' + cnt.otro +
      (passEstricto ? '' : ' | ' + (detalleFallo(heads) || 'sin datos')));
  }

  writeAsciiJson(REPORT_FILE, report);

  console.log('---');
  console.log('archivos: PASS ' + report.archivos_pass + '/' + report.total_archivos +
    ' | FAIL-404 ' + report.archivos_fail_404 +
    ' | FAIL-429 ' + report.archivos_fail_429 +
    ' | otros ' + report.archivos_fail_otro);
  console.log('fotos: PASS ' + report.fotos_pass + '/' + report.total_fotos +
    ' | sin PASS ' + report.fotos_fail);
  console.log('fichas: PASS ' + report.fichas_pass + '/' + report.total_fichas +
    ' | FAIL ' + report.fichas_fail);
  console.log('informe: ' + path.relative(ROOT, REPORT_FILE).replace(/\\/g, '/'));

  process.exitCode = report.fichas_fail === 0 ? 0 : 1;
}

main().catch(function (e) {
  console.error('[FAIL] error no controlado: ' + e.message);
  process.exit(1);
});
