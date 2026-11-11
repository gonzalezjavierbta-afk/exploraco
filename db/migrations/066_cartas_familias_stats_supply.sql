-- ============================================================================
-- Migration 066: cartas - FAMILIA, SUBTIPO, EDICION, SUPPLY_MAX, EMITIDAS,
--   PRECIO_XP y tabla de NIVEL POR CARTA (usuarios_cartas_nivel).
-- Fecha: 2026-11-11
-- Referencias: ADR-121, ADR-108, ADR-120, ADR-018, ADR-002 (ASCII-safe),
--   ADR-003 (cero borrado logico), ADR-006 (el archivo real manda),
--   ADR-008 (idempotencia).
-- Requiere: 040 (cartas_catalogo, usuarios_cartas), 046 (usuarios.xp_gastado_sinks),
--   060 (stats_json, fusionable, emisor), 061 (PK de usuarios_cartas),
--   065 (cartas_catalogo.set_coleccion).
-- Contrato congelado: docs/superpowers/specs/2026-11-11-cartas-familias-stats-supply-design.md
--   seccion 7.1 (bloques 0 a 7) y matriz 8 (V1 a V11). Nombres, tipos y
--   definiciones de CHECK son LITERALES: esta migracion no anade columnas ni
--   constraints que la spec no pida.
--
-- PROPOSITO
--   1. cartas_catalogo: familia, subtipo, precio_xp, edicion, supply_max,
--      emitidas. Todas aditivas; familia y subtipo nacen NULLABLE (expand).
--   2. Backfill de familia/subtipo por prefijo de id, orden cta -> ce -> ct:
--      24 lugar/territorio, 3 consumible/entrada_evento, 4 producto/fisico
--      sobre las 31 cartas conocidas (baseline medido el 2026-11-11).
--   3. MERGE minimo de stats_json para las 24 lugar (primario 'alcance').
--   4. 8 CHECKs de dominio + sustitucion del CHECK de stats_json de 060 por
--      el de los 5 ejes (alcance/oficio/fortuna/rendimiento/presencia).
--      bonus_xp_pct queda TOLERADA e inerte (ADR-003: prohibirla obligaria a
--      borrar la clave de las filas que la tienen).
--   5. Backfill de emitidas = inventario (usuarios_cartas) + escrow
--      (cartas_ofertas.cantidad_restante), con GREATEST.
--   6. Tabla usuarios_cartas_nivel (sumidero de nivel) + 2 CHECKs + indice.
--   7. Indices idx_cartas_catalogo_familia e idx_cartas_catalogo_tirada.
--
-- QUE NO HACE
--   - No aplica SET NOT NULL a familia/subtipo: es el PASO 2 (fase 2,
--     migracion nueva 0NN_cartas_familia_not_null.sql). cartas_crear
--     (api/admin.js) inserta sin familia/subtipo y un NOT NULL hoy romperia
--     el alta del panel con 23502, y esta tanda no toca api/admin.js.
--   - No borra ni renombra columnas, tablas ni filas. No toca usuarios_cartas
--     (su PK es intocable, 061), ni cromos_catalogo, ni endpoints.
--   - No escribe schema_migrations: lo hace el runner (contrato de 045).
--   - No crea indices sobre cartas_ofertas ni toca su CHECK de estado.
--
-- IDEMPOTENCIA (ADR-008)
--   ADD COLUMN IF NOT EXISTS ................. no-op en la segunda corrida.
--   UPDATE ... WHERE familia IS NULL ......... 0 filas la segunda vez.
--   UPDATE ... WHERE (stats_json->>'primario') IS NULL ... 0 filas la 2a vez.
--   UPDATE emitidas ... WHERE circ.n > emitidas ... 0 filas la 2a vez.
--   CREATE TABLE/INDEX IF NOT EXISTS ......... no-op.
--   ADD CONSTRAINT no admite IF NOT EXISTS -> todo va en DO con guarda
--     pg_constraint; el CHECK de stats usa guarda por DEFINICION (065:123-127)
--     para que el de 060 se sustituya de verdad.
--
-- ATOMICIDAD
--   El runner NO abre transaccion (driver HTTP de Neon, divide por ';'
--   respetando dollar-quote: scripts/apply_sql_file.js:11, :651). Por eso:
--   cero sentencias de apertura o cierre de transaccion, y el DROP + ADD del
--   CHECK de stats van DENTRO del mismo DO (una sola sentencia atomica).
--
-- ASCII-SAFE (ADR-002): cero bytes > 127, cero tildes, cero backticks.
--
-- CONSULTAS PRE (solo lectura, scripts/neon_select.js -f archivo.sql)
--   SELECT count(*) FROM cartas_catalogo;                       -- 31
--   SELECT count(*) FROM information_schema.columns
--    WHERE table_schema='public' AND table_name='cartas_catalogo'
--      AND column_name IN ('familia','subtipo','precio_xp','edicion',
--                          'supply_max','emitidas');             -- 0 antes
--   SELECT count(*) FROM information_schema.tables
--    WHERE table_schema='public'
--      AND table_name='usuarios_cartas_nivel';                 -- 0 antes
--
-- CONSULTAS POST (matriz 8: V1 a V8 de la spec)
--   SELECT count(*) AS total, count(familia) AS con_familia
--     FROM cartas_catalogo;                                     -- 31 / 31
--   SELECT familia, subtipo, count(*) FROM cartas_catalogo
--    GROUP BY 1,2 ORDER BY 1,2;        -- 24 lugar/territorio, 3 consumible
--                                      -- /entrada_evento, 4 producto/fisico
--   SELECT count(*) FROM cartas_catalogo WHERE familia IS NULL; -- 0
--   SELECT count(*) FROM cartas_catalogo
--    WHERE supply_max IS NOT NULL AND emitidas > supply_max;    -- 0
--   SELECT count(*) FROM pg_constraint
--    WHERE conname='chk_cartas_catalogo_stats'
--      AND pg_get_constraintdef(oid) NOT LIKE '%alcance%';      -- 0
--
-- ROLLBACK (documentado, NO se ejecuta; requiere aprobacion del operador)
--   -- ADR-003: el rollback no borra datos de usuarios. Orden inverso.
--   -- 1) DROP TABLE IF EXISTS usuarios_cartas_nivel;      -- 0 filas: sin perdida
--   -- 2) DROP INDEX IF EXISTS idx_cartas_catalogo_tirada;
--   -- 3) DROP INDEX IF EXISTS idx_cartas_catalogo_familia;
--   -- 4) ALTER TABLE cartas_catalogo DROP CONSTRAINT IF EXISTS
--   --    chk_cartas_catalogo_supply;  (idem emitidas, edicion, precio,
--   --    subtipo, familia, no_fusion_cosmetica, sku)
--   -- 5) Restaurar el CHECK de stats de 060:335-344 en el MISMO DO (DROP+ADD).
--   -- 6) ALTER TABLE cartas_catalogo DROP COLUMN IF EXISTS emitidas,
--   --    supply_max, edicion, precio_xp, subtipo, familia;
--   --    DESTRUCTIVO: la clasificacion es derivable del prefijo del id
--   --    (bloque 2), pero el vector de stats_json NO es derivable:
--   --    exportarlo antes.
--   -- 7) DELETE FROM schema_migrations WHERE numero = 66;  -- solo si aplica
-- ============================================================================

