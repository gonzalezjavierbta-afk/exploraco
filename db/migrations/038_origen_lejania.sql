-- ============================================================================
-- Migration 038: Multiplicador de Origen por lejania (Local / Nomada /
--   Extranjero) - tablas de referencia geo (geo_ciudades / geo_paises),
--   columna de elegibilidad usuarios.origen_declarado_en, columnas de reporte
--   del ledger (xp_ledger.mult_origen / origen_tier) y 7 claves nuevas en
--   gamificacion_config (ADR-058)
-- Fecha: 2026-09-24
-- Referencias: ADR-002 (ASCII-safe), ADR-003 (Cero Borrado Logico: la columna
--   nueva es ADITIVA y el backfill NO sobrescribe valores no nulos),
--   ADR-006 (baseline = esquema REAL auditado antes de escribir; ver PREFLIGHT
--   y HALLAZGO abajo), ADR-008 (gobernanza e idempotencia de esquema),
--   ADR-024 (geocerca de presencia fisica: las coords geo_* NO se usan para
--   geocerca), ADR-035/ADR-053 (XP numeric; multiplicadores numeric(10,6)),
--   ADR-058 (spec docs/superpowers/specs/2026-09-24-multiplicador-origen-
--   lejania-design.md seccion 6), BUG-026 (emojis en SQL nunca como bytes
--   UTF-8 directos), BUG-021/BUG-060 (patron: migracion completa ANTES del
--   deploy del backend).
-- Requiere: 031 aplicada (gamificacion_config y xp_ledger) para poder sembrar
--   config y anadir columnas del ledger. Si la 031 NO estuviera aplicada, el
--   DDL degrada con NOTICE mediante guards to_regclass (no falla con 42P01).
--   NO requiere el seed geo: esta migracion crea las TABLAS; el loader
--   scripts/seed_geo.js las puebla (mientras no corra, el motor degrada a 1.00).
--
-- QUE HACE (ADR-058, seccion 6)
--   1. geo_ciudades: municipios de Colombia (columnas EXACTAS del seed real
--      db/seeds/geo_ciudades_seed.json) + indice por nombre normalizado.
--   2. geo_paises: centroides por ISO-3166-1 alfa-2 (columnas del seed real
--      db/seeds/geo_paises_seed.json).
--   3. usuarios.origen_declarado_en (anti-teleport; elegibilidad a Extranjero)
--      + backfill UNICO para usuarios que ya declararon ciudad_base/pais_base.
--   4. xp_ledger.mult_origen numeric(10,6) NOT NULL DEFAULT 1 y
--      xp_ledger.origen_tier text NULL con CHECK idempotente.
--   5. gamificacion_config: 7 claves nuevas de la curva de origen (seed
--      ON CONFLICT (clave) DO NOTHING).
--
-- HALLAZGO DEL ESQUEMA REAL (verificado 2026-09-24 con scripts/neon_select.js,
-- modo real, solo lectura; ADR-006):
--   - usuarios, xp_ledger y gamificacion_config EXISTEN (031/033 aplicadas).
--     gamificacion_config tiene clave/valor/descripcion (3 columnas).
--   - usuarios: ciudad_base, pais_base y creado_en EXISTEN; origen_declarado_en
--     NO existe (usuarios_cols = 3 de 4).
--   - xp_ledger: mult_origen y origen_tier NO existen (ledger_cols = 0).
--   - geo_ciudades y geo_paises NO existen (to_regclass = NULL).
--
-- CARACTER DE LA MIGRACION
--   ADITIVA PURA: CREATE TABLE / CREATE INDEX / ALTER TABLE ADD COLUMN /
--   INSERT ... ON CONFLICT DO NOTHING / UPDATE para NO dejar NULL sin
--   sobrescribir valores no nulos. SIN DELETE, SIN DROP, SIN TRUNCATE
--   (Cero Borrado Logico, ADR-003).
--   IDEMPOTENTE (ADR-008): CREATE TABLE/INDEX IF NOT EXISTS; ADD COLUMN IF
--   NOT EXISTS; seed ON CONFLICT DO NOTHING; CHECK con guard pg_constraint;
--   backfill con WHERE origen_declarado_en IS NULL (segunda corrida = 0 filas
--   afectadas). Re-ejecutar el archivo COMPLETO es no-op funcional.
--   ASCII-SAFE (ADR-002/BUG-026): cero bytes > 127, cero tildes, cero ene con
--   tilde, cero emojis, cero escapes unicode, cero backticks.
--   DEGRADABLE: si xp_ledger o gamificacion_config no existieran (031 no
--   aplicada), los DO blocks emiten NOTICE y omiten su parte; el resto del DDL
--   (geo_* y usuarios.origen_declarado_en) se aplica igual.
--
-- APLICACION
--   Correr este archivo COMPLETO en el editor SQL de Neon (o con
--   scripts/apply_sql_file.js) DESPUES de la 037 y ANTES del deploy del backend
--   (ADR-058 R-7 / BUG-021 / BUG-060). Re-ejecutarlo es no-op funcional.
--
-- ROLLBACK (emergencia; LOSSY si ya hay ledger con origen)
--   DROP TABLE IF EXISTS geo_ciudades;
--   DROP TABLE IF EXISTS geo_paises;
--   ALTER TABLE usuarios DROP COLUMN IF EXISTS origen_declarado_en;
--   ALTER TABLE xp_ledger DROP COLUMN IF EXISTS mult_origen;
--   ALTER TABLE xp_ledger DROP COLUMN IF EXISTS origen_tier;
--   DELETE FROM gamificacion_config WHERE clave IN
--     ('factor_origen_local','factor_origen_nomada_max',
--      'factor_origen_extranjero_max','origen_km_nomada','origen_km_extranjero',
--      'origen_km_local','origen_min_dias_cuenta');
--   No va en el flujo normal. Respaldar xp_ledger antes de cualquier rollback.
-- ============================================================================

