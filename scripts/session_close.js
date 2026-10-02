#!/usr/bin/env node
'use strict';

/*
 * scripts/session_close.js
 * ---------------------------------------------------------------------------
 * Genera el INFORME DE CIERRE obligatorio de una sesion de implementacion.
 *
 * Reutiliza scripts/usage_report.js (NO lo reimplementa ni lo modifica): lo
 * invoca con child_process.spawnSync usando el mismo ejecutable de Node.
 *
 * USO:
 *   node scripts/session_close.js [--root <sessionId>] [--since <ms|fecha>]
 *   node scripts/session_close.js -h | --help
 *
 * ALCANCE:
 *   Sin --root ni --since mide el DIA LOCAL actual (lo resuelve usage_report).
 *   Con --root mide esa sesion + todos sus descendientes (parent_id).
 *   Con --since acota el inicio; puede combinarse con --root.
 *
 * FUENTES:
 *   1) node scripts/usage_report.js --json [filtros]  -> balance + por agente.
 *   2) node scripts/usage_report.js --tree [filtros]  -> arbol de subagentes
 *      (solo cuando hay --root; best-effort).
 *   Nota: en usage_report --tree y --json son modos MUTUAMENTE EXCLUYENTES,
 *   por eso el desglose por subagente se obtiene de sessions/by_agent del JSON
 *   (que ya trae parent_id y es_raiz) y el arbol se pide como salida aparte.
 *
 * SALIDA: Markdown por stdout.
 *
 * TOLERANCIA A FALLOS:
 *   Si usage_report.js no existe, falla o no hay node:sqlite, imprime el
 *   informe con los datos disponibles y SALE 0. Nunca lanza.
 *
 * ASCII-safe: solo bytes < 128, sin emojis, sin backticks. Sin dependencias.
 * ---------------------------------------------------------------------------
 */

var fs = require('node:fs');
var path = require('node:path');
var child_process = require('node:child_process');

var REPORT = path.join(__dirname, 'usage_report.js');

/* Umbrales del informe de cierre (Mandato 17-18). */
var TURN_ALERT = 25;          /* > 25 turnos por agente */
var TOKENS_PER_TURN_ALERT = 50000; /* > 50000 tokens/turno por agente */
var ORCH_CACHE_PER_TURN_OK = 50000; /* orquestador OK si cache_read/turno < 50000 */

/* ----------------------------- utilidades ------------------------------- */

function num(v) { var n = Number(v); return isFinite(n) ? n : 0; }

function fmtInt(v) {
  var n = Math.round(num(v));
  var neg = n < 0; n = Math.abs(n);
  var s = String(n); var out = '';
  while (s.length > 3) { out = ',' + s.slice(s.length - 3) + out; s = s.slice(0, s.length - 3); }
  return (neg ? '-' : '') + s + out;
}

function fmt1(v) { return String(Math.round(num(v) * 10) / 10); }

function fmtMs(ms) {
  if (!ms) return '';
  var d = new Date(num(ms));
  function z(n) { return n < 10 ? '0' + n : String(n); }
  return d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate()) + ' ' +
    z(d.getHours()) + ':' + z(d.getMinutes());
}

function sum(arr, get) {
  var t = 0;
  for (var i = 0; i < arr.length; i++) t += num(get(arr[i]));
  return t;
}

function esc(v) { return String(v == null ? '' : v).replace(/\|/g, '/'); }

/* --------------------------- invocacion CLI ----------------------------- */

/*
 * Llama a usage_report.js con los argumentos dados. Devuelve:
 *   { ok: true, code: 0, stdout: '<texto>' }
 *   { ok: false, code: N, error: '<motivo>' }
 * Nunca lanza: cualquier fallo se traduce a ok:false.
 */
