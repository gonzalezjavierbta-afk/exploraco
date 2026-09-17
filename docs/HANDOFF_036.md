# HANDOFF 036 - Compartir social con XP + interacciones de media unificadas

**Entrega:** TSK-110 / ADR-036
**Fecha:** 2026-09-17
**Estado:** Implementado en working tree, SIN commitear. Migraciones 022 y 023 PENDIENTES de aplicar en Neon.
**Autor del handoff:** Documentation Specialist (AI-DOS), verificado contra archivo real (ADR-006).

> Este documento resume la sesion para que cualquier IA o persona continue el proyecto sin depender
> del historial de chat (Reglas de Oro v5, punto 8). El detalle de la decision esta en
> `exploraco desarrollo/DECISIONS.md` ADR-036; la tarea en `TASKS.md` TSK-110; el relevo general en
> `NEXT.md`; la deuda derivada en `BUGS_HISTORICOS.md` ("Deuda ADR-036").

---

## 1. Que se hizo

Se implemento el boton **Compartir con recompensa real de XP** y la **unificacion de votos,
comentarios y guardados** de las 3 fuentes de media (curadas, foto de viajero y foto de album),
sin crear funciones serverless (presupuesto 8/8 intacto, ADR-001). Todo entra como ramas `?tipo=`
de `api/interacciones.js` (header `v18` -> `v19`).

**Decision central (ADR-036):** NO se agrego `'compartir'` al CHECK de `interacciones.tipo`
(tabla base no versionada, patron BUG-021); en su lugar se creo el ledger `media_compartidos` con
indice unico parcial `es_primero`, y la media se unifico en tablas polimorficas `media_*` con
`item_id text` + `fuente`.

### 1.1 Backend y datos

| Archivo | Tipo | Detalle |
|---|---|---|
| `db/migrations/022_media_compartidos.sql` | NUEVO | Tabla `media_compartidos` (fuente, canal, `es_primero`, `xp_ganado numeric(12,2)`), indice unico parcial `media_compartidos_primero_uq`, 2 indices de consulta, preflight read-only y PLAN B (`media_compartidos_unicos`). No toca el CHECK de `interacciones.tipo`. |
| `db/migrations/023_interacciones_media_unificadas.sql` | NUEVO | `media_votos` (PK compuesta + soft-delete), `media_comentarios` (parent_id + tombstone), `media_comentario_likes`; `ALTER media_guardados.item_id uuid -> text` + CHECK con `'curada'`; backfill idempotente desde legacy; preflight 6.1-6.5. Cero DROP/DELETE/TRUNCATE. |
| `api/interacciones.js` | MODIFICADO | v19 (+949/-425): rama POST `compartir` (25 XP primer share / 5 XP posteriores, tope 10 eventos y 50 XP/24h, `validarSesion`); 3 misiones + 3 logros; `media_voto`/`media_comentar`/GET `media_interacciones`/`media_comentarios`; alias legacy conservados; todos los lectores migrados a `media_*`; `galeria_destino` `items[]` v2. |
| `scripts/smoke_036_compartir.js` | NUEVO | 55 checks (mock). |
| `scripts/smoke_036_media_unificada.js` | NUEVO | 71 checks (mock). |

### 1.2 Frontend

| Archivo | Tipo | Detalle |
|---|---|---|
| `compartir.js` | NUEVO | `window.ExploraCompartir = { VERSION, init, compartir }`: Web Share API + WhatsApp + Copiar link, POST `tipo=compartir`, toasts reusando `window.ExploraCO.mostrarToast`. |
| `api/pagina-destino.js` | MODIFICADO | v10 (+40/-27): hero mosaico (1 principal `1.9fr` + 3 secundarias, 360px) y boton Compartir en el `.subnav` sticky; carga `/compartir.js`; galeria principal hasta 12 (comunidad max 6 + relleno curadas). |
| `galeria.html` | MODIFICADO | +222/-32: 5 secciones en modo destino + modal con VOTAR/GUARDAR/COMPARTIR y comentarios por 3 fuentes. |
| `album-comments.js` | MODIFICADO | +92/-33: v2.0.0, `mount(target,{fuente,itemId},opts)` retrocompatible con la firma de string. |
| `usuario-session.js` | MODIFICADO | +24/-0: `window.ExploraCO.aplicarResultadoXp(data)` (unico punto de acreditacion de XP/misiones/logros de compartir.js). |
| `index.html` | MODIFICADO | +50/-17: insignia `compartido` reincorporada (derivada del catalogo de logros via `_sharedCount`). |
| `comunidad.html` / `mi-perfil.html` | MODIFICADOS | +1/-1 cada uno: SOLO cache-bust `album-comments.js?v=2`. |

