// scripts/smoke_anti_deriva_consumibles.js
// SMOKE ANTI-DERIVA DEL COPY DE CONSUMIBLES (red permanente, offline, cero red).
//
// PROBLEMA QUE VIGILA
//   El catalogo se describia con "+N% en TODAS las acciones" y era falso: el
//   bono solo paga una allowlist de acciones de jugador (BONO_APLICA,
//   api/interacciones.js:5876) y excluye misiones, logros, referidos,
//   expediciones y mercado (BONO_EXCLUIDAS, api/interacciones.js:5890). La 064
//   escribio ese texto y la 084 (BLOQUE 2) lo corrigio. Este smoke impide que la
//   deriva vuelva, y sirve tambien para el resto del catalogo (085).
//
// FUENTE DE DATOS: (a) el stack db/migrations/*.sql, en orden numerico.
//   POR QUE (y no mercado.js, ni Neon, ni un fixture):
//     1. Corre en npm test sin red y sin DATABASE_URL. Un smoke que necesita
//        Neon no protege nada: el que rompe el copy no lo corre.
//     2. Es la MISMA fuente que escribe la DB. Un fixture con las frases
//        copiadas se desincroniza en silencio y el smoke se vuelve un espejo
//        del fixture, no del producto.
//     3. mercado.js NO es fuente: solo pinta c.descripcion (mercado.js:870,
//        908, 1144, 1192), el texto vive en la tabla.
//     4. Las migraciones son un registro APPEND-ONLY de escrituras: el estado
//        efectivo de una fila es el resultado de aplicarlas en orden. Por eso
//        el smoke las APLICA por capas (la ultima escritura de descripcion
//        por clave gana) en vez de leer la 084 aislada. Asi la 084 se MIDE, no
//        se cree: si manana una 086 devuelve el texto falso, el smoke lo ve.
//     5. La 085 entra sola (glob + orden numerico): no hay que tocar el fichero.
//   LIMITE DECLARADO: el parser reconoce las formas que el repo usa (INSERT con
//   lista de columnas, UPDATE ... FROM (VALUES ...) AS v(...), UPDATE ... SET
//   descripcion = CASE clave WHEN ... END, y UPDATE ... SET <literal> WHERE
//   clave =/IN). Cualquier otra forma se reporta como SKIP contado, nunca como
//   crash (ADR-002, ADR-008: se degrada, no se rompe).
//
// QUE VERIFICA
//   A. Prohibido el texto que generaliza el alcance: "todas las acciones" o el
//      enfasis "TODAS" dentro de la descripcion de una carta con bono_pct > 0.
//   B. Los numeros citados se comparan con los de la PROPIA fila, nunca con una
//      copia hardcodeada de la frase: precio_xp, bono_pct, bono_tope_xp y los
//      tres derivados que la UI promete (equilibrio, techo, neto).
//        equilibrio = ceil(precio / (pct/100))
//        techo      = ceil(tope  / (pct/100))
//        neto       = tope - precio
//   C. Una carta con bono declara la ventana de 24 h y dice que el porcentaje
//      va sobre XP BASE.
//   D. Una carta con bono declara su punto de equilibrio.
//   E. (085) Una carta SIN bono puede no citar equilibrio, pero si tiene
//      cargas o duracion_horas en 0 / NULL no puede prometer un efecto que
//      dependa de ellos (uso/carga/veces, o una ventana de horas).
//   F. Auto-chequeo ADR-002: el propio smoke es ASCII-safe y sin backticks.
//
// CONTROL NEGATIVO (obligatorio: un assert que nunca falla no prueba nada)
//   NO se edita una migracion ya aplicada (ADR-087: checksum del ledger). Se
//   corre el smoke contra una COPIA mutable del directorio:
//     1. copiar db/migrations a un directorio temporal
//     2. meter "todas las acciones" en una descripcion de la 084 -> FAIL A
//     3. cambiar un equilibrio (640 -> 641)                       -> FAIL B
//     4. borrar el temporal y correr sin env                      -> verde
//   Variable de entorno (unica finalidad, la del control negativo):
//     SMOKE_CONSUMIBLES_MIG_DIR=<ruta a un db/migrations copiado>
//
// ASCII-safe (ADR-002), CommonJS (BUG-001), 0 backticks, sin dependencias.
// Run: node scripts/smoke_anti_deriva_consumibles.js
'use strict';

