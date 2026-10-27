-- ============================================================================
-- Migration 059: deuda de indices de canjes_tienda (semana) y gate de nivel
--   de Marca configurable por fila en gamificacion_config.
-- Fecha: 2026-10-27
-- Referencias: ADR-107 (D1 ledger de decisiones, D3 premio semanal, D16 orden
--   de aplicacion), ADR-002 (ASCII-safe: cero bytes > 127), ADR-006 (baseline =
--   archivo real), ADR-008 (idempotencia), BUG-021/BUG-060 (aplicar la
--   migracion completa antes del deploy).
-- Requiere: 031 (gamificacion_config), 035/045 (schema_migrations),
--   058 (canjes_tienda y sus indices marca_estado / usuario / codigo).
--
-- PROPOSITO  (exactamente dos cosas, nada mas)
--   1. Cerrar la deuda de @sql-security de la 058: canjes_tienda.semana
--      (varchar(8), 058:~L318) se creo SIN indice aunque el codigo la filtra
--      por igualdad. Se anade un indice btree de nombre coherente con los
--      existentes (idx_canjes_tienda_usuario / _marca_estado / _codigo).
--   2. Sembrar en gamificacion_config la clave marca_nivel_requerido = 5, que
--      api/usuarios.js ya lee con fallback 5 (cambio O4-b commiteado). Hoy la
--      clave NO existe: el comportamiento efectivo ya es 5, y sembrarla lo
--      hace configurable sin deploy.
--
-- POR QUE ESAS COLUMNAS Y EN ESE ORDEN (medido, no supuesto)
--   El encargo suponia "marca + estado + semana" en el panel. Medido con grep
--   sobre api/interacciones.js, la realidad es distinta y conviene dejarla
--   escrita para que nadie "arregle" el indice hacia el supuesto:
--     - Panel de canjes (interacciones.js L6966-6974 y L6990-6991):
--       WHERE marca_id=$1 [AND estado=$2] ORDER BY creado_en DESC LIMIT 200.
--       NO filtra por semana (la proyecta en el SELECT). Este camino YA esta
--       cubierto por idx_canjes_tienda_marca_estado (marca_id, estado) de la
--       058: este fichero NO lo duplica ni lo sustituye.
--     - Unico consumidor real de semana (interacciones.js L6835-6838, D3.10
--       "una entrega por (marca, semana, puesto)"):
--         WHERE marca_id=$1::uuid AND semana=$2
--           AND origen='premio_semanal' AND estado<>'anulado'.
--       De ahi el orden elegido: (marca_id, semana, origen, estado) =
--       igualdad, igualdad, igualdad, rango. Es el prefijo mas selectivo y
--       deja el ultimo predicado (desigualdad) al final, que es donde un
--       btree lo puede aprovechar.
--     - La idempotencia del otorgamiento (L16541-16542, L16572-16598) NO usa
--       semana: va por clave_idempotencia y su UNIQUE uq_canjes_tienda_idem.
--       Por eso el indice nuevo no incluye puesto ni usuario_id.
--
-- CARACTER DE LA MIGRACION
--   ESTRICTAMENTE ADITIVA E IDEMPOTENTE (ADR-008). Solo dos sentencias de
--   datos/DDL:
--     - CREATE INDEX IF NOT EXISTS  -> segunda corrida: no-op.
--     - INSERT ... ON CONFLICT (clave) DO NOTHING -> segunda corrida: no-op,
--       y por politica de la 058 (T-5) NO pisa un valor que el operador haya
--       ajustado a mano.
--   CERO DELETE, CERO DROP TABLE, CERO DROP COLUMN, CERO TRUNCATE, cero
--   renombrado de objetos, cero ALTER de columnas existentes.
--   ASCII-SAFE (ADR-002): cero bytes > 127, cero tildes, cero ene con tilde,
--   cero emojis, cero escapes unicode, cero backticks. Los terminos que en
--   castellano llevarian tilde se escriben sin ella.
--
-- PRECONDICIONES
--   P-1. Numeracion: el mayor .sql en disco es 058_marcas_self_service_
--        premios_canje.sql (052 no existe, hueco conocido) y el mayor numero
--        en schema_migrations es 58 con resultado 'aplicada'. Confirmado por
--        consulta directa antes de nombrar este archivo como 059.
--   P-2. canjes_tienda existe (la crea la 058). Si falta, el bloque (0) aborta
--        con un mensaje que dice de que migracion viene, en vez de un 42P01
--        seco (patron de guardas 031/038/058).
--   P-3. gamificacion_config existe (la crea la 031) con PK en clave, para que
--        ON CONFLICT (clave) resuelva por indice y no por un scan.
--   P-4. La puerta del ledger (contrato (a)-(e) de la 045) exige que no quede
--        ningun .sql con numero menor sin fila aplicada: con la 058 aplicada
--        la puerta abre. El propio runner lo valida antes de escribir.
--   P-5. NO existe todavia una fila con numero = 59 en schema_migrations.
--
-- TRAMPAS DOCUMENTADAS (no "arreglar" desde aqui)
--   T-1. gamificacion_config.valor es numeric(12,4) (migracion 031): SOLO
--        admite numeros. Escribir 'nivel cinco' o cualquier texto aborta con
--        22P02. El gate es un numero entero guardado como 5.
--   T-2. Esta migracion NO toca api/usuarios.js: el codigo ya lee la clave y
--        su fallback es 5, asi que sembrarla con 5 NO cambia el
--        comportamiento observable del alta de marca. Solo lo hace
--        configurable. Si el operador quiere otro nivel, el camino es un
--        UPDATE versionado (db/cleanups/), no editar este fichero.
--   T-3. Efecto colateral esperado en la verificacion de la 058: su cabecera
--        dice "SELECT ... WHERE clave LIKE 'marca_%' -> 9 filas". Tras esta
--        migracion pasan a ser 10 filas. NO es una deriva: el invariante
--        correcto es "9 tunables de la 058 + marca_nivel_requerido = 10".
--        Nunca editar la fila ya escrita de la 058 ni su checksum.
--   T-4. El indice nuevo NO sustituye a idx_canjes_tienda_marca_estado: el
--        panel sigue usando el de la 058. Dos indices sobre marca_id son
--        correctos aqui porque el segundo predicado difiere (estado vs
--        semana); no hay redundancia real.
--
-- VERIFICACION PREVIA (read-only, ejecutada antes de aplicar)
--   SELECT numero, resultado FROM schema_migrations ORDER BY numero DESC LIMIT 4;
--     -> 58 aplicada (y 57/56/55), sin 59.
--   SELECT to_regclass('public.canjes_tienda'), to_regclass('public.gamificacion_config');
--     -> ambas no nulas.
--   SELECT indexname FROM pg_indexes WHERE tablename = 'canjes_tienda';
--     -> 5 indices, ninguno por semana (la deuda que cierra este fichero).
--   SELECT clave, valor FROM gamificacion_config WHERE clave = 'marca_nivel_requerido';
--     -> 0 filas (comportamiento efectivo hoy: fallback 5 del codigo).
--   SELECT COUNT(*) FROM gamificacion_config WHERE clave LIKE 'marca_%';
--     -> 9 (los de la 058).
--
-- VERIFICACION POSTERIOR
--   SELECT numero, resultado, notas FROM schema_migrations WHERE numero = 59;
--     -> 1 fila.
--   SELECT indexdef FROM pg_indexes
--    WHERE tablename = 'canjes_tienda' AND indexname = 'idx_canjes_tienda_marca_semana';
--     -> btree (marca_id, semana, origen, estado).
--   SELECT clave, valor FROM gamificacion_config WHERE clave = 'marca_nivel_requerido';
--     -> 1 fila, valor 5.0000.
--   SELECT COUNT(*) FROM gamificacion_config WHERE clave LIKE 'marca_%';
--     -> 10 (ver T-3).
--   node scripts/apply_sql_file.js db/migrations/059_marcas_indice_semana_y_gate_nivel.sql --dry-run
--     -> la puerta del ledger reconoce la fila 59 y no reporta derivas.
--
-- ROLLBACK (DOCUMENTADO, NO EJECUTADO - requiere aprobacion del operador)
--   Asimetrico y solo seguro de forma inmediata, porque ADR-003 prohibe
--   borrar datos. Los dos objetos son inocuos: un indice y una fila de
--   configuracion. Orden inverso:
--     1. DROP INDEX IF EXISTS idx_canjes_tienda_marca_semana;
--        (un indice no contiene datos de negocio: retirarlo no borra filas)
--     2. Si y solo si el operador confirma que nadie ajusto la clave:
--        DELETE FROM gamificacion_config WHERE clave = 'marca_nivel_requerido';
--        Esto NO se ejecuta desde esta migracion (ADR-003) y ademas el codigo
--        sigue funcionando sin la fila: vuelve al fallback 5.
--     3. Registrar la reversion como migracion NUEVA (060+) con su fila en
--        schema_migrations. Nunca editar ni borrar la fila del 59: el runner
--        no reescribe checksums y esa fila es la unica evidencia.
-- ============================================================================

