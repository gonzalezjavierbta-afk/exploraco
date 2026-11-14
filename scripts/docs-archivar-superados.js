#!/usr/bin/env node
/**
 * docs-archivar-superados.js
 *
 * Compacta TASKS.md / NEXT.md moviendo los bloques marcados SUPERADO a sus
 * sumideros TASKS_ARCHIVO.md / NEXT_ARCHIVO.md.
 *
 * ADR-003: mover NO es borrar. El contenido se conserva integro en el sumidero.
 *
 * Definicion de bloque: lineas contiguas que empiezan en una linea '- ' y
 * terminan antes de la siguiente linea '- ', de un heading (#..###### + espacio)
 * o de EOF. Las lineas en blanco de separacion no cortan el bloque y no forman
 * parte de el (se quedan en el activo).
 *
 * Archivable: la PRIMERA linea del bloque contiene 'SUPERADO' (case-sensitive).
 * Una mencion interna de SUPERADO NO archiva el bloque.
 *
 * Modos:
 *   --dry-run  (default) informa, no escribe nada.
 *   --apply    anade los bloques al sumidero bajo '## Archivado YYYY-MM-DD'
 *              y los quita del activo. Con assert de integridad previo a la
 *              escritura: si falla, NO escribe y sale con codigo 1.
 *   --help     esta ayuda.
 *
 * Opciones: --pair tasks|next (por defecto los dos).
 * Preserva el fin de linea byte a byte (\r\n o \n) detectado en cada fichero.
 *
 * Uso:
 *   node scripts/docs-archivar-superados.js --dry-run
 *   node scripts/docs-archivar-superados.js --apply
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DOCS = path.join(ROOT, 'exploraco desarrollo');

const PAIRS = [
  {
    id: 'tasks',
    active: path.join(DOCS, 'TASKS.md'),
    sink: path.join(DOCS, 'TASKS_ARCHIVO.md')
  },
  {
    id: 'next',
    active: path.join(DOCS, 'NEXT.md'),
    sink: path.join(DOCS, 'NEXT_ARCHIVO.md')
  }
];

const MARK = 'SUPERADO';
const SAMPLE_MAX = 72;

function usage() {
  const out = [];
  out.push('docs-archivar-superados.js - compacta TASKS.md / NEXT.md (ADR-003)');
  out.push('');
  out.push('Uso:');
  out.push('  node scripts/docs-archivar-superados.js [--dry-run|--apply] [--pair tasks|next]');
  out.push('  node scripts/docs-archivar-superados.js --help');
  out.push('');
  out.push('  --dry-run  (default) cuenta bloques, bytes y muestra 5 prefijos. No escribe.');
  out.push('  --apply    mueve los bloques SUPERADO al sumidero congelado y los quita del activo.');
  out.push('             Assert previo: bytes quitados == bytes anadidos (sin cabecera) y');
  out.push('             0 bloques SUPERADO restantes. Si falla, no escribe y sale con 1.');
  out.push('  --pair     Limita la corrida a un par: tasks o next.');
  out.push('');
  out.push('Bloque: arranca en linea "- " y acaba antes de la siguiente "- ", de un');
  out.push('heading (#..###### + espacio) o EOF. Las lineas en blanco de separacion no');
  out.push('se mueven. Archivable solo si la PRIMERA linea del bloque lleva "SUPERADO".');
  out.push('Idempotente: una segunda corrida --apply no cambia nada.');
  return out.join('\n');
}

function fail(msg, code) {
  process.stderr.write('ERROR: ' + msg + '\n');
  process.exit(typeof code === 'number' ? code : 1);
}

/* ---------- lineas ---------- */

function splitLines(text) {
  const lines = [];
  let i = 0;
  const n = text.length;
  while (i < n) {
    let j = i;
    let eol = '';
    while (j < n) {
      const c = text.charCodeAt(j);
      if (c === 13) {
        eol = (text.charCodeAt(j + 1) === 10) ? '\r\n' : '\r';
        break;
      }
      if (c === 10) {
        eol = '\n';
        break;
      }
      j++;
    }
    if (eol === '') {
      lines.push({ text: text.slice(i), eol: '' });
      break;
    }
    lines.push({ text: text.slice(i, j), eol: eol });
    i = j + eol.length;
  }
  return lines;
}

function detectEol(lines) {
  const seen = { '\r\n': 0, '\n': 0, '\r': 0 };
  for (let i = 0; i < lines.length; i++) {
    const e = lines[i].eol;
    if (e !== '' && Object.prototype.hasOwnProperty.call(seen, e)) seen[e]++;
  }
  let best = '\r\n';
  let max = -1;
  const keys = ['\r\n', '\n', '\r'];
  for (let k = 0; k < keys.length; k++) {
    const key = keys[k];
    if (seen[key] > max) {
      max = seen[key];
      best = key;
    }
  }
  return best;
}

