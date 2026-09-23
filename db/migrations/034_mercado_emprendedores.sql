-- ============================================================================
-- Migration 034: Mercado de emprendedores por Casa (contrato de esquema
--   CONGELADO) - puntos de mercado, normas por Casa, ofertas, ledger de
--   ventas y semilla de consumibles PRODUCIBLES
-- Fecha: 2026-09-23
-- Referencias: ADR-002 (ASCII-safe), ADR-003 (Cero Borrado Logico / merge
--   JSONB), ADR-006 (baseline = esquema REAL auditado antes de escribir),
--   ADR-008 (gobernanza e idempotencia de esquema), ADR-028 (Casas
--   condor/jaguar/delfin en usuarios.casa), ADR-035/ADR-053 (XP y consumibles
--   numeric(12,2)), ADR-042 (columnas de la 027 en consumibles), BUG-021 /
--   BUG-060 (patron: migracion completa ANTES del deploy del backend),
--   BUG-026 (emojis en SQL nunca como bytes UTF-8 directos).
-- Requiere: 033 aplicada; usuarios y consumibles ya existentes. NO requiere la
--   027: esta migracion AUTO-PROVISIONA en consumibles las 3 columnas que el
--   mercado necesita (precio_xp_base, precio_xp_actual, tipo_canje). Es
--   compatible con que la 027 se aplique ANTES o DESPUES (ver seccion 4-bis).
--
-- QUE HACE
--   1. usuarios.mercado_puntos numeric(12,2) NOT NULL DEFAULT 0 (METRICA DE
--      PROGRESO del mercado / nodo Emprendedor del usuario; NO es una moneda,
--      no es gastable ni transferible y se deriva de las ventas; NO viola la
--      moneda unica usuarios.xp_total de ADR-018).
--   2. mercado_config: normas por Casa (3 mercados independientes) con
--      impuesto_base_pct, arancel_inter_casa_pct, slots_base, precio_min /
--      precio_max, duracion_oferta_horas y banderas de cross-casa y de
--      produccion. Semilla idempotente de las 3 Casas.
--   3. mercado_ofertas: listings de consumibles AISLADOS por Casa (FK a
--      usuarios y consumibles), con cantidad, cantidad_restante, precio
--      unitario, origen (inventario|produccion) y estado.
--   4. mercado_ventas: ledger APPEND-ONLY de ventas con el desglose completo
--      (subtotal, impuesto, arancel, neto del vendedor) y bandera cross-casa.
--   5. AUTO-PROVISION de las 3 columnas de consumibles que el mercado usa y
--      que HOY NO existen porque la 027 no esta aplicada (precio_xp_base,
--      precio_xp_actual, tipo_canje). Ver seccion 4-bis.
--   6. Semilla de 3 consumibles PRODUCIBLES (prod_artesania, prod_cafe,
--      prod_souvenir) con tipo_canje = 'producir'; depende de la seccion 4-bis.
--
-- CARACTER DE LA MIGRACION
--   ADITIVA: solo ALTER TABLE ADD COLUMN / CREATE TABLE / CREATE INDEX /
--   INSERT de semilla. No elimina, no renombra, no toca objetos previos.
--   IDEMPOTENTE (ADR-008): ADD COLUMN IF NOT EXISTS; CREATE TABLE IF NOT
--   EXISTS; CREATE INDEX IF NOT EXISTS; ambos seeds con ON CONFLICT DO
--   NOTHING. Re-ejecutar el archivo COMPLETO es no-op seguro (N veces).
--   ASCII-SAFE (ADR-002): cero bytes > 127, cero tildes, cero ene, cero
--   emojis, cero escapes unicode, cero backticks.
--   SIN FUNCIONES NI RLS: esta migracion NO crea funciones SQL, triggers ni
--   policies de Row Level Security. El aislamiento por Casa es de DATOS (la
--   columna casa de ofertas/ventas y la PK de mercado_config).
--   CERO BORRADO LOGICO (ADR-003): no se borra ni se reescribe nada; los
--   seeds no pisan filas existentes (DO NOTHING).
--
-- CONTRATO DE ESQUEMA CONGELADO
--   Los nombres de tabla y de columna de este archivo son el contrato contra
--   el que se escribira el backend. NO renombrar ni reordenar columnas una
--   vez aplicada la migracion.
--
-- ORDEN DE LAS SENTENCIAS (para que las FK resuelvan)
--   1) usuarios.mercado_puntos (usuarios es padre de las FK de ofertas/ventas)
--   2) mercado_config (sin FK)
--   3) mercado_ofertas (FK usuarios, consumibles)
--   4) mercado_ventas (FK usuarios, mercado_ofertas, consumibles)
--   4-bis) consumibles: auto-provision de las 3 columnas del mercado (sin FK)
--   5) consumibles producibles (sin FK nueva; depende de 4-bis)
--
-- HALLAZGO DEL SCHEMA REAL (ADR-006; verificado en db/migrations 010, 017,
-- 021 y 027 antes de escribir):
--   - consumibles (010): id uuid PK DEFAULT gen_random_uuid(); clave
--     varchar(50) UNIQUE NOT NULL; nombre varchar(100) NOT NULL; descripcion
--     text DEFAULT ''; precio_xp; activo boolean NOT NULL DEFAULT true;
--     creado_en timestamptz DEFAULT now().
--   - consumibles.categoria (017): varchar(30) NOT NULL DEFAULT 'general'.
--   - consumibles.precio_xp (021): convertido a numeric(12,2).
--   - consumibles.precio_xp_base (027): numeric(12,2) NOT NULL DEFAULT 0.
--     La 027 fue APLICADA en Neon el 2026-09-23 (confirmado por el operador),
--     asi que la columna YA existe. Aun asi, la seccion 4-bis la
--     auto-provisiona de forma idempotente (NO-OP si ya existe) para que esta
--     migracion no falle con 42703 en un entorno sin la 027. La semilla SETEA
--     precio_xp_base con el MISMO valor de precio_xp (si no, los producibles
--     arrancarian con base 0 y la vista consumibles_precio quedaria corrupta).
--   - consumibles.precio_xp_actual (027): numeric(12,2) NULLABLE; se deja
--     NULL (NULL = usar precio_xp_base). Auto-provisionada en 4-bis (NO-OP si
--     la 027 ya corrio).
--   - consumibles.tipo_canje (027): text libre SIN CHECK; acepta 'producir'.
--     Auto-provisionada en 4-bis (NO-OP si la 027 ya corrio).
--   - usuarios: PK uuid (003+); usuarios.casa usa condor|jaguar|delfin.
--   - mercado_puntos / mercado_config / mercado_ofertas / mercado_ventas NO
--     existian antes de esta migracion.
--
-- APLICACION
--   Correr este archivo COMPLETO en el editor SQL de Neon (o con
--   scripts/apply_sql_file.js) DESPUES de la 033 y ANTES del deploy del
--   backend del mercado. Patron BUG-021 / BUG-060: archivo COMPLETO en una
--   sola corrida. Re-ejecutarlo es no-op funcional.
--
-- ROLLBACK (emergencia, LOSSY si ya hay datos de mercado)
--   DROP TABLE IF EXISTS mercado_ventas, mercado_ofertas, mercado_config;
--   ALTER TABLE usuarios DROP COLUMN IF EXISTS mercado_puntos;
--   No revierte la semilla de consumibles producibles (se conserva, coherente
--   con Cero Borrado Logico). No va en el flujo normal.
-- ============================================================================

