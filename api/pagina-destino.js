// api/pagina-destino.js -- v9.20260702
// CAMBIOS: diseno premium Barlow Condensed, seccion sitio turistico, tags JSONB, sin backticks

// Sistema de diseno: Barlow Condensed + Outfit, paleta dorada/negra editorial
// 100% basado en datos reales del formulario publicar.html y schema Neon
// Sin contenido inventado: solo secciones con datos disponibles se renderizan

const { neon } = require('@neondatabase/serverless');

var BASE = 'https://exploraco.co';
var CAT_LABEL = { hostal:'Hospedaje', comida:'Comida & Restaurantes', sitio:'Lugares & Sitios', evento:'Eventos' };
var CAT_DIR   = { hostal:'directorio-hostal.html', comida:'directorio-comida.html', sitio:'directorio-sitio.html', evento:'directorio-evento.html' };
var CAT_GRAD  = { hostal:'linear-gradient(135deg,#1a3a5c,#2a4a7c)', comida:'linear-gradient(135deg,#3a1a0a,#4a2a1a)', sitio:'linear-gradient(135deg,#0a2a1a,#1a3a2a)', evento:'linear-gradient(135deg,#1a051a,#3a1a3a)' };

function esc(s) {
  if (s === null || s === undefined) return '';
  var str = String(s);
  str = str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  var out = '';
  for (var i = 0; i < str.length; i++) {
    var code = str.charCodeAt(i);
    if (code > 127) {
      if (code >= 0xD800 && code <= 0xDBFF && i+1 < str.length) {
        var lo = str.charCodeAt(i+1);
        if (lo >= 0xDC00 && lo <= 0xDFFF) {
          var full = 0x10000 + ((code-0xD800)*0x400) + (lo-0xDC00);
          out += '&#' + full + ';';
          i++; continue;
        }
      }
      out += '&#' + code + ';';
    } else {
      out += str.charAt(i);
    }
  }
  return out;
}
function safeJSON(v) {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  if (typeof v === 'object') return v;
  if (typeof v !== 'string') return [];
  var s = v.trim();
  // Deshacer doble stringify: si empieza con " es un string JSON dentro de string
  if (s.charAt(0) === '"' && s.charAt(s.length-1) === '"') {
    try { s = JSON.parse(s); } catch(_) {}
  }
  try { var r = JSON.parse(s); return r; } catch(_) { return s; }
}

// Version robusta de safeJSON que siempre devuelve array
function safeArr(v) {
  var r = safeJSON(v);
  return Array.isArray(r) ? r : [];
}

// Limpiar emojis de un string para uso seguro en JS del servidor
function money(n) {
  if (!n) return '';
  var s = String(n).replace(/[^0-9]/g, '');
  if (!s) return esc(n);
  var n = parseInt(s, 10);
  var parts = [];
  var str = String(n);
  for (var k = str.length - 1, c = 0; k >= 0; k--, c++) {
    if (c > 0 && c % 3 === 0) parts.unshift('.');
    parts.unshift(str[k]);
  }
  return '$' + parts.join('');
}

function schemaLD(d, cat) {
  var tipos = { hostal:'LodgingBusiness', comida:'FoodEstablishment', sitio:'TouristAttraction', evento:'Event' };
  var schema = {
    '@context':'https://schema.org', '@type':tipos[cat]||'TouristAttraction',
    'name': d.nombre||'', 'description': d.lead||'', 'url': BASE+'/'+(d.slug||'')+'.html'
  };
  if (d.foto_hero) schema['image'] = d.foto_hero;
  if (d.ciudad) schema['address'] = { '@type':'PostalAddress','addressLocality':d.ciudad,'addressCountry':'CO' };
  if (d.lat && d.lng && parseFloat(d.lat)!==0) schema['geo'] = { '@type':'GeoCoordinates','latitude':parseFloat(d.lat),'longitude':parseFloat(d.lng) };
  if (d.rating && d.total_resenas>0) schema['aggregateRating'] = { '@type':'AggregateRating','ratingValue':parseFloat(d.rating).toFixed(1),'ratingCount':d.total_resenas,'bestRating':'5','worstRating':'1' };
  if (d.precio_desde) schema['priceRange'] = d.precio_desde;
  if (d.telefono) schema['telephone'] = d.telefono;
  return '<script type="application/ld+json">\n'+JSON.stringify(schema,null,2)+'\n<\/script>';
}

var CSS = "@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@0,400;0,600;0,700;0,800;0,900;1,700&family=Outfit:wght@300;400;500;600;700&display=swap');"
+"*{box-sizing:border-box;margin:0;padding:0}"
+":root{--gold:#E8A020;--gold-dark:#C8860A;--gold-light:#FDF3E0;--black:#111;--white:#fff;--warm:#FBF8F2;--border:#EDE8E0;--muted:#888;--text:#1A1A1A}"
+"html{scroll-behavior:smooth}body{font-family:'Outfit',sans-serif;background:var(--warm);color:var(--text);overflow-x:hidden}"
+".bc{font-family:'Barlow Condensed',sans-serif}"
+"a{color:inherit;text-decoration:none}img{display:block;max-width:100%}"
+".topbar{background:var(--black);border-bottom:3px solid var(--gold);height:52px;display:flex;align-items:center;padding:0 4%;gap:14px;position:sticky;top:0;z-index:300}"
+".tl{font-family:'Barlow Condensed',sans-serif;font-size:20px;font-weight:900;letter-spacing:4px;color:#fff;flex-shrink:0}.tl em{color:var(--gold);font-style:normal}"
+".tsep{width:1px;height:18px;background:rgba(255,255,255,.15);flex-shrink:0}"
+".tbc{display:flex;align-items:center;gap:5px;font-size:9px;color:rgba(255,255,255,.3);text-transform:uppercase;letter-spacing:1px}"
+".tbc a{color:rgba(255,255,255,.4)}.tbc a:hover{color:var(--gold)}.tbc span{color:rgba(255,255,255,.18)}.tbc em{color:rgba(255,255,255,.65);font-style:normal}"
+".tra{display:flex;gap:8px;align-items:center;margin-left:auto}"
+".tshare{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.18);border-radius:3px;padding:5px 14px;font-family:'Barlow Condensed',sans-serif;font-size:12px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:rgba(255,255,255,.6)}"
+".hero{background:var(--black);position:relative;overflow:hidden}"
+".hi{position:relative;z-index:1;display:grid;grid-template-columns:1.1fr 1fr;gap:4%;padding:5% 4% 4%;min-height:380px}"
+"@media(max-width:760px){.hi{grid-template-columns:1fr;min-height:auto;padding:8% 5%}}"
+".hl{display:flex;flex-direction:column;justify-content:center;gap:16px}"
+".hew{display:inline-flex;align-items:center;gap:8px;background:rgba(232,160,32,.12);border:1px solid rgba(232,160,32,.28);color:var(--gold);padding:5px 14px;border-radius:2px;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:2px;width:fit-content}"
+".htitle{font-family:'Barlow Condensed',sans-serif;font-size:clamp(40px,6vw,72px);font-weight:900;color:#fff;line-height:.95;letter-spacing:.5px}"
+".hsub{font-size:13px;color:rgba(255,255,255,.45);line-height:1.8;max-width:480px}"
+".hqi-row{display:flex;flex-wrap:wrap;gap:8px 18px}.hqi{display:flex;align-items:center;gap:6px;font-size:11px;color:rgba(255,255,255,.5)}"
+".hctar{display:flex;gap:10px;align-items:center;flex-wrap:wrap}"
+".hbtn{background:var(--gold);color:#fff;border:none;border-radius:3px;padding:11px 24px;font-family:'Barlow Condensed',sans-serif;font-size:14px;font-weight:900;letter-spacing:1px;text-transform:uppercase;cursor:pointer}"
+".hobtn{background:transparent;color:rgba(255,255,255,.6);border:1px solid rgba(255,255,255,.22);border-radius:3px;padding:10px 20px;font-family:'Barlow Condensed',sans-serif;font-size:13px;font-weight:700;text-transform:uppercase;cursor:pointer}"
+".hr{display:flex;flex-direction:column;gap:8px;justify-content:center}"
+".psm{height:200px;border-radius:8px;overflow:hidden;position:relative;cursor:pointer;background-size:cover;background-position:center}"
+".psm img{width:100%;height:100%;object-fit:cover}"
+".pbadge{position:absolute;top:10px;left:10px;background:rgba(0,0,0,.55);color:#fff;font-size:9px;padding:3px 8px;border-radius:3px;font-weight:700;text-transform:uppercase;letter-spacing:.8px}"
+".prow{display:flex;gap:8px;height:88px}"
+".pth{flex:1;border-radius:6px;overflow:hidden;background:#1a1a2e;background-size:cover;background-position:center;display:flex;align-items:center;justify-content:center;font-size:24px}"
+".pth img{width:100%;height:100%;object-fit:cover}"
+".subnav{background:#fff;border-bottom:1px solid var(--border);position:sticky;top:52px;z-index:260;display:flex;gap:4px;overflow-x:auto;padding:0 4%;-ms-overflow-style:none;scrollbar-width:none}"
+".subnav::-webkit-scrollbar{display:none}"
+".snlink{flex-shrink:0;padding:14px 12px;font-family:'Barlow Condensed',sans-serif;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:var(--muted);text-decoration:none;border-bottom:3px solid transparent;white-space:nowrap}"
+".snlink.on{color:var(--gold-dark);border-color:var(--gold)}"
  // BUG-014 fix (ver BUGS_HISTORICOS.md): este bloque definia una
  // segunda regla ".snlink" (para un ".secnav" que nunca se usa en
  // ningun render, ver grep) que pisaba en cascada CSS a la regla
  // real usada por ".subnav" (padding 14px 0 en vez de 14px 12px,
  // font-weight 700 en vez de 800). Se elimina el CSS muerto y se
  // conserva solo el bloque .gstrip, que si esta en uso.
+".gstrip{background:var(--gold);padding:14px 4%;display:flex;align-items:center;gap:3%;flex-wrap:wrap;border-bottom:1px solid rgba(0,0,0,.1)}"
+".gsavg{font-family:'Barlow Condensed',sans-serif;font-size:30px;font-weight:900;color:#fff;line-height:1}"
+".gstars{display:flex;gap:2px}.gstar{font-size:13px;color:rgba(255,255,255,.4)}.gstar.on{color:#fff}"
+".gsrv{font-size:10px;color:rgba(255,255,255,.75);margin-top:1px}"
+".gsdiv{width:1px;height:30px;background:rgba(255,255,255,.25);flex-shrink:0}"
+".gsprice{color:#fff}.gspl{font-size:8px;color:rgba(255,255,255,.65);text-transform:uppercase;letter-spacing:1.2px}.gspv{font-family:'Barlow Condensed',sans-serif;font-size:20px;font-weight:900;line-height:1}"
+".gscta{margin-left:auto;background:#fff;color:var(--gold);border:none;border-radius:3px;padding:10px 22px;font-family:'Barlow Condensed',sans-serif;font-size:13px;font-weight:900;letter-spacing:1px;text-transform:uppercase;cursor:pointer;flex-shrink:0}"

