-- ============================================================================
-- Migration 076: cartas_catalogo - FAMILIA 'naturaleza' (flora y fauna)
--   Enmienda ADR-121: 7 familias -> 8. SOLO ESQUEMA: cero filas escritas,
--   cero columnas nuevas, cero datos.
-- Fecha: 2026-11-11
-- Referencias: ADR-121, ADR-002 (ASCII-safe), ADR-003 (cero borrado logico),
--   ADR-006 (el archivo real manda), ADR-008 (idempotencia).
-- Requiere, YA APLICADAS y con fila valida en schema_migrations:
--   045 (ledger; lo exige el runner), 060 (stats_json/fusionable),
--   066 (familia/subtipo + chk_cartas_catalogo_familia/_subtipo),
--   068 (precio_xp numeric(12,2)), 069 (familia NOT NULL),
--   075 (predecesor INMEDIATO en el directorio).
-- Contrato: docs/superpowers/specs/2026-11-11-cartas-familias-stats-supply-design.md
--   seccion 11.11 (11.11.1, 11.11.2, 11.11.5 reglas 5.1-5.7).
--
-- QUE HACE (3 operaciones, DROP + ADD dentro del mismo DO = atomico)
--   1. chk_cartas_catalogo_familia: 7 valores + 'naturaleza' (8).
--   2. chk_cartas_catalogo_subtipo: 7 ramas intactas + rama nueva
--      (familia = 'naturaleza' AND subtipo IN ('flora', 'fauna')).
--   3. chk_cartas_catalogo_naturaleza (NUEVA): subtipo obligatorio y
--      stats_json ? 'nombre_cientifico' para la familia nueva. Es un hecho duro
--      (un binomial no se revisa cada ano) y por eso lleva CHECK; estado_iucn
--      NO lo lleva (regla 6.2).
--
-- QUE NO HACE (deliberado)
--   - NO toca chk_cartas_catalogo_stats: 'presencia' ya esta admitida en sus
--     dos clausulas (066:345-349 y :351-354). Se verifica en el POST como
--     tripwire de que nadie lo reescribio.
--   - NO toca chk_cartas_catalogo_precio: familia NOT IN ('producto',
--     'consumible') exige precio_xp IS NULL OR precio_xp > 0. 'naturaleza' cae
--     en ese grupo igual que 'lugar', luego 0 sigue fallando (23514) y 150 pasa.
--     VERIFICADO leyendo la definicion viva antes de escribir esta migracion.
--   - NO toca chk_cartas_catalogo_sku (regla 5.6): una migracion, un proposito.
--     'naturaleza' no es 'producto', el CHECK no la mira.
--   - NO toca chk_cartas_catalogo_no_fusion_cosmetica ni _fusionable: la
--     familia nueva no esta en esas ramas.
--   - NO amplia familia varchar(12): 'naturaleza' mide 10 y cabe. Un
--     ALTER COLUMN TYPE reescribe la tabla y no compra nada.
--   - NO siembra: las 10 cartas son la 077, no esta.
--
-- PRE (definiciones VIVAS de pg_get_constraintdef antes de 076, 2026-11-11)
--   chk_cartas_catalogo_familia:
--     CHECK (familia IN ('lugar', 'personaje', 'artista', 'marca', 'producto',
--                        'consumible', 'cosmetica'))
--   chk_cartas_catalogo_subtipo:
--     CHECK (
--       (familia = 'lugar'     AND subtipo IN ('territorio','patrimonio','natural'))
--       OR (familia = 'personaje' AND subtipo IN ('historico','ficcion','folclor'))
--       OR (familia = 'artista'   AND subtipo IN ('musica','cine','grafica','literatura'))
--       OR (familia = 'marca'     AND subtipo IN ('licor','gastronomia','artesania','otra'))
--       OR (familia = 'producto'  AND subtipo IN ('fisico','digital'))
--       OR (familia = 'consumible' AND subtipo IN ('entrada_evento','bono','servicio'))
--       OR (familia = 'cosmetica' AND subtipo IN ('marco','fondo','insignia'))
--     )
--   chk_cartas_catalogo_precio: (familia IN ('producto','consumible') AND
--     precio_xp IS NULL) OR (familia NOT IN ('producto','consumible') AND
--     (precio_xp IS NULL OR precio_xp > 0))   -> naturaleza = grupo "> 0"
--   pg_constraint sobre cartas_catalogo: 16 filas.
--   count(*) WHERE familia = 'naturaleza': 0.  Total de cartas: 45.
--   Foto PRE del catalogo (id|familia|subtipo|precio_xp, orden id):
--     md5 = 73548398ac7d30f82dcf458b505dee82  (n = 45)
--
-- POST (lo comprueba el bloque final, fail-closed)
--   3 conname presentes (familia, subtipo, naturaleza).
--   familia nombra los 8 literales; subtipo nombra 'flora' y 'fauna'.
--   chk_cartas_catalogo_stats sigue nombrando 'presencia' y chk_..._precio
--   sigue exigiendo "> 0": cero cambio colateral.
--   count(*) WHERE familia = 'naturaleza' = 0 (076 no siembra; se emite como
--   NOTICE y NO como EXCEPTION para que un re-run posterior a la 077 siga
--   siendo no-op en vez de abortar por un dato que siembra otra migracion).
--   pg_constraint sobre cartas_catalogo: 17 filas (+1, solo la de arriba).
--
-- IDEMPOTENCIA (ADR-008)
--   La guarda es por DEFINICION (pg_get_constraintdef), no por nombre: con
--   "IF NOT EXISTS (conname)" el CHECK existente nunca se sustituiria y la
--   migracion mentiria diciendo que corrio (leccion literal de 066:302-311).
--   Segunda corrida: las 3 guardas se saltan, 0 DDL, pg_constraint conserva
--   una fila por nombre y el POST vuelve a pasar.
--   ADD CONSTRAINT no admite IF NOT EXISTS en Postgres 15: no se usa.
--
-- COMO SE APLICA (PowerShell, desde la raiz del repo)
--   node scripts/apply_sql_file.js db/migrations/076_cartas_familia_naturaleza.sql --dry-run
--   node scripts/apply_sql_file.js db/migrations/076_cartas_familia_naturaleza.sql --notas "familia naturaleza (esquema)"
--   La fila del ledger (076, 'aplicada') la pone el runner, no este SQL.
--
-- ROLLBACK (comentado, NO ejecutar desde el runner; solo esquema, cero datos)
--   Revertir 076 = volver a las 2 definiciones de arriba y borrar la tercera.
--   Fallara si ya existe alguna carta de la familia (077): entonces la
--   reversion correcta es una migracion nueva, no un DROP a ciegas.
--   BEGIN;
--     ALTER TABLE public.cartas_catalogo
--       DROP CONSTRAINT IF EXISTS chk_cartas_catalogo_naturaleza;
--     ALTER TABLE public.cartas_catalogo
--       DROP CONSTRAINT IF EXISTS chk_cartas_catalogo_familia;
--     ALTER TABLE public.cartas_catalogo
--       ADD CONSTRAINT chk_cartas_catalogo_familia
--       CHECK (familia IN ('lugar', 'personaje', 'artista', 'marca', 'producto',
--                          'consumible', 'cosmetica'));
--     ALTER TABLE public.cartas_catalogo
--       DROP CONSTRAINT IF EXISTS chk_cartas_catalogo_subtipo;
--     ALTER TABLE public.cartas_catalogo
--       ADD CONSTRAINT chk_cartas_catalogo_subtipo
--       CHECK (
--         (familia = 'lugar' AND subtipo IN ('territorio', 'patrimonio', 'natural'))
--         OR (familia = 'personaje' AND subtipo IN ('historico', 'ficcion', 'folclor'))
--         OR (familia = 'artista' AND subtipo IN ('musica', 'cine', 'grafica', 'literatura'))
--         OR (familia = 'marca' AND subtipo IN ('licor', 'gastronomia', 'artesania', 'otra'))
--         OR (familia = 'producto' AND subtipo IN ('fisico', 'digital'))
--         OR (familia = 'consumible' AND subtipo IN ('entrada_evento', 'bono', 'servicio'))
--         OR (familia = 'cosmetica' AND subtipo IN ('marco', 'fondo', 'insignia'))
--       );
--   ROLLBACK;
--   La fila del ledger NO se borra (ADR-003: es la unica evidencia de que 076
--   corrio). Si hay que anularla, se corrige con una migracion nueva y una
--   nota en el ledger, nunca con un borrado fisico.
-- ============================================================================

