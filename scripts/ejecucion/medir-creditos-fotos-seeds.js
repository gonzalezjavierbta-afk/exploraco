// scripts/ejecucion/medir-creditos-fotos-seeds.js
//
// MEDICION (solo lectura) de la atribucion de fotos en scripts/seed-*.js.
// TSK-252 / FILA 6 / BUG-139 (parte DATOS). NO escribe en base de datos,
// NO ejecuta seeds, NO modifica ningun seed: solo lee texto.
//
// Pregunta que responde:
//   De los seeds que publican fotos de Wikimedia, cuantos declaran el credito
//   y por cual de las 3 fuentes de la cascada de api/pagina-destino.js:961-969:
//     1) tags.creditos_fotos [{url, autor, licencia}]
//     2) campos autor/licencia del item de media
//     3) caption compuesto "<texto> - Foto: <autor> / <lic>"
//   Un seed que no declara 1, 2 ni 3 es un HUECO REAL de atribucion.
//
// Cubos:
//   (a) escribe creditos_fotos
//   (b) NO lo escribe, pero compone "Foto: " en el caption (fuente 3 salva)
//   (c) NO lo escribe y NO hay "Foto: " -> hueco real de atribucion
//   (d) no aplica: el seed no publica fotos de Wikimedia
//
// Detalle importante del metodo (por que no basta un grep):
//   - "creditos_fotos" y "Foto:" aparecen TAMBIEN en comentarios de seeds que
//     no los escriben (seed-barranquilla documenta el campo en cabecera). Se
//     quitan comentarios antes de medir, respetando strings y URLs (https://).
//   - La subcadena "Foto:" matchea identificadores como "publicarSinFoto:"
//     (seed-medellin.js:364). Por eso se exige "Foto:" seguido de espacio.
//   - Las fotos pueden venir de la ficha (FOTOS_SUGERIDAS / _informe-fotos.json)
//     y no de una URL literal: esas tambien son Wikimedia y cuentan.
//
// Uso:
//   node scripts/ejecucion/medir-creditos-fotos-seeds.js
//   node scripts/ejecucion/medir-creditos-fotos-seeds.js --slugs
//   node scripts/ejecucion/medir-creditos-fotos-seeds.js --cubo=c --slugs
//   node scripts/ejecucion/medir-creditos-fotos-seeds.js --json=<ruta>
//
// Exit code 0 siempre (es una medicion, no un gate).
// ASCII-safe: 0 bytes > 127, 0 backticks.

var fs = require('fs');
var path = require('path');

var ROOT = path.resolve(__dirname, '..', '..');
var SEED_DIR = path.join(ROOT, 'scripts');

// Familias. La lista de paginas de ciudad es curada y explicita: los seeds no
// declaran categoria_slug 'ciudad' (medido: 0 archivos), asi que no hay un
// campo del que derivarla sin inventar.
var FAMILIA_LOTES = /^seed-medellin-lote\d+\.js$/;
var PAGINAS_DE_CIUDAD = [
  'seed-bogota.js',
  'seed-medellin.js',
  'seed-cartagena-de-indias.js',
  'seed-santiago-de-cali.js',
  'seed-barranquilla.js',
  'seed-santa-marta.js',
  'seed-salento.js',
  'seed-palomino.js',
  'seed-sibundoy.js',
  'seed-bahia-malaga.js',
  'seed-candelario.js',
  'seed-bogota-guia-para-el-viajero.js',
  'seed-bogota-gastronomia-guia.js',
  'seed-parques-y-espacios-verdes-de-bogota.js',
  'seed-la-candelaria-recorrido-por-el-centro.js',
  'seed-lacandelaria.js',
  'seed-theatron-guia.js',
  'seed-monserrate-guia.js',
  'seed-ruta-salsera-bogota.js'
];

function argValue(name, def) {
  var hit = process.argv.slice(2).filter(function (a) { return a.indexOf('--' + name + '=') === 0; })[0];
  if (!hit) return def;
  return hit.split('=').slice(1).join('=');
}

function tieneFlag(name) {
  return process.argv.indexOf('--' + name) !== -1;
}

