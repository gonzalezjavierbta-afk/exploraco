-- ============================================================================
-- Migration 030: Carpetas de guardados de media (organizacion PRIVADA)
-- Fecha: 2026-09-21
-- Referencias: ADR-002 (ASCII-safe), ADR-003 (cero borrado logico),
--   ADR-006 (validar el esquema real antes de escribir),
--   ADR-008 (gobernanza e idempotencia de esquema), ADR-036 (media unificada
--   media_guardados), ADR-052 (carpetas de guardados).
-- Requiere: 019 (media_guardados), 023 (media_guardados.item_id text + CHECK
--   de fuente ampliado) y el resto de 003-029 aplicado.
--
-- QUE HACE
--   1. guardados_carpetas: carpeta PERSONAL del usuario para organizar sus
--      media guardadas de la comunidad. Es PRIVADA y NO es un album: no tiene
--      relacion con la tabla albumes ni con el Museo (la media guardada NO se
--      copia ni se agrega a un album; solo se reetiqueta su ubicacion).
--   2. media_guardados.carpeta_id UUID NULL REFERENCES guardados_carpetas(id)
--      ON DELETE SET NULL: carpeta (opcional) del bookmark. Una media guardada
--      vive en UNA carpeta a la vez; NULL = "Sin carpeta".
--   3. Indices: unicidad de nombre activo por usuario (case-insensitive),
--      listado de carpetas y agrupacion por carpeta.
--
-- POR QUE TABLA Y NO UNA COLUMNA text EN media_guardados
--   (ver ADR-052, opciones evaluadas)
--   - Renombrar una carpeta es UN UPDATE (columna text obligaria a reescribir
--     todas las filas y admitiria duplicados por tilde/mayusculas).
--   - Permite carpetas VACIAS (creadas antes de asignar media).
--   - Soft-delete con las filas preservadas (ADR-003): al desactivar la
--     carpeta, sus bookmarks NO se borran; se reasignan a NULL.
--   - Id estable para la UI (selects, orden, aria) en vez de texto libre.
--   - Coherente con el patron "carpetas = tabla" de ADR-039 (albumes), pero
--     en un espacio SEPARADO que no toca el Museo.
--
-- CARACTER DE LA MIGRACION
--   ADITIVA: CREATE TABLE / ALTER TABLE ADD COLUMN / CREATE INDEX. No elimina,
--   no renombra y no toca objetos de 003-029. NO modifica albumes ni
--   album_fotos.
--   IDEMPOTENTE (ADR-008): CREATE TABLE/INDEX IF NOT EXISTS; el ADD COLUMN de
--   media_guardados va en un DO block guardado por to_regclass e
--   information_schema (defensivo, patron BUG-021) para que re-ejecutar sea
--   no-op y para no romper si la 019 aun no estuviera aplicada.
--   ASCII-SAFE (ADR-002): cero bytes > 127, cero tildes, cero ene, cero
--   backticks.
--
-- APLICACION
--   Correr este archivo COMPLETO en el editor SQL de Neon DESPUES de la 029.
--   Patron BUG-021/BUG-060: archivo completo en una sola corrida.
--
-- ROLLBACK (emergencia, LOSSY si ya hay carpetas con media asignada)
--   ALTER TABLE media_guardados DROP COLUMN IF EXISTS carpeta_id;
--   DROP TABLE IF EXISTS guardados_carpetas;
--   No va en el flujo normal y se pierde la organizacion de los guardados.
-- ============================================================================

-- ============================================================================
-- 0. PREFLIGHT (SOLO LECTURA; NO forma parte del DDL; NO se ejecuta solo).
--    Copiar y correr sentencia por sentencia ANTES de aplicar la 030.
-- ============================================================================
-- (0.a) Confirmar que media_guardados existe y su PK (019/023 aplicadas).
--       Esperado: 1 fila.
-- SELECT table_name FROM information_schema.tables
--   WHERE table_schema='public' AND table_name='media_guardados';
--
-- (0.b) Confirmar que la tabla nueva aun NO existe. Esperado antes: 0 filas;
--       despues: 1 fila.
-- SELECT tablename FROM pg_tables
--   WHERE schemaname='public' AND tablename='guardados_carpetas';
--
-- (0.c) Confirmar que carpeta_id aun NO existe. Esperado antes: 0 filas;
--       despues: 1 fila.
-- SELECT column_name FROM information_schema.columns
--   WHERE table_schema='public' AND table_name='media_guardados'
--     AND column_name='carpeta_id';

