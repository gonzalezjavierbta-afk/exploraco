-- ============================================================================
-- Migration 060: cartas - EXPANSION del emisor (sistema / ugc / marca), la
--   variante base / shiny por carta, el Museo publico de 12 y la fusionabilidad
--   por carta. SOLO EXPANSION: la PK de usuarios_cartas NO se toca.
-- Fecha: 2026-10-27
-- Referencias: ADR-108 (D1 esquema, D2 semantica de stats_json, D3 FK
--   ON DELETE RESTRICT, D4/D19 ancla del drop, D6/D10 tope 12 arbitrado en la
--   BASE, D12 expand/contract, D13 semantica de activo, D16 set de sistema
--   sembrado). ADR-002 (ASCII-safe: cero bytes > 127), ADR-003 (cero borrado
--   logico), ADR-006 (baseline = archivo real), ADR-008 (idempotencia).
-- Requiere: 027 (marcas), 040 (cartas_catalogo, usuarios_cartas, cartas_gates),
--   041 (cartas_ofertas, cartas_ventas), 045 (schema_migrations, ledger).
--
-- PROPOSITO (seis bloques del checklist, siete pasos fisicos)
--   1. usuarios_cartas: columnas variante / en_museo / orden_museo, el UNIQUE
--      de 3 columnas que la 061 promocionara a PK y el tope del museo.
--   2. cartas_catalogo: el emisor (emisor_tipo, emisor_id, marca_id con FK
--      RESTRICT), descripcion, stats_json, es_canjeable_qr y fusionable con
--      sus CHECK de coherencia.
--   3. cartas_gates: columna drop_en, ancla de idempotencia del drop.
--   4. cartas_ofertas y cartas_ventas: columna variante (transporte, Deuda D-2).
--   5. Backfill: el UNICO UPDATE permitido de este fichero (fusionable, que no
--      es derivable de un DEFAULT porque depende de otras columnas).
--   6. Seed del set de sistema fusionable 'territorio_comun' (D16).
--
-- ORDEN FISICO: EL BACKFILL VA ANTES DEL CHECK, NO DESPUES
--   El bloque 2 del checklist son columnas + constraints, pero el backfill del
--   bloque 5 se ejecuta FISICAMENTE entre las columnas y las constraints.
--   Motivo medido (lo cazo la validacion atomica, no es teoria):
--   ADD CONSTRAINT ... CHECK valida de inmediato las filas YA existentes, y en
--   ese momento las 21 cartas tienen fusionable = true (el DEFAULT) con
--   nivel_gate no nulo o es_evento = true. Crear chk_cartas_catalogo_fusionable
--   antes del UPDATE aborta con 23514 y deja la migracion a medias. Por eso el
--   orden es: columnas (2) -> backfill (3) -> constraints e indice (4) -> seed
--   (7). Los constraints y el indice no dependen del seed, el seed si depende
--   de los constraints (sus 6 filas los cumplen por construccion).
--
-- POR QUE LA PK NO SE CAMBIA AQUI (D12, hecho medido 16 del ADR-108)
--   scripts/apply_sql_file.js ejecuta sentencia a sentencia SIN transaccion
--   envolvente. Retirar la clave primaria actual y reinstalarla de 3 columnas
--   en el mismo fichero dejaria la tabla SIN clave primaria si algo falla entre
--   las dos sentencias, y ademas rompe con 42P10 los tres ON CONFLICT
--   (usuario_id, carta_id) vivos de api/interacciones.js. Por eso aqui solo se
--   EXPANDE: se anade la clave unica de 3 columnas y la clave primaria de 2
--   columnas queda intacta. La contraccion es la 061, Deuda D-4, y NO se
--   escribe en esta entrega. Riesgo residual declarado R-1: mientras la 061 no
--   este aplicada, una fila variante='shiny' no puede coexistir con su 'base'.
--
-- CADA BLOQUE ES IDEMPOTENTE POR SI SOLO (ADR-008)
--   El runner no envuelve el fichero en una transaccion, asi que un fallo a
--   medias deja los bloques anteriores aplicados. Re-ejecutar el fichero
--   completo es no-op funcional: ADD COLUMN IF NOT EXISTS, CREATE INDEX IF NOT
--   EXISTS, ADD CONSTRAINT dentro de DO con guarda en pg_constraint e INSERT
--   con ON CONFLICT (id) DO NOTHING.
--   ADD CONSTRAINT no admite IF NOT EXISTS en PostgreSQL (medido): por eso las
--   constraints van dentro de DO con guarda en pg_constraint y tags unicos
--   m060a .. m060d (idioma del repo, ver 058 y 059).
--
-- QUE NO HACE (importante, no "arreglar" desde aqui)
--   CERO eliminacion de tablas, columnas, constraints, indices o filas: cero
--   TRUNCATE, cero DELETE, cero RENAME. Ni una sola mencion literal a la clave
--   primaria de usuarios_cartas (V2 del ADR-108: 0 coincidencias). No se
--   escribe la 061.
--   La contraccion de la 061 consiste en retirar la clave primaria actual y
--   reinstalarla sobre (usuario_id, carta_id, variante). Ese cambio NO esta
--   aqui: este fichero solo anade la clave unica de 3 columnas.
--   PROHIBIDO el UPDATE redundante de emisor_tipo o de variante (D1 punto 5):
--   esos valores los pone el DEFAULT del ADD COLUMN, que solo se aplica a las
--   filas existentes en el momento del ALTER. Un UPDATE los pisaria en la
--   segunda corrida y borraria las cartas ugc / marca y las variantes shiny ya
--   creadas. El unico UPDATE de este fichero es el de fusionable.
--
-- DOS CLAUSULAS QUE VIENEN DEL ADR Y NO ESTABAN EN EL CHECKLIST RESUMIDO
--   (1) chk_usuarios_cartas_museo exige ademas activo = true (D10 y D13:
--       activo significa "en posesion", y la lectura del museo filtra por
--       uc.activo = true). Sin esa clausula el CHECK admitiria una pieza
--       equipada que el usuario ya no posee.
--   (2) chk_cartas_catalogo_stats exige ademas rango 0..100 en bonus_xp_pct
--       (D2 lo declara normativo y V6 lo verifica con 150 -> 23514).
--   Las dos son estrictamente mas restrictivas que el resumen, ninguna
--   contradice el contenido aprobado, y ninguna puede fallar sobre datos
--   existentes (usuarios_cartas tiene 0 filas y cartas_catalogo 21 con
--   stats_json por defecto '{}'). Si el operador prefiere el texto literal del
--   resumen, la correccion es una migracion NUEVA: este fichero ya no se
--   reedita una vez aplicado (el runner guarda su sha256).
--
-- ASCII-SAFE (ADR-002): cero bytes > 127, cero tildes, cero enes con tilde,
--   cero emojis, cero escapes unicode, cero backticks. Los terminos que en
--   castellano llevarian tilde se escriben sin ella.
--
-- VERIFICACION PREVIA (read-only, ejecutada con scripts/neon_select.js antes
-- de aplicar este fichero, 2026-10-27)
--   SELECT COUNT(*), COALESCE(SUM(cantidad),0) FROM usuarios_cartas
--     -> 0 filas / 0. Baseline de la regresion: deben ser IDENTICOS despues.
--   SELECT COUNT(*), COUNT(*) FILTER (WHERE nivel_gate IS NOT NULL),
--          COUNT(*) FILTER (WHERE es_evento) FROM cartas_catalogo
--     -> 21 / 18 / 3. Tras la 060: 27 filas.
--   SELECT MAX(numero) FROM schema_migrations  -> 59 (la 060 es la siguiente).
--   SELECT conname FROM pg_constraint WHERE conname IN (...10 nombres...)
--     -> 0 filas: ninguno de los nombres de este fichero existe todavia.
--   SELECT to_regclass('public.marcas')  -> no nulo (destino de la FK).
--
-- VERIFICACION POSTERIOR (ejecutada, resultados en el cierre de la tarea)
--   PK intacta: la clave primaria de usuarios_cartas debe seguir con 2 columnas.
--     SELECT array_length(conkey, 1) FROM pg_constraint
--      WHERE conrelid = 'public.usuarios_cartas'::regclass AND contype = 'p'
--     -> 2 (NO debe ser 3).
--   Existen: uq_usuarios_cartas_variante, chk_usuarios_cartas_variante,
--     chk_usuarios_cartas_museo, chk_cartas_catalogo_emisor_tipo,
--     fk_cartas_catalogo_marca_id, chk_cartas_catalogo_stats,
--     chk_cartas_catalogo_fusionable, chk_cartas_catalogo_emisor_coherente.
--   Indices: ux_usuarios_cartas_museo_orden, idx_cartas_catalogo_emisor.
--   Conteos: usuarios_cartas 0 / 0 (igual que antes), cartas_catalogo 27,
--     emisor_tipo = 'sistema' 27, fusionable = false 21, fusionable = true 6.
--   Huerfanos: variante IS NULL 0, en_museo con orden_museo NULL 0,
--     duplicados (usuario_id, orden_museo) con en_museo 0 filas.
--   Segunda corrida: 0 errores y los mismos conteos (V5 del ADR-108).
--
-- ROLLBACK (documentado, NO ejecutado: requiere aprobacion del operador)
--   Asimetrico y solo seguro de forma inmediata. Orden inverso, siempre con
--   migracion NUEVA numerada (nunca editando esta, ADR-003):
--     1. Retirar los dos indices nuevos (ux_usuarios_cartas_museo_orden e
--        idx_cartas_catalogo_emisor): un indice no contiene datos de negocio,
--        retirarlo no borra filas.
--     2. Retirar las 10 constraints nuevas por nombre, con guarda en
--        pg_constraint.
--     3. Solo si el operador confirma que no hay filas shiny ni ugc / marca:
--        retirar variante / en_museo / orden_museo de usuarios_cartas,
--        emisor_tipo / emisor_id / marca_id / descripcion / stats_json /
--        es_canjeable_qr / fusionable de cartas_catalogo, drop_en de
--        cartas_gates y variante de cartas_ofertas / cartas_ventas.
--     4. Las 6 filas de ct_comun_* NO se borran (ADR-003). Se desactivan con
--        UPDATE cartas_catalogo SET activo = false (migracion nueva).
-- ============================================================================

