// scripts/smoke_057_consumibles_faccion.js
// Certificacion de la entrega "consumibles de faccion, nivel 4" (migracion
// 057). NO toca Neon: carga el handler REAL de api/interacciones.js en un
// sandbox vm con @neondatabase/serverless redirigido a un fake en memoria
// (global.__MOCKSQL__), mismo harness que scripts/smoke_test_consumibles_era.js
// y scripts/smoke_016_multinivel_crowdsourcing.js.
//
// Bloque T1  GET  ?tipo=consumibles      -> 8 columnas + escalera de degradacion
// Bloque T2  bloqueado/motivo_bloqueo    -> prioridad faccion > nivel > era
// Bloque T3  POST ?tipo=comprar_consumible -> orden de gates y cero cobro
// Bloque T4  limite_diario por clave     -> solo faccion; tope global 5 intacto
// Bloque T5  stock                       -> 409 STOCK_LLENO con tope 30 (1 sola declaracion)
// Bloque T6  POST ?tipo=usar_consumible  -> rama faccion atomica
// Bloque T7  consumirBonoFaccion         -> decremento condicionado + bono PLANO + ledger propio
// Bloque T8  hooks                       -> 5 puntos + sin doble conteo
// Bloque T9  RESENA_CORTA                -> 0 ocurrencias + umbral 400 sobre texto recortado
// Bloque T10 bono_faccion en la respuesta
// Bloque T11 aritmetica economica del catalogo (ROI 150)
// Bloque T12 estado real en Neon (SOLO LECTURA, opcional si no hay DATABASE_URL)
// Bloque T13 ventana estricta de faccion (1 activacion / 24 h) via vm por rango
// Bloque T14 TOCTOU del tope de stock: predicado $4 en el WHERE del cobro
//
// ASCII-safe (ADR-002), CommonJS, 0 backticks.
// Run: node scripts/smoke_057_consumibles_faccion.js
'use strict';

var fs = require('fs');
var path = require('path');
var vm = require('vm');
var childProcess = require('child_process');

var ROOT = path.join(__dirname, '..');
var API_REL = 'api/interacciones.js';
var MIG_REL = 'db/migrations/057_consumibles_faccion_nivel4.sql';

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
function info(msg) { console.log('INFO - ' + msg); }

// ---- Sandbox del api real (fake neon + registro de SQL ejecutado) ----
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

var M = cargarApi(API_REL, ['consumirBonoFaccion', 'bonoFaccionRespuesta',
  'efectoFaccionVigente', 'accionesBonoFaccion']);
var handler = M;

var apiSrc = fs.readFileSync(path.join(ROOT, API_REL), 'utf8');

// ---- rutas: [{ match, rows, thr }] evaluadas en orden sobre el TEXTO del SQL ----
function instalarMock(rutas) {
  sqlCalls = [];
  global.__MOCKSQL__ = function(q, p) {
    var texto = String(q || '');
    for (var i = 0; i < rutas.length; i++) {
      var r = rutas[i];
      if (texto.indexOf(r.match) !== -1) {
        if (r.thr) {
          var err = new Error(r.thr === true ? 'column does not exist' : String(r.thr));
          err.code = '42703';
          return Promise.reject(err);
        }
        var filas = typeof r.rows === 'function' ? r.rows(q, p) : r.rows;
        return Promise.resolve(filas === undefined ? [] : filas);
      }
    }
    return Promise.resolve([]);
  };
}

// ---- res fake minimo ----
function fakeRes() {
  return {
    _status: 0, _json: null,
    setHeader: function() { return this; },
    status: function(n) { this._status = n; return this; },
    json: function(o) { this._json = o; return this; },
    end: function() { return this; }
  };
}

function invocar(req) {
  var res = fakeRes();
  return Promise.resolve()
    .then(function() { return handler(req, res); })
    .then(function() { return res; });
}

