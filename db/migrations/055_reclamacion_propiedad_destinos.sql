-- ============================================================================
-- 055_reclamacion_propiedad_destinos.sql
--
-- QUE HACE, EN UNA FRASE
--   Anade a public.destinos las CINCO columnas de propiedad y pozo del ADR-091
--   (es_reclamable, dueno_id, xp_pozo_acumulado, estado_reclamacion,
--   pozo_actualizado_en), sus DOS indices, y crea la tabla
--   public.reclamaciones_propiedad con sus TRES indices, incluido el UNICO
--   PARCIAL que garantiza una sola solicitud abierta por recurso.
--
-- ADR
--   ADR-091 (DECISIONS.md, seccion "## ADR-091"). Este fichero implementa solo
--   la capa de ESQUEMA. NO implementa la economy del pozo, ni el cooldown, ni la
--   bandeja de moderacion, ni el cobro: eso es backend escrito en paralelo
--   contra este CONTRATO EXACTO de columnas. Cualquier desvio aqui rompe la
--   integracion, por eso no se anade ninguna columna extra.
--
-- PREDECESORA
--   054_busqueda_sinonimos.sql. scripts/apply_sql_file.js exige que el numero
--   N-1 exista EN DISCO y tenga fila valida en schema_migrations (resultado
--   aplicada / historico_no_verificado). El hueco 052 esta reubicado fuera del
--   scan y el runner usa el MAYOR predecesor presente en disco, luego no
--   bloquea. Este fichero es el 055, el siguiente libre (el 045 es el ledger).
--
-- POR QUE SOLO ALTER TABLE ADD COLUMN IF NOT EXISTS sobre destinos
--   El DDL base de public.destinos NO esta en el repo: la tabla es preexistente
--   (asi la ven las migraciones, p.ej. 040:337 REFERENCES destinos(id)). Por eso
--   aqui no hay CREATE TABLE ni definicion completa: solo se ENSANCHA. La
--   referencia de columnas vigentes esta en api/admin-destinos.js:260-270.
--
-- POR QUE dueno_id con ON DELETE SET NULL y no CASCADE
--   El recurso (destino, foto) no puede morir porque borre su dueno. SET NULL
--   deja el destino REIVINDICABLE otra vez, que es justo lo que dice el nombre
--   de la columna (es_reclamable) y lo que evita el huerfano silencioso. CASCADE
--   borraria destinos de produccion por un borrado de cuenta.
--
-- POR QUE el indice UNIQUE es PARCIAL (WHERE estado = 'pendiente')
--   Es el control anti-abuso (b) del ADR-091: una sola solicitud ABIERTA por
--   recurso. Resuelta (aprobada o rechazada) la solicitud ya no ocupa plaza, y
--   con unicidad TOTAL un recurso nunca podria volver a reclamarse. Por eso el
--   indice se crea DENTRO de un DO: si al ejecutarlo hay dos pendientes sobre
--   el mismo recurso, el fallo debe venir del CREATE (23505) y no del
--   IF NOT EXISTS, que se lo tragaria en silencio. El backend hace ON CONFLICT
--   contra este indice con ESTE predicado.
--
-- CARACTER DE LA MIGRACION
--   Aditiva y forward-only. Cero DELETE (ADR-003), cero TRUNCATE, cero UPDATE de
--   datos, cero DROP. Los DEFAULT hacen el backfill implicito de los destinos
--   existentes: es_reclamable=true, dueno_id=NULL, xp_pozo_acumulado=0,
--   estado_reclamacion='disponible', pozo_actualizado_en=NULL. El ultimo queda
--   en blanco a proposito: es la marca de "pozo nunca acumulado" que usa la
--   auto-expiracion perezosa (un NULL no ha caducado nunca, y las filas nuevas
--   lo escribiran al primer reparto).
--
-- LO QUE ESTA MIGRACION NO TOCA (deliberado)
--   - NO crea la tabla admin_usuarios: verificada ausente en todas las
--     migraciones, y crearla aqui seria otro ADR.
--   - NO toca spot_dividendos ni su CHECK vigente
--     monto_descontado <= xp_bruto_base * 0.50 (040:353-373).
--   - NO anade columnas de configuracion ni filas de semilla.
--
-- RLS
--   SIN RLS, igual que destinos y usuarios. La garantia de "una sola
--   solicitud abierta" la da el indice unico parcial, no una politica: RLS
--   filtra filas por politica, no valida unicidad.
--
-- ASCII (ADR-002)
--   Este fichero es ASCII puro: 0 bytes con ordinal > 127, sin BOM.
--
-- LEDGER
--   Esta migracion NO lleva sentencia propia de registro en schema_migrations:
--   la escribe el runner scripts/apply_sql_file.js en su funcion registrar(),
--   que es el unico que escribe checksum y duracion_ms.
--
-- ============================================================================

