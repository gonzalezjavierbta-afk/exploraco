// scripts/ejecucion/verificar-capa-gratis.js
// Guard de la CAPA DE MODELO de los agentes de ExploraCO.
// Vigente: DECISIONES en ADR-083 (D1/D2/D5, que sustituyen la premisa de
// "el tier es la sesion entera": el tier lo fija el MODELO ACTIVO DE CADA TURNO,
// cambiable por el operador en el selector, y los subagentes heredan ese modelo)
// y MECANICA en ADR-082 (herencia de modelo, allowlists medidas, ROTOS, BYPASS del
// menu @). Las dos conviven: se cita ADR-083 para las DECISIONES (D1/D2/D5) y
// ADR-082 para la MECANICA (herencia y allowlists).
//
// Que verifica: que la cascada este VIGENTE y que el precio no se esconda.
//
//   (a) Ningun subagente declara model: -> un pin aqui es una regresion.
//   (b) Los 16 subagentes declaran coste: heredado.
//   (c) NINGUN primario declara model: (D1) y declara coste: heredado. El precio
//       lo pone el modelo activo de la sesion, no un pin de agente.
//   (d) Cobertura de tiers POR LA SESION (D2), no por el frontmatter del agente:
//       las dos allowlists existen, son disjuntas y el default arranca en FREE.
//       El reparto real se mide con repartoPorTier() sobre message.data.modelID.
//   (e) Cero pines en TODO el roster, ninguno en las listas de prohibicion
//       (ADR-096 B1: NO_SUBAGENTE / NO_CATALOGO / NO_MEDIDO, cada una con su
//       motivo), ninguno fuera de allowlist.
//   (f) El default de sesion (opencode.json model y small_model) es FREE
//       ESTRICTA: exactamente los ids con $0 MEDIDO en primario Y subagente
//       (ADR-096 B2). Un gratuito solo permitido en la allowlist da AVISO, no OK.
//
// ADR-096 (B1/B2) en una linea: el tier depende del ROL (tierDe(m, rol), con
// 'sesion' por defecto), la coincidencia de ids es EXACTA (prohibido startsWith
// o includes para decidir tier) y los modelos SIN_ADMITIR son INFORMATIVOS:
// van al bloque AVISOS y nunca suman en fallas.
//
// DELIBERADAMENTE NO EXISTE el check "una sesion no debe contener mas de un modelo":
// ese check prohibia exactamente lo que el operador quiere hacer (abrir en FREE y
// pasar a PAGO a mitad de sesion). Lo que se vigila es la ESCALADA TARDIA, y es un
// AVISO con coste estimado (escaladaTardia), no una violacion: el modelo lo elige el
// operador en el selector y el guard no le quita el selector. La escalada tardia exige
// CONTEXTO (UMBRAL_ESCALADA_TARDIA_TOKENS): por debajo del suelo, un FREE -> PAGO es un
// cambio de tier, que es un riesgo distinto y no dispara la alarma de las ~35x.
//
// Fuentes de verdad para el modelo real (medido en opencode.db):
//   - message.data.modelID + message.data.providerID, POR MENSAJE DE ASISTENTE.
//     Es lo unico fiable.
//   - session.model NO sirve: registra el ULTIMO modelo, nunca el de apertura.
//   - PRAGMA table_info(session) no expone "abrio como". No se inventa la apertura:
//     el detector compara el PRIMER mensaje de asistente con el ULTIMO.
//
// Uso:
//   node scripts/ejecucion/verificar-capa-gratis.js
//   node scripts/ejecucion/verificar-capa-gratis.js --json
//   node scripts/ejecucion/verificar-capa-gratis.js verificar-herencia --sesion <id>
//   node scripts/ejecucion/verificar-capa-gratis.js reparto --sesion <id> [--rol sesion|subagente]
//   node scripts/ejecucion/verificar-capa-gratis.js --preflight [--umbral <tokens>] [--rol sesion|subagente]
//   node scripts/ejecucion/verificar-capa-gratis.js --help
//
// --rol (ADR-096, cambio 12) distingue el rol que se juzga: 'sesion' por defecto
// y 'subagente' explicito. La tabla opencode.db no marca cual es cual, asi que el
// default es 'sesion' y se documenta en vez de adivinarse.
//
// Todos los modos abren opencode.db en SOLO LECTURA (node:sqlite) y exigen, para
// verificar-herencia, que hijo.model == padre.model. Sin --sesion se salta.
//
// Salida: codigo 0 si todo cumple, 1 si hay alguna violacion (--preflight es
// informativo y nunca falla por un aviso de coste).
// ASCII-safe (no emite tildes).

'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

var SQLITE = null;
try { SQLITE = require('node:sqlite'); } catch (e) { SQLITE = null; }

// --- Allowlists medidas (sondas reales; ver scripts/ejecucion/sondas/) --------

// FREE medido: $0.000000 registrado en opencode.db.
const FREE = [
  'opencode/space-bunny-free',
];

// Supervivientes de ADR-074 (dentro del FREE verificado alli). NO se usan como
// pin de primario: solo se aceptan como default de sesion en el check (f).
// ADR-096 B2: opencode-go/space-bunny-free SALE de aqui porque es FANTASMA (no
// existe en el catalogo del proveedor); pasa a NO_CATALOGO.
// opencode-go/longcat-2.5-preview-free PERMANECE (existe en el catalogo y no
// esta prohibido), pero queda FUERA del check (f), porque el check (f) exige
// FREE ESTRICTA: la unica con $0 MEDIDO en primario Y subagente.
// Criterio: permitido en allowlist != permitido como default del check (f).
const FREE_SUPERVIVIENTES = [
  'opencode-go/longcat-2.5-preview-free',
];

// ADR-096 B2: FREE ESTRICTA = la unica combinacion segura para una sesion
// completa, porque es la unica con $0.000000 MEDIDO en LOS DOS roles (3
// subsesiones + control de la sonda T1). Hoy es un solo identificador.
const FREE_ESTRICTA = [
  'opencode/space-bunny-free',
];

// PAGO medido. Marcadas como pagadas, no como gratuitas: usarlas es una decision
// consciente del operador en el selector. glm-5.3-flash queda como plan B.
// opencode-go/qwen3.8-max esta FUERA por defecto: medido 17x mas caro.
const PAGO = [
  'opencode-go/deepseek-v4.1-flash',
  'opencode-go/glm-5.3-flash',
];

// --- Prohibidos: CUATRO listas, una por motivo (ADR-096 B1) -------------------
// ADR-096 parte la antigua lista plana ROTOS, que mezclaba un rechazo medido con
// seis heredados. Regla que lo obliga (ADR-006): el guard solo puede afirmar un
// motivo que tiene MEDIDO. Cada lista lleva su motivo y su rol.

// NO_SUBAGENTE: unico con error LITERAL medido como subagente (2026-10-13, por
// herencia y con 0 pines, 0 tokens, $0.000000):
//   Subagent failed (...): OpenCode's free tier can only be used from within OpenCode
// Aplica SOLO al rol subagente. Como modelo de sesion/primario esta NO MEDIDO,
// asi que NO se admite (fuera de allowlist hasta su sonda).
const NO_SUBAGENTE = [
  'opencode/big-pickle',
];
const ERR_BIG_PICKLE = 'OpenCode' + String.fromCharCode(39) + 's free tier can only be used from within OpenCode';
const MOTIVO_NO_SUBAGENTE =
  'error literal medido como subagente: "' + ERR_BIG_PICKLE + '" (0 tokens, $0.000000) | aplica SOLO al rol subagente';

// NO_CATALOGO: allowlists que NO existen en el catalogo del proveedor (fantasma).
// Un id que no existe no puede ser default de sesion ni allowlist: es una promesa
// que el proveedor no puede cumplir. Gana a cualquier otro veredicto, en ambos roles.
const NO_CATALOGO = [
  'opencode-go/space-bunny-free',
];
const MOTIVO_NO_CATALOGO =
  'medido: NO existe en el catalogo del proveedor (fantasma) | gana en ambos roles';

// NO_MEDIDO: los 6 rechazos HEREDADOS de sondeos antiguos, SIN error literal
// registrado en el repo. Se conservan prohibidos para no ceder terreno sin
// medicion, pero no se les inventa un motivo medido. Aplican a ambos roles y
// NUNCA cuentan como FREE.
const NO_MEDIDO = [
  'opencode/ling-3.0-flash-fin-free',
  'opencode/longcat-2.5-preview-free',
  'opencode/mimo-v2.6-flash-free',
  'opencode/muse-spark-1.3-contributor-free',
  'opencode/nemotron-3-ultra-free',
  'opencode/nemotron-3.5-lightning-free',
];
const MOTIVO_NO_MEDIDO =
  'rechazo heredado de sondeos antiguos, sin error literal registrado en el repo | prohibidos en ambos roles hasta medirlos';

// SIN_ADMITIR: gratis REAL (input=output=cache=0, status active) pero NO medido
// en este repo. INFORMATIVO: va al bloque AVISOS, nunca a fallas. Se admiten solo
// con sonda propia (subagente MAS primario) y un ADR de admision.
const SIN_ADMITIR = [
  'opencode/cat-jam-free',
  'opencode/exo-free',
  'opencode/ling-3.1-flash-free',
  'opencode/step-5-preview-free',
  'opencode-go/step-5-preview-free',
];
const MOTIVO_SIN_ADMITIR =
  'gratis real, NO medido en este repo: midalo antes de usarlo';

