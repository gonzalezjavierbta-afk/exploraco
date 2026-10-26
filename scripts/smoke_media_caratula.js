// scripts/smoke_media_caratula.js
// Smoke test de la DERIVADA DE CARATULA de media-embed.js (ExploraCO, BUG-140).
// Carga el modulo REAL en un contexto vm con un window simulado (sin navegador
// ni red) y congela:
//   1) youtubeId / kind / youtubeThumb para watch?v=, youtu.be/, /embed/,
//      /shorts/ y m.youtube.com con ?feature=share -> hqdefault.jpg.
//      No-YouTube, .mp3/.mp4 directos, null, undefined y no-string -> ''.
//   2) mediaDe(item).caratula: la miniatura propia valida GANA; una miniatura
//      que es URL de embed o medio directo cae a la DERIVADA si la url es de
//      YouTube y a '' si no lo es; sin miniatura + YouTube -> derivada;
//      media_miniatura funciona como alias; miniatura cruda se conserva
//      aunque caratula se derive.
//   3) INVARIANTE (la mas importante): ningun caratula devuelto es un medio
//      directo ni una URL de servicio de embed (Spotify/YouTube/Vimeo). Se
//      comprueba con isDirectMedia() y kind() sobre cada caratula no vacia.
// Exit 0 = todo OK. Sin dependencias npm: solo node:fs, node:path, node:vm.

"use strict";
var fs = require("fs");
var path = require("path");
var vm = require("vm");

var MOD_PATH = path.join(__dirname, "..", "media-embed.js");
var SRC = fs.readFileSync(MOD_PATH, "utf8");
var THUMB = "https://img.youtube.com/vi/";
var YTID = "dQw4w9WgXcQ";

var fails = 0;
var total = 0;
function check(label, cond, detail) {
  total++;
  console.log((cond ? "PASS" : "FAIL") + " - " + label + (detail ? " | " + detail : ""));
  if (!cond) { fails++; }
}

/* Carga el modulo en un sandbox con window simulado. */
function load() {
  var win = {};
  var sandbox = { window: win, document: undefined, console: console, encodeURIComponent: encodeURIComponent };
  sandbox.self = win;
  vm.createContext(sandbox);
  vm.runInContext(SRC, sandbox, { filename: "media-embed.js" });
  return win.ExploraMediaEmbed;
}

var M = load();
check("modulo publica window.ExploraMediaEmbed", !!M);
check("expone youtubeId / youtubeThumb / kind / mediaDe / isDirectMedia",
  typeof M.youtubeId === "function" && typeof M.youtubeThumb === "function" &&
  typeof M.kind === "function" && typeof M.mediaDe === "function" &&
  typeof M.isDirectMedia === "function");

/* ------------------------------------------------------------------ */
console.log("\n=== 1) youtubeId / kind / youtubeThumb: 5 formatos -> hqdefault.jpg ===");
var yt = [
  ["watch?v=",                 "https://www.youtube.com/watch?v=" + YTID],
  ["watch con &t",             "https://www.youtube.com/watch?v=" + YTID + "&t=30s"],
  ["youtu.be/",                "https://youtu.be/" + YTID],
  ["/embed/",                  "https://www.youtube.com/embed/" + YTID],
  ["/shorts/",                 "https://www.youtube.com/shorts/" + YTID],
  ["m.youtube.com + share",    "https://m.youtube.com/watch?v=" + YTID + "&feature=share"],
  ["http (no https)",          "http://www.youtube.com/watch?v=" + YTID]
];
yt.forEach(function (c) {
  check("youtubeId [" + c[0] + "]", M.youtubeId(c[1]) === YTID, String(M.youtubeId(c[1])));
  check("kind == youtube [" + c[0] + "]", M.kind(c[1]) === "youtube", String(M.kind(c[1])));
  check("youtubeThumb hqdefault [" + c[0] + "]",
    M.youtubeThumb(c[1]) === THUMB + YTID + "/hqdefault.jpg", M.youtubeThumb(c[1]));
});

