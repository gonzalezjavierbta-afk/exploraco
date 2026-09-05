-- Migration 006: Mapas tematicos publicos/privados por usuario
-- Required for the thematic maps feature (spec 2026-09-05): each user
-- can create named maps, fill them with saved destinos and mark them
-- public or private. Consumed by api/interacciones.js via the new
-- ?tipo= routes (mapas_mios, mapas_publicos, mapa_detalle) and the
-- POST routes (mapa_crear, mapa_editar, mapa_eliminar,
-- mapa_agregar_destino, mapa_quitar_destino).
--
-- The default emoji uses the Postgres escape-string prefix E ('world
-- map', U+1F5FA) because the repo is ASCII-safe (Reglas de Oro v5 /
-- ADR-002): a literal emoji byte is forbidden in versioned files, and
-- without the E prefix '\U0001F5FA' would be stored as plain text of
-- 10 characters instead of the real emoji (BUG-026 lesson).
--
-- One-time migration (CREATE TABLE without IF NOT EXISTS, exactly as
-- specced): back it up before running. publico defaults to false, so
-- a map is born private and only its owner can flip it to public.

CREATE TABLE mapas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL REFERENCES usuarios(id),
  nombre varchar(80) NOT NULL,
  emoji varchar(8) DEFAULT E'\U0001F5FA',
  descripcion text,
  publico boolean DEFAULT false,
  creado_en timestamptz DEFAULT now(),
  actualizado_en timestamptz DEFAULT now()
);

CREATE TABLE mapa_destinos (
  mapa_id uuid NOT NULL REFERENCES mapas(id) ON DELETE CASCADE,
  destino_id uuid NOT NULL REFERENCES destinos(id),
  orden int NOT NULL DEFAULT 0,
  creado_en timestamptz DEFAULT now(),
  PRIMARY KEY (mapa_id, destino_id)
);

CREATE INDEX idx_mapas_usuario ON mapas(usuario_id);
CREATE INDEX idx_mapas_publico_creado ON mapas(publico, creado_en DESC);