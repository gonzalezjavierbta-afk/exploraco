-- Migration 007: Milestones v2 (Plan Maestro de Gaming)
-- Required for the "ExploraCO Milestones v2" feature (spec 2026-09-07):
-- Steam/SKATE/Albion-style progression built on top of the existing
-- XP/misiones/logros engine (api/interacciones.js v6).
--
-- 1. interacciones.votos_utiles: count of "useful votes" per review
--    (tipo='resena'), the currency of the SKATE "Own the Spot" mechanic.
--    The destination leader is the author of the most upvoted review,
--    computed on-demand in api/pagina-destino.js (SELECT+COUNT), per the
--    calibration answer "bajo demanda".
-- 2. resena_votos: dedup table for review upvotes (PRIMARY KEY on
--    usuario_id+resena_id), consumed by the new POST tipo=review_voto
--    in api/interacciones.js (409 on duplicate, same pattern as rating).
-- 3. usuarios.patrocinios: JSONB placeholder for the SKATE sponsorship
--    layer (option left open by design -- ADR-014). No UI activation yet.
--
-- The repo is ASCII-safe (Reglas de Oro v5 / ADR-002): no literal
-- non-ASCII bytes and no emoji literals in SQL. Idempotent: every
-- statement uses IF NOT EXISTS so re-running from the Neon SQL editor is
-- a harmless no-op (pattern of 006_mapas.sql).

ALTER TABLE interacciones
  ADD COLUMN IF NOT EXISTS votos_utiles integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_interacciones_votos_destino
  ON interacciones (destino_id, votos_utiles DESC)
  WHERE tipo = 'resena';

CREATE TABLE IF NOT EXISTS resena_votos (
  usuario_id uuid NOT NULL REFERENCES usuarios(id),
  resena_id uuid NOT NULL REFERENCES interacciones(id),
  creado_en timestamptz DEFAULT now(),
  PRIMARY KEY (usuario_id, resena_id)
);

ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS patrocinios jsonb NOT NULL DEFAULT '{}'::jsonb;