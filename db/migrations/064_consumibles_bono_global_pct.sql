-- ============================================================================
-- Migration 064: consumibles - BONO GLOBAL +% durante 24 h (cartas de bono)
--   y SET ANCESTRAL (2 filas nuevas + vinculo de las 3 filas de 058).
-- Fecha: 2026-11-10   (v2: revisada por @architect-review)
-- Referencias: ADR-120 (D1..D5, D9, D12), ADR-002 (ASCII-safe), ADR-003 (cero
--   borrado logico: MERGE por clave, ningun DELETE), ADR-006 (baseline = fila
--   real leida antes de reescribir), ADR-008 (idempotencia), ADR-118.
-- Requiere: 010 (consumibles), 017/018/027 (categoria, marca_id, stock),
--   031 (precio_xp numeric), 035 (era_exclusiva), 057 (columnas de efecto),
--   058 (premio_semanal + los 3 SKU ancestral),
--   062 (faccion NULL), db/seeds/001_marca_ancestral_vinculo.js (marca).
--
-- PROPOSITO
--   1. 6 columnas nuevas en consumibles (5 de bono/carta + premio_set).
--   2. 4 CHECKs guardados por pg_constraint.
--   3. UPDATE acotado a las 4 claves de la 057: precios nuevos,
--      bono_pct/bono_tope_xp, y bono_accion = NULL con bono_xp_fijo = 0
--      (SIN esto el bono plano y el bono % pagarian dos veces la misma
--      accion: riesgo R1 del ADR-120).
--   4. Un DO que exige la marca 'ANCESTRAL' (igualdad exacta) y las 3 filas
--      de 058, escribe otorga_carta en esas 3 y siembra las 2 filas nuevas.
--
-- PRECIOS: 160/260/360/450 (4 cartas de bono) = decision del operador.
--   ancestral_base = 400 XP. ancestral_premio_set = 0 (fila tecnica).
--   LOS 3 SKU DE VOLUMEN CONSERVAN EL PRECIO DE 058 (1166.67/3416.67/6333.33
--   y 14000/41000/76000): esta migracion JAMAS escribe su precio_xp ni su
--   precio_cop. Solo les anade otorga_carta. Prohibido cualquier upsert
--   que los incluya en un VALUES con precio.
--
-- QUE NO HACE
--   - No toca nombre, activo, categoria, era_exclusiva, faccion_requerida,
--     cargas, limite_diario, icono, premio_semanal, precio_cop de las 3 filas
--     de 058, ni el precio_xp de las 3 filas de 058.
--   - No crea indices (no hace falta: los accesos siguen siendo por clave,
--     que ya tiene UNIQUE desde 010).
--   - No siembra cartas (eso es la 065) ni escribe datos de usuarios.
--   - No borra ni dropea ninguna fila ni columna.
--
-- IDEMPOTENCIA
--   ADD COLUMN IF NOT EXISTS ............. no-op en la segunda corrida.
--   DO con guarda pg_constraint .......... los 4 CHECKs no se recrean.
--   UPDATE de las 4 cartas ............... reescribe los mismos valores
--                                          (no-op de dato, 4 filas).
--   UPDATE otorga_carta .................. IS DISTINCT FROM -> 0 filas la
--                                          segunda vez.
--   INSERT ON CONFLICT (clave) DO UPDATE . no-op funcional; NO reescribe
--                                          precio_xp/precio_xp_base/precio_cop
--                                          (respeta el precio que el admin
--                                          haya fijado despues).
--
-- ATOMICIDAD: el runner NO abre transaccion (driver HTTP de Neon, divide por
--   ';' y corta al primer error: scripts/apply_sql_file.js:155, :349-359,
--   :651, :755-763). Cada sentencia es atomica por si misma y lo que debe ir
--   junto va en el MISMO bloque DO. NO se escriben sentencias de apertura ni
--   de cierre de transaccion (punto 6 de la revision).
--
-- ORDEN: 064 ANTES de 065 (la 065 inserta las cartas que esta referencia por
--   otorga_carta; no hay FK, pero el 4/4 necesita ambas). La 057 (si se
--   re-ejecuta) RESTAURA bono_accion / bono_xp_fijo viejos: tras re-ejecutarla
--   hay que re-aplicar esta 064.
-- ============================================================================

