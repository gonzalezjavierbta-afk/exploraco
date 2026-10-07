-- ============================================================================
-- 053_busqueda_normalizada.sql
--
-- NOTA DE NOMBRE: ADR-090 llama a esta migracion
--   053_busqueda_unificada_columnas_normalizadas.sql
-- Este fichero es ESA MISMA migracion 053, con el nombre corto que fija el
-- encargo T3a. El numero (053) y el contenido son los del ADR.
--
-- QUE HACE, EN UNA FRASE
--   Crea el normalizador canonico de busqueda exploraco_norm(text) (UNICO
--   origen de verdad, IMMUTABLE, NFD-equivalente) + la funcion de trigramas
--   exploraco_trgm(text), anade a destinos las 7 columnas normalizadas de
--   ADR-090 D2, las mantiene por trigger, hace el backfill idempotente y crea
--   los 6 indices de D3 (todos parciales WHERE status='published').
--
-- ADR / DECISIONES QUE RESPETA (tal cual, no se reabren)
--   ADR-090 D1: tolerancia a typos por columna text[] de trigramas + GIN de
--     array (operador &&), SIN pg_trgm. exploraco_trgm normaliza con
--     exploraco_norm, paddea dos espacios por delante y uno por detras y
--     emite las ventanas deslizantes de 3 caracteres, unicas y ordenadas.
--   ADR-090 D2: 7 columnas TEXT salvo search_trgm (text[]), TODAS nullable
--     en esta primera pasada. tags_norm materializa TODOS los valores
--     textuales de tags SIN deny-list: la deny-list vive en busqueda.js en
--     TIEMPO DE CONSULTA, jamas aqui (decision del operador).
--   ADR-090 D3: 6 indices, TODOS parciales WHERE status='published'.
--   ADR-058: la emulacion de unaccent por translate() es el precedente; aqui se
--     amplia a TODO el rango latin precompuesto con descomposicion canonica,
--     que es exactamente lo que strip-ea el normGeo JS (NFD + [\u0300-\u036f]).
--   ADR-003: Cero Borrado Logico. tags NUNCA se reescribe; tags_norm es una
--     vista materializada de LECTURA derivada.
--   ADR-002: ASCII-safe. Cero bytes > 127 en el fichero: los diacriticos se
--     escriben como escapes Unicode U&'\XXXX', nunca como bytes directos.
--   ADR-008: idempotente. CREATE OR REPLACE / IF NOT EXISTS / backfill con
--     guarda de NULL -> re-ejecutar el archivo COMPLETO es no-op funcional.
--   ADR-006: el esquema real manda. Columnas de destinos verificadas contra
--     information_schema antes de escribir (ver PREFLIGHT).
--
-- PREDECESORA / ESTADO DEL LEDGER (MEDIDO 2026-10-07, no memoria)
--   Ultima fila real de schema_migrations: numero 51, max(numero)=51 (49 filas,
--   de 003 a 051). La 052 (052_backfill_media_rep_autores_resolver_media_item.sql)
--   esta en disco pero NO tiene fila: su cabecera la declara
--   VERIFICADA-NO-NECESARIA / NO APLICADA AL LEDGER. Consecuencia MECANICA:
--   scripts/apply_sql_file.js exige que N-1 (52) exista en disco Y tenga fila
--   valida; como la 052 no la tiene, su puerta de predecesor RECHAZA la 053.
--   Esta migracion NO toca esa decision: la deja escrita para que el operador
--   la resuelva (sembrar la fila de la 052 como historico_no_verificado o
--   reordenar), que es una operacion sobre schema_migrations, fuera del DDL de
--   la 053 y fuera del alcance de T3a.
--
-- CARACTER
--   Aditiva. Sin DELETE, sin TRUNCATE, sin DROP de datos. Un unico DELETE no
--   existe aqui. Forward-only.
--
-- ROLLBACK (emergencia; LOSSY: borra las columnas y sus indices)
--   DROP TRIGGER IF EXISTS trg_destinos_busqueda_norm ON public.destinos;
--   DROP FUNCTION IF EXISTS public.destinos_busqueda_norm_fn();
--   DROP INDEX IF EXISTS public.idx_destinos_nombre_norm_prefix;
--   DROP INDEX IF EXISTS public.idx_destinos_ciudad_norm;
--   DROP INDEX IF EXISTS public.idx_destinos_search_trgm;
--   DROP INDEX IF EXISTS public.idx_destinos_search_fts;
--   DROP INDEX IF EXISTS public.idx_destinos_geo_bbox;
--   DROP INDEX IF EXISTS public.idx_destinos_categoria_rating;
--   ALTER TABLE public.destinos DROP COLUMN IF EXISTS nombre_norm;
--   ALTER TABLE public.destinos DROP COLUMN IF EXISTS ciudad_norm;
--   ALTER TABLE public.destinos DROP COLUMN IF EXISTS region_norm;
--   ALTER TABLE public.destinos DROP COLUMN IF EXISTS barrio_norm;
--   ALTER TABLE public.destinos DROP COLUMN IF EXISTS tags_norm;
--   ALTER TABLE public.destinos DROP COLUMN IF EXISTS search_norm;
--   ALTER TABLE public.destinos DROP COLUMN IF EXISTS search_trgm;
--   DROP FUNCTION IF EXISTS public.exploraco_trgm(text);
--   DROP FUNCTION IF EXISTS public.exploraco_norm(text);
--   No va en el flujo normal. No hay datos que respaldar: todo es derivado.
-- ============================================================================

