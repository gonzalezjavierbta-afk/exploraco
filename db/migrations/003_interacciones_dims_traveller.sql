-- Migration 003: Add dims (JSONB) and traveller_type to interacciones
-- Required for V2 review form with dimension scoring and traveller type selector
-- Run against Neon PostgreSQL before deploying the updated api/interacciones.js

ALTER TABLE interacciones
  ADD COLUMN IF NOT EXISTS dims jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE interacciones
  ADD COLUMN IF NOT EXISTS traveller_type text;
