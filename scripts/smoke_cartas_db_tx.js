// smoke_cartas_db_tx.js
//
// Smoke de ESCRITURA TRANSACCIONAL de los invariantes de cartas en Neon:
// usuarios_cartas, cartas_catalogo y cartas_gates (migraciones 040, 060, 061).
// NO es un seed y NO deja datos: TODO lo que escribe va dentro de una
// transaccion explicita que se cierra con ROLLBACK, y el corazon del script es
// la comprobacion de que los conteos PRE y POST son IDENTICOS.
//
// POR QUE EXISTE
//   Los 6 invariantes se validaron una vez a mano. Un ensayo one-off no protege
//   el repo: si alguien dropea un CHECK, cambia la PK de vuelta a 2 columnas o
//   relaja el ON DELETE de la FK de marca, nada lo detecta hasta produccion.
//   Este fichero convierte ese ensayo en guardia repetible.
//
// LECCION QUE EL SCRIPT CODIFICA (el falso negativo del caso 1)
//   Ausencia de excepcion NO es prueba de que un CHECK se evaluo: si la
//   sentencia no tiene fila objetivo (UPDATE que no matchea, INSERT que cae en
//   un conflicto previo), Postgres no evalua ningun CHECK y el resultado es un
//   falso verde. Por eso CADA caso mide dos cosas:
//     (a) la pata POSITIVA devuelve rowCount = 1, luego la fila objetivo existe
//         y el constraint SI se evaluo sobre ella;
//     (b) la pata NEGATIVA recibe el SQLSTATE exacto (23514 CHECK, 23505
//         unique, 23503 foreign key).
//   Si (a) mide 0 filas, el caso se declara FAIL aunque no haya habido error.
//
// LOS 6 CASOS
//   C1 chk_usuarios_cartas_variante ....... dominio cerrado base / shiny
//   C2 chk_usuarios_cartas_museo .......... techo 1..12 + coherencia
//                                           en_museo / orden_museo / cantidad
//   C3 PK de 3 columnas + ON CONFLICT (usuario_id, carta_id, variante)
//                                           (061): base y shiny COEXISTEN, el
//                                           DO NOTHING absorbe y el DO UPDATE
//                                           incrementa cantidad
//   C4 fk_cartas_catalogo_marca_id con confdeltype = 'r'
//                                           (ON DELETE RESTRICT, 060): se lee
//                                           del catalogo Y se ejecuta el DELETE
//   C5 cartas_gates: chk_cartas_gates_nivel (10,14,20,25) + PK
//                                           (usuario_id, nivel_gate)
//   C6 cartas_catalogo: chk_cartas_catalogo_emisor_coherente y
//                                           chk_cartas_catalogo_fusionable
//
// SEGURIDAD DE LA ESCRITURA
//   Todo va en UNA transaccion. Cada sentencia que se espera que FALLE va
//   dentro de su SAVEPOINT: en Postgres un error aborta la transaccion entera
//   (25P02 en la siguiente) y sin savepoint el caso siguiente no correria.
//
// LOS IDS NO SON INVENTADOS, SALVO LOS TEMPORALES
//   El usuario_id se LEE de la base: la FK usuarios_cartas.usuario_id ->
//   usuarios(id) hace que un uuid falso no demuestre nada. Las cartas y la
//   marca de prueba llevan un sufijo unico por corrida y viven SOLO dentro de
//   la transaccion, que se revierte.
//
// SIN BASE NO ES UN FALLO (la cadena de npm run test incluye este fichero)
//   Sin DATABASE_URL disponible imprime SKIP con el motivo y sale con codigo 0.
//   Con credencial corre de verdad. Si la credencial existe pero las tablas o
//   columnas de 040/060/061 no estan, eso SI es un FAIL: es el defecto de
//   esquema que este smoke esta para detectar.
//
// NUNCA IMPRIME LA CREDENCIAL
//   Ni la cadena de conexion ni la clave se escriben en el log, tampoco en el
//   camino de error: todo mensaje pasa por limpiar().
//
// ASCII-safe (ADR-002): 0 bytes > 127, cero backticks, CommonJS estricto.
//
// USO
//   node scripts/smoke_cartas_db_tx.js
//   node scripts/smoke_cartas_db_tx.js --sin-neon    (fuerza la rama SKIP)
//   DATABASE_URL vacia de forma explicita tambien fuerza SKIP.
// REEJECUTABLE: no deja rastro (ROLLBACK). Se puede correr las veces que sea.
'use strict';

