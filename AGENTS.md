# AGENTS.md — ExploraCO

Gobernanza de agentes y skills. Normativa: `exploraco desarrollo/BLUEPRINT.md`, `exploraco desarrollo/🛡️ Reglas de Oro ExploraCO — v5.md`, `exploraco desarrollo/PROJECT.md`, `exploraco desarrollo/DECISIONS.md`. Actualizado 2026-10-05 (**ADR-084 sobre ADR-083 y ADR-082**: el tier NO lo fija la sesion ni el primario, lo fija el **modelo activo de cada turno**; los 18 agentes van SIN `model:` y con `coste: heredado`; roster **20 -> 18** = 2 primarios de rol + 16 subagentes; §0 deja de ser una pregunta; el invariante de coste pasa de prohibicion a atribucion. **ADR-084**: el argumento documental vive UNA vez en `DECISIONS.md`, el techo de salida de herramienta es norma en §18, y el brief se pega de `scripts/docs-evidencia.js`, jamas de memoria).

## 0. Seleccion de tier: la fija el MODELO ACTIVO de cada turno (ADR-082 + ADR-083)

**Tampoco es una pregunta.** El tier lo fija **el modelo activo en el turno en curso**, cambiable en el selector de modelos de la sesion, y los **16 subagentes heredan ese modelo** en cada turno (mecanismo **medido**, no citado: T2.5 en `scripts/ejecucion/sondas/sonda-modelos.md`). La **seleccion explicita de modelo PISA el pin del agente** (`-m` / selector): PROBADO en carga real. Es la palanca de pago que ADR-082 buscaba y que ya existe en el producto.

| Rol | Agente | `model:` | `coste:` | Cuando invocarlo |
|---|---|---|---|---|
| Planificacion | `@plan` | **sin pin (hereda el activo)** | `heredado` | Planificar por dominio. `edit: deny` |
| Construccion | `@build` | **sin pin (hereda el activo)** | `heredado` | Construir delegando. `edit: allow` |

- **Tier y rol son ortogonales** (ADR-083 D1): el precio es una decision del **turno**, el comportamiento es una decision del **agente**. `@free-plan` y `@free-build` **ya no existen** (borrados; roster **20 -> 18**). Una sesion **puede empezar FREE y terminar PAGO**: eso es **capacidad declarada**, no violacion.
- **El coste de un turno escala con el CONTEXTO ACUMULADO**, no con la tarea: `~50.000 tokens x nº de turnos`, con el `cache_read` como **86,49%--91,7%** del gasto medido. Estimar por salida de herramientas infraestima 45-70x.
- **Asimetria de momento (D4):** la misma escalada no cuesta lo mismo segun cuando se hace. Turno 2 (~20k de contexto) ~**$0.0015** por subagente; turno 25 (~700k) ~**$0.0538**. **~35x.** Escalar en el turno 2 es un detalle; en el turno 25 es la factura de la sesion. Por eso el tier se decide **por turno** y por eso existe `--preflight`.

### Riesgo conocido: una sesion puede abrir en PAGO sin aviso

Con `default_agent: "build"` **sin pin** y `model`/`small_model` en la allowlist FREE, si el **selector recuerda `opencode-go/deepseek-v4.1-flash`**, la sesion abre en **PAGO sin ningun aviso**: el archivo `opencode.json` no le gana a un selector con memoria. No es un fallo del guard (el check (f) se cumple) sino un **hueco de la premisa nueva**, y se documenta en vez de ocultarse. Deteccion: `node scripts/ejecucion/verificar-capa-gratis.js --preflight` (modelo activo + contexto actual + coste estimado de continuar en PAGO) y la lectura de 10 s del operador: **preguntar el modelo activo antes y despues de pulsar Tab**.

## 1. Matriz de enrutamiento

Roster único de **18 agentes** = **2 primarios (orquestación) + 16 subagentes especialistas**, **un único agente por dominio** (sin par gratuito/de pago, ADR-076). **La tabla ES el flujo de delegación**.

Los **18** declaran `coste: heredado` y **ninguno lleva `model:`**. El modelo efectivo lo hereda el **modelo activo del turno** (§0), así que la columna de modelo no los diferencia entre sí: lo que los diferencia es el **gate** de §2.