var fs = require('fs');
var path = require('path');

var ROOT = path.join(__dirname, '..');
var MIG_DIR = process.env.SMOKE_CONSUMIBLES_MIG_DIR
  ? path.resolve(String(process.env.SMOKE_CONSUMIBLES_MIG_DIR))
  : path.join(ROOT, 'db', 'migrations');
var SELF = 'scripts/smoke_anti_deriva_consumibles.js';

var total = 0;
var fails = 0;
var skips = 0;
var skipsCallados = 0;

function check(etiqueta, cond, detalle) {
  total++;
  if (cond) {
    console.log('PASS - ' + etiqueta);
  } else {
    fails++;
    console.log('FAIL - ' + etiqueta
      + (detalle === undefined ? '' : ' :: ' + JSON.stringify(detalle)));
  }
  return !!cond;
}
function skip(etiqueta, motivo) {
  skips++;
  console.log('SKIP - ' + etiqueta + ' :: ' + motivo);
}
// SKIP que se cuenta pero no imprime una linea por fila (ruido del bloque E:
// 43 cartas sin bono x 2 campos). El total se informa al cierre.
function skipQ() {
  skips++;
  skipsCallados++;
}

// ---------------------------------------------------------------------------
// 1. Lectura de migraciones en orden numerico
// ---------------------------------------------------------------------------
function listarMigraciones(dir) {
  var nombres = fs.readdirSync(dir);
  var salida = [];
  for (var i = 0; i < nombres.length; i++) {
    var m = /^(\d+)_[A-Za-z0-9_\-]*\.sql$/.exec(nombres[i]);
    if (m) salida.push({ nombre: nombres[i], num: parseInt(m[1], 10) });
  }
  salida.sort(function (a, b) {
    if (a.num !== b.num) return a.num - b.num;
    return a.nombre < b.nombre ? -1 : (a.nombre > b.nombre ? 1 : 0);
  });
  return salida;
}

// Quita comentarios de linea respetando literales entre comillas simples y
// CONSERVANDO la longitud del texto: los indices siguen apuntando al original,
// asi el numero de linea del hallazgo es el del fichero real (ADR-006).
function sinComentarios(src) {
  var out = '';
  var n = src.length;
  var i = 0;
  var enCadena = false;
  while (i < n) {
    var c = src.charAt(i);
    if (enCadena) {
      out += c;
      if (c === "'") {
        if (src.charAt(i + 1) === "'") { out += "'"; i += 2; continue; }
        enCadena = false;
      }
      i++;
      continue;
    }
    if (c === "'") { enCadena = true; out += c; i++; continue; }
    if (c === '-' && src.charAt(i + 1) === '-') {
      while (i < n && src.charAt(i) !== '\n') { out += ' '; i++; }
      continue;
    }
    out += c;
    i++;
  }
  return out;
}

function mapaLineas(src) {
  var saltos = [0];
  for (var i = 0; i < src.length; i++) {
    if (src.charAt(i) === '\n') saltos.push(i + 1);
  }
  return saltos;
}
function lineaDe(saltos, idx) {
  var lo = 0;
  var hi = saltos.length - 1;
  while (lo < hi) {
    var mid = Math.ceil((lo + hi) / 2);
    if (saltos[mid] <= idx) lo = mid; else hi = mid - 1;
  }
  return lo + 1;
}

// ---------------------------------------------------------------------------
// 2. Parser de VALUES: tuplas de literales
// ---------------------------------------------------------------------------
function interpretar(txt) {
  var s = String(txt).trim();
  if (!s) return { tipo: 'raw', texto: s };
  if (s.charAt(0) === "'") {
    var fin = s.lastIndexOf("'");
    var cuerpo = fin > 0 ? s.slice(1, fin) : s.slice(1);
    return { tipo: 'str', texto: cuerpo.split("''").join("'") };
  }
  if (/^-?\d+(\.\d+)?$/.test(s)) return { tipo: 'num', numero: Number(s), texto: s };
  if (/^null$/i.test(s)) return { tipo: 'nulo', texto: s };
  return { tipo: 'raw', texto: s };
}

