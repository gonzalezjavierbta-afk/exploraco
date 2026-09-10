// scripts/reclasificar-subcategorias.js
// ADR-016: asigna tags.subcategoria (slug ASCII de lista cerrada) a los
// destinos legacy de las categorias sitio/comida/evento usando reglas de
// inferencia deterministas (keyword -> subcategoria).
//
// Prioridad de fuentes: tags.tipo_actividad|tipo_comida|tipo_evento >
// columna tipo (BASE.tipo de los seeds) > nombre > lead.
// Orden de reglas por categoria: especifico -> generico (primera regla que
// matchea gana). Todo match se hace sobre texto normalizado (quita
// diacriticos, minusculas) para que las keywords sean ASCII puras (ADR-002).
//
// MERGE JSONB (ADR-003): NUNCA reemplaza tags completo:
//   tags = COALESCE(tags,'{}') || $N::jsonb   con N={"subcategoria": slug}
//
// Idempotente: si tags.subcategoria ya existe se salta (estado skipped).
// Si no hay match de reglas no se asigna nada (fallback intacto, ADR-016) y
// el destino queda marcado sin-match en el log para revision manual.
//
// Uso:
//   DATABASE_URL=postgres://... node scripts/reclasificar-subcategorias.js --dry-run
//   DATABASE_URL=postgres://... node scripts/reclasificar-subcategorias.js --apply
//   node scripts/reclasificar-subcategorias.js              (dry-run, seeds locales)
//   node scripts/reclasificar-subcategorias.js --local      (fuerza lectura de seeds)
//
// Sin DATABASE_URL hace dry-run leyendo scripts/seed-*.js (patron seed-*.js,
// solo archivos con guard require.main para no ejecutar efectos). --apply
// SIEMPRE exige DATABASE_URL. La connection string nunca se loguea completa.
//
// Log de revision: scripts/logs/reclasificar-subcategorias-<fecha>.log
// (slug | estado | subcategoria | fuente | keyword). ASCII-safe estricto.

'use strict';

var fs = require('fs');
var path = require('path');

var SUBCATS = {
  sitio:  ['naturaleza', 'museo', 'cultura', 'bar', 'parque',
           'espacio-publico', 'sitio-historico', 'religioso', 'aventura'],
  comida: ['restaurante', 'cafe', 'gastrobar', 'comida-rapida', 'dulces'],
  evento: ['concierto', 'festival', 'teatro', 'exposicion', 'deporte',
           'cine', 'fiesta']
};

