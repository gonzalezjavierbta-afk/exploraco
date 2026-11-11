-- ============================================================================
-- Migration 065: cartas - SET DE COLECCION ANCESTRAL (4 cartas) y tercer
--   origen de canje para el premio del set.
-- Fecha: 2026-11-10   (v2: revisada por @architect-review)
-- Referencias: ADR-120 (D6, D7, D8, D12), ADR-002, ADR-003, ADR-006, ADR-008.
-- Requiere: 040 (cartas_catalogo, usuarios_cartas), 058 (canjes_tienda),
--   060 (emisor_tipo/marca_id/fusionable/es_canjeable_qr/stats_json),
--   061 (PK de 3 columnas de usuarios_cartas, no de cartas_catalogo),
--   064 (el SKU premio existe y lleva premio_set).
--
-- PROPOSITO
--   1. cartas_catalogo.set_coleccion (boolean, default false): el set tiene
--      progreso propio sin nivel_gate y sus cartas NO son intercambiables.
--   2. 4 filas del set 'ancestral_esencia' en cartas_catalogo (ON CONFLICT),
--      con rareza cerrada: base 'dorado', 750 'epico', 375 'raro', 50 'comun'
--      y nivel_gate NULL en las 4.
--   3. Tercer valor del CHECK de origen de canjes_tienda: 'premio_set'.
--
-- MARCA: igualdad ESTRICTA sobre el nombre exacto 'ANCESTRAL'
--   (db/seeds/001_marca_ancestral_vinculo.js:48). Cero ILIKE, cero
--   'ORDER BY ... LIMIT 1'. Si no hay fila, RAISE EXCEPTION: la migracion
--   queda 'fallida' y el set no se siembra a medias. Si hubiera dos filas con
--   ese nombre exacto, SELECT INTO falla con 21000: tambien explicito.
--
-- POR QUE nivel_gate = NULL ES LEGAL
--   El CHECK nivel_gate IN (10,14,20,25) vive en cartas_gates (040:170-172),
--   NO en cartas_catalogo (040:101-103). Verificado en el archivo real.
--
-- POR QUE fusionable = false
--   chk_cartas_catalogo_fusionable (060:348-357) lo EXIGE con emisor_tipo
--   'marca'. Ademas un set de coleccion no debe poder convertirse en shiny.
--
-- QUE NO HACE
--   - No borra ni dropea filas, columnas ni datos de usuarios.
--   - No toca usuarios_cartas, canjes_tienda ya existentes ni cartas_gates.
--   - No escribe precios: los precios viven en consumibles (064/058).
--   - No crea indices (el acceso ya usa idx_cartas_catalogo_set).
--
-- IDEMPOTENCIA
--   ADD COLUMN IF NOT EXISTS .............. no-op en la segunda corrida.
--   INSERT ON CONFLICT (id) DO UPDATE ..... reescribe los mismos valores.
--   DO del CHECK con guarda pg_constraint . la segunda vez no hace ALTER.
--
-- ATOMICIDAD: el runner NO abre transaccion (driver HTTP de Neon, divide por
--   ';' y corta al primer error: scripts/apply_sql_file.js:155, :349-359,
--   :651, :755-763). El DROP + ADD del CHECK van DENTRO del mismo bloque DO
--   porque partir el ALTER dejaria la tabla sin CHECK entre sentencias, y un
--   bloque DO es una sola sentencia (atomica). NO se escriben sentencias de
--   apertura ni de cierre de transaccion.
--   El DROP CONSTRAINT IF EXISTS es metadato, no dato: no viola ADR-003.
--
-- ORDEN: despues de 064 (necesita el SKU premio sembrado y su marca).
-- ============================================================================

-- 1. COLUMNA ------------------------------------------------------------------
ALTER TABLE cartas_catalogo
  ADD COLUMN IF NOT EXISTS set_coleccion boolean NOT NULL DEFAULT false;

