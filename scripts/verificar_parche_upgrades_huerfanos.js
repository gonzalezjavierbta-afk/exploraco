// ============================================================================
// verificar_parche_upgrades_huerfanos.js
// INVARIANTE (no smoke test): public.parche_upgrades NO debe tener filas con
// usuario_id IS NULL.
//
// Uso: node scripts/verificar_parche_upgrades_huerfanos.js
//      node scripts/verificar_parche_upgrades_huerfanos.js --json
//
// QUE ES Y POR QUE EXISTE
//   Una fila con usuario_id NULL significa "inversion NO atribuida": el motor de
//   ranking resuelve el agregado por pu.usuario_id con WHERE usuario_id IS NOT
//   NULL, luego esa fila NO se redistribuye entre los miembros de la pandilla:
//   se EXCLUYE del termino de fama. La exclusion es la regla correcta (un NULL
//   no deja testigo de a que inversor correspondia, y redistribuir sin testigo
//   seria inventar un dato). Lo que NO es correcto es que una fila NULL
//   APAREZCA en silencio.
//
//   El punto ciego es el sintoma: si el panel de admin (o cualquier otra rama
//   de compra) inserta sin pasar usuario_id, el unico efecto visible es fama que
//   DESAPARECE del ranking. No hay error, no hay exception, no hay 500: hay un
//   numero mas bajo y nadie lo nota. Un fallo silencioso que se presenta como
//   exito es peor que un fallo ruidoso, luego aqui se convierte en un codigo de
//   salida distinto de cero con el nombre de la rama de escritura que revisar.
//
//   La tabla tiene hoy 0 filas y la columna usuario_id todavia NO existe (la
//   047 esta en disco pero sin aplicar), luego hoy la invariante no tiene nada
//   que medir. Por eso este script distingue TRES estados y no dos: "verificado
//   y limpio" (0), "verificado y sucio" (1) y "no se pudo verificar" (2). Un
//   fallo de red NUNCA se lee como PASS: el codigo 2 existe para eso.
//
// LOS TRES ESTADOS (mutuamente excluyentes, evaluados en este orden)
//   OK              codigo 0  la columna existe y huerfanos = 0.
//   FALLA           codigo 1  la columna existe y huerfanos > 0.
//   NO_VERIFICADO   codigo 2  no se pudo MIRAR: columna ausente (047 sin
//                             aplicar), sin DATABASE_URL, sin driver, red
//                             caida o respuesta no numerica.
//
// POR QUE "COLUMNA AUSENTE" NO ES UN FALLA
//   Si la 047 esta sin aplicar, la columna no existe y la consulta de huerfanos
//   muere con 42703 (undefined_column). Eso NO es un defecto de datos: es la
//   migracion pendiente, y reportarlo como "hay filas huerfanas" seria mentir
//   sobre lo que se midio. Se degrada a NO_VERIFICADO, que es distinto tanto de
//   OK como de FALLA, y dice que migracion aplicar. Cuando la 047 se aplique,
//   el mismo script empieza a medir sin cambiar una linea.
//
// QUE ESCRIBE Y QUE ES LEE
//   NADA. Solo SELECT. Las tres consultas pasan por el MISMO filtro de solo
//   lectura que scripts/neon_select.js: deben empezar por SELECT y ser una sola
//   sentencia. La DATABASE_URL se lee en memoria desde .env.local y nunca se
//   imprime; tampoco se imprime el texto SQL.
//
// PATRON REUTILIZADO
//   Capa Neon, validacion de solo lectura, urlValida() y el contrato
//   {ok, valor, motivo} que NUNCA lanza estan copiados de
//   scripts/verificar_migraciones_prod.js (su "CAPA NEON (solo lectura)"), que a
//   su vez declara seguir el patron de scripts/neon_select.js. No se abre una
//   conexion nueva ni se reimprime la URL.
//
// ASCII-safe (ADR-002): cero bytes > 127, cero backticks, CommonJS estricto.
// ============================================================================

'use strict';

