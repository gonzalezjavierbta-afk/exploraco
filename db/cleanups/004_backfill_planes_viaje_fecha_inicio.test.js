// ============================================================================
// 004_backfill_planes_viaje_fecha_inicio.test.js
// Test known-answer del parser de 004_backfill_planes_viaje_fecha_inicio.js.
// NO toca la base de datos: ejercita solo el parser puro (el modulo exporta
// parsear / candidatos / fechaReal y solo abre conexion si se ejecuta
// directamente), asi que se puede correr en cualquier momento y en CI.
//
// CUBRE las reglas R0..R7 de la cabecera del script:
//   R0 vacio / null / espacios, R1 ISO con separadores - / ., R1 tolerante a 1
//   digito, R3 primera de varias coherentes, R4 mas de 2 fechas, R5 segunda
//   anterior, R6 fecha inexistente (mes 13, 30-feb, bisiesto), R7 texto sin ano
//   ("del 15 al 20 de marzo" NO se parsea), y el opt-in --ddmm-aaaa.
//
// USO
//   node db/cleanups/004_backfill_planes_viaje_fecha_inicio.test.js
//   Sale con codigo 0 si todos pasan, con codigo 1 si hay algun FAIL.
//
// ASCII-SAFE (ADR-002): cero bytes > 127, cero backticks, CommonJS, var.
// ============================================================================
'use strict';

var parsear = require('./004_backfill_planes_viaje_fecha_inicio.js').parsear;

// [entrada, permitirDdmm, fecha_esperada_o_null, que_regla_esta_probando]
var casos = [
  // --- R1 / R3: ISO, se coge la PRIMERA fecha (inicio del viaje) -------------
  ['2026-03-15 a 2026-03-20',          false, '2026-03-15', 'R3 primera de 2 ISO'],
  ['2026/03/15 a 2026/03/20',          false, '2026-03-15', 'R1 separador /'],
  ['2026.03.15 - 2026.03.20',          false, '2026-03-15', 'R1 separador .'],
  ['Del 2026-03-15 al 2026-03-20',     false, '2026-03-15', 'R1 ISO con palabras'],
  ['2026-3-5',                         false, '2026-03-05', 'R1 tolerante a 1 digito'],
  ['2026-03-15 2026-03-15',            false, '2026-03-15', 'R3 segunda igual'],

  // --- R7: sin ano NO se adivina. Adivinar seria peor que dejar NULL -------
  ['del 15 al 20 de marzo',            false, null,         'R7 sin ano -> NULL'],
  ['15 al 20 de marzo de 2026',        false, null,         'R7 no se adivina el ano'],

  // --- R0: vacios -----------------------------------------------------------
  ['',                                 false, null,         'R0 cadena vacia'],
  ['   ',                              false, null,         'R0 solo espacios'],
  [null,                               false, null,         'R0 fechas NULL'],

  // --- R4 / R5: incoherencias -> NULL --------------------------------------
  ['2026-01-01 2026-02-01 2026-03-01', false, null,         'R4 mas de 2 fechas'],
  ['2026-01-01 2025-01-01',            false, null,         'R5 segunda anterior'],

  // --- R6: calendario real --------------------------------------------------
  ['2026-13-01',                       false, null,         'R6 mes 13'],
  ['2026-02-30',                       false, null,         'R6 30 de febrero'],
  ['2026-02-29',                       false, null,         'R6 2026 no es bisiesto'],
  ['2024-02-29',                       false, '2024-02-29', 'R6 2024 si es bisiesto'],
  ['1899-01-01',                       false, null,         'R6 ano fuera de rango'],

  // --- Bordes de la deteccion de candidatos --------------------------------
  ['12026-03-15',                      false, null,         'borde: 5 digitos no cuela'],

  // --- DD-MM-AAAA: apagado por defecto, opt-in explicito -------------------
  ['12-09-2026',                       false, null,         'DDMM apagado por defecto'],
  ['12-09-2026',                       true,  '2026-09-12', 'DDMM con --ddmm-aaaa'],
  ['2026-03-15 a 2026-03-20',          true,  '2026-03-15', 'ISO tiene prioridad sobre DDMM'],
  ['32-01-2026',                       true,  null,         'DDMM dia 32 invalido'],
  ['01-13-2026',                       true,  null,         'DDMM mes 13 invalido'],

  // --- Valor REAL medido en planes_viaje (Neon, 2026-10-05) ----------------
  // Unica fila de la tabla. Este caso es el que motivo el opt-in de DDMM:
  // interpretarlo como MM-DD daria 2026-12-09 (futuro) y como DD-MM da
  // 2026-09-12 (ya pasado). El operador decidio DD-MM-AAAA.
  ['12-09-2026',                       true,  '2026-09-12', 'REAL Neon: fila unica']
];

var pass = 0;
var fail = 0;

casos.forEach(function (c) {
  var r = parsear(c[0], c[1]);
  var ok = (r.fecha === c[2]);
  if (ok) { pass++; } else { fail++; }
  console.log((ok ? 'PASS' : 'FAIL') + '  ' + c[3]);
  console.log('        entrada=' + JSON.stringify(c[0])
              + '  ddmm=' + c[1]
              + '  ->  fecha=' + JSON.stringify(r.fecha)
              + '  esperada=' + JSON.stringify(c[2])
              + '  motivo=' + r.motivo
              + (r.detalle ? '  (' + r.detalle + ')' : ''));
});

console.log('');
console.log('RESULTADO: ' + pass + '/' + casos.length + ' PASS, ' + fail + ' FAIL');
process.exit(fail > 0 ? 1 : 0);