-- ============================================================================
-- 050_indice_parcial_sink_slots_activos.sql
--
-- QUE HACE, EN UNA FRASE
--   Sustituye la falsa unicidad uq_sink_slot por un indice UNICO PARCIAL
--   sobre (usuario_id, clave_accion, ref_id) WHERE activo = true: dos slots
--   ACTIVOS del mismo enganche son un doble cobro y el indice los rechaza;
--   un slot dado de baja (activo = false) ya no ocupa plaza, asi que
--   recomprarlo es legitimo y el indice lo permite.
--
-- PREDECESORA
--   049_parche_upgrades_usuario_id_set_not_null.sql.
--   scripts/apply_sql_file.js exige que el numero N-1 exista en disco Y tenga
--   fila valida en schema_migrations; saltarse la 049 haria derivar el checksum
--   del ledger. MEDIDO el 2026-10-05: 049 con resultado = aplicada y
--   checksum de ledger f59a704ec324 = sha256 de los bytes en disco. MATCH.
--   Este fichero es el 050, el siguiente libre (el 045 es el ledger).
--
-- POR QUE UN INDICE PARCIAL Y NO UNO TOTAL
--   MEDIDO el 2026-10-05 en api/interacciones.js, rama slot_baja (linea 15704):
--       UPDATE sink_slots SET activo = false
--        WHERE id = $1::uuid AND usuario_id = $2::uuid AND activo = true
--   y su respuesta declara, literalmente (linea 15730):
--       xp_devuelto: 0
--       nota: 'dar de baja un slot no devuelve XP (ADR-086 1-bis.2)'
--   O sea: dar de baja NO devuelve el XP. Con unicidad TOTAL, quien pagara un
--   recurso, lo diera de baja y quisiera volver a pagarlo recibiria
--   SQLSTATE 23505 en una operacion que el negocio considera legitima y por la
--   que ya cobro antes. Con el indice PARCIAL, dar de baja libera la combinacion
--   y recomprar entra; la unicidad sigue guarneciendo lo que de verdad es
--   invalido, que es la doble plaza viva sobre el mismo enganche.
--
-- MEDICION PREVIA QUE HACE SEGURO ESTE INDICE (economia, no opinion)
--   El precio NO se vuelve barato al recomprar. MEDIDO en api/interacciones.js,
--   function sinkPrecioCte() (linea 2398), la CTE que fija k es:
--       k AS (
--         SELECT COUNT(*)::int AS k_actual FROM sink_slots
--          WHERE usuario_id = $1::uuid AND clave_accion = $2
--       )
--   SIN clausula AND activo = true, o sea cuenta TODAS las filas, dadas de
--   baja incluidas. El conteo de activos es OTRA CTE, ka (linea 2401), que si
--   filtra, y solo se usa para el guard de capacidad
--   (p.k_activos < p.slot_max_activos, linea 15534). El slot_index se congela
--   como el k historico (linea 15551: ... , d.k_actual).
--   Consecuencia economica: dar de baja deja la fila, luego k NO baja y el
--   recomprar cuesta MAS (k+1), nunca menos. NO hay agujero de precio. Por eso
--   esta migracion no toca ni la asignacion de slot_index ni la curva: son
--   economia de producto (ADR-086), no esquema.
--
-- POR QUE SE QUITA uq_sink_slot
--   Definida en 046_market_multimoneda_sinks.sql linea 163 como
--       CONSTRAINT uq_sink_slot UNIQUE (usuario_id, clave_accion, ref_id, creado_en)
--   Su nombre promete unicidad de slot y su contenido no promete ninguna: la
--   cuarta columna es creado_en, que es now(), o sea la marca de TIEMPO de la
--   transaccion (DEFAULT now() es estable dentro de la transaccion). Dos
--   insertions legitimas del mismo (usuario, clave, ref) dentro de la MISMA
--   transaccion comparten creado_en al segundo y esta restriccion las rechaza
--   con 23505. Es decir: no protege del doble cobro que dice proteger y si
--   estorba en el caso bueno. Una restriccion llamada "uq" que no da unicidad
--   es una mentira en el esquema (ADR-006: la verdad es el esquema real), y
--   dejarla como no-op tras poner el indice parcial seria tener dos objetos
--   REDUNDANTES y contradictorios. Se sustituye, no se apila.
--
-- PRECONDICIONES (si no se cumplen, ABORTAR; nunca seguir en silencio)
--   (1a) public.sink_slots existe -> si no, la 046 no esta aplicada y esta
--        migracion no tiene objeto.
--   (1b) 0 combinaciones (usuario_id, clave_accion, ref_id) con mas de una
--        fila activa -> si las hubiera, el indice parcial no se puede construir
--        y ademas son datos que no se borran ni se reparan aqui (ADR-003): un
--        REF_ID o un ACTIVE mal puestos no dejan testigo de cual de los dos
--        era el bueno. Se aborta con el numero de combinaciones afectadas.
--        MEDIDO el 2026-10-05 antes de escribir este fichero: 0 violaciones
--        sobre 0 filas totales. Es una red de seguridad, no un camino.
--
-- CARACTER DE LA MIGRACION
--   Forward-only (ADR-086 seccion 3). Cero DELETE (ADR-003), cero TRUNCATE,
--   cero UPDATE de datos, cero cambio de tipo. Unica escritura: sustituir una
--   restriccion por su indice equivalente mas estrecho. NO toca la tabla, sus
--   columnas ni sus CHECK.
--
-- RLS
--   Se asume RLS DESACTIVADO en public.sink_slots. No se espera que RLS
--   cubra nada: la garantia la da el indice, no la politica. Si alguien la
--   activa mas adelante, el indice parcial sigue siendo necesario para el
--   error 23505 (RLS filtra filas por politica, no valida unicidad).
--
-- ============================================================================

