// scripts/smoke_cartas_economia.js
//
// Smoke de la FASE 2 del sistema de cartas: el MOTOR ECONOMICO de compra con XP
// (spec 4.8) y la SUBIDA DE NIVEL por carta (spec 4.9), mas la lectura
// cartas_mias (contrato 3.6).
//
// QUE PRUEBA (8 casos)
//   C1 compra feliz .............. +1 inventario, +precio en xp_gastado_sinks,
//                                  +1 emitidas, 1 asiento xp_ledger
//   C2 sin XP .................... 0 filas, sin cargo, sin emision
//   C3 sin stock ................. 0 filas (supply_max alcanzado)
//   C4 producto no comprable ..... 0 filas (familia sin precio_xp)
//   C5 nivel 1 -> 2 .............. cargo 150, nivel 2, 1 asiento carta_nivel
//   C6 doble clic ................ segundo request con nivel_esperado viejo:
//                                  0 filas y el ledger sigue con 1 asiento
//   C7 nivel en el tope .......... nivel 5: 0 filas, sin cargo
//   C8 cartas_mias retrocompatible  las claves historicas siguen en el codigo
//                                  y las nuevas (stats/nivel/poder) existen
//   D-15 (spec 9.2): publicar producto -> sin escrow y comerciable_n 0;
//     comprar una oferta preexistente de producto -> sin debito ni asiento;
//     libro publico sin ofertas inactivas ni de producto/consumible.
//   D-17 (spec 6.4): venta UGC bruto 1000 / tithe 4% -> royalty 100, tithe 40,
//     neto 860 (suma 1000); tramos 1/4/7/10 con neto >= 0; autor ausente ->
//     royalty 0 y cero filas huerfanas en el ledger.
//   Moderacion de media (spec 6.2, E14-E19): retirar una obra que respalda
//     cartas vivas se BLOQUEA (MEDIA_CON_CARTAS, estado intacto) y pasa tras
//     desactivar la carta; la identidad de moderado_por sale de ADMIN_USER_ID
//     (presente -> uuid escrito, ausente o inexistente -> NULL y la moderacion
//     sigue). El SQL de lock/conteo/UPDATE se EXTRAE de api/admin.js.
//   D-25 / D-24 (decisiones del operador, 2026-11-11): el handler REAL se
//     ejercita con un doble de neon (F1/F2). D-25: ADMIN_USER_ID existente
//     gana SIEMPRE sobre body.moderado_por (ignorado en silencio) y la
//     respuesta declara identidad_origen; sin env, el body solo vale con uuid
//     existente. D-24: editar sin precio_xp resuelve el precio de acunacion
//     sobre la familia/rareza resultantes, producto/consumible fuerza NULL,
//     precio explicito manda y la doble edicion es idempotente.
//
// POR QUE EL SQL ES ESPEJO Y NO UNA LLAMADA AL HANDLER
//   api/interacciones.js crea su propia conexion con neon() al entrar; no
//   acepta un cliente inyectado. Llamarlo desde aqui leeria datos COMMITEADOS y
//   dejaria de ser una prueba de transaccion con ROLLBACK. Por eso el smoke
//   ejecuta el MISMO contrato SQL (una sola sentencia, fail-closed) contra un
//   Client propio dentro de BEGIN ... ROLLBACK. Los VALORES (costes, tope,
//   familias sin precio) NO se duplican: se leen de lib/cartas-config.js.
//
// CERO PERSISTENCIA
//   Todo va en UNA transaccion que termina en ROLLBACK. El script compara los
//   conteos PRE y POST: si difieren, FAIL. Se puede correr las veces que sea.
//
// SIN BASE NO ES UN FALLO (la cadena de npm test incluye este fichero)
//   Sin DATABASE_URL imprime SKIP con el motivo y sale con codigo 0. Los casos
//   puros (C8 parte estatica y los helpers de lib) corren SIEMPRE, sin base.
//
// ASCII-safe (ADR-002): 0 bytes > 127, cero backticks, CommonJS estricto.
//
// USO
//   node scripts/smoke_cartas_economia.js
//   node scripts/smoke_cartas_economia.js --sin-neon   (fuerza la rama SKIP)
'use strict';

var vacioExplicito = Object.prototype.hasOwnProperty.call(process.env, 'DATABASE_URL')
  && String(process.env.DATABASE_URL).trim() === '';

if (!vacioExplicito) require('./load_env_local')();

var fs = require('fs');
var path = require('path');
var CartasConfig = require('../lib/cartas-config.js');

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

// Nunca se imprime la credencial ni la cadena de conexion.
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

// -- SQL DEL CONTRATO (espejo literal de spec 4.8 / 4.9) ---------------------
// $1 usuario, $2 carta, $3 variante, $4 familias sin precio (jsonb).
var SQL_COMPRA =
  'WITH cat AS ('
  + ' SELECT c.id, c.precio_xp, c.emitidas, c.supply_max,'
  + '  (c.precio_xp IS NOT NULL AND c.precio_xp > 0'
  + '   AND c.familia NOT IN (SELECT jsonb_array_elements_text($4::jsonb))) AS comprable,'
  + '  (c.supply_max IS NULL OR c.emitidas < c.supply_max) AS stock_ok'
  + ' FROM cartas_catalogo c WHERE c.id=$2 AND c.activo=true LIMIT 1'
  + '), ok_carta AS ('
  + ' SELECT * FROM cat WHERE comprable AND stock_ok'
  + '), ok_saldo AS ('
  + ' SELECT u.id FROM usuarios u, ok_carta k'
  + '  WHERE u.id=$1::uuid AND u.xp_total >= k.precio_xp'
  + '  AND GREATEST(u.xp_total - COALESCE(u.xp_gastado_sinks,0),0) >= k.precio_xp'
  + '), deb AS ('
  + ' UPDATE usuarios u SET xp_gastado_sinks = COALESCE(u.xp_gastado_sinks,0)'
  + '  + (SELECT precio_xp FROM ok_carta)'
  + '  WHERE u.id=$1::uuid AND EXISTS (SELECT 1 FROM ok_saldo)'
  + ' RETURNING u.xp_total, u.xp_gastado_sinks'
  + '), emit AS ('
  + ' UPDATE cartas_catalogo c SET emitidas = c.emitidas + 1'
  + '  WHERE c.id=$2 AND EXISTS (SELECT 1 FROM deb)'
  + '  AND (c.supply_max IS NULL OR c.emitidas < c.supply_max)'
  + ' RETURNING c.emitidas'
  + '), inv AS ('
  + ' INSERT INTO usuarios_cartas (usuario_id, carta_id, variante, cantidad, activo, obtenida_en)'
  + ' SELECT $1::uuid, $2, $3, 1, true, NOW() FROM emit LIMIT 1'
  + ' ON CONFLICT (usuario_id, carta_id, variante) DO UPDATE SET'
  + '  cantidad = usuarios_cartas.cantidad + 1, activo = true, obtenida_en = NOW()'
  + ' RETURNING cantidad'
  + '), nvl AS ('
  + ' INSERT INTO usuarios_cartas_nivel (usuario_id, carta_id, nivel, xp_invertido)'
  + ' SELECT $1::uuid, $2, 1, 0 WHERE EXISTS (SELECT 1 FROM inv)'
  + ' ON CONFLICT (usuario_id, carta_id) DO NOTHING'
  + ' RETURNING nivel'
  + '), led AS ('
  + ' INSERT INTO xp_ledger (usuario_id, accion, xp_base, xp_final, es_exento, contexto)'
  + ' SELECT $1::uuid, \'carta_compra\', (SELECT precio_xp FROM ok_carta), 0, true,'
  + '  jsonb_build_object(\'carta_id\',$2,\'variante\',$3,'
  + '   \'emitidas\',(SELECT emitidas FROM emit),'
  + '   \'precio_xp\',(SELECT precio_xp FROM ok_carta))'
  + ' WHERE EXISTS (SELECT 1 FROM inv)'
  + ' RETURNING id'
  + ')'
  + ' SELECT (SELECT COUNT(*)::int FROM cat) AS carta_n,'
  + ' COALESCE((SELECT comprable FROM cat), false) AS comprable,'
  + ' COALESCE((SELECT stock_ok FROM cat), false) AS stock_ok,'
  + ' (SELECT emitidas FROM emit) AS emitidas,'
  + ' (SELECT cantidad FROM inv) AS cantidad,'
  + ' (SELECT nivel FROM usuarios_cartas_nivel'
  + '   WHERE usuario_id=$1::uuid AND carta_id=$2) AS nivel,'
  + ' (SELECT xp_total FROM deb) AS xp_total,'
  + ' (SELECT xp_gastado_sinks FROM deb) AS xp_gastado_sinks,'
  + ' (SELECT GREATEST(xp_total - COALESCE(xp_gastado_sinks,0),0) FROM usuarios'
  + '   WHERE id=$1::uuid) AS xp_disponible';

