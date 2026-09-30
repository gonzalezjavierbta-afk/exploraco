// scripts/smoke_media_embed.js
// Smoke test del modulo compartido media-embed.js (ExploraCO).
// Carga el modulo en un contexto vm con un `window` simulado y valida:
//   1) Spotify track: URL web, URL con locale intl-xx, dominio .us y URI spotify:
//      mismo id de 22 chars -> mismo embed.
//   2) Rechazos: episode, album, playlist, show, id corto, id largo,
//      host malicioso, URL de Spotify embebida como parametro de otra URL.
//   3) Regresion: YouTube (watch y youtu.be) y Vimeo siguen igual que las
//      3 funciones duplicadas que se reemplazaron.
//   4) kind() e isDirectMedia() para directos, .jpg y entradas vacias.
//   5) spotifyOembedUrl(): URL de oEmbed lista para fetch del navegador.
//   6) Idempotencia: cargar el archivo dos veces no rompe.
//   7) spotifyEmbedIframe(): allow="encrypted-media" y loading="lazy" presentes.
//   8) Carga diferida sin `window.ExploraMediaEmbed` -> null, sin excepcion.
// Exit 0 = todo OK. Sin dependencias npm.

"use strict";
var fs = require("fs");
var path = require("path");
var vm = require("vm");

var MOD_PATH = path.join(__dirname, "..", "media-embed.js");
var SRC = fs.readFileSync(MOD_PATH, "utf8");

var fails = 0;
var total = 0;
function check(label, cond, detail) {
  total++;
  console.log((cond ? "PASS" : "FAIL") + " - " + label + (detail ? " | " + detail : ""));
  if (!cond) fails++;
}

/* ID de Spotify real: 22 chars base62. */
var TID = "4cOdK2wGLETKBW3PvgPWqT";
var EMBED_TID = "https://open.spotify.com/embed/track/" + TID;

/* Carga el modulo en un sandbox con window simulado. */
function load(times) {
  var win = {};
  var sandbox = { window: win, document: undefined, console: console, encodeURIComponent: encodeURIComponent };
  sandbox.self = win;
  vm.createContext(sandbox);
  for (var i = 0; i < (times || 1); i++) {
    vm.runInContext(SRC, sandbox, { filename: "media-embed.js" });
  }
  return win.ExploraMediaEmbed;
}

var M = load(1);
check("modulo publica window.ExploraMediaEmbed", !!M);
check("node --check / vm: carga sin excepcion", true);

/* ------------------------------------------------------------------ */
console.log("\n=== 1) SPOTIFY track: 4 formatos de entrada -> mismo embed ===");
var entradas = [
  ["web simple",        "https://open.spotify.com/track/" + TID],
  ["web con query",     "https://open.spotify.com/track/" + TID + "?si=8f3a2b1c4d5e6f70"],
  ["web con locale",    "https://open.spotify.com/intl-es/track/" + TID],
  ["web otro locale",   "https://open.spotify.com/intl-pt/track/" + TID],
  ["dominio .us",       "https://open.spotify.us/track/" + TID],
  ["http (no https)",   "http://open.spotify.com/track/" + TID],
  ["MAYUSCULAS",        "HTTPS://OPEN.SPOTIFY.COM/TRACK/" + TID],
  ["URI spotify:",      "spotify:track:" + TID]
];
entradas.forEach(function (c) {
  check("spotifyTrackId [" + c[0] + "]", M.spotifyTrackId(c[1]) === TID, M.spotifyTrackId(c[1]));
  check("embedUrl [" + c[0] + "]", M.embedUrl(c[1]) === EMBED_TID, M.embedUrl(c[1]));
  check("kind == spotify [" + c[0] + "]", M.kind(c[1]) === "spotify", M.kind(c[1]));
});

