-- ============================================================================
-- Migration 058: Marcas Self-Service - multi-marca por usuario, premio semanal
--   por formula dinamica y canje en tienda identificado por
--   billeteras.codigo_publico (sin QR en v1).
-- Fecha: 2026-10-27
-- Referencias: ADR-107 (FUENTE DE VERDAD de este DDL, decisiones D1-D16),
--   ADR-002 (ASCII-safe: cero bytes > 127), ADR-003 (cero borrado logico),
--   ADR-006 (baseline = archivo real, nunca lo citado), ADR-008 (idempotencia),
--   ADR-028 (catalogo administrable sin CHECK de dominio), ADR-059/ADR-064 M-6
--   (acotados por ADR-107: su supuesto "1 marca por usuario" deja de valer),
--   BUG-021 / BUG-060 (aplicar migracion COMPLETA antes del deploy).
-- Requiere: 027 (marcas, consumibles.marca_id/tipo_canje, vista
--   consumibles_precio), 031 (gamificacion_config, xp_ledger), 042 (billeteras
--   con codigo_publico), 046 (usuarios.xp_gastado_sinks, patron de sink).
--
-- PROPOSITO
--   1. Preparar marcas para operar VARIAS marcas por usuario: columnas de
--      promocion y caida del UNIQUE (usuario_id).
--   2. Introducir el PUNTERO UNICO de marca activa (usuarios.marca_activa_id)
--      con FK COMPUESTA contra marcas(id, usuario_id): el puntero solo puede
--      apuntar a una marca DEL MISMO dueno.
--   3. Dar precio en pesos (precio_cop) y elegibilidad de premio
--      (premio_semanal) al catalogo de consumibles.
--   4. Crear la trazabilidad append-only de fusiones de recetas
--      (fusiones_marca) y de entregas en mostrador / premio semanal
--      (canjes_tienda).
--   5. Sembrar los 9 tunables numericos del modulo y los 3 consumibles
--      ANCESTRAL con su precio COP real (dato del operador, D13).
--
-- CARACTER DE LA MIGRACION
--   ADITIVA E IDEMPOTENTE (ADR-008) salvo UNA operacion de catalogo declarada
--   en el ADR: DROP CONSTRAINT marcas_usuario_id_key. Esa caida NO borra
--   ninguna fila (ADR-003 se cumple por construccion: es DDL de catalogo y el
--   puntero del paso 2 reubica la marca de cada usuario).
--   - ADITIVA: ALTER TABLE ADD COLUMN IF NOT EXISTS / bloques DO con
--     ADD CONSTRAINT guardados por pg_constraint / CREATE TABLE IF NOT EXISTS /
--     CREATE INDEX IF NOT EXISTS / INSERT ... ON CONFLICT DO NOTHING / un UPDATE
--     de backfill acotado por IS NULL.
--   - CERO borrados de filas, CERO sentencias destructivas de tabla, cero
--     TRUNCATE, cero renombrado de objetos. El unico DROP admitido es
--     DROP CONSTRAINT IF EXISTS marcas_usuario_id_key (paso 2.e), que no
--     destruye datos: solo retira una restriccion de catalogo.
--   - IDEMPOTENTE: segunda corrida = no-op funcional. ADD COLUMN IF NOT EXISTS
--     y DROP CONSTRAINT IF EXISTS lo son por si mismos; los ADD CONSTRAINT van
--     guardados contra pg_constraint porque Postgres NO tiene
--     ADD CONSTRAINT IF NOT EXISTS (precedente: 031:255-260).
--   - ASCII-SAFE (ADR-002): cero bytes > 127, cero tildes, cero ene con tilde,
--     cero emojis, cero escapes unicode, cero backticks. Los terminos que en
--     castellano llevarian tilde se escriben sin ella.
--
-- PRECONDICIONES
--   P-1. Numeracion: db/migrations/ tiene como mayor fichero
--        057_consumibles_faccion_nivel4.sql y 052 no existe (hueco conocido).
--        Debe confirmarse contra schema_migrations que el ultimo numero
--        aplicado es 57 antes de aplicar este 58 (lo comprueba
--        scripts/verify_058_precheck.js).
--   P-2. Tablas base presentes: public.usuarios, public.marcas,
--        public.consumibles, public.gamificacion_config y public.billeteras.
--        El bloque (0) lo valida con to_regclass y aborta con un mensaje
--        legible (patron de guardas de 031/038) en vez de un 42P01 seco.
--   P-3. Ledger schema_migrations creado por la 045: sin el, el runner
--        scripts/apply_sql_file.js RECHAZA cualquier fichero posterior al 45.
--   P-4. NO existe todavia ninguna fila con numero = 58 en schema_migrations.
--   P-5. La marca ANCESTRAL NO la crea esta migracion (D14/D16: no hay usuario
--        dueno en tiempo de migracion y el alta es un ACTO con coste). Los 3
--        consumibles se siembran con marca_id = NULL y el paso 7 del plan D16
--        los vincula despues.
--
-- ORDEN OBLIGATORIO DENTRO DE LA SECCION (2)
--   2.b (columna) -> 2.c (backfill) -> 2.d (FK compuesta) -> 2.e (DROP UNIQUE).
--   Invertir 2.c y 2.e vuelve el backfill NO DETERMINISTA: con dos marcas ya
--   posibles por usuario, el UPDATE elegiria una al azar.
--
-- TRAMPAS DOCUMENTADAS (ADR-107, no "arreglar")
--   T-1. La FK del puntero NO admite la accion referencial SET NULL: pondria a
--        NULL TODAS las columnas referenciantes, incluida usuarios.id
--        (NOT NULL), y la sentencia fallaria. Se queda en NO ACTION, coherente
--        con ADR-003: una marca se desactiva (activa=false), no se borra.
--   T-2. Al caer el UNIQUE, el INSERT ... ON CONFLICT (usuario_id) de
--        api/usuarios.js (marca_activar) deja de compilar en runtime: 42P10.
--        Esta migracion NO lo arregla: el codigo es de @backend-dev (ADR-107
--        D2) y debe desplegarse ANTES de que el modulo se use.
--   T-3. gamificacion_config.valor es numeric(12,4): TODO tunable nuevo tiene
--        que ser un NUMERO. El ambito ('global') vive en marcas.premios_config
--        jsonb, nunca en esta tabla.
--   T-4. precio_cop = 0 significa "sin precio en pesos declarado": el tope en
--        COP se omite y solo muerde el techo en XP-equivalente (D4).
--   T-5. La semilla de la seccion (7) es ON CONFLICT (clave) DO NOTHING
--        (literal del ADR-107 D1). Re-ejecutar NO pisa un precio ya ajustado a
--        mano: un cambio de precio es una operacion nueva y versionada
--        (db/cleanups/), no un efecto colateral de aplicar la migracion otra
--        vez. Lo mismo vale para la seccion (6) y las recalibraciones.
--
-- VERIFICACION PREVIA (read-only)
--   node scripts/verify_058_precheck.js --dry-run   (estatico, sin red)
--   node scripts/verify_058_precheck.js             (contra Neon via .env.local)
--   Consultas minimas equivalentes:
--     SELECT numero, resultado FROM schema_migrations ORDER BY numero DESC LIMIT 3;
--     SELECT COUNT(*) FROM marcas;
--     SELECT clave, precio_xp, precio_cop, marca_id FROM consumibles
--      WHERE clave LIKE 'ancestral_%';
--
-- VERIFICACION POSTERIOR
--   SELECT numero, resultado FROM schema_migrations WHERE numero = 58;
--   SELECT column_name FROM information_schema.columns
--    WHERE table_name = 'marcas' AND column_name IN ('estado_promo','premios_config');
--   SELECT column_name FROM information_schema.columns
--    WHERE table_name = 'usuarios' AND column_name = 'marca_activa_id';
--   SELECT COUNT(*) FROM pg_constraint WHERE conname = 'marcas_usuario_id_key';
--     -> debe dar 0.
--   SELECT COUNT(*) FROM fusiones_marca; SELECT COUNT(*) FROM canjes_tienda;
--   SELECT clave, valor FROM gamificacion_config WHERE clave LIKE 'marca_%';
--     -> 9 filas.
--   SELECT clave, precio_cop, marca_id, tipo_canje, premio_semanal
--     FROM consumibles WHERE clave LIKE 'ancestral_%';
--     -> 3 filas, marca_id NULL, tipo_canje 'tienda', premio_semanal true.
--
-- ROLLBACK (DOCUMENTADO, NO EJECUTADO - requiere aprobacion del operador)
--   ADR-003 prohibe borrar datos, luego el rollback NO es simetrico y solo es
--   seguro INMEDIATAMENTE despues de aplicar, con las tablas nuevas vacias y
--   sin marcas duplicadas por usuario. Si alguna de esas condiciones no se
--   cumple, la correccion es una migracion NUEVA hacia adelante, no un
--   rollback. Orden inverso, cada paso con su comprobacion:
--     1. Codigo: revertir primero las ramas de @backend-dev que usan
--        usuarios.marca_activa_id (si no, 42703 en cada lectura).
--     2. Datos: exportar fusiones_marca y canjes_tienda (pg_dump de esas dos
--        tablas) antes de tocar su DDL. Son append-only y su contenido es
--        evidencia, no cache.
--     3. Retirar las tablas canjes_tienda y fusiones_marca SOLO si estan
--        vacias (DDL destructivo: no se ejecuta desde esta migracion ni sin
--        confirmacion del operador).
--     4. Retirar las 9 filas de gamificacion_config con prefijo marca_ SOLO
--        tras confirmar que nadie las recalibro. El borrado de filas esta
--        prohibido dentro de esta migracion (ADR-003).
--     5. Retirar las 3 filas ancestral_* SOLO si ninguna fila de
--        compra_consumibles, consumo_consumibles ni canjes_tienda las
--        referencia.
--     6. Retirar la FK usuarios_marca_activa_fk y luego la columna
--        usuarios.marca_activa_id.
--     7. Retirar el constraint marcas_id_usuario_id_key.
--     8. Re-crear el UNIQUE (usuario_id) sobre marcas. FALLA si algun usuario
--        tiene 2 marcas: en ese caso el rollback es imposible sin borrar
--        marcas y hay que escalar al operador.
--     9. Retirar las columnas marcas.premios_config y marcas.estado_promo.
--    10. Retirar las columnas consumibles.premio_semanal y
--        consumibles.precio_cop.
--    11. Registrar la reversion como migracion NUEVA con su fila en
--        schema_migrations. Nunca editar la fila ya escrita del 58: el runner
--        no sobrescribe checksums y esa fila es la unica evidencia.
--
-- CLAVES DE CALIBRACION (ADR-107 D4/D13, NO son medidas)
--   marca_premio_tasa_cop_por_xp = 12.0000 es un PARAMETRO DE CALIBRACION
--   contable, no una tasa de cambio. Los COP son reales (dato del operador);
--   la equivalencia XP es un convenio interno. Toda respuesta que la use debe
--   declarar calibrado: false.
-- ============================================================================