-- 2. LAS 4 CARTAS DEL SET (+ la marca, resuelta UNA vez y con fallo explicito)
DO $mig065set$
DECLARE
  v_marca uuid;
  v_n int;
BEGIN
  SELECT id INTO v_marca FROM public.marcas WHERE nombre = 'ANCESTRAL';
  IF v_marca IS NULL THEN
    RAISE EXCEPTION 'MIG065: no existe la marca con nombre exacto ANCESTRAL';
  END IF;

  INSERT INTO public.cartas_catalogo
    (id, nombre, set_slug, rareza, nivel_gate, es_evento, imagen_url, activo,
     emisor_tipo, marca_id, descripcion, stats_json, es_canjeable_qr,
     fusionable, set_coleccion)
  VALUES
    ('cta_ancestral_01', 'Esencia Ancestral', 'ancestral_esencia', 'dorado',
     NULL, false, 'assets/cartas/marca_ancestral.png', true, 'marca', v_marca,
     'Carta base del set Ancestral. Se compra con XP y es permanente: abre el set, sus misiones y su premio.',
     '{"sku":"ancestral_base","volumen_ml":0,"set_slug":"ancestral_esencia","premio_set":"ancestral_premio_set"}'::jsonb, false, false, true),
    ('cta_ancestral_02', 'Pocima Ancestral 50 ml', 'ancestral_esencia', 'comun',
     NULL, false, 'assets/cartas/marca_ancestral.png', true, 'marca', v_marca,
     'Primer volumen del set Ancestral. Se obtiene al canjear la pocima de 50 ml.',
     '{"sku":"ancestral_pocima_50ml","volumen_ml":50,"set_slug":"ancestral_esencia","premio_set":"ancestral_premio_set"}'::jsonb, false, false, true),
    ('cta_ancestral_03', 'Media Ancestral 375 ml', 'ancestral_esencia', 'raro',
     NULL, false, 'assets/cartas/marca_ancestral.png', true, 'marca', v_marca,
     'Segundo volumen del set Ancestral. Se obtiene al canjear la media de 375 ml.',
     '{"sku":"ancestral_media_375ml","volumen_ml":375,"set_slug":"ancestral_esencia","premio_set":"ancestral_premio_set"}'::jsonb, false, false, true),
    ('cta_ancestral_04', 'Botella Ancestral 750 ml', 'ancestral_esencia', 'epico',
     NULL, false, 'assets/cartas/marca_ancestral.png', true, 'marca', v_marca,
     'Tercer volumen del set Ancestral. Se obtiene al canjear la botella de 750 ml.',
     '{"sku":"ancestral_botella_750ml","volumen_ml":750,"set_slug":"ancestral_esencia","premio_set":"ancestral_premio_set"}'::jsonb, false, false, true)
  ON CONFLICT (id) DO UPDATE SET
    nombre          = EXCLUDED.nombre,
    set_slug        = EXCLUDED.set_slug,
    rareza          = EXCLUDED.rareza,
    nivel_gate      = NULL,
    es_evento       = false,
    imagen_url      = EXCLUDED.imagen_url,
    activo          = true,
    emisor_tipo     = 'marca',
    marca_id        = COALESCE(EXCLUDED.marca_id, cartas_catalogo.marca_id),
    descripcion     = EXCLUDED.descripcion,
    stats_json      = EXCLUDED.stats_json,
    es_canjeable_qr = false,
    fusionable      = false,
    set_coleccion   = true;

  SELECT count(*) INTO v_n FROM public.cartas_catalogo
   WHERE set_slug = 'ancestral_esencia';
  IF v_n <> 4 THEN
    RAISE EXCEPTION 'MIG065: se esperaban 4 cartas del set y hay %', v_n;
  END IF;
END
$mig065set$;

