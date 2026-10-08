// ============================================================================
// verificar_migraciones_prod.js
// Verifica en VIVO que una migracion quedo desplegada en produccion.
//
// Uso: node scripts/verificar_migraciones_prod.js <MIGRACION.sql> [BASE_URL]
//   MIGRACION.sql  obligatorio. Ej: 044_planes_viaje_fecha_inicio.sql
//   BASE_URL       opcional. Default: https://exploraco.vercel.app
//
// QUE HACE Y POR QUE EXISTE
//   applied en Neon != vivo en produccion. Una migracion puede estar aplicada
//   en la base de datos y aun asi el backend que la consume NO estar
//   desplegado: en ese caso las ramas que leen la columna nueva siguen
//   fallando en produccion con el codigo de Postgres 42703 (columna
//   inexistente). Este script golpea la funcion serverless real, compara las
//   filas que devuelve con lo que devolveria cada version del codigo y
//   clasifica el resultado para que un agente decida sin leer el texto.
//
// EL PROBLEMA QUE RESUELVE LA COMPROBACION CON BASE DE DATOS
//   Un HTTP 200 con 0 filas es compatible con DOS situaciones que desde fuera
//   no se pueden separar:
//     (a) codigo NUEVO desplegado + columna existente + 0 planes visibles
//     (b) codigo VIEJO desplegado + 0 planes que el filtro del codigo nuevo
//         ocultaria
//   Sin consultar la base, (a) y (b) dan la MISMA respuesta, y por eso un
//   verificador que dice OK ahi es peor que no tener verificador. La consulta
//   directa a Neon cierra la ambiguedad: se sabe cuantas filas devolveria CADA
//   version del codigo y se compara con lo que devolvio produccion. CERO
//   credenciales nuevas: es el mismo DATABASE_URL de .env.local que ya usan las
//   herramientas de diagnostico.
//
// NO HACE
//   - No despliega, no hace push, no escribe nada en produccion. Solo GET.
//   - No escribe en Neon. Las consultas de este script pasan por el MISMO
//     filtro de solo lectura que scripts/neon_select.js: deben empezar por
//     SELECT o WITH y ser una sola sentencia.
//   - No crea endpoints: consume los que ya existen (8/8 de Vercel agotados).
//   - NO lee ni muestra secretos. La DATABASE_URL se usa en memoria y nunca
//     se imprime. Tampoco se imprime el texto SQL enviado.
//
// DISENO DEL MAPEO (explicito a proposito)
//   Una migracion .sql no dice que funcion de api/ la consume ni que consulta
//   ejecutaba el codigo de ANTES, asi que el binding se resuelve contra MAPEO,
//   un objeto escrito a mano. Si el mapeo fuera magico (regex sobre el
//   fichero, o heuristica en runtime), el proximo que llegase no podria
//   arreglarlo ni auditarlo. Cada entrada declara la linea de la rama, la del
//   SELECT, la consulta sin migracion y la consulta con migracion.
//
//   PARA EXTENDERLO con una tabla nueva: anade una clave al objeto MAPEO con
//   el mismo shape. El resolutor empareja el nombre de la migracion con las
//   claves por substring, asi que una migracion nueva no requiere codigo.
//   Si la anades sin las dos consultas, el script degrada a NO_CONFIRMADO y lo
//   dice: nunca inventa el binding en runtime.
// ============================================================================

