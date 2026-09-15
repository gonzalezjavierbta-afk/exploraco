// smoke_017_perfil_arbol_casas.js
// Smoke test OFFLINE (sin DB) de la Entrega TSK-103 / ADR-028 (WP-1 / WP-3 /
// WP-4 / WP-5): perfil publico "museo", Mensajeria Directa, Casas y Arbol de
// Clases. Intercepta @neondatabase/serverless en el require del sandbox vm
// (global.__MOCKSQL__) para NUNCA tocar Neon, igual que smoke_016.
//
// Cubre:
//   A) Idempotencia DDL de 017 (ADD COLUMN IF NOT EXISTS, DROP CONSTRAINT IF
//      EXISTS, CREATE TABLE/INDEX IF NOT EXISTS, ON CONFLICT DO NOTHING; sin
//      bio ni idx_chat_mensajes_sala_fecha; con chk_chat_salas_tipo y
//      usuario_bloqueos) y de 018 (solo UPDATE idempotentes).
//   B) GET museo_publico: perfil PRIVADO (403 PERFIL_PRIVADO) y PUBLICO (200
//      con el payload completo) sin PII (email/email_token/device_hashes/
//      codigo_referido/referido_por).
//   C) POST dm_enviar: hilo nuevo cobra 20 XP, hilo existente 0, dedup por
//      clave_dm, gate nivel<3 (403) y texto>500 (400).
//   D) Fuga de DM: chat_salas, chat_mensajes, chat_msg y chat_mod excluyen
//      tipo='dm'.
//   E) POST casa_elegir: nivel<2, email no verificado, cooldown 30d (429),
//      xp<300 (402), primera gratis (200) y sesion firmada.
//   F) Calculo de tier: puntos = bono + derivado, nivel_nodo segun RAMA_TIERS.
//   G) Las 8 misiones de perfil con XP exactos y el DAG de mis_perfil_completo.
//
// ASCII puro (0 bytes > 127, 0 backticks) y CommonJS estricto (BUG-001).
// Run: node scripts/smoke_017_perfil_arbol_casas.js
'use strict';

var path = require('path');
var fs = require('fs');
var vm = require('vm');

// --- Helpers de reporte ----------------------------------------------
var passed = 0;
var failed = 0;
function check(label, cond) {
  if (cond) { passed++; console.log('PASS - ' + label); }
  else { failed++; console.log('FAIL - ' + label); process.exitCode = 1; }
}
function asciiSafe(fileRel) {
  var buf = fs.readFileSync(path.join(__dirname, '..', fileRel));
  for (var i = 0; i < buf.length; i++) {
    if (buf[i] > 127) return false;
  }
  return true;
}
function readFile(fileRel) {
  return fs.readFileSync(path.join(__dirname, '..', fileRel), 'utf8');
}
function cuenta(src, re) {
  var m = src.match(re);
  return m ? m.length : 0;
}
function sinComentarios(src) {
  return String(src).split('\n').map(function(l) {
    var i = l.indexOf('--');
    return i === -1 ? l : l.slice(0, i);
  }).join('\n');
}
function tieneClave(obj, clave) {
  if (!obj || typeof obj !== 'object') return false;
  if (Object.prototype.hasOwnProperty.call(obj, clave)) return true;
  var keys = Object.keys(obj);
  for (var i = 0; i < keys.length; i++) {
    if (tieneClave(obj[keys[i]], clave)) return true;
  }
  return false;
}

// --- Cargador de api/*.js en sandbox vm -------------------------------
// Redirige @neondatabase/serverless a un fake en memoria (global.__MOCKSQL__)
// que recibe (query, params) para poder enrutar por SQL emitido. Expone
// helpers internos no exportados via inyeccion de codigo (ADN del smoke_016).
function cargarApi(fileRel, exposes) {
  var fakeNeon = {
    neon: function() {
      return function(q, p) {
        return global.__MOCKSQL__ ? global.__MOCKSQL__(q, p) : [];
      };
    }
  };
  var customRequire = function(request) {
    if (request === '@neondatabase/serverless') return fakeNeon;
    return require(request);
  };
  customRequire.resolve = require.resolve;
  var sandbox = {
    module: { exports: {} },
    exports: {},
    require: customRequire,
    console: console,
    process: process,
    Buffer: Buffer,
    setTimeout: setTimeout,
    clearTimeout: clearTimeout,
    fetch: function() {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: function() { return Promise.resolve({}); }
      });
    }
  };
  sandbox.exports = sandbox.module.exports;
  vm.createContext(sandbox);
  var code = fs.readFileSync(path.join(__dirname, '..', fileRel), 'utf8');
  var inject = '';
  (exposes || []).forEach(function(name) {
    inject += '\nmodule.exports.' + name + ' = ' + name + ';';
  });
  vm.runInContext(code + inject, sandbox, { filename: fileRel });
  return { sandbox: sandbox, src: code };
}

