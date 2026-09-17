-- Migration 020: Columna sintro (subtitulo de apertura de "Sobre este lugar") en destinos
-- Motivo: ficha de destino - el subtitulo estilizado .sintro de la seccion
--   "Sobre este lugar" hoy se deriva en el render (primeras 150 letras de
--   descripcion; fallback a highlight). Al persistirlo en columna, el admin
--   puede curarlo y el render usa el valor guardado con fallback al calculo
--   actual (api/pagina-destino.js, variable sobreIntro).
-- Requiere: ninguna (idempotente, ADD COLUMN IF NOT EXISTS).
-- Sin default y nullable: los registros existentes quedan NULL y el render
--   aplica su fallback sin reescribir datos.
--
-- ASCII-safe (ADR-002): cero bytes > 127.
-- Idempotente (ADR-008): re-ejecutar es seguro.
--
-- APLICACION: correr este archivo COMPLETO en el editor SQL de Neon.

ALTER TABLE destinos ADD COLUMN IF NOT EXISTS sintro TEXT;
