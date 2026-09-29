// scripts/ejecucion/informe-cuota.js
// Genera informes de consumo de cuota (costo y tokens) de opencode para el
// proyecto ExploraCO, leyendo la base local opencode.db en modo read-only.
// No modifica la base del proceso en ejecucion.
//
// Uso:
//   node scripts/ejecucion/informe-cuota.js --5h            ultimas 5 horas (rodante)
//   node scripts/ejecucion/informe-cuota.js --dia           dia natural de hoy (local)
//   node scripts/ejecucion/informe-cuota.js --desde=2026-09-01   desde una fecha
//   node scripts/ejecucion/informe-cuota.js --hist5h=3      ultimos 3 bloques de 5h (fijos UTC)
//   node scripts/ejecucion/informe-cuota.js --task[=<marca>]  delta de la tanda actual desde
//                                                  una marca. <marca> puede ser un
//                                                  ID de sesion (prefijo suficiente)
//                                                  o un timestamp ISO
//                                                  (2026-09-28T14:30:00). Sin marca
//                                                  usa la sesion mas reciente no
//                                                  archivada del directorio.
//   node scripts/ejecucion/informe-cuota.js --overhead      estima el overhead de contexto
//                                                  (Capa 0 + 0b) leyendo
//                                                  .opencode/agent/*.md,
//                                                  .opencode/skills/*/SKILL.md y
//                                                  opencode.json. Son ESTIMACIONES
//                                                  con la heuristica chars/3.5, NO
//                                                  mediciones de la DB.
//   node scripts/ejecucion/informe-cuota.js --schema        inspecciona el esquema de la
//                                                  base (tablas, columnas y las
//                                                  claves JSON reales dentro de
//                                                  message.data). No genera
//                                                  informe; es una utilidad de
//                                                  diagnostico para ajustar la
//                                                  extraccion de tareas.
//   Opcionales:
//     --db=...            ruta a opencode.db (default: ~/.local/share/opencode)
//     --dir=...           filtro de directorio (default: contiene 'exploraco')
//     --out=...           carpeta de salida (default: exploraco desarrollo/informes-cuota)
//     --topn=N            cuantos mensajes de alto consumo listar en el
//                          desglose de tareas (default: 10)
//     --max-sessions=N    limita el escaneo a las N sesiones mas recientes
//                          (entero >= 1). Aplica a --task y a los modos de
//                          ventana; no aplica a --schema ni a --overhead.
//                          Default: sin limite.
//
// Salida: imprime cada informe en consola y lo guarda en <out>/cuota-*.md
// Incluye secciones por sesion (session), por subagente x modelo (message),
// un desglose detallado de tareas/prompts de alto consumo y una deteccion
// de tareas repetitivas (agrupadas por patron de titulo de sesion).
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
var TOP_N = parseInt(argValue('--topn='), 10) || 10;

var now = Date.now();

// --overhead no toca la DB (solo lee archivos de configuracion/agentes/skills),
// por eso se despacha antes de comprobar la existencia de opencode.db.
if (hasFlag('--overhead')) {
  runOverhead();
  return;
}

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

