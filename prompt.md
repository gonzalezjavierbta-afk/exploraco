# PAQUETE OPENCODE — ExploraCO · 18-sep-2026
# Sesión: Módulos nuevos + bugs activos
# Generado por Claude tras auditoría de archivos reales

================================================================================
## RESUMEN DE CAMBIOS POR AGENTE

| Agente | Ticket | Archivo | Tipo de cambio |
|--------|--------|---------|----------------|
| DB     | DB-01  | SQL puro | Tablas: zonas_geograficas, ranking_zonas, marcas, patrocinios |
| DB     | DB-02  | SQL puro | Extensión consumibles para canjes de marca |
| Backend | BE-01 | api/usuarios.js | tipo=marca_activar, tipo=marca_patrocinar |
| Frontend | FE-01 | mi-perfil.html | Eliminar bloque "Fotos publicadas" (HTML + JS) |
| Frontend | FE-02 | mi-perfil.html | Fusión Mi Clase → Árbol de Clases (quitar sección redundante) |
| Frontend | FE-03 | index.html | Diferenciar pin video individual vs pin álbum en mapa |
| Backend | BE-02 | api/pagina-destino.js | Fix galería R10: LIMIT sin tope artificial |
| Admin  | ADM-01 | admin.html | Panel de Vocaciones ya existe — no tocar |

================================================================================
## AGENTE DB — DB-01: Migración geográfica y módulo Marcas
## Archivo de entrega: 001_zonas_marcas.sql
## Requiere: ningún archivo del repositorio

