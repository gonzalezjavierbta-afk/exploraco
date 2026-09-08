---
name: gemini-research
description: >
  Workflow de creacion de entradas de directorio de ExploraCO con
  investigacion hecha en Google Gemini (externo). Orquesta la ingesta
  y validacion de la ficha .md que produce Gemini (hostal, comida, sitio,
  evento), la resolucion y verificacion de fotos en Wikimedia Commons
  (HEAD 200, BUG-022), y el handoff al pipeline create-dynamic-page
  (seed + loader + smoke + Escudo GOLD + produccion + docs).
---

# Gemini Research (Ingesta de fichas investigadas con Gemini)

## Contexto

ExploraCO arma cada entrada de directorio con 4 bloques de datos exactos:
`BASE` (26 columnas de `destinos`), `TAGS` (JSONB por categoria),
`FAQS` (5 en `destinos_detalles`) y `FOTOS_SUGERIDAS` (hero + galeria, la
primera es hero). La investigacion web corre en **Google Gemini** (externo,
no consume cuota de opencode) usando el prompt maestro
`prompts/GEMINI_MASTER_PROMPT.md`. Este skill recoge el resultado, lo
valida y lo entrega al pipeline estandar.

## Flujo

### FASE A — Investigacion en Gemini (externa, manual)

1. Pedir al usuario la entrada: `ITEM`, `CATEGORIA (hostal|comida|sitio|evento)`,
   `CIUDAD`, `REGION` y observaciones.
2. Pasar `prompts/GEMINI_MASTER_PROMPT.md` al usuario para que lo pegue en
   Gemini (o leerlo y copiarle la seccion `## 2. Entrada a investigar` con
   los datos).
3. Regla de formato: `ficha_template.md`. Gemini devuelve UNA ficha .md con
   ficha humana + **un unico** bloque ```json ``` final.
4. El usuario guarda el resultado en `exploraco desarrollo/ficha-<slug>.md`.

### FASE B — Ingesta y validacion (en opencode, `/gemini-research <slug>`)

1. **Validar contrato**: ejecutar
   `node .opencode/skills/gemini-research/scripts/validate_ficha.js "exploraco desarrollo/ficha-<slug>.md"`.
   Debe salir `PASS`. Si `FAIL`, devolver cada error a correction sobre la
   ficha (no inventar datos).
2. **Slug unico**: verificar que `GET /api/destinos?slug=<slug>` no exista
   (o confirmar UPDATE si es una actualizacion editorial).
3. **Fotos**: para cada `FOTOS_SUGERIDAS`:
   - Resolver la URL real de thumbnail de Wikimedia Commons via la API:
     `https://commons.wikimedia.org/w/api.php?action=query&titles=<nombre>&prop=imageinfo&iiprop=url&iiurlwidth=960&format=json`
   - Verificar `HEAD 200` de la `thumburl` (Node fetch). Si falla, probar el
     siguiente `nombres_archivo_wikimedia`; si todos fallan, buscar por
     `tema` y descartar la foto (nunca sembrar URL rota, BUG-022).
   - Marcar la primera (`es_hero=true`) como `foto_hero`.
4. **Coordenadas**: confirmar que no son 0,0. Opcional: validar con
   Nominatim (`https://nominatim.openstreetmap.org/search?q=<nombre>,<ciudad>&format=json`).
5. **Handoff**: invocar el skill `create-dynamic-page` con `<slug>`.

> El content-loader/seed hace: escape ASCII (`\uXXXX`, ADR-002),
> `JSON.stringify` de `fauna_flora`/`secretos` (sitio), emoji/iconos como
> escapes, y `ON CONFLICT slug` en el upsert.

## Archivos del skill

| Archivo | Proposito |
|---|---|
| `prompts/GEMINI_MASTER_PROMPT.md` | Prompt maestro para pegar en Gemini (Fase A) |
| `prompts/ficha_template.md` | Formato de ficha + ejemplo del bloque JSON |
| `scripts/validate_ficha.js` | Validador del bloque JSON (Fase B paso 1) |

## Reglas criticas

- **Fotos verificadas (BUG-022)**: resolver URL real y validar HEAD 200
  antes de sembrar. Nunca confiar en URLs que entrega Gemini.
- **Coordenadas reales**: nunca 0,0; revisar con Nominatim si hay duda.
- **Sin rating inventado (ADR-009)**: el bloque JSON no debe traer campos de
  rating. Si Gemini los incluye, quitarlos en la ingesta.
- **ASCII-safe en seed (ADR-002)**: la ficha puede tener UTF-8 limpio; el
  escape `\uXXXX` aplica solo a los archivos JS del seed (admin-delivered).
- **Cero duplicidad**: no crear segundas querys ni campos paralelos; se
  reutiliza el pipeline de `create-dynamic-page`.

## Uso

```
Usuario: "Investigar Candelario, La Candelaria, comida"
→ Fase A: entregar GEMINI_MASTER_PROMPT.md al usuario (o copiarle la seccion 2)
→ Fase B: /gemini-research candelario
```

O en modo lote: invocar este skill una vez por item y luego
`batch-create` para el pipeline de produccion.