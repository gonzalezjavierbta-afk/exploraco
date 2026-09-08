// scripts/resolver-fotos-eventos.js
// FASE B del skill ingest-eventos: resuelve las `fotos_sugeridas` de
// eventos/eventos.json a URLs reales de Wikimedia Commons (thumb 960px,
// HEAD 200, BUG-022) y las escribe en `foto_hero` / `fotos_galeria`.
//
// Estrategia por evento:
//   1. Probar cada `nombres_archivo_wikimedia` (File:...) -> thumb 960px.
//   2. Si falla, buscar por `tema` en Commons.
//   3. Si el evento aun no tiene fotos, buscar por RECINTO (tags.sede,
//      parte antes de la coma) y tomar hasta 5 candidatos verificados.
// Al final elimina `fotos_sugeridas` y guarda el JSON listo para re-subir.
//
// Uso:
//   node scripts/resolver-fotos-eventos.js [archivo.json]
//
// ASCII-safe (0 bytes >127).

const fs = require('fs');
const path = require('path');

const FILE = process.argv[2] || path.join(__dirname, '..', 'eventos', 'eventos.json');
const UA = 'ExploraCO-batch/1.0 (contact: info@exploraco.co)';

function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

async function getJson(url) {
  for (var t = 0; t < 3; t++) {
    try {
      var r = await fetch(url, { headers: { 'User-Agent': UA } });
      var txt = await r.text();
      return JSON.parse(txt);
    } catch (_) { await sleep(1500); }
  }
  return null;
}

async function commonsImageInfo(title) {
  var j = await getJson('https://commons.wikimedia.org/w/api.php?action=query&titles='
    + encodeURIComponent(title) + '&prop=imageinfo&iiprop=url|size&iiurlwidth=960&format=json&origin=*');
  if (!j) return null;
  var pages = (j.query && j.query.pages) ? Object.values(j.query.pages) : [];
  var p = pages[0];
  if (!p || p.missing) return null;
  var ii = p.imageinfo && p.imageinfo[0];
  return ii && ii.thumburl ? ii.thumburl : null;
}

async function searchCandidates(q) {
  var j = await getJson('https://commons.wikimedia.org/w/api.php?action=query&generator=search'
    + '&gsrsearch=' + encodeURIComponent(q) + '&gsrnamespace=6&gsrlimit=8'
    + '&prop=imageinfo&iiprop=url|size&iiurlwidth=960&format=json&origin=*');
  if (!j) return [];
  var pages = (j.query && j.query.pages) ? Object.values(j.query.pages) : [];
  var out = [];
  pages.forEach(function (p) {
    var ii = p.imageinfo && p.imageinfo[0];
    if (ii && ii.thumburl) {
      var t = String(p.title || '').toLowerCase();
      if (/\.(jpg|jpeg)$/.test(t)) out.push({ title: p.title, url: ii.thumburl });
    }
  });
  return out;
}

async function headOk(url) {
  try { return (await fetch(url, { method: 'HEAD', headers: { 'User-Agent': UA } })).ok; }
  catch (_) { return false; }
}

async function resolveByNames(names) {
  for (var i = 0; i < names.length; i++) {
    var tu = await commonsImageInfo(names[i]);
    if (tu && await headOk(tu)) return tu;
  }
  return null;
}

async function resolveByTema(tema) {
  if (!tema) return null;
  var cands = await searchCandidates(tema);
  for (var i = 0; i < cands.length; i++) {
    if (await headOk(cands[i].url)) return cands[i].url;
  }
  return null;
}

async function resolveByVenue(sede) {
  var q = String(sede || '').split(',')[0].trim();
  if (!q) return null;
  var cands = await searchCandidates(q);
  var ok = [];
  for (var i = 0; i < cands.length && ok.length < 5; i++) {
    if (await headOk(cands[i].url)) ok.push(cands[i].url);
  }
  return ok.length ? ok : null;
}

(async function main() {
  var raw;
  try { raw = JSON.parse(fs.readFileSync(FILE, 'utf8')); }
  catch (e) { console.error('ERROR leyendo ' + FILE + ': ' + e.message); process.exitCode = 1; return; }

  var totalFotos = 0;
  var totalOk = 0;

  for (var e = 0; e < raw.length; e++) {
    var ev = raw[e];
    var sug = Array.isArray(ev.fotos_sugeridas) ? ev.fotos_sugeridas : [];

    if (ev.foto_hero && ev.fotos_galeria && ev.fotos_galeria.length) {
      console.log('[OK ya] ' + ev.slug);
      continue;
    }

    var heroUrl = '';
    var galeria = [];
    var via = '';

    // 1) Nombres sugeridos / tema
    for (var f = 0; f < sug.length; f++) {
      totalFotos++;
      var foto = sug[f];
      var tu = await resolveByNames(foto.nombres_archivo_wikimedia || []);
      if (!tu && foto.tema) tu = await resolveByTema(foto.tema);
      if (!tu) { console.log('[SKIP] ' + ev.slug + ' #' + f + ' (' + (foto.tema || 'sin tema') + ')'); continue; }
      totalOk++;
      if (foto.es_hero) { heroUrl = tu; via = 'sugerida'; }
      else galeria.push({ url: tu, caption: foto.caption || '', orden: galeria.length });
    }

    // 2) Fallback por recinto si no quedo hero
    if (!heroUrl && ev.tags && ev.tags.sede) {
      var okUrls = await resolveByVenue(ev.tags.sede);
      if (okUrls) {
        heroUrl = okUrls[0];
        via = 'recinto';
        for (var g = 1; g < okUrls.length; g++) {
          galeria.push({ url: okUrls[g], caption: ev.nombre || '', orden: galeria.length });
        }
        totalOk += Math.min(okUrls.length, 5);
        console.log('[RECINTO] ' + ev.slug + ' <- ' + String(ev.tags.sede).split(',')[0] + ' (' + okUrls.length + ')');
      } else {
        console.log('[SIN FOTO] ' + ev.slug);
      }
    }

    ev.foto_hero = heroUrl;
    ev.fotos_galeria = galeria.slice(0, 4);
    delete ev.fotos_sugeridas;
    if (heroUrl) console.log('[HERO] ' + ev.slug + ' via=' + via + ' galeria=' + galeria.length);
  }

  fs.writeFileSync(FILE, JSON.stringify(raw, null, 2) + '\n', 'utf8');
  console.log('\nRESULTADO: ' + totalOk + ' fotos resueltas en ' + FILE);
})().catch(function (err) { console.error('ERROR:', err.message); process.exitCode = 1; });