-- (0) GUARDAS DE PRECONDICION (to_regclass, patron 031/038) -------------------
--     No altera ninguna seccion del DDL de D1: solo convierte un 42P01 seco en
--     un mensaje que dice QUE falta y de QUE migracion viene.
DO $m058p$
DECLARE
  faltantes text[] := ARRAY[]::text[];
BEGIN
  IF to_regclass('public.usuarios') IS NULL THEN
    faltantes := faltantes || 'public.usuarios'::text;
  END IF;
  IF to_regclass('public.marcas') IS NULL THEN
    faltantes := faltantes || 'public.marcas (027)'::text;
  END IF;
  IF to_regclass('public.consumibles') IS NULL THEN
    faltantes := faltantes || 'public.consumibles (010)'::text;
  END IF;
  IF to_regclass('public.gamificacion_config') IS NULL THEN
    faltantes := faltantes || 'public.gamificacion_config (031)'::text;
  END IF;
  IF to_regclass('public.billeteras') IS NULL THEN
    faltantes := faltantes || 'public.billeteras (042)'::text;
  END IF;
  IF array_length(faltantes, 1) IS NOT NULL THEN
    RAISE EXCEPTION 'MIGRACION 058: pre-requisitos ausentes: %',
      array_to_string(faltantes, ', ');
  END IF;
