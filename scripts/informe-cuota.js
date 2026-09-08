// scripts/informe-cuota.js
// Genera informes de consumo de cuota (costo y tokens) de opencode para el
// proyecto ExploraCO, leyendo la base local opencode.db en modo read-only.
// No modifica la base del proceso en ejecucion.
//
// Uso:
//   node scripts/informe-cuota.js --5h            ultimas 5 horas (rodante)
//   node scripts/informe-cuota.js --dia           dia natural de hoy (local)
//   node scripts/informe-cuota.js --desde=2026-09-01   desde una fecha
//   node scripts/informe-cuota.js --hist5h=3      ultimos 3 bloques de 5h (fijos UTC)
//   Opcionales:
//     --db=...            ruta a opencode.db (default: ~/.local/share/opencode)
//     --dir=...           filtro de directorio (default: contiene 'exploraco')
//     --out=...           carpeta de salida (default: exploraco desarrollo/informes-cuota)
//
// Salida: imprime cada informe en consola y lo guarda en <out>/cuota-*.md
// Incluye secciones por sesion (session) y por subagente x modelo (message).
// ASCII-safe (no emite tildes).

'use strict';

var os = require('os');
var path = require('path');
var fs = require('fs');
var { DatabaseSync } = require('node:sqlite');

var ARGS = process.argv.slice(2);
var FIVE_H_MS = 5 * 60 * 60 * 1000;

function argValue(prefix) {
  for (var i = 0; i < ARGS.length; i++) {
    if (ARGS[i].indexOf(prefix) === 0) return ARGS[i].slice(prefix.length);
  }
  return null;
}
function hasFlag(f) { return ARGS.indexOf(f) !== -1; }
function hasPrefix(p) { return ARGS.some(function (a) { return a.indexOf(p) === 0; }); }

var DB_PATH = argValue('--db=') ||
  path.join(os.homedir(), '.local', 'share', 'opencode', 'opencode.db');
var DIR_FILTER = argValue('--dir=') || 'exploraco';
var OUT_DIR = argValue('--out=') ||
  path.join(process.cwd(), 'exploraco desarrollo', 'informes-cuota');

var now = Date.now();

// Construye la lista de ventanas [{from, to, label, fname}]
function buildWindows() {
  var wins = [];
  if (hasPrefix('--hist5h=')) {
    var n = parseInt(argValue('--hist5h='), 10) || 3;
    var block = Math.floor(now / FIVE_H_MS) * FIVE_H_MS; // inicio del bloque actual (UTC)
    for (var i = 0; i < n; i++) {
      var from = block - i * FIVE_H_MS;
      var to = from + FIVE_H_MS;
      var hh = new Date(from).toISOString().slice(11, 13);
      wins.push({ from: from, to: to, label: '5h-' + hh, fname: '5h-' + hh });
    }
    return wins;
  }
  var f, t, label, fn;
  if (hasFlag('--5h')) {
    f = now - FIVE_H_MS; t = now; label = '5h'; fn = '5h';
  } else if (hasFlag('--dia')) {
    var d = new Date(); d.setHours(0, 0, 0, 0);
    f = d.getTime(); t = now; label = 'dia'; fn = 'dia';
  } else if (argValue('--desde=')) {
    var p = argValue('--desde=').split('-').map(Number);
    var dt = new Date(Date.UTC(p[0], p[1] - 1, p[2], 0, 0, 0, 0));
    f = dt.getTime(); t = now; label = 'desde-' + argValue('--desde='); fn = 'desde-' + argValue('--desde=');
  } else {
    f = now - FIVE_H_MS; t = now; label = '5h'; fn = '5h';
  }
  wins.push({ from: f, to: t, label: label, fname: fn });
  return wins;
}

function fmtUSD(v) { return '$' + (Math.round((v || 0) * 10000) / 10000).toFixed(4); }
function fmtTok(v) { return (v || 0).toLocaleString('en-US'); }
function fmtDate(ms) {
  return new Date(ms).toISOString().replace('T', ' ').slice(0, 19) + 'Z';
}
function modelLabel(raw) {
  if (!raw) return '(n/a)';
  try {
    var o = JSON.parse(raw);
    var label = o.id || raw;
    if (o.variant) label += ' [' + o.variant + ']';
    return label;
  } catch (e) { return raw; }
}
function esc(s) { return String(s || '').replace(/[|\n]/g, ' '); }

