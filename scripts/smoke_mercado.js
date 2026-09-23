// scripts/smoke_mercado.js
// Smoke OFFLINE (sin red, sin DB) del Mercado de Emprendedores (migracion
// 034): habilidad global Emprendedor, 3 mercados independientes por Casa,
// impuesto por Casa (Delfin 0%), ramas GET/POST y contratos estaticos.
// Carga los handlers REALES (ADR-006) api/interacciones.js en un sandbox vm
// con @neondatabase/serverless redirigido a global.__MOCKSQL__, igual que
// smoke_017/036/038.
//
// ASCII-safe (ADR-002): 0 bytes > 127, 0 backticks. CommonJS (BUG-001).
// Run: node scripts/smoke_mercado.js
'use strict';

var path = require('path');
var fs = require('fs');
var vm = require('vm');

var passed = 0;
var failed = 0;
function check(label, cond) {
  if (cond) { passed++; console.log('PASS - ' + label); }
  else { failed++; console.log('FAIL - ' + label); process.exitCode = 1; }
}
function readSrc(rel) { return fs.readFileSync(path.join(__dirname, '..', rel), 'utf8'); }
function bytesAltos(rel) {
  var b = fs.readFileSync(path.join(__dirname, '..', rel));
  var high = 0;
  for (var i = 0; i < b.length; i++) { if (b[i] > 127) high++; }
  return high;
}
function tieneBacktick(s) { return s.indexOf(String.fromCharCode(96)) !== -1; }

