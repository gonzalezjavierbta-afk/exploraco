// scripts/_gen_hostales_pipeline.js
// Generador del pipeline Fase 9 para los 10 hostales de Bogota.
// Produce por cada hostel:
//   - scripts/load-<slug>-api.js   (carga a prod via /api/admin-destinos)
//   - scripts/smoke_test_<slug>.js (smoke local de buildHTML con el seed)
//
// Uso: node scripts/_gen_hostales_pipeline.js
// Este script NO toca la base de datos; solo escribe archivos.

const fs = require('fs');
const path = require('path');

var HOSTELS = [
  { slug: 'cranky-croc-hostel-bogota',
    booking: 'https://www.booking.com/hotel/co/the-cranky-croc-hostel.html',
    hw: 'https://www.hostelworld.com/p/26229/the-cranky-croc-hostel/' },
  { slug: 'masaya-hostel-bogota',
    booking: '',
    hw: 'https://www.hostelworld.com/p/57813/masaya-bogota/' },
  { slug: 'botanico-hostel-bogota',
    booking: 'https://www.booking.com/hotel/co/botanico-hostel.html',
    hw: 'https://www.hostelworld.com/p/279935/botanico-hostel/' },
  { slug: 'viajero-bogota-hostel-spa',
    booking: '',
    hw: 'https://www.hostelworld.com/p/310750/viajero-bogota-hostel-spa/' },
  { slug: 'arche-noah-boutique-hostel-bogota',
    booking: '',
    hw: '' },
  { slug: 'granada-hostel-bogota',
    booking: 'https://www.booking.com/hotel/co/granada-hostel.html',
    hw: 'https://www.hostelworld.com/p/303271/granada-hostel/' },
  { slug: 'republica-cabin-beds-bogota',
    booking: 'https://www.booking.com/hotel/co/republica-hostel-cabin-beds.html',
    hw: 'https://www.hostelworld.com/p/322842/republica-bogota-cabin-beds/' },
  { slug: '82hostel-bogota',
    booking: 'https://www.booking.com/hotel/co/82hostel.html',
    hw: '' },
  { slug: 'vecinos-by-la-palmera-bogota',
    booking: '',
    hw: 'https://www.hostelworld.com/p/311331/vecinos-by-la-palmera/' },
  { slug: 'karuss-hostel-bogota',
    booking: '',
    hw: 'https://www.hostelworld.com/p/69727/karuss-hostel/' },
  { slug: 'hostal-r10-bogota',
    booking: 'https://www.booking.com/hotel/co/hostal-r10.html',
    hw: 'https://www.hostelworld.com/p/293853/hostal-r10/' }
];

