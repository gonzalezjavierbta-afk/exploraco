---
name: ingest-eventos
description: >
  Sube eventos a la agenda cultural de ExploraCO de forma automatizada:
  genera el lote eventos/eventos.json, lo valida (validate_eventos.js),
  lo carga a produccion via API (upload-eventos.js) con seed versionado
  y actualiza docs. Usalo cuando el usuario pida agregar uno o varios
  eventos a la agenda.
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

1. **Recibir** la lista de eventos (descripcion, o datos ya verificados).
2. **Preparar** `eventos/eventos.json` (array). Si hay datos con baja
   confianza, verificar en fuentes oficiales (referentes-agenda.md); para
   investigacion profunda usar el skill `gemini-research`/`research-agent`.
   Fotos: verificar HEAD 200 antes de usar (BUG-022). Rating siempre 0
   (ADR-009).
3. **Validar**:
   ```
   node scripts/validate_eventos.js eventos/eventos.json --prod
   ```
   Corregir hasta obtener PASS.
4. **Cargar a produccion** (idempotente DELETE+POST por slug):
   ```
   node scripts/upload-eventos.js eventos/eventos.json --seed
   ```
   `--dry` valida sin subir; `--seed` genera `scripts/seed-eventos-<fecha>.js`.
5. **Verificar**:
   - `GET /api/destinos?cat=evento&limit=200` -> slugs presentes.
   - En `agenda.html`: el evento aparece en todos los dias vigentes (si es
     multidia) y con la categoria correcta.
   - `node --check` sobre el seed generado; `node scripts/smoke_test_agenda.js`
     sigue PASS.
6. **Docs**: entrada en TASKS.md (TSK nuevo) + nota en NEXT.md. Commit si el
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
   1. eventos/eventos.json = [ ... ]
   2. validate_eventos.js --prod
   3. upload-eventos.js --seed
   4. Verificar /api/destinos?cat=evento + agenda
   5. TASKS.md / NEXT.md
```