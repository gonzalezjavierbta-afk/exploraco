// scripts/smoke_guard_capa_gratis.js
// Smoke OFFLINE de los caminos de verificar-capa-gratis.js que dependen de
// opencode.db, que npm test NO cubria (solo ejercitaba el camino estatico).
//
// Que comprueba y por que:
//   (a) ESCALADA TARDIA: 1er mensaje FREE + ultimo PAGO con contexto grande ->
//       aviso con coste estimado (rama positiva del detector).
//   (b) CONTROL POSITIVO: todo FREE con contexto grande -> sin aviso.
//   (c) RUIDO A: mensajes PAGO y luego FREE de ultimo -> sin aviso (no hay par
//       FREE -> PAGO: el ultimo turno es el que se factura).
//   (d) REGRESION DEL SUELO: FREE -> PAGO con contexto trivial -> cambio de tier,
//       NO escalada tardia (sin el lenguaje de alarma de las ~35x).
//   (e) PREFLIGHT por encima del umbral -> RESULTADO: AVISO con el numero.
//   (f) PREFLIGHT por debajo del umbral -> RESULTADO: OK.
//   (g) verificar-herencia: padre e hijo con el mismo modelo (no se pierde).
//   (h) ASCII-safety del guard (ADR-002) y DB sintetica solo en %TEMP%.
//
// Metodo: NO hay red, NO hay opencode.db real y NO se escribe nada en el repo.
// Se fabrican dos DB sinteticas minimas en %TEMP% con el esquema que el guard lee
// (session + message) y se ejecuta el guard REAL como subproceso con --db, leido
// en SOLO LECTURA. El script es idempotente: reconstruye las DB en cada corrida.
//
// Run: node scripts/smoke_guard_capa_gratis.js
// ASCII-safe (ADR-002): 0 bytes > 127, 0 backticks. CommonJS (BUG-001).
'use strict';

var fs = require('fs');
var os = require('os');
var path = require('path');
var child = require('child_process');

var GUARD = path.join(__dirname, 'ejecucion', 'verificar-capa-gratis.js');
var TMP_DIR = path.join(os.tmpdir(), 'opencode', 'qa-guard-capa-gratis');
var DB_GRANDE = path.join(TMP_DIR, 'qa-capa-gratis-grande.db');
var DB_MINI = path.join(TMP_DIR, 'qa-capa-gratis-mini.db');
var DB_REAL = path.join(os.homedir(), '.local', 'share', 'opencode', 'opencode.db');
var REPO = path.resolve(__dirname, '..');

var passed = 0;
var failed = 0;
function check(label, cond, extra) {
  if (cond) { passed++; console.log('PASS - ' + label); }
  else {
    failed++;
    console.log('FAIL - ' + label + (extra ? '  [' + extra + ']' : ''));
    process.exitCode = 1;
  }
}

// --- node:sqlite (Node 22+, built-in, sin dependencias) -----------------------

var sqlite = null;
try { sqlite = require('node:sqlite'); } catch (e) { sqlite = null; }
if (!sqlite || !sqlite.DatabaseSync) {
  console.log('SKIP - scripts/smoke_guard_capa_gratis.js necesita node:sqlite (Node 22+).');
  console.log('        Sin el, el guard abre la DB en degradado y no hay nada que medir.');
  process.exit(0);
}
var DatabaseSync = sqlite.DatabaseSync;

// --- DB sintetica en %TEMP% (nunca en el repo, nunca la real) ------------------

function esSintetica(dest) {
  var norm = path.resolve(dest).replace(/\\/g, '/').toLowerCase();
  var tmp = path.resolve(TMP_DIR).replace(/\\/g, '/').toLowerCase() + '/';
  var repo = path.resolve(REPO).replace(/\\/g, '/').toLowerCase() + '/';
  if (norm === path.resolve(DB_REAL).replace(/\\/g, '/').toLowerCase()) return false;
  if (norm.indexOf(tmp) !== 0) return false;
  if (norm.indexOf(repo) === 0) return false;
  return true;
}
[DB_GRANDE, DB_MINI].forEach(function (d) {
  if (!esSintetica(d)) {
    console.log('FAIL - la DB sintetica esta fuera de %TEMP% o dentro del repo: ' + d);
    process.exit(1);
  }
});

var FREE_M = 'space-bunny-free', FREE_P = 'opencode';
var PAGO_M = 'deepseek-v4.1-flash', PAGO_P = 'opencode-go';
var CTX_ALTO = 700000; // >= suelo: escalada tardia real
var CTX_BAJO = 20000;  // contexto de arranque

function msgJson(modelID, providerID, agente, tokens, cost, i) {
  return JSON.stringify({
    role: 'assistant', modelID: modelID, providerID: providerID, agent: agente,
    time: { created: 1700000000000 + i * 1000 },
    tokens: tokens, cost: cost,
  });
}

function serie(ctx, modelo, provider, agente, n) {
  var out = [];
  for (var i = 0; i < n; i++) {
    out.push(msgJson(modelo, provider, agente,
      { input: 100, output: 500, cache: { read: ctx, write: 0 } }, 0, i));
  }
  return out;
}

