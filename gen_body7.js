const fs = require('fs');

const chunk = `
<section class="ssec bwhite" id="contact"><div class="sin">
<div class="strow"><div class="sgl"></div><h2 class="stitle bc">Contacto</h2><div class="stnum">13</div></div>
<div class="cgrid">
<a class="cbtn gold" href="https://www.google.com/maps/dir/?api=1&destination=4.7120,-74.0680" target="_blank">🗺️ Google Maps</a>
<a class="cbtn blue" href="https://www.bogota.gov.co" target="_blank">○ Sitio web</a>
<a class="cbtn blue" href="https://instagram.com/lacandelaria" target="_blank">Instagram</a>
</div>
</div></section>

<section class="ssec bwarm" id="relacionados"><div class="sin">
<div class="strow"><div class="sgl"></div><h2 class="stitle bc">Tambien te puede interesar</h2><div class="stnum">14</div></div>
<div class="rcscroll">
<a class="rcard" href="/monserrate2.html"><div class="rcimg" style="background-image:url('https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/2019_Bogot%C3%A1_-_Iglesia_de_Monserrate.jpg/1200px-2019_Bogot%C3%A1_-_Iglesia_de_Monserrate.jpg')"></div><div class="rcbody"><span class="rcbadge">Lugares &amp; Sitios</span><div class="rctitle">Monserrate</div><div class="rcmeta">Bogotá - Cundinamarca</div><div class="rcrate"><span class="rcstars"><span class="rcst on">*</span><span class="rcst on">*</span><span class="rcst on">*</span><span class="rcst on">*</span><span class="rcst on">*</span></span><span class="rcn">4.9 (4820)</span></div></div></a>
<a class="rcard" href="/ciclovia-bogota.html"><div class="rcimg" style="background-image:url('https://images.unsplash.com/photo-1516450360143-0f0a450e5acd?w=1200&q=80')"></div><div class="rcbody"><span class="rcbadge">Lugares &amp; Sitios</span><div class="rctitle">Ciclovía de Bogotá</div><div class="rcmeta">Bogotá - Cundinamarca</div><div class="rcrate"><span class="rcstars"><span class="rcst on">*</span><span class="rcst on">*</span><span class="rcst on">*</span><span class="rcst on">*</span><span class="rcst on">*</span></span><span class="rcn">4.9 (1100)</span></div></div></a>
<a class="rcard" href="/quebrada-la-vieja-bogota.html"><div class="rcimg" style="background-image:url('https://images.unsplash.com/photo-1501854140801-50d01698950b?w=1200&q=80')"></div><div class="rcbody"><span class="rcbadge">Lugares &amp; Sitios</span><div class="rctitle">Quebrada La Vieja</div><div class="rcmeta">Bogotá - Cundinamarca</div><div class="rcrate"><span class="rcstars"><span class="rcst on">*</span><span class="rcst on">*</span><span class="rcst on">*</span><span class="rcst on">*</span><span class="rcst">*</span></span><span class="rcn">4.7 (540)</span></div></div></a>
</div></div></section>

<footer class="footer"><div class="flogo">EXPLORA<em>CO</em></div>
<p style="color:rgba(255,255,255,.5);font-size:11px">El directorio turistico mas completo de Colombia</p>
<div class="fcopy"><a href="/index.html">Inicio</a> &middot; <a href="/directorio-sitio.html">Lugares &amp; Sitios</a></div></footer>

<script src="/usuario-session.js"></script>
<script>
var DID="lacandelaria";
var RV_AVG=4.7;
var RV_COUNT=2500;
var rvScore=0;
function setRvScore(n){rvScore=n;document.querySelectorAll("#rv-stars .spk").forEach(function(s){s.classList.toggle("on",parseInt(s.dataset.v)<=n);});}
function switchItin(el,id){document.querySelectorAll(".itab").forEach(function(t){t.classList.remove("on");t.style.color="var(--muted)";t.style.borderColor="transparent";});document.querySelectorAll(".itin-panel").forEach(function(p){p.classList.remove("on");});el.classList.add("on");el.style.color="var(--gold)";el.style.borderColor="var(--gold)";var panel=document.getElementById(id);if(panel)panel.classList.add("on");}
function addRvOptimista(nom,score,txt){
  var list=document.getElementById("rvlist");
  var stars=[1,2,3,4,5].map(function(i){return '<span class="rvst'+(i<=score?" on":"")+'">*</span>';}).join("");
  var div=document.createElement("div");
  div.className="rvitem";
  div.innerHTML='<div class="rvhead"><div class="rvav"></div><div class="rvname"></div><div class="rvstars">'+stars+'</div></div><div class="rvtx"></div>';
  div.querySelector(".rvav").textContent=nom.slice(0,2).toUpperCase();
  div.querySelector(".rvname").textContent=nom;
  var tx=div.querySelector(".rvtx");
  if(txt){tx.textContent=txt;}else{tx.remove();}
  if(list)list.insertBefore(div,list.firstChild);
  var empty=document.getElementById("rvempty"); if(empty)empty.style.display="none";
  var rblock=document.getElementById("rblock"); if(rblock)rblock.style.display="";
  RV_COUNT=RV_COUNT+1;
  RV_AVG=((RV_AVG*(RV_COUNT-1))+score)/RV_COUNT;
  var rbavg=document.getElementById("rbavg"); if(rbavg)rbavg.textContent=RV_AVG.toFixed(1);
  var rbcnt=document.getElementById("rbcnt"); if(rbcnt)rbcnt.textContent=RV_COUNT+" resenas";
  var rbstars=document.getElementById("rbstars");
  if(rbstars)rbstars.innerHTML=[1,2,3,4,5].map(function(i){return '<span class="rbst'+(i<=Math.round(RV_AVG)?" on":"")+'">*</span>';}).join("");
}
function submitRv(){
  var nom=document.getElementById("rvn").value.trim();
  var txt=document.getElementById("rvt").value.trim();
  if(!rvScore){alert("Selecciona una puntuacion");return;}
  if(!nom){alert("Ingresa tu nombre");return;}
  if(!window.ExploraCO){alert("Aun cargando, intenta de nuevo en un segundo");return;}
  var btn=document.querySelector(".wrsub");
  var scoreEnviado=rvScore, nomEnviado=nom, txtEnviado=txt;
  btn.disabled=true;btn.textContent="Publicando...";
  window.ExploraCO.publicarResena(DID,rvScore,txt,nom).then(function(ok){
    if(ok){
      addRvOptimista(nomEnviado,scoreEnviado,txtEnviado);
      document.getElementById("rvok").style.display="block";
      document.getElementById("rvn").value="";
      document.getElementById("rvt").value="";
      rvScore=0;
      document.querySelectorAll("#rv-stars .spk").forEach(function(s){s.classList.remove("on");});
      btn.textContent="Ya resenaste este lugar";
    }else{btn.disabled=false;btn.textContent="Publicar resena ->";}
  });
}
var qrVotoActual=0;
function pintarQR(){
  var spans=document.querySelectorAll("#qr-stars .spk");
  for(var i=0;i<spans.length;i++){var v=parseInt(spans[i].getAttribute("data-v"))||0;if(v<=qrVotoActual){spans[i].textContent="*";spans[i].classList.add("on");}else{spans[i].textContent="/";spans[i].classList.remove("on");}}
}
function qrBloquear(){
  var qs=document.getElementById("qr-stars");if(qs)qs.style.pointerEvents="none";
}
function votarDID(n){
  if(!document.getElementById("qr-stars")){return;}
  if(!window.ExploraCO){alert("Aun cargando, intenta de nuevo en un segundo");return;}
  window.ExploraCO.votar(DID,n).then(function(res){
    if(res.ok){qrVotoActual=n;pintarQR();qrBloquear();
      var qrok=document.getElementById("qrok");if(qrok)qrok.style.display="block";
      var rbavg=document.getElementById("rbavg");var rbcnt=document.getElementById("rbcnt");var rblock=document.getElementById("rblock");var rbstars=document.getElementById("rbstars");
      var na=RV_AVG*RV_COUNT;var nc=RV_COUNT+1;RV_AVG=(na+n)/nc;RV_COUNT=nc;
      if(rbavg)rbavg.textContent=RV_AVG.toFixed(1);
      if(rbcnt)rbcnt.textContent=RV_COUNT+" resenas";
      if(rblock)rblock.style.display="";
      if(rbstars)rbstars.innerHTML=[1,2,3,4,5].map(function(i){return '<span class="rbst'+(i<=Math.round(RV_AVG)?" on":"")+'">*</span>';}).join("");
    }else if(res.ya_votado){if(res.voto_previo&&res.voto_previo.rating){qrVotoActual=res.voto_previo.rating;pintarQR();qrBloquear();}}
  });
}
function precargarMiVoto(){
  if(!window.ExploraCO){return;}
  window.ExploraCO.obtenerMiVoto(DID).then(function(r){if(r&&r.ok&&r.voto){qrVotoActual=r.voto.rating;pintarQR();qrBloquear();}});
}
function toggleGuardar(btn){
  if(!window.ExploraCO){return;}
  window.ExploraCO.toggleGuardado(DID,btn);
}
function marcarVisitadoBtn(btn){
  if(!window.ExploraCO){return;}
  btn.disabled=true;
  window.ExploraCO.marcarVisitado(DID).then(function(ok){btn.disabled=false;if(ok)btn.classList.add("activo");});
}
if(window.ExploraCO){window.ExploraCO.estaGuardado(DID).then(function(g){if(g){var b=document.getElementById("btn-guardar");if(b)b.classList.add("activo");}});}
if(document.getElementById("qr-stars")){precargarMiVoto();}
</script>

HTMLEOF
`;

fs.appendFileSync('_lacandelaria2_body.html', chunk, 'utf8');
console.log('Appended contact+footer+scripts, total:', fs.statSync('_lacandelaria2_body.html').size, 'bytes');