function leerTuplas(t, desde) {
  var tuplas = [];
  var i = desde;
  var n = t.length;
  while (i < n) {
    while (i < n && /\s/.test(t.charAt(i))) i++;
    if (t.charAt(i) !== '(') break;
    i++;
    var vals = [];
    var actual = '';
    var prof = 1;
    while (i < n && prof > 0) {
      var c = t.charAt(i);
      if (c === "'") {
        actual += c;
        i++;
        while (i < n) {
          var d = t.charAt(i);
          if (d === "'") {
            if (t.charAt(i + 1) === "'") { actual += "''"; i += 2; continue; }
            actual += d;
            i++;
            break;
          }
          actual += d;
          i++;
        }
        continue;
      }
      if (c === '(') { prof++; actual += c; i++; continue; }
      if (c === ')') {
        prof--;
        if (prof === 0) { i++; break; }
        actual += c;
        i++;
        continue;
      }
      if (c === ',' && prof === 1) { vals.push(actual); actual = ''; i++; continue; }
      actual += c;
      i++;
    }
    vals.push(actual);
    tuplas.push(vals);
    var j = i;
    while (j < n && /\s/.test(t.charAt(j))) j++;
    if (t.charAt(j) === ',') { i = j + 1; continue; }
    i = j;
    break;
  }
  return { tuplas: tuplas, fin: i };
}

var CAMPOS = {
  clave: 1, descripcion: 1, precio_xp: 1, bono_pct: 1, bono_tope_xp: 1,
  cargas: 1, duracion_horas: 1
};

function asignar(fila, campo, valor, archivo, linea) {
  if (!CAMPOS[campo]) return;
  fila[campo] = { valor: valor, archivo: archivo, linea: linea };
}

function dividirAsignaciones(clausula) {
  // Split por comas de primer nivel: "col = expr" no anida comas fuera de
  // parentesis y CASE/END de este repo no las lleva.
  var partes = [];
  var actual = '';
  var prof = 0;
  for (var i = 0; i < clausula.length; i++) {
    var c = clausula.charAt(i);
    if (c === '(') prof++;
    if (c === ')') prof--;
    if (c === ',' && prof === 0) { partes.push(actual); actual = ''; continue; }
    actual += c;
  }
  partes.push(actual);
  return partes;
}

