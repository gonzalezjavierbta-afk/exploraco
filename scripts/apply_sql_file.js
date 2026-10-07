// apply_sql_file.js
// Runner generico de SQL de ExploraCO contra Neon. Para los .sql de
// db/migrations/ es ademas el PORTERO DEL LEDGER: escribe una fila en
// schema_migrations (creada por la 045) y se niega a aplicar un fichero cuyo
// predecesor no esta registrado. Para el SQL suelto de fuera de esa carpeta se
// comporta exactamente como antes.
//
// QUE HACE (sin cambios desde siempre, ADR-006 sobre el archivo real)
//   1. Carga DATABASE_URL con scripts/load_env_local.js (nunca la imprime).
//   2. Ignora lineas de comentario puro (-- ...) y lineas vacias.
//   3. Divide por ';' respetando bloques dollar-quote ($$ ... $$) y literales
//      entre comillas simples/dobles, para no partir un DO block.
//   4. Ejecuta cada sentencia con await sql(sentencia), en orden.
//   5. Loguea "OK: <primeros 60 chars>" o "FAIL: <sentencia> -> <error>".
//
// QUE ANADE (contrato (a)-(e) que fijo la cabecera de la 045)
//   a) Registra SIEMPRE una fila por fichero de db/migrations/ con nombre,
//      numero, resultado, checksum (sha256 de los bytes en disco),
//      aplicada_en, duracion_ms y notas. Solo con INSERT cuando no habia fila.
//   b) RECHAZA el fichero si algun .sql con numero MENOR esta en disco y no
//      tiene fila, o si el MAYOR de esos predecesores PRESENTES en disco no
//      tiene fila valida. La unidad de comparacion es el FICHERO QUE ESTA EN
//      DISCO, no un rango inventado: 001 y 002 no existen, luego no son
//      predecesoras de nadie y su ausencia no invalida 003. Un hueco
//      deliberado (fichero reubicado fuera del scan, p.ej. a documental/) no
//      bloquea a su sucesor: lo que debe tener fila es el ultimo real.
//   c) Detecta DERIVA (sha256 de disco distinto del checksum de la fila) y la
//      REPORTA. Nunca sobrescribe el checksum de una fila existente (ADR-003:
//      eso borraria la unica evidencia). La correccion es una migracion nueva.
//   d) notas lleva el motivo de la operacion. Nunca credenciales: hay un
//      saneador que las elimina antes de escribir.
//   e) Un fallo a medias deja fila resultado = 'fallida' con el motivo y sale
//      con codigo distinto de 0. Antes salia 1 sin registrar nada, que es
//      justo el agujero que la 045 vino a tapar.
//
// COMPATIBILIDAD (no rompe lo que ya funcionaba)
//   Sin opciones el comando es el de siempre:
//     node scripts/apply_sql_file.js db/migrations/029_album_fotos_coords.sql
//   Un .sql FUERA de db/migrations/ (los db/cleanups/*.sql, consultas sueltas,
//   lo que sea) se ejecuta igual que antes, SIN ledger, y avisa por pantalla de
//   que se sale del registro. El contrato (a)-(e) no se puede saltar: no hay
//   flag para desactivarlo, y dentro de db/migrations/ no hay forma de
//   aplicarlo sin escribir en la tabla.
//
// CASO LIMITE (obligatorio, no opcional)
//   Base de datos nueva donde la 045 no esta aplicada: schema_migrations no
//   existe. Si el runner la consultara sin mas, reventaria justo cuando se
//   necesita la 045. Aqui la tabla se comprueba con to_regclass() (que devuelve
//   NULL en vez de levantar 42P01) y:
//     - si el fichero es el 045 o anterior, se aplica y NO se registra, con un
//       aviso que dice el orden exacto a seguir despues;
//     - si es posterior al 45, se RECHAZA con el orden de pasos para dejar la
//       base de datos en condiciones. Sin ledger no hay puerta, y sin puerta no
//       se aplica.
//
// USO (PowerShell)
//   node scripts/apply_sql_file.js <ruta.sql> [--dry-run] [--json]
//                                      [--notas "texto"] [-h|--help]
//
// EXIT CODES (documentados y distintos)
//   0  la operacion se completo
//   1  la operacion NO se completo: error de SQL, deriva, o puerta del
//      predecesor. Incluye el rechazo de un --dry-run que no pasa la puerta.
//   2  uso incorrecto: falta la ruta, sobran rutas, el fichero no existe, o la
//      opcion no existe.
//
// ASCII-safe (ADR-002): cero bytes > 127, cero backticks, CommonJS estricto.
'use strict';

var fs = require('fs');
var path = require('path');
var crypto = require('crypto');

