-- ============================================================================
-- Migration 040: Gobernanza (3 capas) + Cartas de Territorio + Moneda
--   secundaria "Condor" (CDR) + Marcas capturan spots + Own the Spot
--   multi-media + Hoja de vida del artista
-- Fecha: 2026-09-24
-- Referencias: ADR-002 (ASCII-safe), ADR-003 (Cero Borrado Logico / merge
--   JSONB), ADR-006 (baseline = esquema REAL auditado antes de escribir),
--   ADR-008 (gobernanza e idempotencia de esquema), ADR-018/ADR-035/ADR-053
--   (moneda de XP: usuarios.xp_total numeric(12,2)), ADR-059/ADR-062
--   (gates y grandfathering sobre nivel_visible), ADR-061 (moneda secundaria
--   de ledger interno, excepcion acotada a ADR-018), ADR-063 (gobernanza 3
--   capas), ADR-064 (marcas/patrocinios + hoja de vida), ADR-065 (Own the
--   Spot multi-media, dividendo por DESCUENTO + tope 50%), ADR-066, BUG-021 /
--   BUG-060 (migracion COMPLETA antes del deploy del backend), BUG-026
--   (emojis en SQL nunca como bytes UTF-8 directos).
-- Requiere: usuarios (PK uuid), destinos (PK uuid), marcas/patrocinios
--   (migracion 027, APLICADA en Neon 2026-09-24). Se mantiene un guard
--   defensivo (no bloqueante) para entornos sin la 027.
--
-- QUE HACE (contrato 5.2 / 5.3 / 6.2 de la spec)
--   1. cartas_catalogo + seed idempotente de 18 cartas-gate (4 sets) y 3
--      cartas de evento (es_evento=true).
--   2. usuarios_cartas (acumulacion con upsert), cartas_gates (grandfathering
--      en 10/14/20/25) y cartas_intercambios (ledger anti-farming, espejo de
--      cromo_intercambios, CERO DELETE fisico).
--   3. Moneda secundaria de ledger interno "Condor" (CDR), SIN cripto:
--      moneda_cuentas (saldo cache por usuario), moneda_ledger (append-only,
--      fuente de verdad), moneda_emisiones (lotes no inflacionarios) y
--      moneda_mercado (libro de ordenes propio). NO reemplaza mercado_* ni
--      mercado_puntos (ADR-061 M-5).
--   4. gobernanza_propuestas (4 capas) + gobernanza_votos (peso/voto, dedup
--      por PK), con estados, plazos y activo.
--   5. spot_duenos (dueno GENERAL y por TIPO de medio) + spot_dividendos
--      (dividendo por DESCUENTO del XP del autor, tope <= 50% del XP base).
--   6. marcas.nivel_requerido default 6 + UPDATE de filas existentes; tabla
--      spot_presencia (presencia verificada/patrocinada de marca en un spot).
--   7. usuarios.artista_cv jsonb (bio/ciudad/destacado por merge JSONB). La
--      hoja de vida publica es DERIVADA en lectura; NO se persiste un score.
--   8. Grandfathering (A-1) de cartas_gates sobre nivel_visible =
--      GREATEST(nivel derivado de xp_total, COALESCE(nivel_max,1)).
--
-- CARACTER DE LA MIGRACION
--   ADITIVA: CREATE TABLE / CREATE INDEX / ADD COLUMN / ALTER COLUMN SET
--   DEFAULT / INSERT de semilla / UPDATE acotado. No elimina, no renombra, no
--   toca columnas legacy.
--   IDEMPOTENTE (ADR-008): IF NOT EXISTS en todo DDL; seeds con ON CONFLICT
--   DO NOTHING; UPDATE con IS DISTINCT FROM; los guards condicionales usan
--   bloques DO. Re-ejecutar el archivo COMPLETO es no-op funcional (N veces).
--   ASCII-SAFE (ADR-002): cero bytes > 127, cero backticks.
--   CERO BORRADO FISICO (ADR-003): toda baja es activo=false / cambio de
--   estado; NO hay DELETE en esta migracion.
--   SIN RLS nueva: no hay precedente de policies en db/migrations (coherente
--   con 034/037/039).
--
-- APLICACION
--   Correr este archivo COMPLETO en el editor SQL de Neon (o con
--   scripts/apply_sql_file.js) DESPUES de 034, 037 y 039. Patron
--   BUG-021/BUG-060: archivo COMPLETO en una sola corrida. Re-ejecutarlo es
--   no-op funcional.
--
-- ROLLBACK (emergencia, LOSSY si ya hay datos)
--   DROP TABLE IF EXISTS spot_dividendos, spot_duenos, spot_presencia,
--     gobernanza_votos, gobernanza_propuestas, moneda_mercado,
--     moneda_emisiones, moneda_ledger, moneda_cuentas,
--     cartas_intercambios, cartas_gates, usuarios_cartas, cartas_catalogo;
--   ALTER TABLE usuarios DROP COLUMN IF EXISTS artista_cv;
--   No revierte el default/valores de marcas.nivel_requerido (ADR-064 M-6).
-- ============================================================================

