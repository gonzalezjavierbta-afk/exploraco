---
name: eficiencia-recursos
description: "Reglas de eficiencia: costo = turnos x contexto, grep, diagnóstico CSS inline, cierre medido y tareas pesadas. Cárgala en sesión larga."
---

# Eficiencia de Recursos (v129)

Operativiza los Mandatos 17, 18, 19 y 20 de `exploraco desarrollo/🛡️ Reglas de Oro ExploraCO — v5.md` (v5). La unidad de costo real es `turnos × contexto acumulado`, no el output: en la sesión de banners del silo `f9b` el `cache_read` fue 29.5M de 32.2M tokens (91.7%), con input fresco 2.16M (6.7%), output 0.28M (0.9%) y razonamiento 0.22M (0.7%); `AGENTS.md` (8.123 tokens) se releyó en cada turno de cada agente (~6.5M tokens, ~20% del total). Métrica de control: `cache_read / turnos` (50.000 a 76.000 tokens por turno en esa sesión).

## Reglas de sesión

1. **Consolidación de agentes:** una sesión de implementación usa MAXIMO 1 agente de exploración + 1 de implementación por dominio + 1 de verificación. Todo lo demás se resuelve con script.
2. **Regla anti-colgado:** si un subagente devuelve vacío o excede el tiempo límite, NO se re-despacha el mismo perfil; se cambia de estrategia y se registra el incidente. (El `qa-auditor` devolvió vacío tras 2.9 h y 3.31M tokens; repetir la verificación costó +2.17M, ~17% de la sesión.)
3. **Un archivo, un lector:** prohibido que varios agentes de una misma sesión relean el mismo archivo grande cuando un brief dirigido (ruta + rango de líneas + bloque `old`/`new`) basta. Prohibido leer archivos completos de más de 150 KB (`api/interacciones.js` ~560 KB, `admin.html` ~340 KB, `DECISIONS.md` ~400 KB): usar rangos.
4. **Verificación mecánica = script, no agente:** `scripts/express_check.js` y los `scripts/smoke_*.js` cuestan 0 tokens de agente.
5. **Mutation testing acotado:** 5-8 mutaciones representativas, no decenas.
6. **Cierre medido:** toda sesión de implementación cierra midiendo con `node scripts/usage_report.js`. Presupuesto placeholder de un solo feature: no superar ~15M tokens ni ~3 h de reloj sin justificación escrita. Es un PLACEHOLDER hasta tener N >= 5 sesiones medidas (se recalibrará a ~1.5-2x la mediana); la métrica de control líder sigue siendo `cache_read / turnos`.
7. **Estimación previa y confirmación (Mandato 19):** antes de ejecutar, entrega estimación de tokens y tiempo (desglose por agente); al cerrar, concilia estimado vs. real y registra la desviación (> +50%) en `exploraco desarrollo/NEXT.md`.
8. **Umbral de tarea pesada (Mandato 20):** si la tarea supera ~1.5M tokens / ~30 min o implica imágenes/video, research masivo o seeds volumétricos, avisa el costo antes de gastar, recomienda una IA externa (Gemini/ChatGPT/Claude), define el insumo que debe volver (ficha/JSON) y sugiere un prompt listo.

## Contrato de retorno de subagentes

Todo `task` que despacha el orquestador exige un retorno COMPACTO (máximo ~600 tokens) con este schema fijo:

*   **STATUS:** `ok` | `partial` | `blocked`.
*   **ARCHIVOS:** `ruta:rango` de líneas, uno por línea (no el contenido).
*   **VERIFICACION:** comando exacto ejecutado + resultado `pass`/`fail` con conteo N/N.
*   **BLOQUEADORES:** nada, o la causa concreta.
*   **SIGUIENTE:** la acción recomendada.

Prohibido volcar archivos completos, diffs extensos o narrar lo leído. El orquestador NO pide "muéstrame el archivo": si necesita un dato, lo pide dentro del mismo brief de la tarea.

## Presupuesto de sesión y fragmentación por fase

El costo de una sesión crece de forma aproximadamente cuadrática con sus turnos: cada turno relee el contexto acumulado completo (`cache_read`). Por eso el presupuesto operativo del orquestador es de **25-30 turnos por sesión** y una sesión = una fase.

*   Al agotar el presupuesto: emitir un resumen de estado y abrir una sesión nueva (no estirar la misma).
*   Fragmentar reduce el gasto: un feature largo de 67 turnos partido en 3 sesiones de ~22 turnos baja el gasto **50-60%**.

## Anti-absorción dura

*   El orquestador que supere **20-25 llamadas directas** (`read`/`grep`/`glob`) se DETIENE y delega a `@explore`.
*   El reconocimiento masivo siempre va a `@explore`, con brief de salida acotado (que devuelva `archivo:línea`, no el contenido).

## Free-only (todo el roster es FREE, ADR-074)

*   Todo el roster de 20 agentes es FREE (`opencode/space-bunny-free`, `$0`): no existe ruta PAGO ni subagente de pago (ADR-074). Un `task` nunca cuesta dinero.
*   Si un subagente falla, devuelve `partial`/`blocked` o no pasa la verificación, NO se re-despacha el mismo perfil: se cambia de estrategia (otro agente del dominio, un script o un brief mínimo) y se registra el incidente.
*   Los dominios con gate de riesgo (`sql-security`, `data-migration`, `renderer-dev`, `architect`, `architect-review`) exigen confirmación explícita del usuario ANTES de ejecutarse.
*   Nunca desdoblar dos agentes sobre el mismo archivo en paralelo (sesiones vacías = reloj puro).

