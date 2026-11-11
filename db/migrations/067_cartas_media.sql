-- ============================================================================
-- Migration 067: cartas - tabla de MEDIA (obra UGC) + FK nullable
--   cartas_catalogo.media_id.
-- Fecha: 2026-11-11
-- Referencias: ADR-121, ADR-108, ADR-003 (cero borrado logico), ADR-008
--   (idempotencia), ADR-002 (ASCII-safe), ADR-006 (el archivo real manda).
-- Requiere: 040 (cartas_catalogo), 060 (patron de FK nullable con doble guarda,
--   :307-324), 065 (aplicada). NO depende de 066: tabla y FK son
--   independientes; se ejecuta despues para que el rollback sea inverso.
-- Contrato congelado: docs/superpowers/specs/2026-11-11-cartas-familias-stats-supply-design.md
--   seccion 7.2 (bloques 1 y 2) y matriz 8. Columnas, CHECKs, indices y FK
--   son LITERALES: esta migracion no anade nada que la spec no pida.
--
-- PROPOSITO
--   1. cartas_media: la OBRA (musica / foto / video / poema) con moderacion
--      previa obligatoria. Nace VACIA y sin escritor: el consumidor (cola de
--      moderacion en api/admin.js, rama ?recurso=) es contrato de fase 2 y
--      esta tanda no toca admin.html ni api/admin.js.
--   2. cartas_catalogo.media_id uuid NULLABLE + FK ON DELETE RESTRICT +
--      indice parcial. Relacion 1 obra -> N ediciones: media_id NO es UNIQUE
--      (una misma cancion puede sostener la carta comun y la dorada).
--
-- QUE NO HACE
--   - No hace backfill: no existe ninguna obra el dia de la migracion, asi que
--     media_id queda NULL en 31/31. Un media_id NULL no viola ningun CHECK.
--   - No crea columna "licencia": el contrato 7.2 no la define (columnas
--     exactas: id, autor_id, tipo, titulo, media_url, thumb_url, texto,
--     duracion_seg, estado_moderacion, moderado_por, moderado_en, motivo,
--     activo, creado_en). Anadirla seria inventar contrato.
--   - No reusa album_fotos (pertenencia, dominio y estado distintos: la obra
--     no pertenece a ningun album y album_fotos.foto_type no admite poema).
--   - No toca cromos_catalogo, usuarios_cartas ni endpoints.
--   - No crea RLS: no hay precedente en db/migrations.
--
-- POR QUE autor_id SIN FK (precedente 060:238-242)
--   El autor puede desaparecer y la lectura degrada con COALESCE. Una FK
--   obligaria a bloquear el borrado del usuario o a borrar su obra, y lo
--   segundo viola ADR-003.
--
-- IDEMPOTENCIA (ADR-008)
--   CREATE TABLE / INDEX IF NOT EXISTS ....... no-op en la segunda corrida.
--   ADD COLUMN IF NOT EXISTS ................. no-op.
--   ADD CONSTRAINT (no admite IF NOT EXISTS) -> todo va en DO con guarda
--     pg_constraint. La FK lleva DOBLE guarda (por nombre Y por "ya existe una
--     FK sobre media_id"), patron literal 060:307-324.
--
-- ATOMICIDAD
--   El runner NO abre transaccion (driver HTTP de Neon, divide por ';'
--   respetando dollar-quote: scripts/apply_sql_file.js:11, :651). Cero
--   sentencias de apertura o cierre de transaccion. La tabla y todos sus
--   CHECKs quedan validos de inmediato porque la tabla nace vacia.
--
-- ASCII-SAFE (ADR-002): cero bytes > 127, cero tildes, cero backticks.
--
-- CONSULTAS PRE (solo lectura, scripts/neon_select.js -f archivo.sql)
--   SELECT count(*) FROM information_schema.tables
--    WHERE table_schema='public' AND table_name='cartas_media';        -- 0
--   SELECT count(*) FROM information_schema.columns
--    WHERE table_schema='public' AND table_name='cartas_catalogo'
--      AND column_name='media_id';                                    -- 0
--
-- CONSULTAS POST
--   SELECT column_name, data_type, is_nullable, column_default
--     FROM information_schema.columns
--    WHERE table_schema='public' AND table_name='cartas_media'
--    ORDER BY ordinal_position;                                       -- 14 filas
--   SELECT column_name, data_type, is_nullable
--     FROM information_schema.columns
--    WHERE table_schema='public' AND table_name='cartas_catalogo'
--      AND column_name='media_id';        -- uuid / YES / sin default
--   SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint
--    WHERE conrelid='public.cartas_media'::regclass ORDER BY conname;  -- 8 CHECKs
--   SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint
--    WHERE conname='fk_cartas_catalogo_media_id';  -- FOREIGN KEY ... RESTRICT
--   SELECT count(*) FROM cartas_catalogo WHERE media_id IS NULL;      -- 31
--
-- ROLLBACK (documentado, NO se ejecuta; requiere aprobacion del operador)
--   -- ADR-003: no se borra nada con datos. Orden inverso.
--   -- 1) DROP TABLE IF EXISTS cartas_media;   -- solo si count(*) = 0
--   -- 2) ALTER TABLE cartas_catalogo
--   --      DROP CONSTRAINT IF EXISTS fk_cartas_catalogo_media_id;
--   -- 3) DROP INDEX IF EXISTS idx_cartas_catalogo_media;
--   -- 4) ALTER TABLE cartas_catalogo DROP COLUMN IF EXISTS media_id;
--   --    DESTRUCTIVO si hay filas con media_id no nulo.
--   -- 5) DELETE FROM schema_migrations WHERE numero = 67;  -- solo si aplica
-- ============================================================================