var RAIZ = path.join(__dirname, '..');
var DIR_MIG = path.join(RAIZ, 'db', 'migrations');
var TABLA = 'schema_migrations';
var NOMBRE_LEDGER = '045_schema_migrations.sql';
var NUM_LEDGER = 45;
var RE_NOMBRE = /^[0-9]{3}_[a-z0-9_]+\.sql$/;
// Resultados que sirven como prueba de predecesor. 'fallida' NO vale: una
// migracion a medias es un hueco de verdad, del mismo tipo que no tener fila.
var PREDE_SIREN = ['aplicada', 'historico_no_verificado'];
var MAX_NOTAS = 900;

var FLAGS = { ruta: null, dryRun: false, json: false, notas: '', ayuda: false };
var CODIGO = 0;
var SUM = null;

// ---------------------------------------------------------------------------
// Salida
// ---------------------------------------------------------------------------

function log(m) {
  // Con --json stdout queda reservado al resumen: el progreso humano, que es
  // para una persona, va a stderr. Asi un agente puede parsear sin limpiar.
  if (FLAGS.json) { console.error(String(m)); return; }
  console.log(String(m));
}

function err(m) {
  console.error(String(m));
}

function codigoSalida(n) {
  CODIGO = n;
  if (SUM) SUM.exit_code = n;
}

function uso(destino) {
  var t = [];
  t.push('Uso: node scripts/apply_sql_file.js <ruta.sql> [opciones]');
  t.push('');
  t.push('Opciones:');
  t.push('  --dry-run       valida predecesores, deriva y sintaxis. NO escribe nada,');
  t.push('                  ni en el esquema ni en schema_migrations.');
  t.push('  --json          resumen por clave en stdout, parseable por un agente.');
  t.push('                  Los avisos de progreso pasan a stderr.');
  t.push('  --notas "texto" motivo de la operacion para schema_migrations.notas. Se');
  t.push('                  sanean credenciales y todo byte > 127 antes de escribir.');
  t.push('  -h, --help      esta ayuda.');
  t.push('');
  t.push('Exit codes: 0 ok | 1 la operacion NO se completo | 2 uso incorrecto');
  t.push('');
  t.push('Dentro de db/migrations/: contrato de ledger (a)-(e), obligatorio y sin');
  t.push('forma de saltarselo. Fuera de ahi: se ejecuta como siempre, sin registrar,');
  t.push('y avisa por pantalla de que se sale del registro.');
  var txt = t.join('\n');
  if (destino === 'log') { console.log(txt); } else { console.error(txt); }
}

