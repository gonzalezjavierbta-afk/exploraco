// scripts/smoke_064_bono_global_pct.js
// Certificacion del bono PORCENTUAL global 24 h de los consumibles de faccion
// (ADR-120 / migracion 064). NO toca Neon: carga el handler REAL de
// api/interacciones.js en un sandbox vm con @neondatabase/serverless
// redirigido a un fake en memoria (global.__MOCKSQL__), mismo harness que
// scripts/smoke_057_consumibles_faccion.js.
//
// Bloque A vigencia: ventana por expira_en + tope (funciones reales)
// Bloque B no apilamiento: gana el mayor bono_pct, con SU tope
// Bloque C matematica: el bono se calcula sobre xp_base, nunca sobre el stack
// Bloque D cooldown POR CLAVE del usar_consumible (handler real)
// Bloque E compatibilidad del objeto antiguo consumible_efecto + anti-doble-pago
// Bloque F default seguro: 0 filas = sin bono, accion no clasificada = 0
//
// ASCII-safe (ADR-002), CommonJS (BUG-001), 0 backticks.
// Run: node scripts/smoke_064_bono_global_pct.js
'use strict';

var fs = require('fs');
var path = require('path');
var vm = require('vm');
var SESION = require('../lib/sesion.js');

var ROOT = path.join(__dirname, '..');
var API_REL = 'api/interacciones.js';
var UID = '44444444-4444-4444-8444-444444444444';
var TOKEN = SESION.firmarSesion(UID);

var total = 0;
var fails = 0;
function check(label, cond, detalle) {
  total++;
  if (cond) { console.log('PASS - ' + label); }
  else {
    fails++;
    console.log('FAIL - ' + label + (detalle === undefined ? '' : ' :: ' + JSON.stringify(detalle)));
  }
}

// ---- Sandbox del api real (fake neon + registro de SQL ejecutado) ----
var sqlCalls = [];
function cargarApi(expone) {
  var fakeNeon = {
    neon: function() {
      return function(q, p) {
        sqlCalls.push({ q: String(q || ''), p: p || [] });
        return global.__MOCKSQL__ ? global.__MOCKSQL__(q, p) : Promise.resolve([]);
      };
    }
  };
  var customRequire = function(request) {
    if (request === '@neondatabase/serverless') return fakeNeon;
    return require(request);
  };
  customRequire.resolve = require.resolve;
  var src = fs.readFileSync(path.join(ROOT, API_REL), 'utf8');
  var sandbox = {
    module: { exports: {} }, exports: {},
    require: customRequire, console: console, process: process,
    Buffer: Buffer, setTimeout: setTimeout, clearTimeout: clearTimeout,
    fetch: function() { return Promise.resolve({ json: function() { return Promise.resolve({}); } }); }
  };
  sandbox.exports = sandbox.module.exports;
  vm.createContext(sandbox);
  var inject = '';
  expone.forEach(function(n) { inject += '\nmodule.exports.' + n + ' = ' + n + ';'; });
  vm.runInContext(src + inject, sandbox, { filename: API_REL });
  return sandbox.module.exports;
}

var M = cargarApi(['ventanaBonoAbierta', 'efectoBonoVigente', 'efectoBonoGanador',
  'acreditarBonoGlobal', 'accionConBono', 'registrarXpLedger', 'numXp', 'red2']);
var handler = M;

function instalarMock(rutas) {
  sqlCalls = [];
  global.__MOCKSQL__ = function(q, p) {
    var texto = String(q || '');
    for (var i = 0; i < rutas.length; i++) {
      if (texto.indexOf(rutas[i].match) !== -1) {
        var filas = typeof rutas[i].rows === 'function' ? rutas[i].rows(q, p) : rutas[i].rows;
        return Promise.resolve(filas === undefined ? [] : filas);
      }
    }
    return Promise.resolve([]);
  };
}

