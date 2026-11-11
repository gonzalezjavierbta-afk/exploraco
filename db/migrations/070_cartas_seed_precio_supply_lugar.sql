-- ============================================================================
-- Migration 070: cartas - SEED de PRECIO_XP y SUPPLY_MAX de la familia LUGAR
--   (tirada cerrada). Es lo que desbloquea carta_acunar en las 24 cartas
--   familia='lugar', que hoy tienen precio_xp NULL y por tanto no se pueden
--   acunar.
-- Fecha: 2026-11-11
-- Referencias: ADR-121, ADR-035 (XP numeric(12,2)), ADR-002 (ASCII-safe),
--   ADR-003 (cero borrado fisico), ADR-006 (el archivo real manda),
--   ADR-008 (idempotencia).
-- Requiere, EN ESTE ORDEN y ya APLICADAS:
--   066 (familia/edicion/supply_max/emitidas/precio_xp + sus CHECKs),
--   068 (precio_xp pasa a numeric(12,2)),
--   069 (familia pasa a NOT NULL).
--   La puerta del predecesor de scripts/apply_sql_file.js RECHAZA este fichero
--   si cualquiera de las tres sigue sin fila valida en schema_migrations.
-- Contrato: docs/superpowers/specs/2026-11-11-cartas-familias-stats-supply-design.md
--   4.1 (columnas de valor), 4.2 (precio_xp = base_rareza x mult_familia,
--   lugar = 1,0) y 4.3 (tirada = pesos comun 5000 / raro 1000 / epico 250 /
--   dorado 50).
--
-- PROPOSITO
--   La 066 creo las columnas y backfilleo familia/subtipo, pero dejo precio_xp,
--   supply_max y edicion sin resolver en el catalogo. Sin precio positivo no hay
--   acunacion: carta_acunar exige precio_xp > 0, activo = true y stock
--   (supply_max IS NULL OR emitidas < supply_max). Este fichero resuelve las
--   TRES columnas de valor de la familia lugar de una sola vez:
--
--     rareza    precio_xp   supply_max   edicion
--     comun        150.00         5000   limitada
--     raro         400.00         1000   limitada
--     epico       1000.00          250   limitada
--     dorado      2500.00           50   limitada
--
--   Precio = base aprobada por rareza (150 / 400 / 1000 / 2500) x
--   multiplicador de familia lugar (1,0). La tabla de arriba ES la fila 'lugar'
--   de la tabla de 4.2: no hay cifras inventadas ni redondeos.
--   Tirada = los pesos de 4.3 (5000 / 1000 / 250 / 50) como techo de unidades
--   por tramo. edicion='limitada' porque el CHECK chk_cartas_catalogo_supply
--   (066) solo admite supply_max NOT NULL con edicion 'limitada' o 'serial';
--   'serial' queda reservado a la numeracion por copia de 4.4, que este
--   fichero NO activa.
--   El precio se RESUELVE y se GUARDA (4.2): no se recalcula en la lectura, de
--   modo que las cartas ya acunadas conservan su precio historico.
--
-- NOMENCLATURA (verificado en Neon el 2026-11-11, no supuesto)
--   La spec 4.2/4.3 nombra los tramos con las formas comun / raro / epico /
--   dorado, y la columna cartas_catalogo.rareza usa EXACTAMENTE esos valores:
--   el catalogo tiene 9 comun + 7 raro + 5 epico + 3 dorado = 24 de familia
--   lugar. NO se escribe 'rara' / 'epica' / 'legendaria': esos literales no
--   existen en la tabla y un UPDATE con ellos no tocaria ninguna fila.
--
-- QUE HACE
--   1. Precondicion de columnas y de tipo (precio_xp numeric(12,2) = 068).
--   2. Guarda de rareza: si alguna carta familia='lugar' tiene rareza fuera de
--      la lista, ABORTA listando los valores encontrados.
--   3. Guarda de supply: si alguna carta familia='lugar' tiene
--      emitidas > supply_max PROPUESTO, ABORTA con el id y los dos numeros. No
--      recorta supply_max y no toca emitidas.
--   4. Guarda de edicion: si alguna carta familia='lugar' ya es 'serial',
--      ABORTA. Degradar serial a limitada destruiria una decision de tirada.
--   5. UPDATE por rareza de las 24 cartas lugar: precio_xp, supply_max y
--      edicion. El predicado IS DISTINCT FROM evita reescribir filas que ya
--      estan correctas.
--   6. Guardas POST, todas fail-closed: 0 lugar con precio_xp NULL o <= 0,
--      0 lugar con supply_max NULL, 0 lugar con emitidas > supply_max y 0
--      carta producto/consumible con precio_xp NOT NULL (CHECK de 066).
--   7. RECLASIFICACION pedida por el OPERADOR (2026-11-11): ct_comun_01..06
--      pasan de subtipo 'territorio' a 'natural'. Siguen siendo familia
--      'lugar'. Es independiente del seed de precio/tirada y va guardada por
--      id + familia='lugar' + subtipo='territorio', luego idempotente.
--
-- QUE NO HACE
--   - NO toca familia IN ('producto','consumible'): se pagan por su SKU y su
--     precio_xp DEBE seguir NULL por chk_cartas_catalogo_precio (066). Son las
--     4 cta_ancestral y las 3 ce_evento.
--   - NO toca personaje / artista / marca / cosmetica: no existen aun (0 filas).
--   - NO toca emitidas (contador de circulacion medida: solo lo mueve el
--     acunado de 4.5), ni activo, ni stats_json, ni rareza. La UNICA columna
--     fuera del trio de valor (precio_xp/supply_max/edicion) que este fichero
--     escribe es subtipo, y solo para ct_comun_01..06 (paso 7): esas seis
--     SIGUEN en familia 'lugar'.
--   - NO hace DELETE, TRUNCATE ni DROP (ADR-003): cero borrado fisico.
--   - NO escribe schema_migrations: lo hace el runner (contrato de 045).
--
-- IDEMPOTENCIA (ADR-008)
--   - El UPDATE lleva IS DISTINCT FROM en las TRES columnas: la segunda corrida
--     actualiza 0 filas y lo reporta con NOTICE, sin reescribir nada.
--   - La reclasificacion del paso 7 lleva subtipo = 'territorio' en el
--     predicado: la segunda corrida tampoco reescribe esas seis filas.
--   - Las guardas son aserciones, no acumulaciones: no suman ni multiplican.
--   - Todo el cuerpo es UN bloque DO: para el runner es una sola sentencia.
--
-- ATOMICIDAD: o quedan las 24 cartas lugar con precio y tirada coherentes, o no
-- cambia ninguna.
--
-- PRE (medido en Neon antes de aplicar, 2026-11-11)
--   familia lugar: 24 filas = 9 comun + 7 raro + 5 epico + 3 dorado; todas con
--   precio_xp NULL, supply_max NULL, edicion 'abierta', activo true, emitidas 0.
--   producto+consumible: 7 filas, todas con precio_xp NULL.
--   md5 del estado, re-medido el 2026-11-11 con la formula REPRODUCIBLE
--   (los NULL se marcan con '~' porque la concatenacion cruda los propaga y
--   deja el string_agg entero en NULL, sin hash posible):
--     md5(string_agg(id||coalesce(precio_xp::text,'~')
--                       ||coalesce(supply_max::text,'~')||edicion,
--                    '|' ORDER BY id))
--     PRE = 3613e980a85be08786dc8e909ae33bc0
--   Nota: el valor 44b9437697529411cf4ad32d9c6e89b8 que figuraba aqui no se
--   reproduce con ninguna variante de la formula; la DESCRIPCION de estado si
--   (24 lugar con precio/supply NULL y edicion 'abierta', 7 producto/consumible
--   sin precio). Se sustituye por el medido para que la comprobacion de 0
--   cambios de dato de la segunda corrida sea verificable.
--   Contexto de supply: usuarios_cartas = 0 filas, cartas_ofertas = 0 filas. No
--   hay inventario ni escrow, luego emitidas = 0 es coherente y no existe
--   ninguna unidad en circulacion que pueda superar el techo propuesto.
--
-- POST esperado (misma consulta + md5)
--   9 x (150.00, 5000, limitada) + 7 x (400.00, 1000, limitada)
--   + 5 x (1000.00, 250, limitada) + 3 x (2500.00, 50, limitada) = 24.
--   0 lugar con precio_xp NULL. 7 producto/consumible con precio_xp NULL.
--   md5 POST predicho (calculado en lectura el 2026-11-11 con la misma formula
--   antes de aplicar) = f2ae6007c6b67a92ca3688bf075be704
--   Tras la reclasificacion del paso 7: familia lugar subtipo natural = 6.
--   Las 24 quedan COMPRABLES si siguen con activo = true (activo no se toca
--   aqui; la consulta POST del informe cuenta cuantas estan inactivas).
--
-- ROLLBACK (comentado, NO ejecutar desde el runner; ADR-003 no permite borrar
-- columnas, esto solo revierte los VALORES que escribio este seed, y solo si
-- nada se acuno todavia):
--   -- UPDATE cartas_catalogo
--   --    SET precio_xp = NULL, supply_max = NULL, edicion = 'abierta'
--   --  WHERE familia = 'lugar';
--   -- Si alguna carta tiene emitidas > 0, NO revertir: esas unidades ya
--   -- consumieron supply y su precio historico debe sobrevivir (4.2).
--
-- ASCII-safe (ADR-002): 0 bytes > 127, cero backticks, sin acentos ni enes.
-- ============================================================================

