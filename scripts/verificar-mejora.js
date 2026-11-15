// scripts/verificar-mejora.js
// GATE de la familia 'mejora' del sistema de cartas (ADR-122, item 2 de la
// verificacion). Comprueba que las piezas del contrato siguen alineadas:
// la lista de subtipos comprables (JS), la allow-list de entrada del sumidero
// (api/interacciones.js), el mapa de origen (lib/cartas-config.js), el precio de
// acunacion (base x multiplicador), las dos migraciones (081 CHECKs, 082 seed) y
// que la rama mejora del CHECK de 081 coincide, EN ORDEN, con la lista JS (si
// divergen, el alta ofrece un subtipo que la base rechaza, o al contrario).
//
// QUE VIGILA: el riesgo real no es cosmetico. Si SUBTIPOS_CARTA.mejora y las
// claves de MEJORA_REF_ORIGEN con soporte derivan, el seed y el alta admin
// ofrecen un subtipo que el CHECK de 081 rechaza (o al contrario: se puede
// acunar un subtipo que no se vende). Si el precio_xp del seed deja de coincidir
// con precioAcunacion(), la misma carta cuesta distinto segun quien la cree.
// Y si 'destacar_evento' (soporte false, ADR-122 D10) entra en el CHECK o en la
// lista de subtipos, se vende una capacidad que no se puede verificar.
//
// QUE NO VIGILA: no abre DATABASE_URL, no hace red, no usa DOM y no ejecuta
// api/interacciones.js (lo lee como texto). No valida el comportamiento de la
// compra ni del sink: eso es smoke_gamificacion / smoke_mercado. La AUTORIDAD
// del precio sigue siendo el precio_xp de la fila en la base.
//
// NOTA DE PARSEO (importante para el siguiente lector):
// - SINK_CLAVES se DERIVA en api/interacciones.js (Object.keys(SINK_REF_ORIGEN),
//   ADR-122 D3), asi que el extractor sigue la cadena de bindings hasta el
//   export de lib/cartas-config.js. Si manana alguien escribe una lista literal,
//   el comparador ya la usa tal cual: el check no depende del mecanismo.
// - 'destacar_evento' SI aparece en 081, pero solo en comentarios y en el POST
//   que exige su AUSENCIA de los CHECK. Por eso el check 6 no hace un grep del
//   fichero (mediria lo contrario de lo que se quiere): extrae las definiciones
//   CHECK, que son el contrato ejecutable.
//
// FAIL-CLOSED: si un parseo no encuentra lo que debe (0 filas, 0 CHECKs, 0
// claves) el script sale con 2 en vez de imprimir "0 comprobaciones OK".
//
// ASCII-safe (ADR-002), CommonJS (BUG-001), 0 backticks, $0 (ADR-082).
// Run: node scripts/verificar-mejora.js

'use strict';

var fs = require('fs');
var path = require('path');

var ROOT = path.join(__dirname, '..');
var LIB = 'lib/cartas-config.js';
var INTER = 'api/interacciones.js';
var MIG081 = 'db/migrations/081_cartas_familia_mejora.sql';
var MIG082 = 'db/migrations/082_cartas_seed_mejora.sql';

var total = 0;
var pass = 0;
var fails = 0;

function ok(label) {
  total++;
  pass++;
  console.log('PASS - ' + label);
}

function ko(label, detalle) {
  total++;
  fails++;
  console.log('FAIL - ' + label + (detalle ? ' :: ' + detalle : ''));
}

// Exit 2 = no se pudo VERIFICAR el contrato (parseo roto). Distinto de exit 1
// (se verifico y el contrato esta mal): asi un parseo que se queda corto no se
// confunde nunca con un "todo bien" ni con un contenido desviado.
function aborta(label, detalle) {
  console.log('ABORTA - ' + label + (detalle ? ' :: ' + detalle : ''));
  console.log('');
  console.log('RESULTADO: FAIL (exit 2, fail-closed) - no se pudo verificar el contrato.');
  process.exit(2);
}

