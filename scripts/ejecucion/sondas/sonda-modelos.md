# T1 - Sondas reales de modelos como SUBAGENTE (2026-10-04)

Tarea 1 de `.opencode/plans/adaptacion-cascada-tier-ADR-069.md`. Objetivo: determinar
EMPIRICAMENTE que modelos funcionan como subagente invocado via `task`, y a que costo medido.

Todos los veredictos de esta tabla provienen de una ejecucion real. Ninguna cifra es estimada.

## Resultado de las 5 sondas

| model | veredicto | mensaje de error literal | tokens medidos (subagente) | costo medido | nota |
|---|---|---|---|---|---|
| `opencode/space-bunny-free` | OK | (ninguno) | 6,108 | $0.000000 | Control: pin actual del roster. 2 turnos, 0 tools. |
| `opencode-go/deepseek-v4.1-flash` | OK | (ninguno) | 6,344 | $0.000966 | Baseline de pago de hostalterraza. 2 turnos, 0 tools. |
| `opencode/big-pickle` | **FALLA** | `Subagent failed (task_id: ses_...): Error from provider (Console): OpenCode's free tier can only be used from within OpenCode` | 0 | $0.000000 | Falla antes de consumir un solo token. ROTOS CONFIRMADO. |
| `opencode-go/glm-5.3-flash` | OK | (ninguno) | 6,117 | $0.000950 | Pago barato. 2 turnos, 0 tools. |
| `opencode-go/qwen3.8-max` | OK | (ninguno) | 6,349 | $0.016108 | Pago fuerte. ~17x el costo de glm/dflash. |

## Atribucion de costo (medida, no estimada)

Global: `$0.000000` -> `$0.018024`. La totalidad del costo del sistema es atribuible a las
3 sondas de pago. Las 5 sesiones conductoras (modelo `opencode/space-bunny-free`) y esta
sesion de auditoria quedaron en `$0.000000`.

Ratio medido por turno de sonda: `qwen3.8-max` $0.016108 | `deepseek-v4.1-flash` $0.000966 |
`glm-5.3-flash` $0.000950 | `space-bunny-free` $0.000000 | `big-pickle` $0 (fallo).

Caveat honesto: cada sonda es 1 turno y no hace trabajo real. El costo por turno medido
es el piso, no el costo de una tarea real de 15 turnos ni de una sesion de 27 turnos.

## Hallazgo de metodologia (bloqueante para repetir esta tarea)

1. **El registro de subagentes NO hace hot-reload.** Escribir `.opencode/agent/sonda-*.md`
   durante la sesion y luego invocar `task` falla con, literalmente, en los 5 casos:
   `Unknown agent type: sonda-free is not a valid agent type`.
   Solo un PROCESO NUEVO carga el registro.
2. **`opencode run --agent <subagent>` no sirve.** Emite:
   `! agent "sonda-free" is a subagent, not a primary agent. Falling back to default agent`
   y ejecuta el primario, con lo cual NO prueba nada sobre el modelo del subagente.
3. **Metodo que SI funciona** (reproducible, 2 pasos):
   a. escribir el agente de sonda con `model:` explicito;
   b. `opencode run "<prompt que ordene invocar EXACTAMENTE una vez task con
      subagent_type=sonda-X y devolver LITERAL la respuesta o el error>"`.
   El primario conductor responde `?` y el subagente se crea con el modelo pineado.

## Hallazgo sobre el guard

`verificar-capa-gratis.js` **SI cuenta** los agentes de sonda. Con las 5 sondas en disco
reporta `Agentes: 25 | gratis: 21 | de pago: 3`. Se refuta la premisa de que el guard
reportaria `20 | gratis: 20 | de pago: 0` con las sondas presentes. Por eso se borraron:
tambien habrian contaminado la capa gratuita al declarar 3 agentes de pago.

## RECOMENDACION

1. `free-plan` y `free-build`: `opencode/space-bunny-free` (medido $0, unico FREE que respondio).
2. `plan` y `build`: `opencode-go/deepseek-v4.1-flash` ($0.000966/turno medido) o
   `opencode-go/glm-5.3-flash` ($0.000950/turno, indistinguible en costo medido).
3. NO usar `opencode/big-pickle` bajo ningun modo: ROTOS confirmado empiricamente.
4. `opencode-go/qwen3.8-max` solo para plan de alto riesgo y con justificacion escrita:
   17x el costo de los otros dos pagos.
5. Los 16 subagentes deben quedar SIN `model:` (herencia) para que la cascada se pueda
   medir; hoy el guard (`:143-147`) prohibe explicitamente la herencia y habria que cambiarlo.

## Constancia

Agentes de sonda creados y BORRADOS tras la medicion (no forman parte del roster):
`sonda-free`, `sonda-dflash`, `sonda-pickle`, `sonda-glm`, `sonda-qwen`.
# T2.5 - Prueba de la HERENCIA de modelo (2026-10-04)

Prueba que sostiene el punto 1 de ADR-082: **un subagente sin `model:` en su
frontmatter corre en el modelo del primario que lo invoca**, y no en el default global.

Metodo: primario de sonda pineado a `opencode-go/deepseek-v4.1-flash` que invoca
EXACTAMENTE una vez `task` contra un subagente de sonda **sin linea `model:`**.
Medicion leida de `opencode.db` (`ses_ef89469b3ffeKidIownFaSRicC`):

| fila | agente | `model` | `cost` | `parent_id` | papel |
|---|---|---|---|---|---|
| 1 | `sonda-pago-p` | `deepseek-v4.1-flash` | $0.001788 | (vacio) | raiz, pin explicito de pago |
| 2 | `sonda-hereda` | `deepseek-v4.1-flash` | $0.0016035 | = padre | subagente **sin `model:`** |

## Contexto que hace la prueba discriminante

El `model` **global** de `opencode.json` es `opencode/space-bunny-free` (FREE).
El hijo **NO cayo** a ese default: tomo el del padre. Si la herencia no existiera, la
fila 2 habria registrado el modelo global y no el del padre.

## Conclusion

La herencia es un hecho medido en este repositorio, no una cita de documentacion. El
mecanismo que permite que el guard acepte 16 subagentes sin `model:` queda respaldado
por esta tabla. La comprobacion continua que lo vigila es
`verificar-capa-gratis.js verificar-herencia --sesion <id>`: exige que para cada fila
con `parent_id` no vacio, `hijo.model == padre.model`; si un subagente vuelve a
pinearse, o el proveedor cambia la precedencia, esa asercion lo detecta.

Los dos agentes de sonda (`sonda-pago-p` y `sonda-hereda`) se **BORRARON** tras la
medicion: no forman parte del roster de 20.
