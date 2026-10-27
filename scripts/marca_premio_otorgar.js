#!/usr/bin/env node
// ============================================================================
// scripts/marca_premio_otorgar.js
// ADR-107 D3/D4/D6/D10: otorgamiento del PREMIO SEMANAL de una marca.
// NO hay cron ni disparo automatico (hecho 18 del ADR): lo ejecuta el
// operador. Este script es la via operativa unica.
//
// Uso:
//   node scripts/marca_premio_otorgar.js <marca_id> [opciones]
//   node scripts/marca_premio_otorgar.js --marca <marca_id> [opciones]
//
// Opciones:
//   --marca <uuid>        marca destino (o primer argumento posicional)
//   --semana <YYYY-Www>   semana ISO (por defecto, la semana en curso)
//   --dry-run             SOLO imprime el podio y lo que se otorgaria.
//                         No escribe nada: usa la rama GET publica
//                         ?tipo=marca_premios, que es preview por diseno.
//   --url <base>          base de la API (def. https://exploraco.vercel.app)
//   --json                salida JSON cruda en lugar de tabla
//
// Entorno:
//   ADMIN_SECRET   obligatorio salvo en --dry-run
//   API_URL        alternativa a --url
//
// ASCII-safe, cero dependencias (solo modulos de Node y fetch global).
// ============================================================================

'use strict';

var API_DEF = 'https://exploraco.vercel.app';

function uso() {
  console.log('Uso: node scripts/marca_premio_otorgar.js <marca_id> [--semana YYYY-Www]'
    + ' [--dry-run] [--url <base>] [--json]');
  console.log('Entorno: ADMIN_SECRET (obligatorio salvo --dry-run), API_URL (opcional).');
}

function argDe(argv, nombre) {
  var i = argv.indexOf(nombre);
  if (i !== -1 && argv[i + 1] && argv[i + 1].indexOf('--') !== 0) return argv[i + 1];
  var pref = nombre + '=';
  for (var j = 0; j < argv.length; j++) {
    if (argv[j].indexOf(pref) === 0) return argv[j].slice(pref.length);
  }
  return null;
}

function esUuid(s) {
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(String(s || ''));
}

function esSemana(s) {
  return /^[0-9]{4}-W(0[1-9]|[1-4][0-9]|5[0-3])$/.test(String(s || ''));
}

function num(v) {
  var n = Number(v);
  return isFinite(n) ? n : 0;
}

function pad(s, n) {
  s = String(s === null || s === undefined ? '-' : s);
  while (s.length < n) s = s + ' ';
  return s;
}

function padIzq(s, n) {
  s = String(s === null || s === undefined ? '-' : s);
  while (s.length < n) s = ' ' + s;
  return s;
}

function lineaPodio(p) {
  return '  #' + p.puesto + '  '
    + pad(p.usuario_id, 38)
    + padIzq(num(p.xp_semana).toFixed(2), 12) + ' XP'
    + padIzq(p.unidades, 4) + ' u'
    + '  ' + pad(p.consumible_clave, 26)
    + padIzq(num(p.valor_xp).toFixed(2), 12) + ' XP'
    + padIzq(num(p.valor_cop_estimado).toFixed(0), 9) + ' COP'
    + (p.otorgado ? '  [otorgado]' : '');
}

