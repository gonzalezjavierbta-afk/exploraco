// scripts/upload-eventos.js
// Sube un lote de eventos (array JSON) a la agenda via la API de admin de
// produccion (/api/admin-destinos, Bearer). Idempotente: por evento borra la
// fila existente (mismo slug) y la re-crea (DELETE+POST). Es la via
// automatizada para poblar la agenda cultural (agenda.html / index.html) sin
// escribir seed+loader+smoke por evento.
//
// Uso:
//   node scripts/upload-eventos.js <archivo.json> [URL] [TOKEN] [--dry] [--seed]
//   URL por defecto: https://exploraco.vercel.app
//   TOKEN por defecto: exploraco12345 (ADMIN_SECRET de desarrollo)
//   --dry  : valida y reporta sin tocar produccion
//   --seed : ademas genera scripts/seed-eventos-<fecha>.js (upsert SQL, ASCII-safe)
//
// ASCII-safe (0 bytes >127, 0 backticks, CommonJS).

const { validateEvents } = require('./validate_eventos.js');
const fs = require('fs');
const path = require('path');

const BASE_URL = process.argv[3] || 'https://exploraco.vercel.app';
const TOKEN    = process.argv[4] || process.env.ADMIN_SECRET || 'exploraco12345';
const FLAGS    = process.argv.slice(2);
const file     = FLAGS[0];
const dry      = FLAGS.indexOf('--dry') !== -1;
const seed     = FLAGS.indexOf('--seed') !== -1;

function nowStamp() {
  var d = new Date();
  var p = function (n) { return (n < 10 ? '0' : '') + n; };
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}

// Convierte caracteres no-ASCII a \uXXXX para emitir JS ASCII-safe
function jsVal(v) {
  var s = JSON.stringify(v);
  var out = '';
  for (var i = 0; i < s.length; i++) {
    var c = s.charCodeAt(i);
    out += c > 127 ? '\\u' + ('0000' + c.toString(16)).slice(-4) : s[i];
  }
  return out;
}

function normalizeEvent(ev) {
  var tags = Object.assign({}, ev.tags || {});
  if (!tags.fecha_fin) tags.fecha_fin = tags.fecha_inicio;
  var galeria = (ev.fotos_galeria || []).map(function (p, i) {
    return { url: p.url, caption: p.caption || '', orden: i };
  });
  return {
    slug: ev.slug,
    nombre: ev.nombre,
    categoria_slug: 'evento',
    lead: ev.lead || '',
    descripcion: ev.descripcion || ev.lead || '',
    highlight: ev.highlight || '',
    ciudad: ev.ciudad,
    region: ev.region || '',
    barrio: ev.barrio || '',
    lat: ev.lat,
    lng: ev.lng,
    whatsapp: ev.whatsapp || '',
    telefono: ev.telefono || '',
    email: ev.email || '',
    web: ev.web || '',
    instagram: ev.instagram || '',
    precio_desde: ev.precio_desde || '',
    horario: ev.horario || '',
    emoji: ev.emoji || '\ud83c\udf89',
    hero_bg: ev.hero_bg || 'linear-gradient(135deg,#1a051a,#3a1a3a)',
    foto_hero: ev.foto_hero || '',
    tipo: ev.tipo || '',
    capacidad: ev.capacidad || '',
    como_llegar: ev.como_llegar || '',
    status: 'published',
    destacado: !!ev.destacado,
    tags: tags,
    faqs: ev.faqs || [],
    fotos: galeria
  };
}

function toPlacePayload(ev) {
  return {
    slug: ev.slug,
    nombre: ev.nombre,
    categoria_slug: ev.categoria_slug,
    lead: ev.lead,
    descripcion: ev.descripcion,
    highlight: ev.highlight,
    ciudad: ev.ciudad,
    region: ev.region,
    barrio: ev.barrio,
    lat: ev.lat,
    lng: ev.lng,
    whatsapp: ev.whatsapp,
    telefono: ev.telefono,
    email: ev.email,
    web: ev.web,
    instagram: ev.instagram,
    precio_desde: ev.precio_desde,
    horario: ev.horario,
    emoji: ev.emoji,
    hero_bg: ev.hero_bg,
    foto_hero: ev.foto_hero,
    fotos_galeria: ev.fotos,
    tipo: ev.tipo,
    capacidad: ev.capacidad,
    como_llegar: ev.como_llegar,
    status: ev.status,
    destacado: ev.destacado,
    tags: ev.tags,
    faqs: ev.faqs,
    habitaciones: [],
    amenidades: [],
    scores: {}
  };
}

