# HANDOFF 041 - Comunicacion oficial + Casas + Admin Mapa

**Entrega:** TSK-118 / ADR-041
**Fecha:** 2026-09-18
**Estado:** Implementado en working tree + hotfixes post-QA (J-1/J-2/J-3), SIN commitear. `api/interacciones.js` v23 y `api/usuarios.js` v18. Migracion 026 PENDIENTE de aplicar en Neon (024 y 025 YA aplicadas por indicacion del usuario, 2026-09-18).
**Autor del handoff:** Documentation Specialist (AI-DOS), verificado contra archivo real (ADR-006).

> Este documento resume la sesion para que cualquier IA o persona continue el proyecto sin depender
> del historial de chat (Reglas de Oro v5, punto 8). El detalle de la decision esta en
> `exploraco desarrollo/DECISIONS.md` ADR-041 (decisiones a-h); la tarea en `TASKS.md` TSK-118; el
> relevo general en `NEXT.md`; la deuda en `BUGS_HISTORICOS.md` ("Deuda TSK-118 / ADR-041").

---

## 1. Que se hizo

Se implementaron cuatro frentes de producto, sin crear funciones serverless (presupuesto 8/8
intacto, ADR-001/ADR-010): **canal oficial de comunicacion**, **Casas** (tributo configurable,
lider automatico y misiones conjuntas), **eras/titulos con modales de progresion** y **circulo de
rango en el admin**. Todo entra como ramas `?tipo=` de `api/interacciones.js` **v23** (base v22 de
ADR-039/ADR-040 + hotfixes post-QA J-1/J-2) y una extension de `api/usuarios.js` **v18** (v17 +
hotfix J-3).

**Decision central (ADR-041):** NO se agrega `usuarios.rol` (no existe); el admin se resuelve con
Bearer `ADMIN_SECRET` en backend y el email de sesion solo para la UI. El tributo deja de ser el
literal `0.10` y se lee de `casas_cofre.tributo_pct` (default 10, rango 0..15). La migracion se
numera **026** (no 019) por colision con `019_media_guardados_radio.sql`.

### 1.1 Backend y datos

| Archivo | Tipo | Detalle |
|---|---|---|
| `db/migrations/026_casas_comunicaciones.sql` | NUEVO | 329 lineas, idempotente (ADR-008), ASCII-safe (0 bytes >127, 0 backticks). `chat_salas.es_oficial` + canal "Anuncios ExploraCO" + `uq_chat_salas_oficial`; `casas_cofre.tributo_pct NUMERIC(4,2) DEFAULT 10.00` + CHECK 0..15 + `lider_user_id UUID`; tablas `casa_roles` y `casa_misiones`; backfill de lider y 1 mision base por Casa. Preflight y verificacion post-aplicacion incluidos. |
| `api/interacciones.js` | MODIFICADO | +173/-21 acumulado (incl. hotfixes); header v22 -> **v23**. `acreditarClaseYCofre` lee `casas_cofre.tributo_pct` (default 10, clamp 0..15, L338-345); helper `avanzarMisionesCasa` + `CASA_MISIONES_META` (L360); `GET ?tipo=chat_salas` expone `es_oficial` (L3518, con degradacion 42703 L3537-3539); `GET ?tipo=casa_misiones` (L5270); `POST ?tipo=anuncio_oficial` (L5769, solo Bearer `ADMIN_SECRET`); `POST ?tipo=casa_tributo_config` (L5824, admin o `lider_user_id`; hotfix J-2: authz por `validarSesion` L5835, BUG-064); `chat_msg` con fallback 42703 (L5724-5729) y 403 a no-admin en sala `es_oficial`; hooks de misiones en foto/resena/visita/xp_total. |
| `api/usuarios.js` | MODIFICADO | +66/-11 acumulado (incl. hotfix J-3); header **v16 -> v17 -> v18**. `casa_ranking` expone `lider_user_id`/`tributo_pct` con degradacion escalonada (42P01 -> sin JOIN; 42703 -> `conLider=false`) y refresco best-effort del lider (3 sentencias, sin `entregarXp`); **v18** limita ese refresco a una vez cada 60 s por instancia (`CR_LIDER_REFRESH_MS` L241, throttle L612-625). |

### 1.2 Frontend