function joinLines(lines) {
  let out = '';
  for (let i = 0; i < lines.length; i++) {
    out += lines[i].text + lines[i].eol;
  }
  return out;
}

function bytesOf(str) {
  return Buffer.byteLength(str, 'utf8');
}

/* ---------- delimitadores ---------- */

function isBullet(lineText) {
  return lineText.slice(0, 2) === '- ';
}

function isHeading(lineText) {
  let k = 0;
  while (k < lineText.length && lineText.charAt(k) === '#') k++;
  if (k === 0) return false;
  const next = lineText.charAt(k);
  return next === ' ' || next === '\t' || next === '';
}

function isBlank(lineText) {
  return lineText.trim() === '';
}

/*
 * Devuelve bloques { start, end } con indices inclusivos sobre el array de
 * lineas. El campo end apunta a la ultima linea NO en blanco del bloque.
 */
function findBlocks(lines) {
  const blocks = [];
  let i = 0;
  const n = lines.length;
  while (i < n) {
    if (!isBullet(lines[i].text)) {
      i++;
      continue;
    }
    let last = i;
    let j = i;
    while (j + 1 < n && !isBullet(lines[j + 1].text) && !isHeading(lines[j + 1].text)) {
      j++;
      if (!isBlank(lines[j].text)) last = j;
    }
    blocks.push({ start: i, end: last });
    i = j + 1;
  }
  return blocks;
}

function isArchivable(lines, block) {
  return lines[block.start].text.indexOf(MARK) !== -1;
}

/* ---------- muestras ---------- */

function sampleOf(lineText) {
  let base = lineText.replace(/^\s*-\s+/, '');
  const bold = base.indexOf('**');
  if (bold !== -1) base = base.slice(bold).replace(/^\*+/, '');
  let raw = base.replace(/\s+/g, ' ').trim();
  if (raw.length > SAMPLE_MAX) raw = raw.slice(0, SAMPLE_MAX) + '...';
  let safe = '';
  for (let i = 0; i < raw.length; i++) {
    const code = raw.charCodeAt(i);
    safe += (code > 32 && code < 127) ? raw.charAt(i) : (code === 32 ? ' ' : '?');
  }
  return safe;
}

/* ---------- analisis ---------- */

function analyze(filePath) {
  if (!fs.existsSync(filePath)) fail('no existe ' + filePath);
  const raw = fs.readFileSync(filePath, 'utf8');
  const lines = splitLines(raw);
  const rebuilt = joinLines(lines);
  const eol = detectEol(lines);
  const blocks = findBlocks(lines);

  let archivables = 0;
  let bytes = 0;
  const samples = [];
  const removable = [];

  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];
    if (!isArchivable(lines, b)) continue;
    archivables++;
    let chunk = '';
    for (let k = b.start; k <= b.end; k++) chunk += lines[k].text + lines[k].eol;
    bytes += bytesOf(chunk);
    removable.push(b);
    if (samples.length < 5) samples.push({ line: b.start + 1, text: sampleOf(lines[b.start].text) });
  }

  return {
    filePath: filePath,
    raw: raw,
    bytes: bytesOf(raw),
    lines: lines,
    eol: eol,
    splitOk: rebuilt === raw,
    blocks: blocks,
    archivables: archivables,
    archivableBytes: bytes,
    samples: samples,
    removable: removable
  };
}

function remainingArchivables(info) {
  const lines = splitLines(info.raw);
  const blocks = findBlocks(lines);
  let count = 0;
  for (let i = 0; i < blocks.length; i++) {
    if (isArchivable(lines, blocks[i])) count++;
  }
  return count;
}

function fmtBytes(n) {
  return n + ' B (' + (n / 1024).toFixed(1) + ' KB)';
}

function today() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return d.getFullYear() + '-' + mm + '-' + dd;
}

/* ---------- dry run ---------- */

