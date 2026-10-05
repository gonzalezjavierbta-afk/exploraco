// ============================================================================
// 004_backfill_planes_viaje_fecha_inicio.js
// Backfill de planes_viaje.fecha_inicio (date) a partir del texto libre
// planes_viaje.fechas (text, max 60, escrito por el usuario).
//
// ORIGEN DE LA TAREA
//   db/migrations/044_planes_viaje_fecha_inicio.sql creo la columna y el indice
//   parcial. ESA migracion dice explicitamente (lineas 67-84) que el backfill NO
//   va en el .sql y que va aqui, en db/cleanups/, a cargo de @data-migration,
//   con conteo de filas afectadas antes y despues y validacion de una muestra.
//   Este fichero es ese script.
//
// REQUISITO DURO (verificacion 0, ver MAS ABAJO)
//   La migracion 044 TIENE QUE ESTAR APLICADA en Neon antes de correr esto.
//   Si planes_viaje.fecha_inicio no existe, este script ABORTA con exit 1 y NO
//   escribe nada. No se puede hacer backfill de una columna inexistente.
//
// MODO POR DEFECTO: --dry (NO escribe). Hay que pasar --apply a escribir.
//
// USO (PowerShell)
//   node db/cleanups/004_backfill_planes_viaje_fecha_inicio.js
//   node db/cleanups/004_backfill_planes_viaje_fecha_inicio.js --apply
//   node db/cleanups/004_backfill_planes_viaje_fecha_inicio.js --apply --ddmm-aaaa
//   node db/cleanups/004_backfill_planes_viaje_fecha_inicio.js --json
//
// BANDERAS
//   --dry        (default) Solo lee y reporta. Cero escrituras.
//   --apply      Escribe fecha_inicio SOLO en las filas parseadas.
//   --ddmm-aaaa  Acepta el formato DD-MM-AAAA / DD/MM/AAAA / DD.MM.AAAA.
//                OFF por defecto. Ver "POR QUE DD-MM-AAAA ESTA APAGADO".
//   --json       Salida en JSON para evidencia.
//   --max N      Tope de filas a escribir. Default 500. Si el volumen real a
//                actualizar supera el tope, ABORTA y pide revision manual
//                (nunca un UPDATE masivo a ciegas).
//
// POLITICA DE NULL (ADR-085 D1) - NO RELIQUIETAR
//   fecha_inicio IS NULL SE MUESTRA. El filtro del backend sera:
//     activo = true AND (fecha_inicio IS NULL OR fecha_inicio >= CURRENT_DATE)
//   Consecuencia para este script: una fecha mal derivada puede OCULTAR un plan
//   vigente de golpe, y eso es perdida de funcionalidad que el usuario no puede
//   revertir. Un NULL, en cambio, no cuesta nada: el plan se sigue viendo.
//   POR ESO, ante cualquier duda, la respuesta es NULL y no una fecha.
//   Ningun UPDATE de este fichero escribe cuando la duda es:
//
// REGLAS DE PARSEO (conservadoras y auditables)
//   R0  Si fechas es NULL, vacio o solo espacios -> NULL, motivo "vacio".
//   R1  Prioridad ABSOLUTA: formato ISO AAAA-MM-DD (y separadores / y .).
//       Se acepta 1 o 2 digitos en mes y dia para ser tolerante.
//   R2  Si NO hay ninguna fecha ISO:
//       2a  con --ddmm-aaaa se intenta DD-MM-AAAA (ver la nota de abajo);
//       2b  sin --ddmm-aaaa -> NULL, motivo "sin_fecha_iso".
//   R3  Con VARIAS fechas ISO coherentes se coge LA PRIMERA (es el inicio).
//   R4  Con MAS DE DOS fechas ISO -> NULL, motivo "incoherente_3_mas".
//   R5  Si la segunda fecha ISO es ANTERIOR a la primera -> NULL, motivo
//       "incoherente_segunda_anterior" (segunda claramente corrupta).
//   R6  Fecha que no existe en el calendario (mes 13, 31 de febrero, ano fuera
//       de rango) -> NULL, motivo "fecha_invalida".
//   R7  Texto sin ano, del estilo "del 15 al 20 de marzo": NO se parsea. No se
//       adivina el ano. Adivinar un ano es PEOR que dejar NULL, porque un ano
//       inventado puede caer en el pasado y ocultar el plan. -> NULL, motivo
//       "sin_fecha_iso". Esta regla es intencional, no un hueco.
//
// POR QUE DD-MM-AAAA ESTA APAGADO POR DEFECTO
//   El unico registro real de planes_viaje en Neon al medir esto (2026-10-05)
//   trae fechas = "12-09-2026", que NO es ISO. Ese texto admite DOS lecturas:
//     DD-MM-AAAA -> 2026-09-12  (ya paso: con el filtro del backend, el plan
//                                DEJARIA DE verse)
//     MM-DD-AAAA -> 2026-12-09  (futuro: el plan se sigue viendo)
//   Las dos lecturas cambian la visibilidad del plan y no hay forma de decidir
//   con certeza solo desde el texto. Indicios contextuales (creado_en
//   2026-09-08, destino "Tour de salsa centro de Bogota") apuntan a DD-MM-AAAA,
//   pero indicio no es certeza. Por eso el parseo DD-MM-AAAA exige que el
//   operador lo pida explicitamente con --ddmm-aaaa, y mientras tanto la fila
//   se queda en NULL y se sigue mostrando. Activalo solo si confirmas que el
//   sitio escribe las fechas en DD-MM-AAAA.
//
// IDEMPOTENCIA
//   Doble barrera:
//     1. El SELECT de candidatos ya filtra WHERE fecha_inicio IS NULL, asi que
//        en la segunda corrida no hay ni una fila candidata.
//     2. Cada UPDATE lleva WHERE id = $1 AND fecha_inicio IS NULL, asi que
//        aunque la fila reapareciera, la segunda corrida no la sobreescribe.
//   Re-ejecutar el script completo es un no-op: 0 filas afectadas.
//
// SEGURIDAD DE VOLUMEN
//   Si las filas parseables superan --max, el script ABORTA antes de escribir.
//   Con eso y con el modo --dry por default no existe forma de hacer un UPDATE
//   masivo a ciegas desde este fichero.
//
// ASCII-SAFE (ADR-002): cero bytes > 127, cero emojis, cero backticks.
// CommonJS estricto, var, sin dependencias fuera de @neondatabase/serverless.
// Nunca imprime DATABASE_URL.
// ============================================================================
'use strict';

