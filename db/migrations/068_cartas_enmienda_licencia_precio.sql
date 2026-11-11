-- ============================================================================
-- Migration 068: ENMIENDA 2 - precio_xp numeric(12,2) + LICENCIA de obra UGC.
-- Fecha: 2026-11-11
-- Referencias: ADR-121 (enmienda 2, auditoria @sql-security 2026-11-11:
--   0 altos / 4 medios), ADR-035 (numeric(12,2) para XP), ADR-002 (ASCII-safe),
--   ADR-003 (cero borrado logico), ADR-006 (el archivo real manda),
--   ADR-008 (idempotencia).
-- Requiere: 046 (usuarios.xp_gastado_sinks), 060, 061, 065,
--   066 (cartas_catalogo.precio_xp), 067 (cartas_media).
-- Contrato congelado: docs/superpowers/specs/2026-11-11-cartas-familias-stats-supply-design.md
--   seccion 11.5.1 (bloques 0 a 3) y 11.5.2 (V21 a V24). Definiciones
--   LITERALES: no se anade nada que la spec no pida.
--
-- PROPOSITO (dos hallazgos MEDIOS de la auditoria, corregidos en aditivo)
--   MEDIO-2: precio_xp nacio integer en 066 y redondearia los multiplicadores
--     0,5 / 1,2 / 1,5 del handler. Pasa a numeric(12,2) (ADR-035).
--   MEDIO-4: una obra se podia aprobar sin derechos aceptados. Se anaden
--     licencia y licencia_aceptada_en (nullables) y un CHECK fail-closed:
--     estado_moderacion='aprobada' exige licencia no vacia.
--
-- POR QUE UNA 068 Y NO UNA EDICION DE 066/067
--   066 y 067 ya estan APLICADAS y su checksum vive en schema_migrations:
--   reescribirlas provocaria deriva. Toda correccion va en migracion nueva.
--
-- CARACTER: ADITIVO e IDEMPOTENTE. Cero DROP COLUMN, cero DROP TABLE,
--   cero DELETE, cero TRUNCATE, cero UPDATE de datos, cero toque a
--   usuarios_cartas, cero escritura en schema_migrations (lo hace el runner).
--   No rellena licencias: fabricar licencia='desconocida' para pasar el CHECK
--   seria inventar un derecho (ADR-003). Si hubiera una obra 'aprobada' sin
--   licencia, el ADD CONSTRAINT aborta con 23514 y la migracion falla.
--
-- IDEMPOTENCIA (ADR-008)
--   (0) precondicion ............ solo lee.
--   (1) tipo .................... guarda por el tipo REAL (data_type='integer');
--                                 la segunda corrida ve 'numeric' y no hace DDL.
--   (2) columnas ................ ADD COLUMN IF NOT EXISTS.
--   (3) CHECK ................... guarda por pg_constraint (ADD CONSTRAINT no
--                                 admite IF NOT EXISTS). Tabla con 0 filas, asi
--                                 que valida de inmediato sin NOT VALID.
--   Segunda corrida = 0 cambios de dato y 0 DDL.
--
-- ATOMICIDAD
--   El runner NO abre transaccion (driver HTTP de Neon, divide por ';'
--   respetando dollar-quote: scripts/apply_sql_file.js:11, :651). Cero
--   sentencias de apertura o cierre de transaccion.
--
-- ASCII-SAFE (ADR-002): cero bytes > 127, cero tildes, cero backticks.
--
-- CONSULTAS PRE (solo lectura, scripts/neon_select.js -f archivo.sql)
--   SELECT data_type, numeric_precision, numeric_scale
--     FROM information_schema.columns
--    WHERE table_schema='public' AND table_name='cartas_catalogo'
--      AND column_name='precio_xp';                    -- integer / null / null
--   SELECT count(*) FROM cartas_catalogo;               -- 31
--   SELECT count(*) FROM information_schema.columns
--    WHERE table_schema='public' AND table_name='cartas_media'
--      AND column_name IN ('licencia','licencia_aceptada_en');   -- 0
--
-- CONSULTAS POST (V21 a V24 de 11.5.2)
--   V21: SELECT data_type, numeric_precision, numeric_scale
--          FROM information_schema.columns
--         WHERE table_schema='public' AND table_name='cartas_catalogo'
--           AND column_name='precio_xp';                 -- numeric / 12 / 2
--   V22: SELECT column_name, data_type, is_nullable
--          FROM information_schema.columns
--         WHERE table_schema='public' AND table_name='cartas_media'
--           AND column_name IN ('licencia','licencia_aceptada_en')
--         ORDER BY 1;                       -- 2 filas: text / timestamptz, YES
--   V23: SELECT conname, convalidated, pg_get_constraintdef(oid)
--          FROM pg_constraint
--         WHERE conname='chk_cartas_media_licencia';  -- true + 'aprobada'
--   V24: SELECT count(*), md5(string_agg(id||'|'||
--          COALESCE((precio_xp::numeric(12,2))::text,'-'), ',' ORDER BY id))
--          FROM cartas_catalogo;                        -- 31 + md5 identico
--
-- ROLLBACK (documentado, NO se ejecuta; requiere aprobacion del operador)
--   -- ADR-003: no se borra nada con datos. Orden inverso.
--   -- 1) ALTER TABLE cartas_media
--   --      DROP CONSTRAINT IF EXISTS chk_cartas_media_licencia;
--   -- 2) ALTER TABLE cartas_media DROP COLUMN IF EXISTS licencia_aceptada_en;
--   --    ALTER TABLE cartas_media DROP COLUMN IF EXISTS licencia;
--   --    solo si count(*) = 0 sobre las filas con licencia no nula.
--   -- 3) ALTER TABLE cartas_catalogo
--   --      ALTER COLUMN precio_xp TYPE integer USING round(precio_xp);
--   --    DESTRUCTIVO: pierde los centavos. No ejecutar sin exportar antes.
--   -- 4) DELETE FROM schema_migrations WHERE numero = 68;  -- solo si aplica
-- ============================================================================

