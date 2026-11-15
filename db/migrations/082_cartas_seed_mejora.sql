-- ============================================================================
-- Migration 082: cartas - SEED de la familia mejora (ADR-122 R1, fase F0.2).
--   3 cartas, una por clave de sumidero COMPRABLE, con activo = FALSE:
--     cme_foto_galeria     / foto_galeria     / raro  / precio_xp  400.00
--     cme_album_slot       / album_slot       / epico / precio_xp 1000.00
--     cme_portada_destino  / portada_destino  / epico / precio_xp 1000.00
--   destacar_evento NO se siembra (ADR-122 D10: no se vende lo inutilizable).
-- Fecha: 2026-11-14
-- Referencias: ADR-122 (R1: D2 subtipos = claves de sumidero, D4 precio fijo
--   por copia con CARTA_MULT_FAMILIA.mejora = 1.0 sobre la base 400/1000,
--   D10, F0.2), ADR-003 (cero borrado fisico), ADR-008 (idempotencia),
--   ADR-002 (ASCII-safe), ADR-006 (archivo real).
-- Requiere, YA APLICADAS con fila en schema_migrations:
--   040 (tabla cartas_catalogo), 060 (stats_json / fusionable / emisor),
--   065 (set_coleccion), 066 (familia, subtipo, precio_xp, edicion,
--   supply_max, emitidas + sus CHECKs), 068 (precio_xp numeric(12,2)),
--   069 (familia/subtipo NOT NULL), 076 (CHECKs a 8 familias / 8 ramas),
--   081 (familia 'mejora' + rama de los 3 subtipos comprables).
--
-- POR QUE activo = FALSE (y por que se escribe, no se omite)
--   El DEFAULT de cartas_catalogo.activo es TRUE (040:107). Omitir la columna
--   publicaria las 3 cartas en R1 y carta_acunar (api/interacciones.js:17738,
--   predicado "WHERE c.id=$2 AND c.activo=true") las venderia ANTES de que
--   exista el consumo: comprable pero inutilizable. La invisibilidad de R1 es
--   un VALOR escrito, no una consecuencia del orden de deploy. El flip a
--   activo=true es la migracion 083 (F0.4) al final de R2.
--
-- PRE medido en Neon (2026-11-14, antes de aplicar)
--   cartas_catalogo: 65 filas; familia='mejora': 0 filas.
--   ledger: 081 aplicada (checksum 782ec994...). precio_xp = numeric(12,2).
--   CHECK familia: 9 valores con 'mejora'; CHECK subtipo: rama mejora con
--   foto_galeria / album_slot / portada_destino y SIN destacar_evento.
--
-- POST esperado
--   cartas_catalogo: 68 filas; 3 con familia='mejora', las 3 con activo=false,
--     precio_xp 400/1000/1000, edicion 'abierta', supply_max NULL,
--     nivel_gate NULL, es_evento false, fusionable false, emitidas 0,
--     stats_json '{}' (mejora no tiene vector: poder 0), imagen_url NULL
--     (ADR-122 F0.2: la lamina no es requisito de este contrato).
--   Cero filas con subtipo='destacar_evento'.
--
-- IDEMPOTENCIA (ADR-008)
--   - INSERT ... ON CONFLICT (id) DO NOTHING: una segunda corrida no inserta
--     ni una fila (GET DIAGNOSTICS ROW_COUNT = 0) y el POST lo reporta.
--   - Guarda de deriva: si una de las 3 filas existe con un valor distinto al
--     seed (nombre, set_slug, subtipo, rareza, precio_xp, descripcion o los
--     literales edicion/supply_max/nivel_gate/es_evento/fusionable/emitidas/
--     stats_json) se ABORTA; nunca se pisa. Se excluyen DOS columnas a
--     proposito: activo (la autoridad es 083) e imagen_url (la lamina se
--     resuelve por otra via, 071:81; no es contrato de 082).
--   - Re-ejecutar tras 083: 0 cambios de dato y sin abortar, porque activo no
--     forma parte de la guarda de deriva.
--
-- ROLLBACK (documentado, NO se ejecuta; ADR-003 manda soft-delete)
--   -- UPDATE public.cartas_catalogo SET activo = false
--   --  WHERE familia = 'mejora';
--   -- DELETE FROM schema_migrations WHERE numero = 82;  (evidencia: NO tocar)
--
-- NOTA: este fichero NO escribe schema_migrations; lo hace el runner
--   (scripts/apply_sql_file.js), contrato de la 045.
--
-- VERIFICACION (comentada, se corre a mano tras aplicar)
--   SELECT id, subtipo, rareza, precio_xp, activo, edicion, supply_max
--     FROM public.cartas_catalogo WHERE familia = 'mejora' ORDER BY subtipo;
--   SELECT count(*) FROM public.cartas_catalogo;            -- 68
--   SELECT count(*) FROM public.cartas_catalogo
--    WHERE subtipo = 'destacar_evento';                     -- 0
-- ============================================================================