-- (0) GUARDAS DE PRECONDICION (patron 031 / 038 / 058 / 059) ----------------
--     Convierte un 42P01 seco en un mensaje que dice QUE falta y de QUE
--     migracion viene. No altera ninguno de los seis bloques.
DO $m060a$
DECLARE
  faltantes text[] := ARRAY[]::text[];
BEGIN
  IF to_regclass('public.usuarios_cartas') IS NULL THEN
    faltantes := faltantes || 'public.usuarios_cartas (040)'::text;
  END IF;
  IF to_regclass('public.cartas_catalogo') IS NULL THEN
    faltantes := faltantes || 'public.cartas_catalogo (040)'::text;
  END IF;
  IF to_regclass('public.cartas_gates') IS NULL THEN
    faltantes := faltantes || 'public.cartas_gates (040)'::text;
  END IF;
  IF to_regclass('public.cartas_ofertas') IS NULL THEN
    faltantes := faltantes || 'public.cartas_ofertas (041)'::text;
  END IF;
  IF to_regclass('public.cartas_ventas') IS NULL THEN
    faltantes := faltantes || 'public.cartas_ventas (041)'::text;
  END IF;
  IF to_regclass('public.marcas') IS NULL THEN
    faltantes := faltantes || 'public.marcas (027, destino de la FK)'::text;
  END IF;
  IF array_length(faltantes, 1) IS NOT NULL THEN
    RAISE EXCEPTION 'MIGRACION 060: pre-requisitos ausentes: %',
      array_to_string(faltantes, ', ');
  END IF;
