-- ============================================================================
-- Migration 023: Interacciones de media unificadas (votos, comentarios, likes)
-- Fecha: 2026-09-17
-- ADR: ADR-036 (seccion B.2)
-- Aplicar en Neon ANTES del deploy del backend v19.
-- Requiere: migraciones 009, 013, 019 y 021 previamente aplicadas.
--
-- Enum de fuente (compartido por media_votos y media_comentarios):
--   curada | viajero_foto | album_foto
--
-- QUE HACE
--   1) media_votos:          voto unico por usuario+fuente+item (PK compuesta),
--                            con soft-delete por activo.
--   2) media_comentarios:    hilo de comentarios con lista de adyacencia
--                            (parent_id self) y tombstone por activo.
--   3) media_comentario_likes: me gusta por comentario (PK compuesta).
--   4) Extiende media_guardados (019): item_id uuid -> text y CHECK de fuente
--      ampliado a ('album','album_foto','viajero_foto','curada').
--   5) Backfill idempotente desde las tablas legacy (album_votos,
--      interacciones tipo='foto' con dims.voto_foto_id, album_comentarios,
--      album_comentario_votos). NADA de movimientos en media_guardados: el
--      cambio uuid -> text preserva el valor.
--
-- NO BORRA TABLAS LEGACY
--   album_votos, album_comentarios y album_comentario_votos se CONSERVAN
--   intactas (cero DROP, cero DELETE, cero TRUNCATE). El backfill solo COPIA;
--   la convivencia es deliberada hasta que el backend viejo deje de leerlas.
--
-- DEFENSIVO (patron BUG-021 / BUG-060)
--   Cada paso comprueba la EXISTENCIA real de la tabla/columna con
--   to_regclass / information_schema antes de tocar nada. interacciones es una
--   tabla base no versionada en db/migrations: su columna dims (003) y su
--   columna opcional xp_ganado (no versionada, cubierta por 021) se validan
--   en tiempo de ejecucion y su ausencia NO rompe la migracion.
--
-- IDEMPOTENCIA (ADR-008)
--   CREATE TABLE/INDEX IF NOT EXISTS; el bloque de media_guardados solo actua
--   si item_id sigue siendo uuid; los backfills usan ON CONFLICT DO NOTHING.
--   Correr el archivo completo DOS veces debe ser no-op (ver preflight 6.3).
--
-- ASCII-safe (ADR-002): cero bytes > 127, cero backticks, sin emojis (BUG-026).
--
-- ROLLBACK (emergencia, DESTRUCTIVO de datos NUEVOS y LOSSY en media_guardados)
--   DROP TABLE IF EXISTS media_comentario_likes;
--   DROP TABLE IF EXISTS media_comentarios;
--   DROP TABLE IF EXISTS media_votos;
--   -- Revertir media_guardados.item_id text -> uuid SOLO si no existen filas
--   -- con item_id no-uuid (p.ej. 'curada'): es LOSSY. Script de bajada
--   -- 023_interacciones_media_unificadas_down.sql; no va en el flujo normal.
--   Las tablas legacy NO se tocan en el rollback.
-- ============================================================================

-- ============================================================
-- 1. TABLA MEDIA_VOTOS
-- ============================================================
-- PK compuesta (usuario_id, fuente, item_id): el voto es unico por usuario e
-- item; un segundo voto viola la PK (23505 -> 409 tipificado en el backend).
-- Soft-delete por activo (cero borrado logico). xp_ganado numeric(12,2) sigue
-- la economia de ADR-035 (021).

CREATE TABLE IF NOT EXISTS media_votos (
  usuario_id uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  fuente varchar(20) NOT NULL CHECK (fuente IN ('curada','viajero_foto','album_foto')),
  item_id text NOT NULL CHECK (char_length(item_id) BETWEEN 1 AND 64),
  xp_ganado numeric(12,2) NOT NULL DEFAULT 0,
  activo boolean NOT NULL DEFAULT true,
  creado_en timestamptz NOT NULL DEFAULT now(),
  actualizado_en timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (usuario_id, fuente, item_id)
);

CREATE INDEX IF NOT EXISTS idx_media_votos_item
  ON media_votos (fuente, item_id)
  WHERE activo = true;

-- ============================================================
-- 2. TABLA MEDIA_COMENTARIOS
-- ============================================================
-- Lista de adyacencia (parent_id self). Profundidad de datos ilimitada; el
-- backfill 5.4 la procesa por niveles con tope defensivo de 50. Soft-delete
-- (activo=false) tipo tombstone: conserva la descendencia. Mismo contrato de
-- texto que album_comentarios (1..1000).