-- ============================================================================
-- 0. PREFLIGHT (SOLO LECTURA; NO forma parte del DDL; NO se ejecuta solo).
--    Copiar y correr sentencia por sentencia ANTES de aplicar la 034.
-- ============================================================================
-- (0.a) Confirmar que existen los predecesores logicos de las FK. Esperadas
--       2 filas (usuarios y consumibles).
-- SELECT table_name FROM information_schema.tables
--   WHERE table_schema='public' AND table_name IN ('usuarios','consumibles')
--   ORDER BY table_name;
--
-- (0.b) Confirmar que las 3 tablas y la columna aun NO existen. Esperado
--       antes: 0 filas; despues: 3 tablas y 1 columna.
-- SELECT tablename FROM pg_tables
--   WHERE schemaname='public'
--     AND tablename IN ('mercado_config','mercado_ofertas','mercado_ventas')
--   ORDER BY tablename;
-- SELECT column_name FROM information_schema.columns
--   WHERE table_schema='public' AND table_name='usuarios'
--     AND column_name='mercado_puntos';
--
-- (0.c) Confirmar las columnas de la 027 en consumibles. Esperadas 3 filas;
--       precio_xp_base DEBE ser NOT NULL (no NULLABLE).
-- SELECT column_name, data_type, is_nullable, column_default
--   FROM information_schema.columns
--   WHERE table_schema='public' AND table_name='consumibles'
--     AND column_name IN ('precio_xp_base','precio_xp_actual','tipo_canje')
--   ORDER BY column_name;
--
-- (0.d) Confirmar el tipo real de consumibles.precio_xp (numeric(12,2) por la
--       021). Esperada 1 fila numeric.
-- SELECT column_name, data_type, numeric_precision, numeric_scale
--   FROM information_schema.columns
--   WHERE table_schema='public' AND table_name='consumibles'
--     AND column_name='precio_xp';

