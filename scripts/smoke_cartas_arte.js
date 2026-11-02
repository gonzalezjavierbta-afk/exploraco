// scripts/smoke_cartas_arte.js
// Smoke OFFLINE (cero red, cero DB) de la capa de arte de cartas: carga
// cartas-arte.js REAL (ADR-006) en un sandbox vm con un window falso y verifica
// ratio, resolucion clave/marca, hueco vacio, escapado de HTML y pesos de las
// laminas. Patron smoke_mercado.js: PASS/FAIL y process.exitCode.
//
// ASCII-safe (ADR-002): 0 bytes > 127, 0 backticks. CommonJS (BUG-001).
// Run: node scripts/smoke_cartas_arte.js
'use strict';

var path = require('path');
var fs = require('fs');
var vm = require('vm');

var RAIZ = path.join(__dirname, '..');
var REL = 'cartas-arte.js';

var passed = 0;
var failed = 0;
function check(label, cond) {
  if (cond) { passed++; console.log('PASS - ' + label); }
  else { failed++; console.log('FAIL - ' + label); process.exitCode = 1; }
}
function bytesAltos(rel) {
  var b = fs.readFileSync(path.join(RAIZ, rel));
  var high = 0;
  for (var i = 0; i < b.length; i++) { if (b[i] > 127) high++; }
  return high;
}
function tieneBacktick(s) { return s.indexOf(String.fromCharCode(96)) !== -1; }

// ventana: replica de window con o sin CartasUI ya cargado, para probar las dos
// rutas de escape (reutilizada y local).
function cargarArte(conCartasUI) {
  var win = {};
  if (conCartasUI) {
    win.CartasUI = {
      esc: function (s) {
        if (s === null || s === undefined) return '';
        return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
          .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
      }
    };
  }
  var sandbox = { window: win, console: console };
  vm.runInNewContext(fs.readFileSync(path.join(RAIZ, REL), 'utf8'), sandbox, { filename: REL });
  return win.CartasArte;
}

var SRC = fs.readFileSync(path.join(RAIZ, REL), 'utf8');
var Arte = cargarArte(false);
var ArteConUI = cargarArte(true);

// --- 1. ASCII-safety del modulo ---------------------------------------
check('cartas-arte.js existe', fs.existsSync(path.join(RAIZ, REL)));
check('cartas-arte.js: 0 bytes > 127', bytesAltos(REL) === 0);
check('cartas-arte.js: 0 backticks', !tieneBacktick(SRC));

// --- 2. Laminas copiadas en assets/cartas/ ----------------------------
// Tope 600 KB: por encima de eso el mercado pinta 20 cartas y el movil deja de
// cargar en 3G. Los maestros de cartas/ no se sirven (.vercelignore).
var LAMINAS = [
  'consumible_catalejo_explorador.png',
  'consumible_pluma_creador.png',
  'consumible_lupa_curador.png',
  'consumible_lente_artista.png',
  'marca_ancestral.png'
];
var TOPE = 600 * 1024;
for (var i = 0; i < LAMINAS.length; i++) {
  var p = path.join(RAIZ, 'assets', 'cartas', LAMINAS[i]);
  var existe = fs.existsSync(p);
  var size = existe ? fs.statSync(p).size : 0;
  check('assets/cartas/' + LAMINAS[i] + ' existe', existe);
  check('assets/cartas/' + LAMINAS[i] + ' peso > 0 y <= 600 KB (' + size + ')', existe && size > 0 && size <= TOPE);
}

// --- 3. API expuesta ---------------------------------------------------
check('window.CartasArte definido', !!Arte);
check('RATIO expuesto', !!Arte);
check('RATIO == 1086/1448 (tolerancia 1e-9)', !!Arte && Math.abs(Arte.RATIO - 0.75) <= 1e-9);
check('ARTE con 8 claves', !!Arte && Object.keys(Arte.ARTE).length === 8);
check('EDITORIAL con 8 claves', !!Arte && Object.keys(Arte.EDITORIAL).length === 8);

// --- 4. Resolucion por clave y por marca ------------------------------
var cat = Arte && Arte.arteDe({ clave: 'consumible_catalejo_explorador' });
check('arteDe(catalejo) != null', !!cat);
check('arteDe(catalejo).archivo apunta al PNG', !!cat && /assets\/cartas\/consumible_catalejo_explorador\.png$/.test(cat.archivo));
check('arteDe(catalejo).tipo == HERRAMIENTA', !!cat && cat.tipo === 'HERRAMIENTA');
check('arteDe(catalejo).familia == C', !!cat && cat.familia === 'C');
check('arteDe(catalejo).numero == 1', !!cat && cat.numero === 1);

