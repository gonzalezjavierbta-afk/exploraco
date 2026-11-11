-- ============================================================================
-- Migration 079: cartas - CIERRE DEL CIRCUITO UGC CON DATOS DE PRUEBA
--   1) aprueba la obra de prueba sembrada por la 075
--   2) crea UNA carta familia='artista' vinculada a esa obra
-- Fecha: 2026-11-11
-- Referencias: ADR-121 (obra UGC + moderacion previa), spec
--   2026-11-11-cartas-familias-stats-supply-design.md 2 (familia artista),
--   3.2/3.3 (presupuesto de stats y reparto primario/secundario), 4.2 (precio
--   = base x mult_familia), 4.3 (tirada) y 6 (obra -> ediciones),
--   ADR-002 (ASCII-safe), ADR-003 (cero borrado fisico), ADR-006 (el archivo
--   real manda), ADR-008 (idempotencia), ADR-035 (XP numeric(12,2)).
-- Requiere, YA APLICADAS con fila en schema_migrations:
--   060 (stats_json/fusionable), 066 (familia/subtipo/edicion/supply_max/
--   emitidas/precio_xp + CHECKs), 067 (cartas_media), 068 (licencia + CHECK
--   fail-closed + precio_xp numeric(12,2)), 069 (familia/subtipo NOT NULL),
--   075 (la obra de prueba que esta migracion aprueba).
--
-- DDL REAL LEIDO DE LA BD EL 2026-11-11 (information_schema + pg_constraint,
-- no memoria). cartas_catalogo = 24 columnas; NOT NULL: id, nombre, set_slug,
-- rareza, es_evento, activo, emisor_tipo, stats_json, es_canjeable_qr,
-- fusionable, set_coleccion, familia, subtipo, edicion, emitidas. NULLABLE:
-- nivel_gate, imagen_url, creado_en, emisor_id, marca_id, descripcion,
-- precio_xp, supply_max, media_id.
--   CHECKs vivos que gobiernan esta fila (definicion textual de pg_constraint):
--     chk_cartas_catalogo_familia   familia IN (lugar, personaje, artista,
--                                   marca, producto, consumible, cosmetica,
--                                   naturaleza)
--     chk_cartas_catalogo_subtipo   familia='artista' AND subtipo IN
--                                   (musica, cine, grafica, literatura)
--     chk_cartas_catalogo_precio    familia NOT IN (producto,consumible)
--                                   exige precio_xp IS NULL OR precio_xp > 0
--     chk_cartas_catalogo_edicion   edicion IN (abierta, limitada, serial)
--     chk_cartas_catalogo_supply    limitada/serial exige supply_max > 0;
--                                   abierta exige supply_max NULL
--     chk_cartas_catalogo_emitidas  emitidas >= 0 AND <= supply_max
--     chk_cartas_catalogo_rareza    rareza IN (comun, raro, epico, dorado)
--     chk_cartas_catalogo_emisor_tipo   emisor_tipo IN (sistema, ugc, marca)
--     chk_cartas_catalogo_emisor_coherente  ugc exige emisor_id NOT NULL
--                                   y marca_id NULL
--     chk_cartas_catalogo_stats     stats_json objeto; los 5 ejes, si vienen,
--                                   numericos entre 0 y 40; primario, si
--                                   viene, uno de los 5 ejes
--     chk_cartas_catalogo_fusionable  fusionable=false OR (nivel_gate IS NULL
--                                   AND es_evento=false AND emisor_tipo<>marca
--                                   AND es_canjeable_qr=false)
--     chk_cartas_catalogo_naturaleza  solo aplica a familia='naturaleza'
--     chk_cartas_catalogo_no_fusion_cosmetica  solo aplica a cosmetica
--     chk_cartas_catalogo_sku       solo aplica a producto
--   El paso (0c) revalida el contrato de los cuatro CHECKs de los que depende
--   el INSERT; si alguien los debilito o renombro, esta migracion ABORTA.
--
-- POR QUE EXISTE
--   Hoy (medido 2026-11-11 20:29 UTC) el catalogo tiene 64 cartas y CERO de
--   familia 'artista'; cartas_media tiene 1 fila (la obra [TEST] de la 075) en
--   'pendiente' y 0 cartas con media_id. La mision 'obra' (xpd_obr_ugc,
--   api/interacciones.js:4774-4792) cuenta
--     SELECT COUNT(*) FROM cartas_media
--      WHERE autor_id = $1 AND estado_moderacion = 'aprobada' AND activo
--   luego con la obra en 'pendiente' queda en SIN_ACCION por FALTA DE DATO,
--   no por bug. Este fichero cierra el circuito completo:
--     obra 'pendiente' -> 'aprobada' -> carta 'artista' con media_id -> mision
--   y lo cierra CON DATOS DE PRUEBA, no con contenido real.
--
-- PASO 1: APROBAR LA OBRA (sin tocar licencia ni autor)
--   UPDATE cartas_media SET estado_moderacion='aprobada'
--    WHERE id=<uuid fijo> AND estado_moderacion='pendiente'.
--   La licencia NO se filtra en el WHERE a proposito: si estuviera vacia, el
--   CHECK chk_cartas_media_licencia responde 23514 y la migracion entera
--   revienta (fail-closed). Es el mismo contrato que el handler
--   (api/admin.js:793-795, 409 MEDIA_NO_APROBADA) y que la 068:129-141.
--   Idempotente: si ya esta 'aprobada' el UPDATE afecta 0 filas. Si estuviera
--   'rechazada' o 'retirada' se ABORTA: revertir una decision humana no es
--   trabajo de una semilla.
--   NO se escriben moderado_por / moderado_en: no se inventa un moderador
--   (chk_cartas_media_pendiente solo los exige NULL en 'pendiente', y aqui se
--   sale de 'pendiente'). NO se tocan autor_id, titulo, media_url ni licencia.
--
-- PASO 2: LA CARTA (una sola, familia 'artista')
--   id            car_artista_prueba   (prefijo car_, ASCII, 0 filas medidas
--                                      con ese id antes de escribir)
--   nombre        Obra UGC de prueba
--   subtipo       'grafica'  <-- literal valido de
--                 lib/cartas-config.js SUBTIPOS_CARTA.artista =
--                 ['musica','cine','grafica','literatura']. Se elige 'grafica'
--                 porque la obra (cartas_media.tipo) es 'foto': de los cuatro
--                 subtipos es el unico que cubre imagen fija. NO se inventa
--                 ningun literal fuera de esa lista.
--   rareza        'raro' (justificacion abajo)
--   edicion       'limitada'          supply_max 1000  emitidas 0
--   precio_xp     480.00              (400 base raro x 1.2 artista, 4.2)
--   emisor_tipo   'ugc'   emisor_id = cartas_media.autor_id de la obra
--   media_id      '7e57c0de-0000-4000-8000-000000000075'
--   fusionable    false  (obligado: nivel_gate NOT NULL lo exige el CHECK)
--   nivel_gate    14     (patron de las cartas sembradas: 10/14/20/25 por
--                         comun/raro/epico/dorado, 071:270-274)
--   set_slug      artistas_ugc  (0 filas previas; los set_slug existentes son
--                                cosmetica_v1, personajes_elenco, territorio_*,
--                                marcas_aliadas, naturaleza_*)
--   imagen_url    assets/cartas/consumible_pluma_creador.png (reuso de una
--                 lamina existente con HEAD 200; no se inventan rutas)
--   es_evento     false   es_canjeable_qr false   set_coleccion false
--   activo        true
--
-- JUSTIFICACION DE rareza='raro'
--   La obra UGC es UNA pieza autoral, no contenido de catalogo masivo: no
--   pertenece al tramo de entrada ('comun', tirada 5000). 'raro' mantiene la
--   tirada estandar de las cartas sembradas (1000) y un precio distinto del
--   base (480 frente a 400), de modo que la prueba ejercita la rama de precio
--   con multiplicador no trivial. No se elige 'epico'/'dorado' porque una
--   carta de PRUEBA no debe quedar por encima del contenido real en el
--   catalogo.
--
-- STATS (spec 3.2/3.3; familia artista -> primario 'oficio', secundario
-- 'alcance')
--   presupuesto raro = 8: primario 5 + secundario 3.
--   stats_json = {"primario":"oficio","alcance":3,"oficio":5,
--                 "fortuna":0,"rendimiento":0}
--   Los 4 ejes jugables escritos explicitos (0 donde no aplica); 'presencia'
--   NO se escribe: es el eje de estatus de la familia cosmetica (3.1), no del
--   juego. Cero 'sku' (solo producto) y cero 'estado_iucn' (solo naturaleza).
--   Tope por eje CARTA_STATS_TOPE=40; maximo escrito 5.
--
-- GUARDAS FAIL-CLOSED (todas RAISE, ninguna degrada en silencio)
--   (0a) falta cartas_catalogo / cartas_media o alguna columna requerida.
--   (0b) falta chk_cartas_media_licencia o no menciona 'aprobada'+'licencia'.
--   (0c) falta chk_cartas_catalogo_precio, _subtipo, _emisor_coherente,
--        _fusionable o _stats, o el de subtipo no contiene el par
--        artista/grafica: el INSERT dejaria de probar lo que dice probar.
--   (1)  la obra no existe.
--   (2)  la obra tiene autor_id NULL (no se inventa emisor).
--   (3)  cartas_media trae MAS DE UNA obra de prueba: solo NOTICE (avisa, no
--        aborta: puede haber contenido real y esta migracion no lo toca).
--   (4)  la obra estaba 'rechazada'/'retirada': no se revierte a mano.
--   (5)  el id de la carta existe con OTRO contenido (familia/subtipo/media_id
--        distintos): no se pisa.
--   (6)  POST: la obra no queda 'aprobada' y activa (incluye el caso licencia
--        vacia, que antes habria reventado por 23514).
--   (7)  POST: la carta no apunta a la obra, o emisor_id <> autor_id.
--   (8)  POST: precio_xp <= 0, o no es 480.00, o subtipo fuera de la lista.
--   (9)  POST: descuadre de filas (catalogo != pre + insertadas).
--
-- IDEMPOTENCIA (ADR-008)
--   UPDATE ... WHERE estado='pendiente' (0 filas en la 2a corrida) +
--   INSERT ... ON CONFLICT (id) DO NOTHING. Cero UPDATE de la carta, cero
--   sentencias de borrado, cero TRUNCATE. La 2a corrida imprime el mismo md5
--   de la fila y 0 cambios.
--
-- QUE NO HACE
--   - No siembra usuarios_cartas, ni xp_ledger, ni orden_museo: la carta se
--     acuna por el camino normal (precio_xp + carta_acunar), no se regala.
--   - No escribe la mision ni gamificacion_config: la mision ya existe
--     (api/interacciones.js:4774) y se desbloquea por dato, no por codigo.
--   - No toca api/admin.js: el handler solo se REPLICA en la prueba de orden.
--   - No escribe schema_migrations: la fila 079 la pone el runner (045).
--   - Cero sentencias de apertura/cierre de transaccion (067:47-51).
--
-- PRE medido en Neon (2026-11-11 20:29 UTC)
--   cartas_catalogo = 64 | familia='artista' = 0 | con media_id = 0
--   cartas_media = 1 (la 075, 'pendiente', licencia CC0-1.0, autor
--   bc940e34-0235-4a80-bcb1-c38dac65740d) | nivel_gate existentes: 10/14/20/25/NULL
--   ledger: 078 'aplicada'
--
-- POST esperado
--   cartas_catalogo = 65 | familia='artista' = 1 | con media_id = 1
--   carta: subtipo grafica, rareza raro, precio 480.00, edicion limitada,
--   supply_max 1000, emitidas 0, nivel_gate 14, fusionable false, activo true
--   obra 7e57c0de-...: estado 'aprobada', licencia y autor intactos
--   ledger: 079 'aplicada'
--
-- COMO SE APLICA (PowerShell, desde la raiz del repo)
--   node scripts/apply_sql_file.js db/migrations/079_cartas_artista_prueba_ugc.sql --dry-run
--   node scripts/apply_sql_file.js db/migrations/079_cartas_artista_prueba_ugc.sql --notas "cierre circuito UGC: obra aprobada + 1 carta artista"
--
-- ROLLBACK (documentado, NO se ejecuta; ADR-003 prohibe el borrado fisico y la
-- fila del ledger es la unica evidencia de que 079 corrio)
--   -- BEGIN;
--   --   UPDATE public.cartas_catalogo SET activo = false
--   --    WHERE id = 'car_artista_prueba';
--   --   UPDATE public.cartas_media SET estado_moderacion = 'pendiente'
--   --    WHERE id = '7e57c0de-0000-4000-8000-000000000075';
--   -- ROLLBACK;
--
-- ASCII-SAFE (ADR-002): cero bytes > 127, cero tildes, cero backticks.
-- ============================================================================

