// scripts/smoke_065_set_ancestral.js
// Certificacion del set Ancestral 4/4 (ADR-120 / migracion 065). NO toca Neon:
// carga los handlers REALES de api/interacciones.js y api/usuarios.js en
// sandboxes vm con @neondatabase/serverless redirigido a un fake en memoria
// (global.__MOCKSQL__), mismo harness que scripts/smoke_057_consumibles_faccion.js.
//
// Bloque A progreso del set 4/4 SIN nivel_gate (cartas_mias, api/usuarios)
// Bloque B premio idempotente: dos llamadas = una fila (otorgarPremioSetSiCompleto)
// Bloque C billetera_id NULL permitido: el premio no se pierde sin billetera
// Bloque D carta base permanente: usar_consumible -> 409 CONSUMIBLE_PERMANENTE
// Bloque E recompra de la base: 409 YA_POSEES sin cobrar (0 sentencias de cobro)
// Bloque F misiones filtradas por acceso (0 sin acceso / 4 con acceso)
//
// ASCII-safe (ADR-002), CommonJS (BUG-001), 0 backticks.
// Run: node scripts/smoke_065_set_ancestral.js
'use strict';

var fs = require('fs');
var path = require('path');
var vm = require('vm');
var SESION = require('../lib/sesion.js');

var ROOT = path.join(__dirname, '..');
var UID = '66666666-6666-4666-8666-666666666666';
var TOKEN = SESION.firmarSesion(UID);
var SET_SLUG = 'ancestral_esencia';

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

// ---- Sandbox de un handler real (fake neon + registro de SQL ejecutado) ----
var sqlCalls = [];
function cargarApi(fileRel, expone) {
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
  var src = fs.readFileSync(path.join(ROOT, fileRel), 'utf8');
  var sandbox = {
    module: { exports: {} }, exports: {},
    require: customRequire, console: console, process: process,
    Buffer: Buffer, setTimeout: setTimeout, clearTimeout: clearTimeout,
    fetch: function() { return Promise.resolve({ json: function() { return Promise.resolve({}); } }); }
  };
  sandbox.exports = sandbox.module.exports;
  vm.createContext(sandbox);
  var inject = '';
  (expone || []).forEach(function(n) { inject += '\nmodule.exports.' + n + ' = ' + n + ';'; });
  vm.runInContext(src + inject, sandbox, { filename: fileRel });
  return sandbox.module.exports;
}

var INTER = cargarApi('api/interacciones.js',
  ['otorgarPremioSetSiCompleto', 'tieneAccesoSet', 'setSlugDeConsumible']);
