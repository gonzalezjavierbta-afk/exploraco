// scripts/verificar-borrado-gobernado.js
// Guard de BORRADO GOBERNADO (ADR-003, Enmienda 1).
//
// El borrado fisico del proyecto tiene que seguir siendo una lista CERRADA y
// auditada. Este script la comprueba en los frentes donde puede ocurrir:
//
//   C1 api/*.js     Cero reemplazo destructivo de tags (SET tags = $n). La via
//                   valida es el merge JSONB, COALESCE(tags, ...): se reporta
//                   su conteo pero NO se hardcodea, para que el guard no
//                   caduque cuando el merge crezca.
//   C2 db/**/*.sql  Todo DELETE FROM ejecutable es (a) una de las excepciones
//                   nominadas, o (b) lleva un marcador
//                   -- BORRADO GOBERNADO: <motivo> en el mismo bloque.
//                   El marcador solo vale donde apply_sql_file gobierna de
//                   verdad: db/migrations/NNN_*.sql o db/cleanups/NNN_*.sql.
//                   Un .sql fuera de ahi (queries/, documental/, suelto) FALLA
//                   aunque lleve marcador: se ejecutaria sin ledger.
//                   Los DELETE comentados (rollbacks) no cuentan: se ignoran
//                   comentarios de linea y de bloque antes de buscar.
//   C3 api/*.js     Todo DELETE FROM runtime pertenece a la lista cerrada y
//                   lleva WHERE usable. La lista se ancla por ARCHIVO + HUELLA
//                   TEXTUAL (fragmento SQL), nunca por numero de linea: asi
//                   insertar codigo mas arriba no rompe el guard.
//   C4 DOM          Los IDs protegidos siguen existiendo. ADR-003: nunca se
//                   elimina un ID del DOM aunque el modulo este oculto.
//
// Uso:
//   node scripts/verificar-borrado-gobernado.js
//   node scripts/verificar-borrado-gobernado.js --json
//   node scripts/verificar-borrado-gobernado.js --help
//
// Exit codes: 0 todo PASS | 1 algun FAIL.
//
// ASCII-safe (ADR-002): cero bytes > 127, cero backticks. CommonJS estricto.
// Sin red y sin base de datos: se puede correr en cualquier CI.
'use strict';

var fs = require('fs');
var path = require('path');

var RAIZ = path.join(__dirname, '..');
var DIR_API = path.join(RAIZ, 'api');
var DIR_DB = path.join(RAIZ, 'db');