-- ============================================================================
-- 0. PREFLIGHT (solo lectura; aborta con mensaje claro si falta el objeto).
--    Re-ejecutar la migracion lo vuelve a correr sin efecto.
-- ============================================================================
DO $mig055pre$
DECLARE
  v_filas_destinos integer;
BEGIN
  IF to_regclass('public.destinos') IS NULL THEN
    RAISE EXCEPTION
      '055: public.destinos NO existe. Esta migracion solo la enriquece. Se aborta.';
  END IF;

  IF to_regclass('public.usuarios') IS NULL THEN
    RAISE EXCEPTION
      '055: public.usuarios NO existe, luego dueno_id y solicitante_id no pueden declarar su FK. Se aborta.';
  END IF;

  SELECT count(*) INTO v_filas_destinos FROM public.destinos;

  RAISE NOTICE 'migracion 055: preflight OK (destinos existe, % fila(s) lecturas; usuarios existe)', v_filas_destinos;
END
$mig055pre$;

-- ============================================================================
-- 1. COLUMNAS DE PROPIEDAD Y POZO SOBRE public.destinos.
--    Idempotente por ADD COLUMN IF NOT EXISTS: reejecutar no falla aqui.
--    Los CHECK van aparte, en su propio bloque idempotente (seccion 2), porque
--    un CHECK declarado dentro del ADD solo se crea la PRIMERA vez.
-- ============================================================================
ALTER TABLE public.destinos
  ADD COLUMN IF NOT EXISTS es_reclamable boolean NOT NULL DEFAULT TRUE;

ALTER TABLE public.destinos
  ADD COLUMN IF NOT EXISTS dueno_id uuid NULL;

ALTER TABLE public.destinos
  ADD COLUMN IF NOT EXISTS xp_pozo_acumulado numeric(12,2) NOT NULL DEFAULT 0;

ALTER TABLE public.destinos
  ADD COLUMN IF NOT EXISTS estado_reclamacion varchar(20) NOT NULL DEFAULT 'disponible';

ALTER TABLE public.destinos
  ADD COLUMN IF NOT EXISTS pozo_actualizado_en timestamp NULL;

