// scripts/smoke_test_agenda.js
// Smoke local: valida la logica compartida de la Agenda Cultural
// (agenda-shared.js) que alimenta index.html y agenda.html:
// rango multidia, activo-en-dia, meses activos, texto de rango y
// deteccion de categoria. ASCII-safe (no emite tildes).

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const src = fs.readFileSync(path.join(__dirname, '..', 'agenda-shared.js'), 'utf8');
const sandbox = { window: {} };
sandbox.global = sandbox;
vm.createContext(sandbox);
vm.runInContext(src, sandbox, { filename: 'agenda-shared.js' });
const AU = sandbox.window.AgendaUtil;

let fails = 0;
function check(label, cond) {
  console.log((cond ? 'PASS' : 'FAIL') + ' - ' + label);
  if (!cond) fails++;
}

function apiEv(ini, fin) {
  return { tags: { fecha_inicio: ini, fecha_fin: fin || ini } };
}

function D(y, m, d) { return new Date(y, m - 1, d); }

check('AgendaUtil expuesto', !!AU && typeof AU.evActiveOn === 'function');

// ── Multidia: activo todos los dias del rango ──
const mesPatrimonio = apiEv('2026-09-01', '2026-09-30');
check('antes del inicio = false', AU.evActiveOn(mesPatrimonio, D(2026, 8, 31)) === false);
check('dia de inicio = true', AU.evActiveOn(mesPatrimonio, D(2026, 9, 1)) === true);
check('dia intermedio = true', AU.evActiveOn(mesPatrimonio, D(2026, 9, 15)) === true);
check('dia de fin (incluido) = true', AU.evActiveOn(mesPatrimonio, D(2026, 9, 30)) === true);
check('despues del fin = false', AU.evActiveOn(mesPatrimonio, D(2026, 10, 1)) === false);

// ── Meses activos (cruza de mes) ──
const ulibro = apiEv('2026-08-28', '2026-09-06');
const meses = AU.evActiveMonths(ulibro);
check('cruza de mes: Ago+Sep', meses.length === 2 && meses.indexOf('Ago') !== -1 && meses.indexOf('Sep') !== -1);

const unDia = apiEv('2026-09-09');
const meses1 = AU.evActiveMonths(unDia);
check('evento 1 dia: un solo mes', meses1.length === 1 && meses1[0] === 'Sep');

// ── Texto de rango ──
check('rango 1 dia: "12 Sep"', AU.evRangeText(apiEv('2026-09-12')) === '12 Sep');
check('rango mismo mes: "12-13 Sep"', AU.evRangeText(apiEv('2026-09-12', '2026-09-13')) === '12-13 Sep');
check('rango cruce mes: "28 Ago - 6 Sep"', AU.evRangeText(apiEv('2026-08-28', '2026-09-06')) === '28 Ago - 6 Sep');

// ── Eventos hardcodeados recurrentes (day/month[/dayEnd/monthEnd]) ──
const carnaval = { day: 14, month: 'Feb', dayEnd: 17, monthEnd: 'Feb' };
check('recurrente: activo el dia 16 feb', AU.evActiveOn(carnaval, D(2026, 2, 16)) === true);
check('recurrente: no activo el 18 feb', AU.evActiveOn(carnaval, D(2026, 2, 18)) === false);
check('recurrente: rango "14-17 Feb"', AU.evRangeText(carnaval) === '14-17 Feb');
const festiFlores = { day: 1, month: 'Ago', dayEnd: 10, monthEnd: 'Ago' };
check('recurrente: cruce mismo mes activo', AU.evActiveOn(festiFlores, D(2026, 8, 5)) === true);

// ── Deteccion de categoria ──
function catDe(nombre) { return AU.detectEventCat(nombre, {}); }
check('cultura: Feria del Libro', catDe('Ulibro 2026: Feria del Libro de Bucaramanga') === 'cultura');
check('cultura: Mes del Patrimonio', catDe('Mes del Patrimonio 2026: Memoria que construye futuro') === 'cultura');
check('cultura: Exposicion', catDe('Exposici\u00f3n Tr\u00e1nsitos fragmentados') === 'cultura');
check('cultura: Teatro', catDe('Festival de Teatro en el Libre') === 'cultura');
check('musica: Concierto Sinfonico', catDe('Concierto Sinf\u00f3nico al Aire Libre') === 'musica');
check('musica: Festival de Jazz', catDe('Festival de Jazz de Bogot\u00e1') === 'musica');
check('musica: Rock al Parque', catDe('Rock al Parque') === 'musica');
check('musica: Tributo', catDe('Queentaesencia: Tributo a Queen') === 'musica');
check('gastro: Mercado Gastronomico', catDe('Mercado Gastron\u00f3mico La Candelaria') === 'gastro');
check('gastro: Feria del Cafe', catDe('Feria del Caf\u00e9 \u00b7 Armenia') === 'gastro');
check('naturaleza: Cano Cristales', catDe('Ca\u00f1o Cristales \u00b7 Temporada de colores') === 'naturaleza');
check('naturaleza: Avistamiento Ballenas', catDe('Avistamiento Ballenas \u00b7 Bah\u00eda Solano') === 'naturaleza');
check('naturaleza: Travesia Rio Magdalena', catDe('Traves\u00eda por el R\u00edo Magdalena 2026') === 'naturaleza');
check('festival: Carnaval', catDe('Carnaval de Barranquilla') === 'festival');
check('festival: default (Stray Kids)', catDe('Stray Kids: Stray City 2026 en Bogot\u00e1') === 'festival');

console.log('');
console.log('FAILS: ' + fails);
process.exit(fails ? 1 : 0);