-- (0) PRECONDICIONES: fail-closed, sin tocar nada -----------------------------
DO $mig076pre$
DECLARE
  v_len integer;
  v_nn  text;
  v_nat integer;
  v_mal integer;
BEGIN
  SELECT character_maximum_length INTO v_len
    FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'cartas_catalogo'
     AND column_name = 'familia';
  IF v_len IS NULL THEN
    RAISE EXCEPTION 'MIG076: falta cartas_catalogo.familia (066)';
  END IF;
  IF v_len < char_length('naturaleza') THEN
    RAISE EXCEPTION 'MIG076: familia es varchar(%) y el slug mide % bytes',
      v_len, char_length('naturaleza');
  END IF;

  SELECT is_nullable INTO v_nn
    FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'cartas_catalogo'
     AND column_name = 'stats_json';
  IF v_nn IS NULL THEN
    RAISE EXCEPTION 'MIG076: falta cartas_catalogo.stats_json (060)';
  END IF;
  IF v_nn <> 'NO' THEN
    RAISE EXCEPTION 'MIG076: stats_json es NULLABLE; el CHECK de la regla 5.5 asumiria que no lo es';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                  WHERE conrelid = 'public.cartas_catalogo'::regclass
                    AND conname = 'chk_cartas_catalogo_familia') THEN
    RAISE EXCEPTION 'MIG076: falta chk_cartas_catalogo_familia (066)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                  WHERE conrelid = 'public.cartas_catalogo'::regclass
                    AND conname = 'chk_cartas_catalogo_subtipo') THEN
    RAISE EXCEPTION 'MIG076: falta chk_cartas_catalogo_subtipo (066)';
  END IF;

  SELECT count(*) INTO v_nat FROM cartas_catalogo WHERE familia = 'naturaleza';
  RAISE NOTICE 'MIG076 PRE: familia=varchar(%), naturaleza=%, filas naturaleza=%',
    v_len, char_length('naturaleza'), v_nat;

  -- Si algun dia la familia ya tuviera filas (077), se valida ANTES de
  -- cambiar los CHECK para no dejar el ALTER a medias con 23514.
  SELECT count(*) INTO v_mal
    FROM cartas_catalogo
   WHERE familia = 'naturaleza'
     AND (subtipo IS NULL OR subtipo NOT IN ('flora', 'fauna')
          OR NOT (stats_json ? 'nombre_cientifico'));
  IF v_mal > 0 THEN
    RAISE EXCEPTION 'MIG076: % fila(s) de naturaleza no cumplen subtipo flora/fauna + stats_json.nombre_cientifico', v_mal;
  END IF;
