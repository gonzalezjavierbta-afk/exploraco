-- Migration 013: Comentarios tipo Facebook sobre la media de albumes
-- ADR-023 (2026-09-12)
-- Aplicar en Neon ANTES de desplegar api/interacciones.js v10
-- Requiere: migracion 009 (album_fotos, progreso_album) previamente aplicada
--
-- 1. album_comentarios: lista de adyacencia (parent_id self). Profundidad
--    de datos ilimitada; el cliente limita la indentacion visual a 3.
--    Soft-delete (activo=false) tipo tombstone: conserva la descendencia.
-- 2. album_comentario_votos: me gusta por comentario. PK compuesta
--    (usuario_id, comentario_id) hace el like idempotente; el toggle
--    unlike borra la fila. No otorga XP.
-- 3. Indices para el hilo (foto_id), el armado de arbol (parent_id),
--    el rate-limit diario (usuario_id) y el conteo de likes.
--
-- ASCII-safe (ADR-002): cero bytes > 127. Idempotente (ADR-008).
--
-- APLICACION: correr este archivo COMPLETO en el editor SQL de Neon.
-- Las migraciones son acumulativas con IF NOT EXISTS: re-ejecutar es seguro.

-- ============================================================
-- 1. TABLA ALBUM_COMENTARIOS
-- ============================================================

CREATE TABLE IF NOT EXISTS album_comentarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  foto_id uuid NOT NULL REFERENCES album_fotos(id) ON DELETE CASCADE,
  usuario_id uuid NOT NULL REFERENCES usuarios(id),
  parent_id uuid REFERENCES album_comentarios(id) ON DELETE CASCADE,
  texto text NOT NULL,
  activo boolean NOT NULL DEFAULT true,
  creado_en timestamptz DEFAULT now(),
  CHECK (char_length(texto) BETWEEN 1 AND 1000)
);

-- ============================================================
-- 2. TABLA ALBUM_COMENTARIO_VOTOS (likes)
-- ============================================================

CREATE TABLE IF NOT EXISTS album_comentario_votos (
  usuario_id uuid NOT NULL REFERENCES usuarios(id),
  comentario_id uuid NOT NULL REFERENCES album_comentarios(id) ON DELETE CASCADE,
  creado_en timestamptz DEFAULT now(),
  PRIMARY KEY (usuario_id, comentario_id)
);

-- ============================================================
-- 3. INDICES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_album_comentarios_foto
  ON album_comentarios (foto_id, creado_en ASC);

CREATE INDEX IF NOT EXISTS idx_album_comentarios_parent
  ON album_comentarios (parent_id);

CREATE INDEX IF NOT EXISTS idx_album_comentarios_usuario
  ON album_comentarios (usuario_id, creado_en DESC);

CREATE INDEX IF NOT EXISTS idx_album_comentario_votos_comentario
  ON album_comentario_votos (comentario_id);
