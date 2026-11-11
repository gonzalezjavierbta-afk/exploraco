// scripts/smoke_cartas_constantes.js
// GATE de las constantes del sistema de cartas (ADR-108 D9/D10).
//
// QUE VIGILA: que las constantes compartidas del sistema de cartas vivan UNA
// sola vez, en lib/cartas-config.js, y que ningun handler vuelva a declararlas
// con un literal propio. El riesgo que cubre no es cosmetico: el coste de la
// fusion se COBRA en api/interacciones.js y se ANUNCIA en api/usuarios.js
// (fusion_coste_xp). Si cada fichero lleva su 200, cambiar uno deja el otro
// derivando en silencio y la UI promete un precio distinto del que cobra. El
// tope del museo sufre lo mismo (1..12).
//
// QUE NO VIGILA: la autoridad del tope sigue en la BASE
// (chk_usuarios_cartas_museo + ux_usuarios_cartas_museo_orden); este gate solo
// comprueba el espejo numerico del lado JS. Tampoco valida comportamiento de
// las ramas: eso es smoke_gamificacion / smoke_mercado.
//
// Es ESTATICO: no abre DATABASE_URL, no hace red, solo lee fuentes. Corre en
// $0 (ADR-082) y por eso puede entrar en la cadena de npm run test.
//
// ASCII-safe (ADR-002), CommonJS (BUG-001), 0 backticks.
// Run: node scripts/smoke_cartas_constantes.js

'use strict';

var fs = require('fs');
var path = require('path');

var ROOT = path.join(__dirname, '..');
var LIB = 'lib/cartas-config.js';
var INTER = 'api/interacciones.js';
var USU = 'api/usuarios.js';

var total = 0;
var pass = 0;
var fails = 0;
function ok(label) { total++; pass++; console.log('PASS - ' + label); }
function ko(label, detalle) {
  total++; fails++;
  console.log('FAIL - ' + label + (detalle ? ' :: ' + detalle : ''));
}
function assert(cond, label, detalle) {
  if (cond) ok(label); else ko(label, detalle);
}
function leer(rel) { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); }
function cuenta(texto, re) {
  var m = texto.match(re);
  return m ? m.length : 0;
}

console.log('=== SMOKE CARTAS CONSTANTES (ADR-108 D9/D10, sin BD) ===');
console.log('');

// --- (0) Las fuentes existen y se pueden leer -------------------------------
var fuentes = {};
var faltan = [];
[LIB, INTER, USU].forEach(function (rel) {
  try { fuentes[rel] = leer(rel); }
  catch (e) { faltan.push(rel + ' (' + (e && e.code) + ')'); }
});
assert(faltan.length === 0, 'las 3 fuentes existen y son legibles', faltan.join(', '));
if (faltan.length) {
  console.log('');
  console.log('RESULTADO: FAIL - ' + fails + ' de ' + total + ' verificaciones fallaron.');
  process.exit(1);
}

var tLib = fuentes[LIB];
var tInter = fuentes[INTER];
var tUsu = fuentes[USU];