-- (1) PRECONDICIONES. Read-only: solo comprueba y aborta si algo NO se cumple.
--     No modifica nada. Es el unico bloque que puede cortar la migracion.
DO $mig050a$
DECLARE
  v_violaciones integer;
  v_filas      integer;
  v_mensaje    text;
BEGIN
  IF to_regclass('public.sink_slots') IS NULL THEN
    RAISE EXCEPTION
      '050: public.sink_slots NO existe. Esta migracion solo indexa la tabla que creo 046_market_multimoneda_sinks.sql. Se aborta en vez de continuar.';
  END IF;

  -- (1b) Duplicados VIVOS. El agrupado filtra activo = true, luego es
  --      exactamente el predicado del indice que se va a crear: si aqui sale
  --      0, el CREATE UNIQUE INDEX no puede fallar por datos.
  SELECT count(*) INTO v_violaciones
    FROM (
      SELECT 1
        FROM public.sink_slots
       WHERE activo = true
       GROUP BY usuario_id, clave_accion, ref_id
      HAVING count(*) > 1
    ) v;

  SELECT count(*) INTO v_filas FROM public.sink_slots;

  IF v_violaciones > 0 THEN
    SELECT string_agg(
      'usuario_id=' || s.usuario_id::text
      || ' clave=' || s.clave_accion
      || ' ref_id=' || coalesce(s.ref_id, 'NULL')
      || ' filas_activas=' || s.n::text, ' | ')
      INTO v_mensaje
      FROM (
        SELECT usuario_id, clave_accion, ref_id, count(*) AS n
          FROM public.sink_slots
         WHERE activo = true
         GROUP BY usuario_id, clave_accion, ref_id
        HAVING count(*) > 1
         ORDER BY count(*) DESC, 1, 2, 3
         LIMIT 10
      ) s;

    RAISE EXCEPTION
      '050: public.sink_slots tiene % combinacion(es) (usuario_id, clave_accion, ref_id) con mas de una fila ACTIVA; el indice parcial exige 0. No se borran ni se reparan (ADR-003): decide cual fila conserva activo = true y pon la otra en false, y reintenta. Muestra (max 10): %',
      v_violaciones, v_mensaje;
  END IF;

  RAISE NOTICE 'migracion 050: precondiciones OK (% fila(s) en sink_slots, 0 violaciones de unicidad parcial)', v_filas;
END
$mig050a$;

-- (2) SE RETIRA LA RESTRICCION QUE NO UNIFICA. Idempotente por IF EXISTS:
--     reejecutar esta migracion no falla por este bloque. Se usa
--     DROP CONSTRAINT y no DROP INDEX porque uq_sink_slot es una restriccion
--     de tabla (CONSTRAINT ... UNIQUE), no un indice suelto; su indice
--     subyacente cae con ella.
ALTER TABLE public.sink_slots
  DROP CONSTRAINT IF EXISTS uq_sink_slot;

-- (3) EL INDICE PARCIAL. Idempotente por IF NOT EXISTS. El predicado
--     WHERE activo = true es la SEMANTICA, no un filtro cosmetico: sin el,
--     el indice seria total y reprobaria la recompra legitima descrita arriba.
CREATE UNIQUE INDEX IF NOT EXISTS uq_sink_slots_activo
  ON public.sink_slots (usuario_id, clave_accion, ref_id)
  WHERE activo = true;

