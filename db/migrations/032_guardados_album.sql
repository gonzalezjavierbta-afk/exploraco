-- ============================================================================
-- Migration 032: Guardados de media dentro de "Mis Albumes" (album_id + visible)
-- Fecha: 2026-09-21
-- Referencias: ADR-054 (unifica los guardados con "Mis Albumes"; supersede el
--   concepto de carpetas privadas de ADR-052), ADR-039 (visibilidad POR
--   RECURSO/OBJETO, nunca por contenedor), ADR-008 (gobernanza e idempotencia
--   de esquema), ADR-002 (ASCII-safe), ADR-003 (cero borrado logico en sus
--   vertientes JSONB/soft-delete; aqui el DROP es una supresion de esquema
--   aprobada por el operador), ADR-006 (baseline = archivo real).
-- Requiere: 009 (albumes), 019 (media_guardados) y 023 (media_guardados.item_id
--   text + CHECK de fuente ampliado). Interactua con 030 (guardados_carpetas +
--   media_guardados.carpeta_id): esta migracion los ELIMINA.
--
-- QUE HACE
--   1. media_guardados.album_id uuid NULL REFERENCES albumes(id) ON DELETE SET
--      NULL: album de "Mis Albumes" (opcional) donde el usuario organiza sus
--      guardados. Referencia VIVA: guardar NO copia media (mismo contrato de
--      019, el guardado es una referencia personal, no un pin).
--   2. media_guardados.visible boolean NOT NULL DEFAULT false: visibilidad POR
--      OBJETO (cada guardado se publica de forma individual, coherente con
--      ADR-039; la visibilidad nunca es por album).
--   3. CHECK media_guardados_visible_album_chk:
--      (visible = false OR album_id IS NOT NULL). No se puede publicar un
--      guardado sin album; en cambio un album_id con visible=false es valido
--      (organizacion privada).
--   4. Indices parciales de soporte:
--      - idx_media_guardados_album (usuario_id, album_id) WHERE activo = true
--        (agrupar "guardados de este album" del dueno).
--      - idx_media_guardados_album_publico (album_id, creado_en) WHERE
--        activo = true AND visible = true (lectura publica del album).
--   5. DROP de media_guardados.carpeta_id y DROP de la tabla guardados_carpetas
--      (ADR-052 queda SUPERSEDED en su concepto). Antes del DROP, un bloque de
--      SALVAGUARDA informativa reporta con RAISE NOTICE, por separado:
--        (a) filas media_guardados WHERE carpeta_id IS NOT NULL;
--        (b) filas guardados_carpetas WHERE activo = true.
--      El reporte NO aborta ni decide: solo deja traza (salvaguarda pedida por
--      el operador). El DROP es intencional y aceptado en ADR-054 (decision 6).
--
-- CARACTER DE LA MIGRACION
--   PARCIALMENTE DESTRUCTIVA. Los bloques 1-4 son ADITIVOS (ADD COLUMN /
--   ADD CONSTRAINT / CREATE INDEX). El bloque 5 es DESTRUCTIVO (DROP COLUMN /
--   DROP TABLE) y esta aprobado por el operador en ADR-054: se pierde la
--   organizacion previa en carpetas y NO se recupera con el rollback.
--   IDEMPOTENTE (ADR-008): las columnas usan guards de to_regclass e
--   information_schema; la FK y el CHECK usan pg_constraint; los indices usan
--   IF NOT EXISTS; los DROP usan IF EXISTS. Re-ejecutar el archivo COMPLETO es
--   no-op seguro (ver preflight 0.f).
--   DEFENSIVA (patron BUG-021): si media_guardados o albumes no existieran, los
--   bloques correspondientes se omiten con RAISE NOTICE en vez de abortar.
--   ASCII-SAFE (ADR-002): cero bytes > 127, cero tildes, cero ene, cero
--   backticks, cero doble-escape.
--
-- APLICACION
--   Correr este archivo COMPLETO con scripts/apply_sql_file.js (o en el editor
--   SQL de Neon) DESPUES de la 031. Patron BUG-021/BUG-060: archivo completo en
--   una sola corrida. NO aplicarlo sin confirmacion del operador.
--
-- ROLLBACK (emergencia, LOSSY)
--   Volver a la 030: recrear media_guardados.carpeta_id y la tabla
--   guardados_carpetas (ver db/migrations/030_guardados_carpetas.sql).
--   LOSSY: la organizacion en carpetas NO se recupera (carpeta_id y la tabla
--   se eliminaron). Para retirar lo aditivo de esta migracion:
--     ALTER TABLE media_guardados DROP COLUMN IF EXISTS visible;
--     ALTER TABLE media_guardados DROP COLUMN IF EXISTS album_id;
--   Al caer las columnas, su FK, su CHECK y los indices parciales se eliminan
--   en cascada. No va en el flujo normal.
-- ============================================================================