// ROTOS: union DERIVADA de las tres listas de prohibicion. Se mantiene porque el
// JSON publica "rotos" y porque hay checks de coherencia que preguntan "esta
// prohibido, si o no". NO usar esta lista para decidir el tier: para eso estan
// los predicados por motivo (el rol cambia el veredicto).
const ROTOS = NO_SUBAGENTE.concat(NO_CATALOGO, NO_MEDIDO);

const N_SUBAGENTES_ESPERADOS = 16;
const N_PRIMARIOS_ESPERADOS = 2;

// --- Constantes de coste (MEDIDAS: no re-sondear) ----------------------------
// $0.003331 en una tanda real de 4 turnos / 43.360 tokens con
// opencode-go/deepseek-v4.1-flash. De ahi el precio por token de contexto.
const COSTO_USD_POR_TOKEN_PAGO = 0.003331 / 43360; // ~7.68e-8
// Anclas del mismo dato, para leer la asimetria de momento:
//   turno 2  (~20.000 tokens de contexto) -> ~$0.001 por subagente
//   turno 25 (~700.000 tokens de contexto) -> ~$0.05 por subagente  (~35x)
const ANCLA_BAJA_TOKENS = 20000;
const ANCLA_ALTA_TOKENS = 700000;
// Umbral = "aqui ya no compensa seguir en esta sesion para cambiar a PAGO",
// no "esto es caro". A 100.000 tokens un turno en deepseek cuesta ~$0.0077, o
// sea ~5x un turno de sesion nueva (~$0.0015): ese es el punto en que la
// alternativa correcta es abrir sesion nueva, no seguir. Con 200.000 el aviso
// llegaba tarde, cuando el turno ya costaba ~10x. Es un default, no un
// contrato: se ajusta por llamada con --umbral.
const UMBRAL_PREFLIGHT_TOKENS = 100000; // ~$0.0077 por turno a deepseek

// SUELO DE CONTEXTO de la escalada tardia (ADR-083 D2: atribucion, no prohibicion).
// Alineado con el umbral que ya usa --preflight: es la misma magnitud, la que hace
// que "cambiar de modelo aqui" deje de ser barato. Por DEBAJO de este suelo un
// FREE -> PAGO es un CAMBIO DE TIER, no una escalada tardia: el riesgo es distinto
// (el segundo no justifica la alarma de las ~35x) y el turno sigue costando ~$0.
const UMBRAL_ESCALADA_TARDIA_TOKENS = UMBRAL_PREFLIGHT_TOKENS;

// --- TRAMPA DE NOMBRES (medida; no re-sondear) --------------------------------
// Dos modelos de familia "space-bunny" con precios opuestos. El nombre NO dice
// si el turno cuesta $0: lo dice el PROVEEDOR.
//   opencode/space-bunny-free -> FREE verificado ($0.000000 en opencode.db).
//   opencode-go/space-bunny   -> PAGO. Medido: $0.15 por Mtokens de entrada y
//                                $0.60 por Mtokens de salida.
const MODELO_FREE = FREE[0];
const MODELO_PARADOJO = 'opencode-go/space-bunny';
const PRECIO_USD_POR_MTOK_ENTRADA_PARADOJO = 0.15;
const PRECIO_USD_POR_MTOK_SALIDA_PARADOJO = 0.60;

// --- DESFASADE DE LA MEDICION (medido) ---------------------------------------
// opencode.db se escribe al CIERRE del turno: la ultima fila persistida puede
// ser de hace horas mientras el operador ya cambio de modelo en el selector. Un
// reporte que imprime ese modelo sin decirlo presenta un dato viejo como si
// fuera el vigente (medido 2026-10-13: --preflight, reparto e informe-cuota
// devolvieron el mismo snapshot congelado, 3 dias, tres veces seguidas).
// Por encima de este umbral la medicion se declara desfasada y el modelo
// reportado se marca como "puede no ser el actual".
const UMBRAL_DESFASE_MS = 15 * 60 * 1000; // 15 min

// --- Parseo ------------------------------------------------------------------

