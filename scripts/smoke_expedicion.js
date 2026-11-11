// scripts/smoke_expedicion.js
//
// Smoke de la EXPEDICION v1 (spec 11.9 del contrato de cartas / familias).
// NO es un seed y NO deja datos: todo lo que escribe va dentro de UNA
// transaccion explicita que se cierra con ROLLBACK, y el corazon del script
// es la comprobacion de que los conteos PRE y POST son IDENTICOS.
//
// POR QUE EXISTE
//   La expedicion paga XP REAL (hasta 40 por cobro) y su unica red es que el
//   pago se consuma por accion y este capado en el ledger. Un ensayo one-off no
//   protege el repo: si alguien mete una expedicion en MISIONES (R1/R2), borra
//   el indice unico 073 o relaja el orden de validacion, nada lo detecta hasta
//   que hay un faucet en produccion.
//
// QUE PRUEBA
//   A1  catalogo: 6 misiones, 3+3 ramas, ids unicos y guard R2 EN CARGA.
//   A2  aritmetica: max 40, suma 160, min 15, xp {15,25,40}, N {1,2,3}.
//   A3  sin bono: BONO_EXCLUIDAS + cobro con consumible activo -> xp intacto
//       y CERO filas bono_consumible_24h.
//   A4  cap de 5: el 6o cobro en 24 h -> 409 CAP_DIARIO.
//   A5  cap de 200 y remanente: 180+40 -> paga 20 (recortado, cap 'accion');
//       195 -> 409 CAP_RECOMPENSA; 200 -> 409 CAP_DIARIO.
//   A6  doble clic: un solo asiento; 23505 sobre el indice unico parcial ->
//       xp 0 / repetido true (nunca 5xx).
//   A7  consumo: N=3 con 3 acciones usa la TERCERA ref; reintento -> repetido.
//   A8  vector: 0 cartas -> ceros sin NaN; 2 doradas lugar -> alcance 35;
//       3 doradas base -> LEAST 40.
//   A9  cero auto-pago: estructural (MISIONES no contiene ningun xpd_*, R3/R4);
//       el GET no dispara evaluarMisiones.
//   A10 escudo: node --check y ASCII se verifican fuera de este fichero.
//   A11 GET 11.9.9-bis: acciones_pendientes {ref,fecha,detalle} es ESPEJO del
//       ref_sql (la ref cobrable va PRIMERO, tope 5) y acciones_pendientes_total
//       suma exactamente lo devuelto por las misiones.
//   A12 senal no medible: xpd_dif_comparte -> disponible false, motivo
//       SIN_ACCION y acciones_pendientes [] (no se inventa otra senal).
//   A13 ref consumible: el POST acepta acciones_pendientes[0].ref y paga UNA
//       sola vez; la misma ref repetida -> xp 0 / repetido true.
//
// COMO EJERCE EL MISMO CODIGO QUE PRODUCCION
//   api/interacciones.js exporta (solo para test) el catalogo, el guard, la
//   lectura y el cobro. El smoke los llama con un sql(texto, params) que es
//   un Client real DENTRO de la transaccion, asi que el SQL medido es el que
//   se despliega, no una copia.
//
// SIN BASE NO ES UN FALLO (la cadena de npm run test no se rompe)
//   Sin DATABASE_URL imprime SKIP con el motivo y sale con codigo 0. Los
//   checks PUROS (catalogo, vector, BONO_EXCLUIDAS, 401) corren siempre.
//
// ASCII-safe (ADR-002): 0 bytes > 127, cero backticks, CommonJS estricto.
//
// USO
//   node scripts/smoke_expedicion.js
//   node scripts/smoke_expedicion.js --sin-neon   (fuerza la rama SKIP de BD)
'use strict';

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
  var extra = (detalle === undefined || detalle === null || detalle === '')
    ? '' : '  [' + String(detalle) + ']';
  console.log((ok ? 'PASS ' : 'FAIL ') + nombre + extra);
}

function limpiar(s) {
  return String(s == null ? '' : s)
    .replace(/postgres(ql)?:\/\/[^\s]+/gi, 'postgres://***');
}

function motivoSinBase() {
  if (SOLO_SIN_NEON) return 'flag --sin-neon';
  if (vacioExplicito) return 'DATABASE_URL vacia de forma explicita';
  if (!process.env.DATABASE_URL) return 'DATABASE_URL ausente';
  return '';
}

function buscar(lista, id) {
  var out = null;
  (lista || []).forEach(function (x) { if (x && x.id === id) out = x; });
  return out;
}

