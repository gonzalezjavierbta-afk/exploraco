-- ============================================================================
-- Migration 057: Consumibles de faccion de Nivel 4 (efecto por bono de accion)
--   consumibles.faccion_requerida + nivel_requerido + efecto de bonificacion
-- Fecha: 2026-10-26
-- Referencias: ADR-002 (ASCII-safe), ADR-003 (Cero Borrado Logico),
--   ADR-006 (baseline = esquema REAL auditado antes de escribir),
--   ADR-008 (idempotencia de esquema: re-ejecutar es no-op funcional),
--   ADR-028 (catalogo administrable: sin CHECK salvo el de faccion, ver
--   hallazgo H-2), ADR-031/ADR-053 (XP como numeric(12,2)),
--   BUG-021 / BUG-060 (patron: migracion completa ANTES del deploy),
--   BUG-026 (emojis en SQL nunca como bytes UTF-8 directos).
-- Requiere: 010 (tabla consumibles), 017/018 (consumibles.categoria),
--   021/031 (consumibles.precio_xp y xp_ledger.* como numeric(12,2)),
--   027/034 (consumibles.precio_xp_base), 035 (consumibles.era_exclusiva).
--   NO requiere la 036.
--
-- PROPOSITO
--   Dotar al catalogo de consumibles de las columnas de un consumible de
--   faccion con efecto temporal por BONO DE ACCION, y sembrar los 4
--   consumibles de faccion de Nivel 4 (uno por faccion: exploradores,
--   curadores, creadores, artistas).
--
-- CARACTER DE LA MIGRACION
--   ADITIVA E IDEMPOTENTE, sin excepciones:
--   - ADITIVA: solo ALTER TABLE ADD COLUMN IF NOT EXISTS / un bloque DO con
--     ADD CONSTRAINT / INSERT ... ON CONFLICT (clave) DO UPDATE / un UPDATE
--     acotado que normaliza un DEFAULT recien anadido.
--     No crea tablas, no elimina tablas, no renombra objetos, no borra filas,
--     no ejecuta DELETE ni DROP sobre datos (ADR-003).
--   - IDEMPOTENTE (ADR-008): segunda corrida = no-op funcional (las columnas ya
--     existen, el constraint ya existe, el INSERT re-afirma los mismos valores
--     sin duplicar filas porque clave es UNIQUE, y el UPDATE de la seccion 4
--     tiene WHERE de corte por lo que no reescribe ninguna fila ya normalizada).
--   ASCII-SAFE (ADR-002 / BUG-026): cero bytes > 127, cero tildes, cero ene
--   con tilde, cero emojis literales, cero escapes unicode, cero backticks.
--   Los iconos se guardan como ENTIDADES HTML en texto ASCII (&#128301; etc.):
--   el navegador las resuelve al renderizar; el byte en la base de datos es
--   ASCII puro.
--   SIN DELETE NI DROP: ninguna fila existente se borra (ADR-003).
--
-- PRE-REQUISITOS (verificados en las migraciones versionadas del repo)
--   - 010: CREATE TABLE consumibles (id uuid PK, clave varchar(50) UNIQUE
--     NOT NULL, nombre varchar(100), descripcion text, precio_xp, activo).
--   - 017 / 018: consumibles.categoria varchar(30) NOT NULL DEFAULT 'general'.
--   - 031: precio_xp y los importes de XP pasan a numeric(12,2); es el mismo
--     orden de precision que se usa aqui para bono_xp_fijo.
--   - 035: consumibles.era_exclusiva varchar(20) NULLABLE. NULL = tienda base
--     (sin gate de era). TYPE REAL CONFIRMADO: varchar(20), NULL permitido.
--   - 027 / 034: consumibles.precio_xp_base numeric(12,2) NOT NULL DEFAULT 0.
--
-- HALLAZGO DE ESQUEMA (ADR-006)
--   H-1. consumibles ya tiene 32+ filas (semillas de 010/015/017/034/035/036).
--        Por eso TODAS las columnas de efecto son NULL-safe o llevan DEFAULT:
--        anadir NOT NULL sin DEFAULT romperia las filas existentes.
--   H-2. ADR-028 pide catalogo administrable SIN CHECK. Se hace una EXCEPCION
--        DELIBERADA y acotada a faccion_requerida: el valor lo consume codigo
--        de efecto (no solo el admin) y una faccion mal escrita desactivaria el
--        consumible en silencio. El CHECK admite NULL (las 32+ filas previas
--        quedan validas sin backfill) y las 4 facciones conocidas.
--   H-3. consumibles.precio_xp_base (precedente de la cabecera de la 036): si
--        la semilla la omitiera, las 4 filas nacerian con precio_xp_base = 0 y
--        corromperian la vista consumibles_precio (precio tachado / descuento
--        falsos). Por eso esta migracion la AUTO-PROVISIONA con
--        ADD COLUMN IF NOT EXISTS (no-op si ya existe) y la siembra con el
--        MISMO valor que precio_xp. La columna NO es nueva de la 057: el
--        ROLLBACK no la elimina.
--
-- TECNICA
--   1. ALTER TABLE consumibles ADD COLUMN IF NOT EXISTS x9 (8 columnas de
--      efecto nuevas + auto-provision de precio_xp_base).
--   2. Bloque DO con consulta a pg_constraint por conname para el CHECK de
--      faccion: PostgreSQL NO soporta ADD CONSTRAINT IF NOT EXISTS; el bloque
--      hace la comprobacion idempotente (patron de la 055).
--   3. INSERT de 4 filas con lista de columnas EXPLICITA y
--      ON CONFLICT (clave) DO UPDATE SET (re-afirma la semilla).
--   4. UPDATE de normalizacion de limite_diario: deja en 0 (SIN tope diario por
--      clave) todo lo que NO es de faccion. Solo UPDATE, sin DELETE ni DROP, y
--      con WHERE de corte para que la segunda corrida sea no-op funcional.
--
-- APLICACION
--   Correr este archivo COMPLETO en el editor SQL de Neon (o con
--   scripts/apply_sql_file.js) DESPUES de la 056. Patron BUG-021 / BUG-060:
--   archivo COMPLETO en una sola corrida. Re-ejecutarlo es no-op funcional.
--   NO desplegar codigo que lea las columnas nuevas antes de aplicar esto.
-- ============================================================================

-- ============================================================================
-- 0. PREFLIGHT (SOLO LECTURA; NO forma parte del DDL; NO se ejecuta solo).
--    Copiar y correr sentencia por sentencia ANTES de aplicar la 057.
-- ============================================================================
-- (0.a) Confirmar que las 4 claves aun NO existen. Esperado antes: 0 filas;
--       despues: 4 filas.
-- SELECT clave FROM consumibles
--   WHERE clave IN ('consumible_catalejo_explorador','consumible_lupa_curador',
--                   'consumible_pluma_creador','consumible_lente_artista')
--   ORDER BY clave;
--
-- (0.b) Confirmar las columnas que usa la semilla y sus tipos. Esperadas 4
--       filas; precio_xp y precio_xp_base DEBEN ser numeric(12,2).
-- SELECT column_name, data_type, numeric_precision, numeric_scale,
--        is_nullable, COALESCE(column_default,'') AS def
--   FROM information_schema.columns
--   WHERE table_schema='public' AND table_name='consumibles'
--     AND column_name IN ('precio_xp','precio_xp_base','categoria','era_exclusiva')
--   ORDER BY column_name;
--
-- (0.c) Conteo del catalogo previo (informativo; hoy 32+ filas):
-- SELECT COUNT(*) AS total_consumibles FROM consumibles;

-- ============================================================================
-- 1. CONSUMIBLES: COLUMNAS DE EFECTO POR BONO DE ACCION (NULL-safe)
-- ============================================================================
-- Todas las columnas de efecto admiten NULL o llevan DEFAULT, de modo que las
-- 32+ filas existentes siguen siendo validas sin backfill (hallazgo H-1).
--   faccion_requerida : NULL = disponible para cualquier faccion.
--   nivel_requerido   : NULL = sin gate de nivel.
--   cargas            : numero de activaciones del bono (DEFAULT 1).
--   duracion_horas    : ventana de validez del bono en horas (DEFAULT 24).
--   bono_accion       : claves de accion separadas por coma, texto ASCII
--                       (ej. 'guardado,visita'). NULL = bono sin accion.
--   bono_xp_fijo      : XP plano por accion, numeric(12,2) como
--                       xp_ledger.bonos_planos (migracion 031).
--   limite_diario     : compras maximas por usuario y dia (DEFAULT 1). SEMANTICA
--                       AMPLIADA en la seccion 4: 0 = SIN tope diario por clave
--                       (valor de las filas clasicas), 1 = una compra por clave
--                       y dia (valor de los 4 consumibles de faccion).
--   icono             : ENTIDAD HTML en texto ASCII (ej. '&#128301;'),
--                       max 24 caracteres (admite entidad doble).
-- precio_xp_base se auto-provisiona (hallazgo H-3): NO es una columna nueva,
-- el ADD COLUMN IF NOT EXISTS es no-op en el estado real de Neon.

ALTER TABLE consumibles
  ADD COLUMN IF NOT EXISTS faccion_requerida varchar(20) NULL,
  ADD COLUMN IF NOT EXISTS nivel_requerido   smallint NULL,
  ADD COLUMN IF NOT EXISTS cargas            smallint NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS duracion_horas    smallint NOT NULL DEFAULT 24,
  ADD COLUMN IF NOT EXISTS bono_accion       varchar(40) NULL,
  ADD COLUMN IF NOT EXISTS bono_xp_fijo      numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS limite_diario     smallint NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS icono             varchar(24) NULL,
  ADD COLUMN IF NOT EXISTS precio_xp_base    numeric(12,2) NOT NULL DEFAULT 0;

-- ============================================================================
-- 2. CHECK DE FACCION. Patron idempotente del repo (055): se consulta
--    pg_constraint por conname y solo se anade lo que falta.
--    NULL siempre es valido: las filas previas no se tocan.
-- ============================================================================
DO $mig057ck$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'public.consumibles'::regclass
       AND conname  = 'chk_consumibles_faccion_requerida'
  ) THEN
    ALTER TABLE public.consumibles
      ADD CONSTRAINT chk_consumibles_faccion_requerida
      CHECK (
        faccion_requerida IS NULL
        OR faccion_requerida IN ('exploradores','curadores','creadores','artistas')
      );
  END IF;
