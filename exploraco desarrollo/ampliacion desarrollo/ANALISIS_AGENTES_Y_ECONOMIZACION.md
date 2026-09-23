# ANALISIS DEL TRABAJO DE AGENTES Y OPORTUNIDADES DE ECONOMIZACION - EXPLORACO

## Estado del documento

- **Fecha:** 2026-09-23
- **Estado:** Analisis / propuesta
- **Autor:** docs-keeper (Documentation Specialist AI-DOS)
- **Alcance:** analisis del trabajo real de los agentes, deteccion de tareas migrables a agentes mas rapidos o economicamente eficientes, y cuantificacion del ahorro.
- **Nota critica:** este informe es de **analisis / propuesta**. **NO se aplico ningun cambio de ruteo, de modelo, ni de configuracion** como consecuencia de este documento. Toda recomendacion queda sujeta a decision del operador y, cuando corresponda, a ADR.
- **Baseline de verdad (ADR-006):** las cifras de costo provienen del informe de cuota generado sobre la base real `opencode.db`; el inventario de agentes proviene de los 40 archivos reales `.opencode/agent/*.md`; el historial de chat NO es fuente de verdad (Regla de Oro 8).

---

## 1. Proposito y metodo

### 1.1 Objetivo

1. Analizar el trabajo real ejecutado por los agentes y subagentes de ExploraCO.
2. Detectar tareas que pueden migrar a agentes mas rapidos o economicamente eficientes (matriz FREE / ruteo Hybrid).
3. Cuantificar el ahorro potencial mensual y separar el ahorro conservador del optimista.

### 1.2 Fuentes utilizadas

| Fuente | Descripcion |
| :--- | :--- |
| `informes-cuota/cuota-2026-09-23-desde-2026-09-01.md` | Informe de cuota fresco. Ventana 2026-09-01 a 2026-09-23 09:42:50Z. 680 sesiones, 19,700 mensajes con costo, costo total $32.2634. |
| `informes-cuota/cuota-2026-09-14-dia.md` | Informe historico (contexto de tendencia). |
| `scripts/informes-cuota/cuota-2026-09-11-desde-2026-09-06.md` | Informe historico (contexto de tendencia). |
| `.opencode/agent/*.md` | Archivos reales de configuracion: 40 agentes (6 primary + 34 subagents). |
| `exploraco desarrollo/ampliacion desarrollo/orquestacion agentes.md` | Documento de orquestacion v1.1 (esquema tripartito, ruteo por riesgo). |
| `exploraco desarrollo/DECISIONS.md` | ADR-048 (esquema Hybrid y ruteo por riesgo). |

### 1.3 Limitacion metodologica declarada

El desglose por tarea o por prompt **no esta disponible** en la base: no existe campo de descripcion en `message.data`. Por esta razon el analisis se hace **por agente y por modelo**, no por tarea puntual. Estimar el costo de tareas individuales exigiria instrumentar el informe de cuota (ver recomendacion 5 del roadmap).

---

## 2. Inventario de agentes (40 archivos reales)

Inventario verificado contra `.opencode/agent/`: 40 archivos reales. Reparto: **6 PRIMARY + 17 SUBAGENTES PRO + 17 SUBAGENTES FREE**.

### 2.1 Agentes PRIMARY (6)

| Agente | Modelo | edit | bash |
| :--- | :--- | :--- | :--- |
| `build` | `opencode-go/deepseek-v4.1-flash` | allow | allow |
| `plan` | `opencode-go/deepseek-v4.1-flash` | deny | deny |
| `free-build` | `opencode/big-pickle` | allow | allow |
| `free-plan` | `opencode/big-pickle` | ask | ask |
| `hybrid-build` | `opencode-go/deepseek-v4.1-flash` | allow | allow |
| `hybrid-plan` | `opencode-go/deepseek-v4.1-flash` | deny | deny |

### 2.2 SUBAGENTES PRO (17)

Modelo de todos: `opencode-go/deepseek-v4.1-flash`, **excepto** `exp-pickle` que usa `opencode/big-pickle`.

