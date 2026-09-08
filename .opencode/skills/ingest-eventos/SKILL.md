---
name: ingest-eventos
description: >
  Sube eventos a la agenda cultural de ExploraCO de forma automatizada:
  investigacion en Gemini (GEMINI_EVENTOS_PROMPT.md) que entrega el lote
  eventos/eventos.json, validacion (validate_eventos.js), carga a
  produccion via API (upload-eventos.js) con seed versionado, y docs.
  Usalo cuando el usuario pida agregar uno o varios eventos a la agenda.
---

# Ingest Eventos

Automatiza la ingesta de eventos a la agenda cultural (agenda.html e
index.html). La agenda ya soporta multidia (fecha_inicio -> fecha_fin en
todos los dias/meses vigentes) y categoria auto-detectada.

## Schema de cada evento (eventos/eventos.json, array)

| Campo (base) | Requerido | Nota |
|---|---|---|
| slug | si | `[a-z0-9-]`, unico |
| nombre | si | nombre visible |
| lead / descripcion | si (lead) | descripcion opcional = lead si falta |
| ciudad | si | |
| lat / lng | si | nunca 0,0 |
| emoji | no | default 🎉 |
| hero_bg | no | gradiente; default evento |
| foto_hero | no | URL verificada (BUG-022) |
| fotos_galeria[] | no | [{url, caption}] |
| faqs[] | no | [{pregunta, respuesta}] |
| web / instagram / precio_desde / horario | no | |
| destacado | no | default false (editorial true solo si aplica) |
| fotos_sugeridas[] | no | sugerencias Wikimedia `{tema, caption, nombres_archivo_wikimedia:["File:..."], es_hero}`; IGNORADA por el batch (la usa la FASE B de fotos) |

| Campo (tags) | Requerido | Nota |
|---|---|---|
| fecha_inicio | si | `YYYY-MM-DD` |
| fecha_fin | si (o = inicio) | `YYYY-MM-DD`, fin >= inicio. Sin fin -> = inicio |
| sede | si | lugar del evento |
| edicion / organiza / lema | no | textos libres |
| tipo_evento | no | fuerza categoria: festival/musica/gastro/naturaleza/cultura |
| lineup[] | no | [{nombre, rol, genero}] |
| agenda[] | no | [{dia, hora, actividad}] |
| categorias_entrada[] | no | [{tipo, precio, disponibilidad}] |
| que_llevar[] / prohibido[] | no | listas de strings |

## Flujo

### FASE A — Investigacion en Gemini (externa, manual)

1. Pedir al usuario el lote: cantidad N, ciudad(es), rango de fechas, tipos
   y observaciones.
2. Pasar `prompts/GEMINI_EVENTOS_PROMPT.md` del skill `gemini-research` para
   que el usuario lo pegue en Gemini (o copiarle la seccion `## 2. Lote a
   investigar` con los datos).
3. Gemini devuelve UN MENSAJE con un unico bloque ```json ``` (array de N
   eventos, schema `eventos/eventos.json`). El usuario guarda el bloque en
   `eventos/eventos.json` (tal cual, sin comentarios).

### FASE A2 — Fuente externa Hostal Terraza (alternativa automatizada)

Para traer los eventos publicados de la cartelera de
https://hostalterraza.vercel.app (tabla Supabase `eventos`, RLS anon de
lectura publica) a la agenda:

1. Ejecutar el conector (filtra proximos, sin pruebas/campanas; geocode
   Nominatim; foto HEAD 200 BUG-022):
   ```
   node scripts/extraer-hostalterraza.js --dry   # previsualiza
   node scripts/extraer-hostalterraza.js         # fusiona ht-* en eventos/eventos.json
   ```
2. Continuar en FASE C (validar `--prod`, subir `--seed`, verificar, docs).

Reglas del conector: slugs con prefijo `ht-`; `tipo_evento` mapeado
(fiesta->musica, cine/cinematografia->cultura, campana->cultura,
sin categoria->festival); solo eventos proximos (fecha >= hoy); la campaña
binacional queda excluida (flag `--incluir-campanas` para incluirla).

### FASE B — Fotos por evento (opcional, tras el batch)

El batch sube sin fotos (`foto_hero`/`fotos_galeria` vacios; hero con
gradiente). Para anadir fotos verificadas a un evento (BUG-022):
1. Tomar sus `fotos_sugeridas` y resolver la URL real de thumbnail vía la
   API de Wikimedia Commons:
   `https://commons.wikimedia.org/w/api.php?action=query&titles=<nombre>&prop=imageinfo&iiprop=url&iiurlwidth=960&format=json`.
2. Verificar `HEAD 200` de la `thumburl`; si falla, probar el siguiente
   `nombres_archivo_wikimedia`; si todos fallan, buscar por `tema` o
   descartar (nunca URL rota).
3. Poblar `foto_hero` (la `es_hero:true`) y `fotos_galeria` en el evento y
   re-subirlo con `upload-eventos.js`.

### FASE C — Validar, subir y documentar

1. **Validar**:
   ```
   node scripts/validate_eventos.js eventos/eventos.json --prod
   ```
   Corregir hasta obtener PASS.
2. **Cargar a produccion** (idempotente DELETE+POST por slug):
   ```
   node scripts/upload-eventos.js eventos/eventos.json --seed
   ```
   `--dry` valida sin subir; `--seed` genera `scripts/seed-eventos-<fecha>.js`.
3. **Verificar**:
   - `GET /api/destinos?cat=evento&limit=200` -> slugs presentes.
   - En `agenda.html`: el evento aparece en todos los dias vigentes (si es
     multidia) y con la categoria correcta.
   - `node --check` sobre el seed generado; `node scripts/smoke_test_agenda.js`
     sigue PASS.
4. **Docs**: entrada en TASKS.md (TSK nuevo) + nota en NEXT.md. Commit si el
   usuario lo pide.

## Reglas criticas

- JSON en UTF-8 (tildes y emoji OK). Los scripts validate/upload y el seed
  generado son ASCII-safe.
- No scraping de fuentes (Instagram no es scrapeable; referentes-agenda.md).
- `destacado` default false; `status` siempre published.
- El total de eventos en la agenda (limit 200) se controla con `--prod`.

## Uso

```
Usuario: "Agrega estos 3 conciertos a la agenda: ..."
-> ingest-eventos:
   A. Prompts/GEMINI_EVENTOS_PROMPT.md -> Gemini -> JSON en eventos/eventos.json
   B. (Opcional) resolver fotos_sugeridas por evento
   C. validate_eventos.js --prod -> upload-eventos.js --seed
   D. Verificar /api/destinos?cat=evento + agenda -> TASKS.md / NEXT.md
```