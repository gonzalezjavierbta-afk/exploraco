// scripts/ejecucion/verificar-capa-gratis.js
// Guard de la capa gratuita de agentes de ExploraCO (ADR-074).
// Lee .opencode/agent/*.md y opencode.json y FALLA (exit 1) si la capa
// gratuita se rompe, para que el gasto no se dispare en silencio.
//
// Por que existe: BUG-092 movio los agentes a opencode-go (de pago) cuando
// el free tier dejo de funcionar como subagente, y el ADR-067 siguio
// afirmando que eran gratuitos. Este guard convierte esa promesa en un hecho
// verificable: si alguien pinea un agente a un modelo de pago, el guard lo
// detecta antes de que se cobre la factura.
//
// Roster unico de 20 agentes (ADR-076): sin pares -free/-pro y sin ruta
// hibrida. Regla vigente: TODO agente del roster es FREE. Un agente sin
// `model:` hereda del primario, que hoy es FREE -> sigue siendo FREE.
//
// Uso:
//   node scripts/ejecucion/verificar-capa-gratis.js           verifica y tabla
//   node scripts/ejecucion/verificar-capa-gratis.js --json    salida JSON
//
// Salida: tabla de capas (PRIMARIO / ESPECIALISTA / PAID / ROTO) y codigo
// de salida 0 si todo cumple, 1 si hay alguna violacion.
// ASCII-safe (no emite tildes).

'use strict';

const fs = require('fs');
const path = require('path');

// --- Modelos verificados -----------------------------------------------------

// FREE: los unicos 3 que funcionan como subagente Y registran costo $0.000000
// (verificado con sondas reales el 2026-09-30, ADR-074).
const FREE = [
  'opencode/space-bunny-free',
  'opencode-go/space-bunny-free',
  'opencode-go/longcat-2.5-preview-free',
];

// ROTOS: parecen gratis por el nombre pero el proveedor los rechaza como
// subagente con "OpenCode's free tier can only be used from within OpenCode".
// No usarlos en .opencode/agent/*.md (verificado 2026-09-30).
const ROTOS = [
  'opencode/big-pickle',
  'opencode/ling-3.0-flash-fin-free',
  'opencode/longcat-2.5-preview-free',
  'opencode/mimo-v2.6-flash-free',
  'opencode/muse-spark-1.3-contributor-free',
  'opencode/nemotron-3-ultra-free',
  'opencode/nemotron-3.5-lightning-free',
];

// --- Parseo ------------------------------------------------------------------

function leerAgentes(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .sort()
    .map((f) => {
      const txt = fs.readFileSync(path.join(dir, f), 'utf8');
      const fm = txt.split('---')[1] || '';
      const campo = (k) => {
        const m = fm.match(new RegExp('^' + k + ':\\s*(.+)$', 'm'));
        return m ? m[1].trim() : null;
      };
      return {
        archivo: f,
        name: campo('name'),
        mode: campo('mode'),
        model: campo('model'),
      };
    })
    .filter((a) => a.name);
}

function leerConfig(p) {
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (e) {
    return null;
  }
}

// --- Capa de un agente -------------------------------------------------------

// Capa segun el modo declarado: los 4 primarios orquestan, los 16
// especialistas ejecutan. Ya no hay pares -free/-pro que clasificar por
// nombre: la capa la determina el MODELO, no el sufijo (ADR-076).
function capaDe(a) {
  const modo = modoDe(a);
  if (modo === 'pago') return 'PAID';
  if (modo === 'ROTO') return 'ROTO';
  return a.mode === 'primary' ? 'PRIMARIO' : 'ESPECIALISTA';
}

function modoDe(a) {
  if (!a.model) return 'hereda';
  if (FREE.indexOf(a.model) >= 0) return 'free';
  if (esRoto(a.model)) return 'ROTO';
  return 'pago';
}

function esRoto(m) {
  return ROTOS.indexOf(m) >= 0;
}

// --- Verificacion ------------------------------------------------------------

