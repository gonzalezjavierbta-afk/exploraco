// ===========================================================================
// smoke_zona_paridad.js
// Gate de paridad del mapa departamento -> zona (ADR-097 D2).
//
// POR QUE EXISTE (duplicacion INTENCIONAL, divergencia NO tolerable):
//   El mapa vive EXCLUSIVAMENTE en el generador scripts/generar-geo-ciudades.js.
//   Pero api/publicar-lugar.js es serverless y necesita su propia copia inline
//   para derivar la zona cuando el cliente no la manda; no puede leer el
//   artefacto estatico sin arrastrarlo al bundle de Vercel. Hay DOS tablas a
//   proposito; lo que no se acepta es que diverjan en SILENCIO. Este smoke es
//   lo que acota esa duplicacion (mismo patron que sqlNormGeo vs normGeo).
//
// QUE COMPRUEBA (5 bloques):
//   A. Paridad clave a clave entre las dos tablas del mapa. Falla si hay
//      CUALQUIER diferencia y nombra el departamento y los dos valores.
//   B. Los dos vocabularios de zona contra la fuente de verdad en disco:
//      migracion 027 (zonas_geograficas) y migracion 028 (destinos.zona_chk).
//   C. El seed db/seeds/geo_ciudades_seed.json: 33 departamentos, todos con
//      zona resoluble por el mapa del generador.
//   D. El artefacto ya generado geo-ciudades.js: filas bien formadas y 33
//      departamentos con zona.
//   E. Neon (OPCIONAL, solo lectura): SELECT slug FROM zonas_geograficas.
//      Si no hay DATABASE_URL o no hay red, NO es fallo: se degrada y se
//      dice explicitamente que la fuente de verdad no se pudo comprobar.
//
// USO
//   node scripts/smoke_zona_paridad.js
//   node scripts/smoke_zona_paridad.js --sin-neon   (sin red: se salta el bloque E)
//   node scripts/smoke_zona_paridad.js --raiz <otra_raiz>   (solo para pruebas)
//   Exit 0 = todo cuadra. Exit distinto de 0 = hay divergencia. Un smoke que
//   siempre pasa no sirve: por eso compara y por eso aborta con codigo 1.
//
// SOLO LECTURA: este fichero no escribe, no genera y no regenera nada. El
// generador NO se ejecuta (main() sobreescribe geo-ciudades.js): sus tablas
// se extraen del texto por literals y se evaluan en una sandbox sin require.
//
// ASCII-safe (ADR-002): 0 bytes > 127, 0 backticks, escapes \uXXXX simples.
// CommonJS estricto (BUG-001).
// ===========================================================================
'use strict';

var fs = require('fs');
var path = require('path');
var vm = require('vm');

// --- Resolucion de raiz: la del repo salvo --raiz (pruebas con copia temp) ---
// --- SIN_NEON: con --sin-neon se salta por completo el bloque E (red). Sin el
// --- flag, el bloque E se mantiene opcional y degradable como siempre.
var RAIZ = path.resolve(__dirname, '..');
var SIN_NEON = false;
for (var ai = 2; ai < process.argv.length; ai++) {
  if (process.argv[ai] === '--raiz' && process.argv[ai + 1]) {
    RAIZ = path.resolve(process.argv[ai + 1]);
  } else if (process.argv[ai] === '--sin-neon') {
    SIN_NEON = true;
  }
}

var RUTA_GEN = path.join(RAIZ, 'scripts', 'generar-geo-ciudades.js');
var RUTA_API = path.join(RAIZ, 'api', 'publicar-lugar.js');
var RUTA_ART = path.join(RAIZ, 'geo-ciudades.js');
var RUTA_SEED = path.join(RAIZ, 'db', 'seeds', 'geo_ciudades_seed.json');
var RUTA_027 = path.join(RAIZ, 'db', 'migrations', '027_zonas_marcas.sql');
var RUTA_028 = path.join(RAIZ, 'db', 'migrations', '028_destinos_zona.sql');

