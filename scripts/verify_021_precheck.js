// verify_021_precheck.js
// Pre-chequeo READ-ONLY para la migracion 021 (XP decimal numeric(12,2)).
// NO modifica nada: solo SELECT sobre information_schema y agregados
// MIN/MAX/COUNT por columna. Usa @neondatabase/serverless (nunca pg).
//
// Uso (PowerShell):
//   $env:DATABASE_URL="postgresql://..."; node scripts/verify_021_precheck.js
//
// Falla con exit code != 0 si una columna obligatoria no existe.
// interacciones.xp_ganado es OPCIONAL (columna no versionada, patron BUG-021).
//
// ASCII-safe (0 bytes > 127), sin backticks, CommonJS estricto.
'use strict';

var neon = require('@neondatabase/serverless').neon;

// Las 9 columnas objetivo de la 021. obligatoria=false solo para la no
// versionada. default_esperado es informativo (la 021 re-fija el default).
var COLUMNAS = [
  { tabla: 'usuarios',           columna: 'xp_total',          obligatoria: true,  default_esperado: '0' },
  { tabla: 'usuarios',           columna: 'xp_ref_total',      obligatoria: true,  default_esperado: '0' },
  { tabla: 'interacciones',      columna: 'xp_ganado',         obligatoria: false, default_esperado: '(sin default)' },
  { tabla: 'album_votos',        columna: 'xp_ganado',         obligatoria: true,  default_esperado: '5' },
  { tabla: 'album_fotos',        columna: 'xp_otorgado_autor', obligatoria: true,  default_esperado: '0' },
  { tabla: 'compra_consumibles', columna: 'xp_pagado',         obligatoria: true,  default_esperado: '(sin default)' },
  { tabla: 'pandilla_retos',     columna: 'xp_bono',           obligatoria: true,  default_esperado: '0' },
  { tabla: 'consumibles',        columna: 'precio_xp',         obligatoria: true,  default_esperado: '0' },
  { tabla: 'pandillas',          columna: 'fama_total',        obligatoria: true,  default_esperado: '0' }
];

function j(v) { return JSON.stringify(v); }

// Valida la cadena sin exponer el secreto. Devuelve null si no es usable.
function urlValida(raw) {
  var s = (raw === undefined || raw === null) ? '' : String(raw).trim();
  if (s.length > 1 && (s.charAt(0) === '"' || s.charAt(0) === "'") && s.charAt(s.length - 1) === s.charAt(0)) {
    s = s.slice(1, -1);
  }
  if (s.indexOf('...') !== -1) return null;
  if (!/^postgres(ql)?:\/\/[^\s@]+@[^\s/]+\/.+$/.test(s)) return null;
  return s;
}

function fmtDef(def) {
  return (def === null || def === undefined || String(def).trim() === '') ? '(sin default)' : String(def).trim();
}

function esNumeric12_2(m) {
  return m.data_type === 'numeric' && String(m.prec) === '12' && String(m.scale) === '2';
}

function idt(name) { return '"' + name + '"'; }