console.log("\n=== 1b) youtubeThumb == '' fuera de YouTube / entradas degeneradas ===");
var noYt = [
  ["vimeo",          "https://vimeo.com/123456789"],
  ["spotify track",  "https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT"],
  ["pagina html",    "https://e.com/pagina.html"],
  ["imagen .jpg",    "https://e.com/foto.jpg"],
  ["mp3 directo",    "https://e.com/audio.mp3"],
  ["mp4 directo",    "https://e.com/x.mp4"],
  ["string vacio",   ""],
  ["solo espacios",  "   "],
  ["null",           null],
  ["undefined",      undefined],
  ["numero",         123],
  ["objeto",         {}],
  ["array",          []],
  ["booleano",       true]
];
noYt.forEach(function (c) {
  check("youtubeThumb '' [" + c[0] + "]", M.youtubeThumb(c[1]) === "", String(M.youtubeThumb(c[1])));
  check("youtubeId null [" + c[0] + "]", M.youtubeId(c[1]) === null, String(M.youtubeId(c[1])));
});
check("mp3 directo: isDirectMedia true (no es caratula)", M.isDirectMedia("https://e.com/audio.mp3") === true);
check("mp4 directo: isDirectMedia true (no es caratula)", M.isDirectMedia("https://e.com/x.mp4") === true);

/* ------------------------------------------------------------------ */
console.log("\n=== 2) mediaDe(item).caratula: criterio unico de caratula ===");
var DERIVADA = THUMB + YTID + "/hqdefault.jpg";
var EMBED_YT = "https://www.youtube.com/embed/" + YTID;
var JPG = "https://e.com/m.jpg";
var casos = [];
function caso(label, item) {
  var d = M.mediaDe(item);
  casos.push({ label: label, item: item, d: d });
  return d;
}

/* 2a) Miniatura propia VALIDA gana. */
var a = caso("miniatura valida gana (media youtube)", { media_url: "https://www.youtube.com/watch?v=" + YTID, media_type: "video", miniatura_url: JPG });
check("2a caratula = miniatura propia", a.caratula === JPG, a.caratula);
var a2 = caso("miniatura valida gana (media mp3, no youtube)", { media_url: "https://e.com/a.mp3", miniatura_url: JPG });
check("2b caratula = miniatura propia (no youtube)", a2.caratula === JPG, a2.caratula);

/* 2b) Miniatura que es URL de EMBED: derivada si la url es YouTube. */
var b = caso("miniatura=embed + media youtube", { media_url: "https://www.youtube.com/watch?v=" + YTID, media_type: "video", miniatura_url: EMBED_YT });
check("2c miniatura embed + youtube -> derivada", b.caratula === DERIVADA, b.caratula);
var b2 = caso("miniatura=embed + media mp3", { media_url: "https://e.com/a.mp3", media_type: "audio", miniatura_url: EMBED_YT });
check("2d miniatura embed + no youtube -> ''", b2.caratula === "", b2.caratula);

/* 2c) Miniatura que es MEDIO DIRECTO: derivada si la url es YouTube. */
var c1 = caso("miniatura=.mp3 + media youtube", { media_url: "https://youtu.be/" + YTID, miniatura_url: "https://e.com/x.mp3" });
check("2e miniatura .mp3 + youtube -> derivada", c1.caratula === DERIVADA, c1.caratula);
var c2 = caso("miniatura=.mp4 + media spotify", { media_url: "https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT", miniatura_url: "https://e.com/x.mp4" });
check("2f miniatura .mp4 + no youtube -> ''", c2.caratula === "", c2.caratula);
var c3 = caso("miniatura=.mp3 con query + media video vimeo", { media_url: "https://vimeo.com/123456789", miniatura_url: "https://e.com/x.mp3?token=abc" });
check("2g miniatura .mp3?token + vimeo -> ''", c3.caratula === "", c3.caratula);

/* 2d) sin miniatura + YouTube -> derivada (los 5 formatos). */
["watch", "youtu.be", "embed", "shorts", "m.youtube"].forEach(function (k) {
  var url = {
    "watch": "https://www.youtube.com/watch?v=" + YTID,
    "youtu.be": "https://youtu.be/" + YTID,
    "embed": EMBED_YT,
    "shorts": "https://www.youtube.com/shorts/" + YTID,
    "m.youtube": "https://m.youtube.com/watch?v=" + YTID + "&feature=share"
  }[k];
  var d = caso("sin miniatura + youtube " + k, { media_url: url, media_type: "video" });
  check("2h sin miniatura + youtube [" + k + "] -> derivada", d.caratula === DERIVADA, d.caratula);
});

/* 2e) sin miniatura + NO YouTube -> ''. */
var e1 = caso("sin miniatura + vimeo", { media_url: "https://vimeo.com/123456789" });
check("2i sin miniatura + vimeo -> ''", e1.caratula === "", e1.caratula);
var e2 = caso("sin miniatura + mp4", { media_url: "https://e.com/x.mp4", media_type: "video" });
check("2j sin miniatura + mp4 -> ''", e2.caratula === "", e2.caratula);

