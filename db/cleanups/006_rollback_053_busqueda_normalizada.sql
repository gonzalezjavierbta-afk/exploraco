-- ============================================================================
-- 006_rollback_053_busqueda_normalizada.sql
--
-- QUE HACE
--   Aplica el bloque ROLLBACK documentado en la cabecera de
--   db/migrations/053_busqueda_normalizada.sql (lineas 54-72). Restaura el
--   esquema de public.destinos al estado ANTERIOR a la 053.
--
-- POR QUE EXISTE (medido 2026-10-07, no memoria)
--   La 053 quedo PARCIAL: sentencias 1-17 aplicadas (7 columnas + funciones +
--   trigger) y sentencias 18-24 sin aplicar (backfill + 6 indices). No hay fila
--   en schema_migrations. La sentencia 18 (backfill de search_norm/search_trgm)
--   NO termina: public.exploraco_trgm(text) se vuelve inaplicable con cadenas
--   largas (medido: repeat('a',4000) instantaneo; repeat('a',6000) cuelga >40 s)
--   y en produccion hay 45 destinos con tags_norm > 4000 chars (max 9267). El
--   trigger activo llamaria a esa funcion en cada escritura de destinos.
--   Dejar la 053 a medias esta prohibido por el encargo; se revierte.
--
-- CARACTER
--   Idempotente (IF EXISTS). Lossy solo sobre datos DERIVADOS (columnas *_norm
--   y search_trgm), que no son fuente: se pueden recalcular. No toca tags ni
--   ninguna columna fuente.
--
-- ASCII-safe (ADR-002). Fuera de db/migrations/ a proposito: no es historia de
-- esquema, es una limpieza de una vez. El ledger 053 sigue en 0 filas.
-- ============================================================================

DROP TRIGGER IF EXISTS trg_destinos_busqueda_norm ON public.destinos;
DROP FUNCTION IF EXISTS public.destinos_busqueda_norm_fn();
DROP INDEX IF EXISTS public.idx_destinos_nombre_norm_prefix;
DROP INDEX IF EXISTS public.idx_destinos_ciudad_norm;
DROP INDEX IF EXISTS public.idx_destinos_search_trgm;
DROP INDEX IF EXISTS public.idx_destinos_search_fts;
DROP INDEX IF EXISTS public.idx_destinos_geo_bbox;
DROP INDEX IF EXISTS public.idx_destinos_categoria_rating;
ALTER TABLE public.destinos DROP COLUMN IF EXISTS nombre_norm;
ALTER TABLE public.destinos DROP COLUMN IF EXISTS ciudad_norm;
ALTER TABLE public.destinos DROP COLUMN IF EXISTS region_norm;
ALTER TABLE public.destinos DROP COLUMN IF EXISTS barrio_norm;
ALTER TABLE public.destinos DROP COLUMN IF EXISTS tags_norm;
ALTER TABLE public.destinos DROP COLUMN IF EXISTS search_norm;
ALTER TABLE public.destinos DROP COLUMN IF EXISTS search_trgm;
DROP FUNCTION IF EXISTS public.exploraco_trgm(text);
DROP FUNCTION IF EXISTS public.exploraco_norm(text);
