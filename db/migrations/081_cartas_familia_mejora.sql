-- ============================================================================
-- Migration 081: cartas - familia mejora (ADR-122 R1). SOLO los dos CHECK.
--   1) chk_cartas_catalogo_familia: 8 valores vigentes -> 9 (+ 'mejora').
--   2) chk_cartas_catalogo_subtipo: 8 ramas vigentes INTACTAS y en su orden
--      + 1 rama nueva al final:
--        (familia = 'mejora' AND subtipo IN ('foto_galeria', 'album_slot',
--                                            'portada_destino'))
--      destacar_evento NO entra (ADR-122 D10: no se vende lo inutilizable).
-- Fecha: 2026-11-14
-- Referencias: ADR-122 (R1: D1 familia novena, D2 subtipos = claves de
--   sumidero, D10 destacar_evento fuera), ADR-003 (cero borrado fisico),
--   ADR-008 (idempotencia), ADR-002 (ASCII-safe), ADR-006 (archivo real).
-- Requiere, YA APLICADAS con fila en schema_migrations:
--   040 (cartas_catalogo), 066 (familia/subtipo + los dos CHECK),
--   076 (los dos CHECK re-escritos a 8 / 8 ramas).
--
-- ALCANCE (F0.1). DDL de dominio puro: NO se toca ninguna fila, NI
--   precio_xp, NI activo, NI su DEFAULT, NI chk_cartas_catalogo_precio.
--   mejora no esta en ('producto','consumible'), luego el CHECK de 066:243
--   ya la deja con precio_xp > 0 o NULL: no requiere cambio (ADR-122 D1).
--   Cero DELETE. Cero UPDATE. Cero cambio de columna.
--
-- DEFINICION REAL LEIDA DE NEON EL 2026-11-14 (pg_get_constraintdef, no
-- memoria; es la de 076, no la de 066):
--   chk_cartas_catalogo_familia = 8 valores: lugar, personaje, artista,
--     marca, producto, consumible, cosmetica, naturaleza
--     (en ese orden, el de 076:193-194).
--   chk_cartas_catalogo_subtipo = 8 ramas: lugar(3), personaje(3), artista(4),
--     marca(4), producto(2), consumible(3), cosmetica(3), naturaleza(2)
--     (orden literal de 076:219-226).
--
-- PRE medido en Neon (2026-11-14, antes de aplicar)
--   familias en cartas_catalogo: artista 1 | consumible 3 | cosmetica 9 |
--     lugar 24 | marca 6 | naturaleza 10 | personaje 8 | producto 4
--     (total 65). familia='mejora' = 0 filas.
--   ledger: 80 aplicada (080_cartas_apagar_prueba_d34.sql) es la ultima.
--
-- POST esperado
--   familia: 9 valores con 'mejora' al final.
--   subtipo: 8 ramas intactas + rama mejora/3 subtipos. destacar_evento
--     ausente de las dos definiciones.
--   filas: 65 y CERO con familia='mejora' (el seed es 082 y es de
--     @data-migration; esta migracion no escribe filas).
--   precio_xp / activo / DEFAULT de activo: sin tocar (no se nombran).
--
-- IDEMPOTENCIA (ADR-008)
--   - Guarda por CHECK: si la definicion ya nombra 'mejora' (familia) o ya
--     nombra 'mejora' Y los 3 subtipos comprables (subtipo), NOTICE y no-op.
--   - DROP CONSTRAINT + ADD CONSTRAINT viven en el MISMO bloque DO: un DO es
--     UNA sentencia, luego UNA transaccion. No hay ventana observable sin
--     CHECK de dominio (mismo patron que 076:181-233).
--   - Re-ejecutar deja el estado identico: 0 cambios de dato posibles porque
--     el fichero no escribe datos.
--
-- ROLLBACK (documentado, NO se ejecuta; revertir un CHECK exige comprobar
--   antes que no existan filas de la familia retirada)
--   -- BEGIN;
--   -- ALTER TABLE public.cartas_catalogo
--   --   DROP CONSTRAINT chk_cartas_catalogo_subtipo;
--   -- ALTER TABLE public.cartas_catalogo ADD CONSTRAINT
--   --   chk_cartas_catalogo_subtipo CHECK ( ... 8 ramas de 076:219-226 ... );
--   -- ALTER TABLE public.cartas_catalogo
--   --   DROP CONSTRAINT chk_cartas_catalogo_familia;
--   -- ALTER TABLE public.cartas_catalogo ADD CONSTRAINT
--   --   chk_cartas_catalogo_familia CHECK (familia IN ( ... 8 de 076 ... ));
--   -- COMMIT;
--   -- DELETE FROM schema_migrations WHERE numero = 81;  (evidencia: NO tocar)
--
-- NOTA: este fichero NO escribe schema_migrations; lo hace el runner
--   (scripts/apply_sql_file.js), contrato de la 045.
-- ============================================================================

-- (0) PRE: precondiciones de esquema, fail-closed ----------------------------
DO $mig081pre$
DECLARE
  v_fam   text;
  v_sub   text;
  v_falta text := '';
  v_lit   text;
