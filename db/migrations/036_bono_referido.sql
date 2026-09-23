-- ============================================================================
-- Migration 036: Bono de bienvenida para el usuario referido (3 consumibles
--   de regalo; nunca se compran)
-- Fecha: 2026-09-23
-- Referencias: ADR-002 (ASCII-safe), ADR-003 (Cero Borrado Logico), ADR-006
--   (baseline = esquema REAL auditado antes de escribir), ADR-008 (gobernanza
--   e idempotencia de esquema), ADR-028 (catalogo administrable: sin CHECK),
--   ADR-035/ADR-053 (XP y precios de consumibles numeric(12,2)), ADR-042
--   (columnas de la 027), ADR-056 (consumibles con gate por era: la columna
--   era_exclusiva la declara la 035), BUG-021 / BUG-060 (patron: migracion
--   completa ANTES del deploy), BUG-026 (emojis en SQL nunca como bytes UTF-8
--   directos).
-- Requiere: 010 (consumibles), 015/017/018 (categoria), 021 (precio_xp
--   numeric(12,2)), 027/034 (precio_xp_base y tipo_canje) y 035
--   (era_exclusiva). La seccion 1 AUTO-PROVISIONA las 3 columnas no base que
--   esta semilla usa (ADD COLUMN IF NOT EXISTS; NO-OP si ya existen), siguiendo
--   el precedente de la 034 seccion 4-bis, para que esta migracion sea
--   autocontenida y no falle con 42703 si alguna dependencia no corrio.
--
-- QUE HACE
--   1. Auto-provision idempotente de consumibles.precio_xp_base,
--      consumibles.era_exclusiva y consumibles.tipo_canje.
--   2. Semilla de 3 consumibles de BONO DE BIENVENIDA que se regalan al
--      usuario referido (nunca se compran): bienvenida_x2_24h,
--      bienvenida_ascenso y bienvenida_fundador.
--
-- SEMANTICA DEL BONO
--   Estos 3 consumibles NO son comprables: su entrega la hace el flujo de
--   referidos (usuarios.codigo_referido / usuarios.referido_por, migracion
--   016) como regalo al usuario que se registra con un codigo valido.
--   precio_xp y precio_xp_base se siembran con un valor de REFERENCIA de
--   catalogo (para que el admin y la vista consumibles_precio no muestren 0),
--   NO como un precio de venta. El backend NO debe exponerlos en la tienda de
--   compra. tipo_canje = NULL y era_exclusiva = NULL (sin gate de era: son
--   bienes de regalo). categoria: impulso / general / coleccion, en linea con
--   el catalogo de la 018.
--
-- CARACTER DE LA MIGRACION
--   ADITIVA: solo ALTER TABLE ADD COLUMN IF NOT EXISTS / INSERT de semilla.
--   No elimina, no renombra, no toca objetos previos. SIN DELETE, SIN DROP,
--   SIN TRUNCATE (Cero Borrado Logico, ADR-003).
--   IDEMPOTENTE (ADR-008): ADD COLUMN IF NOT EXISTS; la semilla usa
--   INSERT ... ON CONFLICT (clave) DO UPDATE SET y re-afirma los campos de la
--   semilla sin duplicar filas. Re-ejecutar el archivo COMPLETO es no-op
--   funcional (N veces).
--   ASCII-SAFE (ADR-002): cero bytes > 127, cero tildes, cero ene con tilde,
--   cero emojis, cero escapes unicode, cero backticks (BUG-026).
--
-- HALLAZGO DEL ESQUEMA REAL (ADR-006; verificado en db/migrations 010, 017,
-- 021, 027, 034 y 035 antes de escribir):
--   - consumibles (010): id uuid PK DEFAULT gen_random_uuid(); clave
--     varchar(50) UNIQUE NOT NULL; nombre varchar(100) NOT NULL; descripcion
--     text DEFAULT ''; precio_xp; activo boolean NOT NULL DEFAULT true;
--     creado_en timestamptz DEFAULT now().
--   - consumibles.categoria (017): varchar(30) NOT NULL DEFAULT 'general'.
--   - consumibles.precio_xp (021): numeric(12,2).
--   - consumibles.precio_xp_base (027/034): numeric(12,2) NOT NULL DEFAULT 0.
--     CRITICO: la semilla lo escribe con el MISMO valor de precio_xp; si se
--     omitiera quedaria en su DEFAULT 0 y corromperia la vista
--     consumibles_precio.
--   - consumibles.era_exclusiva (035): varchar(20) NULL (NULL = tienda base).
--   - consumibles.tipo_canje (027/034): text libre SIN CHECK (ADR-028).
--
-- APLICACION
--   Correr este archivo COMPLETO en el editor SQL de Neon (o con
--   scripts/apply_sql_file.js) DESPUES de la 035. Patron BUG-021 / BUG-060:
--   archivo COMPLETO en una sola corrida. Re-ejecutarlo es no-op funcional.
-- ============================================================================

