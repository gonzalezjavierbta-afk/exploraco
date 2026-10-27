// verify_058_precheck.js
// Pre-chequeo BLOQUEANTE (read-only) para la migracion 058
// (ADR-107: Marcas Self-Service, premio semanal y canje en tienda).
//
// QUE REPORTA
//   [1] Chequeo estatico del fichero en el working tree:
//       - nombre exacto y conforme al CHECK nombre de la 045,
//       - ASCII-safety (cero bytes > 127), cero backticks,
//       - cero sentencias de borrado de filas y cero DDL destructivo de tabla,
//       - presencia de los DDL clave de las secciones (1)-(7) de ADR-107 D1,
//       - un unico DROP CONSTRAINT y que sea marcas_usuario_id_key.
//   [2] Estado del LEDGER schema_migrations:
//       - ultima migracion aplicada,
//       - la 058 NO esta aplicada todavia,
//       - el predecesor real (057) SI esta registrado (puerta del runner).
//   [3] Estado PREVIO de marcas / usuarios / consumibles / gamificacion_config
//       y de las dos tablas nuevas: que exista lo que la 058 necesita y que NO
//       exista todavia lo que la 058 crea (aplicacion parcial = estado no
//       esperado).
//
// COMPORTAMIENTO
//   - NUNCA escribe: solo SELECT en information_schema / pg_catalog.
//   - Veredicto VINCULANTE: sale con codigo != 0 si el estado no es el
//     esperado (a diferencia de verify_027_precheck.js, que era informativo).
//   - Carga DATABASE_URL con scripts/load_env_local.js (.env.local) y NUNCA
//     imprime el valor.
//   - Sin credenciales NO se afirma nada del estado real de Neon: modo seco,
//     codigo 2.
//
// EXIT CODES
//   0  listo para aplicar (estado esperado, sin obstaculos)
//   1  estado NO esperado: hay obstaculos (ver bloque VEREDICTO)
//   2  sin credenciales / modo seco: el estado de Neon NO se ha verificado
//   3  error inesperado del propio script
//
// Uso (PowerShell):
//   node scripts/verify_058_precheck.js --dry-run   (solo estatico, sin red)
//   node scripts/verify_058_precheck.js             (estatico + Neon real)
//   $env:DATABASE_URL="postgresql://..."; node scripts/verify_058_precheck.js
//
// ASCII-safe (0 bytes > 127), sin backticks, CommonJS estricto.
'use strict';

var fs = require('fs');
var path = require('path');

var NUMERO = 58;
var NUMERO_PREDECESOR = 57;
var NOMBRE_PREDECESOR = '057_consumibles_faccion_nivel4.sql';
var RUTA_SQL = path.join(__dirname, '..', 'db', 'migrations',
  '058_marcas_self_service_premios_canje.sql');
var RE_NOMBRE_LEDGER = /^[0-9]{3}_[a-z0-9_]+\.sql$/;

// Tablas que la 058 NECESITA que ya existan (con la migracion que las crea).
var TABLAS_REQUERIDAS = [
  { t: 'usuarios', de: '001' },
  { t: 'marcas', de: '027' },
  { t: 'consumibles', de: '010' },
  { t: 'gamificacion_config', de: '031' },
  { t: 'billeteras', de: '042' }
];

// Tareas que la 058 CREA: si ya existen y el ledger no tiene la fila 58, el
// estado es una aplicacion parcial y hay que mirarlo antes de reaplicar.
var TABLAS_NUEVAS = ['fusiones_marca', 'canjes_tienda'];

// Columnas que la 058 CREA (table::column, con la seccion del DDL de D1).
var COLUMNAS_NUEVAS = [
  { c: 'marcas.estado_promo', sec: '(1)' },
  { c: 'marcas.premios_config', sec: '(1)' },
  { c: 'usuarios.marca_activa_id', sec: '(2.b)' },
  { c: 'consumibles.precio_cop', sec: '(3)' },
  { c: 'consumibles.premio_semanal', sec: '(3)' }
];