-- ============================================================================
-- 0. PREFLIGHT (SOLO LECTURA; NO forma parte del DDL; NO se ejecuta solo).
--    Copiar y correr sentencia por sentencia ANTES de aplicar la 038.
-- ============================================================================
-- (0.a) Confirmar que las 2 tablas nuevas aun NO existen. Esperado antes:
--       0 filas; despues: 2 filas.
-- SELECT tablename FROM pg_tables
--   WHERE schemaname='public' AND tablename IN ('geo_ciudades','geo_paises')
--   ORDER BY tablename;
--
-- (0.b) Confirmar que usuarios.origen_declarado_en aun NO existe. Esperado
--       antes: 0 filas; despues: 1 fila.
-- SELECT column_name FROM information_schema.columns
--   WHERE table_schema='public' AND table_name='usuarios'
--     AND column_name='origen_declarado_en';
--
-- (0.c) Confirmar columnas nuevas del ledger (esperado antes: 0 filas).
-- SELECT column_name FROM information_schema.columns
--   WHERE table_schema='public' AND table_name='xp_ledger'
--     AND column_name IN ('mult_origen','origen_tier')
--   ORDER BY column_name;
--
-- (0.d) Estado de la 031 (gamificacion_config y xp_ledger). Esperado hoy:
--       2 filas (ambas existen).
-- SELECT tablename FROM pg_tables
--   WHERE schemaname='public'
--     AND tablename IN ('xp_ledger','gamificacion_config')
--   ORDER BY tablename;
--
-- (0.e) Claves de config ANTES de la 038 (informativo; la 038 agrega 7):
-- SELECT clave, valor FROM gamificacion_config ORDER BY clave;

-- ============================================================================
-- 1. TABLA geo_ciudades (municipios de Colombia; ADR-058 6.1 / B-2)
-- ============================================================================
-- Columnas EXACTAS del seed real db/seeds/geo_ciudades_seed.json (1.122 filas
-- DIVIPOLA: 1.103 Municipio + 18 Area no municipalizada + 1 Isla). cod_mpio es
-- la PK natural (idempotencia del loader: ON CONFLICT (cod_mpio) DO NOTHING).
-- es_capital es DERIVADA (cod_mpio termina en '001') y se deja como columna
-- persistida para el desempate de homonimos (ORDER BY es_capital DESC,
-- cod_mpio ASC), sin tener que recalcular en consulta.
-- pais_iso2 DEFAULT 'CO' es la constante del dataset (char(2), coincide con
-- usuarios.pais_base ISO-2 en mayusculas).
-- lat/lng: double precision NOT NULL. En el seed la columna 'longitud' del CSV
-- DANE es el lng (negativo) y 'Latitud' es el lat; NO se invierten.

