// scripts/smoke_cartas_jugables.js
//
// QUE MIDE
//   Si el catalogo de cartas TIENE DISENO y si los gates de nivel son
//   ALCANZABLES. Concretamente, sobre cartas_catalogo:
//     - totales: total, activas, con diseno, jugables, desactivadas, sin diseno
//     - desglose por set_slug (total / jugables / sin diseno)
//     - gates de nivel (10, 14, 20, 25): cuantas cartas JUGABLES hay en cada uno
//     - cartas de evento sin diseno (informativo: se ocultarian)
//     - la vista cartas_jugables, si existe, contra el conteo calculado
//   "Jugable" = activo = true AND imagen_url IS NOT NULL AND btrim(imagen_url) <> ''.
//   Una carta sin diseno no se puede pintar, asi que no es jugable aunque este
//   activa: por eso el conteo NO es simplemente "activas".
//
// POR QUE EXISTE (ADR-117)
//   El filtro de juego se apoya en dos supuestos que nadie comprobaba de una
//   sola pasada: (a) que el catalogo tiene diseno suficiente para no dejar sets
//   vacios, y (b) que cada nivel de gate tiene al menos una carta jugable. Si un
//   nivel se queda a 0, el jugador no puede subir de nivel: el gate es un muro,
//   no una progresion. Ese fallo es invisible en local y silencioso en
//   produccion, asi que aqui se convierte en un numero medido y en un exit code.
//   Es el PRE-FLIGHT que se corre ANTES de activar el filtro de juego.
//
// READ-ONLY DE VERDAD
//   Todas las sentencias son SELECT (mas to_regclass / pg_class, que tambien son
//   lectura). Cero INSERT, UPDATE, DELETE, DDL o BEGIN. El script se puede
//   correr las veces que sea y no deja rastro. Si algun dia alguien le mete una
//   escritura, ese es el bug: este fichero no es un seed.
//
// CHECKPOINT DE FASE 1
//   Exit 0 es REQUISITO para desplegar el filtro de juego. Exit 1 (violacion)
//   significa que hay al menos un nivel de gate con 0 cartas jugables y que el
//   despliegue debe esperar a que el catalogo tenga diseno. Exit 2 (sin
//   conexion o sin configuracion) NO certifica nada: es "no medido", no "ok".
//
// SIN BASE NO ES UN FALLO DE CODIGO
//   Sin DATABASE_URL (ni en el entorno ni en .env.local) imprime el motivo y
//   sale con 2, sin stack trace y sin abrir conexion. Una DATABASE_URL vacia
//   puesta a proposito cuenta como "sin base" y NO se deja pisar por .env.local,
//   para que la rama sea demostrable.
//
// NUNCA IMPRIME LA CREDENCIAL
//   Ni la cadena de conexion ni la clave aparecen en el log, tampoco en el
//   camino de error: todo mensaje pasa por limpiar().
//
// USO
//   node scripts/smoke_cartas_jugables.js
//   node scripts/smoke_cartas_jugables.js --json      (un unico objeto JSON)
//   node scripts/smoke_cartas_jugables.js --sin-base   (fuerza la rama exit 2)
//
// ASCII-safe (ADR-002): 0 bytes > 127, cero backticks. CommonJS (BUG-001).
'use strict';

// Una DATABASE_URL vacia puesta a proposito es una senal de "sin base": no se
// deja pisar por .env.local, igual que en scripts/smoke_cartas_db_tx.js.
var vacioExplicito = Object.prototype.hasOwnProperty.call(process.env, 'DATABASE_URL')
  && String(process.env.DATABASE_URL).trim() === '';

if (!vacioExplicito) require('./load_env_local')();

var PEDIR_JSON = process.argv.indexOf('--json') !== -1;
var FORZAR_SIN_BASE = process.argv.indexOf('--sin-base') !== -1;

var NIVELES_GATE = [10, 14, 20, 25];

