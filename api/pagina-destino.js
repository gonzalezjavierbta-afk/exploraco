// api/pagina-destino.js -- v9.20260702
// CAMBIOS: diseno premium Barlow Condensed, seccion sitio turistico, tags JSONB, sin backticks

// Sistema de diseno: Barlow Condensed + Outfit, paleta dorada/negra editorial
// 100% basado en datos reales del formulario publicar.html y schema Neon
// Sin contenido inventado: solo secciones con datos disponibles se renderizan

const { neon } = require('@neondatabase/serverless');

var BASE = 'https://exploraco.co';
var CAT_LABEL = { hostal:'Hospedaje', comida:'Comida & Restaurantes', sitio:'Lugares & Sitios', evento:'Eventos', blog:'Inspirate' };
var CAT_DIR   = { hostal:'directorio-hostal.html', comida:'directorio-comida.html', sitio:'directorio-sitio.html', evento:'directorio-evento.html', blog:'index.html#inspirate-section' };
var CAT_GRAD  = { hostal:'linear-gradient(135deg,#1a3a5c,#2a4a7c)', comida:'linear-gradient(135deg,#3a1a0a,#4a2a1a)', sitio:'linear-gradient(135deg,#0a2a1a,#1a3a2a)', evento:'linear-gradient(135deg,#1a051a,#3a1a3a)', blog:'linear-gradient(135deg,#3a0a1a,#4a1a2a)' };
// Temas de Blog (sub-categoria dentro de tags.tema, ver publicar-lugar.js BLOG_TEMAS)
var TEMA_BLOG_LABEL = { aventura:'Aventura', gastro:'Gastronomia', cultura:'Cultura', naturaleza:'Naturaleza', tips:'Tips' };
var TEMA_BLOG_EMOJI = { aventura:'\ud83c\udfd4\ufe0f', gastro:'\ud83c\udf7d\ufe0f', cultura:'\ud83c\udfad', naturaleza:'\ud83c\udf3f', tips:'\ud83d\udca1' };
// Dimensiones de rese\u00f1as V2 por categoria (clave interna -> etiqueta visible).
// Se usan en el formulario (selectores de estrellas) y en las barras de puntuacion.
var DIM_BY_CAT = {
  sitio:  [ ['experiencia','Experiencia'], ['guias','Guias'], ['acceso','Accesibilidad'], ['valor','Valor / precio'] ],
  hostal: [ ['atmosfera','Atmosfera'], ['personal','Personal'], ['limpieza','Limpieza'], ['seguridad','Seguridad'] ],
  comida: [ ['comida','Comida'], ['servicio','Servicio'], ['ambiente','Ambiente'], ['valor','Valor / precio'] ],
  evento: [ ['desfiles','Desfiles'], ['ambiente','Ambiente'], ['organizacion','Organizacion'], ['valor','Valor / precio'] ]
};
var DIM_COLORS = ['#22C55E', '#3B82F6', '#E8A020', '#8B5CF6'];

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

function schemaLD(d, cat, autor) {
  var tipos = { hostal:'LodgingBusiness', comida:'FoodEstablishment', sitio:'TouristAttraction', evento:'Event', blog:'BlogPosting' };
  var schema = {
    '@context':'https://schema.org', '@type':tipos[cat]||'TouristAttraction',
    'name': d.nombre||'', 'description': d.lead||'', 'url': BASE+'/'+(d.slug||'')+'.html'
  };
  if (d.foto_hero) schema['image'] = d.foto_hero;
  if (cat === 'blog') {
    // BlogPosting: E-E-A-T se apoya en autor, fecha y extension real
    // del articulo -- no en address/geo/aggregateRating, que son de
    // un lugar fisico, no de un articulo editorial.
    schema['headline']      = d.nombre||'';
    schema['datePublished'] = d.creado_en || undefined;
    schema['dateModified']  = d.actualizado_en || d.creado_en || undefined;
    if (autor && autor.nombre) {
      schema['author'] = { '@type':'Person', 'name': autor.nombre };
    }
    // Multi-tema: keywords refleja tags.temas[] (o el tema unico).
    var kwTags = (typeof d.tags === 'object' && d.tags) ? d.tags : safeJSON(d.tags) || {};
    var kwArr = (Array.isArray(kwTags.temas) && kwTags.temas.length)
                ? kwTags.temas
                : (kwTags.tema ? [kwTags.tema] : []);
    if (kwArr.length) schema['keywords'] = kwArr.join(', ');
    var cuerpoWc = (d.descripcion || d.lead || '');
    if (cuerpoWc) schema['wordCount'] = cuerpoWc.trim().split(/\s+/).filter(Boolean).length;
  } else {
    if (d.ciudad) schema['address'] = { '@type':'PostalAddress','addressLocality':d.ciudad,'addressCountry':'CO' };
    if (d.lat && d.lng && parseFloat(d.lat)!==0) schema['geo'] = { '@type':'GeoCoordinates','latitude':parseFloat(d.lat),'longitude':parseFloat(d.lng) };
    if (d.rating && d.total_resenas>0) schema['aggregateRating'] = { '@type':'AggregateRating','ratingValue':parseFloat(d.rating).toFixed(1),'ratingCount':d.total_resenas,'bestRating':'5','worstRating':'1' };
    if (d.precio_desde) schema['priceRange'] = d.precio_desde;
    if (d.telefono) schema['telephone'] = d.telefono;
  }
  return '<script type="application/ld+json">\n'+JSON.stringify(schema,null,2)+'\n<\/script>';
}

