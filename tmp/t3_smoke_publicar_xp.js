// Smoke TEMPORAL de T3 (ADR-099 D5). Fuera del repo funcional: tmp/.
// Ejercita el handler REAL de api/interacciones.js con un driver falso de Neon
// que aplica la semantica del claim (UPDATE ... WHERE estado <> 'otorgado') y
// contabiliza saldos, ledger y clase. No toca la red ni la base.
//
// Asserts:
//  (i)   ficha ampliada -> paga el tier FINAL (completo) y no el enviado.
//  (ii)  dos llamadas seguidas no duplican saldo ni ledger.
//  (iii) XP_FORCE_FAIL=ledger -> el saldo SI se acredita y el ledger no rompe.
//  (iv)  nivel_clase se actualiza (acreditarClaseYCofre sigue invocada).
//  (v)   D3.1: el hero no se duplica (promovido / no promovido).
//  (vi)  pub_geo inmutable; pub_foto recalculado.

var RUTA_NEON = require.resolve('@neondatabase/serverless');
var sqlActual = null;
require.cache[RUTA_NEON] = {
  id: RUTA_NEON,
  filename: RUTA_NEON,
  loaded: true,
  exports: { neon: function () { return sqlActual; } }
};

var handler = require('./../api/interacciones.js');

var AUTOR = '11111111-1111-4111-8111-111111111111';
var DESTINO = '22222222-2222-4222-8222-222222222222';
var SECRETO = 'secreto-smoke-t3';
process.env.ADMIN_SECRET = SECRETO;

var fallos = 0;
function ok(cond, etiqueta, extra) {
  if (cond) { console.log('PASS ' + etiqueta); }
  else { fallos++; console.log('FAIL ' + etiqueta + (extra === undefined ? '' : ' | ' + JSON.stringify(extra))); }
}

function filaBase(over) {
  var f = {
    id: DESTINO,
    nombre: 'Cascada Oculta',
    categoria_slug: 'sitio',
    ciudad: 'Salento',
    region: 'Quindio',
    zona: 'andina',
    barrio: null,
    lead: 'Una cascada de agua fria entre montanas de niebla alta',
    descripcion: new Array(40).join('Sendero de niebla y helechos gigantes. '),
    precio_desde: 50000,
    horario: '8:00 a 17:00',
    whatsapp: '3001234567',
    email: null,
    telefono: null,
    web: null,
    instagram: null,
    foto_hero: 'https://cdn.exploraco.test/hero.jpg',
    lat: 4.6,
    lng: -75.6,
    status: 'published',
    tags: {
      autor_id: AUTOR,
      subcategoria: 'naturaleza',
      estado_envio: 'enviado',
      origen_envio: 'publicar',
      pub_tier: 'basico',
      pub_completitud: 9,
      pub_foto: false,
      pub_geo: true,
      video_url: 'https://www.youtube.com/watch?v=abc123',
      faqs: 'si',
      amenidades: 'si',
      como_llegar: 'si',
      temporada: 'si',
      dificultad: 'media',
      duracion: '3h',
      precio_entrada: '10000',
      habitaciones: '2'
    },
    galeria_n: 4,
    hero_en_galeria: 0
  };
  if (over) { for (var k in over) { if (Object.prototype.hasOwnProperty.call(over, k)) f[k] = over[k]; } }
  return f;
}

function crearEstado(fila) {
  var st = {
    fila: fila,
    tags: fila.tags,
    xpTotal: 1000,
    usuario: { clase_id: 'clase-1', nivel_clase: 3, xp_clase: 100, casa: null, xp_total: 1000 },
    ledgers: [],
    saldos: [],
    claseUpd: [],
    refs: 0,
    desconocidas: []
  };
  return st;
}

