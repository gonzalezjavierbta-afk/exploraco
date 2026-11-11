-- ============================================================================
-- Migration 069: cartas - FAMILIA y SUBTIPO pasan a NOT NULL (paso 2 de 2).
-- Fecha: 2026-11-11
-- Referencias: ADR-121, ADR-002 (ASCII-safe), ADR-003 (cero borrado logico),
--   ADR-006 (el archivo real manda), ADR-008 (idempotencia).
-- Requiere: 066 (columnas familia/subtipo + backfill 31/31 + CHECKs de
--   dominio) y 068 (precio_xp numeric(12,2)). APLICADAS.
-- Contrato: docs/superpowers/specs/2026-11-11-cartas-familias-stats-supply-design.md
--   seccion 7.1, "paso 2 (fase 2)" y ADR-121.
--
-- ORDEN OBLIGATORIO: NO INVERTIRLO. Este fichero se ESCRIBE, no se ejecuta en
-- la tanda que lo crea.
--   1. CODIGO: api/admin.js escribe familia + subtipo en cartas_crear y en
--      cartas_editar (validacion 400 tipada, MERGE de stats_json).
--   2. COMMIT del codigo.
--   3. DEPLOY a produccion (Vercel). Hasta aqui el codigo DESPLEGADO es el
--      viejo: su INSERT lista 15 columnas SIN familia/subtipo.
--   4. SOLO ENTONCES: node scripts/apply_sql_file.js db/migrations/069_cartas_familia_not_null.sql
--   Si la 069 corre ANTES del deploy, toda alta de carta del panel falla con
--   23502 (null value in column "familia" violates not-null constraint),
--   porque el codigo viejo no manda la columna y no tiene DEFAULT. Ese es
--   exactamente el motivo por el que 066 difirio el NOT NULL (066:372-374).
--
-- PROPOSITO
--   Cerrar el dominio abierto por la 066: familia y subtipo dejan de admitir
--   NULL para que una carta sin clasificar no pueda existir. Los CHECK de
--   dominio de 066 ya estan puestos; esto anade la ausencia de NULL. La capa
--   (juego / economia / estatus) NO se persiste: se deriva de la familia.
--
-- QUE NO HACE
--   - No borra ni actualiza filas: no hay backfill. Si queda un NULL, ABORTA.
--   - No toca cartas_catalogo.edicion / supply_max / emitidas / precio_xp.
--   - No toca usuarios_cartas, cartas_ofertas, cartas_gates ni API alguna.
--   - No escribe schema_migrations: lo hace el runner (contrato de 045).
--
-- IDEMPOTENCIA (ADR-008)
--   - Guarda previa: count(*) FILTER (WHERE familia IS NULL OR subtipo IS
--     NULL) <> 0 -> RAISE EXCEPTION y el fichero sale con error sin escribir.
--   - Cada ALTER COLUMN ... SET NOT NULL se ejecuta solo si la columna NO es
--     NOT NULL ya (lectura de pg_attribute.attnotnull). Segunda corrida: no-op
--     con NOTICE, sin error y sin reescribir la tabla.
--   - Si ambas ya son NOT NULL, el bloque hace RETURN sin tocar nada.
--
-- ATOMICIDAD: todo el cuerpo va en UN bloque DO (una sola sentencia para el
-- runner, que parte por ';' respetando dollar-quote): o pasan las dos
-- columnas o no pasa ninguna.
--
-- ASCII-safe (ADR-002): 0 bytes > 127, cero backticks, sin acentos ni enes.
-- ============================================================================

DO $m069$
DECLARE
  v_total        int;
  v_nulos        int;
  v_notnull_fam  boolean;
  v_notnull_sub  boolean;
