# patch_admin_evento.py
# TASK-003 -- Implementa la categoria Evento en admin.html
# Protocolo de Edicion Estructural via Python (Reglas de Oro ExploraCO v5, punto 2)
# Cada cambio usa str.replace() con coincidencia EXACTA y unica.

import sys

PATH = 'admin.html'

with open(PATH, 'r', encoding='utf-8') as f:
    src = f.read()

original = src
changes = []

def apply(label, old, new, count=1):
    global src
    n = src.count(old)
    if n != count:
        print('FALLO [' + label + ']: se esperaban ' + str(count) +
              ' coincidencias, se encontraron ' + str(n))
        sys.exit(1)
    src = src.replace(old, new, count)
    changes.append(label)

# ----------------------------------------------------------------------
# CAMBIO 1: HTML de #especifico-evento -- se eliminan los 2 campos
# duplicados (Entrada desde / Aforo, redundantes con f-price y
# f-capacidad, ver BUG-021) y se agregan 2 sub-tabs nuevos: Tipos de
# entrada (categorias_entrada) y Que llevar (que_llevar + prohibido).
# ----------------------------------------------------------------------
OLD_1 = '''        <div id="especifico-evento" class="cat-panel">
          <div class="cat-editor-tabs">
            <div class="cetab on" onclick="showCatTab('evento-info')">\U0001F4C5 Fechas y sede</div>
            <div class="cetab" onclick="showCatTab('evento-lineup')">\U0001F3A4 Lineup / Artistas</div>
            <div class="cetab" onclick="showCatTab('evento-agenda')">\U0001F4CB Agenda</div>
          </div>

          <!-- Fechas y sede -->
          <div class="cat-panel on" id="cat-evento-info" style="display:block">
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Fecha inicio</label>
                <input class="form-input" id="f-fecha-ini" type="date">
              </div>
              <div class="form-group">
                <label class="form-label">Fecha fin</label>
                <input class="form-input" id="f-fecha-fin" type="date">
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Edici\u00f3n</label>
                <input class="form-input" id="f-edicion" placeholder="35\u00aa edici\u00f3n">
              </div>
              <div class="form-group">
                <label class="form-label">Sede / Venue</label>
                <input class="form-input" id="f-sede" placeholder="Parque Sim\u00f3n Bol\u00edvar, Bogot\u00e1">
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Entrada desde</label>
                <input class="form-input" id="f-entrada-desde" placeholder="Desde $80.000">
              </div>
              <div class="form-group">
                <label class="form-label">Capacidad / Aforo</label>
                <input class="form-input" id="f-aforo" placeholder="80.000 personas">
              </div>
            </div>
            <div class="form-hint" style="margin-top:8px">\U0001F4DE Contacto, redes y ubicaci\u00f3n \u2192 pesta\u00f1a <strong>Contacto</strong></div>
          </div>

          <!-- Lineup -->
          <div class="cat-panel" id="cat-evento-lineup" style="display:none">
            <div class="form-hint">Artistas o actos del evento. Aparecen en la secci\u00f3n "Lineup / Artistas".</div>
            <div id="lineup-list" style="display:flex;flex-direction:column;gap:8px;margin-bottom:10px"></div>
            <button class="btn btn-ghost btn-sm" onclick="addLineupRow()">+ A\u00f1adir artista</button>
          </div>

          <!-- Agenda -->
          <div class="cat-panel" id="cat-evento-agenda" style="display:none">
            <div class="form-hint">Programa del evento d\u00eda a d\u00eda. Aparecen en la secci\u00f3n "Agenda del evento".</div>
            <div id="evento-agenda-list" style="display:flex;flex-direction:column;gap:8px;margin-bottom:10px"></div>
            <button class="btn btn-ghost btn-sm" onclick="addAgendaRow()">+ A\u00f1adir actividad</button>
          </div>
        </div><!-- /especifico-evento -->'''