END
$mig076pre$;

-- (1) chk_cartas_catalogo_familia: 7 valores + 'naturaleza' -------------------
--     Se reproduce la definicion vigente sin reordenar ni simplificar: los 7
--     literales en su orden de 066:219-220 y el nuevo al final. DROP + ADD en
--     el MISMO DO: no existe ventana sin CHECK de dominio visible a otra sesion.
DO $mig076fam$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'public.cartas_catalogo'::regclass
       AND conname  = 'chk_cartas_catalogo_familia'
       AND pg_get_constraintdef(oid) NOT LIKE '%naturaleza%'
  ) THEN
    ALTER TABLE public.cartas_catalogo
      DROP CONSTRAINT chk_cartas_catalogo_familia;
    ALTER TABLE public.cartas_catalogo
      ADD CONSTRAINT chk_cartas_catalogo_familia
      CHECK (familia IN ('lugar', 'personaje', 'artista', 'marca', 'producto',
                         'consumible', 'cosmetica', 'naturaleza'));
    RAISE NOTICE 'MIG076: chk_cartas_catalogo_familia sustituido (8 valores)';
  ELSE
    RAISE NOTICE 'MIG076: chk_cartas_catalogo_familia ya nombra naturaleza (no-op)';
  END IF;
END
$mig076fam$;

-- (2) chk_cartas_catalogo_subtipo: 7 ramas intactas + rama naturaleza --------
--     Guarda: la definicion tiene que nombrar 'naturaleza' Y 'flora'. Con una
--     sola de las dos, se sustituye (una rama a medias no es un CHECK nuevo).
DO $mig076sub$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'public.cartas_catalogo'::regclass
       AND conname  = 'chk_cartas_catalogo_subtipo'
       AND NOT (pg_get_constraintdef(oid) LIKE '%naturaleza%'
                AND pg_get_constraintdef(oid) LIKE '%flora%')
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
      );
    RAISE NOTICE 'MIG076: chk_cartas_catalogo_subtipo sustituido (+ flora/fauna)';
  ELSE
    RAISE NOTICE 'MIG076: chk_cartas_catalogo_subtipo ya mapea naturaleza (no-op)';
  END IF;
END
$mig076sub$;

-- (3) chk_cartas_catalogo_naturaleza (NUEVA) --------------------------------
--     subtipo es NULLABLE (066:126) y un CHECK de igualdad con NULL no
--     dispara: por eso esta clausula pide subtipo IS NOT NULL de forma
--     explicita. stats_json es jsonb NOT NULL DEFAULT '{}' (060:254), asi que
--     el operador ? nunca devuelve NULL: se escribe SIN COALESCE para no
--     sugerir que la columna puede ser nula (regla 5.5).
DO $mig076nat$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'public.cartas_catalogo'::regclass
       AND conname  = 'chk_cartas_catalogo_naturaleza'
  ) THEN
    ALTER TABLE public.cartas_catalogo
      ADD CONSTRAINT chk_cartas_catalogo_naturaleza
      CHECK (familia <> 'naturaleza'
             OR (subtipo IS NOT NULL
                 AND stats_json ? 'nombre_cientifico'));
    RAISE NOTICE 'MIG076: chk_cartas_catalogo_naturaleza creado';
  ELSE
    RAISE NOTICE 'MIG076: chk_cartas_catalogo_naturaleza ya existe (no-op)';
  END IF;