DO $m070$
DECLARE
  v_cols   int;
  v_tipo   text;
  v_escala int;
  v_raros  text;
  v_supply text;
  v_serial text;
  v_ids    text;
  v_upd    int;
  v_lugar  int;
  v_nat    int;
  v_nat_ok int;
  v_nat_tot int;
  v_pnull  int;
  v_snull  int;
  v_over   int;
  v_pc_bad int;
BEGIN
  -- (0) PRECONDICIONES: columnas de 066 y tipo de 068 -----------------------
  SELECT count(*) INTO v_cols
    FROM information_schema.columns
   WHERE table_schema = 'public'
     AND table_name   = 'cartas_catalogo'
     AND column_name IN ('familia', 'rareza', 'precio_xp', 'supply_max',
                         'emitidas', 'edicion');
  IF v_cols <> 6 THEN
    RAISE EXCEPTION 'MIG070: faltan columnas de la 066 (encontradas % de 6)', v_cols;
  END IF;

  SELECT data_type, coalesce(numeric_scale, -1)
    INTO v_tipo, v_escala
    FROM information_schema.columns
   WHERE table_schema = 'public'
     AND table_name   = 'cartas_catalogo'
     AND column_name  = 'precio_xp';
  IF v_tipo IS DISTINCT FROM 'numeric' OR v_escala IS DISTINCT FROM 2 THEN
    RAISE EXCEPTION 'MIG070: precio_xp es % scale % y debe ser numeric(12,2); falta 068',
      coalesce(v_tipo, 'ausente'), coalesce(v_escala::text, 'n/d');
  END IF;

  -- (1) GUARDA DE RAREZA ---------------------------------------------------
  SELECT string_agg(DISTINCT coalesce(rareza, '<NULL>'), ', ')
    INTO v_raros
    FROM cartas_catalogo
   WHERE familia = 'lugar'
     AND (rareza IS NULL OR rareza NOT IN ('comun', 'raro', 'epico', 'dorado'));
  IF v_raros IS NOT NULL THEN
    RAISE EXCEPTION 'MIG070 ABORTA: familia lugar con rareza fuera del mapeo: %', v_raros;
  END IF;

  -- (2) GUARDA DE SUPPLY: emitidas no puede quedar por encima del techo -----
  SELECT string_agg(c.id || ' (emitidas=' || c.emitidas ||
                    ', supply_propuesto=' || m.supply_max || ')', ', ')
    INTO v_supply
    FROM cartas_catalogo c
    JOIN (VALUES ('comun', 5000),
                 ('raro', 1000),
                 ('epico', 250),
                 ('dorado', 50)) AS m(rareza, supply_max)
      ON m.rareza = c.rareza
   WHERE c.familia = 'lugar'
     AND c.emitidas > m.supply_max;
  IF v_supply IS NOT NULL THEN
    RAISE EXCEPTION 'MIG070 ABORTA: lugar con emitidas por encima del supply: %', v_supply;
  END IF;

  -- (3) GUARDA DE EDICION: no degradar una serial ya decidida --------------
  SELECT string_agg(id, ', ')
    INTO v_serial
    FROM cartas_catalogo
   WHERE familia = 'lugar'
     AND edicion = 'serial';
  IF v_serial IS NOT NULL THEN
    RAISE EXCEPTION 'MIG070 ABORTA: lugar con edicion serial (no se degrada a limitada): %', v_serial;
  END IF;

  -- (4) UPDATE POR RAREZA (idempotente por IS DISTINCT FROM) ---------------
  UPDATE cartas_catalogo c
     SET precio_xp  = m.precio_xp,
         supply_max = m.supply_max,
         edicion    = 'limitada'
    FROM (VALUES ('comun',    150.00::numeric(12,2), 5000),
                 ('raro',     400.00::numeric(12,2), 1000),
                 ('epico',   1000.00::numeric(12,2),  250),
                 ('dorado',  2500.00::numeric(12,2),   50)
         ) AS m(rareza, precio_xp, supply_max)
   WHERE c.familia = 'lugar'
     AND c.rareza  = m.rareza
     AND (c.precio_xp  IS DISTINCT FROM m.precio_xp
       OR c.supply_max IS DISTINCT FROM m.supply_max
       OR c.edicion    IS DISTINCT FROM 'limitada');
  GET DIAGNOSTICS v_upd = ROW_COUNT;

  -- (4b) RECLASIFICACION ct_comun_01..06 DE 'territorio' A 'natural' ------
  -- Decision del OPERADOR del 2026-11-11, no de la spec. Las seis cartas
  -- ct_comun_01..06 son de familia 'lugar' y siguen siendo 'lugar': lo unico
  -- que cambia es el SUBTIPO. 'natural' es un subtipo VALIDO de 'lugar' en las
  -- dos fuentes que mandan (ADR-006), comprobadas antes de escribir esto:
  --   - lib/cartas-config.js:61  lugar: ['territorio', 'patrimonio', 'natural']
  --   - chk_cartas_catalogo_subtipo vivo en Neon (pg_get_constraintdef):
  --     familia='lugar' AND subtipo = ANY (ARRAY['territorio','patrimonio',
  --     'natural']), luego el UPDATE no puede violar el CHECK.
  -- Idempotente: el predicado subtipo = 'territorio' deja 0 filas en la
  -- segunda corrida. NO toca rareza, precio_xp, supply_max, edicion ni activo.
  UPDATE cartas_catalogo
     SET subtipo = 'natural'
   WHERE id IN ('ct_comun_01', 'ct_comun_02', 'ct_comun_03',
                'ct_comun_04', 'ct_comun_05', 'ct_comun_06')
     AND familia = 'lugar'
     AND subtipo = 'territorio';
  GET DIAGNOSTICS v_nat = ROW_COUNT;

  -- (5) GUARDAS POST (fail-closed) ----------------------------------------
  SELECT count(*),
         count(*) FILTER (WHERE precio_xp IS NULL OR precio_xp <= 0),
         count(*) FILTER (WHERE supply_max IS NULL),
         count(*) FILTER (WHERE supply_max IS NOT NULL AND emitidas > supply_max)
    INTO v_lugar, v_pnull, v_snull, v_over
    FROM cartas_catalogo
   WHERE familia = 'lugar';

  IF v_pnull > 0 THEN
    SELECT string_agg(id, ', ') INTO v_ids
      FROM cartas_catalogo
     WHERE familia = 'lugar' AND (precio_xp IS NULL OR precio_xp <= 0);
    RAISE EXCEPTION 'MIG070 ABORTA: % carta(s) lugar sin precio_xp valido: %',
      v_pnull, v_ids;
  END IF;

  IF v_snull > 0 THEN
    SELECT string_agg(id, ', ') INTO v_ids
      FROM cartas_catalogo
     WHERE familia = 'lugar' AND supply_max IS NULL;
    RAISE EXCEPTION 'MIG070 ABORTA: % carta(s) lugar sin supply_max: %',
      v_snull, v_ids;
  END IF;

  IF v_over > 0 THEN
    SELECT string_agg(id || ' (emitidas=' || emitidas ||
                      ' > supply_max=' || supply_max || ')', ', ')
      INTO v_ids
      FROM cartas_catalogo
     WHERE familia = 'lugar' AND supply_max IS NOT NULL AND emitidas > supply_max;
    RAISE EXCEPTION 'MIG070 ABORTA: lugar con emitidas > supply_max: %', v_ids;
  END IF;

  -- (5b) POST de la reclasificacion. Se cuenta POR ID (6) y no el total de la
  -- tabla, para que el guardia siga siendo cierto si en el futuro se crean mas
  -- cartas 'natural'. v_nat_tot solo informa en el NOTICE.
  SELECT count(*) INTO v_nat_ok
    FROM cartas_catalogo
   WHERE id IN ('ct_comun_01', 'ct_comun_02', 'ct_comun_03',
                'ct_comun_04', 'ct_comun_05', 'ct_comun_06')
     AND familia = 'lugar'
     AND subtipo = 'natural';
  IF v_nat_ok <> 6 THEN
    RAISE EXCEPTION 'MIG070 ABORTA: solo % de 6 ct_comun_* quedaron en subtipo natural', v_nat_ok;
  END IF;

  SELECT count(*) INTO v_nat_tot
    FROM cartas_catalogo
   WHERE familia = 'lugar' AND subtipo = 'natural';

  -- El CHECK de 066 sigue mandando en producto/consumible: precio_xp NULL.
  SELECT count(*) INTO v_pc_bad
    FROM cartas_catalogo
   WHERE familia IN ('producto', 'consumible')
     AND precio_xp IS NOT NULL;
  IF v_pc_bad > 0 THEN
    SELECT string_agg(id || '=' || precio_xp::text, ', ') INTO v_ids
      FROM cartas_catalogo
     WHERE familia IN ('producto', 'consumible') AND precio_xp IS NOT NULL;
    RAISE EXCEPTION 'MIG070 ABORTA: producto/consumible con precio_xp no nulo (CHECK de 066): %', v_ids;
  END IF;

  RAISE NOTICE 'MIG070 OK: % carta(s) lugar con precio y tirada; % fila(s) actualizadas en esta corrida (0 en la segunda)',
    v_lugar, v_upd;
  RAISE NOTICE 'MIG070 OK: reclasificacion ct_comun_01..06 -> natural; % fila(s) reclasificadas en esta corrida (0 en la segunda); % carta(s) lugar con subtipo natural en total',
    v_nat, v_nat_tot;
END
$m070$;