-- ============================================================================
-- 2. CHECKs Y FK DE LAS COLUMNAS DE destinos. Patron idempotente del repo:
--    se consulta pg_constraint y solo se anade lo que falta.
-- ============================================================================
DO $mig055ck$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'public.destinos'::regclass
       AND conname  = 'chk_destinos_xp_pozo_acumulado'
  ) THEN
    ALTER TABLE public.destinos
      ADD CONSTRAINT chk_destinos_xp_pozo_acumulado
      CHECK (xp_pozo_acumulado >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'public.destinos'::regclass
       AND conname  = 'chk_destinos_estado_reclamacion'
  ) THEN
    ALTER TABLE public.destinos
      ADD CONSTRAINT chk_destinos_estado_reclamacion
      CHECK (estado_reclamacion IN ('disponible','en_revision','reclamado','rechazado'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'public.destinos'::regclass
       AND conname  = 'fk_destinos_dueno_id'
  ) THEN
    ALTER TABLE public.destinos
      ADD CONSTRAINT fk_destinos_dueno_id
      FOREIGN KEY (dueno_id) REFERENCES public.usuarios(id) ON DELETE SET NULL;
  END IF;
END
$mig055ck$;

-- ============================================================================
-- 3. INDICES DE public.destinos.
--    (a) Parcial sobre (id) WHERE es_reclamable AND dueno_id IS NULL: el
--        hot-path de la acumulacion del pozo solo mira los destinos SIN dueno
--        que admiten reclamacion. Es parcial porque el resto de destinos jamas
--        entran en esa consulta.
--    (b) Normal sobre (dueno_id): "mis destinos" del panel de dueno.
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_destinos_reclamable_sin_dueno
  ON public.destinos (id)
  WHERE es_reclamable = TRUE AND dueno_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_destinos_dueno
  ON public.destinos (dueno_id);

-- ============================================================================
-- 4. TABLA public.reclamaciones_propiedad. Esquema exacto del contrato.
--    recurso_id es TEXT y no UUID a proposito: los tres tipos de recurso
--    (destino, album_foto, usuario_foto) no comparten clave, y asi la BD no
--    obliga a castear nada para guardarlos.
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.reclamaciones_propiedad (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  solicitante_id     uuid NOT NULL,
  recurso_tipo       varchar(30) NOT NULL
                     CONSTRAINT chk_reclamaciones_recurso_tipo
                     CHECK (recurso_tipo IN ('destino','album_foto','usuario_foto')),
  recurso_id         text NOT NULL,
  prueba_url         text NOT NULL,
  nota_solicitante   text,
  estado             varchar(20) NOT NULL DEFAULT 'pendiente'
                     CONSTRAINT chk_reclamaciones_estado
                     CHECK (estado IN ('pendiente','aprobada','rechazada')),
  xp_pozo_capturado  numeric(12,2)
                     CONSTRAINT chk_reclamaciones_pozo CHECK (xp_pozo_capturado >= 0),
  xp_bienvenida      numeric(12,2)
                     CONSTRAINT chk_reclamaciones_bienvenida CHECK (xp_bienvenida >= 0),
  resuelto_por       text,
  motivo_rechazo     text,
  revertido_en       timestamp,
  creado_en          timestamp NOT NULL DEFAULT NOW(),
  resuelto_en        timestamp,
  CONSTRAINT fk_reclamaciones_solicitante
    FOREIGN KEY (solicitante_id) REFERENCES public.usuarios(id)
);

-- ============================================================================
-- 5. INDICES DE public.reclamaciones_propiedad.
--    (a) UNICO PARCIAL (recurso_tipo, recurso_id) WHERE estado = 'pendiente':
--        control anti-abuso (b). Va dentro de un DO a proposito: CREATE UNIQUE
--        INDEX IF NOT EXISTS se tragaria en silencio el caso de dos pendientes
--        sobre el mismo recurso, y ese silencio seria perder la garantia entera.
--        Aqui el 23505 sale del CREATE y corta la migracion.
--    (b) (solicitante_id, creado_en DESC): cooldown por solicitante.
--    (c) (estado, creado_en DESC): cola de moderacion, la mas antigua primero.
-- ============================================================================
DO $mig055uq$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE c.relname = 'uq_reclamaciones_recurso_pendiente'
       AND n.nspname = 'public'
  ) THEN
    CREATE UNIQUE INDEX uq_reclamaciones_recurso_pendiente
      ON public.reclamaciones_propiedad (recurso_tipo, recurso_id)
      WHERE estado = 'pendiente';
  END IF;
END
$mig055uq$;

CREATE INDEX IF NOT EXISTS idx_reclamaciones_solicitante_creado
  ON public.reclamaciones_propiedad (solicitante_id, creado_en DESC);

CREATE INDEX IF NOT EXISTS idx_reclamaciones_estado_creado
  ON public.reclamaciones_propiedad (estado, creado_en DESC);

-- ============================================================================
-- 6. EVIDENCIA POST-APLICACION (read-only, dentro del fichero). Avisa por NOTICE
--    que objetos quedaron. Si alguno falta, salta el WARNING y hay que mirarlo.
-- ============================================================================
DO $mig055ev$
DECLARE
  v_ck integer;
  v_ix integer;
BEGIN
  SELECT count(*) INTO v_ck
    FROM pg_constraint
   WHERE conrelid = 'public.destinos'::regclass
     AND conname IN ('chk_destinos_xp_pozo_acumulado',
                     'chk_destinos_estado_reclamacion',
                     'fk_destinos_dueno_id');

  SELECT count(*) INTO v_ix
    FROM pg_indexes
   WHERE schemaname = 'public'
     AND indexname IN ('idx_destinos_reclamable_sin_dueno',
                       'idx_destinos_dueno',
                       'uq_reclamaciones_recurso_pendiente',
                       'idx_reclamaciones_solicitante_creado',
                       'idx_reclamaciones_estado_creado');

  IF v_ck < 3 THEN
    RAISE WARNING '055: solo % de 3 constraints de destinos presentes. Revisa la seccion 2.', v_ck;
  END IF;

  IF v_ix < 5 THEN
    RAISE WARNING '055: solo % de 5 indices presentes. Revisa las secciones 3 y 5.', v_ix;
  END IF;

  RAISE NOTICE '055: constraints de destinos=% (de 3) e indices=% (de 5)', v_ck, v_ix;
