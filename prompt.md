# PROMPT OPENCODE — TSK-159 "Pasaporte + Billetera QR + Subida de medios v2 + Bugs de UI"

> Pegar completo en OpenCode (agente orquestador). Fecha de redacción: 2026-09-29.
> Baseline: ADR-068 (Vercel Blob client upload) ya IMPLEMENTADO en working tree. Última migración conocida: 040. Último TSK: 158. Último ADR: 068. **Verifica los números libres con `ls db/migrations`, `git grep "^## ADR-"` y `git grep "TSK-15"` antes de nombrar nada.**

---

## 0. Rol y forma de trabajo

Eres el orquestador (Capa 0 de ADR-067) del proyecto ExploraCO. Trabajas sobre el repositorio real: **el archivo real es la única fuente de verdad (ADR-006)**; nunca confíes en números de línea de documentos, en el historial de chat ni en lo que este prompt afirme sin verificarlo con `grep`/`view`. Si algo de este prompt contradice el código, gana el código y lo reportas.

Antes de escribir código:
1. Lee `PROJECT.md`, `BLUEPRINT.md`, `DECISIONS.md` (ADR-018, 024, 025, 028, 036, 042, 045, 051, 053, 055, 058, 061, 068), `BUGS_HISTORICOS.md` (BUG-054/053/061/082) y `NEXT.md` vigente.
2. Haz UN solo lote de preguntas (sección 9) y espera respuesta. Para cada pregunta propón un **default recomendado** para que Javier solo responda "ok" o corrija.
3. Divide el trabajo en las 4 fases de la sección 8 y entrega/verifica fase por fase.

---

## 1. Reglas duras (no negociables)

Reglas de Oro ExploraCO v5 + brief gaming:

1. **8/8 endpoints serverless, tope consumido.** CERO archivos nuevos en `/api/`. Todo backend nuevo entra como rama `tipo=` (GET) o `tipo2=` (POST) dentro de `api/usuarios.js`, `api/interacciones.js`, `api/admin.js` o `api/utilidades.js`. (Archivos nuevos en la raíz del frontend como `media-upload.js` sí están permitidos.)
2. **ASCII-safe absoluto en `api/*.js`:** 0 bytes > 127, 0 backticks (template literals prohibidos también en comentarios), 0 tildes/ñ/emojis. Escapes Unicode simples `\u00f1`; doble escape `\\uXXXX` es bug. Verifica con grep de bytes > 127 y de backtick en cada archivo tocado.
3. **Driver:** solo `@neondatabase/serverless` con `neon()`. Nunca `pg`/`Pool`. **CommonJS estricto** (`require`/`module.exports`). El driver HTTP de Neon no soporta `FOR UPDATE` interactivo: operaciones que deban ser atómicas (cupo de 10 fotos, débito de XP, canje) van en **una sola sentencia SQL con CTEs**.
4. **JSONB = merge (`COALESCE(campo,'{}'::jsonb) || jsonb_build_object(...)`), nunca reemplazo.** Cero borrado físico: siempre `activo=false`. IDs lógicos existentes permanecen en el HTML aunque no se vean.
5. **Todo `try/catch` loguea con `console.error` y responde** `{ success:false, error:string, code:string }`. Cero catch silencioso. Códigos en español, mayúsculas (ver catálogo de códigos estándar del brief).
6. **Migraciones:** una sola migración nueva, acumulativa, idempotente (`IF NOT EXISTS`, bloques `DO $$`), ASCII-safe, en `db/migrations/NNN_nombre.sql`. Se aplica con `node scripts/apply_sql_file.js <archivo>` (NO la apliques tú contra producción: entrégala y deja el paso operativo documentado para Javier).
7. **Frontend:** HTML/CSS/JS vanilla, sin frameworks. **CSS aislado (ATOMIC)** bajo un selector padre único con reset de silo. **Iconos solo `<svg>` íntegros**, nunca fuentes de iconos. Tipografía: Barlow Condensed (títulos), Geist 900 (valores numéricos/indicadores técnicos). Elementos interactivos con `onclick` inyectado físicamente en el HTML. Validar `window.ExploraCO` antes de invocar red.
8. **`admin.html` (~7.800 líneas): SOLO ediciones vía script Python con `str.replace()` de coincidencias exactas** (asegurando que cada patrón aparece exactamente 1 vez), más validación de balance de `<div>` y cierre de `<!-- -->`. Nada de ediciones manuales masivas.
9. **Escudo GOLD antes de cada entrega:** `node --check` a cada `.js`, ASCII-safety de `api/*.js`, balance de `<div>` en cada HTML tocado, y los 5 latidos de consola (INFO, DEBUG, LINK, TRACE, TIME) donde aplique al patrón existente.
10. **Cada cambio con smoke/test:** ejecuta la suite existente (`npm test`) y añade smokes nuevos en `scripts/`. Si un test preexistente falla por expectativas desactualizadas (p. ej. `test_logros_catalogo.js` espera 30 logros), actualízalo y déjalo anotado; no lo ignores.
11. **Documentación en UN solo pase al cierre (R2 de ADR-067):** ADR-069 (y los que hagan falta), TSK-159..n en `TASKS.md`, entrada en `NEXT.md`, bugs nuevos en `BUGS_HISTORICOS.md`, actualización de `PROJECT.md`/`BLUEPRINT.md`. No documentes por fases.
12. **Nada de pegarle a la base de producción** ni inventar datos. Los seeds/fixtures van en migración o smoke con mock de `sql`.