function driver(st) {
  return async function sql(texto, params) {
    var t = String(texto);
    var p = params || [];
    if (t.indexOf('SELECT d.id, d.nombre') === 0) {
      st.fila.tags = st.tags;
      return [st.fila];
    }
    if (t.indexOf('SELECT u.clase_id, u.nivel_clase, u.xp_clase') === 0) return [st.usuario];
    if (t.indexOf('SELECT clave, valor FROM gamificacion_config') === 0) return [];
    if (t.indexOf('SELECT pais_base') === 0) return [];
    if (t.indexOf('WITH claim AS (') === 0) {
      var nuevos = JSON.parse(p[1]);
      if (st.tags.pub_xp_estado === 'otorgado') {
        return [{ claim_n: 0, xp_total_nuevo: st.xpTotal }];
      }
      st.tags = Object.assign({}, st.tags, nuevos);
      var xp = Number(p[2]);
      st.xpTotal += xp;
      st.saldos.push({ xp: xp, usuario: p[3] });
      st.usuario.xp_total = st.xpTotal;
      return [{ claim_n: 1, xp_total_nuevo: st.xpTotal }];
    }
    if (t.indexOf('INSERT INTO xp_ledger') === 0) { st.ledgers.push(p); return []; }
    if (t.indexOf('UPDATE usuarios SET xp_clase') === 0) { st.claseUpd.push(p); return []; }
    if (t.indexOf('WITH RECURSIVE cadena AS (') === 0) { st.refs++; return []; }
    st.desconocidas.push(t.slice(0, 70));
    return [];
  };
}

function fakeRes() {
  var r = {
    codigo: 200,
    payload: null,
    setHeader: function () {},
    status: function (c) { r.codigo = c; return r; },
    json: function (o) { r.payload = o; return r; },
    end: function () { return r; }
  };
  return r;
}

async function otorgar(st, destinoId) {
  sqlActual = driver(st);
  var res = fakeRes();
  await handler({
    method: 'POST',
    headers: { authorization: 'Bearer ' + SECRETO },
    query: {},
    body: { tipo: 'publicar_lugar_otorgar', destino_id: destinoId || DESTINO }
  }, res);
  return res;
}