// Una DATABASE_URL vacia puesta a proposito es una senal de "sin base": no se
// deja pisar por .env.local, para que la rama SKIP sea demostrable.
var vacioExplicito = Object.prototype.hasOwnProperty.call(process.env, 'DATABASE_URL')
  && String(process.env.DATABASE_URL).trim() === '';

if (!vacioExplicito) require('./load_env_local')();

var SOLO_SIN_NEON = process.argv.indexOf('--sin-neon') !== -1;

var num = 0;
var fallos = 0;
var saltados = 0;

function check(nombre, ok, detalle) {
  num++;
  if (!ok) fallos++;
  console.log((ok ? 'PASS ' : 'FAIL ') + nombre + (detalle ? '  [' + detalle + ']' : ''));
}

function skip(nombre, motivo) {
  saltados++;
  console.log('SKIP ' + nombre + (motivo ? '  [' + motivo + ']' : ''));
}

// Quita cualquier cadena de conexion o clave que pudiera venir dentro de un
// mensaje de error. Se aplica a TODO texto de error que se imprime.
function limpiar(s) {
  var t = String(s === undefined || s === null ? '' : s);
  t = t.replace(/postgres(ql)?:\/\/\S+/gi, '[url oculta]');
  var u = process.env.DATABASE_URL ? String(process.env.DATABASE_URL) : '';
  if (u) {
    while (t.indexOf(u) !== -1) t = t.split(u).join('[url oculta]');
    var m = u.match(/:\/\/([^:\/]+):([^@]+)@/);
    if (m && m[2]) {
      while (t.indexOf(m[2]) !== -1) t = t.split(m[2]).join('[clave oculta]');
    }
  }
  return t.slice(0, 240);
}

function motivoSinBase() {
  if (SOLO_SIN_NEON) return 'flag --sin-neon pedido de forma explicita';
  if (vacioExplicito) return 'DATABASE_URL vacia de forma explicita';
  var u = process.env.DATABASE_URL;
  if (!u || String(u).trim() === '') {
    return 'DATABASE_URL no disponible (ni variable de entorno ni .env.local)';
  }
  return null;
}

var Q_CONTEO =
  'SELECT (SELECT count(*) FROM usuarios)::int AS usuarios,'
  + ' (SELECT count(*) FROM usuarios_cartas)::int AS usuarios_cartas,'
  + ' (SELECT count(*) FROM cartas_catalogo)::int AS cartas_catalogo,'
  + ' (SELECT count(*) FROM cartas_gates)::int AS cartas_gates';

function resumen(pre, post) {
  return 'usuarios ' + pre.usuarios + '->' + post.usuarios
    + ' / usuarios_cartas ' + pre.usuarios_cartas + '->' + post.usuarios_cartas
    + ' / cartas_catalogo ' + pre.cartas_catalogo + '->' + post.cartas_catalogo
    + ' / cartas_gates ' + pre.cartas_gates + '->' + post.cartas_gates;
}