function crearDb(dest, sesiones) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  if (fs.existsSync(dest)) fs.unlinkSync(dest);
  var db = new DatabaseSync(dest);
  db.exec('CREATE TABLE session (id TEXT PRIMARY KEY, parent_id TEXT, agent TEXT, model TEXT, cost REAL, directory TEXT, time_updated INTEGER, time_created INTEGER, tokens_input INTEGER, tokens_output INTEGER, tokens_reasoning INTEGER, tokens_cache_read INTEGER, tokens_cache_write INTEGER)');
  db.exec('CREATE TABLE message (id TEXT PRIMARY KEY, session_id TEXT, time_created INTEGER, data TEXT)');
  var insS = db.prepare('INSERT INTO session (id,parent_id,agent,model,cost,directory,time_updated,time_created,tokens_input,tokens_output,tokens_reasoning,tokens_cache_read,tokens_cache_write) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)');
  var insM = db.prepare('INSERT INTO message (id,session_id,time_created,data) VALUES (?,?,?,?)');
  sesiones.forEach(function (s) {
    insS.run(s.id, s.parent_id || null, s.agent, s.model, 0, s.dir, s.upd, s.upd,
      s.tokensInput || 0, 0, 0, s.tokensCache || 0, 0);
    s.mensajes.forEach(function (m, i) {
      insM.run(s.id + '-m' + i, s.id, 1700000000000 + i * 1000, m);
    });
  });
  db.close();
}

// DB 1: escalada tardia + sus controles. qa-escalada es la sesion MAS RECIENTE
// (time_updated mayor) para que --preflight la tome como sesion activa.
crearDb(DB_GRANDE, [
  {
    id: 'qa-escalada', agent: 'build', model: PAGO_P + '/' + PAGO_M,
    dir: 'C:/qa-sintetico', upd: 1700000010, tokensInput: 100, tokensCache: CTX_ALTO,
    mensajes: serie(CTX_BAJO, FREE_M, FREE_P, 'free-build', 5).concat(
      serie(CTX_ALTO, PAGO_M, PAGO_P, 'free-build', 4)),
  },
  {
    id: 'qa-todo-free', agent: 'free-build', model: FREE_P + '/' + FREE_M,
    dir: 'C:/qa-sintetico', upd: 1700000009, tokensInput: 100, tokensCache: CTX_ALTO,
    mensajes: serie(CTX_ALTO, FREE_M, FREE_P, 'free-build', 9),
  },
  {
    id: 'qa-ultimo-free', agent: 'free-build', model: FREE_P + '/' + FREE_M,
    dir: 'C:/qa-sintetico', upd: 1700000008, tokensInput: 100, tokensCache: CTX_ALTO,
    mensajes: serie(300000, PAGO_M, PAGO_P, 'qa', 4).concat(
      serie(CTX_ALTO, FREE_M, FREE_P, 'qa', 4)),
  },
  {
    id: 'qa-cambio-tier-mini', agent: 'free-build', model: PAGO_P + '/' + PAGO_M,
    dir: 'C:/qa-sintetico', upd: 1700000007, tokensInput: 40, tokensCache: 0,
    mensajes: [
      msgJson(FREE_M, FREE_P, 'qa', { input: 40, output: 60 }, 0, 0),
      msgJson(PAGO_M, PAGO_P, 'qa', { input: 40, output: 160 }, 0, 1),
    ],
  },
  {
    id: 'qa-her-free', agent: 'free-build', model: FREE_P + '/' + FREE_M,
    dir: 'C:/qa-sintetico', upd: 1700000006, tokensInput: 100, tokensCache: CTX_BAJO,
    mensajes: serie(CTX_BAJO, FREE_M, FREE_P, 'free-build', 3),
  },
  {
    id: 'qa-her-free-hijo', parent_id: 'qa-her-free', agent: 'architect',
    model: FREE_P + '/' + FREE_M, dir: 'C:/qa-sintetico', upd: 1700000005,
    tokensInput: 100, tokensCache: CTX_BAJO, mensajes: [],
  },
]);

// DB 2: preflight con contexto trivial (por debajo del suelo).
crearDb(DB_MINI, [
  {
    id: 'qa-mini', agent: 'free-build', model: FREE_P + '/' + FREE_M,
    dir: 'C:/qa-sintetico', upd: 1700000020, tokensInput: 40, tokensCache: 0,
    mensajes: [
      msgJson(FREE_M, FREE_P, 'qa', { input: 40, output: 60 }, 0, 0),
      msgJson(FREE_M, FREE_P, 'qa', { input: 40, output: 60 }, 0, 1),
    ],
  },
]);

// --- Ejecucion del guard REAL (subproceso) ------------------------------------

function correr(args) {
  var r = child.spawnSync(process.execPath, [GUARD].concat(args), { encoding: 'utf8' });
  return { code: r.status, out: String(r.stdout || '') + String(r.stderr || '') };
}

var guard = require(path.join(GUARD));