END $m058p$;

-- (1) MARCA: promocion y receta del premio -----------------------------------
ALTER TABLE marcas
  ADD COLUMN IF NOT EXISTS estado_promo boolean NOT NULL DEFAULT false;
ALTER TABLE marcas
  ADD COLUMN IF NOT EXISTS premios_config jsonb NOT NULL DEFAULT '{}'::jsonb;

DO $m058a$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                 WHERE conrelid = 'public.marcas'::regclass
                   AND conname  = 'chk_marcas_premios_config_obj') THEN
    ALTER TABLE marcas ADD CONSTRAINT chk_marcas_premios_config_obj
      CHECK (jsonb_typeof(premios_config) = 'object');
  END IF;
END $m058a$;

-- (2) RESOLUCION DE LA MARCA ACTIVA (D2) ------------------------------------
-- 2.a Unicidad de (id, usuario_id): la necesita la FK compuesta del paso 2.d.
DO $m058b$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                 WHERE conrelid = 'public.marcas'::regclass
                   AND conname  = 'marcas_id_usuario_id_key') THEN
    ALTER TABLE marcas ADD CONSTRAINT marcas_id_usuario_id_key
      UNIQUE (id, usuario_id);
  END IF;
END $m058b$;

-- 2.b Puntero unico: cual de MIS marcas estoy operando.
ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS marca_activa_id uuid;