// ---------------------------------------------------------------------------
// MAPEO migracion -> endpoint que la consume + par de consultas que discrimina.
// Verificado estaticamente contra el codigo (ADR-006), no supuesto:
//   api/interacciones.js:6353  if (tipo === 'planes')   -> SELECT ... :6363
//   api/interacciones.js:6376  if (tipo === 'planes_mios') -> SELECT ... :6382
//   api/utilidades.js:769      if (tipo === 'diagnostico') (salud de plataforma)
// Unico fichero que consulta planes_viaje en todo api/: interacciones.js
//
// 055 (ADR-091), tres consumidores, deducidos del codigo real:
//   api/interacciones.js:6150  if (tipo === 'reclamacion_estado')
//                                          -> SELECT ... :6157 (exige destino_id)
//   api/interacciones.js:9816  if (tipo2 === 'reclamar_propiedad_solicitar')
//                                          -> CTE up+ins :9919, ON CONFLICT :9932
//   api/admin.js:1879          recurso === 'reclamaciones'
//                                          -> SELECT ... :1903 (exige auth)
// ---------------------------------------------------------------------------
const MAPEO = {
  planes_viaje: {
    migracion: '044_planes_viaje_fecha_inicio.sql',
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
    // Columna que la migracion 044 anade. Solo descriptiva: la prueba real la
    // hacen las dos consultas de abajo, no el nombre de la columna.
    columnaEsperada: 'fecha_inicio',

    // ---- LAS DOS CONSULTAS QUE DISCRIMINAN -------------------------------
    // consulta_antes   : la que ejecutaba el codigo VIEJO, sin la migracion.
    //                   No puede mencionar la columna nueva: si la mencionara
    //                   fallaria con 42703 en vez de contar filas.
    // consulta_despues : la que ejecuta el codigo NUEVO, con el filtro.
    // explained        : por que el par discrimina, en palabras.
    //
    // OJO sobre LIMIT: el listado de produccion acaba en LIMIT 50. Si una tabla
    // creciera por encima de 50 filas los conteos se saturarian, pero como ambos
    // conteos se miden con count(*) sin limite, la comparacion sigue siendo
    // valida salvo que prod quede clavado en 50; ese caso cae en AMBIGUO con
    // las tres cifras a la vista, que es exactamente lo que se busca.
    consulta_antes:
      'SELECT count(*)::int AS n FROM planes_viaje p WHERE p.activo = true',
    consulta_despues:
      'SELECT count(*)::int AS n FROM planes_viaje p WHERE p.activo = true' +
      ' AND (p.fecha_inicio IS NULL OR p.fecha_inicio >= CURRENT_DATE)',
    explained:
      'La 044 anade planes_viaje.fecha_inicio y el backend filtra los planes con ' +
      'fecha comprobable y vencida (WHERE p.activo = true AND (p.fecha_inicio IS NULL ' +
      'OR p.fecha_inicio >= CURRENT_DATE), api/interacciones.js:6363). El codigo viejo ' +
      'no tenia ese filtro y devolvia todos los planes activos. El par de conteos ' +
      'distingue entonces "filtro desplegado" de "filtro ausente" siempre que el filtro ' +
      'oculte al menos una fila; si no oculta ninguna, ambos conteos coinciden y el ' +
      'dato no discrimina (INDETERMINADO), que es la respuesta honesta.',
  },

  // ---------------------------------------------------------------------------
  // CLAVE 'reclamacion_propiedad' en SINGULAR, no 'reclamaciones_propiedad'.
  // El resolutor de main() empareja la CLAVE contra el nombre del fichero por
  // substring (nombre.indexOf(k.toLowerCase()) !== -1), asi que la clave tiene
  // que ser un trozo LITERAL de 055_reclamacion_propiedad_destinos.sql. El
  // nombre real de la tabla, en plural, va en el campo tabla, que es el que se
  // imprime. El emparejado es el primero que gana y ningun otro nombre de
  // migracion del repo contiene este trozo.
  // ---------------------------------------------------------------------------
  reclamacion_propiedad: {
    migracion: '055_reclamacion_propiedad_destinos.sql',
    tabla: 'reclamaciones_propiedad',
    // El arnes solo construye BASE + ruta + '?tipo=' + tipo, metodo GET y sin
    // cabeceras. Los tres consumidores de la 055 se declaran, no se sondean:
    // ninguno responde a esa forma de peticion (ver tipos y explained).
    funcion: 'api/interacciones.js + api/admin.js',
    metodo: 'GET+POST',
    ruta: '/api/interacciones',
    tipos: [
      {
        tipo: 'reclamacion_estado',  // GET solo lectura, boton de reclamo
        lineaRama: 6150,
        lineaSelect: 6157,           // SELECT es_reclamable, estado_reclamacion, dueno_id
        sondeable: true,
        metodo: 'GET',
        forma: 'objeto',             // data es un OBJETO, no un listado
        // destino_id REAL: la rama responde 400 sin el (:6152) y la sonda no
        // inventa ids. La consulta NO menciona columnas de la 055 a proposito:
        // asi corre aunque la migracion no este aplicada y es la PROPIA rama
        // la que revela el esquema (degrada en silencio si falta, :6172-6178).
        params: function () {
          return leerDestinoIdReal().then(function (id) {
            return id ? { destino_id: id } : null;
          });
        },
        // La degradacion silenciosa devuelve 200 ok:true con
        // estado_reclamacion='no_disponible': eso es una senal de migracion,
        // no un exito. Y un 400 con la firma del despacho generico
        // ('insuficientes', api/interacciones.js:9801) significa que el
        // backend desplegado NO tiene la rama: la 055 no esta en el codigo.
        senal: {
          campo: 'estado_reclamacion',
          degradado: 'no_disponible',
          ramaAusente: ['insuficientes'],
        },
      },
      {
        tipo: 'reclamar_propiedad_solicitar', // POST, escribe la solicitud
        lineaRama: 9816,
        lineaSelect: 9919,           // CTE up+ins; ON CONFLICT (recurso_tipo, recurso_id)
                                    // WHERE estado='pendiente' en :9932
        sondeable: false,
        metodo: 'POST',
        notaSonda: 'POST y exige sesion firmada (validarSesion :9821); sin ' +
                   'credencial de sesion no hay sonda honesta por HTTP. Su ' +
                   'ON CONFLICT se prueba contra la BD en ' +
                   'scripts/smoke_055_indice_unico_reclamacion.js',
      },
      {
        tipo: 'reclamaciones',       // cola de moderacion, NO vive en esta ruta
        ruta: '/api/admin?recurso=reclamaciones', // ruta propia del admin
        lineaRama: 1879,             // api/admin.js (fichero distinto)
        lineaSelect: 1903,
        sondeable: true,
        metodo: 'GET',
        forma: 'lista',
        // Recibe el Bearer desde la MISMA fuente y con el MISMO fallback que
        // api/admin.js:87-90. El secreto NUNCA se imprime.
        cabeceras: function () {
          return { Authorization: 'Bearer ' + secretoAdmin() };
        },
      },
    ],
    // Columna que la 055 anade. Solo descriptiva, como en la 044: la rama que
    // la lee esta en es_reclamable, estado_reclamacion y dueno_id, las tres.
    columnaEsperada: 'es_reclamable',

    // ---- LAS DOS CONSULTAS QUE DISCRIMINAN -------------------------------
    // consulta_antes NO puede mencionar ninguna columna de la 055: si la
    // mencionara fallaria con 42703 en vez de contar filas.
    // La 055 no oculta filas de ningun listado (no toca un WHERE de listado),
    // asi que el par no mide "cuanto devuelve el listado": mide la poblacion
    // que el CAMINO DE RECLAMO acepta, con el WHERE exacto del UPDATE de la CTE
    // (api/interacciones.js:9922-9923). Es el conjunto sobre el que la
    // migracion promesse proteger.
    consulta_antes:
      'SELECT count(*)::int AS n FROM destinos',
    consulta_despues:
      'SELECT count(*)::int AS n FROM destinos d'
      + ' WHERE d.es_reclamable = TRUE AND d.dueno_id IS NULL'
      + ' AND d.estado_reclamacion IN (\'disponible\',\'en_revision\')',
    explained:
      'La 055 anade a public.destinos las cinco columnas de propiedad y pozo ' +
      '(es_reclamable, dueno_id, xp_pozo_acumulado, estado_reclamacion, ' +
      'pozo_actualizado_en) y crea public.reclamaciones_propiedad con el indice ' +
      'unico parcial uq_reclamaciones_recurso_pendiente. El par de conteos compara ' +
      'la poblacion total de destinos con la que el camino de reclamo acepta ' +
      '(es_reclamable y dueno_id IS NULL y estado disponible o en_revision); si ' +
      'los DEFAULT de la 055 dejan es_reclamable=true y dueno_id NULL en todas ' +
      'las filas, ambos conteos coinciden y el par NO discrimina (INDETERMINADO). ' +
      'Por eso la senal decisiva aqui es la SONDA de reclamacion_estado: la rama ' +
      '(a) api/interacciones.js:6150 con SELECT en :6157 responde 200 con las ' +
      'columnas nuevas, o degrada en silencio (esEsquemaFaltante :6172-6178 -> ' +
      'estado_reclamacion=no_disponible si el esquema falta), o si el backend ' +
      'desplegado no tiene la rama el despacho GET cae al generico Parametros ' +
      'insuficientes (:9801). La sonda pasa un destino_id REAL leido de la BD, ' +
      'nunca inventado. La rama (b) POST reclamar_propiedad_solicitar :9816 ' +
      'exige sesion firmada (:9821) y no se sondea por HTTP; su ON CONFLICT se ' +
      'prueba contra la BD en el smoke de la 055. La rama (c) recurso ' +
      'reclamaciones api/admin.js:1879 se sondea con el Bearer de ADMIN_SECRET, ' +
      'sin imprimirlo.',
  },
};

