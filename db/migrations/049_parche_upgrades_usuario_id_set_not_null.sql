-- ============================================================================
-- 049_parche_upgrades_usuario_id_set_not_null.sql
--
-- QUE HACE, EN UNA FRASE
--   Convierte en REAL lo que la 048 solo declaro en los papel: impone
--   NOT NULL a public.parche_upgrades.usuario_id, de modo que el catalogo
--   (information_schema.columns.is_nullable) deje de decir YES y pase a NO.
--
-- POR QUE, SI LA 048 YA CERRO EL INVARIANTE
--   MEDIDO el 2026-10-05, con la 048 aplicada y sin tocar nada:
--     information_schema.columns.is_nullable  = YES   (columna declarada nullable)
--     INSERT con usuario_id NULL             -> SQLSTATE 23514 check_violation
--   Es decir: el negocio dice obligatoria, el esquema dice opcional, y hay DOS
--   fuentes de verdad. ADR-006 dice que la verdad es el esquema real, luego el
--   esquema esta mintiendo. Y ya ha costado un fallo real esta sesion: un
--   agente midio is_nullable = YES, concluyo que la 048 no estaba aplicada y
--   casi la reejecuta. Un futuro developer hara exactamente lo mismo.
--   El CHECK se puede DROP CONSTRAINT en un comando; el NOT NULL es intrinseco
--   a la columna. Por eso el NOT NULL es la capa que no se puede deshacer.
--
-- POR QUE NO SE TOCA LA 048
--   La 048 esta APLICADA y su checksum esta registrado en schema_migrations.
--   Editarla no es una correccion: es destruir evidencia (ADR-003) y ademas el
--   runner la rechazaria por DERIVA. La correccion valida es una migracion NUEVA
--   y numerada. Este fichero es eso: 049, el siguiente libre.
--
-- DECISION 1: NOT NULL ADEMAS DEL CHECK, NO EN LUGAR DEL
--   El CHECK chk_parche_upgrades_usuario_id_notnull (048) SE CONSERVA y se
--   sigue validando. No se dropea. Motivo: se SUMAN capas, no se sustituyen.
--     - El NOT NULL cambia el codigo de error a 23502 not_null_violation, que
--       es el que un cliente debe leer para diferenciar "no me mandaste el
--       inversor" de una violacion de otro CHECK. El 23514 no distingue.
--     - El CHECK queda como red si alguien altera la columna con una
--       operacion posterior; el negocio mantiene su invariante
--       explicito y nombrado, que es legible en pg_get_constraintdef.
--   Verificacion de que sigue ahi: el NOTICE final de esta migracion lo
--   comprueba con pg_constraint y reporta convalidated.
--
-- DECISION 2: IDEMPOTENCIA DE SET NOT NULL, Y COMO SE RESUELVE
--   PostgreSQL NO admite IF NOT EXISTS en ALTER COLUMN ... SET NOT NULL. Es
--   una limitacion real del motor, no una pereza. La forma canonica de esta
--   migracion es el patron ya usado en 019/026/028/029/031/032/039/041/042 y
--   en la propia 048:
--       DO $$ BEGIN
--         IF NOT EXISTS (<condicion>) THEN <el ALTER>; END IF;
--       END $$;
--   Aqui la condicion se lee de information_schema.columns.is_nullable, que es
--   justamente el numero que esta migracion viene a cambiar. Semantica:
--     - is_nullable = 'YES' -> se aplica el SET NOT NULL (una sola vez).
--     - is_nullable = 'NO'  -> no-op con NOTICE, y reejecutar NO falla.
--   Es idempotente en su propia forma: el estado final (NOT NULL) ya no repite
--   trabajo. No se usa el patron por "DROPEAR si existe", porque aqui no hay
--   objeto opcional que omitir: o la columna es NOT NULL, o todavia no.
--
-- PRECONDICIONES (si no se cumplen, ABORTAR; nunca seguir en silencio)
--   (1a) public.parche_upgrades.usuario_id existe  -> si no, la 047 no esta
--        aplicada y esta migracion no tiene objeto.
--   (1b) 0 filas con usuario_id IS NULL             -> si las hubiera, la
--        respuesta es abortar con el numero. No se borran (ADR-003) ni se
--        rellenan por adivinanza: un NULL no deja testigo de a que inversor
--        correspondia.
--   MEDIDO el 2026-10-05 antes de escribir este fichero: 0 huerfanas sobre
--   0 filas totales. Por eso el ALTER es instantaneo: no hay que reescribir
--   ninguna fila (Postgres valida la columna antes de fijar el atributo).
--
-- CARACTER DE LA MIGRACION
--   Forward-only (ADR-086 seccion 3). Cero DELETE (ADR-003), cero DROP, cero
--   TRUNCATE, cero UPDATE de datos, cero cambio de tipo. Solo lee el
--   catalogo y, si hace falta, fija un atributo de columna. ASCII-SAFE
--   (ADR-002): cero bytes > 127, cero tildes, cero emojis, cero backticks.
--   LF-only: los checksums de db/migrations/ se registran byte a byte y una
--   conversion LF -> CRLF rompe la comparacion (ADR-087).
--
-- Ejecutar SOLO con las dos puertas del AVISO DE ORDEN cumplidas:
--   node scripts/apply_sql_file.js --dry-run db/migrations/049_parche_upgrades_usuario_id_set_not_null.sql
--   node scripts/apply_sql_file.js           db/migrations/049_parche_upgrades_usuario_id_set_not_null.sql
-- ============================================================================