function genSeed(normalized) {
  var stamp = nowStamp();
  return '// scripts/seed-eventos-' + stamp + '.js\n'
    + '// GENERADO por upload-eventos.js (--seed) desde eventos/eventos.json.\n'
    + '// Upsert idempotente (ON CONFLICT slug) para quien tenga DATABASE_URL.\n'
    + '// Uso: DATABASE_URL=postgres://... node scripts/seed-eventos-' + stamp + '.js [--dry]\n'
    + '// ASCII-safe: 0 bytes >127.\n\n'
    + 'var neon = null;\n'
    + 'function getNeon() { if (!neon) neon = require(\'@neondatabase/serverless\').neon; return neon; }\n\n'
    + 'var EVENTOS = ' + jsVal(normalized) + ';\n\n'
    + 'module.exports = { EVENTOS: EVENTOS };\n\n'
    + 'if (require.main !== module) return;\n\n'
    + '(async function main() {\n'
    + '  var url = process.env.DATABASE_URL || process.argv[2];\n'
    + '  if (!url) { console.error(\'Falta DATABASE_URL.\'); process.exit(1); }\n'
    + '  var sql = getNeon()(url);\n'
    + '  var dry = process.argv.indexOf(\'--dry\') !== -1;\n'
    + '  if (dry) { console.log(\'[dry-run] \' + EVENTOS.length + \' eventos listos para upsert.\'); return; }\n'
    + '  var okCount = 0;\n'
    + '  for (var i = 0; i < EVENTOS.length; i++) {\n'
    + '    var ev = EVENTOS[i];\n'
    + '    try {\n'
    + '      var inserted = await sql(\n'
    + '        \'INSERT INTO destinos ( \'\n'
    + '        + \'slug, nombre, categoria_slug, lead, descripcion, highlight, \'\n'
    + '        + \'ciudad, region, barrio, lat, lng, \'\n'
    + '        + \'whatsapp, telefono, email, web, instagram, \'\n'
    + '        + \'precio_desde, horario, emoji, hero_bg, foto_hero, \'\n'
    + '        + \'tipo, capacidad, como_llegar, \'\n'
    + '        + \'status, destacado, tags, creado_en, actualizado_en \'\n'
    + '        + \') VALUES ( \'\n'
    + '        + \'$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,\'\n'
    + '        + \'$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,NOW(),NOW() \'\n'
    + '        + \') \'\n'
    + '        + \'ON CONFLICT (slug) DO UPDATE SET \'\n'
    + '        + \'nombre=EXCLUDED.nombre, lead=EXCLUDED.lead, descripcion=EXCLUDED.descripcion, \'\n'
    + '        + \'ciudad=EXCLUDED.ciudad, region=EXCLUDED.region, barrio=EXCLUDED.barrio, \'\n'
    + '        + \'lat=EXCLUDED.lat, lng=EXCLUDED.lng, web=EXCLUDED.web, instagram=EXCLUDED.instagram, \'\n'
    + '        + \'precio_desde=EXCLUDED.precio_desde, horario=EXCLUDED.horario, emoji=EXCLUDED.emoji, \'\n'
    + '        + \'hero_bg=EXCLUDED.hero_bg, foto_hero=EXCLUDED.foto_hero, tipo=EXCLUDED.tipo, \'\n'
    + '        + \'como_llegar=EXCLUDED.como_llegar, status=EXCLUDED.status, destacado=EXCLUDED.destacado, \'\n'
    + '        + \'tags = COALESCE(destinos.tags, \\\'{}\\\'::jsonb) || EXCLUDED.tags, \'\n'
    + '        + \'actualizado_en = NOW() \'\n'
    + '        + \'RETURNING id, slug, status\',\n'
    + '        [\n'
    + '          ev.slug, ev.nombre, ev.categoria_slug, ev.lead, ev.descripcion, ev.highlight,\n'
    + '          ev.ciudad, ev.region, ev.barrio, ev.lat, ev.lng,\n'
    + '          ev.whatsapp, ev.telefono, ev.email, ev.web, ev.instagram,\n'
    + '          ev.precio_desde, ev.horario, ev.emoji, ev.hero_bg, ev.foto_hero,\n'
    + '          ev.tipo, ev.capacidad, ev.como_llegar,\n'
    + '          ev.status, ev.destacado, JSON.stringify(ev.tags)\n'
    + '        ]\n'
    + '      );\n'
    + '      var id = inserted[0].id;\n'
    + '      if (ev.faqs && ev.faqs.length) {\n'
    + '        await sql(\n'
    + '          \'INSERT INTO destinos_detalles (destino_id, faqs, creado_en) VALUES ($1,$2,NOW()) \'\n'
    + '          + \'ON CONFLICT (destino_id) DO UPDATE SET faqs=EXCLUDED.faqs\',\n'
    + '          [id, JSON.stringify(ev.faqs)]\n'
    + '        ).catch(function(){});\n'
    + '      }\n'
    + '      if (ev.fotos && ev.fotos.length) {\n'
    + '        for (var f = 0; f < ev.fotos.length; f++) {\n'
    + '          await sql(\n'
    + '            \'INSERT INTO destinos_fotos (destino_id, url, caption, orden, es_hero, creado_en) \'\n'
    + '            + \'VALUES ($1,$2,$3,$4,$5,NOW()) ON CONFLICT DO NOTHING\',\n'
    + '            [id, ev.fotos[f].url, ev.fotos[f].caption || \'\', f, false]\n'
    + '          ).catch(function(){});\n'
    + '        }\n'
    + '      }\n'
    + '      okCount++;\n'
    + '      console.log(\'[OK] \' + ev.slug);\n'
    + '    } catch (err) { console.error(\'[ERROR] \' + ev.slug + \': \' + err.message); }\n'
    + '  }\n'
    + '  console.log(\'\\n\' + okCount + \'/\' + EVENTOS.length + \' eventos insertados correctamente.\');\n'
    + '})().catch(function(err){ console.error(\'ERROR:\', err.message); process.exit(1); });\n';
}