```sql
-- ============================================================
-- 001_zonas_marcas.sql
-- ExploraCO · Migración: Zonas Geográficas + Módulo Marcas
-- ASCII-safe: sin tildes, sin caracteres > 127
-- ============================================================

-- ── 1. ZONAS GEOGRÁFICAS (5 regiones fijas) ─────────────────

CREATE TABLE IF NOT EXISTS zonas_geograficas (
  id            SERIAL PRIMARY KEY,
  slug          TEXT NOT NULL UNIQUE,         -- 'caribe', 'pacifico', etc.
  nombre        TEXT NOT NULL,
  emoji         TEXT,
  poligono      JSONB,                         -- GeoJSON simplificado futuro
  creado_en     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO zonas_geograficas (slug, nombre, emoji) VALUES
  ('caribe',   'Caribe',    '\U0001F30A'),
  ('pacifico', 'Pacifico',  '\U0001F333'),
  ('andes',    'Andes',     '\U000026F0'),
  ('llanos',   'Llanos',    '\U0001F33E'),
  ('amazonia', 'Amazonia',  '\U0001F40D')
ON CONFLICT (slug) DO NOTHING;

-- ── 2. ÁREAS / BARRIOS (definidos por densidad) ─────────────
-- Slug libre, ciudad normalizada, centroide lat/lng, radio en km.
-- El backend asigna automáticamente el área al recurso por proximidad.

CREATE TABLE IF NOT EXISTS areas_geograficas (
  id            SERIAL PRIMARY KEY,
  slug          TEXT NOT NULL UNIQUE,
  nombre        TEXT NOT NULL,
  ciudad        TEXT NOT NULL,
  zona_slug     TEXT REFERENCES zonas_geograficas(slug),
  lat           NUMERIC(10,7),
  lng           NUMERIC(10,7),
  radio_km      NUMERIC(6,3) DEFAULT 1.5,      -- radio de asignacion automatica
  activo        BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 3. RANKING POR CAPA TERRITORIAL ─────────────────────────
-- Materialización incremental: se actualiza por trigger o cron.

CREATE TABLE IF NOT EXISTS ranking_zonas (
  id              SERIAL PRIMARY KEY,
  recurso_id      TEXT NOT NULL,               -- album_foto.id :: text
  recurso_tipo    TEXT NOT NULL DEFAULT 'album_foto',
  punto_lat       NUMERIC(10,7),
  punto_lng       NUMERIC(10,7),
  area_slug       TEXT REFERENCES areas_geograficas(slug),
  ciudad          TEXT,
  zona_slug       TEXT REFERENCES zonas_geograficas(slug),
  score_area      INTEGER NOT NULL DEFAULT 0,
  score_ciudad    INTEGER NOT NULL DEFAULT 0,
  score_zona      INTEGER NOT NULL DEFAULT 0,
  likes_total     INTEGER NOT NULL DEFAULT 0,
  comentarios_total INTEGER NOT NULL DEFAULT 0,
  actualizado_en  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (recurso_id, recurso_tipo)
);

CREATE INDEX IF NOT EXISTS idx_ranking_area    ON ranking_zonas(area_slug, score_area    DESC);
CREATE INDEX IF NOT EXISTS idx_ranking_ciudad  ON ranking_zonas(ciudad,    score_ciudad  DESC);
CREATE INDEX IF NOT EXISTS idx_ranking_zona    ON ranking_zonas(zona_slug, score_zona    DESC);

-- ── 4. MARCAS / PATROCINADORES ───────────────────────────────

CREATE TABLE IF NOT EXISTS marcas (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id      UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  nombre          TEXT NOT NULL,
  logo_url        TEXT,
  banner_url      TEXT,
  descripcion     TEXT,
  areas_influencia JSONB DEFAULT '[]'::JSONB,  -- slugs de zonas/ciudades
  enlaces         JSONB DEFAULT '{}'::JSONB,   -- {web, ig, wa, etc.}
  activa          BOOLEAN NOT NULL DEFAULT TRUE,
  verificada      BOOLEAN NOT NULL DEFAULT FALSE,
  nivel_requerido INTEGER NOT NULL DEFAULT 5,  -- nivel minimo de usuario
  creado_en       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (usuario_id)                          -- 1 marca por usuario
);

CREATE INDEX IF NOT EXISTS idx_marcas_activa ON marcas(activa) WHERE activa = TRUE;

-- ── 5. PATROCINIOS ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS patrocinios (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  marca_id        UUID NOT NULL REFERENCES marcas(id) ON DELETE CASCADE,
  tipo_objetivo   TEXT NOT NULL,               -- 'evento', 'artista', 'parche', 'mision'
  objetivo_id     TEXT NOT NULL,               -- id del evento/artista/parche
  xp_aportada     INTEGER NOT NULL DEFAULT 0,
  fama_bonus      INTEGER NOT NULL DEFAULT 0,
  branding_data   JSONB DEFAULT '{}'::JSONB,   -- {banner_url, tagline, etc.}
  activo          BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patrocinios_marca ON patrocinios(marca_id);

-- ── 6. EXTENSIÓN consumibles PARA CANJES DE MARCA ───────────
-- La tabla consumibles ya existe. Se agrega columna marca_id y stock.

ALTER TABLE consumibles
  ADD COLUMN IF NOT EXISTS marca_id    UUID REFERENCES marcas(id),
  ADD COLUMN IF NOT EXISTS stock_total INTEGER,          -- NULL = ilimitado
  ADD COLUMN IF NOT EXISTS stock_usado INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS precio_xp_base  INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS precio_xp_actual INTEGER,    -- NULL = usa base
  ADD COLUMN IF NOT EXISTS tipo_canje TEXT;              -- 'qr', 'codigo', 'ticket'

-- Vista util: precio efectivo con ley de oferta y demanda
CREATE OR REPLACE VIEW consumibles_precio AS
SELECT
  id,
  nombre,
  marca_id,
  precio_xp_base,
  stock_total,
  stock_usado,
  CASE
    WHEN stock_total IS NULL THEN precio_xp_base
    WHEN stock_total <= 0    THEN precio_xp_base
    ELSE GREATEST(
      precio_xp_base,
      ROUND(precio_xp_base * (1.0 + stock_usado::numeric / GREATEST(stock_total,1)))
    )
  END AS precio_xp_efectivo,
  COALESCE(stock_total - stock_usado, 99999) AS stock_disponible
FROM consumibles
WHERE activo = TRUE;
```

================================================================================
## AGENTE BACKEND — BE-01: Módulo Marcas en api/usuarios.js
## Archivo necesario: api/usuarios.js (ya auditado)
## Punto de inserción: línea ~1180, justo DESPUÉS del bloque verificar_usuario
##                     y ANTES del comentario "Upsert de registro (login)"