// ---------------------------------------------------------------------------
// CONSULTAS. Todas de LECTURA. La de contexto NO menciona usuario_id, asi que
// se puede ejecutar aunque la 047 siga sin aplicar: es la que permite decir
// "0 de 0" en vez de un "0" sin contexto.
// ---------------------------------------------------------------------------
const Q_PRESENCIA =
  "SELECT count(*)::int AS n FROM information_schema.columns " +
  "WHERE table_schema = 'public' AND table_name = 'parche_upgrades' " +
  "AND column_name = 'usuario_id'";

const Q_HUERFANOS =
  'SELECT count(*)::int AS huerfanos FROM public.parche_upgrades ' +
  'WHERE usuario_id IS NULL';

const Q_CONTEXTO =
  'SELECT count(*)::int AS total, count(DISTINCT parche_id)::int AS parches ' +
  'FROM public.parche_upgrades';

// Rutas REALES medidas contra los ficheros el 2026-10-05 (ADR-006: el baseline
// es el fichero, no el recuerdo). Se citan porque el FAIL tiene que senalar el
// fichero exacto que hay que abrir, no un "revisar el backend".
const ESCRITOR = 'api/interacciones.js:13488 (INSERT INTO parche_upgrades)';
const LECTOR = 'api/usuarios.js:270 (JOIN parche_upgrades del motor de fama)';
const MIGRACION = 'db/migrations/047_parche_upgrades_usuario_inversor.sql';

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------

// ASCII-safe: la salida no debe emitir bytes > 127 (ADR-002). Mismo helper que
// verificar_migraciones_prod.js.
function limpiar(s) {
  return String(s == null ? '' : s)
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 220);
}

// ---------------------------------------------------------------------------
// CAPA NEON (solo lectura). Mismo patron y mismas garantias que
// scripts/neon_select.js y que la capa de scripts/verificar_migraciones_prod.js.
// ---------------------------------------------------------------------------
function urlValida(raw) {
  if (raw === undefined || raw === null || String(raw).trim() === '') return null;
  let s = String(raw).trim();
  if ((s.charAt(0) === '"' && s.charAt(s.length - 1) === '"') ||
      (s.charAt(0) === "'" && s.charAt(s.length - 1) === "'")) {
    s = s.slice(1, -1);
  }
  if (s.indexOf('...') !== -1) return null;
  if (!/^postgres(ql)?:\/\/[^\s@]+@[^\s/]+\/.+$/.test(s)) return null;
  return s;
}

function validarReadOnly(sql) {
  const s = String(sql == null ? '' : sql).replace(/^\s+/, '');
  const cabeza = s.slice(0, 6).toUpperCase();
  if (cabeza !== 'SELECT' && cabeza.slice(0, 4) !== 'WITH') {
    return 'solo se permiten consultas de LECTURA (SELECT/WITH)';
  }
  if (/;/.test(s.trim().slice(0, -1))) {
    return 'solo se permite UNA sentencia';
  }
  return null;
}

// Una consulta a Neon que devuelve UN entero. NUNCA lanza: devuelve siempre un
// objeto clasificado, porque la falta de credencial o un fallo de red deben
// degradar el veredicto a NO_VERIFICADO, nunca romper el script ni fingir un OK.
// Devuelve tambien la fila cruda en .fila para leer dos columnas de UNA sola
// ida a Neon (Q_CONTEXTO trae total y parches juntos).
async function consultarNeon(sqlTexto, campo) {
  const malo = validarReadOnly(sqlTexto);
  if (malo) return { ok: false, valor: null, motivo: 'consulta rechazada: ' + malo };

  try { require('./load_env_local')(); }
  catch (e) { return { ok: false, valor: null, motivo: 'no se pudo leer .env.local' }; }

  const url = urlValida(process.env.DATABASE_URL);
  if (!url) {
    return { ok: false, valor: null, motivo: 'sin DATABASE_URL valida en .env.local' };
  }

  let neon = null;
  try { neon = require('@neondatabase/serverless').neon; }
  catch (e) { neon = null; }
  if (!neon) {
    return { ok: false, valor: null, motivo: '@neondatabase/serverless no esta instalado' };
  }

  try {
    // OJO: ni la URL ni el SQL entran en el mensaje de error ni en la salida.
    const filas = await neon(url)(String(sqlTexto), []);
    const arr = Array.isArray(filas) ? filas : [];
    if (!arr.length) return { ok: false, valor: null, fila: null, motivo: 'Neon devolvio 0 filas a un conteo' };
    const fila = arr[0];
    const clave = (campo && fila[campo] !== undefined) ? campo : Object.keys(fila)[0];
    const v = fila[clave];
    const n = Number(v);
    if (!isFinite(n)) return { ok: false, valor: null, fila: null, motivo: 'conteo no numerico devuelto por Neon' };
    return { ok: true, valor: n, fila: fila, motivo: '' };
  } catch (e) {
    // Solo el codigo/sqlstate, que no contiene secretos. 42703 = la columna no
    // existe todavia: es el 047 sin aplicar, no un fallo de datos.
    const codigo = (e && e.code) ? String(e.code) : 'error';
    return { ok: false, valor: null, motivo: 'Neon respondio ' + limpiar(codigo) };
  }
}

