
var DID="monserrate";
var RV_AVG=4.9;
var RV_COUNT=4820;
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
  for(var i=0;i<spans.length;i++){var v=parseInt(spans[i].getAttribute("data-v"))||0;if(v<=qrVotoActual){spans[i].textContent="★";spans[i].classList.add("on");}else{spans[i].textContent="☆";spans[i].classList.remove("on");}}
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