-- (0) PRE: precondiciones de esquema, fail-closed ----------------------------
DO $mig082pre$
DECLARE
  v_txt text;
  v_n   integer;
  v_col text;
  v_def text;
BEGIN
  IF to_regclass('public.cartas_catalogo') IS NULL THEN
    RAISE EXCEPTION 'MIG082 ABORTA: falta la tabla public.cartas_catalogo (040)';
  END IF;

  -- Columnas que este seed escribe o verifica. Si falta una, la base no es la
  -- de 066/068/069 y el INSERT fallaria a medias: mejor abortar antes.
  FOREACH v_col IN ARRAY ARRAY['id', 'nombre', 'set_slug', 'rareza',
                               'nivel_gate', 'es_evento', 'imagen_url',
                               'activo', 'emisor_tipo', 'descripcion',
                               'stats_json', 'fusionable', 'set_coleccion',
                               'familia', 'subtipo', 'precio_xp', 'edicion',
                               'supply_max', 'emitidas']
  LOOP
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                    WHERE table_schema = 'public'
                      AND table_name   = 'cartas_catalogo'
                      AND column_name  = v_col) THEN
      RAISE EXCEPTION 'MIG082 ABORTA: falta la columna cartas_catalogo.%', v_col;
    END IF;
  END LOOP;

  -- precio_xp numeric(12,2) = 068. Un integer haria que 400.00 se acepte igual,
  -- pero el contrato de D4 habla de numeric(12,2): si no lo es, la base no es
  -- la que este fichero verifico.
  SELECT numeric_precision, numeric_scale INTO v_n, v_col
    FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'cartas_catalogo'
     AND column_name = 'precio_xp';
  IF v_n IS DISTINCT FROM 12 OR v_col::integer IS DISTINCT FROM 2 THEN
    RAISE EXCEPTION 'MIG082 ABORTA: precio_xp es numeric(%,%), se espera (12,2) de 068',
      v_n, v_col;
  END IF;

  -- 081 aplicada: la familia 'mejora' y los 3 subtipos comprables estan en los
  -- CHECK vivos. Se busca el literal ENTRE COMILLAS porque
  -- pg_get_constraintdef normaliza a ((familia)::text = 'mejora'::text).
  SELECT pg_get_constraintdef(oid) INTO v_def
    FROM pg_constraint
   WHERE conrelid = 'public.cartas_catalogo'::regclass
     AND conname  = 'chk_cartas_catalogo_familia';
  IF v_def IS NULL OR position('''mejora''' IN v_def) = 0 THEN
    RAISE EXCEPTION 'MIG082 ABORTA: chk_cartas_catalogo_familia no nombra mejora (falta 081)';
  END IF;

  SELECT pg_get_constraintdef(oid) INTO v_def
    FROM pg_constraint
   WHERE conrelid = 'public.cartas_catalogo'::regclass
     AND conname  = 'chk_cartas_catalogo_subtipo';
  IF v_def IS NULL THEN
    RAISE EXCEPTION 'MIG082 ABORTA: falta chk_cartas_catalogo_subtipo (066)';
  END IF;
  FOREACH v_txt IN ARRAY ARRAY['foto_galeria', 'album_slot', 'portada_destino']
  LOOP
    IF position('''' || v_txt || '''' IN v_def) = 0 THEN
      RAISE EXCEPTION 'MIG082 ABORTA: el CHECK de subtipo no admite % (falta 081)', v_txt;
    END IF;
  END LOOP;
  IF position('destacar_evento' IN v_def) > 0 THEN
    RAISE EXCEPTION 'MIG082 ABORTA: destacar_evento esta en el CHECK de subtipo; D10 lo prohibe';
  END IF;

  -- CHECKs que goviernan los literales del INSERT. Si faltan, la base no es la
  -- de 060/066 y el seed podria pasar por la razon equivocada.
  FOREACH v_txt IN ARRAY ARRAY['chk_cartas_catalogo_precio',
                               'chk_cartas_catalogo_supply',
                               'chk_cartas_catalogo_fusionable',
                               'chk_cartas_catalogo_stats',
                               'chk_cartas_catalogo_emisor_coherente']
  LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_constraint
                    WHERE conrelid = 'public.cartas_catalogo'::regclass
                      AND conname  = v_txt) THEN
      RAISE EXCEPTION 'MIG082 ABORTA: falta el CHECK % (060/066)', v_txt;
    END IF;
  END LOOP;

  RAISE NOTICE 'MIG082 PRE OK: columnas, precio_xp(12,2) y CHECKs de 060/066/068/081 presentes';