-- (0) GUARDAS DE PRECONDICION (to_regclass, patron 031/038/058) ----------------
--     Convierte un 42P01 seco en un mensaje que dice QUE falta y de QUE
--     migracion viene. No altera ninguna de las dos operaciones.
DO $m059p$
DECLARE
  faltantes text[] := ARRAY[]::text[];
BEGIN
  IF to_regclass('public.canjes_tienda') IS NULL THEN
    faltantes := faltantes || 'public.canjes_tienda (058)'::text;
  END IF;
  IF to_regclass('public.gamificacion_config') IS NULL THEN
    faltantes := faltantes || 'public.gamificacion_config (031)'::text;
  END IF;
  IF array_length(faltantes, 1) IS NOT NULL THEN
    RAISE EXCEPTION 'MIGRACION 059: pre-requisitos ausentes: %',
      array_to_string(faltantes, ', ');
  END IF;
END $m059p$;

-- (1) INDICE POR SEMANA EN canjes_tienda (deuda de la 058) --------------------
--     Consumidor medido: interacciones.js L6835-6838 (D3.10), que filtra
--     marca_id = $1 AND semana = $2 AND origen = 'premio_semanal'
--     AND estado <> 'anulado'. Orden: igualdad, igualdad, igualdad, rango.
--     No se incluye puesto: el consumidor agrupa en JS, no filtra por el.
--     IF NOT EXISTS lo hace no-op en la segunda corrida (ADR-008).
CREATE INDEX IF NOT EXISTS idx_canjes_tienda_marca_semana
  ON canjes_tienda (marca_id, semana, origen, estado);

-- (2) GATE DE NIVEL DEL ALTA DE MARCA, CONFIGURABLE --------------------------
--     api/usuarios.js lee la clave con fallback 5 (SELECT valor ... LIMIT 1) y
--     el alta exige nivel >= ese valor. El valor es numeric(12,4) (T-1): se
--     siembra como numero 5, nunca como texto.
--     ON CONFLICT (clave) DO NOTHING (politica T-5 de la 058): re-ejecutar no
--     pisa un ajuste del operador. Un cambio de nivel es una operacion nueva y
--     versionada, no un efecto colateral de reaplicar esto.
INSERT INTO gamificacion_config (clave, valor, descripcion)
VALUES ('marca_nivel_requerido', 5,
        'Nivel minimo de usuario para dar de alta una Marca. ADR-107 O4-b')
ON CONFLICT (clave) DO NOTHING;

-- ============================================================================
-- FIN 059. No encadena pasos de codigo: el codigo ya lee la clave (O4-b) y ya
-- filtra por semana. Esta migracion solo cierra la deuda de indice y hace el
-- gate configurable. La aplicacion la registra el runner en schema_migrations
-- con la nota del operador.
-- ============================================================================