| Archivo | Tipo | Detalle |
|---|---|---|
| `usuario-session.js` | MODIFICADO | +245/-0: `TITULOS_POR_NIVEL` (20 titulos, L82), `ERAS` Mundana/Patrocinada/Organizador/Leyenda + `getEra` (L106-113), modales `mostrarModalNivelUp`/`mostrarModalCambioEra` (L116+) disparados desde `aplicarResultadoXp` al subir de nivel. "Ampliar info" dispara `#btn-perfil-viajero` (no se creo `abrirPerfil`). |
| `comunidad.html` | MODIFICADO | +32/-4: sala oficial al tope (`sort` por `es_oficial`), borde/fondo dorado + badge "OFICIAL", input y boton ocultos para no-admin con hint "Solo el administrador puede publicar aqui", limpieza del input en `onOk`. |
| `admin.html` | MODIFICADO | +30/-4: `#map-picker-el` de 380 a 500 px; `adm_actualizarCirculoRango()` con `L.circle` sobre `MapPicker.getPickerMap()` y hooks en `oninput`/`openMapPicker`/`confirmMapPicker`. |
| `map-picker.js` | MODIFICADO | +3/-1: expone `getPickerMap()`/`getMiniMap()` (L267-268); el admin NO asume `MapPicker._map`. |

### 1.3 Numeros verificados (snapshot 2026-09-18)

- `git diff --numstat` (post-hotfix): 6 archivos modificados, **+549/-41** (`api/interacciones.js` +173/-21, `api/usuarios.js` +66/-11, `usuario-session.js` +245/-0, `comunidad.html` +32/-4, `admin.html` +30/-4, `map-picker.js` +3/-1); 1 migracion nueva sin versionar.
- Presupuesto de endpoints: **8/8** (cero archivos nuevos en `api/`).
- Migracion 026: **329 lineas**, 0 bytes >127, 0 backticks.

### 1.4 Hashes del snapshot post-hotfix (para auditoria ADR-006; usar `Get-FileHash -Algorithm SHA256`)

| Archivo | SHA256 |
|---|---|
| `api/interacciones.js` | `932DD2CCC3D5215172A559B37F84DD40533FB0F01A385BB35F74685F2A45A0F7` |
| `api/usuarios.js` | `0B4DDF5182994BAE66CB45841D8D26A44A39D24BCC7F0F14F5BA7097B613C1F1` |
| `usuario-session.js` | `81B90381904395D2C4BEF5C6743FB68AEC709F4839847890C2422202A8E87AEB` |
| `comunidad.html` | `525A22EF3B9FF3E06E9370867B3A019816D08EAADC3C992ECBF6E8B8E202CA55` |
| `admin.html` | `18C343F88C73C5C4D585586266B9CB2BA727962AD36BB69AFABE3C089D492C39` |
| `map-picker.js` | `14C0983FCAE1CD3CE7320CB5E255AF8D39240436C6A9141B661E0014AD89F50D` |
| `db/migrations/026_casas_comunicaciones.sql` | `C29385E0A53CF4D556A8522B63949CECB1C8BB725E73BF8FEEA27C5314C5B2D1` |

---

### 1.5 Hotfixes post-QA (J-1..J-3) y Escudo GOLD

La auditoria QA posterior a la implementacion de TSK-118 detecto tres hallazgos, corregidos sin cambiar el alcance funcional:

| ID | Tipo | Estado | Detalle |
|---|---|---|---|
| J-2 | SEGURIDAD (IDOR) | CORREGIDO en v23 (`BUG-064` CERRADO) | `POST ?tipo=casa_tributo_config` autorizaba al lider con el `usuario_id` del body. Ahora exige `validarSesion(req, usuarioId2).ok` (JWT, ADR-025) antes de comparar contra `casas_cofre.lider_user_id` (L5835). |
| J-1 | degradacion | MITIGADO en v23 | `GET ?tipo=chat_salas` y `POST chat_msg` degradan con fallback `42703` (`false AS es_oficial`) si la 026 no esta aplicada; en `chat_msg` se elimino el catch silencioso (`console.error` + re-lanzar). Aplicar 026 sigue siendo obligatorio. |
| J-3 | amplificacion de escritura | MITIGADO en v18 | El refresco del lider en `GET ?tipo=casa_ranking` corre como maximo cada 60 s por instancia (`CR_LIDER_REFRESH_MS`); lecturas intactas. Con N instancias hay hasta N refrescos/min. |

