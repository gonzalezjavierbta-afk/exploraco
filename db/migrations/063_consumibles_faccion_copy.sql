-- ============================================================================
-- Migration 063: consumibles de faccion - COPY (retirar "Faccion X" de las 4
--   descripciones de fase 1). Solo texto; ningun gate, ningun precio.
-- Fecha: 2026-10-28
-- Referencias: ADR-110 (revision 1, decision D4), ADR-002 (ASCII-safe: cero
--   bytes > 127, cero backticks, sin tildes), ADR-003 (cero borrado logico),
--   ADR-006 (baseline = texto REAL leido en Neon antes de reescribir),
--   ADR-008 (idempotencia / SQL versionado).
-- Requiere: 057 (las 4 filas), 062 (faccion_requerida = NULL en las 4).
--
-- QUE HACE (una sola sentencia)
--   Sustituye la descripcion de las 4 filas de fase 1 por una que declara que
--   el articulo lo puede usar CUALQUIER FACCION y CONSERVA el efecto real
--   medido (acciones, XP extra, cargas, ventana y economia Neto), leido de la
--   base antes de escribir, sin inventar nada:
--     consumible_catalejo_explorador  +15 XP x2 guardados/visitas GPS, 24 h
--     consumible_lupa_curador         +3  XP x5 votos a medios, 24 h
--     consumible_lente_artista        +10 XP x3 fotos/videos, 24 h
--     consumible_pluma_creador        +30 XP x1 resena 400+, 24 h
--   No toca nombre, precio_xp, precio_xp_base, activo, categoria,
--   era_exclusiva, faccion_requerida, nivel_requerido, cargas,
--   duracion_horas, bono_accion, bono_xp_fijo, limite_diario ni icono.
--
-- POR QUE (ADR-110 D4)
--   La 062 retiro el gate de faccion EN DATO: los 4 consumibles ya se compran
--   y se usan por cualquier faccion. El texto seguia afirmando lo contrario
--   ("Faccion Exploradores. ..."), lo que produce dos errores de producto:
--   (1) el jugador de otra faccion no los compra porque cree que no puede, y
--   (2) quien los ve comprados en otro perfil cree que hay un bug de gate.
--   Esta migracion alinea el copy con el dato. Cero cambios de codigo.
--
-- POR QUE ES SEGURO
--   S-1. Solo escribe la columna descripcion (text, sin constraint propio): no
--        puede violar el CHECK de faccion ni ningun otro.
--   S-2. Acotado por clave a las 4 filas de fase 1: ningun otro consumible se
--        toca.
--   S-3. El texto nuevo conserva literalmente las cifras del efecto real
--        medido; solo cambia el prefijo de faccion. No hay reescritura de
--        economia ni promesa nueva.
--   S-4. Reversible al texto exacto original (ver ROLLBACK), tambien con
--        UPDATE.
--
-- IDEMPOTENCIA (ADR-008)
--   El WHERE compara contra el texto nuevo con "descripcion <> CASE ...". En
--   la segunda corrida las 4 filas ya son iguales al nuevo, el WHERE no las
--   selecciona y se escribe 0 filas (no-op funcional).
--
-- ATOMICIDAD Y TRANSACCION (leer antes de aplicar)
--   El runner (scripts/apply_sql_file.js) ejecuta sentencia a sentencia SIN
--   transaccion envolvente: por eso este fichero es UNA SOLA sentencia, que es
--   atomica por si misma. NO se escriben BEGIN ni COMMIT ejecutables aqui.
--   ENSAYO (editor SQL de Neon): BEGIN; <UPDATE>; <verificacion>; ROLLBACK;
--   CORRIDA REAL: igual, cambiando ROLLBACK por COMMIT. COMMIT SOLO en la real.
--
-- ORDEN DE DESPLIEGUE
--   Despues de la 062. Ojo: la 057 re-afirma descripcion = EXCLUDED.descripcion
--   en su ON CONFLICT DO UPDATE, es decir, RESTAURA EL COPY VIEJO. Si se
--   re-ejecuta la 057, hay que re-aplicar la 063 (idempotente, coste cero).
-- ============================================================================

-- ============================================================================
-- 0. PREFLIGHT (SOLO LECTURA; NO se ejecuta solo).
-- ============================================================================
-- (0.a) Texto actual de las 4 filas. ESPERADO: 4 filas cuyo texto empieza por
--       "Faccion <Algo>. " (el copy obsoleto que esta migracion retira).
-- SELECT clave, descripcion
--   FROM consumibles
--   WHERE clave IN ('consumible_catalejo_explorador','consumible_lupa_curador',
--                   'consumible_lente_artista','consumible_pluma_creador')
--   ORDER BY clave;

-- ============================================================================
-- 1. COPY NUEVO EN LAS 4 FILAS DE FASE 1 (D4 del ADR-110)
-- ============================================================================
-- "Cualquier faccion." es el prefijo nuevo. El resto de cada frase es el texto
-- real medido en Neon el 2026-10-28, sin cambios de cifras.