---

## 2. Bugs de UI (Fase A — hacerlos primero, son los que rompen la experiencia hoy)

### A1. Subida de foto de perfil: al terminar muestra el LINK en vez de una confirmación
- **Síntoma:** tras subir la foto de perfil (ADR-068, `media-upload.js` + `mi-perfil.html`), lo que ve el usuario es la URL del blob.
- **Objetivo:** al finalizar, mostrar confirmación clara y no técnica: miniatura de la foto ya subida + mensaje tipo "Foto de perfil actualizada" (toast/estado con SVG de check), y el peso final. **La URL nunca se muestra al usuario** (puede guardarse en un campo oculto o en estado JS).
- **Diagnóstico requerido:** localiza dónde `media-upload.js` devuelve la URL y qué la pinta (probablemente un input/`textContent` que recibe el resultado). Corrige la causa, no maquilles.
- **Auditoría transversal:** revisa TODAS las superficies con subida de ADR-068 (Museo, álbum, portadas, foto de perfil, destino, hero/galería/cartas del admin, `publicar.html`) y aplica el mismo patrón de confirmación donde también se muestre la URL cruda. En `admin.html` la URL puede seguir visible para el admin (es herramienta técnica) pero añade además la confirmación; edición vía Python.
- **Criterio de aceptación:** ningún flujo de usuario final (no admin) muestra una URL `https://...blob...` como resultado de una subida.