if (!fs.existsSync(DB_PATH)) {
  console.error('ERROR: no se encontro la base opencode.db en: ' + DB_PATH);
  process.exitCode = 1;
  return;
}

var db = new DatabaseSync('file:' + DB_PATH.replace(/\\/g, '/') + '?mode=ro', { readOnly: true });

function query(sql) {
  var params = Array.prototype.slice.call(arguments, 1);
  var stmt = db.prepare(sql);
  return stmt.all.apply(stmt, params);
}

function tableRows(obj, sortKey) {
  return Object.keys(obj).map(function (k) {
    return { key: k, n: obj[k].n, cost: obj[k].cost, in: obj[k].in, out: obj[k].out };
  }).sort(function (a, b) { return (b[sortKey] || 0) - (a[sortKey] || 0); });
}

// Informe para una ventana
function buildReport(w) {
  // Sesiones del proyecto en la ventana
  var rows = query(
    "SELECT title, directory, model, agent, cost, tokens_input, tokens_output, " +
    "tokens_reasoning, tokens_cache_read, tokens_cache_write, time_created, time_updated " +
    "FROM session WHERE directory LIKE ? AND time_updated >= ? AND time_updated < ? ORDER BY cost DESC",
    '%' + DIR_FILTER + '%', w.from, w.to
  );

  var totCost = 0, totIn = 0, totOut = 0, totRea = 0, totCR = 0, totCW = 0;
  rows.forEach(function (r) {
    totCost += r.cost || 0; totIn += r.tokens_input || 0; totOut += r.tokens_output || 0;
    totRea += r.tokens_reasoning || 0; totCR += r.tokens_cache_read || 0; totCW += r.tokens_cache_write || 0;
  });

  var byModel = {};
  var byAgent = {};
  rows.forEach(function (r) {
    var m = modelLabel(r.model);
    var a = r.agent || '(principal)';
    if (!byModel[m]) byModel[m] = { n: 0, cost: 0, in: 0, out: 0 };
    if (!byAgent[a]) byAgent[a] = { n: 0, cost: 0, in: 0, out: 0 };
    byModel[m].n++; byModel[m].cost += r.cost || 0; byModel[m].in += r.tokens_input || 0; byModel[m].out += r.tokens_output || 0;
    byAgent[a].n++; byAgent[a].cost += r.cost || 0; byAgent[a].in += r.tokens_input || 0; byAgent[a].out += r.tokens_output || 0;
  });

  // Mensajes del proyecto en la ventana (subagente x modelo)
  var msgs = query(
    "SELECT m.data FROM message m JOIN session s ON s.id = m.session_id " +
    "WHERE s.directory LIKE ? AND m.time_created >= ? AND m.time_created < ?",
    '%' + DIR_FILTER + '%', w.from, w.to
  );

  var sa = {};        // por agente
  var saModel = {};   // agente -> {modelo -> agg}
  msgs.forEach(function (r) {
    var d;
    try { d = JSON.parse(r.data); } catch (e) { return; }
    var agent = d.agent || '(principal)';
    var model = d.modelID || '(n/a)';
    var prov = d.providerID;
    if (prov) model += ' (' + prov + ')';
    var cost = d.cost || 0;
    var tin = (d.tokens && d.tokens.input) || 0;
    var tout = (d.tokens && d.tokens.output) || 0;
    if (!sa[agent]) sa[agent] = { n: 0, cost: 0, in: 0, out: 0 };
    if (!saModel[agent]) saModel[agent] = {};
    if (!saModel[agent][model]) saModel[agent][model] = { n: 0, cost: 0, in: 0, out: 0 };
    sa[agent].n++; sa[agent].cost += cost; sa[agent].in += tin; sa[agent].out += tout;
    saModel[agent][model].n++; saModel[agent][model].cost += cost;
    saModel[agent][model].in += tin; saModel[agent][model].out += tout;
  });

  var md = '';
  md += '# Informe de consumo de cuota - ExploraCO\n\n';
  md += '- Generado: ' + fmtDate(now) + '\n';
  md += '- Ventana: ' + w.label + ' (desde ' + fmtDate(w.from) + ' hasta ' + fmtDate(w.to) + ')\n';
  md += '- Origen: ' + DB_PATH + ' (tablas session y message)\n';
  md += '- Proyecto (filtro dir): *' + DIR_FILTER + '*\n';
  md += '- Sesiones en ventana: ' + rows.length + ' | Mensajes con costo: ' + msgs.length + '\n\n';

  md += '## Resumen (sesiones)\n\n';
  md += '| Metrica | Valor |\n';
  md += '|---|---:|\n';
  md += '| Costo total | ' + fmtUSD(totCost) + ' |\n';
  md += '| Tokens input | ' + fmtTok(totIn) + ' |\n';
  md += '| Tokens output | ' + fmtTok(totOut) + ' |\n';
  md += '| Tokens reasoning | ' + fmtTok(totRea) + ' |\n';
  md += '| Cache read | ' + fmtTok(totCR) + ' |\n';
  md += '| Cache write | ' + fmtTok(totCW) + ' |\n\n';

  md += '## Por modelo (sesiones)\n\n';
  md += '| Modelo | Sesiones | Costo | Input | Output |\n';
  md += '|---|---|---:|---:|---:|\n';
  tableRows(byModel, 'cost').forEach(function (r) {
    md += '| ' + esc(r.key) + ' | ' + r.n + ' | ' + fmtUSD(r.cost) + ' | ' + fmtTok(r.in) + ' | ' + fmtTok(r.out) + ' |\n';
  });

  md += '\n## Uso por subagente (mensajes)\n\n';
  md += '| Agente | Invocaciones | Costo | Input | Output |\n';
  md += '|---|---:|---:|---:|---:|\n';
  tableRows(sa, 'cost').forEach(function (r) {
    md += '| ' + esc(r.key) + ' | ' + r.n + ' | ' + fmtUSD(r.cost) + ' | ' + fmtTok(r.in) + ' | ' + fmtTok(r.out) + ' |\n';
  });

  md += '\n## Subagente x Modelo (mensajes)\n\n';
  md += '| Agente | Modelo | Invocaciones | Costo | Input | Output |\n';
  md += '|---|---|---:|---:|---:|---:|\n';
  Object.keys(sa).sort(function (a, b) { return sa[b].cost - sa[a].cost; }).forEach(function (agent) {
    Object.keys(saModel[agent]).sort(function (a, b) { return saModel[agent][b].cost - saModel[agent][a].cost; }).forEach(function (m) {
      var g = saModel[agent][m];
      md += '| ' + esc(agent) + ' | ' + esc(m) + ' | ' + g.n + ' | ' + fmtUSD(g.cost) + ' | ' + fmtTok(g.in) + ' | ' + fmtTok(g.out) + ' |\n';
    });
  });

  md += '\n## Top 5 sesiones por costo\n\n';
  md += '| Sesion | Agente | Costo | Input | Output |\n';
  md += '|---|---|---:|---:|---:|\n';
  rows.slice(0, 5).forEach(function (r) {
    md += '| ' + esc(r.title).slice(0, 50) + ' | ' + esc(r.agent) + ' | ' + fmtUSD(r.cost) + ' | ' + fmtTok(r.tokens_input) + ' | ' + fmtTok(r.tokens_output) + ' |\n';
  });

  return md;
}

// Generar y guardar
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
var windows = buildWindows();
var fecha = new Date().toISOString().slice(0, 10);
windows.forEach(function (w) {
  var md = buildReport(w);
  console.log(md);
  console.log('----------------------------------------------------------');
  var fname = 'cuota-' + fecha + '-' + w.fname + '.md';
  var outPath = path.join(OUT_DIR, fname);
  fs.writeFileSync(outPath, md, 'utf8');
  console.log('[informe-cuota] guardado en: ' + outPath);
});
