# Especificacion de diseno - Sistema de Albumes Fotograficos (ADR-017)

**Fecha:** 2026-09-09
**Estado:** Pendiente de implementacion
**ADR:** ADR-017 (a registrar en DECISIONS.md)
**Tareas:** TASKS.md TSK-092 (a crear)
**Baseline:** 8 endpoints Vercel Hobby agotados (BLUEPRINT.md seccion 2), todo vive en `api/interacciones.js` via query params (ADR-010/015 patron)

## Resumen Ejecutivo

Sistema de albumes fotograficos libres (no vinculados a destinos del directorio) con modelo Pinterest de fotos de otros usuarios que otorgan XP al dueno original, mapa audiovisual en comunidad.html con MarkerCluster, gamificacion completa (6 misiones + 7 logros nuevos) y herramientas de moderacion admin. Todo dentro de los 8 endpoints existentes (Vercel Hobby 8/8 agotado, BLUEPRINT.md seccion 2).

## Decisiones de producto aprobadas (P1-P13 + Q1-Q7)

### Decisiones del usuario (P-series)

| ID | Decision |
|---|---|
| **P1** | Todo en endpoints existentes via query params. Sin endpoint nuevo (presupuesto Vercel Hobby 8/8). |
| **P2** | Solo URL externa para fotos: HEAD diferido (POST valida formato/dominio/SSRF, HEAD en background auditoria). SSRF block: IPs privadas/link-local prohibidas. |
| **P3** | Albumes libres: no vinculados a destinos del directorio. Cada album tiene sus propias lat/lng/ciudad. |
| **P4** | Pinterest-style: fotos de otros usuarios en tu album otorgan XP al dueno original (autor_original_id). |
| **P5** | Gates por nivel: nivel 2 para album/repin, nivel 4 moderacion, nivel 5 crear salas. |
| **P8** | Albumes multimedia: fotos + videos + audio (tipo en album_fotos). |
| **P9** | Seccion en comunidad.html: nuevo tab "Mapa" despues de "Planes". |
| **P10** | MarkerCluster SI para el mapa audiovisual (clustering de markers). |
| **P11** | Curacion manual: admin selecciona fotos top para destinos (no automatica). |
| **P13** | Anti-spam: 10 fotos/dia, 20 repins/dia, XP dueno tope 10/dia. |

### Decisiones del revisor (Q-series)

| ID | Decision |
|---|---|
| **Q1** | `album_fotos` tabla exclusiva (sin ALTER a `interacciones`). Aislamiento limpio. |
| **Q2** | Visibilidad de albumes: public/unlisted/privado (futuro; por ahora solo public). |
| **Q3** | Gates de nivel 2 para crear album y agregar fotos. |
| **Q4** | Contadores por COUNT (sin columnas total_fotos/total_votos). Performance aceptable con indices. |
| **Q5** | HEAD diferido: POST solo valida URL format+dominio, HEAD corre como auditoria posterior. |
| **Q6** | Anti-spam identico a P13: 10 fotos/dia, 20 votos/dia, XP tope 10/dia por autor. |
| **Q7** | Admin: moderar fotos (aprobar/eliminar) + seleccionar foto top de destino. |

---

## Migracion SQL: db/migrations/009_albumes.sql

DDL completo, idempotente (IF NOT EXISTS + ON CONFLICT, ADR-008), ASCII-safe (ADR-002: 0 bytes > 127, escapes \uXXXX).

### Tabla albumes

```sql
CREATE TABLE IF NOT EXISTS albumes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  titulo varchar(120) NOT NULL,
  descripcion text DEFAULT '',
  tipo varchar(20) DEFAULT 'fotos' CHECK (tipo IN ('fotos','videos','audio','mixto')),
  lat double precision,
  lng double precision,
  ciudad varchar(80),
  region varchar(80),
  portada_url text,
  es_top boolean DEFAULT false,
  activo boolean NOT NULL DEFAULT true,
  creado_en timestamptz DEFAULT now(),
  actualizado_en timestamptz DEFAULT now()
);
```

