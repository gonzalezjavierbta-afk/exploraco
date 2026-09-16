# Spec de diseno: Galeria unificada de la ficha de destino (curadas + viajeros + albumes)

**Fecha:** 2026-09-15
**Autor:** architect (AI-DOS), por encargo del Chief Architect
**Estado:** IMPLEMENTADO (MVP) el 2026-09-16 en el lote TSK-105 -- **PENDIENTE aplicar la migracion 004 (`scripts/apply_004_foto_url.js`) + el dedupe con indice unico (`scripts/dedupe_destinos_fotos.js --apply`) en Neon + commit/push/deploy.** El diseno de las secciones 1-8 se conserva como referencia; las 5 desviaciones reales de la implementacion estan reconciliadas en la seccion **0-bis**.
**ADR propuesto:** ADR-030 (siguiente consecutivo real; el mayor registrado en `exploraco desarrollo/DECISIONS.md` es ADR-029). **Registrado como ADR-030 el 2026-09-16.**
**Alcance:** SOLO la ficha de destino (`api/pagina-destino.js` + `api/interacciones.js`). `galeria.html` NO se modifica.
**Reglas aplicadas:** ADR-002 (ASCII-safe), ADR-003 (Cero Borrado Logico / merge), ADR-004 (CSS scoped), ADR-006 (baseline = archivo real), ADR-001 (presupuesto 8/8 de endpoints; el limite de 8 funciones serverless se origina en ADR-001, NO en ADR-010 -- ver la nota de correccion de citas en `DECISIONS.md`), ADR-017 (albumes), ADR-022 (constraints), ADR-023 (lectura de media).

---

## 0. Verificacion de baseline contra el archivo real (ADR-006)

Todos los numeros de linea de esta spec fueron verificados por volcado directo del
archivo en disco el 2026-09-15 (no se confio en cifras citadas en otros documentos
ni en lecturas previas de sesion).

| Evidencia | Archivo:linea real | Que es |
|---|---|---|
| `var galAll = [];` + dedup por URL | `api/pagina-destino.js:726-734` | Array de fotos curadas de la ficha (ya deduplica por URL normalizada) |
| `SELECT url,caption FROM destinos_fotos ... LIMIT 12` | `api/pagina-destino.js:2438-2441` | Lectura server-side de fotos curadas |
| `var secGaleria = ... id="galeria"` | `api/pagina-destino.js:1497-1502` | Seccion `#galeria` (SSR) |
| `var lbHTML = ...` | `api/pagina-destino.js:1508-1515` | Lightbox de la galeria curada |
| `var secFotos = ... id="fotos"` | `api/pagina-destino.js:1934-1943` | Seccion `#fotos` ("Fotos de viajeros", shell) |
| `subnavItems` (`{id:'galeria'...}`) | `api/pagina-destino.js:1999-2046` (item en 2001) | Subnav sticky; NO existe item `#fotos` |
| `+ secGaleria +` / `+ secFotos +` | `api/pagina-destino.js:2133` / `2151` | Ensamblado de ambas secciones en el body |
| `var GAL_ALL=` | `api/pagina-destino.js:2320` | Set de URLs del lightbox (reconstruible en runtime) |
| `function loadFotos/subirFoto/votarFoto` | `api/pagina-destino.js:2347` / `2366` / `2386` | JS cliente de `#fotos` |
| GET `tipo=fotos` | `api/interacciones.js:2457-2479` | Fotos de viajeros (`tipo='foto'`), `votos`/`ya_votado` |
| GET `tipo=albumes` | `api/interacciones.js:3310-3345` | Listado de albumes (`usuario_id`, `limit<=50`, `orden`) |
| GET `tipo=galeria_destino` | `api/interacciones.js:3399-3457` | Curadas (`gdFotos`) + albumes cercanos (`gdUsuarios`) |
| - `gdFotos` (sin `id`) | `api/interacciones.js:3416-3421` | `SELECT url, caption, orden` |
| - `gdUsuarios` (cercania `ABS(...) < 0.01`) | `api/interacciones.js:3426-3439` | `LIMIT 100 ORDER BY votos DESC` |
| POST `tipo=foto_voto` | `api/interacciones.js:4832-4866` | Voto en `interacciones.tipo='foto'` (dims `voto_foto_id`), +5 XP |
| POST `tipo=album_agregar_foto` | `api/interacciones.js:4930-4995` | Guardar en album, dedup + XP |
| POST `tipo=album_voto` | `api/interacciones.js:4998-5027` | Voto en `album_fotos` (tabla `album_votos`), +5 XP |
| Catch global 42P01/42703 -> 503 | `api/interacciones.js:6632-6633` | Degradacion actual: 503 `SCHEMA_NOT_MIGRATED` |
| `album_votos` PK `(usuario_id, foto_id)` | `db/migrations/009_albumes.sql:64-70` | Dedup del voto de album |
| `idx_album_fotos_dedup (album_id, foto_url, autor_original_id)` | `db/migrations/009_albumes.sql:101-102` | Dedup de "guardar en album" |
| `usuarios.foto_url` / `ciudad_base` | `db/migrations/004_usuarios_blog_autor.sql:6-10` | Migracion 004 (causa de los 503 actuales) |
| `SELECT destino_id FROM destinos_fotos WHERE id=$1` | `api/utilidades.js:269` | Confirma que `destinos_fotos.id` EXISTE y es usable |
| `gLoadDestino` (contrato consumido) | `galeria.html:462-504` (fetch en 467) | Consume `res.destino`, `res.fotos`, `res.usuarios` |

**Hallazgo relevante (ADR-006):** `galAll` en disco YA deduplica por URL
(`api/pagina-destino.js:726-733`), lo cual valida que la deduplicacion por URL es
un patron ya aceptado en la ficha. Ademas, `destinos_fotos.id` existe y se usa en
`api/utilidades.js:269`, por lo que el voto de fotos curadas puede apoyarse en un
identificador estable sin migracion de esquema.

