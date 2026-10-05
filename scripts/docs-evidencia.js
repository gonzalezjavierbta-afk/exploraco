#!/usr/bin/env node
/**
 * docs-evidencia.js -- evidencia medida por maquina para el pase documental.
 *
 * SOLO LECTURA: no escribe ficheros, no abre red, no toca DB.
 * Idempotente: mismos argumentos -> salida identica byte a byte.
 * Streaming obligatorio: ningun fichero se carga entero en memoria.
 *
 * ASCII puro (ADR-002): este fichero no contiene bytes > 127.
 * CommonJS estricto (BUG-001): require / module.exports.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');

const MAX_BYTES_SALIDA = 4096; // 4 KB de stdout
const GOB_DIR = path.join('exploraco desarrollo');
const GOB_ARCHIVOS = [
  'PROJECT.md',
  'NEXT.md',
  'TASKS.md',
  'BLUEPRINT.md',
  'DECISIONS.md',
  'BUGS_HISTORICOS.md'
];

const AYUDA = [
  'docs-evidencia.js -- evidencia medida para briefs documentales (solo lectura)',
  '',
  'USO',
  '  node scripts/docs-evidencia.js [opciones]',
  '',
  'OPCIONES',
  '  --commit <sha>      git show --stat del sha (defecto: HEAD), 3 lineas de resumen',
  '  --smokes <a,b,c>    rutas: cuenta ocurrencias de "check(" en streaming',
  '  --css-prefix <pre>  prefijo de selectores CSS a contar',
  '  --css-file <ruta>   fichero CSS donde contar (requiere --css-prefix)',
  '  --simbolo <f:s>     imprime la linea de la 1a aparicion de s en f (repetible)',
  '  --test              ejecuta npm test y muestra las ultimas 15 lineas + exit code',
  '  --help              esta ayuda',
  '',
  'SIEMPRE SE IMPRIME: GOBERNANZA (KB y lineas de los 6 .md de gobernanza).',
  'SIN OPCIONES: imprime la ayuda y sale con codigo 0.',
  'Salida maxima: 4 KB. Si se excede, se recorta la seccion mas larga y se avisa.'
].join('\n');

/** Convierte cualquier texto a ASCII imprimible (salida estable y portable). */
function ascii(texto) {
  return String(texto)
    .replace(/[\u0080-\u009f]/g, '?')
    .replace(/[\u0100-\uffff]/g, function (ch) {
      return /[ -~]/.test(ch) ? ch : '?';
    });
}

/**
 * Lee un fichero linea a linea en streaming (nunca entero en memoria).
 * onLine(linea, numeroDeLinea) -- solo lectura.
 */
function scanLines(fichero, onLine) {
  return new Promise(function (resolve, reject) {
    if (!fs.existsSync(fichero) || !fs.statSync(fichero).isFile()) {
      resolve({ existe: false });
      return;
    }
    const stream = fs.createReadStream(fichero, { highWaterMark: 65536 });
    let resto = Buffer.alloc(0);
    let n = 0;
    stream.on('data', function (chunk) {
      const buf = resto.length ? Buffer.concat([resto, chunk]) : chunk;
      let inicio = 0;
      let idx = buf.indexOf(10, inicio);
      while (idx !== -1) {
        n += 1;
        onLine(buf.slice(inicio, idx).toString('utf8'), n);
        inicio = idx + 1;
        idx = buf.indexOf(10, inicio);
      }
      resto = inicio < buf.length ? buf.slice(inicio) : Buffer.alloc(0);
    });
    stream.on('error', reject);
    stream.on('end', function () {
      if (resto.length) {
        n += 1;
        onLine(resto.toString('utf8'), n);
      }
      resolve({ existe: true, lineas: n });
    });
  });
}

/** Cuenta ocurrencias de un literal, linea a linea, en streaming. */
async function contarLiteral(fichero, literal) {
  let total = 0;
  const r = await scanLines(fichero, function (linea) {
    let desde = 0;
    for (;;) {
      const pos = linea.indexOf(literal, desde);
      if (pos === -1) return;
      total += 1;
      desde = pos + literal.length;
    }
  });
  if (!r.existe) return null;
  return total;
}

/**
 * Cuenta reglas CSS que empiezan por el prefijo (linea cuyo trim empieza por
 * el prefijo y contiene "{"), en streaming.
 */