DO $m079$
DECLARE
  -- La obra de prueba de la 075 (id fijo y documentado alli).
  v_media   uuid := '7e57c0de-0000-4000-8000-000000000075'::uuid;
  -- La carta que crea esta migracion.
  v_carta   text := 'car_artista_prueba';
  v_nombre  text := 'Obra UGC de prueba';
  v_familia text := 'artista';
  v_subtipo text := 'grafica';
  v_rareza  text := 'raro';
  v_set     text := 'artistas_ugc';
  v_img     text := 'assets/cartas/consumible_pluma_creador.png';
  v_desc    text := 'PRUEBA UGC: edicion limitada vinculada a la obra [TEST] Rio de piedra. Dato de prueba, no es contenido real.';
  v_prim    text := 'oficio';
  v_precio  numeric(12,2) := 480.00;  -- 400 base raro x 1.2 artista (spec 4.2)
  v_gate    smallint := 14;           -- patron 071:270-274 para 'raro'
  v_supply  integer := 1000;          -- tirada de 4.3 para 'raro'
  v_stats   jsonb;
  v_autor   uuid;
  v_estado  text;
  v_lic     text;
  v_chk     text;
  v_cat_pre integer;
  v_cat_pos integer;
  v_ins     integer := 0;
  v_upd     integer := 0;
  v_ok      integer;
  v_otras   integer;
  v_subt    text[];
  v_md5     text;