UPDATE consumibles
   SET descripcion = CASE clave
     WHEN 'consumible_catalejo_explorador' THEN
       'Cualquier faccion. +15 XP extra en 2 guardados o visitas GPS dentro de 24 h. Devuelve 30 XP por 20. Neto +10.'
     WHEN 'consumible_lupa_curador' THEN
       'Cualquier faccion. +3 XP extra en 5 votos a medios dentro de 24 h. Devuelve 15 XP por 10. Neto +5.'
     WHEN 'consumible_lente_artista' THEN
       'Cualquier faccion. +10 XP extra en 3 fotos o videos subidos dentro de 24 h. Devuelve 30 XP por 20. Neto +10.'
     WHEN 'consumible_pluma_creador' THEN
       'Cualquier faccion. +30 XP extra en tu siguiente resena de 400 caracteres o mas dentro de 24 h. Devuelve 30 XP por 20. Neto +10.'
   END
 WHERE clave IN ('consumible_catalejo_explorador','consumible_lupa_curador',
                 'consumible_lente_artista','consumible_pluma_creador')
   AND descripcion <> CASE clave
     WHEN 'consumible_catalejo_explorador' THEN
       'Cualquier faccion. +15 XP extra en 2 guardados o visitas GPS dentro de 24 h. Devuelve 30 XP por 20. Neto +10.'
     WHEN 'consumible_lupa_curador' THEN
       'Cualquier faccion. +3 XP extra en 5 votos a medios dentro de 24 h. Devuelve 15 XP por 10. Neto +5.'
     WHEN 'consumible_lente_artista' THEN
       'Cualquier faccion. +10 XP extra en 3 fotos o videos subidos dentro de 24 h. Devuelve 30 XP por 20. Neto +10.'
     WHEN 'consumible_pluma_creador' THEN
       'Cualquier faccion. +30 XP extra en tu siguiente resena de 400 caracteres o mas dentro de 24 h. Devuelve 30 XP por 20. Neto +10.'
   END;

-- ============================================================================
-- 2. VERIFICACION POST-APLICACION (solo lectura; NO se ejecuta solo).
-- ============================================================================
-- (a) Las 4 filas con el copy nuevo. ESPERADO: 4 filas, todas empiezan por
--     "Cualquier faccion.".
-- SELECT clave, descripcion
--   FROM consumibles
--   WHERE clave IN ('consumible_catalejo_explorador','consumible_lupa_curador',
--                   'consumible_lente_artista','consumible_pluma_creador')
--     AND descripcion LIKE 'Cualquier faccion.%'
--   ORDER BY clave;
--
-- (b) Copy obsoleto residual. ESPERADO: 0 (ningun texto que empiece por
--     "Faccion " ni que contenga "Faccion ").
-- SELECT COUNT(*) AS copy_obsoleto
--   FROM consumibles
--   WHERE clave IN ('consumible_catalejo_explorador','consumible_lupa_curador',
--                   'consumible_lente_artista','consumible_pluma_creador')
--     AND descripcion LIKE '%Faccion %';
--
-- (c) NINGUN OTRO CAMPO CAMBIO. ESPERADO: 0 FILAS (las 4 siguen liberadas por
--     la 062, con nivel 4, limite_diario 1, era NULL, activo true y precio
--     base igual al precio).
-- SELECT clave, faccion_requerida, nivel_requerido, limite_diario,
--        era_exclusiva, activo, precio_xp, precio_xp_base, categoria
--   FROM consumibles
--   WHERE clave IN ('consumible_catalejo_explorador','consumible_lupa_curador',
--                   'consumible_lente_artista','consumible_pluma_creador')
--     AND (faccion_requerida IS NOT NULL
--          OR nivel_requerido IS DISTINCT FROM 4
--          OR limite_diario IS DISTINCT FROM 1
--          OR era_exclusiva IS NOT NULL
--          OR activo IS DISTINCT FROM true
--          OR precio_xp_base IS DISTINCT FROM precio_xp
--          OR categoria IS DISTINCT FROM 'faccion');
--
-- (d) Idempotencia: re-ejecutar la seccion 1 debe devolver "UPDATE 0".

-- ============================================================================
-- ROLLBACK (reversion EXACTA del texto original; NO se ejecuta, esta
--   comentado entero). Restaura literalmente las 4 descripciones medidas antes
--   de la 063. Solo UPDATE: no hay DELETE ni DROP (ADR-003). Idempotente: si ya
--   esta revertido, el WHERE no selecciona nada.
--
--   UPDATE consumibles
--      SET descripcion = CASE clave
--        WHEN 'consumible_catalejo_explorador' THEN
--          'Faccion Exploradores. +15 XP extra en 2 guardados o visitas GPS dentro de 24 h. Devuelve 30 XP por 20. Neto +10.'
--        WHEN 'consumible_lupa_curador' THEN
--          'Faccion Curadores. +3 XP extra en 5 votos a medios dentro de 24 h. Devuelve 15 XP por 10. Neto +5.'
--        WHEN 'consumible_lente_artista' THEN
--          'Faccion Artistas. +10 XP extra en 3 fotos o videos subidos dentro de 24 h. Devuelve 30 XP por 20. Neto +10.'
--        WHEN 'consumible_pluma_creador' THEN
--          'Faccion Creadores. +30 XP extra en tu siguiente resena de 400 caracteres o mas dentro de 24 h. Devuelve 30 XP por 20. Neto +10.'
--      END
--    WHERE clave IN ('consumible_catalejo_explorador','consumible_lupa_curador',
--                    'consumible_lente_artista','consumible_pluma_creador')
--      AND descripcion NOT LIKE 'Faccion %';
--
--   Nota: revertir SOLO el copy dejaria el producto incoherente con el dato de
--   la 062 (gate liberado + texto que afirma faccion). Si se revierte la 063,
--   revertir tambien la 062 con su propio bloque ROLLBACK.
-- ============================================================================