CREATE TABLE IF NOT EXISTS geo_ciudades (
  cod_mpio                 char(5) PRIMARY KEY,
  nombre                   text NOT NULL,
  nombre_normalizado       text NOT NULL,
  departamento             text,
  departamento_normalizado text,
  cod_dpto                 char(2),
  tipo                     text,
  lat                      double precision NOT NULL,
  lng                      double precision NOT NULL,
  pais_iso2                char(2) NOT NULL DEFAULT 'CO',
  es_capital               boolean NOT NULL DEFAULT false,
  activo                   boolean NOT NULL DEFAULT true,
  creado_en                timestamptz NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE geo_ciudades IS
  'Municipios de Colombia (DIVIPOLA/DANE). Fuente y trazabilidad: db/seeds/README_GEO.md y db/seeds/geo_ciudades_seed.json. Las coordenadas son de la CABECERA MUNICIPAL (punto oficial DIVIPOLA), no del centro urbano; NO se usan para la geocerca de presencia fisica (ADR-024), solo para medir la distancia origen del usuario -> punto del destino (ADR-058). La puebla scripts/seed_geo.js; mientras no corra, el motor degrada a factor 1.00.';

-- Desempate de homonimos (66 nombres duplicados en el dataset):
--   ORDER BY es_capital DESC, cod_mpio ASC LIMIT 1.
CREATE INDEX IF NOT EXISTS idx_geo_ciudades_norm
  ON geo_ciudades (nombre_normalizado);

-- ============================================================================
-- 2. TABLA geo_paises (centroides por ISO-3166-1 alfa-2; ADR-058 6.2 / B-2)
-- ============================================================================
-- Columnas EXACTAS del seed real db/seeds/geo_paises_seed.json (245
-- paises/territorios). El seed trae ademas iso3 pero la resolucion B-2 NO lo
-- lista, por lo que NO se persiste (puede agregarse despues sin romper).
-- iso2 es la PK (char(2), mayusculas, como usuarios.pais_base).

CREATE TABLE IF NOT EXISTS geo_paises (
  iso2               char(2) PRIMARY KEY,
  nombre             text NOT NULL,
  nombre_normalizado text NOT NULL,
  lat                double precision NOT NULL,
  lng                double precision NOT NULL,
  activo             boolean NOT NULL DEFAULT true,
  creado_en          timestamptz NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE geo_paises IS
  'Centroides de paises y territorios por ISO-3166-1 alfa-2 (komsitr/country-centroid, via Google Public Data). Fuente y trazabilidad: db/seeds/README_GEO.md y db/seeds/geo_paises_seed.json. Se usan solo para ubicar a un usuario extranjero (usuarios.pais_base != CO) y medir distancia a un punto en Colombia (ADR-058). La puebla scripts/seed_geo.js.';

-- ============================================================================
-- 3. usuarios.origen_declarado_en (anti-teleport; ADR-058 6.3 / B-4)
-- ============================================================================
-- Se fija cuando ciudad_base/pais_base cambian (lo escribe api/usuarios.js en
-- la fase de backend). NULL = sin declaracion => NO elegible a Extranjero.
-- Backfill UNICO: los usuarios existentes que YA tienen ciudad_base o
-- pais_base declarados reciben origen_declarado_en = COALESCE(creado_en, NOW())
-- para que califiquen de inmediato (anti-teleport hacia adelante: cuenta y
-- declaracion se consideran simultaneas al momento del backfill). El WHERE
-- origen_declarado_en IS NULL garantiza idempotencia y NO sobrescribir un valor
-- ya fijado por el backend.

ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS origen_declarado_en timestamptz;

-- Guard por existencia de columnas: en un entorno sin ciudad_base/pais_base el
-- UPDATE no debe fallar con 42703. El backfill solo corre si ambas existen.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='usuarios'
      AND column_name='ciudad_base'
  ) OR NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='usuarios'
      AND column_name='pais_base'
  ) THEN
    RAISE NOTICE 'migracion 038: ciudad_base/pais_base ausentes; se omite backfill origen_declarado_en';
    RETURN;
  END IF;

  UPDATE usuarios
    SET origen_declarado_en = COALESCE(creado_en, NOW())
    WHERE origen_declarado_en IS NULL
      AND (ciudad_base IS NOT NULL OR pais_base IS NOT NULL);

  RAISE NOTICE 'migracion 038: backfill origen_declarado_en completado';
END $$;

-- ============================================================================
-- 4. xp_ledger: columnas de reporte del origen (ADR-058 6.5)
-- ============================================================================
-- mult_origen: factor efectivo de la curva (1.00 .. 1.40; 1.00 sin punto).
--   numeric(10,6) por coherencia con mult_nivel/mult_stack/mult_final de la 031
--   (los 6 decimales minimizan el residuo del invariante de reconciliacion).
-- origen_tier: 'local' | 'nomada' | 'extranjero' | NULL (NULL = sin punto / no
--   elegible). El detalle (dist_km, fuente, punto) vive en contexto JSONB.
--
-- Guard: si xp_ledger NO existe (031 no aplicada) se emite NOTICE y se omiten
-- ambos ALTER; la migracion NO falla con 42P01.