// ---------------------------------------------------------------------------
// Modo diagnostico: --schema
// Lista las tablas y columnas reales de la base y muestrea las claves de
// nivel superior presentes en message.data, para saber con certeza donde
// vive la descripcion/intencion de cada tarea (esto varia entre versiones
// de opencode y no debe asumirse a ciegas).
// ---------------------------------------------------------------------------
function runSchemaInspection() {
  console.log('=== Tablas encontradas en ' + DB_PATH + ' ===');
  var tables = query("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
  tables.forEach(function (t) {
    console.log('\n-- ' + t.name + ' --');
    var cols = query('PRAGMA table_info(' + t.name + ')');
    cols.forEach(function (c) { console.log('  ' + c.name + ' (' + c.type + ')'); });
  });

  try {
    var sample = query('SELECT data FROM message ORDER BY time_created DESC LIMIT 300');
    var keySet = {};
    var nestedTokenKeys = {};
    sample.forEach(function (r) {
      var d;
      try { d = JSON.parse(r.data); } catch (e) { return; }
      Object.keys(d).forEach(function (k) {
        keySet[k] = (keySet[k] || 0) + 1;
        if (k === 'tokens' && d.tokens && typeof d.tokens === 'object') {
          Object.keys(d.tokens).forEach(function (tk) {
            nestedTokenKeys[tk] = (nestedTokenKeys[tk] || 0) + 1;
          });
        }
      });
    });
    console.log('\n=== Claves de nivel superior en message.data (muestra de ' + sample.length + ' filas) ===');
    Object.keys(keySet).sort(function (a, b) { return keySet[b] - keySet[a]; }).forEach(function (k) {
      console.log('  ' + k + ': presente en ' + keySet[k] + ' filas');
    });
    if (Object.keys(nestedTokenKeys).length) {
      console.log('\n=== Subclaves dentro de message.data.tokens ===');
      Object.keys(nestedTokenKeys).forEach(function (k) {
        console.log('  tokens.' + k + ': presente en ' + nestedTokenKeys[k] + ' filas');
      });
    }
    console.log('\nSugerencia: si ves aqui una clave como "summary", "title", "parts" o');
    console.log('"content" que contenga texto de la tarea/prompt, usa --db normal y');
    console.log('ajusta extractTaskDescription() en este script para leerla primero.');
  } catch (e) {
    console.log('\n(no se pudo inspeccionar message.data: ' + e.message + ')');
  }
}

if (hasFlag('--schema')) {
  runSchemaInspection();
  return;
}

// --max-sessions=N: valida y define el limite de sesiones procesadas. Se parsea
// despues de --schema/--overhead porque en esos modos no aplica.
var MAX_SESSIONS = parseMaxSessionsArg();
if (MAX_SESSIONS === undefined) return;

if (hasFlag('--task') || hasPrefix('--task=')) {
  runTask();
  return;
}

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
function truncate(s, n) {
  s = String(s || '');
  return s.length > n ? s.slice(0, n - 3) + '...' : s;
}

function tableRows(obj, sortKey) {
  return Object.keys(obj).map(function (k) {
    return { key: k, n: obj[k].n, cost: obj[k].cost, in: obj[k].in, out: obj[k].out };
  }).sort(function (a, b) { return (b[sortKey] || 0) - (a[sortKey] || 0); });
}

// ---------------------------------------------------------------------------
// Extraccion de la descripcion/intencion de una tarea a partir de
// message.data. La estructura interna de opencode puede variar segun
// version, asi que se intentan varias claves conocidas en orden y se cae
// a null si ninguna aplica (usar --schema para descubrir el nombre real
// de campo en una base concreta y ampliar esta lista si hace falta).
// ---------------------------------------------------------------------------
function extractTaskDescription(d) {
  if (!d || typeof d !== 'object') return null;
  var directKeys = ['summary', 'title', 'task', 'description', 'intent', 'prompt'];
  for (var i = 0; i < directKeys.length; i++) {
    var v = d[directKeys[i]];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  var arr = d.parts || d.content || null;
  if (Array.isArray(arr)) {
    for (var j = 0; j < arr.length; j++) {
      var p = arr[j];
      if (!p) continue;
      if (typeof p === 'string' && p.trim()) return p.trim();
      if (typeof p.text === 'string' && p.text.trim()) return p.text.trim();
      if ((p.type === 'tool' || p.type === 'tool_use') && (p.tool || p.name)) {
        return '[tool] ' + (p.tool || p.name);
      }
    }
  }
  return null;
}

// Normaliza un titulo de sesion para agrupar tareas repetitivas: minusculas,
// espacios colapsados y secuencias numericas unificadas como '#' (para que
// "Fix bug 123" y "Fix bug 456" se cuenten como el mismo patron de tarea).
function normalizeTitle(t) {
  var s = (t || '(sin titulo)').toString().trim().toLowerCase();
  s = s.replace(/[0-9]+/g, '#');
  s = s.replace(/\s+/g, ' ');
  return s || '(sin titulo)';
}

// Informe para una ventana
function buildReport(w) {
  // Sesiones del proyecto en la ventana
  var allowed = recentSessionIds();
  var sc = inClause(allowed, 'id');
  var rows = query.apply(null,
    ["SELECT id, title, directory, model, agent, cost, tokens_input, tokens_output, " +
    "tokens_reasoning, tokens_cache_read, tokens_cache_write, time_created, time_updated " +
    "FROM session WHERE directory LIKE ? AND time_updated >= ? AND time_updated < ?" + sc.sql +
    " ORDER BY cost DESC",
    '%' + DIR_FILTER + '%', w.from, w.to].concat(sc.params)
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

  // Tareas repetitivas: agrupar las sesiones de la ventana por patron de
  // titulo normalizado, para ver que tipo de tarea se repite mas y cuanto
  // cuesta en conjunto (permite decidir donde optimizar primero).
  var byPattern = {};
  rows.forEach(function (r) {
    var pat = normalizeTitle(r.title);
    if (!byPattern[pat]) byPattern[pat] = { n: 0, cost: 0, in: 0, out: 0, sample: r.title };
    byPattern[pat].n++;
    byPattern[pat].cost += r.cost || 0;
    byPattern[pat].in += r.tokens_input || 0;
    byPattern[pat].out += r.tokens_output || 0;
  });
  var patternRows = Object.keys(byPattern).map(function (k) {
    var g = byPattern[k];
    return { pattern: k, sample: g.sample, n: g.n, cost: g.cost, in: g.in, out: g.out };
  }).sort(function (a, b) { return b.cost - a.cost; });

  // Mensajes del proyecto en la ventana (subagente x modelo), con el titulo
  // de la sesion a la que pertenecen para poder listar los prompts de mayor
  // consumo con su contexto.
  var mc = inClause(allowed, 'm.session_id');
  var msgs = query.apply(null,
    ["SELECT m.data, s.title as session_title, s.id as session_id FROM message m " +
    "JOIN session s ON s.id = m.session_id " +
    "WHERE s.directory LIKE ? AND m.time_created >= ? AND m.time_created < ?" + mc.sql,
    '%' + DIR_FILTER + '%', w.from, w.to].concat(mc.params)
  );

  var sa = {};        // por agente
  var saModel = {};   // agente -> {modelo -> agg}
  var highCost = [];  // mensajes individuales, para el desglose de tareas
  var anyDescriptionFound = false;
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

    var desc = extractTaskDescription(d);
    if (desc) anyDescriptionFound = true;
    highCost.push({
      sessionTitle: r.session_title || '(sin titulo)',
      agent: agent,
      model: model,
      desc: desc,
      cost: cost,
      tin: tin,
      tout: tout
    });
  });
  highCost.sort(function (a, b) { return b.cost - a.cost; });

  var md = '';
  md += '# Informe de consumo de cuota - ExploraCO\n\n';
  md += '- Generado: ' + fmtDate(now) + '\n';
  md += '- Ventana: ' + w.label + ' (desde ' + fmtDate(w.from) + ' hasta ' + fmtDate(w.to) + ')\n';
  md += '- Origen: ' + DB_PATH + ' (tablas session y message)\n';
  md += '- Proyecto (filtro dir): *' + DIR_FILTER + '*\n';
  md += '- Sesiones en ventana: ' + rows.length + ' | Mensajes con costo: ' + msgs.length + '\n';
  if (MAX_SESSIONS) md += '- Limite --max-sessions: ' + MAX_SESSIONS + ' sesiones mas recientes\n';
  md += '\n';

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

  md += '\n## Tareas Repetitivas (patron de titulo de sesion)\n\n';
  md += 'Agrupa las sesiones de esta ventana por un patron de titulo normalizado ';
  md += '(minusculas, numeros unificados como #) para detectar que tipo de tarea se ';
  md += 'repite mas y cuanto cuesta en conjunto. Es el primer lugar donde mirar para ';
  md += 'decidir que optimizar (por ejemplo: mover un patron muy repetido a un modelo ';
  md += 'mas barato, o revisar por que un mismo tipo de tarea necesita reintentos).\n\n';
  if (patternRows.length === 0) {
    md += '(sin sesiones en esta ventana)\n';
  } else {
    md += '| Patron de titulo (ejemplo real) | Repeticiones | Costo total | Costo promedio | Tokens in | Tokens out |\n';
    md += '|---|---:|---:|---:|---:|---:|\n';
    patternRows.slice(0, 15).forEach(function (r) {
      md += '| ' + esc(truncate(r.sample, 60)) + ' | ' + r.n + ' | ' + fmtUSD(r.cost) + ' | ' + fmtUSD(r.cost / r.n) + ' | ' + fmtTok(r.in) + ' | ' + fmtTok(r.out) + ' |\n';
    });
  }

  md += '\n## Desglose Detallado de Tareas y Prompts de Alto Consumo\n\n';
  md += 'Top ' + TOP_N + ' mensajes individuales por costo en esta ventana, con su sesion, ';
  md += 'subagente/modelo y (si la base lo expone) una descripcion de la tarea o prompt ';
  md += 'ejecutado. Util para responder "en que prompt o loop especifico se gasto mas".\n\n';
  if (!anyDescriptionFound) {
    md += '**Nota:** no se encontro ningun campo de descripcion reconocible en message.data ';
    md += 'para esta base (se probaron: summary, title, task, description, intent, prompt, ';
    md += 'parts, content). Ejecuta `node scripts/ejecucion/informe-cuota.js --schema` para ver las ';
    md += 'claves reales disponibles y, si corresponde, amplia extractTaskDescription() en ';
    md += 'el script con el nombre de campo correcto. Mientras tanto se muestra el resto del ';
    md += 'contexto disponible (sesion, agente, modelo, costo, tokens).\n\n';
  }
  md += '| Sesion / Tarea | Descripcion de la tarea | Subagente / Modelo | Costo | Tokens |\n';
  md += '|---|---|---|---:|---:|\n';
  highCost.slice(0, TOP_N).forEach(function (r) {
    var descCol = r.desc ? esc(truncate(r.desc, 90)) : '(no disponible)';
    md += '| ' + esc(truncate(r.sessionTitle, 45)) + ' | ' + descCol + ' | ' + esc(r.agent) + ' / ' + esc(r.model) +
      ' | ' + fmtUSD(r.cost) + ' | in ' + fmtTok(r.tin) + ' / out ' + fmtTok(r.tout) + ' |\n';
  });

  return md;
}

// ---------------------------------------------------------------------------
// Helpers de --max-sessions (T4.3)
// --max-sessions=N limita el escaneo a las N sesiones mas recientes del
// directorio (por time_updated). N debe ser un entero >= 1. Devuelve:
//   null      -> sin limite (flag ausente)
//   entero    -> limite valido
//   undefined -> valor invalido (ya se emitio error legible)
// ---------------------------------------------------------------------------
function parseMaxSessionsArg() {
  var idx = -1;
  for (var i = 0; i < ARGS.length; i++) {
    if (ARGS[i] === '--max-sessions' || ARGS[i].indexOf('--max-sessions=') === 0) { idx = i; break; }
  }
  if (idx === -1) return null;
  var raw;
  if (ARGS[idx].indexOf('--max-sessions=') === 0) {
    raw = ARGS[idx].slice('--max-sessions='.length);
  } else {
    raw = (ARGS[idx + 1] !== undefined && ARGS[idx + 1].indexOf('--') !== 0) ? ARGS[idx + 1] : '';
  }
  if (!/^[0-9]+$/.test(raw) || parseInt(raw, 10) < 1) {
    console.error('ERROR: --max-sessions requiere un entero >= 1 (recibido: "' + raw + '").');
    process.exitCode = 1;
    return undefined;
  }
  return parseInt(raw, 10);
}

// IDs de las N sesiones mas recientes del directorio, o null si no hay limite.
function recentSessionIds() {
  if (!MAX_SESSIONS) return null;
  return query(
    "SELECT id FROM session WHERE directory LIKE ? ORDER BY time_updated DESC LIMIT ?",
    '%' + DIR_FILTER + '%', MAX_SESSIONS
  ).map(function (r) { return r.id; });
}

// Fragmento SQL " AND <col> IN (?,?,...)" para acotar una consulta a un
// conjunto de sesiones. ids=null -> sin restriccion; ids=[] -> sin filas.
function inClause(ids, col) {
  if (!ids) return { sql: '', params: [] };
  if (ids.length === 0) return { sql: ' AND 1=0', params: [] };
  var ph = ids.map(function () { return '?'; }).join(',');
  return { sql: ' AND ' + col + ' IN (' + ph + ')', params: ids.slice() };
}

// ---------------------------------------------------------------------------
// Modo --task (T4.1): delta de la tanda actual desde una marca.
// La marca es un ID de sesion (prefijo suficiente) o un timestamp ISO. Sin
// marca intenta resolver la sesion mas reciente no archivada del directorio.
// Los tokens por agente salen de message.data.tokens, que en esta base tiene
// las subclaves reales: input, output, reasoning y cache.{read,write}.
// ---------------------------------------------------------------------------
function parseMarkTime(raw) {
  if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}(T[0-9]{2}:[0-9]{2}(:[0-9]{2})?)?/.test(raw)) return null;
  var t = Date.parse(raw);
  return isNaN(t) ? null : t;
}

