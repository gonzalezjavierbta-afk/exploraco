-- ============================================================================
-- Migration 078: cartas - SEED de la familia COSMETICA (3 marco + 3 fondo
--   + 3 insignia). Solo filas. CERO esquema y CERO dependencia de la 076/077:
--   la familia 'cosmetica', sus 3 subtipos, su multiplicador 0.5 y el eje
--   'presencia' ya existen desde 066 (verificado leyendo las definiciones vivas
--   antes de escribir este fichero).
-- Fecha: 2026-11-11
-- Referencias: ADR-121, ADR-002 (ASCII-safe), ADR-003 (cero borrado fisico),
--   ADR-004 (aislamiento CSS, ajeno a este seed), ADR-006 (el archivo real
--   manda), ADR-008 (idempotencia), ADR-035 (XP numeric(12,2)).
-- Requiere, YA APLICADAS y con fila valida en schema_migrations:
--   060 (stats_json/fusionable), 066 (familia/subtipo/edicion/supply_max/
--   emitidas/precio_xp + chk_cartas_catalogo_no_fusion_cosmetica),
--   068 (precio_xp numeric(12,2)), 069 (familia NOT NULL).
--   NO requiere 076 ni 077 (11.12: "078 es independiente de 076").
-- Contrato: docs/superpowers/specs/2026-11-11-cartas-familias-stats-supply-design.md
--   seccion 11.12: 11.12.1 (subtipo marco/fondo/insignia y eje unico), 11.12.2
--   (multiplicador 0.5 y supply abierto), 11.12.3 (cero poder) y 11.12.4
--   (contrato del seed).
--
-- PROPOSITO
--   Las cosmeticas son el SUMIDERO de XP declarado en 4.6: se pagan con XP y
--   no devuelven poder. Sin filas en el catalogo no hay nada que comprar, asi
--   que el XP sobrante no tiene salida. Este fichero mete 9 piezas de vitrina
--   (marco, fondo e insignia) con precio y presencia resueltos.
--
-- LAS 9 PIEZAS
--   id                    nombre            subtipo   rareza
--   cc_marco_andino       Marco Andino      marco     comun
--   cc_marco_selva        Marco Selva       marco     raro
--   cc_marco_oro          Marco Oro         marco     dorado
--   cc_fondo_paramo       Fondo Paramo      fondo     comun
--   cc_fondo_ribera       Fondo Ribera      fondo     raro
--   cc_fondo_noche        Fondo Noche       fondo     epico
--   cc_insignia_bruma     Insignia Bruma    insignia  raro
--   cc_insignia_cumbre    Insignia Cumbre   insignia  epico
--   cc_insignia_leyenda   Insignia Leyenda  insignia  dorado
--
-- DESVIO CONSCIENTE 1: ids cc_<slug> (encargo del operador) en lugar de los
--   cs_marco_NN / cs_fondo_NN / cs_insignia_NN que propone 11.12.4. Mismo
--   contenido, prefijo declarado: 0 filas con id LIKE 'cc_%' medidas antes.
-- DESVIO CONSCIENTE 2: los nombres de 11.12.4 son plantilla vacia (no propone
--   ninguno); estos 9 son nombres de trabajo, ASCII y sin homonimos en el
--   catalogo (comprobado antes de insertar).
--
-- REPARTO (11.12.4: 2 comun / 3 raro / 2 epico / 2 dorado, 3 por subtipo)
--   marco    : comun, raro, dorado
--   fondo    : comun, raro, epico
--   insignia : raro, epico, dorado
--   Suma: comun 2, raro 3, epico 2, dorado 2 = 9. Cada subtipo con 3.
--
-- PRECIO Y SUPPLY (11.12.2; multiplicador 0.5 YA codificado en
-- lib/cartas-config.js CARTA_MULT_FAMILIA)
--   rareza   precio_xp   presencia   edicion    supply_max
--   comun         75.00           4   abierta          NULL
--   raro         200.00           8   abierta          NULL
--   epico        500.00          14   abierta          NULL
--   dorado      1250.00          24   abierta          NULL
--   edicion='abierta' + supply_max NULL es la decision del operador: un
--   sumidero con techo deja de ser sumidero en cuanto se agota (11.12.2 regla
--   2.2). chk_cartas_catalogo_supply admite esa combinacion, no la inventa.
--
-- STATS: SOLO presencia (11.12.1 regla 1.6 y 11.12.4)
--   stats_json = {"primario":"presencia","presencia":N}. Los otros cuatro ejes
--   NO se escriben: escribirlos a 0 sugeriria que la carta puede dar poder.
--   CARTA_PODER_PESOS tiene presencia: 0, luego poderCarta() devuelve 0 con
--   cualquier nivel y variante (11.12.3 regla 3.2). Tope por eje:
--   CARTA_STATS_TOPE = 40; el maximo sembrado es 24.
--
-- fusionable = false, ESCRITO EXPLICITO (11.12.4 regla 4.2)
--   La columna nace DEFAULT true (060). Omitirla en el INSERT NO toma false:
--   toma true y chk_cartas_catalogo_no_fusion_cosmetica responde 23514. Por
--   eso va escrito en la semilla fila por fila y ademas el INSERT escribe el
--   literal false, y las guardas (7) y (13) lo exigen. La guarda (0c) verifica
--   ADEMAS que el CHECK existe: si alguien lo dropea, este seed lo denuncia.
--
-- nivel_gate NULL en las 9 (11.12.4: los drops cosmeticos no se gatean en v1).
--
-- IMAGENES (reuso verificado, cero rutas nuevas)
--   En assets/cartas/ solo existen 5 laminas y las 5 responden HEAD 200 en
--   produccion (medido 2026-11-11 con Invoke-WebRequest -Method Head):
--     consumible_catalejo_explorador.png, consumible_lente_artista.png,
--     consumible_lupa_curador.png, consumible_pluma_creador.png,
--     marca_ancestral.png
--   No hay arte de cosmetica y NO se inventan URLs: las 9 piezas reutilizan
--   esas 5 laminas como arte provisional. Es reuso declarado, no arte propio.
--   La guarda (4) es una lista blanca CERRADA con esas 5 rutas.
--
-- CERO PODER, CERO XP, CERO MUSEO TOCADO
--   Esta migracion NO escribe usuarios_cartas, ni xp_ledger, ni orden_museo
--   (11.12.4 regla 4.3 y 11.12.6 A35). Una cosmetica se acuna por el camino
--   normal (precio_xp + carta_acunar), no se regala.
--
-- IDEMPOTENCIA (ADR-008)
--   INSERT ... ON CONFLICT (id) DO NOTHING. Cero UPDATE, cero sentencia de
--   borrado, cero TRUNCATE. Segunda corrida: 0 filas insertadas, catalogo
--   identico (el md5 del bloque seed se imprime y no cambia) y los guards se
--   recalculan sobre ids absolutos, no sobre filas nuevas.
--
-- PRE (medido en Neon antes de aplicar, 2026-11-11)
--   familia = 'cosmetica' = 0 filas. ids cc_% = 0 filas.
--   GATE del runner: 077 ya esta en el ledger (aplicada), que es el N-1 real.
--   La 078 NO depende de su contenido: si se hubiera aplicado con el catalogo
--   en 45 cartas, este mismo fichero habria corrido igual (A36).
--
-- POST esperado
--   catalogo = 55 + 9 = 64 cartas. cosmetica = 9 (3 marco + 3 fondo
--   + 3 insignia), rareza 2/3/2/2. Precio 75/200/500/1250; edicion 'abierta'
--   9/9; supply_max NULL 9/9; fusionable false 9/9; nivel_gate NULL 9/9;
--   emitidas 0; activo true. 9/9 comprables: carta_acunar exige precio_xp > 0,
--   activo = true y stock (supply_max IS NULL cuenta como stock abierto).
--
-- COMO SE APLICA (PowerShell, desde la raiz del repo)
--   node scripts/apply_sql_file.js db/migrations/078_cartas_seed_cosmeticas.sql --dry-run
--   node scripts/apply_sql_file.js db/migrations/078_cartas_seed_cosmeticas.sql --notas "seed cosmeticas 9 cartas"
--   La fila del ledger (078, 'aplicada') la pone el runner, no este SQL.
--
-- ROLLBACK (comentado; ADR-003 prohibe el borrado fisico de filas con historia)
--   Revertir 078 = apagar las 9 piezas, no borrarlas. Si alguna ya esta en
--   usuarios_cartas u ofertas, el borrado fisico es ademas un fallo de dato.
--   -- BEGIN;
--   --   UPDATE public.cartas_catalogo
--   --      SET activo = false
--   --    WHERE familia = 'cosmetica'
--   --      AND id IN ('cc_marco_andino', 'cc_marco_selva', 'cc_marco_oro',
--   --                 'cc_fondo_paramo', 'cc_fondo_ribera', 'cc_fondo_noche',
--   --                 'cc_insignia_bruma', 'cc_insignia_cumbre',
--   --                 'cc_insignia_leyenda');
--   -- ROLLBACK;
--   La fila del ledger NO se borra: es la unica evidencia de que 078 corrio.
-- ============================================================================

