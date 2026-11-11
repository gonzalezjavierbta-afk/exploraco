// auditoria_ledger_historico.js
// Auditoria D-32: mapa de riesgo del hueco del ledger. Las 41 migraciones
// 003-043 estan en schema_migrations con resultado='historico_no_verificado'
// (nunca se confirmo que sus objetos existan en la base viva). Este script
// extrae los objetos declarados en esos .sql, comprueba si EXISTEN en Neon y
// cruza cada objeto con las referencias en el codigo.
//
// SOLO LECTURA: no escribe en la BD, no aplica migraciones, no genera SQL.
// ASCII-safe (ADR-002): cero bytes > 127, cero backticks.
//
// USO (PowerShell):
//   node scripts/auditoria_ledger_historico.js
//   node scripts/auditoria_ledger_historico.js --json
//   node scripts/auditoria_ledger_historico.js --json --out audit.json
//
// Sin DATABASE_URL valida: modo parseo (existe='n/d', riesgo='N/D'), exit 0.
'use strict';

var fs = require('fs');
var path = require('path');

var RAIZ = path.resolve(__dirname, '..');
var DIR_MIG = path.join(RAIZ, 'db', 'migrations');
var ORDEN_RIESGO = { 'ALTO': 0, 'MEDIO': 1, 'N/D': 2, 'BAJO': 3, 'IGNORADO': 4 };

function j(v) { return JSON.stringify(v, null, 2); }

function args() {
  var a = process.argv.slice(2);
  return {
    json: a.indexOf('--json') !== -1,
    out: (function () {
      var i = a.indexOf('--out');
      return (i !== -1 && a[i + 1]) ? a[i + 1] : null;
    })(),
    top: (function () {
      var i = a.indexOf('--top');
      var n = (i !== -1 && a[i + 1]) ? parseInt(a[i + 1], 10) : 10;
      return (isNaN(n) || n < 1) ? 10 : n;
    })()
  };
}

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

// ---------------------------------------------------------------- DB (read-only)

function conectar() {
  try { require('./load_env_local')(); } catch (e) { /* sin env local */ }
  var url = urlValida(process.env.DATABASE_URL);
  var neonReal = null;
  try { neonReal = require('@neondatabase/serverless').neon; }
  catch (e) { neonReal = null; }
  if (!url || !neonReal) return null;
  var sql = neonReal(url);
  return {
    consultar: function (texto) {
      return Promise.resolve(sql(texto, [])).then(function (r) {
        return Array.isArray(r) ? r : [];
      });
    }
  };
}

// ---------------------------------------------------------------- parseo .sql

function limpiarComentarios(txt) {
  // Quita comentarios de linea (-- ...) para no contar ejemplos documentales.
  return String(txt || '').split(/\r?\n/).map(function (l) {
    var i = l.indexOf('--');
    return (i === -1) ? l : l.slice(0, i);
  }).join('\n');
}