NEW_1 = '''        <div id="especifico-evento" class="cat-panel">
          <div class="cat-editor-tabs">
            <div class="cetab on" onclick="showCatTab('evento-info')">\U0001F4C5 Fechas y sede</div>
            <div class="cetab" onclick="showCatTab('evento-lineup')">\U0001F3A4 Lineup / Artistas</div>
            <div class="cetab" onclick="showCatTab('evento-agenda')">\U0001F4CB Agenda</div>
            <div class="cetab" onclick="showCatTab('evento-entradas')">\U0001F3AB Tipos de entrada</div>
            <div class="cetab" onclick="showCatTab('evento-prep')">\U0001F392 Que llevar</div>
          </div>

          <!-- Fechas y sede -->
          <div class="cat-panel on" id="cat-evento-info" style="display:block">
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Fecha inicio</label>
                <input class="form-input" id="f-fecha-ini" type="date">
              </div>
              <div class="form-group">
                <label class="form-label">Fecha fin</label>
                <input class="form-input" id="f-fecha-fin" type="date">
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Edici\u00f3n</label>
                <input class="form-input" id="f-edicion" placeholder="35\u00aa edici\u00f3n">
              </div>
              <div class="form-group">
                <label class="form-label">Sede / Venue</label>
                <input class="form-input" id="f-sede" placeholder="Parque Sim\u00f3n Bol\u00edvar, Bogot\u00e1">
              </div>
            </div>
            <!-- BUG-021 fix: "Entrada desde" y "Capacidad/Aforo" se
                 eliminaron de aqui -- duplicaban f-price (pestana
                 General) y f-capacidad (pestana Contacto), que ya
                 existen, ya se guardan, y aplican a las 4 categorias.
                 Los inputs de este panel nunca llegaban a Neon. -->
            <div class="form-hint" style="margin-top:8px">\U0001F4B2 Precio de entrada \u2192 pesta\u00f1a <strong>General</strong> (campo "Desde $") \u00b7 \U0001F465 Capacidad / aforo \u2192 pesta\u00f1a <strong>Contacto</strong></div>
            <div class="form-hint" style="margin-top:4px">\U0001F4DE Contacto, redes y ubicaci\u00f3n \u2192 pesta\u00f1a <strong>Contacto</strong></div>
          </div>

          <!-- Lineup -->
          <div class="cat-panel" id="cat-evento-lineup" style="display:none">
            <div class="form-hint">Artistas o actos del evento. Aparecen en la secci\u00f3n "Lineup / Artistas".</div>
            <div id="lineup-list" style="display:flex;flex-direction:column;gap:8px;margin-bottom:10px"></div>
            <button class="btn btn-ghost btn-sm" onclick="addLineupRow()">+ A\u00f1adir artista</button>
          </div>

          <!-- Agenda -->
          <div class="cat-panel" id="cat-evento-agenda" style="display:none">
            <div class="form-hint">Programa del evento d\u00eda a d\u00eda. Aparecen en la secci\u00f3n "Agenda del evento".</div>
            <div id="evento-agenda-list" style="display:flex;flex-direction:column;gap:8px;margin-bottom:10px"></div>
            <button class="btn btn-ghost btn-sm" onclick="addAgendaRow()">+ A\u00f1adir actividad</button>
          </div>

          <!-- Tipos de entrada (TASK-003) -->
          <div class="cat-panel" id="cat-evento-entradas" style="display:none">
            <div class="form-hint">Tipos de ticket disponibles y su disponibilidad. Aparecen en la secci\u00f3n "Tipos de entrada".</div>
            <div id="entradas-admin" style="display:flex;flex-direction:column;gap:8px;margin-bottom:10px"></div>
            <button class="btn btn-ghost btn-sm" onclick="addEntradaItem()">+ A\u00f1adir tipo de entrada</button>
          </div>

          <!-- Que llevar / Prohibido (TASK-003) -->
          <div class="cat-panel" id="cat-evento-prep" style="display:none">
            <div class="form-hint">Checklist de recomendaciones y restricciones. Aparecen en la secci\u00f3n "Que llevar".</div>
            <label class="form-label" style="margin-top:4px;display:block">Qu\u00e9 llevar</label>
            <div id="que-llevar-list" style="display:flex;flex-direction:column;gap:8px;margin-bottom:10px"></div>
            <button class="btn btn-ghost btn-sm" onclick="addQueLlevarRow()">+ A\u00f1adir recomendaci\u00f3n</button>

            <label class="form-label" style="margin-top:16px;display:block">Prohibido / restricciones</label>
            <div id="prohibido-list" style="display:flex;flex-direction:column;gap:8px;margin-bottom:10px"></div>
            <button class="btn btn-ghost btn-sm" onclick="addProhibidoRow()">+ A\u00f1adir restricci\u00f3n</button>
          </div>
        </div><!-- /especifico-evento -->'''

