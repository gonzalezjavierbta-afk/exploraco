# ORQUESTACIÓN DE AGENTES, SUBAGENTES Y SKILLS — EXPLORACO (AI-DOS)

## Estado
- **Versión**: v1.0 (Esquema Tripartito: Standard/Pro, Free/Open-Source y Hybrid)
- **Referencia del Sistema**: Framework de Gobernanza AI-DOS Core & OpenCode Orchestration Architecture
- **Ubicación de Configuración Global**: `opencode.json` / `.opencode/agents/*.md`

---

## 1. VISIÓN GENERAL DE LA ARQUITECTURA DE ORQUESTACIÓN

El sistema de desarrollo de ExploraCO utiliza la plataforma **OpenCode** para orquestar la inteligencia artificial mediante **Agentes Principales (`primary`)**, **Subagentes Especializados (`subagent`)** y **Reglas/Skills de Negocio**. 

Esta estructura implementa directamente los principios del **AI-DOS Master Specification**:
1. **Desacoplamiento de Modelos**: La tarea define la capacidad requerida (`Capability Contract`), no la marca del modelo.
2. **Contexto Mínimo Suficiente**: Cada subagente recibe únicamente los archivos y reglas que necesita (`Context Package`).
3. **Control de Daños y Aislamiento**: Los subagentes de exploración y auditoría no tienen permisos de edición, evitando modificaciones accidentalmente en el código.

---

## 2. LOS 3 ESQUEMAS DE ORQUESTACIÓN EN OPENCODE

El sistema permite alternar dinámicamente entre **3 esquemas de operación** según la disponibilidad de presupuesto, complejidad técnica o la cuota de API disponible:

```
+-----------------------------------------------------------------------------------+
|                              ESQUEMAS DE EJECUCIÓN                                |
+-------------------------------+-------------------+-------------------------------+
| 1. STANDARD / PRO             | 2. FREE / OPEN-SRC| 3. HYBRID (OPTIMIZADO)        |
| - Modelos: Commercial Pro     | - Modelos: Free   | - Modelos: Mezcla Pro + Free  |
| - Prioridad: Máxima precisión | - Prioridad: $0   | - Prioridad: Relación $ / API |
+-------------------------------+-------------------+-------------------------------+
```

### A. Esquema Standard / Pro (Máxima Precisión Técnica)
* **Agente Principal por defecto**: `build` / `plan`
* **Modelos Utilizados**: Comercial Pro (`opencode-go/deepseek-v4-flash` por el momento, es necesario revisar modelos mas economicos para incluir en el sistema).
* **Propósito**: Tareas complejas de refactorización backend, reescrituras estructurales de HTML/CSS de más de 7,000 líneas (`admin.html`) y migraciones críticas de esquemas SQL en Neon PostgreSQL.
* **Comportamiento de Delegación**: Invoca exclusivamente subagentes Pro (`backend-dev`, `admin-dev`, `data-migration`, etc.).

### B. Esquema Free / Open-Source (Costo Cero / Ilimitado)
* **Agente Principal por defecto**: `free-build` / `free-plan`
* **Modelos Utilizados**: Open-Source / Gratuitos (`opencode/big-pickle` o locales en Ollama `qwen2.5-coder:7b`).
* **Propósito**: Ejecución continua de tareas livianas, exploración masiva del código, generación de páginas dinámicas a partir de plantillas y actualización de documentación sin consumir cuota comercial.
* **Comportamiento de Delegación**: Invoca únicamente subagentes de la matriz `-free` (`backend-dev-free`, `content-loader-free`, `docs-keeper-free`, etc.).

### C. Esquema Hybrid (Enrutamiento Económico e Inteligente) — *NUEVO*
* **Agente Principal por defecto**: `hybrid-build` / `hybrid-plan`
* **Modelos Utilizados**: Combinación estratégica de modelos Pro (para toma de decisiones/código crítico) y Free (para lectura/plantillas/docs).
* **Propósito**: Maximizar el rendimiento del presupuesto. Minimiza el gasto de tokens Pro delegando tareas de bajo riesgo a modelos gratuitos.
* **Matriz de Enrutamiento Hybrid**:
  * **Análisis y lectura del repositorio**: Se delega a `explore-free` (Modelo Free).
  * **Escritura Backend (`api/*.js`)**: Se delega a `backend-dev` (Modelo Pro).
  * **Edición de Panel Admin (`admin.html`)**: Se delega a `admin-dev` (Modelo Pro).
  * **Carga de Contenido y Seeds**: Se delega a `content-loader-free` (Modelo Free).
  * **Actualización Documental AI-DOS**: Se delega a `docs-keeper-free` (Modelo Free).

---