-- ============================================================================
-- 0. PREFLIGHT (SOLO LECTURA; NO forma parte del DDL; NO se ejecuta solo).
-- ============================================================================
-- (0.a) Confirmar que las tablas nuevas aun NO existen. Esperado antes: 0
--       filas; despues: 13 filas.
-- SELECT tablename FROM pg_tables
--   WHERE schemaname='public'
--     AND tablename IN ('cartas_catalogo','usuarios_cartas','cartas_gates',
--       'cartas_intercambios','moneda_cuentas','moneda_ledger',
--       'moneda_emisiones','moneda_mercado','gobernanza_propuestas',
--       'gobernanza_votos','spot_duenos','spot_dividendos','spot_presencia')
--   ORDER BY tablename;
--
-- (0.b) Confirmar marcas/patrocinios (027) y el valor actual del default:
-- SELECT column_name, column_default FROM information_schema.columns
--   WHERE table_schema='public' AND table_name='marcas'
--     AND column_name='nivel_requerido';

-- ============================================================================
-- 1. CARTAS_CATALOGO (Cartas de Territorio + Cartas de Evento)
-- ============================================================================
-- id es un slug ASCII estable (authored, no uuid): las FKs de usuarios_cartas
-- y cartas_intercambios apuntan al slug. nivel_gate NULL = carta de evento
-- (no gatea avance). Reusa el vocabulario de rareza de cromos_catalogo:
-- ('comun','raro','epico','dorado'). M-4: las cartas NO se fusionan con los
-- cromos; "Cartas de Territorio" es el sistema nuevo.