**Nota:** NO hay columnas `total_fotos`/`total_votos`. Se derivan por `COUNT(*)` con `WHERE activo = true` (Q4).

### Indices albumes

```sql
CREATE INDEX IF NOT EXISTS idx_albumes_coords
  ON albumes (lat, lng) WHERE lat IS NOT NULL AND lng IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_albumes_usuario
  ON albumes (usuario_id, creado_en DESC);

CREATE INDEX IF NOT EXISTS idx_albumes_ciudad
  ON albumes (ciudad, creado_en DESC) WHERE ciudad IS NOT NULL;
```

### Tabla album_fotos

```sql
CREATE TABLE IF NOT EXISTS album_fotos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  album_id uuid NOT NULL REFERENCES albumes(id) ON DELETE CASCADE,
  agregador_id uuid NOT NULL REFERENCES usuarios(id),
  autor_original_id uuid REFERENCES usuarios(id),
  foto_url text NOT NULL,
  foto_type varchar(20) DEFAULT 'foto' CHECK (foto_type IN ('foto','video','audio')),
  media_title varchar(200) DEFAULT '',
  media_source varchar(100) DEFAULT '',
  activo boolean NOT NULL DEFAULT true,
  xp_otorgado_autor integer NOT NULL DEFAULT 0,
  creado_en timestamptz DEFAULT now()
);
```

**Semantica de IDs:**
- `agregador_id` = quien repinea/sube la foto al album.
- `autor_original_id` = dueno original de la foto (recibe XP por repin).
- Si la foto es propia: ambos apuntan al mismo usuario.

### Indices album_fotos

```sql
CREATE INDEX IF NOT EXISTS idx_album_fotos_album
  ON album_fotos (album_id, creado_en ASC);

CREATE INDEX IF NOT EXISTS idx_album_fotos_autor
  ON album_fotos (autor_original_id, creado_en DESC)
  WHERE autor_original_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_album_fotos_dedup
  ON album_fotos (album_id, foto_url, autor_original_id);
```

El indice UNIQUE en `(album_id, foto_url, autor_original_id)` previene duplicados en el mismo album. Un usuario puede tener la misma foto en albums diferentes.

### Tabla album_votos

```sql
CREATE TABLE IF NOT EXISTS album_votos (
  usuario_id uuid NOT NULL REFERENCES usuarios(id),
  foto_id uuid NOT NULL REFERENCES album_fotos(id) ON DELETE CASCADE,
  xp_ganado integer NOT NULL DEFAULT 5,
  creado_en timestamptz DEFAULT now(),
  PRIMARY KEY (usuario_id, foto_id)
);
```

Patron exacto de `resena_votos` (ADR-014, migracion 007). PK compuesta para dedup por usuario+foto.

### Extension a usuarios

```sql
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS progreso_album jsonb NOT NULL DEFAULT '{}';
```

Almacena contadores anti-spam:

```json
{
  "fotos_dia": 5,
  "fotos_dia_fecha": "2026-09-09",
  "repins_dia": 12,
  "repins_dia_fecha": "2026-09-09",
  "xp_dia_autor": 8,
  "xp_dia_autor_fecha": "2026-09-09"
}
```

Mismo patron que `progreso_social` (migracion 008, ADR-015) y `progreso_misiones`.

---

## Backend: Extension en api/interacciones.js

### GET tipo=albumes (listado publico)

**Params:** `usuario_id`, `ciudad`, `tipo`, `lat`, `lng`, `radio_km`, `limit` (default 20, max 50), `offset`, `orden` (creado_en|mas_fotos|mas_votos)

**Query:**
```sql
SELECT a.*, u.nombre AS autor_nombre,
       COUNT(af.id) FILTER (WHERE af.activo = true) AS total_fotos,
       COUNT(av.foto_id) AS total_votos
FROM albumes a
JOIN usuarios u ON u.id = a.usuario_id
LEFT JOIN album_fotos af ON af.album_id = a.id AND af.activo = true
LEFT JOIN album_votos av ON av.foto_id = af.id
WHERE a.activo = true
  AND ($1::uuid IS NULL OR a.usuario_id = $1)
  AND ($2::text IS NULL OR a.ciudad = $2)
  AND ($3::text IS NULL OR a.tipo = $3)
GROUP BY a.id, u.nombre
ORDER BY a.creado_en DESC
LIMIT $4 OFFSET $5;
```

