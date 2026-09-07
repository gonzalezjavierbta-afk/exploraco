---
name: batch-create
description: >
  Ejecuta operaciones en lote: múltiples páginas dinámicas,
  verificaciones masivas o seeds grupales. Úsalo cuando necesites
  crear varias páginas dinámicas a la vez para optimizar el uso
  de la cuota.
---

# Batch Create

Ejecuta operaciones en lote para optimizar el uso de la cuota del plan Go.

## Flujo

### 1. Planificación
- Validar unicidad de slugs (no colisionar entre sí ni con existentes)
- Estimar uso de cuota:
  - Research: Grok 4.6 (1,350 req/5h) × N destinos
  - Content Loader: Qwen3.7 Plus (4,300 req/5h) × N destinos
  - Gold Shield: DeepSeek V4 Flash (11,400 req/5h) × N destinos
- Ordenar por prioridad (ciudad, categoría, urgencia)

### 2. Ejecución paralela
Para cada destino en el lote:
1. Invocar `research-destination` para generar ficha
2. Invocar `create-dynamic-page` para crear y cargar
3. Monitorear progreso (éxito/fallo por destino)
4. Manejar errores:
   - Retry automático en fallos de red
   - Rollback manual si falla verificación crítica

### 3. Consolidación
- Un solo reporte de resultados
- Una sola actualización de TASKS.md/NEXT.md
- Estadísticas: N éxitos, M fallos, K pendientes

## Ejemplo de uso

```
Usuario: "Crear los 10 mejores hostales de Medellín"
→ batch-create invoca:
  1. research-destination × 10 (paralelo)
  2. create-dynamic-page × 10 (secuencial)
  3. Reporte consolidado
```

## Optimización de cuota

| Operación | Modelo | Límite/5h | Estrategia |
|-----------|--------|-----------|------------|
| Research | Grok 4.6 | 1,350 | Máx 27 destinos/lote |
| Content Loader | Qwen3.7 Plus | 4,300 | Máx 86 destinos/lote |
| Gold Shield | DeepSeek V4 Flash | 11,400 | Máx 228 destinos/lote |

**Lote recomendado:** 10-15 destinos por sesión para no agotar cuota.

## Reporte de resultados

```
## Batch Create - [fecha]

| # | Slug | Categoría | Estado | Evidencia |
|---|------|-----------|--------|-----------|
| 1 | hostal-1 | hostal | ✅ OK | /hostal-1.html 200 |
| 2 | hostal-2 | hostal | ✅ OK | /hostal-2.html 200 |
| 3 | hostal-3 | hostal | ❌ FAIL | Smoke test FAIL |

**Resumen:** 9/10 éxitos, 1 fallo
**Cuota usada:** ~150 requests (3% del límite)
```

## Uso

```
/batch-create [
  {slug: "hostal-1", cat: "hostal"},
  {slug: "hostal-2", cat: "hostal"},
  {slug: "hostal-3", cat: "hostal"}
]
```

O invocado automáticamente cuando el usuario pide crear múltiples destinos.