CREATE TABLE IF NOT EXISTS media_comentarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  fuente varchar(20) NOT NULL CHECK (fuente IN ('curada','viajero_foto','album_foto')),
  item_id text NOT NULL CHECK (char_length(item_id) BETWEEN 1 AND 64),
  parent_id uuid REFERENCES media_comentarios(id) ON DELETE CASCADE,
  texto text NOT NULL CHECK (char_length(texto) BETWEEN 1 AND 1000),
  activo boolean NOT NULL DEFAULT true,
  creado_en timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_media_comentarios_item
  ON media_comentarios (fuente, item_id, creado_en ASC);

CREATE INDEX IF NOT EXISTS idx_media_comentarios_parent
  ON media_comentarios (parent_id);

CREATE INDEX IF NOT EXISTS idx_media_comentarios_usuario
  ON media_comentarios (usuario_id, creado_en DESC);

-- ============================================================
-- 3. TABLA MEDIA_COMENTARIO_LIKES
-- ============================================================
-- PK compuesta (usuario_id, comentario_id) hace el like idempotente; el toggle
-- unlike pone activo=false (tombstone, cero borrado logico). Sin XP.

CREATE TABLE IF NOT EXISTS media_comentario_likes (
  usuario_id uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  comentario_id uuid NOT NULL REFERENCES media_comentarios(id) ON DELETE CASCADE,
  activo boolean NOT NULL DEFAULT true,
  creado_en timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (usuario_id, comentario_id)
);

CREATE INDEX IF NOT EXISTS idx_media_comentario_likes_comentario
  ON media_comentario_likes (comentario_id)
  WHERE activo = true;

-- ============================================================
-- 4. EXTENDER MEDIA_GUARDADOS (019)
-- ============================================================
-- 4a. item_id pasa de uuid a text (USING item_id::text: conserva el valor
--     exacto de las filas existentes; NO hay movimiento de datos, ver 5.5).
--     Solo corre si la columna REAL sigue siendo uuid (information_schema);
--     una segunda corrida es no-op.
-- 4b. CHECK de fuente: se busca la constraint REAL por definicion (el nombre
--     puede variar), se dropea solo si NO admite 'curada' y se recrea. Si no
--     existe ninguna, se crea. Cero borrado de datos: solo metadato de CHECK.

DO $$
DECLARE
  v_conname text;
BEGIN
  IF to_regclass('public.media_guardados') IS NULL THEN
    RAISE NOTICE 'migracion 023: media_guardados no existe (falta 019); se omite el bloque 4';
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns c
    WHERE c.table_schema = 'public'
      AND c.table_name = 'media_guardados'
      AND c.column_name = 'item_id'
      AND c.data_type = 'uuid'
  ) THEN
    ALTER TABLE media_guardados
      ALTER COLUMN item_id TYPE text USING item_id::text;
    RAISE NOTICE 'migracion 023: media_guardados.item_id uuid -> text (valores preservados)';
  END IF;

  SELECT c.conname INTO v_conname
  FROM pg_constraint c
  WHERE c.conrelid = 'public.media_guardados'::regclass
    AND c.contype = 'c'
    AND pg_get_constraintdef(c.oid) LIKE '%fuente%'
  ORDER BY c.conname
  LIMIT 1;

  IF v_conname IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint c
      WHERE c.conrelid = 'public.media_guardados'::regclass
        AND c.conname = v_conname
        AND pg_get_constraintdef(c.oid) LIKE '%curada%'
    ) THEN
      EXECUTE format('ALTER TABLE media_guardados DROP CONSTRAINT %I', v_conname);
      ALTER TABLE media_guardados
        ADD CONSTRAINT media_guardados_fuente_check
        CHECK (fuente IN ('album','album_foto','viajero_foto','curada'));
      RAISE NOTICE 'migracion 023: media_guardados CHECK de fuente ampliado con curada';
    ELSE
      RAISE NOTICE 'migracion 023: media_guardados CHECK de fuente ya admite curada; no-op';
    END IF;
  ELSE
    ALTER TABLE media_guardados
      ADD CONSTRAINT media_guardados_fuente_check
      CHECK (fuente IN ('album','album_foto','viajero_foto','curada'));
    RAISE NOTICE 'migracion 023: media_guardados CHECK de fuente creado';
  END IF;
END $$;

-- ============================================================
-- 5. BACKFILL IDEMPOTENTE (copia, nunca borrado)
-- ============================================================
-- Orden fisico: 5.1, 5.2, 5.4 y luego 5.3. Los comentarios (5.4) se cargan
-- ANTES de los likes (5.3) para satisfacer la FK
-- media_comentario_likes.comentario_id -> media_comentarios(id); si no, los
-- likes de comentarios aun no migrados se omitirian en esa corrida.
-- Todo con ON CONFLICT DO NOTHING y guard de existencia de tabla/columna.

