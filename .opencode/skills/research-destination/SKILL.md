---
name: research-destination
description: >
  Investiga un destino turístico de Colombia en múltiples fuentes
  web y genera una ficha .md estructurada con datos verificados.
  Úsalo cuando necesites recopilar datos de un nuevo destino para
  crear su página dinámica.
---

# Research Destination

Investiga un destino turístico de Colombia y genera ficha verificada.

## Flujo

### 1. Fuentes primarias
Investigar en este orden:
1. **Web oficial** del destino (si existe)
2. **TripAdvisor** - rating, reviews, fotos
3. **Booking/Hostelworld** - precios, disponibilidad (hostales)
4. **Google Maps** - horarios, coordenadas exactas, fotos
5. **Fuentes gubernamentales** - datos oficiales (museos, parques)
6. **Wikimedia Commons** - fotos libres verificables

### 2. Verificación de datos
- **Coordenadas:** verificar con Nominatim/OSM (nunca usar 0,0)
- **Fotos:** buscar en Wikimedia Commons, verificar HEAD 200 antes de usar
- **Datos cruzados:** mínimo 2 fuentes para información clave
- **Horarios/precios:** verificar vigencia 2026

### 3. Estructura por categoría

#### Sitio turístico
```
entradas[]     → {nombre, precio, horario}
tours[]        → {nombre, duracion, precio}
checklist[]    → items obligatorios/recomendados
itinerario[]   → plan sugerido por dia
fauna[]        → especies avistables
secretos[]     → datos curiosos
regulaciones[] → reglas del lugar
```

#### Hostal
```
habitaciones[]    → {tipo, precio, capacidad, badge}
amenidades[]      → servicios incluidos
actividades[]     → que hacer
transporte[]      → como llegar
eventos_hostal[]  → agenda semanal
```

#### Comida
```
menu_destacado[]   → platos principales
horario_detallado  → horarios por dia
opciones_dieta[]   → vegano, sin gluten, etc.
domicilio          → servicio a domicilio: si/no/app
```

#### Evento
```
fecha_inicio       → YYYY-MM-DD
fecha_fin          → YYYY-MM-DD
edicion            → numero de edicion
sede               → lugar del evento
lineup[]           → artistas/ponentes
agenda[]           → cronograma por dia
categorias_entrada[] → tipos de boleta
que_llevar[]       → que llevar
prohibido[]        → que no permitir
```

### 4. Generar ficha .md
Crear archivo en `exploraco desarrollo/ficha-<slug>.md` con:
- Datos verificados (citar fuentes)
- 5 fotos (URLs Wikimedia verificadas HEAD 200)
- 5 FAQs (preguntas frecuentes reales)
- Coordenadas verificadas en Nominatim

### 5. Entregar a content-loader
- Datos estructurados en formato JSON
- Ficha .md como referencia
- Fuentes citadas para trazabilidad

## Ejemplo de entrega

```json
{
  "slug": "museo-nacional",
  "categoria": "sitio",
  "nombre": "Museo Nacional de Colombia",
  "ciudad": "Bogota",
  "departamento": "Cundinamarca",
  "lat": 4.6158,
  "lng": -74.0703,
  "descripcion": "...",
  "tags": {
    "entradas": [...],
    "tours": [...],
    "checklist": [...],
    "itinerario": [...],
    "secretos": [...],
    "regulaciones": [...]
  },
  "fotos": ["url1", "url2", "url3", "url4", "url5"],
  "faqs": [...]
}
```

## Reglas críticas

- **Fotos verificadas (BUG-022):** HEAD 200 antes de incluir URL
- **Coordenadas reales:** nunca usar 0,0 o coordenadas genéricas
- **ASCII-safe:** escapar tildes en JSON con \uXXXX
- **Rating 0 (ADR-009):** no inventar ratings, dejar en 0
- **Fuentes citadas:** cada dato clave debe tener fuente

## Uso

Invocado automáticamente desde `create-dynamic-page` cuando no existe ficha.

O invocado directamente:
```
/research-destination "Museo Nacional de Colombia" Bogota sitio
```