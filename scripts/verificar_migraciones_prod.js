// ============================================================================
// verificar_migraciones_prod.js
// Verifica en VIVO que una migracion quedo desplegada en produccion.
//
// Uso: node scripts/verificar_migraciones_prod.js <MIGRACION.sql> [BASE_URL]
//   MIGRACION.sql  obligatorio. Ej: 044_planes_viaje_fecha_inicio.sql
//   BASE_URL       opcional. Default: https://exploraco.vercel.app
//   ADMIN_TOKEN    opcional, por entorno. NO se imprime nunca. Solo permite
//                  que ?tipo=diagnostico responda 200 y asi confirmar el
//                  esquema por introspection. Sin el, responde 401 y eso
//                  SIGUE siendo senal de plataforma viva.
//
// QUE HACE Y POR QUE EXISTE
//   applied en Neon != vivo en produccion. Una migracion puede estar aplicada
//   en la base de datos y aun asi el backend que la consume NO estar
//   desplegado: en ese caso las ramas que leen la columna nueva siguen
//   fallando en produccion con el codigo de Postgres 42703 (columna
//   inexistente). Este script golpea la funcion serverless real y clasifica
//   el resultado para que un agente decida sin leer el texto.
//
// NO HACE
//   - No despliega, no hace push, no escribe nada en produccion. Solo GET.
//   - No crea endpoints: consume los que ya existen (8/8 de Vercel agotados).
//   - No lee ni muestra secretos. No toca .env.local. No necesita DATABASE_URL
//     porque esto es HTTP contra produccion, no SQL.
//
// DISENO DEL MAPEO (explicito a proposito)
//   Una migracion .sql no dice que funcion de api/ la consume, asi que el
//   binding migracion -> endpoint se resuelve contra MAPEO, un objeto escrito
//   a mano con la tabla, la funcion y los valores de tipo que llegan a las
//   ramas de listado. Si el mapeo fuera magico (regex sobre el fichero, o
//   heuristica), el proximo que llegase no podria arreglarlo ni auditarlo.
//   Cada entrada declara la linea donde esta la rama y la linea del SELECT.
//
//   PARA EXTENDERLO con una tabla nueva: anade una clave al objeto MAPEO con
//   el mismo shape. El resolutor empareja el nombre de la migracion con las
//   claves por substring, asi que una migracion nueva no requiere codigo.
// ============================================================================

// ---------------------------------------------------------------------------
// MAPEO migracion -> endpoint que la consume.
// Verificado estaticamente contra el codigo (ADR-006), no supuesto:
//   api/interacciones.js:6353  if (tipo === 'planes')   -> SELECT ... :6363
//   api/interacciones.js:6376  if (tipo === 'planes_mios') -> SELECT ... :6382
//   api/utilidades.js:769      if (tipo === 'diagnostico') (salud de plataforma)
// Unico fichero que consulta planes_viaje en todo api/: interacciones.js
// ---------------------------------------------------------------------------
const MAPEO = {
  planes_viaje: {
    tabla: 'planes_viaje',
    funcion: 'api/interacciones.js',
    metodo: 'GET',
    ruta: '/api/interacciones',
    tipos: [
      {
        tipo: 'planes',            // listado publico
        lineaRama: 6353,
        lineaSelect: 6363,         // WHERE p.activo = true AND (p.fecha_inicio IS NULL OR ...)
        sondeable: true,           // sin token: es el probe real
      },
      {
        tipo: 'planes_mios',       // planes creados por el usuario
        lineaRama: 6376,
        lineaSelect: 6382,
        sondeable: false,          // exige usuario_id: sin token cae antes del SQL
      },
    ],
    // Columna que la migracion 044 anade. Se usa para la comprobacion de
    // introspection cuando hay ADMIN_TOKEN, y para el mensaje del fallo.
    columnaEsperada: 'fecha_inicio',
  },
};