### 1.3 Numeros verificados (snapshot 2026-09-17)

- `git diff --numstat`: 8 archivos modificados, **+1379/-536**; 5 archivos nuevos sin versionar.
- Catalogo real de gamificacion: **39 misiones / 33 logros** (28+8+3 y 30+3).
- Presupuesto de endpoints: **8/8** (cero archivos nuevos en `api/`).

### 1.4 Hashes del snapshot (para auditoria ADR-006; usar `Get-FileHash -Algorithm SHA256`)

| Archivo | SHA256 |
|---|---|
| `api/interacciones.js` | `022262659E79E734E935491E91A64E3BCC6BA4675A401280DAF3C43D6EA29CDA` |
| `api/pagina-destino.js` | `F4E69A70C482211F15C1192FD38BB412382F123305239D96982A29E832FBEAE0` |
| `compartir.js` | `FDDF98EF9088B7960508EE8BF69D973D6B02FB579DF8BC20F6A21900F392180E` |
| `galeria.html` | `95787B5E37182D83ABA84228C2D0043CBE6E9261EC699D3820BA26A9D2F9EF73` |
| `index.html` | `21F189109C07BCFA5445C2FF30B938AD6D4FBFF87BC5780528E8AF5ECBAF3969` |
| `album-comments.js` | `9800D63EACF649CD23B85EB2A934354F7C028155447A9AF0E7A6DFE3E3A1FA65` |
| `usuario-session.js` | `0E3423BE9C3BE011B01E274BE13BD0B78D8492DF30D6992D3937402B36C876AC` |
| `db/migrations/022_media_compartidos.sql` | `C0972AB0BAB9FF14DB94410145BC7907B7054EEABAAE6096A5B1EB5663670AE4` |
| `db/migrations/023_interacciones_media_unificadas.sql` | `030A05B1E6E7A81D2D01CBDB497F2B214E5476FCFFFE1C77EF92113660D548F8` |

---

## 2. Que quedo pendiente

### 2.1 BLOQUEANTE: aplicar 022 y 023 en Neon ANTES del deploy del backend v19

El backend v19 consulta `media_compartidos`, `media_votos`, `media_comentarios` y
`media_comentario_likes`; si no existen, las rutas de compartir/voto/comentario degradan o fallan.
**Los smokes 036 usan mock y NO validan el esquema de Neon.** La unica validacion real es aplicar
las migraciones y correr sus preflights.

Pasos (los ejecuta Javier; requiere `DATABASE_URL` de Neon):

1. Correr `db/migrations/022_media_compartidos.sql` **COMPLETO** en el editor SQL de Neon
   (idempotente ADR-008). Antes o despues, correr su **preflight 1** (el CHECK de `interacciones`
   NO debe contener `compartir`), **preflight 2** (indice parcial `media_compartidos_primero_uq`)
   y **preflight 3** (prueba del `ON CONFLICT ... WHERE es_primero = true` en una transaccion con
   ROLLBACK). Si el preflight 3 falla con "no unique or exclusion constraint matching the ON
   CONFLICT clause", aplicar el **PLAN B** documentado al final del archivo
   (`media_compartidos_unicos`) y ajustar el backend (no se hace automaticamente).
2. Correr `db/migrations/023_interacciones_media_unificadas.sql` **COMPLETO**. Luego correr los
   preflights:
   - 6.1 tipo real de `destinos_fotos.id`;
   - 6.2 conteos legacy vs unificados (los nuevos deben igualar o superar a los legacy);
   - 6.3 idempotencia (correr 023 dos veces y repetir 6.2);
   - 6.4 `item_id` es `text` en `media_votos`/`media_comentarios`/`media_guardados`;
   - 6.5 CHECK de fuente de `media_guardados` contiene `'curada'`.
3. Deploy del **backend** (`api/interacciones.js` v19, `api/pagina-destino.js` v10) y despues del
   **frontend** (`compartir.js`, `galeria.html`, `album-comments.js`, `index.html`,
   `comunidad.html`, `mi-perfil.html`, `usuario-session.js`).

### 2.2 Pendientes no bloqueantes

- **Consistencia de insignias (ADR-006):** el reporte de sesion decia que la insignia `compartido`
  volvio en `index.html`, `comunidad.html` y `mi-perfil.html`. Contra archivo real, volvio SOLO en
  `index.html` (L4208); `comunidad.html` (L524) y `mi-perfil.html` (L789) conservan el comentario
  que la lista como removida y solo recibieron el cache-bust `?v=2`. Decidir si se reincorpora o
  se corrige el comentario.
