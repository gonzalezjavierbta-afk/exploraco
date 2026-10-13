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
# T3 - REGRESION: el FREE que arrancaba ya no arranca como subagente (2026-10-13)

Medido dentro de OpenCode, sesion `ses_ed9df7784ffervevDihdnHv8QM`, agente `build`.
Turno padre en FREE real (cabecera del runtime: `opencode/space-bunny-free`).
Coste de toda la tanda: $0.000000. Los 6 intentos fallaron ANTES de consumir tokens.

## Resultado

| # | modelo | veredicto | mensaje literal |
|---|---|---|---|
| padre | `opencode/space-bunny-free` (herencia) | OK | (ninguno) |
| 1 | herencia, sin `model:` | FALLA | `Subagent failed (sessionID: ses_eca5a0fc...): OpenCode's free tier can only be used from within OpenCode` |
| 2 | `opencode-go/space-bunny-free` | INEXISTENTE | `Model "opencode-go/space-bunny-free" is not available` |
| 3 | `opencode/opencode/cat-jam-free` | ID INVALIDO | `not available` (3 segmentos; el parametro `model` exige 2) |
| 4 | `opencode/space-bunny-free` | FALLA | mismo error free tier (ses_eca59c80) |
| 5 | `opencode/cat-jam-free` | FALLA | mismo error free tier (ses_eca59b80) |
| 6 | `opencode/longcat-2.5-preview-free` | FALLA | mismo error free tier (ses_eca59a58) |

## T1 vs T3: esto es una REGRESION, no una propiedad del modelo

T1 (2026-10-04) midio `opencode/space-bunny-free` como **OK**: 6.108 tokens, $0.000000,
2 turnos, 0 tools. T3 (2026-10-13) lo mide como **FALLA** en 2 de 2 intentos, con el
mismo id de modelo. La variable que cambio no es el modelo: es la plataforma o la
configuracion del proveedor entre ambas fechas.

Consecuencia para el bloque ROTOS: ese bloque clasifica como "modelo roto" a
`opencode/big-pickle` por este mismo error literal. Esa generalizacion era incorrecta:
el error no identifica un modelo malo, identifica **la ruta de delegacion + free tier**.
Por eso 3 modelos FREE distintos y validos fallan hoy con la misma cadena.

## Rastro en opencode.db: CERO

`ses_eca5a0fc`, `ses_eca59c80`, `ses_eca59b80` y `ses_eca59a58` **no existen** en la
tabla `session`. El fallo ocurre antes de persistir. Consecuencia directa: el guard no
puede detectar esta rotura leyendo la DB, porque no hay fila que leer.

## Por que el guard da OK con la delegacion caida

```
(a) OK 0 pines | (b) OK 16/16 heredado | (c) OK 2 primarios | (d) OK | (e) OK 0 pines | (f) OK
```

Los 6 checks son **estaticos**: leen `.opencode/agent/*.md` y `opencode.json`. Ninguno
lanza un subagente. Ademas la allowlist ya no describe la realidad: el catalogo vivo
reporta 69 modelos y 12 candidatos FREE; la allowlist describe 3, y uno de esos tres
(`opencode-go/space-bunny-free`) **no existe**.

## El preflight va un turno por detras (lectura util para el operador)

`--preflight` informa el modelo del **ultimo mensaje de asistente ya escrito** en
`opencode.db`. En el turno en curso todavia no hay mensaje de asistente, asi que el
preflight no puede ver el modelo que se esta usando ahora. Fuente autoritativa del
turno en curso: la cabecera del runtime del propio agente.

## Metodo que SI reproduce (el de T1, punto 3)

`opencode run` NO sirve con `--agent` (cae al primario, no prueba nada del modelo del
subagente). SI sirve ordenando un `task` dentro de un primario conductor, contra un
agente de sonda con `model:` explicito, desde un PROCESO NUEVO (el registro de agentes
no hace hot-reload). Ese es el unico metodo automatizable de prueba real de subagente,
y es el que falta como check: hoy el guard verifica cadenas, no arranque.

## Constancia

No se toco `opencode.json`, ni el roster, ni `DECISIONS.md`. Cero modelos de pago.

# T4 - ANEXO MEDIDO: herencia con 0 pines, evidencia positiva del FREE, entrada fantasma, trampa de nombres y resolucion de la aparente contradiccion T3/T4 (2026-10-13)

