// smoke_055_indice_unico_reclamacion.js
//
// Smoke de ESCRITURA del indice UNICO PARCIAL uq_reclamaciones_recurso_pendiente
// (migracion 055, ADR-091) contra Neon real. NO es un seed: es la PRUEBA del
// indice que la migracion declara y que nadie habia ejecutado contra la base.
//
// QUE COMPRUEBA, EN ORDEN
//   T1 el indice existe en el catalogo, es UNIQUE y su predicado es el de la 055
//   T2 un primer INSERT pendiente sobre un recurso REAL pasa
//   T3 el SEGUNDO INSERT con el MISMO (recurso_tipo, recurso_id) y estado
//      'pendiente' recibe 23505 unique_violation
//   T4 tras el rechazo sigue habiendo exactamente UNA solicitud pendiente sobre
//      ese recurso, y es la primera: el indice no borro ni sustituyo nada
//   T5 el indice es PARCIAL y no TOTAL: resuelta la primera (estado='aprobada'),
//      una nueva solicitud pendiente sobre el MISMO recurso SI entra. Esto es
//      el control anti-abuso (b) del ADR-091: una sola solicitud ABIERTA
//   T7 el ON CONFLICT ... DO NOTHING REAL de la rama POST de produccion
//      (api/interacciones.js:9919) absorbe una SEGUNDA solicitud sobre el mismo
//      recurso SIN excepcion, y el backend la mapea a 409: no es una 23505
//   T6 ROLLBACK y los conteos vuelven a su baseline: no queda basura
//
// SEGURIDAD DE LA ESCRITURA
//   TODO lo que escribe va dentro de UNA transaccion explicita que se cierra
//   con ROLLBACK, y al final se comprueba con conteos que nada quedo escrito.
//   Cada sentencia que se espera que FALLE va dentro de un SAVEPOINT: en
//   Postgres un error aborta la transaccion entera (25P02 en la siguiente), y
//   sin savepoint T4 y T5 no podrian ejecutarse.
//
// LOS IDS NO SON INVENTADOS
//   usuario_id y destino_id se LEEN de la base. La FK
//   fk_reclamaciones_solicitante y el propio camino del indice hacen que un uuid
//   falso no demostraria nada: el 23505 tiene que venir del indice, no de un id
//   que no existe.
//
// ASCII-safe (ADR-002): 0 bytes > 127, cero backticks, CommonJS estricto.
//
// USO: node scripts/smoke_055_indice_unico_reclamacion.js
// REEJECUTABLE: no deja rastro (ROLLBACK). Se puede correr las veces que sea.
// No imprime la DATABASE_URL ni el SQL enviado.
'use strict';

require('./load_env_local')();
var srv = require('@neondatabase/serverless');
var fs = require('fs');
var path = require('path');

var PRUEBA_URL = 'https://ejemplo.invalid/smoke-055.jpg';
var NOTA_1 = 'smoke-055 primer intento';
var NOTA_2 = 'smoke-055 segundo intento';
var NOTA_3 = 'smoke-055 tercer intento, previa resuelta';

var fallos = 0;
var num = 0;
function check(nombre, ok, detalle) {
  num++;
  if (!ok) fallos++;
  console.log((ok ? 'OK   ' : 'FAIL ') + nombre + (detalle ? '  [' + detalle + ']' : ''));
}
function linea(o) { return JSON.stringify(o); }

// --- conexion WebSocket: es la unica que permite BEGIN/ROLLBACK reales ---------
// Mismo patron que scripts/smoke_089_media_escritura.js (precedente del repo).
// OJO: en la version instalada de @neondatabase/serverless, Client es un cliente
// de pg-protocol, y SIN await connect() la consulta se queda encolada para
// siempre: la promesa no se resuelve, el evento se agota y el proceso sale con
// codigo 0 SIN imprimir nada. Por eso se conecta de forma explicita y se
// comprueba antes de afirmar ningun resultado.
var client = new srv.Client(process.env.DATABASE_URL);
var enTx = false;
var VERBOSE = process.env.SMOKE_DEBUG === '1';

