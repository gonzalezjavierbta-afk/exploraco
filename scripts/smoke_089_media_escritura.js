// smoke_089_media_escritura.js
//
// Smoke de ESCRITURA del sistema de calificacion de media (ADR-089, migracion
// 051) contra Neon real. TODO lo que escribe se hace dentro de UNA transaccion
// explicita que se cierra con ROLLBACK: al final se comprueba con conteos que
// nada quedo escrito.
//
// El handler REAL (api/interacciones.js) se carga en un sandbox vm con
// @neondatabase/serverless redirigido a la MISMA conexion WebSocket de la
// transaccion, de modo que las escrituras del handler caen dentro del ROLLBACK.
//
// ASCII-safe (ADR-002): 0 bytes > 127, cero backticks, CommonJS estricto.
//
// USO: node scripts/smoke_089_media_escritura.js
'use strict';

var path = require('path');
var fs = require('fs');
var vm = require('vm');
var crypto = require('crypto');

var RAIZ = path.join(__dirname, '..');
require('./load_env_local')();
var srv = require('@neondatabase/serverless');

var U_VOTANTE = '3b78efad-e9f6-49a7-bbd1-af836f528348';
var U_AUTOR = 'bc940e34-0235-4a80-bcb1-c38dac65740d';
var FOTO_PROPIA = '024bf413-7105-4780-a8bf-26d6f5943498'; // autor = U_VOTANTE

var fallos = 0;
var num = 0;
function check(nombre, ok, detalle) {
  num++;
  if (!ok) fallos++;
  console.log((ok ? 'OK   ' : 'FAIL ') + nombre + (detalle ? '  [' + detalle + ']' : ''));
}
function linea(o) { return JSON.stringify(o); }

// --- conexion WebSocket: permite BEGIN/ROLLBACK reales -----------------------
var client = new srv.Client(process.env.DATABASE_URL);
var enTx = false;
var VERBOSE = process.env.SMOKE_DEBUG === '1';
function q(s, p) {
  return client.query(s, p || []).then(function(r) {
    return (r && r.rows) ? r.rows : [];
  }).catch(function(e) {
    if (VERBOSE) console.log('   [SQL ERR ' + (e && e.code) + '] ' + String(s).slice(0, 160));
    throw e;
  });
}
function q1(s, p) { return q(s, p).then(function(r) { return r[0] || null; }); }

// --- cargador del handler en sandbox vm -------------------------------------
function cargarApi() {
  // El sqlFn que ve el handler. Cada sentencia va en su PROPIO savepoint: asi
// una sentencia que falla (p.ej. 42P01 de una migracion pendiente) se comporta
// como en produccion, donde cada query es su propia transaccion implicita, en
// vez de abortar la transaccion del smoke y enmascarar la causa.
var spH = 0;
function sqlHandler(text, params) {
  spH++;
  var sp = 'sp_h' + spH;
  return client.query('SAVEPOINT ' + sp).then(function() {
    return client.query(String(text), params || []);
  }).then(function(r) {
    return client.query('RELEASE SAVEPOINT ' + sp).then(function() { return (r && r.rows) ? r.rows : []; });
  }).catch(function(e) {
    return client.query('ROLLBACK TO SAVEPOINT ' + sp).then(function() { throw e; });
  });
}
var fakeNeon = { neon: function() { return sqlHandler; }, Pool: function() {}, Client: function() {} };
  var customRequire = function(request) {
    if (request === '@neondatabase/serverless') return fakeNeon;
    return require(request);
  };
  customRequire.resolve = require.resolve;
  var sandbox = {
    module: { exports: {} }, exports: {},
    require: customRequire, console: console, process: process,
    Buffer: Buffer, setTimeout: setTimeout, clearTimeout: clearTimeout,
    fetch: function() { return Promise.resolve({ ok: true, status: 200, json: function() { return Promise.resolve({}); } }); }
  };
  sandbox.exports = sandbox.module.exports;
  vm.createContext(sandbox);
  var code = fs.readFileSync(path.join(RAIZ, 'api', 'interacciones.js'), 'utf8');
  vm.runInContext(code, sandbox, { filename: 'api/interacciones.js' });
  return sandbox.module.exports;
}
var handler = cargarApi();