**Escudo GOLD post-hotfix (2026-09-18):** `node --check` OK en 4 archivos (`api/interacciones.js`, `api/usuarios.js`, `usuario-session.js`, `map-picker.js`); ASCII-safe **0 bytes >127** en `api/`; **balance de divs 0** (`admin.html`/`comunidad.html`); presupuesto **8/8 funciones** INTACTO (ADR-001/ADR-010).

**Sigue abierto (amplificado):** BUG-061 (`POST tipo='foto'` sin `validarSesion`); los hooks `avanzarMisionesCasa` (foto/resena/visita) escriben a nombre del `usuario_id` del body. Ver `BUGS_HISTORICOS.md` BUG-061.

---

## 2. Que quedo pendiente

### 2.1 BLOQUEANTE: aplicar 026 en Neon ANTES del deploy del backend v23/v18

El backend consulta `chat_salas.es_oficial`, `casas_cofre.tributo_pct`/`lider_user_id`,
`casa_roles` y `casa_misiones`; si no existen, el canal oficial y la configuracion del tributo
fallan (y el ranking degrada). **La 024 y la 025 se consideran YA aplicadas** (indicacion del
usuario, 2026-09-18). Orden obligatorio: **024 -> 025 -> 026 -> deploy backend (v23/v18) -> frontend.**

Pasos (los ejecuta Javier; requiere `DATABASE_URL` de Neon):

1. Correr el **PREFLIGHT (seccion 0)** de `db/migrations/026_casas_comunicaciones.sql`
   (read-only; sentencia por sentencia) y confirmar cada resultado esperado.
2. Correr el archivo **COMPLETO** en el editor SQL de Neon; re-ejecutar es no-op (idempotente
   ADR-008). La semilla del canal oficial solo se inserta si existe la cuenta admin
   (`brsk84@gmail.com`); si no existe, el canal no se siembra (comportamiento aceptado).
3. Correr el bloque de **VERIFICACION POST-APLICACION** (seccion final del `.sql`): columna
   `es_oficial`, canal oficial unico, indice `uq_chat_salas_oficial`, columnas de `casas_cofre` +
   CHECK, lideres/tributo por Casa, fila `lider` en `casa_roles` y 3 misiones base.
4. Deploy del **backend** (`api/usuarios.js` v18 + `api/interacciones.js` v23) y despues del
   **frontend** (`usuario-session.js`, `comunidad.html`, `admin.html`, `map-picker.js`).

### 2.2 Pendientes no bloqueantes

- **Misiones base de Casa no diferenciadas:** la 026 siembra la MISMA mision para las 3 Casas.
- **`casa_roles` solo puebla `lider`:** `oficial`/`mariscal`/`miembro` existen en el CHECK sin
  flujo de asignacion en v1.
- **Linea-titulo L1 de `api/interacciones.js` aun v22:** el changelog ya entro a v23 (`canal oficial
  es_oficial con degradacion 42703; authz de casa_tributo_config via validarSesion; fix IDOR
  lider`). Corregir la linea-titulo en el commit.
- **Circulo de rango sin validar en produccion:** depende del deploy.
- **BUG-061 sigue ABIERTO y AMPLIFICADO** por los hooks `avanzarMisionesCasa` (foto/resena/visita);
  BUG-002 y BUG-062 siguen ABIERTOS (ajenos a esta sesion). **BUG-064 quedo CERRADO** (hotfix J-2).
- **Commit + push:** los 6 archivos modificados + la migracion 026 + el cierre documental
  (`TASKS.md`, `NEXT.md`, `DECISIONS.md` ADR-041, `PROJECT.md`, `BLUEPRINT.md`,
  `BUGS_HISTORICOS.md` y este handoff) en un release coherente. NO mezclar archivos
  ajenos/borrados del working tree.

---

## 3. Como verificar

### 3.1 Verificacion local (sin Neon; lo que ya se corrio en esta sesion)

