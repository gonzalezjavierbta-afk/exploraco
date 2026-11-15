-- ============================================================================
-- Migration 083: cartas - FLIP a activo = true de las 3 cartas de la familia
--   mejora (ADR-122 F0.4, cierre de R2).
--
-- ** NO APLICAR HASTA QUE EL DEPLOY ESTE VERIFICADO **
--   carta_acunar (api/interacciones.js) solo vende con el predicado
--   "c.id = $2 AND c.activo = true". Aplicar este flip antes de que el handler
--   y la UI que CONSUMEN la mejora esten desplegados y verificados abre una
--   ventana de "comprable pero no usable", que es exactamente lo que ADR-122
--   D10 prohibe. Orden obligatorio de R2:
--     1) deploy del handler y de la UI de consumo,
--     2) verificacion en produccion,
--     3) ESTE fichero, al final (F0.4), con el runner.
-- Fecha: 2026-11-14
-- Referencias: ADR-122 (F0.4; D2 subtipos = claves de sumidero, D4 precio fijo
--   por copia, D10), ADR-003 (cero borrado fisico), ADR-008 (idempotencia),
--   ADR-002 (ASCII-safe), ADR-006 (archivo real), ADR-087 (checksum).
-- Requiere, YA APLICADAS con fila en schema_migrations:
--   040 (cartas_catalogo), 066 (familia/subtipo + CHECKs), 068 (precio_xp
--   numeric(12,2)), 081 (familia 'mejora' y rama de los 3 subtipos comprables),
--   082 (seed de las 3 filas, las 3 con activo = false).
--
-- ALCANCE (F0.4). UNA sola escritura: activo = true en 3 filas.
--   - Cero DELETE. Cero INSERT. Cero DDL. Cero cambio de esquema.
--   - Ninguna otra columna se toca: precio_xp, rareza, subtipo, nombre,
--     edicion, supply_max, nivel_gate, emitidas, stats_json e imagen_url
--     quedan como esten. El precio NO se recalibra aqui (autoridad: 082).
--   - Ninguna otra fila del catalogo se toca, de ninguna familia.
--
-- PRE medido en Neon (2026-11-14, leido de la base, NO aplicado)
--   cartas_catalogo: 68 filas. familia='mejora': 3 filas, las 3 con
--     activo=false, y estos valores exactos (id / subtipo / rareza / precio):
--       cme_foto_galeria    / foto_galeria    / raro  /   400.00
--       cme_album_slot      / album_slot      / epico /  1000.00
--       cme_portada_destino / portada_destino / epico /  1000.00
--   familia='mejora' AND activo=true: 0 filas.
--   ledger: 82 es la ultima aplicada; 83 sin fila.
--
-- POST esperado
--   familia='mejora': 3 filas, las 3 con activo=true y las 3 con activo=false
--   imposibles. subtipo y precio_xp IDENTICOS al PRE. cartas_catalogo: 68
--   filas (ni altas ni bajas). Ninguna fila de otra familia modificada.
--
-- IDEMPOTENCIA (ADR-008)
--   - Re-ejecutar sobre el estado post EXACTO (3 de 3 activas, subtipo y
--     precio intactos) es NO-OP: NOTICE, RETURN y 0 filas escritas. Mismo
--     criterio que 080:137-140 y que el contrato de reejecucion de
--     082:51-52 ("re-ejecutar tras 083: 0 cambios de dato y sin abortar").
--     Se hace asi a proposito: abortar en ese caso haria que el runner
--     reescribiera la fila de la 83 en schema_migrations como 'fallida', y el
--     ledger es evidencia, no un estado (contrato de la 045).
--   - Estado PARCIAL (1 o 2 de las 3 activas) NO es idempotencia: es deriva y
--     ABORTA. Es la senal de que alguien activo la familia por otra via, o de
--     que una corrida quedo a medias.
--   - Guardas (a)/(b)/(c) fail-closed: si el catalogo no es el que este fichero
--     verifico, se aborta en vez de activar a ciegas.
--
-- ATOMICIDAD
--   El UPDATE y todos sus POST viven en UN solo bloque DO: un DO es UNA
--   sentencia, luego UNA transaccion. Cualquier RAISE EXCEPTION (incluido el
--   del recuento de filas afectadas) revierte el UPDATE entero. No existe
--   ventana con 1 o 2 cartas activas.
--
-- ROLLBACK (documentado, NO se ejecuta; soft-delete, ADR-003)
--   -- BEGIN;
--   -- UPDATE public.cartas_catalogo
--   --    SET activo = false
--   --  WHERE familia = 'mejora' AND activo = true
--   --    AND id IN ('cme_foto_galeria','cme_album_slot','cme_portada_destino');
--   -- DELETE FROM schema_migrations WHERE numero = 83;  (evidencia: NO tocar)
--   -- COMMIT;
--   OJO: apagar una mejora ya comprada deja al comprador con un item que no
--   puede usar. Ese es el motivo de que el flip sea el ULTIMO paso de R2.
--
-- NOTA: este fichero NO escribe schema_migrations; lo hace el runner
--   (scripts/apply_sql_file.js), contrato de la 045. NO registrar la 83 a mano
--   y NO aplicarla con otra via.
--
-- VERIFICACION (comentada, se corre a mano DESPUES de aplicar)
--   SELECT id, subtipo, precio_xp, activo FROM public.cartas_catalogo
--    WHERE familia = 'mejora' ORDER BY id;               -- 3 filas, activo=true
--   SELECT count(*) FROM public.cartas_catalogo
--    WHERE familia = 'mejora' AND activo = true;         -- 3
--   SELECT count(*) FROM public.cartas_catalogo;         -- 68
--   SELECT max(numero) FROM public.schema_migrations;    -- 83
-- ============================================================================