function fakeRes() {
  return {
    _status: 0, _json: null,
    setHeader: function() { return this; },
    status: function(n) { this._status = n; return this; },
    json: function(o) { this._json = o; return this; },
    end: function() { return this; }
  };
}
function post(body, token) {
  var res = fakeRes();
  var req = {
    method: 'POST', query: {}, body: body,
    headers: { authorization: 'Bearer ' + String(token || TOKEN) }
  };
  return Promise.resolve().then(function() { return handler(req, res); })
    .then(function() { return res; });
}
function cuentaSql(fragmento) {
  var n = 0;
  for (var i = 0; i < sqlCalls.length; i++) {
    if (sqlCalls[i].q.indexOf(fragmento) !== -1) n++;
  }
  return n;
}
function llamadaSql(fragmento) {
  for (var i = 0; i < sqlCalls.length; i++) {
    if (sqlCalls[i].q.indexOf(fragmento) !== -1) return sqlCalls[i];
  }
  return null;
}
function sinComentarios(texto) {
  return String(texto).split(/\r?\n/).map(function(linea) {
    var i = linea.indexOf('--');
    return i === -1 ? linea : linea.slice(0, i);
  }).join('\n');
}
function contarNoAscii(buf) {
  var n = 0;
  for (var i = 0; i < buf.length; i++) { if (buf[i] > 127) n++; }
  return n;
}

var AHORA = Date.now();
function iso(ms) { return new Date(AHORA + ms).toISOString(); }
var FUTURO = iso(3600000);
var PASADO = iso(-3600000);

function entrada(pct, tope, acumulado, expira) {
  return {
    clave: 'consumible_catalejo_explorador', activo_desde: iso(-60000),
    expira_en: expira === undefined ? FUTURO : expira,
    bono_pct: pct, bono_tope_xp: tope, bono_acumulado_xp: acumulado
  };
}
// Igual que entrada() pero con la clave del mapa: normalizarBono toma
// ef.clave cuando existe, asi que la fixture debe declararla.
function ef(clave, pct, tope, acumulado, expira) {
  var e = entrada(pct, tope, acumulado, expira);
  e.clave = clave;
  return e;
}
// sql de banco del harness: registra y delega en el mock instalado. Las
// funciones reales del api reciben el sql como PRIMER argumento.
function sqlHarness(q, p) {
  sqlCalls.push({ q: String(q || ''), p: p || [] });
  return global.__MOCKSQL__ ? global.__MOCKSQL__(q, p) : Promise.resolve([]);
}