// Quita comentarios de linea y de bloque sin tocar el contenido de strings.
// Necesario porque las URLs llevan "//" y porque los seeds documentan el campo
// en cabecera sin escribirlo.
function sinComentarios(src) {
  var out = [];
  var i = 0;
  var n = src.length;
  var q = '';
  while (i < n) {
    var c = src.charAt(i);
    var c2 = src.charAt(i + 1);
    if (q) {
      out.push(c);
      if (c === '\\') {
        if (i + 1 < n) { out.push(c2); i += 2; continue; }
        i++;
        continue;
      }
      if (c === q) q = '';
      i++;
      continue;
    }
    if (c === '/' && c2 === '/') {
      while (i < n && src.charAt(i) !== '\n') i++;
      continue;
    }
    if (c === '/' && c2 === '*') {
      i += 2;
      while (i < n && !(src.charAt(i) === '*' && src.charAt(i + 1) === '/')) i++;
      i += 2;
      continue;
    }
    if (c === "'" || c === '"' || c.charCodeAt(0) === 96) {
      q = c;
      out.push(c);
      i++;
      continue;
    }
    out.push(c);
    i++;
  }
  return out.join('');
}

function familiaDe(archivo) {
  if (FAMILIA_LOTES.test(archivo)) return 'lotes-medellin';
  if (PAGINAS_DE_CIUDAD.indexOf(archivo) !== -1) return 'paginas-de-ciudad';
  return 'resto';
}

