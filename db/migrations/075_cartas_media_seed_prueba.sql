-- ============================================================================
-- Migration 075: cartas_media - SEMILLA DE PRUEBA (1 obra UGC '[TEST]')
-- Fecha: 2026-11-11
-- Referencias: ADR-121 (obra UGC + moderacion previa), ADR-003 (cero borrado
--   logico), ADR-008 (idempotencia), ADR-002 (ASCII-safe), ADR-006 (el archivo
--   real manda).
-- Requiere:
--   040  cartas_catalogo (tabla destino del media_id).
--   067  cartas_media + sus CHECKs (:92-107 DDL, :113-185 CHECKs,
--        :35-38 autor_id SIN FK).
--   068  licencia, licencia_aceptada_en (:119-124) y
--        chk_cartas_media_licencia (:129-141).
--   074  PREDECESOR INMEDIATO (ledger: 'aplicada' el 2026-11-11 18:18 UTC).
--
-- DDL REAL VERIFICADO EL 2026-11-11 (information_schema + pg_constraint, no
-- memoria): cartas_media = 16 columnas y 10 constraints (1 pkey + 9 CHECK).
--   NOT NULL: id, tipo, titulo, media_url, estado_moderacion, activo, creado_en.
--   NULLABLE: autor_id, thumb_url, texto, duracion_seg, moderado_por,
--             moderado_en, motivo, licencia, licencia_aceptada_en.
--   CHECK vivos (definiciones leidas de pg_constraint):
--     chk_cartas_media_tipo       tipo IN ('musica','foto','video','poema')
--     chk_cartas_media_estado     estado IN ('pendiente','aprobada','rechazada','retirada')
--     chk_cartas_media_url        btrim(media_url) <> ''
--     chk_cartas_media_poema      tipo<>'poema' OR texto no vacio
--     chk_cartas_media_duracion   duracion_seg IS NULL OR > 0
--     chk_cartas_media_av         tipo<>'musica' OR duracion_seg NOT NULL
--     chk_cartas_media_pendiente  pendiente exige moderado_por/en NULL
--     chk_cartas_media_rechazo    rechazada exige motivo no vacio
--     chk_cartas_media_licencia   aprobada exige licencia NOT NULL y btrim<>''
--   El contrato del CHECK de licencia se vuelve a comprobar en el paso (0b):
--   si alguien lo debilito o renombro, esta migracion ABORTA (fail-closed).
--
-- PROPOSITO
--   Sembrar UNA obra de prueba para poder ejercitar el circuito completo:
--   envio de obra -> moderacion -> aprobacion -> carta con media_id ->
--   mision 'obra'. Hoy (medido 2026-11-11 19:15 UTC) cartas_media tiene 0
--   filas, cartas_catalogo 45 filas y NINGUNA con media_id: las misiones
--   'obra' estan en SIN_ACCION por FALTA DE CONTENIDO, no por bug. Esta
--   semilla elimina esa excusa de una vez.
--
-- POR QUE ES DE PRUEBA
--   El titulo lleva el prefijo literal '[TEST]': es el marcador visible en la
--   cola de moderacion del panel y en cualquier carta que lo use. La fila NO
--   es contenido real y NO debe promocionarse: su unico fin es validar el
--   flujo. Nace 'pendiente' A PROPOSITO: si naciera 'aprobada' la moderacion
--   no se ejercitaria de verdad.
--
-- AUTORIA (no se inventa un usuario)
--   autor_id se resuelve en tiempo de ejecucion con
--     SELECT id FROM usuarios ORDER BY xp_total DESC NULLS LAST, creado_en ASC
--     LIMIT 1
--   es decir, la obra queda atribuida al usuario con MAS XP (desempate por el
--   mas antiguo), y si usuarios esta vacia la migracion ABORTA con RAISE.
--   cartas_media.autor_id NO tiene FK por diseno (067:35-38), asi que la
--   existencia del autor se comprueba a mano en el paso (5).
--   El operador PUEDE reasignarla despues:
--     UPDATE cartas_media SET autor_id = (SELECT id FROM usuarios WHERE ...)
--      WHERE id = '7e57c0de-0000-4000-8000-000000000075';
--   OJO al crear la carta con emisor_tipo='ugc': api/admin.js:796-799 exige
--   emisor_id = cartas_media.autor_id (409 MEDIA_AUTOR_INCOHERENTE).
--
-- COMO SE USA (la carta NO se crea aqui, a proposito)
--   1. Aplicar (predecesores 067/068/074 ya en el ledger):
--      node scripts/apply_sql_file.js db/migrations/075_cartas_media_seed_prueba.sql --dry-run
--      node scripts/apply_sql_file.js db/migrations/075_cartas_media_seed_prueba.sql
--   2. En el panel admin, cola de moderacion, ABRIR y APROBAR la obra
--      (POST api/admin.js ?recurso=cartas&tipo=cartas_media_moderar). Aprobar
--      sin licencia responde 400 LICENCIA_REQUERIDA (23514 traducido,
--      api/admin.js:1703): aqui la licencia YA esta puesta, asi que aprueba.
--   3. Crear la carta desde el alta del panel (cartas_crear) con
--      media_id = '7e57c0de-0000-4000-8000-000000000075'. La obra DEBE estar
--      'aprobada' y activa: api/admin.js:784-801 responde 404
--      MEDIA_NO_ENCONTRADA o 409 MEDIA_NO_APROBADA si no.
--   4. Comprobar la mision 'obra' y el render de la carta.
--
-- ID FIJO Y IDEMPOTENCIA (ADR-008)
--   UUID LITERAL (no gen_random_uuid()) para que el operador pueda referenciar
--   el mismo id en el panel, en el alta de la carta y en el rollback:
--     7e57c0de-0000-4000-8000-000000000075
--   INSERT ... ON CONFLICT (id) DO NOTHING: la segunda corrida es no-op (0
--   filas nuevas, contenido y md5 identicos).
--
-- GUARDAS
--   (0b) si el CHECK de licencia no es el contrato fail-closed de 068 -> RAISE.
--   (2)  si el id fijo existe con OTRO CONTENIDO (tipo/titulo/media_url/
--        licencia) -> RAISE: no se pisa nada. estado_moderacion y autor_id NO
--        forman parte de la guarda: son flujo de trabajo, aprobar o reasignar
--        no convierte la fila en "otro contenido".
--   (3)  si cartas_media ya tiene filas AJENAS a esta prueba -> NO aborta,
--        solo NOTICE: puede haber contenido real y esta migracion no lo toca.
--
-- QUE NO HACE
--   - No crea la carta con media_id (paso manual del operador: se prueba el
--     flujo real, no una carta sembrada a mano).
--   - No siembra la mision 'obra' ni toca gamificacion_config.
--   - No modera: la obra nace 'pendiente'.
--   - No escribe schema_migrations: la fila 075 la pone el runner (045).
--   - Cero sentencias de apertura/cierre de transaccion: el runner no abre
--     transaccion (067:47-51).
--
-- CONSULTAS PRE (solo lectura, scripts/neon_select.js -f archivo.sql)
--   SELECT count(*) FROM cartas_media;                                -- 0
--   SELECT count(*) FROM usuarios;                                    -- 22
--   SELECT count(*) FROM cartas_catalogo WHERE media_id IS NOT NULL;  -- 0
--
-- CONSULTAS POST
--   SELECT id, tipo, titulo, estado_moderacion, licencia, autor_id, activo
--     FROM cartas_media;   -- 1 fila, 'pendiente', CC0-1.0
--   SELECT count(*) FROM cartas_media m
--     JOIN usuarios u ON u.id = m.autor_id;   -- 1 (autor existente)
--   SELECT numero, nombre, resultado FROM schema_migrations
--    WHERE numero = 75;                       -- 'aplicada'
--
-- ROLLBACK (documentado, NO se ejecuta; requiere aprobacion del operador)
--   -- 1) Desvincular cartas que apunten a la obra (FK ON DELETE RESTRICT):
--   --    UPDATE cartas_catalogo SET media_id = NULL
--   --     WHERE media_id = '7e57c0de-0000-4000-8000-000000000075';
--   -- 2) Borrar SOLO la obra de prueba, por id fijo:
--   --    DELETE FROM cartas_media
--   --     WHERE id = '7e57c0de-0000-4000-8000-000000000075';
--   -- 3) Quitar la fila del ledger (solo si se reaplica la migracion):
--   --    DELETE FROM schema_migrations WHERE numero = 75;
--
-- ASCII-SAFE (ADR-002): cero bytes > 127, cero tildes, cero backticks.
-- ============================================================================