const DEFAULT_BASE = 'https://exploraco.vercel.app';
const TIMEOUT_MS = 15000;

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

// Texto largo explicativo (el campo explained del mapeo): se imprime ENTERO,
// envuelto, no truncado. limpiar() recorta a 220 y cortaria el argumento por
// la mitad, que es justo lo que este script no debe hacer.
function envolver(s, ancho) {
  // Normaliza como limpiar() pero SIN el recorte de 220: el campo explained es
  // el argumento del mapeo y cortarlo haria el veredicto inexplicable.
  const palabras = String(s == null ? '' : s)
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ');
  const lineas = [];
  let actual = '';
  for (const w of palabras) {
    if (!actual.length) { actual = w; continue; }
    if ((actual + ' ' + w).length > ancho) { lineas.push(actual); actual = w; }
    else { actual += ' ' + w; }
  }
  if (actual.length) lineas.push(actual);
  return lineas;
}

function techo(ms) {
  const ctl = new AbortController();
  const t = setTimeout(function () { ctl.abort(); }, ms);
  return { signal: ctl.signal, limpiar: function () { clearTimeout(t); } };
}

// ---------------------------------------------------------------------------
// CAPA NEON (solo lectura). Mismo patron y mismas garantias que
// scripts/neon_select.js: SELECT/WITH, una sola sentencia, DATABASE_URL desde
// .env.local, URL jamas impresa, texto SQL jamas impreso.
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