function sinComillas(id) {
  return String(id || '').replace(/"/g, '').toLowerCase();
}

function extraerObjetos(sqlBruto) {
  var txt = limpiarComentarios(sqlBruto);
  var tablas = [];
  var columnas = [];
  var indices = [];
  var m;

  var reTabla = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?("?[A-Za-z_][A-Za-z0-9_]*"?)/gi;
  while ((m = reTabla.exec(txt)) !== null) tablas.push(sinComillas(m[1]));

  // ALTER TABLE <t> ... ADD COLUMN <c>  (cubre cuerpo multi-accion y EXECUTE '...')
  var reCol = /ALTER\s+TABLE\s+(?:IF\s+EXISTS\s+)?(?:ONLY\s+)?(?:public\.)?("?[A-Za-z_][A-Za-z0-9_]*"?)([^;]{0,3000}?)(?=;|$)/gi;
  while ((m = reCol.exec(txt)) !== null) {
    var tabla = sinComillas(m[1]);
    var cuerpo = m[2];
    var rc = /ADD\s+COLUMN\s+(?:IF\s+NOT\s+EXISTS\s+)?("?[A-Za-z_][A-Za-z0-9_]*"?)/gi;
    var mc;
    while ((mc = rc.exec(cuerpo)) !== null) {
      columnas.push({ tabla: tabla, columna: sinComillas(mc[1]) });
    }
  }

  var reIdx = /CREATE\s+(?:UNIQUE\s+)?INDEX\s+(?:CONCURRENTLY\s+)?(?:IF\s+NOT\s+EXISTS\s+)?("?[A-Za-z_][A-Za-z0-9_]*"?)\s+ON\s+(?:ONLY\s+)?(?:public\.)?("?[A-Za-z_][A-Za-z0-9_]*"?)/gi;
  while ((m = reIdx.exec(txt)) !== null) {
    indices.push({ indice: sinComillas(m[1]), tabla: sinComillas(m[2]) });
  }

  function dedupe(arr) {
    var vistos = {};
    var out = [];
    arr.forEach(function (x) {
      var k = (typeof x === 'string') ? x : (x.tabla + '|' + (x.columna || x.indice));
      if (vistos[k]) return;
      vistos[k] = 1;
      out.push(x);
    });
    return out;
  }

  return {
    tablas: dedupe(tablas),
    columnas: dedupe(columnas),
    indices: dedupe(indices),
    objetos: tablas.length + columnas.length + indices.length
  };
}

// ---------------------------------------------------------------- referencias

var EXCLUIR = { 'auditoria_ledger_historico.js': 1 };

function archivosCodigo() {
  var lista = [];
  function addDir(rel, filtro) {
    var abs = path.join(RAIZ, rel);
    if (!fs.existsSync(abs)) return;
    fs.readdirSync(abs).forEach(function (f) {
      if (!filtro(f)) return;
      if (EXCLUIR[f]) return;
      lista.push(rel.replace(/\\/g, '/') + '/' + f);
    });
  }
  addDir('api', function (f) { return /\.js$/.test(f); });
  addDir('lib', function (f) { return /\.js$/.test(f); });
  addDir('scripts', function (f) { return /\.js$/.test(f); });
  ['cartas-ui.js', 'admin.html', 'mi-perfil.html', 'comunidad.html', 'perfil.html'].forEach(function (f) {
    if (fs.existsSync(path.join(RAIZ, f))) lista.push(f);
  });
  return lista;
}

function esCritico(rel) {
  return /^api\//.test(rel) || /^lib\//.test(rel);
}

// Un solo pase por archivo: tokeniza identificadores y cuenta los de interes.
function indexarReferencias(nombres) {
  var interes = Object.create(null);
  nombres.forEach(function (n) { interes[n] = 1; });
  var refs = Object.create(null);       // nombre -> { total, critico, detalle[] }
  nombres.forEach(function (n) { refs[n] = { total: 0, critico: 0, detalle: [] }; });

  archivosCodigo().forEach(function (rel) {
    var abs = path.join(RAIZ, rel);
    var txt;
    try { txt = fs.readFileSync(abs, 'utf8'); } catch (e) { return; }
    var lineas = txt.split(/\r?\n/);
    var criticos = esCritico(rel);
    var local = {};
    for (var ln = 0; ln < lineas.length; ln++) {
      var linea = lineas[ln];
      if (!linea) continue;
      var re = /[A-Za-z_][A-Za-z0-9_]*/g;
      var m;
      while ((m = re.exec(linea)) !== null) {
        var tok = m[0];
        if (!interes[tok]) continue;
        var f = local[tok];
        if (!f) { f = local[tok] = { n: 0, linea: ln + 1 }; }
        f.n++;
        var r = refs[tok];
        r.total++;
        if (criticos) r.critico++;
        if (r.detalle.length < 3) {
          var et = rel + ':' + (ln + 1);
          if (r.detalle.indexOf(et) === -1) r.detalle.push(et);
        }
      }
    }
  });
  return refs;
}

// ---------------------------------------------------------------- main

function principal() {
  var opt = args();
  var salida = {
    auditoria: 'D-32 ledger historico',
    generado_en: new Date().toISOString(),
    modo: 'parseo',
    motivo_modo: null,
    ledger: { historico: 0, aplicada: 0, total: 0 },
    migraciones: { parseadas: 0, no_parseado: 0, sin_archivo: 0, objetos: 0 },
    conteo: {},
    top_alto: [],
    filas: [],
    no_parseado: [],
    sin_archivo: []
  };

  var db = conectar();
  salida.modo = db ? 'real' : 'parseo';
  if (!db) salida.motivo_modo = 'DATABASE_URL ausente/invalida o @neondatabase/serverless no instalado: solo parseo.';

  var dbTablas = {};
  var dbColumnas = {};
  var dbIndices = {};
  var filasLedger = [];

  var preparar = db
    ? db.consultar("SELECT numero, nombre, resultado FROM schema_migrations ORDER BY numero").then(function (rows) {
        filasLedger = rows;
        return Promise.all([
          db.consultar("SELECT tablename AS n FROM pg_tables WHERE schemaname = 'public'"),
          db.consultar("SELECT table_name AS t, column_name AS c FROM information_schema.columns WHERE table_schema = 'public'"),
          db.consultar("SELECT indexname AS i FROM pg_indexes WHERE schemaname = 'public'")
        ]);
      }).then(function (r) {
        (r[0] || []).forEach(function (x) { dbTablas[sinComillas(x.n)] = 1; });
        (r[1] || []).forEach(function (x) { dbColumnas[sinComillas(x.t) + '|' + sinComillas(x.c)] = 1; });
        (r[2] || []).forEach(function (x) { dbIndices[sinComillas(x.i)] = 1; });
      }).catch(function (e) {
        salida.modo = 'parseo';
        salida.motivo_modo = 'ERROR de lectura en Neon: ' + String((e && e.message) ? e.message : e);
      })
    : Promise.resolve();

  preparar.then(function () {
    if (!filasLedger.length && salida.modo === 'real') {
      salida.motivo_modo = 'schema_migrations devolvio 0 filas.';
    }
    filasLedger.forEach(function (f) {
      salida.ledger.total++;
      if (String(f.resultado) === 'historico_no_verificado') salida.ledger.historico++;
      if (String(f.resultado) === 'aplicada') salida.ledger.aplicada++;
    });

    var historicos = filasLedger.filter(function (f) {
      return String(f.resultado) === 'historico_no_verificado';
    });

    var objetos = [];   // { numero, migracion, tipo, objeto, extra }
    historicos.forEach(function (f) {
      var num = parseInt(f.numero, 10);
      var archivo = String(f.nombre || '');
      var abs = path.join(DIR_MIG, archivo);
      if (!archivo || !fs.existsSync(abs)) {
        salida.migraciones.sin_archivo++;
        salida.sin_archivo.push({ numero: num, nombre: archivo });
        return;
      }
      var txt;
      try { txt = fs.readFileSync(abs, 'utf8'); } catch (e) {
        salida.migraciones.no_parseado++;
        salida.no_parseado.push({ numero: num, nombre: archivo, causa: 'lectura: ' + String(e && e.message) });
        return;
      }
      var o;
      try { o = extraerObjetos(txt); } catch (e) {
        salida.migraciones.no_parseado++;
        salida.no_parseado.push({ numero: num, nombre: archivo, causa: 'parseo: ' + String(e && e.message) });
        return;
      }
      if (o.objetos === 0) {
        salida.migraciones.no_parseado++;
        salida.no_parseado.push({ numero: num, nombre: archivo, causa: 'sin objetos CREATE/ALTER reconocibles' });
        return;
      }
      salida.migraciones.parseadas++;
      salida.migraciones.objetos += o.objetos;
      o.tablas.forEach(function (t) {
        objetos.push({ numero: num, migracion: archivo, tipo: 'TABLA', objeto: t });
      });
      o.columnas.forEach(function (c) {
        objetos.push({ numero: num, migracion: archivo, tipo: 'COLUMNA', objeto: c.tabla + '.' + c.columna, tabla: c.tabla });
      });
      o.indices.forEach(function (i) {
        objetos.push({ numero: num, migracion: archivo, tipo: 'INDICE', objeto: i.indice, tabla: i.tabla });
      });
    });

    // Nombres a buscar: identificador del objeto y, en columnas, tambien la columna.
    var nombres = {};
    objetos.forEach(function (o) {
      nombres[o.tipo === 'COLUMNA' ? o.objeto.split('.')[1] : o.objeto] = 1;
      if (o.tabla) nombres[o.tabla] = 1;
    });
    var refs = indexarReferencias(Object.keys(nombres));

    var conteo = { 'ALTO': 0, 'MEDIO': 0, 'BAJO': 0, 'IGNORADO': 0, 'N/D': 0 };
    var filas = objetos.map(function (o) {
      var clave = (o.tipo === 'COLUMNA') ? o.objeto.split('.')[1] : o.objeto;
      var r = refs[clave] || { total: 0, critico: 0, detalle: [] };
      var existe;
      if (!db) existe = 'n/d';
      else if (o.tipo === 'TABLA') existe = dbTablas[sinComillas(o.objeto)] ? 'SI' : 'NO';
      else if (o.tipo === 'COLUMNA') existe = dbColumnas[sinComillas(o.objeto.split('.')[0]) + '|' + sinComillas(o.objeto.split('.')[1])] ? 'SI' : 'NO';
      else existe = dbIndices[sinComillas(o.objeto)] ? 'SI' : 'NO';

      var riesgo;
      if (existe === 'n/d') riesgo = 'N/D';
      else if (existe === 'SI') riesgo = 'BAJO';
      else if (r.critico > 0) riesgo = 'ALTO';
      else if (r.total > 0) riesgo = 'MEDIO';
      else riesgo = 'IGNORADO';

      conteo[riesgo]++;
      return {
        numero: o.numero,
        migracion: o.migracion,
        tipo: o.tipo,
        objeto: o.objeto,
        existe: existe,
        refs: r.total,
        refs_criticas: r.critico,
        ref_detalle: r.detalle,
        riesgo: riesgo
      };
    });

    filas.sort(function (a, b) {
      var d = ORDEN_RIESGO[a.riesgo] - ORDEN_RIESGO[b.riesgo];
      if (d !== 0) return d;
      if (a.numero !== b.numero) return a.numero - b.numero;
      if (a.tipo !== b.tipo) return a.tipo < b.tipo ? -1 : 1;
      return a.objeto < b.objeto ? -1 : 1;
    });

    salida.conteo = conteo;
    salida.filas = filas;
    salida.top_alto = filas.filter(function (f) { return f.riesgo === 'ALTO'; }).slice(0, opt.top);

    if (opt.json) {
      var txt = j(salida);
      console.log(txt);
      if (opt.out) {
        try { fs.writeFileSync(path.resolve(RAIZ, opt.out), txt + '\n', 'utf8'); } catch (e) { /* noop */ }
      }
      process.exit(0);
    }

    // ---- salida tabular
    console.log('=== AUDITORIA D-32: LEDGER HISTORICO (solo lectura) ===');
    console.log('modo: ' + salida.modo + (salida.motivo_modo ? (' | ' + salida.motivo_modo) : ''));
    console.log('ledger: ' + salida.ledger.total + ' filas | historico_no_verificado: ' + salida.ledger.historico + ' | aplicada: ' + salida.ledger.aplicada);
    console.log('parseo: ' + salida.migraciones.parseadas + ' migraciones leidas | no_parseado: ' +
      salida.migraciones.no_parseado + ' | sin_archivo: ' + salida.migraciones.sin_archivo +
      ' | objetos: ' + salida.migraciones.objetos);
    console.log('');

    function pad(s, n) { s = String(s); return (s.length >= n) ? (s + ' ') : (s + new Array(n - s.length + 1).join(' ')); }
    console.log(pad('RIESGO', 9) + pad('NUM', 5) + pad('EXISTE', 7) + pad('REFS', 5) + pad('TIPO', 9) + pad('OBJETO', 34) + 'MIGRACION');
    console.log(new Array(100).join('-'));
    filas.forEach(function (f) {
      console.log(pad(f.riesgo, 8) + pad(f.numero, 5) + pad(f.existe, 7) + pad(f.refs, 5) +
        pad(f.tipo, 9) + pad(f.objeto, 34) + f.migracion);
    });

    console.log('');
    console.log('--- RESUMEN POR RIESGO ---');
    ['ALTO', 'MEDIO', 'BAJO', 'IGNORADO', 'N/D'].forEach(function (k) {
      console.log(pad(k, 9) + conteo[k]);
    });

    if (salida.top_alto.length) {
      console.log('');
      console.log('--- TOP ' + salida.top_alto.length + ' ALTO (objeto ausente y referenciado en api/ o lib/) ---');
      salida.top_alto.forEach(function (f, i) {
        console.log((i + 1) + '. [' + f.numero + '] ' + f.tipo + ' ' + f.objeto +
          ' <- ' + (f.ref_detalle[0] || 'sin ref') + ' (refs: ' + f.refs + ', criticas: ' + f.refs_criticas + ')');
      });
    } else {
      console.log('');
      console.log('--- 0 ALTO: ningun objeto ausente tiene referencia en api/ o lib/ ---');
    }

    var ausentes = filas.filter(function (f) { return f.existe === 'NO'; });
    if (ausentes.length) {
      console.log('');
      console.log('--- AUSENTES EN LA BASE VIVA (' + ausentes.length + ', cualquier riesgo) ---');
      ausentes.forEach(function (f) {
        console.log('[' + f.numero + '] ' + f.tipo + ' ' + f.objeto + ' | refs: ' + f.refs +
          ' (criticas: ' + f.refs_criticas + ') | ' + (f.ref_detalle.join(', ') || 'sin refs'));
      });
    }

    if (salida.no_parseado.length) {
      console.log('');
      console.log('--- NO PARSEADO ---');
      salida.no_parseado.forEach(function (x) {
        console.log('[' + x.numero + '] ' + x.nombre + ' :: ' + x.causa);
      });
    }
    process.exit(0);
  }).catch(function (e) {
    console.error('FAIL - ' + String((e && e.message) ? e.message : e));
    if (e && e.stack) console.error(String(e.stack));
    process.exit(1);
  });
}

principal();
