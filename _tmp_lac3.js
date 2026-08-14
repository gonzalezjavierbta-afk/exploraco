
const MEDIA=[{"type":"photo","src":"https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Plaza_de_Bol%C3%ADvar%2C_Bogot%C3%A1.jpg/1200px-Plaza_de_Bol%C3%ADvar%2C_Bogot%C3%A1.jpg","cap":"Plaza de Bolívar y Catedral Primada"},{"type":"photo","src":"https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/Museo_del_Oro_Bogot%C3%A1.jpg/800px-Museo_del_Oro_Bogot%C3%A1.jpg","cap":"Fachada del Museo del Oro"},{"type":"photo","src":"https://upload.wikimedia.org/wikipedia/commons/thumb/3/3d/Museo_Botero_Bogot%C3%A1.jpg/800px-Museo_Botero_Bogot%C3%A1.jpg","cap":"Fachada del Museo Botero"},{"type":"photo","src":"https://upload.wikimedia.org/wikipedia/commons/thumb/e/e7/Teatro_Col%C3%B3n_Bogot%C3%A1.jpg/800px-Teatro_Col%C3%B3n_Bogot%C3%A1.jpg","cap":"Teatro Colón"},{"type":"photo","src":"https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/Calle_empedrada_La_Candelaria.jpg/800px-Calle_empedrada_La_Candelaria.jpg","cap":"Calle empedrada de La Candelaria"}];
var lbIdx=0;
function openLB(i){lbIdx=i;renderLB();document.getElementById('lb').classList.add('open');}
function renderLB(){
  var m=MEDIA[lbIdx],el=document.getElementById('lbm');
  if(m.type==='photo'&&m.src){
    el.innerHTML='<img src="'+m.src+'" alt="'+m.cap+'" onerror="this.style.display=\'none\'">';
  }else{
    el.innerHTML='<div class="lbmp" style="background:#111">▶️</div>';
  }
  document.getElementById('lbcp').textContent=(lbIdx+1)+'/'+MEDIA.length+' · '+m.cap;
}
function lbNav(d){lbIdx=(lbIdx+d+MEDIA.length)%MEDIA.length;renderLB();}
function closeLB(){document.getElementById('lb').classList.remove('open');}
document.getElementById('lb').addEventListener('click',function(e){if(e.target===document.getElementById('lb'))closeLB();});

// Map
var map=L.map('mapel',{zoomControl:true,scrollWheelZoom:false}).setView([4.7120,-74.0680],14);
L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',{attribution:'&copy; CARTO',maxZoom:19}).addTo(map);
var ico=L.divIcon({html:'<div style="width:38px;height:38px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:#E8A020;display:flex;align-items:center;justify-content:center;box-shadow:0 3px 12px rgba(0,0,0,.35);border:2.5px solid #fff"><span style="transform:rotate(45deg);font-size:16px">🏛️</span></div>',iconSize:[38,38],iconAnchor:[19,38],popupAnchor:[0,-40],className:''});
L.marker([4.7120,-74.0680],{icon:ico}).addTo(map).bindPopup('<b style="font-size:13px">La Candelaria</b><br><span style="font-size:11px;color:#666">📍 Bogotá, Cundinamarca</span>',{maxWidth:220}).openPopup();

// Stars
var ps=0;
function spS(v){ps=v;document.querySelectorAll('.spk').forEach(function(s){var sv=parseInt(s.dataset.v);s.classList.toggle('s',sv<=v);s.classList.remove('h');});}
function spH(v){document.querySelectorAll('.spk').forEach(function(s){var sv=parseInt(s.dataset.v);s.classList.toggle('h',sv<=v&&!(ps&&sv<=ps));});}
function spO(){document.querySelectorAll('.spk').forEach(function(s){s.classList.remove('h');});}

// Save/Visit
var PLACE_ID=109;
var mmSaved=[],mmVisited=[];
try{mmSaved=JSON.parse(localStorage.getItem('mm_saved')||'[]');}catch(e){}
try{mmVisited=JSON.parse(localStorage.getItem('mm_visited')||'[]');}catch(e){}
function updateSaveBtn(){
  var btn=document.getElementById('save-fab');
  if(!btn)return;
  var saved=mmSaved.indexOf(PLACE_ID)!==-1;
  btn.className='save-fab '+(saved?'saved':'unsaved');
  var icon=btn.querySelector('.save-fab-icon');
  if(icon)icon.textContent=saved?'♥':'♡';
  var lbl=document.getElementById('save-fab-lbl');
  if(lbl)lbl.textContent=saved?'Guardado ✓':'Guardar en Mi Mapa';
}
function toggleSave(){
  var idx=mmSaved.indexOf(PLACE_ID);
  var saving=idx===-1;
  if(saving)mmSaved.push(PLACE_ID);
  else mmSaved.splice(idx,1);
  try{localStorage.setItem('mm_saved',JSON.stringify(mmSaved));}catch(e){}
  updateSaveBtn();
  showToast(saving?'♥ Guardado en tu Mi Mapa':'Eliminado de Mi Mapa');
}
function showToast(msg){
  var t=document.getElementById('save-toast');
  if(!t)return;
  t.textContent=msg;t.classList.add('show');
  setTimeout(function(){t.classList.remove('show');},2200);
}
updateSaveBtn();

