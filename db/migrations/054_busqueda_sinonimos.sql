-- ============================================================================
-- 054_busqueda_sinonimos.sql
--
-- QUE HACE, EN UNA FRASE
--   Crea la tabla editable public.busqueda_sinonimos (ADR-090 D5, Enmienda
--   Wave 2 A2), la siembra con un set minimo de sinonimos de geografia /
--   ciudades de Colombia (ON CONFLICT idempotente) y crea los DOS indices
--   sociales parciales de interacciones que sirven la co-ocurrencia de D10
--   (Enmienda Wave 2 A5).
--
-- ADR / DECISIONES QUE RESPETA (tal cual, no se reabren)
--   ADR-090 D5 + Enmienda Wave 2 A2: tabla busqueda_sinonimos con id bigserial,
--     termino_norm, canonico_norm, tipo CHECK IN ('termino','categoria','zona',
--     'precio'), peso numeric(4,2), activo boolean, creado_en timestamptz.
--     termino_norm / canonico_norm se cargan SIEMPRE con exploraco_norm()
--     (funcion de la 053). Indice unico parcial (termino_norm) WHERE activo.
--     Expansion en busqueda.js: se ANADE canonico_norm como token alternativo,
--     nunca se reemplaza el original. Deny-list de tags_norm NO entra aqui.
--   Enmienda Wave 2 A5: DOS indices parciales sobre interacciones,
--     (destino_id, usuario_id) y (usuario_id, destino_id), ambos WHERE
--     activo = true. status='published' NO va en el predicado (un indice
--     parcial no puede referenciar otra tabla): se filtra por JOIN a destinos
--     en la consulta de co-ocurrencia. 054 UNICA: NO se crea una 055.
--   ADR-003: Cero Borrado Logico. Nunca se elimina una fila ni un ID: un
--     sinonimo se desactiva (activo=false), no se borra. tags NUNCA se toca.
--   ADR-002: ASCII-safe. Cero bytes > 127 en el fichero: no hay diacriticos
--     directos; los terminos se escriben ya en ASCII / normalizados.
--   ADR-008: idempotente. CREATE TABLE / INDEX IF NOT EXISTS + seed con
--     ON CONFLICT: re-ejecutar el archivo COMPLETO es no-op funcional.
--   ADR-006: el esquema real manda. interacciones.usuario_id, destino_id y
--     activo verificados en el repo (003, 012, 017) antes de emitir el DDL.
--
-- PREDECESORA / ESTADO DEL LEDGER
--   N-1 efectivo = 053_busqueda_normalizada.sql, presente en disco. El hueco
--   052 (reubicado fuera del scan) ya se tolera: el runner usa el mayor
--   predecesor EN DISCO, no N-1 aritmetico. La aplicacion en Neon la autoriza
--   el operador; este fichero NO se aplica solo.
--
-- CARACTER
--   Aditiva. Sin DELETE, sin TRUNCATE, sin DROP de datos. Forward-only.
--
-- ROLLBACK (emergencia; LOSSY: borra la tabla y sus indices)
--   DROP INDEX IF EXISTS public.idx_interacciones_usuario_destino;
--   DROP INDEX IF EXISTS public.idx_interacciones_destino_usuario;
--   DROP TABLE IF EXISTS public.busqueda_sinonimos;
--   No va en el flujo normal. No hay datos de usuario que respaldar: el seed
--   es re-creable desde este fichero.
-- ============================================================================

-- ============================================================================
-- 0. PREFLIGHT (solo lectura; aborta con mensaje claro si falta el objeto).
--    Re-ejecutar la migracion lo vuelve a correr sin efecto.
-- ============================================================================
DO $mig054pre$
BEGIN
  IF to_regclass('public.interacciones') IS NULL THEN
    RAISE EXCEPTION
      '054: public.interacciones NO existe. Esta migracion crea indices sobre ella. Se aborta.';
  END IF;

  IF to_regprocedure('public.exploraco_norm(text)') IS NULL THEN
    RAISE EXCEPTION
      '054: falta public.exploraco_norm(text), que crea la 053. Se aborta.';
  END IF;

  RAISE NOTICE 'migracion 054: preflight OK (interacciones y exploraco_norm presentes)';
END
$mig054pre$;