function reportDry(info) {
  const rel = path.relative(ROOT, info.filePath).split(path.sep).join('/');
  const out = [];
  out.push('== ' + rel);
  out.push('   EOL detectado       : ' + (info.eol === '\r\n' ? 'CRLF' : (info.eol === '\n' ? 'LF' : 'CR')));
  out.push('   bytes del activo    : ' + fmtBytes(info.bytes));
  out.push('   bloques totales     : ' + info.blocks.length);
  out.push('   bloques archivables : ' + info.archivables);
  out.push('   bytes a mover       : ' + fmtBytes(info.archivableBytes));
  if (info.archivables === 0) {
    out.push('   muestra             : (ninguna)');
  } else {
    for (let i = 0; i < info.samples.length; i++) {
      out.push('   muestra ' + (i + 1) + '            : L' + info.samples[i].line + ' | ' + info.samples[i].text);
    }
  }
  return out.join('\n');
}

/* ---------- apply ---------- */

function buildApply(info, sinkPath) {
  if (info.archivables === 0) return null;
  if (!info.splitOk) fail('splitter inconsistente en ' + info.filePath);

  const sinkRaw = fs.readFileSync(sinkPath, 'utf8');
  const sinkLines = splitLines(sinkRaw);
  const sinkEol = detectEol(sinkLines);
  if (sinkEol !== info.eol) {
    fail('EOL distinto entre activo (' + (info.eol === '\r\n' ? 'CRLF' : 'LF') +
      ') y sumidero (' + (sinkEol === '\r\n' ? 'CRLF' : 'LF') + '): ' +
      path.relative(ROOT, info.filePath) + ' / ' + path.relative(ROOT, sinkPath));
  }

  let removedContent = '';
  const drop = {};
  for (let i = 0; i < info.removable.length; i++) {
    const b = info.removable[i];
    for (let k = b.start; k <= b.end; k++) {
      removedContent += info.lines[k].text + info.lines[k].eol;
      drop[k] = true;
    }
  }

  const kept = [];
  for (let i = 0; i < info.lines.length; i++) {
    if (!drop[i]) kept.push(info.lines[i]);
  }
  const newActive = joinLines(kept);

  const heading = '## Archivado ' + today();
  let header = '';
  if (sinkRaw.length > 0) {
    const endsWithEol = sinkRaw.slice(-sinkEol.length) === sinkEol;
    const endsWithBlank = sinkRaw.slice(-(sinkEol.length * 2)) === (sinkEol + sinkEol);
    if (!endsWithEol) header += sinkEol + sinkEol;
    else if (!endsWithBlank) header += sinkEol;
  }
  header += heading + sinkEol + sinkEol;

  const removedBytes = bytesOf(removedContent);
  const addedBytes = bytesOf(removedContent);
  const newActiveBytes = bytesOf(newActive);

  /* asserts en memoria, antes de tocar disco */
  if (removedBytes !== info.archivableBytes) {
    fail('bytes por bloque (' + removedBytes + ') != total archivables (' + info.archivableBytes + ')');
  }
  if (removedBytes !== addedBytes) {
    fail('assert integridad: bytes quitados (' + removedBytes + ') != bytes anadidos (' + addedBytes + ')');
  }
  if (newActiveBytes !== info.bytes - removedBytes) {
    fail('assert integridad: activo resultante (' + newActiveBytes + ') != ' +
      info.bytes + ' - ' + removedBytes + ' = ' + (info.bytes - removedBytes));
  }
  const left = remainingArchivables({ raw: newActive });
  if (left !== 0) {
    fail('assert integridad: quedan ' + left + ' bloques con ' + MARK + ' en el activo');
  }
  if (newActive.indexOf(MARK) !== -1) {
    process.stdout.write('AVISO: el activo conserva menciones internas a ' + MARK +
      ' (no archivables por regla de primera linea)\n');
  }

  return {
    header: header,
    removedContent: removedContent,
    newActive: newActive,
    sinkPath: sinkPath,
    sinkRaw: sinkRaw,
    sinkBytes: bytesOf(sinkRaw),
    headerBytes: bytesOf(header),
    removedBytes: removedBytes,
    addedBytes: addedBytes,
    newActiveBytes: newActiveBytes,
    blocks: info.removable.length
  };
}

function writeAtomic(target, content) {
  const tmp = target + '.tmp-archivar';
  fs.writeFileSync(tmp, content, 'utf8');
  fs.renameSync(tmp, target);
}

