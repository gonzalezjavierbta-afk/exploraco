# PROMPT MAESTRO OPENCODE — TSK-111 ExploraCO
# Fecha: 2026-09-17 | Generado por Claude (arquitecto de sesion)
# Basado en: BLUEPRINT.md, DECISIONS.md (ADR-001..036), NEXT.md, TASKS.md, Reglas de Oro v5
# Tarea: 8 cambios de producto + 1 ajuste de geocerca + Hero/Galeria/Mapa/Admin refactor

---

## 0. IDENTIDAD Y ROL

Eres el agente de desarrollo de ExploraCO. Tu tarea es implementar el conjunto de cambios
definido en TSK-111 con PRECISION QUIRURGICA, sin alterar logica ni contratos preexistentes.

---

## 1. MANDATOS ABSOLUTOS — LEER ANTES DE ESCRIBIR UNA LINEA

### 1.1 ASCII-Safe (ADR-002 / Reglas de Oro v5 punto 1) — CRITICO
- **PROHIBIDO** en cualquier archivo `api/*.js`: caracteres > 127 (tildes, \u00f1, emojis
  directos), comillas invertidas (backticks `` ` ``) y doble escape `\\uXXXX`.
- Usa exclusivamente escapes Unicode simples: `\u00f3` para o-acento, `\u00f1` para n-tilde, etc.
- Verificacion obligatoria antes de entregar cada archivo api/*.js:
  ```
  node --check api/<archivo>.js          # debe pasar limpio
  grep -P '[^\x00-\x7f]' api/<archivo>.js # debe dar 0 resultados
  ```

### 1.2 Presupuesto de endpoints 8/8 INTACTO (ADR-001)
- Archivos existentes en `api/`: destinos.js, usuarios.js, interacciones.js,
  admin-destinos.js, publicar-lugar.js, pagina-destino.js, admin.js, utilidades.js.
- **PROHIBIDO crear api/*.js nuevos**. Toda nueva logica entra como rama `?tipo=` dentro
  de un archivo existente.

### 1.3 Merge JSONB obligatorio (ADR-003 / Reglas de Oro v5 punto 3)
- Toda escritura a la columna `tags` usa el operador `||`:
  `tags = COALESCE(tags, '{}') || $new_tags::jsonb`
- **NUNCA** reemplazar el JSONB completo.

### 1.4 Balance de DIVs (Reglas de Oro v5 punto 2)
- `admin.html` tiene ~7.500 lineas. Editar SOLO mediante Python `str.replace()` con
  coincidencias exactas.
- Verificar balance de `<div>` / `</div>` por zona (hostal, comida, sitio, evento) con el
  script Python del BLUEPRINT.md seccion 8.
- Entregar el resultado del script de balance en los logs de verificacion.

### 1.5 Protocolo de entrega de codigo (Reglas de Oro v5 punto 9)
- Entregar el bloque mas completo posible.
- Indicar punto de entrada (3 lineas previas al cambio) y punto de salida
  (3 lineas posteriores al cambio).
- Indicar numero de linea aproximado para archivos grandes.

### 1.6 Vanilla JS estricto — SIN frameworks (ADR-001)
- 0 React, 0 Vue, 0 JSX. HTML generado en servidor por concatenacion de strings.
- Interactividad via atributo `onclick` inyectado fisicamente en el HTML generado.
- SVG integro para iconos (prohibidas fuentes de iconos externas).

### 1.7 Driver de base de datos
- Usar exclusivamente `@neondatabase/serverless`.
- **PROHIBIDO** usar `pg`.
- CommonJS estricto: `require` / `module.exports`. **PROHIBIDO** `import` / `export`.

---

## 2. ESTADO ACTUAL DEL WORKING TREE (para no pisar lo que ya esta hecho)

### 2.1 Archivos con cambios sin commitear (NO MODIFICAR en esta tarea salvo lo indicado):
- `api/interacciones.js` — header v19 (TSK-110/ADR-036), radio adaptativo en
  `resolverRadioM` (ADR-024). **Cambio permitido en esta tarea: ajustar el radio
  default a 50m (ver Cambio 4).**
- `api/pagina-destino.js` — header v10 (TSK-108/TSK-110): hero mosaico 1+3
  parcialmente implementado, boton Compartir en `.subnav`. **Cambios permitidos:
  botonera 2 lineas, grid de fotos refinado, Lightbox, eliminacion de modulos
  (ver Cambios 5, 6, 7).**
- `api/admin-destinos.js` — v2 con `sintro` y `radio_m` (TSK-107/TSK-108).
  **Cambios permitidos: eliminar campos/modulos del admin (ver Cambios 1, 2, 3).**
- `admin.html` — ~7.500 lineas. **Cambios permitidos: reordenamiento de actividades/FAQ,
  limpieza de campos (ver Cambios 1, 2, 3).**
- `galeria.html`, `album-comments.js`, `compartir.js`, `index.html`,
  `comunidad.html`, `mi-perfil.html`, `usuario-session.js` — NO MODIFICAR en
  esta tarea (pertenecen a TSK-110, no comprometidos aun).

### 2.2 Migraciones pendientes (BLOQUEANTES para deploy, ejecuta Javier):
- `db/migrations/019_media_guardados_radio.sql` (TSK-107)
- `db/migrations/020_destinos_sintro.sql` (TSK-108)
- `db/migrations/021_xp_decimal.sql` (TSK-109)
- `db/migrations/022_media_compartidos.sql` (TSK-110)
- `db/migrations/023_interacciones_media_unificadas.sql` (TSK-110)

**Esta tarea (TSK-111) NO genera migraciones nuevas.** Todos los cambios son de logica
de aplicacion, UI y configuracion de constantes.

---

## 3. CAMBIOS A IMPLEMENTAR — ESPECIFICACIONES EXACTAS

### CAMBIO 1 — Admin: Reordenamiento dinamico de Actividades y FAQ
**Archivos:** `admin.html`
**Estrategia de implementacion:** Botones "↑ Subir / ↓ Bajar" en el DOM del admin.
NO agregar campo `orden` al JSONB (cero migraciones). El orden queda determinado
por la posicion en el array — que `collectCategoryTagFields()` ya recoge
automaticamente al hacer submit.

**Implementacion concreta:**
1. En el renderizador de filas de Actividades del admin (la funcion que genera cada
   `<div>` de actividad con sus campos y boton "Eliminar"), agregar dos botones
   al inicio o final de cada fila:
   ```html
   <button type="button" onclick="moverActividad(this, -1)" title="Subir">&#9650;</button>
   <button type="button" onclick="moverActividad(this, +1)" title="Bajar">&#9660;</button>
   ```
2. Implementar la funcion JS en `admin.html`:
   ```javascript
   function moverActividad(btn, dir) {
     var fila = btn.closest('[data-actividad-row]'); // o el selector real de la fila
     var contenedor = fila.parentNode;
     var filas = Array.from(contenedor.querySelectorAll('[data-actividad-row]'));
     var idx = filas.indexOf(fila);
     var objetivo = idx + dir;
     if (objetivo < 0 || objetivo >= filas.length) return;
     if (dir === -1) contenedor.insertBefore(fila, filas[objetivo]);
     else contenedor.insertBefore(filas[objetivo], fila);
   }
   ```
3. Replicar el patron IDENTICO para FAQ (funcion `moverFaq`).
4. Los botones deben respetar el CSS scoped `.cat-*` correspondiente.
5. Verificar que `savePlace()` -> `collectCategoryTagFields()` recoge el orden
   de los elementos DOM resultante (ya lo hace por diseno, confirmar).

**Verificacion:** Mover una actividad hacia arriba en el admin y confirmar que el
array `tags.actividades` en el POST tiene el elemento en la posicion correcta.

---

### CAMBIO 2 — Admin: Omitir Edad Minima si esta vacia en el renderizado publico
**Archivos:** `api/pagina-destino.js`

En la funcion de renderizado de la ficha publica, localizar el bloque que genera
la tarjeta/chip de "Edad minima" (campo `tags.edad_minima` o equivalente).

Envolver el render en una guard:
```javascript
// ANTES (ejemplo aproximado):
html += '<div class="info-chip">Edad m\u00ednima: ' + tags.edad_minima + '</div>';

// DESPUES:
if (tags.edad_minima && String(tags.edad_minima).trim() !== '') {
  html += '<div class="info-chip">Edad m\u00ednima: ' + tags.edad_minima + '</div>';
}
```

Esta guard aplica UNICAMENTE al renderizado publico (`api/pagina-destino.js`).
El campo sigue existiendo y siendo editable en `admin.html` (no se modifica el admin).

---

### CAMBIO 3 — Admin: Eliminar tres modulos
**Archivos:** `admin.html` (via Python str.replace), `api/pagina-destino.js`

**3A. Eliminar "Que incluye el precio" del admin y del render publico.**
- En `admin.html`: localizar el bloque HTML del campo/seccion "Que incluye el precio"
  y eliminarlo completamente.
- En `api/pagina-destino.js`: eliminar el bloque que genera esta seccion en el HTML.

**3B. Eliminar "Orden de modulos" del admin.**
- En `admin.html`: localizar el bloque HTML del selector/control "Orden de modulos"
  (distinto del reordenamiento de actividades del Cambio 1 -- este es el panel de
  arrastre global de secciones de la ficha).
- Eliminar el bloque completo. NO tocar `HOSTAL_MODULOS_ORDEN_DEFAULT` si existe
  logica de negocio usada en otro lado; solo eliminar el control visual del admin.

**3C. Eliminar la seccion "Operacion" del modulo "Contacto" en el admin.**
- En `admin.html`: localizar el bloque HTML correspondiente a la sub-seccion
  "Operacion" DENTRO del modulo/tab "Contacto" del editor de destinos.
- Eliminar ese bloque. El resto del modulo "Contacto" permanece intacto.

**OBLIGATORIO para `admin.html`:** Usar Python `str.replace()` con coincidencia
exacta. Correr el script de balance de DIVs y reportar los 4 valores (hostal,
comida, sitio, evento) — deben ser todos 0.

---

### CAMBIO 4 — Geocerca: Radio de verificacion a 50 metros
**Archivo:** `api/interacciones.js`

En la funcion `resolverRadioM` (o `haversineMetros` / el bloque de radios adaptativos
segun ADR-024), ajustar el radio **default/urbano** de su valor actual (100m) a
exactamente **50 metros**.

```javascript
// Localizar la linea que define el radio default (aproximadamente):
var RADIO_DEFAULT_M = 50;  // era 100 -- ajustado a 50m (TSK-111)
```

**Comportamiento de fallback GPS (resolucion de la pregunta 4):**
- Mantener el check `accuracy <= 150` con toast de advertencia en cliente.
- El radio de 50m aplica a la distancia Haversine entre el GPS del usuario y el
  centroide `lat/lng` del destino.
- NO rechazar automaticamente si `accuracy > 30` — el accuracy del GPS es
  independiente del radio del destino.
- Si `accuracy > 150`, loguear la advertencia pero NO bloquear el check-in (igual
  que ADR-024 para los demas radios).

**Verificacion ASCII-safe obligatoria post-cambio:**
```
node --check api/interacciones.js
python3 -c "
raw=open('api/interacciones.js','rb').read()
print('no-ASCII:',len([b for b in raw if b>127]))
print('backticks:',raw.count(b'\x60'))
"
```
Ambos conteos deben ser 0.

---

### CAMBIO 5 — Hero Section: Distribucion de botones en 2 lineas exactas
**Archivo:** `api/pagina-destino.js`

En el bloque de generacion de la barra de botones del hero (actualmente en el
working tree v10 con el boton Compartir ya incluido), reorganizar en 2 filas CSS:

**Linea 1 (fija, siempre primero):** [Sitio Web] + [Contacto]
**Linea 2:** todos los demas botones disponibles (WhatsApp, Reservar, Booking,
Hostelworld, Airbnb, Compartir, etc.)

Implementacion sugerida — clases CSS `hero-btn-row1` / `hero-btn-row2`:
```javascript
// Construir los botones condicionalmente y clasificarlos
var btnsRow1 = '';
var btnsRow2 = '';

if (d.web) btnsRow1 += '<a class="hero-btn" href="' + d.web + '" target="_blank" rel="noopener">Sitio Web</a>';
if (d.email || d.telefono || d.whatsapp)
  btnsRow1 += '<a class="hero-btn" href="#contacto">Contacto</a>';

if (d.whatsapp) btnsRow2 += '...';
// etc.

var btnBar = '<div class="hero-btn-bar">'
  + '<div class="hero-btn-row">' + btnsRow1 + '</div>'
  + (btnsRow2 ? '<div class="hero-btn-row">' + btnsRow2 + '</div>' : '')
  + '</div>';
```

CSS (scoped, dentro del `<style>` del hero):
```css
.hero-btn-bar { display:flex; flex-direction:column; gap:8px; }
.hero-btn-row { display:flex; flex-wrap:wrap; gap:8px; }
```

**Regla:** Si [Sitio Web] o [Contacto] no existen para ese destino, la Linea 1
puede quedar con un solo boton o vacia — la Linea 2 sube visualmente pero NO
se mezclan en la misma fila logica.

---

### CAMBIO 6 — Hero Section: Grid de fotos 1+3 y Lightbox
**Archivo:** `api/pagina-destino.js`

#### 6A. Grid de fotos
El working tree v10 ya tiene `HERO_THUMBS_MAX=3` y el hero mosaico parcialmente
implementado. Asegurarse de que el CSS genera exactamente:
- 1 foto grande horizontal arriba (ocupa todo el ancho del contenedor de fotos)
- 3 fotos horizontales iguales abajo (ocupan cada una 1/3 del ancho)

CSS objetivo:
```css
.hero-grid { display:grid; grid-template-columns:1fr 1fr 1fr; grid-template-rows:auto auto; gap:4px; }
.hero-grid .hero-main { grid-column:1/-1; }   /* ocupa las 3 columnas */
.hero-grid .hero-thumb { aspect-ratio:16/9; object-fit:cover; width:100%; }
```

Si hay menos de 3 fotos secundarias, usar `flex-grow` para que las existentes
llenen el espacio.

#### 6B. Lightbox
Todo `<img>` del grid del hero debe abrir un modal lightbox al hacer click.
El lightbox debe mostrar:
1. La foto ampliada (max 90vw x 90vh, object-fit:contain)
2. La seccion de comentarios del destino (reutilizar el endpoint `media_comentarios`
   si ya esta disponible, o simplemente mostrar un placeholder "Comentarios" si
   el modal se construye antes de que esa logica este disponible)
3. El conteo de likes/votos de esa foto
4. Botones: "Guardar en album" y "Agregar a album" (pueden linkear a `galeria.html`
   si el modal completo es complejo — lo importante es que el boton exista)

Implementacion del lightbox (Vanilla JS, sin librerias):
```javascript
// Generar el modal una vez en el HTML del servidor:
// <div id="hero-lightbox" style="display:none;..." onclick="cerrarLightbox()">
//   <img id="lb-foto" src="" alt="">
//   <div id="lb-meta">...</div>
// </div>
//
// onclick en cada foto del hero:
// onclick="abrirLightbox(this.src, this.dataset.fotoId)"
//
// JS en el cliente (inline en el HTML):
// function abrirLightbox(src, fotoId) { ... }
// function cerrarLightbox() { ... }
```

**IMPORTANTE:** El modal debe tener `z-index` suficiente para estar sobre
el mapa Leaflet (z-index Leaflet es ~400-500; usar z-index: 9000+).

---

### CAMBIO 7 — Galeria: Eliminar "Fotos de viajeros" de la ficha principal y
###            Galeria Ampliada con paginacion
**Archivo:** `api/pagina-destino.js`

#### 7A. Eliminar "Fotos de viajeros" de la ficha principal
En `api/pagina-destino.js`, localizar el bloque que genera la seccion/modulo
"Fotos de viajeros" en el HTML de la ficha publica y eliminar ese bloque
completamente. La galeria de viajeros se consolida en `galeria.html` (ya
implementada en TSK-110, no tocar ese archivo).

#### 7B. Galeria Ampliada con paginacion
La galeria principal de la ficha muestra hasta 12 miniaturas (ya implementado
en v10 con `GAL_THUMBS_MAX=12`). Agregar un boton "Ver todas las fotos" al pie
del grid de galeria que linkee a `galeria.html?destino=<slug>`.

La paginacion completa vive en `galeria.html` (TSK-110). **En esta tarea solo se
agrega el CTA de salida desde la ficha.**

Parametro de pagina en galeria.html: usar `pageSize = 12` (constante
`GAL_THUMBS_MAX` ya definida) — coherente con el grid de la ficha principal.

---

### CAMBIO 8 — Mapa Cultural: Album Oficial de Fotos por item del directorio
**Archivo:** `api/interacciones.js` (rama `multimedia_mapa`)

En la rama GET `?tipo=multimedia_mapa`, cuando se hace click en un pin del mapa
Leaflet, el cliente ya llama a este endpoint. Extender la respuesta para incluir,
ademas de las fotos actuales, un campo `album_oficial` con las fotos curadas del
destino (de `destinos_fotos` donde `destino_id = <id_del_destino>`).

Query adicional dentro de la rama `multimedia_mapa`:
```javascript
// Si el request incluye ?destino_id=<uuid>, agregar al response:
var fotosOficiales = await sql(
  'SELECT url, caption, orden FROM destinos_fotos WHERE destino_id = $1 ORDER BY es_hero DESC, orden ASC LIMIT 12',
  [destino_id]
);
// Incluir en el response como: { ...respuestaActual, album_oficial: fotosOficiales.rows }
```

**Constraints:**
- `destino_id` debe validarse como UUID (regex) antes de usarlo en la query.
- Si `destino_id` no viene en el request, devolver `album_oficial: []`.
- Cero endpoints nuevos (8/8 intacto).
- ASCII-safe obligatorio.

---

## 4. ORDEN DE EJECUCION RECOMENDADO

```
1. CAMBIO 4  — interacciones.js (radio 50m) — mas simple, menos riesgo
2. CAMBIO 8  — interacciones.js (album_oficial en multimedia_mapa) — mismo archivo
   -> Verificar node --check + ASCII-safe de interacciones.js
3. CAMBIO 2  — pagina-destino.js (guard edad minima) — cambio puntual
4. CAMBIO 7A — pagina-destino.js (eliminar "Fotos de viajeros")
5. CAMBIO 5  — pagina-destino.js (botones 2 lineas)
6. CAMBIO 6  — pagina-destino.js (grid 1+3 + Lightbox)
7. CAMBIO 7B — pagina-destino.js (CTA galeria)
   -> Verificar node --check + ASCII-safe de pagina-destino.js
8. CAMBIO 3A — admin.html (eliminar "Que incluye el precio") via Python
9. CAMBIO 3B — admin.html (eliminar "Orden de modulos") via Python
10. CAMBIO 3C — admin.html (eliminar "Operacion" en Contacto) via Python
    -> Correr script balance DIVs — reportar los 4 valores
11. CAMBIO 1  — admin.html (botones Subir/Bajar actividades y FAQ) via Python
    -> Correr script balance DIVs — reportar los 4 valores post-cambio
```

---

## 5. ESCUDO GOLD — CHECKLIST DE ENTREGA OBLIGATORIO

Para cada archivo modificado, entregar los resultados de:

### api/interacciones.js
```
[ ] node --check api/interacciones.js         — "OK" sin errores
[ ] no-ASCII: 0                                — bytes > 127
[ ] backticks: 0
[ ] doble-escape: 0                            — ocurrencias de \\u
[ ] radio default = 50 (CAMBIO 4 verificado)
[ ] album_oficial en multimedia_mapa (CAMBIO 8 verificado)
```

### api/pagina-destino.js
```
[ ] node --check api/pagina-destino.js        — "OK" sin errores
[ ] no-ASCII: 0
[ ] backticks: 0
[ ] doble-escape: 0
[ ] Guard edad_minima activa (CAMBIO 2)
[ ] "Fotos de viajeros" eliminado (CAMBIO 7A)
[ ] Botones en 2 filas HTML (CAMBIO 5)
[ ] Grid hero 1+3 + Lightbox (CAMBIO 6)
[ ] CTA "Ver todas las fotos" presente (CAMBIO 7B)
```

### admin.html
```
[ ] Balance hostal: 0
[ ] Balance comida: 0
[ ] Balance sitio:  0
[ ] Balance evento: 0
[ ] "Que incluye el precio" ausente (CAMBIO 3A)
[ ] "Orden de modulos" ausente (CAMBIO 3B)
[ ] "Operacion" en Contacto ausente (CAMBIO 3C)
[ ] Botones Subir/Bajar en Actividades (CAMBIO 1)
[ ] Botones Subir/Bajar en FAQ (CAMBIO 1)
```

---

## 6. FUERA DEL ALCANCE DE ESTA TAREA

- Migraciones SQL (ninguna en TSK-111)
- Modificaciones a `galeria.html`, `compartir.js`, `album-comments.js` (TSK-110)
- Modificaciones a `api/usuarios.js`, `api/admin.js`, `api/utilidades.js`,
  `api/destinos.js`, `api/publicar-lugar.js`
- BUG-061 (`tipo='foto'` sin `validarSesion`) — sigue ABIERTO
- BUG-062 (fotos Unsplash) — sigue ABIERTO
- Deploy y aplicacion de migraciones pendientes (ejecuta Javier)

---

## 7. DOCUMENTACION POST-IMPLEMENTACION (obliga al agente)

Al completar la implementacion, entregar:

1. **Diff resumido por archivo:** lineas agregadas / eliminadas por cambio.
2. **Anclas reales:** numero de linea exacto de cada cambio clave (radio 50m,
   guard edad_minima, grid hero, etc.).
3. **Resultado del Escudo GOLD:** todos los checks del punto 5.
4. **Propuesta de entrada en NEXT.md:** bloque listo para pegar, siguiendo el
   formato de TSK-108/109/110 (una linea de resumen + pendientes operativos).
5. **Propuesta de entrada en TASKS.md:** TSK-111 como COMPLETADA con alcance,
   archivos modificados y evidencia de verificacion.

---

*Prompt generado por Claude (sesion arquitecto 2026-09-17) con base en el paquete
de contexto tecnico completo de ExploraCO. Validado contra BLUEPRINT.md, DECISIONS.md
(ADR-001..036), NEXT.md, TASKS.md y Reglas de Oro v5.*
