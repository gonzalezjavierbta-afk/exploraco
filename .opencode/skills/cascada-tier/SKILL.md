---
name: cascada-tier
description: Guia operativa de la cascada de coste de ExploraCO tras ADR-083: el tier lo fija el MODELO ACTIVO de cada turno (selector), los 18 agentes van sin model: y con coste: heredado, y el invariante de coste es ATRIBUCION (reparto por message.data.modelID, detector de escalada tardia, --preflight). Allowlists medidas, lista ROTOS, gates 9+7 por rol y el bypass del menu @.
---

# Cascada de Tier (ADR-082 + ADR-083)

Como se decide el coste de una sesion en ExploraCO: **no preguntando, heredando**. El unico lugar del sistema donde vive el precio es el **modelo activo del turno**; los 18 agentes no tienen modelo propio.

> **Fuente de la regla de tier: `AGENTS.md` secciones 0 y 2, y `DECISIONS.md` ADR-083.** Esta skill es la guia operativa (allowlists, ROTOS, gates, herencia, comandos de verificacion), no la fuente normativa. Donde esta skill y `AGENTS.md` discrepen, **`AGENTS.md` manda**.

## 1. La idea

**El precio es una decision del turno; el comportamiento es una decision del agente. Son ortogonales.**

```
selector de modelos (por turno)  ->  modelo activo  ->  18 agentes sin pin heredan ese modelo
                                        |
                        +---------------+---------------+
                        |                               |
              FREE (opencode/space-bunny-free)   PAGO (deepseek-v4.1-flash, glm-5.3-flash)
                        |                               |
                 coste $0                        coste por turno x contexto
```

- El **tier lo fija el modelo activo de cada turno**, cambiable en el selector de la sesion. **La seleccion explicita de modelo PISA el pin del agente**: PROBADO en carga real (`-m opencode-go/deepseek-v4.1-flash` sobre un agente pineado a FREE -> el header registro deepseek). Es la palanca de pago, y ya existia en el producto antes de que la gobernanza la reconociera.
- Los **18 agentes NO declaran `model:`**. Declaran `coste: heredado` en el frontmatter: es el pin sustituido, la capa legible y auditable.
- Los **2 primarios** (`plan`, `build`) son **roles sin precio**: se distinguen por permiso de escritura (`plan` conserva `edit: deny`, ADR-078), no por tier. `free-plan` y `free-build` **ya no existen** (borrados; roster **20 -> 18**).
- **Una sesion puede empezar FREE y terminar PAGO.** Eso es **capacidad declarada**, no violacion: el sistema la mide y la atribuye en vez de prohibitla.
- **No existe ruta hibrida** ni pares gemelo por dominio (ADR-076). No existe "el subagente de pago": un subagente es tan FREE o tan PAGO como el modelo activo del turno que lo lanza.

## 2. Por que los agentes NO llevan `model:`

Un pin explicito en el frontmatter es exactamente lo que **anula la herencia**: el archivo manda, y entonces el subagente pagaria (o no) al precio que el turno no eligio. ADR-074 llego a ese pin; el precio de esa garantia era **acoplar el precio a un archivo** en vez de a una decision del operador.

La herencia esta **medida en este repositorio** (T2.5, 2026-10-04), no solo citada:

| fila | agente | `model` en `opencode.db` | coste | padre |
|---|---|---|---|---|
| 1 | `sonda-pago-p` | `deepseek-v4.1-flash` | $0.001788 | (raiz, pin de pago) |
| 2 | `sonda-hereda` | **`deepseek-v4.1-flash`** | $0.0016035 | = padre |

El `model` global de `opencode.json` es `opencode/space-bunny-free` (FREE) y el hijo **no cayo al global**: tomo el del padre. La herencia es **discriminante**. Evidencia completa: `scripts/ejecucion/sondas/sonda-modelos.md`.

## 3. La asimetria de momento (D4): el mismo cambio no cuesta lo mismo

El coste de un turno **escala con el contexto acumulado**, no con la tarea: `~50.000 tokens x numero de turnos`, con el `cache_read` como **86,49%--91,7%** del gasto medido. Estimar por salida de herramientas infraestima 45-70x.

| Momento | Contexto | Coste aproximado por subagente |
|---|---|---|
| Turno 2 | ~20k | **~$0.0015** |
| Turno 25 | ~700k | **~$0.0538** |

**Factor ~35x.** Escalar a PAGO en el turno 2 es un detalle; en el turno 25 es la factura de la sesion. Por eso el tier se decide **por turno** y por eso existe el detector de escalada tardia (seccion 5). En PAGO hay dos palancas y se eligen por momento: **recortar turnos** y **escalar temprano**.

## 4. Allowlists medidas y ROTOS

| model | veredicto | coste medido |
|---|---|---|
| `opencode/space-bunny-free` | OK (allowlist FREE; default de sesion) | $0.000000 |
| `opencode-go/deepseek-v4.1-flash` | OK (allowlist PAGO) | $0.000966 sonda minima / **$0.003331 carga real** de 4 turnos / 43.360 tokens |
| `opencode-go/glm-5.3-flash` | OK (allowlist PAGO, plan B, **NO pineado**) | $0.000950 |
| `opencode-go/qwen3.8-max` | OK pero **FUERA de allowlist** (17x) | $0.016108 |
| `opencode/big-pickle` | **FALLA -> ROTOS** | $0 |