**Sin auth** (publico). Retorna listado de albumes con conteos derivados (Q4).

### GET tipo=album_detalle

**Params:** `album_id`

**Query 1 (album):**
```sql
SELECT a.*, u.nombre AS autor_nombre
FROM albumes a
JOIN usuarios u ON u.id = a.usuario_id
WHERE a.id = $1 AND a.activo = true;
```

**Query 2 (fotos del album):**
```sql
SELECT af.*, u2.nombre AS agregador_nombre,
       u3.nombre AS autor_original_nombre,
       COUNT(av.foto_id) AS total_votos
FROM album_fotos af
JOIN usuarios u2 ON u2.id = af.agregador_id
LEFT JOIN usuarios u3 ON u3.id = af.autor_original_id
LEFT JOIN album_votos av ON av.foto_id = af.id
WHERE af.album_id = $1 AND af.activo = true
GROUP BY af.id, u2.nombre, u3.nombre
ORDER BY af.creado_en ASC;
```

**Sin auth.** Retorna album + fotos con votos COUNT.

### GET tipo=multimedia_mapa (mapa audiovisual)

**Params:** `tipo_media` (foto|video|audio|all), `ciudad`

**Query (UNION de albumes + destinos):**
```sql
(
  SELECT af.foto_url, af.foto_type, af.media_title, af.media_source,
         a.lat, a.lng, a.titulo AS contexto_nombre, 'album' AS contexto_tipo,
         u.nombre AS autor_nombre,
         COUNT(av.foto_id) AS votos
  FROM album_fotos af
  JOIN albumes a ON a.id = af.album_id
  JOIN usuarios u ON u.id = af.autor_original_id
  LEFT JOIN album_votos av ON av.foto_id = af.id
  WHERE af.activo = true AND a.activo = true
    AND a.lat IS NOT NULL AND a.lng IS NOT NULL
    AND ($1::text = 'all' OR af.foto_type = $1)
    AND ($2::text IS NULL OR a.ciudad = $2)
  GROUP BY af.id, a.id, u.nombre
)
UNION ALL
(
  SELECT df.url AS foto_url, 'foto' AS foto_type, df.caption AS media_title,
         '' AS media_source,
         d.lat, d.lng, d.nombre AS contexto_nombre, 'destino' AS contexto_tipo,
         '' AS autor_nombre,
         0 AS votos
  FROM destinos_fotos df
  JOIN destinos d ON d.id = df.destino_id
  WHERE d.lat IS NOT NULL AND d.lng IS NOT NULL
    AND ($1::text = 'all' OR $1::text = 'foto')
    AND ($2::text IS NULL OR d.ciudad = $2)
)
LIMIT 200;
```

**Sin auth.** Retorna puntos del mapa (lat, lng, thumbnail, titulo, autor, votos, tipo contexto). El frontend decide icono y popup segun contexto_tipo.

### GET tipo=mi_feed_fotos

**Params:** `limit` (default 20), `offset`

**Query:**
```sql
SELECT af.*, a.titulo AS album_titulo, a.tipo AS album_tipo,
       u.nombre AS autor_original_nombre,
       COUNT(av.foto_id) AS total_votos
FROM album_fotos af
JOIN albumes a ON a.id = af.album_id
JOIN usuarios u ON u.id = af.autor_original_id
LEFT JOIN album_votos av ON av.foto_id = af.id
WHERE af.activo = true AND a.activo = true
GROUP BY af.id, a.titulo, a.tipo, u.nombre
ORDER BY af.creado_en DESC
LIMIT $1 OFFSET $2;
```

**Sin auth.** Feed de fotos recientes de todos los albumes publicos.

### GET tipo=fotos_top (curacion de destinos)