/* ------------------------------------------------------------------ */
console.log("\n=== 2) SPOTIFY: rechazos obligatorios ===");
var rechazos = [
  ["episode",        "https://open.spotify.com/episode/4cOdK2wGLETKBW3PvgPWqT"],
  ["album",          "https://open.spotify.com/album/4cOdK2wGLETKBW3PvgPWqT"],
  ["playlist",       "https://open.spotify.com/playlist/4cOdK2wGLETKBW3PvgPWqT"],
  ["show",           "https://open.spotify.com/show/4cOdK2wGLETKBW3PvgPWqT"],
  ["id 10 chars",    "https://open.spotify.com/track/4cOdK2wGLE"],
  ["id 21 chars",    "https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWq"],
  ["id 23 chars",    "https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqTa"],
  ["id con guion",   "https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPW-T"],
  ["host malicioso", "https://open.spotify.com.evil.com/track/" + TID],
  ["URL anidada",    "https://evil.com/?u=https://open.spotify.com/track/" + TID],
  ["sin esquema",    "open.spotify.com/track/" + TID],
  ["otro host",      "https://spotify.com/track/" + TID],
  ["URI album",      "spotify:album:" + TID],
  ["URI episode",    "spotify:episode:" + TID]
];
rechazos.forEach(function (c) {
  check("spotifyTrackId rechaza [" + c[0] + "]", M.spotifyTrackId(c[1]) === null, String(M.spotifyTrackId(c[1])));
  check("embedUrl rechaza [" + c[0] + "]", M.embedUrl(c[1]) === null, String(M.embedUrl(c[1])));
  check("spotifyOembedUrl rechaza [" + c[0] + "]", M.spotifyOembedUrl(c[1]) === null);
});

