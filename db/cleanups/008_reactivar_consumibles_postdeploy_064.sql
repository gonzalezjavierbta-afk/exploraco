-- ============================================================================
-- 008_reactivar_consumibles_postdeploy_064.sql
-- Fecha: 2026-11-11
-- Referencias: 007_desactivar_consumibles_predeploy_064.sql (bloque
--   REACTIVACION, lineas 59-78), ADR-120, ADR-003 (cero borrado logico),
--   ADR-006 (baseline = fila real), ADR-008 (idempotencia).
--
-- QUE HACE
--   Ejecuta el bloque REACTIVACION ya escrito en la cabecera de 007, con UNA
--   diferencia deliberada y aprobada por el operador: reactiva 5 de las 6
--   claves, NO las 6. Deja 'ancestral_premio_set' en activo=false.
--
--   Claves que reactiva (activo=true):
--     - consumible_catalejo_explorador  (160 XP, bono_pct 10, tope 250)
--     - consumible_lupa_curador         (260 XP, bono_pct 15, tope 400)
--     - consumible_lente_artista        (360 XP, bono_pct 20, tope 550)
--     - consumible_pluma_creador        (450 XP, bono_pct 25, tope 700)
--     - ancestral_base                  (400 XP, es_permanente=true,
--                                        desbloquea_set='ancestral_esencia',
--                                        otorga_carta='cta_ancestral_01')
--
-- POR QUE SOLO 5 Y NO 6
--   La propia NOTA de 007 (lineas 75-78) autoriza dejar 'ancestral_premio_set'
--   en activo=false de forma permanente si el backend excluye las filas
--   tecnicas de premio (premio_set = true) del catalogo de compra. El
--   operador lo pidio textualmente: NO reactivar 'ancestral_premio_set'
--   (fila tecnica de premio, 0 XP). Se obedece esa decision; 007 no se edita,
--   queda como historia.
--
-- POR QUE EXISTE
--   007 desactivo las filas porque el backend desplegado no leia bono_pct,
--   bono_tope_xp, desbloquea_set, otorga_carta ni premio_set: cobraban y no
--   daban nada. El deploy nuevo YA esta en produccion y verificado
--   (GET /api/interacciones?tipo=consumibles devuelve los campos nuevos), asi
--   que la contencion se levanta.
--
-- QUE NO HACE
--   - Cero DELETE / TRUNCATE / DROP. Solo escribe la columna booleana activo.
--   - No toca precio_xp, precio_cop, categoria, bono_pct, bono_tope_xp,
--     nivel_requerido, es_permanente, desbloquea_set, otorga_carta ni
--     premio_set. Los valores quedan como estan.
--   - NO toca 'ancestral_premio_set' (sigue activo=false).
--   - NO toca las 3 botellas de volumen (ancestral_pocima_50ml,
--     ancestral_media_375ml, ancestral_botella_750ml): siguen activo=true y
--     conservan 1166.67/3416.67/6333.33 XP y 14000/41000/76000 COP.
--   - No toca cartas_catalogo (assets/cartas/marca_ancestral.png se confirma,
--     no se modifica).
--
-- BASELINE MEDIDO ANTES (2026-11-11, scripts/neon_select.js)
--   total_filas = 44 | activos = 38 | inactivos = 6
--   inactivos = ancestral_base, ancestral_premio_set,
--               consumible_catalejo_explorador, consumible_lente_artista,
--               consumible_lupa_curador, consumible_pluma_creador
--   Las 3 botellas: activo=true con precio_xp 1166.67 / 3416.67 / 6333.33.
--
-- RESULTADO ESPERADO
--   activos = 43 | inactivos = 1 (ancestral_premio_set) | total = 44.
--   5 filas afectadas por el UPDATE.
--
-- IDEMPOTENCIA
--   El WHERE lleva AND activo = false: la segunda corrida afecta 0 filas.
--
-- CARACTER
--   Reversible por dato, sin DDL. Fuera de db/migrations/ a proposito, igual
--   que 007: no es historia de esquema, es el levantamiento de una contencion.
--   No escribe ledger.
--
-- ASCII-safe (ADR-002).
-- ============================================================================

-- 1. REACTIVACION (5 filas esperadas sobre el baseline de 6 inactivos) -------
UPDATE consumibles
   SET activo = true
 WHERE clave IN (
   'consumible_catalejo_explorador',
   'consumible_lupa_curador',
   'consumible_lente_artista',
   'consumible_pluma_creador',
   'ancestral_base'
 )
   AND activo = false;

-- ============================================================================
-- VERIFICACION POST-APLICACION (solo lectura; NO se ejecuta aqui)
-- ----------------------------------------------------------------------------
-- (a) Las 5 claves quedan activas, con bono_pct / bono_tope_xp /
--     desbloquea_set / otorga_carta visibles:
-- SELECT clave, activo, precio_xp, bono_pct, bono_tope_xp, nivel_requerido,
--        es_permanente, desbloquea_set, otorga_carta FROM consumibles
--  WHERE clave IN ('consumible_catalejo_explorador','consumible_lupa_curador',
--                  'consumible_lente_artista','consumible_pluma_creador',
--                  'ancestral_base') ORDER BY clave;
-- (b) 'ancestral_premio_set' sigue inactiva:
-- SELECT clave, activo, precio_xp, premio_set FROM consumibles
--  WHERE clave = 'ancestral_premio_set';
-- (c) Las 3 botellas siguen activas y con precio intacto:
-- SELECT clave, activo, precio_xp, precio_cop FROM consumibles
--  WHERE clave IN ('ancestral_pocima_50ml','ancestral_media_375ml',
--                  'ancestral_botella_750ml') ORDER BY clave;
-- (d) Conteo global: activos = 43, inactivos = 1, total = 44.
-- SELECT COUNT(*) FILTER (WHERE activo) AS activos,
--        COUNT(*) FILTER (WHERE NOT activo) AS inactivos,
--        COUNT(*) AS total FROM consumibles;
-- ============================================================================
