# Spec: Capa Multimedia + Drawer del Mapa Cultural (index.html)

Fecha: 2026-09-10
Estado: Aprobado por usuario
Alcance: `index.html` + `index-api-connector.js`

## Problema

El módulo "Mapa cultural de Colombia" en `index.html` es un mapa Leaflet de pines
por categoría (hostal/comida/sitio/evento) sin ninguna integración multimedia.
La foto del destino ya viaja en `/api/destinos` pero `toMapPlace()` la descarta.
Existe un endpoint público `GET /api/interacciones?tipo=multimedia_mapa` que
devuelve fotos, videos y audios (álbumes comunitarios + fotos de destinos) con
coordenadas propias, pero el mapa de index no lo consume.

La migración `009_albumes.sql` ya fue aplicada en Neon.

## Modelo elegido (Modelo C — híbrido)

1. **Capa de pines multimedia separados** en el mapa (📸 foto / ▶ video / ♫ audio).
2. **Drawer lateral fijo** enriquecido con multimedia al hacer clic en cualquier pin.

## Arquitectura de datos

### `index-api-connector.js`

- `toMapPlace()` agrega el campo `foto` (foto_hero) a cada item.
- Nuevo fetch: `GET /api/interacciones?tipo=multimedia_mapa` (público, GET, sin
  auth) que puebla `MAPA_MEDIA[]` con:
  `{ media_url, media_type (foto|video|audio), media_title, media_source, lat,
     lng, ciudad, album_titulo, autor_nombre, origen (album|destino),
     origen_id, votos }`.

### `index.html`

```
initMapaSection()
  ├─ fetch /api/destinos → MAPA_PLACES[] (ahora con foto)
  ├─ fetch multimedia_mapa → MAPA_MEDIA[]
  ├─ renderiza pines de destinos (existente)
  └─ renderiza capa multimedia (nuevo, mapaMediaLayer)
```

## Capa multimedia (Modelo A)

- Cada item de `MAPA_MEDIA` con lat/lng válidos (no null, no 0) → marcador
  Leaflet con `L.divIcon` circular por tipo:
  - foto: icono 📸, color `#E8A020`
  - video: icono ▶, color `#e74c3c`
  - audio: icono ♫, color `#9b59b6`
- Marcadores en un `L.layerGroup` propio: `mapaMediaLayer`.
- Clic en pin multimedia → abre el drawer con el reproductor correspondiente.

## Filtros del topbar

- Los 4 botones existentes (Todo/Hospedaje/Comida/Naturaleza/Eventos) siguen
  filtrando pines de destino.
- Nuevo grupo "Media" en `.mapa-filters`:
  - Toggle capa "Media" (muestra/oculta `mapaMediaLayer`)
  - Subtipo Fotos / Videos / Audios (filtran `MAPA_MEDIA` por `media_type`)
- El filtro "Todo" también activa la capa media (los pines multimedia se muestran
  junto a los de destino).

## Drawer lateral fijo (Modelo B/C)

Panel fijo, alineado a la derecha en desktop; drawer inferior a pantalla completa
en móvil. Se abre al hacer clic en cualquier pin (destino o multimedia).

### Sección superior — Datos base

- Foto hero grande (fallback: gradiente `hero_bg` si no hay foto).
- Nombre + ciudad/región, rating ⭐, precio, lead.
- Link "Ver lugar completo" → `/{slug}.html`.

### Sección media del destino — tabs (foto/video/audio)

- **Fotos:** galería de thumbnails del destino (`photos[]`) + fotos de
  `MAPA_MEDIA` con origen=destino → lightbox (clic abre overlay).
- **Videos:** embeds YouTube/Vimeo si `tags.video_url` existe.
- **Audio:** player `<audio controls>` si hay tracks.
- **Álbumes comunitarios cercanos:** items de `MAPA_MEDIA` con origen=album y
  misma ciudad / radio ~10 km del pin → mini-galería con media, título, autor,
  votos ⭐.

### Cierre

- Botón ✕ y clic fuera del drawer.

## Cruzamiento de datos

- **Por ciudad** (match de string normalizado, sin acentos) como criterio
  principal.
- **Fallback por radio ~10 km** (fórmula haversine en cliente) si no hay match
  por ciudad.

## Errores y robustez

- Si `multimedia_mapa` falla: la capa media no se pinta, el mapa funciona normal,
  `console.warn` tipificado (sin try-catch genéricos).
- Imágenes con `onerror` que ocultan la miniatura y dejan placeholder con
  gradiente.
- Lat/lng inválidos se descartan (null o 0).
- JS nuevo en estilo ES5 (`var`, funciones declaradas) consistente con el resto
  del archivo.
- **ASCII-safety estricto**: sin caracteres no-ASCII en el código nuevo.
- Regla de No-Duplicidad: reutilizar helpers existentes (`esc`, `replArr`,
  `CAT_COLORS`, `PIN_COLORS`). Si se necesita un popup similar al de
  comunidad.html, refactorizar/abstraer en lugar de copiar.

## Verificación

- Escudo GOLD: `node --check` sobre la extracción JS, ASCII-safety, balance de
  divs.
- Smoke manual: abrir index, cargar mapa, activar capa Media, ver drawer con
  destino (galería) y con pin multimedia (reproductor).
- Auditoría `@qa-auditor` antes de declarar completa.

## Fuera de alcance (YAGNI)

- Upload de multimedia desde index (vive en comunidad/panel admin).
- Votos de multimedia desde el drawer (requiere sesión; se muestra solo el
  conteo).
- Visibilidad public/unlisted/privado de álbumes.
- Cambios de backend: el endpoint `multimedia_mapa` ya expone todo lo necesario.