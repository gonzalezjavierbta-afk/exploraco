-- ============================================================================
-- Migration 041: Cartas de Territorio -- mercado P2P de cartas pagado con XP
--   (cartas_ofertas + cartas_ventas) + Tithe de Parche (pandillas.tithe_pct)
-- Fecha: 2026-09-24
-- Referencias: ADR-002 (ASCII-safe), ADR-003 (Cero Borrado Logico), ADR-006
--   (baseline = esquema REAL auditado antes de escribir), ADR-008 (gobernanza
--   e idempotencia de esquema / numeracion consecutiva), ADR-018/ADR-035/
--   ADR-053 (moneda unica de XP: usuarios.xp_total numeric(12,2)), ADR-055
--   (mercado), ADR-062 (cartas coleccionables como activo de mercado), ADR-066
--   (Tithe de Parche 1%-10% parametrizable), BUG-021/BUG-060 (patron: migracion
--   COMPLETA antes del deploy del backend), BUG-026 (emojis en SQL nunca como
--   bytes UTF-8 directos).
-- Requiere: 034, 037, 039 y 040 APLICADAS en Neon (estado 2026-09-24). Sus
--   objetos usados aqui: usuarios (PK uuid), cartas_catalogo (PK text, de la
--   040) y pandillas (PK uuid, de la 010). NO reutiliza mercado_ofertas: esa
--   tabla tiene FK a consumibles y CHECK de origen ('inventario'/'produccion'),
--   que NO aplican a cartas (el activo es una carta, no un consumible).
--
-- QUE HACE
--   1. cartas_ofertas: listings P2P de CARTAS pagados con XP (precio_xp), con
--      cantidad / cantidad_restante, estado (abierta/parcial/cerrada/cancelada)
--      y borrado logico via activo. Mercado PROPIO, separado de mercado_ofertas
--      (ADR-055 / ADR-062) y del libro de ordenes de la moneda Condor.
--   2. cartas_ventas: ledger APPEND-ONLY de ventas (espejo de mercado_ventas de
--      la 034), con precio_unitario y subtotal en XP. Registro inmutable para
--      auditoria; no hay DELETE.
--   3. pandillas.tithe_pct: porcentaje del Tithe de Parche (0 a 10), con guard
--      information_schema.columns + CHECK idempotente por pg_constraint (patron
--      019/026/028). El Tithe se registra en xp_ledger
--      (accion='tithe_parche', es_exento=true) y NO crea moneda (ADR-066).
--
-- CARACTER DE LA MIGRACION
--   ADITIVA: solo CREATE TABLE / CREATE INDEX / ADD COLUMN / ADD CONSTRAINT.
--   No elimina, no renombra y no toca columnas legacy.
--   IDEMPOTENTE (ADR-008): CREATE TABLE IF NOT EXISTS; CREATE INDEX IF NOT
--   EXISTS; ADD COLUMN guardada; CHECK creado dentro de un DO que consulta
--   pg_constraint. Re-ejecutar el archivo COMPLETO es no-op funcional (N veces).
--   ASCII-SAFE (ADR-002): cero bytes > 127, cero tildes, cero ene con tilde,
--   cero emojis, cero escapes unicode, cero backticks.
--   CERO BORRADO FISICO (ADR-003): no hay DELETE / DROP / TRUNCATE; toda baja
--   de una oferta es cambio de estado o activo=false.
--   SIN RLS nueva: no hay precedente de policies en db/migrations (coherente
--   con 034/039/040). SIN TRIGGERS / SIN FUNCIONES.
--
-- CONTRATO DE ESQUEMA CONGELADO
--   Los nombres de tabla y de columna de este archivo son el contrato contra el
--   que se escribira el backend. NO renombrar ni reordenar columnas una vez
--   aplicada la migracion.
--
-- HALLAZGO DEL SCHEMA REAL (ADR-006; verificado en Neon el 2026-09-24 antes de
-- escribir):
--   - usuarios: PK uuid (003+); xp_total numeric(12,2) (021).
--   - cartas_catalogo (040): id text PK; rareza varchar(20); activo boolean.
--   - pandillas (010): id uuid PK; fundador_id uuid; nombre; descripcion;
--     ciudad_base; fama_total; activo; creado_en. NO tenia tithe_pct.
--   - cartas_ofertas / cartas_ventas NO existian antes de esta migracion.
--
-- APLICACION
--   Correr este archivo COMPLETO en el editor SQL de Neon (o con
--   scripts/apply_sql_file.js) DESPUES de 034, 037, 039 y 040. Patron
--   BUG-021/BUG-060: archivo COMPLETO en una sola corrida. Re-ejecutarlo es
--   no-op funcional.
--
-- ROLLBACK (emergencia, LOSSY si ya hay datos)
--   DROP TABLE IF EXISTS cartas_ventas, cartas_ofertas;
--   ALTER TABLE pandillas DROP COLUMN IF EXISTS tithe_pct;
--   Perderia el ledger de ventas y las ofertas; no va en el flujo normal.
-- ============================================================================