### A2. Botón "Estuve aquí" no queda seleccionado en lugares ya visitados
- **Contexto:** `pagina-destino.js` genera el HTML del servidor (SSR, `Cache-Control: no-store`) y es anónimo: no sabe quién es el usuario. La visita se registra con `POST tipo=visita` (JWT + nonce + `device_hash`, ADR-025/033) y se quita con `quitar_visita` (`activo=false`, ADR-003).
- **Objetivo:** al cargar la página del destino (y en cualquier otra superficie que muestre el botón: listados, mapa/drawer, `mi-perfil`), el botón debe reflejar el estado real: **activo/seleccionado si el usuario ya tiene una visita activa a ese destino**. También debe pasar a "seleccionado" inmediatamente tras una visita exitosa y tras un `409 DUPLICATE`.
- **Implementación esperada:** hidratación en cliente tras leer la sesión (`window.ExploraCO.usuario`): reutiliza el endpoint de lectura de visitas del usuario si existe (búscalo en `api/interacciones.js`: perfil/progreso/visitas); si no existe, añade una rama GET mínima (`tipo=mis_visitas_ids` o similar) que devuelva solo IDs de destino con `activo=true` y requiera sesión. **No expongas visitas de otros usuarios.** Respeta el contrato de interactividad física (`onclick` inyectado por el servidor en el HTML del botón; la hidratación solo cambia clase/estado/`aria-pressed`).
- **Ojo:** verifica primero por qué no queda seleccionado (¿no se consulta el estado? ¿se consulta y no se pinta? ¿el ID/slug no coincide? ¿se pierde por el refresco de sesión BUG-053?). Documenta la causa raíz como BUG nuevo.
- **Criterio de aceptación:** smoke que simule (mock) usuario con visita activa → botón renderiza seleccionado; sin visita → no seleccionado; tras `quitar_visita` → deselecciona.

### A3. El mapa no carga (se ven pines, no el mapa base)
- **Contexto:** desde ADR-045 el mapa usa el motor compartido `MapaCultural` (Leaflet, tiles CARTO Voyager, clustering 40 px) en `index.html`, `mymapa.js`/`comunidad.html` y mapas de `mi-perfil`. Pines sin tiles = Leaflet funciona pero la capa base falla o el contenedor está mal medido.
- **Diagnóstico obligatorio (no adivines):** reproduce y revisa, en este orden: (1) ¿se carga el CSS de Leaflet (`leaflet.css`) con la misma versión que el JS? (2) ¿existe `L.tileLayer(...).addTo(map)` en el motor compartido tras la migración? (3) errores de red/CSP en las peticiones a `*.basemaps.cartocdn.com` — revisa `vercel.json` (¿hay headers `Content-Security-Policy` o `img-src` que bloqueen tiles, añadidos con ADR-068 o antes?) (4) tamaño 0 del contenedor / falta `invalidateSize()` tras mostrar la pestaña (ver BUG histórico en `BUGS_HISTORICOS.md` ~L1172) (5) uso de `{r}`/subdominios `{s}` correctos, (6) atribución/límites del proveedor.
- **Fix:** corrige la causa raíz. Añade un **fallback**: escuchar `tileerror` y, si los tiles base fallan repetidamente, conmutar a un proveedor alternativo con política de uso apta para producción (evalúa y justifica; no uses el servidor tile estándar de OSM para tráfico real si su política lo desaconseja). Nunca dejes el mapa sin base sin avisar: si todo falla, mensaje visible con reintento.
- **Alcance:** verifica TODAS las superficies con mapa (index, comunidad, mi-perfil, `map-picker.js`, admin) — el síntoma puede ser común o solo de una.
- **Criterio de aceptación:** los tiles cargan en todas las superficies; smoke estático (`scripts/smoke_mapa_cultural.js`, hoy 58/58) sigue verde y se añade un chequeo de que el motor registra la capa base y el CSS.

---

## 3. Pasaporte, fecha de nacimiento, fotos de perfil (máx. 10), billetera QR e insignia (Fase B)

> Estos requisitos son nuevos. No existe hoy un concepto "Pasaporte" en el código: proponlo como **checklist de completitud del perfil** en `mi-perfil.html`, alimentado por el estado real del usuario.