END $m060a$;

-- ============================================================================
-- (1) usuarios_cartas: VARIANTE, MUSEO Y UNIQUE DE 3 COLUMNAS
-- ============================================================================
-- La dimension correcta es variante, NO una quinta rareza (D1): la rareza
-- responde "cuanto cuesta que te salga", la variante responde "que version
-- tienes". El CHECK de rareza de la 040 se queda como esta.
-- Los tres ADD COLUMN usan el DEFAULT para las filas existentes: eso ES el
-- backfill. No hay UPDATE de variante (seria destructivo en la 2a corrida).
ALTER TABLE usuarios_cartas
  ADD COLUMN IF NOT EXISTS variante varchar(10) NOT NULL DEFAULT 'base';

ALTER TABLE usuarios_cartas
  ADD COLUMN IF NOT EXISTS en_museo boolean NOT NULL DEFAULT false;

ALTER TABLE usuarios_cartas
  ADD COLUMN IF NOT EXISTS orden_museo smallint;

-- Constraints dentro de DO: ADD CONSTRAINT no admite IF NOT EXISTS.
--   chk_usuarios_cartas_variante .... dominio cerrado base / shiny.
--   uq_usuarios_cartas_variante ..... clave de 3 columnas que la 061
--                                     promocionara a PK (aqui NO toca la PK).
--   chk_usuarios_cartas_museo ....... techo del museo y coherencia de
--                                     cantidad / activo (ADR-108 D10 y D13).
DO $m060b$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                  WHERE conname = 'chk_usuarios_cartas_variante'
                    AND conrelid = 'public.usuarios_cartas'::regclass) THEN
    ALTER TABLE usuarios_cartas
      ADD CONSTRAINT chk_usuarios_cartas_variante
      CHECK (variante IN ('base', 'shiny'));
    RAISE NOTICE '060: chk_usuarios_cartas_variante creada';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                  WHERE conname = 'uq_usuarios_cartas_variante'
                    AND conrelid = 'public.usuarios_cartas'::regclass) THEN
    ALTER TABLE usuarios_cartas
      ADD CONSTRAINT uq_usuarios_cartas_variante
      UNIQUE (usuario_id, carta_id, variante);
    RAISE NOTICE '060: uq_usuarios_cartas_variante creada (la PK sigue igual)';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                  WHERE conname = 'chk_usuarios_cartas_museo'
                    AND conrelid = 'public.usuarios_cartas'::regclass) THEN
    ALTER TABLE usuarios_cartas
      ADD CONSTRAINT chk_usuarios_cartas_museo CHECK (
           (en_museo = false AND orden_museo IS NULL)
        OR (en_museo = true AND orden_museo BETWEEN 1 AND 12
            AND cantidad >= 1 AND activo = true));
    RAISE NOTICE '060: chk_usuarios_cartas_museo creada';
  END IF;