| Dominio | Agente Especialista Único | `model:` | Gate §2 |
|---|---|---|---|
| CSS de silo / templates / UI | `@frontend-tpl` | sin pin (hereda el activo) | no |
| `admin.html` / panel admin | `@admin-dev` | sin pin (hereda el activo) | **sí** |
| Backend `api/*.js` / Neon / serverless | `@backend-dev` | sin pin (hereda el activo) | **sí** |
| SQL / RLS / esquema | `@sql-security` | sin pin (hereda el activo) | **sí** |
| Migraciones / seeds masivos | `@data-migration` | sin pin (hereda el activo) | **sí** |
| JS/TS rutinario, scripts de `scripts/` | `@js-silo-dev` | sin pin (hereda el activo) | no |
| Páginas dinámicas (seed + loader + smoke) | `@content-loader` | sin pin (hereda el activo) | **sí** |
| Motor de render (`api/pagina-destino.js`) | `@renderer-dev` | sin pin (hereda el activo) | **sí** |
| SEO / sitemap / meta / OG | `@seo-dev` | sin pin (hereda el activo) | **sí** |
| Arquitectura / ADR | `@architect` | sin pin (hereda el activo) | **sí** |
| Revisión de arquitectura / ADR | `@architect-review` | sin pin (hereda el activo) | **sí** |
| Imágenes/audio/video/PDF | `@media-reader` | sin pin (hereda el activo) | no |
| Research de destinos (fichas) | `@research-agent` | sin pin (hereda el activo) | no |
| Exploración masiva | `@explore` | sin pin (hereda el activo) | no |
| Cierre documental | `@docs-keeper` | sin pin (hereda el activo) | no |
| Certificación / Escudo GOLD | `@qa-auditor` | sin pin (hereda el activo) | no |

**Primarios** (`mode: primary`): `@plan` y `@build`, los dos **sin pin** y con `coste: heredado`. Se distinguen por **permiso de escritura**, no por precio: `plan` conserva `edit: deny` (ADR-078), `build` no. Orquestan y delegan: **no implementan**. No existe ruta híbrida ni pares por tier (retirada en ADR-067 / ADR-076).

Archivos: `ls .opencode/agent/` (ADR-006: el archivo real manda).

## 2. Capa de coste y gates de riesgo (ADR-082 + ADR-083)

**El coste ya no es propiedad de nadie en la tabla de agentes.** Ningún rol tiene precio propio: lo pone el **modelo activo de cada turno**. Reparto real del roster, verificado con `node scripts/ejecucion/verificar-capa-gratis.js`, que debe reportar `Agentes: 18 | primarios: 2 | subagentes heredados: 16` y `RESULTADO: OK. Cascada vigente (ADR-082).`:

- **18 agentes sin `model:`** (2 primarios + 16 subagentes), los 18 con `coste: heredado`. Un `task` no cuesta dinero por sí mismo: cuesta lo que cuesta el **turno** en el que se lanza.
- **Default de sesión FREE** (`opencode.json`): `model` y `small_model` = `opencode/space-bunny-free` -> **check (f) SE MANTIENE**. Es la garantía de que una sesión que **no toca el selector** arranca en `$0`.
- Prohibido reintroducir un pin en un subagente o pinear un modelo fuera de las allowlists medidas: el guard lo falla. `opencode/big-pickle` está en **ROTOS**.

### R5 pasa de PROHIBICIÓN a ATRIBUCIÓN (ADR-083 D2)

El invariante de coste ya **no** es "una sesión no debe contener más de un modelo". Ese check se **eliminó** (D2) porque prohibía justo la capacidad que el operador quiere y porque, medido sobre el historial local (**1.702 sesiones**, **57** cambiaron de modelo a mitad, **921** abrieron en pago), nunca fue cierto como invariante: no era un fallo de seguridad, era la casuística mayoritaria. Lo que sustituye:

- **(i) Atribución:** el reparto real por tier se mide por **`message.data.modelID` / `$.providerID`, por mensaje de asistente**, y reporta coste y tokens por tier: `node scripts/ejecucion/verificar-capa-gratis.js reparto --sesion <id>`.
- **(ii) Detector de ESCALADA TARDIA:** avisa cuando se cumple la conjunción *(primer mensaje de asistente FREE) AND (último mensaje PAGO) AND (contexto por encima del umbral)*, e imprime el **coste estimado** de continuar en ese tier. No es una prohibición: es una **advertencia con número**. Se dispara porque el riesgo real no es cambiar de tier, es cambiarlo **tarde** (D4).
- **Se mantiene el check (f)** (default de sesión en allowlist FREE), y también (a) *cero pines en subagentes*, (b) *`coste: heredado` en los 18* y (e) *allowlists cerradas y ROTOS sin referenciar*. **(c) y (d) se reescribieron** (ADR-083): (c) exige que los primarios **NO** declaren `model:` y sí `coste: heredado`; (d) ya no exige cobertura de tiers en la configuración, es un hecho medido en `opencode.db`.
- **`session.model` del header es un campo trampa:** registra el **ÚLTIMO** modelo, nunca el de apertura, y `PRAGMA table_info(session)` no expone "abrió como". **NO usarlo para decidir nada.** La fuente fiable es **`message.data.modelID` por mensaje de asistente**.
- **Control positivo restante:** la aserción `verificar-herencia --sesion <id>` (`modelo del hijo == modelo del padre`), que sigue siendo la prueba de que la cascada de ADR-082 no se rompió en silencio.

### Gates de riesgo: se piden SIEMPRE, por ROL y no por tier

El gate es por naturaleza del **dominio**, no por el precio del modelo. **Pagar no compra saltar el freno** (ADR-082 §6): un gate condicional al tier crearía un incentivo invertido, y con el tier desanclado del agente un gate por tier sería literalmente imposible de escribir. **Se piden también cuando la invocación viene del menú `@`**: el menú `@` es el bypass de `permission.task`, así que el gate es la única red que cubre esa vía.

**Con gate (9)** — exigen **CONFIRMACIÓN EXPLÍCITA del usuario antes de ejecutar**:

| Dominio | Agente |
|---|---|
| RLS / esquema SQL | `@sql-security` |
| Migraciones / seeds masivos | `@data-migration` |
| Backend `api/*.js` / Neon | `@backend-dev` |
| Motor de render `buildHTML()` | `@renderer-dev` |
| `admin.html` / panel admin | `@admin-dev` |
| SEO / sitemap / `index.html` | `@seo-dev` |
| Páginas dinámicas (escribe seeds) | `@content-loader` |
| Arquitectura / ADR | `@architect`, `@architect-review` |

**Sin gate (7):** `@docs-keeper` · `@explore` · `@js-silo-dev` · `@frontend-tpl` · `@media-reader` · `@qa-auditor` · `@research-agent` (este último solo **valida** fichas; nunca investiga por cuenta propia).

**R5 — un SOLO invariante, y es el comprobable:** *capa gratuita intacta* = **cero pines** en los 18 agentes del roster y **cero filas** en `opencode.db` con modelo de la allowlist PAGO en una sesión abierta por un primario FREE **que no haya cambiado de modelo en el turno**. No se afirma coste absoluto (`$0.000000`): no sobrevive a `small_model`, a las fees del proveedor ni a los subagentes anidados. El control positivo lo dan las 6 comprobaciones del guard, la aserción `verificar-herencia --sesion <id>` (modelo del hijo == modelo del padre) y la atribución `reparto --sesion <id>`. El resto de R5 no cambia: no crear agentes de pago ad-hoc y no saltar gates.

**Antes de cambiar de modelo, el número va delante (D5):** `node scripts/ejecucion/verificar-capa-gratis.js --preflight` imprime el **modelo activo**, el **contexto actual** y el **coste estimado** de continuar en PAGO; el umbral de contexto es un **parámetro** (`--umbral`), no una constante. Una sesión **puede** empezar FREE y terminar PAGO: lo que no puede es hacerlo **a ciegas**. **Si la tarea no se resuelve en FREE, se entrega como bloque y el operador decide** si escala. El tier se cambia **en el selector, no cambiando de agente**: cambiar de primario a mitad rompe la continuidad del prompt (`cache_read` = 86%--91% del gasto) y no es necesario para cambiar de precio.

## 3. Reglas transversales