async function main() {
  var p = parsearArgs(process.argv);
  if (p.ayuda) { uso('log'); codigoSalida(0); return; }
  if (p.codigo !== 0) { codigoSalida(2); return; }

  var rutaAbs = path.resolve(FLAGS.ruta);
  SUM.archivo = normalizar(FLAGS.ruta);
  SUM.modo = FLAGS.dryRun ? 'dry-run' : 'apply';

  if (!fs.existsSync(rutaAbs)) {
    err('FAIL - no existe el archivo: ' + rutaAbs);
    SUM.errores = ['no existe el archivo: ' + normalizar(FLAGS.ruta)];
    codigoSalida(2);
    return;
  }

  var base = path.basename(rutaAbs);
  var esMig = mismaRuta(path.dirname(rutaAbs), DIR_MIG);
  var num = numeroDe(base);
  SUM.es_migracion = esMig;
  SUM.numero = num;

  // Lectura y troceado: identico al de siempre, y no toca la red.
  var texto = quitarComentarios(fs.readFileSync(rutaAbs, 'utf8'));
  var sentencias = dividirSentencias(texto);
  SUM.sentencias = sentencias.length;

  log('=== APLICAR SQL: ' + base + ' ===');
  log('MODO: ' + (FLAGS.dryRun ? 'DRY-RUN (no escribe nada)' : 'APPLY (escribe)'));

  // ---- RAMA LEGACY: fuera de db/migrations/ ------------------------------
  if (!esMig) {
    log('AVISO - este fichero NO esta en db/migrations/.');
    log('         Se ejecuta como siempre y NO se registra en schema_migrations.');
    log('         El ledger solo cubre los .sql de db/migrations/, y a proposito:');
    log('         las limpiezas y los backfills de una vez no son historia de esquema.');
    log('Sentencias detectadas: ' + sentencias.length);
    if (FLAGS.dryRun) {
      sentencias.forEach(function (s, i) {
        log('  [' + (i + 1) + '/' + sentencias.length + '] ' + resumen(s));
      });
      log('=== FIN DRY-RUN: no se abrio conexion ni se escribio nada ===');
      codigoSalida(0);
      return;
    }
    return ejecutarSinLedger(sentencias, base);
  }

  // ---- RAMA MIGRACION: puerta del ledger ---------------------------------
  // El nombre tiene que cumplir el CHECK nombre de la 045. Un fichero de
  // db/migrations/ que no lo cumple no se puede registrar, y el contrato (a)
  // no admite ficheros sin fila: se rechaza en vez de aplicarlo a ciegas.
  if (num === null) {
    err('RECHAZO - ' + base + ' no cumple el CHECK nombre de la 045.');
    err('         Se exige el patron ^[0-9]{3}_[a-z0-9_]+\\.sql$ porque el ledger');
    err('         registra una fila por fichero con esa convencion.');
    err('         Renombrar un .sql ya comitteado no es una migracion: escribe una');
    err('         nueva. Si esto es una prueba, llevalo fuera de db/migrations/.');
    SUM.errores = ['nombre fuera del CHECK nombre de la 045: ' + base];
    codigoSalida(1);
    return;
  }

  var sql = abrirConexion();
  if (sql === null) { codigoSalida(1); return; }

  var ctx = {
    nombre: base,
    numero: num,
    rutaAbs: rutaAbs,
    sha: shaDe(rutaAbs),
    hayFilaPrevia: false,
    filaPrevia: null,
    escritura: 'ninguna'
  };
  SUM.checksum_disco = ctx.sha;

  log('MIGRACION detectada: ' + base + ' (numero ' + num + ')');
  log('sha256 del fichero en disco: ' + ctx.sha);
  log('Sentencias detectadas: ' + sentencias.length);

  // ---- CASO LIMITE: la tabla puede no existir todavia ---------------------
  var existeTabla = await tablaExiste(sql);
  SUM.ledger_disponible = existeTabla;
  if (!existeTabla) {
    if (num <= NUM_LEDGER) {
      var a = [];
      a.push('la tabla ' + TABLA + ' NO existe todavia en esta base de datos.');
      a.push('Este fichero es el ' + num + ', que es el ' + NOMBRE_LEDGER + ' o anterior:');
      a.push('se aplica y NO se puede registrar, porque no hay donde. Es el unico caso');
      a.push('en que el runner escribe fuera del ledger, y no es opcional: es la 045');
      a.push('la que crea la tabla.');
      a.push('DESPUES, en este orden exacto:');
      a.push('  1) node scripts/apply_sql_file.js --dry-run ' + NOMBRE_LEDGER);
      a.push('  2) node db/cleanups/005_seed_schema_migrations.js            (dry-run)');
      a.push('  3) node db/cleanups/005_seed_schema_migrations.js --apply    (historico)');
      a.push('  4) node scripts/apply_sql_file.js --dry-run <siguiente>.sql');
      a.push('Sin el paso 3 la puerta del predecesor bloqueara la siguiente migracion,');
      a.push('porque las 43 filas de historico no estarian. Que bloquee es la regla');
      a.push('funcionando, no un fallo.');
      SUM.advertencias = a;
      a.forEach(function (l) { log('AVISO - ' + l); });
    } else {
      err('RECHAZO - la tabla ' + TABLA + ' NO existe y este fichero es el ' + num + '.');
      err('  Sin ledger no hay puerta del predecesor que comprobar, y esa puerta es');
      err('  justo lo que evita repetir "committeada pero no aplicada".');
      err('  Orden para una base de datos nueva o sin la 045 aplicada:');
      err('    1) node scripts/apply_sql_file.js db/migrations/' + NOMBRE_LEDGER);
      err('    2) node db/cleanups/005_seed_schema_migrations.js --apply');
      err('    3) node scripts/apply_sql_file.js --dry-run ' + normalizar(rutaAbs));
      SUM.errores = ['sin ' + TABLA + ' no se puede aplicar el ' + num];
      codigoSalida(1);
      return;
    }
  }

  var filas = existeTabla ? await leerFilas(sql) : [];
  var porNombre = {};
  filas.forEach(function (f) { porNombre[f.nombre] = f; });

  // ---- (c) DERIVA: escaneo del disco entero, sin escribir nada -----------
  var derivas = escanDeriva(porNombre);
  SUM.derivas = derivas;
  log('DERIVAS detectadas en db/migrations/: ' + derivas.length);
  derivas.forEach(function (d) {
    log('  DERIVA ' + d.nombre);
    log('    disco: ' + d.disco);
    log('    tabla: ' + d.tabla);
    log('    NO se sobrescribe el checksum de la fila (ADR-003). La correccion es');
    log('    una migracion NUEVA y numerada, no editar la que ya se aplico.');
  });
  if (derivas.length > 0) {
    log('AVISO - la deriva de un fichero que NO es este no bloquea este fichero: se');
    log('         reporta para que la mire alguien. La deriva DEL fichero que se va');
    log('         a aplicar si bloquea, y esa va justo ahora.');
  }

  // ---- (b) PUERTA DEL PREDECESOR ------------------------------------------
  var pred = revisarPredecesores(num, porNombre);
  SUM.predecesores = pred;
  log('PREDECESORES: ' + pred.total + ' .sql en disco con numero menor, ' +
      pred.con_fila + ' con fila, ' + pred.sin_fila.length + ' sin fila.');
  log('N-1 efectivo (' + (pred.n_menos_1 || 'ninguno') + ') presente y con fila valida: ' +
      pred.n_menos_1_ok);

  if (pred.bloqueos.length > 0) {
    err('RECHAZO - puerta del predecesor (contrato b).');
    pred.sin_fila.forEach(function (n) {
      err('  SIN FILA en ' + TABLA + ': ' + n);
    });
    pred.fallidas.forEach(function (n) {
      err('  FILA fallida (no sirve como predecesor): ' + n);
    });
    if (!pred.n_menos_1_ok) {
      err('  N-1 efectivo = ' + (pred.n_menos_1 || 'ninguno') +
          ' no existe en db/migrations/ o no tiene fila con');
      err('  resultado aplicado/historico_no_verificado.');
    }
    err('  Que hacer: aplicar primero las que faltan, en orden ascendente, con este');
    err('  mismo runner. "Committeada != aplicada" es el fallo que esta puerta existe');
    err('  para cazar, y 044_planes_viaje_fecha_inicio.sql ya lo pago una vez en prod.');
    if (FLAGS.dryRun) { err('  (DRY-RUN: no se ha escrito nada.)'); }
    SUM.errores = pred.bloqueos;
    codigoSalida(1);
    return;
  }

  // ---- (c) deriva DEL fichero objetivo: aqui si bloquea --------------------
  var derivaPropia = null;
  derivas.forEach(function (d) { if (d.nombre === ctx.nombre) derivaPropia = d; });
  if (derivaPropia !== null) {
    err('RECHAZO - deriva en el fichero que se va a aplicar: ' + ctx.nombre);
    err('  disco: ' + derivaPropia.disco);
    err('  tabla: ' + derivaPropia.tabla);
    err('  El checksum de la fila NO se sobrescribe: se conserva la evidencia del');
    err('  contenido con el que se aplico. La unica correccion valida es una');
    err('  migracion nueva y numerada. Reeditar la vieja y volver a aplicarla no es');
    err('  una operacion valida en ningun caso (ADR-003).');
    SUM.errores = ['deriva en ' + ctx.nombre];
    codigoSalida(1);
    return;
  }

  // ---- fila previa: UPDATE, nunca UPDATE del checksum ---------------------
  if (porNombre[ctx.nombre]) {
    ctx.hayFilaPrevia = true;
    ctx.filaPrevia = porNombre[ctx.nombre];
  }
  SUM.fila_previa = ctx.filaPrevia ? {
    resultado: ctx.filaPrevia.resultado,
    checksum: ctx.filaPrevia.checksum === null ? null : ctx.filaPrevia.checksum,
    aplicada_en: ctx.filaPrevia.aplicada_en === undefined ? null : ctx.filaPrevia.aplicada_en
  } : null;
  if (ctx.hayFilaPrevia) {
    if (ctx.filaPrevia.checksum === null) {
      log('AVISO - la fila previa tiene checksum NULL. Se deja como esta: el contrato');
      log('         (c) prohibe escribir jamas en esa columna de una fila existente.');
    }
    log('FILA PREVIA: resultado ' + ctx.filaPrevia.resultado +
        (ctx.filaPrevia.checksum ? '' : ', checksum NULL') +
        '. Si se aplica de nuevo, se actualizan resultado, aplicada_en, duracion_ms');
    log('           y notas. El checksum NO se toca.');
  }

  // ---- DRY-RUN: aqui termina el camino sin escribir -----------------------
  if (FLAGS.dryRun) {
    sentencias.forEach(function (s, i) {
      log('  [' + (i + 1) + '/' + sentencias.length + '] ' + resumen(s));
    });
    log('=== FIN DRY-RUN: puerta OK, deriva revisada, nada escrito ===');
    codigoSalida(0);
    return;
  }

  // ---- APPLY -------------------------------------------------------------
  var t0 = Date.now();
  var fallo = null;
  var k;
  for (k = 0; k < sentencias.length; k++) {
    try {
      await sql(sentencias[k]);
      log('OK: ' + resumen(sentencias[k]));
    } catch (e) {
      fallo = e;
      log('FAIL: ' + sentencias[k]);
      log('      SQLSTATE ' + sqlstate(e) + ' -> ' + mensaje(e));
      break;
    }
  }
  var ms = Math.max(0, Date.now() - t0);

  if (fallo !== null) {
    // (e) FALLO A MEDIAS: fila 'fallida' con el motivo, y salida != 0. Un .sql
    // de varias sentencias no es atomico: las anteriores YA quedaron aplicadas
    // y esta fila lo dice. Es un incidente, no un estado.
    var motivo = 'fallida a la sentencia ' + (k + 1) + '/' + sentencias.length +
      '; SQLSTATE ' + sqlstate(fallo) + '; ' + mensaje(fallo);
    var okRow = false;
    try {
      await registrar(sql, ctx, 'fallida', ms, motivo);
      okRow = true;
      log('REGISTRADO: fila ' + TABLA + ' con resultado fallida (sentencia ' + (k + 1) + ').');
    } catch (e2) {
      err('FAIL - no se pudo registrar la fila fallida en ' + TABLA + ': SQLSTATE ' +
          sqlstate(e2) + ' -> ' + mensaje(e2));
      err('       Sin esa fila el fallo queda sin registro, que es el agujero que');
      err('       esta tabla vino a cerrar. Revisalo a mano antes de reintentar.');
    }
    SUM.escritura = ctx.escritura;
    SUM.resultado_registrado = okRow ? 'fallida' : 'sin_registrar';
    SUM.duracion_ms = ms;
    SUM.errores = [sanearNotas(motivo)];
    codigoSalida(1);
    return;
  }

  // (a) Alta del registro. El INSERT es la via normal; el UPDATE solo existe
  // para el reintento, y jamas toca el checksum.
  var motivoOk = 'aplicada con ' + sentencias.length + ' sentencia(s) OK en ' + ms +
    ' ms; invocacion: node scripts/apply_sql_file.js ' + normalizar(rutaAbs) +
    '; modo: apply';
  if (ctx.hayFilaPrevia) {
    motivoOk += '; reejecucion sobre fila previa con resultado ' +
      ctx.filaPrevia.resultado + ' (checksum no reescrito)';
  }
  if (FLAGS.notas) { motivoOk += '; nota del operador: ' + FLAGS.notas; }
  await registrar(sql, ctx, 'aplicada', ms, motivoOk);

  SUM.escritura = ctx.escritura;
  SUM.resultado_registrado = 'aplicada';
  SUM.duracion_ms = ms;
  log('REGISTRADO: ' + TABLA + ' ' + ctx.escritura + ' con resultado aplicada (' + ms + ' ms).');
  if (FLAGS.dryRun === false && existeTabla === false) {
    log('SIN REGISTRO: la tabla no existia, asi que este fichero queda fuera del');
    log('             ledger. Sin el seed historico no hay puerta para el siguiente.');
  }
  log('=== FIN SQL: ' + base + ' (todas OK) ===');
  codigoSalida(0);
}

