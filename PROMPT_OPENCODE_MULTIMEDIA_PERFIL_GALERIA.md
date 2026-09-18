# PROMPT MAESTRO DE EJECUCION OPENCODE
## ExploraCO — Sprint Multimedia, Perfil, Galeria y Mapa Cultural
## Fecha de emision: 2026-09-18 | Versiones base confirmadas en repo:
##   api/interacciones.js v21 | api/pagina-destino.js v11 | api/usuarios.js v16
##   mi-perfil.html (sin version explicita, revision 2026-09-18)

---

## ROL Y OBJETIVO

Eres el Agente Orquestador de Codigo para ExploraCO. Tu tarea es implementar
cuatro grupos de mejoras en los modulos de Perfil, Galeria del Directorio,
Mapa Cultural e Index, corrigiendo los bugs documentados y agregando capacidades
multimedia sin crear nuevos archivos en `api/` (presupuesto 8/8 de Vercel Hobby).

Antes de escribir cualquier linea de codigo, lee y cumple las restricciones de
esta seccion. Son no-negociables.

---

## RESTRICCIONES ABSOLUTAS DE ARQUITECTURA

### R-1: MANDATO ASCII-SAFE (CRITICO — Reglas de Oro v5, punto 1)
- Tolerancia cero a caracteres > 127, tildes, letra "n con tilde", emojis
  directos o backticks (`` ` ``) en cualquier archivo `api/*.js`.
- Usar exclusivamente escapes Unicode simples: `\u00f1` para la n con tilde,
  `\u00e9` para la e acentuada, etc.
- Doble escape (`\\uXXXX`) es un bug conocido (BUG-002): prohibido.
- Verificacion obligatoria antes de cada entrega de backend:
  ```
  node --check api/interacciones.js
  node --check api/pagina-destino.js
  grep -P '[^\x00-\x7f]' api/*.js   (debe retornar 0 resultados)
  ```

### R-2: PRESUPUESTO SERVERLESS FIJO (ADR-001 / ADR-010)
- El limite de 8 funciones serverless en Vercel Hobby esta en su maximo (8/8).
- Prohibido crear nuevos archivos en `api/`. Toda logica nueva entra como
  rama `tipo=` o `tipo2=` dentro de los tres handlers existentes:
  - `api/interacciones.js` (para interacciones, media, galeria, mapa)
  - `api/pagina-destino.js` (para renderizado de fichas)
  - `api/usuarios.js` (para perfil y sesion)

### R-3: MERGE JSONB (Reglas de Oro v5, punto 3)
- Los endpoints de actualizacion usan el operador `||` en SQL para JSONB.
- Cero borrado fisico: los soft-deletes usan `activo = false`.
- No reemplazar JSONB completo: siempre merge.

### R-4: PROTOCOLO DE ENTREGA QUIRURGICO (Reglas de Oro v5, punto 9)
- Entregar el bloque de codigo mas completo posible para no alterar la logica
  interna adyacente.
- Indicar claramente el PUNTO DE ENTRADA: las 3 lineas exactas que preceden
  al cambio (para `str_replace`).
- Indicar el PUNTO FINAL: las 3 lineas que siguen al cambio.
- Especificar el numero de linea aproximado en el archivo fuente.

### R-5: COMMONJS ESTRICTO EN BACKEND
- `require` / `module.exports`. Prohibido `import` / `export` en `api/*.js`.
- Driver de base de datos: `@neondatabase/serverless` unicamente. Prohibido `pg`.

### R-6: FRONTEND VANILLA JS
- Cero frameworks (React, Vue, Angular). Interactividad via `onclick` inyectado
  fisicamente en el HTML generado por el servidor (Reglas de Oro v5, punto 5).
- SVG integro para iconos; prohibidas fuentes de iconos externas.

### R-7: VERSIONES BASE — NO OPERAR EN CIEGAS
Las versiones en el repo al momento de esta emision son:
- `api/interacciones.js` v21 (TSK-112 / ADR-038)
- `api/pagina-destino.js` v11.20260917 (TSK-111)
- `api/usuarios.js` v16 (TSK-112 / ADR-038)
- Migraciones 019 a 024 ya aplicadas en Neon (confirmado 2026-09-18).
- Tablas disponibles: `media_guardados`, `media_votos`, `media_comentarios`,
  `media_compartidos`, `casas_cofre`, `albumes`, `album_fotos`.

---

## ORGANIZA EL TRABAJO EN EL ORDEN LOGICO QUE MEJOR FUNCIONE

El orden sugerido es: primero los cambios de backend (`api/*.js`) porque el
frontend depende de ellos; luego los cambios de frontend (`mi-perfil.html`,
`pagina-destino.js` en su parte de JS inyectado). Dentro de cada capa, resuelve
primero los bugs bloqueantes antes de agregar capacidades nuevas.

Para cada cambio: leer el archivo fuente del repo antes de escribir el diff.
No asumir el contenido desde memoria.

---

## GRUPO 1: ADMIN MULTIMEDIA EN `mi-perfil.html`

### 1-A: Renderizado de fotos propias (BUG activo — tab "museo")

**Problema:** Las fotos subidas por el usuario no aparecen en la seccion
"Mis fotos" del perfil porque la funcion `cargarMisFotos` en `mi-perfil.html`
ya llama correctamente a `GET /api/interacciones?tipo=mis_fotos`, pero el
renderizado del resultado no muestra imagenes reales (solo el grid se genera
pero las celdas quedan vacias o sin imagen visible si `foto_url` no viene
mapeado al campo correcto).

**Causa raiz:** La respuesta de `tipo=mis_fotos` devuelve filas con campo
`foto_url` (de `album_fotos`) y campo `texto` (de `interacciones tipo=foto`).
El render de `mi-perfil.html` en la seccion `#pf-fotos` (tab "museo") no
unifica estos dos campos en un `src` de imagen.

**Fix requerido en `mi-perfil.html`:**
Localizar la funcion de carga de fotos propias del tab "museo" (buscar
`tipo=mis_fotos` o el contenedor `#pf-fotos`). En el render de cada fila,
usar `fila.foto_url || fila.texto` como URL de la imagen. Mostrar un grid
de miniaturas de 140px con lazy-load, caption del `media_title` y contador
de `votos`. Si la lista esta vacia, mostrar un estado vacio con texto
`"Aun no tienes fotos. Agrega una desde un Album."` y un enlace al tab de albumes.

### 1-B: Renderizado de guardados de media (BUG activo — tab "museo")

**Problema:** La seccion "Mis guardados" de media (guardados de fotos de
album y de fotos de viajero) en `mi-perfil.html` ya tiene el GET a
`tipo=mis_guardados_media`, pero el render no distingue correctamente entre
`fuente='album'` (mostrar portada del album + titulo), `fuente='album_foto'`
(mostrar `media_url` como imagen) y `fuente='viajero_foto'` (no tiene imagen
renderizable: mostrar placeholder con el nombre del destino).

**Fix requerido en `mi-perfil.html`:**
En la funcion que renderiza la respuesta de `tipo=mis_guardados_media`
(buscar el contenedor `#pf-guardados-media` o la seccion de "Mis guardados"
de media en el tab "museo"), armar el render con esta logica:
```
if fuente === 'album':        mostrar portada (media_url) + titulo del album
if fuente === 'album_foto':   mostrar media_url como imagen + titulo
if fuente === 'viajero_foto': mostrar placeholder texto + destino_slug como enlace
```
Usar `media_type` para mostrar el icono correcto (video / audio / foto).
Estado vacio: `"Aun no has guardado fotos de la comunidad."`.

### 1-C: Administrador multimedia — subida de URL con geolocalizacion

**Nuevo modulo en `mi-perfil.html` (tab "museo" o en modal de album):**

Ya existe el modal `#modal-crear-album` con campos `lat`/`lng` y la funcion
`usarMiUbicacionAlbum`. La tarea es agregar dentro del modal de detalle de
album (`#modal-detalle-album`, seccion `#album-det-add-foto`) un campo
adicional de geolocalizacion del recurso individual, usando coordenadas
manuales (Colombia: lat -4.0 a 13.0, lng -79.0 a -66.0) con el boton
"Usar mi ubicacion" ya existente (reutilizar `usarMiUbicacionAlbum`).

**Campos a agregar en el formulario de agregar foto al album:**
- Input `#album-nueva-foto-lat` (numero, step any, placeholder "-4.7")
- Input `#album-nueva-foto-lng` (numero, step any, placeholder "-74.1")
- Boton "Usar mi ubicacion" que llame a
  `usarMiUbicacionAlbum('album-nueva-foto-lat','album-nueva-foto-lng',this)`
- Nota de ayuda: `"Con coordenadas, la foto aparece en el mapa cultural."`

**En la funcion `agregarFotoAlbum()`:**
Leer los campos lat/lng nuevos y si son validos (ambos presentes y dentro del
rango de Colombia), incluirlos en el body del POST:
```js
var fLat = parseFloat(document.getElementById('album-nueva-foto-lat').value);
var fLng = parseFloat(document.getElementById('album-nueva-foto-lng').value);
var tieneGeo = isFinite(fLat) && isFinite(fLng)
  && fLat >= -4.5 && fLat <= 13.5
  && fLng >= -79.5 && fLng <= -65.5;
if (tieneGeo) { body.lat = fLat; body.lng = fLng; }
```
El backend `album_agregar_foto` (ya existente en `api/interacciones.js`) ya
acepta `lat`/`lng` opcionales y los persiste en `album_fotos` si la migracion
los soporta; si no, los ignora con degradacion silenciosa. No modificar el
backend para este punto.

### 1-D: Panel "Mis logros" — ocultar logros bloqueados (P9 — index.html)

**Contexto:** La seccion de trofeos en `mi-perfil.html` (funcion `cargarTrofeos`,
contenedor `#pf-trofeos`) muestra TODOS los logros del catalogo (33 logros
actualmente), incluyendo los bloqueados con `clase='trofeo-card locked'` y
emoji candado. Esto sobrecarga la vista del perfil.

**Fix requerido:**
Modificar la funcion `cargarTrofeos` en `mi-perfil.html` para que:
1. Filtre el array `list` antes del render y separe en `desbloqueados` y
   `bloqueados`.
2. Renderice PRIMERO los `desbloqueados` (con su estilo `earned` actual).
3. Agregue un boton colapsable `"Ver todos los logros (+N bloqueados)"` que
   al hacer clic muestre los `bloqueados` en una segunda fila, usando
   `display:none` por defecto y toggleando al clic.
4. El contador `#pf-trofeos-count` sigue mostrando `desbloqueados / total`
   (no cambia).
5. Si no hay bloqueados, no mostrar el boton colapsable.

**Implementacion del toggle:**
```js
var btnToggleLocked = document.createElement('button');
btnToggleLocked.type = 'button';
btnToggleLocked.className = 'pf-btn'; // reusa el estilo existente
btnToggleLocked.textContent = 'Ver todos los logros (+' + bloqueados.length + ' bloqueados)';
var gridLocked = document.createElement('div');
gridLocked.className = 'trofeo-grid';
gridLocked.style.display = 'none';
gridLocked.innerHTML = bloqueados.map(renderTrofeoCard).join('');
btnToggleLocked.onclick = function() {
  var visible = gridLocked.style.display !== 'none';
  gridLocked.style.display = visible ? 'none' : 'grid';
  btnToggleLocked.textContent = visible
    ? 'Ver todos los logros (+' + bloqueados.length + ' bloqueados)'
    : 'Ocultar logros bloqueados';
};
```
Extraer el render de cada trofeo a una funcion helper `renderTrofeoCard(t)`
para reutilizarla en ambas secciones.

---

## GRUPO 2: GALERIA AMPLIADA PAGINADA (`api/pagina-destino.js`)

### 2-A: Fix del popover "Guardar" — cierre prematuro (BUG-057)

**Contexto:** El popover de "Guardar" (id `guardar-pop`) se cierra
prematuramente cuando el usuario hace clic dentro de el, porque el handler
`cerrarPopoverGuardar` captura el evento en fase CAPTURE (`addEventListener
('click', fn, true)`) y no valida correctamente si el clic fue dentro del
popover.

**Ubicacion en `api/pagina-destino.js`:** aprox. linea 2513.
El texto del handler actual inyectado es:
```
function cerrarPopoverGuardar(ev){var p=document.getElementById('guardar-pop');if(!p)return;if(ev&&ev.target&&p.contains(ev.target))return;...
```

**El handler ya esta parcialmente corregido** (usa `p.contains(ev.target)`),
pero el problema real es que el listener se registra con `true` (fase capture)
lo que hace que eventos de los INPUTS y CHECKBOXES dentro del popover tambien
lo cierren antes de procesarse.

**Fix:** En el string inyectado de `cerrarPopoverGuardar`, agregar ademas la
verificacion de que el `ev.target` no sea descendiente de `#guardar-pop` NI
de `#btn-guardar`. El fix correcto es:
```js
function cerrarPopoverGuardar(ev){
  var p=document.getElementById('guardar-pop');
  if(!p)return;
  if(ev && ev.target){
    if(p.contains(ev.target))return;
    if(ev.target.id==='btn-guardar')return;
    if(ev.target.closest && ev.target.closest('#btn-guardar'))return;
  }
  p.remove();
  popAbierto=false;
  document.removeEventListener('click',cerrarPopoverGuardar,true);
}
```
Tambien agregar `ev.stopPropagation()` en el handler de todos los BOTONES
de accion dentro del popover (checkbox de "Tu mapa", botones de lista de mapas
y el boton "Nuevo mapa") para que los clics en ellos no burbujeen al listener
de cierre.

### 2-B: Paginacion dinamica de la galeria ampliada

**Contexto:** En la ficha de destino (`api/pagina-destino.js`), el CTA
"Ver todas las fotos" ya existe (TSK-111). Abre `galeria.html?slug=...`.
El GET de `tipo=galeria_destino` en `api/interacciones.js` devuelve
`fotos[]` (curadas, LIMIT sin paginar) y `usuarios[]` (albumes, LIMIT 100),
pero el frontend en `galeria.html` los renderiza todos de un golpe con un
LIMIT fijo de 12 recursos en el primer render.

**Fix requerido en `galeria.html`** (no en `api/*.js`):
En la funcion JS que renderiza el grid de la galeria ampliada:
1. Agregar una variable `GAL_PAGINA = 1` y `GAL_POR_PAGINA = 12`.
2. Al cargar, renderizar SOLO los primeros `GAL_POR_PAGINA` items del array
   consolidado (curadas + viajeros + albumes unificados).
3. Agregar un boton `"Cargar mas fotos"` (id `btn-gal-mas`) al final del grid.
4. Al hacer clic, incrementar `GAL_PAGINA` y renderizar el siguiente slice.
5. Ocultar el boton cuando ya no haya mas items.

**Consolidacion de items para la paginacion:**
El array consolidado sigue el orden: curadas primero (orden ASC), luego
viajeros (creado_en DESC), luego album_fotos (votos DESC). Construirlo en
el cliente al recibir la respuesta de `tipo=galeria_destino`:
```js
var todosItems = [];
(data.fotos || []).forEach(function(f){ todosItems.push({fuente:'curada', ...f}); });
(data.viajeros || []).forEach(function(f){ todosItems.push({fuente:'viajero_foto', ...f}); });
(data.usuarios || []).forEach(function(f){ todosItems.push({fuente:'album_foto', ...f}); });
```
Nota: `data.viajeros` es el array `viajeros[]` que devuelve `galeria_destino`
cuando se pasa `incluir=viajeros,albumes`. Si la respuesta no trae `viajeros`,
usar array vacio como fallback.

**No crear endpoint nuevo.** El GET a `tipo=galeria_destino` ya consolida
las tres fuentes cuando se pasa `incluir=viajeros,albumes`. El cambio es solo
en el render del frontend de `galeria.html`.

---

## GRUPO 3: MAPA CULTURAL — FILTRO MULTIMEDIA POR PUNTO (`index.html`)

### 3-A: Drawer multimedia filtrado por coordenadas del pin

**Contexto:** `index.html` tiene el mapa cultural Leaflet (`#mapa-cultural`).
Al hacer clic en un pin, se muestra el drawer multimedia lateral que carga
`tipo=multimedia_mapa`. El drawer ya existe (`#mdMapa`/`mdMapaAlbumOficial`).

**Problema:** El drawer carga TODOS los recursos del area sin filtrar por el
pin especifico clickeado. Cuando el usuario hace clic en un pin de destino
especifico, el drawer deberia mostrar SOLO los recursos geolocalizados en ese
punto o dentro de un radio pequeno.

**Fix requerido en `index-api-connector.js`:**
En la funcion que carga el album oficial al hacer clic en un pin (buscar
`cargarAlbumOficialDestino` o el handler de `click` en los marcadores de
destino), pasar el `destino_id` o `slug` al GET de multimedia:
```
GET /api/interacciones?tipo=multimedia_mapa&slug=<slug-del-destino>
```
El endpoint `tipo=multimedia_mapa` ya acepta `slug` como filtro (lee
`req.query.slug` y filtra por `destino_id`). Solo hace falta que el
handler del clic en el marcador pase el slug del destino.

**En `index.html`:** Cuando se abra el drawer multimedia desde un clic en pin,
agregar el titulo del destino como encabezado del drawer:
```html
<div id="md-mapa-destino-titulo" style="font-size:11px;font-weight:700;
  text-transform:uppercase;letter-spacing:1px;color:rgba(255,255,255,.5);
  margin-bottom:8px;padding-bottom:8px;border-bottom:1px solid rgba(255,255,255,.08)">
</div>
```
Rellenar `md-mapa-destino-titulo.textContent` con el nombre del destino al
abrir el drawer.

### 3-B: Interaccion completa desde el drawer (like y guardar)

**Contexto:** El drawer multimedia ya muestra fotos de album. Cada foto tiene
un boton de voto (`tipo=media_voto`) y de guardado (`tipo2=guardar_media`).
El problema es que los botones dentro del drawer no estan conectados a estos
endpoints porque el JS del drawer no tiene el `usuario_id` disponible en el
scope de los handlers `onclick`.

**Fix requerido en `index.html`:**
En la funcion de render de cada card de foto del drawer, generar el `onclick`
del boton de voto/guardar usando la sesion disponible en `window.ExploraCO`:
```js
var uid = window.ExploraCO && window.ExploraCO.usuario && window.ExploraCO.usuario.id;
var btnVoto = uid
  ? '<button onclick="votarMediaMapa(\'' + item.id + '\',\'' + item.fuente + '\',this)">'
    + '\u2B50 ' + (item.votos || 0) + '</button>'
  : '<span>\u2B50 ' + (item.votos || 0) + '</span>';
```

Agregar la funcion `votarMediaMapa` en `index.html` (JS inline, no en archivo
separado para respetar el patron de interactividad fisica):
```js
function votarMediaMapa(itemId, fuente, btn) {
  var uid = window.ExploraCO && window.ExploraCO.usuario && window.ExploraCO.usuario.id;
  if (!uid) { if (window.ExploraCO && window.ExploraCO.abrirLogin) window.ExploraCO.abrirLogin(); return; }
  if (btn) btn.disabled = true;
  fetch('/api/interacciones?tipo=media_voto', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ usuario_id: String(uid), fuente: fuente, item_id: String(itemId) })
  }).then(function(r){ return r.json(); })
  .then(function(res){
    if (btn) { btn.disabled = false; if (res && res.ok) btn.textContent = '\u2B50 ' + (res.votos || ''); }
  }).catch(function(){ if (btn) btn.disabled = false; });
}
```

---

## GRUPO 4: INDEX — PANEL "MI VIAJE PERSONAL" (index.html)

### 4-A: Ocultar logros y trofeos bloqueados en el panel lateral

**Contexto:** El panel lateral "Mi Viaje Personal" en `index.html` (ancla
`#mymapa-section`) muestra un resumen de la cuenta del usuario. Actualmente
renderiza TODOS los logros, incluyendo los bloqueados con icono candado, lo
que sobrecarga el panel con informacion que el usuario no puede usar.

**Fix requerido en `index.html`:**
Localizar la funcion que renderiza los logros en el panel "Mi Viaje Personal"
(buscar la llamada a `tipo=logros` o el contenedor del panel lateral de XP/logros).

Modificar el render para:
1. Mostrar SOLO los logros con `estado === 'completada'` (desbloqueados).
2. Si el usuario tiene 0 logros desbloqueados, mostrar:
   `"Aun no has desbloqueado logros. Explora, guarda y resena para ganar trofeos."`
3. Si tiene 1 o mas, mostrar los primeros 3 (los de mayor tier) con su emoji
   y nombre, y un chip `"+ N mas"` si hay mas de 3.
4. No mostrar candados, grises ni items de logros bloqueados en este panel.

**Implementacion:**
```js
var soloDesbloqueados = (logros || []).filter(function(l){ return l.estado === 'completada'; });
var tierOrder = { platino: 0, oro: 1, plata: 2, bronce: 3 };
soloDesbloqueados.sort(function(a, b){
  return (tierOrder[a.tier] || 99) - (tierOrder[b.tier] || 99);
});
var visibles = soloDesbloqueados.slice(0, 3);
var restantes = soloDesbloqueados.length - 3;
```
Renderizar `visibles` como chips pequenos (emoji + nombre en 11px) y agregar
`'+ ' + restantes + ' mas'` si `restantes > 0`.

---

## VERIFICACION OBLIGATORIA — ESCUDO GOLD (antes de cada entrega de backend)

Para cada archivo modificado en `api/`:

```bash
# 1. Sintaxis
node --check api/interacciones.js
node --check api/pagina-destino.js

# 2. ASCII-safety (debe devolver 0 resultados)
grep -P '[^\x00-\x7f]' api/interacciones.js
grep -P '[^\x00-\x7f]' api/pagina-destino.js

# 3. Backticks (debe devolver 0)
grep -c '`' api/interacciones.js
grep -c '`' api/pagina-destino.js

# 4. Doble escape (debe devolver 0)
grep -c '\\\\u' api/interacciones.js

# 5. CommonJS (debe devolver true)
grep 'module.exports' api/interacciones.js
```

Para HTML modificado (`mi-perfil.html`, `galeria.html`, `index.html`):
```python
with open('mi-perfil.html','r') as f: t = f.read()
print('divs:', t.count('<div') - t.count('</div'))   # debe ser 0
```

---

## ACTUALIZACION DE HEADERS DE VERSION

Al finalizar cada archivo modificado, actualizar el comentario de version:
- `api/interacciones.js`: incrementar a `v22` (si se modifica el backend)
  con nota `// v22 (Sprint Multimedia): paginacion galeria, fix popover BUG-057`
- `api/pagina-destino.js`: incrementar a `v12` (si se modifica)
  con nota `// v12: fix cerrarPopoverGuardar BUG-057`
- `mi-perfil.html`: agregar comentario al inicio del `<script>`:
  `/* mi-perfil.html -- Rev 2026-09-18b: logros colapsados, geo en album_foto */`

---

## RESTRICCION FINAL

Este paquete NO incluye migraciones nuevas de base de datos. Todas las tablas
y columnas requeridas ya estan aplicadas en Neon (migraciones 019 a 024).
Si alguna query detecta una columna inexistente (error 42703), usar el patron
de degradacion ya existente en el proyecto (`conDegradacionMedia` / `catch`
con fallback a lista vacia), NUNCA lanzar un 503.

Al terminar cada grupo, reportar:
- Archivo modificado
- Lineas cambiadas (aproximado)
- Resultado de la verificacion Escudo GOLD
- Cualquier decision de diseno tomada que no estaba en el spec

---
*Emitido por Claude (Orquestador de Arquitectura) bajo AI-DOS v1.2 para ExploraCO.*
*Fuentes de verdad consultadas: PROJECT.md v1.3, BLUEPRINT.md v1.0,*
*BUGS_HISTORICOS.md, DECISIONS.md, TASKS.md, NEXT.md, Reglas de Oro v5,*
*archivos fuente del repo: interacciones.js v21, pagina-destino.js v11,*
*usuarios.js v16, mi-perfil.html (2026-09-18).*