BEGIN
  IF to_regclass('public.cartas_catalogo') IS NULL THEN
    RAISE EXCEPTION 'MIG081 ABORTA: falta la tabla public.cartas_catalogo (040)';
  END IF;

  SELECT pg_get_constraintdef(oid) INTO v_fam
    FROM pg_constraint
   WHERE conrelid = 'public.cartas_catalogo'::regclass
     AND conname  = 'chk_cartas_catalogo_familia';
  IF v_fam IS NULL THEN
    RAISE EXCEPTION 'MIG081 ABORTA: falta chk_cartas_catalogo_familia (066)';
  END IF;

  SELECT pg_get_constraintdef(oid) INTO v_sub
    FROM pg_constraint
   WHERE conrelid = 'public.cartas_catalogo'::regclass
     AND conname  = 'chk_cartas_catalogo_subtipo';
  IF v_sub IS NULL THEN
    RAISE EXCEPTION 'MIG081 ABORTA: falta chk_cartas_catalogo_subtipo (066)';
  END IF;

  -- Los 8 valores de 076 tienen que estar ANTES de sustituir: si falta uno,
  -- la definicion viva no es la que este fichero copia y se aborta.
  FOREACH v_lit IN ARRAY ARRAY['lugar', 'personaje', 'artista', 'marca',
                               'producto', 'consumible', 'cosmetica',
                               'naturaleza']
  LOOP
    IF position('''' || v_lit || '''' IN v_fam) = 0 THEN
      v_falta := v_falta || ' ' || v_lit;
    END IF;
  END LOOP;
  IF v_falta <> '' THEN
    RAISE EXCEPTION 'MIG081 ABORTA: familia viva sin los 8 valores de 076, faltan:%', v_falta;
  END IF;

  -- Las 8 ramas de 076 tienen que estar antes de anadir la novena. Se busca el
  -- literal ENTRE COMILLAS porque pg_get_constraintdef normaliza la rama a
  -- ((familia)::text = 'lugar'::text): buscar 'familia = ' daria un falso
  -- negativo y abortaria una migracion correcta.
  v_falta := '';
  FOREACH v_lit IN ARRAY ARRAY['lugar', 'personaje', 'artista', 'marca',
                               'producto', 'consumible', 'cosmetica',
                               'naturaleza']
  LOOP
    IF position('''' || v_lit || '''' IN v_sub) = 0 THEN
      v_falta := v_falta || ' ' || v_lit;
    END IF;
  END LOOP;
  IF v_falta <> '' THEN
    RAISE EXCEPTION 'MIG081 ABORTA: subtipo vivo sin las 8 ramas de 076, faltan:%', v_falta;
  END IF;

  RAISE NOTICE 'MIG081 PRE OK: 8 familias y 8 ramas de 076 presentes';
END
$mig081pre$;

-- (1) chk_cartas_catalogo_familia: 8 valores + 'mejora' ---------------------
--     Se reproduce la definicion vigente sin reordenar ni simplificar: los 8
--     literales en su orden de 076:193-194 y el nuevo al final. DROP + ADD en
--     el MISMO DO: no existe ventana sin CHECK de dominio visible a otra
--     sesion.
DO $mig081fam$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'public.cartas_catalogo'::regclass
       AND conname  = 'chk_cartas_catalogo_familia'
       AND pg_get_constraintdef(oid) NOT LIKE '%mejora%'
  ) THEN
    ALTER TABLE public.cartas_catalogo
      DROP CONSTRAINT chk_cartas_catalogo_familia;
    ALTER TABLE public.cartas_catalogo
      ADD CONSTRAINT chk_cartas_catalogo_familia
      CHECK (familia IN ('lugar', 'personaje', 'artista', 'marca', 'producto',
                         'consumible', 'cosmetica', 'naturaleza', 'mejora'));
    RAISE NOTICE 'MIG081: chk_cartas_catalogo_familia sustituido (9 valores)';
  ELSE
    RAISE NOTICE 'MIG081: chk_cartas_catalogo_familia ya nombra mejora (no-op)';
  END IF;
END
$mig081fam$;

-- (2) chk_cartas_catalogo_subtipo: 8 ramas intactas + rama mejora -----------
--     Se copian literalmente las 8 ramas de 076:219-226 en su orden y se
--     anade UNA rama al final. destacar_evento NO se incluye (D10).
--     Guarda: la definicion tiene que nombrar 'mejora' Y los 3 subtipos
--     comprables. Con uno de los cuatro fuera, se sustituye (una rama a
--     medias no es un CHECK nuevo).
DO $mig081sub$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'public.cartas_catalogo'::regclass
       AND conname  = 'chk_cartas_catalogo_subtipo'
       AND NOT (pg_get_constraintdef(oid) LIKE '%mejora%'
                AND pg_get_constraintdef(oid) LIKE '%foto_galeria%'
                AND pg_get_constraintdef(oid) LIKE '%album_slot%'
                AND pg_get_constraintdef(oid) LIKE '%portada_destino%')
  ) THEN
    ALTER TABLE public.cartas_catalogo
      DROP CONSTRAINT chk_cartas_catalogo_subtipo;
    ALTER TABLE public.cartas_catalogo
      ADD CONSTRAINT chk_cartas_catalogo_subtipo
      CHECK (
        (familia = 'lugar' AND subtipo IN ('territorio', 'patrimonio', 'natural'))
        OR (familia = 'personaje' AND subtipo IN ('historico', 'ficcion', 'folclor'))
        OR (familia = 'artista' AND subtipo IN ('musica', 'cine', 'grafica', 'literatura'))
        OR (familia = 'marca' AND subtipo IN ('licor', 'gastronomia', 'artesania', 'otra'))
        OR (familia = 'producto' AND subtipo IN ('fisico', 'digital'))
        OR (familia = 'consumible' AND subtipo IN ('entrada_evento', 'bono', 'servicio'))
        OR (familia = 'cosmetica' AND subtipo IN ('marco', 'fondo', 'insignia'))
        OR (familia = 'naturaleza' AND subtipo IN ('flora', 'fauna'))
        OR (familia = 'mejora' AND subtipo IN ('foto_galeria', 'album_slot', 'portada_destino'))
      );
    RAISE NOTICE 'MIG081: chk_cartas_catalogo_subtipo sustituido (+ rama mejora)';
  ELSE
    RAISE NOTICE 'MIG081: chk_cartas_catalogo_subtipo ya mapea mejora (no-op)';
  END IF;