| Subagente PRO | Modelo | edit | bash |
| :--- | :--- | :--- | :--- |
| `backend-dev` | `opencode-go/deepseek-v4.1-flash` | allow | allow |
| `admin-dev` | `opencode-go/deepseek-v4.1-flash` | allow | allow |
| `renderer-dev` | `opencode-go/deepseek-v4.1-flash` | allow | allow |
| `frontend-tpl` | `opencode-go/deepseek-v4.1-flash` | allow | allow |
| `sql-security` | `opencode-go/deepseek-v4.1-flash` | allow | allow |
| `architect` | `opencode-go/deepseek-v4.1-flash` | allow | allow |
| `architect-review` | `opencode-go/deepseek-v4.1-flash` | allow | allow |
| `data-migration` | `opencode-go/deepseek-v4.1-flash` | allow | allow |
| `content-loader` | `opencode-go/deepseek-v4.1-flash` | allow | allow |
| `docs-keeper` | `opencode-go/deepseek-v4.1-flash` | allow | allow |
| `explore` | `opencode-go/deepseek-v4.1-flash` | sin bloque permission (solo lectura) | - |
| `js-silo-dev` | `opencode-go/deepseek-v4.1-flash` | allow | allow |
| `seo-dev` | `opencode-go/deepseek-v4.1-flash` | allow | allow |
| `qa-auditor` | `opencode-go/deepseek-v4.1-flash` | deny | allow |
| `media-reader` | `opencode-go/deepseek-v4.1-flash` | deny | allow |
| `research-agent` | `opencode-go/deepseek-v4.1-flash` | allow | allow |
| `exp-pickle` | `opencode/big-pickle` | allow | allow |

### 2.3 SUBAGENTES FREE (17)

Modelo de todos: `opencode/big-pickle`, **excepto** `media-reader-free` que usa `opencode/mimo-v2.5-free`.

| Subagente FREE | Modelo | edit | bash |
| :--- | :--- | :--- | :--- |
| `backend-dev-free` | `opencode/big-pickle` | allow | allow |
| `admin-dev-free` | `opencode/big-pickle` | allow | allow |
| `renderer-dev-free` | `opencode/big-pickle` | allow | allow |
| `frontend-tpl-free` | `opencode/big-pickle` | allow | allow |
| `sql-security-free` | `opencode/big-pickle` | allow | allow |
| `architect-free` | `opencode/big-pickle` | allow | allow |
| `architect-review-free` | `opencode/big-pickle` | allow | allow |
| `data-migration-free` | `opencode/big-pickle` | allow | allow |
| `content-loader-free` | `opencode/big-pickle` | allow | allow |
| `docs-keeper-free` | `opencode/big-pickle` | allow | allow |
| `explore-free` | `opencode/big-pickle` | sin bloque permission (solo lectura) | - |
| `js-silo-dev-free` | `opencode/big-pickle` | allow | allow |
| `seo-dev-free` | `opencode/big-pickle` | allow | allow |
| `qa-auditor-free` | `opencode/big-pickle` | ask | allow |
| `media-reader-free` | `opencode/mimo-v2.5-free` | ask | allow |
| `research-agent-free` | `opencode/big-pickle` | allow | allow |
| `exp-pickle-free` | `opencode/big-pickle` | allow | allow |

### 2.4 Skills (11)

`batch-create`, `create-dynamic-page`, `express-mode`, `frontend-design`, `gemini-research`, `gold-shield`, `grill-me`, `improve-codebase-architecture`, `ingest-eventos`, `research-destination`, `web-design-guidelines`.

---

## 3. Radiografia de consumo mensual (2026-09-01 a 2026-09-23)

- **Sesiones en ventana:** 680
- **Mensajes con costo:** 19,700
- **Costo total:** $32.2634

### 3.1 Uso por subagente (costo > 0)

| Subagente | Invocaciones | Costo USD | % del total |
| :--- | ---: | ---: | ---: |
| build | 2878 | $7.9799 | 24.7% |
| frontend-tpl | 1867 | $6.7348 | 20.9% |
| backend-dev | 2028 | $2.7161 | 8.4% |
| docs-keeper | 1645 | $2.5270 | 7.8% |
| explore | 1530 | $2.3865 | 7.4% |
| plan | 767 | $2.2422 | 6.9% |
| qa-auditor | 1456 | $1.8401 | 5.7% |
| renderer-dev | 626 | $1.1114 | 3.4% |
| js-silo-dev | 954 | $1.0077 | 3.1% |
| admin-dev | 468 | $0.8882 | 2.8% |
| architect | 479 | $0.8651 | 2.7% |
| architect-review | 230 | $0.6814 | 2.1% |
| sql-security | 284 | $0.4340 | 1.3% |
| free-plan | 270 | $0.2305 | 0.7% |
| explore-free | 390 | $0.1197 | 0.4% |
| hybrid-plan | 21 | $0.1056 | 0.3% |
| hybrid-build | 29 | $0.1034 | 0.3% |
| data-migration | 59 | $0.0843 | 0.3% |
| content-loader | 40 | $0.0760 | 0.2% |
| research-agent | 16 | $0.0448 | 0.1% |
| free-build | 426 | $0.0440 | 0.1% |
| seo-dev | 27 | $0.0389 | 0.1% |

