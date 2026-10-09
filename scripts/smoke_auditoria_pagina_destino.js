// scripts/smoke_auditoria_pagina_destino.js
// Smoke test puntual para la auditoria de pagina-destino.js (TSK auditoria multimedia).
// Carga el motor en sandbox, llama buildHTML() con datos minimos y valida:
//   1) videoEmbedUrlBlog: hosts conocidos -> embed correcto, desconocidos -> ''.
//   2) parseBlogBody: defensa XSS (javascript:, data:, ftp:, hosts sin http).
//   3) Seccion unificada #galeria (curadas + viajeros) + lbHTML: degradacion
//      condicional segun # de fotos curadas (diseno galeria unificada).
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
var total = 0;
function check(label, cond, detail) {
  total++;
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
  ["[foto://path-sin-protocolo.jpg|caption]", "<img src=\"//path-sin-protocolo.jpg\"", "foto sin protocolo BLOQUEADA"],
  ["[video:https://www.youtube.com/watch?v=ok123]", "youtube.com/embed/ok123", "video youtube valido"],
  ["[video:https://evil.com/x]", "evil.com/x", "video host invalido BLOQUEADO"]
];
casosBody.forEach(function (c) {
  var html = parseBlog(c[0]);
  var peligrosos = ["javascript:alert", "<script>x</script>", "ftp://server.com", "evil.com/x", "<img src=\"//path-sin-protocolo.jpg\""];
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

console.log("\n=== AUDIT 3: seccion unificada #galeria + lbHTML (degradacion condicional) ===");
// TSK-111 / CAMBIO 7A: la seccion #galeria conserva SOLO la galeria curada
// (1 grande + miniaturas) y su ancla invisible <span id="fotos">. El modulo
// "Fotos de viajeros" (#fp-grid, #fp-info, #fp-upload) se retiro de la ficha:
// este smoke verifica su AUSENCIA. El lightbox #lb se monta con galeria
// curada o miniaturas del hero. Ya NO existe <section id="fotos">.
//
// Ojo: "gal-main"/"gal-thumbs" tambien aparecen en el CSS scoped (.gal-main,
// .gal-thumbs), por lo que las aserciones negativas usan el atributo de clase
// del elemento (class="gal-main" / class="gal-thumbs").
function seccionGaleria(html) {
  var i = html.indexOf('<section class="ssec bwarm" id="galeria">');
  if (i < 0) return "";
  var j = html.indexOf("</section>", i);
  return j < 0 ? html.slice(i) : html.slice(i, j);
}
function cuenta(html, re) {
  return (html.match(re) || []).length;
}
function auditarGaleriaUnificada(label, html, hayCurada) {
  var sec = seccionGaleria(html);
  var nGal = cuenta(html, /id="galeria"/g);
  check("id=galeria presente y unico (" + label + ")", nGal === 1, "ocurrencias=" + nGal);
  check("cero <section id=fotos> (" + label + ")", cuenta(html, /<section[^>]*id="fotos"/g) === 0);
  check("ancla <span id=fotos> presente (" + label + ")", html.indexOf('<span id="fotos"') >= 0);
  check("fp-grid ausente en #galeria (" + label + ")", sec.indexOf('id="fp-grid"') < 0);
  check("fp-upload ausente en #galeria (" + label + ")", sec.indexOf('id="fp-upload"') < 0);
  check("bloque curado " + (hayCurada ? "VISIBLE" : "OCULTO") + " (" + label + ")",
    hayCurada
      ? (sec.indexOf('class="gal-main"') >= 0 && sec.indexOf('class="gal-thumbs"') >= 0)
      : (sec.indexOf('class="gal-main"') < 0 && sec.indexOf('class="gal-thumbs"') < 0));
  check("lbHTML " + (hayCurada ? "VISIBLE" : "OCULTO") + " (" + label + ")",
    hayCurada ? html.indexOf('id="lb"') >= 0 : html.indexOf('id="lb"') < 0);
  var abre = cuenta(html, /<div/g);
  var cierra = cuenta(html, /<\/div>/g);
  check("balance de divs (" + label + ")", abre === cierra, "open=" + abre + " close=" + cierra + " diff=" + (abre - cierra));
}

var sinFotos = buildHTML(base({}), {}, [], [], null, []);
auditarGaleriaUnificada("0 fotos", sinFotos, false);

var unaFoto = buildHTML(base({ foto_hero: "https://e.com/h.jpg" }), {}, [{ url: "https://e.com/h.jpg" }], [], null, []);
auditarGaleriaUnificada("1 sola foto (=hero)", unaFoto, false);

var dosFotos = buildHTML(base({ foto_hero: "https://e.com/h.jpg" }), {}, [{ url: "https://e.com/h.jpg" }, { url: "https://e.com/g.jpg" }], [], null, []);
auditarGaleriaUnificada("2+ fotos", dosFotos, true);
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

console.log("\n=== AUDIT 7: hero (principal = seleccion del usuario; 1 espacio + 2 comunidad) ===");
function heroUrl(html) {
  var m = /class="psm" style="background-image:url\('([^']+)'\)/.exec(html);
  return m ? m[1] : '';
}
function heroAll(html) {
  // El motor emite var HERO_FOTOS= (api/pagina-destino.js:2747): [hero] + miniaturas.
  // El helper buscaba HERO_ALL, que el render ya no produce.
  var m = /var HERO_FOTOS=(\[[^\]]*\])/.exec(html);
  if (!m) return [];
  try { return JSON.parse(m[1]); } catch (e) { return []; }
}
// La principal es SIEMPRE foto_hero (seleccion del usuario), aunque una
// curada o de comunidad tenga mas votos. Las 3 miniaturas: la mejor del
// espacio (curada) por votos + las 2 mejores de comunidad por votos.
var heroVotos = buildHTML(
  base({ foto_hero: "https://e.com/hero.jpg" }),
  {},
  [
    { url: "https://e.com/hero.jpg", votos: 0 },
    { url: "https://e.com/espacio-a.jpg", votos: 3 },
    { url: "https://e.com/espacio-b.jpg", votos: 1 }
  ],
  [], null, [],
  {}, null,
  [
    { url: "https://e.com/com-v1.jpg", votos: 9 },
    { url: "https://e.com/com-v2.jpg", votos: 7 }
  ],
  [{ url: "https://e.com/com-alb.jpg", votos: 5 }]
);
check("hero: principal = seleccion del usuario (foto_hero)", heroUrl(heroVotos) === "https://e.com/hero.jpg", heroUrl(heroVotos));
check("hero: HERO_ALL[0] = seleccion del usuario", heroAll(heroVotos)[0] === "https://e.com/hero.jpg", JSON.stringify(heroAll(heroVotos)));
check("hero: miniatura 1 = mejor foto del espacio (curada)", heroAll(heroVotos)[1] === "https://e.com/espacio-a.jpg", JSON.stringify(heroAll(heroVotos)));
check("hero: miniaturas 2-3 = mejores de comunidad", heroAll(heroVotos)[2] === "https://e.com/com-v1.jpg" && heroAll(heroVotos)[3] === "https://e.com/com-v2.jpg", JSON.stringify(heroAll(heroVotos)));
check("hero: exactamente 3 miniaturas", heroAll(heroVotos).length === 4, "len=" + heroAll(heroVotos).length);

// Sin votos: principal sigue siendo la del usuario; el relleno completa.
var heroSinVotos = buildHTML(
  base({ foto_hero: "https://e.com/hero.jpg" }),
  {},
  [{ url: "https://e.com/hero.jpg" }, { url: "https://e.com/b.jpg" }],
  [], null, []
);
check("hero sin votos: principal = seleccion del usuario", heroUrl(heroSinVotos) === "https://e.com/hero.jpg", heroUrl(heroSinVotos));

// Un video con mas votos NUNCA entra al hero (ni principal ni miniatura).
var heroConVideo = buildHTML(
  base({ foto_hero: "https://e.com/hero.jpg" }),
  {},
  [{ url: "https://e.com/hero.jpg", votos: 2 }],
  [], null, [],
  {}, null,
  [],
  [{ url: "https://e.com/vid.mp4", votos: 99, foto_type: "video" }]
);
check("hero: video con mas votos NO entra al hero", heroUrl(heroConVideo) === "https://e.com/hero.jpg" && heroAll(heroConVideo).indexOf("https://e.com/vid.mp4") === -1, JSON.stringify(heroAll(heroConVideo)));

console.log("\n=== AUDIT 8: boton Reclamar en la franja .gstrip (ADR-091 / ADR-003) ===");
// El boton de reclamo se emite DESDE la franja naranja .gstrip, nunca desde
// la botonera del hero (.hctar-row). El marcado vive en una sola constante
// (btnReclamarHTML) para que cada render lo emita EXACTAMENTE UNA VEZ (ADR-003).
// Ojo empirico: galAll incluye la foto del hero, asi que para forzar la rama
// de reserva (:1003) hay que dejar resenas en 0, sin precio_desde y sin NINGUNA
// foto (ni hero ni curada): con una sola foto galAll.length === 1 y la rama
// real seguiria ganandonos.
function bloqueHtml(html, apertura) {
  var i = html.indexOf(apertura);
  if (i < 0) return "";
  var j = html.indexOf("</section>", i);
  return j < 0 ? html.slice(i) : html.slice(i, j);
}
function zonaGstrip(html) {
  var i = html.indexOf('<div class="gstrip"');
  if (i < 0) return "";
  var j = html.indexOf("\n\n", i);
  return j < 0 ? html.slice(i) : html.slice(i, j);
}
function zonaHero(html) {
  var i = html.indexOf('<div class="hctar">');
  if (i < 0) return "";
  var j = html.indexOf('<div class="hr">', i);
  return j < 0 ? html.slice(i, i + 1500) : html.slice(i, j);
}
var TAG_BTN = 'id="btn-reclamar"';

// 1 + 2 + 4: render con FRANJA REAL (resenas > 0 y galeria multiple).
var htmlReal = buildHTML(
  base({ foto_hero: "https://e.com/h.jpg", total_resenas: 3, rating: 4 }),
  {},
  [{ url: "https://e.com/h.jpg" }, { url: "https://e.com/g.jpg" }],
  [], null, []
);
var gsReal = zonaGstrip(htmlReal);
var heroReal = zonaHero(htmlReal);
check("franja real: .gstrip emitido", gsReal.indexOf('<div class="gstrip">') >= 0, "len=" + gsReal.length);
check("franja real: #btn-reclamar DENTRO de .gstrip", gsReal.indexOf(TAG_BTN) >= 0);
check("franja real: #btn-reclamar FUERA de la botonera del hero", heroReal.indexOf(TAG_BTN) < 0, "hctar=" + heroReal.length);
check("franja real: hero NO emite boton .gsrecl", heroReal.indexOf('class="gsrecl"') < 0);
var iBotonReal = gsReal.indexOf(TAG_BTN);
var iCtaReal = gsReal.indexOf("Ver galeria");
check("franja real: CTA 'Ver galeria' presente", iCtaReal >= 0, "idx=" + iCtaReal);
check("franja real: orden Reclamar -> Ver galeria", iBotonReal >= 0 && iCtaReal > iBotonReal, "boton=" + iBotonReal + " cta=" + iCtaReal);
var nReal = cuenta(htmlReal, /id="btn-reclamar"/g);
check("ADR-003 franja real: btn-reclamar emitido exactamente 1 vez", nReal === 1, "ocurrencias=" + nReal);

// 3 + 4: render con RAMA DE RESERVA (condicion de :989 empiricamente falsa).
var htmlLite = buildHTML(base({}), {}, [], [], null, []);
var gsLite = zonaGstrip(htmlLite);
// La rama real (:989) solo imprime .gsavg/.gsprice/CTA: si ninguno aparece y
// el wrapper data-gslite si, TOMAMOS DE VERDAD la rama de reserva.
var tomoReserva = gsLite.indexOf("data-gslite") >= 0 && gsLite.indexOf("gsavg") < 0;
check("reserva: condicion de :989 es FALSA (0 resenas, sin precio, sin galeria)", tomoReserva, "gstrip=" + gsLite.slice(0, 70));
check("reserva: wrapper data-gslite presente", gsLite.indexOf("data-gslite") >= 0);
check("reserva: wrapper data-gslite NACE OCULTO (display:none)", /data-gslite style="display:none"/.test(gsLite));
check("reserva: sin resenas ni precio en la franja", gsLite.indexOf("resenas") < 0 && gsLite.indexOf("gsprice") < 0);
var nLite = cuenta(htmlLite, /id="btn-reclamar"/g);
check("ADR-003 reserva: btn-reclamar emitido exactamente 1 vez", nLite === 1, "ocurrencias=" + nLite);

// 5: en blog el boton no se emite en absoluto (ni franja real ni reserva).
var htmlBlog = buildHTML(base({ categoria_slug: "blog", descripcion: "hola", total_resenas: 7, rating: 5, precio_desde: 30000 }), {}, [], [], null, []);
var nBlog = cuenta(htmlBlog, /id="btn-reclamar"/g);
check("blog: btn-reclamar con CERO ocurrencias", nBlog === 0, "ocurrencias=" + nBlog);
// Ojo: el CSS inline del motor contiene ".gstrip{...}", asi que la asercion
// negativa mira el atributo class del ELEMENTO, no la regla de estilo.
check("blog: ningun <div class=\"gstrip\"> emitido", cuenta(htmlBlog, /<div class="gstrip"/g) === 0, "divs=" + cuenta(htmlBlog, /<div class="gstrip"/g));
// El script inline de initReclamo() SI menciona data-gslite (compartido por
// ambas ramas), asi que se busca el atributo en un ELEMENTO, no el string.
var nLiteBlog = cuenta(htmlBlog, /<div class="gstrip" data-gslite/g);
check("blog: sin <div data-gslite> emitido", nLiteBlog === 0, "ocurrencias=" + nLiteBlog);

console.log("\n=== RESUMEN ===");
console.log(fails === 0 ? "TODOS LOS SMOKE TESTS PASARON (" + total + " checks)" : fails + " smoke test(s) FALLARON de " + total);
process.exit(fails > 0 ? 1 : 0);