// ---------------------------------------------------------------------------
// 3. Construccion del estado efectivo del catalogo
// ---------------------------------------------------------------------------
function construirCatalogo(dir) {
  var filas = {};
  var defaults = {};
  var migraciones = listarMigraciones(dir);
  var reconocidas = 0;

  for (var f = 0; f < migraciones.length; f++) {
    var archivo = migraciones[f].nombre;
    var crudo = fs.readFileSync(path.join(dir, archivo), 'utf8');
    var texto = sinComentarios(crudo);
    var saltos = mapaLineas(crudo);
    var trabajos = [];

    // (0) Defaults de esquema de cargas / duracion_horas (057:135-136).
    var reDef = /ADD\s+COLUMN\s+(?:IF\s+NOT\s+EXISTS\s+)?(cargas|duracion_horas)\s+\w+\s+NOT\s+NULL\s+DEFAULT\s+(\d+)/gi;
    var mDef;
    while ((mDef = reDef.exec(texto)) !== null) {
      defaults[mDef[1].toLowerCase()] = { valor: Number(mDef[2]), archivo: archivo };
    }

    // (A) INSERT INTO consumibles (cols) VALUES (...)
    var reIns = /INSERT\s+INTO\s+(?:public\.)?consumibles\s*\(([^)]*)\)\s*VALUES/gi;
    var mIns;
    while ((mIns = reIns.exec(texto)) !== null) {
      var cols = mIns[1].split(',');
      for (var c0 = 0; c0 < cols.length; c0++) cols[c0] = cols[c0].trim().toLowerCase();
      var parsed = leerTuplas(texto, reIns.lastIndex);
      (function (cols2, tuplas, idxBase) {
        trabajos.push({
          idx: idxBase,
          aplicar: function () {
            var lin = lineaDe(saltos, idxBase);
            for (var t = 0; t < tuplas.length; t++) {
              var fila = {};
              for (var k = 0; k < cols2.length && k < tuplas[t].length; k++) {
                if (!CAMPOS[cols2[k]]) continue;
                var v = interpretar(tuplas[t][k]);
                if (v.tipo === 'str') asignar(fila, cols2[k], { tipo: 'str', texto: v.texto }, archivo, lin);
                else if (v.tipo === 'num') asignar(fila, cols2[k], { tipo: 'num', numero: v.numero }, archivo, lin);
                else if (v.tipo === 'nulo') asignar(fila, cols2[k], { tipo: 'nulo' }, archivo, lin);
              }
              if (!fila.clave || fila.clave.valor.tipo !== 'str') continue;
              var clave = fila.clave.valor.texto;
              if (!filas[clave]) filas[clave] = { clave: clave };
              for (var campo in fila) {
                if (campo === 'clave') continue;
                filas[clave][campo] = fila[campo];
              }
              reconocidas++;
            }
          }
        });
      })(cols, parsed.tuplas, mIns.index);
      reIns.lastIndex = parsed.fin;
    }

    // (B) UPDATE consumibles SET ... FROM (VALUES ...) AS v(cols)
    var reUpd = /UPDATE\s+(?:public\.)?consumibles(?:\s+AS\s+\w+)?\s+SET\s+([\s\S]*?)\s+FROM\s*\(\s*VALUES/gi;
    var mUpd;
    while ((mUpd = reUpd.exec(texto)) !== null) {
      var clausula = mUpd[1];
      var p2 = leerTuplas(texto, reUpd.lastIndex);
      var cola = texto.slice(p2.fin, p2.fin + 200);
      var mAlias = /^\s*\)\s*(?:AS\s+)?[A-Za-z_]*\s*\(([^)]*)\)/.exec(cola);
      var alias = mAlias ? mAlias[1].split(',') : [];
      for (var a0 = 0; a0 < alias.length; a0++) alias[a0] = alias[a0].trim().toLowerCase();
      var asigs = dividirAsignaciones(clausula);
      (function (asigs2, alias2, tuplas2, idxBase) {
        trabajos.push({
          idx: idxBase,
          aplicar: function () {
            var lin = lineaDe(saltos, idxBase);
            for (var t = 0; t < tuplas2.length; t++) {
              var porCol = {};
              for (var k = 0; k < alias2.length && k < tuplas2[t].length; k++) {
                porCol[alias2[k]] = interpretar(tuplas2[t][k]);
              }
              var fila = {};
              for (var s = 0; s < asigs2.length; s++) {
                var mAs = /^\s*([A-Za-z_]+)\s*=\s*([\s\S]+?)\s*$/.exec(asigs2[s]);
                if (!mAs) continue;
                var destino = mAs[1].toLowerCase();
                if (!CAMPOS[destino]) continue;
                var expr = mAs[2].trim();
                var mRef = /^[A-Za-z_]+\.([A-Za-z_]+)$/.exec(expr);
                if (mRef) {
                  var fuente = porCol[mRef[1].toLowerCase()];
                  if (!fuente) continue;
                  if (fuente.tipo === 'str') asignar(fila, destino, { tipo: 'str', texto: fuente.texto }, archivo, lin);
                  else if (fuente.tipo === 'num') asignar(fila, destino, { tipo: 'num', numero: fuente.numero }, archivo, lin);
                  else if (fuente.tipo === 'nulo') asignar(fila, destino, { tipo: 'nulo' }, archivo, lin);
                  continue;
                }
                if (/^CASE\b/i.test(expr)) continue; // condicional: no se adivina
                var lit = interpretar(expr);
                if (lit.tipo === 'str') asignar(fila, destino, { tipo: 'str', texto: lit.texto }, archivo, lin);
                else if (lit.tipo === 'num') asignar(fila, destino, { tipo: 'num', numero: lit.numero }, archivo, lin);
                else if (lit.tipo === 'nulo') asignar(fila, destino, { tipo: 'nulo' }, archivo, lin);
              }
              if (!fila.clave && porCol.clave && porCol.clave.tipo === 'str') {
                asignar(fila, 'clave', { tipo: 'str', texto: porCol.clave.texto }, archivo, lin);
              }
              if (!fila.clave || fila.clave.valor.tipo !== 'str') continue;
              var clave = fila.clave.valor.texto;
              if (!filas[clave]) filas[clave] = { clave: clave };
              for (var campo in fila) {
                if (campo === 'clave') continue;
                filas[clave][campo] = fila[campo];
              }
              reconocidas++;
            }
          }
        });
      })(asigs, alias, p2.tuplas, mUpd.index);
      reUpd.lastIndex = p2.fin;
    }

    // (C) UPDATE ... SET descripcion = CASE clave WHEN 'k' THEN '...' END
    var reCase = /SET\s+descripcion\s*=\s*CASE\s+clave\s+([\s\S]*?)\bEND\b/gi;
    var mCase;
    while ((mCase = reCase.exec(texto)) !== null) {
      var cuerpo = mCase[1];
      var pares = [];
      var rePar = /WHEN\s+'((?:[^']|'')*)'\s+THEN\s+'((?:[^']|'')*)'/g;
      var mPar;
      while ((mPar = rePar.exec(cuerpo)) !== null) {
        pares.push({
          clave: mPar[1].split("''").join("'"),
          texto: mPar[2].split("''").join("'")
        });
      }
      (function (pares2, idxBase) {
        trabajos.push({
          idx: idxBase,
          aplicar: function () {
            var lin = lineaDe(saltos, idxBase);
            for (var p = 0; p < pares2.length; p++) {
              if (!filas[pares2[p].clave]) filas[pares2[p].clave] = { clave: pares2[p].clave };
              filas[pares2[p].clave].descripcion = {
                valor: { tipo: 'str', texto: pares2[p].texto }, archivo: archivo, linea: lin
              };
              reconocidas++;
            }
          }
        });
      })(pares, mCase.index);
    }

    // (D) UPDATE ... SET <literal>[, ...] WHERE clave = 'k' | IN (...)
    var reLit = /UPDATE\s+(?:public\.)?consumibles(?:\s+AS\s+\w+)?\s+SET\s+([\s\S]*?)\bWHERE\s+([\s\S]*?);/gi;
    var mLit;
    while ((mLit = reLit.exec(texto)) !== null) {
      var cuerpo2 = mLit[1];
      if (/\bFROM\b/i.test(cuerpo2)) continue;       // lo cubre (B)
      var where = mLit[2];
      var claves = [];
      var mIn = /clave\s+IN\s*\(([^)]*)\)/i.exec(where);
      if (mIn) {
        var reQ = /'((?:[^']|'')*)'/g;
        var mQ;
        while ((mQ = reQ.exec(mIn[1])) !== null) claves.push(mQ[1].split("''").join("'"));
      } else {
        var mEq = /clave\s*=\s*'((?:[^']|'')*)'/i.exec(where);
        if (mEq) claves.push(mEq[1].split("''").join("'"));
      }
      if (!claves.length) continue;
      var asigs2 = dividirAsignaciones(cuerpo2);
      var aplicar = [];
      for (var s2 = 0; s2 < asigs2.length; s2++) {
        var mAs2 = /^\s*([A-Za-z_]+)\s*=\s*([\s\S]+?)\s*$/.exec(asigs2[s2]);
        if (!mAs2) continue;
        var destino2 = mAs2[1].toLowerCase();
        if (!CAMPOS[destino2] || destino2 === 'clave') continue;
        var expr2 = mAs2[2].trim();
        if (/^CASE\b/i.test(expr2)) continue;
        if (/\bv\.[A-Za-z_]/.test(expr2)) continue;
        var lit2 = interpretar(expr2);
        if (lit2.tipo === 'raw') continue;
        aplicar.push({ campo: destino2, valor: lit2 });
      }
      if (!aplicar.length) continue;
      (function (claves2, aplicar2, idxBase) {
        trabajos.push({
          idx: idxBase,
          aplicar: function () {
            var lin = lineaDe(saltos, idxBase);
            for (var c = 0; c < claves2.length; c++) {
              if (!filas[claves2[c]]) filas[claves2[c]] = { clave: claves2[c] };
              for (var q = 0; q < aplicar2.length; q++) {
                var v = aplicar2[q].valor;
                if (v.tipo === 'str') asignar(filas[claves2[c]], aplicar2[q].campo, { tipo: 'str', texto: v.texto }, archivo, lin);
                else if (v.tipo === 'num') asignar(filas[claves2[c]], aplicar2[q].campo, { tipo: 'num', numero: v.numero }, archivo, lin);
                else if (v.tipo === 'nulo') asignar(filas[claves2[c]], aplicar2[q].campo, { tipo: 'nulo' }, archivo, lin);
              }
              reconocidas++;
            }
          }
        });
      })(claves, aplicar, mLit.index);
    }

    trabajos.sort(function (a, b) { return a.idx - b.idx; });
    for (var t2 = 0; t2 < trabajos.length; t2++) trabajos[t2].aplicar();
  }

  return { filas: filas, defaults: defaults, n: migraciones.length, reconocidas: reconocidas };
}