-- ============================================================================
-- 0. PREFLIGHT (solo lectura; aborta con un mensaje claro si falta el objeto).
--    Re-ejecutar la migracion lo vuelve a correr sin efecto.
-- ============================================================================
DO $mig053pre$
DECLARE
  v_faltan text;
BEGIN
  IF to_regclass('public.destinos') IS NULL THEN
    RAISE EXCEPTION
      '053: public.destinos NO existe. Esta migracion solo anade columnas a destinos. Se aborta.';
  END IF;

  SELECT string_agg(c.nombre, ', ')
    INTO v_faltan
    FROM (VALUES
      ('nombre'), ('ciudad'), ('region'), ('barrio'), ('tags'),
      ('status'), ('lat'), ('lng'), ('categoria_slug'), ('rating')
    ) AS c(nombre)
   WHERE NOT EXISTS (
     SELECT 1 FROM information_schema.columns ic
      WHERE ic.table_schema = 'public' AND ic.table_name = 'destinos'
        AND ic.column_name = c.nombre
   );

  IF v_faltan IS NOT NULL THEN
    RAISE EXCEPTION
      '053: a public.destinos le faltan columnas requeridas: %. Esquema inesperado; se aborta.',
      v_faltan;
  END IF;

  RAISE NOTICE 'migracion 053: preflight OK (destinos y sus columnas requeridas presentes)';
END
$mig053pre$;