var USU = cargarApi('api/usuarios.js', []);

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
function sqlHarness(q, p) {
  sqlCalls.push({ q: String(q || ''), p: p || [] });
  return global.__MOCKSQL__ ? global.__MOCKSQL__(q, p) : Promise.resolve([]);
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
function invocar(handler, req) {
  var res = fakeRes();
  return Promise.resolve().then(function() { return handler(req, res); })
    .then(function() { return res; });
}
function post(body) {
  return invocar(INTER, {
    method: 'POST', query: {}, body: body,
    headers: { authorization: 'Bearer ' + TOKEN }
  });
}
function getUsu(query) {
  return invocar(USU, {
    method: 'GET', query: query,
    headers: { authorization: 'Bearer ' + TOKEN }
  });
}
function getInter(query) {
  return invocar(INTER, {
    method: 'GET', query: query,
    headers: { authorization: 'Bearer ' + TOKEN }
  });
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
function contarNoAscii(buf) {
  var n = 0;
  for (var i = 0; i < buf.length; i++) { if (buf[i] > 127) n++; }
  return n;
}
function claves(o) {
  return Object.keys(o || {}).sort().join(',');
}

function mockCartasMias(obtenidas) {
  return [
    { match: 'SELECT xp_total, nivel_max FROM usuarios', rows: [{ xp_total: '0', nivel_max: 1 }] },
    { match: 'jsonb_agg(jsonb_build_object(', rows: [] },
    { match: 'FROM cartas_gates', rows: [] },
    { match: 'COUNT(DISTINCT c.id)::int AS total',
      rows: [{ set_slug: SET_SLUG, nivel_gate: null, total: 4, obtenidas: obtenidas }] },
    { match: 'en_museo = true', rows: [] }
  ];
}
function mockMisiones(caps, guardados) {
  return [
    { match: 'SELECT progreso_misiones, capacidades FROM usuarios',
      rows: [{ progreso_misiones: {}, capacidades: caps }] },
    { match: 'SELECT xp_total, total_guardados, total_visitas',
      rows: [{ xp_total: '0', total_guardados: guardados || 0, total_visitas: 0,
        progreso_misiones: {}, capacidades: caps }] },
    { match: 'COUNT(*)::int AS n FROM interacciones', rows: [{ n: 0 }] },
    { match: 'SELECT progreso_misiones FROM usuarios', rows: [{ progreso_misiones: {} }] }
  ];
}

async function run() {
  console.log('== A progreso del set 4/4 SIN nivel_gate (cartas_mias)');
  instalarMock(mockCartasMias(4));
  var a1 = await getUsu({ tipo: 'cartas_mias', usuario_id: UID });
  var a1Data = (a1._json && a1._json.data) || {};
  var a1Req = (a1Data.requisitos || []).filter(function(r) {
    return r && r.set_slug === SET_SLUG;
  });
  check('A-1: el set de coleccion viaja en requisitos con total 4 y obtenidas 4',
    !!a1._json && a1._json.ok === true && a1Req.length === 1 && a1Req[0].total === 4
    && a1Req[0].obtenidas === 4, a1._json && a1._json.data);
  check('A-2: nivel_gate es NULL: el set de coleccion no inventa un nivel',
    a1Req.length === 1 && a1Req[0].nivel_gate === null, a1Req[0]);
  check('A-3: completo se deriva de obtenidas >= total (4/4 -> true)',
    a1Req.length === 1 && a1Req[0].completo === true, a1Req[0]);

  instalarMock(mockCartasMias(3));
  var a4 = await getUsu({ tipo: 'cartas_mias', usuario_id: UID });
  var a4Req = (((a4._json || {}).data || {}).requisitos || []).filter(function(r) {
    return r && r.set_slug === SET_SLUG;
  });
  check('A-4: con 3 de 4 el progreso NO se declara completo',
    a4Req.length === 1 && a4Req[0].completo === false && a4Req[0].total === 4, a4Req[0]);
  instalarMock(mockCartasMias(0));
  var a5 = await getUsu({ tipo: 'cartas_mias', usuario_id: UID });
  var a5Req = (((a5._json || {}).data || {}).requisitos || []).filter(function(r) {
    return r && r.set_slug === SET_SLUG;
  });
  check('A-5: con 0 de 4 sigue apareciendo (la vitrina del set no depende del progreso)',
    a5Req.length === 1 && a5Req[0].obtenidas === 0 && a5Req[0].completo === false, a5Req[0]);
  var aSql = (llamadaSql('COUNT(DISTINCT c.id)::int AS total') || { q: '' }).q;
  check('A-6: la consulta del progreso incluye los sets de coleccion y no inventa nivel',
    aSql.indexOf('c.set_coleccion = true') !== -1
    && aSql.indexOf('c.nivel_gate IN (10,14,20,25)') !== -1, aSql.slice(0, 300));

  console.log('');
  console.log('== B premio 4/4 idempotente (otorgarPremioSetSiCompleto real)');
  var premio = INTER.otorgarPremioSetSiCompleto;
  instalarMock([{ match: 'WITH cuenta AS (', rows: [{ premio_insertado: 0, abonado: 0,
    premio_clave: 'ancestral_premio_set', premio_estado: null }] }]);
  var b1 = await premio(sqlHarness, UID, SET_SLUG, 4);
  check('B-1: con el set incompleto (3/4) no hay premio', b1 === null
    && cuentaSql('WITH cuenta AS (') === 1, b1);

  instalarMock([{ match: 'WITH cuenta AS (', rows: [{ premio_insertado: 1, abonado: 1,
    premio_clave: 'ancestral_premio_set', premio_estado: 'pendiente' }] }]);
  var b2 = await premio(sqlHarness, UID, SET_SLUG, 4);
  check('B-2: 4/4 -> UNA fila de canje y UNA unidad abonada en la misma sentencia',
    !!b2 && b2.insertado === 1 && b2.abonado === 1 && b2.clave === 'ancestral_premio_set'
    && b2.estado === 'pendiente', b2);
  check('B-3: la clave de idempotencia es usuario + set (una sola por set)',
    !!b2 && b2.idempotencia === 'premio_set:' + SET_SLUG + ':' + UID, b2 && b2.idempotencia);

  instalarMock([{ match: 'WITH cuenta AS (', rows: [{ premio_insertado: 0, abonado: 0,
    premio_clave: 'ancestral_premio_set', premio_estado: 'pendiente' }] }]);
  var b4 = await premio(sqlHarness, UID, SET_SLUG, 4);
  check('B-4: la segunda llamada NO crea premio nuevo ni re-abona (0/0)',
    !!b4 && b4.insertado === 0 && b4.abonado === 0, b4);

  var bSql = (llamadaSql('WITH cuenta AS (') || { q: '', p: [] }).q;
  var bPh = (bSql || '').replace(/\s+/g, ' ');
  check('B-5: el INSERT del canje es idempotente por clave_idempotencia',
    bPh.indexOf('ON CONFLICT (clave_idempotencia) DO NOTHING') !== -1, bPh.slice(-200));
  check('B-6: el abono cuelga del INSERT (EXISTS en ins): sin fila nueva no hay abono',
    bPh.indexOf('AND EXISTS (SELECT 1 FROM ins)') !== -1
    && bPh.indexOf('WHERE c.n >= $3::int') !== -1, bPh.slice(0, 300));
  check('B-7: el premio exige 4 cartas distintas del set contadas en servidor',
    bPh.indexOf('COUNT(DISTINCT uc.carta_id)::int AS n') !== -1
    && bPh.indexOf('c.set_slug = $2::text') !== -1, bPh.slice(0, 300));

  console.log('');
  console.log('== C billetera_id NULL permitido (el premio no se pierde sin billetera)');
  check('C-1: la billetera entra por LEFT JOIN (id puede quedar NULL)',
    bPh.indexOf('LEFT JOIN billeteras') !== -1, bPh.slice(-320));
  instalarMock([{ match: 'WITH cuenta AS (', rows: [{ premio_insertado: 1, abonado: 1,
    premio_clave: 'ancestral_premio_set', premio_estado: 'pendiente' }] }]);
  var c2 = await premio(sqlHarness, UID, SET_SLUG, 4);
  check('C-2: sin billetera el premio se crea igual (no lanza ni devuelve null)',
    !!c2 && c2.estado === 'pendiente', c2);
  check('C-3: el origen del canje es premio_set y el estado inicial pendiente',
    bPh.indexOf("'premio_set', 'pendiente'") !== -1, bPh.slice(0, 400));

  console.log('');
  console.log('== D carta base permanente: usar_consumible -> 409 CONSUMIBLE_PERMANENTE');
  function mockUsar(item, caps) {
    return [
      { match: 'SELECT id, clave FROM consumibles',
        rows: [{ id: '77777777-7777-4777-8777-777777777777', clave: 'ancestral_base' }] },
      { match: 'SELECT categoria, cargas, duracion_horas, bono_accion, bono_xp_fijo',
        rows: [{ categoria: 'general', cargas: 1, duracion_horas: 0,
          bono_accion: '', bono_xp_fijo: '0' }] },
      { match: 'SELECT es_permanente, bono_pct, bono_tope_xp, duracion_horas', rows: [item] },
      { match: 'SELECT capacidades FROM usuarios', rows: [{ capacidades: caps }] }
    ];
  }
  instalarMock(mockUsar({ es_permanente: true, bono_pct: 0, bono_tope_xp: 0,
    duracion_horas: null }, { consumibles: { ancestral_base: 1 } }));
  var d1 = await post({ tipo: 'usar_consumible', usuario_id: UID, clave: 'ancestral_base' });
  check('D-1: usar la carta base -> 409 CONSUMIBLE_PERMANENTE',
    d1._status === 409 && d1._json && d1._json.error === 'CONSUMIBLE_PERMANENTE', d1._json);
  check('D-2: el 409 nombra la clave y NO descuenta stock (0 UPDATE de capacidades)',
    !!(d1._json && d1._json.clave === 'ancestral_base')
    && cuentaSql('UPDATE usuarios SET capacidades = ') === 0, d1._json);
  instalarMock(mockUsar({ es_permanente: false, bono_pct: 0, bono_tope_xp: 0,
    duracion_horas: null }, { consumibles: { ancestral_base: 1 } }));
  var d3 = await post({ tipo: 'usar_consumible', usuario_id: UID, clave: 'ancestral_base' });
  check('D-3: control negativo: con es_permanente false el candado NO se dispara',
    !(d3._json && d3._json.error === 'CONSUMIBLE_PERMANENTE'), d3._json);

  console.log('');
  console.log('== E recompra de la carta base: 409 YA_POSEES sin cobrar');
  function mockCompraBase(cobrado, capsDiag) {
    return [
      { match: 'faccion_requerida, nivel_requerido, limite_diario FROM consumibles',
        rows: [{ id: '77777777-7777-4777-8777-777777777777', clave: 'ancestral_base',
          precio_xp: '1200', categoria: 'general', era_exclusiva: null,
          faccion_requerida: null, nivel_requerido: null, limite_diario: 0 }] },
      { match: 'SELECT desbloquea_set, otorga_carta FROM consumibles',
        rows: [{ desbloquea_set: SET_SLUG, otorga_carta: 'cta_ancestral_01' }] },
      { match: 'xp_gastado_sinks, 0) AS xp_gastado_sinks',
        rows: [{ xp_total: '9000', xp_gastado_sinks: '0', capacidades: {}, nivel_max: 1 }] },
      { match: 'SELECT faccion FROM usuarios', rows: [] },
      { match: 'WITH g AS (SELECT gen_random_uuid() AS cid)',
        rows: [{ cobrado: cobrado, compra_id: null, xp_total: '9000' }] },
      { match: 'SELECT capacidades FROM usuarios', rows: [{ capacidades: capsDiag }] }
    ];
  }
  var yaPosee = {};
  yaPosee[SET_SLUG] = { desde: '2026-11-01T00:00:00.000Z', origen: 'compra' };
  instalarMock(mockCompraBase(0, { sets_acceso: yaPosee }));
  var e1 = await post({ tipo: 'comprar_consumible', usuario_id: UID,
    clave: 'ancestral_base' });
  check('E-1: la base ya poseida -> 409 YA_POSEES con desbloquea_set',
    e1._status === 409 && e1._json && e1._json.error === 'YA_POSEES'
    && e1._json.desbloquea_set === SET_SLUG, e1._json);
  check('E-2: sin cobro no hay carta, ni ledger, ni compra registrada',
    cuentaSql('INSERT INTO usuarios_cartas') === 0
    && cuentaSql('INSERT INTO xp_ledger') === 0
    && cuentaSql('INSERT INTO compra_consumibles') === 1, [cuentaSql('INSERT INTO usuarios_cartas'),
      cuentaSql('INSERT INTO xp_ledger')]);
  var eSql = (llamadaSql('WITH g AS (SELECT gen_random_uuid() AS cid)') || { q: '', p: [] }).q;
  var ePh = (eSql || '').replace(/\s+/g, ' ');
  check('E-3: la carrera de la recompra va en el WHERE del cobro ($4 = set)',
    ePh.indexOf("NOT (COALESCE(u.capacidades->'sets_acceso','{}'::jsonb) ? $4::text)") !== -1,
    ePh.slice(-300));
  check('E-4: el flag del set y el cobro son la MISMA sentencia (no hay pre-chequeo TOCTOU)',
    ePh.indexOf("jsonb_build_object('sets_acceso'") !== -1
    && ePh.indexOf('xp_total = u.xp_total - $1') !== -1, ePh.slice(0, 300));
  instalarMock(mockCompraBase(1, { sets_acceso: yaPosee }));
  var e5 = await post({ tipo: 'comprar_consumible', usuario_id: UID, clave: 'ancestral_base' });
  check('E-5: control positivo: si el cobro escribe, la respuesta NO es YA_POSEES',
    e5._status === 200 && !!(e5._json && e5._json.acceso_set === SET_SLUG), e5._json);

  console.log('');
  console.log('== F misiones filtradas por acceso al set');
  instalarMock(mockMisiones({}, 0));
  var f1 = await getInter({ tipo: 'misiones', usuario_id: UID });
  var f1Data = (f1._json && f1._json.data) || [];
  instalarMock(mockMisiones({ sets_acceso: yaPosee }, 0));
  var f2 = await getInter({ tipo: 'misiones', usuario_id: UID });
  var f2Data = (f2._json && f2._json.data) || [];
  var anc1 = f1Data.filter(function(m) { return String(m.id || '').indexOf('mis_ancestral') === 0; });
  var anc2 = f2Data.filter(function(m) { return String(m.id || '').indexOf('mis_ancestral') === 0; });
  check('F-1: sin acceso al set -> 0 misiones del Ancestral visibles',
    !!f1._json && f1._json.ok === true && anc1.length === 0, f1._json && f1._json.error);
  check('F-2: con acceso -> las 4 misiones del set aparecen', anc2.length === 4,
    [anc2.map(function(m) { return m.id; }), f2._json && f2._json.error]);
  check('F-3: el total es dinamico y coherente (con acceso = sin acceso + 4)',
    !!f1._json && !!f2._json && f2._json.total === f1._json.total + 4
    && f2Data.length === f1Data.length + 4, [f1._json && f1._json.total, f2._json && f2._json.total]);
  check('F-4: el id de cada mision del set es el de la spec (4 claves exactas)',
    anc2.map(function(m) { return m.id; }).sort().join(',')
    === 'mis_ancestral_acceso,mis_ancestral_canje,mis_ancestral_guarda,mis_ancestral_resena',
    anc2.map(function(m) { return m.id; }));
  var f1Comun = f1Data.filter(function(m) { return String(m.id || '').indexOf('mis_ancestral') !== 0; })[0];
  var f2Comun = f2Data.filter(function(m) { return String(m.id || '').indexOf('mis_ancestral') !== 0; })[0];
  check('F-5: el shape de las misiones comunes NO cambia con el acceso (mismo payload)',
    !!f1Comun && !!f2Comun && claves(f1Comun) === claves(f2Comun), [claves(f1Comun), claves(f2Comun)]);
  check('F-6: las 4 nuevas traen el MISMO shape que las comunes (sin campo nuevo)',
    anc2.length === 4 && claves(anc2[0]) === claves(f2Comun), [claves(anc2[0]), claves(f2Comun)]);
  check('F-7: el filtro usa el flag permanente del set en el catalogo del servidor',
    !!(INTER.tieneAccesoSet({ sets_acceso: yaPosee }, SET_SLUG) === true
    && INTER.tieneAccesoSet({}, SET_SLUG) === false
    && INTER.tieneAccesoSet(null, SET_SLUG) === false));

  instalarMock(mockMisiones({}, 5));
  await getUsu({ tipo: 'misiones', usuario_id: UID });
  check('F-8: sin acceso, un jugador con 5 guardados NO completa mis_ancestral_guarda (0 escrituras)',
    cuentaSql('progreso_misiones = COALESCE(progreso_misiones') === 0,
    cuentaSql('progreso_misiones = COALESCE(progreso_misiones'));

  console.log('');
  var selfBuf = fs.readFileSync(path.join(ROOT, 'scripts/smoke_065_set_ancestral.js'));
  check('SELF: smoke_065 ASCII-safe (0 bytes > 127)', contarNoAscii(selfBuf) === 0,
    contarNoAscii(selfBuf));
  check('SELF: smoke_065 con 0 backticks',
    fs.readFileSync(path.join(ROOT, 'scripts/smoke_065_set_ancestral.js'), 'utf8')
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
  console.log('FAIL - smoke 065 lanzo error: ' + (e && e.stack ? e.stack : String(e)));
  process.exit(1);
});
