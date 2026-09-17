# PROMPT OPENCODE — ExploraCO: Capa Multimedia, Galería Comunidad y Galería Hospedajes
**Fecha:** 2026-09-16  
**Tarea:** TSK-106 — Fix capa multimedia del mapa cultural, galería mi viaje personal, galería comunidad y galería hospedajes (mínimo 12 fotos)  
**Archivos que debes pedir a Javier ANTES de tocar nada (Regla de Oro 8 — Protocolo de Entrega):**
- `api/interacciones.js` (versión real del working tree)
- `api/pagina-destino.js` (versión real del working tree)
- `index.html` (versión real del working tree)
- `index-api-connector.js` (versión real del working tree)
- `comunidad.html` (versión real del working tree)

---

## 1. CONTEXTO TÉCNICO OBLIGATORIO

### Stack y restricciones críticas
- **Backend:** Node.js serverless CommonJS, `api/*.js`. Vercel Hobby: **presupuesto de 8 funciones consumido al 100% (8/8)**. NO crear archivos nuevos en `api/`.
- **ASCII-Safe CRÍTICO (Regla de Oro 1):** cero caracteres >127, tildes, ñ, emojis directos, ni backticks `` ` `` en cualquier `api/*.js`. Usar escapes Unicode simples (`\u00f1`, etc.). Doble escape (`\\uXXXX`) es bug (BUG-002).
- **Entrega quirúrgica (Regla de Oro 9):** indicar las últimas 3 líneas antes del cambio y las 3 líneas posteriores. Especificar número de línea aproximado.
- **Verificación obligatoria antes de entregar:**
  - `node --check api/interacciones.js`
  - `node --check api/pagina-destino.js`
  - `grep -P '[^\x00-\x7f]' api/interacciones.js api/pagina-destino.js` → debe dar 0 resultados
  - `node scripts/check_buildHTML_inline.js` → debe pasar (cierre de BUG-031)

### Estado real del working tree (2026-09-16)
Los siguientes fixes ya están aplicados en working tree pero **pendientes de commit/push/deploy**. No revertirlos:
- **BUG-056 resuelto:** `galAll` ya tiene dedupe defensivo en `pagina-destino.js` (`L727-733`). El helper `galEsc()` ya existe. La semántica REPLACE ya está en `admin-destinos.js` y `utilidades.js`.
- **BUG-060 mitigado:** `queryConAvatarFallback` ya existe en `api/interacciones.js` (`L2114`), aplicado a `museo_publico`, `album_detalle`, `galeria_destino`.
- **BUG-030 resuelto:** el cast `a.id::text AS origen_id` ya está en `api/interacciones.js` (`L1484`).
- **TSK-105 / ADR-030:** la sección `#galeria` unificada ya existe en `pagina-destino.js`, incluyendo `#fp-upload`, fotos de viajeros y fotos curadas.

**Antes de proponer cualquier cambio, verificar contra el archivo real entregado por Javier que estos fixes ya estén presentes. Si no están, aplicarlos primero como parte de esta tarea.**

---

## 2. PROBLEMAS A CORREGIR (4 síntomas, todos relacionados)

### PROBLEMA 1 — Capa multimedia del mapa cultural no muestra pins/fotos (index.html)
**Síntoma:** El mapa cultural en `index.html` tiene activada la capa multimedia (álbumes + destinos con fotos), pero no aparecen pins ni el drawer lateral muestra items guardados o votados por el usuario.

**Causa raíz conocida (BUG-030):** El handler `tipo=multimedia_mapa` en `api/interacciones.js` fallaba con error PostgreSQL por incompatibilidad de tipos en el UNION ALL (uuid de álbumes vs varchar de slugs). **Este fix ya debería estar en el working tree** (`a.id::text AS origen_id`, L1484). Verificar que esté presente.

**Causa secundaria a investigar (BUG-100-B de TSK-100):** `multimedia_mapa` hereda coords del autor vía visitas/guardados cuando el álbum no tiene lat/lng propio. Verificar que el fallback de coordenadas (`coordsFallbackAutor`) esté presente en el handler.

**Qué debe hacer el handler `GET ?tipo=multimedia_mapa`:**
- Devolver álbumes activos con `a.id::text AS origen_id`, `a.titulo`, `a.portada_url`, `a.lat`, `a.lng` (con fallback a coords de la primera visita/guardado del autor si lat/lng es null).
- Devolver destinos publicados con `d.slug AS origen_id`, `d.nombre AS titulo`, `d.foto_hero AS portada_url`, `d.lat`, `d.lng`.
- UNION ALL con tipos homogéneos (ambos `origen_id` como `text`).
- Si el usuario envía `usuario_id`, filtrar adicionalmente para incluir solo álbumes del usuario + destinos que el usuario ha guardado o votado (interacciones activas `tipo IN ('guardado','voto')` con `activo=true`).

**Qué debe hacer `index-api-connector.js`:**
- Al activar la capa multimedia, llamar a `GET /api/interacciones?tipo=multimedia_mapa&usuario_id=<id>` (si hay sesión) o sin `usuario_id` (vista pública).
- Renderizar los items devueltos como pins en el mapa y como cards en el drawer lateral.
- Verificar que la función que procesa la respuesta recibe el array correcto (`data.items` o `data.multimedia` — confirmar el campo real del response contra el handler).

### PROBLEMA 2 — Módulo "Mi Viaje Personal" en index.html no carga capa audiovisual
**Síntoma:** En el módulo de "Mi Viaje Personal" del `index.html`, la sección/tab de audiovisual no muestra las fotos ni álbumes que el usuario ha guardado o votado.

**Qué debe corregirse:**
- El tab o sección de audiovisual de "Mi Viaje Personal" debe llamar a `GET /api/interacciones?tipo=multimedia_mapa&usuario_id=<id>` (requiere sesión activa, `window.ExploraCO.usuario.id`).
- Filtrar del resultado los items donde el usuario es autor del álbum (`origen === 'album'`) o ha guardado/votado el destino/álbum (`origen === 'destino'`).
- Renderizar como cards con portada, título y enlace al álbum o destino correspondiente.
- Si el usuario no tiene sesión, mostrar CTA de login/registro.

### PROBLEMA 3 — Sección galería de `comunidad.html`: reestructurar y unificar
**Síntoma:** La sección de galería en `comunidad.html` mezcla componentes obsoletos y no muestra correctamente las fotos del usuario junto a las de la comunidad.

**Qué debe quedar (y lo que se elimina):**

Se conserva ÚNICAMENTE:
1. **Aviso de permisos:** texto informativo `"¿Tienes fotografías de tu viaje? Comparte el enlace de tu imagen para sumarla a la comunidad."` (mantener el texto existente, solo aplicar escape Unicode si tiene tildes: `\u00bf`, `\u00e9`, etc.).
2. **Input de link + botón de envío:** `<input type="url">` para pegar la URL de la foto y `<button>` para enviarla. Conservar la función JS de envío existente (o la que ya cargue fotos vía `POST /api/interacciones?tipo=foto` o similar).
3. **Grid unificado de fotos:** mostrar en una sola grilla tanto las fotos propias del usuario como las de la comunidad. La fuente de datos es `GET /api/interacciones?tipo=galeria_destino` (o `tipo=mi_feed_fotos` si hay sesión). Verificar cuál de los dos endpoints devuelve la vista unificada contra el archivo real.

Se eliminan del módulo de galería:
- Cualquier componente de subida de archivos directos (no links).
- Tabs o secciones separadas de "Mis fotos" vs "Comunidad" que no sean el grid unificado.
- Formularios de carga que ya no sean el input de link + botón.

**Nota de ASCII-safety para `comunidad.html`:** este es un HTML, NO un `api/*.js`, así que puede tener tildes y ñ directas. No aplicar escapes Unicode al HTML.

### PROBLEMA 4 — Galería de fichas de hospedaje muestra solo 3 fotos (debe mostrar mínimo 12)
**Síntoma:** En las páginas de hospedaje servidas por `api/pagina-destino.js`, tanto el hero (miniaturas `.h-thumb`) como la sección `#galeria` muestran solo 3 fotos aunque el destino tenga más cargadas en `destinos_fotos`.

**Causa raíz a investigar (verificar contra el archivo real):**
- El BUG-056 ya aplicó `galAll` con dedupe en `L727-733`. Verificar que la variable `galAll` efectivamente concatena `tags.fotos` + `d.fotos_adicionales` + las fotos de la tabla `destinos_fotos` (join desde la query de la ficha).
- Verificar si la query principal de `pagina-destino.js` hace `JOIN` o `LEFT JOIN` a `destinos_fotos` y si tiene algún `LIMIT` o `TOP 3` que restrinja la lectura.
- Si la galería se arma solo con `tags.fotos` (JSONB) y ese array solo tiene 3 entradas, pero en `destinos_fotos` hay más registros, el problema está en no leer `destinos_fotos` en la query.

**Fix requerido:**
- En la query principal de `pagina-destino.js` que construye la ficha del destino: asegurar que se lean **todas** las filas de `destinos_fotos` para ese `destino_id` (sin LIMIT) y se incluyan en el objeto de datos (ej: como `d.fotos_db = [...]`).
- En el bloque que construye `galAll`:
  ```javascript
  // Combinar fotos de tags JSONB + fotos de la tabla destinos_fotos
  var galFotos = (tags.fotos || []);
  var galDb = (d.fotos_db || d.fotos_adicionales || []);
  var galAll = dedupeFotos(galFotos.concat(galDb));
  ```
- En el render del hero (miniaturas `.h-thumb`): cambiar el límite actual (que resulta en 3) a un máximo de 12:
  ```javascript
  var maxFotosHero = Math.min(galAll.length, 12);
  for (var i = 0; i < maxFotosHero; i++) {
    heroThumbs += '<img src="' + galEsc(galAll[i].url) + '" class="h-thumb" onclick="abrirLightbox(' + i + ')" />';
  }
  ```
- En la sección `#galeria`: renderizar `galAll` completo (sin cap) o con un cap generoso (ej: 24) para el grid.
- Si `galEsc()` ya existe en el working tree (BUG-056 lo introdujo), usarlo. Si no, definirlo: `function galEsc(s){ return String(s||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;'); }`.

---

## 3. RESTRICCIONES Y PROHIBICIONES

- **No crear archivos nuevos en `api/`** (presupuesto 8/8, ADR-010).
- **No usar backticks** (`` ` ``) en `api/*.js` (Regla de Oro 1).
- **No usar caracteres >127** en `api/*.js` (Regla de Oro 1). Usar `\uXXXX` simple.
- **No hacer reemplazo total de JSONB** en endpoints de actualización; solo MERGE (`||`) (Regla de Oro 3 — Protocolo Merge).
- **No declarar la misma variable `var` dos veces** dentro de la misma función en `pagina-destino.js` (patrón BUG-011). Si `galAll` ya está declarada, actualizar la declaración existente, no crear una segunda.
- **No agregar un segundo `UNION ALL` mal tipado** (patrón BUG-030). Todos los campos de nombre igual entre ramas deben castearse explícitamente a tipos compatibles.
- **No silenciar errores con `catch` vacíos** (Reglas de Oro, sección 2.2 de AGENTS.md).

---

## 4. FLUJO DE VERIFICACIÓN OBLIGATORIO (Escudo GOLD)

Antes de entregar cualquier cambio, ejecutar en este orden:

```bash
# 1. Sintaxis JS válida
node --check api/interacciones.js
node --check api/pagina-destino.js

# 2. ASCII-safety (debe retornar 0 líneas)
grep -P '[^\x00-\x7f]' api/interacciones.js
grep -P '[^\x00-\x7f]' api/pagina-destino.js

# 3. Validación del JS inline generado por buildHTML()
node scripts/check_buildHTML_inline.js

# 4. Smoke de la ficha de destino (usar un slug de hostal real, ej: hostal-r10)
node scripts/smoke_auditoria_pagina_destino.js hostal-r10
```

Todos deben pasar antes de considerar la tarea completa.

---

## 5. VERIFICACIÓN FUNCIONAL ESPERADA POST-DEPLOY

Después del commit/push/deploy, confirmar:

1. **Mapa cultural (index.html):** activar la capa multimedia → deben aparecer pins de álbumes y destinos con fotos. Abrir el drawer → deben mostrarse las fotos/álbumes guardados o votados por el usuario autenticado.
2. **Mi Viaje Personal (index.html):** con sesión activa, el tab de audiovisual debe mostrar las fotos y álbumes guardados/votados por el usuario.
3. **Galería de comunidad (comunidad.html):** la sección de galería debe mostrar únicamente el aviso de permisos + input de link + botón + grid unificado de fotos (propias + comunidad). No deben aparecer otros componentes obsoletos.
4. **Fichas de hospedaje:** abrir una ficha como `hostal-r10` que tenga más de 3 fotos cargadas en `destinos_fotos` → el hero debe mostrar hasta 12 miniaturas y la sección galería debe mostrar el set completo.

---

## 6. PREGUNTAS QUE DEBES RESOLVER LEYENDO LOS ARCHIVOS REALES

Estas preguntas deben responderse contra los archivos que Javier entregue, NO desde el historial de chat:

1. ¿El fix de BUG-030 (`a.id::text AS origen_id`) ya está presente en `api/interacciones.js` L1484? Si no, aplicarlo primero.
2. ¿El handler `multimedia_mapa` ya filtra por `usuario_id` (guardados/votos activos) cuando se envía el parámetro? Si no, agregar el filtro.
3. ¿Qué campo del response de `multimedia_mapa` contiene el array de items? (`data.items`, `data.multimedia`, `data.pins`…). Verificar el `res.json(...)` del handler.
4. ¿`index-api-connector.js` tiene una función para la capa multimedia? ¿Cuál es su nombre y qué endpoint llama actualmente?
5. ¿La query principal de `pagina-destino.js` incluye un JOIN a `destinos_fotos`? ¿Tiene algún LIMIT que restrinja a 3 registros?
6. ¿`galAll` ya está declarada en `pagina-destino.js`? ¿En qué línea aproximada? ¿Concatena solo `tags.fotos` o también `destinos_fotos`?
7. ¿`galEsc()` ya existe en `pagina-destino.js` (introducida por BUG-056/TSK-105)?
8. ¿En `comunidad.html`, cuál es el id del contenedor de la galería actual y cuáles son los componentes que deben eliminarse?
9. ¿Cuál es el endpoint real que usa `comunidad.html` para cargar fotos (`galeria_destino`, `mi_feed_fotos`, u otro)?
10. ¿El módulo de "Mi Viaje Personal" en `index.html` tiene un tab de audiovisual ya estructurado o debe agregarse desde cero?

---

**INSTRUCCIÓN FINAL:** Pedir los archivos reales a Javier (protocolo Regla de Oro 8), responder las 10 preguntas anteriores, aplicar los 4 fixes con entrega quirúrgica (punto de entrada + punto final + número de línea aproximado), ejecutar el Escudo GOLD completo y reportar los resultados antes de cerrar la tarea. Hacer las preguntas necesarias para completar la tarea de la mejor forma posible.