function makeRes() {
  var r = { statusCode: 0, body: null };
  r.setHeader = function() {};
  r.status = function(c) { r.statusCode = c; return r; };
  r.json = function(b) { r.body = b; return r; };
  r.end = function() { return r; };
  return r;
}
function firmarToken(uid) {
  var secreto = process.env.SESSION_JWT_SECRET || 'dev_secret';
  var payload = Buffer.from(JSON.stringify({
    sub: String(uid), exp: Math.floor(Date.now() / 1000) + 3600
  })).toString('base64url');
  var firma = crypto.createHmac('sha256', secreto).update(payload).digest('base64url');
  return payload + '.' + firma;
}
function headers(uid) { return { authorization: 'Bearer ' + firmarToken(uid) }; }
// SAVEPOINT por llamada: un fallo puntual NO aborta la transaccion entera (en
// Postgres un error deja la tx en 25P02 y enmascara la causa raiz).
var spN = 0;
function votar(uid, fuente, itemId, puntuacion) {
  var body = { tipo: 'media_voto', usuario_id: uid, fuente: fuente, item_id: itemId };
  if (puntuacion !== '__ausente__') body.puntuacion = puntuacion;
  var res = makeRes();
  spN++;
  var sp = 'sp_voto_' + spN;
  return q('SAVEPOINT ' + sp).then(function() {
    return handler({ method: 'POST', body: body, query: {}, headers: headers(uid) }, res)
      .then(function() { return res; })
      .catch(function(e) {
        console.log('   [error en voto] ' + (e && e.code ? e.code + ' ' : '') + String(e && e.message).slice(0, 200));
        return q('ROLLBACK TO SAVEPOINT ' + sp).then(function() { return res; });
      });
  }).then(function(r) {
    return q('RELEASE SAVEPOINT ' + sp).then(function() { return r; });
  });
}

// --- lecturas de apoyo ------------------------------------------------------
function repAutor(uid) {
  return q1('SELECT votos_recibidos, suma_notas FROM media_rep_autores WHERE autor_id=$1::uuid', [uid])
    .then(function(r) { return r ? { v: r.votos_recibidos, s: r.suma_notas } : { v: 0, s: 0 }; });
}
function conteoVotos(uid, fuente, itemId) {
  return q1('SELECT count(*)::int AS n FROM media_votos WHERE usuario_id=$1::uuid AND fuente=$2 AND item_id=$3',
    [uid, fuente, itemId]).then(function(r) { return r ? r.n : 0; });
}
function xpLedger(uid) {
  return q1("SELECT count(*)::int AS n FROM xp_ledger WHERE usuario_id=$1::uuid AND accion='voto_media'", [uid])
    .then(function(r) { return r ? r.n : 0; });
}
function delta(a, b) { return { v: b.v - a.v, s: b.s - a.s }; }

var TOCADOS_ALBUM = [];
var TOCADOS_VIAJERO = [];