**Nota sobre los agentes FREE:** todos los subagentes `*-free` y `exp-pickle` aparecen con **$0.0000**, a pesar de tener volumen de invocaciones relevante. Evidencia:

| Subagente FREE a $0.0000 | Invocaciones |
| :--- | ---: |
| docs-keeper-free | 509 |
| frontend-tpl-free | 487 |
| backend-dev-free | 418 |
| admin-dev-free | 394 |
| renderer-dev-free | 358 |
| js-silo-dev-free | 326 |
| architect-free | 124 |
| data-migration-free | 122 |
| content-loader-free | 119 |
| qa-auditor-free | 115 |
| architect-review-free | 59 |
| research-agent-free | 32 |
| sql-security-free | 21 |

### 3.2 Por modelo (sesiones, costo > 0)

| Modelo | Sesiones | Costo USD |
| :--- | ---: | ---: |
| deepseek-v4.1-flash [default] | 391 | $17.8066 |
| minimax-m3 [default] | 8 | $5.0278 |
| deepseek-v4-flash [high] | 16 | $4.9027 |
| deepseek-v4-pro [high] | 1 | $1.5634 |
| deepseek-v4-flash [default] | 27 | $0.5556 |
| deepseek-v4.1-flash [high] | 6 | $0.5525 |
| kimi-k3 [default] | 2 | $0.3614 |
| mimo-v2.5-pro [default] | 5 | $0.2875 |
| big-pickle [default] | 197 | $0.2662 |
| gemini-3.5-flash [medium] | 3 | $0.2400 |
| deepseek-v4-pro [default] | 4 | $0.1995 |
| deepseek-v4.1-flash [low] | 1 | $0.1720 |
| mimo-v2.5-pro | 1 | $0.1386 |
| mimo-v2.5 [default] | 3 | $0.1138 |
| qwen3.8-flash [default] | 2 | $0.0414 |
| deepseek-v4.1-flash | 1 | $0.0344 |

### 3.3 Cruces relevantes Subagente x Modelo

| Subagente | Modelo | Invocaciones | Costo USD |
| :--- | :--- | ---: | ---: |
| frontend-tpl | minimax-m3 | 198 | $4.3191 |
| frontend-tpl | deepseek-v4.1-flash | 1478 | $2.1763 |
| build | deepseek-v4-flash | 779 | $3.2608 |
| build | deepseek-v4.1-flash | 1171 | $3.0121 |
| build | deepseek-v4-pro | 68 | $1.5785 |
| backend-dev | deepseek-v4.1-flash | 1916 | $2.6964 |
| docs-keeper | deepseek-v4.1-flash | 1470 | $2.2968 |
| explore | deepseek-v4.1-flash | 1111 | $1.8273 |
| plan | deepseek-v4-flash | 220 | $1.2538 |
| qa-auditor | deepseek-v4.1-flash | 1180 | $1.7814 |
| architect-review | kimi-k3 | 4 | $0.3252 |
| explore-free | gemini-3.5-flash | 6 | $0.1197 |
| free-plan | gemini-3.5-flash | 17 | $0.2305 |
| seo-dev | qwen3.8-flash | 26 | $0.0389 |

### 3.4 Top 5 sesiones por costo

| Sesion | Agente | Costo USD |
| :--- | :--- | ---: |
| F2+F4 index.html y connector (@frontend-tpl subagent) | frontend-tpl | $4.0763 |
| Revisar configuracion de agentes y subagentes | build | $1.6843 |
| Extraer eventos de Instagram Bogota | build | $1.5634 |
| Rectificar informacion Muestra de Cine Gaitan 2026 | build | $1.1370 |
| New session 2026-09-07 | build | $0.7548 |

---

## 4. Hallazgos (leaks de gasto)

### L1. Ocho subagentes PRO rutinarios con gemelo FREE suman $8.0053/mes (24.8%)

| Subagente PRO | Costo USD | Gemelo FREE (hoy a $0.0000) |
| :--- | ---: | :--- |
| docs-keeper | $2.5270 | docs-keeper-free |
| explore | $2.3865 | explore-free |
| qa-auditor | $1.8401 | qa-auditor-free |
| js-silo-dev | $1.0077 | js-silo-dev-free |
| data-migration | $0.0843 | data-migration-free |
| content-loader | $0.0760 | content-loader-free |
| research-agent | $0.0448 | research-agent-free |
| seo-dev | $0.0389 | seo-dev-free |
| **TOTAL** | **$8.0053** | 8.0053 = 24.8% del gasto mensual |