async function main() {
  var url = urlValida(process.env.DATABASE_URL);
  if (!url) {
    console.error('FAIL - DATABASE_URL ausente o invalida en el entorno.');
    console.error('       Uso: $env:DATABASE_URL="postgresql://..."; node scripts/verify_021_precheck.js');
    process.exit(1);
  }
  var sql = neon(url);

  console.log('=== PRECHECK 021 (XP decimal numeric(12,2)) - READ-ONLY ===\n');

  var filtro =
    "WHERE table_schema='public' AND (table_name, column_name) IN (" +
    "('usuarios','xp_total'), ('usuarios','xp_ref_total'), " +
    "('interacciones','xp_ganado'), ('album_votos','xp_ganado'), " +
    "('album_fotos','xp_otorgado_autor'), ('compra_consumibles','xp_pagado'), " +
    "('pandilla_retos','xp_bono'), ('consumibles','precio_xp'), " +
    "('pandillas','fama_total'))";

  var meta = await sql(
    "SELECT table_name, column_name, data_type, is_nullable, " +
    "COALESCE(column_default,'') AS def, " +
    "COALESCE(numeric_precision::text,'') AS prec, " +
    "COALESCE(numeric_scale::text,'') AS scale " +
    "FROM information_schema.columns " + filtro + " " +
    "ORDER BY table_name, column_name");

  var mapa = {};
  meta.forEach(function (c) { mapa[c.table_name + '.' + c.column_name] = c; });

  console.log('[1] Existencia y data_type actual (9 columnas objetivo):');
  var faltantes = [];
  var convertidas = 0;
  COLUMNAS.forEach(function (c) {
    var k = c.tabla + '.' + c.columna;
    var m = mapa[k];
    var marca;
    if (!m) {
      marca = c.obligatoria ? 'FALTA (obligatoria)' : 'ausente (opcional)';
      if (c.obligatoria) faltantes.push(k);
    } else if (esNumeric12_2(m)) {
      marca = 'numeric(12,2) OK';
      convertidas += 1;
    } else {
      marca = 'entero pendiente de convertir (default esperado=' + c.default_esperado + ')';
    }
    var tipo = m ? m.data_type : '(NO EXISTE)';
    var nullable = m ? m.is_nullable : '-';
    var def = m ? fmtDef(m.def) : '-';
    var ps = m ? (m.prec + '/' + m.scale) : '-';
    console.log('    ' + k.padEnd(36) + ' | ' + tipo.padEnd(9) + ' | nullable=' + nullable.padEnd(3) + ' | def=' + def.padEnd(14) + ' | prec/scale=' + ps.padEnd(6) + ' | ' + marca);
  });
  var obligatoriasPresentes = COLUMNAS.filter(function (c) {
    return c.obligatoria && mapa[c.tabla + '.' + c.columna];
  }).length;
  console.log('    Obligatorias presentes: ' + obligatoriasPresentes + '/8 (interacciones.xp_ganado es opcional)');
  console.log('    Convertidas a numeric(12,2): ' + convertidas + '/9');

  console.log('\n[2] Evidencia de datos por columna (no nulas / min / max):');
  for (var i = 0; i < COLUMNAS.length; i++) {
    var c = COLUMNAS[i];
    var k = c.tabla + '.' + c.columna;
    if (!mapa[k]) {
      console.log('    ' + k.padEnd(36) + ' | (columna ausente, se omite el conteo)');
      continue;
    }
    var q = 'SELECT COUNT(*)::int AS total, COUNT(' + idt(c.columna) + ')::int AS no_null, ' +
      'MIN(' + idt(c.columna) + ') AS min_xp, MAX(' + idt(c.columna) + ') AS max_xp ' +
      'FROM ' + idt(c.tabla);
    var s = (await sql(q))[0];
    console.log('    ' + k.padEnd(36) + ' | total=' + s.total + ' | no_null=' + s.no_null +
      ' | min=' + j(s.min_xp) + ' | max=' + j(s.max_xp));
  }

  console.log('\n[3] Veredicto:');
  if (faltantes.length) {
    console.error('    FAIL - columnas obligatorias ausentes: ' + faltantes.join(', '));
    console.error('    Revisa que 009, 010 y 016 esten aplicadas antes de correr la 021.');
    process.exit(1);
  }
  if (convertidas === 9) {
    console.log('    021 YA APLICADA: las 9 columnas son numeric(12,2). Re-ejecutar es no-op.');
  } else {
    console.log('    021 PENDIENTE: ' + convertidas + '/9 columnas ya son numeric(12,2).');
    if (!mapa['interacciones.xp_ganado']) {
      console.log('    Nota: interacciones.xp_ganado no existe; la 021 la cubre de forma defensiva.');
    }
  }

  console.log('\n=== FIN PRECHECK ===');
}

main().catch(function (e) {
  console.error('FAIL - ' + (e && e.message ? e.message : e));
  process.exit(1);
});
