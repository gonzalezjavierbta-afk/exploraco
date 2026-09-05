# Mapas temáticos: públicos/privados por usuario

**Fecha:** 2026-09-05
**Estado:** Aprobado en conversación — pendiente revisión de spec
**Archivos afectados:** `db/migrations/006_mapas.sql` (nuevo), `api/interacciones.js` (rutas `?tipo=` nuevas + fix tipo=mapa), `index.html` (panel "Mis mapas", popover de guardado), `mi-perfil.html` (sección "Mis mapas"), `mapas.html` (nuevo, catálogo + detalle público)

## Contexto

Hoy cada usuario tiene un único "Mi Mapa": flat bag de `mm_saved` (localStorage) respaldado por `interacciones(tipo='guardado', activo=true)` en Neon. No existen mapas con nombre, ni múltiples mapas, ni concepto de visibilidad. La sección `#mymapa-section` de index.html ofrece tabs (mapa/lista/estadísticas), un Leaflet con CARTO dark y `shareMyMap()` que comparte una lista de slugs por URL.

La infraestructura serverless Vercel Hobby tiene el presupuesto de **8 funciones API agotado** (`api/`), por lo que toda la lógica nueva debe vivir dentro de archivos existentes vía routing `?tipo=` (nota explícita en `interacciones.js` línea 33). Los usuarios se autentican por email-uuid (`POST /api/usuarios`, `localStorage['exploraco_user']`, `usuario_id` por query/body param), sin passwords ni tokens.

Objetivo: permitir que cada usuario cree múltiples mapas temáticos con nombre, los llene de destinos guardados, los marque **públicos o privados**, y que los públicos sean (a) compartibles por link (`/mapas.html?id=<uuid>`) y (b) descubribles en un catálogo público (`/mapas.html`).

## Decisiones tomadas (aprobadas por el usuario)

1. **Alcance de público:** link compartible + descubrimiento en catálogo `/mapas.html`.
2. **Convivencia:** "Mi Mapa" actual queda intacto (siempre privado). Los mapas temáticos son colecciones adicionales; guardar un destino lo agrega a Mi Mapa como hoy (1 toque, sin fricción) y el usuario elige opcionalmente a cuáles mapas temáticos sumarlo.
3. **Modelo de datos:** relacional (enfoque A) — tablas `mapas` + `mapa_destinos` con FK. Se descartó `destinos uuid[]` en tabla única y JSONB en `usuarios`.
4. **UX de asignación:** botón de guardado + popover "Añadir a mapa…" con checkboxes (opcional; si no se elige, nada cambia).
5. **Catálogo público:** página propia estática `/mapas.html` (grid + detalle `?id=`), client-side, sin gastar slots de API.
6. **Sin XP** en esta feature; no se toca gamificación ni `usuarios.js`.
7. **Sin columna `slug`** en `mapas`: el detalle se sirve vía `?id=<uuid>` (rendering client-side, no requiere SEO server-render).
8. **Fix pre-existente:** `tipo=mapa` devuelve UUIDs pero `mi-perfil.html` espera objetos completos → se corrige para devolver objetos (JOIN destinos, igual que `tipo=guardados`, línea 432) y se ajusta `_hidratarGuardadosDB`/`cargarMiMapa`.

## Migración (db/migrations/006_mapas.sql)

```sql
CREATE TABLE mapas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL REFERENCES usuarios(id),
  nombre varchar(80) NOT NULL,
  emoji varchar(8) DEFAULT '🗺',
  descripcion text,
  publico boolean DEFAULT false,
  creado_en timestamptz DEFAULT now(),
  actualizado_en timestamptz DEFAULT now()
);

CREATE TABLE mapa_destinos (
  mapa_id uuid NOT NULL REFERENCES mapas(id) ON DELETE CASCADE,
  destino_id uuid NOT NULL REFERENCES destinos(id),
  orden int NOT NULL DEFAULT 0,
  creado_en timestamptz DEFAULT now(),
  PRIMARY KEY (mapa_id, destino_id)
);

CREATE INDEX idx_mapas_usuario ON mapas(usuario_id);
CREATE INDEX idx_mapas_publico_creado ON mapas(publico, creado_en DESC);
```

Reglas: Mi Mapa no se migra a estas tablas (queda como está). `ORDER BY creado_en DESC` en el catálogo vía índice `(publico, creado_en DESC)`. Sin tope duro de mapas por usuario en v1.

## API (api/interacciones.js — mismas convenciones `{ok, error}`, ASCII-safe)