function resolveTaskMark() {
  var raw = argValue('--task=');
  if (raw === null || raw === '') {
    var cand = query(
      "SELECT id, time_created FROM session WHERE directory LIKE ? AND time_archived IS NULL " +
      "ORDER BY time_updated DESC LIMIT 1",
      '%' + DIR_FILTER + '%'
    );
    if (!cand.length) {
      cand = query(
        "SELECT id, time_created FROM session WHERE directory LIKE ? ORDER BY time_updated DESC LIMIT 1",
        '%' + DIR_FILTER + '%'
      );
    }
    if (!cand.length) {
      console.error('AVISO: no se pudo resolver la marca automatica de --task para el directorio "' +
        DIR_FILTER + '". Ejecuta --task=<marca> con un ID de sesion o un timestamp ISO, por');
      console.error('ejemplo: --task=ses_abc123  o  --task=2026-09-28T14:30:00');
      process.exitCode = 1;
      return null;
    }
    return { sessionId: cand[0].id, from: cand[0].time_created, kind: 'auto', label: cand[0].id + ' (auto)' };
  }
  var t = parseMarkTime(raw);
  if (t !== null) {
    return { sessionId: null, from: t, kind: 'timestamp', label: raw + ' (timestamp)' };
  }
  var s = query(
    "SELECT id, time_created FROM session WHERE directory LIKE ? AND id LIKE ? ORDER BY time_updated DESC LIMIT 1",
    '%' + DIR_FILTER + '%', raw + '%'
  );
  if (s.length) {
    return { sessionId: s[0].id, from: s[0].time_created, kind: 'session', label: s[0].id + ' (id)' };
  }
  console.error('ERROR: --task=<marca> no resuelto: "' + raw + '" no es un timestamp ISO valido');
  console.error('(YYYY-MM-DDTHH:MM[:SS]) ni el prefijo de ninguna sesion del directorio "' + DIR_FILTER + '".');
  process.exitCode = 1;
  return null;
}