END $m060b$;

-- Arbitro real del tope 12 (D10). El CHECK solo acota el rango 1..12 por fila.
-- Lo que hace IMPOSIBLE el intento 13 es que orden_museo no pueda repetirse por
-- usuario: 12 valores distintos en un rango de 12 => maximo 12 piezas. Indice
-- UNICO PARCIAL, no constraint (DEFERRABLE no aplica a indices parciales y el
-- producto no reordena, D17).
CREATE UNIQUE INDEX IF NOT EXISTS ux_usuarios_cartas_museo_orden
  ON usuarios_cartas (usuario_id, orden_museo) WHERE en_museo = true;

-- ============================================================================
-- (2) cartas_catalogo: EMISOR ABIERTO, STATS Y FUSIONABILIDAD
-- ============================================================================
-- Columnas. Todas con DEFAULT cuando son NOT NULL: el DEFAULT es el backfill de
-- las 21 filas existentes y NO vuelve a tocar las filas nuevas.
ALTER TABLE cartas_catalogo
  ADD COLUMN IF NOT EXISTS emisor_tipo varchar(10) NOT NULL DEFAULT 'sistema';

-- emisor_id SIN FK por diseno (D3): el autor de una carta UGC puede desaparecer
-- y la lectura lo degrada con COALESCE (ADR-008). Borrar catalogo por eso
-- violaria el cero borrado logico (ADR-003).
ALTER TABLE cartas_catalogo
  ADD COLUMN IF NOT EXISTS emisor_id uuid;