apply('1-html-especifico-evento', OLD_1, NEW_1)

# ----------------------------------------------------------------------
# CAMBIO 2: registrar Evento en CATEGORY_TAG_FIELDS (motor generico,
# TSK-012). Reemplaza el placeholder vacio.
# ----------------------------------------------------------------------
OLD_2 = '''  /* TASK-003: fecha_inicio, fecha_fin, edicion, sede, capacidad
     en especifico-evento. */
  evento: []
};'''

NEW_2 = '''  /* TASK-003 (completado). "capacidad" y "entrada desde" NO se
     registran aqui: existian como f-aforo/f-entrada-desde dentro de
     especifico-evento, duplicando sin conectar los campos genericos
     f-capacidad (columna destinos.capacidad, compartida con Hostal)
     y f-price (columna destinos.precio_desde, compartida por las 4
     categorias). Se eliminaron los inputs duplicados y se reusan los
     genericos -- ver BUGS_HISTORICOS.md BUG-021. */
  evento: [
    { key:'fecha_inicio', id:'f-fecha-ini', localKey:'fechaIni' },
    { key:'fecha_fin',    id:'f-fecha-fin', localKey:'fechaFin' },
    { key:'edicion',      id:'f-edicion' },
    { key:'sede',         id:'f-sede' }
  ]
};'''

apply('2-category-tag-fields-evento', OLD_2, NEW_2)

# ----------------------------------------------------------------------
# CAMBIO 3: registrar Evento en CATEGORY_TAG_LISTS (lineup, agenda,
# categorias_entrada, que_llevar, prohibido).
# ----------------------------------------------------------------------
OLD_3 = '''  evento:  []  /* TASK-003: ej. lineup[], agenda[], categorias_entrada[] */
};'''

NEW_3 = '''  /* TASK-003 (completado). */
  evento: [
    { key:'lineup', localKey:'lineup',
      collector: function(){ return (typeof collectLineupItems==='function') ? collectLineupItems() : []; } },
    { key:'agenda', localKey:'agendaEvento',
      collector: function(){ return (typeof collectAgendaItems==='function') ? collectAgendaItems() : []; } },
    { key:'categorias_entrada', localKey:'categoriasEntrada',
      collector: function(){ return (typeof collectEntradasEvento==='function') ? collectEntradasEvento() : []; } },
    { key:'que_llevar', localKey:'queLlevar',
      collector: function(){ return (typeof collectQueLlevarEvento==='function') ? collectQueLlevarEvento() : []; } },
    { key:'prohibido', localKey:'prohibidoEvento',
      collector: function(){ return (typeof collectProhibidoEvento==='function') ? collectProhibidoEvento() : []; } }
  ]
};'''

apply('3-category-tag-lists-evento', OLD_3, NEW_3)

# ----------------------------------------------------------------------
# CAMBIO 4: reset del formulario (nuevo destino) -- limpiar tambien los
# 3 contenedores nuevos de Evento.
# ----------------------------------------------------------------------
OLD_4 = '''  /* \u2500\u2500 Reset evento fields \u2500\u2500 */
  var lineupList = document.getElementById('lineup-list');
  if(lineupList) lineupList.innerHTML = '';
  var agendaList = document.getElementById('evento-agenda-list');
  if(agendaList) agendaList.innerHTML = '';'''

NEW_4 = '''  /* \u2500\u2500 Reset evento fields \u2500\u2500 */
  var lineupList = document.getElementById('lineup-list');
  if(lineupList) lineupList.innerHTML = '';
  var agendaList = document.getElementById('evento-agenda-list');
  if(agendaList) agendaList.innerHTML = '';
  var entradasEvList = document.getElementById('entradas-admin');
  if(entradasEvList) entradasEvList.innerHTML = '';
  var queLlevarList = document.getElementById('que-llevar-list');
  if(queLlevarList) queLlevarList.innerHTML = '';
  var prohibidoListEl = document.getElementById('prohibido-list');
  if(prohibidoListEl) prohibidoListEl.innerHTML = '';'''

apply('4-reset-form-evento', OLD_4, NEW_4)