var DEPTOS_ESPERADOS = 33;

// ---------------------------------------------------------------------------
// Acumuladores
// ---------------------------------------------------------------------------
var passed = 0;
var fails = [];
var avisos = [];

function check(ok, etiquetaOk, etiquetaFail) {
  if (ok) {
    passed++;
    console.log('PASS ' + etiquetaOk);
  } else {
    fails.push(etiquetaFail);
    console.log('FAIL ' + etiquetaFail);
  }
  return ok;
}

function aviso(txt) {
  avisos.push(txt);
  console.log('AVISO ' + txt);
}

function seccion(t) {
  console.log('');
  console.log('--- ' + t + ' ---');
}

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------
function leer(ruta) {
  return fs.readFileSync(ruta, 'utf8');
}

// Clave canonica de departamento: minusculas, sin diacriticos y SIN NINGUN
// separador. Asi 'bogota d.c.' (backend) y 'bogota d c' (generador) colapsan al
// mismo canon. Ojo: esto NO borra la divergencia de una clave que nombre otro
// departamento (p.ej. San Andres); eso se reporta aparte y tambien falla.
function canonKey(s) {
  return String(s)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

// Extrae un literal de objeto declarado como var|const|let NOMBRE = { ... }
// SIN ejecutar el modulo: se resuelve el llave de apertura, se emparejan las
// llaves y se evalua SOLO el literal en una sandbox sin require ni globals.
function extraerObjeto(src, nombre) {
  // OJO: el nombre puede aparecer antes DENTRO de un bloque de comentario (el
  // generador documenta ahi una copia del mapeo). Por eso se recorren TODAS las
  // coincidencias y se devuelve la primera que se deja EVALUAR; emparejar llaves
  // a pelo sobre un bloque comentado daria un literal sin cerrar.
  var re = new RegExp('(?:var|const|let)\\s+' + nombre + '\\s*=\\s*\\{', 'g');
  var m;
  while ((m = re.exec(src)) !== null) {
    var lit = recorteLiteral(src, src.indexOf('{', m.index));
    if (!lit) continue;
    var caja = Object.create(null);
    vm.createContext(caja);
    try {
      var v = vm.runInContext('(' + lit + ')', caja, { timeout: 1000 });
      if (v && typeof v === 'object' && Object.keys(v).length) return v;
    } catch (e) { /* el siguiente */ }
  }
  return null;
}

// Devuelve el literal de objeto que abre en la posicion ini, emparejando llaves y
// respetando cadenas; null si nunca se cierra.
function recorteLiteral(src, ini) {
  var prof = 0;
  var enCadena = false;
  var esc = false;
  for (var i = ini; i < src.length; i++) {
    var c = src.charAt(i);
    if (enCadena) {
      if (esc) { esc = false; continue; }
      if (c === '\\') { esc = true; continue; }
      if (c === '"' || c === "'") enCadena = false;
      continue;
    }
    if (c === '"' || c === "'") { enCadena = true; continue; }
    if (c === '{') prof++;
    else if (c === '}') {
      prof--;
      if (prof === 0) return src.slice(ini, i + 1);
    }
  }
  return null;
}

// Slugs de zonas_geograficas sembrados por la migracion 027.
function slugsDe027(txt) {
  var out = [];
  var re = /INSERT INTO zonas_geograficas[\s\S]*?VALUES([\s\S]*?);/;
  var m = re.exec(txt);
  if (!m) return out;
  var re2 = /\(\s*'([^']+)'\s*,/g;
  var m2;
  while ((m2 = re2.exec(m[1])) !== null) out.push(m2[1]);
  return out;
}

// Valores admitidos por el CHECK destinos_zona_chk de la migracion 028.
function valoresDe028(txt) {
  var out = [];
  var re = /CHECK\s*\(\s*zona IS NULL OR zona IN\s*\(([^)]*)\)/i;
  var m = re.exec(txt);
  if (!m) return out;
  var re2 = /'([^']+)'/g;
  var m2;
  while ((m2 = re2.exec(m[1])) !== null) out.push(m2[1]);
  return out;
}