-- (0) PRECONDICION: aborta ANTES de escribir si falta un predecesor ----------
DO $m066pre$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                  WHERE table_schema = 'public' AND table_name = 'cartas_catalogo'
                    AND column_name = 'set_coleccion') THEN
    RAISE EXCEPTION 'MIG066: falta 065 (cartas_catalogo.set_coleccion)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                  WHERE table_schema = 'public' AND table_name = 'usuarios'
                    AND column_name = 'xp_gastado_sinks') THEN
    RAISE EXCEPTION 'MIG066: falta 046 (usuarios.xp_gastado_sinks)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                  WHERE conname = 'chk_usuarios_cartas_variante') THEN
    RAISE EXCEPTION 'MIG066: falta 060/061 (variante de usuarios_cartas)';
  END IF;
END
$m066pre$;

-- (1) COLUMNAS NUEVAS DE cartas_catalogo (aditivas, ninguna NOT NULL sin
--     backfill previo). familia y subtipo se quedan NULLABLE en 066.
ALTER TABLE cartas_catalogo
  ADD COLUMN IF NOT EXISTS familia varchar(12);

ALTER TABLE cartas_catalogo
  ADD COLUMN IF NOT EXISTS subtipo text;

ALTER TABLE cartas_catalogo
  ADD COLUMN IF NOT EXISTS precio_xp integer;