DO $$
BEGIN
  IF to_regclass('public.xp_ledger') IS NULL THEN
    RAISE NOTICE 'migracion 038: xp_ledger no existe (031 no aplicada); se omiten mult_origen/origen_tier';
    RETURN;
  END IF;

  ALTER TABLE xp_ledger
    ADD COLUMN IF NOT EXISTS mult_origen numeric(10,6) NOT NULL DEFAULT 1;

  ALTER TABLE xp_ledger
    ADD COLUMN IF NOT EXISTS origen_tier text;
END $$;

-- Guard del CHECK de origen_tier (patron de la 031): ADD CONSTRAINT no soporta
-- IF NOT EXISTS en PostgreSQL, asi que se prueba contra pg_constraint. Permite
-- NULL (sin punto / no elegible) y solo los 3 valores del contrato. Segunda
-- corrida = no-op. Si xp_ledger no existe, se omite con NOTICE.

DO $$
BEGIN
  IF to_regclass('public.xp_ledger') IS NULL THEN
    RAISE NOTICE 'migracion 038: xp_ledger no existe; se omite el CHECK de origen_tier';
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.xp_ledger'::regclass
      AND contype = 'c'
      AND conname = 'xp_ledger_origen_tier_chk'
  ) THEN
    ALTER TABLE xp_ledger
      ADD CONSTRAINT xp_ledger_origen_tier_chk
      CHECK (origen_tier IS NULL OR origen_tier IN ('local','nomada','extranjero'));
    RAISE NOTICE 'migracion 038: CHECK xp_ledger_origen_tier_chk creado';
  ELSE
    RAISE NOTICE 'migracion 038: CHECK xp_ledger_origen_tier_chk ya vigente; no-op';
  END IF;
END $$;

-- ============================================================================
-- 5. gamificacion_config: 7 claves nuevas de la curva de origen (ADR-058 6.4)
-- ============================================================================
-- Reusa la tabla clave/valor de la 031 (clave text PK, valor numeric(12,4),
-- descripcion text NOT NULL DEFAULT '', actualizado_en). numeric(12,4) cubre
-- los factores (1.0000..1.4000) y los km (25..3000). Seed idempotente
-- ON CONFLICT (clave) DO NOTHING: re-ejecutar NO reescribe una recalibracion
-- manual del operador. Descripciones ASCII. El motor JS usa estos valores con
-- fallback a constantes si la tabla/clave no existe (ADR-058 6.4).
--
-- Guard: si gamificacion_config NO existe (031 no aplicada) se emite NOTICE y
-- se omite el seed.

DO $$
BEGIN
  IF to_regclass('public.gamificacion_config') IS NULL THEN
    RAISE NOTICE 'migracion 038: gamificacion_config no existe (031 no aplicada); se omite el seed de origen';
    RETURN;
  END IF;

  INSERT INTO gamificacion_config (clave, valor, descripcion) VALUES
    ('factor_origen_local', 1.0000,
     'Factor de origen para Local (sin premio). ADR-058'),
    ('factor_origen_nomada_max', 1.2000,
     'Tope del factor Nomada (a origen_km_nomada km). ADR-058'),
    ('factor_origen_extranjero_max', 1.4000,
     'Tope del factor Extranjero (a origen_km_extranjero km). ADR-058'),
    ('origen_km_nomada', 1000.0000,
     'Km de saturacion de la curva Nomada (tope x1.20). ADR-058'),
    ('origen_km_extranjero', 3000.0000,
     'Km de saturacion de la curva Extranjero (tope x1.40). ADR-058'),
    ('origen_km_local', 25.0000,
     'Radio de misma ciudad cuando el punto no trae etiqueta de ciudad. ADR-058'),
    ('origen_min_dias_cuenta', 7.0000,
     'Antiguedad minima de cuenta y de declaracion para Nomada/Extranjero. ADR-058')
  ON CONFLICT (clave) DO NOTHING;

  RAISE NOTICE 'migracion 038: seed de 7 claves de origen en gamificacion_config completado';
END $$;