function iguales(a, b) {
  var x = Object.keys(a).sort();
  var y = Object.keys(b).sort();
  if (x.length !== y.length) return false;
  for (var i = 0; i < x.length; i++) if (x[i] !== y[i]) return false;
  return true;
}

function lista(v) { return '[' + v.join(', ') + ']'; }

// ---------------------------------------------------------------------------
// Arranque
// ---------------------------------------------------------------------------
console.log('=== SMOKE ZONA PARIDAD (generador vs api/publicar-lugar.js) ===');
console.log('raiz: ' + RAIZ);

var faltantes = [RUTA_GEN, RUTA_API, RUTA_ART, RUTA_SEED].filter(function (p) {
  return !fs.existsSync(p);
});
if (faltantes.length) {
  console.log('FAIL no se encuentra: ' + lista(faltantes));
  console.log('');
  console.log('RESULTADO: FAIL (' + (faltantes.length) + ' ficheros ausentes).');
  process.exit(1);
}

var SRC_GEN = leer(RUTA_GEN);
var SRC_API = leer(RUTA_API);

// ===========================================================================
// A. LAS DOS TABLAS DEL MAPA, CLAVE A CLAVE
// ===========================================================================
seccion('A. paridad departamento -> zona');

var MAPA_GEN = extraerObjeto(SRC_GEN, 'ZONA_POR_DEPARTAMENTO');
var MAPEO_GEN = extraerObjeto(SRC_GEN, 'ZONAS_ZG_A_DESTINOS');
var MAPA_API = extraerObjeto(SRC_API, 'DEPTO_ZONA');
var ZONAS_API = extraerObjeto(SRC_API, 'ZONAS');   // array, no objeto: se trata aparte

if (!MAPA_GEN || !MAPEO_GEN || !MAPA_API) {
  console.log('FAIL no se pudo extraer una tabla del mapa (literales no encontrados).');
  fails.push('extraccion de tablas');
  MAPA_GEN = MAPA_GEN || {};
  MAPEO_GEN = MAPEO_GEN || {};
  MAPA_API = MAPA_API || {};
}

// El backend declara la lista cerrada como ARRAY: se extrae aparte.
var RE_ZONAS_API = /(?:var|const|let)\s+ZONAS\s*=\s*(\[[\s\S]*?\]);/;
var mZ = RE_ZONAS_API.exec(SRC_API);
var ZONAS_API_LIST = mZ
  ? vm.runInContext(mZ[1], vm.createContext(Object.create(null)), { timeout: 1000 })
  : null;

var clavesGen = Object.keys(MAPA_GEN);
var clavesApi = Object.keys(MAPA_API);

// Indice canonico de cada lado (canon -> claves originales que lo producen).
var idxGen = {};
clavesGen.forEach(function (k) {
  var c = canonKey(k);
  (idxGen[c] = idxGen[c] || []).push(k);
});
var idxApi = {};
clavesApi.forEach(function (k) {
  var c = canonKey(k);
  (idxApi[c] = idxApi[c] || []).push(k);
});

check(clavesGen.length === DEPTOS_ESPERADOS,
  'A1 el generador declara ' + DEPTOS_ESPERADOS + ' departamentos (' +
    clavesGen.length + ')',
  'A1 el generador declara ' + DEPTOS_ESPERADOS + ' departamentos pero tiene ' +
    clavesGen.length + ': ' + lista(clavesGen));

// Colisiones de canon: dos claves distintas que colapsan al mismo canon.
Object.keys(idxGen).forEach(function (c) {
  if (idxGen[c].length > 1) {
    fails.push('colision canon generador: ' + lista(idxGen[c]));
    console.log('FAIL colision canon en el generador: ' + lista(idxGen[c]) +
      ' -> todas cuentan como "' + c + '"');
  }
});
Object.keys(idxApi).forEach(function (c) {
  if (idxApi[c].length > 1) {
    fails.push('colision canon backend: ' + lista(idxApi[c]));
    console.log('FAIL colision canon en el backend: ' + lista(idxApi[c]) +
      ' -> todas cuentan como "' + c + '"');
  }
});