-- (0) PRE: precondiciones de esquema, fail-closed ----------------------------
DO $mig083pre$
DECLARE
  v_cols integer;
BEGIN
  IF to_regclass('public.cartas_catalogo') IS NULL THEN
    RAISE EXCEPTION 'MIG083 ABORTA: falta la tabla public.cartas_catalogo (040)';
  END IF;

  -- Columnas que este fichero lee o escribe. Si falta una, la base no es la de
  -- 066/068 y el UPDATE fallaria a medias: mejor abortar antes de escribir.
  SELECT count(*) INTO v_cols
    FROM information_schema.columns
   WHERE table_schema = 'public'
     AND table_name   = 'cartas_catalogo'
     AND column_name IN ('id', 'familia', 'subtipo', 'precio_xp', 'activo');
  IF v_cols <> 5 THEN
    RAISE EXCEPTION 'MIG083 ABORTA: cartas_catalogo no tiene las 5 columnas esperadas (tiene %); falta 066/068', v_cols;
  END IF;

  -- activo tiene que ser boolean y NOT NULL: un NULL haria que el UPDATE lo
  -- dejara fuera del WHERE sin ruido y el recuento de 3 filas lo delataria solo
  -- despues. Mejor dicho antes.
  SELECT count(*) INTO v_cols
    FROM information_schema.columns
   WHERE table_schema = 'public'
     AND table_name   = 'cartas_catalogo'
     AND column_name  = 'activo'
     AND data_type    = 'boolean'
     AND is_nullable  = 'NO';
  IF v_cols <> 1 THEN
    RAISE EXCEPTION 'MIG083 ABORTA: cartas_catalogo.activo no es boolean NOT NULL';
  END IF;

  -- precio_xp numeric(12,2) = 068. La guarda (b) compara contra 400.00 y
  -- 1000.00: si el tipo no es el que se midio, la comparacion no es la misma.
  SELECT count(*) INTO v_cols
    FROM information_schema.columns
   WHERE table_schema = 'public'
     AND table_name   = 'cartas_catalogo'
     AND column_name  = 'precio_xp'
     AND data_type    = 'numeric'
     AND numeric_precision = 12
     AND numeric_scale     = 2;
  IF v_cols <> 1 THEN
    RAISE EXCEPTION 'MIG083 ABORTA: precio_xp no es numeric(12,2) (068)';
  END IF;

  RAISE NOTICE 'MIG083 PRE OK: tabla, 5 columnas, activo boolean NOT NULL y precio_xp(12,2) presentes';
END
$mig083pre$;