// ---------------------------------------------------------------------------
// LOGICA DE DECISION (funcion pura, sin red y sin process.exit). Se exporta
// para poder probar los TRES estados sin tocar Neon.
//
// med = { columna: bool|null, huerfanos: number|null, total: number|null,
//         parches: number|null, motivo: string }
//
// El orden importa y cubre el total:
//   columna === false  -> NO_VERIFICADO (047 sin aplicar). Se evalua PRIMERO
//                         porque sin columna el conteo de huerfanos no se puede
//                         hacer, luego cualquier otro veredicto seria inventado.
//   columna !== true    -> NO_VERIFICADO (no se pudo preguntar por la columna).
//   huerfanos === null  -> NO_VERIFICADO (no se pudo contar).
//   huerfanos === 0     -> OK.
//   resto               -> FALLA.
// ---------------------------------------------------------------------------
function decidir(med) {
  const base = {
    estado: 'NO_VERIFICADO',
    codigo: 2,
    veredicto: '',
    accion: '',
  };

  if (med.columna === false) {
    base.veredicto = 'NO VERIFICADO - la columna public.parche_upgrades.usuario_id ' +
      'NO existe todavia: la migracion 047 esta en disco pero SIN APLICAR. ' +
      'No hay nada que medir y esto NO es un fallo de datos.';
    base.accion = 'Aplicar la migracion y volver a correr este script con: ' +
      'node scripts/apply_sql_file.js ' + MIGRACION;
    return base;
  }
  if (med.columna !== true) {
    base.veredicto = 'NO VERIFICADO - no se pudo confirmar la columna usuario_id (' +
      limpiar(med.motivo) + '). No se afirma nada sobre filas huerfanas.';
    base.accion = 'Revisar DATABASE_URL en .env.local y la conectividad con Neon, ' +
      'y volver a correr este script.';
    return base;
  }
  if (med.huerfanos === null || med.huerfanos === undefined) {
    base.veredicto = 'NO VERIFICADO - la columna existe pero no se pudo contar ' +
      'las filas huerfanas (' + limpiar(med.motivo) + '). No se afirma nada.';
    base.accion = 'Un 42703 aqui significaria que la 047 esta a medias. Revisar Neon ' +
      'y volver a correr este script.';
    return base;
  }

  const den = (med.total === null || med.total === undefined) ? '?' : med.total;
  if (med.huerfanos === 0) {
    base.estado = 'OK';
    base.codigo = 0;
    base.veredicto = 'OK - 0 de ' + den + ' fila(s) de public.parche_upgrades tienen ' +
      'usuario_id IS NULL. La invariante se cumple.';
    base.accion = 'Ninguna accion. Re-correr tras cada compra de parche.';
    return base;
  }

  base.estado = 'FALLA';
  base.codigo = 1;
  base.veredicto = 'FALLA - ' + med.huerfanos + ' de ' + den +
    ' fila(s) de public.parche_upgrades tienen usuario_id IS NULL.';
  base.accion = 'Revisar la rama de escritura que NO pasa usuario_id: ' + ESCRITOR +
    '. El motor de fama resuelve por pu.usuario_id con WHERE usuario_id IS NOT ' +
    'NULL en ' + LECTOR + ', luego esas filas quedan FUERA del termino de fama ' +
    'del inversor: no se redistribuyen. El sintoma es fama que desaparece del ' +
    'ranking, sin error visible, que es justo lo que este script hace ruidoso.';
  return base;
}

