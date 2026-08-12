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