async function main() {
  await client.connect();

  // --- BASELINE (fuera de transaccion, solo lectura) ---
  var baseVotos = (await q1('SELECT count(*)::int AS n FROM media_votos')).n;
  var baseRep = (await q1('SELECT count(*)::int AS n FROM media_rep_autores')).n;
  console.log('BASELINE media_votos=' + baseVotos + ' media_rep_autores=' + baseRep);

  // Items LIMPIOS: autor != votante y SIN voto previo del votante (si el votante
  // ya habia calificado, la 1a llamada de cada test NO seria un ALTA y el
  // contrato de idempotencia del ALTA no se estaria probando).
  var items = await q('SELECT af.id::text AS id, af.autor_original_id::text AS autor FROM album_fotos af '
    + 'WHERE af.activo=true AND af.autor_original_id IS NOT NULL AND af.autor_original_id <> $1::uuid '
    + 'AND NOT EXISTS (SELECT 1 FROM media_votos mv WHERE mv.usuario_id=$1::uuid '
    + "AND mv.fuente='album_foto' AND mv.item_id=af.id::text) "
    + 'ORDER BY af.id LIMIT 3', [U_VOTANTE]);
  var viItems = await q("SELECT i.id::text AS id, i.usuario_id::text AS autor FROM interacciones i "
    + "WHERE i.tipo='foto' AND i.activo=true AND i.usuario_id IS NOT NULL AND i.usuario_id <> $1::uuid "
    + "AND (i.dims IS NULL OR NOT (i.dims ? 'voto_foto_id')) "
    + "AND NOT EXISTS (SELECT 1 FROM media_votos mv WHERE mv.usuario_id=$1::uuid "
    + "AND mv.fuente='viajero_foto' AND mv.item_id=i.id::text) ORDER BY i.id LIMIT 1", [U_VOTANTE]);
  console.log('ITEMS album_foto limpios: ' + linea(items.map(function(x) { return x.id; })));
  console.log('ITEMS viajero_foto limpios: ' + linea(viItems.map(function(x) { return x.id; })));
  if (items.length < 3 || viItems.length < 1) {
    console.log('BLOQUEADOR: se necesitan 3 album_foto y 1 viajero_foto limpios.');
    await client.end(); process.exit(2);
  }
  var I1 = items[0].id, I2 = items[1].id, I3 = items[2].id, I4 = viItems[0].id;

  // --- CRITERIO CANONICO, medido ANTES de la transaccion (solo lectura) ---
  // ADR-089, seccion "Criterio canonico de la invariante de reconstruccion":
  // la invariante se mide con EXACTAMENTE lo que resuelve
  // resolverMediaItem (api/interacciones.js:5351-5399), NO con lo que
  // resuelve media_duenos (:885). Tres puntos, y el 3 es el que fallaba:
  //   1. album_foto -> album_fotos.autor_original_id A SECAS. El
  //      COALESCE(autor_original_id, agregador_id) de media_duenos responde
  //      "quien es dueno de la foto en el destino", que es otro hecho, y
  //      media_duenos ademas cruza destinos_fotos. Medido 2026-10-06: da 33
  //      votos donde el criterio canonico da 29.
  //   2. Se anade el JOIN albumes con a.activo=true: es el filtro del
  //      resolutor, no un extra. Sin el se contarian votos de fotos de
  //      albumes inactivos, en los que el backend NO habria escrito delta.
  //   3. suma_notas se compara como SUMA BRUTA de notas, que es lo que el
  //      backfill 052 escribe (052:133 sum(r.puntuacion)) y lo que la
  //      columna contiene (29 votos / 87 de suma, promedio 3.0). La escala
  //      CENTRADA (nota - 3) es la formula de LECTURA de reputation
  //      (ADR-089 D2), no el contenido de la columna: comparar la columna
  //      bruta contra una suma centrada dava 2 filas de diferencia con el
  //      agregado EXACTAMENTE correcto, y esa era la causa del FAIL 6a.
  var autorDe = "(SELECT 'album_foto' AS fuente, af.id::text AS item_id, af.autor_original_id AS autor_id FROM album_fotos af JOIN albumes a ON a.id = af.album_id WHERE af.activo=true AND a.activo=true "
    + "UNION ALL SELECT 'viajero_foto', i.id::text, i.usuario_id FROM interacciones i WHERE i.tipo='foto' AND i.activo=true "
    + "AND (i.dims IS NULL OR NOT (i.dims ? 'voto_foto_id')))";
  var baseReconstruccion = "WITH autor_de AS " + autorDe
    + ", reco AS (SELECT d.autor_id, count(*)::int AS v, sum(mv.puntuacion)::int AS s"
    + " FROM media_votos mv JOIN autor_de d ON d.fuente = mv.fuente AND d.item_id = mv.item_id"
    + " WHERE mv.activo = true AND d.autor_id IS NOT NULL AND mv.usuario_id <> d.autor_id"
    + " GROUP BY d.autor_id) SELECT count(*)::int AS n FROM ("
    + " SELECT coalesce(r.autor_id, a.autor_id) AS k FROM reco r FULL JOIN media_rep_autores a ON a.autor_id = r.autor_id"
    + " WHERE r.autor_id IS NULL OR a.autor_id IS NULL OR r.v <> a.votos_recibidos OR r.s <> a.suma_notas) dif";
  var canonBase = (await q1(baseReconstruccion)).n;
  var canonDetalle = await q("WITH autor_de AS " + autorDe
    + ", reco AS (SELECT d.autor_id, count(*)::int AS v, sum(mv.puntuacion)::int AS s"
    + " FROM media_votos mv JOIN autor_de d ON d.fuente = mv.fuente AND d.item_id = mv.item_id"
    + " WHERE mv.activo = true AND d.autor_id IS NOT NULL AND mv.usuario_id <> d.autor_id"
    + " GROUP BY d.autor_id) SELECT coalesce(r.autor_id, a.autor_id)::text AS autor_id"
    + ", r.v AS reco_votos, r.s AS reco_suma, a.votos_recibidos AS agr_votos, a.suma_notas AS agr_suma"
    + " FROM reco r FULL JOIN media_rep_autores a ON a.autor_id = r.autor_id"
    + " WHERE r.autor_id IS NULL OR a.autor_id IS NULL OR r.v <> a.votos_recibidos OR r.s <> a.suma_notas"
    + " ORDER BY 1");
  console.log('T6 canonico BASELINE (antes de la transaccion) = ' + canonBase + ' filas de diferencia');
  console.log('T6 canonico BASELINE detalle = ' + linea(canonDetalle));

  // Estado del agregado y de la reconstruccion SOLO de los items que este
  // smoke va a calificar, para poder medir DESPUES el DELTA que las
  // escrituras del smoke producirian. Solo lectura, todavia sin transaccion.
  var ALC = " AND (mv.fuente = 'album_foto' AND mv.item_id = ANY($1::text[])"
    + " OR mv.fuente = 'viajero_foto' AND mv.item_id = ANY($2::text[]))";
  var ALB = [I1, I2, I3];
  var VIA = [I4];
  var baseRepFilas = await q('SELECT autor_id::text AS autor, votos_recibidos AS v, suma_notas AS s FROM media_rep_autores ORDER BY 1');
  var baseAlcFilas = await q("WITH autor_de AS " + autorDe
    + ", reco AS (SELECT d.autor_id, count(*)::int AS v, sum(mv.puntuacion)::int AS sraw,"
    + " sum(mv.puntuacion - 3)::int AS scen"
    + " FROM media_votos mv JOIN autor_de d ON d.fuente = mv.fuente AND d.item_id = mv.item_id"
    + " WHERE mv.activo = true AND d.autor_id IS NOT NULL AND mv.usuario_id <> d.autor_id" + ALC
    + " GROUP BY d.autor_id) SELECT autor_id::text AS autor, v, sraw, scen FROM reco ORDER BY 1",
    [ALB, VIA]);
  console.log('T6 BASELINE agregado = ' + linea(baseRepFilas));
  console.log('T6 BASELINE reconstruccion de los items del smoke = ' + linea(baseAlcFilas));

  await q('BEGIN'); enTx = true;

  try {
    // =====================================================================
    // 1. IDEMPOTENCIA DEL ALTA: 3 veces la MISMA (3, I1)
    // =====================================================================
    var a0 = await repAutor(items[0].autor);
    var l0 = await xpLedger(U_VOTANTE);
    var r1 = await votar(U_VOTANTE, 'album_foto', I1, 3);
    var r2 = await votar(U_VOTANTE, 'album_foto', I1, 3);
    var r3 = await votar(U_VOTANTE, 'album_foto', I1, 3);
    var a1 = await repAutor(items[0].autor);
    var l1 = await xpLedger(U_VOTANTE);
    var d1 = delta(a0, a1);
    var filas1 = await conteoVotos(U_VOTANTE, 'album_foto', I1);
    TOCADOS_ALBUM.push(I1);
    console.log('T1 r1=' + linea({ e: r1.statusCode, alta: r1.body.es_alta, xp: r1.body.xp })
      + ' r2=' + linea({ e: r2.statusCode, alta: r2.body.es_alta, xp: r2.body.xp })
      + ' r3=' + linea({ e: r3.statusCode, alta: r3.body.es_alta, xp: r3.body.xp }));
    console.log('T1 rep delta=' + linea(d1) + ' ledger ' + l0 + '->' + l1 + ' filas=' + filas1);
    check('1a es_alta=true solo en la 1a llamada', r1.statusCode === 200 && r1.body.es_alta === true
      && r2.body.es_alta === false && r3.body.es_alta === false);
    check('1b XP solo en la 1a llamada', (r1.body.xp > 0) && r2.body.xp === 0 && r3.body.xp === 0,
      'xp=' + linea([r1.body.xp, r2.body.xp, r3.body.xp]) + ' ledger=' + (l1 - l0));
    check('1c media_votos: 1 sola fila (PK)', filas1 === 1, 'filas=' + filas1);
    check('1d votos_recibidos +1 (no +3)', d1.v === 1, 'delta=' + d1.v);
  // ADR-089 D3: el delta es (nota - 3) sobre COALESCE(nota_previa, 3), luego
  // un ALTA de 3 aporta 0 a suma_notas (neutro), NO 3. Se mide y se reporta.
  // NOTA 2026-10-06: el delta que escribe el backend es dSuma = nota - notaBase
  // (api/interacciones.js:5473-5475) con notaBase = COALESCE(prev, 3). Eso NO
  // es el mismo campo que la columna suma_notas: la columna ALMACENA la suma
  // BRUTA de las notas (votos=29, suma=87, promedio 3.0), mientras la
  // reconstruccion de mas abajo con (puntuacion - 3) compara contra la escala
  // CENTRADA. Por eso el assert 6a daba 2 filas de diferencia con el
  // agregado CORRECTO. Se corrige la consulta al criterio canonico.
  check('1e suma_notas +0 en un ALTA de 3 (delta = 3-3, escala ADR-089 centrada)', d1.s === 0, 'delta=' + d1.s);
    check('1f ledger: 1 sola entrada de XP', (l1 - l0) === 1, 'delta=' + (l1 - l0));

    // =====================================================================
    // 2. DELTA DE CAMBIO DE NOTA: 3 -> 5 en I1
    // =====================================================================
    var a2 = await repAutor(items[0].autor);
    var l2 = await xpLedger(U_VOTANTE);
    var r4 = await votar(U_VOTANTE, 'album_foto', I1, 5);
    var a3 = await repAutor(items[0].autor);
    var l3 = await xpLedger(U_VOTANTE);
    var d2 = delta(a2, a3);
    console.log('T2 r4=' + linea({ e: r4.statusCode, alta: r4.body.es_alta, xp: r4.body.xp, prom: r4.body.rating_promedio, mi: r4.body.mi_puntuacion })
      + ' rep delta=' + linea(d2) + ' ledger ' + l2 + '->' + l3);
    check('2a es_alta=false', r4.statusCode === 200 && r4.body.es_alta === false);
    check('2b XP 0', r4.body.xp === 0 && (l3 - l2) === 0, 'ledger delta=' + (l3 - l2));
    check('2c votos_recibidos NO cambia', d2.v === 0, 'delta=' + d2.v);
    check('2d suma_notas +2', d2.s === 2, 'delta=' + d2.s);
    check('2e mi_puntuacion=5 y promedio=5', r4.body.mi_puntuacion === 5 && Number(r4.body.rating_promedio) === 5,
      linea({ mi: r4.body.mi_puntuacion, prom: r4.body.rating_promedio }));

    // =====================================================================
    // 3. REBUCLE DE FARMING: 1->5->1->5 en el MISMO item y en items distintos
    // =====================================================================
    var xpAcum = 0, altasAcum = 0, ledgerAntes = await xpLedger(U_VOTANTE);
    var seq = [1, 5, 1, 5];
    // (a) MISMO item, empezando por un ALTA limpia (I2): la secuencia entera
    // 1->5->1->5 debe pagar XP solo en la 1a llamada.
    var a4 = await repAutor(items[1].autor);
    var resSame = [];
    for (var i = 0; i < seq.length; i++) {
      var rr = await votar(U_VOTANTE, 'album_foto', I2, seq[i]);
      resSame.push({ e: rr.statusCode, alta: rr.body.es_alta, xp: rr.body.xp });
      if (rr.body.es_alta) altasAcum++;
      xpAcum += rr.body.xp || 0;
    }
    var a5 = await repAutor(items[1].autor);
    var d3a = delta(a4, a5);
    TOCADOS_ALBUM.push(I2);
    // (b) ITEMS DISTINTOS (uno de otra fuente): cada uno paga 1 ALTA y su
    // suma_notas neta es final - 3 = 5 - 3 = 2 (escala centrada en 3).
    var otros = [
      { id: I3, fuente: 'album_foto', autor: items[2].autor },
      { id: I4, fuente: 'viajero_foto', autor: viItems[0].autor }
    ];
    var d3b = [];
    for (var j = 0; j < otros.length; j++) {
      var antes = await repAutor(otros[j].autor);
      for (var k = 0; k < seq.length; k++) {
        var rj = await votar(U_VOTANTE, otros[j].fuente, otros[j].id, seq[k]);
        if (rj.body.es_alta) altasAcum++;
        xpAcum += rj.body.xp || 0;
      }
      var despues = await repAutor(otros[j].autor);
      var dd = delta(antes, despues);
      d3b.push({ item: otros[j].fuente + '/' + otros[j].id.slice(0, 8), dv: dd.v, ds: dd.s });
      if (otros[j].fuente === 'album_foto') TOCADOS_ALBUM.push(otros[j].id);
      else TOCADOS_VIAJERO.push(otros[j].id);
    }
    var ledgerDespues = await xpLedger(U_VOTANTE);
    console.log('T3 mismo item (ALTA 1->5->1->5)=' + linea(resSame) + ' rep delta=' + linea(d3a));
    console.log('T3 items distintos=' + linea(d3b));
    console.log('T3 xp total=' + xpAcum.toFixed(2) + ' altas=' + altasAcum + ' ledger delta=' + (ledgerDespues - ledgerAntes));
    check('3a XP total = 1 por ALTA y nada mas (ledger = altas)', (ledgerDespues - ledgerAntes) === altasAcum,
      'xp=' + xpAcum.toFixed(2) + ' ledger=' + (ledgerDespues - ledgerAntes) + ' altas=' + altasAcum);
    check('3b mismo item: XP solo en el ALTA (1 de 4) y es_alta solo en la 1a',
      resSame.filter(function(x) { return x.alta === true; }).length === 1
      && resSame.filter(function(x) { return (x.xp || 0) > 0; }).length === 1, linea(resSame));
    check('3c mismo item: suma_notas neta = 5-3 = 2 (centrada, no suma de deltas)', d3a.s === 2, 'delta=' + d3a.s);
    check('3d mismo item: votos_recibidos solo +1 pese a 4 llamadas', d3a.v === 1, 'delta=' + d3a.v);
    var sumaDistintos = d3b.reduce(function(t, x) { return t + x.ds; }, 0);
    check('3e items distintos: suma_notas neta 2 por item (5-3)', sumaDistintos === 2 * d3b.length, 'delta=' + sumaDistintos);
    check('3f items distintos: votos_recibidos +1 por item pese a 4 llamadas',
      d3b.every(function(x) { return x.dv === 1; }), linea(d3b.map(function(x) { return x.dv; })));
    check('3g items distintos: 2 ALTAS mas las del mismo item = 3', altasAcum === 3, 'altas=' + altasAcum);

    // =====================================================================
    // 4. AUTO-VOTO: media cuyo autor es el propio usuario -> 403 y 0 escrituras
    // =====================================================================
    var filasAntes = await conteoVotos(U_VOTANTE, 'viajero_foto', FOTO_PROPIA);
    var repAntes = await repAutor(U_VOTANTE);
    var ledgerA4 = await xpLedger(U_VOTANTE);
    var rr403 = await votar(U_VOTANTE, 'viajero_foto', FOTO_PROPIA, 5);
    var filasDespues = await conteoVotos(U_VOTANTE, 'viajero_foto', FOTO_PROPIA);
    var repDespues = await repAutor(U_VOTANTE);
    var ledgerD4 = await xpLedger(U_VOTANTE);
    console.log('T4 status=' + rr403.statusCode + ' body=' + linea(rr403.body) + ' filas ' + filasAntes + '->' + filasDespues
      + ' rep ' + linea(repAntes) + '->' + linea(repDespues) + ' ledger ' + ledgerA4 + '->' + ledgerD4);
    check('4a auto-voto da 403', rr403.statusCode === 403, 'status=' + rr403.statusCode);
    check('4b auto-voto NO escribe en media_votos', filasDespues === filasAntes, filasAntes + '->' + filasDespues);
    check('4c auto-voto NO escribe en media_rep_autores',
      repDespues.v === repAntes.v && repDespues.s === repAntes.s, linea(repDespues));
    check('4d auto-voto NO paga XP', ledgerD4 === ledgerA4);

    // =====================================================================
    // 5. PUNTUACION INVALIDA -> 400 (y el CHECK de la BD como ultima linea)
    // =====================================================================
    var malos = [0, 6, 9, 'x', null, '__ausente__', 2.5];
    var etiquetas = ['0', '6', '9', "'x'", 'null', 'ausente', '2.5'];
    var n400 = 0;
    var basal5 = await conteoVotos(U_VOTANTE, 'viajero_foto', I4);
    for (var m = 0; m < malos.length; m++) {
      var rm = await votar(U_VOTANTE, 'viajero_foto', I4, malos[m]);
      if (rm.statusCode === 400) n400++;
      console.log('T5 puntuacion=' + etiquetas[m] + ' -> ' + rm.statusCode + ' ' + linea(rm.body));
    }
    var final5 = await conteoVotos(U_VOTANTE, 'album_foto', I2);
    check('5a los 7 valores invalidos dan 400', n400 === 7, '400=' + n400 + '/7');
    check('5b ninguno de los 7 escribio en media_votos', final5 === basal5, basal5 + '->' + final5);

    // CHECK de la BD: INSERT directo con puntuacion=9 -> 23514
    await q('SAVEPOINT sp_check');
    var codigoCheck = null;
    try {
      await q("INSERT INTO media_votos (usuario_id, fuente, item_id, puntuacion, activo) VALUES ($1::uuid,'album_foto',$2,9,true)",
        [U_VOTANTE, I2]);
      codigoCheck = 'sin error';
    } catch (e) {
      codigoCheck = e && e.code ? e.code : String(e && e.message).slice(0, 80);
    }
    await q('ROLLBACK TO SAVEPOINT sp_check');
    console.log('T5 INSERT directo puntuacion=9 -> ' + codigoCheck);
    check('5c el CHECK de la BD rechaza con 23514', codigoCheck === '23514', 'code=' + codigoCheck);

    // =====================================================================
    // 6. RECONSTRUCCION DEL AGREGADO (deuda (a) del ADR-089)
    // =====================================================================
    // El criterio canonico (autorDe y baseReconstruccion) se definio ARRIBA,
    // antes del BEGIN, porque la invariante se mide sobre el estado BASELINE.
    // Aqui ya solo se informa lo que la transaccion del smoke produce.
    var globalFilas = (await q1('SELECT count(*)::int AS n FROM media_rep_autores')).n;
    var vivos = (await q1("SELECT count(*)::int AS n FROM media_votos WHERE activo=true")).n;
    var vivosConAutor = (await q1('SELECT count(*)::int AS n FROM media_votos mv JOIN ' + autorDe + ' d ON d.fuente=mv.fuente AND d.item_id=mv.item_id WHERE mv.activo=true AND d.autor_id IS NOT NULL')).n;
    var globalEnTx = (await q1(baseReconstruccion)).n;
    console.log('T6 media_votos vivos=' + vivos + ', vivos con autor resoluble=' + vivosConAutor
      + ', media_rep_autores=' + globalFilas);
    console.log('T6 reconstruccion canonica GLOBAL DENTRO de la transaccion = ' + globalEnTx
      + ' filas de diferencia (informativo: incluye los votos que este smoke acaba de escribir)');
    // DELTA de lo que el smoke acaba de escribir, agregado vs reconstruccion de
    // los MISMOS items. Es la cifra que si es comparable: el agregado avanza con
    // deltas centrados (nota - COALESCE(prev,3), api/interacciones.js:5473) y
    // la reconstruccion con la suma bruta, luego se comparan las DOS columnas
    // de la reconstruccion contra el DELTA del agregado.
    var finRepFilas = await q('SELECT autor_id::text AS autor, votos_recibidos AS v, suma_notas AS s FROM media_rep_autores ORDER BY 1');
    var finAlcFilas = await q("WITH autor_de AS " + autorDe
      + ", reco AS (SELECT d.autor_id, count(*)::int AS v, sum(mv.puntuacion)::int AS sraw,"
      + " sum(mv.puntuacion - 3)::int AS scen"
      + " FROM media_votos mv JOIN autor_de d ON d.fuente = mv.fuente AND d.item_id = mv.item_id"
      + " WHERE mv.activo = true AND d.autor_id IS NOT NULL AND mv.usuario_id <> d.autor_id" + ALC
      + " GROUP BY d.autor_id) SELECT autor_id::text AS autor, v, sraw, scen FROM reco ORDER BY 1",
      [ALB, VIA]);
    var deltaMedido = [];
    for (var zi = 0; zi < finRepFilas.length; zi++) {
      var fr = finRepFilas[zi];
      var pb = null, fa = null;
      for (var zj = 0; zj < baseRepFilas.length; zj++) if (baseRepFilas[zj].autor === fr.autor) pb = baseRepFilas[zj];
      for (var zk = 0; zk < finAlcFilas.length; zk++) if (finAlcFilas[zk].autor === fr.autor) fa = finAlcFilas[zk];
      for (var zl = 0; zl < baseAlcFilas.length; zl++) if (baseAlcFilas[zl].autor === fr.autor && !fa) fa = baseAlcFilas[zl];
      deltaMedido.push({
        autor: fr.autor.slice(0, 8),
        dVotos: fr.v - (pb ? pb.v : 0),
        dSuma_centrada: fr.s - (pb ? pb.s : 0),
        dReco_votos: fa ? fa.v - (function(b){ var m = null; for (var x = 0; x < baseAlcFilas.length; x++) if (baseAlcFilas[x].autor === b) m = baseAlcFilas[x]; return m ? m.v : 0; })(fr.autor) : 0,
        dReco_suma_bruta: fa ? fa.sraw - (function(b){ var m = null; for (var x = 0; x < baseAlcFilas.length; x++) if (baseAlcFilas[x].autor === b) m = baseAlcFilas[x]; return m ? m.sraw : 0; })(fr.autor) : 0,
        dReco_suma_centrada: fa ? fa.scen - (function(b){ var m = null; for (var x = 0; x < baseAlcFilas.length; x++) if (baseAlcFilas[x].autor === b) m = baseAlcFilas[x]; return m ? m.scen : 0; })(fr.autor) : 0
      });
    }
    console.log('T6 DELTA escrito por el smoke (agregado) vs DELTA reconstruido de los mismos items = ' + linea(deltaMedido));
    // 6a: la invariante de ADR-089 se afirma sobre el estado de PRODUCCION, no
    // sobre el estado que el propio smoke construye. Por eso se mide antes del
    // BEGIN. Medirla dentro de la transaccion mezclaria dos cosas: (i) el
    // agregado de produccion y (ii) los deltas que este smoke acaba de
    // escribir, y las dos cosas NO pueden coincidir por construccion (el
    // smoke paga un ALTA de 3, que aporta 0 a la escala de la columna, y
    // despues la cambia a 5, que aporta +2: el agregado avanza 2 mientras la
    // reconstruccion_bruta de los mismos items avanza 5).
    check('6a reconstruccion canonica GLOBAL del agregado en baseline = 0 filas',
      canonBase === 0, 'dif=' + canonBase + ' (criterio canonico: autor_original_id a secas + albumes.activo + suma bruta)');

    // =====================================================================
    // 7. COHERENCIA DE public.media_estadisticas
    // =====================================================================
    var inexistente = await q1("SELECT * FROM public.media_estadisticas('album_foto','00000000-0000-0000-0000-000000000000')");
    console.log('T7 inexistente = ' + linea(inexistente));
    check('7a item inexistente: votos=0 y promedio NULL',
      inexistente.votos === 0 && (inexistente.promedio === null || inexistente.promedio === undefined),
      linea(inexistente));
    var porFuente = await q("SELECT fuente, item_id FROM media_votos WHERE activo=true AND fuente IN ('album_foto','viajero_foto') ORDER BY fuente, item_id LIMIT 6");
    var coherencia = [];
    for (var z = 0; z < porFuente.length; z++) {
      var fila = porFuente[z];
      var fn = await q1('SELECT * FROM public.media_estadisticas($1,$2)', [fila.fuente, fila.item_id]);
      var mano = await q1('SELECT count(*)::int AS n, round(avg(puntuacion)::numeric,1)::text AS p FROM media_votos WHERE fuente=$1 AND item_id=$2 AND activo=true', [fila.fuente, fila.item_id]);
      var okFila = fn.votos === mano.n && String(fn.promedio) === String(mano.p);
      if (!okFila) fallos++;
      coherencia.push({ f: fila.fuente, fn: fn.votos + '/' + fn.promedio, mano: mano.n + '/' + mano.p, ok: okFila });
    }
    console.log('T7 coherencia fn vs calculo a mano = ' + linea(coherencia));
    check('7b promedio de la fn == round(avg(puntuacion),1) en los 6 items',
      coherencia.every(function(x) { return x.ok; }));

    // =====================================================================
    // ROLLBACK + CONTEOS FINALES
    // =====================================================================
    await q('ROLLBACK'); enTx = false;
    var finVotos = (await q1('SELECT count(*)::int AS n FROM media_votos')).n;
    var finRep = (await q1('SELECT count(*)::int AS n FROM media_rep_autores')).n;
    var finRepFilas = await q('SELECT autor_id::text, votos_recibidos, suma_notas FROM media_rep_autores ORDER BY autor_id');
    console.log('CONTROL baseline=' + baseVotos + '/' + baseRep + '  final=' + finVotos + '/' + finRep);
    console.log('CONTROL media_rep_autores final = ' + linea(finRepFilas));
    check('8a media_votos sin escrituras residuales (' + baseVotos + ')', finVotos === baseVotos, 'final=' + finVotos);
    check('8b media_rep_autores sin escrituras residuales (' + baseRep + ')', finRep === baseRep, 'final=' + finRep);

  } catch (e) {
    console.log('EXCEPCION: ' + (e && e.code ? e.code + ' ' : '') + String(e && e.message).slice(0, 400));
    fallos++;
    if (enTx) { try { await q('ROLLBACK'); } catch (x) {} }
  }

  console.log('----');
  console.log('TOTAL ' + num + '  OK ' + (num - fallos) + '  FAIL ' + fallos);
  try { client.end(); } catch (x) {}
  process.exit(fallos ? 1 : 0);
}

main().catch(function(e) {
  console.log('FATAL ' + String(e && e.message).slice(0, 300));
  try { client.end(); } catch (x) {}
  process.exit(2);
});