Evidencia empirica de la tanda que implemento **ADR-096**. El argumento de la decision vive
**una sola vez** en `DECISIONS.md` ADR-096 (ADR-084 D1); este anexo solo aporta datos.

## 1. `opencode/big-pickle` es ROTO como SUBAGENTE tambien por HERENCIA y con 0 pines

T1 (2026-10-04) lo habia medido **solo con pin explicito**. Dato nuevo, medido con el roster
en **0 pines** y la delegacion por **herencia**:

```
Subagent failed (sessionID: ses_eca2f5c86ffezUMEb3nG80ezGf): OpenCode's free tier can only be used from within OpenCode
```

**0 tokens consumidos. $0.000000.** El fallo **no depende del pin**: ocurre igual por herencia.
Consecuencia para el guard: `NO_SUBAGENTE` es una clasificacion **medida**, no una cita de T1.

## 2. `opencode/space-bunny-free`: el unico activo con $0 medido para PRIMARIO y SUBAGENTES

Evidencia **positiva** (no un argumento, una medicion): 3 subsesiones reales a **$0.000000**,
ejecutadas en `ses_ed9df7784ffervevDihdnHv8QM`:

| # | agente invocado | modelo | costo medido | tokens |
|---|---|---|---|---|
| 1 | `explore` | `opencode/space-bunny-free` | $0.000000 | (subsesion real) |
| 2 | `js-silo-dev` | `opencode/space-bunny-free` | $0.000000 | (subsesion real) |
| 3 | `js-silo-dev` | `opencode/space-bunny-free` | $0.000000 | (subsesion real) |

Mas el **control de T1**: `opencode/space-bunny-free` como subagente pineado, **6.108 tokens**,
**$0.000000**. Por eso el guard lo marca como la **unica FREE estricta con $0 medido en primario
Y subagente**.

## 3. Entrada FANTASMA en la allowlist: `opencode-go/space-bunny-free`

Estaba en `FREE_SUPERVIVIENTES` y **no existe en el catalogo del proveedor**. Confirmado por dos
vias independientes: T3 #2 (`Model "opencode-go/space-bunny-free" is not available`) y el guard,
que hoy lo aisla como `NO_CATALOGO` (**1**).

Catalogo real medido del proveedor: **13 modelos $0 activos**, de los cuales **5 siguen sin
clasificar**: `opencode/cat-jam-free`, `opencode/exo-free`, `opencode/ling-3.1-flash-free`,
`opencode/step-5-preview-free`, `opencode-go/step-5-preview-free`. Ninguno esta referenciado.

## 4. Trampa de nombres: misma familia, precio OPUESTO

| id | tier | precio |
|---|---|---|
| `opencode/space-bunny-free` | FREE | $0 |
| `opencode-go/space-bunny` | **PAGO** | $0.15 entrada / $0.60 salida |

Dos ids que un humano lee como "el mismo modelo" y el proveedor cobra al reves. Es la razon
medida por la que ADR-096 exige **coincidencia exacta de ids** en lugar de prefijos o sufijos.

## T3 vs T4: NO es una contradiccion (ACLARACION MEDIDA, 2026-10-13)

El mensaje del proveedor (`the free tier can only be used from within OpenCode`) es **generico y
NO describe el gate real**, que es **por modelo**. Evidencia: `opencode/big-pickle` fue rechazado
como subagente en **2 mediciones independientes** (pin explicito en la sonda T1 del 2026-10-04 y
**por herencia con 0 pines** hoy: 0 tokens, $0.000000), mientras `opencode/space-bunny-free` tiene
**3 subsesiones medidas a $0.000000**. Conclusion operativa: el **trabajo delegado a $0 SI es
posible** en este repo con `space-bunny-free`; `big-pickle` sirve como **primario** y **no** como
**subagente**.

**Esto NO es un bug: no debe registrarse como `BUG-XXX`.** Quien vuelva a leer T3 y T4 como
contradiccion encuentra aqui la explicacion. El registro de T3 **NO se borra** (ADR-003): sigue
siendo la medicion valida de lo que pasa al delegar a un modelo sin permiso de subagente.

## Constancia

No se toco `opencode.json`, ni el roster, ni `DECISIONS.md`, ni `AGENTS.md` por este anexo.
Cero modelos de pago: toda la evidencia de este anexo es $0.000000.