// $1 usuario, $2 carta, $3 variante, $4..$7 costes, $8 nivel_esperado.
var SQL_NIVEL =
  'WITH posee AS ('
  + ' SELECT 1 FROM usuarios_cartas uc'
  + '  WHERE uc.usuario_id=$1::uuid AND uc.carta_id=$2 AND uc.variante=$3'
  + '  AND uc.activo=true AND uc.cantidad >= 1'
  + '), base AS ('
  + ' SELECT n.nivel,'
  + '  CASE n.nivel WHEN 1 THEN $4::numeric WHEN 2 THEN $5::numeric'
  + '   WHEN 3 THEN $6::numeric WHEN 4 THEN $7::numeric END AS coste'
  + '  FROM usuarios_cartas_nivel n'
  + '  WHERE n.usuario_id=$1::uuid AND n.carta_id=$2'
  + '  AND n.nivel < ' + String(CartasConfig.CARTA_NIVEL_TOPE)
  + '  AND ($8::int IS NULL OR n.nivel = $8::int)'
  + '), up AS ('
  + ' UPDATE usuarios_cartas_nivel n'
  + '  SET nivel = n.nivel + 1,'
  + '   xp_invertido = n.xp_invertido + (SELECT coste FROM base),'
  + '   actualizado_en = NOW()'
  + '  WHERE n.usuario_id=$1::uuid AND n.carta_id=$2'
  + '  AND n.nivel = (SELECT nivel FROM base)'
  + '  AND EXISTS (SELECT 1 FROM posee)'
  + '  AND EXISTS (SELECT 1 FROM usuarios u, base b'
  + '   WHERE u.id=$1::uuid AND u.xp_total >= b.coste'
  + '   AND GREATEST(u.xp_total - COALESCE(u.xp_gastado_sinks,0),0) >= b.coste)'
  + ' RETURNING n.nivel'
  + '), deb AS ('
  + ' UPDATE usuarios u SET xp_gastado_sinks = COALESCE(u.xp_gastado_sinks,0)'
  + '  + (SELECT coste FROM base)'
  + '  WHERE u.id=$1::uuid AND EXISTS (SELECT 1 FROM up)'
  + ' RETURNING u.xp_total, u.xp_gastado_sinks'
  + '), led AS ('
  + ' INSERT INTO xp_ledger (usuario_id, accion, xp_base, xp_final, es_exento, contexto)'
  + ' SELECT $1::uuid, \'carta_nivel\', (SELECT coste FROM base), 0, true,'
  + '  jsonb_build_object(\'carta_id\',$2,\'variante\',$3,'
  + '   \'nivel_nuevo\',(SELECT nivel FROM up),\'coste_xp\',(SELECT coste FROM base))'
  + ' WHERE EXISTS (SELECT 1 FROM up)'
  + ' RETURNING id'
  + ')'
  + ' SELECT (SELECT COUNT(*)::int FROM cartas_catalogo'
  + '   WHERE id=$2 AND activo=true) AS carta_n,'
  + ' (SELECT COUNT(*)::int FROM posee) AS posee_n,'
  + ' (SELECT nivel FROM usuarios_cartas_nivel'
  + '   WHERE usuario_id=$1::uuid AND carta_id=$2) AS nivel_actual,'
  + ' (SELECT nivel FROM up) AS nivel_nuevo,'
  + ' (SELECT coste FROM base) AS coste,'
  + ' (SELECT xp_total FROM deb) AS xp_total,'
  + ' (SELECT xp_gastado_sinks FROM deb) AS xp_gastado_sinks,'
  + ' (SELECT GREATEST(xp_total - COALESCE(xp_gastado_sinks,0),0) FROM usuarios'
  + '   WHERE id=$1::uuid) AS xp_disponible';

var Q_CONTEO =
  'SELECT (SELECT count(*) FROM usuarios)::int AS usuarios,'
  + ' (SELECT count(*) FROM usuarios_cartas)::int AS usuarios_cartas,'
  + ' (SELECT count(*) FROM cartas_catalogo)::int AS cartas_catalogo,'
  + ' (SELECT count(*) FROM xp_ledger)::int AS xp_ledger,'
  + ' (SELECT count(*) FROM usuarios_cartas_nivel)::int AS niveles,'
  + ' (SELECT count(*) FROM cartas_media)::int AS cartas_media';

function resumen(pre, post) {
  return 'usuarios ' + pre.usuarios + '->' + post.usuarios
    + ' / usuarios_cartas ' + pre.usuarios_cartas + '->' + post.usuarios_cartas
    + ' / cartas_catalogo ' + pre.cartas_catalogo + '->' + post.cartas_catalogo
    + ' / xp_ledger ' + pre.xp_ledger + '->' + post.xp_ledger
    + ' / niveles ' + pre.niveles + '->' + post.niveles
    + ' / cartas_media ' + pre.cartas_media + '->' + post.cartas_media;
}

// -- CASOS PUROS: helpers de lib (corren sin base) ---------------------------
function casosPuros() {
  var s0 = CartasConfig.statsNormalizados(null);
  check('C0.1 stats ausente -> ceros sin NaN',
    s0.alcance === 0 && s0.oficio === 0 && s0.fortuna === 0
    && s0.rendimiento === 0 && s0.presencia === 0 && s0.primario === '',
    'alineal=' + s0.alcance);

  var stats = { primario: 'alcance', alcance: 14, oficio: 0, fortuna: 10,
    rendimiento: 0, presencia: 0, bonus_xp_pct: 50 };
  var base = CartasConfig.poderCarta(stats, 1, 'base');
  check('C0.2 poder base = suma de ejes jugables (bonus_xp_pct inerte)',
    base === 24, 'poder=' + base);
  var shiny = CartasConfig.poderCarta(stats, 1, 'shiny');
  check('C0.3 shiny dorado +6 al primario', shiny === 30, 'poder=' + shiny);
  var n5 = CartasConfig.poderCarta(stats, 5, 'shiny');
  check('C0.4 nivel 5 = base + shiny + 4', n5 === 34, 'poder=' + n5);
  var cos = CartasConfig.poderCarta(
    { primario: 'presencia', presencia: 24 }, 5, 'shiny');
  check('C0.5 presencia NO entra en poder', cos === 0, 'poder=' + cos);
  check('C0.6 costes de nivel 150/400/900/1800 y 0 en el tope',
    CartasConfig.costeSubidaNivel(1) === 150
    && CartasConfig.costeSubidaNivel(2) === 400
    && CartasConfig.costeSubidaNivel(3) === 900
    && CartasConfig.costeSubidaNivel(4) === 1800
    && CartasConfig.costeSubidaNivel(5) === 0
    && CartasConfig.CARTA_NIVEL_TOPE === 5);

  // C8 (parte estatica): las 9 claves historicas de cartas_mias siguen en el
  // codigo y las nuevas del contrato 3.6 existen. No es una lectura de BD.
  var src = fs.readFileSync(path.join(__dirname, '..', 'api', 'usuarios.js'), 'utf8');
  var historicas = ['id: c.id', 'nombre: c.nombre', 'set_slug: c.set_slug',
    'rareza: c.rareza', 'nivel_gate: c.nivel_gate', 'es_evento: c.es_evento',
    'imagen_url: c.imagen_url', 'cantidad: vTotal', 'activa: vPosesion'];
  var faltan = historicas.filter(function (k) { return src.indexOf(k) === -1; });
  check('C8.1 cartas_mias conserva las 9 claves historicas', faltan.length === 0,
    faltan.join(','));
  var nuevas = ['familia: c.familia', 'subtipo: c.subtipo', 'edicion: c.edicion',
    'supply_max:', 'emitidas:', 'precio_xp:', 'stats: CartasConfig.statsNormalizados',
    'nivel: cmNv', 'poder: cmPoder'];
  var faltanN = nuevas.filter(function (k) { return src.indexOf(k) === -1; });
  check('C8.2 cartas_mias emite stats/nivel/poder (contrato 3.6)',
    faltanN.length === 0, faltanN.join(','));
  var museo = ['poder: CartasConfig.poderCarta(c.stats_json, mpNv, mpVar)',
    'nivel: mpNv'];
  var faltanM = museo.filter(function (k) { return src.indexOf(k) === -1; });
  check('C8.3 museo_cartas emite nivel y poder', faltanM.length === 0,
    faltanM.join(','));

  // Contrato del handler: los dos cobros NUNCA reciben bono, y la acunacion
  // usa un tipo PROPIO (carta_acunar): carta_comprar pertenece al mercado
  // P2P (oferta_id) y declararlo antes que el dejo la rama muerta.
  var ints = fs.readFileSync(path.join(__dirname, '..', 'api', 'interacciones.js'), 'utf8');
  check('C0.7 carta_compra y carta_nivel en BONO_EXCLUIDAS',
    ints.indexOf('carta_compra: true, carta_nivel: true') !== -1);
  check('C0.8 acunacion con tipo propio y mercado P2P intacto',
    ints.indexOf("tipo2 === 'carta_acunar'") !== -1
    && ints.indexOf("tipo2 === 'carta_subir_nivel'") !== -1
    && ints.indexOf("tipo2 === 'carta_comprar'") !== -1
    && ints.indexOf("tipo2 === 'carta_comprar'") < ints.indexOf("tipo2 === 'carta_acunar'"),
    'carta_comprar es del mercado (T11.2)');

  // E0 (spec 6): media UGC. Las constantes y la maquina de estados se prueban
  // desde lib (una sola fuente), y el contrato de los handlers por su fuente.
  check('E0.1 media: 4 tipos, coste 50 XP y limites 3 pendientes / 10 aprobadas',
    CartasConfig.MEDIA_TIPOS.length === 4
    && CartasConfig.MEDIA_TIPOS.indexOf('poema') !== -1
    && CartasConfig.CARTA_MEDIA_XP_COSTE === 50
    && CartasConfig.CARTA_MEDIA_PENDIENTES_MAX === 3
    && CartasConfig.CARTA_MEDIA_APROBADAS_30D_MAX === 10);
  check('E0.2 transiciones: pendiente->aprobada/rechazada; retirada es final',
    CartasConfig.transicionMediaValida('pendiente', 'aprobada')
    && CartasConfig.transicionMediaValida('pendiente', 'rechazada')
    && !CartasConfig.transicionMediaValida('pendiente', 'retirada')
    && CartasConfig.transicionMediaValida('rechazada', 'pendiente')
    && CartasConfig.transicionMediaValida('aprobada', 'retirada')
    && !CartasConfig.transicionMediaValida('retirada', 'aprobada'));
  check('E0.3 handler: cobro sin bono y guard MEDIA_NO_APROBADA en carta_acunar',
    ints.indexOf('carta_media_envio: true') !== -1
    && ints.indexOf('MEDIA_NO_APROBADA') !== -1
    && ints.indexOf('AS media_ok') !== -1
    && ints.indexOf("tipo2 === 'carta_media_subir'") !== -1
    && ints.indexOf("tipo2 === 'cartas_media_mias'") !== -1
    && ints.indexOf('LICENCIA_NO_ACEPTADA') !== -1);
  var adm = fs.readFileSync(path.join(__dirname, '..', 'api', 'admin.js'), 'utf8');
  check('E0.4 admin: cola, moderar y validacion del vinculo carta -> obra',
    adm.indexOf("tipoCa === 'cartas_media_lista'") !== -1
    && adm.indexOf("tipoCa === 'cartas_media_moderar'") !== -1
    && adm.indexOf('validarMediaCarta') !== -1
    && adm.indexOf('MEDIA_AUTOR_INCOHERENTE') !== -1
    && adm.indexOf('MEDIA_CON_OFERTAS') !== -1);
}