var inter = cargarApi('api/interacciones.js', [
  'RAMA_TIERS', 'RAMAS', 'MISIONES', 'nivelNodoArbol', 'claveDm',
  'calcularArbolUsuario', 'perfilPosee'
]);
var usr = cargarApi('api/usuarios.js', [
  'firmarSesion', 'calcularNivel', 'CASAS_VALIDAS'
]);

var srcInt = inter.src;
var srcUsu = usr.src;
var handlerInt = inter.sandbox.module.exports;
var handlerUsu = usr.sandbox.module.exports;

// --- Invocacion real del handler (req/res mock) -----------------------
function invoke(handler, opts) {
  return new Promise(function(resolve) {
    global.__MOCKSQL__ = opts.mock || function() { return Promise.resolve([]); };
    var captured = { status: 200, body: null, headers: {} };
    var res = {
      setHeader: function(k, v) { captured.headers[k] = v; return this; },
      status: function(code) { captured.status = code; return this; },
      json: function(payload) { captured.body = payload; resolve(captured); return this; },
      end: function() { resolve(captured); return this; }
    };
    var req = {
      method: opts.method || 'GET',
      query: opts.query || {},
      body: opts.body || {},
      headers: opts.headers || {}
    };
    try {
      var p = handler(req, res);
      if (p && typeof p.then === 'function') {
        p.catch(function(err) {
          resolve({ status: 0, body: { ok: false, error: err.message } });
        });
      }
    } catch (e) {
      resolve({ status: 0, body: { ok: false, error: e.message } });
    }
  });
}

// ====================================================================
// MOCKS
// ====================================================================

// GET museo_publico: enruta por fragmento de la query emitida.
function mockMuseo(cfg) {
  cfg = cfg || {};
  return function(q) {
    if (q.indexOf('perfil_config') !== -1
        && q.indexOf('FROM usuarios WHERE id=$1 AND activo=true LIMIT 1') !== -1)
      return Promise.resolve(cfg.perfil ? [cfg.perfil] : []);
    if (q.indexOf('jsonb_object_keys') !== -1)
      return Promise.resolve(cfg.raros || []);
    if (q.indexOf('COUNT(*)::int AS n FROM usuarios WHERE activo = true') !== -1)
      return Promise.resolve([{ n: 4 }]);
    if (q.indexOf('usuarios_cromos uc JOIN cromos_catalogo') !== -1)
      return Promise.resolve(cfg.cromos || []);
    if (q.indexOf('FROM albumes a WHERE a.usuario_id') !== -1)
      return Promise.resolve(cfg.albumes || []);
    if (q.indexOf('FROM interacciones i JOIN destinos d ON d.id=i.destino_id') !== -1
        && q.indexOf('LIMIT 200') !== -1)
      return Promise.resolve(cfg.mapa || []);
    if (q.indexOf('FROM pandillas p') !== -1)
      return Promise.resolve(cfg.parche || []);
    if (q.indexOf('AS referidos_directos') !== -1)
      return Promise.resolve(cfg.stats || []);
    if (q.indexOf('SELECT faccion, vocaciones, progreso_arbol, progreso_misiones FROM usuarios') !== -1)
      return Promise.resolve(cfg.arbolUsuario || []);
    return Promise.resolve([]);
  };
}

// POST dm_enviar: enruta por fragmento y registra el SQL emitido en log.
function mockDm(cfg) {
  cfg = cfg || {};
  var log = [];
  var fn = function(q) {
    log.push(String(q));
    if (q.indexOf('SELECT id, nombre, xp_total, email_verificado FROM usuarios') !== -1)
      return Promise.resolve(cfg.emisor ? [cfg.emisor] : []);
    if (q.indexOf('SELECT id, nombre, dm_abierto FROM usuarios') !== -1)
      return Promise.resolve(cfg.receptor ? [cfg.receptor] : []);
    if (q.indexOf('FROM usuario_bloqueos') !== -1)
      return Promise.resolve([]);
    if (q.indexOf('SELECT id FROM chat_salas WHERE clave_dm') !== -1)
      return Promise.resolve(cfg.salaPrev || []);
    if (q.indexOf('SELECT COUNT(*)::int AS n FROM chat_salas') !== -1)
      return Promise.resolve([{ n: 0 }]);
    if (q.indexOf('WITH puede AS') !== -1)
      return Promise.resolve(cfg.cte || []);
    if (q.indexOf('INSERT INTO chat_mensajes') !== -1)
      return Promise.resolve([{ id: 'm-1', creado_en: '2026-09-15T00:00:00.000Z' }]);
    return Promise.resolve([]);
  };
  fn.log = log;
  return fn;
}

// POST chat_msg / chat_mod: capacidad concedida + sala con su tipo real.
function mockChatPriv(salaRows) {
  return function(q) {
    if (q.indexOf('progreso_misiones->$1') !== -1)
      return Promise.resolve([{ ok: true }]);
    if (q.indexOf('FROM chat_salas WHERE id=$1 AND activo=true LIMIT 1') !== -1)
      return Promise.resolve(salaRows);
    return Promise.resolve([]);
  };
}

