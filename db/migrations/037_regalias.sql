-- ============================================================================
-- Migration 037: Regalias pasivas (acumulacion de XP por medios / espacios)
-- Fecha: 2026-09-23
-- Referencias: ADR-002 (ASCII-safe), ADR-003 (Cero Borrado Logico y merge
--   JSONB), ADR-006 (baseline = esquema REAL auditado antes de escribir),
--   ADR-008 (gobernanza e idempotencia de esquema), ADR-018/ADR-035/ADR-053
--   (la moneda es usuarios.xp_total numeric(12,2); regalias.xp_acumulado usa
--   numeric(12,2) por consistencia), BUG-026 (emojis en SQL nunca como bytes
--   UTF-8 directos), BUG-021 / BUG-060 (patron: migracion completa ANTES del
--   deploy).
-- Requiere: usuarios (PK uuid), album_fotos (009) y destinos (tabla base con
--   tags JSONB, ADR-003). El backfill esta GUARDADO con to_regclass e
--   information_schema (patron de 023/030/031/032): si album_fotos, destinos o
--   su columna tags no existieran en un entorno, se omite el bloque con NOTICE
--   en vez de fallar con 42P01 / 42703.
--
-- QUE HACE
--   1. Crea regalias: acumulacion de XP pasivo por fuente/item y autor.
--   2. UNIQUE (fuente, item_id) + indice por autor + indice parcial de
--      pendientes (reclamado_en IS NULL).
--   3. Backfill idempotente de autores ACTUALES desde album_fotos (fuente
--      'album_foto') y destinos (fuente 'destino').
--
-- DECISION DE PATRON (guardas defensivas)
--   Se usa el patron de DO block con IF to_regclass(...) IS NULL THEN RETURN,
--   ya establecido en 023/030/031/032, y NO el EXCEPTION WHEN
--   undefined_table/undefined_column: es explicito, deja un NOTICE trazable y
--   evita capturar errores ajenos al guard. Para destinos.tags se valida ademas
--   con information_schema.columns. Si falta la tabla o la columna, el bloque
--   emite NOTICE y termina sin tocar datos (la tabla regalias igual queda
--   creada, lista para que el backend acumule a partir de ahora).
--
-- CARACTER DE LA MIGRACION
--   ADITIVA: solo CREATE TABLE / CREATE INDEX / INSERT ... ON CONFLICT DO
--   NOTHING. No elimina, no renombra, no toca objetos previos. SIN DELETE, SIN
--   DROP, SIN TRUNCATE (Cero Borrado Logico, ADR-003).
--   IDEMPOTENTE (ADR-008): CREATE TABLE IF NOT EXISTS; CREATE [UNIQUE] INDEX
--   IF NOT EXISTS; el backfill usa ON CONFLICT (fuente, item_id) DO NOTHING.
--   Re-ejecutar el archivo COMPLETO es no-op funcional (N veces).
--   ASCII-SAFE (ADR-002): cero bytes > 127, cero tildes, cero ene con tilde,
--   cero emojis, cero escapes unicode, cero backticks (BUG-026).
--
-- SEMANTICA (contrato)
--   - fuente: origen del recurso que genera regalias ('album_foto' desde
--     album_fotos, 'destino' desde destinos). varchar(20).
--   - item_id: id del recurso en texto (uuid::text). Junto con fuente forma la
--     clave natural UNIQUE.
--   - autor_id: usuario al que se le acumulan las regalias (autor original o,
--     en su defecto, el agregador de la foto; para destinos, el autor guardado
--     en destinos.tags->>'autor_id').
--   - xp_acumulado: numeric(12,2) NOT NULL DEFAULT 0 (NO es una moneda nueva:
--     es un saldo derivado que al reclamarse se acredita a usuarios.xp_total;
--     coherente con ADR-018).
--   - reclamado_en: NULL = pendiente de reclamo; con timestamp = ya liquidado.
--     El indice parcial idx_regalias_pendientes optimiza "pendientes de autor".
--   - actualizado_en / creado_en: timestamptz DEFAULT now().
--   FK autor_id -> usuarios(id): sin ON DELETE (el proyecto usa Cero Borrado
--   Logico; se conserva la FK para no dejar filas sin dueno).
--
-- APLICACION
--   Correr este archivo COMPLETO en el editor SQL de Neon (o con
--   scripts/apply_sql_file.js) DESPUES de la 036. Patron BUG-021 / BUG-060:
--   archivo COMPLETO en una sola corrida. Re-ejecutarlo es no-op funcional.
-- ============================================================================

