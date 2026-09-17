-- Migration 019: Guardados de media (bookmarks) + radio de verificacion por lugar
-- ADR-032 / ADR-033 (2026-09-17)
-- Aplicar en Neon ANTES de desplegar api/interacciones.js v17
-- Requiere: migraciones 009 (albumes) previamente aplicadas.
--
-- 1. destinos.radio_m: radio de geocerca (metros) elegido por el admin para
--    el boton "Estuve aqui". NULL = heuristica adaptativa historica
--    (resolverRadioM: 100/150/200/250 m por categoria/subcategoria/keyword).
--    Permite que un bar use un punto exacto y una ciudad / parque extenso
--    cubra un area amplia. Tope 100000 m (100 km) por seguridad.
-- 2. media_guardados: marcadores (bookmarks) de fotos y albumes de terceros.
--    NO es un voto (album_votos) ni una copia ("guardar en album"): es una
--    referencia personal del usuario a un item existente. Se resuelve por
--    (fuente, item_id): album -> albumes.id; album_foto -> album_fotos.id;
--    viajero_foto -> interacciones.id (tipo='foto'). Sin FK polimorfica:
--    la integridad se valida en el backend al insertar.
-- 3. Indices de soporte para "Mis guardados" del perfil museo.
--
-- ASCII-safe (ADR-002): cero bytes > 127. Idempotente (ADR-008).
--
-- APLICACION: correr este archivo COMPLETO en el editor SQL de Neon.
-- Las migraciones son acumulativas con IF NOT EXISTS: re-ejecutar es seguro.

-- ============================================================
-- 1. RADIO DE VERIFICACION POR LUGAR
-- ============================================================

ALTER TABLE destinos
  ADD COLUMN IF NOT EXISTS radio_m integer;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'destinos_radio_m_check'
  ) THEN
    ALTER TABLE destinos
      ADD CONSTRAINT destinos_radio_m_check
      CHECK (radio_m IS NULL OR (radio_m >= 25 AND radio_m <= 100000));
  END IF;
END $$;

-- ============================================================
-- 2. TABLA MEDIA_GUARDADOS
-- ============================================================

CREATE TABLE IF NOT EXISTS media_guardados (
  usuario_id uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  fuente varchar(20) NOT NULL CHECK (fuente IN ('album','album_foto','viajero_foto')),
  item_id uuid NOT NULL,
  activo boolean NOT NULL DEFAULT true,
  creado_en timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (usuario_id, fuente, item_id)
);

-- ============================================================
-- 3. INDICES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_media_guardados_usuario
  ON media_guardados (usuario_id, fuente, creado_en DESC)
  WHERE activo = true;

CREATE INDEX IF NOT EXISTS idx_media_guardados_item
  ON media_guardados (fuente, item_id)
  WHERE activo = true;