BEGIN
  -- (0a) PRECONDICIONES: tablas y columnas (todas NOT NULL desde 069) --------
  IF to_regclass('public.cartas_catalogo') IS NULL THEN
    RAISE EXCEPTION 'MIG079 ABORTA: falta la tabla public.cartas_catalogo';
  END IF;

  IF to_regclass('public.cartas_media') IS NULL THEN
    RAISE EXCEPTION 'MIG079 ABORTA: falta la tabla public.cartas_media (067)';
  END IF;

  SELECT count(*) INTO v_ok
    FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'cartas_catalogo'
     AND column_name IN ('familia','subtipo','media_id','emisor_tipo',
                         'emisor_id','precio_xp','edicion','supply_max',
                         'emitidas','stats_json','fusionable','nivel_gate');

  IF v_ok <> 12 THEN
    RAISE EXCEPTION 'MIG079 ABORTA: cartas_catalogo no tiene las 12 columnas esperadas (tiene %); falta 066/060/069', v_ok;
  END IF;

  -- (0b) CONTRATO DEL CHECK DE LICENCIA (068:129-141) -----------------------
  SELECT pg_get_constraintdef(oid) INTO v_chk
    FROM pg_constraint
   WHERE conname = 'chk_cartas_media_licencia'
     AND conrelid = 'public.cartas_media'::regclass;

  IF v_chk IS NULL THEN
    RAISE EXCEPTION 'MIG079 ABORTA: falta 068 (chk_cartas_media_licencia)';
  END IF;

  IF position('aprobada' in v_chk) = 0 OR position('licencia' in v_chk) = 0 THEN
    RAISE EXCEPTION 'MIG079 ABORTA: chk_cartas_media_licencia no es el contrato fail-closed de 068: %', v_chk;
  END IF;

  -- (0c) CONTRATO DE LOS CHECKS DEL CATALOGO --------------------------------
  SELECT count(*) INTO v_ok
    FROM pg_constraint
   WHERE conrelid = 'public.cartas_catalogo'::regclass
     AND contype = 'c'
     AND conname IN ('chk_cartas_catalogo_precio','chk_cartas_catalogo_subtipo',
                     'chk_cartas_catalogo_emisor_coherente',
                     'chk_cartas_catalogo_fusionable',
                     'chk_cartas_catalogo_stats');

  IF v_ok <> 5 THEN
    RAISE EXCEPTION 'MIG079 ABORTA: faltan CHECKs del catalogo (% de 5 vivos)', v_ok;
  END IF;

  SELECT pg_get_constraintdef(oid) INTO v_chk
    FROM pg_constraint
   WHERE conname = 'chk_cartas_catalogo_subtipo'
     AND conrelid = 'public.cartas_catalogo'::regclass;

  IF position('artista' in v_chk) = 0 OR position('grafica' in v_chk) = 0 THEN
    RAISE EXCEPTION 'MIG079 ABORTA: chk_cartas_catalogo_subtipo no admite artista/grafica: %', v_chk;
  END IF;

  -- (0d) El subtipo elegido esta en la lista de lib/cartas-config.js --------
  v_subt := ARRAY['musica','cine','grafica','literatura'];

  IF NOT (v_subtipo = ANY (v_subt)) THEN
    RAISE EXCEPTION 'MIG079 ABORTA: subtipo % fuera de SUBTIPOS_CARTA.artista (%)',
      v_subtipo, array_to_string(v_subt, ',');
  END IF;

  -- (1) LA OBRA EXISTE ------------------------------------------------------
  SELECT estado_moderacion, autor_id, licencia
    INTO v_estado, v_autor, v_lic
    FROM cartas_media
   WHERE id = v_media;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'MIG079 ABORTA: la obra % no existe; aplicar antes la 075', v_media;
  END IF;

  -- (2) EL AUTOR NO ES NULL (emisor_id sale de aqui, no se inventa) --------
  IF v_autor IS NULL THEN
    RAISE EXCEPTION 'MIG079 ABORTA: la obra % tiene autor_id NULL; sin autor no hay emisor_id', v_media;
  END IF;

  -- (3) OTRAS OBRAS DE PRUEBA: avisa, no aborta -----------------------------
  SELECT count(*) INTO v_otras
    FROM cartas_media
   WHERE id <> v_media
     AND (titulo LIKE '[TEST]%' OR id::text LIKE '7e57c0de-%');

  IF v_otras > 0 THEN
    RAISE NOTICE 'MIG079 AVISO: cartas_media tiene % obra(s) de prueba ADEMAS de %; no se tocan', v_otras, v_media;
  END IF;

  -- (4) ESTADO DE PARTIDA: pendiente -> aprobada; rechazada/retirada ABORTA -
  IF v_estado IN ('rechazada','retirada') THEN
    RAISE EXCEPTION 'MIG079 ABORTA: la obra % esta %; revertir una decision humana no es de esta semilla', v_media, v_estado;
  END IF;

  IF v_estado = 'pendiente' THEN
    -- Sin filtro de licencia en el WHERE: si esta vacia, el 23514 del CHECK es
    -- el fail-closed (y aqui se traduce a mensaje legible por el bloque de
    -- abajo, sin silenciar el error de base).
    UPDATE cartas_media
       SET estado_moderacion = 'aprobada'
     WHERE id = v_media
       AND estado_moderacion = 'pendiente';

    GET DIAGNOSTICS v_upd = ROW_COUNT;
  ELSE
    v_upd := 0;
  END IF;

  -- (6) POST-APROBACION: la obra queda aprobada y activa --------------------
  SELECT count(*) INTO v_ok
    FROM cartas_media m
   WHERE m.id = v_media
     AND m.estado_moderacion = 'aprobada'
     AND m.activo = true
     AND m.autor_id IS NOT NULL
     AND m.licencia IS NOT NULL
     AND btrim(m.licencia) <> '';

  IF v_ok <> 1 THEN
    RAISE EXCEPTION 'MIG079 ABORTA: la obra % no queda aprobada, activa y con licencia (estado %, licencia %)',
      v_media, v_estado, coalesce(v_lic, 'NULL');
  END IF;

  -- (5) EL ID DE LA CARTA NO PUEDE EXISTIR CON OTRO CONTENIDO --------------
  SELECT count(*) INTO v_ok
    FROM cartas_catalogo c
   WHERE c.id = v_carta
     AND c.familia = v_familia
     AND c.subtipo = v_subtipo
     AND c.media_id = v_media;

  IF EXISTS (SELECT 1 FROM cartas_catalogo WHERE id = v_carta) AND v_ok <> 1 THEN
    RAISE EXCEPTION 'MIG079 ABORTA: el id % ya existe con OTRO contenido; no se pisa', v_carta;
  END IF;

  SELECT count(*) INTO v_cat_pre FROM cartas_catalogo;

  -- (7) LA CARTA ------------------------------------------------------------
  v_stats := jsonb_build_object(
    'primario', v_prim,
    'alcance', 3,
    'oficio', 5,
    'fortuna', 0,
    'rendimiento', 0
  );

  INSERT INTO cartas_catalogo (
    id, nombre, set_slug, rareza, nivel_gate, es_evento, imagen_url, activo,
    emisor_tipo, emisor_id, descripcion, stats_json, fusionable,
    familia, subtipo, precio_xp, edicion, supply_max, emitidas,
    media_id, es_canjeable_qr, set_coleccion
  )
  VALUES (
    v_carta, v_nombre, v_set, v_rareza, v_gate, false, v_img, true,
    'ugc', v_autor, v_desc, v_stats, false,
    v_familia, v_subtipo, v_precio, 'limitada', v_supply, 0,
    v_media, false, false
  )
  ON CONFLICT (id) DO NOTHING;

  GET DIAGNOSTICS v_ins = ROW_COUNT;

  -- (8) VERIFICACION POST: la carta entera, columna por columna ------------
  SELECT count(*) INTO v_ok
    FROM cartas_catalogo c
   WHERE c.id = v_carta
     AND c.familia = v_familia
     AND c.subtipo = v_subtipo
     AND c.rareza = v_rareza
     AND c.media_id = v_media
     AND c.emisor_tipo = 'ugc'
     AND c.emisor_id = (SELECT autor_id FROM cartas_media WHERE id = v_media)
     AND c.emisor_id = v_autor
     AND c.edicion = 'limitada'
     AND c.supply_max = v_supply
     AND c.emitidas = 0
     AND c.precio_xp = v_precio
     AND c.nivel_gate = v_gate
     AND c.set_slug = v_set
     AND c.es_evento = false
     AND c.es_canjeable_qr = false
     AND c.set_coleccion = false
     AND c.fusionable = false
     AND c.activo = true
     AND c.stats_json ? 'primario'
     AND c.stats_json ->> 'primario' = v_prim
     AND (c.stats_json ->> 'oficio')::numeric = 5
     AND (c.stats_json ->> 'alcance')::numeric = 3
     AND NOT (c.stats_json ? 'presencia')
     AND NOT (c.stats_json ? 'sku')
     AND NOT (c.stats_json ? 'estado_iucn');

  IF v_ok <> 1 THEN
    RAISE EXCEPTION 'MIG079 ABORTA: la carta % no cumple el contrato completo (media_id, emisor, stats, valor)', v_carta;
  END IF;

  -- (8b) Guardas puntuales con mensaje propio (diagnostico, no solo "no cumple")
  IF (SELECT precio_xp FROM cartas_catalogo WHERE id = v_carta) <= 0 THEN
    RAISE EXCEPTION 'MIG079 ABORTA: precio_xp de % debe ser > 0 (chk_cartas_catalogo_precio)', v_carta;
  END IF;

  IF (SELECT media_id FROM cartas_catalogo WHERE id = v_carta) IS DISTINCT FROM v_media THEN
    RAISE EXCEPTION 'MIG079 ABORTA: media_id de % no coincide con la obra %', v_carta, v_media;
  END IF;

  IF (SELECT emisor_id FROM cartas_catalogo WHERE id = v_carta) IS DISTINCT FROM v_autor THEN
    RAISE EXCEPTION 'MIG079 ABORTA: emisor_id de % no es el autor_id de la obra (% vs %)', v_carta, (SELECT autor_id FROM cartas_media WHERE id = v_media), v_autor;
  END IF;

  -- (9) DESCUADRE DE FILAS --------------------------------------------------
  SELECT count(*) INTO v_cat_pos FROM cartas_catalogo;

  IF v_cat_pos <> v_cat_pre + v_ins THEN
    RAISE EXCEPTION 'MIG079 ABORTA: catalogo % -> % con % insertada(s); descuadre', v_cat_pre, v_cat_pos, v_ins;
  END IF;

  -- (10) HUELLA: md5 de la fila (la 2a corrida debe imprimir el mismo) ------
  SELECT md5(t::text) INTO v_md5
    FROM (SELECT c.id, c.nombre, c.set_slug, c.rareza, c.nivel_gate, c.es_evento,
                 c.imagen_url, c.activo, c.emisor_tipo, c.emisor_id,
                 c.descripcion, c.stats_json, c.fusionable, c.familia,
                 c.subtipo, c.precio_xp, c.edicion, c.supply_max, c.emitidas,
                 c.media_id
            FROM cartas_catalogo c WHERE c.id = v_carta) t;

  RAISE NOTICE 'MIG079 OK: obra % estado=% autor=% licencia=% (obra_update=% fila)',
    v_media, (SELECT estado_moderacion FROM cartas_media WHERE id = v_media), v_autor, v_lic, v_upd;
  RAISE NOTICE 'MIG079 OK: carta % insertada=% subtipo=% rareza=% precio=% supply=% gate=%',
    v_carta, v_ins, v_subtipo, v_rareza, v_precio, v_supply, v_gate;
  RAISE NOTICE 'MIG079 OK: catalogo % -> % | artista=% | con media_id=%',
    v_cat_pre, v_cat_pos,
    (SELECT count(*) FROM cartas_catalogo WHERE familia = 'artista'),
    (SELECT count(*) FROM cartas_catalogo WHERE media_id IS NOT NULL);
  RAISE NOTICE 'MIG079 OK: md5 de la carta = %', v_md5;
END
$m079$;