+".ssec{padding:40px 4%}.ssec.bwarm{background:var(--warm)}.ssec.bwhite{background:#fff;border-top:1px solid var(--border);border-bottom:1px solid var(--border)}"
+".sin{max-width:860px;margin:0 auto}"
+".strow{display:flex;align-items:center;gap:14px;margin-bottom:22px}"
+".sgl{width:36px;height:3px;background:var(--gold);flex-shrink:0;border-radius:2px}"
+".stitle{font-family:'Barlow Condensed',sans-serif;font-size:21px;font-weight:900;text-transform:uppercase;letter-spacing:2.5px;color:var(--text)}"
+".stnum{font-family:'Barlow Condensed',sans-serif;font-size:44px;font-weight:900;color:rgba(0,0,0,.05);line-height:1;margin-left:auto}"
+".slead{font-family:'Barlow Condensed',sans-serif;font-size:19px;font-weight:700;color:var(--text);line-height:1.4;margin-bottom:14px;font-style:italic}"
+".stext{font-size:14px;line-height:1.9;color:#444;margin-bottom:18px;white-space:pre-line}"
+".hbox{background:var(--gold-light);border-left:4px solid var(--gold);border-radius:0 6px 6px 0;padding:16px 20px;margin:20px 0;display:flex;align-items:flex-start;gap:12px}"
+".hbico{font-size:20px;flex-shrink:0;margin-top:2px}.hblbl{font-family:'Barlow Condensed',sans-serif;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:2px;color:var(--gold-dark);margin-bottom:4px}"
+".hbtx{font-size:13px;color:#7A5200;line-height:1.6;font-weight:500}"
+".tagrow{display:flex;flex-wrap:wrap;gap:8px;margin-top:16px}"
+".tpill{display:inline-flex;align-items:center;gap:5px;padding:5px 13px;border-radius:3px;font-family:'Barlow Condensed',sans-serif;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;background:#F0FDF4;color:#14532d}"
+".igrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:14px}"
+".icard{background:#fff;border:1px solid var(--border);border-radius:8px;padding:18px 16px;display:flex;flex-direction:column;align-items:center;text-align:center;gap:6px}"
+".tgrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px}"
+".tcard{background:#fff;border:1px solid var(--border);border-radius:10px;padding:18px;display:flex;flex-direction:column;gap:10px}"
+".tc-badge{display:inline-flex;width:fit-content;padding:3px 10px;border-radius:3px;font-family:'Barlow Condensed',sans-serif;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:1px;background:var(--gold-light);color:var(--gold-dark)}"
+".tc-title{font-family:'Barlow Condensed',sans-serif;font-size:17px;font-weight:800;color:var(--text);line-height:1.2}"
+".tc-meta{display:flex;flex-wrap:wrap;gap:5px 12px;font-size:11px;color:var(--muted)}"
+".tc-price{font-family:'Barlow Condensed',sans-serif;font-size:22px;font-weight:900;color:var(--gold-dark);line-height:1}"
+".tc-desc{font-size:12px;color:#555;line-height:1.6}"
+".tc-inc{display:flex;flex-direction:column;gap:3px}"
+".tc-inc div{font-size:11px;color:#444}"
+".tc-cta{margin-top:auto;background:var(--gold);color:#fff;border:none;border-radius:5px;padding:11px 18px;font-family:'Barlow Condensed',sans-serif;font-size:13px;font-weight:900;letter-spacing:.8px;text-transform:uppercase;cursor:pointer;text-align:center;text-decoration:none;display:block}"
+".diffcard{background:#fff;border:2px solid var(--gold-dark);border-radius:0;box-shadow:5px 5px 0 var(--gold);padding:20px 22px}"
+".difflabel{font-family:'Barlow Condensed',sans-serif;font-size:26px;font-weight:900;text-transform:uppercase;letter-spacing:1px}"
+".diffbars{display:flex;gap:5px;margin:12px 0 4px}.diffbar{flex:1;height:10px;border-radius:0}"
+".diffdesc{font-size:13px;color:#444;line-height:1.7;margin-top:10px}"
+".difftags{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px}"
+".difftag{display:inline-flex;align-items:center;gap:6px;padding:6px 12px;border-radius:0;font-family:'Barlow Condensed',sans-serif;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:.5px;border:2px solid}"
+".difftag.apto{color:#166534;border-color:#166534;background:#F0FDF4}"
+".difftag.noapto{color:#991B1B;border-color:#991B1B;background:#FEF2F2}"
+".tmgrid{display:grid;grid-template-columns:repeat(6,1fr);gap:6px;margin-top:10px}"
+"@media(max-width:600px){.tmgrid{grid-template-columns:repeat(4,1fr)}}"
+".tmcell{display:flex;flex-direction:column;align-items:center;gap:3px;padding:9px 4px;border-radius:4px}"
+".tmcell .tmico{font-size:13px;line-height:1}"
+".tmcell .tmmes{font-family:'Barlow Condensed',sans-serif;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.5px}"
+".tmcell.ideal{background:#F0FDF4;color:#166534}.tmcell.posible{background:#FEF3C7;color:#92400E}"
+".tmcell.evitar{background:#FEE2E2;color:#991B1B}.tmcell.na{background:#F3F4F6;color:#B0B0B0}"
+".tmleg{display:flex;flex-wrap:wrap;gap:14px;margin-top:10px;font-size:11px;color:#555}"
+".tmleg span{display:inline-flex;align-items:center;gap:5px}.tmdot{width:9px;height:9px;border-radius:2px;display:inline-block}"
+".iico{width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:18px;background:var(--gold-light)}"
+".ilbl{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1.3px;color:var(--muted)}"
+".ival{font-family:'Barlow Condensed',sans-serif;font-size:16px;font-weight:900;color:var(--text);line-height:1.2}"
+".gal{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:10px}"
+".gal-i{aspect-ratio:4/3;border-radius:8px;overflow:hidden;background:#1a1a2e;background-size:cover;background-position:center}"
+".gal-i img{width:100%;height:100%;object-fit:cover}"
+".entradas-table{width:100%;border-collapse:collapse;font-size:12px;background:#fff;border-radius:8px;overflow:hidden;border:1px solid var(--border)}"
+".entradas-table th{background:var(--black);color:#fff;padding:10px 14px;text-align:left;font-family:'Barlow Condensed',sans-serif;font-size:10px;text-transform:uppercase;letter-spacing:1px}"
+".entradas-table td{padding:12px 14px;border-bottom:1px solid var(--border)}"
+".entrada-tipo{font-weight:700}.entrada-precio{font-family:'Barlow Condensed',sans-serif;font-size:16px;font-weight:900;color:var(--gold-dark)}"
+".entrada-link{color:#25D366;font-weight:700;font-size:11px}"
+"#mapel iframe{width:100%;height:300px;border-radius:8px;border:1px solid var(--border)}"
+".mapacts{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-top:14px}"
+".mabtn{display:flex;align-items:center;justify-content:center;gap:7px;padding:11px 14px;border-radius:4px;font-family:'Barlow Condensed',sans-serif;font-size:13px;font-weight:800;letter-spacing:.5px;text-transform:uppercase;cursor:pointer;border:2px solid;transition:all .15s}"
+".mabtn.gold{background:var(--gold);color:#fff;border-color:var(--gold)}.mabtn.dark{background:var(--black);color:#fff;border-color:var(--black)}"
+".mabtn.green{background:#fff;color:#25D366;border-color:#25D366}.mabtn.outline{background:#fff;color:var(--text);border-color:var(--border)}"
+".rblock{display:flex;gap:24px;align-items:center;padding:22px;background:var(--warm);border-radius:8px;border:1px solid var(--border);margin-bottom:24px;flex-wrap:wrap}"
+".rbavg{font-family:'Barlow Condensed',sans-serif;font-size:48px;font-weight:900;color:var(--gold);line-height:1;text-align:center}"
+".rbstars{display:flex;gap:3px;justify-content:center;margin:4px 0}.rbst{font-size:16px;color:#DDD}.rbst.on{color:var(--gold)}"
+".rbcnt{font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:1px;text-align:center}"
+".rvlist{display:flex;flex-direction:column;gap:14px}"
+".rvitem{background:#fff;border:1px solid var(--border);border-radius:10px;padding:16px 18px}"
+".rvhead{display:flex;align-items:center;gap:9px;margin-bottom:9px}"
+".rvav{width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:'Barlow Condensed',sans-serif;font-weight:900;font-size:12px;flex-shrink:0;background:var(--gold);color:#fff}"
+".rvname{font-family:'Barlow Condensed',sans-serif;font-size:14px;font-weight:900;color:var(--text)}"
+".rvstars{display:flex;gap:1px;margin-left:auto}.rvst{font-size:11px;color:#DDD}.rvst.on{color:var(--gold)}"
+".rvtx{font-size:13px;color:#444;line-height:1.7}"
+".wr{background:#fff;border:1.5px solid var(--border);border-radius:10px;padding:20px;margin-top:20px}"
+".wrtitle{font-family:'Barlow Condensed',sans-serif;font-size:18px;font-weight:900;text-transform:uppercase;letter-spacing:1.5px;color:var(--text);margin-bottom:14px}"
+".wrlbl{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--muted);display:block;margin-bottom:4px}"
+".wrinp{width:100%;border:1.5px solid var(--border);border-radius:5px;padding:10px 12px;font-family:'Outfit',sans-serif;font-size:13px;color:var(--text);background:#fff;outline:none;margin-bottom:12px}"
+".wrinp:focus{border-color:var(--gold)}textarea.wrinp{resize:vertical;min-height:88px}"
+".sprow{display:flex;gap:5px;margin-bottom:12px}.spk{font-size:26px;cursor:pointer;color:#DDD;user-select:none}.spk.on{color:var(--gold)}"
+".wrsub{background:var(--black);color:#fff;border:none;border-radius:4px;padding:11px 22px;font-family:'Barlow Condensed',sans-serif;font-size:14px;font-weight:900;letter-spacing:1px;text-transform:uppercase;cursor:pointer;width:100%}"
+".wrsub:disabled{background:#ccc;cursor:not-allowed}"
+".wrok{text-align:center;padding:12px;font-size:13px;color:#166534;font-weight:600;display:none;background:#F0FDF4;border-radius:5px;margin-top:10px}"
+".cgrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px}"
+".cbtn{display:flex;align-items:center;justify-content:center;gap:8px;padding:14px 18px;border-radius:6px;font-family:'Barlow Condensed',sans-serif;font-size:14px;font-weight:900;letter-spacing:.8px;text-transform:uppercase;cursor:pointer;border:2px solid}"
+".cbtn.gold{background:var(--gold);color:#fff;border-color:var(--gold)}.cbtn.dark{background:var(--black);color:#fff;border-color:var(--black)}"
+".cbtn.green{background:#fff;color:#25D366;border-color:#25D366}.cbtn.blue{background:#fff;color:#1a73e8;border-color:#1a73e8}"
+".faqi{border:1px solid var(--border);border-radius:8px;margin-bottom:8px;background:#fff}"
+".faqi summary{padding:14px 16px;cursor:pointer;font-weight:700;font-size:13px;list-style:none;display:flex;justify-content:space-between}"
+".faqi summary::-webkit-details-marker{display:none}.faqi summary::after{content:'+';color:var(--gold);font-weight:900}"
+".faqi[open] summary::after{content:'\\2212'}.faqi p{padding:0 16px 14px;font-size:12px;color:#555;line-height:1.7}"
+".pbanner{background:#fff3cd;border-top:3px solid #ffc107;color:#856404;padding:.7rem 4%;font-size:12px;text-align:center}"
+".itab{padding:8px 16px;font-family:Barlow Condensed,sans-serif;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:1px;cursor:pointer;border:none;background:none;color:var(--muted);border-bottom:3px solid transparent;margin-bottom:-1px}.itin-panel{display:none}.itin-panel.on{display:block}.itab.on{color:var(--gold);border-color:var(--gold)}.itin-timeline{display:flex;flex-direction:column;gap:0;position:relative}.itin-step{display:flex;gap:14px;padding-bottom:20px;position:relative}.itin-dot{width:32px;height:32px;border-radius:50%;background:#fff;border:2px solid var(--border);display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0;z-index:1}.itin-dot.on{border-color:var(--gold);background:var(--gold-light)}.itin-body{flex:1;padding-top:4px}.itin-time{font-size:10px;font-weight:700;color:var(--gold-dark);text-transform:uppercase;letter-spacing:1px;margin-bottom:3px}.itin-title{font-family:Barlow Condensed,sans-serif;font-size:16px;font-weight:800;color:var(--text);margin-bottom:5px}.itin-desc{font-size:12px;color:#555;line-height:1.65;margin-bottom:8px}.itin-tags{display:flex;flex-wrap:wrap;gap:5px}.itin-tag{background:var(--warm);border:1px solid var(--border);border-radius:4px;padding:2px 8px;font-size:10px;font-weight:700;color:var(--text)}.tip-card{background:#fff;border:1px solid var(--border);border-radius:10px;padding:16px;display:flex;gap:12px;align-items:flex-start}.tip-icon{font-size:20px;flex-shrink:0;width:38px;height:38px;border-radius:8px;background:var(--warm);display:flex;align-items:center;justify-content:center}.tip-title{font-family:Barlow Condensed,sans-serif;font-size:15px;font-weight:800;color:var(--text);margin-bottom:4px}.tip-text{font-size:12px;color:#555;line-height:1.6;margin-bottom:8px}.tip-tag{display:inline-block;padding:2px 8px;border-radius:4px;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:1px}.tip-gold{background:#FDF3E0;color:#92400E}.tip-red{background:#FEE2E2;color:#991B1B}.tip-green{background:#D1FAE5;color:#065F46}.tip-blue{background:#DBEAFE;color:#1E3A5F}.tips-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px}.fauna-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:10px}.fauna-card{background:#fff;border:1px solid var(--border);border-radius:8px;padding:14px;text-align:center}.fauna-emoji{font-size:26px;margin-bottom:6px;display:block}.fauna-name{font-size:11px;font-weight:700;color:var(--text);margin-bottom:3px}.fauna-fact{font-size:10px;color:var(--muted);line-height:1.5}.footer{background:var(--black);border-top:3px solid var(--gold);padding:30px 4% 20px;text-align:center}"
+".flogo{font-family:'Barlow Condensed',sans-serif;font-size:20px;font-weight:900;letter-spacing:4px;color:#fff;margin-bottom:8px}.flogo em{color:var(--gold);font-style:normal}"
+".fcopy{color:rgba(255,255,255,.35);font-size:10px;margin-top:14px}"
+".fcopy a{color:rgba(255,255,255,.45)}";