function runTask() {
  var mark = resolveTaskMark();
  if (!mark) return;

  var allowed = recentSessionIds();
  var mc = inClause(allowed, 'm.session_id');
  var sql = "SELECT m.data, m.session_id, s.title as session_title FROM message m " +
    "JOIN session s ON s.id = m.session_id " +
    "WHERE s.directory LIKE ? AND m.time_created >= ?";
  var params = ['%' + DIR_FILTER + '%', mark.from];
  if (mark.sessionId) { sql += " AND m.session_id = ?"; params.push(mark.sessionId); }
  sql += mc.sql;
  params = params.concat(mc.params);
  var msgs = query.apply(null, [sql].concat(params));

  function emptyAgg() { return { in: 0, out: 0, rea: 0, cr: 0, cw: 0, cost: 0, sess: {} }; }
  function totalOf(a) { return a.in + a.out + a.rea + a.cr + a.cw; }
  var tot = emptyAgg();
  var byAgent = {};
  var sessSet = {};
  var seen = { reasoning: false, cache_read: false, cache_write: false };
  msgs.forEach(function (r) {
    var d;
    try { d = JSON.parse(r.data); } catch (e) { return; }
    var t = d.tokens || {};
    var hasRea = Object.prototype.hasOwnProperty.call(t, 'reasoning');
    var cache = t.cache || {};
    var hasCR = Object.prototype.hasOwnProperty.call(cache, 'read');
    var hasCW = Object.prototype.hasOwnProperty.call(cache, 'write');
    if (hasRea) seen.reasoning = true;
    if (hasCR) seen.cache_read = true;
    if (hasCW) seen.cache_write = true;
    var tin = t.input || 0, tout = t.output || 0;
    var trea = hasRea ? (t.reasoning || 0) : 0;
    var tcr = hasCR ? (cache.read || 0) : 0;
    var tcw = hasCW ? (cache.write || 0) : 0;
    var cost = d.cost || 0;
    var agent = d.agent || '(principal)';
    sessSet[r.session_id] = true;
    tot.in += tin; tot.out += tout; tot.rea += trea; tot.cr += tcr; tot.cw += tcw; tot.cost += cost;
    if (!byAgent[agent]) byAgent[agent] = emptyAgg();
    var g = byAgent[agent];
    g.in += tin; g.out += tout; g.rea += trea; g.cr += tcr; g.cw += tcw; g.cost += cost; g.sess[r.session_id] = true;
  });

  function cell(v, present) { return present ? fmtTok(v) : 'n/d'; }
  function rowCells(a, sessCount) {
    return '| ' + cell(a.in, true) + ' | ' + cell(a.out, true) + ' | ' + cell(a.rea, seen.reasoning) +
      ' | ' + cell(a.cr, seen.cache_read) + ' | ' + cell(a.cw, seen.cache_write) +
      ' | ' + fmtTok(totalOf(a)) + ' | ' + fmtUSD(a.cost) + ' | ' + sessCount + ' |';
  }

  var md = '';
  md += '# Informe de delta de cuota - ExploraCO (--task)\n\n';
  md += '- Generado: ' + fmtDate(now) + '\n';
  md += '- Marca: ' + mark.label + '\n';
  md += '- Ventana: desde ' + fmtDate(mark.from) + ' hasta ' + fmtDate(now) + '\n';
  md += '- Origen: ' + DB_PATH + ' (tablas session y message)\n';
  md += '- Proyecto (filtro dir): *' + DIR_FILTER + '*\n';
  md += '- Sesiones en la ventana: ' + Object.keys(sessSet).length + ' | Mensajes: ' + msgs.length + '\n';
  if (MAX_SESSIONS) md += '- Limite --max-sessions: ' + MAX_SESSIONS + ' sesiones mas recientes\n';
  md += '\n';

  md += '## Delta de la tanda actual\n\n';
  md += '| input | output | reasoning | cache_read | cache_write | total | costo USD | num sesiones |\n';
  md += '|---:|---:|---:|---:|---:|---:|---:|---:|\n';
  md += rowCells(tot, Object.keys(sessSet).length) + '\n\n';

  md += '## Top ' + TOP_N + ' agentes por total (delta)\n\n';
  md += '| Agente | input | output | reasoning | cache_read | cache_write | total | costo USD | num sesiones |\n';
  md += '|---|---:|---:|---:|---:|---:|---:|---:|---:|\n';
  var agentRows = Object.keys(byAgent).map(function (k) {
    return { key: k, agg: byAgent[k], total: totalOf(byAgent[k]), n: Object.keys(byAgent[k].sess).length };
  }).sort(function (a, b) { return b.total - a.total; });
  if (agentRows.length === 0) {
    md += '| (sin mensajes en la ventana) | 0 | 0 | 0 | 0 | 0 | 0 | $0.0000 | 0 |\n';
  } else {
    agentRows.slice(0, TOP_N).forEach(function (r) {
      md += '| ' + esc(r.key) + ' ' + rowCells(r.agg, r.n) + '\n';
    });
  }
  md += '\n';

  md += 'Campos leidos del esquema: tokens.input, tokens.output';
  md += (seen.reasoning ? ', tokens.reasoning' : ' (reasoning: n/d)');
  md += (seen.cache_read ? ', tokens.cache.read' : ' (cache_read: n/d)');
  md += (seen.cache_write ? ', tokens.cache.write' : ' (cache_write: n/d)');
  md += '.\n';
  if (!seen.reasoning || !seen.cache_read || !seen.cache_write) {
    md += 'Nota: los campos marcados n/d no aparecieron en message.data.tokens de la ventana; ';
    md += 'no se inventan ni se cuentan como 0 medido (ver --schema para el esquema real).\n';
  }
  md += 'total = input + output + reasoning + cache_read + cache_write.\n';

  console.log(md);
}