// --- Cargador de api/*.js en sandbox vm (patron smoke_038) -------------
function cargarApi(fileRel, exposes) {
  var fakeNeon = {
    neon: function() {
      return function(q, p) {
        return global.__MOCKSQL__ ? global.__MOCKSQL__(q, p) : Promise.resolve([]);
      };
    }
  };
  var customRequire = function(request) {
    if (request === '@neondatabase/serverless') return fakeNeon;
    return require(request);
  };
  customRequire.resolve = require.resolve;
  var sandbox = {
    module: { exports: {} }, exports: {},
    require: customRequire, console: console, process: process,
    Buffer: Buffer, setTimeout: setTimeout, clearTimeout: clearTimeout,
    fetch: function() {
      return Promise.resolve({
        ok: true, status: 200,
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
  return { sandbox: sandbox, mod: sandbox.module.exports, src: code };
}

// --- Invocacion real del handler (req/res mock) ------------------------
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

// ======================================================================
// A) HELPERS PUROS DE LA HABILIDAD
// ======================================================================
var inter = cargarApi('api/interacciones.js', [
  'MERCADO_CASAS', 'MERCADO_TIERS', 'MERCADO_NODOS',
  'calcularMercado', 'nodoMercado', 'nodoMercadoPorNivel',
  'calcularMercadoEfectivo', 'impuestoEfectivoMercado', 'slotsMercado'
]);
var mod = inter.mod;

check('A1: MERCADO_CASAS son las 3 Casas (condor/jaguar/delfin)',
  Array.isArray(mod.MERCADO_CASAS) && mod.MERCADO_CASAS.length === 3
  && mod.MERCADO_CASAS.indexOf('condor') !== -1
  && mod.MERCADO_CASAS.indexOf('jaguar') !== -1
  && mod.MERCADO_CASAS.indexOf('delfin') !== -1);

check('A2: MERCADO_TIERS = [0,100,250,450,700]',
  Array.isArray(mod.MERCADO_TIERS) && mod.MERCADO_TIERS.join(',') === '0,100,250,450,700');

check('A3: MERCADO_NODOS tiene 5 nodos con produce en nodos 3-5',
  Array.isArray(mod.MERCADO_NODOS) && mod.MERCADO_NODOS.length === 5
  && mod.MERCADO_NODOS[0].produce === false
  && mod.MERCADO_NODOS[1].produce === false
  && mod.MERCADO_NODOS[2].produce === true
  && mod.MERCADO_NODOS[3].produce === true
  && mod.MERCADO_NODOS[4].produce === true);

check('A4: calcularMercado mapea puntos a nodo 1..5',
  mod.calcularMercado(0) === 1 && mod.calcularMercado(99) === 1
  && mod.calcularMercado(100) === 2 && mod.calcularMercado(250) === 3
  && mod.calcularMercado(450) === 4 && mod.calcularMercado(700) === 5
  && mod.calcularMercado(100000) === 5);

check('A5: nodoMercado clampa y respeta nivel_jugador',
  mod.nodoMercado(1).nivel_jugador === 2
  && mod.nodoMercado(5).nivel_jugador === 30
  && mod.nodoMercado(99).nodo === 5
  && mod.nodoMercado(-3).nodo === 1);

check('A6: impuesto Delfin (base 0) es 0, NO 0.01 (piso corregido)',
  mod.impuestoEfectivoMercado(0.00, 1) === 0
  && mod.impuestoEfectivoMercado(0.00, 5) === 0);

check('A7: impuesto efectivo = max(0, base - reduccion del nodo)',
  mod.impuestoEfectivoMercado(0.02, 1) === 0.02
  && mod.impuestoEfectivoMercado(0.05, 2) === 0.04
  && mod.impuestoEfectivoMercado(0.05, 5) === 0.01
  && mod.impuestoEfectivoMercado(0.02, 5) === 0);

check('A8: slotsMercado = slots_base + slots_extra del nodo',
  mod.slotsMercado(3, 1) === 4 && mod.slotsMercado(3, 5) === 7
  && mod.slotsMercado(0, 3) === 3);

check('A9: sin piso 0.01 en el helper de impuesto',
  inter.src.indexOf('Math.max(0.01') === -1);

// Gate por nivel de jugador (nodo efectivo = min(puntos, nivel)).
check('A10: calcularMercadoEfectivo(700, 2) = 1 (puntos altos, nivel bajo manda)',
  mod.calcularMercadoEfectivo(700, 2) === 1);

check('A11: calcularMercadoEfectivo(700, 30) = 5 (ambos techos al maximo)',
  mod.calcularMercadoEfectivo(700, 30) === 5);

check('A12: calcularMercadoEfectivo(100, 30) = 2 (puntos mandan, nivel sobra)',
  mod.calcularMercadoEfectivo(100, 30) === 2);

// Borde de nodo 1->2 en nivel 5 (no en nivel 9: 9 ya alcanza el nodo 2,
// cuyo umbral de nivel_jugador es 5). Se fija el limite real del catalogo.
check('A13: nodoMercadoPorNivel(9) = 2 (umbral de nodo 2 en nivel 5)',
  mod.nodoMercadoPorNivel(9) === 2
  && mod.nodoMercadoPorNivel(4) === 1
  && mod.nodoMercadoPorNivel(5) === 2);

check('A14: nodoMercadoPorNivel(10) = 3 (umbral de nodo 3 en nivel 10)',
  mod.nodoMercadoPorNivel(10) === 3
  && mod.nodoMercadoPorNivel(20) === 4
  && mod.nodoMercadoPorNivel(30) === 5);

// ======================================================================
// B) CONTRATOS ESTATICOS DEL BACKEND
// ======================================================================
var srcInt = inter.src;
check('B1: las 3 ramas GET del mercado existen',
  srcInt.indexOf("tipo === 'mercado_config'") !== -1
  && srcInt.indexOf("tipo === 'mercado_ofertas'") !== -1
  && srcInt.indexOf("tipo === 'mercado_mi'") !== -1);

check('B2: las 4 ramas POST del mercado existen',
  srcInt.indexOf("tipo2 === 'mercado_publicar'") !== -1
  && srcInt.indexOf("tipo2 === 'mercado_comprar'") !== -1
  && srcInt.indexOf("tipo2 === 'mercado_cancelar'") !== -1
  && srcInt.indexOf("tipo2 === 'mercado_producir'") !== -1);

check('B3: autoc ompra prohibida + cross-casa + 23514->409',
  srcInt.indexOf('AUTOCOMPRA_PROHIBIDA') !== -1
  && srcInt.indexOf('CROSS_CASA_NO_PERMITIDO') !== -1
  && srcInt.indexOf("eMqX.code === '23514'") !== -1);

check('B4: la venta es UNA sentencia atomica con CTEs',
  srcInt.indexOf('WITH ok_oferta AS (') !== -1 && srcInt.indexOf('cred AS (') !== -1);

check('B5: api/interacciones.js ASCII-safe (0 bytes > 127, 0 backticks)',
  bytesAltos('api/interacciones.js') === 0 && !tieneBacktick(srcInt));

check('B6: api/usuarios.js ASCII-safe y expone mercado_puntos/nodo',
  bytesAltos('api/usuarios.js') === 0
  && readSrc('api/usuarios.js').indexOf('mercado_puntos') !== -1
  && readSrc('api/usuarios.js').indexOf('mercado_nodo') !== -1);

// ======================================================================
// C) MIGRACION 034
// ======================================================================
var mig = readSrc('db/migrations/034_mercado_emprendedores.sql');
check('C1: migracion 034 existe y es ASCII-safe',
  mig.length > 0 && bytesAltos('db/migrations/034_mercado_emprendedores.sql') === 0);

check('C2: 034 crea las 3 tablas del mercado',
  mig.indexOf('CREATE TABLE IF NOT EXISTS mercado_config') !== -1
  && mig.indexOf('CREATE TABLE IF NOT EXISTS mercado_ofertas') !== -1
  && mig.indexOf('CREATE TABLE IF NOT EXISTS mercado_ventas') !== -1);

check('C3: 034 agrega mercado_puntos a usuarios',
  mig.indexOf('ADD COLUMN IF NOT EXISTS mercado_puntos') !== -1);

check('C4: seed de normas por Casa (condor 0.02/0.25, jaguar 0.05/0.10, delfin 0.00/0.05)',
  mig.indexOf("'condor', 0.02, 0.25") !== -1
  && mig.indexOf("'jaguar', 0.05, 0.10") !== -1
  && mig.indexOf("'delfin', 0.00, 0.05") !== -1);

check('C5: 034 siembra consumibles producibles',
  mig.indexOf('prod_artesania') !== -1 && mig.indexOf('prod_cafe') !== -1
  && mig.indexOf('prod_souvenir') !== -1 && mig.indexOf("'producir'") !== -1);

check('C6: 034 auto-provisiona las 3 columnas de consumibles (seccion 4-bis)',
  mig.indexOf('ADD COLUMN IF NOT EXISTS precio_xp_base') !== -1
  && mig.indexOf('ADD COLUMN IF NOT EXISTS precio_xp_actual') !== -1
  && mig.indexOf('ADD COLUMN IF NOT EXISTS tipo_canje') !== -1);

// ======================================================================
// D) ADMIN Y FRONTEND
// ======================================================================
check('D1: api/admin.js con rama ?recurso=mercado y 4 tipos',
  readSrc('api/admin.js').indexOf("recurso === 'mercado'") !== -1
  && readSrc('api/admin.js').indexOf('mercado_config_lista') !== -1
  && readSrc('api/admin.js').indexOf('mercado_config_editar') !== -1
  && readSrc('api/admin.js').indexOf('mercado_ofertas_lista') !== -1
  && readSrc('api/admin.js').indexOf('mercado_ofertas_moderar') !== -1);

check('D2: admin.html tiene pantalla Mercado',
  readSrc('admin.html').indexOf('screen-mercado') !== -1
  && readSrc('admin.html').indexOf('cargarMercado') !== -1);

check('D3: mercado.js existe, ASCII-safe y expone window.Mercado',
  bytesAltos('mercado.js') === 0
  && readSrc('mercado.js').indexOf('window.Mercado') !== -1);

check('D4: comunidad.html cablea el tab Mercado',
  readSrc('comunidad.html').indexOf('cpanel-mercado') !== -1
  && readSrc('comunidad.html').indexOf("showCommTab('mercado')") !== -1);

check('D5: mi-perfil.html integra el Emprendedor',
  readSrc('mi-perfil.html').indexOf('Emprendedor') !== -1
  && readSrc('mi-perfil.html').indexOf('mercado') !== -1);

// ======================================================================
// E) RAMAS DEL HANDLER (mocks)
// ======================================================================
async function pruebasHandler() {
  // GET mercado_config: 3 filas.
  var cfgRows = [
    { casa: 'condor', impuesto_base_pct: '0.0200', arancel_inter_casa_pct: '0.2500', slots_base: 3, permite_cross_casa: true, permite_produccion: true, precio_min: '5', precio_max: '5000', duracion_oferta_horas: 168, activo: true },
    { casa: 'delfin', impuesto_base_pct: '0.0000', arancel_inter_casa_pct: '0.0500', slots_base: 3, permite_cross_casa: true, permite_produccion: true, precio_min: '5', precio_max: '5000', duracion_oferta_horas: 168, activo: true },
    { casa: 'jaguar', impuesto_base_pct: '0.0500', arancel_inter_casa_pct: '0.1000', slots_base: 3, permite_cross_casa: true, permite_produccion: true, precio_min: '5', precio_max: '5000', duracion_oferta_horas: 168, activo: true }
  ];
  var r1 = await invoke(mod, {
    method: 'GET', query: { tipo: 'mercado_config' },
    mock: function(q) {
      if (q.indexOf('FROM mercado_config') !== -1) return Promise.resolve(cfgRows);
      return Promise.resolve([]);
    }
  });
  check('E1: GET mercado_config -> 200 con 3 Casas',
    r1.status === 200 && r1.body && r1.body.ok === true
    && Array.isArray(r1.body.data) && r1.body.data.length === 3);

  // GET mercado_config con 42P01 -> 503 SCHEMA_NOT_MIGRATED.
  var r2 = await invoke(mod, {
    method: 'GET', query: { tipo: 'mercado_config' },
    mock: function() { var e = new Error('relation does not exist'); e.code = '42P01'; return Promise.reject(e); }
  });
  check('E2: GET mercado_config sin esquema -> 503 SCHEMA_NOT_MIGRATED',
    r2.status === 503 && r2.body && r2.body.code === 'SCHEMA_NOT_MIGRATED');

  // GET mercado_ofertas con casa invalida -> 400.
  var r3 = await invoke(mod, {
    method: 'GET', query: { tipo: 'mercado_ofertas', casa: 'inventada' },
    mock: function() { return Promise.resolve([]); }
  });
  check('E3: GET mercado_ofertas con casa invalida -> 400',
    r3.status === 400);

  // GET mercado_ofertas valida -> precio_referencia = base * (1 + (ventas - ofertas)*0.02).
  var r4 = await invoke(mod, {
    method: 'GET', query: { tipo: 'mercado_ofertas', casa: 'condor' },
    mock: function(q) {
      if (q.indexOf('FROM mercado_ofertas o') !== -1) {
        return Promise.resolve([{
          id: '00000000-0000-4000-8000-000000000001', vendedor_id: 'v1', casa: 'condor',
          consumible_id: 'c1', cantidad: 5, cantidad_restante: 5, precio_unitario: '50',
          origen: 'inventario', estado: 'activa', creado_en: '2026-01-01', expira_en: '2099-01-01',
          clave: 'prod_cafe', nombre: 'Cafe', precio_xp_base: '40', ventas_24h: 5, ofertas_activas: 1
        }]);
      }
      return Promise.resolve([]);
    }
  });
  check('E4: GET mercado_ofertas calcula precio_referencia por oferta/demanda (43.2)',
    r4.status === 200 && r4.body && Array.isArray(r4.body.data)
    && r4.body.data.length === 1 && r4.body.data[0].precio_referencia === 43.2
    && r4.body.casa === 'condor');

  // POST mercado_publicar sin sesion -> no 200.
  var r5 = await invoke(mod, {
    method: 'POST', query: { tipo: 'mercado_publicar' },
    body: { tipo: 'mercado_publicar', clave: 'prod_cafe', cantidad: 1, precio_unitario: 50 },
    mock: function() { return Promise.resolve([]); }
  });
  check('E5: POST mercado_publicar sin sesion -> rechazado (no 200)',
    r5.status !== 200 && r5.body && r5.body.ok === false);

  // POST mercado_comprar sin sesion -> no 200.
  var r6 = await invoke(mod, {
    method: 'POST', query: { tipo: 'mercado_comprar' },
    body: { tipo: 'mercado_comprar', oferta_id: '00000000-0000-4000-8000-000000000001', cantidad: 1 },
    mock: function() { return Promise.resolve([]); }
  });
  check('E6: POST mercado_comprar sin sesion -> rechazado (no 200)',
    r6.status !== 200 && r6.body && r6.body.ok === false);

  // GET mercado_mi SIN sesion -> owner-only: responde responderSesion (401)
  // e IGNORA req.query.usuario_id (leccion BUG-061).
  var r7 = await invoke(mod, {
    method: 'GET',
    query: { tipo: 'mercado_mi', usuario_id: '00000000-0000-4000-8000-000000000002' },
    mock: function() { return Promise.resolve([]); }
  });
  check('E7: GET mercado_mi sin sesion -> 401 y ok=false',
    r7.status === 401 && r7.status !== 200 && r7.body && r7.body.ok === false);

  console.log('\n=== SMOKE MERCADO ===');
  console.log('Checks: ' + (passed + failed) + ' total, ' + passed + ' PASS, ' + failed + ' FAIL');
  if (failed === 0) console.log('SMOKE MERCADO: OK');
  else console.log('SMOKE MERCADO: FAIL');
}

pruebasHandler().catch(function(e) {
  console.log('FAIL - excepcion en pruebasHandler: ' + (e && e.message));
  process.exitCode = 1;
});