// Cruce clave a clave: para cada departamento del generador, su zona tal como
// se persiste (mapeo ZG -> destinos) contra la zona del backend.
var sinPareja = 0;
var divergentes = 0;
Object.keys(idxGen).sort().forEach(function (c) {
  var kGen = idxGen[c][0];
  var zgGen = MAPA_GEN[kGen];                     // slug de zonas_geograficas
  var zDestGen = MAPEO_GEN[zgGen];                // slug de destinos.zona
  var kApi = idxApi[c] ? idxApi[c][0] : null;

  if (!kApi) {
    sinPareja++;
    fails.push('departamento "' + kGen + '" sin clave equivalente en el backend');
    console.log('FAIL A2 el departamento "' + kGen + '" existe en el generador ' +
      '(zona ' + zgGen + ' -> ' + zDestGen + ') pero NO hay clave equivalente en ' +
      'api/publicar-lugar.js: DEPTO_ZONA no lo cubre');
    return;
  }
  if (zDestGen === undefined) {
    fails.push('mapeo ZG->destinos sin entrada para ' + zgGen);
    console.log('FAIL A2 "' + kGen + '" tiene zona "' + zgGen + '" que no existe ' +
      'en ZONAS_ZG_A_DESTINOS del generador');
    return;
  }
  var zApi = MAPA_API[kApi];
  if (zDestGen !== zApi) {
    divergentes++;
    fails.push('"' + kGen + '" (="' + kApi + '"): generador ' + zgGen + '->' +
      zDestGen + ' vs backend ' + zApi);
    console.log('FAIL A3 zona divergente en "' + kGen + '" (clave backend "' + kApi +
      '"): generador ' + zgGen + ' -> ' + zDestGen + ' | backend ' + zApi);
    return;
  }
  passed++;
  console.log('PASS A3 "' + kGen + '" -> ' + zDestGen);
});

// Departamentos que solo existen en el backend: sobran respecto al generador.
Object.keys(idxApi).sort().forEach(function (c) {
  if (!idxGen[c]) {
    var kApi = idxApi[c][0];
    fails.push('departamento "' + kApi + '" solo en el backend');
    console.log('FAIL A4 "' + kApi + '" existe en api/publicar-lugar.js (zona ' +
      MAPA_API[kApi] + ') pero NO en el mapa del generador');
  }
});

console.log('');
console.log('A5 resumen: ' + clavesGen.length + ' en generador, ' + clavesApi.length +
  ' en backend, ' + divergentes + ' con zona distinta, ' + sinPareja +
  ' sin clave equivalente en el backend');

// ===========================================================================
// B. VOCABULARIOS CONTRA LA FUENTE DE VERDAD EN DISCO
// ===========================================================================
seccion('B. vocabularios de zona contra migraciones 027 / 028');

var slugs027 = fs.existsSync(RUTA_027) ? slugsDe027(leer(RUTA_027)) : [];
var vals028 = fs.existsSync(RUTA_028) ? valoresDe028(leer(RUTA_028)) : [];
var dbPendiente = false;

if (!slugs027.length) {
  aviso('no se pudo leer el catalogo de zonas_geograficas de ' + RUTA_027 +
    ': bloque B incompleto');
} else {
  var clavesMapeo = Object.keys(MAPEO_GEN).sort();
  var diff027 = clavesMapeo.filter(function (s) { return slugs027.indexOf(s) === -1; });
  var huerf027 = slugs027.filter(function (s) { return clavesMapeo.indexOf(s) === -1; });
  check(diff027.length === 0 && huerf027.length === 0,
    'B1 ZONAS_ZG_A_DESTINOS cubre exactamente los ' + slugs027.length +
      ' slugs de zonas_geograficas (027)',
    'B1 vocabulario fuera de la migracion 027: slugs del mapeo no sembrados = ' +
      lista(diff027) + ' | slugs de 027 sin mapeo = ' + lista(huerf027));
  console.log('   027 zonas_geograficas: ' + lista(slugs027));
}