async function contarCss(fichero, prefijo) {
  let reglas = 0;
  let lineas = 0;
  const r = await scanLines(fichero, function (linea) {
    const t = linea.trim();
    if (t.indexOf(prefijo) === 0 && t.indexOf('{') !== -1) reglas += 1;
  });
  if (!r.existe) return null;
  lineas = r.lineas;
  return { reglas: reglas, lineas: lineas };
}

/** Primera aparicion de un simbolo en un fichero (streaming). */
async function primeraAparicion(fichero, simbolo) {
  let hit = null;
  await scanLines(fichero, function (linea, n) {
    if (hit === null && linea.indexOf(simbolo) !== -1) {
      hit = { linea: n, texto: linea.trim() };
    }
  });
  return hit;
}

/** Lineas de un fichero (streaming). No usa readFileSync. */
async function contarLineas(fichero) {
  const r = await scanLines(fichero, function () {});
  return r.existe ? r.lineas : null;
}

function bytes(kb) {
  return (kb / 1024).toFixed(1);
}

function seccion(titulo, lineas) {
  return { titulo: titulo, lineas: lineas.slice(), recortada: false };
}

/**
 * Recorta por seccion (la mas larga) hasta caber en MAX_BYTES_SALIDA.
 * RESERVA cubre la cabecera global y los avisos de recorte, que se anaden
 * despues del ajuste y por eso no entran en la medida.
 */
function ajustar(sectores) {
  const RESERVA = 320;
  const objetivo = MAX_BYTES_SALIDA - RESERVA;
  const avisos = [];
  const caber = function () {
    let total = 0;
    for (const s of sectores) {
      total += Buffer.byteLength(ascii('[X] ' + s.titulo + '\n'), 'ascii');
      for (const l of s.lineas) total += Buffer.byteLength(ascii(l + '\n'), 'ascii');
    }
    return total;
  };
  let intentos = 0;
  while (caber() > objetivo && intentos < 600) {
    intentos += 1;
    let victima = null;
    for (const s of sectores) {
      if (s.lineas.length < 2) continue;
      if (!victima || s.lineas.length > victima.lineas.length) victima = s;
    }
    if (!victima) break;
    victima.lineas.pop();
    victima.recortada = true;
  }
  for (const s of sectores) {
    if (s.recortada) avisos.push('[!] AVISO: seccion recortada para caber en 4 KB -> ' + s.titulo);
  }
  return avisos;
}

/** npm test: solo ultimas 15 lineas + exit code. */
function seccionTest() {
  const r = spawnSync('npm', ['test'], {
    cwd: process.cwd(),
    encoding: 'utf8',
    shell: true,
    maxBuffer: 64 * 1024 * 1024
  });
  const salida = String((r.stdout || '') + (r.stderr || ''));
  const lineas = salida.replace(/\s+$/, '').split(/\r?\n/);
  const ultimas = lineas.slice(-15);
  const lineasOut = ultimas.map(function (l) { return '  ' + l; });
  lineasOut.push('  exit code: ' + (r.status === null ? 'null' : r.status));
  return seccion('TEST (npm test, ultimas 15 lineas)', lineasOut);
}

function parseArgs(argv) {
  const opciones = {};
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a.indexOf('--') !== 0) continue;
    const nombre = a.slice(2);
    const siguiente = argv[i + 1];
    const tieneValor = siguiente !== undefined && siguiente.indexOf('--') !== 0;
    if (tieneValor) {
      if (!opciones[nombre]) opciones[nombre] = [];
      opciones[nombre].push(siguiente);
      i += 1;
    } else {
      if (!opciones[nombre]) opciones[nombre] = [];
      opciones[nombre].push('1');
    }
  }
  return opciones;
}

function primero(opciones, nombre) {
  return opciones[nombre] && opciones[nombre][0] ? opciones[nombre][0] : null;
}