// Tokens DDL que el fichero debe contener, uno por seccion relevante de D1.
var TOKENS_DDL = [
  'ADD COLUMN IF NOT EXISTS estado_promo',
  'ADD COLUMN IF NOT EXISTS premios_config',
  'chk_marcas_premios_config_obj',
  'marcas_id_usuario_id_key',
  'ADD COLUMN IF NOT EXISTS marca_activa_id',
  'usuarios_marca_activa_fk',
  'DROP CONSTRAINT IF EXISTS marcas_usuario_id_key',
  'CREATE INDEX IF NOT EXISTS idx_marcas_usuario',
  'ADD COLUMN IF NOT EXISTS precio_cop',
  'ADD COLUMN IF NOT EXISTS premio_semanal',
  'chk_consumibles_precio_cop',
  'CREATE TABLE IF NOT EXISTS fusiones_marca',
  'CREATE TABLE IF NOT EXISTS canjes_tienda',
  'idx_canjes_tienda_codigo',
  "'marca_alta_xp'",
  "'marca_premio_tasa_cop_por_xp'",
  "'ancestral_pocima_50ml'",
  "'ancestral_media_375ml'",
  "'ancestral_botella_750ml'",
  'ON CONFLICT (clave) DO NOTHING'
];

// Claves de config que la 058 siembra (seccion 6 de D1): 9 en total.
var CLAVES_CONFIG = [
  'marca_alta_xp',
  'marca_premio_xp_por_unidad',
  'marca_premio_unidades_max',
  'marca_premio_xp_minimo_semana',
  'marca_premio_peso_1',
  'marca_premio_peso_2',
  'marca_premio_peso_3',
  'marca_premio_factor_retorno',
  'marca_premio_tasa_cop_por_xp'
];

var CLAVES_ANCESTRAL = [
  'ancestral_pocima_50ml',
  'ancestral_media_375ml',
  'ancestral_botella_750ml'
];

var SECO = false;
var OBSTACULOS = [];
var AVISOS = [];

function obstaculo(id, texto) { OBSTACULOS.push(id + '. ' + texto); }
function aviso(id, texto) { AVISOS.push(id + '. ' + texto); }

function literales(lista) {
  return lista.map(function (x) { return "'" + x + "'"; }).join(',');
}

// Diagnostica la cadena sin exponer el secreto. Devuelve null si no es usable.
function urlValida(raw) {
  if (raw === undefined || raw === null || String(raw).trim() === '') return null;
  var s = String(raw).trim();
  if ((s.charAt(0) === '"' && s.charAt(s.length - 1) === '"') ||
      (s.charAt(0) === "'" && s.charAt(s.length - 1) === "'")) {
    s = s.slice(1, -1);
  }
  if (s.indexOf('...') !== -1) return null;
  if (!/^postgres(ql)?:\/\/[^\s@]+@[^\s/]+\/.+$/.test(s)) return null;
  return s;
}

function obtenerDriverFake() {
  return require('./fake_neon').neon;
}

function contarOcurrencias(texto, patron) {
  var m = texto.match(patron);
  return m ? m.length : 0;
}

// Devuelve SOLO el codigo: descarta las lineas de comentario puro (-- ...).
// El runner scripts/apply_sql_file.js tambien las ignora antes de dividir.
// Se usa para contar sentencias reales: una mencion en un comentario (p.ej. el
// rollback documentado) no es una sentencia ejecutable.
function soloCodigo(texto) {
  return texto.split(/\r?\n/).filter(function (l) {
    return l.trim().indexOf('--') !== 0;
  }).join('\n');
}