**Correccion de contexto:** en el working tree hay un archivo sin versionar
`scripts/apply_004_foto_url.js` (aplica la migracion 004 en Neon, idempotente) que
confirma la causa raiz de los 503: `usuarios.foto_url` ausente en produccion.

---

## 0-bis. Estado real de implementacion y reconciliacion de contradicciones (ADR-006, 2026-09-16)

Esta spec se implemento en el lote TSK-105; la decision final vive en
`exploraco desarrollo/DECISIONS.md` ADR-030 y la tarea en `TASKS.md` TSK-105. El
diseno de las secciones 1-8 se mantiene como referencia, pero el alcance REAL
ejecutado difiere en 5 puntos que se reconcilian aqui (Regla de Oro 3: la
propuesta original no se borra, se anota su desviacion):

- **(a) El voto de fotos curadas queda FUERA del MVP.** No se implemento
  `tipo_voto='curada'` ni el tipo `foto_curada_voto` descritos en las secciones
  2.2, 3.2 y en el criterio de aceptacion 4. Las tarjetas curadas viajan con
  `tipo_voto=null` y NO son votables. Se vota SOLO viajeros
  (`POST tipo=foto_voto`) y album (`POST tipo=album_voto`).
- **(b) `items[]` SOLO se emite si el cliente envia `incluir`.** No es "siempre
  aditivo": sin `incluir` la clave no se emite, de modo que `galeria.html` (que
  nunca lo envia) recibe exactamente el contrato previo. Ademas `origen='album'`
  queda APAGADO por defecto y solo aparece con `incluir=albumes`.