// ---------------------------------------------------------------------------
// Parseo de argumentos
// ---------------------------------------------------------------------------

function parsearArgs(argv) {
  var i;
  for (i = 2; i < argv.length; i++) {
    var a = argv[i];
    if (a === '--dry-run') { FLAGS.dryRun = true; continue; }
    if (a === '--json') { FLAGS.json = true; continue; }
    if (a === '--notas') {
      if (i + 1 >= argv.length) { uso('err'); return { codigo: 2 }; }
      FLAGS.notas = argv[i + 1];
      i++;
      continue;
    }
    if (a === '-h' || a === '--help') { FLAGS.ayuda = true; continue; }
    if (a.charAt(0) === '-' && a !== '-') { uso('err'); return { codigo: 2 }; }
    if (FLAGS.ruta === null) { FLAGS.ruta = a; continue; }
    uso('err');
    return { codigo: 2 };
  }
  if (FLAGS.ayuda) return { ayuda: true, codigo: 0 };
  if (!FLAGS.ruta) { uso('err'); return { codigo: 2 }; }
  return { codigo: 0 };
}

// ---------------------------------------------------------------------------
// Ledger
// ---------------------------------------------------------------------------

// El driver puede devolver el array de filas plano o envuelto en {rows}.
// Se aceptan las dos formas: adivinar mal aqui seria un fallo dificil de ver.
function filasDe(r) {
  if (!r) return [];
  if (Object.prototype.toString.call(r) === '[object Array]') return r;
  if (r.rows) return r.rows;
  return [];
}