DO $m075$
DECLARE
  v_id     uuid := '7e57c0de-0000-4000-8000-000000000075'::uuid;
  v_tipo   text := 'foto';
  v_titulo text := '[TEST] Rio de piedra';
  v_url    text := 'assets/cartas/marca_ancestral.png';
  v_lic    text := 'CC0-1.0';
  v_autor  uuid;
  v_chk    text;
  v_pre    integer;
  v_post   integer;
  v_existe integer;
  v_otros  integer;
  v_ins    integer := 0;
  v_ok     integer;
BEGIN
  -- (0) PRECONDICIONES: 067 aplicada (tabla y columnas de 068) --------------
  IF to_regclass('public.cartas_media') IS NULL THEN
    RAISE EXCEPTION 'MIG075 ABORTA: falta 067 (public.cartas_media no existe)';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                  WHERE table_schema = 'public' AND table_name = 'cartas_media'
                    AND column_name = 'licencia') THEN
    RAISE EXCEPTION 'MIG075 ABORTA: falta 068 (cartas_media.licencia)';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                  WHERE table_schema = 'public' AND table_name = 'cartas_media'
                    AND column_name = 'licencia_aceptada_en') THEN
    RAISE EXCEPTION 'MIG075 ABORTA: falta 068 (cartas_media.licencia_aceptada_en)';
  END IF;

  -- (0b) CONTRATO DEL CHECK DE LICENCIA (068:129-141), leido de pg_constraint.
  --      Si no existe o no es fail-closed, la prueba dejaria de probar lo que
  --      dice probar: abortar es mas util que un verde falso.
  SELECT pg_get_constraintdef(oid) INTO v_chk
    FROM pg_constraint
   WHERE conname = 'chk_cartas_media_licencia'
     AND conrelid = 'public.cartas_media'::regclass;

  IF v_chk IS NULL THEN
    RAISE EXCEPTION 'MIG075 ABORTA: falta 068 (chk_cartas_media_licencia)';
  END IF;

  IF position('aprobada' in v_chk) = 0 OR position('licencia' in v_chk) = 0 THEN
    RAISE EXCEPTION 'MIG075 ABORTA: chk_cartas_media_licencia no es el contrato fail-closed de 068: %', v_chk;
  END IF;

  -- (1) AUTOR: el usuario con mas XP (desempate: el mas antiguo). Sin usuarios
  --     no hay a quien atribuir la obra y NO se inventa un uuid.
  SELECT u.id INTO v_autor
    FROM usuarios u
   ORDER BY u.xp_total DESC NULLS LAST, u.creado_en ASC
   LIMIT 1;

  IF v_autor IS NULL THEN
    RAISE EXCEPTION 'MIG075 ABORTA: public.usuarios esta vacia; no hay autor real para la obra de prueba';
  END IF;

  -- (2) GUARDA DE CONTENIDO: el id fijo no puede existir con otra obra -------
  SELECT count(*) INTO v_existe FROM cartas_media WHERE id = v_id;

  IF v_existe > 0 THEN
    SELECT count(*) INTO v_ok
      FROM cartas_media m
     WHERE m.id = v_id
       AND m.tipo = v_tipo
       AND m.titulo = v_titulo
       AND m.media_url = v_url
       AND m.licencia IS NOT DISTINCT FROM v_lic;

    IF v_ok <> 1 THEN
      RAISE EXCEPTION 'MIG075 ABORTA: el id % ya existe con OTRO contenido; no se pisa (revisar a mano)', v_id;
    END IF;

    RAISE NOTICE 'MIG075: la obra de prueba ya existe (id %, estado %); no-op',
      v_id, (SELECT estado_moderacion FROM cartas_media WHERE id = v_id);
  END IF;

  -- (3) FILAS AJENAS: NO aborta (puede haber contenido real) -----------------
  SELECT count(*) INTO v_otros FROM cartas_media WHERE id <> v_id;

  IF v_otros > 0 THEN
    RAISE NOTICE 'MIG075: cartas_media ya tiene % fila(s) que NO son esta prueba; no se tocan', v_otros;
  END IF;

  SELECT count(*) INTO v_pre FROM cartas_media;

  -- (4) INSERT IDEMPOTENTE ---------------------------------------------------
  INSERT INTO cartas_media
    (id, autor_id, tipo, titulo, media_url, texto, duracion_seg,
     estado_moderacion, activo, licencia, licencia_aceptada_en)
  VALUES
    (v_id, v_autor, v_tipo, v_titulo, v_url, NULL, NULL,
     'pendiente', true, v_lic, now())
  ON CONFLICT (id) DO NOTHING;

  GET DIAGNOSTICS v_ins = ROW_COUNT;

  -- (5) VERIFICACION POST ----------------------------------------------------
  SELECT count(*) INTO v_post FROM cartas_media;

  IF v_post <> v_pre + v_ins THEN
    RAISE EXCEPTION 'MIG075 ABORTA: filas % -> % con % insertada(s); descuadre',
      v_pre, v_post, v_ins;
  END IF;

  -- (5a) Si la acabamos de insertar, nace con el contrato de nacimiento:
  --      'pendiente', sin moderador, sin motivo, con licencia aceptada.
  IF v_ins = 1 THEN
    SELECT count(*) INTO v_ok
      FROM cartas_media m
     WHERE m.id = v_id
       AND m.estado_moderacion = 'pendiente'
       AND m.moderado_por IS NULL
       AND m.moderado_en IS NULL
       AND m.motivo IS NULL
       AND m.licencia_aceptada_en IS NOT NULL
       AND m.activo = true;

    IF v_ok <> 1 THEN
      RAISE EXCEPTION 'MIG075 ABORTA: la obra recien insertada no nacio pendiente y limpia';
    END IF;
  END IF;

  -- (5b) En AMBAS corridas: contenido intacto, licencia puesta y autor que
  --      EXISTE en usuarios (autor_id no tiene FK: 067:35-38).
  SELECT count(*) INTO v_ok
    FROM cartas_media m
   WHERE m.id = v_id
     AND m.tipo = v_tipo
     AND m.titulo = v_titulo
     AND m.media_url = v_url
     AND m.licencia IS NOT DISTINCT FROM v_lic
     AND m.activo = true
     AND EXISTS (SELECT 1 FROM usuarios u WHERE u.id = m.autor_id);

  IF v_ok <> 1 THEN
    RAISE EXCEPTION 'MIG075 ABORTA: la obra de prueba no cumple el contrato (contenido, licencia o autor inexistente)';
  END IF;

  RAISE NOTICE 'MIG075 OK: % fila(s) insertada(s) en esta corrida; cartas_media = % fila(s)', v_ins, v_post;
  RAISE NOTICE 'MIG075 OK: obra de prueba id=% tipo=% estado=pendiente licencia=% autor=%', v_id, v_tipo, v_lic, v_autor;
  RAISE NOTICE 'MIG075 OK: media_url=% (HEAD 200 en https://exploraco.vercel.app/% )', v_url, v_url;
  RAISE NOTICE 'MIG075 OK: siguiente paso MANUAL: aprobar en el panel y crear la carta con media_id=%', v_id;
END
$m075$;