if (!vals028.length) {
  aviso('no se pudo leer el CHECK destinos_zona_chk de ' + RUTA_028 +
    ': bloque B incompleto');
} else {
  check(Array.isArray(ZONAS_API_LIST) && iguales(
      { a: (ZONAS_API_LIST || []).slice().sort().join(',') },
      { a: vals028.slice().sort().join(',') }),
    'B2 ZONAS del backend = CHECK destinos_zona_chk de 028 (' + vals028.length +
      ' valores)',
    'B2 ZONAS del backend no coincide con el CHECK de 028: backend = ' +
      lista((ZONAS_API_LIST || []).slice().sort()) + ' | 028 = ' +
      lista(vals028.slice().sort()));
  console.log('   028 destinos.zona_chk: ' + lista(vals028));
}

if (vals028.length) {
  var fueraDeChk = {};
  Object.keys(MAPA_GEN).forEach(function (k) {
    var zd = MAPEO_GEN[MAPA_GEN[k]];
    if (zd === undefined || vals028.indexOf(zd) === -1) fueraDeChk[k] = MAPA_GEN[k];
  });
  var clavesFuera = Object.keys(fueraDeChk);
  check(clavesFuera.length === 0,
    'B3 toda zona del generador (ya mapeada) cae dentro del CHECK de 028',
    'B3 zonas del generador fuera del CHECK de 028: ' +
      clavesFuera.map(function (k) {
        return k + ' (' + fueraDeChk[k] + ' -> ' + MAPEO_GEN[fueraDeChk[k]] + ')';
      }).join(', '));
}

// ===========================================================================
// C. SEED: 33 departamentos, todos resolubles por el mapa del generador
// ===========================================================================
seccion('C. seed db/seeds/geo_ciudades_seed.json');

var seed = JSON.parse(leer(RUTA_SEED));
var deptsSeed = {};
seed.forEach(function (r) { deptsSeed[r.departamento_normalizado] = true; });
var nDeptsSeed = Object.keys(deptsSeed).length;

check(nDeptsSeed === DEPTOS_ESPERADOS,
  'C1 el seed tiene ' + DEPTOS_ESPERADOS + ' departamentos distintos',
  'C1 el seed tiene ' + nDeptsSeed + ' departamentos distintos, se esperaban ' +
    DEPTOS_ESPERADOS);

var seedSinZona = Object.keys(deptsSeed).filter(function (d) {
  var zg = MAPA_GEN[d];
  return !zg || !MAPEO_GEN[zg];
});
check(seedSinZona.length === 0,
  'C2 los ' + nDeptsSeed + ' departamentos del seed resuelven zona por el mapa ' +
    'del generador',
  'C2 departamentos del seed sin zona resoluble: ' + lista(seedSinZona));

// El mapa del generador no puede traer departamentos que el seed no tiene.
check(clavesGen.length === nDeptsSeed,
  'C3 el mapa del generador tiene una clave por departamento del seed',
  'C3 el mapa del generador tiene ' + clavesGen.length + ' claves y el seed ' +
    nDeptsSeed + ' departamentos; sobran o faltan claves');

// ===========================================================================
// D. ARTEFACTO GENERADO geo-ciudades.js
// ===========================================================================
seccion('D. artefacto geo-ciudades.js');

var SRC_ART = leer(RUTA_ART);
var mItems = /(?:items\s*:\s*)(\[[\s\S]*?\])\s*;?\s*\n?\s*\}\s*;?\s*$/m.exec(SRC_ART);
var ART = null;
if (!mItems) {
  mItems = /(?:items\s*:\s*)(\[[\s\S]*\])/.exec(SRC_ART);
}
if (mItems) {
  ART = vm.runInContext(mItems[1], vm.createContext(Object.create(null)),
    { timeout: 4000 });
}