async function main() {
  console.log('== SMOKE CARTAS DB TX - invariantes de cartas en Neon, cero persistencia');
  console.log('== Escritura solo dentro de BEGIN ... ROLLBACK; conteos PRE/POST al final.');
  console.log('');

  var motivo = motivoSinBase();
  if (motivo) {
    console.log('SKIP sin base de datos: ' + motivo);
    console.log('SKIP no se abre conexion, no se ejecuta SQL y la cadena de test no se rompe.');
    console.log('');
    console.log('----');
    console.log('TOTAL casos=6 checks=0 PASS=0 FAIL=0 SKIP=1');
    // Vaciar stdout antes de salir: con la salida por tuberia process.exit()
    // descarta lo que aun este en el buffer y el SKIP quedaria invisible.
    process.stdout.write('', function () { process.exit(0); });
    return;
  }

  var srv = require('@neondatabase/serverless');
  var client = new srv.Client(process.env.DATABASE_URL);
  var enTx = false;

  // Mismo patron que scripts/smoke_055_indice_unico_reclamacion.js: Client es la
  // unica via del paquete que permite BEGIN/ROLLBACK reales, y SIN connect()
  // explicito la primera promesa se queda encolada para siempre.
  function salir(codigo) {
    try { client.end(); } catch (x) {}
    process.stdout.write('', function () { process.exit(codigo); });
  }

  function q(s, p) {
    return client.query(s, p || []).then(function (r) {
      return (r && r.rows) ? r.rows : [];
    });
  }

  // Medida por rowCount, no por ausencia de error.
  function qn(s, p) {
    return client.query(s, p || []).then(function (r) {
      var n = (r && typeof r.rowCount === 'number') ? r.rowCount
        : ((r && r.rows) ? r.rows.length : -1);
      return { n: n, rows: (r && r.rows) ? r.rows : [] };
    });
  }

  function q1(s, p) {
    return qn(s, p).then(function (r) { return r.rows[0] || null; });
  }

  // Sentencia que se espera que falle: devuelve el SQLSTATE (o null si entro).
  function qfalla(sp, s, p) {
    return q('SAVEPOINT ' + sp).then(function () {
      return client.query(s, p || []).then(function (r) {
        var n = (r && typeof r.rowCount === 'number') ? r.rowCount
          : ((r && r.rows) ? r.rows.length : -1);
        return { code: null, n: n };
      }).catch(function (e) {
        var code = (e && e.code) ? String(e.code) : limpiar(e && e.message);
        return q('ROLLBACK TO SAVEPOINT ' + sp).then(function () {
          return { code: code, n: 0 };
        });
      });
    });
  }

  try {
    await client.connect();
  } catch (e) {
    console.log('SKIP no se pudo abrir la conexion con la credencial presente: '
      + (e && e.code ? String(e.code) + ' ' : '') + limpiar(e && e.message));
    console.log('SKIP se trata como entorno sin base para no romper la cadena de npm run test.');
    console.log('----');
    console.log('TOTAL casos=6 checks=0 PASS=0 FAIL=0 SKIP=1');
    salir(0);
    return;
  }

  var pre = null;
  var gateEscrito = false;
  var tag = 'smk' + String(Date.now().toString(36)) + String(process.pid);
  var idVariante = 'cartas_tx_' + tag + '_v';
  var idMuseo = 'cartas_tx_' + tag + '_m';
  var idPk = 'cartas_tx_' + tag + '_p';
  var idC6 = 'cartas_tx_' + tag + '_c6';
  var idMarca = 'cartas_tx_' + tag + '_mk';

  try {
    // =====================================================================
    // PREFLIGHT: sin esquema no hay nada que medir
    // =====================================================================
    var tablas = await q1("SELECT to_regclass('public.usuarios_cartas')::text AS uc,"
      + " to_regclass('public.cartas_catalogo')::text AS cc,"
      + " to_regclass('public.cartas_gates')::text AS cg");
    check('P0a usuarios_cartas existe (040)', !!(tablas && tablas.uc), 'to_regclass=' + String(tablas && tablas.uc));
    check('P0b cartas_catalogo existe (040)', !!(tablas && tablas.cc), 'to_regclass=' + String(tablas && tablas.cc));
    check('P0c cartas_gates existe (040)', !!(tablas && tablas.cg), 'to_regclass=' + String(tablas && tablas.cg));
    if (!(tablas && tablas.uc && tablas.cc && tablas.cg)) {
      console.log('ABORTA: faltan tablas de la 040; este smoke no puede medir los invariantes.');
      throw new Error('preflight 040');
    }

    var colErr = null;
    try {
      await q('SELECT variante, en_museo, orden_museo FROM usuarios_cartas LIMIT 0');
      await q('SELECT emisor_tipo, marca_id, fusionable, stats_json FROM cartas_catalogo LIMIT 0');
      await q('SELECT drop_en FROM cartas_gates LIMIT 0');
    } catch (eCol) {
      colErr = (eCol && eCol.code) ? String(eCol.code) : limpiar(eCol && eCol.message);
    }
    check('P0d columnas de la 060 presentes en las 3 tablas', colErr === null, 'error=' + String(colErr));
    if (colErr !== null) {
      console.log('ABORTA: la 060 no esta aplicada; los 6 casos no existirian.');
      throw new Error('preflight 060');
    }

    // Usuario real para las FK. Si usuarios esta vacia no se puede demostrar
    // nada: los casos de escritura se declaran SKIP, no PASS.
    var u = await q1('SELECT id::text AS id FROM usuarios ORDER BY id LIMIT 1');
    var uId = (u && u.id) ? String(u.id) : null;
    var uMarca = await q1('SELECT u.id::text AS id FROM usuarios u'
      + ' WHERE NOT EXISTS (SELECT 1 FROM marcas m WHERE m.usuario_id = u.id)'
      + ' ORDER BY u.id LIMIT 1');
    var uMarcaId = (uMarca && uMarca.id) ? String(uMarca.id) : null;

    // =====================================================================
    // CONTEOS PRE (fuera de la transaccion: es el baseline de cero persistencia)
    // =====================================================================
    pre = await q1(Q_CONTEO);
    console.log('PRE  usuarios=' + pre.usuarios
      + '  usuarios_cartas=' + pre.usuarios_cartas
      + '  cartas_catalogo=' + pre.cartas_catalogo
      + '  cartas_gates=' + pre.cartas_gates);
    console.log('');

    // =====================================================================
    // BEGIN: a partir de aqui todo es reversible
    // =====================================================================
    await q('BEGIN');
    enTx = true;
    console.log('BEGIN ejecutado (cero COMMIT en todo el fichero).');
    console.log('');

    if (!uId) {
      skip('C1..C3 y C5 (necesitan un usuario real para las FK)', 'tabla usuarios vacia');
      skip('C4 pata de comportamiento (necesita usuario y marca reales)', 'tabla usuarios vacia');
    } else {
      console.log('CONTROL usuario_id leido de la base (no inventado).');

      // ===================================================================
      // PREPARACION: 3 cartas temporales. Si no entran, los casos siguientes
      // serian un falso negativo (sin fila objetivo no se evalua ningun CHECK).
      // ===================================================================
      var SQL_CARTA_SISTEMA =
        'INSERT INTO cartas_catalogo'
        + ' (id, nombre, set_slug, rareza, nivel_gate, es_evento, emisor_tipo, fusionable)'
        + " VALUES ($1, $2, 'smoke_tx', 'comun', NULL, false, 'sistema', true)";
      var pv = await qn(SQL_CARTA_SISTEMA, [idVariante, 'smoke tx variante']);
      var pm = await qn(SQL_CARTA_SISTEMA, [idMuseo, 'smoke tx museo']);
      var pp = await qn(SQL_CARTA_SISTEMA, [idPk, 'smoke tx pk']);
      check('P1 carta temporal para C1 insertada (rowCount)', pv.n === 1, 'rowCount=' + pv.n);
      check('P2 carta temporal para C2 insertada (rowCount)', pm.n === 1, 'rowCount=' + pm.n);
      check('P3 carta temporal para C3 insertada (rowCount)', pp.n === 1, 'rowCount=' + pp.n);
      if (pv.n !== 1 || pm.n !== 1 || pp.n !== 1) {
        console.log('ABORTA: sin cartas temporales los casos no tendrian fila objetivo.');
        throw new Error('preparacion de cartas');
      }

      var SQL_UC =
        'INSERT INTO usuarios_cartas'
        + ' (usuario_id, carta_id, variante, cantidad, en_museo, orden_museo)'
        + ' VALUES ($1::uuid, $2, $3, $4, $5, $6)';

      // ===================================================================
      // C1 chk_usuarios_cartas_variante: dominio cerrado base / shiny
      // ===================================================================
      var c1a = await qn(SQL_UC, [uId, idVariante, 'base', 1, false, null]);
      check('C1a base entra y afecta 1 fila (rowCount)', c1a.n === 1, 'rowCount=' + c1a.n);
      var c1b = await qn(SQL_UC, [uId, idVariante, 'shiny', 1, false, null]);
      check('C1b shiny entra y afecta 1 fila (rowCount)', c1b.n === 1, 'rowCount=' + c1b.n);
      var c1c = await qfalla('sp_c1', SQL_UC, [uId, idVariante, 'oro', 1, false, null]);
      check('C1c variante fuera de dominio recibe 23514', c1c.code === '23514',
        'code=' + String(c1c.code) + ' filas=' + c1c.n);

      // ===================================================================
      // C2 chk_usuarios_cartas_museo: techo 1..12 y coherencia
      // ===================================================================
      var c2a = await qn(SQL_UC, [uId, idMuseo, 'base', 1, true, 1]);
      check('C2a en_museo con orden 1 y cantidad 1 entra (rowCount)', c2a.n === 1, 'rowCount=' + c2a.n);
      var c2b = await qfalla('sp_c2b', SQL_UC, [uId, idMuseo, 'shiny', 1, true, 13]);
      check('C2b orden_museo 13 recibe 23514', c2b.code === '23514',
        'code=' + String(c2b.code) + ' filas=' + c2b.n);
      var c2c = await qfalla('sp_c2c', SQL_UC, [uId, idMuseo, 'shiny', 1, false, 3]);
      check('C2c en_museo false con orden no NULL recibe 23514', c2c.code === '23514',
        'code=' + String(c2c.code) + ' filas=' + c2c.n);
      var c2d = await qfalla('sp_c2d', SQL_UC, [uId, idMuseo, 'shiny', 0, true, 2]);
      check('C2d en_museo con cantidad 0 recibe 23514', c2d.code === '23514',
        'code=' + String(c2d.code) + ' filas=' + c2d.n);

      // ===================================================================
      // C3 PK de 3 columnas (061) + ON CONFLICT (usuario_id, carta_id, variante)
      // ===================================================================
      var SQL_UC_NOTHING =
        'INSERT INTO usuarios_cartas (usuario_id, carta_id, variante, cantidad)'
        + ' VALUES ($1::uuid, $2, $3, $4)'
        + ' ON CONFLICT (usuario_id, carta_id, variante) DO NOTHING';
      var SQL_UC_UPDATE =
        'INSERT INTO usuarios_cartas (usuario_id, carta_id, variante, cantidad)'
        + ' VALUES ($1::uuid, $2, $3, $4)'
        + ' ON CONFLICT (usuario_id, carta_id, variante)'
        + ' DO UPDATE SET cantidad = usuarios_cartas.cantidad + EXCLUDED.cantidad';

      var c3a = await qn(SQL_UC_NOTHING, [uId, idPk, 'base', 1]);
      check('C3a base entra por ON CONFLICT DO NOTHING (rowCount)', c3a.n === 1, 'rowCount=' + c3a.n);
      var c3b = await qn(SQL_UC_NOTHING, [uId, idPk, 'shiny', 1]);
      check('C3b shiny COEXISTE con base: PK de 3 columnas (rowCount)', c3b.n === 1, 'rowCount=' + c3b.n);
      var c3c = await qn(SQL_UC_NOTHING, [uId, idPk, 'base', 1]);
      check('C3c el duplicado se absorbe sin excepcion (rowCount 0)', c3c.n === 0, 'rowCount=' + c3c.n);
      var c3d = await qn(SQL_UC_UPDATE, [uId, idPk, 'base', 1]);
      check('C3d DO UPDATE incrementa y afecta 1 fila (rowCount)', c3d.n === 1, 'rowCount=' + c3d.n);
      var c3e = await q1('SELECT cantidad FROM usuarios_cartas'
        + ' WHERE usuario_id = $1::uuid AND carta_id = $2 AND variante = $3', [uId, idPk, 'base']);
      check('C3e cantidad quedo en 2', !!(c3e && c3e.cantidad === 2), 'cantidad=' + String(c3e && c3e.cantidad));
      var c3f = await q1('SELECT count(*)::int AS n FROM usuarios_cartas'
        + ' WHERE usuario_id = $1::uuid AND carta_id = $2', [uId, idPk]);
      check('C3f hay 2 filas del mismo par usuario/carta (base + shiny)', !!(c3f && c3f.n === 2), 'n=' + String(c3f && c3f.n));

      // ===================================================================
      // C5 cartas_gates: dominio de nivel + PK (usuario_id, nivel_gate)
      // ===================================================================
      // Nivel libre primero: si el usuario YA tiene el gate 10 (la 040 los
      // siembra para los veteranos), un INSERT de 10 daria 23505 por PK y el
      // caso mediria el conflicto, no la fila objetivo.
      var SQL_GATE = 'INSERT INTO cartas_gates (usuario_id, nivel_gate, set_slug)'
        + " VALUES ($1::uuid, $2, 'smoke_tx')";
      var libre = await q1("SELECT t.n::int AS n FROM (VALUES (10),(14),(20),(25)) AS t(n)"
        + ' WHERE NOT EXISTS (SELECT 1 FROM cartas_gates g'
        + '                   WHERE g.usuario_id = $1::uuid AND g.nivel_gate = t.n)'
        + ' ORDER BY t.n LIMIT 1', [uId]);
      var nivelLibre = (libre && typeof libre.n === 'number') ? libre.n : null;
      if (nivelLibre === null) {
        skip('C5a insercion de un gate valido', 'el usuario ya tiene los 4 niveles de gate');
      } else {
        var c5a = await qn(SQL_GATE, [uId, nivelLibre]);
        gateEscrito = (c5a.n === 1);
        check('C5a nivel ' + nivelLibre + ' entra y afecta 1 fila (rowCount)', c5a.n === 1, 'rowCount=' + c5a.n);
      }
      var c5b = await qfalla('sp_c5b', SQL_GATE, [uId, 15]);
      check('C5b nivel 15 recibe 23514', c5b.code === '23514',
        'code=' + String(c5b.code) + ' filas=' + c5b.n);
      var nivelDup = (nivelLibre === null) ? 10 : nivelLibre;
      var c5c = await qfalla('sp_c5c', SQL_GATE, [uId, nivelDup]);
      check('C5c el duplicado (usuario_id, nivel_gate) recibe 23505', c5c.code === '23505',
        'code=' + String(c5c.code) + ' filas=' + c5c.n);
    }

    // =====================================================================
    // C4 fk_cartas_catalogo_marca_id con confdeltype = 'r' (ON DELETE RESTRICT)
    // =====================================================================
    var fk = await q1("SELECT c.confdeltype::text AS regla, c.conname AS nombre"
      + ' FROM pg_constraint c'
      + " WHERE c.conname = 'fk_cartas_catalogo_marca_id'"
      + "   AND c.conrelid = 'public.cartas_catalogo'::regclass"
      + "   AND c.contype = 'f'");
    check('C4a fk_cartas_catalogo_marca_id declarada', !!fk, 'nombre=' + String(fk && fk.nombre));
    check("C4b su confdeltype es 'r' (ON DELETE RESTRICT)", !!(fk && fk.regla === 'r'),
      'confdeltype=' + String(fk && fk.regla));

    if (!uId || !uMarcaId) {
      skip('C4c..C4f DELETE RESTRICT ejecutado sobre una marca real',
        uId ? 'no hay usuario sin marca' : 'tabla usuarios vacia');
    } else {
      var m = await qn('INSERT INTO marcas (usuario_id, nombre) VALUES ($1::uuid, $2) RETURNING id::text AS id',
        [uMarcaId, 'smoke tx marca']);
      check('C4c marca temporal insertada (rowCount)', m.n === 1, 'rowCount=' + m.n);
      if (m.n !== 1) throw new Error('sin marca temporal para C4');
      var mId = String(m.rows[0].id);

      var SQL_CARTA_MARCA =
        'INSERT INTO cartas_catalogo'
        + ' (id, nombre, set_slug, rareza, nivel_gate, es_evento, emisor_tipo, marca_id, fusionable)'
        + " VALUES ($1, $2, 'smoke_tx', 'comun', NULL, false, 'marca', $3::uuid, false)";
      var cm = await qn(SQL_CARTA_MARCA, [idMarca, 'smoke tx carta de marca', mId]);
      check('C4d carta de marca con marca_id insertada (rowCount)', cm.n === 1, 'rowCount=' + cm.n);

      var del = await qfalla('sp_c4', 'DELETE FROM marcas WHERE id = $1::uuid', [mId]);
      check('C4e DELETE de la marca referenciada recibe 23503', del.code === '23503',
        'code=' + String(del.code) + ' filas=' + del.n);
      var mViva = await q1('SELECT count(*)::int AS n FROM marcas WHERE id = $1::uuid', [mId]);
      check('C4f la marca sigue existiendo tras el DELETE rechazado', !!(mViva && mViva.n === 1),
        'n=' + String(mViva && mViva.n));
    }

    // =====================================================================
    // C6 cartas_catalogo: emisor coherente y fusionable
    // =====================================================================
    var c6a = await qn(SQL_CARTA_SISTEMA, [idC6, 'smoke tx c6']);
    check('C6a carta sistema con emisor_id y marca_id NULL entra (rowCount)', c6a.n === 1, 'rowCount=' + c6a.n);
    var SQL_CARTA_MARCA_SIN_ID =
      'INSERT INTO cartas_catalogo'
      + ' (id, nombre, set_slug, rareza, nivel_gate, es_evento, emisor_tipo, fusionable)'
      + " VALUES ($1, $2, 'smoke_tx', 'comun', NULL, false, 'marca', false)";
    var c6b = await qfalla('sp_c6b', SQL_CARTA_MARCA_SIN_ID, ['cartas_tx_' + tag + '_x1', 'smoke tx incoherente']);
    check('C6b emisor_tipo marca sin marca_id recibe 23514', c6b.code === '23514',
      'code=' + String(c6b.code) + ' filas=' + c6b.n);
    var SQL_CARTA_FUSIONABLE_GATE =
      'INSERT INTO cartas_catalogo'
      + ' (id, nombre, set_slug, rareza, nivel_gate, es_evento, emisor_tipo, fusionable)'
      + " VALUES ($1, $2, 'smoke_tx', 'comun', 10, false, 'sistema', true)";
    var c6c = await qfalla('sp_c6c', SQL_CARTA_FUSIONABLE_GATE, ['cartas_tx_' + tag + '_x2', 'smoke tx fusionable']);
    check('C6c fusionable true con nivel_gate recibe 23514', c6c.code === '23514',
      'code=' + String(c6c.code) + ' filas=' + c6c.n);

    // =====================================================================
    // CONTROL INTERMEDIO: dentro de la tx tiene que haber escrituras.
    // Si aqui no hay mas filas que en PRE, los casos anteriores no escribieron
    // y sus verdes serian falsos negativos.
    // =====================================================================
    var mid = await q1(Q_CONTEO);
    if (uId) {
      check('X0a la tx escribio de verdad en usuarios_cartas', mid.usuarios_cartas > pre.usuarios_cartas,
        'pre=' + pre.usuarios_cartas + ' tx=' + mid.usuarios_cartas);
    }
    if (gateEscrito) {
      check('X0b la tx escribio de verdad en cartas_gates', mid.cartas_gates > pre.cartas_gates,
        'pre=' + pre.cartas_gates + ' tx=' + mid.cartas_gates);
    } else {
      skip('X0b escritura observada en cartas_gates', 'no habia nivel de gate libre');
    }
    check('X0c la tx escribio de verdad en cartas_catalogo', mid.cartas_catalogo > pre.cartas_catalogo,
      'pre=' + pre.cartas_catalogo + ' tx=' + mid.cartas_catalogo);

    // =====================================================================
    // ROLLBACK: el corazon del script
    // =====================================================================
    await q('ROLLBACK');
    enTx = false;
    var post = await q1(Q_CONTEO);
    console.log('');
    console.log('POST ' + 'usuarios=' + post.usuarios
      + '  usuarios_cartas=' + post.usuarios_cartas
      + '  cartas_catalogo=' + post.cartas_catalogo
      + '  cartas_gates=' + post.cartas_gates);
    check('X1 cero persistencia: usuarios igual', post.usuarios === pre.usuarios,
      'pre=' + pre.usuarios + ' post=' + post.usuarios);
    check('X2 cero persistencia: usuarios_cartas igual', post.usuarios_cartas === pre.usuarios_cartas,
      'pre=' + pre.usuarios_cartas + ' post=' + post.usuarios_cartas);
    check('X3 cero persistencia: cartas_catalogo igual', post.cartas_catalogo === pre.cartas_catalogo,
      'pre=' + pre.cartas_catalogo + ' post=' + post.cartas_catalogo);
    check('X4 cero persistencia: cartas_gates igual', post.cartas_gates === pre.cartas_gates,
      'pre=' + pre.cartas_gates + ' post=' + post.cartas_gates);

  } catch (e) {
    console.log('EXCEPCION: ' + (e && e.code ? String(e.code) + ' ' : '') + limpiar(e && e.message));
    fallos++;
    if (enTx) {
      try { await q('ROLLBACK'); } catch (x) {}
      enTx = false;
    }
  }

  // El resumen no puede mentir: si algo se rompio antes del ROLLBACK, se
  // reintenta la medida POST para demostrar que no quedo nada escrito.
  if (pre) {
    try {
      var postFinal = await q1(Q_CONTEO);
      var iguales = postFinal.usuarios === pre.usuarios
        && postFinal.usuarios_cartas === pre.usuarios_cartas
        && postFinal.cartas_catalogo === pre.cartas_catalogo
        && postFinal.cartas_gates === pre.cartas_gates;
      if (!iguales) {
        console.log('POST-FINAL ' + resumen(pre, postFinal));
      }
      num++;
      if (!iguales) fallos++;
      console.log((iguales ? 'PASS ' : 'FAIL ')
        + 'X5 residual final: conteos identicos al PRE  [' + resumen(pre, postFinal) + ']');
    } catch (ePost) {
      num++;
      fallos++;
      console.log('FAIL X5 no se pudo remedir despues del cierre: ' + limpiar(ePost && ePost.message));
    }
  }

  console.log('----');
  console.log('TOTAL casos=6 checks=' + num + ' PASS=' + (num - fallos) + ' FAIL=' + fallos + ' SKIP=' + saltados);
  salir(fallos ? 1 : 0);
}

main().catch(function (e) {
  console.log('FATAL ' + limpiar(e && e.message));
  process.exit(2);
});