// ---------------- D-25 / D-24: handler REAL con doble de neon -----------------
// api/admin.js crea su cliente con neon(DATABASE_URL) al entrar, asi que aqui
// se sustituye el MODULO por un doble en memoria y se carga el handler real:
// req/res simulados, 0 red y 0 escrituras. El doble se retira en el acto, de
// modo que la seccion con base de datos de abajo sigue usando el modulo real.
async function casosHandlers() {
  var rutaNeon = require.resolve('@neondatabase/serverless');
  var cacheNeon = require.cache[rutaNeon];
  var rutaAdm = require.resolve('../api/admin.js');
  var sqlActual = null;
  function sqlDoble(t, p) { return sqlActual(String(t), p || []); }
  sqlDoble.transaction = function (fn) {
    return Promise.all(fn(function (t, p) { return sqlActual(String(t), p || []); }));
  };
  require.cache[rutaNeon] = {
    id: rutaNeon, filename: rutaNeon, loaded: true,
    exports: { neon: function () { return sqlDoble; } }
  };
  delete require.cache[rutaAdm];
  var hAdm = require(rutaAdm);
  if (cacheNeon) require.cache[rutaNeon] = cacheNeon;
  else delete require.cache[rutaNeon];

  var secPrev = process.env.ADMIN_SECRET;
  var usrPrev = process.env.ADMIN_USER_ID;
  process.env.ADMIN_SECRET = 'smk-admin-secret';

  function mkRes() {
    var r = { code: 0, cuerpo: null };
    r.setHeader = function () { return r; };
    r.status = function (c) { r.code = c; return r; };
    r.json = function (o) { r.cuerpo = o; return r; };
    r.end = function () { return r; };
    return r;
  }
  async function pedir(metodo, query, cuerpo) {
    var res = mkRes();
    await hAdm({ method: metodo, query: query, body: cuerpo,
      headers: { authorization: 'Bearer ' + process.env.ADMIN_SECRET } }, res);
    return res;
  }

  var ENV = '11111111-1111-4111-8111-111111111111';
  var CUERPO = '22222222-2222-4222-8222-222222222222';
  var NADA = '00000000-0000-4000-8000-000000000000';

  function fakeModerar(usuarioQueExiste) {
    var store = { mod: undefined };
    sqlActual = function (t, p) {
      if (t.indexOf('FROM usuarios') !== -1)
        return Promise.resolve(p[0] === usuarioQueExiste ? [{ id: p[0] }] : []);
      if (t.indexOf('FROM cartas_media') !== -1
          && t.indexOf('estado_moderacion, licencia') !== -1)
        return Promise.resolve([{ estado_moderacion: 'pendiente', licencia: 'cc-by' }]);
      if (t.indexOf('FOR UPDATE') !== -1)
        return Promise.resolve([{ id: 'm1', estado_moderacion: 'pendiente', cartas_n: 0 }]);
      if (t.indexOf('UPDATE cartas_media') !== -1) {
        store.mod = p[3];
        return Promise.resolve([{ id: 'm1', estado_moderacion: p[1], moderado_por: p[3] }]);
      }
      return Promise.resolve([]);
    };
    return store;
  }
  function modBody(extra) {
    var b = { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', estado: 'aprobada' };
    var k;
    for (k in extra) b[k] = extra[k];
    return b;
  }
  var QA = { recurso: 'cartas', tipo: 'cartas_media_moderar' };
  var s, r;

  // D-25: la variable de entorno prevalece.
  process.env.ADMIN_USER_ID = ENV;
  s = fakeModerar(ENV);
  r = await pedir('POST', QA, modBody({ moderado_por: CUERPO }));
  check('F1.1 D-25: ADMIN_USER_ID existente gana sobre body.moderado_por',
    r.code === 200 && s.mod === ENV && r.cuerpo.identidad_origen === 'env'
    && r.cuerpo.identidad_admin === true,
    'code=' + r.code + ' origen=' + (r.cuerpo && r.cuerpo.identidad_origen));

  s = fakeModerar(ENV);
  r = await pedir('POST', QA, modBody({ moderado_por: 'no-es-uuid' }));
  check('F1.2 D-25: body mal formado se ignora con env (sin 400)',
    r.code === 200 && s.mod === ENV && r.cuerpo.identidad_origen === 'env',
    'code=' + r.code);

  delete process.env.ADMIN_USER_ID;
  s = fakeModerar(CUERPO);
  r = await pedir('POST', QA, modBody({ moderado_por: CUERPO }));
  check('F1.3 D-25: sin env, body con uuid existente -> body',
    r.code === 200 && s.mod === CUERPO && r.cuerpo.identidad_origen === 'body'
    && r.cuerpo.identidad_admin === false,
    'code=' + r.code + ' origen=' + (r.cuerpo && r.cuerpo.identidad_origen));

  s = fakeModerar(CUERPO);
  r = await pedir('POST', QA, modBody({ moderado_por: 'basura' }));
  check('F1.4 D-25: sin env y body basura -> moderado_por NULL / ninguna',
    r.code === 200 && s.mod === null && r.cuerpo.identidad_origen === 'ninguna',
    'code=' + r.code + ' mod=' + String(s.mod));

  process.env.ADMIN_USER_ID = '33333333-3333-4333-8333-333333333333';
  s = fakeModerar(NADA);
  r = await pedir('POST', QA, modBody({ moderado_por: '44444444-4444-4444-8444-444444444444' }));
  check('F1.5 D-25: uuid inexistente en env y body -> NULL / ninguna',
    r.code === 200 && s.mod === null && r.cuerpo.identidad_origen === 'ninguna',
    'code=' + r.code + ' mod=' + String(s.mod));

  delete process.env.ADMIN_USER_ID;
  s = fakeModerar(NADA);
  r = await pedir('POST', QA, modBody({ moderado_por: CUERPO }));
  check('F1.6 D-25: body con uuid inexistente -> NULL / ninguna',
    r.code === 200 && s.mod === null && r.cuerpo.identidad_origen === 'ninguna',
    'code=' + r.code + ' mod=' + String(s.mod));

  function fakeEditar(fila) {
    var cap = { sql: '', params: null };
    sqlActual = function (t, p) {
      if (t.indexOf('FROM cartas_catalogo WHERE id=$1') !== -1)
        return Promise.resolve([fila]);
      if (t.indexOf('FROM cartas_ofertas') !== -1) return Promise.resolve([]);
      if (t.indexOf('UPDATE cartas_catalogo SET') !== -1) {
        cap.sql = t; cap.params = p;
        return Promise.resolve([{ id: fila.id }]);
      }
      return Promise.resolve([]);
    };
    return cap;
  }
  function precioDe(cap) {
    var m = cap.sql.match(/precio_xp=\$(\d+)/);
    if (!m) return 'SIN_SET';
    return cap.params[Number(m[1]) - 1];
  }
  function filaBase(over) {
    var f = {
      id: 'c1', nivel_gate: null, es_evento: false, es_canjeable_qr: false,
      emisor_tipo: 'sistema', emisor_id: null, marca_id: null, fusionable: true,
      activo: false, familia: 'lugar', subtipo: 'territorio', edicion: 'abierta',
      supply_max: null, precio_xp: null, emitidas: 0, stats_json: {},
      media_id: null, rareza: 'comun'
    };
    var k;
    for (k in over) f[k] = over[k];
    return f;
  }
  var QE = { recurso: 'cartas', tipo: 'cartas_editar' };
  var cap;

  // D-24: auto-precio al editar (fila con precio NULL = el bug que se cierra).
  cap = fakeEditar(filaBase());
  r = await pedir('POST', QE, { id: 'c1', descripcion: 'nueva' });
  check('F2.1 D-24: lugar sin precio_xp -> 150', r.code === 200 && precioDe(cap) === 150,
    'code=' + r.code + ' precio=' + precioDe(cap));

  cap = fakeEditar(filaBase({ familia: 'personaje', subtipo: 'historico', rareza: 'raro' }));
  r = await pedir('POST', QE, { id: 'c1', descripcion: 'nueva' });
  check('F2.2 D-24: personaje raro -> 480', r.code === 200 && precioDe(cap) === 480,
    'code=' + r.code + ' precio=' + precioDe(cap));

  cap = fakeEditar(filaBase({ precio_xp: '150.00' }));
  r = await pedir('POST', QE, { id: 'c1', rareza: 'dorado' });
  check('F2.3 D-24: cambiar rareza comun->dorado recalcula 2500',
    r.code === 200 && precioDe(cap) === 2500,
    'code=' + r.code + ' precio=' + precioDe(cap));

  cap = fakeEditar(filaBase({ precio_xp: '150.00' }));
  r = await pedir('POST', QE, { id: 'c1', rareza: 'dorado', precio_xp: 777 });
  check('F2.4 D-24: precio_xp explicito manda sobre el recalculo',
    r.code === 200 && precioDe(cap) === 777,
    'code=' + r.code + ' precio=' + precioDe(cap));

  cap = fakeEditar(filaBase({ precio_xp: '150.00' }));
  r = await pedir('POST', QE, { id: 'c1', familia: 'producto', subtipo: 'fisico',
    stats_json: { sku: 'SMK-1' } });
  check('F2.5 D-24: familia producto fuerza precio_xp NULL',
    r.code === 200 && precioDe(cap) === null,
    'code=' + r.code + ' precio=' + String(precioDe(cap)));

  cap = fakeEditar(filaBase({ precio_xp: '150.00' }));
  r = await pedir('POST', QE, { id: 'c1', descripcion: 'nueva' });
  check('F2.6 D-24: idempotente, no reescribe si el precio ya coincide',
    r.code === 200 && precioDe(cap) === 'SIN_SET',
    'code=' + r.code + ' precio=' + precioDe(cap));

  cap = fakeEditar(filaBase({ rareza: 'legendaria', precio_xp: '150.00' }));
  r = await pedir('POST', QE, { id: 'c1', precio_xp: '' });
  check('F2.7 D-24: rareza no determinable -> 400 PRECIO_NO_DETERMINABLE',
    r.code === 400 && r.cuerpo.error === 'PRECIO_NO_DETERMINABLE',
    'code=' + r.code + ' error=' + (r.cuerpo && r.cuerpo.error));

  if (secPrev === undefined) delete process.env.ADMIN_SECRET;
  else process.env.ADMIN_SECRET = secPrev;
  if (usrPrev === undefined) delete process.env.ADMIN_USER_ID;
  else process.env.ADMIN_USER_ID = usrPrev;
  delete require.cache[rutaAdm];
}

async function main() {
  console.log('== SMOKE CARTAS ECONOMIA - compra con XP, nivel y lecturas');
  console.log('');

  casosPuros();
  await casosHandlers();

  var motivo = motivoSinBase();
  if (motivo) {
    console.log('SKIP sin base de datos: ' + motivo);
    console.log('----');
    console.log('TOTAL checks=' + num + ' PASS=' + (num - fallos)
      + ' FAIL=' + fallos + ' SKIP=1');
    process.stdout.write('', function () { process.exit(fallos ? 1 : 0); });
    return;
  }

  var srv = require('@neondatabase/serverless');
  var client = new srv.Client(process.env.DATABASE_URL);
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

  try {
    await client.connect();
  } catch (e) {
    console.log('SKIP no se pudo abrir la conexion con la credencial presente: '
      + (e && e.code ? String(e.code) + ' ' : '') + limpiar(e && e.message));
    console.log('----');
    console.log('TOTAL checks=' + num + ' PASS=' + (num - fallos)
      + ' FAIL=' + fallos + ' SKIP=1');
    salir(0);
    return;
  }

  var pre = null;
  try {
    pre = await q1(Q_CONTEO);
    await q('BEGIN');
    enTx = true;

    var famSinPrecio = JSON.stringify(CartasConfig.CARTA_FAMILIAS_SIN_PRECIO_XP);
    var costes = CartasConfig.CARTA_NIVEL_XP;
    var variante = CartasConfig.CARTA_VARIANTE_DEFECTO;

    // Usuario REAL (la FK usuarios_cartas -> usuarios no admite uuid inventado).
    var usr = await q1(
      'SELECT id::text AS id FROM usuarios ORDER BY creado_en ASC NULLS LAST LIMIT 1');
    if (!usr) {
      skip('C1..C7 con base', 'la tabla usuarios esta vacia');
    } else {
      var uid = usr.id;
      // Saldo de trabajo dentro de la tx: xp_total es el techo de nivel y no se
      // toca en la compra; xp_gastado_sinks es el saldo consumido.
      await q('UPDATE usuarios SET xp_total = 100000, xp_gastado_sinks = 0 WHERE id=$1::uuid', [uid]);

      // Se usa una carta REAL coleccionable del catalogo. NO se INSERTan filas
      // de cartas_catalogo: este smoke no tiene por que conocer los UNIQUE/FK
      // no documentados del esquema, y un clon podria reventarlos. El precio,
      // la edicion y el techo se fijan DENTRO de la tx (el ROLLBACK restaura).
      // No se exige precio_xp > 0 en el SELECT: la 066 lo deja NULLABLE y el
      // backfill de valor no es parte de este contrato (se fija aqui).
      var carta = await q1(
        'SELECT id FROM cartas_catalogo WHERE activo=true'
        + ' AND familia NOT IN (SELECT jsonb_array_elements_text($1::jsonb))'
        + ' ORDER BY id LIMIT 1', [famSinPrecio]);
      if (!carta) {
        skip('C1..C7 con base', 'no hay carta coleccionable con precio_xp');
      } else {
        var cartaId = String(carta.id);
        var precio = Number(costes[0]);
        await q('UPDATE cartas_catalogo SET precio_xp=$2::numeric, edicion=\'abierta\','
          + ' supply_max=NULL, emitidas=0 WHERE id=$1', [cartaId, precio]);
        // Estado de partida (la carta puede estar ya en la coleccion del usuario
        // y puede tener asientos previos de una corrida real): los casos miden
        // DELTAS, nunca valores absolutos.
        var inv0q = await q1(
          'SELECT COALESCE(SUM(cantidad),0)::int AS n FROM usuarios_cartas'
          + ' WHERE usuario_id=$1::uuid AND carta_id=$2', [uid, cartaId]);
        var led0q = await q1(
          'SELECT COUNT(*)::int AS n FROM xp_ledger WHERE usuario_id=$1::uuid'
          + ' AND accion=\'carta_compra\' AND contexto->>\'carta_id\'=$2', [uid, cartaId]);
        var niv0q = await q1(
          'SELECT COUNT(*)::int AS n FROM xp_ledger WHERE usuario_id=$1::uuid'
          + ' AND accion=\'carta_nivel\' AND contexto->>\'carta_id\'=$2', [uid, cartaId]);
        var inv0 = Number(inv0q && inv0q.n) || 0;
        var led0 = Number(led0q && led0q.n) || 0;
        var niv0 = Number(niv0q && niv0q.n) || 0;

        // C1 compra feliz
        var r1 = await q1(SQL_COMPRA, [uid, cartaId, variante, famSinPrecio]);
        var inv1 = await q1(
          'SELECT COALESCE(SUM(cantidad),0)::int AS n FROM usuarios_cartas'
          + ' WHERE usuario_id=$1::uuid AND carta_id=$2', [uid, cartaId]);
        var led1 = await q1(
          'SELECT COUNT(*)::int AS n FROM xp_ledger WHERE usuario_id=$1::uuid AND accion=\'carta_compra\''
          + ' AND contexto->>\'carta_id\'=$2', [uid, cartaId]);
        var usr1 = await q1(
          'SELECT COALESCE(xp_gastado_sinks,0)::numeric AS sinks FROM usuarios WHERE id=$1::uuid', [uid]);
        check('C1 compra feliz: inventario +1, cargo, emitidas y asiento',
          r1 && Number(r1.cantidad) >= 1 && Number(r1.emitidas) === 1
          && inv1 && Number(inv1.n) === inv0 + 1
          && Number(usr1.sinks) === precio
          && led1 && Number(led1.n) === led0 + 1,
          'cant=' + (r1 && r1.cantidad) + ' emit=' + (r1 && r1.emitidas)
          + ' inv=' + inv0 + '->' + (inv1 && inv1.n)
          + ' sinks=' + (usr1 && usr1.sinks) + ' led=' + (led1 && led1.n));

        // C2 sin XP: 0 filas y sin cargo ni emision adicional
        await q('UPDATE usuarios SET xp_total = 0, xp_gastado_sinks = 0 WHERE id=$1::uuid', [uid]);
        var r2 = await q1(SQL_COMPRA, [uid, cartaId, variante, famSinPrecio]);
        var emit2 = await q1('SELECT emitidas FROM cartas_catalogo WHERE id=$1', [cartaId]);
        check('C2 sin XP: 0 filas, sin cargo ni emision',
          r2 && r2.cantidad === null && r2.emitidas === null
          && emit2 && Number(emit2.emitidas) === 1,
          'cant=' + (r2 && r2.cantidad) + ' emit=' + (emit2 && emit2.emitidas));

        // C3 sin stock (se fuerza en la tx: limitada con el techo alcanzado)
        await q('UPDATE usuarios SET xp_total = 100000, xp_gastado_sinks = 0 WHERE id=$1::uuid', [uid]);
        await q('UPDATE cartas_catalogo SET edicion=\'limitada\', emitidas=1, supply_max=1 WHERE id=$1', [cartaId]);
        var r3 = await q1(SQL_COMPRA, [uid, cartaId, variante, famSinPrecio]);
        var usr3 = await q1(
          'SELECT COALESCE(xp_gastado_sinks,0)::numeric AS sinks FROM usuarios WHERE id=$1::uuid', [uid]);
        check('C3 sin stock: 0 filas y SIN_COBRAR (codigo SIN_STOCK)',
          r3 && r3.cantidad === null && r3.comprable === true
          && r3.stock_ok === false && Number(usr3.sinks) === 0,
          'stock_ok=' + (r3 && r3.stock_ok) + ' sinks=' + (usr3 && usr3.sinks));

        // C4 producto no comprable
        var prod = await q1(
          'SELECT id FROM cartas_catalogo WHERE familia=\'producto\' LIMIT 1');
        if (!prod) {
          skip('C4 producto no comprable', 'no hay cartas de familia producto');
        } else {
          var r4 = await q1(SQL_COMPRA, [uid, prod.id, variante, famSinPrecio]);
          check('C4 producto: comprable=false (400 CARTA_NO_COMPRABLE)',
            r4 && Number(r4.carta_n) === 1 && r4.comprable === false
            && r4.cantidad === null,
            'comprable=' + (r4 && r4.comprable));
        }

        // C5 nivel 1 -> 2
        await q('UPDATE usuarios SET xp_total = 100000, xp_gastado_sinks = 0 WHERE id=$1::uuid', [uid]);
        await q('UPDATE cartas_catalogo SET edicion=\'abierta\', emitidas=1, supply_max=NULL WHERE id=$1', [cartaId]);
        // Nivel determinista del caso (el ROLLBACK restaura el valor real).
        await q('UPDATE usuarios_cartas_nivel SET nivel=1, xp_invertido=0'
          + ' WHERE usuario_id=$1::uuid AND carta_id=$2', [uid, cartaId]);
        var r5 = await q1(SQL_NIVEL, [uid, cartaId, variante,
          costes[0], costes[1], costes[2], costes[3], null]);
        var usr5 = await q1(
          'SELECT COALESCE(xp_gastado_sinks,0)::numeric AS sinks FROM usuarios WHERE id=$1::uuid', [uid]);
        check('C5 nivel 1 -> 2: nivel 2 y cargo 150',
          r5 && Number(r5.nivel_nuevo) === 2 && Number(r5.coste) === 150
          && Number(usr5.sinks) === 150,
          'nivel=' + (r5 && r5.nivel_nuevo) + ' coste=' + (r5 && r5.coste)
          + ' sinks=' + (usr5 && usr5.sinks));

        // C6 doble clic: mismo request con nivel_esperado viejo (1) -> 0 filas
        var r6 = await q1(SQL_NIVEL, [uid, cartaId, variante,
          costes[0], costes[1], costes[2], costes[3], 1]);
        var ledN = await q1(
          'SELECT COUNT(*)::int AS n FROM xp_ledger WHERE usuario_id=$1::uuid AND accion=\'carta_nivel\''
          + ' AND contexto->>\'carta_id\'=$2', [uid, cartaId]);
        var usr6 = await q1(
          'SELECT COALESCE(xp_gastado_sinks,0)::numeric AS sinks FROM usuarios WHERE id=$1::uuid', [uid]);
        check('C6 doble clic: 0 filas, sin doble cargo (1 asiento)',
          r6 && r6.nivel_nuevo === null && r6.nivel_actual === 2
          && Number(usr6.sinks) === 150 && ledN && Number(ledN.n) === niv0 + 1,
          'nuevo=' + (r6 && r6.nivel_nuevo) + ' sinks=' + (usr6 && usr6.sinks)
          + ' led=' + (ledN && ledN.n));

        // C7 nivel en el tope
        await q('UPDATE usuarios_cartas_nivel SET nivel=5 WHERE usuario_id=$1::uuid AND carta_id=$2', [uid, cartaId]);
        await q('UPDATE usuarios SET xp_total = 100000, xp_gastado_sinks = 0 WHERE id=$1::uuid', [uid]);
        var r7 = await q1(SQL_NIVEL, [uid, cartaId, variante,
          costes[0], costes[1], costes[2], costes[3], null]);
        var usr7 = await q1(
          'SELECT COALESCE(xp_gastado_sinks,0)::numeric AS sinks FROM usuarios WHERE id=$1::uuid', [uid]);
        check('C7 nivel 5: 0 filas y sin cargo (codigo NIVEL_MAX)',
          r7 && r7.nivel_nuevo === null && Number(r7.nivel_actual) === 5
          && Number(usr7.sinks) === 0,
          'actual=' + (r7 && r7.nivel_actual) + ' sinks=' + (usr7 && usr7.sinks));
      }

      // ============ D-15 / D-17: MERCADO DE CARTAS (spec 6.4 / 9.2) =========
      // El SQL que corre aqui es el DEL HANDLER, extraido de su propio fuente:
      // no hay copia que pueda derivar del original. Si una edicion del
      // statement rompe el contrato, este smoke lo ve.
      var mkSrc = fs.readFileSync(path.join(__dirname, '..', 'api', 'interacciones.js'), 'utf8');
      function mkSql(ancla, hasta) {
        var i0 = mkSrc.indexOf(ancla);
        if (i0 < 0) throw new Error('ancla ausente: ' + ancla);
        var j0 = mkSrc.indexOf("'", i0);
        var i1 = mkSrc.indexOf(hasta, j0);
        if (i1 < 0) throw new Error('fin ausente: ' + hasta);
        var trozo = mkSrc.slice(j0, i1 + hasta.length);
        var re = /'((?:[^'\\]|\\.)*)'/g;
        var m, out = '';
        while ((m = re.exec(trozo)) !== null) {
          out += m[1].replace(/\\'/g, "'").replace(/\\\\/g, '\\');
        }
        return out;
      }
      var SQL_PUBLICAR = mkSql('cpRes = await sql(', "AS expira_en'");
      var SQL_VENTA = mkSql('cbcRes = await sql(', "AS neto'");
      // El SELECT/FROM/JOIN del libro se extrae del handler; sus predicados se
      // arman aqui porque el original los compone con coWhere.join (no son
      // literales). Las dos condiciones nuevas se verifican ademas en la fuente.
      var SQL_LIBRO = mkSql('coRows = await sql(', "' WHERE '")
        + ' o.activo = true AND o.estado IN (\'abierta\',\'parcial\')'
        + ' AND o.cantidad_restante > 0 AND (o.expira_en IS NULL OR o.expira_en > NOW())'
        + ' AND c.activo = true'
        + ' AND c.familia NOT IN (SELECT jsonb_array_elements_text($1::jsonb))'
        + ' ORDER BY o.precio_xp ASC, o.creado_en ASC LIMIT $2';
      var mkLibroSrc = mkSrc.slice(mkSrc.indexOf("tipo === 'cartas_ofertas'"),
        mkSrc.indexOf("tipo === 'resenas'"));
      check('D15c-fuente libro: declara c.activo=true y excluye las familias',
        mkLibroSrc.indexOf("coWhere.push('c.activo = true')") !== -1
        && mkLibroSrc.indexOf("c.familia NOT IN (SELECT jsonb_array_elements_text($") !== -1);

      // ============ E: MEDIA UGC (spec 6) ==================================
      // SQL_ENVIO se EXTRAE del handler con mkSql: no hay copia que derive.
      // Los CHECK de cartas_media (067/068) se prueban contra Neon de verdad,
      // con SAVEPOINT por caso para que un 23514 esperado no aborte la tx.
      if (!uid || !cartaId) {
        skip('E media UGC', 'sin usuario o carta real para el fixture');
      } else {
        var SQL_ENVIO = mkSql('cmsRes = await sql(', "AS xp_disponible'");
        async function esperaMed(fn) {
          await q('SAVEPOINT sp_media');
          try {
            await fn();
            await q('RELEASE SAVEPOINT sp_media');
            return '';
          } catch (eMed) {
            await q('ROLLBACK TO SAVEPOINT sp_media');
            return String((eMed && eMed.code) || '') + ' '
              + String((eMed && eMed.message) || '');
          }
        }
        var autMed = (await q1('SELECT gen_random_uuid()::text AS id')).id;

        var e1m = await q1('INSERT INTO cartas_media (autor_id, tipo, titulo, media_url,'
          + ' licencia_aceptada_en)'
          + " VALUES ($1::uuid,'foto','smk_media','https://x/m.jpg',NOW())"
          + ' RETURNING estado_moderacion, licencia', [autMed]);
        check('E1 media pendiente sin licencia: se RECIBE (nada nace aprobado)',
          e1m && e1m.estado_moderacion === 'pendiente' && e1m.licencia === null);

        var e2m = await esperaMed(function () {
          return q('INSERT INTO cartas_media (autor_id, tipo, titulo, media_url)'
            + " VALUES ($1::uuid,'foto','x','   ')", [autMed]);
        });
        check('E2 media vacia (media_url en blanco) -> 23514', e2m.indexOf('23514') === 0);

        var e3m = await esperaMed(function () {
          return q('INSERT INTO cartas_media (autor_id, tipo, titulo, media_url)'
            + " VALUES ($1::uuid,'podcast','x','https://x/a.mp3')", [autMed]);
        });
        check('E3 tipo invalido -> 23514 chk_cartas_media_tipo', e3m.indexOf('23514') === 0);

        var e4m = await esperaMed(function () {
          return q('INSERT INTO cartas_media (autor_id, tipo, titulo, media_url)'
            + " VALUES ($1::uuid,'poema','x','https://x/p.txt')", [autMed]);
        });
        check('E4 poema sin texto -> 23514 chk_cartas_media_poema', e4m.indexOf('23514') === 0);

        var pendMed = await q1('INSERT INTO cartas_media (autor_id, tipo, titulo, media_url)'
          + " VALUES ($1::uuid,'foto','smk_pend','https://x/p.jpg') RETURNING id", [autMed]);
        var e5m = await esperaMed(function () {
          return q("UPDATE cartas_media SET estado_moderacion='aprobada', moderado_en=NOW()"
            + ' WHERE id=$1::uuid', [pendMed.id]);
        });
        check('E5 aprobar sin licencia -> 23514 chk_cartas_media_licencia',
          e5m.indexOf('23514') === 0 && e5m.indexOf('chk_cartas_media_licencia') >= 0);

        var e6m = await q1("UPDATE cartas_media SET licencia='cc-by',"
          + " estado_moderacion='aprobada', moderado_en=NOW() WHERE id=$1::uuid"
          + ' RETURNING estado_moderacion', [pendMed.id]);
        check('E6 aprobar con licencia -> aprobada',
          e6m && e6m.estado_moderacion === 'aprobada');

        var e7m = await esperaMed(function () {
          return q("UPDATE cartas_media SET estado_moderacion='rechazada', moderado_en=NOW()"
            + ' WHERE id=$1::uuid', [pendMed.id]);
        });
        var e7mA = await q1("UPDATE cartas_media SET motivo='sin derechos',"
          + " estado_moderacion='rechazada', moderado_en=NOW() WHERE id=$1::uuid"
          + ' RETURNING motivo', [pendMed.id]);
        check('E7 rechazo sin motivo -> 23514; con motivo -> OK',
          e7m.indexOf('23514') === 0 && e7mA && e7mA.motivo === 'sin derechos');

        var e8m = await esperaMed(function () {
          return q('UPDATE cartas_catalogo SET media_id=gen_random_uuid() WHERE id=$1',
            [cartaId]);
        });
        check('E8 FK media inexistente -> 23503 (no se vincula una obra fantasma)',
          e8m.indexOf('23503') === 0);

        var e9pend = await q1('INSERT INTO cartas_media (autor_id, tipo, titulo, media_url)'
          + " VALUES ($1::uuid,'foto','smk_pred','https://x/pr.jpg') RETURNING id", [autMed]);
        await q('UPDATE cartas_catalogo SET media_id=$2::uuid WHERE id=$1',
          [cartaId, e9pend.id]);
        var SQL_MEDIA_OK = 'SELECT (c.media_id IS NULL OR EXISTS (SELECT 1 FROM cartas_media m'
          + " WHERE m.id=c.media_id AND m.estado_moderacion='aprobada' AND m.activo=true))"
          + ' AS media_ok FROM cartas_catalogo c WHERE c.id=$1';
        var e9a = await q1(SQL_MEDIA_OK, [cartaId]);
        await q("UPDATE cartas_media SET licencia='cc-by', estado_moderacion='aprobada',"
          + ' moderado_en=NOW() WHERE id=$1::uuid', [e9pend.id]);
        var e9b = await q1(SQL_MEDIA_OK, [cartaId]);
        check('E9 carta con media no aprobada: media_ok=false; aprobada: true',
          e9a && e9a.media_ok === false && e9b && e9b.media_ok === true);

        await q("INSERT INTO cartas_media (autor_id, tipo, titulo, media_url, licencia,"
          + " estado_moderacion, moderado_en) VALUES ($1::uuid,'foto','smk_gate',"
          + " 'https://x/g.jpg','cc-by','aprobada',NOW())", [uid]);
        await q('UPDATE usuarios SET xp_total=100000, xp_gastado_sinks=0 WHERE id=$1::uuid', [uid]);
        var e10p = [uid, 'foto', 'smk_envio', 'https://x/e.jpg', null, null, null,
          30, CartasConfig.CARTA_MEDIA_RESENA_XP_MIN,
          CartasConfig.CARTA_MEDIA_RESENAS_LARGAS_MIN, CartasConfig.CARTA_MEDIA_XP_COSTE,
          CartasConfig.CARTA_MEDIA_PENDIENTES_MAX, CartasConfig.CARTA_MEDIA_APROBADAS_30D_MAX,
          'cc-by', new Date().toISOString()];
        var e10m = await q1(SQL_ENVIO, e10p);
        var e10led = await q1("SELECT COUNT(*)::int AS n FROM xp_ledger"
          + " WHERE usuario_id=$1::uuid AND accion='carta_media_envio'", [uid]);
        check('E10 envio UGC: obra pendiente + cargo 50 + asiento carta_media_envio',
          e10m && e10m.id && e10m.estado_moderacion === 'pendiente'
          && Number(e10m.xp_gastado_sinks) === CartasConfig.CARTA_MEDIA_XP_COSTE
          && Number(e10led.n) === 1);

        await q('UPDATE usuarios SET xp_total=49, xp_gastado_sinks=0 WHERE id=$1::uuid', [uid]);
        var e11m = await q1(SQL_ENVIO, e10p);
        var e11led = await q1("SELECT COUNT(*)::int AS n FROM xp_ledger"
          + " WHERE usuario_id=$1::uuid AND accion='carta_media_envio'", [uid]);
        check('E11 sin XP: 0 filas, sin obra y sin asiento (fail-closed)',
          e11m && e11m.id === null && Number(e11led.n) === 1);

        await q('UPDATE usuarios SET xp_total=100000, xp_gastado_sinks=0 WHERE id=$1::uuid', [uid]);
        await q(SQL_ENVIO, e10p);
        await q(SQL_ENVIO, e10p);
        var e12led = await q1("SELECT COUNT(*)::int AS n FROM xp_ledger"
          + " WHERE usuario_id=$1::uuid AND accion='carta_media_envio'", [uid]);
        check('E12 doble envio = 2 obras y 2 cargos (sin idempotencia por diseno)',
          Number(e12led.n) === 3);

        await q("UPDATE cartas_media SET estado_moderacion='retirada', activo=false"
          + ' WHERE id=$1::uuid', [e9pend.id]);
        var e13m = await q1('SELECT estado_moderacion, activo FROM cartas_media'
          + ' WHERE id=$1::uuid', [e9pend.id]);
        check('E13 retirada = estado retirada + activo=false (cero DELETE)',
          e13m && e13m.estado_moderacion === 'retirada' && e13m.activo === false);

        // E14..E19: GUARD MEDIA_CON_CARTAS e IDENTIDAD de moderado_por
        // (decision del operador 2026-11-11). El SQL es el DEL HANDLER,
        // extraido de su fuente con el mismo truco que D-15/D-17: si alguien
        // edita el statement, este smoke lo ve. El lock y el UPDATE corren
        // dentro de la tx del smoke (ROLLBACK al final, cero persistencia).
        var advSrc = fs.readFileSync(path.join(__dirname, '..', 'api', 'admin.js'), 'utf8');
        var mkAdm = function (ancla, hasta) {
          var i0 = advSrc.indexOf(ancla);
          if (i0 < 0) throw new Error('ancla ausente: ' + ancla);
          var j0 = advSrc.indexOf("'", i0);
          var i1 = advSrc.indexOf(hasta, j0);
          if (i1 < 0) throw new Error('fin ausente: ' + hasta);
          var trozo = advSrc.slice(j0, i1 + hasta.length);
          var re2 = /'((?:[^'\\]|\\.)*)'/g;
          var m2, out2 = '';
          while ((m2 = re2.exec(trozo)) !== null) {
            out2 += m2[1].replace(/\\'/g, "'").replace(/\\\\/g, '\\');
          }
          return out2;
        };
        var SQL_GUARD_LOCK = mkAdm(
          "tx('SELECT m.id::text AS id, m.estado_moderacion,", "FOR UPDATE'");
        var SQL_GUARD_UPD = mkAdm(
          "tx('UPDATE cartas_media SET estado_moderacion=($2::text)::varchar(12),",
          "creado_en'");

        var medGuard = await q1("INSERT INTO cartas_media (autor_id, tipo, titulo,"
          + " media_url, licencia, estado_moderacion, moderado_en)"
          + " VALUES ($1::uuid,'foto','smk_guard','https://x/gd.jpg','cc-by',"
          + " 'aprobada',NOW()) RETURNING id", [uid]);
        await q('UPDATE cartas_catalogo SET media_id=$2::uuid, activo=true'
          + ' WHERE id=$1', [cartaId, medGuard.id]);

        var gLock1 = await q1(SQL_GUARD_LOCK, [medGuard.id]);
        var gUpd1 = await q(SQL_GUARD_UPD,
          [medGuard.id, 'retirada', null, uid, 'aprobada']);
        var gEst1 = await q1('SELECT estado_moderacion, activo FROM cartas_media'
          + ' WHERE id=$1::uuid', [medGuard.id]);
        check('E14 retirada bloqueada con 1 carta activa: 0 filas y estado intacto',
          gLock1 && Number(gLock1.cartas_n) === 1 && gUpd1.length === 0
          && gEst1 && gEst1.estado_moderacion === 'aprobada' && gEst1.activo === true,
          'cartas_n=' + (gLock1 && gLock1.cartas_n)
          + ' estado=' + (gEst1 && gEst1.estado_moderacion));

        await q('UPDATE cartas_catalogo SET activo=false WHERE id=$1', [cartaId]);
        var gLock2 = await q1(SQL_GUARD_LOCK, [medGuard.id]);
        var gUpd2 = await q(SQL_GUARD_UPD,
          [medGuard.id, 'retirada', null, uid, 'aprobada']);
        var gEst2 = await q1('SELECT estado_moderacion, activo FROM cartas_media'
          + ' WHERE id=$1::uuid', [medGuard.id]);
        // Se restaura el vinculo original: los casos D-15/D-17 corren despues.
        await q('UPDATE cartas_catalogo SET activo=true, media_id=$2::uuid'
          + ' WHERE id=$1', [cartaId, e9pend.id]);
        check('E15 retirada tras desactivar la carta: 1 fila, retirada y activo=false',
          gLock2 && Number(gLock2.cartas_n) === 0 && gUpd2.length === 1
          && gEst2 && gEst2.estado_moderacion === 'retirada'
          && gEst2.activo === false,
          'cartas_n=' + (gLock2 && gLock2.cartas_n)
          + ' estado=' + (gEst2 && gEst2.estado_moderacion));

        var medId1 = await q1("INSERT INTO cartas_media (autor_id, tipo, titulo,"
          + " media_url, licencia) VALUES ($1::uuid,'foto','smk_id1',"
          + " 'https://x/i1.jpg','cc-by') RETURNING id", [uid]);
        var iUpd1 = await q(SQL_GUARD_UPD,
          [medId1.id, 'aprobada', null, uid, 'pendiente']);
        var iRow1 = await q1('SELECT estado_moderacion, moderado_por, moderado_en'
          + ' FROM cartas_media WHERE id=$1::uuid', [medId1.id]);
        check('E16 identidad presente: moderado_por = uuid real y moderado_en escrito',
          iUpd1.length === 1 && iRow1 && iRow1.estado_moderacion === 'aprobada'
          && String(iRow1.moderado_por) === String(uid)
          && iRow1.moderado_en !== null,
          'moderado_por=' + (iRow1 && iRow1.moderado_por));

        var medId2 = await q1("INSERT INTO cartas_media (autor_id, tipo, titulo,"
          + " media_url, licencia) VALUES ($1::uuid,'foto','smk_id2',"
          + " 'https://x/i2.jpg','cc-by') RETURNING id", [uid]);
        var iUpd2 = await q(SQL_GUARD_UPD,
          [medId2.id, 'aprobada', null, null, 'pendiente']);
        var iRow2 = await q1('SELECT estado_moderacion, moderado_por FROM'
          + ' cartas_media WHERE id=$1::uuid', [medId2.id]);
        check('E17 identidad ausente: moderado_por NULL y la moderacion pasa',
          iUpd2.length === 1 && iRow2 && iRow2.estado_moderacion === 'aprobada'
          && iRow2.moderado_por === null);

        var idFant = (await q1('SELECT gen_random_uuid()::text AS id')).id;
        var iExiste = await q('SELECT id::text AS id FROM usuarios'
          + ' WHERE id=$1::uuid LIMIT 1', [idFant]);
        var medId3 = await q1("INSERT INTO cartas_media (autor_id, tipo, titulo,"
          + " media_url, licencia) VALUES ($1::uuid,'foto','smk_id3',"
          + " 'https://x/i3.jpg','cc-by') RETURNING id", [uid]);
        var iUpd3 = await q(SQL_GUARD_UPD,
          [medId3.id, 'aprobada', null, null, 'pendiente']);
        var iRow3 = await q1('SELECT estado_moderacion, moderado_por FROM'
          + ' cartas_media WHERE id=$1::uuid', [medId3.id]);
        check('E18 uuid inexistente: 0 filas en usuarios -> NULL sin error',
          iExiste.length === 0 && iUpd3.length === 1 && iRow3
          && iRow3.estado_moderacion === 'aprobada' && iRow3.moderado_por === null);

        check('E19 fuente admin: 409 MEDIA_CON_CARTAS, FOR UPDATE y ADMIN_USER_ID',
          advSrc.indexOf("error:'MEDIA_CON_CARTAS'") !== -1
          && advSrc.indexOf('cartas_n: nVivas') !== -1
          && advSrc.indexOf('FOR UPDATE') !== -1
          && advSrc.indexOf('process.env.ADMIN_USER_ID') !== -1
          && advSrc.indexOf('identidad_admin') !== -1);
      }

      var mkUsr = await q('SELECT id::text AS id FROM usuarios'
        + ' ORDER BY creado_en ASC NULLS LAST LIMIT 3');
      var mkProd = await q1("SELECT id FROM cartas_catalogo WHERE familia='producto'"
        + ' AND activo=true ORDER BY id LIMIT 1');
      var mkLugar = await q1('SELECT id FROM cartas_catalogo WHERE activo=true'
        + ' AND familia NOT IN (SELECT jsonb_array_elements_text($1::jsonb))'
        + ' ORDER BY id LIMIT 1', [famSinPrecio]);
      if (mkUsr.length < 2 || !mkProd || !mkLugar) {
        skip('D-15/D-17', 'faltan 2 usuarios, una carta producto o una coleccionable');
      } else {
        var mkVend = mkUsr[0].id;
        var mkComp = mkUsr[1].id;
        var mkAutor = (mkUsr[2] && mkUsr[2].id) ? mkUsr[2].id : mkComp;
        var prodId = String(mkProd.id);
        var ugcId = String(mkLugar.id);

        // Fixtures SOLO dentro de la tx (el ROLLBACK lo revierte todo).
        await q("UPDATE cartas_catalogo SET emisor_tipo='ugc', emisor_id=$2::uuid"
          + ' WHERE id=$1', [ugcId, mkAutor]);
        await q("INSERT INTO usuarios_cartas (usuario_id, carta_id, variante, cantidad, activo)"
          + " VALUES ($1::uuid,$2,'base',2,true)"
          + ' ON CONFLICT (usuario_id, carta_id, variante) DO UPDATE SET cantidad = 2, activo = true',
          [mkVend, prodId]);
        await q("INSERT INTO usuarios_cartas (usuario_id, carta_id, variante, cantidad, activo)"
          + " VALUES ($1::uuid,$2,'base',2,true)"
          + ' ON CONFLICT (usuario_id, carta_id, variante) DO UPDATE SET cantidad = 2, activo = true',
          [mkVend, ugcId]);
        await q('UPDATE usuarios SET xp_total=100000, xp_gastado_sinks=0 WHERE id=$1::uuid', [mkComp]);
        var mkPan = await q1('INSERT INTO pandillas (nombre, fundador_id, fama_total, activo, tithe_pct)'
          + ' VALUES ($1,$2::uuid,0,true,4) RETURNING id::text AS id, fama_total',
          ['smk_eco_' + String(process.pid) + '_' + String(Date.now()), mkVend]);
        await q("INSERT INTO pandillas_miembros (pandilla_id, usuario_id, rol, activo)"
          + " VALUES ($1::uuid,$2::uuid,'miembro',true)", [mkPan.id, mkVend]);

        async function mkOferta(cartaId, precio, activo) {
          return q1('INSERT INTO cartas_ofertas (vendedor_id, carta_id, variante, cantidad,'
            + ' cantidad_restante, precio_xp, estado, activo)'
            + " VALUES ($1::uuid,$2,'base',1,1,$3::numeric,'abierta',$4)"
            + ' RETURNING id::text AS id', [mkVend, cartaId, precio, activo]);
        }

        // (a) publicar producto -> comerciable_n 0 y CERO escrow
        var rPub = await q1(SQL_PUBLICAR, [mkVend, prodId, 1, 100, 24, 'base', famSinPrecio]);
        var rPubOk = await q1(SQL_PUBLICAR, [mkVend, ugcId, 1, 100, 24, 'base', famSinPrecio]);
        check('D15a publicar producto: comerciable_n=0 sin escrow; lugar si publica',
          rPub && Number(rPub.carta_ok) === 1 && Number(rPub.comerciable_n) === 0
          && rPub.oferta_id === null
          && rPubOk && Number(rPubOk.comerciable_n) === 1 && rPubOk.oferta_id !== null,
          'prod oferta=' + (rPub && rPub.oferta_id)
          + ' lugar oferta=' + (rPubOk && rPubOk.oferta_id !== null));

        // (b) comprar una oferta PREEXISTENTE de producto -> 400 sin debitar
        var ofProd = await mkOferta(prodId, 100, true);
        var xpAntes = await q1('SELECT xp_total::numeric AS xp FROM usuarios WHERE id=$1::uuid', [mkComp]);
        var rCbcProd = await q1(SQL_VENTA, [ofProd.id, 1, mkComp, 100, 100, famSinPrecio]);
        var xpDesp = await q1('SELECT xp_total::numeric AS xp FROM usuarios WHERE id=$1::uuid', [mkComp]);
        var ledProd = await q1("SELECT COUNT(*)::int AS n FROM xp_ledger"
          + " WHERE accion='carta_venta_debito' AND contexto->>'oferta_id'=$1", [ofProd.id]);
        check('D15b comprar oferta de producto: comerciable=false, sin debito ni asiento',
          rCbcProd && Number(rCbcProd.oferta_n) === 1 && rCbcProd.comerciable === false
          && rCbcProd.venta_id === null
          && Number(xpDesp.xp) === Number(xpAntes.xp) && Number(ledProd.n) === 0,
          'xp ' + xpAntes.xp + '->' + xpDesp.xp + ' led=' + ledProd.n);

        // (c) libro publico: fuera inactivas y producto/consumible
        var ofInact = await mkOferta(ugcId, 50, false);
        var ofLugar = await mkOferta(ugcId, 70, true);
        var libro = await q(SQL_LIBRO, [famSinPrecio, 50]);
        var hayProd = libro.some(function (o) { return String(o.carta_id) === prodId; });
        var hayInact = libro.some(function (o) { return String(o.id) === String(ofInact.id); });
        var hayLugar = libro.some(function (o) { return String(o.id) === String(ofLugar.id); });
        check('D15c libro publico: excluye producto/consumible e inactivas',
          !hayProd && !hayInact && hayLugar,
          'prod=' + hayProd + ' inact=' + hayInact + ' lugar=' + hayLugar);

        // (d) venta UGC: bruto 1000, royalty 100, tithe 4% = 40, neto 860
        await q('UPDATE pandillas SET tithe_pct=4 WHERE id=$1::uuid', [mkPan.id]);
        await q('UPDATE usuarios SET xp_total=1000, xp_gastado_sinks=0 WHERE id=$1::uuid', [mkVend]);
        await q('UPDATE usuarios SET xp_total=1000, xp_gastado_sinks=0 WHERE id=$1::uuid', [mkAutor]);
        var ofUgc = await mkOferta(ugcId, 1000, true);
        var rVenta = await q1(SQL_VENTA, [ofUgc.id, 1, mkComp, 1000, 1000, famSinPrecio]);
        var xpVend = await q1('SELECT xp_total::numeric AS xp FROM usuarios WHERE id=$1::uuid', [mkVend]);
        var xpAutor = await q1('SELECT xp_total::numeric AS xp FROM usuarios WHERE id=$1::uuid', [mkAutor]);
        var fama = await q1('SELECT fama_total::numeric AS f FROM pandillas WHERE id=$1::uuid', [mkPan.id]);
        var ledCred = await q1("SELECT xp_base::numeric AS base, xp_final::numeric AS fin"
          + " FROM xp_ledger WHERE accion='carta_venta_credito'"
          + " AND contexto->>'oferta_id'=$1 ORDER BY id DESC LIMIT 1", [ofUgc.id]);
        var ledRoy = await q1("SELECT xp_final::numeric AS fin FROM xp_ledger"
          + " WHERE accion='carta_royalty' AND contexto->>'oferta_id'=$1"
          + ' ORDER BY id DESC LIMIT 1', [ofUgc.id]);
        check('D17d venta UGC: royalty 100 + tithe 40 + neto 860 = bruto 1000',
          Number(rVenta.bruto) === 1000 && Number(rVenta.royalty) === 100
          && Number(rVenta.tithe) === 40 && Number(rVenta.neto) === 860
          && Number(xpVend.xp) === 1860 && Number(xpAutor.xp) === 1100
          && Number(fama.f) === 40
          && ledCred && Number(ledCred.fin) === 860
          && ledRoy && Number(ledRoy.fin) === 100,
          'neto=' + (rVenta && rVenta.neto) + ' vend=' + xpVend.xp
          + ' autor=' + xpAutor.xp + ' fama=' + fama.f + ' cred=' + (ledCred && ledCred.fin));

        // (e) tramos de tithe 1/4/7/10: royalty + tithe + neto = bruto, neto >= 0
        var tramos = [1, 4, 7, 10];
        var okTramos = true, detTramos = '';
        for (var mt = 0; mt < tramos.length; mt++) {
          await q('UPDATE pandillas SET tithe_pct=$1::numeric WHERE id=$2::uuid',
            [tramos[mt], mkPan.id]);
          await q("UPDATE cartas_ofertas SET cantidad_restante=1, estado='abierta', activo=true"
            + ' WHERE id=$1::uuid', [ofUgc.id]);
          await q('UPDATE usuarios SET xp_total=100000, xp_gastado_sinks=0 WHERE id=$1::uuid', [mkComp]);
          var rt = await q1(SQL_VENTA, [ofUgc.id, 1, mkComp, 1000, 1000, famSinPrecio]);
          var espT = Math.floor(1000 * tramos[mt] / 100);
          var okT = rt && Number(rt.royalty) === 100 && Number(rt.tithe) === espT
            && Number(rt.neto) === 1000 - 100 - espT && Number(rt.neto) >= 0
            && Number(rt.royalty) + Number(rt.tithe) + Number(rt.neto) === 1000;
          if (!okT) okTramos = false;
          detTramos += tramos[mt] + '%:' + (rt && rt.neto) + ' ';
        }
        check('D17e tramos 1/4/7/10: royalty + tithe + neto = bruto y neto >= 0',
          okTramos, detTramos);

        // (f) autor ausente: royalty 0 (no se paga a nadie), tithe igual
        await q('UPDATE cartas_catalogo SET emisor_id=gen_random_uuid() WHERE id=$1', [ugcId]);
        await q('UPDATE pandillas SET tithe_pct=4 WHERE id=$1::uuid', [mkPan.id]);
        var ofAbs = await mkOferta(ugcId, 1000, true);
        await q('UPDATE usuarios SET xp_total=100000, xp_gastado_sinks=0 WHERE id=$1::uuid', [mkComp]);
        var rAbs = await q1(SQL_VENTA, [ofAbs.id, 1, mkComp, 1000, 1000, famSinPrecio]);
        var ledAbs = await q1("SELECT COUNT(*)::int AS n FROM xp_ledger"
          + " WHERE accion='carta_royalty' AND contexto->>'oferta_id'=$1", [ofAbs.id]);
        check('D17f autor ausente: royalty 0, tithe 40, neto 960, cero filas huerfanas',
          rAbs && Number(rAbs.royalty) === 0 && Number(rAbs.tithe) === 40
          && Number(rAbs.neto) === 960 && Number(ledAbs.n) === 0,
          'roy=' + (rAbs && rAbs.royalty) + ' tithe=' + (rAbs && rAbs.tithe)
          + ' neto=' + (rAbs && rAbs.neto) + ' led=' + ledAbs.n);
      }
    }
  } catch (eTx) {
    check('transaccion sin excepcion', false,
      (eTx && eTx.code ? String(eTx.code) + ' ' : '') + limpiar(eTx && eTx.message));
  } finally {
    if (enTx) {
      try { await q('ROLLBACK'); } catch (eRb) {
        check('ROLLBACK', false, limpiar(eRb && eRb.message));
      }
    }
  }

  // Cero persistencia: conteos PRE = POST tras el ROLLBACK.
  var post = null;
  try {
    post = await q1(Q_CONTEO);
  } catch (ePost) {
    check('conteos POST legibles', false, limpiar(ePost && ePost.message));
  }
  if (pre && post) {
    check('C9 cero persistencia: conteos PRE = POST',
      pre.usuarios === post.usuarios
      && pre.usuarios_cartas === post.usuarios_cartas
      && pre.cartas_catalogo === post.cartas_catalogo
      && pre.xp_ledger === post.xp_ledger
      && pre.niveles === post.niveles
      && pre.cartas_media === post.cartas_media,
      resumen(pre, post));
  }

  console.log('');
  console.log('----');
  console.log('TOTAL checks=' + num + ' PASS=' + (num - fallos)
    + ' FAIL=' + fallos + ' SKIP=' + saltados);
  salir(fallos ? 1 : 0);
}

main().catch(function (e) {
  console.log('FAIL excepcion no controlada: ' + limpiar(e && e.message));
  process.stdout.write('', function () { process.exit(1); });
});