- **BUG-061 sigue ABIERTO:** `POST tipo='foto'` confia en `body.usuario_id` sin `validarSesion`
  (la rama nueva `compartir` SI exige sesion). Escalado a `sql-security`.
- **BUG-062 sigue DETECTADO/PENDIENTE:** fotos de Unsplash no se recolectan en `admin.html`.
- **Deuda de esquema base (patron BUG-021):** CHECK de `interacciones.tipo` y tablas
  `usuarios`/`interacciones`/`destinos_fotos` no versionadas; tipo real de `destinos_fotos.id` por
  confirmar (preflight 6.1); tablas legacy `album_votos`/`album_comentarios`/`album_comentario_votos`
  retiradas del backend pero NO dropeadas. Ver `BUGS_HISTORICOS.md`, seccion "Deuda ADR-036".
- **Commit + push:** los 8 archivos modificados + 5 nuevos + el cierre documental (`TASKS.md`,
  `NEXT.md`, `DECISIONS.md` ADR-036, `BUGS_HISTORICOS.md`, `PROJECT.md`, `BLUEPRINT.md` y este
  handoff) en un release coherente. NO mezclar archivos borrados/ajenos.

---

## 3. Como verificar

### 3.1 Verificacion local (sin Neon; lo que ya se corrio en esta sesion)

```powershell
# Sintaxis (Escudo GOLD)
node --check api/interacciones.js
node --check api/pagina-destino.js
node --check compartir.js
node --check album-comments.js
node --check usuario-session.js
node --check scripts/smoke_036_compartir.js
node --check scripts/smoke_036_media_unificada.js

# Smokes de la entrega (mock; NO validan Neon)
node scripts/smoke_036_compartir.js        # esperado: 55/55 PASS
node scripts/smoke_036_media_unificada.js  # esperado: 71/71 PASS

# ASCII-safety (esperado: 0 bytes >127 y 0 backticks en api/*.js, compartir.js y migraciones)
```

### 3.2 Verificacion en Neon (post-aplicacion, pre-deploy)

```sql
-- Deben existir las 4 tablas nuevas
SELECT table_name FROM information_schema.tables
WHERE table_schema='public'
  AND table_name IN ('media_compartidos','media_votos','media_comentarios','media_comentario_likes');

-- media_guardados: item_id text y CHECK con 'curada'
SELECT column_name, data_type FROM information_schema.columns
WHERE table_schema='public' AND table_name='media_guardados' AND column_name='item_id';

SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint
WHERE conrelid='public.media_guardados'::regclass AND contype='c';

-- Indice parcial del primer share
SELECT indexname, indexdef FROM pg_indexes
WHERE schemaname='public' AND tablename='media_compartidos'
  AND indexname='media_compartidos_primero_uq';
-- esperado: UNIQUE ... WHERE (es_primero = true)
```

### 3.3 Verificacion en vivo (post-deploy)

1. Abrir una ficha de destino: hero en mosaico (1 principal + 3 secundarias) y boton **Compartir**
   al final del `.subnav`.
2. Compartir una foto curada por primera vez: toast de XP y fila en `media_compartidos` con
   `es_primero=true` y `xp_ganado=25` (o el valor tras multiplos/bonos).
3. Repetir el mismo share: 5 XP, `es_primero=false`. Superar 10 eventos en 24h: la API responde
   `tope_diario=true` / `limite_diario` sin insertar.
4. Votar, comentar y guardar una foto curada y una de viajero desde la ficha y desde
   `galeria.html?destino=<slug>`: los contadores deben vivir en `media_votos`/`media_comentarios`/
   `media_guardados`.
5. Abrir `mi-perfil.html`/`index.html`: la insignia `compartido` aparece cuando el catalogo de
   logros incluye `logr_primer_compartido` (u otro superior).

---

## 4. Rollback (solo emergencia)

- 023: `DROP TABLE media_comentario_likes, media_comentarios, media_votos;` y revertir
  `media_guardados.item_id` a `uuid` (LOSSY si hay `item_id` no-uuid). Script
  `023_interacciones_media_unificadas_down.sql` fuera del flujo normal.
- 022: `DROP TABLE media_compartidos;` (borra el log de comparticiones; no afecta tablas legacy).
- Las tablas legacy NO se tocan.

---

**Regla de actualizacion:** toda correccion posterior debe reflejarse en `TASKS.md` (estado), `NEXT.md`
(relevo) y, si cambia la decision, en `DECISIONS.md` ADR-036. El historial de chat NUNCA es fuente de
verdad (Reglas de Oro v5, punto 8).