### B1. Pasaporte = perfil completo
- Define y muestra un **progreso del Pasaporte** (barra + lista de campos con check SVG). Campos mínimos obligatorios (confírmalos en la sección 9): nombre/alias, **fecha de nacimiento**, foto de perfil, ciudad base / país base (ya existen `ciudad_base`/`pais_base`; ojo: cambiar ciudad/país fija `origen_declarado_en`, ADR-058), email verificado (`email_verificado`), y otros que ya existan en el perfil.
- **Fecha de nacimiento (NUEVA):**
  - Columna `usuarios.fecha_nacimiento DATE NULL` (migración idempotente). Validación **servidor** (no solo cliente): fecha válida, no futura, edad mínima configurable (default propuesto: 13 años; pregunta a Javier por el criterio legal de menores en Colombia/Ley 1581), máximo razonable (120 años).
  - **PII sensible:** NUNCA en `perfil_publico`, museo público, leaderboards ni `?buscar=`; solo devuelta al dueño con sesión válida (ADR-028: blindaje PII owner-aware, BUG-049). Añade prueba que verifique que no aparece en la proyección pública.
  - Se guarda vía la rama existente de edición de perfil (`perfil_actualizar`/`perfil_editar` en `api/usuarios.js`) con merge/actualización puntual, sin reemplazar otros campos. Una vez fijada, cambios posteriores limitados (propón regla: editable solo 1 vez o con cooldown; consulta).
- **Al completar el Pasaporte (todos los campos en verde, evaluado en servidor, no en cliente):**
  1. Otorga una **insignia** (ver B4).
  2. Crea (idempotente) la **billetera digital + QR** (ver B3).
  3. Muestra un estado de celebración en UI (SVG, sin emojis del sistema).
- La completitud se calcula **server-side** para evitar que el cliente se la autoconceda.

### B2. Fotos de perfil: máximo 10
- Hoy solo existe `usuarios.foto_url` (una foto). Crea tabla `usuario_fotos` (`id UUID`, `usuario_id`, `url`, `orden INT`, `es_principal BOOL`, `peso_bytes INT`, `activo BOOL DEFAULT true`, `creado_en`) con índice parcial `WHERE activo=true` y, si aplica, unicidad parcial de una sola principal activa por usuario.
- **Tope de 10 fotos ACTIVAS por usuario, forzado en el servidor y de forma atómica** (un `INSERT ... SELECT ... WHERE (SELECT count(*) FROM usuario_fotos WHERE usuario_id=$1 AND activo=true) < 10` en una sola sentencia; si inserta 0 filas → `409` con código `LIMITE_FOTOS_PERFIL`). No confíes en el contador del cliente.
- Al marcar una como principal, actualiza `usuarios.foto_url` (compatibilidad con todo lo que ya lee `foto_url`: leaderboard, avatar en chat, museo). "Eliminar" = `activo=false` (Cero Borrado); si se desactiva la principal, promueve la siguiente activa o deja `foto_url` según regla que propongas.
- UI en `mi-perfil.html`: galería de fotos del perfil con contador "N/10", marcar principal, reordenar (opcional), quitar. Cada subida usa el flujo de subida de la sección 4 (con optimización y confirmación sin URL).
- Autorización: la URL registrada debe pertenecer al prefijo de blob del usuario (ADR-068 exige prefijo obligatorio por usuario/admin); valida en servidor que la URL recibida corresponde al store y al prefijo del usuario autenticado.

### B3. Billetera digital + QR (canje de puntos en establecimientos)
Concepto de producto: al terminar el Pasaporte, el usuario recibe una **billetera** vinculada a un **QR** que en un establecimiento permite **canjear puntos (XP) por productos**.

