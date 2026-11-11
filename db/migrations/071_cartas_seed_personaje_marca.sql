-- ============================================================================
-- Migration 071: cartas - SEED de las familias de JUEGO personaje y marca
--   (8 personaje + 6 marca = 14 cartas con familia, subtipo, stats_json,
--   precio_xp, supply_max y edicion resueltos de una sola vez).
-- Fecha: 2026-11-11
-- Referencias: ADR-121, ADR-002 (ASCII-safe), ADR-003 (cero borrado fisico),
--   ADR-006 (el archivo real manda), ADR-008 (idempotencia), ADR-035 (XP).
-- Requiere, ya APLICADAS y con fila valida en schema_migrations:
--   066 (familia/subtipo/edicion/supply_max/emitidas/precio_xp + CHECKs),
--   068 (precio_xp numeric(12,2)),
--   069 (familia NOT NULL),
--   070 (precio/supply de las 24 lugar; es el PREDECESOR INMEDIATO).
-- Contrato: docs/superpowers/specs/2026-11-11-cartas-familias-stats-supply-design.md
--   2.1 (familias y subtipos: personaje = historico|ficcion|folclor,
--        marca = licor|gastronomia|artesania|otra),
--   3.2 (puntos por rareza 4/8/14/24 y reparto primario/secundario:
--        personaje oficio+rendimiento, marca rendimiento+alcance),
--   3.3 (vector stats_json con primario autoral + los 4 ejes jugables),
--   4.1/4.2 (precio_xp), 4.3 (pesos de tirada = supply_max).
--
-- PROPOSITO
--   Las 31 cartas actuales son 24 lugar + 3 consumible + 4 producto. Por
--   familia eso deja el catalogo SIN cartas de ninguna familia de juego que
--   alimente oficio ni rendimiento (spec 3.1, hecho medido), asi que:
--     - el eje oficio no tiene cartas que lo aporten y no hay consumidor de la
--       rama de expedicion 'obra';
--     - el eje rendimiento lo mismo con la rama 'economia'.
--   Esta migracion no toca el motor: solo mete en el catalogo 14 cartas con
--   los dos ejes que faltaban y con precio y tirada, para que las ramas se
--   puedan habilitar en fase 4 sin inventar datos en el handler.
--   artista NO se siembra aqui: por diseno solo nace de UGC aprobado
--   (emisor_tipo='ugc'); sin obras aprobadas no hay cartas de artista, y eso
--   es correcto, no un olvido.
--
-- REPARTO DE RAREZA (suma 14: 5 comun / 4 raro / 3 epico / 2 dorado)
--   personaje : 3 comun + 2 raro + 2 epico + 1 dorado = 8
--   marca     : 2 comun + 2 raro + 1 epico + 1 dorado = 6
--   Las DOS familias llevan dorado (1 cada una). El reparto lo permite y se
--   aplica: ninguna familia queda sin carta de tirada alta.
--   Subtipos: personaje usa ficcion (5) y folclor (3). historico queda a 0
--   a proposito: no hay ninguna persona historica nombrada en la lore del
--   repo y ponerle un nombre seria inventar IP nueva, que el encargo prohibe.
--
-- PRECIO Y TIRADA
--   Tabla VIGENTE del catalogo (la misma de las 24 lugar de la 070), que es
--   tambien la del encargo:
--     rareza   precio_xp   supply_max   edicion    nivel_gate
--     comun        150.00         5000   limitada          10
--     raro         400.00         1000   limitada          14
--     epico       1000.00          250   limitada          20
--     dorado      2500.00           50   limitada          25
--   nivel_gate: 10/14/20/25 es la escala QUE YA USAN las 24 lugar
--   (territorio_mundana=10, territorio_explorador=14, territorio_cronista=20,
--   territorio_leyenda=25). No se inventa escala nueva. Las 6 ct_comun_* tienen
--   nivel_gate NULL porque son el set fusionable del sistema.
--   NOTA DE CONTRATO (divergencia declarada, no silenciada): la spec 4.2 fija
--   multiplicadores por familia (personaje 1,2 -> 180/480/1200/3000 y marca
--   1,5 -> 225/600/1500/3750) y dice que viven en lib/cartas-config.js
--   (CARTA_MULT_FAMILIA). MEDIDO antes de escribir esto: esas constantes NO
--   existen hoy en el repo (0 coincidencias de CARTA_MULT_FAMILIA y de
--   CARTA_PRECIO_BASE_XP en lib/ y api/). Escribir 180 o 225 aqui seria una
--   SEGUNDA autoridad del precio frente al catalogo y frente al handler. Se
--   siembra la tabla vigente (150/400/1000/2500) y el precio por familia queda
--   como deuda para quien implemente CARTA_MULT_FAMILIA (UPDATE, no esquema).
--
-- FUSIONABLE (divergencia declarada)
--   La spec 2.1 marca personaje como Fusionable = Si. El CHECK VIVO
--   chk_cartas_catalogo_fusionable exige, para fusionable = true,
--   nivel_gate IS NULL. Como el encargo exige nivel_gate coherente con la
--   rareza, las 14 cartas se siembran fusionable = false, que es ademas el
--   patron mayoritario del catalogo (25 de 31) y el unico que admite marca
--   (la spec 2.1 regla 4 lo exige). Si el operador prefiere fusionables,
--   es un UPDATE de datos + nivel_gate NULL, no esquema.
--
-- IDS
--   Prefijo NUEVO y disjunto del backfill: cp_<slug> (personaje) y cm_<slug>
--   (marca). Comprobado en Neon antes de escribir: 0 filas con id LIKE 'cp_%'
--   o 'cm_%' en cartas_catalogo. ASCII, minusculas, sin tildes.
--
-- IMAGENES (reuso verificado, sin URLs nuevas)
--   Las 24 lugar tienen imagen_url NULL: el arte del catalogo se resuelve por
--   cartas-arte.js. Las 4 producto si llevan ruta relativa
--   (assets/cartas/marca_ancestral.png), y ese es el formato que se copia.
--   En el repo solo existen 5 laminas en assets/cartas/ y las CINCO responden
--   HEAD 200 en produccion (https://exploraco.vercel.app/assets/cartas/...):
--     consumible_catalejo_explorador.png, consumible_lente_artista.png,
--     consumible_lupa_curador.png, consumible_pluma_creador.png,
--     marca_ancestral.png
--   Las 6 marca usan la lamina de marca (marca_ancestral.png) y las 8
--   personaje reutilizan las 4 laminas de herramienta como arte provisional.
--   Cero URLs inventadas: si una lamina nueva no existe, no se referencia.
--   cartas-arte.js recibe las 14 claves con el mismo formato de las existentes.
--
-- IDEMPOTENCIA (ADR-008)
--   INSERT ... ON CONFLICT (id) DO NOTHING. Cero UPDATE, cero DELETE, cero
--   TRUNCATE. La segunda corrida inserta 0 filas y deja el catalogo identico
--   (md5 de la tabla antes = despues). Los RAISE de precondicion y de
--   postcondicion se cumplen tambien en la segunda corrida porque se calculan
--   sobre ids absolutos, no sobre "filas nuevas de esta corrida".
--
-- PRE / POST
--   PRE : 31 cartas (24 lugar + 3 consumible + 4 producto), 0 con prefijo
--         cp_/cm_, ledger 070 en 'aplicada'.
--   POST: 45 cartas = 24 lugar + 3 consumible + 4 producto + 8 personaje
--         + 6 marca. 14/14 con precio_xp > 0, supply_max > 0,
--         edicion = 'limitada', stats_json con los 4 ejes, activo = true,
--         emitidas = 0 < supply_max. 14/14 comprables (carta_acunar exige
--         precio_xp > 0, activo y stock).
--
-- ROLLBACK (comentado; NO ejecutar desde el runner; ADR-003 no permite borrar
--   filas con historia: si alguna de las 14 ya tiene usuarios_cartas, o
--   cartas_ofertas, o usuarios_cartas_nivel, el rollback debe ser activo=false,
--   nunca DELETE. Solo un catalogo sin uso se puede retirar.)
--   -- BEGIN;
--   -- DELETE FROM cartas_catalogo
--   --  WHERE id IN ('cp_cronista_rutas', 'cp_guia_ocultos',
--   --   'cp_mohan_rios', 'cp_patasola', 'cp_embajador_parche',
--   --   'cp_madremonte', 'cp_maestro_grafica', 'cp_leyenda_jaguar',
--   --   'cm_ancestral_clasico', 'cm_tienda_parche', 'cm_cafe_curador',
--   --   'cm_ancestral_anejo', 'cm_taller_grafica',
--   --   'cm_ancestral_gran_reserva')
--   --   AND NOT EXISTS (SELECT 1 FROM usuarios_cartas u WHERE u.carta_id = cartas_catalogo.id);
--   -- DELETE FROM schema_migrations WHERE numero = 71;
--   -- COMMIT;
--
-- NOTA: este fichero NO escribe schema_migrations; lo hace el runner
--   (contrato de la 045, igual que la 070).
-- ============================================================================

DO $mig071$
DECLARE
  -- Semilla completa. Cada objeto declara SOLO lo que es autoral (nombre,
  -- familia, subtipo, rareza, ejes, imagen, descripcion); precio, supply,
  -- edicion, emitidas, activo, es_evento, emisor_tipo y fusionable se
  -- derivan de la tabla aprobada para que no haya dos fuentes del mismo dato.
  v_seed jsonb := '[
    {"id":"cp_cronista_rutas","nombre":"Cronista de Rutas","familia":"personaje","subtipo":"ficcion","rareza":"comun","nivel_gate":10,"precio_xp":150,"supply_max":5000,"primario":"oficio","alcance":0,"oficio":3,"fortuna":0,"rendimiento":1,"imagen_url":"assets/cartas/consumible_pluma_creador.png","set_slug":"personajes_elenco","descripcion":"Cronista de la rama Rutas: convierte cada viaje en bitacora y cada bitacora en obra."},
    {"id":"cp_guia_ocultos","nombre":"Guia de los Ocultos","familia":"personaje","subtipo":"ficcion","rareza":"comun","nivel_gate":10,"precio_xp":150,"supply_max":5000,"primario":"oficio","alcance":0,"oficio":3,"fortuna":0,"rendimiento":1,"imagen_url":"assets/cartas/consumible_lupa_curador.png","set_slug":"personajes_elenco","descripcion":"Guia de la rama Ocultos: encuentra el patrimonio que no aparece en los mapas."},
    {"id":"cp_mohan_rios","nombre":"El Mohan de los Rios","familia":"personaje","subtipo":"folclor","rareza":"comun","nivel_gate":10,"precio_xp":150,"supply_max":5000,"primario":"oficio","alcance":0,"oficio":3,"fortuna":0,"rendimiento":1,"imagen_url":"assets/cartas/consumible_catalejo_explorador.png","set_slug":"personajes_elenco","descripcion":"Duende de los rios de la lore oral: guarda el oro que la corriente no se llevo."},
    {"id":"cp_patasola","nombre":"La Patasola","familia":"personaje","subtipo":"folclor","rareza":"raro","nivel_gate":14,"precio_xp":400,"supply_max":1000,"primario":"oficio","alcance":0,"oficio":5,"fortuna":0,"rendimiento":3,"imagen_url":"assets/cartas/consumible_lente_artista.png","set_slug":"personajes_elenco","descripcion":"Leyenda del monte: una sola pata y mil historias para quien se pierde de noche."},
    {"id":"cp_embajador_parche","nombre":"Embajador del Parche","familia":"personaje","subtipo":"ficcion","rareza":"raro","nivel_gate":14,"precio_xp":400,"supply_max":1000,"primario":"oficio","alcance":0,"oficio":5,"fortuna":0,"rendimiento":3,"imagen_url":"assets/cartas/consumible_pluma_creador.png","set_slug":"personajes_elenco","descripcion":"Embajador de la rama Parche: abre planes y reune a la comunidad en una mesa."},
    {"id":"cp_madremonte","nombre":"La Madremonte","familia":"personaje","subtipo":"folclor","rareza":"epico","nivel_gate":20,"precio_xp":1000,"supply_max":250,"primario":"oficio","alcance":0,"oficio":9,"fortuna":0,"rendimiento":5,"imagen_url":"assets/cartas/consumible_catalejo_explorador.png","set_slug":"personajes_elenco","descripcion":"Guardiana del monte: castiga al que tala sin permiso y premia al que respeta."},
    {"id":"cp_maestro_grafica","nombre":"Maestro de la Grafica","familia":"personaje","subtipo":"ficcion","rareza":"epico","nivel_gate":20,"precio_xp":1000,"supply_max":250,"primario":"oficio","alcance":0,"oficio":9,"fortuna":0,"rendimiento":5,"imagen_url":"assets/cartas/consumible_lente_artista.png","set_slug":"personajes_elenco","descripcion":"Maestro de la rama Grafica: ensena tecnica, corrige trazo y firma con sello propio."},
    {"id":"cp_leyenda_jaguar","nombre":"Leyenda de la Casa Jaguar","familia":"personaje","subtipo":"ficcion","rareza":"dorado","nivel_gate":25,"precio_xp":2500,"supply_max":50,"primario":"oficio","alcance":0,"oficio":14,"fortuna":0,"rendimiento":10,"imagen_url":"assets/cartas/consumible_lupa_curador.png","set_slug":"personajes_elenco","descripcion":"La leyenda de la Casa Jaguar: el nombre que se gana al cerrar la rama completa."},
    {"id":"cm_ancestral_clasico","nombre":"Ancestral Clasico","familia":"marca","subtipo":"licor","rareza":"comun","nivel_gate":10,"precio_xp":150,"supply_max":5000,"primario":"rendimiento","alcance":1,"oficio":0,"fortuna":0,"rendimiento":3,"imagen_url":"assets/cartas/marca_ancestral.png","set_slug":"marcas_aliadas","descripcion":"Botella base de la marca Ancestral: la primera que llega al mostrador de la casa."},
    {"id":"cm_tienda_parche","nombre":"Tienda del Parche","familia":"marca","subtipo":"otra","rareza":"comun","nivel_gate":10,"precio_xp":150,"supply_max":5000,"primario":"rendimiento","alcance":1,"oficio":0,"fortuna":0,"rendimiento":3,"imagen_url":"assets/cartas/marca_ancestral.png","set_slug":"marcas_aliadas","descripcion":"Tienda de barrio aliada: el punto donde la comunidad cambia planes por XP."},
    {"id":"cm_cafe_curador","nombre":"Cafe del Curador","familia":"marca","subtipo":"gastronomia","rareza":"raro","nivel_gate":14,"precio_xp":400,"supply_max":1000,"primario":"rendimiento","alcance":3,"oficio":0,"fortuna":0,"rendimiento":5,"imagen_url":"assets/cartas/marca_ancestral.png","set_slug":"marcas_aliadas","descripcion":"Cafeteria de los curadores: la mesa donde se cierran las colecciones."},
    {"id":"cm_ancestral_anejo","nombre":"Ancestral Anejo","familia":"marca","subtipo":"licor","rareza":"raro","nivel_gate":14,"precio_xp":400,"supply_max":1000,"primario":"rendimiento","alcance":3,"oficio":0,"fortuna":0,"rendimiento":5,"imagen_url":"assets/cartas/marca_ancestral.png","set_slug":"marcas_aliadas","descripcion":"Ancestral anejo: la botella que se guarda para la celebracion de la casa."},
    {"id":"cm_taller_grafica","nombre":"Taller de Grafica","familia":"marca","subtipo":"artesania","rareza":"epico","nivel_gate":20,"precio_xp":1000,"supply_max":250,"primario":"rendimiento","alcance":5,"oficio":0,"fortuna":0,"rendimiento":9,"imagen_url":"assets/cartas/marca_ancestral.png","set_slug":"marcas_aliadas","descripcion":"Taller aliado de artesania grafica: imprime laminas y marcos del museo."},
    {"id":"cm_ancestral_gran_reserva","nombre":"Ancestral Gran Reserva","familia":"marca","subtipo":"licor","rareza":"dorado","nivel_gate":25,"precio_xp":2500,"supply_max":50,"primario":"rendimiento","alcance":10,"oficio":0,"fortuna":0,"rendimiento":14,"imagen_url":"assets/cartas/marca_ancestral.png","set_slug":"marcas_aliadas","descripcion":"Ancestral gran reserva: la pieza de vitrina de la marca, edicion de 50."}
  ]'::jsonb;

  v_n int;
  v_otros_antes int;
  v_otros_despues int;
  v_txt text;
  v_ins int;