-- (1) PRECONDICIONES. Bloque unico y deliberadamente NO idempotente-por-omision:
--     aqui no hay nada que omitir en silencio. Mismo criterio que la 048.
DO $mig049$
DECLARE
  v_huerfanas bigint;
BEGIN
  -- (1a) Puerta del predecesor: la 047 creo la columna, la 048 la vueo
  --     obligatoria de hecho. Sin columna, esta migracion no tiene objeto.
  IF NOT EXISTS (
    SELECT 1
      FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name  = 'parche_upgrades'
       AND column_name = 'usuario_id'
  ) THEN
    RAISE EXCEPTION
      '049: public.parche_upgrades.usuario_id NO existe. Esta migracion solo fija NOT NULL sobre una columna previa; sin ella no hay objeto. Aplica antes la 047_parche_upgrades_usuario_inversor.sql. Se aborta en vez de continuar.';
  END IF;

  -- (1b) Precondicion de datos: cero filas sin inversor identificado.
  SELECT count(*) INTO v_huerfanas
    FROM public.parche_upgrades
   WHERE usuario_id IS NULL;

  IF v_huerfanas > 0 THEN
    RAISE EXCEPTION
      '049: public.parche_upgrades tiene % fila(s) con usuario_id IS NULL y SET NOT NULL exige 0. No se borran (ADR-003) ni se rellenan por adivinanza. Diagnostica con scripts/verificar_parche_upgrades_huerfanos.js (exit 1 = huerfanas), repara con UPDATE dirigido y re-corre el verificador hasta exit 0 antes de reintentar esta 049.', v_huerfanas;
  END IF;

  RAISE NOTICE 'migracion 049: precondiciones OK (columna usuario_id presente, % huerfanas)', v_huerfanas;
END
$mig049$;

-- (2) EL CAMBIO. Idempotencia por information_schema (DECISION 2).
--     Guard: si la columna ya es NOT NULL, no-op con NOTICE. Reejecutar esta
--     migracion NO falla nunca por este bloque.
DO $mig049b$
DECLARE
  v_nullable varchar(3);