// Keywords en ASCII puro (sin tildes): el matcher normaliza la fuente y las
// keywords antes de comparar, asi que "canon" matchea "canon" (canon).
// La clave 'excluye' aplica solo a la regla actual (ej. bar no matchea el
// caso restaurante-bar; candelario cae en sin-match para revision manual).
var RULES = {
  sitio: [
    { sub: 'bar', kw: ['salsa', 'bar', 'pub', 'discoteca', 'karaoke',
        'megaclub', 'club de musica', 'venue', 'restobar', 'speakeasy',
        'cocteleria', 'lounge', 'cafe-bar', 'rumba'], excluye: ['restaurante'] },
    { sub: 'parque', kw: ['parque', 'paseo urbano'] },
    { sub: 'religioso', kw: ['iglesia', 'basilica', 'catedral', 'monasterio',
        'santuario', 'convento', 'capilla', 'clarisas'] },
    { sub: 'aventura', kw: ['canon', 'rapel', 'rafting', 'tours aereos',
        'escalada', 'tirolesa', 'canopy', 'parapente'] },
    { sub: 'naturaleza', kw: ['cerro', 'quebrada', 'sendero', 'senderismo',
        'laguna', 'mirador natural', 'orquideario', 'jardin botanico',
        'cascada', 'pocetas', 'bosque', 'humedal', 'ecotur', 'naturaleza',
        'turismo de naturaleza'] },
    { sub: 'sitio-historico', kw: ['centro historico', 'castillo', 'baluarte',
        'casa museo', 'patrimonial', 'patrimonio'] },
    { sub: 'cultura', kw: ['centro cultural', 'cultural', 'cultura',
        'artes escenicas', 'escenicas', 'teatro', 'galeria', 'mediateca',
        'muralismo', 'cine de arte', 'exposiciones', 'laboratorios creativos'] },
    { sub: 'museo', kw: ['museo'] },
    { sub: 'espacio-publico', kw: ['plaza', 'espacio publico', 'espacio civico',
        'alameda'] }
  ],
  comida: [
    { sub: 'dulces', kw: ['panaderia', 'heladeria', 'postres', 'dulces'] },
    { sub: 'comida-rapida', kw: ['comida rapida', 'comidas rapidas', 'burger',
        'pizza', 'chuzos', 'salchipapa'] },
    { sub: 'gastrobar', kw: ['gastrobar', 'gastro', 'bistro', 'tapas',
        'marisqueria', 'cevicheria'] },
    { sub: 'cafe', kw: ['cafe', 'cafeteria', 'cafe bar'] },
    { sub: 'restaurante', kw: ['restaurante'] }
  ],
  evento: [
    { sub: 'festival', kw: ['festival'] },
    { sub: 'fiesta', kw: ['fiestas', 'fiesta'] },
    { sub: 'cine', kw: ['cine'] },
    { sub: 'teatro', kw: ['teatro', 'teatro musical', 'cabaret'] },
    { sub: 'exposicion', kw: ['exposicion', 'exposiciones', 'feria', 'ferias',
        'exhibicion', 'muestra'] },
    { sub: 'deporte', kw: ['deporte', 'deportivos', 'torneo', 'carrera',
        'maraton', 'atletismo'] },
    { sub: 'concierto', kw: ['concierto', 'conciertos', 'recital', 'gira',
        'tour', 'velada', 'tributo', 'homenaje', 'set electronico'] }
  ]
};