END
$mig076nat$;

-- (4) POST: tripwires fail-closed -------------------------------------------
DO $mig076post$
DECLARE
  v_def   text;
  v_falta text := '';
  v_lit   text;
  v_nat   integer;
  v_cons  integer;
BEGIN
  SELECT count(*) INTO v_cons
    FROM pg_constraint WHERE conrelid = 'public.cartas_catalogo'::regclass;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                  WHERE conrelid = 'public.cartas_catalogo'::regclass
                    AND conname = 'chk_cartas_catalogo_naturaleza') THEN
    RAISE EXCEPTION 'MIG076: no existe chk_cartas_catalogo_naturaleza';
  END IF;

  SELECT pg_get_constraintdef(oid) INTO v_def
    FROM pg_constraint
   WHERE conrelid = 'public.cartas_catalogo'::regclass
     AND conname = 'chk_cartas_catalogo_familia';
  IF v_def IS NULL THEN
    RAISE EXCEPTION 'MIG076: no existe chk_cartas_catalogo_familia';
  END IF;
  FOREACH v_lit IN ARRAY ARRAY['lugar', 'personaje', 'artista', 'marca',
                               'producto', 'consumible', 'cosmetica', 'naturaleza']
  LOOP
    IF v_def NOT LIKE '%' || v_lit || '%' THEN
      v_falta := v_falta || ' ' || v_lit;
    END IF;
    IF (length(v_def) - length(replace(v_def, v_lit, ''))) / length(v_lit)
       <> 1 THEN
      RAISE EXCEPTION 'MIG076: el literal % aparece mas de una vez en familia', v_lit;
    END IF;
  END LOOP;
  IF v_falta <> '' THEN
    RAISE EXCEPTION 'MIG076: familia sin los 8 valores, faltan:%', v_falta;
  END IF;

  SELECT pg_get_constraintdef(oid) INTO v_def
    FROM pg_constraint
   WHERE conrelid = 'public.cartas_catalogo'::regclass
     AND conname = 'chk_cartas_catalogo_subtipo';
  IF v_def IS NULL THEN
    RAISE EXCEPTION 'MIG076: no existe chk_cartas_catalogo_subtipo';
  END IF;
  IF v_def NOT LIKE '%naturaleza%' OR v_def NOT LIKE '%flora%'
     OR v_def NOT LIKE '%fauna%' THEN
    RAISE EXCEPTION 'MIG076: subtipo no mapea naturaleza -> flora/fauna';
  END IF;
  -- Las 7 ramas viejas siguen ahi (un literal representativo por familia).
  FOREACH v_lit IN ARRAY ARRAY['territorio', 'historico', 'literatura',
                               'artesania', 'digital', 'entrada_evento', 'insignia']
  LOOP
    IF v_def NOT LIKE '%' || v_lit || '%' THEN
      RAISE EXCEPTION 'MIG076: subtipo perdio la rama de %', v_lit;
    END IF;
  END LOOP;

  -- Cero cambio colateral: stats conserva 'presencia'; precio sigue "> 0".
  SELECT pg_get_constraintdef(oid) INTO v_def
    FROM pg_constraint
   WHERE conrelid = 'public.cartas_catalogo'::regclass
     AND conname = 'chk_cartas_catalogo_stats';
  IF v_def IS NULL OR v_def NOT LIKE '%presencia%' THEN
    RAISE EXCEPTION 'MIG076: chk_cartas_catalogo_stats cambio (sin presencia)';
  END IF;

  SELECT pg_get_constraintdef(oid) INTO v_def
    FROM pg_constraint
   WHERE conrelid = 'public.cartas_catalogo'::regclass
     AND conname = 'chk_cartas_catalogo_precio';
  IF v_def IS NULL OR v_def NOT LIKE '%> (0)%' THEN
    RAISE EXCEPTION 'MIG076: chk_cartas_catalogo_precio cambio (sin "> 0")';
  END IF;

  SELECT count(*) INTO v_nat FROM cartas_catalogo WHERE familia = 'naturaleza';
  RAISE NOTICE 'MIG076 POST OK: constraints=% filas naturaleza=% (0 esperado: 076 no siembra)',
    v_cons, v_nat;
END
$mig076post$;
