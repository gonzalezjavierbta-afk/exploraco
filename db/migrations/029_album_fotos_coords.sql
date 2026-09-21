-- ============================================================================
-- Migration 029: Ubicacion individual por recurso de album (pin por video/foto)
-- Fecha: 2026-09-21
-- Referencias: ADR-002 (ASCII-safe), ADR-003 (cero borrado logico),
--   ADR-006 (validar el esquema real antes de escribir),
--   ADR-008 (gobernanza e idempotencia de esquema), ADR-039 (visibilidad por
--   recurso; ENMIENDA 1), ADR-051 (coords por recurso; supersede la opcion 5
--   de ADR-039).
-- Requiere: 009 (albumes + album_fotos), 025 (album_fotos.visible) y el resto
--   de 003-028 aplicado.
--
-- QUE HACE
--   1. album_fotos.lat / album_fotos.lng DOUBLE PRECISION NULL: coordenada
--      PROPIA del recurso (video/foto/audio del Museo). NULL = el recurso
--      hereda la ubicacion de su album (comportamiento actual de ADR-039).
--   2. Constraint CHECK album_fotos_coords_chk: lat/lng ambos NULL o ambos
--      presentes y dentro del rango global ([-90,90] / [-180,180]). Permite
--      NULL (cero regresion para los recursos existentes).
--   3. Indice idx_album_fotos_coords para la capa del mapa (solo filas con
--      coords propias).
--
-- SEMANTICA DE FALLBACK (CLAVE, NO ROMPE EL RUNTIME ACTUAL)
--   Un recurso sin coords propias (lat IS NULL) se sigue georreferenciando por
--   su album. El backend lo resuelve con COALESCE(af.lat, a.lat) /
--   COALESCE(af.lng, a.lng) al emitir multimedia_mapa y museo_recurso. Si el
--   album tampoco tiene coords, aplica el fallback historico por autor
--   (coordsFallbackAutor) y, si tampoco hay, el recurso se descarta del mapa
--   (tieneCoordsValidas). Por eso NO hay backfill: rellenar lat/lng ahora
--   congelaria la ubicacion del album en la fecha de la migracion y romperia
--   el fallback vivo. NULL es el valor correcto y estable.
--
-- TIPO DOUBLE PRECISION (no numeric(10,7))
--   Se elige DOUBLE PRECISION para coincidir EXACTAMENTE con albumes.lat/lng
--   (migracion 009), que es la columna con la que se hace COALESCE. Asi el
--   COALESCE no requiere cast y el shape double precision del mapa no cambia.
--   (La 027 uso numeric(10,7) en zonas/ranking, pero alli no hay COALESCE con
--   albumes; aqui prima la coherencia con la georreferencia del album.)
--
-- CARACTER DE LA MIGRACION
--   ADITIVA: solo ALTER TABLE ADD COLUMN / ADD CONSTRAINT / CREATE INDEX.
--   No elimina, no renombra y no toca objetos de 003-028.
--   IDEMPOTENTE (ADR-008): ADD COLUMN IF NOT EXISTS; la constraint se crea
--   dentro de un DO block que consulta pg_constraint (patron de 019/025/028) y
--   el indice usa IF NOT EXISTS. Re-ejecutar el archivo COMPLETO es no-op.
--   ASCII-SAFE (ADR-002): cero bytes > 127, cero tildes, cero ene, cero
--   backticks.
--
-- APLICACION
--   Correr este archivo COMPLETO en el editor SQL de Neon DESPUES de la 028.
--   Patron BUG-021/BUG-060: archivo completo en una sola corrida.
--
-- ROLLBACK (emergencia, LOSSY si ya hay coords propias de recurso)
--   ALTER TABLE album_fotos DROP COLUMN IF EXISTS lat;
--   ALTER TABLE album_fotos DROP COLUMN IF EXISTS lng;
--   Al caer las columnas, su CHECK y su indice se eliminan en cascada.
-- ============================================================================