function buildHTML(d, det, fotos, resenas) {
  var cat   = d.categoria_slug || 'sitio';
  var label = CAT_LABEL[cat] || 'Destino';
  var dir   = CAT_DIR[cat]   || 'index.html';
  var grad  = d.hero_bg || CAT_GRAD[cat] || CAT_GRAD.sitio;
  // foto_hero puede venir como foto_hero, foto, o photos[0]
  var hero = d.foto_hero || d.foto || '';
  // Si no hay foto, usar un Unsplash generico por categoria
  var heroFallbacks = {
    hostal: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200&q=80',
    comida: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1200&q=80',
    sitio:  'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=1200&q=80',
    evento: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=1200&q=80',
  };
  if (!hero) hero = heroFallbacks[cat] || heroFallbacks.sitio;
  var rat   = d.rating ? parseFloat(d.rating) : 0;
  var nRes  = parseInt(d.total_resenas||0);

  var amenidades   = safeJSON(det.amenidades);   if(!Array.isArray(amenidades))   amenidades=[];
  var habitaciones = safeJSON(det.habitaciones); if(!Array.isArray(habitaciones)) habitaciones=[];
  var faqs         = safeJSON(det.faqs);         if(!Array.isArray(faqs))         faqs=[];
  var checkin  = det.checkin  || '';
  var checkout = det.checkout || '';
  // Campos especificos de sitio turistico desde tags JSONB
  var tags = (d.tags && typeof d.tags === 'object') ? d.tags : {};
  var tipoActividad  = tags.tipo_actividad  || '';
  var dificultad     = tags.dificultad      || '';
  var dificultadDesc = tags.dificultad_desc || '';
  var dificultadTags = safeJSON(tags.dificultad_tags); if(!Array.isArray(dificultadTags)) dificultadTags=[];
  var temporadaMatriz = (tags.temporada_matriz && typeof tags.temporada_matriz === 'object' && !Array.isArray(tags.temporada_matriz)) ? tags.temporada_matriz : null;
  var duracion       = tags.duracion        || '';
  var horarioVisita  = tags.horario_visita  || d.horario || '';
  var precioEntrada  = tags.precio_entrada  || d.precio_desde || '';
  var distancia      = tags.distancia       || '';
  var comoLlegar     = tags.como_llegar     || d.como_llegar || '';
  var permisos       = tags.permisos        || '';
  // BUG-A fix (ver ANALISIS_PARIDAD): safeJSON() es el parser primario; si tags.equipamiento
  // llega como string separado por comas (dato legado o de publicar-lugar.js) y no es JSON
  // valido, safeJSON devuelve el string tal cual -- en ese caso se hace el split manual.
  // Antes existian DOS declaraciones de "var equipamiento": la segunda pisaba en silencio
  // el resultado de la primera y el fallback de comas nunca se ejecutaba.
  var equipRaw = tags.equipamiento;
  var equipamiento = safeJSON(equipRaw);
  if (!Array.isArray(equipamiento)) {
    if (typeof equipRaw === 'string' && equipRaw.length > 2) {
      equipamiento = equipRaw.split(',').map(function(t){ return t.trim(); }).filter(Boolean);
    } else {
      equipamiento = [];
    }
  }
  var temporada      = safeJSON(tags.temporada);    if(!Array.isArray(temporada))    temporada=[];
  var entradas       = safeJSON(tags.entradas);     if(!Array.isArray(entradas))     entradas=[];
  var tours          = safeJSON(tags.tours);         if(!Array.isArray(tours))        tours=[];
  var itinerario     = safeJSON(tags.itinerario);   if(!Array.isArray(itinerario))   itinerario=[];
  var faunaFlora     = tags.fauna_flora  || '';
  // limpiar fauna: si es texto con {}, extraer nombres entre comas
  var faunaRaw = faunaFlora;
  var secretos       = tags.secretos     || '';
  var regulaciones   = tags.regulaciones || '';

  // Campos especificos de hostal desde tags JSONB (TASK-001)
  var tipoAlojamiento  = tags.tipo_alojamiento    || '';
  var reglasCasa       = tags.reglas_casa         || '';
  var politicaCancel   = tags.politica_cancelacion|| '';
  var edadMinima       = tags.edad_minima         || '';
  var mascotas         = tags.mascotas            || '';
  var cocinaCompartida = tags.cocina_compartida   || '';
  var recepcionInfo    = tags.recepcion           || '';
  var barrioDescripcion= tags.barrio_descripcion  || '';
  var actividadesHostal = safeJSON(tags.actividades);    if(!Array.isArray(actividadesHostal)) actividadesHostal=[];
  var queIncluye        = safeJSON(tags.que_incluye);    if(!Array.isArray(queIncluye))        queIncluye=[];
  var transporteHostal  = safeJSON(tags.transporte);     if(!Array.isArray(transporteHostal))  transporteHostal=[];
  var eventosHostal     = safeJSON(tags.eventos_hostal); if(!Array.isArray(eventosHostal))     eventosHostal=[];

  // Campos especificos de comida desde tags JSONB (TASK-002)
  var tipoComida      = tags.tipo_comida     || '';
  var cocinaTipo       = tags.cocina          || '';
  var precioPromedio   = tags.precio_promedio || '';
  var ambienteComida   = tags.ambiente        || '';
  var terrazaComida    = tags.terraza         || '';
  var reservasComida   = tags.reservas        || '';
  var domicilioComida  = tags.domicilio       || '';
  var rappiUrl         = tags.rappi           || '';
  var ifoodUrl         = tags.ifood           || '';
  var domicilioZona    = tags.domicilio_zona  || '';
  var menuDestacado = safeJSON(tags.menu_destacado); if(!Array.isArray(menuDestacado)) menuDestacado=[];
  var opcionesDieta = safeJSON(tags.opciones_dieta); if(!Array.isArray(opcionesDieta)) opcionesDieta=[];
  var domicilioPlataformas = safeJSON(tags.domicilio_plataformas); if(!Array.isArray(domicilioPlataformas)) domicilioPlataformas=[];
  // horario_detallado es un objeto {dia:{abre,cierra,estado}}, no un arreglo
  var horarioDetallado = (tags.horario_detallado && typeof tags.horario_detallado === 'object' && !Array.isArray(tags.horario_detallado)) ? tags.horario_detallado : null;

  if (cat === 'comida') {
    console.log('[TRACE][pagina-comida]',
      'platos=' + menuDestacado.length,
      'opciones_dieta=' + opcionesDieta.length,
      'horario_detallado=' + (horarioDetallado ? Object.keys(horarioDetallado).length : 0),
      'domicilio_plataformas=' + domicilioPlataformas.length);
  }

  var bookingUrl = det.booking_url     || d.booking     || '';
  var hwUrl      = det.hostelworld_url || d.hostelworld || '';
  var airbnbUrl  = det.airbnb_url      || d.airbnb      || '';

  var galAll = (fotos||[]).map(function(f){ return f.url || f; }).filter(Boolean);
  if (hero && galAll.indexOf(hero) === -1) galAll.unshift(hero);
  // Si no hay galeria, usar el hero como unica foto
  if (!galAll.length && hero) galAll = [hero];

  var hasLatLng = d.lat && d.lng && parseFloat(d.lat)!==0 && parseFloat(d.lng)!==0;

  // -- HERO: imagen principal + grid de hasta 3 mas --------------
  var heroMainStyle = hero ? "background-image:url('"+esc(hero)+"')" : "background:"+grad;
  var heroThumbs = '';
  if (galAll.length > 1) {
    heroThumbs = galAll.slice(1,4).map(function(u){
      return '<div class="pth" style="background-image:url(\''+esc(u)+'\')"></div>';
    }).join('');
  }

  // -- HQI: chips de informacion rapida bajo el titulo (TSK-013 Hero) --
  // BUG-011 fix (ver BUGS_HISTORICOS.md): antes existia una SEGUNDA
  // declaracion "var heroThumbs = ''" en este bloque que pisaba en
  // silencio el valor ya calculado en la seccion HERO de arriba
  // (linea ~269), dejando el contenedor .prow siempre vacio aunque
  // hubiera fotos de galeria. Tambien existia "heroBtns", calculado
  // aqui pero nunca usado (el render final arma sus propios botones
  // en la seccion <section class="hero">) -- codigo muerto, eliminado.
  var hqi = [];
  if (d.ciudad) hqi.push('<div class="hqi">\u29BF '+esc(d.ciudad)+(d.region?', '+esc(d.region):'')+'</div>');
  if (nRes>0) {
    hqi.push('<div class="hqi">\u2605 '+rat.toFixed(1)+' \u00b7 '+nRes+' rese\u00f1as</div>');
  } else {
    // Fallback pedido en Sprint 2: evitar que un lugar recien
    // publicado se vea "vacio" sin ninguna senal de confianza.
    hqi.push('<div class="hqi">\u2605 4.8 \u00b7 Nuevo</div>');
  }
  if (d.precio_desde) hqi.push('<div class="hqi">\u0024 Desde '+esc(money(d.precio_desde))+'</div>');
  if (duracion)      hqi.push('<div class="hqi">\u23F1 '+esc(duracion)+'</div>');
  if (horarioVisita) hqi.push('<div class="hqi">\u23F0 '+esc(horarioVisita)+'</div>');

  // -- GSTRIP (rating sticky bar) ---------------------------------
  var gstrip = '';
  if (nRes > 0 || d.precio_desde) {
    var starsHtml = [1,2,3,4,5].map(function(i){
      return '<span class="gstar'+(i<=Math.round(rat)?' on':'')+'">*</span>';
    }).join('');
    gstrip = '<div class="gstrip">'
      + (nRes>0 ? '<div><div class="gsavg">'+rat.toFixed(1)+'</div><div class="gstars">'+starsHtml+'</div><div class="gsrv">'+nRes+' resenas</div></div><div class="gsdiv"></div>' : '')
      + (d.precio_desde ? '<div class="gsprice"><div class="gspl">Desde</div><div class="gspv">'+esc(money(d.precio_desde))+'</div></div>' : '')
      + (d.whatsapp ? '<button class="gscta" onclick="window.open(\'https://wa.me/'+esc(d.whatsapp)+'\',\'_blank\')">Reservar -></button>' : '')
      + '</div>';
  }

  var secNum = 1;
  function nextNum() { return secNum++; }

  // -- SECCI??N: Descripcion ----------------------------------------
  var secDescripcion = '<section class="ssec bwarm" id="descripcion"><div class="sin">'
    + '<div class="strow"><div class="sgl"></div><h2 class="stitle bc">Sobre este lugar</h2><div class="stnum">'+nextNum()+'</div></div>'
    + (d.lead ? '<p class="slead bc">'+esc(d.lead)+'</p>' : '')
    + (d.descripcion ? '<p class="stext">'+esc(d.descripcion)+'</p>' : '')
    + (d.highlight ? '<div class="hbox"><span class="hbico">\u2605</span><div><div class="hblbl">Destacado</div><div class="hbtx">'+esc(d.highlight)+'</div></div></div>' : '')
    + (amenidades.length ? '<div class="tagrow">'+amenidades.map(function(a){ return '<span class="tpill">'+esc(typeof a==='string'?a:(a.nombre||''))+'</span>'; }).join('')+'</div>' : '')
    + '</div></section>';

  // -- SECCI??N: Info rapida (iconos) -------------------------------
  var infoCards = [];
  if (d.tipo)     infoCards.push({ico:'\u2302',lbl:'Tipo',val:d.tipo});
  if (checkin)    infoCards.push({ico:'\uD83D\uDD11',lbl:'Check-in',val:checkin+(checkout?' / '+checkout:'')});
  if (d.capacidad)infoCards.push({ico:'\uD83D\uDC65',lbl:'Capacidad',val:d.capacidad});
  if (d.horario)  infoCards.push({ico:'\u23F0',lbl:'Horario',val:d.horario});
  if (d.precio_desde) infoCards.push({ico:'\uD83D\uDCB0',lbl:'Precio desde',val:money(d.precio_desde)});
  if (d.barrio)   infoCards.push({ico:'\u29BF',lbl:'Zona',val:d.barrio});

  var secInfo = infoCards.length ? '<section class="ssec bwhite" id="info"><div class="sin">'
    + '<div class="strow"><div class="sgl"></div><h2 class="stitle bc">Informacion rapida</h2><div class="stnum">'+nextNum()+'</div></div>'
    + '<div class="igrid">'+infoCards.map(function(c){
        return '<div class="icard"><div class="iico">'+c.ico+'</div><div class="ilbl">'+esc(c.lbl)+'</div><div class="ival">'+esc(c.val)+'</div></div>';
      }).join('')+'</div></div></section>' : '';

  // -- SECCI??N: Galeria ---------------------------------------------
  // -- SECCI??N: Datos especificos del sitio turistico --------------
  var secSitio = '';
  if (cat === 'sitio' && (tipoActividad || dificultad || duracion || distancia || horarioVisita || precioEntrada || temporada.length || temporadaMatriz || permisos)) {
    var sitioCards = [];
    if (tipoActividad) sitioCards.push({ico:'\ud83c\udf3f',lbl:'Actividad',val:tipoActividad});
    if (duracion)      sitioCards.push({ico:'\u23f1\ufe0f',lbl:'Duraci\u00f3n',val:duracion});
    if (distancia)     sitioCards.push({ico:'\ud83d\udce6',lbl:'Distancia',val:distancia});
    if (horarioVisita) sitioCards.push({ico:'\u23f0',lbl:'Horario',val:horarioVisita});
    if (precioEntrada) sitioCards.push({ico:'\ud83c\udfab',lbl:'Entrada',val:precioEntrada});

    // Temporada: matriz de 12 meses (Ideal/Posible/Evitar) cuando existe
    // tags.temporada_matriz; si no, cae al modelo legado de rangos de
    // texto (tags.temporada[]) para no romper destinos ya publicados
    // que aun no migraron al nuevo campo.
    var MESES_ORDER = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    var STATUS_META = {
      ideal:   {ico:'\u2605', label:'Ideal \u2014 temporada seca',      dot:'#16a34a', cls:'ideal'},
      posible: {ico:'~',      label:'Posible \u2014 lluvias moderadas', dot:'#d97706', cls:'posible'},
      evitar:  {ico:'\u2717', label:'Evitar \u2014 lluvias intensas',   dot:'#dc2626', cls:'evitar'}
    };
    var temporadaHTML = '';
    if (temporadaMatriz) {
      var usedStatuses = {};
      var cellsHTML = MESES_ORDER.map(function(m){
        var st = temporadaMatriz[m] || '';
        var meta = STATUS_META[st];
        if (meta) usedStatuses[st] = true;
        return '<div class="tmcell '+(meta?meta.cls:'na')+'"><span class="tmico">'+(meta?meta.ico:'\u00b7')+'</span><span class="tmmes">'+m+'</span></div>';
      }).join('');
      var legendHTML = Object.keys(STATUS_META).filter(function(k){ return usedStatuses[k]; }).map(function(k){
        return '<span><span class="tmdot" style="background:'+STATUS_META[k].dot+'"></span>'+STATUS_META[k].label+'</span>';
      }).join('');
      temporadaHTML = '<div style="margin-top:14px"><div class="strow" style="margin-bottom:8px"><div class="sgl"></div><h3 class="stitle bc" style="font-size:14px">Mejor \u00e9poca para visitar</h3></div>'
        + '<div class="tmgrid">'+cellsHTML+'</div>'
        + (legendHTML ? '<div class="tmleg">'+legendHTML+'</div>' : '')
        + '</div>';
    } else if (temporada.length) {
      temporadaHTML = '<div style="margin-top:14px"><div class="strow" style="margin-bottom:8px"><div class="sgl"></div><h3 class="stitle bc" style="font-size:14px">Mejor \u00e9poca para visitar</h3></div><div class="tagrow">'+temporada.map(function(m){return '<span class="tpill" style="background:#EEF2FF;color:#3730a3">\ud83d\udcc5 '+esc(m)+'</span>';}).join('')+'</div></div>';
    }

    secSitio = '<section class="ssec bwhite" id="sitio-info"><div class="sin">'
      + '<div class="strow"><div class="sgl"></div><h2 class="stitle bc">Datos del sitio</h2><div class="stnum">'+nextNum()+'</div></div>'
      + '<div class="igrid">'+sitioCards.map(function(c){
          return '<div class="icard"><div class="iico">'+c.ico+'</div><div class="ilbl">'+esc(c.lbl)+'</div><div class="ival">'+esc(c.val)+'</div></div>';
        }).join('')+'</div>'
      + temporadaHTML
      + (permisos ? '<div class="hbox" style="margin-top:16px;background:#FEF3C7;border-color:#D97706"><span class="hbico">\ud83d\udccb</span><div><div class="hblbl" style="color:#92400E">Permisos y reservas</div><div class="hbtx" style="color:#78350F">'+esc(permisos)+'</div></div></div>' : '')
      + '</div></section>';
  }

  // -- SECCION: Dificultad (Industrial Premium: bordes rectos, ---
  // -- sombra dura, dificultad_desc + dificultad_tags) ------------
  var secDificultad = '';
  if (cat === 'sitio' && dificultad) {
    var diffScale = [
      {key:'facil',     label:'Facil',     color:'#16a34a'},
      {key:'moderado',  label:'Moderado',  color:'#d97706'},
      {key:'dificil',   label:'Dificil',   color:'#dc2626'},
      {key:'extremo',   label:'Extremo',   color:'#7c2d12'}
    ];
    var normKey = dificultad.toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
    // BUG-013 fix (ver BUGS_HISTORICOS.md): admin.html ofrece la opcion
    // "Experto" en el select f-dificultad, pero esta escala solo conocia
    // la clave "extremo" -- el nivel mas alto nunca coloreaba la barra.
    // Se alias sin tocar los datos ya guardados en Neon.
    if (normKey === 'experto') normKey = 'extremo';
    var matchIdx = -1;
    diffScale.forEach(function(lv, i){ if (lv.key === normKey) matchIdx = i; });
    var activeColor = matchIdx >= 0 ? diffScale[matchIdx].color : 'var(--gold-dark)';
    var barsHTML = diffScale.map(function(lv, i){
      var isOn = matchIdx >= 0 && i <= matchIdx;
      var bg = isOn ? diffScale[matchIdx].color : '#E5E7EB';
      return '<div class="diffbar" style="background:'+bg+'"></div>';
    }).join('');
    var tagsHTML = '';
    if (dificultadTags.length) {
      tagsHTML = '<div class="difftags">' + dificultadTags.map(function(t){
        var isObj = t && typeof t === 'object';
        var texto = isObj ? (t.texto || '') : String(t || '');
        if (!texto) return '';
        var apto = isObj ? (t.apto !== false) : true;
        return '<span class="difftag '+(apto?'apto':'noapto')+'">'+(apto?'\u2713':'\u2717')+' '+esc(texto)+'</span>';
      }).join('') + '</div>';
    }
    secDificultad = '<section class="ssec bwarm" id="dificultad"><div class="sin">'
      + '<div class="strow"><div class="sgl"></div><h2 class="stitle bc">Nivel de dificultad</h2><div class="stnum">'+nextNum()+'</div></div>'
      + '<div class="diffcard" style="border-color:'+activeColor+'">'
      + '<div class="difflabel" style="color:'+activeColor+'">'+esc(matchIdx>=0?diffScale[matchIdx].label:dificultad)+'</div>'
      + '<div class="diffbars">'+barsHTML+'</div>'
      + (dificultadDesc ? '<div class="diffdesc">'+esc(dificultadDesc)+'</div>' : (matchIdx<0 ? '<div class="diffdesc">'+esc(dificultad)+'</div>' : ''))
      + tagsHTML
      + '</div>'
      + '</div></section>';
  }

  var secEntradas = ''; 
  if (cat === 'sitio' && entradas.length) { 
      secEntradas = '<section class="ssec bwhite" id="entradas"><div class="sin">' + 
      '<div class="strow"><div class="sgl"></div><h2 class="stitle bc">Entradas y precios</h2><div class="stnum">'+nextNum()+'</div></div>' + 
      '<table class="entradas-table"><thead><tr><th>Tipo</th><th>Precio</th><th>Incluye</th><th>Comprar</th></tr></thead><tbody>' + 
      entradas.map(function(e){ 
          return '<tr><td class="entrada-tipo">'+esc(e.tipo)+'</td>' + 
          '<td class="entrada-precio">'+esc(money(e.precio))+'</td>' +
          '<td style="font-size:11px;color:#666">'+esc(e.incluye || 'Acceso general')+'</td>' +
          '<td><a class="entrada-link" href="'+(e.link || 'https://wa.me/'+d.whatsapp)+'" target="_blank">\ud83c\udfab Comprar</a></td></tr>';
      }).join('') + '</tbody></table>' + 
      '</div></section>'; 
  }


  // -- SECCION: Tours disponibles (Tours 4.0: tipo_tour, idioma, --
  // -- max_personas, checklist de inclusiones. Motor propio .tcard, --
  // -- ya no reutiliza el .icard generico) ------------------------
  var secTours = '';
  if (cat === 'sitio' && tours.length) {
    secTours = '<section class="ssec bwarm" id="tours"><div class="sin">'
      + '<div class="strow"><div class="sgl"></div><h2 class="stitle bc">Tours disponibles</h2><div class="stnum">'+nextNum()+'</div></div>'
      + '<div class="tgrid">'
      + tours.map(function(t){
          var nombreTour = t.nombre || t.name || '';
          // BUG-012 fix (ver BUGS_HISTORICOS.md): admin.html guarda
          // "descripcion" y "link_reserva" (data-field del formulario),
          // no "desc" ni "link". Se leen ambos nombres por compatibilidad
          // con datos antiguos, priorizando siempre el nombre real.
          var descTour = t.descripcion || t.desc || '';
          var linkTour = t.link_reserva || t.link || '';
          var incluyeArr = Array.isArray(t.incluye) ? t.incluye
            : (typeof t.incluye === 'string' && t.incluye ? t.incluye.split(',').map(function(s){ return s.trim(); }).filter(Boolean) : []);
          var metaBits = [];
          if (t.duracion)     metaBits.push('\uD83D\uDD50 '+esc(t.duracion));
          if (t.max_personas) metaBits.push('\uD83D\uDC65 '+esc(t.max_personas));
          if (t.idioma)       metaBits.push('\uD83D\uDDE3\uFE0F '+esc(t.idioma));
          var cta = '';
          if (linkTour) {
            cta = '<a class="tc-cta" href="'+esc(linkTour)+'" target="_blank">\uD83D\uDCAC Reservar ahora</a>';
          } else if (d.whatsapp) {
            var msg = encodeURIComponent('Hola, quiero reservar el tour "'+nombreTour+'" en '+(d.nombre||'')+'.');
            cta = '<button class="tc-cta" style="border:none" onclick="window.open(\'https://wa.me/'+esc(d.whatsapp)+'?text='+msg+'\',\'_blank\')">\uD83D\uDCAC Reservar</button>';
          }
          return '<div class="tcard">'
            + (t.tipo_tour ? '<div class="tc-badge">'+esc(t.tipo_tour)+'</div>' : '')
            + '<div class="tc-title">'+esc(nombreTour)+'</div>'
            + (metaBits.length ? '<div class="tc-meta">'+metaBits.map(function(m){return '<span>'+m+'</span>';}).join('')+'</div>' : '')
            + (t.precio ? '<div class="tc-price">'+esc(t.precio)+'</div>' : '')
            + (descTour ? '<div class="tc-desc">'+esc(descTour)+'</div>' : '')
            + (incluyeArr.length ? '<div class="tc-inc">'+incluyeArr.map(function(inc){ return '<div>\u2713 '+esc(inc)+'</div>'; }).join('')+'</div>' : '')
            + cta
            + '</div>';
        }).join('')
      + '</div></div></section>';
  }

  // -- SECCION: Que llevar --------------------------------------
  var secChecklist = '';
  if (cat === 'sitio' && equipamiento.length) {
    var prioClass = { 'obligatorio':'tip-red', 'recomendado':'tip-gold', 'opcional':'tip-blue', 'prohibido':'tip-red' };
    secChecklist = '<section class="ssec bwhite" id="checklist"><div class="sin">'
      + '<div class="strow"><div class="sgl"></div><h2 class="stitle bc">Que llevar</h2><div class="stnum">'+nextNum()+'</div></div>'
      + '<div class="tips-grid">'
      + equipamiento.map(function(e){
          var isObj = e && typeof e === 'object';
          var nombre = isObj ? (e.item || e.nombre || '') : String(e);
          var prio = isObj ? (e.prioridad || e.priority || '') : '';
          var prioKey = prio.toString().toLowerCase();
          var cls = prioClass[prioKey] || 'tip-gold';
          return '<div class="tip-card"><div class="tip-icon">\u2713</div><div>'
            + '<div class="tip-title">'+esc(nombre)+'</div>'
            + (prio ? '<span class="tip-tag '+cls+'">'+esc(prio)+'</span>' : '')
            + '</div></div>';
        }).join('')
      + '</div></div></section>';
  }

  // -- SECCION: Itinerario --------------------------------------
  // -- Itinerario con tabs por dia, hora y tags --
  var secItinerario = '';
  if (cat === 'sitio' && itinerario.length) {
    // Agrupar pasos por dia
    var diasMap = {};
    var diasOrder = [];
    itinerario.forEach(function(it) {
      var dia = it.dia || 'Dia 1';
      if (!diasMap[dia]) { diasMap[dia] = []; diasOrder.push(dia); }
      diasMap[dia].push(it);
    });
    var tabsHTML = diasOrder.map(function(dia, i) {
      return '<div class="itab'+(i===0?' on':'')+'" onclick="switchItin(this,\'itin-d'+i+'\')"'
        +' style="padding:8px 16px;font-family:\'Barlow Condensed\',sans-serif;font-size:13px;font-weight:700;'
        +'text-transform:uppercase;letter-spacing:1px;cursor:pointer;border:none;background:none;'
        +'color:'+(i===0?'var(--gold)':'var(--muted)')+';border-bottom:3px solid '+(i===0?'var(--gold)':'transparent')+';margin-bottom:-1px">'+esc(dia)+'</div>';
    }).join('');
    var panelsHTML = diasOrder.map(function(dia, i) {
      var pasos = diasMap[dia];
      var stepsHTML = pasos.map(function(p) {
        var hora = p.hora || p.time || '';
        var titulo = p.titulo || p.title || p.descripcion || '';
        var desc = p.detalle || p.descripcion_larga || '';
        var ico = p.icono || p.icon || '\u25CF';
        var ptags = p.tags ? (Array.isArray(p.tags) ? p.tags : String(p.tags).split(',').map(function(t){return t.trim();})) : [];
        return '<div class="itin-step" style="display:flex;gap:14px;padding-bottom:20px">'
          +'<div class="itin-dot'+(hora?' on':'')+'" style="width:32px;height:32px;border-radius:50%;background:'+(hora?'var(--gold-light)':'#fff')+';border:2px solid '+(hora?'var(--gold)':'var(--border)')+';display:flex;align-items:center;justify-content:center;font-size:13px;flex-shrink:0;z-index:1">'+esc(ico)+'</div>'
          +'<div style="flex:1;padding-top:4px">'
          +(hora?'<div style="font-size:10px;font-weight:700;color:var(--gold-dark);text-transform:uppercase;letter-spacing:1px;margin-bottom:3px">'+esc(hora)+'</div>':'')
          +'<div style="font-family:\'Barlow Condensed\',sans-serif;font-size:16px;font-weight:800;color:var(--text);margin-bottom:5px">'+esc(titulo)+'</div>'
          +(desc?'<div style="font-size:12px;color:#555;line-height:1.65;margin-bottom:8px">'+esc(desc)+'</div>':'')
          +(ptags.length?'<div style="display:flex;flex-wrap:wrap;gap:5px">'+ptags.map(function(t){return '<span style="background:var(--warm);border:1px solid var(--border);border-radius:4px;padding:2px 8px;font-size:10px;font-weight:700;color:var(--text)">'+esc(t)+'</span>';}).join('')+'</div>':'')
          +'</div></div>';
      }).join('');
      return '<div class="itin-panel'+(i===0?' on':'')+'" id="itin-d'+i+'">'
        +'<div>'+stepsHTML+'</div></div>';
    }).join('');
    secItinerario = '<section class="ssec bwarm" id="itinerario"><div class="sin">'
      +'<div class="strow"><div class="sgl"></div><h2 class="stitle bc">Itinerario dia a dia</h2><div class="stnum">'+nextNum()+'</div></div>'
      +'<div style="border-bottom:1px solid var(--border);display:flex;overflow-x:auto;margin-bottom:16px">'+tabsHTML+'</div>'
      +panelsHTML
      +'</div></section>';
  }

  // -- SECCION: Fauna y flora con cards o chips --
  var secFauna = '';
  if (cat === 'sitio' && faunaFlora) {
    var faunaContent = '';
    // Intentar limpiar fauna_flora si viene malformado
    var faunaClean = faunaFlora;
    // Si viene como [{emoji,nombre,hecho}] sin comillas en keys, convertir
    if (faunaClean && faunaClean.indexOf('{') >= 0 && faunaClean.indexOf('"') === -1) {
      // Formato no-JSON: extraer texto entre llaves y tomar el segundo elemento (nombre)
      var faunaMatches = faunaClean.match(/\{[^}]+\}/g) || [];
      if (faunaMatches.length) {
        faunaClean = JSON.stringify(faunaMatches.map(function(m) {
          var parts = m.replace(/[{}]/g,'').split(',');
          return {emoji: parts[0]||'\u2731', nombre: (parts[1]||'').trim(), hecho: (parts[2]||'').trim()};
        }));
      }
    }
    // Si viene con doble stringify
    if (typeof faunaClean === 'string' && faunaClean.charAt(0) === '"') {
      try { faunaClean = JSON.parse(faunaClean); } catch(_) {}
    }
    try {
      var faunaArr = JSON.parse(faunaClean);
      if (Array.isArray(faunaArr) && faunaArr.length) {
        faunaContent = '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:10px">'
          + faunaArr.map(function(f) {
            return '<div style="background:#fff;border:1px solid var(--border);border-radius:8px;padding:14px;text-align:center">'
              +'<span style="font-size:26px;margin-bottom:6px;display:block">'+esc(f.emoji||'\u2731')+'</span>'
              +'<div style="font-size:11px;font-weight:700;color:var(--text);margin-bottom:3px">'+esc(f.nombre||f.name||'')+'</div>'
              +(f.hecho||f.fact?'<div style="font-size:10px;color:var(--muted);line-height:1.5">'+esc(f.hecho||f.fact)+'</div>':'')
              +'</div>';
          }).join('') + '</div>';
      }
    } catch(_) {
      var faunaItems = faunaFlora.split(',').map(function(f){ return f.trim(); }).filter(Boolean);
      faunaContent = '<div class="tagrow">' + faunaItems.map(function(f){
        return '<span class="tpill" style="background:#F0FDF4;color:#14532d">\u2731 '+esc(f)+'</span>';
      }).join('') + '</div>';
    }
    secFauna = '<section class="ssec bwhite" id="fauna"><div class="sin">'
      + '<div class="strow"><div class="sgl"></div><h2 class="stitle bc">Fauna y flora</h2><div class="stnum">'+nextNum()+'</div></div>'
      + faunaContent + '</div></section>';
  }

  // -- SECCION: Secretos con tip-cards o lista --
  var secSecretos = '';
  if (cat === 'sitio' && secretos) {
    var tipsContent = '';
    // Deshacer doble stringify si necesario
    var secretosClean = secretos;
    if (typeof secretosClean === 'string' && secretosClean.charAt(0) === '"') {
      try { secretosClean = JSON.parse(secretosClean); } catch(_) {}
    }
    // Si sigue siendo string con escapes
    if (typeof secretosClean === 'string') {
      secretosClean = secretosClean.replace(/\\"/g, '"').replace(/\\n/g,'');
    }
    try {
      var tipsArr = JSON.parse(secretosClean);
      if (Array.isArray(tipsArr) && tipsArr.length) {
        var tagColors = {gold:'#FDF3E0;color:#92400E', red:'#FEE2E2;color:#991B1B', green:'#D1FAE5;color:#065F46', blue:'#DBEAFE;color:#1E3A5F'};
        tipsContent = '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px">'
          + tipsArr.map(function(t) {
            var tc = t.tag_color || 'gold';
            var tagStyle = tagColors[tc] || tagColors.gold;
            return '<div style="background:#fff;border:1px solid var(--border);border-radius:10px;padding:16px;display:flex;gap:12px;align-items:flex-start">'
              +'<div style="font-size:20px;flex-shrink:0;width:38px;height:38px;border-radius:8px;background:var(--warm);display:flex;align-items:center;justify-content:center">'+esc(t.icono||'\u2605')+'</div>'
              +'<div style="flex:1"><div style="font-family:\'Barlow Condensed\',sans-serif;font-size:15px;font-weight:800;color:var(--text);margin-bottom:4px">'+esc(t.titulo||'')+'</div>'
              +'<div style="font-size:12px;color:#555;line-height:1.6;margin-bottom:8px">'+esc(t.texto||'')+'</div>'
              +(t.tag?'<span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:1px;background:'+tagStyle+'">'+esc(t.tag)+'</span>':'')
              +'</div></div>';
          }).join('') + '</div>';
      }
    } catch(_) {
      var secretosList = secretos.split('\n').map(function(s){ return s.trim(); }).filter(function(s){ return s.length > 5; });
      if (secretosList.length > 1) {
        tipsContent = '<div style="display:flex;flex-direction:column;gap:8px">' + secretosList.map(function(s) {
          return '<div style="display:flex;gap:10px;align-items:flex-start">'
            +'<span style="color:var(--gold);font-weight:900;flex-shrink:0">\u2713</span>'
            +'<span style="font-size:13px;color:#444;line-height:1.6">'+esc(s)+'</span></div>';
        }).join('') + '</div>';
      } else {
        tipsContent = '<p class="stext">'+esc(secretos)+'</p>';
      }
    }
    secSecretos = '<section class="ssec bwarm" id="secretos"><div class="sin">'
      + '<div class="strow"><div class="sgl"></div><h2 class="stitle bc">Lo que nadie te dice</h2><div class="stnum">'+nextNum()+'</div></div>'
      + tipsContent + '</div></section>';
  }

  // -- SECCION: Permisos y regulaciones -------------------------
  var secRegulaciones = '';
  if (cat === 'sitio' && regulaciones) {
    secRegulaciones = '<section class="ssec bwhite" id="regulaciones"><div class="sin">'
      + '<div class="strow"><div class="sgl"></div><h2 class="stitle bc">Permisos y regulaciones</h2><div class="stnum">'+nextNum()+'</div></div>'
      + '<div class="hbox" style="background:#FEF3C7;border-color:#D97706">'
      + '<span class="hbico">\u26A0</span>'
      + '<div><div class="hblbl" style="color:#92400E">Importante</div>'
      + '<div class="hbtx" style="color:#78350F">'+esc(regulaciones).replace(/\n/g,'<br>')+'</div></div></div>'
      + '</div></section>';
  }

  var secGaleria = galAll.length > 1 ? '<section class="ssec bwarm" id="galeria"><div class="sin">'
    + '<div class="strow"><div class="sgl"></div><h2 class="stitle bc">Galeria de fotos</h2><div class="stnum">'+nextNum()+'</div></div>'
    + '<div class="gal">'+galAll.map(function(u){ return '<div class="gal-i" style="background-image:url(\''+esc(u)+'\')"></div>'; }).join('')+'</div>'
    + '</div></section>' : '';

  // -- SECCION: Habitaciones / precios (solo hostal) ----------------
  var HAB_BADGE = {popular:'\u2605 Mas popular', female:'Solo mujeres', quiet:'Tranquila', premium:'Premium'};
  var secHabitaciones = '';
  if (habitaciones.length) {
    secHabitaciones = '<section class="ssec bwhite" id="habitaciones"><div class="sin">'
      + '<div class="strow"><div class="sgl"></div><h2 class="stitle bc">Habitaciones y precios</h2><div class="stnum">'+nextNum()+'</div></div>'
      + '<table class="entradas-table"><thead><tr><th>Tipo</th><th>Camas</th><th>Precio</th><th>Reservar</th></tr></thead><tbody>'
      + habitaciones.map(function(h){
          var tipoTxt = h.tipo || h.nombre || h.name || '';
          var badgeTxt = h.badge ? (HAB_BADGE[h.badge] || h.badge) : '';
          return '<tr><td><div class="entrada-tipo">'+esc(tipoTxt)+'</div>'
            + (h.subtitulo ? '<div class="entrada-sub" style="font-size:12px;color:var(--muted);margin-top:2px">'+esc(h.subtitulo)+'</div>' : '')
            + (badgeTxt ? '<span class="tpill" style="margin-top:6px;display:inline-block">'+esc(badgeTxt)+'</span>' : '')
            + '</td>'
            + '<td>'+esc(h.camas||h.beds||'')+'</td>'
            + '<td><div class="entrada-precio">'+esc(money(h.precio||h.price))+'</div></td>'
            + '<td>'+(d.whatsapp?'<a class="entrada-link" href="https://wa.me/'+esc(d.whatsapp)+'" target="_blank">\u2709 WhatsApp</a>':'')+'</td></tr>';
        }).join('')
      + '</tbody></table>'
      + ((checkin || checkout || recepcionInfo) ? '<div class="tagrow" style="margin-top:14px">'
          + (checkin ? '<span class="tpill">\u23F0 Check-in: '+esc(checkin)+(checkout?' / Check-out: '+esc(checkout):'')+'</span>' : '')
          + (recepcionInfo ? '<span class="tpill">Recepcion: '+esc(recepcionInfo)+'</span>' : '')
          + '</div>' : '')
      + '</div></section>';
  }

  // -- SECCION: Reglas de la casa (TASK-001, solo hostal) -----------
  var reglasQuickFacts = [];
  if (tipoAlojamiento)  reglasQuickFacts.push({ico:'\uD83C\uDFE0', lbl:'Tipo',    val:tipoAlojamiento});
  if (edadMinima)       reglasQuickFacts.push({ico:'\uD83D\uDD1E', lbl:'Edad minima', val:String(edadMinima)+' anios'});
  if (mascotas)         reglasQuickFacts.push({ico:'\uD83D\uDC3E', lbl:'Mascotas', val:mascotas});
  if (cocinaCompartida) reglasQuickFacts.push({ico:'\uD83C\uDF73', lbl:'Cocina compartida', val:cocinaCompartida});

  var reglasCasaItems = reglasCasa ? reglasCasa.split('\n').map(function(l){ return l.trim(); }).filter(function(l){ return l; }) : [];

  var secReglasCasa = (reglasCasaItems.length || politicaCancel || reglasQuickFacts.length) ?
    '<section class="ssec bwarm" id="reglas-casa"><div class="sin">'
    + '<div class="strow"><div class="sgl"></div><h2 class="stitle bc">Reglas de la casa</h2><div class="stnum">'+nextNum()+'</div></div>'
    + (reglasQuickFacts.length ? '<div class="igrid" style="margin-bottom:18px">'+reglasQuickFacts.map(function(c){
        return '<div class="icard"><div class="iico">'+c.ico+'</div><div class="ilbl">'+esc(c.lbl)+'</div><div class="ival">'+esc(c.val)+'</div></div>';
      }).join('')+'</div>' : '')
    + (reglasCasaItems.length ? '<ul class="rcasa-list" style="list-style:none;padding:0;margin:0 0 16px">'
        + reglasCasaItems.map(function(l){ return '<li style="padding:8px 0;border-bottom:1px solid var(--border)">\u2713 '+esc(l)+'</li>'; }).join('')
        + '</ul>' : '')
    + (politicaCancel ? '<div class="hbox"><strong>Politica de cancelacion:</strong> '+esc(politicaCancel)+'</div>' : '')
    + '</div></section>' : '';

  // -- SECCION: Actividades disponibles + Que incluye (TASK-001) ----
  var secActividadesHostal = (actividadesHostal.length || queIncluye.length) ?
    '<section class="ssec bwhite" id="actividades"><div class="sin">'
    + '<div class="strow"><div class="sgl"></div><h2 class="stitle bc">Actividades disponibles</h2><div class="stnum">'+nextNum()+'</div></div>'
    + (actividadesHostal.length ? '<div class="igrid">'+actividadesHostal.map(function(a){
        return '<div class="icard"><div class="iico">'+esc(a.icono||'\u2728')+'</div><div class="ilbl">'+esc(a.nombre||'')+'</div>'
          + (a.descripcion ? '<div class="ival" style="font-size:12px;font-weight:400">'+esc(a.descripcion)+'</div>' : '')
          + '</div>';
      }).join('')+'</div>' : '')
    + (queIncluye.length ? '<div style="margin-top:'+(actividadesHostal.length?'22px':'0')+'">'
        + '<div class="tagrow">'+queIncluye.map(function(qi){
            return '<span class="tpill">\u2713 '+esc(typeof qi==='string'?qi:(qi.texto||''))+'</span>';
          }).join('')+'</div></div>' : '')
    + '</div></section>' : '';

  // -- SECCION: Como llegar / Transporte (TASK-001, BUG-C) -----------
  var secTransporteHostal = transporteHostal.length ?
    '<section class="ssec bwarm" id="como-llegar"><div class="sin">'
    + '<div class="strow"><div class="sgl"></div><h2 class="stitle bc">Como llegar</h2><div class="stnum">'+nextNum()+'</div></div>'
    + (barrioDescripcion ? '<p style="margin-bottom:16px;color:var(--muted)">'+esc(barrioDescripcion)+'</p>' : '')
    + '<div class="igrid">'+transporteHostal.map(function(t){
        return '<div class="icard"><div class="iico">'+esc(t.icon||'\uD83D\uDE8C')+'</div><div class="ilbl">'+esc(t.title||'')+'</div>'
          + (t.detail ? '<div class="ival" style="font-size:12px;font-weight:400">'+esc(t.detail)+'</div>' : '')
          + '</div>';
      }).join('')+'</div>'
    + '</div></section>' : '';

  // -- SECCION: Eventos del hostal (TASK-001, BUG-C) -----------------
  var secEventosHostal = eventosHostal.length ?
    '<section class="ssec bwhite" id="eventos-hostal"><div class="sin">'
    + '<div class="strow"><div class="sgl"></div><h2 class="stitle bc">Eventos del hostal</h2><div class="stnum">'+nextNum()+'</div></div>'
    + '<table class="entradas-table"><thead><tr><th>Dia</th><th>Hora</th><th>Evento</th><th>Precio</th></tr></thead><tbody>'
    + eventosHostal.map(function(ev){
        return '<tr><td>'+esc(ev.dia||'')+'</td><td>'+esc(ev.hora||'')+'</td>'
          + '<td><div class="entrada-tipo">'+esc(ev.titulo||'')+'</div>'
          + (ev.desc ? '<div class="entrada-sub" style="font-size:12px;color:var(--muted);margin-top:2px">'+esc(ev.desc)+'</div>' : '')
          + '</td>'
          + '<td><div class="entrada-precio">'+esc(ev.precio||'Gratis')+'</div></td></tr>';
      }).join('')
    + '</tbody></table></div></section>' : '';

  // -- SECCION: Perfil gastronomico (TASK-002, solo comida) -----------
  var MENU_BADGE = { popular:'\u2b50 Mas popular', vegano:'\ud83c\udf31 Vegano', sin_gluten:'Sin gluten' };
  var perfilComidaCards = [];
  if (tipoComida)     perfilComidaCards.push({ ico:'\ud83c\udf7d', lbl:'Tipo',            val:tipoComida });
  if (cocinaTipo)      perfilComidaCards.push({ ico:'\ud83c\udf74', lbl:'Cocina',           val:cocinaTipo });
  if (precioPromedio)  perfilComidaCards.push({ ico:'\ud83d\udcb0', lbl:'Precio promedio',  val:precioPromedio });
  if (ambienteComida)  perfilComidaCards.push({ ico:'\u2728',       lbl:'Ambiente',         val:ambienteComida });
  if (terrazaComida === 'Si')  perfilComidaCards.push({ ico:'\u2600', lbl:'Terraza',   val:'Si' });
  if (reservasComida === 'Si') perfilComidaCards.push({ ico:'\ud83d\udcc5', lbl:'Reservas', val:'Acepta reservas' });

  var secPerfilComida = perfilComidaCards.length ?
    '<section class="ssec bwhite" id="perfil-comida"><div class="sin">'
    + '<div class="strow"><div class="sgl"></div><h2 class="stitle bc">Cocina y ambiente</h2><div class="stnum">'+nextNum()+'</div></div>'
    + '<div class="igrid">'+perfilComidaCards.map(function(c){
        return '<div class="icard"><div class="iico">'+c.ico+'</div><div class="ilbl">'+esc(c.lbl)+'</div><div class="ival">'+esc(c.val)+'</div></div>';
      }).join('')+'</div>'
    + '</div></section>' : '';

  // -- SECCION: Menu destacado (TASK-002, solo comida) -----------------
  var secMenuDestacado = menuDestacado.length ?
    '<section class="ssec bwarm" id="menu"><div class="sin">'
    + '<div class="strow"><div class="sgl"></div><h2 class="stitle bc">Menu destacado</h2><div class="stnum">'+nextNum()+'</div></div>'
    + '<div class="igrid">'+menuDestacado.map(function(m){
        var badgeTxt = m.badge ? (MENU_BADGE[m.badge] || m.badge) : '';
        var photoDiv = m.foto ? '<div style="width:100%;height:110px;border-radius:8px;margin-bottom:10px;background-size:cover;background-position:center;background-image:url(\''+esc(m.foto)+'\')"></div>' : '';
        return '<div class="icard" style="text-align:left">'
          + photoDiv
          + '<div class="ilbl">'+esc(m.nombre||'')+'</div>'
          + '<div class="ival">'+esc(m.precio||'')+'</div>'
          + (badgeTxt ? '<span class="tpill" style="margin-top:6px;display:inline-block">'+badgeTxt+'</span>' : '')
          + '</div>';
      }).join('')+'</div>'
    + '</div></section>' : '';

  // -- SECCION: Horarios por dia (TASK-002, solo comida) ---------------
  var DIAS_ORDEN = ['Lunes','Martes','Miercoles','Jueves','Viernes','Sabado','Domingo'];
  var DIAS_LABEL = { Miercoles:'Mi\u00e9rcoles', Sabado:'S\u00e1bado' };
  var secHorariosComida = '';
  if (horarioDetallado) {
    var horarioRows = DIAS_ORDEN.map(function(dia){
      var h = horarioDetallado[dia];
      if (!h) return '';
      var estadoTxt = h.estado || 'Abierto';
      // fila "tocada" = tiene horas cargadas O el admin marco Cerrado a
      // proposito. Una fila 100% default (Abierto + horas vacias, que es
      // lo que trae la tabla estatica sin editar) no se muestra --
      // asi el bloque completo se degrada a "sin datos" si nadie llena
      // el tab de Horarios.
      if (!h.abre && !h.cierra && estadoTxt !== 'Cerrado') return '';
      var horasTxt = (estadoTxt === 'Cerrado') ? 'Cerrado' : (esc(h.abre||'')+' - '+esc(h.cierra||''));
      return '<tr><td style="font-weight:600">'+(DIAS_LABEL[dia]||dia)+'</td><td>'+horasTxt+'</td></tr>';
    }).join('');
    if (horarioRows) {
      secHorariosComida = '<section class="ssec bwhite" id="horarios"><div class="sin">'
        + '<div class="strow"><div class="sgl"></div><h2 class="stitle bc">Horarios</h2><div class="stnum">'+nextNum()+'</div></div>'
        + '<table class="entradas-table"><thead><tr><th>Dia</th><th>Horario</th></tr></thead><tbody>'+horarioRows+'</tbody></table>'
        + '</div></section>';
    }
  }

  // -- SECCION: Opciones dieteticas y domicilio (TASK-002, solo comida) --
  var deliveryBtnsComida = [];
  if (rappiUrl) deliveryBtnsComida.push('<a class="cbtn dark" href="'+esc(rappiUrl)+'" target="_blank">Rappi</a>');
  if (ifoodUrl) deliveryBtnsComida.push('<a class="cbtn dark" href="'+esc(ifoodUrl)+'" target="_blank">iFood</a>');

  var secDeliveryComida = (opcionesDieta.length || domicilioComida === 'Si' || deliveryBtnsComida.length || domicilioPlataformas.length || domicilioZona) ?
    '<section class="ssec bwarm" id="delivery"><div class="sin">'
    + '<div class="strow"><div class="sgl"></div><h2 class="stitle bc">Opciones dieteticas y domicilio</h2><div class="stnum">'+nextNum()+'</div></div>'
    + (opcionesDieta.length ? '<div class="tagrow" style="margin-bottom:16px">'+opcionesDieta.map(function(o){ return '<span class="tpill">\ud83c\udf31 '+esc(o)+'</span>'; }).join('')+'</div>' : '')
    + (domicilioComida === 'Si' ? '<div class="hbox"><strong>Domicilio:</strong> '+(domicilioZona ? 'Cobertura en '+esc(domicilioZona) : 'Disponible')
        + (domicilioPlataformas.length ? ' \u00b7 Tambien en: '+domicilioPlataformas.map(esc).join(', ') : '') + '</div>' : '')
    + (deliveryBtnsComida.length ? '<div class="cgrid" style="margin-top:14px">'+deliveryBtnsComida.join('')+'</div>' : '')
    + '</div></section>' : '';

  // -- SECCI??N: Reservar / links externos ----------------------------
  var rbtns = [];
  if (d.whatsapp) rbtns.push('<a class="cbtn green" href="https://wa.me/'+esc(d.whatsapp)+'" target="_blank">\u2709 WhatsApp</a>');
  if (bookingUrl) rbtns.push('<a class="cbtn dark" href="'+esc(bookingUrl)+'" target="_blank">[hostal] Booking.com</a>');
  if (hwUrl)      rbtns.push('<a class="cbtn dark" href="'+esc(hwUrl)+'" target="_blank"> Hostelworld</a>');
  if (airbnbUrl)  rbtns.push('<a class="cbtn gold" href="'+esc(airbnbUrl)+'" target="_blank">[casa2] Airbnb</a>');

  var secReservar = rbtns.length ? '<section class="ssec bwarm" id="reservar"><div class="sin">'
    + '<div class="strow"><div class="sgl"></div><h2 class="stitle bc">Reservar</h2><div class="stnum">'+nextNum()+'</div></div>'
    + '<div class="cgrid">'+rbtns.join('')+'</div></div></section>' : '';

  // -- SECCI??N: Mapa ----------------------------------------------
  var secMapa = '';
  if (hasLatLng) {
    var mapBtns = [];
    mapBtns.push('<a class="mabtn gold" href="https://www.google.com/maps/dir/?api=1&destination='+esc(d.lat)+','+esc(d.lng)+'" target="_blank">\u2316 Google Maps</a>');
    if (d.whatsapp) mapBtns.push('<a class="mabtn green" href="https://wa.me/'+esc(d.whatsapp)+'" target="_blank">\u2709 WhatsApp</a>');
    if (d.telefono) mapBtns.push('<a class="mabtn outline" href="tel:'+esc(d.telefono)+'">\u2706 '+esc(d.telefono)+'</a>');
    secMapa = '<section class="ssec bwhite" id="mapa"><div class="sin">'
      + '<div class="strow"><div class="sgl"></div><h2 class="stitle bc">Ubicacion y como llegar</h2><div class="stnum">'+nextNum()+'</div></div>'
      + '<div id="mapel"><iframe loading="lazy" src="https://www.google.com/maps?q='+esc(d.lat)+','+esc(d.lng)+'&z=15&output=embed"></iframe></div>'
      + (comoLlegar ? '<p class="stext" style="margin-top:14px">'+esc(comoLlegar)+'</p>' : '')
      + '<div class="mapacts">'+mapBtns.join('')+'</div>'
      + '</div></section>';
  }

  // -- SECCI??N: FAQ -----------------------------------------------
  var secFaq = faqs.length ? '<section class="ssec bwarm" id="faq"><div class="sin">'
    + '<div class="strow"><div class="sgl"></div><h2 class="stitle bc">Preguntas frecuentes</h2><div class="stnum">'+nextNum()+'</div></div>'
    + faqs.map(function(f){ return '<details class="faqi"><summary>'+esc(f.pregunta||f.q||'')+'</summary><p>'+esc(f.respuesta||f.a||'')+'</p></details>'; }).join('')
    + '</div></section>' : '';

  // -- SECCI??N: Resenas --------------------------------------------
  var rvHtml = '';
  if ((resenas||[]).length) {
    rvHtml = (resenas||[]).map(function(r){
      var nombre = 'Viajero';
      var texto  = r.texto || '';
      var m = texto.match(/^\[([^\]]+)\]\s*/);
      if (m) { nombre = m[1]; texto = texto.slice(m[0].length); }
      if (r.usuario_nombre) nombre = r.usuario_nombre;
      var rs = Math.round(r.rating||0);
      var starsR = [1,2,3,4,5].map(function(i){ return '<span class="rvst'+(i<=rs?' on':'')+'">*</span>'; }).join('');
      return '<div class="rvitem"><div class="rvhead">'
        + '<div class="rvav">'+esc(nombre.slice(0,2).toUpperCase())+'</div>'
        + '<div class="rvname">'+esc(nombre)+'</div>'
        + '<div class="rvstars">'+starsR+'</div></div>'
        + (texto?'<div class="rvtx">'+esc(texto)+'</div>':'')
        + '</div>';
    }).join('');
  }

  var secResenas = '<section class="ssec bwhite" id="resenas"><div class="sin">'
    + '<div class="strow"><div class="sgl"></div><h2 class="stitle bc">Resenas de viajeros</h2><div class="stnum">'+nextNum()+'</div></div>'
    + (nRes>0 ? '<div class="rblock"><div><div class="rbavg">'+rat.toFixed(1)+'</div><div class="rbstars">'+[1,2,3,4,5].map(function(i){return '<span class="rbst'+(i<=Math.round(rat)?' on':'')+'">*</span>';}).join('')+'</div><div class="rbcnt">'+nRes+' resenas</div></div></div>' : '')
    + (rvHtml ? '<div class="rvlist">'+rvHtml+'</div>' : '<p class="stext">Se el primero en dejar una resena.</p>')
    + '<div class="wr"><div class="wrtitle">Escribir una resena</div>'
    + '<input id="rvn" type="text" placeholder="Tu nombre" class="wrinp">'
    + '<div class="sprow" id="rv-stars">'
    + [1,2,3,4,5].map(function(i){ return '<span class="spk" data-v="'+i+'" onclick="setRvScore('+i+')">*</span>'; }).reverse().join('')
    + '</div>'
    + '<textarea id="rvt" placeholder="Que te parecio este lugar?" class="wrinp"></textarea>'
    + '<button class="wrsub" onclick="submitRv()">Publicar resena -></button>'
    + '<div class="wrok" id="rvok">\u2713 Gracias por tu resena!</div>'
    + '</div></div></section>';

  // -- SECCI??N: Contacto --------------------------------------------
  var ctBtns = [];
  if (hasLatLng) ctBtns.push('<a class="cbtn gold" href="https://www.google.com/maps/dir/?api=1&destination='+esc(d.lat)+','+esc(d.lng)+'" target="_blank">\u2316 Google Maps</a>');
  if (d.whatsapp) ctBtns.push('<a class="cbtn green" href="https://wa.me/'+esc(d.whatsapp)+'" target="_blank">\u2709 WhatsApp</a>');
  if (d.telefono) ctBtns.push('<a class="cbtn dark" href="tel:'+esc(d.telefono)+'">\u2706 Llamar</a>');
  if (d.web)       ctBtns.push('<a class="cbtn blue" href="'+esc(d.web)+'" target="_blank">\u25CB Sitio web</a>');
  if (d.instagram) ctBtns.push('<a class="cbtn blue" href="https://instagram.com/'+esc((d.instagram||'').replace('@',''))+'" target="_blank">[foto] Instagram</a>');
  if (d.email)     ctBtns.push('<a class="cbtn dark" href="mailto:'+esc(d.email)+'">\u0040 Email</a>');

  var secContact = ctBtns.length ? '<section class="ssec bwarm" id="contact"><div class="sin">'
    + '<div class="strow"><div class="sgl"></div><h2 class="stitle bc">Contacto</h2><div class="stnum">'+nextNum()+'</div></div>'
    + '<div class="cgrid">'+ctBtns.join('')+'</div></div></section>' : '';

  // -- SUBNAV STICKY: anclas solo a secciones que van a existir ------
  var subnavItems = [
    {id:'descripcion', label:'Sobre',       has:!!secDescripcion},
    {id:'galeria',     label:'Fotos',       has:!!secGaleria},
    {id:'dificultad',  label:'Dificultad',  has:!!secDificultad},
    {id:'entradas',    label:'Entradas',    has:!!secEntradas},
    {id:'tours',       label:'Tours',       has:!!secTours},
    {id:'checklist',   label:'Que llevar',  has:!!secChecklist},
    {id:'itinerario',  label:'Itinerario',  has:!!secItinerario},
    {id:'habitaciones',label:'Habitaciones',has:!!secHabitaciones},
    {id:'reglas-casa', label:'Reglas',      has:!!secReglasCasa},
    {id:'actividades', label:'Actividades', has:!!secActividadesHostal},
    {id:'como-llegar', label:'Como llegar', has:!!secTransporteHostal},
    {id:'eventos-hostal', label:'Eventos',  has:!!secEventosHostal},
    {id:'perfil-comida', label:'Cocina',    has:!!secPerfilComida},
    {id:'menu',        label:'Menu',        has:!!secMenuDestacado},
    {id:'horarios',    label:'Horarios',    has:!!secHorariosComida},
    {id:'delivery',    label:'Domicilio',   has:!!secDeliveryComida},
    {id:'reservar',    label:'Reservar',    has:!!secReservar},
    {id:'mapa',        label:'Mapa',        has:!!secMapa},
    {id:'faq',         label:'FAQ',         has:!!secFaq},
    {id:'resenas',     label:'Resenas',     has:!!secResenas}
  ].filter(function(it){ return it.has; });
  var subnav = subnavItems.length > 1 ? '<nav class="subnav">'
    + subnavItems.map(function(it, i){
        return '<a class="snlink'+(i===0?' on':'')+'" href="#'+it.id+'" onclick="document.querySelectorAll(\'.snlink\').forEach(function(l){l.classList.remove(\'on\')});this.classList.add(\'on\')">'+esc(it.label)+'</a>';
      }).join('')
    + '</nav>' : '';

  // -- ENSAMBLAR ----------------------------------------------------
  return '<!DOCTYPE html>\n<html lang="es">\n<head>\n'
    + '<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width,initial-scale=1.0">\n'
    + '<title>'+esc(d.nombre)+'  ExploraCO</title>\n'
    + '<meta name="description" content="'+esc(d.lead||d.nombre)+'">\n'
    + '<meta property="og:title" content="'+esc(d.nombre)+'  ExploraCO">\n'
    + '<meta property="og:description" content="'+esc(d.lead||'')+'">\n'
    + (hero ? '<meta property="og:image" content="'+esc(hero)+'">\n' : '')
    + '<meta property="og:type" content="place">\n'
    + '<meta name="theme-color" content="#E8A020">\n'
    + '<link rel="canonical" href="'+BASE+'/'+esc(d.slug)+'.html">\n'
    + schemaLD(d, cat) + '\n'
    + '<style>'+CSS+'</style>\n</head>\n<body>\n\n'

    + '<div class="topbar"><a class="tl" href="/index.html">EXPLORA<em>CO</em></a><div class="tsep"></div>'
    + '<div class="tbc"><a href="/index.html">Inicio</a><span>/</span><a href="/'+esc(dir)+'">'+esc(label)+'</a><span>/</span><em>'+esc(d.nombre)+'</em></div>'
    + '<div class="tra"><a class="tshare" href="/'+esc(dir)+'"><- '+esc(label)+'</a></div></div>\n\n'

    + (d.status==='draft' ? '<div class="pbanner">(reloj) Este lugar esta pendiente de revision por el equipo de ExploraCO.</div>\n' : '')

    + subnav + '\n\n'

    + '<section class="hero"><div class="hi">\n'
    + '<div class="hl"><div class="hew">'+esc(label)+'</div>'
    + '<h1 class="htitle bc">'+esc(d.nombre)+'</h1>'
    + (d.lead ? '<p class="hsub">'+esc(d.lead)+'</p>' : '')
    + (hqi.length ? '<div class="hqi-row">'+hqi.join('')+'</div>' : '')
    + '<div class="hctar">'
    + (d.whatsapp ? '<button class="hbtn" onclick="window.open(\'https://wa.me/'+esc(d.whatsapp)+'\',\'_blank\')">\u2709 Contactar</button>' : '')
    + (d.lat && d.lng ? '<button class="hobtn" onclick="window.open(\'https://www.google.com/maps/dir/?api=1&destination='+esc(d.lat)+','+esc(d.lng)+'\',\'_blank\')">\uD83D\uDDFA Como llegar</button>' : '')
    + (galAll.length>1 ? '<button class="hobtn" onclick="document.getElementById(\'galeria\').scrollIntoView({behavior:\'smooth\'})">Ver galeria -></button>' : '')
    + '</div></div>\n'
    + '<div class="hr"><div class="psm" style="'+heroMainStyle+'">'+(hero?'':'<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:48px;'+grad+'"></div>')+'</div>'
    + (heroThumbs ? '<div class="prow">'+heroThumbs+'</div>' : '')
    + '</div>\n</div></section>\n\n'

    + gstrip + '\n\n'
    + secDescripcion + '\n'
    + secInfo + '\n'
    + secSitio + '\n'
    + secDificultad + '\n'
    + secEntradas + '\n'
    + secTours + '\n'
    + secChecklist + '\n'
    + secItinerario + '\n'
    + secFauna + '\n'
    + secSecretos + '\n'
    + secRegulaciones + '\n'
    + secGaleria + '\n'
    + secHabitaciones + '\n'
    + secReglasCasa + '\n'
    + secActividadesHostal + '\n'
    + secTransporteHostal + '\n'
    + secEventosHostal + '\n'
    + secPerfilComida + '\n'
    + secMenuDestacado + '\n'
    + secHorariosComida + '\n'
    + secDeliveryComida + '\n'
    + secReservar + '\n'
    + secMapa + '\n'
    + secFaq + '\n'
    + secResenas + '\n'
    + secContact + '\n\n'

    + '<footer class="footer"><div class="flogo">EXPLORA<em>CO</em></div>'
    + '<p style="color:rgba(255,255,255,.5);font-size:11px">El directorio turistico mas completo de Colombia</p>'
    + '<div class="fcopy"><a href="/index.html">Inicio</a> &middot; <a href="/'+esc(dir)+'">'+esc(label)+'</a></div></footer>\n\n'

    + '<script>\n'
    + 'var DID="'+esc(String(d.id))+'";\n'
    + 'var rvScore=0;\n'
    + 'function setRvScore(n){rvScore=n;document.querySelectorAll("#rv-stars .spk").forEach(function(s){s.classList.toggle("on",parseInt(s.dataset.v)<=n);});}\n'
    + 'function switchItin(el,id){document.querySelectorAll(".itab").forEach(function(t){t.classList.remove("on");t.style.color="var(--muted)";t.style.borderColor="transparent";});document.querySelectorAll(".itin-panel").forEach(function(p){p.classList.remove("on");});el.classList.add("on");el.style.color="var(--gold)";el.style.borderColor="var(--gold)";var panel=document.getElementById(id);if(panel)panel.classList.add("on");}\n'
    + 'function submitRv(){\n'
    + '  var nom=document.getElementById("rvn").value.trim();\n'
    + '  var txt=document.getElementById("rvt").value.trim();\n'
    + '  if(!rvScore){alert("Selecciona una puntuacion");return;}\n'
    + '  if(!nom){alert("Ingresa tu nombre");return;}\n'
    + '  var btn=document.querySelector(".wrsub");\n'
    + '  btn.disabled=true;btn.textContent="Publicando...";\n'
    + '  fetch("/api/interacciones",{method:"POST",headers:{"Content-Type":"application/json"},'
    + '  body:JSON.stringify({tipo:"resena",destino_id:DID,rating:rvScore,texto:"["+nom+"] "+txt})})\n'
    + '  .then(function(r){return r.json();})\n'
    + '  .then(function(d){\n'
    + '    if(d.ok||d.id){\n'
    + '      document.getElementById("rvok").style.display="block";\n'
    + '    }else{btn.disabled=false;btn.textContent="Publicar resena ->";alert("Error: "+(d.error||"No se pudo publicar"));}\n'
    + '  }).catch(function(){btn.disabled=false;btn.textContent="Publicar resena ->";alert("Error de conexion.");});\n'
    + '}\n'
    + 'fetch("/api/utilidades?tipo=visitas",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({destino_id:DID})}).catch(function(){});\n'
    + '<\/script>\n</body>\n</html>';
}