// (a) escalada tardia positiva: par FREE -> PAGO con contexto grande.
var a = correr(['reparto', '--sesion', 'qa-escalada', '--db', DB_GRANDE]);
var aObj = guard.repartoPorTier(DB_GRANDE, 'qa-escalada');
check('(a) reparto: escalada tardia avisada con coste estimado',
  a.code === 0 &&
  a.out.indexOf('AVISO DE ESCALADA TARDIA') >= 0 &&
  a.out.indexOf('coste estimado $') >= 0 &&
  a.out.indexOf('CAMBIO DE TIER') < 0 &&
  aObj.escalada && aObj.escalada.tipo === 'ESCALADA-TARDIA',
  'tipo=' + (aObj.escalada ? aObj.escalada.tipo : 'null'));

// (b) control positivo: todo FREE con contexto grande -> nada que avisar.
var b = correr(['reparto', '--sesion', 'qa-todo-free', '--db', DB_GRANDE]);
var bObj = guard.repartoPorTier(DB_GRANDE, 'qa-todo-free');
check('(b) reparto: todo FREE con contexto grande no genera aviso',
  b.code === 0 && b.out.indexOf('ESCALADA') < 0 && bObj.escalada === null,
  'escalada=' + String(bObj.escalada));

// (c) ruido: el ULTIMO mensaje es FREE -> el turno que se factura es FREE.
var c = correr(['reparto', '--sesion', 'qa-ultimo-free', '--db', DB_GRANDE]);
var cObj = guard.repartoPorTier(DB_GRANDE, 'qa-ultimo-free');
check('(c) reparto: ultimo mensaje FREE no genera aviso',
  c.code === 0 && c.out.indexOf('ESCALADA') < 0 && cObj.escalada === null,
  'escalada=' + String(cObj.escalada));

// (d) regresion del suelo: FREE -> PAGO con contexto trivial = cambio de tier.
var d = correr(['reparto', '--sesion', 'qa-cambio-tier-mini', '--db', DB_GRANDE]);
var dObj = guard.repartoPorTier(DB_GRANDE, 'qa-cambio-tier-mini');
check('(d) regresion: cambio de tier con contexto trivial NO es escalada tardia',
  d.code === 0 &&
  d.out.indexOf('CAMBIO DE TIER, NO escalada tardia') >= 0 &&
  d.out.indexOf('AVISO DE ESCALADA TARDIA') < 0 &&
  d.out.indexOf('~35x') < 0 &&
  d.out.indexOf('el contexto manda en el precio') < 0 &&
  dObj.escalada && dObj.escalada.tipo === 'CAMBIO-DE-TIER',
  'tipo=' + (dObj.escalada ? dObj.escalada.tipo : 'null'));

// (e) preflight con contexto por encima del umbral.
var e = correr(['--preflight', '--db', DB_GRANDE]);
check('(e) preflight: contexto grande da AVISO con el numero',
  e.code === 0 &&
  e.out.indexOf('RESULTADO: AVISO') >= 0 &&
  e.out.indexOf('Umbral de aviso: ' + String(guard.UMBRAL_PREFLIGHT_TOKENS).replace(/\B(?=(\d{3})+(?!\d))/g, ',')) >= 0,
  e.out.split('\n').filter(function (l) { return /RESULTADO|Umbral/.test(l); }).join(' / '));

// (f) preflight con contexto trivial: cambiar de modelo sigue siendo barato.
var f = correr(['--preflight', '--db', DB_MINI]);
check('(f) preflight: contexto trivial da OK por debajo del umbral',
  f.code === 0 && f.out.indexOf('RESULTADO: OK. Contexto por debajo del umbral') >= 0,
  f.out.split('\n').filter(function (l) { return /RESULTADO/.test(l); }).join(' / '));

// (g) la asercion de herencia sigue viva: hijo.model == padre.model.
var g = correr(['verificar-herencia', '--sesion', 'qa-her-free', '--db', DB_GRANDE]);
check('(g) verificar-herencia: 1 par padre/hijo coincide en modelo',
  g.code === 0 && g.out.indexOf('RESULTADO: OK. 1 par(es) padre/hijo coinciden en modelo.') >= 0,
  g.out.split('\n').filter(function (l) { return /RESULTADO/.test(l); }).join(' / '));

// (h) ASCII-safety del guard (ADR-002) y DB solo en %TEMP%.
var buf = fs.readFileSync(GUARD);
var altos = 0;
for (var i = 0; i < buf.length; i++) { if (buf[i] > 127) altos++; }
check('(h) guard ASCII-safe (0 bytes > 127, 0 backticks) y DB solo en %TEMP%',
  altos === 0 &&
  buf.toString('utf8').indexOf(String.fromCharCode(96)) < 0 &&
  esSintetica(DB_GRANDE) && esSintetica(DB_MINI) &&
  fs.existsSync(DB_GRANDE) && fs.existsSync(DB_MINI),
  'bytes>127=' + altos);

console.log('');
console.log('SMOKE OK: ' + passed + '/' + (passed + failed) + ' | DB sintetica: ' + TMP_DIR);
if (failed) process.exitCode = 1;