END
$mig057ck$;

-- ============================================================================
-- 3. SEMILLA DE LOS 4 CONSUMIBLES DE FACCION DE NIVEL 4
-- ============================================================================
-- Lista de columnas EXPLICITA. era_exclusiva = NULL (tienda base, sin gate de
-- era: son consumibles de faccion, no de era). categoria = 'faccion'.
-- precio_xp_base = precio_xp (hallazgo H-3, evita corromper la vista
-- consumibles_precio). Descripciones ASCII sin tildes (precedente 034/035/036).
-- Economia (documentada en la descripcion de cada fila): el bono devuelto
-- supera el coste para que el consumible sea rentable; aun asi hay limite
-- diario de compra por usuario (limite_diario = 1) para que no sea bucle.

INSERT INTO consumibles
  (clave, nombre, descripcion, precio_xp, precio_xp_base, activo,
   categoria, era_exclusiva,
   faccion_requerida, nivel_requerido, cargas, duracion_horas,
   bono_accion, bono_xp_fijo, limite_diario, icono)
VALUES
  ('consumible_catalejo_explorador', 'Catalejo del Explorador',
   'Faccion Exploradores. +15 XP extra en 2 guardados o visitas GPS dentro de 24 h. Devuelve 30 XP por 20. Neto +10.',
   20, 20, true,
   'faccion', NULL,
   'exploradores', 4, 2, 24,
   'guardado,visita', 15.00, 1, '&#128301;'),
  ('consumible_lupa_curador', 'Lupa del Curador',
   'Faccion Curadores. +3 XP extra en 5 votos a medios dentro de 24 h. Devuelve 15 XP por 10. Neto +5.',
   10, 10, true,
   'faccion', NULL,
   'curadores', 4, 5, 24,
   'media_voto', 3.00, 1, '&#128065;&#65039;'),
  ('consumible_pluma_creador', 'Pluma del Creador',
   'Faccion Creadores. +30 XP extra en tu siguiente resena de 400 caracteres o mas dentro de 24 h. Devuelve 30 XP por 20. Neto +10.',
   20, 20, true,
   'faccion', NULL,
   'creadores', 4, 1, 24,
   'resena', 30.00, 1, '&#9997;&#65039;'),
  ('consumible_lente_artista', 'Lente del Artista',
   'Faccion Artistas. +10 XP extra en 3 fotos o videos subidos dentro de 24 h. Devuelve 30 XP por 20. Neto +10.',
   20, 20, true,
   'faccion', NULL,
   'artistas', 4, 3, 24,
   'foto', 10.00, 1, '&#128248;')