-- ============================================================================
-- 1. TABLA busqueda_sinonimos (ADR-090 D5 / Enmienda A2). Esquema exacto del
--    contrato. activo=true es la semantica (ADR-003: desactivar, no borrar).
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.busqueda_sinonimos (
  id            bigserial PRIMARY KEY,
  termino_norm  text NOT NULL,
  canonico_norm text NOT NULL,
  tipo          varchar(20) NOT NULL DEFAULT 'termino'
                CHECK (tipo IN ('termino','categoria','zona','precio')),
  peso          numeric(4,2) NOT NULL DEFAULT 1.00,
  activo        boolean NOT NULL DEFAULT true,
  creado_en     timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.busqueda_sinonimos IS
  'ADR-090 D5 / Enmienda Wave 2 A2: diccionario editable de sinonimos de busqueda. busqueda.js anade canonico_norm como token alternativo del termino_norm. Cero Borrado Logico: se desactiva con activo=false, nunca se borra fila.';

-- ============================================================================
-- 2. INDICES DE LA TABLA (ADR-090 D5 / Enmienda A2).
--    Unico parcial (termino_norm) WHERE activo = true: es el destino del
--    ON CONFLICT del seed, con el MISMO predicado.
-- ============================================================================
CREATE UNIQUE INDEX IF NOT EXISTS uq_busqueda_sinonimos_termino
  ON public.busqueda_sinonimos (termino_norm) WHERE activo = true;

CREATE INDEX IF NOT EXISTS idx_busqueda_sinonimos_canonico
  ON public.busqueda_sinonimos (canonico_norm);

-- ============================================================================
-- 3. SEED INICIAL (mismo fichero 054, confirmado por el operador).
--    Set minimo de sinonimos de geografia / ciudades de Colombia. El mecanismo
--    es extensible: nuevas filas se anaden con el mismo ON CONFLICT.
--    termino_norm y canonico_norm SIEMPRE normalizados con exploraco_norm().
--    Idempotencia: apunta al indice unico parcial con su mismo WHERE activo.
--    Reejecutar la 054 no duplica; actualiza canonico_norm/tipo/peso.
-- ============================================================================
INSERT INTO public.busqueda_sinonimos (termino_norm, canonico_norm, tipo, peso)
VALUES
  (public.exploraco_norm('medallo'),            public.exploraco_norm('medellin'),    'zona',    1.00),
  (public.exploraco_norm('paisa'),              public.exploraco_norm('medellin'),    'termino', 0.70),
  (public.exploraco_norm('santafe de bogota'),  public.exploraco_norm('bogota'),      'zona',    1.00),
  (public.exploraco_norm('bog'),                public.exploraco_norm('bogota'),      'zona',    0.80),
  (public.exploraco_norm('rolo'),               public.exploraco_norm('bogota'),      'termino', 0.70),
  (public.exploraco_norm('cartagena de indias'),public.exploraco_norm('cartagena'),   'zona',    1.00),
  (public.exploraco_norm('curramba'),           public.exploraco_norm('barranquilla'),'zona',    0.90),
  (public.exploraco_norm('currambero'),         public.exploraco_norm('barranquilla'),'termino', 0.70),
  (public.exploraco_norm('la arenosa'),         public.exploraco_norm('barranquilla'),'zona',    0.80),
  (public.exploraco_norm('san andres islas'),   public.exploraco_norm('san andres'),  'zona',    1.00),
  (public.exploraco_norm('isla de san andres'), public.exploraco_norm('san andres'),  'zona',    1.00),
  (public.exploraco_norm('santa cruz de mompox'),public.exploraco_norm('mompox'),     'zona',    1.00),
  (public.exploraco_norm('samario'),            public.exploraco_norm('santa marta'), 'termino', 0.70),
  (public.exploraco_norm('caleno'),             public.exploraco_norm('cali'),        'termino', 0.70),
  (public.exploraco_norm('villa de leyva'),     public.exploraco_norm('villa de leyva'),'zona',  1.00)
ON CONFLICT (termino_norm) WHERE activo = true
DO UPDATE SET
  canonico_norm = EXCLUDED.canonico_norm,
  tipo          = EXCLUDED.tipo,
  peso          = EXCLUDED.peso;

-- ============================================================================
-- 4. INDICES SOCIALES SOBRE interacciones (Enmienda Wave 2 A5).
--    Ambos parciales WHERE activo = true (ADR-003: se desactiva, no se borra).
--    status='published' NO va aqui: se filtra por JOIN a destinos en consulta.
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_interacciones_destino_usuario
  ON public.interacciones (destino_id, usuario_id) WHERE activo = true;

CREATE INDEX IF NOT EXISTS idx_interacciones_usuario_destino
  ON public.interacciones (usuario_id, destino_id) WHERE activo = true;

-- ============================================================================
-- 5. VERIFICACION POST-APLICACION (solo lectura; NO se ejecuta aqui).
--    Copiar y correr en el editor de Neon, UNA sentencia por bloque.
-- ============================================================================
-- (a) La tabla (esperada 1 fila, 7 columnas):
-- SELECT column_name, data_type, is_nullable FROM information_schema.columns
--   WHERE table_schema='public' AND table_name='busqueda_sinonimos'
--   ORDER BY ordinal_position;
--
-- (b) Los 3 indices de la tabla (esperadas 3 filas):
-- SELECT indexname FROM pg_indexes
--   WHERE schemaname='public' AND tablename='busqueda_sinonimos'
--     AND indexname IN ('busqueda_sinonimos_pkey','uq_busqueda_sinonimos_termino',
--                       'idx_busqueda_sinonimos_canonico')
--   ORDER BY indexname;
--
-- (c) Los 2 indices sociales (esperadas 2 filas):
-- SELECT indexname FROM pg_indexes
--   WHERE schemaname='public' AND tablename='interacciones'
--     AND indexname IN ('idx_interacciones_destino_usuario',
--                       'idx_interacciones_usuario_destino')
--   ORDER BY indexname;
--
-- (d) El seed (esperado = numero de filas del VALUES):
-- SELECT count(*) FROM public.busqueda_sinonimos WHERE activo = true;
--
-- (e) Idempotencia global: re-ejecutar TODO el archivo y volver a correr (a)-(d);
--     los conteos y valores deben ser IDENTICOS.
-- ============================================================================
-- FIN 054
-- ============================================================================