1. **Vanilla JS puro (ADR-001):** prohibido Node.js en runtime cliente, React o build tools.
2. **ASCII-safe (ADR-002):** cero bytes > 127, escapes `\uXXXX` simples, cero backticks en serverless. Los `.md` de gobernanza sí admiten tildes.
3. **Cero Borrado Lógico (ADR-003):** nunca eliminar IDs del DOM aunque el módulo esté oculto (`display: none`).
4. **Aislamiento Atómico (ADR-004):** todo CSS nuevo de una categoría vive bajo un selector padre único con Reset de Silo. Nada suelto en `:root`.
5. **Silent Fallback (ADR-008):** todo `<img>` dinámico lleva `onerror` con fallback.
6. **Baseline = archivo real (ADR-006):** nunca dar por "pendiente" o "completo" algo citado en TASKS.md/NEXT.md sin verificar el archivo.
7. **Presupuesto de Vercel Hobby:** 8/8 funciones serverless agotadas. Prohibido proponer endpoint nuevo; extender uno existente vía query params.
8. **Escudo GOLD:** antes de desplegar `api/*.js`, `admin.html`, `index.html` o el motor de render → skill `gold-shield`.
9. **Mandato documental (R2):** las actualizaciones de `TASKS.md`/`NEXT.md`/`DECISIONS.md` se entregan en **un único pase de cierre** delegado a `@docs-keeper`, nunca durante la implementación.
10. **Lectura por rango (ADR-084 D5):** prohibido leer completos archivos > **150 KB**. **Tamanos reales medidos el 2026-10-04**, no los declarados: `api/interacciones.js` **747,1 KB**, `admin.html` **520,1 KB**, `mi-perfil.html` **379,2 KB**, `DECISIONS.md` **741,5 KB / 4.731 lineas**, `TASKS.md` **589,1 KB / 4.272**, `NEXT.md` **404,6 KB / 2.311**, `BUGS_HISTORICOS.md` **226,7 KB**, `BLUEPRINT.md` **79,0 KB**, `PROJECT.md` **55,2 KB**. Usar `grep` con ruta concreta y `Read` con `offset`/`limit` (**<= 60 lineas**, ver 18): un read completo envenena el `cache_read` siguiente. **No existe `DECISIONS_ARCHIVO.md`** y los sumideros que si existen (`TASKS_ARCHIVO.md` 50,0 KB, `NEXT_ARCHIVO.md` 191,7 KB) estan **congelados desde 2026-09-19**: no son un sumidero activo, no cuentes con ellos como destino. El argumento de cada decision se cita **una sola vez**, en su ADR (ADR-084 D1): los demas ficheros apuntan.
11. **Eficiencia (skill `eficiencia-recursos`):** costo = turnos × contexto; 1 exploración + 1 implementación por dominio + 1 verificación por script; cierre con `node scripts/usage_report.js --summary`. En un turno con modelo de pago esta fórmula deja de ser un conteo y pasa a ser un **presupuesto de dinero**.
12. **Presupuesto y cierre medido:** antes de ejecutar, estimar tokens y tiempo; al cerrar, conciliar estimado vs real con `usage_report.js` y `scripts/session_close.js`. **Fórmula de estimación (medida el 2026-10-02):** el `cache_read` fue el **91.7%** del gasto de una tanda de 18M tokens; la salida de herramientas, solo el 0.55%. El coste real es **turnos × contexto acumulado**, así que se estima con **~50.000 tokens por turno × nº de turnos**, nunca "tokens útiles por tarea". Estimar por salida de herramientas infraestima 45-70x. **La estimación en tokens es comparable entre tiers** (misma fórmula, mismo contexto acumulado), pero el **precio por token no lo es**: `opencode/space-bunny-free` es `$0` y `opencode-go/deepseek-v4.1-flash` se pagó **$0.003331** en un workload real de 4 turnos / 43.360 tokens. Con el tier por turno (ADR-083), **cualquiera de los 2 primarios puede estar en FREE o en PAGO**: lo que decide el gasto es el modelo activo del turno, no el nombre del agente. En PAGO hay **dos** palancas y se eligen por momento (D4): **recortar turnos** y **escalar temprano**.
13. **Contrato de retorno (~600 tokens):** todo `task` exige STATUS, ARCHIVOS con `ruta:rango`, VERIFICACION N/N, BLOQUEADORES y SIGUIENTE. Prohibido volcar archivos o narrar lo leído.
14. **Watchdog:** un subagente con > 25 turnos o > 50.000 tokens/turno se aborta y se re-planifica. Nunca se re-despacha el mismo perfil que falló. **El watchdog avisa a posteriori: el prevention es trocear el encargo, no esperar la alerta.**
15. **Anti-absorción (skill `anti-absorcion`):** el orquestador delega, no absorbe. Si supera 20-25 llamadas directas, delega a `@explore`.
16. **Express (skill `express-mode`):** "express", "xpress" o "rápido" cambia el orden y la profundidad de los controles, no los elimina. Escala a modo normal en arquitectura, RLS/seguridad, migraciones o más de 3 archivos críticos.
17. **Presupuesto por dominio:** ningún `task` debe superar **15 turnos ni 500.000 tokens**. Si lo excede, el brief está mal troceado, no el agente lento. Regla operativa: **1 subagente por módulo**, y **el brief da el resultado esperado, no el método** — prescribing el método (p.ej. "construye un mini-DOM con `vm`") multiplica los turnos.
18. **Higiene de consumo en tools (techo de salida, ADR-084 D3):** prohibido `git diff` (sin `--stat`) de archivos > 150 KB; los `grep`/`rg`/`Select-String` contra `BUGS_HISTORICOS.md`, `DECISIONS.md`, `TASKS.md` y `NEXT.md` llevan **`-m 2`** (baja de `-m 3`); **`Read` con `offset`/`limit` de <= 60 lineas** contra esos 4 ficheros y contra cualquier fichero > 150 KB; **prohibido volcar un fichero entero** para ubicarse (el ultimo ADR se localiza con `Select-String -Pattern "^## ADR-0"` y se lee **su seccion**, no el fichero). Excepcion: la **verificacion de conteo** por `Select-String` no es una lectura y no la acota este techo. Verificar con los scripts de `$0` **antes** de delegar una auditoría, para no pagar dos veces lo mismo.
19. **Permisos (ADR-078 + ADR-082 §5 + ADR-083):** `opencode.json` opera con permiso total (`external_directory`, `webfetch`, `websearch` y `bash` en `allow`) para que ninguna tarea vuelva a pedir autorización. Los 2 primarios tienen además `permission.task` con `"*": deny` primero y allow-list de los 16 subagentes: eso acota el **radio en delegación**, no el coste, y el operador puede saltárselo invocando un subagente por el menú `@` (el gate de §2 es la única red que cubre esa vía). Se conservan `edit: deny` en `@explore` y `@plan` porque no *preguntan*: bloquean, y son la separación de roles de ADR-006/ADR-078.