function runApply(info, plan) {
  const relActive = path.relative(ROOT, info.filePath).split(path.sep).join('/');
  const relSink = path.relative(ROOT, plan.sinkPath).split(path.sep).join('/');

  const newSink = plan.sinkRaw + plan.header + plan.removedContent;
  writeAtomic(plan.sinkPath, newSink);
  writeAtomic(info.filePath, plan.newActive);

  /* verificacion por relectura */
  const sinkAfter = bytesOf(fs.readFileSync(plan.sinkPath, 'utf8'));
  const activeAfter = bytesOf(fs.readFileSync(info.filePath, 'utf8'));
  const sinkExpected = plan.sinkBytes + plan.headerBytes + plan.addedBytes;
  const activeExpected = info.bytes - plan.removedBytes;
  const left = remainingArchivables({ raw: fs.readFileSync(info.filePath, 'utf8') });

  const out = [];
  out.push('== ' + relActive + ' -> ' + relSink);
  out.push('   bloques movidos     : ' + plan.blocks);
  out.push('   bytes quitados      : ' + plan.removedBytes);
  out.push('   bytes anadidos      : ' + plan.addedBytes + ' (sin cabecera; cabecera ' + plan.headerBytes + ')');
  out.push('   activo              : ' + info.bytes + ' -> ' + activeAfter + ' B');
  out.push('   sumidero            : ' + plan.sinkBytes + ' -> ' + sinkAfter + ' B');
  out.push('   SUPERADO restantes  : ' + left);

  if (removedBytesGuard(plan) !== true || sinkAfter !== sinkExpected || activeAfter !== activeExpected || left !== 0) {
    process.stdout.write(out.join('\n') + '\n');
    fail('verificacion post-escritura fallida en ' + relActive);
  }
  out.push('   assert              : PASS');
  return out.join('\n');
}

function removedBytesGuard(plan) {
  return plan.removedBytes === plan.addedBytes;
}

/* ---------- main ---------- */

function main(argv) {
  const args = argv.slice(2);
  let mode = 'dry-run';
  let pairFilter = null;

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--help' || a === '-h') {
      process.stdout.write(usage() + '\n');
      return 0;
    } else if (a === '--dry-run') {
      mode = 'dry-run';
    } else if (a === '--apply') {
      mode = 'apply';
    } else if (a === '--pair') {
      i++;
      pairFilter = args[i];
      if (pairFilter !== 'tasks' && pairFilter !== 'next') fail('--pair admite tasks o next', 2);
    } else if (a.indexOf('--pair=') === 0) {
      pairFilter = a.slice('--pair='.length);
      if (pairFilter !== 'tasks' && pairFilter !== 'next') fail('--pair admite tasks o next', 2);
    } else {
      fail('argumento no reconocido: ' + a + ' (ver --help)', 2);
    }
  }

  const pairs = pairFilter ? PAIRS.filter(function (p) { return p.id === pairFilter; }) : PAIRS;
  if (pairs.length === 0) fail('par no encontrado: ' + pairFilter, 2);

  const out = [];
  out.push('docs-archivar-superados | modo: ' + mode + ' | fecha: ' + today());

  let totalBlocks = 0;
  let totalBytes = 0;
  const plans = [];

  for (let i = 0; i < pairs.length; i++) {
    const pair = pairs[i];
    const info = analyze(pair.active);
    totalBlocks += info.archivables;
    totalBytes += info.archivableBytes;

    if (mode === 'dry-run') {
      out.push(reportDry(info));
    } else if (info.archivables === 0) {
      out.push('== ' + path.relative(ROOT, pair.active).split(path.sep).join('/') +
        '\n   0 bloques SUPERADO: sin cambios (idempotente)');
    } else {
      const plan = buildApply(info, pair.sink);
      plans.push({ info: info, plan: plan });
      out.push('== ' + path.relative(ROOT, pair.active).split(path.sep).join('/') +
        ' -> ' + path.relative(ROOT, pair.sink).split(path.sep).join('/') +
        '\n   bloques a mover     : ' + info.archivables +
        '\n   bytes a mover       : ' + fmtBytes(info.archivableBytes));
    }
  }

  out.push('TOTAL bloques archivables: ' + totalBlocks + ' | TOTAL bytes: ' + fmtBytes(totalBytes));

  if (mode === 'dry-run') {
    out.push('DRY-RUN: no se ha escrito ningun fichero.');
    process.stdout.write(out.join('\n') + '\n');
    return 0;
  }

  if (plans.length === 0) {
    out.push('APPLY: 0 cambios.');
    process.stdout.write(out.join('\n') + '\n');
    return 0;
  }

  const res = [];
  for (let i = 0; i < plans.length; i++) {
    res.push(runApply(plans[i].info, plans[i].plan));
  }
  out.push(res.join('\n'));
  out.push('APPLY: OK. Contenido conservado integro en el sumidero (ADR-003).');
  process.stdout.write(out.join('\n') + '\n');
  return 0;
}

if (require.main === module) {
  const code = main(process.argv);
  process.exit(code || 0);
}

module.exports = { splitLines: splitLines, findBlocks: findBlocks, isArchivable: isArchivable };
