// scripts/smoke_xp_contrato.js
// GATE de contrato de la rama GET ?tipo=catalogo_xp de api/interacciones.js.
//
// Verifica por PARSEO DE TEXTO (no require(): es una function serverless):
//   Assert 1 (sin usuario) : progreso/regalias SOLO se anaden bajo el guard
//                            de usuario_id valido, nunca en el cxData base.
//   Assert 2 (degradacion) : NO hay res.status(400) dentro de la rama.
//   Assert 3 (constantes)  : VISITAS_DIA_MAX / VOTOS_DIA_MAX como
//                            identificadores, no como 30/20 a mano.
//   Assert 4 (restante)    : formula restante con resta + clamp (Math.max).
//   Assert 5 (chat)        : chatXpDisponible() se invoca en la rama.
//
// Si un assert no se puede verificar por parseo simple se reporta FAIL con
// el motivo, sin forzarlo.
//
// ASCII-safe (ADR-002), CommonJS (BUG-001), 0 backticks.
// Run: node scripts/smoke_xp_contrato.js
'use strict';

var fs = require('fs');
var path = require('path');

var ROOT = path.join(__dirname, '..');
var MOTOR = 'api/interacciones.js';
var MARCA = "if (tipo === 'catalogo_xp') {";

var total = 0;
var pass = 0;
var fails = 0;
function ok(label) { total++; pass++; console.log('PASS - ' + label); }
function ko(label, detalle) {
  total++; fails++;
  console.log('FAIL - ' + label + (detalle ? ' :: ' + detalle : ''));
}

// Devuelve el indice del '}' que cierra la llave abierta en `open`,
// saltando strings, template literals y comentarios (brace-safe simple).
function cierreBalance(src, open) {
  var depth = 0;
  var i = open;
  while (i < src.length) {
    var c = src.charAt(i);
    var c2 = src.charAt(i + 1);
    if (c === '/' && c2 === '/') {
      var fin = src.indexOf('\n', i);
      if (fin < 0) return -1;
      i = fin;
      continue;
    }
    if (c === '/' && c2 === '*') {
      var fc = src.indexOf('*/', i + 2);
      if (fc < 0) return -1;
      i = fc + 2;
      continue;
    }
    if (c === "'" || c === '"' || c === '`') {
      var q = c;
      i++;
      while (i < src.length) {
        var d = src.charAt(i);
        if (d === '\\') { i += 2; continue; }
        if (d === q) { i++; break; }
        i++;
      }
      continue;
    }
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) return i;
    }
    i++;
  }
  return -1;
}

// Recorta un bloque balanceado: primer '{' desde `desde`, hasta su cierre.
function bloqueDesde(src, desde) {
  var open = src.indexOf('{', desde);
  if (open < 0) return null;
  var close = cierreBalance(src, open);
  if (close < 0) return null;
  return { open: open, close: close, inner: src.slice(open + 1, close) };
}

console.log('=== SMOKE XP CONTRATO (rama catalogo_xp) ===');
console.log('');

var src = fs.readFileSync(path.join(ROOT, MOTOR), 'utf8');

var idxMarca = src.indexOf(MARCA);
var rama = null;
if (idxMarca < 0) {
  ko('parseo: rama catalogo_xp no encontrada en ' + MOTOR, 'marcador ausente: ' + MARCA);
} else {
  rama = bloqueDesde(src, idxMarca);
  if (!rama) ko('parseo: no se pudo balancear la rama catalogo_xp', 'llave sin cierre');
}
var ramaRaw = rama ? rama.inner : '';