var RE_DELETE = /\bDELETE\s+FROM\b/gi;
var RE_SET_TAGS = /\bSET\s+tags\s*=\s*\$/gi;
var RE_COALESCE_TAGS = /COALESCE\s*\(\s*tags/gi;
var RE_MARCA = /--\s*BORRADO\s+GOBERNADO\s*:\s*\S/i;
var RE_WHERE_TRIVIAL = /\bWHERE\s+(1\s*=\s*1|true)\s*(?:;|$|AND\b)/i;

// ---------------------------------------------------------------------------
// Lista cerrada de DELETE runtime en api/*.js (C3)
// ---------------------------------------------------------------------------
// Cada entrada es archivo + huella textual unica. La huella se compara contra
// el SQL normalizado (espacios colapsados), asi que un cambio de maquetacion
// dentro del literal no la rompe. Un DELETE nuevo que no este aqui FALLA: la
// unica via es una enmienda de ADR-003 y anadir su huella.
var LISTA_CERRADA = [
  {
    archivo: 'api/admin-destinos.js',
    huella: 'DELETE FROM destinos_fotos WHERE destino_id = $1 AND id IN',
    contexto: 'borrado de fotos concretas de un destino (ids seleccionados)'
  },
  {
    archivo: 'api/admin-destinos.js',
    huella: 'DELETE FROM destinos_fotos WHERE destino_id = $1',
    contexto: 'cascada manual al borrar un destino'
  },
  {
    archivo: 'api/admin-destinos.js',
    huella: 'DELETE FROM destinos_detalles WHERE destino_id = $1',
    contexto: 'cascada manual al borrar un destino'
  },
  {
    archivo: 'api/admin-destinos.js',
    huella: 'DELETE FROM interacciones WHERE destino_id = $1',
    contexto: 'cascada manual al borrar un destino'
  },
  {
    archivo: 'api/admin-destinos.js',
    huella: 'DELETE FROM destinos WHERE id = $1 RETURNING',
    contexto: 'borrado del destino por el panel admin'
  },
  {
    archivo: 'api/admin.js',
    huella: 'DELETE FROM interacciones WHERE id=$1',
    contexto: 'moderacion: retirada de una interaccion concreta'
  },
  {
    archivo: 'api/interacciones.js',
    huella: 'DELETE FROM mapas WHERE id = $1 AND usuario_id = $2',
    contexto: 'baja de un mapa propio'
  },
  {
    archivo: 'api/interacciones.js',
    huella: 'DELETE FROM mapa_destinos WHERE mapa_id = $1 AND destino_id = $2',
    contexto: 'quitar un destino de un mapa propio'
  },
  {
    archivo: 'api/interacciones.js',
    huella: 'DELETE FROM planes_miembros WHERE plan_id=$1 AND usuario_id=$2',
    contexto: 'salir de un plan de viaje'
  },
  {
    archivo: 'api/interacciones.js',
    huella: 'DELETE FROM usuario_bloqueos WHERE bloqueador_id=$1 AND bloqueado_id=$2',
    contexto: 'desbloquear usuario (fin del bloqueo)'
  },
  {
    archivo: 'api/interacciones.js',
    huella: 'DELETE FROM usuarios_cromos WHERE usuario_id=$1 AND cromo_id=$2',
    contexto: 'consumo de un cromo del inventario'
  },
  {
    archivo: 'api/utilidades.js',
    huella: 'DELETE FROM destinos_fotos WHERE destino_id=$1',
    contexto: 'reemplazo de la galeria de un destino'
  },
  {
    archivo: 'api/utilidades.js',
    huella: 'DELETE FROM destinos_fotos WHERE id=$1',
    contexto: 'retirada de una foto por id'
  }
];

// ---------------------------------------------------------------------------
// Excepciones nominadas de DELETE ejecutable en db/**/*.sql (C2)
// ---------------------------------------------------------------------------
// Se anclan por archivo + linea de INICIO de la sentencia. Si el numero deja
// de existir, el guard FALLA en vez de callarse: una excepcion que ya no
// apunta a nada es una excepcion que hay que renegociar.
var EXCEPCIONES_DB = [
  {
    archivo: 'db/migrations/012_interacciones_dedup_resena_rating.sql',
    lineas: [66],
    motivo: 'dedup de resenas/ratings: conserva rn=1 (la mas reciente)'
  },
  {
    archivo: 'db/migrations/014_reset_visitas_presencia_fisica.sql',
    lineas: [223],
    motivo: 'reset de visitas gamificadas, respaldadas en el paso 2'
  },
  {
    archivo: 'db/migrations/015_epic_prompt.sql',
    lineas: [77],
    motivo: 'retirada de salas de sistema (creador_id IS NULL)'
  },
  {
    archivo: 'db/cleanups/001_limpieza_datos_prueba.sql',
    lineas: [16, 17, 18, 19, 22, 23],
    motivo: 'limpieza one-shot de datos de prueba, versionada y fechada'
  }
];

// ---------------------------------------------------------------------------
// Alcance del marcador: solo ficheros que apply_sql_file gobierna
// ---------------------------------------------------------------------------
// Un marcador solo vale donde hay alguien que lo lea. apply_sql_file.js solo
// gobierna db/migrations/ (ledger + predecesor); el resto de db/ corre sin
// registro. Por eso el marcador se acepta UNICAMENTE en un .sql con nombre
// numerado de 3 digitos dentro de db/migrations/ o db/cleanups/. Cualquier
// otro .sql bajo db/ con DELETE ejecutable FALLA: no hay via de gobierno,
// hay que moverlo a cleanups/ o convertirlo en migracion.
var RE_RUTA_GOBERNADA = /^db\/(migrations|cleanups)\/[0-9]{3}_[a-z0-9_]+\.sql$/;

function rutaGobernada(archivoRel) {
  return RE_RUTA_GOBERNADA.test(String(archivoRel));
}

// ---------------------------------------------------------------------------
// IDs protegidos del DOM (C4)
// ---------------------------------------------------------------------------
// Criterio D5: un ID con referencias vivas no se retira; uno con 0 refs puede
// caer. Los siete de abajo se verificaron uno por uno en el fichero que dice
// el inventario antes de entrar aqui (mf-panel-* viven en los dos HTML).
var IDS_PROTEGIDOS = [
  { id: 'catalogo-panel', archivos: ['mi-perfil.html', 'comunidad.html'] },
  { id: 'pub-wa-direct', archivos: ['index.html'] },
  { id: 'btn-crear-album', archivos: ['mi-perfil.html'] },
  { id: 'feed-cargar-mas', archivos: ['comunidad.html'] },
  { id: 'mf-panel-dir', archivos: ['index.html', 'comunidad.html'] },
  { id: 'mf-panel-med', archivos: ['index.html', 'comunidad.html'] },
  { id: 'mf-panel-punt', archivos: ['index.html', 'comunidad.html'] },
  { id: 'trofeos-bloqueados-wrap', archivos: ['mi-perfil.html'] }
];

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------

function norm(s) {
  return String(s).replace(/\s+/g, ' ').trim();
}

function rel(p) {
  return path.relative(RAIZ, p).split(path.sep).join('/');
}

function lineaEn(texto, idx) {
  return texto.slice(0, idx).split('\n').length;
}

function leer(p) {
  return fs.readFileSync(p, 'utf8');
}

// Quita comentarios de SQL dejando los saltos de linea y la longitud intactos
// para los offsets (los comentarios se sustituyen por espacios). Respeta
// literales de comilla simple, incluido el escape por duplicacion.
// NO interpreta dollar-quote: no se usa en los DELETE del proyecto.
function quitarComentariosSQL(raw) {
  var s = String(raw);
  var n = s.length;
  var out = [];
  var i = 0;
  var enComilla = false;
  var enBloque = false;

  while (i < n) {
    var c = s.charAt(i);
    var d = i + 1 < n ? s.charAt(i + 1) : '';

    if (enBloque) {
      if (c === '*' && d === '/') { out.push(' '); out.push(' '); i += 2; enBloque = false; continue; }
      out.push(c === '\n' || c === '\r' ? c : ' ');
      i++;
      continue;
    }

    if (enComilla) {
      if (c === "'") {
        if (d === "'") { out.push("''"); i += 2; continue; }
        enComilla = false;
      }
      out.push(c);
      i++;
      continue;
    }

    if (c === "'") { enComilla = true; out.push(c); i++; continue; }

    if (c === '-' && d === '-') {
      while (i < n && s.charAt(i) !== '\n') { out.push(' '); i++; }
      continue;
    }

    if (c === '/' && d === '*') {
      out.push(' ');
      out.push(' ');
      i += 2;
      enBloque = true;
      continue;
    }

    out.push(c);
    i++;
  }

  return out.join('');
}

// Sentencias DELETE FROM de un texto ya sin comentarios. Corta en el ';' (o en
// un tope defensivo) y devuelve linea de inicio, linea de fin y el texto.
function sentenciasDelete(codigo) {
  var out = [];
  var re = new RegExp(RE_DELETE.source, 'gi');
  var m;
  while ((m = re.exec(codigo)) !== null) {
    var desde = m.index;
    var fin = codigo.indexOf(';', desde);
    if (fin === -1 || fin - desde > 2000) { fin = Math.min(codigo.length, desde + 2000); }
    var texto = codigo.slice(desde, fin + 1);
    var linea = lineaEn(codigo, desde);
    out.push({
      linea: linea,
      lineaFin: linea + (texto.match(/\n/g) || []).length,
      texto: norm(texto),
      crudo: texto
    });
  }
  return out;
}

// Marcador -- BORRADO GOBERNADO: <motivo> en el bloque de la sentencia.
// El bloque es el propio DELETE mas las lineas de comentario inmediatamente
// anteriores y las dos siguientes.
function tieneMarcaEnBloque(raw, linea, lineaFin) {
  var lineas = String(raw).split(/\r?\n/);
  var desde = Math.max(1, linea - 8);
  var hasta = Math.min(lineas.length, (lineaFin || linea) + 2);
  var i;
  for (i = desde; i <= hasta; i++) {
    if (RE_MARCA.test(lineas[i - 1])) return true;
  }
  return false;
}

function esExcepcionDb(archivoRel, linea) {
  var i;
  var j;
  for (i = 0; i < EXCEPCIONES_DB.length; i++) {
    var e = EXCEPCIONES_DB[i];
    if (e.archivo !== archivoRel) continue;
    for (j = 0; j < e.lineas.length; j++) {
      if (e.lineas[j] === linea) return e;
    }
  }
  return null;
}

// Literal SQL de un api/*.js: desde el inicio del DELETE hasta la comilla de
// cierre no escapada, o hasta un tope defensivo. No cruza el final del fichero
// en silencio: si algo no cuadra, el WHERE faltara y el check FALLA.
function literalSqlDesde(texto, desde) {
  var n = texto.length;
  var i = desde;
  var out = '';
  while (i < n && out.length < 1200) {
    var c = texto.charAt(i);
    if (c === "'") {
      if (texto.charAt(i + 1) === "'") { out += "''"; i += 2; continue; }
      break;
    }
    // 96 = comilla invertida: se corta igual, sin escribir el caracter.
    if (c.charCodeAt(0) === 96) break;
    out += c;
    i++;
  }
  return out;
}

function archivosJs(dir) {
  return fs.readdirSync(dir).filter(function (f) {
    return /\.js$/i.test(f);
  }).sort();
}

function archivosSql(dir) {
  var out = [];
  (function walk(d) {
    var entradas;
    try { entradas = fs.readdirSync(d, { withFileTypes: true }); } catch (e) { return; }
    entradas.forEach(function (ent) {
      var p = path.join(d, ent.name);
      if (ent.isDirectory()) { walk(p); return; }
      if (/\.sql$/i.test(ent.name)) out.push(p);
    });
  })(dir);
  return out.sort();
}

function pad(s, n) {
  var t = String(s);
  while (t.length < n) t += ' ';
  return t;
}

// ---------------------------------------------------------------------------
// Checks
// ---------------------------------------------------------------------------

function checkTags(apiDir) {
  var detalle = [];
  var offenders = 0;
  var merges = 0;
  var archivos = archivosJs(apiDir);

  archivos.forEach(function (f) {
    var texto;
    try { texto = leer(path.join(apiDir, f)); } catch (e) {
      detalle.push(f + ': no se pudo leer (' + e.message + ')');
      return;
    }
    var re = new RegExp(RE_SET_TAGS.source, 'gi');
    var m;
    while ((m = re.exec(texto)) !== null) {
      offenders++;
      detalle.push('api/' + f + ':' + lineaEn(texto, m.index) +
        ' reemplazo destructivo de tags: ' + norm(m[0]));
    }
    var re2 = new RegExp(RE_COALESCE_TAGS.source, 'gi');
    var m2;
    while ((m2 = re2.exec(texto)) !== null) { merges++; }
  });

  return {
    id: 'C1',
    titulo: 'tags sin reemplazo destructivo (api/*.js)',
    ok: offenders === 0 && archivos.length > 0,
    resumen: offenders + ' SET tags = $n | ' + merges + ' merge COALESCE(tags) | ' +
      archivos.length + ' archivos leidos',
    detalle: archivos.length === 0 ? ['no hay archivos .js en api/'] : detalle
  };
}

function checkDb(dbDir) {
  var detalle = [];
  var violaciones = [];
  var excepcionesUsadas = {};
  var marcados = 0;
  var fueraAlcance = 0;
  var archivos = archivosSql(dbDir);

  archivos.forEach(function (p) {
    var relPath = rel(p);
    var gobernada = rutaGobernada(relPath);
    var raw = leer(p);
    var codigo = quitarComentariosSQL(raw);
    var sents = sentenciasDelete(codigo);

    sents.forEach(function (s) {
      var ex = esExcepcionDb(relPath, s.linea);
      if (ex !== null) {
        excepcionesUsadas[relPath + ':' + s.linea] = true;
        detalle.push(relPath + ':' + s.linea + ' EXCEPCION ' + ex.motivo);
        return;
      }
      if (!gobernada) {
        fueraAlcance++;
        violaciones.push(relPath + ':' + s.linea +
          ' DELETE en un .sql que NO gobierna apply_sql_file (se ejecutaria sin ledger): ' +
          'solo db/migrations/NNN_*.sql o db/cleanups/NNN_*.sql admiten marcador; ' +
          'el marcador aqui NO vale. Muevelo a cleanups/ o hazlo migracion. Sentencia: ' +
          s.texto.slice(0, 100));
        return;
      }
      if (tieneMarcaEnBloque(raw, s.linea, s.lineaFin)) {
        marcados++;
        detalle.push(relPath + ':' + s.linea + ' MARCADO');
        return;
      }
      violaciones.push(relPath + ':' + s.linea + ' DELETE sin marcador ni excepcion: ' +
        s.texto.slice(0, 120));
    });
  });

  // Excepcion que ya no apunta a ninguna sentencia: el guard no se calla.
  EXCEPCIONES_DB.forEach(function (e) {
    e.lineas.forEach(function (l) {
      if (!excepcionesUsadas[e.archivo + ':' + l]) {
        violaciones.push('excepcion sin sentencia: ' + e.archivo + ':' + l +
          ' (linea movida o DELETE retirado; renegociar la lista)');
      }
    });
  });

  violaciones.forEach(function (v) { detalle.push('FAIL ' + v); });
  return {
    id: 'C2',
    titulo: 'db/**/*.sql: solo excepciones o marcador BORRADO GOBERNADO',
    ok: violaciones.length === 0,
    resumen: Object.keys(excepcionesUsadas).length + ' excepciones | ' +
      marcados + ' marcados | ' + fueraAlcance + ' fuera de alcance | ' +
      violaciones.length + ' violaciones | ' + archivos.length + ' archivos .sql',
    detalle: detalle
  };
}

function checkRuntime(apiDir) {
  var detalle = [];
  var violaciones = [];
  var total = 0;
  var conformes = 0;
  var archivos = archivosJs(apiDir);

  archivos.forEach(function (f) {
    var relPath = 'api/' + f;
    var texto = leer(path.join(apiDir, f));
    var pendientes = LISTA_CERRADA.filter(function (e) {
      return e.archivo === relPath;
    }).map(function (e) {
      return { huella: norm(e.huella), contexto: e.contexto, usado: false };
    });

    var re = new RegExp(RE_DELETE.source, 'gi');
    var m;
    while ((m = re.exec(texto)) !== null) {
      total++;
      var linea = lineaEn(texto, m.index);
      var sql = norm(literalSqlDesde(texto, m.index));

      // Asignacion de huella: la mas larga primero, para que una huella que es
      // prefijo de otra no robe la sentencia de la otra.
      var elegido = null;
      pendientes.forEach(function (p) {
        if (p.usado) return;
        if (sql.indexOf(p.huella) === -1) return;
        if (elegido === null || p.huella.length > elegido.huella.length) elegido = p;
      });

      if (elegido === null) {
        violaciones.push(relPath + ':' + linea +
          ' DELETE fuera de la lista cerrada: requiere enmienda ADR-003 -> ' +
          sql.slice(0, 140));
      } else {
        elegido.usado = true;
        if (!/\bWHERE\b/i.test(sql)) {
          violaciones.push(relPath + ':' + linea + ' DELETE sin WHERE (' +
            elegido.contexto + '): ' + sql.slice(0, 140));
        } else if (RE_WHERE_TRIVIAL.test(sql)) {
          violaciones.push(relPath + ':' + linea +
            ' WHERE trivial (1=1 / true) no acota el borrado: ' + sql.slice(0, 140));
        } else {
          conformes++;
          detalle.push(relPath + ':' + linea + ' OK ' + elegido.contexto);
        }
      }
    }

    pendientes.forEach(function (p) {
      if (p.usado) return;
      violaciones.push(relPath + ' DELETE de la lista cerrada que ya no existe o cambio: ' +
        p.huella + ' (actualizar la lista con enmienda ADR-003 si el cambio es legitimo)');
    });
  });

  violaciones.forEach(function (v) { detalle.push('FAIL ' + v); });
  return {
    id: 'C3',
    titulo: 'api/*.js: DELETE runtime en lista cerrada y con WHERE',
    ok: violaciones.length === 0 && total > 0,
    resumen: conformes + '/' + total + ' sentencias OK | ' + LISTA_CERRADA.length +
      ' huellas nominadas | ' + violaciones.length + ' violaciones',
    detalle: detalle
  };
}

function checkDom(raiz) {
  var detalle = [];
  var faltan = [];
  var total = 0;

  IDS_PROTEGIDOS.forEach(function (g) {
    g.archivos.forEach(function (a) {
      var p = path.join(raiz, a);
      total++;
      var texto;
      try {
        texto = leer(p);
      } catch (e) {
        faltan.push(a + ': no existe el archivo para el id #' + g.id);
        return;
      }
      var re = new RegExp('id\\s*=\\s*["\']' + g.id + '["\']', 'i');
      if (!re.test(texto)) {
        faltan.push(a + ': falta id="' + g.id + '" (ADR-003: el ID no se elimina)');
        return;
      }
      detalle.push(a + ' contiene #' + g.id);
    });
  });

  faltan.forEach(function (f) { detalle.push('FAIL ' + f); });
  return {
    id: 'C4',
    titulo: 'DOM: los IDs protegidos siguen existiendo',
    ok: faltan.length === 0 && total > 0,
    resumen: (total - faltan.length) + '/' + total + ' IDs protegidos presentes | ' +
      IDS_PROTEGIDOS.length + ' ids en la lista',
    detalle: detalle
  };
}

// ---------------------------------------------------------------------------
// Salida
// ---------------------------------------------------------------------------

function imprimir(res, comoJson) {
  if (comoJson) {
    console.log(JSON.stringify({
      ok: res.ok,
      exit_code: res.exit_code,
      checks: res.checks.map(function (c) {
        return {
          id: c.id,
          titulo: c.titulo,
          estado: c.ok ? 'PASS' : 'FAIL',
          resumen: c.resumen
        };
      }),
      fallos: res.fallos
    }, null, 2));
    return;
  }

  console.log('=== GUARD BORRADO GOBERNADO (ADR-003 Enmienda 1) ===');
  res.checks.forEach(function (c) {
    console.log(c.id + ' ' + pad(c.titulo, 58) + ' ' + (c.ok ? 'PASS' : 'FAIL'));
    console.log('     ' + c.resumen);
    c.detalle.forEach(function (d) { console.log('     - ' + d); });
  });
  var okN = res.checks.filter(function (c) { return c.ok; }).length;
  console.log('');
  console.log('RESULTADO: ' + (res.ok ? 'PASS' : 'FAIL') + ' (' + okN + '/' +
    res.checks.length + ' checks)');
}

function uso() {
  var t = [];
  t.push('Uso: node scripts/verificar-borrado-gobernado.js [--json]');
  t.push('');
  t.push('Comprueba el Borrado Gobernado de ADR-003 (Enmienda 1):');
  t.push('  C1 tags JSONB sin reemplazo destructivo en api/*.js');
  t.push('  C2 DELETE FROM en db/**/*.sql con excepcion nominada o marcador');
  t.push('     -- BORRADO GOBERNADO: <motivo>');
  t.push('  C3 DELETE runtime de api/*.js en lista cerrada y con WHERE');
  t.push('  C4 IDs protegidos del DOM presentes');
  t.push('');
  t.push('Exit codes: 0 PASS | 1 FAIL');
  console.log(t.join('\n'));
}

function main(argv) {
  var comoJson = argv.indexOf('--json') !== -1;
  if (argv.indexOf('-h') !== -1 || argv.indexOf('--help') !== -1) { uso(); return 0; }

  if (!fs.existsSync(DIR_API) || !fs.existsSync(DIR_DB)) {
    var msg = 'no existe api/ o db/ desde ' + RAIZ;
    if (comoJson) { console.log(JSON.stringify({ ok: false, exit_code: 1, checks: [], fallos: [msg] }, null, 2)); }
    else { console.error('FAIL - ' + msg); }
    return 1;
  }

  var checks = [checkTags(DIR_API), checkDb(DIR_DB), checkRuntime(DIR_API), checkDom(RAIZ)];
  var fallos = [];
  checks.forEach(function (c) {
    if (c.ok) return;
    c.detalle.forEach(function (d) {
      if (String(d).indexOf('FAIL') === 0) fallos.push(c.id + ' ' + d.slice(5));
    });
  });

  var res = {
    ok: checks.every(function (c) { return c.ok; }),
    exit_code: 0,
    checks: checks,
    fallos: fallos
  };
  res.exit_code = res.ok ? 0 : 1;
  imprimir(res, comoJson);
  return res.exit_code;
}

module.exports = {
  LISTA_CERRADA: LISTA_CERRADA,
  EXCEPCIONES_DB: EXCEPCIONES_DB,
  IDS_PROTEGIDOS: IDS_PROTEGIDOS,
  RE_MARCA_BORRADO: RE_MARCA,
  RE_RUTA_GOBERNADA: RE_RUTA_GOBERNADA,
  rutaGobernada: rutaGobernada,
  quitarComentariosSQL: quitarComentariosSQL,
  sentenciasDelete: sentenciasDelete,
  tieneMarcaEnBloque: tieneMarcaEnBloque,
  esExcepcionDb: esExcepcionDb
};

if (require.main === module) {
  process.exitCode = main(process.argv.slice(2));
}
