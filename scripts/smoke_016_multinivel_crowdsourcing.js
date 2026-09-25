// smoke_016_multinivel_crowdsourcing.js
// Smoke test offline (sin DB) de la Entrega 016 "ExploraCO Gaming v5.0":
// - Piramide de referidos multinivel (api/usuarios.js firmarSesion/
//   generarCodigoReferido + repartirXpReferidos de api/interacciones.js).
// - Wayfarer Activo Oculto: haversineMetros, resolverRadioM, VOCACIONES
//   nivel 5, misiones de artista, validarSesion (ADR-025) y las ramas
//   activo_oculto_votar / activo_oculto_checkin.
// - Admin de crowdsourcing (api/admin.js).
// - Migracion 016 idempotente, balance de divs y ASCII-safety (ADR-002).
//
// Patron: sandbox vm + global.__MOCKSQL__, igual que smoke_visita_geocerca.js
// y smoke_test_epic_prompt.js, pero interceptando @neondatabase/serverless
// en el require del sandbox para NO escribir scripts/fake_neon.js (esta
// tarea solo puede crear este archivo). ASCII puro (0 bytes > 127, 0
// backticks) y CommonJS estricto (BUG-001).
// Run: node scripts/smoke_016_multinivel_crowdsourcing.js
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
function readApi(fileRel) {
  return fs.readFileSync(path.join(__dirname, '..', fileRel), 'utf8');
}