-- (1) LA OBRA -----------------------------------------------------------------
--     estado_moderacion nace 'pendiente': nada nace aprobado. activo es baja
--     logica (ADR-003): retirar = estado 'retirada' + activo false, nunca
--     DELETE.
CREATE TABLE IF NOT EXISTS cartas_media (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  autor_id           uuid,
  tipo               varchar(10) NOT NULL,
  titulo             varchar(200) NOT NULL,
  media_url          text NOT NULL,
  thumb_url          text,
  texto              text,
  duracion_seg       integer,
  estado_moderacion  varchar(12) NOT NULL DEFAULT 'pendiente',
  moderado_por       uuid,
  moderado_en        timestamptz,
  motivo             text,
  activo             boolean NOT NULL DEFAULT true,
  creado_en          timestamptz NOT NULL DEFAULT now()
);

-- CHECKs de la obra (DO con guarda pg_constraint: ADD CONSTRAINT no admite
-- IF NOT EXISTS). La regla "solo se acuna con estado_moderacion='aprobada'" es
-- de handler (no expresable como CHECK entre tablas) y se declara en la spec,
-- no se finge aqui.
DO $m067c$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                  WHERE conname = 'chk_cartas_media_tipo'
                    AND conrelid = 'public.cartas_media'::regclass) THEN
    ALTER TABLE cartas_media
      ADD CONSTRAINT chk_cartas_media_tipo
      CHECK (tipo IN ('musica', 'foto', 'video', 'poema'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                  WHERE conname = 'chk_cartas_media_estado'
                    AND conrelid = 'public.cartas_media'::regclass) THEN
    ALTER TABLE cartas_media
      ADD CONSTRAINT chk_cartas_media_estado
      CHECK (estado_moderacion IN ('pendiente', 'aprobada', 'rechazada',
                                   'retirada'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                  WHERE conname = 'chk_cartas_media_url'
                    AND conrelid = 'public.cartas_media'::regclass) THEN
    ALTER TABLE cartas_media
      ADD CONSTRAINT chk_cartas_media_url
      CHECK (btrim(media_url) <> '');
  END IF;

  -- Un poema sin texto no es un poema: el cuerpo es obligatorio.
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                  WHERE conname = 'chk_cartas_media_poema'
                    AND conrelid = 'public.cartas_media'::regclass) THEN
    ALTER TABLE cartas_media
      ADD CONSTRAINT chk_cartas_media_poema
      CHECK (tipo <> 'poema' OR (texto IS NOT NULL AND btrim(texto) <> ''));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                  WHERE conname = 'chk_cartas_media_duracion'
                    AND conrelid = 'public.cartas_media'::regclass) THEN
    ALTER TABLE cartas_media
      ADD CONSTRAINT chk_cartas_media_duracion
      CHECK (duracion_seg IS NULL OR duracion_seg > 0);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                  WHERE conname = 'chk_cartas_media_av'
                    AND conrelid = 'public.cartas_media'::regclass) THEN
    ALTER TABLE cartas_media
      ADD CONSTRAINT chk_cartas_media_av
      CHECK (tipo <> 'musica' OR duracion_seg IS NOT NULL);
  END IF;

  -- El estado no puede mentir: pendiente no admite moderador ni fecha.
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                  WHERE conname = 'chk_cartas_media_pendiente'
                    AND conrelid = 'public.cartas_media'::regclass) THEN
    ALTER TABLE cartas_media
      ADD CONSTRAINT chk_cartas_media_pendiente
      CHECK (estado_moderacion <> 'pendiente'
             OR (moderado_por IS NULL AND moderado_en IS NULL));
  END IF;

  -- Un rechazo exige motivo: el autor tiene que saber que corregir.
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                  WHERE conname = 'chk_cartas_media_rechazo'
                    AND conrelid = 'public.cartas_media'::regclass) THEN
    ALTER TABLE cartas_media
      ADD CONSTRAINT chk_cartas_media_rechazo
      CHECK (estado_moderacion <> 'rechazada'
             OR (motivo IS NOT NULL AND btrim(motivo) <> ''));
  END IF;
