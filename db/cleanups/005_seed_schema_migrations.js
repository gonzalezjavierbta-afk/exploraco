// 005_seed_schema_migrations.js
// Seed del historico de db/migrations/ en la tabla schema_migrations (creada por
// la migracion 045). NO va dentro de la 045: la 045 solo crea la tabla, este
// script la llena. Separados a proposito, para que la estructura y el contenido
// tengan chacune su propio fichero versionado.
//
// QUE ESCRIBE: UNA fila por fichero .sql de db/migrations/, con:
//   - nombre   : el nombre exacto del fichero en disco (clave natural, PK).
//   - numero   : los tres primeros digitos del nombre.
//   - resultado: 'aplicada' | 'historico_no_verificado' (vocabulario cerrado por
//                el CHECK schema_migrations_resultado_chk).
//   - checksum : sha256 de los BYTES DEL FICHERO EN DISCO. Es un hecho sobre el
//                repo, no sobre la base de datos: es lo que permite detectar
//                DERIVA despues (seccion DERIVA de la 045).
//   - notas    : la evidencia y su GRADO. Sin credenciales jamas (contrato (d)).
//
// LOS TRES NIVELES DE CONFIANZA QUE ESTE SEED RESPETA
//   ALTA  resultado='aplicada' + verificada_en informado. Solo la 044: su
//        estado se comprobio con sondas READ-ONLY contra el motor el dia del
//        seed, y las cifras medidas van escritas en notas.
//   MEDIA resultado='aplicada' + verificada_en NULL. Solo la 045: el runner no
//        puede verificarse en el mismo instante en que se inscribe su fila, y
//        marcarla verificada seria mentira. Asi se queda, y sube a ALTA solo
//        cuando alguien ejecute la verificacion posterior.
//   CERO  resultado='historico_no_verificado'. Las 41 migraciones restantes:
//        el fichero existe y hay fila; el estado real en Neon es DESCONOCIDO.
//        Estas filas NO afirma nada sobre la base de datos y no cuentan como
//        cobertura. 'aplicada_en' queda NULL a proposito: nadie sabe cuando se
//        aplicaron, y el CHECK schema_migrations_estado_chk lo prohibe.
//
// IDEMPOTENCIA (ADR-008): INSERT ... ON CONFLICT (nombre) DO NOTHING. Nunca
// duplica, nunca pisa una fila existente, nunca hace UPDATE. Y jamas reescribe
// el checksum almacenado: si un .sql cambio despues de aplicarse, eso es una
// DERIVA y se REPORTA, no se corrige (corregirla borraria la unica evidencia).
//
// USO (PowerShell):
//   node db/cleanups/005_seed_schema_migrations.js            -> DRY-RUN, no
//     escribe NADA. Imprime el plan y las validaciones. Es el modo por defecto.
//   node db/cleanups/005_seed_schema_migrations.js --apply    -> escribe.
//
// ASCII-safe (ADR-002): cero bytes > 127, cero backticks, CommonJS estricto.
// Nunca imprime DATABASE_URL ni ningun secreto.
'use strict';

var fs = require('fs');
var path = require('path');
var crypto = require('crypto');

var RAIZ = path.join(__dirname, '..', '..');
var DIR_MIG = path.join(RAIZ, 'db', 'migrations');

// Mismas dos reglas que imponen los CHECK de la 045, replicadas aqui para
// fallar ANTES de tocar la base de datos y no a mitad de un INSERT.
var RE_NOMBRE = /^[0-9]{3}_[a-z0-9_]+\.sql$/;
var VOCAB = ['aplicada', 'historico_no_verificado', 'fallida'];

var APPLY = process.argv.indexOf('--apply') !== -1;

// Dia en que se corrieron las sondas read-only que sostienen la fila de la 044.
// Se escribe como texto en notas para que el registro sea legible sin depender
// de la zona horaria de quien lo lea mas adelante.
var DIA_SONDA = '2026-10-05';

var NOTAS_HIST = 'Fichero en disco y fila aqui: eso es todo lo que se afirma. ' +
  'El estado real de esta migracion en Neon es DESCONOCIDO y nadie lo ha ' +
  'comprobado. NO cuenta como cobertura de esquema. Confianza CERO. ' +
  'El checksum es el sha256 de los bytes del fichero en disco al momento de ' +
  'este seed: es un hecho sobre el repo, no prueba que se aplicara. ' +
  'aplicada_en queda NULL a proposito, porque nadie sabe cuando se aplico.';

