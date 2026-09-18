/* scripts/smoke_niveles_data.js - Smoke de niveles-data.js (ADR-040 T2)
 * ASCII-safe (ADR-002): cero bytes > 127 en este archivo.
 * CommonJS (BUG-001): require/module.exports (no aplica export aqui).
 * Uso: node scripts/smoke_niveles_data.js
 *
 * Fuentes de verdad (ADR-006, leidas en runtime, nunca hardcodeadas):
 *   - niveles-data.js         -> XP_LEVELS (20 umbrales/nombres/eras/emojis)
 *   - mi-perfil.html          -> carga niveles-data.js y aliasa XP_LEVELS
 *                                (ADR-040 T1: ya no tiene tabla literal)
 *   - api/interacciones.js    -> catalogo MISIONES (IDs del fallback + gate_nivel)
 *   - usuario-session.js:65   -> CAPACIDADES_POR_NIVEL (niveles de capacidades)
 * Solo se hardcodean los IDs esperados del fallback, porque el ADR-040 B
 * los congela explicitamente (5 con gate XP + 6 del bloque fotos).
 */
'use strict';

var fs = require('fs');
var path = require('path');

var ROOT = path.resolve(__dirname, '..');
var MODULO = path.join(ROOT, 'niveles-data.js');
var PERFIL = path.join(ROOT, 'mi-perfil.html');
var API = path.join(ROOT, 'api', 'interacciones.js');

var fallos = [];
var total = 0;

function ok(cond, msg) {
  total++;
  if (cond) {
    console.log('  [OK]    ' + msg);
  } else {
    fallos.push(msg);
    console.log('  [FALLO] ' + msg);
  }
}

function esAscii(ruta) {
  var buf = fs.readFileSync(ruta);
  for (var i = 0; i < buf.length; i++) {
    if (buf[i] > 127) return false;
  }
  return true;
}

console.log('Smoke niveles-data.js (ADR-040 T2)');
console.log('===================================');

/* -- 1. ASCII-safe ------------------------------------------------ */
ok(esAscii(MODULO), 'niveles-data.js es ASCII-safe (0 bytes > 127)');
ok(esAscii(__filename), 'smoke es ASCII-safe (0 bytes > 127)');

/* -- 2. Carga por require ----------------------------------------- */
var NivelesData = null;
try {
  NivelesData = require('../niveles-data.js');
  ok(!!NivelesData, 'niveles-data.js carga por require (ruta relativa)');
} catch (e) {
  ok(false, 'niveles-data.js carga por require: ' + e.message);
}

if (!NivelesData) {
  console.log('-----------------------------------');
  console.log('RESULTADO: FALLO - el modulo no carga; ' + fallos.length + ' fallo(s).');
  process.exit(1);
}

/* -- 3. Fuente unica: mi-perfil.html carga niveles-data.js --------- */
/* ADR-040 T1: mi-perfil.html ya no declara la tabla literal; toma
 * XP_LEVELS/GRUPO_NOMBRE de window.NivelesData. Los 20 umbrales se
 * validan leyendolos de niveles-data.js (fuente unica, ADR-006). */
var html = fs.readFileSync(PERFIL, 'utf8');