## Watchdog de subagentes

Un subagente que supere **25 turnos** o **50.000 tokens por turno** se aborta y se re-planifica. Nunca se re-despacha el mismo perfil que falló (refuerza la regla anti-colgado): se cambia de estrategia (otro dominio, un script o un brief mínimo).

## Línea base medida (2026-10-01) y objetivo de control

Datos reales del feature Guest List, medidos con `scripts/usage_report.js` (prevalece el archivo, no el historial de chat):

| Medida | Valor |
|---|---|
| Feature Guest List (total) | 6.656.144 tokens / 133 turnos |
| Orquestador `build` | 5.196.654 tokens / 67 turnos = 77.562 tokens/turno (78,1% del feature) |
| Subagentes | 15.000-29.000 tokens/turno |
| `cache_read` global | 89-90% |
| `AGENTS.md` | ~8.1k tokens releídos cada turno |

Objetivo de control: bajar el `cache_read/turno` del orquestador por debajo de **~50.000**.

## `scripts/usage_report.js` — contrato CONGELADO

Reporte de uso de tokens y costo de la DB local de OpenCode. Interfaz congelada (no re-diseñar sin ADR):

* **Modos (MUTUAMENTE EXCLUYENTES):** `--summary` (default), `--sessions`, `--tree`, `--json`, `--csv`. Se pasa uno solo por invocación (combinarlos es error). Se aceptan los nombres de modo sin guiones (`summary`, `sessions`, `tree`, `json`, `csv`).
* **Filtros:** `--since`, `--until`, `--project`, `--agent`, `--root <sessionId>`, `--db`.
* **Detalle:** `--detail`, `--with-content`, `--max-chars N`. `--with-content` IMPLICA `--detail`.
* **Salida:** `--out <ruta>`, `--top N`, `-h` / `--help`. `--top N` limita la salida CSV SOLO si se pasa explícitamente.
* **Alcance por defecto:** sin `--since`, el script mide el **DIA LOCAL ACTUAL** (`00:00` -> ahora), NO "la sesión actual"; `--since 0` recorre **todo el histórico** de la DB.
* **Seguridad:** abre la DB en **readOnly** y NUNCA lee `account`, `control_account` ni `credential` (contienen tokens); `--with-content` redacta secretos.

Ejemplos reales:

```
node scripts/usage_report.js --summary                          # medir el día local actual (default)
node scripts/usage_report.js --summary --since 0                # todo el histórico de la DB
node scripts/usage_report.js --tree --root <sessionId>          # listar subagentes de una raíz
node scripts/usage_report.js --sessions --json --out uso.json   # exportar JSON para otra IA
```

## Informe de cierre de sesión (OBLIGATORIO)

Toda sesión de implementación cierra SIEMPRE con un informe de gasto y aprendizaje; no se difiere. Se levanta sin agente con:

    node scripts/usage_report.js --summary          # dia local (default)
    node scripts/usage_report.js --tree --root <id> # desglose por subagente
    node scripts/session_close.js                   # wrapper de cierre (nuevo; total + turnos + cache_read/turno + segundos + --tree)

El informe debe incluir, como mínimo:

| Campo | De donde sale |
|---|---|
| total_tokens | `totals.total` del reporte |
| turnos | suma de `turns` |
| cache_read / turnos | metrica de control (mide el contexto por turno) |
| segundos | suma de `seg` (reloj) |
| desglose por agente | `--tree` (quien gasto que) |
| estimado vs. real | análisis previo (Mandato 19) contrastado con el total medido |
| 1-3 aprendizajes | accionables: que se releo de mas, que agente fallo, que brief falto |
| consejos de mejora | acciones concretas para la próxima sesión |

Regla: si la sesión superó el presupuesto (Mandato 18), el informe debe explicar por qué. Se apoya en `scripts/usage_report.js` y en el nuevo `scripts/session_close.js` (wrapper de cierre).

## Disciplina de reconocimiento (grep y lectura)

La exploración del orquestador es el rubro más caro de una sesión: se midió un caso real donde 3 greps amplios costaron ~1.5M tokens frente a ~500K de un subagente de exploración enfocado.

1. `grep` SIEMPRE con la ruta del archivo concreto, nunca la raíz del repo.
2. Patrones ESPECÍFICOS. Prohibido alternar 5 términos en un solo patrón (devuelve 100 coincidencias truncadas y quema contexto).
3. Si no se conoce el archivo, la primera llamada es `glob`, no `grep`.
4. Reconocimiento amplio = subagente de exploración (modelo económico), no el orquestador.
5. Antes de abrir un archivo grande, un `grep` que devuelva la línea exacta.

## Diagnóstico: "mi CSS no se aplica" (orden obligatorio)

Ante un cambio de CSS que no surte efecto, NO se audita primero la cascada. El kernel de render (`api/pagina-destino.js`) y `admin.html` emiten nodos con `style="..."` INLINE, y un inline SIN `!important` pierde contra una hoja CON `!important` pero GANA contra una hoja SIN el.

Orden obligatorio:

1. `grep -n 'id="<nodo>"' api/pagina-destino.js` para ver el `style=` inline.
2. Declarar en el silo con `!important` toda propiedad que el kernel fije inline.
3. Solo después, auditar cascada y orden de bloques.