// Un solo SELECT por bloque: el HTTP driver de Neon no mantiene sesion, asi que
// no hay transaccion que abrir ni cursor que cerrar.
var SQL_CATALOGO = "SELECT to_regclass('public.cartas_catalogo')::text AS t";

var SQL_TOTALES =
  'SELECT count(*)::int AS total,'
  + ' count(*) FILTER (WHERE activo)::int AS activas,'
  + " count(*) FILTER (WHERE imagen_url IS NOT NULL AND btrim(imagen_url) <> '')::int AS con_diseno,"
  + " count(*) FILTER (WHERE activo AND imagen_url IS NOT NULL AND btrim(imagen_url) <> '')::int AS jugables"
  + ' FROM cartas_catalogo';

var SQL_POR_SET =
  'SELECT set_slug,'
  + ' count(*)::int AS total,'
  + " count(*) FILTER (WHERE activo AND imagen_url IS NOT NULL AND btrim(imagen_url) <> '')::int AS jugables,"
  + " count(*) FILTER (WHERE imagen_url IS NULL OR btrim(imagen_url) = '')::int AS sin_diseno"
  + ' FROM cartas_catalogo'
  + ' GROUP BY set_slug ORDER BY set_slug';

// VALUES + LEFT JOIN para que los 4 niveles salgan SIEMPRE, tambien cuando el
// catalogo no tiene ni una fila de ese nivel: un nivel ausente es justo el
// defecto que este script tiene que ver, no un hueco en la tabla.
var SQL_GATES =
  'SELECT g.n::int AS nivel,'
  + ' count(c.id)::int AS total,'
  + " count(c.id) FILTER (WHERE c.activo AND c.imagen_url IS NOT NULL AND btrim(c.imagen_url) <> '')::int AS jugables"
  + ' FROM (VALUES (10),(14),(20),(25)) AS g(n)'
  + ' LEFT JOIN cartas_catalogo c ON c.nivel_gate = g.n'
  + ' GROUP BY g.n ORDER BY g.n';

var SQL_EVENTOS =
  'SELECT count(*)::int AS total,'
  + " count(*) FILTER (WHERE imagen_url IS NULL OR btrim(imagen_url) = '')::int AS sin_diseno"
  + ' FROM cartas_catalogo WHERE es_evento = true';

// Se busca por nombre en cualquier esquema no de sistema, y se devuelve el
// nombre ya cualificado por Postgres (oid::regclass), que es lo unico seguro de
// interpolar en el count(*).
var SQL_VISTA =
  'SELECT c.oid::regclass::text AS nombre, c.relkind::text AS tipo'
  + ' FROM pg_class c'
  + ' JOIN pg_namespace n ON n.oid = c.relnamespace'
  + " WHERE c.relname = 'cartas_jugables'"
  + " AND n.nspname NOT IN ('pg_catalog','information_schema')"
  + ' ORDER BY n.nspname LIMIT 1';

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
  if (FORZAR_SIN_BASE) return 'flag --sin-base pedido de forma explicita';
  if (vacioExplicito) return 'DATABASE_URL vacia de forma explicita';
  var u = process.env.DATABASE_URL;
  if (!u || String(u).trim() === '') {
    return 'DATABASE_URL no disponible (ni variable de entorno ni .env.local)';
  }
  return null;
}

// El driver devuelve el array de filas, pero se tolera la forma {rows:[...]}
// para no romper si alguien cambia a fullResults.
function arreglo(res) {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  return Array.isArray(res.rows) ? res.rows : [];
}

function primero(res) {
  var f = arreglo(res);
  return f.length ? f[0] : null;
}

function n0(v) {
  var n = Number(v);
  return isFinite(n) ? n : 0;
}

function repetir(ch, n) {
  var s = '';
  for (var i = 0; i < n; i++) s += ch;
  return s;
}

function pad(txt, ancho) {
  var s = String(txt);
  while (s.length < ancho) s += ' ';
  return s;
}