function leerAgentes(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .sort()
    .map((f) => {
      let txt = fs.readFileSync(path.join(dir, f), 'utf8');
      if (txt.charCodeAt(0) === 0xfeff) txt = txt.slice(1); // BOM antes de ---
      const fm = txt.split(/^---[ \t]*$/m)[1] || '';
      const campo = (k) => {
        const m = fm.match(new RegExp('^' + k + ':[ \\t]*(.+)$', 'm'));
        return m ? m[1].trim() : null;
      };
      return {
        archivo: f,
        name: campo('name'),
        mode: campo('mode'),
        model: campo('model'),
        coste: campo('coste'),
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

// --- Utilidades de allowlist -------------------------------------------------

function esFree(m) {
  return FREE.indexOf(m) >= 0 || FREE_SUPERVIVIENTES.indexOf(m) >= 0;
}
function esFreeEstricta(m) {
  return FREE_ESTRICTA.indexOf(m) >= 0;
}
function esPago(m) {
  return PAGO.indexOf(m) >= 0;
}
// ADR-096 B1: un predicado por motivo (coincidencia EXACTA de cadena completa
// provider/model; prohibido startsWith/includes para decidir tier).
function esNoSubagente(m) {
  return NO_SUBAGENTE.indexOf(m) >= 0;
}
function esNoCatalogo(m) {
  return NO_CATALOGO.indexOf(m) >= 0;
}
function esNoMedido(m) {
  return NO_MEDIDO.indexOf(m) >= 0;
}
function esSinAdmitir(m) {
  return SIN_ADMITIR.indexOf(m) >= 0;
}
// Union de las TRES listas de prohibicion. Es un agregado de coherencia, no un
// veredicto de tier: NO_SUBAGENTE solo aplica al rol subagente.
function esRoto(m) {
  return esNoSubagente(m) || esNoCatalogo(m) || esNoMedido(m);
}
// Motivo citable del veredicto prohibido (para que el mensaje diga el POR QUE).
function motivoProhibido(m) {
  if (esNoCatalogo(m)) return 'NO_CATALOGO: ' + MOTIVO_NO_CATALOGO;
  if (esNoSubagente(m)) return 'NO_SUBAGENTE: ' + MOTIVO_NO_SUBAGENTE;
  if (esNoMedido(m)) return 'NO_MEDIDO: ' + MOTIVO_NO_MEDIDO;
  return '';
}
function enAllowlist(m) {
  return esFree(m) || esPago(m);
}

// ROL: el veredicto depende de si el modelo va a usarse como sesion (primario) o
// como subagente. La tabla opencode.db NO distingue los dos casos, asi que el
// default documentado es 'sesion' (ADR-096, respuesta 2 del autor).
function normRol(rol) {
  return rol === 'subagente' ? 'subagente' : 'sesion';
}

// tierDe(m, rol): orden FAIL-CLOSED (ADR-096 B1). NO_SUBAGENTE se evalua ANTES de
// FREE para que un modelo gratis nunca se degrade a FREE por el hecho de serlo;
// NO_MEDIDO tambien va antes de admitir. Coincidencia EXACTA de id completo.
function tierDe(m, rol) {
  const r = normRol(rol);
  if (!m) return 'SIN-MODELO';
  if (esNoCatalogo(m)) return 'ROTO_CATALOGO';
  if (r === 'subagente' && esNoSubagente(m)) return 'ROTO_SUBAGENTE';
  if (esNoMedido(m)) return 'NO_MEDIDO';
  if (esFree(m)) return 'FREE';
  if (esPago(m)) return 'PAGO';
  if (esSinAdmitir(m)) return 'FUERA_ADMITIDO_A_CONSCIENCIA';
  return 'FUERA-DE-ALLOWLIST';
}

function capaDe(a) {
  if (a.mode === 'primary') {
    if (a.model) return 'PRIMARIO-PINEADO';
    return 'PRIMARIO-SIN-PIN';
  }
  if (a.model) return 'ESPECIALISTA-PINEADO';
  return 'ESPECIALISTA-HEREDADO';
}

// modoDe(a, rol): etiqueta corta. Distingue ROTO_SUBAGENTE / ROTO_CATALOGO /
// NO_MEDIDO; ROTO sigue siendo la etiqueta agregada (esRoto y porTier.ROTO).
function modoDe(a, rol) {
  if (!a.model) return 'hereda';
  const t = tierDe(a.model, rol);
  if (t === 'FREE') return 'free';
  if (t === 'PAGO') return 'pago';
  if (t === 'ROTO_SUBAGENTE' || t === 'ROTO_CATALOGO' || t === 'NO_MEDIDO') return t;
  if (t === 'FUERA_ADMITIDO_A_CONSCIENCIA') return 'FUERA_ADMITIDO_A_CONSCIENCIA';
  return 'FUERA';
}

// ADR-096 B2: la trampa real vive en el SELECTOR del TUI, que busca por nombre.
// Aqui se ataca imprimiendo el id COMPLETO y anadiendo una linea explicita cuando
// la cadena contiene space-bunny sin ser el unico gratis verificado.
function esTrampaDeNombre(m) {
  return typeof m === 'string' && m.indexOf('space-bunny') >= 0 && m !== MODELO_FREE;
}
function avisoTrampaNombre(m) {
  return 'ATENCION: ' + m + ' es PAGO o no verificado; el unico gratis verificado para primario y subagente es ' + MODELO_FREE + '.';
}

// Texto de todas las sondas: un modelo fuera de las allowlists solo se admite
// si aparece aqui (es decir, si se midio).
function textoSondas(dir) {
  let todo = '';
  const leer = (d) => {
    let entradas = [];
    try { entradas = fs.readdirSync(d, { withFileTypes: true }); } catch (e) { return; }
    entradas.forEach((e) => {
      const p = path.join(d, e.name);
      if (e.isDirectory()) leer(p);
      else if (/\.(md|txt|json|js)$/.test(e.name)) {
        try { todo += fs.readFileSync(p, 'utf8'); } catch (e2) { /* ilegible */ }
      }
    });
  };
  leer(dir);
  return todo;
}

// --- Checks estaticos (a) a (f) ----------------------------------------------

function verificar(root, rol) {
  const agDir = path.join(root, '.opencode', 'agent');
  const agentes = leerAgentes(agDir);
  const cfg = leerConfig(path.join(root, 'opencode.json'));
  const sondas = textoSondas(path.join(root, 'scripts', 'ejecucion', 'sondas'));
  const fallas = [];
  const checks = [];
  const avisos = [];

  if (!agentes.length) fallas.push('No se encontro ningun agente en .opencode/agent/*.md');
  if (!cfg) fallas.push('opencode.json no existe o no es JSON valido');

  const subs = agentes.filter((a) => a.mode === 'subagent');
  const prims = agentes.filter((a) => a.mode === 'primary');
  const pineados = agentes.filter((a) => a.model);

  // (a) Cero pines en subagentes.
  subs.filter((a) => a.model).forEach((a) => {
    fallas.push(
      '(a) ' + a.name + ' es subagent y declara model: ' + a.model +
      ' -> quitalo. Un pin en un subagente REGRESION: anula la herencia del modelo activo.'
    );
  });
  checks.push({ id: 'a', ok: subs.filter((a) => a.model).length === 0, detalle: '0 de ' + subs.length + ' subagentes con pin' });

  // (b) Metadato coste: heredado obligatorio en los subagentes.
  const sinCoste = subs.filter((a) => a.coste !== 'heredado');
  sinCoste.forEach((a) => {
    fallas.push(
      '(b) ' + a.name + ' es subagent y no declara "coste: heredado"' +
      (a.coste ? ' (declara coste: ' + a.coste + ')' : '') +
      ' -> es el pin sustituido por el modelo activo del turno.'
    );
  });
  if (subs.length !== N_SUBAGENTES_ESPERADOS) {
    fallas.push('(b) hay ' + subs.length + ' subagentes y ADR-083 (D1) fija ' + N_SUBAGENTES_ESPERADOS);
  }
  checks.push({
    id: 'b',
    ok: sinCoste.length === 0 && subs.length === N_SUBAGENTES_ESPERADOS,
    detalle: subs.length - sinCoste.length + ' de ' + subs.length + ' con coste: heredado',
  });

  // (c) ADR-083 D1: ningun primario pinea modelo. El precio lo pone el modelo activo de
  // la sesion, cambiable en el selector; un pin en el primario seria inventar un
  // tier que el rol no tiene.
  prims.forEach((a) => {
    if (a.model) {
      fallas.push(
        '(c) ' + a.name + ' es primary y declara model: ' + a.model +
        ' -> quitalo (D1). Ningun primario pinea: el precio lo pone el modelo activo del turno.'
      );
    }
    if (a.coste !== 'heredado') {
      fallas.push(
        '(c) ' + a.name + ' no declara "coste: heredado"' +
        (a.coste ? ' (declara coste: ' + a.coste + ')' : '') +
        ' -> el "coste: pago" de antes atribuia precio al rol, y el rol no tiene precio.'
      );
    }
  });
  if (prims.length !== N_PRIMARIOS_ESPERADOS) {
    fallas.push('(c) hay ' + prims.length + ' primarios y ADR-083 (D1) fija ' + N_PRIMARIOS_ESPERADOS + ' (plan, build)');
  }
  checks.push({
    id: 'c',
    ok: prims.length > 0 && prims.every((a) => !a.model && a.coste === 'heredado'),
    detalle: prims.length + ' primarios | ' + prims.filter((a) => !a.model).length + ' sin pin | ' +
      prims.filter((a) => a.coste === 'heredado').length + ' con coste: heredado',
  });

  // (d) ADR-083 D2: la cobertura de tiers se verifica POR LA SESION. En el roster no hay
  // ningun pin, asi que la cobertura estatica es: default en FREE (segun (f)) y
  // las dos allowlists disponibles, no vacias y disjuntas, para que el operador
  // pueda elegir cualquiera de los dos precios en el selector. El reparto REAL de
  // una sesion lo mide repartoPorTier() sobre message.data.modelID.
  const solape = FREE.concat(FREE_SUPERVIVIENTES).filter((m) => esPago(m));
  if (!FREE.length) fallas.push('(d) la allowlist FREE esta vacia: no habria ruta a $0');
  if (!PAGO.length) fallas.push('(d) la allowlist PAGO esta vacia: no habria opcion de pago en el selector');
  solape.forEach((m) => fallas.push('(d) ' + m + ' esta a la vez en FREE y en PAGO: su precio es ambiguo'));
  PAGO.forEach((m) => {
    if (esRoto(m)) fallas.push('(d) ' + m + ' esta en PAGO y en ROTOS a la vez');
  });
  // ADR-096 B2: la FREE ESTRICTA (default del check (f)) tiene que seguir siendo
  // un subconjunto de la allowlist FREE: si no, el check (f) exigiria algo que la
  // allowlist no autoriza.
  FREE_ESTRICTA.filter((m) => !esFree(m)).forEach((m) => {
    fallas.push('(d) ' + m + ' esta en FREE_ESTRICTA (default del check (f)) y no en la allowlist FREE');
  });
  checks.push({
    id: 'd',
    ok: !fallas.some((f) => f.indexOf('(d)') === 0),
    detalle: 'tiers por sesion: FREE ' + FREE.length + ' modelo(s) | FREE estricta ' + FREE_ESTRICTA.length +
      ' (unica con $0 medido en primario Y subagente) | PAGO ' + PAGO.length +
      ' modelo(s) | 0 pines en el roster; el reparto real se mide por message.data.modelID',
  });

  // (e) Cero pines en todo el roster, y ninguno en las listas de prohibicion ni
  // fuera de allowlist. El motivo se imprime con su lista (ADR-096 B1).
  pineados.forEach((a) => {
    if (esRoto(a.model)) {
      fallas.push('(e) ' + a.name + ' pinea ' + a.model + ', que esta prohibido -> ' + motivoProhibido(a.model));
      return;
    }
    if (!enAllowlist(a.model)) {
      const medido = sondas.indexOf(a.model) >= 0;
      fallas.push(
        '(e) ' + a.name + ' pinea ' + a.model + ', fuera de las allowlists medidas' +
        (medido ? ' (hay una sonda, pero no esta autorizado: requiere un ADR)' : ' y sin sonda en scripts/ejecucion/sondas/')
      );
    }
  });
  if (cfg && pineados.length === 0 && (cfg.model || cfg.small_model)) {
    [cfg.model, cfg.small_model].forEach((m) => {
      if (m && esRoto(m)) fallas.push('(e) el default de sesion ' + m + ' esta prohibido -> ' + motivoProhibido(m));
    });
  }
  checks.push({
    id: 'e',
    ok: pineados.length === 0 || pineados.every((a) => !esRoto(a.model) && enAllowlist(a.model)),
    detalle: pineados.length + ' pines en ' + agentes.length + ' agentes | prohibidos: NO_SUBAGENTE ' +
      NO_SUBAGENTE.length + ', NO_CATALOGO ' + NO_CATALOGO.length + ', NO_MEDIDO ' + NO_MEDIDO.length +
      ' modelos, ninguno referenciado | opencode/big-pickle sigue prohibido como subagente',
  });

  // (f) ADR-096 B2, endurecido: el default de sesion debe ser FREE ESTRICTA, es
  // decir EXACTAMENTE los ids con $0 medido en primario Y subagente (hoy:
  // opencode/space-bunny-free). Un modelo de FREE_SUPERVIVIENTES (permitido en la
  // allowlist) NO vale como default: se marca como AVISO, no como falla.
  // Criterio: permitido en allowlist != permitido en el check (f).
  if (cfg) {
    ['model', 'small_model'].forEach((k) => {
      const v = cfg[k];
      if (!v) {
        fallas.push('(f) opencode.json no declara "' + k + '"');
      } else if (esFreeEstricta(v)) {
        // correcto: es la unica combinacion segura para una sesion completa.
      } else if (esFree(v)) {
        avisos.push(
          '(f) opencode.json "' + k + '" = ' + v + ' esta en FREE_SUPERVIVIENTES (permitido en la allowlist) ' +
          'pero NO es FREE estricta: no tiene $0 medido en primario Y subagente. Default exigido: ' +
          FREE_ESTRICTA.join(', ')
        );
      } else {
        fallas.push(
          '(f) opencode.json "' + k + '" = ' + v + ' no es FREE estricta -> la sesion arrancaria en pago o en un modelo no medido. FREE estricta: ' +
          FREE_ESTRICTA.join(', ') + ' | allowlist FREE: ' + FREE.concat(FREE_SUPERVIVIENTES).join(', ')
        );
      }
      if (esTrampaDeNombre(v)) avisos.push('(f) ' + avisoTrampaNombre(v));
    });
  }
  checks.push({ id: 'f', ok: !fallas.some((f) => f.indexOf('(f)') === 0), detalle: 'default de sesion: ' + (cfg ? cfg.model + ' / ' + cfg.small_model : '?') + ' | exigido: ' + FREE_ESTRICTA.join(', ') });

  // ADR-096 B1/B2: las listas sin medicion van a AVISO, nunca a falla.
  if (NO_MEDIDO.length) {
    avisos.push('NO_MEDIDO (' + NO_MEDIDO.length + '): ' + MOTIVO_NO_MEDIDO + '. Sigues sin poder usarlos, pero no hay error literal que citar.');
  }
  if (SIN_ADMITIR.length) {
    avisos.push('SIN_ADMITIR (' + SIN_ADMITIR.length + '): ' + MOTIVO_SIN_ADMITIR + '. ' + SIN_ADMITIR.join(', '));
  }
  if (NO_CATALOGO.length) {
    avisos.push('NO_CATALOGO (' + NO_CATALOGO.length + '): ' + MOTIVO_NO_CATALOGO + '. Fuera de las allowlists: ' + NO_CATALOGO.join(', '));
  }

  return { agentes, cfg, fallas, checks, avisos, nPrim: prims.length, nSub: subs.length, nPines: pineados.length };
}

// --- Lectura de opencode.db (solo lectura) -----------------------------------

function dbPorDefecto() {
  return path.join(os.homedir(), '.local', 'share', 'opencode', 'opencode.db');
}

function abrirDb(dbPath) {
  if (!SQLITE || !SQLITE.DatabaseSync) return { db: null, error: 'node:sqlite no disponible. Se requiere Node 22+ (built-in, sin dependencias).' };
  try {
    return { db: new SQLITE.DatabaseSync(dbPath, { readOnly: true }), error: null };
  } catch (e) {
    return { db: null, error: 'no se pudo abrir opencode.db en solo lectura: ' + e.message };
  }
}

// La columna model de opencode.db puede ser texto plano o un blob JSON
// {"id":"...","providerID":"...","variant":"..."}. Se normaliza al id corto,
// sin el proveedor, para comparar padre e hijo.
function normModel(m) {
  if (!m) return '';
  let v = String(m).trim();
  if (v.charCodeAt(0) === 123) { // {
    try {
      const o = JSON.parse(v);
      v = String(o.id || o.model || o.modelID || '');
    } catch (e) { /* no es JSON: se usa tal cual */ }
  }
  return v.toLowerCase().split('/').pop();
}

function filasSesion(db, sesionId, avisos) {
  // time_updated y el ultimo message.time_created son las marcas de actualizacion
  // que usa la deteccion de medicion desfasada (evaluarDesfase).
  const sql =
    'WITH RECURSIVE d(id,parent_id,agent,model,cost,time_updated) AS (' +
    'SELECT id,parent_id,agent,model,cost,time_updated FROM session WHERE id = ?' +
    ' UNION ALL ' +
    'SELECT s.id,s.parent_id,s.agent,s.model,s.cost,s.time_updated FROM session s JOIN d ON s.parent_id = d.id' +
    ') SELECT d.id,d.parent_id,d.agent,d.model,d.cost,d.time_updated,' +
    '(SELECT MAX(m.time_created) FROM message m WHERE m.session_id = d.id) AS ultimoMensaje FROM d';
  try {
    return db.prepare(sql).all(sesionId);
  } catch (e) {
    // Fallback: sin CTE, se reconstruye la cadena en JS.
    avisos.push('CTE no disponible, se reconstruyo la cadena en JS (' + e.message + ')');
    const todas = db.prepare('SELECT id,parent_id,agent,model,cost,time_updated,' +
      '(SELECT MAX(m.time_created) FROM message m WHERE m.session_id = session.id) AS ultimoMensaje FROM session').all();
    const raices = todas.filter((r) => r.id === sesionId);
    if (!raices.length) return [];
    const dentro = new Set([sesionId]);
    let grew = true;
    while (grew) {
      grew = false;
      todas.forEach((r) => {
        if (r.parent_id && dentro.has(r.parent_id) && !dentro.has(r.id)) {
          dentro.add(r.id);
          grew = true;
        }
      });
    }
    return todas.filter((r) => dentro.has(r.id));
  }
}

// --- Reparto real por tier (D2) y escalada tardia ----------------------------

function tokensDe(d) {
  const t = d && d.tokens;
  if (!t) return 0;
  if (typeof t.total === 'number') return t.total;
  const c = t.cache || {};
  return (t.input || 0) + (t.output || 0) + (t.reasoning || 0) + (c.read || 0) + (c.write || 0);
}

// MENSAJES DE ASISTENTE de la cadena de la sesion, en orden cronologico. Esta es
// la fuente fiable del modelo real: message.data.modelID + providerID.
function mensajesAsistente(db, ids, avisos) {
  if (!ids.length) return [];
  const ph = ids.map(() => '?').join(',');
  let filas = [];
  try {
    filas = db
      .prepare('SELECT session_id, time_created, data FROM message WHERE session_id IN (' + ph + ') ORDER BY time_created ASC')
      .all(...ids);
  } catch (e) {
    avisos.push('no se pudieron leer los mensajes: ' + e.message);
    return [];
  }
  const out = [];
  filas.forEach((r) => {
    let d;
    try { d = JSON.parse(r.data); } catch (e) { return; }
    if (!d || d.role !== 'assistant') return;
    if (!d.modelID) return;
    out.push({
      sesion: r.session_id,
      t: r.time_created || 0,
      agente: d.agent || d.mode || '(sin agent)',
      providerID: d.providerID || '',
      modelID: d.modelID,
      modelo: (d.providerID || '?') + '/' + d.modelID,
      tokens: tokensDe(d),
      cost: typeof d.cost === 'number' ? d.cost : 0,
    });
  });
  return out;
}

// ADR-096 (cambio 4): tierDeMensaje manda el id COMPLETO provider/model a tierDe.
// El fallback sin provider/ de antes se elimina: si falta providerID el resultado
// es SIN-PROVEEDOR (un dato que obliga a mirar el registro, no una etiqueta
// adivinada). FUERA y FUERA-DE-ALLOWLIST quedan unificados en FUERA-DE-ALLOWLIST.
// rol: default 'sesion' (la tabla opencode.db no distingue sesion de subagente).
function tierDeMensaje(m, rol) {
  if (!m || !m.providerID) return 'SIN-PROVEEDOR';
  return tierDe(m.providerID + '/' + m.modelID, normRol(rol));
}

function repartoPorTier(dbPath, sesionId, rol) {
  const r = normRol(rol);
  const res = {
    sesion: sesionId, db: dbPath, filas: [], mensajes: [], rol: r,
    porModelo: [],
    // Las 4 claves de siempre (formato de salida intacto) + las nuevas de ADR-096.
    porTier: {
      FREE: 0, PAGO: 0, ROTO: 0, FUERA: 0,
      ROTO_SUBAGENTE: 0, ROTO_CATALOGO: 0, NO_MEDIDO: 0, FUERA_ADMITIDO_A_CONSCIENCIA: 0,
      'SIN-PROVEEDOR': 0,
    },
    escalada: null, avisos: [], fallas: [], desfase: null,
  };
  const ab = abrirDb(dbPath);
  if (!ab.db) { res.fallas.push(ab.error); return res; }
  const db = ab.db;
  try {
    if (!db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='session'").get()) {
      res.fallas.push('la tabla session no existe en ' + dbPath);
      return res;
    }
    res.filas = filasSesion(db, sesionId, res.avisos);
    if (!res.filas.length) {
      res.fallas.push('la sesion ' + sesionId + ' no existe en ' + dbPath);
      return res;
    }
    res.desfase = evaluarDesfase(db, res.filas, UMBRAL_DESFASE_MS);
    res.mensajes = mensajesAsistente(db, res.filas.map((f) => f.id), res.avisos);
  } catch (e) {
    res.fallas.push('error leyendo la sesion: ' + e.message);
  } finally {
    try { db.close(); } catch (e) { /* cierre */ }
  }

  const mapa = new Map();
  res.mensajes.forEach((m) => {
    const k = m.modelo;
    if (!mapa.has(k)) mapa.set(k, { modelo: k, tier: tierDeMensaje(m, r), mensajes: 0, tokens: 0, cost: 0, agentes: new Set() });
    const e = mapa.get(k);
    e.mensajes++;
    e.tokens += m.tokens;
    e.cost += m.cost;
    e.agentes.add(m.agente);
  });
  res.porModelo = Array.from(mapa.values())
    .map((e) => ({ modelo: e.modelo, tier: e.tier, mensajes: e.mensajes, tokens: e.tokens, cost: e.cost, agentes: Array.from(e.agentes).sort() }))
    .sort((a, b) => b.tokens - a.tokens);
  res.porModelo.forEach((e) => { res.porTier[e.tier] = (res.porTier[e.tier] || 0) + e.mensajes; });
  // ADR-096 (cambio 8): un modelo de SIN_ADMITIR es informativo, no una falla.
  res.porModelo.filter((e) => e.tier === 'FUERA_ADMITIDO_A_CONSCIENCIA').forEach((e) => {
    res.avisos.push(MOTIVO_SIN_ADMITIR + ': ' + e.modelo + ' (' + e.mensajes + ' mensajes de asistente)');
  });
  res.escalada = escaladaTardia(res.mensajes, r);
  return res;
}

// Asimetria de momento: el primer mensaje de asistente frente al ULTIMO. No usa
// session.model (que registra el ultimo) ni supone como abrio la sesion: compara
// lo que hay escrito en la DB. Es un AVISO con coste estimado, no una violacion.
//
// El par FREE -> PAGO NO es por si solo una escalada tardia: hace falta contexto.
//   - contexto del ultimo turno >= UMBRAL_ESCALADA_TARDIA_TOKENS -> ESCALADA-TARDIA
//     (el mismo turno ya no es barato y la asimetria de momento se paga).
//   - por debajo del suelo -> CAMBIO-DE-TIER: el operador cambio de precio en el
//     selector y el turno sigue costando ~$0; se informa, sin lenguaje de escalada.
function escaladaTardia(mensajes, rol) {
  if (!mensajes || mensajes.length < 2) return null;
  const r = normRol(rol);
  const primero = mensajes[0];
  const ultimo = mensajes[mensajes.length - 1];
  const t0 = tierDeMensaje(primero, r);
  const t1 = tierDeMensaje(ultimo, r);
  if (!(t0 === 'FREE' && t1 === 'PAGO')) return null;
  const coste = (tokens) => tokens * COSTO_USD_POR_TOKEN_PAGO;
  const factor = primero.tokens > 0 ? ultimo.tokens / primero.tokens : 0;
  const umbral = UMBRAL_ESCALADA_TARDIA_TOKENS;
  return {
    primero: primero, ultimo: ultimo,
    turnos: mensajes.length,
    tipo: ultimo.tokens >= umbral ? 'ESCALADA-TARDIA' : 'CAMBIO-DE-TIER',
    umbral: umbral,
    costePrimero: coste(primero.tokens),
    costeUltimo: coste(ultimo.tokens),
    factor: factor,
    costeTurno: coste(ultimo.tokens),
  };
}

// --- Deteccion de medicion desfasada (A4) ------------------------------------
// Compara la ultima fila persistida de la sesion (message.time_created) con la
// marca de actualizacion de la fila de sesion y con la hora actual. Si la
// diferencia supera UMBRAL_DESFASE_MS, el snapshot es viejo: el modelo que se
// reporte puede no ser el vigente. NO se falla por esto: es un AVISO con numero,
// porque el dato no se inventa, se declara viejo.
function marcasDeActualizacion(filas) {
  let maxMsg = 0;
  let maxSes = 0;
  (filas || []).forEach((f) => {
    if (f.time_updated && f.time_updated > maxSes) maxSes = f.time_updated;
    if (f.ultimoMensaje && f.ultimoMensaje > maxMsg) maxMsg = f.ultimoMensaje;
  });
  return { maxMsg: maxMsg, maxSesion: maxSes };
}

function evaluarDesfase(db, filas, umbralMs) {
  const u = isFinite(umbralMs) && umbralMs > 0 ? umbralMs : UMBRAL_DESFASE_MS;
  const ahora = Date.now();
  const m = marcasDeActualizacion(filas);
  const ultimaFila = Math.max(m.maxMsg, m.maxSesion);
  const res = {
    desfasado: false, ahoraMs: ahora, ultimaFilaMs: ultimaFila,
    ultimoMensajeMs: m.maxMsg, ultimaSesionMs: m.maxSesion,
    edadMs: 0, umbralMs: u, motivo: '',
  };
  if (!ultimaFila) {
    res.motivo = 'no hay ninguna fila persistida en esta sesion todavia';
    return res;
  }
  res.edadMs = Math.max(0, ahora - ultimaFila);
  if (res.edadMs > u) {
    res.desfasado = true;
    res.motivo = 'la ultima fila persistida de opencode.db es de ' +
      new Date(ultimaFila).toISOString() + ' y ahora es ' + new Date(ahora).toISOString() +
      ' (' + Math.round(res.edadMs / 60000) + ' min de retraso, umbral ' + Math.round(u / 60000) + ' min)';
  }
  return res;
}

function lineaDesfase(desfase) {
  if (!desfase || !desfase.desfasado) return null;
  return 'AVISO DE MEDICION DESFASADA: ' + desfase.motivo +
    '. El modelo reportado puede NO ser el actual: verificalo en el selector antes de decidir.';
}

function fmtTokens(n) {
  return String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
function fmtUsd(x) {
  return '$' + (Number(x) || 0).toFixed(4);
}

// --- Asercion de herencia (ADR-082, punto 4) --------------------------------

function verificarHerencia(dbPath, sesionId) {
  const res = { sesion: sesionId, db: dbPath, filas: [], comparadas: 0, noComparables: 0, fallas: [], avisos: [], desfase: null };
  const ab = abrirDb(dbPath);
  if (!ab.db) { res.fallas.push(ab.error); return res; }
  const db = ab.db;
  try {
    if (!db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='session'").get()) {
      res.fallas.push('la tabla session no existe en ' + dbPath);
      return res;
    }
    res.filas = filasSesion(db, sesionId, res.avisos);
    res.desfase = evaluarDesfase(db, res.filas, UMBRAL_DESFASE_MS);
  } catch (e) {
    res.fallas.push('error leyendo la sesion: ' + e.message);
    return res;
  } finally {
    try { db.close(); } catch (e) { /* cierre */ }
  }

  if (!res.filas.length) {
    res.fallas.push('la sesion ' + sesionId + ' no existe en ' + dbPath);
    return res;
  }
  const porId = {};
  res.filas.forEach((f) => { porId[f.id] = f; });

  // Timeline del padre: modelo del padre en cada instante, para comparar al hijo
  // contra el modelo ACTIVO en el instante de su spawn, no contra una unica raiz.
  // Motivo (ADR-083 D1): el padre puede cambiar de modelo en el selector a mitad
  // de sesion; session.model es solo el ULTIMO, asi que comparar contra el
  // produce "CASCADA ROTA" en cuanto el padre escalo. El hijo que se lanzo antes
  // del cambio esta correctamente en el modelo anterior.
  const timelines = new Map();
  const ids = res.filas.map((f) => f.id);
  if (ids.length) {
    const ab2 = abrirDb(dbPath);
    if (ab2.db) {
      const db2 = ab2.db;
      try {
        mensajesAsistente(db2, ids, res.avisos).forEach((m) => {
          if (!timelines.has(m.sesion)) timelines.set(m.sesion, []);
          timelines.get(m.sesion).push(m);
        });
      } catch (e) {
        res.avisos.push('no se pudo reconstruir la linea de tiempo de modelos: ' + e.message);
      } finally {
        try { db2.close(); } catch (e) { /* cierre */ }
      }
    }
  }

  // Modelo del padre en el instante t (ultimo mensaje de asistente del padre
  // con time_created <= t). null si todavia no hay ninguno.
  const padreEn = (padreId, t) => {
    const tl = timelines.get(padreId) || [];
    let elegido = null;
    for (let i = 0; i < tl.length; i++) {
      if (tl[i].t <= t) elegido = tl[i];
      else break;
    }
    return elegido;
  };

  const cambiosPadre = new Set();
  res.filas.forEach((f) => {
    if (!f.parent_id) return;
    const padre = porId[f.parent_id];
    const hi = normModel(f.model);
    if (padre === undefined) {
      res.avisos.push('el padre de ' + (f.agent || f.id) + ' no esta en la cadena reconstruida: no comparable');
      return;
    }

    const tlPadre = timelines.get(padre.id) || [];
    const tlHijo = timelines.get(f.id) || [];
    const spawnHijo = tlHijo.length ? tlHijo[0].t : (f.time_created || f.ultimoMensaje || 0);
    const ref = padreEn(padre.id, spawnHijo);
    const pa = ref ? ref.modelo : null;

    if (!pa) {
      // No se puede reconstruir el instante: se degrada a AVISO (no FALLA).
      res.avisos.push(
        'no reconstruible: ' + (f.agent || f.id) + ' declara ' + (hi || '(sin modelo)') +
        ' y su padre ' + (padre.agent || padre.id) + ' no tiene ningun mensaje de asistente escrito en el instante de su spawn' +
        ' -> no comparable (ADVERTENCIA, no FALLA)'
      );
      return;
    }

    res.comparadas++;
    if (normModel(pa) !== hi) {
      // Comparacion relevante: el padre Tenia un modelo en ese instante.
      res.fallas.push(
        'CASCADA ROTA: ' + (f.agent || f.id) + ' corre en ' + (hi || '(sin modelo)') +
        ' pero su padre ' + (padre.agent || padre.id) + ' corria en ' + pa +
        ' en el instante de su spawn -> un subagente no puede tener modelo propio; quitalo del frontmatter (check (a))'
      );
    }
    if (tlPadre.length > 1) {
      const primero = tlPadre[0].modelo;
      const ultimo = tlPadre[tlPadre.length - 1].modelo;
      if (primero !== ultimo) {
        cambiosPadre.add(
          'el padre ' + (padre.agent || padre.id) + ' cambio de modelo durante la sesion (' +
          primero + ' -> ' + ultimo + '): cada hijo se compara contra el modelo del padre EN SU INSTANTE, no contra una raiz unica'
        );
      }
    }
  });
  cambiosPadre.forEach((a) => res.avisos.push(a));
  return res;
}

// --- Preflight (ADR-083, D5): modelo activo y contexto actual -----------------

function normDir(d) {
  return String(d || '').replace(/\\/g, '/').toLowerCase();
}

// Sesion raiz mas reciente del proyecto actual: la que se esta midiendo ahora.
function sesionActiva(db, root) {
  const raiz = normDir(root);
  const filas = db
    .prepare('SELECT id, parent_id, agent, directory, time_updated, tokens_input, tokens_output, tokens_reasoning, tokens_cache_read, tokens_cache_write FROM session ORDER BY time_updated DESC LIMIT 40')
    .all();
  const mias = filas.filter((f) => normDir(f.directory) === raiz);
  return mias.find((f) => !f.parent_id) || mias[0] || filas.find((f) => !f.parent_id) || null;
}

// Contexto agregado de la fila de sesion. Es el respaldo cuando el proveedor FREE
// no reporta tokens por mensaje (los deja en 0): mismo orden de magnitud, otra fuente.
function tokensDeSesion(s) {
  if (!s) return 0;
  return (s.tokens_input || 0) + (s.tokens_output || 0) + (s.tokens_reasoning || 0) +
    (s.tokens_cache_read || 0) + (s.tokens_cache_write || 0);
}

function preflight(dbPath, root, umbral, rol) {
  const r = normRol(rol);
  const res = {
    db: dbPath, umbral: umbral, sesion: null, agente: null, rol: r,
    modelo: null, tier: null, contexto: 0, origen: '', turno: 0,
    avisos: [], fallas: [], porEncima: false,
    costeAhora: 0, costeAnclaBaja: 0, costeAnclaAlta: 0,
    caminoGratis: false, desfase: null,
  };
  const ab = abrirDb(dbPath);
  if (!ab.db) { res.avisos.push(ab.error); return res; }
  const db = ab.db;
  let mensajes = [];
  let s = null;
  try {
    if (!db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='session'").get()) {
      res.avisos.push('la tabla session no existe en ' + dbPath);
      return res;
    }
    s = sesionActiva(db, root);
    if (!s) {
      res.avisos.push('no hay ninguna sesion registrada todavia en ' + dbPath + ': el contexto actual es 0 por definicion');
      return res;
    }
    res.sesion = s.id;
    res.agente = s.agent || '(sin agent)';
    const cadena = filasSesion(db, s.id, res.avisos);
    res.desfase = evaluarDesfase(db, cadena, UMBRAL_DESFASE_MS);
    mensajes = mensajesAsistente(db, cadena.map((f) => f.id), res.avisos);
  } catch (e) {
    res.avisos.push('error leyendo la sesion activa: ' + e.message);
  } finally {
    try { db.close(); } catch (e) { /* cierre */ }
  }

  if (mensajes.length) {
    const ultimo = mensajes[mensajes.length - 1];
    res.modelo = ultimo.modelo;
    res.tier = tierDeMensaje(ultimo, r);
    res.contexto = ultimo.tokens;
    res.origen = 'message.data.tokens del ultimo turno de la cadena';
    res.turno = mensajes.length;
  } else {
    res.modelo = '(sin mensaje de asistente todavia)';
    res.tier = 'SIN-DATOS';
    res.contexto = 0;
    res.origen = 'sin datos';
  }
  // El proveedor FREE deja tokens en 0 por mensaje: el agregado de la sesion es la
  // unica cifra disponible del contexto real, y es la que manda para el aviso.
  if (res.contexto === 0 && s) {
    const agg = tokensDeSesion(s);
    if (agg > 0) {
      res.contexto = agg;
      res.origen = 'agregado de la fila de sesion (el proveedor FREE reporta 0 por mensaje)';
    }
  }
  res.costeAhora = res.contexto * COSTO_USD_POR_TOKEN_PAGO;
  res.costeAnclaBaja = ANCLA_BAJA_TOKENS * COSTO_USD_POR_TOKEN_PAGO;
  res.costeAnclaAlta = ANCLA_ALTA_TOKENS * COSTO_USD_POR_TOKEN_PAGO;
  res.porEncima = res.contexto >= res.umbral;
  if (res.tier === 'FREE') {
    res.caminoGratis = true;
  }
  if (res.tier === 'PAGO') {
    res.avisos.push('el modelo activo ya es de PAGO: cada turno siguiente se factura al precio de pago');
  }
  // ADR-096 (cambio 6): el bloque de fallas cubre los cuatro tiers prohibidos.
  // FUERA_ADMITIDO_A_CONSCIENCIA NO entra aqui: va a avisos, y el preflight
  // devuelve RESULTADO: AVISO (no OK y tampoco fallo).
  if (res.tier === 'ROTO_CATALOGO' || res.tier === 'ROTO_SUBAGENTE' ||
      res.tier === 'NO_MEDIDO' || res.tier === 'FUERA-DE-ALLOWLIST' ||
      res.tier === 'SIN-PROVEEDOR') {
    res.fallas.push('el modelo activo (' + res.modelo + ') no esta en las allowlists medidas [tier ' + res.tier + ']');
  }
  if (res.tier === 'FUERA_ADMITIDO_A_CONSCIENCIA') {
    res.avisos.push(MOTIVO_SIN_ADMITIR + ': ' + res.modelo);
  }
  if (esTrampaDeNombre(res.modelo)) {
    res.avisos.push(avisoTrampaNombre(res.modelo));
  }
  return res;
}

// --- Salida ------------------------------------------------------------------

function tabla(agentes) {
  return agentes.map((a) => ({
    agente: a.name,
    modo: a.mode,
    capa: capaDe(a),
    modelo: a.model || '(hereda el modelo activo del turno)',
    coste: a.coste || '(sin declarar)',
  }));
}

function imprimir(res) {
  const filas = tabla(res.agentes);
  console.log('');
  console.log('=== VERIFICACION DE LA CASCADA DE MODELO (ADR-083 D1/D2; mecanica en ADR-082) ===');
  console.log('');
  console.log('Agentes: ' + res.agentes.length +
    ' | primarios: ' + res.nPrim +
    ' | subagentes heredados: ' + res.nSub);
  console.log('Allowlist FREE: ' + FREE.concat(FREE_SUPERVIVIENTES).join(', '));
  console.log('Allowlist FREE estricta (unica con $0 medido en primario Y subagente): ' + FREE_ESTRICTA.join(', '));
  console.log('Allowlist PAGO (pagadas, no gratuitas): ' + PAGO.join(', '));
  // ADR-096 (cambio 13): el resumen imprime el conteo de las 4 listas CON su motivo.
  console.log('Prohibidos y no medidos, por motivo (ADR-096 B1):');
  console.log('  NO_SUBAGENTE (' + NO_SUBAGENTE.length + '): ' + NO_SUBAGENTE.join(', ') + ' -> ' + MOTIVO_NO_SUBAGENTE);
  console.log('  NO_CATALOGO (' + NO_CATALOGO.length + '): ' + NO_CATALOGO.join(', ') + ' -> ' + MOTIVO_NO_CATALOGO);
  console.log('  NO_MEDIDO (' + NO_MEDIDO.length + '): ' + NO_MEDIDO.join(', ') + ' -> ' + MOTIVO_NO_MEDIDO);
  console.log('  SIN_ADMITIR (' + SIN_ADMITIR.length + '): ' + SIN_ADMITIR.join(', ') + ' -> ' + MOTIVO_SIN_ADMITIR);
  console.log('');
  console.log('Checks:');
  res.checks.forEach((c) => console.log('  (' + c.id + ') ' + (c.ok ? 'OK  ' : 'FALLA') + ' ' + c.detalle));
  console.log('');
  console.log('| Agente | Capa | Modelo | coste: |');
  console.log('|---|---|---|---|');
  filas.forEach((f) => console.log('| ' + f.agente + ' | ' + f.capa + ' | ' + f.modelo + ' | ' + f.coste + ' |'));
  console.log('');

  if (res.avisos && res.avisos.length) {
    console.log('AVISOS:');
    res.avisos.forEach((a) => console.log('  - ' + a));
    console.log('');
  }

  if (res.fallas.length) {
    console.log('RESULTADO: FALLA (' + res.fallas.length + ')');
    res.fallas.forEach((f, i) => console.log('  ' + (i + 1) + '. ' + f));
    console.log('');
    return 1;
  }
  console.log('RESULTADO: OK. Cascada vigente (ADR-083; mecanica de herencia en ADR-082).');
  console.log('  - Los ' + res.agentes.length + ' agentes (2 primarios + ' + res.nSub + ' subagentes) NO llevan pin:');
  console.log('    el precio lo pone el MODELO ACTIVO DE CADA TURNO, cambiable en el selector.');
  console.log('  - Ningun rol tiene precio propio: cambiar de modelo a mitad de sesion NO es una');
  console.log('    violacion de la configuracion (por eso no existe el check "una sesion no debe');
  console.log('    contener mas de un modelo"); lo que se vigila es la escalada tardia.');
  console.log('  - Subagentes: heredan el modelo del turno. Se prueba con:');
  console.log('      node scripts/ejecucion/verificar-capa-gratis.js verificar-herencia --sesion <id>');
  console.log('  - Reparto real por tier de una sesion (message.data.modelID):');
  console.log('      node scripts/ejecucion/verificar-capa-gratis.js reparto --sesion <id>');
  console.log('  - Antes de cambiar de modelo con contexto grande (D5):');
  console.log('      node scripts/ejecucion/verificar-capa-gratis.js --preflight');
  console.log('');
  return 0;
}

function imprimirHerencia(res) {
  console.log('');
  console.log('=== HERENCIA DE MODELO (ADR-082, punto 4) ===');
  console.log('');
  console.log('DB (solo lectura): ' + res.db);
  console.log('Sesion: ' + res.sesion + ' | filas en la cadena: ' + res.filas.length);
  console.log('Cada hijo se compara contra el modelo de su padre EN EL INSTANTE DE SU SPAWN.');
  console.log('');
  const ld = lineaDesfase(res.desfase);
  if (ld) console.log(ld);
  res.filas.forEach((f) => {
    console.log('  ' + (f.parent_id ? 'hijo  ' : 'raiz  ') +
      String(f.agent || '(sin agent)').padEnd(22) +
      String(normModel(f.model) || '(sin modelo)').padEnd(30) +
      ' cost ' + (f.cost == null ? '?' : f.cost));
  });
  console.log('');
  res.avisos.forEach((a) => console.log('AVISO: ' + a));
  if (res.fallas.length) {
    console.log('RESULTADO: FALLA (' + res.fallas.length + ')');
    res.fallas.forEach((f, i) => console.log('  ' + (i + 1) + '. ' + f));
    console.log('');
    return 1;
  }
  console.log('RESULTADO: OK. ' + res.comparadas + ' par(es) padre/hijo coinciden en modelo.');
  console.log('  El padre fija el modelo del turno y el subagente lo hereda: la cascada sigue vigente.');
  console.log('  Comparacion por instante de spawn: si el padre cambia de modelo en el selector a mitad de');
  console.log('  sesion, el hijo lanzado antes del cambio esta bien en el modelo anterior. Por eso NO se');
  console.log('  compara contra una raiz unica de modelo (daba falsos positivos en sesiones con escalada).');
  console.log('  Cuando el instante no es reconstruible el caso degrada a AVISO, nunca a FALLA.');
  console.log('  session.model registra el ULTIMO modelo de la fila, no el de apertura: por eso');
  console.log('  el reparto por tier se mide con message.data.modelID, mensaje a mensaje.');
  console.log('');
  return 0;
}

function imprimirReparto(res) {
  console.log('');
  console.log('=== REPARTO POR TIER DE LA SESION (ADR-083, D2) ===');
  console.log('');
  console.log('DB (solo lectura): ' + res.db);
  console.log('Sesion: ' + res.sesion + ' | filas en la cadena: ' + res.filas.length +
    ' | mensajes de asistente: ' + res.mensajes.length + ' | rol: ' + (res.rol || 'sesion'));
  console.log('Fuente: message.data.modelID + message.data.providerID (session.model NO sirve).');
  console.log('');
  const ld = lineaDesfase(res.desfase);
  if (ld) console.log(ld);
  console.log('| Modelo | Tier | Mensajes | Tokens | Coste medido | Agentes |');
  console.log('|---|---|---|---|---|---|');
  res.porModelo.forEach((m) => {
    console.log('| ' + m.modelo + ' | ' + m.tier + ' | ' + m.mensajes + ' | ' +
      fmtTokens(m.tokens) + ' | ' + fmtUsd(m.cost) + ' | ' + m.agentes.join(', ') + ' |');
  });
  console.log('');
  console.log('Reparto por tier (mensajes de asistente): FREE ' + (res.porTier.FREE || 0) +
    ' | PAGO ' + (res.porTier.PAGO || 0) +
    ' | ROTO ' + (res.porTier.ROTO || 0) +
    ' | fuera de allowlist ' + ((res.porTier.FUERA || 0) + (res.porTier['FUERA-DE-ALLOWLIST'] || 0)));
  // ADR-096 (cambio 5): las claves nuevas van AL FINAL, sin tocar las 4 lineas de arriba.
  console.log('  (ADR-096) ROTO_SUBAGENTE ' + (res.porTier.ROTO_SUBAGENTE || 0) +
    ' | ROTO_CATALOGO ' + (res.porTier.ROTO_CATALOGO || 0) +
    ' | NO_MEDIDO ' + (res.porTier.NO_MEDIDO || 0) +
    ' | fuera a conciencia (SIN_ADMITIR) ' + (res.porTier.FUERA_ADMITIDO_A_CONSCIENCIA || 0) +
    ' | sin proveedor ' + (res.porTier['SIN-PROVEEDOR'] || 0));
  // ADR-096 B1: un ROTO_SUBAGENTE contado como sesion es un dato que obliga a
  // re-preguntar al operador; nunca un PASS.
  if ((res.porTier.ROTO_SUBAGENTE || 0) > 0 && (res.rol || 'sesion') === 'sesion') {
    console.log('  DATO A RE-PREGUNTAR: hay ' + res.porTier.ROTO_SUBAGENTE +
      ' mensaje(s) de un modelo prohibido como subagente contados en la columna sesion.');
    console.log('    La tabla opencode.db no distingue sesion de subagente: confirma con el operador');
    console.log('    de que rol viene ese mensaje antes de dar el reparto por bueno (no es un PASS).');
  }
  console.log('');
  // ADR-096 B2: ataque a la trampa de nombres (el selector del TUI busca por nombre).
  res.porModelo.forEach((m) => {
    if (esTrampaDeNombre(m.modelo)) console.log(avisoTrampaNombre(m.modelo));
  });
  if (res.avisos.length) {
    console.log('AVISOS:');
    res.avisos.forEach((a) => console.log('  - ' + a));
  }
  if (res.escalada) {
    const e = res.escalada;
    if (e.tipo === 'ESCALADA-TARDIA') {
      console.log('AVISO DE ESCALADA TARDIA (no es violacion: el precio lo elige el operador)');
      console.log('  Primer mensaje de asistente: ' + e.primero.modelo + ' (FREE), turno 1 de ' + e.turnos +
        ', contexto ' + fmtTokens(e.primero.tokens) + ' tokens -> coste estimado ' + fmtUsd(e.costePrimero));
      console.log('  Ultimo mensaje de asistente:  ' + e.ultimo.modelo + ' (PAGO), turno ' + e.turnos +
        ', contexto ' + fmtTokens(e.ultimo.tokens) + ' tokens -> coste estimado ' + fmtUsd(e.costeTurno) + ' por turno');
      if (e.factor > 0) {
        console.log('  El mismo turno ahora cuesta ~' + (Math.round(e.factor * 10) / 10) + 'x: el contexto manda en el precio.');
      }
      console.log('  Data medida: turno 2 (~20.000 tokens) ~$0.001 por subagente; turno 25 (~700.000) ~$0.05 (~35x).');
      console.log('  Contexto por encima del suelo de escalada (' + fmtTokens(e.umbral) + ' tokens).');
    } else {
      console.log('CAMBIO DE TIER, NO escalada tardia (no es violacion: el precio lo elige el operador)');
      console.log('  Primer mensaje de asistente: ' + e.primero.modelo + ' (FREE), turno 1 de ' + e.turnos +
        ', contexto ' + fmtTokens(e.primero.tokens) + ' tokens');
      console.log('  Ultimo mensaje de asistente:  ' + e.ultimo.modelo + ' (PAGO), turno ' + e.turnos +
        ', contexto ' + fmtTokens(e.ultimo.tokens) + ' tokens -> coste estimado ' + fmtUsd(e.costeTurno) + ' por turno');
      console.log('  Contexto por debajo del suelo de escalada (' + fmtTokens(e.umbral) +
        ' tokens): el turno sigue siendo barato y aqui no aplica la alarma de asimetria de momento.');
      console.log('  El "el mismo turno cuesta 35 veces mas" es de los turnos tardios, no de este.');
      console.log('  Escalar mas adelante, con el contexto ya grande, si es lo que se quiere.');
    }
  }
  if (res.fallas.length) {
    console.log('RESULTADO: FALLA (' + res.fallas.length + ')');
    res.fallas.forEach((f, i) => console.log('  ' + (i + 1) + '. ' + f));
    console.log('');
    return 1;
  }
  console.log('RESULTADO: OK. Reparto medido sobre ' + res.mensajes.length + ' mensajes de asistente.');
  console.log('');
  return 0;
}

function imprimirPreflight(res) {
  console.log('');
  console.log('=== PREFLIGHT DE MODELO (ADR-083, D5) ===');
  console.log('');
  console.log('DB (solo lectura): ' + res.db);
  console.log('Sesion activa: ' + (res.sesion || '(ninguna)') + ' | agente: ' + (res.agente || '?'));
  console.log('Modelo activo: ' + res.modelo + ' | tier: ' + res.tier + ' | rol juzgado: ' + (res.rol || 'sesion'));
  if (esTrampaDeNombre(res.modelo)) console.log(avisoTrampaNombre(res.modelo));
  console.log('Contexto actual (turno ' + res.turno + '): ' + fmtTokens(res.contexto) + ' tokens');
  console.log('  origen del numero: ' + res.origen);
  console.log('Umbral de aviso: ' + fmtTokens(res.umbral) + ' tokens de contexto');
  console.log('');
  if (res.caminoGratis) {
    console.log('CAMINO GRATIS ACTIVO: el modelo activo es ' + MODELO_FREE + ' (FREE verificado, $0.000000 medido).');
  } else {
    console.log('CAMINO GRATIS: NO activo segun el modelo reportado (' + res.modelo + ').');
    if (res.desfase && res.desfase.desfasado) {
      console.log('  La medicion esta DESFASADA, asi que ese modelo puede no ser el vigente.');
    }
  }
  if (res.caminoGratis || (res.desfase && res.desfase.desfasado)) {
    console.log('  - Si el selector esta en ' + MODELO_FREE + ' (FREE verificado, $0.000000 medido):');
    console.log('    el primario y los ' + N_SUBAGENTES_ESPERADOS + ' subagentes de este turno van a $0 (ninguno lleva pin).');
    console.log('  - Cambiar de modelo en el SELECTOR es la unica palanca de precio; cambiar de agente no lo es.');
    console.log('  - TRAMPA DE NOMBRES: ' + MODELO_FREE + ' = $0, pero ' + MODELO_PARADOJO +
      ' = PAGO ($' + PRECIO_USD_POR_MTOK_ENTRADA_PARADOJO.toFixed(2) +
      ' por Mtokens de entrada, $' + PRECIO_USD_POR_MTOK_SALIDA_PARADOJO.toFixed(2) + ' por Mtokens de salida).');
    console.log('    Mismo nombre de familia, proveedor distinto, precio opuesto: el nombre NO dice si el turno cuesta $0.');
    console.log('');
  }
  const ld = lineaDesfase(res.desfase);
  if (ld) console.log(ld);
  console.log('Si el operador pasa a un modelo de PAGO ahora mismo:');
  console.log('  - este turno, con ' + fmtTokens(res.contexto) + ' tokens de contexto: ' + fmtUsd(res.costeAhora));
  console.log('  - la misma llamada en el turno 2 (~' + fmtTokens(ANCLA_BAJA_TOKENS) + ' tokens): ' + fmtUsd(res.costeAnclaBaja));
  console.log('  - la misma llamada en el turno 25 (~' + fmtTokens(ANCLA_ALTA_TOKENS) + ' tokens): ' + fmtUsd(res.costeAnclaAlta));
  console.log('');
  if (res.avisos.length) {
    console.log('AVISOS:');
    res.avisos.forEach((a) => console.log('  - ' + a));
    console.log('');
  }
  if (res.fallas.length) {
    console.log('RESULTADO: FALLA (' + res.fallas.length + ')');
    res.fallas.forEach((f, i) => console.log('  ' + (i + 1) + '. ' + f));
    console.log('');
    return 1;
  }
  if (res.porEncima) {
    console.log('RESULTADO: AVISO. Contexto por encima del umbral: pasar a PAGO aqui cuesta ' +
      fmtUsd(res.costeAhora) + ' por turno, no ' + fmtUsd(res.costeAnclaBaja) + '.');
    console.log('  No es un bloqueo (el selector es del operador): es el numero que hay que saber antes de cambiar.');
  } else if (res.tier === 'FUERA_ADMITIDO_A_CONSCIENCIA') {
    // ADR-096 (cambio 6): gratis real y no medido -> AVISO, ni OK ni falla.
    console.log('RESULTADO: AVISO. El modelo activo es gratis real pero NO medido en este repo: midalo antes de usarlo.');
    console.log('  No es un bloqueo y no es un visto bueno: no hay $0 medido en primario Y subagente que lo respalde (ADR-006).');
  } else {
    console.log('RESULTADO: OK. Contexto por debajo del umbral: cambiar de modelo aqui sigue siendo barato.');
  }
  console.log('');
  return 0;
}

// --- Main --------------------------------------------------------------------

function main() {
  const argv = process.argv.slice(2);
  const root = path.resolve(__dirname, '..', '..');
  const valor = (flag) => {
    const i = argv.indexOf(flag);
    return i >= 0 && i + 1 < argv.length ? argv[i + 1] : null;
  };
  const sesion = valor('--sesion') || valor('--session');
  const dbOpt = valor('--db');
  // ADR-096 (cambio 12): --rol sesion|subagente. Default 'sesion' (documentado):
  // la tabla opencode.db no distingue sesion de subagente, asi que el guard pide
  // el rol de forma explicita en vez de adivinarlo.
  const rol = normRol(valor('--rol'));
  const quiereHerencia = argv.indexOf('verificar-herencia') >= 0 || (!!sesion && argv.indexOf('reparto') < 0);
  const quiereReparto = argv.indexOf('reparto') >= 0;
  const quierePreflight = argv.indexOf('--preflight') >= 0;

  if (argv.indexOf('--help') >= 0 || argv.indexOf('-h') >= 0) {
    console.log('');
    console.log('uso: node scripts/ejecucion/verificar-capa-gratis.js [modo] [opciones]');
    console.log('  (sin modo)                          checks estaticos (a)-(f) del roster');
    console.log('  --json                              los mismos checks en JSON');
    console.log('  verificar-herencia --sesion <id>    asercion hijo.model == padre.model');
    console.log('  reparto --sesion <id>               reparto real por tier (message.data.modelID)');
    console.log('  --preflight [--umbral <tokens>]     modelo activo, contexto y coste estimado');
    console.log('  --db <ruta>                         otro opencode.db (por defecto ' + dbPorDefecto() + ')');
    console.log('  --rol sesion|subagente              rol que se juzga (default: sesion)');
    console.log('');
    console.log('  --rol distingue el veredicto de los modelos que solo fallan en un rol:');
    console.log('  opencode/big-pickle es ROTO_SUBAGENTE con --rol subagente y NO lo es por defecto.');
    console.log('');
    return 0;
  }

  if (quiereHerencia || quiereReparto) {
    if (!sesion) {
      console.log('');
      console.log('uso: node scripts/ejecucion/verificar-capa-gratis.js ' +
        (quiereReparto ? 'reparto' : 'verificar-herencia') + ' --sesion <id> [--rol sesion|subagente]');
      console.log('     (--db <ruta> para otro opencode.db; por defecto ' + dbPorDefecto() + ')');
      console.log('     (--rol: default sesion; la tabla opencode.db no distingue sesion de subagente)');
      console.log('');
      return 1;
    }
    const dbPath = dbOpt ? path.resolve(dbOpt) : dbPorDefecto();
    if (!fs.existsSync(dbPath)) {
      console.log('');
      console.log('RESULTADO: FALLA (1)');
      console.log('  1. no existe ' + dbPath + ' -> pasa --db <ruta>');
      console.log('');
      return 1;
    }
    return quiereReparto
      ? imprimirReparto(repartoPorTier(dbPath, sesion, rol))
      : imprimirHerencia(verificarHerencia(dbPath, sesion));
  }

  if (quierePreflight) {
    const dbPath = dbOpt ? path.resolve(dbOpt) : dbPorDefecto();
    if (!fs.existsSync(dbPath)) {
      console.log('');
      console.log('=== PREFLIGHT DE MODELO (ADR-083, D5) ===');
      console.log('');
      console.log('No existe ' + dbPath + ': no hay contexto que medir. Pasa --db <ruta>.');
      console.log('');
      return 0;
    }
    const u = Number(valor('--umbral'));
    const umbral = isFinite(u) && u > 0 ? u : UMBRAL_PREFLIGHT_TOKENS;
    return imprimirPreflight(preflight(dbPath, root, umbral, rol));
  }

  const res = verificar(root, rol);

  if (argv.indexOf('--json') >= 0) {
    console.log(JSON.stringify({
      ok: res.fallas.length === 0,
      adr: 'ADR-083',
      adr_mecanica: 'ADR-082',
      allowlist_free: FREE.concat(FREE_SUPERVIVIENTES),
      allowlist_free_estricta: FREE_ESTRICTA,
      allowlist_pago: PAGO,
      rotos: ROTOS,
      prohibidos: {
        no_subagente: NO_SUBAGENTE,
        no_catalogo: NO_CATALOGO,
        no_medido: NO_MEDIDO,
      },
      sin_admitir: SIN_ADMITIR,
      motivos: {
        no_subagente: MOTIVO_NO_SUBAGENTE,
        no_catalogo: MOTIVO_NO_CATALOGO,
        no_medido: MOTIVO_NO_MEDIDO,
        sin_admitir: MOTIVO_SIN_ADMITIR,
      },
      rol: rol,
      primarios: res.nPrim,
      pines: res.nPines,
      subagentes: res.nSub,
      coste_usd_por_token_pago: COSTO_USD_POR_TOKEN_PAGO,
      umbral_preflight_tokens: UMBRAL_PREFLIGHT_TOKENS,
      umbral_escalada_tardia_tokens: UMBRAL_ESCALADA_TARDIA_TOKENS,
      checks: res.checks,
      agentes: tabla(res.agentes),
      avisos: res.avisos,
      fallas: res.fallas,
    }, null, 2));
    return res.fallas.length ? 1 : 0;
  }

  return imprimir(res);
}

if (require.main === module) process.exit(main());

module.exports = {
  verificar, verificarHerencia, repartoPorTier, escaladaTardia, preflight,
  FREE, FREE_SUPERVIVIENTES, FREE_ESTRICTA, PAGO, ROTOS,
  NO_SUBAGENTE, NO_CATALOGO, NO_MEDIDO, SIN_ADMITIR,
  esFree, esFreeEstricta, esPago, esNoSubagente, esNoCatalogo, esNoMedido, esSinAdmitir, esRoto,
  capaDe, modoDe, tierDe, tierDeMensaje, normRol, esTrampaDeNombre, main,
  UMBRAL_PREFLIGHT_TOKENS, UMBRAL_ESCALADA_TARDIA_TOKENS, ANCLA_BAJA_TOKENS, ANCLA_ALTA_TOKENS,
};