-- ============================================================================
-- 0. PREFLIGHT (SOLO LECTURA; NO forma parte del DDL; NO se ejecuta solo).
--    Copiar y correr sentencia por sentencia ANTES de aplicar la 036.
-- ============================================================================
-- (0.a) Confirmar que las 3 claves del bono aun NO existen. Esperado antes:
--       0 filas; despues: 3 filas.
-- SELECT clave FROM consumibles
--   WHERE clave IN ('bienvenida_x2_24h','bienvenida_ascenso','bienvenida_fundador')
--   ORDER BY clave;
--
-- (0.b) Confirmar las columnas que usa la semilla. Esperadas 4 filas;
--       precio_xp_base DEBE ser numeric(12,2) NOT NULL.
-- SELECT column_name, data_type, numeric_precision, numeric_scale,
--        is_nullable, COALESCE(column_default,'') AS def
--   FROM information_schema.columns
--   WHERE table_schema='public' AND table_name='consumibles'
--     AND column_name IN ('precio_xp','precio_xp_base','era_exclusiva','tipo_canje')
--   ORDER BY column_name;
--
-- (0.c) Conteo del catalogo previo (informativo; hoy 32 filas tras la 035):
-- SELECT COUNT(*) AS total_consumibles FROM consumibles;

-- ============================================================================
-- 1. CONSUMIBLES: AUTO-PROVISION DE LAS 3 COLUMNAS NO BASE DEL BONO
-- ============================================================================
-- Reproduce el patron de la 034 seccion 4-bis: declara de forma idempotente
-- las columnas que la semilla usa y que otras migraciones tambien declaran.
--   - Si ya existen (estado real de Neon tras 027/034/035): NO-OP.
--   - Si alguna no existiera: se crea con su default y la semilla funciona.
-- precio_xp_base es NOT NULL DEFAULT 0; la semilla SIEMPRE lo escribe con el
-- MISMO valor de precio_xp.
-- era_exclusiva queda NULLABLE (NULL = sin gate de era, ADR-056).
-- tipo_canje TEXT libre (ADR-028).

ALTER TABLE consumibles
  ADD COLUMN IF NOT EXISTS precio_xp_base NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS era_exclusiva  varchar(20),
  ADD COLUMN IF NOT EXISTS tipo_canje     TEXT;

-- ============================================================================
-- 2. SEMILLA DE LOS 3 CONSUMIBLES DE BONO DE BIENVENIDA
-- ============================================================================
-- Filas NUEVAS de consumibles (clave UNIQUE). Idempotente con
-- ON CONFLICT (clave) DO UPDATE SET: en la primera corrida inserta; en una
-- segunda re-afirma los campos de la semilla sin duplicar filas.
-- Lista de columnas EXPLICITA (hallazgo ADR-006 de la cabecera).
-- Los 3 son de REGALO (nunca se compran): era_exclusiva y tipo_canje = NULL.
-- Descripciones ASCII sin acentos (precedente de semillas 034/035).

INSERT INTO consumibles
  (clave, nombre, descripcion, precio_xp, precio_xp_base, activo,
   categoria, era_exclusiva, tipo_canje)
VALUES
  ('bienvenida_x2_24h', 'Doble XP 24h',
   'Activa el multiplicador x2 de XP durante 24 horas.',
   500, 500, true, 'impulso', NULL, NULL),
  ('bienvenida_ascenso', 'Ascenso al Nivel 6',
   'Asciende tu nivel ganado al 6 al instante.',
   600, 600, true, 'general', NULL, NULL),
  ('bienvenida_fundador', 'Bendicion del Fundador',
   'Otorga un mapa extra, un album extra y vitrina destacada por 7 dias.',
   550, 550, true, 'coleccion', NULL, NULL)
ON CONFLICT (clave) DO UPDATE SET
  nombre         = EXCLUDED.nombre,
  descripcion    = EXCLUDED.descripcion,
  precio_xp      = EXCLUDED.precio_xp,
  precio_xp_base = EXCLUDED.precio_xp_base,
  categoria      = EXCLUDED.categoria,
  era_exclusiva  = EXCLUDED.era_exclusiva,
  tipo_canje     = EXCLUDED.tipo_canje,
  activo         = true;

-- ============================================================================
-- VERIFICACION POST-APLICACION (solo lectura; NO se ejecuta dentro de la
-- migracion; NO modifica nada). Copiar y correr sentencia por sentencia.
-- ============================================================================
-- (a) Las 3 claves del bono con sus valores (esperadas 3 filas;
--     precio_xp_base = precio_xp, categoria correcta, era_exclusiva NULL,
--     tipo_canje NULL, activo true):
-- SELECT clave, nombre, descripcion, precio_xp, precio_xp_base, categoria,
--        era_exclusiva, tipo_canje, activo
--   FROM consumibles
--   WHERE clave IN ('bienvenida_x2_24h','bienvenida_ascenso','bienvenida_fundador')
--   ORDER BY clave;
--
-- (b) Conteo de las 3 claves (esperado 3):
-- SELECT COUNT(*) AS bonos_bienvenida
--   FROM consumibles
--   WHERE clave IN ('bienvenida_x2_24h','bienvenida_ascenso','bienvenida_fundador');
--
-- (c) Integridad de la semilla (esperado 0 FILAS = ninguna incoherencia:
--     precio_xp_base distinto de precio_xp o activo false):
-- SELECT clave, precio_xp, precio_xp_base, activo FROM consumibles
--   WHERE clave IN ('bienvenida_x2_24h','bienvenida_ascenso','bienvenida_fundador')
--     AND (precio_xp_base IS DISTINCT FROM precio_xp OR activo IS DISTINCT FROM true);
--
-- (d) Idempotencia global: re-ejecutar TODO el archivo y volver a correr
--     (a)-(c): los conteos y valores deben ser IDENTICOS (no-op funcional).