function loaderTemplate(h) {
  var s = h.slug;
  return '// scripts/load-' + s + '-api.js\n'
+ '// Carga la pagina dinamica ' + s + '.html a traves de la API de admin\n'
+ '// de produccion (/api/admin-destinos), enviando el MISMO payload que\n'
+ '// genera admin.html para la categoria hostal.\n'
+ '//\n'
+ '// Uso:\n'
+ '//   node scripts/load-' + s + '-api.js [URL] [TOKEN]\n'
+ '//   URL por defecto: https://exploraco.vercel.app\n'
+ '//   TOKEN por defecto: exploraco12345 (ADMIN_SECRET de desarrollo)\n'
+ '\n'
+ "const { SLUG, HERO, PHOTOS, BASE, TAGS, FAQS } = require('./seed-" + s + ".js');\n"
+ '\n'
+ "const BASE_URL = process.argv[2] || 'https://exploraco.vercel.app';\n"
+ "const TOKEN    = process.argv[3] || process.env.ADMIN_SECRET || 'exploraco12345';\n"
+ '\n'
+ 'const BOOKING_URL = ' + JSON.stringify(h.booking) + ';\n'
+ 'const HW_URL      = ' + JSON.stringify(h.hw) + ';\n'
+ '\n'
+ 'function toPlacePayload() {\n'
+ '  var galeria = PHOTOS.slice(1).map(function(p, i) {\n'
+ '    return { url: p.url, caption: p.caption, orden: i + 1 };\n'
+ '  });\n'
+ '  return {\n'
+ '    slug:           BASE.slug,\n'
+ '    nombre:         BASE.nombre,\n'
+ '    categoria_slug: BASE.categoria_slug,\n'
+ '    lead:           BASE.lead,\n'
+ '    descripcion:    BASE.descripcion,\n'
+ '    highlight:      BASE.highlight,\n'
+ '    ciudad:         BASE.ciudad,\n'
+ '    region:         BASE.region,\n'
+ '    barrio:         BASE.barrio,\n'
+ '    lat:            BASE.lat,\n'
+ '    lng:            BASE.lng,\n'
+ '    whatsapp:       BASE.whatsapp,\n'
+ '    telefono:       BASE.telefono,\n'
+ '    email:          BASE.email,\n'
+ '    web:            BASE.web,\n'
+ '    instagram:      BASE.instagram,\n'
+ '    precio_desde:   BASE.precio_desde,\n'
+ '    horario:        BASE.horario,\n'
+ '    emoji:          BASE.emoji,\n'
+ '    hero_bg:        BASE.hero_bg,\n'
+ '    foto_hero:      HERO,\n'
+ '    fotos_galeria:  galeria,\n'
+ '    tipo:           BASE.tipo,\n'
+ '    capacidad:      BASE.capacidad,\n'
+ '    como_llegar:    BASE.como_llegar,\n'
+ '    status:         \'published\',\n'
+ '    destacado:      BASE.destacado !== undefined ? BASE.destacado : true,\n'
+ '    tags:           TAGS,\n'
+ '    faqs:           FAQS,\n'
+ '    // Campos top-level que admin-destinos escribe en destinos_detalles\n'
+ '    habitaciones:   TAGS.habitaciones || [],\n'
+ '    amenidades:     TAGS.amenidades || [],\n'
+ '    checkin:        TAGS.checkin || \'\',\n'
+ '    checkout:       TAGS.checkout || \'\',\n'
+ '    booking_url:    BOOKING_URL,\n'
+ '    hostelworld_url: HW_URL,\n'
+ '    airbnb_url:     \'\',\n'
+ '    scores:         {}\n'
+ '  };\n'
+ '}\n'
+ '\n'
+ '(async function main() {\n'
+ '  var payload = toPlacePayload();\n'
+ '\n'
+ '  var auth = { \'Content-Type\': \'application/json\', \'Authorization\': \'Bearer \' + TOKEN };\n'
+ '\n'
+ '  var list = await fetch(BASE_URL + \'/api/admin-destinos?limit=500&status=published\', { headers: auth });\n'
+ '  var listJson = await list.json();\n'
+ '  if (!listJson.ok) {\n'
+ '    console.error(\'ERROR listando: \' + JSON.stringify(listJson));\n'
+ '    process.exit(1);\n'
+ '  }\n'
+ '  var existing = (listJson.data || []).filter(function(d) { return d.slug === SLUG; });\n'
+ '\n'
+ '  if (existing.length) {\n'
+ '    var del = await fetch(BASE_URL + \'/api/admin-destinos?id=\' + existing[0].id, {\n'
+ '      method: \'DELETE\', headers: auth\n'
+ '    });\n'
+ '    var delJson = await del.json();\n'
+ '    if (!delJson.ok) {\n'
+ '      console.error(\'ERROR borrando previo: \' + JSON.stringify(delJson));\n'
+ '      process.exit(1);\n'
+ '    }\n'
+ '    console.log(\'Previo \' + SLUG + \' eliminado (para re-sembrar limpio)\');\n'
+ '  }\n'
+ '\n'
+ '  var res = await fetch(BASE_URL + \'/api/admin-destinos\', {\n'
+ '    method: \'POST\',\n'
+ '    headers: auth,\n'
+ '    body: JSON.stringify(payload)\n'
+ '  });\n'
+ '\n'
+ '  var json = await res.json();\n'
+ '  if (!res.ok) {\n'
+ '    console.error(\'ERROR \' + res.status + \': \' + JSON.stringify(json));\n'
+ '    process.exit(1);\n'
+ '  }\n'
+ '\n'
+ '  console.log(\'OK - destino \' + json.data.slug + \' (\' + json.data.id + \') status=\' + json.data.status);\n'
+ '  console.log(\'Habitaciones: \' + (TAGS.habitaciones || []).length + \' | Amenidades: \' + (TAGS.amenidades || []).length + \' | FAQs: \' + FAQS.length);\n'
+ '  console.log(\'Verifica: \' + BASE_URL + \'/\' + SLUG + \'.html\');\n'
+ '})().catch(function(err) {\n'
+ '  console.error(\'ERROR:\', err.message);\n'
+ '  process.exit(1);\n'
+ '});\n';
}