var NOTAS_044 = 'Aplicada y verificada con sondas READ-ONLY el ' + DIA_SONDA + ', ' +
  'medido contra el motor, no afirmado. Medido ese dia: (1) la columna ' +
  'planes_viaje.fecha_inicio EXISTE con tipo date; (2) el indice ' +
  'idx_planes_viaje_activo_fecha EXISTE (btree sobre fecha_inicio con predicado ' +
  'parcial WHERE activo = true); (3) backfill: de 1 fila en planes_viaje, 1 ' +
  'tiene fecha_inicio informada; (4) el filtro de produccion WHERE activo = ' +
  'true AND (fecha_inicio IS NULL OR fecha_inicio >= CURRENT_DATE) devuelve 0 ' +
  'filas con 1 plan activo en base, lo que prueba que el codigo desplegado ya ' +
  'filtra. Confianza ALTA: verificada_en informado. ' +
  'aplicada_en es el instante de este seed, NO el momento medido de la ' +
  'ejecucion: no se midio. La idempotencia del backfill la afirmo el operador y ' +
  'este seed no la re-ejecuta (el 044 no contiene ningun UPDATE ejecutable).';

var NOTAS_045 = 'Tabla de control creada por el runner versionado con ' +
  'db/migrations/045_schema_migrations.sql: 6 sentencias detectadas, 6 OK. ' +
  'Reejecutada para probar idempotencia: 6 OK de nuevo y estructura identica ' +
  '(7 constraints = 6 CHECK + 1 PRIMARY KEY, 3 indices, relrowsecurity = ' +
  'false). Confianza MEDIA y NO sube a ALTA por diseno: verificada_en queda ' +
  'NULL porque el runner no puede verificarse en el mismo instante en que se ' +
  'inscribe su propia fila. Marcarla verificada seria falso. aplicada_en es el ' +
  'instante de este seed, minutos despues de la aplicacion real.';

function log(m) { console.log(m); }
function fallo(m) { console.error(m); }
function errCode(e) { return (e && e.code) ? String(e.code) : 'n/a'; }
function errMsg(e) { return (e && e.message) ? String(e.message) : String(e); }

function urlValida(raw) {
  if (raw === undefined || raw === null || String(raw).trim() === '') return null;
  var s = String(raw).trim();
  if ((s.charAt(0) === '"' && s.charAt(s.length - 1) === '"') ||
      (s.charAt(0) === "'" && s.charAt(s.length - 1) === "'")) {
    s = s.slice(1, -1);
  }
  if (s.indexOf('...') !== -1) return null;
  if (s.indexOf('postgresql://') !== 0 && s.indexOf('postgres://') !== 0) return null;
  if (/\s/.test(s)) return null;
  return s;
}

// Valida una fila candidata contra los CHECK de la 045. Devuelve null si vale,
// o el texto del rechazo. Falla aqui, y no a mitad del INSERT.
function validar(f) {
  if (!RE_NOMBRE.test(f.nombre)) {
    return 'no casa con el CHECK nombre (^[0-9]{3}_[a-z0-9_]+\\.sql$)';
  }
  var prefijo = f.nombre.substring(0, 3);
  if (!/^[0-9]{3}$/.test(prefijo)) return 'el prefijo de 3 caracteres no son digitos';
  if (f.numero !== parseInt(prefijo, 10)) {
    return 'numero (' + f.numero + ') != substring(nombre,1,3)::smallint (' + parseInt(prefijo, 10) + ')';
  }
  if (VOCAB.indexOf(f.resultado) === -1) {
    return 'resultado fuera del vocabulario cerrado de 3 valores';
  }
  if (f.checksum !== null && !/^[0-9a-f]{64}$/.test(f.checksum)) {
    return 'checksum no es 64 hexadecimales en minuscula';
  }
  if (f.resultado === 'aplicada' && f.aplicada_en === null) {
    return "resultado 'aplicada' exige aplicada_en IS NOT NULL";
  }
  if (f.resultado === 'historico_no_verificado' && f.aplicada_en !== null) {
    return "resultado 'historico_no_verificado' exige aplicada_en IS NULL";
  }
  return null;
}