/* 2f) media_miniatura como alias. */
var f1 = caso("alias media_miniatura valido", { media_url: "https://www.youtube.com/watch?v=" + YTID, media_miniatura: JPG });
check("2k media_miniatura alias -> caratula", f1.caratula === JPG, f1.caratula);
check("2l media_miniatura se refleja en miniatura", f1.miniatura === JPG, f1.miniatura);
var f2 = caso("alias media_miniatura = embed yt", { media_url: "https://www.youtube.com/watch?v=" + YTID, media_miniatura: EMBED_YT });
check("2m media_miniatura embed + youtube -> derivada", f2.caratula === DERIVADA, f2.caratula);
var f3 = caso("miniatura_url gana sobre media_miniatura", { miniatura_url: "https://e.com/a.jpg", media_miniatura: "https://e.com/b.jpg" });
check("2n prioridad miniatura_url sobre media_miniatura", f3.caratula === "https://e.com/a.jpg", f3.caratula);

/* 2g) miniatura CRUDA se conserva aunque caratula se derive. */
check("2o miniatura cruda conservada (embed yt)", b.miniatura === EMBED_YT, b.miniatura);
check("2p caratula derivada != miniatura cruda", b.caratula !== b.miniatura && b.caratula === DERIVADA, b.caratula);
check("2q miniatura cruda conservada (.mp3)", c1.miniatura === "https://e.com/x.mp3", c1.miniatura);

/* 2h) Servicio de embed pegado como miniatura: spotify / vimeo. */
var g1 = caso("miniatura spotify + media youtube", { media_url: "https://www.youtube.com/watch?v=" + YTID, miniatura_url: "https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT" });
check("2r miniatura spotify + youtube -> derivada", g1.caratula === DERIVADA, g1.caratula);
var g2 = caso("miniatura vimeo + media mp3", { media_url: "https://e.com/a.mp3", miniatura_url: "https://vimeo.com/123456789" });
check("2s miniatura vimeo + no youtube -> ''", g2.caratula === "", g2.caratula);

/* ------------------------------------------------------------------ */
console.log("\n=== 3) INVARIANTE: caratula NUNCA es medio directo ni URL de embed ===");
check("matriz con casos suficientes (>= 15)", casos.length >= 15, "casos=" + casos.length);
casos.forEach(function (c) {
  var car = c.d.caratula;
  check("3 [no vacia] " + c.label, car === "" || (car !== "" && !M.isDirectMedia(car) && M.kind(car) === null), car === "" ? "(vacia)" : car);
});
var noVacias = casos.filter(function (c) { return c.d.caratula !== ""; });
check("3b hay caratulas no vacias en la matriz (control positivo)", noVacias.length > 0, "noVacias=" + noVacias.length);
check("3c ninguna caratula es .mp3", casos.every(function (c) { return !/\.mp3(?:[?#].*)?$/i.test(c.d.caratula); }));
check("3d ninguna caratula es .mp4", casos.every(function (c) { return !/\.mp4(?:[?#].*)?$/i.test(c.d.caratula); }));
check("3e ninguna caratula apunta a youtube.com/embed", casos.every(function (c) { return c.d.caratula.indexOf("youtube.com/embed/") < 0; }));
check("3f ninguna caratula apunta a open.spotify.com", casos.every(function (c) { return c.d.caratula.indexOf("open.spotify.com") < 0; }));
check("3g ninguna caratula apunta a vimeo.com", casos.every(function (c) { return c.d.caratula.indexOf("vimeo.com") < 0; }));
check("3h toda caratula no vacia es una URL http(s)", noVacias.every(function (c) { return /^https?:\/\//.test(c.d.caratula); }));

/* ------------------------------------------------------------------ */
console.log("\n=== 4) ASCII-safety del modulo (ADR-002) ===");
var raw = fs.readFileSync(MOD_PATH);
var bad = 0;
for (var i = 0; i < raw.length; i++) { if (raw[i] > 127) { bad++; } }
check("media-embed.js 0 bytes > 127", bad === 0, "bytes>127=" + bad);

/* ------------------------------------------------------------------ */
console.log("\nRESULTADO: " + (total - fails) + " PASS / " + fails + " FAIL");
if (fails > 0) { process.exitCode = 1; }