ON CONFLICT (clave) DO UPDATE SET
  nombre            = EXCLUDED.nombre,
  descripcion       = EXCLUDED.descripcion,
  precio_xp         = EXCLUDED.precio_xp,
  precio_xp_base    = EXCLUDED.precio_xp_base,
  categoria         = EXCLUDED.categoria,
  era_exclusiva     = EXCLUDED.era_exclusiva,
  faccion_requerida = EXCLUDED.faccion_requerida,
  nivel_requerido   = EXCLUDED.nivel_requerido,
  cargas            = EXCLUDED.cargas,
  duracion_horas    = EXCLUDED.duracion_horas,
  bono_accion       = EXCLUDED.bono_accion,
  bono_xp_fijo      = EXCLUDED.bono_xp_fijo,
  limite_diario     = EXCLUDED.limite_diario,
  icono             = EXCLUDED.icono,
  activo            = true;

-- ============================================================================
-- 4. NORMALIZACION DE limite_diario EN LAS FILAS CLASICAS (defensa en
--    profundidad; SOLO UPDATE, sin DELETE ni DROP).
-- ============================================================================
-- MOTIVO: el ADD COLUMN de la seccion 1 declara
--   limite_diario smallint NOT NULL DEFAULT 1
-- y PostgreSQL rellena el DEFAULT en las 32+ filas preexistentes. Ese 1 es
-- correcto para los 4 consumibles de faccion (una compra por clave y dia) pero
-- es una REGRESION LATENTE para el catalogo clasico: si algun dia un handler
-- leyera limite_diario sin acotar por categoria, un consumible de 5 cargas
-- como amuleto_x2 pasaria de 5 compras/dia a 1 compra/dia por clave. El
-- handler nuevo SI acota por categoria = 'faccion', pero el dato debe ser
-- correcto por si mismo.
--
-- SEMANTICA DE limite_diario (queda fijada aqui):
--   0 = SIN tope diario por clave. Es el valor de las filas clasicas: su
--       comportamiento vigente de tope GLOBAL de 5 compras/dia no cambia y
--       sigue viviendo en el handler, no en esta columna.
--   1 = una compra por clave y dia. Es el valor de los 4 consumibles de
--       faccion, que ya traen 1 en la semilla.
--
-- IDEMPOTENCIA (ADR-008): el WHERE categoria <> 'faccion' AND limite_diario <> 0
-- deja fuera las 4 filas de faccion y toda fila ya normalizada, de modo que la
-- segunda corrida actualiza 0 filas (no-op funcional). El DEFAULT de la columna
-- NO se toca: sigue siendo 1 para que una fila futura sin limite explicito no
-- herede un tope ausente por accidente; las filas clasicas se normalizan aqui.