BEGIN
  SELECT c.is_nullable INTO v_nullable
    FROM information_schema.columns c
   WHERE c.table_schema = 'public'
     AND c.table_name  = 'parche_upgrades'
     AND c.column_name = 'usuario_id';

  IF v_nullable = 'NO' THEN
    RAISE NOTICE 'migracion 049: usuario_id YA es NOT NULL (is_nullable = NO). No-op.';
  ELSE
    -- El ALTER no admite IF NOT EXISTS en Postgres; por eso esta es la
    -- puerta. Con 0 huerfanas verificadas arriba, el cambio es inmediato.
    ALTER TABLE public.parche_upgrades
      ALTER COLUMN usuario_id SET NOT NULL;
    RAISE NOTICE 'migracion 049: NOT NULL aplicado a public.parche_upgrades.usuario_id (is_nullable: % -> NO)', v_nullable;
  END IF;
END
$mig049b$;

-- (3) EVIDENCIA DE QUE EL CHECK DE LA 048 SIGUE VIVO. Read-only: solo
--     comprueba y avisa por NOTICE, no modifica nada. La 049 NO sustituye al
--     CHECK, se suma a el (DECISION 1). Si este NOTICE no aparece, la 048 no
--     esta aplicada y hay que mirarlo antes de seguir.
DO $mig049c$
DECLARE
  v_def text;
  v_ok  boolean;
BEGIN
  SELECT pg_get_constraintdef(c.oid), c.convalidated
    INTO v_def, v_ok
    FROM pg_constraint c
   WHERE c.conrelid = 'public.parche_upgrades'::regclass
     AND c.conname  = 'chk_parche_upgrades_usuario_id_notnull';

  IF v_def IS NULL THEN
    RAISE WARNING '049: NO aparece chk_parche_upgrades_usuario_id_notnull. El NOT NULL de esta migracion queda solo; revisa si la 048 esta realmente aplicada.';
  ELSE
    RAISE NOTICE '049: CHECK de la 048 conservado y validado = %, def = %', v_ok, v_def;
  END IF;
END
$mig049c$;

-- (4) VERIFICACION POST-APLICACION. Read-only, comentada a proposito para que
--     aplicar el fichero no ejecute nada mas alla del NOT NULL. Es lo que
--     devuelve la 049 aplicada:
--
--     $env:NEON_QUERY="SELECT is_nullable FROM information_schema.columns
--                        WHERE table_schema='public' AND table_name='parche_upgrades'
--                          AND column_name='usuario_id'";
--     -> 'NO'   (antes de la 049: 'YES')
--
--     $env:NEON_QUERY="SELECT conname, convalidated, pg_get_constraintdef(oid) AS def
--                        FROM pg_constraint
--                       WHERE conrelid='public.parche_upgrades'::regclass
--                         AND conname='chk_parche_upgrades_usuario_id_notnull'";
--     -> convalidated = true, def = CHECK ((usuario_id IS NOT NULL))
--
--     $env:NEON_QUERY="SELECT count(*) AS filas FROM public.parche_upgrades";
--     -> 0   (la migracion no inserta ni borra nada)
--
--     PRUEBA DE ESCRITURA (23514 -> 23502): el numero que prueba que el
--     NOT NULL es real y no solo una linea de comentario. Con la tabla vacia
--     y sin ensuciarla, dentro de una transaccion con ROLLBACK:
--
--       BEGIN;
--       INSERT INTO public.pandillas (id, nombre) VALUES (gen_random_uuid(), 'prueba-049');
--       INSERT INTO public.parche_upgrades (parche_id, usuario_id, tipo_upgrade, puntos_invertidos)
--       SELECT id, NULL, 'buff_xp_zona', 10 FROM public.pandillas WHERE nombre = 'prueba-049';
--       -- antes de la 049 (solo el CHECK): SQLSTATE 23514 check_violation
--       -- despues de la 049 (NOT NULL):    SQLSTATE 23502 not_null_violation
--       ROLLBACK;
--
-- ============================================================================