const DEFAULT_BASE = 'https://exploraco.vercel.app';
const TIMEOUT_MS = 15000;
const TOKEN = String(process.env.ADMIN_TOKEN || ''); // opcional, jamas impreso

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------

// ASCII-safe: el script no debe emitir bytes > 127 (ADR-002).
function limpiar(s) {
  return String(s == null ? '' : s)
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 220);
}

function techo(ms) {
  const ctl = new AbortController();
  const t = setTimeout(function () { ctl.abort(); }, ms);
  return { signal: ctl.signal, limpiar: function () { clearTimeout(t); } };
}

// GET sin efectos. Devuelve siempre un estado clasificado, nunca lanza.
async function pedir(ruta, cabeceras) {
  const g = techo(TIMEOUT_MS);
  try {
    const r = await fetch(BASE + ruta, {
      method: 'GET',
      headers: cabeceras || {},
      signal: g.signal,
    });
    let json = null;
    let crudo = '';
    try {
      crudo = await r.text();
      try { json = JSON.parse(crudo); } catch (e) { json = null; }
    } catch (e) { crudo = ''; }
    return { alcanzable: true, status: r.status, json: json, cuerpo: crudo };
  } catch (e) {
    // Abort (timeout), DNS, TLS o red caida. NO es un fallo de la migracion:
    // no se pudo mirar. Debe quedar distinguido de un 42703 real.
    const causa = (e && e.cause && (e.cause.code || e.cause.message)) || '';
    const msg = (e && (e.cause && e.cause.code ? e.cause.code : e.name)) || 'sin_nombre';
    const extra = (causa && String(causa) !== String(msg)) ? ' (' + limpiar(causa) + ')' : '';
    return { alcanzable: false, status: 0, json: null, cuerpo: '', motivo: String(msg) + extra };
  } finally {
    g.limpiar();
  }
}

// Detecta la firma de "columna que la migracion todavia no creo".
// Tres senales, porque el backend las emiteforman tres manners distintas:
//   1) code '42703' (api/interacciones.js:14501 captura err.code)
//   2) code 'SCHEMA_NOT_MIGRATED' (mapeo explicito de 42703, :14502)
//   3) texto de columna inexistente de Postgres en el mensaje
function esFaltaColumna(r) {
  const b = (r.json && typeof r.json === 'object') ? r.json : null;
  const codigo = b && String(b.code || '');
  if (codigo === '42703' || codigo === 'SCHEMA_NOT_MIGRATED') return true;
  const txt = (crudoDe(r) + ' ' + JSON.stringify(b || {})).toLowerCase();
  if (txt.indexOf('42703') !== -1) return true;
  if (txt.indexOf('schema_not_migrated') !== -1) return true;
  if (txt.indexOf('does not exist') !== -1) return true;
  if (txt.indexOf('no existe la columna') !== -1) return true;
  if (txt.indexOf('undefined_column') !== -1) return true;
  return false;
}

function crudoDe(r) { return limpiar(r.cuerpo || ''); }

