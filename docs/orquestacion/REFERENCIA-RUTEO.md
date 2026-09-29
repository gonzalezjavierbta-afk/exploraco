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

## 4. Politica de escalada

RLS, claves privadas, autenticacion y migraciones de esquema en Neon se escalan
al OPERADOR HUMANO. sql-security-free no gestiona RLS, autenticacion, claves ni
integridad critica: solo consultas, seeds y migraciones de datos de bajo riesgo.
El Escudo GOLD certifica sintaxis, ASCII-safety y balance de divs, pero no
permisos de fila en Postgres ni secretos; por eso esa capa se cierra con revision
humana, no con un modelo mas caro.

## 5. Referencia

- ADR-067 en `exploraco desarrollo/DECISIONS.md`: modelo de 3 capas con
  presupuesto (Capa 0 orquestador, Capa 0b ejecucion, Capa 1 apoyo), roster
  40 -> 19 y convencion de `description:`.