// ---------------------------------------------------------------------------
// MAIN
// ---------------------------------------------------------------------------
async function medir() {
  const pres = await consultarNeon(Q_PRESENCIA, 'n');
  // UNA sola ida para los dos numeros de contexto: total y parches vienen en la
  // misma fila de Q_CONTEXTO, luego no se paga un segundo viaje a Neon.
  const contexto = await consultarNeon(Q_CONTEXTO, 'total');
  const parches = (contexto.ok && contexto.fila && contexto.fila.parches !== undefined)
    ? Number(contexto.fila.parches)
    : null;

  const med = {
    columna: pres.ok ? pres.valor > 0 : null,
    huerfanos: null,
    total: contexto.ok ? contexto.valor : null,
    parches: (parches !== null && isFinite(parches)) ? parches : null,
    motivo: pres.ok ? (contexto.ok ? '' : contexto.motivo) : pres.motivo,
  };

  // La consulta de huerfanos solo se lanza si la columna existe: si no, Neon
  // devuelve 42703 y ese error NO seria informacion sobre datos.
  if (med.columna === true) {
    const h = await consultarNeon(Q_HUERFANOS, 'huerfanos');
    med.huerfanos = h.ok ? h.valor : null;
    if (!h.ok) med.motivo = h.motivo;
  }

  return med;
}

function imprimir(med, d) {
  console.log('== INVARIANTE: public.parche_upgrades sin usuario_id IS NULL');
  console.log('== LECTURA. NO escribe en Neon. NO imprime la URL ni el SQL.');
  console.log('');
  console.log('   migracion     : ' + MIGRACION);
  console.log('   rama escritura: ' + ESCRITOR);
  console.log('   rama lectura  : ' + LECTOR);
  console.log('');
  console.log('== MEDICION (Neon, solo lectura)');
  console.log('   columna usuario_id existe : ' +
    (med.columna === true ? 'si' : (med.columna === false ? 'NO (047 sin aplicar)' : 'n/d')));
  console.log('   filas totales             : ' +
    (med.total === null ? 'n/d' : med.total));
  console.log('   parches distintos         : ' +
    (med.parches === null ? 'n/d' : med.parches));
  console.log('   filas huerfanas (NULL)    : ' +
    (med.huerfanos === null ? 'n/d' : med.huerfanos));
  if (med.motivo) console.log('   motivo                     : ' + limpiar(med.motivo));
  console.log('');
  console.log('== RESUMEN');
  console.log('   veredicto : ' + d.veredicto);
  console.log('   accion    : ' + d.accion);
  console.log('   exit code : ' + d.codigo +
    '  (0 OK / 1 FALLA / 2 NO VERIFICADO)');
  console.log('');
}

async function main(argv) {
  argv = argv || process.argv;
  const quiereJson = argv.indexOf('--json') >= 0;

  const med = await medir();
  const d = decidir(med);

  if (quiereJson) {
    console.log(JSON.stringify({
      ok: d.codigo === 0,
      estado: d.estado,
      exit_code: d.codigo,
      veredicto: d.veredicto,
      accion: d.accion,
      columna_usuario_id: med.columna,
      filas_totales: med.total,
      parches_distintos: med.parches,
      huerfanos: med.huerfanos,
      motivo: med.motivo || null,
      solo_lectura: true,
    }, null, 2));
  } else {
    imprimir(med, d);
  }

  process.exitCode = d.codigo;
  return d.codigo;
}

// Importar este archivo NO ejecuta nada: el arnes de pruebas puede pedir la
// capa pura (decidir, consultarNeon) sin tocar Neon.
module.exports = {
  decidir: decidir,
  consultarNeon: consultarNeon,
  validarReadOnly: validarReadOnly,
  urlValida: urlValida,
  limpiar: limpiar,
  medir: medir,
  imprimir: imprimir,
  main: main,
  Q_PRESENCIA: Q_PRESENCIA,
  Q_HUERFANOS: Q_HUERFANOS,
  Q_CONTEXTO: Q_CONTEXTO,
  ESCRITOR: ESCRITOR,
  LECTOR: LECTOR,
  MIGRACION: MIGRACION,
};

if (require.main === module) {
  main(process.argv);
}