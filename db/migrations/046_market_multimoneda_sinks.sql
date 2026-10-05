-- 046_market_multimoneda_sinks.sql
-- Enmienda 3 a ADR-061 (moneda de 1 a 3) + Capa 1 sumideros (seccion 1) +
-- ranking compuesto (seccion 4). Transcripcion literal del bloque
-- "PLAN DE MIGRACION COMPLETO" de ADR-086 (DECISIONS.md:5521-5678).
--
-- ADITIVA e IDEMPOTENTE (ADR-008): solo ADD COLUMN / CREATE TABLE / CREATE
-- INDEX / DO $$ + semillas ON CONFLICT DO NOTHING.
-- Prohibido DELETE (ADR-003). Prohibido UPDATE del historico del ledger.
-- ASCII-safe: 0 bytes > 127 y 0 backticks en este fichero (ADR-002, BUG-026).
--
-- FORWARD-ONLY (ADR-086 seccion 3, PUNTO DE NO RETORNO). La re-clave de
-- moneda_cuentas NO es reversible sin DELETE, y DELETE esta prohibido por
-- ADR-003 y ADR-008. Cualquier error posterior se corrige con una migracion
-- 047+, NUNCA con un rollback de la 046. Lo unico permitido es NEUTRALIZAR
-- (dejar la columna y parar de debitarla).
--
-- VENTANA CERO (decision de despliegue de ADR-086 seccion 3): esta migracion
-- y los parches B1-B4 de api/interacciones.js y api/usuarios.js van EN EL
-- MISMO COMMIT y EN EL MISMO DESPLIEGUE. B1 es un error de SINTAXIS SQL que
-- solo aparece al ejecutar la consulta (ON CONFLICT (usuario_id) deja de ser
-- legal cuando la PK pasa a (usuario_id, moneda)) y B2/B4 son fallos SILENCIOSOS
-- que ningun health-check detecta. Migracion primero y codigo despues deja una
-- ventana con el mercado caido y la verificacion de saldo mintiendo.
--
-- RLS (ADR-087): DESACTIVADO y NO se activa aqui. Ningun api/*.js lee estas
-- tablas: la economia vive dentro de api/interacciones.js y api/usuarios.js,
-- que ya existen, asi que no hay superficie expuesta que proteger y anadir RLS
-- solo anadiria un segundo camino de escritura que bypassing. Medido en Neon el
-- 2026-10-05: schema_migrations, moneda_cuentas, moneda_ledger,
-- gamificacion_config y usuarios tienen todas relrowsecurity = false.
-- 8/8 endpoints serverless agotados (AGENTS.md 3.7): 0 endpoints nuevos, 0
-- funciones nuevas. Todo lo que hace esta migracion se consume desde codigo ya
-- desplegado.
--
-- Ejecutar con: node scripts/apply_sql_file.js db/migrations/046_market_multimoneda_sinks.sql
-- Puerta del predecesor: la 045 esta aplicada (schema_migrations.numero = 45,
-- resultado = 'aplicada', verificada el 2026-10-05).

-- (0) Contadores de gasto en usuarios (B1: los sinks NUNCA tocan xp_total).
--     xp_gastado_sinks es un CONTADOR DE GASTO, no un saldo: solo crece, luego
--     XP_DISPONIBLE = xp_total - xp_gastado_sinks es monotono NO CRECIENTE y
--     el nivel (calcularNivel(xp_total), usuarios.js:184) es MONOTONO.
ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS xp_gastado_sinks numeric(12,2) NOT NULL DEFAULT 0;

-- (1) Columna discriminante en las 4 tablas. El DEFAULT fija la moneda
--     historica sin tocar una sola fila existente: la moneda unica de
--     ADR-061 Enmienda 2 era Condor, luego 'condor' es el unico valor
--     consistente con lo ya escrito. El vocabulario es el MISMO dominio
--     cerrado de 3 valores que ya usa casas_cofre.casa (024:160): no se
--     introduce ninguna taxonomia nueva.
ALTER TABLE moneda_cuentas
  ADD COLUMN IF NOT EXISTS moneda varchar(10) NOT NULL DEFAULT 'condor'
    CONSTRAINT chk_moneda_cuentas_moneda
    CHECK (moneda IN ('condor','jaguar','delfin'));

ALTER TABLE moneda_ledger
  ADD COLUMN IF NOT EXISTS moneda varchar(10) NOT NULL DEFAULT 'condor'
    CONSTRAINT chk_moneda_ledger_moneda
    CHECK (moneda IN ('condor','jaguar','delfin'));

ALTER TABLE moneda_emisiones
  ADD COLUMN IF NOT EXISTS moneda varchar(10) NOT NULL DEFAULT 'condor'
    CONSTRAINT chk_moneda_emisiones_moneda
    CHECK (moneda IN ('condor','jaguar','delfin'));

ALTER TABLE moneda_mercado
  ADD COLUMN IF NOT EXISTS moneda varchar(10) NOT NULL DEFAULT 'condor'
    CONSTRAINT chk_moneda_mercado_moneda
    CHECK (moneda IN ('condor','jaguar','delfin'));

-- (2) Re-clave de PRIMARY KEY: (usuario_id) -> (usuario_id, moneda).
--     Es el UNICO cambio de clave del ADR y por el existe esta parte.
--     DROP CONSTRAINT + ADD CONSTRAINT es DDL sobre el catalogo: NO borra
--     datos, luego cumple ADR-003 por construccion.
--
--     CONTROL DE ERRORES REESCRITO (defecto corregido 2026-10-05). Este
--     bloque es UNA sentencia, luego es atomico: o aplica entero o ABORTA
--     entero, y su unico modo de fallo visible es lanzar. Por eso NO lleva
--     seccion EXCEPTION y el IF es cerrado (ELSE que aborta). Auditoria de
--     los dos WHEN que tenia antes, uno por uno:
--
--     a) WHEN duplicate_table / SQLSTATE 42P07: INALCANZABLE. Solo lo lanzan
--        CREATE TABLE/SCHEMA/INDEX y este bloque no crea nada. Era codigo
--        muerto: ni siquiera podia dispararse.
--     b) WHEN unique_violation / SQLSTATE 23505: INALCANZABLE aqui. Medido
--        en Neon el 2026-10-05: moneda_cuentas tiene 0 filas y su PK es
--        (usuario_id), que ya implica la unicidad de (usuario_id, moneda).
--        Exigiria una PK previa sobre otras columnas, y 040:209 creo la
--        tabla con usuario_id uuid PRIMARY KEY.
--     c) Lo que hacia un EXCEPTION era PEOR que no hacer nada: al capturar,
--        PL/pgSQL hace ROLLBACK de la SUBTRANSACCION (se pierde el DROP),
--        corre el handler y el bloque TERMINA CON EXITO. El runner
--        (apply_sql_file.js:345-355) solo registra 'fallida' si una
--        sentencia lanza, luego el NOTICE + exito marcaba la 046 como
--        'aplicada' con la PK vieja mientras usuarios.js e interacciones.js
--        ya emiten ON CONFLICT (usuario_id, moneda): 42P10 permanente y
--        mercado caido sin ninguna senal de error. Un fallo silencioso que
--        se presenta como exito es peor que un fallo ruidoso. Propagar el
--        error es lo unico seguro.
--     d) Lo que SI puede fallar aqui, y ahora ABORTA con su SQLSTATE (los dos
--        medidos contra el motor el 2026-10-05, no deducidos):
--        42P16 invalid_table_definition, "multiple primary keys for table
--        moneda_cuentas are not allowed", si la PK existente tiene otro
--        nombre (el DROP IF EXISTS no la toca y PostgreSQL no admite dos PK);
--        y 23505 unique_violation, "could not create unique index
--        moneda_cuentas_pkey", si el par tuviera duplicados. La 046 es
--        FORWARD-ONLY (ADR-086 seccion 3): un estado medio de la clave no se
--        corrige con DELETE, que ADR-003 prohibe, luego abortar es la unica
--        salida segura y deja el reintento limpio. El operador ve 'fallida'
--        con el SQLSTATE y detiene el despliegue, que es la VENTANA CERO de
--        la cabecera.
--     Idempotencia intacta (ADR-008): si la PK ya es (usuario_id, moneda) el
--     cuerpo la DROPea y la vuelve a anadir, con el mismo resultado.
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'moneda_cuentas'::regclass AND contype = 'p'
  ) THEN
    ALTER TABLE moneda_cuentas
      DROP CONSTRAINT IF EXISTS moneda_cuentas_pkey;
    ALTER TABLE moneda_cuentas
      ADD CONSTRAINT moneda_cuentas_pkey PRIMARY KEY (usuario_id, moneda);
  ELSE
    RAISE EXCEPTION
      '046: moneda_cuentas NO tiene PRIMARY KEY. La re-clave a (usuario_id, moneda) es el presupuesto de ON CONFLICT (usuario_id, moneda) en usuarios.js e interacciones.js; sin ella la migracion quedaria aplicada y el mercado caeria con 42P10 permanente. Se aborta en vez de continuar.';
  END IF;
END $$;

-- (3) Redisenio del indice del ledger. El indice viejo (usuario_id,
--     creado_en DESC) NO es prefijo del nuevo, asi que se CONSERVA (no se
--     borra, coherente con ADR-003) y se anade el nuevo, que es el que
--     sirve la lectura canonica SUM(delta) WHERE (usuario_id, moneda).
CREATE INDEX IF NOT EXISTS idx_moneda_ledger_usuario_moneda_creado
  ON moneda_ledger (usuario_id, moneda, creado_en DESC);
CREATE INDEX IF NOT EXISTS idx_moneda_mercado_estado_moneda
  ON moneda_mercado (estado, creado_en DESC)
  WHERE activo = true;

-- (4) Las 2 tablas de sinks (seccion 1). Aditivas e idempotentes.
CREATE TABLE IF NOT EXISTS sink_acciones (
  clave          varchar(40) PRIMARY KEY,
  etiqueta       text NOT NULL,
  costo_base_xp  numeric(12,2) NOT NULL CHECK (costo_base_xp > 0),
  slot_max       int NOT NULL DEFAULT 40 CHECK (slot_max > 0),
  slot_max_activos int NOT NULL DEFAULT 40 CHECK (slot_max_activos > 0),
  activo         boolean NOT NULL DEFAULT true,
  creado_en      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ck_sink_acciones_topes CHECK (slot_max_activos <= slot_max)
);

CREATE TABLE IF NOT EXISTS sink_slots (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id     uuid NOT NULL REFERENCES usuarios(id),
  clave_accion   varchar(40) NOT NULL REFERENCES sink_acciones(clave),
  ref_id         text,
  costo_pagado   numeric(12,2) NOT NULL CHECK (costo_pagado >= 0),
  alpha_aplicado numeric(6,4) NOT NULL DEFAULT 0.20,
  gamma_aplicado numeric(6,4) NOT NULL DEFAULT 2.00,
  slot_index     int NOT NULL,          -- k HISTORICO congelado (B5)
  activo         boolean NOT NULL DEFAULT true,
  creado_en      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_sink_slot UNIQUE (usuario_id, clave_accion, ref_id, creado_en)
);

-- Indice de CAPACIDAD (slots activos) e indice HISTORICO (el COUNT(*) del
-- precio). Son 2 porque responden a 2 preguntas distintas y el precio usa
-- el historico (seccion 1, cierre del ciclo compra/baja).
CREATE INDEX IF NOT EXISTS idx_sink_slots_usuario
  ON sink_slots(usuario_id, clave_accion) WHERE activo = true;
CREATE INDEX IF NOT EXISTS idx_sink_slots_usuario_hist
  ON sink_slots(usuario_id, clave_accion);

-- (5) Semilla de las 4 acciones con sus Costo_Base (seccion 1). Los 4 ratios
--     salen del criterio "rango de valor percibido": foto < evento < album <
--     portada. slot_max_activos va por debajo de slot_max (~60-75%) porque la
--     capacidad se recupera al dar de baja un slot y el historico no (sec. 1-bis.3):
--     un tope unico los fusionaria y el usuario quedaria bloqueado al ciclar.
--     Idempotente por ON CONFLICT DO NOTHING: re-ejecutar NO
--     reescribe una recalibracion manual del operador.
--
-- DECISION DEL OPERADOR (ratificada, NO es un supuesto del arquitecto):
-- los 4 valores de slot_max_activos de abajo -- 25 / 12 / 10 / 3 -- los fijo
-- el operador. El arquitecto solo cablea que se siembren aqui y que el CHECK
-- ck_sink_acciones_topes los haga coherentes con slot_max (25<=40,
-- 12<=20, 10<=15, 3<=5). La razon de que los dos topes no se fusionen es
-- tecnica y esta en sec. 1-bis.3; los NUMEROS concretos son del operador.
INSERT INTO sink_acciones (clave, etiqueta, costo_base_xp, slot_max, slot_max_activos) VALUES
  ('foto_galeria',    'Foto extra en galeria publica', 320.00, 40, 25),
  ('destacar_evento', 'Destacar evento',              560.00, 20, 12),
  ('album_slot',      'Slot adicional de album',      640.00, 15, 10),
  ('portada_destino', 'Portada de destino',           800.00,  5,  3)
ON CONFLICT (clave) DO NOTHING;

-- (6) Rampa del ranking compuesto: arranca en 0.0, que reproduce
--     EXACTAMENTE el ranking actual (Score = xp_total), y sube sola a 1.0
--     en 30 dias por elapsed/NOMBRE, sin cron y sin deploy. Vive en la tabla
--     que YA existe (031:164-169), luego 0 tablas y 0 endpoints nuevos.
INSERT INTO gamificacion_config (clave, valor, descripcion) VALUES
  ('ranking_score_gamma', 0.0000,
   'Peso del ranking compuesto: 0.0 = XP puro (actual), 1.0 = score completo')
ON CONFLICT (clave) DO NOTHING;

-- (6-bis) CONTADOR DE DIAS DE LA RAMPA. valor es numeric(12,4) (031:166):
--     NO admite una fecha, luego el reloj de la rampa es un CONTADOR, no un
--     timestamp. El reloj es actualizado_en de ESTA MISMA fila (escrita una vez
--     por el ON CONFLICT, y nunca tocada por el escritor): por eso el contador
--     se auto-limita y re-ejecutar el script NO duplica la rampa. El escritor
--     ejecutable esta en la seccion 4 ("EL ESCRITOR DE LA RAMPA").
INSERT INTO gamificacion_config (clave, valor, descripcion) VALUES
  ('ranking_score_gamma_inicio', 0.0000,
   'Dias transcurridos de la rampa (0-30); lo avanza el escritor idempotente')
ON CONFLICT (clave) DO NOTHING;

-- (7) Tope GLOBAL de saldo que entra al ranking. Decision del operador:
--     GLOBAL por usuario (no por casa), porque un tope por casa permitiria
--     multiplicar el bonus x3, que es el acaparamiento que la bonding curve
--     de la Capa 2 existe para frenar. No es una constante de codigo: es
--     dato, y por eso se lee de aqui.
INSERT INTO gamificacion_config (clave, valor, descripcion) VALUES
  ('ranking_saldo_tope', 2000.0000,
   'Tope global por usuario del termino de saldo en el score (no por casa)')
ON CONFLICT (clave) DO NOTHING;