-- 1. COLUMNAS -----------------------------------------------------------------
ALTER TABLE consumibles
  ADD COLUMN IF NOT EXISTS bono_pct       smallint      NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bono_tope_xp   numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS es_permanente  boolean       NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS otorga_carta   varchar(40)   NULL,
  ADD COLUMN IF NOT EXISTS desbloquea_set varchar(40)   NULL,
  ADD COLUMN IF NOT EXISTS premio_set     boolean       NOT NULL DEFAULT false;

-- 2. CHECKS -------------------------------------------------------------------
--    ADD CONSTRAINT no admite IF NOT EXISTS en PostgreSQL (medido en 055/057/
--    058): la idempotencia se resuelve con guarda sobre pg_constraint.
--    Las 32+ filas existentes heredan bono_pct=0 / bono_tope_xp=0 /
--    es_permanente=false por DEFAULT, asi que los 4 CHECKs validan en el acto
--    sin backfill previo.
DO $mig064ck$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                  WHERE conrelid = 'public.consumibles'::regclass
                    AND conname  = 'chk_consumibles_bono_pct') THEN
    ALTER TABLE public.consumibles ADD CONSTRAINT chk_consumibles_bono_pct
      CHECK (bono_pct BETWEEN 0 AND 100);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                  WHERE conrelid = 'public.consumibles'::regclass
                    AND conname  = 'chk_consumibles_bono_tope') THEN
    ALTER TABLE public.consumibles ADD CONSTRAINT chk_consumibles_bono_tope
      CHECK (bono_tope_xp >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                  WHERE conrelid = 'public.consumibles'::regclass
                    AND conname  = 'chk_consumibles_bono_coherente') THEN
    ALTER TABLE public.consumibles ADD CONSTRAINT chk_consumibles_bono_coherente
      CHECK ((bono_pct = 0 AND bono_tope_xp = 0)
          OR (bono_pct > 0 AND bono_tope_xp > 0));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                  WHERE conrelid = 'public.consumibles'::regclass
                    AND conname  = 'chk_consumibles_permanente_coherente') THEN
    ALTER TABLE public.consumibles ADD CONSTRAINT chk_consumibles_permanente_coherente
      CHECK (es_permanente = false OR desbloquea_set IS NOT NULL);
  END IF;
END
$mig064ck$;

-- 3. RECALIBRACION DE LAS 4 CARTAS DE BONO ------------------------------------
--    Solo estas 4 claves (WHERE de corte por clave). Descripciones ASCII, sin
--    tildes. No prometen bono por familia de accion (lo contrario seria mentir
--    tras el cambio). precio_xp y precio_xp_base con el MISMO valor: la vista
--    consumibles_precio deriva de precio_xp_base y la compra de precio_xp (H23).
UPDATE consumibles AS c SET
  bono_pct        = v.pct,
  bono_tope_xp    = v.tope,
  precio_xp       = v.precio,
  precio_xp_base  = v.precio,
  bono_accion     = NULL,
  bono_xp_fijo    = 0,
  nivel_requerido = 4,
  descripcion     = v.descr
FROM (VALUES
  ('consumible_catalejo_explorador', 160, 10, 250,
   'Todas las facciones. +10% de XP en TODAS las acciones durante 24 h, con tope de 250 XP de bono por ventana. No se acumula con otra carta: cuenta el bono mayor. Coste 160 XP.'),
  ('consumible_lupa_curador', 260, 15, 400,
   'Todas las facciones. +15% de XP en TODAS las acciones durante 24 h, con tope de 400 XP de bono por ventana. No se acumula con otra carta: cuenta el bono mayor. Coste 260 XP.'),
  ('consumible_lente_artista', 360, 20, 550,
   'Todas las facciones. +20% de XP en TODAS las acciones durante 24 h, con tope de 550 XP de bono por ventana. No se acumula con otra carta: cuenta el bono mayor. Coste 360 XP.'),
  ('consumible_pluma_creador', 450, 25, 700,
   'Todas las facciones. +25% de XP en TODAS las acciones durante 24 h, con tope de 700 XP de bono por ventana. No se acumula con otra carta: cuenta el bono mayor. Coste 450 XP.')
) AS v(clave, precio, pct, tope, descr)
WHERE c.clave = v.clave;

