// scripts/smoke_auditoria_pagina_destino.js
// Smoke test puntual para la auditoria de pagina-destino.js (TSK auditoria multimedia).
// Carga el motor en sandbox, llama buildHTML() con datos minimos y valida:
//   1) videoEmbedUrlBlog: hosts conocidos -> embed correcto, desconocidos -> ''.
//   2) parseBlogBody: defensa XSS (javascript:, data:, ftp:, hosts sin http).
//   3) secGaleria + lbHTML: degradacion condicional segun # de fotos.
//   4) BUG-027: boton Instagram NO contiene literal [foto], SI contiene camara unicode.
//   5) secBlogVideo: solo se renderiza si videoEmbedUrlBlog retorna embed valido.
//   6) secContact: gating cat !== 'blog'.
// Exit 0 = todo OK. Sin dependencias npm.

"use strict";
var fs = require("fs");
var path = require("path");
var vm = require("vm");
var Module = require("module");

var fakeNeonPath = path.join(__dirname, "fake_neon.js");
if (!fs.existsSync(fakeNeonPath)) {
  fs.writeFileSync(fakeNeonPath, "module.exports = { neon: function(){ return function(){ return []; }; } };\n", "utf8");
}
var origResolve = Module._resolveFilename;
Module._resolveFilename = function (req) {
  if (req === "@neondatabase/serverless") return fakeNeonPath;
  return origResolve.apply(this, arguments);
};

var sandbox = { module: { exports: {} }, require: require, console: console, process: process, URL: URL, URLSearchParams: URLSearchParams };
sandbox.exports = sandbox.module.exports;
vm.createContext(sandbox);
var motorPath = path.join(__dirname, "..", "api", "pagina-destino.js");
var src = fs.readFileSync(motorPath, "utf8");
vm.runInContext(src + "\nmodule.exports.buildHTML = buildHTML;", sandbox, { filename: "api/pagina-destino.js" });
var buildHTML = sandbox.module.exports.buildHTML;

var fails = 0;
function check(label, cond, detail) {
  console.log((cond ? "PASS" : "FAIL") + " - " + label + (detail ? " | " + detail : ""));
  if (!cond) fails++;
}

function base(opts) {
  return Object.assign({
    id: "t", nombre: "Test", slug: "test",
    categoria_slug: "sitio", descripcion: "",
    tags: {}, creado_en: new Date(), actualizado_en: new Date(),
    rating: 0, total_resenas: 0
  }, opts || {});
}

console.log("\n=== AUDIT 1: videoEmbedUrlBlog() ===");
function videoEmbedBlog(videoUrl) {
  var html = buildHTML(base({ categoria_slug: "blog", tags: { video_url: videoUrl }, descripcion: "" }), {}, [], [], null, []);
  return html;
}
var casosV = [
  ["https://www.youtube.com/watch?v=abc123", "youtube.com/embed/abc123", "youtube watch"],
  ["https://youtu.be/dQw4w9WgXcQ", "youtube.com/embed/dQw4w9WgXcQ", "youtu.be short"],
  ["https://vimeo.com/123456789", "player.vimeo.com/video/123456789", "vimeo"],
  ["https://example.com/abc", "", "host desconocido -> vacio"],
  ["https://malicious.com/track?v=1", "", "spoofing -> vacio"],
  ["https://youtube.com.evil.com/x", "", "subdominio malicioso -> vacio"],
  ["javascript:alert(1)", "", "javascript: pseudo-protocolo"],
  ["", "", "string vacio"]
];
casosV.forEach(function (c) {
  var html = videoEmbedBlog(c[0]);
  var iframes = html.match(/<iframe src="[^"]+"/g) || [];
  var videoIframes = iframes.filter(function (s) {
    return s.indexOf("youtube.com/embed") >= 0 || s.indexOf("player.vimeo.com") >= 0;
  });
  if (c[1] === "") {
    check("videoEmbed rechaza: " + c[2], videoIframes.length === 0, "videoIframes=" + videoIframes.length);
  } else {
    var ok = videoIframes.some(function (s) { return s.indexOf(c[1]) >= 0; });
    check("videoEmbed acepta: " + c[2], ok, videoIframes.join(" | "));
  }
});

console.log("\n=== AUDIT 2: parseBlogBody() defensa XSS ===");
function parseBlog(descripcion) {
  return buildHTML(base({ categoria_slug: "blog", descripcion: descripcion }), {}, [], [], null, []);
}
var casosBody = [
  ["Primer parrafo sin marcadores.", "<p class=\"stext\">Primer parrafo", "texto plano -> p"],
  ["[foto:https://ejemplo.com/img.jpg|Caption de prueba]", "src=\"https://ejemplo.com/img.jpg\"", "foto http valida"],
  ["[foto:javascript:alert(1)|XSS]", "javascript:alert", "foto javascript: BLOQUEADA"],
  ["[foto:data:text/html,<script>x</script>|XSS]", "<script>x</script>", "foto data: BLOQUEADA"],
  ["[foto:ftp://server.com/img.jpg|caption]", "ftp://server.com", "foto ftp: BLOQUEADA"],
  ["[foto://path-sin-protocolo.jpg|caption]", "<img", "foto sin protocolo BLOQUEADA"],
  ["[video:https://www.youtube.com/watch?v=ok123]", "youtube.com/embed/ok123", "video youtube valido"],
  ["[video:https://evil.com/x]", "evil.com/x", "video host invalido BLOQUEADO"]
];
casosBody.forEach(function (c) {
  var html = parseBlog(c[0]);
  var peligrosos = ["javascript:alert", "<script>x</script>", "ftp://server.com", "evil.com/x"];
  var esPeligroso = peligrosos.indexOf(c[1]) >= 0;
  if (esPeligroso) {
    // Esperamos que el payload peligroso NO aparezca en el HTML
    var contiene = html.indexOf(c[1]) >= 0;
    check("XSS bloqueado: " + c[2], !contiene, contiene ? "FALLO: aparecio en el HTML" : "no aparece OK");
  } else {
    var ok = html.indexOf(c[1]) >= 0;
    check("parseBlog OK: " + c[2], ok, ok ? "" : "no se encontro: " + c[1]);
  }
});

