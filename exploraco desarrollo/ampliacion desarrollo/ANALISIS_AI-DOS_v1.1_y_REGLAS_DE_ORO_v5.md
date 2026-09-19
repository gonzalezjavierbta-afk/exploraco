# Analisis AI-DOS v1.1 y Reglas de Oro v5 frente a la experiencia real

- **Fecha:** 2026-09-19
- **Autor:** agente de implementacion (sesion xpress), por encargo del operador
- **Insumos analizados:**
  - `AI-DOS Master Specification v1.1.docx` (raiz; 13 capitulos; creado 2026-07-24)
  - `exploraco desarrollo/Reglas de Oro ExploraCO - v5.md` (10 puntos)
  - Evidencia real: historial git, informes de cuota (`informes-cuota/`), `AGENTS.md`,
    skills (`.opencode/skills/`), bugs y sesiones de trabajo de esta etapa.
- **Objetivo:** convertir la experiencia real en propuestas concretas para modificar y
  mejorar ambos documentos, priorizando velocidad, eficiencia y menor consumo de recursos.
- **Formato:** ASCII-safe (sin tildes ni emojis) por convencion de los docs del proyecto.

---

## 1. Metodo

No se opina por intuicion: cada hallazgo se ancla a evidencia verificable del repositorio
o de las sesiones. La evidencia se clasifica en tres tipos:

- **E1 - Codigo/archivo:** un hecho comprobable con `grep`/`git` (rutas, tamanos, commits).
- **E2 - Incidente:** un bug real observado y corregido (con su causa raiz).
- **E3 - Costo:** datos de consumo real (`informes-cuota/*.md`).