## 3. LISTADO DETALLADO DE AGENTES PRINCIPALES (`primary`)

Los agentes principales son los puntos de entrada interactivos en una sesión de OpenCode:

| Agente | Esquema | Modelo Asignado | Descripción y Rol en el Sistema |
| :--- | :--- | :--- | :--- |
| **`build`** | Standard / Pro | `opencode-go/deepseek-v4-flash` | Agente principal de desarrollo de alta capacidad. Orquesta subagentes Pro para ejecución de código. |
| **`plan`** | Standard / Pro | `opencode-go/deepseek-v4-flash` | Agente principal de arquitectura y diseño. Crea planes detallados en `TASKS.md` antes de editar código. |
| **`free-build`** | Free | `opencode/big-pickle` | Agente principal interactivo por defecto en `opencode.json`. Ejecuta tareas usando la matriz de subagentes gratuitos. |
| **`free-plan`** | Free | `opencode/big-pickle` | Planificador ligero de costo cero. Diseña la secuencia de trabajo sin consumir APIs comerciales. |
| **`hybrid-build`** | Hybrid | `opencode-go/deepseek-v4-flash` | Orquestador ejecutor inteligente. Evalúa el riesgo del archivo antes de invocar subagentes Pro o Free. |
| **`hybrid-plan`** | Hybrid | `opencode-go/deepseek-v4-flash` | Planificador que combina razonamiento Pro para arquitectura con exploración Free para lectura del repo. |

---

## 4. MATRIZ DETALLADA DE SUBAGENTES Y ESPECIFICACIONES TÉCNICAS

Cada subagente opera en aislamiento mediante un archivo `.md` en `.opencode/agents/` con su propio `system prompt`, modelo y permisos de sistema.

### 1. Panel Admin (`admin-dev` / `admin-dev-free`)
* **Propósito**: Lead Developer exclusivo de `admin.html` (~7.800 líneas) y el formulario público `publicar-lugar.js`.
* **Territorio de Archivos**: `admin.html`, `publicar-lugar.js`.
* **Modelo Pro**: `opencode-go/deepseek-v4-flash` | **Modelo Free**: `opencode/big-pickle`
* **Permisos**: `edit: allow`, `bash: allow`
* **Protocolos Obligatorios**:
  * Edición de `admin.html` **únicamente vía scripts Python con `str.replace()` exacto** (Regla de Oro 2).
  * Verificación obligatoria de balance de `<div` vs `</div>` por categoría (debe ser 0).
  * Registro de campos en el motor genérico `CATEGORY_TAG_FIELDS` / `CATEGORY_TAG_LISTS`.
  * Nombre de funciones dinámicas con prefijo de categoría (ej: `addHostalHabitacion()`, `addLineupRow()`).

### 2. Backend Serverless (`backend-dev` / `backend-dev-free`)
* **Propósito**: Lead Developer de los 8 endpoints serverless en Vercel Hobby y del script frontend del conector.
* **Territorio de Archivos**: `api/*.js` (8 funciones fijas), `index-api-connector.js`.
* **Modelo Pro**: `opencode-go/deepseek-v4-flash` | **Modelo Free**: `opencode/big-pickle`
* **Permisos**: `edit: allow`, `bash: allow`
* **Protocolos Obligatorios**:
  * **ASCII-Safety Estricto**: 0 caracteres > 127, 0 tildes, 0 "ñ", 0 emojis directos, 0 backticks (escapes Unicode `\uXXXX` únicamente).
  * **CommonJS Estricto**: `require`/`module.exports`. Prohibido `import`/`export` y driver `pg` (usar `@neondatabase/serverless`).
  * Presupuesto de 8/8 endpoints: Prohibido crear nuevos archivos en `api/`.
  * **MERGE JSONB**: Actualizaciones de tags mediante `COALESCE(tags,'{}') || $N::jsonb`.
  * Verificación `node --check` antes de entregar.

### 3. Carga de Contenido Dinámico (`content-loader` / `content-loader-free`)
* **Propósito**: Generador de páginas dinámicas de ExploraCO mediante la creación de la trinidad de archivos de la Fase 9.
* **Territorio de Archivos**: `scripts/seed-<slug>.js`, `scripts/load-<slug>-api.js`, `scripts/smoke_test_<slug>.js`.
* **Modelo Pro**: `opencode-go/deepseek-v4-flash` | **Modelo Free**: `opencode/big-pickle`
* **Permisos**: `edit: allow`, `bash: allow`, `webfetch: allow`
* **Protocolos Obligatorios**:
  * Generación idempotente de seeds SQL (`ON CONFLICT slug DO UPDATE`).
  * Validación previa de URLs de imágenes vía HTTP HEAD 200.
  * Smoke test con simulación del motor de render `buildHTML()` en sandbox Node `vm`.
  * Verificación de rating inicial en 0 (hasta reseñas reales).

