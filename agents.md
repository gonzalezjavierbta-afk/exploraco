# Directrices de Gobernanza y Enrutamiento Agéntico (GSD-Protocol)

Este repositorio utiliza el Desarrollo Dirigido por Subagentes (SDD). Queda prohibida la modificación desordenada de archivos sin un plan de especificación técnica aprobado en la Fase 1.

## 1. Matriz de Enrutamiento de Agentes (Ruteo por Costo)
Antes de procesar cualquier código, los agentes principales (build/plan) deben delegar las tareas a los subagentes especializados configurados en la carpeta `.opencode/agents/` según el lenguaje o dominio de la tarea:
* **Frontend y Estética Visual (CSS/React/HTML)**: Delegar al agente `frontend-tpl` utilizando el modelo `minimax/m3` o `qwen/qwen3.7-plus`.
* **Desarrollo Javascript/Typescript Rutinario**: Delegar al subagente de bajo coste `js-silo-dev` que apunta al modelo gratuito `deepseek-v4-flash-free`.
* **Tareas de Validación de Calidad y Tests**: Delegar al agente de soporte `exp-pickle` utilizando el modelo gratuito `opencode/big-pickle` (MiMo-v2.5) solo para tareas de bajo riesgo.
* **Seguridad Crítica, RLS y Persistencia (SQL)**: Queda terminantemente prohibido delegar estas tareas a agentes experimentales gratuitos. Estas tareas deben ser procesadas exclusivamente por `sql-security` o `architect-review` usando `deepseek-v4-pro` o `kimi-k3`.

## 2. Reglas del Espacio de Trabajo contra la Deuda Técnica
Para mitigar la crisis de mantenibilidad, duplicación de código y rotación de commits, el runtime de OpenCode aplicará las siguientes restricciones:
1. **Regla de No-Duplicidad (Tripwire de 5 líneas)**: Queda prohibido copiar y pegar bloques de código existentes de más de 5 líneas para adaptarlos localmente. Si se requiere una funcionalidad similar en otra sección, se debe refactorizar el código base para crear una abstracción o función reutilizable.
2. **Prohibición de Captura Genérica de Excepciones**: No se permite la creación de bloques `try-catch` vacíos o capturas de excepciones genéricas (`catch (Exception e)`) que silencien fallos de integración continua. Toda excepción debe ser debidamente tipada, registrada y reportada.
3. **Delegación Sistemática de Exploración**: El agente principal no debe absorber operaciones masivas de exploración en su ventana de contexto. Toda búsqueda de archivos pesada, regex o listado recursivo de directorios debe delegarse al subagente `explore` mediante comandos `@explore` para evitar el desperdicio de tokens.
4. **Verificación Asíncrona Obligatoria (Gating de PR)**: Todo cambio en la lógica del negocio o middlewares debe ser validado ejecutando la suite de pruebas unitarias locales (`npm run test` o similar) antes de presentar la tarea como completada.

## 3. Estilo y Estándares de Código
* **UI/UX**: Seguir una paleta de colores limpia y moderna de alta gama. Evitar fuentes genéricas (como Arial o Roboto); utilizar en su lugar tipografías definidas en las hojas de estilo del proyecto con espaciados responsive estrictos.
* **Backend**: APIs serverless estructuradas, limpias y deterministas. El código debe ser ASCII-safe.