// --- [1] Chequeo estatico del working tree (nunca toca la red) ------------
function chequeoEstatico() {
  console.log('[1] Chequeo estatico del fichero 058 (informacion verificable):');
  var base = path.basename(RUTA_SQL);

  if (!fs.existsSync(RUTA_SQL)) {
    obstaculo('O-0', 'no existe ' + base + ' en db/migrations/. Nada que aplicar.');
    return;
  }
  console.log('    OK   - ' + base + ' presente.');

  if (!RE_NOMBRE_LEDGER.test(base)) {
    obstaculo('O-0b', base + ' no cumple el CHECK nombre de la 045 ' +
      '(^[0-9]{3}_[a-z0-9_]+.sql$): el runner lo rechazaria.');
  } else {
    console.log('    OK   - nombre conforme al CHECK nombre de la 045.');
  }

  var bytes = fs.readFileSync(RUTA_SQL);
  var altos = 0;
  var i;
  for (i = 0; i < bytes.length; i++) {
    if (bytes[i] > 127) altos++;
  }
  if (altos === 0) {
    console.log('    OK   - ASCII-safe: 0 bytes > 127 (' + bytes.length + ' bytes).');
  } else {
    obstaculo('O-1', 'ASCII-safety rota: ' + altos + ' bytes > 127 (ADR-002).');
  }

  var texto = bytes.toString('utf8');
  var codigo = soloCodigo(texto);
  var backticks = contarOcurrencias(texto, /[\u0060]/g);
  if (backticks === 0) {
    console.log('    OK   - 0 backticks.');
  } else {
    obstaculo('O-2', backticks + ' backticks en el SQL (prohibido en serverless).');
  }

  // Sentencias de borrado en posicion de sentencia (las acciones referenciales
  // ON DELETE ... del DDL de D1 no cuentan: no borran filas por si mismas).
  // Se evaluan sobre el CODIGO: el rollback documentado en la cabecera es
  // prosa (lineas de comentario) y no se ejecuta nunca.
  var borrados = contarOcurrencias(codigo, /(^|\n)[ \t]*DELETE[ \t]/g);
  var ddlDestructivo = contarOcurrencias(codigo, /(^|\n)[ \t]*DROP[ \t]+TABLE/gi);
  var truncados = contarOcurrencias(codigo, /(^|\n)[ \t]*TRUNCATE/gi);
  if (borrados === 0 && ddlDestructivo === 0 && truncados === 0) {
    console.log('    OK   - 0 sentencias de borrado / DDL destructivo de tabla.');
  } else {
    obstaculo('O-3', 'aparecen sentencias prohibidas (borrado=' + borrados +
      ', DROP TABLE=' + ddlDestructivo + ', TRUNCATE=' + truncados + ').');
  }

  var drops = contarOcurrencias(codigo, /DROP[ \t]+CONSTRAINT/gi);
  if (drops === 1 && codigo.indexOf('DROP CONSTRAINT IF EXISTS marcas_usuario_id_key') !== -1) {
    console.log('    OK   - un unico DROP CONSTRAINT, y es marcas_usuario_id_key (D1 2.e).');
  } else {
    obstaculo('O-4', 'se esperaba EXACTAMENTE un DROP CONSTRAINT ' +
      '(marcas_usuario_id_key) en el codigo y hay ' + drops + '.');
  }

  var faltantes = TOKENS_DDL.filter(function (t) {
    return texto.indexOf(t) === -1;
  });
  if (faltantes.length === 0) {
    console.log('    OK   - los ' + TOKENS_DDL.length + ' DDL clave de las secciones (1)-(7) estan.');
  } else {
    obstaculo('O-5', 'faltan ' + faltantes.length + ' DDL clave: ' +
      faltantes.join(' | '));
  }

  if (texto.indexOf('DO $m058p$') !== -1) {
    console.log('    OK   - guarda de precondicion to_regclass presente (seccion 0).');
  } else {
    aviso('A-0', 'no se detecta el bloque de guardas to_regclass (seccion 0).');
  }
}

