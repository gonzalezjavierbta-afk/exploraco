# HANDOFF 037 - Sprint Multimedia / Perfil / Galeria / Mapa

**Entrega:** TSK-113 (cierre documental del Sprint Multimedia)
**Fecha:** 2026-09-18
**Estado:** Implementado en working tree, SIN commitear. `api/pagina-destino.js` queda en **v12.20260917**. BUG-057 CERRADO. Sin migraciones nuevas.
**Autor del handoff:** Documentation Specialist (AI-DOS), verificado contra archivo real (ADR-006).

> Este documento resume la sesion para que cualquier IA o persona continue el proyecto sin depender
> del historial de chat (Reglas de Oro v5, punto 8). El detalle de la tarea esta en
> `exploraco desarrollo/TASKS.md` TSK-113; el relevo general en `NEXT.md`; la deuda derivada en
> `BUGS_HISTORICOS.md` BUG-002/BUG-057.

---

## 1. Que se hizo

Sprint guiado por el prompt `PROMPT_OPENCODE_MULTIMEDIA_PERFIL_GALERIA.md` (untracked). Cuatro
archivos modificados (**+249/-56** en `git diff --numstat`), sin archivos nuevos en `api/`
(presupuesto 8/8 intacto, ADR-001) y sin migraciones nuevas. El foco: perfil multimedia del
viajero, paginacion de galeria, drawer del mapa cultural con titulo de destino + voto de media, y
panel de logros en el home.

### 1.1 `api/pagina-destino.js` v12.20260917 (+6/-6) -- fix reforzado de BUG-057 (CERRADO)

Defensas del popover "Guardar" en listener capture, verificadas en el archivo real:

| Ancora (ADR-006) | Detalle |
|---|---|
| L2513 (`cerrarPopoverGuardar`) | No cierra ante `ev.target.id==='btn-guardar'` |
| L2533 | Checkbox "Tu Mapa" con `event.stopPropagation()` |
| L2545 | Checkboxes de mapas tematicos con `event.stopPropagation()` |
| L2556 | Boton "Nuevo mapa" con `event.stopPropagation()` |
| L1-2 | Header v12.20260917 con changelog del fix |

`node --check` PASS; ASCII **0 bytes >127 y 0 backticks**; `smoke_auditoria_pagina_destino`
**54/54 PASS**.

### 1.2 `mi-perfil.html` (+82/-27; divs 394/394, script tags 3/3)

Grupo 1 del sprint (fotos propias, guardados, geo y logros):

- **1-A fotos propias:** helper `mediaCardHTML` (L1832) unifica `foto_url||texto||media_url`;
  grid de 140px con votos; empty state "Aun no tienes fotos..." (L1876).
- **1-B guardados por fuente:** ramificacion `album`/`album_foto`/`viajero_foto` con placeholder
  + enlace al destino e iconos por `media_type`.
- **1-C geo en `agregarFotoAlbum`:** inputs `#album-nueva-foto-lat/lng` (L658-660), boton
  `usarMiUbicacionAlbum` (L660/L1992), validacion de rango Colombia y `body.lat/lng` solo si
  validos.
- **1-D logros:** `renderTrofeoCard` (L1140), desbloqueados primero, boton colapsable
  "+N bloqueados" (L1155-1192 via `toggleTrofeosBloqueados`).
- **O1 del Escudo GOLD #92:** se inserto el comentario
  `/* mi-perfil.html -- Rev 2026-09-18b: logros colapsados, geo en album_foto */` al inicio del
  primer bloque `<script>`, respetando la cabecera existente (insercion, no reescritura); balance
  re-verificado (divs 394/394, script 3/3).

### 1.3 `galeria.html` (+58/-10; divs 84/84) -- paginacion 12/pagina

- Estado `G.galPagina/galPorPagina/galItems` (L248); consolidacion
  curadas -> viajeros -> albumes.
- `gGalRenderPage` (L882) y `gGalLoadMore` (L897).
- El boton `#g-more` se **REUTILIZA** en modo destino (no se crea `btn-gal-mas`).

### 1.4 `index.html` (+103/-13; divs 523/523) -- Grupo 3 + 4

- **3-A titulo del drawer del mapa:** `#md-mapa-destino-titulo` (L1245) + `mdSetDestinoTitulo`
  (L3301-3302), invocado en pin de destino (L3310) y album del destino (L3454).
- **3-B voto de media del mapa:** `votarMediaMapa` (L3566) con manejo de sesion (`mostrarLogin`
  L3569 y tratamiento del 401 L3584).
- **4-A logros del panel Mi Viaje:** `renderLogrosGrid` (L4630) filtra solo
  `estado==='completada'` (L4648) y ordena por `tierOrder` platino>oro>plata>bronce (L4645), sin
  candados.

### 1.5 Desviacion de alcance O2 (documentada)

El spec 3-A apuntaba a `index-api-connector.js`, pero ese archivo **NO se modifico** (verificado
por `git status`). Justificacion (ADR-006): el endpoint `multimedia_mapa` de `api/interacciones.js`
filtra solo por `destino_id` (regex uuid inline; nunca lee el slug) y `cargarAlbumOficialDestino`
ya envia `destino_id`; el componente visible (titulo del drawer) se resolvio en `index.html`. El
backend no requirio cambios.