function main() {
  log('=== SEED 005: historico de db/migrations/ -> schema_migrations ===');
  log('MODO: ' + (APPLY ? 'APPLY (escribe)' : 'DRY-RUN (no escribe NADA)'));

  // ---- 1. Lectura del disco ------------------------------------------------
  var leidos = fs.readdirSync(DIR_MIG).filter(function (n) { return /\.sql$/.test(n); }).sort();
  log('Ficheros .sql en db/migrations/: ' + leidos.length);

  var ahora = new Date();
  var ahoraIso = ahora.toISOString();

  var filas = [];
  var descartados = [];
  var nums = {};
  var colisiones = [];

  leidos.forEach(function (nombre) {
    var bytes = fs.readFileSync(path.join(DIR_MIG, nombre));
    var sha = crypto.createHash('sha256').update(bytes).digest('hex');
    var f;
    if (nombre === '045_schema_migrations.sql') {
      f = {
        nombre: nombre,
        numero: parseInt(nombre.substring(0, 3), 10),
        resultado: 'aplicada',
        checksum: sha,
        aplicada_en: ahoraIso,
        verificada_en: null,
        duracion_ms: null,
        notas: NOTAS_045
      };
    } else if (nombre === '044_planes_viaje_fecha_inicio.sql') {
      f = {
        nombre: nombre,
        numero: parseInt(nombre.substring(0, 3), 10),
        resultado: 'aplicada',
        checksum: sha,
        aplicada_en: ahoraIso,
        verificada_en: ahoraIso,
        duracion_ms: null,
        notas: NOTAS_044
      };
    } else {
      f = {
        nombre: nombre,
        numero: parseInt(nombre.substring(0, 3), 10),
        resultado: 'historico_no_verificado',
        checksum: sha,
        aplicada_en: null,
        verificada_en: null,
        duracion_ms: null,
        notas: NOTAS_HIST
      };
    }

    var err = validar(f);
    if (err) { descartados.push({ nombre: nombre, motivo: err }); return; }

    if (Object.prototype.hasOwnProperty.call(nums, f.numero)) {
      colisiones.push('numero ' + f.numero + ': ' + nums[f.numero] + ' y ' + f.nombre);
    } else { nums[f.numero] = f.nombre; }

    filas.push(f);
  });

  log('Ficheros que NO casan con el regex del CHECK nombre (descartados): ' + descartados.length);
  descartados.forEach(function (d) { log('  DESCARTADO ' + d.nombre + ' -> ' + d.motivo); });
  log('Colisiones de numero (violarian el UNIQUE INDEX de numero): ' + colisiones.length);
  colisiones.forEach(function (c) { log('  COLISION ' + c); });

  // ---- 2. Reporte del plan -------------------------------------------------
  var reparto = { aplicada: 0, historico_no_verificado: 0, fallida: 0 };
  filas.forEach(function (f) { reparto[f.resultado]++; });
  log('');
  log('PLAN: ' + filas.length + ' filas | aplicada=' + reparto.aplicada +
    ' | historico_no_verificado=' + reparto.historico_no_verificado +
    ' | fallida=' + reparto.fallida);
  log('     con verificada_en informado (ALTA) = ' +
    filas.filter(function (f) { return f.verificada_en !== null; }).length);
  log('     con verificada_en NULL (MEDIA/CERO) = ' +
    filas.filter(function (f) { return f.verificada_en === null; }).length);

  if (!APPLY) {
    log('');
    log('--- FILAS A ESCRIBIR (dry-run) ---');
    filas.forEach(function (f) {
      log('  ' + f.nombre + ' | n=' + f.numero + ' | ' + f.resultado +
        ' | sha=' + f.checksum.substring(0, 12) + '...' +
        ' | verificada_en=' + (f.verificada_en !== null ? 'SI (ALTA)' : 'NULL (no ALTA)'));
    });
    log('');
    log('DRY-RUN COMPLETO. No se ejecuto ninguna escritura. Usa --apply para escribir.');
    return Promise.resolve();
  }

  // ---- 3. Escritura --------------------------------------------------------
  if (descartados.length > 0) {
    fallo('ABORTA - hay ' + descartados.length + ' fichero(s) que no casan con el CHECK nombre.');
    fallo('          Insertarlos haria fallar la sentencia entera. Corregidos en disco, reintentar.');
    return Promise.resolve();
  }
  if (colisiones.length > 0) {
    fallo('ABORTA - hay colisiones de numero; el UNIQUE INDEX (numero) rechazaria el INSERT.');
    return Promise.resolve();
  }

  // Carga DATABASE_URL sin imprimirla. load_env_local() no devuelve nada: se
  // llama por efecto secundario, nunca encadenado con &&.
  require(path.join(RAIZ, 'scripts', 'load_env_local'))();

  return credenciales()
    .then(function (sql) { return escribir(sql, filas); })
    .then(function (r) {
      log('');
      log('=== RESULTADO ===');
      log('Filas insertadas: ' + r.insertadas);
      log('Filas omitidas por conflicto (ya existian): ' + r.omitidas);
      log('Derivas detectadas (checksum distinto al almacenado): ' + r.derivas.length);
      r.derivas.forEach(function (d) { log('  DERIVA ' + d); });
    });
}

