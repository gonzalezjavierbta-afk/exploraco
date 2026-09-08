// scripts/extraer-hostalterraza.js
// Conector Hostal Terraza -> agenda ExploraCO. Lee los eventos publicados de
// la cartelera de https://hostalterraza.vercel.app (tabla Supabase `eventos`,
// RLS anon de lectura publica, misma key que usa el sitio), los normaliza al
// schema de eventos/eventos.json (slug con prefijo ht-) y los fusiona en el
// lote para subir con upload-eventos.js.
//
// Filtros por defecto: solo eventos PROXIMOS (fecha >= hoy), sin pruebas/demos
// y sin campanas (la binacional no tiene sede local). Coordenadas via
// Nominatim (cache por direccion; 1 req/s). Foto: HEAD 200 (BUG-022).
//
// Uso:
//   node scripts/extraer-hostalterraza.js [--dry] [--incluir-campanas]
//   --dry : previsualiza sin fusionar en eventos/eventos.json
//
// Salida: eventos/hostalterraza.json (lote normalizado) + fusion en
// eventos/eventos.json (reemplaza ht-* previos, conserva el resto).
// ASCII-safe (0 bytes >127).

const fs = require('fs');
const path = require('path');

const SB_URL = 'https://ctgyvydzshueemlelkzv.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN0Z3l2eWR6c2h1ZWVtbGVsa3p2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2NTc1NzAsImV4cCI6MjA4OTIzMzU3MH0.3pMA-VZLV2Kfyl6BD-x8v79P7UuXSfMgtIwnfoP_VuY';
const HOST = 'https://hostalterraza.vercel.app';
const UA = 'ExploraCO-hostalterraza-sync/1.0 (contact: info@exploraco.co)';

const FLAGS = process.argv.slice(2);
const dry = FLAGS.indexOf('--dry') !== -1;
const incluirCampanas = FLAGS.indexOf('--incluir-campanas') !== -1;

const OUT_LOTE = path.join(__dirname, '..', 'eventos', 'hostalterraza.json');
const OUT_LOTE_GLOBAL = path.join(__dirname, '..', 'eventos', 'eventos.json');

const TIPO_MAP = {
  fiesta: 'musica',
  cine: 'cultura',
  cinematografia: 'cultura',
  campana: 'cultura'
};
const EMOJI_MAP = {
  fiesta: '\ud83c\udf89',
  cine: '\ud83c\udfac',
  cinematografia: '\ud83c\udfac',
  campana: '\ud83e\udd1d'
};

function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