END
$mig055ev$;

-- ============================================================================
-- 7. VERIFICACION DESPUES DE APLICAR (fuera del flujo; no se ejecuta aqui).
--
--     $env:NEON_QUERY="SELECT conname FROM pg_constraint
--                        WHERE conrelid='public.destinos'::regclass
--                          AND conname LIKE '%destinos%reclam%'
--                           OR conname LIKE 'fk_destinos_dueno%'";
--     -> chk_destinos_estado_reclamacion, chk_destinos_xp_pozo_acumulado,
--        fk_destinos_dueno_id
--
--     $env:NEON_QUERY="SELECT indexname, indexdef FROM pg_indexes
--                        WHERE tablename IN ('destinos','reclamaciones_propiedad')
--                          AND indexname LIKE '%reclam%'";
--     -> idx_destinos_reclamable_sin_dueno, idx_destinos_dueno,
--        uq_reclamaciones_recurso_pendiente, idx_reclamaciones_solicitante_creado,
--        idx_reclamaciones_estado_creado
--
--     PRUEBA DEL INDICE UNICO PARCIAL (dentro de transaccion con ROLLBACK):
--       BEGIN;
--       INSERT INTO public.reclamaciones_propiedad
--         (solicitante_id, recurso_tipo, recurso_id, prueba_url)
--       SELECT id, 'destino', 'prueba-055', 'https://ejemplo.invalid/x.jpg'
--         FROM public.usuarios LIMIT 1;
--       INSERT INTO public.reclamaciones_propiedad
--         (solicitante_id, recurso_tipo, recurso_id, prueba_url)
--       SELECT id, 'destino', 'prueba-055', 'https://ejemplo.invalid/x.jpg'
--         FROM public.usuarios LIMIT 1;
--       -- el SEGUNDO debe fallar: SQLSTATE 23505 unique_violation
--       ROLLBACK;
--
-- ============================================================================
-- ROLLBACK (emergencia; LOSSY: borra constraints, indices y la tabla).
--   Este bloque NO se ejecuta: esta comentado entero. No va en el flujo normal.
--   Los destinos vuelven a quedar sin dueno_id, y los indices de destinos caen
--   con sus columnas. Para no perder el pozo acumulado, exportalo antes.
--
--   ALTER TABLE public.reclamaciones_propiedad
--     DROP CONSTRAINT IF EXISTS fk_reclamaciones_solicitante;
--   DROP INDEX IF EXISTS public.idx_reclamaciones_estado_creado;
--   DROP INDEX IF EXISTS public.idx_reclamaciones_solicitante_creado;
--   DROP INDEX IF EXISTS public.uq_reclamaciones_recurso_pendiente;
--   DROP TABLE IF EXISTS public.reclamaciones_propiedad;
--
--   DROP INDEX IF EXISTS public.idx_destinos_dueno;
--   DROP INDEX IF EXISTS public.idx_destinos_reclamable_sin_dueno;
--   ALTER TABLE public.destinos DROP CONSTRAINT IF EXISTS fk_destinos_dueno_id;
--   ALTER TABLE public.destinos
--     DROP CONSTRAINT IF EXISTS chk_destinos_estado_reclamacion;
--   ALTER TABLE public.destinos
--     DROP CONSTRAINT IF EXISTS chk_destinos_xp_pozo_acumulado;
--   ALTER TABLE public.destinos DROP COLUMN IF EXISTS pozo_actualizado_en;
--   ALTER TABLE public.destinos DROP COLUMN IF EXISTS estado_reclamacion;
--   ALTER TABLE public.destinos DROP COLUMN IF EXISTS xp_pozo_acumulado;
--   ALTER TABLE public.destinos DROP COLUMN IF EXISTS dueno_id;
--   ALTER TABLE public.destinos DROP COLUMN IF EXISTS es_reclamable;
-- ============================================================================
-- FIN 055
-- ============================================================================