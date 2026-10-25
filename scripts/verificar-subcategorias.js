// scripts/verificar-subcategorias.js
// GUARD BARATO: detecta la desincronizacion de la lista CERRADA de
// subcategorias de sitio (ADR-016) entre las 10 copias del repo y su
// consumidor de radios.
//
// Por que son 10 copias y de donde sale esa cuenta: ver DECISIONS.md ADR-101.
// Aqui no se repite el argumento; este script solo comprueba el hecho.
//
// Uso:
//   node scripts/verificar-subcategorias.js             (auditoria real)
//   node scripts/verificar-subcategorias.js --json      (salida para CI)
//   node scripts/verificar-subcategorias.js --self-test (prueba del detector
//       sobre fixtures EN MEMORIA: no toca ningun archivo real)
//
// Salida: una linea por desincronizacion con la ruta exacta
//   [DESYNC] archivo:linea falta <slug>   (la copia no tiene el slug)
//   [DESYNC] archivo:linea sobra <slug>   (slug que no esta en el canon)
// Exit code 0 = todas las copias sincronizadas, 1 = hay desincronizacion.
// --self-test sale con 1 por diseno (esa es la prueba de que DETECTA) y con 2
// si el detector no se comporta como debe.
//
// Solo lectura: no escribe ni modifica archivos. Sin dependencias externas.
// ASCII-safe (ADR-002): cero bytes > 127, cero backticks.

var fs = require('fs');
var path = require('path');

var RAIZ = path.join(__dirname, '..');

// Lista canonica de subcategorias de sitio (10 slugs).
var CANON = [
  'naturaleza', 'museo', 'cultura', 'bar', 'parque', 'espacio-publico',
  'sitio-historico', 'religioso', 'aventura', 'ciudad'
];

// Slugs de las OTRAS categorias (comida/evento). Varios mapas legitimos
// mezclan las 4 categorias: esos slugs son neutros y no cuentan ni como
// faltantes ni como sobrantes de la lista de sitio.
var NEUTROS = [
  'restaurante', 'cafe', 'gastrobar', 'comida-rapida', 'dulces',
  'concierto', 'festival', 'teatro', 'exposicion', 'deporte', 'cine', 'fiesta'
];

// Las 10 copias auditadas. Cada copia puede tener varios mapas (la 7 tiene
// dos) y cuenta como UNA copia en el recuento final.
// tipo 'clave': array dentro de un objeto (SUBCAT_LISTA.sitio).
// tipo 'mapa': claves de un objeto literal.
// tipo 'select': valores de <option> de un select del HTML.
// ambito 'sitio': el mapa solo contiene subcategorias de sitio.
// ambito 'todas': el mapa mezcla las 4 categorias (los NEUTROS se ignoran).
var COPIAS = [
  {
    n: 1, archivo: 'api/publicar-lugar.js',
    mapas: [{ nombre: 'SUBCAT_LISTA.sitio', tipo: 'clave', ancla: 'SUBCAT_LISTA', clave: 'sitio', ambito: 'sitio' }]
  },
  {
    n: 2, archivo: 'busqueda.js',
    mapas: [{ nombre: 'SUBCAT_LISTA.sitio', tipo: 'clave', ancla: 'SUBCAT_LISTA', clave: 'sitio', ambito: 'sitio' }]
  },
  {
    n: 3, archivo: 'lib/completitud.js',
    mapas: [{ nombre: 'SUBCAT_LISTA.sitio', tipo: 'clave', ancla: 'SUBCAT_LISTA', clave: 'sitio', ambito: 'sitio' }]
  },
  {
    n: 4, archivo: 'scripts/validate_ficha.js',
    mapas: [{ nombre: 'SUBCATEGORIAS.sitio', tipo: 'clave', ancla: 'SUBCATEGORIAS', clave: 'sitio', ambito: 'sitio' }]
  },
  {
    n: 5, archivo: 'admin.html',
    mapas: [{ nombre: 'select #f-subcategoria-sitio', tipo: 'select', ancla: 'id="f-subcategoria-sitio"', ambito: 'sitio' }]
  },
  {
    n: 6, archivo: 'admin.html',
    mapas: [{ nombre: 'SITIO_SUBCAT_MODULES', tipo: 'mapa', ancla: 'SITIO_SUBCAT_MODULES', ambito: 'sitio' }]
  },
  {
    n: 7, archivo: 'api/pagina-destino.js',
    mapas: [
      { nombre: 'SUBCAT_LABEL', tipo: 'mapa', ancla: 'SUBCAT_LABEL', ambito: 'todas' },
      { nombre: 'SITIO_SECCIONES_POR_SUBCATEGORIA', tipo: 'mapa', ancla: 'SITIO_SECCIONES_POR_SUBCATEGORIA', ambito: 'sitio' }
    ]
  },
  {
    n: 8, archivo: 'publicar.html',
    mapas: [{ nombre: 'select #sitio_subcategoria', tipo: 'select', ancla: 'id="sitio_subcategoria"', ambito: 'sitio' }]
  },
  {
    n: 9, archivo: 'mapas.html',
    mapas: [{ nombre: 'SCAT_LBL', tipo: 'mapa', ancla: 'SCAT_LBL', ambito: 'todas' }]
  },
  {
    n: 10, archivo: 'mapa-cultural.js',
    mapas: [{ nombre: 'mdSubcatLabel/scMap', tipo: 'mapa', ancla: 'scMap', ambito: 'todas' }]
  }
];