BEGIN
  -- (0) Precondicion: la 066 tiene que estar aplicada (columnas presentes).
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                  WHERE table_schema = 'public'
                    AND table_name   = 'cartas_catalogo'
                    AND column_name  = 'familia') THEN
    RAISE EXCEPTION 'MIG069: falta 066 (cartas_catalogo.familia)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                  WHERE table_schema = 'public'
                    AND table_name   = 'cartas_catalogo'
                    AND column_name  = 'subtipo') THEN
    RAISE EXCEPTION 'MIG069: falta 066 (cartas_catalogo.subtipo)';
  END IF;

  -- (1) Guarda previa: sin 0 NULL no se cierra el dominio. Un NOT NULL aqui
  --     no repara datos; solo convertiria un alta fallida en un alta fallida
  --     mas tardia. El mensaje dice cuantas filas faltan clasificar.
  SELECT count(*) INTO v_total FROM cartas_catalogo;
  SELECT count(*) INTO v_nulos FROM cartas_catalogo
   WHERE familia IS NULL OR subtipo IS NULL;
  IF v_nulos <> 0 THEN
    RAISE EXCEPTION 'MIG069: % de % cartas sin familia/subtipo; clasificalas (UPDATE) antes de cerrar el dominio',
      v_nulos, v_total;
  END IF;

  -- (2) Estado actual de las dos columnas (idempotencia real, no por nombre).
  SELECT a.attnotnull INTO v_notnull_fam
    FROM pg_attribute a
   WHERE a.attrelid = 'public.cartas_catalogo'::regclass
     AND a.attname  = 'familia'
     AND NOT a.attisdropped;
  SELECT a.attnotnull INTO v_notnull_sub
    FROM pg_attribute a
   WHERE a.attrelid = 'public.cartas_catalogo'::regclass
     AND a.attname  = 'subtipo'
     AND NOT a.attisdropped;

  IF COALESCE(v_notnull_fam, false) AND COALESCE(v_notnull_sub, false) THEN
    RAISE NOTICE 'MIG069: familia y subtipo ya son NOT NULL (no-op, % cartas)', v_total;
    RETURN;
  END IF;

  -- (3) Cierre del dominio. Dos ALTER en el mismo bloque DO: atomicos.
  IF NOT COALESCE(v_notnull_fam, false) THEN
    ALTER TABLE cartas_catalogo ALTER COLUMN familia SET NOT NULL;
    RAISE NOTICE 'MIG069: cartas_catalogo.familia SET NOT NULL';
  ELSE
    RAISE NOTICE 'MIG069: cartas_catalogo.familia ya era NOT NULL (no-op)';
  END IF;

  IF NOT COALESCE(v_notnull_sub, false) THEN
    ALTER TABLE cartas_catalogo ALTER COLUMN subtipo SET NOT NULL;
    RAISE NOTICE 'MIG069: cartas_catalogo.subtipo SET NOT NULL';
  ELSE
    RAISE NOTICE 'MIG069: cartas_catalogo.subtipo ya era NOT NULL (no-op)';
  END IF;

  RAISE NOTICE 'MIG069: dominio cerrado sobre % cartas', v_total;
END
$m069$;

-- ============================================================================
-- VERIFICACION POST (manual, el runner NO la ejecuta):
--   SELECT count(*) FROM cartas_catalogo WHERE familia IS NULL OR subtipo IS NULL;  -- 0
--   SELECT attname, attnotnull FROM pg_attribute
--    WHERE attrelid = 'public.cartas_catalogo'::regclass
--      AND attname IN ('familia','subtipo');                                         -- t, t
--   SELECT count(*) FROM cartas_catalogo;                                            -- 31
--
-- ROLLBACK (comentado a proposito: un rollback se escribe, no se ejecuta en
-- caliente). Abre otra vez el dominio, no borra datos:
--   ALTER TABLE cartas_catalogo ALTER COLUMN subtipo DROP NOT NULL;
--   ALTER TABLE cartas_catalogo ALTER COLUMN familia DROP NOT NULL;
-- ============================================================================
