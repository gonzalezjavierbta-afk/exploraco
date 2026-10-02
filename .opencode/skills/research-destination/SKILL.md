---
name: research-destination
description: Valida la ficha .md que devuelve Gemini para un destino: contrato con validate_ficha.js, coordenadas reales y fotos con curl -I (HEAD 200).
---

# Research Destination (VALIDADOR de ficha, no investigador)

Skill de **validacion** de la ficha .md que Gemini devuelve para un destino.
NO investiga en la web: bajo R3 (ADR-067), la investigacion web la hace
**Google Gemini** a partir del prompt que el agente entrega en el chat.
Este skill valida y verifica el resultado antes del handoff.

## Rol y limites (R3)

- **NO busca por su cuenta** en webs, TripAdvisor, Booking, Hostelworld,
  Google Maps ni redes sociales. Eso ya lo hizo Gemini.
- **NO usa `webfetch` para investigar.** El unico acceso web permitido es la
  **verificacion puntual de UN hecho con `curl -I`** (foto) o, si hay duda de
  coordenadas, una consulta puntual de geocodificacion. Nada de bucles.
- **NO llama a ninguna API de Gemini** ni ejecuta scripts con API key.

## Flujo

### 1. Recibir la ficha
La ficha llega en `exploraco desarrollo/ficha-<slug>.md` (la produce Gemini,
prompt base en `.opencode/prompts/GEMINI_MASTER_PROMPT.md`).

### 2. Validar el contrato JSON
```
node scripts/validate_ficha.js "exploraco desarrollo/ficha-<slug>.md"
```
Debe salir `PASS`. Si `FAIL`, devolver cada error a correccion sobre la ficha
(no inventar datos). El validador exige: claves `BASE`, `TAGS`, `FAQS`,
`FOTOS_SUGERIDAS`, `FUENTES`; minimo 5 FAQs; minimo 5 fotos sugeridas con
exactamente 1 `es_hero`; coordenadas distintas de 0,0; sin campo `rating`.

### 3. Verificar las fotos (BUG-022)
Para cada bloque de `FOTOS_SUGERIDAS`:

1. Resolver la URL real de thumbnail de Wikimedia Commons con la API:
   `https://commons.wikimedia.org/w/api.php?action=query&titles=<File:...>&prop=imageinfo&iiprop=url&iiurlwidth=960&format=json`
2. Verificar con `curl -I` (HEAD) siguiendo redirecciones (`-L`) y exigir
   **HTTP 200 en el destino final**:
   ```
   curl -I -L -s -o NUL -w "%{http_code} %{url_effective}\n" "<thumburl>"
   ```
   Un `404` o una redireccion que no termine en `200` NO sirven; probar el
   siguiente `nombres_archivo_wikimedia`. Si todos fallan, descartar la foto
   (nunca sembrar URL rota).
3. La foto con `es_hero=true` se mapea a `foto_hero`.

### 4. Verificacion puntual de UN hecho (opcional)
- **Coordenadas:** confirmar que no son 0,0. Si hay duda, UN solo `curl -I`
  contra Nominatim para el nombre+ciudad.
- **Fuentes:** comprobar que cada entrada de `FUENTES` trae `url` y
  `que_respalda`. No abrir todas las URLs: es una verificacion de forma, no
  una re-investigacion.

### 5. Handoff
Entregar la ficha validada a `create-dynamic-page` (seed + loader + smoke +
Escudo GOLD). La validacion no reescribe datos: solo aprueba o devuelve a
correccion.

## Estructura TAGS por categoria (lo que Gemini debe haber llenado)

| Categoria | TAGS esperados |
|---|---|
| sitio | entradas[], tours[], checklist, itinerario[], fauna_flora[], secretos[], regulaciones, temporada_matriz |
| hostal | habitaciones[], amenidades[], actividades[], transporte[], que_incluye[], barrio_descripcion |
| comida | menu_destacado[], horario_detallado, opciones_dieta[], domicilio, precio_promedio |
| evento | fecha_inicio, fecha_fin, edicion, sede, lineup[], agenda[], categorias_entrada[], que_llevar[], prohibido[] |

El contrato exacto lo define
`.opencode/prompts/GEMINI_MASTER_PROMPT.md` (seccion 6)
y lo comprueba `scripts/validate_ficha.js`.

## Reglas criticas

- **Fotos verificadas (BUG-022):** `curl -I` con HEAD 200 en el destino final
  antes de aprobar una URL.
- **Coordenadas reales:** nunca 0,0.
- **Sin rating inventado (ADR-009):** el bloque JSON no lleva rating; si
  aparece, es FAIL.
- **ASCII-safe en el seed (ADR-002):** la ficha puede tener UTF-8 limpio; el
  escape `\uXXXX` aplica solo a los JS del seed.
- **Cero investigacion web propia (R3):** solo validacion y verificacion
  puntual con `curl -I`.

## Uso

Invocado desde `create-dynamic-page` (paso 2) cuando ya existe una ficha de
Gemini, o directamente:
```
/research-destination "Museo Nacional de Colombia" Bogota sitio
```