var neonReal = null;
try { neonReal = require('@neondatabase/serverless').neon; }
catch (e) { neonReal = null; }

require('../../scripts/load_env_local')();

var TABLA = 'planes_viaje';

// ---------------------------------------------------------------- utilidades

function asciiSeguro(s) {
  return String(s).replace(/[^\x20-\x7E\n\t]/g, '?');
}

function arg(nombre) {
  return process.argv.indexOf(nombre) !== -1;
}

function argValor(prefijo) {
  for (var i = 2; i < process.argv.length; i++) {
    var a = process.argv[i];
    if (a.indexOf(prefijo) === 0 && a.length > prefijo.length) return a.slice(prefijo.length);
  }
  return null;
}

function diagnosticoUrl(raw) {
  if (raw === undefined || raw === null || String(raw).trim() === '') {
    console.error('BLOQUEADOR - DATABASE_URL vacia o ausente.');
    console.error('  Cargar .env.local (gitignored) o exportar $env:DATABASE_URL.');
    return null;
  }
  var s = String(raw).trim();
  if ((s.charAt(0) === '"' && s.charAt(s.length - 1) === '"') ||
      (s.charAt(0) === "'" && s.charAt(s.length - 1) === "'")) {
    s = s.slice(1, s.length - 1);
  }
  if (s.indexOf('postgresql://') !== 0 && s.indexOf('postgres://') !== 0) {
    console.error('BLOQUEADOR - DATABASE_URL no empieza por postgresql:// ni postgres://');
    return null;
  }
  if (s.indexOf('...') !== -1 || /\s/.test(s)) {
    console.error('BLOQUEADOR - DATABASE_URL contiene placeholder "..." o espacios.');
    return null;
  }
  return s;
}

// ------------------------------------------------------- parseo de las fechas

function diasDelMes(anio, mes) {
  if (mes === 2) {
    var bisiesto = (anio % 4 === 0) && ((anio % 100 !== 0) || (anio % 400 === 0));
    return bisiesto ? 29 : 28;
  }
  var tabla = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return tabla[mes - 1];
}