ALTER TABLE cartas_catalogo
  ADD COLUMN IF NOT EXISTS edicion varchar(10) NOT NULL DEFAULT 'abierta';

ALTER TABLE cartas_catalogo
  ADD COLUMN IF NOT EXISTS supply_max integer;

ALTER TABLE cartas_catalogo
  ADD COLUMN IF NOT EXISTS emitidas integer NOT NULL DEFAULT 0;

-- (2) BACKFILL DE familia / subtipo ------------------------------------------
--     Orden OBLIGATORIO cta -> ce -> ct. Se usa left(id, char_length(literal))
--     y nunca LIKE: el guion bajo de LIKE es comodin de un caracter y
--     'ct_%' casaria tambien 'cta_ancestral_01'. char_length() ata el numero
--     al literal, asi no puede desincronizarse (off-by-one de 13 vs 14).
--     Predicado familia IS NULL: la segunda corrida toca 0 filas.
UPDATE cartas_catalogo
   SET familia = 'producto', subtipo = 'fisico'
 WHERE familia IS NULL
   AND left(id, char_length('cta_ancestral_')) = 'cta_ancestral_';

UPDATE cartas_catalogo
   SET familia = 'consumible', subtipo = 'entrada_evento'
 WHERE familia IS NULL
   AND left(id, char_length('ce_evento_')) = 'ce_evento_';

UPDATE cartas_catalogo
   SET familia = 'lugar', subtipo = 'territorio'
 WHERE familia IS NULL
   AND left(id, char_length('ct_')) = 'ct_';

-- (2b) BACKFILL MINIMO DE stats_json (MERGE, nunca reemplazo) ----------------
--      Solo las 24 lugar. Las 4 cta_ancestral_* conservan sku, volumen_ml,
--      set_slug y premio_set (065:78-90): su vector queda vacio (no dan
--      poder). Las 3 ce_evento_* se dejan intactas: cero escritura
--      innecesaria. Idempotente por (stats_json->>'primario') IS NULL.
UPDATE cartas_catalogo
   SET stats_json = COALESCE(stats_json, '{}'::jsonb) || jsonb_build_object(
         'primario', 'alcance',
         'alcance', CASE rareza WHEN 'comun' THEN 3 WHEN 'raro' THEN 5
                                WHEN 'epico' THEN 9 ELSE 14 END,
         'fortuna', CASE rareza WHEN 'comun' THEN 1 WHEN 'raro' THEN 3
                                WHEN 'epico' THEN 5 ELSE 10 END)
 WHERE familia = 'lugar' AND (stats_json->>'primario') IS NULL;

-- (3) VERIFICACION + CONSTRAINTS ---------------------------------------------
--     Todo en un DO (una sola sentencia atomica). Verificacion ANTES de los
--     ADD CONSTRAINT. Fail-closed: si queda una sola fila sin familia se
--     aborta la migracion entera.
--     NOTA DE EJECUCION: el baseline de 31 NO se usa como condicion de aborto
--     (instruccion del operador del 2026-11-11). La condicion de aborto es
--     "0 filas con familia IS NULL"; el reparto real se reporta en la
--     verificacion post (V1/V2), no se asume.
DO $m066c$
DECLARE
  v_nulo    integer;
  v_sin_sub integer;
  v_lugar   integer;
  v_cons    integer;
  v_prod    integer;
  v_total   integer;