**Params:** `destino_id`

**Query:**
```sql
SELECT af.foto_url, af.media_title, u.nombre AS autor_nombre,
       COUNT(av.foto_id) AS votos
FROM album_fotos af
JOIN albumes a ON a.id = af.album_id
JOIN usuarios u ON u.id = af.autor_original_id
JOIN destinos d ON d.id = $1
LEFT JOIN album_votos av ON av.foto_id = af.id
WHERE af.activo = true AND a.activo = true
  AND af.foto_type = 'foto'
  AND ABS(a.lat - d.lat) < 0.01
  AND ABS(a.lng - d.lng) < 0.01
GROUP BY af.id, u.nombre
ORDER BY votos DESC
LIMIT 20;
```

**Sin auth.** Devuelve fotos de albumes cercanos al destino (radio ~1km por coord) ordenadas por votos. El admin usa estas para seleccionar `foto_hero` del destino.

### POST tipo=album_crear

**Auth:** `usuario_id` requerido, nivel >= 2 (gate server-side).

**Anti-spam:** max 5 albumes/mes (check en `progreso_album.albumes_mes` / `albumes_mes_fecha`).

**Params:** `titulo`, `descripcion`, `tipo`, `lat`, `lng`, `ciudad`, `region`, `portada_url`

**XP:** +20 al creador.

**Logica:**
1. Verificar nivel >= 2 (403 si no).
2. Verificar anti-spam (429 si supera limite).
3. INSERT albumes con coords y tipo.
4. UPDATE `usuarios.xp_total += 20`, `usuarios.nivel` recalculado.
5. UPDATE `progreso_album` (incrementar albumes_mes).
6. Evaluar misiones y logros.
7. Retornar: `{ album, xp_ganado, misiones, logros }`.

### POST tipo=album_agregar_foto

**Auth:** `usuario_id` requerido, nivel >= 2.

**Anti-spam:** max 10 fotos/dia, max 50 fotos/album.

**Params:** `album_id`, `foto_url`, `foto_type`, `autor_original_id`, `media_title`, `media_source`

**Validacion POST:** formato URL + dominio no privado + SSRF block (sin HEAD, HEAD diferido Q5).

**XP:** +15 al agregador, +10 al autor original (tope 10 XP/dia por autor).

**Logica:**
1. Verificar nivel >= 2.
2. Verificar pertenencia del album o que sea publico.
3. Anti-spam fotos_dia (Q6).
4. Anti-spam fotos/album (50 max).
5. Validar URL (formato + SSRF block).
6. Verificar que el album soporte el tipo multimedia (fotos/videos/audio/mixto).
7. INSERT album_fotos con `agregador_id = usuario_id` y `autor_original_id` del param.
8. Si `autor_original_id != usuario_id`: otorgar +10 XP al autor original (tope diario).
9. +15 XP al agregador.
10. Evaluar misiones y logros.
11. Retornar: `{ foto, xp_ganado, misiones, logros }`.

### POST tipo=album_voto

**Auth:** `usuario_id` requerido.

**Anti-spam:** max 20 votos/dia (Q6).

**Params:** `foto_id` (FK album_fotos)

**XP:** +5 al votante.

**Dedup:** PK `(usuario_id, foto_id)` -> 409 si duplicado.

**Self-vote:** 403 si `autor_original_id == usuario_id` de la foto.

**Logica:**
1. Verificar que la foto existe y esta activa.
2. Self-vote check (403).
3. Anti-spam votos_dia (Q6).
4. INSERT album_votos (dedup PK -> 409).
5. +5 XP al votante.
6. Evaluar misiones y logros.
7. Retornar: `{ votos_totales: COUNT, xp_ganado, misiones, logros }`.

### POST tipo=album_quitar_foto

**Auth:** `usuario_id` requerido.

**Permisos:** solo `agregador_id` de la foto o creador del album.

**Params:** `foto_id`, `album_id`

**Logica:** Soft-delete (`activo = false`). Sin XP reversal.

### POST tipo=album_editar

**Auth:** `usuario_id` requerido.