-- ============================================================================
-- 0. PREFLIGHT (SOLO LECTURA; NO forma parte del DDL; NO se ejecuta solo).
--    Copiar y correr sentencia por sentencia ANTES de aplicar la 032.
-- ============================================================================
-- (0.a) Confirmar que media_guardados existe (019/023 aplicadas).
--       Esperado: 1 fila.
-- SELECT table_name FROM information_schema.tables
--   WHERE table_schema='public' AND table_name='media_guardados';
--
-- (0.b) Confirmar que albumes existe (009 aplicada). Esperado: 1 fila.
-- SELECT table_name FROM information_schema.tables
--   WHERE table_schema='public' AND table_name='albumes';
--
-- (0.c) Confirmar que album_id y visible aun NO existen. Esperado antes: 0
--       filas; despues: 2 filas.
-- SELECT column_name, data_type, is_nullable, column_default
--   FROM information_schema.columns
--   WHERE table_schema='public' AND table_name='media_guardados'
--     AND column_name IN ('album_id','visible')
--   ORDER BY column_name;
--
-- (0.d) Confirmar que la FK, el CHECK y los indices aun NO existen.
--       Esperado antes: 0 filas; despues: FK 1, CHECK 1, indices 2.
-- SELECT conname, contype FROM pg_constraint
--   WHERE conrelid='public.media_guardados'::regclass
--     AND conname IN ('media_guardados_album_id_fkey',
--                     'media_guardados_visible_album_chk');
-- SELECT indexname FROM pg_indexes
--   WHERE schemaname='public'
--     AND indexname IN ('idx_media_guardados_album',
--                       'idx_media_guardados_album_publico');
--
-- (0.e) SALVAGUARDA INFORMATIVA pre-DROP (repite lo que reportara el bloque 5).
--       Correr una sola sentencia segun el estado de la 030:
--       (e1) Si 030 aplicada: filas de guardados con carpeta asignada.
-- SELECT COUNT(*) AS guardados_con_carpeta FROM media_guardados
--   WHERE carpeta_id IS NOT NULL;
--       (e2) Si 030 aplicada: carpetas activas que se perderan.
-- SELECT COUNT(*) AS carpetas_activas FROM guardados_carpetas WHERE activo = true;
--       NOTA: si la 030 no esta aplicada, ambas columnas/tablas no existen y el
--       bloque 5 es no-op (los guards lo omiten sin error).
--
-- (0.f) Idempotencia proyectada: correr 032 COMPLETO dos veces y volver a
--       correr (0.c) y (0.d). La segunda corrida debe ser no-op (mismas 2
--       columnas, misma FK, mismo CHECK, mismos 2 indices) y los DROP con
--       IF EXISTS no deben fallar.

-- ============================================================================
-- 1. COLUMNAS album_id / visible
-- ============================================================================
-- Defensivo (patron BUG-021): si media_guardados no existiera (019 pendiente) se
-- omite el bloque con NOTICE en vez de abortar. album_id se agrega SIN la FK
-- inline para poder nombrar la constraint de forma determinista en el bloque 2
-- (el nombre explicito coincide con el autogenerado por Postgres ->
-- media_guardados_album_id_fkey, asi cualquier intento previo converge).

DO $$
BEGIN
  IF to_regclass('public.media_guardados') IS NULL THEN
    RAISE NOTICE 'migracion 032: media_guardados no existe (falta 019); se omite el bloque 1';
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='media_guardados'
      AND column_name='album_id'
  ) THEN
    ALTER TABLE media_guardados ADD COLUMN album_id uuid;
    RAISE NOTICE 'migracion 032: media_guardados.album_id creada';
  ELSE
    RAISE NOTICE 'migracion 032: media_guardados.album_id ya existe; no-op';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='media_guardados'
      AND column_name='visible'
  ) THEN
    ALTER TABLE media_guardados
      ADD COLUMN visible boolean NOT NULL DEFAULT false;
    RAISE NOTICE 'migracion 032: media_guardados.visible creada (default false)';
  ELSE
    RAISE NOTICE 'migracion 032: media_guardados.visible ya existe; no-op';
  END IF;
END $$;