// ---------------------------------------------------------------------------
// 4. Helpers de lectura de numeros y derivados
// ---------------------------------------------------------------------------
function numDe(campo) {
  if (!campo || !campo.valor) return null;
  if (campo.valor.tipo === 'num') return campo.valor.numero;
  if (campo.valor.tipo === 'str' && /^\d+(\.\d+)?$/.test(campo.valor.texto)) {
    return Number(campo.valor.texto);
  }
  if (campo.valor.tipo === 'nulo') return null;
  return null;
}
function textoDe(campo) {
  if (!campo || !campo.valor) return null;
  if (campo.valor.tipo === 'str') return campo.valor.texto;
  return null;
}
// "2.500" -> 2500 (el punto es separador de miles en el copy del catalogo)
function aNumero(txt) {
  return Number(String(txt).split('.').join(''));
}
function primero(desc, re) {
  var m = re.exec(desc);
  return m ? aNumero(m[1]) : null;
}
function ceilDiv(a, b) {
  // b es el porcentaje (10, 15, ...): ceil(a / (b/100)) sin coma flotante sucia
  return Math.ceil((a * 100) / b);
}

// ---------------------------------------------------------------------------
// 5. Bloque A/B/C/D: cartas con bono
// ---------------------------------------------------------------------------
var RE_PROHIBIDO = [
  { re: /todas\s+las\s+acciones/i, txt: 'todas las acciones' },
  { re: /\bTODAS\b/, txt: 'TODAS (enfasis que generaliza)' }
];

