---
name: gemini-research
description: Ingesta de fichas .md investigadas en Gemini. Entrega el prompt en el chat, valida la ficha y verifica fotos con HEAD 200 antes del handoff.
---

# Gemini Research (ingesta de fichas investigadas en Gemini)

## Contexto y contrato R3 (ADR-067)

ExploraCO arma cada entrada de directorio con 4 bloques de datos exactos:
`BASE` (26 columnas de `destinos`), `TAGS` (JSONB por categoria), `FAQS`
(5 en `destinos_detalles`) y `FOTOS_SUGERIDAS` (hero + galeria, la primera es
hero). Bajo **R3, la investigacion web la hace Google Gemini (externo)**, no
el subagente:

- **El agente NUNCA investiga en la web.** No hay `webfetch` de investigacion,
  ni scrapeo, ni API de Gemini, ni scripts con API key.
- El agente **entrega EN EL CHAT el prompt completo** listo para pegar en
  Gemini, con los parametros ya rellenados.
- Gemini devuelve la ficha `.md`; el agente la **valida** y **verifica las
  fotos** con `curl -I` (HEAD 200, BUG-022) antes del handoff.

## Flujo

### 1. Recoger los parametros del usuario
Pedir: `ITEM` (nombre del establecimiento / lugar / evento),
`CATEGORIA (hostal|comida|sitio|evento)`, `CIUDAD`, `REGION` y observaciones
(datos previos). Para lotes de eventos: cantidad N, ciudades, rango de fechas
y tipos.

### 2. Entregar EN EL CHAT el prompt completo (listo para pegar)
Leer `.opencode/skills/gemini-research/prompts/GEMINI_MASTER_PROMPT.md`,
rellenar su seccion `## 2. Entrada a investigar` con los parametros, y
**pegar el documento ENTERO en el chat** delimitado para copiar de un tiron
(bloque de codigo desde la primera linea hasta `==FIN==`). Incluir, al final
del mensaje, la instruccion de que hacer con la respuesta. No hay llamada a
ninguna API: el usuario es quien pega en Gemini.

- Destinos: usar `prompts/GEMINI_MASTER_PROMPT.md` (un item por vez) y
  `prompts/ficha_template.md` como formato de salida.
- Lotes de eventos: usar `prompts/GEMINI_EVENTOS_PROMPT.md` (N eventos).

Textos de los prompts: ver `prompts/` (T3.e).

### 3. El usuario pega en Gemini y devuelve la ficha
Gemini responde UN MENSAJE con ficha humana + **un unico** bloque ```` ```json ````
final. El usuario la guarda en `exploraco desarrollo/ficha-<slug>.md` (para
eventos, el bloque JSON en `eventos/eventos.json`).

### 4. Validar la ficha
```
node .opencode/skills/gemini-research/scripts/validate_ficha.js "exploraco desarrollo/ficha-<slug>.md"
```
Debe dar `PASS`. Si `FAIL`, devolver cada error a correction sobre la ficha (no
inventar datos). El detalle del rol validador esta en el skill
`research-destination`.

### 5. Verificar las fotos con `curl -I` (BUG-022)
Para cada `FOTOS_SUGERIDAS`:

1. Resolver la URL real de thumbnail de Wikimedia Commons via la API:
   `https://commons.wikimedia.org/w/api.php?action=query&titles=<File:...>&prop=imageinfo&iiprop=url&iiurlwidth=960&format=json`
2. Verificar con `curl -I` siguiendo redirecciones y exigir **HTTP 200 en el
   destino final**:
   ```
   curl -I -L -s -o NUL -w "%{http_code} %{url_effective}\n" "<thumburl>"
   ```
   Un `404` o una redireccion que no acabe en `200` NO sirven. Probar el
   siguiente `nombres_archivo_wikimedia`; si todos fallan, descartar la foto
   (nunca sembrar URL rota).
3. Marcar la primera (`es_hero=true`) como `foto_hero`.

### 6. Handoff al pipeline de pagina dinamica
Invocar `create-dynamic-page` con `<slug>`: seed + loader + smoke + Escudo
GOLD + produccion. El content-loader aplica el escape ASCII (`\uXXXX`,
ADR-002) al construir el seed.

## Archivos del skill

| Archivo | Proposito |
|---|---|
| `prompts/GEMINI_MASTER_PROMPT.md` | Prompt maestro para pegar en Gemini (destino individual) |
| `prompts/GEMINI_EVENTOS_PROMPT.md` | Prompt para lotes de eventos |
| `prompts/ficha_template.md` | Formato de ficha + ejemplo del bloque JSON |
| `prompts/GEMINI_GEMA_INVESTIGACION.md` | Prompt de la gema "ExploraCO Research" (todo-en-uno) |
| `.opencode/skills/gemini-research/scripts/validate_ficha.js` | Validador del bloque JSON (paso 4) |

## Reglas criticas

- **PROHIBIDO llamar a una API de Gemini** con API key o ejecutar un script
  que la llame. El unico canal es el usuario pegando el prompt en Gemini.
- **PROHIBIDO que el agente investigue** con `webfetch`/scrapeo. El acceso web
  permitido es solo `curl -I` para verificar fotos (y, si acaso, una consulta
  puntual de coordenadas).
- **Fotos verificadas (BUG-022):** HEAD 200 en el destino final antes de
  sembrar. Nunca confiar en URLs que entrega Gemini.
- **Coordenadas reales:** nunca 0,0.
- **Sin rating inventado (ADR-009):** el bloque JSON no lleva rating; si
  aparece, quitarlo.
- **ASCII-safe en seed (ADR-002):** la ficha puede tener UTF-8 limpio; el
  escape `\uXXXX` aplica solo a los JS del seed.
- **Cero duplicidad:** la ingesta reutiliza el pipeline de
  `create-dynamic-page`.

## Uso

```
Usuario: "Investigar Candelario, La Candelaria, comida"
- Paso 2: entregar en el chat GEMINI_MASTER_PROMPT.md con los parametros
- Usuario pega en Gemini y guarda exploraco desarrollo/ficha-candelario.md
- Paso 4: /gemini-research candelario (validar + verificar fotos + handoff)
```

En modo lote: invocar este skill una vez por item y luego `batch-create` para
el pipeline de produccion.