-- marca_id CON FK real y ON DELETE RESTRICT (D3, decision cerrada): una marca
-- que desaparece no puede dejar cartas huerfanas ni perder su carta en silencio.
-- Nada de SET NULL: dejaria una fila emisor_tipo='marca' con marca_id NULL, que
-- chk_cartas_catalogo_emisor_coherente rechaza de todas formas.
ALTER TABLE cartas_catalogo
  ADD COLUMN IF NOT EXISTS marca_id uuid;

ALTER TABLE cartas_catalogo
  ADD COLUMN IF NOT EXISTS descripcion text;

ALTER TABLE cartas_catalogo
  ADD COLUMN IF NOT EXISTS stats_json jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE cartas_catalogo
  ADD COLUMN IF NOT EXISTS es_canjeable_qr boolean NOT NULL DEFAULT false;

ALTER TABLE cartas_catalogo
  ADD COLUMN IF NOT EXISTS fusionable boolean NOT NULL DEFAULT true;

-- ============================================================================
-- (3) BACKFILL: EL UNICO UPDATE PERMITIDO  [checklist bloque 5, ejecutado aqui]
-- ============================================================================
-- fusionable NO es derivable de un DEFAULT (depende de otras columnas), asi que
-- necesita datos. Las 21 cartas actuales son 18 de gate (nivel_gate no nulo) y
-- 3 de evento: las 21 quedan en fusionable = false. Es idempotente porque el
-- predicado exige fusionable = true.
-- Consecuencia asumida: la fusion nace SIN inventario de sistema fusionable, y
-- por eso existe el bloque (7). Ya no es una pregunta abierta (D16).
-- TIENE QUE IR ANTES DE chk_cartas_catalogo_fusionable: un ADD CONSTRAINT CHECK
-- valida las filas existentes en el acto, y sin este UPDATE las 21 violarian el
-- CHECK (fusionable = true con nivel_gate o es_evento) y la migracion abortaria
-- con 23514 en el bloque (4).
-- Backfill PROHIBIDO de emisor_tipo y de variante: los pone el DEFAULT del
-- ADD COLUMN y un UPDATE los pisaria en la segunda corrida (D1 punto 5).
UPDATE cartas_catalogo SET fusionable = false
 WHERE fusionable = true
   AND (nivel_gate IS NOT NULL OR es_evento = true
        OR emisor_tipo = 'marca' OR es_canjeable_qr = true);