### CONTEXTO (3 líneas antes):
```
        return res.json({ ok: true, usuario_id: vId, email_verificado: vVal });
      }

      // ---- Upsert de registro (login con email / google) ------------
```

### FRAGMENTO A INSERTAR (entre las dos secciones anteriores):

```javascript
      // ---- Rama: activar / actualizar Marca del usuario (TSK-120) ---
      // POST { tipo:'marca_activar', usuario_id, nombre, logo_url?,
      //        banner_url?, descripcion?, areas_influencia?, enlaces? }
      // Requiere JWT valido del propio usuario. Nivel minimo: 5.
      // MERGE JSONB: cero reemplazo total (ADR-003).
      if (c.tipo === 'marca_activar') {
        var maUid = String(c.usuario_id || '');
        if (!maUid) return res.status(400).json({ ok: false, error: 'usuario_id requerido' });
        var maJwt = validarSesionUsuario(req, maUid);
        if (!maJwt) return res.status(401).json({ ok: false, error: 'No autorizado' });
        var maNombre = String(c.nombre || '').trim().slice(0, 120);
        if (!maNombre) return res.status(400).json({ ok: false, error: 'nombre requerido' });
        // Verificar nivel minimo del usuario
        var maUser = await sql('SELECT nivel FROM usuarios WHERE id=$1 LIMIT 1', [maUid]);
        if (!maUser.length || (maUser[0].nivel || 1) < 5)
          return res.status(403).json({ ok: false, error: 'Nivel m\u00ednimo 5 requerido para activar una Marca' });
        var maAreas  = c.areas_influencia ? JSON.stringify(c.areas_influencia) : null;
        var maLinks  = c.enlaces          ? JSON.stringify(c.enlaces)           : null;
        var maFila = await sql(
          'INSERT INTO marcas (usuario_id, nombre, logo_url, banner_url, descripcion, areas_influencia, enlaces) '
          + 'VALUES ($1,$2,$3,$4,$5,'
          + 'COALESCE($6::jsonb,\'[]\'::jsonb),'
          + 'COALESCE($7::jsonb,\'{}\'::jsonb)) '
          + 'ON CONFLICT (usuario_id) DO UPDATE SET '
          + 'nombre      = EXCLUDED.nombre, '
          + 'logo_url    = COALESCE(EXCLUDED.logo_url, marcas.logo_url), '
          + 'banner_url  = COALESCE(EXCLUDED.banner_url, marcas.banner_url), '
          + 'descripcion = COALESCE(EXCLUDED.descripcion, marcas.descripcion), '
          + 'areas_influencia = marcas.areas_influencia || COALESCE(EXCLUDED.areas_influencia, \'[]\'::jsonb), '
          + 'enlaces     = marcas.enlaces || COALESCE(EXCLUDED.enlaces, \'{}\'::jsonb), '
          + 'activa      = TRUE '
          + 'RETURNING id, nombre, activa, verificada',
          [maUid, maNombre,
           c.logo_url    ? String(c.logo_url).slice(0,512)    : null,
           c.banner_url  ? String(c.banner_url).slice(0,512)  : null,
           c.descripcion ? String(c.descripcion).slice(0,500) : null,
           maAreas, maLinks]
        );
        return res.json({ ok: true, data: maFila[0] });
      }

      // ---- Rama: crear patrocinio (TSK-121) ----------------------
      // POST { tipo:'marca_patrocinar', usuario_id, tipo_objetivo,
      //        objetivo_id, xp_aportada?, fama_bonus?, branding_data? }
      // La marca debe pertenecer al usuario y estar activa.
      if (c.tipo === 'marca_patrocinar') {
        var mpUid = String(c.usuario_id || '');
        if (!mpUid) return res.status(400).json({ ok: false, error: 'usuario_id requerido' });
        var mpJwt = validarSesionUsuario(req, mpUid);
        if (!mpJwt) return res.status(401).json({ ok: false, error: 'No autorizado' });
        var mpTipo = String(c.tipo_objetivo || '');
        var mpObjId = String(c.objetivo_id || '');
        if (!mpTipo || !mpObjId)
          return res.status(400).json({ ok: false, error: 'tipo_objetivo y objetivo_id requeridos' });
        var TIPOS_VALIDOS = ['evento','artista','parche','mision'];
        if (TIPOS_VALIDOS.indexOf(mpTipo) === -1)
          return res.status(400).json({ ok: false, error: 'tipo_objetivo inv\u00e1lido' });
        // Verificar que la marca es del usuario y está activa
        var mpMarca = await sql(
          'SELECT id FROM marcas WHERE usuario_id=$1 AND activa=TRUE LIMIT 1',
          [mpUid]
        );
        if (!mpMarca.length)
          return res.status(404).json({ ok: false, error: 'Marca activa no encontrada. Activa tu marca primero.' });
        var mpXp    = Math.max(0, parseInt(c.xp_aportada   || 0, 10));
        var mpFama  = Math.max(0, parseInt(c.fama_bonus     || 0, 10));
        var mpBrand = c.branding_data ? JSON.stringify(c.branding_data) : '{}';
        var mpFila = await sql(
          'INSERT INTO patrocinios (marca_id, tipo_objetivo, objetivo_id, xp_aportada, fama_bonus, branding_data) '
          + 'VALUES ($1,$2,$3,$4,$5,$6::jsonb) RETURNING id',
          [mpMarca[0].id, mpTipo, mpObjId, mpXp, mpFama, mpBrand]
        );
        return res.json({ ok: true, patrocinio_id: mpFila[0].id });
      }

      // ---- Rama: GET perfil de marca propia (TSK-122) ------------
      // GET /api/usuarios?tipo=mi_marca&usuario_id=UUID
```