**Restricciones de diseño (léelas antes de proponer nada):**
- **ADR-018:** `xp_total` es la moneda ÚNICA del juego. La billetera NO es una moneda nueva ni un saldo paralelo: es una **identidad + método de canje** sobre el `xp_total` existente. No confundir con la moneda secundaria `CDR` de ADR-061 (`moneda_ledger`), que es aparte. **Prohibida la conversión a dinero real.** Señala en el ADR el riesgo regulatorio/legal en Colombia si algún día los puntos se cambian por productos de terceros (y pregunta a Javier).
- **ADR-042 ya definió la base del canje de marca:** `consumibles.marca_id`, `stock_total`, `stock_usado`, `precio_xp_base`/`precio_xp_actual`, `tipo_canje` (`qr`/`codigo`/`ticket`) y el módulo de Marcas (`marcas`, `patrocinios`; `marca_activar` con gate de nivel). **Reutiliza ese modelo** para el catálogo canjeable del establecimiento; no inventes un catálogo paralelo. Verifica en el repo qué de eso está realmente aplicado (migración 027 aplicada; revisa 034/035 y 039/040).
- **ADR-053:** el patrón de ledger es append-only (`xp_ledger`). El canje debe registrar un movimiento negativo trazable, con contexto (billetera, marca, producto).
- **Seguridad del QR (crítico):**
  - El QR **NO debe contener el `usuario_id` ni datos personales en claro.** Debe codificar un **token firmado de vida corta** (patrón HMAC SHA-256 de `firmarSesion`, con `typ:'billetera'`, `exp` de ~60-120 s, un `jti`/nonce de un solo uso). Se refresca automáticamente en pantalla.
  - El establecimiento (usuario con Marca activa y sesión JWT) escanea/introduce el token → el servidor lo valida, lo consume atómicamente (un solo uso, patrón de `geo_nonces`), verifica saldo de XP, stock y estado de la marca, y ejecuta el débito en **una sola sentencia CTE** (débito de `xp_total` + inserción en ledger + `stock_usado + 1` + registro de canje), con `409/402` (`PUNTOS_INSUFICIENTES`) sin efectos parciales.
  - Anti-fraude: tope diario de canjes por billetera, cooldown, y la marca solo puede canjear sus propios consumibles (`marca_id`). Sin autocanje (dueño de la marca ≠ titular de la billetera).
  - **Genera el QR localmente (librería QR pequeña y vendorizada/ASCII-safe o cdnjs con versión fija). NO uses `api.qrserver.com` para este QR**: hoy el QR de referidos lo usa (`mi-perfil.html` ~L1801) y enviaría el token a un tercero. Propón migrar también el QR de referidos al generador local (deuda de privacidad menor; pregunta antes de tocarlo).
- **Modelo de datos sugerido (una sola migración, junto con las demás de esta tarea):** `billeteras(id, usuario_id UNIQUE, codigo_publico, estado, creada_en, activo)` y `canjes_billetera(id, billetera_id, marca_id, consumible_id, xp_debitado, estado, creado_en)` append-only; más los índices parciales. Ajusta al esquema real y a lo ya existente.
- **Ramas de API (sin archivos nuevos):** `GET tipo=billetera_mia` (sesión; devuelve estado y un token QR fresco; crea la billetera si el Pasaporte está completo y no existe, de forma idempotente `ON CONFLICT DO NOTHING`), `POST tipo=billetera_canje` (sesión de la MARCA + token QR + `consumible_id`). Dónde vivan (`usuarios.js` vs `interacciones.js`) decídelo según dónde ya viven Marcas y consumibles, y justifícalo en el ADR.
- **UI:** en `mi-perfil.html`, tarjeta "Mi billetera" con el QR (SVG/canvas), saldo de XP legible (Geist 900), estado del token con cuenta regresiva, y el historial de canjes. UI mínima de "Escanear/Canjear" para dueños de Marca (puede ser entrada de código manual si escanear por cámara excede el alcance; consulta).
- **Alcance MVP recomendado (confírmalo):** crear billetera + QR firmado + validación/canje servidor con un consumible de marca de prueba + historial. Escaneo por cámara y flujos avanzados para una fase posterior.