-- ============================================================================
-- (4) cartas_catalogo: CONSTRAINTS E INDICE  [segunda mitad del bloque 2]
-- ============================================================================
-- Constraints dentro de DO (ADD CONSTRAINT no admite IF NOT EXISTS).
--   chk_cartas_catalogo_emisor_tipo ....... dominio cerrado sistema/ugc/marca.
--   fk_cartas_catalogo_marca_id ........... FK nombrada, ON DELETE RESTRICT.
--   chk_cartas_catalogo_stats ............. objeto plano y bonus_xp_pct
--                                           numerico en 0..100 (D2 y V6).
--   chk_cartas_catalogo_fusionable ........ el flag declara, el CHECK garantiza
--                                           (D6): fusionable solo si no gatea,
--                                           no es evento, no es de marca y no
--                                           se canjea por QR.
--   chk_cartas_catalogo_emisor_coherente .. una sola via de emisor por fila.
DO $m060c$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                  WHERE conname = 'chk_cartas_catalogo_emisor_tipo'
                    AND conrelid = 'public.cartas_catalogo'::regclass) THEN
    ALTER TABLE cartas_catalogo
      ADD CONSTRAINT chk_cartas_catalogo_emisor_tipo
      CHECK (emisor_tipo IN ('sistema', 'ugc', 'marca'));
    RAISE NOTICE '060: chk_cartas_catalogo_emisor_tipo creada';
  END IF;

  -- Doble guarda: por nombre Y por "ya existe una FK sobre marca_id". Asi una
  -- segunda corrida no puede crear una FK duplicada aunque alguien la hubiera
  -- renombrado a mano.
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                  WHERE conname = 'fk_cartas_catalogo_marca_id'
                    AND conrelid = 'public.cartas_catalogo'::regclass)
     AND NOT EXISTS (SELECT 1
                       FROM pg_constraint c
                       JOIN pg_attribute a
                         ON a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey)
                      WHERE c.conrelid = 'public.cartas_catalogo'::regclass
                        AND c.contype = 'f'
                        AND a.attname = 'marca_id') THEN
    ALTER TABLE cartas_catalogo
      ADD CONSTRAINT fk_cartas_catalogo_marca_id
      FOREIGN KEY (marca_id) REFERENCES marcas (id) ON DELETE RESTRICT;
    RAISE NOTICE '060: fk_cartas_catalogo_marca_id creada (ON DELETE RESTRICT)';
  END IF;

  -- stats_json: objeto plano siempre. bonus_xp_pct, si esta, tiene que ser un
  -- numero JSON en 0..100 (es un porcentaje: 15 significa +15%, nunca 1.15).
  -- Se compara en jsonb (>= y <= sobre jsonb), NUNCA con un cast a numeric: un
  -- cast fallaria con 22P02 ante el string "quince" en vez de devolver 23514,
  -- porque PostgreSQL no garantiza el orden de evaluacion de un AND.
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                  WHERE conname = 'chk_cartas_catalogo_stats'
                    AND conrelid = 'public.cartas_catalogo'::regclass) THEN
    ALTER TABLE cartas_catalogo
      ADD CONSTRAINT chk_cartas_catalogo_stats CHECK (
        jsonb_typeof(stats_json) = 'object'
        AND (
          NOT (stats_json ? 'bonus_xp_pct')
          OR (
            jsonb_typeof(stats_json -> 'bonus_xp_pct') = 'number'
            AND (stats_json -> 'bonus_xp_pct') >= '0'::jsonb
            AND (stats_json -> 'bonus_xp_pct') <= '100'::jsonb
          )
        ));
    RAISE NOTICE '060: chk_cartas_catalogo_stats creada';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                  WHERE conname = 'chk_cartas_catalogo_fusionable'
                    AND conrelid = 'public.cartas_catalogo'::regclass) THEN
    ALTER TABLE cartas_catalogo
      ADD CONSTRAINT chk_cartas_catalogo_fusionable CHECK (
           fusionable = false
        OR (nivel_gate IS NULL AND es_evento = false
            AND emisor_tipo <> 'marca' AND es_canjeable_qr = false));
    RAISE NOTICE '060: chk_cartas_catalogo_fusionable creada';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                  WHERE conname = 'chk_cartas_catalogo_emisor_coherente'
                    AND conrelid = 'public.cartas_catalogo'::regclass) THEN
    ALTER TABLE cartas_catalogo
      ADD CONSTRAINT chk_cartas_catalogo_emisor_coherente CHECK (
           (emisor_tipo = 'sistema' AND emisor_id IS NULL AND marca_id IS NULL)
        OR (emisor_tipo = 'ugc' AND emisor_id IS NOT NULL AND marca_id IS NULL)
        OR (emisor_tipo = 'marca' AND marca_id IS NOT NULL AND emisor_id IS NULL));
    RAISE NOTICE '060: chk_cartas_catalogo_emisor_coherente creada';
  END IF;
END $m060c$;

-- Indice del emisor: el museo y el alta UGC filtran por (emisor_tipo, emisor_id).
CREATE INDEX IF NOT EXISTS idx_cartas_catalogo_emisor
  ON cartas_catalogo (emisor_tipo, emisor_id);

-- ============================================================================
-- (5) cartas_gates: drop_en, EL ANCLA DEL DROP (D4 y D19)  [checklist bloque 3]
-- ============================================================================
-- La 040 (seccion 8) ya sembro cartas_gates para todo usuario que cruzo el
-- gate, asi que "INSERT ... ON CONFLICT DO NOTHING" como token de idempotencia
-- habria dado CERO drops a los veteranos. El token es la columna:
--   drop_en IS NULL      -> el usuario tiene derecho a UN drop de ese set
--   drop_en IS NOT NULL  -> ya lo cobro
-- consumido_en NO se toca: sigue significando "cuando se cruzo el gate".
ALTER TABLE cartas_gates
  ADD COLUMN IF NOT EXISTS drop_en timestamptz;