### 1.6 Numeros verificados (snapshot 2026-09-18)

- `git diff --numstat`: 4 archivos modificados, **+249/-56**.
- Balance de divs: `mi-perfil.html` 394/394, `galeria.html` 84/84, `index.html` 523/523.
- Script tags: `mi-perfil.html` 3/3.
- `api/pagina-destino.js`: node --check PASS, ASCII 0/0/0, `smoke_auditoria_pagina_destino` 54/54.
- Presupuesto de endpoints: **8/8** (cero archivos nuevos en `api/`). Sin migraciones nuevas.

---

## 2. Que quedo pendiente

### 2.1 BLOQUEANTE: commit/push/deploy del release TSK-113

1. **Commit + push + deploy** de los 4 archivos del sprint (`api/pagina-destino.js`,
   `galeria.html`, `index.html`, `mi-perfil.html`) + el cierre documental (`TASKS.md` TSK-113,
   `NEXT.md`, `BUGS_HISTORICOS.md` BUG-002/BUG-057 y este handoff) en un solo release.
2. **NO mezclar archivos ajenos (O3):** `opencode.json` y 3 `.opencode/agent/*` modificados
   (`free-plan.md`, `media-reader-free.md`, `qa-auditor-free.md`); 4 archivos borrados
   (`PROMPT_OPENCODE_TSK111.md`, `PROMPT_OPENCODE_TSK112.md`, `PROMPT_MULTIMEDIA_GALERIA.md`,
   `opencode - copia.json`); `PROMPT_OPENCODE_MULTIMEDIA_PERFIL_GALERIA.md` untracked (prompt de la
   tarea).
3. **No olvidar los pendientes de sesiones previas:** aplicar la migracion 024 (TSK-112) en Neon
   sigue siendo la UNICA migracion pendiente de aplicar; el release de TSK-112 (backend v16/v21 +
   frontend Casas/Clases) sigue pendiente.

### 2.2 Pendientes no bloqueantes

- **BUG-002 ABIERTO (deuda preexistente):** `api/pagina-destino.js` L2431 mantiene 1 doble-escape
  (`'\\u2605'` en `addRvOptimista`, identico a HEAD; verificado ADR-006). Limpiar en una tarea de
  mantenimiento; registrado en BUGS_HISTORICOS.md y TASKS.md TSK-113.
- **BUG-061 ABIERTO** (`POST tipo='foto'` sin `validarSesion`, escalado a `sql-security`) y
  **BUG-062 ABIERTO** (fotos Unsplash en `admin.html`).
- **Verificacion en vivo post-deploy:** drawer del mapa cultural con titulo del destino + voto de
  media; paginacion de `galeria.html`; fotos/guardados/geo/logros de `mi-perfil.html`; popover
  Guardar estable en la ficha.

---

## 3. Como verificar

### 3.1 Verificacion local (sin Neon; lo que ya se corrio en esta sesion)

```powershell
# Sintaxis (Escudo GOLD)
node --check api/pagina-destino.js

# Smoke de la ficha (mock; NO valida Neon)
node scripts/smoke_auditoria_pagina_destino.js  # esperado: 54/54 PASS

# ASCII-safety (esperado: 0 bytes >127 y 0 backticks en api/*.js)
```

Balance de divs verificados en esta sesion documental: `mi-perfil.html` 394/394, `galeria.html`
84/84, `index.html` 523/523; script tags `mi-perfil.html` 3/3.

### 3.2 Verificacion en vivo (post-deploy)

1. Abrir el home (`index.html`) y hacer click en un pin de destino del mapa cultural: el drawer debe
   mostrar el titulo del destino (`#md-mapa-destino-titulo`) y permitir votar la media
   (`votarMediaMapa`), con login si no hay sesion y manejo del 401.
2. Abrir `galeria.html?destino=<slug>`: la galeria pagina de 12 en 12 ("Cargar mas" reusa
   `#g-more`).
3. Abrir `mi-perfil.html`: (a) fotos propias con votos y empty state; (b) guardados por fuente con
   placeholder; (c) geo en agregar foto de album (rango Colombia); (d) logros desbloqueados primero
   y boton "+N bloqueados".
4. Abrir una ficha de destino y el popover "Guardar": marcar mapas tematicos y "Tu Mapa" sin que el
   popover se cierre (BUG-057 cerrado).

---

## 4. Rollback (solo emergencia)

- Sin migraciones ni archivos nuevos en `api/`: el rollback de TSK-113 es revertir los 4 archivos
  del working tree a HEAD (`git checkout -- api/pagina-destino.js galeria.html index.html
  mi-perfil.html`) y descartar el cierre documental. El fix del popover (BUG-057) se pierde con el
  rollback, pero el bug ya estaba mitigado desde TSK-105 (2026-09-16).

---

**Regla de actualizacion:** toda correccion posterior debe reflejarse en `TASKS.md` (estado), `NEXT.md`
(relevo) y, si cambia la decision, en `DECISIONS.md`. El historial de chat NUNCA es fuente de
verdad (Reglas de Oro v5, punto 8).