-- ============================================================================
-- 2. FOREIGN KEY media_guardados.album_id -> albumes(id)
-- ============================================================================
-- ON DELETE SET NULL: si el album se eliminara fisicamente, el guardado se
-- conserva y solo pierde su organizacion (espejo del contrato de 030). El flujo
-- normal usa soft-delete del album (activo=false); el backend fuerza
-- visible=false al desasignar album (por el CHECK del bloque 3). Si albumes no
-- existiera (009 pendiente) se omite la FK con NOTICE: la columna album_id
-- queda sin FK, pero la migracion no aborta.

DO $$
BEGIN
  IF to_regclass('public.media_guardados') IS NULL THEN
    RAISE NOTICE 'migracion 032: media_guardados no existe; se omite la FK album_id';
    RETURN;
  END IF;

  IF to_regclass('public.albumes') IS NULL THEN
    RAISE NOTICE 'migracion 032: albumes no existe (falta 009); se omite la FK album_id';
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname='media_guardados_album_id_fkey'
      AND conrelid='public.media_guardados'::regclass
      AND contype='f'
  ) THEN
    ALTER TABLE media_guardados
      ADD CONSTRAINT media_guardados_album_id_fkey
      FOREIGN KEY (album_id) REFERENCES albumes(id) ON DELETE SET NULL;
    RAISE NOTICE 'migracion 032: FK media_guardados_album_id_fkey creada (ON DELETE SET NULL)';
  ELSE
    RAISE NOTICE 'migracion 032: FK media_guardados_album_id_fkey ya existe; no-op';
  END IF;
END $$;

-- ============================================================================
-- 3. CHECK media_guardados_visible_album_chk
-- ============================================================================
-- idempotente via pg_constraint (patron de 019/025/029). visible=false es
-- siempre valido; visible=true EXIGE album_id. Las filas existentes quedan
-- visible=false (default), por lo que la validacion no puede fallar al crear la
-- constraint. Un album_id sin visible es valido (organizacion privada).

DO $$
BEGIN
  IF to_regclass('public.media_guardados') IS NULL THEN
    RAISE NOTICE 'migracion 032: media_guardados no existe; se omite el CHECK';
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='media_guardados'
      AND column_name IN ('album_id','visible')
    GROUP BY table_name HAVING COUNT(*) = 2
  ) THEN
    RAISE NOTICE 'migracion 032: faltan columnas album_id/visible; se omite el CHECK';
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname='media_guardados_visible_album_chk'
      AND conrelid='public.media_guardados'::regclass
  ) THEN
    ALTER TABLE media_guardados
      ADD CONSTRAINT media_guardados_visible_album_chk
      CHECK (visible = false OR album_id IS NOT NULL);
    RAISE NOTICE 'migracion 032: CHECK media_guardados_visible_album_chk creado';
  ELSE
    RAISE NOTICE 'migracion 032: CHECK media_guardados_visible_album_chk ya existe; no-op';
  END IF;
END $$;

-- ============================================================================
-- 4. INDICES PARCIALES
-- ============================================================================
-- idx_media_guardados_album: agrupa los guardados por album del dueno
-- (privados y publicos). idx_media_guardados_album_publico: sirve la lectura
-- publica del album (visible=true) ordenada por fecha. La condicion referencia
-- columnas de la 019 (activo) y de esta migracion (album_id/visible).

DO $$
BEGIN
  IF to_regclass('public.media_guardados') IS NULL THEN
    RAISE NOTICE 'migracion 032: media_guardados no existe; se omiten los indices';
    RETURN;
  END IF;

  CREATE INDEX IF NOT EXISTS idx_media_guardados_album
    ON media_guardados (usuario_id, album_id)
    WHERE activo = true;

  CREATE INDEX IF NOT EXISTS idx_media_guardados_album_publico
    ON media_guardados (album_id, creado_en)
    WHERE activo = true AND visible = true;

  RAISE NOTICE 'migracion 032: indices idx_media_guardados_album / idx_media_guardados_album_publico listos';
END $$;

-- ============================================================================
-- 5. SALVAGUARDA INFORMATIVA Y DROP (parte DESTRUCTIVA, ADR-052 superseded)
-- ============================================================================
-- 5a. Reporte por separado (NO aborta, NO decide; solo traza). Cada conteo se
--     emite en su propio RAISE NOTICE. Si la 030 no esta aplicada, los guards
--     lo omiten con NOTICE en vez de fallar.

DO $$
DECLARE
  v_guardados_con_carpeta bigint := 0;
  v_carpetas_activas      bigint := 0;
