-- ============================================================================
-- Migration 073: cartas - IDEMPOTENCIA DEL COBRO DE EXPEDICION
--   (1 indice unico parcial + 1 CHECK; unica pieza de esquema del contrato 11.9)
-- Fecha: 2026-11-11
-- Referencias: ADR-002 (ASCII-safe), ADR-003 (cero borrado logico),
--   ADR-006 (el archivo real manda), ADR-008 (idempotencia).
-- Requiere, YA APLICADAS y con fila valida en schema_migrations:
--   031 (crea xp_ledger; contexto es jsonb, 031:239; accion text, 031:228;
--        usuario_id uuid, 031:227),
--   038 (mult_origen/origen_tier: no se tocan aqui),
--   045 (schema_migrations; la puerta del runner exige el predecesor),
--   072 (cartas - precio por familia; PREDECESOR INMEDIATO, ya aplicada el
--        2026-11-11; no se edita).
-- Contrato: docs/superpowers/specs/2026-11-11-cartas-familias-stats-supply-design.md
--   11.9.9 (lineas 1605-1634) fija LITERAL el nombre del indice
--   xp_ledger_expedicion_accion_uq, su expresion (usuario_id,
--   contexto->>'mision_id', contexto->>'accion_ref') con predicado parcial
--   accion = 'carta_expedicion', y el CHECK chk_xp_ledger_expedicion_contexto.
--   11.9.5 (1467-1489): cada cobro consume una accion real N-esima; el reintento
--   recalcula el offset desde cobros y no encuentra accion nueva -> xp:0.
--
-- PROPOSITO
--   Cerrar la carrera del doble clic y la reutilizacion de una accion ya
--   consumida. Sin el indice, dos POST concurrentes leen el mismo cobros,
--   calculan el mismo accion_ref e insertan DOS filas: doble pago y dos cupos
--   del cap 5/24 h por una sola accion (11.9.9:1631). El cap acota el dano,
--   pero no cumple el contrato. El CHECK cierra el agujero NULL del indice
--   (NULLS DISTINCT permite duplicados si la expresion es NULL): para
--   accion='carta_expedicion' las dos claves son obligatorias.
--
-- QUE HACE
--   1. Guardas PRE fail-closed: xp_ledger existe; contexto es jsonb; accion es
--      text; 0 filas con accion='carta_expedicion' (hoy la accion no existe).
--   2. Crea el indice unico parcial xp_ledger_expedicion_accion_uq.
--   3. Crea el CHECK chk_xp_ledger_expedicion_contexto.
--   4. Guardas POST: el indice existe en pg_index, es UNIQUE, parcial, valido
--      y con 3 columnas clave; el CHECK existe y cita las dos claves.
--
-- QUE NO HACE
--   - NO crea el indice compuesto (usuario_id, accion, creado_en) que 5.2:495
--     daba por existente: 031:296-302 creo DOS indices separados
--     (idx_xp_ledger_usuario_creado, idx_xp_ledger_accion_creado). El
--     predicado de 11.9.6 usa usuario_id + rango de creado_en y esos dos
--     indices bastan (correccion C2, 11.9:1348). El compuesto seria superficie
--     sin consumidor.
--   - NO toca filas, columnas, tipos ni otros indices. Cero UPDATE/INSERT/
--     DELETE/TRUNCATE (ADR-003).
--   - NO crea endpoint ni toca api/*.js (presupuesto 8/8).
--   - NO escribe schema_migrations: lo hace el runner (contrato de 045).
--
-- IDEMPOTENCIA (ADR-008)
--   - El indice se busca por nombre en pg_indexes. Si ya existe con la
--     definicion del contrato -> no-op. Si existe un homonimo con OTRA
--     definicion -> ABORTA (no se asume que sea el nuestro: IF NOT EXISTS solo
--     mira el nombre).
--   - El CHECK se busca por nombre en pg_constraint sobre public.xp_ledger.
--     Misma regla: definicion igual -> no-op; homonimo distinto -> ABORTA.
--   - Todo el cuerpo es UN bloque DO: para el runner es una sola sentencia y
--     el fichero es atomico (patron de 070/072).
--
-- PRE (medido en Neon el 2026-11-11, antes de escribir este fichero)
--   xp_ledger = 387 filas; count(*) FILTER (WHERE accion='carta_expedicion') = 0.
--   Columnas: usuario_id uuid, accion text, contexto jsonb (031:227-239).
--   Indices: xp_ledger_pkey (id); idx_xp_ledger_usuario_creado
--     (usuario_id, creado_en DESC); idx_xp_ledger_accion_creado
--     (accion, creado_en DESC). Ninguno con nombre xp_ledger_expedicion_accion_uq.
--   CHECKs: xp_ledger_cap_aplicado_chk y xp_ledger_origen_tier_chk. Ninguno con
--     nombre chk_xp_ledger_expedicion_contexto.
--   072 = 'aplicada' en schema_migrations (predecesor inmediato).
--
-- POST esperado
--   pg_indexes: 1 fila xp_ledger_expedicion_accion_uq, CREATE UNIQUE INDEX,
--   expresiones (usuario_id, (contexto ->> 'mision_id'),
--   (contexto ->> 'accion_ref')) y WHERE (accion = 'carta_expedicion'::text).
--   pg_constraint: 1 fila chk_xp_ledger_expedicion_contexto (contype='c').
--   xp_ledger sigue con 387 filas y 0 de carta_expedicion.
--
-- ROLLBACK (sin perdida de datos; ejecutar solo si se revierte el contrato)
--   DROP INDEX IF EXISTS xp_ledger_expedicion_accion_uq;
--   ALTER TABLE xp_ledger DROP CONSTRAINT IF EXISTS chk_xp_ledger_expedicion_contexto;
-- ============================================================================

DO $m073$
DECLARE
  v_int    int;
  v_filas  int;
  v_def    text;
BEGIN
  -- (1) PRE: tabla y tipos reales -----------------------------------------
  IF to_regclass('public.xp_ledger') IS NULL THEN
    RAISE EXCEPTION 'MIG073 ABORTA: public.xp_ledger no existe (031 sin aplicar)';
  END IF;

  SELECT count(*) INTO v_int
    FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'xp_ledger'
     AND column_name = 'contexto' AND udt_name = 'jsonb';
  IF v_int <> 1 THEN
    RAISE EXCEPTION 'MIG073 ABORTA: xp_ledger.contexto no es jsonb';
  END IF;

  SELECT count(*) INTO v_int
    FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'xp_ledger'
     AND column_name = 'accion' AND udt_name = 'text';
  IF v_int <> 1 THEN
    RAISE EXCEPTION 'MIG073 ABORTA: xp_ledger.accion no es text';
  END IF;

  SELECT count(*) INTO v_filas FROM public.xp_ledger;
  SELECT count(*) INTO v_int
    FROM public.xp_ledger WHERE accion = 'carta_expedicion';
  IF v_int <> 0 THEN
    RAISE EXCEPTION 'MIG073 ABORTA: % fila(s) con accion=carta_expedicion; medir y limpiar antes', v_int;
  END IF;

  -- (2) Indice unico parcial ----------------------------------------------
  SELECT indexdef INTO v_def
    FROM pg_indexes
   WHERE schemaname = 'public' AND tablename = 'xp_ledger'
     AND indexname = 'xp_ledger_expedicion_accion_uq';

  IF v_def IS NULL THEN
    EXECUTE $sql073$
      CREATE UNIQUE INDEX xp_ledger_expedicion_accion_uq
        ON public.xp_ledger (usuario_id,
                             (contexto->>'mision_id'),
                             (contexto->>'accion_ref'))
        WHERE accion = 'carta_expedicion'
    $sql073$;
    RAISE NOTICE 'MIG073: indice xp_ledger_expedicion_accion_uq creado';
  ELSIF v_def LIKE '%UNIQUE INDEX%'
        AND v_def LIKE '%mision_id%'
        AND v_def LIKE '%accion_ref%'
        AND v_def LIKE '%carta_expedicion%' THEN
    RAISE NOTICE 'MIG073: indice xp_ledger_expedicion_accion_uq ya vigente; no-op';
  ELSE
    RAISE EXCEPTION 'MIG073 ABORTA: indice homonimo con OTRA definicion: %', v_def;
  END IF;

  SELECT count(*) INTO v_int
    FROM pg_index x
    JOIN pg_class c ON c.oid = x.indexrelid
   WHERE c.relname = 'xp_ledger_expedicion_accion_uq'
     AND x.indrelid = 'public.xp_ledger'::regclass
     AND x.indisunique AND x.indisvalid
     AND x.indpred IS NOT NULL
     AND x.indnkeyatts = 3;
  IF v_int <> 1 THEN
    RAISE EXCEPTION 'MIG073 ABORTA: el indice no quedo UNIQUE/parcial/valido de 3 claves';
  END IF;

  -- (3) CHECK de contexto --------------------------------------------------
  SELECT pg_get_constraintdef(oid) INTO v_def
    FROM pg_constraint
   WHERE conname = 'chk_xp_ledger_expedicion_contexto'
     AND conrelid = 'public.xp_ledger'::regclass;

  IF v_def IS NULL THEN
    ALTER TABLE public.xp_ledger
      ADD CONSTRAINT chk_xp_ledger_expedicion_contexto CHECK (
        accion <> 'carta_expedicion'
        OR (contexto->>'mision_id' IS NOT NULL
            AND contexto->>'accion_ref' IS NOT NULL));
    RAISE NOTICE 'MIG073: CHECK chk_xp_ledger_expedicion_contexto creado';
  ELSIF v_def LIKE '%mision_id%'
        AND v_def LIKE '%accion_ref%'
        AND v_def LIKE '%carta_expedicion%' THEN
    RAISE NOTICE 'MIG073: CHECK chk_xp_ledger_expedicion_contexto ya vigente; no-op';
  ELSE
    RAISE EXCEPTION 'MIG073 ABORTA: CHECK homonimo con OTRA definicion: %', v_def;
  END IF;

  SELECT count(*) INTO v_int
    FROM pg_constraint
   WHERE conname = 'chk_xp_ledger_expedicion_contexto'
     AND conrelid = 'public.xp_ledger'::regclass
     AND contype = 'c';
  IF v_int <> 1 THEN
    RAISE EXCEPTION 'MIG073 ABORTA: el CHECK no quedo registrado en pg_constraint';
  END IF;

  -- (4) POST: ninguna fila tocada -----------------------------------------
  SELECT count(*) INTO v_int FROM public.xp_ledger;
  IF v_int <> v_filas THEN
    RAISE EXCEPTION 'MIG073 ABORTA: filas % -> %; esta migracion no escribe datos', v_filas, v_int;
  END IF;

  RAISE NOTICE 'MIG073 OK: indice y CHECK vigentes; xp_ledger = % filas (0 de carta_expedicion)', v_filas;
END
$m073$;