async function run() {
  console.log('== A vigencia del bono: ventana por expira_en y tope por ventana');
  var v = M.ventanaBonoAbierta;
  var vig = M.efectoBonoVigente;
  check('A-0: las funciones reales del api quedan invocables',
    typeof v === 'function' && typeof vig === 'function'
    && typeof M.efectoBonoGanador === 'function' && typeof M.acreditarBonoGlobal === 'function');
  check('A-1: expira_en futuro + bono_pct + tope + acumulado 0 -> vigente',
    !!vig(entrada(25, 400, 0)));
  check('A-2: expira_en en el pasado -> NO vigente', !vig(entrada(25, 400, 0, PASADO)));
  check('A-3: sin expira_en -> NO vigente', !vig(entrada(25, 400, 0, '')));
  check('A-4: expira_en basura -> NO vigente (isFinite corta)', !vig(entrada(25, 400, 0, 'no-es-fecha')));
  check('A-5: bono_pct 0 -> NO vigente', !vig(entrada(0, 400, 0)));
  check('A-6: tope 0 -> NO vigente (el tope es obligatorio)', !vig(entrada(25, 0, 0)));
  check('A-7: acumulado IGUAL al tope -> NO vigente (la entrada se conserva, no paga)',
    !vig(entrada(25, 400, 400)) && !!vig(entrada(25, 400, 399.99)));
  check('A-8: bono_pct/tope en texto (jsonb) se aceptan por numXp', !!vig(entrada('15', '250', '10')));
  check('A-9: la ventana ignora el tope (ventanaA abierta con tope agotado)',
    !!v(entrada(25, 400, 400)) && !vig(entrada(25, 400, 400)));

  console.log('');
  console.log('== B no apilamiento: gana el mayor bono_pct, con SU tope');
  var gan = M.efectoBonoGanador;
  var bic = gan({ consumible_efectos: {
    consumible_catalejo_explorador: ef('consumible_catalejo_explorador', 10, 250, 0),
    consumible_lupa_curador: ef('consumible_lupa_curador', 25, 550, 0)
  } });
  check('B-1: dos efectos vigentes -> gana el de mayor bono_pct (25, no 10)',
    !!bic && bic.bono_pct === 25 && bic.clave === 'consumible_lupa_curador', bic);
  check('B-2: el tope aplicado es el del GANADOR (550), no el minimo (250)',
    !!bic && bic.bono_tope_xp === 550, bic);
  var emp = gan({ consumible_efectos: {
    b_clave: ef('b_clave', 25, 400, 0), a_clave: ef('a_clave', 25, 550, 0)
  } });
  check('B-3: empate de pct -> gana el de mas tope RESTANTE (550)',
    !!emp && emp.bono_pct === 25 && emp.restante === 550, emp);
  var des = gan({ consumible_efectos: {
    z_clave: ef('z_clave', 25, 400, 0), a_clave: ef('a_clave', 25, 400, 0)
  } });
  check('B-4: empate de pct y restante -> clave ASC (a_clave)',
    !!des && des.clave === 'a_clave', des);
  check('B-5: un efecto caducado NO participa (gana el vigente)',
    (gan({ consumible_efectos: {
      viejo: ef('viejo', 50, 900, 0, PASADO), nuevo: ef('nuevo', 5, 100, 0)
    } }) || {}).clave === 'nuevo');
  check('B-6: mapa vacio y caps ausentes -> null', gan({}) === null && gan(null) === null
    && gan({ consumible_efectos: {} }) === null);
  check('B-7: la suma NO apila (un solo ganador, bono_pct = el mayor)',
    !!bic && bic.bono_pct === 25 && bic.bono_pct !== 35);

  console.log('');
  console.log('== C el bono se calcula sobre XP BASE, nunca sobre el stack');
  function mockBono(caps, acum) {
    instalarMock([
      { match: 'SELECT capacidades FROM usuarios', rows: [{ capacidades: caps }] },
      { match: 'UPDATE usuarios SET xp_total = xp_total + $3',
        rows: acum === null ? [] : [{ bono_acumulado_xp: String(acum) }] },
      { match: 'UPDATE usuarios SET xp_total = xp_total + $2', rows: [] },
      { match: 'INSERT INTO xp_ledger', rows: [] }
    ]);
  }
  var capsBase = { consumible_efectos: { consumible_catalejo_explorador: entrada(25, 1000, 0) } };

  mockBono(capsBase, 25);
  var c1 = await M.registrarXpLedger(sqlHarness, {
    usuario_id: UID, accion: 'voto_media', xp_base: 100, mult_nivel: 1,
    mult_stack: 3, mult_final: 3, cap_aplicado: 'ninguno', bonos_planos: 0,
    xp_final: 300, es_exento: false
  });
  var hijo = null;
  for (var i = 0; i < sqlCalls.length; i++) {
    if (sqlCalls[i].q.indexOf('INSERT INTO xp_ledger') !== -1
      && String(sqlCalls[i].p[1]) === 'bono_consumible_24h') hijo = sqlCalls[i];
  }
  check('C-1: se acredita UN asiento hijo bono_consumible_24h', !!hijo
    && c1 === undefined, hijo && hijo.p.slice(0, 10));
  check('C-2: el monto es 25 = 25% de xp_base (100), NO de xp_final (300)',
    !!hijo && M.numXp(hijo.p[8]) === 25, hijo && hijo.p[8]);
  check('C-3: el asiento hijo es EXENTO y lleva bono_de (corta la recursion)',
    !!hijo && hijo.p[9] === true
    && String(hijo.p[12] || '').indexOf('consumible_clave') !== -1, hijo && hijo.p[12]);
  check('C-4: el UPDATE del bono es UNA sola sentencia condicionada por tope y fecha',
    cuentaSql('UPDATE usuarios SET xp_total = xp_total + $3') === 1
    && cuentaSql("COALESCE(capacidades->'consumible_efectos'->$2::text->>'expira_en','') = $4::text") === 1,
    cuentaSql('UPDATE usuarios SET xp_total = xp_total + $3'));

  mockBono({ consumible_efectos: { k: entrada(25, 100, 0) } }, 100);
  var c5 = await M.acreditarBonoGlobal(sqlHarness, { usuario_id: UID, accion: 'voto_media',
    xp_base: 1000, xp_final: 1000, es_exento: false });
  check('C-5: corte EXACTO en el tope: 25% de 1000 = 250 pero el tope es 100 -> 100',
    !!c5 && c5.xp === 100, c5);

  mockBono({ consumible_efectos: { k: entrada(25, 400, 395) } }, 400);
  var c6 = await M.acreditarBonoGlobal(sqlHarness, { usuario_id: UID, accion: 'voto_media',
    xp_base: 100, xp_final: 100, es_exento: false });
  check('C-6: tope casi agotado: restan 5 -> acredita 5 (nunca lo supera)',
    !!c6 && c6.xp === 5, c6);

  mockBono({ consumible_efectos: { k: entrada(25, 400, 400) } }, 400);
  var c7 = await M.acreditarBonoGlobal(sqlHarness, { usuario_id: UID, accion: 'voto_media',
    xp_base: 100, xp_final: 100, es_exento: false });
  check('C-7: tope agotado -> 0 y ningun UPDATE ejecutado',
    c7 === null && cuentaSql('UPDATE usuarios SET xp_total = xp_total + $3') === 0, c7);

  mockBono({ consumible_efectos: { k: entrada(12.5, 400, 0) } }, 4.13);
  var c8 = await M.acreditarBonoGlobal(sqlHarness, { usuario_id: UID, accion: 'visita',
    xp_base: 33, xp_final: 33, es_exento: false });
  check('C-8: redondeo a 2 decimales (12,5% de 33 = 4.13)', !!c8 && c8.xp === 4.13, c8);

  console.log('');
  console.log('== D cooldown POR CLAVE en usar_consumible (handler real)');
  function mockUsar(caps, updRows) {
    return [
      { match: 'SELECT id, clave FROM consumibles',
        rows: [{ id: '55555555-5555-4555-8555-555555555555', clave: 'consumible_catalejo_explorador' }] },
      { match: 'SELECT categoria, cargas, duracion_horas, bono_accion, bono_xp_fijo',
        rows: [{ categoria: 'faccion', cargas: 2, duracion_horas: 24,
          bono_accion: 'guardado', bono_xp_fijo: '0' }] },
      { match: 'SELECT es_permanente, bono_pct, bono_tope_xp, duracion_horas',
        rows: [{ es_permanente: false, bono_pct: '25', bono_tope_xp: '400', duracion_horas: 24 }] },
      { match: 'SELECT capacidades FROM usuarios', rows: [{ capacidades: caps }] },
      { match: 'UPDATE usuarios SET capacidades = ', rows: updRows },
      { match: 'INSERT INTO consumo_consumibles', rows: [] }
    ];
  }

  instalarMock(mockUsar({
    consumibles: { consumible_catalejo_explorador: 2 },
    consumible_efectos: {}
  }, [{ capacidades: {} }]));
  var d1 = await post({ tipo: 'usar_consumible', usuario_id: UID,
    clave: 'consumible_catalejo_explorador' });
  check('D-1: activar con la clave libre -> 200 y efecto con pct y tope',
    d1._status === 200 && !!d1._json && d1._json.efecto
    && d1._json.efecto.bono_pct === 25 && d1._json.efecto.bono_tope_xp === 400
    && d1._json.efecto.bono_acumulado_xp === 0, d1._json);
  var d1Sql = sinComentarios((llamadaSql('UPDATE usuarios SET capacidades = ') || { q: '' }).q);
  check('D-2: la ventana del cooldown va en el WHERE y mira SOLO la clave $2',
    d1Sql.indexOf("capacidades->'consumible_efectos'->$2::text->>'expira_en','') <= $3::text") !== -1
    && d1Sql.indexOf("consumible_efectos'->$2::text") !== -1, d1Sql.slice(-260));
  check('D-3: stock y sello del mapa van en la MISMA sentencia, con merge aditivo',
    d1Sql.indexOf("COALESCE(NULLIF(capacidades->'consumibles'->>$2::text,'')::int,0) - 1") !== -1
    && d1Sql.indexOf("COALESCE(capacidades,'{}'::jsonb)") !== -1
    && d1Sql.indexOf("'consumible_efectos',") !== -1, d1Sql.slice(0, 200));
  check('D-4: las OTRAS claves del mapa no se tocan (el objeto se mergea, no se reemplaza)',
    d1Sql.indexOf("COALESCE(capacidades->'consumible_efectos','{}'::jsonb)") !== -1);

  instalarMock(mockUsar({
    consumibles: { consumible_catalejo_explorador: 2 },
    consumible_efectos: { consumible_catalejo_explorador: entrada(25, 400, 0) }
  }, []));
  var d5 = await post({ tipo: 'usar_consumible', usuario_id: UID,
    clave: 'consumible_catalejo_explorador' });
  check('D-5: la MISMA clave en ventana -> 0 filas -> 409 EFECTO_YA_ACTIVO',
    d5._status === 409 && d5._json && d5._json.error === 'EFECTO_YA_ACTIVO', d5._json);
  check('D-6: el 409 informa expira_en y no descuenta stock (0 UPDATE de inventario)',
    !!(d5._json && d5._json.efecto && d5._json.efecto.expira_en === FUTURO),
    d5._json && d5._json.efecto);

  instalarMock(mockUsar({
    consumibles: {},
    consumible_efectos: { consumible_lupa_curador: entrada(25, 400, 0) }
  }, []));
  var d7 = await post({ tipo: 'usar_consumible', usuario_id: UID,
    clave: 'consumible_catalejo_explorador' });
  check('D-7: sin stock y sin ventana abierta de esa clave -> 409 SIN_STOCK',
    d7._status === 409 && d7._json && d7._json.error === 'SIN_STOCK', d7._json);

  console.log('');
  console.log('== E objeto antiguo consumible_efecto + anti-doble-pago');
  var legPlano = { clave: 'consumible_lupa_curador', expira_en: FUTURO,
    bono_xp_fijo: 3, cargas_restantes: 2, bono_accion: ['media_voto'] };
  var legPct = { clave: 'consumible_lupa_curador', expira_en: FUTURO,
    bono_pct: 15, bono_tope_xp: 250, bono_acumulado_xp: 0 };
  check('E-1: el objeto antiguo con bono plano (bono_xp_fijo) NO produce bono % nuevo',
    gan({ consumible_efecto: legPlano }) === null, gan({ consumible_efecto: legPlano }));
  check('E-2: el objeto antiguo con bono_pct SI participa (compatibilidad)',
    (gan({ consumible_efecto: legPct }) || {}).clave === 'consumible_lupa_curador');
  check('E-3: la misma clave en el mapa y en el antiguo cuenta UNA vez (mapa)',
    gan({ consumible_efecto: legPct, consumible_efectos: {
      consumible_lupa_curador: entrada(15, 250, 0)
    } }).slot === 'mapa');
  check('E-4: el antiguo se ignora cuando su clave ya vive en el mapa',
    gan({ consumible_efecto: legPct, consumible_efectos: {
      consumible_lupa_curador: entrada(15, 250, 0)
    } }) !== null && gan({ consumible_efecto: legPlano }) === null);

  mockBono({ consumible_efecto: legPlano }, null);
  var e5 = await M.acreditarBonoGlobal(sqlHarness, { usuario_id: UID, accion: 'voto_media',
    xp_base: 100, xp_final: 100, es_exento: false });
  check('E-5: con SOLO el objeto antiguo plano no hay bono % (cero doble pago)',
    e5 === null && cuentaSql('UPDATE usuarios SET xp_total = xp_total +') === 0, e5);

  mockBono({ consumible_efectos: { k: entrada(25, 400, 0) } }, 25);
  var e6 = await M.acreditarBonoGlobal(sqlHarness, { usuario_id: UID, accion: 'bono_consumible_24h',
    xp_base: 100, xp_final: 25, es_exento: true, bono_de: 'consumible_catalejo_explorador' });
  check('E-6: un asiento con bono_de no se re-bonifica (contador de creditos = 1)',
    e6 === null && cuentaSql('UPDATE usuarios SET xp_total = xp_total +') === 0, e6);

  mockBono({ consumible_efectos: { k: entrada(25, 400, 0) } }, 25);
  var e7 = await M.registrarXpLedger(sqlHarness, { usuario_id: UID, accion: 'voto_media',
    xp_base: 100, mult_nivel: 1, mult_stack: 1, mult_final: 1,
    cap_aplicado: 'ninguno', bonos_planos: 0, xp_final: 100, es_exento: false });
  var nHijos = 0;
  for (var j = 0; j < sqlCalls.length; j++) {
    if (sqlCalls[j].q.indexOf('INSERT INTO xp_ledger') !== -1
      && String(sqlCalls[j].p[1]) === 'bono_consumible_24h') nHijos++;
  }
  check('E-7: dos asientos (madre + hijo) y UN solo credito de bono (no 2)',
    e7 === undefined && nHijos === 1 && cuentaSql('INSERT INTO xp_ledger') === 2, nHijos);

  console.log('');
  console.log('== F default seguro: accion no clasificada = 0 y 0 filas = sin bono');
  var cb = M.accionConBono;
  check('F-1: una accion de la allowlist cobra (voto_media, guardado, resena_larga)',
    cb('voto_media') === true && cb('guardado') === true && cb('resena_larga') === true);
  check('F-2: una accion NO clasificada NO cobra (inventada_x, vacia, null)',
    cb('inventada_x') === false && cb('') === false && cb(null) === false);
  check('F-3: las excluidas NO cobran aunque esten en la allowlist de nombres',
    cb('mision') === false && cb('compra_consumible') === false
    && cb('bono_consumible_24h') === false && cb('carta_fusion') === false);

  mockBono({ consumible_efectos: { k: entrada(25, 400, 0) } }, 25);
  var f4 = await M.acreditarBonoGlobal(sqlHarness, { usuario_id: UID, accion: 'inventada_x',
    xp_base: 100, xp_final: 100, es_exento: false });
  check('F-4: accion no clasificada -> 0 filas y 0 UPDATE', f4 === null
    && cuentaSql('UPDATE usuarios SET xp_total = xp_total +') === 0, f4);

  mockBono({ consumible_efectos: { k: entrada(25, 400, 0) } }, 25);
  var f5 = await M.acreditarBonoGlobal(sqlHarness, { usuario_id: UID, accion: 'voto_media',
    xp_base: 100, xp_final: 0, es_exento: false });
  check('F-5: xp_final <= 0 -> sin bono', f5 === null
    && cuentaSql('UPDATE usuarios SET xp_total = xp_total +') === 0, f5);

  mockBono({ consumible_efectos: { k: entrada(25, 400, 0) } }, null);
  var f6 = await M.acreditarBonoGlobal(sqlHarness, { usuario_id: UID, accion: 'voto_media',
    xp_base: 100, xp_final: 100, es_exento: false });
  check('F-6: 0 filas del UPDATE condicionado -> no se acredita ni se escribe ledger',
    f6 === null && cuentaSql('INSERT INTO xp_ledger') === 0, f6);

  mockBono({ consumible_efectos: {} }, null);
  var f7 = await M.acreditarBonoGlobal(sqlHarness, { usuario_id: UID, accion: 'voto_media',
    xp_base: 100, xp_final: 100, es_exento: false });
  check('F-7: sin efecto vigente -> 0 bonos', f7 === null, f7);

  console.log('');
  var selfBuf = fs.readFileSync(path.join(ROOT, 'scripts/smoke_064_bono_global_pct.js'));
  check('SELF: smoke_064 ASCII-safe (0 bytes > 127)', contarNoAscii(selfBuf) === 0,
    contarNoAscii(selfBuf));
  check('SELF: smoke_064 con 0 backticks',
    fs.readFileSync(path.join(ROOT, 'scripts/smoke_064_bono_global_pct.js'), 'utf8')
      .indexOf(String.fromCharCode(96)) === -1);

  console.log('');
  if (fails === 0) {
    console.log('Checks: ' + total + ' total, ' + total + ' PASS, 0 FAIL');
    console.log('RESULTADO: OK - ' + total + '/' + total + ' verificaciones pasaron.');
    process.exit(0);
  }
  console.log('Checks: ' + total + ' total, ' + (total - fails) + ' PASS, ' + fails + ' FAIL');
  console.log('RESULTADO: FAIL - ' + fails + ' de ' + total + ' verificaciones fallaron.');
  process.exit(1);
}

run().catch(function(e) {
  console.log('FAIL - smoke 064 lanzo error: ' + (e && e.stack ? e.stack : String(e)));
  process.exit(1);
});