BEGIN
  SELECT count(*) INTO v_nulo FROM cartas_catalogo WHERE familia IS NULL;
  IF v_nulo <> 0 THEN
    RAISE EXCEPTION 'MIG066: quedan % cartas sin familia', v_nulo;
  END IF;

  SELECT count(*) INTO v_sin_sub
    FROM cartas_catalogo WHERE familia = 'lugar' AND subtipo IS NULL;
  IF v_sin_sub <> 0 THEN
    RAISE EXCEPTION 'MIG066: quedan % lugares sin subtipo', v_sin_sub;
  END IF;

  -- Reparto real (informativo, no condiciona el exito).
  SELECT count(*) FILTER (WHERE familia = 'lugar'),
         count(*) FILTER (WHERE familia = 'consumible'),
         count(*) FILTER (WHERE familia = 'producto'),
         count(*)
    INTO v_lugar, v_cons, v_prod, v_total
    FROM cartas_catalogo;
  RAISE NOTICE 'MIG066: total=% lugar=% consumible=% producto=%',
    v_total, v_lugar, v_cons, v_prod;

  -- CHECK de dominio de familia.
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                  WHERE conname = 'chk_cartas_catalogo_familia'
                    AND conrelid = 'public.cartas_catalogo'::regclass) THEN
    ALTER TABLE cartas_catalogo
      ADD CONSTRAINT chk_cartas_catalogo_familia
      CHECK (familia IN ('lugar', 'personaje', 'artista', 'marca', 'producto',
                         'consumible', 'cosmetica'));
  END IF;

  -- Dominio cerrado por familia. Un NULL no viola un CHECK de igualdad, asi
  -- que las columnas pueden seguir nullables (expand/contract).
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                  WHERE conname = 'chk_cartas_catalogo_subtipo'
                    AND conrelid = 'public.cartas_catalogo'::regclass) THEN
    ALTER TABLE cartas_catalogo
      ADD CONSTRAINT chk_cartas_catalogo_subtipo
      CHECK (
        (familia = 'lugar' AND subtipo IN ('territorio', 'patrimonio', 'natural'))
        OR (familia = 'personaje' AND subtipo IN ('historico', 'ficcion', 'folclor'))
        OR (familia = 'artista' AND subtipo IN ('musica', 'cine', 'grafica', 'literatura'))
        OR (familia = 'marca' AND subtipo IN ('licor', 'gastronomia', 'artesania', 'otra'))
        OR (familia = 'producto' AND subtipo IN ('fisico', 'digital'))
        OR (familia = 'consumible' AND subtipo IN ('entrada_evento', 'bono', 'servicio'))
        OR (familia = 'cosmetica' AND subtipo IN ('marco', 'fondo', 'insignia'))
      );
  END IF;

  -- Economia: producto y consumible NO tienen precio propio (su precio es el
  -- del SKU). Cualquier otra familia puede tener precio_xp positivo o NULL.
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                  WHERE conname = 'chk_cartas_catalogo_precio'
                    AND conrelid = 'public.cartas_catalogo'::regclass) THEN
    ALTER TABLE cartas_catalogo
      ADD CONSTRAINT chk_cartas_catalogo_precio
      CHECK (
        (familia IN ('producto', 'consumible') AND precio_xp IS NULL)
        OR (familia NOT IN ('producto', 'consumible')
            AND (precio_xp IS NULL OR precio_xp > 0))
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                  WHERE conname = 'chk_cartas_catalogo_edicion'
                    AND conrelid = 'public.cartas_catalogo'::regclass) THEN
    ALTER TABLE cartas_catalogo
      ADD CONSTRAINT chk_cartas_catalogo_edicion
      CHECK (edicion IN ('abierta', 'limitada', 'serial'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                  WHERE conname = 'chk_cartas_catalogo_supply'
                    AND conrelid = 'public.cartas_catalogo'::regclass) THEN
    ALTER TABLE cartas_catalogo
      ADD CONSTRAINT chk_cartas_catalogo_supply
      CHECK (
        (edicion = 'abierta' AND supply_max IS NULL)
        OR (edicion IN ('limitada', 'serial')
            AND supply_max IS NOT NULL AND supply_max > 0)
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                  WHERE conname = 'chk_cartas_catalogo_emitidas'
                    AND conrelid = 'public.cartas_catalogo'::regclass) THEN
    ALTER TABLE cartas_catalogo
      ADD CONSTRAINT chk_cartas_catalogo_emitidas
      CHECK (emitidas >= 0 AND (supply_max IS NULL OR emitidas <= supply_max));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                  WHERE conname = 'chk_cartas_catalogo_no_fusion_cosmetica'
                    AND conrelid = 'public.cartas_catalogo'::regclass) THEN
    ALTER TABLE cartas_catalogo
      ADD CONSTRAINT chk_cartas_catalogo_no_fusion_cosmetica
      CHECK (fusionable = false OR familia <> 'cosmetica');
  END IF;

  -- Producto siempre identificado por SKU. Las 4 cta_ancestral_* ya lo
  -- cumplen (065:78-90). NO se aplica a consumible: las 3 ce_evento_* son
  -- legacy sin sku.
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                  WHERE conname = 'chk_cartas_catalogo_sku'
                    AND conrelid = 'public.cartas_catalogo'::regclass) THEN
    ALTER TABLE cartas_catalogo
      ADD CONSTRAINT chk_cartas_catalogo_sku
      CHECK (familia <> 'producto' OR (stats_json ? 'sku'));
  END IF;

  -- CHECK de stats_json: DROP + ADD en el MISMO DO (atomico). La guarda del
  -- DROP es por DEFINICION, no por nombre: con "IF NOT EXISTS (conname)" el
  -- CHECK de 060 nunca se sustituiria y el vector quedaria sin validar en
  -- silencio. Patron literal 065:123-127. Se compara en jsonb (>= '0'::jsonb)
  -- y NUNCA con cast a numeric: un cast fallaria con 22P02 ante "quince" en
  -- vez de devolver 23514 (leccion de 060:326-330).
  IF EXISTS (SELECT 1 FROM pg_constraint
              WHERE conname = 'chk_cartas_catalogo_stats'
                AND conrelid = 'public.cartas_catalogo'::regclass
                AND pg_get_constraintdef(oid) NOT LIKE '%alcance%') THEN
    ALTER TABLE cartas_catalogo DROP CONSTRAINT chk_cartas_catalogo_stats;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                  WHERE conname = 'chk_cartas_catalogo_stats'
                    AND conrelid = 'public.cartas_catalogo'::regclass) THEN
    ALTER TABLE cartas_catalogo
      ADD CONSTRAINT chk_cartas_catalogo_stats CHECK (
        jsonb_typeof(stats_json) = 'object'
        AND (
          NOT (stats_json ? 'alcance')
          OR (jsonb_typeof(stats_json -> 'alcance') = 'number'
              AND (stats_json -> 'alcance') >= '0'::jsonb
              AND (stats_json -> 'alcance') <= '40'::jsonb)
        )
        AND (
          NOT (stats_json ? 'oficio')
          OR (jsonb_typeof(stats_json -> 'oficio') = 'number'
              AND (stats_json -> 'oficio') >= '0'::jsonb
              AND (stats_json -> 'oficio') <= '40'::jsonb)
        )
        AND (
          NOT (stats_json ? 'fortuna')
          OR (jsonb_typeof(stats_json -> 'fortuna') = 'number'
              AND (stats_json -> 'fortuna') >= '0'::jsonb
              AND (stats_json -> 'fortuna') <= '40'::jsonb)
        )
        AND (
          NOT (stats_json ? 'rendimiento')
          OR (jsonb_typeof(stats_json -> 'rendimiento') = 'number'
              AND (stats_json -> 'rendimiento') >= '0'::jsonb
              AND (stats_json -> 'rendimiento') <= '40'::jsonb)
        )
        AND (
          NOT (stats_json ? 'presencia')
          OR (jsonb_typeof(stats_json -> 'presencia') = 'number'
              AND (stats_json -> 'presencia') >= '0'::jsonb
              AND (stats_json -> 'presencia') <= '40'::jsonb)
        )
        AND (
          NOT (stats_json ? 'primario')
          OR stats_json ->> 'primario' IN ('alcance', 'oficio', 'fortuna',
                                           'rendimiento', 'presencia')
        )
      );
  END IF;

  -- Tripwire de la sustitucion: el CHECK resultante tiene que nombrar los
  -- cinco ejes. Si no, se aborta el DO entero.
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                  WHERE conname = 'chk_cartas_catalogo_stats'
                    AND conrelid = 'public.cartas_catalogo'::regclass
                    AND pg_get_constraintdef(oid) LIKE '%alcance%'
                    AND pg_get_constraintdef(oid) LIKE '%oficio%'
                    AND pg_get_constraintdef(oid) LIKE '%fortuna%') THEN
    RAISE EXCEPTION 'MIG066: chk_cartas_catalogo_stats no es el de los 5 ejes';
  END IF;
