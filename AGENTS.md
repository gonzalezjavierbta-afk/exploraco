# AGENTS.md — ExploraCO

Gobernanza de agentes y skills. Normativa: `exploraco desarrollo/BLUEPRINT.md`, `exploraco desarrollo/🛡️ Reglas de Oro ExploraCO — v5.md`, `exploraco desarrollo/PROJECT.md`, `exploraco desarrollo/DECISIONS.md`. Actualizado 2026-10-01 (roster único de 20 agentes; §0 selección de tier obligatoria; retiro de la ruta híbrida).

## 0. Selección de tier obligatoria (primera regla de comportamiento)

Antes de cualquier exploración, edición o delegación, el orquestador DEBE preguntar al usuario, con la herramienta `question` y **UNA VEZ POR TAREA**, qué tier usar:

- **FREE** — `opencode/space-bunny-free` (costo `$0`). **Es el único tier con agentes materializados**: los 20 agentes del roster corren en este modelo.
- **PAGO** — modelo de pago del operador. **No hay ningún agente de pago en el roster**: para usarlo habría que crear el agente y fijar su `model:` explícitamente, previa confirmación del usuario.

La respuesta **fija la ruta de la sesión** y no se vuelve a preguntar durante esa tarea. **Sin respuesta no se ejecuta nada**: no hay default silencioso.

## 1. Matriz de enrutamiento

Roster único de **20 agentes**: 4 primarios (orquestación) + 16 subagentes especialistas, **un único agente por dominio** (sin pares gratuito/de pago). **La tabla ES el flujo de delegación**.

| Dominio | Agente Especialista Único |
|---|---|
| CSS de silo / templates / UI | `@frontend-tpl` |
| `admin.html` / panel admin | `@admin-dev` |
| Backend `api/*.js` / Neon / serverless | `@backend-dev` |
| SQL / RLS / esquema | `@sql-security` |
| Migraciones / seeds masivos | `@data-migration` |
| JS/TS rutinario, scripts de `scripts/` | `@js-silo-dev` |
| Páginas dinámicas (seed + loader + smoke) | `@content-loader` |
| Motor de render (`api/pagina-destino.js`) | `@renderer-dev` |
| SEO / sitemap / meta / OG | `@seo-dev` |
| Arquitectura / ADR | `@architect` |
| Revisión de arquitectura / ADR | `@architect-review` |
| Imágenes/audio/video/PDF | `@media-reader` |
| Research de destinos (fichas) | `@research-agent` |
| Exploración masiva | `@explore` |
| Cierre documental | `@docs-keeper` |
| Certificación / Escudo GOLD | `@qa-auditor` |

**Primarios** (`mode: primary`): `@free-plan` y `@free-build` (ruta FREE, `model:` explícito). `@plan` y `@build` heredan el modelo por defecto y son la entrada para sesiones largas o de riesgo alto. No implementan: orquestan y delegan. **No existe ruta híbrida ni ruta PAGO con agentes propios** (retirada en ADR-067 / ADR-076).

Archivos: `ls .opencode/agent/` (ADR-006: el archivo real manda).

## 2. Capa de coste y gates de riesgo (ADR-074)

- **Todo el roster es FREE** (`opencode/space-bunny-free`, `$0`). Un `task` nunca cuesta dinero. Verificable con `node scripts/ejecucion/verificar-capa-gratis.js`, que debe reportar `20 | gratis: 20 | de pago: 0`.
- **Gate de confirmación por riesgo:** estos dominios exigen **CONFIRMACIÓN EXPLÍCITA del usuario antes de ejecutar**, incluso en ruta FREE:
  - RLS / esquema SQL → `@sql-security`
  - Migraciones / seeds masivos → `@data-migration`
  - Motor de render `buildHTML()` → `@renderer-dev`
  - Decisiones de arquitectura / ADR → `@architect`, `@architect-review`
