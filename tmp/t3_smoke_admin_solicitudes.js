// Smoke TEMPORAL de T3 (ADR-099) para api/admin.js recurso=solicitudes.
//  (9)  el POST espera y DEVUELVE el otorgamiento.
//  (10) el GET de la cola y el COUNT excluyen semillas.
var RUTA_NEON = require.resolve('@neondatabase/serverless');
var sqlActual = null;
require.cache[RUTA_NEON] = {
  id: RUTA_NEON, filename: RUTA_NEON, loaded: true,
  exports: { neon: function () { return sqlActual; } }
};
var handler = require('./../api/admin.js');
process.env.ADMIN_SECRET = 'secreto-smoke-t3';

var fallos = 0;
function ok(c, e, x) { if (c) console.log('PASS ' + e); else { fallos++; console.log('FAIL ' + e + (x === undefined ? '' : ' | ' + JSON.stringify(x))); } }

var consultas = [];

function driver(opciones) {
  return async function sql(texto, params) {
    var t = String(texto);
    consultas.push({ t: t, p: params });
    if (t.indexOf('SELECT COUNT(*) AS n FROM destinos') === 0) return [{ n: 3 }];
    if (t.indexOf('SELECT d.id, d.slug, d.nombre') === 0) return [{ id: 'x', slug: 's', nombre: 'n' }];
    if (t.indexOf('UPDATE destinos SET status=$1') === 0) return [{ id: 'x', slug: 's', nombre: 'n', status: 'published' }];
    return [];
  };
}

function fakeRes() {
  var r = { codigo: 200, payload: null, setHeader: function () {}, status: function (c) { r.codigo = c; return r; }, json: function (o) { r.payload = o; return r; }, end: function () { return r; } };
  return r;
}

(async function () {
  // ---- (10) GET: la cola excluye semillas ----
  sqlActual = driver({});
  consultas = [];
  var resG = fakeRes();
  await handler({
    method: 'GET',
    headers: { authorization: 'Bearer secreto-smoke-t3' },
    query: { recurso: 'solicitudes', status: 'draft' }, body: {}
  }, resG);
  var sqlLista = (consultas.find(function (c) { return c.t.indexOf('SELECT d.id, d.slug') === 0; }) || {}).t || '';
  var sqlCount = (consultas.find(function (c) { return c.t.indexOf('SELECT COUNT(*) AS n FROM destinos') === 0; }) || {}).t || '';
  ok(resG.codigo === 200 && resG.payload.ok === true, 'GET 200', resG.payload);
  ok(sqlLista.indexOf("COALESCE(d.tags->>'estado_envio', 'enviado') <> 'semilla'") !== -1,
    'G1 la cola excluye semillas', sqlLista);
  ok(sqlCount.indexOf("COALESCE(tags->>'estado_envio', 'enviado') <> 'semilla'") !== -1,
    'G2 el COUNT excluye semillas', sqlCount);
  ok(resG.payload.total === 3, 'G3 total del COUNT', resG.payload.total);

  // ---- (9) POST: devuelve el otorgamiento ----
  var llamadasFetch = [];
  global.fetch = async function (url, init) {
    llamadasFetch.push({ url: url, init: init });
    return {
      ok: true,
      json: async function () {
        return { ok: true, otorgado: true, motivo: 'otorgado', xp: 187.5, tier: 'completo' };
      }
    };
  };
  sqlActual = driver({});
  consultas = [];
  var resP = fakeRes();
  await handler({
    method: 'POST',
    headers: { authorization: 'Bearer secreto-smoke-t3' },
    query: { recurso: 'solicitudes' },
    body: { id: 'x', accion: 'aprobar' }
  }, resP);
  ok(resP.codigo === 200 && resP.payload.ok === true, 'POST 200', resP.payload);
  ok(llamadasFetch.length === 1, 'P1 se disparo el otorgar 1 vez', llamadasFetch.length);
  var ot = resP.payload.otorgamiento || {};
  ok(ot.otorgado === true && ot.xp === 187.5 && ot.tier === 'completo' && ot.motivo === 'otorgado',
    'P2 el POST devuelve { otorgado, xp, tier, motivo }', ot);

  // fallo del otorgar: motivo_otorgar, no excepcion silenciosa
  global.fetch = async function () { return { ok: false, json: async function () { return { ok: false, error: 'XP no acreditado' }; } }; };
  var resP2 = fakeRes();
  await handler({
    method: 'POST',
    headers: { authorization: 'Bearer secreto-smoke-t3' },
    query: { recurso: 'solicitudes' },
    body: { id: 'x', accion: 'aprobar' }
  }, resP2);
  var ot2 = resP2.payload.otorgamiento || {};
  ok(ot2.otorgado === false && ot2.motivo === 'XP no acreditado',
    'P3 el fallo del otorgar se reporta a la UI', ot2);

  // accion distinta de aprobar: otorgamiento null
  var resP3 = fakeRes();
  await handler({
    method: 'POST',
    headers: { authorization: 'Bearer secreto-smoke-t3' },
    query: { recurso: 'solicitudes' },
    body: { id: 'x', accion: 'rechazar' }
  }, resP3);
  ok(resP3.payload.otorgamiento === null, 'P4 sin aprobacion -> otorgamiento null', resP3.payload.otorgamiento);

  console.log(fallos === 0 ? 'RESULTADO: OK' : 'RESULTADO: ' + fallos + ' FALLOS');
  process.exit(fallos === 0 ? 0 : 1);
})().catch(function (e) { console.error('EXCEPCION: ' + (e && e.stack || e)); process.exit(1); });