-- 2.c BACKFILL DETERMINISTA: se ejecuta ANTES del DROP del UNIQUE
--     (aqui todavia hay como maximo 1 marca por usuario, luego el UPDATE
--     no puede elegir entre dos). Idempotente por el IS NULL.
UPDATE usuarios u
   SET marca_activa_id = m.id
  FROM marcas m
 WHERE m.usuario_id = u.id
   AND u.marca_activa_id IS NULL;

-- 2.d FK COMPUESTA: el puntero solo puede apuntar a una marca DEL MISMO dueno.
--     OJO, TRAMPA DOCUMENTADA: esta FK NO admite la accion referencial
--     SET NULL, porque pondria a NULL TODAS las columnas referenciantes,
--     incluida usuarios.id (NOT NULL) y la sentencia fallaria. Debe quedarse
--     en NO ACTION, que es ademas lo coherente con cero borrado logico
--     (ADR-003): una marca se desactiva (activa=false), no se borra.
DO $m058c$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                 WHERE conrelid = 'public.usuarios'::regclass
                   AND conname  = 'usuarios_marca_activa_fk') THEN
    ALTER TABLE usuarios ADD CONSTRAINT usuarios_marca_activa_fk
      FOREIGN KEY (marca_activa_id, id) REFERENCES marcas (id, usuario_id)
      DEFERRABLE INITIALLY IMMEDIATE;
  END IF;
END $m058c$;

-- 2.e CAIDA DEL UNIQUE (usuario_id). Idempotente por IF EXISTS.
ALTER TABLE marcas DROP CONSTRAINT IF EXISTS marcas_usuario_id_key;

-- 2.f El indice unico que sostenia el UNIQUE desaparece con el; se sustituye
--     por un indice NO unico: las tres consultas de D2 filtran por usuario_id.
CREATE INDEX IF NOT EXISTS idx_marcas_usuario ON marcas (usuario_id);

-- (3) CATALOGO: precio en pesos y elegibilidad del premio --------------------
--     precio_cop = 0 significa "sin precio en pesos declarado": el techo en
--     COP se omite y solo muerde el techo en XP-equivalente (D4).
ALTER TABLE consumibles
  ADD COLUMN IF NOT EXISTS precio_cop numeric(12,2) NOT NULL DEFAULT 0;
ALTER TABLE consumibles
  ADD COLUMN IF NOT EXISTS premio_semanal boolean NOT NULL DEFAULT false;

DO $m058d$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                 WHERE conrelid = 'public.consumibles'::regclass
                   AND conname  = 'chk_consumibles_precio_cop') THEN
    ALTER TABLE consumibles ADD CONSTRAINT chk_consumibles_precio_cop
      CHECK (precio_cop >= 0);
  END IF;
END $m058d$;

-- (4) TRAZABILIDAD DE RECETAS / FUSIONES (metricas) --------------------------
--     APPEND-ONLY: no se actualiza ninguna fila salvo el paso a 'aplicada'.
--     receta_clave es texto libre a proposito (catalogo administrable sin
--     CHECK de dominio, ADR-028): el vocabulario de recetas no esta cerrado y
--     no debe cerrarse desde una migracion.
CREATE TABLE IF NOT EXISTS fusiones_marca (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id         uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  marca_id           uuid NOT NULL REFERENCES marcas(id) ON DELETE NO ACTION,
  receta_clave       varchar(60) NOT NULL,
  entradas           jsonb NOT NULL DEFAULT '[]'::jsonb,
  salidas            jsonb NOT NULL DEFAULT '{}'::jsonb,
  xp_consumido       numeric(12,2) NOT NULL DEFAULT 0,
  estado             text NOT NULL DEFAULT 'registrada',
  clave_idempotencia text,
  contexto           jsonb NOT NULL DEFAULT '{}'::jsonb,
  creado_en          timestamptz NOT NULL DEFAULT now(),
  aplicado_en        timestamptz,
  CONSTRAINT chk_fusiones_marca_estado
    CHECK (estado IN ('registrada', 'aplicada', 'anulada')),
  CONSTRAINT chk_fusiones_marca_xp CHECK (xp_consumido >= 0),
  CONSTRAINT chk_fusiones_marca_entradas CHECK (jsonb_typeof(entradas) = 'array'),
  CONSTRAINT chk_fusiones_marca_salidas  CHECK (jsonb_typeof(salidas)  = 'object'),
  CONSTRAINT uq_fusiones_marca_idem UNIQUE (clave_idempotencia)
);