(async function main() {
  if (!file) {
    console.error('Uso: node scripts/upload-eventos.js <archivo.json> [URL] [TOKEN] [--dry] [--seed]');
    process.exit(1);
  }

  var raw;
  try {
    raw = JSON.parse(fs.readFileSync(path.resolve(file), 'utf8'));
  } catch (e) {
    console.error('ERROR leyendo ' + file + ': ' + e.message);
    process.exit(1);
  }

  var validation = validateEvents(raw);
  if (!validation.ok) {
    validation.errors.forEach(function (e) { console.log('[FAIL] ' + e.slug + ' -> ' + e.msg); });
    console.error('\nAbortando: corrige los errores antes de subir.');
    process.exit(1);
  }

  var normalized = raw.map(normalizeEvent);

  if (dry) {
    console.log('[dry-run] ' + normalized.length + ' evento(s) validos. NADA se sube a produccion.');
    normalized.forEach(function (ev) {
      var t = ev.tags;
      console.log('  - ' + ev.slug + ' | ' + ev.nombre + ' | ' + t.fecha_inicio + ' -> ' + t.fecha_fin + ' | ' + (ev.ciudad || ''));
    });
    if (seed) {
      var seedPath = path.join(__dirname, 'seed-eventos-' + nowStamp() + '.js');
      fs.writeFileSync(seedPath, genSeed(normalized));
      console.log('[seed] generado: ' + seedPath);
    }
    process.exit(0);
  }

  var auth = { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + TOKEN };
  var okCount = 0;
  var failList = [];

  for (var i = 0; i < normalized.length; i++) {
    var ev = normalized[i];
    var payload = toPlacePayload(ev);
    try {
      var list = await fetch(BASE_URL + '/api/admin-destinos?limit=500&status=published', { headers: auth });
      var listJson = await list.json();
      if (!listJson.ok) throw new Error('listado: ' + JSON.stringify(listJson).slice(0, 200));
      var existing = (listJson.data || []).filter(function (d) { return d.slug === ev.slug; });
      if (existing.length) {
        var del = await fetch(BASE_URL + '/api/admin-destinos?id=' + existing[0].id, { method: 'DELETE', headers: auth });
        var delJson = await del.json();
        if (!delJson.ok) throw new Error('borrando previo: ' + JSON.stringify(delJson).slice(0, 200));
        console.log('[reemplaza] ' + ev.slug);
      }
      var res = await fetch(BASE_URL + '/api/admin-destinos', { method: 'POST', headers: auth, body: JSON.stringify(payload) });
      var json = await res.json();
      if (!res.ok) throw new Error(res.status + ': ' + JSON.stringify(json).slice(0, 200));
      okCount++;
      console.log('[OK] ' + json.data.slug + ' (' + json.data.id + ') status=' + json.data.status);
    } catch (err) {
      failList.push(ev.slug);
      console.log('[FAIL] ' + ev.slug + ' -> ' + err.message);
    }
  }

  if (seed) {
    var seedPath2 = path.join(__dirname, 'seed-eventos-' + nowStamp() + '.js');
    fs.writeFileSync(seedPath2, genSeed(normalized));
    console.log('\n[seed] generado: ' + seedPath2);
  }

  console.log('\nRESULTADO: ' + okCount + '/' + normalized.length + ' subidos.'
    + (failList.length ? ' Fallos: ' + failList.join(', ') : ''));
  if (failList.length) process.exit(1);
})().catch(function (err) {
  console.error('ERROR:', err.message);
  process.exit(1);
});