var marca = Arte && Arte.arteDe({ marca: 'Ancestral' });
check('arteDe({marca:Ancestral}) != null', !!marca);
check('arteDe({marca:Ancestral}).archivo == marca_ancestral.png',
  !!marca && /assets\/cartas\/marca_ancestral\.png$/.test(marca.archivo));
check('arteDe({marca:Ancestral}).familia == M', !!marca && marca.familia === 'M');
check('arteDe({marca:Ancestral}).tipo == MARCA', !!marca && marca.tipo === 'MARCA');
check('arteDe(marca directa por clave) resuelve', !!Arte && Arte.arteDe({ clave: 'marca:ancestral' }) !== null);

// --- 4b. SKU de marca: la lamina institucional cubre el catalogo ----------
// El catalogo identifica el producto por SKU (clave) y el endpoint de
// consumibles no entrega marca_nombre: sin este mapeo los 3 SKU de Ancestral
// caian al hueco vacio.
var skuPocima = Arte && Arte.arteDe({ clave: 'ancestral_pocima_50ml' });
check('arteDe(ancestral_pocima_50ml).archivo == marca_ancestral.png',
  !!skuPocima && skuPocima.archivo === 'assets/cartas/marca_ancestral.png');
check('arteDe(ancestral_pocima_50ml).familia == M', !!skuPocima && skuPocima.familia === 'M');
check('arteDe(ancestral_pocima_50ml).tipo == MARCA', !!skuPocima && skuPocima.tipo === 'MARCA');

var skuBotella = Arte && Arte.arteDe({ clave: 'ancestral_botella_750ml' });
check('arteDe(ancestral_botella_750ml) != null', !!skuBotella);
check('arteDe(ancestral_botella_750ml).archivo == marca_ancestral.png',
  !!skuBotella && skuBotella.archivo === 'assets/cartas/marca_ancestral.png');
check('arteDe(ancestral_botella_750ml).familia == M', !!skuBotella && skuBotella.familia === 'M');

var skuFuturo = Arte && Arte.arteDe({ clave: 'ancestral_x_futuro' });
check('arteDe(SKU futuro) resuelve por prefijo de marca',
  !!skuFuturo && skuFuturo.archivo === 'assets/cartas/marca_ancestral.png');
check('arteDe(SKU futuro).familia == M', !!skuFuturo && skuFuturo.familia === 'M');

check('el prefijo no absorbe claves ajenas (consumible_inexistente sigue null)',
  !!Arte && Arte.arteDe({ clave: 'consumible_inexistente' }) === null);

var skuUrl = Arte && Arte.arteDe({ clave: 'ancestral_pocima_50ml', imagenUrl: 'https://x/y.png' });
check('imagenUrl gana sobre la lamina de marca del SKU',
  !!skuUrl && skuUrl.archivo === 'https://x/y.png');

check('arteDe(clave inexistente) === null', !!Arte && Arte.arteDe({ clave: 'consumible_inexistente' }) === null);
check('arteDe(null) === null', !!Arte && Arte.arteDe(null) === null);
check('arteDe({}) === null', !!Arte && Arte.arteDe({}) === null);

var url = Arte && Arte.arteDe({ clave: 'consumible_inexistente', imagenUrl: 'https://x/y.png' });
check('imagenUrl explicita gana sobre el mapa', !!url && url.archivo === 'https://x/y.png');

// --- 5. slotHtml con y sin arte ---------------------------------------
var htmlCon = Arte && Arte.slotHtml({
  clave: 'consumible_catalejo_explorador', nombre: 'Catalejo del Explorador', xp: 120
});
check('slotHtml con arte pinta <img', !!htmlCon && htmlCon.indexOf('<img') !== -1);
check('slotHtml con arte usa loading="lazy"', !!htmlCon && htmlCon.indexOf('loading="lazy"') !== -1);
check('slotHtml con arte declara 1086x1448', !!htmlCon && htmlCon.indexOf('width="1086"') !== -1 && htmlCon.indexOf('height="1448"') !== -1);
check('slotHtml con arte lleva alt con nombre y XP',
  !!htmlCon && htmlCon.indexOf('alt="Catalejo del Explorador - 120 XP"') !== -1);
check('slotHtml con arte no marca hueco vacio', !!htmlCon && htmlCon.indexOf('c-card-arte--vacia') === -1);