function revisarCartaConBono(clave, fila, desc) {
  var precio = numDe(fila.precio_xp);
  var pct = numDe(fila.bono_pct);
  var tope = numDe(fila.bono_tope_xp);

  // A. alcance real: nunca "todas las acciones"
  for (var p = 0; p < RE_PROHIBIDO.length; p++) {
    var hay = RE_PROHIBIDO[p].re.test(desc);
    check('A-' + clave + ': no dice "' + RE_PROHIBIDO[p].txt + '"',
      !hay,
      hay ? { clave: clave, archivo: fila.descripcion.archivo, linea: fila.descripcion.linea, patron: RE_PROHIBIDO[p].txt } : undefined);
  }

  // B. numeros contra la PROPIA fila
  var precioCitado = primero(desc, /precio[^:]{0,40}:\s*([\d.]+)\s*XP/i);
  if (precioCitado === null) precioCitado = primero(desc, /coste\s+([\d.]+)\s*XP/i);
  if (precio === null) {
    skip('B-' + clave + ': precio', 'la fila no declara precio_xp en el stack');
  } else if (precioCitado === null) {
    skip('B-' + clave + ': precio', 'la descripcion no cita precio');
  } else {
    check('B-' + clave + ': precio citado = precio_xp (' + precio + ')',
      precioCitado === precio,
      { citado: precioCitado, fila: precio, archivo: fila.precio_xp.archivo });
  }

  var pctCitado = primero(desc, /([+-]?\d{1,3})\s*%\s*de\s*XP/i);
  if (pct === null) {
    skip('B-' + clave + ': porcentaje', 'la fila no declara bono_pct en el stack');
  } else if (pctCitado === null) {
    skip('B-' + clave + ': porcentaje', 'la descripcion no cita porcentaje');
  } else {
    check('B-' + clave + ': porcentaje citado = bono_pct (' + pct + ')',
      pctCitado === pct,
      { citado: pctCitado, fila: pct, archivo: fila.bono_pct.archivo });
  }

  var topeCitado = primero(desc, /tope\s+de\s+([\d.]+)\s*XP\s+de\s+bono/i);
  if (topeCitado === null) topeCitado = primero(desc, /tope\s+de\s+([\d.]+)\s*XP/i);
  if (tope === null) {
    skip('B-' + clave + ': tope', 'la fila no declara bono_tope_xp en el stack');
  } else if (topeCitado === null) {
    skip('B-' + clave + ': tope', 'la descripcion no cita tope');
  } else {
    check('B-' + clave + ': tope citado = bono_tope_xp (' + tope + ')',
      topeCitado === tope,
      { citado: topeCitado, fila: tope, archivo: fila.bono_tope_xp.archivo });
  }

  // D. el punto de equilibrio se declara y cuadra con precio y porcentaje
  var equilibroCitado = primero(desc, /equilibrio[^\d]{0,40}([\d.]+)\s*XP/i);
  var equilibroEsperado = (precio !== null && pct) ? ceilDiv(precio, pct) : null;
  check('D-' + clave + ': declara el punto de equilibrio',
    /equilibrio/i.test(desc),
    /equilibrio/i.test(desc) ? undefined : { clave: clave, archivo: fila.descripcion.archivo });
  if (equilibroCitado === null) {
    skip('D-' + clave + ': valor del equilibrio', 'la descripcion no cita un numero de equilibrio');
  } else if (equilibroEsperado === null) {
    skip('D-' + clave + ': valor del equilibrio', 'sin precio/porcentaje no se puede derivar');
  } else {
    check('D-' + clave + ': equilibrio citado = ceil(precio/(pct/100)) (' + equilibroEsperado + ')',
      equilibroCitado === equilibroEsperado,
      { citado: equilibroCitado, esperado: equilibroEsperado, precio: precio, pct: pct,
        archivo: fila.descripcion.archivo, linea: fila.descripcion.linea });
  }

  // B (cont.) techo y neto, los otros dos numeros que la UI promete
  var techoCitado = primero(desc, /tope\s+se\s+toca\s+(?:a|en)\s+([\d.]+)\s*XP/i);
  if (techoCitado === null) techoCitado = primero(desc, /techo[^\d]{0,40}([\d.]+)\s*XP/i);
  var techoEsperado = (tope !== null && pct) ? ceilDiv(tope, pct) : null;
  if (techoCitado === null) {
    skip('B-' + clave + ': techo', 'la descripcion no cita el techo');
  } else if (techoEsperado === null) {
    skip('B-' + clave + ': techo', 'sin tope/porcentaje no se puede derivar');
  } else {
    check('B-' + clave + ': techo citado = ceil(tope/(pct/100)) (' + techoEsperado + ')',
      techoCitado === techoEsperado,
      { citado: techoCitado, esperado: techoEsperado, tope: tope, pct: pct });
  }

  var netoCitado = primero(desc, /neto\s+maximo\s+es\s+\+?([\d.]+)/i);
  var netoEsperado = (tope !== null && precio !== null) ? tope - precio : null;
  if (netoCitado === null) {
    skip('B-' + clave + ': neto', 'la descripcion no cita el neto');
  } else if (netoEsperado === null) {
    skip('B-' + clave + ': neto', 'sin precio/tope no se puede derivar');
  } else {
    check('B-' + clave + ': neto citado = tope - precio (' + netoEsperado + ')',
      netoCitado === netoEsperado,
      { citado: netoCitado, esperado: netoEsperado });
  }

  // C. ventana de 24 h y porcentaje sobre XP BASE
  check('C-' + clave + ': declara la ventana de 24 h',
    /\b24\s*h\b|\b24\s*horas\b/i.test(desc),
    /\b24\s*h\b|\b24\s*horas\b/i.test(desc) ? undefined : { clave: clave });
  check('C-' + clave + ': dice que el porcentaje va sobre XP BASE',
    /XP\s+base/i.test(desc) && /porcentaje/i.test(desc),
    /XP\s+base/i.test(desc) && /porcentaje/i.test(desc) ? undefined
      : { clave: clave, xpBase: /XP\s+base/i.test(desc), porcentaje: /porcentaje/i.test(desc) });
}