# ----------------------------------------------------------------------
# CAMBIO 5: loadForm() -- precarga de Evento. Se usa el motor generico
# (applyCategoryTagFields) para los escalares y se agrega la precarga
# que faltaba de agenda/entradas/que_llevar/prohibido (BUG-021: antes
# solo se precargaba lineup).
# ----------------------------------------------------------------------
OLD_5 = '''  if(p.cat === 'evento') {
    setTimeout(function(){
      ['fecha-ini','fecha-fin','edicion','sede','entrada-desde','aforo'].forEach(function(f){
        var el=document.getElementById('f-'+f); if(el&&p[f.replace(/-([a-z])/g,function(m,c){return c.toUpperCase();})]) el.value=p[f.replace(/-([a-z])/g,function(m,c){return c.toUpperCase();})];
      });
      /* lineup */
      var lineup=document.getElementById('lineup-list');
      if(lineup&&p.lineup&&p.lineup.length){
        lineup.innerHTML='';
        p.lineup.forEach(function(l){
          var row=document.createElement('div');row.className='lineup-item';
          row.style.cssText='display:grid;grid-template-columns:1fr 1fr 1fr auto;gap:6px;align-items:center;background:var(--bg);padding:8px;border-radius:6px;border:1px solid var(--border)';
          row.innerHTML='<input class="form-input" value="'+_esc(l.nombre||'')+'" placeholder="Artista">'
            +'<input class="form-input" value="'+_esc(l.escenario||'')+'" placeholder="Escenario">'
            +'<input class="form-input" value="'+_esc(l.hora||'')+'" placeholder="Hora">'
            +'<button class="btn btn-danger btn-icon btn-sm" onclick="removeRow(this)">\u2715</button>';
          lineup.appendChild(row);
        });
      }
    },100);
  }
}'''

NEW_5 = '''  if(p.cat === 'evento') {
    setTimeout(function(){
      // TASK-003: motor generico (ver CATEGORY_TAG_FIELDS.evento mas
      // arriba). Llena fecha_inicio, fecha_fin, edicion, sede.
      applyCategoryTagFields(p, 'evento');

      /* lineup */
      var lineup=document.getElementById('lineup-list');
      if(lineup&&p.lineup&&p.lineup.length){
        lineup.innerHTML='';
        p.lineup.forEach(function(l){
          var row=document.createElement('div');row.className='lineup-item';
          row.style.cssText='display:grid;grid-template-columns:1fr 1fr 1fr auto;gap:6px;align-items:center;background:var(--bg);padding:8px;border-radius:6px;border:1px solid var(--border)';
          row.innerHTML='<input class="form-input" value="'+_esc(l.nombre||'')+'" placeholder="Artista">'
            +'<input class="form-input" value="'+_esc(l.escenario||'')+'" placeholder="Escenario">'
            +'<input class="form-input" value="'+_esc(l.hora||'')+'" placeholder="Hora">'
            +'<button class="btn btn-danger btn-icon btn-sm" onclick="removeRow(this)">\u2715</button>';
          lineup.appendChild(row);
        });
      }

      /* agenda -- BUG-021 fix: antes NO se precargaba (solo lineup) */
      var agendaL=document.getElementById('evento-agenda-list');
      if(agendaL&&p.agendaEvento&&p.agendaEvento.length){
        agendaL.innerHTML='';
        p.agendaEvento.forEach(function(a){
          var row=document.createElement('div');row.className='agenda-row';
          row.style.cssText='display:grid;grid-template-columns:1fr 1fr 2fr auto;gap:6px;align-items:center;background:var(--bg);padding:8px;border-radius:6px;border:1px solid var(--border)';
          row.innerHTML='<input class="form-input" value="'+_esc(a.dia||'')+'" placeholder="Dia">'
            +'<input class="form-input" value="'+_esc(a.hora||'')+'" placeholder="Hora">'
            +'<input class="form-input" value="'+_esc(a.actividad||'')+'" placeholder="Actividad">'
            +'<button class="btn btn-danger btn-icon btn-sm" onclick="removeRow(this)">\u2715</button>';
          agendaL.appendChild(row);
        });
      }

      /* tipos de entrada (categorias_entrada) */
      var entL=document.getElementById('entradas-admin');
      if(entL&&p.categoriasEntrada&&p.categoriasEntrada.length){
        entL.innerHTML='';
        p.categoriasEntrada.forEach(function(e){
          var item=document.createElement('div');item.className='entrada-evento-row';
          item.style.cssText='display:grid;grid-template-columns:1fr 100px 100px auto;gap:8px;align-items:center;padding:8px;background:var(--bg2);border:1px solid var(--border);border-radius:6px;margin-bottom:6px';
          item.innerHTML='<input class="form-input" value="'+_esc(e.tipo||'')+'" placeholder="Tipo de entrada" style="font-size:11px;padding:5px 8px">'
            +'<input class="form-input" value="'+_esc(e.precio||'')+'" placeholder="Precio" style="font-size:11px;padding:5px 8px">'
            +'<select class="form-input form-select" style="font-size:11px;padding:5px 8px">'
            +'<option'+((e.disponibilidad==='Disponible'||!e.disponibilidad)?' selected':'')+'>Disponible</option>'
            +'<option'+(e.disponibilidad==='Pocas'?' selected':'')+'>Pocas</option>'
            +'<option'+(e.disponibilidad==='Agotado'?' selected':'')+'>Agotado</option>'
            +'</select>'
            +'<button class="btn btn-danger btn-icon btn-sm" onclick="removeRow(this)">\u2715</button>';
          entL.appendChild(item);
        });
      }

      /* que llevar */
      var qlL=document.getElementById('que-llevar-list');
      if(qlL&&p.queLlevar&&p.queLlevar.length){
        qlL.innerHTML='';
        p.queLlevar.forEach(function(t){
          var row=document.createElement('div');row.className='que-llevar-row';
          row.style.cssText='display:grid;grid-template-columns:1fr auto;gap:6px;align-items:center';
          row.innerHTML='<input class="form-input" value="'+_esc(t)+'" placeholder="Ej: Protector solar">'
            +'<button class="btn btn-danger btn-icon btn-sm" onclick="removeRow(this)">\u2715</button>';
          qlL.appendChild(row);
        });
      }

      /* prohibido */
      var prL=document.getElementById('prohibido-list');
      if(prL&&p.prohibidoEvento&&p.prohibidoEvento.length){
        prL.innerHTML='';
        p.prohibidoEvento.forEach(function(t){
          var row=document.createElement('div');row.className='prohibido-row';
          row.style.cssText='display:grid;grid-template-columns:1fr auto;gap:6px;align-items:center';
          row.innerHTML='<input class="form-input" value="'+_esc(t)+'" placeholder="Ej: Ingreso de bebidas">'
            +'<button class="btn btn-danger btn-icon btn-sm" onclick="removeRow(this)">\u2715</button>';
          prL.appendChild(row);
        });
      }
    },100);
  }
}'''