-- (1) GUARDAS (c), (a), (b) + FLIP + POST, en UN solo DO = UNA transaccion ----
--     El orden de las guardas importa: (c) va PRIMERO para que el estado post
--     exacto se resuelva como NO-OP en vez de caer en la guarda (a), que exige
--     activo=false en las 3.
DO $mig083flip$
DECLARE
  v_esperado jsonb := '[
    {"id":"cme_foto_galeria",    "subtipo":"foto_galeria",    "precio_xp": 400},
    {"id":"cme_album_slot",      "subtipo":"album_slot",      "precio_xp":1000},
    {"id":"cme_portada_destino", "subtipo":"portada_destino", "precio_xp":1000}
  ]'::jsonb;
  v_act         integer;
  v_n           integer;
  v_txt         text;
  v_total_antes integer;
  v_total_desp  integer;
  v_upd         integer;
BEGIN
  -- (c) GUARDA DE DOBLE APLICACION / ESTADO INESPERADO ----------------------
  --     Cuenta las mejoras ya activas. Solo hay dos desenlaces admisibles:
  --     0 (nada activado todavia, se procede) o 3 con el contrato intacto
  --     (ya aplicada, NO-OP). Cualquier otro valor es deriva.
  SELECT count(*) INTO v_act
    FROM public.cartas_catalogo
   WHERE familia = 'mejora' AND activo = true;

  IF v_act > 0 THEN
    IF v_act = 3 THEN
      -- Estado post exacto: antes de declarar NO-OP hay que confirmar que son
      -- las 3 filas del contrato y que nadie movio subtipo ni precio. Un NO-OP
      -- sobre un catalogo derivado seria un falso positivo.
      SELECT count(*) INTO v_n
        FROM public.cartas_catalogo
       WHERE familia = 'mejora';
      IF v_n <> 3 THEN
        RAISE EXCEPTION 'MIG083 ABORTA (c): 3 mejora activas pero la familia tiene % filas; estado inesperado', v_n;
      END IF;

      SELECT string_agg(c.id || ' (subtipo=' || coalesce(c.subtipo, 'NULL') ||
                        ', precio_xp=' || coalesce(c.precio_xp::text, 'NULL') || ')', ', ')
        INTO v_txt
        FROM public.cartas_catalogo c
        JOIN jsonb_to_recordset(v_esperado) AS x(id text, subtipo text, precio_xp numeric)
          ON x.id = c.id
       WHERE c.subtipo    IS DISTINCT FROM x.subtipo
          OR c.precio_xp IS DISTINCT FROM x.precio_xp;
      IF v_txt IS NOT NULL THEN
        RAISE EXCEPTION 'MIG083 ABORTA (b): deriva de subtipo/precio_xp en: %', v_txt;
      END IF;

      SELECT count(*) INTO v_n
        FROM public.cartas_catalogo c
        JOIN jsonb_to_recordset(v_esperado) AS x(id text) ON x.id = c.id
       WHERE c.familia = 'mejora' AND c.activo = true;
      IF v_n <> 3 THEN
        RAISE EXCEPTION 'MIG083 ABORTA (c): % de los 3 ids del contrato estan con activo=true', v_n;
      END IF;

      RAISE NOTICE 'MIG083 NO-OP: las 3 cartas mejora ya estan activo=true con subtipo y precio intactos; 0 filas escritas';
      RETURN;
    END IF;

    RAISE EXCEPTION 'MIG083 ABORTA (c): % de 3 cartas mejora ya estan activo=true; estado parcial, no se activa el resto a ciegas', v_act;
  END IF;

  -- (a) LAS 3 FILAS EXISTEN, SON DE LA FAMILIA Y ESTAN APAGADAS -------------
  --     Izquierda y derecha: cuentan las filas del contrato presentes con
  --     activo=false Y las filas de la familia. Las dos tienen que dar 3.
  SELECT count(*) INTO v_n
    FROM public.cartas_catalogo c
    JOIN jsonb_to_recordset(v_esperado) AS x(id text) ON x.id = c.id
   WHERE c.familia = 'mejora' AND c.activo = false;
  IF v_n <> 3 THEN
    RAISE EXCEPTION 'MIG083 ABORTA (a): % de las 3 cartas mejora del contrato estan con activo=false; se esperan 3 (082 sin aplicar o id renombrado)', v_n;
  END IF;

  SELECT count(*) INTO v_n
    FROM public.cartas_catalogo
   WHERE familia = 'mejora';
  IF v_n <> 3 THEN
    RAISE EXCEPTION 'MIG083 ABORTA (a): la familia mejora tiene % filas; se esperan exactamente 3', v_n;
  END IF;

  -- (b) SUBTIPO Y PRECIO CONGELADOS ----------------------------------------
  --     Tabla ratificada de D4/F0.2, escrita otra vez aqui a proposito: si una
  --     fila se sale del contrato se aborta en vez de activar una carta a otro
  --     precio. 400.00 = base raro x mult familia mejora (1.0); 1000.00 = epico.
  SELECT string_agg(c.id || ' (subtipo=' || coalesce(c.subtipo, 'NULL') ||
                    ', precio_xp=' || coalesce(c.precio_xp::text, 'NULL') || ')', ', ')
    INTO v_txt
    FROM public.cartas_catalogo c
    JOIN jsonb_to_recordset(v_esperado) AS x(id text, subtipo text, precio_xp numeric)
      ON x.id = c.id
   WHERE c.subtipo    IS DISTINCT FROM x.subtipo
      OR c.precio_xp IS DISTINCT FROM x.precio_xp;
  IF v_txt IS NOT NULL THEN
    RAISE EXCEPTION 'MIG083 ABORTA (b): deriva de subtipo/precio_xp en: %', v_txt;
  END IF;

  SELECT count(*) INTO v_total_antes FROM public.cartas_catalogo;

  -- (1) FLIP: las 3 y solo las 3 -------------------------------------------
  UPDATE cartas_catalogo SET activo = true WHERE familia='mejora' AND activo=false AND id IN ('cme_foto_galeria','cme_album_slot','cme_portada_destino');
  GET DIAGNOSTICS v_upd = ROW_COUNT;

  IF v_upd <> 3 THEN
    RAISE EXCEPTION 'MIG083 ABORTA POST: el UPDATE afecto % filas; se esperan exactamente 3', v_upd;
  END IF;

  -- (2) POST: tripwires fail-closed ----------------------------------------
  --     Ninguna fila de la familia puede quedar apagada: el flip es total o no
  --     es. Un 2 de 3 seria una carta comprable y dos no, sin explicacion.
  SELECT count(*) INTO v_n
    FROM public.cartas_catalogo
   WHERE familia = 'mejora' AND activo = false;
  IF v_n <> 0 THEN
    RAISE EXCEPTION 'MIG083 POST: % carta(s) mejora siguen con activo=false tras el flip', v_n;
  END IF;

  SELECT count(*) INTO v_n
    FROM public.cartas_catalogo c
    JOIN jsonb_to_recordset(v_esperado) AS x(id text) ON x.id = c.id
   WHERE c.familia = 'mejora' AND c.activo = true;
  IF v_n <> 3 THEN
    RAISE EXCEPTION 'MIG083 POST: % de los 3 ids del contrato quedaron activo=true; se esperan 3', v_n;
  END IF;

  -- El flip no puede haber movido subtipo ni precio: se re-verifica despues.
  SELECT string_agg(c.id || ' (subtipo=' || coalesce(c.subtipo, 'NULL') ||
                    ', precio_xp=' || coalesce(c.precio_xp::text, 'NULL') || ')', ', ')
    INTO v_txt
    FROM public.cartas_catalogo c
    JOIN jsonb_to_recordset(v_esperado) AS x(id text, subtipo text, precio_xp numeric)
      ON x.id = c.id
   WHERE c.subtipo    IS DISTINCT FROM x.subtipo
      OR c.precio_xp IS DISTINCT FROM x.precio_xp;
  IF v_txt IS NOT NULL THEN
    RAISE EXCEPTION 'MIG083 POST: subtipo/precio_xp se movieron en: %', v_txt;
  END IF;

  -- Ni altas ni bajas en el catalogo entero (el UPDATE no puede cambiar el
  -- recuento, pero si alguien metio un trigger, esto lo delata).
  SELECT count(*) INTO v_total_desp FROM public.cartas_catalogo;
  IF v_total_desp <> v_total_antes THEN
    RAISE EXCEPTION 'MIG083 POST: total del catalogo % -> %; el flip no debe alterar el recuento', v_total_antes, v_total_desp;
  END IF;

  SELECT count(*) INTO v_n
    FROM public.cartas_catalogo
   WHERE familia = 'mejora';
  IF v_n <> 3 THEN
    RAISE EXCEPTION 'MIG083 POST: la familia mejora tiene % filas; se esperan exactamente 3', v_n;
  END IF;

  RAISE NOTICE 'MIG083 POST OK: 3 cartas mejora con activo=true, subtipo y precio intactos; total del catalogo % filas', v_total_desp;
END
$mig083flip$;