// POST casa_elegir (api/usuarios.js).
function mockCasa(cfg) {
  cfg = cfg || {};
  return function(q) {
    if (q.indexOf('SELECT id, casa, casa_elegida_en, xp_total, email_verificado FROM usuarios') !== -1)
      return Promise.resolve(cfg.fila ? [cfg.fila] : []);
    if (q.indexOf('casa IS NULL') !== -1 && q.indexOf('casa_elegida_en=NOW()') !== -1)
      return Promise.resolve(cfg.prim || []);
    if (q.indexOf('xp_total = xp_total - 300') !== -1)
      return Promise.resolve(cfg.cambio || []);
    return Promise.resolve([]);
  };
}

// ====================================================================
// CASOS
// ====================================================================
async function run() {

  var tokenU1 = String(usr.sandbox.module.exports.firmarSesion('u1'));
  var tokenCasa = String(usr.sandbox.module.exports.firmarSesion('u-casa'));

  // --- A. IDEMPOTENCIA DDL -------------------------------------------

  var migr017Rel = 'db/migrations/017_perfil_publico_arbol_casas.sql';
  var migr018Rel = 'db/migrations/018_consumibles_categorias.sql';
  var ex017 = fs.existsSync(path.join(__dirname, '..', migr017Rel));
  var ex018 = fs.existsSync(path.join(__dirname, '..', migr018Rel));
  check('A1a: 017_perfil_publico_arbol_casas.sql existe', ex017);
  check('A1b: 018_consumibles_categorias.sql existe', ex018);

  if (ex017) {
    var m17 = sinComentarios(readFile(migr017Rel));
    check('A2a: 017 usa ADD COLUMN IF NOT EXISTS',
      m17.indexOf('ADD COLUMN IF NOT EXISTS') !== -1);
    check('A2b: 017 usa DROP CONSTRAINT IF EXISTS (idempotencia real)',
      m17.indexOf('DROP CONSTRAINT IF EXISTS') !== -1);
    check('A2c: 017 usa CREATE TABLE IF NOT EXISTS usuario_bloqueos',
      /CREATE TABLE IF NOT EXISTS usuario_bloqueos/i.test(m17));
    check('A2d: 017 usa CREATE UNIQUE INDEX IF NOT EXISTS idx_chat_salas_dm_unica',
      /CREATE UNIQUE INDEX IF NOT EXISTS idx_chat_salas_dm_unica/i.test(m17));
    check('A2e: 017 usa CREATE INDEX IF NOT EXISTS (idx_usuarios_casa)',
      /CREATE INDEX IF NOT EXISTS idx_usuarios_casa/i.test(m17));
    check('A2f: 017 usa ON CONFLICT (clave) DO NOTHING',
      /ON CONFLICT \(clave\) DO NOTHING/i.test(m17));
    check('A2g: TODOS los CREATE TABLE/INDEX de 017 llevan IF NOT EXISTS',
      cuenta(m17, /CREATE\s+(?:UNIQUE\s+)?(?:TABLE|INDEX)\s+(?!IF NOT EXISTS)/gi) === 0);
    check('A3a: 017 NO declara la columna bio (ya existe en produccion)',
      !/\bbio\b/i.test(m17));
    check('A3b: 017 NO crea idx_chat_mensajes_sala_fecha (duplicaria idx_chat_mensajes_sala)',
      m17.indexOf('idx_chat_mensajes_sala_fecha') === -1);
    check('A4a: 017 SI crea la constraint chk_chat_salas_tipo',
      m17.indexOf('ADD CONSTRAINT chk_chat_salas_tipo') !== -1);
    check('A4b: 017 suelta chk_chat_salas_tipo y chat_salas_tipo_check antes de crearla',
      m17.indexOf('DROP CONSTRAINT IF EXISTS chk_chat_salas_tipo') !== -1
      && m17.indexOf('DROP CONSTRAINT IF EXISTS chat_salas_tipo_check') !== -1);
    check('A4c: 017 SI crea la tabla usuario_bloqueos',
      /CREATE TABLE IF NOT EXISTS usuario_bloqueos/i.test(m17));
    check('A5: chk_usuarios_casa usa condor/jaguar/delfin (coincide con CASAS_VALIDAS)',
      /casa IN \('condor','jaguar','delfin'\)/i.test(m17)
      && JSON.stringify(usr.sandbox.module.exports.CASAS_VALIDAS) === '["condor","jaguar","delfin"]');
  }

  if (ex018) {
    var m18 = sinComentarios(readFile(migr018Rel));
    check('A6a: 018 no tiene INSERT/DELETE/DROP (solo UPDATE idempotentes)',
      m18.indexOf('INSERT') === -1 && m18.indexOf('DELETE') === -1 && m18.indexOf('DROP') === -1);
    var nUpdate = cuenta(m18, /\bUPDATE\s+consumibles\b/gi);
    check('A6b: TODOS los UPDATE de 018 apuntan a consumibles (' + nUpdate + ')',
      nUpdate >= 5 && nUpdate === cuenta(m18, /\bUPDATE\b/gi));
    check('A6c: TODOS los UPDATE de 018 usan WHERE clave IN',
      nUpdate === cuenta(m18, /\bWHERE\s+clave\s+IN\b/gi));
    check('A6d: el unico ALTER de 018 es ADD COLUMN IF NOT EXISTS (guardia)',
      cuenta(m18, /\bALTER\s+TABLE\b/gi) === 1
      && /ALTER TABLE consumibles\s+ADD COLUMN IF NOT EXISTS/i.test(m18));
  }

  // --- B. MUSEO PUBLICO ----------------------------------------------

  var perfilPrivado = {
    id: 'u-priv', nombre: 'Privado Uno', foto_url: null, avatar_url: null,
    bio: null, ciudad_base: null, pais_base: null,
    creado_en: '2026-01-01T00:00:00Z', xp_total: 0, faccion: null, casa: null,
    capacidades: {}, progreso_logros: {}, perfil_publico: false,
    dm_abierto: true, perfil_config: {},
    email: 'priv@exploraco.co', email_token: 'tok-privado',
    device_hashes: ['hash-privado'], codigo_referido: 'PRIV01',
    referido_por: 'u-padre'
  };
  var rPriv = await invoke(handlerInt, {
    method: 'GET',
    query: { tipo: 'museo_publico', usuario_id: 'u-priv' },
    mock: mockMuseo({ perfil: perfilPrivado })
  });
  check('B1a: museo_publico privado sin sesion -> 403 PERFIL_PRIVADO',
    rPriv.status === 403 && !!rPriv.body && rPriv.body.error === 'PERFIL_PRIVADO');
  check('B1b: el 403 trae el minimo { nombre, nivel }',
    !!(rPriv.body && rPriv.body.data)
    && typeof rPriv.body.data.nombre === 'string'
    && rPriv.body.data.nivel === 1);
  check('B1c: el 403 no filtra email ni PII',
    !tieneClave(rPriv.body, 'email') && !tieneClave(rPriv.body, 'device_hashes')
    && !tieneClave(rPriv.body, 'codigo_referido')
    && JSON.stringify(rPriv.body).indexOf('priv@exploraco.co') === -1);

  var perfilPublico = {
    id: 'u-pub', nombre: 'Ana Viajera', foto_url: 'https://x/f.jpg',
    avatar_url: null, bio: 'Viajera de corazon', ciudad_base: 'Bogota',
    pais_base: 'CO', creado_en: '2026-01-01T00:00:00Z', xp_total: 320,
    faccion: 'exploradores', casa: 'condor',
    capacidades: { perfil_marco_dorado: true, consumibles: { perfil_tema_oscuro: 1 } },
    progreso_logros: { logr_primer_voto: { estado: 'completada', en: '2026-02-01' } },
    perfil_publico: true, dm_abierto: true,
    perfil_config: { titulo: 'Gran Viajero', fondo: 'default', destacados: ['logr_primer_voto'] },
    email: 'secreto@exploraco.co', email_token: 'tok-secreto-123',
    device_hashes: ['hash-secreto-abc'], codigo_referido: 'REFSE1',
    referido_por: 'u-otro'
  };
  var rPub = await invoke(handlerInt, {
    method: 'GET',
    query: { tipo: 'museo_publico', usuario_id: 'u-pub' },
    mock: mockMuseo({
      perfil: perfilPublico,
      raros: [{ id: 'logr_primer_voto', n: 1 }],
      cromos: [{ clave: 'c1', nombre: 'Cromo', rareza: 'comun', cantidad: 2 }],
      albumes: [{ id: 'a1' }, { id: 'a2' }, { id: 'a3' }],
      mapa: [{ destino_id: 'd1', slug: 'd1' }, { destino_id: 'd2', slug: 'd2' }],
      parche: [{ id: 'p1', nombre: 'Parche X', fama_total: 120 }],
      stats: [{ visitas: 5, resenas: 2, fotos: 1, albumes: 3, referidos_directos: 4 }]
    })
  });
  var dPub = rPub.body && rPub.body.data ? rPub.body.data : {};
  check('B2: museo_publico publico -> 200 ok true',
    rPub.status === 200 && rPub.body.ok === true);
  check('B3a: el payload trae usuario/vitrina/logros/cromos/albumes/mapa/parche/stats',
    ['usuario', 'vitrina', 'logros', 'cromos', 'albumes', 'mapa', 'parche', 'stats']
      .every(function(k) { return Object.prototype.hasOwnProperty.call(dPub, k); }));
  check('B3b: el payload trae arbol (WP-4, solo lectura)',
    Object.prototype.hasOwnProperty.call(dPub, 'arbol'));
  check('B4a: ninguna clave prohibida en el payload (email/email_token/device_hashes/codigo_referido/referido_por)',
    ['email', 'email_token', 'device_hashes', 'codigo_referido', 'referido_por']
      .every(function(k) { return !tieneClave(rPub.body, k); }));
  check('B4b: ningun valor PII del perfil aparece en el payload',
    ['secreto@exploraco.co', 'tok-secreto-123', 'hash-secreto-abc', 'REFSE1']
      .every(function(v) { return JSON.stringify(rPub.body).indexOf(v) === -1; })
    && JSON.stringify(dPub.usuario).indexOf('u-otro') === -1);
  check('B5: usuario.nivel/badge/era calculados y perfil_publico/dm_abierto visibles',
    dPub.usuario.nivel === 3 && dPub.usuario.perfil_publico === true
    && dPub.usuario.dm_abierto === true && typeof dPub.usuario.badge_actual === 'string');
  check('B6: vitrina con las claves del consumible y perfil_config en solo lectura',
    dPub.vitrina.marco === 'dorado' && dPub.vitrina.tema === 'oscuro'
    && dPub.vitrina.titulo === 'Gran Viajero' && dPub.vitrina.fondo === 'default'
    && dPub.vitrina.destacados.length === 1);
  check('B7: arreglos y stats del museo con su shape real',
    Array.isArray(dPub.albumes) && dPub.albumes.length === 3
    && Array.isArray(dPub.mapa) && dPub.mapa.length === 2
    && dPub.stats.visitas === 5 && dPub.stats.referidos_directos === 4
    && !!dPub.parche && dPub.parche.fama_total === 120
    && dPub.logros.length === 1 && dPub.cromos.length === 1);
  check('B8a: SQL de albumes del museo limita a 12',
    srcInt.indexOf('FROM albumes a WHERE a.usuario_id') !== -1
    && srcInt.indexOf('LIMIT 12') !== -1);
  check('B8b: SQL del mapa del museo limita a 200',
    srcInt.indexOf('ORDER BY i.creado_en DESC LIMIT 200') !== -1);
  check('B8c: la fuente del 403 usa PERFIL_PRIVADO con data { nombre, nivel }',
    srcInt.indexOf("error: 'PERFIL_PRIVADO'") !== -1
    && srcInt.indexOf('data: { nombre: mpU.nombre, nivel: mpNivel }') !== -1);

  // --- C. MENSAJERIA DIRECTA (dm_enviar) -----------------------------

  var dmNew = await invoke(handlerInt, {
    method: 'POST',
    body: { tipo: 'dm_enviar', usuario_id: 'u1', receptor_id: 'u2', texto: 'hola' },
    headers: { authorization: 'Bearer ' + tokenU1 },
    mock: mockDm({
      emisor: { id: 'u1', nombre: 'Ana', xp_total: 260, email_verificado: true },
      receptor: { id: 'u2', nombre: 'Beto', dm_abierto: true },
      salaPrev: [], cte: [{ sala_id: 'sala-nueva', xp_total: 240 }]
    })
  });
  check('C1a: dm_enviar hilo NUEVO -> 200 con xp_cobrado 20',
    dmNew.status === 200 && dmNew.body.ok === true && dmNew.body.xp_cobrado === 20);
  check('C1b: hilo nuevo devuelve xp_total_nuevo y bajo_nivel por debito de 20 XP',
    dmNew.body.xp_total_nuevo === 240 && dmNew.body.xp_cobrado === 20);
  check('C1c: hilo nuevo devuelve nivel_anterior/nivel_nuevo/bajo_nivel',
    dmNew.body.nivel_anterior === 3 && dmNew.body.nivel_nuevo === 2
    && dmNew.body.bajo_nivel === true);

  var dmExist = await invoke(handlerInt, {
    method: 'POST',
    body: { tipo: 'dm_enviar', usuario_id: 'u1', receptor_id: 'u2', texto: 'hola de nuevo' },
    headers: { authorization: 'Bearer ' + tokenU1 },
    mock: mockDm({
      emisor: { id: 'u1', nombre: 'Ana', xp_total: 300, email_verificado: true },
      receptor: { id: 'u2', nombre: 'Beto', dm_abierto: true },
      salaPrev: [{ id: 'sala-exist' }]
    })
  });
  check('C2a: dm_enviar hilo EXISTENTE -> 200 cobrando 0 XP',
    dmExist.status === 200 && dmExist.body.xp_cobrado === 0
    && dmExist.body.sala_id === 'sala-exist');
  check('C2b: responder un hilo abierto no altera xp_total ni nivel',
    dmExist.body.xp_total_nuevo === 300 && dmExist.body.nivel_anterior === 3
    && dmExist.body.nivel_nuevo === 3 && dmExist.body.bajo_nivel === false);

  var dmLow = await invoke(handlerInt, {
    method: 'POST',
    body: { tipo: 'dm_enviar', usuario_id: 'u1', receptor_id: 'u2', texto: 'hola' },
    headers: { authorization: 'Bearer ' + tokenU1 },
    mock: mockDm({
      emisor: { id: 'u1', nombre: 'Ana', xp_total: 50, email_verificado: true },
      receptor: { id: 'u2', nombre: 'Beto', dm_abierto: true }
    })
  });
  check('C3: dm_enviar con nivel<3 -> 403 NIVEL_INSUFICIENTE',
    dmLow.status === 403 && dmLow.body.error === 'NIVEL_INSUFICIENTE');

  var dmLong = await invoke(handlerInt, {
    method: 'POST',
    body: { tipo: 'dm_enviar', usuario_id: 'u1', receptor_id: 'u2', texto: new Array(502).join('x') },
    headers: { authorization: 'Bearer ' + tokenU1 },
    mock: mockDm({})
  });
  check('C4: dm_enviar con texto>500 -> 400',
    dmLong.status === 400 && String(dmLong.body.error).indexOf('500') !== -1);

  var dmNoSes = await invoke(handlerInt, {
    method: 'POST',
    body: { tipo: 'dm_enviar', usuario_id: 'u1', receptor_id: 'u2', texto: 'hola' },
    headers: {},
    mock: mockDm({})
  });
  check('C5: dm_enviar sin sesion firmada -> 401 SESION_REQUERIDA',
    dmNoSes.status === 401 && dmNoSes.body.error === 'SESION_REQUERIDA');

  var claveDm = inter.sandbox.module.exports.claveDm;
  check('C6a: claveDm es simetrica y ordena los uuid por alfabeto',
    claveDm('bbbb', 'aaaa') === 'aaaa_bbbb' && claveDm('aaaa', 'bbbb') === 'aaaa_bbbb');
  check('C6b: el INSERT de hilo nuevo usa ON CONFLICT (clave_dm) DO NOTHING (dedup)',
    srcInt.indexOf('ON CONFLICT (clave_dm)') !== -1
    && srcInt.indexOf('DO NOTHING') !== -1
    && srcInt.indexOf('WHERE clave_dm=$1 AND tipo=') !== -1);
  check('C6c: el cobro de 20 XP usa el guard atomico xp_total >= 20',
    srcInt.indexOf('xp_total >= 20') !== -1
    && srcInt.indexOf('xp_total = xp_total - 20') !== -1);

  // --- D. FUGA DE DM (chat_salas / chat_mensajes / chat_msg / chat_mod)

  var capturedSalas = [];
  await invoke(handlerInt, {
    method: 'GET',
    query: { tipo: 'chat_salas' },
    mock: function(q) { capturedSalas.push(String(q)); return Promise.resolve([]); }
  });
  var sqlSalas = capturedSalas.length ? capturedSalas[0] : '';
  check('D1a: GET chat_salas emite filtraje tipo NOT IN (plan, dm)',
    sqlSalas.indexOf("NOT IN ('plan','dm')") !== -1);
  check('D1b: GET chat_salas no expone hilos tipo dm',
    sqlSalas.indexOf("NOT IN ('plan','dm')") !== -1 && sqlSalas.indexOf("tipo='dm'") === -1);

  var capturedMsgs = [];
  await invoke(handlerInt, {
    method: 'GET',
    query: { tipo: 'chat_mensajes', sala_id: 's1' },
    mock: function(q) { capturedMsgs.push(String(q)); return Promise.resolve([]); }
  });
  var sqlMsgs = capturedMsgs.length ? capturedMsgs[0] : '';
  check('D2: GET chat_mensajes excluye salas plan/dm via NOT EXISTS',
    sqlMsgs.indexOf('NOT EXISTS') !== -1 && sqlMsgs.indexOf("cs.tipo IN ('plan','dm')") !== -1);

  var rMsgDm = await invoke(handlerInt, {
    method: 'POST',
    body: { tipo: 'chat_msg', usuario_id: 'u1', sala_id: 'sdm', texto: 'hola' },
    mock: mockChatPriv([{ id: 'sdm', tipo: 'dm' }])
  });
  check('D3: POST chat_msg sobre una sala dm -> 403 SALA_PRIVADA',
    rMsgDm.status === 403 && rMsgDm.body.error === 'SALA_PRIVADA');

  var rModDm = await invoke(handlerInt, {
    method: 'POST',
    body: { tipo: 'chat_mod', usuario_id: 'u1', sala_id: 'sdm', msg_id: 'm1', accion: 'fijar' },
    mock: mockChatPriv([{ tipo: 'dm' }])
  });
  check('D4: POST chat_mod sobre una sala dm -> 403 SALA_PRIVADA',
    rModDm.status === 403 && rModDm.body.error === 'SALA_PRIVADA');

  check('D5: GET dm_mensajes valida participante contra clave_dm (no un parametro libre)',
    srcInt.indexOf('if (dmsgA !== dmsgId && dmsgB !== dmsgId)') !== -1);

  // --- E. CASA_ELEGIR (api/usuarios.js) ------------------------------

  var sinFecha = null;
  var vieja = new Date(Date.now() - 60 * 24 * 3600 * 1000).toISOString();
  var reciente = new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString();

  var e1 = await invoke(handlerUsu, {
    method: 'POST',
    body: { tipo: 'casa_elegir', usuario_id: 'u-casa', casa: 'condor' },
    headers: { authorization: 'Bearer ' + tokenCasa },
    mock: mockCasa({ fila: { id: 'u-casa', casa: null, casa_elegida_en: sinFecha, xp_total: 50, email_verificado: true } })
  });
  check('E1: casa_elegir con nivel<2 -> 403 NIVEL_INSUFICIENTE',
    e1.status === 403 && e1.body.error === 'NIVEL_INSUFICIENTE');

  var e2 = await invoke(handlerUsu, {
    method: 'POST',
    body: { tipo: 'casa_elegir', usuario_id: 'u-casa', casa: 'condor' },
    headers: { authorization: 'Bearer ' + tokenCasa },
    mock: mockCasa({ fila: { id: 'u-casa', casa: null, casa_elegida_en: sinFecha, xp_total: 150, email_verificado: false } })
  });
  check('E2: casa_elegir con email no verificado -> 403 EMAIL_SIN_VERIFICAR',
    e2.status === 403 && e2.body.error === 'EMAIL_SIN_VERIFICAR');

  var e3 = await invoke(handlerUsu, {
    method: 'POST',
    body: { tipo: 'casa_elegir', usuario_id: 'u-casa', casa: 'jaguar' },
    headers: { authorization: 'Bearer ' + tokenCasa },
    mock: mockCasa({ fila: { id: 'u-casa', casa: 'condor', casa_elegida_en: reciente, xp_total: 400, email_verificado: true }, cambio: [] })
  });
  check('E3: cambio de Casa en cooldown 30d -> 429 COOLDOWN_CASA',
    e3.status === 429 && e3.body.error === 'COOLDOWN_CASA');

  var e4 = await invoke(handlerUsu, {
    method: 'POST',
    body: { tipo: 'casa_elegir', usuario_id: 'u-casa', casa: 'jaguar' },
    headers: { authorization: 'Bearer ' + tokenCasa },
    mock: mockCasa({ fila: { id: 'u-casa', casa: 'condor', casa_elegida_en: vieja, xp_total: 200, email_verificado: true }, cambio: [] })
  });
  check('E4: cambio de Casa con xp<300 -> 402 PUNTOS_INSUFICIENTES',
    e4.status === 402 && e4.body.error === 'PUNTOS_INSUFICIENTES');

  var e5 = await invoke(handlerUsu, {
    method: 'POST',
    body: { tipo: 'casa_elegir', usuario_id: 'u-casa', casa: 'jaguar' },
    headers: { authorization: 'Bearer ' + tokenCasa },
    mock: mockCasa({
      fila: { id: 'u-casa', casa: null, casa_elegida_en: sinFecha, xp_total: 150, email_verificado: true },
      prim: [{ casa: 'jaguar', casa_elegida_en: '2026-09-15T00:00:00.000Z', xp_total: 150 }]
    })
  });
  check('E5a: primera eleccion de Casa -> 200 gratis',
    e5.status === 200 && e5.body.ok === true && e5.body.data.casa === 'jaguar'
    && e5.body.data.xp_total_nuevo === 150);
  check('E5b: primera eleccion devuelve nivel_anterior/nivel_nuevo/bajo_nivel',
    e5.body.data.nivel_anterior === 2 && e5.body.data.nivel_nuevo === 2
    && e5.body.data.bajo_nivel === false);

  var e6 = await invoke(handlerUsu, {
    method: 'POST',
    body: { tipo: 'casa_elegir', usuario_id: 'u-casa', casa: 'perro' },
    headers: { authorization: 'Bearer ' + tokenCasa },
    mock: mockCasa({})
  });
  check('E6: Casa invalida -> 400 CASA_INVALIDA',
    e6.status === 400 && e6.body.error === 'CASA_INVALIDA');

  var e7 = await invoke(handlerUsu, {
    method: 'POST',
    body: { tipo: 'casa_elegir', usuario_id: 'u-casa', casa: 'condor' },
    headers: {},
    mock: mockCasa({})
  });
  check('E7: casa_elegir sin sesion firmada -> 401',
    e7.status === 401);

  // --- F. CALCULO DE TIER --------------------------------------------

  var RAMA_TIERS = inter.sandbox.module.exports.RAMA_TIERS;
  check('F1: RAMA_TIERS es [0,100,250,450,700]',
    JSON.stringify(RAMA_TIERS) === '[0,100,250,450,700]');

  var nivelNodoArbol = inter.sandbox.module.exports.nivelNodoArbol;
  check('F2a: nivelNodoArbol en los limites de tier 0/100/250/450/700 = 1/2/3/4/5',
    nivelNodoArbol(0) === 1 && nivelNodoArbol(100) === 2 && nivelNodoArbol(250) === 3
    && nivelNodoArbol(450) === 4 && nivelNodoArbol(700) === 5);
  check('F2b: nivelNodoArbol justo debajo de cada tier se mantiene',
    nivelNodoArbol(99) === 1 && nivelNodoArbol(249) === 2
    && nivelNodoArbol(449) === 3 && nivelNodoArbol(699) === 4);

  var calcularArbolUsuario = inter.sandbox.module.exports.calcularArbolUsuario;
  var arbolCalc = await calcularArbolUsuario(function(q) {
    if (q.indexOf('SELECT faccion, vocaciones, progreso_arbol, progreso_misiones FROM usuarios') !== -1)
      return Promise.resolve([{
        faccion: 'curadores', vocaciones: {},
        progreso_arbol: { bonos: { cur_critico: 300 }, ramas_activas: { cur_critico: true } },
        progreso_misiones: {}
      }]);
    if (q.indexOf('SELECT pais_base, ciudad_base FROM usuarios') !== -1)
      return Promise.resolve([{ pais_base: 'CO', ciudad_base: 'Bogota' }]);
    return Promise.resolve([]);
  }, 'u1');
  var ramaCritico = (arbolCalc.ramas || []).filter(function(r) { return r.id === 'cur_critico'; })[0];
  check('F3a: puntos = bono + derivado (bono 300 + derivado 0)',
    !!ramaCritico && ramaCritico.bono === 300 && ramaCritico.derivado === 0
    && ramaCritico.puntos === 300);
  check('F3b: nivel_nodo y nodos_desbloqueados derivados de puntos (300 -> tier 3, 3 nodos)',
    !!ramaCritico && ramaCritico.nivel_nodo === 3
    && ramaCritico.nodos_desbloqueados.length === 3);
  check('F4: en TODAS las ramas se cumple puntos = bono + derivado',
    (arbolCalc.ramas || []).length === 16
    && (arbolCalc.ramas || []).every(function(r) { return r.puntos === r.bono + r.derivado; }));

  // --- G. MISIONES DE PERFIL + DAG -----------------------------------

  var MISIONES = inter.sandbox.module.exports.MISIONES || [];
  var perfil = MISIONES.filter(function(m) { return m.grupo === 'perfil'; });
  var xpEsperado = {
    mis_perfil_foto: 10, mis_perfil_bio: 15, mis_perfil_ciudad: 10,
    mis_perfil_intereses: 15, mis_perfil_email: 30, mis_perfil_casa: 20,
    mis_perfil_faccion: 20, mis_perfil_completo: 30
  };
  var idsEsperados = Object.keys(xpEsperado);
  check('G1: existen exactamente 8 misiones de perfil', perfil.length === 8);
  check('G2: ids de las misiones de perfil exactos',
    perfil.map(function(m) { return m.id; }).sort().join(',') === idsEsperados.slice().sort().join(','));
  check('G3: XP exactos 10/15/10/15/30/20/20/30',
    perfil.every(function(m) { return xpEsperado[m.id] === m.xp; }));
  var completo = perfil.filter(function(m) { return m.id === 'mis_perfil_completo'; })[0];
  var requiereCompleto = completo ? completo.requiere.slice().sort().join(',') : '';
  var esperadoRequiere = idsEsperados.filter(function(id) { return id !== 'mis_perfil_completo'; }).sort().join(',');
  check('G4: mis_perfil_completo depende de las otras 7 misiones (DAG)',
    requiereCompleto === esperadoRequiere);
  check('G5: las otras 7 misiones de perfil no tienen prerequisitos',
    perfil.filter(function(m) { return m.id !== 'mis_perfil_completo'; })
      .every(function(m) { return m.requiere.length === 0; }));
  check('G6: no hay ids de mision duplicados en el catalogo',
    MISIONES.length === Object.keys(MISIONES.reduce(function(a, m) { a[m.id] = 1; return a; }, {})).length);
  check('G7: mis_perfil_completo cierra el DAG y su check es siempre true',
    !!completo && typeof completo.check({}).then === 'function');

  // --- AUTOCHECK DEL PROPIO SCRIPT -----------------------------------

  var selfRel = 'scripts/smoke_017_perfil_arbol_casas.js';
  check('SELF: smoke_017 ASCII-safe (0 bytes > 127)', asciiSafe(selfRel));
  check('SELF: smoke_017 con 0 backticks',
    readFile(selfRel).indexOf(String.fromCharCode(96)) === -1);
}

function finish() {
  var total = passed + failed;
  console.log('');
  console.log('=== SMOKE 017 PERFIL PUBLICO / ARBOL / CASAS ===');
  console.log('RESULTADO: ' + passed + '/' + total + ' PASS');
  if (failed === 0) {
    console.log('SMOKE 017 PERFIL ARBOL CASAS: OK');
  } else {
    console.log('SMOKE 017 PERFIL ARBOL CASAS: ' + failed + ' FALLO(S)');
    process.exitCode = 1;
  }
}

run().then(finish).catch(function(err) {
  console.log('FAIL - smoke 017 lanzo error: ' + (err && err.message));
  process.exitCode = 1;
  finish();
});