apply('5-loadform-evento', OLD_5, NEW_5)

# ----------------------------------------------------------------------
# CAMBIO 6: collectPlace() -- bloque EVENTO SPECIFIC. Se reemplaza la
# lectura manual (que nunca llegaba a tagsObj) por el motor generico.
# ----------------------------------------------------------------------
OLD_6 = '''  /* \u2500\u2500 EVENTO SPECIFIC \u2500\u2500 */
  if(cat === 'evento') {
    p.fechaIni = v('f-fecha-ini'); p.fechaFin = v('f-fecha-fin');
    p.edicion = v('f-edicion'); p.sede = v('f-sede');
    p.entradaDesde = v('f-entrada-desde');
    p.lineup = collectLineupItems();
    p.agendaEvento = collectAgendaItems();
    p.amenities = collectAmenities('evento-amenities-check');
  }'''

NEW_6 = '''  /* \u2500\u2500 EVENTO SPECIFIC \u2500\u2500 */
  if(cat === 'evento') {
    /* TASK-003: motor generico (ver CATEGORY_TAG_FIELDS.evento /
       CATEGORY_TAG_LISTS.evento mas arriba). Llena fecha_inicio,
       fecha_fin, edicion, sede, lineup, agenda, categorias_entrada,
       que_llevar, prohibido -- los 5 primeros bugs de BUG-021 eran
       justamente que nada de esto llegaba nunca a _buildTagsObj().
       "Entrada desde" y "Aforo" ya no se leen aqui: duplicaban
       f-price/f-capacidad (genericos, las 4 categorias) sin nunca
       guardarse. p.amenities tampoco se lee: apuntaba a un
       contenedor (#evento-amenities-check) que nunca existio. */
    collectCategoryTagFields(p, 'evento');
  }'''

apply('6-collectplace-evento', OLD_6, NEW_6)