### B4. Insignia por Pasaporte completo
- Reutiliza el sistema de logros existente (catálogo de logros en `api/interacciones.js`: grupos/tiers bronce-plata-oro-platino, `check(ctx)` server-side, rareza global en runtime). Añade un logro (p. ej. `logr_pasaporte_completo`) cuyo `check` dependa del estado real del Pasaporte, otorgado de forma **idempotente** y con merge sobre `progreso_logros` (nunca reemplazo).
- Decide con Javier si otorga XP y de qué monto (pregunta en sección 9); si otorga XP, pasa por los helpers de XP canónicos (`calcularXpFinal`/ledger) y por `repartirXpReferidos` si corresponde a la whitelist de acciones, no con un `UPDATE xp_total` ad hoc que salte contadores/ledger.
- Actualiza los tests que fijan el conteo del catálogo de logros y los espejos frontend (busca dónde se listan los logros en `mi-perfil.html`).
- UI: mostrar la insignia en el perfil y en el momento de completar.

---

## 4. Subida de medios v2: galería + primera pantalla de "Mi perfil" + optimización (Fase C)

### C1. Galería de fotos ↔ Vercel Blob
- Identifica **todas las galerías de fotos** (galería del álbum/Museo en `mi-perfil.html`, galería de Comunidad, `#galeria` de `pagina-destino.js`, galería/hero en `admin.html`) y verifica cuáles NO están conectadas al flujo de subida de `media-upload.js` (ADR-068). Conéctalas todas. No dupliques el cliente: reutiliza `media-upload.js` (`window.MediaUpload` o su API real; léela primero).
- Mantén las autorizaciones de ADR-068: prefijo obligatorio por usuario/admin, tope por tipo (foto 5 MB / audio 15 MB / video 30 MB) y el modo de subida anónima solo para foto principal de destino. Cualquier cambio de límites requiere pregunta.

### C2. "Mi perfil": opción de subir archivos en la PRIMERA pantalla
- Al abrir `mi-perfil.html`, en la primera vista visible (above the fold, antes de cualquier tab secundario), debe haber un bloque prominente **"Subir archivos"** (foto/audio/video) que abra el flujo de subida completo (C1 + C3 + C4) sin tener que navegar por pestañas. Respeta CSS aislado, SVG propios y tipografías del sistema. Debe funcionar en móvil (la mayoría de los usuarios).

### C3. Optimización de archivo y peso ANTES de subir
Objetivo: no desperdiciar almacenamiento ni ancho de banda del store de Blob.
- **Imágenes (obligatorio):** en el cliente, antes de pedir el token, redimensionar con `canvas`/`createImageBitmap` a un máximo de lado largo razonable (propón 1600 px para galería y 512-800 px para foto de perfil), re-codificar a **WebP** (fallback JPEG si el navegador no soporta WebP) con calidad ~0.8, respetar orientación EXIF, **eliminar metadatos EXIF (incluye GPS: privacidad)** y no ampliar nunca imágenes pequeñas. Si el resultado optimizado pesa más que el original, sube el original. Mostrar al usuario "Tamaño original -> optimizado" y ahorro. Gestionar GIF animado y SVG explícitamente (no rasterizar animaciones sin avisar).
- **Audio/Video:** no se puede comprimir bien en JS vanilla sin librerías pesadas. **No agregues ffmpeg.wasm ni dependencias grandes sin preguntar.** Mínimo: validar tipo y peso contra los topes antes de subir, mostrar progreso, generar un **póster** (frame) ligero para video y usar `preload="none"`/`loading="lazy"` al mostrarlos. Presenta 2-3 opciones para compresión real de video/audio con su costo/beneficio y pregunta.
- **Servidor:** ajustar el `onBeforeGenerateToken` de `?tipo=blob_upload` para que el tope de tamaño y los `allowedContentTypes` estén alineados con lo optimizado, y usar `cacheControlMaxAge` largo para activos inmutables. Evaluar reemplazo de foto de perfil: si se reemplaza, considerar borrar el blob anterior (requiere `del` del SDK en el servidor con el token de lectura/escritura; decide con Javier si se implementa ahora o queda como deuda [DEUDA-EXPRESS], porque "Cero Borrado" aplica a filas de BD, no necesariamente a blobs huérfanos).
- Todo el código de optimización vive en `media-upload.js` (un solo lugar) para que todas las superficies la hereden.

