-- ============================================================================
-- Migration 039: Gig Economy P2P + Soberania de Parche
--   contratos_p2p (escrow de recompensa en XP) + parche_upgrades (upgrades
--   territoriales con activo_hasta)
-- Fecha: 2026-09-24
-- Referencias: ADR-002 (ASCII-safe), ADR-003 (Cero Borrado Logico / merge
--   JSONB), ADR-006 (baseline = esquema REAL auditado antes de escribir),
--   ADR-008 (gobernanza e idempotencia de esquema), ADR-018/ADR-035/ADR-053
--   (moneda unica: usuarios.xp_total numeric(12,2)), ADR-066 (contrato de la
--   Gig Economy; M-1 CERRADO: recompensa_xp y puntos_invertidos son
--   numeric(12,2), NUNCA int), BUG-021/BUG-060 (patron: migracion COMPLETA
--   antes del deploy del backend), BUG-026 (emojis en SQL nunca como bytes
--   UTF-8 directos).
-- Requiere: usuarios (PK uuid), destinos (PK uuid) y la migracion 010
--   (pandillas, PK uuid). La 039 se aplica DESPUES de 034 y 037 y ANTES de
--   la 040 (ordenen de despliegue 6.3 de la spec).
--
-- QUE HACE
--   1. contratos_p2p: encargos peer-to-peer con recompensa en XP decimal
--      (escrow inmovilizado al crear, liberado al completar, devuelto al
--      cancelar). Estados y tipo de encargo con CHECK.
--   2. parche_upgrades: inversiones de tesoreria de un Parche (pandillas) en
--      upgrades territoriales con ventana activo_hasta.
--   3. Indices de lectura (empleador / contratado / abiertos) y de vigencia
--      territorial por ciudad.
--   4. Guard DEFENSIVO (no bloqueante) de la FK a pandillas: si pandillas no
--      existiera en algun entorno, la tabla se crea SIN FK y se emite NOTICE
--      en vez de fallar con 42P01 (contrato 6.1.3 de la spec).
--
-- CARACTER DE LA MIGRACION
--   ADITIVA: solo CREATE TABLE / CREATE INDEX / ADD CONSTRAINT. No elimina,
--   no renombra y no toca objetos previos.
--   IDEMPOTENTE (ADR-008): CREATE TABLE IF NOT EXISTS; CREATE INDEX IF NOT
--   EXISTS; la FK se agrega con guard pg_constraint. Re-ejecutar el archivo
--   COMPLETO es no-op funcional (N veces).
--   ASCII-SAFE (ADR-002): cero bytes > 127, cero tildes, cero ene con tilde,
--   cero emojis, cero escapes unicode, cero backticks.
--   SIN DELETE / DROP / TRUNCATE (Cero Borrado Logico, ADR-003): toda baja de
--   un contrato es cambio de estado (cancelado/disputa); no hay borrado.
--   SIN RLS / SIN TRIGGERS / SIN FUNCIONES: coherente con 034/037.
--
-- SEMANTICA DEL CONTRATO (contrato de esquema CONGELADO)
--   - tipo_encargo: CHECK IN ('auditoria_wayfarer','curaduria_multimedia',
--     'resena_zona'). No requiere tabla aparte: el catalogo lo fija el CHECK.
--   - recompensa_xp numeric(12,2) > 0 (M-1 CERRADO): el escrow se deduce del
--     XP del empleador (usuarios.xp_total numeric(12,2)); NUNCA int.
--   - estado: 'abierto' (creado, con escrow), 'en_proceso' (aceptado),
--     'completado' (escrow liberado al contratado), 'cancelado' (escrow
--     devuelto), 'disputa' (bloqueado hasta resolucion).
--   - expira_en NOT NULL: un contrato abierto vencido no es aceptable; el
--     backend lo trata como cancelado de facto.
--   - parche_upgrades.puntos_invertidos numeric(12,2) > 0 (M-1 CERRADO): la
--     tesoreria del Parche se acumula via xp_ledger (accion='tithe_parche',
--     es_exento=true) y se gasta aqui. NO crea moneda nueva.
--   - El Control Territorial NO se persiste (se calcula bajo demanda, 5.5);
--     parche_upgrades solo registra la inversion y su vigencia.
--
-- APLICACION
--   Correr este archivo COMPLETO en el editor SQL de Neon (o con
--   scripts/apply_sql_file.js) DESPUES de 034 y 037. Patron BUG-021/BUG-060:
--   archivo COMPLETO en una sola corrida. Re-ejecutarlo es no-op funcional.
--
-- ROLLBACK (emergencia, LOSSY si ya hay contratos/upgrades)
--   DROP TABLE IF EXISTS parche_upgrades;
--   DROP TABLE IF EXISTS contratos_p2p;
--   No va en el flujo normal y pierde el historial de escrow/upgrades.
-- ============================================================================