-- 4. SET ANCESTRAL: vinculo de las 3 filas de 058 + 2 filas nuevas ------------
--    Todo en UN bloque DO por dos razones:
--      (a) fallo EXPLICITO si la marca no existe (igualdad estricta, no ILIKE)
--          o si faltan las 3 filas de 058: la migracion queda 'fallida' en el
--          ledger del runner en vez de escribir un set a medias. Si hubiera dos
--          filas 'ANCESTRAL', SELECT INTO falla con 21000: tambien explicito.
--      (b) marca_id se resuelve UNA vez y se usa en las 2 filas nuevas.
--    Prohibido escribir precio_xp / precio_cop de las 3 filas de 058: su
--    precio es el de 058 y el operador lo conserva.
DO $mig064set$
DECLARE
  v_marca uuid;
  v_filas int;
BEGIN
  SELECT id INTO v_marca FROM public.marcas WHERE nombre = 'ANCESTRAL';
  IF v_marca IS NULL THEN
    RAISE EXCEPTION 'MIG064: no existe la marca con nombre exacto ANCESTRAL';
  END IF;

  SELECT count(*) INTO v_filas FROM public.consumibles
   WHERE clave IN ('ancestral_pocima_50ml',
                   'ancestral_media_375ml',
                   'ancestral_botella_750ml');
  IF v_filas <> 3 THEN
    RAISE EXCEPTION 'MIG064: se esperaban 3 SKU de volumen de la 058 y hay %', v_filas;
  END IF;

  -- 4a. Vinculo SKU -> carta del set (UNICO campo que se escribe en las 3)
  UPDATE public.consumibles c
     SET otorga_carta = v.carta
    FROM (VALUES
      ('ancestral_pocima_50ml',   'cta_ancestral_02'),
      ('ancestral_media_375ml',   'cta_ancestral_03'),
      ('ancestral_botella_750ml', 'cta_ancestral_04')
    ) AS v(clave, carta)
   WHERE c.clave = v.clave
     AND c.otorga_carta IS DISTINCT FROM v.carta;

  -- 4b. Las 2 filas nuevas (la base permanente y el premio tecnico)
  INSERT INTO public.consumibles
    (clave, nombre, descripcion, precio_xp, precio_xp_base, precio_cop, activo,
     categoria, era_exclusiva, marca_id, faccion_requerida, nivel_requerido,
     cargas, duracion_horas, bono_accion, bono_xp_fijo, limite_diario, icono,
     bono_pct, bono_tope_xp, es_permanente, otorga_carta, desbloquea_set,
     premio_set)
  VALUES
    ('ancestral_base', 'Esencia Ancestral (base)',
     'Compra unica y permanente. Abre el set Ancestral: sus cartas, sus misiones y su premio. No se consume nunca.',
     400, 400, 0, true, 'general', NULL, v_marca, NULL, NULL,
     0, 24, NULL, 0, 0, '&#127807;',
     0, 0, true, 'cta_ancestral_01', 'ancestral_esencia', false),
    ('ancestral_premio_set', 'Premio Set Ancestral 4/4',
     'Puntero del premio del set: se entrega una sola vez al completar las 4 cartas y se reclama en mostrador.',
     0, 0, 0, true, 'general', NULL, v_marca, NULL, NULL,
     0, 24, NULL, 0, 0, '&#127873;',
     0, 0, false, NULL, NULL, true)
  ON CONFLICT (clave) DO UPDATE SET
    nombre          = EXCLUDED.nombre,
    descripcion     = EXCLUDED.descripcion,
    activo          = EXCLUDED.activo,
    categoria       = EXCLUDED.categoria,
    marca_id        = COALESCE(EXCLUDED.marca_id, consumibles.marca_id),
    nivel_requerido = EXCLUDED.nivel_requerido,
    cargas          = EXCLUDED.cargas,
    duracion_horas  = EXCLUDED.duracion_horas,
    limite_diario   = EXCLUDED.limite_diario,
    icono           = EXCLUDED.icono,
    bono_pct        = EXCLUDED.bono_pct,
    bono_tope_xp    = EXCLUDED.bono_tope_xp,
    es_permanente   = EXCLUDED.es_permanente,
    otorga_carta    = EXCLUDED.otorga_carta,
    desbloquea_set  = EXCLUDED.desbloquea_set,
    premio_set      = EXCLUDED.premio_set;
    -- OJO: el DO UPDATE NO reescribe precio_xp / precio_xp_base / precio_cop.
    -- El precio se escribe SOLO en el INSERT (400 y 0); una re-ejecucion
    -- respeta el precio que el admin haya fijado despues. Mismo criterio que
    -- protege a las 3 filas de 058.
END
$mig064set$;