-- ============================================================================
-- VERIFICACION POST-APLICACION (solo lectura; NO se ejecuta dentro de la
-- migracion; NO modifica nada). Copiar y correr sentencia por sentencia.
-- ============================================================================
-- (a) Las 2 tablas nuevas (esperadas 2 filas):
-- SELECT tablename FROM pg_tables
--   WHERE schemaname='public' AND tablename IN ('geo_ciudades','geo_paises')
--   ORDER BY tablename;
--
-- (a.2) geo_ciudades: columnas (esperadas 13 filas, en el orden del contrato):
-- SELECT column_name, data_type, is_nullable, column_default
--   FROM information_schema.columns
--   WHERE table_schema='public' AND table_name='geo_ciudades'
--   ORDER BY ordinal_position;
--
-- (a.3) geo_paises: columnas (esperadas 7 filas, en el orden del contrato):
-- SELECT column_name, data_type, is_nullable, column_default
--   FROM information_schema.columns
--   WHERE table_schema='public' AND table_name='geo_paises'
--   ORDER BY ordinal_position;
--
-- (a.4) geo_ciudades: indice (esperada 1 fila):
-- SELECT indexname FROM pg_indexes
--   WHERE schemaname='public' AND tablename='geo_ciudades'
--     AND indexname='idx_geo_ciudades_norm';
--
-- (a.5) Cobertura del seed (despues de correr scripts/seed_geo.js; mientras no
--       corra: 0 / 0):
-- SELECT
--   (SELECT COUNT(*) FROM geo_ciudades) AS ciudades,
--   (SELECT COUNT(*) FROM geo_paises)   AS paises;
-- Esperado con el seed cargado: 1122 y 245.
--
-- (b) usuarios.origen_declarado_en (esperada 1 fila; timestamp sin zona,
--     NULL-able, sin default):
-- SELECT column_name, data_type, is_nullable, column_default
--   FROM information_schema.columns
--   WHERE table_schema='public' AND table_name='usuarios'
--     AND column_name='origen_declarado_en';
--
-- (b.2) Cobertura del backfill (informativo; conteo de usuarios con origen
--       declarado y con ciudad/pais declarados):
-- SELECT
--   COUNT(*) FILTER (WHERE origen_declarado_en IS NOT NULL) AS con_origen,
--   COUNT(*) FILTER (WHERE ciudad_base IS NOT NULL OR pais_base IS NOT NULL) AS con_ciudad_o_pais
-- FROM usuarios;
--
-- (c) xp_ledger: columnas nuevas (esperadas 2 filas):
-- SELECT column_name, data_type, is_nullable, column_default
--   FROM information_schema.columns
--   WHERE table_schema='public' AND table_name='xp_ledger'
--     AND column_name IN ('mult_origen','origen_tier')
--   ORDER BY column_name;
--   mult_origen -> numeric(10,6) NOT NULL DEFAULT 1
--   origen_tier -> text NULL
--
-- (d) xp_ledger: CHECK de origen_tier (esperada 1 fila; la definicion DEBE
--     permitir NULL y los 3 valores):
-- SELECT conname, pg_get_constraintdef(oid) AS def
--   FROM pg_constraint
--   WHERE conrelid='public.xp_ledger'::regclass AND contype='c'
--     AND conname='xp_ledger_origen_tier_chk';
--
-- (e) gamificacion_config: las 7 claves nuevas (esperadas 7 filas con estos
--     valores):
-- SELECT clave, valor FROM gamificacion_config
--   WHERE clave IN ('factor_origen_local','factor_origen_nomada_max',
--                   'factor_origen_extranjero_max','origen_km_nomada',
--                   'origen_km_extranjero','origen_km_local',
--                   'origen_min_dias_cuenta')
--   ORDER BY clave;
--   factor_origen_extranjero_max | 1.4000
--   factor_origen_local          | 1.0000
--   factor_origen_nomada_max     | 1.2000
--   origen_km_extranjero         | 3000.0000
--   origen_km_local              | 25.0000
--   origen_km_nomada             | 1000.0000
--   origen_min_dias_cuenta       | 7.0000
--
-- (e.2) Total de claves en gamificacion_config (esperado 3 de la 031 + 7 de la
--       038 = 10):
-- SELECT COUNT(*) AS total_claves FROM gamificacion_config;
--
-- (f) ASCII del seed geo (debe ser 0 en ambas tablas):
-- SELECT COUNT(*) AS nombres_no_ascii
--   FROM geo_ciudades
--   WHERE nombre <> convert_to(nombre, 'UTF8')::text;
--
-- (g) Idempotencia global: re-ejecutar TODO el archivo y volver a correr
--     (a)-(e): los conteos y valores deben ser IDENTICOS (no-op funcional).