function medirArchivo(archivo) {
  var ruta = path.join(SEED_DIR, archivo);
  var src = fs.readFileSync(ruta, 'utf8');
  var code = sinComentarios(src);

  // Fotos de Wikimedia. Un seed puede no tener la URL literal porque:
  //   - la carga de un JSON hermano (require('./slug.fotos.json'))
  //   - la construye con el helper compartido (ejecucion/wikimedia-url.js)
  //   - la toma de la ficha (FOTOS_SUGERIDAS / _informe-fotos.json)
  // Los tres casos son Wikimedia igual: se resuelven aqui, no se asumen.
  var urlLiteral = /upload\.wikimedia\.org|thumb\.wikimedia\.org|commons\/thumb/.test(code);
  var derivadasFicha = /_informe-fotos\.json|FOTOS_SUGERIDAS/.test(code);
  var helperWikimedia = /wikimedia-url|nombres_archivo_wikimedia|urlMiniatura/.test(code);

  var jsonHermanos = [];
  var re = /require\(\s*['"]\.\/([^'"]+\.json)['"]\s*\)/g;
  var m;
  while ((m = re.exec(code)) !== null) {
    if (jsonHermanos.indexOf(m[1]) === -1) jsonHermanos.push(m[1]);
  }
  var jsonConWikimedia = jsonHermanos.filter(function (rel) {
    var abs = path.join(SEED_DIR, rel);
    if (!fs.existsSync(abs)) return false;
    return /upload\.wikimedia\.org/.test(fs.readFileSync(abs, 'utf8'));
  });

  var wikimedia = urlLiteral || derivadasFicha || helperWikimedia || jsonConWikimedia.length > 0;
  var unsplash = /images\.unsplash\.com/.test(code);

  var escribeCreditos = /\bcreditos_fotos\s*[:=]/.test(code);
  // "Foto: " precedido de comilla, guion o espacio: excluye identificadores
  // como publicarSinFoto: (seed-medellin.js:364) y etiquetas como FOTOS:.
  var fotoEnCaption = /(?:^|['"\s-])Foto:\s/.test(code);
  var autorLicencia = /\bautor\s*:|\blicencia\s*:/.test(code);

  var cubo;
  if (!wikimedia) cubo = 'd';
  else if (escribeCreditos) cubo = 'a';
  else if (fotoEnCaption) cubo = 'b';
  else cubo = 'c';

  return {
    archivo: archivo,
    slug: archivo.replace(/^seed-/, '').replace(/\.js$/, ''),
    familia: familiaDe(archivo),
    cubo: cubo,
    wikimedia: wikimedia,
    url_literal: urlLiteral,
    derivadas_ficha: derivadasFicha,
    helper_wikimedia: helperWikimedia,
    json_hermanos_wikimedia: jsonConWikimedia,
    unsplash: unsplash,
    escribe_creditos_fotos: escribeCreditos,
    foto_en_caption: fotoEnCaption,
    autor_licencia_suelto: autorLicencia
  };
}

function main() {
  var soloCubo = argValue('cubo', '');
  var mostrarSlugs = tieneFlag('slugs');
  var jsonPath = argValue('json', '');
  var depurar = argValue('depurar', '');

  // Control positivo: imprime las senales crudas de un seed concreto.
  if (depurar) {
    var uno = medirArchivo(/^seed-/.test(depurar) ? depurar : 'seed-' + depurar + '.js');
    console.log(JSON.stringify(uno, null, 2));
    return;
  }

  var archivos = fs.readdirSync(SEED_DIR)
    .filter(function (f) { return /^seed-.+\.js$/.test(f); })
    .sort();

  var filas = archivos.map(medirArchivo);

  var cubos = ['a', 'b', 'c', 'd'];
  var etiqueta = {
    a: 'escribe creditos_fotos (fuente 1)',
    b: 'sin campo, caption con "Foto: " (fuente 3 salva)',
    c: 'sin campo y sin "Foto: " (HUECO REAL)',
    d: 'no aplica (sin fotos de Wikimedia)'
  };
  var familias = ['lotes-medellin', 'paginas-de-ciudad', 'resto'];

  console.log('MEDICION creditos de fotos en seeds (solo lectura)');
  console.log('directorio: scripts/seed-*.js | archivos: ' + filas.length);
  console.log('');

  console.log('TOTALES POR CUBO');
  cubos.forEach(function (c) {
    var n = filas.filter(function (f) { return f.cubo === c; }).length;
    console.log('  (' + c + ') ' + n + '  ' + etiqueta[c]);
  });
  var suma = filas.length;
  console.log('  total ' + suma + ' (a+b+c+d)');
  console.log('');

  console.log('MATRIZ FAMILIA x CUBO');
  var cabecera = '  ' + 'familia'.padEnd(20) + '  a   b   c   d  tot';
  console.log(cabecera);
  familias.forEach(function (fam) {
    var sub = filas.filter(function (f) { return f.familia === fam; });
    var linea = '  ' + fam.padEnd(20);
    cubos.forEach(function (c) {
      var n = sub.filter(function (f) { return f.cubo === c; }).length;
      linea += ' ' + String(n).padStart(2) + ' ';
    });
    linea += ' ' + String(sub.length).padStart(3);
    console.log(linea);
  });
  console.log('');

  console.log('SENALES AUXILIARES (sobre los que publican fotos de Wikimedia)');
  var wiki = filas.filter(function (f) { return f.wikimedia; });
  console.log('  con fotos de Wikimedia: ' + wiki.length +
    ' | url literal: ' + wiki.filter(function (f) { return f.url_literal; }).length +
    ' | derivadas de ficha: ' + wiki.filter(function (f) { return f.derivadas_ficha; }).length +
    ' | helper/JSON hermano: ' + wiki.filter(function (f) { return f.helper_wikimedia || f.json_hermanos_wikimedia.length; }).length);
  console.log('  con "Foto: " en caption: ' + wiki.filter(function (f) { return f.foto_en_caption; }).length +
    ' | con autor:/licencia: sueltos: ' + wiki.filter(function (f) { return f.autor_licencia_suelto; }).length);
  var cuboD = filas.filter(function (f) { return f.cubo === 'd'; });
  console.log('  cubo (d): ' + cuboD.length + ' = ' +
    cuboD.filter(function (f) { return f.unsplash; }).length + ' solo Unsplash/otras + ' +
    cuboD.filter(function (f) { return !f.unsplash; }).length + ' sin fotos externas');
  console.log('');

  if (mostrarSlugs) {
    var verCubos = soloCubo ? [soloCubo] : cubos;
    verCubos.forEach(function (c) {
      var sub = filas.filter(function (f) { return f.cubo === c; });
      console.log('CUBO (' + c + ') ' + sub.length + ' -> ' + etiqueta[c]);
      familias.forEach(function (fam) {
        var deFam = sub.filter(function (f) { return f.familia === fam; });
        if (!deFam.length) return;
        console.log('  [' + fam + '] ' + deFam.length + ': ' +
          deFam.map(function (f) { return f.slug; }).join(', '));
      });
      console.log('');
    });
  } else {
    console.log('(para ver las listas de slugs: --slugs, opcionalmente --cubo=a|b|c|d)');
  }

  if (jsonPath) {
    var abs = path.isAbsolute(jsonPath) ? jsonPath : path.join(ROOT, jsonPath);
    var txt = JSON.stringify({
      generado: new Date().toISOString(),
      archivos: filas.length,
      totales: cubos.reduce(function (acc, c) {
        acc[c] = filas.filter(function (f) { return f.cubo === c; }).length;
        return acc;
      }, {}),
      filas: filas
    }, null, 2);
    if (/[^\x00-\x7F]/.test(txt)) throw new Error('contenido no ASCII en el informe');
    fs.writeFileSync(abs, txt.replace(/\r?\n/g, '\r\n') + '\r\n', 'utf8');
    console.log('informe json: ' + path.relative(ROOT, abs).replace(/\\/g, '/'));
  }
}

main();