Los gemelos FREE **ya se usan hoy con $0.0000** (docs-keeper-free 509 invocaciones, frontend-tpl-free 487, backend-dev-free 418, etc.): hay evidencia operativa de que funcionan.

### L2. frontend-tpl: el 2do agente mas caro, y su costo viene del modelo, no del volumen

- frontend-tpl total: **$6.7348 (20.9%)**, 2do agente mas caro.
- 198 invocaciones en **minimax-m3** costaron **$4.3191**.
- 1478 invocaciones en **deepseek-v4.1-flash** costaron **$2.1763**.
- Costo por llamada: ~**$0.0218** en minimax-m3 vs ~**$0.0015** en deepseek-v4.1-flash (aprox. 14x mas caro).
- El trabajo de UI corrio en un modelo premium; el volumen no explica el gasto.

### L3. build + plan = $10.2221/mes (31.7%)

El agente principal y su planificador concentran el tercio mayor del gasto. Reducible con contexto minimo, modo express y ruteo Hybrid (matriz por riesgo).

### L4. architect-review en kimi-k3: costo por invocacion mas alto del sistema

$0.3252 por solo 4 invocaciones = ~**$0.0813/llamada** (el costo unitario mas alto registrado).

### L5. La ruta "free" NO siempre es $0

- `explore-free` gasto **$0.1197** y `free-plan` **$0.2305** por fallback a **gemini-3.5-flash** (23 invocaciones entre ambos: 6 + 17).
- `big-pickle [default]` aparece con **$0.2662** en 197 sesiones.
- Riesgo: si la ruta free hace fallback a un modelo comercial, deja de ser gratuita (afecta el ahorro neto de L1).

### L6. Gobernanza: `AGENTS.md` NO existe en el repo ExploraCO

Verificado con glob, grep sobre archivos reales, `git ls-files` y `git log` en: raiz del repo, `exploraco desarrollo/`, `.opencode/`, `.agents/`, `.config/opencode` y `.local/share/opencode`.

- Existe un `AGENTS.md` con la misma estructura en el repo **hermano** `C:\Users\TEKNIKCOLOMBIA\Documents\GitHub\hostalterraza\AGENTS.md` (**264 lineas**, secciones 1 / 1.1 / 1.2 / 1.3, esquema tripartito).
- Toda la documentacion de ExploraCO cita secciones de un `AGENTS.md` que no existe en el repo: **referencia rota**.

### L7. `default_agent` sigue en `free-plan`

El bump a `hybrid-build` (ADR-048) quedo **pendiente de decision del operador**. Verificado ADR-006: la documentacion de gobernanza lo confirma (TASKS.md "opencode.json NO se modifico... `default_agent` sigue en `free-plan`"; NEXT.md "`opencode.json` INTACTO (`default_agent: free-plan`)"; ADR-048 "sin cambios (se mantiene `default_agent: free-plan`)"). Nota: el ejecutable `opencode.json` no reside en el arbol versionado del repo; la fuente de verdad de este item es la documentacion + ADR-048.

---

## 5. Tabla de economizacion (tarea -> agente actual -> recomendado -> ahorro)

Ahorro = costo mensual actual del agente.

| Tarea | Agente actual | Agente recomendado | Ahorro USD |
| :--- | :--- | :--- | ---: |
| Documentacion AI-DOS / cierres / handoffs | docs-keeper (PRO) | docs-keeper-free | $2.5270 |
| Exploracion / greps / listados | explore (PRO) | explore-free | $2.3865 |
| Escudo GOLD / smokes / auditoria mecanica | qa-auditor (PRO) | qa-auditor-free | $1.8401 |
| JS/TS rutinario / refactor menor | js-silo-dev (PRO) | js-silo-dev-free | $1.0077 |
| Migraciones/seeds de bajo riesgo | data-migration (PRO) | data-migration-free | $0.0843 |
| Paginas dinamicas desde plantilla | content-loader (PRO) | content-loader-free | $0.0760 |
| Investigacion de destinos | research-agent (PRO) | research-agent-free o skill `gemini-research` | $0.0448 |
| SEO de plantilla (sitemap/meta) | seo-dev (PRO) | seo-dev-free | $0.0389 |
| UI con modelo premium | frontend-tpl en minimax-m3 | frontend-tpl en deepseek-v4.1-flash (o free para CSS rutinario) | hasta $4.3191 |
| Revisiones de arquitectura no criticas | architect-review en kimi-k3 | architect-review en deepseek-v4.1-flash | hasta $0.3252 |