### C4. Al subir un recurso: vincular ubicación (buscador de ítems)
- Tras una subida exitosa (y también al editar), mostrar el paso opcional **"Vincular ubicación"** con un **buscador** (input con autocompletado, debounce, teclado y móvil) sobre los **ítems del catálogo referidos** (destinos: Sitio/Hostal/Comida/Evento/Blog según corresponda; consulta cuáles entran en "items referidos" en la sección 9). Al elegir un ítem se guarda el vínculo y sus coordenadas.
- **Reutiliza lo que ya existe:** ADR-051 (ubicación individual por recurso de `album_fotos`: pin por video/foto, `scope=mio`), `map-picker.js` (TSK-117) como alternativa "elegir en el mapa", y el listado/filtros de `api/destinos.js` (o su rama de búsqueda) como fuente del buscador. Si el esquema actual solo guarda `lat/lng` y no un `destino_id`, agrega la columna (`destino_id`/slug nullable) en la migración; que un recurso pueda tener ubicación por ítem, por mapa o ninguna.
- La búsqueda debe devolver pocos campos (id, nombre, ciudad, categoría, lat/lng) y estar **acotada** (límite de resultados, mínimo 2-3 caracteres) para no exponer todo el catálogo ni saturar la función.
- Autorización: un usuario solo vincula ubicación a SUS recursos (`ALBUM_AJENO`-style). Coordenadas fuera de Colombia/(0,0) → rechazo, igual que el resto del sistema.
- Consistencia con el mapa (A3): un recurso con ubicación debe aparecer en la capa de media del mapa personal y cultural sin romper el clustering.

---

## 5. Base de datos (una migración, idempotente, ASCII-safe)

Propón UN archivo `db/migrations/NNN_pasaporte_billetera_fotos.sql` (NNN = siguiente libre tras verificar) que incluya, solo lo que falte tras verificar el esquema real:
`usuarios.fecha_nacimiento`, `usuario_fotos`, `billeteras`, `canjes_billetera`, y (si se confirma) `album_fotos.destino_id`/equivalente, con índices parciales `WHERE activo=true`. Incluye un `scripts/verify_NNN_precheck.js` siguiendo el patrón de `verify_027_precheck.js` y actualiza `docs/` con el checklist operativo (aplicar migración -> deploy backend -> deploy frontend; orden explícito). Recuerda: la migración NO la aplicas tú.

---

## 6. Pruebas y verificación (Escudo GOLD ampliado)

- `node --check` de todos los `.js` tocados; ASCII/backticks/doble-escape en `api/*.js` = 0/0/0; balance de `<div>` de cada HTML tocado; balance de comentarios en `admin.html`.
- Smokes nuevos en `scripts/` (con mock de `sql`/`neon`): tope de 10 fotos (11.ª rechazada con `LIMITE_FOTOS_PERFIL`, concurrencia simulada), `fecha_nacimiento` (válida/futura/menor de edad/no aparece en proyección pública), Pasaporte completo -> insignia idempotente + billetera idempotente, token QR (expira, un solo uso, firma inválida, autocanje, saldo insuficiente, sin efectos parciales), "Estuve aquí" hidratado, búsqueda de ubicación acotada y autorizada, optimización de imagen (lógica pura testeable sin DOM cuando sea posible).
- Suite completa `npm test` en verde; corrige o justifica cualquier test preexistente afectado.
- Verificación manual asistida (lista para Javier): subir foto de perfil (ver confirmación sin URL), subir 10 y probar la 11.ª, completar Pasaporte, ver billetera/QR e insignia, canje con una marca de prueba, "Estuve aquí" persistente tras recargar, mapa con tiles en index/comunidad/perfil, vincular ubicación con buscador tras subir.

---

## 7. Restricciones de alcance (qué NO hacer)