// Salir sin perder la salida: process.exit() descarta lo que aun este en el
// buffer de stdout cuando la salida va por tuberia (que es como lo corre el
// agente y el CI). Se fuerza el vaciado antes de salir.
function salir(codigo) {
  try { client.end(); } catch (x) {}
  process.stdout.write('', function () { process.exit(codigo); });
}

function q(s, p) {
  return client.query(s, p || []).then(function (r) {
    return (r && r.rows) ? r.rows : [];
  }).catch(function (e) {
    if (VERBOSE) console.log('   [SQL ERR ' + (e && e.code) + '] ' + String(s).slice(0, 160));
    throw e;
  });
}
function q1(s, p) { return q(s, p).then(function (r) { return r[0] || null; }); }

// Ejecuta una sentencia que se espera que falle, dentro de su savepoint, y
// devuelve el codigo SQLSTATE (o null si NO fallo). Nunca propaga el error: el
// error ES el dato de la prueba.
//
// OJO con el savepoint: se revierte SOLO en el camino de error, y eso es
// deliberado. (a) revertedolo, Postgres no aborta la transaccion (sin esto la
// siguiente sentencia caeria en 25P02 y T4 no podria ejecutarse); (b) si la
// sentencia entra, la fila se QUEDA dentro de la transaccion, porque si el
// indice no existiera T4 debe medir 2 pendientes y fallar. Revvertirla con
// un rollback de mas taparia justo el defecto que se busca.
function qEnSavepoint(nombre, s, p) {
  return q('SAVEPOINT ' + nombre).then(function () {
    return client.query(s, p || []).then(function () {
      return { code: null, msg: 'sin error' };
    }).catch(function (e) {
      return q('ROLLBACK TO SAVEPOINT ' + nombre).then(function () {
        return { code: (e && e.code) ? String(e.code) : String(e && e.message).slice(0, 120), msg: '' };
      });
    });
  });
}

function conteoReclamaciones() {
  return q1("SELECT count(*)::int AS total, count(*) FILTER (WHERE estado='pendiente')::int AS pendientes FROM reclamaciones_propiedad")
    .then(function (r) { return { total: r.total, pendientes: r.pendientes }; });
}