// Una consulta de conteo contra Neon. NUNCA lanza: devuelve siempre un objeto
// clasificado, porque la ausencia de credencial debe degradar el veredicto,
// nunca romper el script.
async function consultarNeon(sqlTexto) {
  const malo = validarReadOnly(sqlTexto);
  if (malo) return { ok: false, n: null, motivo: 'consulta rechazada: ' + malo };

  try { require('./load_env_local')(); }
  catch (e) { return { ok: false, n: null, motivo: 'no se pudo leer .env.local' }; }

  const url = urlValida(process.env.DATABASE_URL);
  if (!url) {
    return { ok: false, n: null, motivo: 'sin DATABASE_URL valida en .env.local' };
  }

  let neon = null;
  try { neon = require('@neondatabase/serverless').neon; }
  catch (e) { neon = null; }
  if (!neon) {
    return { ok: false, n: null, motivo: '@neondatabase/serverless no esta instalado' };
  }

  try {
    // OJO: ni la URL ni el texto SQL entran en el mensaje de error ni en la
    // salida. Solo el codigo/sqlstate, que no contiene secretos.
    const filas = await neon(url)(String(sqlTexto), []);
    const arr = Array.isArray(filas) ? filas : [];
    if (!arr.length) return { ok: false, n: null, motivo: 'Neon devolvio 0 filas a un conteo' };
    const v = arr[0].n !== undefined ? arr[0].n : arr[0][Object.keys(arr[0])[0]];
    const n = Number(v);
    if (!isFinite(n)) return { ok: false, n: null, motivo: 'conteo no numerico devuelto por Neon' };
    return { ok: true, n: n, motivo: '' };
  } catch (e) {
    const codigo = (e && e.code) ? String(e.code) : 'error';
    return { ok: false, n: null, motivo: 'Neon respondio ' + limpiar(codigo) };
  }
}

// Igual que consultarNeon pero devuelve la PRIMERA FILA cruda, no un conteo.
// La usa la sonda de reclamacion_estado para leer un destino_id REAL. Mismas
// garantias: solo SELECT/WITH, DATABASE_URL en memoria, ni URL ni SQL impresos.
async function consultarNeonFila(sqlTexto) {
  const malo = validarReadOnly(sqlTexto);
  if (malo) return { ok: false, fila: null, motivo: 'consulta rechazada: ' + malo };

  try { require('./load_env_local')(); }
  catch (e) { return { ok: false, fila: null, motivo: 'no se pudo leer .env.local' }; }

  const url = urlValida(process.env.DATABASE_URL);
  if (!url) {
    return { ok: false, fila: null, motivo: 'sin DATABASE_URL valida en .env.local' };
  }

  let neon = null;
  try { neon = require('@neondatabase/serverless').neon; }
  catch (e) { neon = null; }
  if (!neon) {
    return { ok: false, fila: null, motivo: '@neondatabase/serverless no esta instalado' };
  }

  try {
    const filas = await neon(url)(String(sqlTexto), []);
    const arr = Array.isArray(filas) ? filas : [];
    if (!arr.length) return { ok: false, fila: null, motivo: 'Neon devolvio 0 filas' };
    return { ok: true, fila: arr[0], motivo: '' };
  } catch (e) {
    const codigo = (e && e.code) ? String(e.code) : 'error';
    return { ok: false, fila: null, motivo: 'Neon respondio ' + limpiar(codigo) };
  }
}

// destino_id REAL para la sonda de reclamacion_estado. La consulta NO menciona
// ninguna columna de la 055: si la migracion no estuviera aplicada, esta
// consulta seguiria corriendo y es la rama sondeada la que revelaria el
// esquema (degradacion silenciosa), que es justo lo que se quiere medir.
function leerDestinoIdReal() {
  return consultarNeonFila('SELECT id::text AS id FROM destinos ORDER BY id LIMIT 1')
    .then(function (r) {
      return (r.ok && r.fila && r.fila.id) ? String(r.fila.id) : null;
    });
}

// Secreto de admin: MISMA fuente y MISMO fallback que api/admin.js:87-90
// (process.env.ADMIN_SECRET || 'exploraco12345'). Se usa en memoria para
// construir la cabecera Bearer y NUNCA se imprime.
function secretoAdmin() {
  return process.env.ADMIN_SECRET || 'exploraco12345';
}

// ---------------------------------------------------------------------------
// LOGICA DE DECISION (el corazon del script).
//
// Entradas: las TRES cifras, y solo ellas.
//   viejo = filas en Neon con la consulta sin la migracion (codigo viejo)
//   nuevo = filas en Neon con la consulta con la migracion (codigo nuevo)
//   prod  = filas que devolvio el listado de produccion
//
// Los cuatro estados son MUTUAMENTE EXCLUYENTES por construccion, en este
// orden de evaluacion:
//   1) viejo === nuevo            -> INDETERMINADO. El dato no discrimina.
//                                   Se evalua PRIMERO porque en ese caso prod
//                                   puede coincidir con los dos a la vez y sin
//                                   esta guarda dos estados se solaparian.
//   2) prod === nuevo && prod < viejo -> OK CONFIRMADO. Produccion devuelve
//                                   menos filas de las que daria el codigo viejo
//                                   y exactamente las que predice el nuevo:
//                                   el filtro esta desplegado.
//   3) prod === viejo             -> NO APLICADA EN CODIGO. Produccion devuelve
//                                   justo lo que devolveria el codigo sin la
//                                   migracion: el filtro no esta desplegado.
//   4) ninguno de los dos        -> AMBIGUO. No se adivina: se muestran las
//                                   tres cifras y sale exit 1.
//
// Con viejo !== nuevo, las condiciones 2 y 3 no pueden cumplirse a la vez
// (exigir prod === nuevo y prod === viejo). La 4 es por definicion la
// negacion de 2 y 3. Y la 1absorbe el unico solape posible. Covering total y
// sin solapes.
// ---------------------------------------------------------------------------
function decidir(viejo, nuevo, prod) {
  if (viejo === nuevo) {
    return {
      estado: 'INDETERMINADO',
      codigo: 1,
      razon: 'la consulta sin migracion y la consulta con migracion devuelven la ' +
             'misma cifra (' + viejo + '): el dato NO discrimina entre codigo viejo y ' +
             'codigo nuevo. No se puede afirmar nada.',
    };
  }
  if (prod === nuevo && prod < viejo) {
    return {
      estado: 'OK CONFIRMADO',
      codigo: 0,
      razon: 'produccion devuelve ' + prod + ' fila(s): menos que las ' + viejo +
             ' del codigo viejo y exactamente las ' + nuevo + ' del codigo nuevo. ' +
             'El filtro esta DESPLEGADO.',
    };
  }
  if (prod === viejo) {
    return {
      estado: 'NO APLICADA EN CODIGO',
      codigo: 1,
      razon: 'produccion devuelve ' + prod + ' fila(s), exactamente lo que devolveria ' +
             'el codigo VIEJO (sin migracion). El filtro NO esta desplegado, aunque la ' +
             'columna exista en la base.',
    };
  }
  return {
    estado: 'AMBIGUO',
    codigo: 1,
    razon: 'produccion devuelve ' + prod + ' fila(s) y NO coincide ni con lo que ' +
           'predice el codigo viejo (' + viejo + ') ni con lo que predice el codigo ' +
           'nuevo (' + nuevo + '). No se adivina: revisar LIMIT, otro consumidor de ' +
           'la tabla o un despliegue parcial.',
  };
}