-- ============================================================================
-- 0. PREFLIGHT (SOLO LECTURA; NO forma parte del DDL; NO se ejecuta solo).
--    Copiar y correr sentencia por sentencia ANTES de aplicar la 041.
-- ============================================================================
-- (0.a) Confirmar que las 2 tablas nuevas aun NO existen. Esperado antes: 0
--       filas; despues: 2 filas.
-- SELECT tablename FROM pg_tables
--   WHERE schemaname='public'
--     AND tablename IN ('cartas_ofertas','cartas_ventas')
--   ORDER BY tablename;
--
-- (0.b) Confirmar los predecesores logicos de las FK. Esperadas 3 filas:
-- SELECT table_name FROM information_schema.tables
--   WHERE table_schema='public'
--     AND table_name IN ('usuarios','cartas_catalogo','pandillas')
--   ORDER BY table_name;
--
-- (0.c) Confirmar que pandillas.tithe_pct aun NO existe. Esperado antes: 0
--       filas; despues: 1 fila.
-- SELECT column_name, data_type, numeric_precision, numeric_scale, is_nullable,
--        column_default
--   FROM information_schema.columns
--   WHERE table_schema='public' AND table_name='pandillas'
--     AND column_name='tithe_pct';

-- ============================================================================
-- 1. CARTAS_OFERTAS: LISTINGS P2P DE CARTAS PAGADOS CON XP
-- ============================================================================
-- Mercado PROPIO de cartas, separado de mercado_ofertas (que referencia
-- consumibles y tiene CHECK de origen). cantidad es el tamano original;
-- cantidad_restante baja con cada venta y llega a 0 cuando la oferta se agota
-- (CHECK >= 0). estado permite cerrar/cancelar la oferta sin borrarla (Cero
-- Borrado Logico, ADR-003). activo es el borrado logico. precio_xp es la
-- moneda unica (XP decimal, ADR-018/ADR-035).
--   FK vendedor_id -> usuarios(id): el vendedor es el dueno de las cartas.
--   FK carta_id -> cartas_catalogo(id): la carta debe existir en el catalogo.
--   expira_en / ejecutada_en NULL: la oferta puede no expirar y se marca la
--     fecha de ejecucion cuando se completa.

CREATE TABLE IF NOT EXISTS cartas_ofertas (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendedor_id       uuid NOT NULL REFERENCES usuarios(id),
  carta_id          text NOT NULL REFERENCES cartas_catalogo(id),
  cantidad          int NOT NULL
                    CONSTRAINT chk_cartas_ofertas_cantidad CHECK (cantidad > 0),
  cantidad_restante int NOT NULL
                    CONSTRAINT chk_cartas_ofertas_restante
                    CHECK (cantidad_restante >= 0),
  precio_xp         numeric(12,2) NOT NULL
                    CONSTRAINT chk_cartas_ofertas_precio CHECK (precio_xp > 0),
  estado            varchar(20) NOT NULL DEFAULT 'abierta'
                    CONSTRAINT chk_cartas_ofertas_estado
                    CHECK (estado IN ('abierta','parcial','cerrada','cancelada')),
  activo            boolean NOT NULL DEFAULT true,
  creado_en         timestamptz NOT NULL DEFAULT NOW(),
  expira_en         timestamptz,
  ejecutada_en      timestamptz
);

-- Indice 1: ofertas de un vendedor (panel "mis ofertas").
CREATE INDEX IF NOT EXISTS idx_cartas_ofertas_vendedor
  ON cartas_ofertas (vendedor_id);

-- Indice 2: tablero general por estado, mas reciente primero.
CREATE INDEX IF NOT EXISTS idx_cartas_ofertas_estado
  ON cartas_ofertas (estado, creado_en DESC);

-- Indice 3 (parcial): tablero de ofertas VIVAS (activas y aun comprables).
CREATE INDEX IF NOT EXISTS idx_cartas_ofertas_activas
  ON cartas_ofertas (estado, creado_en DESC)
  WHERE activo = true AND estado IN ('abierta','parcial');

-- ============================================================================
-- 2. CARTAS_VENTAS: LEDGER APPEND-ONLY DE VENTAS
-- ============================================================================
-- Registro inmutable de cada venta para auditoria y para reconstruir el
-- mercado de cartas (espejo de mercado_ventas de la 034). Guarda
-- precio_unitario y subtotal en XP. oferta_id es NULLABLE: si la oferta se
-- retirara, la venta historica se conserva (nunca se pierde el ledger).
-- Sin DELETE: el ledger no se mutila (Cero Borrado Logico, ADR-003).

CREATE TABLE IF NOT EXISTS cartas_ventas (
  id              bigserial PRIMARY KEY,
  oferta_id       uuid REFERENCES cartas_ofertas(id),
  vendedor_id     uuid NOT NULL,
  comprador_id    uuid NOT NULL,
  carta_id        text NOT NULL,
  cantidad        int NOT NULL,
  precio_unitario numeric(12,2) NOT NULL,
  subtotal        numeric(12,2) NOT NULL,
  creado_en       timestamptz NOT NULL DEFAULT NOW()
);