// to_regclass() devuelve NULL cuando la relacion no existe, en vez de levantar
// 42P01. Es lo que permite distinguir "la 045 no esta aplicada" de un fallo de
// verdad, que es el caso limite obligatorio.
async function tablaExiste(sql) {
  var r;
  try {
    r = await sql("SELECT to_regclass('public." + TABLA + "')::text AS t", []);
  } catch (e) {
    if (sqlstate(e) === '42P01') return false;
    throw e;
  }
  var f = filasDe(r);
  return !!(f.length && f[0] && f[0].t);
}

async function leerFilas(sql) {
  var r = await sql('SELECT nombre, numero, resultado, checksum, aplicada_en FROM ' + TABLA, []);
  return filasDe(r);
}

// INSERT si no habia fila, UPDATE si la habia. El UPDATE no menciona la
// columna checksum en ningun caso: ese valor es la evidencia del contenido con
// el que se aplico el fichero y no se sobrescribe nunca (ADR-003).
async function registrar(sql, ctx, resultado, duracionMs, motivo) {
  var notas = sanearNotas(motivo);
  var aplicadaEn = (resultado === 'aplicada') ? new Date().toISOString() : null;
  if (!ctx.hayFilaPrevia) {
    await sql('INSERT INTO ' + TABLA +
      ' (nombre, numero, resultado, checksum, aplicada_en, duracion_ms, notas)' +
      ' VALUES ($1,$2,$3,$4,$5,$6,$7)',
      [ctx.nombre, ctx.numero, resultado, ctx.sha, aplicadaEn, duracionMs, notas]);
    ctx.escritura = 'insert';
  } else {
    await sql('UPDATE ' + TABLA +
      ' SET resultado = $1, aplicada_en = $2, duracion_ms = $3, notas = $4' +
      ' WHERE nombre = $5',
      [resultado, aplicadaEn, duracionMs, notas, ctx.nombre]);
    ctx.escritura = 'update';
  }
  return notas;
}