// --- [2] y [3] Chequeo del estado real (READ-ONLY) ------------------------
async function chequeoRuntime(sql, esFake) {
  var modo = esFake ? 'MODO FAKE, sin DATABASE_URL' : 'Neon real';
  console.log('\n[2] Ledger schema_migrations (READ-ONLY - ' + modo + '):');

  var ledger = await sql(
    "SELECT to_regclass('public.schema_migrations') IS NOT NULL AS hay");
  var hayLedger = ledger.length > 0 && ledger[0].hay === true;
  if (!hayLedger) {
    obstaculo('O-6', 'no existe schema_migrations: la 045 no esta aplicada. ' +
      'El runner rechaza cualquier fichero posterior al 45.');
    console.log('    FAIL - schema_migrations NO existe.');
    return;
  }
  console.log('    OK   - schema_migrations existe.');

  var ultimas = await sql(
    "SELECT numero, nombre, resultado FROM schema_migrations " +
    "ORDER BY numero DESC LIMIT 3");
  if (ultimas.length === 0) {
    obstaculo('O-7', 'schema_migrations esta vacia: no hay predecesor registrado.');
    console.log('    FAIL - ledger vacio.');
  } else {
    console.log('    - Ultimas migraciones registradas:');
    ultimas.forEach(function (r) {
      console.log('        numero=' + r.numero + ' | resultado=' + r.resultado +
        ' | ' + r.nombre);
    });
    var ultima = Number(ultimas[0].numero);
    console.log('    - Ultima aplicada: numero ' + ultima + '.');
    if (ultima >= NUMERO) {
      obstaculo('O-8', 'el ledger ya tiene numero >= ' + NUMERO +
        ' (' + ultima + '): la 058 ya esta aplicada o hay algo posterior. ' +
        'NO reaplicar a ciegas.');
    } else if (ultima !== NUMERO_PREDECESOR) {
      aviso('A-1', 'la ultima aplicada es ' + ultima + ' y se esperaba ' +
        NUMERO_PREDECESOR + ' (' + NOMBRE_PREDECESOR + '): revisar el orden.');
    }
  }

  var fila058 = await sql(
    'SELECT numero, nombre, resultado FROM schema_migrations WHERE numero = $1',
    [NUMERO]);
  if (fila058.length > 0) {
    obstaculo('O-9', 'ya existe una fila con numero = ' + NUMERO + ' (' +
      fila058[0].nombre + ', resultado=' + fila058[0].resultado + ').');
  } else {
    console.log('    OK   - NO existe fila con numero ' + NUMERO + ': pendiente de aplicar.');
  }

  var filaPre = await sql(
    'SELECT numero, nombre, resultado FROM schema_migrations WHERE numero = $1',
    [NUMERO_PREDECESOR]);
  if (filaPre.length === 0) {
    obstaculo('O-10', 'el predecesor real (' + NOMBRE_PREDECESOR +
      ', numero ' + NUMERO_PREDECESOR + ') NO tiene fila en el ledger. ' +
      'El runner RECHAZARA el fichero 058.');
  } else {
    console.log('    OK   - predecesor registrado: numero ' + filaPre[0].numero +
      ' (resultado=' + filaPre[0].resultado + ').');
  }

  console.log('\n[3] Estado PREVIO de marcas / usuarios / consumibles / config:');

  // 3.1 Pre-requisitos de tabla
  var nombresReq = TABLAS_REQUERIDAS.map(function (x) { return x.t; });
  var req = await sql(
    "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN (" +
    literales(nombresReq) + ') ORDER BY tablename');
  var setReq = {};
  req.forEach(function (r) { setReq[r.tablename] = true; });
  TABLAS_REQUERIDAS.forEach(function (x) {
    if (!setReq[x.t]) {
      obstaculo('O-11', 'falta la tabla public.' + x.t + ' (migracion ' + x.de + ').');
    }
  });
  if (req.length === nombresReq.length) {
    console.log('    OK   - las ' + nombresReq.length + ' tablas requeridas existen ' +
      '(027, 031, 042, 046 y base).');
  }

  // 3.2 Columnas nuevas: NO deben existir todavia
  var cols = await sql(
    "SELECT table_name, column_name, data_type FROM information_schema.columns " +
    "WHERE table_schema = 'public' AND (table_name, column_name) IN (" +
    COLUMNAS_NUEVAS.map(function (x) {
      var p = x.c.split('.');
      return "('" + p[0] + "','" + p[1] + "')";
    }).join(',') + ') ORDER BY table_name, column_name');
  var setCol = {};
  cols.forEach(function (c) { setCol[c.table_name + '.' + c.column_name] = c.data_type; });
  var yaPresentes = [];
  COLUMNAS_NUEVAS.forEach(function (x) {
    if (setCol[x.c]) {
      yaPresentes.push(x.c + ' [' + setCol[x.c] + '] (seccion ' + x.sec + ')');
    }
  });
  if (yaPresentes.length === 0) {
    console.log('    OK   - ninguna de las ' + COLUMNAS_NUEVAS.length +
      ' columnas nuevas existe todavia (estado previo limpio).');
  } else {
    obstaculo('O-12', 'aplicacion PARCIAL detectada: ' + yaPresentes.length +
      ' columna(s) de la 058 ya existen sin fila en el ledger: ' +
      yaPresentes.join(' | ') + '. Revisar el estado antes de reaplicar.');
  }

  // 3.3 Tablas nuevas
  var nuevas = await sql(
    "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN (" +
    literales(TABLAS_NUEVAS) + ') ORDER BY tablename');
  var setNuevas = {};
  nuevas.forEach(function (r) { setNuevas[r.tablename] = true; });
  var nuevasPresentes = TABLAS_NUEVAS.filter(function (t) { return setNuevas[t]; });
  if (nuevasPresentes.length === 0) {
    console.log('    OK   - las 2 tablas nuevas (fusiones_marca, canjes_tienda) NO existen.');
  } else {
    obstaculo('O-13', 'aplicacion PARCIAL: ya existen las tablas ' +
      nuevasPresentes.join(', ') + ' sin fila 58 en el ledger.');
  }

  // 3.4 UNIQUE (usuario_id) todavia presente: es lo que la 058 cae
  var uniq = await sql(
    "SELECT conname FROM pg_constraint WHERE conrelid = 'public.marcas'::regclass " +
    "AND conname = 'marcas_usuario_id_key'");
  if (uniq.length > 0) {
    console.log('    OK   - marcas_usuario_id_key presente (lo caera la seccion 2.e).');
  } else if (setReq.marcas) {
    obstaculo('O-14', 'marcas_usuario_id_key YA no existe: el DROP del paso 2.e ' +
      'ocurrio antes de la 058. Revisar con el operador.');
  }

  // 3.5 Claves de config y consumibles: solo informativo, y aviso si ya estan
  var clave58 = await sql(
    'SELECT clave, valor FROM gamificacion_config WHERE clave IN (' +
    literales(CLAVES_CONFIG) + ') ORDER BY clave');
  if (clave58.length === 0) {
    console.log('    OK   - ninguna de las ' + CLAVES_CONFIG.length +
      ' claves marca_* esta en gamificacion_config.');
  } else {
    aviso('A-2', 'ya existen ' + clave58.length + ' de las ' + CLAVES_CONFIG.length +
      ' claves marca_* (seccion 6). El ON CONFLICT DO NOTHING no las pisara.');
  }

  var anc = await sql(
    'SELECT clave, precio_xp, marca_id FROM consumibles WHERE clave IN (' +
    literales(CLAVES_ANCESTRAL) + ') ORDER BY clave');
  if (anc.length === 0) {
    console.log('    OK   - los 3 consumibles ANCESTRAL no existen todavia (seccion 7).');
  } else {
    aviso('A-3', 'ya existen ' + anc.length + ' fila(s) ancestral_*: ' +
      anc.map(function (r) {
        return r.clave + ' (precio_xp=' + r.precio_xp +
          ', marca_id=' + (r.marca_id === null ? 'NULL' : r.marca_id) + ')';
      }).join(' | ') + '. El DO NOTHING NO pisa precios ya ajustados.');
  }

  // 3.6 Magnitudes del estado previo (evidencia para el informe)
  var conteos = await sql(
    "SELECT (SELECT COUNT(*)::int FROM marcas) AS marcas, " +
    "(SELECT COUNT(*)::int FROM consumibles) AS consumibles, " +
    "(SELECT COUNT(*)::int FROM usuarios) AS usuarios, " +
    "(SELECT COALESCE(MAX(c),0)::int FROM (SELECT COUNT(*) AS c FROM marcas " +
    " GROUP BY usuario_id) s) AS max_marcas_por_usuario");
  if (conteos.length > 0) {
    var k = conteos[0];
    console.log('    - Estado previo: marcas=' + k.marcas +
      ' | consumibles=' + k.consumibles + ' | usuarios=' + k.usuarios +
      ' | max marcas por usuario=' + k.max_marcas_por_usuario);
    if (Number(k.max_marcas_por_usuario) > 1) {
      aviso('A-4', 'ya hay usuarios con mas de una marca (' +
        k.max_marcas_por_usuario + '): el rollback del UNIQUE seria imposible.');
    }
  }

  if (esFake) {
    console.log('    (modo fake: fake_neon no refleja el estado real de Neon.)');
  }
}