function smokeTemplate(s) {
  return "// scripts/smoke_test_" + s + ".js\n"
+ "// Smoke local: renderiza buildHTML() con el seed real y verifica las\n"
+ "// secciones propias de categoria hostal. No requiere base de datos.\n"
+ "\n"
+ "const seed = require('./seed-" + s + ".js');\n"
+ "global.require_orig = require;\n"
+ "const Module = require('module');\n"
+ "const path = require('path');\n"
+ "const origResolve = Module._resolveFilename;\n"
+ "Module._resolveFilename = function(request, ...args) {\n"
+ "  if (request === '@neondatabase/serverless') return path.join(__dirname, 'fake_neon.js');\n"
+ "  return origResolve.call(this, request, ...args);\n"
+ "};\n"
+ "require('fs').writeFileSync(path.join(__dirname, 'fake_neon.js'), 'module.exports = { neon: function(){ return function(){ return []; }; } };');\n"
+ "const fs = require('fs');\n"
+ "const vm = require('vm');\n"
+ "const src = fs.readFileSync(path.join(__dirname, '..', 'api', 'pagina-destino.js'), 'utf8');\n"
+ "const sandbox = { module: { exports: {} }, require, console, process };\n"
+ "sandbox.exports = sandbox.module.exports;\n"
+ "vm.createContext(sandbox);\n"
+ "const wrapped = src + '\\nmodule.exports.buildHTML = buildHTML;';\n"
+ "vm.runInContext(wrapped, sandbox, { filename: 'api/pagina-destino.js' });\n"
+ "const d = Object.assign({}, seed.BASE, { fotos: [{ url: seed.HERO }], tags: seed.TAGS, rating: 4.8, total_resenas: 3, creado_en: new Date(), actualizado_en: new Date() });\n"
+ "var det = { habitaciones: seed.TAGS.habitaciones || [], amenidades: seed.TAGS.amenidades || [], checkin: seed.TAGS.checkin || '', checkout: seed.TAGS.checkout || '', booking_url: '', hostelworld_url: '' };\n"
+ "const html = sandbox.module.exports.buildHTML(d, det, [], []);\n"
+ "function check(label, cond) { console.log((cond ? 'PASS' : 'FAIL') + ' - ' + label); if (!cond) process.exitCode = 1; }\n"
+ "function enc(s) { return String(s).replace(/[^\\x00-\\x7F]/g, function(c) { return '&#' + c.charCodeAt(0) + ';'; }); }\n"
+ "function inc(s) { return html.includes(enc(s)) || html.includes(s); }\n"
+ "check('renderiza sin error (len>8000)', typeof html === 'string' && html.length > 8000);\n"
+ "var hab0 = (seed.TAGS.habitaciones || [])[0];\n"
+ "check('Seccion habitaciones con primera habitacion', !!hab0 && html.includes('id=\"habitaciones\"') && inc(hab0.tipo));\n"
+ "check('Pill Check-in / Check-out', html.includes('Check-in:') && html.includes('Check-out:'));\n"
+ "check('Reglas de casa con tipo de alojamiento', html.includes('id=\"reglas-casa\"') && inc(seed.TAGS.tipo_alojamiento));\n"
+ "check('Politica de cancelacion presente', inc(String(seed.TAGS.politica_cancelacion).slice(0, 30)));\n"
+ "var act0 = (seed.TAGS.actividades || [])[0];\n"
+ "check('Seccion actividades con primera actividad', !!act0 && html.includes('id=\"actividades\"') && inc(act0.nombre));\n"
+ "var tr0 = (seed.TAGS.transporte || [])[0];\n"
+ "check('Como llegar con primer transporte', !!tr0 && html.includes('id=\"como-llegar\"') && inc(tr0.title));\n"
+ "var am0 = (seed.TAGS.amenidades || [])[0];\n"
+ "check('Amenidades en pills', !!am0 && inc(am0));\n"
+ "var barrioDesc = seed.TAGS.barrio_descripcion || '';\n"
+ "check('Barrio descripcion en Como llegar', !barrioDesc || inc(barrioDesc.slice(0, 40)));\n"
+ "if ((seed.TAGS.eventos_hostal || []).length) {\n"
+ "  check('Eventos del hostal renderizados', html.includes('id=\"eventos-hostal\"') && inc(seed.TAGS.eventos_hostal[0].titulo));\n"
+ "}\n"
+ "check('Latitud en mapa', html.includes(String(seed.BASE.lat)));\n"
+ "const opens = (html.match(/<div/g) || []).length;\n"
+ "const closes = (html.match(/<\\/div>/g) || []).length;\n"
+ "console.log('divs open=' + opens + ' close=' + closes + ' diff=' + (opens - closes));\n"
+ "check('balance de divs', opens === closes);\n";
}

var written = [];
for (var i = 0; i < HOSTELS.length; i++) {
  var h = HOSTELS[i];
  var loaderPath = path.join(__dirname, 'load-' + h.slug + '-api.js');
  var smokePath = path.join(__dirname, 'smoke_test_' + h.slug + '.js');
  fs.writeFileSync(loaderPath, loaderTemplate(h));
  fs.writeFileSync(smokePath, smokeTemplate(h.slug));
  written.push(loaderPath.replace(/^.*scripts[\\\/]/, ''), smokePath.replace(/^.*scripts[\\\/]/, ''));
}

console.log('Generados ' + written.length + ' archivos (' + HOSTELS.length + ' loaders + ' + HOSTELS.length + ' smokes):');
written.forEach(function(w) { console.log('  - ' + w); });