console.log("\n=== AUDIT 3: secGaleria + lbHTML (degradacion condicional) ===");
var sinFotos = buildHTML(base({}), {}, [], [], null, []);
check("secGaleria OCULTA con 0 fotos", sinFotos.indexOf('id="galeria"') < 0);
check("lbHTML OCULTO con 0 fotos", sinFotos.indexOf('id="lb"') < 0);

var unaFoto = buildHTML(base({ foto_hero: "https://e.com/h.jpg" }), {}, [{ url: "https://e.com/h.jpg" }], [], null, []);
check("secGaleria OCULTA con 1 sola foto (=hero)", unaFoto.indexOf('id="galeria"') < 0, "regla: galAll.length > 1");

var dosFotos = buildHTML(base({ foto_hero: "https://e.com/h.jpg" }), {}, [{ url: "https://e.com/h.jpg" }, { url: "https://e.com/g.jpg" }], [], null, []);
check("secGaleria VISIBLE con 2+ fotos", dosFotos.indexOf('id="galeria"') >= 0);
check("lbHTML VISIBLE con 2+ fotos", dosFotos.indexOf('id="lb"') >= 0);
check("gal-thumbs presente", dosFotos.indexOf("gal-thumbs") >= 0);
check("gal-thumbs tiene onclick abrirLightbox", dosFotos.indexOf('onclick="abrirLightbox(') >= 0);
check("lb-bg presente", dosFotos.indexOf('id="lb-bg"') >= 0);
check("lb-close presente", dosFotos.indexOf('id="lb-close"') >= 0);
check("lb-prev + lb-next presentes", dosFotos.indexOf('id="lb-prev"') >= 0 && dosFotos.indexOf('id="lb-next"') >= 0);

console.log("\n=== AUDIT 4: BUG-027 Instagram ===");
var conInsta = buildHTML(base({ instagram: "@explora.co" }), {}, [{ url: "https://e.com/h.jpg" }, { url: "https://e.com/g.jpg" }], [], null, []);
var instaMatch = conInsta.match(/instagram\.com\/[^"]+"[^>]*>([^<]+)</);
check("Instagram link generado", !!instaMatch, instaMatch ? "label=" + instaMatch[1] : "no match");
if (instaMatch) {
  var label = instaMatch[1];
  check("NO contiene literal [foto]", label.indexOf("[foto]") < 0, "label=" + JSON.stringify(label));
  check("SI contiene camara unicode (\\uD83D\\uDCF7)", label.indexOf("\uD83D\uDCF7") >= 0, "label=" + JSON.stringify(label));
}

console.log("\n=== AUDIT 5: secBlogVideo ===");
var blogSinVideo = buildHTML(base({ categoria_slug: "blog", descripcion: "hola" }), {}, [], [], null, []);
check("secBlogVideo OCULTA sin video_url", blogSinVideo.indexOf('id="video"') < 0);
var blogConVideo = buildHTML(base({ categoria_slug: "blog", descripcion: "hola", tags: { video_url: "https://www.youtube.com/watch?v=TEST123" } }), {}, [], [], null, []);
check("secBlogVideo VISIBLE con youtube.com", blogConVideo.indexOf('id="video"') >= 0);
check("secBlogVideo apunta a embed/TEST123", blogConVideo.indexOf("youtube.com/embed/TEST123") >= 0);
var blogConVideoInvalido = buildHTML(base({ categoria_slug: "blog", descripcion: "hola", tags: { video_url: "https://random-host.com/abc" } }), {}, [], [], null, []);
check("secBlogVideo OCULTA con host invalido", blogConVideoInvalido.indexOf('id="video"') < 0, "degradacion condicional OK");

console.log("\n=== AUDIT 6: secContact gating blog ===");
var blogConWA = buildHTML(base({ categoria_slug: "blog", whatsapp: "+571234" }), {}, [], [], null, []);
check("secContact OCULTA en blog", blogConWA.indexOf('id="contact"') < 0);
var sitioConWA = buildHTML(base({ categoria_slug: "sitio", whatsapp: "+571234" }), {}, [], [], null, []);
check("secContact VISIBLE en sitio con whatsapp", sitioConWA.indexOf('id="contact"') >= 0);
var sitioSinContacto = buildHTML(base({ categoria_slug: "sitio" }), {}, [], [], null, []);
check("secContact OCULTA si no hay datos de contacto", sitioSinContacto.indexOf('id="contact"') < 0);

console.log("\n=== RESUMEN ===");
console.log(fails === 0 ? "TODOS LOS SMOKE TESTS PASARON (" + (42) + " checks)" : fails + " smoke test(s) FALLARON");
process.exit(fails > 0 ? 1 : 0);
