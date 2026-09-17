-- ============================================================================
-- Migration 022: Media compartidos (log de comparticiones + XP por primer share)
-- Fecha: 2026-09-17
-- ADR: ADR-036 (seccion A.1)
-- Aplicar en Neon ANTES del deploy del backend con la rama POST tipo=compartir.
-- Requiere: migraciones 009 y 019 previamente aplicadas.
--
-- QUE HACE
--   Crea el log de comparticiones de media: cada vez que un usuario comparte un
--   item (destino, foto curada, foto de viajero o foto de album) por un canal,
--   queda una fila. El XP solo se paga la PRIMERA vez que ese usuario comparte
--   ese (fuente, item_id): un indice unico PARCIAL (es_primero = true) garantiza
--   que solo exista una fila "primera" por usuario+fuente+item, y el backend
--   inserta con ON CONFLICT (usuario_id,fuente,item_id) WHERE es_primero = true
--   DO NOTHING. Las comparticiones posteriores se registran con es_primero=false
--   (0 XP) como bitacora de actividad, sin tocar el contrato de XP.
--
-- NO TOCA EL CHECK DE interacciones.tipo
--   Los tipos vigentes (resena|guardado|visita|foto|rating) se conservan
--   intactos: este cambio es ADITIVO y vive en su propia tabla. 'compartir' NO
--   se agrega al CHECK de interacciones. El preflight 1 lo confirma.
--
-- TIPOS (sin asumir: verificar con information_schema, patron BUG-021/BUG-060)
--   usuario_id/destino_id referencian usuarios(id)/destinos(id), tablas base
--   fuera de db/migrations; item_id es text con tope 64 (acepta uuid y slugs).
--
-- ASCII-safe (ADR-002): cero bytes > 127, cero backticks, sin emojis (BUG-026).
-- Idempotente (ADR-008): CREATE TABLE/INDEX IF NOT EXISTS. Re-ejecutar = no-op.
--
-- ROLLBACK (emergencia, DESTRUCTIVO de datos NUEVOS)
--   DROP TABLE IF EXISTS media_compartidos;  -- borra el log completo
--   No afecta tablas legacy (la migracion no altera ninguna). Se documenta como
--   022_media_compartidos_down.sql y NO es parte del flujo normal de despliegue.
--
-- APLICACION: correr este archivo COMPLETO en el editor SQL de Neon.
-- ============================================================================

-- ============================================================
-- 1. TABLA MEDIA_COMPARTIDOS
-- ============================================================

CREATE TABLE IF NOT EXISTS media_compartidos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  destino_id uuid REFERENCES destinos(id) ON DELETE SET NULL,
  fuente varchar(20) NOT NULL CHECK (fuente IN ('destino','curada','viajero_foto','album_foto')),
  item_id text NOT NULL CHECK (char_length(item_id) BETWEEN 1 AND 64),
  canal varchar(20) NOT NULL CHECK (canal IN ('web_share','whatsapp','copiar','otro')),
  es_primero boolean NOT NULL DEFAULT false,
  xp_ganado numeric(12,2) NOT NULL DEFAULT 0,
  creado_en timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 2. INDICES
-- ============================================================

-- Unico PARCIAL: como maximo una fila "primera" por usuario+fuente+item. Es el
-- indice que habilita el ON CONFLICT parcial del backend.
CREATE UNIQUE INDEX IF NOT EXISTS media_compartidos_primero_uq
  ON media_compartidos (usuario_id, fuente, item_id)
  WHERE es_primero = true;

-- Bitacora "compartidos por dia" del perfil.
CREATE INDEX IF NOT EXISTS idx_media_compartidos_usuario_dia
  ON media_compartidos (usuario_id, creado_en DESC);

-- Conteo de comparticiones por item (destino/foto) sin importar el usuario.
CREATE INDEX IF NOT EXISTS idx_media_compartidos_item
  ON media_compartidos (fuente, item_id, creado_en DESC);

-- ============================================================================
-- PREFLIGHT READ-ONLY (no se ejecuta dentro de la migracion). Copiar y correr
-- en el editor SQL de Neon ANTES de desplegar el backend con tipo=compartir.
-- ============================================================================
--
-- 1) Confirmar que el CHECK de interacciones NO incluye 'compartir'. Se listan
--    TODAS las constraints CHECK de interacciones (el nombre puede variar; no
--    se asume ninguno). La definicion devuelta NO debe contener 'compartir'.
--
-- SELECT conname, pg_get_constraintdef(oid) AS definicion
-- FROM pg_constraint
-- WHERE conrelid = 'public.interacciones'::regclass
--   AND contype = 'c'
-- ORDER BY conname;
--
-- 2) Confirmar que existe el indice unico PARCIAL con el predicado correcto.
--
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE schemaname = 'public'
--   AND tablename = 'media_compartidos'
--   AND indexname = 'media_compartidos_primero_uq';
-- Esperado: indexdef contiene "UNIQUE" y "WHERE (es_primero = true)".
--
-- 3) PRUEBA OBLIGATORIA del ON CONFLICT parcial (sintaxis de inferencia de
--    indice parcial). Todo va en una transaccion con ROLLBACK: no persiste nada.
--    - Si responde sin error de inferencia, el indice parcial sirve y NO se
--      necesita PLAN B.
--    - Si falla con 'no unique or exclusion constraint matching the ON CONFLICT
--      clause', revisar el paso 2 y aplicar el PLAN B documentado abajo.
--    - Un error de FK (usuario 00000000-... inexistente) es ESPERADO en una
--      tabla vacia: la inferencia del indice ya se resolvio en el planner; ese
--      error NO indica que el ON CONFLICT parcial falle.
--
-- BEGIN;
-- INSERT INTO media_compartidos (usuario_id,fuente,item_id,canal,es_primero)
-- VALUES ('00000000-0000-0000-0000-000000000000','curada','test','copiar',true)
-- ON CONFLICT (usuario_id,fuente,item_id) WHERE es_primero = true DO NOTHING
-- RETURNING id;
-- ROLLBACK;
--
-- ============================================================================
-- PLAN B (solo si el preflight 3 falla con el error de inferencia del indice)
--   Separar el dedup de "primer share" en una tabla de unicidad estricta y
--   dejar media_compartidos como log puro. NO ejecutar por defecto.
--
--   CREATE TABLE IF NOT EXISTS media_compartidos_unicos (
--     usuario_id uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
--     fuente varchar(20) NOT NULL CHECK (fuente IN ('destino','curada','viajero_foto','album_foto')),
--     item_id text NOT NULL CHECK (char_length(item_id) BETWEEN 1 AND 64),
--     creado_en timestamptz NOT NULL DEFAULT now(),
--     PRIMARY KEY (usuario_id, fuente, item_id)
--   );
--   -- El backend inserta PRIMERO en media_compartidos_unicos con
--   -- ON CONFLICT (usuario_id,fuente,item_id) DO NOTHING; si inserto una fila,
--   -- es el primer share (paga XP) y luego escribe el log en media_compartidos
--   -- con es_primero = true; si no inserto, escribe el log con es_primero =
--   -- false (0 XP). El indice parcial media_compartidos_primero_uq se puede
--   -- conservar como red de seguridad.
-- ============================================================================