async function main() {
  const argv = process.argv.slice(2);
  const opciones = parseArgs(argv);
  const nombres = Object.keys(opciones);
  if (nombres.length === 0 || opciones.help) {
    process.stdout.write(ascii(AYUDA) + '\n');
    return 0;
  }

  const sectores = [];

  // 1. COMMIT
  if (opciones.commit) {
    const sha = primero(opciones, 'commit');
    const lineas = [];
    try {
      const out = execFileSync('git', ['show', '--stat', '--no-color', '--format=%h %s', sha], {
        cwd: process.cwd(),
        encoding: 'utf8',
        maxBuffer: 8 * 1024 * 1024,
        env: Object.assign({}, process.env, { GIT_PAGER: 'cat', PAGER: 'cat' })
      });
      const l = out.split(/\r?\n/).filter(function (x) { return x.trim() !== ''; });
      for (const x of l.slice(-3)) lineas.push('  ' + x.trim());
    } catch (e) {
      lineas.push('  ERROR: git show fallo para ' + sha);
    }
    sectores.push(seccion('COMMIT ' + sha, lineas));
  }

  // 2. SMOKES
  if (opciones.smokes) {
    const rutas = [];
    for (const grupo of opciones.smokes) {
      for (const r of grupo.split(',')) if (r.trim() !== '') rutas.push(r.trim());
    }
    const lineas = [];
    for (const ruta of rutas) {
      const n = await contarLiteral(ruta, 'check(');
      lineas.push('  ' + ruta + ' : check( x ' + (n === null ? 'FICHERO NO ENCONTRADO' : n));
    }
    sectores.push(seccion('SMOKES (check( por ruta)', lineas));
  }

  // 3. CSS
  if (opciones['css-prefix'] || opciones['css-file']) {
    const prefijo = primero(opciones, 'css-prefix') || '';
    const fichero = primero(opciones, 'css-file') || '';
    const lineas = [];
    const r = await contarCss(fichero, prefijo);
    if (!fichero) lineas.push('  falta --css-file');
    else if (!prefijo) lineas.push('  falta --css-prefix');
    else if (r === null) lineas.push('  ' + fichero + ' : FICHERO NO ENCONTRADO');
    else lineas.push('  ' + fichero + ' : reglas "' + prefijo + '" = ' + r.reglas + ' (de ' + r.lineas + ' lineas)');
    sectores.push(seccion('CSS', lineas));
  }

  // 4. GOBERNANZA (sin datos de entrada: siempre se imprime)
  {
    const lineas = [];
    for (const nombre of GOB_ARCHIVOS) {
      const f = path.join(GOB_DIR, nombre);
      if (!fs.existsSync(f)) {
        lineas.push('  ' + f + ' : NO EXISTE');
        continue;
      }
      const kb = fs.statSync(f).size;
      const n = await contarLineas(f);
      lineas.push('  ' + f + ' : ' + bytes(kb) + ' KB / ' + (n === null ? '?' : n) + ' lineas');
    }
    sectores.push(seccion('GOBERNANZA', lineas));
  }

  // 5. SIMBOLOS
  if (opciones.simbolo) {
    const lineas = [];
    for (const par of opciones.simbolo) {
      const corte = par.lastIndexOf(':');
      if (corte < 1) {
        lineas.push('  ' + par + ' : formato esperado fichero:simbolo');
        continue;
      }
      const fichero = par.slice(0, corte);
      const simbolo = par.slice(corte + 1);
      const hit = await primeraAparicion(fichero, simbolo);
      if (hit === null) {
        const existe = fs.existsSync(fichero);
        lineas.push('  ' + par + ' : ' + (existe ? 'NO ENCONTRADO' : 'FICHERO NO ENCONTRADO'));
      } else {
        lineas.push('  ' + par + ' : L' + hit.linea + ' | ' + hit.texto.slice(0, 160));
      }
    }
    sectores.push(seccion('SIMBOLOS', lineas));
  }

  // 6. TEST (opt-in)
  if (opciones.test) sectores.push(seccionTest());

  const avisos = ajustar(sectores);
  const out = [];
  out.push('=== EVIDENCIA DOCS (solo lectura) ===');
  for (let i = 0; i < sectores.length; i += 1) {
    out.push('[' + (i + 1) + '] ' + sectores[i].titulo);
    for (const l of sectores[i].lineas) out.push(l);
  }
  for (const a of avisos) out.push(a);
  process.stdout.write(ascii(out.join('\n')) + '\n');
  return 0;
}

main().then(
  function (code) { process.exit(code); },
  function (err) {
    process.stdout.write(ascii('[ERROR] ' + (err && err.message ? err.message : err)) + '\n');
    process.exit(1);
  }
);