/* ------------------------------------------------------------------ */
console.log("\n=== 3) REGRESION: YouTube y Vimeo (sin cambios) ===");
var ytWatch = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
var ytShort = "https://youtu.be/dQw4w9WgXcQ";
check("youtube watch -> embed",  M.embedUrl(ytWatch) === "https://www.youtube.com/embed/dQw4w9WgXcQ", M.embedUrl(ytWatch));
check("youtube watch kind",      M.kind(ytWatch) === "youtube", M.kind(ytWatch));
check("youtu.be -> embed",        M.embedUrl(ytShort) === "https://www.youtube.com/embed/dQw4w9WgXcQ", M.embedUrl(ytShort));
check("youtu.be kind",            M.kind(ytShort) === "youtube", M.kind(ytShort));
check("youtubeId watch",          M.youtubeId(ytWatch) === "dQw4w9WgXcQ", M.youtubeId(ytWatch));
check("youtubeId youtu.be",       M.youtubeId(ytShort) === "dQw4w9WgXcQ", M.youtubeId(ytShort));
check("vimeo -> embed",           M.embedUrl("https://vimeo.com/123456789") === "https://player.vimeo.com/video/123456789", M.embedUrl("https://vimeo.com/123456789"));
check("vimeo kind",               M.kind("https://vimeo.com/123456789") === "vimeo", M.kind("https://vimeo.com/123456789"));
check("vimeoId",                  M.vimeoId("https://vimeo.com/123456789") === "123456789", M.vimeoId("https://vimeo.com/123456789"));
check("youtube con query extra",  M.embedUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=30s") === "https://www.youtube.com/embed/dQw4w9WgXcQ", M.embedUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=30s"));

/* ------------------------------------------------------------------ */
console.log("\n=== 4) kind() / isDirectMedia() para media directa ===");
var directos = [
  ["https://e.com/audio.mp3", true],
  ["https://e.com/cancion.m4a", true],
  ["https://e.com/x.aac", true],
  ["https://e.com/x.wav", true],
  ["https://e.com/x.ogg", true],
  ["https://e.com/x.opus", true],
  ["https://e.com/x.mp4", true],
  ["https://e.com/x.webm", true],
  ["https://e.com/x.mov", true],
  ["https://e.com/x.m4v", true],
  ["https://e.com/x.MP3", true],
  ["https://e.com/x.mp3?token=abc", true],
  ["https://e.com/foto.jpg", false],
  ["https://e.com/foto.png", false],
  ["https://e.com/pagina.html", false],
  ["https://e.com/embed/track/abc", false]
];
directos.forEach(function (c) {
  check("isDirectMedia " + c[0], M.isDirectMedia(c[0]) === c[1], String(M.isDirectMedia(c[0])));
});
check("kind .mp3 == directo", M.kind("https://e.com/audio.mp3") === "directo", M.kind("https://e.com/audio.mp3"));
check("kind .jpg == null",    M.kind("https://e.com/foto.jpg") === null, String(M.kind("https://e.com/foto.jpg")));

/* ------------------------------------------------------------------ */
console.log("\n=== 5) Entradas vacias / invalidas: null sin excepcion ===");
var vacios = ["", "   ", null, undefined, 0, 123, {}, [], true, NaN];
vacios.forEach(function (v) {
  var ok = true;
  try {
    if (M.embedUrl(v) !== null) ok = false;
    if (M.kind(v) !== null) ok = false;
    if (M.youtubeId(v) !== null) ok = false;
    if (M.vimeoId(v) !== null) ok = false;
    if (M.spotifyTrackId(v) !== null) ok = false;
    if (M.spotifyOembedUrl(v) !== null) ok = false;
    if (M.isDirectMedia(v) !== false) ok = false;
    if (M.spotifyEmbedIframe(v) !== null) ok = false;
  } catch (e) {
    ok = false;
    console.log("    excepcion con " + JSON.stringify(v) + ": " + e.message);
  }
  check("entrada invalida " + JSON.stringify(v) + " -> null sin lanzar", ok);
});

/* ------------------------------------------------------------------ */
console.log("\n=== 6) spotifyOembedUrl(): URL lista para fetch del navegador ===");
var oe = M.spotifyOembedUrl("https://open.spotify.com/track/" + TID);
var esperado = "https://open.spotify.com/oembed?url=https%3A%2F%2Fopen.spotify.com%2Ftrack%2F" + TID;
check("oembed URL exacta", oe === esperado, oe);
check("oembed no hace fetch (string puro)", typeof oe === "string");
check("oembed acepta URI spotify:", M.spotifyOembedUrl("spotify:track:" + TID) === esperado);
check("oembed normaliza locale a .com", M.spotifyOembedUrl("https://open.spotify.com/intl-es/track/" + TID) === esperado);

/* ------------------------------------------------------------------ */
console.log("\n=== 7) Constantes de altura e iframe de Spotify ===");
check("ALTURA_SPOTIFY_COMPACTA == 152", M.ALTURA_SPOTIFY_COMPACTA === 152, String(M.ALTURA_SPOTIFY_COMPACTA));
check("ALTURA_SPOTIFY_ANCHA == 232", M.ALTURA_SPOTIFY_ANCHA === 232, String(M.ALTURA_SPOTIFY_ANCHA));
var ifrC = M.spotifyEmbedIframe("https://open.spotify.com/track/" + TID);
var ifrA = M.spotifyEmbedIframe("https://open.spotify.com/track/" + TID, M.ALTURA_SPOTIFY_ANCHA);
check("iframe usa embed/track/<ID>", ifrC.indexOf(EMBED_TID) >= 0, ifrC);
check("iframe allow=encrypted-media", ifrC.indexOf('allow="encrypted-media"') >= 0);
check("iframe loading=lazy", ifrC.indexOf('loading="lazy"') >= 0);
check("iframe compacto height 152", ifrC.indexOf('height="152"') >= 0, ifrC);
check("iframe ancho height 232", ifrA.indexOf('height="232"') >= 0);
check("iframe con clase opcional", M.spotifyEmbedIframe("https://open.spotify.com/track/" + TID, 152, "md-lb-media").indexOf('class="md-lb-media"') >= 0);
check("clase maliciosa sanitizada (fuera)", M.spotifyEmbedIframe("https://open.spotify.com/track/" + TID, 152, 'a" onload="x').indexOf("onload") < 0);
check("embedUrl de spotify apunta a /embed/track/", M.embedUrl("https://open.spotify.com/track/" + TID) === EMBED_TID, M.embedUrl("https://open.spotify.com/track/" + TID));

/* ------------------------------------------------------------------ */
console.log("\n=== 8) Idempotencia: cargar media-embed.js dos veces ===");
var M2 = load(2);
check("segunda carga no rompe", !!M2);
check("segunda carga conserva spotifyTrackId", M2.spotifyTrackId("https://open.spotify.com/track/" + TID) === TID);
check("segunda carga conserva embedUrl yt", M2.embedUrl(ytWatch) === "https://www.youtube.com/embed/dQw4w9WgXcQ");
check("API expuesta es la misma forma", typeof M2.kind === "function" && typeof M2.isDirectMedia === "function");

/* ------------------------------------------------------------------ */
console.log("\n=== 9) Sin el modulo cargado: los consumidores degradan a null ===");
var winVacio = {};
var sb2 = { window: winVacio, console: console, encodeURIComponent: encodeURIComponent };
vm.createContext(sb2);
vm.runInContext("function w(url){ if (!window.ExploraMediaEmbed) { return null; } return window.ExploraMediaEmbed.embedUrl(url); }", sb2);
var res = vm.runInContext("w('https://www.youtube.com/watch?v=dQw4w9WgXcQ')", sb2);
check("wrapper sin modulo -> null (no rompe)", res === null, String(res));

/* ------------------------------------------------------------------ */
console.log("\n=== 10) ASCII-safety del modulo (ADR-002) ===");
var raw = fs.readFileSync(MOD_PATH);
var bad = 0;
for (var i = 0; i < raw.length; i++) { if (raw[i] > 127) bad++; }
check("media-embed.js 0 bytes > 127", bad === 0, "bytes>127=" + bad);

/* ------------------------------------------------------------------ */
console.log("\n=== 11) HARDENING del parametro `alto`: sink de inyeccion de atributos ===");
/* `alto` se interpola CRUDO en height="..." y en style="...height:Npx" de un
   <iframe>. El modulo esta en `window` como asset compartido, asi que un valor
   derivado de datos seria XSS. Se valida con parseInt + isFinite + rango. */
var inyecciones = [
  ['1" onload="alert(1)', 152],
  ['100;}</style><script>alert(1)</script>', 100]
];
inyecciones.forEach(function (c) {
  var out = M.spotifyEmbedIframe("https://open.spotify.com/track/" + TID, c[0]);
  var h = /height="([0-9]+)"/.exec(out);
  var st = /height:([0-9]+)px/.exec(out);
  check("alto [" + c[0] + "] no inyecta <script>", !/<script/i.test(out), out);
  check("alto [" + c[0] + "] no inyecta atributo on*= handler", !/\son[a-z]+\s*=\s*"/i.test(out), out);
  check("alto [" + c[0] + "] height entero limpio", !!h && h[1] === String(c[1]), out);
  check("alto [" + c[0] + "] style height == atributo height", !!st && !!h && st[1] === h[1], out);
});
var fueraDeRango = [0, -5, 99999, "abc", null, undefined, NaN, 39, 801, "152px", "0x100"];
fueraDeRango.forEach(function (a) {
  var out = M.spotifyEmbedIframe("https://open.spotify.com/track/" + TID, a);
  var h = /height="([0-9]+)"/.exec(out);
  var st = /height:([0-9]+)px/.exec(out);
  check("alto fuera de rango " + JSON.stringify(a) + " -> 152",
    !!h && h[1] === "152" && !!st && st[1] === "152", out);
});
check("alto legitimo 152 se respeta", /height="152"/.test(M.spotifyEmbedIframe("https://open.spotify.com/track/" + TID, 152)));
check("alto legitimo 232 se respeta", /height="232"/.test(M.spotifyEmbedIframe("https://open.spotify.com/track/" + TID, 232)));
check("alto legitimo string '152' se respeta", /height="152"/.test(M.spotifyEmbedIframe("https://open.spotify.com/track/" + TID, "152")));
check("clase sigue sanitizada [A-Za-z0-9 _-] (no se afloja)", M.spotifyEmbedIframe("https://open.spotify.com/track/" + TID, 152, "ok_cls-1 2").indexOf('class="ok_cls-1 2"') >= 0);
check("clase con parentesis sigue rechazada", M.spotifyEmbedIframe("https://open.spotify.com/track/" + TID, 152, "a(){}").indexOf("class=") < 0);

/* ------------------------------------------------------------------ */
console.log("\n=== 12) mediaDe(): criterio UNICO de alias de la miniatura ===");
var miniatura = M.mediaDe({ media_url: "https://e.com/x.mp4", media_type: "video", miniatura_url: "https://e.com/m.jpg" });
check("mediaDe lee miniatura_url (alias crudo del backend)", miniatura.miniatura === "https://e.com/m.jpg", miniatura.miniatura);
check("mediaDe lee media_miniatura (alias de multimedia_mapa)",
  M.mediaDe({ media_url: "https://e.com/x.mp4", media_type: "video", media_miniatura: "https://e.com/m2.jpg" }).miniatura === "https://e.com/m2.jpg");
check("mediaDe prioriza miniatura_url sobre media_miniatura",
  M.mediaDe({ miniatura_url: "a.jpg", media_miniatura: "b.jpg" }).miniatura === "a.jpg");
check("mediaDe acepta objeto con foto_url/foto_type",
  M.mediaDe({ foto_url: "https://e.com/x.mp3", foto_type: "audio" }).url === "https://e.com/x.mp3");
check("mediaDe normaliza media_type a minusculas", M.mediaDe({ media_type: "VIDEO" }).tipo === "video");
check("mediaDe deriva tipo audio de extension cuando no viene",
  M.mediaDe({ media_url: "https://e.com/a.mp3" }).tipo === "audio");
check("mediaDe deriva tipo video de extension cuando no viene",
  M.mediaDe({ media_url: "https://e.com/a.mp4" }).tipo === "video");
check("mediaDe default foto cuando no hay tipo", M.mediaDe({ media_url: "https://e.com/a.jpg" }).tipo === "foto");
check("mediaDe NO lee media_poster ni poster_url (alias que el backend nunca emite)",
  M.mediaDe({ media_poster: "x.jpg", poster_url: "y.jpg" }).miniatura === "");
check("caratula vacia si la miniatura es un medio .mp3 (nunca un <img> a medio)",
  M.mediaDe({ media_type: "audio", miniatura_url: "https://e.com/x.mp3" }).caratula === "");
check("caratula vacia si la miniatura es un medio .mp4",
  M.mediaDe({ media_type: "video", miniatura_url: "https://e.com/x.mp4" }).caratula === "");
check("caratula vacia si la miniatura es una URL de Spotify",
  M.mediaDe({ media_type: "audio", miniatura_url: "https://open.spotify.com/track/" + TID }).caratula === "");
check("caratula = miniatura cuando la URL es una imagen real",
  M.mediaDe({ media_type: "video", miniatura_url: "https://e.com/m.jpg" }).caratula === "https://e.com/m.jpg");
check("mediaDe reporta kind spotify", M.mediaDe({ media_url: "https://open.spotify.com/track/" + TID }).kind === "spotify");
check("mediaDe marca esMedio", M.mediaDe({ media_url: "https://e.com/x.mp4" }).esMedio === true);
var degenerados = [null, undefined, {}, "", 0, [], "texto", { media_url: null }, { media_url: undefined }, { media_url: {} }];
degenerados.forEach(function (v) {
  var ok = true;
  try {
    var d = M.mediaDe(v);
    if (typeof d.url !== "string" || typeof d.tipo !== "string") ok = false;
    if (typeof d.miniatura !== "string" || typeof d.caratula !== "string") ok = false;
    if (d.caratula !== "") ok = false;
  } catch (e) { ok = false; console.log("    excepcion con " + JSON.stringify(v) + ": " + e.message); }
  check("mediaDe degenerado " + JSON.stringify(v) + " -> strings vacios sin lanzar", ok);
});

/* ------------------------------------------------------------------ */
console.log("\n=== 13) Idempotencia de mediaDe tras la 2a carga ===");
check("2a carga conserva mediaDe", typeof M2.mediaDe === "function");
check("2a carga: mediaDe normaliza igual", M2.mediaDe({ media_url: "https://e.com/x.mp4", miniatura_url: "https://e.com/m.jpg" }).caratula === "https://e.com/m.jpg");

console.log("\n=== " + (total - fails) + "/" + total + " PASS | " + fails + " FAIL ===");
if (fails > 0) { process.exit(1); }
process.exit(0);