```powershell
# Sintaxis (Escudo GOLD post-hotfix) -- resultado: 4/4 OK
node --check api/interacciones.js
node --check api/usuarios.js
node --check usuario-session.js
node --check map-picker.js

# ASCII-safety -- resultado post-hotfix: 0 bytes >127 en api/*.js
# Balance de divs -- resultado post-hotfix: 0 en admin.html / comunidad.html
# Presupuesto -- resultado: 8/8 funciones en api/ (cero archivos nuevos)
```

### 3.2 Verificacion en Neon (post-aplicacion, pre-deploy)

```sql
-- Columna es_oficial en chat_salas (esperada 1 fila)
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema='public' AND table_name='chat_salas' AND column_name='es_oficial';

-- Canal oficial unico (esperada 1 fila; 0 = la cuenta admin no existia al aplicar)
SELECT id, nombre, tipo, orden, es_oficial FROM chat_salas WHERE es_oficial = true;

-- Indice unico parcial
SELECT indexname FROM pg_indexes
WHERE schemaname='public' AND indexname='uq_chat_salas_oficial';

-- Columnas y CHECK de casas_cofre
SELECT column_name, data_type FROM information_schema.columns
WHERE table_schema='public' AND table_name='casas_cofre'
  AND column_name IN ('tributo_pct','lider_user_id');
SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint
WHERE conname='casas_cofre_tributo_pct_check';

-- Lider, tributo y roles (esperadas 3 filas por Casa con candidato)
SELECT casa, tributo_pct, lider_user_id FROM casas_cofre ORDER BY casa;
SELECT casa, usuario_id, rol, activo FROM casa_roles WHERE rol='lider' ORDER BY casa;

-- Mision base (esperadas 3; re-ejecutar debe seguir en 3)
SELECT casa, nombre, meta_tipo, meta_valor FROM casa_misiones
WHERE nombre='Primera Expedicion de Casa' ORDER BY casa;
```

### 3.3 Verificacion en vivo (post-deploy)

1. **Canal oficial:** abrir `comunidad.html`; la sala "Anuncios ExploraCO" aparece al tope con badge
   OFICIAL; un tercero no puede escribir (input oculto y 403 server-side). Publicar un anuncio con
   Bearer `ADMIN_SECRET` (`POST /api/interacciones?tipo=anuncio_oficial`) y verlo en el chat.
2. **Tributo configurable:** como admin o lider, `POST ?tipo=casa_tributo_config` con `tributo_pct`
   entre 0 y 15; confirmar el cambio en `casas_cofre.tributo_pct` y el efecto en
   `xp_cofre_total` tras una accion con XP. **Verificar J-2:** un `usuario_id` ajeno SIN JWT valido
   debe recibir 403 (ya no basta el body).
3. **Lider:** `GET /api/usuarios?tipo=casa_ranking` debe devolver `lider_user_id` y `tributo_pct`;
   `casa_roles` debe tener la fila `lider` del usuario con mas `xp_total`.
4. **Misiones conjuntas:** ejecutar una visita/resena/foto o ganar XP y ver avanzar
   `casa_misiones.progreso_actual` (y `completada` al llegar a `meta_valor`).
5. **Progresion:** subir de nivel y ver el modal de nivel-up; si cruza de era, ver el segundo modal.
6. **Admin mapa:** abrir el picker con un `destino.radio_m` real y confirmar el circulo de rango
   (y la altura de 500 px) en desktop y movil.

---

## 4. Rollback (solo emergencia)

- **026 (LOSSY):** `DROP TABLE casa_roles, casa_misiones;`, `DROP INDEX uq_chat_salas_oficial;`,
  `ALTER TABLE chat_salas DROP COLUMN es_oficial;`, `ALTER TABLE casas_cofre DROP COLUMN tributo_pct,
  DROP COLUMN lider_user_id;`. Es LOSSY si ya hay anuncios, roles, misiones o tributos registrados.
- El frontend y el backend v23/v18 deben revertirse en el mismo paso que la 026.
- Las migraciones 024 y 025 NO se tocan (otras entregas).

---

**Regla de actualizacion:** toda correccion posterior debe reflejarse en `TASKS.md` (estado),
`NEXT.md` (relevo) y, si cambia la decision, en `DECISIONS.md` ADR-041. El historial de chat NUNCA
es fuente de verdad (Reglas de Oro v5, punto 8).
