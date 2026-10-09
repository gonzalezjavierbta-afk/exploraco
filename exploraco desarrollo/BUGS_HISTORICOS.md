# BUGS_HISTORICOS.md - ExploraCO

Documento bajo demanda del AI-DOS Core (Cap. 9.4 / 9.5). Registra fallas ya identificadas y resueltas para que ninguna IA las repita.

## BUG-001: FUNCTION_INVOCATION_FAILED (pagina 500 sin mensaje)

- **Sintoma:** la pagina publica o el endpoint admin devuelven un error 500 generico, sin detalle, al invocar la funcion serverless en Vercel.
- **Causa:** presencia de un emoji directo o cualquier caracter no-ASCII (mayor a 127) dentro de un archivo api/*.js.
- **Fix:** reemplazar todo caracter especial por su escape Unicode simple (`\uXXXX`). Ver DECISIONS.md ADR-002 (Mandato ASCII-Safe).
- **Estado:** Resuelto. Prevencion: script de verificacion obligatorio antes de cada entrega (contar bytes mayores a 127, debe dar 0).

## BUG-002: Texto con escapes visibles en pantalla (doble escape)

- **Sintoma:** el usuario ve literalmente el texto del escape (ej. la secuencia de caracteres de un doble escape) en lugar del caracter renderizado correctamente.
- **Causa:** doble escape en el string JS, es decir `\\u00f1` (doble barra invertida) en vez de `\u00f1` (barra simple).
- **Fix:** usar exclusivamente escapes Unicode simples. El doble escape queda documentado como bug conocido y prohibido, no como solucion valida.
- **Estado:** Resuelto. Prevencion: script de verificacion cuenta ocurrencias de doble escape (`\\u`), debe dar 0.
- **Nota ADR-006 (2026-09-18):** la deuda persiste en el codigo. Verificado contra archivo real: `api/pagina-destino.js` **L2431** mantiene 1 doble-escape real (`'\\u2605'` en `addRvOptimista`, idéntico a HEAD). El script de prevencion sigue activo (0 ocurrencias en el resto de `api/*.js`) pero BUG-002 queda **ABIERTO** hasta limpiar esa linea (tarea de limpieza pendiente, registrada en TASKS.md TSK-113).
- **Nota de cierre (2026-09-21, TSK-148 / ADR-053):** BUG-002 queda **CERRADO**. Evidencia contra archivo real (ADR-006): `api/pagina-destino.js` ahora tiene **0 backticks, 0 dobles escapes (`\\u`) y 0 bytes > 127** (conteo sobre el archivo completo). Las dos lineas pendientes quedaron limpias en working tree: los 2 backticks del comentario (hoy L1646, `mediaRank` ya sin backticks) y el doble escape `'\\u2605'` de la ficha de resena optimista (hoy L2473, ahora `'\u2605'` simple). Se conservan las notas historicas de arriba (Cero Borrado Logico, Regla de Oro 3).

## BUG-003: Codigo HTML visible en pantalla (comentarios o divs rotos)

- **Sintoma:** el usuario ve texto crudo tipo comentario HTML mal cerrado o un identificador de div en pantalla, en vez de contenido normal renderizado.
- **Causa:** un comentario HTML roto (falta el caracter de apertura `<` antes de `!--`) o un div mal cerrado (falta el `<div` correspondiente antes de un `id="X"`).
- **Fix:** agregar el caracter `<` faltante; corregir la apertura del div. Verificar siempre con un script de balance de etiquetas antes de entregar.
- **Estado:** Resuelto. Prevencion: Reglas de Oro ExploraCO v5, punto 2 (verificacion de balance de divs y comentarios obligatoria antes de cada entrega).

## BUG-004: Sub-tabs desaparecen (panel no se muestra al hacer click)

- **Sintoma:** al hacer click en un sub-tab del panel Especifico en admin.html, el panel correspondiente no se muestra.
- **Causa:** los paneles quedaron ubicados en un nivel incorrecto del arbol DOM (fuera del contenedor esperado por la logica de `showCatTab()`).
- **Fix:** reubicar los paneles al nivel correcto del DOM y volver a verificar el balance de divs de la zona afectada.
- **Estado:** Resuelto. Prevencion: verificar balance de divs por zona especifica (`especifico-sitio`, `especifico-hostal`, etc.) antes de cada entrega.

## BUG-005: SyntaxError por limpieza agresiva de no-ASCII

- **Sintoma:** el JS del sitio deja de cargar (SyntaxError en consola), y se observa una palabra en espa\u00f1ol con una letra faltante (por ejemplo la letra "n" con tilde eliminada de una palabra que deberia llevarla).
- **Causa:** una limpieza automatica y agresiva de caracteres no-ASCII elimino directamente la letra con tilde en vez de reemplazarla por su escape Unicode.
- **Fix:** correccion quirurgica del string afectado, reemplazando la letra faltante por el escape Unicode correspondiente (`\u00f1`), nunca eliminandola.
- **Estado:** Resuelto. Prevencion: nunca aplicar limpieza automatica masiva de caracteres; usar reemplazos puntuales y verificados.

## BUG-006: Crash "null.appendChild" por funcion duplicada

- **Sintoma:** error en consola del tipo "no se puede leer una propiedad de null (appendChild)" al usar una funcion de agregar item (ej. agregar fila de lineup).
- **Causa:** dos funciones distintas definidas con el mismo nombre (colision entre categorias, ej. una funcion generica reutilizada sin namespacing).
- **Fix:** prefijar toda funcion especifica de categoria con el nombre de la categoria (ej. `addSitioEntradaItem()`, `addHostalHabitacion()`, `addEventoLineup()`).
- **Estado:** Resuelto. Prevencion: patron de nomenclatura con prefijo de categoria obligatorio para toda funcion nueva (ver BLUEPRINT.md, seccion 6, paso 3).

## BUG-007: Campos vacios al crear un destino (ej. ciudad vacia)

- **Sintoma:** un destino se crea en Neon con campos clave vacios (ej. ciudad vacia) aunque el formulario del admin si tenia el dato cargado.
- **Causa:** admin-destinos.js (version anterior a v2) usaba nombres de campo incorrectos en el payload (ej. `b.city` en vez de `b.ciudad`, `b.desc` en vez de `b.descripcion`, `b.tel` en vez de `b.telefono`), que no coincidian con los nombres reales de las columnas en Neon.
- **Fix:** admin-destinos.js v2 acepta y mapea ambos nombres donde aplica (ej. `b.ciudad || b.city`), usando siempre el nombre correcto de Neon como destino final del mapeo.
- **Estado:** Resuelto en v2. Prevencion: toda nueva integracion de campos debe verificar el nombre exacto de la columna en el schema de Neon (ver BLUEPRINT.md, seccion 3) antes de escribir el mapeo.


#### BUG-008: SyntaxError por String sin cerrar (Ca\u00edda total)
*   **S\u00edntoma:** Error 500 FUNCTION_INVOCATION_FAILED. El sitio no cargaba ninguna p\u00e1gina din\u00e1mica [1].
*   **Causa:** Una cadena de texto sin cerrar en la l\u00ednea 674 de `pagina-destino.js` (funci\u00f3n `switchItin`) romp\u00eda el parseo del m\u00f3dulo [1].
*   **Fix:** Cierre correcto de la comilla y adici\u00f3n del operador de concatenaci\u00f3n faltante.
*   **Prevenci\u00f3n:** Uso obligatorio de `node --check archivo.js` antes de cada deploy [1].

#### BUG-009: Desbalance de DIVs en panel Hostal (Admin roto)
*   **S\u00edntoma:** Los paneles de Comida, Sitio y Evento no se mostraban correctamente al alternar pesta\u00f1as [1].
*   **Causa:** Falta de una etiqueta `</div>` de cierre en el contenedor de la categor\u00eda Hostal en `admin.html`, lo que provocaba que el panel se "tragara" estructuralmente a los dem\u00e1s [1].
*   **Fix:** Inserci\u00f3n de la etiqueta de cierre y rebalanceo del \u00e1rbol DOM.

#### BUG-010: Violaci\u00f3n ASCII en admin-destinos.js
*   **S\u00edntoma:** Riesgo inminente de Error 500 al invocar el CRUD de destinos [1].
*   **Causa:** Uso de emojis directos (\ud83d\udccd) y tildes literales en comentarios del backend [1].
*   **Fix:** Reemplazo por escapes Unicode simples (\uXXXX).

## BUG-011: Miniaturas de galeria (heroThumbs) nunca aparecian en el Hero

- **Sintoma:** el contenedor `.prow` bajo la foto principal del Hero nunca mostraba miniaturas, aunque el destino tuviera varias fotos cargadas (confirmado en monserrate-prueba-final.html).
- **Causa:** `pagina-destino.js` declaraba `var heroThumbs` DOS veces. La primera declaracion (bloque HERO) calculaba el valor correctamente a partir de `galAll`; una segunda declaracion mas abajo, dentro de un bloque marcado `// --- REEMPLAZAR BLOQUE COMPLETO DESDE AQUI ---` (residuo de una edicion anterior incompleta), lo reseteaba a `''` en silencio antes de usarse en el render final.
- **Fix:** eliminada la segunda declaracion. De paso se elimino `heroBtns`, una variable calculada en el mismo bloque muerto que tampoco se usaba en ningun render.
- **Estado:** Resuelto (Sprint 2 - Paridad Visual). Prevencion: buscar declaraciones `var` repetidas del mismo nombre dentro de la misma funcion antes de cada entrega; los marcadores `REEMPLAZAR BLOQUE` deben revisarse siempre como sospechosos de contener codigo a medio migrar.

## BUG-012: Tours sin descripcion y sin respetar el link de reserva propio

- **Sintoma:** la tarjeta de un tour nunca mostraba su descripcion, y el boton de reserva siempre abria WhatsApp aunque el operador hubiera cargado un link de reserva propio en el admin.
- **Causa:** `admin.html` guarda cada tour con los campos `descripcion` y `link_reserva` (nombres exactos de los `data-field` del formulario, confirmado en `collectTourItems()`), pero `pagina-destino.js` leia `t.desc` y `t.link` -- nombres que nunca existieron en el objeto guardado. Mismo patron que BUG-007 (nombres de campo incorrectos), esta vez dentro de `tags.tours[]`.
- **Fix:** `pagina-destino.js` ahora lee `t.descripcion || t.desc` y `t.link_reserva || t.link` (compatibilidad con datos antiguos, priorizando siempre el nombre real).
- **Estado:** Resuelto (Sprint 2 - Paridad Visual). Prevencion: al agregar un campo nuevo en `admin.html`, verificar el nombre exacto del `data-field` guardado contra el nombre que lee `pagina-destino.js` antes de dar por buena una entrega (mismo principio que BUG-007, aplicado a listas dentro de `tags`, no solo a columnas de `destinos`).

## BUG-013: La dificultad "Experto" nunca coloreaba la barra visual

- **Sintoma:** para destinos con dificultad "Experto" (el nivel mas alto), la barra de escala de dificultad se mostraba sin ningun segmento coloreado.
- **Causa:** el `<select>` de admin.html (`especifico-sitio > Dificultad`) ofrece la opcion "Experto", pero la escala de colores en `pagina-destino.js` (`diffScale`) solo reconocia la clave `extremo`. Al normalizar el texto, "experto" nunca matcheaba ninguna clave de la escala.
- **Fix:** se agrego un alias explicito (`if (normKey === 'experto') normKey = 'extremo';`) sin modificar los datos ya guardados en Neon ni el texto del select en admin.html.
- **Estado:** Resuelto (Sprint 2 - Paridad Visual). Prevencion: cuando un `<select>` de admin.html y una escala de colores en pagina-destino.js dependen del mismo valor, verificar que las claves coincidan literalmente (o documentar el alias) antes de dar la funcionalidad por completa.

## BUG-014: Clase CSS `.snlink` duplicada -- una definicion muerta pisaba a la real

- **Sintoma:** riesgo latente de que los enlaces del `.subnav` (usado en el render real) mostraran padding y peso de fuente incorrectos.
- **Causa:** `pagina-destino.js` definia la clase `.snlink` dos veces: una vez para `.subnav` (usado en el render, `buildHTML()`) y otra vez dentro de un bloque `.secnav` que nunca se usa en ningun render (confirmado por grep). Por cascada CSS, la segunda definicion (con padding y font-weight distintos) ganaba sobre la primera.
- **Fix:** eliminado el CSS muerto de `.secnav` y la segunda definicion de `.snlink`. Se conservo el resto del bloque (`.gstrip` y familia), que si esta en uso.
- **Estado:** Resuelto (Sprint 2 - Paridad Visual). Prevencion: al encontrar un marcador `REEMPLAZAR BLOQUE` de una edicion anterior, revisar tambien el CSS (no solo el JS) por nombres de clase duplicados antes de darlo por seguro.

## BUG-015: Tab "Especifico" vacio al editar un lugar sin mapeo UUID local

- **Sintoma:** al abrir el editor de un destino ya existente, las pestanas General/Fotos/Contacto muestran los datos correctos, pero el tab "Especifico" (dificultad, temporada, tours, checklist, entradas, itinerario) aparece completamente vacio -- aunque el destino si tenga esos datos guardados en Neon (visibles en la pagina publica).
- **Causa:** `editPlace()` solo refresca los datos de `tags` desde Neon cuando `_localToUUID[id]` ya tiene el UUID mapeado en el `localStorage` de ese navegador (mecanismo TSK-012). Si ese mapeo nunca se creo o se perdio -- localStorage limpiado, el lugar se edito antes desde otro dispositivo/sesion, o `syncFromNeon()` (que corre una sola vez, 1s despues de cargar la pagina) no alcanzo a correr o fallo -- no existia ningun camino de respaldo: el formulario se llenaba solo con lo que hubiera en la cache local del navegador, que puede no tener nada de "Especifico".
- **Fix:** se agrego `_resolveAndMergeBySlug()`, que busca el destino por slug/nombre en la lista completa de Neon (mismo criterio que usa `syncFromNeon()`) cuando `_localToUUID[id]` no existe, arma el mapeo de UUID en el momento y hace el merge. `editPlace()` ahora usa este respaldo automaticamente en vez de simplemente omitir el refresco.
- **Diagnostico util:** el codigo ya registra en consola un log `[TRACE]` con la cantidad de llaves de `tags` recuperadas de Neon cada vez que se hace un merge (ver `_mergeNeonRowIntoLocal()`). Si ese log muestra "0 llave(s)" o no aparece en absoluto al abrir el editor, confirma que el merge no esta corriendo o Neon no tiene tags para ese destino.
- **Estado:** Resuelto (Sprint 2 - Paridad Visual). Prevencion: cualquier mecanismo de cache local que dependa de un mapeo previamente guardado (como `_localToUUID`) necesita un camino de respaldo que no asuma que ese mapeo ya existe -- de lo contrario, el primer uso en un navegador/sesion nuevos siempre falla en silencio.

## BUG-016: Categoria Hostal -- 4 fallas encontradas y corregidas durante TASK-001

Este bug agrupa 4 hallazgos hechos al implementar TASK-001 (campos nuevos
de Hostal). Ninguno de los 4 fue pedido en el ticket original; se
encontraron al trazar el flujo completo de datos de admin.html hacia
Neon, y se corrigieron con autorizacion explicita antes de cerrar la
tarea (ver DECISIONS.md ADR-006: el archivo real siempre manda sobre
cualquier documento que describa su estado -- TASKS.md decia "Hostal:
Pendiente" cuando en realidad el formulario admin ya tenia 6 sub-tabs
construidos con datos reales).

- **BUG-A (corrupcion activa de datos):** `collectHabs()` estaba
  declarada dos veces en admin.html (la version correcta y una segunda
  copia dentro de un bloque `/* ADMIN -- FUNCIONES FALTANTES */`). Por
  hoisting de JS, la version que realmente se ejecutaba era la ultima
  declarada -- la incorrecta: desalineaba camas/precio/badge y perdia
  el campo "Servicios del cuarto" por completo. Cada habitacion
  guardada desde el admin perdia o desalineaba datos, sin ningun error
  visible. Mismo patron que BUG-006/BUG-011/BUG-014 (bloque duplicado
  pisando en silencio al bueno).
- **BUG-A2 (mismo patron, en collectHostalEvents):** existian TRES
  declaraciones de `collectHostalEvents()` en el archivo, dos de ellas
  con los campos cruzados (leian inputs[0]/[1]/[2] como titulo/fecha/
  desc, cuando la fila real tiene 5 campos en orden dia/hora/titulo/
  descripcion/precio). Se dejo una sola version corregida.
  `addHostalEvent()` tambien estaba duplicada (una version vieja de
  solo 2 columnas, muerta por hoisting); se elimino.
- **BUG-B (datos huerfanos, nunca salian del navegador):** 5 campos ya
  existentes en el formulario (`f-recepcion`, `f-cancelacion`,
  `f-precio-booking`, `f-booking-msg`, `f-barrio-desc`) se recolectaban
  en el objeto local `p` dentro de `savePlace()`, pero `_placeToAPI()`
  nunca los incluia en el payload enviado a la API -- se perdian
  siempre al guardar, sin importar lo que el usuario escribiera.
- **BUG-C (datos que si llegaban a la API pero el backend los
  descartaba):** `transporte` (tab "Como llegar") y `eventos_hostal`
  (tab "Eventos") si viajaban en el payload de `_placeToAPI()`, pero
  `admin-destinos.js` v2.1 no tenia columna ni logica para ninguno de
  los dos en el INSERT/UPDATE de `destinos_detalles` -- se descartaban
  en el servidor. Se movieron al mecanismo de `tags` JSONB (merge ya
  existente, ADR-003), sin tocar el backend ni requerir migracion de
  esquema.
- **Fix:** Los 4 se corrigieron dentro del mismo ciclo de TASK-001,
  reutilizando el motor generico `CATEGORY_TAG_FIELDS.hostal` /
  `CATEGORY_TAG_LISTS.hostal` (TSK-012) para conectar los campos
  huerfanos, y eliminando las declaraciones duplicadas/muertas.
  De paso se corrigio tambien el renderizado publico: la tabla de
  "Habitaciones y precios" en pagina-destino.js leia `h.nombre||h.name`,
  pero `collectHabs()` siempre genera `h.tipo` -- la columna "Tipo"
  quedaba vacia para todo hostal real (mismo patron que BUG-012).
- **Pendiente conocido (fuera de alcance de esta entrega):** `scores`
  (calificaciones internas del admin) tiene el mismo problema que
  BUG-C -- viaja en el payload de `_placeToAPI()` pero el POST/UPDATE
  de `admin-destinos.js` nunca lo escribe en `destinos_detalles.scores`
  (solo el GET lo lee). Requiere editar el backend (fuera del alcance
  aprobado para esta entrega); queda anotado para una proxima tarea.
  El mismo patron de declaraciones duplicadas de BUG-A/A2 tambien
  existe para `collectMenuItems`, `collectHorariosDias`,
  `collectLineupItems`, `collectAgendaItems` (Comida/Evento) -- no se
  tocaron por estar fuera del alcance de Hostal; se recomienda
  verificarlos al ejecutar TASK-002/TASK-003.
- **Estado:** Resuelto (TASK-001). Prevencion: al implementar una
  categoria nueva, trazar el flujo completo dato-por-dato desde el
  input del admin hasta la columna real en Neon antes de dar la
  categoria por completa -- un campo puede tener UI funcional y aun
  asi perderse en 3 puntos distintos del camino (colision de funcion,
  payload incompleto, o columna inexistente en el backend).

## BUG-017: loadForm() -- el precarga de Sitio y Evento quedaba anidado (y por lo tanto muerto) dentro de if(hostal)

**Encontrado durante:** TASK-002 (Comida), al trazar donde insertar la
precarga de datos de Comida en `loadForm()`.

**Sintoma:** Ninguno visible directamente en consola -- sin error de
sintaxis, `node --check` no lo detecta (es una llave anidada, no un
error de parseo). El sintoma real es funcional: al abrir para editar
un destino de categoria `sitio` o `evento`, el tab "Especifico" se veia
vacio (tours, dificultad, temporada_matriz, entradas, itinerario,
lineup, fechas -- todo en blanco), aunque el destino si tuviera esos
datos guardados en Neon.

**Causa:** en `loadForm(p)`, el bloque `if(p.cat==='hostal'){ ... }`
(agregado/editado durante TASK-001, Sprint 3) nunca cerraba su propia
llave antes de los bloques `if(p.cat==='sitio'){...}` y
`if(p.cat==='evento'){...}` que le seguian. El cierre real de
`if(hostal)` aparecia recien al final de la funcion, despues del
bloque de evento. Resultado: `sitio` y `evento` quedaban ANIDADOS
dentro de `if(p.cat==='hostal')`, que es falso para esas categorias --
ese codigo jamas se ejecutaba.

**Riesgo real (no solo cosmetico):** si un usuario editaba un destino
de Sitio, veia los campos vacios (por este bug) y guardaba sin darse
cuenta, `collectCategoryTagFields(p,'sitio')` volvia a leer esos
mismos inputs (vacios) en `savePlace()` y sobreescribia `tags` con
datos vacios -- **borrado silencioso** de tours/dificultad/
temporada_matriz ya guardados, en contra de ADR-003 (Cero Borrado
Logico). El merge JSONB del backend no protege contra esto: si el
payload que llega dice explicitamente "tours: []", el merge lo aplica.

**Fix:** se cerro `if(p.cat==='hostal')` en su punto real (justo
despues de su `setTimeout(...,100)`), se elimino la llave sobrante que
quedaba al final de la funcion, y se aprovecho el mismo punto para
insertar el bloque de precarga de Comida (TASK-002) como hermano, no
anidado.

**Estado:** Resuelto (TASK-002). Prevencion: al agregar un bloque
`if(p.cat==='X'){ setTimeout(...) }` nuevo dentro de `loadForm()`,
contar explicitamente que las llaves de apertura/cierre del `if`
coincidan con las del `setTimeout` interno -- son 2 pares de llaves
distintos y es facil cerrar solo uno. `node --check` NO detecta este
tipo de bug (anidar un if dentro de otro es sintacticamente valido);
solo lo revela trazar el flujo real o un test funcional como el usado
en TASK-001/TASK-002 (`buildHTML()`/`loadForm()` con datos mock).

## BUG-018: Comida -- collectMenuItems()/collectHorariosDias() duplicadas y rotas (mismo patron de BUG-A/A2, anticipado en el "Pendiente conocido" de BUG-016)

**Encontrado durante:** TASK-002 (Comida).

- **Duplicacion:** ambas funciones estaban declaradas dos veces en
  admin.html; por hoisting, la version que realmente corria era la
  segunda (mas simple, sin fix).
- **`collectMenuItems()` rota:** leia `.menu-item-row input` por
  indice posicional. El 3er campo de cada plato es un `<select>`
  (etiqueta Normal/Estrella/Vegano/Sin gluten), no un `<input>` -- ese
  dato nunca se capturaba, sin importar cual de las 2 declaraciones
  corriera.
- **`collectHorariosDias()` rota:** buscaba filas `.horario-row`, pero
  las 7 filas reales de la tabla de horarios no tenian esa clase en el
  HTML -- devolvia `[]` siempre. Los horarios jamas se guardaban.
- **Datos huerfanos (patron BUG-B):** `savePlace()` tambien leia
  `f-tipo-cocina`, `f-rango-precio` y `collectAmenities('comida-
  amenities-check')` -- ninguno de esos 3 IDs existia en el DOM.
- **Patron BUG-C (ausente aqui, pero por otra razon):** a diferencia de
  Hostal, estos campos nunca llegaban siquiera a `_placeToAPI()` de
  forma indirecta, porque `CATEGORY_TAG_FIELDS.comida` y
  `CATEGORY_TAG_LISTS.comida` (TSK-012) estaban registrados como `[]`
  -- el motor generico no tenia nada que empaquetar para Comida.
- **Fix:** una sola declaracion de cada funcion, leyendo por
  `[data-field]` (mismo patron que `_tourRowHTML()` de Sitio) en vez de
  indice posicional; filas de horario con `class="horario-row"` +
  `data-dia`; registro completo de `CATEGORY_TAG_FIELDS.comida` /
  `CATEGORY_TAG_LISTS.comida`; eliminacion de los 3 IDs inexistentes.
- **Estado:** Resuelto (TASK-002). El mismo patron de duplicacion
  probablemente tambien exista en `collectLineupItems`/
  `collectAgendaItems` (Evento, TASK-003) -- verificar antes de dar esa
  categoria por completa (misma recomendacion que dejo BUG-016).

## BUG-019: Categoria Evento -- 6 fallas encontradas y corregidas durante TASK-003

**Encontrado durante:** TASK-003 (Evento). El Context Package recibido
asumia que el admin de Evento estaba vacio ("Evento: Pendiente" en
TASKS.md/PROJECT.md). Al verificar el archivo real (ADR-006) se
confirmo que NO era el caso -- ya tenia 3 sub-tabs (Fechas y sede,
Lineup, Agenda) con inputs reales, con el mismo patron de "UI real
pero desconectada" que revelaron BUG-016 (Hostal) y BUG-017/018
(Comida).

**Falla 1 -- Motor generico vacio (la mas grave):**
`CATEGORY_TAG_FIELDS.evento` y `CATEGORY_TAG_LISTS.evento` (TSK-012)
estaban declarados como arreglos vacios (`[]`), aunque `collectPlace()`
si armaba `p.fechaIni/fechaFin/edicion/sede/lineup/agendaEvento` en el
objeto local. Como `_buildTagsObj()` recorre esos 2 arreglos para
construir el payload, absolutamente nada de lo escrito en la pestana
Evento llegaba nunca a `tags` en Neon -- guardado silencioso vacio,
mismo riesgo que ADR-003 (Cero Borrado Logico) existe para prevenir.

**Falla 2 -- Botones sin funcion:** los botones "+ Anadir artista" y
"+ Anadir actividad" invocaban `addLineupRow()`/`addAgendaRow()`,
funciones que no existian en ningun lugar del archivo. Clic y no
pasaba nada (sin error visible en consola para el usuario final del
admin, solo `Uncaught ReferenceError` en devtools).

**Falla 3 -- Funciones duplicadas (patron BUG-006/BUG-018):**
`collectLineupItems()`/`collectAgendaItems()` estaban declaradas dos
veces (linea ~3076/~3091 y ~4581/~4582). En este caso las 2
declaraciones eran identicas (no desalineaban datos como en BUG-016),
pero violan igual la regla de "una sola declaracion por funcion" y
generan confusion para la siguiente IA que edite el archivo.

**Falla 4 -- Codigo huerfano:** `addLineupItem()` (1 input + select,
apuntando a `#lineup-admin`) y `addEntradaItem()` (apuntando a
`#entradas-admin`) existian pero ninguno de los 2 contenedores existia
en el DOM actual -- sobras de un diseno anterior del panel Evento.
`addLineupItem()` ademas era incompatible por forma con
`collectLineupItems()` (que espera 3 inputs: nombre/escenario/hora, no
1 input + 1 select).

**Falla 5 -- Precarga asimetrica en `loadForm()`:** al editar un
evento existente, el bloque `if(p.cat==='evento')` precargaba el
Lineup pero nunca la Agenda -- mismo tipo de asimetria de fondo que
BUG-017, aunque sin el bug de anidamiento (aqui el bloque si estaba
bien cerrado, simplemente le faltaba el `forEach` de agenda).

**Falla 6 -- Campos duplicados sin conectar:** "Entrada desde"
(`f-entrada-desde`) y "Capacidad / Aforo" (`f-aforo`) dentro de
`especifico-evento` duplicaban campos genericos que YA existian y YA
funcionaban en otras pestanas del formulario: `f-price` ("Desde $",
pestana General, mapea a `destinos.precio_desde`, usado por las 4
categorias) y `f-capacidad` ("Capacidad / Aforo", pestana Contacto,
mapea a `destinos.capacidad`, ya usado por Hostal). Ninguno de los 2
duplicados se leia en `collectPlace()` -- doble problema: dato
redundante y ademas nunca guardado.

**Fix:** se registraron `CATEGORY_TAG_FIELDS.evento` (fecha_inicio,
fecha_fin, edicion, sede) y `CATEGORY_TAG_LISTS.evento` (lineup,
agenda, categorias_entrada, que_llevar, prohibido); se crearon
`addLineupRow()`/`addAgendaRow()` (las funciones que los botones
reales invocan); se elimino la declaracion duplicada de
`collectLineupItems()`/`collectAgendaItems()` (queda 1 sola, en la
linea ~3076/~3091); se elimino `addLineupItem()` (huerfano, sin
reemplazo -- no tenia forma compatible); se reconecto `addEntradaItem()`
dandole un contenedor real (`#entradas-admin`, agregado dentro de
`especifico-evento`) y una clase (`.entrada-evento-row`), como base
del nuevo sub-tab "Tipos de entrada"; se completo la precarga de
`loadForm()` con agenda + los 3 arreglos nuevos; se eliminaron
`f-entrada-desde`/`f-aforo` del HTML y se agrego un `form-hint`
apuntando a los campos genericos que ya cumplen esa funcion (mismo
patron de no-duplicacion que TASK-001 aplico con
`politica_cancelacion`, ver TASKS.md TASK-001).

**Estado:** Resuelto (TASK-003). Prevencion: igual que BUG-016/017/018,
antes de dar una categoria por "Pendiente" verificar el archivo real
(ADR-006) y trazar el flujo completo dato-por-dato (input ->
collectXXX() -> p.xxx -> `CATEGORY_TAG_FIELDS`/`_LISTS` -> tagsObj ->
columna real en Neon) en vez de asumir que un tab vacio en TASKS.md
significa un tab vacio en el HTML.


## BUG-020: index-api-connector.js -- replArr()/replObj() nunca poblaban PL[]/MAPA_PLACES[]/AGENDA_EVENTS[] reales (const vs window)

**Contexto:** Tras TASK-007 (vaciar `PL[]`/`MAPA_PLACES[]` de index.html), Javier reporto que el index no cargaba "secciones dinamicas, como destinos y los mapas". El log de consola mostraba `[index-api] PL:95 | mapa:85` (el conector si recibia los 95 registros de la API), pero inmediatamente antes Y despues de esa linea aparecia `[mapa] MAPA_PLACES vacio o no cargado aun` -- contradictorio a primera vista.

**Causa raiz (confirmada con una prueba, no solo lectura de codigo -- ver Verificacion):** `PL`, `MAPA_PLACES` y `AGENDA_EVENTS` estan declarados con `const` en el `<script>` inline de index.html. En JavaScript, las declaraciones `const`/`let` de nivel superior en un `<script>` NO se exponen como propiedades de `window` -- a diferencia de `var` y de las funciones, que si lo hacen. `replArr()`/`replObj()` en index-api-connector.js buscaban el array a mutar via `window[name]` (ej. `window['PL']`). Como `window.PL` siempre es `undefined` (aunque el identificador `PL` funcione perfecto en cualquier otro lugar del mismo documento), el chequeo `typeof window[name] !== 'undefined'` fallaba siempre y el codigo caia al `else`: `window[name] = newArr;` -- esto crea una propiedad `window.PL` NUEVA y desconectada, que nada mas en la pagina lee. El `const PL` real -- el que leen `renderDest()`, `refreshMapaMarkers()` y `renderAgenda()` -- nunca recibia los datos y se quedaba vacio para siempre. `DEST_PHOTOS` y `DEST_FEATURED_IDS` si estan declarados con `var`, por eso esos 2 SI se actualizaban correctamente -- solo fallaban los 3 arrays criticos para las "secciones dinamicas" (destinos, mapa, agenda).

**Por que no se detecto en TASK-007:** el bug ya existia en index-api-connector.js antes de TASK-007, pero era invisible: `PL`/`MAPA_PLACES` tenian datos hardcodeados reales directamente en su declaracion `const`, asi que la pagina funcionaba igual sin importar si `replArr()` lograba mutarlos o no. TASK-007 elimino ese respaldo hardcodeado, lo que expuso el defecto por primera vez de forma visible. La verificacion hecha durante TASK-007 (leer el codigo de `replArr()` y confirmar el patron `.length=0`+`.push()`, ver TASKS.md TASK-007) fue **incompleta**: confirmo que el patron de mutacion era el correcto en abstracto, pero no verifico que `window[name]` realmente apuntara al mismo binding que el `const` de nivel superior -- ese es exactamente el gap que este bug expone.

**Verificacion:** se reprodujo el bug de forma aislada con el modulo `vm` de Node (simulando un contexto global con `const PL=[]`/`var DEST_PHOTOS={}`, igual que index.html) y se confirmo que `window.PL` y el `PL` real son dos objetos distintos tras `replArr` viejo. Se corrio ademas una prueba de integracion completa cargando el archivo real `index-api-connector.js` (parchado) contra un sandbox con las mismas declaraciones `const`/`var` que index.html real, fetch simulado con 95 registros (85 con coordenadas): con el codigo viejo, `PL.length` y `MAPA_PLACES.length` quedaban en 0 pese al log "PL:95 | mapa:85"; con el fix, quedan en 95 y 85 respectivamente y `renderDest()`/`renderAgenda()` se invocan.

**Fix:** `replArr(targetArr, newArr)`/`replObj(targetObj, newObj)` ahora reciben el array/objeto REAL por referencia (ej. `replArr(PL, nuevoPL)`, no `replArr('PL', nuevoPL)`) en vez de un nombre de string resuelto via `window[...]`. La mutacion in-place (`.length=0` + `.push()`) sigue siendo la misma -- solo cambia que ahora apunta al binding correcto, sin importar si fue declarado con `var`, `let` o `const`. De paso se corrigio tambien el fallback de inicializacion del mapa (el chequeo `typeof refreshMapaMarkers === 'function'` era siempre verdadero porque esa funcion siempre existe, asi que el `else if` a `initMapaSection()` nunca se ejecutaba de verdad aunque el mapa Leaflet no estuviera creado todavia -- ver script de fix).

**Estado:** Resuelto. Prevencion: al verificar codigo que mezcla `window[nombreString]` con variables declaradas `const`/`let` de nivel superior, no asumir que ambos apuntan al mismo binding -- probarlo (ej. con Node `vm` simulando el scope real), no solo leerlo. Aplica en general a cualquier script externo que intente mutar globals de una pagina por nombre de string.
## BUG-021: Interacciones en produccion con 500 -- trigger huerfano trg_xp_on_interaccion/fn_actualizar_xp + migracion 'activo'/'progreso_misiones' nunca aplicada

**Contexto:** Al verificar el flujo de TSK-015 en produccion (Vercel + Neon), los 4 POST de interaccion fallaban con error 500 interno de Neon (sin detalle visible para el usuario): `resena`, `rating`, `visita` y `guardado`. El problema NO estaba en el codigo de `api/interacciones.js` (v4, motor de misiones), que paso el Escudo GOLD, sino en el estado de la base de datos de produccion.

**Sintoma (error real de Neon):** al POSTear cualquier interaccion, el servidor respondia 500 porque un trigger de base de datos fallaba al insertar en `xp_historial` (violacion de NOT NULL / FK invalida). El caso `guardado` fallaba ADEMAS con `column "activo" does not exist` en la tabla `interacciones`.

**Causa raiz (2 problemas acumulados):**
1) **Trigger huerfano fuera del repo:** existia en produccion un trigger `trg_xp_on_interaccion` con su funcion `fn_actualizar_xp()`, residuo de una sesion de IA anterior que intento implementar un sistema de XP via base de datos. Ese trigger insertaba en `xp_historial` con valores (ej. `interaccion_id`) que no satisfacian las restricciones de la tabla, por lo que TODA interaccion que disparaba el trigger terminaba en 500. El trigger NO existe en ningun archivo del repositorio -- es la primera incidencia documentada de "codigo de BD viviendo fuera del repo" (mismo patron de riesgo que los `<script src>` no documentados que revelo TASK-007).
2) **Migracion documentada pero nunca aplicada:** `api/interacciones.js` (v3+) documenta en su cabecera (linea 7-11) una migracion acumulativa que agrega `interacciones.activo` y `usuarios.progreso_misiones`. Esa migracion nunca se ejecuto en la base de produccion, por lo que el codigo que usa `activo` (Cero Borrado Logico de guardados) y `progreso_misiones` (motor de misiones v4) no tenia columnas donde persistir.

**Fix (SQL directo en Neon):**
1. `DROP TRIGGER IF EXISTS trg_xp_on_interaccion ON interacciones;` (elimina el trigger huerfano).
2. `DROP FUNCTION IF EXISTS fn_actualizar_xp();` (elimina la funcion del trigger, que quedo sin referencias).
3. `ALTER TABLE interacciones ADD COLUMN IF NOT EXISTS activo boolean NOT NULL DEFAULT true;` (aplica la migracion documentada en interacciones.js:9).
4. `ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS progreso_misiones jsonb NOT NULL DEFAULT '{}'::jsonb;` (aplica la migracion documentada en interacciones.js:11).
No se toco el codigo de `api/interacciones.js` -- el bug era 100% de estado de BD.

**Verificacion (post-fix, contra API de produccion):**
- `POST visita` con sesion -> 201, +20 XP y mision "Primer viaje" evaluada y otorgada.
- `POST guardado` -> 201, +5 XP y mision evaluada; un segundo `guardado`/`quitar_guardado` correctamente deduplicado via `activo`.
- `POST rating` -> 201, +10 XP.
- `POST resena` duplicada -> 409 `ya_votado` (dedup simetrico, ver ADR-007).
- `node --check` y ASCII-safety sobre interacciones.js: limpios (el codigo no cambio).

**Estado:** Resuelto. Prevencion: se crea ADR-008 (ver DECISIONS.md): toda alteracion de schema o trigger debe vivir en el repositorio como archivo `.sql` versionado y aplicarse via migracion acumulativa, NUNCA como SQL suelto en la consola de Neon -- y todo codigo nuevo de BD debe registrarse en BUGS_HISTORICOS.md/DECISIONS.md al crearse.

## BUG-022: URLs de imagenes Wikimedia Commons con tamano de thumbnail invalido (1200px) + hash de archivo incorrecto

**Contexto:** Al investigar imagenes para la pagina dinamica `bogota.html` (mismo patron que lacandelaria), se verificaron las URLs de Wikimedia Commons usadas en `seed-lacandelaria.js` y en `ficha-lacandelaria.md`. Las verificaciones con `curl.exe -w "%{http_code}"` sobre `https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Plaza_de_Bol%C3%ADvar%2C_Bogot%C3%A1.jpg/1200px-...` devolvieron HTTP 400 con el cuerpo "Use thumbnail sizes listed on https://w.wiki/GHai".

**Causa raiz (2 problemas):**
1) **Tamano invalido:** Wikimedia Commons solo acepta thumbnails en los tamanos estandar definidos en $wgThumbnailSteps (20, 40, 60, 120, 250, 330, 500, 960, 1280, 1920, 3840). La URL de lacandelaria usaba `1200px-` (y tambien `800px-` en las fotos de galeria), que NO estan en la lista -- hotlinking directo de un tamano no estandar devuelve 400. Las URLs que SI funcionan usan `960px-` (o el original sin /thumb/).
2) **Hash de archivo incorrecto:** la URL de la hero de lacandelaria (`6/6f/Plaza_de_Bol%C3%ADvar%2C_Bogot%C3%A1.jpg`) apunta a un hash `6/6f` que NO corresponde al archivo real. El archivo correcto es `File:Plaza de Bolivar - Bogota.JPG` cuyo hash real es `6/64/` (verificado via API de Commons: `action=query&titles=File:...&prop=imageinfo&iiprop=url&iiurlwidth=960`). Con hash incorrecto la imagen no existe (los /thumb/ con hash equivocado devuelven 400/404).

**Por que no se detecto antes:** las verificaciones previas de lacandelaria2/3 y de la pagina dinamica solo comprobaron que la cadena de la URL estuviera presente en el HTML (`$c.Contains(...)`), NO que la imagen realmente se descargara con HTTP 200. La pagina renderiza 200 igual (la imagen rota simplemente no se muestra, o cae al fallback hero_bg), por lo que el defecto era invisible en los smoke tests de estructura.

**Fix:** para `bogota.html` se usaron SOLO URLs verificadas con `curl.exe` (HTTP 200) obtenidas via la API de Commons con `iiurlwidth=960` (tamano estandar), y se descarto el parametro `utm_source` que la API agrega (no es necesario para el hotlink). Para lacandelaria, la URL de la hero (`1200px` + hash `6/6f`) es sospechosa del mismo bug -- queda pendiente re-verificar con curl y corregir con el tamano estandar 960px y el hash real del archivo. Las paginas posteriores (`museo-del-oro`, `museo-botero`, `jardin-botanico-bogota`) siguieron el mismo protocolo de verificacion con curl (200) antes de sembrar, y las 4-6 URLs de cada una fueron confirmadas (nota: Wikimedia tiene rate-limit 429 si se hacen varias peticiones rapidas seguidas; hay que espaciarlas con pausas de 5-20s).

**Verificacion:** con `curl.exe -s -o NUL -w "%{http_code}"` las 7 URLs de bogota.html devuelven 200 (skyline, plaza, teleferico, santuario, transmilenio, usaquen, museo del oro). Antes de esa verificacion, `curl` sobre el `1200px` de lacandelaria devolvia 400. La pagina dinamica bogota.html renderiza 200 y el hero muestra la imagen real.

**Estado:** Resuelto para bogota (URLs verificadas). Pendiente conocido: re-verificar y corregir las URLs de las imagenes de lacandelaria (hero y galeria) que usan tamano 1200px/800px y el hash `6/6f` incorrecto. Prevencion: TODA URL de Wikimedia Commons en seeds/fichas debe verificarse con `curl.exe -w "%{http_code}"` (esperar 200) ANTES de guardarla, y usar tamano estandar 960px (o el original) -- nunca 1200px/800px inventados, y nunca un hash de directorio copiado de otra pagina.

## BUG-023: Seccion "Lo que nadie te dice" (secretos) mostrando el JSON crudo en vez de las tip-cards

**Contexto:** Al cargar los 4 parques de Bogota (TSK-039..042) se detecto que la seccion "Lo que nadie te dice" de las paginas dinámicas mostraba el codigo JSON completo como texto plano (ej. `[{&quot;icono&quot;:...}]`) en vez de las tip-cards con titulo/texto/etiqueta. Afectaba a parque-nacional, el-virrey, el-tunal, parque-la-florida y a cualquier destino cuyo `tags.secretos` tuviera comillas dobles internas en los textos.

**Causa raiz:** El valor de `tags.secretos` llega a `pagina-destino.js` doble-stringificado desde Neon: `admin-destinos.js` hace MERGE JSONB y guarda el string JSON con escapes (p.ej. `"[{\"icono\":\"⚰️\",\"texto\":\"...\\\"ciudad de hierro\\\"...\"}]"`). El codigo de la seccion hacia: (1) `JSON.parse` si el string empezaba con `"` (deshacia el primer nivel, dejando `[{"icono":...,"texto":"...\"ciudad...\"..."}]`), y luego (2) un `replace(/\\"/g, '"')` que destruia las comillas internas ya desescapadas de los textos (las convertia en comillas sueltas sin escapar). Ese replace rompia el JSON interno (p.ej. `...fue apodado la "ciudad de hierro" por...`) y el `JSON.parse` final fallaba con `Expected ',' or '}' after property value`, cayendo al fallback `<p class="stext">` que imprimia el JSON crudo escapado.

**Por que no se detecto antes:** los destinos anteriores (electronica, museos) tenian textos de secretos SIN comillas dobles internas, por lo que el `replace(/\\"/g,'"')` no encontraba que romper y el `JSON.parse` funcionaba. Los textos con comillas internas (ej. la "ciudad de hierro", "la patria", "en peligro") son los que exponian el bug.

**Fix:** en `pagina-destino.js`, eliminar el `replace(/\\"/g,'"')` destructivo del bloque de secretos y en su lugar deshacer el doble-stringify con un segundo `JSON.parse` controlado (solo si el valor sigue empezando con `"`). Asi se preservan las comillas internas de los textos.

**Verificacion:** smoke test con el dato real de la API (doble stringify con comillas internas): las 5 tip-cards de parque-nacional se parsean OK y la seccion renderiza `tip-card`/`tip-tag` en vez del JSON crudo. Se probaron ademas el-virrey, el-tunal, parque-la-florida, museo-de-la-independencia y espacio-kinder (todos OK).

**Estado:** Resuelto en `api/pagina-destino.js` (ver comentario BUG-024 en el codigo). Prevencion: al deshacer stringify anidado NUNCA usar regex sobre comillas; usar `JSON.parse` anidado controlado.

## BUG-024: Dificultad "Media" no seleccionaba el color naranja en la barra

**Contexto:** Las paginas cuyo `tags.dificultad` era "Media" (p.ej. espacio-kinder, cerro-de-guadalupe, y datos historicos de otros destinos) mostraban la barra de dificultad en el color fallback dorado en vez del naranja `#d97706` del nivel medio.

**Causa raiz:** la escala `diffScale` de `pagina-destino.js` solo conocia las claves `facil`, `moderado`, `dificil` y `extremo` (esta ultima con el alias `experto` de BUG-013). El select `f-dificultad` de `admin.html` ofrece las opciones `Facil`, `Moderado`, `Dificil` y `Experto`, pero datos historicos y varios seeds guardaron el valor "Media" (y a veces "Fácil" con acento que ya normalizaba bien). Al normalizar "media" quedaba la clave `media`, que no existe en la escala, por lo que `matchIdx=-1` y el color caia a `var(--gold-dark)`.

**Fix:** en `pagina-destino.js`, agregar el alias `media`/`medio` -> `moderado` (mismo patron de BUG-013 con `experto` -> `extremo`), sin tocar los datos guardados en Neon.

**Verificacion:** simulacion de la escala con los valores Facil, Media, Moderado, Dificil, Experto, Facil(acento): Media y Moderado ahora matchean `moderado` con color `#d97706` (naranja). Smoke test incluido en BUG-023.

**Estado:** Resuelto en `api/pagina-destino.js` (ver comentario BUG-024 en el codigo). Prevencion: al ampliar la escala de dificultad, cubrir todos los valores historicos y los ofrecidos por admin.html (Facil/Moderado/Dificil/Experto y los legados Media/Medio/Facil).

## BUG-025: Categoria 'blog' inexistente en la tabla categorias de Neon -- FK destinos_categoria_slug_fkey rechazaba el INSERT (error 500)

**Contexto:** Al cargar la primera entrada real de blog (monserrate-guia-completa, TSK-043) via el loader `scripts/load-monserrate-guia-api.js` (DELETE+POST contra la API de admin), el POST fallaba con 500. El codigo de `admin-destinos.js` y del loader NO tenia el error: el problema estaba en el estado de la base de datos de produccion.

**Sintoma (error real de Neon):** el INSERT en `destinos` violaba la restriccion `destinos_categoria_slug_fkey` (FK hacia `categorias.slug`): la fila `'blog'` NO existia en la tabla `categorias` de Neon. Todas las demas categorias (sitio, hostal, comida, evento) si existian porque habian sido insertadas en sesiones anteriores (algunas manualmente en la consola de Neon, por lo que tampoco estan en el repo -- el mismo patron de riesgo de "estado de BD no reproducible" que revelo ADR-008).

**Por que es un bug latente:** cualquier insert de un destino con categoria blog habria fallado igual, incluyendo el modal publico de publicacion de blog de `api/publicar-lugar.js` (que permite al usuario publicar un lugar/blog desde el front-end). No se habia detectado antes porque nunca se habia insertado un destino con categoria blog en produccion.

**Fix:** se inserto la categoria manualmente via consola de Neon con SQL idempotente:
```sql
INSERT INTO categorias (slug, nombre, emoji)
VALUES ('blog', 'Blog', '...')
ON CONFLICT (slug) DO NOTHING;
```
(La columna `emoji` es varchar(10); ver BUG-026 para el detalle del prefijo E.) No se toco codigo: el loader de blog da error claro 500 si la categoria no existe, lo cual se considera comportamiento aceptable (el error de FK de Neon llega al cliente).

**Verificacion (post-fix):** el POST del loader completo OK y `/api/destinos?categoria=blog` devuelve el post; GET /monserrate-guia-completa.html = 200.

**Estado:** Resuelto (categoria insertada en Neon). Prevencion: antes de sembrar contenido de una categoria nueva, verificar que la fila correspondiente exista en `categorias` (SELECT ... WHERE slug=...) o que el seed lo garantice; y, coherente con ADR-008, toda categoria nueva deberia materializarse como INSERT versionado en el repo (candidato a migracion futura), no solo en la consola de Neon.

## BUG-026: Leccion SQL -- '\ud83d\udcdd' sin prefijo E es un literal de 12 caracteres en PostgreSQL y revienta columnas varchar(10) (SQLSTATE 22001)

**Contexto:** Al insertar la categoria 'blog' en la tabla `categorias` (columna `emoji` varchar(10), ver BUG-025), se intento escribir el emoji de libreta como `'\ud83d\udcdd'` (el mismo escape Unicode que se usa en los strings JS de `api/*.js`, p.ej. `CAT_EMOJI` de `api/destinos.js`). En PostgreSQL ese string SIN el prefijo E es un literal de texto de 12 caracteres (backslash + "ud83d" + backslash + "udcdd"), no el emoji real.

**Sintoma:** el INSERT fallaba con SQLSTATE 22001 "value too long for type character varying(10)": 12 caracteres no caben en varchar(10).

**Causa raiz:** en PostgreSQL, `'\uXXXX'` (comilla simple simple) interpreta la barra invertida como caracter literal, a diferencia de JS (donde `'\uXXXX'` es un escape real). Para que PostgreSQL interprete escapes de la forma C (incluido \uXXXX) hay que usar el prefijo E: `E'\ud83d\udcdd'`. Alternativa equivalente: pegar el emoji real en el string SQL (pero viola el mandato ASCII de los archivos del repo; en la consola de Neon es valido).

**Fix:** usar `E'\ud83d\udcdd'` en el INSERT de Neon, o directamente el emoji real (por ejemplo el glifo de libreta o de pluma) que es 1 solo caracter y cabe en varchar(10).

**Estado:** Resuelto (leccion documentada; el INSERT final uso el emoji correcto). Prevencion: en SQL de Neon, usar SIEMPRE el prefijo E para escapes \uXXXX (`E'\ud83d\udcdd'`) o pegar el emoji real; nunca copiar el escape JS `'\ud83d\udcdd'` de `api/*.js` tal cual. Aplica a cualquier columna varchar corta (como `categorias.emoji`) y a cualquier INSERT/UPDATE manual en la consola de Neon.

## BUG-027: Icono literal `[foto]` en el boton Instagram de la seccion Contacto

**Contexto:** En `api/pagina-destino.js:1555`, el boton "Instagram" de la grilla Contacto renderiza `[foto]` como texto literal en lugar de un icono unicode:
```
ctBtns.push('<a class="cbtn blue" href="https://instagram.com/'+esc(...)+'" target="_blank">[foto] Instagram</a>');
```
Los otros botones usan iconos unicode reales: WhatsApp `\u2709`, Llamar `\u2706`, Sitio web `\u25CB`, Email `\u0040`. El `[foto]` parece un placeholder que nunca se reemplazo por un glifo real (p.ej. `\uD83D\uDCF7` camera o `\u25CB` circle).

**Sintoma:** en todas las fichas con campo `instagram` (evento, hostal, comida, sitio), el usuario ve `[foto] Instagram` como texto plano con corchetes, no un icono visual. Cosmetico, no funcional.

**Causa raiz:** se desconoce si fue intencional o un placeholder. Todos los demas botones de la grilla Contacto usan unicode escapes, este es el unico que no.

**Fix (aplicado, TSK-097 2026-09-12):** reemplazado `[foto]` por el icono unicode
`\uD83D\uDCF7` (camera emoji) en `api/pagina-destino.js` L1950, consistente con los
otros botones de la grilla (surrogate pair valido, no viola el mandato ASCII-safe,
ADR-002). Verificado contra archivo real (ADR-006): la linea del boton ahora emite
`\uD83D\uDCF7 Instagram`. La ruta alternativa `\u25CB` (circle) quedo descartada por
decision de implementacion.

**Estado:** Resuelto (2026-09-12, TSK-097, working tree SIN commitear). Deteccion
original durante la auditoria de TSK-075; el fix vive en el working tree pendiente de
commit + push + deploy. Prevencion: ningun boton de la grilla Contacto debe emitir
texto literal entre corchetes como label de icono; todo icono debe ser un escape
unicode real (`\uXXXX`, incluyendo surrogate pairs).

## BUG-028: Modal "Subiste de nivel" a "Explorador" se muestra en cada carga de index.html

**Contexto:** En `index.html`, el sistema de gamificacion tiene un modal `#levelup-modal` ("Subiste de nivel!") que se dispara en `updatePointsUI()` (linea 4066) cuando el nivel actual es mayor que `_ultimoNivelVisto`. La variable `_ultimoNivelVisto` (linea 4007) se declara como `null` y se actualiza al final de cada llamada a `updatePointsUI()` (linea 4069). El problema es que `updatePointsUI()` se ejecuta **dos veces** en cada carga: primero desde `initPoints()` (linea 4428, antes de que `usuario-session.js` cargue) y luego desde `usuario-session.js` -> `init()` -> `cargarSesion()` -> `actualizarUI()` -> `onExploraCOUpdate()`.

**Sintoma:** Cada vez que el usuario carga `index.html`, ve el modal "Subiste de nivel a Explorador" aunque ya lo haya visto antes. El modal nunca se "agota" porque el estado se reinicia en cada recarga.

**Causa raiz:** En la primera llamada (`initPoints()`, linea 4428), `usuario-session.js` aun no ha cargado, asi que `puntosUsuarioActual()` retorna `{ xp: 0 }` (linea 3925-3933). `getLevel(0)` devuelve "Viajero novato" (`min: 0`). El guard `_ultimoNivelVisto !== null` evita el modal (porque `null !== null` es `false`), pero la linea 4069 setea `_ultimoNivelVisto = 0`, contaminando la variable. Cuando `usuario-session.js` carga la sesion real (ej. 120 XP = "Explorador", `min: 100`), la segunda llamada compara `100 > 0` = `true` y muestra el modal. En la proxima recarga, `_ultimoNivelVisto` se reinicia a `null` y el ciclo se repite.

**Fix:** Cambiar la linea 4069 de:
```js
_ultimoNivelVisto = lvl.min;
```
a:
```js
if(window.ExploraCO && window.ExploraCO.usuario) _ultimoNivelVisto = lvl.min;
```
Esto evita que el render pre-sesion contamine `_ultimoNivelVisto` con el valor `0` ("novato"). Solo se persiste el nivel cuando hay sesion real, de modo que el modal solo se muestra cuando el nivel **realmente sube** durante la misma sesion de pagina.

**Estado:** Resuelto. Fix aplicado en `index.html:4069-4071`.

## BUG-029: Leccion ADR-016 -- campo de tags escalar que migra a objeto: `cover` vs `cover_valor`/`cover_nota`

**Contexto:** El ADR-016 define `tags.cover` como objeto `{valor, nota}` (cover
condicional nocturno de bares). Pero los datos legacy y los seeds previos
guardaron la misma informacion como campos planos `cover_valor`/`cover_nota`.
En la implementacion se resolvio el desajuste en el renderer:
`api/pagina-destino.js:599-601` lee el objeto con fallback:
`coverObj.valor || tags.cover_valor || ''` (y `coverObj.nota || tags.cover_nota`).

**Sintoma potencial (evitado):** renderizar `[object Object]` o un cover vacio
si un destino legacy (con `cover_valor` plano) se renderizaba esperando el
objeto nuevo; o al reves, ignorar el campo nuevo al editar un bar en admin.

**Causa raiz:** dos formas validas conviven para el mismo concepto en datos
reales (objeto nuevo del ADR-016 vs campos planos legacy). Es el mismo patron
de BUG-007/012/024: asumir una sola forma de los datos sin verificar el
archivo real (ADR-006).

**Estado:** Resuelto en codigo (H1 del ADR-016, fallback en L599-601). Leccion:
cuando un campo de `tags` cambia de escalar a objeto (o a lista cerrada), el
renderer DEBE leer la forma nueva con fallback a la forma legacy plana;
la migracion de datos (`scripts/reclasificar-subcategorias.js`) NO debe
reescribir campos fuera de `subcategoria` (aqui no toca `cover`). Prevencion:
para cualquier campo nuevo de ADR-016 revisar contra los seeds legacy antes
de cerrar la tarea.

## BUG-030: api/interacciones.js handler multimedia_mapa devolvia 500 "UNION types uuid and character varying cannot be matched"

**Contexto:** el handler `tipo=multimedia_mapa` (GET /api/interacciones)
ejecuta un UNION ALL de 2 ramas: (1) albumes, que emite `a.id AS
origen_id` (tipo uuid), y (2) destinos, que emite `d.slug AS origen_id`
(tipo character varying). PostgreSQL exige tipos compatibles entre ramas
de un UNION; al unir uuid con varchar el query reventaba con error 500.

**Sintoma:** el endpoint del mapa audiovisual / capa multimedia del mapa
cultural (usado por index.html y comunidad.html) devolvia 500, por lo que
los pines multimedia y el drawer no cargaban datos.

**Causa raiz:** en el UNION ALL del handler multimedia_mapa, las dos
ramas emitian la columna `origen_id` con tipos distintos sin castear
(uuid en la rama de albumes, character varying en la rama de destinos).

**Fix:** castear la columna heterogenea de la rama de albumes a texto:
`a.id::text AS origen_id` (api/interacciones.js L1484). La rama de
destinos ya emitia `d.slug` (varchar), de modo que `origen_id` queda como
text en ambas ramas del UNION.

**Evidencia (ADR-006):** verificado contra el archivo real
api/interacciones.js: L1471 `if (tipo === 'multimedia_mapa')`; en el
UNION ALL la rama de albumes emite `'album' AS origen, a.id::text AS
origen_id` (L1484) y la rama de destinos emite `'destino' AS origen,
d.slug AS origen_id, 0 AS votos` (L1496).

**Estado:** Corregido en codigo (working tree). REQUIERE DEPLOY de
api/interacciones.js para que produccion quede sana.

**Leccion:** en cualquier UNION/UNION ALL, si las columnas homonimas de
las ramas tienen tipos distintos (uuid vs text, int vs text, etc.),
castear SIEMPRE de forma explicita (`::text`) a un tipo comun antes de
unir; nunca asumir que los tipos son compatibles solo porque los nombres
coinciden.

## BUG-031: JS inline de buildHTML() roto (SyntaxError) -- onchange de mapas tematicos con comilla escapada mal formada; TODAS las paginas dinamicas sin funciones de cliente

**Contexto (TSK-095 / refactor UI/UX, deploy 2026-09-11):** el popover de
Guardar de la ficha dinamica renderiza checkboxes de mapas tematicos del
usuario con `onchange="toggleMapaDest(...)"`. Ese onchange se ensamblaba en
el servidor en 3 lineas (`api/pagina-destino.js` L2288-2290) con una comilla
escapada mal formada: `toggleMapaDest(\\\'` + `+m.id+` + `\',this.checked)`
-- el `\'` dentro de un string single-quoted del servidor no cerraba el
string JS generado, el string engullia `+m.id+` y dejaba `,this.checked)`
como codigo suelto -> `SyntaxError: Unexpected token` en la linea 126 del
JS inline generado.

**Sintoma (reporte de usuario):** en
https://exploraco.vercel.app/parque-mundo-aventura.html, al hacer clic en
"Guardar" aparecia `Uncaught ReferenceError: abrirPopoverGuardar is not
defined` y el boton "Estuve aqui" no funcionaba.

**Causa raiz:** el onchange del checkbox de mapas tematicos se ensamblaba
con comilla escapada mal formada (`\\\'` dentro de string single-quoted).
El HTML generado quedaba con un string JS sin cerrar; el parseo del script
inline completo fallaba con SyntaxError.

**Impacto (general, NO especifico de parque-mundo-aventura):** el
SyntaxError mataba el parseo de TODO el script inline que emite
buildHTML(), asi que TODAS las paginas dinamicas quedaban sin las funciones
de cliente: Guardar (`abrirPopoverGuardar`), Estuve aqui
(`marcarVisitadoBtn`), rese\u00f1as (`submitRv`), voto rapido (`votarDID`),
lightbox (`abrirLightbox`), `toggleTuMapa`, `toggleMapaDest` y
`cerrarPopoverGuardar`. Se confirmo local (5 categorias) y en produccion
(4 paginas).

**Como se detecto:** reporte de usuario en consola
(`Uncaught ReferenceError: abrirPopoverGuardar is not defined` + "Estuve
aqui" inerte). El guard permanente nuevo (`scripts/check_buildHTML_inline.js`)
reproduce el fallo automaticamente y lo convierte en check de regresion.

**Brecha de cobertura del Escudo GOLD:** el Escudo GOLD (node --check,
ASCII-safety, balance de divs) y los smoke tests NO parseaban el JS inline
del HTML generado: `node --check` valida archivos .js, pero el script
inline solo existe como STRING dentro de buildHTML() y no existe como
archivo -- un SyntaxError dentro de ese string es invisible para
node --check. Por eso el blob roto paso como "PASS" pese a estar roto en
produccion.

**Fix aplicado (working tree, SIN commitear):** lineas 2288-2290 colapsadas
en 1 sola usando la entidad HTML `&#39;` en el onchange -> en el cliente
queda `toggleMapaDest('ID',this.checked)`. La entidad `&#39;` viaja tal
cual en el HTML y el navegador la interpreta como comilla simple; no hay
concatenacion de comillas en el servidor. Verificado contra archivo real
(ADR-006): `git diff api/pagina-destino.js` muestra solo ese cambio.

**Guard permanente creado:** `scripts/check_buildHTML_inline.js` (NUEVO,
generico: seed por argumento, default parque-mundo-aventura). Parsea con
`new vm.Script()` TODO `<script>` inline que emite buildHTML() (sin src) y
verifica: parse V8 de cada inline (detecta SyntaxError), ejecucion en
sandbox con stubs de document/window/fetch, 8 funciones criticas definidas
(abrirPopoverGuardar, marcarVisitadoBtn, toggleTuMapa, toggleMapaDest,
cerrarPopoverGuardar, submitRv, votarDID, abrirLightbox), JSON.parse de los
JSON-LD y balance de divs del HTML generado. Exit 0 OK / 1 roto / 2 seed
inexistente. Correr con `node scripts/check_buildHTML_inline.js`.

**Verificaciones (post-fix):** `node --check` PASS; ASCII-safety 0/0/0;
smoke parque 14/14 PASS; check inline en 3 categorias PASS (8/8 funciones);
divs identicos (364/364).

**Estado:** Corregido en codigo (working tree, SIN commitear). REQUIERE
commit + push + re-deploy MANUAL de Vercel: TSK-095 (incluido el bug) YA
esta desplegado en produccion; el fix NO. Hasta el deploy, TODAS las
paginas dinamicas siguen sin las funciones de cliente.

**Leccion / prevencion:** (1) el Escudo GOLD DEBE incluir
`node scripts/check_buildHTML_inline.js` en el ciclo de verificacion antes
de cada deploy (cerrar la brecha: parsear el JS inline generado, no solo
los archivos .js); (2) nunca ensamblar atributos onchange/onclick con
comillas escapadas dentro de strings single-quoted del servidor -- usar
entidades HTML (`&#39;`) y colapsar el string en una sola linea; (3) todo
JS inline que buildHTML() emita debe validarse con un parser real
(`new vm.Script()`) antes de desplegar.

## BUG-032: Violacion de constraint unica al subir la segunda foto del mismo usuario al mismo destino (500)

**Contexto:** la tabla `interacciones` tenia una constraint unica compuesta heredada
`interacciones_usuario_id_destino_id_tipo_key` sobre `(usuario_id, destino_id, tipo)`.
Esa constraint fue disenada para deduplicar resenas/rating (ADR-007), pero los handlers
`tipo='foto'` (upload de foto de lugar, api/interacciones.js L2356-2360) y
`tipo='foto_voto'` (L2394-2398) insertan filas `tipo='foto'` para el mismo
`(usuario_id, destino_id)` -- y ADR-017 define las fotos como registros LIBRES
(una persona puede subir varias fotos al mismo lugar).

**Sintoma:** al subir una SEGUNDA foto al mismo destino (o votar una foto ya votada),
el INSERT lanzaba `duplicate key value violates unique constraint
"interacciones_usuario_id_destino_id_tipo_key"` (SQLSTATE 23505) y el catch generico
de `api/interacciones.js` (L3446-3449, anterior a esta sesion) lo devolvia como 500,
sin distincion del tipo de conflicto. Detectado en el flujo FIX 3/FIX 5 de la TSK-097
(albumes y fotos de lugar).

**Causa raiz:** la constraint unica compuesta aplicaba a TODOS los `tipo` de
interaccion, no solo a `resena`/`rating`. La dedup semantica (una calificacion por
usuario y destino, ADR-007) no necesita cubrir fotos: exigir unicidad de
`(usuario_id, destino_id, tipo)` para `tipo='foto'` rompe el modelo de fotos libres
del ADR-017. Ademas, la constraint vieja permitia que un usuario tuviera a la vez una
`resena` y un `rating` del mismo destino (porque el `tipo` diferencia), lo que el dedup
simetrico del ADR-007 deberia impedir.

**Fix aplicado (TSK-097, 2026-09-12):**
1. **Migracion `db/migrations/012_interacciones_dedup_resena_rating.sql` (NUEVO):**
   DROP de la constraint compuesta vieja + indice unico PARCIAL
   `idx_interacciones_dedup_resena_rating ON interacciones (usuario_id, destino_id)
   WHERE tipo IN ('resena','rating')` (una calificacion por usuario-destino entre
   resena y rating, ADR-007) + dedup defensivo de duplicados (conserva la resena con
   texto y la fila mas reciente; excluye `usuario_id` NULL) + recalculo de
   `destinos.rating`/`total_resenas` solo para los destinos afectados. Las fotos quedan
   libres de restriccion. Idempotente (ADR-008), ASCII-safe (ADR-002).
2. **Catch tipificado en `api/interacciones.js` L3451-3452:** el catch final ahora
   mapea `err.code === '23505'` a 409 tipado (`{ok:false, error:'Registro duplicado',
   duplicado:true}`) en vez de 500 generico -- el cliente puede distinguir un conflicto
   real de dedup (resena/rating duplicado, foto_voto repetido) de un fallo de servidor.

**Estado:** Corregido en codigo y migracion versionada (working tree SIN commitear).
**REQUIERE aplicar `db/migrations/012_interacciones_dedup_resena_rating.sql` en Neon**
(BLOQUEANTE, lo ejecuta Javier en el editor SQL; no hay credenciales en el repo). Sin
la migracion, produccion sigue con la constraint vieja y la segunda foto devuelve 500;
el catch 23505 -> 409 solo tipifica el error, no elimina la restriccion. Luego commit +
push + deploy.

**Leccion / prevencion:** (1) una constraint unica compuesta sobre `(usuario_id,
destino_id, tipo)` es demasiado amplia cuando existen tipos de registro LIBRES (fotos,
ADR-017) y tipos DEDUP (resena/rating, ADR-007) en la misma tabla -- usar SIEMPRE un
indice unico PARCIAL acotado a los tipos que requieren unicidad; (2) los errores
23505 (violacion de unicidad) no deben caer en el catch 500 generico: mapearlos a 409
para que la UI pueda distinguir "duplicado" de "fallo"; (3) toda alteracion de
constraint vive en el repo como `.sql` versionado (ADR-008), nunca SQL suelto en Neon.

## BUG-033: Canonicals con homografo cirilico `\u043E` (U+043E) apuntando a un dominio inexistente `explorac\u043E.co`

**Contexto:** detectado en la sesion documental de TSK-098 (2026-09-12) al verificar
los canonicals de los HTML estaticos. El canonical `<link rel="canonical">` de 8
archivos raiz usa el homografo cirilico "o" (U+043E, CIRILLIC SMALL LETTER O) en vez
de la "o" latina (U+006F) dentro de la URL del dominio: `https://explorac\u043E.co/...`
en lugar de `https://exploraco.co/...`.

**Archivos afectados (verificado contra archivo real, ADR-006):**
1. `index.html` (L10)
2. `directorio.html` (L11)
3. `contacto.html` (L8)
4. `sobre.html` (L8)
5. `directorio-hostal.html` (L11)
6. `directorio-comida.html` (L11)
7. `directorio-sitio.html` (L11)
8. `directorio-evento.html` (L11)

**Sintoma:** el tag canonical declara como URL canonica un dominio que NO existe
(`explorac\u043E.co` no es exploraco.co: el dominio propio real esta pendiente de
conectar, TASK-004, y el canonical correcto deberia ser `exploraco.co` o
`exploraco.vercel.app`). Impacto SEO: los buscadores podrian ignorar el canonical
o indexar la pagina sin senal canonica; los paginas dinamicas del motor
(`api/pagina-destino.js`, `api/utilidades.js`) SI emiten el canonical correcto,
por lo que la inconsistencia afecta solo a los estaticos listados.

**Causa:** un caracter homografo introducido en las URLs de los estaticos (copia con
teclado/configuracion no-latina o autocompletado de un texto previo con el mismo
caracter). Es invisible a simple vista (la "o" cirilica y la "o" latina son
indistinguibles visualmente en mayoria de fuentes) y no rompe el parseo HTML, por lo
que pasa desapercibido en el Escudo GOLD (balance de divs, node --check y
ASCII-safety no lo detectan: U+043E es un byte >127, pero estos archivos HTML ya
tienen contenido no-ASCII legitimo y el check se aplica a los api/*.js).

**Fix sugerido (NO aplicado, fuera del alcance del epic TSK-098):** reemplazar 1
caracter por archivo (U+043E -> U+006F) en las 8 URLs canonicas:
`https://explorac\u043E.co/` -> `https://exploraco.co/`. Fix de 1 caracter por
archivo, sin cambios de comportamiento; puede hacerse con un script de reemplazo
puntual o a mano. Candidato natural: tarea SEO futura junto con TASK-004 (conectar
el dominio propio) y TASK-005 (Search Console), cuando el dominio propio este activo.

**Estado:** Detectado (2026-09-12, sesion TSK-098). **NO bloqueante y fuera del
alcance del epic** (los canonicals no afectan la funcionalidad: los estaticos
siguen sirviendose por `exploraco.vercel.app` y los dinamicos emiten canonical
correcto). No se corrige en esta sesion para no ampliar el alcance; queda
registrado como hallazgo de QA.

**Leccion / prevencion:** (1) verificar SIEMPRE la composicion Unicode de las URLs
de dominio (canonicals, og:url, links absolutos) con un check de code points (buscar
U+043E y otros homografos cirilicos/griegos en strings `https://exploraco.co`),
porque el homografo no se detecta por inspeccion visual; (2) candidato a incluir en
el Escudo GOLD a futuro: grep de `explorac\u043E` en los HTML estaticos.

## BUG-034: Drift documental -- `scripts/validate_ficha.js` no existe en esa ruta aunque la documentacion y los skills lo citan

**Contexto:** detectado por exploracion durante la sesion documental de la Entrega 016 (2026-09-14, ADR-006: baseline = archivo real). La documentacion de gobernanza cita el validador de fichas como `scripts/validate_ficha.js`, pero ese archivo NO existe en la carpeta `scripts/` de la raiz. El archivo real vive en `.opencode/skills/gemini-research/scripts/validate_ficha.js` (su propio header lo titula `// scripts/validate_ficha.js`), es decir, dentro del skill de investigacion de Gemini.

**Evidencia (verificado contra el repo real, ADR-006):**
- `scripts/validate_ficha.js` -> **NO existe** (`Test-Path` = False).
- `.opencode/skills/gemini-research/scripts/validate_ficha.js` -> **SI existe**.
- Citas con la ruta incorrecta o incompleta: `BLUEPRINT.md` seccion 4 lo menciona como `validate_ficha.js` (sin ruta); `DECISIONS.md` ADR-016 (linea de Impacto) cita `scripts/validate_ficha.js`; `.opencode/skills/create-dynamic-page/SKILL.md` cita `scripts/validate_ficha.js`; `.opencode/skills/gemini-research/SKILL.md` usa la ruta correcta en un punto (`.opencode/skills/gemini-research/scripts/validate_ficha.js`) y la incompleta en otro (`scripts/validate_ficha.js`).

**Sintoma/impacto:** un humano o una IA que siga las instrucciones al pie de la letra ejecutara `node scripts/validate_ficha.js ...` y recibira un error "Cannot find module" (ruta inexistente), bloqueando la validacion de una ficha antes de su ingesta. No afecta a la produccion (no es codigo de runtime), pero rompe el pipeline de creacion de paginas dinamicas descrito en los skills.

**Causa:** el archivo nacio dentro del skill (`.opencode/skills/gemini-research/scripts/`) y se movio/renombro de facto sin actualizar todas las referencias; los documentos del AI-DOS Core conservaron el nombre corto `scripts/validate_ficha.js` de una version anterior (drift documental, el mismo riesgo que ADR-006 advierte: nunca tratar una ruta citada como hecho sin verificar).

**Fix sugerido (NO aplicado):** decidir la ubicacion canonica del validador y alinear todas las referencias. Opcion A (minima): corregir las citas a la ruta real `.opencode/skills/gemini-research/scripts/validate_ficha.js` (BLUEPRINT.md seccion 4, DECISIONS.md ADR-016, los 2 SKILL.md). Opcion B: crear un wrapper/alias en `scripts/validate_ficha.js`. El wrapper agregaria un archivo duplicado (violaria la Regla de No-Duplicidad); la opcion A es la recomendada. En ningun caso se crea el script en esta sesion: la tarea pide solo documentar el drift.

**Estado:** **RESUELTO (2026-10-01, tanda ADR-076 / TSK-170).** **NO bloqueante**; se mantuvo abierto entre 2026-09-14 y 2026-10-01 como observacion documental. **Resolucion aplicada (opcion B del fix, la que el bug recomendo descartar):** el validador canonico quedo en `scripts/validate_ficha.js` en la raiz (verificado con `Test-Path` = True); el archivo que vivia en `.opencode/skills/gemini-research/scripts/validate_ficha.js` desaparecio junto con la skill despublicada, de modo que NO quedo ningun duplicado y la Regla de No-Duplicidad se respeta: hay **una sola copia**, en la ruta que la documentacion ya citaba. Todas las referencias se reescribieron a esa ruta canonica (`create-dynamic-page`, `research-destination`, `scripts/resolver-fotos-eventos.js`). Decision: DECISIONS.md ADR-076; tarea: TASKS.md TSK-170. Nota: se eligio la opcion B (mover a la raiz) en lugar de la opcion A (corregir las citas a la ruta del skill) porque la skill `gemini-research` quedo DESPUBLICADA el 2026-10-01 y su ruta habria muerto con ella, dejando el validador inaccesible.

**Leccion / prevencion:** (1) toda ruta de archivo citada en los documentos de gobernanza debe verificarse con `Test-Path`/exploracion antes de darla por valida (ADR-006); (2) cuando un script vive dentro de un skill, citar SIEMPRE la ruta completa desde la raiz; (3) auditoria futura: revisar periodicamente las rutas citadas en BLUEPRINT.md/DECISIONS.md/skills contra el arbol real del repo.

## BUG-035: Referidos inalcanzables por web -- QR/enlace apunta a `registro.html` inexistente y ningun frontend captura `?ref=`

**Severidad:** ALTA (la piramide de referidos es inutilizable desde la UI; el backend esta sano).
**Sintoma:** el usuario comparte su codigo/QR de invitacion (`.../registro.html?ref=<codigo>`), pero la pagina NO existe (404) y, aunque existiera, el formulario real de registro nunca envia el codigo: la red de referidos queda inalcanzable desde la web.
**Causa:** `mi-perfil.html:1800` compone `REF_URL_BASE + '/registro.html?ref=' + codigo`; `registro.html` NO existe en el repositorio. El alta/login real (`usuario-session.js:219-255`, `loginConEmail`) envia `auth_id/email/nombre/auth_provider/device_hash` pero NUNCA `codigo_referido`. El backend SI lo soporta: `api/usuarios.js:461` lee `body.codigo_referido || req.query.ref`.
**Evidencia (ADR-006):** `mi-perfil.html:1800`; `usuario-session.js:219-255`; `api/usuarios.js:461`; `Test-Path registro.html` = False; grep de `codigo_referido`/`?ref=` en `*.html`/`*.js` solo devuelve `mi-perfil.html:1799-1800`.
**Fix sugerido (NO aplicado):** crear `registro.html` (o landing de registro) que lea `?ref=` y lo envie como `codigo_referido` en el POST de `/api/usuarios`; o redirigir a un registro existente con captura del parametro.
**Estado:** ROTO (working tree, 2026-09-14). Registrado durante la consolidacion documental v5; no se corrige en esta sesion. Mapa completo: `ExploraCO_Sistema_Social_v5.md` seccion 9.4 (G-12/G-13, D-09).

## BUG-036: Visita rota en el frontend -- `marcarVisitado` no envia `Authorization: Bearer` ni `nonce` (401/400)

**Severidad:** ALTA (el flujo de usuario "Estuve aqui" falla aunque el backend y la geocerca esten listos).
**Sintoma:** al pulsar "Estuve aqui", el POST `tipo=visita` responde 401 (sesion) o 400 `NONCE_REQUERIDO`/`NONCE_INVALIDO`; el usuario ve un error y no gana XP.
**Causa:** `usuario-session.js:598-609` (`marcarVisitado`) envia `tipo/usuario_id/destino_id/lat/lng/accuracy/ts` pero NO adjunta el JWT (`Authorization: Bearer`) ni el `nonce`. El backend v13 los exige desde ADR-025: `api/interacciones.js:4734-4741` (`validarSesion` + `consumirNonce`).
**Evidencia (ADR-006):** `usuario-session.js:598-609`; `api/interacciones.js:4734-4741`.
**Fix sugerido (NO aplicado):** solicitar `GET ?tipo=geo_nonce_solicitar`, adjuntar `nonce` y el header `Authorization: Bearer <jwt>` en el POST de visita.
**Estado:** ROTO (working tree, 2026-09-14). Registrado durante la consolidacion documental v5; no se corrige en esta sesion. Mapa completo: `ExploraCO_Sistema_Social_v5.md` y `ExploraCO_Gamificacion_v5_Plan_Maestro.md` seccion 8.6.

## BUG-037: Notificacion de resena a endpoint inexistente (`/api/notificaciones`)

**Severidad:** MEDIA (la resena nueva no notifica al admin; fallo silencioso fire-and-forget).
**Sintoma:** el POST `tipo=resena` intenta notificar al admin, pero el fetch cae en 404 sin log visible para el usuario; el admin no recibe el correo.
**Causa:** `api/interacciones.js:4618-4637` hace `fetch('/api/notificaciones')`; ese endpoint NO existe. El real es `POST /api/admin?recurso=notificaciones` (protegido con Bearer admin o `X-Internal-Secret`), en `api/admin.js:281-298`. La notificacion de solicitudes si funciona porque usa el endpoint correcto (`api/publicar-lugar.js:212`).
**Evidencia (ADR-006):** `api/interacciones.js:4618-4637` (linea 4620 con la URL); `api/admin.js:281-298`; no hay `api/notificaciones.js`.
**Fix sugerido (NO aplicado):** apuntar el fetch a `/api/admin?recurso=notificaciones` con el header interno/Bearer correspondiente.
**Estado:** ROTO (working tree, 2026-09-14). Registrado durante la consolidacion documental v5; no se corrige en esta sesion. Mapa completo: `ExploraCO_Sistema_Social_v5.md` seccion 12.2 (G-15, D-08).

## BUG-038: Conteo de miembros de Parche no se muestra (mismatch `miembros_actuales` vs `miembros_count`)

**Severidad:** BAJA (cosmetico; el dato llega pero el frontend no lo lee).
**Sintoma:** las tarjetas de "Parches abiertos a membresia" nunca muestran el numero de miembros actuales.
**Causa:** el backend devuelve el alias `miembros_actuales` (`api/interacciones.js:2602-2604`), pero el frontend lee `p.miembros_count` / `p.cantidad_miembros` (`comunidad.html:1300-1301`).
**Evidencia (ADR-006):** `api/interacciones.js:2602-2604` (`... AS miembros_actuales`); `comunidad.html:1300-1301`.
**Fix sugerido (NO aplicado):** leer `p.miembros_actuales` en el frontend (o exponer ambos alias).
**Estado:** ROTO (cosmetico, working tree 2026-09-14). Mapa completo: `ExploraCO_Sistema_Social_v5.md` seccion 3.6 (G-02).

## BUG-039: Relabel residual Pandilla -- textos visibles sin actualizar

**Severidad:** BAJA (cosmetico; solo texto de UI).
**Sintoma:** pese al relabel visible Pandilla -> Parche, tres textos conservan el termino viejo en los catalogos de niveles.
**Causa:** el relabel se aplico solo a una parte de los textos; quedaron sin actualizar `mi-perfil.html:514` ("FUNDAR PANDILLA"), `mi-perfil.html:517` ("x1.2 XP de Pandilla grupal") e `index.html:4037` ("FUNDAR PANDILLA").
**Evidencia (ADR-006):** `mi-perfil.html:514`; `mi-perfil.html:517`; `index.html:4037`. La API y el esquema siguen usando `pandilla*` a proposito (NEXT.md).
**Fix sugerido (NO aplicado):** reemplazar por "FUNDAR PARCHE" / "XP de Parche grupal" en los tres textos.
**Estado:** ROTO (cosmetico, working tree 2026-09-14). Mapa completo: `ExploraCO_Sistema_Social_v5.md` seccion 3.5 (G-03).

## BUG-040: Etiquetas de chat desfasadas -- UI dice crear sala nivel 3 / moderar nivel 12, el backend exige 5 / 4

**Severidad:** BAJA (etiqueta informativa desactualizada; el gate real es del backend).
**Sintoma:** el aviso "Niveles de chat" informa crear sala en nivel 3 y moderar en nivel 12, pero el backend rechaza con 403 hasta los niveles 5 y 4 respectivamente.
**Causa:** `CHAT_PERKS` (`comunidad.html:648-654`) declara `crear_chat` nivel 3 y `moderador_chat` nivel 12; el backend exige `mis_chat_creador` (nivel 5, 700 XP) y `mis_chat_moderador` (nivel 4, 450 XP) en `api/interacciones.js:334-353`.
**Evidencia (ADR-006):** `comunidad.html:648-654`; `api/interacciones.js:334-353`.
**Fix sugerido (NO aplicado):** alinear `CHAT_PERKS` con los umbrales de las misiones (`crear_chat` @5, `moderador_chat` @4).
**Estado:** ROTO (etiqueta desactualizada, working tree 2026-09-14). Mapa completo: `ExploraCO_Sistema_Social_v5.md` (G-17/G-18, D-06).

## BUG-041: Gate de voto de utilidad ausente -- `review_voto` no valida nivel

**Severidad:** MEDIA (consistencia de diseno: la capacidad se anuncia como nivel 5 pero no se aplica).
**Sintoma:** cualquier usuario con sesion puede votar utilidad (Own the Spot), sin importar su nivel, aunque la UI presente la capacidad como desbloqueo de nivel 5.
**Causa:** el catalogo de niveles lista la capacidad como texto (`index.html:4028`; `mi-perfil.html:505`, "votos de utilidad (Own the Spot)"), pero `review_voto` solo valida `usuario_id`, que no sea la propia resena y el dedup: NO valida nivel (`api/interacciones.js:3329-3380`).
**Evidencia (ADR-006):** `index.html:4028`; `api/interacciones.js:3329-3380`.
**Fix sugerido (NO aplicado):** agregar gate de nivel 5 (700 XP) en `review_voto` o retirar la capacidad del texto si no se desea gatear.
**Estado:** ROTO (gate ausente, working tree 2026-09-14). Mapa completo: `ExploraCO_Sistema_Social_v5.md` seccion 6.3 (G-06, D-10).

## BUG-042: `album_crear` calcula el nivel con `floor(xp/100)+1` en vez de la tabla oficial de 20 niveles

**Severidad:** BAJA (inconsistencia de calculo; el gate de nivel 2 no coincide con el umbral real de 100 XP).
**Sintoma:** el gate "nivel >= 2" para crear albumes se evalua con una formula distinta a la tabla oficial, por lo que el desbloqueo no coincide con el nivel que ve el usuario.
**Causa:** `api/interacciones.js:3479` calcula `Math.floor(xp_total / 100) + 1`; la fuente de verdad de niveles es la tabla `NIVELES` de `api/usuarios.js:14-35` (nivel 2 = 100 XP).
**Evidencia (ADR-006, al 2026-09-14):** `api/interacciones.js:3479`; `api/usuarios.js:14-35`.
**Fix sugerido (NO aplicado en 2026-09-14):** reutilizar el calculo oficial de nivel (helper compartido) en lugar de la formula `floor(xp/100)+1`.
**Fix aplicado (ADR-035 / TSK-109, 2026-09-17):** el gate de `album_crear` usa ahora `calcularNivelLocal(nivelCheck[0].xp_total).nivel`, el helper oficial de `api/interacciones.js` (misma tabla de 20 niveles que `api/usuarios.js`). Ubicacion real HOY: `api/interacciones.js` L5379 (la L3479 del reporte original quedo obsoleta por el crecimiento del archivo). Cierra la formula divergente que habia quedado latente y que ADR-035 seccion "Validacion" exigio corregir al migrar el XP.
**Estado:** CORREGIDO (ADR-035 / TSK-109, working tree 2026-09-17). Se conserva el registro historico del hallazgo (Regla de Oro 3). Mapa completo: `ExploraCO_Sistema_Social_v5.md` (G-19, D-15).

## BUG-043: Tabs de comunidad desactualizados en GUIA_DE_DESARROLLO.md (doc-drift: 3 vs 7 reales)

**Severidad:** BAJA (doc-drift documental; no afecta runtime).
**Sintoma:** la guia de desarrollo afirma que `comunidad.html` tiene 3 tabs reales (Chat, Planes, Ranking), cuando el hub real tiene 7.
**Causa:** drift documental: la guia de desarrollo no se actualizo cuando el hub crecio de 3 a 7 tabs; el codigo real (`comunidad.html:296-304`) tiene Chat, Planes, Mapa, Ranking, Parches, Activo Oculto y Audiovisual. El drift quedo registrado como discrepancia D-01 del Sistema Social v5 (que citaba `GUIA_DE_DESARROLLO.md:900-903`).
**Evidencia (ADR-006):** contraste original en `ExploraCO_Sistema_Social_v5.md` (D-01, `:860`) contra `comunidad.html:296-304`; al 2026-09-14 la GUIA ya fue corregida por la tarea paralela y `GUIA_DE_DESARROLLO.md:900` ya declara los 7 tabs reales.
**Fix sugerido (NO aplicado aqui):** mantener la GUIA alineada con `comunidad.html:296-304` (corregida por otra tarea) y conservar el contraste historico en el Sistema Social v5.
**Estado:** Detectado y en correccion por la tarea paralela de docs core (2026-09-14, GUIA ya en 7 tabs). Se registra igualmente por Regla de Oro 3 (Cero Borrado Logico).

## BUG-044 (fix R-1): `registro.html` inexistente -- alta de usuarios con `?ref=` inalcanzable (cierra BUG-035)

**Severidad:** ALTA (bloqueaba la piramide de referidos desde la web).
**Contexto:** regresion corregida en la Entrega TSK-103 / ADR-028 (WP-7).
**Sintoma:** el QR/enlace de referidos apuntaba a `/registro.html?ref=<codigo>`, pero la pagina no existia (404).
**Causa (original, BUG-035):** `mi-perfil.html` componia la URL, pero nunca se creo la pagina de alta.
**Resolucion aplicada:** `registro.html` (NUEVO, 13.991 bytes) -- pagina de alta que lee `?ref=` y lo envia como `codigo_referido` en el POST a `/api/usuarios`. `api/utilidades.js` la agrega a `STATIC_PAGES` (`/registro.html`).
**Evidencia (ADR-006):** `Test-Path registro.html` = True; `api/utilidades.js` contiene `{ loc:'/registro.html', priority:'0.5', freq:'monthly' }`.
**Estado:** RESUELTO (working tree, 2026-09-15, TSK-103 / ADR-028). Cierra el sintoma reportado en BUG-035 (queda pendiente el deploy).

## BUG-045 (fix R-2): ningun frontend capturaba `?ref=` -- el codigo de referido nunca llegaba al backend

**Severidad:** ALTA (la piramide de referidos era inutilizable aunque el backend la soportara).
**Contexto:** regresion corregida en la Entrega TSK-103 / ADR-028 (WP-7).
**Sintoma:** al registrarse desde un enlace de invitacion, `codigo_referido` nunca se enviaba; la red quedaba sin construir.
**Causa (original, BUG-035):** `usuario-session.js` (`loginConEmail`) enviaba `auth_id/email/nombre/auth_provider/device_hash` pero NUNCA `codigo_referido`, y no se leia el parametro `?ref=` de la URL.
**Resolucion aplicada:** `usuario-session.js` captura `?ref=` con TTL de 30 dias y lo adjunta como `codigo_referido` en `loginConEmail`; ademas refresca el JWT de sesion.
**Evidencia (ADR-006):** `registro.html` (NUEVO) consume el parametro y `usuario-session.js` lo propaga; el backend ya leia `body.codigo_referido || req.query.ref` (`api/usuarios.js`).
**Estado:** RESUELTO (working tree, 2026-09-15, TSK-103 / ADR-028). Cierra el segundo sintoma de BUG-035.

## BUG-046 (fix R-3): `mi-perfil.html?id=` ignoraba el parametro -- no se podia visitar el perfil de otro usuario

**Severidad:** MEDIA (funcionalidad del perfil publico inaccesible).
**Contexto:** regresion corregida en la Entrega TSK-103 / ADR-028 (WP-7).
**Sintoma:** abrir `mi-perfil.html?id=<uuid>` mostraba SIEMPRE el perfil propio del usuario en sesion, ignorando el `id` solicitado.
**Causa:** `mi-perfil.html` no leia el parametro `id` de la URL; el perfil publico de un tercero no tenia superficie.
**Resolucion aplicada:** la vista publica se movio a `perfil.html` (NUEVO, consume UNA llamada `museo_publico`); `mi-perfil.html` redirige a `perfil.html?id=` cuando recibe el parametro `id`.
**Evidencia (ADR-006):** `perfil.html` (NUEVO, 53.205 bytes) procesa `?id=`; `api/usuarios.js` `GET tipo=perfil_publico` responde con la version ligera.
**Estado:** RESUELTO (working tree, 2026-09-15, TSK-103 / ADR-028).

## BUG-047 (fix R-4): etiqueta "Control Territorial" enganosa en la comunidad

**Severidad:** BAJA (cosmetico / informacion enganosa).
**Contexto:** regresion corregida en la Entrega TSK-103 / ADR-028 (WP-7).
**Sintoma:** `comunidad.html` presentaba una seccion rotulada "Control Territorial" que sugeria un control persistente y exclusivo por faccion, cuando el calculo es derivado en consulta y no otorga dominio.
**Causa:** el rotulo se redacto antes de fijar que la afinidad de Parche y el territorio se calculan en lectura (ADR-027), nunca se persiste un "dueno".
**Resolucion aplicada:** se corrigio la etiqueta de la seccion en `comunidad.html`.
**Evidencia (ADR-006):** `comunidad.html` (archivo modificado en el working tree de TSK-103); ADR-027 documenta el calculo derivado.
**Estado:** RESUELTO (working tree, 2026-09-15, TSK-103 / ADR-028).

## BUG-048 (fix R-5): relabel residual Pandilla -> Parche en la UI (cierra BUG-039)

**Severidad:** BAJA (cosmetico; solo texto visible).
**Contexto:** regresion cerrada en la Entrega TSK-103 / ADR-028 (WP-7); es la continuacion de BUG-039.
**Sintoma:** pese al relabel visible, quedaban textos con "PANDILLA" en los catalogos de niveles (`mi-perfil.html` e `index.html`).
**Causa:** el relabel se aplico por partes y dejo textos sin actualizar (BUG-039).
**Resolucion aplicada:** se corrigio el texto visible en `mi-perfil.html` e `index.html`. La API y el esquema conservan `pandilla*` a proposito (relabel SOLO de UI, ver BLUEPRINT.md seccion 5-ter).
**Evidencia (ADR-006):** `index.html` y `mi-perfil.html` modificados en el working tree de TSK-103.
**Estado:** RESUELTO (working tree, 2026-09-15, TSK-103 / ADR-028). Cierra BUG-039.

## BUG-049: fuga de PII preexistente en `api/usuarios.js` (`?id=`, `?buscar=`, `?tipo=referido_codigo`)

**Severidad:** ALTA (exposicion de datos personales; seguridad).
**Contexto:** detectado y corregido en la Entrega TSK-103 / ADR-028 (WP-3, `api/usuarios.js` v10).
**Sintoma:** `GET /api/usuarios?tipo=perfil_publico&id=<uuid>` devolvia el perfil completo (incluyendo email, tokens de verificacion, `device_hashes` y `codigo_referido`) a cualquiera que conociera el `id`; `?buscar=` permitia enumerar por email y `referido_codigo` era enumerable.
**Causa:** la proyeccion del perfil se construia con `SELECT *` y sin control de acceso por rol/propietario (el patron historico de identidad solo por `usuario_id`).
**Resolucion aplicada:** proyeccion owner-aware (subconjunto publico SIN email/tokens/`device_hashes`/`codigo_referido`; el detalle completo solo para admin o el dueno), `?buscar=` exige admin y `?tipo=referido_codigo` exige sesion firmada JWT (ADR-025).
**Evidencia (ADR-006):** `api/usuarios.js` v12, historial de versiones L75-88 (v10 WP-3 cierra la fuga de PII con whitelist owner-aware; v11/v12 extienden).
**Estado:** RESUELTO (working tree, 2026-09-15, TSK-103 / ADR-028).

## BUG-050: carrera del cobro del DM -- doble cobro / doble sala al enviar el primer mensaje

**Severidad:** MEDIA (integridad de XP y de salas).
**Contexto:** detectado y corregido en la Entrega TSK-103 / ADR-028 (WP-6).
**Sintoma:** dos envios concurrentes del primer mensaje podian crear dos salas DM para el mismo par de usuarios y/o cobrar 20 XP dos veces.
**Causa:** el INSERT de la sala DM no era idempotente ante concurrencia (falta de constraint/`ON CONFLICT` sobre la clave del par).
**Resolucion aplicada:** `clave_dm` (par de uuid ordenado) con indice unico parcial `idx_chat_salas_dm_unica` y `INSERT ... ON CONFLICT (clave_dm) WHERE tipo='dm' DO NOTHING`; la sala se resuelve despues con un SELECT y el cobro ocurre una sola vez.
**Evidencia (ADR-006):** `api/interacciones.js` (v15) ramas `dm_enviar`/`dm_hilos` usan `split_part(clave_dm,'_',...)` y `ON CONFLICT (clave_dm) WHERE tipo='dm'`; `db/migrations/017_perfil_publico_arbol_casas.sql` crea el indice unico parcial.
**Estado:** RESUELTO (working tree, 2026-09-15, TSK-103 / ADR-028).

## BUG-051: `museo_publico` tragaba el error de esquema -- devolvia 404 en vez de 503

**Severidad:** MEDIA (diagnostico enganoso; la pagina parecia "no encontrada" cuando faltaba la migracion).
**Contexto:** detectado y corregido en la Entrega TSK-103 / ADR-028 (WP-3).
**Sintoma:** al pedir un perfil publico sin la migracion 017 aplicada, el endpoint respondia 404 (usuario inexistente), ocultando la causa real (columnas/tablas ausentes).
**Causa:** el catch generico del handler `museo_publico` no distinguia el error de esquema (42P01/42703) del caso legitimo "sin filas".
**Resolucion aplicada:** error tipificado 503 `SCHEMA_NOT_MIGRATED` cuando falta el esquema, en linea con el patron ya usado por otros handlers (no silenciar el fallo, Reglas de Oro).
**Evidencia (ADR-006):** `api/interacciones.js` (v15) rama `tipo=museo_publico` (L2732).
**Estado:** RESUELTO (working tree, 2026-09-15, TSK-103 / ADR-028).

## BUG-052: `casa_ranking` / `exp_ocultos` contaban Activos Ocultos sin filtrar `activo=true`

**Severidad:** MEDIA (conteos inflados que desvirtuaban el ranking y la experiencia).
**Contexto:** detectado y corregido en la Entrega TSK-103 / ADR-028 (WP-5).
**Sintoma:** el ranking de Casas y el calculo de `exp_ocultos` sumaban Activos Ocultos borrados logicamente (`activo=false`), inflando los resultados.
**Causa:** las consultas derivadas agregaban sobre `activos_ocultos` sin el filtro de soft-delete que usa el resto del sistema (Regla de Oro 3 / ADR-003: borrado logico, no fisico).
**Resolucion aplicada:** se agrego `activo = true` a las consultas de `casa_ranking` y del calculo `exp_ocultos`.
**Evidencia (ADR-006):** `api/usuarios.js` (v12) rama `casa_ranking` (L445) y `api/interacciones.js` (v15) calculo de Activos Ocultos; ambos archivos modificados en el working tree de TSK-103.
**Estado:** RESUELTO (working tree, 2026-09-15, TSK-103 / ADR-028).

## BUG-053: `refrescarSesion()` reemplazaba la sesion con la proyeccion publica -- banner "Verifica tu email" persistente pese a `email_verificado=TRUE`

**Severidad:** ALTA (bloquea referidos/facciones/casa/DM de cuentas verificadas).
**Contexto:** regresion colateral del fix de PII de BUG-049 (Entrega TSK-103 / ADR-028) en `api/usuarios.js`; reportada por Javier el 2026-09-15 sobre la cuenta `brsk84@gmail.com`.
**Sintoma reportado:** la cuenta `brsk84@gmail.com` tenia `email_verificado = TRUE` en Neon, pero `mi-perfil.html` seguia mostrando el banner "Verifica tu email" y bloqueaba referidos, facciones, casa y DM.
**Causa raiz (confirmada por QA):** (1) `GET /api/usuarios?id=UUID` nunca devuelve `jwt` (no es columna; se firma en cada login) y, cuando falta/expira el JWT, responde con una proyeccion publica SIN `email`, `auth_id`, `jwt` ni `email_verificado` (`api/usuarios.js`, L500-529; introducido por el fix de PII de BUG-049 / ADR-028). (2) Las dos funciones `refrescarSesion()` REEMPLAZABAN `window.ExploraCO.usuario` con esa respuesta (`usuario-session.js`, L1092 y `mi-perfil.html`, L854), descartando `jwt`/`auth_id`/`email`/`email_verificado`. Al quedar sin JWT, el siguiente fetch pedia la proyeccion publica y los gates `email_verificado !== true` mostraban el banner aunque Neon tuviera TRUE.
**Resolucion aplicada:** `refrescarSesion()` ahora FUSIONA (`Object.assign({}, actual, d.data)`) en vez de reemplazar; conserva `jwt`/`jwt_expira_en` cuando la respuesta no los trae; y si detecta la proyeccion publica (respuesta sin `email`), NO pisa la sesion y dispara `refreshJwt()` (`usuario-session.js`) / `renovarJwt()` (`mi-perfil.html`) para recuperar una sesion privada con JWT nuevo. No quedan asignaciones de sesion alimentadas por GET.
**Evidencia (ADR-006):** `usuario-session.js` (+21/-4) y `mi-perfil.html` (+19/-4) en el working tree (2026-09-15). QA: `node --check` OK en ambos; delta ASCII 0 en el bloque nuevo; balance de divs de `mi-perfil.html` 0; `scripts/smoke_017_perfil_arbol_casas.js` 73/73 PASS; `scripts/smoke_016_multinivel_crowdsourcing.js` 39/39 PASS; sin recursion.
**Estado:** RESUELTO (working tree, 2026-09-15; PENDIENTE commit/push/deploy). Repara la regresion colateral de BUG-049; BUG-049 permanece RESUELTO y sin cambios.

## BUG-054: `POST /api/usuarios` respondia 500 en TODO login/registro con `device_hash` -- SQL invalido en el merge de `device_hashes` (SQLSTATE 42803)

**Severidad:** ALTA (produccion: ningun login ni registro con fingerprint completaba; 500 en todos los casos).
**Contexto:** introducido en el commit `7cc28fe` ("sistema de puntos", 2026-09-14), PREVIO a TSK-104; expuesto por el re-upsert forzado del fix de sesion (BUG-053), porque `usuario-session.js` envia SIEMPRE `device_hash`.
**Sintoma reportado por Javier:** todo `POST /api/usuarios` (upsert de login/registro) devolvia 500. Error real reproducido en produccion (Postgres/Neon): `column "t.ord" must appear in the GROUP BY clause or be used in an aggregate function` -- SQLSTATE 42803.
**Causa raiz:** el merge de `device_hashes` en `api/usuarios.js` (bloque del upsert) construia `SELECT COALESCE(jsonb_agg(t.h), '[]'::jsonb) FROM (...) t ORDER BY t.ord LIMIT 5`: un `ORDER BY` EXTERNO sobre la subconsulta `t` conviviendo con la funcion de agregado `jsonb_agg` SIN `GROUP BY` es invalido en PostgreSQL (42803). Al ejecutarse en cada login con `device_hash`, reventaba TODO el upsert.
**Resolucion aplicada:** `api/usuarios.js` (+30/-14; header `v13` -> `v14`) reescribio la consulta a `jsonb_agg(h ORDER BY ord)` (el `ORDER BY` va DENTRO del agregado) con la subconsulta interna `u ORDER BY u.ord LIMIT 5`, y envolvio el UPDATE en `try/catch` que loguea con `console.error('[usuarios] device_hashes no actualizado:', ...)` y NO re-lanza: el fingerprint es best-effort (anti-Sybil) y NUNCA debe bloquear el login/registro.
**Evidencia QA (ADR-006, contra archivo real):** header real `api/usuarios.js` L2 = `// v14 (HOTFIX: SQL de device_hashes, login 500)`; changelog L92-96; bloque del hotfix L981-1006 (`try` L986, consulta nueva L987-1000, `catch` + `console.error` L1001-1005); `node --check` OK; ASCII/backticks/doble-escape 0/0/0; simulacion runtime con mock `sql`/`neon` 15/15 PASS (200 con `device_hash`, y 200 incluso cuando el UPDATE del fingerprint falla); sin regresion en A1/`verificar_usuario`/`total`; el patron invalido (`ORDER BY t.ord` externo al agregado) ya no aparece en `api/*.js`; `git diff --stat` = 1 archivo, +30/-14.
**Deuda futura (menor, no bloqueante):** el merge solo excluye el hash entrante `$1`; no deduplica duplicados heredados que ya estuvieran en `device_hashes` (JSONB puede conservar repetidos de escrituras previas). No afecta el login; candidato a limpieza futura.
**Estado:** RESUELTO en working tree (2026-09-15); **PENDIENTE commit/push/deploy**. Es la causa inmediata del 500 de login reportado por Javier; el fix de sesion (BUG-053) lo expuso al provocar el re-upsert. No modifica BUG-053 (permanece RESUELTO y sin cambios).

## BUG-055: `GET ?tipo=dm_hilos` devolvia 500 (SQLSTATE 42P08) -- conflicto de deduccion de tipo del parametro `$1` en la bandeja de DM

**Severidad:** ALTA (la bandeja de Mensajeria Directa no cargaba: 500 en cada apertura).
**Contexto:** detectado y corregido en el lote de arreglos ("promptarreglos", 2026-09-16) dentro de `api/interacciones.js`.
**Sintoma:** `GET /api/interacciones?tipo=dm_hilos&usuario_id=<uuid>` respondia 500 con conflicto de deduccion de tipo del parametro (SQLSTATE 42P08); el hilo de DM quedaba inutilizable.
**Causa raiz:** la misma consulta comparaba `$1` contra `split_part(m.clave_dm,'_',1)` (text) y ademas contra `m.usuario_id` (uuid). PostgreSQL infiere UN solo tipo para `$1` y no puede satisfacer ambos usos -> 42P08. El mismo patron aparecia al filtrar `usuario_bloqueos` por `bloqueador_id`/`bloqueado_id` (uuid).
**Resolucion aplicada:** cast explicito a texto en los usos uuid: `m.usuario_id::text<>$1`, `m2.usuario_id::text=$1` y `bloqueador_id::text=$1 OR bloqueado_id::text=$1`. El parametro queda tipado como text sin ambiguedad.
**Evidencia (ADR-006):** `api/interacciones.js` L2937-2939 (rama `dm_hilos`) y L2962 (`usuario_bloqueos`); `node --check` OK.
**Estado:** RESUELTO (working tree, 2026-09-16; PENDIENTE commit/push/deploy).

## BUG-056: fotos repetidas en la galeria de la ficha (caso hostal-r10) -- `destinos_fotos` acumulaba filas sin `UNIQUE(destino_id,url)`

**Severidad:** ALTA (contenido visible corrupto: la misma imagen repetida N veces; deuda de integridad en la tabla).
**Contexto:** detectado y corregido en el lote "promptarreglos" (2026-09-16); afecta `api/admin-destinos.js`, `api/utilidades.js`, `admin.html` y `api/pagina-destino.js`.
**Sintoma:** la galeria de `hostal-r10` (y de cualquier destino editado varias veces) mostraba la misma foto repetida; el conteo de fotos del destino crecia con cada guardado.
**Causa raiz (multiple):** (1) `destinos_fotos` NO declara `UNIQUE(destino_id, url)` y la tabla no se crea en NINGUNA migracion del repo (patron BUG-021: objeto vivo fuera del versionamiento); (2) `api/admin-destinos.js` PUT re-insertaba la galeria SIN borrar la previa; (3) `api/utilidades.js` POST `?tipo=fotos` tambien insertaba acumulando; (4) `admin.html` hacia DOBLE escritura (PUT `admin-destinos` + POST `utilidades`) por la misma accion.
**Resolucion aplicada:** semantica REPLACE (dedupe por url + DELETE + reinsert) en `api/admin-destinos.js` PUT y POST (upsert por slug) y en `api/utilidades.js` POST, con guard anti-perdida (si la lista normalizada queda vacia -> 400 y NO se borra nada; helper `normFotosGaleria`); `admin.html` ya no ejecuta la segunda escritura; `galAll` aplica dedupe defensivo en el render de la ficha.
**Evidencia (ADR-006):** `api/admin-destinos.js` L43-60 (`normFotosGaleria`), L230 y L340-346 (guards 400); `api/utilidades.js` L225-234; `api/pagina-destino.js` L727-733 (`galAll` dedupe); `node --check` OK en los 3.
**Pendiente operativo (BLOQUEANTE para cerrar el bug al 100%):** el codigo ya no vuelve a duplicar, pero los datos YA duplicados en Neon no se limpian solos. Debe ejecutarse `scripts/dedupe_destinos_fotos.js --apply` (backup + borra duplicados + `CREATE UNIQUE INDEX idx_destinos_fotos_destino_url`); requiere `DATABASE_URL` (no hay credenciales locales). `--dry` solo reporta.
**Estado:** RESUELTO en codigo (working tree, 2026-09-16); **PENDIENTE ejecutar dedupe + indice unico en Neon** -> NO cerrado al 100% hasta aplicarlo.

## BUG-057: el popover "Guardar" se cerraba con CUALQUIER click y desmontaba los checkboxes

**Severidad:** MEDIA (bloqueaba el guardado en mapas tematicos desde la ficha).
**Contexto:** detectado y corregido en el lote "promptarreglos" (2026-09-16) en `api/pagina-destino.js`.
**Sintoma:** al abrir el popover "Guardar" (`#guardar-pop`) y marcar un checkbox de mapa tematico, el popover se cerraba solo y el estado del checkbox se perdia.
**Causa raiz:** `cerrarPopoverGuardar` estaba registrado en `document` en fase de CAPTURA y cerraba ante CUALQUIER click (incluidos los del propio popover y los de los checkboxes), destruyendo el nodo antes de que el `onchange` pudiera completarse.
**Resolucion aplicada:** el handler solo cierra si el click es FUERA del popover (`p.contains(ev.target)`) o sobre `#btn-guardar` (guard); `toggleMapaDest` muestra error si `!data.ok` y sus `catch` usan `console.warn` (nada silenciado). **Refuerzo v12.20260917 (TSK-113, 2026-09-18):** defensas en listener capture -- `cerrarPopoverGuardar` no cierra ante `ev.target.id==='btn-guardar'` (L2513) y los checkboxes Tu Mapa (L2533), mapas tematicos (L2545) y el boton "Nuevo mapa" (L2556) usan `event.stopPropagation()` para que el `onchange` siempre se complete.
**Evidencia (ADR-006):** `api/pagina-destino.js` L2298 (`cerrarPopoverGuardar`), L2344 (registro del listener en fase de captura) y L2347 (`toggleMapaDest`); refuerzo v12.20260917 en L2513/L2533/L2545/L2556 (header v12.20260917 L1-2); `node --check` OK, ASCII 0/0/0; `smoke_auditoria_pagina_destino` 54/54 PASS.
**Estado:** **CERRADO** (2026-09-18, fix reforzado `v12.20260917` aplicado en working tree; PENDIENTE commit/push/deploy de TSK-113).

## BUG-058: "Estuve aqui" nunca completaba -- el frontend no enviaba `nonce` ni JWT (cierra BUG-036)

**Severidad:** ALTA (el flujo de visita presencial, nucleo de ADR-024, era inusable desde la UI).
**Contexto:** BUG-036 (registrado al cierre de la Entrega 016) documentaba el flujo ROTO; se corrige en el lote "promptarreglos" (2026-09-16) en `usuario-session.js`.
**Sintoma:** pulsar "Estuve aqui" devolvia 401 (`SESION_*`) o 400 (`NONCE_*`) porque `marcarVisitado` no adjuntaba `Authorization: Bearer` ni `nonce`, exigidos por el backend v13 (`api/interacciones.js`).
**Causa raiz:** el contrato del backend (ADR-025: sesion firmada + nonce geoespacial de un solo uso) avanzo, pero el cliente no se adapto; relacionado con el cierre parcial de BUG-035/BUG-036.
**Resolucion aplicada:** `usuario-session.js` solicita `GET ?tipo=geo_nonce_solicitar`, envia `Authorization: Bearer` + `nonce`, ante 401 llama `refreshJwt` y reintenta UNA vez con nonce NUEVO, y traduce `NONCE_*`/`SESION_*` a mensajes claros; `obtenerUbicacion` distingue los codigos 1/2/3 y reintenta con baja precision (`enableHighAccuracy:false`, `maximumAge:60000`) ante 2/3.
**Evidencia (ADR-006):** `usuario-session.js` L602-647 (`obtenerUbicacion`), L649-665 (`solicitarNonceVisita`), L698-767 (Bearer + nonce + reintento); `node --check` OK.
**Estado:** RESUELTO (working tree, 2026-09-16; PENDIENTE commit/push/deploy + verificacion en vivo). Cierra BUG-036; el backend de la Entrega 016 ya estaba completo.

## BUG-059: IDOR de escritura en albumes -- `album_agregar_foto` no validaba la propiedad del album; `album_voto` no repartia referidos

**Severidad:** ALTA (seguridad: un usuario podia escribir en el album de OTRO usuario).
**Contexto:** detectado y corregido en el lote "promptarreglos" (2026-09-16) en `api/interacciones.js`.
**Sintoma:** `POST tipo=album_agregar_foto` aceptaba cualquier `album_id` sin comprobar que el album perteneciera al `usuario_id` que lo invocaba (escritura cruzada); un `autor_original_id` inexistente escalaba a 500 generico. En paralelo, `album_voto` otorgaba XP sin llamar a `repartirXpReferidos` (gap de la piramide de ADR-027).
**Causa raiz:** la rama confiaba en el `album_id` recibido y no filtraba por dueno; el error de clave foranea (`23503`) no estaba tipificado; `album_voto` se implemento (ADR-017) ANTES de la piramide multinivel (ADR-027) y no se retrofiteo.
**Resolucion aplicada:** `album_agregar_foto` valida la propiedad del album (403 `ALBUM_AJENO`) y tipifica `23503` -> 400 `AUTOR_ORIGINAL_INVALIDO`; `album_voto` invoca `repartirXpReferidos(sql, usuarioId, 5)` para consistencia de la piramide (delta real de `album_voto` = solo este reparto).
**Evidencia (ADR-006):** `api/interacciones.js` L5143-5181 (403 `ALBUM_AJENO`, 400 `AUTOR_ORIGINAL_INVALIDO`) y L5237 (reparto de referidos en `album_voto`); `node --check` OK.
**Estado:** RESUELTO (working tree, 2026-09-16; PENDIENTE commit/push/deploy).

## BUG-060: 503 `SCHEMA_NOT_MIGRATED` en museo/galeria/albumes/perfil publico -- la migracion 004 nunca se aplico en Neon (patron BUG-021)

**Severidad:** ALTA (degradaba a 503 `museo_publico`, `galeria_destino`, `album_detalle`, `albumes`, `mi_feed_fotos`, `fotos_top` y `perfil_publico`).
**Contexto:** causa raiz confirmada en el lote "promptarreglos" (2026-09-16). Es el MISMO patron de BUG-021 (estado de Neon no reproducible desde el repo) y de la familia de BUG-051 (`museo_publico` degradaba mal el error de esquema, 404 en vez de 503).
**Sintoma:** las superficies de museo/galeria/albumes/perfil publico respondian 503 `SCHEMA_NOT_MIGRATED` aunque el codigo estuviera desplegado.
**Causa raiz:** `db/migrations/004_usuarios_blog_autor.sql` (`usuarios.foto_url` + `ciudad_base`) existe en el repo desde la era del blog, pero NUNCA se aplico en la base de produccion. La consulta que proyecta `u.foto_url` disparaba `42703` (undefined column) y el catch global lo convertia en 503. El script sin versionar `scripts/apply_004_foto_url.js` (idempotente, READ-ONLY tras aplicar) confirma la causa.
**Resolucion aplicada (defensiva):** helper `queryConAvatarFallback` en `api/interacciones.js`: si la consulta falla con `42703`, reintenta la MISMA plantilla reemplazando `COALESCE(u.foto_url, u.avatar_url, '')` por `COALESCE(u.avatar_url, '')` y loguea con `console.error` (nunca silencia: cualquier otro codigo se re-lanza). Se aplica a `museo_publico`, `album_detalle` (2 queries), `galeria_destino` (`gdUsuarios`/`gdViajeros`) y `perfil_publico` en `api/usuarios.js`. Antes de la 004, esas rutas devolvian 503; ahora responden 200 con `avatar_url`.
**Evidencia (ADR-006):** `api/interacciones.js` L2114 (`queryConAvatarFallback`), L2760, L3382, L3394, L3499, L3542; `api/usuarios.js` (`perfil_publico`); `db/migrations/004_usuarios_blog_autor.sql`; `scripts/apply_004_foto_url.js`; `node --check` OK.
**Pendiente operativo (BLOQUEANTE, cierre definitivo):** ejecutar `scripts/apply_004_foto_url.js` con `DATABASE_URL` para aplicar la migracion 004 en Neon. Sin ella la degradacion mantiene las rutas en 200, pero `usuarios.foto_url` sigue sin existir (el avatar cae siempre a `avatar_url`) y `ciudad_base`/el autor del blog quedan inutilizables.
**Estado:** MITIGADO en codigo (working tree, 2026-09-16); **PENDIENTE aplicar la migracion 004 en Neon**.
**Nota de cierre (2026-09-23, TSK-154):** BUG-060 queda **CERRADO**. Se aplico `db/migrations/004_usuarios_blog_autor.sql` en Neon con `node scripts/apply_004_foto_url.js` (idempotente, ADR-008). Verificacion en vivo durante la aplicacion: `[1] Antes: foto_url=AUSENTE ciudad_base=EXISTE`; resultado tras aplicar: `foto_url` (text) y `ciudad_base` (character varying) existen y el script emite "VEREDICTO: OK - esquema migrado". Con `usuarios.foto_url` presente, el fallback `queryConAvatarFallback` deja de activarse por `42703` (se conserva como defensa ante entornos sin migrar). Evidencia en vivo (2026-09-23, produccion `https://exploraco.vercel.app`): `GET /api/interacciones?tipo=museo_publico&id=3b78efad-e9f6-49a7-bbd1-af836f528348` -> **HTTP 200** con payload completo; `GET ...&id=<uuid inexistente>` -> **HTTP 404**. El defecto PROPIO del fallback que se activaba por esta causa (bug de codigo, distinto de la migracion faltante) se registro y corrigio como **BUG-084** (commit `1302f7c`, pusheado a `origin/main`). Se conserva el cuerpo historico de arriba (Cero Borrado Logico, Regla de Oro 3).

## BUG-061: `POST /api/interacciones` `tipo='foto'` confia en `body.usuario_id` sin validar sesion -- suplantacion de autor (spoofing)

**Severidad:** MEDIA (seguridad: un usuario puede publicar fotos a nombre de OTRO usuario).
**Contexto:** detectado durante TSK-106 / `PROMPT_MULTIMEDIA_GALERIA.md` (2026-09-16) al construir la UI de compartir foto de `galeria.html`. El handler es PREEXISTENTE (rama de "foto de viajero") y la UI nueva lo hace visible. Decision H-2 del usuario: se registra como bug independiente y NO se corrige en TSK-106 (escalado a `sql-security`).
**Sintoma:** `POST /api/interacciones` con `{ tipo:'foto', usuario_id:<otro uuid>, destino_id, url }` persiste la interaccion `tipo='foto'` a nombre del `usuario_id` recibido, sin comprobar que quien invoca sea ese usuario.
**Causa raiz:** la rama `tipo2 === 'foto'` (`api/interacciones.js` ~L5024-5035) usa la variable del handler `var usuarioId2= body.usuario_id || null;` (L4136) y NO llama a `validarSesion(req, usuarioId2)` (definida en L1911), a diferencia de las rutas de visita/votar/checkin que SI la exigen (ADR-025). El unico gate que existe es de capacidad (`mis_fotografo` completada), no de identidad.
**Impacto:** un atacante autenticado (o anonimo, si la rama no exige sesion) puede atribuir una foto a cualquier `usuario_id`; contamina el feed/galeria del destino y el conteo de XP/misiones del usuario suplantado. No permite leer datos de terceros ni modificar su cuenta.
**Recomendacion (escalada a `sql-security`):** exigir `Authorization: Bearer` y validar la identidad con `validarSesion(req, usuarioId2)` (JWT HMAC, ADR-025), tomando el `usuario_id` del token y NO del body; responder 401 `SESION_*` cuando no coincida. Revisar en la misma pasada las demas ramas POST que usan `usuarioId2` sin `validarSesion`.
**Evidencia (ADR-006):** `api/interacciones.js` L4136 (`var usuarioId2= body.usuario_id || null;`), L1911 (`function validarSesion`), L5024-5035 (rama `tipo='foto'`); `galeria.html` `gShareFoto()` (cliente nuevo que expone el flujo).
**Nota de amplificacion (TSK-118 / ADR-041, 2026-09-18):** los hooks `avanzarMisionesCasa` de la sesion TSK-118 (foto/resena/visita) reutilizan el `usuario_id` del body y escriben progreso en `casa_misiones` (y XP/estado) a nombre del usuario recibido; el mismo vector de suplantacion de BUG-061 amplifica sus efectos (mas puntos que confian en el `usuario_id` del body). La rama nueva `casa_tributo_config` SI exige `validarSesion` desde el hotfix J-2 (v23, BUG-064).
**Estado:** ABIERTO (working tree, 2026-09-16; re-confirmado el 2026-09-18 tras TSK-118); NO corregido en TSK-106 por decision H-2. **Amplificado por los hooks de Casa de TSK-118.** Escalar a `sql-security`.
**Nota de amplificacion (TSK-123 / ADR-044, 2026-09-18):** los nuevos botones Guardar de `media-actions.js` (`guardar_media`/`quitar_guardado_media`) siguen confiando en `body.usuario_id` sin Bearer; al habilitarlos en todo el feed y en el modal de album de `comunidad.html`, crece la superficie del mismo vector (un `usuario_id` ajeno puede marcar/desmarcar guardados a nombre de otro). No es una regresion nueva, es la misma deuda con mas puntos de uso. La lectura por `usuario_id` de `mi_feed_fotos`/`album_detalle` tambien permite observar `ya_votado`/`ya_guardado` de terceros sin sesion (enumeracion de baja severidad; ver deuda D-11).
**Nota de amplificacion (TSK-133 / ADR-045, 2026-09-19):** el nuevo modulo compartido `mapa-cultural.js` replicaba el patron sin autenticacion: `guardarMedia` y `votarMedia` enviaban el `usuario_id` del body sin `Authorization`. En esta entrega se MITIGO extrayendo `jsonAuthHeaders()` (L1354) y anexando el header Bearer en ambos flujos (`guardarMedia` L1361, `votarMedia` L1378). Es una mitigacion de CLIENTE: el backend de `guardar_media`/`quitar_guardado_media` (y la rama legacy `tipo='foto'`) SIGUE ABIERTO y escalado a `sql-security`, por lo que BUG-061 NO se cierra con esta nota. **Actualizacion (TSK-134, 2026-09-19):** la migracion de `index.html` al mismo modulo (working tree) extiende la mitigacion Bearer tambien al mapa del home, que antes usaba su motor inline; mantiene el mismo vector y NO cierra BUG-061 (el backend sigue ABIERTO).

## BUG-062: fotos agregadas por Unsplash no se recolectan en `admin.html` -- `addPhotoFieldWithUrl` usa la clase `photo-url-input` y `getPhotos()` busca `.photo-url-inp`

**Severidad:** MEDIA (perdida silenciosa de datos: fotos elegidas por el buscador de Unsplash se ven en la grilla pero no se guardan).
**Contexto:** detectado durante la sesion ADR-034 (2026-09-17), revisando el flujo de fotos del admin. Es PREEXISTENTE (no lo introdujo ADR-034) y se registra como "detectado, pendiente" (no corregido en esta entrega).
**Sintoma:** al agregar una foto con el buscador de Unsplash, la fila aparece en `#photo-list` y en la grilla de vista previa, pero al guardar el destino esa foto NO se persiste: `getPhotos()` la ignora.
**Causa raiz:** inconsistencia de nombre de clase CSS entre los generadores de filas y el recolector:
  - `renderPhotoList()` (L4644) y `addPhotoField()` (L4656) generan `<input class="form-input photo-url-inp" ...>`.
  - `addPhotoFieldWithUrl()` (L4149, ruta de Unsplash) genera `<input class="form-input photo-url-input" ...>` (con `-input`, sin la abreviatura).
  - `getPhotos()` (L4673-4679) recolecta con `document.querySelectorAll('#photo-list .photo-url-inp')`, por lo que solo lee las filas con la clase historica.
  - Como efecto colateral, `showPhotoGrid()` (L4156-4164) busca `.photo-url-input`, asi que la vista previa SI muestra la foto de Unsplash (lo que oculta el fallo: la foto se ve pero no se guarda).
**Impacto:** perdida silenciosa de fotos de galeria curadas por el buscador de Unsplash; no hay error visible en el admin. Afecta solo a `admin.html` (no a la API ni al render publico).
**Recomendacion (pendiente):** unificar la clase en una sola (`.photo-url-inp`) para `addPhotoFieldWithUrl()` y `showPhotoGrid()`, o exponer un selector/clase compartida; agregar un smoke que verifique que `getPhotos()` incluye una fila creada por todas las rutas de alta. Prevencion: mismo principio de BUG-006/007/012 (una sola fuente para el nombre del contrato, aplicado aqui a una clase de recoleccion).
**Evidencia (ADR-006):** `admin.html` L4149 (`addPhotoFieldWithUrl` -> `photo-url-input`), L4159 (`showPhotoGrid` -> `.photo-url-input`), L4644/L4656 (`renderPhotoList`/`addPhotoField` -> `photo-url-inp`), L4673-4675 (`getPhotos` -> `.photo-url-inp`).
**Estado:** DETECTADO, PENDIENTE (working tree, 2026-09-17). NO corregido en la entrega ADR-034; no bloqueante para el deploy pero si para la integridad de las galerias cargadas por Unsplash.

## BUG-063: la guarda `famaBase < 1` de `aplicarFamaPandilla` descartaba aportes de fama menores a 1 XP -- Parches subcontados

**Severidad:** MEDIA (integridad economica: la fama acumulada de los Parches quedaba por debajo de la real).
**Contexto:** detectado y corregido durante la Entrega TSK-109 / ADR-035 (2026-09-17). Es PREEXISTENTE (introducido con la fama de Parche de ADR-018); forma parte del inventario de puntos de redondeo que ADR-035 obligo a corregir al pasar el XP a `numeric(12,2)`.
**Sintoma:** un aporte de fama legitimamente menor a 1 XP (ej. 0.5, proveniente del 10% de una acreditacion fraccionaria) era descartado por completo en lugar de acumularse; el `fama_total` del Parche quedaba subcontado.
**Causa raiz:** `aplicarFamaPandilla` calculaba `var famaBase = Math.round(xpGanado * 0.10);` y luego `if (famaBase < 1) return false;`. Con la economia entera previa el `< 1` equivalia a "0 o negativo", pero con XP decimal descarta aportes validos entre 0 y 1. Ademas `Math.round` no aplicaba el half-up a 2 decimales que ADR-035 define como criterio unico.
**Resolucion aplicada:** helper de redondeo half-up a 2 decimales (`red2`) y guarda `<= 0`:
  - `api/interacciones.js` L1880: `var famaBase = red2(xpGanado * 0.10);`
  - `api/interacciones.js` L1881: `if (famaBase <= 0) return false;`
  - L1885: el duplicado por el consumible `trompeta_fama` pasa a `red2(famaBase * 2)`.
**Impacto del fix:** solo cambia el calculo hacia adelante (no hay recomputo historico; ver ADR-035: `pandillas.fama_total` NO se recomputa, solo cambia de tipo). Ya NO se descartan micro-fama.
**Evidencia (ADR-006):** `api/interacciones.js` L1880-1885 (verificado en esta sesion documental el 2026-09-17).
**Estado:** CORREGIDO (ADR-035 / TSK-109, working tree 2026-09-17).

## BUG-064: `POST ?tipo=casa_tributo_config` autorizaba por `usuario_id` del body (IDOR) -- spoofing del lider de Casa

**Severidad:** ALTA (seguridad: cualquier usuario podia cambiar `tributo_pct` de una Casa suplantando al lider).
**Contexto:** detectado por la auditoria QA posterior a la implementacion de TSK-118 / ADR-041 (2026-09-18), al revisar la autorizacion de la rama nueva `casa_tributo_config`. Se corrigio dentro de la misma sesion (hotfix J-2) y por eso no llego a un release desplegado.
**Sintoma:** `POST /api/interacciones?tipo=casa_tributo_config` con `{ casa, tributo_pct, usuario_id:<uuid del lider> }` permitia cambiar el tributo de la Casa sin poseer la sesion del lider.
**Causa raiz:** la rama autorizaba al lider comparando el `usuario_id` recibido en el body contra `casas_cofre.lider_user_id`. Como `GET ?tipo=casa_ranking` expone `lider_user_id` publicamente, el atacante solo necesitaba leer el ranking y enviar ese uuid en el body (IDOR de escritura, mismo patron que BUG-059).
**Resolucion aplicada (v23, hotfix J-2):** `api/interacciones.js` exige `validarSesion(req, usuarioId2).ok` (JWT HMAC, ADR-025) ANTES de consultar `casas_cofre.lider_user_id` y comparar; sin sesion valida no se evalua la rama de lider (solo queda el Bearer `ADMIN_SECRET`). El `usuario_id` del body ya no es fuente de autorizacion.
**Evidencia (ADR-006):** `api/interacciones.js` v23 L5824-5849 (rama `casa_tributo_config`), L5835 (`validarSesion(req, usuarioId2).ok`), L5837-5841 (lookup + comparacion de `lider_user_id`); L18 (entrada de changelog v23).
**Estado:** CERRADO / CORREGIDO (hotfix J-2, `api/interacciones.js` v23, working tree 2026-09-18; SIN commitear).

## BUG-065: `album_agregar_foto` inserta fotos sin `visible` -- con el `DEFAULT false` de la 025 las fotos nacen privadas aunque las misiones las cuenten como publicadas

**Severidad:** MEDIA-ALTA (consistencia de visibilidad: fotos legitimas invisibles y conteos de mision inflados).
**Contexto:** detectado el 2026-09-18 durante la remediacion de las fotos de brsk84 (TSK-119), al investigar por que "5 fotos figuran publicadas y no se ven". Tambien explica el sintoma reportado en la cuenta.
**Sintoma:** `GET ?tipo=mis_fotos` y los checks de misiones cuentan/devuelven fotos del usuario como publicadas, pero la UI no puede renderizarlas o el lector publico no las muestra porque `album_fotos.visible=false`.
**Causa raiz:** la migracion 025 dejo `album_fotos.visible boolean NOT NULL DEFAULT false` (ADR-039: privado por defecto). El endpoint legacy `album_agregar_foto` (`api/interacciones.js` ~L6663-6667) hace `INSERT INTO album_fotos (album_id, agregador_id, autor_original_id, foto_url, foto_type, media_title, media_source, xp_otorgado_autor) VALUES (...) RETURNING *` SIN la columna `visible`; por tanto toda foto subida por esa via nace privada. Como los checks de misiones cuentan `album_fotos` por `agregador_id` sin filtrar `visible`/`activo`, para el usuario "publicada" y para el publico invisible.
**Evidencia (ADR-006):** `api/interacciones.js` L6663-6667 (INSERT sin `visible`); `db/migrations/025_album_fotos_visible.sql` (`DEFAULT false`); `scripts/diagnose_fotos_brsk84.js` (reporte read-only, L85-97); `db/cleanups/002_fix_fotos_brsk84.sql` (remediacion de datos).
**Remediacion de datos creada (working tree, PENDIENTE en Neon):** `db/cleanups/002_fix_fotos_brsk84.sql` marca `visible=false`/`activo=false` en `album_fotos` con `foto_url` vacia y `activo=false` en `interacciones tipo='foto'` con texto vacio, acotado por email y estado exacto (idempotente; NO borra filas, Regla de Oro 3). Requiere respaldo previo (bloque [0]).
**Fix de codigo PENDIENTE (NO aplicado en esta sesion):** (a) agregar `visible` al INSERT de `album_agregar_foto` (o derivarlo de la intencion del usuario); (b) que los checks de misiones cuenten solo `visible=true AND activo=true` para no inflar el progreso.
**Estado:** DETECTADO / ABIERTO (remediacion de datos creada; fix de codigo pendiente). TSK-119 / ADR-042, working tree 2026-09-18.

## BUG-066: regresion FE-02 -- `arbolPintar()`/`cargarArbolClases()` hacian `innerHTML=` sobre `#arbol-clases` y destruian `#pf-clase` en runtime

**Severidad:** MEDIA (UI desconectada en runtime; el HTML estatico era correcto, fallaba solo al ejecutar).
**Contexto:** regresion introducida por FE-02 de TSK-119 (fusion "Mi Clase" -> "Arbol de Clases"): `#pf-clase` quedo DENTRO de `#arbol-clases`.
**Sintoma:** al cargar el Arbol de Clases, el widget "Mi Clase" desaparecia (aunque existia en el HTML estatico y el balance de divs daba 446/446).
**Causa raiz:** `arbolPintar()` y `cargarArbolClases()` (`mi-perfil.html`) hacian `host.innerHTML = ...` sobre `#arbol-clases`, que era ANCESTRO de `#pf-clase`; reemplazar `innerHTML` borra todos los hijos, incluido el widget estatico. El QA de HTML estatico (parser/balance) NO lo detecta porque el DOM inicial es correcto.
**Resolucion aplicada (misma sesion, working tree):** se introdujo `<div id="arbol-body">` como host EXCLUSIVO de la inyeccion dinamica; `#pf-clase` quedo como hijo DIRECTO persistente de `#arbol-clases` (L954-960). `arbolPintar()` L3639-3640 y `cargarArbolClases()` L3655-3656 apuntan ahora a `getElementById('arbol-body')`; `host.innerHTML` (L3648) escribe solo en ese host.
**Evidencia (ADR-006):** `mi-perfil.html` L953-960 (estructura), L3639-3640, L3655-3656, L3648 (`host.innerHTML`); re-QA con parser DOM + `node vm`: APTO.
**Leccion de QA runtime:** el patron es IDENTICO a BUG-020/TSK-065: la UI anidada se desconecta SOLO al ejecutar; el balance de divs y la presencia de ids en el HTML no prueban que el runtime los conserve. La verificacion confiable es ejecutar la funcion real y comprobar el efecto observable (parser DOM + sandbox), no solo releer el HTML.
**Prevencion (ver ADR-043):** cuando un contenedor persistente deba convivir con un render dinamico, separar SIEMPRE el host de inyeccion del contenedor persistente y NUNCA usar `innerHTML=` sobre un ancestro que contenga widgets estaticos.
**Estado:** CERRADO / CORREGIDO (regresion FE-02, `mi-perfil.html`, working tree 2026-09-18; SIN commitear). Ver ADR-043 (patron derivado) y TSK-119.

## BUG-067: `cargarAudiovisual(reset)` invertia el `append` de `cargarAlbumesAV` -- albumes duplicados al cambiar de orden

**Severidad:** MEDIA (UI: la grilla de albumes de Comunidad > Audiovisual duplicaba tarjetas al cambiar el orden o recargar).
**Contexto:** detectado y corregido durante TSK-123 (2026-09-18), al construir el tab Audiovisual interactivo. La paginacion usa un booleano `append` con el contador `_avAlbumesOffset`.
**Sintoma:** al cambiar el orden (`setAVOrden` -> `cargarAudiovisual(true)`) la grilla mostraba los albumes anteriores y los nuevos mezclados (duplicados), y el offset avanzaba sobre una grilla que no se habia limpiado.
**Causa raiz:** `cargarAudiovisual(reset)` llamaba `cargarAlbumesAV(reset)`; con `reset=true` (carga inicial / cambio de orden) pasaba `append=true`, de modo que en vez de limpiar la grilla (`grid.innerHTML=''`) y reubicar el offset, VOLVIA a agregar tarjetas al final.
**Resolucion aplicada (misma sesion, working tree):** `comunidad.html` L2022-2026: `cargarAudiovisual(reset)` ahora llama `cargarAlbumesAV(!reset)`; con `reset=true` -> `append=false` (limpia y reinicia `_avAlbumesOffset=0`) y `avCargarMas()` (L2028-2030) sigue llamando `cargarAlbumesAV(true)` para paginar. `cargarAlbumesAV` (L2032-2058) recibe el flag coherente.
**Evidencia (ADR-006):** `comunidad.html` L2022-2026 (`cargarAudiovisual`), L2028-2030 (`avCargarMas`), L2032-2058 (`cargarAlbumesAV`); QA runtime APTO sin bloqueantes (balance de divs 307/307).
**Estado:** CERRADO / CORREGIDO (working tree, 2026-09-18; SIN commitear). Ver TSK-123.

## BUG-068: `POST ?tipo=museo_recurso` bloqueaba el reintento de un recurso nacido oculto con `23505` -- media invisible y 409 "Registro duplicado"

**Severidad:** MEDIA-ALTA (consistencia de visibilidad + bloqueo de alta: el usuario no podia republicar su propia media).
**Contexto:** detectado el 2026-09-19 en la sesion express (TSK-129) al investigar por que la media de la cuenta `gonzalezjavierbta@gmail.com` no aparecia en el mapa cultural y al re-subirla devolvia "Registro duplicado". Es hermano de **BUG-065** (misma raiz de visibilidad por `album_fotos.visible`, migracion 025 / ADR-039), pero por la via URL-only `museo_recurso`.
**Sintoma:** al crear (`accion=crear`) un recurso cuya clave `(album_id, foto_url, autor_original_id)` ya existia con `visible=false` (o `activo=false`), el `INSERT` chocaba con el indice unico `idx_album_fotos_dedup` (migracion 009) y el alta fallaba; la fila existente seguia oculta y por tanto fuera de la capa publica.
**Causa raiz:** el `INSERT` de `museo_recurso` no contemplaba la colision `23505`; la fila previa (nacida con el `DEFAULT false` de la 025) ocupaba la clave y bloqueaba el reintento en vez de republicarse.
**Resolucion aplicada (misma sesion, commit `dfde7e7`; header v23 sin bump):** `api/interacciones.js` captura `23505` y hace reintento idempotente: si la fila existente no es `activo && visible`, la reactiva y publica (`UPDATE album_fotos SET activo=true, visible=true ... RETURNING`) y responde `200 {ok, reactivado:true}` **sin re-otorgar XP** (el recurso ya existia); si ya era publica responde `409 {duplicado:true}`. El `INSERT` sigue escribiendo `visible` explicito.
**Evidencia (ADR-006):** `api/interacciones.js` `museo_recurso` reintento `mrInsErr.code === '23505'` L6506-6529; INSERT con `visible` L6498-6505. Diagnostico read-only y remediacion de datos: `scripts/diagnose_media_oculta.js` y `db/cleanups/003_publicar_media_oculta.sql`.
**Remediacion de datos (PENDIENTE en Neon):** `db/cleanups/003_publicar_media_oculta.sql` pone `visible=true` en las filas que ya estaban `activo=true` (idempotente, NO borra filas, Regla de Oro 3); requiere respaldo previo.
**Estado:** CORREGIDO en codigo (commit `dfde7e7`, 2026-09-19; **ultimo commit local sin push**). Remediacion de datos PENDIENTE en Neon.

## BUG-069: starvation en `?tipo=multimedia_mapa` -- un unico `ORDER BY votos DESC LIMIT 200` sobre el `UNION ALL` desplazaba la media de usuarios

**Severidad:** MEDIA (la media subida por usuarios no aparecia en el mapa cultural aunque estuviera activa y visible).
**Contexto:** detectado el 2026-09-19 (TSK-130) durante la investigacion de la media invisible de TSK-129.
**Sintoma:** con suficientes fotos curadas/globales de alto voto, las filas de las ramas de usuarios (album/oficial) quedaban fuera del `LIMIT` compartido y no se pintaban en el mapa, pese a que el filtro `af.visible=true` las admitia.
**Causa raiz:** la rama armaba un `UNION ALL` de 3 subconsultas (album de usuarios, destinos/global, variantes) y aplicaba al final un unico `ORDER BY votos DESC LIMIT 200`; el ranking global consumia el cupo antes de que las filas de usuarios pudieran entrar (starvation).
**Resolucion aplicada (working tree, 2026-09-19; header v23 sin bump):** cada rama lleva su propio tope interno (`ORDER BY votos DESC LIMIT 300` en album y `LIMIT 300` en destinos) y el `UNION ALL` cierra con `ORDER BY votos DESC LIMIT 600`. Se preserva el orden por votos y se da cupo garantizado a cada origen.
**Evidencia (ADR-006):** `api/interacciones.js` L4757 (`... LIMIT 300) UNION ALL (`) y L4770 (`... LIMIT 300) ORDER BY votos DESC LIMIT 600`); `git diff` sin commitear.
**Estado:** CORREGIDO en codigo (working tree, 2026-09-19; **SIN commitear**). PENDIENTE deploy de `api/interacciones.js`.

## BUG-070: el conteo de votos de fotos de viajero en la ficha usaba el store legacy `interacciones.dims->>'voto_foto_id'`

**Severidad:** MEDIA (dato incorrecto/desactualizado en la ficha publica del destino).
**Contexto:** detectado el 2026-09-19 (TSK-131) al revisar la migracion de la media a `media_votos` (ADR-036).
**Sintoma:** las fotos de viajero en `api/pagina-destino.js` mostraban un numero de votos distinto del que reflejaba `media_votos` (la fuente canonica desde ADR-036), por seguir leyendo el store legacy.
**Causa raiz:** la subquery de `votos` contaba `interacciones` con `dims->>'voto_foto_id' = i.id::text`, esquema anterior a la media unificada; los votos nuevos se escriben en `media_votos` con `fuente='viajero_foto'`, por lo que el legacy quedo desincronizado.
**Resolucion aplicada (working tree, 2026-09-19):** la subquery pasa a `SELECT COUNT(*)::int FROM media_votos mv WHERE mv.fuente='viajero_foto' AND mv.activo=true AND mv.item_id = i.id::text`, coherente con `galeria_destino` (ADR-036).
**Evidencia (ADR-006):** `api/pagina-destino.js` L2655-2666 (subquery `FROM media_votos mv`); `git diff` sin commitear (header sin bump: `v12.20260917`).
**Estado:** CORREGIDO en codigo (working tree, 2026-09-19; **SIN commitear**). PENDIENTE deploy; backfill de votos legacy si aparecen registros historicos fuera de `media_votos`.

## BUG-071: `mis_guardados_media` comparaba `uuid = text` y el catch silencioso devolvia `[]` -- el endpoint SIEMPRE quedaba vacio

**Severidad:** ALTA (funcionalidad muerta: los guardados de media nunca aparecian, ni en "Mis guardados" ni como pines del mapa personal).
**Contexto:** detectado el 2026-09-19 en la sesion de cierre de galeria/mapa/media, al revisar por que los guardados de media no se pintaban. La migracion 023 (ADR-036) convirtio `media_guardados.item_id` a TEXT, pero los joins quedaron comparando contra columnas uuid.
**Sintoma:** `GET ?tipo=mis_guardados_media&usuario_id=<uuid>` respondia `200 {ok:true, data:[]}` siempre, aunque existieran filas activas en `media_guardados` para ese usuario. El frontend no pintaba los guardados como pines.
**Causa raiz:** (a) tres joins comparaban `a.id = mg.item_id`, `af.id = mg.item_id` e `i.id = mg.item_id` -- columnas uuid contra `item_id` TEXT (incompatibles; Postgres no tiene `uuid = text` sin cast); (b) el `.catch(function(){ return []; })` silenciaba el error de tipo y lo convertia en una lista vacia, ocultando la falla (violacion de AGENTS.md 2.2).
**Resolucion aplicada (commit `6c84f9d` "videos"):** (1) casts explicitos `::text` en los 3 joins (`a.id::text = mg.item_id`, `af.id::text = mg.item_id`, `i.id::text = mg.item_id`); (2) nueva rama `UNION ALL` para `fuente='curada'` contra `destinos_fotos` (`df.id::text = mg.item_id`); (3) el `.catch` conserva el fallback `[]` pero registra `console.warn('[interacciones] mis_guardados_media fallo: ...')`. `multimedia_mapa` expone `media_id` y `fuente` para que `mymapa.js` los convierta en pines (`filterMisMapa` + `SET_GUARDADOS`, clave `fuente:media_id`).
**Evidencia (ADR-006):** `api/interacciones.js` L4967-5004 (L4976/L4982/L4989 casts `::text`; L4993-4999 rama `curada`; L5002 `console.warn`); L4755/L4774 (`media_id`/`fuente` en `multimedia_mapa`); `mymapa.js` L179-227; `git show 6c84f9d`. Smoke `scripts/smoke_036_media_unificada.js` 90/90 PASS.
**Prevencion:** no-catch-silencioso (toda degradacion con log tipado, nunca `[]`/`null` sin traza) + verificacion de tipos de esquema al cruzar columnas (`uuid` vs `text`). Regla propuesta P11 en `ANALISIS_AI-DOS_v1.1_y_REGLAS_DE_ORO_v5.md`; ver TSK-138.
**Estado:** CERRADO / CORREGIDO (commit `6c84f9d`, 2026-09-19). Requiere que la migracion 023 este aplicada en Neon.

## BUG-072: filtros de categoria del mapa personal inertes por wiring -- la barra se pasaba como string y el motor no enganchaba nada

**Severidad:** MEDIA-ALTA (UI inerte: la barra de categorias existia pero los clics no filtraban ni ocultaban pines).
**Contexto:** detectado el 2026-09-19 al probar los filtros por categoria (hospedaje/comida/lugares/eventos) del tab Mapa de `comunidad.html` (TSK-137). El motor `mapa-cultural.js` resuelve `options.categories` con `document.querySelector(sel)` cuando llega como string.
**Sintoma:** al pulsar un boton `data-cat` no cambiaba `activeCat`, no se filtraban/ocultaban pines; el wiring estaba "puesto" en el codigo pero no producia efecto.
**Causa raiz:** la barra se paso como string de selector; una variante sin `#` se interpreta como selector de etiqueta (`mm-personal-cats`) y `querySelector` no resuelve -> `bindCategories` retorna sin enganchar. Nota de verificacion (ADR-006): el valor COMMITEADO en `600e656` es `'#mm-personal-cats'` (con `#`); la variante sin `#` esta documentada como incidente I2 en `ANALISIS_AI-DOS_v1.1_y_REGLAS_DE_ORO_v5.md` (L65) y cubierta por el smoke. El fix definitivo elimina la dependencia del parseo de selector.
**Resolucion aplicada (commit `8fe7b47` "mapa"):** `mymapa.js` pasa el ELEMENTO DOM (`categories: document.getElementById('mm-personal-cats')`) en vez de un string; el motor acepta string o elemento (`mapa-cultural.js` L1122-1123) y engancha los clicks de `[data-cat]`.
**Evidencia (ADR-006):** `mymapa.js` L138-141; `mapa-cultural.js` L1120-1134 (`bindCategories`), L1646 (invocacion); `comunidad.html` L469 (`id="mm-personal-cats"` + botones `data-cat`); `scripts/smoke_mapa_cultural.js` L158-236 (stub que documenta que un id sin `#` no resuelve) con **73 checks, 0 FAIL**.
**Prevencion:** verificacion de wiring en runtime (una opcion no esta integrada hasta que un smoke/runtime demuestre el efecto) + guarda de regresion en smoke. Regla propuesta P12; ver TSK-137.
**Estado:** CERRADO / CORREGIDO (commit `8fe7b47`, 2026-09-19).

## BUG-073: el fix no se veia en el navegador por cache de assets compartidos sin version

**Severidad:** MEDIA (el fix llegaba al repo pero no al usuario; retrabajo percibido como "sigue roto").
**Contexto:** detectado el 2026-09-19 al iterar sobre `mapa-cultural.js`/`mymapa.js`: los cambios de media/filtros no se reflejaban en el navegador que ya tenia cacheado el asset sin `?v=`.
**Sintoma:** el comportamiento seguia siendo el anterior aun despues de desplegar el archivo corregido.
**Causa raiz:** `mapa-cultural.js` y `mymapa.js` se referenciaban sin parametro de version en `comunidad.html`/`index.html`; el navegador servia la copia cacheada.
**Resolucion aplicada:** cache-busting de los assets compartidos: `mapa-cultural.js?v=3` (commit `e7445c3`) y `?v=4` (commit `3ffd7a9`) en `comunidad.html` (L566) e `index.html` (L882); `mymapa.js?v=3` (commit `8fe7b47`) en `comunidad.html` (L568).
**Evidencia (ADR-006):** `git show e7445c3 -- comunidad.html index.html` (`?v=2` -> `?v=3` y sin version -> `?v=3`); `git show 3ffd7a9` (`?v=4` en ambos HTML); `git log -S 'mymapa.js?v='` -> commit `8fe7b47` (`?v=3`); archivos reales `comunidad.html` L566/L568 e `index.html` L882.
**Prevencion:** al cambiar un asset compartido, versionar su referencia en TODOS los HTML consumidores. Regla propuesta P13; ver TSK-137.
**Estado:** CERRADO / CORREGIDO (commits `e7445c3`, `8fe7b47`, `3ffd7a9`, 2026-09-19). Riesgo residual: cualquier HTML nuevo que referencie el asset debe recordar la version.

## BUG-074: la media del mapa personal no pintaba al abrir -- `renderMedia()` filtraba por `getBounds()` con contenedor de tamano 0 y sin re-render

**Severidad:** MEDIA (la capa de media aparecia "activada por defecto" pero vacia hasta interactuar con el mapa).
**Contexto:** detectado el 2026-09-19 probando "Mis mapas personales" (TSK-137). El modulo `mapa-cultural.js` filtra los pines de media por `map.getBounds()`.
**Sintoma:** al abrir el tab Mapa, el toggle de media estaba ON pero no se veia ningun pin de media; al mover/redimensionar el mapa aparecian.
**Causa raiz:** en el primer render el contenedor tenia tamano 0 (Leaflet aun no habia calculado el viewport) y no habia un re-render tras `invalidateSize()`; el `getBounds()` devolvia un area que no contenia la media, que quedaba fuera de bounds.
**Resolucion aplicada (commit `8fe7b47`, reforzado en `600e656`):** `mymapa.js` ejecuta `invalidateSize()` y luego `mc.fitBounds()` (encuadra los destinos del mapa activo para que la media cercana quede dentro de bounds) seguido de `mc.refresh()`, tanto en `onMapReady` como en `invalidarTamano()`; ademas fuerza `setMediaEnabled(true)` cuando hay media para el mapa activo.
**Evidencia (ADR-006):** `mymapa.js` L145-173 (`onMapReady` con `invalidateSize`+`refresh`; `invalidarTamano` con `fitBounds`+`refresh` y comentario explicito del bounds). Smoke `scripts/smoke_mapa_cultural.js` (73 checks, 0 FAIL).
**Prevencion:** re-render explicito tras cambios de layout (`invalidateSize()`/cambio de visibilidad) en mapas/tabs/contenedores ocultos. Regla propuesta P14; ver TSK-137.
**Estado:** CERRADO / CORREGIDO (commit `8fe7b47`, 2026-09-19). QA visual en navegador pendiente (TSK-135).

## BUG-075: el drawer del pin mostraba fotos de otros lugares -- filtro por ciudad/radio 10 km mezclaba espacios

**Severidad:** MEDIA (dato incorrecto: el drawer de un lugar mostraba medios ajenos).
**Contexto:** detectado el 2026-09-19 al abrir el pin de `hostal-r10-bogota`: aparecian fotos de La Candelaria y Monserrate (TSK-139).
**Sintoma:** el drawer de un espacio listaba medios de OTROS destinos de la misma ciudad o a <= 10 km.
**Causa raiz:** `mapa-cultural.js` usaba `mediasCercanas()`, que aceptaba un medio si `mismaCiudad(place.ciudad, it.ciudad)` o si estaba dentro de un radio de 10 km; la proximidad geografica no prueba pertenencia al espacio.
**Resolucion aplicada (commit `e7445c3` "mapa"):** se reemplaza por `filterMediaPropios(items, place)`: las FOTOS del drawer son SOLO `origen='destino'`/`'destino_album'` cuyo `origen_id` (slug que emite el backend) coincide con el `slug`/`uuid` del place abierto; dedupe por URL. Ver ADR-047.
**Evidencia (ADR-006):** `mapa-cultural.js` L202-239 (`filterMediaPropios`), L1160 (uso en el drawer), L1708 (exportacion); se eliminaron `normaliza`/`mismaCiudad`/`dentroRadio`; `git show e7445c3`. Smoke: checks `filterMediaPropios: excluye foto de otro lugar` / `foto de album de usuario sigue oculta`.
**Prevencion:** fijar la regla de pertenencia (solo medios del espacio) antes de filtrar. Regla propuesta P15; ver TSK-139 y ADR-047.
**Estado:** CERRADO / CORREGIDO (commit `e7445c3`, 2026-09-19).

**Nota cruzada (2026-09-20, ENMIENDA 1 del ADR-047):** sigue **CERRADO**; el cierre original (commit `e7445c3`) se mantiene y se refuerza. La regla de pertenencia del drawer queda por **vinculo explicito para TODOS los media types** (fotos, videos y audios): el mismo `filterMediaPropios` eliminado el 2026-09-20 retira tambien la concesion de video/audio de comunidad por cercania que habia dejado la mitigacion de **BUG-076** (commits `3ffd7a9`). Ver BUG-076 para la reclasificacion completa.

## BUG-076: al restringir la media a `destino`/`destino_album` se ocultaron los videos de comunidad (`origen='album'`)

**Severidad:** MEDIA (regresion funcional: la pestana Videos/Audios del drawer quedaba vacia).
**Contexto:** regresion introducida por el fix de BUG-075 (`e7445c3`), detectada en la misma sesion (TSK-139) al notar que desaparecieron los videos del drawer.
**Sintoma:** tras restringir las fotos a `destino`/`destino_album`, el drawer ya no mostraba ningun video ni audio.
**Causa raiz:** los espacios dinamicos NO emiten video/audio propio; los videos/audios de la comunidad viven en `origen='album'`, que el filtro estricto excluia por completo. Un filtro global (`return` temprano para todo lo que no sea `destino`/`destino_album`) rompio una feature no relacionada.
**Resolucion aplicada (commit `3ffd7a9` "fotos hero"):** `filterMediaPropios` conserva los VIDEO/AUDIO de comunidad (`origen='album'`) de la misma ciudad o a <= 10 km del espacio; las FOTOS de albumes de usuario siguen ocultas. La capa general (`filterMediaDefault`) mantiene la exclusion de `origen='album'`.
**Evidencia (ADR-006):** `mapa-cultural.js` L202-239 (`esVideoAudio`/`cerca` por ciudad o `haversineKm <= 10`); `git show 3ffd7a9`. Smoke: `filterMediaPropios: incluye video/audio de la ciudad` y `excluye video de otra ciudad lejana`.
**Prevencion:** analisis de impacto de filtros globales (que consumidores/tipos rompe) antes de aplicarlos. Regla propuesta P15; ver TSK-139 y ADR-047.
**Estado:** CERRADO / CORREGIDO (commit `3ffd7a9`, 2026-09-19); **RECLASIFICADO (2026-09-20)** por la ENMIENDA 1 del ADR-047 (ver nota al pie): la mitigacion por cercania se ELIMINO y el sintoma (pestanas Videos/Audios vacias) pasa a comportamiento de producto aceptado.

**Nota (2026-09-20, ENMIENDA 1 del ADR-047 -- DECISIONS.md):** la mitigacion de este bug (restaurar VIDEO/AUDIO de comunidad por cercania, commit `3ffd7a9`) fue **ELIMINADA** por decision de producto del operador. El drawer de `mapa-cultural.js` vuelve a pertenencia SOLO por vinculo explicito: `filterMediaPropios` simplificada (sin `ciudad`/`lat`/`lng`/`esVideoAudio`/`cerca`/`haversineKm <= 10`) acepta unicamente media con `origen='destino'`/`'destino_album'` cuyo `origen_id` coincide con el `slug`/`uuid` del lugar, para FOTOS, VIDEOS y AUDIOS. El sintoma de este bug (pestanas Videos/Audios del drawer vacias) pasa a ser **comportamiento de producto ACEPTADO** (los espacios dinamicos no emiten video/audio propio; la cercania adjuntaba media ajena a cualquier pin de la ciudad, fallo global). La CAPA del mapa y sus pines NO cambian por esta decision: `filterMediaDefault` (`mapa-cultural.js` L190-203) conserva su regla estricta (solo `origen='destino'`/`'destino_album'` de destinos activos; `origen='album'` excluido SIEMPRE; el backend emite video/audio solo en la rama `origen='album'`). Los pines de video/audio del index provienen de su `mediaFilter` propio (`index.html` L2274-2280) y de `filterMisMapa` (`mymapa.js` L189); en `comunidad.html` no se muestran salvo media guardada. Verificado contra archivo real (ADR-006): `mapa-cultural.js` L202-230 (`filterMediaPropios`) y L1143-1149 (`mediasCercanas`); smoke `scripts/smoke_mapa_cultural.js` L272 con check invertido (`excluye video/audio de comunidad (misma ciudad)`), **73 checks, 0 FAIL**. **Via futura (fuera de alcance):** mostrar video/audio en el drawer solo si fue compartido al destino usando `media_compartidos` (migracion 022: `fuente='album_foto'` + `destino_id`), hoy NO emitido por `?tipo=multimedia_mapa`; requeriria cambio de backend. El texto de la resolucion aplicada arriba queda como registro historico (Cero Borrado Logico, Regla de Oro 3).

## BUG-077: regresion del hero en 2 iteraciones por contrato de producto no fijado (principal vs votos; fuentes de miniaturas)

**Severidad:** MEDIA (retrabajo de producto: dos rondas completas de implementacion + smoke sobre el hero).
**Contexto:** detectado el 2026-09-19 en la sesion de galeria/hero por votos (TSK-136). La primera iteracion (`41a3f71`) hizo que la foto con mas votos desplazara a la imagen principal; el usuario corrigio el contrato.
**Sintoma:** el hero mostraba como principal una foto votada por la comunidad en vez de la seleccion editorial (`foto_hero`); la composicion de las 3 miniaturas no respetaba el criterio por fuente.
**Causa raiz:** la regla de producto no estaba fijada antes de implementar: (a) quien es la imagen principal; (b) que fuentes componen las miniaturas; (c) si videos/audio pueden entrar. Cada ambiguedad costo una iteracion.
**Resolucion aplicada (commit `3ffd7a9` "fotos hero"):** contrato final (ADR-046): la PRINCIPAL es la seleccion del usuario (`foto_hero` editorial) y los votos NO la desplazan; las 3 miniaturas son (1) la mejor foto del espacio (curada) por votos + (2-3) las 2 mejores de comunidad por votos, con relleno historico; los videos/audio nunca entran al hero. El ranking agrega `fuente` (`espacio|comunidad`) y la guarda queda en smoke.
**Evidencia (ADR-006):** `api/pagina-destino.js` L800-872 (hero L815-872); `git show 3ffd7a9 -- api/pagina-destino.js` (retira `heroRankeado` y `hero = heroTopFoto.url`, agrega `heroCuradaTop` + 2 de comunidad). Smoke `scripts/smoke_auditoria_pagina_destino.js` (61 checks) con `hero sin votos: principal = seleccion del usuario` y `hero: video con mas votos NO entra al hero`.
**Prevencion:** definir el contrato de datos/UX (fuente, orden, pertenencia) antes de implementar, y dejar su guarda de regresion. Regla propuesta P15; ver TSK-136 y ADR-046.
**Estado:** CERRADO / CORREGIDO (commit `3ffd7a9`, 2026-09-19).

## BUG-078: estado del usuario no persistente al reingresar en las paginas del directorio

**Severidad:** MEDIA (UX de producto: los marcadores de guardado/visita de un usuario se perdian o colisionaban al reingresar a los listados; la resena anonima rompia la atribucion a la cuenta).
**Contexto:** detectado el 2026-09-20 en la sesion de estado persistente del usuario (TSK-144). Las paginas del directorio y la ficha de destino leian el estado del usuario desde `localStorage` en un timing anterior al refresco de sesion (`usuario-session.js`), y los directorios NO sincronizaban contra la BD (solo guardaban el corazon como clave numerica local legacy).
**Sintoma:** al reingresar a una pagina del directorio los corazones guardados no se pintaban (o se perdian los de otras paginas por colision de claves numericas); la visita "Estuve aqui" no se marcaba al volver a la ficha; la resena anonima (nombre@explorador.co) no se atribuia a la cuenta del usuario.
**Causa raiz:** (a) timing de sesion: los directorios hidrataban estado antes de `refrescarSesion()`; (b) directorios SIN sync DB: `mm_saved` usaba claves numericas legacy y nunca persistia a `guardarDestino`/`quitarGuardado`; (c) la ficha NO pre-cargaba "estuve aqui" (`estaVisitado`) al abrir, solo "guardado".
**Resolucion aplicada (working tree, SIN commitear):**
  1. **`usuario-session.js` (+54/-10):** NUEVAS `window.ExploraCO.estaVisitado(uuid)` (~L847-870; reusa GET `?tipo=mapa&usuario_id` -> `data.visitados`; sin sesion = false) y `estadoDestino(uuid)` (~L872-894; `Promise.all([estaGuardado, estaVisitado, obtenerMiVoto])` -> `{guardado, visitado, voto}`); `publicarResena` (~L719-729) AHORA EXIGE SESION (modal login + `{ok:false, requiere_login:true}`; ya NO crea `nombre@explorador.co`; POST conservado con `usuario_id`).
  2. **`api/pagina-destino.js`:** `precargarEstado()` idempotente (~L2638-2662) enganchada en `window.onExploraCOUpdate` + respaldo DOMContentLoaded (marca `#btn-guardar`, `#btn-visitado`, pinta `#qr-stars`; corrige la causa raiz de timing); `#rvn` readonly con `usuario.nombre`; `submitRv` usa el nombre de la cuenta; callback de publicacion corregido a `if(ok===true)` (~L2511).
  3. **`index.html` (~L3535-3540):** `_hidratarGuardadosDB()` ahora llama `renderDest()` con guardados/visitas nuevos (corazones en la grilla del home al reingresar).
  4. **NUEVO `directorio-session.js` (234 lineas, ASCII-safe)** compartido por los 5 directorios; `mmSaved` usa SLUG; `tSave` persiste a DB (`guardarDestino`/`quitarGuardado`) con sesion; hidratacion DB via `cargarMiMapa()` + `renderDir()`; migracion re-ejecutable de `mm_saved` legacy numerico -> slug (catalogo embebido Y API connector). Editados `directorio.html`, `directorio-hostal.html`, `directorio-comida.html`, `directorio-sitio.html`, `directorio-evento.html` (se elimino el `tSave` local duplicado; `usuario-session.js` agregado a los 4 sub-directorios).
**Evidencia (ADR-006):** firmas verificadas en archivos reales HOY: `usuario-session.js` `estaVisitado` L850 / `estadoDestino` L875; `api/pagina-destino.js` `precargarEstado` L2648 + `window.onExploraCOUpdate=precargarEstado` L2661 + `if(ok===true)` L2511; `index.html` `_hidratarGuardadosDB` L3491 -> `renderDest()` L3539; `directorio-session.js` `_mmSaved` L54, `tSave(slug,btn)` L165, hidratacion `cargarMiMapa()` L192-194 y reemplazo de `window.tSave` L227. Verificacion: `node --check` OK x3, ASCII 0 bytes >127, divs diff 0 (index + 5 directorios), smokes `smoke_auditoria_pagina_destino.js` **61/61**, `smoke_estado_sesion_destino.js` **14/14** (NUEVO), `smoke_directorio_session.js` **14/14** (NUEVO), `check_buildHTML_inline.js` OK, `smoke_mapa_cultural.js` 58 checks OK.
**Prevencion:** regla de sesion: hidratar estado SOLO despues de que `usuario-session.js` haya refrescado (o via `onExploraCOUpdate`); sincronizar SIEMPRE los corazones a BD cuando hay sesion; pre-cargar `estaVisitado` en la ficha al abrir.
**Estado:** CERRADO (2026-09-20, working tree SIN commitear; pendiente QA visual en navegador + commit/deploy).
**Deuda asociada (R2):** consumidores LEGACY de `publicarResena` con `.then(function(ok){ if(ok) })` (`Monserrate2.html`, `lacandelaria2.html`, `gen_body7.js`, `_lacandelaria2_body.html`, `_monserrate2_body.html`, `_check_monserrate2.js`, `_tmp_lac2.js`) que confundirian un sin-sesion con exito (fuera de flujo Vercel). **R3:** deuda GOLD preexistente de `api/pagina-destino.js` (doble escape `\u2605` L2473 = **BUG-002 ABIERTO**; backticks en comentario L1646); doble toast posible en directorios al guardar con sesion (XP local + toast del servidor).

## BUG-079: al actualizar los datos de una entrada del directorio se pierde la puntuacion de las fotos (votos de media curada huerfanos por el REPLACE de la galeria)

**Severidad:** ALTA (perdida real de datos de producto: los votos/comentarios de las fotos curadas de un destino quedaban huerfanos en cada guardado desde el admin, porque la fila de `destinos_fotos` se re-creaba con un id nuevo).
**Contexto:** reportado por el operador y corregido el 2026-09-20; cierre documental express en esta sesion (docs-only, ruta FREE). El patron REPLACE de la galeria ya era conocido (BUG-056, L963) pero su efecto colateral sobre los ids (y por tanto sobre `media_votos`/`media_comentarios`, que cuelgan de `destinos_fotos.id::text`) nunca estaba documentado como falla propia.
**Sintoma:** al actualizar los datos de una entrada del directorio desde el admin (admin.html) y guardar, la puntuacion de las fotos se perdia: las filas de la galeria se re-creaban con id nuevo (DELETE + re-INSERT), los votos curados quedaban huerfanos y las fotos de Neon volvian a la galeria como "nuevas" (sin su id_neon ni su caption, y con la hero fuera de lugar).
**Causa raiz (doble):**
  1. **`api/admin-destinos.js` hacia REPLACE total de la galeria:** DELETE + re-INSERT de TODAS las filas de `destinos_fotos` en cada guardado, generando ids nuevos. `media_votos`/`media_comentarios` (fuente='curada') cuelgan de `destinos_fotos.id::text`, asi que los votos quedaban huerfanos (patron de tabla no versionada, BUG-021).
  2. **El frontend `admin.html` no preservaba la identidad de las fotos:** `getPhotos()`/`collectPlace` recomponian el payload sin `id_neon` ni `caption`, y `_cargarFotosDeNeon()` solo fusionaba cuando el registro local estaba VACIO (nunca al editar una entrada con fotos locales: ademas dejaba sin recolectar las fotos Unsplash, deuda BUG-062). Resultado: el admin re-enviaba la galeria sin identificadores y el servidor no tenia con que conservar las filas.
**Resolucion aplicada (working tree, SIN commitear):**
  1. **`admin.html`:** `_photoToObj()` normaliza cada foto a objeto (L4656-4671); `getPhotos()` devuelve `{url,caption,id_neon,es_hero,orden}` (L4712-4735); `_placeToAPI()` envia `fotos_galeria` con TODAS las fotos desde indice 0 (la hero viaja con su `id_neon` y `es_hero:true`; `foto_hero` sigue siendo string aparte) (L6068+); `_cargarFotosDeNeon()` FUSIONA por URL (local gana caption; id_neon/es_hero/orden de Neon) y corre SIEMPRE al editar una entrada publicada (L6219+).
  2. **`api/admin-destinos.js` (v2.2):** `normFotosGaleria()` valida cada item (id uuid canonico o serial de 1-10 digitos; invalido -> null) (L38) y `reemplazarFotosGaleria()` es un MERGE transaccional (`sql.transaction`, L83/L168): empareja por id -> UPDATE conservando el id; sin id, fallback por url unica no usada -> UPDATE conservando el id; sin match -> INSERT; DELETE parametrizado SOLO de filas no usadas; coherencia `es_hero` con `foto_hero`; guard anti-perdida 400 SOLO cuando hay items pero ninguno con url valida.
  3. **Caso "sin fotos" (precision):** NO devuelve 400: el merge se omite silenciosamente y la galeria existente en Neon se PRESERVA (anti-perdida). Deuda real: no hay via desde el admin para vaciar por completo la galeria (debe quedar al menos 1 foto).
**Evidencia (ADR-006):** comentarios `BUG-079` en `admin.html` (8: L2818, L3300, L4656, L4677, L4713, L6076, L6214, L6712) y en `api/admin-destinos.js` (5: L8, L35, L67, L353, L485); VERSION de `admin.html` bumpeada a `admin-v9.20260920`. Smoke vm 4/4: A = hero + galeria curadas preservan ids; B = solo hero sin 400; C = sin fotos -> galeria Neon preservada y sin 400; D = 400 solo con items invalidos. `node --check` OK en ambos archivos; ASCII-safety 0/0/0; balance de divs `admin.html` 815/815 diff 0; cero 'BUG-056' residual en `admin.html`/`api/admin-destinos.js`.
**Prevencion:** nunca eliminar/reinsertar filas de tablas de las que cuelgan otros registros por id (patron de tabla no versionada, BUG-021): si la fila ya existe, UPDATE conservando el id; los votos/comentarios de media curada dependen de que `destinos_fotos.id` sea estable mientras la fila exista (ver ADR-050, addendum al ADR-030 en DECISIONS.md).
**Estado:** CERRADO (2026-09-20, working tree SIN commitear; fix de codigo + auditoria verificadas contra el archivo real).
**Pendiente operativo (medicion):** correr `scripts/diagnose_fotos_huerfanas.js` (NUEVO, read-only) contra Neon con `DATABASE_URL` para cuantificar los votos curados YA huerfanos por el REPLACE historico y decidir remedio (reanclar por url a la fila actual unica, con backup, tipo db/cleanups/). Requiere credenciales de Neon (Javier).
**Cierres colaterales:** tambien cierra **BUG-062** (fotos Unsplash del registro local no se recolectaban al editar: `_cargarFotosDeNeon()` ahora fusiona por URL siempre).

## Nota de re-confirmacion de BUG-066 (sesion express 2026-09-18/19) -- no es un bug nuevo

El contexto de relevo de la sesion express reportaba como "bug nuevo" una "regresion de anidacion `#pf-clase`/`#arbolPintar` corregida con `#arbol-body`". Contra archivo real (ADR-006), ese hallazgo es EXACTAMENTE **BUG-066** (regresion FE-02 de TSK-119, CERRADO con `#arbol-body`), no una falla distinta. **No se crea un BUG nuevo para no duplicar el registro historico (Regla de Oro 3).** Lo que hizo la sesion express (TSK-127) fue retirar por completo `#pf-clase` y absorber Clase/Tabla de Destino/Vocaciones en el Arbol de Progreso, **reutilizando** el host persistente `#arbol-body` y el patron anti-regresion de **ADR-043**. El caso queda documentado como riesgo D.1 en `MODO_EXPRESS_ANALISIS.md`.

## Preexistentes NO resueltos arrastrados por la sesion express (2026-09-18/19) -- NO atribuibles a la sesion

- **BUG-002 ABIERTO:** `api/pagina-destino.js` **L2431** conserva 1 doble escape real (`'\\u2605'` en `addRvOptimista`; verificado contra archivo real). Deuda de limpieza, ajena a esta sesion.
- **FAIL preexistente `A3d`** de `scripts/smoke_038_casas_clases.js` (check en L356); se mantiene como fallo conocido y debe distinguirse de cualquier regresion nueva al correr esa suite.
- **BUG-061 y BUG-065 ABIERTOS:** ver sus entradas; BUG-061 queda amplificado por los nuevos accesos de media y BUG-065 es la raiz hermana de BUG-068.

## Deuda ADR-035: columnas no versionadas de las que dependen los rankings (patron BUG-021)

**Nota:** los rankings de la Entrega TSK-109 dependen de tres columnas que siguen SIN migracion versionada, igual que BUG-021: `usuarios.activo` y `usuarios.ultimo_acceso` (definicion de "miembro activo vigente" a 30 dias en `casa_ranking` y `pandilla_ranking`) e `interacciones.xp_ganado` (columna de XP, no versionada; la migracion 021 la cubre con guard `IF EXISTS` y el preflight la marca como opcional).

**Mitigacion implementada (no cierra la deuda):** fallback `42703` en `api/usuarios.js` (L468-549) y `api/interacciones.js` (L4257-4284): si la columna no existe, se reintenta la MISMA consulta sin la condicion de actividad y se responde `miembros_activos = 0` con `console.warn` (nunca catch vacio, AGENTS.md 2.2). La 021 no puede versionar estas columnas porque no las crea: solo convierte tipos de columnas que ya existen.

**Recomendacion:** versar `usuarios.activo`, `usuarios.ultimo_acceso` e `interacciones.xp_ganado` en una migracion futura (idempotente ADR-008) antes de crear los indices de apoyo de los rankings; sin la definicion versionada, cualquier `DROP`/recreacion de esquema las pierde.

**Estado:** DEUDA DOCUMENTADA (ADR-035 / TSK-109, 2026-09-17). No bloqueante; el fallback mantiene las rutas en 200 con contadores en 0.

---

## Pendientes operativos del lote "promptarreglos" (2026-09-16) -- requieren `DATABASE_URL` / Neon

**Nota:** consolidado de los pendientes de ejecucion del lote; ambos requieren credenciales de Neon que NO existen en el entorno local, por lo que los ejecuta Javier. Se listan aqui para que ninguna IA los asuma resueltos (ADR-006).

- **P1 -- `scripts/apply_004_foto_url.js`** (aplica `db/migrations/004_usuarios_blog_autor.sql`: `usuarios.foto_url` + `ciudad_base`). Causa raiz de los 503 `SCHEMA_NOT_MIGRATED` de museo/galeria/albumes/perfil publico (BUG-060). Idempotente.
- **P2 -- `scripts/dedupe_destinos_fotos.js --apply`** (backup + borra duplicados de `destinos_fotos` + `CREATE UNIQUE INDEX idx_destinos_fotos_destino_url`). Sin este paso, el BUG-056 NO queda cerrado al 100% (el codigo ya no duplica, pero los datos historicos siguen repetidos).

---

## Observaciones residuales de TSK-104 (2026-09-15) -- NO son bugs confirmados

**Nota:** estos hallazgos provienen del QA de TSK-104 y se registran como OBSERVACIONES de riesgo/consistencia (no como bugs confirmados), a pedido del cierre documental. Se conservan por Regla de Oro 3 (Cero Borrado Logico). La decision que los origina vive en DECISIONS.md ADR-029; el cierre de la tarea en TASKS.md TSK-104.

### H4 (TSK-104): auto-verificacion amplia al nombre `javier` -- riesgo de integridad aceptado
- **Severidad:** MEDIA (riesgo de integridad; aceptado por decision de producto).
- **Contexto:** A1 de TSK-104 (ADR-029) verifica automaticamente en el upsert a quien cumpla `email.toLowerCase() === 'brsk84@gmail.com' || nombre.toLowerCase() === 'javier'`.
- **Observacion:** cualquier usuario nuevo que se registre con el nombre `javier` queda `email_verificado=true` sin control adicional, lo que desbloquea referidos/facciones/proponer Activos.
- **Estado:** OBSERVACION (no bloqueante, riesgo aceptado 2026-09-15). A revisar: restringir por email y/o verificar propiedad del nombre.

### H6 (TSK-104): `GET ?tipo=leaderboard` publico expone `total` de usuarios
- **Severidad:** BAJA (dato agregado; cambio de superficie publica).
- **Contexto:** C1 de TSK-104 agrega `total` (`COUNT(*)`) a la respuesta del leaderboard.
- **Observacion:** el endpoint no exige Bearer, por lo que el conteo de usuarios registrados queda publico.
- **Estado:** OBSERVACION (no bloqueante 2026-09-15). Decidir si el `total` se mantiene publico o se mueve tras auth.

### H7 (TSK-104): `verificar_usuario` con `usuario_id` no-UUID responde 500
- **Severidad:** BAJA-MEDIA (validacion de entrada; diagnostico).
- **Contexto:** A2 de TSK-104 ejecuta `UPDATE ... WHERE id=$2` con el valor recibido.
- **Observacion:** un `usuario_id` que no sea UUID valido dispara `22P02` (invalid input syntax for type uuid), capturado por el try externo -> 500, en vez del 400 esperado.
- **Estado:** OBSERVACION (no bloqueante 2026-09-15). Fix sugerido: validar el formato UUID antes del UPDATE y responder 400.

### H8 (TSK-104): deuda preexistente en `api/utilidades.js` (catch vacio + baseline no-ASCII/backticks)
- **Severidad:** BAJA (deuda tecnica preexistente; NO atribuible a TSK-104).
- **Contexto:** verificacion ADR-006 de `api/utilidades.js` durante el cierre de TSK-104.
- **Observacion:** (a) `.catch(function(){})` vacio en la rama `visitas` POST (silencia fallos, prohibido por AGENTS.md seccion 2.2); (b) baseline no-ASCII de 680 bytes >127 y 24 backticks, preexistentes en HEAD (Regla de Oro 1 exige cero en `api/*.js`).
- **Evidencia (ADR-006):** conteo sobre el archivo real: 680 bytes >127 y 24 backticks; el diff de TSK-104 (`+24` lineas) aporta 0 backticks y 0 no-ASCII.
- **Estado:** OBSERVACION (deuda preexistente 2026-09-15, no bloqueante). Candidata a una tarea de higiene ASCII del backend; no se corrige aqui.

---

## Deuda QA preexistente en smokes (2026-09-15) -- NO bloqueante, NO atribuible al bugfix de sesion (BUG-053)

**Nota:** hallazgos de QA detectados durante el cierre del bugfix de sesion (BUG-053); son PREEXISTENTES y no bloqueantes. NO se corrigen aqui porque el bugfix no toca smokes ni el catalogo (Regla de Oro 3: se documentan, no se borran).

### DQ-1: `scripts/smoke_test_perfil_progreso.js` espera 22 misiones (catalogo real: 36)
- **Severidad:** BAJA (smoke desactualizado; falso negativo).
- **Observacion:** el smoke fija 22 misiones esperadas, pero el catalogo server-side tiene 36. Candidato: actualizar el numero esperado o derivarlo del backend.
- **Estado:** DEUDA QA (preexistente, no bloqueante, 2026-09-15).

### DQ-2: `scripts/smoke_test_epic_prompt.js` con expectativas desactualizadas (VOCACIONES y `chat_salas`)
- **Severidad:** BAJA (smoke desactualizado; falso negativo).
- **Observacion:** espera `VOCACIONES` 3 vs 4 reales, y `chat_salas` `plan` vs `plan+dm` reales (tras TSK-103: 4 vocaciones y DM `tipo='dm'`). Candidato: actualizar las expectativas.
- **Verificacion (2026-09-21, TSK-148 / ADR-053):** corrido contra archivo real: `node scripts/smoke_test_epic_prompt.js` = **53 checks, 49 PASS, 4 FAIL**. Los 4 FAIL son los preexistentes ya descritos (vocaciones 3->4 por ADR-026 y el filtro de `chat_salas` que excluye salas `plan`); NO son regresiones de la Gamificacion v6 (`npm test` no incluye este smoke justamente por esta deuda). Sigue sin corregirse para no ampliar el alcance de la entrega.
- **Estado:** DEUDA QA (preexistente, no bloqueante, 2026-09-15; re-verificada 2026-09-21 con 4 FAIL).

---

## Deuda ADR-036: esquema base no versionado, tipo de `destinos_fotos.id` y tablas legacy de media (patron BUG-021)

**Nota:** estos hallazgos NO son bugs confirmados de la Entrega TSK-110 / ADR-036 (2026-09-17); son DEUDA TECNICA de esquema detectada al versionar las migraciones 022/023. Se registran aqui para que ninguna IA las asuma resueltas (ADR-006). La entrega las mitiga con guards (`to_regclass`/`information_schema`) y degradacion con `warn`, pero NO las cierra. Se conservan por Regla de Oro 3 (Cero Borrado Logico).

### D-1: CHECK de `interacciones.tipo` y esquema base (`usuarios`/`interacciones`/`destinos_fotos`) NO versionados
- **Severidad:** MEDIA (gobernanza de BD; la realidad de Neon no es reproducible desde el repo, mismo patron que BUG-021/BUG-060).
- **Contexto:** la Entrega ADR-036 necesitaba registrar comparticiones y votos/comentarios/guardados de media. Por eso NO se agrego `'compartir'` al CHECK de `interacciones.tipo`: la tabla `interacciones` y su CHECK viven SOLO en Neon (fuera de `db/migrations/`), de modo que un `ALTER` sobre ellas seria SQL suelto contra ADR-008 y podria divergir de la realidad. Se resolvio con tabla propia `media_compartidos` (022) y tablas `media_*` (023); el CHECK legacy queda intacto (confirmado por el preflight 1 de la 022).
- **Deuda:** siguen SIN declaracion versionada el CHECK de `interacciones.tipo` (`resena|guardado|visita|foto|rating`), la tabla base `interacciones` (incluidas `dims` y `xp_ganado`), la tabla `usuarios` (incluidas `activo`/`ultimo_acceso`, ya anotadas en la deuda de ADR-035) y `destinos_fotos`.
- **Mitigacion implementada (no cierra la deuda):** la 022/023 validan en tiempo de ejecucion la existencia de tablas/columnas con `to_regclass`/`information_schema` antes de tocarlas; `api/interacciones.js` v19 usa `conDegradacionMedia`/`contarComentarioSafe`/`contarCompartidosUsuario` para degradar a 0/false con `console.warn` si falta una tabla (nunca catch vacio, AGENTS.md 2.2).
- **Recomendacion:** versar el esquema base en migraciones idempotentes (ADR-008) antes de cualquier `DROP`/recreacion de esquema; una migracion futura debe declarar el CHECK real de `interacciones.tipo` y las columnas no versionadas en vez de asumirlas.
- **Evidencia (ADR-006):** `db/migrations/022_media_compartidos.sql` (encabezado "NO TOCA EL CHECK DE interacciones.tipo" y preflight 1, lineas 18-21 y 77-85), `db/migrations/023_interacciones_media_unificadas.sql` (encabezado "DEFENSIVO", lineas 29-34), `api/interacciones.js` v19 L2199/L2512/L2862.

### D-2: tipo real de `destinos_fotos.id` por verificar
- **Severidad:** BAJA (por ahora el diseno no depende de ese tipo, pero la verificacion es obligatoria antes de asumir cualquier cast/FK).
- **Contexto:** la 023 migra los votos de foto curada con `fuente='curada'` e `item_id text`, y `galeria_destino` los arma con `String(f.id)`. La entrega NO asume si `destinos_fotos.id` es `uuid` o `text`: el preflight 6.1 de la 023 lo consulta en vivo (`information_schema.columns`). Si en el futuro se quisiera una FK real de `media_votos.item_id` a `destinos_fotos.id`, primero hay que confirmar el tipo.
- **Estado:** DEUDA DOCUMENTADA (ADR-036 / TSK-110, 2026-09-17). El preflight 6.1 es el paso de verificacion; no bloqueante.

### D-3: tablas legacy `album_votos`/`album_comentarios`/`album_comentario_votos` retiradas del backend pero NO dropeadas
- **Severidad:** BAJA (deuda de limpieza; convivencia deliberada).
- **Contexto:** desde ADR-036 v19 TODOS los lectores del backend migraron a `media_*` (votos, comentarios, likes y guardados), pero las tablas legacy se CONSERVAN intactas: la 023 hace backfill idempotente (solo COPIA con `ON CONFLICT DO NOTHING`) y su encabezado prohibe explicitamente `DROP`/`DELETE`/`TRUNCATE` (Cero Borrado Logico, Regla de Oro 3). Ademas, eliminarlas con clientes viejos aun activos romperia el rollback.
- **Recomendacion:** una tarea de datos explicita y separada (con respaldo y ventana de observacion post-deploy) cuando se confirme que ningun cliente viejo las lee; no ejecutar en caliente junto con el deploy de ADR-036.
- **Evidencia (ADR-006):** `db/migrations/023_interacciones_media_unificadas.sql` encabezado "NO BORRA TABLAS LEGACY" (lineas 24-27) y backfills 5.1/5.4/5.3; `api/interacciones.js` v19 (lectores sobre `media_votos`/`media_comentarios`/`media_comentario_likes`).
- **Estado:** DEUDA DOCUMENTADA (ADR-036 / TSK-110, 2026-09-17). No bloqueante; el rollback la mantiene como red de seguridad.

---

## Deuda ADR-039 / ADR-040 (2026-09-18) -- recoleccion de QA y `XP_LEVELS`, NO bugs confirmados

**Nota:** estos hallazgos NO son bugs confirmados de la Entrega TSK-114..TSK-117 (2026-09-18); son DEUDA TECNICA / de QA preexistente detectada durante el Escudo GOLD. Se registran aqui para que ninguna IA las asuma resueltas (ADR-006) y se conservan por Regla de Oro 3.

### DQ-3: `scripts/smoke_036_compartir.js` espera el header `v19` (real: v22)
- **Severidad:** BAJA (deuda QA; NO causada por TSK-114..117).
- **Contexto:** el smoke asserta literalmente `api/interacciones.js  v19` (L149) y su encabezado dice "tipo='compartir' de api/interacciones.js v19" (L3). El header real HOY es **v22**. YA fallaba antes de esta entrega (el header paso a v20 en TSK-111 y a v21 en TSK-112 sin actualizar el assert).
- **Recomendacion:** hacer el assert robusto (regex de version) o actualizar la expectativa al subir el header; correr en la proxima tarea de higiene de smokes.
- **Evidencia (ADR-006):** `scripts/smoke_036_compartir.js` L3/L149; `api/interacciones.js` L1 v22.
- **Estado:** DEUDA QA DOCUMENTADA (2026-09-18). No bloqueante.

### DQ-4: `scripts/test_logros_catalogo.js` espera 30 logros (real: 33 desde ADR-036)
- **Severidad:** BAJA (deuda QA; NO causada por TSK-114..117).
- **Contexto:** el check "LOGROS: 30 trofeos en catalogo" (L34) quedo desactualizado cuando ADR-036 sumo 3 logros de compartir (`logr_primer_compartido`, `logr_compartidor_25`, `logr_viral_100`); el catalogo real es **33**.
- **Recomendacion:** actualizar la expectativa a la fuente real (`LOGROS.length`) o derivarla del catalogo.
- **Evidencia (ADR-006):** `scripts/test_logros_catalogo.js` L34; `api/interacciones.js` catalogo LOGROS de 33.
- **Estado:** DEUDA QA DOCUMENTADA (2026-09-18). No bloqueante; puede contarse junto con DQ-1/DQ-2.

### D-4: `catch` vacios preexistentes en `mi-perfil.html` (fuera de alcance de TSK-116)
- **Severidad:** BAJA (deuda tecnica preexistente; AGENTS.md seccion 2.2 prohibe capturar y silenciar sin registro).
- **Contexto:** el QA reporto 12 capturas best-effort/vacias preexistentes en `mi-perfil.html`; no fueron introducidas por TSK-116 y no se corrigieron para no ampliar el alcance. El conteo depende del patron de busqueda (10-12).
- **Recomendacion:** tarea de higiene separada (tipar/loguear o eliminar las capturas muertas).
- **Estado:** DEUDA DOCUMENTADA (2026-09-18). No bloqueante.

### D-5: `XP_LEVELS` duplicado en `index.html`, `comunidad.html` y `usuario-session.js` (ADR-040)
- **Severidad:** BAJA (deuda de No-Duplicidad; AGENTS.md seccion 2.1).
- **Contexto:** ADR-040 creo la fuente unica `niveles-data.js` y la cableo SOLO en `mi-perfil.html`; `index.html` y `comunidad.html` conservan su copia local (swap futuro de 1 linea: `var XP_LEVELS = NivelesData.XP_LEVELS;`) y `usuario-session.js` no se toco en v1.
- **Recomendacion:** completar el swap cuando se toque cualquiera de esas 3 superficies; no crear una quinta copia.
- **Estado:** DEUDA DOCUMENTADA (ADR-040 / TSK-115, 2026-09-18). No bloqueante.

### Nota: BUG-061 y BUG-002 siguen ABIERTOS
- **BUG-061** (`POST tipo='foto'` sin `validarSesion`) y **BUG-002** (doble escape en `api/pagina-destino.js` L2431) siguen ABIERTOS y NO fueron empeorados por TSK-114..117; la rama nueva `museo_recurso` SI exige sesion, por lo que no repite ese vector.
- **Estado:** SIN CAMBIO (registro de no-regresion, 2026-09-18).

---

## Deuda TSK-118 / ADR-041 (2026-09-18) -- NO son bugs confirmados

**Nota:** esta sesion ("Comunicacion oficial + Casas + Admin Mapa") y su auditoria QA posterior se registran aqui. La implementacion original no abrio bugs; la auditoria detecto el IDOR de `casa_tributo_config`, que quedo como **BUG-064 (CERRADO en v23)**. Se conservan ademas sus pendientes y observaciones de gobernanza para que ninguna IA las asuma resueltas (ADR-006). Se conservan por Regla de Oro 3 (Cero Borrado Logico).

### D-6: misiones conjuntas de Casa sin diferenciacion -- la 026 siembra la MISMA mision base para las 3 Casas
- **Severidad:** BAJA (deuda de contenido/diseno; no bloquea el flujo).
- **Contexto:** `db/migrations/026_casas_comunicaciones.sql` siembra 1 mision base por Casa ("Primera Expedicion de Casa": `visitas` 10, 500 XP) con un `VALUES ('condor'),('jaguar'),('delfin')`; el contenido es identico para las 3.
- **Recomendacion:** una tarea de producto defina misiones diferenciadas por Casa; el modelo `casa_misiones` ya lo soporta sin cambio de esquema.
- **Estado:** DEUDA DOCUMENTADA (TSK-118 / ADR-041, 2026-09-18). No bloqueante.

### D-7: `casa_roles` solo puebla el rol `lider`
- **Severidad:** BAJA (deuda de producto; el CHECK admite mas roles de los que se usan).
- **Contexto:** la 026 crea `casa_roles` con `rol IN lider|oficial|mariscal|miembro`, pero el backfill/refresco solo asigna/degrada `lider`/`oficial`. `mariscal` y `miembro` no tienen flujo de asignacion en v1.
- **Recomendacion:** definir el flujo de asignacion (admin o lider) en una tarea futura; no crear columnas nuevas.
- **Estado:** DEUDA DOCUMENTADA (TSK-118 / ADR-041, 2026-09-18). No bloqueante.

### D-8: `api/interacciones.js` conserva la linea-titulo v22 aunque su changelog ya entro a v23
- **Severidad:** BAJA (drift documental; ADR-006).
- **Contexto:** la sesion TSK-118 agrega ramas y helpers reales sobre `api/interacciones.js`. Tras el hotfix post-QA, el changelog incorporo la entrada **v23** en L18 (`canal oficial es_oficial con degradacion 42703; authz de casa_tributo_config via validarSesion; fix IDOR lider`), pero la linea-titulo L1 aun rotula `v22` (release compartido ADR-039/ADR-040).
- **Recomendacion:** bumpear la linea-titulo L1 a v23 en la proxima edicion del archivo (cambio de 1 linea, sin efecto funcional) para que el encabezado y el changelog coincidan.
- **Estado:** DEUDA DOCUMENTAL MENOR (TSK-118 / ADR-041, post-hotfix 2026-09-18). No bloqueante.

### D-9: circulo de rango del admin sin validacion en produccion
- **Severidad:** BAJA (funcionalidad nueva no verificada en vivo).
- **Contexto:** `admin.html` `adm_actualizarCirculoRango` (`L.circle`) y `map-picker.js` `getPickerMap()` no se han probado contra el deploy real ni en movil.
- **Recomendacion:** verificar con un `destino.radio_m` real tras el deploy (parte del checklist de TSK-118).
- **Estado:** DEUDA DOCUMENTADA (TSK-118 / ADR-041, 2026-09-18). No bloqueante.

### J-1: `GET chat_salas` / `POST chat_msg` sin degradacion si la 026 no esta aplicada (MITIGADO)
- **Severidad:** MEDIA si la 026 no se aplica (el canal oficial y el chat se rompian con `42703`).
- **Contexto:** con la 026 pendiente en Neon, `chat_salas.es_oficial` no existe y la consulta fallaba, tumbando el listado de salas y el envio de mensajes; ademas `chat_msg` tenia una captura silenciosa del error de lookup (AGENTS.md 2.2).
- **Resolucion (hotfix J-1, `api/interacciones.js` v23):** `chat_salas` y `chat_msg` reintentan la MISMA consulta con `false AS es_oficial` ante `42703` (L3537-3539 y L5724-5729); en `chat_msg` el fallo no-42703 se registra con `console.error` y se re-lanza. Queda neutralizado el riesgo de caida por esquema ausente.
- **Estado:** MITIGADO (2026-09-18, v23). **Aplicar 024 -> 025 -> 026 ANTES del deploy SIGUE siendo obligatorio** (la degradacion evita la caida, no sustituye la migracion).

### J-3: amplificacion de escritura en `GET casa_ranking` publico (MITIGADO con throttle por instancia)
- **Severidad:** MEDIA (un GET publico disparaba 3 escrituras por peticion: `UPDATE casas_cofre` + upsert/degradacion en `casa_roles`).
- **Contexto:** el refresco best-effort del lider (ADR-041 decision d) corria en CADA lectura del ranking, sin limite.
- **Resolucion (hotfix J-3, `api/usuarios.js` v18):** el refresco se ejecuta como maximo una vez cada 60 s por instancia (cache de proceso `CR_LIDER_REFRESH_MS`); las lecturas del ranking no se alteran.
- **Limitacion:** la cache es por instancia, no distribuida; con N instancias serverless hay hasta N refrescos/min. Es una mitigacion de costo, no una eliminacion del patron.
- **Estado:** MITIGADO (2026-09-18, v18). No bloqueante; considerar cache distribuida/scheduler en una tarea futura.

### Nota: decision h de ADR-041 corrige 2 capturas silenciosas (mejora, no bug)
- La sesion TSK-118 agrega `console.error` a la busqueda de email admin en `chat_msg` y al lookup de `lider_user_id` en `casa_tributo_config`, que de otro modo habrian quedado como capturas vacias (AGENTS.md seccion 2.2). No se registra como bug porque fueron introducidas y corregidas dentro de la misma sesion, antes de cualquier cierre.
- **BUG-064 (NUEVO, CERRADO):** la auditoria QA posterior detecto el IDOR de `casa_tributo_config`; se registro y corrigio en el hotfix J-2 (ver BUG-064).
- **BUG-061 sigue ABIERTO y AMPLIFICADO:** los hooks `avanzarMisionesCasa` (foto/resena/visita) escriben progreso de Casa a nombre del `usuario_id` recibido, ampliando el mismo vector de suplantacion (ver la nota de amplificacion en BUG-061). **BUG-002 y BUG-062 siguen ABIERTOS** y ajenos.
- **Estado:** HOTFIX APLICADO (2026-09-18).

---

## Deuda TSK-123 / ADR-044 (2026-09-18) -- NO son bugs confirmados

**Nota:** la correccion "Comunidad > Audiovisual" (TSK-123 / ADR-044) se registro aqui para que ninguna IA asuma resueltos sus pendientes (ADR-006). Abrio y cerro **BUG-067** (append invertido) y amplifico **BUG-061** (nota ya insertada). Se conservan por Regla de Oro 3 (Cero Borrado Logico).

### D-10: `MediaActions` guarda las `opts` a nivel de modulo (el ultimo `bind` gana)
- **Severidad:** BAJA (diseno del modulo; hoy inocuo).
- **Contexto:** `media-actions.js` almacena `OPT = {toast, pedirLogin}` en el cierre del modulo; `bind(root, opts)` la sobreescribe globalmente. `comunidad.html` pasa las MISMAS opts a 2 roots (feed y modal), por lo que no hay conflicto; `galeria.html` pasa las suyas.
- **Riesgo:** si el modulo se reutiliza en una pagina con dos raices que necesiten toasts/logins distintos, el ultimo `bind` gobernara ambos.
- **Recomendacion:** encapsular las opts por-root (mapa debil `WeakMap` o guardarlas en el nodo `root`) cuando aparezca un tercer consumidor con opts distintas.
- **Estado:** DEUDA DOCUMENTADA (TSK-123 / ADR-044, 2026-09-18). No bloqueante.

### D-11: lectura por `usuario_id` en `mi_feed_fotos`/`album_detalle` permite enumerar booleanos de un tercero
- **Severidad:** BAJA (seguridad: enumeracion de baja severidad, sin exposicion de PII).
- **Contexto:** ambos GET aceptan `usuario_id` opcional SIN exigir sesion y devuelven `ya_votado`/`ya_guardado`/`es_propia`; con un `usuario_id` conocido se puede inferir en que fotos publicas voto/guardo.
- **Recomendacion:** cuando se aborde el endurecimiento (junto con BUG-061), derivar el `usuario_id` de `validarSesion`/Bearer en vez de aceptarlo por query, o aceptarlo solo para el propio usuario autenticado.
- **Estado:** DEUDA DOCUMENTADA (TSK-123 / ADR-044, 2026-09-18). No bloqueante.

### D-12: el boton de comentarios del feed no muestra contador inicial
- **Severidad:** BAJA (cosmetica/consistencia).
- **Contexto:** `feedCardAV` (`comunidad.html` L2157-2158) inyecta el boton de comentarios sin `data-ac-btn-count`, por lo que el contador solo aparece tras abrir/cerrar el hilo; el modal de album si lo usa.
- **Recomendacion:** pasar `data-ac-btn-count="<n comentarios>"` (el backend `mi_feed_fotos` ya devuelve `comentarios` por fila).
- **Estado:** DEUDA DOCUMENTADA (TSK-123, 2026-09-18). No bloqueante.

### D-13: `index.html` conserva su implementacion inline de `media_voto`
- **Severidad:** BAJA (deuda de No-Duplicidad; AGENTS.md 2.1).
- **Contexto:** `index.html` mantiene su propio `votarMediaMapa`/`POST media_voto`; no se migro a `media-actions.js` en TSK-123 para no ampliar el alcance sobre un archivo de 523 divs con otro lote en vuelo.
- **Recomendacion:** migrarlo cuando se toque la capa de media del mapa; no crear una nueva copia.
- **Estado:** DEUDA DOCUMENTADA (TSK-123 / ADR-044, 2026-09-18). No bloqueante.

### D-14: el smoke 41/41 de `media-actions.js` no esta versionado
- **Severidad:** BAJA (deuda QA: la evidencia no es reproducible).
- **Contexto:** la verificacion de TSK-123 reporta un smoke Node vm de `media-actions.js` 41/41 PASS que no existe en `scripts/` (verificado por ADR-006: no hay script con `MediaActions`/`media-actions`).
- **Recomendacion:** versionar `scripts/smoke_media_actions.js` o mover esos checks a un smoke existente para que el Escudo GOLD los ejecute de forma reproducible.
- **Estado:** DEUDA QA DOCUMENTADA (TSK-123, 2026-09-18). No bloqueante.

### Nota: BUG-065, BUG-061 y BUG-002 siguen ABIERTOS
- **BUG-065** (`album_agregar_foto` inserta sin `visible`) sigue ABIERTO y afecta directamente que la media aparezca en el feed de Comunidad > Audiovisual: el lector `mi_feed_fotos` filtra `af.visible=true` (ADR-039), por lo que una foto subida por la via legacy no se ve aunque la mision la cuente.
- **BUG-061** (spoofing de `usuario_id` sin sesion) sigue ABIERTO y quedo AMPLIFICADO por los nuevos botones Guardar (nota en su ficha).
- **BUG-002** (doble escape en `api/pagina-destino.js` L2431) y **BUG-062** siguen ABIERTOS y ajenos.
- **Estado:** SIN CAMBIO (registro de no-regresion, 2026-09-18). **Addendum 2026-09-21 (TSK-148 / ADR-053): BUG-002 quedo CERRADO** (backticks 0 y doble escape 0 en `api/pagina-destino.js`; ver su entrada). BUG-061 y BUG-065 siguen ABIERTOS.

### Nota de prevencion (TSK-145 / migracion 028, 2026-09-20) -- NO es un bug: CHECK que rechaza `''` en INSERTs legacy
- **Contexto:** al agregar la columna `destinos.zona` con la CHECK `destinos_zona_chk` (migracion 028, permite NULL o los 5 valores cerrados), el INSERT inicial de `api/admin-destinos.js` enviaba `zona:''` (string vacio) cuando el `<select id="f-zona">` del admin quedaba sin opcion -> la CHECK rechazaba `''` (no es NULL) -> 500 en el pipeline de los 103 `scripts/load-*-api.js`. QA lo detecto y se corregio ANTES del deploy: el backend normaliza a NULL `(b.zona ? String(b.zona).trim() : null)` (api/admin-destinos.js L187). **No se registra como BUG porque se corrigio pre-deploy.**
- **Leccion/prevencion (patron BUG-021/BUG-060):** una CHECK nueva que permite NULL NO acepta la cadena vacia `''`; cualquier INSERT/UPDATE legacy que envie strings vacios para columnas nuevas viola la constraint y revienta con 500. Regla: normalizar `''` -> NULL en el backend (o en el UPDATE fieldMap) cada vez que una columna nueva nullable llegue desde formularios con `<select>`/inputs vacios.
- **Estado:** PREVENCION REGISTRADA (TSK-145 / migracion 028, 2026-09-20). Sin bug abierto.

## BUG-080: pines de media del mapa cultural congelados -- el motor no re-renderizaba la capa de media al mover el mapa y el atajo "Todo" no activaba los tipos

**Severidad:** MEDIA-ALTA (la media de usuarios no se pintaba en el mapa de `index.html` aunque el backend SI la devolvia; el usuario la reportaba como perdida).
**Contexto:** reporte directo del operador (2026-09-21): los videos de viajero de la cuenta `gonzalezjavierbta@gmail.com` no aparecian como pines en `index.html` ni volvian a aparecer al navegar hacia su ubicacion. El backend devolvia la media correctamente (ver Evidencia). **NO es un bug de backend.**
**Sintoma:** los pines de media (foto/video/audio de usuarios) no se pintaban en la capa del mapa cultural del index; al hacer pan/zoom seguian sin aparecer aunque el viewport ya cubriera su ubicacion.
**Causa raiz (doble, frontend):**
  1. **Capa de media congelada al mover el mapa:** `mapa-cultural.js` `onMoved()` (L663-666, enganchado a `moveend` en L1665) solo re-ejecutaba `recluster()` (pines de lugares). `renderMedia()` (L1024-1061) filtra por `st.map.getBounds()` y solo se recalculaba desde `setMediaEnabled`/`setMediaTypes`/`setMediaItems`/`refresh`; tras pan/zoom los pines de media quedaban con el viewport inicial y se descartaban en silencio por la condicion `if (!bounds.contains([lat, lng])) return;` (L1040).
  2. **El atajo "Todo" no activaba los tipos de media:** en `filterPins()` el atajo de "Todo" (L941-950) encendia `st.mediaEnabled` y llamaba `renderMedia()`, pero dejaba `st.mediaTypes` en false; `renderMedia` descarta entonces todo item con `if (!esAlbumDestino && !st.mediaTypes[item.media_type]) return;` (L1039). `mediaTypes` solo se rellenaba en `setMediaEnabled` (L1086-1090, via `mediaTiposActivos() === 0`).
**Resolucion aplicada (working tree, 2026-09-21, SIN commitear):**
  1. **`mapa-cultural.js`:** `onMoved()` ahora hace `setTimeout(function () { recluster(); renderMedia(); }, 150)` (L663-666), de modo que la capa de media se recalcula con el viewport actual en cada `moveend`.
  2. **`mapa-cultural.js`:** el atajo "Todo" de `filterPins()` delega en `setMediaEnabled(true)` cuando `!st.mediaEnabled || mediaTiposActivos() === 0` (rellena los 3 tipos foto/video/audio) y, en caso contrario, llama `renderMedia()` (L947-950).
  3. **Cache-bust:** `mapa-cultural.js?v=6` -> `?v=7` en `index.html` (L883) y `comunidad.html` (L566).
**Hallazgo operativo (video "rastro mc-trampas" reportado como subido y NO existente en la BD):** busqueda `ILIKE '%rastro%'` en `album_fotos`, `destinos_fotos` e `interacciones` = **0 filas**. Los 5 videos reales de la cuenta son: "Los piratas de ramirez" (`activo=true`, `visible=true`, album Mi Museo, 2026-09-21), "Xxl" (`true/true`, Mi Museo, 2026-09-19), "Casa de carton" (`activo=false`, `visible=true`, Mi Museo, 2026-09-18), "Skyzo en la 26" (`true/true`, Mi Museo, 2026-09-18) y un "Skyzo en la 26" duplicado (`activo=false`, album "Bogota, capital" inactivo, 2026-09-18). El album "Mi Museo" esta activo con coords lat=4.584784 / lng=-74.075065 (Bogota). Presion del LIMIT del mapa: 5 filas de album y 1147 de destinos (muy por debajo de 300/600): **NO hay starvation** (descarta la hipotesis BUG-069 para este caso).
**Herramientas nuevas de diagnostico (read-only; working tree, SIN commitear):** `scripts/neon_select.js` (ejecuta SELECT/WITH contra Neon y rechaza cualquier escritura), `scripts/load_env_local.js` (carga la credencial de conexion a Neon desde `.env.local`, ignorado por git; el valor NUNCA se documenta -- politica de secretos) y `db/queries/q1_rastro_video.sql` .. `q4_rastro_busca_global.sql` (consultas de diagnostico).
**Evidencia (ADR-006):** `mapa-cultural.js` L663-666 (`onMoved`) y L941-950 (atajo "Todo"); `renderMedia` L1024-1061; `setMediaEnabled` L1084-1094; `mediaTiposActivos` L1016-1022; `moveend` L1665; `index.html` L883 y `comunidad.html` L566 (ambos `?v=7`, verificado en el archivo real HOY). Endpoint productivo `https://exploraco.vercel.app/api/interacciones?tipo=multimedia_mapa` DEVOLVIA los 3 videos vigentes. `node --check mapa-cultural.js` OK; ASCII 0 bytes >127; divs balanceados (index 370/370, comunidad 320/320); `scripts/smoke_mapa_cultural.js` OK.
**Prevencion:** todo handler de `moveend`/`zoomend` que afecte capas filtradas por `map.getBounds()` debe re-renderizar esa capa (no solo el clustering); y todo atajo de filtro que encienda una capa debe rellenar tambien su sub-estado de tipos (aqui `st.mediaTypes`), o el filtro la descarta en silencio.
**Estado:** CORREGIDO EN CODIGO (2026-09-21, working tree SIN commitear). **PENDIENTE: deploy (commit/push + Vercel) para que el cache v7 llegue a produccion, y ampliar `scripts/smoke_mapa_cultural.js` con casos de regresion (moveend re-renderiza media; "Todo" rellena tipos).** Ver TASKS.md TSK-146.

## BUG-081: fuga de media privada en el mapa cultural -- `multimedia_mapa` con `scope=mio` sin sesion devolvia los recursos privados de TODOS los usuarios

**Severidad:** ALTA/CRITICA (fuga de datos: media privada de terceros expuesta por la capa publica del mapa cuando se pedia `scope=mio` sin autenticar).
**Contexto:** detectado y corregido en la sesion del 2026-09-21, en el mismo release que ADR-051/ADR-052 (`api/interacciones.js` **v24**). La rama `?tipo=multimedia_mapa` con `scope=mio` habia nacido en v17/ADR-031 (toggle "Solo mio" del dueno) y su clausula de visibilidad se habia relajado sin exigir autenticacion. Cierre documental de la sesion; `api/interacciones.js` v24 impacta produccion al desplegarse.
**Sintoma:** al llamar `GET /api/interacciones?tipo=multimedia_mapa&scope=mio` **sin `Authorization: Bearer`** (o con un `usuario_id` arbitrario), el endpoint devolvia la capa de album SIN el filtro `af.visible = true`, es decir, exponia los recursos **privados** (`visible=false`) de todos los usuarios; ademas no exigia sesion, de modo que cualquiera podia leerlos. En la capa con sesion del dueno, el `usuario_id` del query era confiable sin verificarse.
**Causa raiz:** en `api/interacciones.js` la clausula de visibilidad de la rama album del UNION era `(mmScopeMio ? '' : ' AND af.visible = true')` y `mmScopeMio` se derivaba directamente del query param `scope` SIN autenticar la peticion. Con `scope=mio` y sin `usuario_id` no se aplicaba ni el filtro de visibilidad ni el de dueno, de modo que la consulta devolvia `album_fotos` de todos (incluidos los privados). No habia `validarSesion` en la rama, asi que el uuid del supuesto dueno nunca se contrastaba contra una sesion firmada.
**Resolucion aplicada (working tree, SIN commitear; `api/interacciones.js` v24):**
  1. **Auth obligatoria para `scope=mio`:** `mmScopeMio = (query.scope === 'mio')` ahora exige sesion firmada; si no hay `Bearer` valido responde `400 SESION_REQUERIDA` (L4761-4775). El `uuid` del dueno se **deriva del token** (`verificarSesion`) y el query param `usuario_id` se IGNORA cuando el scope es `mio`.
  2. **Clausula de visibilidad corregida:** `(mmScopeMio && mmUsuarioId ? '' : ' AND af.visible = true')` (L4824). La supresion de `af.visible` SOLO ocurre con dueno autenticado (`mmScopeMio` ya implica sesion valida); jamas sin `mmUsuarioId`. Asi la rama publica sigue filtrando `visible=true` y la privada solo muestra lo propio.
**Evidencia (ADR-006):** `api/interacciones.js` v24: header L1-7 (H-1/H-2); `mmScopeMio` L4761; `mmUsuarioId` L4767-4775; parametro de dueno L4800; clausula corregida L4821-4824. `index-api-connector.js` L358-361 manda `scope=mio&usuario_id` + `Authorization: Bearer`; `mymapa.js` L247-257 marca `_propia` desde el fetch autenticado.
**Prevencion:** toda rama que lea datos de un usuario debe exigir sesion firmada y derivar el uuid del token, NUNCA de un query/body (patron BUG-061); y toda supresion de un filtro de visibilidad debe condicionarse a un dueno AUTENTICADO, no a la mera presencia de un query param. Vale para `multimedia_mapa` y para cualquier lector con `scope=mio`.
**Estado:** CORREGIDO EN CODIGO (2026-09-21, working tree SIN commitear). **PENDIENTE: deploy (commit/push + Vercel) del backend v24 para que el fix llegue a produccion.** Ver TASKS.md TSK-147 y DECISIONS.md ADR-051/ADR-052 (mismo release).

## BUG-082: fuga de privacidad en la ficha -- `api/pagina-destino.js` consultaba fotos de album por cercania SIN `af.visible = true`

**Severidad:** ALTA (fuga de privacidad: recursos de album privados (`album_fotos.visible = false`) se renderizaban en la ficha publica de un destino por cercania geografica).
**Contexto:** detectado por la revision de `@architect-review` del ADR-054 (2026-09-21) contra el archivo real (ADR-006); quedo como pendiente obligatorio P1 del ADR y se corrigio en el MISMO release `api/interacciones.js` **v26** / ADR-054. Viola la regla D.1 de ADR-039 (visibilidad POR RECURSO: todo lector publico filtra `af.visible = true`).
**Sintoma:** la ficha de un destino mostraba fotos de album de usuarios que el autor habia dejado privadas (`album_fotos.visible = false`), siempre que la media cayera en el radio de cercania del destino.
**Causa raiz:** en `api/pagina-destino.js` la consulta "de album por cercania" filtraba `af.activo=true AND a.activo=true` y ademas `a.lat IS NOT NULL AND a.lng IS NOT NULL` + `ABS(...) < 0.01`, pero OMITIA `af.visible=true`. Como el filtro de visibilidad por recurso de ADR-039 (migracion 025) es `af.visible`, esa rama era la unica superficie publica de la ficha que no lo aplicaba.
**Resolucion aplicada (working tree, 2026-09-21; mismo release que ADR-054):**
   1. **`api/pagina-destino.js`:** el `WHERE` de la consulta de fotos de album por cercania agrega `AND af.visible=true` (hoy L2762). Con eso la ficha solo renderiza recursos publicos.
**Evidencia (ADR-006):** `api/pagina-destino.js` L2762: `WHERE af.activo=true AND af.visible=true AND a.activo=true AND a.lat IS NOT NULL AND a.lng IS NOT NULL` (verificado en el archivo real HOY). `npm test` incluye el check **C13** de `scripts/smoke_032_guardados_album.js` ("api/pagina-destino.js conserva af.visible = true (BUG-082)") en VERDE.
**Prevencion:** todo lector publico de `album_fotos` debe filtrar `af.visible=true` (ADR-039 D.1); al agregar ramas nuevas de lectura por cercania o subqueries de votos/conteos, revisar la lista de filtros contra la migracion 025. Vale para `api/pagina-destino.js` y para cualquier lector polimorfico de media.
**Estado:** CORREGIDO Y DESPLEGADO en `b4ad861` (2026-09-21); pendiente: QA runtime en produccion. Ver TASKS.md TSK-149 y DECISIONS.md ADR-054 (mismo release).

## Errata corregida (TSK-148 / ADR-053, 2026-09-21) -- titulo 11 `Estrat\u00e9ga` -> `Estratega Comunitario` -- NO es un bug de runtime

**Contexto:** el ADR-053 (R-10) habia declarado la tilde mal ubicada del titulo 11 (`Estrat\u00e9ga Comunitario`, con la tilde sobre la "a" equivocada) como deuda FUERA de alcance, porque corregirla arrastra los 7+ espejos. En la implementacion de la Gamificacion v6 (TSK-148) se corrigio de forma explicita en la fuente y se sincronizaron los espejos.
**Correccion:** `api/usuarios.js` (fuente servidor `NIVELES`, L31/L44) pasa el titulo 11 a **`Estratega Comunitario`**. **Arrastre de espejos (todos corregidos):** `api/interacciones.js` (`BADGES_LOCAL`, hoy `'Estratega Comunitario'`), `admin.html` (`_jugNiveles`), `usuario-session.js` (`XP_LEVELS`), `index.html` (L2986), `comunidad.html` (L595), `niveles-data.js` (L15/L29) y `api/admin.js` (`NIVEL_DERIVADO_SQL`). El smoke `scripts/smoke_niveles_espejos.js` valida ademas los 20 titulos (`BADGES_LOCAL` y `niveles-data.js`) contra la fuente.
**Evidencia (ADR-006, 2026-09-21):** `grep` de `Estrat` en los 8 archivos: la fuente `api/usuarios.js` ya dice `Estratega Comunitario`; cero ocurrencias de `Estrat\u00e9ga` en los espejos (verificado por `smoke_niveles_espejos.js` 10/10 PASS). `api/usuarios.js` quedo COMMITEADO en `9efbfc7`; los espejos cliente/admin quedan en working tree (deploy pendiente).
**Estado:** CORREGIDO (2026-09-21). No se registra como BUG de runtime: era una errata de texto del catalogo de titulos, no una falla funcional. Se conserva por Cero Borrado Logico (Regla de Oro 3) como registro de la correccion.

## BUG-083: cabecera de la migracion 034 prometia una seccion "4-bis" de auto-provision que no existia en el cuerpo (el artefacto se contradecia)

**Severidad:** MEDIA (defecto de consistencia documental/codigo: la cabecera describia una seccion inexistente; el cuerpo declaraba `precio_xp_base` NOT NULL en la semilla sin la auto-provision prometida, por lo que en un entorno SIN la 027 el INSERT fallaria con 42703 en lugar de ser autocontenido).
**Contexto:** hallazgo **B-1 del QA** durante la implementacion del Mercado de Emprendedores (TSK-151 / ADR-055, 2026-09-23). La migracion 034 se redacto con una cabecera que prometia "AUTO-PROVISION de las 3 columnas de consumibles ... Ver seccion 4-bis" y listaba "4-bis" en el ORDEN DE LAS SENTENCIAS, pero el cuerpo del archivo NO incluia esa seccion: saltaba de la seccion 4 (`mercado_ventas`) a la 5 (semilla de producibles). El artefacto se contradecia a si mismo.
**Sintoma:** al auditar el archivo contra su propia cabecera (ADR-006), la seccion 4-bis no existia; la semilla de la seccion 5 insertaba `precio_xp_base` (NOT NULL por la 027) sin la auto-provision prometida, de modo que en un entorno SIN la 027 el archivo fallaria con `42703` (columna inexistente).
**Causa raiz:** el cuerpo de la migracion se escribio por secciones y la 4-bis quedo solo en la cabecera (indice/descripcion) sin materializarse; no hubo una verificacion que comparara la cabecera con el cuerpo antes de cerrar el artefacto.
**Resolucion aplicada (working tree, 2026-09-23):**
  1. Se agrego la **seccion 4-bis real** (`ALTER TABLE consumibles ADD COLUMN IF NOT EXISTS precio_xp_base NUMERIC(12,2) NOT NULL DEFAULT 0, ADD COLUMN IF NOT EXISTS precio_xp_actual NUMERIC(12,2), ADD COLUMN IF NOT EXISTS tipo_canje TEXT;`), idempotente y NO-OP si la 027 ya corrio (estado actual de Neon, 2026-09-23).
  2. El smoke `scripts/smoke_mercado.js` fija el hallazgo con el check **C6** ("034 auto-provisiona las 3 columnas de consumibles (seccion 4-bis)") en VERDE.
**Evidencia (ADR-006):** `db/migrations/034_mercado_emprendedores.sql` L263-282 (seccion "4-bis. CONSUMIBLES: AUTO-PROVISION..." con el `ALTER TABLE consumibles ADD COLUMN IF NOT EXISTS`); cabecera L32-34 y L62 (indice) coherentes con el cuerpo HOY; `scripts/smoke_mercado.js` check C6 PASS.
**Prevencion:** un archivo de migracion debe ser CONSISTENTE con su propia cabecera: todo bloque listado en el indice/orden de sentencias debe existir en el cuerpo, y toda columna que el cuerpo asuma (`NOT NULL` de otra migracion) debe quedar auto-provisionada de forma idempotente o declarada como dependencia. Verificar cabecera <-> cuerpo antes de cerrar el artefacto (ADR-006).
**Estado:** CERRADO (2026-09-23). La seccion 4-bis real esta en el archivo y el smoke la fija. Ver TASKS.md TSK-151 y DECISIONS.md ADR-055.

## BUG-084: fallback de avatar con `AS` duplicado en `museo_publico` -- `avatar_url AS foto_url AS foto_url` (SQLSTATE 42601) devolvia 500 incluso para UUID inexistentes

**Severidad:** ALTA (el Museo publico `perfil.html?id=<uuid>` no abria: el endpoint respondia HTTP 500; y respondia 500 en vez del 404 correcto para UUID inexistentes).
**Contexto:** sintoma reportado por el usuario: `perfil.html?id=<uuid>` (Museo de viajero) no abria y el frontend mostraba `pfError` ("No se pudo abrir el museo"). Es la VARIANTE de BUG-060: como la migracion 004 seguia sin aplicarse (BUG-060 ABIERTO), el fallback `queryConAvatarFallback` SI se activaba por `42703`, y al activarse introducia un error de PARSEO propio. Detectado y corregido el 2026-09-23; en la misma sesion se aplico la migracion 004 (ver la "Nota de cierre" de BUG-060). BUG de CODIGO, independiente de la causa de datos de BUG-060.
**Sintoma:** `GET /api/interacciones?tipo=museo_publico&id=<uuid>` respondia **HTTP 500**; y con un UUID inexistente respondia **500** en vez del **404** correcto (el error era de parseo del SQL, anterior a la busqueda de la fila, por lo que no dependia de que el usuario existiera).
**Causa raiz:** en `api/interacciones.js` la rama `tipo=museo_publico` llamaba a `queryConAvatarFallback(sql, plantilla, params, ['foto_url', 'avatar_url AS foto_url'])`. El helper (`api/interacciones.js` L3106) reemplaza en la plantilla el token `__FOTO_URL__` por `par[0]` en el intento normal y por `par[1]` en el reintento ante `42703`. La plantilla YA incluia `__FOTO_URL__ AS foto_url`, de modo que el reintento producia `avatar_url AS foto_url AS foto_url`, SQL invalido que Postgres rechaza con **SQLSTATE 42601** ("syntax error at or near AS"), convertido en **HTTP 500**. El resto de los call sites usaba el reemplazo por defecto (sin `AS`), por lo que el defecto era exclusivo de esta rama.
**Resolucion aplicada (commit `1302f7c`, pusheado a `origin/main`; rango `016d0b3..1302f7c`):**
   1. **Codigo (`api/interacciones.js`, rama `museo_publico`):** el reemplazo paso de `['foto_url', 'avatar_url AS foto_url']` a `['foto_url', 'avatar_url']` (hoy L4312), con comentario explicativo (hoy L4298-4304). El reintento genera ahora `avatar_url AS foto_url` (correcto). NO se toco ningun otro archivo ni rama; los otros call sites ya usaban el reemplazo por defecto sin `AS`.
   2. **Datos (misma sesion):** se aplico `db/migrations/004_usuarios_blog_autor.sql` en Neon con `node scripts/apply_004_foto_url.js` (idempotente), cerrando la causa raiz de BUG-060; con `usuarios.foto_url` presente el fallback ya no se activa por `42703` (se conserva como defensa ante entornos sin migrar).
**Evidencia (ADR-006):**
   - Codigo: `git show 1302f7c` = `api/interacciones.js` +5/-2 (2 hunks: comentario + reemplazo); `node --check api/interacciones.js` OK; ASCII bytes>127 = 0 (delta 0 vs HEAD); `git diff -U0` = 2 hunks, cero cambios colaterales. Auditoria: **GOLD PASS**.
   - Barrido: los **9 call sites** de `queryConAvatarFallback` auditados; NINGUN otro tiene el `AS` duplicado (los demas usan el reemplazo por defecto sin `AS`).
   - En vivo (produccion `https://exploraco.vercel.app`, 2026-09-23): `GET /api/interacciones?tipo=museo_publico&id=3b78efad-e9f6-49a7-bbd1-af836f528348` -> **HTTP 200** con payload completo (usuario, vitrina, logros, cromos, albumes, mapa, arbol, parche, stats); antes 500. `GET ...&id=<uuid inexistente>` -> **HTTP 404**; antes 500. `GET ?tipo=museo_recurso&usuario_id=...` -> 200 y `GET ?tipo=mis_fotos&usuario_id=...` -> 200 (ya funcionaban).
   - Smoke: `scripts/smoke_017_perfil_arbol_casas.js` = **67/73 PASS**, IDENTICO al baseline en HEAD (mismos 6 fallos preexistentes: B5, C1a, C1b, C1c, C2a, C2b, por el gate DM nivel<3 y el calculo nivel/badge/era); cero regresiones nuevas.
**Prevencion:** el reemplazo que se pasa a `queryConAvatarFallback` debe aportar SOLO la expresion de la columna (sin alias), porque la plantilla ya aporta el `AS <alias>`; incluir `AS` en el reemplazo duplica el alias. Regla general: al sustituir por token en una plantilla SQL, NO incluir el alias/`AS` en el valor de reemplazo, y revisar los call sites cuando se agregue una plantilla nueva con token.
**Estado:** CERRADO (2026-09-23). Commit `1302f7c` desplegado por push a `origin/main` (Vercel despliega al push) y verificacion en vivo 200/404 confirmada. BUG-060 (causa raiz de datos) tambien CERRADO en la misma sesion. Ver TASKS.md TSK-154.

## BUG-085 / BUG-CONFIG-1: R3 no aplicado -- T5 borro las entradas `webfetch:`/`websearch:` del frontmatter en vez de ponerlas en `deny`

**Severidad:** ALTA (gobernanza/seguridad de coste: un subagente de ejecucion pudo salir a la web pese a la regla R3, gastando cuota y rompiendo el aislamiento de la capa).
**Contexto:** detectado en la tanda de coste ADR-067 (T5/T6/T7, 2026-09-28). R3 del ADR-067 manda que la investigacion web NO la hagan los subagentes (solo Google Gemini). T5, al normalizar el frontmatter de los agentes, ELIMINO las lineas `webfetch:`/`websearch:` en vez de fijarlas en `deny`; el resultado real fue una regresion de permisos.
**Problema:** tras la tanda T5, un subagente (`exp-pickle`) pudo invocar `webfetch`/`websearch` con exito, pese a la intencion de R3 y al `deny` global declarado en `opencode.json`.
**Causa raiz:** T5 elimino las entradas `webfetch:`/`websearch:` del frontmatter en vez de ponerlas en `deny`. En el modelo de permisos de opencode, la AUSENCIA de regla equivale a PERMITIDO por defecto; borrar la linea no deniega nada. El `deny` global de `opencode.json` NO basto para cubrir el caso medido en la sesion viva (ver BUG-086: la config se carga al iniciar).
**Blindaje:** `webfetch: deny` + `websearch: deny` EXPLICITOS en 18 de los 19 agentes; solo `research-agent-free` los conserva en `allow` (es el unico agente autorizado a web por diseno). Se mantiene ademas el `deny` global en `opencode.json` como defensa en profundidad.
**Verificacion:** `git grep -n "webfetch: allow" -- .opencode/agent/` -> solo `research-agent-free.md`; `git grep -c "webfetch: deny" -- .opencode/agent/` -> 18. Correrlos tras cualquier cambio de frontmatter.
**Estado:** CERRADO el blindaje estatico (2026-09-28); la verificacion en RUNTIME queda PENDIENTE (BUG-086 / TASKS.md TSK-157). Ver DECISIONS.md ADR-067.

## BUG-086 / BUG-CONFIG-2: la config de agentes/permisos se carga al INICIAR la sesion de opencode

**Severidad:** MEDIA (falso veredicto de QA: una prueba de runtime puede no reflejar el estado final del disco).
**Contexto:** detectado en la misma tanda ADR-067 (T7, 2026-09-28) al intentar probar R3 en la sesion en curso.
**Problema:** los cambios de `permission`/agentes NO surten efecto en la sesion en curso; la prueba de runtime de T7 no refleja el estado final del disco (la sesion habia arrancado con la config previa).
**Causa raiz:** opencode carga agentes y permisos al ARRANCAR la sesion; los cambios en `.opencode/agent/**` y `opencode.json` no se aplican a la sesion viva. Por eso una prueba de `webfetch` dentro de la misma sesion en que se edito la config es invalida como evidencia.
**Blindaje:** tras cambiar agentes/permisos hay que REINICIAR opencode antes de validar; documentado en `docs/orquestacion/REFERENCIA-RUTEO.md`.
**Verificacion (PENDIENTE):** reiniciar opencode y lanzar un subagente (p.ej. `js-silo-dev-free`) que intente `webfetch` -> debe ser denegado. Registrado como pendiente en TASKS.md TSK-157.
**Estado:** ABIERTO como verificacion (2026-09-28); no es un defecto del codigo sino una restriccion del runtime. Ver DECISIONS.md ADR-067 y TASKS.md TSK-157.

## BUG-087 / BUG-CONFIG-3: Wikimedia Commons rechaza anchos de thumbnail arbitrarios (HTTP 400)

**Severidad:** MEDIA (URLs de imagen rotas embebidas en HTML/JS que BUG-022 no detecta).
**Contexto:** hallazgo de la tanda ADR-067 (T7, 2026-09-28), verificado con `curl -I`.
**Problema:** `curl -I` contra URLs de Wikimedia del tipo `/thumb/.../800px-...` y `/1200px-...` devuelve HTTP 400 con el mensaje `Use thumbnail sizes listed on https://w.wiki/GHai`. Hay URLs de 800px/1200px YA embebidas en HTML/JS del repo que por tanto estan rotas, y BUG-022 no las detecta (la verificacion HEAD 200 de BUG-022 solo corre en el pipeline NUEVO de fichas, no barre el HTML/JS historico).
**Causa raiz:** Wikimedia cambio su politica y ya no sirve cualquier ancho de thumbnail; solo los que produce la API (`iiurlwidth`) o tamanos estandar.
**Blindaje:** NO construir a mano la URL de thumbnail; obtener el `thumburl` de la API (`action=query&prop=imageinfo&iiurlwidth=960`) y verificar con `curl -I -L` esperando HTTP 200 en el destino FINAL (BUG-022).
**Verificacion:** HEAD a 800px -> 400; HEAD del `thumburl` devuelto por la API con `iiurlwidth=960` -> 200; HEAD de un archivo inexistente -> 404 (discrimina bien).
**Estado:** ABIERTO como deuda de barrido (2026-09-28): hay que barrer y regenerar las URLs 800px/1200px embebidas en HTML/JS. Ver TASKS.md TSK-157 (g) y BUG-022.

## BUG-088 / BUG-CONFIG-4: referencias a `AGENTS.md`, archivo inexistente

**Severidad:** BAJA (enlaces rotos de ruteo; no rompe runtime, confunde al orquestador).
**Contexto:** hallazgo de la tanda ADR-067 (T7, 2026-09-28), verificado con `git grep`.
**Problema:** 4 referencias en `.opencode/agent/**` + 1 en `.opencode/skills/express-mode/SKILL.md` apuntaban a `AGENTS.md`, que NO existe -> enlaces rotos de ruteo.
**Causa raiz:** el archivo se referenciaba por nombre en prompts/agentes pero nunca se creo.
**Blindaje:** toda referencia apunta ahora a `docs/orquestacion/REFERENCIA-RUTEO.md` (ruta canonica real).
**Verificacion (2026-09-28):** `git grep -n "AGENTS\.md" -- .opencode/` -> 0.
**Estado:** **RESUELTO (cerrado el 2026-09-28; reenrutado el 2026-10-01).** Decision original: DECISIONS.md ADR-067. ** reenrutado el 2026-10-01 (tanda ADR-076 / TSK-170):** en vez de renombrar todas las referencias a `docs/orquestacion/REFERENCIA-RUTEO.md`, se creo **`AGENTS.md` en la raiz del repo** el 2026-10-01 (verificado con `Test-Path` = True), con la matriz de 16 dominios y agente unico, la capa de coste con gates de riesgo, las reglas transversales y el indice de skills; `docs/orquestacion/REFERENCIA-RUTEO.md` se reescribio en paralelo y ambos deben viajar en el MISMO commit. **Las referencias a `AGENTS.md` volvieron a ser legitimas** (no vuelven a ser enlaces rotos): hoy hay 3 referencias reales y verificables (`free-build.md` L18 y L24, `free-plan.md` L18, `express-mode/SKILL.md` L39), y todas apuntan a secciones que existen. Decision: DECISIONS.md ADR-076; tarea: TASKS.md TSK-170. Nota: el sintoma original (referencias a un archivo inexistente) NO se reprodujo porque entre 2026-09-28 y 2026-10-01 las referencias se/apuntaron a `REFERENCIA-RUTEO.md`; el hallazgo se cierra ahora porque la causa raiz (el archivo se citaba por nombre pero nunca existia) esta resuelta de raiz.

## BUG-089: el boton "Estuve aqui" no se hidrataba en la ficha -- `estaVisitado()` comparaba `d.id`/`d.slug` contra el UUID, pero `?tipo=mapa` devuelve `d.id AS destino_id`

**Severidad:** MEDIA (estado de UI incorrecto: un lugar ya visitado volvia a verse como no visitado al recargar la ficha).
**Contexto:** Fase A2 del prompt de la sesion (2026-09-29).
**Sintoma:** al abrir `/api/pagina-destino?slug=...` de un destino ya visitado, `#btn-visitado` NO recibia la clase `.activo`.
**Causa raiz:** `usuario-session.js` `window.ExploraCO.estaVisitado(destinoUUID)` recorria `data.data.visitados` y comparaba `String(d.id) === objetivo` y `d.slug === objetivo`. El endpoint `GET /api/interacciones?tipo=mapa` proyecta cada destino con el alias SQL `d.id AS destino_id` (api/interacciones.js), por lo que `d.id` es `undefined` y `d.slug` (slug) nunca coincide con el UUID. Resultado: siempre `false`.
**Resolucion aplicada:** normalizar las 3 claves posibles (`d.destino_id`, `d.id`, `d.slug`) contra el objetivo. Con `.activo` ya existente en `api/pagina-destino.js` (`.hobtn.activo`), el boton se hidrata via `precargarEstado`/`onExploraCOUpdate`.
**Evidencia (ADR-006):** `usuario-session.js` (`estaVisitado`), `api/interacciones.js:5510` (`d.id AS destino_id`), `api/pagina-destino.js` (`precargarEstado` + CSS `.hobtn.activo`).
**Prevencion:** al comparar filas de un endpoint, usar EXACTAMENTE el alias proyectado (no asumir `id`).
**Estado:** CERRADO / CORREGIDO en working tree (2026-09-29). Sin smoke nuevo (logica de red); cubierto por inspeccion.

## BUG-090: `scripts/test_logros_catalogo.js` estaba desalineado con el catalogo LOGROS (esperaba 30, habia 33)

**Severidad:** BAJA (test rojo preexistente; no rompe runtime porque NO esta encadenado a `npm test`).
**Contexto:** Fase B de la sesion (2026-09-29) al actualizar el conteo por el nuevo logro `logr_pasaporte_completo`.
**Sintoma:** el test fallaba en el check de conteo (30 != real).
**Causa raiz:** el catalogo crecio (33 logros) sin actualizar el literal del test.
**Resolucion aplicada:** actualizar el conteo a **34** (33 reales + `logr_pasaporte_completo`) y anadir `pasaporteCompleto` a la lista de ctx methods validados; nuevo script `npm run test:logros`.
**Evidencia (ADR-006):** salida del test `EXIT 0` tras el ajuste; `package.json` script `test:logros`.
**Estado:** CERRADO / CORREGIDO en working tree (2026-09-29).

## BUG-091: los basemaps de CARTO devuelven HTTP 200 con un PNG placeholder "API KEY REQUIRED" y el fallback por `tileerror` nunca se dispara

**Severidad:** ALTA (incidente de produccion; todos los mapas Leaflet mostraban pines/clusters pero SIN capa base).
**Contexto:** reporte del operador 2026-09-29 ("el mapa cultural y los otros mapas no muestran la textura, solo los pines"); captura aportada: `exploraco desarrollo/ampliacion desarrollo/mapa.jpg` (860x332). Detectado tras la entrega A3 de TSK-159, que creo `mapa-tiles.js` con fallback CARTO voyager/positron -> OSM por evento `tileerror`.
**Sintoma:** el mapa carga los pines y el cluster correctamente, pero el fondo (teselas) aparece como un mosaico repetido del texto "API KEY REQUIRED" / "carto.com/basemaps/apikey".
**Causa raiz:** CARTO dejo de servir basemaps gratuitos sin API key; todos sus dominios (`a/b/c/d.basemaps.cartocdn.com`, `cartodb-basemaps-a.global.ssl.fastly.net`) responden **HTTP 200 con un PNG FIJO** de watermark. Evidencia cuantitativa (misma zona de Bogota 4.711,-74.072):
  - CARTO voyager: **2049 bytes IDENTICOS** en z6, z10 y z14 (promedio #F8F8F6).
  - CARTO light_all: **2049 bytes identicos** en z6/z10/z14.
  - CARTO dark_all: **2513 bytes identicos** en z6/z10/z14.
  - OpenStreetMap (control): **24923 B** (z6), **28000 B** (z10), **40168 B** (z14) -> varia correctamente con el zoom.
  - Lectura visual de la captura del operador: mosaico repetido de "API KEY REQUIRED"; pines y cluster (123) correctos y distribuidos -> el fallo estaba aislado a la capa de teselas.
**Por que el fallback existente NO actuo:** `mapa-tiles.js` solo conmutaba de proveedor al recibir el evento `tileerror`, que requiere un fallo HTTP. Como CARTO responde 200 con una imagen valida, el evento nunca se disparo: la cadena nunca avanzo y OSM (que si funcionaba) nunca se alcanzo.
**Correccion aplicada (gratuita, sin API key, sin secretos):** nueva cadena en `mapa-tiles.js` L21-25, en este orden: (1) `osm` = `https://tile.openstreetmap.org/{z}/{x}/{y}.png` (`&copy; OpenStreetMap`); (2) `osm-hot` = `https://tile.openstreetmap.fr/hot/{z}/{x}/{y}.png` (`&copy; OpenStreetMap France`); (3) `esri-imagery` = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}` (`&copy; Esri`). `UMBRAL_ERRORES` sigue valiendo 5; la logica de fallback por `tileerror` y el aviso con boton Reintentar se conservan intactos.
**Archivos modificados:** `mapa-tiles.js` (L21-25); `mapa-cultural.js` (L71 `TILE_VOYAGER` -> OSM, L73 `ATTR_VOYAGER` -> OSM, comentario L1681); `index.html` (L1732, L1734, L1741, L2291 `tiles: 'carto-voyager'` -> `'osm'`); `mapas.html` (L301, L303-306); `comunidad.html` (L2043-2052).
**Alcance NO afectado (ADR-006):** `api/pagina-destino.js` NO usa CARTO (la ficha de destino usa un **iframe de Google Maps**, L1928): las paginas de destino no estaban afectadas. `index.html:1746`, `comunidad.html:2330`, `map-picker.js:182` y `map-picker.js:260` YA tenian `invalidateSize()`: no fue necesario anadir nada.
**Evidencia / verificacion:** `npm run test` **EXIT CODE 0** (13 smokes OK, 0 FAILs reales); `scripts/smoke_mapa_tiles.js` **24/24 PASS** (asserts: proveedores: primero OSM / ninguno usa CARTO / ultimo es Esri / 3 proveedores); `scripts/smoke_mapa_cultural.js` **98/98 PASS** (assert A3 obsoleto reescrito a "comunidad usa el helper MapaTiles sin proveedor hardcodeado"); **Escudo GOLD APROBADO**: `node --check` OK en `mapa-tiles.js` y `mapa-cultural.js`, `mapa-tiles.js` con 0 bytes >127 y 0 backticks, balance de divs identico a HEAD en `index.html` (388/388), `mapas.html` (58/58) y `comunidad.html` (449/449), **0 referencias a `cartocdn` en los archivos tocados**.
**Deuda / residual [DEUDA]:** (a) `mapa-cultural.js:359` y `mymapa.js:152` conservan el identificador legado `tiles: 'carto-voyager'` (es solo un id sin marca de URL: resuelve a `TILE_VOYAGER`, que ahora es OSM); renombrarlo queda como limpieza posterior. (b) **Hallazgo ADR-006 (verificado contra archivo real, NO citado en el brief):** `map-picker.js:91` conserva `tileUrl` por defecto `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png` y lo pasa como `{url: tileUrl}` a `MapaTiles.aplicar` (L163 y L254); como MapaTiles antepone esa URL como proveedor `custom` y CARTO responde 200 con placeholder, el fallback por `tileerror` tampoco actua en el map-picker de `admin.html:2556` y `mi-perfil.html` (mini-mapa/modal). (c) los `.html` estaticos versionados (p.ej. `casa-vieja-popayan.html`; ~90 HTML con URLs `cartocdn` inline en un script de mapa embebido) quedaron FUERA de alcance por decision de alcance minimo.
**Estado:** CERRADO / CORREGIDO en working tree (2026-09-29); commit/deploy pendientes. Ver `TASKS.md` TSK-161 y `DECISIONS.md` ADR-071.

## BUG-092 / BUG-CONFIG-5: cualquier subagente fallaba con "OpenCode's free tier can only be used from within OpenCode"

**Severidad:** ALTA (bloqueaba la orquestacion: ningun subagente podia ejecutarse).
**Contexto:** incidente de tooling del 2026-09-29 (mismo dia que BUG-091), detectado al lanzar cualquier subagente.
**Sintoma:** todo subagente fallaba con `Error from provider (Console): OpenCode's free tier can only be used from within OpenCode`.
**Causa raiz:** los 19 agentes de `.opencode/agent/*.md` declaraban `model: opencode/big-pickle` (`media-reader-free.md` usaba `opencode/mimo-v2.5-free`). El free tier del proveedor `opencode` NO admite invocacion como subagente, solo como modelo de sesion principal. Ademas `opencode.json` tenia `small_model: opencode/big-pickle`, que fallaba igual en la generacion de titulos.
**Resolucion aplicada:** los 19 agentes pasaron a `opencode-go/deepseek-v4.1-flash` (18) y `media-reader-free.md` paso a `opencode-go/mimo-v2.6-pro` por su capacidad de vision; `small_model` paso a `opencode-go/deepseek-v4-flash`. Los proveedores autenticados en la maquina son solo `opencode-go` y `google`.
**Evidencia (ADR-006):** recuento sobre `.opencode/agent/*.md` = 19 archivos, 18 x `opencode-go/deepseek-v4.1-flash` + 1 x `opencode-go/mimo-v2.6-pro`; `opencode.json` = `"model": "opencode-go/deepseek-v4.1-flash"`, `"small_model": "opencode-go/deepseek-v4-flash"`. Verificado tras el reinicio: los subagentes responden.
**Blindaje / requisito operativo:** requiere REINICIAR OpenCode para recargar los agentes (el servidor los cachea al arrancar; ver BUG-086 / BUG-CONFIG-2).
**Estado:** CERRADO (2026-09-29). Ver `TASKS.md` TSK-162.

## BUG-093: `manifest.json` declara `latawel-simbolo.png` como 192x192 y 512x512 cuando el archivo real mide 1277x1232

**Severidad:** BAJA / MEDIA (deuda de identidad PWA: iconos de instalacion declarados con tamanos que no coinciden con el raster real; no rompe runtime web).
**Contexto:** detectado en el pase de cierre del rebranding LATAWEL (2026-09-30, ADR-073 / TSK-164) al auditar los assets contra el archivo real (ADR-006). La generacion de assets acepto como deuda la falta de SVG maestro (`scripts/assets/build-brand-assets.ps1`).
**Sintoma:** el `manifest.json` de LATAWEL apunta a `/assets/brand/latawel-simbolo.png` para dos entradas `icons` con `sizes: "192x192"` y `sizes: "512x512"`, pero es el MISMO archivo en ambas y su dimension real no coincide con ninguna de las dos declaradas. Los navegadores/PWA pueden descargar un raster de 1277x1232 etiquetado como 512x512 (desperdicio de bytes y proporcion ligeramente no cuadrada, 1277 vs 1232 = ~3,6% de diferencia) o rechazar el icono por mismatch de tamano.
**Causa raiz:** no existe un asset de isotipo cuadrado (SVG maestro ni PNG cuadrado 512x512/192x192); se publico el simbolo disponible (1277x1232, no cuadrado) y se declaro en el manifest con dos tamanos arbitrarios en lugar de generar derivados a los tamanos exactos.
**Evidencia (ADR-006):** lectura de los PNG sobre el archivo real: `latawel-simbolo.png` = **1277x1232**; `favicon-32.png` = 32x32; `favicon-180.png` = 180x180; `favicon-16.png` = 16x16; `og/latawel-og-1200x630.png` = 1200x630. `manifest.json` declara el simbolo como `192x192` y `512x512` (dos entradas, mismo `src`).
**Correccion pendiente:** generar PNG cuadrados 192x192 y 512x512 (idealmente desde el SVG maestro cuando exista) y apuntar cada entrada del manifest a su archivo con el tamano real declarado; alternativamente, una sola entrada con el tamano real del archivo.
**Estado:** ABIERTO (2026-09-30). Registrado en la deuda de TSK-164 / ADR-073; no bloquea el deploy de identidad.

## BUG-094: la premisa de BUG-092 (los 19 agentes ya no tenian modelo gratuito utilizable) era INCOMPLETA -- `opencode/space-bunny-free` SI funciona como subagente a $0

**Severidad:** MEDIA / GOBERNANZA DE COSTE (no rompe runtime: los subagentes respondian y `npm test` pasaba; el dano es economico silencioso y contradice a ADR-067, que declaraba vigente una capa gratuita).
**Contexto:** detectado el 2026-09-30 al sondear modelos free como subagente (dato medido), tras notar que el roster de 19 agentes corria integramente en `opencode-go` (de pago) pese a que ADR-067 afirmaba una capa gratuita.
**Sintoma:** no hay error de runtime. El sintoma es de gobernanza: los 19 agentes `*-free` declarados gratuitos corrian a coste (>$0) y `opencode.json` arrancaba en pago; la capa gratuita quedo VACIA sin que ningun test lo detectara.
**Causa raiz:** la resolucion de BUG-092 generalizo un hallazgo cierto (`opencode/big-pickle` NO funciona como subagente) a "el free tier de `opencode` NO admite subagentes", y movio TODO el roster a `opencode-go`. Esa generalizacion era FALSA: `opencode/space-bunny-free` (y `opencode-go/space-bunny-free`, `opencode-go/longcat-2.5-preview-free`) SI funcionan como subagente y registran `$0.000000`. `big-pickle` y `space-bunny-free` son el MISMO modelo (Space Bunny) por vias distintas: `big-pickle` sirve como modelo de SESION pero nunca como subagente; `space-bunny-free` sirve en ambos.
**Evidencia (ADR-006, dato medido):** allowlist FREE con costo $0.000000 y vision (`opencode/space-bunny-free`, `opencode-go/space-bunny-free`, `opencode-go/longcat-2.5-preview-free`); lista ROTOS (7 modelos que fallan como subagente con `OpenCode's free tier can only be used from within OpenCode`); `opencode run --agent hybrid-build` delego a `@exp-pickle-free` y `opencode.db` registro ambos en `opencode/space-bunny-free` con `cost=0.000000`; economia por mensaje free vs pago (frontend-tpl 106x, qa-auditor 16x, backend-dev 12x, explore 7x); gasto historico $50.53.
**Resolucion aplicada:** ADR-074 restaura la capa gratuita con un modelo de 3 capas (free / hibrido / pago) y un guard (`scripts/ejecucion/verificar-capa-gratis.js`) que falla en `npm test` si un `*-free` vuelve a un modelo de pago.
**Relacion con BUG-092:** BUG-092 **permanece CERRADO** en su sintoma (los subagentes volvieron a responder; ese fix siguio siendo correcto para desbloquear el tooling). Lo que queda SUPERSEDIDO es su **"Resolucion aplicada"** (mover todo el roster a `opencode-go`), porque su premisa era incompleta. **NO se reabre BUG-092**: su registro historico se conserva intacto (Cero Borrado Logico). Ver `DECISIONS.md` ADR-074 y `TASKS.md` TSK-165.
**Estado:** CERRADO (2026-09-30) -- registrado como BUG de gobernanza de coste y resuelto por ADR-074. Ver `TASKS.md` TSK-165.

## BUG-095: el modal del map-picker no podia abrirse (al div le faltaba la clase `map-picker-modal`)

**Severidad:** MEDIA / ALTA (rompia el flujo del admin: el boton "Seleccionar ubicacion" no abria nada).
**Contexto:** detectado durante la limpieza de CSS muerto de `admin.html` en la tanda TSK-169 (2026-09-30); se buscaba un parche muerto (`#map-picker-modal[style*="flex"]`) y resulto que el modal NUNCA podia abrir.
**Sintoma:** al pulsar el boton de seleccion de ubicacion, el modal del selector de mapa no se mostraba.
**Causa raiz:** el div tenia `id="map-picker-modal"` pero **NO la clase** `map-picker-modal`. `map-picker.js` abre el modal con `classList.add('open')` (no con un `display:flex` inline), de modo que ni el selector `.map-picker-modal.open` ni el parche `#map-picker-modal[style*="flex"]` podian coincidir jamas (el parche era codigo muerto).
**Fix:** se agrego `class="map-picker-modal"` al div, se quito el `display:none` inline para que la clase gobierne la visibilidad, y se elimino el parche muerto `#map-picker-modal[style*="flex"]`. Esto repara de paso el boton "Seleccionar ubicacion" del admin.
**Verificacion (ADR-006):** lectura del archivo real: `admin.html` con `class="map-picker-modal"` (L2470) y el CSS `.map-picker-modal{display:none}` / `.map-picker-modal.open{display:flex}` (L266-267); `map-picker.js:79` (`modalElId = opts.modalEl || 'map-picker-modal'`) abre por `classList.add('open')`. `npm test` EXIT 0; `express_check admin.html` divs 1082/1082.
**Archivos:** `admin.html`.
**Estado:** CERRADO (2026-09-30) en la misma tanda. Ver `TASKS.md` TSK-169.

## BUG-096: el drawer del mapa no se veia en pantalla completa (era hermano del elemento en fullscreen)

**Severidad:** MEDIA (rompia la lectura del mapa en pantalla completa: el motor abria el drawer pero este no aparecia).
**Contexto:** detectado al probar el NUEVO control de pantalla completa (`mapa-fullscreen.js`) en el mapa del home, en la tanda TSK-169 (2026-09-30).
**Sintoma:** al entrar a pantalla completa en el mapa y abrir el drawer de un pin, el drawer no se veia.
**Causa raiz:** `.mapa-drawer` era HERMANO de `.mapa-map-container`. En Fullscreen API nativa solo se renderiza el subarbol del elemento en pantalla completa, asi que el drawer (que el motor SI abria) quedaba fuera del arbol visible. En el fallback CSS `.mfs-pseudo` pasaba lo mismo invertido: el contenedor subia a `z-index:10000` y tapaba el drawer (`z-index:1200`).
**Fix:** `#mapa-drawer` se movio DENTRO de `.mapa-map-container`. Verificado en `mapa-cultural.js:681-707` (`resolveDrawer`) que el motor REUTILIZA el elemento del HTML cuando la opcion `drawer` es un string (y `INDEX_MC_OPTS` pasa `'mapa-drawer'`); `resolveDrawer` solo crea un drawer propio cuando la opcion vale `true` (en ese caso, el nodo seguiria dentro del contenedor en fullscreen).
**Verificacion (ADR-006):** lectura del archivo real de `resolveDrawer` (`mapa-cultural.js:681-707`) y de `INDEX_MC_OPTS` (`drawer: 'mapa-drawer'`); `npm test` EXIT 0 (incluye `smoke_mapa_cultural`, que no se rompe porque el drawer reutilizado sigue siendo referenciado por id).
**Archivos:** `index.html`.
**Estado:** CERRADO (2026-09-30) en la misma tanda. Ver `TASKS.md` TSK-169 y `DECISIONS.md` ADR-075.

## BUG-097 / BUG-CONFIG-6: subagente cancelado a mitad de tarea -- su trabajo SI estaba en disco (verificar el estado real, no asumir perdida)

**Severidad:** BAJA (incidente de PROCESO, no de producto: ningun defecto en el codigo entregado; queda registrado por la leccion de verificacion).
**Contexto:** tanda de agrupacion plegable de "Mi perfil" (TSK-171 / ADR-077, 2026-10-02, modo express). Un subagente `@js-silo-dev` fue **cancelado a mitad** de su trabajo.
**Sintoma (en el proceso, no en el producto):** la cancelacion dejaba ambigua la situacion del subagente: no estaba claro si lo que habia escrito habia llegado a disco o si la sesion quedaba a medias con medio helper implementado.
**Causa raiz:** ninguna del codigo. Un subagente escribe en disco de forma incremental y su cancelacion **no revierte** lo ya escrito: la incertidumbre entre "perdi el trabajo" y "esta todo ahi" es un estado normal del runtime, no un fallo.
**Resolucion aplicada (verificacion, no suposicion):** se leyo el archivo real y se comprobo que los cambios del subagente **SI estaban aplicados**: el helper `pfGruposRender()` ya **no escribia en el DOM** (devuelve solo el string, `mi-perfil.html:3125-3185`) y `pfNivelesAutoAbrirGrupo()` ya existia (`mi-perfil.html:1644-1653`). No hubo que reimplementar nada.
**Blindaje / leccion:** ante un subagente cancelado a mitad, el estado de verdad es el **archivo real** (ADR-006), nunca la sensacion de que "se perdio": leer el fichero y grep por los simbolos esperados antes de re-despachar trabajo. Re-despachar a ciegas es la forma cara de este incidente (duplica trabajo y puede pisar lo ya escrito). Nota de gobernanza: nunca se re-despacha el mismo perfil que fallo (AGENTS.md §3.14), pero una cancelacion **no es** un fallo del perfil -- aqui no hubo re-despacho.
**Verificacion (ADR-006):** lectura directa de `mi-perfil.html` -> `pfGruposRender()` retorna `html` (linea 3184) sin escribir en el DOM, y `pfNivelesAutoAbrirGrupo()` esta definido en `:1644-1653` e invocado desde `renderNiveles()` (`:1667`).
**Estado:** **CERRADO como incidente de proceso (2026-10-02).** No es un bug de producto: no hay defecto que corregir en `mi-perfil.html` ni en el roster. Se conserva por la leccion de verificacion, siguiendo la convencion `BUG-CONFIG-n` de incidentes de tooling (como BUG-085/086/092). Decision relacionada: DECISIONS.md ADR-077. Tanda: TASKS.md TSK-171.

## BUG-098 / BUG-CONFIG-7: el mini-DOM del harness de QA no reflejaba `el.id` y produjo 2 falsos FAIL -- producto correcto, instrumentacion incorrecta

**Severidad:** BAJA (incidente de **INSTRUMENTACION de QA**, no de producto: el codigo entregado era correcto y lo demuestra que los 2 FAIL desaparecieran al arreglar el harness, no el HTML).
**Contexto:** tanda de optimizacion de agentes y permisos (TSK-172 / ADR-078, 2026-10-02). Al construir `scripts/smoke_grupos_perfil.js` (el smoke permanente de los 4 modulos agrupados de `mi-perfil.html` de TSK-171) aparecieron **2 FAIL** que no correspondian a ningun defecto del perfil.
**Sintoma:** dos aserciones de la seccion de Mis Albumes daban FAIL (el boton de "ver mas" se declaraba ausente) cuando el boton si existia en el HTML renderizado.
**Causa raiz:** el `getElementById` del mini-DOM (el propio harness, `scripts/smoke_grupos_perfil.js:401-409`) recorría el arbol buscando `nd.attrs.id === id`. Pero `mi-perfil.html` etiqueta el boton **por propiedad** (`b.id = 'mis-albumes-ver-mas'`), no por atributo. **En un DOM real la asignacion por propiedad SI se refleja en `getElementById`** (es el atributo ID); el harness no lo hacia, luego el nodo era invisible para el y daba un FAIL que mentia sobre el producto.
**Resolucion aplicada:** un `Object.defineProperty(this, 'id', ...)` en el constructor `Nodo` (`scripts/smoke_grupos_perfil.js:176-179`) que refleja `id` hacia `attrs.id` en ambos sentidos, igual que ya se hacia con `classList` (`:180-192`). El comentario del propio codigo (`:171-175`) deja escrito el porque para que nadie "simplifique" el getter fuera creyendo que sobra.
**Verificacion (ADR-006):** `node scripts/smoke_grupos_perfil.js` -> **Resumen: 73/73 comprobaciones PASS | FAIL 0**, exit 0, ~2,0 s. `node scripts/express_check.js mi-perfil.html` -> PASS, divs 563/563.
**Blindaje / leccion:** un FAIL de un harness es, por defecto, una acusacion contra **el harness**. Antes de tocar el producto, hay que responder "que parte del DOM real estoy imitando aqui": un mini-DOM propio que no replica la sematica de `getElementById` (ni de `classList`, ni de los estilos inline) convierte fallos de instrumentacion en falsos hallazgos de producto y al reves. Regla de companions ya escrita y ahora verificada en la practica: **`qa-auditor` debe dar rangos de linea, no "audita este archivo", y reusar los scripts de $0 antes de construir un harness** (`qa-auditor.md:17-31`, la seccion de presupuesto que este mismo incidente motivo).
**Incidentes asociados en la misma sesion (NO bugs nuevos, se registran aqui para no duplicar entradas):** (a) **recurrencia de BUG-097 / BUG-CONFIG-6** -- una tarea `@js-silo-dev` se cancelo de nuevo con el fichero ya escrito en disco; sigue siendo cierto que el estado de verdad es el archivo real (ADR-006), no la sensacion de perdida, asi que el patron ya documentado se repite y no abre un BUG nuevo. (b) **`scripts/express_check.js` supero el timeout de 120 s en su corrida completa**: no es un fallo del script sino una limitacion operativa; la forma de uso correcta es el **filtrado por fichero**, no la corrida completa. Queda anotado como deuda viva en TASKS.md TSK-172 (c).
**Estado:** **CERRADO (2026-10-02).** Sin defecto en `mi-perfil.html` ni en el resto del producto; el unico fichero corregido es el harness. Decision relacionada: DECISIONS.md **ADR-078** (el `edit: allow` de `qa-auditor` es justamente lo que permite que el arnes se escriba y se corrija sin friccion de permisos). Tanda: TASKS.md TSK-172.

## BUG-099: el voto de media se perdia en silencio -- el cooldown bloqueante caia en un `200 { ok: true }` sin insertar fila en `media_votos`

**Severidad:** ALTA (perdida silenciosa de una accion del usuario: el servidor afirmaba exito y no persistia nada; el cliente no tenia forma de saber la verdad).
**Contexto:** tanda de la v27 "Rising Star Decay" del voto de media (`api/interacciones.js`, handler `media_voto` / `registrarVotoMedia`), cerrada con **ADR-079** (2026-10-02). La v27 introduced dos mecanismos sobre el mismo eje: **decay** (el VALOR del voto baja con la carga) y **cooldown** (el voto se BLOQUEA durante N segundos).
**Sintoma:** reportado por el usuario: **"votar un segundo medio no registraba y habia que actualizar la pagina"**. El boton se pintaba como votado y el voto existia **solo en pantalla**; al refrescar volvia al estado inicial y el voto se habia perdido.
**Causa raiz:** **cooldown bloqueante invisible.** El handler solo chequeaba `mvRes.tope` y **nunca `mvRes.cooldown`**, asi que un voto frenado por cooldown caia directamente al `res.status(200).json({ ok: true, ya_votado: true })` **sin insertar fila en `media_votos`**. Como ese `200` era el unico `200` posible de la rama, **mentia**: el cliente lo leia como exito y pintaba el boton como "ya votado". El sintoma es de la familia "fantasma" (la UI afirma algo que el servidor no hizo).
**Resolucion aplicada:** **ADR-079** (ratificado por el operador): el **cooldown queda derogado** (constantes `VOTO_COOLDOWN_FACTOR`/`VOTO_COOLDOWN_MAX_SEG` borradas, `MAX(creado_en) AS ult` retirado de la consulta de carga conservando `n` y `carga`, borrados el calculo y la rama de bloqueo, y eliminado el 429 "Espera Ns" de `registrarVotoMedia`; `api/interacciones.js` 14468 -> 14454 lineas). **El voto ahora SIEMPRE se permite en servidor y su `200 { ok: true }` volvio a ser veraz**, porque el handler ya no tiene ninguna bandera sin chequear. El **decay se conserva intacto** (sigue determinando el VALOR, con su curva actual) y el **tope duro 20/24h queda INTACTO** con su 429 de `tope` (`VOTOS_DIA_MAX`), que sigue siendo la contencion real.
**Verificacion (ADR-006):** `node --check` OK en `api/interacciones.js` y en el smoke; ASCII-safety 0 bytes > 127 en ambos. `scripts/smoke_036_media_unificada.js` realineo 4 matchers de regex (`:136,164,174,220`) porque **identifican consultas por texto SQL literal** y el borrado de `AS ult` los desalineo -> **93/93 PASS**; `npm test` VERDE.
**Archivos:** `api/interacciones.js`, `scripts/smoke_036_media_unificada.js`.
**Estado:** **CERRADO (2026-10-02).** Decision relacionada: DECISIONS.md **ADR-079** (`DECISIONS.md:4279-4347`). Tanda: v27 "Rising Star Decay" (ver `NEXT.md:40` y `TASKS.md:24`). Queda registrada una deuda abierta de calibracion en la seccion "Deuda ADR-079" de este mismo archivo.

## Deuda ADR-079: deriva de calibracion de `XP_BASES.voto_media` (doc-drift: 5 documentado vs 3 en el codigo)

**Origen:** deteccion documental durante el cierre de ADR-079 / BUG-099 (2026-10-02).
**Estado:** **ABIERTA. NO se resuelve en este pase** (solo se registra; la recalibracion de la escala de XP es una decision de producto que requiere su propio ADR).
**Descripcion:** la tabla de `XP_BASES` esta documentada con `voto_media = 5` en `DECISIONS.md:2912`, pero el **archivo real** `api/interacciones.js` tiene **`voto_media: 3`** (`:474`), valor introducido por la recalibracion de la v27 "Rising Star Decay" y nunca propagado al documento. Ademas quedan desalineados los espejos locales de XP (`directorio-session.js:151` con +5 XP y >100 fichas estaticas con +25/+8), ya registrados como `[DEUDA-EXPRESS]` en `NEXT.md:40` y `TASKS.md:24`.
**Por que no se corrige aqui:** alinear el documento con el codigo es lo barato, pero la pregunta real es cual de los dos valores es el correcto (3 de la recalibracion v27 o el 5 documentado). Fijarlo sin decision de producto congelaria una escala de XP por accidente (Cero Borrado Logico aplicado a la economy: no se tocan valores ya entregados).
**Siguiente paso propuesto:** decidir con el operador el valor canonico de `voto_media`, alinear `DECISIONS.md` **o** el codigo segun la decision, y propagar a los espejos locales de XP.

## BUG-100: `cmNivelActual()` comparaba un array de objetos con `indexOf` y devolvía nivel 0 siempre -- un gate construido sobre ella habría ocultado la comunidad entera

**Severidad:** ALTA (riesgo de **ocultamiento masivo**: la función era la fuente de nivel de 3 call sites de `comunidad.html`, y cualquier gate nuevo construido sobre ella recibe 0 en vez del nivel real).
**Contexto:** detectada y corregida de paso durante la entrega de **ADR-085 / TSK-179** (2026-10-05), que anadía el gate de pestanas por nivel. **Preexistente**: la función ya estaba en `comunidad.html` mucho antes de esta entrega y solo became inutilizable cuando alguien la uso como base de un gate.
**Síntoma (potencial, no observado en produccion):** con `nivel = 0`, todo umbral `nivel < X` se cumple, luego **todas** las pestanas con gate se ocultan a **todos** los usuarios, incluidos los de nivel alto y los que no tienen sesión. La comunidad se renderiza vacia.
**Causa raíz (ADR-040, antipatron del `indexOf` por identidad):** `XP_LEVELS.indexOf(getLevel(statsU().xp)) + 1`. `indexOf` usa **igualdad referencial** (`===`), no structural: sobre un array de **objetos** el elemento buscado nunca es el mismo objeto, luego devuelve `-1` y el `+1` lo convierte en **0**. La funcion parecia correcta porque `getLevel()` sí existe y devuelve un valor plausible.
**Resolución aplicada:** `cmNivelActual()` (`comunidad.html:3350`) **delega en la fuente unica** (`window.ExploraCO.nivelActual()`) y degrada al indice real del espejo local si el nucleo no responde. El porque queda escrito en el propio archivo (`comunidad.html:3346-3349`) para que nadie lo "simplifique" reintroduciendo el `indexOf`.
**Verificación (ADR-006):** Escudo GOLD limpio y `node --check` PASS en `comunidad.html`; los 3 call sites siguen resolviendo contra el nucleo; QA no reporta call site que devuelva 0 con sesion valida. Los **3** `indexOf` por identidad **que siguen vivos** estan registrados como deuda en `NEXT.md` (que sigue 4), no como parte de este cierre.
**Archivos:** `comunidad.html` (`cmNivelActual` `:3350`, comment `:3346-3349`).
**Estado:** **CERRADO (2026-10-05).** Decision relacionada: `DECISIONS.md` **ADR-085** D3 (fuente unica de nivel: `niveles-data.js`); ADR-040 (el antipatron que lo causo). Tanda: `TASKS.md` **TSK-179**.

## BUG-101: `pfNivelActual()` degradaba el `-1` sin sesion a `1` -- boton visible sin señal de bloqueo, clic que no cambia de panel y un toast que accuse falta de nivel a un visitante anónimo

**Severidad:** MEDIA (UI enganosa, sin perdida de datos: el gate no cede, pero la interfaz **miente** sobre el motivo y confunde a un visitante legitimo).
**Contexto:** detectada y corregida de paso durante la entrega de **ADR-085 / TSK-179** (2026-10-05). **Preexistente.** La correccion es el contrato opuesto de D1: aqui el `NULL`/desconocido **no se rellena con un valor por defecto**, se propaga.
**Síntoma:** un visitante **sin sesion** ve el boton de la pestana con nivel **visible**, sin candado ni aviso de bloqueo. Al pulsarlo el panel **no cambia**, y el toast acusa **falta de nivel** a alguien que no tiene nivel porque **no esta registrado**: el mensaje senala la causa equivocada.
**Causa raíz:** `pfNivelActual()` (`mi-perfil.html:5589`) hacia `parseInt(core.nivelActual(), 10)` y luego **normalizaba a `1`** cualquier valor no positivo. El nucleo devuelve **`-1` sin sesion** como sentinel deliberado, y ese `-1` **significa "no hay usuario"**, no "nivel 1". La degradacion converts un sentinel en un dato: cualquier umbral `>= 1` se cumplia y el gate se abria para un anonimo.
**Resolución aplicada:** el `-1` (sin sesion) y el `0` (sesion sin datos de nivel) **se propagan tal cual**, alineados con el nucleo, que en ese caso no aplica `data-gate-bloqueado`. El porque queda escrito en el propio archivo (`mi-perfil.html:5594-5597`).
**Verificación (ADR-006):** `node --check` PASS; smoke del perfil **27/27**; el caso se reprodujo antes del arreglo (**30/34**) y pasa despues (**34/34**).
**Archivos:** `mi-perfil.html` (`pfNivelActual` `:5589`).
**Estado:** **CERRADO (2026-10-05).** Decision relacionada: `DECISIONS.md` **ADR-085** D3/D4 (el nucleo es la verdad y el cliente solo visibilidad). Tanda: `TASKS.md` **TSK-179**.

## BUG-102: `004_backfill_planes_viaje_fecha_inicio.js` reportaba `filas_escritas: 0` **aunque escribia de verdad** -- la instrumentacion miente sobre el resultado real de un `--apply`

**Severidad:** BAJA en producto (el dato de la escritura llego bien al servidor), ALTA en confianza: un `--apply` que se autodeclara "0 filas escritas" **invita a re-ejecutar un backfill ya aplicado** y a desconfiar del propio script.

**Contexto:** detectado durante la ejecucion real del backfill de **TSK-179**, 2026-10-05. **Instrumentacion, no producto:** la fila se escribio y el dato quedo persistido.

**Sintoma:** el campo `filas_escritas` del `--json` devuelve **0** en la primera pasada, que es la que **si** escribe. Una segunda pasada identica tambien devuelve 0, asi que **el numero es el mismo en el caso que escribe y en el que no hace nada**.

**Causa raiz:** el script lee `res.rowCount` para accounting. En un **UPDATE** el driver de Neon **no devuelve `rowCount` util**: devuelve un **array de filas**, y el conteo se pierde. No hay bug en la escritura; el bug esta en **leer el numero del sitio equivocado**.

**Resolucion aplicada:** la verdad del backfill **no** es `filas_escritas`, es el **delta de `con_fecha`** medido por el propio script (0 -> 1 en la 1a pasada) y confirmado por **sonda de solo lectura** posterior a la 044. La idempotencia quedo probada por esa via, no por `filas_escritas`: la 2a pasada dio **0 filas y `sin_fecha = 0`**.

**Deuda [ABIERTA]:** el script **no se corrige**; se documento el contrato real en `NEXT.md` y en la nota de instrumentacion. Corregirlo exige que el conteo se derive del `delta`, no de `rowCount`.

**Archivos:** `db/cleanups/004_backfill_planes_viaje_fecha_inicio.js` (campo `filas_escritas` del `--json`).
**Estado:** **MITIGADO (2026-10-05).** Decidido no tocar el script en esta sesion (fuera de alcance). Tanda: `TASKS.md` **TSK-179**. Decision relacionada: `DECISIONS.md` **ADR-086** (misma sesion, por el precedente de "medir antes de afirmar").

## BUG-103: la migracion `044` **llego commiteada pero nunca aplicada** en produccion -- las **2** ramas de listado de planes fallaban `42703` **sin fallback**

**Severidad:** ALTA. **Bloqueante abierto de TSK-179**: la funcionalidad no era "neutra", era **peor que el estado previo**, porque el filtro se escribio leyendo una columna que en produccion no existia.

**Contexto:** TSK-179 cerro **con la 044 sin aplicar**, y asi se documento correctamente en su momento. El hallazgo de esta sesion es que la tarea **quedo cerrada** con un bloqueante vivo **sin_owner ni relevo explicito**. Tanda: **TSK-179 / ADR-085**.

**Sintoma:** las **2** ramas de listado de planes fallan con `42703` (columna inexistente) y **no hay fallback degradado**: la funcionalidad esta **empeorada** respecto a no tener el filtro.

**Causa raiz:** no es un fallo de codigo, es un fallo de **proceso**: una migracion se entrego y se commiteo (`427be74`) como parte de un codigo que ya la requiere, y la aplicacion en Neon quedo como paso manual **fuera del radio del cierre**. El entregable "044 + 004 + sus tests" se leyo como "todo entregado" cuando **la parte que la hace funcionar es una accion, no un fichero**.

**Resolucion aplicada (2026-10-05):** 044 **aplicada en Neon** por el camino canonico (`node scripts/apply_sql_file.js db/migrations/044_planes_viaje_fecha_inicio.sql`, "Sentencias detectadas: 2"), verificada por sonda de solo lectura (`fecha_inicio` existe, tipo `date`, `idx_planes_viaje_activo_fecha` presente). Backfill **ejecutado** (`--apply --ddmm-aaaa`): 1 fila escrita, 2a pasada no-op.

**Deuda [ABIERTA]:** el codigo **sigue sin desplegar** (`api/interacciones.js` NO desplegado), asi que la funcionalidad **aun no es visible en produccion**. Ademas, la 044 **se aplico por codigo**, no por un archivo de migraciones con estado registrado: no hay ninguna tabla que diga que la 044 esta aplicada, y una 046 aplicada a mano **sin** la 044 seria un fallo silencioso.

**Archivos:** `db/migrations/044_planes_viaje_fecha_inicio.sql`; `api/interacciones.js` (las 2 ramas con el filtro D1).
**Estado:** **CERRADO en base de datos (2026-10-05); PENDIENTE el despliegue.** Reevaluado como `TASKS.md` **TSK-181**.

## BUG-104: `casa_ranking` era **estructuralmente fragil** ante multi-moneda -- los agregados se multiplicaban si `moneda_cuentas` pasaba a 1:N (riesgo LATENTE, no activo)

**Severidad:** ALTA **si** se dispara; **nula hoy**. Riesgo **latente**, no un fallo de produccion. Se documenta porque la premisa se evaluo ALTO y **al medirla resulto latente**: escribir "vulnerable" sin medir habria sido correcto por la forma y falso por el fondo.

**Contexto:** detectado al preparar la Enmienda 3 a **ADR-061** (multi-moneda, 3 monedas CDR/JAG/DLF) el 2026-10-05. **Preexistente**: el patron es anterior a esta sesion. Tanda: `TASKS.md` **TSK-180 / ADR-086**.

**Sintoma (latente):** si `casa_ranking` hiciera JOIN a `moneda_cuentas` (que pasaria a **3 filas por usuario** con la Enmienda 3), cada JOIN 1:N **multiplicaria** los agregados: `miembros`, `miembros_activos` y `xp_total` se inflarian **una vez por cada fila de la tabla hija**, y en cascada tambien `pct`, `multiplicador_xp` y `fee_mercado_interno`.

**Causa raiz del riesgo latente:** el `SUM` de `xp_total` se calculaba en el mismo nivel de agrupacion que las **subconsultas escalares** de `activos_ocultos`, de modo que el patron **dependia de que ninguna relacion 1:N entrara en la multiplicacion**. Es una estructura correcta por construccion accidental, no por invariante.

**CORRECCION DE PREMISA [verificada contra el archivo real, ADR-006]:** `casa_ranking` **NO hace JOIN a `moneda_cuentas`**. Su unico JOIN es `casas_cofre`, que es **1:1 por PRIMARY KEY (`casa`)**, o sea que **no puede multiplicar**. Por eso el riesgo era **latente y no activo**: hoy el resultado es correcto, y lo seguira **aunque** `moneda_cuentas` se vuelva multi-moneda.

**Resolucion aplicada:** `api/usuarios.js:1228-1276`, `casa_ranking` reestructurado. Los agregados se calculan en una **derivacion que solo toca `usuarios`** y colapsa a **una fila por `usuarios.id`**; `casas_cofre` entra **despues**, ya agregado. La invariante pasa de "correcto por construccion accidental" a **"correcto por construccion explicita"**.

**Por que no `SUM(DISTINCT xp_total)`:** colapsaria **dos usuarios distintos con el mismo XP**, que es un caso legitimo. La deduplicacion se hace por `id` **antes** de agregar, no sobre el valor agregado.

**Verificacion (ADR-006):** `node --check` PASS; ASCII-safe (0 bytes > 127, 0 backticks); y **no-op numerico** con el estado actual: condor 4/2/2300.5 y jaguar 2/1/1077.25, **identico antes y despues**. El no-op es la prueba de que se elimino la fragilidad **sin cambiar un solo numero**.

**Archivos:** `api/usuarios.js` (`casa_ranking` `:1228-1276`).
**Estado:** **CERRADO (2026-10-05).** Decision relacionada: `DECISIONS.md` **ADR-086** Decision D (el score se calcula **EN QUERY**, sin cache, y la agregacion se hace antes de cualquier JOIN 1:N).

## BUG-105: el driver HTTP de Neon **no acepta lotes multi-sentencia** -- `sql('BEGIN; ...; ROLLBACK;')` devuelve SQLSTATE **42601** y hace el **dry-run con ROLLBACK imposible por HTTP**

**Severidad:** ALTA como **limite de plataforma**, no como fallo de nuestro codigo. No rompio nada en produccion; **impuso un metodo de trabajo distinto** al que se asumia.

**Contexto:** detectado el 2026-10-05 al intentar validar de verdad la migracion `045` antes de aplicarla. Tanda: `TASKS.md` **TSK-186**.

**Sintoma exacto:** enviar un lote por el driver HTTP (`sql('BEGIN; ...; ROLLBACK;')`) devuelve **SQLSTATE 42601**, *"cannot insert multiple commands into a prepared statement"*. La causa es que el endpoint `/sql` de Neon usa **protocolo extendido**, que solo admite **una** sentencia por statement preparado.

**Por que importa y no es un detalle menor:** **sin multi-sentencia no se puede escribir un dry-run transaccional por HTTP**, o sea que la validacion previa "aplico en transaccion y hago rollback" era **imposible por la via obvia**. Un agente que no lo sepa puede: (a) publicar la migracion sin validar, o (b) intentar el rollback, no entender el 42601 y concluir que la migracion es invalida.

**Resolucion (metodo, no parche):** usar **`Client`** (extiende `pg.Client`, sobre **WebSocket nativo**), donde `BEGIN`/`ROLLBACK` **si son transaccion real**. Con el se hizo el dry-run de verdad de las 6 sentencias, y se **comprobo con `information_schema` que la tabla NO existia tras el rollback** -- que es la prueba que da valor al dry-run.

**Hallazgo adjunto:** **`sql.transaction()` existe** (atomicidad), pero **no da ROLLBACK**. O sea que cubre el "se aplica entero o nada", **no** el "pruebo y lo deshago". Son dos cosas distintas y confundirlas dejaria la migracion validada a medias.

**Estado:** **CERRADO por metodo alternativo (2026-10-05).** No es codigo nuestro, asi que **no hay fix que aplicar**: lo que queda es el conocimiento, que se documenta ademas en el ADR-087 pendiente (**TSK-189**).

## BUG-106: el script "compuesto" `005_seed` moria con una *assertion* de libuv al forzar `process.exit()` en Windows -- **exit code mentiroso** aunque los datos fueran correctos

**Severidad:** MEDIA. **No corrupto datos**, pero **si miente sobre el resultado**, que es la clase de fallo mas dana en un script de seed.

**Contexto:** detectado el 2026-10-05 al ejecutar `db/cleanups/005_seed_schema_migrations.js` (361 lineas, 43 filas). Tanda: `TASKS.md` **TSK-186**.

**Sintoma:** el script terminaba con una **assertion de libuv** originada en el `process.exit()` forzado al final, en vez de salir limpiamente con el codigo previsto.

**Por que es peligroso mas alla del ruido:** el **exit code era mentiroso**. Un `exit != 0` en un seed significa "no se aplico", y lo correcto era **si se aplico, y habia que saber distinguirlo**. Con el codigo de salida falso, un pipeline o un agente podia leer **fallo** donde hubo **exito**, o al reves: reintentar un seed ya aplicado. Este tipo de fallo **no lo detecta ningun smoke**, porque los datos quedan bien y el problema esta en como se anuncia el desenlace.

**Resolucion:** **drenar el bucle de eventos en vez de forzar la salida**, de modo que el proceso termina solo con el codigo real. Con eso el seed **exito con exit 0** y su idempotencia quedo probada: **dos pasadas seguidas, 43 omitidas por conflicto, exit 0**.

**Estado:** **CERRADO (2026-10-05).** LECCION TRANSVERSAL, candidata a norma: **en Windows, `process.exit()` forzado puede producir una assertion de libuv y falsear el exit code**; un script que informa su resultado debe **drenar el bucle de eventos**, no matar el proceso. Aplica a cualquier script de `scripts/` y de `db/cleanups/`.

## BUG-107: premisa falsa -- `api/interacciones.js` se dio por **no desplegado** y casi costo una ventana de despliegue innecesaria para arreglar un bug de **base de datos**

**Severidad:** ALTA como **fallo de proceso**, nula como fallo de producto. Lo que casi costo es **la ventana de despliegue y el gate de `@backend-dev`**.

**Contexto:** `TASKS.md` **TSK-181** arrastraba el bloqueante "desplegar `api/interacciones.js`", con el razonamiento de que el `42703` venia del **codigo sin desplegar**. La sesion anterior lo dio por sentado. Tanda: **TSK-181**, **TSK-186**.

**La premisa y por que era falsa:** si el codigo viejo (sin el filtro 044) estuviera desplegado, `GET /api/interacciones?tipo=planes` devolveria **1 fila** (el plan activo). Devuelve **0**. Con el filtro aplicado y **1 plan activo** en Neon que queda **oculto**, la unica explicacion es que **el codigo nuevo ya estaba desplegado**.

**Medicion que desmiente:**
- `GET /api/interacciones?tipo=planes` -> **HTTP 200 con 0 filas**.
- Neon: **1 plan activo**, **0 visibles** con el filtro 044, **1 oculto** por el.
- Codigo viejo desplegado habria dado **1 fila**. Dio **0**.

**Causa raiz real:** el `42703` lo causaba **la migracion sin aplicar**, no el codigo sin desplegar. **Aplicar la 044 fue lo que arreglo la funcion.** **No habia nada que desplegar.**

**Por que la premisa era tan creible -- y por que esto es lo importante:** el sintoma (`42703`) es **indistinguible** entre "columna no existe" y "codigo que la consulta sin ella", y el filtro 044 ya venia escrito desde **TSK-179**. Un razonamiento plausible, bien escrito y no verificado. **Un 200 con array vacio no distingue las dos hipotesis**; solo las distingue un dato del otro lado (cuantos planes activos hay en Neon).

**Resolucion:** premisa desmentida con medicion, **tarea reescrita y cerrada sin despliegue**, y **la ambiguedad convertida en trabajo pendiente**: `scripts/verificar_migraciones_prod.js` **hereda exactamente este problema** (sale `NO_CONFIRMADO` por la misma razon) y por eso su primer pendiente es **consultar Neon y cerrar la ambiguedad** (**TSK-187**).

**Verificacion de que no era regresion:** post-push, `casa_ranking` **200** (`{"casas":[{"casa":"jaguar","miembros":1,...}]}`), `faccion_ranking` **200**, `planes` **200 `[]`**, `pandilla_ranking` **400** (exige auth, **no es regresion**).

**Estado:** **CERRADO como premisa (2026-10-05).** El hueco de verificacion que deja abierto queda como **TSK-187**.

## BUG-108: la seccion `EXCEPTION` de la `046` se **tragaba** el error de la re-clave y dejaba la migracion **registrada como aplicada** -- `42P10` permanente en produccion

**Severidad:** ALTA. **No rompio produccion porque se detecto antes de aplicar**, pero su ausencia habria sido un fallo **silencioso y permanente**: la migracion constaba aplicada y el mercado de moneda habria fallado en cada `ON CONFLICT`.

**Contexto:** detectado el 2026-10-05 al revisar `db/migrations/046_market_multimoneda_sinks.sql` antes de aplicarla en Neon. Tanda: `TASKS.md` **TSK-188** / **TSK-183**, `DECISIONS.md` **ADR-086** addendum A.

**Sintoma exacto (medido por ejecucion, no por revision):** con el texto viejo, el escenario de violacion de unicidad **`23505`** daba **`error=NINGUNO`**, emitia un `NOTICE "NO se reclava"`, **no abortaba**, y la migracion quedaba **registrada en `schema_migrations` como `aplicada`**. Consecuencia: la PK de `moneda_cuentas` se quedaba en `(usuario_id)` y el primer `ON CONFLICT (usuario_id, moneda)` de la aplicacion lanzaba **`42P10` (no existe la restriccion unica)**, de forma **permanente**, con el ledger de migraciones afirmando lo contrario.

**Causa raiz -- y por que los handlers eran INALCANZABLES:** el bloque declaraba `EXCEPTION WHEN duplicate_table` (**42P07**) y `WHEN unique_violation` (**23505**). Ninguno podia dispararse: (a) el bloque **no crea ninguna tabla** (solo `ALTER`/`ADD CONSTRAINT`), luego `42P07` no tiene emisor; (b) `moneda_cuentas` con PK `(usuario_id)` **ya implica** unicidad de `(usuario_id, moneda)`, luego `23505` solo podria venir de la propia re-clave, que es justo lo que el `IF EXISTS` ya decidia. El `EXCEPTION` no anadia robustez: **anadia una salida silenciosa** donde debia haber un aborto.

**Resolucion aplicada:** **se elimino la seccion `EXCEPTION` entera** y el `IF EXISTS` se cerro con `ELSE -> RAISE EXCEPTION` (**P0001**, `046:116-128`). Sin seccion `EXCEPTION` el error **se propaga y aborta el fichero entero**, porque el `DO $$` es **una sola sentencia**; el `RAISE` da **lo mismo con codigo muerto**. **Verificado por ejecucion:** ahora **aborta en 6/16** y **no ejecuta 7-16**.

**Leccion transversal:** *capturar una excepcion en un bloque que se supone idempotente convierte un fallo ruidoso en una mentira registrada.* Si el proposito del bloque es **garantizar un estado**, el fallo debe **abortar el fichero**, no avisar y continuar. Y un handler que **ningun camino puede alcanzar** no es defensa: es una puerta que parece cerrada y no lo esta.

**Estado:** **CERRADO (2026-10-05)**, corregido en el fichero **antes** de aplicar la `046` en produccion. Decision relacionada: `DECISIONS.md` **ADR-086** addendum A, punto **A5**.

## BUG-109: `DECISIONS.md` **ADR-086 §4** prescribia filtrar por `moneda_cuentas.activo`, **columna que no existe** -- confusion con `moneda_mercado.activo`

**Severidad:** MEDIA como **defecto de especificacion**. No rompio codigo (nadie cableo esa clausula), pero **habria roto la implementacion del ranking compuesto** en cuanto alguien la hubiera escrito tal cual, y habria exigido **anadir una columna** por el camino equivocado.

**Contexto:** detectado el 2026-10-05 al verificar la `046` ya aplicada contra la migracion `040` y contra Neon. Tanda: `DECISIONS.md` **ADR-086** §4.

**El defecto:** la formula del saldo del ranking compuesto prescribia `SUM(m.saldo) ... WHERE m.usuario_id = u.id AND m.activo = true`. **`moneda_cuentas.activo` NO EXISTE**, medido en `db/migrations/040` (su `CREATE TABLE` declara solo `usuario_id uuid PRIMARY KEY`, `saldo numeric(12,2)`, `actualizado_en timestamptz`) y confirmado en Neon. **Causa raiz:** confusion con **`moneda_mercado.activo`, que si existe** (`046:138`).

**Por que NO se anade la columna (dictamen, y es la parte importante del cierre):** (a) crearia un **segundo estado durmiente** que el filtro de saldo **no cubre** -- una cuenta desactivada seguiria sumando en el ranking, o sea **deriva silenciosa**, la clase de fallo que el propio ADR-086 busca eliminar; (b) es **redundante**: con la PK re-claveada a `(usuario_id, moneda)` hay **exactamente una fila por par**, luego `SUM(saldo)` **ya es** el saldo activo. **La conclusion del ADR no se debilita aunque la tabla tenga filas**: el `DEFAULT 'condor'` de las columnas anadidas mete a todos los usuarios existentes en una moneda, y `(usuario_id,'condor')` **no puede duplicar** bajo una PK compuesta.

**Resolucion aplicada:** la clausula `AND m.activo = true` **se borra** de la formula de §4 y **no se anade ninguna columna**. Correccion registrada en `DECISIONS.md` **ADR-086** §4 con su justificacion.

**Estado:** **CERRADO por el ADR (2026-10-05).** Sin cambios en esquema: la `046` aplicada **no** tiene `moneda_cuentas.activo` y no lo necesita.

## BUG-110: `soportaMoneda()` cachea el booleano de esquema con **TTL de 60 s** -- una instancia viva no ve un cambio de PK hasta 60 s (deuda ACEPTADA, no resuelta)

**Severidad:** BAJA, y **deliberada**. Se registra como **deuda documentada y aceptada**, no como fallo.

**Contexto:** introducido el 2026-10-05 con los parches B1-B5 (`TSK-183`, commit `7fe1e9f`). Tanda: `DECISIONS.md` **ADR-086** addendum A, punto **A3**.

**El comportamiento y su ventana:** `soportaMoneda()` resuelve el booleano "el esquema es multi-moneda" y lo cachea **60 s** (`MONEDA_TTL_MS = 60000`, `api/interacciones.js:2287`, `api/usuarios.js:154`). Una instancia **ya arrancada** que resuelva `false` **no ve** un cambio posterior de la PK durante ese minuto, y en esa ventana emite el **SQL legacy**.

**Por que se acepta:** el TTL acota el peor retraso del sistema a **60 s**. Sin el, el booleano quedaria congelado **hasta el proximo redeploy**, que es un plazo **indefinido**. Ademas, en esta tanda la ventana **es inaplicable** por el orden de despliegue: **migracion primero, redeploy despues**, luego **ninguna instancia** puede haber resuelto `false` antes de que la PK sea compuesta.

**El riesgo residual, escrito para que no se olvide:** si alguna vez se aplica un **cambio de esquema que altere la PK de `moneda_cuentas`** y se hace **sin** un redeploy posterior, las instancias **durante el TTL** pueden **mixear** SQL de 1 moneda y de 3 durante **hasta 60 s**. Con una ventana de 60 s y datos de mercado, eso **no** es un saldo falso silencioso mientras el TTL no expire; con el TTL expirando, el **orden** vuelve a ser lo unico que protege.

**Mitigaciones ya presentes (no son el fix, son por que el riesgo es bajo):** cachea el **booleano resuelto**, no la Promise (una Promise rechazada cacheada se relee rechazada **para siempre**); **fail-closed**: si la deteccion falla se asume **1 moneda**, la rama que no puede corromper.

**Deuda:** [ABIERTA, ACEPTADA]. No se resuelve en esta tanda. Si alguna vez se necesita **cero** ventana, la palanca es **reinicio de instancias** al cambiar el esquema, no acortar el TTL.

**Estado:** **ABIERTA como deuda (2026-10-05).** Decision relacionada: `DECISIONS.md` **ADR-086** addendum A, puntos **A3** y **A4**.


## BUG-111: `responderParcheAusente()` responde 503 `SCHEMA_NOT_MIGRATED` con un mensaje que **nombra la migracion equivocada** -- dice "039" cuando la causa real es la `047`

**Severidad:** BAJA de impacto, **ALTA de coste de diagnostico**. No corrompe datos ni degrada la funcionalidad: la migracion que falta esta aplicada. Lo que falla es **la orientacion al que va a depurar**.

**Contexto:** detectado el 2026-10-05 al cerrar documentalmente la tanda de la economia (migracion **`047_parche_upgrades_usuario_inversor.sql`, atribucion del inversor). Tanda: `DECISIONS.md` **ADR-088** punto B6, `TASKS.md` **TSK-184**/**TSK-185**.

**El defecto, medido en el archivo real.** `api/interacciones.js:2567-2575` define:

```
function responderParcheAusente(res, e, etiqueta) {
  console.warn('[parche] ' + etiqueta + ' ausente (migracion 039 pendiente): ' + ...);
  return res.status(503).json({
    ok: false,
    error: 'Parche no disponible (migracion 039 pendiente)',
    code: 'SCHEMA_NOT_MIGRATED'
  });
}
```

Y se invoca en `api/interacciones.js:13625` con la etiqueta `parche_upgrade_invertir`.

**Por que el numero es FALSO.** La causa real de que esa rama entre en el 503 es la columna **`parche_upgrades.usuario_id`**, que es exactamente lo que anade la **`047`**. El mensaje dice **`039`**.

**La 039 no tiene nada que ver.** `039_gig_economy_p2p.sql` creo `parche_upgrades` (y de ahi `idx_parche_upgrades_ciudad_vigencia`), pero **no** creo `usuario_id` y **no** es la migracion que falta. Un developer que lea el 503 va a buscar **una migracion 039 que ya esta aplicada** (`schema_migrations`: `039` no figura como pendiente; lo que esta en juego es la `047`) y va a perder tiempo, o peor, va a **re-aplicar la 039** esperando un efecto que no existe.

**Estado real medido (2026-10-05), que es lo que hace que esto sea un bug de mensaje y no de esquema:** `schema_migrations` tiene **`047` con `resultado='aplicada'`** (433 ms, `2026-10-05T22:36:50Z`), y `parche_upgrades.usuario_id` **existe** (uuid, nullable, con FK a `usuarios(id)`). Es decir, **la rama no deberia entrar en el 503 en produccion**; si lo hiciera seria por otra causa, y el mensaje seguira senalando la migracion equivocada. Un 503 aqui es **mas una pista falsa que un diagnostico**.

**Correccion propuesta -- es EL TEXTO, NO EL NUMERO.** Dos opciones, ambas en `api/`, **ninguna aplicada en este pase** (es codigo, y este cierre es documental):

1. **Recomendada -- sacar el numero del mensaje.** Decir **que** falta, no **que migracion** lo declaro: `'Parche no disponible (esquema de upgrades de parche incompleto)'`. Con eso el 503 **no puede mentir** aunque la migracion que lo declare cambie, que es exactamente lo que ha pasado. Es la opcion que **sobrevive al proximo cambio de esquema**.
2. **Menor -- corregir el numero a `047`.** Arregla **este** caso y **crea la misma trampa dentro de unos dias**: en cuanto la **`049`** (la que hizo el `SET NOT NULL` **real**, ya aplicada) sea la que falte, el mensaje volvera a mentir. **No recomendado por si mismo.**
   - **[ACTUALIZACION 2026-10-05, medido]** este parrafo describia a la `048` como "la `NOT NULL`, escrita en disco y **todavia no aplicada**". **Las dos partes eran falsas:** (a) la `048` **si esta aplicada** (`resultado='aplicada'`, **282 ms**), y (b) **nunca hizo `SET NOT NULL`**: impone un `CHECK (usuario_id IS NOT NULL)`. **El `NOT NULL` real lo hizo la `049`** (`is_nullable = **NO**`, **308 ms**). El numero de este bug es, por asi decirlo, **el mismo bug que BUG-112/S12**: un mensaje que describe el estado con un numero que no lo describe.

**La leccion de por que el TEXTO es la correccion (y por que no un numero mejor):** *un mensaje de error que **nombra una causa por su numero** caduca en cuanto el esquema cambia, y caduca **en silencio**: sigue siendo un `503` perfectamente valido mientras apunta a la migracion equivocada.* Decir **que** falta --no **quien** lo declaro-- es la unica forma de que el mensaje **no pueda mentir**. Un `503` que dice "esquema de upgrades de parche incompleto" es **falso-positive-safe**: si el esquema esta completo, el mensaje no aparece; si aparece, el esquema esta incompleto **-sea cual sea la migracion que falte**.

**Por que NO se corrige en este pase.** El cierre documental de este mandato toca **solo** `exploraco desarrollo/*.md` y la nota de estado de la `047`. `api/` **no se escribe** en este encargo (R2, un unico pase documental), y meter un fix de codigo en el pase de cierre seria saltarse el gate de `@backend-dev` y el Escudo GOLD. **Queda ABIERTO** con la correccion escrita, para que `@backend-dev` la aplique en su propio encargo.

**Lo que este bug NO es.** No es un fallo de la economia, no es la `047` sin aplicar, y **no** invalida la atribucion del inversor: el motor funciona y el defecto real -- la inflacion de la `SUM` por miembro -- esta corregido y medido (`DECISIONS.md` **ADR-088** B4.1/B4.2). **El numero equivocado en un mensaje es una deuda de ergonomia de diagnostico, y se registra como tal.**

---

## BUG-112: Los TRES POST de sumideros (`slot_comprar`, `slot_baja`, `slot_rampa_avanzar`) estaban **MUERTOS desde su creacion** -- dos porteros los rechazaban **antes** del bloque funcional, y el sintimo era **indistinguible** del de una regla de negocio

**Severidad:** **ALTA de impacto funcional** (ningun usuario podia comprar un sumidero, y el sistema **parecia** funcionar) y **ALTA de coste de diagnostico** (produjo una hipotesis falsa que se creyo durante una sesion entera). **Estado: CERRADO** (reparado con lista cerrada de los 3 nombres; verificado en produccion).

**Contexto:** detectado y medido el 2026-10-05 al cerrar documentalmente la tanda de los sumideros. Encargado en `DECISIONS.md` **ADR-088 §B8**.

**El defecto, medido.** Los tres POST **nunca se ejecutaron con exito desde que se crearon**. No estaban a medias ni parcialmente: estaban **muertos por el portero**, porque **dos guard los mataban antes de llegar al bloque funcional**:

1. Un guard exigia **`destino_id`**, que los sumideros **no llevan**: es un campo de destino, no de sumidero.
2. Otro guard exigia una **lista cerrada de tipos validos** que **no incluia** los tres nombres nuevos.

El `400` se emitia **con sesion, saldo y `ref_id` validos** -- es decir, en el punto en que el usuario ya habia superado todo lo que el sistema podia justificar.

**Por que nadie lo noto (esta es la parte instructiva).** Los **0 filas en `sink_slots`** se explicaban en la sesion por una hipotesis de **"slots huerfanos"**. **Era falsa.** Los 0 filas se explicaban por **la puerta mal puesta**: si el portero no deja pasar a nadie, la tabla esta vacia y el sistema **parece** coherente. **Y el `400` de portero es indistinguible del `400` de saldo:** ambos son `400`, ambos llegan con sesion valida, y ninguno dice **quien** tiene el error. **El sintoma de un bug de cableado puede parecerse exactamente al de una regla de negocio**, y por eso la hypotesis reasonable (slots huerfanos / saldo insuficiente) era la **equivocada** y la evidentemente absurda (mi puerta esta mal) era la **cierta**.

**La leccion, escrita para que sobreviva al bug:** *ante un `400` unexplained que persiste, la primera pregunta **no** es de reglas de negocio: es **si la puerta acepta el caso que dice aceptar**.* Esa pregunta, hecha al principio, habria desmentido la hipotesis falsa antes de formularla.

**Reparacion:** lista cerrada con los **3** nombres de los sumideros en el guard. Verificado por HTTP en produccion el 2026-10-05: `?tipo=slot_catalogo` responde **200** y expone **3 de 4** sumideros como `comprable = true` (`foto_galeria`, `album_slot`, `portada_destino`), con `destacar_evento` **no comprable y con `motivo_soporte` explicito** (que es lo correcto: esa tabla no existe).

**NOTA DE TESTS (atadura que hay que conocer).** `smoke_036` comprueba el **literal del guard** por `indexOf`, es decir, **verifica el texto del guard y no su comportamiento**. Por tanto **el literal debe conservarse EXACTO**: reescribirlo deja el smoke **en rojo aunque el codigo este bien**. Se acepta la atadura a proposito -- un guard reescrito es un guard que hay que volver a mirar -- pero conviene saberlo para no "arreglar" el smoke rompiendo el codigo, ni al reves.

**Lo que este bug NO es.** No es un fallo del motor de sumideros (que funciona: `costo_siguiente` medido con **0 divergencias centima a centima** en 44 comparaciones), no es un fallo de saldo, no es la hipotesis de slots huerfanos, y **no** es deuda de UI (el boton no comprable de la UI **se corta antes de cualquier `fetch`**, medido: 3 clics -> **0, 0, 0** peticiones, que es exactamente el comportamiento correcto). **Es deuda de cableado: un `400` de un portero mal escrito que jamas se ejecuto.**

## BUG-113: `slot_catalogo` y `slot_mios` publicaban el disponible **crudo y sin `COALESCE`** -- un saldo que no era un saldo

**Severidad:** MEDIA (no cobraba de mas: la compra si fallaba, pero **la pantalla mentia**). **Estado: CERRADO** (verificado en produccion, `?tipo=slot_catalogo` y `?tipo=slot_mios` **200**).

**Contexto:** detectado y medido el 2026-10-05 al cerrar la tanda de sumideros. Encargado en `DECISIONS.md` **ADR-088 C1 (a)**.

**El defecto, medido.** Las dos ramas de solo-lectura del catalogo de slots exponian el disponible como `xp_total - xp_gastado_sinks`, **sin acotar** y **sin `COALESCE`**. Dos consecuencias, y las dos importan: (a) un gasto ya realizado podia dejar el disponible **negativo**, que en pantalla se lee como "me deben XP" cuando significa **"no queda nada"**; (b) con `xp_gastado_sinks` a `NULL`, la expresion no devolvia un numero malo, devolvia **`NULL`**, y un disponible que **no es numero** no se puede comparar con un coste.

**Por que es un bug y no una inconsistencia menor.** El resto del sistema **gasta contra saldo acotado** (los 11 puntos del clamp). **La misma pantalla que invita a comprar mostraba un numero con el que la compra iba a fallar**, y el usuario no tenia forma de saber cual de los dos era el bueno.

**Reparacion:** `GREATEST(xp_total - COALESCE(xp_gastado_sinks, 0), 0)` en ambas ramas -- **la misma forma canonica** que el clamp de los puntos de gasto.

**Lo que este bug NO es.** No es un fallo de cobro (el guard de cada punto de gasto ya acotaba), ni un error de `xp_total` (que es reputacion, ADR-018, y no baja al comprar), ni deuda de `slot_rampa`/`slot_catalogo` en su logica de precio. **Y no es lo mismo que el clamp de `disponible_restante` (C1 b), que SI se documento como defensa inalcanzable y NO se conto como bug corregido:** aqui el numero **salia** al cliente y por tanto **si se podia ver**.

## BUG-114: `tithe_parche` acreditaba fama a la pandilla **aunque el diezmo se hubiera rechazado** -- y el bug solo existia **despues** de arreglar el disponible

**Severidad:** **ALTA de impacto economico**: la pandilla cobraba fama por un diezmo que el usuario **no habia pagado**. **Estado: CERRADO** (verificado con `ROLLBACK`).

**Contexto:** detectado el 2026-10-05 al cerrar la TRAMPA 2 que el propio `ADR-088` B2.4 dejo abierta. Encargado en **ADR-088 C2**.

**El defecto, y por que el orden de los hechos es la parte instructiva.** El debito (`d`) y la acreditacion a la tesoreria de pandilla (`t`) disparaban **siempre juntos**, sin ninguna dependencia entre ellos. Se puso el guard al debito del diezmo (`xp_gastado_sinks` + disponible real, que antes se ignoraba). **Al condicionar `d`, `t` se quedo sin atar:** si no se le exigia que el debito **hubiera ocurrido**, **un diezmo RECHAZADO igual acreditaba fama a la pandilla**. Es decir: **la pandilla cobaba un diezmo que el usuario no habia pagado.**

**La leccion, escrita porque es mas util que el bug:** *cada vez que se anade una precondicion a la mitad de un par que se movia junto, la otra mitad deja de estar garantizada.* Un bug **imposible** antes del guard se hace **posible** por el guard. **La atadura no se rompe cuando se le quitan cosas: se rompe cuando se le anaden.**

**Reparacion:** la acreditacion queda condicionada a que el debito **SIEMPRE** haya disparado (`... AND EXISTS (SELECT 1 FROM d)`), dentro de la **misma sentencia** -- que es el unico sitio donde eso es garantizable.

**Comportamiento final medido, con `ROLLBACK`:** disponible **4900** / monto **500** -> **cobra** (500 movidos, fama +500) · disponible **200** / monto **500** -> **rechaza** (**0 movidos**, fama 0, `faltante=300` nombrado en el log) · `xp_total=1000`, `xp_gastado_sinks=800`, monto **500** -> **rechaza** (**0 movidos**; era el caso que daba **-300**) · usuario inexistente -> `disp_guard = -1`, **0 movidos**, **fail-closed**.

**Lo que este bug NO es, y es importante que quede escrito.** No es un fallo del calculo del diezmo (el **porcentaje** no se toco) ni de su naturaleza (**voluntaria**: **no se capea la ofrenda, se impide que el debito exceda el disponible**). Y **no es una regression de la UI**: `aplicarTitheParche` es **BEST-EFFORT TOTAL** (ADR-066), **no recibe `res`**, luego **no hay canal a la UI** y el faltante se nombra **en el log**. **Avisar el faltante a la UI exigiria otro sumidero: es una feature de producto, no una correccion** (deuda en `TASKS.md` TSK-192).

## BUG-115: `portada_destino` compra **sin `tipo_medio`**: pertenecer a **cualquier medio de un destino** compraba la portada de ese destino

**Severidad:** **ALTA de seguridad/autorizacion** (un usuario con un recurso de media menor compraba un recurso de otro nivel). **Estado: CERRADO** (verificado con `ROLLBACK`).

**Contexto:** detectado y medido el 2026-10-05. Encargado en **ADR-088 C3**.

**El defecto, medido.** La compra validaba `destino_id = $5::uuid` **ignorando `tipo_medio`**. Como la PK de `spot_duenos` es **compuesta** (`(destino_id, tipo_medio)`), pertenecer a **cualquier** medio de un destino bastaba para comprar **la portada** de ese destino. Con las **4 filas reales** (`general` = 2, `foto` = 2), un usuario con **solo `foto`** pasaba el guard. **Portada == `general`**: es el extremo de todo el destino, no un medio mas.

**Reparacion, y por que en la misma sentencia:** el `EXISTS` ahora exige `tipo_medio = 'general'`, **en la sentencia atomica** que valida y cobra. **Separar la comprobacion en una segunda consulta abriria una carrera** entre "comprobar que es dueno" y "cobrar".

**Medido, con `ROLLBACK`:** (i) solo `foto` -> **`ok = false`** · (ii) solo `general` -> **`ok = true`** · (iii) `general` de **otro** usuario -> **`ok = false`** · (iv) `general` + `foto` -> **`ok = true`** · (v) sin fila -> **`ok = false`**.

**Lo que este bug NO es, y por que el alcance es de UN solo sitio.** No hay "segundo caso" que arreglar en otro sumidero: `albumes` tiene PK `id` y `usuario_fotos` tiene PK `id`, y **ninguna de las dos tiene `tipo_medio`**. **El filtro por tipo solo aplica a `spot_duenos`.** Y no es un fallo de RLS: es un `EXISTS` incompleto. (Con RLS desactivado, ademas, el filtro de sesion es la **unica** frontera: ver **ADR-088 C5**.)

## BUG-116: `uq_sink_slot` era un `UNIQUE` que **no unificaba nada util** y ademas **rechazaba la compra legitima**

**Severidad:** MEDIA de integridad (no cobraba de mas, pero **una restriccion llamada "uq" prometia una garantia que no existia**). **Estado: CERRADO** (migracion `050` aplicada y medida en Neon).

**Contexto:** detectado y medido el 2026-10-05 antes de delegar la `050`. Encargado en `DECISIONS.md` **ADR-087 A3**.

**El defecto, medido.** La `046` declaro `uq_sink_slot UNIQUE (usuario_id, clave_accion, ref_id, creado_en)`. La cuarta columna es `creado_en`, cuyo `DEFAULT now()` es **un timestamp DE TRANSACCION** (estable dentro de la transaccion). **Dos insertions legitimas del mismo enganche en la MISMA transaccion comparten `creado_en` al segundo**, luego la restriccion las rechaza con **SQLSTATE 23505**.

**El hallazgo, en la forma que lo hace entendible: la restriccion no cubria el doble cobro y si rechazaba la compra valida.** Es **peor que inerte**: no hacia su trabajo y ademas estorbaba el caso bueno. Una "garantia" que solo produce falsos rechazos es exactamente el objeto que la gobernanza prohibe dejar.

**Reparacion:** la **`050`** la **sustituye** (no se apila encima) por un indice **UNICO PARCIAL** `(usuario_id, clave_accion, ref_id) WHERE activo = true`. **Parcial y no total** porque `slot_baja` **no devuelve XP** (`xp_devuelto: 0`): con unicidad total, quien pagara un recurso, lo diera de baja y quisiera volver a pagarlo recibiria `23505` en una operacion **legitima y ya cobrada**. Con el parcial, **dar de baja libera**.

**Medido en Neon:** `uq_sink_slot` **ausente** de `pg_constraint` **y** de `pg_indexes`; `uq_sink_slots_activo` **presente** con predicado `WHERE (activo = true)`; doble slot activo sobre el mismo `(usuario, clave, ref_id)` -> **`23505`**; baja y recompra -> **3/3 aceptada**. Fichero **ASCII-safe** (**0 bytes > 127**, **0 CR**, **241 LF**) e **idempotente**.

**Lo que este bug NO es.** No es un agujero de precio: el ciclo barato "dar de baja y recomprar al precio de k bajo" **es imposible**, porque el `k` que fija el precio lo asigna un contador que mira **todas** las filas, no solo las activas, y `slot_baja` **deja la fila**. Por eso la `050` **no toca ni el precio ni la asignacion de `slot_index`**: son economia de producto, no esquema.

## BUG-117: una cita de ADR **fabricada** en un encargo (`"ADR-3582"`) -- el fallo mas peligroso de un pase documental, porque no rompe nada: se propaga como verdad

**Severidad:** **ALTA de integridad de la gobernanza** (una decision inexistente queda citada con forma de decision real). **Estado: CERRADO / DESMENTIDO.** **La cita NUNCA llego a escribirse en ningun documento.**

**Contexto:** detectado el 2026-10-05 en el propio turno de cierre documental, al medir el encargo antes de documentar. Encargado en `DECISIONS.md` **ADR-087 A1**.

**El defecto, medido.** El encargo afirmaba que "`ADR-3582` documenta `spot_duenos` como la tabla del 'Dueno del Spot' multi-media de `spot_dividendo`". Medido: **`Select-String "3582" DECISIONS.md` -> 0 coincidencias.** La cadena "3582" **no aparece** en el documento. Lo que existe es una **linea** (3578 la decision, 3582 su impacto) **dentro del `ADR-065`**. Hay **87** cabeceras de ADR y la ultima es el **`ADR-088`**.

**Por que la cita era tan plausible -- y esa es la parte instructiva.** Casi todo lo que afirmaba era **verdad**: el `ADR-065` documenta `spot_duenos`, el bloque "Dueno del Spot" multi-media es real, y `spot_dividendo` **parecia** singular. **Lo unico falso era el numero**, y por eso el identificador fabricado **tenia la forma de uno valido**: un numero de linea pegado al prefijo `ADR-` produce algo indistinguible de una cita correcta. Ademas, la tabla real es **`spot_dividendos`** (plural): **`spot_dividendo` no existe**.

**Por que NO llego a escribirse (esta parte tambien es el procedimiento).** El cierre documental verifico el encargo **contra el fichero** antes de escribir nada, en vez de escribir y luego corregir. Una cita inventada en el documento de gobernanza es el peor fallo posible de un pase, porque **no falla: se lee como verdad y se propaga**. Y corregirla despues es mas caro que no escribirla.

**La regla que queda:** *un identificador de decision **no se valida por su forma, se valida contra la lista de decisiones**.* Si un `ADR-NNNN` no aparece como cabecera, **no se corrige "a ojo"**: se busca la seccion que contiene el hecho y se cita esa, **con la cita textual copiada literal del fichero** (ADR-006). Y es la misma regla hermana de **B2.3**: *una linea es una foto, no una direccion* -- aqui la foto se confundio con la direccion.

**Lo que este bug NO es.** No es un error de `DECISIONS.md` (el documento estaba y esta correcto), no es un ADR perdido ni renumerado, y **no hay nada que "arreglar" en codigo**. Es un fallo de **procedimiento de verificacion**, que es donde queda la leccion.

## BUG-118: `smoke_grupos_perfil.js` reporta `misAlbumRatingTxt is not defined` en la zona "Mis Álbumes" de `mi-perfil.html` -- FAIL **PRE-EXISTENTE**, no regresion de TSK-197

**Severidad:** **BAJA / de instrumentacion** (el render real en navegador funciona; el fallo es del arnes o de su ejecucion). **Estado: CERRADO / RESUELTO (2026-10-07).** **Corregido en el ARNES, no en el producto.**

**Contexto:** detectado el 2026-10-07 durante la verificacion de **TSK-197** (campo `desc` en las misiones). Round-trip `git stash`: contra **HEAD** el smoke marca **64/65**, **identico** con y sin los cambios de TSK-197. Por tanto **no es regresion**: es una **deuda previa**.

**El sintoma, medido.** `scripts/smoke_grupos_perfil.js` ejecuta **64/65** y su **unico FAIL** es `misAlbumRatingTxt is not defined`, en la superficie "Mis Álbumes". El simbolo **si esta definido** en el archivo real: `function misAlbumRatingTxt(rp)` en `mi-perfil.html:3393`, invocado desde `misAlbumesPintar` en `mi-perfil.html:3422`. El fallo aparece **solo bajo el arnes**: el round-trip demuestra que el archivo de HEAD lo dispara igual.

**Lo que NO se hizo:** **no se corrigio** y **no se aislo la causa raiz** (se desconoce si es el orden de los scripts inline extraidos, un error previo que aborta la ejecucion dentro del `vm`, o el alcance del `function` al ejecutar los bloques por separado). Lo que queda **afirmado y medido** es solo: (a) el FAIL existe; (b) es pre-existente; (c) el simbolo esta definido en el archivo real. **No se fabrica una causa que no se midio.**

**Deuda:** quien lo aborde debe **primero reproducir el FAIL contra HEAD** y **aislar si es defecto del arnes o del archivo**. Si es del arnes, la leccion es hermana de **BUG-098** (*producto correcto, instrumentacion incorrecta*).

**RESOLUCION (2026-10-07; BUG-118 CERRADO).** Confirmado el pronostico: la causa raiz era un **defecto del ARNES**, no del producto. `scripts/smoke_grupos_perfil.js` extrae funciones inline de `mi-perfil.html` **por NOMBRE** dentro de un `vm`; su array `nombres` extraia `misAlbumesPintar` pero **OMITIA su dependencia `misAlbumRatingTxt`** (`mi-perfil.html:3393`, invocada desde `misAlbumesPintar` en `mi-perfil.html:3422`). Bajo el `vm`, esa llamada lanzaba `ReferenceError` e interrumpia `correr()` en la seccion 6; el resultado se reportaba como la asercion #65 en 64/65. En el navegador ambas funciones **comparten scope global** y el render funciona -- de ahi que el sintoma solo existiera bajo el arnes.

**FIX (solo arnes):** `scripts/smoke_grupos_perfil.js:806-809` anade `'misAlbumRatingTxt'` al array `nombres`. **No se toco `mi-perfil.html`: el producto quedo INTACTO.** Es el mismo patron de la familia **BUG-098** (*producto correcto, instrumentacion incorrecta*).

**RESULTADO medido (ADR-006):** `node scripts/smoke_grupos_perfil.js` = **109/109 PASS, FAIL 0** (el contaje previo **64/65 estaba TRUNCADO**: al desbloquear las secciones 6-8 corren ~44 aserciones que antes no se ejecutaban, todas PASS). `npm run test` = **VERDE**; `node --check` **OK**; **ASCII-safe (0 bytes > 127)**. El producto (`mi-perfil.html`) no se modifico. Detalle de ejecucion en `TASKS.md` **TSK-200**.

## BUG-119: `smoke_auditoria_pagina_destino.js` reporta **9 FAIL** en la galería unificada (lightbox `lb-*`) y en el hero -- **PRE-EXISTENTES**, sin relación con ADR-091

**Severidad:** **BAJA / de instrumentación vs producto** (posible desalineación del smoke con el markup actual de `buildHTML()`; no bloquea). **Estado: ABIERTO (deuda registrada, NO arreglado en esta tanda).**

**Contexto:** detectado el 2026-10-08 durante la verificación local de **ADR-091 / TSK-201**. La feature **añadió código, no lo quitó** y sus 7 controles QA (incl. `buildHTML()`) pasaron: **0 fallos nuevos**. Estos 9 son **preexistentes** y **no constaban** en este documento.

**El síntoma, medido (reproducido corriendo el smoke en este turno).** El smoke marca **9 FAIL**, en dos bloques: (1) **lightbox (5):** `lbHTML VISIBLE (2+ fotos)`, `gal-thumbs tiene onclick abrirLightbox`, `lb-bg presente`, `lb-close presente`, `lb-prev + lb-next presentes`; (2) **hero (4):** `hero: HERO_ALL[0] = seleccion del usuario`, `miniatura 1 = mejor foto del espacio (curada)`, `miniaturas 2-3 = mejores de comunidad`, `exactamente 3 miniaturas` (`len=0`). Nota: el propio smoke declara (`smoke_auditoria_pagina_destino.js:115-116`) que el `#lb` se monta con galería curada o miniaturas del hero y que **ya no existe `<section id="fotos">`**, lo que apunta a que el arnés quedó **desalineado** con el markup posterior (familia **BUG-098**, producto correcto / instrumentación incorrecta), **no medido a fondo en este pase**.

**Qué NO se hizo:** **no se corrigió** ni se aisló la causa raíz. Queda afirmado y medido **solo**: (a) los 9 FAIL existen; (b) son **preexistentes** (ajenos a ADR-091: la feature añadió 0 a estos puntos y sus controles dieron 0 regresiones); (c) el smoke declara que el `#lb` se monta por otra vía. **No se fabrica la causa.**

**Deuda:** quien lo aborde debe **reproducir contra HEAD** y decidir si es **arnés desalineado** o **regresión real de `buildHTML()`**; hasta entonces, el smoke sigue siendo un gate **con ruido conocido**.

## BUG-120: `admin.html` conserva **7770 bytes > 127** (deuda **preexistente** de ADR-002) -- la feature ADR-091 añadió **0**

**Severidad:** **BAJA / deuda documental de ASCII-safe** (no rompe runtime; `admin.html` no es `api/*.js`). **Estado: ABIERTO (deuda conocida, NO arreglada).**

**Contexto:** medido el 2026-10-08 en el cierre de **ADR-091 / TSK-201**, al auditar ASCII-safety. El conteo real: **`[System.IO.File]::ReadAllBytes('admin.html')` -> 7770 bytes > 127**. Es **deuda preexistente** en líneas que **NO son de esta feature** (la feature añadió **0 bytes > 127**; su propio código nuevo quedó limpio).

**Lo que NO es:** **no es un fallo de la tanda ADR-091** ni una regresión: el mandato **ADR-002** de "cero bytes > 127" se exige históricamente a `api/*.js` y assets generados; `admin.html` acumula tildes/emoji directos de tareas anteriores. Se registra como **deuda conocida** para que no se confunda con un fallo del reclamo de propiedad.

**Deuda:** si se decide sanear `admin.html`, hacerlo como tanda propia de ASCII-safety (mapear cada byte > 127 a `\uXXXX`), no como parte de ADR-091.

## BUG-121: la tabla **`admin_usuarios` NO EXISTE** -- la moderación degrada a `resuelto_por = 'admin_secret'` y el UUID del admin se pide por prompt (deuda de trazabilidad)

**Severidad:** **MEDIA / de trazabilidad** (funciona, pero no se puede atribuir quién moderó). **Estado: ABIERTO (deuda declarada; ADR-091 ya la menciona como R1).**

**Contexto:** verificado el 2026-10-08 (`Select-String` sobre `db/migrations/*.sql` y `api/*.js`): la **única** aparición de `admin_usuarios` es un comentario de `db/migrations/055_reclamacion_propiedad_destinos.sql:56` que declara que la 055 **NO crea** esa tabla porque fue **verificada ausente**. `api/admin.js` autentica **solo** por `process.env.ADMIN_SECRET` y **no sabe qué admin es**.

**Consecuencia, medida:** para la moderación de reclamos (ADR-091), `resuelto_por` no puede tomar el UUID real del moderador y **degrada a `'admin_secret'`**; el panel de `admin.html` **pide el UUID del admin por prompt** para poder dejarlo en el registro.

**Lo que NO es:** no es un bug de ADR-091 (el ADR lo **declara** como riesgo **R1** y elige degradar de forma honesta en vez de inventar un id). Es una **ausencia de esquema** que solo se cierra creando la tabla (o un mecanismo de identidad de admin) en una tanda futura.

## BUG-122: off-by-one documental -- los comentarios dicen "**13 call-sites**" de `aplicarDividendoSpot` cuando el conteo real es **12**

**Severidad:** **BAJA / documental** (un comentario; cero efecto funcional). **Estado: PARCIALMENTE RESUELTO (2026-10-08).**

**Contexto:** detectado en el cierre de **ADR-091 / TSK-201**. Conteo real verificado (ADR-006) sobre `api/interacciones.js`: **12** invocaciones `await aplicarDividendoSpot(sql, {` (`:11240`, `:11512`, `:11900`, `:13742`, `:15606`, `:15615`, `:15731`, `:15740`, `:15987`, `:15995`, `:16121`, `:16129`), **no 13**. La cifra "13" aparecía en 4 lugares.

**Lo resuelto en este pase:** corregido el **número** en el comentario `api/interacciones.js:1413` ("Los **12**"). Cambio **solo de comentario**, ASCII-safe, sin tocar lógica.

**Lo que queda (NO tocado, `SIN_CONFIRMAR` si es typo o incluye un call-site externo):** `api/interacciones.js:1241` (comentario de la feature) y el **título/cuerpo de `ADR-091`** (`DECISIONS.md:7622` y `:7690`, "cero cambios en los 13 call-sites"). El ADR **no se reescribe** en este pase (R2: solo estado). **Deuda:** decidir en un pase documental si se unifica la cifra a **12** en esos 3 puntos (el ADR requeriría autorización explícita del operador, por ser texto de decisión).

**LECCIÓN:** los conteos citados en comentarios y ADRs deben **medirse contra el archivo real** (ADR-006); "el número que se repite en 4 sitios" no es más verdadero por repetido (familia **BUG-117**, cifras/citas no verificadas que se propagan como verdad).

## BUG-123: el widget de calificación 1-5 era **INVISIBLE** en los 3 modales -- doble piso de opacidad en el silo CSS (alfa efectivo ~0,10, contraste 1,1:1 a 1,3:1)

**Severidad:** **ALTA / de usabilidad, con reporte del operador** ("no aparece nada y no hay donde clicar"). **NO era funcional:** el DOM, el listener (`MediaActions.bind()`) y el POST **`media_voto` funcionaban**. **Estado: CERRADO (2026-10-09), corregido y verificado local; SIN commit y SIN desplegar en el momento del cierre.** Detalle de ejecución en `TASKS.md` **TSK-203**.

**Contexto:** el widget de calificación de medios 1-5 (ADR-089) se kabeló en `galeria.html`, `comunidad.html` y `mi-perfil.html`, cada uno con su silo CSS bajo `[data-ma-voto]`. Al cerrar ADR-089 quedó escrito el punto (e) de `NEXT.md`: **"el render de las 5 estrellas NO se ha visto en un navegador real; el Escudo GOLD es estático y no renderiza"**. **Ese aviso se cumplió:** el defecto era exactamente del tipo que la red de seguridad no puede ver.

**Causa raíz, medida contra `HEAD`:** el silo **multiplicaba opacidades** en el estado "sin nota". Existía una regla de **grupo** `.ma-estrellas.is-empty{opacity:.62}` y otra de **glifo** `.is-empty .ma-estrella{opacity:.2;transform:scale(.9)}` -> **0,62 x 0,2 = 0,124**. Como el **color lo heredaba el contenedor** (`.g-act rgba(255,255,255,.82)`, `.av-act rgba(255,255,255,.62)`, `.pf-museo-btn.ghost rgba(255,255,255,.7)`), el **alfa efectivo final** era **0,102 / 0,077 / 0,087**; sobre `--black #0F1419` eso da **1,1:1 a 1,3:1**. Se sumaban `font-size:12px`, `transform:scale(.9)` y un **`cursor:default`** en `.ma-estrella` que **anulaba** el `cursor:pointer` del contenedor (el ratón no daba ninguna señal de que ahí se podía clicar).

**Lo corregido (3 silos, todo bajo `[data-ma-voto]`, `:root` intacto por ADR-004):** regla de grupo **eliminada** (un solo piso de opacidad); alfa efectivo del glifo **~0,10 -> 0,84** (**contraste 9,09 / 5,65 / 6,90** en reposo y **12,56 / 7,55 / 9,36** en hover, piso AA **4,5:1**); `cursor:default` -> `cursor:inherit`; `12px` -> `14px` (**13px** en `mi-perfil.html`) con área de clic agrandada por `padding` + `margin` negativo para no crecer el botón. **Intactos:** `.is-on`, `.is-preview`, `:focus-visible`, `.is-hover`, `is-busy`, `aria-disabled`. **Sin variables CSS nuevas.** `api/` **sin tocar**: **8/8 INTACTO**, cero migración, cero endpoint nuevo.

**Defecto oculto que se arrastró (familia BUG-098):** al eliminar la regla de grupo se destapó que **la propia regla que se odiaba tapaba el preview y la nota real**: `.is-empty .ma-estrella` (**0,4,0**) ganaba a `.is-preview` y a `.is-on` (**0,3,0**), luego en estado vacío **el preview era invisible**. El arreglo usa `:not(.is-on):not(.is-preview)` para que el piso aplique **solo** al glifo realmente vacío. **Este segundo defecto existía en `HEAD` y nadie lo había visto** -- prueba de que la cadena de ocultación era de dos capas.

**Red de seguridad nueva:** `scripts/smoke_090_contraste_calificacion.js`, **7 checks, local, sin red, sin escrituras**. **Comando: `node scripts/smoke_090_contraste_calificacion.js`** -> **7/7 PASS, exit 0** (medido en este turno). Cubre doble piso de opacidad, alfa mínimo, ausencia de `cursor:default`, **contraste en reposo y en hover >= 4,5:1** en las 3 superficies, aislamiento bajo `[data-ma-voto]` y consistencia entre los 3 silos.

**El arnés también tuvo bugs propios, y se demostraron:** durante su construcción se detectó que el resolvedor de cascada **no contaba pseudo-clases** y **no desempataba por línea**, con lo que el **gate era ciego al valor de hover** (el check 7 no podía fallar). Corregido con `:hover` como clase y desempate por **número de línea real** (`lineaMap` + `lbase`). **Se probó reinyectando el bug original: el smoke reportó contraste 1,31:1 y 4 checks FAIL.** *Un gate que nunca se ha visto en rojo no es un gate.*

**LO QUE ESTE BUG NO CIERRE (deudas vivas, no regresiones):**
1. **La ficha de destino sigue SIN widget:** `api/pagina-destino.js` no carga `media-actions.js` ni emite `data-ma-voto`; su namespace `data-media-*` (`mediaRatingAttrs()`, `:1771-1776`) es **namespace muerto**. Superficie **nueva**: requiere `@renderer-dev` (**con gate**) y las **8/8 serverless agotadas**.
2. **`mapa-cultural.js` es un emisor muerto:** emite los `data-ma-*` pero **nunca llama a `bind()` ni a `sync()`**.
3. **`media-actions.js` no refresca el JWT tras un `401`** (`media-actions.js:455`): solo `pedirLogin()`. Afecta a sesiones con token caducado. **No tocado porque no se ha reproducido.**
4. **El widget nunca pinta el promedio de la comunidad, solo la nota propia** (`media-actions.js:333-345`). **Decisión de producto, no defecto** (ADR-089).

**LECCIÓN (patrón nuevo, gemela de BUG-098):** **un `opacity` en el grupo y otro en el hijo se multiplican, y el color heredado del contenedor multiplica otra vez.** El alfa efectivo de un glifo **no es el número que está en su regla**: es el producto de todas las dimensiones de alfa que le llegan. Con tres multiplicadores, un valor "razonable" (.2) se convierte en invisible (.124) sin que ningún número del CSS parezca anómalo. **Corolario de verificación:** todo smoke de contraste debe resolver la cascada real (herencia + multiplicación + desempate por línea), no leer el `opacity` de la regla; y **debe haber visto su propio bug en rojo alguna vez** -- aquí se demostró reinyectando el original. **Y el aviso previo era exacto:** un red de seguridad estática documenta que no renderiza, y el defecto que se coló por ahí estaba **anunciado por escrito**.