BEGIN
  IF to_regclass('public.media_guardados') IS NOT NULL
     AND EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema='public' AND table_name='media_guardados'
         AND column_name='carpeta_id'
     ) THEN
    SELECT COUNT(*) INTO v_guardados_con_carpeta
    FROM media_guardados WHERE carpeta_id IS NOT NULL;
    RAISE NOTICE 'migracion 032: SALVAGUARDA media_guardados con carpeta_id IS NOT NULL = %', v_guardados_con_carpeta;
  ELSE
    RAISE NOTICE 'migracion 032: SALVAGUARDA media_guardados.carpeta_id no existe; sin filas que reportar';
  END IF;

  IF to_regclass('public.guardados_carpetas') IS NOT NULL THEN
    SELECT COUNT(*) INTO v_carpetas_activas
    FROM guardados_carpetas WHERE activo = true;
    RAISE NOTICE 'migracion 032: SALVAGUARDA guardados_carpetas activas = %', v_carpetas_activas;
  ELSE
    RAISE NOTICE 'migracion 032: SALVAGUARDA guardados_carpetas no existe; sin filas que reportar';
  END IF;
END $$;

-- 5b. DROP de la columna carpeta_id (guarded por to_regclass: si
--     media_guardados no existe, el ALTER TABLE fallaria). El DROP de la
--     columna elimina en cascada el indice idx_media_guardados_carpeta de la
--     030; el DROP INDEX explicito es defensivo e idempotente.

DO $$
BEGIN
  IF to_regclass('public.media_guardados') IS NOT NULL THEN
    ALTER TABLE media_guardados DROP COLUMN IF EXISTS carpeta_id;
    RAISE NOTICE 'migracion 032: DROP media_guardados.carpeta_id (si existia)';
  ELSE
    RAISE NOTICE 'migracion 032: media_guardados no existe; se omite DROP carpeta_id';
  END IF;
END $$;

DROP INDEX IF EXISTS idx_media_guardados_carpeta;

-- 5c. DROP de la tabla guardados_carpetas (ADR-052 superseded). DROP TABLE
--     IF EXISTS es seguro e idempotente. El orden importa: primero cae la
--     columna carpeta_id (5b), que era la unica FK hacia esta tabla; por eso
--     NO se usa CASCADE.

DROP TABLE IF EXISTS guardados_carpetas;

-- ============================================================================
-- VERIFICACION POST-APLICACION (solo lectura; NO modifica nada). Copiar y
-- correr sentencia por sentencia en el editor de Neon.
-- ============================================================================
-- (a) 2 columnas presentes: album_id uuid nullable (YES) y visible boolean NOT
--     NULL con default false. Esperado: 2 filas.
-- SELECT column_name, data_type, is_nullable, column_default
--   FROM information_schema.columns
--   WHERE table_schema='public' AND table_name='media_guardados'
--     AND column_name IN ('album_id','visible')
--   ORDER BY column_name;
--
-- (b) FK media_guardados_album_id_fkey con ON DELETE SET NULL. Esperado: 1 fila
--     y def LIKE '%REFERENCES albumes(id) ON DELETE SET NULL%'.
-- SELECT conname, pg_get_constraintdef(oid) AS def
--   FROM pg_constraint
--   WHERE conname='media_guardados_album_id_fkey'
--     AND conrelid='public.media_guardados'::regclass;
--
-- (c) CHECK media_guardados_visible_album_chk. Esperado: 1 fila con
--     def LIKE '%visible%album_id%'.
-- SELECT conname, pg_get_constraintdef(oid) AS def
--   FROM pg_constraint
--   WHERE conname='media_guardados_visible_album_chk'
--     AND conrelid='public.media_guardados'::regclass;
--
-- (d) 2 indices nuevos. Esperado: 2 filas.
-- SELECT indexname, indexdef FROM pg_indexes
--   WHERE schemaname='public'
--     AND indexname IN ('idx_media_guardados_album',
--                       'idx_media_guardados_album_publico')
--   ORDER BY indexname;
--
-- (e) Invariante de publicacion: ningun guardado visible sin album. Esperado: 0.
-- SELECT COUNT(*) AS visibles_sin_album
--   FROM media_guardados
--   WHERE visible = true AND album_id IS NULL;
--
-- (f) DROP confirmado: guardados_carpetas ya NO existe (esperado NULL) y
--     media_guardados.carpeta_id ya NO existe (esperado 0 filas).
-- SELECT to_regclass('public.guardados_carpetas') AS tabla_eliminada;
-- SELECT column_name FROM information_schema.columns
--   WHERE table_schema='public' AND table_name='media_guardados'
--     AND column_name='carpeta_id';
--
-- (g) Idempotencia global: re-ejecutar TODO el archivo y volver a correr
--     (a)-(f): los resultados deben ser IDENTICOS (no-op seguro).
