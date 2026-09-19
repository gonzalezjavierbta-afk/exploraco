-- ============================================================================
-- Migration 027: Zonas geograficas + Modulo Marcas (DB-01) y extension
--   consumibles para canjes de marca (DB-02)
-- Fecha: 2026-09-18
-- Referencias: ADR-002 (ASCII-safe), ADR-003 (cero borrado logico / merge
--   JSONB), ADR-008 (gobernanza e idempotencia de esquema).
-- Requiere: 009 (albumes + album_fotos), 010 (consumibles y pandillas),
--   021 (xp numeric(12,2)) y usuarios (PK uuid). El resto de 003-026 aplicado.
--
-- QUE HACE
--   DB-01
--     1. zonas_geograficas: las 5 regiones fijas de Colombia (slug UNIQUE).
--     2. areas_geograficas: areas / barrios con centroide y radio de
--        asignacion automatica por proximidad.
--     3. ranking_zonas: ranking materializable por capa territorial
--        (area / ciudad / zona) sobre recursos tipo album_fotos.
--     4. marcas: perfil de marca / patrocinador, 1 por usuario.
--     5. patrocinios: patrocinio de la marca sobre un objetivo.
--   DB-02
--     6. consumibles: columnas marca_id, stock_total, stock_usado,
--        precio_xp_base, precio_xp_actual y tipo_canje (canje de marca).
--     7. consumibles_precio: vista del precio efectivo con ley de oferta y
--        demanda.
--
-- CARACTER DE LA MIGRACION
--   ADITIVA: solo CREATE TABLE / ALTER TABLE ADD COLUMN / CREATE INDEX /
--   CREATE OR REPLACE VIEW / INSERT de semilla. NO elimina, NO renombra y NO
--   toca objetos de 003-026.
--   IDEMPOTENTE (ADR-008): todo DDL usa IF NOT EXISTS; la semilla de zonas usa
--   ON CONFLICT (slug) DO NOTHING; la vista usa CREATE OR REPLACE. Re-ejecutar
--   el archivo COMPLETO es no-op seguro (aplicable N veces).
--   ASCII-SAFE (ADR-002): cero bytes > 127, cero tildes, cero ene, cero
--   backticks.
--
-- EMOJIS SIN BYTES UTF-8 (BUG-026)
--   Los emojis de zonas_geograficas NO se escriben como bytes UTF-8 directos
--   ni como escapes JS sin prefijo (eso insertaria texto literal). Se usa el
--   escape Unicode de PostgreSQL con prefijo U&:
--     U&'\+01F30A' (ola, U+1F30A)  -> forma \+xxxxxx (6 hex, fuera del BMP)
--     U&'\+01F333' (arbol, U+1F333)
--     U&'\+0026F0' (montana, U+26F0)
--     U&'\+01F33E' (espiga, U+1F33E)
--     U&'\+01F40D' (serpiente, U+1F40D)
--   Todo el archivo sigue siendo ASCII puro (0 bytes > 127).
--
-- ORDEN DE APLICACION
--   Correr este archivo COMPLETO en el editor SQL de Neon DESPUES de la 026.
--   Antes de aplicar, correr el PREFLIGHT de solo lectura de la seccion 0.
--   Patron BUG-021/BUG-060: archivo COMPLETO en una sola corrida.
--
-- ROLLBACK (emergencia, LOSSY si ya hay datos)
--   DROP VIEW IF EXISTS consumibles_precio;
--   ALTER TABLE consumibles DROP COLUMN IF EXISTS marca_id; ... (x6)
--   DROP TABLE IF EXISTS patrocinios, marcas, ranking_zonas,
--     areas_geograficas, zonas_geograficas;
--   No va en el flujo normal y se pierde la informacion de marca.
-- ============================================================================