// Devuelve la fecha en formato AAAA-MM-DD, o null si no existe en el calendario.
function fechaReal(anio, mes, dia) {
  if (!(anio >= 1900 && anio <= 2100)) return null;  // R6
  if (!(mes >= 1 && mes <= 12)) return null;        // R6
  if (!(dia >= 1 && dia <= diasDelMes(anio, mes))) return null;  // R6
  var m = mes < 10 ? '0' + mes : String(mes);
  var d = dia < 10 ? '0' + dia : String(dia);
  return anio + '-' + m + '-' + d;
}

function isoDe(a, m, d) { return fechaReal(a, m, d); }

// Extrae candidatos de un texto. Se hace con exec en bucle y COMPROBANDO LOS
// BORDES a mano en vez de usar lookbehind: asi no depende de la version de Node
// y no hay falsos positivos del tipo "12026-03-15".
function candidatos(texto, re) {
  var out = [];
  var m;
  re.lastIndex = 0;
  while ((m = re.exec(texto)) !== null) {
    if (m[0].length === 0) { re.lastIndex++; continue; }
    var antes = m.index > 0 ? texto.charAt(m.index - 1) : '';
    var despues = texto.charAt(m.index + m[0].length);
    var bordeOk = !/\d/.test(antes) && !/\d/.test(despues);
    if (bordeOk) {
      out.push({ a: parseInt(m[1], 10), m: parseInt(m[2], 10), d: parseInt(m[3], 10),
                 idx: m.index });
    }
  }
  return out;
}

var RE_ISO = /(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})/g;
var RE_DDMM = /(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4})/g;

// Devuelve { fecha: 'AAAA-MM-DD' o null, motivo: '...' , leidas: n, detalle: '' }
// SEGUIR LAS REGLAS R0..R7 DE LA CABECERA. Ante la duda, fecha = null.
function parsear(textoBruto, permitirDdmm) {
  if (textoBruto === null || textoBruto === undefined) {
    return { fecha: null, motivo: 'fechas_null', leidas: 0, detalle: '' };
  }
  var texto = String(textoBruto).trim();
  if (texto === '') return { fecha: null, motivo: 'vacio', leidas: 0, detalle: '' };

  var cands = candidatos(texto, RE_ISO);
  var fuente = 'iso';

  // La regex DD-MM-AAAA devuelve los grupos en otro orden (dia, mes, anio), asi
  // que hay que REMAPEAR a (anio, mes, dia). Sin este remapeo "12-09-2026" se
  // leeria como anio=12, y no existe: por eso hay test known-answer.
  if (cands.length === 0 && permitirDdmm) {
    var crudos = candidatos(texto, RE_DDMM);
    cands = crudos.map(function (c) {
      return { a: c.d, m: c.m, d: c.a, idx: c.idx };
    });
    fuente = 'ddmm_aaaa';
  }

  // R7 / R2b: texto sin fecha reconocible (por ejemplo "del 15 al 20 de marzo").
  // NO se intenta deducir el ano. Dejar NULL.
  if (cands.length === 0) {
    return { fecha: null, motivo: 'sin_fecha_iso', leidas: 0,
             detalle: 'sin anio reconocible; no se adivina' };
  }

  // R4: mas de dos fechas -> incoherente.
  if (cands.length > 2) {
    return { fecha: null, motivo: 'incoherente_3_mas', leidas: cands.length,
             detalle: 'se requieren como maximo 2 fechas' };
  }

  // R6 / R1: la primera tiene que existir en el calendario.
  var primera = isoDe(cands[0].a, cands[0].m, cands[0].d);
  if (primera === null) {
    return { fecha: null, motivo: 'fecha_invalida', leidas: cands.length,
             detalle: cands[0].a + '-' + cands[0].m + '-' + cands[0].d + ' no existe' };
  }

  // R5: si hay segunda, tiene que ser posterior o igual.
  if (cands.length === 2) {
    var segunda = isoDe(cands[1].a, cands[1].m, cands[1].d);
    if (segunda === null) {
      return { fecha: null, motivo: 'fecha_invalida', leidas: 2,
               detalle: 'segunda fecha ' + cands[1].a + '-' + cands[1].m + '-' +
                        cands[1].d + ' no existe' };
    }
    if (segunda < primera) {
      return { fecha: null, motivo: 'incoherente_segunda_anterior', leidas: 2,
               detalle: 'segunda (' + segunda + ') anterior a la primera (' + primera + ')' };
    }
  }

  // R3: varias coherentes -> la primera, que es el inicio del viaje.
  return { fecha: primera, motivo: 'ok', leidas: cands.length,
           detalle: fuente + ', ' + cands.length + ' fecha(s) leida(s)' };
}