function verificar(root) {
  const agDir = path.join(root, '.opencode', 'agent');
  const agentes = leerAgentes(agDir);
  const cfg = leerConfig(path.join(root, 'opencode.json'));
  const fallas = [];

  if (!agentes.length) fallas.push('No se encontro ningun agente en .opencode/agent/*.md');
  if (!cfg) fallas.push('opencode.json no existe o no es JSON valido');

  agentes.forEach((a) => {
    const modo = modoDe(a);

// 1. Ningun agente del roster puede quedar pineado a un modelo de pago
    //    (roster FREE integro, ADR-076).
    if (modo === 'pago') {
      fallas.push(
        a.name + ' esta pineado a un modelo de PAGO: ' + a.model +
        ' -> quitale la linea model: para que herede del primario FREE, o ponelo en la allowlist FREE'
      );
    }

    // 2. Ningun agente puede usar un modelo free que falla como subagente.
    if (modo === 'ROTO') {
      fallas.push(
        a.name + ' usa un modelo que FALLA como subagente: ' + a.model +
        ' -> usa ' + FREE[0]
      );
    }

    // 3. Cada especialista debe declarar `model:` explicito: heredar del
    //    primario es correcto, pero un pin explicito hace la capa auditable
    //    sin depender de quien invoco al subagente.
    if (a.mode === 'subagent' && !a.model) {
      fallas.push(
        a.name + ' es especialista y no declara model: -> anade model: ' + FREE[0]
      );
    }
  });

  // 4. El default de la sesion debe ser de la allowlist FREE.
  if (cfg) {
    ['model', 'small_model'].forEach((k) => {
      const v = cfg[k];
      if (!v) {
        fallas.push('opencode.json no declara "' + k + '"');
      } else if (FREE.indexOf(v) < 0) {
        fallas.push(
          'opencode.json "' + k + '" = ' + v + ' no esta en la allowlist FREE -> ' +
          'la sesion arrancaria en pago. Allowlist: ' + FREE.join(', ')
        );
      }
    });
  }

  return { agentes, cfg, fallas };
}

// --- Salida ------------------------------------------------------------------

function tabla(agentes) {
  const filas = agentes.map((a) => ({
    agente: a.name,
    modo: a.mode,
    capa: capaDe(a),
    modelo: a.model || '(hereda del primario)',
    coste: modoDe(a) === 'pago' ? 'PAGO' : modoDe(a) === 'ROTO' ? 'ROTO' : 'GRATIS',
  }));
  const libres = filas.filter((f) => f.coste === 'GRATIS').length;
  const dePago = filas.filter((f) => f.coste === 'PAGO').length;
  return { filas, libres, dePago };
}

function imprimir(res) {
  const t = tabla(res.agentes);
  console.log('');
  console.log('=== VERIFICACION DE LA CAPA GRATUITA (ADR-074) ===');
  console.log('');
  console.log('Agentes: ' + res.agentes.length +
    ' | gratis: ' + t.libres + ' | de pago: ' + t.dePago);
  console.log('Allowlist FREE: ' + FREE.join(', '));
  console.log('');
  console.log('| Agente | Capa | Modelo | Coste |');
  console.log('|---|---|---|---|');
  t.filas.forEach((f) => {
    console.log('| ' + f.agente + ' | ' + f.capa + ' | ' + f.modelo + ' | ' + f.coste + ' |');
  });
  console.log('');

  if (res.fallas.length) {
    console.log('RESULTADO: FALLA (' + res.fallas.length + ')');
    res.fallas.forEach((f, i) => console.log('  ' + (i + 1) + '. ' + f));
    console.log('');
    return 1;
  }
  console.log('RESULTADO: OK. La capa gratuita esta intacta.');
  console.log('');
  return 0;
}

// --- Main --------------------------------------------------------------------

function main() {
  const argv = process.argv.slice(2);
  const root = path.resolve(__dirname, '..', '..');
  const res = verificar(root);

  if (argv.indexOf('--json') >= 0) {
    const t = tabla(res.agentes);
    console.log(JSON.stringify({
      ok: res.fallas.length === 0,
      allowlist_free: FREE,
      free: t.libres,
      pago: t.dePago,
      agentes: t.filas,
      fallas: res.faldas,
    }, null, 2));
    return res.faldas.length ? 1 : 0;
  }

  return imprimir(res);
}

if (require.main === module) process.exit(main());

module.exports = { verificar, FREE, ROTOS, capaDe, modoDe };