function runReport(args) {
  if (!fs.existsSync(REPORT)) {
    return { ok: false, code: -1, error: 'no existe ' + REPORT };
  }
  var res;
  try {
    res = child_process.spawnSync(process.execPath, [REPORT].concat(args), {
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024
    });
  } catch (e) {
    return { ok: false, code: -2, error: (e && e.message) ? e.message : String(e) };
  }
  if (res.error) {
    return { ok: false, code: -3, error: (res.error && res.error.message) ? res.error.message : String(res.error) };
  }
  var out = (res.stdout == null) ? '' : String(res.stdout);
  if (res.status !== 0) {
    var err = (res.stderr == null) ? '' : String(res.stderr).trim();
    return { ok: false, code: res.status, stdout: out, error: err || ('usage_report salio con codigo ' + res.status) };
  }
  return { ok: true, code: 0, stdout: out };
}

/* Llama a usage_report --json y parsea. Devuelve null si algo falla. */
function fetchJson(filterArgs) {
  var r = runReport(['--json'].concat(filterArgs));
  if (!r.ok) return { json: null, error: r.error || 'fallo --json' };
  var text = String(r.stdout || '').trim();
  if (!text) return { json: null, error: 'salida JSON vacia' };
  var from = text.indexOf('{');
  if (from > 0) text = text.slice(from);
  try {
    return { json: JSON.parse(text), error: null };
  } catch (e) {
    return { json: null, error: 'JSON invalido: ' + ((e && e.message) ? e.message : String(e)) };
  }
}

/* ------------------------------- agregados ------------------------------ */

function aggregateByAgent(sessions) {
  var map = {};
  for (var i = 0; i < sessions.length; i++) {
    var s = sessions[i];
    var a = s.agent || '(sin agente)';
    if (!map[a]) map[a] = { agent: a, sessions: 0, turns: 0, total: 0, cache_read: 0, seg: 0 };
    var o = map[a];
    o.sessions++;
    o.turns += num(s.turns);
    o.total += num(s.total);
    o.cache_read += num(s.tokens_cache_read);
    o.seg += num(s.seg);
  }
  var arr = Object.keys(map).map(function (k) {
    var o = map[k];
    o.tokens_por_turno = o.turns > 0 ? o.total / o.turns : 0;
    o.cache_por_turno = o.turns > 0 ? o.cache_read / o.turns : 0;
    return o;
  });
  arr.sort(function (a, b) { return b.total - a.total; });
  return arr;
}

function buildBalance(json) {
  var sessions = (json && json.sessions) ? json.sessions : [];
  var t = (json && json.totals) ? json.totals : {};
  var turnos = sum(sessions, function (s) { return s.turns; });
  var seg = sum(sessions, function (s) { return s.seg; });
  var total = (t.total != null) ? num(t.total) : sum(sessions, function (s) { return s.total; });
  var cacheRead = (t.tokens_cache_read != null)
    ? num(t.tokens_cache_read)
    : sum(sessions, function (s) { return s.tokens_cache_read; });
  return {
    sessions: sessions,
    total_tokens: total,
    turnos: turnos,
    segundos: seg,
    cache_read: cacheRead,
    cache_por_turno: turnos > 0 ? cacheRead / turnos : 0,
    cost: num(t.cost)
  };
}

function buildOrchestrator(balance) {
  var roots = balance.sessions.filter(function (s) { return s.es_raiz; });
  var cache = 0, turns = 0;
  if (roots.length) {
    cache = sum(roots, function (s) { return s.tokens_cache_read; });
    turns = sum(roots, function (s) { return s.turns; });
  } else {
    cache = balance.cache_read;
    turns = balance.turnos;
  }
  return {
    detected: roots.length > 0,
    cache_read: cache,
    turns: turns,
    cache_por_turno: turns > 0 ? cache / turns : 0
  };
}

/* ------------------------------- render --------------------------------- */

function scopeLabel(opts) {
  var L = [];
  if (opts.root) L.push('root=' + opts.root + ' (+ descendientes)');
  if (opts.since) L.push('desde ' + opts.since);
  if (!L.length) L.push('dia local actual');
  return L.join('; ');
}