var posSrc = html.search(/<script[^>]*src=["']niveles-data\.js["']/);
var posUse = html.indexOf('window.NivelesData.XP_LEVELS');
ok(posSrc !== -1, 'mi-perfil.html carga niveles-data.js');
ok(posUse !== -1, 'mi-perfil.html usa window.NivelesData.XP_LEVELS');
ok(posSrc !== -1 && posUse !== -1 && posSrc < posUse,
   'niveles-data.js se carga ANTES de XP_LEVELS (orden de carga)');
ok(/var\s+XP_LEVELS\s*=\s*window\.NivelesData\.XP_LEVELS\s*;/.test(html),
   'mi-perfil.html asigna var XP_LEVELS = window.NivelesData.XP_LEVELS');
ok(/var\s+GRUPO_NOMBRE\s*=\s*window\.NivelesData\.GRUPO_NOMBRE\s*;/.test(html),
   'mi-perfil.html asigna var GRUPO_NOMBRE = window.NivelesData.GRUPO_NOMBRE');
ok(!/var\s+XP_LEVELS\s*=\s*\[/.test(html),
   'mi-perfil.html ya no declara la tabla literal de XP_LEVELS');

var levels = NivelesData.XP_LEVELS;
ok(Array.isArray(levels) && levels.length === 20,
   'NivelesData.XP_LEVELS tiene 20 niveles (leidos: ' + (Array.isArray(levels) ? levels.length : 0) + ')');

if (Array.isArray(levels) && levels.length === 20) {
  var problemas = [];
  if (levels[0].min !== 0) problemas.push('nivel 1 no arranca en min 0');
  var minsVistos = {};
  for (var i = 0; i < levels.length; i++) {
    var lv = levels[i];
    if (typeof lv.min !== 'number') problemas.push('nivel ' + (i + 1) + ' sin min numerico');
    if (i > 0 && lv.min <= levels[i - 1].min) problemas.push('umbral no creciente en nivel ' + (i + 1));
    if (minsVistos[lv.min]) problemas.push('umbral duplicado en nivel ' + (i + 1));
    minsVistos[lv.min] = true;
    if (!lv.nombre) problemas.push('nivel ' + (i + 1) + ' sin nombre');
    if (!lv.era) problemas.push('nivel ' + (i + 1) + ' sin era');
    if (!lv.emoji) problemas.push('nivel ' + (i + 1) + ' sin emoji');
  }
  ok(problemas.length === 0,
     'los 20 umbrales son crecientes, unicos y con nombre/era/emoji' + (problemas.length ? ' -> ' + problemas.join('; ') : ''));
  console.log('        Umbrales leidos de la fuente (niveles-data.js): ' +
    levels.map(function(x) { return x.min; }).join(','));
}

/* -- 4. CAPACIDADES_DETALLE --------------------------------------- */
var caps = NivelesData.CAPACIDADES_DETALLE;
ok(Array.isArray(caps) && caps.length > 0,
   'CAPACIDADES_DETALLE no vacio (entradas: ' + (Array.isArray(caps) ? caps.length : 0) + ')');

var sinHowto = [];
var fueraRango = [];
var dups = [];
var vistas = {};
if (Array.isArray(caps)) {
  caps.forEach(function(c) {
    if (!c.howto || String(c.howto).trim() === '') sinHowto.push(c.clave || '?');
    if (typeof c.nivel !== 'number' || c.nivel < 1 || c.nivel > 20) fueraRango.push(c.clave + '=' + c.nivel);
    if (c.clave) {
      if (vistas[c.clave]) dups.push(c.clave);
      vistas[c.clave] = true;
    }
  });
}
ok(sinHowto.length === 0,
   'todas las capacidades tienen howto no vacio' + (sinHowto.length ? ' -> vacias: ' + sinHowto.join(', ') : ''));
ok(fueraRango.length === 0,
   'nivel de cada capacidad dentro de 1..20' + (fueraRango.length ? ' -> fuera: ' + fueraRango.join(', ') : ''));
ok(dups.length === 0,
   'claves de capacidad unicas' + (dups.length ? ' -> duplicadas: ' + dups.join(', ') : ''));

/* -- 5. GRUPO_NOMBRE: 6 grupos reales ----------------------------- */
var gruposEsperados = ['general', 'ciudad', 'categoria', 'fotos', 'artista', 'perfil'];
var g = NivelesData.GRUPO_NOMBRE || {};
var faltanG = gruposEsperados.filter(function(k) { return !g[k]; });
ok(faltanG.length === 0,
   'GRUPO_NOMBRE cubre los 6 grupos reales' + (faltanG.length ? ' -> faltan: ' + faltanG.join(', ') : ''));
ok(Object.keys(g).length === 6,
   'GRUPO_NOMBRE tiene exactamente 6 claves (real: ' + Object.keys(g).length + ')');

/* -- 6. MISION_GATE_FALLBACK: exactamente 11 ---------------------- */
var fb = NivelesData.MISION_GATE_FALLBACK || {};
var fbKeys = Object.keys(fb);
ok(fbKeys.length === 11,
   'MISION_GATE_FALLBACK tiene exactamente 11 entradas (real: ' + fbKeys.length + ')');
console.log('        Misiones del fallback:');
fbKeys.forEach(function(k) { console.log('          - ' + k + ' -> nivel ' + fb[k]); });

var idsEsperados = [
  'mis_fotografo', 'mis_chat_mensajero', 'mis_chat_moderador', 'mis_chat_creador',
  'mis_organizador_bogota',
  'mis_primera_foto_social', 'mis_creador_album', 'mis_album_curador',
  'mis_fotografo_social', 'mis_cazador_recompensas', 'mis_favorito_del_pueblo'
];
var faltanIds = idsEsperados.filter(function(k) { return fb[k] == null; });
var extraIds = fbKeys.filter(function(k) { return idsEsperados.indexOf(k) === -1; });
ok(faltanIds.length === 0,
   'el fallback contiene los 11 IDs reales' + (faltanIds.length ? ' -> faltan: ' + faltanIds.join(', ') : ''));
ok(extraIds.length === 0,
   'el fallback no tiene IDs ajenos' + (extraIds.length ? ' -> extra: ' + extraIds.join(', ') : ''));
ok(fb['mis_fotografo'] === 2, 'mis_fotografo -> nivel 2');
ok(fb['mis_organizador_bogota'] === 3, 'mis_organizador_bogota -> nivel 3');

/* -- 6b. IDs reales presentes en el catalogo api/interacciones.js - */
var apiTxt = fs.readFileSync(API, 'utf8');
var idsApi = {};
var reId = /id:\s*'([^']+)'/g;
var mid;
while ((mid = reId.exec(apiTxt)) !== null) idsApi[mid[1]] = true;
var fantasmas = idsEsperados.filter(function(k) { return !idsApi[k]; });
ok(fantasmas.length === 0,
   'los 11 IDs del fallback existen en el catalogo MISIONES' + (fantasmas.length ? ' -> fantasmas: ' + fantasmas.join(', ') : ''));

var fotos = ['mis_primera_foto_social', 'mis_creador_album', 'mis_album_curador',
             'mis_fotografo_social', 'mis_cazador_recompensas', 'mis_favorito_del_pueblo'];
var sinGate = [];
fotos.forEach(function(id) {
  var pos = apiTxt.indexOf("id: '" + id + "'");
  if (pos === -1) { sinGate.push(id + '(ausente)'); return; }
  var resto = apiTxt.slice(pos + 4);
  var next = resto.indexOf("id: '");
  var bloqueMis = next === -1 ? resto : resto.slice(0, next);
  if (!/gate_nivel:\s*2/.test(bloqueMis)) sinGate.push(id);
});
ok(sinGate.length === 0,
   'las 6 misiones de fotos declaran gate_nivel: 2' + (sinGate.length ? ' -> sin gate: ' + sinGate.join(', ') : ''));

/* -- 7. Capacidad organizar_actividad en nivel 11 ----------------- */
var c11 = NivelesData.capacidadesDelNivel(11);
ok(c11.some(function(c) { return c.clave === 'organizar_actividad'; }),
   'capacidadesDelNivel(11) incluye organizar_actividad');

/* -- 8. Fixtures de misionesPorNivel ------------------------------ */
var fixture = [
  { id: 'mis_fotografo', nombre: 'Fotografo', xp: 20, grupo: 'general', requiere: ['mis_primera_resena'], estado: 'pendiente' },
  { id: 'mis_organizador_bogota', nombre: 'Organizador', xp: 100, grupo: 'ciudad', requiere: ['mis_explorador_bogota'], estado: 'completada' },
  { id: 'mis_sin_gate', nombre: 'Sin gate', xp: 15, grupo: 'general', requiere: [], estado: 'disponible' }
];

var n2 = NivelesData.misionesPorNivel(2, fixture).map(function(x) { return x.id; });
var n3 = NivelesData.misionesPorNivel(3, fixture).map(function(x) { return x.id; });
ok(n2.length === 1 && n2[0] === 'mis_fotografo',
   'misionesPorNivel(2) -> [mis_fotografo] (real: [' + n2.join(', ') + '])');
ok(n3.length === 1 && n3[0] === 'mis_organizador_bogota',
   'misionesPorNivel(3) -> [mis_organizador_bogota] (real: [' + n3.join(', ') + '])');

var sinGateFixture = [{ id: 'mis_sin_gate', nombre: 'Sin gate', xp: 15, grupo: 'general', requiere: [], estado: 'disponible' }];
ok(NivelesData.misionesPorNivel(5, sinGateFixture).length === 0,
   'mision sin gate -> [] en cualquier nivel');

var gatePayload = [{ id: 'mis_fotografo', nombre: 'Fotografo', xp: 20, grupo: 'general', requiere: [], gate_nivel: 7, estado: 'pendiente' }];
var n7 = NivelesData.misionesPorNivel(7, gatePayload).map(function(x) { return x.id; });
ok(n7.length === 1 && n7[0] === 'mis_fotografo', 'gate_nivel del payload manda sobre el fallback (nivel 7)');

var nivelPayload = [{ id: 'mis_fotografo', nombre: 'Fotografo', xp: 20, grupo: 'general', requiere: [], nivel: 9, gate_nivel: 7, estado: 'pendiente' }];
var n9 = NivelesData.misionesPorNivel(9, nivelPayload).map(function(x) { return x.id; });
ok(n9.length === 1 && n9[0] === 'mis_fotografo', 'campo nivel del backend v22 manda sobre gate_nivel (nivel 9)');

ok(NivelesData.misionesPorNivel(2, null).length === 0 &&
   NivelesData.misionesPorNivel(2, 'no-array').length === 0,
   'misionesPorNivel tolera payload nulo/no-array -> []');

/* -- Resultado ---------------------------------------------------- */
console.log('-----------------------------------');
if (fallos.length) {
  console.log('RESULTADO: FALLO - ' + fallos.length + ' de ' + total + ' verificaciones fallaron.');
  fallos.forEach(function(f) { console.log('  - ' + f); });
  process.exit(1);
} else {
  console.log('RESULTADO: OK - ' + total + ' verificaciones pasaron.');
  process.exit(0);
}