var CSS = "@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@0,400;0,600;0,700;0,800;0,900;1,700&family=Outfit:wght@300;400;500;600;700&display=swap');"
+"*{box-sizing:border-box;margin:0;padding:0}"
+":root{--gold:#E8A020;--gold-dark:#C8860A;--gold-light:#FDF3E0;--black:#111;--white:#fff;--warm:#FBF8F2;--border:#EDE8E0;--muted:#888;--text:#1A1A1A;--green:#22C55E;--green-l:rgba(34,197,94,.08);--green-d:#16A34A;--bg:#F8F7F3;--red:#EF4444;--blue:#3B82F6}"
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
+".hobtn.activo{background:rgba(232,160,32,.15);color:var(--gold);border-color:var(--gold)}"
+".hobtn:disabled{opacity:.5;cursor:default}"
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
+".tour-list{display:flex;flex-direction:column;gap:12px;margin-top:10px}"
+".tour-card{background:#fff;border:1px solid var(--border);border-radius:10px;overflow:hidden;transition:border-color .15s,box-shadow .15s}"
+".tour-card:hover{border-color:#ccc;box-shadow:0 2px 12px rgba(0,0,0,.06)}"
+".tour-card.featured{border-color:var(--gold);border-width:1.5px}"
+".tc-header{padding:12px 14px;display:flex;align-items:flex-start;gap:12px;border-bottom:1px solid var(--border)}"
+".tc-badge{padding:3px 9px;border-radius:3px;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;flex-shrink:0;font-family:'Barlow Condensed',sans-serif}"
+".tc-badge-grup{background:#EFF6FF;color:#1D4ED8}"
+".tc-badge-priv{background:#FAF5FF;color:#6D28D9}"
+".tc-badge-eco{background:#ECFDF5;color:#065F46}"
+".tc-badge-pers{background:#FFFBEB;color:#92400E}"
+".tc-info{flex:1;min-width:0}"
+".tc-name{font-size:13px;font-weight:700;color:#111;margin-bottom:3px}"
+".tc-meta{display:flex;gap:10px;flex-wrap:wrap;font-size:10px;color:var(--muted)}"
+".tc-price{font-family:'Barlow Condensed',sans-serif;font-size:22px;font-weight:900;color:#111;text-align:right;flex-shrink:0}"
+".tc-price-sub{font-size:9px;color:var(--muted);text-align:right}"
+".tc-body{padding:10px 14px}"
+".tc-incl-row{display:grid;grid-template-columns:1fr 1fr;gap:4px 12px;margin-bottom:10px}"
+".tc-incl{font-size:10px;color:var(--muted);display:flex;align-items:flex-start;gap:5px;line-height:1.5}"
+".tc-incl.yes{color:#166534}"
+".tc-incl.no{color:#B91C1C}"
+".tc-book-btn{display:inline-flex;align-items:center;gap:5px;padding:8px 16px;background:#111;color:#fff;border:none;border-radius:4px;font-family:'Barlow Condensed',sans-serif;font-size:12px;font-weight:900;letter-spacing:1px;text-transform:uppercase;text-decoration:none;transition:background .15s;cursor:pointer}"
+".tc-book-btn:hover{background:#333}"
+".tc-desc{font-size:11px;color:#555;line-height:1.6;margin-bottom:10px}"
+".checklist-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:8px;margin-top:10px}"
+".cl-item{display:flex;align-items:flex-start;gap:8px;padding:9px 11px;border-radius:7px;border:1px solid}"
+".cl-item.obligatorio{background:#FEF2F2;border-color:#FECACA}"
+".cl-item.recomendado{background:var(--bg);border-color:var(--border)}"
+".cl-item.opcional{background:#F8F8F8;border-color:#E8E8E8;opacity:.75}"
+".cl-icon{font-size:16px;flex-shrink:0;line-height:1.2}"
+".cl-text{font-size:11px;font-weight:600;color:var(--black);line-height:1.3}"
+".cl-sub{font-size:9px;color:var(--muted)}"
+".cl-req{font-size:8px;font-weight:700;padding:1px 5px;border-radius:2px;text-transform:uppercase;letter-spacing:.5px;margin-top:2px;display:inline-block}"
+".req-ob{background:#FEE2E2;color:#DC2626}"
+".req-re{background:#FEF3C7;color:#92400E}"
+".req-op{background:#F3F4F6;color:#9CA3AF}"
+".cl-tip{font-size:10px;color:var(--muted);margin-top:10px;padding:8px 10px;background:var(--bg);border-radius:5px;border-left:2px solid var(--gold)}"
+".dificultad-section{background:#fff;border:1px solid var(--border);border-radius:10px;padding:16px 18px;margin-top:14px}"
+".dif-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:var(--muted);margin-bottom:10px}"
+".dif-bar{display:flex;gap:4px;margin-bottom:8px}"
+".dif-seg{flex:1;height:10px;border-radius:3px;background:#E5E3DD;transition:background .3s}"
+".dif-level{font-size:14px;font-weight:700;color:var(--black);margin-bottom:4px}"
+".dif-desc{font-size:11px;color:var(--muted);line-height:1.6}"
+".dif-chips{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}"
+".dif-chip{font-size:10px;padding:3px 9px;border-radius:3px;border:1px solid;font-weight:600}"
+".dc-fit{background:#F0FDF4;border-color:#BBF7D0;color:#166534}"
+".dc-notfit{background:#FEF2F2;border-color:#FECACA;color:#DC2626}"
+".epoca-grid{display:grid;grid-template-columns:repeat(12,1fr);gap:4px;margin-top:10px}"
+".mes-bar{display:flex;flex-direction:column;align-items:center;gap:3px}"
+".mes-name{font-size:8px;font-weight:700;color:var(--muted);text-transform:uppercase}"
+".mes-fill{width:100%;border-radius:4px;min-height:32px;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;transition:opacity .2s}"
+".mes-fill.ideal{background:#16a34a;color:#fff}"
+".mes-fill.posible{background:#d97706;color:#fff}"
+".mes-fill.evitar{background:#dc2626;color:#fff}"
+".mes-fill.na{background:#F3F4F6;color:#B0B0B0}"
+".epoca-legend{display:flex;gap:12px;margin-top:8px;flex-wrap:wrap}"
+".el{display:flex;align-items:center;gap:5px;font-size:10px;color:var(--muted)}"
+".el-dot{width:10px;height:10px;border-radius:2px;flex-shrink:0}"
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
+".rvtag{display:inline-flex;align-items:center;gap:4px;padding:3px 9px;border-radius:3px;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;background:var(--gold-light);color:var(--gold-dark);margin:2px 6px 2px 0}"
+".rvdims{display:flex;gap:10px;flex-wrap:wrap;margin:6px 0 2px;font-size:9px;color:var(--muted)}"
+".rvdims b{color:var(--text)}"
+".score-overall{display:flex;align-items:center;gap:16px;padding:12px 16px;background:var(--warm);border-radius:8px;border:1px solid var(--border);width:100%}"
+".so-number{font-family:'Barlow Condensed',sans-serif;font-size:52px;font-weight:900;line-height:1;color:var(--gold);text-align:center;min-width:70px}"
+".so-meta{flex:1}.so-stars{font-size:15px;color:var(--gold);letter-spacing:1px}"
+".so-label{font-size:13px;font-weight:700;color:var(--text);margin:2px 0}"
+".so-count{font-size:11px;color:var(--muted)}"
+".score-grid{display:grid;grid-template-columns:auto 1fr auto;gap:6px 12px;align-items:center;margin-top:12px;width:100%}"
+".score-label{font-size:11px;color:var(--text);font-weight:500;white-space:nowrap}"
+".score-bar-wrap{height:7px;background:#F1EFE8;border-radius:4px;overflow:hidden}"
+".score-bar-fill{height:100%;border-radius:4px}"
+".score-val{font-size:11px;font-weight:700;color:var(--text);text-align:right}"
+".rv-score-selector{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px}"
+".rv-dim{display:flex;flex-direction:column;gap:3px}"
+".rv-dim-label{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:var(--muted)}"
+".rv-stars-row{display:flex;gap:2px}"
+".rv-star{font-size:18px;color:#E5E3DD;cursor:pointer;transition:color .1s;line-height:1}"
+".rv-star.on,.rv-star:hover{color:var(--gold)}"
+".rv-traveller-type{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px}"
+".rv-type-btn{padding:4px 10px;border-radius:20px;border:1.5px solid var(--border);font-size:10px;font-weight:600;cursor:pointer;transition:all .12s;background:var(--white)}"
+".rv-type-btn.on{background:var(--black);border-color:var(--black);color:var(--white)}"
+".wrsub{background:var(--black);color:#fff;border:none;border-radius:4px;padding:11px 22px;font-family:'Barlow Condensed',sans-serif;font-size:14px;font-weight:900;letter-spacing:1px;text-transform:uppercase;cursor:pointer;width:100%}"
+".wrsub:disabled{background:#ccc;cursor:not-allowed}"
+".wrok{text-align:center;padding:12px;font-size:13px;color:#166534;font-weight:600;display:none;background:#F0FDF4;border-radius:5px;margin-top:10px}"
+".cgrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px}"
+".cbtn{display:flex;align-items:center;justify-content:center;gap:8px;padding:14px 18px;border-radius:6px;font-family:'Barlow Condensed',sans-serif;font-size:14px;font-weight:900;letter-spacing:.8px;text-transform:uppercase;cursor:pointer;border:2px solid}"
+".cbtn.gold{background:var(--gold);color:#fff;border-color:var(--gold)}.cbtn.dark{background:var(--black);color:#fff;border-color:var(--black)}"
+".cbtn.green{background:#fff;color:#25D366;border-color:#25D366}.cbtn.blue{background:#fff;color:#1a73e8;border-color:#1a73e8}"
+".rcscroll{display:flex;gap:14px;overflow-x:auto;padding-bottom:12px;-ms-overflow-style:none;scrollbar-width:none}"
+".rcscroll::-webkit-scrollbar{display:none}"
+".rcard{flex:0 0 240px;background:#fff;border:1px solid var(--border);border-radius:10px;overflow:hidden;text-decoration:none;display:flex;flex-direction:column;transition:transform .15s,box-shadow .15s}"
+".rcard:hover{transform:translateY(-3px);box-shadow:0 10px 24px rgba(0,0,0,.08)}"
+".rcimg{height:120px;background-size:cover;background-position:center;display:flex;align-items:center;justify-content:center}"
+".rcemoji{font-size:40px}"
+".rcbody{padding:14px;display:flex;flex-direction:column;gap:5px}"
+".rcbadge{align-self:flex-start;background:var(--gold-light);color:var(--gold-dark);padding:3px 8px;border-radius:3px;font-family:'Barlow Condensed',sans-serif;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:1px}"
+".rctitle{font-family:'Barlow Condensed',sans-serif;font-size:16px;font-weight:800;color:var(--text);line-height:1.2}"
+".rcmeta{font-size:11px;color:var(--muted)}"
+".rcrate{display:flex;align-items:center;gap:8px;margin-top:auto;padding-top:6px}"
+".rcstars{display:flex;gap:2px}.rcst{font-size:11px;color:#DDD}.rcst.on{color:var(--gold)}"
+".rcn{font-size:10px;color:var(--muted)}"
+".faq-list{display:flex;flex-direction:column;gap:6px;margin-top:10px}"
+".faq-item{background:var(--white);border:1px solid var(--border);border-radius:6px;overflow:hidden}"
+".faq-q{display:flex;align-items:center;justify-content:space-between;padding:12px 14px;cursor:pointer;font-size:12px;font-weight:600;color:var(--black);transition:background .12s;gap:10px}"
+".faq-q:hover{background:var(--bg)}"
+".faq-arrow{font-size:10px;color:var(--muted);transition:transform .2s;flex-shrink:0}"
+".faq-item.open .faq-arrow{transform:rotate(180deg)}"
+".faq-a{display:none;padding:0 14px 12px;font-size:11px;color:var(--muted);line-height:1.7;border-top:1px solid var(--border);background:var(--bg)}"
+".faq-item.open .faq-a{display:block}"
+".pbanner{background:#fff3cd;border-top:3px solid #ffc107;color:#856404;padding:.7rem 4%;font-size:12px;text-align:center}"
+".itinerario-tabs{display:flex;gap:0;border-bottom:1px solid var(--border);overflow-x:auto;scrollbar-width:none;margin-bottom:14px}"
+".itinerario-tabs::-webkit-scrollbar{display:none}"
+".itab{padding:8px 16px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:var(--muted);cursor:pointer;border-bottom:3px solid transparent;white-space:nowrap;transition:all .15s;margin-bottom:-1px}"
+".itab:hover{color:var(--black)}"
+".itab.on{color:var(--black);border-bottom-color:var(--green)}"
+".itin-panel{display:none}"
+".itin-panel.on{display:block}"
+".itin-timeline{display:flex;flex-direction:column;gap:0}"
+".itin-step{display:flex;gap:14px;padding-bottom:16px;position:relative}"
+".itin-step:not(:last-child)::after{content:'';position:absolute;left:16px;top:34px;bottom:0;width:2px;background:var(--border)}"
+".itin-dot{width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0;border:2px solid var(--white);box-shadow:0 0 0 2px var(--border);background:var(--white);z-index:1}"
+".itin-dot.active{box-shadow:0 0 0 2px var(--green);background:var(--green-l)}"
+".itin-body{flex:1;min-width:0;padding-top:4px}"
+".itin-time{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--green);margin-bottom:2px}"
+".itin-title{font-size:13px;font-weight:700;color:var(--black);margin-bottom:3px}"
+".itin-desc{font-size:11px;color:var(--muted);line-height:1.6}"
+".itin-tags{display:flex;gap:5px;flex-wrap:wrap;margin-top:5px}"
+".itin-tag{font-size:9px;padding:2px 7px;border-radius:3px;background:var(--bg);border:1px solid var(--border);color:var(--muted)}"
+".tips-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:10px;margin-top:10px}.tip-card{background:var(--white);border:1px solid var(--border);border-radius:8px;padding:12px 14px;display:flex;gap:10px;transition:border-color .15s}.tip-card:hover{border-color:#ccc}.tip-icon{font-size:22px;flex-shrink:0;line-height:1}.tip-body{flex:1;min-width:0}.tip-title{font-size:12px;font-weight:700;color:var(--black);margin-bottom:3px}.tip-text{font-size:11px;color:var(--muted);line-height:1.6}.tip-tag{font-size:8px;font-weight:700;padding:2px 6px;border-radius:3px;text-transform:uppercase;letter-spacing:.5px;display:inline-block;margin-top:4px}.tip-gold{background:#FFFBEB;color:#92400E;border:1px solid #FDE68A}.tip-green{background:#F0FDF4;color:#166534;border:1px solid #BBF7D0}.tip-blue{background:#EFF6FF;color:#1D4ED8;border:1px solid #BFDBFE}.tip-red{background:#FEF2F2;color:#DC2626;border:1px solid #FECACA}.fauna-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:10px;margin-top:10px}.fauna-card{background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:12px;text-align:center;transition:border-color .15s}.fauna-card:hover{border-color:#ccc}.fauna-emoji{font-size:32px;margin-bottom:6px;display:block}.fauna-name{font-size:11px;font-weight:700;color:var(--black);margin-bottom:2px}.fauna-sci{font-size:9px;color:var(--muted);font-style:italic;margin-bottom:4px}.fauna-fact{font-size:10px;color:var(--muted);line-height:1.5}.permiso-list{display:flex;flex-direction:column;gap:8px;margin-top:10px}.permiso-item{background:var(--white);border:1px solid var(--border);border-radius:8px;padding:12px 14px;display:flex;align-items:flex-start;gap:12px}.permiso-item.requerido{border-left:3px solid var(--red)}.permiso-item.recomendado{border-left:3px solid var(--gold)}.permiso-item.info{border-left:3px solid var(--blue)}.permiso-icon{font-size:20px;flex-shrink:0}.permiso-body{flex:1;min-width:0}.permiso-title{font-size:12px;font-weight:700;color:var(--black);margin-bottom:3px}.permiso-desc{font-size:11px;color:var(--muted);line-height:1.6}.permiso-link{display:inline-block;margin-top:6px;font-size:10px;font-weight:700;color:var(--blue);text-decoration:none}.permiso-link:hover{text-decoration:underline}.permiso-time{font-size:9px;font-weight:700;padding:2px 7px;border-radius:3px;background:#FEF2F2;color:#DC2626;flex-shrink:0;white-space:nowrap;align-self:flex-start}.blog-video-wrap{position:relative;width:100%;padding-top:56.25%;border-radius:10px;overflow:hidden;background:#000;margin:0}.blog-video-wrap iframe{position:absolute;inset:0;width:100%;height:100%;border:0}.blog-autor-card{display:flex;align-items:center;gap:14px;background:#fff;border:1px solid var(--border);border-radius:10px;padding:16px;margin:0}.blog-autor-foto{width:56px;height:56px;border-radius:50%;object-fit:cover;flex-shrink:0}.blog-autor-ph{display:flex;align-items:center;justify-content:center;background:var(--gold-light);color:var(--gold-dark);font-family:'Barlow Condensed',sans-serif;font-weight:900;font-size:22px}.blog-autor-nombre{font-family:'Barlow Condensed',sans-serif;font-weight:800;font-size:15px;color:var(--text)}.blog-autor-bio{font-size:12px;color:#555;line-height:1.6;margin-top:3px}.footer{background:var(--black);border-top:3px solid var(--gold);padding:30px 4% 20px;text-align:center}"
+".flogo{font-family:'Barlow Condensed',sans-serif;font-size:20px;font-weight:900;letter-spacing:4px;color:#fff;margin-bottom:8px}.flogo em{color:var(--gold);font-style:normal}"
+".fcopy{color:rgba(255,255,255,.35);font-size:10px;margin-top:14px}"
+".fcopy a{color:rgba(255,255,255,.45)}";