// ---------------------------------------------------------------------------
// 6. Bloque E (085): carta SIN bono con cargas/duracion desactivadas
// ---------------------------------------------------------------------------
var RE_PROMETE_USOS = /\b\d+\s+(usos|cargas|veces)\b/i;
var RE_PROMETE_VENTANA = /\b\d+\s*h\b|\b\d+\s*horas\b|durante\s+\d+/i;

function revisarCartaSinBono(clave, fila, desc, defaults) {
  var cargas = numDe(fila.cargas);
  if (cargas === null && !(fila.cargas && fila.cargas.valor.tipo === 'nulo')) {
    if (defaults.cargas !== undefined) cargas = defaults.cargas.valor;
  }
  var dur = numDe(fila.duracion_horas);
  if (dur === null && !(fila.duracion_horas && fila.duracion_horas.valor.tipo === 'nulo')) {
    if (defaults.duracion_horas !== undefined) dur = defaults.duracion_horas.valor;
  }

  var apagadaCargas = (fila.cargas && fila.cargas.valor.tipo === 'nulo') || cargas === 0;
  var apagadaDur = (fila.duracion_horas && fila.duracion_horas.valor.tipo === 'nulo') || dur === 0;

  if (!apagadaCargas) {
    skipQ();
  } else {
    check('E-' + clave + ': sin cargas no promete usos/cargas/veces',
      !RE_PROMETE_USOS.test(desc),
      RE_PROMETE_USOS.test(desc) ? { clave: clave, cargas: cargas } : undefined);
  }
  if (!apagadaDur) {
    skipQ();
  } else {
    check('E-' + clave + ': sin duracion no promete ventana de horas',
      !RE_PROMETE_VENTANA.test(desc),
      RE_PROMETE_VENTANA.test(desc) ? { clave: clave, duracion_horas: dur } : undefined);
  }
}