La regla del propio AI-DOS (Cap. 1.8: "ningun componente se considera definitivo hasta
validarse en un proyecto real") es la que habilita este documento: ExploraCO es el proyecto
real que valida (o refuta) el framework.

---

## 2. Evidencia real recolectada

### 2.1 Tamano de los documentos del AI-DOS Core (E1)

| Documento | Tamano | Observacion |
|---|---:|---|
| `DECISIONS.md` | 366 KB | Registro ADR completo, sin indice resumido |
| `TASKS.md` | 388 KB | Tablero + historico de cierres mezclados |
| `NEXT.md` | 329 KB | Deberia ser un relevo corto; es un log completo |
| `BUGS_HISTORICOS.md` | 150 KB | Bajo demanda, pero crece sin corte |
| `BLUEPRINT.md` | 65 KB | Referencia tecnica |
| `PROJECT.md` | 39 KB | Entrada del sistema |

**Hallazgo:** ~1.28 MB de documentacion obligatoria. AI-DOS pide leer PROJECT -> NEXT ->
TASKS -> BLUEPRINT -> DECISIONS en cada handoff; ahi se va gran parte del presupuesto de
contexto antes de escribir una sola linea. `NEXT.md` contradice su definicion (Cap. 9.4:
"resume el estado del proyecto").

### 2.2 Costos reales (E3)

- `informes-cuota/cuota-2026-09-14-dia.md`: costo total **$0.7643**; 25 sesiones.
  - **docs-keeper (pago): $0.3743 en 214 invocaciones = 49% del gasto del dia.**
  - explore (pago): $0.1437. build/plan: $0.172.
  - Ruta gratuita (`big-pickle`): 13 sesiones con **$0.0000**.
- `informes-cuota/cuota-2026-09-12-dia.md`: costo total **$4.9937** en un dia.

**Hallazgo:** el mayor costo no es el codigo, es la **documentacion delegada a modelo pago**
y la exploracion. La ruta gratuita ya demostro ahorro total; el AI-DOS no la conoce.

### 2.3 Incidentes reales de la etapa (E2)

| # | Incidente | Causa raiz | Regla que lo habria prevenido |
|---|---|---|---|
| I1 | `mis_guardados_media` devolvia `[]` siempre | joins `uuid = text` (migracion 023) y `.catch(function(){ return []; })` que silenciaba el error | No-catch-silencioso + verificacion de tipos de esquema |
| I2 | Filtros de categoria del mapa personal "muertos" | `categories: 'mm-personal-cats'` se interpreto como selector de etiqueta (faltaba `#`); el motor no enganchaba nada | Verificacion de wiring en runtime + guarda de regresion |
| I3 | El fix no se veia en el navegador | `mapa-cultural.js` / `mymapa.js` se cargaban sin version (cache del navegador) | Cache-busting de assets compartidos |
| I4 | Media del mapa no pintaba al abrir | `renderMedia()` filtra por `map.getBounds()`; contenedor con tamano 0 y sin re-render tras `invalidateSize()` | Re-render explicito tras cambios de layout |
| I5 | Fotos de otros lugares en el drawer de R10 | `mediasCercanas()` usaba ciudad/radio 10 km | Regla de pertenencia (solo medios del espacio) |
| I6 | Videos desaparecieron del mapa | se restringio la media a `destino`/`destino_album` y los videos son `origen='album'` | Analisis de impacto antes de un filtro global |
| I7 | Regresion del hero (2 iteraciones) | la regla de producto no estaba fijada: quien es la principal, que fuente y en que orden | Definicion de contrato de datos/UX antes de implementar |
| I8 | Retrabajo por alcance | se pidio "xpress" pero el cambio toco backend + motor compartido + varios frontends (>3 criticos) | Gate de escalamiento obligatorio |

### 2.4 Practicas que ya funcionan (E1/E2)

- **Ruteo por costo con doble ruta** (`free`/`pago`) definido en `AGENTS.md`: efectivo.
- **Regla de No-Duplicidad** (tripwire 5 lineas): evito copias y forzo abstracciones.
- **Escudo GOLD** (`node --check`, ASCII, balance de divs): detecta regresiones de sintaxis.
- **ADR-006 / Regla 8** (verificar el archivo real): evito asumir contenido.
- **Preguntas al cierre** (Regla 10): resolvio ambiguedades de producto antes de codificar.
- **Smokes versionados** (`scripts/smoke_*.js`): red de seguridad barata y reutilizable.

---

## 3. Diagnostico del AI-DOS v1.1

### 3.1 Fortalezas a preservar

1. Separacion Kernel / Knowledge / Decision / Execution / Integration / Delivery (Cap. 3).
2. "El conocimiento pertenece al proyecto", no a la conversacion (Cap. 1.5).
3. Independencia de proveedor por **capacidades** (Cap. 3.10, 4.2) - vision correcta.
4. Ciclo documental y criterios de cierre de Sprint (Cap. 9.9, 10.17).
5. Sistema de metricas y calibracion por evidencia (Cap. 11).

### 3.2 Brechas (gaps) con evidencia

| # | Brecha | Evidencia | Impacto |
|---|---|---|---|
| G1 | **No existe registro de implementacion/proveedor real.** El doc nombra Claude/Gemini/ChatGPT y un piloto "Sistema QR Hostal Terraza", pero la operacion real es OpenCode con subagentes y modelos free/pago. | I1-I8; `AGENTS.md`; `.opencode/agent/*` | El Cap. 4 (roles) y 12 (piloto) quedan desalineados del uso real |
| G2 | **No hay gobernanza de costo.** No define ruta gratuita primero, presupuesto por tarea ni medicion por subagente. | E3: docs-keeper pago = 49% del dia | Gasto evitable |
| G3 | **No hay regla de "fallo silencioso".** El Cap. 8 (integracion) valida consistencia pero no exige log ni guarda ante errores tragados. | I1 | Bugs que pasan QA estatico |
| G4 | **No exige verificacion de wiring en runtime.** "El codigo funciona" no distingue "opcion pasada" de "opcion enganchada". | I2 | UI inerte en produccion |
| G5 | **No cubre versionado de assets/cache-busting.** La Delivery Layer no menciona cache. | I3 | El fix no llega al usuario |
| G6 | **No cubre re-render tras cambios de layout** (mapas, tabs, contenedores ocultos). | I4 | Contenido "no carga" hasta interaccion |
| G7 | **No exige contrato de datos/UX antes de implementar** (fuente, orden, pertenencia). | I5, I6, I7 | Retrabajo por reglas de producto ambiguas |
| G8 | **No hay gate de escalamiento automatico por alcance.** El Cap. 6.7 es cualitativo. | I8 | Se usa "express" fuera de su alcance |
| G9 | **No hay limites de tamano ni indice para los documentos.** El Cap. 9 premia modularidad pero no acota. | 2.1 (1.28 MB) | Costo de contexto en cada handoff |
| G10 | **No distingue modo Plan vs Build** ni el gating de permisos de edicion. | estancamiento en modo Plan de esta sesion | Friccion operativa |
| G11 | **No hay regla de "fuente unica de datos derivados".** | ranking del hero/galeria duplicado (refactor a `mediaRank`) | Divergencia y doble mantenimiento |
| G12 | **Metricas manuales.** Cap. 11 pide medir, pero ya existe `scripts/informe-cuota.js` que las genera de `opencode.db`. | E3 | Se mide a mano lo que ya es automatico |

---

## 4. Diagnostico de las Reglas de Oro v5

### 4.1 Puntos vigentes (mantener)

- **P1 ASCII-safe** (0 bytes >127, escapes simples, doble escape = bug): confirmado por QA.
- **P3 Cero Borrado Logico / merge JSONB**: sigue siendo correcto.
- **P4 CSS scoped con Reset de Silo**: correcto.
- **P7 SVG integro + tipografia estricta**: correcto.
- **P8 Archivo real como fuente de verdad**: el mas valioso (equivale a ADR-006).
- **P10 Preguntas al cierre**: confirmado util.

### 4.2 Puntos obsoletos o ambiguos (corregir)

- **P2 "Edicion estructural via Python `str.replace()`":** obsoleto. El flujo real usa
  herramientas de edicion con ancla exacta y subagentes por dominio. Lo que importa no es
  Python, sino: ancla exacta, cambio quirurgico y validacion de balance. (Evidencia: esta
  sesion edito `api/*.js`, `mapa-cultural.js`, HTMLs con edicion por ancla, sin Python.)
- **P5 `onclick` fisico obligatorio:** vigente para el server-side, pero debe aclararse que
  no aplica a modulos que ya usan `addEventListener` (mapa, media-actions).
- **P6 "5 latidos GOLD" (INFO/DEBUG/LINK/TRACE/TIME):** no es verificable ni esta
  implementado como gate real. En la practica el gate es `node --check` + ASCII + balance de
  divs + smokes. Hay que redefinirlo operativamente o degradarlo a legado.
- **P9 "entregar bloque con 3 lineas de contexto y numero de linea":** nacio para chat
  manual; hoy se reemplaza por el **brief quirurgico de subagente** (ruta + linea + old/new).

### 4.3 Reglas faltantes (descubiertas por incidentes reales)

- **No-catch-silencioso:** todo `catch` debe registrar causa (log/warn tipado) y nunca
  devolver `[]`/`null` sin traza. (I1)
- **Verificacion de wiring en runtime:** una opcion/atributo no se considera integrado
  hasta que un smoke o runtime demuestre el efecto. (I2)
- **Cache-busting:** todo JS/CSS compartido consumido por HTML debe versionarse al cambiarlo
  (ej. `archivo.js?v=N`). (I3)
- **Re-render tras layout:** mapas/tabs/contenedores ocultos deben re-renderizar tras
  `invalidateSize()`/cambio de visibilidad. (I4)
- **Contrato de datos/UX previo:** antes de un filtro/orden, definir fuente, pertenencia y
  criterio de orden, y dejar su guarda. (I5, I6, I7)
- **Gate de alcance:** si toca >3 archivos criticos, un motor compartido, esquema/RLS o
  migraciones, **se escala a modo normal** (no express). (I8)
- **Fuente unica de datos derivados:** no recalcular el mismo ranking/derivado en dos
  secciones; extraer una funcion/estructura unica. (G11)
- **Guarda de regresion por bug:** todo bug corregido debe dejar un check en un smoke. (I1-I7)
- **Presupuesto de contexto/costo:** ruta gratuita por defecto; docs con indice y limite;
  no delegar documentacion masiva a modelo pago. (E3)

---

## 5. Catalogo de lecciones aprendidas

1. **La ambiguedad de producto es la causa #1 de retrabajo**, no la dificultad tecnica
   (I5, I6, I7). Fijar el contrato antes de codificar.
2. **Los fallos silenciosos son los mas caros:** pasan sintaxis, ASCII y divs, y sobreviven
   a QA estatico (I1, I2). Hay que forzar log + guarda.
3. **"Corregido en el repo" no es "corregido para el usuario"** si el asset esta cacheado
   (I3). El deploy incluye invalidacion.
4. **Los filtros globales rompen features no relacionadas** (I6). Analizar consumidores
   antes de restringir.
5. **Los motores compartidos exigen modo normal**, no express (I8). Un cambio en el motor
   afecta a todos los consumidores.
6. **La documentacion sin indice es deuda de contexto** (2.1). `NEXT.md` debe ser corto.
7. **El costo se concentra en documentacion y exploracion pagas** (E3), no en el codigo.
8. **El propio framework pide evidencia (Cap. 1.8/11) y esta ya existe** (informes de cuota,
   smokes, historial git): solo falta conectarla.
9. **La doble ruta free/pago funciona**; debe ser una regla del framework, no una practica
   tribal de `AGENTS.md`.
10. **Cada regla debe ser verificable por maquina** o se convierte en letra muerta (P6).

---

## 6. Propuestas concretas

### 6.1 Para AI-DOS v1.2 (por capitulo)

| Cap. | Cambio propuesto |
|---|---|
| 1.8 | Anadir: "toda mejora del framework debe citar el ID del incidente/bug real que la origina". |
| 3.8 (Delivery) | Incluir **Versionado de Assets / cache-busting** y **Checklist de deploy** como parte de la entrega. |
| 3 (nuevo 3.12) | **Propiedad de Artefacto Compartido:** quien es dueno de un motor compartido y cuando un cambio deja de ser "express". |
| 4 (nuevo 4.9) | **Registro de Implementacion:** tabla capacidad -> agente -> modelo -> ruta (free/pago) -> costo. Reemplaza la lista fija Claude/Gemini/ChatGPT. |
| 6.7 | **Gate de Escalamiento cuantitativo:** >3 archivos criticos, motor compartido, esquema/RLS, migraciones o >10 archivos totales => modo normal obligatorio. |
| 6 (nuevo 6.13) | **Presupuesto de Costo:** ruta gratuita por defecto; tope por tarea/sesion; registrar costo real. |
| 7 (nuevo 7.11) | **Presupuesto de Contexto:** cada doc con indice y limite de tamano; `NEXT.md` corto (relevo), historico en archivo aparte. |
| 8.6 | Anadir al checklist: "cero fallos silenciosos", "wiring verificado en runtime", "guarda de regresion creada". |
| 8 (nuevo 8.13) | **Protocolo de Fallo Silencioso:** prohibido catch sin log; prohibido degradar a vacio sin traza. |
| 9 (nuevo 9.13) | **Higiene documental:** separar `NEXT.md` (corto) de `CHANGELOG/HISTORY`; ADRs con indice; `BUGS` con corte por version. |
| 11 | **Metricas automaticas:** adoptar `scripts/informe-cuota.js` como fuente oficial (costo por subagente, retrabajo, handoffs). |
| 12 | **Reemplazar el piloto QR por el piloto real (ExploraCO)** o declarar QR como historico; documentar agentes/modelos reales. |
| 13 | Incorporar al roadmap 1.x los gates de costo, contexto y fallo silencioso como prerequisito de 2.0. |

### 6.2 Para Reglas de Oro v6 (texto propuesto)

Mantener P1, P3, P4, P7, P8, P10. Reescribir/anadir:

- **P2 (reescrita):** "Edicion quirurgica con ancla exacta. Toda modificacion en archivos
  grandes (HTML/JS) debe indicar ancla (ruta:linea) y bloque old/new. Prohibido editar a
  ciegas o con scripts destructivos sin ancla. Validar balance de divs y llaves antes de
  entregar."
- **P5 (aclaracion):** "Interactividad fisica via `onclick` en el HTML generado por el
  servidor; los modulos con `addEventListener` se mantienen y deben verificar su wiring."
- **P6 (redefinida):** "Escudo GOLD verificable por maquina: `node --check`, ASCII-safety,
  balance de divs, grep de residuos y smokes del area. Los 5 latidos de consola pasan a
  legado opcional."
- **P9 (reescrita):** "Brief quirurgico de subagente: ruta + linea + old/new + verificacion
  esperada + dependencias."
- **P11 (nueva) No-catch-silencioso:** todo error se registra con contexto; nunca se
  degrada a vacio sin traza.
- **P12 (nueva) Wiring verificado:** una opcion/atributo no esta integrado hasta que un
  smoke/runtime demuestra el efecto.
- **P13 (nueva) Cache-busting:** al cambiar un asset compartido, versionar su referencia en
  los HTML consumidores.
- **P14 (nueva) Re-render tras layout:** mapas/tabs/contenedores ocultos re-renderizan tras
  `invalidateSize()` o cambio de visibilidad.
- **P15 (nueva) Contrato previo:** antes de filtrar/ordenar, fijar fuente, pertenencia y
  criterio, y dejar guarda de regresion.
- **P16 (nueva) Gate de alcance:** >3 archivos criticos o motor compartido/esquema/RLS =>
  modo normal, no express.
- **P17 (nueva) Fuente unica de datos derivados:** prohibido recalcular el mismo derivado en
  dos lugares; extraer una funcion unica.
- **P18 (nueva) Guarda por bug:** todo bug corregido deja un check en un smoke.
- **P19 (nueva) Costo/contexto:** ruta gratuita por defecto; docs con indice y tope; no
  delegar documentacion masiva a modelo pago.

---

## 7. Impacto esperado (por que esto ahorra recursos)

- **Menos retrabajo:** fijar el contrato de datos/UX y el gate de alcance evita iteraciones
  como I5-I7 (cada una costo una ronda completa de implementacion + QA).
- **Menos bugs costosos:** no-catch-silencioso + wiring runtime + guarda por bug atacan
  exactamente los incidentes que pasaron QA estatico (I1, I2).
- **Menos gasto directo:** mover documentacion a ruta gratuita y acotar el contexto
  ataca el 49% de gasto concentrado en `docs-keeper` pago (E3) y los 1.28 MB de docs.
- **Menos friccion:** documentar modo Plan/Build y el handoff explicito evita estancamientos.
- **Metricas sin costo extra:** el sistema ya existe (`informe-cuota.js`); solo se formaliza.

---

## 8. Plan de adopcion sugerido (xpress)

1. **Corto plazo (sin costo):** agregar P11-P19 a las Reglas de Oro (v6) y los gates al
   `AGENTS.md`; no requiere codigo.
2. **Mediano plazo:** partir `NEXT.md` en `NEXT.md` (corto) + `NEXT_HISTORY.md`; agregar
   indice a `DECISIONS.md`/`TASKS.md`.
3. **Mediano plazo:** conectar `informe-cuota.js` como fuente de metricas (Cap. 11).
4. **Estructural:** publicar AI-DOS v1.2 con el Registro de Implementacion (Cap. 4.9) y el
   piloto real (ExploraCO).

---

## 9. Anexo: matriz incidente -> regla -> verificacion

| Incidente | Regla nueva | Verificacion automatica |
|---|---|---|
| I1 catch silencioso / uuid=text | P11, Cap. 8.13 | check estatico de casts + catch con log |
| I2 selector/wiring | P12 | smoke de wiring (DOM simulado) |
| I3 cache | P13 | grep de version en `<script src>` |
| I4 bounds/layout | P14 | smoke de render tras `invalidateSize` |
| I5 pertenencia media | P15 | smoke de filtro por slug |
| I6 filtro global rompe videos | P15, Cap. 3.12 | smoke de tipos de media |
| I7 contrato hero | P15 | smoke de orden/fuente del hero |
| I8 alcance | P16 | conteo de archivos criticos antes de delegar |

---

## 10. Cierre

Los dos documentos tienen una base solida (gobernanza por capacidades, evidencia y
documentacion viva). Su brecha no es conceptual sino **operativa**: no incorporan todavia
lo que la practica real demostro que falla (fallos silenciosos, wiring, cache, alcance,
costo y tamano documental). La propuesta es acotada, verificable por maquina y de bajo
costo: anadir gates y reglas, conectar las metricas que ya existen y reducir el contexto
obligatorio. Con eso, el framework se acerca a su propio principio: aprender de cada
proyecto real para trabajar mas rapido, con menos errores y menos recursos.
