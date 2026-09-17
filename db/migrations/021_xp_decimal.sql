-- ============================================================================
-- Migration 021: XP decimal con numeric(12,2) y soporte de rankings
-- Fecha: 2026-09-17
-- Spec: docs/superpowers/specs/2026-09-17-xp-decimal-rankings-comunidad-design.md
-- ADR: ADR-035 (DECISIONS.md)
-- Requiere: migraciones 009, 010 y 016 aplicadas.
--
-- QUE HACE
--   Convierte 9 columnas de XP de entero a numeric(12,2) para permitir XP con
--   decimales (redondeo half-up a 2) en rankings de Casa y de Pandilla, sin
--   perder datos historicos.
--
-- EXACTITUD DE LA CONVERSION
--   int4 max = 2147483647; numeric(12,2) max = 9999999999.99. Todo entero
--   actual cabe y se conserva EXACTO: 125 -> 125.00. No hay redondeo ni
--   saturacion; el valor no cambia, solo su representacion.
--
-- IDEMPOTENCIA (ADR-008)
--   El bloque DO solo actua si la columna EXISTE en el schema public y su
--   data_type actual esta en ('integer','smallint','bigint'). Tras convertir,
--   una segunda corrida no encuentra columnas enteras y el bloque es no-op
--   seguro (no re-convierte, no re-escribe, no pierde datos).
--
-- COBERTURA DEFENSIVA (patron BUG-021)
--   interacciones.xp_ganado NO esta versionada en db/migrations y podria no
--   existir en una base concreta; por eso la conversion tambien es condicional
--   y su ausencia NO rompe la migracion (el precheck la reporta como opcional).
--
-- NULL / NOT NULL
--   La conversion con USING NO altera la nulabilidad. Los SET DEFAULT solo
--   re-fijan el valor por defecto (por si el ALTER lo perdiera); no agregan
--   ni quitan NOT NULL. compra_consumibles.xp_pagado e
--   interacciones.xp_ganado quedan SIN default a proposito (su valor se
--   escribe siempre explicito desde el backend).
--
-- ROLLBACK (emergencia, LOSSY)
--   ALTER COLUMN <col> TYPE integer USING ROUND(<col>)::integer.
--   Es EXACTO mientras no haya decimales acumulados (125.00 -> 125). Una vez
--   el backend nuevo escriba decimales, es LOSSY (125.47 -> 125): se pierden
--   las centesimas. Si se preve rollback, hacer respaldo previo, p.ej.
--   CREATE TABLE xp_backup_021 AS SELECT id, xp_total, xp_ref_total FROM usuarios;
--   El script de bajada se documenta como 021_xp_decimal_down.sql y NO es
--   parte del flujo normal de despliegue.
--
-- ORDEN DE DESPLIEGUE
--   Aplicar esta migracion COMPLETA en el editor SQL de Neon ANTES del deploy
--   del backend nuevo (api/usuarios.js, api/interacciones.js, api/admin.js,
--   api/pagina-destino.js, usuario-session.js). El backend viejo sigue
--   funcionando contra numeric(12,2) porque asigna enteros al tipo numerico;
--   en cambio, desplegar el backend nuevo SIN esta migracion hace que
--   ROUND(...,2) y los decimales choquen con columnas enteras.
--
-- ASCII-safe (ADR-002): cero bytes > 127, cero backticks, sin emojis (BUG-026).
-- Indices: NO se crean en esta migracion (queda como backlog).
-- ============================================================================

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT * FROM (VALUES
      ('usuarios',           'xp_total',          '0'),
      ('usuarios',           'xp_ref_total',      '0'),
      ('interacciones',      'xp_ganado',         NULL),
      ('album_votos',        'xp_ganado',         '5'),
      ('album_fotos',        'xp_otorgado_autor', '0'),
      ('compra_consumibles', 'xp_pagado',         NULL),
      ('pandilla_retos',     'xp_bono',           '0'),
      ('consumibles',        'precio_xp',         '0'),
      ('pandillas',          'fama_total',        '0')
    ) AS t(tabla, columna, defecto)
  LOOP
    -- Guarda dura: solo convierte si la columna EXISTE en public y hoy es
    -- entera. La tercera columna (defecto) define el DEFAULT a re-fijar;
    -- NULL significa "sin default, no tocar".
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns c
      WHERE c.table_schema = 'public'
        AND c.table_name = r.tabla
        AND c.column_name = r.columna
        AND c.data_type IN ('integer', 'smallint', 'bigint')
    ) THEN
      EXECUTE format(
        'ALTER TABLE %I ALTER COLUMN %I TYPE numeric(12,2) USING %I::numeric(12,2)',
        r.tabla, r.columna, r.columna
      );

      -- Solo SET DEFAULT: no toca NULL / NOT NULL. defecto es un literal
      -- fijo de esta lista (0 o 5), sin intervencion externa.
      IF r.defecto IS NOT NULL THEN
        EXECUTE format(
          'ALTER TABLE %I ALTER COLUMN %I SET DEFAULT %s',
          r.tabla, r.columna, r.defecto
        );
      END IF;

      RAISE NOTICE 'migracion 021: %.% -> numeric(12,2), default %',
        r.tabla, r.columna, COALESCE(r.defecto, '(sin cambio)');
    END IF;
  END LOOP;
END $$;

-- ============================================================================
-- VERIFICACION POST-APLICACION (solo lectura; NO se ejecuta dentro de la
-- migracion). Copiar y correr en el editor SQL de Neon.
-- Las 9 filas deben decir data_type='numeric', numeric_precision=12,
-- numeric_scale=2. interacciones.xp_ganado puede faltar (no versionada).
-- ============================================================================
-- SELECT table_name, column_name, data_type, numeric_precision, numeric_scale
-- FROM information_schema.columns
-- WHERE table_schema = 'public'
--   AND (table_name, column_name) IN (
--     ('usuarios','xp_total'), ('usuarios','xp_ref_total'),
--     ('interacciones','xp_ganado'), ('album_votos','xp_ganado'),
--     ('album_fotos','xp_otorgado_autor'), ('compra_consumibles','xp_pagado'),
--     ('pandilla_retos','xp_bono'), ('consumibles','precio_xp'),
--     ('pandillas','fama_total')
--   )
-- ORDER BY table_name, column_name;