async function main() {
  var argv = process.argv.slice(2);
  if (argv.indexOf('--help') !== -1 || argv.indexOf('-h') !== -1) {
    uso();
    return 0;
  }

  var dryRun = argv.indexOf('--dry-run') !== -1;
  var salidaJson = argv.indexOf('--json') !== -1;

  var marcaId = argDe(argv, '--marca');
  var semana = argDe(argv, '--semana');
  var base = argDe(argv, '--url') || process.env.API_URL || API_DEF;

  if (!marcaId) {
    // Primer argumento posicional que no sea una bandera.
    for (var i = 0; i < argv.length; i++) {
      if (argv[i].indexOf('--') !== 0 && esUuid(argv[i])) { marcaId = argv[i]; break; }
    }
  }
  if (!marcaId) {
    console.error('ERROR: falta la marca. Se espera un UUID.');
    uso();
    return 1;
  }
  if (!esUuid(marcaId)) {
    console.error('ERROR: marca_id no es un UUID valido: ' + marcaId);
    return 1;
  }
  if (semana && !esSemana(semana)) {
    console.error('ERROR: --semana no respeta el formato YYYY-Www: ' + semana);
    return 1;
  }

  base = String(base).replace(/\/+$/, '');
  var url;
  var opciones;

  if (dryRun) {
    // Preview puro: la rama GET ?tipo=marca_premios no escribe nunca.
    url = base + '/api/interacciones?tipo=marca_premios&marca_id='
      + encodeURIComponent(marcaId)
      + (semana ? '&semana=' + encodeURIComponent(semana) : '');
    opciones = { method: 'GET', headers: { Accept: 'application/json' } };
  } else {
    var secret = process.env.ADMIN_SECRET;
    if (!secret) {
      console.error('ERROR: ADMIN_SECRET no esta en el entorno (obligatorio para otorgar).');
      console.error('       Usa --dry-run para ver el podio sin escribir.');
      return 1;
    }
    url = base + '/api/interacciones?tipo=marca_premio_otorgar';
    opciones = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: 'Bearer ' + secret
      },
      body: JSON.stringify({ marca_id: marcaId, semana: semana || null })
    };
  }

  var resp;
  var texto;
  try {
    resp = await fetch(url, opciones);
    texto = await resp.text();
  } catch (e) {
    console.error('ERROR de red: ' + (e && e.message));
    return 1;
  }

  var datos = null;
  try { datos = JSON.parse(texto); } catch (eJson) { datos = null; }

  if (!datos) {
    console.error('ERROR: respuesta no JSON (HTTP ' + resp.status + '):');
    console.error(texto.slice(0, 400));
    return 1;
  }

  if (!resp.ok || datos.ok !== true) {
    console.error('ERROR HTTP ' + resp.status + ' [' + (datos.code || datos.error || '?') + ']');
    if (datos.error) console.error('  ' + datos.error);
    console.error(texto.slice(0, 600));
    return 1;
  }

  if (salidaJson) {
    console.log(JSON.stringify(datos, null, 2));
    return 0;
  }

  console.log('Marca:  ' + marcaId);
  console.log('Semana: ' + (datos.semana || semana || '(en curso)'));
  console.log('Modo:   ' + (dryRun ? 'DRY-RUN (no escribe)' : 'EJECUCION REAL'));
  console.log('Tasa XP/COP no calibrada: los valores en COP son estimacion '
    + '(calibrado:' + (datos.calibrado === false ? 'false' : '?') + ').');

  if (datos.degradado) {
    console.log('');
    console.log('AVISO: esquema 058 sin aplicar (degradado). No hay podio que repartir.');
    return 0;
  }
  if (datos.pausada) {
    console.log('');
    console.log('PROMO PAUSADA (' + (datos.motivo || 'estado_promo=false') + '): no se otorgo nada.');
    return 0;
  }

  var premios = datos.premios || [];
  console.log('');
  if (!premios.length) {
    console.log('Podio vacio: no hay actividad elegible en la semana.');
  } else {
    console.log('PODIO (leaderboard GLOBAL, dueno de la marca excluido):');
    for (var k = 0; k < premios.length; k++) console.log(lineaPodio(premios[k]));
  }

  if (dryRun) {
    console.log('');
    console.log('Nada escrito. Para otorgar: quita --dry-run y define ADMIN_SECRET.');
    return 0;
  }

  var otorgados = datos.otorgados || [];
  var omitidos = datos.omitidos || [];
  console.log('');
  console.log('OTORGADOS: ' + otorgados.length);
  for (var o = 0; o < otorgados.length; o++) {
    var ot = otorgados[o];
    console.log('  #' + ot.puesto + ' ' + ot.usuario_id + ' -> ' + ot.unidades
      + ' x ' + ot.consumible_clave + ' (canje ' + ot.canje_id + ')');
  }
  if (omitidos.length) {
    console.log('OMITIDOS: ' + omitidos.length);
    for (var m = 0; m < omitidos.length; m++) {
      var om = omitidos[m];
      console.log('  #' + om.puesto + ' ' + (om.usuario_id || '-') + ' -> ' + om.motivo);
    }
  }
  console.log('');
  console.log('Fin. Reejecutar la misma semana es idempotente: no duplica premios.');
  return 0;
}

main().then(function (codigo) {
  process.exitCode = codigo;
}).catch(function (e) {
  console.error('ERROR inesperado: ' + (e && e.message));
  process.exitCode = 1;
});