-- 5.1 media_votos <- album_votos (fuente 'album_foto', item_id = foto_id::text)
DO $$
BEGIN
  IF to_regclass('public.album_votos') IS NULL THEN
    RAISE NOTICE 'migracion 023: album_votos no existe; se omite backfill 5.1';
    RETURN;
  END IF;

  INSERT INTO media_votos (usuario_id, fuente, item_id, xp_ganado, activo, creado_en, actualizado_en)
  SELECT av.usuario_id,
         'album_foto',
         av.foto_id::text,
         COALESCE(av.xp_ganado, 0),
         true,
         COALESCE(av.creado_en, now()),
         COALESCE(av.creado_en, now())
  FROM album_votos av
  WHERE av.usuario_id IS NOT NULL
    AND av.foto_id IS NOT NULL
  ON CONFLICT (usuario_id, fuente, item_id) DO NOTHING;

  RAISE NOTICE 'migracion 023: backfill 5.1 media_votos <- album_votos completado';
END $$;

-- 5.2 media_votos <- interacciones tipo='foto' con dims ? 'voto_foto_id'
--     (fuente 'viajero_foto', item_id = dims->>'voto_foto_id', solo si el valor
--     es un identificador seguro '^[0-9a-fA-F-]{1,64}$').
--     interacciones es tabla base no versionada: dims y xp_ganado se validan
--     con information_schema; si dims falta se omite, y si xp_ganado falta el
--     backfill usa 0 sin romper (patron BUG-021).
DO $$
DECLARE
  v_xp_expr text;
BEGIN
  IF to_regclass('public.interacciones') IS NULL THEN
    RAISE NOTICE 'migracion 023: interacciones no existe; se omite backfill 5.2';
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns c
    WHERE c.table_schema = 'public'
      AND c.table_name = 'interacciones'
      AND c.column_name = 'dims'
  ) THEN
    RAISE NOTICE 'migracion 023: interacciones.dims no existe; se omite backfill 5.2';
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns c
    WHERE c.table_schema = 'public'
      AND c.table_name = 'interacciones'
      AND c.column_name = 'xp_ganado'
  ) THEN
    v_xp_expr := 'COALESCE(i.xp_ganado, 0)';
  ELSE
    v_xp_expr := '0';
  END IF;

  EXECUTE format($fmt$
    INSERT INTO media_votos (usuario_id, fuente, item_id, xp_ganado, activo, creado_en, actualizado_en)
    SELECT DISTINCT ON (i.usuario_id, i.dims->>'voto_foto_id')
           i.usuario_id,
           'viajero_foto',
           i.dims->>'voto_foto_id',
           %s,
           true,
           COALESCE(i.creado_en, now()),
           COALESCE(i.creado_en, now())
    FROM interacciones i
    WHERE i.tipo = 'foto'
      AND i.usuario_id IS NOT NULL
      AND i.dims ? 'voto_foto_id'
      AND (i.dims->>'voto_foto_id') ~ '^[0-9a-fA-F-]{1,64}$'
    ORDER BY i.usuario_id, i.dims->>'voto_foto_id', i.creado_en DESC NULLS LAST, i.id DESC
    ON CONFLICT (usuario_id, fuente, item_id) DO NOTHING
  $fmt$, v_xp_expr);

  RAISE NOTICE 'migracion 023: backfill 5.2 media_votos <- interacciones tipo=foto completado';
END $$;

-- 5.4 media_comentarios <- album_comentarios, POR PROFUNDIDAD
--     Se preserva id uuid, usuario_id, parent_id, texto, activo y creado_en.
--     Nivel 0 = raices (parent_id NULL); los siguientes niveles se insertan
--     solo si su padre ya vive en media_comentarios (JOIN), respetando la FK.
--     Tope defensivo de 50 niveles. Guard: si album_comentarios no existe,
--     RAISE NOTICE y omitir (no rompe la migracion).
DO $$
DECLARE
  v_nivel int := 0;
  v_insertados int := 0;