- Prohibido escalar de tier en silencio. Si una tarea no se resuelve en FREE, se entrega como bloque y se pregunta; no se fuerza.

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
10. **Lectura por rango:** prohibido leer completos archivos > **150 KB** (`api/interacciones.js` ~560 KB, `admin.html` ~340 KB, `mi-perfil.html` ~379 KB, `DECISIONS.md` ~400 KB, `TASKS.md` ~400 KB, `NEXT.md` ~330 KB, `BUGS_HISTORICOS.md` ~155 KB). Usar `grep` con ruta concreta y `Read` con `offset`/`limit`: un read completo envenena el `cache_read` siguiente.
11. **Eficiencia (skill `eficiencia-recursos`):** costo = turnos × contexto; 1 exploración + 1 implementación por dominio + 1 verificación por script; cierre con `node scripts/usage_report.js --summary`.
12. **Presupuesto y cierre medido:** antes de ejecutar, estimar tokens y tiempo; al cerrar, conciliar estimado vs real con `usage_report.js` y `scripts/session_close.js`. **Fórmula de estimación (medida el 2026-10-02):** el `cache_read` fue el **91.7%** del gasto de una tanda de 18M tokens; la salida de herramientas, solo el 0.55%. El coste real es **turnos × contexto acumulado**, así que se estima con **~50.000 tokens por turno × nº de turnos**, nunca "tokens útiles por tarea". Estimar por salida de herramientas infraestima 45-70x.
13. **Contrato de retorno (~600 tokens):** todo `task` exige STATUS, ARCHIVOS con `ruta:rango`, VERIFICACION N/N, BLOQUEADORES y SIGUIENTE. Prohibido volcar archivos o narrar lo leído.
14. **Watchdog:** un subagente con > 25 turnos o > 50.000 tokens/turno se aborta y se re-planifica. Nunca se re-despacha el mismo perfil que falló. **El watchdog avisa a posteriori: el prevention es trocear el encargo, no esperar la alerta.**
15. **Anti-absorción (skill `anti-absorcion`):** el orquestador delega, no absorbe. Si supera 20-25 llamadas directas, delega a `@explore`.
16. **Express (skill `express-mode`):** "express", "xpress" o "rápido" cambia el orden y la profundidad de los controles, no los elimina. Escala a modo normal en arquitectura, RLS/seguridad, migraciones o más de 3 archivos críticos.
17. **Presupuesto por dominio:** ningún `task` debe superar **15 turnos ni 500.000 tokens**. Si lo excede, el brief está mal troceado, no el agente lento. Regla operativa: **1 subagente por módulo**, y **el brief da el resultado esperado, no el método** — prescribing el método (p.ej. "construye un mini-DOM con `vm`") multiplica los turnos.
18. **Higiene de consumo en tools:** prohibido `git diff` (sin `--stat`) de archivos > 150 KB; los `grep`/`rg` contra `BUGS_HISTORICOS.md`, `DECISIONS.md`, `TASKS.md` y `NEXT.md` llevan `-m 3`. Verificar con los scripts de `$0` **antes** de delegar una auditoría, para no pagar dos veces lo mismo.
19. **Permisos (ADR-078):** `opencode.json` opera con permiso total (`external_directory`, `webfetch`, `websearch` y `bash` en `allow`) para que ninguna tarea vuelva a pedir autorización. Se conservan `edit: deny` en `@explore`, `@plan` y `@free-plan` porque no *preguntan*: bloquean, y son la separación de roles de ADR-006/ADR-074.

## 4. Índice de skills

Skills REALES en `.opencode/skills/` (11): `anti-absorcion` · `create-dynamic-page` · `eficiencia-recursos` · `express-mode` · `frontend-design` · `gold-shield` · `grill-me` · `improve-codebase-architecture` · `research-destination` · `templates` · `web-design-guidelines`.

**Despublicadas (retiradas 2026-10-01, NO invocar):** `batch-create` · `gemini-research` · `ingest-eventos`. Sus recursos aprovechables se conservaron en `.opencode/prompts/` (`GEMINI_MASTER_PROMPT.md`, `GEMINI_EVENTOS_PROMPT.md`, `GEMINI_GEMA_INVESTIGACION.md`, `ficha_template.md`) y el validador de fichas quedó en `scripts/validate_ficha.js` (canónico, cierra BUG-034).

**Pendientes de creación (NO existen, no invocar):** `agentes-roster` · `modelos-verificados` · `reglas-de-oro`. Declararlas como existentes es un error; hasta su creación, seguir la normativa de `exploraco desarrollo/🛡️ Reglas de Oro ExploraCO — v5.md` y `BLUEPRINT.md`.