// -- COMPARADOR DE LUGARES SIMILARES (TSK-017) ------------------------
// Top 3 hermanos de la misma categoria raiz, rankeados por overlap de
// tags (Jaccard sobre los valores relevantes de cada categoria).
var COMPARADOR_KEYS = {
  sitio:  ['tipo_actividad','dificultad','duracion','temporada'],
  hostal: ['tipo_alojamiento','reglas_casa','ciudad'],
  comida: ['tipo_comida','cocina','ambiente','precio_promedio','terraza'],
  evento: ['sede','edicion','ciudad']
};

function comparadorValores(x) {
  var tags = (x.tags && typeof x.tags === 'object' && !Array.isArray(x.tags)) ? x.tags : {};
  var keys = COMPARADOR_KEYS[x.categoria_slug] || [];
  var set = {};
  for (var i = 0; i < keys.length; i++) {
    var k = keys[i];
    var v = (k === 'ciudad') ? (x.ciudad || '') : tags[k];
    if (v === null || v === undefined) continue;
    var arr = Array.isArray(v) ? v : [v];
    for (var j = 0; j < arr.length; j++) {
      var s = String(arr[j]).trim().toLowerCase();
      if (s) set[s] = true;
    }
  }
  return set;
}

function topRelacionados(d, candidatos, n) {
  var n = n || 3;
  var meta = comparadorValores(d);
  var metaKeys = Object.keys(meta);
  var scored = [];
  for (var i = 0; i < candidatos.length; i++) {
    var c = candidatos[i];
    var cSet = comparadorValores(c);
    var inter = 0;
    var union = metaKeys.length;
    for (var k in cSet) {
      if (meta[k]) inter++;
      else union++;
    }
    var score = union > 0 ? (inter / union) : 0;
    var r = parseFloat(c.rating) || 0;
    scored.push({ row: c, score: score, rating: r });
  }
  scored.sort(function(a, b) {
    if (b.score !== a.score) return b.score - a.score;
    if (b.rating !== a.rating) return b.rating - a.rating;
    return (a.row.nombre||'').localeCompare(b.row.nombre||'');
  });
  return scored.slice(0, n).map(function(s){ return s.row; });
}