-- ============================================================================
-- 0. PREFLIGHT (SOLO LECTURA; NO forma parte del DDL; NO se ejecuta solo).
--    Copiar y correr sentencia por sentencia ANTES de aplicar la 039.
-- ============================================================================
-- (0.a) Confirmar que las 2 tablas nuevas aun NO existen. Esperado antes:
--       0 filas; despues: 2 filas.
-- SELECT tablename FROM pg_tables
--   WHERE schemaname='public'
--     AND tablename IN ('contratos_p2p','parche_upgrades')
--   ORDER BY tablename;
--
-- (0.b) Confirmar los predecesores logicos de las FK. Esperadas 3 filas:
-- SELECT table_name FROM information_schema.tables
--   WHERE table_schema='public'
--     AND table_name IN ('usuarios','destinos','pandillas')
--   ORDER BY table_name;

-- ============================================================================
-- 1. CONTRATOS_P2P (Gig Economy P2P con escrow de XP)
-- ============================================================================
-- empleador_id es quien inmoviliza la recompensa; contratado_id es NULL
-- mientras el contrato esta 'abierto'. destino_id es opcional (hay encargos
-- de zona). Las FK a usuarios/destinos usan el id uuid real (verificado).
-- El CHECK de recompensa_xp usa numeric(12,2): ADR-066 M-1 CERRADO.
-- actualizado_en se anade para auditoria de transiciones (aditivo; el
-- contrato de la spec 5.3 lo lista).

CREATE TABLE IF NOT EXISTS contratos_p2p (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empleador_id    uuid NOT NULL REFERENCES usuarios(id),
  contratado_id   uuid REFERENCES usuarios(id),
  destino_id      uuid REFERENCES destinos(id),
  tipo_encargo    varchar(50) NOT NULL
                  CONSTRAINT chk_contratos_p2p_tipo
                  CHECK (tipo_encargo IN ('auditoria_wayfarer',
                                          'curaduria_multimedia',
                                          'resena_zona')),
  recompensa_xp   numeric(12,2) NOT NULL
                  CONSTRAINT chk_contratos_p2p_recompensa
                  CHECK (recompensa_xp > 0),
  descripcion     text NOT NULL,
  estado          varchar(20) NOT NULL DEFAULT 'abierto'
                  CONSTRAINT chk_contratos_p2p_estado
                  CHECK (estado IN ('abierto','en_proceso','completado',
                                    'cancelado','disputa')),
  expira_en       timestamptz NOT NULL,
  creado_en       timestamptz DEFAULT now(),
  actualizado_en  timestamptz DEFAULT now()
);

-- Indice 1: contratos creados por un empleador (panel "mis contratos").
CREATE INDEX IF NOT EXISTS idx_contratos_p2p_empleador
  ON contratos_p2p (empleador_id, creado_en DESC);

-- Indice 2: contratos asignados a un contratado.
CREATE INDEX IF NOT EXISTS idx_contratos_p2p_contratado
  ON contratos_p2p (contratado_id, creado_en DESC);

-- Indice 3: parcial; tablero de contratos ABIERTOS (los unicos aceptables).
CREATE INDEX IF NOT EXISTS idx_contratos_p2p_abiertos
  ON contratos_p2p (estado, expira_en)
  WHERE estado = 'abierto';

-- ============================================================================
-- 2. PARCHE_UPGRADES (inversion de tesoreria de un Parche, con vigencia)
-- ============================================================================
-- parche_id se declara SIN FK inline para permitir el guard defensivo de la
-- seccion 2-bis (degradacion sin bloqueo si pandillas faltara). punto de
-- inversion y tipo con CHECK; activo_hasta define la ventana del buff.
-- Se declara SIN FK inline y se agrega en 2-bis SOLO si pandillas existe.