// Itinerario tabs
function switchItin(btn,panel){
  document.querySelectorAll('.itab').forEach(function(t){t.classList.remove('on');});
  document.querySelectorAll('.itin-panel').forEach(function(p){p.classList.remove('on');});
  btn.classList.add('on');
  var el=document.getElementById('itin-'+panel);
  if(el)el.classList.add('on');
}

// FAQ
function toggleFaq(el){el.parentElement.classList.toggle('open');}

// Dim scores (reviews)
var dimScores={experiencia:0,guias:0,acceso:0,valor:0};
var travellerType='';
function setDimScore(dim,val){
  dimScores[dim]=val;
  var row=document.querySelector('.rv-stars-row[data-dim="'+dim+'"]');
  if(!row)return;
  row.querySelectorAll('.rv-star').forEach(function(s){s.classList.toggle('on',parseInt(s.dataset.v)<=val);});
}
function selectTravellerType(btn,type){
  travellerType=type;
  document.querySelectorAll('.rv-type-btn').forEach(function(b){b.classList.remove('on');});
  btn.classList.add('on');
}

// Quién va
(function(){
  var c=document.getElementById('lugar-viajeros');if(!c)return;
  var users=[{i:'MR',bg:'#1a3a5c',tc:'#7eb8f0',n:'María'},{i:'CP',bg:'#3a1a0a',tc:'#f0a87e',n:'Carlos'},{i:'LA',bg:'#0a2a1a',tc:'#7ef0b8',n:'Laura'},{i:'DS',bg:'#1a051a',tc:'#f07ef0',n:'Diego'},{i:'VN',bg:'#0a1a3a',tc:'#7ea8f0',n:'Valentina'}];
  c.innerHTML=users.map(function(u){return '<div class="qv-person"><div class="qv-av" style="background:'+u.bg+';color:'+u.tc+'">'+u.i+'</div><div class="qv-name">'+u.n+'</div></div>';}).join('');
})();

// Reviews
var urvs=[];
try{urvs=JSON.parse(localStorage.getItem('rv_lacandelaria')||'[]');}catch(e){}
var seedRvs=[{n:'María',s:5,t:'Pasear por La Candelaria es como volver al siglo XIX. Las calles empedradas, el aroma a chocolate santafereño y los murales te transportan. El Museo del Oro al atardecer es mágico.',d:'Ene 2026',travType:'Pareja',dims:{experiencia:5,guias:4,acceso:4,valor:5}},{n:'Carlos',s:5,t:'Me enamoró el Pasaje Hernández y la Librería Merlin. La arquitectura colonial aquí es impresionante. Llevar zapatos cómodos, las calles son empedradas.',d:'Feb 2026',travType:'Solo',dims:{experiencia:5,guias:5,acceso:4,valor:5}},{n:'Laura',s:4,t:'Perfecto para un día cultural. Plaza de Bolívar, Catedral, Museo del Oro y el Chorro de Quevedo. Todo caminando y muy bonito. El ajiaco del almuerzo fue el mejor.',d:'Mar 2026',travType:'Amigos',dims:{experiencia:5,guias:4,acceso:5,valor:5}}];
if(!urvs.length){urvs=seedRvs;try{localStorage.setItem('rv_lacandelaria',JSON.stringify(urvs));}catch(e){}}

function addRv(r){
  var cols=['#1a3a5c','#3a1a0a','#0a2a1a','#1a051a','#0a1a3a'];
  var tcs=['#7eb8f0','#f0a87e','#7ef0b8','#f07ef0','#7ea8f0'];
  var i=document.getElementById('rvlist').children.length%5;
  var init=r.n.split(' ').map(function(w){return w[0];}).join('').toUpperCase().slice(0,2);
  var stH=[1,2,3,4,5].map(function(x){return '<span class="rvst'+(x<=r.s?' on':'')+'">\u2605</span>';}).join('');
  var typeTag=r.travType?'<span style="background:#F1EFE8;color:#777;font-size:9px;padding:2px 7px;border-radius:3px;margin-right:4px">'+r.travType+'</span>':'';
  var dimsHtml='';
  if(r.dims&&r.dims.experiencia){
    dimsHtml='<div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:5px">'+Object.keys(r.dims).filter(function(k){return r.dims[k]>0;}).map(function(k){return '<span style="font-size:9px;color:#777">'+k.charAt(0).toUpperCase()+k.slice(1)+': <b style="color:#1a1a1a">'+r.dims[k]+'\u2605</b></span>';}).join('')+'</div>';
  }
  var div=document.createElement('div');div.className='rvitem';
  div.innerHTML='<div class="rvhead"><div class="rvav" style="background:'+cols[i]+';color:'+tcs[i]+'">'+init+'</div><div><div class="rvname">'+r.n+'</div><div class="rvdate">'+r.d+'</div></div><div class="rvstars">'+stH+'</div></div><div style="margin:5px 0 3px">'+typeTag+'<span class="rvtag" style="background:#F0FDF4;color:#166634;font-size:9px;padding:2px 7px;border-radius:3px">🏛️ Lugar</span></div>'+dimsHtml+'<div class="rvtx">'+r.t+'</div>';
  document.getElementById('rvlist').insertBefore(div,document.getElementById('rvlist').firstChild);
}
document.getElementById('rvlist').innerHTML='';
urvs.forEach(function(r){addRv(r);});