// Clasificacion de UNA sonda de listado.
function clasificar(r, sonda) {
  if (!r.alcanzable) {
    return {
      estado: 'SIN_VERIFICAR',
      ok: false,
      razon: 'No hubo respuesta: ' + limpiar(r.motivo) + ' (timeout, DNS o red caida). ' +
             'Esto NO dice nada de la migracion: no se pudo consultar.',
    };
  }
  if (esFaltaColumna(r)) {
    return {
      estado: 'FALLIDO_42703',
      ok: false,
      razon: 'El backend responde y dice que la columna no existe: la migracion ' +
             'NO esta desplegada en el backend. HTTP ' + r.status + '.',
    };
  }
  if (r.status >= 500) {
    return {
      estado: 'ERROR_5XX',
      ok: false,
      razon: 'Fallo del servidor (HTTP ' + r.status + '), sin firma de columna ausente.',
    };
  }
  if (r.status >= 400) {
    return {
      estado: 'ERROR_4XX',
      ok: false,
      razon: 'La funcion rechazo la peticion (HTTP ' + r.status + '). ' +
             'Revisar auth o ruta antes de culpar a la migracion.',
    };
  }
  const b = r.json;
  if (!b || b.ok !== true) {
    return {
      estado: 'ERROR_4XX',
      ok: false,
      razon: 'HTTP ' + r.status + ' pero sin ok:true: ' + limpiar((b && b.error) || 'sin cuerpo'),
    };
  }
  if (!Array.isArray(b.data)) {
    return {
      estado: 'ERROR_5XX',
      ok: false,
      razon: 'ok:true pero data no es un array: la forma de la respuesta cambio.',
    };
  }
  // Array VACIO es un resultado correcto: el unico plan vencio su fecha_inicio
  // y el filtro de la migracion 044 lo oculta. No es un fallo.
  return {
    estado: 'OK',
    ok: true,
    razon: 'Listado correcto, ' + b.data.length + ' fila(s). Un array vacio es ' +
           'correcto: ningun plan vigente (la 044 oculta los vencidos).',
  };
}

function check(label, cond, extra) {
  console.log((cond ? 'PASS' : 'FAIL') + ' - ' + label + (extra ? ' | ' + extra : ''));
  if (!cond) process.exitCode = 1;
}

// ---------------------------------------------------------------------------
// MAIN
// ---------------------------------------------------------------------------

const MIGRACION = process.argv[2];
const BASE = String(process.argv[3] || process.env.BASE_URL || DEFAULT_BASE)
  .replace(/\/+$/, '');

function uso() {
  console.log('USO: node scripts/verificar_migraciones_prod.js <MIGRACION.sql> [BASE_URL]');
  console.log('  MIGRACION.sql  obligatorio. Ej: 044_planes_viaje_fecha_inicio.sql');
  console.log('  BASE_URL       opcional. Default: ' + DEFAULT_BASE);
  console.log('  ADMIN_TOKEN    opcional por entorno. Nunca se imprime.');
}

if (!MIGRACION) {
  console.log('FAIL - Falta el argumento obligatorio MIGRACION.sql');
  uso();
  process.exitCode = 2;
} else {
  main();
}