-- ============================================================================
-- 1. USUARIOS: SALDO DE PUNTOS DEL MERCADO
-- ============================================================================
-- METRICA DE PROGRESO del mercado (nodo Emprendedor del usuario), NO una
-- moneda: no es gastable ni transferible y se deriva de las ventas. No viola
-- la moneda unica usuarios.xp_total de ADR-018. numeric(12,2) es consistente
-- con ADR-035/ADR-053 (XP decimal) y con los precios de consumibles.
-- NOT NULL DEFAULT 0: los usuarios existentes arrancan en 0.

ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS mercado_puntos numeric(12,2) NOT NULL DEFAULT 0;

-- ============================================================================
-- 2. MERCADO_CONFIG: NORMAS POR CASA (3 mercados independientes)
-- ============================================================================
-- La PK es casa (text), validada por CHECK a las 3 Casas de ADR-028. Cada
-- Casa define su propio impuesto y arancel inter-casa. Los parametros de
-- politica (slots, cross-casa, produccion, rango de precios y duracion de la
-- oferta) tienen defaults seguros; el seed solo fija el impuesto y el arancel
-- por Casa y deja el resto en default.

CREATE TABLE IF NOT EXISTS mercado_config (
  casa                   text PRIMARY KEY CHECK (casa IN ('condor','jaguar','delfin')),
  impuesto_base_pct      numeric(5,4) NOT NULL DEFAULT 0.05,
  arancel_inter_casa_pct numeric(5,4) NOT NULL DEFAULT 0.10,
  slots_base             integer NOT NULL DEFAULT 3,
  permite_cross_casa     boolean NOT NULL DEFAULT true,
  permite_produccion     boolean NOT NULL DEFAULT true,
  precio_min             numeric(12,2) NOT NULL DEFAULT 5,
  precio_max             numeric(12,2) NOT NULL DEFAULT 5000,
  duracion_oferta_horas  integer NOT NULL DEFAULT 168,
  activo                 boolean NOT NULL DEFAULT true,
  actualizado_en         timestamptz NOT NULL DEFAULT now()
);

-- Semilla idempotente de las 3 Casas. ON CONFLICT (casa) DO NOTHING: una
-- segunda corrida NO reescribe una recalibracion hecha por el operador.
--   condor: impuesto 2%  + arancel inter-casa 25% (casa de comercio caro).
--   jaguar: impuesto 5%  + arancel inter-casa 10% (base, los defaults).
--   delfin: impuesto 0%  + arancel inter-casa 5%  (casa de mercado abierto).

INSERT INTO mercado_config (casa, impuesto_base_pct, arancel_inter_casa_pct)
VALUES
  ('condor', 0.02, 0.25),
  ('jaguar', 0.05, 0.10),
  ('delfin', 0.00, 0.05)
ON CONFLICT (casa) DO NOTHING;

-- ============================================================================
-- 3. MERCADO_OFERTAS: LISTINGS AISLADOS POR CASA
-- ============================================================================
-- Cada oferta pertenece a UNA Casa y referencia un consumible real. cantidad
-- es el tamano original; cantidad_restante baja con cada venta y llega a 0
-- cuando la oferta se agota (CHECK >= 0). origen distingue el inventario
-- existente de la produccion del propio usuario. estado permite cerrar la
-- oferta sin borrarla (Cero Borrado Logico, ADR-003).
--   ON DELETE CASCADE en vendedor_id: coherente con 010/026/030 (el proyecto
--     no borra usuarios, pero la FK no deja ofertas huerfanas).
--   ON DELETE RESTRICT en consumible_id: no se puede borrar un consumible que
--     tenga ofertas de mercado (integridad del catalogo).

CREATE TABLE IF NOT EXISTS mercado_ofertas (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendedor_id       uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  casa              text NOT NULL CHECK (casa IN ('condor','jaguar','delfin')),
  consumible_id     uuid NOT NULL REFERENCES consumibles(id) ON DELETE RESTRICT,
  cantidad          integer NOT NULL DEFAULT 1 CHECK (cantidad > 0),
  cantidad_restante integer NOT NULL DEFAULT 1 CHECK (cantidad_restante >= 0),
  precio_unitario   numeric(12,2) NOT NULL CHECK (precio_unitario > 0),
  origen            text NOT NULL DEFAULT 'inventario'
                    CHECK (origen IN ('inventario','produccion')),
  estado            text NOT NULL DEFAULT 'activa'
                    CHECK (estado IN ('activa','agotada','cancelada')),
  creado_en         timestamptz NOT NULL DEFAULT now(),
  expira_en         timestamptz
);