function buildHTML(d, det, fotos, resenas, autor, relacionados, dimsAvg) {
  var cat   = d.categoria_slug || 'sitio';
  var relacionados = relacionados || [];
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
  var dimDefs = DIM_BY_CAT[cat] || DIM_BY_CAT.sitio;
  var dimLabelMap = {};
  dimDefs.forEach(function(dd){ dimLabelMap[dd[0]] = dd[1]; });
  dimsAvg = (dimsAvg && typeof dimsAvg === 'object') ? dimsAvg : {};

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
  var temporadaNota   = tags.temporada_nota   || '';
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
  var checklistTip   = tags.checklist_tip || tags.equipamiento_tip || '';
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

  // Campos especificos de evento desde tags JSONB (TASK-003)
  var fechaInicioEvento = tags.fecha_inicio || '';
  var fechaFinEvento    = tags.fecha_fin    || '';
  var edicionEvento     = tags.edicion      || '';
  var sedeEvento        = tags.sede         || '';
  var lineupEvento            = safeJSON(tags.lineup);             if(!Array.isArray(lineupEvento))            lineupEvento=[];
  var agendaEventoTags        = safeJSON(tags.agenda);             if(!Array.isArray(agendaEventoTags))        agendaEventoTags=[];
  var categoriasEntradaEvento = safeJSON(tags.categorias_entrada); if(!Array.isArray(categoriasEntradaEvento)) categoriasEntradaEvento=[];
  var queLlevarEvento         = safeJSON(tags.que_llevar);         if(!Array.isArray(queLlevarEvento))         queLlevarEvento=[];
  var prohibidoEvento         = safeJSON(tags.prohibido);          if(!Array.isArray(prohibidoEvento))         prohibidoEvento=[];

  if (cat === 'evento') {
    console.log('[TRACE][pagina-evento]',
      'lineup=' + lineupEvento.length,
      'agenda=' + agendaEventoTags.length,
      'categorias_entrada=' + categoriasEntradaEvento.length,
      'que_llevar=' + queLlevarEvento.length,
      'prohibido=' + prohibidoEvento.length);
  }

  // Campos especificos de blog desde tags JSONB (Sprint Inspirate)
  // cuerpo_historia y tiempo_lectura NO son campos propios: se
  // reusan columnas genericas ya existentes (descripcion) o se
  // calculan en el momento, en vez de duplicar datos en tags -- ver
  // DECISIONS.md y la leccion de BUG-019 (no duplicar campos
  // genericos ya existentes).
  var temaBlog     = tags.tema      || '';
  // Multi-tema: tags.temas[] (array) manda; tags.tema conserva el
  // principal para compatibilidad. temasaBlog = lista normalizada.
  var temasBlog = (Array.isArray(tags.temas) && tags.temas.length)
                  ? tags.temas
                  : (temaBlog ? [temaBlog] : []);
  var videoUrlBlog = tags.video_url || '';
  var cuerpoBlog    = d.descripcion || d.lead || '';
  var palabrasBlog  = cuerpoBlog ? cuerpoBlog.trim().split(/\s+/).filter(Boolean).length : 0;
  var tiempoLecturaBlog = palabrasBlog ? Math.max(1, Math.round(palabrasBlog / 200)) : 0;

  if (cat === 'blog') {
    console.log('[TRACE][pagina-blog]', 'Blog cargado | ' + palabrasBlog + ' palabras detectadas | Autor: ' + (autor && autor.nombre ? autor.nombre : 'Sin autor'));
  }

  // Formatea fecha ISO (YYYY-MM-DD) a "5 de Diciembre de 2026".
  // Degrada al valor crudo si no matchea el formato esperado (TASK-003).
  var MESES_LARGOS_EVENTO = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  function fmtFechaEvento(iso) {
    if (!iso) return '';
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
    if (!m) return iso;
    var y = parseInt(m[1],10), mo = parseInt(m[2],10), da = parseInt(m[3],10);
    if (!mo || mo < 1 || mo > 12) return iso;
    return da + ' de ' + MESES_LARGOS_EVENTO[mo-1] + ' de ' + y;
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
  if (cat === 'blog') {
    // Blog no usa rating/precio -- un articulo no se "califica con
    // estrellas" como un lugar. Chips propios: tema, tiempo de
    // lectura y autor (senal de E-E-A-T visible desde el hero).
    temasBlog.forEach(function(t){
      if (t) hqi.push('<div class="hqi">'+(TEMA_BLOG_EMOJI[t]||'\u270D\ufe0f')+' '+esc(TEMA_BLOG_LABEL[t]||t)+'</div>');
    });
    if (d.ciudad) hqi.push('<div class="hqi">\u29BF '+esc(d.ciudad)+(d.region?', '+esc(d.region):'')+'</div>');
    if (tiempoLecturaBlog) hqi.push('<div class="hqi">\u23F1 '+tiempoLecturaBlog+' min de lectura</div>');
    if (autor && autor.nombre) hqi.push('<div class="hqi">\u270D\ufe0f '+esc(autor.nombre)+'</div>');
  } else {
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
  }

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
  var descTitleGeneric = cat === 'blog' ? 'La historia' : 'Sobre este lugar';
  var secDescripcion = '<section class="ssec bwarm" id="descripcion"><div class="sin">'
    + '<div class="strow"><div class="sgl"></div><h2 class="stitle bc">'+descTitleGeneric+'</h2><div class="stnum">'+nextNum()+'</div></div>'
    + (d.lead ? '<p class="slead bc">'+esc(d.lead)+'</p>' : '')
    + (d.descripcion ? '<p class="stext">'+esc(d.descripcion)+'</p>' : '')
    + (d.highlight ? '<div class="hbox"><span class="hbico">\u2605</span><div><div class="hblbl">Destacado</div><div class="hbtx">'+esc(d.highlight)+'</div></div></div>' : '')
    + (amenidades.length ? '<div class="tagrow">'+amenidades.map(function(a){ return '<span class="tpill">'+esc(typeof a==='string'?a:(a.nombre||''))+'</span>'; }).join('')+'</div>' : '')
    + '</div></section>';

  // -- SECCION (Blog): Video embebido --------------------------------
  // Convierte la URL cruda a un embed src construido en servidor a
  // partir de un host+id validados -- nunca se inyecta la URL del
  // usuario directamente en el src del iframe.
  function videoEmbedUrlBlog(raw) {
    try {
      var url = new URL(String(raw));
      var host = url.hostname.toLowerCase().replace(/^www\./, '');
      if (host === 'youtu.be') {
        var id1 = url.pathname.replace(/^\//, '');
        return id1 ? 'https://www.youtube.com/embed/' + id1 : '';
      }
      if (host === 'youtube.com') {
        var id2 = url.searchParams.get('v');
        return id2 ? 'https://www.youtube.com/embed/' + id2 : '';
      }
      if (host === 'vimeo.com') {
        var id3 = url.pathname.replace(/^\//, '');
        return id3 ? 'https://player.vimeo.com/video/' + id3 : '';
      }
    } catch (e) {}
    return '';
  }
  var secBlogVideo = '';
  if (cat === 'blog' && videoUrlBlog) {
    var embedSrcBlog = videoEmbedUrlBlog(videoUrlBlog);
    if (embedSrcBlog) {
      secBlogVideo = '<section class="ssec bwhite" id="video"><div class="sin">'
        + '<div class="strow"><div class="sgl"></div><h2 class="stitle bc">Video</h2><div class="stnum">'+nextNum()+'</div></div>'
        + '<div class="blog-video-wrap"><iframe src="'+esc(embedSrcBlog)+'" title="Video" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy"></iframe></div>'
        + '</div></section>';
    }
  }

  // -- SECCION (Blog): Quien escribe (autor) --------------------------
  // E-E-A-T: firma visible con nombre + bio/foto si el usuario-autor
  // (tags.id_autor) tiene perfil ampliado. autor llega ya resuelto
  // desde el handler (JOIN contra usuarios), no se hace fetch aqui.
  var secBlogAutor = '';
  if (cat === 'blog' && autor && autor.nombre) {
    secBlogAutor = '<section class="ssec bwarm" id="autor"><div class="sin">'
      + '<div class="strow"><div class="sgl"></div><h2 class="stitle bc">Quien escribe</h2><div class="stnum">'+nextNum()+'</div></div>'
      + '<div class="blog-autor-card">'
      + (autor.foto_url
          ? '<img class="blog-autor-foto" src="'+esc(autor.foto_url)+'" alt="'+esc(autor.nombre)+'">'
          : '<div class="blog-autor-foto blog-autor-ph">'+esc((autor.nombre||'?').charAt(0).toUpperCase())+'</div>')
      + '<div><div class="blog-autor-nombre">'+esc(autor.nombre)+'</div>'
      + (autor.bio ? '<div class="blog-autor-bio">'+esc(autor.bio)+'</div>' : '')
      + '</div></div></div></section>';
  }

  // -- SECCION: Dificultad y epoca ideal (paridad con Monserrate3.html:
  // -- dificultad en tarjeta (barra 5 segmentos + nivel con emoji +
  // -- descripcion + chips apto/no apto) y epoca ideal (matriz 12 meses
  // -- con leyenda y nota) reunidos en un solo bloque bwarm. ----------
  var secDificultad = '';
  if (cat === 'sitio' && (dificultad || temporadaMatriz || temporada.length)) {
    var diffBlock = '';
    if (dificultad) {
      var diffScale = [
        {key:'facil',    label:'F\u00e1cil',    color:'#16a34a', emoji:'\ud83d\udfe2', segs:2},
        {key:'moderado', label:'Moderado',      color:'#d97706', emoji:'\ud83d\udfe0', segs:3},
        {key:'dificil',  label:'Dif\u00edcil',  color:'#dc2626', emoji:'\ud83d\udd34', segs:4},
        {key:'extremo',  label:'Extremo',       color:'#7c2d12', emoji:'\u26ab',       segs:5}
      ];
      var normKey = dificultad.toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
      // BUG-013 fix (ver BUGS_HISTORICOS.md): admin.html ofrece la opcion
      // "Experto" en el select f-dificultad, pero esta escala solo conocia
      // la clave "extremo" -- el nivel mas alto nunca coloreaba la barra.
      // Se alias sin tocar los datos ya guardados en Neon.
      if (normKey === 'experto') normKey = 'extremo';
      // BUG-024 fix: datos historicos guardaron "Media" en tags.dificultad
      // (selects previos de admin y seeds), pero la escala solo conoce la
      // clave "moderado" -- el nivel medio se pintaba dorado en vez de
      // naranja. Alias media/medio -> moderado sin tocar los datos.
      if (normKey === 'media' || normKey === 'medio') normKey = 'moderado';
      var matchIdx = -1;
      diffScale.forEach(function(lv, i){ if (lv.key === normKey) matchIdx = i; });
      var activeColor = matchIdx >= 0 ? diffScale[matchIdx].color : 'var(--gold-dark)';
      var activeEmoji = matchIdx >= 0 ? diffScale[matchIdx].emoji : '';
      var activeLabel = matchIdx >= 0 ? diffScale[matchIdx].label : dificultad;
      var segsCount   = matchIdx >= 0 ? diffScale[matchIdx].segs : 0;
      var barsHTML = '';
      for (var s = 1; s <= 5; s++) {
        var isOn = segsCount > 0 && s <= segsCount;
        barsHTML += '<div class="dif-seg'+(isOn?' active':'')+'" style="background:'+(isOn?activeColor:'#E5E3DD')+'"></div>';
      }
      var chipsHTML = '';
      if (dificultadTags.length) {
        chipsHTML = '<div class="dif-chips">' + dificultadTags.map(function(t){
          var isObj = t && typeof t === 'object';
          var texto = isObj ? (t.texto || '') : String(t || '');
          if (!texto) return '';
          var apto = isObj ? (t.apto !== false) : true;
          return '<span class="dif-chip '+(apto?'dc-fit':'dc-notfit')+'">'+(apto?'\u2713':'\u2717')+' '+esc(texto)+'</span>';
        }).join('') + '</div>';
      }
      diffBlock = '<div class="dificultad-section">'
        + '<div class="dif-label">Nivel de dificultad</div>'
        + '<div class="dif-bar" id="dif-bar">'+barsHTML+'</div>'
        + '<div class="dif-level">'+(activeEmoji?activeEmoji+' ':'')+esc(activeLabel)+'</div>'
        + (dificultadDesc ? '<div class="dif-desc">'+esc(dificultadDesc)+'</div>' : (matchIdx<0 ? '<div class="dif-desc">'+esc(dificultad)+'</div>' : ''))
        + chipsHTML
        + '</div>';
    }

    var epocaBlock = '';
    if (temporadaMatriz) {
      var MESES_ORDER = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
      var STATUS_META = {
        ideal:   {ico:'\u2605', cls:'ideal',   label:'Ideal \u2014 cielo despejado y vistas claras',   dot:'#16a34a'},
        posible: {ico:'~',      cls:'posible', label:'Posible \u2014 lluvias moderadas',                dot:'#d97706'},
        evitar:  {ico:'\u2717', cls:'evitar',  label:'Evitar \u2014 lluvias intensas y niebla',         dot:'#dc2626'}
      };
      var usedStatuses = {};
      var cellsHTML = MESES_ORDER.map(function(m){
        var st = temporadaMatriz[m] || '';
        var meta = STATUS_META[st];
        if (meta) usedStatuses[st] = true;
        return '<div class="mes-bar"><div class="mes-fill '+(meta?meta.cls:'na')+'">'+(meta?meta.ico:'\u00b7')+'</div><div class="mes-name">'+m+'</div></div>';
      }).join('');
      var legendHTML = Object.keys(STATUS_META).filter(function(k){ return usedStatuses[k]; }).map(function(k){
        return '<div class="el"><div class="el-dot" style="background:'+STATUS_META[k].dot+'"></div>'+STATUS_META[k].label+'</div>';
      }).join('');
      var tipHTML = '';
      if (temporadaNota) {
        tipHTML = '<div style="margin-top:10px;font-size:10px;color:var(--muted);padding:8px 10px;background:#fff;border-radius:5px;border-left:2px solid var(--gold)">\ud83d\udca1 '+esc(temporadaNota)+'</div>';
      }
      epocaBlock = '<div style="margin-top:18px">'
        + '<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:var(--muted);margin-bottom:10px">\u00c9poca ideal para visitar</div>'
        + '<div class="epoca-grid">'+cellsHTML+'</div>'
        + (legendHTML ? '<div class="epoca-legend">'+legendHTML+'</div>' : '')
        + tipHTML
        + '</div>';
    } else if (temporada.length) {
      epocaBlock = '<div style="margin-top:18px">'
        + '<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:var(--muted);margin-bottom:10px">\u00c9poca ideal para visitar</div>'
        + '<div class="tagrow">'+temporada.map(function(m){return '<span class="tpill" style="background:#EEF2FF;color:#3730a3">\ud83d\udcc5 '+esc(m)+'</span>';}).join('')+'</div>'
        + '</div>';
    }

    secDificultad = '<section class="ssec bwarm" id="dificultad"><div class="sin">'
      + '<div class="strow"><div class="sgl"></div><h2 class="stitle bc">Dificultad y \u00e9poca ideal</h2><div class="stnum">'+nextNum()+'</div></div>'
      + diffBlock
      + epocaBlock
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


  // -- SECCION: Tours disponibles (estilo Monserrate3: .tour-card, --
  // -- badge por tipo, meta, precio, incluye/no_incluye, CTA) -----
  var secTours = '';
  if (cat === 'sitio' && tours.length) {
    var badgeClassMap = { 'Grupal':'tc-badge-grup', 'Privado':'tc-badge-priv', 'Ecoturismo':'tc-badge-eco', 'Personalizado':'tc-badge-pers' };
    function _tourList(arr) {
      if (Array.isArray(arr)) return arr.filter(Boolean);
      if (typeof arr === 'string' && arr) {
        return arr.split(/\n|,/).map(function(s){ return s.replace(/^[-\u002b\u2022\s]+/,'').trim(); }).filter(Boolean);
      }
      return [];
    }
    secTours = '<section class="ssec bwarm" id="tours"><div class="sin">'
      + '<div class="strow"><div class="sgl"></div><h2 class="stitle bc">Tours disponibles</h2><div class="stnum">'+nextNum()+'</div></div>'
      + '<div class="tour-list">'
      + tours.map(function(t){
          var nombreTour = t.nombre || t.name || '';
          // BUG-012 fix (ver BUGS_HISTORICOS.md): admin.html guarda
          // "descripcion" y "link_reserva" (data-field del formulario),
          // no "desc" ni "link". Se leen ambos nombres por compatibilidad
          // con datos antiguos, priorizando siempre el nombre real.
          var descTour = t.descripcion || t.desc || '';
          var linkTour = t.link_reserva || t.link || '';
          var whatsappTour = t.whatsapp_tour || d.whatsapp || '';
          var incluyeArr = _tourList(t.incluye);
          var noIncluyeArr = _tourList(t.no_incluye);
          var tipoKey = (t.tipo_tour || 'Grupal').toString();
          var badgeCls = badgeClassMap[tipoKey] || 'tc-badge-grup';
          var badgeTxt = t.tipo_tour || 'Grupal';
          var featured = (t.featured === true || t.featured === 'true' || t.featured === 'on');
          var metaBits = [];
          if (t.duracion)      metaBits.push('\uD83D\uDD50 '+esc(t.duracion));
          if (t.max_personas)  metaBits.push('\uD83D\uDC65 '+esc(t.max_personas));
          if (t.idioma)        metaBits.push('\uD83D\uDDE3\uFE0F '+esc(t.idioma));
          if (t.rating) {
            var rv = t.review_count ? ' ('+esc(t.review_count)+' rese\u00f1as)' : '';
            metaBits.push('\u2B50 '+esc(t.rating)+rv);
          }
          var cta = '';
          if (linkTour) {
            cta = '<a class="tc-book-btn" href="'+esc(linkTour)+'" target="_blank">\uD83D\uDCAC Reservar ahora</a>';
          } else if (whatsappTour) {
            var msg = encodeURIComponent('Hola, quiero reservar el tour "'+nombreTour+'" en '+(d.nombre||'')+'.');
            cta = '<button class="tc-book-btn" onclick="window.open(\'https://wa.me/'+esc(whatsappTour)+'?text='+msg+'\',\'_blank\')">\uD83D\uDCAC Reservar por WhatsApp</button>';
          }
          return '<div class="tour-card'+(featured?' featured':'')+'">'
            + '<div class="tc-header">'
            +   '<span class="tc-badge '+badgeCls+'">'+esc(badgeTxt)+'</span>'
            +   '<div class="tc-info">'
            +     '<div class="tc-name">'+esc(nombreTour)+'</div>'
            +     (metaBits.length ? '<div class="tc-meta">'+metaBits.map(function(m){return '<span>'+m+'</span>';}).join('')+'</div>' : '')
            +   '</div>'
            +   (t.precio ? '<div><div class="tc-price">'+esc(t.precio)+'</div>'+(t.precio_sub ? '<div class="tc-price-sub">'+esc(t.precio_sub)+'</div>' : '')+'</div>' : '')
            + '</div>'
            + '<div class="tc-body">'
            +   (descTour ? '<div class="tc-desc">'+esc(descTour)+'</div>' : '')
            +   ((incluyeArr.length || noIncluyeArr.length) ? '<div class="tc-incl-row">'
            +     incluyeArr.map(function(inc){ return '<div class="tc-incl yes">\u2713 '+esc(inc)+'</div>'; }).join('')
            +     noIncluyeArr.map(function(inc){ return '<div class="tc-incl no">\u2717 '+esc(inc)+'</div>'; }).join('')
            +   '</div>' : '')
            +   (cta ? cta : '')
            + '</div>'
            + '</div>';
        }).join('')
      + '</div></div></section>';
  }

  // -- SECCION: Que llevar (estilo Monserrate3: .checklist-grid, --
  // -- .cl-item con icono, texto, sub y badge de prioridad) ------
  var secChecklist = '';
  if (cat === 'sitio' && equipamiento.length) {
    var prioClass = { 'obligatorio':'req-ob', 'recomendado':'req-re', 'opcional':'req-op', 'prohibido':'req-op' };
    var prioItemClass = { 'obligatorio':'obligatorio', 'recomendado':'recomendado', 'opcional':'opcional', 'prohibido':'opcional' };
    secChecklist = '<section class="ssec bwhite" id="checklist"><div class="sin">'
      + '<div class="strow"><div class="sgl"></div><h2 class="stitle bc">Que llevar</h2><div class="stnum">'+nextNum()+'</div></div>'
      + '<div class="checklist-grid">'
      + equipamiento.map(function(e){
          var isObj = e && typeof e === 'object';
          var nombre = isObj ? (e.item || e.nombre || e.texto || '') : String(e);
          var icono = isObj ? (e.icono || '') : '';
          var sub = isObj ? (e.sub || e.detalle || '') : '';
          var prio = isObj ? (e.prioridad || e.priority || 'Recomendado') : 'Recomendado';
          var prioKey = prio.toString().toLowerCase();
          var itemCls = prioItemClass[prioKey] || 'recomendado';
          var reqCls = prioClass[prioKey] || 'req-re';
          return '<div class="cl-item '+itemCls+'">'
            + (icono ? '<div class="cl-icon">'+icono+'</div>' : '')
            + '<div>'
            + '<div class="cl-text">'+esc(nombre)+'</div>'
            + (sub ? '<div class="cl-sub">'+esc(sub)+'</div>' : '')
            + '<span class="cl-req '+reqCls+'">'+esc(prio)+'</span>'
            + '</div></div>';
        }).join('')
      + '</div>'
      + (checklistTip ? '<div class="cl-tip">\uD83D\uDCA1 '+esc(checklistTip)+'</div>' : '')
      + '</div></section>';
  }

  // -- SECCION: Itinerario (estilo Monserrate3: tabs, timeline, --
  // -- .itin-step con dot, hora, titulo, desc y tags) ------------
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
      return '<div class="itab'+(i===0?' on':'')+'" onclick="switchItin(this,\'itin-d'+i+'\')">'+esc(dia)+'</div>';
    }).join('');
    var panelsHTML = diasOrder.map(function(dia, i) {
      var pasos = diasMap[dia];
      var stepsHTML = pasos.map(function(p) {
        var hora = p.hora || p.time || '';
        var titulo = p.titulo || p.title || p.descripcion || '';
        var desc = p.detalle || p.descripcion_larga || '';
        var ico = p.icono || p.icon || '\u25CF';
        var ptags = p.tags ? (Array.isArray(p.tags) ? p.tags : String(p.tags).split(',').map(function(t){return t.trim();})) : [];
        return '<div class="itin-step">'
          +'<div class="itin-dot active">'+esc(ico)+'</div>'
          +'<div class="itin-body">'
          +(hora?'<div class="itin-time">'+esc(hora)+'</div>':'')
          +'<div class="itin-title">'+esc(titulo)+'</div>'
          +(desc?'<div class="itin-desc">'+esc(desc)+'</div>':'')
          +(ptags.length?'<div class="itin-tags">'+ptags.map(function(t){return '<span class="itin-tag">'+esc(t)+'</span>';}).join('')+'</div>':'')
          +'</div></div>';
      }).join('');
      return '<div class="itin-panel'+(i===0?' on':'')+'" id="itin-d'+i+'">'
        +'<div class="itin-timeline">'+stepsHTML+'</div></div>';
    }).join('');
    secItinerario = '<section class="ssec bwarm" id="itinerario"><div class="sin">'
      +'<div class="strow"><div class="sgl"></div><h2 class="stitle bc">Itinerario sugerido</h2><div class="stnum">'+nextNum()+'</div></div>'
      +'<div class="itinerario-tabs" id="itin-tabs">'+tabsHTML+'</div>'
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
        faunaContent = '<div class="fauna-grid">'
          + faunaArr.map(function(f) {
            return '<div class="fauna-card">'
              +'<span class="fauna-emoji">'+esc(f.emoji||'\u2731')+'</span>'
              +'<div class="fauna-name">'+esc(f.nombre||f.name||'')+'</div>'
              +(f.sci?'<div class="fauna-sci">'+esc(f.sci)+'</div>':'')
              +(f.hecho||f.fact?'<div class="fauna-fact">'+esc(f.hecho||f.fact)+'</div>':'')
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
    // BUG-024 fix: el valor de tags.secretos llega doble-stringificado desde
    // Neon (admin-destinos.js hace JSONB merge y el string se guarda con
    // escapes), p.ej. "[{\"icono\":...\"texto\":\"...\\\"comillas\\\"...\"}]".
    // El viejo codigo hacia JSON.parse y luego un replace(/\\"/g,'"') que
    // destruia las comillas internas de los textos (texto con comillas dobles
    // escapadas) y rompia el JSON -> caia al fallback <p class="stext"> con el
    // JSON crudo. Ahora se deshace el doble-stringify con un segundo JSON.parse
    // sin tocar las comillas internas ya desescapadas.
    var secretosClean = secretos;
    if (typeof secretosClean === 'string' && secretosClean.charAt(0) === '"') {
      try { secretosClean = JSON.parse(secretosClean); } catch(_) {}
    }
    if (typeof secretosClean === 'string' && secretosClean.charAt(0) === '"') {
      try { secretosClean = JSON.parse(secretosClean); } catch(_) {}
    }
    try {
      var tipsArr = JSON.parse(secretosClean);
      if (Array.isArray(tipsArr) && tipsArr.length) {
        var tagClases = {gold:'tip-gold', red:'tip-red', green:'tip-green', blue:'tip-blue'};
        tipsContent = '<div class="tips-grid">'
          + tipsArr.map(function(t) {
            var tc = t.tag_color || 'gold';
            var cls = tagClases[tc] || 'tip-gold';
            return '<div class="tip-card"><div class="tip-icon">'+esc(t.icono||'\u2605')+'</div><div class="tip-body">'
              +'<div class="tip-title">'+esc(t.titulo||'')+'</div>'
              +'<div class="tip-text">'+esc(t.texto||'')+'</div>'
              +(t.tag?'<span class="tip-tag '+cls+'">'+esc(t.tag)+'</span>':'')
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
    secSecretos = '<section class="ssec bwhite" id="secretos"><div class="sin">'
      + '<div class="strow"><div class="sgl"></div><h2 class="stitle bc">Lo que nadie te dice</h2><div class="stnum">'+nextNum()+'</div></div>'
      + tipsContent + '</div></section>';
  }

  // -- SECCION: Permisos y regulaciones -------------------------
  var secRegulaciones = '';
  if (cat === 'sitio' && regulaciones) {
    var regContent = '';
    var regArr = null;
    var regClean = regulaciones;
    if (typeof regClean === 'string' && regClean.charAt(0) === '"') {
      try { regClean = JSON.parse(regClean); } catch(_) {}
    }
    if (typeof regClean === 'string') {
      try {
        var parsed = JSON.parse(regClean);
        if (Array.isArray(parsed)) regArr = parsed;
      } catch(_) {}
    } else if (Array.isArray(regClean)) {
      regArr = regClean;
    }
    if (regArr && regArr.length) {
      var permisoClases = {requerido:'requerido', obligatorio:'requerido', recomendado:'recomendado', info:'info', cumplir:'info'};
      regContent = '<div class="permiso-list">'
        + regArr.map(function(pr) {
            var tipo = pr.tipo || pr.tipo_permiso || '';
            var cls = permisoClases[tipo] || 'info';
            var time = pr.time || pr.etiqueta || pr.badge || '';
            return '<div class="permiso-item '+cls+'">'
              +'<div class="permiso-icon">'+esc(pr.icono||pr.icon||'\u2731')+'</div>'
              +'<div class="permiso-body">'
              +'<div class="permiso-title">'+esc(pr.titulo||pr.title||'')+'</div>'
              +(pr.desc||pr.detalle?'<div class="permiso-desc">'+esc(pr.desc||pr.detalle)+'</div>':'')
              +(pr.link?'<a class="permiso-link" href="'+esc(pr.link)+'" target="_blank">\u2197 '+esc(pr.linktext||'Ver mas')+'</a>':'')
              +'</div>'
              +(time?'<div class="permiso-time">'+esc(time)+'</div>':'')
              +'</div>';
          }).join('') + '</div>';
    }
    if (regContent) {
      secRegulaciones = '<section class="ssec bwhite" id="regulaciones"><div class="sin">'
        + '<div class="strow"><div class="sgl"></div><h2 class="stitle bc">Permisos y regulaciones</h2><div class="stnum">'+nextNum()+'</div></div>'
        + regContent + '</div></section>';
    } else {
      secRegulaciones = '<section class="ssec bwhite" id="regulaciones"><div class="sin">'
        + '<div class="strow"><div class="sgl"></div><h2 class="stitle bc">Permisos y regulaciones</h2><div class="stnum">'+nextNum()+'</div></div>'
        + '<div class="hbox" style="background:#FEF3C7;border-color:#D97706">'
        + '<span class="hbico">\u26A0</span>'
        + '<div><div class="hblbl" style="color:#92400E">Importante</div>'
        + '<div class="hbtx" style="color:#78350F">'+esc(regulaciones).replace(/\n/g,'<br>')+'</div></div></div>'
        + '</div></section>';
    }
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

  // -- SECCION: Fecha y sede (TASK-003, solo evento) -------------------
  var infoEventoCards = [];
  if (fechaInicioEvento) {
    var fechasTxt = fmtFechaEvento(fechaInicioEvento);
    if (fechaFinEvento && fechaFinEvento !== fechaInicioEvento) fechasTxt += ' - ' + fmtFechaEvento(fechaFinEvento);
    infoEventoCards.push({ ico:'\ud83d\udcc5', lbl:'Fecha', val:fechasTxt });
  }
  if (edicionEvento) infoEventoCards.push({ ico:'\ud83c\udfc6', lbl:'Edicion', val:edicionEvento });
  if (sedeEvento)    infoEventoCards.push({ ico:'\ud83d\udccd', lbl:'Sede', val:sedeEvento });

  var secEventoInfo = infoEventoCards.length ?
    '<section class="ssec bwhite" id="evento-fechas"><div class="sin">'
    + '<div class="strow"><div class="sgl"></div><h2 class="stitle bc">Fecha y sede</h2><div class="stnum">'+nextNum()+'</div></div>'
    + '<div class="igrid">'+infoEventoCards.map(function(c){
        return '<div class="icard"><div class="iico">'+c.ico+'</div><div class="ilbl">'+esc(c.lbl)+'</div><div class="ival">'+esc(c.val)+'</div></div>';
      }).join('')+'</div>'
    + '</div></section>' : '';

  // -- SECCION: Lineup / Artistas (TASK-003, solo evento) --------------
  var secLineupEvento = lineupEvento.length ?
    '<section class="ssec bwarm" id="lineup"><div class="sin">'
    + '<div class="strow"><div class="sgl"></div><h2 class="stitle bc">Lineup / Artistas</h2><div class="stnum">'+nextNum()+'</div></div>'
    + '<div class="igrid">'+lineupEvento.map(function(l){
        var detalle = [l.escenario, l.hora].filter(Boolean).join(' \u00b7 ');
        return '<div class="icard"><div class="iico">\ud83c\udfa4</div><div class="ilbl">'+esc(l.nombre||'')+'</div>'
          + (detalle ? '<div class="ival" style="font-size:12px;font-weight:400">'+esc(detalle)+'</div>' : '')
          + '</div>';
      }).join('')+'</div>'
    + '</div></section>' : '';

  // -- SECCION: Agenda del evento (TASK-003, solo evento) ---------------
  // Se muestra en el orden en que el admin cargo las filas (secuencial),
  // igual que secEventosHostal / itinerario de Sitio.
  var secAgendaEvento = agendaEventoTags.length ?
    '<section class="ssec bwhite" id="agenda"><div class="sin">'
    + '<div class="strow"><div class="sgl"></div><h2 class="stitle bc">Agenda del evento</h2><div class="stnum">'+nextNum()+'</div></div>'
    + '<table class="entradas-table"><thead><tr><th>Dia</th><th>Hora</th><th>Actividad</th></tr></thead><tbody>'
    + agendaEventoTags.map(function(a){
        return '<tr><td>'+esc(a.dia||'')+'</td><td>'+esc(a.hora||'')+'</td><td>'+esc(a.actividad||'')+'</td></tr>';
      }).join('')
    + '</tbody></table></div></section>' : '';

  // -- SECCION: Tipos de entrada (TASK-003, solo evento) -----------------
  var DISPONIBILIDAD_CLASS_EVENTO = { 'Disponible':'tip-blue', 'Pocas':'tip-gold', 'Agotado':'tip-red' };
  var secEntradasEvento = categoriasEntradaEvento.length ?
    '<section class="ssec bwarm" id="tipos-entrada"><div class="sin">'
    + '<div class="strow"><div class="sgl"></div><h2 class="stitle bc">Tipos de entrada</h2><div class="stnum">'+nextNum()+'</div></div>'
    + '<table class="entradas-table"><thead><tr><th>Tipo</th><th>Disponibilidad</th><th>Precio</th></tr></thead><tbody>'
    + categoriasEntradaEvento.map(function(e){
        var disp = e.disponibilidad || 'Disponible';
        var cls = DISPONIBILIDAD_CLASS_EVENTO[disp] || 'tip-blue';
        return '<tr><td><div class="entrada-tipo">'+esc(e.tipo||'')+'</div></td>'
          + '<td><span class="tip-tag '+cls+'">'+esc(disp)+'</span></td>'
          + '<td><div class="entrada-precio">'+esc(e.precio||'Consultar')+'</div></td></tr>';
      }).join('')
    + '</tbody></table></div></section>' : '';

  // -- SECCION: Que llevar y prohibiciones (TASK-003, solo evento) -------
  var secPrepEvento = (queLlevarEvento.length || prohibidoEvento.length) ?
    '<section class="ssec bwhite" id="que-llevar"><div class="sin">'
    + '<div class="strow"><div class="sgl"></div><h2 class="stitle bc">Que llevar</h2><div class="stnum">'+nextNum()+'</div></div>'
    + '<div class="tips-grid">'
    + queLlevarEvento.map(function(t){
        return '<div class="tip-card"><div class="tip-icon">\u2713</div><div>'
          + '<div class="tip-title">'+esc(t)+'</div>'
          + '<span class="tip-tag tip-blue">Recomendado</span>'
          + '</div></div>';
      }).join('')
    + prohibidoEvento.map(function(t){
        return '<div class="tip-card"><div class="tip-icon">\u26a0</div><div>'
          + '<div class="tip-title">'+esc(t)+'</div>'
          + '<span class="tip-tag tip-red">Prohibido</span>'
          + '</div></div>';
      }).join('')
    + '</div></div></section>' : '';

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
  var secFaq = faqs.length ? '<section class="ssec bwhite" id="faq"><div class="sin">'
    + '<div class="strow"><div class="sgl"></div><h2 class="stitle bc">Preguntas frecuentes</h2><div class="stnum">'+nextNum()+'</div></div>'
    + '<div class="faq-list">'
    + faqs.map(function(f){ return '<div class="faq-item"><div class="faq-q" onclick="toggleFaq(this)">'+esc(f.pregunta||f.q||'')+' <span class="faq-arrow">\u25BC</span></div><div class="faq-a">'+esc(f.respuesta||f.a||'')+'</div></div>'; }).join('')
    + '</div></div></section>' : '';

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
      var travTag = r.traveller_type ? '<span class="rvtag">'+esc(r.traveller_type)+'</span>' : '';
      var rDims = (r.dims && typeof r.dims === 'object' && !Array.isArray(r.dims)) ? r.dims : {};
      var dimsHtml = '';
      var dimParts = dimDefs.filter(function(dd){ return parseInt(rDims[dd[0]],10) > 0; })
        .map(function(dd){ return '<span>'+esc(dd[1])+': <b>'+parseInt(rDims[dd[0]],10)+'\u2605</b></span>'; });
      if (dimParts.length) dimsHtml = '<div class="rvdims">'+dimParts.join('')+'</div>';
      var metaExtra = (travTag || dimsHtml) ? '<div style="margin:2px 0 4px">'+travTag+'</div>'+dimsHtml : '';
      return '<div class="rvitem"><div class="rvhead">'
        + '<div class="rvav">'+esc(nombre.slice(0,2).toUpperCase())+'</div>'
        + '<div class="rvname">'+esc(nombre)+'</div>'
        + '<div class="rvstars">'+starsR+'</div></div>'
        + metaExtra
        + (texto?'<div class="rvtx">'+esc(texto)+'</div>':'')
        + '</div>';
    }).join('');
  }

  // Blog no muestra resenas de "lugar" -- un articulo no se califica
  // con estrellas como un hostal o un sitio turistico. Se omite por
  // completo en vez de mostrar un widget que no aplica.
  var secResenas = '';
  if (cat !== 'blog') {
    // Barras de puntuacion por dimension (promedios calculados en el handler)
    var scoreBars = '';
    var barRows = [];
    dimDefs.forEach(function(dd, i){
      var v = parseFloat(dimsAvg[dd[0]] || '');
      if (!v || isNaN(v)) return;
      var pct = Math.round(v/5*100);
      barRows.push('<div class="score-label">'+esc(dd[1])+'</div>'
        + '<div class="score-bar-wrap"><div class="score-bar-fill" style="width:'+pct+'%;background:'+DIM_COLORS[i%DIM_COLORS.length]+'"></div></div>'
        + '<div class="score-val">'+v.toFixed(1)+'</div>');
    });
    if (barRows.length) {
      scoreBars = '<div style="flex:1;min-width:220px"><div class="score-grid">'+barRows.join('')+'</div></div>';
    }

    // Selector de tipo de viajero + puntuacion por dimension en el formulario
    var travTypes = ['Solo','Pareja','Amigos','Familia','Mochilero'];
    var travBtns = travTypes.map(function(t){
      return '<div class="rv-type-btn" onclick="selectTravellerType(this,\''+t+'\')">'+esc(t)+'</div>';
    }).join('');
    var dimStarsHtml = dimDefs.map(function(dd){
      var rowStars = [1,2,3,4,5].map(function(v){
        return '<span class="rv-star" data-v="'+v+'" onclick="setDimScore(\''+dd[0]+'\','+v+')">\u2605</span>';
      }).join('');
      return '<div class="rv-dim"><div class="rv-dim-label">'+esc(dd[1])+'</div><div class="rv-stars-row" data-dim="'+dd[0]+'">'+rowStars+'</div></div>';
    }).join('');

    secResenas = '<section class="ssec bwhite" id="resenas"><div class="sin">'
      + '<div class="strow"><div class="sgl"></div><h2 class="stitle bc">Resenas de viajeros</h2><div class="stnum">'+nextNum()+'</div></div>'
      + '<div class="rblock" id="rblock" style="'+(nRes>0?'':'display:none')+'"><div><div class="rbavg" id="rbavg">'+rat.toFixed(1)+'</div><div class="rbstars" id="rbstars">'+[1,2,3,4,5].map(function(i){return '<span class="rbst'+(i<=Math.round(rat)?' on':'')+'">*</span>';}).join('')+'</div><div class="rbcnt" id="rbcnt">'+nRes+' resenas</div></div>'
      + (scoreBars||'')
      + '</div>'
      + '<div class="rvlist" id="rvlist">'+rvHtml+'</div>'
      + '<p class="stext" id="rvempty" style="'+(nRes>0?'display:none':'')+'">Se el primero en dejar una resena.</p>'
      + '<div class="wr"><div class="wrtitle">Escribir una resena</div>'
      + '<label class="wrlbl">Fuiste como:</label>'
      + '<div class="rv-traveller-type" id="rv-traveller-type">'+travBtns+'</div>'
      + '<label class="wrlbl">Califica por categoria:</label>'
      + '<div class="rv-score-selector">'+dimStarsHtml+'</div>'
      + '<label class="wrlbl">Puntuacion general:</label>'
      + '<div class="sprow" id="rv-stars">'
      + [1,2,3,4,5].map(function(i){ return '<span class="spk" data-v="'+i+'" onclick="setRvScore('+i+')">\u2605</span>'; }).join('')
      + '</div>'
      + '<input id="rvn" type="text" placeholder="Tu nombre" class="wrinp">'
      + '<textarea id="rvt" placeholder="Que te parecio este lugar? Que consejo darias?" class="wrinp"></textarea>'
      + '<button class="wrsub" onclick="submitRv()">Publicar resena -></button>'
      + '<div class="wrok" id="rvok">\u2713 Gracias por tu resena!</div>'
      + '<div class="wr" id="qrwrap" style="margin-top:8px">'
      + '<div class="wrtitle">Califica este lugar</div>'
      + '<div class="sprow" id="qr-stars">'
      + [1,2,3,4,5].map(function(i){ return '<span class="spk" data-v="'+i+'" onclick="votarDID('+i+')">\u2606</span>'; }).join('')
      + '</div>'
      + '<div class="wrok" id="qrok" style="display:none">\u2713 Gracias por tu voto!</div>'
      + '</div></div></section>';
  }

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

  // -- SECCI??N: Lugares similares (TSK-017) --------------------------
  // Carrusel horizontal con los top 3 hermanos de la misma categoria
  // raiz, rankeados por overlap de tags (ver topRelacionados arriba).
  var secRelacionados = '';
  if (relacionados.length && cat !== 'blog') {
    var rcCards = relacionados.map(function(r){
      var rHero = r.foto_hero || r.foto || '';
      var rImg = rHero
        ? '<div class="rcimg" style="background-image:url(\''+esc(rHero)+'\')"></div>'
        : '<div class="rcimg" style="'+grad+'"><span class="rcemoji">'+esc(r.emoji||'')+'</span></div>';
      var rRat = parseFloat(r.rating) || 0;
      var rN = parseInt(r.total_resenas||0, 10) || 0;
      var rStars = rN > 0 ? [1,2,3,4,5].map(function(i){ return '<span class="rcst'+(i<=Math.round(rRat)?' on':'')+'">*</span>'; }).join('') : '';
      var rMeta = (r.ciudad ? esc(r.ciudad) : '');
      if (r.region && r.region !== r.ciudad) rMeta = rMeta ? rMeta + ' - ' + esc(r.region) : esc(r.region);
      return '<a class="rcard" href="/'+esc(r.slug)+'.html">'
        + rImg
        + '<div class="rcbody">'
        + '<span class="rcbadge">'+esc(label)+'</span>'
        + '<div class="rctitle">'+esc(r.nombre)+'</div>'
        + (rMeta ? '<div class="rcmeta">'+rMeta+'</div>' : '')
        + (rN > 0 ? '<div class="rcrate"><span class="rcstars">'+rStars+'</span><span class="rcn">'+rRat.toFixed(1)+' ('+rN+')</span></div>' : '')
        + '</div></a>';
    }).join('');
    secRelacionados = '<section class="ssec bwhite" id="relacionados"><div class="sin">'
      + '<div class="strow"><div class="sgl"></div><h2 class="stitle bc">Tambien te puede interesar</h2><div class="stnum">'+nextNum()+'</div></div>'
      + '<div class="rcscroll">'+rcCards+'</div></div></section>';
  }

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
    {id:'evento-fechas', label:'Fecha y sede', has:!!secEventoInfo},
    {id:'lineup',      label:'Lineup',      has:!!secLineupEvento},
    {id:'agenda',      label:'Agenda',      has:!!secAgendaEvento},
    {id:'tipos-entrada', label:'Entradas',  has:!!secEntradasEvento},
    {id:'que-llevar',  label:'Que llevar',  has:!!secPrepEvento},
    {id:'reservar',    label:'Reservar',    has:!!secReservar},
    {id:'mapa',        label:'Mapa',        has:!!secMapa},
    {id:'faq',         label:'FAQ',         has:!!secFaq},
    {id:'resenas',     label:'Resenas',     has:!!secResenas},
    {id:'autor',       label:'Autor',       has:!!secBlogAutor},
    {id:'video',       label:'Video',       has:!!secBlogVideo}
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
    + schemaLD(d, cat, autor) + '\n'
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
    + '<button class="hobtn" id="btn-guardar" onclick="toggleGuardar(this)">\u2661 Guardar</button>'
    + '<button class="hobtn" id="btn-visitado" onclick="marcarVisitadoBtn(this)">\u2713 Estuve aqui</button>'
    + '</div></div>\n'
    + '<div class="hr"><div class="psm" style="'+heroMainStyle+'">'+(hero?'':'<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:48px;'+grad+'"></div>')+'</div>'
    + (heroThumbs ? '<div class="prow">'+heroThumbs+'</div>' : '')
    + '</div>\n</div></section>\n\n'

    + gstrip + '\n\n'
    + secDescripcion + '\n'
    + secBlogVideo + '\n'
    + secBlogAutor + '\n'
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
    + secEventoInfo + '\n'
    + secLineupEvento + '\n'
    + secAgendaEvento + '\n'
    + secEntradasEvento + '\n'
    + secPrepEvento + '\n'
    + secReservar + '\n'
    + secMapa + '\n'
    + secFaq + '\n'
    + secResenas + '\n'
    + secContact + '\n'
    + secRelacionados + '\n\n'

    + '<footer class="footer"><div class="flogo">EXPLORA<em>CO</em></div>'
    + '<p style="color:rgba(255,255,255,.5);font-size:11px">El directorio turistico mas completo de Colombia</p>'
    + '<div class="fcopy"><a href="/index.html">Inicio</a> &middot; <a href="/'+esc(dir)+'">'+esc(label)+'</a></div></footer>\n\n'

    + '<script src="/usuario-session.js"><\/script>\n'
    + '<script>\n'
    + 'var DID="'+esc(String(d.id))+'";\n'
    + 'var RV_AVG='+rat+';\n'
    + 'var RV_COUNT='+nRes+';\n'
    + 'var rvScore=0;\n'
    + 'function setRvScore(n){rvScore=n;document.querySelectorAll("#rv-stars .spk").forEach(function(s){s.classList.toggle("on",parseInt(s.dataset.v)<=n);});}\n'
    + 'var dimScores={};\n'
    + 'var travellerType=""\n'
    + 'var DIM_LABELS='+JSON.stringify(dimLabelMap)+';\n'
    + 'function setDimScore(dim,val){dimScores[dim]=val;var row=document.querySelector(\'.rv-stars-row[data-dim="\'+dim+\'"]\');if(!row)return;row.querySelectorAll(".rv-star").forEach(function(s){s.classList.toggle("on",parseInt(s.dataset.v)<=val);});}\n'
    + 'function selectTravellerType(btn,type){travellerType=type;document.querySelectorAll(".rv-type-btn").forEach(function(b){b.classList.remove("on");});btn.classList.add("on");}\n'
    + 'function switchItin(el,id){document.querySelectorAll(".itab").forEach(function(t){t.classList.remove("on");});document.querySelectorAll(".itin-panel").forEach(function(p){p.classList.remove("on");});el.classList.add("on");var panel=document.getElementById(id);if(panel)panel.classList.add("on");}\n'
    + 'function toggleFaq(el){el.parentElement.classList.toggle("open");}\n'
    // Inserta la resena recien publicada en el DOM y actualiza el
    // bloque de promedio/contador sin esperar a un reload -- antes el
    // unico feedback era el mensaje "Gracias", pero la lista y el
    // promedio en pantalla quedaban desactualizados hasta el proximo
    // request al servidor (que si trae los datos correctos, gracias a
    // Cache-Control: no-store, pero solo si el usuario recarga).
    + 'function addRvOptimista(nom,score,txt,dims,trav){\n'
    + '  var list=document.getElementById("rvlist");\n'
    + '  var stars=[1,2,3,4,5].map(function(i){return \'<span class="rvst\'+(i<=score?" on":"")+\'">*</span>\';}).join("");\n'
    + '  var travHtml=trav?\'<span class="rvtag">\'+trav+\'</span>\':\'\';\n'
    + '  var dimsHtml=\'\';\n'
    + '  if(dims){var parts=Object.keys(dims).filter(function(k){return parseInt(dims[k],10)>0;}).map(function(k){return \'<span>\'+(DIM_LABELS[k]||k.charAt(0).toUpperCase()+k.slice(1))+\': <b>\'+dims[k]+\'\\u2605</b></span>\';});if(parts.length)dimsHtml=\'<div class="rvdims">\'+parts.join("")+\'</div>\';}\n'
    + '  var div=document.createElement("div");\n'
    + '  div.className="rvitem";\n'
    + '  div.innerHTML=\'<div class="rvhead"><div class="rvav"></div><div class="rvname"></div><div class="rvstars">\'+stars+\'</div></div>\'+(travHtml||dimsHtml?\'<div style="margin:2px 0 4px">\'+travHtml+\'</div>\'+dimsHtml:\'\')+\'<div class="rvtx"></div>\';\n'
    + '  div.querySelector(".rvav").textContent=nom.slice(0,2).toUpperCase();\n'
    + '  div.querySelector(".rvname").textContent=nom;\n'
    + '  var tx=div.querySelector(".rvtx");\n'
    + '  if(txt){tx.textContent=txt;}else{tx.remove();}\n'
    + '  if(list)list.insertBefore(div,list.firstChild);\n'
    + '  var empty=document.getElementById("rvempty"); if(empty)empty.style.display="none";\n'
    + '  var rblock=document.getElementById("rblock"); if(rblock)rblock.style.display="";\n'
    + '  RV_COUNT=RV_COUNT+1;\n'
    + '  RV_AVG=((RV_AVG*(RV_COUNT-1))+score)/RV_COUNT;\n'
    + '  var rbavg=document.getElementById("rbavg"); if(rbavg)rbavg.textContent=RV_AVG.toFixed(1);\n'
    + '  var rbcnt=document.getElementById("rbcnt"); if(rbcnt)rbcnt.textContent=RV_COUNT+" resenas";\n'
    + '  var rbstars=document.getElementById("rbstars");\n'
    + '  if(rbstars)rbstars.innerHTML=[1,2,3,4,5].map(function(i){return \'<span class="rbst\'+(i<=Math.round(RV_AVG)?" on":"")+\'">*</span>\';}).join("");\n'
    + '}\n'
    + 'function submitRv(){\n'
    + '  var nom=document.getElementById("rvn").value.trim();\n'
    + '  var txt=document.getElementById("rvt").value.trim();\n'
    + '  if(!rvScore){alert("Selecciona una puntuacion");return;}\n'
    + '  if(!nom){alert("Ingresa tu nombre");return;}\n'
    + '  if(!window.ExploraCO){alert("Aun cargando, intenta de nuevo en un segundo");return;}\n'
    + '  var btn=document.querySelector(".wrsub");\n'
    + '  var scoreEnviado=rvScore, nomEnviado=nom, txtEnviado=txt, dimsEnviadas=Object.assign({},dimScores), travEnviado=travellerType;\n'
    + '  btn.disabled=true;btn.textContent="Publicando...";\n'
    // Antes esto era un fetch directo a /api/interacciones sin usuario_id,
    // por lo que toda resena real quedaba anonima (ver nota de entrega).
    // window.ExploraCO.publicarResena ya trae el usuario_id de la sesion
    // real y muestra sus propios mensajes de exito/error via toast.
    + '  window.ExploraCO.publicarResena(DID,rvScore,txt,nom,dimsEnviadas,travEnviado).then(function(ok){\n'
    + '    if(ok){\n'
    + '      addRvOptimista(nomEnviado,scoreEnviado,txtEnviado,dimsEnviadas,travEnviado);\n'
    + '      document.getElementById("rvok").style.display="block";\n'
    + '      document.getElementById("rvn").value="";\n'
    + '      document.getElementById("rvt").value="";\n'
    + '      rvScore=0;\n'
    + '      dimScores={};\n'
    + '      travellerType="";\n'
    + '      document.querySelectorAll("#rv-stars .spk").forEach(function(s){s.classList.remove("on");});\n'
    + '      document.querySelectorAll(".rv-star").forEach(function(s){s.classList.remove("on");});\n'
    + '      document.querySelectorAll(".rv-type-btn").forEach(function(b){b.classList.remove("on");});\n'
    + '      btn.textContent="Ya resenaste este lugar";\n'
    + '    }else{btn.disabled=false;btn.textContent="Publicar resena ->";}\n'
    + '  });\n'
    + '}\n'
    + 'var qrVotoActual=0;\n'
    + 'function pintarQR(){\n'
    + '  var spans=document.querySelectorAll("#qr-stars .spk");\n'
    + '  for(var i=0;i<spans.length;i++){var v=parseInt(spans[i].getAttribute("data-v"))||0;if(v<=qrVotoActual){spans[i].textContent="\u2605";spans[i].classList.add("on");}else{spans[i].textContent="\u2606";spans[i].classList.remove("on");}}\n'
    + '}\n'
    + 'function qrBloquear(){\n'
    + '  var qs=document.getElementById("qr-stars");if(qs)qs.style.pointerEvents="none";\n'
    + '}\n'
    + 'function votarDID(n){\n'
    + '  if(!document.getElementById("qr-stars")){return;}\n'
    + '  if(!window.ExploraCO){alert("Aun cargando, intenta de nuevo en un segundo");return;}\n'
    + '  window.ExploraCO.votar(DID,n).then(function(res){\n'
    + '    if(res.ok){qrVotoActual=n;pintarQR();qrBloquear();\n'
    + '      var qrok=document.getElementById("qrok");if(qrok)qrok.style.display="block";\n'
    + '      var rbavg=document.getElementById("rbavg");var rbcnt=document.getElementById("rbcnt");var rblock=document.getElementById("rblock");var rbstars=document.getElementById("rbstars");\n'
    + '      var na=RV_AVG*RV_COUNT;var nc=RV_COUNT+1;RV_AVG=(na+n)/nc;RV_COUNT=nc;\n'
    + '      if(rbavg)rbavg.textContent=RV_AVG.toFixed(1);\n'
    + '      if(rbcnt)rbcnt.textContent=RV_COUNT+" resenas";\n'
    + '      if(rblock)rblock.style.display="";\n'
    + '      if(rbstars)rbstars.innerHTML=[1,2,3,4,5].map(function(i){return \'<span class="rbst\'+(i<=Math.round(RV_AVG)?" on":"")+\'">*</span>\';}).join("");\n'
    + '    }else if(res.ya_votado){if(res.voto_previo&&res.voto_previo.rating){qrVotoActual=res.voto_previo.rating;pintarQR();qrBloquear();}}\n'
    + '  });\n'
    + '}\n'
    + 'function precargarMiVoto(){\n'
    + '  if(!window.ExploraCO){return;}\n'
    + '  window.ExploraCO.obtenerMiVoto(DID).then(function(r){if(r&&r.ok&&r.voto){qrVotoActual=r.voto.rating;pintarQR();qrBloquear();}});\n'
    + '}\n'
    + 'function toggleGuardar(btn){\n'
    + '  if(!window.ExploraCO){return;}\n'
    + '  window.ExploraCO.toggleGuardado(DID,btn);\n'
    + '}\n'
    + 'function marcarVisitadoBtn(btn){\n'
    + '  if(!window.ExploraCO){return;}\n'
    + '  btn.disabled=true;\n'
    + '  window.ExploraCO.marcarVisitado(DID).then(function(ok){btn.disabled=false;if(ok)btn.classList.add("activo");});\n'
    + '}\n'
    // Estado inicial del boton de guardar (si el visitante ya tiene
    // sesion y ya habia guardado este destino antes). El boton de
    // "Estuve aqui" no necesita este chequeo: el backend ya deduplica
    // sin importar el estado visual (ver api/interacciones.js v3).
    + 'if(window.ExploraCO){window.ExploraCO.estaGuardado(DID).then(function(g){if(g){var b=document.getElementById("btn-guardar");if(b)b.classList.add("activo");}});}\n'
    + 'if(document.getElementById("qr-stars")){precargarMiVoto();}\n'
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
      'SELECT i.rating, i.texto, i.dims, i.traveller_type, u.nombre AS usuario_nombre FROM interacciones i LEFT JOIN usuarios u ON i.usuario_id=u.id WHERE i.destino_id=$1 AND i.tipo=\'resena\' ORDER BY i.creado_en DESC LIMIT 10',
      [d.id]
    );

    // Promedio por dimension (resenas V2) para las barras de puntuacion.
    // Se construye el SELECT con las claves de la categoria para no traer
    // keys irrelevantes ni romper si la migracion 003 no ha corrido.
    var dimsAvg = {};
    try {
      var catH = d.categoria_slug || 'sitio';
      var dimDefsH = DIM_BY_CAT[catH] || DIM_BY_CAT.sitio;
      var dimSel = dimDefsH.map(function(dd){
        return 'ROUND(AVG(NULLIF(dims->>\''+dd[0]+'\',\'\')::numeric),1) AS "'+dd[0]+'"';
      }).join(', ');
      if (dimSel) {
        var dimsAvgRows = await sql(
          'SELECT '+dimSel+' FROM interacciones WHERE destino_id=$1 AND tipo=\'resena\' AND dims IS NOT NULL AND dims != \'{}\'::jsonb',
          [d.id]
        );
        if (dimsAvgRows.length) dimsAvg = dimsAvgRows[0] || {};
      }
    } catch (eDims) {
      // Si la migracion 003 no corrio, dims no existe -> mostrar sin barras
      console.warn('[pagina-destino] dims_avg fallo (migracion 003 pendiente?): ' + eDims.message);
    }

    // Autor del blog (tags.id_autor -> usuarios.id). Envuelto en
    // try/catch propio: si la migracion de usuarios.bio/foto_url
    // (ver nota de entrega) todavia no corrio en Neon, la pagina debe
    // seguir renderizando sin firma de autor en vez de devolver 500.
    var autor = null;
    if (d.categoria_slug === 'blog') {
      try {
        var tagsForAutor = safeJSON(d.tags);
        var idAutorBlog = (tagsForAutor && typeof tagsForAutor === 'object' && !Array.isArray(tagsForAutor)) ? tagsForAutor.id_autor : null;
        if (idAutorBlog) {
          var autorRows = await sql('SELECT id, nombre, bio, foto_url FROM usuarios WHERE id=$1 LIMIT 1', [idAutorBlog]);
          if (autorRows.length) autor = autorRows[0];
        }
      } catch (eAutor) {
        console.error('[pagina-destino] autor blog fallo (posible migracion pendiente): ' + eAutor.message);
      }
    }

    // Comparador (TSK-017): hermanos de la misma categoria raiz.
    // Blog se excluye (sin comparador). Se consulta un pool de
    // candidatos y topRelacionados() rankea por overlap de tags y
    // recorta a 3; si hay pocos hermanos con overlap, el relleno por
    // rating garantiza "compartiendo la categoria raiz" (evidencia).
    var relacionados = [];
    if (d.categoria_slug && d.categoria_slug !== 'blog') {
      var relRows = await sql(
        "SELECT id, slug, nombre, ciudad, region, foto_hero, emoji, hero_bg, rating, total_resenas, categoria_slug, tags FROM destinos WHERE categoria_slug=$1 AND status='published' AND id<>$2 ORDER BY rating DESC NULLS LAST LIMIT 50",
        [d.categoria_slug, d.id]
      );
      relacionados = topRelacionados(d, relRows, 3);
    }

    var html = buildHTML(d, det, fotosRows, resenasRows, autor, relacionados, dimsAvg);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    return res.status(200).send(html);

  } catch (err) {
    console.error('[pagina-destino]', err.message);
    console.error('[pagina-destino] slug='+slug+' err='+err.message+' stack='+err.stack);
    return res.status(500).send('<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Error \u2013 ExploraCO</title><style>body{font-family:sans-serif;text-align:center;padding:4rem 1rem;background:#FBF8F2}a{color:#E8A020}pre{text-align:left;background:#f5f5f5;padding:1rem;border-radius:8px;font-size:11px;overflow-x:auto}</style></head><body><h1 style="font-size:2rem;margin-bottom:1rem">\u26a0\ufe0f Error temporal</h1><p>No pudimos cargar esta p\u00e1gina.</p><pre>'+err.message+'</pre><p style="margin-top:1.5rem"><a href="/index.html">\u2190 Volver al inicio</a></p></body></html>');
  }
};