// --- Cargador de api/*.js en sandbox vm -------------------------------
// Redirige @neondatabase/serverless a un fake en memoria (global.__MOCKSQL__)
// y expone helpers internos no exportados via inyeccion de codigo.
function cargarApi(fileRel, exposes) {
  var fakeNeon = {
    neon: function() {
      return function(q) {
        return global.__MOCKSQL__ ? global.__MOCKSQL__(q) : [];
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

var usuarios = cargarApi('api/usuarios.js', ['firmarSesion', 'generarCodigoReferido']);
var inter = cargarApi('api/interacciones.js', [
  'haversineMetros', 'resolverRadioM', 'VOCACIONES', 'repartirXpReferidos', 'validarSesion'
]);

var srcAdm = readApi('api/admin.js');
var srcInt = inter.src;
var srcUsu = usuarios.src;

// Extrae el cuerpo del CTE recursivo: substring entre el '(' de 'AS (' y su
// ')' balanceado. Devuelve null si no se puede localizar.
function cuerpoCte(query) {
  var asIdx = query.indexOf('AS (');
  if (asIdx === -1) return null;
  var open = asIdx + 3; // posicion del '('
  var depth = 0;
  for (var i = open; i < query.length; i++) {
    if (query[i] === '(') depth++;
    else if (query[i] === ')') {
      depth--;
      if (depth === 0) return { body: query.substring(open + 1, i), close: i };
    }
  }
  return null;
}

// Cuenta sentencias DDL de la migracion (ignorando comentarios '--').
function sentenciasDdl(migr) {
  var sinComentarios = migr.split('\n').filter(function(l) {
    return l.trim().indexOf('--') !== 0;
  }).join('\n');
  return sinComentarios.split(';').map(function(p) { return p.trim(); })
    .filter(function(s) {
      return /^(ALTER\s+TABLE|CREATE\s+TABLE|CREATE\s+(UNIQUE\s+)?INDEX)\b/i.test(s);
    });
}

function divBalance(htmlRel) {
  var src = fs.readFileSync(path.join(__dirname, '..', htmlRel), 'utf8');
  var abre = (src.match(/<div/g) || []).length;
  var cierra = (src.match(/<\/div/g) || []).length;
  return abre - cierra;
}

// ====================================================================
// CASOS
// ====================================================================
async function run() {

  // --- A. REFERIDOS ---------------------------------------------------

  // A1. firmarSesion genera token b64url.b64url (2 segmentos).
  var firmarSesion = usuarios.sandbox.module.exports.firmarSesion;
  var generaCodigo = usuarios.sandbox.module.exports.generarCodigoReferido;
  (function() {
    check('A1a: firmarSesion existe y es funcion', typeof firmarSesion === 'function');
    var token = typeof firmarSesion === 'function' ? String(firmarSesion('test-user-123')) : '';
    var partes = token.split('.');
    var b64url = /^[A-Za-z0-9_-]+$/;
    check('A1b: firmarSesion genera formato b64url.b64url (2 segmentos)',
      partes.length === 2 && b64url.test(partes[0]) && b64url.test(partes[1])
      && partes[0].length > 10 && partes[1].length > 10);
  })();

  // A2. generarCodigoReferido: 6 chars, sin ambiguos 0/O/1/l/I (200 iter).
  (function() {
    check('A2a: generarCodigoReferido existe y es funcion', typeof generaCodigo === 'function');
    var validos = 'abcdefghjkmnpqrstuvwxyz23456789';
    var ambiguos = '0O1lI';
    var ok = true;
    for (var i = 0; i < 200; i++) {
      var c = String(generaCodigo());
      if (c.length !== 6) { ok = false; break; }
      for (var j = 0; j < c.length; j++) {
        if (validos.indexOf(c.charAt(j)) === -1) { ok = false; break; }
        if (ambiguos.indexOf(c.charAt(j)) !== -1) { ok = false; break; }
      }
      if (!ok) break;
    }
    check('A2b: generarCodigoReferido: 6 chars sin ambiguos 0/O/1/l/I (200 iter)', ok);
  })();

  // A3/A4. SQL de repartirXpReferidos (api/interacciones.js).
  var queryRef = '';
  var sqlLlamadoConCero = false;
  await inter.sandbox.module.exports.repartirXpReferidos(function(q) {
    queryRef = String(q);
    return Promise.resolve([]);
  }, 'user-1', 100).then(function(ok) {
    check('A3a: repartirXpReferidos devuelve true con xp>0', ok === true);
  });
  await inter.sandbox.module.exports.repartirXpReferidos(function() {
    sqlLlamadoConCero = true;
    return Promise.resolve([]);
  }, 'user-1', 0).then(function(ok) {
    check('A3b: repartirXpReferidos(xp=0) devuelve false sin SQL', ok === false && !sqlLlamadoConCero);
  });

  check('A3c: la cadena contiene WITH RECURSIVE cadena', queryRef.indexOf('WITH RECURSIVE cadena') !== -1);
  check('A3d: la cadena contiene FROM cadena', queryRef.indexOf('FROM cadena') !== -1);
  var cte = cuerpoCte(queryRef);
  check('A3e: no hay UPDATE dentro del CTE recursivo (regla Postgres 0A000)',
    !!cte && cte.body.indexOf('UPDATE') === -1);
  var updateIdx = queryRef.indexOf('UPDATE usuarios a');
  check('A3f: el UPDATE es la sentencia principal (posterior al cierre del CTE)',
    updateIdx !== -1 && !!cte && updateIdx > cte.close);

  check('A4a: la cadena contiene ROUND half-up (ADR-035)', queryRef.indexOf('ROUND') !== -1);
  check('A4b: porcentajes 5/2.5/1.5/0.5/0.5 (0.05/0.025/0.015/0.005/0.005, total 10% ADR-060)',
    queryRef.indexOf('0.05') !== -1 && queryRef.indexOf('0.025') !== -1
    && queryRef.indexOf('0.015') !== -1 && queryRef.indexOf('0.005') !== -1
    && queryRef.indexOf('0.10') === -1);
  check('A4c: tope referidos_directos_contados < 500',
    queryRef.indexOf('referidos_directos_contados < 500') !== -1);

  // --- B. WAYFARER (api/interacciones.js) -----------------------------

  // B5. haversineMetros(0,0,0,0) === 0.
  var haversineMetros = inter.sandbox.module.exports.haversineMetros;
  check('B5: haversineMetros(0,0,0,0) === 0', haversineMetros(0, 0, 0, 0) === 0);

  // B6. TSK-111 (CAMBIO 4): el radio urbano bajo de 100 m a 50 m. El
  // contrato real vive en api/interacciones.js: RADIO_DEFAULT_M=50;
  // RADIO_POR_CATEGORIA={sitio:50,hostal:50,comida:50,evento:150};
  // RADIO_POR_SUBCATEGORIA (urbanas 50, parque/concierto 150, festival/
  // deporte 200, naturaleza/aventura 250); RURAL_KEYWORDS => 250 y se
  // evalua ANTES de la subcategoria. B6/B6b reflejan esos valores exactos
  // (no se inventa ninguno).
  var resolverRadioM = inter.sandbox.module.exports.resolverRadioM;
  var radio = resolverRadioM('museo', {}, 'x');
  check('B6: resolverRadioM(museo,{},x) === 50 (default urbano)',
    typeof radio === 'number' && radio === 50);
  var casosRadio = [
    ['urbana museo (subcategoria)', ['sitio', { subcategoria: 'museo' }, 'x'], 50],
    ['urbana bar (subcategoria)', ['comida', { subcategoria: 'bar' }, 'x'], 50],
    ['urbana exposicion (subcategoria)', ['sitio', { subcategoria: 'exposicion' }, 'x'], 50],
    ['urbana espacio-publico (subcategoria)', ['sitio', { subcategoria: 'espacio-publico' }, 'x'], 50],
    ['categoria sitio sin subcategoria', ['sitio', {}, 'x'], 50],
    ['categoria evento', ['evento', {}, 'x'], 150],
    ['parque (subcategoria)', ['sitio', { subcategoria: 'parque' }, 'x'], 150],
    ['concierto (subcategoria)', ['sitio', { subcategoria: 'concierto' }, 'x'], 150],
    ['festival (subcategoria)', ['sitio', { subcategoria: 'festival' }, 'x'], 200],
    ['deporte (subcategoria)', ['sitio', { subcategoria: 'deporte' }, 'x'], 200],
    ['naturaleza (subcategoria rural)', ['sitio', { subcategoria: 'naturaleza' }, 'x'], 250],
    ['rural keyword sendero gana a la subcategoria',
      ['sitio', { subcategoria: 'museo', tipo_actividad: 'sendero' }, 'x'], 250],
    ['radio explicito tiene prioridad', ['sitio', { subcategoria: 'museo' }, 'x', 500], 500]
  ];
  casosRadio.forEach(function(c) {
    var got = resolverRadioM(c[1][0], c[1][1], c[1][2], c[1][3]);
    check('B6b: ' + c[0] + ' === ' + c[2], got === c[2]);
  });

  // B7/B8. VOCACIONES: 4 items, todos nivel 5.
  var VOCACIONES = inter.sandbox.module.exports.VOCACIONES || [];
  check('B7: VOCACIONES tiene 4 items', VOCACIONES.length === 4);
  check('B8: los 4 VOCACIONES tienen nivel 5',
    VOCACIONES.length === 4 && VOCACIONES.every(function(v) { return v.nivel === 5; }));

  // B9. Existe id 'escritor'.
  check('B9: existe la vocacion escritor',
    VOCACIONES.some(function(v) { return v.id === 'escritor'; }));

  // B10. >= 6 misiones con grupo 'artista'.
  (function() {
    var m = srcInt.match(/grupo:\s*'artista'/g) || [];
    check('B10: existen >= 6 misiones con grupo artista (encontradas: ' + m.length + ')', m.length >= 6);
  })();

  // B11. validarSesion usa crypto.timingSafeEqual y SESSION_JWT_SECRET.
  check('B11a: validarSesion usa crypto.timingSafeEqual',
    srcInt.indexOf('crypto.timingSafeEqual') !== -1);
  check('B11b: validarSesion usa SESSION_JWT_SECRET',
    srcInt.indexOf('SESSION_JWT_SECRET') !== -1);

  // B11c. Integracion: token firmado por usuarios.js valida en interacciones.js.
  (function() {
    var validarSesion = inter.sandbox.module.exports.validarSesion;
    var token = firmarSesion('user-42');
    var rOk = validarSesion({ headers: { authorization: 'Bearer ' + token } }, 'user-42');
    var rSub = validarSesion({ headers: { authorization: 'Bearer ' + token } }, 'otro');
    var rMal = validarSesion({ headers: { authorization: 'Bearer b64.mala' } }, 'user-42');
    check('B11c: validarSesion acepta token de firmarSesion y rechaza sub/malformado',
      rOk.ok === true && rSub.ok === false && rMal.ok === false);
  })();

  // B12. Ramas activo_oculto_votar / activo_oculto_checkin + haversine en checkin.
  check('B12a: interacciones.js contiene la rama activo_oculto_votar',
    srcInt.indexOf('activo_oculto_votar') !== -1);
  check('B12b: interacciones.js contiene la rama activo_oculto_checkin',
    srcInt.indexOf('activo_oculto_checkin') !== -1);
  (function() {
    var start = srcInt.indexOf("'activo_oculto_checkin'");
    var nextIf = start === -1 ? -1 : srcInt.indexOf('if (tipo2 ===', start + 1);
    var region = start === -1 ? ''
      : srcInt.substring(start, nextIf === -1 ? start + 4000 : nextIf);
    check('B12c: la rama de checkin usa haversineMetros() sobre activos_ocultos',
      region.indexOf('haversineMetros(') !== -1
      && region.indexOf('activos_ocultos_checkins') !== -1);
  })();

  // --- C. ADMIN (api/admin.js) ----------------------------------------

  check('C13a: admin.js contiene activos_ocultos', srcAdm.indexOf('activos_ocultos') !== -1);
  check('C13b: admin.js contiene activo_oculto_moderar', srcAdm.indexOf('activo_oculto_moderar') !== -1);
  check('C13c: admin.js contiene helper con WITH RECURSIVE cadena',
    srcAdm.indexOf('WITH RECURSIVE cadena') !== -1);

  // --- D. MIGRACION + HTML --------------------------------------------

  var migrRel = 'db/migrations/016_multinivel_crowdsourcing.sql';
  var migrPath = path.join(__dirname, '..', migrRel);
  var migrExiste = fs.existsSync(migrPath);
  check('D14a: 016_multinivel_crowdsourcing.sql existe', migrExiste);
  if (migrExiste) {
    var migr = fs.readFileSync(migrPath, 'utf8');
    var facciones = ['exploradores', 'curadores', 'creadores', 'artistas'];
    var todasFacciones = facciones.every(function(f) {
      return migr.indexOf("'" + f + "'") !== -1;
    });
    check('D14b: la migracion contiene las 4 facciones', todasFacciones);

    var ddl = sentenciasDdl(migr);
    var conIf = ddl.filter(function(s) { return /IF NOT EXISTS/i.test(s); });
    check('D14c: TODAS las sentencias DDL usan IF NOT EXISTS (' + conIf.length + '/' + ddl.length + ')',
      ddl.length > 0 && conIf.length === ddl.length);
  }

  check('D15a: mi-perfil.html divs balanceados (diff 0)', divBalance('mi-perfil.html') === 0);
  check('D15b: comunidad.html divs balanceados (diff 0)', divBalance('comunidad.html') === 0);
  check('D15c: admin.html divs balanceados (diff 0)', divBalance('admin.html') === 0);

  // --- E. ASCII-SAFETY (archivos api/*.js de la Entrega 016) ----------

  check('E16a: api/usuarios.js tiene 0 bytes > 127', asciiSafe('api/usuarios.js'));
  check('E16b: api/interacciones.js tiene 0 bytes > 127', asciiSafe('api/interacciones.js'));
  check('E16c: api/admin.js tiene 0 bytes > 127', asciiSafe('api/admin.js'));

  // --- Auto-check del propio script -----------------------------------
  check('SELF: smoke_016 ASCII-safe (0 bytes > 127)', asciiSafe('scripts/smoke_016_multinivel_crowdsourcing.js'));
  check('SELF: smoke_016 con 0 backticks',
    readApi('scripts/smoke_016_multinivel_crowdsourcing.js').indexOf(String.fromCharCode(96)) === -1);
}

function finish() {
  console.log('');
  console.log('=== SMOKE TEST 016 MULTINIVEL CROWDSOURCING ===');
  console.log('Checks: ' + (passed + failed) + ' total, ' + passed + ' PASS, ' + failed + ' FAIL');
  if (failed === 0) {
    console.log('SMOKE 016 MULTINIVEL: OK');
  } else {
    console.log('SMOKE 016 MULTINIVEL: ' + failed + ' FALLO(S)');
    process.exitCode = 1;
  }
}

run().then(finish).catch(function(err) {
  console.log('FAIL - smoke 016 lanzo error: ' + (err && err.message));
  process.exitCode = 1;
  finish();
});