async function main() {
  console.log('== SMOKE 055 - indice unico parcial uq_reclamaciones_recurso_pendiente');
  console.log('== TODO lo que se escribe va en transaccion y se cierra con ROLLBACK.');
  console.log('');

  // Sin credencial no hay smoke: se dice y se sale con codigo 2, sin fingir.
  if (!process.env.DATABASE_URL) {
    console.log('FAIL 0x sin DATABASE_URL en .env.local: no se ejecuta nada contra Neon.');
    salir(2);
    return;
  }
  try {
    await client.connect();
  } catch (e) {
    console.log('FAIL 0x no se pudo abrir la conexion: ' + String(e && e.message).slice(0, 200));
    salir(2);
    return;
  }

  var base = null;
  var uId = null;
  var dId = null;

  try {
    // =====================================================================
    // 0. PREVUELO: sin esto la prueba no mide el indice, mide otra cosa
    // =====================================================================
    // a) Las columnas de la 055 tienen que existir: si faltan, el 23505 del
    //    smoke no seria del indice. Se mide de forma explicita.
    var cols = null;
    var colErr = null;
    try {
      cols = await q1('SELECT es_reclamable, dueno_id, estado_reclamacion, xp_pozo_acumulado, pozo_actualizado_en FROM destinos LIMIT 1');
    } catch (e) {
      colErr = (e && e.code) ? String(e.code) : String(e && e.message).slice(0, 120);
    }
    check('0a destinos tiene las 5 columnas de la 055', cols !== null, 'codigo=' + String(colErr));
    if (cols === null) {
      console.log('ABORTA: la migracion 055 no esta aplicada; este smoke no mide el indice.');
      throw new Error('preflight 055');
    }

    // b) La tabla de la 055 tiene que existir con su FK.
    var fk = await q1("SELECT count(*)::int AS n FROM pg_constraint WHERE conrelid = 'public.reclamaciones_propiedad'::regclass AND conname = 'fk_reclamaciones_solicitante'");
    check('0b fk_reclamaciones_solicitante declarada', fk.n === 1, 'n=' + fk.n);

    // c) IDS REALES. El destino se elige RECLAMABLE y SIN solicitud pendiente,
    //    para que el T2 no choque por un motivo ajeno al indice.
    var u = await q1('SELECT id::text AS id FROM usuarios LIMIT 1');
    var d = await q1("SELECT d.id::text AS id FROM destinos d"
      + " WHERE d.es_reclamable = TRUE"
      + "   AND NOT EXISTS (SELECT 1 FROM reclamaciones_propiedad r"
      + "                    WHERE r.recurso_tipo='destino'"
      + "                      AND r.recurso_id = d.id::text"
      + "                      AND r.estado='pendiente')"
      + ' ORDER BY d.id LIMIT 1');
    check('0c hay un usuario real para la FK', !!(u && u.id), u ? 'usuario encontrado' : 'usuarios vacia');
    check('0d hay un destino real reclamable y sin pendiente', !!(d && d.id), d ? 'destino encontrado' : 'ninguno sirve');
    if (!(u && u.id) || !(d && d.id)) {
      console.log('ABORTA: sin ids reales la prueba no demuestra nada.');
      throw new Error('sin ids reales');
    }
    uId = u.id;
    dId = d.id;
    console.log('CONTROL usuario_id=' + uId);
    console.log('CONTROL destino_id=' + dId);

    base = await conteoReclamaciones();
    console.log('BASELINE reclamaciones_propiedad total=' + base.total + ' pendientes=' + base.pendientes);
    console.log('');

    // =====================================================================
    // BEGIN: a partir de aqui todo es reversible
    // =====================================================================
    await q('BEGIN'); enTx = true;
    console.log('BEGIN ejecutado.');

    // =====================================================================
    // T1. El indice, segun el catalogo: UNIQUE y PARCIAL
    // =====================================================================
    var ix = await q1("SELECT i.indisunique AS es_unique,"
      + " pg_get_expr(i.indpred, i.indrelid) AS predicado,"
      + " pg_get_indexdef(i.indexrelid) AS definicion"
      + '  FROM pg_index i'
      + '  JOIN pg_class c ON c.oid = i.indexrelid'
      + "  JOIN pg_namespace n ON n.oid = c.relnamespace"
      + " WHERE c.relname = 'uq_reclamaciones_recurso_pendiente'"
      + "   AND n.nspname = 'public'");
    check('T1a el indice uq_reclamaciones_recurso_pendiente existe', !!ix);
    if (ix) {
      console.log('T1 definicion = ' + linea(ix.definicion));
      check('T1b es UNIQUE', ix.es_unique === true, 'indisunique=' + ix.es_unique);
      check('T1c es PARCIAL por estado=pendiente',
        !!ix.predicado && String(ix.predicado).indexOf('pendiente') !== -1,
        'predicado=' + String(ix.predicado));
      check('T1d cubre (recurso_tipo, recurso_id)',
        String(ix.definicion).indexOf('recurso_tipo') !== -1 &&
        String(ix.definicion).indexOf('recurso_id') !== -1);
    }

    // =====================================================================
    // T2. Primer INSERT pendiente: TIENE que entrar
    // =====================================================================
    var ins1 = await q1('INSERT INTO reclamaciones_propiedad'
      + ' (solicitante_id, recurso_tipo, recurso_id, prueba_url, nota_solicitante, estado)'
      + ' VALUES ($1::uuid, $2, $3, $4, $5, \'pendiente\') RETURNING id::text AS id',
      [uId, 'destino', dId, PRUEBA_URL, NOTA_1]);
    check('T2 primer INSERT pendiente ACEPTADO', !!(ins1 && ins1.id), 'id=' + linea(ins1 ? ins1.id : null));

    // =====================================================================
    // T3. Segundo INSERT, MISMO (recurso_tipo, recurso_id), MISMO estado
    //     ESTE es el resultado que hay que ver de verdad.
    // =====================================================================
    var ins2 = await qEnSavepoint('sp_2',
      'INSERT INTO reclamaciones_propiedad'
      + ' (solicitante_id, recurso_tipo, recurso_id, prueba_url, nota_solicitante, estado)'
      + ' VALUES ($1::uuid, $2, $3, $4, $5, \'pendiente\') RETURNING id::text AS id',
      [uId, 'destino', dId, PRUEBA_URL, NOTA_2]);
    console.log('T3 segundo INSERT -> SQLSTATE ' + String(ins2.code));
    check('T3 el segundo INSERT recibe 23505 unique_violation', ins2.code === '23505', 'code=' + String(ins2.code));
    // T3b NO es decorativo: sin el SAVEPOINT, este SELECT seria el primer
    // fallo del 23505 y la siguiente sentencia caeria en 25P02. Que responda
    // es la prueba de que la transaccion sigue viva.
    var vivo = await q1('SELECT 1 AS vivo');
    check('T3b la transaccion sigue viva tras el 23505 (sin 25P02)', !!(vivo && vivo.vivo === 1), 'SELECT 1=' + linea(vivo));

    // =====================================================================
    // T4. La primera sigue intacta y es la UNICA pendiente del recurso
    // =====================================================================
    var pend = await q1("SELECT count(*)::int AS n FROM reclamaciones_propiedad"
      + " WHERE recurso_tipo='destino' AND recurso_id=$1 AND estado='pendiente'", [dId]);
    check('T4 queda exactamente 1 pendiente sobre el recurso', pend.n === 1, 'n=' + pend.n);
    var notaViva = await q1("SELECT nota_solicitante FROM reclamaciones_propiedad"
      + " WHERE recurso_tipo='destino' AND recurso_id=$1 AND estado='pendiente'", [dId]);
    check('T4b la que sobrevive es la PRIMERA, no la segunda',
      !!(notaViva && notaViva.nota_solicitante === NOTA_1),
      linea(notaViva ? notaViva.nota_solicitante : null));

    // =====================================================================
    // T5. PARCIAL, no TOTAL: resuelta la primera, el recurso vuelve a aceptar
    //     una solicitud pendiente. Sin esto el indice seria una reaccion en
    //     cadena y el recurso no se podria volver a reclamar jamas.
    // =====================================================================
    // RETURNING y no el conteo de filas afectadas: q() entrega .rows, y el numero
// de filas tocadas por un UPDATE no viaja ahi. Con RETURNING el resultado se
// ve en las propias filas y no depende de como nombre la libreria el conteo.
var upd = await q("UPDATE reclamaciones_propiedad SET estado='aprobada'"
      + " WHERE recurso_tipo='destino' AND recurso_id=$1 AND estado='pendiente'"
      + ' RETURNING id::text AS id', [dId]);
    check('T5a la primera solicitud se resuelve a aprobada', upd.length === 1, 'filas=' + upd.length);
    var ins3 = await q1('INSERT INTO reclamaciones_propiedad'
      + ' (solicitante_id, recurso_tipo, recurso_id, prueba_url, nota_solicitante, estado)'
      + ' VALUES ($1::uuid, $2, $3, $4, $5, \'pendiente\') RETURNING id::text AS id',
      [uId, 'destino', dId, PRUEBA_URL, NOTA_3]);
    check('T5b con la anterior resuelta, una nueva pendiente SI entra (indice PARCIAL)',
      !!(ins3 && ins3.id), 'id=' + linea(ins3 ? ins3.id : null));

    // =====================================================================
    // T7. ON CONFLICT ... DO NOTHING REAL del camino de PRODUCCION
    //     La rama POST reclamar_propiedad_solicitar (api/interacciones.js:9816)
    //     usa una CTE update+insert con ON CONFLICT ... DO NOTHING sobre el
    //     indice parcial. Es el camino que corre en PRODUCCION cuando dos
    //     solicitudes compiten por el mismo recurso: una entra y la otra cae
    //     en DO NOTHING SIN error, y el backend la mapea a 409.
    //     Aqui se ejecuta el SQL EXACTO de la app, copiado de :9919-9938.
    //
    //     NOTA sobre concurrencia: las dos ejecuciones van en la MISMA
    //     transaccion. Abrir una segunda conexion para competir en vivo
    //     exigiria COMMIT (no se puede: el smoke NUNCA deja datos) y la
    //     segunda quedaria bloqueada esperando el lock del UPDATE. El indice
    //     unico se evalua igual dentro de la transaccion, asi que el DO
    //     NOTHING se ejercita con el mismo SQLSTATE de camino que en produccion.
    // =====================================================================
    var d2 = await q1("SELECT d.id::text AS id FROM destinos d"
      + " WHERE d.es_reclamable = TRUE AND d.dueno_id IS NULL"
      + "   AND d.estado_reclamacion IN ('disponible','en_revision')"
      + "   AND d.id::text <> $1"
      + "   AND NOT EXISTS (SELECT 1 FROM reclamaciones_propiedad r"
      + "                    WHERE r.recurso_tipo='destino'"
      + "                      AND r.recurso_id = d.id::text"
      + "                      AND r.estado='pendiente')"
      + ' ORDER BY d.id LIMIT 1', [dId]);
    check('T7a hay un SEGUNDO destino reclamable y sin pendiente', !!(d2 && d2.id),
      d2 ? 'destino=' + d2.id : 'ninguno sirve');
    if (!(d2 && d2.id)) throw new Error('sin segundo destino para T7');
    var d2Id = d2.id;

    // Guarda de deriva: el SQL copiado debe seguir presente en la app.
    var appSrc = '';
    try { appSrc = fs.readFileSync(path.join(__dirname, '..', 'api', 'interacciones.js'), 'utf8'); }
    catch (eApp) { appSrc = ''; }
    check('T7b el ON CONFLICT copiado sigue en api/interacciones.js',
      appSrc.indexOf('ON CONFLICT (recurso_tipo, recurso_id) WHERE estado') !== -1,
      'app_leida=' + (appSrc ? 'si' : 'no'));

    // SQL VERBATIM de api/interacciones.js:9919-9938.
    var SQL_SOLICITAR =
      'WITH up AS ('
      + ' UPDATE destinos SET estado_reclamacion=\'en_revision\''
      + ' WHERE id=$1::uuid AND es_reclamable = TRUE AND dueno_id IS NULL'
      + '   AND estado_reclamacion IN (\'disponible\',\'en_revision\')'
      + ' RETURNING id, xp_pozo_acumulado'
      + '), ins AS ('
      + ' INSERT INTO reclamaciones_propiedad'
      + '  (solicitante_id, recurso_tipo, recurso_id, prueba_url,'
      + '   nota_solicitante, estado, xp_pozo_capturado)'
      + ' SELECT $2::uuid, $3, $4, $5, $6, \'pendiente\','
      + '   COALESCE(up.xp_pozo_acumulado, 0)'
      + ' FROM up'
      + ' ON CONFLICT (recurso_tipo, recurso_id) WHERE estado = \'pendiente\''
      + ' DO NOTHING'
      + ' RETURNING id, xp_pozo_capturado'
      + ')'
      + ' SELECT (SELECT id::text FROM ins) AS reclamo_id,'
      + ' (SELECT xp_pozo_capturado FROM ins) AS pozo,'
      + ' (SELECT id::text FROM up) AS destino_actualizado';

    // Mapeo app-level EXACTO de api/interacciones.js:9954-9966.
    function clasificarSolicitud(row) {
      if (row && row.reclamo_id) return { http: 200, error: null };
      if (row && !row.reclamo_id && row.destino_actualizado)
        return { http: 409, error: 'YA_HAY_SOLICITUD_PENDIENTE' };
      return { http: 409, error: 'NO_RECLAMABLE' };
    }

    // T7c PRIMERA solicitud: la CTE entra; up reclama y ins inserta.
    var r1 = await q1(SQL_SOLICITAR,
      [d2Id, uId, 'destino', d2Id, PRUEBA_URL, 'smoke-055 ON CONFLICT primero']);
    var c1 = clasificarSolicitud(r1);
    check('T7c la primera solicitud entra en el camino 200', c1.http === 200 && !!(r1 && r1.reclamo_id),
      'http=' + c1.http + ' reclamo_id=' + linea(r1 ? r1.reclamo_id : null));

    // T7d SEGUNDA solicitud sobre el MISMO recurso: el ON CONFLICT DO NOTHING
    //     absorbe el choque. NO debe lanzar 23505 (a diferencia del INSERT
    //     crudo de T3): la sentencia entera responde sin excepcion.
    var r2 = null; var r2err = null;
    try {
      r2 = await q1(SQL_SOLICITAR,
        [d2Id, uId, 'destino', d2Id, PRUEBA_URL, 'smoke-055 ON CONFLICT segundo']);
    } catch (eR2) {
      r2err = (eR2 && eR2.code) ? String(eR2.code) : String(eR2 && eR2.message).slice(0, 120);
    }
    check('T7d la segunda solicitud NO lanza excepcion (DO NOTHING, no 23505)',
      r2err === null, 'error=' + String(r2err));

    // T7e La segunda cae en el camino controlado 409, no en una excepcion.
    var c2 = clasificarSolicitud(r2 || {});
    check('T7e la segunda solicitud se mapea a 409 YA_HAY_SOLICITUD_PENDIENTE',
      c2.http === 409 && c2.error === 'YA_HAY_SOLICITUD_PENDIENTE',
      'http=' + c2.http + ' error=' + String(c2.error)
      + ' reclamo_id=' + linea(r2 ? r2.reclamo_id : null)
      + ' destino_actualizado=' + linea(r2 ? r2.destino_actualizado : null));

    // T7f Sigue habiendo UNA sola pendiente sobre d2 (DO NOTHING no inserto otra).
    var pend2 = await q1("SELECT count(*)::int AS n FROM reclamaciones_propiedad"
      + " WHERE recurso_tipo='destino' AND recurso_id=$1 AND estado='pendiente'", [d2Id]);
    check('T7f queda exactamente 1 pendiente sobre el segundo recurso', pend2.n === 1, 'n=' + pend2.n);

    // T7g El recurso quedo reclamado ('en_revision') por el UPDATE de la CTE,
    //     incluso en el intento que acabo en DO NOTHING.
    var d2est = await q1('SELECT estado_reclamacion FROM destinos WHERE id=$1::uuid', [d2Id]);
    check('T7g el recurso quedo en_revision tras (re)intentar la solicitud',
      !!(d2est && d2est.estado_reclamacion === 'en_revision'),
      'estado=' + linea(d2est ? d2est.estado_reclamacion : null));

    // =====================================================================
    // T6. ROLLBACK + conteos finales
    // =====================================================================
    await q('ROLLBACK'); enTx = false;
    var fin = await conteoReclamaciones();
    console.log('CONTROL baseline=' + base.total + '/' + base.pendientes + '  final=' + fin.total + '/' + fin.pendientes);
    check('T6a sin escrituras residuales (total)', fin.total === base.total, 'base=' + base.total + ' final=' + fin.total);
    check('T6b sin escrituras residuales (pendientes)', fin.pendientes === base.pendientes, 'base=' + base.pendientes + ' final=' + fin.pendientes);

  } catch (e) {
    console.log('EXCEPCION: ' + (e && e.code ? e.code + ' ' : '') + String(e && e.message).slice(0, 300));
    fallos++;
    if (enTx) { try { await q('ROLLBACK'); } catch (x) {} }
  }

  console.log('----');
  console.log('TOTAL ' + num + '  OK ' + (num - fallos) + '  FAIL ' + fallos);
  salir(fallos ? 1 : 0);
}

main().catch(function (e) {
  // Fallo fuera del try de main (p.ej. la conexion cae a mitad). El handler
  // synchronous no puede esperar un ROLLBACK, pero abrir la sesion y cerrarla
  // revierte por si sola: la transaccion nunca llega a COMMIT.
  console.log('FATAL ' + String(e && e.message).slice(0, 300));
  salir(2);
});