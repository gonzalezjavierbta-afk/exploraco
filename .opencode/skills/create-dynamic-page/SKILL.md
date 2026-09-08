---
name: create-dynamic-page
description: >
  Orquesta el flujo completo de creación de una página dinámica de
  ExploraCO: validación, ficha, seed, loader, smoke, Escudo GOLD,
  carga a producción y actualización de docs. Úsalo cuando el usuario
  pida crear una nueva página dinámica de destino.
---

# Create Dynamic Page

Skill que orquesta el flujo completo de creación de páginas dinámicas de ExploraCO.

## Flujo

### 1. Validar
- Verificar que el slug no exista en `/api/destinos` (GET)
- Confirmar categoría válida: sitio, hostal, comida, evento, blog
- Validar datos mínimos según BLUEPRINT.md sección 4

### 2. Ficha
- Priorizar ficha de `gemini-research` si existe (`ficha-<slug>.md` con bloque
  JSON final, validada con `scripts/validate_ficha.js`)
- Si no existe, invocar `research-destination` para generarla
- Verificar que tenga: datos verificados, 5 fotos (HEAD 200), 5 FAQs, coordenadas

### 3. Seed
- Generar `scripts/seed-<slug>.js`
- Upsert SQL idempotente (`ON CONFLICT slug DO UPDATE`)
- Modo `--dry` por defecto
- TAGS según categoría (ver BLUEPRINT.md sección 4)
- ASCII-safe: 0 bytes > 127

### 4. Loader
- Generar `scripts/load-<slug>-api.js`
- DELETE previo + POST a `/api/admin-destinos`
- Bearer `exploraco12345`, URL `https://exploraco.vercel.app`

### 5. Smoke
- Generar `scripts/smoke_test_<slug>.js`
- buildHTML() en sandbox Node vm
- Checks específicos por categoría
- Balance de divs

### 6. Escudo GOLD
Invocar skill `gold-shield` con los 3 archivos:
- `node --check` en cada archivo
- ASCII-safety: 0/0/0
- Smoke test: PASS

### 7. Producción
- Ejecutar loader contra producción
- Verificar HTTP 200 en `/<slug>.html`
- Verificar en `/api/destinos?categoria=<cat>`
- Verificar en sitemap.xml

### 8. Docs
- Crear entrada en TASKS.md con ID único
- Actualizar NEXT.md con "Que sigue"
- Registrar evidencia física de éxito

## Categorías y sus tags

| Categoría | Tags principales |
|-----------|------------------|
| Sitio | entradas[], tours[], checklist[], itinerario[], fauna[], secretos[], regulaciones[] |
| Hostal | habitaciones[], amenidades[], actividades[], transporte[], eventos_hostal[] |
| Comida | menu_destacado[], horario_detallado, opciones_dieta[], domicilio |
| Evento | fecha_inicio, fecha_fin, edicion, sede, lineup[], agenda[], categorias_entrada[] |
| Blog | temas[], video_url, id_autor |

## Reglas críticas

- **ASCII-safe (ADR-002):** 0 caracteres > 127 en JS
- **Idempotencia:** ON CONFLICT en seed, DELETE+POST en loader
- **Fotos verificadas (BUG-022):** HEAD 200 antes de usar
- **Rating 0 (ADR-009):** nunca hardcodear rating
- **Destacado editorial:** `destacado=true` para páginas nuevas

## Uso

```
Usuario: "Crear página para el Museo Nacional de Bogotá"
→ content-loader invoca este skill
→ Flujo completo automático
```

O invocado directamente:
```
/create-dynamic-page museo-nacional sitio
```