END
$m067c$;

-- Indices: cola de moderacion (estado, creado_en) y obras por autor.
CREATE INDEX IF NOT EXISTS idx_cartas_media_cola
  ON cartas_media (estado_moderacion, creado_en);

CREATE INDEX IF NOT EXISTS idx_cartas_media_autor
  ON cartas_media (autor_id, creado_en DESC);

-- (2) FK NULLABLE DESDE EL CATALOGO ------------------------------------------
ALTER TABLE cartas_catalogo
  ADD COLUMN IF NOT EXISTS media_id uuid;

-- Doble guarda (patron literal 060:307-324): por nombre Y por "ya existe una
-- FK sobre media_id", para que una segunda corrida no cree una FK duplicada
-- aunque alguien la hubiera renombrado a mano. ON DELETE RESTRICT (no SET
-- NULL): una carta no puede perder su obra en silencio.
DO $m067f$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                  WHERE conname = 'fk_cartas_catalogo_media_id'
                    AND conrelid = 'public.cartas_catalogo'::regclass)
     AND NOT EXISTS (SELECT 1
                       FROM pg_constraint c
                       JOIN pg_attribute a
                         ON a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey)
                      WHERE c.conrelid = 'public.cartas_catalogo'::regclass
                        AND c.contype = 'f'
                        AND a.attname = 'media_id') THEN
    ALTER TABLE cartas_catalogo
      ADD CONSTRAINT fk_cartas_catalogo_media_id
      FOREIGN KEY (media_id) REFERENCES cartas_media(id) ON DELETE RESTRICT;
  END IF;
END
$m067f$;

-- Indice de la FK (PostgreSQL no lo crea solo). Parcial: no indexa los NULL.
CREATE INDEX IF NOT EXISTS idx_cartas_catalogo_media
  ON cartas_catalogo (media_id) WHERE media_id IS NOT NULL;