END
$mig082pre$;

-- (1) SEED + guardas + POST, en UN solo DO = UNA transaccion ------------------
--     Cualquier EXCEPTION de las guardas o del POST revierte el INSERT entero.
DO $mig082seed$
DECLARE
  v_seed jsonb := '[
    {"id":"cme_foto_galeria","nombre":"Foto de Galeria","set_slug":"cartas_mejora",
     "familia":"mejora","subtipo":"foto_galeria","rareza":"raro","precio_xp":400,
     "descripcion":"Amplia tu galeria: desbloquea un espacio mas para tus fotos"},
    {"id":"cme_album_slot","nombre":"Espacio de Album","set_slug":"cartas_mejora",
     "familia":"mejora","subtipo":"album_slot","rareza":"epico","precio_xp":1000,
     "descripcion":"Amplia tus albumes: abre un espacio mas dentro de un album tuyo"},
    {"id":"cme_portada_destino","nombre":"Portada de Destino","set_slug":"cartas_mejora",
     "familia":"mejora","subtipo":"portada_destino","rareza":"epico","precio_xp":1000,
     "descripcion":"Cambia la portada de uno de los destinos que ya posees"}
  ]'::jsonb;
  v_txt        text;
  v_n          integer;
  v_antes      integer;
  v_total_ant  integer;
  v_ins        integer;
  v_act_false  integer;
