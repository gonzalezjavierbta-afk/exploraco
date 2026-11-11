-- ============================================================================
-- Migration 074: media_compartidos - RECREAR LA TABLA QUE LA 022 NUNCA APLICO
--   (RESTAURA LA FEATURE DE COMPARTIR: hoy responde 503 SCHEMA_NOT_MIGRATED)
-- Fecha: 2026-11-11
-- Referencias: ADR-002 (ASCII-safe), ADR-003 (cero borrado logico),
--   ADR-006 (el archivo real manda), ADR-008 (idempotencia), ADR-036 (A.1).
-- Requiere, YA APLICADAS y con fila valida en schema_migrations:
--   009/019 (usuarios y destinos: tablas base de las dos FK),
--   045 (schema_migrations; la puerta del runner exige el predecesor),
--   073 (PREDECESOR INMEDIATO, ya aplicada; no se edita).
--
-- AVISO: ESTA MIGRACION RESTAURA LA FEATURE DE COMPARTIR. Sin esta tabla el
--   handler de compartir responde 503 SCHEMA_NOT_MIGRATED y no se paga XP por
--   compartir. Aplicarla es la reparacion, no un cambio de contrato.
--
-- POR QUE EXISTE (y por que NO se toca la 022 ni su fila de ledger)
--   db/migrations/022_media_compartidos.sql es el DDL original: tabla, 3 CHECK
--   inline, 1 FK a usuarios (CASCADE), 1 FK a destinos (SET NULL) y 3 indices.
--   Su fila en schema_migrations dice 'historico_no_verificado': se sembro como
--   historico y NADIE comprobo que la tabla existiera. Medido en Neon el
--   2026-11-11: to_regclass('public.media_compartidos') IS NULL. No existe.
--   El handler escribe ahi: api/interacciones.js:16327-16343 (INSERT de
--   primera comparticion con ON CONFLICT parcial y INSERT del log posterior),
--   16318-16321 (tope de 10 eventos/24 h) y 16348-16351 (suma de xp_ganado).
--
--   Se corrige con una migracion NUEVA, no editando la 022, por el contrato de
--   la 045: (1) el checksum de una fila ya escrita no se sobrescribe (ADR-003:
--   borraria la unica evidencia de lo que paso), y (2) un .sql ya comiteado que
--   cambia de bytes es DERIVA, no una migracion. La 022 y su fila quedan
--   intactas; la 074 es la que crea la tabla.
--
-- QUE HACE
--   1. Guardas PRE: usuarios.id y destinos.id son uuid; gen_random_uuid()
--      existe (default de id). Si falta algo -> ABORTA antes de crear nada.
--   2. Crea la tabla con el DDL de la 022: mismos tipos (uuid, varchar(20),
--      text, boolean, numeric(12,2), timestamptz), mismos NOT NULL, mismos
--      DEFAULT, los 3 CHECK y las 2 FK. Unica diferencia cosmetica: las tablas
--      referenciadas van con esquema explicito (public.) para no depender del
--      search_path del runner.
--   3. Crea los 3 indices de la 022, en particular el unico PARCIAL
--      media_compartidos_primero_uq (usuario_id, fuente, item_id)
--      WHERE es_primero = true: es el que habilita el
--      ON CONFLICT (usuario_id, fuente, item_id) WHERE es_primero = true del
--      handler (interacciones.js:16330). Sin el, el INSERT no infiere indice.
--   4. Verifica POST: 9 columnas con tipo/nullabilidad/longitud/default
--      esperados, las 2 FK con su accion de borrado, los 3 CHECK, el indice
--      parcial UNIQUE/valido/de 3 claves y el recuento de filas sin cambios.
--
-- QUE NO HACE
--   - NO toca db/migrations/022_media_compartidos.sql ni su fila del ledger.
--   - NO escribe schema_migrations: la fila 074 la pone el runner (045).
--   - NO borra ni actualiza datos: cero DELETE/UPDATE/TRUNCATE (ADR-003). Si la
--     tabla ya existiera con filas, el recuento se conserva y se comprueba.
--   - NO crea triggers, ni funciones nuevas, ni RLS, ni policies.
--   - NO altera una tabla preexistente con otra forma: la compara columna a
--     columna con information_schema y ABORTA con el diff. Reparar una forma
--     distinta es OTRA migracion, no esta.
--   - NO toca interacciones ni su CHECK de tipo: 'compartir' no entra ahi.
--
-- PRE (medido en Neon el 2026-11-11, antes de escribir este fichero)
--   to_regclass('public.media_compartidos') = NULL.
--   schema_migrations: 022 = 1 fila 'historico_no_verificado'; 072 y 073 =
--   'aplicada'; 70 filas; max(numero) = 73.
--   usuarios.id uuid; destinos.id uuid; gen_random_uuid() disponible.
--   Columnas que escribe el handler (interacciones.js:16328-16341):
--   usuario_id, destino_id, fuente, item_id, canal, es_primero, xp_ganado.
--   id y creado_en los pone el DEFAULT (el handler no los envia).
--
-- POST esperado
--   to_regclass('public.media_compartidos') = 'media_compartidos'.
--   9 columnas (information_schema.columns) con la forma de la 022.
--   pg_constraint: 2 FK (usuario_id -> usuarios CASCADE; destino_id -> destinos
--   SET NULL) y 3 CHECK (fuente, item_id, canal).
--   pg_indexes: media_compartidos_primero_uq (UNIQUE, WHERE es_primero = true),
--   idx_media_compartidos_usuario_dia, idx_media_compartidos_item.
--   Compartir deja de responder 503 SCHEMA_NOT_MIGRATED.
--   schema_migrations: fila 074 'aplicada' (la pone el runner, no este SQL).
--
-- IDEMPOTENCIA (ADR-008)
--   - CREATE TABLE IF NOT EXISTS y CREATE INDEX IF NOT EXISTS: segunda corrida
--     es no-op, con NOTICE por pieza ya vigente.
--   - Antes de aceptar una pieza existente se compara su DEFINICION
--     (information_schema.columns, pg_constraint, pg_indexes): homonimo con
--     otra forma -> ABORTA con el diff, porque IF NOT EXISTS solo mira el
--     nombre.
--   - Todo el cuerpo es UN bloque DO: para el runner es una sola sentencia y el
--     fichero es atomico (patron de 070/072/073).
--
-- ROLLBACK (DESTRUCTIVO de datos NUEVOS; solo si se revierte la feature)
--   DROP TABLE IF EXISTS public.media_compartidos;
--   -- Borra el log de comparticiones y el XP registrado en el. No afecta a
--   -- ninguna tabla legacy: esta migracion no altera ninguna. No forma parte
--   -- del flujo normal de despliegue.
-- ============================================================================