-- ============================================================================
-- 0. PREFLIGHT (SOLO LECTURA; NO forma parte del DDL; NO se ejecuta solo).
--    Copiar y correr sentencia por sentencia ANTES de aplicar la 037.
-- ============================================================================
-- (0.a) Confirmar que la tabla regalias aun NO existe. Esperado antes: 0
--       filas; despues: 1 fila.
-- SELECT tablename FROM pg_tables
--   WHERE schemaname='public' AND tablename='regalias';
--
-- (0.b) Confirmar los predecesores logicos. Esperadas 3 filas (usuarios,
--       album_fotos, destinos):
-- SELECT table_name FROM information_schema.tables
--   WHERE table_schema='public'
--     AND table_name IN ('usuarios','album_fotos','destinos')
--   ORDER BY table_name;
--
-- (0.c) Confirmar que destinos.tags existe y es JSONB (esperada 1 fila):
-- SELECT column_name, data_type FROM information_schema.columns
--   WHERE table_schema='public' AND table_name='destinos'
--     AND column_name='tags';
--
-- (0.d) Volumen proyectado del backfill (informativo; solo si los
--       predecesores existen):
-- SELECT COUNT(*) AS fotos_con_autor FROM album_fotos
--   WHERE COALESCE(autor_original_id, agregador_id) IS NOT NULL;

-- ============================================================================
-- 1. TABLA regalias (acumulacion de XP pasivo)
-- ============================================================================
-- id uuid PK con gen_random_uuid(). La clave natural es (fuente, item_id) y se
-- garantiza con el indice unico de la seccion 2. autor_id nullable
-- (aunque el backfill lo exige NOT NULL en la practica): permite una fila sin
-- dueno conocido sin romper la acumulacion por item. Los timestamps llevan
-- DEFAULT now().

CREATE TABLE IF NOT EXISTS regalias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fuente varchar(20) NOT NULL,
  item_id text NOT NULL,
  autor_id uuid REFERENCES usuarios(id),
  xp_acumulado numeric(12,2) NOT NULL DEFAULT 0,
  reclamado_en timestamptz,
  actualizado_en timestamptz DEFAULT now(),
  creado_en timestamptz DEFAULT now()
);

-- ============================================================================
-- 2. INDICES (clave natural + autor + pendientes)
-- ============================================================================
-- uq_regalias_fuente_item: un solo saldo de regalias por (fuente, item_id);
--   es el destino del ON CONFLICT del backfill.
-- idx_regalias_autor: consultas de "regalias de un autor".
-- idx_regalias_pendientes: parcial; solo las filas sin reclamar (reclamado_en
--   IS NULL), que es el caso de lectura caliente del reclamo.

CREATE UNIQUE INDEX IF NOT EXISTS uq_regalias_fuente_item
  ON regalias (fuente, item_id);

CREATE INDEX IF NOT EXISTS idx_regalias_autor
  ON regalias (autor_id);

CREATE INDEX IF NOT EXISTS idx_regalias_pendientes
  ON regalias (autor_id) WHERE reclamado_en IS NULL;

-- ============================================================================
-- 3. BACKFILL IDEMPOTENTE DE AUTORES ACTUALES
-- ============================================================================
-- Semilla de saldos en CERO para los recursos que ya existen; NO se inventa XP
-- historico (el XP pasado ya fue entregado por otras vias). ON CONFLICT
-- (fuente, item_id) DO NOTHING: re-ejecutar no pisa un saldo ya acumulado por
-- el backend.