DO $mig078$
DECLARE
  v_seed jsonb := '[
    {"id":"cc_marco_andino","nombre":"Marco Andino","familia":"cosmetica","subtipo":"marco","rareza":"comun","precio_xp":75,"supply_max":null,"nivel_gate":null,"edicion":"abierta","fusionable":false,"activo":true,"es_evento":false,"emitidas":0,"set_slug":"cosmetica_v1","imagen_url":"assets/cartas/marca_ancestral.png","descripcion":"Marco de vitrina con filo de altura: enmarca la carta sin dar poder","stats_json":{"primario":"presencia","presencia":4}},
    {"id":"cc_marco_selva","nombre":"Marco Selva","familia":"cosmetica","subtipo":"marco","rareza":"raro","precio_xp":200,"supply_max":null,"nivel_gate":null,"edicion":"abierta","fusionable":false,"activo":true,"es_evento":false,"emitidas":0,"set_slug":"cosmetica_v1","imagen_url":"assets/cartas/marca_ancestral.png","descripcion":"Marco de selva tupida, verde profundo para las piezas de expedicion","stats_json":{"primario":"presencia","presencia":8}},
    {"id":"cc_marco_oro","nombre":"Marco Oro","familia":"cosmetica","subtipo":"marco","rareza":"dorado","precio_xp":1250,"supply_max":null,"nivel_gate":null,"edicion":"abierta","fusionable":false,"activo":true,"es_evento":false,"emitidas":0,"set_slug":"cosmetica_v1","imagen_url":"assets/cartas/marca_ancestral.png","descripcion":"Marco dorado de coleccion: el borde que delata una vitrina curada","stats_json":{"primario":"presencia","presencia":24}},
    {"id":"cc_fondo_paramo","nombre":"Fondo Paramo","familia":"cosmetica","subtipo":"fondo","rareza":"comun","precio_xp":75,"supply_max":null,"nivel_gate":null,"edicion":"abierta","fusionable":false,"activo":true,"es_evento":false,"emitidas":0,"set_slug":"cosmetica_v1","imagen_url":"assets/cartas/consumible_catalejo_explorador.png","descripcion":"Fondo de paramo con frailejonales y bruma en la pared del museo","stats_json":{"primario":"presencia","presencia":4}},
    {"id":"cc_fondo_ribera","nombre":"Fondo Ribera","familia":"cosmetica","subtipo":"fondo","rareza":"raro","precio_xp":200,"supply_max":null,"nivel_gate":null,"edicion":"abierta","fusionable":false,"activo":true,"es_evento":false,"emitidas":0,"set_slug":"cosmetica_v1","imagen_url":"assets/cartas/consumible_lente_artista.png","descripcion":"Fondo de ribera: agua quieta y guadual detras de la pieza","stats_json":{"primario":"presencia","presencia":8}},
    {"id":"cc_fondo_noche","nombre":"Fondo Noche","familia":"cosmetica","subtipo":"fondo","rareza":"epico","precio_xp":500,"supply_max":null,"nivel_gate":null,"edicion":"abierta","fusionable":false,"activo":true,"es_evento":false,"emitidas":0,"set_slug":"cosmetica_v1","imagen_url":"assets/cartas/consumible_lupa_curador.png","descripcion":"Fondo de noche andina, cielo abierto para las cartas de tirada alta","stats_json":{"primario":"presencia","presencia":14}},
    {"id":"cc_insignia_bruma","nombre":"Insignia Bruma","familia":"cosmetica","subtipo":"insignia","rareza":"raro","precio_xp":200,"supply_max":null,"nivel_gate":null,"edicion":"abierta","fusionable":false,"activo":true,"es_evento":false,"emitidas":0,"set_slug":"cosmetica_v1","imagen_url":"assets/cartas/consumible_pluma_creador.png","descripcion":"Insignia de bruma: marca de quien colecciona sin ruido","stats_json":{"primario":"presencia","presencia":8}},
    {"id":"cc_insignia_cumbre","nombre":"Insignia Cumbre","familia":"cosmetica","subtipo":"insignia","rareza":"epico","precio_xp":500,"supply_max":null,"nivel_gate":null,"edicion":"abierta","fusionable":false,"activo":true,"es_evento":false,"emitidas":0,"set_slug":"cosmetica_v1","imagen_url":"assets/cartas/consumible_lente_artista.png","descripcion":"Insignia de cumbre: se luce en la ficha y no paga XP","stats_json":{"primario":"presencia","presencia":14}},
    {"id":"cc_insignia_leyenda","nombre":"Insignia Leyenda","familia":"cosmetica","subtipo":"insignia","rareza":"dorado","precio_xp":1250,"supply_max":null,"nivel_gate":null,"edicion":"abierta","fusionable":false,"activo":true,"es_evento":false,"emitidas":0,"set_slug":"cosmetica_v1","imagen_url":"assets/cartas/marca_ancestral.png","descripcion":"Insignia de leyenda: el sello de una vitrina completa","stats_json":{"primario":"presencia","presencia":24}}
  ]'::jsonb;

  v_txt           text;
  v_n             int;
  v_ins           int;
  v_otros_antes   int;
  v_otros_despues int;
  v_md5           text;