### CONTEXTO (3 líneas después del insert — en el bloque GET):
```
      if (tipo === 'leaderboard') {
```
### Para la rama GET, agregar ANTES del if (tipo === 'leaderboard') en la sección GET:

```javascript
      // ---- GET: mi_marca (TSK-122) --------------------------------
      if (tipo === 'mi_marca' && (id || req.query.usuario_id)) {
        var mmId = String(id || req.query.usuario_id || '');
        var mmRows = await sql(
          'SELECT m.*, '
          + '(SELECT COUNT(*)::int FROM patrocinios p WHERE p.marca_id=m.id AND p.activo=TRUE) AS total_patrocinios '
          + 'FROM marcas m WHERE m.usuario_id=$1 LIMIT 1',
          [mmId]
        );
        return res.json({ ok: true, data: mmRows.length ? mmRows[0] : null });
      }
```

### VERIFICACIONES QA para BE-01:
- [ ] ASCII-Safe: grep -P '[\x80-\xFF]' api/usuarios.js → 0 resultados
- [ ] Sin backtick en cadenas SQL: grep '`' api/usuarios.js → 0
- [ ] Colisión de tipo=: grep "tipo === 'marca_" api/usuarios.js → exactamente 2 (activar, patrocinar)
- [ ] Balance de llaves: el bloque if (...) { ... } cierra con return antes del siguiente if

================================================================================
## AGENTE BACKEND — BE-02: Fix galería R10 (api/pagina-destino.js)
## Archivo necesario: api/pagina-destino.js (ya auditado)
## Problema: LIMIT 24 en destinos_fotos es arbitrario; si el hostal tiene >24
##            fotos subidas, las restantes nunca llegan al frontend.
## Línea exacta: ~2643

### CONTEXTO (3 líneas antes):
```
    // TSK-106 (PROBLEMA 4): LIMIT ampliado de 12 a 24 para que galAll
    // tenga material suficiente y el hero muestre 12 miniaturas reales.
    var fotosRows = await sql(
      'SELECT url,caption FROM destinos_fotos WHERE destino_id=$1 ORDER BY orden ASC NULLS LAST, es_hero DESC LIMIT 24',
```

### REEMPLAZO (str.replace exacto):

