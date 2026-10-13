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
//   ADR-096 (nuevos, todos offline):
//   (i) SIN_ADMITIR (opencode/exo-free) NO falla: fallas 0 y bloque AVISOS no
//       vacio; y el check estatico sigue saliendo con codigo 0.
//   (j) opencode/big-pickle: ROTO_SUBAGENTE con --rol subagente y NO con el
//       default --rol sesion.
//   (k) tierDe(m) con UN argumento == tierDe(m, 'sesion') y la coincidencia de
//       ids es EXACTA (una variante abreviada o parecida NO es FREE).
//   (l) control positivo de deteccion: un hijo con un modelo PROPIO sigue dando
//       CASCADA ROTA con exit 1 (no se pierde poder de deteccion).
//   (m) el reparto imprime las claves nuevas sin romper las 4 lineas de siempre.
//
// Metodo: NO hay red, NO hay opencode.db real y NO se escribe nada en el repo.
// Se fabrican dos DB sinteticas minimas en %TEMP% con el esquema que el guard lee
// (session + message) y se ejecuta el guard REAL como subproceso con --db, leido
// en SOLO LECTURA. El script es idempotente: reconstruye las DB en cada corrida.
//
// Nota de datos sinteticos: un hijo sin ningun mensaje de asistente NO es
// fechable (filasSesion no devuelve time_created), asi que para reconstruir el
// instante de spawn cada hijo de prueba lleva al menos un mensaje, igual que en
// opencode.db real. El caso "no reconstruible" degrada a AVISO, nunca a FALLA.
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
var SIN_ADMITIR_M = 'exo-free', SIN_ADMITIR_P = 'opencode';
var BIG_PICKLE_M = 'big-pickle', BIG_PICKLE_P = 'opencode';
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
    tokensInput: 100, tokensCache: CTX_BAJO,
    mensajes: serie(CTX_BAJO, FREE_M, FREE_P, 'architect', 1),
  },
  // ADR-096 (i): gratis REAL y no medido -> informativo, nunca falla.
  {
    id: 'qa-sin-admitir', agent: 'free-build', model: SIN_ADMITIR_P + '/' + SIN_ADMITIR_M,
    dir: 'C:/qa-sintetico', upd: 1700000004, tokensInput: 100, tokensCache: CTX_BAJO,
    mensajes: serie(CTX_BAJO, SIN_ADMITIR_M, SIN_ADMITIR_P, 'free-build', 2),
  },
  // ADR-096 (j): big-pickle (NO_SUBAGENTE), unico con error literal medido.
  {
    id: 'qa-big-pickle', agent: 'free-build', model: BIG_PICKLE_P + '/' + BIG_PICKLE_M,
    dir: 'C:/qa-sintetico', upd: 1700000003, tokensInput: 100, tokensCache: CTX_BAJO,
    mensajes: serie(CTX_BAJO, BIG_PICKLE_M, BIG_PICKLE_P, 'free-build', 2),
  },
  // ADR-096 (l): control positivo de deteccion. El hijo declara un modelo propio
  // (PAGO) mientras el padre corria en FREE en el instante del spawn.
  {
    id: 'qa-pin-roto', agent: 'free-build', model: FREE_P + '/' + FREE_M,
    dir: 'C:/qa-sintetico', upd: 1700000002, tokensInput: 100, tokensCache: CTX_BAJO,
    mensajes: serie(CTX_BAJO, FREE_M, FREE_P, 'free-build', 3),
  },
  {
    id: 'qa-pin-roto-hijo', parent_id: 'qa-pin-roto', agent: 'js-silo-dev',
    model: PAGO_P + '/' + PAGO_M, dir: 'C:/qa-sintetico', upd: 1700000001,
    tokensInput: 100, tokensCache: CTX_BAJO,
    mensajes: serie(CTX_BAJO, PAGO_M, PAGO_P, 'js-silo-dev', 1),
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

// --- Casos nuevos de ADR-096 --------------------------------------------------

// (i) SIN_ADMITIR es informativo: fallas 0 y bloque AVISOS no vacio. El guard
// NO puede pasar a CASCADA ROTA (ni a falla) por un gratis real sin medir.
var i1 = correr(['reparto', '--sesion', 'qa-sin-admitir', '--db', DB_GRANDE]);
var i1Obj = guard.repartoPorTier(DB_GRANDE, 'qa-sin-admitir');
var i2 = correr([]);
var i2Obj = guard.verificar(REPO);
check('(i) SIN_ADMITIR: reparto con fallas 0, AVISOS no vacio y exit 0',
  i1.code === 0 &&
  i1Obj.fallas.length === 0 &&
  i1Obj.avisos.length > 0 &&
  i1Obj.porTier.FUERA_ADMITIDO_A_CONSCIENCIA === 2 &&
  i1.out.indexOf('AVISOS:') >= 0 &&
  i1.out.indexOf('RESULTADO: OK') >= 0,
  'fallas=' + i1Obj.fallas.length + ' avisos=' + i1Obj.avisos.length +
  ' tier=' + (i1Obj.porModelo[0] ? i1Obj.porModelo[0].tier : '?'));
check('(i2) el check estatico sigue con exit 0 y publica SIN_ADMITIR en AVISOS',
  i2.code === 0 &&
  i2Obj.fallas.length === 0 &&
  i2Obj.avisos.length > 0 &&
  i2.out.indexOf('AVISOS:') >= 0 &&
  i2.out.indexOf('SIN_ADMITIR (5)') >= 0 &&
  i2.out.indexOf('RESULTADO: OK') >= 0,
  i2.out.split('\n').filter(function (l) { return /RESULTADO|SIN_ADMITIR \(/.test(l); }).join(' / '));

// (j) big-pickle: ROTO_SUBAGENTE SOLO con --rol subagente.
var j1 = correr(['reparto', '--sesion', 'qa-big-pickle', '--rol', 'subagente', '--db', DB_GRANDE]);
var j2 = correr(['reparto', '--sesion', 'qa-big-pickle', '--db', DB_GRANDE]);
var j1Obj = guard.repartoPorTier(DB_GRANDE, 'qa-big-pickle', 'subagente');
var j2Obj = guard.repartoPorTier(DB_GRANDE, 'qa-big-pickle');
check('(j) big-pickle: ROTO_SUBAGENTE con --rol subagente, y NO con el default sesion',
  j1.code === 0 && j2.code === 0 &&
  j1Obj.porModelo[0].tier === 'ROTO_SUBAGENTE' &&
  j1.out.indexOf('| ROTO_SUBAGENTE |') >= 0 &&
  j2Obj.porModelo[0].tier === 'FUERA-DE-ALLOWLIST' &&
  guard.tierDe('opencode/' + BIG_PICKLE_M, 'subagente') === 'ROTO_SUBAGENTE' &&
  guard.tierDe('opencode/' + BIG_PICKLE_M) === 'FUERA-DE-ALLOWLIST',
  'subagente=' + j1Obj.porModelo[0].tier + ' sesion=' + j2Obj.porModelo[0].tier);

// (k) firma retrocompatible: tierDe(m) == tierDe(m, 'sesion') en todos los casos,
// y la coincidencia de ids es EXACTA (una variante parecida NO es FREE).
var ids = ['opencode/space-bunny-free', 'opencode-go/longcat-2.5-preview-free',
  'opencode/big-pickle', 'opencode/exo-free', 'opencode-go/space-bunny-free',
  'opencode-go/deepseek-v4.1-flash', 'opencode-go/space-bunny', 'opencode/space-bunny',
  'space-bunny-free', 'opencode/nemotron-3.5-lightning-free'];
var firmaOk = ids.every(function (m) { return guard.tierDe(m) === guard.tierDe(m, 'sesion'); });
check('(k) tierDe(m) con UN argumento == tierDe(m, sesion) y coincidencia exacta de ids',
  firmaOk &&
  guard.tierDe('opencode/space-bunny-free') === 'FREE' &&
  guard.tierDe('opencode/space-bunny') !== 'FREE' &&
  guard.tierDe('space-bunny-free') !== 'FREE' &&
  guard.tierDe('opencode-go/space-bunny-free') === 'ROTO_CATALOGO' &&
  guard.tierDe('opencode/exo-free') === 'FUERA_ADMITIDO_A_CONSCIENCIA' &&
  guard.tierDe('opencode/nemotron-3.5-lightning-free') === 'NO_MEDIDO' &&
  guard.esTrampaDeNombre('opencode-go/space-bunny') === true &&
  guard.esTrampaDeNombre('opencode/space-bunny-free') === false,
  'variante=' + guard.tierDe('opencode/space-bunny') + ' gratis=' + guard.tierDe('opencode/space-bunny-free'));

// (l) control positivo: un hijo con modelo propio sigue dando CASCADA ROTA (exit 1).
var l = correr(['verificar-herencia', '--sesion', 'qa-pin-roto', '--db', DB_GRANDE]);
var lObj = guard.verificarHerencia(DB_GRANDE, 'qa-pin-roto');
check('(l) pin real detectado: CASCADA ROTA con exit 1 (no se pierde deteccion)',
  l.code === 1 && l.out.indexOf('CASCADA ROTA') >= 0 && lObj.fallas.length === 1,
  'exit=' + l.code + ' fallas=' + lObj.fallas.length);

// (m) el reparto conserva las 4 lineas de siempre y anade las claves nuevas.
check('(m) reparto: 4 claves de siempre intactas mas las claves nuevas de ADR-096',
  i1.out.indexOf('Reparto por tier (mensajes de asistente): FREE ') >= 0 &&
  i1.out.indexOf(' | PAGO ') >= 0 &&
  i1.out.indexOf(' | ROTO ') >= 0 &&
  i1.out.indexOf(' | fuera de allowlist ') >= 0 &&
  i1.out.indexOf('ROTO_SUBAGENTE') >= 0 &&
  i1.out.indexOf('NO_MEDIDO') >= 0 &&
  Object.prototype.hasOwnProperty.call(i1Obj.porTier, 'FUERA') &&
  Object.prototype.hasOwnProperty.call(i1Obj.porTier, 'ROTO_CATALOGO'),
  'claves=' + Object.keys(i1Obj.porTier).join(','));

console.log('');
console.log('SMOKE OK: ' + passed + '/' + (passed + failed) + ' | DB sintetica: ' + TMP_DIR);
if (failed) process.exitCode = 1;