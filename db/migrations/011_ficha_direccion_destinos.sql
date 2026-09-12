-- Migration 011: Columna address (direccion fisica) en destinos
-- Motivo: ficha de destino TSK-095 - chip de direccion exacta en el hero
--   (api/pagina-destino.js lee d.address || d.barrio; admin.html envia address).
-- Requiere: ninguna (idempotente, ADD COLUMN IF NOT EXISTS).
--
-- ASCII-safe (ADR-002): cero bytes > 127.
-- Idempotente (ADR-008): re-ejecutar es seguro.
--
-- APLICACION: correr este archivo COMPLETO en el editor SQL de Neon.

ALTER TABLE destinos ADD COLUMN IF NOT EXISTS address TEXT;