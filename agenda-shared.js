// agenda-shared.js  v1
// Utilidades compartidas de la Agenda Cultural para index.html y agenda.html.
// Normaliza cada evento a un RANGO [inicio, fin]:
//   - Eventos de la DB (categoria evento): tags.fecha_inicio / tags.fecha_fin
//     ('YYYY-MM-DD'). Fecha fin inclusive: el evento aparece en TODOS los dias
//     vigentes (requisito multidia).
//   - Eventos hardcodeados (AGENDA_EVENTS): day/month[/dayEnd/monthEnd] sin
//     anio (recurrentes anuales); se resuelven a su proxima ocurrencia.
// ASCII-safe: 0 bytes >127, 0 backticks.

(function () {
  'use strict';

  var MONTHS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  var DOW    = ['Dom','Lun','Mar','Mie','Jue','Vie','Sab'];

  function parseISO(s) {
    if (!s || typeof s !== 'string' || s.length < 10) return null;
    var y  = parseInt(s.slice(0,4), 10);
    var mo = parseInt(s.slice(5,7), 10) - 1;
    var d  = parseInt(s.slice(8,10), 10);
    if (isNaN(y) || isNaN(mo) || isNaN(d)) return null;
    return new Date(y, mo, d);
  }

  function normDates(e, ctxDate) {
    var anchor = ctxDate || new Date();
    var t = e.tags || {};
    if (t.fecha_inicio && typeof t.fecha_inicio === 'string' && t.fecha_inicio.length >= 10) {
      var start = parseISO(t.fecha_inicio);
      var end = (t.fecha_fin && typeof t.fecha_fin === 'string' && t.fecha_fin.length >= 10)
        ? parseISO(t.fecha_fin) : start;
      if (!start) start = new Date(anchor.getFullYear(), anchor.getMonth(), e.day || 1);
      if (!end) end = start;
      return { start: start, end: end, recurring: false };
    }
    if (e.day) {
      // Recurrente anual: la ocurrencia se resuelve en el ANIO de la fecha
      // consultada (si el rango cruza anio, el fin pasa al siguiente).
      var mi = MONTHS.indexOf(e.month);
      if (mi < 0) mi = anchor.getMonth();
      var sR = new Date(anchor.getFullYear(), mi, e.day);
      var eR = sR;
      if (e.dayEnd) {
        var miE = MONTHS.indexOf(e.monthEnd);
        if (miE < 0) miE = mi;
        var yE = sR.getFullYear();
        if (miE < mi) yE += 1;
        eR = new Date(yE, miE, e.dayEnd);
      }
      return { start: sR, end: eR, recurring: true };
    }
    return { start: anchor, end: anchor, recurring: false };
  }

  // Verdadero si el evento esta vigente en la fecha dada (inicio <= fecha <= fin)
  function evActiveOn(e, date) {
    var r = normDates(e, date);
    var t = +date;
    return (+r.start) <= t && t <= (+r.end);
  }

  // Meses (abreviatura) en los que el evento esta activo (puede cruzar meses)
  function evActiveMonths(e) {
    var r = normDates(e, new Date());
    var out = [];
    var cursor = new Date(r.start.getFullYear(), r.start.getMonth(), 1);
    var last   = new Date(r.end.getFullYear(),   r.end.getMonth(),   1);
    var guard = 0;
    while (cursor <= last && guard < 13) {
      out.push(MONTHS[cursor.getMonth()]);
      cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
      guard++;
    }
    return out;
  }

  function shortDate(d) {
    return d.getDate() + ' ' + MONTHS[d.getMonth()];
  }

  // Texto legible del rango: '12 sep', '12-13 sep', '28 ago - 6 sep'
  function evRangeText(e) {
    var r = normDates(e, new Date());
    var s = r.start, en = r.end;
    if ((+s) === (+en)) return shortDate(s);
    if (s.getFullYear() === en.getFullYear() && s.getMonth() === en.getMonth()) {
      return s.getDate() + '-' + shortDate(en);
    }
    if (s.getFullYear() === en.getFullYear()) {
      return shortDate(s) + ' - ' + shortDate(en);
    }
    return shortDate(s) + ' ' + s.getFullYear() + ' - ' + shortDate(en) + ' ' + en.getFullYear();
  }

  // Quita acentos para match de categorias (robusto a tildes en nombres)
  function fold(s) {
    var out = '';
    s = String(s || '').toLowerCase();
    for (var i = 0; i < s.length; i++) {
      var c = s.charCodeAt(i);
      if (c === 0xe1) { out += 'a'; }
      else if (c === 0xe9) { out += 'e'; }
      else if (c === 0xed) { out += 'i'; }
      else if (c === 0xf3) { out += 'o'; }
      else if (c === 0xfa) { out += 'u'; }
      else if (c === 0xf1) { out += 'n'; }
      else { out += s.charAt(i); }
    }
    return out;
  }

  var CATS = ['festival','musica','gastro','naturaleza','cultura'];

  // Detecta la categoria de agenda por nombre (y tag futuro tipo_evento).
  // Orden por prioridad: musica -> cultura -> gastro -> naturaleza -> festival.
  function detectEventCat(name, tags) {
    var tipo = tags && tags.tipo_evento ? fold(tags.tipo_evento) : '';
    if (tipo && CATS.indexOf(tipo) !== -1) return tipo;
    var n = fold(name);
    if (/concierto|musica|jazz|salsa|vallenato|rock|sinfonico|tributo|live show|tour|orquesta|banda|musical|acustico|electronica/.test(n)) return 'musica';
    if (/exposicion|patrimonio|feria del libro|muestra|encuentro|bienestar|arte urbano|teatro|danza|summit|congreso|seminario/.test(n)) return 'cultura';
    if (/gastronom|cafe|cafetero|mercado|sabor|comida|postres/.test(n)) return 'gastro';
    if (/trek|avistamiento|sendero|rio|cano|ciudad perdida|travesia|ballenas|colores/.test(n)) return 'naturaleza';
    return 'festival';
  }

  window.AgendaUtil = {
    MONTHS: MONTHS,
    DOW: DOW,
    CATS: CATS,
    parseISO: parseISO,
    normDates: normDates,
    evActiveOn: evActiveOn,
    evActiveMonths: evActiveMonths,
    evRangeText: evRangeText,
    fold: fold,
    detectEventCat: detectEventCat
  };
})();