BEGIN
  IF to_regclass('public.album_comentarios') IS NULL THEN
    RAISE NOTICE 'migracion 023: album_comentarios no existe; se omite backfill 5.4';
    RETURN;
  END IF;

  INSERT INTO media_comentarios (id, usuario_id, fuente, item_id, parent_id, texto, activo, creado_en)
  SELECT ac.id,
         ac.usuario_id,
         'album_foto',
         ac.foto_id::text,
         NULL,
         ac.texto,
         COALESCE(ac.activo, true),
         COALESCE(ac.creado_en, now())
  FROM album_comentarios ac
  WHERE ac.parent_id IS NULL
    AND ac.usuario_id IS NOT NULL
    AND ac.foto_id IS NOT NULL
  ON CONFLICT (id) DO NOTHING;

  LOOP
    v_nivel := v_nivel + 1;
    EXIT WHEN v_nivel > 50;

    INSERT INTO media_comentarios (id, usuario_id, fuente, item_id, parent_id, texto, activo, creado_en)
    SELECT ac.id,
           ac.usuario_id,
           'album_foto',
           ac.foto_id::text,
           ac.parent_id,
           ac.texto,
           COALESCE(ac.activo, true),
           COALESCE(ac.creado_en, now())
    FROM album_comentarios ac
    JOIN media_comentarios mc ON mc.id = ac.parent_id
    WHERE ac.parent_id IS NOT NULL
      AND ac.usuario_id IS NOT NULL
      AND ac.foto_id IS NOT NULL
    ON CONFLICT (id) DO NOTHING;

    GET DIAGNOSTICS v_insertados = ROW_COUNT;
    EXIT WHEN v_insertados = 0;
  END LOOP;

  RAISE NOTICE 'migracion 023: backfill 5.4 media_comentarios <- album_comentarios completado (tope 50 niveles)';
END $$;

-- 5.3 media_comentario_likes <- album_comentario_votos (tras 5.4, por la FK)
DO $$
BEGIN
  IF to_regclass('public.album_comentario_votos') IS NULL THEN
    RAISE NOTICE 'migracion 023: album_comentario_votos no existe; se omite backfill 5.3';
    RETURN;
  END IF;

  INSERT INTO media_comentario_likes (usuario_id, comentario_id, activo, creado_en)
  SELECT acv.usuario_id,
         acv.comentario_id,
         true,
         COALESCE(acv.creado_en, now())
  FROM album_comentario_votos acv
  JOIN media_comentarios mc ON mc.id = acv.comentario_id
  WHERE acv.usuario_id IS NOT NULL
  ON CONFLICT (usuario_id, comentario_id) DO NOTHING;

  RAISE NOTICE 'migracion 023: backfill 5.3 media_comentario_likes <- album_comentario_votos completado';
END $$;

-- 5.5 media_guardados: SIN movimiento de datos. El ALTER ... USING item_id::text
--     del bloque 4a preserva el valor exacto; no hay filas que copiar. El CHECK
--     de fuente se amplia (metadato) sin tocar los valores existentes.

-- ============================================================================
-- 6. PREFLIGHT READ-ONLY (no se ejecuta dentro de la migracion). Copiar y
--    correr en el editor SQL de Neon.
-- ============================================================================
--
-- 6.1 Tipo REAL de destinos_fotos.id (tabla NO versionada: patron BUG-021).
--     NO se asume uuid ni text; se consulta el estado vivo.
--
-- SELECT column_name, data_type, udt_name
-- FROM information_schema.columns
-- WHERE table_schema = 'public'
--   AND table_name = 'destinos_fotos'
--   AND column_name = 'id';
--
-- 6.2 Conteos legacy vs tablas unificadas. Regla: las tablas nuevas deben
--     igualar o superar a las legacy (solo se AGREGAN filas; nunca se reduce).
--
-- SELECT 'album_votos' AS origen, COUNT(*) AS filas FROM album_votos
-- UNION ALL SELECT 'media_votos', COUNT(*) FROM media_votos
-- UNION ALL SELECT 'album_comentarios', COUNT(*) FROM album_comentarios
-- UNION ALL SELECT 'media_comentarios', COUNT(*) FROM media_comentarios
-- UNION ALL SELECT 'album_comentario_votos', COUNT(*) FROM album_comentario_votos
-- UNION ALL SELECT 'media_comentario_likes', COUNT(*) FROM media_comentario_likes
-- UNION ALL SELECT 'media_guardados', COUNT(*) FROM media_guardados
-- ORDER BY origen;
--
-- 6.3 Idempotencia: correr 023 COMPLETO dos veces y volver a ejecutar 6.2. La
--     segunda corrida no debe alterar tipos ni conteos (todo IF NOT EXISTS /
--     DO guard / ON CONFLICT DO NOTHING).
--
-- 6.4 Tipos de item_id en las tablas unificadas (deben ser text):
--
-- SELECT table_name, column_name, data_type
-- FROM information_schema.columns
-- WHERE table_schema = 'public'
--   AND table_name IN ('media_votos','media_comentarios','media_guardados')
--   AND column_name = 'item_id'
-- ORDER BY table_name;
--
-- 6.5 CHECK de fuente de media_guardados ampliado (debe contener 'curada'):
--
-- SELECT conname, pg_get_constraintdef(oid)
-- FROM pg_constraint
-- WHERE conrelid = 'public.media_guardados'::regclass
--   AND contype = 'c'
-- ORDER BY conname;
