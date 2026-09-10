-- Migration 009: Albums fotograficos, gamificacion y mapa audiovisual
-- ADR-017 (2026-09-09)
-- Aplicar en Neon ANTES de desplegar api/interacciones.js v8
-- Requiere: migraciones 007 y 008 previamente aplicadas
--
-- 1. albumes: contenedor multimedia del usuario (fotos, videos, audio, mixto).
--    Cada album puede tener ubicacion geografica y aparecer en el mapa.
-- 2. album_fotos: items individuales dentro de un album. Soporta repin
--    (agregador_id != autor_original_id) y deduplicacion natural.
-- 3. album_votos: gamificacion -- voto por foto individual, otorga XP.
--    PK compuesta (usuario_id, foto_id) previene doble voto.
-- 4. usuarios.progreso_album: JSONB con progreso de creacion de albumes
--    y coleccion de fotos para gamificacion.
-- 5. Indices para queries geograficas, por usuario y dedup.
--
-- ASCII-safe (ADR-002): cero bytes > 127. Idempotente (ADR-008).
--
-- APLICACION: correr este archivo COMPLETO en el editor SQL de Neon.
-- Las migraciones son acumulativas con IF NOT EXISTS: re-ejecutar es seguro.

-- ============================================================
-- 1. TABLA ALBUMES
-- ============================================================

CREATE TABLE IF NOT EXISTS albumes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  titulo varchar(120) NOT NULL,
  descripcion text DEFAULT '',
  tipo varchar(20) DEFAULT 'fotos' CHECK (tipo IN ('fotos','videos','audio','mixto')),
  lat double precision,
  lng double precision,
  ciudad varchar(80),
  region varchar(80),
  portada_url text,
  es_top boolean DEFAULT false,
  activo boolean NOT NULL DEFAULT true,
  creado_en timestamptz DEFAULT now(),
  actualizado_en timestamptz DEFAULT now()
);

-- ============================================================
-- 2. TABLA ALBUM_FOTOS
-- ============================================================

CREATE TABLE IF NOT EXISTS album_fotos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  album_id uuid NOT NULL REFERENCES albumes(id) ON DELETE CASCADE,
  agregador_id uuid NOT NULL REFERENCES usuarios(id),
  autor_original_id uuid REFERENCES usuarios(id),
  foto_url text NOT NULL,
  foto_type varchar(20) DEFAULT 'foto' CHECK (foto_type IN ('foto','video','audio')),
  media_title varchar(200) DEFAULT '',
  media_source varchar(100) DEFAULT '',
  activo boolean NOT NULL DEFAULT true,
  xp_otorgado_autor integer NOT NULL DEFAULT 0,
  creado_en timestamptz DEFAULT now()
);

-- ============================================================
-- 3. TABLA ALBUM_VOTOS
-- ============================================================

CREATE TABLE IF NOT EXISTS album_votos (
  usuario_id uuid NOT NULL REFERENCES usuarios(id),
  foto_id uuid NOT NULL REFERENCES album_fotos(id) ON DELETE CASCADE,
  xp_ganado integer NOT NULL DEFAULT 5,
  creado_en timestamptz DEFAULT now(),
  PRIMARY KEY (usuario_id, foto_id)
);

-- ============================================================
-- 4. COLUMNA PROGRESO_ALBUM EN USUARIOS
-- ============================================================

ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS progreso_album jsonb NOT NULL DEFAULT '{}'::jsonb;

-- ============================================================
-- 5. INDICES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_albumes_coords
  ON albumes (lat, lng)
  WHERE lat IS NOT NULL AND lng IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_albumes_usuario
  ON albumes (usuario_id, creado_en DESC);

CREATE INDEX IF NOT EXISTS idx_albumes_ciudad
  ON albumes (ciudad, creado_en DESC)
  WHERE ciudad IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_album_fotos_album
  ON album_fotos (album_id, creado_en ASC);

CREATE INDEX IF NOT EXISTS idx_album_fotos_autor
  ON album_fotos (autor_original_id, creado_en DESC)
  WHERE autor_original_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_album_fotos_dedup
  ON album_fotos (album_id, foto_url, autor_original_id);