## 4. Índice de skills

Skills REALES en `.opencode/skills/` (12): `anti-absorcion` · `cascada-tier` · `create-dynamic-page` · `eficiencia-recursos` · `express-mode` · `frontend-design` · `gold-shield` · `grill-me` · `improve-codebase-architecture` · `research-destination` · `templates` · `web-design-guidelines`.

**`cascada-tier` ya NO es la fuente de la regla de tier** (ADR-083): la fuente son **este `AGENTS.md` §0/§2 y `DECISIONS.md` ADR-083**. La skill se conserva como guía operativa de allowlists, gates, herencia y verificación.

**Despublicadas (retiradas 2026-10-01, NO invocar):** `batch-create` · `gemini-research` · `ingest-eventos`. Sus recursos aprovechables se conservaron en `.opencode/prompts/` (`GEMINI_MASTER_PROMPT.md`, `GEMINI_EVENTOS_PROMPT.md`, `GEMINI_GEMA_INVESTIGACION.md`, `ficha_template.md`) y el validador de fichas quedó en `scripts/validate_ficha.js` (canónico, cierra BUG-034).

**Pendientes de creación (NO existen, no invocar):** `agentes-roster` · `modelos-verificados` · `reglas-de-oro`. Declararlas como existentes es un error; hasta su creación, seguir la normativa de `exploraco desarrollo/🛡️ Reglas de Oro ExploraCO — v5.md` y `BLUEPRINT.md`.