-- Indice 1: historial de ventas de un vendedor (mas reciente primero).
CREATE INDEX IF NOT EXISTS idx_cartas_ventas_vendedor
  ON cartas_ventas (vendedor_id, creado_en DESC);

-- Indice 2: historial de compras de un comprador (mas reciente primero).
CREATE INDEX IF NOT EXISTS idx_cartas_ventas_comprador
  ON cartas_ventas (comprador_id, creado_en DESC);

-- ============================================================================
-- 3. PANDILLAS.TITHE_PCT: PORCENTAJE DEL TITHE DE PARCHE (0 a 10)
-- ============================================================================
-- El Tithe (1%-10%, parametrizable) se descuenta del XP de los miembros de un
-- Parche y alimenta la tesoreria (parche_upgrades.puntos_invertidos) via
-- xp_ledger (accion='tithe_parche', es_exento=true); NO crea moneda (ADR-066).
-- Default 0 = Tithe desactivado. Guard information_schema.columns para la
-- columna y guard pg_constraint para el CHECK (patron 019/026/028): re-ejecutar
-- es no-op.

DO $$
BEGIN
  IF to_regclass('public.pandillas') IS NULL THEN
    RAISE NOTICE 'migracion 041: pandillas ausente; se omite tithe_pct';
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='pandillas'
      AND column_name='tithe_pct'
  ) THEN
    ALTER TABLE pandillas
      ADD COLUMN tithe_pct numeric(5,2) NOT NULL DEFAULT 0;
    RAISE NOTICE 'migracion 041: pandillas.tithe_pct creada';
  ELSE
    RAISE NOTICE 'migracion 041: pandillas.tithe_pct ya existe; no-op';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'pandillas_tithe_pct_check'
      AND conrelid = 'public.pandillas'::regclass
  ) THEN
    ALTER TABLE pandillas
      ADD CONSTRAINT pandillas_tithe_pct_check
      CHECK (tithe_pct >= 0 AND tithe_pct <= 10);
    RAISE NOTICE 'migracion 041: CHECK pandillas.tithe_pct creado';
  ELSE
    RAISE NOTICE 'migracion 041: CHECK pandillas.tithe_pct ya existe; no-op';
  END IF;
END $$;

-- ============================================================================
-- VERIFICACION POST-APLICACION (solo lectura; NO se ejecuta dentro de la
-- migracion; NO modifica nada). Copiar y correr sentencia por sentencia.
-- ============================================================================
-- (a) Las 2 tablas nuevas existen (esperadas 2 filas):
-- SELECT tablename FROM pg_tables
--   WHERE schemaname='public'
--     AND tablename IN ('cartas_ofertas','cartas_ventas')
--   ORDER BY tablename;
--
-- (b) cartas_ofertas: columnas en el orden del contrato (esperadas 11 filas):
-- SELECT column_name, data_type, is_nullable, column_default
--   FROM information_schema.columns
--   WHERE table_schema='public' AND table_name='cartas_ofertas'
--   ORDER BY ordinal_position;
--
-- (c) cartas_ventas: columnas en el orden del contrato (esperadas 9 filas):
-- SELECT column_name, data_type, is_nullable, column_default
--   FROM information_schema.columns
--   WHERE table_schema='public' AND table_name='cartas_ventas'
--   ORDER BY ordinal_position;
--
-- (d) Indices creados (esperadas 5 filas):
-- SELECT indexname FROM pg_indexes
--   WHERE schemaname='public'
--     AND indexname IN ('idx_cartas_ofertas_vendedor','idx_cartas_ofertas_estado',
--                       'idx_cartas_ofertas_activas','idx_cartas_ventas_vendedor',
--                       'idx_cartas_ventas_comprador')
--   ORDER BY indexname;
--
-- (e) Constraints CHECK de cartas_ofertas (esperadas 4 filas):
-- SELECT conname, pg_get_constraintdef(oid) AS def
--   FROM pg_constraint
--   WHERE conrelid='public.cartas_ofertas'::regclass AND contype='c'
--   ORDER BY conname;
--
-- (f) pandillas.tithe_pct (esperada 1 fila; numeric(5,2); NO NULL;
--     default 0) y su CHECK (1 fila con el rango 0..10):
-- SELECT column_name, data_type, numeric_precision, numeric_scale,
--        is_nullable, column_default
--   FROM information_schema.columns
--   WHERE table_schema='public' AND table_name='pandillas'
--     AND column_name='tithe_pct';
-- SELECT conname, pg_get_constraintdef(oid) AS def
--   FROM pg_constraint
--   WHERE conrelid='public.pandillas'::regclass
--     AND conname='pandillas_tithe_pct_check';
--
-- (g) Idempotencia global: re-ejecutar TODO el archivo y volver a correr
--     (a)-(f): los conteos y valores deben ser IDENTICOS (no-op funcional).
