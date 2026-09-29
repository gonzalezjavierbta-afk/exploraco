-- ============================================================================
-- Migration 042: Pasaporte + Billetera agregadora + Fotos de perfil (max 10)
--   + vinculo de ubicacion de recursos a destinos publicados (C4)
-- Fecha: 2026-09-29
-- Referencias: ADR-002 (ASCII-safe), ADR-003 (Cero Borrado Logico), ADR-006
--   (baseline = esquema REAL auditado antes de escribir), ADR-008 (gobernanza
--   e idempotencia de esquema / numeracion consecutiva), ADR-018/ADR-035/
--   ADR-053 (xp_total es la moneda unica del juego: la billetera NO crea
--   moneda), ADR-028 (blindaje PII owner-aware; fecha_nacimiento es PII y
--   NUNCA se proyecta en publico), ADR-039/ADR-051 (Museo URL-only; coords por
--   recurso de album_fotos), BUG-021/BUG-060 (patron: migracion COMPLETA antes
--   del deploy del backend), BUG-026 (nunca bytes UTF-8 directos de emojis).
-- Requiere: 004 (usuarios.foto_url), 009 (albumes + album_fotos), 031/035
--   (gamificacion / xp_total) y el resto de 003-041 aplicado.
--
-- QUE HACE
--   1. usuarios.fecha_nacimiento DATE NULL: PII SENSIBLE. Solo se devuelve al
--      dueno con sesion valida (owner-aware). NUNCA en perfil_publico, museo
--      publico, leaderboards ni ?buscar=. Editable segun regla de producto
--      (una sola vez); la validacion de edad es server-side.
--   2. usuario_fotos: galeria de fotos de perfil (hasta 10 ACTIVAS), con
--      es_principal (una sola activa por usuario) y borrado logico via activo.
--      El tope de 10 se fuerza de forma atomica en el backend (una sentencia
--      con CTE); la tabla solo garantiza integridad y el indice parcial.
--   3. billeteras: identidad de billetera digital (una por usuario). Es un
--      AGREGADOR de lectura sobre xp_total / moneda_ledger / capacidades; no
--      crea saldo ni moneda nueva (ADR-018). El QR/canje se documenta en el
--      ADR y se implementara en una fase posterior (esta migracion deja lista
--      la identidad).
--   4. album_fotos.destino_id uuid NULL: vinculo OPCIONAL de un recurso a un
--      destino publicado (buscador de "Vincular ubicacion", C4). NULL = el
--      recurso conserva su ubicacion por lat/lng o la heredada del album.
--
-- CARACTER DE LA MIGRACION
--   ADITIVA: solo ADD COLUMN / CREATE TABLE / CREATE INDEX / ADD CONSTRAINT.
--   No elimina, no renombra y no toca columnas legacy.
--   IDEMPOTENTE (ADR-008): CREATE TABLE IF NOT EXISTS; CREATE INDEX IF NOT
--   EXISTS; ADD COLUMN dentro de DO que consulta information_schema o
--   ADD COLUMN IF NOT EXISTS. Re-ejecutar COMPLETO es no-op funcional.
--   ASCII-SAFE (ADR-002): cero bytes > 127, cero tildes, cero ene, cero
--   emojis, cero escapes unicode, cero backticks.
--   CERO BORRADO FISICO (ADR-003): no hay DELETE / DROP / TRUNCATE; toda baja
--   es activo=false.
--
-- APLICACION
--   Correr este archivo COMPLETO en el editor SQL de Neon DESPUES de la 041 y
--   ANTES del deploy del backend que usa estas columnas/tablas.
--   Patron BUG-021/BUG-060: archivo completo en una sola corrida.
--
-- ROLLBACK (emergencia, LOSSY si ya hay datos)
--   DROP TABLE IF EXISTS usuario_fotos;
--   DROP TABLE IF EXISTS billeteras;
--   ALTER TABLE usuarios      DROP COLUMN IF EXISTS fecha_nacimiento;
--   ALTER TABLE album_fotos   DROP COLUMN IF EXISTS destino_id;
-- ============================================================================

-- ============================================================================
-- 1. usuarios.fecha_nacimiento (PII owner-aware)
-- ============================================================================
ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS fecha_nacimiento DATE NULL;