-- ============================================================================
-- 1. TABLA guardados_carpetas
-- ============================================================================
-- nombre varchar(80) (no text): mismo techo que otros rotulos de UI y
-- suficiente para un nombre de carpeta personal. activo boolean para
-- soft-delete (cero borrado logico). orden integer para el orden de la UI.

CREATE TABLE IF NOT EXISTS guardados_carpetas (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id    uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  nombre        varchar(80) NOT NULL CHECK (char_length(nombre) BETWEEN 1 AND 80),
  orden         integer NOT NULL DEFAULT 0,
  activo        boolean NOT NULL DEFAULT true,
  creado_en     timestamptz NOT NULL DEFAULT now(),
  actualizado_en timestamptz NOT NULL DEFAULT now()
);

-- Un solo nombre (case-insensitive) activo por usuario: evita carpetas
-- duplicadas por diferencia de mayusculas. El backend igual normaliza el
-- nombre, pero el indice es la garantia dura (ON CONFLICT DO NOTHING seguro).
CREATE UNIQUE INDEX IF NOT EXISTS idx_guardados_carpetas_usuario_nombre
  ON guardados_carpetas (usuario_id, lower(nombre))
  WHERE activo = true;

-- Listado de carpetas activas del usuario en el orden de la UI.
CREATE INDEX IF NOT EXISTS idx_guardados_carpetas_usuario
  ON guardados_carpetas (usuario_id, orden, creado_en)
  WHERE activo = true;

-- ============================================================================
-- 2. COLUMNA media_guardados.carpeta_id
-- ============================================================================
-- Defensivo (patron BUG-021): si media_guardados no existiera (019 pendiente)
-- se omite con NOTICE en vez de abortar. ON DELETE SET NULL mantiene la
-- integridad si algun dia se borrara fisicamente una carpeta; el flujo normal
-- usa soft-delete (activo=false) y el backend reasigna carpeta_id a NULL
-- explicitamente al desactivar una carpeta.

DO $$
BEGIN
  IF to_regclass('public.media_guardados') IS NULL THEN
    RAISE NOTICE 'migracion 030: media_guardados no existe (falta 019); se omite carpeta_id';
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='media_guardados'
      AND column_name='carpeta_id'
  ) THEN
    ALTER TABLE media_guardados
      ADD COLUMN carpeta_id uuid REFERENCES guardados_carpetas(id) ON DELETE SET NULL;
    RAISE NOTICE 'migracion 030: media_guardados.carpeta_id creada';
  ELSE
    RAISE NOTICE 'migracion 030: media_guardados.carpeta_id ya existe; no-op';
  END IF;
END $$;

-- Indice de agrupacion: "media guardada de esta carpeta" (y "sin carpeta").
DO $$
BEGIN
  IF to_regclass('public.media_guardados') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_media_guardados_carpeta
      ON media_guardados (usuario_id, carpeta_id)
      WHERE activo = true;
  END IF;
END $$;

-- ============================================================================
-- VERIFICACION POST-APLICACION (solo lectura; NO modifica nada). Copiar y
-- correr sentencia por sentencia en el editor de Neon.
-- ============================================================================
-- (a) Tabla creada (esperada 1 fila):
-- SELECT tablename FROM pg_tables
--   WHERE schemaname='public' AND tablename='guardados_carpetas';
--
-- (b) Columna creada y nullable (esperada 1 fila, is_nullable = YES):
-- SELECT column_name, data_type, is_nullable
--   FROM information_schema.columns
--   WHERE table_schema='public' AND table_name='media_guardados'
--     AND column_name='carpeta_id';
--
-- (c) FK creada hacia guardados_carpetas (esperada 1 fila):
-- SELECT conname, pg_get_constraintdef(oid) AS def
--   FROM pg_constraint
--   WHERE conrelid='public.media_guardados'::regclass AND contype='f'
--     AND pg_get_constraintdef(oid) LIKE '%guardados_carpetas%';
--
-- (d) Indices creados (esperadas 3 filas):
-- SELECT indexname FROM pg_indexes
--   WHERE schemaname='public'
--     AND indexname IN ('idx_guardados_carpetas_usuario_nombre',
--                       'idx_guardados_carpetas_usuario',
--                       'idx_media_guardados_carpeta')
--   ORDER BY indexname;
--
-- (e) Idempotencia global: re-ejecutar TODO el archivo y volver a correr
--     (a)-(d): los conteos deben ser IDENTICOS (no-op).

-- ROLLBACK (comentado; solo emergencia, LOSSY si hay carpetas con media):
-- ALTER TABLE media_guardados DROP COLUMN IF EXISTS carpeta_id;
-- DROP TABLE IF EXISTS guardados_carpetas;