UPDATE consumibles
   SET limite_diario = 0
 WHERE categoria <> 'faccion'
   AND limite_diario <> 0;

-- ============================================================================
-- VERIFICACION POST-APLICACION (solo lectura; NO se ejecuta dentro de la
-- migracion; NO modifica nada). Copiar y correr sentencia por sentencia.
-- ============================================================================
-- (a) Las 4 filas de faccion con sus valores. ESPERADO: 4 filas, todas con
--     categoria 'faccion', nivel_requerido 4, era_exclusiva NULL, activo true,
--     precio_xp_base = precio_xp.
-- SELECT clave, nombre, faccion_requerida, nivel_requerido, precio_xp,
--        precio_xp_base, cargas, duracion_horas, bono_accion, bono_xp_fijo,
--        limite_diario, icono, categoria, era_exclusiva, activo
--   FROM consumibles
--   WHERE clave IN ('consumible_catalejo_explorador','consumible_lupa_curador',
--                   'consumible_pluma_creador','consumible_lente_artista')
--   ORDER BY faccion_requerida;
--
-- (b) Conteo de las 4 claves. ESPERADO: 4.
-- SELECT COUNT(*) AS consumibles_faccion
--   FROM consumibles
--   WHERE clave IN ('consumible_catalejo_explorador','consumible_lupa_curador',
--                   'consumible_pluma_creador','consumible_lente_artista');
--
-- (c) Conteo por faccion. ESPERADO: 4 filas, una por faccion, con 1 cada una.
-- SELECT faccion_requerida, COUNT(*) AS filas
--   FROM consumibles
--   WHERE categoria = 'faccion'
--   GROUP BY faccion_requerida
--   ORDER BY faccion_requerida;
--
-- (d) Integridad de la semilla. ESPERADO: 0 FILAS (ninguna incoherencia:
--     precio_xp_base distinto de precio_xp, activo false, nivel distinto de 4,
--     faccion nula, o bono_xp_fijo <= 0).
-- SELECT clave, precio_xp, precio_xp_base, activo, nivel_requerido,
--        faccion_requerida, bono_xp_fijo
--   FROM consumibles
--   WHERE clave IN ('consumible_catalejo_explorador','consumible_lupa_curador',
--                   'consumible_pluma_creador','consumible_lente_artista')
--     AND (precio_xp_base IS DISTINCT FROM precio_xp
--          OR activo IS DISTINCT FROM true
--          OR nivel_requerido IS DISTINCT FROM 4
--          OR faccion_requerida IS NULL
--          OR bono_xp_fijo <= 0);
--
-- (e) Columnas nuevas presentes con su tipo. ESPERADO: 8 filas.
-- SELECT column_name, data_type, is_nullable, COALESCE(column_default,'') AS def
--   FROM information_schema.columns
--   WHERE table_schema='public' AND table_name='consumibles'
--     AND column_name IN ('faccion_requerida','nivel_requerido','cargas',
--                         'duracion_horas','bono_accion','bono_xp_fijo',
--                         'limite_diario','icono')
--   ORDER BY column_name;
--
-- (f) CHECK de faccion presente. ESPERADO: 1 fila.
-- SELECT conname, pg_get_constraintdef(oid) AS def
--   FROM pg_constraint
--   WHERE conrelid = 'public.consumibles'::regclass
--     AND conname  = 'chk_consumibles_faccion_requerida';
--
-- (g) Ninguna fila previa quedo invalidada. ESPERADO: 0 FILAS (ninguna fila
--     con faccion fuera de las 4 validas; el CHECK ya lo impide, es control
--     positivo).
-- SELECT clave, faccion_requerida FROM consumibles
--   WHERE faccion_requerida IS NOT NULL
--     AND faccion_requerida NOT IN ('exploradores','curadores','creadores','artistas');
--
-- (h) Reparto de limite_diario por categoria (control del ajuste de la seccion
--     4). ESPERADO exactamente 2 filas:
--       'faccion' | 1 | 4
--       resto    | 0 | total de filas clasicas (32+)
--     Si aparece cualquier categoria con limite_diario = 1 y no es 'faccion',
--     la seccion 4 no corrio o se re-ejecuto un INSERT con el DEFAULT viejo.
-- SELECT categoria, limite_diario, COUNT(*) AS filas
--   FROM consumibles
--   GROUP BY 1, 2
--   ORDER BY 1;
--
-- (i) Las 4 claves de faccion con su gate de nivel y faccion. ESPERADO: 4
--     filas, todas con nivel_requerido = 4 y faccion_requerida no nula:
--       consumible_catalejo_explorador | 4 | exploradores
--       consumible_lente_artista       | 4 | artistas
--       consumible_lupa_curador        | 4 | curadores
--       consumible_pluma_creador       | 4 | creadores
-- SELECT clave, nivel_requerido, faccion_requerida
--   FROM consumibles
--   WHERE categoria = 'faccion'
--   ORDER BY clave;
--
-- (j) Control positivo del ajuste 1: las filas clasicas conservan el gate de
--     faccion y nivel ABIERTO (NULL). ESPERADO: 0 FILAS. Si devuelve filas, o
--     el INSERT les escribio gate por error o alguien lo edito a mano.
-- SELECT clave, nivel_requerido, faccion_requerida
--   FROM consumibles
--   WHERE categoria <> 'faccion'
--     AND (nivel_requerido IS NOT NULL OR faccion_requerida IS NOT NULL);