**old_str:**
```
    // TSK-106 (PROBLEMA 4): LIMIT ampliado de 12 a 24 para que galAll
    // tenga material suficiente y el hero muestre 12 miniaturas reales.
    var fotosRows = await sql(
      'SELECT url,caption FROM destinos_fotos WHERE destino_id=$1 ORDER BY orden ASC NULLS LAST, es_hero DESC LIMIT 24',
      [d.id]
    );
```

**new_str:**
```
    // TSK-106 fix R10: sin LIMIT artificial. galAll puede tener >24 fotos;
    // buildHTML() ya limita la galeria curada a 1 grande + 12 miniaturas.
    // El LIMIT 200 es un tope de seguridad razonable para no traer miles.
    var fotosRows = await sql(
      'SELECT url,caption FROM destinos_fotos WHERE destino_id=$1 ORDER BY orden ASC NULLS LAST, es_hero DESC LIMIT 200',
      [d.id]
    );
```

### VERIFICACIONES QA para BE-02:
- [ ] ASCII-Safe en el fragmento modificado
- [ ] Confirmar que buildHTML() ya limita el render (sí: galeria curada max ~13 fotos, ver línea ~1574)
- [ ] No hay otros LIMIT sobre destinos_fotos en el mismo endpoint: grep -n "destinos_fotos" api/pagina-destino.js

================================================================================
## AGENTE FRONTEND — FE-01: Eliminar sección "Fotos publicadas" de mi-perfil.html
## Archivo necesario: mi-perfil.html (ya auditado)
## Cuenta afectada: brsk84@gmail.com (solo aplica para esa cuenta o global)
## Decisión de producto confirmada: eliminar el bloque HTML + la llamada JS

### ACLARACIÓN NECESARIA ANTES DE EJECUTAR:
¿La sección "Fotos publicadas" se elimina para TODOS los usuarios,
o solo se oculta para la cuenta brsk84@gmail.com?

**OPCIÓN A — Eliminar globalmente** (recomendada si el módulo se reemplaza por Álbumes):

**old_str (líneas ~677-681):**
```
  <!-- FOTOS PUBLICADAS (ADR-032: solo lectura publica, visible=true server-side) -->
  <div class="pf-section-title" style="margin-top:20px" data-tab="museo">&#x1F4F8; Fotos publicadas</div>
  <div id="mis-fotos-grid" data-tab="museo" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:12px;margin-bottom:12px;">
    <p style="color:rgba(255,255,255,.3);font-size:13px;grid-column:1/-1;">Cargando fotos...</p>
  </div>
```
**new_str:** *(vacío — eliminar el bloque)*

Además, eliminar la llamada JS a cargarMisFotos():

**old_str (buscar en la zona de inicialización ~línea 2136):**
```
  cargarMediaGrid({ gridId: 'mis-fotos-grid', tipo: 'mis_fotos', quitar: false,
```
*(eliminar toda la llamada a cargarMisFotos() y su invocación en init)*

**OPCIÓN B — Ocultar solo para brsk84@gmail.com** (condicional en JS):
Agregar en la función que renderiza el perfil, después de cargar el usuario:
```javascript
// Solo para la cuenta de admin: ocultar Fotos publicadas
if (window.ExploraCO && window.ExploraCO.usuario &&
    window.ExploraCO.usuario.email === 'brsk84@gmail.com') {
  var fpTitle = document.querySelector('[data-tab="museo"] ~ .pf-section-title');
  var fpGrid = document.getElementById('mis-fotos-grid');
  // Forma mas segura: hide por id directo
  if (fpGrid) fpGrid.style.display = 'none';
}
```

### PENDIENTE: Confirmar con Javier cuál opción aplica antes de ejecutar.

================================================================================
## AGENTE FRONTEND — FE-02: Fusión "Mi Clase" → Árbol de Clases
## Archivo necesario: mi-perfil.html (ya auditado)
## Situación actual (auditada):
##   - Línea 924: título "Mi Clase" + contenedor #pf-clase  (profesión Rising Star)
##   - Línea 956: título "Árbol de Clases" + contenedor #arbol-clases
##   Ambos están bajo data-tab="clase". Son componentes distintos que coexisten.
##
## Interpretación del requerimiento ítem 6:
##   "El apartado 'Clase' se fusiona con el Árbol de Clases":
##   → Mover el widget de Mi Clase DENTRO del bloque .arbol-clases como
##     sub-sección encabezada, eliminando el título/sección separado.
##   → El modal de elegir clase (#modal-clase) permanece intacto.