function tabla(cabeceras, filas) {
  var anchos = [];
  var i;
  var j;
  for (i = 0; i < cabeceras.length; i++) anchos[i] = String(cabeceras[i]).length;
  for (i = 0; i < filas.length; i++) {
    for (j = 0; j < cabeceras.length; j++) {
      var len = String(filas[i][j]).length;
      if (len > anchos[j]) anchos[j] = len;
    }
  }
  var sep = '+';
  for (i = 0; i < anchos.length; i++) sep += repetir('-', anchos[i] + 2) + '+';
  var lineas = [sep];
  var cab = '|';
  for (j = 0; j < cabeceras.length; j++) cab += ' ' + pad(cabeceras[j], anchos[j]) + ' |';
  lineas.push(cab);
  lineas.push(sep);
  for (i = 0; i < filas.length; i++) {
    var l = '|';
    for (j = 0; j < cabeceras.length; j++) l += ' ' + pad(filas[i][j], anchos[j]) + ' |';
    lineas.push(l);
  }
  lineas.push(sep);
  return lineas.join('\n');
}

function informeVacio() {
  return {
    status: 'sin_base',
    read_only: true,
    adr: 'ADR-117',
    generado_en: new Date().toISOString(),
    motivo: null,
    totales: null,
    por_set: [],
    gates: [],
    niveles_violados: [],
    eventos: null,
    vista_cartas_jugables: null,
    avisos: [],
    exit: 2
  };
}

function salirSinBase(informe, detalle) {
  informe.status = 'sin_base';
  informe.exit = 2;
  if (PEDIR_JSON) {
    console.log(JSON.stringify(informe));
  } else {
    console.log('== SMOKE CARTAS JUGABLES - solo SELECT, cero escritura (ADR-117)');
    console.log('== Checkpoint Fase 1: exit 0 obligatorio antes de desplegar el filtro de juego.');
    console.log('');
    console.log('ERROR sin base de datos: ' + informe.motivo);
    if (detalle) console.log('ERROR detalle: ' + detalle);
    console.log('ERROR no se ejecuto SQL: sin conexion no se puede certificar el catalogo.');
    console.log('');
    console.log('RESULTADO: NO MEDIDO (exit 2) - define DATABASE_URL o .env.local y vuelve a correrlo.');
  }
  process.exitCode = 2;
}

function imprimirTexto(informe) {
  console.log('== SMOKE CARTAS JUGABLES - solo SELECT, cero escritura (ADR-117)');
  console.log('== Checkpoint Fase 1: exit 0 obligatorio antes de desplegar el filtro de juego.');
  console.log('== Generado: ' + informe.generado_en);
  console.log('');

  var t = informe.totales;
  console.log('[1] TOTALES cartas_catalogo');
  console.log(tabla(['metrica', 'n'], [
    ['total', t.total],
    ['activas', t.activas],
    ['con diseno', t.con_diseno],
    ['jugables', t.jugables],
    ['desactivadas', t.desactivadas],
    ['sin diseno', t.sin_diseno]
  ]));
  console.log('    jugable = activo = true AND imagen_url no vacia');
  console.log('');

  console.log('[2] POR SET (set_slug)');
  var filasSet = [];
  var i;
  for (i = 0; i < informe.por_set.length; i++) {
    var s = informe.por_set[i];
    filasSet.push([s.set_slug, s.total, s.jugables, s.sin_diseno]);
  }
  if (!filasSet.length) filasSet.push(['(catalogo vacio)', 0, 0, 0]);
  console.log(tabla(['set_slug', 'total', 'jugables', 'sin diseno'], filasSet));
  console.log('');

  console.log('[3] GATES DE NIVEL (nivel_gate 10/14/20/25)');
  var filasGate = [];
  for (i = 0; i < informe.gates.length; i++) {
    var g = informe.gates[i];
    filasGate.push([g.nivel, g.total, g.jugables, g.jugables > 0 ? 'OK' : 'VIOLACION']);
  }
  console.log(tabla(['nivel', 'total', 'jugables', 'estado'], filasGate));
  console.log('    0 jugables en un nivel = el gate no es alcanzable');
  console.log('');

  console.log('[4] CARTAS DE EVENTO (es_evento = true)');
  console.log('    total=' + informe.eventos.total + '  sin_diseno=' + informe.eventos.sin_diseno
    + '  (informativo: sin diseno se ocultarian del juego)');
  console.log('');

  console.log('[5] VISTA cartas_jugables');
  var v = informe.vista_cartas_jugables;
  if (!v.existe) {
    console.log('    no existe (ni vista ni tabla): se omite la comparacion');
  } else {
    console.log('    objeto=' + v.nombre + '  tipo=' + v.tipo);
    console.log('    filas=' + v.filas + '  calculado_sobre_tabla_base=' + v.calculado
      + '  coincide=' + (v.coincide ? 'si' : 'NO'));
  }
  console.log('');

  if (informe.avisos.length) {
    console.log('[6] AVISOS');
    for (i = 0; i < informe.avisos.length; i++) console.log('    - ' + informe.avisos[i]);
    console.log('');
  }

  if (informe.niveles_violados.length) {
    console.log('RESULTADO: VIOLACION (exit 1) - niveles de gate con 0 cartas jugables: '
      + informe.niveles_violados.join(', '));
    console.log('           NO desplegar el filtro de juego hasta que esos niveles tengan diseno.');
  } else {
    console.log('RESULTADO: OK (exit 0) - los 4 niveles de gate tienen al menos 1 carta jugable.');
  }
}