function credenciales() {
  var url = urlValida(process.env.DATABASE_URL);
  if (!url) {
    return Promise.reject(new Error('DATABASE_URL ausente o invalida en .env.local. No se imprime el valor.'));
  }
  var neon;
  try {
    neon = require(path.join(RAIZ, 'node_modules', '@neondatabase', 'serverless')).neon;
  } catch (e) {
    return Promise.reject(new Error('falta @neondatabase/serverless: ' + errMsg(e)));
  }
  // NOTA sobre el cierre del proceso: con el pool HTTP vivo, un process.exit()
  // forzado compite con el cierre de los sockets de undici y en Windows eso
  // dispara "Assertion failed: handle->flags & UV_HANDLE_CLOSING" (medido el
  // 2026-10-05). El trabajo terminaba bien y el proceso moria con codigo de
  // error: un exit code enganoso que hace creer que el seed fallo cuando se
  // aplico. La correccion esta al final del fichero (no forzar la salida), NO
  // aqui: neonConfig.fetchConnectionCache resulto ser un no-op en 0.9.5, que lo
  // avisa por stderr ("deprecated, now always true").
  var sql = neon(url);
  // La tabla tiene que existir (la creo la 045). Si no, el seed no puede
  // escribir y NO se inventa nada.
  return sql("SELECT count(*) AS n FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'schema_migrations'", [])
    .then(function (r) {
      if (!r || !r[0] || String(r[0].n) !== '1') {
        throw new Error('la tabla schema_migrations NO existe todavia. Aplica antes la 045.');
      }
      return sql;
    });
}

function escribir(sql, filas) {
  var res = { insertadas: 0, omitidas: 0, derivas: [] };

  return sql('SELECT nombre, checksum, resultado FROM schema_migrations', [])
    .then(function (existe) {
      var porNombre = {};
      (existe || []).forEach(function (e) { porNombre[e.nombre] = e; });

      // DERIVA: el .sql de disco no coincide con el checksum almacenado. Se
      // REPORTA y la fila se excluye del INSERT. Nunca se hace UPDATE del
      // checksum almacenado: eso borraria la evidencia del cambio (ADR-003).
      var aInsertar = [];
      filas.forEach(function (f) {
        var pre = porNombre[f.nombre];
        if (pre && pre.checksum && pre.checksum !== f.checksum) {
          res.derivas.push(f.nombre + ' (disco ' + f.checksum.substring(0, 12) + '..., base ' + String(pre.checksum).substring(0, 12) + '...)');
          return;
        }
        if (pre) { res.omitidas++; return; }
        aInsertar.push(f);
      });

      if (aInsertar.length === 0) {
        log('Nada nuevo que insertar (todo existe ya). INSERT no emitido.');
        res.omitidas = filas.length;
        return res;
      }

      // Un solo INSERT multi-fila con ON CONFLICT DO NOTHING: si dos ficheros
      // compiten, el segundo no pisa al primero ni aborta el lote.
      var params = [];
      var tuplas = aInsertar.map(function (f, i) {
        var b = i * 8 + 1;
        var p = [];
        for (var j = 0; j < 8; j++) p.push('$' + (b + j));
        params.push(f.nombre, f.numero, f.resultado, f.checksum,
          f.aplicada_en, f.verificada_en, f.duracion_ms, f.notas);
        return '(' + p.join(',') + ')';
      });

      var stmt = 'INSERT INTO schema_migrations ' +
        '(nombre, numero, resultado, checksum, aplicada_en, verificada_en, duracion_ms, notas) VALUES ' +
        tuplas.join(',') +
        ' ON CONFLICT (nombre) DO NOTHING RETURNING nombre';

      return sql(stmt, params).then(function (r) {
        res.insertadas = (r || []).length;
        res.omitidas = filas.length - res.insertadas;
        log('INSERT emitido sobre ' + aInsertar.length + ' fila(s) candidatas.');
        return res;
      });
    });
}

// SALIDA LIMPIA. No se fuerza process.exit() en el camino feliz: se deja que
// el bucle de eventos termine solo con el pool de conexiones ya cerrado. Si
// aun asi el proceso se quedara vivo, el tope de 5 s lo cierra con el codigo
// que corresponde, para que un exit code enganoso no llegue nunca a un
// operador ni a un hook (medido el 2026-10-05).
var CODIGO = 0;

main().then(function () {
  CODIGO = 0;
}, function (e) {
  fallo('FAIL - SQLSTATE ' + errCode(e) + ' -> ' + errMsg(e));
  CODIGO = 1;
});

var tope = setTimeout(function () { process.exit(CODIGO); }, 5000);
tope.unref();

process.on('exit', function () { process.exitCode = CODIGO; });