- No crees archivos en `/api/`. No cambies el driver ni la estructura CommonJS.
- No introduzcas moneda nueva ni conversión a dinero real. No toques `moneda_*` (ADR-061) salvo lectura.
- No agregues dependencias pesadas (ffmpeg.wasm, frameworks) sin aprobación explícita.
- No rompas compatibilidad de `usuarios.foto_url` ni de las URLs pegadas a mano ya existentes.
- No expongas `fecha_nacimiento`, tokens QR ni saldos de terceros en ninguna proyección pública.
- No reescribas archivos grandes completos: ediciones quirúrgicas (Python `str.replace` para `admin.html`).
- No apliques migraciones en producción ni hagas push/deploy.

---

## 8. Fases de entrega

1. **Fase A — Bugs (A1, A2, A3).** Entregable independiente y desplegable. Verificación completa antes de seguir.
2. **Fase B — Pasaporte, fecha de nacimiento, fotos de perfil (10), insignia, billetera + QR (B1-B4).** Incluye la migración.
3. **Fase C — Subida v2: galerías conectadas, bloque de subida en primera pantalla de Mi perfil, optimización, vínculo de ubicación (C1-C4).**
4. **Fase D — Cierre:** Escudo GOLD final, un solo pase documental (ADR-069 y siguientes, TSK-159..n, NEXT.md, BUGS_HISTORICOS.md, PROJECT.md, BLUEPRINT.md, `docs/DEPLOY_*.md` con orden operativo), y reporte final con: archivos tocados con `git diff --stat`, resultados de pruebas, deuda [DEUDA-EXPRESS] aceptada y riesgos.

Reporta al terminar cada fase: qué cambió, cómo se verificó y qué queda pendiente, con evidencia real (salida de comandos), no afirmaciones.

---

## 9. Preguntas que debes hacer ANTES de codificar (un solo lote, con default propuesto)

1. **Pasaporte:** ¿qué campos exactos lo completan? (default: alias, fecha de nacimiento, foto de perfil, ciudad/país base, email verificado, al menos 1 foto en la galería).
2. **Fecha de nacimiento:** ¿edad mínima? ¿editable solo una vez? (default: 13 años, editable una vez, consulta política de menores/Ley 1581).
3. **Insignia:** ¿otorga XP? ¿cuánto? ¿tier? (default: tier plata, sin XP extra en v1).
4. **Billetera:** ¿quién canjea en el establecimiento? (default: el dueño de una Marca activa con sesión). ¿Escaneo por cámara ahora o código manual? (default: manual/paste ahora, cámara después).
5. **Catálogo canjeable:** ¿se reutiliza `consumibles` con `marca_id`/`tipo_canje='qr'` de ADR-042? (default: sí).
6. **Legal:** ¿los productos canjeables son solo de aliados comerciales sin dinero real de por medio? ¿revisión legal previa? (default: sí y sí antes de producción).
7. **QR de referidos:** ¿migrarlo al generador local para no enviar datos a `api.qrserver.com`? (default: sí).
8. **Galerías:** ¿cuáles galerías carecen hoy de subida? Si no puedes determinarlo con certeza del código, lista las que encontraste y pregunta.
9. **"Ítems referidos" para vincular ubicación:** ¿solo destinos publicados, o también Activos Ocultos, Marcas/áreas? (default: destinos publicados).
10. **Video/audio:** ¿aceptas solo validación de peso + póster en v1 y evaluamos compresión real después? (default: sí).
11. **Fotos de perfil reemplazadas:** ¿borrar el blob anterior o dejarlo como deuda? (default: deuda documentada).
12. **Tamaños máximos de imagen tras optimizar:** (default: 1600 px galería, 800 px perfil, WebP q 0.8).

Cuando tengas las respuestas, ejecuta por fases.

---

**hacer las preguntas necesarias para completar la tarea de la mejor forma posible**