END
$mig081sub$;

-- (3) POST: tripwires fail-closed -------------------------------------------
--     - familia: los 9 literales, cada uno EXACTAMENTE una vez.
--     - subtipo: los 27 literales de las 9 ramas, cada uno EXACTAMENTE una
--       vez (con comillas para que 'natural' no cuente dentro de 'naturaleza').
--     - 'destacar_evento' AUSENTE de las dos definiciones (D10).
--     - 0 filas con familia='mejora' (el seed es 082).
DO $mig081post$
DECLARE
  v_fam   text;
  v_sub   text;
  v_lit   text;
  v_q     text;
  v_n     integer;
  v_mej   integer;
BEGIN
  SELECT pg_get_constraintdef(oid) INTO v_fam
    FROM pg_constraint
   WHERE conrelid = 'public.cartas_catalogo'::regclass
     AND conname  = 'chk_cartas_catalogo_familia';
  IF v_fam IS NULL THEN
    RAISE EXCEPTION 'MIG081 POST: no existe chk_cartas_catalogo_familia';
  END IF;

  SELECT pg_get_constraintdef(oid) INTO v_sub
    FROM pg_constraint
   WHERE conrelid = 'public.cartas_catalogo'::regclass
     AND conname  = 'chk_cartas_catalogo_subtipo';
  IF v_sub IS NULL THEN
    RAISE EXCEPTION 'MIG081 POST: no existe chk_cartas_catalogo_subtipo';
  END IF;

  FOREACH v_lit IN ARRAY ARRAY['lugar', 'personaje', 'artista', 'marca',
                               'producto', 'consumible', 'cosmetica',
                               'naturaleza', 'mejora']
  LOOP
    v_q := '''' || v_lit || '''';
    v_n := (length(v_fam) - length(replace(v_fam, v_q, ''))) / length(v_q);
    IF v_n <> 1 THEN
      RAISE EXCEPTION 'MIG081 POST: el literal % aparece % vez/veces en familia (se espera 1)', v_lit, v_n;
    END IF;
  END LOOP;

  FOREACH v_lit IN ARRAY ARRAY['territorio', 'patrimonio', 'natural',
                               'historico', 'ficcion', 'folclor',
                               'musica', 'cine', 'grafica', 'literatura',
                               'licor', 'gastronomia', 'artesania', 'otra',
                               'fisico', 'digital',
                               'entrada_evento', 'bono', 'servicio',
                               'marco', 'fondo', 'insignia',
                               'flora', 'fauna',
                               'foto_galeria', 'album_slot', 'portada_destino']
  LOOP
    v_q := '''' || v_lit || '''';
    v_n := (length(v_sub) - length(replace(v_sub, v_q, ''))) / length(v_q);
    IF v_n <> 1 THEN
      RAISE EXCEPTION 'MIG081 POST: el literal % aparece % vez/veces en subtipo (se espera 1)', v_lit, v_n;
    END IF;
  END LOOP;

  IF position('destacar_evento' IN v_fam) > 0
     OR position('destacar_evento' IN v_sub) > 0 THEN
    RAISE EXCEPTION 'MIG081 POST: destacar_evento aparece en un CHECK; D10 lo prohibe';
  END IF;

  SELECT count(*) INTO v_mej
    FROM public.cartas_catalogo
   WHERE familia = 'mejora';
  IF v_mej <> 0 THEN
    RAISE EXCEPTION 'MIG081 POST: % fila(s) con familia=mejora; esta migracion no siembra (082)', v_mej;
  END IF;

  RAISE NOTICE 'MIG081 POST OK: familia 9 valores, subtipo 9 ramas, 0 filas mejora';
END
$mig081post$;