### 4. Gestor de Base de Datos (`data-migration` / `data-migration-free`)
* **Propósito**: Especialista en migraciones de esquema SQL, limpiezas de datos y seeds masivos en Neon PostgreSQL.
* **Territorio de Archivos**: `db/migrations/*.sql`, `db/cleanups/*.sql`, `scripts/_gen_*.js`.
* **Modelo Pro**: `opencode-go/deepseek-v4-flash` | **Modelo Free**: `opencode/big-pickle`
* **Permisos**: `edit: allow`, `bash: allow`
* **Protocolos Obligatorios**:
  * Trazabilidad SQL versionada (`db/migrations/NNN_descripcion.sql`).
  * Consultas idempotentes (`IF NOT EXISTS`, `ON CONFLICT`).
  * Regla de MERGE JSONB para no sobrescribir estructuras de otras categorías.
  * Escalado obligatorio a `sql-security` para cambios críticos con RLS o autenticación.

### 5. Guardián de la Documentación (`docs-keeper` / `docs-keeper-free`)
* **Propósito**: Documentation Specialist del AI-DOS Core. Mantiene la memoria permanente del proyecto sin depender del chat.
* **Territorio de Archivos**: `exploraco desarrollo/*.md` (`PROJECT`, `NEXT`, `TASKS`, `BLUEPRINT`, `DECISIONS`, `BUGS_HISTORICOS`).
* **Modelo Pro**: `opencode-go/deepseek-v4-flash` | **Modelo Free**: `opencode/big-pickle`
* **Permisos**: `edit: allow`, `bash: allow`
* **Protocolos Obligatorios**:
  * Formato 100% ASCII-safe en la documentación del AI-DOS Core.
  * **Baseline de verdad = Archivo Real del repositorio** (los conteos citados en chat no son hechos).
  * **Cero Borrado Lógico**: No eliminar tareas históricas ni bugs cerrados.
  * Separación estricta de roles: `DECISIONS.md` solo contiene ADRs, nunca tareas.

### 6. Explorador del Repositorio (`explore` / `explore-free`)
* **Propósito**: Agente ultra-rápido especializado en búsquedas masivas de código, greps y análisis de archivos.
* **Territorio de Archivos**: Todo el repositorio (Solo Lectura).
* **Modelo Pro**: `opencode-go/deepseek-v4-flash` | **Modelo Free**: `opencode/big-pickle`
* **Permisos**: Solo lectura (Sin permisos de edición ni terminal).
* **Protocolos Obligatorios**:
  * Minimizar el consumo de tokens devolviendo referencias concisas `ruta:línea`.
  * Prohibida la edición o modificación de cualquier archivo del sistema.

### 7. Arquitecto del Sistema (`architect` / `architect-free`)
* **Propósito**: Chief Architect de ExploraCO. Diseña la estructura global, toma decisiones de ADR y aprueba cambios de infraestructura.
* **Territorio de Archivos**: `exploraco desarrollo/BLUEPRINT.md`, `exploraco desarrollo/DECISIONS.md`.
* **Modelo Pro**: `opencode-go/deepseek-v4-flash` | **Modelo Free**: `opencode/big-pickle`
* **Permisos**: `edit: allow`, `bash: allow`

### 8. Revisor de Arquitectura (`architect-review` / `architect-review-free`)
* **Propósito**: Auditor senior que revisa planes y refactorizaciones propuestas por otros agentes antes de la implementación.
* **Modelo Pro**: `opencode-go/deepseek-v4-flash` | **Modelo Free**: `opencode/big-pickle`

### 9. Auditor de Calidad (`qa-auditor`)
* **Propósito**: Auditor de rendimiento, accesibilidad, seguridad y estándares de la Web Vitals.
* **Modelo Pro**: `opencode-go/deepseek-v4-flash` | **Modelo Free**: `opencode/big-pickle`
* **Permisos**: `edit: deny`, `bash: allow` (Ejecuta tests de verificación pero no edita código directamente).

### 10. Seguridad SQL y RLS (`sql-security` / `sql-security-free`)
* **Propósito**: Especialista de alto nivel para políticas de seguridad RLS, índices pesados y encriptación de claves Bearer.
* **Modelo Pro**: `opencode-go/deepseek-v4-flash` | **Modelo Free**: `opencode/big-pickle`

### 11. Motor de Renderizado HTML (`renderer-dev` / `renderer-dev-free`)
* **Propósito**: Lead Developer de `pagina-destino.js` v9 (motor de concatenación de strings Vanilla JS).
* **Territorio de Archivos**: `api/pagina-destino.js`.
* **Modelo Pro**: `opencode-go/deepseek-v4-flash` | **Modelo Free**: `opencode/big-pickle`