async function main() {
  var informe = informeVacio();

  var motivo = motivoSinBase();
  if (motivo) {
    informe.motivo = motivo;
    salirSinBase(informe, null);
    return;
  }

  var neon;
  try {
    neon = require('@neondatabase/serverless').neon;
  } catch (ePkg) {
    informe.motivo = 'falta el paquete @neondatabase/serverless';
    salirSinBase(informe, limpiar(ePkg && ePkg.message));
    return;
  }

  // Driver HTTP: cada consulta es un fetch independiente, no se abre socket y
  // por tanto no hay client.end() que llamar. Se sale por exitCode para no
  // truncar stdout.
  var sql = neon(String(process.env.DATABASE_URL).trim());

  try {
    var cat = primero(await sql(SQL_CATALOGO, []));
    if (!cat || !cat.t) {
      informe.motivo = 'cartas_catalogo no existe en la base (to_regclass NULL)';
      salirSinBase(informe, 'aplica la migracion 040 antes de medir el catalogo');
      return;
    }

    var rt = primero(await sql(SQL_TOTALES, []));
    var total = n0(rt && rt.total);
    var activas = n0(rt && rt.activas);
    var conDiseno = n0(rt && rt.con_diseno);
    var jugables = n0(rt && rt.jugables);

    informe.totales = {
      total: total,
      activas: activas,
      con_diseno: conDiseno,
      jugables: jugables,
      desactivadas: total - activas,
      sin_diseno: total - conDiseno
    };

    var rSet = arreglo(await sql(SQL_POR_SET, []));
    var i;
    for (i = 0; i < rSet.length; i++) {
      informe.por_set.push({
        set_slug: String(rSet[i].set_slug),
        total: n0(rSet[i].total),
        jugables: n0(rSet[i].jugables),
        sin_diseno: n0(rSet[i].sin_diseno)
      });
    }

    var rGate = arreglo(await sql(SQL_GATES, []));
    for (i = 0; i < rGate.length; i++) {
      var nivel = n0(rGate[i].nivel);
      var jg = n0(rGate[i].jugables);
      informe.gates.push({
        nivel: nivel,
        total: n0(rGate[i].total),
        jugables: jg,
        ok: jg > 0
      });
      if (jg === 0) informe.niveles_violados.push(nivel);
    }
    // Si por lo que sea la consulta no devolviera los 4 niveles, faltar un nivel
    // es una violacion igual: no se puede certificar lo que no se midio.
    for (i = 0; i < NIVELES_GATE.length; i++) {
      var encontrado = false;
      var k;
      for (k = 0; k < informe.gates.length; k++) {
        if (informe.gates[k].nivel === NIVELES_GATE[i]) encontrado = true;
      }
      if (!encontrado) {
        informe.niveles_violados.push(NIVELES_GATE[i]);
        informe.avisos.push('el nivel ' + NIVELES_GATE[i] + ' no aparecio en la consulta de gates');
      }
    }

    var re = primero(await sql(SQL_EVENTOS, []));
    informe.eventos = { total: n0(re && re.total), sin_diseno: n0(re && re.sin_diseno) };

    informe.vista_cartas_jugables = {
      existe: false,
      nombre: null,
      tipo: null,
      filas: null,
      calculado: jugables,
      coincide: null
    };
    var rv = primero(await sql(SQL_VISTA, []));
    if (rv && rv.nombre) {
      informe.vista_cartas_jugables.existe = true;
      informe.vista_cartas_jugables.nombre = String(rv.nombre);
      informe.vista_cartas_jugables.tipo = String(rv.tipo);
      // El nombre viene de oid::regclass, ya cualificado y escapado por Postgres.
      try {
        var rn = primero(await sql('SELECT count(*)::int AS n FROM ' + String(rv.nombre), []));
        var filasVista = n0(rn && rn.n);
        informe.vista_cartas_jugables.filas = filasVista;
        informe.vista_cartas_jugables.coincide = (filasVista === jugables);
        if (filasVista !== jugables) {
          informe.avisos.push('la vista ' + String(rv.nombre) + ' devuelve ' + filasVista
            + ' filas y el calculo sobre cartas_catalogo da ' + jugables
            + ': la vista esta desincronizada del criterio de jugable');
        }
      } catch (eVista) {
        informe.avisos.push('no se pudo contar ' + String(rv.nombre) + ': '
          + limpiar(eVista && eVista.message));
      }
    }

    if (informe.eventos.sin_diseno > 0) {
      informe.avisos.push(informe.eventos.sin_diseno
        + ' carta(s) de evento sin diseno: quedarian ocultas si el filtro exige imagen');
    }
    if (informe.totales.sin_diseno > 0) {
      informe.avisos.push(informe.totales.sin_diseno
        + ' carta(s) sin diseno en el catalogo (no jugables aunque esten activas)');
    }
    if (informe.totales.jugables === 0) {
      informe.avisos.push('0 cartas jugables en todo el catalogo: el juego no puede arrancar');
    }

    informe.status = informe.niveles_violados.length ? 'violacion' : 'ok';
    informe.exit = informe.niveles_violados.length ? 1 : 0;
  } catch (e) {
    informe.motivo = 'no se pudo medir: ' + limpiar(e && e.message);
    informe.status = 'sin_base';
    informe.exit = 2;
    if (PEDIR_JSON) {
      console.log(JSON.stringify(informe));
    } else {
      console.log('== SMOKE CARTAS JUGABLES - solo SELECT, cero escritura (ADR-117)');
      console.log('');
      console.log('ERROR ' + informe.motivo);
      console.log('ERROR exit 2: la consulta fallo (esquema o conexion), no se certifica nada.');
      console.log('RESULTADO: NO MEDIDO (exit 2)');
    }
    process.exitCode = 2;
    return;
  }

  if (PEDIR_JSON) {
    console.log(JSON.stringify(informe));
  } else {
    imprimirTexto(informe);
  }
  process.exitCode = informe.exit;
}

main().catch(function (e) {
  if (PEDIR_JSON) {
    var inf = informeVacio();
    inf.motivo = 'excepcion no controlada: ' + limpiar(e && e.message);
    console.log(JSON.stringify(inf));
  } else {
    console.log('FATAL ' + limpiar(e && e.message));
  }
  process.exitCode = 2;
});