if (!Array.isArray(ART)) {
  fails.push('no se pudo leer el array items de geo-ciudades.js');
  console.log('FAIL D0 no se pudo leer el array items de geo-ciudades.js');
} else {
  check(ART.length > 0,
    'D0 geo-ciudades.js expone ' + ART.length + ' items',
    'D0 geo-ciudades.js expone 0 items');

  var vocab = vals028.length ? vals028 : (ZONAS_API_LIST || []);
  var malformadas = [];
  var sinZonaArt = [];
  var deptsArt = {};
  var fueraVocab = [];

  ART.forEach(function (row, i) {
    if (!Array.isArray(row) || row.length !== 5) {
      malformadas.push('items[' + i + ']: ' + JSON.stringify(row) +
        ' (se esperaban 5 campos)');
      return;
    }
    var nombre = row[0];
    var dpto = row[1];
    var zona = row[2];
    var lat = Number(row[3]);
    var lng = Number(row[4]);
    if (typeof nombre !== 'string' || !nombre.length) {
      malformadas.push('items[' + i + ']: nombre vacio o no texto');
      return;
    }
    if (typeof dpto !== 'string' || !dpto.length) {
      malformadas.push('items[' + i + ']: departamento vacio o no texto');
      return;
    }
    if (typeof zona !== 'string' || !zona.length) {
      sinZonaArt.push('items[' + i + '] ' + nombre + ' / ' + dpto);
      return;
    }
    if (vocab.length && vocab.indexOf(zona) === -1) {
      fueraVocab.push('items[' + i + '] ' + nombre + ' / ' + dpto + ' -> zona "' +
        zona + '" fuera del vocabulario');
      return;
    }
    if (!isFinite(lat) || !isFinite(lng) || lat < -90 || lat > 90 || lng < -180 ||
        lng > 180) {
      malformadas.push('items[' + i + '] ' + nombre + ' / ' + dpto +
        ': coordenadas invalidas (' + row[3] + ', ' + row[4] + ')');
      return;
    }
    deptsArt[canonKey(dpto)] = true;
  });

  check(malformadas.length === 0,
    'D1 las ' + ART.length + ' filas de geo-ciudades.js estan bien formadas ' +
      '(nombre, departamento, zona, lat, lng)',
    'D1 filas malformadas (' + malformadas.length + '): ' +
      malformadas.slice(0, 12).join(' | ') +
      (malformadas.length > 12 ? ' ... y ' + (malformadas.length - 12) + ' mas' : ''));

  check(sinZonaArt.length === 0,
    'D2 ninguna fila de geo-ciudades.js va sin zona',
    'D2 filas sin zona (' + sinZonaArt.length + '): ' +
      sinZonaArt.slice(0, 12).join(' | '));

  check(fueraVocab.length === 0,
    'D3 toda zona del artefacto pertenece al vocabulario de destinos.zona',
    'D3 zonas fuera de vocabulario (' + fueraVocab.length + '): ' +
      fueraVocab.slice(0, 12).join(' | '));

  var nDeptsArt = Object.keys(deptsArt).length;
  check(nDeptsArt === DEPTOS_ESPERADOS,
    'D4 el artefacto trae los ' + DEPTOS_ESPERADOS + ' departamentos con zona',
    'D4 el artefacto trae ' + nDeptsArt + ' departamentos con zona, se esperaban ' +
      DEPTOS_ESPERADOS);

  // Cada departamento del artefacto debe existir en el mapa del generador, y el
  // generador no puede traer departamentos que el artefacto no tenga.
  var huerfanos = Object.keys(deptsArt).filter(function (c) { return !idxGen[c]; });
  check(huerfanos.length === 0,
    'D5 todo departamento del artefacto existe en el mapa del generador',
    'D5 departamentos del artefacto que NO estan en el mapa del generador (' +
      huerfanos.length + '): ' + lista(huerfanos));
}