function leer(rel) {
  try {
    return fs.readFileSync(path.join(ROOT, rel), 'utf8');
  } catch (e) {
    aborta('fuente ilegible: ' + rel, e && e.code ? String(e.code) : 'error');
  }
  return '';
}

function iguales(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  for (var i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

// --- Parseo por TEXTO (nunca se ejecuta el fichero vigilado) ----------------

var Cartas;
try {
  Cartas = require(path.join(ROOT, LIB));
} catch (e) {
  aborta('require de ' + LIB, e && e.message ? e.message : 'error');
}

var tInter = leer(INTER);
var t081 = leer(MIG081);
var t082 = leer(MIG082);

// Cierra el bloque abierto en t[inicio] y devuelve el indice del cierre, o -1.
// Salta cadenas (con escape) para no confundir parentesis dentro de texto.
function cierreBalanceado(t, inicio) {
  var abre = t.charAt(inicio);
  var cierra = abre === '{' ? '}' : (abre === '[' ? ']' : ')');
  var depth = 0;
  var inStr = null;
  var k = inicio;
  while (k < t.length) {
    var c = t.charAt(k);
    if (inStr) {
      if (c === '\\') { k += 2; continue; }
      if (c === inStr) { inStr = null; }
      k++;
      continue;
    }
    if (c === '\'' || c === '"') { inStr = c; k++; continue; }
    if (c === abre) {
      depth++;
    } else if (c === cierra) {
      depth--;
      if (depth === 0) return k;
    }
    k++;
  }
  return -1;
}

// "var NOMBRE = <expr>;" -> { tipo, cuerpo }. tipo: 'array' | 'objeto' | 'expr'.
// El cuerpo de array/objeto va delimitado (incluye los corchetes/llaves); el de
// 'expr' acaba en el primer ';'. Los comentarios JS se saltan en el escaneo.
function expresionDeVar(texto, nombre) {
  var re = new RegExp('var\\s+' + nombre + '\\s*=\\s*');
  var m = re.exec(texto);
  if (!m) return null;
  var i = m.index + m[0].length;
  var abre = texto.charAt(i);
  if (abre !== '{' && abre !== '[') {
    var j = texto.indexOf(';', i);
    return { tipo: 'expr', cuerpo: texto.slice(i, j < 0 ? texto.length : j).trim() };
  }
  var k = i;
  var inStr = null;
  while (k < texto.length) {
    var c = texto.charAt(k);
    if (inStr) {
      if (c === '\\') { k += 2; continue; }
      if (c === inStr) { inStr = null; }
      k++;
      continue;
    }
    if (c === '\'' || c === '"') { inStr = c; k++; continue; }
    if (c === '/' && texto.charAt(k + 1) === '/') {
      var nl = texto.indexOf('\n', k);
      k = nl < 0 ? texto.length : nl;
      continue;
    }
    if (c === '/' && texto.charAt(k + 1) === '*') {
      var finC = texto.indexOf('*/', k + 2);
      k = finC < 0 ? texto.length : finC + 2;
      continue;
    }
    if (c === abre) {
      var cierre = cierreBalanceado(texto, k);
      if (cierre > k) {
        return {
          tipo: abre === '{' ? 'objeto' : 'array',
          cuerpo: texto.slice(k, cierre + 1)
        };
      }
      return null;
    }
    k++;
  }
  return null;
}

// Claves de un objeto literal, solo a profundidad 1 (las claves del mapa, no
// las de los objetos anidados). Deduplica y tolera claves entrecomilladas.
function clavesDeObjetoLiteral(cuerpo) {
  var claves = [];
  var depth = 0;
  var i = 0;
  var inStr = null;
  while (i < cuerpo.length) {
    var c = cuerpo.charAt(i);
    if (inStr) {
      if (c === '\\') { i += 2; continue; }
      if (c === inStr) { inStr = null; }
      i++;
      continue;
    }
    if (c === '\'' || c === '"') { inStr = c; i++; continue; }
    if (c === '/' && cuerpo.charAt(i + 1) === '/') {
      var nl = cuerpo.indexOf('\n', i);
      i = nl < 0 ? cuerpo.length : nl;
      continue;
    }
    if (c === '{' || c === '(' || c === '[') { depth++; i++; continue; }
    if (c === '}' || c === ')' || c === ']') { depth--; i++; continue; }
    if (depth === 1 && c === ':') {
      var j = i - 1;
      while (j >= 0 && /\s/.test(cuerpo.charAt(j))) j--;
      var finClave = j;
      while (j >= 0 && /[A-Za-z0-9_$'"]/.test(cuerpo.charAt(j))) j--;
      var clave = cuerpo.slice(j + 1, finClave + 1).replace(/^['"]/, '').replace(/['"]$/, '');
      if (clave && claves.indexOf(clave) === -1) claves.push(clave);
      i++;
      continue;
    }
    i++;
  }
  return claves;
}

function clavesDeArray(cuerpo) {
  var toks = cuerpo.match(/'[^']*'|"[^"]*"/g);
  var out = [];
  if (!toks) return out;
  for (var i = 0; i < toks.length; i++) out.push(toks[i].slice(1, -1));
  return out;
}

// Resuelve una expresion que debe valer una lista de claves. Admite:
// [ 'a', 'b' ]  |  Object.keys(ID)  |  ID  |  MODULO.PROPIEDAD
function resolverLista(expr, texto, pila) {
  var e = String(expr == null ? '' : expr).trim();
  if (e === '') return null;
  if (e.charAt(0) === '[') {
    var fin = cierreBalanceado(e, 0);
    if (fin < 0) return null;
    return clavesDeArray(e.slice(0, fin + 1));
  }
  var mKeys = /^Object\.keys\(\s*([A-Za-z_$][A-Za-z0-9_$]*)\s*\)$/.exec(e);
  if (mKeys) return resolverIdent(mKeys[1], texto, pila);
  var mId = /^([A-Za-z_$][A-Za-z0-9_$]*)$/.exec(e);
  if (mId) return resolverIdent(mId[1], texto, pila);
  var mMod = /^([A-Za-z_$][A-Za-z0-9_$]*)\.([A-Za-z_$][A-Za-z0-9_$]*)$/.exec(e);
  if (mMod) return resolverMiembro(mMod[1], mMod[2], texto, pila);
  return null;
}

function resolverIdent(nombre, texto, pila) {
  if (!nombre) return null;
  if (pila.indexOf(nombre) !== -1) return null; // ciclo de bindings
  var sig = pila.concat([nombre]);
  var b = expresionDeVar(texto, nombre);
  if (b) {
    if (b.tipo === 'array') return clavesDeArray(b.cuerpo);
    if (b.tipo === 'objeto') return clavesDeObjetoLiteral(b.cuerpo);
    return resolverLista(b.cuerpo, texto, sig);
  }
  if (Object.prototype.hasOwnProperty.call(Cartas, nombre)) {
    var v = Cartas[nombre];
    if (Array.isArray(v)) return v.slice();
    if (v && typeof v === 'object') return Object.keys(v);
  }
  return null;
}

// MODULO.PROPIEDAD: solo se sigue si MODULO es el require de cartas-config en
// ESTE fichero. Asi el extractor no puede resolver contra un modulo ajeno.
function resolverMiembro(base, prop, texto, pila) {
  var reReq = new RegExp('var\\s+' + base + '\\s*=\\s*require\\(([^)]*)\\)');
  var m = reReq.exec(texto);
  if (!m) return null;
  if (m[1].indexOf('cartas-config') === -1) return null;
  if (!Object.prototype.hasOwnProperty.call(Cartas, prop)) return null;
  var v = Cartas[prop];
  if (Array.isArray(v)) return v.slice();
  if (v && typeof v === 'object') return Object.keys(v);
  return null;
}

// --- Pre-parseo (todo lo que puede salir con exit 2) ------------------------

var bSink = expresionDeVar(tInter, 'SINK_CLAVES');
if (!bSink) {
  aborta('SINK_CLAVES no declarado en ' + INTER,
    'sin allow-list de entrada no hay contrato que verificar');
}
var clavesSink = resolverLista(bSink.cuerpo, tInter, ['SINK_CLAVES']);
if (!clavesSink || clavesSink.length === 0) {
  aborta('SINK_CLAVES no resuelve a una lista de claves en ' + INTER,
    'declaracion: ' + String(bSink.cuerpo).slice(0, 120));
}

// Seed de 082: lista JSON dentro de "v_seed jsonb := '[...]'::jsonb".
var mSeed = /v_seed\s+jsonb\s*:=\s*'(\[[\s\S]*?\])'::jsonb/.exec(t082);
if (!mSeed) {
  aborta('seed no localizado en ' + MIG082,
    'no se encontro v_seed jsonb := \'[...]\'::jsonb');
}
var filasSeed;
try {
  filasSeed = JSON.parse(mSeed[1]);
} catch (e) {
  aborta('el seed de ' + MIG082 + ' no es JSON parseable',
    e && e.message ? e.message : 'error');
}
if (!Array.isArray(filasSeed)) {
  aborta('el seed de ' + MIG082 + ' no es un array', 'tipo=' + typeof filasSeed);
}
var filasMejora = filasSeed.filter(function (r) {
  return r && r.familia === 'mejora';
});
if (filasMejora.length === 0) {
  aborta('el seed de ' + MIG082 + ' no declara ninguna fila familia=mejora',
    'el parseo no encontro el contrato (no se asume OK)');
}

// CHECKs de 081: se quitan comentarios porque 'destacar_evento' se menciona en
// ellos a proposito (documentan que NO entra).
var t081SinCom = t081.replace(/\/\*[\s\S]*?\*\//g, ' ');
t081SinCom = t081SinCom.replace(/--[^\r\n]*/g, ' ');

var bloquesCheck = [];
var reCheck = /CHECK\s*\(/gi;
var mCheck;
while ((mCheck = reCheck.exec(t081SinCom)) !== null) {
  var iParen = t081SinCom.indexOf('(', mCheck.index);
  var fParen = cierreBalanceado(t081SinCom, iParen);
  if (fParen > iParen) bloquesCheck.push(t081SinCom.slice(iParen, fParen + 1));
}
if (bloquesCheck.length === 0) {
  aborta('no se encontro ninguna definicion CHECK en ' + MIG081,
    'sin CHECKs no se puede probar D10 (fail-closed)');
}
var textoCheck = bloquesCheck.join('\n');

// Rama 'mejora' del CHECK de subtipo, aislada por el MISMO escaner balanceado
// del check 6 (una sola funcion, cero logica duplicada). Si no aparece, exit 2:
// sin rama no hay igualdad que probar y "0 subtipos" no puede pasar por OK.
var ramaMejoraSql = null;
var mRama = /familia\s*=\s*'mejora'\s+AND\s+subtipo\s+IN\s*\(/i.exec(textoCheck);
if (mRama) {
  var iAbreRama = mRama.index + mRama[0].length - 1;
  var fRama = cierreBalanceado(textoCheck, iAbreRama);
  if (fRama > iAbreRama) {
    var toksRama = clavesDeArray(textoCheck.slice(iAbreRama, fRama + 1));
    if (toksRama.length) ramaMejoraSql = toksRama;
  }
}
if (!ramaMejoraSql) {
  aborta('rama mejora no parseable en el CHECK de ' + MIG081,
    'se esperaba (familia = \'mejora\' AND subtipo IN (...)) con al menos 1 subtipo');
}

// --- Contrato esperado, derivado de la FUENTE (no se escribe a mano) --------

var clavesOrigen = Object.keys(Cartas.MEJORA_REF_ORIGEN || {});
var clavesSoporte = clavesOrigen.filter(function (k) {
  return Cartas.MEJORA_REF_ORIGEN[k] && Cartas.MEJORA_REF_ORIGEN[k].soporte === true;
});
var subtiposMejora = (Cartas.SUBTIPOS_CARTA && Cartas.SUBTIPOS_CARTA.mejora) || null;

console.log('=== VERIFICACION FAMILIA MEJORA (ADR-122, sin BD, $0) ===');
console.log('INFO - SINK_CLAVES resuelto por texto: ' + JSON.stringify(clavesSink));
console.log('');

// --- (1) SUBTIPOS_CARTA.mejora == claves de MEJORA_REF_ORIGEN con soporte ----
if (!Array.isArray(subtiposMejora)) {
  ko('1. SUBTIPOS_CARTA.mejora == claves con soporte === true (mismo orden)',
    'SUBTIPOS_CARTA.mejora no existe o no es array');
} else if (!iguales(subtiposMejora, clavesSoporte)) {
  ko('1. SUBTIPOS_CARTA.mejora == claves con soporte === true (mismo orden)',
    'subtipos=' + JSON.stringify(subtiposMejora) + ' esperado=' + JSON.stringify(clavesSoporte));
} else {
  ok('1. SUBTIPOS_CARTA.mejora == claves con soporte === true (mismo orden): '
    + JSON.stringify(subtiposMejora));
}

// --- (2) SINK_CLAVES cubre el mapa y solo claves del mapa -------------------
var sobraEnSink = clavesSink.filter(function (k) {
  return clavesOrigen.indexOf(k) === -1;
});
var faltaEnSink = clavesSoporte.filter(function (k) {
  return clavesSink.indexOf(k) === -1;
});
if (sobraEnSink.length || faltaEnSink.length) {
  ko('2. SINK_CLAVES son claves de MEJORA_REF_ORIGEN y cubren soporte === true',
    'ajenas=' + JSON.stringify(sobraEnSink) + ' sin sumidero=' + JSON.stringify(faltaEnSink));
} else {
  ok('2. las ' + clavesSink.length + ' claves de SINK_CLAVES existen en '
    + 'MEJORA_REF_ORIGEN y cubren las ' + clavesSoporte.length + ' con soporte');
}

// --- (3) CARTA_MULT_FAMILIA.mejora existe y vale 1.0 ------------------------
var mult = Cartas.CARTA_MULT_FAMILIA || {};
if (!Object.prototype.hasOwnProperty.call(mult, 'mejora')) {
  ko('3. CARTA_MULT_FAMILIA.mejora === 1.0', 'falta la familia mejora en el mapa');
} else if (mult.mejora !== 1) {
  ko('3. CARTA_MULT_FAMILIA.mejora === 1.0', 'valor=' + String(mult.mejora));
} else {
  ok('3. CARTA_MULT_FAMILIA.mejora === 1.0 (precio fijo por copia, ADR-122 D4)');
}

// --- (4) 'mejora' NO esta en CARTA_FAMILIAS_SIN_PRECIO_XP -------------------
var sinPrecio = Cartas.CARTA_FAMILIAS_SIN_PRECIO_XP || [];
if (!Array.isArray(sinPrecio)) {
  ko('4. CARTA_FAMILIAS_SIN_PRECIO_XP no contiene mejora', 'no es array');
} else if (sinPrecio.indexOf('mejora') !== -1) {
  ko('4. CARTA_FAMILIAS_SIN_PRECIO_XP no contiene mejora',
    'mejora necesita precio_xp > 0 (D1); lista=' + JSON.stringify(sinPrecio));
} else {
  ok('4. CARTA_FAMILIAS_SIN_PRECIO_XP no contiene mejora: ' + JSON.stringify(sinPrecio));
}

// --- (5) El seed de 082: 3 filas y precio_xp == precioAcunacion -------------
var problemas = [];
if (filasMejora.length !== 3) {
  problemas.push('filas=' + filasMejora.length + ' (esperadas 3)');
}
for (var i = 0; i < filasMejora.length; i++) {
  var f = filasMejora[i];
  var etiqueta = 'fila[' + i + ']=' + String(f && f.id);
  if (!f || typeof f.id !== 'string' || f.id === '') {
    problemas.push(etiqueta + ' sin id');
    continue;
  }
  if (typeof f.subtipo !== 'string' || subtiposMejora === null
    || subtiposMejora.indexOf(f.subtipo) === -1) {
    problemas.push(etiqueta + ' subtipo fuera de SUBTIPOS_CARTA.mejora: ' + String(f.subtipo));
  }
  var esperado = Cartas.precioAcunacion('mejora', f.rareza);
  if (esperado === null) {
    problemas.push(etiqueta + ' rareza no acunable: ' + String(f.rareza));
  } else if (typeof f.precio_xp !== 'number' || f.precio_xp !== esperado) {
    problemas.push(etiqueta + ' precio_xp=' + String(f.precio_xp)
      + ' esperado=' + String(esperado) + ' (' + String(f.rareza) + ')');
  }
}
if (problemas.length) {
  ko('5. seed 082: 3 filas mejora con precio_xp == precioAcunacion()',
    problemas.join(' | '));
} else {
  var detallePrecios = filasMejora.map(function (r) {
    return String(r.subtipo) + '/' + String(r.rareza) + '=' + String(r.precio_xp);
  }).join(', ');
  ok('5. seed 082: 3 filas mejora y precio_xp == precioAcunacion() :: ' + detallePrecios);
}

// --- (6) 'destacar_evento' fuera de SUBTIPOS_CARTA.mejora y de los CHECK ----
var d10 = [];
if (subtiposMejora && subtiposMejora.indexOf('destacar_evento') !== -1) {
  d10.push('SUBTIPOS_CARTA.mejora lo incluye');
}
if (textoCheck.indexOf('destacar_evento') !== -1) {
  d10.push('un CHECK de 081 lo nombra (' + bloquesCheck.length + ' bloques revisados)');
}
if (d10.length) {
  ko('6. destacar_evento fuera de SUBTIPOS_CARTA.mejora y del CHECK de 081',
    d10.join(' | '));
} else {
  ok('6. destacar_evento fuera de SUBTIPOS_CARTA.mejora y de los '
    + bloquesCheck.length + ' CHECK de 081 (D10)');
}

// --- (7) La rama mejora del CHECK de 081 == SUBTIPOS_CARTA.mejora (en orden) -
if (!Array.isArray(subtiposMejora)) {
  ko('7. rama mejora del CHECK de 081 == SUBTIPOS_CARTA.mejora (mismo orden)',
    'SUBTIPOS_CARTA.mejora no existe o no es array');
} else if (!iguales(ramaMejoraSql, subtiposMejora)) {
  ko('7. rama mejora del CHECK de 081 == SUBTIPOS_CARTA.mejora (mismo orden)',
    'sql=' + JSON.stringify(ramaMejoraSql) + ' js=' + JSON.stringify(subtiposMejora));
} else {
  ok('7. rama mejora del CHECK de 081 == SUBTIPOS_CARTA.mejora (mismo orden): '
    + JSON.stringify(ramaMejoraSql));
}

// --- Resumen ---------------------------------------------------------------
console.log('');
console.log('Checks: ' + total + ' total, ' + pass + ' PASS, ' + fails + ' FAIL');
if (fails === 0) {
  console.log('RESULTADO: OK - ' + pass + ' verificaciones pasaron.');
  process.exit(0);
}
console.log('RESULTADO: FAIL - ' + fails + ' de ' + total + ' verificaciones fallaron.');
process.exit(1);