// Escaneo de deriva sobre TODOS los .sql de db/migrations/. Se reporta entero
// porque el numero es informacion que alguien tiene que leer; bloquear por la
// deriva de un fichero ajeno dejaria el directorio sin poder avanzar.
function escanDeriva(porNombre) {
  var salida = [];
  var enDisco = migracionesEnDisco();
  enDisco.forEach(function (n) {
    var f = porNombre[n];
    if (!f) return;
    if (!f.checksum) return;
    var sha = shaDe(path.join(DIR_MIG, n));
    if (sha !== String(f.checksum)) {
      salida.push({ nombre: n, numero: numeroDe(n), disco: sha, tabla: String(f.checksum) });
    }
  });
  return salida;
}

// Puerta del predecesor. Todo .sql con numero menor que el del fichero que se
// va a aplicar tiene que tener fila con resultado que sirva. Y el MAYOR de los
// predecesores PRESENTES en disco tiene que tener esa misma fila valida: un
// hueco deliberado (fichero reubicado fuera del scan) no bloquea al sucesor.
function revisarPredecesores(numero, porNombre) {
  var enDisco = migracionesEnDisco();
  var sinFila = [];
  var fallidas = [];
  var conFila = 0;
  var total = 0;
  var nombrePrev = null;

  enDisco.forEach(function (n) {
    var num = numeroDe(n);
    if (num === null) return;
    if (num >= numero) return;
    total++;
    // N-1 EFECTIVO = el mayor predecesor PRESENTE en disco. enDisco va ordenado
    // ascendente, asi que cada asignacion deja el ultimo (el mayor) visto. NO se
    // salta el conteo: si ademas esta sin fila, aparece en sin_fila igual. Un
    // hueco deliberado (numero - 1 reubicado fuera del scan) no bloquea.
    nombrePrev = n;
    var f = porNombre[n];
    if (!f) { sinFila.push(n); return; }
    if (PREDE_SIREN.indexOf(String(f.resultado)) === -1) {
      fallidas.push(n);
      return;
    }
    conFila++;
  });

  var prevOk = false;
  if (nombrePrev !== null) {
    var fp = porNombre[nombrePrev];
    prevOk = !!fp && PREDE_SIREN.indexOf(String(fp.resultado)) !== -1;
  }

  var bloqueos = [];
  sinFila.forEach(function (n) { bloqueos.push('sin fila: ' + n); });
  fallidas.forEach(function (n) { bloqueos.push('fila fallida: ' + n); });
  if (!prevOk) {
    bloqueos.push('N-1 efectivo (' + (nombrePrev || 'ninguno') +
      ') no existe en disco o no tiene fila valida');
  }

  return {
    total: total,
    con_fila: conFila,
    sin_fila: sinFila,
    fallidas: fallidas,
    n_menos_1: nombrePrev,
    n_menos_1_ok: prevOk,
    bloqueos: bloqueos
  };
}