function renderReport(opts, fetched, treeText) {
  var json = fetched.json;
  var L = [];
  L.push('# Informe de cierre de sesion');
  L.push('');
  L.push('- Alcance: ' + esc(scopeLabel(opts)));
  L.push('- Generado: ' + fmtMs(Date.now()));
  if (json && json.db_path) L.push('- DB: ' + esc(json.db_path));
  L.push('');

  if (!json) {
    L.push('> DATOS NO DISPONIBLES: ' + esc(fetched.error || 'usage_report.js no respondio'));
    L.push('> El informe se emite igualmente con secciones para completar a mano.');
    L.push('');
  }

  var balance = json ? buildBalance(json) : null;
  var byAgent = json ? aggregateByAgent(balance.sessions) : [];
  var orch = json ? buildOrchestrator(balance) : null;

  /* 1. Balance de gasto */
  L.push('## 1. Balance de gasto');
  L.push('');
  if (balance) {
    L.push('| Metrica | Valor |');
    L.push('|---|---|');
    L.push('| total_tokens | ' + fmtInt(balance.total_tokens) + ' |');
    L.push('| turnos | ' + fmtInt(balance.turnos) + ' |');
    L.push('| segundos | ' + fmt1(balance.segundos) + ' |');
    L.push('| cache_read | ' + fmtInt(balance.cache_read) + ' |');
    L.push('| cache_read / turno | ' + fmtInt(balance.cache_por_turno) + ' |');
    L.push('| sesiones | ' + fmtInt(balance.sessions.length) + ' |');
    L.push('');
  } else {
    L.push('(sin datos; completar a mano)');
    L.push('');
  }

  /* 2. Desglose por agente */
  L.push('## 2. Desglose por agente');
  L.push('');
  if (byAgent.length) {
    L.push('| Agente | Turnos | Tokens | Tokens/turno | cache_read/turno |');
    L.push('|---|---|---|---|---|');
    for (var i = 0; i < byAgent.length; i++) {
      var a = byAgent[i];
      var flag = (a.turns > TURN_ALERT || a.tokens_por_turno > TOKENS_PER_TURN_ALERT) ? '[!] ' : '';
      L.push('| ' + flag + esc(a.agent) + ' | ' + fmtInt(a.turns) + ' | ' + fmtInt(a.total) +
        ' | ' + fmtInt(a.tokens_por_turno) + ' | ' + fmtInt(a.cache_por_turno) + ' |');
    }
    L.push('');
  } else {
    L.push('(sin datos de agentes; completar a mano)');
    L.push('');
  }

  /* 3. Alertas de umbral */
  L.push('## 3. Alertas de umbral');
  L.push('');
  var alerts = [];
  for (var j = 0; j < byAgent.length; j++) {
    var b = byAgent[j];
    if (b.turns > TURN_ALERT) {
      alerts.push('- [!] Agente "' + esc(b.agent) + '": ' + fmtInt(b.turns) +
        ' turnos (> ' + TURN_ALERT + '). Replanificar / dividir dominio.');
    }
    if (b.tokens_por_turno > TOKENS_PER_TURN_ALERT) {
      alerts.push('- [!] Agente "' + esc(b.agent) + '": ' + fmtInt(b.tokens_por_turno) +
        ' tokens/turno (> ' + fmtInt(TOKENS_PER_TURN_ALERT) + '). Contexto por turno excesivo.');
    }
  }
  if (alerts.length) {
    for (var k = 0; k < alerts.length; k++) L.push(alerts[k]);
  } else {
    L.push('- Sin agentes sobre umbral (turnos <= ' + TURN_ALERT +
      ' y tokens/turno <= ' + fmtInt(TOKENS_PER_TURN_ALERT) + ').');
  }
  if (orch) {
    if (orch.turns <= 0) {
      L.push('- Orquestador: sin turnos en el alcance (cache_read/turno no calculable).');
    } else {
      var ok = orch.cache_por_turno < ORCH_CACHE_PER_TURN_OK;
      L.push('- ' + (ok ? '' : '[!] ') + 'Orquestador cache_read/turno = ' + fmtInt(orch.cache_por_turno) +
        ' -> ' + (ok ? 'OK' : 'ATENCION') + ' (< ' + fmtInt(ORCH_CACHE_PER_TURN_OK) + ' = OK)' +
        (orch.detected ? '' : ' [sin sesion raiz; se uso el total]'));
    }
  }
  L.push('');

  if (treeText) {
    L.push('## Arbol de subagentes (usage_report --tree)');
    L.push('');
    L.push('    ' + String(treeText).replace(/\r?\n/g, '\n    ').replace(/\s+$/, ''));
    L.push('');
  }

  /* 4-6. Plantillas obligatorias */
  L.push('## 4. Estimado vs real (Mandato 19)');
  L.push('');
  L.push('| Concepto | Estimado | Real | Desviacion |');
  L.push('|---|---|---|---|');
  L.push('| Tokens | (completar) | ' + (balance ? fmtInt(balance.total_tokens) : '(completar)') + ' | (completar) |');
  L.push('| Turnos | (completar) | ' + (balance ? fmtInt(balance.turnos) : '(completar)') + ' | (completar) |');
  L.push('| Tiempo (s) | (completar) | ' + (balance ? fmt1(balance.segundos) : '(completar)') + ' | (completar) |');
  L.push('');
  L.push('## 5. Aprendizajes');
  L.push('');
  L.push('- (completar: que se releyo de mas, que agente fallo, que brief falto)');
  L.push('');
  L.push('## 6. Consejos de mejora');
  L.push('');
  L.push('- (completar: 1-3 acciones concretas para la siguiente sesion)');
  L.push('');

  return L.join('\n');
}