// ---------------------------------------------------------------------------
// 7. Ejecucion
// ---------------------------------------------------------------------------
function contarNoAscii(buf) {
  var n = 0;
  for (var i = 0; i < buf.length; i++) { if (buf[i] > 127) n++; }
  return n;
}

function main() {
  console.log('=== SMOKE ANTI-DERIVA CONSUMIBLES (offline, fuente: ' + MIG_DIR + ') ===');

  if (!fs.existsSync(MIG_DIR)) {
    check('0: el directorio de migraciones existe', false, MIG_DIR);
    return terminar();
  }
  var cat = construirCatalogo(MIG_DIR);
  check('0: hay migraciones que leer', cat.n > 0, { migraciones: cat.n });

  var claves = Object.keys(cat.filas);
  var conDesc = [];
  for (var i = 0; i < claves.length; i++) {
    var fila = cat.filas[claves[i]];
    var desc = textoDe(fila.descripcion);
    if (desc === null) { skip('fila ' + claves[i], 'sin descripcion en el stack'); continue; }
    fila._desc = desc;
    conDesc.push(fila);
  }
  // Anti-falso-verde: con el repo real el stack SIEMPRE produce descripciones.
  // Si sale 0, el parser (o el env) esta roto y no se puede pasar en silencio.
  check('0: el stack produce descripciones de catalogo', conDesc.length > 0,
    { claves: claves.length, conDescripcion: conDesc.length });

  var conBono = [];
  var sinBono = [];
  for (var b = 0; b < conDesc.length; b++) {
    var pct = numDe(conDesc[b].bono_pct);
    if (pct !== null && pct > 0) conBono.push(conDesc[b]);
    else sinBono.push(conDesc[b]);
  }

  console.log('-- cartas con bono_pct > 0: ' + conBono.length
    + ' | sin bono con descripcion: ' + sinBono.length);

  if (!conBono.length) {
    skip('bloque A-D', 'no hay ninguna carta con bono_pct > 0 en el stack');
  } else {
    for (var c = 0; c < conBono.length; c++) {
      revisarCartaConBono(conBono[c].clave, conBono[c], conBono[c]._desc);
    }
  }
  for (var s = 0; s < sinBono.length; s++) {
    revisarCartaSinBono(sinBono[s].clave, sinBono[s], sinBono[s]._desc, cat.defaults);
  }

  // F. auto-chequeo ADR-002
  var propio = fs.readFileSync(path.join(ROOT, SELF));
  check('F: smoke ASCII-safe (0 bytes > 127)', contarNoAscii(propio) === 0,
    { bytesAltos: contarNoAscii(propio) });
  check('F: smoke con 0 backticks',
    propio.toString('utf8').indexOf(String.fromCharCode(96)) === -1);

  return terminar();
}

function terminar() {
  if (skipsCallados) {
    console.log('-- ' + skipsCallados + ' comprobacion(es) E no aplicable(s) contada(s):'
      + ' cargas/duracion_horas fuera de 0/NULL');
  }
  console.log('Smoke anti-deriva consumibles: ' + (total - fails) + '/' + total
    + ' PASS, ' + fails + ' FAIL, ' + skips + ' SKIP');
  if (fails === 0) {
    console.log('SMOKE ANTI-DERIVA CONSUMIBLES: OK');
    process.exitCode = 0;
  } else {
    console.log('SMOKE ANTI-DERIVA CONSUMIBLES: ' + fails + ' FALLO(S) -- el copy deriva de la fila');
    process.exitCode = 1;
  }
}

try {
  main();
} catch (err) {
  console.log('FAIL - el smoke lanzo error: ' + (err && err.message));
  process.exitCode = 1;
}