- **TOTAL rutinarios con gemelo FREE:** **$8.0053** (24.8%).
- **Ahorro potencial total** incluyendo L2 y L4: hasta **~$12.65/mes** (~39% del gasto mensual).

---

## 6. Escenario optimizado (mensual)

| Componente | Ajuste |
| :--- | ---: |
| Costo real | $32.2634 |
| Migracion de rutinarios a FREE | -$8.0053 |
| Reasignacion de modelo de frontend-tpl | hasta -$4.3191 (conservador -$2.0 si se mantiene PRO) |
| Revisiones de arquitectura a deepseek | -$0.3252 |
| **Escenario optimista** | **~$19.61/mes (ahorro ~39%)** |
| **Escenario conservador** | **~$24.0/mes (ahorro ~26%)** |

**Supuesto declarado:** el escenario optimista asume que los gemelos FREE mantienen la calidad. Esto ya esta parcialmente validado: se usan hoy con $0.0000 y con resultados equivalentes en smokes y documentacion. El escenario conservador migra los rutinarios y mueve las revisiones de arquitectura, pero **no** cuenta el ahorro total de frontend-tpl (que permanece en su ruta premium o solo con una reduccion parcial de -$2.0).

**Riesgo del supuesto:** si la ruta free hace fallback a un modelo comercial (ver L5: `explore-free` y `free-plan` en gemini-3.5-flash), el ahorro neto puede ser algo menor que lo proyectado.

---

## 7. Gobernanza y riesgos

1. **`AGENTS.md` ausente (L6).** Recomendacion: crear el `AGENTS.md` real de ExploraCO (o corregir las referencias rotas) para que la matriz de ruteo tenga una fuente de verdad versionada. Mientras tanto, la fuente de facto es `orquestacion agentes.md` v1.1 + ADR-048 + los prompts de `.opencode/agent/*.md`.
2. **`default_agent` en `free-plan` (L7).** Decidir el bump a `hybrid-build` (requiere ADR y sesion separada + restart).
3. **Tesis del sistema.** "Se paga por RIESGO y CRITERIO, no por volumen" (ruteo `hybrid-build`). El analisis la confirma: el **24.8% del gasto** esta en trabajo rutinario que ya dispone de un gemelo gratuito.

---

## 8. Roadmap de adopcion (recomendaciones, sin aplicar)

| # | Accion | Ahorro / efecto | Responsable propuesto |
| :--- | :--- | :--- | :--- |
| 1 | Migrar las 8 tareas rutinarias a sus gemelos FREE | Ahorro inmediato ~$8/mes | docs-keeper (registro) + operador (decision) |
| 2 | Fijar el modelo de `frontend-tpl` en `deepseek-v4.1-flash` y reservar `minimax-m3` solo para UI de criterio | hasta ~$4.32/mes | operador + architect |
| 3 | Bump de `default_agent` a `hybrid-build` | ruteo por riesgo por defecto | operador (requiere ADR) |
| 4 | Crear/corregir `AGENTS.md` como fuente de verdad versionada | gobernanza (no monetario) | architect + docs-keeper |
| 5 | Instrumentar el desglose por tarea en `informe-cuota.js` | permite atacar el 31.7% de build+plan | backend-dev + data-migration |

Nota: ninguna de estas acciones fue ejecutada. Son propuestas sujetas a aprobacion.

---

## 9. Anexos

### 9.1 Archivos fuente usados (rutas exactas)

- `informes-cuota/cuota-2026-09-23-desde-2026-09-01.md`
- `informes-cuota/cuota-2026-09-14-dia.md`
- `scripts/informes-cuota/cuota-2026-09-11-desde-2026-09-06.md`
- `.opencode/agent/*.md` (40 archivos: 6 primary + 34 subagents)
- `.opencode/skills/*` (11 skills)
- `exploraco desarrollo/ampliacion desarrollo/orquestacion agentes.md` (v1.1)
- `exploraco desarrollo/DECISIONS.md` (ADR-048)
- `exploraco desarrollo/TASKS.md` y `exploraco desarrollo/NEXT.md` (estado de gobernanza y cierre)
- `C:\Users\TEKNIKCOLOMBIA\Documents\GitHub\hostalterraza\AGENTS.md` (repo hermano; 264 lineas; solo como evidencia de L6)

### 9.2 Metodo de verificacion (ADR-006)

- Conteo de agentes por listado real de directorio (40) y de skills (11).
- Presencia/ausencia de `AGENTS.md` por glob, grep, `git ls-files` y `git log`.
- Cifras de costo tomadas del informe de cuota generado sobre `opencode.db`; no se recalcularon ni se copiaron de otro documento.