// Consumidor (no es copia de la lista, pero debe cubrirla entera).
var CONSUMIDOR = {
  archivo: 'api/interacciones.js',
  mapas: [{ nombre: 'RADIO_POR_SUBCATEGORIA', tipo: 'mapa', ancla: 'RADIO_POR_SUBCATEGORIA', ambito: 'todas' }]
};

// ---------------------------------------------------------------------------
// Extractores (parseo acotado, sin dependencias)
// ---------------------------------------------------------------------------

function lineaDe(src, idx) {
  return src.slice(0, idx).split('\n').length;
}

function extraerArrayDeClave(src, ancla, clave) {
  var i = src.indexOf(ancla);
  if (i === -1) return null;
  var re = new RegExp('\\b' + clave + '\\s*:\\s*\\[');
  var m = re.exec(src.slice(i));
  if (!m) return null;
  var ini = i + m.index + m[0].length;
  var fin = src.indexOf(']', ini);
  if (fin === -1) return null;

  var slugs = [];
  var reSlug = /['"]([^'"]+)['"]/g;
  var s;
  var trozo = src.slice(ini, fin);
  while ((s = reSlug.exec(trozo)) !== null) slugs.push(s[1]);
  return { slugs: slugs, linea: lineaDe(src, i + m.index) };
}

function extraerClavesMapa(src, ancla) {
  var i = src.indexOf(ancla);
  if (i === -1) return null;
  var abre = src.indexOf('{', i);
  if (abre === -1) return null;

  var nivel = 0;
  var fin = -1;
  for (var j = abre; j < src.length; j++) {
    var c = src.charAt(j);
    if (c === '{') nivel++;
    else if (c === '}') { nivel--; if (!nivel) { fin = j; break; } }
  }
  if (fin === -1) return null;

  var cuerpo = src.slice(abre + 1, fin)
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/\/\/[^\n]*/g, ' ');

  var slugs = [];
  var re = /(?:^|[\s,{])(?:'([^']+)'|"([^"]+)"|([A-Za-z_$][\w$-]*))\s*:/g;
  var m;
  while ((m = re.exec(cuerpo)) !== null) slugs.push(m[1] || m[2] || m[3]);
  return { slugs: slugs, linea: lineaDe(src, i) };
}

function extraerOptionsSelect(src, ancla) {
  var i = src.indexOf(ancla);
  if (i === -1) return null;
  var cierre = src.indexOf('</select>', i);
  if (cierre === -1) return null;

  var slugs = [];
  var re = /<option[^>]*value="([^"]*)"/g;
  var m;
  var cuerpo = src.slice(i, cierre);
  while ((m = re.exec(cuerpo)) !== null) {
    if (m[1]) slugs.push(m[1]);
  }
  return { slugs: slugs, linea: lineaDe(src, i) };
}

function extraerMapa(src, mapa) {
  if (mapa.tipo === 'clave') return extraerArrayDeClave(src, mapa.ancla, mapa.clave);
  if (mapa.tipo === 'select') return extraerOptionsSelect(src, mapa.ancla);
  return extraerClavesMapa(src, mapa.ancla);
}

// ---------------------------------------------------------------------------
// Comparador
// ---------------------------------------------------------------------------