-- ============================================================================
-- ROLLBACK (emergencia; LOSSY solo en el efecto de faccion).
--   Este bloque NO se ejecuta: esta comentado entero. No va en el flujo normal.
--   Se hace por pasos y en este orden:
--     1. DESACTIVAR la semilla (ADR-003: NUNCA DELETE de las 4 filas; se
--        apagan con activo = false, la fila y su historial de compras siguen
--        existiendo para compra_consumibles).
--     2. QUITAR el CHECK.
--     3. DROP COLUMN de las 8 columnas nuevas de la 057. precio_xp_base NO se
--        elimina: es preexistente (027/034) y otras vistas dependen de ella.
--     4. El UPDATE de la seccion 4 NO tiene contra-paso: 0 es el valor
--        semanticamente correcto para las filas clasicas (su tope es GLOBAL de
--        5 compras/dia, que vive en el handler, no en la columna) y ademas la
--        columna limite_diario desaparece en el paso 3. Volver a 1 en masa
--        reintroduciria la regresion de amuleto_x2 (1 compra/dia por clave), asi
--        que si alguna vez hiciera falta un valor distinto se fija fila a fila
--        y con criterio, nunca con un UPDATE masivo de reverso.
--   Si alguna columna nueva ya tuviera datos productivos, exportarla antes:
--   los DROP COLUMN son irreversibles (LOSSY).
--
--   UPDATE consumibles SET activo = false
--    WHERE clave IN ('consumible_catalejo_explorador','consumible_lupa_curador',
--                    'consumible_pluma_creador','consumible_lente_artista');
--
--   ALTER TABLE public.consumibles
--     DROP CONSTRAINT IF EXISTS chk_consumibles_faccion_requerida;
--
--   ALTER TABLE public.consumibles
--     DROP COLUMN IF EXISTS faccion_requerida,
--     DROP COLUMN IF EXISTS nivel_requerido,
--     DROP COLUMN IF EXISTS cargas,
--     DROP COLUMN IF EXISTS duracion_horas,
--     DROP COLUMN IF EXISTS bono_accion,
--     DROP COLUMN IF EXISTS bono_xp_fijo,
--     DROP COLUMN IF EXISTS limite_diario,
--     DROP COLUMN IF EXISTS icono;
-- ============================================================================