-- ============================================================================
-- 0. PREFLIGHT (SOLO LECTURA; NO forma parte del DDL; NO se ejecuta solo).
--    Copiar y correr sentencia por sentencia ANTES de aplicar la 027 y
--    confirmar cada resultado esperado.
-- ============================================================================
-- (0.a) Confirmar que las 5 tablas nuevas aun NO existen. Esperado: 0 filas
--       antes de aplicar; 5 filas despues.
-- SELECT tablename FROM pg_tables
--   WHERE schemaname='public'
--     AND tablename IN ('zonas_geograficas','areas_geograficas',
--                       'ranking_zonas','marcas','patrocinios')
--   ORDER BY tablename;
--
-- (0.b) Confirmar el esquema de consumibles (tabla de la 010) y que aun NO
--       tiene las columnas de canje. Esperado antes: 0 filas para las 6
--       columnas nuevas; despues: 6 filas.
-- SELECT column_name, data_type FROM information_schema.columns
--   WHERE table_schema='public' AND table_name='consumibles'
--     AND column_name IN ('marca_id','stock_total','stock_usado',
--                         'precio_xp_base','precio_xp_actual','tipo_canje')
--   ORDER BY column_name;
--
-- (0.c) Confirmar que existen los predecesores logicos de las FKs:
--       usuarios (PK uuid), album_fotos (009) y albumes. Esperado: 3 filas.
-- SELECT table_name FROM information_schema.tables
--   WHERE table_schema='public'
--     AND table_name IN ('usuarios','album_fotos','albumes')
--   ORDER BY table_name;
--
-- (0.d) Confirmar que consumibles.precio_xp ya es numeric(12,2) por la 021
--       (consistencia del nuevo precio_xp_base). Esperado: 1 fila numeric.
-- SELECT column_name, data_type, numeric_precision, numeric_scale
--   FROM information_schema.columns
--   WHERE table_schema='public' AND table_name='consumibles'
--     AND column_name='precio_xp';
--
-- (0.e) Confirmar que la vista consumibles_precio aun NO existe. Esperado:
--       0 filas antes; 1 fila despues.
-- SELECT viewname FROM pg_views
--   WHERE schemaname='public' AND viewname='consumibles_precio';

-- ============================================================================
-- 1. ZONAS GEOGRAFICAS (5 regiones fijas)
-- ============================================================================
-- slug es la clave natural estable ('caribe', 'pacifico', 'andes', 'llanos',
-- 'amazonia'); las areas y el ranking referencian ese slug, NO el id. poligono
-- queda JSONB para un GeoJSON simplificado futuro (aun sin datos).
-- Emojis via escape U& de PostgreSQL (BUG-026), nunca bytes UTF-8.