### CAMBIO A: Quitar el título "Mi Clase" como sección independiente

**old_str (línea ~923):**
```
  <!-- TSK-112 / ADR-038: MI CLASE (profesion Rising Star; coexiste con el arbol de 16 ramas) -->
  <div class="pf-section-title" style="margin-top:28px" data-tab="clase">Mi Clase</div>
  <div class="pf-clase" id="pf-clase" data-tab="clase"></div>
```

**new_str:** (mover #pf-clase dentro del árbol — ver CAMBIO B)
*(eliminar estas 3 líneas; el div#pf-clase se reubica en CAMBIO B)*

### CAMBIO B: Insertar #pf-clase dentro de .arbol-clases como primer hijo

**old_str (línea ~957):**
```
  <div class="arbol-clases" id="arbol-clases" data-tab="clase">
    <div class="arbol-cargando">Abriendo tu Arbol de Clases&#8230;</div>
  </div>
```

**new_str:**
```
  <div class="arbol-clases" id="arbol-clases" data-tab="clase">
    <!-- Clase profesion (TSK-112): integrada en el arbol (item 6 fusion) -->
    <div class="pf-clase" id="pf-clase" style="margin-bottom:14px;border-bottom:1px solid rgba(255,255,255,.07);padding-bottom:14px;"></div>
    <div class="arbol-cargando">Abriendo tu Arbol de Clases&#8230;</div>
  </div>
```

### CAMBIO C: Actualizar título "Árbol de Clases" para reflejar la fusión

**old_str:**
```
  <div class="pf-section-title" style="margin-top:28px" data-tab="clase">&#x2694;&#xFE0F; Arbol de Clases</div>
```

**new_str:**
```
  <div class="pf-section-title" style="margin-top:28px" data-tab="clase">&#x2694;&#xFE0F; Clase &amp; Arbol de Progreso</div>
```

### VERIFICACIONES QA para FE-02:
- [ ] data-tab="clase" mantenido en todos los elementos modificados
- [ ] #pf-clase existe exactamente 1 vez en el DOM post-edición
- [ ] #arbol-clases existe exactamente 1 vez en el DOM post-edición
- [ ] #modal-clase no fue tocado
- [ ] cargarMiClase() y renderMiClase() siguen apuntando a getElementById('pf-clase')

================================================================================
## AGENTE FRONTEND — FE-03: Pines individuales de VIDEO en el Mapa Cultural
## Archivo necesario: index.html (ya auditado)
## Situación actual (auditada):
##   - La función mapaMediaIcon() (línea ~2981) ya distingue por media_type:
##     foto → naranja (#E8A020), video → rojo (#e74c3c), audio → violeta
##   - La clase CSS .mpa-media-pin-album (línea 543) ya existe con borde ámbar
##   - El problema: no hay estilo diferenciador VISUAL adicional para videos
##     individuales subidos por usuario vs. fotos. El ícono ▶ y el color rojo
##     diferencian, pero el SHAPE del pin es idéntico (círculo 34px en todos).

### OBJETIVO: Pin de VIDEO individual → forma distintiva (cuadrado redondeado)
###            Pin de ÁLBUM (existente)  → mantener borde ámbar actual
###            Pin de FOTO individual   → mantener círculo dorado actual

### CAMBIO A: CSS — Agregar clase para pin de video

Buscar bloque (línea ~543):
```css
.mpa-media-pin-album{border-style:solid;border-color:#fff3d6;box-shadow:0 3px 10px rgba(217,119,6,.55)}
```

**old_str:**
```
.mpa-media-pin-album{border-style:solid;border-color:#fff3d6;box-shadow:0 3px 10px rgba(217,119,6,.55)}
```

**new_str:**
```
.mpa-media-pin-album{border-style:solid;border-color:#fff3d6;box-shadow:0 3px 10px rgba(217,119,6,.55)}
.mpa-media-pin-video{border-radius:8px;border-style:solid;border-color:#ff8a80;box-shadow:0 3px 10px rgba(231,76,60,.55)}
```

### CAMBIO B: JS — Aplicar clase mpa-media-pin-video en mapaMediaIcon()

**old_str (línea ~2994):**
```
    html: '<div class="mpa-media-pin' + (esDestino ? ' mpa-media-pin-dest' : '') + (esAlbumDestino ? ' mpa-media-pin-album' : '') + '" style="background:' + color + '">' + ico + '</div>',
```

**new_str:**
```
    html: '<div class="mpa-media-pin' + (esDestino ? ' mpa-media-pin-dest' : '') + (esAlbumDestino ? ' mpa-media-pin-album' : '') + (!esAlbumDestino && !esDestino && tipo === 'video' ? ' mpa-media-pin-video' : '') + '" style="background:' + color + '">' + ico + '</div>',
```

### VERIFICACIONES QA para FE-03:
- [ ] ASCII-Safe: sin tildes en el fragmento JS modificado
- [ ] La condición `tipo === 'video'` solo aplica cuando !esAlbumDestino && !esDestino
- [ ] Render visual: pin foto = círculo dorado | pin video = cuadrado redondeado rojo | pin álbum = círculo ámbar con borde sólido
- [ ] No colisión de clases: grep '.mpa-media-pin-video' index.html → 2 resultados (CSS + HTML generado)

================================================================================
## AGENTE QA — Checklist final antes de deploy

### ASCII-Safe (todos los archivos .js modificados):
```bash
# Ejecutar en la raíz del proyecto:
python3 -c "
import sys, os
files = ['api/usuarios.js', 'api/pagina-destino.js']
for f in files:
    with open(f, 'rb') as fh:
        data = fh.read()
    bad = [(i+1, b) for i, b in enumerate(data) if b > 127]
    if bad:
        print(f'FAIL {f}: {len(bad)} caracteres > 127')
        for ln, b in bad[:5]: print(f'  byte {b:#x} cerca de offset {ln}')
    else:
        print(f'OK {f}')
"
```

### Balance de divs en mi-perfil.html (post-edición):
```bash
python3 -c "
with open('mi-perfil.html','r') as f: txt=f.read()
opens  = txt.count('<div')
closes = txt.count('</div>')
print('OPEN:', opens, '| CLOSE:', closes, '|', 'OK' if opens==closes else 'DESBALANCE')
"
```

### Colisión de tipo= en usuarios.js:
```bash
grep -c "c\.tipo === 'marca_" api/usuarios.js
# Esperado: 2
```

### Verificar LIMIT en pagina-destino.js:
```bash
grep "destinos_fotos.*LIMIT\|LIMIT.*destinos_fotos" api/pagina-destino.js
# Esperado: exactamente 1 ocurrencia, con LIMIT 200
```

================================================================================
## NOTA PARA PRÓXIMA SESIÓN

Los siguientes ítems requieren confirmación adicional de Javier antes de generar prompts:

1. **FE-01 (Fotos publicadas)**: ¿Eliminar global o solo para brsk84@gmail.com?
   → Si global, también eliminar `cargarMisFotos()` y su llamada en init.

2. **DB-01 áreas_geograficas**: Las áreas iniciales (La Candelaria, Usaquén, etc.)
   deben definirse con lat/lng reales. ¿Las provees tú o las cargo desde OSM?

3. **Thumbnails de video (ítem 2)**: La extracción de frame debe correr en cliente
   antes del upload (Vercel 10s limit). ¿Hay un flujo de subida de video existente
   en comunidad.html o mi-perfil.html que debamos modificar? Solicitar ese archivo.

4. **Mapa Cultural — pines individuales**: El endpoint que alimenta MAPA_MEDIA
   (probablemente en interacciones.js o destinos.js): ¿ya devuelve registros
   album_foto individuales con lat/lng, o solo devuelve el pin del álbum padre?
   Solicitar api/interacciones.js para auditar.
================================================================================
```