### 12. Desarrollo de UI y Componentes (`frontend-tpl` / `frontend-tpl-free`)
* **Propósito**: Diseñador y desarrollador de layouts HTML/CSS aislados para las 4 categorías (sitio, hostal, comida, evento).
* **Territorio de Archivos**: `public/*.html`, `css/*.css`.
* **Modelo Pro**: `opencode-go/deepseek-v4-flash` | **Modelo Free**: `opencode/big-pickle`

### 13. Aislamiento CSS / JS (`js-silo-dev` / `js-silo-dev-free`)
* **Propósito**: Mantenimiento de la regla de aislación atómica CSS/JS bajo selectores únicos por categoría (`.tpl-pX`, `.cat-sitio`).
* **Modelo Pro**: `opencode-go/deepseek-v4-flash` | **Modelo Free**: `opencode/big-pickle`

### 14. Investigación y Benchmarking (`research-agent` / `research-agent-free`)
* **Propósito**: Investigación de datos geográficos, scraping web y recolección de información para nuevos destinos.
* **Modelo Pro**: `opencode-go/deepseek-v4-flash` | **Modelo Free**: `opencode/big-pickle`

### 15. Optimización SEO (`seo-dev` / `seo-dev-free`)
* **Propósito**: Generación de metas dinámicas, OpenGraph, Schema.org JSON-LD y sitemaps.
* **Modelo Pro**: `opencode-go/deepseek-v4-flash` | **Modelo Free**: `opencode/big-pickle`

### 16. Lector de Multimedia (`media-reader` / `media-reader-free`)
* **Propósito**: Procesamiento de assets visuales, compresión de imágenes y validación de metadatos.
* **Modelo Pro**: `opencode-go/deepseek-v4-flash` | **Modelo Free**: `opencode/big-pickle`

---

## 5. SKILLS Y REGLAS DE NEGOCIO DEL SISTEMA (ESCUEDO GOLD)

Las **Skills** son las reglas operativas transversales que todos los agentes y subagentes deben cumplir sin excepción:

### Skill 1: Escudo GOLD de Verificación Backend
Antes de dar por entregado cualquier archivo en `api/*.js`, el agente debe ejecutar el script de 3 pasos:
1. `node --check api/archivo.js` -> Debe pasar limpio.
2. `python -c "print(len([b for b in open('api/archivo.js','rb').read() if b > 127]))"` -> Debe ser `0`.
3. Cero dobles escapes (`\\uXXXX`) y Cero backticks (`).

### Skill 2: Protocolo de Edición Segura en `admin.html`
Para prevenir la corrupción del HTML masivo (~7.800 líneas):
1. **Nunca usar sed o edicion manual**.
2. Crear un script Python que use `with open('admin.html', 'r')` y reemplace bloques mediante `str.replace()` con anclas únicas.
3. Verificar balance de divs aislantes por categoría.

### Skill 3: Protocolo MERGE JSONB de Postgres
Toda mutación sobre la columna `tags` en Neon PostgreSQL debe seguir la sintaxis de unión idempotente para garantizar **Cero Borrado Lógico**:
```sql
UPDATE destinos 
SET tags = COALESCE(tags, '{}') || $1::jsonb 
WHERE id = $2;
```

---

## 6. CONFIGURACIÓN COMPLETA DE OPENCODE (`opencode.json`)

El archivo base que integra todo este esquema se estructura de la siguiente manera:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "model": "ollama/qwen2.5-coder:7b",
  "small_model": "ollama/qwen2.5-coder:7b",
  "default_agent": "hybrid-build",
  "subagent_depth": 2,
  "permission": {
    "edit": "ask",
    "bash": "ask"
  },
  "compaction": {
    "auto": true,
    "prune": true,
    "reserved": 10000
  },
  "watcher": {
    "ignore": [
      "node_modules/**",
      "dist/**",
      ".git/**",
      "build/**",
      "coverage/**",
      "**/.DS_Store",
      ".opencode/snapshots/**"
    ]
  },
  "formatter": true,
  "lsp": true,
  "provider": {
    "ollama": {
      "npm": "@ai-sdk/openai-compatible",
      "name": "Ollama Local",
      "options": {
        "baseURL": "http://127.0.0.1:11434/v1",
        "apiKey": "ollama",
        "timeout": false,
        "chunkTimeout": false
      },
      "models": {
        "qwen2.5-coder:7b": {
          "name": "qwen2.5-coder:7b",
          "tools": true
        },
        "llama3.1:latest": {
          "name": "llama3.1:latest"
        }
      }
    }
  }
}
```
