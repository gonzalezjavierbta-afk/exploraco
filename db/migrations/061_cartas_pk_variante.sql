-- ============================================================================
-- Migration 061: cartas - CONTRACCION de la clave primaria de usuarios_cartas.
--   La 060 (expand) dejo uq_usuarios_cartas_variante UNIQUE de 3 columnas y la
--   clave primaria todavia de 2. La 061 cierra esa asimetria: promociona la
--   clave primaria a (usuario_id, carta_id, variante) para que una fila
--   variante='shiny' pueda COEXISTIR con su 'base' de la misma carta.
-- Fecha: 2026-10-27
-- Referencias: ADR-108 (D12 expand/contract, Deuda D-4), ADR-002 (ASCII-safe,
--   cero bytes > 127), ADR-003 (cero borrado logico), ADR-006 (baseline =
--   archivo real), ADR-008 (idempotencia), ADR-084 D5 (lectura por rango).
-- Requiere: 040 (usuarios_cartas, cartas_intercambios), 045 (schema_migrations),
--   060 (variante NOT NULL DEFAULT 'base' y UNIQUE de 3 columnas ya aplicada).
--
-- PROBLEMA QUE CIERRA (hecho medido: R-1 del cierre de la 060)
--   Con la clave primaria de 2 columnas, un INSERT de la variante 'shiny' de
--   una carta que el usuario ya tiene en 'base' aborta con 23505 en
--   usuarios_cartas_pkey. Por eso carta_fusionar no puede entregar nada: la
--   fusion produce una variante nueva de una carta ya poseida. La 061 elimina
--   ese 23505 sin tocar una sola fila.
--
-- POR QUE NO ROMPE api/interacciones.js
--   El codigo ya esta migrado a ON CONFLICT (usuario_id, carta_id, variante)
--   (5 ocurrencias de 3 columnas, cero de 2). Ese conflict target se resuelve
--   hoy con el UNIQUE uq_usuarios_cartas_variante y manana con la PK nueva:
--   las dos son claves unicas sobre las mismas tres columnas, asi que la
--   inferencia del ON CONFLICT funciona igual antes y despues. Este fichero no
--   toca api/*.js, ni HTML, ni DECISIONS.md.
--
-- LOS TRES BLOQUES
--   1. cartas_intercambios: columna variante + CHECK de dominio. El ledger de
--      intercambios tiene que quedar auditable POR VARIANTE: sin la columna, un
--      intercambio de shiny y uno de base son indistinguibles.
--   2. usuarios_cartas: DROP + ADD de la clave primaria EN UNA SOLA SENTENCIA,
--      dentro del bloque DO con tag m061b. PROHIBIDO partirla en dos: el runner
--      (scripts/apply_sql_file.js) ejecuta sentencia a sentencia SIN transaccion
--      envolvente, asi que un fallo entre el DROP y el ADD dejaria la tabla SIN
--      clave primaria. Una sola sentencia ALTER TABLE con las dos acciones es
--      atomica por definicion: o se aplican las dos, o ninguna.
--   3. CONSERVAR uq_usuarios_cartas_variante. Es redundante con la PK nueva a
--      proposito: deja el ON CONFLICT independiente del orden de despliegue
--      (codigo nuevo + 060 aplicada + 061 sin aplicar sigue funcionando).
--
-- IDEMPOTENCIA (ADR-008)
--   - ADD COLUMN IF NOT EXISTS.
--   - ADD CONSTRAINT no admite IF NOT EXISTS en PostgreSQL (medido): todo
--     constraint va dentro de DO con guarda en pg_constraint.
--   - La PK se toca SOLO si array_length(conkey,1) <> 3. En la segunda corrida
--     la guarda ve 3 columnas y no ejecuta nada (no-op real, no un DROP+ADD que
--     reconstruya indices sin necesidad).
--   - Si la PK tuviera 3 columnas pero NO las esperadas, el bloque aborta con
--     excepcion en vez de recrear a ciegas: es un estado que nadie ha medido.
--
-- PRECONDICION QUE ABORTA ANTES DE ESCRIBIR
--   Cualquier FOREIGN KEY ENTRANTE a usuarios_cartas. Cambiar la PK obliga a
--   tratar esas FK en el mismo bloque (una FK que depende de la PK hace fallar
--   el DROP con 2BP01). Si aparece alguna, el bloque (0) aborta y nombra la
--   constraint exacta. Medido el 2026-10-27: cero FK entrantes.
--
-- QUE NO HACE
--   Cero DROP COLUMN, cero DROP TABLE, cero TRUNCATE, cero DELETE, cero
--   UPDATE, cero RENAME, cero insert en schema_migrations (lo escribe el
--   runner, contrato de la 045).
--
-- ASCII-SAFE (ADR-002): cero bytes > 127, cero tildes, cero enes con tilde,
--   cero emojis, cero escapes unicode, cero backticks. Los terminos que en
--   castellano llevarian tilde se escriben sin ella.
--
-- VERIFICACION PREVIA (read-only, scripts/neon_select.js, 2026-10-27)
--   pk_ncols = 2, pk_def = PRIMARY KEY (usuario_id, carta_id)   -> PASS
--   fk_n = 0 (fks_entrantes vacio)                              -> PASS
--   uq_usuarios_cartas_variante = 1                             -> PASS
--   usuarios_cartas: 0 filas / SUM(cantidad) = 0                -> baseline
--   cartas_catalogo: 27 filas                                   -> baseline
--   MAX(numero) de schema_migrations = 60, filas con numero 61 = 0
--   cartas_intercambios: 6 columnas, sin variante; chk_cartas_intercambios_variante
--     no existe (0 filas en pg_constraint)                      -> PASS
--
-- VERIFICACION POSTERIOR (ejecutada; numeros reales en el cierre de la tarea)
--   array_length(conkey,1) = 3 en usuarios_cartas_pkey.
--   uq_usuarios_cartas_variante sigue existiendo.
--   cartas_intercambios.variante existe NOT NULL DEFAULT 'base' + su CHECK.
--   usuarios_cartas: 0 filas / SUM(cantidad) 0 (identico al previo).
--   cartas_catalogo: 27. schema_migrations: fila numero 61 resultado 'aplicada'.
--   Segunda corrida: cero errores y los mismos conteos.
--
-- ROLLBACK (documentado, NO ejecutado: requiere aprobacion del operador)
--   Solo es seguro mientras no existan filas shiny ni dos filas por
--   (usuario_id, carta_id). Con datos, el rollback perderia informacion:
--   una migracion NUEVA tendria que consolidar las variantes antes de bajar la
--   PK a 2 columnas. Nunca editando este fichero (ADR-003).
-- ============================================================================

-- ============================================================================
-- (0) GUARDAS DE PRECONDICION
-- ============================================================================
-- Convierte un 42P01 seco en un mensaje que dice QUE falta y de QUE migracion
-- viene, y aborta ante FK entrantes antes de tocar nada.
DO $m061a$
DECLARE
  faltantes text[] := ARRAY[]::text[];
  npk int;
  fks text;
BEGIN
  IF to_regclass('public.usuarios_cartas') IS NULL THEN
    faltantes := faltantes || 'public.usuarios_cartas (040)'::text;
  END IF;
  IF to_regclass('public.cartas_intercambios') IS NULL THEN
    faltantes := faltantes || 'public.cartas_intercambios (040)'::text;
  END IF;
  IF to_regclass('public.schema_migrations') IS NULL THEN
    faltantes := faltantes || 'public.schema_migrations (045)'::text;
  END IF;
  IF array_length(faltantes, 1) IS NOT NULL THEN
    RAISE EXCEPTION 'MIGRACION 061: pre-requisitos ausentes: %',
      array_to_string(faltantes, ', ');
  END IF;

  -- Una tabla sin clave primaria no es un estado esperado: el DROP ... IF EXISTS
  -- no fallaria, pero el ADD podria chocar con la nada y quedarse a medias.
  SELECT COUNT(*)::int INTO npk
    FROM pg_constraint
   WHERE conrelid = 'public.usuarios_cartas'::regclass AND contype = 'p';
  IF npk = 0 THEN
    RAISE EXCEPTION 'MIGRACION 061: usuarios_cartas no tiene clave primaria. Estado no medido, no se toca.';
  END IF;

  -- FK ENTRANTES: el bloqueador duro. Se nombran todas, no solo la primera.
  SELECT COALESCE(string_agg(conname, ', ' ORDER BY conname), '') INTO fks
    FROM pg_constraint
   WHERE confrelid = 'public.usuarios_cartas'::regclass AND contype = 'f';
  IF fks <> '' THEN
    RAISE EXCEPTION 'MIGRACION 061: FOREIGN KEY entrantes a usuarios_cartas (%): cambiar la PK exige tratarlas en el mismo bloque', fks;
  END IF;
END $m061a$;

-- ============================================================================
-- (1) cartas_intercambios: LA VARIANTE DEL LEDGER
-- ============================================================================
-- El DEFAULT es el backfill de las filas historicas (hoy el ledger esta vacio o
-- solo con 'base', y un intercambio anterior a la 060 solo pudo ser 'base').
-- No hay UPDATE de variante: un UPDATE pisaria en la segunda corrida las filas
-- shiny ya registradas (mismo motivo que en la 060, D1 punto 5).
ALTER TABLE cartas_intercambios
  ADD COLUMN IF NOT EXISTS variante varchar(10) NOT NULL DEFAULT 'base';

-- ============================================================================
-- (2) usuarios_cartas: LA CLAVE PRIMARIA DE 3 COLUMNAS  [BLOQUE ATOMICO]
-- ============================================================================
-- UNA sola sentencia con las DOS acciones. Ni dos ALTER TABLE, ni un DROP
-- suelto seguido de un ADD: el runner no envuelve el fichero en transaccion y
-- un fallo intermedio dejaria usuarios_cartas sin clave primaria.
-- La guarda va en array_length(conkey,1): si ya son 3 columnas, no se ejecuta
-- nada. Si fueran 3 pero distintas de las esperadas (usuario_id, carta_id,
-- variante) el bloque aborta en vez de recrear a ciegas.
DO $m061b$
DECLARE
  ncols int;
  cols text;
BEGIN
  SELECT array_length(c.conkey, 1),
         (SELECT string_agg(a.attname, ',' ORDER BY a.attname)
            FROM pg_attribute a
           WHERE a.attrelid = c.conrelid
             AND a.attnum = ANY (c.conkey))
    INTO ncols, cols
    FROM pg_constraint c
   WHERE c.conrelid = 'public.usuarios_cartas'::regclass
     AND c.contype = 'p';

  IF ncols = 3 AND cols = 'carta_id,usuario_id,variante' THEN
    RAISE NOTICE '061: usuarios_cartas_pkey ya es de 3 columnas; no-op';
  ELSIF ncols = 3 THEN
    RAISE EXCEPTION '061: la PK ya es de 3 columnas pero sobre (%), no sobre (usuario_id, carta_id, variante). No se recrea a ciegas', cols;
  ELSE
    ALTER TABLE usuarios_cartas
      DROP CONSTRAINT IF EXISTS usuarios_cartas_pkey,
      ADD CONSTRAINT usuarios_cartas_pkey
        PRIMARY KEY (usuario_id, carta_id, variante);
    RAISE NOTICE '061: usuarios_cartas_pkey recreada de 2 a 3 columnas en una sola sentencia';
  END IF;
END $m061b$;

-- ============================================================================
-- (3) CONSTRAINTS: CHECK DEL LEDGER Y CONSERVACION DEL UNIQUE
-- ============================================================================
-- chk_cartas_intercambios_variante: mismo dominio cerrado que
-- chk_usuarios_cartas_variante (la 060). Nombre con prefijo de tabla para no
-- colisionar (verificado: libre en pg_constraint antes de aplicar).
-- uq_usuarios_cartas_variante: NO se dropea. Es redundante con la PK nueva y
-- esa redundancia es intencionada: el ON CONFLICT (usuario_id, carta_id,
-- variante) del backend no depende del orden de despliegue. La guarda inferior
-- la recrea SOLO si alguien la hubiera retirado a mano, y es no-op en el camino
-- normal.
DO $m061c$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                  WHERE conname = 'chk_cartas_intercambios_variante'
                    AND conrelid = 'public.cartas_intercambios'::regclass) THEN
    ALTER TABLE cartas_intercambios
      ADD CONSTRAINT chk_cartas_intercambios_variante
      CHECK (variante IN ('base', 'shiny'));
    RAISE NOTICE '061: chk_cartas_intercambios_variante creada';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                  WHERE conname = 'uq_usuarios_cartas_variante'
                    AND conrelid = 'public.usuarios_cartas'::regclass) THEN
    ALTER TABLE usuarios_cartas
      ADD CONSTRAINT uq_usuarios_cartas_variante
      UNIQUE (usuario_id, carta_id, variante);
    RAISE NOTICE '061: uq_usuarios_cartas_variante recreada (faltaba)';
  END IF;
END $m061c$;

-- ============================================================================
-- FIN 061. Cero destruccion de datos: sin DROP COLUMN, sin DROP TABLE, sin
-- DELETE, sin UPDATE. La unica sentencia destructiva es el DROP de la clave
-- primaria de 2 columnas, y va en la MISMA sentencia que la creacion de la de
-- 3: no existe ninguna ventana en la que usuarios_cartas quede sin PK.
-- ============================================================================
