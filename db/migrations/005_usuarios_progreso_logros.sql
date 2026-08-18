-- Migration 005: Add progreso_logros to usuarios (logros/trofeos)
-- Required for the gaming system (api/interacciones.js v5): per-user
-- progress of the LOGROS catalog (tier bronce/plata/oro/platino, unlock
-- date, XP reward), read by GET ?tipo=logros and merged with '||' on
-- every evaluation (ADR-003). Idempotent: safe to re-apply.

ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS progreso_logros jsonb NOT NULL DEFAULT '{}'::jsonb;