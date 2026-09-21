// neon_select.js
// Ejecutador de consultas SQL READ-ONLY contra Neon para diagnosticos
// colaborativos (el orquestador dicta la consulta, el operador la corre y
// entrega el JSON). NUNCA escribe: solo acepta sentencias que empiecen por
// SELECT o WITH y no expone la DATABASE_URL en la salida.
//
// USO (PowerShell):
//   node scripts/neon_select.js -f consulta.sql            // SQL en archivo
//   $env:NEON_QUERY="SELECT 1 AS x"; node scripts/neon_select.js
//   node scripts/neon_select.js --fake                      // modo fake ([] )
//   $env:DATABASE_URL="postgresql://usuario:pass@host/bd"; node scripts/neon_select.js -f r.sql
//
// Sin DATABASE_URL ni @neondatabase/serverless corre en modo fake y termina 0
// (mismo patron que scripts/diagnose_video_mapa.js).
//
// ASCII-safe (ADR-002): cero bytes > 127, cero backticks, CommonJS estricto.
'use strict';

var fs = require('fs');

function j(v) { return JSON.stringify(v, null, 2); }

function urlValida(raw) {
  if (raw === undefined || raw === null || String(raw).trim() === '') return null;
  var s = String(raw).trim();
  if ((s.charAt(0) === '"' && s.charAt(s.length - 1) === '"') ||
      (s.charAt(0) === "'" && s.charAt(s.length - 1) === "'")) {
    s = s.slice(1, -1);
  }
  if (s.indexOf('...') !== -1) return null;
  if (!/^postgres(ql)?:\/\/[^\s@]+@[^\s/]+\/.+$/.test(s)) return null;
  return s;
}

function leerConsulta() {
  var f = null;
  for (var i = 2; i < process.argv.length; i++) {
    if (process.argv[i] === '-f' && i + 1 < process.argv.length) f = process.argv[i + 1];
  }
  if (f) {
    if (!fs.existsSync(f)) { console.error('FAIL - no existe el archivo: ' + f); process.exit(1); }
    return fs.readFileSync(f, 'utf8');
  }
  var q = process.env.NEON_QUERY;
  if (q && String(q).trim()) return String(q).trim();
  console.error('FAIL - no hay consulta. Pasa -f consulta.sql o $env:NEON_QUERY="SELECT ..."');
  process.exit(1);
}

function quitarEncabezadoComentario(sql) {
  var lineas = String(sql || '').split(/\r?\n/);
  var i = 0;
  while (i < lineas.length) {
    var l = lineas[i].trim();
    if (l !== '' && l.slice(0, 2) === '--') { i++; continue; }
    if (l === '') { i++; continue; }
    break;
  }
  return lineas.slice(i).join('\n');
}

function validarReadOnly(sql) {
  var s = quitarEncabezadoComentario(sql).replace(/^\s+/, '');
  var cabeza = s.slice(0, 6).toUpperCase();
  if (cabeza !== 'SELECT' && cabeza.slice(0, 4) !== 'WITH') {
    return 'Solo se permiten consultas de LECTURA (SELECT/WITH). No escribe en la BD.';
  }
  var compactado = quitarEncabezadoComentario(sql).replace(/^--[^\n]*/gm, '')
    .replace(/\s+/g, ' ').trim();
  if (/;/.test(compactado.slice(0, -1))) {
    return 'Solo se permite UNA sentencia (sin punto y coma multiple).';
  }
  return null;
}

function main() {
  var sql = leerConsulta();
  var err = validarReadOnly(sql);
  if (err) { console.error('FAIL - ' + err); process.exit(1); }

  require('./load_env_local')();
  var esFake = process.argv.indexOf('--fake') !== -1;
  var url = urlValida(process.env.DATABASE_URL);
  var neonReal = null;
  if (!esFake) {
    try { neonReal = require('@neondatabase/serverless').neon; }
    catch (e) { if (e && e.code !== 'MODULE_NOT_FOUND') neonReal = null; }
  }

  var reporte = {
    modo: 'fake',
    config: { read_only: true, regla: 'SELECT/WITH' },
    query: sql,
    columnas: [],
    filas: [],
    conteo: 0,
    error: null,
    generado_en: new Date().toISOString()
  };

  if (url && neonReal) {
    reporte.modo = 'real';
    var neon = neonReal(url);
    neon(sql, []).then(function (rows) {
      var r = Array.isArray(rows) ? rows : [];
      reporte.conteo = r.length;
      reporte.columnas = r.length ? Object.keys(r[0]) : [];
      reporte.filas = r;
      console.log(j(reporte));
      process.exit(0);
    }).catch(function (e) {
      reporte.error = String((e && e.message) ? e.message : e);
      reporte.sqlstate = (e && e.code) ? String(e.code) : null;
      console.log(j(reporte));
      process.exit(0);
    });
  } else {
    console.log('[INFO] Modo fake (sin DATABASE_URL valida o --fake): no se afirma el estado real.');
    console.log(j(reporte));
  }
}

main();