-- ============================================================================
-- (6) MERCADO: LA VARIANTE VIAJA EN LA OFERTA Y EN LA VENTA  [bloque 4]
-- ============================================================================
-- Una carta shiny tiene que poder ofertarse y venderse sin ambiguedad. Las 4
-- ramas de mercado ya desplegadas operan por omision sobre 'base' (Deuda D-2):
-- aceptar el parametro es codigo, no esquema. Cero cambio de comportamiento.
ALTER TABLE cartas_ofertas
  ADD COLUMN IF NOT EXISTS variante varchar(10) NOT NULL DEFAULT 'base';

ALTER TABLE cartas_ventas
  ADD COLUMN IF NOT EXISTS variante varchar(10) NOT NULL DEFAULT 'base';

-- Mismo dominio cerrado que en usuarios_cartas. Nombres con prefijo de tabla
-- para no colisionar con chk_usuarios_cartas_variante (verificado: los dos
-- nombres estaban libres en pg_constraint antes de aplicar).
DO $m060d$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                  WHERE conname = 'chk_cartas_ofertas_variante'
                    AND conrelid = 'public.cartas_ofertas'::regclass) THEN
    ALTER TABLE cartas_ofertas
      ADD CONSTRAINT chk_cartas_ofertas_variante
      CHECK (variante IN ('base', 'shiny'));
    RAISE NOTICE '060: chk_cartas_ofertas_variante creada';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                  WHERE conname = 'chk_cartas_ventas_variante'
                    AND conrelid = 'public.cartas_ventas'::regclass) THEN
    ALTER TABLE cartas_ventas
      ADD CONSTRAINT chk_cartas_ventas_variante
      CHECK (variante IN ('base', 'shiny'));
    RAISE NOTICE '060: chk_cartas_ventas_variante creada';
  END IF;
END $m060d$;

-- ============================================================================
-- (7) SEED DEL SET DE SISTEMA FUSIONABLE: territorio_comun (D16)  [bloque 6]
-- ============================================================================
-- Seis cartas de sistema sin gate, ASCII puro, lugares colombianos reales y
-- distintos de los 21 ya sembrados por la 040. Rarezas comun (01-04) y raro
-- (05-06) para que la fusion tenga inventario real desde el dia 1 ademas del
-- UGC. Sin emisor_id ni marca_id: emisor_tipo = 'sistema' exige los dos NULL
-- (chk_cartas_catalogo_emisor_coherente).
-- imagen_url queda NULL a proposito: no existe ningun activo en img/cartas y
-- una URL inventada romperia el fallback silencioso (ADR-008).
-- NO se siembran cartas de marca: no hay garantia de fila en marcas por
-- entorno y la FK ON DELETE RESTRICT convertiria el seed en un fallo de
-- migracion dependiente de datos (D16). Deuda D-6, CRUD admin.
-- ON CONFLICT (id) DO NOTHING: una segunda corrida no pisa una recalibracion
-- manual del operador (ADR-008).
INSERT INTO cartas_catalogo
  (id, nombre, set_slug, rareza, nivel_gate, es_evento,
   emisor_tipo, fusionable)
VALUES
  ('ct_comun_01', 'Villa de Leyva',        'territorio_comun', 'comun', NULL, false, 'sistema', true),
  ('ct_comun_02', 'Parque Tayrona',        'territorio_comun', 'comun', NULL, false, 'sistema', true),
  ('ct_comun_03', 'Salto del Tequendama',  'territorio_comun', 'comun', NULL, false, 'sistema', true),
  ('ct_comun_04', 'Santuario de Las Lajas','territorio_comun', 'comun', NULL, false, 'sistema', true),
  ('ct_comun_05', 'Chiribiquete',          'territorio_comun', 'raro',  NULL, false, 'sistema', true),
  ('ct_comun_06', 'Cueva de los Guacharos','territorio_comun', 'raro',  NULL, false, 'sistema', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- FIN 060. Solo expansion: la PK de usuarios_cartas sigue siendo de 2 columnas
-- y la 061 (contraccion, Deuda D-4) NO se escribe aqui. El registro en
-- schema_migrations lo escribe el runner (contrato de la 045), no este fichero.
-- ============================================================================