CREATE TABLE IF NOT EXISTS zonas_geograficas (
  id            SERIAL PRIMARY KEY,
  slug          TEXT NOT NULL UNIQUE,
  nombre        TEXT NOT NULL,
  emoji         TEXT,
  poligono      JSONB,
  creado_en     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Semilla idempotente de las 5 regiones. ON CONFLICT (slug) DO NOTHING hace
-- que re-ejecutar no duplique ni reescriba (ADR-008).
INSERT INTO zonas_geograficas (slug, nombre, emoji) VALUES
  ('caribe',   'Caribe',   U&'\+01F30A'),
  ('pacifico', 'Pacifico', U&'\+01F333'),
  ('andes',    'Andes',    U&'\+0026F0'),
  ('llanos',   'Llanos',   U&'\+01F33E'),
  ('amazonia', 'Amazonia', U&'\+01F40D')
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- 2. AREAS / BARRIOS (definidos por densidad)
-- ============================================================================
-- Slug libre, ciudad normalizada, centroide lat/lng y radio en km. El backend
-- asigna automaticamente el area al recurso por proximidad. zona_slug es FK al
-- slug de zona_geograficas (debe existir la zona; ver preflight 0.a).

CREATE TABLE IF NOT EXISTS areas_geograficas (
  id            SERIAL PRIMARY KEY,
  slug          TEXT NOT NULL UNIQUE,
  nombre        TEXT NOT NULL,
  ciudad        TEXT NOT NULL,
  zona_slug     TEXT REFERENCES zonas_geograficas(slug),
  lat           NUMERIC(10,7),
  lng           NUMERIC(10,7),
  radio_km      NUMERIC(6,3) DEFAULT 1.5,
  activo        BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indice de consulta por ciudad y zona activa (asignacion por proximidad).
CREATE INDEX IF NOT EXISTS idx_areas_ciudad_zona
  ON areas_geograficas (ciudad, zona_slug)
  WHERE activo = TRUE;

-- ============================================================================
-- 3. RANKING POR CAPA TERRITORIAL
-- ============================================================================
-- Materializacion incremental: se actualiza por trigger o cron. recurso_id es
-- el id de album_fotos en text (tabla real; por eso el default del tipo es
-- 'album_fotos', NO 'album_foto'). UNIQUE (recurso_id, recurso_tipo) evita
-- duplicar el ranking de un mismo recurso.

CREATE TABLE IF NOT EXISTS ranking_zonas (
  id                  SERIAL PRIMARY KEY,
  recurso_id          TEXT NOT NULL,               -- album_fotos.id :: text
  recurso_tipo        TEXT NOT NULL DEFAULT 'album_fotos',
  punto_lat           NUMERIC(10,7),
  punto_lng           NUMERIC(10,7),
  area_slug           TEXT REFERENCES areas_geograficas(slug),
  ciudad              TEXT,
  zona_slug           TEXT REFERENCES zonas_geograficas(slug),
  score_area          INTEGER NOT NULL DEFAULT 0,
  score_ciudad        INTEGER NOT NULL DEFAULT 0,
  score_zona          INTEGER NOT NULL DEFAULT 0,
  likes_total         INTEGER NOT NULL DEFAULT 0,
  comentarios_total   INTEGER NOT NULL DEFAULT 0,
  actualizado_en      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (recurso_id, recurso_tipo)
);

CREATE INDEX IF NOT EXISTS idx_ranking_area
  ON ranking_zonas (area_slug, score_area DESC);

CREATE INDEX IF NOT EXISTS idx_ranking_ciudad
  ON ranking_zonas (ciudad, score_ciudad DESC);

CREATE INDEX IF NOT EXISTS idx_ranking_zona
  ON ranking_zonas (zona_slug, score_zona DESC);

-- ============================================================================
-- 4. MARCAS / PATROCINADORES
-- ============================================================================
-- 1 marca por usuario (UNIQUE (usuario_id)). usuario_id es UUID porque la PK de
-- usuarios es uuid (migraciones 003+). ON DELETE CASCADE: si algun dia se
-- borrara fisicamente un usuario, su marca no queda huerfana (el proyecto usa
-- cero borrado logico, ADR-003, pero la FK se mantiene coherente con 010/026).
-- areas_influencia / enlaces son JSONB con default: el MERGE sin reemplazo
-- total se aplica en el backend (ADR-003), no en el DDL.

CREATE TABLE IF NOT EXISTS marcas (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id       UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  nombre           TEXT NOT NULL,
  logo_url         TEXT,
  banner_url       TEXT,
  descripcion      TEXT,
  areas_influencia JSONB DEFAULT '[]'::JSONB,
  enlaces          JSONB DEFAULT '{}'::JSONB,
  activa           BOOLEAN NOT NULL DEFAULT TRUE,
  verificada       BOOLEAN NOT NULL DEFAULT FALSE,
  nivel_requerido  INTEGER NOT NULL DEFAULT 5,
  creado_en        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (usuario_id)
);

CREATE INDEX IF NOT EXISTS idx_marcas_activa
  ON marcas (activa)
  WHERE activa = TRUE;

-- ============================================================================
-- 5. PATROCINIOS
-- ============================================================================
-- DEUDA TECNICA DOCUMENTADA (polimorfismo sin FK):
--   tipo_objetivo + objetivo_id apuntan a entidades que NO existen como tablas
--   en este esquema. En concreto NO hay tablas eventos, artistas, parches ni
--   misiones. El "parche" real del proyecto es la tabla pandillas (010).
--   Por eso NO se crea FOREIGN KEY sobre (tipo_objetivo, objetivo_id): la
--   integridad referencial del objetivo queda a cargo del backend (api/usuarios
--   valida TIPOS_VALIDOS y la existencia del objetivo en runtime). Si en el
--   futuro nacen esas entidades, migrar a FKs parciales o a una tabla puente.
--   Esta deuda es consciente y aprobada para DB-01; NO agregar CHECK de tipos
--   aqui para no acoplar el catalogo a un esquema que puede cambiar.

CREATE TABLE IF NOT EXISTS patrocinios (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  marca_id        UUID NOT NULL REFERENCES marcas(id) ON DELETE CASCADE,
  tipo_objetivo   TEXT NOT NULL,               -- 'evento', 'artista', 'parche', 'mision'
  objetivo_id     TEXT NOT NULL,               -- id del objetivo (sin FK, ver deuda)
  xp_aportada     INTEGER NOT NULL DEFAULT 0,
  fama_bonus      INTEGER NOT NULL DEFAULT 0,
  branding_data   JSONB DEFAULT '{}'::JSONB,
  activo          BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patrocinios_marca
  ON patrocinios (marca_id);

-- Indice de lectura por objetivo (resuelve "patrocinios de este objetivo").
CREATE INDEX IF NOT EXISTS idx_patrocinios_objetivo
  ON patrocinios (tipo_objetivo, objetivo_id)
  WHERE activo = TRUE;

-- ============================================================================
-- 6. DB-02: EXTENSION DE consumibles PARA CANJES DE MARCA
-- ============================================================================
-- La tabla consumibles ya existe (010); se agrega marca_id y stock. Tipos:
--   stock_total / stock_usado INTEGER (NULL total = ilimitado).
--   precio_xp_base / precio_xp_actual numeric(12,2) para consistencia EXACTA
--   con 021_xp_decimal.sql (consumibles.precio_xp ya es numeric(12,2)); NO son
--   INTEGER. precio_xp_actual NULL = usar base.
--   tipo_canje TEXT libre: 'qr', 'codigo', 'ticket'.
-- marca_id queda nullable (un consumible puede no pertenecer a una marca).

ALTER TABLE consumibles
  ADD COLUMN IF NOT EXISTS marca_id        UUID REFERENCES marcas(id),
  ADD COLUMN IF NOT EXISTS stock_total     INTEGER,
  ADD COLUMN IF NOT EXISTS stock_usado     INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS precio_xp_base  NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS precio_xp_actual NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS tipo_canje      TEXT;

-- Indice para listar los consumibles de una marca (canjes de marca).
CREATE INDEX IF NOT EXISTS idx_consumibles_marca
  ON consumibles (marca_id)
  WHERE marca_id IS NOT NULL;

-- ============================================================================
-- 7. VISTA consumibles_precio (precio efectivo oferta/demanda)
-- ============================================================================
-- CREATE OR REPLACE: idempotente (ADR-008). precio_xp_efectivo nunca baja del
-- base; sube con la razon stock_usado / stock_total. stock_total NULL (o <=0)
-- significa ilimitado -> precio base. stock_disponible = 99999 si ilimitado.
-- El filtro activo = TRUE usa la columna activo de la 010.

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
      ROUND(precio_xp_base * (1.0 + stock_usado::NUMERIC / GREATEST(stock_total, 1)))
    )
  END AS precio_xp_efectivo,
  COALESCE(stock_total - stock_usado, 99999) AS stock_disponible
FROM consumibles
WHERE activo = TRUE;

-- ============================================================================
-- VERIFICACION POST-APLICACION (solo lectura; NO se ejecuta dentro de la
-- migracion). Copiar y correr sentencia por sentencia en el editor de Neon.
-- ============================================================================
-- (a) Las 5 tablas nuevas existen (esperadas 5 filas):
-- SELECT tablename FROM pg_tables
--   WHERE schemaname='public'
--     AND tablename IN ('zonas_geograficas','areas_geograficas',
--                       'ranking_zonas','marcas','patrocinios')
--   ORDER BY tablename;
--
-- (b) Zonas sembradas con emoji (esperadas 5 filas; emoji no nulo):
-- SELECT slug, nombre, emoji FROM zonas_geograficas ORDER BY id;
--
-- (c) Default del tipo de recurso del ranking (esperado album_fotos):
-- SELECT column_name, column_default FROM information_schema.columns
--   WHERE table_schema='public' AND table_name='ranking_zonas'
--     AND column_name='recurso_tipo';
--
-- (d) consumibles: las 6 columnas nuevas con sus tipos. precio_xp_base y
--     precio_xp_actual deben ser numeric(12,2):
-- SELECT column_name, data_type, numeric_precision, numeric_scale,
--        is_nullable, COALESCE(column_default,'') AS def
--   FROM information_schema.columns
--   WHERE table_schema='public' AND table_name='consumibles'
--     AND column_name IN ('marca_id','stock_total','stock_usado',
--                         'precio_xp_base','precio_xp_actual','tipo_canje')
--   ORDER BY column_name;
--
-- (e) Vista consumibles_precio creada (esperada 1 fila):
-- SELECT viewname FROM pg_views
--   WHERE schemaname='public' AND viewname='consumibles_precio';
--
-- (f) Indices creados (esperadas 8 filas):
-- SELECT indexname FROM pg_indexes
--   WHERE schemaname='public'
--     AND indexname IN ('idx_areas_ciudad_zona','idx_ranking_area',
--                       'idx_ranking_ciudad','idx_ranking_zona',
--                       'idx_marcas_activa','idx_patrocinios_marca',
--                       'idx_patrocinios_objetivo','idx_consumibles_marca')
--   ORDER BY indexname;
--
-- (g) Idempotencia global: re-ejecutar TODO el archivo y volver a correr
--     (a)-(f): los conteos deben ser IDENTICOS. La semilla de zonas no
--     duplica (ON CONFLICT DO NOTHING) y el ADD COLUMN IF NOT EXISTS / CREATE
--     INDEX IF NOT EXISTS / CREATE OR REPLACE VIEW son no-op.