- **(c) `destinos_fotos.id` NO es un ancla estable.** La implementacion adopto la
  semantica REPLACE de `destinos_fotos` (dedupe por url + DELETE + reinsert,
  registrada como BUG-056), que RE-CREA las filas en cada guardado. Por eso el
  `id_origen` de las curadas no sirve como ancla de voto; esto refuerza (a). La
  afirmacion de la seccion 0 ("el voto de fotos curadas puede apoyarse en un
  identificador estable") queda INVALIDADA.
- **(d) `autor_original_id` null:** el backend lo normaliza con
  `body.autor_original_id || usuarioId2` y el dedup de "guardar en album" se hace
  por SELECT, NO por el indice unico `idx_album_fotos_dedup` (en Postgres los NULL
  son distintos y desactivarian el dedup). Se confirma la nota critica de la
  seccion 4.2.
- **(e) Delta real de `album_voto`:** el unico cambio es invocar
  `repartirXpReferidos(sql, usuarioId, 5)` (cierre del gap de la piramide,
  ADR-027). No se anadio ningun otro hook (fama/cromos) ni cambio su
  persistencia (`album_votos`, PK).

---

## 1. Contexto y problema

La ficha de destino tiene HOY dos modulos de fotos separados y desconectados:

1. `#galeria` (curada): SSR desde `destinos_fotos` (`api/pagina-destino.js:2438-2441`),
   armada en `galAll` (`:726-734`) y renderizada en `secGaleria` (`:1497-1502`).
   No tiene votos ni interaccion alguna.
2. `#fotos` ("Fotos de viajeros"): shell SSR (`:1934-1943`) hidratado por cliente con
   `GET /api/interacciones?tipo=fotos` (`:2457-2479`), con voto via
   `POST tipo=foto_voto` (`:4832-4866`) y subida de URL con +15 XP.

Problemas de producto y deuda:

- Dos grillas de fotos en la misma ficha, sin unidad visual ni editorial.
- Solo las fotos de viajeros se pueden votar (+5 XP). Las curadas no.
- No existe UI en la ficha para **guardar una foto en un album**, aunque el endpoint
  (`POST tipo=album_agregar_foto`, `:4930`) y el listado (`GET tipo=albumes`, `:3310`)
  ya existen. Es la brecha G-07/D-12 documentada en `ExploraCO_Sistema_Social_v5.md`.
- `album_voto` (`:4998-5027`) existe en backend pero **no tiene ningun frontend** que
  lo invoque; las fotos de albumes geolocalizadas ya viajan en `galeria_destino`
  (`gdUsuarios`) pero `#galeria` no sabe votarlas.
- Existe un tercer origen disponible y subutilizado: fotos de albumes de usuarios
  geolocalizadas cerca del destino (`tipo=galeria_destino`, `:3426-3439`), hoy solo
  consumidas por `galeria.html`.

Objetivo: **un unico modulo `#galeria`** en la ficha que muestre curadas + viajeros +
albumes, permita votar cualquier foto y guardar cualquier foto en un album, **sin
crear endpoints nuevos** (ADR-010), **sin romper `galeria.html`** y **degradando**
si el esquema de Neon no esta migrado.

---

## 2. Contrato de datos unificado propuesto

### 2.1 Decision de contrato: aditivo, no sustitutivo

Se **extiende** la respuesta de `GET /api/interacciones?tipo=galeria_destino`
(ADR-010: extender existente via query params) con una clave NUEVA `items[]`
normalizada, y se **conservan intactas** las claves `fotos[]` y `usuarios[]` que ya
consume `galeria.html:462-504`. `galeria.html` ignora las claves y campos
desconocidos, por lo que la extension es de regresion cero.

Envelope resultante:

```
{
  "ok": true,
  "destino": { "id": "...", "nombre": "...", "slug": "...", "ciudad": "...", "lat": 0, "lng": 0 },
  "fotos":   [ ... ],   // LEGACY (galeria.html) + "id"/"votos"/"ya_votado" aditivos
  "usuarios":[ ... ],   // LEGACY (galeria.html) + "ya_votado"/"es_propia" aditivos
  "items":   [ ... ]    // NUEVO: grilla unificada (la ficha la consume)
}
```

### 2.2 Shape JSON exacto por foto (`items[]`)

TODAS las fotos, sin importar su origen, se normalizan a este unico shape:

```
{
  "origen": "curada" | "viajero" | "album",
  "id_origen": "uuid (string)",
  "tipo_voto": "curada" | "foto" | "album",
  "url": "https://...",
  "caption": "string (puede ser vacio)",
  "votos": 0,
  "ya_votado": false,
  "es_propia": false,
  "autor_id": "uuid | null",
  "autor_nombre": "string | null",
  "autor_avatar": "string (puede ser vacio)",
  "album_id": "uuid | null",
  "album_titulo": "string | null",
  "foto_type": "foto" | "video" | "audio",
  "media_source": "string | null",
  "creado_en": "ISO8601 | null"
}
```

Semantica de campos clave:

- `origen`: fuente persistente de la foto.
- `id_origen`: PK de la entidad de origen. Es el valor que viaja al POST de voto
  y de "guardar en album".
- `tipo_voto`: mecanismo de voto a invocar. Se separa de `origen` para permitir
  futuros origenes que reusen el voto de `foto` o `album` sin cambiar el cliente.
- `votos`: conteo derivado (COUNT), nunca columna persistida (patron del proyecto).
- `ya_votado`: true solo si el `usuario_id` del request ya voto ESA foto con ESE
  mecanismo. Sin `usuario_id` siempre es false.
- `es_propia`: true si el autor de la foto es el `usuario_id` del request. Para
  `curada` es siempre false (no tiene autor de usuario).
- `album_id`/`album_titulo`: solo para `origen='album'`; null en el resto.
- `foto_type`: `curada` y `viajero` son siempre `foto`; `album` respeta
  `album_fotos.foto_type`.

### 2.3 Tabla de mapeo campo por campo

| Campo `items[]` | `origen=curada` | `origen=viajero` | `origen=album` |
|---|---|---|---|
| `id_origen` | `destinos_fotos.id` | `interacciones.id` | `album_fotos.id` |
| `url` | `destinos_fotos.url` | `interacciones.texto` | `album_fotos.foto_url` |
| `caption` | `destinos_fotos.caption` | `''` | `album_fotos.media_title` |
| `votos` | COUNT `interacciones` tipo=`foto_curada_voto`, `dims->>'voto_curada_id'` | COUNT `interacciones` tipo=`foto`, `dims->>'voto_foto_id'` | COUNT `album_votos` por `foto_id` |
| `ya_votado` | fila `interacciones` tipo=`foto_curada_voto` con `voto_curada_id` | fila `interacciones` tipo=`foto` con `voto_foto_id` | fila `album_votos` `(usuario_id, foto_id)` |
| `es_propia` | false | `usuario_id === autor_id` | `autor_original_id === usuario_id` |
| `autor_id` | null | `interacciones.usuario_id` | `album_fotos.autor_original_id` |
| `autor_nombre` | null | `usuarios.nombre` | `usuarios.nombre` |
| `autor_avatar` | `''` | `COALESCE(usuarios.foto_url, usuarios.avatar_url, '')` | idem |
| `album_id` / `album_titulo` | null / null | null / null | `albumes.id` / `albumes.titulo` |
| `foto_type` | `'foto'` | `'foto'` | `album_fotos.foto_type` |
| `media_source` | `'destinos_fotos'` | null | `album_fotos.media_source` |
| `creado_en` | `destinos_fotos.creado_en` (aditivo al SELECT) | `interacciones.creado_en` | `album_fotos.creado_en` |

### 2.4 Extension de params de `tipo=galeria_destino`

Todos opcionales y aditivos (backward compatible):

| Param | Valores | Ausente = |
|---|---|---|
| `slug` | slug del destino | (legacy) |
| `destino_id` | uuid | (legacy) |
| `usuario_id` | uuid del visitante | `items[].ya_votado=false`, `es_propia=false` |
| `incluir` | CSV de `viajeros,albumes` | `items[]` solo con `origen='curada'` |

La ficha llamara siempre con
`?tipo=galeria_destino&slug=<slug>&incluir=viajeros,albumes&usuario_id=<uid|>`
para obtener la grilla completa. `galeria.html` sigue llamando sin `incluir` ni
`usuario_id` (`galeria.html:467`) y recibe exactamente el contrato actual + `items`.

### 2.5 Rama SQL propuesta (pseudocodigo)

Se conserva el bloque actual de `:3399-3457` y se reorganiza sin cambiar la
respuesta legacy:

```
if (tipo === 'galeria_destino') {
  // --- (LEGACY, sin cambios de forma) ---
  resolver destino por slug|destino_id                  // igual que hoy
  gdFotos = SELECT id, url, caption, orden, creado_en
              FROM destinos_fotos WHERE destino_id=$1 ORDER BY orden ASC
  //    ^ "id" y "creado_en" son ADITIVOS al SELECT actual (:3416-3421)

  gdUsuarios = SELECT af.id, af.foto_url, af.foto_type, af.media_title,
                      a.id AS album_id, a.titulo AS album_titulo, a.ciudad,
                      u.nombre AS autor_nombre, u.id AS autor_id,
                      COALESCE(u.foto_url, u.avatar_url, '') AS autor_avatar,
                      (SELECT COUNT(*) FROM album_votos av WHERE av.foto_id=af.id) AS votos,
                      af.creado_en, af.autor_original_id
               FROM album_fotos af JOIN albumes a ... (cercania ABS(lat-lng)<0.01)
  //    ^ identico en filtro/orden; se le agregan autor_id/creado_en/af.autor_original_id

  // --- (NUEVO) personalizacion y origenes extra ---
  uid        = req.query.usuario_id || null
  incluir    = parseCSV(req.query.incluir)          // [] si ausente
  quieroViaj = incluir.contains('viajeros')
  quieroAlb  = incluir.contains('albumes')

  gdViajeros = []
  yaVotoFoto = {} ; yaVotoAlbum = {} ; yaVotoCurada = {}
  if (quieroViaj) {
    gdViajeros = SELECT f.id, f.texto AS url, f.usuario_id AS autor_id,
                        u.nombre AS autor_nombre,
                        COALESCE(u.foto_url, u.avatar_url, '') AS autor_avatar,
                        f.creado_en,
                        (SELECT COUNT(*) FROM interacciones fv
                         WHERE fv.tipo='foto' AND fv.activo=true
                           AND fv.dims->>'voto_foto_id' = f.id::text) AS votos
                 FROM interacciones f LEFT JOIN usuarios u ON u.id=f.usuario_id
                 WHERE f.destino_id=$1 AND f.tipo='foto' AND f.activo=true
                   AND (f.dims IS NULL OR NOT (f.dims ? 'voto_foto_id'))
                 ORDER BY f.creado_en DESC LIMIT 60
    // NOTA: se excluyen filas de voto (dims.voto_foto_id) igual que :2464
    // NOTA: se deben excluir tambien las filas de voto curado
    //       (NOT (f.dims ? 'voto_curada_id')) -- ver impacto en 5.3
  }

  if (uid) {
    // una sola pasada por tabla para ya_votado
    yaVotoFoto   = { dims.voto_foto_id   } de interacciones tipo='foto'
    yaVotoCurada = { dims.voto_curada_id } de interacciones tipo='foto_curada_voto'
    yaVotoAlbum  = { foto_id }            de album_votos WHERE usuario_id=$1
  }

  // Conteo de votos curados (una sola query agregada sobre los ids de gdFotos)
  votosCurada = SELECT dims->>'voto_curada_id' AS id, COUNT(*) FROM interacciones
                WHERE tipo='foto_curada_voto' AND activo=true
                  AND dims->>'voto_curada_id' = ANY($ids) GROUP BY 1

  // --- Ensamblado de items[] ---
  items = []
  gdFotos.forEach(f => items.push({ origen:'curada', id_origen:f.id, tipo_voto:'curada',
        url:f.url, caption:f.caption||'', votos:votosCurada[f.id]||0,
        ya_votado:!!yaVotoCurada[f.id], es_propia:false, autor_id:null,
        autor_nombre:null, autor_avatar:'', album_id:null, album_titulo:null,
        foto_type:'foto', media_source:'destinos_fotos', creado_en:f.creado_en||null }))
  gdViajeros.forEach(f => items.push({ origen:'viajero', id_origen:f.id, tipo_voto:'foto',
        url:f.url, caption:'', votos:f.votos, ya_votado:!!yaVotoFoto[f.id],
        es_propia:(uid && f.autor_id===uid), autor_id:f.autor_id, ... }))
  if (quieroAlb) gdUsuarios.forEach(f => items.push({ origen:'album', id_origen:f.id,
        tipo_voto:'album', url:f.foto_url, caption:f.media_title||'', votos:f.votos,
        ya_votado:!!yaVotoAlbum[f.id], es_propia:(uid && f.autor_id===uid),
        autor_id:f.autor_id, autor_nombre:f.autor_nombre, autor_avatar:f.autor_avatar,
        album_id:f.album_id, album_titulo:f.album_titulo,
        foto_type:f.foto_type||'foto', media_source:f.media_source||null,
        creado_en:f.creado_en||null }))

  items = dedupPorUrl(items)   // ver 2.6

  return { ok:true, destino, fotos:gdFotos, usuarios:gdUsuarios, items:items }
}
```

Se debe envolver cada query NUEVA en un fallback degradado (ver seccion 5).

### 2.6 Deduplicacion por URL (solo presentacion)

La misma URL puede aparecer en mas de un origen (p. ej. una curada repineada a un
album, o una foto de viajero guardada en un album). Dentro de `items[]` se deduplica
por clave `url.trim().toLowerCase()`, manteniendo UNA tarjeta con esta precedencia:

`curada` (3) > `viajero` (2) > `album` (1)

- Es deduplicacion de RENDER, no borra datos (`Cero Borrado Logico`, ADR-003): las
  filas siguen en `destinos_fotos`/`interacciones`/`album_fotos` y visibles donde
  corresponda (`galeria.html`, modales de album).
- Nunca se suman votos de dos mecanismos distintos para la misma URL: la tarjeta
  conservada trae solo SUS `votos` y SU `tipo_voto`.
- La constante de precedencia debe vivir en un unico lugar (helper `dedupPorUrl`).

---

## 3. Decision sobre el VOTO (unificacion sin duplicar logica)

### 3.1 Mecanismos existentes

| Origen | Mecanismo | Persistencia | Dedup | XP |
|---|---|---|---|---|
| `viajero` | `POST tipo=foto_voto` (`:4832`) | fila `interacciones` tipo=`foto`, `dims.voto_foto_id` | SELECT previo -> 409 | +5 XP votante (+ reparto referidos) |
| `album` | `POST tipo=album_voto` (`:4998`) | fila `album_votos` PK `(usuario_id, foto_id)` | PK -> 23505 -> 409 | +5 XP votante (NO reparte referidos hoy) |
| `curada` | NO EXISTE | - | - | - |

### 3.2 Decision

1. **Cliente unificado:** una sola funcion `votarGalItem(id_origen, tipo_voto, btn)`
   que despacha por `tipo_voto`:
   - `tipo_voto='album'` -> `POST { tipo:'album_voto', usuario_id, foto_id:id_origen }`
   - `tipo_voto='foto'`   -> `POST { tipo:'foto_voto', usuario_id, origen:'viajero', foto_id:id_origen }`
   - `tipo_voto='curada'` -> `POST { tipo:'foto_voto', usuario_id, origen:'curada', curada_id:id_origen }`
   La antigua `votarFoto` (`api/pagina-destino.js:2386`) se conserva como alias delgado
   que delega en `votarGalItem` (Cero Borrado Logico de identificadores).

2. **Servidor: extender `foto_voto` con `origen` (NO crear endpoints ni ramas
   nuevas de voto).** Se introduce un helper unico
   `insertarVotoInteraccion(sql, { destinoId, usuarioId, tipoFila, dimKey, targetId })`
   usado por los dos sub-casos de `foto_voto`:
   - `origen` ausente o `'viajero'`: comportamiento actual (tipoFila=`foto`,
     dimKey=`voto_foto_id`, target=`foto_id`).
   - `origen='curada'`: `destinoId` se resuelve de `destinos_fotos.destino_id`;
     tipoFila=`foto_curada_voto`, dimKey=`voto_curada_id`, target=`curada_id`.
   El helper hace: validar target, 404 si no existe, 403 si es propia, 409 si ya
   voto, INSERT, `+5 XP`, `repartirXpReferidos`, `evaluarMisiones/evaluarLogros`.
   Con esto, la logica de voto existe UNA sola vez en el archivo.

3. **Album se mantiene tal cual** (`album_votos`, PK). No se migra su persistencia:
   es la decision de ADR-017/ADR-022 y funciona.

4. **Por que NO una tabla unica de votos:** unificar en `album_votos` obligaria a
   migrar datos y a cambiar el tipo de `foto_id`; unificar todo en `interacciones`
   obligaria a materializar las fotos curadas como filas y romperia `destinos_fotos`.
   Ambas son migraciones de esquema costosas (ADR-008) sin beneficio frente a la
   extension de `foto_voto` + el dispatcher cliente.

### 3.3 Regla de "un voto por usuario por foto"

- `viajero`: dedup por SELECT de `interacciones` (patron actual).
- `curada`: dedup por SELECT de `interacciones` tipo=`foto_curada_voto`
  (`dims.voto_curada_id`).
- `album`: dedup por PK `(usuario_id, foto_id)` (23505 -> 409).
- En los tres casos: 403 si `es_propia`; +5 XP; el cliente refresca la tarjeta.

### 3.4 Discrepancia conocida a cerrar en la implementacion

`album_voto` (`:4998-5027`) es la unica fuente de XP de "foto" que **no** llama a
`repartirXpReferidos` ni a los hooks de fama/cromos (documentado en
`ExploraCO_Gamificacion_v5_Plan_Maestro.md`). Al exponer `album_voto` en la UI
unificada ese gap se hace visible. **Decision propuesta:** incluir en el mismo PR el
`repartirXpReferidos(sql, usuarioId, 5)` en `album_voto` para consistencia de la
piramide (ADR-027), o bien registrarlo explicitamente como deuda aceptada. Se
recomienda la primera.

---

## 4. Decision sobre GUARDAR EN ALBUM

No existe UI hoy; el endpoint ya esta completo (`POST tipo=album_agregar_foto`,
`:4930-4995`). Decision: **consumirlo sin cambios de backend**, con un mini-selector
de albumes propios.

### 4.1 Flujo cliente

1. Usuario pulsa "Guardar en album" en una tarjeta de `items[]`.
2. Sin sesion -> modal de login (`window.ExploraCO.mostrarLogin`). Con sesion ->
   `GET /api/interacciones?tipo=albumes&usuario_id=<uid>&limit=50`
   (`:3310-3345`).
3. Popover `.gal-albpop` bajo el boton con: lista de albumes (`titulo`,
   `fotos_count`), estado vacio ("Aun no tienes albumes; crea uno en nivel 2") y,
   opcionalmente, alta rapida via `POST tipo=album_crear` (ya existe, gate nivel 2).
4. Al elegir album -> `POST { tipo:'album_agregar_foto', usuario_id, album_id,
   foto_url, foto_type, media_title, media_source, autor_original_id }`.
5. Feedback: exito -> toast "Guardada en <album>"; 409 -> "Ya esta en ese album";
   429 -> "Limite diario alcanzado"; 403/401 -> login.

### 4.2 Mapeo por origen (payload de guardado)

| Campo POST | `curada` | `viajero` | `album` |
|---|---|---|---|
| `foto_url` | `item.url` | `item.url` | `item.url` |
| `foto_type` | `'foto'` | `'foto'` | `item.foto_type` |
| `media_title` | `item.caption` | `''` | `item.caption` |
| `media_source` | `'destinos_fotos'` | `null` | `item.media_source` |
| `autor_original_id` | omitir (null) | `item.autor_id` si `!= uid`; si no, omitir | `item.autor_id` si `!= uid`; si no, omitir |

**Nota critica de dedup:** el indice unico `idx_album_fotos_dedup` es
`(album_id, foto_url, autor_original_id)` (`db/migrations/009_albumes.sql:101-102`).
En PostgreSQL los `NULL` son distintos entre si en un indice unico, por lo que
enviar `autor_original_id = null` **desactivaria el dedup**. El backend ya evita esto
con `body.autor_original_id || usuarioId2` (`:4951`), de modo que omitir el campo es
seguro (cae al `usuario_id` solicitante). El cliente debe OMITIR el campo cuando no
haya autor, nunca enviarlo explicito en null.

**XP esperado:** +15 XP al que guarda; +10 XP al autor original si es foto de otro
(tope 10 XP/dia, `:4975-4986`).

---

## 5. Plan de UI

### 5.1 Una sola seccion `#galeria`

- Se reemplazan `secGaleria` (`:1497-1502`) y `secFotos` (`:1934-1943`) por UNA
  seccion `secGaleriaUnificada` con `id="galeria"`.
- **Cero Borrado Logico de anclas:** dentro de la seccion se emite un ancla invisible
  `<span id="fotos"></span>` para no romper deep-links historicos a `#fotos`.
- Se conserva el bloque de subida (`#fp-url` + boton "Subir foto (+15 XP)") y su
  gating por capacidad `subir_fotos` (nivel 2) tal como hoy (`:2346`, `:2366`).
- Subnav: ya existe un unico item `{id:'galeria', label:'Fotos'}` (`:2001`); no hay
  item `#fotos`, por lo que no hay cambio de subnav. La condicion `has` pasa a
  `!!secGaleriaUnificada`.
- Ensamblado: se elimina la linea `+ secGaleria` (`:2133`) y `+ secFotos` (`:2151`)
  y se agrega una sola `+ secGaleriaUnificada` en la posicion de `secGaleria`.

### 5.2 Estructura de la seccion (SSR + hidratacion)

```
<section class="ssec bwarm" id="galeria">
  <span id="fotos"></span>                         <!-- ancla legacy -->
  <div class="sin">
    <div class="strow">... "Galeria de fotos" ... <span id="gal-count"></span></div>
    <div id="gal-chips">Todas | Curadas | Viajeros | Comunidad</div>  <!-- opcional MVP -->
    <div class="gal-main" id="gal-main">...</div>   <!-- foto principal (curada[0]/hero) -->
    <div class="gal-grid" id="gal-grid">            <!-- SSR: tarjetas curadas -->
      <div class="gal-card" data-origen="curada" data-id="...">...</div>
    </div>
    <div class="fp-upload" id="fp-upload">...</div> <!-- subir foto, gating intacto -->
    <div class="wrok" id="fp-ok">...</div>
  </div>
</section>
```

- **SSR** pinta las fotos curadas (SEO y no-JS) reutilizando `galAll`.
- **Hidratacion cliente** (progressive enhancement): una llamada
  `GET /api/interacciones?tipo=galeria_destino&slug=<slug>&incluir=viajeros,albumes&usuario_id=<uid|>`
  y re-render de `#gal-grid` con `items[]` (tarjetas con badge de origen, autor,
  votos, boton voto y boton guardar). Si la llamada falla, la grilla SSR queda
  intacta (degradacion).
- **Lightbox:** tras hidratar, reasignar `GAL_ALL` (declarado `var` en `:2320`) al
  arreglo de URLs de `items[]` para que el lightbox navegue TODO el set unificado,
  no solo las curadas.

### 5.3 Tarjeta de la grilla (componente unico)

Contenido por tarjeta:
- `<img>` (o poster si `foto_type != 'foto'`) + badge de origen
  (`Curada` / `Viajero` / `Comunidad`).
- `caption` (si existe) y `autor_nombre` + `autor_avatar` (si existen).
- Boton voto: `votarGalItem(id_origen, tipo_voto, this)`; estado `ya_votado`;
  deshabilitado si `es_propia` (no auto-voto).
- Boton "Guardar en album": `abrirAlbumPicker(item)`; oculto/deshabilitado sin
  sesion (dispara login).
- Al hacer click en la imagen: `abrirLightbox(indiceEnGAL_ALL)`.

CSS scoped bajo `#galeria` (ADR-004, Reset de Silo):
`#galeria .gal-grid`, `#galeria .gal-card`, `#galeria .gal-badge`,
`#galeria .gal-vote`, `#galeria .gal-save`, `#galeria .gal-albpop`.

### 5.4 Interacciones con la subida de foto

`subirFoto` (`:2366`) pasa a refrescar la galeria unificada (misma funcion de carga)
en vez de `loadFotos`. Todo el copy y el gating de nivel 2 se conservan.

---

## 6. Plan de degradacion

Objetivo: que la ausencia de migraciones en Neon NUNCA tumbe la ficha completa
(hoy cualquier columna faltante escala al catch global `:6632-6633` y devuelve
503 `SCHEMA_NOT_MIGRATED` para TODO el endpoint).

| Escenario | Comportamiento actual | Comportamiento disenado |
|---|---|---|
| `usuarios.foto_url` ausente (migracion 004) | 42703 -> 503 | Query `gdUsuarios`/`gdViajeros` con fallback: si 42703, reintentar sin `u.foto_url` (`'' AS autor_avatar`); el resto de la galeria sigue 200 |
| `album_fotos`/`album_votos`/`albumes` ausentes (migracion 009) | 42P01 -> 503 | `gdUsuarios=[]` y `items` sin `origen='album'`; se conservan curadas y viajeros |
| `interacciones` sin filas de viajeros | lista vacia | `items` solo con curadas; grilla SSR intacta |
| `destinos_fotos` vacio | `secGaleria` no se renderiza | la seccion se renderiza igual (la viajeros/albumes puede llenarla); grilla SSR vacia y estado "Se el primero" |
| Sin sesion | - | `ya_votado=false`, `es_propia=false`; voto/guardar abren login |
| Voto duplicado | 409 `ya_votado` | se conserva; la tarjeta se marca votada |
| Guardado duplicado | 409 (`:4961`) | toast "Ya esta en ese album" |
| Fallo de red en la hidratacion | grilla `#fotos` atascada | grilla SSR de curadas permanece; sin spinner infinito |

Regla: la degradacion NUNCA debe silenciar un fallo de escritura (Regla de Oro 2 /
prohibicion de catch generico). El fallback de LECTURA puede degradar; el POST debe
seguir devolviendo el error tipificado (400/403/409/429/503).

---

## 7. Riesgos

1. **Regresion del contrato de `galeria.html` (doble fuente de verdad).**
   Si se cambia la forma de `fotos[]`/`usuarios[]`, se quita alguna clave o se
   elimina el ancla `#fotos`, se rompe `galeria.html:462-504` y los deep-links.
   *Mitigacion:* `items[]` es estrictamente aditivo; `fotos`/`usuarios` conservan su
   forma (solo se agregan campos); `galeria.html` no se toca; smoke de paridad del
   contrato legacy como criterio de cierre.

2. **Triple mecanismo de voto: doble conteo / drift de XP / farming.**
   Con tres origenes y dos tablas de dedup, un mismo URL en dos origenes podria
   generar dos votos, o el mismo usuario podria "reciclar" XP; sumado a la
   discrepancia de `album_voto` (no reparte referidos), el libro de XP queda
   inconsistente. *Mitigacion:* `dedupPorUrl` antes de renderizar (un solo `tipo_voto`
   por URL), `origen` explicito en el POST, no sumar votos cross-origen, y cerrar la
   discrepancia de `repartirXpReferidos` en `album_voto` en el mismo PR (o registrarla
   como deuda aceptada).

3. **503 por esquema no migrado (`usuarios.foto_url`, tablas de albumes).**
   El catch global convierte 42703/42P01 en 503 y tumbar la ficha entera; la
   galeria unificada amplifica la superficie (mas queries dependientes de columnas
   nuevas). *Mitigacion:* fallbacks de lectura por query (seccion 6), ejecutar la
   migracion 004 (script ya presente `scripts/apply_004_foto_url.js`) antes del
   deploy, y verificar 009 en Neon.

Riesgos secundarios:
- **XSS en el cliente:** todo `caption`/`autor_nombre`/`album_titulo` debe escaparse en
  el innerHTML del re-render de la grilla (patron de escape ya usado en la ficha).
- **Perf:** `gdViajeros` (LIMIT 60) + `gdUsuarios` (LIMIT 100) + conteos por subquery;
  acotado por el `LIMIT` de `items[]` y por una sola query agregada de votos curados.
- **`destinos_fotos.id`:** verificado que existe (`api/utilidades.js:269`); no requiere
  migracion, pero el implementador debe confirmarlo en el SELECT final.

---

## 8. Criterios de aceptacion medibles

1. **Escudo GOLD:** `node --check api/pagina-destino.js` y
   `node --check api/interacciones.js` -> PASS; ASCII-safety: 0 bytes > 127 y 0
   backticks en el codigo nuevo; balance de divs del HTML generado = 0.
2. **Paridad legacy:** `GET /api/interacciones?tipo=galeria_destino&slug=<x>` SIN los
   params nuevos devuelve las mismas claves `destino`/`fotos`/`usuarios` con la misma
   forma que antes (mas `items`). Smoke de contrato de `galeria.html` PASS.
3. **Grilla unificada:** `GET ...&incluir=viajeros,albumes&usuario_id=<u>` devuelve
   `items[]` con `origen` en {`curada`,`viajero`,`album`}, sin URLs duplicadas
   (dedup por URL), y `ya_votado=true` exactamente para las fotos votadas por `<u>`.
4. **Voto:** `POST foto_voto` con `origen='curada'` inserta 1 fila
   `tipo='foto_curada_voto'` con `dims.voto_curada_id`, otorga +5 XP, devuelve 409 al
   repetir y 403 si es propia. `GET tipo=fotos` NO incluye filas de voto
   (`voto_curada_id`/`voto_foto_id`).
5. **Album:** `POST album_agregar_foto` desde la ficha guarda en el album elegido
   (+15 XP; +10 XP al autor si aplica); segundo intento con la misma
   `(album_id, foto_url, autor_original_id)` -> 409.
6. **Una sola seccion:** el HTML generado contiene exactamente un `id="galeria"` y
   ningun `id="fotos"` visible, pero SI un ancla `id="fotos"`; `#galeria` aparece una
   sola vez en el ensamblado.
7. **Degradacion:** con `usuarios.foto_url` ausente (simulado en smoke), el GET
   devuelve 200 con `autor_avatar:''` (NO 503).
8. **Lightbox:** `GAL_ALL` contiene las URLs de `items[]` tras la hidratacion
   (`abrirLightbox` navega al menos una foto de cada origen presente).

---

## 9. ADR-030 propuesto (texto para `exploraco desarrollo/DECISIONS.md`)

> **Nota:** el siguiente texto se propone para que `docs-keeper` lo inserte en
> `DECISIONS.md`. Esta spec NO modifica ese archivo (ni `TASKS.md`).

---

## ADR-030: Galeria unificada de la ficha de destino (curadas + viajeros + albumes) con voto y guardado en album

**ID:** ADR-030
**Fecha:** 2026-09-15
**Autor:** architect (AI-DOS) con decision de producto encargada por el Chief Architect

**Problema:** La ficha de destino (`api/pagina-destino.js`) tenia dos modulos de
fotos desconectados: `#galeria` (fotos curadas de `destinos_fotos`, sin interaccion)
y `#fotos` (fotos de viajeros como `interacciones.tipo='foto'`, votables via
`foto_voto`). Un tercer origen disponible (`album_fotos` geolocalizadas, ya servido
por `tipo=galeria_destino`) no se usaba en la ficha, `album_voto` existia en backend
pero sin ningun frontend (brecha G-07/D-12), y no habia UI para guardar una foto en
un album aunque `album_agregar_foto` ya existia. El presupuesto de endpoints de
Vercel Hobby esta agotado (8/8, ADR-010), por lo que la unificacion debia lograrse
extendiendo endpoints existentes y sin romper `galeria.html`.

**Opciones evaluadas:**
1. **Modulo nuevo con endpoint nuevo:** descartada -- viola ADR-010 (8/8).
2. **Tabla unica de votos / unificar persistencia:** descartada -- exige migracion
   de datos y cambio de esquema (ADR-008) sin beneficio; `album_votos` (PK) y el
   mecanismo `interacciones.dims` ya funcionan y estan desplegados.
3. **Extender `tipo=galeria_destino` con `items[]` aditivo + `incluir`/`usuario_id`,
   extender `foto_voto` con `origen`, y unificar voto/guardado en el cliente
   (elegida):** cero endpoints nuevos, cero cambios a `galeria.html`, con un unico
   dispatcher cliente y un unico helper server-side de voto.
4. **Reemplazar `#fotos` por `#galeria` borrando el modulo viejo:** descartada por
   Cero Borrado Logico -- se conserva el ancla `#fotos` invisible y los
   identificadores `loadFotos`/`subirFoto`/`votarFoto`.

**Decision tomada:** Se adopta la opcion 3. `GET ?tipo=galeria_destino` gana los
params opcionales `incluir=viajeros,albumes` y `usuario_id`, y una clave NUEVA
`items[]` que normaliza TODA foto a
`{ origen, id_origen, tipo_voto, url, caption, votos, ya_votado, es_propia,
autor_id, autor_nombre, autor_avatar, album_id, album_titulo, foto_type,
media_source, creado_en }`, con dedup por URL y precedencia `curada > viajero >
album`. Las claves `fotos[]`/`usuarios[]` se conservan para `galeria.html`
(extension aditiva). El voto se unifica con UN dispatcher cliente
`votarGalItem(id_origen, tipo_voto, btn)` y UN helper server-side
`insertarVotoInteraccion`: `tipo_voto='album'` usa `album_voto`; `tipo_voto='foto'`
usa `foto_voto` (viajero); `tipo_voto='curada'` extiende `foto_voto` con
`origen='curada'`, que inserta `interacciones.tipo='foto_curada_voto'` con
`dims.voto_curada_id` apuntando a `destinos_fotos.id`. Guardar en album consume el
endpoint existente `album_agregar_foto` desde un mini-popover alimentado por
`GET ?tipo=albumes&usuario_id=`, mapeando `foto_url`/`foto_type`/`media_title`/
`media_source`/`autor_original_id` por origen y OMITIENDO `autor_original_id` cuando
no hay autor (para no desactivar el dedup por NULLs del indice
`idx_album_fotos_dedup`). La implementacion debe proveer fallbacks de LECTURA por
query (si falta `usuarios.foto_url` -> 42703, o las tablas de albumes -> 42P01) en
vez de escalar al 503 global.

**Justificacion:** `items[]` aditivo da a la ficha un contrato unico sin tocar la
pagina `galeria.html` ni borrar modulos previos, y permite mantener el dedup por
URL que la ficha ya aplicaba en `galAll`. Extender `foto_voto` con `origen` evita
duplicar la logica de voto (un helper, un dispatcher) y no crea endpoints ni
ramas nuevas de voto. Apoyar el voto curado en `interacciones.dims` (JSONB) respeta
el patron del proyecto de no persistir contadores y no requiere migracion de
esquema; `destinos_fotos.id` ya existe y se usa en `api/utilidades.js`. Exponer
`album_voto` y `album_agregar_foto` en la ficha cierra la brecha G-07/D-12 y activa
XP ya implementado. La degradacion por query blinda la ficha contra el estado real
de Neon (004 pendiente), siguiendo la leccion de BUG-021/BUG-032.

**Impacto:** `api/interacciones.js` (extender `tipo=galeria_destino` con
`incluir`/`usuario_id`/`items[]`/dedup; helper `insertarVotoInteraccion`; extender
`foto_voto` con `origen='curada'`; fallbacks de lectura 42703/42P01;
`repartirXpReferidos` en `album_voto` recomendado); `api/pagina-destino.js` (una
sola `#galeria` que fusiona `secGaleria` + `secFotos`, ancla `#fotos` invisible,
grilla unificada con hidratacion por cliente, boton voto, boton guardar + popover de
albumes, CSS scoped `#galeria`, reasignacion de `GAL_ALL`); `docs/superpowers/specs/
2026-09-15-galeria-unificada-destino-design.md` (esta spec). NO se crean funciones
serverless (8/8 intacto, ADR-010); NO se modifica `galeria.html`; NO hay migracion
de esquema nueva (se requiere aplicar la 004 y verificar 009 en Neon).
**Pendiente operativo:** aplicar/confirmar migraciones 004 y 009 en Neon antes del
deploy.

**ADR previos relacionados:** ADR-002 (ASCII-safe), ADR-003 (Cero Borrado Logico),
ADR-004 (CSS scoped), ADR-006 (baseline de verdad), ADR-010 (presupuesto 8/8),
ADR-017 (albumes y media), ADR-022 (constraints/indices de interacciones),
ADR-023 (lectura de media/comentarios), ADR-027 (piramide de referidos).

**Estado:** Propuesta (diseno). No implementada.

---

## 10. Preguntas abiertas

- Se implementa en esta entrega el alta rapida de album ("+ Nuevo album") dentro del
  popover, o el MVP solo lista albumes existentes y remite a `mi-perfil.html`?
- Debe la ficha aplicar filtros/chips por origen (Todas / Curadas / Viajeros /
  Comunidad) en el MVP, o solo la grilla unificada sin filtros?
- Se autoriza incluir en el mismo PR el `repartirXpReferidos` faltante en
  `album_voto` (recomendado), o se registra como deuda aceptada?
- Se mantiene el limite actual de curadas de la ficha (las 12 de `destinos_fotos`) o
  la grilla unificada debe paginar/cargar mas de 12 curadas?