function notasDeploy() {
  console.log('\n[4] Notas de aplicacion (ADR-107 D16):');
  console.log('    - Aplicar el fichero COMPLETO con el runner real:');
  console.log('        node scripts/apply_sql_file.js db/migrations/058_marcas_self_service_premios_canje.sql');
  console.log('      (el ledger es la puerta: predecesor 057 obligatorio; la 058 se');
  console.log('      niega a correr si ya hay fila con numero >= 58).');
  console.log('    - El DROP del UNIQUE rompe en runtime el ON CONFLICT (usuario_id)');
  console.log('      de marca_activar (42P10): desplegar @backend-dev ANTES de usar');
  console.log('      el modulo (ADR-107 D2 / T-2 de la cabecera del SQL).');
  console.log('    - La marca ANCESTRAL NO la crea la migracion: la crea el operador');
  console.log('      por marca_crear (gate 5, 1650 XP). Los 3 productos nacen con');
  console.log('      marca_id = NULL; el paso 7 del plan D16 los vincula.');
  console.log('    - La 058 es idempotente: segunda corrida = no-op funcional.');
}

async function main() {
  var args = process.argv.slice(2);
  if (args.indexOf('--help') !== -1 || args.indexOf('-h') !== -1) {
    console.log('Uso: node scripts/verify_058_precheck.js [--dry-run|--seco]');
    console.log('  --dry-run  solo chequeo estatico, sin red (exit 0 si el fichero esta bien)');
    console.log('  (sin flag) estatico + estado real de Neon via .env.local');
    console.log('Exit: 0 listo | 1 estado no esperado | 2 sin credenciales | 3 error del script');
    return 0;
  }
  SECO = (args.indexOf('--dry-run') !== -1 || args.indexOf('--seco') !== -1);

  console.log('=== PRECHECK 058 (ADR-107: marcas self-service, premios, canje) ===');
  chequeoEstatico();

  if (SECO) {
    notasDeploy();
    return veredicto(true);
  }

  require(path.join(__dirname, 'load_env_local'))();
  var url = urlValida(process.env.DATABASE_URL);

  var neon = null;
  try {
    neon = require('@neondatabase/serverless').neon;
  } catch (e) {
    if (!e || e.code !== 'MODULE_NOT_FOUND') {
      console.log('\n    INFO - error inesperado al cargar el driver: ' + e.message);
    }
  }

  if (!url || !neon) {
    notasDeploy();
    console.log('\n=== VEREDICTO ===');
    console.log('    SECO - ' + (!url ? 'DATABASE_URL ausente o invalida' :
      'falta @neondatabase/serverless') + ': el estado de Neon NO se ha verificado.');
    console.log('    NO se afirma que la 058 se pueda aplicar. Configura .env.local o');
    console.log('    define DATABASE_URL y vuelve a correr sin --dry-run.');
    return 2;
  }

  try {
    await chequeoRuntime(neon(url), false);
  } catch (e) {
    obstaculo('O-15', 'no se pudo consultar el runtime (read-only): ' +
      (e && e.message ? e.message : String(e)));
  }

  notasDeploy();
  return veredicto(false);
}

function veredicto(seco) {
  console.log('\n=== VEREDICTO ===');
  if (OBSTACULOS.length > 0) {
    console.log('    FAIL - estado NO esperado (' + OBSTACULOS.length + ' obstaculo(s)):');
    OBSTACULOS.forEach(function (o) { console.log('      ' + o); });
    if (AVISOS.length > 0) {
      console.log('    AVISOS (' + AVISOS.length + '):');
      AVISOS.forEach(function (a) { console.log('      ' + a); });
    }
    console.log('    NO APLICAR hasta resolver lo anterior.');
    return 1;
  }
  if (AVISOS.length > 0) {
    console.log('    OK con AVISOS (' + AVISOS.length + '):');
    AVISOS.forEach(function (a) { console.log('      ' + a); });
  }
  if (seco) {
    console.log('    SECO - el fichero 058 pasa el chequeo estatico;');
    console.log('    el estado de Neon NO se ha verificado en este modo.');
    return 0;
  }
  console.log('    OK - estado esperado: la 058 es aplicable con el runner.');
  return 0;
}

main().then(function (codigo) {
  process.exit(codigo);
}).catch(function (e) {
  console.error('FAIL - error inesperado del script: ' + (e && e.message ? e.message : e));
  process.exit(3);
});