-- (0) PRECONDICION: aborta ANTES de escribir si falta un predecesor ----------
DO $m068pre$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                  WHERE table_schema = 'public' AND table_name = 'cartas_catalogo'
                    AND column_name = 'precio_xp') THEN
    RAISE EXCEPTION 'MIG068: falta 066 (cartas_catalogo.precio_xp)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables
                  WHERE table_schema = 'public' AND table_name = 'cartas_media') THEN
    RAISE EXCEPTION 'MIG068: falta 067 (cartas_media)';
  END IF;
END
$m068pre$;

-- (1) TIPO: integer -> numeric(12,2), guardado por el tipo REAL --------------
--     La guarda es por data_type, no por nombre de constraint: en la segunda
--     corrida la columna ya es numeric y no se ejecuta DDL.
DO $m068tipo$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
              WHERE table_schema = 'public' AND table_name = 'cartas_catalogo'
                AND column_name = 'precio_xp' AND data_type = 'integer') THEN
    ALTER TABLE cartas_catalogo
      ALTER COLUMN precio_xp TYPE numeric(12,2) USING precio_xp::numeric(12,2);
    RAISE NOTICE 'MIG068: precio_xp convertido a numeric(12,2)';
  END IF;
END
$m068tipo$;

-- (2) LICENCIA (nullable: una obra 'pendiente' puede no tenerla todavia) -----
ALTER TABLE cartas_media
  ADD COLUMN IF NOT EXISTS licencia text;

ALTER TABLE cartas_media
  ADD COLUMN IF NOT EXISTS licencia_aceptada_en timestamptz;

-- (3) CHECK fail-closed, guarda por nombre en pg_constraint ------------------
--     Aprobar exige derechos declarados. btrim() rechaza la cadena vacia.
--     La tabla tiene 0 filas: el ADD valida en el acto, sin NOT VALID.
DO $m068chk$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                  WHERE conname = 'chk_cartas_media_licencia'
                    AND conrelid = 'public.cartas_media'::regclass) THEN
    ALTER TABLE cartas_media
      ADD CONSTRAINT chk_cartas_media_licencia CHECK (
        estado_moderacion <> 'aprobada'
        OR (licencia IS NOT NULL AND btrim(licencia) <> ''));
    RAISE NOTICE 'MIG068: chk_cartas_media_licencia creada';
  END IF;
END
$m068chk$;
