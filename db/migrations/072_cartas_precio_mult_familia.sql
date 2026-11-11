-- ============================================================================
-- Migration 072: cartas - PRECIO DE ACUNACION por FAMILIA
--   (base por rareza x multiplicador de familia; cierra la divergencia D1 de la
--   spec 4.2, que hasta hoy NO estaba implementada ni en codigo ni en el dato).
-- Fecha: 2026-11-11
-- Referencias: ADR-121 (punto 5 del contrato), ADR-035 (XP numeric(12,2)),
--   ADR-002 (ASCII-safe), ADR-003 (cero borrado fisico), ADR-006 (el archivo
--   real manda), ADR-008 (idempotencia).
-- Requiere, YA APLICADAS y con fila valida en schema_migrations:
--   066 (familia/rareza/precio_xp + chk_cartas_catalogo_precio),
--   068 (precio_xp pasa a numeric(12,2)),
--   069 (familia NOT NULL),
--   070 (precio/supply de las 24 lugar),
--   071 (personaje y marca sembradas con el precio BASE: es el PREDECESOR
--        INMEDIATO de esta migracion. La 071 ya esta aplicada y NO se edita).
-- Contrato: docs/superpowers/specs/2026-11-11-cartas-familias-stats-supply-design.md
--   4.2 (precio_xp = base_rareza x mult_familia; la tabla de abajo ES su tabla).
-- Codigo espejo: lib/cartas-config.js (CARTA_PRECIO_BASE_XP, CARTA_MULT_FAMILIA
--   y precioAcunacion()). El SQL y el helper dicen LO MISMO: si uno cambia y el
--   otro no, dos cartas iguales cuestan distinto y nadie lo nota.
--
-- PROPOSITO (divergencia D1, declarada en la 071:56-64 y ahora cerrada)
--   La spec 4.2 fija precio = base por rareza x multiplicador de familia. La
--   068 no lo implemento y la 071 sembro la tabla BASE (150/400/1000/2500) en
--   las 14 cartas de personaje y marca: 180/480/1200/3000 y 225/600/1500/3750
--   son el precio correcto. Este fichero RECALCULA esas 14 filas con la formula
--   y deja el catalogo en el precio de contrato.
--
--     familia      mult.   comun  raro   epico   dorado
--     cosmetica      0,5      75   200     500     1250
--     lugar          1,0     150   400    1000     2500
--     personaje      1,2     180   480    1200     3000
--     artista        1,2     180   480    1200     3000
--     marca          1,5     225   600    1500     3750
--     producto         -       -     -       -        -   (precio = SKU)
--     consumible       -       -     -       -        -   (precio = SKU)
--
-- QUE HACE
--   1. Precondiciones: columnas de la 066/068 y precio_xp numeric(12,2).
--   2. Guarda PRE de rareza: si alguna carta ACUNABLE tiene rareza fuera de
--      comun/raro/epico/dorado, ABORTA listando los valores encontrados. Sin
--      mapeo no hay precio, y un precio inventado es peor que un aborto.
--   3. Guarda PRE del CHECK de 066: si alguna producto/consumible ya tiene
--      precio_xp NOT NULL, ABORTA (esta migracion no crea ese defecto, pero se
--      niega a correr sobre un catalogo que ya lo tiene).
--   4. Foto PRE del estado de las 24 lugar (md5 reproducible) para demostrar
--      que el multiplicador 1,0 no las toca.
--   5. UPDATE de precio_xp SOLO en las 5 familias acunables, por (familia,
--      rareza), con IS DISTINCT FROM: la segunda corrida actualiza 0 filas.
--   6. Guardas POST, todas fail-closed:
--      - 0 acunables con precio_xp NULL o <= 0;
--      - 0 acunables con un precio que NO sea el de su par (familia, rareza);
--      - 0 producto/consumible con precio_xp no NULL (CHECK de 066);
--      - md5 de lugar IDENTICO al PRE (24 filas, mismo orden, mismo texto).
--   7. NOTICE con el reparto real y las filas actualizadas.
--
-- QUE NO HACE
--   - NO toca producto ni consumible: su precio es el del SKU y su precio_xp
--     DEBE seguir NULL (chk_cartas_catalogo_precio, 066:243-253). Son 4
--     producto + 3 consumible = 7 filas.
--   - NO toca supply_max, edicion, emitidas, activo, rareza, familia,
--     nivel_gate, stats_json ni nivel de carta. El UNICO campo que escribe es
--     precio_xp.
--   - NO recalcula cartas ya acunadas por otro camino: en esta base
--     usuarios_cartas = 0 filas (medido), y la spec 4.2 resuelve el precio al
--     acunar y lo GUARDA: cambiar la tabla de factores no reprecifica lo ya
--     vendido.
--   - NO escribe schema_migrations: lo hace el runner (contrato de 045).
--   - Sin borrado fisico de ningun tipo (ADR-003).
--
-- IDEMPOTENCIA (ADR-008)
--   - El UPDATE lleva "precio_xp IS DISTINCT FROM <formula>": la segunda
--     corrida actualiza 0 filas y lo reporta con NOTICE.
--   - Las guardas son aserciones (comparan), no acumulaciones (no suman ni
--     multiplican): reejecutar no mueve ningun numero.
--   - Todo el cuerpo es UN bloque DO: para el runner es una sola sentencia.
--
-- ATOMICIDAD: o las 14 cartas quedan con el precio de la spec y las 24 lugar
-- intactas, o no cambia ninguna fila.
--
-- PRE (medido en Neon el 2026-11-11, antes de escribir este fichero)
--   cartas_catalogo = 45 filas:
--     lugar      24 = 9 comun + 7 raro + 5 epico + 3 dorado, a 150/400/1000/2500
--     personaje   8 = 3 comun + 2 raro + 2 epico + 1 dorado, TODAS a 150/400/1000/2500
--     marca       6 = 2 comun + 2 raro + 1 epico + 1 dorado, TODAS a 150/400/1000/2500
--     producto    4 y consumible 3 = 7 filas, precio_xp NULL (correcto)
--   precio_xp: numeric(12,2) (la 068 ya corrio). 0 acunables con rareza fuera
--   del mapeo. 0 producto/consumible con precio no nulo.
--   md5 (formula reproducible, los NULL se marcan con '~' porque la
--   concatenacion cruda los propaga y deja el string_agg entero en NULL):
--     md5(string_agg(id||'~'||familia||'~'||rareza||'~'
--                    ||coalesce(precio_xp::text,'~'), '|' ORDER BY id))
--     PRE global (45 filas)  = 78c2dd790255d75b3382478c42cd830f
--     PRE familia lugar (24) = f4eee781bf767aff04b60363e2f383f3
--   Nota de la guarda de rareza: chk_cartas_catalogo_rareza (040) ya cierra el
--   dominio a comun/raro/epico/dorado (medido: un UPDATE a 'legendaria'
--   devuelve SQLSTATE 23514), asi que hoy la guarda es defensiva y no puede
--   dispararse. Se queda igual: si el CHECK se relaja, el precio no se inventa.
--
-- POST esperado (misma formula)
--   personaje 8: 3 x 180.00 + 2 x 480.00 + 2 x 1200.00 + 1 x 3000.00
--   marca 6    : 2 x 225.00 + 2 x 600.00 + 1 x 1500.00 + 1 x 3750.00
--   lugar 24   : SIN CAMBIO (150/400/1000/2500; md5 identico al PRE)
--   producto/consumible 7: precio_xp NULL, sin cambio
--   24 + 14 = 38 cartas con precio_xp > 0 (acunables y comprables con
--   carta_acunar); 7 con NULL (se pagan por SKU).
--   Filas actualizadas en la PRIMERA corrida: 14 (0 en la segunda).
--     POST global (45 filas)  = 5c5e35f14abd887e6aa76ecf3af0f987
--     POST familia lugar (24) = identico al PRE: f4eee781bf767aff04b60363e2f383f3
--   Los dos md5 estan MEDIDOS, no predichos: el mismo bloque DO se corrio el
--   2026-11-11 dentro de una transaccion cerrada con ROLLBACK, y con ella se
--   comprobo tambien la segunda corrida (md5 identico) y el 23514 del CHECK de
--   066 sobre un producto (dos veces).
--
-- ROLLBACK (comentado, NO ejecutar desde el runner; solo revierte VALORES y
-- solo si nada se acuno todavia: el precio historico de una carta acunada no
-- se reescribe, spec 4.2):
--   -- UPDATE cartas_catalogo c
--   --    SET precio_xp = b.base
--   --   FROM (VALUES ('comun', 150.00::numeric(12,2)),
--   --                ('raro',  400.00::numeric(12,2)),
--   --                ('epico',1000.00::numeric(12,2)),
--   --                ('dorado',2500.00::numeric(12,2))) AS b(rareza, base)
--   --  WHERE c.familia IN ('personaje', 'artista', 'marca', 'cosmetica')
--   --    AND c.rareza = b.rareza;
--   -- (lugar ya esta a base x 1,0: no hace falta revertirla)
--
-- ASCII-safe (ADR-002): 0 bytes > 127, cero backticks, sin acentos ni enes.
-- ============================================================================

