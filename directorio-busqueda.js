/* F3: dropdown de sugerencias (typos/sinonimos) + recomendado para ti.
   Wave 2 ADR-090. Usa api/destinos.js por query params (sin endpoint nuevo). */
(function(){
  var CAT='';
  var _cs=document.currentScript;
  if(_cs&&_cs.getAttribute) CAT=_cs.getAttribute('data-cat')||'';
  if(!CAT){
    var _mn=document.querySelector('main.results-area[class*="tpl-"]');
    if(_mn){var _cm=/tpl-([a-z]+)/.exec(_mn.className);if(_cm) CAT=_cm[1];}
  }
  var inp=document.getElementById('dir-search');
  var dd=document.getElementById('dir-suggest');
  var recSec=document.getElementById('dir-rec');
  var recGrid=document.getElementById('dir-rec-grid');
  if(!inp||!dd) return;
  inp.setAttribute('role','combobox');
  inp.setAttribute('aria-autocomplete','list');
  inp.setAttribute('aria-controls','dir-suggest');
  inp.setAttribute('aria-expanded','false');
  var tmr=null,seq=0,items=[],idx=-1,pickedUuid=null;
  var URE=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  function asUuid(v){return (typeof v==='string'&&URE.test(v))?v:null;}
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function nrm(v){return EB?EB.normGeo(v):String(v==null?'':v).toLowerCase();}
  function toks(v){if(EB&&EB.normTokens) return EB.normTokens(v);var t=String(v==null?'':v).toLowerCase().split(/\s+/);return t.filter(function(x){return x;});}
  function etiquetaVia(p){
    var v=p&&p.via?String(p.via):'';
    return (v==='typo'||v==='sinonimo')?v:'';
  }
  function rowHtml(p,i){
    var bg=p.hero_bg||'#0F1419';
    var t=etiquetaVia(p);
    var bdg=t?'<span class="dir-sg-bdg">'+t+'</span>':'';
    return '<button type="button" class="dir-sg-item" role="option" id="dsg-'+i+'" aria-selected="false"'
      +' onmouseenter="window.__dsgHover('+i+')" onclick="window.__dsgPick('+i+')">'
      +'<span class="dir-sg-th" style="background:'+bg+'">'+(p.emoji||'\uD83D\uDCCD')+'</span>'
      +'<span style="min-width:0;flex:1"><span class="dir-sg-n">'+esc(p.name)+'</span>'
      +'<span class="dir-sg-m">'+esc(p.cat||'')+(p.city?' \u00B7 '+esc(p.city):'')+'</span></span>'
      +bdg+'</button>';
  }
  function setAria(){
    var open=dd.classList.contains('open');
    inp.setAttribute('aria-expanded',open?'true':'false');
    dd.setAttribute('aria-hidden',open?'false':'true');
    if(idx>=0) inp.setAttribute('aria-activedescendant','dsg-'+idx);
    else inp.removeAttribute('aria-activedescendant');
  }
  function marker(){
    var o=dd.querySelectorAll('.dir-sg-item');
    for(var i=0;i<o.length;i++){
      var on=(i===idx);
      o[i].classList.toggle('on',on);
      o[i].setAttribute('aria-selected',on?'true':'false');
      if(on&&o[i].scrollIntoView) o[i].scrollIntoView({block:'nearest'});
    }
    setAria();
  }
  function render(list,q){
    items=list.slice(0,8);idx=-1;
    if(!items.length){
      dd.innerHTML='<div class="dir-sg-empty">Sin coincidencias</div>';
      dd.classList.add('open');setAria();return;
    }
    var h='<div class="dir-sg-lbl">Resultados</div>';
    for(var i=0;i<items.length;i++) h+=rowHtml(items[i],i);
    dd.innerHTML=h;
    dd.classList.add('open');setAria();
  }
  function close(){dd.classList.remove('open');idx=-1;setAria();}
  function local(q){
    var tk=toks(q);
    return (PLACES||[]).filter(function(p){
      var hay=nrm(p.name)+' '+nrm(p.city||'')+' '+nrm(p.region||'');
      for(var j=0;j<tk.length;j++){if(hay.indexOf(tk[j])<0) return false;}
      return true;
    });
  }
  function server(q){
    var s=++seq;
    fetch('/api/destinos?sugerir=1&q='+encodeURIComponent(q)+'&limit=8&categoria='+CAT,{headers:{'Accept':'application/json'}})
      .then(function(r){return r.ok?r.json():null;})
      .then(function(d){
        if(s!==seq) return;
        if(!inp||inp.value.trim()!==q) return;
        var arr=(d&&d.sugerencias)?d.sugerencias:[];
        if(!arr.length) return;
        var extra=local(q),seen={},out=[],k,m;
        for(k=0;k<arr.length;k++){out.push(arr[k]);seen[arr[k].slug||arr[k].name]=1;}
        for(m=0;m<extra.length;m++){if(!seen[extra[m].slug||extra[m].name]) out.push(extra[m]);}
        render(out,q);
      })
      .catch(function(){});
  }
  function ask(q){
    if(tmr){clearTimeout(tmr);tmr=null;}
    if(!q||q.length<2){seq++;return;}
    tmr=setTimeout(function(){server(q);},180);
  }
  window.__dsgHover=function(i){if(idx===i)return;idx=i;marker();};
  window.__dsgPick=function(i){
    var p=items[i];if(!p)return;
    pickedUuid=asUuid(p._uuid||p.uuid||p.id);
    inp.value=p.name;fSearch=p.name;
    close();
    if(typeof applyFilters==='function') applyFilters();
    loadRec();
  };
  inp.addEventListener('input',function(){
    var q=inp.value.trim();
    if(q.length>=2) render(local(q),q); else close();
    ask(q);
  });
  inp.addEventListener('focus',function(){var q=inp.value.trim();if(q.length>=2) render(local(q),q);});
  inp.addEventListener('keydown',function(e){
    if(!dd.classList.contains('open')) return;
    var n=items.length;
    if(e.key==='ArrowDown'){if(!n)return;e.preventDefault();idx=(idx+1)%n;marker();}
    else if(e.key==='ArrowUp'){if(!n)return;e.preventDefault();idx=(idx-1+n)%n;marker();}
    else if(e.key==='Enter'){if(idx>=0&&items[idx]){e.preventDefault();window.__dsgPick(idx);}}
    else if(e.key==='Escape'){close();}
  });
  document.addEventListener('click',function(e){
    if(!dd.contains(e.target)&&e.target!==inp) close();
  });
  function semillaActual(){
    if(pickedUuid) return pickedUuid;
    var list=(typeof getFiltered==='function')?getFiltered():(PLACES||[]);
    for(var i=0;i<list.length;i++){if(list[i]){var u=asUuid(list[i]._uuid||list[i].uuid||list[i].id);if(u) return u;}}
    return null;
  }
  function recCard(p){
    var bg=p.hero_bg||'#0F1419';
    var ph=p.foto||(p.photos&&p.photos[0]?p.photos[0].url:'');
    var img=ph?'<img src="'+esc(ph)+'" alt="'+esc(p.name)+'" loading="lazy" onerror="this.onerror=null;this.style.display=\'none\'">':'';
    var r=p.rating?'\u2605'+p.rating:'';
    return '<a class="dr-c" href="'+esc(p.slug)+'.html">'
      +'<span class="dr-img" style="background:'+bg+'">'+(p.emoji||'\uD83D\uDCCD')+img+'</span>'
      +'<span class="dr-b"><span class="dr-n">'+esc(p.name)+'</span>'
      +'<span class="dr-l">'+esc(p.city||'')+(r?' \u00B7 '+r:'')+'</span></span></a>';
  }
  function loadRec(){
    if(!recSec||!recGrid) return;
    var sm=semillaActual();
    var url='/api/destinos?recomendar=1&limit=6&categoria='+CAT+(sm?'&semilla='+encodeURIComponent(sm):'');
    fetch(url,{headers:{'Accept':'application/json'}})
      .then(function(r){return r.ok?r.json():null;})
      .then(function(d){
        var arr=(d&&d.modo==='recomendar'&&d.data)?d.data:[];
        if(!arr.length){recSec.hidden=true;return;}
        var h='';for(var i=0;i<arr.length;i++) h+=recCard(arr[i]);
        recGrid.innerHTML=h;recSec.hidden=false;
      })
      .catch(function(){recSec.hidden=true;});
  }
  if(recSec) setTimeout(loadRec,900);
})();

