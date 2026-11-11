-- ============================================================================
-- 007_desactivar_consumibles_predeploy_064.sql
-- Fecha: 2026-11-10
-- Referencias: ADR-120 (D1..D5, D9, D12), ADR-003 (cero borrado logico),
--   ADR-006 (baseline = fila real), ADR-008 (idempotencia).
--
-- QUE HACE
--   Desactiva temporalmente 6 filas de public.consumibles cuyo DATO ya esta
--   adelantado al codigo desplegado:
--     - 4 cartas de faccion de la 057 recalibradas por 064
--       (160/260/360/450 XP, bono_accion NULL, bono_pct nuevo).
--     - ancestral_base (400 XP, desbloquea_set = 'ancestral_esencia').
--     - ancestral_premio_set (0 XP, premio_set = true): fila TECNICA de
--       premio, no un producto. El flujo desplegado la lista y la cobra a
--       0 XP porque solo filtra activo=true y lee precio_xp.
--
-- POR QUE EXISTE
--   El esquema va por delante del codigo en produccion: el backend desplegado
--   NO lee bono_pct, bono_tope_xp, desbloquea_set, otorga_carta ni premio_set.
--   Resultado hoy: esas filas COBRAN y NO DAN NADA. Se desactivan hasta el
--   deploy; se reactivan con el bloque REACTIVACION de abajo.
--
-- QUE NO HACE
--   - Cero DELETE / TRUNCATE / DROP. Solo escribe la columna booleana activo.
--   - No toca precio_xp, precio_cop, categoria, bono_*, desbloquea_set,
--     otorga_carta ni premio_set. Los precios quedan como estan.
--   - NO toca las 3 botellas de volumen (ancestral_pocima_50ml,
--     ancestral_media_375ml, ancestral_botella_750ml): siguen vendibles como
--     productos fisicos y conservan 1166.67/3416.67/6333.33 XP.
--
-- BASELINE MEDIDO ANTES (2026-11-11, scripts/neon_select.js)
--   total_filas = 44 | activos = 44 | inactivos = 0
--   Las 6 claves estaban activo=true. Las 3 botellas, activo=true con
--   precio_xp 1166.67 / 3416.67 / 6333.33.
--
-- IDEMPOTENCIA
--   El WHERE lleva AND activo=true: la segunda corrida afecta 0 filas.
--
-- CARACTER
--   Reversible por dato, sin DDL. Fuera de db/migrations/ a proposito: no es
--   historia de esquema, es una contencion de una vez. No escribe ledger.
--
-- ASCII-safe (ADR-002).
-- ============================================================================

-- 1. DESACTIVACION (6 filas esperadas sobre el baseline de 44 activos) --------
UPDATE consumibles
   SET activo = false
 WHERE clave IN (
   'consumible_catalejo_explorador',
   'consumible_lupa_curador',
   'consumible_lente_artista',
   'consumible_pluma_creador',
   'ancestral_base',
   'ancestral_premio_set'
 )
   AND activo = true;

-- ============================================================================
-- REACTIVACION (NO se ejecuta aqui: correr DESPUES del deploy del backend que
-- lee bono_pct / bono_tope_xp / desbloquea_set / otorga_carta / premio_set)
-- ----------------------------------------------------------------------------
-- UPDATE consumibles
--    SET activo = true
--  WHERE clave IN (
--    'consumible_catalejo_explorador',
--    'consumible_lupa_curador',
--    'consumible_lente_artista',
--    'consumible_pluma_creador',
--    'ancestral_base',
--    'ancestral_premio_set'
--  )
--    AND activo = false;
--
-- NOTA sobre 'ancestral_premio_set': si el backend nuevo ya excluye las filas
-- tecnicas de premio del catalogo de compra (premio_set = true), esta clave
-- puede dejarse en activo=false de forma permanente sin regresion. Decidir
-- con el codigo desplegado delante, no por memoria.
-- ============================================================================

-- ============================================================================
-- VERIFICACION POST-APLICACION (solo lectura; NO se ejecuta aqui)
-- ----------------------------------------------------------------------------
-- (a) Las 6 filas quedan inactivas:
-- SELECT clave, activo, precio_xp, categoria FROM consumibles
--  WHERE clave IN ('consumible_catalejo_explorador','consumible_lupa_curador',
--                  'consumible_lente_artista','consumible_pluma_creador',
--                  'ancestral_base','ancestral_premio_set') ORDER BY clave;
-- (b) Las 3 botellas siguen activas y con precio intacto:
-- SELECT clave, activo, precio_xp, precio_cop FROM consumibles
--  WHERE clave IN ('ancestral_pocima_50ml','ancestral_media_375ml',
--                  'ancestral_botella_750ml') ORDER BY clave;
-- (c) Conteo global: activos = 38, inactivos = 6, total = 44.
-- SELECT COUNT(*) FILTER (WHERE activo) AS activos,
--        COUNT(*) FILTER (WHERE NOT activo) AS inactivos,
--        COUNT(*) AS total FROM consumibles;
-- ============================================================================