// Normaliza: quita diacriticos (NFD + strip combining) y pasa a minusculas.
function norm(s) {
  if (s === null || s === undefined) return '';
  s = String(s);
  if (typeof s.normalize === 'function') {
    s = s.normalize('NFD');
  }
  return s.replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

// Match con borde de palabra sobre texto ya normalizado.
function tiene(textoNorm, kw) {
  var esc = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  var re = new RegExp('\\b' + esc + '\\b');
  return re.test(textoNorm);
}

function reglaExcluida(textoNorm, rule) {
  if (!rule.excluye || !rule.excluye.length) return false;
  for (var i = 0; i < rule.excluye.length; i++) {
    if (tiene(textoNorm, rule.excluye[i])) return true;
  }
  return false;
}

// Devuelve { sub, fuente, kw } o null.
function inferir(cat, tags, tipo, nombre, lead) {
  var rules = RULES[cat];
  if (!rules) return null;

  var actividadVal = '';
  var actividadClave = '';
  if (tags && typeof tags === 'object') {
    if (typeof tags.tipo_actividad === 'string' && tags.tipo_actividad) {
      actividadVal = tags.tipo_actividad;
      actividadClave = 'tipo_actividad';
    } else if (typeof tags.tipo_comida === 'string' && tags.tipo_comida) {
      actividadVal = tags.tipo_comida;
      actividadClave = 'tipo_comida';
    } else if (typeof tags.tipo_evento === 'string' && tags.tipo_evento) {
      actividadVal = tags.tipo_evento;
      actividadClave = 'tipo_evento';
    }
  }

  var fuentes = [
    { clave: actividadClave, texto: norm(actividadVal) },
    { clave: 'tipo',         texto: norm(tipo) },
    { clave: 'nombre',       texto: norm(nombre) },
    { clave: 'lead',         texto: norm(lead) }
  ];

  for (var f = 0; f < fuentes.length; f++) {
    if (!fuentes[f].clave || !fuentes[f].texto) continue;
    var t = fuentes[f].texto;
    for (var r = 0; r < rules.length; r++) {
      if (reglaExcluida(t, rules[r])) continue;
      for (var k = 0; k < rules[r].kw.length; k++) {
        if (tiene(t, rules[r].kw[k])) {
          return { sub: rules[r].sub, fuente: fuentes[f].clave,
                   kw: rules[r].kw[k] };
        }
      }
    }
  }
  return null;
}

function maskUrl(u) {
  var s = String(u || '');
  var at = s.lastIndexOf('@');
  if (at === -1) return '(url-sin-host)';
  var antes = s.slice(0, at);
  var despues = s.slice(at + 1);
  var dosP = antes.indexOf(':');
  var user = dosP === -1 ? antes : antes.slice(0, dosP);
  return 'postgres://' + user + ':***@' + despues;
}

function logLinea(logPath, linea) {
  console.log(linea);
  try { fs.appendFileSync(logPath, linea + '\n'); } catch (e) { /* log best effort */ }
}

function hoy() {
  return new Date().toISOString().slice(0, 10);
}

function leerSeedsLocales() {
  var dir = __dirname;
  var rows = [];
  var archivos = fs.readdirSync(dir).filter(function (n) {
    return /^seed-.+\.js$/.test(n);
  });
  archivos.sort();
  for (var i = 0; i < archivos.length; i++) {
    var ruta = path.join(dir, archivos[i]);
    var contenido = '';
    try { contenido = fs.readFileSync(ruta, 'utf8'); } catch (e) { continue; }
    if (contenido.indexOf('require.main !== module') === -1) continue;
    var mod = null;
    try { mod = require(ruta); } catch (e) { continue; }
    if (!mod || !mod.BASE || !mod.TAGS) continue;
    var base = mod.BASE;
    var cat = base.categoria_slug;
    if (!SUBCATS[cat]) continue;
    rows.push({
      slug: base.slug,
      nombre: base.nombre,
      categoria_slug: cat,
      lead: base.lead || '',
      tipo: base.tipo || '',
      tags: mod.TAGS
    });
  }
  return rows;
}

function obtenerDestinos(url) {
  var neon = require('@neondatabase/serverless').neon;
  var sql = neon(url);
  return sql(
    "SELECT slug, nombre, categoria_slug, lead, tipo, tags "
    + "FROM destinos WHERE categoria_slug IN ('sitio','comida','evento') "
    + "ORDER BY categoria_slug, slug"
  );
}

async function correrAplicacion(url, rows, logPath) {
  var neon = require('@neondatabase/serverless').neon;
  var sql = neon(url);
  var sqlUpd = "UPDATE destinos "
    + "SET tags = COALESCE(tags, '{}'::jsonb) || $1::jsonb, "
    + "actualizado_en = NOW() WHERE slug = $2";
  var ok = 0;
  for (var i = 0; i < rows.length; i++) {
    var r = rows[i];
    if (r._estado === 'asignar') {
      try {
        await sql(sqlUpd, [JSON.stringify({ subcategoria: r._sub }), r.slug]);
        r._estado = 'aplicado';
        ok++;
      } catch (e) {
        var msg = String(e && e.message ? e.message : e);
        logLinea(logPath, r.slug + '|ERROR|' + msg);
      }
    }
  }
  return ok;
}

function reportar(rows, logPath, modoAplicar) {
  logLinea(logPath, '[resumen] total=' + rows.length
    + ' asignar=' + rows.filter(function (r) { return r._estado === 'asignar'; }).length
    + ' aplicado=' + rows.filter(function (r) { return r._estado === 'aplicado'; }).length
    + ' skip=' + rows.filter(function (r) { return r._estado === 'skip'; }).length
    + ' sin_match=' + rows.filter(function (r) { return r._estado === 'sin-match'; }).length
    + ' modo=' + (modoAplicar ? 'apply' : 'dry-run'));

  var porSub = {};
  rows.forEach(function (r) {
    if (r._sub && !porSub[r._sub]) porSub[r._sub] = 0;
    if (r._sub) porSub[r._sub]++;
  });
  Object.keys(porSub).sort().forEach(function (s) {
    logLinea(logPath, '[sub] ' + s + '=' + porSub[s]);
  });

  var sinMatch = rows.filter(function (r) { return r._estado === 'sin-match'; });
  if (sinMatch.length) {
    logLinea(logPath, '[sin-match] destinos sin regla aplicable (revision manual):');
    sinMatch.forEach(function (r) {
      logLinea(logPath, '  - ' + r.slug + ' (' + r.categoria_slug + ')');
    });
  }
}

(async function main() {
  var args = process.argv.slice(2);
  if (args.indexOf('--help') !== -1 || args.indexOf('-h') !== -1) {
    console.log('Uso: node scripts/reclasificar-subcategorias.js [--dry-run|--apply] [--local]');
    console.log('  --dry-run  (por defecto) imprime inferencias, no toca produccion');
    console.log('  --apply    ejecuta el MERGE JSONB (exige DATABASE_URL)');
    console.log('  --local    fuerza lectura de scripts/seed-*.js');
    return;
  }
  var aplicar = args.indexOf('--apply') !== -1;
  var forzarLocal = args.indexOf('--local') !== -1;

  var url = process.env.DATABASE_URL || '';
  var logPath = path.join(__dirname, 'logs',
    'reclasificar-subcategorias-' + hoy() + '.log');
  try { fs.mkdirSync(path.join(__dirname, 'logs'), { recursive: true }); } catch (e) { /* ya existe */ }

  var modoLocal = forzarLocal || !url;
  var rows = [];
  if (modoLocal) {
    rows = leerSeedsLocales();
    logLinea(logPath, '# reclasificar-subcategorias - ' + hoy()
      + ' - MODO LOCAL (seeds, ' + rows.length + ' destinos)');
    if (aplicar) {
      console.error('ERROR: --apply requiere DATABASE_URL; en modo local no se toca produccion.');
      process.exit(1);
    }
    logLinea(logPath, '# --apply requiere DATABASE_URL (fuente real = produccion)');
  } else {
    try {
      rows = await obtenerDestinos(url);
      logLinea(logPath, '# reclasificar-subcategorias - ' + hoy()
        + ' - MODO PRODUCCION (' + maskUrl(url) + ', ' + rows.length + ' destinos)');
    } catch (e) {
      console.error('ERROR conectando a produccion (host enmascarado): '
        + String(e && e.message ? e.message : e));
      process.exit(1);
    }
  }

  rows.forEach(function (r) {
    var tags = r.tags || {};
    if (typeof tags.subcategoria === 'string' && tags.subcategoria) {
      r._estado = 'skip';
      r._sub = tags.subcategoria;
      return;
    }
    var m = inferir(r.categoria_slug, tags, r.tipo, r.nombre, r.lead);
    if (m) {
      r._estado = 'asignar';
      r._sub = m.sub;
      r._fuente = m.fuente;
      r._kw = m.kw;
    } else {
      r._estado = 'sin-match';
    }
  });

  rows.forEach(function (r) {
    if (r._estado === 'skip') {
      logLinea(logPath, r.slug + '|skip|' + r._sub + '|ya-tiene');
    } else if (r._estado === 'sin-match') {
      logLinea(logPath, r.slug + '|sin-match|||');
    } else {
      logLinea(logPath, r.slug + '|' + r._estado + '|' + r._sub + '|'
        + r._fuente + '|' + r._kw);
    }
  });

  var aplicados = 0;
  if (aplicar) {
    aplicados = await correrAplicacion(url, rows, logPath);
  }
  reportar(rows, logPath, aplicar);
  if (aplicar) {
    console.log('OK - ' + aplicados + ' destinos actualizados en produccion.');
  } else {
    console.log('DRY-RUN completado. Revisa el log: ' + logPath);
    console.log('Para aplicar en produccion: DATABASE_URL=... node scripts/reclasificar-subcategorias.js --apply');
  }
})().catch(function (err) {
  console.error('ERROR:', err && err.message ? err.message : String(err));
  process.exit(1);
});