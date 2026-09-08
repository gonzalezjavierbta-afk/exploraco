# Directrices de Gobernanza y Enrutamiento Agéntico (GSD-Protocol)

Este repositorio utiliza el Desarrollo Dirigido por Subagentes (SDD). Queda prohibida la modificación desordenada de archivos sin un plan de especificación técnica aprobado en la Fase 1.

## 1. Matriz de Enrutamiento de Agentes (Ruteo por Costo)
Antes de procesar cualquier código, los agentes principales (plan/build) deben delegar las tareas a los subagentes especializados configurados en la carpeta `.opencode/agent/` según el lenguaje o dominio de la tarea. La tabla es la fuente de verdad (ADR-006); los modelos economicos evitan que todo el consumo caiga sobre el modelo principal `opencode-go/deepseek-v4-pro`.

### 1.1 Agentes gratis (0 costo — delegar tareas mecanicas y de bajo riesgo)

| Agente | Modelo | Uso |
|---|---|---|
| `exp-pickle` | `opencode/big-pickle` | Validaciones de bajo riesgo, linter, smoke tests simples |
| `qa-auditor` | `opencode/big-pickle` | Escudo GOLD y auditoria (solo reporta, no corrige) |

### 1.2 Agentes economicos (delegar PRIORITARIAMENTE tareas repetitivas/bajo riesgo)

| Agente | Modelo | Uso |
|---|---|---|
| `docs-keeper` | `opencode-go/deepseek-v4-flash` | Documentacion: TASKS.md, NEXT.md, DECISIONS.md, ADRs, handoffs |
| `content-loader` | `opencode-go/deepseek-v4-flash` | Creacion repetitiva de paginas dinamicas (seed+loader+smoke) |
| `research-agent` | `opencode-go/deepseek-v4-flash` | Investigacion web de destinos y fichas verificadas |
| `explore` | `opencode-go/deepseek-v4-flash` | Exploracion masiva de codigo (busquedas, regex, listados) |
| `js-silo-dev` | `opencode-go/deepseek-v4-flash` | Desarrollo JS/TS rutinario y refactor menor |
| `frontend-tpl` | `opencode-go/minimax-m3` | Frontend y estetica visual (CSS/React/HTML) |
| `admin-dev` | `opencode-go/minimax-m3` | Panel de administracion admin.html |
| `renderer-dev` | `opencode-go/minimax-m3` | Motor de renderizado pagina-destino.js |
| `data-migration` | `opencode-go/minimax-m3` | Operaciones de BD, migraciones y seeds masivos (SQL critico escala a `sql-security`) |
| `seo-dev` | `opencode-go/qwen3.8-flash` | Sitemap, meta tags, robots.txt, redirects, Search Console |
| `media-reader` | `opencode-go/mimo-v2.5` | Lectura/analisis de imagen, audio, video y PDF (multimodal) |

### 1.3 Agentes criticos (NO bajar de categoria; SQL/RLS/persistencia prohibido delegar a gratuitos)

| Agente | Modelo | Uso |
|---|---|---|
| `sql-security` | `opencode-go/deepseek-v4-pro` | Seguridad critica, RLS, persistencia SQL, migraciones de esquema |
| `backend-dev` | `opencode-go/deepseek-v4-pro` | Backend serverless api/*.js |
| `architect` | `opencode-go/deepseek-v4-pro` | Diseno de esquemas JSONB y decisiones de arquitectura |
| `architect-review` | `opencode-go/kimi-k3` | Revision de arquitectura y aprobacion de ADRs (segunda opinion) |

**Regla de oro:** todo agente DEBE tener `model:` explicito en su `.md` (prohibido heredar el modelo principal). Los IDs usan el prefijo real del proveedor OpenCode Go (`opencode-go/*`) o los modelos gratis (`opencode/*`); cualquier ID fuera de `opencode models` se considera invalido y se corrige.

**Plan = orquestador:** el agente `plan` (`.opencode/agent/plan.md`) NO ejecuta trabajo operativo. Explora mediante `@explore`, investiga via `gemini-research`/`@research-agent`, y deriva toda implementacion al subagente por dominio. Su modelo es `opencode-go/deepseek-v4-flash` para economizar.

**Workflow de investigacion externa:** la investigacion web de NUEVOS items de directorio (hostal, comida, sitio, evento) se ejecuta en Google Gemini (externo, no consume cuota) mediante el skill `gemini-research` (`prompts/GEMINI_MASTER_PROMPT.md`). `research-agent` queda para fichas legacy o validaciones, y toda ingesta se valida con `scripts/validate_ficha.js` antes de pasar a `create-dynamic-page`.

## 2. Reglas del Espacio de Trabajo contra la Deuda Técnica
Para mitigar la crisis de mantenibilidad, duplicación de código y rotación de commits, el runtime de OpenCode aplicará las siguientes restricciones:
1. **Regla de No-Duplicidad (Tripwire de 5 líneas)**: Queda prohibido copiar y pegar bloques de código existentes de más de 5 líneas para adaptarlos localmente. Si se requiere una funcionalidad similar en otra sección, se debe refactorizar el código base para crear una abstracción o función reutilizable.
2. **Prohibición de Captura Genérica de Excepciones**: No se permite la creación de bloques `try-catch` vacíos o capturas de excepciones genéricas (`catch (Exception e)`) que silencien fallos de integración continua. Toda excepción debe ser debidamente tipada, registrada y reportada.
3. **Delegación Sistemática de Exploración**: El agente principal no debe absorber operaciones masivas de exploración en su ventana de contexto. Toda búsqueda de archivos pesada, regex o listado recursivo de directorios debe delegarse al subagente `explore` mediante comandos `@explore` para evitar el desperdicio de tokens.
4. **Verificación Asíncrona Obligatoria (Gating de PR)**: Todo cambio en la lógica del negocio o middlewares debe ser validado ejecutando la suite de pruebas unitarias locales (`npm run test` o similar) antes de presentar la tarea como completada.

## 3. Estilo y Estándares de Código
* **UI/UX**: Seguir una paleta de colores limpia y moderna de alta gama. Evitar fuentes genéricas (como Arial o Roboto); utilizar en su lugar tipografías definidas en las hojas de estilo del proyecto con espaciados responsive estrictos.
* **Backend**: APIs serverless estructuradas, limpias y deterministas. El código debe ser ASCII-safe.