// ---------------------------------------------------------------------------
// Modo --overhead (T4.2): estima el overhead de contexto (Capa 0 y 0b) leyendo
// .opencode/agent/*.md, .opencode/skills/*/SKILL.md, opencode.json y, si
// existe, docs/orquestacion/REFERENCIA-RUTEO.md. Son ESTIMACIONES con la
// heuristica chars/3.5; NO son mediciones de la DB.
//   Capa 0  = lo que se inyecta siempre: descripciones de agentes y skills +
//             opencode.json.
//   Capa 0b = payload al invocar: cuerpo (sin frontmatter) de agentes y skills.
// ---------------------------------------------------------------------------
function splitFrontmatter(txt) {
  var m = /^---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n?/.exec(txt);
  if (!m) return { fm: '', body: txt };
  return { fm: m[1], body: txt.slice(m[0].length) };
}
function fmDescription(fm) {
  var m = /(^|\r?\n)description:[ \t]*(.+)/.exec(fm);
  return m ? m[2].trim() : '';
}
function estTok(chars) { return chars / 3.5; }
function fmtTok1(v) { return (Math.round(v * 10) / 10).toFixed(1); }
function fmtCalc(label, chars, tokens) {
  return '- ' + label + ': ' + chars + ' chars / 3.5 = ' + fmtTok1(tokens) + ' tokens\n';
}