END
$m066c$;

-- (4) PASO 2 DIFERIDO: SET NOT NULL NO se ejecuta aqui. ----------------------
--     Pertenece a la fase 2, migracion nueva 0NN_cartas_familia_not_null.sql,
--     DESPUES de parchear cartas_crear/cartas_editar (api/admin.js).
--     Paso 1 (066): columnas nullable + backfill + CHECKs de dominio.
--     Paso 2 (fase 2): admin escribe familia/subtipo -> verificar 0 NULL ->
--     SET NOT NULL. Duenno: @admin-dev. Gate: SI.
--     Criterio de aceptacion del paso 2: alta sin familia -> 400
--     PARAMETROS_INVALIDOS, nunca 23502.

-- (5) BACKFILL DE emitidas = CIRCULACION REAL (inventario + escrow) ----------
--     carta_publicar descuenta de usuarios_cartas y mueve las copias a
--     cartas_ofertas.cantidad_restante con estado abierta/parcial
--     (041:109-130). Contar solo el inventario subestimaria la circulacion.
--     GREATEST: nunca rebaja un valor previo. circ.n > c.emitidas deja la
--     segunda corrida en 0 filas. Cero escritura para cartas sin circulacion.
WITH circ AS (
  SELECT c.id,
         COALESCE((SELECT SUM(u.cantidad) FROM usuarios_cartas u
                    WHERE u.carta_id = c.id AND u.activo = true), 0)
       + COALESCE((SELECT SUM(o.cantidad_restante) FROM cartas_ofertas o
                    WHERE o.carta_id = c.id AND o.activo = true
                      AND o.estado IN ('abierta', 'parcial')), 0) AS n
    FROM cartas_catalogo c
)
UPDATE cartas_catalogo c
   SET emitidas = GREATEST(c.emitidas, circ.n)
  FROM circ
 WHERE circ.id = c.id
   AND circ.n > c.emitidas;