function sanitizeSlug(s) {
  return String(s || '').toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function parseISO(s) {
  if (!s || typeof s !== 'string') return null;
  var m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  var y = +m[1], mo = +m[2], d = +m[3];
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return new Date(y, mo - 1, d);
}

function formatHora(h) {
  if (!h) return '';
  var m = String(h).trim().match(/^(\d{1,2}):(\d{2})/);
  if (!m) return '';
  var hh = +m[1];
  var ap = hh >= 12 ? 'p.m.' : 'a.m.';
  hh = hh % 12 || 12;
  return hh + ':' + m[2] + ' ' + ap;
}

function firstSentence(s, max) {
  var t = String(s || '').trim();
  if (!t) return '';
  var parts = t.split(/(?<=[.!?])\s+/);
  var out = parts[0] || t;
  if (out.length > (max || 180)) out = out.slice(0, (max || 180) - 3) + '...';
  return out;
}

async function fetchEventos() {
  var url = SB_URL + '/rest/v1/eventos?select=slug,nombre,fecha,hora,ubicacion,categoria_slug,descripcion,imagen_url,color_primario,config_landing,organizaciones(nombre)&limit=200';
  var r = await fetch(url, { headers: { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY } });
  if (!r.ok) throw new Error('Supabase status ' + r.status);
  var j = await r.json();
  return Array.isArray(j) ? j : [];
}

const geoCache = {};
function streetFragment(addr) {
  var s = String(addr || '').trim();
  var m = s.search(/calle|carrera|av\.?[a-z]*|avenida|transversal|diagonal|via|cra|cl\b|kv/i);
  if (m > 0) s = s.slice(m);
  return s;
}
function streetNumber(frag) {
  var m = String(frag || '').match(/(calle|carrera|transversal|diagonal|avenida|av\.?)\s+[^\d#]*\d+[a-zA-Z]*\s*[#\-]\s*\d+/i);
  return m ? m[0] : '';
}
function enBogota(lat, lng) {
  return lat >= 4.45 && lat <= 4.85 && lng >= -74.30 && lng <= -73.90;
}
async function geocode(ubicacion) {
  var q = String(ubicacion || '').trim();
  if (!q) return null;
  if (geoCache[q]) return geoCache[q];
  var fragment = streetFragment(q);
  var queries = [];
  var sn = streetNumber(fragment);
  if (sn) queries.push(sn + ', Bogota, Colombia');
  if (fragment && queries.indexOf(fragment + ', Bogota, Colombia') === -1) queries.push(fragment + ', Bogota, Colombia');
  if (q !== fragment && queries.indexOf(q + ', Bogota, Colombia') === -1) queries.push(q + ', Bogota, Colombia');
  var out = null;
  for (var i = 0; i < queries.length; i++) {
    var url = 'https://nominatim.openstreetmap.org/search?q=' + encodeURIComponent(queries[i]) + '&format=json&limit=1';
    try {
      var r = await fetch(url, { headers: { 'User-Agent': UA } });
      var j = await r.json();
      if (Array.isArray(j) && j.length && j[0].lat && j[0].lon) {
        var cand = { lat: parseFloat(j[0].lat), lng: parseFloat(j[0].lon) };
        if (enBogota(cand.lat, cand.lng)) { out = cand; break; }
      }
    } catch (_) { /* siguiente variante */ }
    await sleep(1100);
  }
  geoCache[q] = out;
  return out;
}

async function headOk(url) {
  try { return (await fetch(url, { method: 'HEAD', headers: { 'User-Agent': UA } })).ok; }
  catch (_) { return false; }
}

function contentOf(e) {
  return (e.config_landing && e.config_landing.content) || {};
}

function mapLineup(content) {
  var list = Array.isArray(content.dj_lineup) ? content.dj_lineup : [];
  return list.slice(0, 10).map(function (d) {
    return { nombre: d.nombre || '', rol: d.rol || 'DJ', genero: '' };
  }).filter(function (l) { return l.nombre; });
}

function mapEntradas(content) {
  var b = content.boletos;
  if (!b || typeof b !== 'object') return [];
  var out = [];
  if (b.preventa) out.push({ tipo: 'Preventa', precio: b.preventa, disponibilidad: 'Disponible' });
  if (b.taquilla) out.push({ tipo: 'Taquilla', precio: b.taquilla, disponibilidad: 'Disponible' });
  return out;
}

function mapFaqs(content) {
  var list = Array.isArray(content.faq) ? content.faq : [];
  return list.slice(0, 5).map(function (f) {
    return { pregunta: f.q || '', respuesta: f.a || '' };
  }).filter(function (f) { return f.pregunta; });
}

async function resolveFoto(e, content) {
  var cands = [content.poster_url, e.imagen_url];
  for (var i = 0; i < cands.length; i++) {
    var u = cands[i];
    if (!u || typeof u !== 'string') continue;
    if (/gstatic|encrypted-tbn/.test(u)) continue;
    if (await headOk(u)) return u;
  }
  return '';
}

function mapEvento(e, geo) {
  var content = contentOf(e);
  var org = (e.organizaciones && e.organizaciones.nombre) || '';
  var venue = content.ubicacion || e.ubicacion || '';
  var fecha = parseISO(e.fecha);
  var hora = formatHora(e.hora);
  var cat = e.categoria_slug || '';
  var nombre = e.nombre || '';
  var descBase = String(e.descripcion || '').trim();
  var desc = descBase;
  if (content.guest_list && !descBase) desc = content.guest_list;
  if (content.playlist_url) desc = (desc ? desc + '\n\n' : '') + 'Playlist oficial: ' + content.playlist_url;

  return {
    slug: 'ht-' + sanitizeSlug(e.slug),
    nombre: nombre,
    lead: firstSentence(descBase || (org ? org + ' presenta una noche en ' + venue : 'Noche especial en ' + venue), 160),
    descripcion: desc || (nombre + ' en ' + venue),
    ciudad: 'Bogota',
    region: 'Cundinamarca',
    barrio: '',
    lat: geo.lat,
    lng: geo.lng,
    web: HOST + '/evento.html?slug=' + encodeURIComponent(e.slug),
    instagram: '',
    precio_desde: (content.boletos && content.boletos.preventa) ? 'Desde ' + content.boletos.preventa : 'Consultar',
    horario: hora || 'Consultar',
    emoji: EMOJI_MAP[cat] || '\ud83c\udfa0',
    hero_bg: e.color_primario ? 'linear-gradient(135deg,' + e.color_primario + ' 0%,#0B0A09 100%)' : 'linear-gradient(135deg,#1a051a,#3a1a3a)',
    foto_hero: '', // se resuelve debajo
    fotos_galeria: [],
    faqs: mapFaqs(content),
    destacado: false,
    tags: {
      fecha_inicio: e.fecha,
      fecha_fin: e.fecha,
      edicion: '',
      sede: venue,
      organiza: org || 'Hostal Terraza',
      lema: '',
      tipo_evento: TIPO_MAP[cat] || 'festival',
      lineup: mapLineup(content),
      agenda: fecha ? [{ dia: e.fecha, hora: hora || 'Consultar', actividad: nombre }] : [],
      categorias_entrada: mapEntradas(content),
      que_llevar: [],
      prohibido: []
    }
  };
}

function isTest(nombre, slug) {
  return /prueba|test|demo|ejemplo/i.test((nombre || '') + ' ' + (slug || ''));
}

async function main() {
  var raw = await fetchEventos();
  var hoy = new Date(); hoy.setHours(0, 0, 0, 0);

  var candidatos = raw.filter(function (e) {
    if (!e.slug) return false;
    if (isTest(e.nombre, e.slug)) return false;
    if (!incluirCampanas && e.categoria_slug === 'campana') return false;
    var f = parseISO(e.fecha);
    if (!f) return false;
    return f.getTime() >= hoy.getTime();
  });

  var lote = [];
  for (var i = 0; i < candidatos.length; i++) {
    var e = candidatos[i];
    var geo = await geocode(e.ubicacion || (e.config_landing && e.config_landing.content && e.config_landing.content.ubicacion));
    if (!geo) { console.log('[SKIP] ' + e.slug + ' -> sin coordenadas'); continue; }
    var ev = mapEvento(e, geo);
    ev.foto_hero = await resolveFoto(e, contentOf(e));
    lote.push(ev);
    console.log('[OK] ' + ev.slug + ' | ' + ev.nombre + ' | ' + ev.tags.fecha_inicio + ' | ' + ev.tags.tipo_evento + ' | foto=' + (ev.foto_hero ? 'si' : 'no'));
  }

  lote.sort(function (a, b) { return a.tags.fecha_inicio < b.tags.fecha_inicio ? -1 : 1; });
  fs.mkdirSync(path.dirname(OUT_LOTE), { recursive: true });
  fs.writeFileSync(OUT_LOTE, JSON.stringify(lote, null, 2) + '\n', 'utf8');
  console.log('[lote] ' + lote.length + ' evento(s) -> ' + OUT_LOTE);

  if (dry) {
    console.log('[dry] no se fusiona en eventos/eventos.json');
    return;
  }

  var global = [];
  try { global = JSON.parse(fs.readFileSync(OUT_LOTE_GLOBAL, 'utf8')); } catch (_) { global = []; }
  var otros = global.filter(function (ev) { return String(ev.slug || '').indexOf('ht-') !== 0; });
  var fusion = otros.concat(lote);
  fs.writeFileSync(OUT_LOTE_GLOBAL, JSON.stringify(fusion, null, 2) + '\n', 'utf8');
  console.log('[fusion] ' + lote.length + ' ht-* en eventos/eventos.json (total ' + fusion.length + ')');
}

main().catch(function (err) { console.error('ERROR:', err.message); process.exitCode = 1; });