---
doc: PLAN-adaptacion-cascada-tier
fecha: 2026-10-04
sesion: ses_ef8d86d68ffeE8AktczcH4I4J1 (free-plan)
tier: FREE ($0) - solo plan, cero archivos de gobernanza tocados
decisiones_autorizadas:
  GATE-1: si - ExploraCO adopta ruta PAGO (revierte ADR-074)
  GATE-2: si - sondas reales con modelos como subagente ANTES de escribir model:
  GATE-3: si - reescribir verificar-capa-gratis.js para validar cascada
  GATE-4: si - portar permission.task en bloque a los 4 primarios
estado: vigente
---

# Plan: adaptacion del sistema dual (cascada-tier / ADR-069) a ExploraCO

## Problema

`hostalterraza/.opencode/skills/cascada-tier/SKILL.md` (ADR-069) implementa un sistema
dual SIN agentes gemelos: los 16 subagentes omiten `model:` y heredan el del primario
invocante. Exploraco tiene los 20 agentes pineados a `opencode/space-bunny-free`, lo que
anula la herencia: aunque se invoque `@build` esperando criterio de pago, `@backend-dev`
corre igual en FREE.

## Estado comparativo verificado (datos duros, 2026-10-04)

| Agente | hostalterraza | exploraco |
|---|---|---|
| free-plan / free-build | `opencode/big-pickle` | `opencode/space-bunny-free` |
| plan / build | `opencode-go/deepseek-v4.1-flash` | `opencode/space-bunny-free` |
| 16 subagentes | SIN `model:` (heredan) | `opencode/space-bunny-free` (fijos) |

- Exploraco: 20/20 con `model:` explicito. `verificar-capa-gratis.js` reporta
  `20 | gratis: 20 | de pago: 0`.
- `permission.task` de los 4 primarios en exploraco: `task: allow` plano (sin bloque).

## Bloqueos conocidos

1. `scripts/ejecucion/verificar-capa-gratis.js:40-50` lista `opencode/big-pickle` en
   `ROTOS`: "el proveedor los rechaza como subagente con 'OpenCode's free tier can only
   be used from within OpenCode'". Header `:6-10` cita BUG-092. ES EL MODELO que usa
   `@free-plan`/`@free-build` en hostalterraza. NO copiar sin sondar.
2. `verificar-capa-gratis.js:143-147` EXIGE `model:` explicito en todo especialista
   ("hacer la capa auditable"). Esta regla BLOQUEA ACTIVAMENTE la herencia.
3. Hoy el guard solo mira pines explicitos: con cascada, un primario de pago propaga
   costo a 16 subagentes sin que nada lo detecte.

## NO COPIAR de hostalterraza

- `opencode/big-pickle` -> esta en ROTOS para exploraco.
- `subagent_depth: 1` -> exploraco usa 2; no es parte del sistema dual.
- `tool_output.max_lines: 400` / `max_bytes: 16384` -> truncaria `admin.html` (340 KB)
  y `api/interacciones.js` (560 KB).

## Orden de ejecucion (secuencial por dependencia real)

| # | Tarea | Agente | Territorio | Dep |
|---|---|---|---|---|
| 1 | Sondas reales: que modelos funcionan como SUBAGENTE y a que costo. Sin esto no se escribe ningun `model:` | `@qa-auditor` | `scripts/ejecucion/sondas/` nuevo | - |
| 2 | Redactar ADR que reemplaza ADR-074: ExploraCO adopta ruta PAGO por herencia de modelo (ADR-069) | `@architect` + `@architect-review` | `DECISIONS.md` + `decisiones/ADR-0XX` | 1 |
| 3 | Reescribir el guard: validar cascada en vez de prohibirla | `@js-silo-dev` | `scripts/ejecucion/verificar-capa-gratis.js` | 1 |
| 4 | Quitar `model:` de los 16 subagentes (herencia) y pinear los 4 primarios segun sondas | `@js-silo-dev` | `.opencode/agent/*.md` (20) | 1, 3 |
| 5 | Portar `permission.task` en bloque a los 4 primarios (`"*": deny` primero) | `@js-silo-dev` | `free-plan/free-build/plan/build.md` | 4 |
| 6 | Crear skill `cascada-tier` adaptada a los 9 dominios de riesgo de exploraco | `@docs-keeper` | `.opencode/skills/cascada-tier/SKILL.md` | 4 |
| 7 | Actualizar `AGENTS.md` §0/§1/§2 + corregir premisa falsa `:37` y el duplicado plan/free-plan | `@docs-keeper` | `AGENTS.md`, `plan.md`, `free-plan.md` | 5, 6 |
| 8 | Purgar docs obsoletas (roster de 40 agentes, `hybrid-*`, skills despublicadas) | `@docs-keeper` | `exploraco desarrollo/ampliacion desarrollo/` | 7 |
| 9 | Verificacion del sistema completo | `@qa-auditor` | `node scripts/ejecucion/verificar-capa-gratis.js` + sonda | 3-8 |

## Dominios de riesgo (ADR-069 adaptado a exploraco)

Sin gate: `@docs-keeper` `@explore` `@js-silo-dev` `@frontend-tpl` `@media-reader` `@qa-auditor`

Con gate: `@sql-security` `@data-migration` `@backend-dev` `@renderer-dev` `@admin-dev`
`@architect` `@architect-review` `@seo-dev` `@research-agent` `@content-loader`

Diferencia con hostalterraza: exploraco suma `@content-loader` como riesgo (toca seeds).
Hostalterraza no lo tiene en su lista de 9.

## Gastes de esta sesion (R4)

| input | output | reasoning | cache_read | total | costo USD |
|---:|---:|---:|---:|---:|---:|
| 49,175 | 10,271 | 0 | 423,424 | 482,870 | $0.0000 |

Global 2 sesiones: 749,478 tokens, $0.0000. Capa gratuita intacta (R5).