### GET — tipos nuevos
| tipo | params | qué devuelve |
|---|---|---|
| `mapas_mios` | `usuario_id` | mapas del usuario: `id, nombre, emoji, descripcion, publico, n_destinos` (JOIN + GROUP BY sobre mapa_destinos) |
| `mapas_publicos` | — | catálogo reciente (publico=true, ORDER BY creado_en DESC, LIMIT 50): `id, nombre, emoji, descripcion, autor (usuarios.nombre), n_destinos, creado_en` |
| `mapa_detalle` | `id`, `usuario_id?` | mapa + destinos completos (JOIN destinos). Si `publico=false` ⇒ solo si `usuario_id` === dueño; si no → `{ok:false, error}` (equivalente 404) |

### POST — mutaciones (todas validan dueño server-side)
| tipo | body | acción |
|---|---|---|
| `mapa_crear` | `usuario_id, nombre, emoji?, descripcion?` | INSERT → `{id, publico:false}` |
| `mapa_editar` | `usuario_id, mapa_id, nombre?, emoji?, descripcion?, publico?` | UPDATE merge de campos dados (SOLO dueño) |
| `mapa_eliminar` | `usuario_id, mapa_id` | DELETE (CASCADE borra mapa_destinos) |
| `mapa_agregar_destino` | `usuario_id, mapa_id, destino_id` | INSERT con `orden = COALESCE(MAX(orden)+1, 0)` por mapa; PK duplicado → `ya_incluido` (sin error) |
| `mapa_quitar_destino` | `usuario_id, mapa_id, destino_id` | DELETE |

### Fix tipo=mapa
`tipo=mapa` pasa a devolver objetos completos de destinos (JOIN destinos: `nombre, slug, foto_hero, ciudad, categoria_slug, lat, lng`) en `{guardados:[], visitados:[]}`, en línea con `tipo=guardados`. Ajustar consumidores en index.html (`_hidratarGuardadosDB`, `cargarMiMapa`) para trabajar con objetos (resolver `_uuid` desde `_uuid` del objeto) manteniendo `mmSaved/mmVisited` (slugs) como fuente local.

## Frontend

### index.html — panel "Mis mapas" en `#mymapa-section`
- Fila "Mis mapas" sobre las tabs actuales: pills `emoji + nombre + n + badge (🔒/🌍)`.
- Por pill: toggle público/privado (switch inline), modal de edición (nombre/emoji/descripción), eliminar con confirm.
- Botón "＋ Nuevo mapa" → modal `{nombre, emoji, descripción}` → `mapa_crear`.
- Clic en pill: filtra Leaflet (`updateMMMarkers`) y lista a los destinos de ese mapa. Tab "Mi Mapa" sigue siendo la vista por defecto.
- Modales reusan los idioms existentes (`#login-modal`, backdrop click, Escape, `body.style.overflow='hidden'`).

### index.html — popover de guardado
- `toggleDestSave()` sigue guardando a Mi Mapa inmediatamente.
- Con sesión activa: popover "Añadir a mapa…" anclado al botón con checkboxes de mapas temáticos + "＋ Nuevo" + toast de confirmación. Elegir es opcional.
- Alcance v1: solo tarjetas de index.html. Las 92 páginas `pagina-destino-*.html` quedan fuera (el botón sigue guardando a Mi Mapa) — follow-up.

### mapas.html (nuevo, estático, client-side)
- **Grid:** tarjetas de mapas públicos recientes (emoji, nombre, autor, n destinos, fecha). Fuente: `mapas_publicos`.
- **Detalle (`?id=`):** Leaflet CARTO dark + teardrops con los pins del mapa, lista lateral de destinos (enlace al slug), tarjeta de autor + CTA "Crea tu propio mapa". Fuente: `mapa_detalle`.
- Cero slots de API: consume solo interacciones.js.

### mi-perfil.html
- Sección "Mis mapas": fila de tarjetas (emoji, nombre, n, toggle público) vía `mapas_mios`.
- El fix de `tipo=mapa` (1.2) resuelve el bug de la grilla actual.

## Edge cases / reglas
- **Anónimos:** ven catálogo y detalle públicos; intentar crear/toggle → `mostrarLogin()`.
- **Seguridad:** mutaciones y detalle-privado validan `usuario_id` dueño server-side.
- **clearMyMap()** borra solo guardados (Mi Mapa); NO borra mapas temáticos.
- **Sin XP**, sin cambios en `usuarios.js`, sin cambios en las 92 páginas de destino.
- Todo el código nuevo ASCII-safe (Reglas de Oro v5); texto plano sin tildes en código.

## Testing
- `node --check` en `api/interacciones.js` y verificación ASCII (0 bytes >127).
- Smoke contra API de prueba: crear → agregar destino → duplicar (ya_incluido) → quitar → toggle público → privado (otro usuario no ve) → eliminar (cascade).
- `mapas.html`: grid muestra el mapa público recién creado; `?id=` muestra pins; mapa privado → oculto/404 para terceros.
- Harness Node vm (patrón del spec de map clustering) para popover/toggle/serialize si aplica.
- Auditoría con qa-auditor (Escudo GOLD) antes de desplegar.