function subRv(){
  var n=(document.getElementById('wrn').value||'').trim();
  var t=(document.getElementById('wrt').value||'').trim();
  if(!ps){alert('Selecciona estrellas ★');return;}
  if(t.length<15){alert('Escribe al menos 15 caracteres.');return;}
  var now=new Date(),ms=['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  var rv={n:n||'Viajero',s:ps,t:t,d:ms[now.getMonth()]+' '+now.getFullYear(),travType:travellerType,dims:Object.assign({},dimScores)};
  urvs.push(rv);
  try{localStorage.setItem('rv_lacandelaria',JSON.stringify(urvs));}catch(e){}
  addRv(rv);
  document.getElementById('wrn').value='';document.getElementById('wrt').value='';
  ps=0;document.querySelectorAll('.spk').forEach(function(s){s.classList.remove('s','h');});
  dimScores={experiencia:0,guias:0,acceso:0,valor:0};
  document.querySelectorAll('.rv-star').forEach(function(s){s.classList.remove('on');});
  document.querySelectorAll('.rv-type-btn').forEach(function(b){b.classList.remove('on');});
  travellerType='';
  var ok=document.getElementById('wrok'),btn=document.querySelector('.wrsub');
  btn.style.display='none';ok.style.display='block';
  setTimeout(function(){btn.style.display='';ok.style.display='none';},3000);
}

/* ── HAMBURGER MENU ── */
function toggleDrawer(){
  var btn=document.getElementById('ham-btn');
  var drawer=document.getElementById('mobile-drawer');
  var open=drawer.classList.toggle('open');
  btn.classList.toggle('open',open);
  document.body.style.overflow=open?'hidden':'';
}
document.addEventListener('keydown',function(e){
  if(e.key==='Escape'){var d=document.getElementById('mobile-drawer');if(d&&d.classList.contains('open'))toggleDrawer();}
});

/* ── STICKY SECTION NAV + PROGRESS ── */
(function(){
  var fill = document.getElementById('prog-fill');
  var links = document.querySelectorAll('.sn-link');

  function updateProgress(){
    var s = window.scrollY;
    var h = document.documentElement.scrollHeight - window.innerHeight;
    var pct = h > 0 ? Math.round(s/h*100) : 0;
    if(fill) fill.style.width = pct + '%';
  }

  function updateActiveLink(){
    var sections = [];
    links.forEach(function(a){
      var id = a.getAttribute('href');
      var el = id ? document.querySelector(id) : null;
      if(el) sections.push({el:el, a:a});
    });
    var scrollY = window.scrollY + 120;
    var active = null;
    sections.forEach(function(s){
      if(s.el.offsetTop <= scrollY) active = s;
    });
    links.forEach(function(a){ a.classList.remove('active'); });
    if(active) {
      active.a.classList.add('active');
      active.a.scrollIntoView({behavior:'smooth',block:'nearest',inline:'nearest'});
    }
  }

  window.addEventListener('scroll', function(){
    updateProgress();
    updateActiveLink();
  }, {passive:true});

  updateProgress();
  updateActiveLink();
})();

/* ── BACK TO TOP ── */
(function(){
  var btn = document.getElementById('btt-btn');
  if(!btn) return;
  window.addEventListener('scroll', function() {
    btn.style.display = window.scrollY > 400 ? 'flex' : 'none';
  }, {passive: true});
  btn.onmouseenter = function() { this.style.background='#333'; this.style.color='#fff'; };
  btn.onmouseleave = function() { this.style.background='var(--black)'; this.style.color='rgba(255,255,255,.6)'; };
})();


/* ══ COMPARTIR ══ */
function toggleShareMenu(btn){var dd=document.getElementById('share-dropdown');if(dd)dd.classList.toggle('open');}
function sharePlace(){
  var url=location.href;
  if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(url);}
  showToast('🔗 Link copiado');
}
function shareToWhatsApp(){
  window.open('https://wa.me/?text='+encodeURIComponent(location.href),'_blank');
}