/* -------------------------------- CLI ----------------------------------- */

function parseArgs(argv) {
  var o = { root: null, since: null, help: false };
  var i = 0;
  function needValue(flag) {
    if (i >= argv.length) return null;
    return argv[i++];
  }
  while (i < argv.length) {
    var a = argv[i++];
    var val = null;
    if (a.length > 2 && a.slice(0, 2) === '--' && a.indexOf('=') > 1) {
      var eq = a.indexOf('=');
      val = a.slice(eq + 1);
      a = a.slice(0, eq);
    }
    if (a === '--help' || a === '-h' || a === 'help') { o.help = true; }
    else if (a === '--root') { o.root = (val !== null ? val : needValue('--root')); }
    else if (a === '--since') { o.since = (val !== null ? val : needValue('--since')); }
    else { /* opcion desconocida: se ignora para no romper la sesion */ }
  }
  return o;
}

function helpText() {
  var L = [];
  L.push('session_close.js - Informe de cierre de sesion (Markdown).');
  L.push('');
  L.push('Uso:');
  L.push('  node scripts/session_close.js [--root <sessionId>] [--since <ms|fecha>]');
  L.push('  node scripts/session_close.js -h | --help');
  L.push('');
  L.push('Opciones:');
  L.push('  --root <sessionId>   Mide esa sesion + sus descendientes (parent_id).');
  L.push('  --since <ms|fecha>   Acota el inicio (epoch ms o fecha ISO).');
  L.push('                       Sin filtros mide el DIA LOCAL actual.');
  L.push('  -h, --help           Esta ayuda.');
  L.push('');
  L.push('Delega en scripts/usage_report.js (--json y, con --root, --tree).');
  L.push('Salida: Markdown por stdout. Siempre sale 0 (tolerante a fallos).');
  return L.join('\n');
}

/* --------------------------------- main --------------------------------- */

function main() {
  var opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    process.stdout.write(helpText() + '\n');
    return;
  }

  var filterArgs = [];
  if (opts.root) filterArgs.push('--root', opts.root);
  if (opts.since) filterArgs.push('--since', opts.since);

  var fetched;
  try {
    fetched = fetchJson(filterArgs);
  } catch (e) {
    fetched = { json: null, error: (e && e.message) ? e.message : String(e) };
  }

  var treeText = '';
  if (opts.root) {
    try {
      var tr = runReport(['--tree'].concat(filterArgs));
      if (tr.ok && tr.stdout) treeText = String(tr.stdout).trim();
    } catch (e2) { treeText = ''; }
  }

  var md;
  try {
    md = renderReport(opts, fetched, treeText);
  } catch (e3) {
    md = '# Informe de cierre de sesion\n\n> Error al renderizar: ' +
      ((e3 && e3.message) ? e3.message : String(e3)) + '\n';
  }
  process.stdout.write(md + '\n');
}

try {
  main();
} catch (e) {
  process.stderr.write('AVISO session_close: ' + ((e && e.message) ? e.message : String(e)) + '\n');
}
process.exitCode = 0;