async function main() {
  // --- 1) Resolver migracion -> tabla del MAPEO -----------------------------
  const nombre = MIGRACION.toLowerCase();
  let clave = null;
  for (const k of Object.keys(MAPEO)) {
    if (nombre.indexOf(k.toLowerCase()) !== -1) { clave = k; break; }
  }

  if (!clave) {
    console.log('FAIL - Migracion sin mapeo estatico: ' + limpiar(MIGRACION));
    console.log('       Ningun endpoint declarado consulta esa tabla. Anade la clave en');
    console.log('       MAPEO (scripts/verificar_migraciones_prod.js) con tabla, funcion,');
    console.log('       ruta y tipos, en lugar de inventar el binding aqui.');
    process.exitCode = 1;
    return;
  }

  const m = MAPEO[clave];
  console.log('== MIGRACION: ' + limpiar(MIGRACION));
  console.log('== BASE: ' + BASE);
  console.log('== ENDPOINT: ' + m.metodo + ' ' + m.ruta + ' (' + m.funcion + ') tabla=' + m.tabla);
  console.log('== COLUMNA ESPERADA: ' + m.columnaEsperada);
  console.log('== ESTA VERIFICACION ES SOLO LECTURA (GET). NO DEPLIEGA NI ESCRIBE.');
  console.log('');

  const cabeceras = {};
  if (TOKEN) cabeceras['Authorization'] = 'Bearer ' + TOKEN;

  // --- 2) Sondas de listado ------------------------------------------------
  const resultados = [];
  const sondeables = m.tipos.filter(function (t) { return t.sondeable; });
  for (const t of sondeables) {
    const ruta = m.ruta + '?tipo=' + encodeURIComponent(t.tipo);
    const r = await pedir(ruta, cabeceras);
    const c = clasificar(r, t);
    const filas = (r.json && Array.isArray(r.json.data)) ? r.json.data.length : null;
    resultados.push({ tipo: t.tipo, lineaRama: t.lineaRama, lineaSelect: t.lineaSelect, estado: c.estado, filas: filas, r: r, razon: c.razon });
    check('GET tipo=' + t.tipo + ' [' + c.estado + ']',
      c.ok,
      'linea=' + t.lineaRama + ' select=' + t.lineaSelect +
      ' http=' + (r.alcanzable ? r.status : 'sin-respuesta') +
      ' filas=' + ((r.json && Array.isArray(r.json.data)) ? r.json.data.length : 'n/d') +
      ' | ' + c.razon);
    if (r.alcanzable && !c.ok && r.status >= 400) {
      console.log('       respuesta: ' + crudoDe(r));
    }
  }

  // Los tipos no sondeables se declaran, no se callan: el proximo debe saber
  // que existen y por que no se cubrieron.
  for (const t of m.tipos) {
    if (t.sondeable) continue;
    console.log('INFO - tipo=' + t.tipo + ' no sondeado (exige usuario_id).' +
                ' Rama en linea ' + t.lineaRama + ', select en ' + t.lineaSelect + '.');
  }

  // --- 3) Salud de plataforma via api/utilidades.js ------------------------
  // OJO: el cuerpo de diagnostico puede contener info sensible, asi que aqui
  // NUNCA se imprime: solo se usa el status y, si hay token, la presencia de la
  // columna. Su valor es DESACTIVAR la migracion como causa raiz.
  console.log('');
  const diag = await pedir('/api/utilidades?tipo=diagnostico', cabeceras);
  let salud = { estado: 'SIN_VERIFICAR', texto: '', nota: '' };
  if (!diag.alcanzable) {
    salud = { estado: 'SIN_VERIFICAR', texto: 'api/utilidades.js no respondio (' + limpiar(diag.motivo) + ')' };
  } else if (diag.status === 200 && diag.json && diag.json.ok === true) {
    const cols = (diag.json.columnas && diag.json.columnas[m.tabla]) || null;
    const tiene = cols && cols.some(function (c) { return String(c).indexOf(m.columnaEsperada + ':') === 0; });
    salud = {
      estado: 'SALUDABLE',
      texto: 'diagnostico 200',
      confirmada: !!tiene,
      nota: tiene
        ? 'introspection CONFIRMA que ' + m.tabla + '.' + m.columnaEsperada + ' existe en la base.'
        : 'introspection dice que ' + m.tabla + '.' + m.columnaEsperada + ' NO existe en la base: la migracion NO esta aplicada.',
    };
  } else if (diag.status === 401 || diag.status === 403) {
    salud = {
      estado: 'VIVA_CON_AUTH',
      texto: 'diagnostico http=' + diag.status + ' (requiere ADMIN_TOKEN)',
      nota: 'La funcion responde: la plataforma esta VIVA. Solo falta credencial para introspection.',
    };
  } else {
    salud = {
      estado: 'ERROR_5XX',
      texto: 'diagnostico http=' + diag.status,
      nota: 'POSIBLE CAUSA RAIZ del fallo del listado, no un fallo independiente.',
    };
  }
  console.log('SALUD PLATAFORMA - ' + salud.estado + ' | ' + salud.texto + (salud.nota ? ' | ' + salud.nota : ''));
  if (salud.estado === 'SIN_VERIFICAR' || salud.estado === 'ERROR_5XX') {
    console.log('  ATENCION: sin senal de plataforma, no se puede atribuir el fallo al listado.');
  }

  // --- 4) Veredicto --------------------------------------------------------
  const fallos = resultados.filter(function (x) { return x.estado !== 'OK'; });
  const principal = resultados.length ? resultados[0] : null;
  const totalFilas = resultados.reduce(function (a, x) { return a + (x.filas || 0); }, 0);
  const confirmada = salud.confirmada === true;
  let veredicto, codigo = 0;

  if (fallos.length === 0 && confirmada) {
    veredicto = 'OK CONFIRMADO - la migracion esta VIVA: el listado responde y la ' +
                'introspection confirma que ' + m.tabla + '.' + m.columnaEsperada + ' existe.';
    codigo = 0;
  } else if (fallos.length === 0 && salud.estado === 'SALUDABLE') {
    veredicto = 'FALLIDO_MIGRACION_NO_APLICADA - la introspection de la base de datos dice que ' +
                m.tabla + '.' + m.columnaEsperada + ' NO EXISTE, aunque el listado respondio. ' +
                'La migracion no esta aplicada en la base de datos que usa produccion.';
    codigo = 1;
  } else if (fallos.length === 0) {
    // El listado respondio sin 42703, pero eso NO prueba que la migracion este
    // desplegada. Un 200 es compatible con DOS situations indistinguibles desde
    // fuera sin credencial:
    //   (a) codigo nuevo desplegado + ' + m.columnaEsperada + ' existe + ningun plan vigente
    //   (b) codigo viejo desplegado (sin el filtro) + 0 planes activos en la tabla
    // En (b) la migracion sigue SIN estar desplegada y el listado devolveria
    // exactamente la misma respuesta. Por eso un 200 no basta para dar el visto
    // bueno: un verificador que dice OK aqui es peor que no tener verificador.
    veredicto = 'NO_CONFIRMADO - el listado responde sin 42703, pero eso NO demuestra que ' +
                'la migracion este desplegada. El 200 es compatible con (a) codigo nuevo + ' +
                m.columnaEsperada + ' existente, y con (b) codigo viejo desplegado y 0 planes ' +
                'activos: desde fuera, sin credencial, no se pueden separar. Filas devueltas: ' +
                totalFilas + '. Para confirmacion definitiva hace falta introspection ' +
                '(rerun con ADMIN_TOKEN para que api/utilidades.js?tipo=diagnostico responda 200).';
    codigo = 1;
  } else if (principal && principal.estado === 'FALLIDO_42703' && salud.estado !== 'ERROR_5XX') {
    veredicto = 'FALLIDO_42703 - LA MIGRACION NO ESTA DESPLEGADA. La base responde pero el ' +
                'backend deployed no conoce ' + m.tabla + '.' + m.columnaEsperada + '. ' +
                'El fallo es de DESPLIEGUE de ' + m.funcion + ', no de la migracion SQL: ' +
                'aplicar la migracion en Neon no basta hasta desplegar el backend que la lee.';
    codigo = 1;
  } else if (principal && principal.estado === 'SIN_VERIFICAR') {
    veredicto = 'SIN_VERIFICAR - no se pudo comprobar si la migracion esta viva. ' +
                'NO se declara fallo de migracion: la red o el host no respondieron.';
    codigo = 1;
  } else {
    veredicto = 'FALLO - ' + (principal ? principal.estado : 'sin sondas') +
                ' en ' + m.ruta + '. Diagnostico de plataforma: ' + salud.estado + '.';
    codigo = 1;
  }

  console.log('');
  console.log('== RESUMEN');
  console.log('   veredicto : ' + veredicto);
  console.log('   endpoint  : ' + m.metodo + ' ' + m.ruta);
  console.log('   sonda     : tipo=' + (principal ? principal.tipo : 'n/d') +
              ' rama=' + (principal ? principal.lineaRama : 'n/d') +
              ' select=' + (principal ? principal.lineaSelect : 'n/d'));
  console.log('   estados   : ' + (resultados.length
    ? resultados.map(function (x) { return x.tipo + '=' + x.estado; }).join(', ')
    : 'sin sondas'));
  console.log('   plataforma: ' + salud.estado);
  console.log('   exit code : ' + codigo);
  process.exitCode = codigo;
}