// ===========================================================================
// E. NEON (opcional, solo lectura) -- degrada SIN ROMPER y SIN CALLARSE
// ===========================================================================
seccion('E. Neon zonas_geograficas (opcional, solo lectura)');

var AVISO_SIN_BD = 'la fuente de verdad en base de datos (tabla zonas_geograficas ' +
  'de Neon) NO se pudo comprobar; los bloques B y C si contrastaron contra las ' +
  'migraciones 027/028 y el seed';

var urlNeon = null;
if (SIN_NEON) {
  aviso('flag --sin-neon: se salta la consulta a Neon; los bloques A a D siguen ' +
    'comprobando la paridad contra el disco');
} else {
try { require('./load_env_local')(); } catch (e) { /* sin .env local */ }
urlNeon = process.env.DATABASE_URL || null;
}

if (SIN_NEON) {
  // Bloque E omitido a proposito: nada que degradar, nada que esperar.
} else if (!urlNeon) {
  aviso('sin DATABASE_URL: ' + AVISO_SIN_BD);
} else {
  var neonFactory = null;
  try { neonFactory = require('@neondatabase/serverless').neon; }
  catch (e) { neonFactory = null; }

  if (!neonFactory) {
    aviso('@neondatabase/serverless no esta instalado: ' + AVISO_SIN_BD);
  } else {
    var pendiente = null;
    try {
      pendiente = neonFactory(urlNeon)(
        'SELECT slug FROM zonas_geograficas ORDER BY slug');
    } catch (e) {
      pendiente = null;
    }
    if (!pendiente || typeof pendiente.then !== 'function') {
      aviso('no se pudo lanzar la consulta de solo lectura: ' + AVISO_SIN_BD);
    } else {
      // Cota dura: la suite no puede quedarse colgada por una red lenta.
      var carrera = Promise.race([
        pendiente,
        new Promise(function (r) {
          var t = setTimeout(function () { r(null); }, 10000);
          if (t.unref) t.unref();
        })
      ]);
      carrera.then(function (r) {
        if (!r || !r.rows) {
          aviso('la consulta a Neon no respondio (sin red o sin la tabla): ' +
            AVISO_SIN_BD);
          imprimirResumen();
          return;
        }
        var vivos = r.rows.map(function (x) { return x.slug; }).sort();
        console.log('   Neon zonas_geograficas: ' + lista(vivos));
        var ref = slugs027.length ? slugs027.slice().sort() : vivos;
        var falta = ref.filter(function (s) { return vivos.indexOf(s) === -1; });
        var sobra = vivos.filter(function (s) { return ref.indexOf(s) === -1; });
        check(falta.length === 0 && sobra.length === 0,
          'E1 la tabla zonas_geograficas de Neon coincide con la migracion 027',
          'E1 zonas_geograficas en Neon distinta de la 027: faltan ' +
            lista(falta) + ' | sobran ' + lista(sobra));
        imprimirResumen();
      }).catch(function (err) {
        aviso('consulta a Neon fallo (' + (err && err.message) + '): ' + AVISO_SIN_BD);
        imprimirResumen();
      });
      dbPendiente = true;
    }
  }
}

if (!dbPendiente) imprimirResumen();

function imprimirResumen() {
  console.log('');
  console.log('=== ' + passed + ' PASS / ' + fails.length + ' FAIL ===');
  if (fails.length) {
    console.log('DIVERGENCIAS DETECTADAS (un smoke que siempre pasa no sirve):');
    fails.forEach(function (f, i) { console.log('  ' + (i + 1) + ') ' + f); });
    console.log('');
    console.log('RESULTADO: FAIL. exit 1.');
    process.exit(1);
  }
  console.log('');
  console.log('RESULTADO: OK. exit 0.');
  process.exit(0);
}