function post(body) {
  return invocar({ method: 'POST', query: {}, body: body, headers: {} });
}
function get(query) {
  return invocar({ method: 'GET', query: query, headers: {} });
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
function tieneTodos(obj, claves) {
  if (!obj) return false;
  for (var i = 0; i < claves.length; i++) {
    if (!Object.prototype.hasOwnProperty.call(obj, claves[i])) return false;
  }
  return true;
}
function porClave(lista, clave) {
  for (var i = 0; i < (lista || []).length; i++) {
    if (lista[i] && lista[i].clave === clave) return lista[i];
  }
  return null;
}

var COLUMNAS_057 = ['faccion_requerida', 'nivel_requerido', 'cargas', 'duracion_horas',
  'bono_accion', 'bono_xp_fijo', 'limite_diario', 'icono'];

// ============================================================
// Datos de catalogo (valores REALES de la 057)
// ============================================================
var ITEM_CATALEJO = {
  clave: 'consumible_catalejo_explorador', nombre: 'Catalejo del Explorador',
  descripcion: 'x', precio_xp: '20', categoria: 'faccion', era_exclusiva: null,
  faccion_requerida: 'exploradores', nivel_requerido: 4, cargas: 2, duracion_horas: 24,
  bono_accion: 'guardado,visita', bono_xp_fijo: '15', limite_diario: 1, icono: '&#128301;'
};
var ITEM_CLASICO = {
  clave: 'prod_cafe', nombre: 'Cafe', descripcion: 'x', precio_xp: '60',
  categoria: 'general', era_exclusiva: null, faccion_requerida: null,
  nivel_requerido: null, cargas: null, duracion_horas: null, bono_accion: null,
  bono_xp_fijo: null, limite_diario: 0, icono: null
};

function mockCatalogo(extra) {
  return [
    { match: 'faccion_requerida, nivel_requerido, cargas, duracion_horas',
      rows: [ITEM_CATALEJO, ITEM_CLASICO] },
    { match: 'SELECT xp_total, nivel_max FROM usuarios',
      rows: [(extra && extra.usr) || { xp_total: 500, nivel_max: 1 }] },
    { match: 'SELECT faccion FROM usuarios',
      rows: [(extra && extra.fac !== undefined) ? { faccion: extra.fac } : { faccion: null }] }
  ];
}

async function run() {

  console.log('== T1 GET ?tipo=consumibles: 8 columnas y degradacion escalonada');
  instalarMock(mockCatalogo({ fac: 'exploradores' }));
  var t1 = await get({ tipo: 'consumibles', usuario_id: 'U1' });
  var t1Data = (t1._json && t1._json.data) || [];
  var t1Cat = porClave(t1Data, 'consumible_catalejo_explorador');
  var t1Cla = porClave(t1Data, 'prod_cafe');
  check('T1-1: 200 y data con las 2 filas', t1._status === 200 && t1Data.length === 2, t1._status);
  check('T1-2: el SELECT pide las 8 columnas nuevas',
    cuentaSql('faccion_requerida, nivel_requerido, cargas, duracion_horas') === 1
    && cuentaSql('bono_accion, bono_xp_fijo, limite_diario, icono FROM consumibles') === 1);
  check('T1-3: el item de faccion expone las 8 columnas nuevas', tieneTodos(t1Cat, COLUMNAS_057), t1Cat);
  check('T1-4: faccion/nivel/cargas/duracion normalizados',
    !!t1Cat && t1Cat.faccion_requerida === 'exploradores' && t1Cat.nivel_requerido === 4
    && t1Cat.cargas === 2 && t1Cat.duracion_horas === 24, t1Cat);
  check('T1-5: bono_accion/bono_xp_fijo/limite_diario/icono normalizados',
    !!t1Cat && t1Cat.bono_accion === 'guardado,visita' && t1Cat.bono_xp_fijo === 15
    && t1Cat.limite_diario === 1 && !!t1Cat.icono, t1Cat);
  check('T1-6: la fila clasica NO hereda bloqueo por faccion ni nivel',
    !!t1Cla && t1Cla.faccion_requerida === null && t1Cla.nivel_requerido === null
    && t1Cla.limite_diario === 0, t1Cla);
  check('T1-7: defaults de la fila clasica (cargas 1, duracion 24)',
    !!t1Cla && t1Cla.cargas === 1 && t1Cla.duracion_horas === 24, t1Cla);

  // Escalon 1: faltan las columnas de la 057 -> reintento con el contrato 018/035.
  instalarMock([
    { match: 'faccion_requerida, nivel_requerido, cargas, duracion_horas', thr: true },
    { match: 'SELECT clave, nombre, descripcion, precio_xp, categoria, era_exclusiva FROM consumibles',
      rows: [{ clave: 'pase_vip', nombre: 'Pase VIP', descripcion: '', precio_xp: '2400', categoria: 'social', era_exclusiva: 'Mito' }] },
    { match: 'SELECT xp_total, nivel_max FROM usuarios', rows: [{ xp_total: 500, nivel_max: 1 }] },
    { match: 'SELECT faccion FROM usuarios', rows: [{ faccion: 'exploradores' }] }
  ]);
  var t1b = await get({ tipo: 'consumibles', usuario_id: 'U1' });
  check('T1-8: escalon 1 (sin columnas 057) degrada a 200 con el catalogo 018/035',
    t1b._status === 200 && ((t1b._json && t1b._json.data) || []).length === 1, t1b._status);
  check('T1-9: escalon 1 consulta el SELECT previo',
    cuentaSql('SELECT clave, nombre, descripcion, precio_xp, categoria, era_exclusiva FROM consumibles') === 1);

  // Escalon 2: sin 018/035 -> catalogo minimo.
  instalarMock([
    { match: 'faccion_requerida, nivel_requerido, cargas, duracion_horas', thr: true },
    { match: 'SELECT clave, nombre, descripcion, precio_xp, categoria, era_exclusiva FROM consumibles', thr: true },
    { match: 'SELECT clave, nombre, descripcion, precio_xp FROM consumibles',
      rows: [{ clave: 'prod_cafe', nombre: 'Cafe', descripcion: '', precio_xp: '60' }] },
    { match: 'SELECT xp_total, nivel_max FROM usuarios', rows: [{ xp_total: 500, nivel_max: 1 }] },
    { match: 'SELECT faccion FROM usuarios', rows: [{ faccion: null }] }
  ]);
  var t1c = await get({ tipo: 'consumibles', usuario_id: 'U1' });
  check('T1-10: escalon 2 (sin 018/035) degrada a 200 con el catalogo minimo',
    t1c._status === 200 && ((t1c._json && t1c._json.data) || []).length === 1, t1c._status);

  console.log('');
  console.log('== T2 bloqueado / motivo_bloqueo: prioridad faccion > nivel > era');
  var mockPrio = [
    { match: 'faccion_requerida, nivel_requerido, cargas, duracion_horas', rows: [
      { clave: 'fac_ok', categoria: 'faccion', precio_xp: '20', era_exclusiva: null,
        faccion_requerida: 'exploradores', nivel_requerido: 4, limite_diario: 1 },
      { clave: 'nivel_30', categoria: 'general', precio_xp: '20', era_exclusiva: null,
        faccion_requerida: null, nivel_requerido: 30, limite_diario: 0 },
      { clave: 'era_mito', categoria: 'general', precio_xp: '20', era_exclusiva: 'Mito',
        faccion_requerida: null, nivel_requerido: null, limite_diario: 0 },
      { clave: 'libre', categoria: 'general', precio_xp: '20', era_exclusiva: null,
        faccion_requerida: null, nivel_requerido: null, limite_diario: 0 },
      { clave: 'triple', categoria: 'faccion', precio_xp: '20', era_exclusiva: 'Mito',
        faccion_requerida: 'artistas', nivel_requerido: 30, limite_diario: 1 },
      { clave: 'nivel_y_era', categoria: 'faccion', precio_xp: '20', era_exclusiva: 'Mito',
        faccion_requerida: 'exploradores', nivel_requerido: 30, limite_diario: 1 }
    ] },
    { match: 'SELECT xp_total, nivel_max FROM usuarios', rows: [{ xp_total: 500, nivel_max: 1 }] },
    { match: 'SELECT faccion FROM usuarios', rows: [{ faccion: null }] }
  ];
  instalarMock(mockPrio);
  var t2 = await get({ tipo: 'consumibles', usuario_id: 'U1' });
  var t2Data = (t2._json && t2._json.data) || [];
  check('T2-1: faccion_requerida con usuario SIN faccion -> FACCION_INSUFICIENTE',
    (porClave(t2Data, 'fac_ok') || {}).motivo_bloqueo === 'FACCION_INSUFICIENTE',
    porClave(t2Data, 'fac_ok'));
  check('T2-2: nivel_requerido 30 con nivel 1 -> NIVEL_INSUFICIENTE',
    (porClave(t2Data, 'nivel_30') || {}).motivo_bloqueo === 'NIVEL_INSUFICIENTE',
    porClave(t2Data, 'nivel_30'));
  check('T2-3: era_exclusiva Mito -> ERA_INSUFICIENTE',
    (porClave(t2Data, 'era_mito') || {}).motivo_bloqueo === 'ERA_INSUFICIENTE',
    porClave(t2Data, 'era_mito'));
  check('T2-4: fila sin requisitos -> bloqueado false y motivo null',
    (porClave(t2Data, 'libre') || {}).bloqueado === false
    && (porClave(t2Data, 'libre') || {}).motivo_bloqueo === null, porClave(t2Data, 'libre'));
  check('T2-5: faccion manda sobre nivel y era (triple requisito)',
    (porClave(t2Data, 'triple') || {}).motivo_bloqueo === 'FACCION_INSUFICIENTE',
    porClave(t2Data, 'triple'));

  instalarMock([
    { match: 'faccion_requerida, nivel_requerido, cargas, duracion_horas', rows: [
      { clave: 'nivel_y_era', categoria: 'faccion', precio_xp: '20', era_exclusiva: 'Mito',
        faccion_requerida: 'exploradores', nivel_requerido: 30, limite_diario: 1 }
    ] },
    { match: 'SELECT xp_total, nivel_max FROM usuarios', rows: [{ xp_total: 500, nivel_max: 1 }] },
    { match: 'SELECT faccion FROM usuarios', rows: [{ faccion: 'exploradores' }] }
  ]);
  var t2b = await get({ tipo: 'consumibles', usuario_id: 'U1' });
  var t2bData = (t2b._json && t2b._json.data) || [];
  check('T2-6: nivel manda sobre era (faccion correcta, nivel 1 < 30, era Mito)',
    (porClave(t2bData, 'nivel_y_era') || {}).motivo_bloqueo === 'NIVEL_INSUFICIENTE',
    porClave(t2bData, 'nivel_y_era'));

  console.log('');
  console.log('== T3 comprar_consumible: orden faccion > nivel > era y cero cobro');

  function mockCompra(cfg) {
    cfg = cfg || {};
    var item = Object.assign({
      id: 'c1', clave: 'consumible_catalejo_explorador', precio_xp: '20',
      categoria: 'faccion', era_exclusiva: null, faccion_requerida: null,
      nivel_requerido: null, limite_diario: 0
    }, cfg.item || {});
    return [
      { match: 'faccion_requerida, nivel_requerido, limite_diario FROM consumibles', rows: [item] },
      { match: 'xp_gastado_sinks, 0) AS xp_gastado_sinks',
        rows: [cfg.usr || { xp_total: '1000', xp_gastado_sinks: '0', capacidades: {}, nivel_max: 1 }] },
      { match: 'SELECT faccion FROM usuarios',
        rows: cfg.fac === undefined ? [] : [{ faccion: cfg.fac }] },
      { match: 'consumible_id=$2', rows: [{ n: cfg.limN || 0 }] },
      { match: 'FROM compra_consumibles WHERE usuario_id', rows: [{ n: cfg.globN || 0 }] },
      { match: 'UPDATE usuarios SET xp_total = xp_total - $1', rows: [{ xp_total: '980' }] }
    ];
  }

  var itemTriple = { faccion_requerida: 'exploradores', nivel_requerido: 30, era_exclusiva: 'Mito' };
  instalarMock(mockCompra({ item: itemTriple, fac: 'artistas' }));
  var t3a = await post({ tipo: 'comprar_consumible', usuario_id: 'U1', clave: 'consumible_catalejo_explorador' });
  check('T3-1: faccion incorrecta -> 403 FACCION_INSUFICIENTE',
    t3a._status === 403 && t3a._json && t3a._json.error === 'FACCION_INSUFICIENTE',
    t3a._json);
  check('T3-2: el 403 de faccion llega ANTES del gate de era (era Mito no se evalua)',
    !!(t3a._json && t3a._json.error === 'FACCION_INSUFICIENTE'
      && t3a._json.era_requerida === undefined), t3a._json);
  check('T3-3: faccion se evalua antes del cobro (0 UPDATE de xp, 0 ledger de compra)',
    cuentaSql('xp_total = xp_total - $1') === 0
    && cuentaSql('INSERT INTO compra_consumibles') === 0);

  instalarMock(mockCompra({ item: itemTriple, fac: 'exploradores' }));
  var t3b = await post({ tipo: 'comprar_consumible', usuario_id: 'U1', clave: 'consumible_catalejo_explorador' });
  check('T3-4: nivel insuficiente (con era Mito) -> 403 NIVEL_INSUFICIENTE',
    t3b._status === 403 && t3b._json && t3b._json.error === 'NIVEL_INSUFICIENTE', t3b._json);
  check('T3-5: el 403 de nivel llega ANTES del gate de era',
    !!(t3b._json && t3b._json.error === 'NIVEL_INSUFICIENTE'
      && t3b._json.era_requerida === undefined), t3b._json);
  check('T3-6: nivel se evalua antes del cobro (0 UPDATE de xp, 0 ledger de compra)',
    cuentaSql('xp_total = xp_total - $1') === 0
    && cuentaSql('INSERT INTO compra_consumibles') === 0);
  check('T3-7: el 403 de nivel devuelve nivel_requerido y un nivel_actual por debajo',
    !!(t3b._json && t3b._json.nivel_requerido === 30
      && typeof t3b._json.nivel_actual === 'number'
      && t3b._json.nivel_actual < 30), t3b._json);

  instalarMock(mockCompra({ item: { era_exclusiva: 'Mito', faccion_requerida: null, nivel_requerido: null }, fac: null }));
  var t3c = await post({ tipo: 'comprar_consumible', usuario_id: 'U1', clave: 'pase_vip' });
  check('T3-8: sin gates de faccion ni nivel, el de era sigue vivo -> 403 ERA_INSUFICIENTE',
    t3c._status === 403 && t3c._json && t3c._json.error === 'ERA_INSUFICIENTE', t3c._json);

  console.log('');
  console.log('== T4 limite_diario por clave (solo faccion) + tope global de 5');
  instalarMock(mockCompra({
    item: { categoria: 'faccion', limite_diario: 1, faccion_requerida: 'exploradores' },
    fac: 'exploradores', limN: 1, globN: 1
  }));
  var t4a = await post({ tipo: 'comprar_consumible', usuario_id: 'U1', clave: 'consumible_catalejo_explorador' });
  check('T4-1: faccion con limite_diario 1 y 1 compra en 24 h -> 409 LIMITE_DIARIO',
    t4a._status === 409 && t4a._json && t4a._json.error === 'LIMITE_DIARIO', t4a._json);
  check('T4-2: el 409 informa limite_diario y compras_24h',
    !!(t4a._json && t4a._json.limite_diario === 1 && t4a._json.compras_24h === 1), t4a._json);
  check('T4-3: el limite por clave se evalua antes del cobro',
    cuentaSql('xp_total = xp_total - $1') === 0);

  instalarMock(mockCompra({
    item: { categoria: 'social', limite_diario: 1, faccion_requerida: null },
    fac: null, limN: 9, globN: 0
  }));
  var t4b = await post({ tipo: 'comprar_consumible', usuario_id: 'U1', clave: 'prod_cafe' });
  check('T4-4: categoria distinta de faccion NO consulta el limite por clave',
    cuentaSql('consumible_id=$2') === 0);
  check('T4-5: categoria distinta de faccion ignora limite_diario (compra 200)',
    t4b._status === 200, t4b._json || t4b._status);

  instalarMock(mockCompra({
    item: { categoria: 'social', limite_diario: 0, faccion_requerida: null },
    fac: null, globN: 5
  }));
  var t4c = await post({ tipo: 'comprar_consumible', usuario_id: 'U1', clave: 'prod_cafe' });
  check('T4-6: el tope GLOBAL de 5 compras/dia sigue vivo -> 429',
    t4c._status === 429, t4c._json || t4c._status);
  check('T4-7: el 429 global trae el mensaje historico de 5 compras',
    !!(t4c._json && String(t4c._json.error || '').indexOf('5 compras por dia') !== -1), t4c._json);

  console.log('');
  console.log('== T5 stock: 409 STOCK_LLENO con tope 30');
  instalarMock(mockCompra({
    item: { categoria: 'faccion', faccion_requerida: 'exploradores', limite_diario: 1 },
    fac: 'exploradores', limN: 0, globN: 0,
    usr: { xp_total: '1000', xp_gastado_sinks: '0', nivel_max: 1,
      capacidades: { consumibles: { consumible_catalejo_explorador: 30 } } }
  }));
  var t5a = await post({ tipo: 'comprar_consumible', usuario_id: 'U1', clave: 'consumible_catalejo_explorador' });
  check('T5-1: stock 30 en faccion -> 409 STOCK_LLENO',
    t5a._status === 409 && t5a._json && t5a._json.error === 'STOCK_LLENO', t5a._json);
  check('T5-2: el 409 informa stock_actual 30 y stock_maximo 30',
    !!(t5a._json && t5a._json.stock_actual === 30 && t5a._json.stock_maximo === 30), t5a._json);
  check('T5-3: STOCK_LLENO se evalua antes del cobro', cuentaSql('xp_total = xp_total - $1') === 0);

  instalarMock(mockCompra({
    item: { categoria: 'faccion', faccion_requerida: 'exploradores', limite_diario: 1 },
    fac: 'exploradores', limN: 0, globN: 0,
    usr: { xp_total: '1000', xp_gastado_sinks: '0', nivel_max: 1,
      capacidades: { consumibles: { consumible_catalejo_explorador: 29 } } }
  }));
  var t5b = await post({ tipo: 'comprar_consumible', usuario_id: 'U1', clave: 'consumible_catalejo_explorador' });
  check('T5-4: con stock 29 la compra no bloquea (200)', t5b._status === 200, t5b._json || t5b._status);

  var declStock = apiSrc.split('ccStockTope = 30').length - 1;
  check('T5-5: la constante del tope de stock se declara UNA sola vez', declStock === 1, declStock);
  var otrosTope = apiSrc.split('stock_maximo: 30').length - 1;
  check('T5-6: no hay un 30 duplicado en la respuesta de stock', otrosTope === 0, otrosTope);

  console.log('');
  console.log('== T6 usar_consumible: rama faccion');
  var EXP_FUTURO = new Date(Date.now() + 6 * 3600000).toISOString();
  var EFECTO_VIGENTE = {
    clave: 'consumible_lupa_curador', activo_desde: EXP_FUTURO,
    expira_en: EXP_FUTURO, cargas_restantes: 3,
    bono_accion: ['media_voto'], bono_xp_fijo: 3
  };
  function mockUsar(caps, filasUpd) {
    return [
      { match: 'SELECT id, clave FROM consumibles WHERE clave=$1',
        rows: [{ id: 'c1', clave: 'consumible_catalejo_explorador' }] },
      { match: 'SELECT categoria, cargas, duracion_horas, bono_accion, bono_xp_fijo',
        rows: [{ categoria: 'faccion', cargas: 2, duracion_horas: 24,
          bono_accion: 'guardado,visita', bono_xp_fijo: '15' }] },
      { match: 'SELECT capacidades FROM usuarios', rows: [{ capacidades: caps }] },
      { match: 'UPDATE usuarios SET capacidades = ', rows: filasUpd === undefined ? [] : filasUpd }
    ];
  }

  instalarMock(mockUsar({ consumibles: { consumible_catalejo_explorador: 0 } }));
  var t6a = await post({ tipo: 'usar_consumible', usuario_id: 'U1', clave: 'consumible_catalejo_explorador' });
  check('T6-1: stock 0 en faccion -> 409 SIN_STOCK',
    t6a._status === 409 && t6a._json && t6a._json.error === 'SIN_STOCK', t6a._json);

  instalarMock(mockUsar({ consumibles: { consumible_catalejo_explorador: 2 }, consumible_efecto: EFECTO_VIGENTE }));
  var t6b = await post({ tipo: 'usar_consumible', usuario_id: 'U1', clave: 'consumible_catalejo_explorador' });
  check('T6-2: bono ya vigente -> 409 EFECTO_YA_ACTIVO',
    t6b._status === 409 && t6b._json && t6b._json.error === 'EFECTO_YA_ACTIVO', t6b._json);
  check('T6-3: el 409 devuelve el efecto vigente (clave y cargas)',
    !!(t6b._json && t6b._json.efecto && t6b._json.efecto.clave === 'consumible_lupa_curador'
      && t6b._json.efecto.cargas_restantes === 3), t6b._json);
  check('T6-4: con efecto vigente NO se descuenta stock (0 UPDATE)',
    cuentaSql('UPDATE usuarios SET capacidades = ') === 0);

  instalarMock(mockUsar({ consumibles: { consumible_catalejo_explorador: 2 } }, [{ capacidades: {} }]));
  var t6c = await post({ tipo: 'usar_consumible', usuario_id: 'U1', clave: 'consumible_catalejo_explorador' });
  check('T6-5: uso correcto -> 200', t6c._status === 200, t6c._json || t6c._status);
  check('T6-6: escritura ATOMICA: un UNICO UPDATE de usuarios',
    cuentaSql('UPDATE usuarios') === 1, cuentaSql('UPDATE usuarios'));
  var updFac = llamadaSql('UPDATE usuarios SET capacidades = ');
  check('T6-7: el UPDATE resta 1 del stock y sella el efecto en la MISMA sentencia',
    !!updFac && updFac.q.indexOf('consumible_efecto') !== -1
    && updFac.q.indexOf('- 1)') !== -1
    && updFac.q.indexOf('cargas_restantes') !== -1, updFac && updFac.q);
  check('T6-8: el UPDATE lleva WHERE condicionado al stock >= 1 (0 filas -> SIN_STOCK)',
    !!updFac && updFac.q.indexOf(">= 1") !== -1);
  check('T6-9: INSERT en consumo_consumibles con columnas reales (usuario_id, consumible_id, efecto_detalle)',
    cuentaSql('INSERT INTO consumo_consumibles (usuario_id, consumible_id, efecto_detalle)') === 1);
  check('T6-10: el efecto sellado trae clave, cargas 2, duracion 24 h y bono 15',
    !!(t6c._json && t6c._json.efecto
      && t6c._json.efecto.cargas_restantes === 2
      && t6c._json.efecto.bono_xp_fijo === 15
      && Array.isArray(t6c._json.efecto.bono_accion)
      && t6c._json.efecto.bono_accion.length === 2
      && new Date(t6c._json.efecto.expira_en).getTime() > Date.now()), t6c._json && t6c._json.efecto);

  instalarMock(mockUsar({ consumibles: { consumible_catalejo_explorador: 2 } }, []));
  var t6d = await post({ tipo: 'usar_consumible', usuario_id: 'U1', clave: 'consumible_catalejo_explorador' });
  check('T6-11: UPDATE con 0 filas (carrera) -> 409 SIN_STOCK',
    t6d._status === 409 && t6d._json && t6d._json.error === 'SIN_STOCK', t6d._json);

  console.log('');
  console.log('== T7 consumirBonoFaccion: decremento condicionado, bono PLANO y ledger propio');
  var CAPS_CON_BONO = {
    multiplicador_x2_usos: 5,
    multiplicador_xp_hasta: new Date(Date.now() + 86400000).toISOString(),
    consumible_efecto: {
      clave: 'consumible_catalejo_explorador',
      activo_desde: EXP_FUTURO, expira_en: EXP_FUTURO, cargas_restantes: 2,
      bono_accion: ['guardado', 'visita'], bono_xp_fijo: 15
    }
  };
  function sqlBono(cfg) {
    var log = [];
    var fn = function(q, p) {
      log.push({ q: String(q || ''), p: p || [] });
      var texto = String(q || '');
      if (texto.indexOf('SELECT capacidades FROM usuarios') !== -1) {
        return Promise.resolve([{ capacidades: cfg.caps }]);
      }
      if (texto.indexOf('UPDATE usuarios SET xp_total = xp_total + $3') !== -1) {
        return Promise.resolve(cfg.upd === undefined ? [{ xp_total: '1015', cargas_restantes: '1' }] : cfg.upd);
      }
      return Promise.resolve([]);
    };
    fn.log = log;
    return fn;
  }

  var sqlT7 = sqlBono({ caps: CAPS_CON_BONO });
  var rT7 = await M.consumirBonoFaccion(sqlT7, 'U1', 'guardado', { destino_id: 'd1' });
  check('T7-1: bono acreditado con xp 15', rT7.acreditado === true && rT7.xp === 15, rT7);
  check('T7-2: el bono es PLANO: x2 activo (5 usos) y x2 temporal NO lo multiplican',
    rT7.xp === 15, rT7.xp);
  check('T7-3: devuelve clave y cargas_restantes del rowcount', rT7.clave === 'consumible_catalejo_explorador'
    && rT7.cargas_restantes === 1, rT7);
  var updT7 = null;
  var insT7 = null;
  for (var k = 0; k < sqlT7.log.length; k++) {
    if (sqlT7.log[k].q.indexOf('UPDATE usuarios SET xp_total = xp_total + $3') !== -1) updT7 = sqlT7.log[k];
    if (sqlT7.log[k].q.indexOf('INSERT INTO xp_ledger') !== -1) insT7 = sqlT7.log[k];
  }
  check('T7-4: un UNICO UPDATE condicionado (no dos sentencias)',
    sqlT7.log.length === 3, sqlT7.log.length);
  check('T7-5: el UPDATE decrementa cargas_restantes y exige cargas > 0 en el WHERE',
    !!updT7 && updT7.q.indexOf('cargas_restantes}') !== -1
    && updT7.q.indexOf('- 1)') !== -1
    && updT7.q.indexOf('> 0') !== -1, updT7 && updT7.q);
  check('T7-6: asiento propio en xp_ledger con accion bono_faccion_era1',
    !!insT7 && insT7.p[1] === 'bono_faccion_era1', insT7 && insT7.p[1]);
  check('T7-7: xp_base 0 y todo el monto en bonos_planos',
    !!insT7 && Number(insT7.p[2]) === 0 && Number(insT7.p[7]) === 15, insT7 && [insT7.p[2], insT7.p[7]]);
  check('T7-8: mult_nivel = mult_stack = mult_final = 1',
    !!insT7 && Number(insT7.p[3]) === 1 && Number(insT7.p[4]) === 1 && Number(insT7.p[5]) === 1,
    insT7 && [insT7.p[3], insT7.p[4], insT7.p[5]]);
  check('T7-9: es_exento true', !!insT7 && insT7.p[9] === true, insT7 && insT7.p[9]);
  var ctxT7 = {};
  try { ctxT7 = JSON.parse(insT7.p[12]); } catch (e) { ctxT7 = {}; }
  check('T7-10: contexto con consumible_clave, accion_origen y carga_restante',
    ctxT7.consumible_clave === 'consumible_catalejo_explorador'
    && ctxT7.accion_origen === 'guardado' && ctxT7.carga_restante === 1, ctxT7);
  check('T7-11: el contexto conserva el extra del caller (destino_id)', ctxT7.destino_id === 'd1', ctxT7);
  check('T7-12: xp_final del asiento igual al bono (delta xp_total cuadra)',
    !!insT7 && Number(insT7.p[8]) === 15 && Number(updT7.p[2]) === 15, insT7 && insT7.p[8]);

  var sqlT7b = sqlBono({ caps: CAPS_CON_BONO, upd: [] });
  var rT7b = await M.consumirBonoFaccion(sqlT7b, 'U1', 'guardado', {});
  check('T7-13: rowcount 0 -> NO se acredita bono', rT7b.acreditado === false && rT7b.xp === 0, rT7b);
  check('T7-14: rowcount 0 -> NO se escribe xp_ledger',
    (function() {
      for (var i = 0; i < sqlT7b.log.length; i++) {
        if (sqlT7b.log[i].q.indexOf('INSERT INTO xp_ledger') !== -1) return false;
      }
      return true;
    })());

  var sqlT7c = sqlBono({ caps: CAPS_CON_BONO });
  var rT7c = await M.consumirBonoFaccion(sqlT7c, 'U1', 'foto', {});
  check('T7-15: accion fuera del bono_accion (foto) -> no acredita y no escribe',
    rT7c.acreditado === false && sqlT7c.log.length === 1, rT7c);

  var capsVencido = { consumible_efecto: { clave: 'x', expira_en: '2020-01-01T00:00:00.000Z',
    cargas_restantes: 3, bono_accion: ['guardado'], bono_xp_fijo: 15 } };
  var sqlT7d = sqlBono({ caps: capsVencido });
  var rT7d = await M.consumirBonoFaccion(sqlT7d, 'U1', 'guardado', {});
  check('T7-16: efecto expirado -> no acredita', rT7d.acreditado === false, rT7d);

  var iBono = apiSrc.indexOf('async function consumirBonoFaccion');
  var iResp = apiSrc.indexOf('function bonoFaccionRespuesta');
  var cuerpoBono = (iBono !== -1 && iResp > iBono) ? apiSrc.slice(iBono, iResp) : '';
  check('T7-17: el helper no pasa por calcularXpFinal', cuerpoBono.indexOf('calcularXpFinal') === -1);
  check('T7-18: el helper no aplica multiplicador de Origen ni amuleto',
    cuerpoBono.indexOf('factorOrigen') === -1 && cuerpoBono.indexOf('aplicarAmuleto') === -1
    && cuerpoBono.indexOf('mult_origen') === -1);
  check('T7-19: el helper usa el rowcount del UPDATE RETURNING',
    cuerpoBono.indexOf('if (!upd || !upd.length) return salida') !== -1);

  console.log('');
  console.log('== T8 hooks: 5 puntos que llaman al helper y no suman el bono a la accion madre');
  var accionesHook = ['guardado', 'visita', 'media_voto', 'resena', 'foto'];
  var hooksOk = [];
  accionesHook.forEach(function(acc) {
    var aguja = "consumirBonoFaccion(sql, usuarioId2, '" + acc + "'";
    hooksOk.push(apiSrc.indexOf(aguja) !== -1);
  });
  check('T8-1: existen los 5 hooks (guardado, visita, media_voto, resena, foto)',
    hooksOk.length === 5 && hooksOk.indexOf(false) === -1, hooksOk);
  var nLlamadas = apiSrc.split('consumirBonoFaccion(sql, usuarioId2,').length - 1;
  check('T8-2: el helper se llama exactamente 5 veces', nLlamadas === 5, nLlamadas);
  var nResp = apiSrc.split('bono_faccion: bonoFaccionRespuesta(').length - 1;
  check('T8-3: las 5 respuestas publican bono_faccion', nResp === 5, nResp);

  // Sin doble conteo: toda linea que mencione el bono local del hook solo puede
  // ser (a) la llamada al helper o (b) el campo bono_faccion de la respuesta.
  var lineas = apiSrc.split(/\r?\n/);
  var malas = [];
  for (var li = 0; li < lineas.length; li++) {
    if (lineas[li].indexOf('bonoFac') === -1) continue;
    var esLlamada = lineas[li].indexOf('consumirBonoFaccion(') !== -1;
    var esCampo = lineas[li].indexOf('bono_faccion: bonoFaccionRespuesta(') !== -1;
    var esDeclaracion = /\bvar\s+bonoFac[A-Za-z]*\s*=\s*await\s+consumirBonoFaccion\(/.test(lineas[li]);
    // Rama que no aplica el bono: se inicializa a null y el hook la rellena.
    var esNulo = /\bvar\s+bonoFac[A-Za-z]*\s*=\s*null\s*;/.test(lineas[li]);
    var esDefinicion = lineas[li].indexOf('function bonoFaccionRespuesta') !== -1;
    if (!esLlamada && !esCampo && !esDeclaracion && !esNulo && !esDefinicion) {
      malas.push((li + 1) + ': ' + lineas[li].trim());
    }
  }
  check('T8-4: ninguna linea suma el bono a xp/xp_final de la accion madre',
    malas.length === 0, malas);

  var sumaBono = /xp[A-Za-z]*\s*\+\s*bonoFac/.test(apiSrc);
  check('T8-5: no existe aritmetica xp + bonoFac en el archivo', sumaBono === false);

  // El hook va DESPUES del ledger de la accion madre (la madre ya cerro su cifra).
  var hookGuardado = apiSrc.indexOf("consumirBonoFaccion(sql, usuarioId2, 'guardado'");
  var madreGuardado = apiSrc.indexOf("accion: 'guardado'");
  check('T8-6: en guardado el hook va despues del asiento madre de la accion',
    madreGuardado !== -1 && hookGuardado > madreGuardado, [madreGuardado, hookGuardado]);
  var hookVisita = apiSrc.indexOf("consumirBonoFaccion(sql, usuarioId2, 'visita'");
  var madreVisita = apiSrc.lastIndexOf("accion: 'visita'", hookVisita);
  check('T8-7: en visita el hook va despues del asiento madre de la accion',
    madreVisita !== -1 && hookVisita > madreVisita, [madreVisita, hookVisita]);

  console.log('');
  console.log('== T9 RESENA_CORTA retirado y umbral de 400 sobre el texto recortado');
  // Universo del barrido = CODIGO DE PRODUCTO, no prosa. Se excluye el directorio de
  // gobernanza "exploraco desarrollo" y todo fichero .md porque los .md normativos
  // citan el retiro a proposito (TSK-241, ADR-106, NEXT, BLUEPRINT, PROJECT): los .md
  // normativos citan el retiro; el check vigila codigo, no prosa. El alcance se
  // mantiene amplio a proposito (api, scripts, db, public si existe y los *.html/*.js/
  // *.json de la raiz) para seguir cazando una reintroduccion del 422 en api/, en
  // mi-perfil.html o en cualquier script.
  var DIR_GOBIERNO = path.join(ROOT, 'exploraco desarrollo');
  var archivosBarrido = [];
  function barrer(dir, acc) {
    var entradas = fs.readdirSync(dir, { withFileTypes: true });
    for (var i = 0; i < entradas.length; i++) {
      var e = entradas[i];
      var full = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (e.name === 'node_modules' || e.name === '.git' || e.name === '.vercel') continue;
        if (full === DIR_GOBIERNO) continue;
        barrer(full, acc);
      } else if (/\.(js|html|sql|json)$/.test(e.name)) {
        acc.push(full);
      }
    }
  }
  ['api', 'scripts', 'db', 'public'].forEach(function(d) {
    var full = path.join(ROOT, d);
    if (fs.existsSync(full)) barrer(full, archivosBarrido);
  });
  fs.readdirSync(ROOT, { withFileTypes: true }).forEach(function(e) {
    if (e.isFile() && /\.(html|js|json)$/.test(e.name)) archivosBarrido.push(path.join(ROOT, e.name));
  });
  var conResenaCorta = [];
  var selfAbs = path.join(ROOT, 'scripts', 'smoke_057_consumibles_faccion.js');
  for (var ai = 0; ai < archivosBarrido.length; ai++) {
    if (archivosBarrido[ai] === selfAbs) continue;
    var texto = fs.readFileSync(archivosBarrido[ai], 'utf8');
    if (texto.indexOf('RESENA_CORTA') !== -1) conResenaCorta.push(path.relative(ROOT, archivosBarrido[ai]));
  }
  check('T9-1: RESENA_CORTA tiene 0 ocurrencias en el codigo de producto (el 422 se retiro)',
    conResenaCorta.length === 0, conResenaCorta);
  var iUmbral = apiSrc.indexOf('resenaTextoPluma.length >= 400');
  check('T9-2: el umbral de 400 caracteres sigue evaluandose', iUmbral !== -1);
  var bloquePluma = apiSrc.slice(Math.max(0, iUmbral - 400), iUmbral + 10);
  check('T9-3: el umbral se mide sobre body.texto recortado (trim), no sobre el texto guardado',
    bloquePluma.indexOf('String(body.texto).trim()') !== -1, bloquePluma.slice(-200));

  console.log('');
  console.log('== T10 bono_faccion en la respuesta y helper de forma');
  var rAcred = M.bonoFaccionRespuesta({ acreditado: true, clave: 'k1', xp: 15, cargas_restantes: 2 });
  var rNull = M.bonoFaccionRespuesta({ acreditado: false, clave: null, xp: 0, cargas_restantes: null });
  check('T10-1: sin acreditar -> null', rNull === null, rNull);
  check('T10-2: acreditado -> forma {clave, xp, cargas_restantes}',
    !!rAcred && rAcred.clave === 'k1' && rAcred.xp === 15 && rAcred.cargas_restantes === 2
    && Object.keys(rAcred).length === 3, rAcred);
  check('T10-3: el helper bonoFaccionRespuesta existe en el api real',
    typeof M.bonoFaccionRespuesta === 'function');
  var camposResp = ['foto', 'media_voto', 'resena', 'guardado', 'visita'];
  var faltan = camposResp.filter(function(acc) {
    return apiSrc.indexOf("consumirBonoFaccion(sql, usuarioId2, '" + acc + "'") === -1;
  });
  check('T10-4: las 5 acciones publican el campo (una por accion)', faltan.length === 0, faltan);

  console.log('');
  console.log('== T11 aritmetica economica del catalogo (ROI 150)');
  var mig = fs.readFileSync(path.join(ROOT, MIG_REL), 'utf8');
  var migBuf = fs.readFileSync(path.join(ROOT, MIG_REL));
  var filasEsperadas = [
    { clave: 'consumible_catalejo_explorador', faccion: 'exploradores', precio: 20, cargas: 2, bono: 15, acciones: 'guardado,visita' },
    { clave: 'consumible_lupa_curador', faccion: 'curadores', precio: 10, cargas: 5, bono: 3, acciones: 'media_voto' },
    { clave: 'consumible_pluma_creador', faccion: 'creadores', precio: 20, cargas: 1, bono: 30, acciones: 'resena' },
    { clave: 'consumible_lente_artista', faccion: 'artistas', precio: 20, cargas: 3, bono: 10, acciones: 'foto' }
  ];
  filasEsperadas.forEach(function(f) {
    var i0 = mig.indexOf("('" + f.clave + "', '");
    var bloque = i0 === -1 ? '' : mig.slice(i0, i0 + 500);
    var agujaFac = "'" + f.faccion + "', 4, " + f.cargas + ', 24';
    var agujaBono = "'" + f.acciones + "', " + f.bono.toFixed(2) + ', 1';
    check('T11-' + f.clave + ': fila del catalogo con faccion, nivel 4, cargas y bono',
      bloque.indexOf(agujaFac) !== -1 && bloque.indexOf(agujaBono) !== -1, bloque.slice(0, 260));
    check('T11-' + f.clave + ': ROI 150 (cargas x bono >= 1.5 x precio)',
      f.cargas * f.bono >= 1.5 * f.precio,
      [f.cargas * f.bono, 1.5 * f.precio]);
  });
  check('T11-netos: catalejo +10, lupa +5, pluma +10, lente +10',
    (2 * 15 - 20) === 10 && (5 * 3 - 10) === 5 && (1 * 30 - 20) === 10 && (3 * 10 - 20) === 10);
  check('T11-limite: los 4 items de faccion nacen con limite_diario 1',
    (mig.split(', 1, \'&#').length - 1) === 4);
  check('T11-categoria: los 4 items son categoria faccion y era_exclusiva NULL',
    (mig.split("'faccion', NULL,").length - 1) === 4);
  check('T11-normalizacion: las filas clasicas se normalizan a limite_diario 0',
    mig.indexOf("WHERE categoria <> 'faccion'") !== -1
    && mig.indexOf('SET limite_diario = 0') !== -1);
  var migNoAscii = contarNoAscii(migBuf);
  check('T11-ascii: migracion 057 con 0 bytes > 127', migNoAscii === 0, migNoAscii);
  var migSql = sinComentarios(mig);
  check('T11-cero-destructivo: SQL ejecutable sin DELETE ni DROP',
    migSql.indexOf('DELETE') === -1 && migSql.indexOf('DROP') === -1);

  console.log('');
  console.log('== T12 estado real en Neon (SOLO LECTURA)');
  var urlNeon = process.env.DATABASE_URL || '';
  var Q_TOTAL = 'SELECT COUNT(*)::int AS n FROM consumibles';
  var Q_FACCION = "SELECT clave, faccion_requerida, nivel_requerido, limite_diario, categoria FROM consumibles WHERE categoria = 'faccion' ORDER BY faccion_requerida";
  var Q_CLASICAS = "SELECT COUNT(*)::int AS n FROM consumibles WHERE categoria <> 'faccion' AND (limite_diario <> 0 OR nivel_requerido IS NOT NULL OR faccion_requerida IS NOT NULL)";
  if (!urlNeon) {
    info('T12 NO VERIFICABLE en este entorno: sin DATABASE_URL el ejecutor '
      + 'scripts/neon_select.js corre en modo fake (0 filas) y no se puede '
      + 'afirmar el estado de Neon. Queries listas para el operador:');
    info('  (1) ' + Q_TOTAL + '  -- esperado 39');
    info('  (2) ' + Q_FACCION + '  -- esperado 4 filas, nivel 4, limite 1');
    info('  (3) ' + Q_CLASICAS + '  -- esperado 0');
  } else {
    function consultaNeon(sqlTexto) {
      try {
        var salida = childProcess.execFileSync(process.execPath,
          [path.join(ROOT, 'scripts', 'neon_select.js')],
          { cwd: ROOT, env: Object.assign({}, process.env, { NEON_QUERY: sqlTexto }),
            encoding: 'utf8', timeout: 60000 });
        var json = JSON.parse(String(salida));
        return Array.isArray(json) ? json : [];
      } catch (e) {
        info('T12 consulta fallida: ' + (e && e.message));
        return null;
      }
    }
    var nTotal = consultaNeon(Q_TOTAL);
    check('T12-1: total de consumibles en Neon = 39',
      !!nTotal && nTotal[0] && Number(nTotal[0].n) === 39, nTotal && nTotal[0]);
    var filasFac = consultaNeon(Q_FACCION);
    check('T12-2: 4 filas categoria faccion', !!filasFac && filasFac.length === 4,
      filasFac && filasFac.length);
    var facOk = !!filasFac && filasFac.length === 4 && filasFac.every(function(f) {
      return Number(f.nivel_requerido) === 4 && Number(f.limite_diario) === 1
        && f.categoria === 'faccion' && !!f.faccion_requerida;
    });
    check('T12-3: las 4 filas con nivel 4, limite_diario 1 y faccion asignada', facOk);
    var facUnicas = !!filasFac ? filasFac.map(function(f) { return f.faccion_requerida; }).sort().join(',') : '';
    check('T12-4: una fila por faccion (artistas, creadores, curadores, exploradores)',
      facUnicas === 'artistas,creadores,curadores,exploradores', facUnicas);
    var nClasicas = consultaNeon(Q_CLASICAS);
    check('T12-5: filas clasicas con limite_diario 0 y requisitos NULL = 0 incoherencias',
      !!nClasicas && nClasicas[0] && Number(nClasicas[0].n) === 0, nClasicas && nClasicas[0]);
  }

  // ============================================================
  // T13 ventana estricta de faccion (B1): extraccion por RANGO del
  // codigo real y ejecucion en vm. Ninguna copia a mano.
  // ============================================================
  console.log('');
  console.log('== T13 ventana estricta: 1 activacion por ventana de 24 h');
  function extraerFuncion(src, nombre) {
    var i = src.indexOf('function ' + nombre + '(');
    if (i === -1) return '';
    var j = src.indexOf('\n}', i);
    return j === -1 ? '' : src.slice(i, j + 2);
  }
  function extraerEntre(src, desde, hasta) {
    var i = src.indexOf(desde);
    if (i === -1) return '';
    var j = src.indexOf(hasta, i);
    return j === -1 ? '' : src.slice(i, j);
  }

  var srcVentana = extraerFuncion(apiSrc, 'ventanaFaccionAbierta');
  var srcVigente = extraerFuncion(apiSrc, 'efectoFaccionVigente');
  check('T13-0: extraidas del codigo real ventanaFaccionAbierta y efectoFaccionVigente',
    srcVentana.indexOf('expira_en') !== -1 && srcVentana.indexOf('cargas_restantes') === -1
    && srcVigente.indexOf('cargas_restantes') !== -1,
    [srcVentana.length, srcVigente.length]);
  var arena = vm.createContext({ Date: Date, isFinite: isFinite, parseInt: parseInt });
  vm.runInContext(srcVentana + '\n' + srcVigente, arena, { filename: 'predicados-faccion.js' });
  var fnVen = arena.ventanaFaccionAbierta;
  var fnVig = arena.efectoFaccionVigente;
  check('T13-0b: ambas funciones quedan invocables en el sandbox',
    typeof fnVen === 'function' && typeof fnVig === 'function',
    [typeof fnVen, typeof fnVig]);

  var ahoraMs = Date.now();
  var FUTURO = new Date(ahoraMs + 3600000).toISOString();
  var PASADO = new Date(ahoraMs - 3600000).toISOString();
  function capsConCargas(n, expira) {
    return { consumible_efecto: { clave: 'consumible_lupa_curador', activo_desde: expira,
      expira_en: expira, cargas_restantes: n, bono_accion: ['media_voto'], bono_xp_fijo: 3 } };
  }

  var t13a = fnVen(capsConCargas(0, FUTURO));
  check('T13-1 (a): ventana abierta con cargas_restantes 0 y expira_en futuro -> verdadero',
    !!t13a && t13a.clave === 'consumible_lupa_curador', t13a);
  var t13b = fnVen(capsConCargas(3, PASADO));
  check('T13-2 (b): expira_en en el pasado -> falso', !t13b, t13b);
  var t13c = [fnVen(null), fnVen({}), fnVen({ consumible_efecto: null })];
  check('T13-3 (c): sin la clave consumible_efecto -> falso (3 variantes)',
    !t13c[0] && !t13c[1] && !t13c[2], t13c);
  check('T13-3b (c): sin expira_en -> falso', !fnVen({ consumible_efecto: { clave: 'x', cargas_restantes: 2 } }));
  check('T13-3c: la ventana NO valida la clave interna del efecto (solo expira_en): ef sin clave sigue abierto',
    !!fnVen({ consumible_efecto: { expira_en: FUTURO, cargas_restantes: 3 } }));

  var t13d0 = fnVig(capsConCargas(0, FUTURO));
  check('T13-4 (d): efectoFaccionVigente con cargas 0 -> nulo (el bono NO se paga)', !t13d0, t13d0);
  var t13d1 = fnVig(capsConCargas(2, FUTURO));
  check('T13-5 (d): efectoFaccionVigente con cargas > 0 y futuro -> si paga',
    !!t13d1 && t13d1.clave === 'consumible_lupa_curador', t13d1);
  check('T13-6: los dos predicados NO son intercambiables (mismas caps, cargas 0: ventana si, vigente no)',
    !!fnVen(capsConCargas(0, FUTURO)) && !fnVig(capsConCargas(0, FUTURO)));

  var gateReuso = extraerEntre(apiSrc, '// Un solo efecto vigente a la vez', 'var ucFacCargas');
  check('T13-7 (e): el gate de reutilizacion usa ventanaFaccionAbierta(ucCaps)',
    gateReuso.indexOf('ventanaFaccionAbierta(ucCaps)') !== -1
    && gateReuso.indexOf('efectoFaccionVigente(ucCaps)') === -1, gateReuso.slice(0, 200));
  check('T13-7b (e): el gate responde 409 EFECTO_YA_ACTIVO',
    gateReuso.indexOf('409') !== -1 && gateReuso.indexOf("'EFECTO_YA_ACTIVO'") !== -1,
    gateReuso.slice(0, 200));
  check('T13-7c: una sola invocacion de ventanaFaccionAbierta en todo el api',
    apiSrc.split('ventanaFaccionAbierta(ucCaps)').length - 1 === 1,
    apiSrc.split('ventanaFaccionAbierta(ucCaps)').length - 1);

  instalarMock(mockUsar({ consumibles: { consumible_catalejo_explorador: 2 },
    consumible_efecto: capsConCargas(0, FUTURO).consumible_efecto }));
  var t13f = await post({ tipo: 'usar_consumible', usuario_id: 'U1',
    clave: 'consumible_catalejo_explorador' });
  check('T13-8 (e): runtime con cargas 0 y ventana abierta -> 409 EFECTO_YA_ACTIVO',
    t13f._status === 409 && t13f._json && t13f._json.error === 'EFECTO_YA_ACTIVO', t13f._json);
  check('T13-9: bloqueado por la ventana -> 0 UPDATE de stock (no licua el inventario)',
    cuentaSql('UPDATE usuarios SET capacidades = ') === 0,
    cuentaSql('UPDATE usuarios SET capacidades = '));

  // ============================================================
  // T14 TOCTOU del tope de stock (B2): el predicado vive en el WHERE
  // del cobro, con $4 = tope solo en faccion y NULL fuera.
  // ============================================================
  console.log('');
  console.log('== T14 TOCTOU de stock: predicado $4 en el WHERE del cobro');
  var srcTope = extraerEntre(apiSrc, 'var ccStockTope = 30;',
    '// Resta atomica + merge del inventario');
  var srcCobro = extraerEntre(apiSrc, 'var ccUpd = await sql(',
    '// 0 filas = disponible insuficiente');
  check('T14-0: extraidos por rango ccStockTope/ccEsFaccion y el UPDATE de cobro',
    srcTope.indexOf('ccStockTope = 30') !== -1 && srcTope.indexOf('ccEsFaccion') !== -1
    && srcCobro.indexOf('var ccUpd = await sql(') !== -1,
    [srcTope.length, srcCobro.length]);

  function ejecutarCobro(categoria, clave) {
    var capturado = null;
    var llamadas = 0;
    var sqlFake = function(q, p) {
      llamadas++;
      capturado = { q: String(q), p: p || [] };
      return Promise.resolve([{ xp_total: 900 }]);
    };
    var ctx = vm.createContext({
      sql: sqlFake, Promise: Promise, parseInt: parseInt, String: String,
      console: { warn: function() {}, log: function() {} },
      ccPrecio: 20, ccClave: clave, usuarioId2: 'U1', ccCategoria: categoria,
      ccCaps: { consumibles: {} }, ccXp: 1000, ccNivelAnt: 1,
      res: { status: function() { return this; }, json: function() { return this; } }
    });
    var fuente = '(async function(){' + srcTope + srcCobro
      + 'return { filas: ccUpd.length, tope: ccStockTope, es: ccEsFaccion };})()';
    return vm.runInContext(fuente, ctx, { filename: 'cobro-capturado.js' })
      .then(function(r) {
        return { sql: capturado, filas: r.filas, tope: r.tope, es: r.es, llamadas: llamadas };
      });
  }

  var facCobro = await ejecutarCobro('faccion', 'consumible_catalejo_explorador');
  var genCobro = await ejecutarCobro('general', 'prod_cafe');
  var facSql = sinComentarios(facCobro.sql ? facCobro.sql.q : '');
  var genSql = sinComentarios(genCobro.sql ? genCobro.sql.q : '');

  check('T14-1: el UPDATE de cobro contiene el predicado de stock con $4',
    facSql.indexOf('($4::int IS NULL') !== -1
    && facSql.indexOf('< $4::int') !== -1, facSql.slice(-220));
  check('T14-2: el predicado cubre las dos ramas ($4::int aparece 2 veces)',
    facSql.split('$4::int').length - 1 === 2, facSql.split('$4::int').length - 1);
  check('T14-3: la rama faccion pasa el tope real como $4',
    facCobro.sql && facCobro.sql.p.length === 4 && facCobro.sql.p[3] === 30
    && facCobro.tope === 30, facCobro.sql && facCobro.sql.p);
  check('T14-4: fuera de faccion $4 es null (predicado inerte)',
    genCobro.sql && genCobro.sql.p[3] === null && genCobro.es === false,
    genCobro.sql && genCobro.sql.p);
  check('T14-5: el caso no-faccion genera el MISMO texto SQL, con el predicado inerte',
    genSql === facSql && genSql.length > 0, [genSql.length, facSql.length]);
  var ph = facSql.match(/\$[0-9]+/g) || [];
  var phSet = {};
  ph.forEach(function(x) { phSet[x] = 1; });
  var phClaves = Object.keys(phSet).sort().join(',');
  check('T14-6: paridad exacta placeholders/parametros = 4 y sin renumerar ($1..$4)',
    phClaves === '$1,$2,$3,$4' && facCobro.sql.p.length === 4, [phClaves, ph.length]);
  check('T14-7: orden de parametros intacto (precio, clave, usuario, tope)',
    facCobro.sql.p[0] === 20 && facCobro.sql.p[1] === 'consumible_catalejo_explorador'
    && facCobro.sql.p[2] === 'U1', facCobro.sql.p);
  check('T14-8: $2 se sigue usando como clave del merge y $3 como id del WHERE',
    facSql.indexOf('jsonb_build_object($2,') !== -1 && facSql.indexOf('WHERE id=$3') !== -1,
    facSql.slice(-220));
  check('T14-9: el cobro es UNA sola sentencia (1 llamada sql), sin doble UPDATE',
    facCobro.llamadas === 1 && genCobro.llamadas === 1,
    [facCobro.llamadas, genCobro.llamadas]);

  console.log('');
  var selfRel = 'scripts/smoke_057_consumibles_faccion.js';
  var selfBuf = fs.readFileSync(path.join(ROOT, selfRel));
  check('SELF: smoke_057 ASCII-safe (0 bytes > 127)', contarNoAscii(selfBuf) === 0,
    contarNoAscii(selfBuf));
  check('SELF: smoke_057 con 0 backticks',
    fs.readFileSync(path.join(ROOT, selfRel), 'utf8').indexOf(String.fromCharCode(96)) === -1);

  console.log('');
  if (fails === 0) {
    console.log('RESULTADO: OK - ' + total + ' verificaciones pasaron.');
    process.exit(0);
  } else {
    console.log('RESULTADO: FAIL - ' + fails + ' de ' + total + ' verificaciones fallaron.');
    process.exit(1);
  }
}

run().catch(function(err) {
  console.log('FAIL - smoke 057 lanzo error: ' + (err && err.stack ? err.stack : err));
  process.exit(1);
});