// ---- Assert 1: progreso/regalias solo bajo el guard de usuario_id ----
if (!rama) {
  ko('Assert 1 sin usuario: sin rama parseada', 'no verificable');
} else {
  var base = bloqueDesde(ramaRaw, ramaRaw.indexOf('var cxData = {'));
  var guardRe = /if\s*\(\s*usuarioId\s*&&\s*MERCADO_UUID_RE\.test\(usuarioId\)\s*\)/;
  var mGuard = guardRe.exec(ramaRaw);
  var guard = mGuard ? bloqueDesde(ramaRaw, mGuard.index) : null;

  if (!base) {
    ko('Assert 1 sin usuario: no se hallo el objeto base cxData', 'marcador var cxData = {');
  } else if (!mGuard || !guard) {
    ko('Assert 1 sin usuario: no se hallo el guard de usuario_id valido', 'regex guard');
  } else {
    var baseTieneP = /\bprogreso\b/.test(base.inner);
    var baseTieneR = /\bregalias\b/.test(base.inner);
    var guardTieneP = /cxData\.progreso\s*=/.test(guard.inner);
    var guardTieneR = /cxData\.regalias\s*=/.test(guard.inner);
    if (!baseTieneP && !baseTieneR && guardTieneP && guardTieneR) {
      ok('Assert 1 sin usuario: cxData base limpio; progreso/regalias bajo ['
        + mGuard[0] + '] -> cxData.progreso, cxData.regalias');
    } else {
      ko('Assert 1 sin usuario: ubicacion de progreso/regalias incorrecta',
        'base.progreso=' + baseTieneP + ' base.regalias=' + baseTieneR
        + ' guard.progreso=' + guardTieneP + ' guard.regalias=' + guardTieneR);
    }
  }
}

// ---- Assert 2: degradacion silenciosa (sin 400) ----
if (!rama) {
  ko('Assert 2 degradacion: sin rama parseada', 'no verificable');
} else if (/res\.status\(400\)/.test(ramaRaw)) {
  ko('Assert 2 degradacion: hay res.status(400) dentro de catalogo_xp', 'esperado ninguno');
} else {
  ok('Assert 2 degradacion: la rama catalogo_xp NO emite res.status(400)');
}

// ---- Assert 3: constantes compartidas como identificadores ----
if (!rama) {
  ko('Assert 3 constantes: sin rama parseada', 'no verificable');
} else {
  var ev3 = [];
  var ok3 = true;
  if (/tope:\s*VISITAS_DIA_MAX/.test(ramaRaw)) ev3.push('tope: VISITAS_DIA_MAX');
  else { ok3 = false; ev3.push('falta tope: VISITAS_DIA_MAX'); }
  if (/tope:\s*VOTOS_DIA_MAX/.test(ramaRaw)) ev3.push('tope: VOTOS_DIA_MAX');
  else { ok3 = false; ev3.push('falta tope: VOTOS_DIA_MAX'); }
  if (/tope:\s*(30|20)\b/.test(ramaRaw)) { ok3 = false; ev3.push('literal 30/20 a mano'); }
  if (ok3) ok('Assert 3 constantes: ' + ev3.join(', '));
  else ko('Assert 3 constantes: topes no usan identificadores', ev3.join(' | '));
}

// ---- Assert 4: formula restante (resta + clamp) ----
if (!rama) {
  ko('Assert 4 restante: sin rama parseada', 'no verificable');
} else {
  var mRest = /restante\s*:\s*Math\.max\s*\(\s*0\s*,\s*[^)]*-[^)]*\)/.exec(ramaRaw);
  if (mRest) ok('Assert 4 restante: ' + mRest[0].replace(/\s+/g, ' '));
  else ko('Assert 4 restante: no se hallo restante con resta + clamp', 'regex Math.max(0, tope - u)');
}

// ---- Assert 5: chatXpDisponible invocado ----
if (!rama) {
  ko('Assert 5 chat: sin rama parseada', 'no verificable');
} else {
  var mChat = /chatXpDisponible\s*\(/.exec(ramaRaw);
  if (mChat) ok('Assert 5 chat: chatXpDisponible() invocado en la rama');
  else ko('Assert 5 chat: chatXpDisponible no aparece en la rama', 'regex chatXpDisponible(');
}

console.log('');
if (fails === 0) {
  console.log('RESULTADO: OK - ' + pass + '/' + total + ' verificaciones pasaron.');
  process.exit(0);
} else {
  console.log('RESULTADO: FAIL - ' + fails + '/' + total + ' verificaciones fallaron.');
  process.exit(1);
}
