-- Migration 004: Add foto_url to usuarios (blog author card)
-- Required for the blog "Quien escribe" section (api/pagina-destino.js
-- reads usuarios.foto_url) and the admin autor picker (admin.html).
-- Idempotent: safe to re-apply (ADD COLUMN IF NOT EXISTS).

ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS foto_url text;

ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS ciudad_base text;