-- ============================================================================
-- 0. PREFLIGHT (SOLO LECTURA; NO forma parte del DDL; NO se ejecuta solo).
--    Copiar y correr sentencia por sentencia ANTES de aplicar la 029.
-- ============================================================================
-- (0.a) Confirmar que album_fotos existe y que lat/lng aun NO existen.
--       Esperado antes: 0 filas; despues: 2 filas.
-- SELECT column_name, data_type FROM information_schema.columns
--   WHERE table_schema='public' AND table_name='album_fotos'
--     AND column_name IN ('lat','lng')
--   ORDER BY column_name;
--
-- (0.b) Confirmar el tipo de albumes.lat/lng (debe ser double precision).
--       Esperado: 2 filas double precision.
-- SELECT column_name, data_type FROM information_schema.columns
--   WHERE table_schema='public' AND table_name='albumes'
--     AND column_name IN ('lat','lng')
--   ORDER BY column_name;
--
-- (0.c) Confirmar que la constraint aun NO existe. Esperado: 0 filas.
-- SELECT conname FROM pg_constraint WHERE conname='album_fotos_coords_chk';

-- ============================================================================
-- 1. COLUMNAS lat / lng DEL RECURSO
-- ============================================================================

ALTER TABLE album_fotos
  ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION;

-- ============================================================================
-- 2. CONSTRAINT CHECK (idempotente via pg_constraint)
-- ============================================================================
-- Ambos NULL o ambos presentes y en rango global. NULL es valido (hereda del
-- album). El rango del producto es Colombia, pero el backend ya valida el
-- rango global; aqui no se acota mas para no romper recursos ya cargados.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'album_fotos_coords_chk'
  ) THEN
    ALTER TABLE album_fotos
      ADD CONSTRAINT album_fotos_coords_chk
      CHECK (
        (lat IS NULL AND lng IS NULL)
        OR (lat IS NOT NULL AND lng IS NOT NULL
            AND lat >= -90 AND lat <= 90
            AND lng >= -180 AND lng <= 180)
      );
  END IF;
END $$;

-- ============================================================================
-- 3. INDICE (solo filas con coords propias)
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_album_fotos_coords
  ON album_fotos (lat, lng)
  WHERE lat IS NOT NULL AND lng IS NOT NULL;

-- ============================================================================
-- VERIFICACION POST-APLICACION (solo lectura; NO modifica nada). Copiar y
-- correr sentencia por sentencia en el editor de Neon.
-- ============================================================================
-- (a) Columnas lat/lng presentes y nullable (esperadas 2 filas,
--     is_nullable = YES, data_type = double precision):
-- SELECT column_name, data_type, is_nullable
--   FROM information_schema.columns
--   WHERE table_schema='public' AND table_name='album_fotos'
--     AND column_name IN ('lat','lng')
--   ORDER BY column_name;
--
-- (b) Constraint creada (esperada 1 fila):
-- SELECT conname, pg_get_constraintdef(oid) AS def
--   FROM pg_constraint WHERE conname='album_fotos_coords_chk';
--
-- (c) Indice creado (esperada 1 fila):
-- SELECT indexname FROM pg_indexes
--   WHERE schemaname='public' AND indexname='idx_album_fotos_coords';
--
-- (d) Sin backfill: ninguna fila existente debe tener lat/lng pobladas por
--     esta migracion. Esperado: 0 (los recursos existentes siguen heredando
--     del album). Deja de ser 0 cuando el dueno fija un pin propio.
-- SELECT COUNT(*) AS filas_con_coords_propias
--   FROM album_fotos WHERE lat IS NOT NULL OR lng IS NOT NULL;
--
-- (e) Idempotencia global: re-ejecutar TODO el archivo y volver a correr
--     (a)-(d): los conteos deben ser IDENTICOS (no-op).

-- ROLLBACK (comentado; solo emergencia, LOSSY si ya hay coords propias):
-- ALTER TABLE album_fotos DROP COLUMN IF EXISTS lat;
-- ALTER TABLE album_fotos DROP COLUMN IF EXISTS lng;