**Permisos:** solo creador del album (`usuario_id = album.usuario_id`).

**Params:** `album_id`, `titulo`, `descripcion`, `portada_url`, `lat`, `lng`, `ciudad`, `region`

**Logica:** UPDATE solo los campos provided (no tocar tipo ni creado_en). UPDATE `actualizado_en = now()`.

### POST tipo=album_eliminar

**Auth:** `usuario_id` requerido.

**Permisos:** solo creador del album.

**Logica:** Soft-delete (`activo = false`). No DELETE fisico (Cero Borrado Logico, ADR-003).

### POST tipo=admin_foto_top

**Auth:** Bearer admin.

**Params:** `destino_id`, `foto_url`

**Logica:** UPDATE `destinos.foto_hero = $2 WHERE id = $1`. El admin selecciona manualmente la foto destacada de un destino (P11).

### POST tipo=admin_moderar_foto_album

**Auth:** Bearer admin.

**Params:** `foto_id`, `accion` (aprobar|eliminar)

**Logica:** Si accion = 'eliminar': soft-delete (`activo = false`) en album_fotos. Si accion = 'aprobar': nothing (marca de aprobacion futura).

---

## Misiones nuevas (6)

| ID | Grupo | Requiere | XP | Gate nivel | Check |
|---|---|---|---|---|---|
| `mis_primera_foto_social` | fotos | [] (entrada) | 15 | 2 | `COUNT(album_fotos WHERE agregador_id = usuario) >= 1` |
| `mis_creador_album` | fotos | [mis_primera_foto_social] | 20 | 2 | `COUNT(albumes WHERE usuario_id = usuario) >= 1` |
| `mis_album_curador` | fotos | [mis_creador_album] | 40 | 2 | `COUNT(albumes WHERE usuario_id = usuario) >= 5` |
| `mis_fotografo_social` | fotos | [mis_primera_foto_social] | 30 | 2 | `COUNT(album_fotos WHERE agregador_id = usuario) >= 10` |
| `mis_cazador_recompensas` | fotos | [mis_fotografo_social] | 25 | 2 | `COUNT(album_votos WHERE usuario_id = usuario) >= 20` |
| `mis_favorito_del_pueblo` | fotos | [mis_fotografo_social] | 50 | 2 | `COUNT(album_votos WHERE autor_original_id = usuario) >= 10` |

**DAG:**
```
mis_primera_foto_social
  |-- mis_creador_album --> mis_album_curador
  |-- mis_fotografo_social --> mis_cazador_recompensas
                              --> mis_favorito_del_pueblo
```

---

## Logros nuevos (7)

| ID | Tier | XP | Descripcion | Requiere | Check |
|---|---|---|---|---|---|
| `logr_albumero` | bronce | 15 | Crea tu primer album | - | `COUNT(albumes WHERE usuario_id) >= 1` |
| `logr_coleccionista_visual` | plata | 30 | Sube 25 fotos a albumes | logr_albumero | `COUNT(album_fotos WHERE autor_original_id) >= 25` |
| `logr_maestro_fotografo` | oro | 60 | Sube 50 fotos a albumes | logr_coleccionista_visual | `COUNT(album_fotos WHERE autor_original_id) >= 50` |
| `logr_favorito_comunidad` | bronce | 20 | Tus fotos reciben 10 votos | - | `COUNT(album_votos WHERE autor_original_id) >= 10` |
| `logr_estrella_del_mapa` | oro | 40 | Una foto tuya es seleccionada como top por admin | logr_favorito_comunidad | `COUNT(destinos WHERE foto_hero IN (album_fotos WHERE autor_original_id)) >= 1` |
| `logr_guardian_historias` | platino | 100 | Crea 5 albumes con al menos 10 fotos cada uno | logr_albumero | `COUNT(albumes con >=10 fotos) >= 5` |
| `logr_viajero_multimedia` | plata | 35 | Crea albumes de los 3 tipos: fotos, videos y audio | logr_albumero | `COUNT(DISTINCT tipo in albumes) >= 3` |