DO $m074$
DECLARE
  v_int    int;
  v_filas  int;
  v_cols   int;
  v_diff   text;
  v_def    text;
BEGIN
  -- (1) PRE: tablas base, tipos y funcion de uuid --------------------------
  IF to_regclass('public.usuarios') IS NULL THEN
    RAISE EXCEPTION 'MIG074 ABORTA: public.usuarios no existe; no se puede crear la FK usuario_id';
  END IF;
  IF to_regclass('public.destinos') IS NULL THEN
    RAISE EXCEPTION 'MIG074 ABORTA: public.destinos no existe; no se puede crear la FK destino_id';
  END IF;

  SELECT count(*) INTO v_int
    FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'usuarios'
     AND column_name = 'id' AND udt_name = 'uuid';
  IF v_int <> 1 THEN
    RAISE EXCEPTION 'MIG074 ABORTA: usuarios.id no es uuid; la FK usuario_id no encaja';
  END IF;

  SELECT count(*) INTO v_int
    FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'destinos'
     AND column_name = 'id' AND udt_name = 'uuid';
  IF v_int <> 1 THEN
    RAISE EXCEPTION 'MIG074 ABORTA: destinos.id no es uuid; la FK destino_id no encaja';
  END IF;

  SELECT count(*) INTO v_int FROM pg_proc WHERE proname = 'gen_random_uuid';
  IF v_int < 1 THEN
    RAISE EXCEPTION 'MIG074 ABORTA: gen_random_uuid() no existe (default de id)';
  END IF;

  -- (2) Filas de partida ---------------------------------------------------
  --     Si la tabla ya existiera (re-ejecucion o reparacion), esta migracion
  --     no escribe datos: el recuento debe sobrevivir (se comprueba en el POST).
  IF to_regclass('public.media_compartidos') IS NULL THEN
    v_filas := 0;
    RAISE NOTICE 'MIG074 PRE: media_compartidos NO existe (la 022 quedo en historico_no_verificado); se crea';
  ELSE
    EXECUTE 'SELECT count(*) FROM public.media_compartidos' INTO v_filas;
    RAISE NOTICE 'MIG074 PRE: media_compartidos ya existe con % fila(s); se verifica su forma sin alterarla', v_filas;
  END IF;

  -- (3) DDL de la 022, literal ---------------------------------------------
  EXECUTE $ddl074$
    CREATE TABLE IF NOT EXISTS public.media_compartidos (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      usuario_id uuid NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
      destino_id uuid REFERENCES public.destinos(id) ON DELETE SET NULL,
      fuente varchar(20) NOT NULL CHECK (fuente IN ('destino','curada','viajero_foto','album_foto')),
      item_id text NOT NULL CHECK (char_length(item_id) BETWEEN 1 AND 64),
      canal varchar(20) NOT NULL CHECK (canal IN ('web_share','whatsapp','copiar','otro')),
      es_primero boolean NOT NULL DEFAULT false,
      xp_ganado numeric(12,2) NOT NULL DEFAULT 0,
      creado_en timestamptz NOT NULL DEFAULT now()
    )
  $ddl074$;

  -- (4) FORMA EXACTA: diff contra la especificacion de la 022 ---------------
  --     Si la tabla preexistia con otra forma, aqui se ve el diff y se ABORTA:
  --     no se altera a ciegas (eso seria otra migracion, medida antes).
  SELECT string_agg(s.d, ' | ' ORDER BY s.d) INTO v_diff
    FROM (
      SELECT CASE
               WHEN c.column_name IS NULL
                 THEN 'FALTA ' || e.col
               WHEN c.udt_name <> e.udt
                 THEN 'TIPO ' || e.col || '=' || c.udt_name || ' (esperado ' || e.udt || ')'
               WHEN (c.is_nullable = 'NO') <> e.con_not_null
                 THEN 'NULLABILIDAD ' || e.col || '=' ||
                      CASE WHEN c.is_nullable = 'NO' THEN 'NOT NULL' ELSE 'NULL' END
               WHEN e.maxlen IS NOT NULL
                    AND c.character_maximum_length IS DISTINCT FROM e.maxlen
                 THEN 'LONGITUD ' || e.col || '=' ||
                      COALESCE(c.character_maximum_length::text, 'sin tope') ||
                      ' (esperado ' || e.maxlen || ')'
               WHEN e.req_default AND c.column_default IS NULL
                 THEN 'DEFAULT ' || e.col || ' ausente (el handler no lo envia)'
               ELSE NULL
             END AS d
        FROM (VALUES
               ('id',         'uuid',        true,  NULL::int, true),
               ('usuario_id', 'uuid',        true,  NULL,      false),
               ('destino_id', 'uuid',        false, NULL,      false),
               ('fuente',     'varchar',     true,  20,        false),
               ('item_id',    'text',        true,  NULL,      false),
               ('canal',      'varchar',     true,  20,        false),
               ('es_primero', 'bool',        true,  NULL,      false),
               ('xp_ganado',  'numeric',     true,  NULL,      false),
               ('creado_en',  'timestamptz', true,  NULL,      true)
             ) AS e(col, udt, con_not_null, maxlen, req_default)
        LEFT JOIN information_schema.columns c
               ON c.table_schema = 'public'
              AND c.table_name = 'media_compartidos'
              AND c.column_name = e.col
    ) s
   WHERE s.d IS NOT NULL;

  SELECT string_agg('EXTRA ' || c.column_name, ' | ' ORDER BY c.column_name) INTO v_def
    FROM information_schema.columns c
   WHERE c.table_schema = 'public'
     AND c.table_name = 'media_compartidos'
     AND c.column_name NOT IN ('id','usuario_id','destino_id','fuente',
                               'item_id','canal','es_primero','xp_ganado','creado_en');
  IF v_def IS NOT NULL THEN
    v_diff := COALESCE(v_diff || ' | ', '') || v_def;
  END IF;

  IF v_diff IS NOT NULL THEN
    RAISE EXCEPTION 'MIG074 ABORTA: media_compartidos existe con OTRA forma y NO se altera: %', v_diff;
  END IF;

  SELECT count(*) INTO v_cols
    FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'media_compartidos';
  IF v_cols <> 9 THEN
    RAISE EXCEPTION 'MIG074 ABORTA: media_compartidos tiene % columnas; la 022 define 9', v_cols;
  END IF;

  -- (5) FK: existencia y accion de borrado ---------------------------------
  SELECT count(*) INTO v_int
    FROM pg_constraint
   WHERE conrelid = 'public.media_compartidos'::regclass
     AND contype = 'f'
     AND pg_get_constraintdef(oid) LIKE '%FOREIGN KEY (usuario_id) REFERENCES%usuarios(id)%'
     AND pg_get_constraintdef(oid) LIKE '%ON DELETE CASCADE%';
  IF v_int < 1 THEN
    RAISE EXCEPTION 'MIG074 ABORTA: falta la FK usuario_id -> usuarios ON DELETE CASCADE';
  END IF;

  SELECT count(*) INTO v_int
    FROM pg_constraint
   WHERE conrelid = 'public.media_compartidos'::regclass
     AND contype = 'f'
     AND pg_get_constraintdef(oid) LIKE '%FOREIGN KEY (destino_id) REFERENCES%destinos(id)%'
     AND pg_get_constraintdef(oid) LIKE '%ON DELETE SET NULL%';
  IF v_int < 1 THEN
    RAISE EXCEPTION 'MIG074 ABORTA: falta la FK destino_id -> destinos ON DELETE SET NULL';
  END IF;

  -- (6) CHECK: los 3 de la 022 ---------------------------------------------
  SELECT count(*) INTO v_int
    FROM pg_constraint
   WHERE conrelid = 'public.media_compartidos'::regclass
     AND contype = 'c'
     AND pg_get_constraintdef(oid) LIKE '%fuente%'
     AND pg_get_constraintdef(oid) LIKE '%viajero_foto%';
  IF v_int < 1 THEN
    RAISE EXCEPTION 'MIG074 ABORTA: falta el CHECK de fuente (destino|curada|viajero_foto|album_foto)';
  END IF;

  SELECT count(*) INTO v_int
    FROM pg_constraint
   WHERE conrelid = 'public.media_compartidos'::regclass
     AND contype = 'c'
     AND pg_get_constraintdef(oid) LIKE '%item_id%'
     AND pg_get_constraintdef(oid) LIKE '%char_length%';
  IF v_int < 1 THEN
    RAISE EXCEPTION 'MIG074 ABORTA: falta el CHECK de item_id (char_length 1..64)';
  END IF;

  SELECT count(*) INTO v_int
    FROM pg_constraint
   WHERE conrelid = 'public.media_compartidos'::regclass
     AND contype = 'c'
     AND pg_get_constraintdef(oid) LIKE '%canal%'
     AND pg_get_constraintdef(oid) LIKE '%web_share%';
  IF v_int < 1 THEN
    RAISE EXCEPTION 'MIG074 ABORTA: falta el CHECK de canal (web_share|whatsapp|copiar|otro)';
  END IF;

  -- (7) INDICE 1: unico PARCIAL (habilita el ON CONFLICT del handler) -------
  SELECT indexdef INTO v_def
    FROM pg_indexes
   WHERE schemaname = 'public' AND tablename = 'media_compartidos'
     AND indexname = 'media_compartidos_primero_uq';

  IF v_def IS NULL THEN
    EXECUTE $ix074a$
      CREATE UNIQUE INDEX IF NOT EXISTS media_compartidos_primero_uq
        ON public.media_compartidos (usuario_id, fuente, item_id)
        WHERE es_primero = true
    $ix074a$;
    RAISE NOTICE 'MIG074: indice media_compartidos_primero_uq creado';
  ELSIF v_def LIKE '%UNIQUE INDEX%'
        AND v_def LIKE '%usuario_id%'
        AND v_def LIKE '%fuente%'
        AND v_def LIKE '%item_id%'
        AND v_def LIKE '%es_primero%' THEN
    RAISE NOTICE 'MIG074: indice media_compartidos_primero_uq ya vigente; no-op';
  ELSE
    RAISE EXCEPTION 'MIG074 ABORTA: indice homonimo con OTRA definicion: %', v_def;
  END IF;

  SELECT count(*) INTO v_int
    FROM pg_index x
    JOIN pg_class c ON c.oid = x.indexrelid
   WHERE c.relname = 'media_compartidos_primero_uq'
     AND x.indrelid = 'public.media_compartidos'::regclass
     AND x.indisunique AND x.indisvalid
     AND x.indpred IS NOT NULL
     AND x.indnkeyatts = 3;
  IF v_int <> 1 THEN
    RAISE EXCEPTION 'MIG074 ABORTA: media_compartidos_primero_uq no quedo UNIQUE/parcial/valido de 3 claves';
  END IF;

  -- (8) INDICE 2: bitacora de comparticiones por usuario y dia --------------
  SELECT indexdef INTO v_def
    FROM pg_indexes
   WHERE schemaname = 'public' AND tablename = 'media_compartidos'
     AND indexname = 'idx_media_compartidos_usuario_dia';

  IF v_def IS NULL THEN
    EXECUTE $ix074b$
      CREATE INDEX IF NOT EXISTS idx_media_compartidos_usuario_dia
        ON public.media_compartidos (usuario_id, creado_en DESC)
    $ix074b$;
    RAISE NOTICE 'MIG074: indice idx_media_compartidos_usuario_dia creado';
  ELSIF v_def LIKE '%usuario_id%' AND v_def LIKE '%creado_en%' THEN
    RAISE NOTICE 'MIG074: indice idx_media_compartidos_usuario_dia ya vigente; no-op';
  ELSE
    RAISE EXCEPTION 'MIG074 ABORTA: indice homonimo con OTRA definicion: %', v_def;
  END IF;

  -- (9) INDICE 3: conteo de comparticiones por item ------------------------
  SELECT indexdef INTO v_def
    FROM pg_indexes
   WHERE schemaname = 'public' AND tablename = 'media_compartidos'
     AND indexname = 'idx_media_compartidos_item';

  IF v_def IS NULL THEN
    EXECUTE $ix074c$
      CREATE INDEX IF NOT EXISTS idx_media_compartidos_item
        ON public.media_compartidos (fuente, item_id, creado_en DESC)
    $ix074c$;
    RAISE NOTICE 'MIG074: indice idx_media_compartidos_item creado';
  ELSIF v_def LIKE '%fuente%' AND v_def LIKE '%item_id%' AND v_def LIKE '%creado_en%' THEN
    RAISE NOTICE 'MIG074: indice idx_media_compartidos_item ya vigente; no-op';
  ELSE
    RAISE EXCEPTION 'MIG074 ABORTA: indice homonimo con OTRA definicion: %', v_def;
  END IF;

  -- (10) POST: esta migracion no escribe datos -----------------------------
  EXECUTE 'SELECT count(*) FROM public.media_compartidos' INTO v_int;
  IF v_int <> v_filas THEN
    RAISE EXCEPTION 'MIG074 ABORTA: filas % -> %; esta migracion no escribe datos', v_filas, v_int;
  END IF;

  RAISE NOTICE 'MIG074 OK: media_compartidos vigente (9 columnas, 2 FK, 3 CHECK, 3 indices); % fila(s); compartir restaurado', v_filas;
END
$m074$;