(async function () {
  // ---------------- (i) ficha ampliada: tier FINAL, no el enviado ----------
  var stA = crearEstado(filaBase());
  var rA = await otorgar(stA);
  ok(rA.codigo === 200 && rA.payload && rA.payload.otorgado === true,
    'A1 otorgado', rA.payload);
  ok(rA.payload.tier === 'completo', 'A2 tier FINAL completo (enviado era basico)', rA.payload.tier);
  ok(stA.tags.pub_tier === 'completo' && stA.tags.pub_completitud === 100,
    'A3 tags pub_tier/pub_completitud reescritos', { tier: stA.tags.pub_tier, c: stA.tags.pub_completitud });
  ok(stA.tags.pub_fotos_total === 5 && stA.tags.pub_fotos_no_hero === 4,
    'A4 pub_fotos_total=5 / pub_fotos_no_hero=4', { t: stA.tags.pub_fotos_total, n: stA.tags.pub_fotos_no_hero });
  ok(stA.tags.pub_foto === true, 'A5 pub_foto recalculado a true', stA.tags.pub_foto);
  ok(stA.tags.pub_geo === true, 'A6 pub_geo inmutable (sigue true)', stA.tags.pub_geo);
  ok(stA.tags.pub_xp_estado === 'otorgado', 'A7 pub_xp_estado otorgado', stA.tags.pub_xp_estado);
  ok(stA.ledgers.length === 1, 'A8 una sola fila de ledger', stA.ledgers.length);
  var lA = stA.ledgers[0] || [];
  ok(Number(lA[2]) === 120, 'A9 xp_base = 120 (publicar_completo)', lA[2]);
  ok(Number(lA[7]) === 70, 'A10 bonos_planos = 70 (geo 40 + foto 30)', lA[7]);
  var ctxA = lA[12] ? JSON.parse(lA[12]) : {};
  ok(ctxA.tier === 'completo' && ctxA.completitud === 100
    && ctxA.fotos_total === 5 && ctxA.fotos_no_hero === 4
    && ctxA.recalculo === true && ctxA.destino_id === DESTINO,
    'A11 contexto del ledger (tier, completitud, fotos, recalculo)', ctxA);
  ok(stA.saldos.length === 1 && stA.saldos[0].xp === rA.payload.xp,
    'A12 saldo acreditado UNA vez por el importe devuelto',
    { saldos: stA.saldos, xp: rA.payload.xp });
  ok(stA.xpTotal === 1000 + rA.payload.xp, 'A13 xp_total = 1000 + xp', stA.xpTotal);

  // ---------------- (iv) nivel_clase / clase se actualizan ----------------
  ok(stA.claseUpd.length === 1, 'B1 acreditarClaseYCofre invocada 1 vez', stA.claseUpd.length);
  var cu = stA.claseUpd[0] || [];
  ok(Number(cu[0]) === Math.round(rA.payload.xp * 0.5 * 100) / 100,
    'B2 xp_clase += xp*0.5', { recibido: cu[0], esperado: rA.payload.xp * 0.5 });
  ok(cu[1] !== undefined && cu[1] !== null, 'B3 nivel_clase escrito', cu[1]);
  ok(stA.refs === 1, 'B4 repartirXpReferidos invocado 1 vez', stA.refs);

  // ---------------- (ii) segunda llamada: sin doble pago ----------------
  var xpAntes = stA.xpTotal;
  var rA2 = await otorgar(stA);
  ok(rA2.payload && rA2.payload.otorgado === false && rA2.payload.motivo === 'ya_otorgado',
    'C1 segundo POST -> ya_otorgado', rA2.payload);
  ok(stA.xpTotal === xpAntes, 'C2 xp_total sin cambios', { antes: xpAntes, ahora: stA.xpTotal });
  ok(stA.saldos.length === 1, 'C3 sigue habiendo UNA acreditacion', stA.saldos.length);
  ok(stA.ledgers.length === 1, 'C4 sigue habiendo UNA fila de ledger', stA.ledgers.length);
  ok(stA.claseUpd.length === 1, 'C5 clase no se re-acredita', stA.claseUpd.length);

  // ---------------- (i-b) ficha minima (lo que envio el usuario) ----------
  var filaMin = filaBase({
    lead: 'Corto', descripcion: 'Corto', precio_desde: null, horario: null,
    whatsapp: null, foto_hero: null, lat: null, lng: null, galeria_n: 0,
    tags: { autor_id: AUTOR, estado_envio: 'enviado', pub_tier: 'basico', pub_completitud: 9, pub_geo: true }
  });
  var stMin = crearEstado(filaMin);
  var rMin = await otorgar(stMin);
  ok(rMin.payload.tier === 'basico', 'D1 ficha minimas -> tier basico', rMin.payload.tier);
  ok(Number((stMin.ledgers[0] || [])[2]) === 25, 'D2 xp_base = 25', (stMin.ledgers[0] || [])[2]);
  ok(rA.payload.xp > rMin.payload.xp,
    'D3 ficha ampliada paga MAS que la enviada', { ampliada: rA.payload.xp, enviada: rMin.payload.xp });
  ok(stMin.tags.pub_foto === false, 'D4 pub_foto false sin fotos', stMin.tags.pub_foto);

  // ---------------- (v) D3.1 hero promovido: no duplica ----------------
  var stHero = crearEstado(filaBase({ galeria_n: 3, hero_en_galeria: 1 }));
  await otorgar(stHero);
  ok(stHero.tags.pub_fotos_total === 3 && stHero.tags.pub_fotos_no_hero === 2,
    'E1 hero PROMOVIDO: total=3 / no_hero=2 (no 4/3)',
    { t: stHero.tags.pub_fotos_total, n: stHero.tags.pub_fotos_no_hero });

  // ---------------- (vi) pub_geo: derivado de pub_geo_dist_m ----------------
  var fGeo = filaBase({
    tags: { autor_id: AUTOR, estado_envio: 'enviado', pub_tier: 'basico',
      pub_geo_dist_m: 120, subcategoria: 'naturaleza' }
  });
  var stGeo = crearEstado(fGeo);
  var rGeo = await otorgar(stGeo);
  ok(stGeo.tags.pub_geo === true, 'F1 pub_geo derivado de pub_geo_dist_m=120', stGeo.tags.pub_geo);
  ok(Number((stGeo.ledgers[0] || [])[7]) === 70,
    'F2 bono geo cobrado (40) + foto (30)', (stGeo.ledgers[0] || [])[7]);
  var fGeo2 = filaBase({
    tags: { autor_id: AUTOR, estado_envio: 'enviado', pub_tier: 'basico',
      pub_geo: false, pub_geo_dist_m: 999, subcategoria: 'naturaleza' }
  });
  var stGeo2 = crearEstado(fGeo2);
  await otorgar(stGeo2);
  ok(stGeo2.tags.pub_geo === false, 'F3 pub_geo inmutable aunque dist>300', stGeo2.tags.pub_geo);

  // ---------------- (iii) XP_FORCE_FAIL=ledger ----------------
  var stL = crearEstado(filaBase());
  process.env.XP_FORCE_FAIL = 'ledger';
  var rL = await otorgar(stL);
  delete process.env.XP_FORCE_FAIL;
  ok(rL.codigo === 200 && rL.payload.otorgado === true,
    'G1 con XP_FORCE_FAIL=ledger el flujo NO rompe', rL.payload);
  ok(stL.saldos.length === 1 && stL.xpTotal === 1000 + rL.payload.xp,
    'G2 el saldo SI se acredita una sola vez', { saldos: stL.saldos.length, xp: stL.xpTotal });
  ok(stL.ledgers.length === 0, 'G3 fallo forzado: sin fila de ledger (Deuda 9)', stL.ledgers.length);
  ok(stL.tags.pub_xp_estado === 'otorgado' && stL.tags.pub_tier === 'completo',
    'G4 claim y recalculo persistidos pese al fallo del ledger',
    { e: stL.tags.pub_xp_estado, t: stL.tags.pub_tier });
  ok(stL.claseUpd.length === 1, 'G5 clase sigue acreditandose', stL.claseUpd.length);
  var xpG = stL.xpTotal;
  var rL2 = await otorgar(stL);
  ok(rL2.payload.motivo === 'ya_otorgado' && stL.xpTotal === xpG && stL.saldos.length === 1,
    'G6 reintento tras fallo del ledger: ni doble saldo ni doble claim',
    { motivo: rL2.payload.motivo, saldos: stL.saldos.length });

  // ---------------- D5.5 no retroactivo ----------------
  var fViejo = filaBase({
    tags: { autor_id: AUTOR, estado_envio: 'enviado', pub_xp_estado: 'otorgado',
      pub_tier: 'basico', pub_completitud: 9, pub_geo: false }
  });
  var stViejo = crearEstado(fViejo);
  var rViejo = await otorgar(stViejo);
  ok(rViejo.payload.otorgado === false && rViejo.payload.motivo === 'ya_otorgado',
    'I1 ya otorgado antes -> ya_otorgado', rViejo.payload);
  ok(stViejo.tags.pub_tier === 'basico' && stViejo.tags.pub_completitud === 9,
    'I2 no retroactivo: pub_tier NO se reescribe',
    { t: stViejo.tags.pub_tier, c: stViejo.tags.pub_completitud });
  ok(stViejo.saldos.length === 0 && stViejo.ledgers.length === 0,
    'I3 sin saldo y sin ledger', { s: stViejo.saldos.length, l: stViejo.ledgers.length });

  // ---------------- guardas de contrato ----------------
  ok(!rA.payload.error, 'H1 sin error en la respuesta buena', rA.payload.error);
  ok(stA.desconocidas.length === 0, 'H2 ninguna consulta quedo sin respuesta del driver', stA.desconocidas);

  console.log(fallos === 0 ? 'RESULTADO: OK' : 'RESULTADO: ' + fallos + ' FALLOS');
  process.exit(fallos === 0 ? 0 : 1);
})().catch(function (e) {
  console.error('EXCEPCION: ' + (e && e.stack || e));
  process.exit(1);
});