**Catalogo total:** LOGROS 22 (ADR-015) -> 29 (AGREGAR-017).

---

## Mapa Audiovisual en comunidad.html

### Ubicacion

Nuevo tab "Mapa" en `comunidad.html`, despues de "Planes":

```
[Chat] [Planes] [Mapa] [Ranking]
```

### Componentes del tab

- **Filtros:** fila de botones `Todos | Fotos | Videos | Audio` + select de ciudad.
- **Contenedor Leaflet** con `L.MarkerClusterGroup`.
- **Popup:** thumbnail (max 200px) + titulo + autor + votos + link al album/destino.
- **Panel informativo:** "N puntos multimedia en el mapa".

### JavaScript (inline en comunidad.html)

```javascript
function initAudiovisualMap() {
  // Crea mapa Leaflet en #mapa-audiovisual
  // Centrado en Colombia (4.5709, -74.2973), zoom 6
  // Agrega L.MarkerClusterGroup con config de cluster:
  //   maxClusterRadius: 50, spiderfyOnMaxZoom: true
}

function loadMultimediaMapa(tipo, ciudad) {
  // GET /api/interacciones?tipo=multimedia_mapa&tipo_media=X&ciudad=Y
  // Retorna array de {foto_url, foto_type, media_title, lat, lng,
  //                   contexto_nombre, contexto_tipo, autor_nombre, votos}
}

function renderAudiovisualMarkers(data) {
  // Limpia markers existentes del cluster group
  // Para cada punto: crea L.marker(lat,lng) con icono coloreado por tipo
  // Popup HTML: thumbnail + titulo + "por @autor" + votos + link
  // Agrega al cluster group
}

function getMediaIcon(type) {
  // foto: circleIcon #E8A020 (gold)
  // video: circleIcon #e74c3c (red)
  // audio: circleIcon #9b59b6 (purple)
  // Usa L.divIcon con badge de color
}
```

### CSS (scoped bajo `#tab-mapa`)

```css
#tab-mapa .mapa-filtros {
  display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 12px;
}
#tab-mapa .mapa-filtro {
  border-radius: 20px; padding: 6px 14px; font-size: 13px;
  background: #f0ede8; color: #555; border: none; cursor: pointer;
}
#tab-mapa .mapa-filtro.active {
  background: #E8A020; color: #fff; font-weight: 600;
}
#tab-mapa .av-popup { text-align: center; max-width: 220px; }
#tab-mapa .av-popup img {
  max-width: 200px; border-radius: 8px; margin-bottom: 6px;
}
```

### Init del tab

```javascript
// Al hacer click en tab "Mapa":
function showTabMapa() {
  document.getElementById('tab-mapa').style.display = '';
  if (!window._avMap) initAudiovisualMap();
  loadMultimediaMapa('all', null);
}
```

---

## Frontend Changes

### comunidad.html

1. **Nuevo tab "Mapa"** en la barra de tabs: `[Chat] [Planes] [Mapa] [Ranking]`.
2. **Contenido del tab:** filtros + mapa Leaflet + panel info.
3. **CSS scoped** bajo `#tab-mapa` (ADR-004: aislamiento atomico).
4. **JS inline** para init del mapa, fetch de multimedia, render de markers.
5. **Div balance:** verificar 86 -> nuevo conteo antes/despues (ADR-006).
6. **Leaflet/MarkerCluster:** cargar via CDN (no npm). Leaflet 1.9.4 + MarkerCluster 1.5.3.

### mi-perfil.html

1. **Nueva seccion "Mis Albumes"** despues de "Tabla de Destino".
2. **Grid de cards:** portada (placeholder si no hay portada_url) + titulo + fotos count (COUNT) + votos count.
3. **Boton "Crear Album":** visible solo si `nivel >= 2`. Abre modal.
4. **Modal de creacion:** titulo (requerido, 120 chars), descripcion (textarea), tipo (select: fotos/videos/audio/mixto), ubicacion (lat/lng auto o manual).
5. **Paginacion:** "Ver mas" con offset/limit.

