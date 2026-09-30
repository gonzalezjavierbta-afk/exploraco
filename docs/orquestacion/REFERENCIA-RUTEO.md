# REFERENCIA DE RUTEO (ExploraCO)

Documento de apoyo a la orquestacion de agentes. Sustituye las referencias al
inexistente AGENTS.md dentro de `.opencode/agent/**`. Anclas verificadas contra el
archivo real del repositorio (ADR-006). ASCII-safe (ADR-002).

## 1. Matriz de dominios -> agente(s) -> ancla real

| Dominio | Agente(s) | Fichero(s) ancla real |
|---|---|---|
| backend api | backend-dev-free | api/destinos.js, api/usuarios.js, api/interacciones.js, api/admin-destinos.js, api/publicar-lugar.js, api/pagina-destino.js, api/admin.js, api/utilidades.js |
| motor de render | renderer-dev-free | api/pagina-destino.js, pagina-destino.js, vercel.json |
| panel admin | admin-dev-free | admin.html, api/publicar-lugar.js |
| UI/estetica | frontend-tpl-free | index.html, admin.html |
| paginas dinamicas | content-loader-free | scripts/ (seed-<slug>.js, load-<slug>-api.js, smoke_test_<slug>.js) |
| JS/TS rutinario | js-silo-dev-free, exp-pickle-free | scripts/, index-api-connector.js |
| SQL/RLS | sql-security-free | db/migrations/, api/*.js (solo datos de bajo riesgo) |
| migraciones/seeds | data-migration-free | db/migrations/, db/cleanups/, scripts/ |
| SEO | seo-dev-free | api/utilidades.js, index.html, vercel.json, robots.txt, _redirects, _headers |
| arquitectura/ADR | architect-free, architect-review-free | exploraco desarrollo/DECISIONS.md, exploraco desarrollo/BLUEPRINT.md |
| imagenes/audio/video/PDF | media-reader-free | entrada externa; fichas en exploraco desarrollo/ |
| auditoria/Escudo GOLD | qa-auditor-free | scripts/, api/, admin.html |
| documentacion | docs-keeper-free | exploraco desarrollo/ (PROJECT.md, NEXT.md, TASKS.md, BLUEPRINT.md, DECISIONS.md, BUGS_HISTORICOS.md) |
| exploracion | explore-free, research-agent-free | raiz del repo (glob/grep), exploraco desarrollo/ficha-<slug>.md |

Nota: la especificacion habla de "13 dominios" pero enumera 14 etiquetas; esta
tabla cubre las 14.

Todos los agentes de esta tabla son GRATIS: heredan el modelo de su primario
(seccion 4). Los 4 dominios de riesgo alto tienen ademas un pin de PAGO:

| Dominio | Agente FREE (default) | Pin de PAGO (solo con OK del operador) |
|---|---|---|
| backend api | backend-dev-free | backend-dev-pro |
| motor de render | renderer-dev-free | renderer-dev-pro |
| arquitectura/ADR | architect-free, architect-review-free | architect-pro |
| migraciones/seeds | data-migration-free | data-migration-pro |

Los otros 10 dominios NO tienen pin de pago: se resuelven siempre en gratis.

## 2. Anclas por dominio (como localizarlo)

| Dominio | Fichero ancla | Como localizarlo (grep) |
|---|---|---|
| backend api | api/ | grep -r "module.exports" api/ |
| motor de render | api/pagina-destino.js | grep -r "buildHTML" api/pagina-destino.js |
| panel admin | admin.html | grep -r "CATEGORY_TAG_FIELDS" admin.html |
| UI/estetica | index.html | grep -r "class=" index.html |
| paginas dinamicas | scripts/ | grep -r "seed-" scripts/ |
| JS/TS rutinario | scripts/ | grep -r "require(" scripts/ |
| SQL/RLS | db/migrations/ | grep -r "jsonb" db/migrations/ |
| migraciones/seeds | db/migrations/ | grep -r "INSERT INTO" db/migrations/ |
| SEO | api/utilidades.js | grep -r "sitemap" api/utilidades.js |
| arquitectura/ADR | exploraco desarrollo/DECISIONS.md | grep -r "ADR-" "exploraco desarrollo/DECISIONS.md" |
| imagenes/audio/video/PDF | (entrada externa) | n/a (lectura de archivos multimedia) |
| auditoria/Escudo GOLD | scripts/ | grep -r "node --check" scripts/ |
| documentacion | exploraco desarrollo/TASKS.md | grep -r "Estado" "exploraco desarrollo/TASKS.md" |
| exploracion | raiz del repo | git grep -n "<patron>" |

## 3. Reglas de orquestacion (ADR-067)

R1 Carga diferida. Los subagentes NO heredan el contexto de la sesion: cada uno
recibe un brief autonomo (objetivo, ficheros exactos, criterio de aceptacion,
formato de salida). Regla practica: si el brief necesita "como vimos antes", el
brief esta mal escrito.

R2 Docs solo al cierre. La documentacion (`exploraco desarrollo/*.md`) se escribe
en UN pase de cierre de tanda, no tarea por tarea. Excepcion: si la tarea ES el
cierre documental. La ejecuta docs-keeper-free.

R3 Web solo por Gemini. La investigacion web NO la hacen los subagentes: el
agente entrega el prompt COMPLETO listo para pegar en Google Gemini, Gemini
devuelve la ficha .md, y el agente la valida y verifica cada foto con curl -I
esperando HEAD 200 (BUG-022). Sin API key, sin scrapeo y sin bucles de webfetch.

R4 Resumen de gasto obligatorio. Al cerrar cada tanda se ejecuta
`node scripts/ejecucion/informe-cuota.js --task` y la tabla se pega en el chat.
Sin tabla pegada, la tanda NO esta cerrada.

R5 Guard de la capa gratuita. Antes de cerrar se ejecuta
`node scripts/ejecucion/verificar-capa-gratis.js` (o `npm run coste:gratis`).
Si sale con codigo 1, algum agente `*-free` quedo pineado a un modelo de pago:
eso se corrige ANTES de cobrar. El guard ya corre como primer paso de
`npm run test`, asi que un fallo de coste rompe la suite.

## 4. Capas de coste (ADR-074)

Hay tres capas. La capa la decide el agente PRIMARIO con el que abres la sesion;
los subagentes `*-free` NO declaran modelo y heredan el de su primario, asi que
cambiar de primario cambia las 21 capas de golpe.

| Capa | Agentes | Modelo | Coste |
|---|---|---|---|
| FREE | `free-build`, `free-plan`, `hybrid-build`, `hybrid-plan` | `opencode/space-bunny-free` | $0 |
| FREE (heredan) | los 17 subagentes `*-free` | heredan del primario | $0 |
| PAID | `paid-build`, `paid-plan` | `opencode-go/deepseek-v4.1-flash` | pago |
| PAID (pines) | `backend-dev-pro`, `architect-pro`, `renderer-dev-pro`, `data-migration-pro` | `opencode-go/deepseek-v4.1-flash` | pago |

### Allowlist FREE (los unicos 3 verificados)

| Modelo | Verificacion |
|---|---|
| `opencode/space-bunny-free` | subagente OK, $0.000000, con vision |
| `opencode-go/space-bunny-free` | subagente OK, $0.000000, con vision |
| `opencode-go/longcat-2.5-preview-free` | subagente OK, $0.000000, con vision |

### Modelos que PARECEN gratis y NO lo son

No usarlos en `.opencode/agent/*.md`. El proveedor los rechaza como subagente
con `OpenCode's free tier can only be used from within OpenCode` (BUG-092):

`opencode/big-pickle`, `opencode/ling-3.0-flash-fin-free`,
`opencode/longcat-2.5-preview-free`, `opencode/mimo-v2.6-flash-free`,
`opencode/muse-spark-1.3-contributor-free`, `opencode/nemotron-3-ultra-free`,
`opencode/nemotron-3.5-lightning-free`.

`opencode/big-pickle` solo funciona como modelo de SESION en la app, nunca como
subagente. Si el primario fuera big-pickle, los subagentes que heredan fallarian.
Por eso el default es `space-bunny-free`, que es el mismo modelo (Space Bunny)
por la via que si soporta subagentes.

### Modelos que sirven pero cuestan dinero

`google/*` esta autenticado pero la key TIENE BILLING: `gemini-3.5-flash-lite` y
`gemini-flash-lite-latest` responden bien y cobraron $0.0025 por llamada corta.
No son opcion para la capa gratuita. (`gemini-2.5-flash-lite` ya esta retirado.)

### Como seleccionar free o pago

| Quiero | Hago esto |
|---|---|
| Todo gratis (default) | abro con `@free-build` o `@hybrid-build` |
| Todo de pago | abro con `@paid-build` o `@paid-plan` |
| Pagar solo 1 tarea | `@hybrid-build` y el agorta lo que el pro de esa fila |

Con `opencode.json` en `opencode/space-bunny-free`, el agente por defecto
(`free-build`) y el resto de subagentes son gratis. Cambiar de primario es el
unico interruptor que hace falta; no se edita ningun archivo para cambiar de capa.

## 5. Politica de escalada

### Escalada de coste (dentro del codigo)

Solo `hybrid-build` y `hybrid-plan` pueden proponer un `-pro`, y NUNCA lo invocan
sin respuesta afirmativa del operador. Deben presentar el bloque `ESCALADO
PROPUESTO` con dominio, motivo concreto, agente, costo estimado y alternativa
gratuita. Un pin `-pro` invocado por otro agente es un bug de orquestacion.

El patron free/paid por dominio que se aplico del 2026-09-09 al 2026-09-18
(commit `20ac822`) y que BUG-092 elimino queda restaurado como capa opcional, no
como default: hoy el default es gratis y el pago es excepcion autorizada.

### Escalada al operador humano

RLS, claves privadas, autenticacion y migraciones de esquema en Neon se escalan
al OPERADOR HUMANO. sql-security-free no gestiona RLS, autenticacion, claves ni
integridad critica: solo consultas, seeds y migraciones de datos de bajo riesgo.
El Escudo GOLD certifica sintaxis, ASCII-safety y balance de divs, pero no
permisos de fila en Postgres ni secretos; por eso esa capa se cierra con revision
humana, no con un modelo mas caro. Un `-pro` NO reemplaza esa revision.

## 6. Referencia

- ADR-067 en `exploraco desarrollo/DECISIONS.md`: modelo de 3 capas con
  presupuesto (Capa 0 orquestador, Capa 0b ejecucion, Capa 1 apoyo), roster
  40 -> 19 y convencion de `description:`.
- ADR-074 en `exploraco desarrollo/DECISIONS.md`: restauracion de la capa
  gratuita con `opencode/space-bunny-free`, herencia de modelo en los subagentes,
  4 pines `-pro` de pago y el guard `verificar-capa-gratis.js`. Roster 19 -> 27.
- BUG-092 en `exploraco desarrollo/BUGS_HISTORICOS.md`: por que los 19 agentes
  pasaron a `opencode-go` el 2026-09-29 y por que eso ya no aplica.