-- 3.1 album_fotos -> fuente 'album_foto'
--   author = COALESCE(autor_original_id, agregador_id); se omite si es NULL.
--   item_id = af.id::text.
DO $$
BEGIN
  IF to_regclass('public.album_fotos') IS NULL THEN
    RAISE NOTICE 'migracion 037: album_fotos no existe; se omite backfill album_foto';
    RETURN;
  END IF;

  INSERT INTO regalias (fuente, item_id, autor_id, xp_acumulado)
  SELECT 'album_foto',
         af.id::text,
         COALESCE(af.autor_original_id, af.agregador_id),
         0
  FROM album_fotos af
  WHERE COALESCE(af.autor_original_id, af.agregador_id) IS NOT NULL
  ON CONFLICT (fuente, item_id) DO NOTHING;

  RAISE NOTICE 'migracion 037: backfill album_foto completado';
END $$;

-- 3.2 destinos -> fuente 'destino'
--   autor desde destinos.tags->>'autor_id' con GUARDA de formato uuid
--   ('^[0-9a-fA-F-]{36}$'); si no cumple, autor_id queda NULL y la fila se
--   omite. Ademas se exige que el uuid exista en usuarios (EXISTS) para no
--   violar la FK regalias.autor_id -> usuarios(id) con un id huerfano. item_id
--   = d.id::text. Guard doble: tabla destinos y columna destinos.tags.
DO $$
BEGIN
  IF to_regclass('public.destinos') IS NULL THEN
    RAISE NOTICE 'migracion 037: destinos no existe; se omite backfill destino';
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'destinos'
      AND column_name = 'tags'
  ) THEN
    RAISE NOTICE 'migracion 037: destinos.tags no existe; se omite backfill destino';
    RETURN;
  END IF;

  INSERT INTO regalias (fuente, item_id, autor_id, xp_acumulado)
  SELECT 'destino',
         d.id::text,
         sub.autor_id,
         0
  FROM destinos d
  CROSS JOIN LATERAL (
    SELECT CASE
             WHEN (d.tags->>'autor_id') ~ '^[0-9a-fA-F-]{36}$'
             THEN (d.tags->>'autor_id')::uuid
             ELSE NULL
           END AS autor_id
  ) sub
  WHERE sub.autor_id IS NOT NULL
    AND EXISTS (SELECT 1 FROM usuarios u WHERE u.id = sub.autor_id)
  ON CONFLICT (fuente, item_id) DO NOTHING;

  RAISE NOTICE 'migracion 037: backfill destino completado';
END $$;

-- ============================================================================
-- VERIFICACION POST-APLICACION (solo lectura; NO se ejecuta dentro de la
-- migracion; NO modifica nada). Copiar y correr sentencia por sentencia.
-- ============================================================================
-- (a) Tabla regalias: columnas (esperadas 8 filas, en el orden del contrato):
-- SELECT column_name, data_type, is_nullable, column_default
--   FROM information_schema.columns
--   WHERE table_schema='public' AND table_name='regalias'
--   ORDER BY ordinal_position;
--
-- (b) Indices creados (esperadas 3 filas):
-- SELECT indexname FROM pg_indexes
--   WHERE schemaname='public'
--     AND indexname IN ('uq_regalias_fuente_item','idx_regalias_autor',
--                       'idx_regalias_pendientes')
--   ORDER BY indexname;
--
-- (c) Total y distribucion por fuente:
-- SELECT COUNT(*) AS total_regalias FROM regalias;
-- SELECT fuente, COUNT(*) AS n, COUNT(autor_id) AS con_autor,
--        SUM(CASE WHEN reclamado_en IS NULL THEN 1 ELSE 0 END) AS pendientes
--   FROM regalias
--   GROUP BY fuente
--   ORDER BY fuente;
--
-- (d) Pendientes de reclamo (esperado = total, porque el backfill siembra
--     reclamado_en NULL):
-- SELECT COUNT(*) AS pendientes FROM regalias WHERE reclamado_en IS NULL;
--
-- (e) Integridad del backfill (esperado 0 filas: ningun saldo sembrado con XP
--     distinto de 0 ni item_id vacio):
-- SELECT id, fuente, item_id, xp_acumulado FROM regalias
--   WHERE xp_acumulado <> 0 OR item_id = '' OR item_id IS NULL;
--
-- (f) Idempotencia global: re-ejecutar TODO el archivo y volver a correr
--     (a)-(e): los conteos y valores deben ser IDENTICOS (no-op funcional).
