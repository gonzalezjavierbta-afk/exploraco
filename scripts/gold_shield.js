'use strict';

/*
 * gold_shield.js
 * Escudo GOLD en un unico comando: agrega el control que ya usa el repo
 * (scripts/express_check.js: sintaxis + ASCII-safety + balance de divs) con
 * el guard de la lista CERRADA de subcategorias de sitio
 * (scripts/verificar-subcategorias.js).
 *
 * Uso:
 *   node scripts/gold_shield.js
 *   node scripts/gold_shield.js --sin-express   (solo el guard)
 *
 * Exit 0 = Escudo GOLD limpio. Exit 1 = bloqueante.
 *
 * express_check NO cambia de comportamiento: se ejecuta tal cual y su exit
 * code se interpreta contra el baseline declarado (FAIL preexistentes), para
 * que una copia desincronizada o un FAIL nuevo bloqueen el despliegue sin
 * alterar el exit code que terceros ya esperan de express_check.
 *
 * Por que son 10 copias y de donde sale esa cuenta: DECISIONS.md ADR-101.
 * ASCII-safe (ADR-002): cero bytes > 127, cero backticks.
 */

var path = require('path');
var childProcess = require('child_process');

var RAIZ = path.resolve(__dirname, '..');

// FAIL preexistentes del set por defecto de express_check (baseline medido).
// Mover este numero exige justificar el motivo: un FAIL nuevo debe bloquear.
var BASELINE_FAIL = 22;

var bloqueadores = [];

function log(msg) {
  process.stdout.write(String(msg) + '\n');
}

function correrExpressCheck() {
  var res = childProcess.spawnSync('node', [path.join(RAIZ, 'scripts', 'express_check.js')], {
    cwd: RAIZ,
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024
  });

  var salida = String(res.stdout || '') + String(res.stderr || '');
  process.stdout.write(salida);

  var m = /Resumen: PASS (\d+), FAIL (\d+)/.exec(salida);
  return {
    pass: m ? parseInt(m[1], 10) : -1,
    fail: m ? parseInt(m[2], 10) : -1
  };
}

function correrGuard() {
  var guard = null;
  try {
    guard = require(path.join(__dirname, 'verificar-subcategorias.js'));
  } catch (err) {
    log('  FAIL guard no cargable -> ' + String(err && err.message ? err.message : err));
    return 1;
  }
  return guard.auditar({ json: false });
}

function main() {
  var args = process.argv.slice(2);
  var sinExpress = args.indexOf('--sin-express') !== -1;

  log('gold_shield - Escudo GOLD agregado');
  log('Raiz: ' + RAIZ);
  log('');

  if (!sinExpress) {
    log('[1] Control base: sintaxis + ASCII-safety + balance de divs (scripts/express_check.js)');
    var ex = correrExpressCheck();
    log('');

    if (ex.fail < 0) {
      bloqueadores.push('express_check sin resumen parseable');
      log('  FAIL express_check no devolvio el resumen esperado');
    } else if (ex.fail > BASELINE_FAIL) {
      bloqueadores.push('express_check FAIL ' + ex.fail + ' > baseline ' + BASELINE_FAIL);
      log('  FAIL express_check empeoro: FAIL ' + ex.fail + ' (baseline ' + BASELINE_FAIL + ')');
    } else {
      log('  OK express_check: PASS ' + ex.pass + ', FAIL ' + ex.fail +
        ' (baseline FAIL ' + BASELINE_FAIL + ', sin FAIL nuevo)');
    }
    log('');
  }

  log('[2] Guard: lista cerrada de subcategorias de sitio (scripts/verificar-subcategorias.js)');
  var guardCode = correrGuard();
  if (guardCode !== 0) {
    bloqueadores.push('lista de subcategorias desincronizada');
  }
  log('');

  if (bloqueadores.length > 0) {
    log('Resumen: BLOQUEANTE (' + bloqueadores.length + ')');
    for (var i = 0; i < bloqueadores.length; i += 1) {
      log('  BLOQUEANTE ' + bloqueadores[i]);
    }
    process.exitCode = 1;
    return;
  }

  log('Resumen: LIMPIO. Escudo GOLD sin bloqueadores.');
  process.exitCode = 0;
}

main();