# ----------------------------------------------------------------------
# CAMBIO 7: eliminar la SEGUNDA declaracion (duplicada, BUG-019) de
# collectLineupItems()/collectAgendaItems() y agregar los 3 collectors
# nuevos (entradas, que_llevar, prohibido) en el mismo lugar.
# ----------------------------------------------------------------------
OLD_7 = '''function collectLineupItems(){var items=[];document.querySelectorAll('.lineup-item').forEach(function(row){var i=row.querySelectorAll('input');if(i[0]&&i[0].value.trim())items.push({nombre:i[0].value.trim(),escenario:i[1]?i[1].value.trim():'',hora:i[2]?i[2].value.trim():''});});return items;}
function collectAgendaItems(){var items=[];document.querySelectorAll('.agenda-row').forEach(function(row){var i=row.querySelectorAll('input,select');if(i[0]&&i[0].value.trim())items.push({dia:i[0].value.trim(),hora:i[1]?i[1].value.trim():'',actividad:i[2]?i[2].value.trim():''});});return items;}'''

NEW_7 = '''/* BUG-019 fix (TASK-003): collectLineupItems()/collectAgendaItems()
   estaban declaradas 2 veces (la version activa, identica, sigue en
   la linea ~3076/~3091). Mismo patron que BUG-006/BUG-018. Esta zona
   ahora trae solo los 3 collectors nuevos de Evento. */
function collectEntradasEvento(){var items=[];document.querySelectorAll('#entradas-admin .entrada-evento-row').forEach(function(row){var i=row.querySelectorAll('input');var sel=row.querySelector('select');if(i[0]&&i[0].value.trim())items.push({tipo:i[0].value.trim(),precio:i[1]?i[1].value.trim():'',disponibilidad:sel?sel.value:'Disponible'});});return items;}
function collectQueLlevarEvento(){var items=[];document.querySelectorAll('#que-llevar-list .que-llevar-row input').forEach(function(inp){if(inp.value.trim())items.push(inp.value.trim());});return items;}
function collectProhibidoEvento(){var items=[];document.querySelectorAll('#prohibido-list .prohibido-row input').forEach(function(inp){if(inp.value.trim())items.push(inp.value.trim());});return items;}'''

apply('7-dedupe-collectors-plus-new', OLD_7, NEW_7)

# ----------------------------------------------------------------------
# CAMBIO 8: reemplazar el bloque muerto/huerfano addLineupItem() (BUG-019:
# apuntaba a #lineup-admin, forma incompatible con collectLineupItems())
# y arreglar addEntradaItem() (ahora con clase + contenedor real) +
# agregar addLineupRow()/addAgendaRow()/addQueLlevarRow()/addProhibidoRow(),
# que son las funciones que los botones del admin realmente invocan.
# ----------------------------------------------------------------------
OLD_8 = '''// Lineup
function addLineupItem() {
  var list = document.getElementById('lineup-admin');
  var item = document.createElement('div');
  item.className='lineup-item';
  item.innerHTML='<input placeholder="Nombre del artista / acto"><select><option>Artista</option><option>Headliner</option><option>Agrupaci\u00f3n</option><option>Invitado</option></select><button class="btn btn-danger btn-icon btn-sm" onclick="removeRow(this)">\u2715</button>';
  list.appendChild(item);
}

// Entradas evento
function addEntradaItem() {
  var list = document.getElementById('entradas-admin');
  var item = document.createElement('div');
  item.style.cssText='display:grid;grid-template-columns:1fr 100px 100px auto;gap:8px;align-items:center;padding:8px;background:var(--bg2);border:1px solid var(--border);border-radius:6px;margin-bottom:6px';
  item.innerHTML='<input class="form-input" placeholder="Tipo de entrada" style="font-size:11px;padding:5px 8px"><input class="form-input" placeholder="Precio" style="font-size:11px;padding:5px 8px"><select class="form-input form-select" style="font-size:11px;padding:5px 8px"><option>Disponible</option><option>Pocas</option><option>Agotado</option></select><button class="btn btn-danger btn-icon btn-sm" onclick="removeRow(this)">\u2715</button>';
  list.appendChild(item);
}'''