### pagina-destino.js

1. **Seccion opcional "Foto destacada":** si `d.foto_hero` existe y no es placeholder de gradiente, mostrar bloque de foto destacada en la pagina. Ya existe parcialmente en el motor (secGaleria usa foto_hero como hero); esta funcion formaliza la foto como "seleccionada por admin".

---

## Admin Panel Changes

### admin.html

1. **Seccion "Foto Top" en tab FOTOS:**
   - Grid de fotos del destino actual (desde `?tipo=fotos_top&destino_id=X`).
   - Boton "Seleccionar como top" por cada foto.
   - POST `tipo=admin_foto_top` con destino_id + foto_url.
   
2. **Seccion "Moderar Fotos Album":**
   - Listado de fotos denunciadas (futuro: campo `denunciado` en album_fotos).
   - Acciones: Aprobar / Eliminar (soft-delete).
   - POST `tipo=admin_moderar_foto_album` con foto_id + accion.

### api/interacciones.js

- POST `tipo=admin_foto_top`: actualiza `foto_hero` del destino.
- POST `tipo=admin_moderar_foto_album`: soft-delete de foto (`activo = false`).

Ambos requieren auth Bearer admin.

---

## Anti-Spam Implementation

### Contadores en `usuarios.progreso_album`

```json
{
  "fotos_dia": 5,
  "fotos_dia_fecha": "2026-09-09",
  "repins_dia": 12,
  "repins_dia_fecha": "2026-09-09",
  "xp_dia_autor": 8,
  "xp_dia_autor_fecha": "2026-09-09",
  "albumes_mes": 3,
  "albumes_mes_fecha": "2026-09"
}
```

### Logica JS en interacciones.js

```javascript
function verificarLimiteFotos(usuarioId) {
  // SELECT progreso_album FROM usuarios WHERE id = usuarioId
  // Parsear JSON. Si fotos_dia_fecha != hoy: reset fotos_dia = 0
  // Si fotos_dia >= 10: retornar {excedido: true, retry: 'manana'}
  // Si no: incrementar fotos_dia, UPDATE progreso_album
}

function verificarLimiteRepins(usuarioId) {
  // Misma logica, limite 20
}

function verificarLimiteAlbumes(usuarioId) {
  // Misma logica, limite 5/mes
}

function otorgarXPAutorOriginal(sql, autorOriginalId, monto, fotoId) {
  // Check dedup: SELECT FROM album_votos WHERE foto_id = fotoId
  //   AND autor_original_id = autorOriginalId LIMIT 1
  //   -> si ya existe, NO otorgar dos veces por la misma foto
  // Check tope diario: SELECT progreso_album
  //   Si xp_dia_autor_fecha != hoy: reset xp_dia_autor = 0
  //   Si xp_dia_autor >= 10: no otorgar mas hoy
  // UPDATE usuarios.xp_total += monto
  // UPDATE progreso_album.xp_dia_autor += monto
}
```

### Reset automatico

El reset de contadores se hace inline: si `fecha != hoy`, se resetea el contador correspondiente a 0 antes de validar. Sin tarea programada (mismo patron que `progreso_social` en ADR-015).

---

## Archivos a crear/modificar

### Nuevos

| Archivo | Tipo | Descripcion |
|---|---|---|
| `db/migrations/009_albumes.sql` | SQL | DDL completo: albumes, album_fotos, album_votos, progreso_album |
| `docs/superpowers/specs/2026-09-09-albumes-fotograficos-design.md` | Spec | Este documento |

### Modificados

| Archivo | Cambios | Impacto |
|---|---|---|
| `api/interacciones.js` | +9 tipos GET/POST, +6 misiones, +7 logros, helpers anti-spam | Core del sistema |
| `comunidad.html` | Nuevo tab Mapa + CSS scoped + JS inline | Div balance a verificar |
| `mi-perfil.html` | Seccion "Mis Albumes" + modal creacion | Div balance a verificar |
| `admin.html` | Foto top en tab FOTOS + moderar fotos album | Div balance a verificar |
| `scripts/test_logros_catalogo.js` | 22 -> 29 logros | Verificacion catalogo |
| `scripts/smoke_test_comunidad.js` | Checks actualizados para tab Mapa | Verificacion smoke |

