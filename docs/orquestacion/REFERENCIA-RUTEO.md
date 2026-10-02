# REFERENCIA DE RUTEO (ExploraCO)

Documento de apoyo a la orquestacion de agentes. Complementa el `AGENTS.md` de
la raiz (norma vigente) con las anclas de archivo y los comandos de
localizacion. Anclas verificadas contra el archivo real del repositorio
(ADR-006). ASCII-safe (ADR-002).

## 1. Matriz de dominios -> agente -> ancla real

Roster unico de 20 agentes (ADR-076): un unico agente por dominio, sin pares
`-free`/`-pro` y sin ruta hibrida.

| Dominio | Agente | Fichero(s) ancla real |
|---|---|---|
| backend api | `backend-dev` | api/destinos.js, api/usuarios.js, api/interacciones.js, api/admin-destinos.js, api/publicar-lugar.js, api/admin.js, api/utilidades.js |
| motor de render | `renderer-dev` | api/pagina-destino.js, vercel.json |
| panel admin | `admin-dev` | admin.html, api/publicar-lugar.js |
| UI/estetica | `frontend-tpl` | index.html, admin.html |
| paginas dinamicas | `content-loader` | scripts/ (seed-<slug>.js, load-<slug>-api.js, smoke_test_<slug>.js) |
| JS/TS rutinario | `js-silo-dev` | scripts/, index-api-connector.js |
| SQL/RLS | `sql-security` | db/migrations/, api/*.js (solo datos de bajo riesgo) |
| migraciones/seeds | `data-migration` | db/migrations/, db/cleanups/, scripts/ |
| SEO | `seo-dev` | api/utilidades.js, index.html, vercel.json, robots.txt, _redirects, _headers |
| arquitectura/ADR | `architect` | exploraco desarrollo/DECISIONS.md, BLUEPRINT.md |
| revision de arquitectura/ADR | `architect-review` | exploraco desarrollo/DECISIONS.md |
| imagenes/audio/video/PDF | `media-reader` | entrada externa; fichas en exploraco desarrollo/ |
| auditoria/Escudo GOLD | `qa-auditor` | scripts/, api/, admin.html |
| documentacion | `docs-keeper` | exploraco desarrollo/ (PROJECT.md, NEXT.md, TASKS.md, BLUEPRINT.md, DECISIONS.md, BUGS_HISTORICOS.md) |
| exploracion | `explore` | raiz del repo (glob/grep) |
| research de destinos | `research-agent` | exploraco desarrollo/ficha-<slug>.md |

**Todos los agentes del roster son GRATIS** ydeclaran `model:
opencode/space-bunny-free`. No existe ningun pin de pago en el roster.

## 2. Dominios con gate de confirmacion

Estos exigen CONFIRMACION EXPLICITA del usuario antes de ejecutarse, incluso en
ruta FREE (`AGENTS.md` §2):

| Gate | Agente |
|---|---|
| SQL / RLS / esquema | `sql-security` |
| migraciones / seeds masivos | `data-migration` |
| motor de render (`buildHTML`) | `renderer-dev` |
| arquitectura / ADR | `architect` |
| revision de arquitectura / ADR | `architect-review` |

## 3. Anclas por dominio (como localizarlo)

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

**Regla de lectura (obligatoria):** prohibido leer completos archivos > 150 KB
(`api/interacciones.js`, `admin.html`, `mi-perfil.html`, `DECISIONS.md`,
`TASKS.md`, `NEXT.md`, `BUGS_HISTORICOS.md`). Usar `grep` con ruta concreta y
`Read` con `offset`/`limit`: un read completo envenena el `cache_read` de los
turnos siguientes.

## 4. Reglas de orquestacion (ADR-067 / ADR-076)

R1 Carga diferida. Los subagentes NO heredan el contexto de la sesion: cada uno
recibe un brief autonomo (objetivo, ficheros exactos, criterio de aceptacion,
formato de salida). Regla practica: si el brief necesita "como vimos antes", el
brief esta mal escrito.

R2 Docs solo al cierre. La documentacion (`exploraco desarrollo/*.md`) se escribe
en UN pase de cierre de tanda, no tarea por tarea. Excepcion: si la tarea ES el
cierre documental. La ejecuta `docs-keeper`.

R3 Web solo por Gemini. La investigacion web NO la hacen los subagentes: el
agente entrega el prompt COMPLETO listo para pegar en Google Gemini (base en
`.opencode/prompts/GEMINI_MASTER_PROMPT.md`), Gemini devuelve la ficha .md, y el
agente la valida con `scripts/validate_ficha.js` y verifica cada foto con
`curl -I` esperando HEAD 200 (BUG-022). Sin API key, sin scrapeo y sin bucles de
webfetch.

R4 Resumen de gasto obligatorio. Al cerrar cada tanda se ejecuta
`node scripts/usage_report.js --summary` y `node scripts/ejecucion/informe-cuota.js
--task`, y la tabla se pega en el chat. Sin tabla pegada, la tanda NO esta
cerrada. Para conciliacion estimado vs real: `node scripts/session_close.js`.

R5 Guard de la capa gratuita. Antes de cerrar se ejecuta
`node scripts/ejecucion/verificar-capa-gratis.js` (o `npm run coste:gratis`).
Debe reportar `20 | gratis: 20 | de pago: 0`. Si sale con codigo 1, algun agente
quedo pineado a un modelo de pago: eso se corrige ANTES de cobrar. El guard
corre como primer paso de `npm run test`, asi que un fallo de coste rompe la
suite.

## 5. Capa de coste (ADR-074)

Todo el roster es FREE. La capa la decide el primario con el que abres la sesion;
los especialistas declaran su propio `model:` para que la capa sea auditable
sin depender de quien los invoco.

| Capa | Agentes | Modelo | Coste |
|---|---|---|---|
| FREE (primarios) | `free-build`, `free-plan` | `opencode/space-bunny-free` | $0 |
| FREE (primarios, heredan) | `plan`, `build` | heredan de `opencode.json` | $0 |
| FREE (especialistas) | los 16 subagentes | `opencode/space-bunny-free` | $0 |

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
subagente. Por eso el default es `space-bunny-free`, que es el mismo modelo
(Space Bunny) por la via que si soporta subagentes.

### Modelos que sirven pero cuestan dinero

`google/*` esta autenticado pero la key TIENE BILLING: `gemini-3.5-flash-lite` y
`gemini-flash-lite-latest` responden bien y cobraron $0.0025 por llamada corta.
No son opcion para la capa gratuita. (`gemini-2.5-flash-lite` ya esta retirado.)

### Como se cambia de capa

No hay interruptor por agente: `opencode.json` fija `model: opencode/space-bunny-free`
y `default_agent: free-build`. Para usar un modelo de pago habria que crear el
agente y fijar su `model:` explicitamente, previa confirmacion del usuario
(`AGENTS.md` §0).

## 6. Politica de escalada

No hay escalada de coste dentro del codigo: no existe agente de pago. Si una
tarea de riesgo alto (`api/*.js` con logica nueva, `buildHTML()` anidado,
migracion de esquema) no se resuelve en FREE, **no se fuerza**: se entrega como
bloque y se pregunta al usuario.

RLS, claves privadas, autenticacion y migraciones de esquema en Neon se escalan
al OPERADOR HUMANO. `sql-security` no gestiona RLS, autenticacion, claves ni
integridad critica: solo consultas, seeds y migraciones de datos de bajo riesgo.
El Escudo GOLD certifica sintaxis, ASCII-safety y balance de divs, pero no
permisos de fila en Postgres ni secretos; por eso esa capa se cierra con
revision humana, no con un modelo mas caro.

## 7. Skills

Skills reales en `.opencode/skills/` (11): `anti-absorcion`,
`create-dynamic-page`, `eficiencia-recursos`, `express-mode`, `frontend-design`,
`gold-shield`, `grill-me`, `improve-codebase-architecture`, `research-destination`,
`templates`, `web-design-guidelines`.

Despublicadas (2026-10-01): `batch-create`, `gemini-research`, `ingest-eventos`.
Sus prompts se conservaron en `.opencode/prompts/` y el validador de fichas
quedo canonico en `scripts/validate_ficha.js` (cierra BUG-034).

## 8. Referencia

- ADR-067 en `exploraco desarrollo/DECISIONS.md`: modelo de capas con
  presupuesto y convencion de `description:`.
- ADR-074 en `exploraco desarrollo/DECISIONS.md`: restauracion de la capa
  gratuita con `opencode/space-bunny-free` y el guard `verificar-capa-gratis.js`.
- ADR-076: roster unico de 20 agentes sin pares `-free`/`-pro`, retiro de la
  ruta hibrida y de los pines de pago; `AGENTS.md` creado en la raiz.
- BUG-034: drift de la ruta del validador de fichas (resuelto: canonico en
  `scripts/validate_ficha.js`).
- BUG-092: por que los agentes pasaron a modelos de pago el 2026-09-29 y por que
  eso ya no aplica.