-- (6) TABLA DE NIVEL POR CARTA (sumidero de nivel) ---------------------------
--     PK (usuario_id, carta_id) SIN variante: el nivel es propiedad de la
--     carta poseida, no de la copia (si la PK incluyera variante, fusionar a
--     shiny perderia el nivel). No toca usuarios_cartas ni su PK (061).
CREATE TABLE IF NOT EXISTS usuarios_cartas_nivel (
  usuario_id      uuid     NOT NULL REFERENCES usuarios(id),
  carta_id        text     NOT NULL REFERENCES cartas_catalogo(id) ON DELETE RESTRICT,
  nivel           smallint NOT NULL DEFAULT 1,
  xp_invertido    integer  NOT NULL DEFAULT 0,
  creado_en       timestamptz NOT NULL DEFAULT now(),
  actualizado_en  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (usuario_id, carta_id)
);

DO $m066n$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                  WHERE conname = 'chk_usuarios_cartas_nivel_rango'
                    AND conrelid = 'public.usuarios_cartas_nivel'::regclass) THEN
    ALTER TABLE usuarios_cartas_nivel
      ADD CONSTRAINT chk_usuarios_cartas_nivel_rango
      CHECK (nivel BETWEEN 1 AND 5);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                  WHERE conname = 'chk_usuarios_cartas_nivel_xp'
                    AND conrelid = 'public.usuarios_cartas_nivel'::regclass) THEN
    ALTER TABLE usuarios_cartas_nivel
      ADD CONSTRAINT chk_usuarios_cartas_nivel_xp
      CHECK (xp_invertido >= 0);
  END IF;
END
$m066n$;

CREATE INDEX IF NOT EXISTS idx_usuarios_cartas_nivel_usuario
  ON usuarios_cartas_nivel (usuario_id, nivel DESC);

-- (7) INDICES DE CATALOGO ----------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_cartas_catalogo_familia
  ON cartas_catalogo (familia, rareza, activo);

CREATE INDEX IF NOT EXISTS idx_cartas_catalogo_tirada
  ON cartas_catalogo (rareza)
  WHERE activo = true AND familia <> 'producto' AND familia <> 'consumible';

-- idx_cartas_catalogo_set (040:111-112) e idx_cartas_catalogo_emisor
-- (060:372-373) se conservan sin cambios.
