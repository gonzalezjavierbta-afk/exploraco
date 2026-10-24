-- ============================================================================
-- 056_home_hero_fotos.sql
--
-- QUE HACE, EN UNA FRASE
--   Crea la tabla public.home_hero_fotos: los SEIS slots fijos del modulo
--   "Hero del index" del panel, cada uno con su URL de foto, su leyenda y su
--   flag activa/inactiva, y siembra las seis filas vacias en el mismo fichero.
--
-- ALCANCE
--   Solo ESQUEMA + SEED de los slots. NO toca api/*.js, ni admin.html, ni el
--   contrato publico window.ExploraCOHero de la home, ni el motor de render.
--   El panel y el consumidor de la home leen esta tabla por QUERY PARAM sobre
--   una funcion serverless ya existente (presupuesto Vercel 8/8 agotado).
--
-- PREDECESORA
--   055_reclamacion_propiedad_destinos.sql, con fila 'aplicada' en
--   schema_migrations (verificado en produccion antes de escribir este
--   fichero). scripts/apply_sql_file.js exige que el MAYOR predecesor presente
--   en disco tenga fila valida. El hueco 052 esta reubicado en
--   db/migrations/documental/ y sale del scan, luego no bloquea. Este es el 056,
--   el siguiente numero libre (el 055 es el ultimo real en disco y en ledger).
--
-- POR QUE posicion ES LA CLAVE FUNCIONAL Y NO id
--   El panel edita SEIS celdas que existen siempre, en orden fijo. Si se
--   identificaran por id, borrar y recrear un slot cambiaria su identidad y la
--   home perderia el orden. Por eso posicion es smallint NOT NULL con CHECK
--   1..6 y UNIQUE: es el slot, no una fila cualquiera. El seed usa
--   ON CONFLICT (posicion) DO NOTHING y es idempotente por construccion.
--
-- POR QUE id bigserial
--   Las dos tablas de fotos del repo NO coinciden: destinos_fotos.id es
--   integer serial (nextval) y album_fotos.id es uuid gen_random_uuid(). Al no
--   haber un criterio unico para fotos, se aplica el fallback acordado para
--   esta migracion: id bigserial PRIMARY KEY. Es el tipo mas ancho del patron
--   serial y no condiciona nada aguas abajo porque el contrato real del modulo
--   es posicion.
--
-- POR QUE EL INDICE POR posicion NO SE CREA APARTE
--   La restriccion UNIQUE sobre posicion ya crea su indice B-tree, que es
--   exactamente el acceso del panel (ORDER BY posicion / WHERE posicion = N).
--   Un segundo indice identico solo costaria escrituras.
--
-- RLS
--   SIN RLS y SIN politicas y SIN GRANT, replicando el criterio REAL del repo:
--   verificado en produccion que public no tiene NINGUNA tabla con
--   relrowsecurity = true, y ninguna migracion del repo contiene ENABLE ROW
--   LEVEL SECURITY, CREATE POLICY ni GRANT (la 045 solo hace DISABLE sobre su
--   propio ledger). No se inventan politicas: esta tabla no es la excepcion.
--
-- CARACTER
--   Aditiva y forward-only. Cero DELETE, cero TRUNCATE, cero DROP, cero UPDATE
--   (ADR-003). Reejecutable: CREATE TABLE IF NOT EXISTS, constraints dentro de
--   DO con guarda en pg_constraint, y seed con ON CONFLICT DO NOTHING.
--
-- LEDGER
--   Este fichero NO escribe en schema_migrations: lo hace el runner
--   scripts/apply_sql_file.js con el sha256 de los bytes en disco.
--
-- ASCII (ADR-002)
--   ASCII puro: 0 bytes con ordinal > 127, sin BOM, sin backticks.
-- ============================================================================

-- ============================================================================
-- 1. TABLA public.home_hero_fotos. Contrato exacto del modulo del panel.
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.home_hero_fotos (
  id             bigserial PRIMARY KEY,
  posicion       smallint   NOT NULL,
  url            text       NOT NULL DEFAULT '',
  caption        text       NOT NULL DEFAULT '',
  activa         boolean    NOT NULL DEFAULT false,
  actualizado_en timestamptz NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 2. CONSTRAINTS. Patron idempotente del repo (055 seccion 2): se consulta
--    pg_constraint y solo se anade lo que falta. Van fuera del CREATE para que
--    una tabla preexistente sin ellas se complete en vez de quedarse a medias.
-- ============================================================================
DO $mig056ck$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'public.home_hero_fotos'::regclass
       AND conname  = 'chk_home_hero_fotos_posicion'
  ) THEN
    ALTER TABLE public.home_hero_fotos
      ADD CONSTRAINT chk_home_hero_fotos_posicion
      CHECK (posicion >= 1 AND posicion <= 6);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'public.home_hero_fotos'::regclass
       AND conname  = 'uq_home_hero_fotos_posicion'
  ) THEN
    ALTER TABLE public.home_hero_fotos
      ADD CONSTRAINT uq_home_hero_fotos_posicion UNIQUE (posicion);
  END IF;
END
$mig056ck$;

-- ============================================================================
-- 3. SEED DE LOS SEIS SLOTS. posicion 1..6, url y caption vacias, inactivas.
--    ON CONFLICT (posicion) DO NOTHING: reejecutar no pisa lo que el operador
--    haya configurado en el panel. Cero UPDATE, cero DELETE.
-- ============================================================================
INSERT INTO public.home_hero_fotos (posicion, url, caption, activa) VALUES
  (1, '', '', false),
  (2, '', '', false),
  (3, '', '', false),
  (4, '', '', false),
  (5, '', '', false),
  (6, '', '', false)
ON CONFLICT (posicion) DO NOTHING;

-- ============================================================================
-- 4. POSTCONDICION (solo lectura). Si el seed no dejo seis filas, la migracion
--    NO se da por buena: aborta y deja la fila del ledger en 'fallida'.
-- ============================================================================
DO $mig056post$
DECLARE
  v_total    integer;
  v_activas  integer;
BEGIN
  SELECT count(*) INTO v_total FROM public.home_hero_fotos;
  SELECT count(*) INTO v_activas FROM public.home_hero_fotos WHERE activa;

  IF v_total < 6 THEN
    RAISE EXCEPTION
      '056: postcondicion fallida, home_hero_fotos tiene % fila(s) y se esperaban al menos 6.', v_total;
  END IF;

  RAISE NOTICE 'migracion 056: OK, % fila(s) en home_hero_fotos, % activa(s)', v_total, v_activas;
END
$mig056post$;