CREATE INDEX IF NOT EXISTS idx_fusiones_marca_usuario
  ON fusiones_marca (usuario_id, creado_en DESC);
CREATE INDEX IF NOT EXISTS idx_fusiones_marca_marca
  ON fusiones_marca (marca_id, creado_en DESC);
CREATE INDEX IF NOT EXISTS idx_fusiones_marca_receta
  ON fusiones_marca (receta_clave, creado_en DESC);

-- (5) ENTREGA EN MOSTRADOR (y entrega del premio semanal) --------------------
--     Un solo flujo: el premio semanal es una fila origen='premio_semanal' con
--     estado='pendiente' y codigo_publico_snapshot ya resuelto; el mostrador la
--     cierra igual que una compra. NO se borra nunca (ADR-003): 'anulado'.
CREATE TABLE IF NOT EXISTS canjes_tienda (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id              uuid NOT NULL REFERENCES usuarios(id) ON DELETE NO ACTION,
  marca_id                uuid NOT NULL REFERENCES marcas(id) ON DELETE NO ACTION,
  billetera_id            uuid REFERENCES billeteras(id) ON DELETE NO ACTION,
  codigo_publico_snapshot text NOT NULL,
  consumible_id           uuid REFERENCES consumibles(id) ON DELETE NO ACTION,
  consumible_clave        varchar(50) NOT NULL,
  cantidad                integer NOT NULL DEFAULT 1,
  precio_xp_unitario      numeric(12,2) NOT NULL DEFAULT 0,
  xp_total                numeric(12,2) NOT NULL DEFAULT 0,
  origen                  text NOT NULL DEFAULT 'mostrador',
  semana                  varchar(8),
  puesto                  smallint,
  estado                  text NOT NULL DEFAULT 'pendiente',
  atendido_por            uuid REFERENCES usuarios(id) ON DELETE NO ACTION,
  nota                    text,
  contexto                jsonb NOT NULL DEFAULT '{}'::jsonb,
  clave_idempotencia      text,
  creado_en               timestamptz NOT NULL DEFAULT now(),
  entregado_en            timestamptz,
  CONSTRAINT chk_canjes_tienda_estado
    CHECK (estado IN ('pendiente', 'entregado', 'anulado')),
  CONSTRAINT chk_canjes_tienda_origen
    CHECK (origen IN ('mostrador', 'premio_semanal')),
  CONSTRAINT chk_canjes_tienda_cantidad CHECK (cantidad > 0),
  CONSTRAINT chk_canjes_tienda_puesto
    CHECK (puesto IS NULL OR puesto BETWEEN 1 AND 3),
  CONSTRAINT chk_canjes_tienda_precios
    CHECK (precio_xp_unitario >= 0 AND xp_total >= 0),
  CONSTRAINT chk_canjes_tienda_contexto
    CHECK (jsonb_typeof(contexto) = 'object'),
  CONSTRAINT uq_canjes_tienda_idem UNIQUE (clave_idempotencia)
);

CREATE INDEX IF NOT EXISTS idx_canjes_tienda_usuario
  ON canjes_tienda (usuario_id, creado_en DESC);
CREATE INDEX IF NOT EXISTS idx_canjes_tienda_marca_estado
  ON canjes_tienda (marca_id, estado);
CREATE INDEX IF NOT EXISTS idx_canjes_tienda_codigo
  ON canjes_tienda (codigo_publico_snapshot);