// --- (a) Nadie declara el literal: las constantes vienen del require --------
// Un binding valido es "var X = CartasConfig.X;" o "var X = require(...).X;".
// Lo prohibido es "var X = 200;" (o 12, o cualquier numero).
var RE_DECL_NUM = /var\s+(CARTA_FUSION_XP|CARTA_MUSEO_TOPE|MUSEO_TOPE|CARTA_VARIANTES)\s*=\s*[-+]?\d/g;
var RE_DECL_ARR = /var\s+CARTA_VARIANTES\s*=\s*\[/g;

[INTER, USU].forEach(function (rel) {
  var t = fuentes[rel];
  var nNum = cuenta(t, RE_DECL_NUM);
  assert(nNum === 0, rel + ' no declara ninguna constante de cartas con literal numerico',
    nNum + ' declaracion(es) con numero');
  var nArr = cuenta(t, RE_DECL_ARR);
  assert(nArr === 0, rel + ' no declara CARTA_VARIANTES como array literal',
    nArr + ' declaracion(es)');
});

[INTER, USU].forEach(function (rel) {
  var t = fuentes[rel];
  var req = /require\(\s*'\.\.\/lib\/cartas-config\.js'\s*\)/.test(t);
  assert(req, rel + ' requirea lib/cartas-config.js', 'falta el require');
});

// Bindings explicitos: el nombre local se conserva para no tocar los usos.
assert(/var\s+CARTA_FUSION_XP\s*=\s*CartasConfig\.CARTA_FUSION_XP\s*;/.test(tInter),
  INTER + ' enlaza CARTA_FUSION_XP desde CartasConfig', 'binding ausente o con literal');
assert(/var\s+CARTA_MUSEO_TOPE\s*=\s*CartasConfig\.MUSEO_TOPE\s*;/.test(tInter),
  INTER + ' enlaza CARTA_MUSEO_TOPE desde CartasConfig', 'binding ausente o con literal');
assert(/var\s+CARTA_VARIANTES\s*=\s*CartasConfig\.CARTA_VARIANTES\s*;/.test(tInter),
  INTER + ' enlaza CARTA_VARIANTES desde CartasConfig', 'binding ausente o con literal');
assert(/var\s+CARTA_FUSION_XP\s*=\s*CartasConfig\.CARTA_FUSION_XP\s*;/.test(tUsu),
  USU + ' enlaza CARTA_FUSION_XP desde CartasConfig', 'binding ausente o con literal');
assert(/var\s+MUSEO_TOPE\s*=\s*CartasConfig\.MUSEO_TOPE\s*;/.test(tUsu),
  USU + ' enlaza MUSEO_TOPE desde CartasConfig', 'binding ausente o con literal');
assert(/var\s+CARTA_VARIANTE_DEFECTO\s*=\s*CartasConfig\.CARTA_VARIANTE_DEFECTO\s*;/.test(tUsu),
  USU + ' enlaza CARTA_VARIANTE_DEFECTO desde CartasConfig', 'binding ausente o con literal');

// CARTA_VARIANTES se declara como ARRAY LITERAL una sola vez, y es en lib/.
// El binding de api/ ("var CARTA_VARIANTES = CartasConfig.CARTA_VARIANTES;") es
// una declaracion de variable, no una segunda fuente: por eso se busca el
// literal y no el "var".
var reVarLit = /var\s+CARTA_VARIANTES\s*=\s*\[/;
assert(reVarLit.test(tLib), LIB + ' declara CARTA_VARIANTES como array literal',
  'no aparece el literal');
assert(!reVarLit.test(tInter), INTER + ' NO redeclara el literal de CARTA_VARIANTES (solo enlaza)',
  'array literal local detectado');
assert(!reVarLit.test(tUsu), USU + ' NO redeclara el literal de CARTA_VARIANTES',
  'array literal local detectado');

// --- (b) Presupuesto serverless: 8/8 funciones (ADR-002 plataforma) ---------
var dirApi = path.join(ROOT, 'api');
var ficherosApi = fs.readdirSync(dirApi).filter(function (f) {
  return /\.js$/.test(f);
});
assert(ficherosApi.length === 8, 'api/ contiene exactamente 8 funciones serverless',
  'encontradas ' + ficherosApi.length + ': ' + ficherosApi.join(', '));

// --- (c) Contrato de lib/cartas-config.js -----------------------------------
var libCfg = require(path.join(ROOT, LIB));
assert(libCfg.CARTA_FUSION_XP === 200, 'lib exporta CARTA_FUSION_XP = 200',
  'valor real: ' + libCfg.CARTA_FUSION_XP);
assert(libCfg.MUSEO_TOPE === 12, 'lib exporta MUSEO_TOPE = 12',
  'valor real: ' + libCfg.MUSEO_TOPE);
assert(JSON.stringify(libCfg.CARTA_VARIANTES) === JSON.stringify(['base', 'shiny']),
  'lib exporta CARTA_VARIANTES = [base, shiny]',
  'valor real: ' + JSON.stringify(libCfg.CARTA_VARIANTES));
assert(libCfg.CARTA_VARIANTE_DEFECTO === 'base', 'lib exporta CARTA_VARIANTE_DEFECTO = base',
  'valor real: ' + libCfg.CARTA_VARIANTE_DEFECTO);

// --- (d) Las ramas nuevas y las rutas de lectura ----------------------------
['carta_equipar_museo', 'carta_fusionar', 'carta_obtener_drop'].forEach(function (rama) {
  var re = new RegExp('tipo2 === \'' + rama + '\'');
  assert(re.test(tInter), INTER + ' expone la rama ' + rama, 'rama ausente');
});
assert(/'museo_cartas'/.test(tUsu), USU + ' expone la ruta de lectura museo_cartas',
  'ruta ausente');
assert(!/museo_publico/.test(tUsu), USU + ' NO contiene el nombre antiguo museo_publico',
  'quedan ' + cuenta(tUsu, /museo_publico/g) + ' ocurrencia(s)');

// (e) Invariancia del upsert de inventario: TODO INSERT en usuarios_cartas
// declara el conflicto de 3 columnas. El conteo es dinamico y POR TABLA: se
// corta el texto en bloques por INSERT y solo cuenta los que apuntan a
// usuarios_cartas (el prefijo "INSERT INTO usuarios_cartas" tambien casaba con
// usuarios_cartas_nivel, que tiene PK de 2 columnas y es otra tabla). Una rama
// nueva de compra anade un INSERT mas y no rompe el gate; una regresion a 2
// columnas si lo rompe.
var bloquesIns = tInter.split(/INSERT INTO /).slice(1);
var nInsCartas = 0;
var nTresCol = 0;
var nDosColCarta = 0;
bloquesIns.forEach(function (b) {
  if (b.indexOf('usuarios_cartas (') !== 0) return;
  nInsCartas++;
  if (/ON CONFLICT \(usuario_id, carta_id, variante\)/.test(b)) nTresCol++;
  if (/ON CONFLICT \(usuario_id, carta_id\)/.test(b)) nDosColCarta++;
});
assert(nInsCartas >= 1, INTER + ' conserva al menos un INSERT INTO usuarios_cartas',
  'encontrados ' + nInsCartas);
assert(nTresCol === nInsCartas,
  INTER + ' tiene 1 upsert de 3 columnas por cada INSERT INTO usuarios_cartas',
  'INSERT ' + nInsCartas + ' vs ON CONFLICT (usuario_id, carta_id, variante) ' + nTresCol);
assert(nDosColCarta === 0, INTER + ' no conserva ningun ON CONFLICT de 2 columnas sobre usuarios_cartas',
  'encontrados ' + nDosColCarta);

// --- (f) PRECIO DE ACUNACION: base por rareza x mult de familia (spec 4.2) --
// El precio se RESUELVE una vez y se GUARDA (4.2): dos lectores del mismo par
// de factores (el alta del catalogo y el recalculo del seed). Si la tabla se
// replica en el handler o en el SQL, la deriva es invisible porque los dos
// numeros parecen plausibles. Por eso el gate fija VALORES, no solo existencia.
var ADM = 'api/admin.js';
var tAdm = '';
try { tAdm = leer(ADM); } catch (e) { tAdm = ''; }
assert(tAdm !== '', ADM + ' es legible para el gate de precio', 'no se pudo leer');

var bases = libCfg.CARTA_PRECIO_BASE_XP;
var mults = libCfg.CARTA_MULT_FAMILIA;
assert(!!bases && bases.comun === 150 && bases.raro === 400
  && bases.epico === 1000 && bases.dorado === 2500,
  'lib exporta CARTA_PRECIO_BASE_XP = 150/400/1000/2500',
  'valor real: ' + JSON.stringify(bases));
assert(!!mults && mults.lugar === 1.0 && mults.personaje === 1.2
  && mults.artista === 1.2 && mults.marca === 1.5 && mults.cosmetica === 0.5,
  'lib exporta CARTA_MULT_FAMILIA = 1,0 / 1,2 / 1,2 / 1,5 / 0,5',
  'valor real: ' + JSON.stringify(mults));
assert(typeof libCfg.precioAcunacion === 'function',
  'lib exporta precioAcunacion() como funcion', 'falta el helper');

// producto / consumible NO tienen precio de carta: su precio es el SKU.
var sinPrecioCarta = libCfg.CARTA_FAMILIAS_SIN_PRECIO_XP;
assert(sinPrecioCarta.every(function (f) {
  return !Object.prototype.hasOwnProperty.call(mults, f);
}), 'CARTA_MULT_FAMILIA no incluye las familias sin precio_xp',
  'aparece ' + sinPrecioCarta.join(' o '));

// Tabla COMPLETA de 4.2 (filas x familia acunable). Un unico caso con la
// matriz entera detecta cualquier desliz de un solo numero.
var TABLA_42 = {
  cosmetica: { comun: 75,   raro: 200,  epico: 500,  dorado: 1250 },
  lugar:     { comun: 150,  raro: 400,  epico: 1000, dorado: 2500 },
  naturaleza:{ comun: 150,  raro: 400,  epico: 1000, dorado: 2500 },
  personaje: { comun: 180,  raro: 480,  epico: 1200, dorado: 3000 },
  artista:   { comun: 180,  raro: 480,  epico: 1200, dorado: 3000 },
  marca:     { comun: 225,  raro: 600,  epico: 1500, dorado: 3750 }
};
Object.keys(TABLA_42).forEach(function (fam) {
  ['comun', 'raro', 'epico', 'dorado'].forEach(function (rar) {
    var esperado = TABLA_42[fam][rar];
    var real = libCfg.precioAcunacion(fam, rar);
    assert(real === esperado, 'precioAcunacion(' + fam + ',' + rar + ') = ' + esperado,
      'valor real: ' + real);
  });
});

// Casos de borde: no acunable, rareza desconocida y argumentos ausentes -> null
// (nunca 0, NaN ni un precio inventado: el CHECK de la 066 exige NULL o > 0).
[[null, 'comun'], ['producto', 'comun'], ['consumible', 'dorado'],
 ['producto', null], ['lugar', 'legendaria'], ['lugar', null],
 [undefined, undefined], ['marca', 'COMUN ']].forEach(function (par) {
  var real = libCfg.precioAcunacion(par[0], par[1]);
  var etiqueta = 'precioAcunacion(' + String(par[0]) + ',' + String(par[1]) + ')';
  if (par[0] === 'marca') {
    assert(real === 225, etiqueta + ' normaliza mayusculas/espacios a 225',
      'valor real: ' + real);
    return;
  }
  assert(real === null, etiqueta + ' devuelve null', 'valor real: ' + real);
});

// numeric(12,2): el valor viaja ya cerrado a 2 decimales, sin segundo redondeo.
assert(['lugar', 'naturaleza', 'personaje', 'artista', 'marca', 'cosmetica'].every(function (fam) {
  return ['comun', 'raro', 'epico', 'dorado'].every(function (rar) {
    var x = libCfg.precioAcunacion(fam, rar);
    return typeof x === 'number' && Math.round(x * 100) === x * 100;
  });
}), 'todo precioAcunacion() cierra a 2 decimales (numeric(12,2), ADR-035)',
  'hay un valor con mas de 2 decimales');

// El handler NO reproduce la tabla: enlaza el helper y se apoya en el.
assert(/var\s+CartasConfig\s*=\s*require\(\s*'\.\.\/lib\/cartas-config\.js'\s*\)/.test(tAdm),
  ADM + ' requirea lib/cartas-config.js', 'falta el require');
assert(/CartasConfig\.precioAcunacion\s*\(/.test(tAdm),
  ADM + ' usa CartasConfig.precioAcunacion() al crear la carta', 'no aparece la llamada');
assert(cuenta(tAdm, /var\s+(CARTA_PRECIO_BASE_XP|CARTA_MULT_FAMILIA)\s*=/g) === 0,
  ADM + ' NO redeclara la tabla de precios (solo en lib/)',
  'declaracion local detectada');

// --- (g) D-25 / D-24: identidad y auto-precio al EDITAR ---------------------
// GATE ESTATICO: fija el ORDEN de la precedencia de identidad y la UNICIDAD
// del SET de precio_xp en cartas_editar. El comportamiento real se ejercita
// en smoke_cartas_economia (F1/F2) con el handler y un doble de neon.
// D-25: ADMIN_USER_ID se resuelve ANTES del body y el body solo se consulta si
// el env no dio identidad; un body mal formado ya NO es 400.
var iEnvD25 = tAdm.indexOf('var admIdMed = normalizarUuidCarta(process.env.ADMIN_USER_ID)');
var iBodyD25 = tAdm.indexOf('var modBody = normalizarUuidCarta(body.moderado_por)');
assert(iEnvD25 !== -1 && iBodyD25 !== -1 && iEnvD25 < iBodyD25,
  ADM + ' D-25: ADMIN_USER_ID se resuelve antes de body.moderado_por',
  'env=' + iEnvD25 + ' body=' + iBodyD25);
assert(tAdm.indexOf("if (usrAdm.length) { modPor = admIdMed; origMed = 'env'; }") !== -1
  && tAdm.indexOf('if (!modPor) {') !== -1,
  ADM + ' D-25: la identidad del env se usa siempre y el body es el respaldo',
  'falta el orden env -> body');
assert(tAdm.indexOf('MODERADO_POR_INVALIDO') === -1,
  ADM + ' D-25: un moderado_por mal formado se ignora (sin 400)',
  'el codigo viejo aun responde MODERADO_POR_INVALIDO');
assert(tAdm.indexOf('identidad_origen: origMed') !== -1
  && tAdm.indexOf('identidad_admin: identidadAdm') !== -1,
  ADM + ' D-25: la respuesta declara identidad_admin e identidad_origen',
  'falta identidad_origen en la respuesta');

// D-24: la edicion resuelve el precio con la MISMA fuente que el alta
// (lib/cartas-config.js) y en UN solo punto del bloque cartas_editar.
assert(tAdm.indexOf('CartasConfig.precioAcunacion(effFamCa, effRarCa)') !== -1,
  ADM + ' D-24: cartas_editar recalcula con precioAcunacion(familia, rareza)',
  'no aparece la llamada con los valores resultantes');
assert(tAdm.indexOf('PRECIO_NO_DETERMINABLE') !== -1
  && tAdm.indexOf('CARTA_FAMILIAS_SIN_PRECIO_XP.indexOf(effFamCa)') !== -1,
  ADM + ' D-24: familias sin precio -> NULL y rareza desconocida -> 400',
  'falta alguna de las dos ramas');
var iEditCa = tAdm.indexOf("if (tipoCa === 'cartas_editar')");
var iTogCa = tAdm.indexOf("if (tipoCa === 'cartas_toggle')");
var bloqueEdit = (iEditCa >= 0 && iTogCa > iEditCa) ? tAdm.slice(iEditCa, iTogCa) : '';
assert(bloqueEdit !== '' && cuenta(bloqueEdit, /precio_xp=\$/g) === 1,
  ADM + ' D-24: cartas_editar asigna precio_xp en UN solo SET (sin duplicados)',
  'SET encontrados: ' + cuenta(bloqueEdit, /precio_xp=\$/g));
assert(bloqueEdit.indexOf('if (preFinE2 !== effPreCa)') !== -1
  && bloqueEdit.indexOf('media_id, rareza') !== -1,
  ADM + ' D-24: idempotente (solo escribe si cambia) y la fila expone rareza',
  'falta el guard de idempotencia o la columna rareza');

// --- (h) FAMILIA NATURALEZA (spec 11.11; migracion 076) ---------------------
// La familia entra con CUATRO listas en el mismo fichero. Si falta
// FAMILIAS_CARTA el alta responde 400 tipado; si falta SUBTIPOS_CARTA el par
// flora/fauna no se valida en el handler; si falta CARTA_MULT_FAMILIA el precio
// sale null y la carta nace NO acunable EN SILENCIO (spec 11.11.4 regla 4.3).
// Este bloque fija los cuatro hechos para que no se puedan deshacer sin gate.
var famsCarta = libCfg.FAMILIAS_CARTA;
assert(Object.prototype.toString.call(famsCarta) === '[object Array]'
  && famsCarta.length === 8
  && famsCarta.filter(function (f) { return f === 'naturaleza'; }).length === 1,
  'FAMILIAS_CARTA declara 8 familias y naturaleza aparece UNA sola vez',
  'valor real: ' + JSON.stringify(famsCarta));
assert(famsCarta.indexOf('naturaleza') === famsCarta.indexOf('lugar') + 1,
  'FAMILIAS_CARTA ordena naturaleza junto a lugar (capa de juego)',
  'lugar=' + famsCarta.indexOf('lugar') + ' naturaleza=' + famsCarta.indexOf('naturaleza'));

var subsNat = libCfg.subtiposDeFamilia('naturaleza');
assert(JSON.stringify(subsNat) === JSON.stringify(['flora', 'fauna']),
  'subtiposDeFamilia(naturaleza) = [flora, fauna] (hongo descartado)',
  'valor real: ' + JSON.stringify(subsNat));
assert(Object.keys(libCfg.SUBTIPOS_CARTA).length === 8,
  'SUBTIPOS_CARTA cubre las 8 familias (una rama por familia, sin huerfanas)',
  'claves: ' + Object.keys(libCfg.SUBTIPOS_CARTA).join(', '));

assert(Object.prototype.hasOwnProperty.call(mults, 'naturaleza')
  && mults.naturaleza === 1.0,
  'CARTA_MULT_FAMILIA declara naturaleza = 1,0 (sin la clave el precio seria null)',
  'valor real: ' + mults.naturaleza);
assert(libCfg.CARTA_FAMILIAS_SIN_PRECIO_XP.indexOf('naturaleza') < 0
  && libCfg.precioAcunacion('naturaleza', 'comun') === 150
  && libCfg.precioAcunacion('naturaleza', 'dorado') === 2500,
  'naturaleza NO cae en CARTA_FAMILIAS_SIN_PRECIO_XP y acuna 150 / 2500',
  'sin_precio=' + libCfg.CARTA_FAMILIAS_SIN_PRECIO_XP.join(',')
    + ' comun=' + libCfg.precioAcunacion('naturaleza', 'comun'));

// Segunda autoridad retirada: admin.html ya no replica las listas. Pinta los
// selects con el bloque config de cartas_lista (armado en api/admin.js desde
// lib/) y el espejo CARTAS_SUBTIPOS desaparecio con la familia naturaleza.
var ADMIN_HTML = 'admin.html';
var tHtml = '';
try { tHtml = leer(ADMIN_HTML); } catch (e) { tHtml = ''; }
assert(tHtml !== '' && tHtml.indexOf('var CARTAS_SUBTIPOS') < 0
  && tHtml.indexOf('cartasSetConfig(data.config)') !== -1,
  ADMIN_HTML + ' consumes el config de cartas_lista (sin espejo de subtipos)',
  'espejo local detectado o falta cartasSetConfig(data.config)');
function bloqueSelectCarta(idSel) {
  var i = tHtml.indexOf('id="' + idSel + '"');
  if (i < 0) return '';
  var j = tHtml.indexOf('</select>', i);
  return j < 0 ? '' : tHtml.slice(i, j);
}
['carta-familia', 'carta-edit-familia'].forEach(function (idSel) {
  var b = bloqueSelectCarta(idSel);
  var nOpt = b ? cuenta(b, /<option value="[a-z]/g) : -1;
  assert(nOpt === 0, ADMIN_HTML + ' #' + idSel + ' no lleva familias hardcodeadas',
    'opciones literales dentro del select: ' + nOpt);
});
assert(tAdm.indexOf('familias: CartasConfig.FAMILIAS_CARTA') !== -1
  && tAdm.indexOf('subtipos: CartasConfig.SUBTIPOS_CARTA') !== -1,
  ADM + ' cartas_lista emite config desde lib/cartas-config.js',
  'falta el bloque config de cartas_lista');

// --- Resumen ---------------------------------------------------------------
console.log('');
console.log('Checks: ' + total + ' total, ' + pass + ' PASS, ' + fails + ' FAIL');
if (fails === 0) {
  console.log('RESULTADO: OK - ' + pass + ' verificaciones pasaron.');
  process.exit(0);
}
console.log('RESULTADO: FAIL - ' + fails + ' de ' + total + ' verificaciones fallaron.');
process.exit(1);