CREATE TABLE IF NOT EXISTS parche_upgrades (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parche_id         uuid NOT NULL,
  ciudad_slug       varchar(100) NOT NULL,
  tipo_upgrade      varchar(50) NOT NULL
                    CONSTRAINT chk_parche_upgrades_tipo
                    CHECK (tipo_upgrade IN ('buff_xp_zona',
                                            'descuento_comercial',
                                            'aura_neon',
                                            'escudo_territorial')),
  puntos_invertidos numeric(12,2) NOT NULL
                    CONSTRAINT chk_parche_upgrades_puntos
                    CHECK (puntos_invertidos > 0),
  activo_hasta      timestamptz NOT NULL,
  creado_en         timestamptz DEFAULT now()
);

-- Indice de vigencia territorial: upgrades vigentes por ciudad.
CREATE INDEX IF NOT EXISTS idx_parche_upgrades_ciudad_vigencia
  ON parche_upgrades (ciudad_slug, activo_hasta);

-- ============================================================================
-- 2-bis. GUARD DEFENSIVO DE LA FK A PANDILLAS (contrato 6.1.3)
-- ============================================================================
-- Si pandillas no existiera (entorno sin la 010), se emite NOTICE y se omite
-- la FK (degradacion, no bloqueo). Si existe, se agrega la FK de forma
-- idempotente (guard pg_constraint). En Neon 2026-09-24 pandillas EXISTE.

DO $$
BEGIN
  IF to_regclass('public.pandillas') IS NULL THEN
    RAISE NOTICE 'migracion 039: pandillas no existe; parche_upgrades sin FK (degradacion)';
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'parche_upgrades_parche_id_fkey'
      AND conrelid = 'public.parche_upgrades'::regclass
  ) THEN
    ALTER TABLE parche_upgrades
      ADD CONSTRAINT parche_upgrades_parche_id_fkey
      FOREIGN KEY (parche_id) REFERENCES pandillas(id);
    RAISE NOTICE 'migracion 039: FK parche_upgrades.parche_id -> pandillas creada';
  ELSE
    RAISE NOTICE 'migracion 039: FK parche_upgrades.parche_id ya existe; no-op';
  END IF;
END $$;

-- ============================================================================
-- VERIFICACION POST-APLICACION (solo lectura; NO se ejecuta dentro de la
-- migracion; NO modifica nada). Copiar y correr sentencia por sentencia.
-- ============================================================================
-- (a) Las 2 tablas nuevas existen (esperadas 2 filas):
-- SELECT tablename FROM pg_tables
--   WHERE schemaname='public'
--     AND tablename IN ('contratos_p2p','parche_upgrades')
--   ORDER BY tablename;
--
-- (b) contratos_p2p: columnas en el orden del contrato (esperadas 10 filas):
-- SELECT column_name, data_type, is_nullable, column_default
--   FROM information_schema.columns
--   WHERE table_schema='public' AND table_name='contratos_p2p'
--   ORDER BY ordinal_position;
--
-- (c) parche_upgrades: columnas en el orden del contrato (esperadas 7 filas):
-- SELECT column_name, data_type, is_nullable, column_default
--   FROM information_schema.columns
--   WHERE table_schema='public' AND table_name='parche_upgrades'
--   ORDER BY ordinal_position;
--
-- (d) Tipo NUMERIC de la moneda de los contratos (M-1; esperadas 2 filas con
--     numeric_precision=12 y numeric_scale=2):
-- SELECT table_name, column_name, numeric_precision, numeric_scale
--   FROM information_schema.columns
--   WHERE table_schema='public'
--     AND (table_name, column_name) IN
--         (('contratos_p2p','recompensa_xp'),
--          ('parche_upgrades','puntos_invertidos'))
--   ORDER BY table_name;
--
-- (e) Indices creados (esperadas 4 filas):
-- SELECT indexname FROM pg_indexes
--   WHERE schemaname='public'
--     AND indexname IN ('idx_contratos_p2p_empleador',
--                       'idx_contratos_p2p_contratado',
--                       'idx_contratos_p2p_abiertos',
--                       'idx_parche_upgrades_ciudad_vigencia')
--   ORDER BY indexname;
--
-- (f) FK de parche_upgrades a pandillas (esperada 1 fila; si 0, pandillas
--     no existia y el guard la omitio):
-- SELECT conname, pg_get_constraintdef(oid) AS def
--   FROM pg_constraint
--   WHERE conrelid='public.parche_upgrades'::regclass AND contype='f';
--
-- (g) Idempotencia global: re-ejecutar TODO el archivo y volver a correr
--     (a)-(f): los conteos y valores deben ser IDENTICOS (no-op funcional).