-- (6) TUNABLES (gamificacion_config.valor es numeric(12,4): solo numeros) ----
--     ON CONFLICT DO NOTHING: re-ejecutar NO reescribe una recalibracion.
INSERT INTO gamificacion_config (clave, valor, descripcion) VALUES
  ('marca_alta_xp',               1650.0000,
   'Coste en XP de crear una marca (sink, no resta xp_total). ADR-107 D5/D14'),
  ('marca_premio_xp_por_unidad',  2500.0000,
   'XP de la semana por unidad bruta de premio. ADR-107 D3'),
  ('marca_premio_unidades_max',      6.0000,
   'Tope de unidades BRUTAS por puesto y semana. ADR-107 D3'),
  ('marca_premio_xp_minimo_semana', 1000.0000,
   'Por debajo de este XP semanal el premio es 0. ADR-107 D3'),
  ('marca_premio_peso_1',            1.0000,
   'Peso del 1er puesto. ADR-107 D3'),
  ('marca_premio_peso_2',            0.5000,
   'Peso del 2do puesto. ADR-107 D3'),
  ('marca_premio_peso_3',            0.2500,
   'Peso del 3er puesto. ADR-107 D3'),
  ('marca_premio_factor_retorno',    0.3500,
   'Techo de valor del premio en XP-equivalente / XP de la semana. ADR-107 D4'),
  ('marca_premio_tasa_cop_por_xp',  12.0000,
   'NO CALIBRADO: convencion contable COP por XP. Solo reporte. ADR-107 D4')
ON CONFLICT (clave) DO NOTHING;

-- (7) CATALOGO ANCESTRAL (cierre de DEUDA-4 y DEUDA-5) -----------------------
--     precio_cop = precio comercial REAL dado por el operador (dato, no
--     estimacion). precio_xp = ROUND(precio_cop / marca_premio_tasa_cop_por_xp, 2)
--     con la tasa sembrada (12.0000): es una DERIVACION contable con un
--     parametro de calibracion, NO un precio medido ni una tasa de cambio.
--     Editable por admin (precio_xp + precio_xp_actual).
--     marca_id arranca NULL y la vincula el paso 7 del plan de aplicacion
--     (D16): la marca ANCESTRAL la crea el operador por la via comun
--     (gate de nivel + coste), NO esta migracion.
--     premio_semanal = true: ANCESTRAL es el premio del Top 3 (premisa 2).
--     stock_total NULL = sin tope declarado; lo fija el admin.
INSERT INTO consumibles
  (clave, nombre, descripcion, precio_xp, precio_xp_base, precio_cop,
   tipo_canje, premio_semanal, activo)
VALUES
  ('ancestral_pocima_50ml', 'Ancestral Pocima 50 ml',
   'Producto fisico 50 ml. Entrega en mostrador con codigo publico.',
   1166.67, 1166.67, 14000.00, 'tienda', true, true),
  ('ancestral_media_375ml', 'Ancestral Media 375 ml',
   'Producto fisico 375 ml. Entrega en mostrador con codigo publico.',
   3416.67, 3416.67, 41000.00, 'tienda', true, true),
  ('ancestral_botella_750ml', 'Ancestral Botella 750 ml',
   'Producto fisico 750 ml. Entrega en mostrador con codigo publico.',
   6333.33, 6333.33, 76000.00, 'tienda', true, true)
ON CONFLICT (clave) DO NOTHING;

-- ============================================================================
-- FIN 058. Encadenado posterior (ADR-107 D16, NO forma parte de la migracion):
--
--   PASO 5. Desplegar el codigo de @backend-dev (marca_crear,
--           marca_activa_set, marca_activar sin ON CONFLICT (usuario_id),
--           mi_marca / marca_presencia resolviendo por marca_activa_id).
--   PASO 6. El operador crea la marca ANCESTRAL por la via COMUN:
--             POST {tipo:'marca_crear', nombre:'ANCESTRAL', ...}
--           con gate de nivel 5 y coste marca_alta_xp = 1650 XP. La migracion
--           NO la crea: no hay usuario dueno en tiempo de migracion y el alta
--           es un acto con coste, no un seed.
--   PASO 7. Vincular los 3 productos al sponsor (una sola vez, idempotente,
--           sin migracion nueva):
--             UPDATE consumibles c
--                SET marca_id = m.id
--               FROM marcas m
--              WHERE m.nombre = 'ANCESTRAL'
--                AND c.clave IN ('ancestral_pocima_50ml',
--                                'ancestral_media_375ml',
--                                'ancestral_botella_750ml')
--                AND c.marca_id IS NULL;
--           Sin este paso los 3 productos siguen siendo elegibles como premio
--           (marca_id IS NULL no bloquea, D3.7) pero NO quedan atribuidos al
--           sponsor y las metricas de "que patrocina ANCESTRAL" salen vacias.
-- ============================================================================