// Devuelve las desincronizaciones de un texto contra el canon. No imprime.
function compararTexto(src, group) {
  var fallos = [];
  var mapas = group.mapas || [];

  mapas.forEach(function (mapa) {
    var extraido = extraerMapa(src, mapa);
    if (!extraido) {
      fallos.push({
        archivo: group.archivo, linea: 0, mapa: mapa.nombre,
        tipo: 'ilegible', slug: mapa.ancla
      });
      return;
    }

    var presentes = extraido.slugs.filter(function (s) {
      if (mapa.ambito === 'sitio') return true;
      return NEUTROS.indexOf(s) === -1;
    });

    CANON.forEach(function (slug) {
      if (presentes.indexOf(slug) === -1) {
        fallos.push({ archivo: group.archivo, linea: extraido.linea, mapa: mapa.nombre, tipo: 'falta', slug: slug });
      }
    });
    presentes.forEach(function (slug) {
      if (CANON.indexOf(slug) === -1 && presentes.indexOf(slug) === presentes.lastIndexOf(slug)) {
        fallos.push({ archivo: group.archivo, linea: extraido.linea, mapa: mapa.nombre, tipo: 'sobra', slug: slug });
      }
    });
  });

  return fallos;
}

function textosDeFallo(fallos) {
  return fallos.map(function (f) {
    if (f.tipo === 'ilegible') {
      return '[DESYNC] ' + f.archivo + ':0 no se pudo extraer ' + f.mapa;
    }
    return '[DESYNC] ' + f.archivo + ':' + f.linea + ' ' + f.tipo + ' ' + f.slug;
  });
}

// ---------------------------------------------------------------------------
// Auditoria real
// ---------------------------------------------------------------------------

function auditar(opciones) {
  var fallos = [];
  var detalle = [];
  var copiasOk = 0;

  COPIAS.forEach(function (copia) {
    var ruta = path.join(RAIZ, copia.archivo);
    var src;
    try {
      src = fs.readFileSync(ruta, 'utf8');
    } catch (e) {
      fallos.push({ archivo: copia.archivo, linea: 0, mapa: 'archivo', tipo: 'ilegible', slug: copia.archivo });
      detalle.push({ copia: copia.n, archivo: copia.archivo, ok: false });
      return;
    }
    var f = compararTexto(src, copia);
    detalle.push({ copia: copia.n, archivo: copia.archivo, ok: !f.length });
    if (f.length) fallos = fallos.concat(f);
    else copiasOk++;
  });

  var consumidorOk = false;
  var rutaConsumidor = path.join(RAIZ, CONSUMIDOR.archivo);
  try {
    var srcConsumidor = fs.readFileSync(rutaConsumidor, 'utf8');
    var fc = compararTexto(srcConsumidor, CONSUMIDOR);
    if (fc.length) fallos = fallos.concat(fc);
    else consumidorOk = true;
  } catch (e) {
    fallos.push({ archivo: CONSUMIDOR.archivo, linea: 0, mapa: 'archivo', tipo: 'ilegible', slug: CONSUMIDOR.archivo });
  }

  if (opciones.json) {
    console.log(JSON.stringify({
      ok: !fallos.length,
      slugs: CANON.length,
      copiasOk: copiasOk,
      copiasTotal: COPIAS.length,
      consumidorOk: consumidorOk,
      copias: detalle,
      fallos: fallos
    }, null, 2));
  } else {
    console.log('verificar-subcategorias -- lista cerrada de sitio (ADR-016, ' + COPIAS.length + ' copias)');
    textosDeFallo(fallos).forEach(function (t) { console.log(t); });
    if (!fallos.length) {
      console.log('OK. ' + copiasOk + '/' + COPIAS.length + ' copias sincronizadas (' + CANON.length + ' slugs)');
      console.log('OK. consumidor ' + CONSUMIDOR.archivo + ' ' + CONSUMIDOR.mapas[0].nombre + ' cubre los ' + CANON.length + ' slugs');
    }
  }

  return fallos.length ? 1 : 0;
}

// ---------------------------------------------------------------------------
// --self-test: fixtures EN MEMORIA (no toca archivos reales)
// ---------------------------------------------------------------------------

var FIX_SANO = [
  'var SUBCAT_LISTA = {',
  "  sitio: ['naturaleza', 'museo', 'cultura', 'bar', 'parque', 'espacio-publico',",
  "          'sitio-historico', 'religioso', 'aventura', 'ciudad'],",
  "  comida: ['restaurante', 'cafe']",
  '};'
].join('\n');

var FIX_CIUDAD = FIX_SANO.replace(", 'ciudad'", '');

var FIX_SELECT_SIN_BAR = [
  '<select id="sitio_subcategoria">',
  '<option value="">Seleccionar tipo...</option>',
  '<option value="naturaleza">Naturaleza</option>',
  '<option value="museo">Museo</option>',
  '<option value="cultura">Cultura</option>',
  '<option value="parque">Parque</option>',
  '<option value="espacio-publico">Espacio publico</option>',
  '<option value="sitio-historico">Sitio historico</option>',
  '<option value="religioso">Religioso</option>',
  '<option value="aventura">Aventura</option>',
  '<option value="ciudad">Ciudad / Pueblo</option>',
  '</select>'
].join('\n');