-- Indice 1: catalogo del mercado de una Casa (filtrar activas por consumible).
CREATE INDEX IF NOT EXISTS idx_mercado_ofertas_casa
  ON mercado_ofertas (casa, estado, consumible_id);

-- Indice 2: ofertas de un vendedor (panel "mis ofertas").
CREATE INDEX IF NOT EXISTS idx_mercado_ofertas_vendedor
  ON mercado_ofertas (vendedor_id);

-- ============================================================================
-- 4. MERCADO_VENTAS: LEDGER APPEND-ONLY DE VENTAS
-- ============================================================================
-- Registro inmutable de cada venta para auditoria y para reconstruir el
-- mercado. Guarda el desglose COMPLETO del precio para no depender de los
-- porcentajes vigentes en el momento de la lectura: subtotal_xp, impuesto_pct
-- / impuesto_xp, arancel_pct / arancel_xp y neto_vendedor_xp.
--   oferta_id es NULLABLE con ON DELETE SET NULL: si algun dia se retirara la
--     oferta, la venta historica se conserva (nunca se pierde el ledger).
--   comprador_id / vendedor_id CASCADE coherente con el resto del esquema.
--   consumible_id RESTRICT: no se borra un consumible con historial de ventas.
--   casa es la Casa del mercado donde ocurrio la venta.
--   es_cross_casa marca si la venta cruzo Casas (aplica el arancel).

CREATE TABLE IF NOT EXISTS mercado_ventas (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  oferta_id        uuid REFERENCES mercado_ofertas(id) ON DELETE SET NULL,
  comprador_id     uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  vendedor_id      uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  consumible_id    uuid NOT NULL REFERENCES consumibles(id) ON DELETE RESTRICT,
  casa             text NOT NULL CHECK (casa IN ('condor','jaguar','delfin')),
  es_cross_casa    boolean NOT NULL DEFAULT false,
  cantidad         integer NOT NULL CHECK (cantidad > 0),
  precio_unitario  numeric(12,2) NOT NULL,
  subtotal_xp      numeric(12,2) NOT NULL,
  impuesto_pct     numeric(5,4) NOT NULL DEFAULT 0,
  impuesto_xp      numeric(12,2) NOT NULL DEFAULT 0,
  arancel_pct      numeric(5,4) NOT NULL DEFAULT 0,
  arancel_xp       numeric(12,2) NOT NULL DEFAULT 0,
  neto_vendedor_xp numeric(12,2) NOT NULL,
  creado_en        timestamptz NOT NULL DEFAULT now()
);

-- Indice 1: historial de ventas de un vendedor (mas reciente primero).
CREATE INDEX IF NOT EXISTS idx_mercado_ventas_vendedor
  ON mercado_ventas (vendedor_id, creado_en DESC);

-- Indice 2: historial de compras de un comprador (mas reciente primero).
CREATE INDEX IF NOT EXISTS idx_mercado_ventas_comprador
  ON mercado_ventas (comprador_id, creado_en DESC);

-- ============================================================================
-- 4-bis. CONSUMIBLES: AUTO-PROVISION DE LAS 3 COLUMNAS DEL MERCADO
-- ============================================================================
-- El mercado lee/escribe precio_xp_base y tipo_canje, y la semilla de la
-- seccion 5 inserta precio_xp_base. Esas 3 columnas las declara la 027
-- (db/migrations/027_zonas_marcas.sql, seccion 6) con ADD COLUMN IF NOT
-- EXISTS y su vista consumibles_precio con CREATE OR REPLACE VIEW. Para que
-- esta migracion sea AUTOCONTENIDA (no falle con 42703 si la 027 aun no
-- corriera) se repiten aqui de forma IDEMPOTENTE:
--   - Si la 027 YA esta aplicada (estado actual de Neon, 2026-09-23): este
--     bloque es NO-OP (ADD COLUMN IF NOT EXISTS no hace nada).
--   - Si la 027 se aplicara DESPUES: tambien es NO-OP para ella (usa IF NOT
--     EXISTS) y la vista se crea/reemplaza sin conflicto.
-- Solo se provisionan estas 3 columnas; NO se crean las tablas de la 027
-- (marcas/zonas/patrocinios) ni la vista consumibles_precio.

