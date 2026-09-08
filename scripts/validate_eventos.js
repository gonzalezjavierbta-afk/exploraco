// scripts/validate_eventos.js
// Valida un lote de eventos (array JSON) antes de subirlo a la agenda con
// upload-eventos.js. Verifica los campos minimos del schema de evento y la
// consistencia de fechas. Con --prod ademas avisa de colisiones de slug y
// del total de eventos en produccion (limite de la agenda).
//
// Uso:
//   node scripts/validate_eventos.js <archivo.json> [--prod] [URL]
//
// Exit 0 = PASS, 1 = FAIL. Solo lectura; no modifica archivos.
// ASCII-safe (no emite tildes).

var SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
var DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
var VALID_TIPO = ['festival', 'musica', 'gastro', 'naturaleza', 'cultura'];

function validDate(s) {
  if (typeof s !== 'string' || !DATE_RE.test(s)) return false;
  var y = parseInt(s.slice(0, 4), 10);
  var mo = parseInt(s.slice(5, 7), 10);
  var d = parseInt(s.slice(8, 10), 10);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return false;
  return true;
}

function normalizeEvent(ev) {
  var tags = ev && ev.tags ? ev.tags : {};
  return {
    slug: ev && ev.slug,
    nombre: ev && ev.nombre,
    ciudad: ev && ev.ciudad,
    lat: ev && ev.lat,
    lng: ev && ev.lng,
    fecha_inicio: tags.fecha_inicio,
    fecha_fin: tags.fecha_fin || tags.fecha_inicio,
    sede: tags.sede,
    tipo_evento: tags.tipo_evento
  };
}

// Devuelve { ok, errors:[{slug, msg}] }
function validateEvents(list) {
  var errors = [];
  var ok = true;

  if (!Array.isArray(list)) {
    return { ok: false, errors: [{ slug: '(lote)', msg: 'el archivo debe ser un array de eventos' }] };
  }

  list.forEach(function (ev, i) {
    var n = normalizeEvent(ev);
    var slug = n.slug || ('#' + (i + 1));

    function fail(msg) { ok = false; errors.push({ slug: slug, msg: msg }); }

    if (!ev || typeof ev !== 'object') { fail('evento no es un objeto'); return; }

    if (!n.slug || typeof n.slug !== 'string') fail('falta slug');
    else if (!SLUG_RE.test(n.slug)) fail('slug invalido (solo minusculas, numeros y guiones): ' + n.slug);

    if (!n.nombre || !String(n.nombre).trim()) fail('falta nombre');
    if (!n.ciudad || !String(n.ciudad).trim()) fail('falta ciudad');

    if (typeof n.lat !== 'number' || typeof n.lng !== 'number') fail('lat/lng deben ser numeros');
    else if (n.lat === 0 && n.lng === 0) fail('coordenadas en 0,0 (prohibido)');

    if (!validDate(n.fecha_inicio)) fail('tags.fecha_inicio invalida (formato YYYY-MM-DD): ' + n.fecha_inicio);
    if (n.fecha_fin && !validDate(n.fecha_fin)) fail('tags.fecha_fin invalida (formato YYYY-MM-DD): ' + n.fecha_fin);
    else if (validDate(n.fecha_inicio) && validDate(n.fecha_fin) && n.fecha_fin < n.fecha_inicio) {
      fail('tags.fecha_fin anterior a fecha_inicio (' + n.fecha_fin + ' < ' + n.fecha_inicio + ')');
    }

    if (!n.sede || !String(n.sede).trim()) fail('tags.sede requerida (lugar del evento)');

    if (n.tipo_evento && VALID_TIPO.indexOf(n.tipo_evento) === -1) {
      fail('tags.tipo_evento invalido (validos: ' + VALID_TIPO.join(',') + '): ' + n.tipo_evento);
    }

    ['lineup', 'agenda', 'categorias_entrada', 'que_llevar', 'prohibido'].forEach(function (k) {
      var v = ev.tags && ev.tags[k];
      if (v !== undefined && !Array.isArray(v)) fail('tags.' + k + ' debe ser un array');
    });
  });

  // Slugs unicos en el lote
  var seen = {};
  list.forEach(function (ev) {
    if (ev && ev.slug) {
      if (seen[ev.slug]) { ok = false; errors.push({ slug: ev.slug, msg: 'slug duplicado en el lote' }); }
      seen[ev.slug] = true;
    }
  });

  return { ok: ok, errors: errors };
}

async function checkProd(list, baseUrl) {
  var warnings = [];
  try {
    var r = await fetch(baseUrl + '/api/destinos?cat=evento&limit=500&status=published');
    var j = await r.json();
    var data = j.data || [];
    var bySlug = {};
    data.forEach(function (d) { if (d.slug) bySlug[d.slug] = true; });
    list.forEach(function (ev) {
      if (ev && ev.slug && bySlug[ev.slug]) {
        warnings.push({ slug: ev.slug, msg: 'el slug YA existe en produccion (se re-subira: DELETE+POST)' });
      }
    });
    warnings.push({ slug: '(prod)', msg: 'total eventos en produccion: ' + data.length + ' (la agenda pide limit 200)' });
  } catch (e) {
    warnings.push({ slug: '(prod)', msg: 'no se pudo consultar produccion: ' + e.message });
  }
  return warnings;
}

async function main() {
  var args = process.argv.slice(2);
  var file = args[0];
  var prod = args.indexOf('--prod') !== -1;
  var baseUrl = args[args.indexOf('--prod') + 1] || 'https://exploraco.vercel.app';

  if (!file) {
    console.error('Uso: node scripts/validate_eventos.js <archivo.json> [--prod] [URL]');
    process.exit(1);
  }

  var fs = require('fs');
  var list;
  try {
    list = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    console.error('[FAIL] no se pudo leer/parsear ' + file + ': ' + e.message);
    process.exit(1);
  }

  var res = validateEvents(list);
  var fails = 0;

  res.errors.forEach(function (e) {
    console.log('[FAIL] ' + e.slug + ' -> ' + e.msg);
    if (e.slug !== '(lote)') fails++;
  });

  if (prod) {
    var warnings = await checkProd(list, baseUrl);
    warnings.forEach(function (w) { console.log('[AVISO] ' + w.slug + ' -> ' + w.msg); });
  }

  if (!res.ok) {
    console.log('\nRESULTADO: FAIL (' + fails + ' evento(s) con errores)');
    process.exit(1);
  }
  console.log('\nRESULTADO: PASS - ' + list.length + ' evento(s) validos');
  process.exit(0);
}

module.exports = { validateEvents: validateEvents };

if (require.main === module) {
  main().catch(function (e) { console.error('[FAIL] ' + e.message); process.exit(1); });
}