---

## Riesgos y mitigaciones

| # | Riesgo | Mitigacion |
|---|---|---|
| 1 | **Performance UNION mapa:** query con UNION de album_fotos + destinos_fotos puede ser lenta | LIMIT 200; indices en lat/lng (idx_albumes_coords + idx en destinos existente); si es lenta, cachear 60s |
| 2 | **HEAD diferido:** POST solo valida formato, HEAD corre en background | Patron ya validado en BUG-022 (fotos Wikimedia); HEAD como auditoria no bloqueante |
| 3 | **SSRF:** IPs privadas/link-local en URLs de foto | Bloquear 127.0.0.0/8, 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 169.254.0.0/16 en validacion de URL |
| 4 | **DIV balance:** comunidad.html, mi-perfil.html, admin.html cambian | Verificar balance antes/despues de cada cambio (ADR-006, Regla de Oro 2) |
| 5 | **Migraciones previas:** 009 asume 007/008 aplicadas en Neon | Documentar en PENDIENTE: aplicar 007, 008, luego 009 en ese orden |
| 6 | **Conteo de LOGROS:** scripts de verificacion actualizados | test_logros_catalogo.js actualizado a 29 logros antes del deploy |
| 7 | **ASCII-safety:** archivos api/*.js con helpers nuevos | Verificar 0 bytes >127, 0 backticks, 0 doble-escape antes de deploy |
| 8 | **Leaflet CDN:** dependencia externa para mapa | Si CDN cae, mapa no carga pero el resto funciona (degradacion graceful) |

---

## Dependencia de migraciones

```
007_milestones_v2.sql  (PENDIENTE en Neon)
        |
008_comunidad_social.sql  (PENDIENTE en Neon)
        |
009_albumes.sql  (NUEVO, pendiente en Neon)
```

Las 3 deben aplicarse en orden. Sin 007/008, 009 puede fallar si las tablas o columnas de usuarios que referencia ya existen por otras rutas. La migracion 009 es idempotente (IF NOT EXISTS) por ADR-008.

---

## Patron de implementacion (7 pasos, BLUEPRINT.md seccion 6)

1. **Definir campos en tags JSONB:** NO aplica (albumes son tablas propias, no tags de destinos).
2. **Sub-tabs en admin.html:** Nueva seccion "Foto Top" en tab FOTOS + "Moderar Fotos Album".
3. **Funciones JS con prefijo:** `adminFotoTop()`, `adminModerarFoto()`, `adminCargarFotosTop()`.
4. **Registrar en CATEGORY_TAG_FIELDS:** NO aplica (no es tag de destino).
5. **_buildTagsObj():** NO aplica.
6. **Secciones en pagina-destino.js:** Seccion opcional "Foto destacada" (ya parcialmente existente).
7. **loadForm() en admin:** Cargar foto_hero existente al editar destino.

**Nota:** El patron de 7 pasos aplica a categorias nuevas de destinos. Los albumes son un sistema paralelo con sus propias tablas, por lo que los pasos 1/4/5 no aplican. Los pasos 2/3/6/7 si se siguen para las partes que tocan admin.html y pagina-destino.js.

---

## Verificacion (Escudo GOLD, BLUEPRINT.md seccion 8)

1. `node --check api/interacciones.js` -> PASS.
2. ASCII-safety api/*.js -> 0 bytes >127, 0 backticks, 0 doble-escape.
3. Balance divs comunidad.html -> verificar antes/despues.
4. Balance divs mi-perfil.html -> verificar antes/despues.
5. Balance divs admin.html -> verificar antes/despues.
6. `scripts/test_logros_catalogo.js` -> 29/29 PASS.
7. `scripts/smoke_test_comunidad.js` -> checks actualizados PASS.
8. Smoke nuevo de albumes: `scripts/smoke_test_albumes.js` -> PASS.