BEGIN
  -- (1a) CURADURIA: la tabla ratificada de D4/F0.2, escrita DOS veces a
  -- proposito (el seed y esta guarda independiente): si una fila se sale del
  -- contrato, se aborta en vez de sembrar una carta a otro precio.
  --   400.00 = CARTA_PRECIO_BASE_XP.raro (400) x CARTA_MULT_FAMILIA.mejora (1.0)
  --  1000.00 = CARTA_PRECIO_BASE_XP.epico (1000) x 1.0
  SELECT string_agg(x.id, ', ') INTO v_txt
    FROM jsonb_to_recordset(v_seed) AS x(id text, subtipo text, rareza text,
                                         precio_xp numeric)
    LEFT JOIN (VALUES
        ('cme_foto_galeria',    'foto_galeria',    'raro',    400.00::numeric(12,2)),
        ('cme_album_slot',      'album_slot',      'epico',  1000.00::numeric(12,2)),
        ('cme_portada_destino', 'portada_destino', 'epico',  1000.00::numeric(12,2))
      ) AS m(id, subtipo, rareza, precio_xp) ON m.id = x.id
   WHERE m.id IS NULL
      OR x.subtipo   IS DISTINCT FROM m.subtipo
      OR x.rareza    IS DISTINCT FROM m.rareza
      OR x.precio_xp IS DISTINCT FROM m.precio_xp;
  IF v_txt IS NOT NULL THEN
    RAISE EXCEPTION 'MIG082 ABORTA: pieza fuera de la tabla D4/F0.2 (subtipo/rareza/precio): %', v_txt;
  END IF;

  -- (1b) FORMA: 3 filas, ids distintos, ASCII, texto de una linea y sin
  -- digitos en la descripcion (mismo criterio editorial que 078).
  SELECT count(*) INTO v_n FROM jsonb_to_recordset(v_seed) AS x(id text);
  IF v_n <> 3 THEN
    RAISE EXCEPTION 'MIG082 ABORTA: el seed tiene % fila(s), se esperan 3', v_n;
  END IF;
  SELECT count(DISTINCT x.id) INTO v_n FROM jsonb_to_recordset(v_seed) AS x(id text);
  IF v_n <> 3 THEN
    RAISE EXCEPTION 'MIG082 ABORTA: ids repetidos en el seed (% distintos de 3)', v_n;
  END IF;

  SELECT string_agg(x.id, ', ') INTO v_txt
    FROM jsonb_to_recordset(v_seed) AS x(id text, nombre text, set_slug text,
                                         familia text, descripcion text)
   WHERE x.id !~ '^[a-z0-9_]+$'
      OR x.nombre IS NULL OR btrim(x.nombre) = ''
      OR x.set_slug IS DISTINCT FROM 'cartas_mejora'
      OR x.familia IS DISTINCT FROM 'mejora'
      OR x.descripcion IS NULL
      OR length(x.descripcion) < 20
      OR length(x.descripcion) > 160
      OR x.descripcion ~ '[0-9]'
      OR position(chr(10) in x.descripcion) > 0
      OR position(';' in x.descripcion) > 0;
  IF v_txt IS NOT NULL THEN
    RAISE EXCEPTION 'MIG082 ABORTA: id/nombre/set_slug/descripcion fuera de contrato en: %', v_txt;
  END IF;

  -- (1c) DERIVA: si una de las 3 filas ya existe y NO coincide con el seed, se
  -- aborta. Nunca se pisa una recalibracion del operador. Excluidas a
  -- proposito: activo (autoridad 083) e imagen_url (lamina fuera de contrato).
  SELECT string_agg(c.id, ', ') INTO v_txt
    FROM public.cartas_catalogo c
    JOIN jsonb_to_recordset(v_seed) AS x(id text, nombre text, set_slug text,
         familia text, subtipo text, rareza text, precio_xp numeric,
         descripcion text) ON x.id = c.id
   WHERE c.nombre       IS DISTINCT FROM x.nombre
      OR c.set_slug     IS DISTINCT FROM x.set_slug
      OR c.familia      IS DISTINCT FROM x.familia
      OR c.subtipo      IS DISTINCT FROM x.subtipo
      OR c.rareza::text IS DISTINCT FROM x.rareza
      OR c.precio_xp    IS DISTINCT FROM x.precio_xp
      OR c.descripcion  IS DISTINCT FROM x.descripcion
      OR c.edicion      IS DISTINCT FROM 'abierta'
      OR c.supply_max   IS NOT NULL
      OR c.nivel_gate   IS NOT NULL
      OR c.es_evento    IS DISTINCT FROM false
      OR c.fusionable   IS DISTINCT FROM false
      OR c.emitidas     IS DISTINCT FROM 0
      OR c.stats_json   IS DISTINCT FROM '{}'::jsonb;
  IF v_txt IS NOT NULL THEN
    RAISE EXCEPTION 'MIG082 ABORTA: deriva frente al seed en: % (no se sobrescribe; ADR-008)', v_txt;
  END IF;

  -- (1d) INSERT. Los literales de R1 (activo false, edicion abierta,
  -- supply_max NULL, nivel_gate NULL, es_evento false, fusionable false,
  -- emitidas 0, stats_json '{}', imagen_url NULL) van como LITERALES y no
  -- vienen del recordset: no pueden divergir del contrato.
  SELECT count(*) INTO v_antes     FROM public.cartas_catalogo WHERE familia = 'mejora';
  SELECT count(*) INTO v_total_ant FROM public.cartas_catalogo;

  INSERT INTO public.cartas_catalogo (
    id, nombre, set_slug, rareza, nivel_gate, es_evento, imagen_url, activo,
    emisor_tipo, descripcion, stats_json, fusionable, set_coleccion, familia,
    subtipo, precio_xp, edicion, supply_max, emitidas
  )
  SELECT r.id, r.nombre, r.set_slug, r.rareza, NULL, false,
         NULL, false, 'sistema', r.descripcion, '{}'::jsonb,
         false, false, r.familia, r.subtipo, r.precio_xp, 'abierta', NULL, 0
    FROM jsonb_to_recordset(v_seed) AS r(id text, nombre text, set_slug text,
         familia text, subtipo text, rareza text, precio_xp numeric,
         descripcion text)
  ON CONFLICT (id) DO NOTHING;
  GET DIAGNOSTICS v_ins = ROW_COUNT;

  -- (1e) POST: tripwires fail-closed --------------------------------------
  IF v_ins <> 3 AND v_ins <> 0 THEN
    RAISE EXCEPTION 'MIG082 POST: se insertaron % filas; se esperan 3 (o 0 en re-ejecucion)', v_ins;
  END IF;

  -- Las 3 filas tienen que existir SIEMPRE (recien insertadas o previas).
  SELECT count(*) INTO v_n
    FROM public.cartas_catalogo c
    JOIN jsonb_to_recordset(v_seed) AS x(id text) ON x.id = c.id
   WHERE c.familia = 'mejora';
  IF v_n <> 3 THEN
    RAISE EXCEPTION 'MIG082 POST: % de las 3 cartas mejora estan en el catalogo', v_n;
  END IF;

  -- Invisibilidad de R1: en la PRIMERA aplicacion (v_ins = 3) las 3 tienen que
  -- quedar con activo=false. En una re-ejecucion posterior a 083 (v_ins = 0)
  -- el flip es legitimo y solo se reporta: 082 no es autoridad de activo.
  SELECT count(*) INTO v_act_false
    FROM public.cartas_catalogo c
    JOIN jsonb_to_recordset(v_seed) AS x(id text) ON x.id = c.id
   WHERE c.activo = false;
  IF v_ins = 3 AND v_act_false <> 3 THEN
    RAISE EXCEPTION 'MIG082 POST: solo % de 3 cartas mejora quedaron activo=false en el alta', v_act_false;
  END IF;

  -- Los literales del contrato, en las 3 filas.
  SELECT string_agg(c.id, ', ') INTO v_txt
    FROM public.cartas_catalogo c
    JOIN jsonb_to_recordset(v_seed) AS x(id text) ON x.id = c.id
   WHERE c.edicion      IS DISTINCT FROM 'abierta'
      OR c.supply_max   IS NOT NULL
      OR c.nivel_gate   IS NOT NULL
      OR c.es_evento    IS DISTINCT FROM false
      OR c.fusionable   IS DISTINCT FROM false
      OR c.emitidas     IS DISTINCT FROM 0
      OR c.stats_json   IS DISTINCT FROM '{}'::jsonb
      OR c.emisor_tipo  IS DISTINCT FROM 'sistema'
      OR c.imagen_url   IS NOT NULL
      OR c.set_coleccion IS DISTINCT FROM false;
  IF v_txt IS NOT NULL THEN
    RAISE EXCEPTION 'MIG082 POST: literales de R1 fuera de contrato en: %', v_txt;
  END IF;

  -- Conteo total: solo pueden aparecer las filas que este seed inserto.
  SELECT count(*) INTO v_n
    FROM public.cartas_catalogo
   WHERE familia = 'mejora';
  IF v_n <> v_antes + v_ins THEN
    RAISE EXCEPTION 'MIG082 POST: familia mejora tiene % filas, se esperaban %', v_n, v_antes + v_ins;
  END IF;
  SELECT count(*) INTO v_n FROM public.cartas_catalogo;
  IF v_n <> v_total_ant + v_ins THEN
    RAISE EXCEPTION 'MIG082 POST: total % filas, se esperaban %', v_n, v_total_ant + v_ins;
  END IF;

  -- D10: ni una fila del subtipo reservado.
  SELECT count(*) INTO v_n
    FROM public.cartas_catalogo WHERE subtipo = 'destacar_evento';
  IF v_n <> 0 THEN
    RAISE EXCEPTION 'MIG082 POST: % fila(s) con subtipo destacar_evento; D10 lo prohibe', v_n;
  END IF;

  IF v_ins = 3 THEN
    RAISE NOTICE 'MIG082 POST OK: 3 cartas mejora insertadas con activo=false (R1 invisible); total % filas', v_total_ant + v_ins;
  ELSE
    RAISE NOTICE 'MIG082 POST OK: re-ejecucion, 0 filas insertadas; % de 3 siguen activo=false; total % filas', v_act_false, v_total_ant;
  END IF;
END
$mig082seed$;