CREATE TABLE IF NOT EXISTS cartas_catalogo (
  id          text PRIMARY KEY,
  nombre      text NOT NULL,
  set_slug    text NOT NULL,
  rareza      varchar(20) NOT NULL
              CONSTRAINT chk_cartas_catalogo_rareza
              CHECK (rareza IN ('comun','raro','epico','dorado')),
  nivel_gate  smallint,
  es_evento   boolean NOT NULL DEFAULT false,
  imagen_url  text,
  activo      boolean NOT NULL DEFAULT true,
  creado_en   timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cartas_catalogo_set
  ON cartas_catalogo (set_slug, activo);

-- Seed idempotente del catalogo: 4 sets de gate (3+4+5+6 = 18 cartas) y 3
-- cartas de evento. ON CONFLICT (id) DO NOTHING: una segunda corrida NO pisa
-- una recalibracion manual del operador (ADR-008). ASCII puro.

INSERT INTO cartas_catalogo (id, nombre, set_slug, rareza, nivel_gate, es_evento) VALUES
  ('ct_mundana_01',    'Rio Magdalena',        'territorio_mundana',    'comun',  10,   false),
  ('ct_mundana_02',    'Valle del Cocora',     'territorio_mundana',    'comun',  10,   false),
  ('ct_mundana_03',    'Costa Caribe',         'territorio_mundana',    'comun',  10,   false),
  ('ct_explorador_01', 'Canon del Chicamocha', 'territorio_explorador', 'raro',   14,   false),
  ('ct_explorador_02', 'Sierra Nevada',        'territorio_explorador', 'raro',   14,   false),
  ('ct_explorador_03', 'Desierto de la Tatacoa','territorio_explorador','comun',  14,   false),
  ('ct_explorador_04', 'Laguna de la Cocha',   'territorio_explorador', 'comun',  14,   false),
  ('ct_cronista_01',   'Ciudad Perdida',       'territorio_cronista',   'epico',  20,   false),
  ('ct_cronista_02',   'Monserrate',           'territorio_cronista',   'raro',   20,   false),
  ('ct_cronista_03',   'Catedral de Sal',      'territorio_cronista',   'raro',   20,   false),
  ('ct_cronista_04',   'Cano Cristales',       'territorio_cronista',   'epico',  20,   false),
  ('ct_cronista_05',   'Barichara',            'territorio_cronista',   'raro',   20,   false),
  ('ct_leyenda_01',    'Macondo',              'territorio_leyenda',    'dorado', 25,   false),
  ('ct_leyenda_02',    'El Dorado',            'territorio_leyenda',    'dorado', 25,   false),
  ('ct_leyenda_03',    'Condor de los Andes',  'territorio_leyenda',    'epico',  25,   false),
  ('ct_leyenda_04',    'Amazonia Profunda',    'territorio_leyenda',    'epico',  25,   false),
  ('ct_leyenda_05',    'Pacifico Ancestral',   'territorio_leyenda',    'epico',  25,   false),
  ('ct_leyenda_06',    'Estrella del Sur',     'territorio_leyenda',    'dorado', 25,   false),
  ('ce_evento_01',     'Entrada a Festival',   'cartas_evento',         'comun',  NULL, true),
  ('ce_evento_02',     'Pase de Concierto',    'cartas_evento',         'raro',   NULL, true),
  ('ce_evento_03',     'Credencial de Feria',  'cartas_evento',         'comun',  NULL, true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 2. USUARIOS_CARTAS + CARTAS_GATES + CARTAS_INTERCAMBIOS
-- ============================================================================
-- usuarios_cartas: acumulacion con upsert (PK usuario_id+carta_id). El
-- backend incrementa cantidad con ON CONFLICT DO UPDATE. activo=false al
-- consumir/intercambiar (CERO DELETE fisico, M-4).
-- cartas_gates: registro de grandfathering por nivel-gate (PK usuario_id+
-- nivel_gate). Una fila = "este usuario ya cruzo este gate; no se bloquea".
-- se siembra en la seccion 8 sobre nivel_visible (A-1).
-- cartas_intercambios: ledger append-only anti-farming (espejo de
-- cromo_intercambios), con flag activo; el limite diario se mide con el
-- indice (emisor_id, creado_en).

CREATE TABLE IF NOT EXISTS usuarios_cartas (
  usuario_id  uuid NOT NULL REFERENCES usuarios(id),
  carta_id    text NOT NULL REFERENCES cartas_catalogo(id),
  cantidad    int NOT NULL DEFAULT 1
              CONSTRAINT chk_usuarios_cartas_cantidad CHECK (cantidad >= 0),
  obtenida_en timestamptz DEFAULT now(),
  activo      boolean NOT NULL DEFAULT true,
  PRIMARY KEY (usuario_id, carta_id)
);

CREATE INDEX IF NOT EXISTS idx_usuarios_cartas_usuario
  ON usuarios_cartas (usuario_id, obtenida_en DESC);

CREATE TABLE IF NOT EXISTS cartas_gates (
  usuario_id   uuid NOT NULL REFERENCES usuarios(id),
  nivel_gate   smallint NOT NULL
               CONSTRAINT chk_cartas_gates_nivel
               CHECK (nivel_gate IN (10,14,20,25)),
  set_slug     text NOT NULL,
  consumido_en timestamptz DEFAULT now(),
  PRIMARY KEY (usuario_id, nivel_gate)
);

CREATE INDEX IF NOT EXISTS idx_cartas_gates_nivel
  ON cartas_gates (nivel_gate);

CREATE TABLE IF NOT EXISTS cartas_intercambios (
  id          bigserial PRIMARY KEY,
  emisor_id   uuid NOT NULL REFERENCES usuarios(id),
  receptor_id uuid NOT NULL REFERENCES usuarios(id),
  carta_id    text NOT NULL REFERENCES cartas_catalogo(id),
  activo      boolean NOT NULL DEFAULT true,
  creado_en   timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cartas_inter_dia
  ON cartas_intercambios (emisor_id, creado_en);

CREATE INDEX IF NOT EXISTS idx_cartas_inter_receptor
  ON cartas_intercambios (receptor_id, creado_en);

-- ============================================================================
-- 3. MONEDA SECUNDARIA "CONDOR" (CDR): CUENTAS + LEDGER + EMISIONES + MERCADO
-- ============================================================================
-- SIN cripto, SIN on-chain, SIN conversion a dinero real (ADR-061).
-- moneda_ledger es la fuente de verdad del saldo (append-only, patron
-- xp_ledger ADR-053). moneda_cuentas es el saldo ACTUAL cacheado por usuario
-- (unique por usuario) para lecturas rapidas; se mantiene por el backend y
-- debe reconciliar con SUM(moneda_ledger.delta). moneda_emisiones acota la
-- emision por lote/temporada (no inflacionaria). moneda_mercado es un libro
-- de ordenes PROPIO, distinto del mercado ADR-055; NO reemplaza mercado_* ni
-- mercado_puntos (M-5).

CREATE TABLE IF NOT EXISTS moneda_cuentas (
  usuario_id     uuid PRIMARY KEY REFERENCES usuarios(id),
  saldo          numeric(12,2) NOT NULL DEFAULT 0,
  actualizado_en timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS moneda_ledger (
  id         bigserial PRIMARY KEY,
  usuario_id uuid NOT NULL REFERENCES usuarios(id),
  delta      numeric(14,2) NOT NULL,
  saldo      numeric(14,2) NOT NULL,
  motivo     text NOT NULL,
  ref_tipo   text,
  ref_id     text,
  creado_en  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_moneda_ledger_usuario_creado
  ON moneda_ledger (usuario_id, creado_en DESC);

CREATE TABLE IF NOT EXISTS moneda_emisiones (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lote      text NOT NULL,
  cantidad  numeric(14,2) NOT NULL
            CONSTRAINT chk_moneda_emisiones_cantidad CHECK (cantidad > 0),
  destino   text NOT NULL,
  creado_en timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_moneda_emisiones_lote
  ON moneda_emisiones (lote);

CREATE TABLE IF NOT EXISTS moneda_mercado (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendedor_id       uuid NOT NULL REFERENCES usuarios(id),
  comprador_id      uuid REFERENCES usuarios(id),
  tipo_orden        varchar(10) NOT NULL DEFAULT 'venta'
                    CONSTRAINT chk_moneda_mercado_tipo
                    CHECK (tipo_orden IN ('compra','venta')),
  cantidad          numeric(14,2) NOT NULL
                    CONSTRAINT chk_moneda_mercado_cantidad CHECK (cantidad > 0),
  cantidad_restante numeric(14,2) NOT NULL
                    CONSTRAINT chk_moneda_mercado_restante CHECK (cantidad_restante >= 0),
  precio_xp         numeric(14,2) NOT NULL
                    CONSTRAINT chk_moneda_mercado_precio CHECK (precio_xp >= 0),
  estado            varchar(20) NOT NULL DEFAULT 'abierta'
                    CONSTRAINT chk_moneda_mercado_estado
                    CHECK (estado IN ('abierta','parcial','ejecutada','cancelada')),
  activo            boolean NOT NULL DEFAULT true,
  creado_en         timestamptz NOT NULL DEFAULT now(),
  expira_en         timestamptz,
  ejecutada_en      timestamptz
);

CREATE INDEX IF NOT EXISTS idx_moneda_mercado_estado
  ON moneda_mercado (estado, creado_en DESC)
  WHERE activo = true;

CREATE INDEX IF NOT EXISTS idx_moneda_mercado_vendedor
  ON moneda_mercado (vendedor_id);

-- ============================================================================
-- 4. GOBERNANZA DE 3 CAPAS (ecosistema / parche / faccion / marca)
-- ============================================================================
-- gobernanza_propuestas: capa (a) ecosistema N33+, capa (b) Parche/Faccion,
-- capa (c) marca. capa_id identifica el parche/faccion/marca concreto (NULL
-- para ecosistema). quorum configurable; cierra_en define el plazo; activo
-- permite archivar sin borrar (CERO DELETE).
-- gobernanza_votos: PK (propuesta_id, usuario_id) = 1 voto por usuario por
-- propuesta (segundo voto -> 23505 -> 409). peso numeric(12,2) para pesos
-- ponderados futuros (default 1).

CREATE TABLE IF NOT EXISTS gobernanza_propuestas (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  capa        varchar(20) NOT NULL
              CONSTRAINT chk_gobernanza_propuestas_capa
              CHECK (capa IN ('ecosistema','parche','faccion','marca')),
  capa_id     text,
  autor_id    uuid NOT NULL REFERENCES usuarios(id),
  titulo      text NOT NULL,
  descripcion text NOT NULL,
  estado      varchar(20) NOT NULL DEFAULT 'abierta'
              CONSTRAINT chk_gobernanza_propuestas_estado
              CHECK (estado IN ('abierta','aprobada','rechazada','archivada')),
  quorum      int NOT NULL DEFAULT 3
              CONSTRAINT chk_gobernanza_propuestas_quorum CHECK (quorum > 0),
  activo      boolean NOT NULL DEFAULT true,
  creado_en   timestamptz NOT NULL DEFAULT now(),
  cierra_en   timestamptz,
  resuelto_en timestamptz
);

CREATE INDEX IF NOT EXISTS idx_gobernanza_propuestas_capa_estado
  ON gobernanza_propuestas (capa, estado, creado_en DESC);

CREATE INDEX IF NOT EXISTS idx_gobernanza_propuestas_autor
  ON gobernanza_propuestas (autor_id);

CREATE TABLE IF NOT EXISTS gobernanza_votos (
  propuesta_id uuid NOT NULL REFERENCES gobernanza_propuestas(id),
  usuario_id   uuid NOT NULL REFERENCES usuarios(id),
  voto         varchar(10) NOT NULL
               CONSTRAINT chk_gobernanza_votos_voto
               CHECK (voto IN ('favor','contra','abstencion')),
  peso         numeric(12,2) NOT NULL DEFAULT 1
               CONSTRAINT chk_gobernanza_votos_peso CHECK (peso > 0),
  activo       boolean NOT NULL DEFAULT true,
  creado_en    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (propuesta_id, usuario_id)
);

CREATE INDEX IF NOT EXISTS idx_gobernanza_votos_usuario
  ON gobernanza_votos (usuario_id);

-- ============================================================================
-- 5. OWN THE SPOT MULTI-MEDIA (duenos + dividendos por DESCUENTO)
-- ============================================================================
-- spot_duenos es CACHE (PK destino_id+tipo_medio): el calculo canonico es
-- bajo demanda (ADR-014/ADR-065). tipo_medio admite 'general' + los tipos de
-- medio. El dividendo se DESCUENTA del XP del AUTOR (A-2 CERRADO); la columna
-- monto es el dividendo calculado (10%) y monto_descontado el descuento
-- efectivo (puede ser menor si el tope agregado lo recorta). El CHECK
-- garantiza monto_descontado <= 50% del XP base por fila; el tope AGREGADO
-- por interaccion (regalias 20% + dividendo 10% <= 50% del XP base) se
-- garantiza en el backend porque un CHECK de SQL no ve filas hermanas. El
-- indice unico por (fuente_interaccion_id, beneficiario_id, tipo_medio) hace
-- el pago idempotente por interaccion.

CREATE TABLE IF NOT EXISTS spot_duenos (
  destino_id   uuid NOT NULL REFERENCES destinos(id),
  tipo_medio   varchar(10) NOT NULL
               CONSTRAINT chk_spot_duenos_tipo
               CHECK (tipo_medio IN ('general','foto','video','audio',
                                     'escrito','texto')),
  usuario_id   uuid NOT NULL REFERENCES usuarios(id),
  votos        int NOT NULL DEFAULT 0
               CONSTRAINT chk_spot_duenos_votos CHECK (votos >= 0),
  calculado_en timestamptz DEFAULT now(),
  activo       boolean NOT NULL DEFAULT true,
  PRIMARY KEY (destino_id, tipo_medio)
);

CREATE INDEX IF NOT EXISTS idx_spot_duenos_usuario
  ON spot_duenos (usuario_id);

CREATE TABLE IF NOT EXISTS spot_dividendos (
  id                   bigserial PRIMARY KEY,
  destino_id           uuid NOT NULL REFERENCES destinos(id),
  beneficiario_id      uuid NOT NULL REFERENCES usuarios(id),
  tipo_medio           varchar(10) NOT NULL,
  fuente_interaccion_id bigint,
  xp_bruto_base        numeric(12,2) NOT NULL DEFAULT 0
                       CONSTRAINT chk_spot_dividendos_base CHECK (xp_bruto_base >= 0),
  monto                numeric(12,2) NOT NULL
                       CONSTRAINT chk_spot_dividendos_monto CHECK (monto >= 0),
  monto_descontado     numeric(12,2) NOT NULL DEFAULT 0,
  creado_en            timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_spot_dividendos_tope
    CHECK (monto_descontado >= 0 AND monto_descontado <= xp_bruto_base * 0.50)
);

CREATE INDEX IF NOT EXISTS idx_spot_dividendos_beneficiario
  ON spot_dividendos (beneficiario_id, creado_en DESC);

CREATE UNIQUE INDEX IF NOT EXISTS uq_spot_dividendos_interaccion
  ON spot_dividendos (fuente_interaccion_id, beneficiario_id, tipo_medio)
  WHERE fuente_interaccion_id IS NOT NULL;

-- ============================================================================
-- 6. MARCAS CAPTURAN SPOTS (nivel_requerido 6 + presencia verificada)
-- ============================================================================
-- M-6 CERRADO: el gate de Marca lee marcas.nivel_requerido; la columna manda
-- y la migracion la deja en 6 (default + UPDATE de filas existentes). El
-- grandfathering de EDICION lo aplica el backend (una marca ya creada se
-- puede editar/reactivar aunque el dueno haya bajado de nivel).
-- patrocinios.tipo_objetivo ya acepta 'spot' (la 027 NO le puso CHECK): no
-- requiere DDL aqui. spot_presencia modela el badge de presencia verificada.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='marcas'
      AND column_name='nivel_requerido'
  ) THEN
    UPDATE marcas SET nivel_requerido = 6
      WHERE nivel_requerido IS DISTINCT FROM 6;
    ALTER TABLE marcas ALTER COLUMN nivel_requerido SET DEFAULT 6;
    RAISE NOTICE 'migracion 040: marcas.nivel_requerido default y filas = 6';
  ELSE
    RAISE NOTICE 'migracion 040: marcas.nivel_requerido ausente (027 no aplicada); se omite';
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.marcas') IS NULL
     OR to_regclass('public.patrocinios') IS NULL THEN
    RAISE NOTICE 'migracion 040: marcas/patrocinios ausentes (027 no aplicada); se omite spot_presencia';
    RETURN;
  END IF;

  CREATE TABLE IF NOT EXISTS spot_presencia (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    marca_id      uuid NOT NULL REFERENCES marcas(id),
    destino_id    uuid NOT NULL REFERENCES destinos(id),
    patrocinio_id uuid REFERENCES patrocinios(id),
    estado        varchar(20) NOT NULL DEFAULT 'pendiente'
                  CONSTRAINT chk_spot_presencia_estado
                  CHECK (estado IN ('pendiente','verificada','rechazada')),
    activo        boolean NOT NULL DEFAULT true,
    creado_en     timestamptz NOT NULL DEFAULT now()
  );

  CREATE UNIQUE INDEX IF NOT EXISTS uq_spot_presencia_marca_destino
    ON spot_presencia (marca_id, destino_id)
    WHERE activo = true;

  CREATE INDEX IF NOT EXISTS idx_spot_presencia_destino
    ON spot_presencia (destino_id)
    WHERE activo = true;

  RAISE NOTICE 'migracion 040: spot_presencia lista';
END $$;

-- ============================================================================
-- 7. HOJA DE VIDA DEL ARTISTA (metadatos por merge JSONB; sin scores)
-- ============================================================================
-- Solo se persisten los metadatos editables (bio/ciudad/destacado); las obras,
-- vocaciones, logros, contratos y patrocinios se DERIVAN en lectura (5.4 /
-- ADR-064). NO se persiste un score de reputacion (ADR-018/ADR-053).

ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS artista_cv jsonb NOT NULL DEFAULT '{}'::jsonb;

-- ============================================================================
-- 8. GRANDFATHERING DE CARTAS_GATES SOBRE nivel_visible (A-1 CERRADO)
-- ============================================================================
-- nivel_visible = GREATEST(nivel derivado de xp_total con la tabla canonica
-- de 40 umbrales, COALESCE(nivel_max,1)). Se siembra una fila por gate ya
-- superado para que quien llego al nivel y luego gasto XP NO se bloquee.
-- ON CONFLICT (usuario_id, nivel_gate) DO NOTHING: idempotente; una segunda
-- corrida no duplica ni reescribe. La tabla de umbrales es la de la 033.

INSERT INTO cartas_gates (usuario_id, nivel_gate, set_slug)
SELECT u.id, g.nivel_gate, g.set_slug
FROM usuarios u
CROSS JOIN (VALUES
  (10, 'territorio_mundana'),
  (14, 'territorio_explorador'),
  (20, 'territorio_cronista'),
  (25, 'territorio_leyenda')
) AS g(nivel_gate, set_slug)
WHERE GREATEST(
        (CASE
          WHEN u.xp_total >= 100000 THEN 40
          WHEN u.xp_total >= 95450  THEN 39
          WHEN u.xp_total >= 90950  THEN 38
          WHEN u.xp_total >= 86600  THEN 37
          WHEN u.xp_total >= 82300  THEN 36
          WHEN u.xp_total >= 78150  THEN 35
          WHEN u.xp_total >= 74050  THEN 34
          WHEN u.xp_total >= 70050  THEN 33
          WHEN u.xp_total >= 66150  THEN 32
          WHEN u.xp_total >= 62400  THEN 31
          WHEN u.xp_total >= 58700  THEN 30
          WHEN u.xp_total >= 55050  THEN 29
          WHEN u.xp_total >= 51600  THEN 28
          WHEN u.xp_total >= 48200  THEN 27
          WHEN u.xp_total >= 44900  THEN 26
          WHEN u.xp_total >= 41750  THEN 25
          WHEN u.xp_total >= 38650  THEN 24
          WHEN u.xp_total >= 35700  THEN 23
          WHEN u.xp_total >= 32800  THEN 22
          WHEN u.xp_total >= 30050  THEN 21
          WHEN u.xp_total >= 27400  THEN 20
          WHEN u.xp_total >= 24850  THEN 19
          WHEN u.xp_total >= 22450  THEN 18
          WHEN u.xp_total >= 20100  THEN 17
          WHEN u.xp_total >= 17900  THEN 16
          WHEN u.xp_total >= 15800  THEN 15
          WHEN u.xp_total >= 13850  THEN 14
          WHEN u.xp_total >= 12000  THEN 13
          WHEN u.xp_total >= 10250  THEN 12
          WHEN u.xp_total >= 8650   THEN 11
          WHEN u.xp_total >= 7150   THEN 10
          WHEN u.xp_total >= 5800   THEN 9
          WHEN u.xp_total >= 4550   THEN 8
          WHEN u.xp_total >= 3450   THEN 7
          WHEN u.xp_total >= 2500   THEN 6
          WHEN u.xp_total >= 1650   THEN 5
          WHEN u.xp_total >= 1000   THEN 4
          WHEN u.xp_total >= 500    THEN 3
          WHEN u.xp_total >= 150    THEN 2
          WHEN u.xp_total >= 0      THEN 1
          ELSE 1
        END),
        COALESCE(u.nivel_max, 1)
      ) >= g.nivel_gate
ON CONFLICT (usuario_id, nivel_gate) DO NOTHING;

-- ============================================================================
-- VERIFICACION POST-APLICACION (solo lectura; NO se ejecuta dentro de la
-- migracion; NO modifica nada). Copiar y correr sentencia por sentencia.
-- ============================================================================
-- (a) Las 13 tablas nuevas existen (esperadas 13 filas):
-- SELECT tablename FROM pg_tables
--   WHERE schemaname='public'
--     AND tablename IN ('cartas_catalogo','usuarios_cartas','cartas_gates',
--       'cartas_intercambios','moneda_cuentas','moneda_ledger',
--       'moneda_emisiones','moneda_mercado','gobernanza_propuestas',
--       'gobernanza_votos','spot_duenos','spot_dividendos','spot_presencia')
--   ORDER BY tablename;
--
-- (b) Catalogo de cartas: 21 filas (18 de gate + 3 de evento):
-- SELECT set_slug, es_evento, COUNT(*) AS n FROM cartas_catalogo
--   GROUP BY set_slug, es_evento ORDER BY set_slug;
--
-- (c) marcas.nivel_requerido default = 6 (esperada 1 fila):
-- SELECT column_name, column_default FROM information_schema.columns
--   WHERE table_schema='public' AND table_name='marcas'
--     AND column_name='nivel_requerido';
--
-- (d) usuarios.artista_cv (esperada 1 fila; jsonb; NOT NULL; default {}):
-- SELECT column_name, data_type, is_nullable, column_default
--   FROM information_schema.columns
--   WHERE table_schema='public' AND table_name='usuarios'
--     AND column_name='artista_cv';
--
-- (e) Grandfathering sembrado (esperadas >= 0 filas; conteo por gate):
-- SELECT nivel_gate, COUNT(*) AS n FROM cartas_gates
--   GROUP BY nivel_gate ORDER BY nivel_gate;
--
-- (f) Tope del dividendo (esperada 1 fila con la definicion que incluye
--     xp_bruto_base):
-- SELECT conname, pg_get_constraintdef(oid) AS def
--   FROM pg_constraint
--   WHERE conrelid='public.spot_dividendos'::regclass
--     AND conname='chk_spot_dividendos_tope';
--
-- (g) Idempotencia global: re-ejecutar TODO el archivo y volver a correr
--     (a)-(f): los conteos y valores deben ser IDENTICOS (no-op funcional).
