-- ============================================================================
-- Migration 028: Columna zona (region natural) en destinos
-- Fecha: 2026-09-20
-- Referencias: ADR-002 (ASCII-safe), ADR-003 (cero borrado logico),
--   ADR-006 (validar el esquema real antes de escribir),
--   ADR-008 (gobernanza e idempotencia de esquema).
-- Requiere: tabla destinos existente (migraciones 011/019/020) y el resto de
--   003-027 aplicado.
--
-- QUE HACE
--   1. Agrega destinos.zona TEXT NULL: region natural del destino (una sola).
--      Valores permitidos: 'andina', 'amazonica', 'caribe', 'pacifico',
--      'llanos'.
--   2. Agrega la constraint CHECK destinos_zona_chk (permite NULL).
--   3. Agrega el indice idx_destinos_zona sobre destinos (zona).
--
-- CARACTER DE LA MIGRACION
--   ADITIVA: solo ALTER TABLE ADD COLUMN / ADD CONSTRAINT / CREATE INDEX.
--   No elimina, no renombra y no toca objetos de 003-027.
--   IDEMPOTENTE (ADR-008): ADD COLUMN IF NOT EXISTS; la constraint se crea
--   dentro de un DO block que consulta pg_constraint (patron de 019/026) y el
--   indice usa IF NOT EXISTS. Re-ejecutar el archivo COMPLETO es no-op seguro.
--   ASCII-SAFE (ADR-002): cero bytes > 127, cero tildes, cero ene, cero
--   backticks. No se requieren emojis, por lo que BUG-026 no aplica aqui.
--
-- NULLABLE A PROPOSITO
--   zona es TEXT NULL. La obligatoriedad se valida en la UI del admin, NO en
--   DB, para no romper seeds, eventos ni publicar-lugar.js mientras aun no
--   envian la columna. La CHECK acepta NULL: un destino sin zona es valido.
--
-- NOMENCLATURA (PENDIENTE DE ALINEAR)
--   La migracion 027 creo zonas_geograficas con slugs 'andes' y 'amazonia'.
--   Aqui se usan 'andina' y 'amazonica' por decision de producto. NO hay FK
--   entre destinos.zona y zonas_geograficas.slug todavia. Si algun dia se
--   enlaza el catalogo, hay que unificar los slugs ('andina' -> 'andes',
--   'amazonica' -> 'amazonia') o mapear en el backend. Deuda consciente.
--
-- APLICACION
--   Correr este archivo COMPLETO en el editor SQL de Neon DESPUES de la 027.
--   Patron BUG-021/BUG-060: archivo completo en una sola corrida.
--
-- ROLLBACK (emergencia, LOSSY si ya hay datos de zona)
--   ALTER TABLE destinos DROP COLUMN IF EXISTS zona;
--   Al caer la columna, su CHECK y su indice se eliminan en cascada.
-- ============================================================================

-- ============================================================================
-- 1. COLUMNA zona
-- ============================================================================

ALTER TABLE destinos
  ADD COLUMN IF NOT EXISTS zona TEXT;

-- ============================================================================
-- 2. CONSTRAINT CHECK (idempotente via pg_constraint)
-- ============================================================================
-- Lista cerrada de 5 regiones naturales y permite NULL (zona opcional).

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'destinos_zona_chk'
  ) THEN
    ALTER TABLE destinos
      ADD CONSTRAINT destinos_zona_chk
      CHECK (zona IS NULL OR zona IN ('andina','amazonica','caribe','pacifico','llanos'));
  END IF;
END $$;

-- ============================================================================
-- 3. INDICE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_destinos_zona
  ON destinos (zona);

-- ============================================================================
-- VERIFICACION POST-APLICACION (solo lectura; NO modifica nada). Copiar y
-- correr sentencia por sentencia en el editor de Neon.
-- ============================================================================
-- (a) Columna zona presente, TEXT y NULLABLE (esperada 1 fila,
--     is_nullable = YES):
SELECT column_name, data_type, is_nullable
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'destinos'
    AND column_name = 'zona';
--
-- (b) Constraint creada (esperada 1 fila):
-- SELECT conname, pg_get_constraintdef(oid) AS def
--   FROM pg_constraint WHERE conname = 'destinos_zona_chk';
--
-- (c) Indice creado (esperada 1 fila):
-- SELECT indexname FROM pg_indexes
--   WHERE schemaname = 'public' AND indexname = 'idx_destinos_zona';
--
-- (d) Idempotencia global: re-ejecutar TODO el archivo y volver a correr
--     (a)-(c): los conteos deben ser IDENTICOS (no-op).

-- ROLLBACK (comentado; solo emergencia, LOSSY si ya hay datos de zona):
-- ALTER TABLE destinos DROP COLUMN IF EXISTS zona;