-- 3. ORIGEN 'premio_set' EN canjes_tienda -------------------------------------
--    SUPERCONJUNTO obligatorio: el valor nuevo se ANADE a los dos de 058
--    ('mostrador', 'premio_semanal'). Nunca se estrecha el dominio: las filas
--    historicas y el camino del mostrador tienen que seguir pasando el CHECK.
--    DROP + ADD en el mismo DO = una sola sentencia atomica: no existe una
--    ventana sin CHECK visible para otra sesion.
DO $mig065c$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'public.canjes_tienda'::regclass
       AND conname  = 'chk_canjes_tienda_origen'
       AND pg_get_constraintdef(oid) LIKE '%premio_set%'
  ) THEN
    ALTER TABLE public.canjes_tienda
      DROP CONSTRAINT IF EXISTS chk_canjes_tienda_origen;
    ALTER TABLE public.canjes_tienda
      ADD CONSTRAINT chk_canjes_tienda_origen
      CHECK (origen IN ('mostrador', 'premio_semanal', 'premio_set'));

    -- Tripwire del superconjunto: si el CHECK resultante no admite los dos
    -- valores de 058, se aborta el DO entero (no queda un dominio estrechado).
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
       WHERE conrelid = 'public.canjes_tienda'::regclass
         AND conname  = 'chk_canjes_tienda_origen'
         AND pg_get_constraintdef(oid) LIKE '%mostrador%'
         AND pg_get_constraintdef(oid) LIKE '%premio_semanal%'
         AND pg_get_constraintdef(oid) LIKE '%premio_set%') THEN
      RAISE EXCEPTION 'MIG065: el CHECK de origen no es superconjunto de 058';
    END IF;
  END IF;
END
$mig065c$;

-- ============================================================================
-- VERIFICACION POST-APLICACION (solo lectura; NO se ejecuta aqui)
-- ============================================================================
-- (a) columna (esperado 1 fila, default false):
-- SELECT column_name, column_default FROM information_schema.columns
--   WHERE table_schema='public' AND table_name='cartas_catalogo'
--     AND column_name='set_coleccion';
-- (b) 4 cartas, rarezas y gate (esperado 4 filas: dorado/epico/raro/comun,
--     nivel_gate NULL en las 4, set_coleccion true, fusionable false):
-- SELECT id, rareza, nivel_gate, set_coleccion, fusionable, emisor_tipo,
--        marca_id IS NOT NULL AS con_marca
--   FROM cartas_catalogo WHERE set_slug='ancestral_esencia' ORDER BY id;
-- (c) vinculo carta <-> SKU (esperado 4, cero huerfanas):
-- SELECT c.id, c.stats_json->>'sku' AS sku, (k.clave IS NOT NULL) AS sku_existe
--   FROM cartas_catalogo c
--   LEFT JOIN consumibles k ON k.clave = c.stats_json->>'sku'
--  WHERE c.set_slug='ancestral_esencia' ORDER BY c.id;
-- (d) CHECK de origen (esperado 1 fila con premio_set):
-- SELECT pg_get_constraintdef(oid) FROM pg_constraint
--   WHERE conname='chk_canjes_tienda_origen';
-- (e) El CHECK no estrecho el dominio (esperado 0 filas fuera de los 3):
-- SELECT origen, count(*) FROM canjes_tienda GROUP BY origen;
--   esperado: solo 'mostrador', 'premio_semanal' y, si ya hay premios,
--   'premio_set'.
--
-- ROLLBACK (sentencia a sentencia, tambien idempotente)
--   (r1) Origen: re-crear el CHECK de 058 (IN ('mostrador','premio_semanal'))
--        DESPUES de cerrar/anular las filas 'premio_set' (si no, el ADD
--        CONSTRAINT falla con 23514).
--   (r2) Cartas: UPDATE cartas_catalogo SET activo=false
--        WHERE set_slug='ancestral_esencia'; (PROHIBIDO borrar filas: ADR-003)
--   (r3) set_coleccion puede quedar: el codigo viejo la ignora.
-- ============================================================================