NEW_8 = '''// Lineup -- BUG-019 fix (TASK-003): addLineupItem() (nombre viejo)
// era codigo huerfano: apuntaba a #lineup-admin (no existe en el DOM
// actual) y su forma (1 input + select) no coincidia con lo que lee
// collectLineupItems() (3 inputs: nombre/escenario/hora). El boton
// real del admin ("+ Anadir artista") llama a addLineupRow().
function addLineupRow() {
  var list = document.getElementById('lineup-list');
  if(!list) return;
  var row = document.createElement('div');
  row.className='lineup-item';
  row.style.cssText='display:grid;grid-template-columns:1fr 1fr 1fr auto;gap:6px;align-items:center;background:var(--bg);padding:8px;border-radius:6px;border:1px solid var(--border)';
  row.innerHTML='<input class="form-input" placeholder="Artista">'
    +'<input class="form-input" placeholder="Escenario">'
    +'<input class="form-input" placeholder="Hora">'
    +'<button class="btn btn-danger btn-icon btn-sm" onclick="removeRow(this)">\u2715</button>';
  list.appendChild(row);
}

// Agenda del evento -- BUG-019 fix: el boton "+ Anadir actividad"
// llamaba a addAgendaRow(), que tampoco existia en el archivo.
function addAgendaRow() {
  var list = document.getElementById('evento-agenda-list');
  if(!list) return;
  var row = document.createElement('div');
  row.className='agenda-row';
  row.style.cssText='display:grid;grid-template-columns:1fr 1fr 2fr auto;gap:6px;align-items:center;background:var(--bg);padding:8px;border-radius:6px;border:1px solid var(--border)';
  row.innerHTML='<input class="form-input" placeholder="Dia">'
    +'<input class="form-input" placeholder="Hora">'
    +'<input class="form-input" placeholder="Actividad">'
    +'<button class="btn btn-danger btn-icon btn-sm" onclick="removeRow(this)">\u2715</button>';
  list.appendChild(row);
}

// Entradas evento -- BUG-019 fix: ahora tiene un contenedor real
// (#entradas-admin, agregado dentro de especifico-evento) y una
// clase (.entrada-evento-row) para que collectEntradasEvento() pueda
// leer las filas de forma confiable. Misma estructura Tipo/Precio/
// Disponibilidad que ya tenia la funcion original.
function addEntradaItem() {
  var list = document.getElementById('entradas-admin');
  if(!list) return;
  var item = document.createElement('div');
  item.className='entrada-evento-row';
  item.style.cssText='display:grid;grid-template-columns:1fr 100px 100px auto;gap:8px;align-items:center;padding:8px;background:var(--bg2);border:1px solid var(--border);border-radius:6px;margin-bottom:6px';
  item.innerHTML='<input class="form-input" placeholder="Tipo de entrada" style="font-size:11px;padding:5px 8px"><input class="form-input" placeholder="Precio" style="font-size:11px;padding:5px 8px"><select class="form-input form-select" style="font-size:11px;padding:5px 8px"><option>Disponible</option><option>Pocas</option><option>Agotado</option></select><button class="btn btn-danger btn-icon btn-sm" onclick="removeRow(this)">\u2715</button>';
  list.appendChild(item);
}

// Que llevar / Prohibido -- mismo patron simple que
// addHostalQueIncluye() (1 input + boton quitar)
function addQueLlevarRow() {
  var list = document.getElementById('que-llevar-list');
  if(!list) return;
  var row = document.createElement('div');
  row.className='que-llevar-row';
  row.style.cssText='display:grid;grid-template-columns:1fr auto;gap:6px;align-items:center';
  row.innerHTML='<input class="form-input" placeholder="Ej: Protector solar">'
    +'<button class="btn btn-danger btn-icon btn-sm" onclick="removeRow(this)">\u2715</button>';
  list.appendChild(row);
}
function addProhibidoRow() {
  var list = document.getElementById('prohibido-list');
  if(!list) return;
  var row = document.createElement('div');
  row.className='prohibido-row';
  row.style.cssText='display:grid;grid-template-columns:1fr auto;gap:6px;align-items:center';
  row.innerHTML='<input class="form-input" placeholder="Ej: Ingreso de bebidas">'
    +'<button class="btn btn-danger btn-icon btn-sm" onclick="removeRow(this)">\u2715</button>';
  list.appendChild(row);
}'''

apply('8-fix-orphan-functions-plus-new-adders', OLD_8, NEW_8)

# ----------------------------------------------------------------------
with open(PATH, 'w', encoding='utf-8') as f:
    f.write(src)

print('OK -- ' + str(len(changes)) + ' cambios aplicados:')
for c in changes:
    print('  - ' + c)
print('Lineas antes: ' + str(original.count(chr(10))+1))
print('Lineas despues: ' + str(src.count(chr(10))+1))