var FIX_SOBRA = FIX_SANO.replace(", 'ciudad'", ", 'ciudad', 'playa'");

// Copia 10 (mapa de etiquetas mdSubcatLabel/scMap): sin 'ciudad'.
var FIX_MAPA_SIN_CIUDAD = [
  'function mdSubcatLabel(sc) {',
  '  if (!sc) return \'\';',
  '  var scMap = {',
  "    'naturaleza': 'Naturaleza',",
  "    'museo': 'Museo',",
  "    'cultura': 'Cultura',",
  "    'bar': 'Bar',",
  "    'parque': 'Parque Urbano',",
  "    'espacio-publico': 'Espacio Publico',",
  "    'sitio-historico': 'Sitio Historico',",
  "    'religioso': 'Religioso',",
  "    'aventura': 'Aventura',",
  "    'restaurante': 'Restaurante'",
  '  };',
  '  return scMap[sc] || sc;',
  '}'
].join('\n');

function selfTest() {
  var grupoClave = { archivo: 'fixture-clave.js', mapas: [{ nombre: 'SUBCAT_LISTA.sitio', tipo: 'clave', ancla: 'SUBCAT_LISTA', clave: 'sitio', ambito: 'sitio' }] };
  var grupoSelect = { archivo: 'fixture-select.html', mapas: [{ nombre: 'select', tipo: 'select', ancla: 'id="sitio_subcategoria"', ambito: 'sitio' }] };
  var grupoMapa = { archivo: 'fixture-copia10.js', mapas: [{ nombre: 'mdSubcatLabel/scMap', tipo: 'mapa', ancla: 'scMap', ambito: 'todas' }] };

  var casos = [
    { nombre: 'fixture sana (array)', grupo: grupoClave, src: FIX_SANO, debeFallar: false, espera: null },
    { nombre: 'fixture sin ciudad (array)', grupo: grupoClave, src: FIX_CIUDAD, debeFallar: true, espera: 'falta ciudad' },
    { nombre: 'fixture sin bar (select)', grupo: grupoSelect, src: FIX_SELECT_SIN_BAR, debeFallar: true, espera: 'falta bar' },
    { nombre: 'fixture con slug de mas (array)', grupo: grupoClave, src: FIX_SOBRA, debeFallar: true, espera: 'sobra playa' },
    { nombre: 'fixture mapa sin ciudad (copia 10)', grupo: grupoMapa, src: FIX_MAPA_SIN_CIUDAD, debeFallar: true, espera: 'falta ciudad' }
  ];

  var bien = 0;
  console.log('verificar-subcategorias -- self-test (fixtures en memoria)');

  casos.forEach(function (caso) {
    var fallos = compararTexto(caso.src, caso.grupo);
    var textos = textosDeFallo(fallos);
    var detectado = fallos.length > 0;
    var ok = (detectado === caso.debeFallar);

    if (ok && caso.espera) {
      var aguja = '[DESYNC] ' + caso.grupo.archivo + ':';
      ok = textos.some(function (t) { return t.indexOf(aguja) === 0 && t.indexOf(caso.espera) !== -1; });
    }

    console.log('[' + (ok ? 'SELF-TEST OK' : 'SELF-TEST MAL') + '] ' + caso.nombre);
    textos.forEach(function (t) { console.log('  ' + t); });
    if (ok) bien++;
  });

  if (bien !== casos.length) {
    console.log('[SELF-TEST] FALLO: el detector no se comporta como debe (' + bien + '/' + casos.length + ')');
    return 2;
  }
  console.log('[SELF-TEST] PASS: el comparador DETECTA la desincronizacion (' + bien + '/' + casos.length + ' casos). Exit 1 por diseno.');
  return 1;
}

// ---------------------------------------------------------------------------
// Interfaz de libreria (el CLI no cambia: solo se ejecuta como programa)
// ---------------------------------------------------------------------------

module.exports = {
  CANON: CANON,
  NEUTROS: NEUTROS,
  COPIAS: COPIAS,
  CONSUMIDOR: CONSUMIDOR,
  compararTexto: compararTexto,
  textosDeFallo: textosDeFallo,
  auditar: auditar,
  selfTest: selfTest
};

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

if (require.main === module) {
  var argv = process.argv.slice(2);
  if (argv.indexOf('--self-test') !== -1) {
    process.exit(selfTest());
  }
  process.exit(auditar({ json: argv.indexOf('--json') !== -1 }));
}