var htmlSku = Arte && Arte.slotHtml({ clave: 'ancestral_media_375ml', nombre: 'Media 375' });
check('slotHtml de SKU pinta <img', !!htmlSku && htmlSku.indexOf('<img') !== -1);
check('slotHtml de SKU no marca hueco vacio', !!htmlSku && htmlSku.indexOf('c-card-arte--vacia') === -1);
check('slotHtml de SKU usa la lamina de marca',
  !!htmlSku && htmlSku.indexOf('assets/cartas/marca_ancestral.png') !== -1);
check('slotHtml de SKU respeta el nombre del producto (no el slug de marca)',
  !!htmlSku && htmlSku.indexOf('alt="Media 375"') !== -1);

var htmlSin = Arte && Arte.slotHtml({ clave: 'consumible_inexistente', nombre: 'Carta futura', xp: 40 });
check('slotHtml sin arte pinta c-card-arte--vacia', !!htmlSin && htmlSin.indexOf('c-card-arte--vacia') !== -1);
check('slotHtml sin arte pinta "Diseno pendiente"', !!htmlSin && htmlSin.indexOf('Diseno pendiente') !== -1);
check('slotHtml sin arte muestra familia C por defecto', !!htmlSin && htmlSin.indexOf('class="c-card-fam">C<') !== -1);
check('slotHtml sin arte muestra tipo CARTA por defecto', !!htmlSin && htmlSin.indexOf('class="c-card-tipo">CARTA<') !== -1);
check('slotHtml sin arte muestra el XP en texto', !!htmlSin && htmlSin.indexOf('40 XP') !== -1);

var htmlMarcaSin = Arte && Arte.slotHtml({ clave: 'marca:inexistente', nombre: 'Marca X' });
check('hueco de marca anade c-card-arte--marca', !!htmlMarcaSin && htmlMarcaSin.indexOf('c-card-arte--marca') !== -1);
check('hueco de marca usa familia M', !!htmlMarcaSin && htmlMarcaSin.indexOf('class="c-card-fam">M<') !== -1);

// --- 6. Escapado (XSS por nombre) -------------------------------------
var INYECTADO = '<img src=x onerror=alert(1)>';
var htmlIny = Arte && Arte.slotHtml({ clave: 'consumible_inexistente', nombre: INYECTADO });
check('nombre inyectado sale escapado (sin <img src=x)', !!htmlIny && htmlIny.indexOf('<img src=x') === -1);
check('nombre inyectado sale escapado (con &lt;img)', !!htmlIny && htmlIny.indexOf('&lt;img src=x onerror=alert(1)&gt;') !== -1);
// El texto "onerror=alert(1)" puede aparecer como TEXTO escapado e inerte;
// lo que no puede es quedar dentro de una etiqueta real (< ... onerror=alert).
check('nombre inyectado no abre atributo onerror',
  !!htmlIny && !/<[^<>]*onerror=alert/.test(htmlIny));

var htmlInyAlt = ArteConUI && ArteConUI.slotHtml({
  clave: 'consumible_catalejo_explorador', nombre: '"><script>alert(1)</script>'
});
check('alt inyectado sale escapado con CartasUI.esc',
  !!htmlInyAlt && htmlInyAlt.indexOf('<script>') === -1 && htmlInyAlt.indexOf('&quot;&gt;&lt;script&gt;') !== -1);
check('escapado identico con y sin CartasUI cargado',
  !!Arte && !!ArteConUI && ArteConUI.esc(INYECTADO) === Arte.esc(INYECTADO));

// --- 7. faltantes ------------------------------------------------------
var falt = Arte && Arte.faltantes([
  'consumible_catalejo_explorador', 'consumible_inexistente', 'marca:ancestral'
]);
check('faltantes devuelve solo la clave sin arte',
  !!falt && falt.length === 1 && falt[0] === 'consumible_inexistente');
check('faltantes(null) devuelve []', !!Arte && Array.isArray(Arte.faltantes(null)) && Arte.faltantes(null).length === 0);
check('faltantes(undefined) devuelve []', !!Arte && Arte.faltantes(undefined).length === 0);

// --- 8. Degradacion total ---------------------------------------------
var okNoLanza = true;
try {
  Arte.slotHtml();
  Arte.slotHtml(null);
  Arte.arteDe(undefined);
  Arte.faltantes('no-es-array');
} catch (e) {
  okNoLanza = false;
}
check('ninguna funcion lanza con entradas vacias', okNoLanza);
check('slotHtml() devuelve cadena', !!Arte && typeof Arte.slotHtml() === 'string');

console.log('');
console.log('Smoke cartas-arte: ' + passed + '/' + (passed + failed) + ' PASS, ' + failed + ' FAIL');
if (failed) process.exitCode = 1;