function migracionesEnDisco() {
  var nombres;
  try {
    nombres = fs.readdirSync(DIR_MIG);
  } catch (e) {
    return [];
  }
  return nombres.filter(function (n) { return /\.sql$/.test(n); }).sort();
}

function numeroDe(nombre) {
  if (!RE_NOMBRE.test(nombre)) return null;
  return parseInt(nombre.substring(0, 3), 10);
}

function shaDe(rutaAbs) {
  return crypto.createHash('sha256').update(fs.readFileSync(rutaAbs)).digest('hex');
}

// ---------------------------------------------------------------------------
// notas: el motivo de la operacion, nunca una credencial (contrato d)
// ---------------------------------------------------------------------------

function sanearNotas(s) {
  var t = (s === undefined || s === null) ? '' : String(s);
  // 1. Cualquier cosa con forma de URL de Postgres, venga de donde venga.
  t = t.replace(/postgres(ql)?:\/\/[^\s"']+/gi, '[CREDENCIAL-ELIMINADA]');
  // 2. El valor real de DATABASE_URL si aparece literal en el texto.
  var url = process.env.DATABASE_URL;
  if (url && String(url).length > 8) {
    t = t.split(String(url)).join('[CREDENCIAL-ELIMINADA]');
  }
  // 3. Asignaciones tipicas de secreto, aunque no tengan URL.
  t = t.replace(/(password|passwd|pwd|clave|token|secret|api[_-]?key|bearer)\s*[=:]\s*\S+/gi,
    '$1=[ELIMINADO]');
  // 4. ASCII puro y en una sola linea (ADR-002, y el campo es TEXT legible).
  t = t.replace(/[^\x20-\x7e]/g, '?');
  t = t.replace(/\s+/g, ' ').trim();
  if (t.length > MAX_NOTAS) { t = t.slice(0, MAX_NOTAS) + '...'; }
  return t;
}

// ---------------------------------------------------------------------------
// Utilidades (sin cambios de comportamiento respecto al runner anterior)
// ---------------------------------------------------------------------------

function normalizar(p) { return String(p).replace(/\\/g, '/'); }

function mismaRuta(a, b) {
  return path.normalize(a).toLowerCase() === path.normalize(b).toLowerCase();
}

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

// Quita lineas de comentario puro (empiezan por --) y lineas vacias.
// No toca comentarios al final de una linea con SQL (no hay en las migraciones).
function quitarComentarios(texto) {
  var lineas = String(texto).split(/\r?\n/);
  var out = [];
  var i;
  for (i = 0; i < lineas.length; i++) {
    var l = lineas[i].trim();
    if (l === '') continue;
    if (l.slice(0, 2) === '--') continue;
    out.push(lineas[i]);
  }
  return out.join('\n');
}

// Delimitador dollar-quote: $$ o $etiqueta$ (identificadores simples).
var RE_DOLLAR = /^\$[A-Za-z_0-9]*\$/;

// Divide el SQL en sentencias por ';' sin romper dollar-quotes ni literales.
function dividirSentencias(texto) {
  var sents = [];
  var actual = '';
  var i = 0;
  var n = texto.length;
  var dollar = null;          // tag del dollar-quote abierto, o null
  var comillaSimple = false;
  var comillaDoble = false;

  while (i < n) {
    var c = texto.charAt(i);

    if (dollar !== null) {
      if (c === '$') {
        var m0 = RE_DOLLAR.exec(texto.slice(i));
        if (m0 && m0[0] === dollar) {
          actual += dollar;
          i += dollar.length;
          dollar = null;
          continue;
        }
      }
      actual += c;
      i++;
      continue;
    }

    if (comillaSimple) {
      if (c === "'") {
        if (texto.charAt(i + 1) === "'") { actual += "''"; i += 2; continue; }
        comillaSimple = false;
      }
      actual += c;
      i++;
      continue;
    }

    if (comillaDoble) {
      if (c === '"') {
        if (texto.charAt(i + 1) === '"') { actual += '""'; i += 2; continue; }
        comillaDoble = false;
      }
      actual += c;
      i++;
      continue;
    }

    if (c === "'") { comillaSimple = true; actual += c; i++; continue; }
    if (c === '"') { comillaDoble = true; actual += c; i++; continue; }

    if (c === '$') {
      var m1 = RE_DOLLAR.exec(texto.slice(i));
      if (m1) {
        dollar = m1[0];
        actual += m1[0];
        i += m1[0].length;
        continue;
      }
    }

    if (c === ';') {
      var t = actual.trim();
      if (t !== '') sents.push(t);
      actual = '';
      i++;
      continue;
    }

    actual += c;
    i++;
  }

  var fin = actual.trim();
  if (fin !== '') sents.push(fin);
  return sents;
}

function resumen(s) {
  var una = String(s).replace(/\s+/g, ' ').trim();
  return una.length > 60 ? una.slice(0, 60) + '...' : una;
}

function sqlstate(e) {
  return (e && e.code) ? String(e.code) : 'n/a';
}

function mensaje(e) {
  return (e && e.message) ? e.message : String(e);
}

// ---------------------------------------------------------------------------
// Conexion y rama legacy
// ---------------------------------------------------------------------------

function abrirConexion() {
  require(path.join(__dirname, 'load_env_local'))();
  var url = urlValida(process.env.DATABASE_URL);
  if (!url) {
    err('FAIL - DATABASE_URL ausente o invalida. Revisa .env.local.');
    err('       (No se imprime el valor de la credencial.)');
    return null;
  }
  var neon = null;
  try {
    neon = require('@neondatabase/serverless').neon;
  } catch (e) {
    if (e && e.code !== 'MODULE_NOT_FOUND') { throw e; }
  }
  if (!neon) {
    err('FAIL - falta el paquete @neondatabase/serverless.');
    return null;
  }
  return neon(url);
}

// Rama fuera de db/migrations/. Sin ledger, sin puerta, sin cambios: se ejecuta
// sentencia por sentencia y se sale con 1 al primer error, como siempre. La
// unica diferencia es el aviso de arriba y que no se registra nada.
async function ejecutarSinLedger(sentencias, base) {
  var conn = abrirConexion();
  if (conn === null) { codigoSalida(1); return; }
  var k;
  for (k = 0; k < sentencias.length; k++) {
    try {
      await conn(sentencias[k]);
      log('OK: ' + resumen(sentencias[k]));
    } catch (e) {
      err('FAIL: ' + sentencias[k]);
      err('      SQLSTATE ' + sqlstate(e) + ' -> ' + mensaje(e));
      SUM.errores = [sanearNotas('SQLSTATE ' + sqlstate(e) + '; ' + mensaje(e))];
      codigoSalida(1);
      return;
    }
  }
  log('=== FIN SQL: ' + base + ' (todas OK) ===');
  codigoSalida(0);
}

// ---------------------------------------------------------------------------
// Informe
// ---------------------------------------------------------------------------

function imprimirInforme() {
  if (!SUM) return;
  SUM.ok = (CODIGO === 0);
  SUM.exit_code = CODIGO;
  if (FLAGS.json) {
    console.log(JSON.stringify(SUM, null, 2));
  }
}

// ---------------------------------------------------------------------------
// Arranque
// ---------------------------------------------------------------------------

function nuevoResumen() {
  return {
    ok: null,
    modo: null,
    exit_code: 0,
    archivo: null,
    es_migracion: false,
    numero: null,
    sentencias: 0,
    ledger_disponible: null,
    checksum_disco: null,
    fila_previa: null,
    predecesores: null,
    derivas: null,
    escritura: 'ninguna',
    resultado_registrado: null,
    duracion_ms: null,
    advertencias: null,
    errores: null
  };
}

function arrancar() {
  SUM = nuevoResumen();
  return main().catch(function (e) {
    err('FAIL - SQLSTATE ' + sqlstate(e) + ' -> ' + mensaje(e));
    if (SUM) { SUM.errores = [sanearNotas(mensaje(e))]; }
    codigoSalida(1);
  }).then(imprimirInforme);
}

// SALIDA LIMPIA. No se fuerza process.exit() en el camino normal: con el pool
// HTTP vivo, un exit() forzado compite con el cierre de sockets de undici y en
// Windows eso dispara "Assertion failed: handle->flags & UV_HANDLE_CLOSING"
// (medido el 2026-10-05 en db/cleanups/005). El tope de 5 s es la red de
// seguridad para que el proceso no se quede vivo, no la via normal.
//
// La red se arma DESPUES de terminar, no al arrancar. Armarla al principio
// mataba a mitad de camino cualquier migracion que tardase mas de 5 s, con
// process.exit(CODIGO=0) y sin fila en el ledger: medido con la 053 (24
// sentencias), que quedo a medias. Aqui solo sirve para forzar el cierre si un
// socket HTTP de undici mantiene vivo el bucle despues del informe.
arrancar().then(function () {
  var tope = setTimeout(function () { process.exit(CODIGO); }, 5000);
  tope.unref();
}, function () {});

process.on('exit', function () { process.exitCode = CODIGO; });