-- (4) EVIDENCIA DE LO QUE QUEDA Y LO QUE SE FUE. Read-only: comprueba con
--     pg_constraint y pg_indexes y avisa por NOTICE. Si el NOTICE de la
--     restriccion no aparece, algo quedo a medias y hay que mirarlo.
DO $mig050b$
DECLARE
  v_def_texto   text;
  v_def_indice  text;
  v_previo      text;
BEGIN
  SELECT pg_get_constraintdef(c.oid) INTO v_def_texto
    FROM pg_constraint c
   WHERE c.conrelid = 'public.sink_slots'::regclass
     AND c.conname  = 'uq_sink_slot';

  IF v_def_texto IS NULL THEN
    RAISE NOTICE '050: uq_sink_slot ya NO existe (correcto: no unificaba nada util).';
  ELSE
    RAISE WARNING '050: uq_sink_slot SIGUE en el esquema con def = %. Revisa si el DROP no se ejecuto.', v_def_texto;
  END IF;

  SELECT indexdef INTO v_def_indice
    FROM pg_indexes
   WHERE schemaname = 'public'
     AND tablename = 'sink_slots'
     AND indexname = 'uq_sink_slots_activo';

  SELECT indexdef INTO v_previo
    FROM pg_indexes
   WHERE schemaname = 'public'
     AND tablename = 'sink_slots'
     AND indexname = 'uq_sink_slot';

  IF v_def_indice IS NULL THEN
    RAISE WARNING '050: uq_sink_slots_activo NO aparece en pg_indexes. Revisa si el CREATE no se ejecuto.';
  ELSE
    RAISE NOTICE '050: indice parcial activo, def = %', v_def_indice;
  END IF;

  RAISE NOTICE '050: estado final de los indices de sink_slots -> vacio=% | anterior=%',
    coalesce(v_def_indice, '<ausente>'), coalesce(v_previo, 'uq_sink_slot ya retirado');
END
$mig050b$;

-- (5) VERIFICACION POST-APLICACION. Read-only, comentada a proposito para que
--     aplicar el fichero no ejecute nada mas alla del DROP y del CREATE.
--     Es lo que devuelve la 050 aplicada:
--
--     $env:NEON_QUERY="SELECT conname FROM pg_constraint
--                        WHERE conrelid='public.sink_slots'::regclass AND contype='u'";
--     -> 0 filas. uq_sink_slot fuera. (solo queda el pkey, contype='p')
--
--     $env:NEON_QUERY="SELECT indexdef FROM pg_indexes
--                        WHERE tablename='sink_slots'
--                          AND indexname='uq_sink_slots_activo'";
--     -> CREATE UNIQUE INDEX uq_sink_slots_activo ON public.sink_slots
--          USING btree (usuario_id, clave_accion, ref_id) WHERE (activo = true)
--
--     PRUEBA DE DOBLE COBRO (el numero que prueba que el indice REAL):
--     con la tabla vacia y sin ensuciarla, dentro de una transaccion con
--     ROLLBACK, dos slots activos del mismo enganche:
--
--       BEGIN;
--       INSERT INTO public.sink_slots
--         (usuario_id, clave_accion, ref_id, costo_pagado, slot_index)
--       SELECT id, 'foto_galeria', 'prueba-050', 10, 0 FROM public.usuarios LIMIT 1;
--       INSERT INTO public.sink_slots
--         (usuario_id, clave_accion, ref_id, costo_pagado, slot_index)
--       SELECT id, 'foto_galeria', 'prueba-050', 20, 1 FROM public.usuarios LIMIT 1;
--       -- el SEGUNDO debe fallar: SQLSTATE 23505 unique_violation
--       ROLLBACK;
--
--     PRUEBA DE RECOMPRA (por que el indice es PARCIAL y no total):
--
--       BEGIN;
--       INSERT INTO public.sink_slots
--         (usuario_id, clave_accion, ref_id, costo_pagado, slot_index)
--       SELECT id, 'foto_galeria', 'prueba-050b', 10, 0 FROM public.usuarios LIMIT 1;
--       UPDATE public.sink_slots SET activo = false
--        WHERE ref_id = 'prueba-050b';
--       INSERT INTO public.sink_slots
--         (usuario_id, clave_accion, ref_id, costo_pagado, slot_index)
--       SELECT id, 'foto_galeria', 'prueba-050b', 30, 1 FROM public.usuarios LIMIT 1;
--       -- el TERCER insert entra: dar de bajo libero la combinacion
--       ROLLBACK;
--
-- ============================================================================