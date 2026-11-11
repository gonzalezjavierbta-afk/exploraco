-- ============================================================================
-- Migration 080: cartas - APAGAR (no borrar) la carta de PRUEBA y cerrar D-34
--   1) pone activo=false en car_artista_prueba (deja de estar en el catalogo
--      efectivo y deja de ser comprable/acunable)
--   2) NO toca ninguna otra fila: el inventario del comprador, el nivel, el
--      ledger de XP y el contador emitidas quedan EXACTAMENTE como estan
-- Fecha: 2026-11-11
-- Referencias: D-34 (cierre de la compra real de la carta de prueba),
--   ADR-003 (cero borrado fisico: nada se elimina, se apaga), ADR-008
--   (idempotencia), ADR-002 (ASCII-safe), ADR-035 (XP numeric(12,2)).
-- Requiere, YA APLICADAS con fila en schema_migrations:
--   040 (cartas_catalogo), 066 (familia/precio_xp/supply_max/emitidas + CHECKs),
--   068 (precio_xp numeric(12,2)), 069 (familia NOT NULL), 079 (la carta).
--
-- DDL REAL LEIDO DE LA BD EL 2026-11-11 (information_schema, no memoria)
--   cartas_catalogo = 24 columnas y NO tiene actualizado_en. La UNICA columna
--   de tiempo es creado_en timestamptz NULLABLE. Por eso este UPDATE no
--   escribe ninguna marca de tiempo: inventar actualizado_en romperia la
--   migracion (42703) y reescribir creado_en falsearia la evidencia de cuando
--   se creo la carta, que es justo lo que ADR-003 prohibe. La trazabilidad de
--   esta operacion vive en schema_migrations (nombre, checksum, aplicada_en,
--   duracion_ms y notas), que escribe el runner.
--
-- POR QUE EXISTE (D-34)
--   La compra real de la carta de prueba ya ocurrio y esta verificada. Mientras
--   la carta siga activo=true, el endpoint de acunacion la acepta
--   (api/interacciones.js:17730 exige c.activo=true) y cualquiera puede
--   comprarla con XP real. D-34 no se puede cerrar con la carta comprable: se
--   APAGA. La pieza sigue siendo de PRUEBA y NO cuenta como catalogo real.
--
-- PRE medido en Neon (2026-11-11, antes de aplicar)
--   cartas_catalogo   activo=true | emitidas=1 | precio_xp=480.00
--                     supply_max=1000 | familia=artista | creado_en 20:31:22Z
--   usuarios_cartas   1 fila (car_artista_prueba, variante base, cantidad 1,
--                     activo=true, obtenida_en 2026-11-11T21:48:15Z)
--   usuarios_cartas_nivel  1 fila, nivel 1
--   usuarios.xp_gastado_sinks del comprador = 480.00
--   catalogo efectivo (misma formula que api/usuarios.js:1037-1040) = 58
--
-- POST esperado
--   cartas_catalogo   activo=false | emitidas=1 (NO cambia)
--   usuarios_cartas   1 fila intacta, activo=true, cantidad 1 (no se borra)
--   usuarios_cartas_nivel  nivel 1 intacto
--   usuarios.xp_gastado_sinks = 480.00 (no se reintegra ni se cobra otra vez)
--   catalogo efectivo = 57
--
-- EFECTO LATERAL MEDIDO (no se corrige aqui)
--   GET ?tipo=cartas_mias filtra WHERE c.activo = true (api/usuarios.js:1244),
--   luego tras apagarla el comprador ya NO la ve en la lectura del album. La
--   fila de usuarios_cartas SIGUE existiendo (ADR-003) y el dato no se pierde.
--   Si D-34 exige visibilidad historica habria que tocar el endpoint; esta
--   migracion no modifica api/*.js.
--
-- IDEMPOTENCIA (ADR-008)
--   - Guardas FAIL-CLOSED antes del UPDATE: carta inexistente, emitidas < 1,
--     precio_xp distinto de 480 y compra no registrada -> ABORTAN.
--   - Si la carta ya esta activo=false: NOTICE y RETURN (0 filas, sin error).
--   - El UPDATE lleva AND activo=true: una segunda corrida no cambia nada.
--   - Guardas POST en el MISMO bloque DO: si alguna falla, el bloque revierte
--     el UPDATE entero (una sentencia = una transaccion).
--
-- ROLLBACK (documentado, NO se ejecuta; ADR-003 prohibe el borrado fisico y la
-- reapertura de una carta de prueba en produccion solo se hace con criterio)
--   -- BEGIN;
--   -- UPDATE public.cartas_catalogo
--   --    SET activo = true
--   --  WHERE id = 'car_artista_prueba' AND activo = false;
--   -- DELETE FROM schema_migrations WHERE numero = 80;  (evidencia: NO tocar)
--   -- COMMIT;
--
-- NOTA: este fichero NO escribe schema_migrations; lo hace el runner
--   (scripts/apply_sql_file.js), contrato de la 045.
-- ============================================================================

DO $mig080$
DECLARE
  v_activo       boolean;
  v_emitidas     integer;
  v_precio       numeric;
  v_supply       integer;
  v_cat_antes    integer;
  v_cat_despues  integer;
  v_uc_antes     integer;
  v_uc_despues   integer;
  v_uc_activo    boolean;
  v_uc_cant      integer;
  v_sinks        numeric;
  v_buyer        uuid;
  v_upd          integer := 0;
  v_cols         integer;
  v_activo_post  boolean;
  v_emit_post    integer;
BEGIN
  -- (0a) PRECONDICIONES DE ESQUEMA ------------------------------------------
  IF to_regclass('public.cartas_catalogo') IS NULL THEN
    RAISE EXCEPTION 'MIG080 ABORTA: falta la tabla public.cartas_catalogo';
  END IF;

  IF to_regclass('public.usuarios_cartas') IS NULL THEN
    RAISE EXCEPTION 'MIG080 ABORTA: falta la tabla public.usuarios_cartas';
  END IF;

  IF to_regclass('public.usuarios') IS NULL THEN
    RAISE EXCEPTION 'MIG080 ABORTA: falta la tabla public.usuarios';
  END IF;

  SELECT count(*) INTO v_cols
    FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'cartas_catalogo'
     AND column_name IN ('id','familia','activo','emitidas','precio_xp','supply_max');

  IF v_cols <> 6 THEN
    RAISE EXCEPTION 'MIG080 ABORTA: cartas_catalogo no tiene las 6 columnas esperadas (tiene %); falta 066', v_cols;
  END IF;

  -- (0b) GUARDA 1: la carta existe ------------------------------------------
  SELECT c.activo, c.emitidas, c.precio_xp, c.supply_max
    INTO v_activo, v_emitidas, v_precio, v_supply
    FROM public.cartas_catalogo c
   WHERE c.id = 'car_artista_prueba';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'MIG080 ABORTA: no existe car_artista_prueba; sin la carta de prueba no hay nada que cerrar (D-34)';
  END IF;

  -- (0c) GUARDA 2: prueba de compra real (emitidas >= 1) --------------------
  IF v_emitidas IS NULL OR v_emitidas < 1 THEN
    RAISE EXCEPTION 'MIG080 ABORTA: emitidas=% (<1); no hay prueba de compra y D-34 no se puede cerrar', v_emitidas;
  END IF;

  -- (0d) GUARDA 3: precio congelado en 480 (anti edicion silenciosa) --------
  IF v_precio IS NULL OR v_precio <> 480 THEN
    RAISE EXCEPTION 'MIG080 ABORTA: precio_xp=% distinto de 480; el catalogo cambio y no se apaga a ciegas', v_precio;
  END IF;

  -- (0e) GUARDA 4: si ya esta apagada, NOTICE y no-op -----------------------
  IF v_activo = false THEN
    RAISE NOTICE 'MIG080 NO-OP: car_artista_prueba ya estaba activo=false (emitidas=%, precio_xp=%); 0 filas', v_emitidas, v_precio;
    RETURN;
  END IF;

  -- (1) BASELINE: catalogo efectivo con la MISMA formula del endpoint -------
  --     api/usuarios.js:1037-1040 -> c.activo = true
  --     AND c.familia NOT IN ('producto','consumible')
  --     AND c.precio_xp IS NOT NULL AND c.precio_xp > 0
  SELECT count(*) INTO v_cat_antes
    FROM public.cartas_catalogo c
   WHERE c.activo = true
     AND c.familia NOT IN ('producto', 'consumible')
     AND c.precio_xp IS NOT NULL
     AND c.precio_xp > 0;

  SELECT count(*) INTO v_uc_antes FROM public.usuarios_cartas;

  -- (2) BASELINE: evidencia de la compra (fila activa + debito 480) ---------
  SELECT uc.usuario_id, uc.activo, uc.cantidad
    INTO v_buyer, v_uc_activo, v_uc_cant
    FROM public.usuarios_cartas uc
   WHERE uc.carta_id = 'car_artista_prueba'
     AND uc.activo = true
     AND uc.cantidad >= 1
   ORDER BY uc.obtenida_en ASC NULLS LAST, uc.usuario_id ASC
   LIMIT 1;

  IF v_buyer IS NULL THEN
    RAISE EXCEPTION 'MIG080 ABORTA: no hay fila activa en usuarios_cartas para car_artista_prueba; la compra no esta registrada';
  END IF;

  SELECT u.xp_gastado_sinks INTO v_sinks
    FROM public.usuarios u
   WHERE u.id = v_buyer;

  IF v_sinks IS NULL OR v_sinks <> 480 THEN
    RAISE EXCEPTION 'MIG080 ABORTA: xp_gastado_sinks=% del comprador, se esperaba 480.00; el debito no esta aplicado', v_sinks;
  END IF;

  -- (3) UPDATE IDEMPOTENTE: apagar la carta, sin tocar emitidas ni precio ---
  UPDATE public.cartas_catalogo c
     SET activo = false
   WHERE c.id = 'car_artista_prueba'
     AND c.activo = true;

  GET DIAGNOSTICS v_upd = ROW_COUNT;

  IF v_upd <> 1 THEN
    RAISE EXCEPTION 'MIG080 ABORTA: el UPDATE afecto % filas (se esperaba 1)', v_upd;
  END IF;

  -- (4) GUARDAS POST: nada se borro y el catalogo baja exactamente 1 --------
  SELECT count(*) INTO v_cat_despues
    FROM public.cartas_catalogo c
   WHERE c.activo = true
     AND c.familia NOT IN ('producto', 'consumible')
     AND c.precio_xp IS NOT NULL
     AND c.precio_xp > 0;

  IF v_cat_despues <> v_cat_antes - 1 THEN
    RAISE EXCEPTION 'MIG080 ABORTA: catalogo efectivo % -> % (se esperaba una baja de exactamente 1)', v_cat_antes, v_cat_despues;
  END IF;

  SELECT c.activo, c.emitidas
    INTO v_activo_post, v_emit_post
    FROM public.cartas_catalogo c
   WHERE c.id = 'car_artista_prueba';

  IF v_activo_post IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'MIG080 ABORTA: la carta no quedo activo=false';
  END IF;

  IF v_emit_post IS DISTINCT FROM v_emitidas THEN
    RAISE EXCEPTION 'MIG080 ABORTA: emitidas cambio de % a %; el UPDATE solo debia tocar activo', v_emitidas, v_emit_post;
  END IF;

  SELECT count(*) INTO v_uc_despues FROM public.usuarios_cartas;

  IF v_uc_despues <> v_uc_antes THEN
    RAISE EXCEPTION 'MIG080 ABORTA: usuarios_cartas % -> %; se perdio inventario (ADR-003)', v_uc_antes, v_uc_despues;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.usuarios_cartas uc
     WHERE uc.usuario_id = v_buyer
       AND uc.carta_id = 'car_artista_prueba'
       AND uc.activo = true
       AND uc.cantidad = v_uc_cant
  ) THEN
    RAISE EXCEPTION 'MIG080 ABORTA: la fila del comprador desaparecio o cambio; ADR-003 violado';
  END IF;

  SELECT u.xp_gastado_sinks INTO v_sinks
    FROM public.usuarios u
   WHERE u.id = v_buyer;

  IF v_sinks IS NULL OR v_sinks <> 480 THEN
    RAISE EXCEPTION 'MIG080 ABORTA: xp_gastado_sinks=% tras el UPDATE; se esperaba 480.00 intacto', v_sinks;
  END IF;

  RAISE NOTICE 'MIG080 OK: car_artista_prueba activo=false; emitidas=% intacto; catalogo efectivo % -> %; usuarios_cartas=% intacto; xp_gastado_sinks=% intacto', v_emitidas, v_cat_antes, v_cat_despues, v_uc_despues, v_sinks;
END
$mig080$;