Error literal medido de `opencode/big-pickle` como subagente:

```
Error from provider (Console): OpenCode's free tier can only be used from within OpenCode
```

No pinear un modelo fuera de las allowlists sin una sonda nueva registrada en `scripts/ejecucion/sondas/`. `qwen3.8-max` solo con justificacion escrita en un ADR que lo autorice.

## 5. El invariante de coste es ATRIBUCION, no prohibicion (D2)

El check "una sesion no debe contener mas de un modelo" **se elimino**: prohibia justo la capacidad que el operador quiere y, medido sobre el historial local (**1.702 sesiones**, **57** cambiaron de modelo a mitad, **921** abrieron en pago), nunca fue cierto como invariante. Un check que el 3,3% de las sesiones incumple sin dano no es un guard.

Lo que lo sustituye:

- **(i) Atribucion por tier.** La fuente fiable del modelo real es **`message.data.modelID` / `$.providerID`, por mensaje de asistente**. `session.model` del header registra el **ULTIMO** modelo, nunca el de apertura, y `PRAGMA table_info(session)` no expone "abrio como": **NO usarlo para decidir nada.**
- **(ii) Detector de ESCALADA TARDIA.** Avisa cuando se cumple *(primer mensaje de asistente FREE) AND (ultimo mensaje PAGO) AND (contexto por encima del umbral)* e imprime el **coste estimado** de continuar. No es una prohibicion: es una **advertencia con numero**.
- **Se mantiene el check (f):** el default de sesion (`model` y `small_model` de `opencode.json`) debe seguir en la allowlist FREE. Es la garantia de que una sesion que **no toca el selector** arranca en `$0`.
- **Checks (a), (b), (e) intactos:** cero pines, `coste: heredado`, allowlists/ROTOS cerrados. **(c) y (d) reescritos:** (c) exige que los primarios **NO** lleven `model:` y si `coste: heredado`; (d) comprueba la cobertura de tiers contra `opencode.db`, no contra la configuracion.

### Riesgo conocido: una sesion puede abrir en PAGO sin aviso

Con `default_agent: "build"` sin pin y `model`/`small_model` en la allowlist FREE, si el **selector recuerda `opencode-go/deepseek-v4.1-flash`**, la sesion abre en **PAGO sin ningun aviso**: `opencode.json` no le gana a un selector con memoria. No es un fallo del guard (el check (f) se cumple) sino un hueco de la premisa nueva. Se documenta en vez de ocultarse.

**Mitigacion (10 s del operador):** preguntar el **modelo activo antes y despues de pulsar Tab**, o correr `--preflight`.

## 6. La regla de oro: el gate se pide SIEMPRE, por ROL

**Pagar no compra saltar el freno.** El gate es por naturaleza del **dominio**, no por el precio del modelo (ADR-082 seccion 6). Con el tier desanclado del agente, un gate por tier seria literalmente imposible de escribir: por eso se piden **siempre**, en FREE y en PAGO.

## 7. Tabla de dominios de riesgo (7 sin gate + 9 con gate = 16)

Fuente de verdad: `ADR-082` (DECISIONS.md) y `ADR-083`. El gate se pide por la **naturaleza del dominio**, no por el precio del modelo.

**SIN gate (7)** -- se puede delegar sin confirmacion adicional:

| Agente | Dominio |
|---|---|
| `@explore` | Exploracion masiva |
| `@js-silo-dev` | JS/TS rutinario, `scripts/` |
| `@frontend-tpl` | CSS de silo / templates |
| `@media-reader` | Imagenes / audio / video / PDF |
| `@qa-auditor` | Certificacion / Escudo GOLD |
| `@docs-keeper` | Cierre documental |
| `@research-agent` | Validacion de fichas (solo validar; **nunca investiga**) |

**CON gate (9)** -- exigen **CONFIRMACION EXPLICITA del usuario antes de ejecutar**, en FREE y en PAGO:

| Agente | Dominio | Por que |
|---|---|---|
| `@sql-security` | RLS / esquema SQL | escribe esquema y permisos |
| `@data-migration` | Migraciones / seeds masivos | toca datos |
| `@backend-dev` | `api/*.js` / Neon / serverless | escribe el backend |
| `@renderer-dev` | Motor de render `buildHTML()` | motor de render |
| `@admin-dev` | `admin.html` / panel admin | escribe HTML critico |
| `@seo-dev` | SEO / sitemap / `index.html` | escribe `index.html` |
| `@content-loader` | Paginas dinamicas (seed + loader + smoke) | **escribe seeds** |
| `@architect` | Arquitectura / ADR | decisiones de arquitectura |
| `@architect-review` | Revision de arquitectura / ADR | segunda opinion tecnica |

Notas de procedencia que no hay que redescubrir:

- `@content-loader` entra porque **escribe seeds**; Hostalterraza no lo lista. Asimetria deliberada.
- `@research-agent` **sale** de la lista con gate: no escribe SQL, ni HTML, ni seeds, ni toca `api/*`. El riesgo lo produce el consumidor (`@content-loader`), que si esta con gate.
- La restriccion "solo invocado manualmente por el usuario" de `@sql-security`, `@js-silo-dev` y `@frontend-tpl` es un control **adicional**, no un sustituto del gate.

## 8. El BYPASS del proveedor: `permission.task` controla el RADIO, no el coste

Los 2 primarios llevan un bloque `permission.task` con `"*": deny` primero y allow-list explicita de los 16 subagentes (ADR-082 punto 5). Lo que hace y lo que NO hace:

- **SI hace:** acota lo que el *primario* puede delegar. Un `task: allow` plano convierte un error de ruteo en riesgo de dominio, y el radio de impacto de un primario es 16 agentes.
- **NO hace:** frenar el gasto, ni fijar el tier. No es una mitigacion de coste y no debe presentarse como tal.
- **Bypass real:** el **operador puede invocar cualquier subagente por el menu `@`**, saltandose el primario y por tanto la allow-list. El radio se controla dentro del primario, no frente al operador.

Por eso los gates de seccion 7 son la unica red que cubre esa via, y por eso son siempre.

Lo que diferencia a los planificadores de los builders no es el radio ni el precio: es el permiso de escritura (`plan` conserva `edit: deny`, ADR-078); criterio, alcance y coste son ejes separados.

## 9. Como verificar la cascada

**Guard de configuracion** (6 comprobaciones estaticas (a)-(f), ADR-082 punto 3, con (c)/(d) reescritos por ADR-083):

```bash
node scripts/ejecucion/verificar-capa-gratis.js
```

Salida esperada:

```
Agentes: 18 | primarios: 2 | subagentes heredados: 16
RESULTADO: OK. Cascada vigente (ADR-082).
```

**Reparto real por tier de una sesion** (atribucion D2 i):

```bash
node scripts/ejecucion/verificar-capa-gratis.js reparto --sesion <id>
```

**Preflight: el numero va delante del cambio de modelo** (D5):

```bash
node scripts/ejecucion/verificar-capa-gratis.js --preflight
```

Imprime el **modelo activo**, el **contexto actual** y el **coste estimado** de continuar en PAGO. El umbral de contexto es un **parametro** (`--umbral`), no una constante.

**Prueba continua de la herencia** (asercion en caliente, no freno de coste):

```bash
node scripts/ejecucion/verificar-capa-gratis.js verificar-herencia --sesion <id>
```

Para cada fila de `opencode.db` con `parent_id` no vacio, el modelo del **hijo debe ser igual** al del padre. Es lo que detecta que la cascada dejo de funcionar (un subagente vuelve a pinearse, o el proveedor cambia la precedencia). Se ejecuta en el cierre con `scripts/session_close.js` / `npm run usage:tanda`.

## 10. Lo que la cascada NO protege (deuda abierta)

- **La calidad del modelo de pago sin medir** en `backend-dev`, `sql-security` y `renderer-dev`. El modelo de pago es **mas barato, no mejor**: sin medicion, uno mas barato puede necesitar mas reintentos y acabar costando mas (ADR-082 deuda (a), heredada integra por ADR-083).
- **El proveedor puede cambiar precios, el menu de modelos o la precedencia de la herencia.** Las allowlists son datos medidos, no contratos: por eso la asercion de seccion 9 corre en cada cierre.
- **`session.model` seguira siendo un campo trampa** (deuda (f) de ADR-083): documentado como "no usarlo para decidir nada", sigue sin corregirse en el nombre.
- **Supuesto S-1 (no medido):** si al cambiar de primario/modelo **no se relee el cuerpo del agente**, cambiar de tier no surte efecto y el operador cree que bajo: fallo silencioso y caro. `opencode run` es no interactivo y no permite cambiar de agente a mitad, asi que **no es automatizable**; el operador lo verifica en 10 s. **Criterio de rollback (ADR-083):** si se confirma, se restaura el pin fijo en los primarios y el check de unicidad de modelo vuelve como **aviso**, conservando la atribucion y el detector de escalada tardia.
- `permission.task` **revierte parcialmente ADR-078** solo en `task`: vuelve a haber una friccion de autorizacion que la config habia eliminado.

## 11. Relativas

`AGENTS.md` secciones 0 a 2 (gobernanza vigente) - `ADR-083` (tier por modelo activo, atribucion, D4/D5) - `ADR-082` (cascada, herencia T2.5, allowlists, ROTOS, gates 9+7; **derogado solo en su premisa**) - `ADR-076` (roster unico, sin pares gemelo) - `ADR-078` (permisos) - `ADR-074` (allowlist FREE y ROTOS sobreviven) - `ADR-067` (rechazo del override de modelo en runtime como practica: el `-m` explicito del selector es la via correcta) - `scripts/ejecucion/sondas/sonda-modelos.md` (T1 y T2.5) - skill `eficiencia-recursos` (coste por turno).