ALTER TABLE consumibles
  ADD COLUMN IF NOT EXISTS precio_xp_base   NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS precio_xp_actual NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS tipo_canje       TEXT;

-- ============================================================================
-- 5. SEMILLA DE CONSUMIBLES PRODUCIBLES
-- ============================================================================
-- Filas NUEVAS de consumibles (clave UNIQUE), idempotentes con
-- ON CONFLICT (clave) DO NOTHING. tipo_canje = 'producir' las marca como
-- producibles por el usuario; categoria = 'general'; activo = true.
-- Lista de columnas EXPLICITA (ver hallazgo ADR-006 de la cabecera):
--   precio_xp_base ES NOT NULL desde la 027, por eso se siembra con el MISMO
--   valor de precio_xp (si se omitiera, quedaria en su DEFAULT 0 y corromperia
--   la vista consumibles_precio).

INSERT INTO consumibles
  (clave, nombre, descripcion, precio_xp, precio_xp_base, activo, categoria, tipo_canje)
VALUES
  ('prod_artesania', 'Artesania de viajero',
   'Artesania producida por el viajero; se puede ofertar en el mercado de su Casa.',
   40, 40, true, 'general', 'producir'),
  ('prod_cafe', 'Cafe de especialidad',
   'Cafe de especialidad producido por el viajero; se puede ofertar en el mercado de su Casa.',
   60, 60, true, 'general', 'producir'),
  ('prod_souvenir', 'Souvenir ExploraCO',
   'Souvenir ExploraCO producido por el viajero; se puede ofertar en el mercado de su Casa.',
   30, 30, true, 'general', 'producir')
ON CONFLICT (clave) DO NOTHING;

-- ============================================================================
-- VERIFICACION POST-APLICACION (solo lectura; NO se ejecuta dentro de la
-- migracion; NO modifica nada). Copiar y correr sentencia por sentencia.
-- ============================================================================
-- (a) usuarios.mercado_puntos (esperada 1 fila; numeric(12,2); NO NULL;
--     default 0):
-- SELECT column_name, data_type, numeric_precision, numeric_scale,
--        is_nullable, column_default
--   FROM information_schema.columns
--   WHERE table_schema='public' AND table_name='usuarios'
--     AND column_name='mercado_puntos';
--
-- (b) Las 3 tablas nuevas existen (esperadas 3 filas):
-- SELECT tablename FROM pg_tables
--   WHERE schemaname='public'
--     AND tablename IN ('mercado_config','mercado_ofertas','mercado_ventas')
--   ORDER BY tablename;
--
-- (c) mercado_config sembrado (esperadas 3 filas con impuesto y arancel):
-- SELECT casa, impuesto_base_pct, arancel_inter_casa_pct, slots_base,
--        permite_cross_casa, permite_produccion, precio_min, precio_max,
--        duracion_oferta_horas, activo
--   FROM mercado_config ORDER BY casa;
--
-- (d) mercado_ofertas: columnas en el orden del contrato (esperadas 11 filas):
-- SELECT column_name, data_type, is_nullable, column_default
--   FROM information_schema.columns
--   WHERE table_schema='public' AND table_name='mercado_ofertas'
--   ORDER BY ordinal_position;
--
-- (e) mercado_ventas: columnas en el orden del contrato (esperadas 17 filas):
-- SELECT column_name, data_type, is_nullable, column_default
--   FROM information_schema.columns
--   WHERE table_schema='public' AND table_name='mercado_ventas'
--   ORDER BY ordinal_position;
--
-- (f) Indices creados (esperadas 4 filas):
-- SELECT indexname FROM pg_indexes
--   WHERE schemaname='public'
--     AND indexname IN ('idx_mercado_ofertas_casa','idx_mercado_ofertas_vendedor',
--                       'idx_mercado_ventas_vendedor','idx_mercado_ventas_comprador')
--   ORDER BY indexname;
--
-- (g) Consumibles producibles sembrados con base coherente (esperadas 3
--     filas; precio_xp_base = precio_xp y tipo_canje = 'producir'):
-- SELECT clave, nombre, precio_xp, precio_xp_base, categoria, tipo_canje, activo
--   FROM consumibles
--   WHERE clave IN ('prod_artesania','prod_cafe','prod_souvenir')
--   ORDER BY clave;
--
-- (h) Idempotencia global: re-ejecutar TODO el archivo y volver a correr
--     (a)-(g): los conteos y valores deben ser IDENTICOS (no-op funcional).