// ------------------------------------------------------------------ SQL

function conteo(sql) {
  return "SELECT count(*)::int AS total, "
       + "count(*) FILTER (WHERE fecha_inicio IS NOT NULL)::int AS con_fecha, "
       + "count(*) FILTER (WHERE fecha_inicio IS NULL)::int AS sin_fecha "
       + "FROM " + TABLA;
}

// -------------------------------------------------------------------- main

async function main() {
  var aplicar = arg('--apply');
  var permitirDdmm = arg('--ddmm-aaaa');
  var comoJson = arg('--json');
  var maxRaw = argValor('--max=');
  var maximo = maxRaw === null ? 500 : parseInt(maxRaw, 10);
  if (!(maximo > 0)) maximo = 500;

  var modo = aplicar ? 'apply' : 'dry';
  function log(s) { if (!comoJson) console.log(s); }

  log('=== BACKFILL planes_viaje.fecha_inicio (' + modo + ') ===');
  log('    --ddmm-aaaa: ' + (permitirDdmm ? 'ACTIVADO' : 'apagado') +
      ' | --max: ' + maximo);
  log('');

  if (!neonReal) {
    console.error('BLOQUEADOR - @neondatabase/serverless no esta instalado.');
    process.exit(1);
  }
  var url = diagnosticoUrl(process.env.DATABASE_URL);
  if (!url) process.exit(1);
  var sql = neonReal(url);

  // ------------------------------------------- 0. PREFLIGHT: existe la columna
  var cols = await sql(
    "SELECT column_name, data_type, is_nullable FROM information_schema.columns " +
    "WHERE table_name = '" + TABLA + "' AND column_name = 'fecha_inicio'"
  );
  if (!cols || cols.length === 0) {
    console.error('BLOQUEADOR - planes_viaje.fecha_inicio NO EXISTE en la base de datos.');
    console.error('  La migracion db/migrations/044_planes_viaje_fecha_inicio.sql');
    console.error('  NO esta aplicada. No se puede hacer backfill de una columna');
    console.error('  inexistente. Este script no ha escrito NADA.');
    console.error('');
    console.error('  ACCION: aplicar la 044 en el editor SQL de Neon (operador humano),');
    console.error('  y despues re-ejecutar este script.');
    process.exit(1);
  }
  log('[0] PREFLIGHT - fecha_inicio existe: OK ('
      + cols[0].data_type + ', is_nullable=' + cols[0].is_nullable + ')');
  if (String(cols[0].data_type) !== 'date') {
    console.error('BLOQUEADOR - fecha_inicio no es de tipo date (es '
                  + cols[0].data_type + '). Revisar la 044. No se escribe nada.');
    process.exit(1);
  }

  var idx = await sql(
    "SELECT count(*)::int AS n FROM pg_indexes " +
    "WHERE tablename = '" + TABLA + "' AND indexname = 'idx_planes_viaje_activo_fecha'"
  );
  log('    indice idx_planes_viaje_activo_fecha presente: ' + (idx[0].n > 0 ? 'si' : 'NO'));
  log('');

  // --------------------------------------------------- 1. CONTEOS ANTES
  var antes = (await sql(conteo(sql)))[0];
  log('[1] ANTES - total filas: ' + antes.total
      + ' | con fecha_inicio: ' + antes.con_fecha
      + ' | sin fecha_inicio (NULL): ' + antes.sin_fecha);

  var filas = await sql(
    "SELECT id::text AS id, coalesce(fechas, '') AS fechas, activo, creado_en::text AS creado_en " +
    "FROM " + TABLA + " WHERE fecha_inicio IS NULL ORDER BY creado_en NULLS LAST"
  );
  log('[2] Filas candidatas (fecha_inicio IS NULL): ' + filas.length);
  log('');

  // ------------------------------------------------------ 2. parseo en memoria
  var parseados = [];
  var nulos = [];
  filas.forEach(function (f) {
    var r = parsear(f.fechas, permitirDdmm);
    if (r.fecha === null) {
      nulos.push({ id: f.id, fechas: asciiSeguro(f.fechas), motivo: r.motivo,
                   detalle: r.detalle, leidas: r.leidas });
    } else {
      parseados.push({ id: f.id, fechas: asciiSeguro(f.fechas), fecha_inicio: r.fecha,
                       leidas: r.leidas, detalle: r.detalle });
    }
  });

  log('[3] PARSEO - parseables: ' + parseados.length
      + ' | quedan NULL: ' + nulos.length + ' / ' + filas.length);
  log('');

  if (parseados.length > maximo) {
    console.error('ABORTE - ' + parseados.length + ' filas a actualizar superan --max '
                  + maximo + '. No se escribe NADA. Revisar muestra a mano o subir --max.');
    process.exit(1);
  }

  log('--- A ESCRIBIR (una fila por linea: id | fecha_inicio | fechas original) ---');
  parseados.forEach(function (p) {
    log('    ' + p.id + ' | ' + p.fecha_inicio + ' | "' + p.fechas + '"');
  });
  if (parseados.length === 0) log('    (ninguna)');
  log('');

  log('--- SE QUEDAN EN NULL (revisar a mano; NULL SE MUESTRA, no se pierde nada) ---');
  nulos.forEach(function (n) {
    log('    ' + n.id + ' | "' + n.fechas + '" | motivo=' + n.motivo
        + ' | ' + n.detalle);
  });
  if (nulos.length === 0) log('    (ninguna)');
  log('');

  // ------------------------------------------------------- 3. escritura (--apply)
  var escritas = 0;
  if (!aplicar) {
    log('[4] MODO DRY: no se escribio nada. Re-ejecutar con --apply para escribir.');
  } else {
    // UPDATE por id con WHERE fecha_inicio IS NULL (idempotencia, barrera 2).
    // Se hace fila por fila para que quede traza de cada escritura.
    for (var i = 0; i < parseados.length; i++) {
      var p = parseados[i];
      var res = await sql(
        'UPDATE ' + TABLA + ' SET fecha_inicio = $1::date ' +
        'WHERE id = $2::uuid AND fecha_inicio IS NULL',
        [p.fecha_inicio, p.id]
      );
      var afectadas = (res && res.rowCount !== undefined) ? res.rowCount : 0;
      if (afectadas > 0) {
        escritas++;
        log('    escrito: ' + p.id + ' -> ' + p.fecha_inicio + ' (' + afectadas + ' fila)');
      } else {
        log('    sin cambio (ya poblada): ' + p.id);
      }
    }
    log('[4] Filas escritas: ' + escritas + ' de ' + parseados.length + ' parseables.');
  }

  // --------------------------------------------------- 4. CONTEOS DESPUES
  var despues = (await sql(conteo(sql)))[0];
  log('');
  log('[5] DESPUES - total filas: ' + despues.total
      + ' | con fecha_inicio: ' + despues.con_fecha
      + ' | sin fecha_inicio (NULL): ' + despues.sin_fecha);

  // --------------------------------------------------- 5. INVARIANTES
  var integridad = [];
  if (Number(despues.total) !== Number(antes.total)) {
    integridad.push('FALLO total de filas cambio: ' + antes.total + ' -> ' + despues.total);
  } else {
    integridad.push('OK total de filas intacto (' + despues.total + '): ni se perdio ni se duplico');
  }
  var delta = Number(despues.con_fecha) - Number(antes.con_fecha);
  if (escritas > 0 && delta !== escritas) {
    integridad.push('FALLO delta fecha_inicio (' + delta + ') != filas escritas (' + escritas + ')');
  } else {
    integridad.push('OK delta fecha_inicio = ' + delta + ' = filas escritas');
  }
  log('');
  log('[6] INTEGRIDAD');
  integridad.forEach(function (l) { log('    ' + l); });

  // ------------------------------------------- 6. evidencia JSON (--json)
  if (comoJson) {
    console.log(JSON.stringify({
      modo: modo,
      ddmm_aaaa: permitirDdmm,
      max: maximo,
      antes: antes,
      despues: despues,
      parseados: parseados,
      nulos: nulos,
      filas_escritas: escritas,
      integridad: integridad
    }, null, 2));
  }
}

// Se exporta el parser puro para poder testearlo sin base de datos:
//   require('./004_backfill_planes_viaje_fecha_inicio.js').parsear(texto, ddmm)
// La conexion solo se abre si el fichero se ejecuta directamente.
module.exports = {
  parsear: parsear,
  candidatos: candidatos,
  fechaReal: fechaReal
};

if (require.main === module) {
  main().catch(function (e) {
    console.error('ERROR - ' + String((e && e.message) ? e.message : e));
    if (e && e.code) console.error('  sqlstate/code: ' + e.code);
    process.exit(1);
  });
}