DO $m072$
DECLARE
  v_cols    int;
  v_tipo    text;
  v_escala  int;
  v_raros   text;
  v_pc_bad  text;
  v_md5_pre text;
  v_md5_lug_pre text;
  v_md5_lug_post text;
  v_upd     int;
  v_acun    int;
  v_pnull   int;
  v_fuera   text;
  v_reparto text;
BEGIN
  -- (0) PRECONDICIONES: columnas de 066 y tipo de 068 -----------------------
  SELECT count(*) INTO v_cols
    FROM information_schema.columns
   WHERE table_schema = 'public'
     AND table_name   = 'cartas_catalogo'
     AND column_name IN ('id', 'familia', 'rareza', 'precio_xp');
  IF v_cols <> 4 THEN
    RAISE EXCEPTION 'MIG072: faltan columnas de la 066 (encontradas % de 4)', v_cols;
  END IF;

  SELECT data_type, coalesce(numeric_scale, -1)
    INTO v_tipo, v_escala
    FROM information_schema.columns
   WHERE table_schema = 'public'
     AND table_name   = 'cartas_catalogo'
     AND column_name  = 'precio_xp';
  IF v_tipo IS DISTINCT FROM 'numeric' OR v_escala IS DISTINCT FROM 2 THEN
    RAISE EXCEPTION 'MIG072: precio_xp es % scale % y debe ser numeric(12,2); falta 068',
      coalesce(v_tipo, 'ausente'), coalesce(v_escala::text, 'n/d');
  END IF;

  -- (1) GUARDA PRE DE RAREZA: sin mapeo no hay precio -----------------------
  SELECT string_agg(DISTINCT coalesce(rareza, '<NULL>'), ', ')
    INTO v_raros
    FROM cartas_catalogo
   WHERE familia IN ('lugar', 'personaje', 'artista', 'marca', 'cosmetica')
     AND (rareza IS NULL OR rareza NOT IN ('comun', 'raro', 'epico', 'dorado'));
  IF v_raros IS NOT NULL THEN
    RAISE EXCEPTION 'MIG072 ABORTA: carta acunable con rareza fuera del mapeo: %', v_raros;
  END IF;

  -- (2) GUARDA PRE DEL CHECK DE 066 (producto/consumible sin precio) --------
  SELECT string_agg(id || '=' || precio_xp::text, ', ')
    INTO v_pc_bad
    FROM cartas_catalogo
   WHERE familia IN ('producto', 'consumible')
     AND precio_xp IS NOT NULL;
  IF v_pc_bad IS NOT NULL THEN
    RAISE EXCEPTION 'MIG072 ABORTA: producto/consumible con precio_xp no nulo (CHECK de 066): %', v_pc_bad;
  END IF;

  -- (3) FOTO PRE de lugar y del catalogo entero (md5 reproducible) ----------
  SELECT md5(string_agg(id || '~' || rareza || '~'
                        || coalesce(precio_xp::text, '~'), '|' ORDER BY id))
    INTO v_md5_lug_pre
    FROM cartas_catalogo
   WHERE familia = 'lugar';
  IF v_md5_lug_pre IS NULL THEN
    RAISE EXCEPTION 'MIG072 ABORTA: 0 cartas familia lugar; falta la 070';
  END IF;

  SELECT md5(string_agg(id || '~' || familia || '~' || rareza || '~'
                        || coalesce(precio_xp::text, '~'), '|' ORDER BY id))
    INTO v_md5_pre
    FROM cartas_catalogo;

  -- (4) UPDATE POR (FAMILIA, RAREZA): precio = base x mult ------------------
  -- Los DOS factores son los de lib/cartas-config.js: base 150/400/1000/2500 y
  -- mult cosmetica 0,5 / lugar 1,0 / personaje 1,2 / artista 1,2 / marca 1,5.
  -- round(...,2) porque precio_xp es numeric(12,2) (ADR-035): el valor se
  -- guarda ya cerrado y el handler solo lo lee.
  UPDATE cartas_catalogo c
     SET precio_xp = round(b.base * m.mult, 2)
    FROM (VALUES ('comun',    150.00::numeric(12,2)),
                 ('raro',     400.00::numeric(12,2)),
                 ('epico',   1000.00::numeric(12,2)),
                 ('dorado',  2500.00::numeric(12,2))
         ) AS b(rareza, base)
   CROSS JOIN (VALUES ('lugar',      1.0::numeric),
                      ('personaje',  1.2::numeric),
                      ('artista',    1.2::numeric),
                      ('marca',      1.5::numeric),
                      ('cosmetica',  0.5::numeric)
              ) AS m(familia, mult)
   WHERE c.familia = m.familia
     AND c.rareza  = b.rareza
     AND c.precio_xp IS DISTINCT FROM round(b.base * m.mult, 2);
  GET DIAGNOSTICS v_upd = ROW_COUNT;

  -- (5) GUARDAS POST (fail-closed) -----------------------------------------
  SELECT count(*), count(*) FILTER (WHERE precio_xp IS NULL OR precio_xp <= 0)
    INTO v_acun, v_pnull
    FROM cartas_catalogo
   WHERE familia IN ('lugar', 'personaje', 'artista', 'marca', 'cosmetica');

  IF v_pnull > 0 THEN
    SELECT string_agg(id, ', ') INTO v_raros
      FROM cartas_catalogo
     WHERE familia IN ('lugar', 'personaje', 'artista', 'marca', 'cosmetica')
       AND (precio_xp IS NULL OR precio_xp <= 0);
    RAISE EXCEPTION 'MIG072 ABORTA: % carta(s) acunable(s) sin precio_xp valido: %',
      v_pnull, v_raros;
  END IF;

  -- El precio de cada acunable TIENE que ser el de su par (familia, rareza).
  -- Esta guarda es la que demuestra la formula: un "precio > 0" a secas
  -- aceptaria el 150 base de la 071 y la divergencia D1 pasaria en verde.
  SELECT string_agg(c.id || ' (' || c.familia || '/' || c.rareza || '=' ||
                    c.precio_xp::text || ', esperado ' ||
                    round(b.base * m.mult, 2)::text || ')', ', ')
    INTO v_fuera
    FROM cartas_catalogo c
    JOIN (VALUES ('comun',    150.00::numeric(12,2)),
                 ('raro',     400.00::numeric(12,2)),
                 ('epico',   1000.00::numeric(12,2)),
                 ('dorado',  2500.00::numeric(12,2))
         ) AS b(rareza, base)       ON b.rareza  = c.rareza
    JOIN (VALUES ('lugar',      1.0::numeric),
                 ('personaje',  1.2::numeric),
                 ('artista',    1.2::numeric),
                 ('marca',      1.5::numeric),
                 ('cosmetica',  0.5::numeric)
         ) AS m(familia, mult)      ON m.familia = c.familia
   WHERE c.precio_xp IS DISTINCT FROM round(b.base * m.mult, 2);
  IF v_fuera IS NOT NULL THEN
    RAISE EXCEPTION 'MIG072 ABORTA: precio fuera de la tabla de 4.2: %', v_fuera;
  END IF;

  -- producto/consumible SIGUEN con precio_xp NULL (CHECK de 066) ------------
  SELECT string_agg(id || '=' || precio_xp::text, ', ')
    INTO v_pc_bad
    FROM cartas_catalogo
   WHERE familia IN ('producto', 'consumible')
     AND precio_xp IS NOT NULL;
  IF v_pc_bad IS NOT NULL THEN
    RAISE EXCEPTION 'MIG072 ABORTA: producto/consumible con precio_xp no nulo (CHECK de 066): %', v_pc_bad;
  END IF;

  -- lugar NO cambio: mismo md5, mismo numero de filas ----------------------
  SELECT md5(string_agg(id || '~' || rareza || '~'
                        || coalesce(precio_xp::text, '~'), '|' ORDER BY id))
    INTO v_md5_lug_post
    FROM cartas_catalogo
   WHERE familia = 'lugar';
  IF v_md5_lug_post IS DISTINCT FROM v_md5_lug_pre THEN
    RAISE EXCEPTION 'MIG072 ABORTA: el md5 de las 24 lugar cambio (% -> %); el multiplicador 1,0 no debe moverlas',
      v_md5_lug_pre, v_md5_lug_post;
  END IF;

  -- (6) INFORME: reparto real por familia y rareza -------------------------
  SELECT string_agg(familia || '/' || rareza || '=' || precio_xp::text ||
                    ' x' || n::text, ', ')
    INTO v_reparto
    FROM (SELECT familia, rareza, precio_xp, count(*) AS n
            FROM cartas_catalogo
           WHERE familia IN ('lugar', 'personaje', 'artista', 'marca', 'cosmetica')
           GROUP BY familia, rareza, precio_xp
           ORDER BY familia, rareza, precio_xp) AS s;

  RAISE NOTICE 'MIG072 OK: % fila(s) actualizadas en esta corrida (0 en la segunda)', v_upd;
  RAISE NOTICE 'MIG072 OK: % carta(s) acunable(s) con precio > 0; reparto: %', v_acun, v_reparto;
  RAISE NOTICE 'MIG072 OK: md5 lugar sin cambio (%); md5 global PRE %',
    v_md5_lug_post, v_md5_pre;
END
$m072$;