BEGIN
  -- (0) PRECONDICION DE ESQUEMA: columnas de 066 / 068 / 069 ----------------
  SELECT count(*) INTO v_n
    FROM information_schema.columns
   WHERE table_schema = 'public'
     AND table_name = 'cartas_catalogo'
     AND column_name IN ('familia', 'subtipo', 'stats_json', 'precio_xp',
                         'supply_max', 'edicion', 'emitidas', 'imagen_url');
  IF v_n <> 8 THEN
    RAISE EXCEPTION 'MIG071: faltan columnas de 066/068/069 (encontradas % de 8)', v_n;
  END IF;

  -- (0b) PREDECESOR: la 070 tiene que estar en el ledger --------------------
  SELECT count(*) INTO v_n
    FROM schema_migrations
   WHERE nombre = '070_cartas_seed_precio_supply_lugar.sql'
     AND resultado = 'aplicada';
  IF v_n <> 1 THEN
    RAISE EXCEPTION 'MIG071 ABORTA: la 070 no tiene fila aplicada en schema_migrations; no se siembra sobre un catalogo sin precio';
  END IF;

  -- (0c) CARTA DE NAVEGACION: 14 filas ni una mas ---------------------------
  IF jsonb_array_length(v_seed) <> 14 THEN
    RAISE EXCEPTION 'MIG071 ABORTA: el seed trae % cartas y el contrato fija 14',
      jsonb_array_length(v_seed);
  END IF;

  -- (1) GUARDA DE IDS: formato cp_/cm_, ascii, sin duplicados --------------
  SELECT string_agg(id, ', ') INTO v_txt
    FROM jsonb_to_recordset(v_seed) AS x(id text)
   WHERE x.id IS NULL
      OR x.id !~ '^(cp|cm)_[a-z0-9_]+$';
  IF v_txt IS NOT NULL THEN
    RAISE EXCEPTION 'MIG071 ABORTA: ids con formato invalido (se exige cp_/cm_ + ascii minusculas): %', v_txt;
  END IF;

  SELECT string_agg(id, ', ') INTO v_txt
    FROM (SELECT id FROM jsonb_to_recordset(v_seed) AS x(id text)
           GROUP BY id HAVING count(*) > 1) d;
  IF v_txt IS NOT NULL THEN
    RAISE EXCEPTION 'MIG071 ABORTA: ids duplicados dentro del seed: %', v_txt;
  END IF;

  -- (2) GUARDA DE COLISION: un id del seed que YA exista debe ser la MISMA
  -- carta (familia y nombre). Si difiere, no es una repeticion: es una
  -- colision y se para antes de insertar.
  SELECT string_agg(x.id, ', ') INTO v_txt
    FROM jsonb_to_recordset(v_seed) AS x(id text, nombre text, familia text)
    JOIN cartas_catalogo c ON c.id = x.id
   WHERE c.familia <> x.familia OR c.nombre <> x.nombre;
  IF v_txt IS NOT NULL THEN
    RAISE EXCEPTION 'MIG071 ABORTA: ids del seed que ya existen con OTRA familia/nombre (colision): %', v_txt;
  END IF;

  -- (3) GUARDA DE FAMILIA Y SUBTIPO (espejo de lib/cartas-config.js:60-68 y
  -- de chk_cartas_catalogo_subtipo). Aqui no hay familia fuera de las dos.
  SELECT string_agg(x.id, ', ') INTO v_txt
    FROM jsonb_to_recordset(v_seed) AS x(id text, familia text, subtipo text)
   WHERE x.familia IS NULL
      OR x.subtipo IS NULL
      OR btrim(x.subtipo) = ''
      OR NOT (   (x.familia = 'personaje' AND x.subtipo IN ('historico', 'ficcion', 'folclor'))
              OR (x.familia = 'marca'     AND x.subtipo IN ('licor', 'gastronomia', 'artesania', 'otra')) );
  IF v_txt IS NOT NULL THEN
    RAISE EXCEPTION 'MIG071 ABORTA: familia/subtipo invalido o vacio en: %', v_txt;
  END IF;

  -- (4) GUARDA DE EJES: entero, >= 0 y <= CARTA_STATS_TOPE (40) ------------
  SELECT string_agg(x.id, ', ') INTO v_txt
    FROM jsonb_to_recordset(v_seed) AS x(id text, alcance smallint, oficio smallint,
                                         fortuna smallint, rendimiento smallint)
   WHERE x.alcance     IS NULL OR x.alcance     < 0 OR x.alcance     > 40
      OR x.oficio      IS NULL OR x.oficio      < 0 OR x.oficio      > 40
      OR x.fortuna     IS NULL OR x.fortuna     < 0 OR x.fortuna     > 40
      OR x.rendimiento IS NULL OR x.rendimiento < 0 OR x.rendimiento > 40;
  IF v_txt IS NOT NULL THEN
    RAISE EXCEPTION 'MIG071 ABORTA: eje fuera de rango 0..40 o nulo en: %', v_txt;
  END IF;

  -- (5) GUARDA DE REPARTO 3.2: puntos por rareza y eje primario por familia -
  --     personaje: primario oficio,    secundario rendimiento
  --     marca    : primario rendimiento, secundario alcance
  --     comun 3/1, raro 5/3, epico 9/5, dorado 14/10 y los otros dos ejes a 0.
  SELECT string_agg(x.id, ', ') INTO v_txt
    FROM jsonb_to_recordset(v_seed) AS x(id text, familia text, rareza text, primario text,
                                         alcance smallint, oficio smallint,
                                         fortuna smallint, rendimiento smallint)
    LEFT JOIN (VALUES
        ('personaje', 'comun',  'oficio',      0::smallint, 3::smallint, 0::smallint,  1::smallint),
        ('personaje', 'raro',   'oficio',      0::smallint, 5::smallint, 0::smallint,  3::smallint),
        ('personaje', 'epico',  'oficio',      0::smallint, 9::smallint, 0::smallint,  5::smallint),
        ('personaje', 'dorado', 'oficio',      0::smallint, 14::smallint, 0::smallint, 10::smallint),
        ('marca',     'comun',  'rendimiento', 1::smallint, 0::smallint, 0::smallint,  3::smallint),
        ('marca',     'raro',   'rendimiento', 3::smallint, 0::smallint, 0::smallint,  5::smallint),
        ('marca',     'epico',  'rendimiento', 5::smallint, 0::smallint, 0::smallint,  9::smallint),
        ('marca',     'dorado', 'rendimiento', 10::smallint, 0::smallint, 0::smallint, 14::smallint)
      ) AS m(familia, rareza, primario, e_alc, e_ofi, e_for, e_ren)
      ON m.familia = x.familia AND m.rareza = x.rareza
   WHERE m.familia IS NULL
      OR x.primario IS DISTINCT FROM m.primario
      OR x.alcance     IS DISTINCT FROM m.e_alc
      OR x.oficio      IS DISTINCT FROM m.e_ofi
      OR x.fortuna     IS DISTINCT FROM m.e_for
      OR x.rendimiento IS DISTINCT FROM m.e_ren;
  IF v_txt IS NOT NULL THEN
    RAISE EXCEPTION 'MIG071 ABORTA: reparto de stats fuera del contrato 3.2 en: %', v_txt;
  END IF;

  -- (6) GUARDA DE VALOR: precio > 0, supply > 0 y la tabla por rareza ------
  SELECT string_agg(x.id, ', ') INTO v_txt
    FROM jsonb_to_recordset(v_seed) AS x(id text, rareza text, precio_xp numeric,
                                         supply_max integer, nivel_gate smallint)
    LEFT JOIN (VALUES
        ('comun',   150.00::numeric(12,2), 5000, 10::smallint),
        ('raro',    400.00::numeric(12,2), 1000, 14::smallint),
        ('epico',  1000.00::numeric(12,2),  250, 20::smallint),
        ('dorado', 2500.00::numeric(12,2),   50, 25::smallint)
      ) AS m(rareza, precio_xp, supply_max, nivel_gate) ON m.rareza = x.rareza
   WHERE x.precio_xp  IS NULL OR x.precio_xp  <= 0
      OR x.supply_max IS NULL OR x.supply_max <= 0
      OR m.rareza IS NULL
      OR x.precio_xp  IS DISTINCT FROM m.precio_xp
      OR x.supply_max IS DISTINCT FROM m.supply_max
      OR x.nivel_gate IS DISTINCT FROM m.nivel_gate;
  IF v_txt IS NOT NULL THEN
    RAISE EXCEPTION 'MIG071 ABORTA: precio/supply/nivel_gate fuera de la tabla por rareza en: %', v_txt;
  END IF;

  -- (7) EDICION: no viaja en el seed a proposito. Se escribe literal
  -- 'limitada' en el INSERT (un solo valor posible) y el post (14) verifica
  -- las 14 filas contra c.edicion <> 'limitada'. Asi no hay un segundo sitio
  -- donde la edicion pueda divergir del contrato.
  -- (8) D-5 CERRADA: ningun eje multiplica XP. El stats_json del seed solo
  -- lleva primario + los 4 ejes; el post (13) verifica en la base que ninguna
  -- de las 14 filas tenga las claves presencia, sku o bonus_xp_pct.

  -- (9) INVARIANTE DE NO DESTRUCCION: cuantas filas hay fuera del seed ANTES
  -- (24 lugar + 3 consumible + 4 producto = 31). Se compara despues del
  -- insert: esta migracion no puede crear ni borrar nada ajeno al seed.
  SELECT count(*) INTO v_otros_antes
    FROM cartas_catalogo c
   WHERE c.id NOT IN (SELECT id FROM jsonb_to_recordset(v_seed) AS x(id text));

  -- (10) INSERT: ON CONFLICT (id) DO NOTHING. Los CHECK vivos de 066 hacen de
  -- segunda red; los guards de arriba existen para fallar con mensaje legible
  -- y ANTES (RAISE, no NOTICE).
  INSERT INTO cartas_catalogo (
    id, nombre, set_slug, rareza, nivel_gate, es_evento, imagen_url, activo,
    emisor_tipo, descripcion, stats_json, fusionable, familia, subtipo,
    precio_xp, edicion, supply_max, emitidas
  )
  SELECT r.id, r.nombre, r.set_slug, r.rareza, r.nivel_gate, false,
         r.imagen_url, true, 'sistema', r.descripcion,
         jsonb_build_object('primario', r.primario,
                            'alcance', r.alcance, 'oficio', r.oficio,
                            'fortuna', r.fortuna, 'rendimiento', r.rendimiento),
         false, r.familia, r.subtipo,
         r.precio_xp, 'limitada', r.supply_max, 0
    FROM jsonb_to_recordset(v_seed) AS r(
           id text, nombre text, familia text, subtipo text, rareza text,
           nivel_gate smallint, precio_xp numeric, supply_max integer,
           primario text, alcance smallint, oficio smallint, fortuna smallint,
           rendimiento smallint, imagen_url text, set_slug text, descripcion text)
  ON CONFLICT (id) DO NOTHING;
  GET DIAGNOSTICS v_ins = ROW_COUNT;

  -- (11) POST: no se toco nada ajeno --------------------------------------
  SELECT count(*) INTO v_otros_despues
    FROM cartas_catalogo c
   WHERE c.id NOT IN (SELECT id FROM jsonb_to_recordset(v_seed) AS x(id text));
  IF v_otros_despues <> v_otros_antes THEN
    RAISE EXCEPTION 'MIG071 ABORTA: filas ajenas al seed % -> % (no puede cambiar)', v_otros_antes, v_otros_despues;
  END IF;
  IF v_otros_antes < 31 THEN
    RAISE EXCEPTION 'MIG071 ABORTA: el catalogo previo trae % filas fuera del seed y el pre medido es 31', v_otros_antes;
  END IF;

  -- (12) POST: las 14 existen ---------------------------------------------
  SELECT count(*) INTO v_n
    FROM cartas_catalogo c
   WHERE c.id IN (SELECT id FROM jsonb_to_recordset(v_seed) AS x(id text));
  IF v_n <> 14 THEN
    RAISE EXCEPTION 'MIG071 ABORTA: quedaron % de 14 cartas nuevas', v_n;
  END IF;

  -- (13) POST: familia/subtipo/stats no vacios y sin sku en personaje -----
  SELECT string_agg(c.id, ', ') INTO v_txt
    FROM cartas_catalogo c
   WHERE c.id IN (SELECT id FROM jsonb_to_recordset(v_seed) AS x(id text))
     AND (c.familia IS NULL OR btrim(c.familia) = ''
       OR c.subtipo IS NULL OR btrim(c.subtipo) = ''
       OR c.familia NOT IN ('personaje', 'marca')
       OR jsonb_typeof(c.stats_json) <> 'object'
       OR c.stats_json = '{}'::jsonb
       OR (c.stats_json - 'primario' - 'alcance' - 'oficio' - 'fortuna' - 'rendimiento') <> '{}'::jsonb
       OR c.stats_json ? 'presencia'
       OR c.stats_json ? 'sku'
       OR c.stats_json ? 'bonus_xp_pct');
  IF v_txt IS NOT NULL THEN
    RAISE EXCEPTION 'MIG071 ABORTA: familia/subtipo/stats_json invalido en: %', v_txt;
  END IF;

  SELECT string_agg(c.id, ', ') INTO v_txt
    FROM cartas_catalogo c
   WHERE c.id IN (SELECT id FROM jsonb_to_recordset(v_seed) AS x(id text))
     AND c.familia = 'personaje'
     AND c.stats_json ? 'sku';
  IF v_txt IS NOT NULL THEN
    RAISE EXCEPTION 'MIG071 ABORTA: personaje con stats_json.sku (solo producto): %', v_txt;
  END IF;

  -- (14) POST: valor y disponibilidad -------------------------------------
  SELECT string_agg(c.id, ', ') INTO v_txt
    FROM cartas_catalogo c
   WHERE c.id IN (SELECT id FROM jsonb_to_recordset(v_seed) AS x(id text))
     AND (c.precio_xp IS NULL OR c.precio_xp <= 0
       OR c.supply_max IS NULL OR c.supply_max <= 0
       OR c.edicion <> 'limitada'
       OR c.activo = false
       OR c.es_evento = true
       OR c.emisor_tipo <> 'sistema'
       OR c.fusionable = true
       OR c.emitidas < 0
       OR c.emitidas >= c.supply_max
       OR c.imagen_url IS NULL OR btrim(c.imagen_url) = '');
  IF v_txt IS NOT NULL THEN
    RAISE EXCEPTION 'MIG071 ABORTA: precio/supply/edicion/activo/imagen invalido en: %', v_txt;
  END IF;

  -- (15) POST: reparto por familia (8 / 6) y rareza (5 / 4 / 3 / 2) --------
  SELECT string_agg(familia || '=' || n, ', ') INTO v_txt FROM (
    SELECT c.familia, count(*)::text AS n
      FROM cartas_catalogo c
     WHERE c.id IN (SELECT id FROM jsonb_to_recordset(v_seed) AS x(id text))
     GROUP BY c.familia) q
   WHERE NOT ((familia = 'personaje' AND n = '8') OR (familia = 'marca' AND n = '6'));
  IF v_txt IS NOT NULL THEN
    RAISE EXCEPTION 'MIG071 ABORTA: reparto por familia fuera de 8/6: %', v_txt;
  END IF;

  SELECT string_agg(rareza || '=' || n, ', ') INTO v_txt FROM (
    SELECT c.rareza, count(*)::text AS n
      FROM cartas_catalogo c
     WHERE c.id IN (SELECT id FROM jsonb_to_recordset(v_seed) AS x(id text))
     GROUP BY c.rareza) q
   WHERE NOT ((rareza = 'comun' AND n = '5')
           OR (rareza = 'raro' AND n = '4')
           OR (rareza = 'epico' AND n = '3')
           OR (rareza = 'dorado' AND n = '2'));
  IF v_txt IS NOT NULL THEN
    RAISE EXCEPTION 'MIG071 ABORTA: reparto por rareza fuera de 5/4/3/2: %', v_txt;
  END IF;

  -- (16) POST: las DOS familias tienen dorado (condicion del reparto) ------
  SELECT string_agg(c.familia, ', ') INTO v_txt FROM (
    SELECT DISTINCT c.familia
      FROM cartas_catalogo c
     WHERE c.id IN (SELECT id FROM jsonb_to_recordset(v_seed) AS x(id text))
       AND c.rareza = 'dorado') c;
  IF v_txt IS NULL OR position('personaje' in v_txt) = 0 OR position('marca' in v_txt) = 0 THEN
    RAISE EXCEPTION 'MIG071 ABORTA: falta el dorado en alguna familia (encontrado: %)', coalesce(v_txt, 'ninguno');
  END IF;

  RAISE NOTICE 'MIG071 OK: % carta(s) insertada(s) en esta corrida; 14 en catalogo (8 personaje + 6 marca); filas ajenas al seed = %', v_ins, v_otros_despues;
  RAISE NOTICE 'MIG071 OK: precios/supply/tabla por rareza y stats 3.2 verificados; 14/14 comprables (precio>0, activo, emitidas<supply)';
END
$mig071$;