BEGIN
  -- (0) PRECONDICION DE ESQUEMA --------------------------------------------
  SELECT count(*) INTO v_n
    FROM information_schema.columns
   WHERE table_schema = 'public'
     AND table_name = 'cartas_catalogo'
     AND column_name IN ('familia', 'subtipo', 'stats_json', 'precio_xp',
                         'supply_max', 'edicion', 'emitidas', 'imagen_url',
                         'fusionable', 'nivel_gate', 'set_slug');
  IF v_n <> 11 THEN
    RAISE EXCEPTION 'MIG078: faltan columnas de 060/066/068/069 (encontradas % de 11)', v_n;
  END IF;

  -- (0b) CHECK DE FUSION: existe y con la definicion que obliga a false.
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'public.cartas_catalogo'::regclass
       AND conname  = 'chk_cartas_catalogo_no_fusion_cosmetica'
       AND pg_get_constraintdef(oid) LIKE '%fusionable%'
       AND pg_get_constraintdef(oid) LIKE '%cosmetica%'
  ) THEN
    RAISE EXCEPTION 'MIG078 ABORTA: falta chk_cartas_catalogo_no_fusion_cosmetica (066) o cambio de definicion';
  END IF;

  -- (0c) CARTA DE NAVEGACION: 9 filas ni una mas ---------------------------
  IF jsonb_array_length(v_seed) <> 9 THEN
    RAISE EXCEPTION 'MIG078 ABORTA: el seed trae % piezas y el contrato fija 9',
      jsonb_array_length(v_seed);
  END IF;

  -- (1) GUARDA DE IDS: formato cc_, ascii minusculas, sin duplicados -------
  SELECT string_agg(id, ', ') INTO v_txt
    FROM jsonb_to_recordset(v_seed) AS x(id text)
   WHERE x.id IS NULL
      OR x.id !~ '^cc_[a-z0-9_]+$';
  IF v_txt IS NOT NULL THEN
    RAISE EXCEPTION 'MIG078 ABORTA: ids con formato invalido (se exige cc_ + ascii minusculas): %', v_txt;
  END IF;

  SELECT string_agg(id, ', ') INTO v_txt
    FROM (SELECT id FROM jsonb_to_recordset(v_seed) AS x(id text)
           GROUP BY id HAVING count(*) > 1) d;
  IF v_txt IS NOT NULL THEN
    RAISE EXCEPTION 'MIG078 ABORTA: ids duplicados dentro del seed: %', v_txt;
  END IF;

  -- (2) GUARDA DE COLISION: un id del seed que YA exista debe ser la MISMA
  -- pieza (familia y nombre); si difiere es colision, no repeticion.
  SELECT string_agg(x.id, ', ') INTO v_txt
    FROM jsonb_to_recordset(v_seed) AS x(id text, nombre text, familia text)
    JOIN cartas_catalogo c ON c.id = x.id
   WHERE c.familia <> x.familia OR c.nombre <> x.nombre;
  IF v_txt IS NOT NULL THEN
    RAISE EXCEPTION 'MIG078 ABORTA: ids del seed que ya existen con OTRA familia/nombre (colision): %', v_txt;
  END IF;

  -- (2b) GUARDA DE NOMBRE: cero homonimos contra las cartas ya existentes.
  SELECT string_agg(q.nombre, ', ') INTO v_txt FROM (
    SELECT c.nombre
      FROM cartas_catalogo c
      JOIN jsonb_to_recordset(v_seed) AS x(nombre text) ON c.nombre = x.nombre
     WHERE c.id NOT IN (SELECT id FROM jsonb_to_recordset(v_seed) AS y(id text))
    ) q;
  IF v_txt IS NOT NULL THEN
    RAISE EXCEPTION 'MIG078 ABORTA: nombre ya usado por otra carta del catalogo: %', v_txt;
  END IF;

  -- (3) GUARDA DE FAMILIA, SUBTIPO Y SET ------------------------------------
  SELECT string_agg(x.id, ', ') INTO v_txt
    FROM jsonb_to_recordset(v_seed) AS x(id text, familia text, subtipo text,
                                         set_slug text)
   WHERE x.familia IS DISTINCT FROM 'cosmetica'
      OR x.subtipo IS NULL
      OR x.subtipo NOT IN ('marco', 'fondo', 'insignia')
      OR x.set_slug IS DISTINCT FROM 'cosmetica_v1';
  IF v_txt IS NOT NULL THEN
    RAISE EXCEPTION 'MIG078 ABORTA: familia/subtipo/set_slug invalido en: %', v_txt;
  END IF;

  -- (3b) GUARDA DE CURADURIA: cada id con SU subtipo y SU rareza. Es lo que
  -- fija el reparto 3/3/3 por subtipo y 2/3/2/2 por rareza, ademas de la
  -- presencia y el precio que le tocan.
  SELECT string_agg(x.id, ', ') INTO v_txt
    FROM jsonb_to_recordset(v_seed) AS x(id text, subtipo text, rareza text,
                                         precio_xp numeric, stats_json jsonb)
    LEFT JOIN (VALUES
        ('cc_marco_andino',     'marco',    'comun',    75.00::numeric(12,2),  4),
        ('cc_marco_selva',      'marco',    'raro',    200.00::numeric(12,2),  8),
        ('cc_marco_oro',        'marco',    'dorado', 1250.00::numeric(12,2), 24),
        ('cc_fondo_paramo',     'fondo',    'comun',    75.00::numeric(12,2),  4),
        ('cc_fondo_ribera',     'fondo',    'raro',    200.00::numeric(12,2),  8),
        ('cc_fondo_noche',      'fondo',    'epico',   500.00::numeric(12,2), 14),
        ('cc_insignia_bruma',   'insignia', 'raro',    200.00::numeric(12,2),  8),
        ('cc_insignia_cumbre',  'insignia', 'epico',   500.00::numeric(12,2), 14),
        ('cc_insignia_leyenda', 'insignia', 'dorado', 1250.00::numeric(12,2), 24)
      ) AS m(id, subtipo, rareza, precio_xp, presencia) ON m.id = x.id
   WHERE m.id IS NULL
      OR x.subtipo  IS DISTINCT FROM m.subtipo
      OR x.rareza   IS DISTINCT FROM m.rareza
      OR x.precio_xp IS DISTINCT FROM m.precio_xp
      OR (x.stats_json->>'presencia')::int IS DISTINCT FROM m.presencia;
  IF v_txt IS NOT NULL THEN
    RAISE EXCEPTION 'MIG078 ABORTA: pieza fuera de la tabla 11.12.4 (subtipo/rareza/precio/presencia): %', v_txt;
  END IF;

  -- (4) GUARDA DE TEXTO E IMAGEN: descripcion de una linea, sin digitos,
  -- imagen dentro de las 5 laminas que responden HEAD 200. Cero URL inventada.
  SELECT string_agg(x.id, ', ') INTO v_txt
    FROM jsonb_to_recordset(v_seed) AS x(id text, nombre text, descripcion text,
                                         imagen_url text)
   WHERE x.nombre IS NULL OR btrim(x.nombre) = ''
      OR x.descripcion IS NULL
      OR btrim(x.descripcion) = ''
      OR length(x.descripcion) < 20
      OR length(x.descripcion) > 160
      OR x.descripcion ~ '[0-9]'
      OR position(chr(10) in x.descripcion) > 0
      OR position(';' in x.descripcion) > 0
      OR x.imagen_url NOT IN (
           'assets/cartas/consumible_catalejo_explorador.png',
           'assets/cartas/consumible_lente_artista.png',
           'assets/cartas/consumible_lupa_curador.png',
           'assets/cartas/consumible_pluma_creador.png',
           'assets/cartas/marca_ancestral.png');
  IF v_txt IS NOT NULL THEN
    RAISE EXCEPTION 'MIG078 ABORTA: nombre/descripcion/imagen (fuera de las 5 laminas verificadas) en: %', v_txt;
  END IF;

  -- (5) GUARDA DE FORMA DE stats_json: SOLO primario y presencia. Cualquier
  -- otro eje (alcance/oficio/fortuna/rendimiento) es ruido que insinua poder.
  SELECT string_agg(x.id, ', ') INTO v_txt
    FROM jsonb_to_recordset(v_seed) AS x(id text, stats_json jsonb)
   WHERE jsonb_typeof(x.stats_json) IS DISTINCT FROM 'object'
      OR x.stats_json = '{}'::jsonb
      OR (x.stats_json - 'primario' - 'presencia') <> '{}'::jsonb
      OR x.stats_json ? 'alcance'
      OR x.stats_json ? 'oficio'
      OR x.stats_json ? 'fortuna'
      OR x.stats_json ? 'rendimiento'
      OR x.stats_json ? 'sku'
      OR x.stats_json ? 'bonus_xp_pct';
  IF v_txt IS NOT NULL THEN
    RAISE EXCEPTION 'MIG078 ABORTA: stats_json con algo distinto de primario+presencia en: %', v_txt;
  END IF;

  -- (6) GUARDA DE PRESENCIA: primario presencia, entero, 0..40 y el valor de
  -- la tabla 11.12.2 (4/8/14/24).
  SELECT string_agg(x.id, ', ') INTO v_txt
    FROM jsonb_to_recordset(v_seed) AS x(id text, rareza text, stats_json jsonb)
    LEFT JOIN (VALUES ('comun', 4), ('raro', 8), ('epico', 14), ('dorado', 24))
      AS m(rareza, presencia) ON m.rareza = x.rareza
   WHERE m.rareza IS NULL
      OR x.stats_json->>'primario' IS DISTINCT FROM 'presencia'
      OR jsonb_typeof(x.stats_json->'presencia') IS DISTINCT FROM 'number'
      OR (x.stats_json->>'presencia')::int IS DISTINCT FROM m.presencia
      OR (x.stats_json->>'presencia')::int < 0
      OR (x.stats_json->>'presencia')::int > 40;
  IF v_txt IS NOT NULL THEN
    RAISE EXCEPTION 'MIG078 ABORTA: presencia fuera de la tabla 11.12.2 o del tope 0..40 en: %', v_txt;
  END IF;

  -- (7) GUARDA DE VALOR: precio > 0, abierta + supply NULL, fusionable false,
  -- nivel_gate NULL, emitidas 0, activo true y no evento.
  SELECT string_agg(x.id, ', ') INTO v_txt
    FROM jsonb_to_recordset(v_seed) AS x(id text, precio_xp numeric,
         supply_max integer, nivel_gate smallint, edicion text,
         fusionable boolean, activo boolean, es_evento boolean, emitidas integer)
   WHERE x.precio_xp IS NULL OR x.precio_xp <= 0
      OR x.edicion IS DISTINCT FROM 'abierta'
      OR x.supply_max IS NOT NULL
      OR x.nivel_gate IS NOT NULL
      OR x.fusionable IS DISTINCT FROM false
      OR x.activo IS DISTINCT FROM true
      OR x.es_evento IS DISTINCT FROM false
      OR x.emitidas IS DISTINCT FROM 0;
  IF v_txt IS NOT NULL THEN
    RAISE EXCEPTION 'MIG078 ABORTA: precio/edicion/supply/fusionable/nivel_gate/activo fuera de contrato en: %', v_txt;
  END IF;

  -- (8) INVARIANTE DE NO DESTRUCCION: filas ajenas al seed ANTES -----------
  SELECT count(*) INTO v_otros_antes
    FROM cartas_catalogo c
   WHERE c.id NOT IN (SELECT id FROM jsonb_to_recordset(v_seed) AS x(id text));

  -- (9) INSERT: ON CONFLICT (id) DO NOTHING. fusionable y edicion se escriben
  -- como LITERALES (no vienen del recordset) para que no puedan divergir.
  INSERT INTO cartas_catalogo (
    id, nombre, set_slug, rareza, nivel_gate, es_evento, imagen_url, activo,
    emisor_tipo, descripcion, stats_json, fusionable, familia, subtipo,
    precio_xp, edicion, supply_max, emitidas
  )
  SELECT r.id, r.nombre, r.set_slug, r.rareza, r.nivel_gate, false,
         r.imagen_url, true, 'sistema', r.descripcion, r.stats_json,
         false, r.familia, r.subtipo,
         r.precio_xp, 'abierta', NULL, 0
    FROM jsonb_to_recordset(v_seed) AS r(
           id text, nombre text, familia text, subtipo text, rareza text,
           nivel_gate smallint, precio_xp numeric, supply_max integer,
           edicion text, imagen_url text, set_slug text, descripcion text,
           stats_json jsonb)
  ON CONFLICT (id) DO NOTHING;
  GET DIAGNOSTICS v_ins = ROW_COUNT;

  -- (10) POST: no se toco nada ajeno --------------------------------------
  SELECT count(*) INTO v_otros_despues
    FROM cartas_catalogo c
   WHERE c.id NOT IN (SELECT id FROM jsonb_to_recordset(v_seed) AS x(id text));
  IF v_otros_despues <> v_otros_antes THEN
    RAISE EXCEPTION 'MIG078 ABORTA: filas ajenas al seed % -> % (no puede cambiar)',
      v_otros_antes, v_otros_despues;
  END IF;
  IF v_otros_antes NOT IN (45, 55) THEN
    RAISE EXCEPTION 'MIG078 ABORTA: el catalogo previo trae % filas ajenas al seed; se esperaba 45 (sin 077) o 55 (con 077)', v_otros_antes;
  END IF;

  -- (11) POST: las 9 existen -----------------------------------------------
  SELECT count(*) INTO v_n
    FROM cartas_catalogo c
   WHERE c.id IN (SELECT id FROM jsonb_to_recordset(v_seed) AS x(id text));
  IF v_n <> 9 THEN
    RAISE EXCEPTION 'MIG078 ABORTA: quedaron % de 9 cosmeticas', v_n;
  END IF;

  -- (12) POST: forma de stats_json en base --------------------------------
  SELECT string_agg(c.id, ', ') INTO v_txt
    FROM cartas_catalogo c
   WHERE c.id IN (SELECT id FROM jsonb_to_recordset(v_seed) AS x(id text))
     AND (c.familia IS DISTINCT FROM 'cosmetica'
       OR c.subtipo NOT IN ('marco', 'fondo', 'insignia')
       OR jsonb_typeof(c.stats_json) <> 'object'
       OR c.stats_json = '{}'::jsonb
       OR (c.stats_json - 'primario' - 'presencia') <> '{}'::jsonb
       OR c.stats_json ? 'alcance'
       OR c.stats_json ? 'oficio'
       OR c.stats_json ? 'fortuna'
       OR c.stats_json ? 'rendimiento'
       OR NOT (c.stats_json ? 'presencia'));
  IF v_txt IS NOT NULL THEN
    RAISE EXCEPTION 'MIG078 ABORTA: familia/subtipo/stats_json invalido en base: %', v_txt;
  END IF;

  -- (13) POST: valor, disponibilidad y fusion bloqueada -------------------
  SELECT string_agg(c.id, ', ') INTO v_txt
    FROM cartas_catalogo c
   WHERE c.id IN (SELECT id FROM jsonb_to_recordset(v_seed) AS x(id text))
     AND (c.precio_xp IS NULL OR c.precio_xp <= 0
       OR c.edicion <> 'abierta'
       OR c.supply_max IS NOT NULL
       OR c.nivel_gate IS NOT NULL
       OR c.activo = false
       OR c.es_evento = true
       OR c.emisor_tipo <> 'sistema'
       OR c.fusionable = true
       OR c.emitidas <> 0
       OR c.imagen_url IS NULL OR btrim(c.imagen_url) = '');
  IF v_txt IS NOT NULL THEN
    RAISE EXCEPTION 'MIG078 ABORTA: precio/edicion/supply/fusionable/activo/imagen invalido en: %', v_txt;
  END IF;

  -- (14) POST: 3 por subtipo y 2/3/2/2 por rareza -------------------------
  SELECT string_agg(subtipo || '=' || n, ', ') INTO v_txt FROM (
    SELECT c.subtipo, count(*)::text AS n
      FROM cartas_catalogo c
     WHERE c.id IN (SELECT id FROM jsonb_to_recordset(v_seed) AS x(id text))
     GROUP BY c.subtipo) q
   WHERE n <> '3';
  IF v_txt IS NOT NULL THEN
    RAISE EXCEPTION 'MIG078 ABORTA: reparto por subtipo fuera de 3/3/3: %', v_txt;
  END IF;

  SELECT string_agg(rareza || '=' || n, ', ') INTO v_txt FROM (
    SELECT c.rareza, count(*)::text AS n
      FROM cartas_catalogo c
     WHERE c.id IN (SELECT id FROM jsonb_to_recordset(v_seed) AS x(id text))
     GROUP BY c.rareza) q
   WHERE NOT ((rareza = 'comun' AND n = '2')
           OR (rareza = 'raro' AND n = '3')
           OR (rareza = 'epico' AND n = '2')
           OR (rareza = 'dorado' AND n = '2'));
  IF v_txt IS NOT NULL THEN
    RAISE EXCEPTION 'MIG078 ABORTA: reparto por rareza fuera de 2/3/2/2: %', v_txt;
  END IF;

  -- (15) POST: cero homonimos en TODO el catalogo -------------------------
  SELECT string_agg(nombre || '=' || n, ', ') INTO v_txt FROM (
    SELECT c.nombre, count(*)::text AS n
      FROM cartas_catalogo c
     GROUP BY c.nombre HAVING count(*) > 1) d;
  IF v_txt IS NOT NULL THEN
    RAISE EXCEPTION 'MIG078 ABORTA: nombres duplicados en el catalogo: %', v_txt;
  END IF;

  -- (16) HUELLA: md5 estable del bloque seed (segunda corrida identica) ---
  SELECT md5(string_agg(c.id || '|' || c.nombre || '|' || c.familia || '|'
                        || c.subtipo || '|' || c.rareza || '|'
                        || c.precio_xp::text || '|' || coalesce(c.supply_max::text, '~')
                        || '|' || c.edicion || '|' || c.activo::text
                        || '|' || c.stats_json::text, '#' ORDER BY c.id)) INTO v_md5
    FROM cartas_catalogo c
   WHERE c.id IN (SELECT id FROM jsonb_to_recordset(v_seed) AS x(id text));

  RAISE NOTICE 'MIG078 OK: % pieza(s) insertada(s) en esta corrida; 9 en catalogo (3 marco + 3 fondo + 3 insignia); ajenas al seed = %',
    v_ins, v_otros_despues;
  RAISE NOTICE 'MIG078 OK: rareza 2/3/2/2, precio 75/200/500/1250, abierta + supply NULL, fusionable false, nivel_gate NULL';
  RAISE NOTICE 'MIG078 md5(seed)=% (segunda corrida debe imprimir el mismo valor)', v_md5;
END
$mig078$;