module.exports = async function handler(req, res) {
  var slug = (req.query.slug || '').trim().replace(/\.html$/, '');

  if (!slug || slug.length < 3 || /^[0-9]+$/.test(slug)) {
    return res.status(404).send('<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>No encontrado \u2013 ExploraCO</title><style>body{font-family:sans-serif;text-align:center;padding:4rem 1rem;background:#FBF8F2}a{color:#E8A020}</style></head><body><h1 style="font-size:3rem;margin-bottom:1rem">404</h1><p>P\u00e1gina no encontrada.</p><p style="margin-top:1.5rem"><a href="/index.html">\u2190 Volver al inicio</a></p></body></html>');
  }

  try {
    var sql = neon(process.env.DATABASE_URL);
    var rows = await sql('SELECT d.* FROM destinos d WHERE d.slug = $1 LIMIT 1', [slug]);

    if (!rows.length) {
      return res.status(404).send('<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>No encontrado \u2013 ExploraCO</title><style>body{font-family:sans-serif;text-align:center;padding:4rem 1rem;background:#FBF8F2}a{color:#E8A020}</style></head><body><h1 style="font-size:3rem;margin-bottom:1rem">404</h1><p>El lugar <b>'+esc(slug)+'</b> no existe o fue eliminado.</p><p style="margin-top:1.5rem"><a href="/index.html">\u2190 Volver al inicio</a></p></body></html>');
    }

    var d = rows[0];
    var detRows = await sql('SELECT * FROM destinos_detalles WHERE destino_id=$1 LIMIT 1', [d.id]);
    var det = detRows.length ? detRows[0] : {};

    // Fallback: si destinos_detalles no tiene datos, usar tags JSONB de destinos
    if (!det.amenidades && d.tags) {
      var tg = safeJSON(d.tags);
      if (!Array.isArray(tg) && typeof tg === 'object') {
        det.amenidades   = tg.amenidades;
        det.habitaciones = tg.habitaciones;
        det.faqs         = tg.faqs;
        det.checkin      = tg.checkin;
        det.checkout     = tg.checkout;
      }
    }

    var fotosRows = await sql(
      'SELECT url,caption FROM destinos_fotos WHERE destino_id=$1 ORDER BY orden ASC NULLS LAST, es_hero DESC LIMIT 12',
      [d.id]
    );
    var resenasRows = await sql(
      'SELECT i.rating, i.texto, u.nombre AS usuario_nombre FROM interacciones i LEFT JOIN usuarios u ON i.usuario_id=u.id WHERE i.destino_id=$1 AND i.tipo=\'resena\' ORDER BY i.creado_en DESC LIMIT 10',
      [d.id]
    );

    var html = buildHTML(d, det, fotosRows, resenasRows);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    return res.status(200).send(html);

  } catch (err) {
    console.error('[pagina-destino]', err.message);
    console.error('[pagina-destino] slug='+slug+' err='+err.message+' stack='+err.stack);
    return res.status(500).send('<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Error \u2013 ExploraCO</title><style>body{font-family:sans-serif;text-align:center;padding:4rem 1rem;background:#FBF8F2}a{color:#E8A020}pre{text-align:left;background:#f5f5f5;padding:1rem;border-radius:8px;font-size:11px;overflow-x:auto}</style></head><body><h1 style="font-size:2rem;margin-bottom:1rem">\u26a0\ufe0f Error temporal</h1><p>No pudimos cargar esta p\u00e1gina.</p><pre>'+err.message+'</pre><p style="margin-top:1.5rem"><a href="/index.html">\u2190 Volver al inicio</a></p></body></html>');
  }
};