-- ============================================================================
-- VERIFICACION POST-APLICACION (solo lectura; NO se ejecuta aqui)
-- ============================================================================
-- (a) 6 columnas (esperado 6):
-- SELECT column_name, data_type, column_default FROM information_schema.columns
--   WHERE table_schema='public' AND table_name='consumibles'
--     AND column_name IN ('bono_pct','bono_tope_xp','es_permanente',
--                         'otorga_carta','desbloquea_set','premio_set');
-- (b) 4 CHECKs (esperado 4):
-- SELECT conname FROM pg_constraint
--   WHERE conrelid='public.consumibles'::regclass
--     AND conname IN ('chk_consumibles_bono_pct','chk_consumibles_bono_tope',
--                     'chk_consumibles_bono_coherente',
--                     'chk_consumibles_permanente_coherente');
-- (c) Las 4 cartas recalibradas (esperado 4 filas, bono_accion NULL):
-- SELECT clave, precio_xp, precio_xp_base, bono_pct, bono_tope_xp,
--        bono_accion, bono_xp_fijo
--   FROM consumibles
--  WHERE clave IN ('consumible_catalejo_explorador','consumible_lupa_curador',
--                  'consumible_lente_artista','consumible_pluma_creador')
--  ORDER BY bono_pct;
-- (d) PRECIOS DE 058 INTACTOS (esperado 3 filas, cada una con su precio):
-- SELECT clave, precio_xp, precio_cop FROM consumibles
--  WHERE clave IN ('ancestral_pocima_50ml','ancestral_media_375ml',
--                  'ancestral_botella_750ml') ORDER BY clave;
--   esperado: 1166.67/14000, 3416.67/41000, 6333.33/76000. Si alguno cambio,
--   la migracion se aplico con la version v1 y hay que restaurarlo a mano.
-- (e) 5 filas del set con marca (esperado 5, con_marca = true en las 5):
-- SELECT clave, precio_xp, precio_cop, es_permanente, otorga_carta,
--        desbloquea_set, premio_set, (marca_id IS NOT NULL) AS con_marca,
--        (marca_id = (SELECT id FROM marcas WHERE nombre='ANCESTRAL')) AS marca_ok
--   FROM consumibles
--  WHERE clave IN ('ancestral_base','ancestral_pocima_50ml',
--                  'ancestral_media_375ml','ancestral_botella_750ml',
--                  'ancestral_premio_set') ORDER BY clave;
-- (f) Coherencia del vinculo SKU -> carta (esperado 3 filas con carta):
-- SELECT k.clave, k.otorga_carta, (c.id IS NOT NULL) AS carta_existe
--   FROM consumibles k
--   LEFT JOIN cartas_catalogo c ON c.id = k.otorga_carta
--  WHERE k.clave IN ('ancestral_base','ancestral_pocima_50ml',
--                    'ancestral_media_375ml','ancestral_botella_750ml');
--   OJO: correcto solo DESPUES de aplicar la 065.
--
-- ROLLBACK (sentencia a sentencia, tambien idempotente)
--   (r1) Restaurar el contrato 057 de las 4 cartas (valores historicos
--        literales de la 057), en UNA sentencia por clave:
--     UPDATE consumibles SET bono_pct=0, bono_tope_xp=0,
--       precio_xp=20, precio_xp_base=20, bono_accion='guardado,visita',
--       bono_xp_fijo=15.00
--      WHERE clave='consumible_catalejo_explorador';
--     (idem lupa 10/10 'media_voto' 3.00, pluma 20/20 'resena' 30.00,
--      lente 20/20 'foto' 10.00)
--   (r2) Retirar del catalogo las 2 filas nuevas: UPDATE consumibles
--        SET activo=false WHERE clave IN ('ancestral_base',
--        'ancestral_premio_set');   (PROHIBIDO borrar filas: ADR-003)
--   (r3) Desvincular las cartas sin tocar precios: UPDATE consumibles
--        SET otorga_carta=NULL WHERE clave IN ('ancestral_pocima_50ml',
--        'ancestral_media_375ml','ancestral_botella_750ml');
--   (r4) Las columnas nuevas NO se dropean (el codigo viejo las ignora:
--        bono_pct=0 activa la rama historica).
--   (r5) Si por error se hubiera pisado el precio de 058, restaurarlo con el
--        literal de 058:382-395 (1166.67/3416.67/6333.33 y 14000/41000/76000)
--        y anotar el incidente; NUNCA borrar la fila.
-- ============================================================================