function todosNumericos(obj) {
  if (!obj || typeof obj !== 'object') return false;
  var claves = Object.keys(obj);
  for (var i = 0; i < claves.length; i++) {
    var v = obj[claves[i]];
    if (typeof v !== 'number' || !isFinite(v)) return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// PARTE PURA: no necesita base de datos
// ---------------------------------------------------------------------------
function partePura(api, Cartas) {
  var EX = api.EXPEDICIONES || [];
  var ramas = { difusion: 0, hallazgo: 0 };
  var ids = {};
  EX.forEach(function (m) {
    ramas[m.expedicion_rama] = (ramas[m.expedicion_rama] || 0) + 1;
    ids[m.id] = true;
  });
  check('A1 catalogo: 6 misiones, 3 difusion + 3 hallazgo, ids unicos',
    EX.length === 6 && ramas.difusion === 3 && ramas.hallazgo === 3
    && Object.keys(ids).length === 6,
    'n=' + EX.length + ' dif=' + ramas.difusion + ' hal=' + ramas.hallazgo);

  var xps = EX.map(function (m) { return Number(m.xp); });
  var ns = EX.map(function (m) { return Number(m.acciones_por_cobro); });
  var suma = xps.reduce(function (a, b) { return a + b; }, 0);
  var reqOk = EX.every(function (m) {
    return Object.keys(m.requiere_stats || {}).every(function (e) {
      return ['alcance', 'fortuna'].indexOf(e) >= 0
        && [0, 8, 20].indexOf(Number(m.requiere_stats[e])) >= 0;
    });
  });
  check('A2 aritmetica: max 40, suma 160, min 15, xp {15,25,40}, N {1,2,3}, umbrales {0,8,20}',
    Math.max.apply(null, xps) === 40 && suma === 160
    && Math.min.apply(null, xps) === 15
    && xps.every(function (x) { return [15, 25, 40].indexOf(x) >= 0; })
    && ns.every(function (n) { return [1, 2, 3].indexOf(n) >= 0; }) && reqOk,
    'suma=' + suma);

  check('A1 guard limpio: validarCatalogosExpedicion() devuelve 0 errores',
    Array.isArray(api.validarCatalogosExpedicion())
    && api.validarCatalogosExpedicion().length === 0,
    String(api.validarCatalogosExpedicion()));

  // R2: el guard tiene que REVENTAR si una expedicion entra en MISIONES.
  api.MISIONES.push({
    id: 'mis_fake_expedicion', nombre: 'fake', xp: 1,
    expedicion_rama: 'difusion',
  });
  var errRama = api.validarCatalogosExpedicion();
  api.MISIONES.pop();
  check('R2: una mision con expedicion_rama dentro de MISIONES rompe el guard',
    errRama.some(function (e) {
      return e.indexOf('MISIONES contiene expedicion_rama') >= 0;
    }),
    errRama.join(' | '));

  var idExp = EX.length ? EX[0].id : 'xpd_dif_comparte';
  api.MISIONES.push({ id: idExp, nombre: 'fake', xp: 1 });
  var errCol = api.validarCatalogosExpedicion();
  api.MISIONES.pop();
  check('R2: un id xpd_* dentro de MISIONES rompe el guard (R3/R4)',
    errCol.some(function (e) { return e.indexOf('dentro de MISIONES') >= 0; }),
    errCol.join(' | '));

  // A8 vector: fixtures REALES del catalogo (dorado lugar = 14 alcance + 10
  // fortuna, primario alcance). 11.9.2: shiny +6 y nivel +1 al primario.
  var dorada = { alcance: 14, fortuna: 10, primario: 'alcance' };
  var vacio = Cartas.vectorExpedicion([]);
  check('A8 fixture 0 cartas: 5 ejes a 0, poder 0, sin NaN',
    Cartas.CARTA_EJES_STATS.every(function (e) { return vacio.vector[e] === 0; })
    && vacio.poder === 0 && todosNumericos(vacio.vector));

  var dos = Cartas.vectorExpedicion([
    { carta_id: 'ct_leyenda_01', variante: 'shiny', nivel: 2, stats_json: dorada },
    { carta_id: 'ct_leyenda_02', variante: 'base', nivel: 1, stats_json: dorada },
  ]);
  check('A8 dos doradas lugar (shiny nivel 2 + base): alcance 35 y poder = suma de los 4 ejes',
    dos.vector.alcance === 35 && dos.vector.fortuna === 20
    && dos.poder === dos.vector.alcance + dos.vector.oficio
      + dos.vector.fortuna + dos.vector.rendimiento,
    'alcance=' + dos.vector.alcance + ' poder=' + dos.poder);

  var tres = Cartas.vectorExpedicion([
    { carta_id: 'ct_leyenda_01', variante: 'base', nivel: 1, stats_json: dorada },
    { carta_id: 'ct_leyenda_02', variante: 'base', nivel: 1, stats_json: dorada },
    { carta_id: 'ct_leyenda_06', variante: 'base', nivel: 1, stats_json: dorada },
  ]);
  check('A8 LEAST sobre la SUMA: 3 doradas base -> alcance 40 (42 recortado)',
    tres.vector.alcance === 40, 'alcance=' + tres.vector.alcance);

  check('A3 BONO_EXCLUIDAS: carta_expedicion no recibe bono global (accionConBono false)',
    api.accionConBono('carta_expedicion') === false);

  // Contrato de error de 11.9.6 (sin tocar la base: falla antes).
  return (async function () {
    function resFake() {
      return {
        code: 0,
        cuerpo: null,
        setHeader: function () {},
        status: function (c) { this.code = c; return this; },
        json: function (b) { this.cuerpo = b; return this; },
        end: function () {},
      };
    }
    var r401 = resFake();
    await api({
      method: 'POST', query: {}, headers: {},
      body: { tipo: 'expedicion_cobrar', mision_id: idExp },
    }, r401);
    check('11.9.6 paso 1: sin usuario_id -> 401 SESION_REQUERIDA',
      r401.code === 401 && r401.cuerpo && r401.cuerpo.code === 'SESION_REQUERIDA',
      r401.code + ' ' + JSON.stringify(r401.cuerpo));

    var rUuid = resFake();
    await api({
      method: 'POST', query: {}, headers: {},
      body: { tipo: 'expedicion_cobrar', usuario_id: 'no-es-uuid', mision_id: idExp },
    }, rUuid);
    check('11.9.6: usuario_id no uuid -> 400 USUARIO_ID_INVALIDO (nunca 22P02)',
      rUuid.code === 400 && rUuid.cuerpo && rUuid.cuerpo.error === 'USUARIO_ID_INVALIDO');

    var rSinTok = resFake();
    await api({
      method: 'POST', query: {}, headers: {},
      body: {
        tipo: 'expedicion_cobrar',
        usuario_id: '00000000-0000-4000-8000-000000000000',
        mision_id: idExp,
      },
    }, rSinTok);
    check('11.9.6 paso 1: uuid valido sin token -> 401 con code y razon del helper',
      rSinTok.code === 401 && rSinTok.cuerpo
      && rSinTok.cuerpo.code === 'SESION_REQUERIDA'
      && rSinTok.cuerpo.error === 'SESION_REQUERIDA',
      rSinTok.code + ' ' + JSON.stringify(rSinTok.cuerpo));
  })();
}

// ---------------------------------------------------------------------------
// PARTE CON BASE: una transaccion, ROLLBACK al final
// ---------------------------------------------------------------------------
async function parteBase(api) {
  var srv = require('@neondatabase/serverless');
  var client = new srv.Client(process.env.DATABASE_URL);
  var tag = 'smk' + String(Date.now().toString(36)) + String(process.pid);
  var enTx = false;

  function salir(codigo) {
    try { client.end(); } catch (x) {}
    process.stdout.write('', function () { process.exit(codigo); });
  }

  function q(s, p) {
    return client.query(s, p || []).then(function (r) {
      return (r && r.rows) ? r.rows : [];
    });
  }

  function q1(s, p) {
    return q(s, p).then(function (rows) { return rows[0] || null; });
  }

  // Adaptador para el codigo de PRODUCCION: cada consulta va dentro de su
  // propio SAVEPOINT. En produccion cada sql() de neon es una transaccion
  // implicita; dentro de la tx del smoke una consulta que falla (p.ej. la
  // degradacion de media_compartidos, ausente en la base viva) abortaria TODO
  // el bloque y el resto de casos no correria. Con el savepoint se revierte
  // solo esa consulta. Serializado en UNA cola porque expedicionLectura lanza
  // los COUNT en paralelo y los savepoints anidados no son seguros.
  var spSeq = 0;
  var cola = Promise.resolve();
  function qApi(s, p) {
    var t = cola.then(function () {
      var sp = 'sp_q' + (++spSeq);
      return client.query('SAVEPOINT ' + sp).then(function () {
        return client.query(s, p || []);
      }).then(function (r) {
        return client.query('RELEASE SAVEPOINT ' + sp).then(function () {
          return (r && r.rows) ? r.rows : [];
        });
      }).catch(function (e) {
        return client.query('ROLLBACK TO SAVEPOINT ' + sp)
          .then(function () { return client.query('RELEASE SAVEPOINT ' + sp); })
          .catch(function () {})
          .then(function () { throw e; });
      });
    });
    cola = t.catch(function () {});
    return t;
  }

  try {
    await client.connect();
  } catch (e) {
    console.log('SKIP no se pudo abrir la conexion: '
      + (e && e.code ? String(e.code) + ' ' : '') + limpiar(e && e.message));
    console.log('SKIP se trata como entorno sin base para no romper npm run test.');
    saltados++;
    salir(0);
    return;
  }

  var SQL_CONTEOS = 'SELECT'
    + ' (SELECT COUNT(*)::int FROM usuarios) AS usuarios,'
    + ' (SELECT COUNT(*)::int FROM xp_ledger) AS xp_ledger,'
    + ' (SELECT COUNT(*)::int FROM interacciones) AS interacciones,'
    + ' (SELECT COUNT(*)::int FROM usuarios_cartas) AS usuarios_cartas,'
    + ' (SELECT COUNT(*)::int FROM usuarios_cartas_nivel) AS usuarios_cartas_nivel,'
    + ' (SELECT COUNT(*)::int FROM cartas_gates) AS cartas_gates';

  function resumen(a, b) {
    return 'usuarios ' + a.usuarios + '->' + b.usuarios
      + ' / xp_ledger ' + a.xp_ledger + '->' + b.xp_ledger
      + ' / interacciones ' + a.interacciones + '->' + b.interacciones
      + ' / usuarios_cartas ' + a.usuarios_cartas + '->' + b.usuarios_cartas
      + ' / nivel ' + a.usuarios_cartas_nivel + '->' + b.usuarios_cartas_nivel
      + ' / gates ' + a.cartas_gates + '->' + b.cartas_gates;
  }

  var pre = null;
  try {
    // Esquema minimo (073): sin indice ni CHECK no hay nada que medir.
    var idx = await q1("SELECT COUNT(*)::int AS n FROM pg_indexes"
      + " WHERE tablename='xp_ledger'"
      + " AND indexname='xp_ledger_expedicion_accion_uq'");
    var chk = await q1("SELECT COUNT(*)::int AS n FROM pg_constraint"
      + " WHERE conname='chk_xp_ledger_expedicion_contexto'");
    check('A6/073: indice unico parcial xp_ledger_expedicion_accion_uq existe',
      idx && idx.n === 1);
    check('073: CHECK chk_xp_ledger_expedicion_contexto existe',
      chk && chk.n === 1);

    var destinos = await q("SELECT id FROM destinos WHERE status='published'"
      + ' ORDER BY id LIMIT 12');
    if (destinos.length < 8) {
      console.log('SKIP se necesitan 8 destinos publicados (hay '
        + destinos.length + ')');
      saltados++;
      salir(0);
      return;
    }
    var d = destinos.map(function (r) { return r.id; });

    await q('BEGIN');
    enTx = true;
    pre = await q1(SQL_CONTEOS);

    // -- Fixtures SOLO dentro de la tx (el ROLLBACK lo revierte todo) --------
    async function nuevoUsuario(sufijo) {
      var r = await q1('INSERT INTO usuarios (email, nombre) VALUES ($1, $2)'
        + ' RETURNING id',
        ['smk_exp_' + tag + '_' + sufijo + '@example.invalid', 'smk_' + sufijo]);
      return r.id;
    }
    var u1 = await nuevoUsuario('u1');
    var u2 = await nuevoUsuario('u2');
    var u3 = await nuevoUsuario('u3');

    // Vector: 2 doradas lugar (una shiny nivel 2 y una base) -> alcance 35.
    await q('INSERT INTO usuarios_cartas (usuario_id, carta_id, variante,'
      + ' cantidad, activo) VALUES ($1::uuid, $2, $3, 1, true)',
      [u1, 'ct_leyenda_01', 'shiny']);
    await q('INSERT INTO usuarios_cartas_nivel (usuario_id, carta_id, nivel)'
      + ' VALUES ($1::uuid, $2, 2)', [u1, 'ct_leyenda_01']);
    await q('INSERT INTO usuarios_cartas (usuario_id, carta_id, variante,'
      + ' cantidad, activo) VALUES ($1::uuid, $2, $3, 1, true)',
      [u1, 'ct_leyenda_02', 'base']);

    async function accion(uid, destinoId, tipo, xp) {
      var r = await q1('INSERT INTO interacciones (usuario_id, destino_id,'
        + ' tipo, activo, xp_ganado) VALUES ($1::uuid, $2::uuid, $3, true,'
        + ' $4::numeric) RETURNING id', [uid, destinoId, tipo, xp || 0]);
      return r.id;
    }
    // xpd_dif_mapa: N=3 -> 3 guardados. xpd_dif_resena: N=2 con xp >= 25.
    // xpd_for_visita: N=1. Destinos distintos para no chocar con los indices
    // de dedup de 012 y 014.
    await accion(u1, d[0], 'guardado', 0);
    await accion(u1, d[1], 'guardado', 0);
    await accion(u1, d[2], 'guardado', 0);
    await accion(u1, d[3], 'resena', 25);
    await accion(u1, d[4], 'resena', 25);
    var refVisita = await accion(u1, d[5], 'visita', 0);
    // Un guardado de OTRO usuario: su id es una ref real pero ajena.
    var refAjena = await accion(u2, d[6], 'guardado', 0);
    await q('INSERT INTO cartas_gates (usuario_id, nivel_gate, set_slug,'
      + ' drop_en) VALUES ($1::uuid, 10, $2, now())',
      [u1, 'smoke_expedicion_' + tag]);

    // -- GET (11.9.8) ------------------------------------------------------
    var lect = await api.expedicionLectura(qApi, u1);
    check('GET: vector alcance 35 / fortuna 20 / oficio 0 y poder 55',
      lect.vector.alcance === 35 && lect.vector.fortuna === 20
      && lect.vector.oficio === 0 && lect.poder === 55,
      JSON.stringify(lect.vector) + ' poder=' + lect.poder);
    check('GET: cap inicial usadas 0/5, xp_dia 0/200, min_cobro 15 y 6 misiones',
      lect.cap && lect.cap.usadas === 0 && lect.cap.limite === 5
      && lect.cap.xp_dia === 0 && lect.cap.limite_xp === 200
      && lect.cap.min_cobro_xp === 15 && lect.misiones.length === 6,
      JSON.stringify(lect.cap));
    var mMapa = buscar(lect.misiones, 'xpd_dif_mapa');
    check('A7 GET: xpd_dif_mapa total 3 / N 3 / elegibles 1 / cobros 0 y disponible',
      mMapa && mMapa.acciones.total === 3 && mMapa.acciones.por_cobro === 3
      && mMapa.acciones.elegibles === 1 && mMapa.acciones.cobros === 0
      && mMapa.disponible === true && mMapa.bloqueo === null,
      JSON.stringify(mMapa && mMapa.acciones));
    var mComp = buscar(lect.misiones, 'xpd_dif_comparte');
    check('GET: xpd_dif_comparte degrada a 0 acciones y SIN_ACCION (senal no medible)',
      mComp && mComp.acciones.total === 0 && mComp.bloqueo === 'SIN_ACCION'
      && mComp.disponible === false,
      JSON.stringify(mComp && mComp.acciones));

    // -- A11 (11.9.9-bis): la lista de refs que el POST aceptaria ----------
    // xpd_dif_mapa: N=3, cobros 0 -> la ref cobrable es la TERCERA accion
    // (offset 2), igual que la derivaria el POST. Con 3 pendientes la lista
    // las trae todas y la primera DEBE ser esa.
    var refsGuardado = await q("SELECT id::text AS ref FROM interacciones"
      + " WHERE usuario_id=$1::uuid AND tipo='guardado' AND activo=true"
      + ' ORDER BY creado_en, id', [u1]);
    var pendMapa = (mMapa && mMapa.acciones_pendientes) || [];
    var pendForma = pendMapa.every(function (a) {
      return a && typeof a.ref === 'string' && a.ref !== ''
        && typeof a.detalle === 'string' && a.detalle !== ''
        && typeof a.fecha === 'string' && a.fecha !== '';
    });
    check('A11 GET: acciones_pendientes con {ref,fecha,detalle} y la ref cobrable PRIMERO',
      pendMapa.length === 3 && pendForma
      && refsGuardado.length >= 3
      && pendMapa[0].ref === refsGuardado[2].ref
      && mMapa.accion_ref === pendMapa[0].ref
      && mMapa.senal_disponible === true && mMapa.motivo === null
      && pendMapa.length <= 5,
      'n=' + pendMapa.length + ' ref0=' + (pendMapa[0] && pendMapa[0].ref)
      + ' esperada=' + (refsGuardado[2] && refsGuardado[2].ref));
    var sumaPend = lect.misiones.reduce(function (acc, m) {
      return acc + ((m.acciones_pendientes || []).length);
    }, 0);
    check('A11 GET: acciones_pendientes_total = suma de las listas y > 0',
      lect.acciones_pendientes_total === sumaPend && sumaPend > 0,
      'total=' + lect.acciones_pendientes_total + ' suma=' + sumaPend);

    // -- A12 (11.9.9-bis): mision sin senal medible ------------------------
    check('A12 GET: compartir -> disponible false, motivo SIN_ACCION y lista vacia',
      mComp && mComp.disponible === false && mComp.motivo === 'SIN_ACCION'
      && mComp.senal_disponible === false
      && Array.isArray(mComp.acciones_pendientes)
      && mComp.acciones_pendientes.length === 0
      && mComp.accion_ref === null,
      JSON.stringify(mComp && mComp.acciones_pendientes));

    var lectU3 = await api.expedicionLectura(qApi, u3);
    check('A8 GET: usuario sin cartas -> 5 ejes a 0, poder 0, sin NaN',
      lectU3.poder === 0 && todosNumericos(lectU3.vector)
      && Object.keys(lectU3.vector).every(function (k) {
        return lectU3.vector[k] === 0;
      }));
    var mMapaU3 = buscar(lectU3.misiones, 'xpd_dif_mapa');
    check('11.9.6 paso 5 (GET): UMBRAL con faltan.alcance 8 y stats_usuario 0',
      mMapaU3 && mMapaU3.bloqueo === 'UMBRAL' && mMapaU3.faltan.alcance === 8
      && mMapaU3.stats_usuario.alcance === 0,
      JSON.stringify(mMapaU3 && mMapaU3.faltan));

    // -- POST: cobro valido (N=1) ------------------------------------------
    var xpAntes = await q1('SELECT xp_total FROM usuarios WHERE id=$1::uuid', [u1]);
    var c1 = await api.expedicionCobrar(qApi, u1, { mision_id: 'xpd_for_visita' });
    check('11.9.6: mision valida paga exacto 15, repetido false y accion_ref = fila real',
      c1.status === 200 && c1.body.ok === true && c1.body.xp === 15
      && c1.body.repetido === false && c1.body.accion_ref === String(refVisita)
      && c1.body.usadas === 1 && c1.body.xp_dia === 15,
      JSON.stringify(c1.body));
    var xpDespues = await q1('SELECT xp_total FROM usuarios WHERE id=$1::uuid', [u1]);
    check('11.9.6: xp_total sube exactamente el XP pagado (15)',
      Number(xpDespues.xp_total) - Number(xpAntes.xp_total) === 15,
      xpAntes.xp_total + '->' + xpDespues.xp_total);
    var asiento = await q1("SELECT xp_base, xp_final, cap_aplicado, es_exento,"
      + ' mult_nivel, mult_stack, mult_final, bonos_planos,'
      + " contexto->>'mision_id' AS mision_id, contexto->>'accion_ref' AS accion_ref"
      + " FROM xp_ledger WHERE usuario_id=$1::uuid AND accion='carta_expedicion'"
      + ' ORDER BY id DESC LIMIT 1', [u1]);
    check('11.9.6: asiento unico con mision_id/accion_ref, es_exento y mult 1 (sin bono)',
      asiento && Number(asiento.xp_base) === 15 && Number(asiento.xp_final) === 15
      && asiento.cap_aplicado === 'ninguno' && asiento.es_exento === true
      && Number(asiento.mult_nivel) === 1 && Number(asiento.mult_stack) === 1
      && Number(asiento.mult_final) === 1 && Number(asiento.bonos_planos) === 0
      && asiento.mision_id === 'xpd_for_visita'
      && asiento.accion_ref === String(refVisita),
      JSON.stringify(asiento));

    // -- Reintento: mismo accion_ref -> xp 0, repetido, sin segundo asiento --
    var c2 = await api.expedicionCobrar(qApi, u1, {
      mision_id: 'xpd_for_visita', accion_ref: String(refVisita),
    });
    var nVis = await q1("SELECT COUNT(*)::int AS n FROM xp_ledger"
      + " WHERE usuario_id=$1::uuid AND accion='carta_expedicion'", [u1]);
    check('11.9.5: reintento del mismo accion_ref -> 200 xp 0 repetido true y 1 solo asiento',
      c2.status === 200 && c2.body.xp === 0 && c2.body.repetido === true
      && c2.body.accion_ref === null && nVis.n === 1,
      JSON.stringify(c2.body));

    // -- Mision inexistente: 404 antes de tocar caps -----------------------
    var cNo = await api.expedicionCobrar(qApi, u1, { mision_id: 'xpd_no_existe' });
    check('11.9.6 paso 2: mision_id fuera de EXPEDICIONES -> 404 MISION_NO_ENCONTRADA',
      cNo.status === 404 && cNo.body.code === 'MISION_NO_ENCONTRADA'
      && cNo.body.mision_id === 'xpd_no_existe',
      JSON.stringify(cNo.body));

    // -- Umbral insuficiente (otro usuario, 0 cartas) ----------------------
    var c3 = await api.expedicionCobrar(qApi, u2, { mision_id: 'xpd_dif_mapa' });
    var nU2 = await q1("SELECT COUNT(*)::int AS n FROM xp_ledger"
      + " WHERE usuario_id=$1::uuid AND accion='carta_expedicion'", [u2]);
    check('11.9.6 paso 5: umbral insuficiente -> 409 UMBRAL_NO_ALCANZADO con faltan correcto y 0 filas',
      c3.status === 409 && c3.body.code === 'UMBRAL_NO_ALCANZADO'
      && c3.body.faltan.alcance === 8 && c3.body.vector.alcance === 0
      && c3.body.requiere_stats.alcance === 8 && nU2.n === 0,
      JSON.stringify(c3.body));

    // -- accion_ref inventada / ajena --------------------------------------
    await q('SAVEPOINT sp_ref');
    var cBad = await api.expedicionCobrar(qApi, u1, {
      mision_id: 'xpd_dif_mapa', accion_ref: 'ref_inventada_' + tag,
    });
    var cAje = await api.expedicionCobrar(qApi, u1, {
      mision_id: 'xpd_dif_mapa', accion_ref: String(refAjena),
    });
    var nRef = await q1("SELECT COUNT(*)::int AS n FROM xp_ledger"
      + " WHERE usuario_id=$1::uuid AND accion='carta_expedicion'", [u1]);
    check('11.9.5: accion_ref inventada -> 409 ACCION_NO_VERIFICADA sin escribir',
      cBad.status === 409 && cBad.body.code === 'ACCION_NO_VERIFICADA');
    check('11.9.5: accion_ref de OTRO usuario -> 409 ACCION_NO_VERIFICADA sin escribir',
      cAje.status === 409 && cAje.body.code === 'ACCION_NO_VERIFICADA' && nRef.n === 1);
    await q('ROLLBACK TO SAVEPOINT sp_ref');

    // -- A7: con 3 acciones el cobro usa la TERCERA ref ---------------------
    await q('SAVEPOINT sp_okref');
    var refsMapa = await q("SELECT id::text AS ref FROM interacciones"
      + " WHERE usuario_id=$1::uuid AND tipo='guardado' AND activo=true"
      + ' ORDER BY creado_en, id', [u1]);
    var refTercera = refsMapa.length >= 3 ? refsMapa[2].ref : null;
    var cOkRef = await api.expedicionCobrar(qApi, u1, {
      mision_id: 'xpd_dif_mapa', accion_ref: refTercera,
    });
    check('A7: N=3 consume la TERCERA accion (offset 2) y paga 25',
      cOkRef.status === 200 && cOkRef.body.xp === 25
      && cOkRef.body.accion_ref === refTercera
      && cOkRef.body.repetido === false,
      JSON.stringify(cOkRef.body));
    await q('ROLLBACK TO SAVEPOINT sp_okref');

    // -- A4: cap de 5 en 24 h ---------------------------------------------
    await q('SAVEPOINT sp_cap5');
    async function relleno(uid, misionId, accionRef, xp) {
      await q("INSERT INTO xp_ledger (usuario_id, accion, xp_base, xp_final,"
        + ' es_exento, contexto)'
        + " VALUES ($1::uuid, 'carta_expedicion', $2::numeric, $2::numeric, true,"
        + ' jsonb_build_object($3::text, $4::text, $5::text, $6::text))',
        [uid, xp, 'mision_id', misionId, 'accion_ref', accionRef]);
    }
    await relleno(u1, 'xpd_filler', 'cap_' + tag + '_1', 0);
    await relleno(u1, 'xpd_filler', 'cap_' + tag + '_2', 0);
    await relleno(u1, 'xpd_filler', 'cap_' + tag + '_3', 0);
    await relleno(u1, 'xpd_filler', 'cap_' + tag + '_4', 0);
    var cCap = await api.expedicionCobrar(qApi, u1, { mision_id: 'xpd_dif_mapa' });
    var nCap = await q1("SELECT COUNT(*)::int AS n FROM xp_ledger"
      + " WHERE usuario_id=$1::uuid AND accion='carta_expedicion'", [u1]);
    check('A4: 5 cobros en < 24 h -> la 6a es 409 CAP_DIARIO (usadas 5, limite 5) y 0 filas',
      cCap.status === 409 && cCap.body.code === 'CAP_DIARIO'
      && cCap.body.usadas === 5 && cCap.body.limite === 5 && nCap.n === 5,
      JSON.stringify(cCap.body));
    await q('ROLLBACK TO SAVEPOINT sp_cap5');

    // -- A5: remanente 20 -> recorta a 20 y registra el importe REAL --------
    await q('SAVEPOINT sp_rem');
    await relleno(u1, 'xpd_filler', 'rem_' + tag, 165);
    var cRem = await api.expedicionCobrar(qApi, u1, { mision_id: 'xpd_dif_mapa' });
    var asRem = await q1("SELECT xp_base, xp_final, cap_aplicado FROM xp_ledger"
      + " WHERE usuario_id=$1::uuid AND accion='carta_expedicion'"
      + " AND contexto->>'mision_id'='xpd_dif_mapa'"
      + ' ORDER BY id DESC LIMIT 1', [u1]);
    check('A5: xp_dia 180 + mision de 40 -> paga 20, recortado true, cap accion y xp_base 25',
      cRem.status === 200 && cRem.body.xp === 20 && cRem.body.recortado === true
      && cRem.body.repetido === false && asRem
      && Number(asRem.xp_base) === 25 && Number(asRem.xp_final) === 20
      && asRem.cap_aplicado === 'accion',
      JSON.stringify(cRem.body) + ' ' + JSON.stringify(asRem));
    await q('ROLLBACK TO SAVEPOINT sp_rem');

    await q('SAVEPOINT sp_rem195');
    await relleno(u1, 'xpd_filler', 'rem2_' + tag, 180);
    var c195 = await api.expedicionCobrar(qApi, u1, { mision_id: 'xpd_dif_mapa' });
    var n195 = await q1("SELECT COUNT(*)::int AS n FROM xp_ledger"
      + " WHERE usuario_id=$1::uuid AND accion='carta_expedicion'", [u1]);
    check('A5: xp_dia 195 -> 409 CAP_RECOMPENSA (remanente 5 < min 15) y 0 filas',
      c195.status === 409 && c195.body.code === 'CAP_RECOMPENSA'
      && c195.body.remanente_xp === 5 && c195.body.min_cobro_xp === 15
      && n195.n === 2,
      JSON.stringify(c195.body));
    await q('ROLLBACK TO SAVEPOINT sp_rem195');

    await q('SAVEPOINT sp_rem200');
    await relleno(u1, 'xpd_filler', 'rem3_' + tag, 185);
    var c200 = await api.expedicionCobrar(qApi, u1, { mision_id: 'xpd_dif_mapa' });
    check('A5: xp_dia 200 -> 409 CAP_DIARIO y 0 filas',
      c200.status === 409 && c200.body.code === 'CAP_DIARIO'
      && c200.body.xp_dia === 200,
      JSON.stringify(c200.body));
    await q('ROLLBACK TO SAVEPOINT sp_rem200');

    // -- A3: bono global activo NO toca el pago ----------------------------
    await q('SAVEPOINT sp_bono');
    var expira = new Date(Date.now() + 3600000).toISOString();
    await q('UPDATE usuarios SET capacidades = COALESCE(capacidades,'
      + " '{}'::jsonb) || jsonb_build_object('consumible_efectos',"
      + ' jsonb_build_object($2::text, jsonb_build_object('
      + "'clave', $2::text, 'expira_en', $3::text, 'bono_pct', 0.15,"
      + " 'bono_tope_xp', 100, 'bono_acumulado_xp', 0)))"
      + ' WHERE id = $1::uuid', [u1, 'bono_smk_' + tag, expira]);
    var cBono = await api.expedicionCobrar(qApi, u1, { mision_id: 'xpd_for_gate' });
    var nBono = await q1("SELECT COUNT(*)::int AS n FROM xp_ledger"
      + " WHERE accion='bono_consumible_24h' AND usuario_id=$1::uuid", [u1]);
    var acum = await q1("SELECT COALESCE((capacidades->'consumible_efectos'"
      + ' -> $2::text ->> \'bono_acumulado_xp\')::numeric, 0) AS a'
      + ' FROM usuarios WHERE id=$1::uuid', [u1, 'bono_smk_' + tag]);
    check('A3: con consumible activo el cobro paga 40 exactos y CERO filas de bono',
      cBono.status === 200 && cBono.body.xp === 40
      && nBono.n === 0 && Number(acum.a) === 0,
      JSON.stringify(cBono.body) + ' bono_filas=' + nBono.n);
    await q('ROLLBACK TO SAVEPOINT sp_bono');

    // -- A6: 23505 sobre el indice unico parcial 073 -----------------------
    await q('SAVEPOINT sp_uq');
    var ctxDup = { mision_id: 'xpd_dif_mapa', accion_ref: 'dup_' + tag,
      expedicion_rama: 'difusion', acciones_por_cobro: 3 };
    var dup1 = await api.expedicionInsertarAsiento(qApi, {
      usuario_id: u1, xp_base: 1, xp_final: 1, cap_aplicado: 'ninguno',
      contexto: ctxDup,
    });
    var dup2 = await api.expedicionInsertarAsiento(qApi, {
      usuario_id: u1, xp_base: 1, xp_final: 1, cap_aplicado: 'ninguno',
      contexto: ctxDup,
    });
    var nDup = await q1("SELECT COUNT(*)::int AS n FROM xp_ledger"
      + " WHERE usuario_id=$1::uuid AND accion='carta_expedicion'"
      + " AND contexto->>'accion_ref'=$2", [u1, ctxDup.accion_ref]);
    check('A6: INSERT duplicado -> 23505 tratado como repetido (xp 0) y 1 solo asiento',
      dup1.insertado === true && dup2.insertado === false
      && dup2.repetido === true && nDup.n === 1,
      JSON.stringify(dup1) + ' ' + JSON.stringify(dup2));
    await q('ROLLBACK TO SAVEPOINT sp_uq');

    // -- A13 (11.9.9-bis): la ref publicada por el GET es COBRABLE ----------
    // Usuario limpio (cap 0/5) y una sola visita: sin la lista del GET el
    // cliente tendria que adivinar el uuid. La ref de la lista debe ser la
    // MISMA que el POST deriva, pagar una vez y no pagar la segunda.
    var u4 = await nuevoUsuario('u4');
    await accion(u4, d[7], 'visita', 0);
    var lectU4 = await api.expedicionLectura(qApi, u4);
    var mVis4 = buscar(lectU4.misiones, 'xpd_for_visita');
    var pendU4 = (mVis4 && mVis4.acciones_pendientes) || [];
    var refU4 = (pendU4[0] && pendU4[0].ref) ? pendU4[0].ref : null;
    check('A13 GET: la mision con 1 accion expone exactamente esa ref',
      pendU4.length === 1 && refU4 !== null && mVis4.accion_ref === refU4
      && mVis4.disponible === true && lectU4.acciones_pendientes_total >= 1,
      'n=' + pendU4.length + ' ref=' + refU4);
    var c4 = await api.expedicionCobrar(qApi, u4, {
      mision_id: 'xpd_for_visita', accion_ref: refU4,
    });
    var nU4 = await q1("SELECT COUNT(*)::int AS n FROM xp_ledger"
      + " WHERE usuario_id=$1::uuid AND accion='carta_expedicion'", [u4]);
    check('A13 POST: la ref del GET es aceptada, paga 15 y deja 1 asiento',
      c4.status === 200 && c4.body.ok === true && c4.body.xp === 15
      && c4.body.repetido === false && c4.body.accion_ref === refU4
      && nU4.n === 1,
      JSON.stringify(c4.body));
    var c4b = await api.expedicionCobrar(qApi, u4, {
      mision_id: 'xpd_for_visita', accion_ref: refU4,
    });
    var nU4b = await q1("SELECT COUNT(*)::int AS n FROM xp_ledger"
      + " WHERE usuario_id=$1::uuid AND accion='carta_expedicion'", [u4]);
    check('A13 POST: la misma ref repetida -> xp 0, repetido true, 1 solo asiento',
      c4b.status === 200 && c4b.body.xp === 0 && c4b.body.repetido === true
      && nU4b.n === 1, JSON.stringify(c4b.body));
    var lectU4b = await api.expedicionLectura(qApi, u4);
    var mVis4b = buscar(lectU4b.misiones, 'xpd_for_visita');
    check('A13 GET: tras cobrar, la lista queda vacia y motivo SIN_ACCION',
      mVis4b && mVis4b.acciones_pendientes.length === 0
      && mVis4b.accion_ref === null && mVis4b.motivo === 'SIN_ACCION'
      && mVis4b.bloqueo === 'SIN_ACCION',
      JSON.stringify(mVis4b && mVis4b.acciones_pendientes));

    // -- A9 estructural: ningun id xpd_* puede estar en MISIONES -----------
    var idsMision = (api.MISIONES || []).map(function (m) { return m.id; });
    check('A9/R3/R4: MISIONES no contiene ningun id xpd_*',
      idsMision.every(function (id) { return String(id).indexOf('xpd_') !== 0; }));

    // -- ROLLBACK: el corazon del script -----------------------------------
    var refsAntes = await q1(SQL_CONTEOS);
    await q('ROLLBACK');
    enTx = false;
    var post = await q1(SQL_CONTEOS);
    check('0 persistencia: conteos PRE == POST tras el ROLLBACK',
      JSON.stringify(pre) === JSON.stringify(post), resumen(pre, post));
    if (JSON.stringify(pre) !== JSON.stringify(post)) {
      console.log('      dentro de la tx: ' + resumen(pre, refsAntes));
    }
  } catch (e) {
    if (enTx) { try { await q('ROLLBACK'); } catch (x) {} }
    check('ejecucion sin excepciones', false, limpiar(e && e.message));
  } finally {
    console.log('');
    var ok = fallos === 0;
    console.log('----');
    console.log('TOTAL checks=' + num + ' PASS=' + (num - fallos)
      + ' FAIL=' + fallos + ' SKIP=' + saltados);
    salir(ok ? 0 : 1);
  }
}

// ---------------------------------------------------------------------------
async function main() {
  console.log('== SMOKE EXPEDICION (spec 11.9) - cero persistencia (ROLLBACK)');
  console.log('');

  var api = require('../api/interacciones.js');
  var Cartas = require('../lib/cartas-config.js');

  await partePura(api, Cartas);

  var motivo = motivoSinBase();
  if (motivo) {
    console.log('');
    console.log('SKIP sin base de datos: ' + motivo);
    console.log('SKIP los checks puros de arriba ya se ejecutaron.');
    saltados++;
    console.log('');
    console.log('----');
    console.log('TOTAL checks=' + num + ' PASS=' + (num - fallos)
      + ' FAIL=' + fallos + ' SKIP=' + saltados);
    process.stdout.write('', function () { process.exit(fallos === 0 ? 0 : 1); });
    return;
  }

  await parteBase(api);
}

main().catch(function (e) {
  console.error('ERROR no controlado: ' + limpiar(e && e.message));
  process.exit(1);
});