COMMENT ON COLUMN usuarios.fecha_nacimiento IS
  'PII: fecha de nacimiento. Solo owner con sesion valida; nunca en proyecciones publicas.';

-- ============================================================================
-- 2. usuario_fotos (galeria de perfil; tope 10 activas forzado en backend)
-- ============================================================================
CREATE TABLE IF NOT EXISTS usuario_fotos (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id   uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  url          text NOT NULL,
  orden        integer NOT NULL DEFAULT 0,
  es_principal boolean NOT NULL DEFAULT false,
  peso_bytes   integer NULL,
  activo       boolean NOT NULL DEFAULT true,
  creado_en    timestamptz NOT NULL DEFAULT now()
);

-- Listado de fotos activas del usuario (galeria + conteo N/10).
CREATE INDEX IF NOT EXISTS idx_usuario_fotos_usuario_activo
  ON usuario_fotos (usuario_id, orden ASC)
  WHERE activo = true;

-- Una sola foto PRINCIPAL activa por usuario.
CREATE UNIQUE INDEX IF NOT EXISTS uq_usuario_fotos_principal
  ON usuario_fotos (usuario_id)
  WHERE es_principal = true AND activo = true;

COMMENT ON TABLE usuario_fotos IS
  'Galeria de fotos de perfil (max 10 activas; tope atomico en api/usuarios.js).';

-- ============================================================================
-- 3. billeteras (identidad; agregador de lectura sobre xp/monedas/consumibles)
-- ============================================================================
CREATE TABLE IF NOT EXISTS billeteras (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id      uuid NOT NULL UNIQUE REFERENCES usuarios(id) ON DELETE CASCADE,
  codigo_publico  text NOT NULL UNIQUE,
  estado          text NOT NULL DEFAULT 'activa',
  activo          boolean NOT NULL DEFAULT true,
  creada_en       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_billeteras_usuario_activo
  ON billeteras (usuario_id)
  WHERE activo = true;

DO $mig042$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.billeteras'::regclass
      AND conname = 'billeteras_estado_chk'
  ) THEN
    ALTER TABLE billeteras
      ADD CONSTRAINT billeteras_estado_chk
      CHECK (estado IN ('activa', 'suspendida', 'cerrada'));
    RAISE NOTICE 'migracion 042: billeteras_estado_chk creado';
  ELSE
    RAISE NOTICE 'migracion 042: billeteras_estado_chk ya existe (no-op)';
  END IF;
END
$mig042$;

COMMENT ON TABLE billeteras IS
  'Billetera digital: identidad + agregador de lectura. No crea moneda (ADR-018).';

-- ============================================================================
-- 4. album_fotos.destino_id (vinculo opcional a un destino publicado, C4)
-- ============================================================================
DO $mig042b$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'album_fotos'
      AND column_name = 'destino_id'
  ) THEN
    ALTER TABLE album_fotos
      ADD COLUMN destino_id uuid NULL REFERENCES destinos(id) ON DELETE SET NULL;
    RAISE NOTICE 'migracion 042: album_fotos.destino_id agregada';
  ELSE
    RAISE NOTICE 'migracion 042: album_fotos.destino_id ya existe (no-op)';
  END IF;
END
$mig042b$;

CREATE INDEX IF NOT EXISTS idx_album_fotos_destino
  ON album_fotos (destino_id)
  WHERE destino_id IS NOT NULL AND activo = true;

COMMENT ON COLUMN album_fotos.destino_id IS
  'Vinculo opcional a un destino publicado (buscador de ubicacion C4).';

-- ============================================================================
-- 5. VERIFICACION POST-APLICACION (solo lectura; no forma parte del DDL)
--    SELECT column_name, data_type, is_nullable
--      FROM information_schema.columns
--     WHERE table_schema='public' AND table_name='usuarios'
--       AND column_name='fecha_nacimiento';
--    SELECT to_regclass('public.usuario_fotos'), to_regclass('public.billeteras');
--    SELECT indexname FROM pg_indexes
--     WHERE schemaname='public'
--       AND indexname IN ('idx_usuario_fotos_usuario_activo',
--                         'uq_usuario_fotos_principal',
--                         'idx_billeteras_usuario_activo',
--                         'idx_album_fotos_destino');
-- ============================================================================