-- ============================================================================
-- 1. NORMALIZADOR UNICO Y CANONICO: public.exploraco_norm(text) -> text
--    Semantica NFD-equivalente de normGeo (api/interacciones.js): lower +
--    descomposicion + eliminacion de diacriticos + [^a-z0-9 ]->espacio +
--    colapso de espacios + trim. La descomposicion se emula con translate()
--    sobre TODO el rango latin precompuesto con descomposicion canonica
--    (00C0-024F y 1E00-1EFF); los caracteres que NFD NO descompone (O-barra,
--    ae, eth, thorn, sharp-s, etc.) se dejan fuera y caen al filtro
--    [^a-z0-9 ] igual que en JS. NO es STRICT: exploraco_norm(NULL) -> ''
--    (paridad con normGeo(null) === '').
-- ============================================================================
CREATE OR REPLACE FUNCTION public.exploraco_norm(p text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $mig053norm$
  SELECT btrim(
           regexp_replace(
             regexp_replace(
               lower(
                 translate(
                   COALESCE(p, ''),
                                      U&'\00C0\00C1\00C2\00C3\00C4\00C5\00C7\00C8\00C9\00CA\00CB\00CC\00CD\00CE\00CF\00D1' ||
                   U&'\00D2\00D3\00D4\00D5\00D6\00D9\00DA\00DB\00DC\00DD\00E0\00E1\00E2\00E3\00E4\00E5' ||
                   U&'\00E7\00E8\00E9\00EA\00EB\00EC\00ED\00EE\00EF\00F1\00F2\00F3\00F4\00F5\00F6\00F9' ||
                   U&'\00FA\00FB\00FC\00FD\00FF\0100\0101\0102\0103\0104\0105\0106\0107\0108\0109\010A' ||
                   U&'\010B\010C\010D\010E\010F\0112\0113\0114\0115\0116\0117\0118\0119\011A\011B\011C' ||
                   U&'\011D\011E\011F\0120\0121\0122\0123\0124\0125\0128\0129\012A\012B\012C\012D\012E' ||
                   U&'\012F\0130\0134\0135\0136\0137\0139\013A\013B\013C\013D\013E\0143\0144\0145\0146' ||
                   U&'\0147\0148\014C\014D\014E\014F\0150\0151\0154\0155\0156\0157\0158\0159\015A\015B' ||
                   U&'\015C\015D\015E\015F\0160\0161\0162\0163\0164\0165\0168\0169\016A\016B\016C\016D' ||
                   U&'\016E\016F\0170\0171\0172\0173\0174\0175\0176\0177\0178\0179\017A\017B\017C\017D' ||
                   U&'\017E\01A0\01A1\01AF\01B0\01CD\01CE\01CF\01D0\01D1\01D2\01D3\01D4\01D5\01D6\01D7' ||
                   U&'\01D8\01D9\01DA\01DB\01DC\01DE\01DF\01E0\01E1\01E6\01E7\01E8\01E9\01EA\01EB\01EC' ||
                   U&'\01ED\01F0\01F4\01F5\01F8\01F9\01FA\01FB\0200\0201\0202\0203\0204\0205\0206\0207' ||
                   U&'\0208\0209\020A\020B\020C\020D\020E\020F\0210\0211\0212\0213\0214\0215\0216\0217' ||
                   U&'\0218\0219\021A\021B\021E\021F\0226\0227\0228\0229\022A\022B\022C\022D\022E\022F' ||
                   U&'\0230\0231\0232\0233\1E00\1E01\1E02\1E03\1E04\1E05\1E06\1E07\1E08\1E09\1E0A\1E0B' ||
                   U&'\1E0C\1E0D\1E0E\1E0F\1E10\1E11\1E12\1E13\1E14\1E15\1E16\1E17\1E18\1E19\1E1A\1E1B' ||
                   U&'\1E1C\1E1D\1E1E\1E1F\1E20\1E21\1E22\1E23\1E24\1E25\1E26\1E27\1E28\1E29\1E2A\1E2B' ||
                   U&'\1E2C\1E2D\1E2E\1E2F\1E30\1E31\1E32\1E33\1E34\1E35\1E36\1E37\1E38\1E39\1E3A\1E3B' ||
                   U&'\1E3C\1E3D\1E3E\1E3F\1E40\1E41\1E42\1E43\1E44\1E45\1E46\1E47\1E48\1E49\1E4A\1E4B' ||
                   U&'\1E4C\1E4D\1E4E\1E4F\1E50\1E51\1E52\1E53\1E54\1E55\1E56\1E57\1E58\1E59\1E5A\1E5B' ||
                   U&'\1E5C\1E5D\1E5E\1E5F\1E60\1E61\1E62\1E63\1E64\1E65\1E66\1E67\1E68\1E69\1E6A\1E6B' ||
                   U&'\1E6C\1E6D\1E6E\1E6F\1E70\1E71\1E72\1E73\1E74\1E75\1E76\1E77\1E78\1E79\1E7A\1E7B' ||
                   U&'\1E7C\1E7D\1E7E\1E7F\1E80\1E81\1E82\1E83\1E84\1E85\1E86\1E87\1E88\1E89\1E8A\1E8B' ||
                   U&'\1E8C\1E8D\1E8E\1E8F\1E90\1E91\1E92\1E93\1E94\1E95\1E96\1E97\1E98\1E99\1EA0\1EA1' ||
                   U&'\1EA2\1EA3\1EA4\1EA5\1EA6\1EA7\1EA8\1EA9\1EAA\1EAB\1EAC\1EAD\1EAE\1EAF\1EB0\1EB1' ||
                   U&'\1EB2\1EB3\1EB4\1EB5\1EB6\1EB7\1EB8\1EB9\1EBA\1EBB\1EBC\1EBD\1EBE\1EBF\1EC0\1EC1' ||
                   U&'\1EC2\1EC3\1EC4\1EC5\1EC6\1EC7\1EC8\1EC9\1ECA\1ECB\1ECC\1ECD\1ECE\1ECF\1ED0\1ED1' ||
                   U&'\1ED2\1ED3\1ED4\1ED5\1ED6\1ED7\1ED8\1ED9\1EDA\1EDB\1EDC\1EDD\1EDE\1EDF\1EE0\1EE1' ||
                   U&'\1EE2\1EE3\1EE4\1EE5\1EE6\1EE7\1EE8\1EE9\1EEA\1EEB\1EEC\1EED\1EEE\1EEF\1EF0\1EF1' ||
                   U&'\1EF2\1EF3\1EF4\1EF5\1EF6\1EF7\1EF8\1EF9',
                                      U&'aaaaaaceeeeiiiinooooouuuuyaaaaaaceeeeiiiinooooouuuuyyaaaaaaccccccccddeeeeeeeeeeg' ||
                   U&'ggggggghhiiiiiiiiijjkkllllllnnnnnnoooooorrrrrrssssssssttttuuuuuuuuuuuuwwyyyzzzzz' ||
                   U&'zoouuaaiioouuuuuuuuuuaaaaggkkoooojggnnaaaaaaeeeeiiiioooorrrruuuusstthhaaeeoooooo' ||
                   U&'ooyyaabbbbbbccddddddddddeeeeeeeeeeffgghhhhhhhhhhiiiikkkkkkllllllllmmmmmmnnnnnnnn' ||
                   U&'oooooooopppprrrrrrrrssssssssssttttttttuuuuuuuuuuvvvvwwwwwwwwwwxxxxyyzzzzzzhtwyaa' ||
                   U&'aaaaaaaaaaaaaaaaaaaaaaeeeeeeeeeeeeeeeeiiiioooooooooooooooooooooooouuuuuuuuuuuuuu' ||
                   U&'yyyyyyyy'
                 )
               ),
               '[^a-z0-9 ]', ' ', 'g'
             ),
             ' +', ' ', 'g'
           )
         );
$mig053norm$;

COMMENT ON FUNCTION public.exploraco_norm(text) IS
  'ADR-090 D2: UNICO normalizador canonico de busqueda (NFD-equivalente: lower + strip de diacriticos latinos + [^a-z0-9 ]->espacio + colapso de espacios + trim). IMMUTABLE. Espejo JS: normGeo (api/interacciones.js), validado por scripts/smoke_busqueda_parity.js.';

-- ============================================================================
-- 2. TRIGRAMAS: public.exploraco_trgm(text) -> text[]
--    ADR-090 D1: normaliza con exploraco_norm, paddea '  ' + s + ' ' y emite
--    las ventanas deslizantes de 3 caracteres, unicas y ordenadas. Cero
--    extensiones (solo core: generate_series, substr, array_agg). Es el unico
--    origen de verdad de los trigramas; busqueda.js replicara su espejo JS.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.exploraco_trgm(p text)
RETURNS text[]
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $mig053trgm$
  -- T3c (fix de rendimiento, ADR-090 D1 sin cambio de contrato): el pad se
  -- MATERIALIZA una sola vez con un CTE MATERIALIZED. La version previa dejaba
  -- que el planner aplanara la subconsulta y re-evaluaba exploraco_norm por cada
  -- fila de generate_series -> O(n*m); con cadenas largas no terminaba (medido
  -- 2026-10-07: repeat('a',4000) ~25 s; >6000 no terminaba en 40 s). Con
  -- MATERIALIZED, repeat('a',9267) responde en ~0,4 s. Mismos trigramas.
  WITH base AS MATERIALIZED (
    SELECT '  ' || public.exploraco_norm(p) || ' ' AS pad
  )
  SELECT COALESCE(array_agg(DISTINCT g.w ORDER BY g.w), ARRAY[]::text[])
    FROM (
      SELECT substr(b.pad, i, 3) AS w
        FROM base b,
             generate_series(1, length(b.pad) - 2) AS i
    ) g;
$mig053trgm$;

COMMENT ON FUNCTION public.exploraco_trgm(text) IS
  'ADR-090 D1: array de trigramas normalizados (core PG, sin pg_trgm) para la columna destinos.search_trgm y su GIN con operador &&. Espejo JS: trigramas() en busqueda.js (Wave 1, fuera de esta entrega).';

-- ============================================================================
-- 3. COLUMNAS NORMALIZADAS EN destinos (ADR-090 D2). Nullable en esta pasada
--    para permitir el backfill sin locks largos. NO se tocan los datos de tags.
-- ============================================================================
ALTER TABLE public.destinos ADD COLUMN IF NOT EXISTS nombre_norm text;
ALTER TABLE public.destinos ADD COLUMN IF NOT EXISTS ciudad_norm text;
ALTER TABLE public.destinos ADD COLUMN IF NOT EXISTS region_norm text;
ALTER TABLE public.destinos ADD COLUMN IF NOT EXISTS barrio_norm text;
ALTER TABLE public.destinos ADD COLUMN IF NOT EXISTS tags_norm   text;
ALTER TABLE public.destinos ADD COLUMN IF NOT EXISTS search_norm text;
ALTER TABLE public.destinos ADD COLUMN IF NOT EXISTS search_trgm text[];

-- ============================================================================
-- 4. TRIGGER QUE MANTIENE LAS COLUMNAS (ADR-090 D2: trigger, no generated).
--    Un unico camino de codigo para el INSERT/UPDATE de las columnas fuente.
--    tags_norm copia TODOS los valores de jsonb_each_text SIN deny-list.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.destinos_busqueda_norm_fn()
RETURNS trigger
LANGUAGE plpgsql
AS $mig053trg$
DECLARE
  v_tags text;
BEGIN
  IF NEW.tags IS NOT NULL AND jsonb_typeof(NEW.tags) = 'object' THEN
    SELECT COALESCE(string_agg(t.v, ' ' ORDER BY t.k), '')
      INTO v_tags
      FROM jsonb_each_text(NEW.tags) AS t(k, v);
  ELSE
    v_tags := '';
  END IF;

  NEW.nombre_norm := public.exploraco_norm(NEW.nombre);
  NEW.ciudad_norm := public.exploraco_norm(NEW.ciudad);
  NEW.region_norm := public.exploraco_norm(NEW.region);
  NEW.barrio_norm := public.exploraco_norm(NEW.barrio);
  NEW.tags_norm   := public.exploraco_norm(v_tags);
  NEW.search_norm := btrim(concat_ws(' ',
                       NEW.nombre_norm, NEW.ciudad_norm, NEW.region_norm,
                       NEW.barrio_norm, NEW.tags_norm));
  NEW.search_trgm := public.exploraco_trgm(NEW.search_norm);
  RETURN NEW;
END
$mig053trg$;

COMMENT ON FUNCTION public.destinos_busqueda_norm_fn() IS
  'ADR-090 D2: materializa las columnas normalizadas de destinos al INSERT/UPDATE de nombre/ciudad/region/barrio/tags. tags_norm copia TODOS los valores de tags (deny-list en busqueda.js, en consulta).';

DROP TRIGGER IF EXISTS trg_destinos_busqueda_norm ON public.destinos;
CREATE TRIGGER trg_destinos_busqueda_norm
  BEFORE INSERT OR UPDATE OF nombre, ciudad, region, barrio, tags
  ON public.destinos
  FOR EACH ROW
  EXECUTE FUNCTION public.destinos_busqueda_norm_fn();

-- ============================================================================
-- 5. BACKFILL IDEMPOTENTE de las filas existentes.
--    (5.a) componentes: solo filas aun sin backfill (search_norm IS NULL).
--    (5.b) blob + trigramas: solo filas aun sin trigramas (search_trgm IS NULL).
--    Re-ejecutar: ambas guardas dan 0 filas -> no-op funcional.
-- ============================================================================
UPDATE public.destinos d
   SET nombre_norm = public.exploraco_norm(d.nombre),
       ciudad_norm = public.exploraco_norm(d.ciudad),
       region_norm = public.exploraco_norm(d.region),
       barrio_norm = public.exploraco_norm(d.barrio),
       tags_norm   = public.exploraco_norm(
         CASE WHEN d.tags IS NOT NULL AND jsonb_typeof(d.tags) = 'object'
              THEN COALESCE((SELECT string_agg(t.v, ' ' ORDER BY t.k)
                               FROM jsonb_each_text(d.tags) AS t(k, v)), '')
              ELSE '' END)
 WHERE d.search_norm IS NULL;

UPDATE public.destinos d
   SET search_norm = btrim(concat_ws(' ',
                       d.nombre_norm, d.ciudad_norm, d.region_norm,
                       d.barrio_norm, d.tags_norm)),
       search_trgm = public.exploraco_trgm(btrim(concat_ws(' ',
                       d.nombre_norm, d.ciudad_norm, d.region_norm,
                       d.barrio_norm, d.tags_norm)))
 WHERE d.search_trgm IS NULL;

-- ============================================================================
-- 6. INDICES (ADR-090 D3). TODOS parciales WHERE status='published'.
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_destinos_nombre_norm_prefix
  ON public.destinos (nombre_norm text_pattern_ops)
  WHERE status = 'published';

CREATE INDEX IF NOT EXISTS idx_destinos_ciudad_norm
  ON public.destinos (ciudad_norm text_pattern_ops)
  WHERE status = 'published';

CREATE INDEX IF NOT EXISTS idx_destinos_search_trgm
  ON public.destinos USING gin (search_trgm)
  WHERE status = 'published';

CREATE INDEX IF NOT EXISTS idx_destinos_search_fts
  ON public.destinos USING gin (to_tsvector('simple', search_norm))
  WHERE status = 'published';

CREATE INDEX IF NOT EXISTS idx_destinos_geo_bbox
  ON public.destinos (lat, lng)
  WHERE lat IS NOT NULL AND lng IS NOT NULL AND status = 'published';

CREATE INDEX IF NOT EXISTS idx_destinos_categoria_rating
  ON public.destinos (categoria_slug, rating DESC NULLS LAST)
  WHERE status = 'published';

-- ============================================================================
-- 7. VERIFICACION POST-APLICACION (solo lectura; NO se ejecuta aqui).
--    Copiar y correr en el editor de Neon, UNA sentencia por bloque.
-- ============================================================================
-- (a) Las 7 columnas nuevas (esperadas 7 filas):
-- SELECT column_name, data_type, is_nullable FROM information_schema.columns
--   WHERE table_schema='public' AND table_name='destinos'
--     AND column_name IN ('nombre_norm','ciudad_norm','region_norm',
--                         'barrio_norm','tags_norm','search_norm','search_trgm')
--   ORDER BY column_name;
--
-- (b) Las 2 funciones (esperadas 2 filas, ambas IMMUTABLE 'i'):
-- SELECT p.oid::regprocedure, p.provolatile FROM pg_proc p
--   WHERE p.pronamespace='public'::regnamespace
--     AND p.proname IN ('exploraco_norm','exploraco_trgm');
--
-- (c) El trigger (esperada 1 fila, tgenabled='O'):
-- SELECT tgname, tgenabled FROM pg_trigger
--   WHERE tgrelid='public.destinos'::regclass AND NOT tgisinternal
--     AND tgname='trg_destinos_busqueda_norm';
--
-- (d) Los 6 indices (esperadas 6 filas):
-- SELECT indexname FROM pg_indexes
--   WHERE schemaname='public' AND tablename='destinos'
--     AND indexname IN ('idx_destinos_nombre_norm_prefix','idx_destinos_ciudad_norm',
--                       'idx_destinos_search_trgm','idx_destinos_search_fts',
--                       'idx_destinos_geo_bbox','idx_destinos_categoria_rating')
--   ORDER BY indexname;
--
-- (e) Cobertura del backfill (las dos cifras deben ser 0):
-- SELECT
--   count(*) FILTER (WHERE search_norm IS NULL) AS sin_blob,
--   count(*) FILTER (WHERE search_trgm IS NULL) AS sin_trgm
-- FROM public.destinos;
--
-- (f) Muestra de paridad funcional (el blob = campos normalizados unidos):
-- SELECT nombre, nombre_norm, ciudad_norm, tags_norm, search_norm,
--        cardinality(search_trgm) AS n_trgm
--   FROM public.destinos WHERE status='published' ORDER BY actualizado_en DESC LIMIT 5;
--
-- (g) Idempotencia global: re-ejecutar TODO el archivo y volver a correr (a)-(f);
--     los conteos y valores deben ser IDENTICOS.
-- ============================================================================
-- FIN 053
-- ============================================================================