function runOverhead() {
  var root = process.cwd();
  var agentDir = path.join(root, '.opencode', 'agent');
  var skillsDir = path.join(root, '.opencode', 'skills');
  var configPath = null;
  var rootCfg = path.join(root, 'opencode.json');
  var cfgDir = path.join(root, 'config', 'opencode.json');
  if (fs.existsSync(rootCfg)) configPath = rootCfg;
  else if (fs.existsSync(cfgDir)) configPath = cfgDir;

  var agentFiles = [];
  try {
    agentFiles = fs.readdirSync(agentDir).filter(function (f) { return /\.md$/.test(f); });
  } catch (e) { agentFiles = []; }

  var skillFiles = [];
  try {
    fs.readdirSync(skillsDir, { withFileTypes: true }).forEach(function (ent) {
      if (!ent.isDirectory()) return;
      var p = path.join(skillsDir, ent.name, 'SKILL.md');
      if (fs.existsSync(p)) skillFiles.push(p);
    });
  } catch (e) { skillFiles = []; }

  var agentDesc = 0, agentBody = 0, skillDesc = 0, skillBody = 0;
  agentFiles.forEach(function (f) {
    var sp = splitFrontmatter(fs.readFileSync(path.join(agentDir, f), 'utf8'));
    agentDesc += fmDescription(sp.fm).length;
    agentBody += sp.body.length;
  });
  skillFiles.forEach(function (p) {
    var sp = splitFrontmatter(fs.readFileSync(p, 'utf8'));
    skillDesc += fmDescription(sp.fm).length;
    skillBody += sp.body.length;
  });

  var configChars = configPath ? fs.readFileSync(configPath, 'utf8').length : 0;

  var refPath = path.join(root, 'docs', 'orquestacion', 'REFERENCIA-RUTEO.md');
  var refExists = fs.existsSync(refPath);
  var refChars = refExists ? fs.readFileSync(refPath, 'utf8').length : 0;

  var capa0 = agentDesc + skillDesc + configChars;
  var capa0b = agentBody + skillBody;
  var total = capa0 + capa0b;

  var md = '';
  md += '# Informe de overhead de contexto - ExploraCO (--overhead)\n\n';
  md += '- Generado: ' + fmtDate(now) + '\n';
  md += '- Raiz: ' + root + '\n';
  md += '- Config usado: ' + (configPath || '(no encontrado)') + '\n';
  md += '- Agentes: ' + agentFiles.length + ' | Skills: ' + skillFiles.length + '\n';
  md += '- Estimador: chars / 3.5 (ESTIMACION, no medicion de la DB)\n\n';

  md += '## Estimacion por fuente\n\n';
  md += '| Fuente | Archivos | chars | tokens estimados |\n';
  md += '|---|---:|---:|---:|\n';
  md += '| Descripciones de agentes (Capa 0) | ' + agentFiles.length + ' | ' + agentDesc + ' | ' + fmtTok1(estTok(agentDesc)) + ' |\n';
  md += '| Descripciones de skills (Capa 0) | ' + skillFiles.length + ' | ' + skillDesc + ' | ' + fmtTok1(estTok(skillDesc)) + ' |\n';
  md += '| opencode.json (Capa 0) | ' + (configPath ? 1 : 0) + ' | ' + configChars + ' | ' + fmtTok1(estTok(configChars)) + ' |\n';
  md += '| Cuerpos de agentes (Capa 0b) | ' + agentFiles.length + ' | ' + agentBody + ' | ' + fmtTok1(estTok(agentBody)) + ' |\n';
  md += '| Cuerpos de skills (Capa 0b) | ' + skillFiles.length + ' | ' + skillBody + ' | ' + fmtTok1(estTok(skillBody)) + ' |\n';
  if (refExists) {
    md += '| REFERENCIA-RUTEO.md (capa adicional) | 1 | ' + refChars + ' | ' + fmtTok1(estTok(refChars)) + ' |\n';
  }
  md += '\n';

  md += '## Desglose por capa\n\n';
  md += '| Capa | chars | tokens estimados |\n';
  md += '|---|---:|---:|\n';
  md += '| Capa 0 (siempre inyectado) | ' + capa0 + ' | ' + fmtTok1(estTok(capa0)) + ' |\n';
  md += '| Capa 0b (payload al invocar) | ' + capa0b + ' | ' + fmtTok1(estTok(capa0b)) + ' |\n';
  md += '| Total (Capa 0 + Capa 0b) | ' + total + ' | ' + fmtTok1(estTok(total)) + ' |\n';
  if (refExists) {
    md += '| REFERENCIA-RUTEO.md (capa adicional) | ' + refChars + ' | ' + fmtTok1(estTok(refChars)) + ' |\n';
    md += '| Total + capa adicional | ' + (total + refChars) + ' | ' + fmtTok1(estTok(total + refChars)) + ' |\n';
  }
  md += '\n';

  md += '## Calculo explicito del estimador (chars / 3.5 = tokens)\n\n';
  md += fmtCalc('Capa 0', capa0, estTok(capa0));
  md += fmtCalc('Capa 0b', capa0b, estTok(capa0b));
  md += fmtCalc('Total', total, estTok(total));
  if (refExists) md += fmtCalc('REFERENCIA-RUTEO.md', refChars, estTok(refChars));
  md += '\n';
  md += 'Nota: --overhead son estimaciones con la heuristica chars/3.5, no mediciones de la DB.\n';

  console.log(md);
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