// ---------------------------------------------------------------------------
// Sonda HTTP. GET sin efectos. Devuelve siempre un estado clasificado.
// ---------------------------------------------------------------------------
async function pedir(base, ruta, cabeceras, metodo, cuerpo) {
  const g = techo(TIMEOUT_MS);
  try {
    // metodo y cuerpo son OPT-IN: sin ellos la llamada queda identica a antes
    // (GET, sin cuerpo), que es lo que la 044 necesita y ya daba verde.
    const cab = Object.assign({}, cabeceras || {});
    const op = { method: metodo || 'GET', headers: cab, signal: g.signal };
    if (cuerpo !== undefined && cuerpo !== null) {
      op.body = (typeof cuerpo === 'string') ? cuerpo : JSON.stringify(cuerpo);
      const tieneCt = Object.keys(cab).some(function (k) { return k.toLowerCase() === 'content-type'; });
      if (!tieneCt) cab['Content-Type'] = 'application/json';
    }
    const r = await fetch(base + ruta, op);
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
// Tres senales, porque el backend las emite de tres maneras distintas:
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

// Clasificacion de UNA sonda de listado. Niveles de transporte/fallo:
//   SIN_VERIFICAR  no hubo respuesta (red/timeout)   -> no dice nada
//   FALLIDO_42703  el backend pide una columna ausente -> migracion no desplegada
//   ERROR_5XX / ERROR_4XX                           -> fallo de la peticion
//   OK             el listado respondio con data     -> filas comparables
function clasificar(r, forma) {
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
  if (forma === 'objeto') {
    // Ramas como reclamacion_estado devuelven data como OBJETO, no listado.
    if (!b.data || typeof b.data !== 'object' || Array.isArray(b.data)) {
      return {
        estado: 'ERROR_5XX',
        ok: false,
        razon: 'ok:true pero data no es un objeto: la forma de la respuesta cambio.',
      };
    }
    return {
      estado: 'OK',
      ok: true,
      razon: 'Respuesta correcta (data es un objeto con ' +
             Object.keys(b.data).length + ' campo(s)).',
    };
  }
  if (!Array.isArray(b.data)) {
    return {
      estado: 'ERROR_5XX',
      ok: false,
      razon: 'ok:true pero data no es un array: la forma de la respuesta cambio.',
    };
  }
  // Array VACIO es un resultado correcto: con el filtro desplegado no hay ningun
  // plan vigente. Un array vacio NO es un fallo, es una de las tres cifras.
  return {
    estado: 'OK',
    ok: true,
    razon: 'Listado correcto, ' + b.data.length + ' fila(s). Un array vacio es ' +
           'correcto: ningun plan vigente (el filtro de la 044 oculta los vencidos).',
  };
}

// Construye la URL de la sonda. OPT-IN por tipo:
//   - si el tipo declara ruta propia, se usa tal cual (admin) y NO se le anade
//     'tipo': su ruta ya trae el recurso;
//   - si no, se anade 'tipo' como siempre (comportamiento historico);
//   - params: objeto de query extra (puede traer el destino_id real).
function construirRuta(t, m, params) {
  const base = t.ruta || m.ruta;
  const partes = [];
  if (!t.ruta) partes.push('tipo=' + encodeURIComponent(t.tipo));
  if (params) {
    Object.keys(params).forEach(function (k) {
      if (params[k] === undefined || params[k] === null) return;
      partes.push(encodeURIComponent(k) + '=' + encodeURIComponent(params[k]));
    });
  }
  if (!partes.length) return base;
  const sep = (base.indexOf('?') === -1) ? '?' : '&';
  return base + sep + partes.join('&');
}

// Interpreta la respuesta de UNA sonda con senal declarada como veredicto de
// migracion. Devuelve null si no es interpretable (se sigue con los conteos).
// Tres desenlaces, todos REALES:
//   (i)   200 ok:true, campo != valor degradado -> migracion VIVA.
//   (ii)  200 ok:true, campo == valor degradado -> esquema ausente (la rama
//         degrada en silencio). La sonda SI respondio: resultado valido.
//   (iii) 400 con la firma de rama ausente -> el backend desplegado no tiene la
//         rama: la migracion no esta en el CODIGO (aunque este en la BD).
function veredictoSenal(principal) {
  if (!principal || !principal.senal) return null;
  const s = principal.senal;
  const r = principal.r || {};
  const b = (r.json && typeof r.json === 'object') ? r.json : null;

  if (principal.estado === 'OK' && s.campo) {
    const data = (b && b.data && typeof b.data === 'object') ? b.data : null;
    const val = data ? data[s.campo] : undefined;
    if (String(val) === String(s.degradado)) {
      return {
        estado: 'NO APLICADA EN BASE',
        codigo: 1,
        razon: 'la rama responde 200 pero degrada en silencio: ' + s.campo + '=' +
               s.degradado + '. El esquema de la migracion NO existe en la base ' +
               '(esEsquemaFaltante). Aplicar la migracion en Neon y re-desplegar.',
      };
    }
    return {
      estado: 'OK CONFIRMADO',
      codigo: 0,
      razon: 'la rama responde 200 y devuelve ' + s.campo + '=' + String(val) +
             ', distinto del valor degradado ' + s.degradado + ': las columnas ' +
             'de la migracion existen y el backend desplegado las lee. La ' +
             'migracion esta VIVA en produccion.',
    };
  }

  if (principal.estado === 'ERROR_4XX' && Array.isArray(s.ramaAusente)) {
    const err = String((b && (b.error || b.detalle)) || '');
    for (const frag of s.ramaAusente) {
      if (err.indexOf(frag) !== -1) {
        return {
          estado: 'NO APLICADA EN CODIGO',
          codigo: 1,
          razon: 'la rama no existe en el backend desplegado: HTTP ' + r.status +
                 ' "' + limpiar(err) + '". Esa firma es el despacho generico SIN ' +
                 'esta rama. La base puede tener la migracion, pero el codigo que ' +
                 'la consume NO esta desplegado: falta desplegar api/.',
        };
      }
    }
  }
  return null;
}

function check(label, cond, extra) {
  console.log((cond ? 'PASS' : 'FAIL') + ' - ' + label + (extra ? ' | ' + extra : ''));
  if (!cond) process.exitCode = 1;
}

// ---------------------------------------------------------------------------
// MAIN
// ---------------------------------------------------------------------------

function uso() {
  console.log('USO: node scripts/verificar_migraciones_prod.js <MIGRACION.sql> [BASE_URL]');
  console.log('  MIGRACION.sql  obligatorio. Ej: 044_planes_viaje_fecha_inicio.sql');
  console.log('  BASE_URL       opcional. Default: ' + DEFAULT_BASE);
  console.log('  SIN CREDENCIALES: usa DATABASE_URL de .env.local en solo lectura.');
  console.log('                  Si no existe, degrada a NO_CONFIRMADO (no falla).');
}

// Resuelto DENTRO de main (no al cargar el modulo) para que el arnes de pruebas
// pueda fijar process.argv y reutilizar este mismo archivo sin editarlo.
function baseDe(argv) {
  return String(argv[3] || process.env.BASE_URL || DEFAULT_BASE).replace(/\/+$/, '');
}

async function main(argv) {
  argv = argv || process.argv;
  const MIGRACION = argv[2];
  const BASE = baseDe(argv);

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
    console.log('       ruta, tipos, consulta_antes y consulta_despues, en lugar de');
    console.log('       inventar el binding aqui.');
    process.exitCode = 1;
    return 1;
  }

  const m = MAPEO[clave];
  console.log('== MIGRACION: ' + limpiar(MIGRACION));
  console.log('== BASE: ' + BASE);
  console.log('== ENDPOINT: ' + m.metodo + ' ' + m.ruta + ' (' + m.funcion + ') tabla=' + m.tabla);
  console.log('== COLUMNA ESPERADA: ' + m.columnaEsperada);
  console.log('== ESTA VERIFICACION ES SOLO LECTURA (GET + SELECT). NO DEPLIEGA NI ESCRIBE.');
  console.log('');

  // El par de consultas es parte del mapeo explicito. Sin el no hay veredicto
  // posible, asi que se dice y se degrada; no se infiere en runtime.
  const tienePar = !!(m.consulta_antes && m.consulta_despues);
  if (!tienePar) {
    console.log('FAIL - El mapeo de ' + m.tabla + ' no declara consulta_antes ni');
    console.log('       consulta_despues. Sin el par no hay forma de saber que');
    console.log('       devolveria el codigo viejo, asi que NO se emite veredicto.');
    process.exitCode = 1;
    return 1;
  }
  console.log('== POR QUE ESTAS DOS CONSULTAS DISCRIMINAN:');
  for (const l of envolver(m.explained, 74)) console.log('   ' + l);
  console.log('');

  // --- 2) Sondas de listado ------------------------------------------------
  const resultados = [];
  const sondeables = m.tipos.filter(function (t) { return t.sondeable; });
  for (const t of sondeables) {
    // params/cabeceras OPT-IN por tipo; pueden ser objeto o funcion (async).
    let params = (typeof t.params === 'function') ? await t.params() : t.params;
    let cabeceras = (typeof t.cabeceras === 'function') ? await t.cabeceras() : t.cabeceras;
    const metodo = t.metodo || 'GET';

    // Si el tipo declaro params pero no se pudieron resolver (p.ej. un
    // destino_id REAL que no se pudo leer de la BD), la sonda NO se inventa:
    // se declara SIN_VERIFICAR, distinto de "respondio y dijo no_disponible".
    if (t.params !== undefined && (params === null || params === undefined)) {
      const razon = 'no se pudo resolver un parametro real de la sonda (destino_id): la BD no respondio.';
      resultados.push({ tipo: t.tipo, lineaRama: t.lineaRama, lineaSelect: t.lineaSelect,
        estado: 'SIN_VERIFICAR', filas: null, senal: t.senal,
        r: { alcanzable: false, status: 0, json: null, cuerpo: '', motivo: 'param no resuelto' },
        razon: razon });
      check(metodo + ' tipo=' + t.tipo + ' [SIN_VERIFICAR]', false,
        'linea=' + t.lineaRama + ' select=' + t.lineaSelect + ' | ' + razon);
      continue;
    }

    const ruta = construirRuta(t, m, params);
    const r = await pedir(BASE, ruta, cabeceras, metodo, t.cuerpo);
    const c = clasificar(r, t.forma);
    const filas = (r.json && Array.isArray(r.json.data)) ? r.json.data.length : null;
    resultados.push({ tipo: t.tipo, lineaRama: t.lineaRama, lineaSelect: t.lineaSelect,
      estado: c.estado, filas: filas, senal: t.senal, r: r, razon: c.razon });
    check(metodo + ' tipo=' + t.tipo + ' [' + c.estado + ']',
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
    console.log('INFO - tipo=' + t.tipo + ' no sondeado (' + (t.notaSonda || 'exige usuario_id') + ').' +
                ' Rama en linea ' + t.lineaRama + ', select en ' + t.lineaSelect + '.');
  }

  // --- 3) Salud de plataforma via api/utilidades.js ------------------------
  // OJO: el cuerpo de diagnostico puede contener info sensible, asi que aqui
  // NUNCA se imprime: solo se usa el status. Su unico papel es DESACTIVAR la
  // migracion como causa raiz cuando la plataforma esta caida.
  console.log('');
  const diag = await pedir(BASE, '/api/utilidades?tipo=diagnostico', {});
  let salud = { estado: 'SIN_VERIFICAR', texto: '' };
  if (!diag.alcanzable) {
    salud = { estado: 'SIN_VERIFICAR', texto: 'api/utilidades.js no respondio (' + limpiar(diag.motivo) + ')' };
  } else if (diag.status === 200 && diag.json && diag.json.ok === true) {
    salud = { estado: 'SALUDABLE', texto: 'diagnostico 200' };
  } else if (diag.status === 401 || diag.status === 403) {
    salud = {
      estado: 'VIVA_CON_AUTH',
      texto: 'diagnostico http=' + diag.status,
    };
  } else {
    salud = {
      estado: 'ERROR_5XX',
      texto: 'diagnostico http=' + diag.status,
    };
  }
  console.log('SALUD PLATAFORMA - ' + salud.estado + ' | ' + salud.texto);
  if (salud.estado === 'SIN_VERIFICAR' || salud.estado === 'ERROR_5XX') {
    console.log('  ATENCION: sin senal de plataforma, no se puede atribuir un fallo al listado.');
  }

  // --- 4) COMPROBACION CON BASE DE DATOS: las TRES cifras -------------------
  // Se consultan LAS DOS consultas del mapeo, siempre que se pueda. La falta de
  // DATABASE_URL degrada, no rompe: se registra el motivo y se sigue.
  console.log('');
  console.log('== BASE DE DATOS (solo lectura, sin imprimir URL ni SQL)');
  const antes = await consultarNeon(m.consulta_antes);
  const despues = await consultarNeon(m.consulta_despues);
  console.log('   neon_antes   (codigo viejo) : ' +
    (antes.ok ? antes.n + ' fila(s)' : 'n/d [' + limpiar(antes.motivo) + ']'));
  console.log('   neon_despues (codigo nuevo) : ' +
    (despues.ok ? despues.n + ' fila(s)' : 'n/d [' + limpiar(despues.motivo) + ']'));
  const neonUtil = antes.ok && despues.ok;

  // --- 5) Veredicto --------------------------------------------------------
  const fallos = resultados.filter(function (x) { return x.estado !== 'OK'; });
  const principal = resultados.length ? resultados[0] : null;
  const filasProd = principal ? principal.filas : null;

  // Imprime SIEMPRE las tres cifras: sin ellas el veredicto no es auditable.
  function tresCifras() {
    console.log('   filas_neon_consulta_vieja : ' + (antes.ok ? antes.n : 'n/d'));
    console.log('   filas_neon_consulta_nueva : ' + (despues.ok ? despues.n : 'n/d'));
    console.log('   filas_produccion          : ' + (filasProd === null ? 'n/d' : filasProd));
  }
  tresCifras();

  let estado, veredicto, codigo;
  // Se calcula UNA vez: si la sonda principal trae senal declarada, su
  // respuesta ya es evidencia directa y manda sobre los conteos degenerados.
  const senalVeredicto = principal ? veredictoSenal(principal) : null;

  if (!resultados.length || !principal) {
    estado = 'SIN_VERIFICAR';
    veredicto = 'SIN_VERIFICAR - no se pudo sondear produccion.';
    codigo = 1;
  } else if (principal.estado === 'SIN_VERIFICAR') {
    // Produccion caida. Fallo DISTINTO de un fallo de migracion: aqui no hay
    // dato de ninguna parte y no se declara nada sobre la migracion.
    estado = 'SIN_VERIFICAR';
    veredicto = 'SIN_VERIFICAR - PRODUCCION NO RESPONDE (' + limpiar(principal.razon) + '). ' +
                'No se afirma nada sobre la migracion: no se pudo mirar produccion. ' +
                'La base si respondio o no, esto es un fallo de transporte.';
    codigo = 1;
  } else if (principal.estado === 'FALLIDO_42703') {
    // El backend pide una columna que no existe: el codigo nuevo esta desplegado
    // pero la base no tiene la migracion. Veredicto firme sin necesitar Neon.
    estado = 'FALLIDO_42703';
    veredicto = 'FALLIDO_42703 - la migracion NO esta desplegada en la base: el backend ' +
                'desplegado lee ' + m.columnaEsperada + ' y la base responde que no existe. ' +
                'Aplicar la migracion en Neon; desplegar el backend NO basta.';
    codigo = 1;
  } else if (senalVeredicto) {
    // Sonda con senal declarada: su respuesta ES evidencia directa de la
    // migracion (viva, o esquema ausente, o rama ausente del backend), asi que
    // manda sobre los conteos, que en la 055 son degenerados (219 === 219).
    estado = senalVeredicto.estado;
    veredicto = senalVeredicto.estado + ' - ' + senalVeredicto.razon;
    codigo = senalVeredicto.codigo;
  } else if (fallos.length > 0) {
    estado = principal.estado;
    veredicto = 'FALLO - ' + principal.estado + ' en ' + m.ruta + '. Diagnostico de ' +
                'plataforma: ' + salud.estado + '.';
    codigo = 1;
  } else if (!neonUtil) {
    // Neon no respondio: NO_CONFIRMADO con motivo, no un fallo de migracion.
    estado = 'NO_CONFIRMADO';
    veredicto = 'NO_CONFIRMADO - produccion respondio ' + filasProd + ' fila(s), pero la ' +
                'base de datos no pudo consultarse (' + limpiar(antes.ok ? despues.motivo : antes.motivo) + '). ' +
                'Sin los dos conteos NO se puede separar codigo nuevo de codigo viejo. ' +
                'No es un fallo de la migracion: es falta de resolucion.';
    codigo = 1;
  } else if (filasProd === null) {
    estado = 'NO_CONFIRMADO';
    veredicto = 'NO_CONFIRMADO - el listado respondio sin 42703 pero sin forma de contar ' +
                'las filas. No se puede decidir.';
    codigo = 1;
  } else {
    const d = decidir(antes.n, despues.n, filasProd);
    estado = d.estado;
    veredicto = d.estado + ' - ' + d.razon;
    codigo = d.codigo;
  }

  console.log('');
  console.log('== RESUMEN');
  console.log('   veredicto  : ' + veredicto);
  tresCifras();
  console.log('   neon_uso   : ' + (neonUtil ? 'si' : 'no'));
  console.log('   endpoint   : ' + m.metodo + ' ' + m.ruta);
  console.log('   sonda      : tipo=' + (principal ? principal.tipo : 'n/d') +
              ' rama=' + (principal ? principal.lineaRama : 'n/d') +
              ' select=' + (principal ? principal.lineaSelect : 'n/d') +
              ' senal=' + (principal && principal.senal ? principal.senal.campo : 'no'));
  console.log('   estados    : ' + (resultados.length
    ? resultados.map(function (x) { return x.tipo + '=' + x.estado; }).join(', ')
    : 'sin sondas'));
  console.log('   plataforma : ' + salud.estado);
  console.log('   exit code  : ' + codigo);
  process.exitCode = codigo;
  return codigo;
}

// Exposicion para el arnes de pruebas: importar este archivo NO ejecuta nada.
module.exports = {
  decidir: decidir,
  clasificar: clasificar,
  consultarNeon: consultarNeon,
  consultarNeonFila: consultarNeonFila,
  validarReadOnly: validarReadOnly,
  urlValida: urlValida,
  construirRuta: construirRuta,
  veredictoSenal: veredictoSenal,
  main: main,
  MAPEO: MAPEO,
};

if (require.main === module) {
  if (!process.argv[2]) {
    console.log('FAIL - Falta el argumento obligatorio MIGRACION.sql');
    uso();
    process.exitCode = 2;
  } else {
    main(process.argv);
  }
}