-- ============================================================================
-- Migration 031: Gamificacion v6 - M_nivel (x1.0 a x3.0) con doble cap
--   secuencial (5.0 / 10.0), reescalado de umbrales, nivel_max, config de
--   ajuste sin deploy y ledger unico de XP (ADR-053)
-- Fecha: 2026-09-21
-- Referencias: ADR-001 (8/8 endpoints; esta entrega NO crea endpoints),
--   ADR-002 (ASCII-safe), ADR-003 (Cero Borrado Logico: no se reescribe XP ya
--   entregado), ADR-006 (baseline = esquema REAL auditado antes de escribir),
--   ADR-008 (gobernanza e idempotencia de esquema), ADR-018/ADR-035
--   (gamificacion; XP numeric(12,2), prohibido parseInt/::int sobre columnas
--   de XP), ADR-038 (calcularXpFinal / acreditarClaseYCofre), ADR-040
--   (umbrales cliente), ADR-042 (migracion 027 NO aplicada), ADR-053
--   (contrato CONGELADO; Decisiones 5, 6, 7, 10 y 12), BUG-021/BUG-060
--   (patron: migracion completa ANTES del deploy del backend).
-- Requiere: 003-030 aplicadas (en particular 010/015/017/018 para consumibles
--   y 021 para xp_total numeric(12,2)). La 027 NO es requisito: se DETECTA y
--   se maneja por guard.
--
-- QUE HACE (ADR-053, Decision 12)
--   1. usuarios.nivel_max smallint NOT NULL DEFAULT 1 + siembra UNICA derivada
--      de xp_total con la tabla de umbrales VIEJA, para que el reescalado no
--      le quite la insignia ya visible a nadie.
--   2. gamificacion_config: tabla clave/valor con los 3 parametros congelados
--      como semilla (cap_progresion = 5.0, cap_global = 10.0,
--      m_nivel_max = 3.0) para poder recalibrar sin deploy.
--   3. xp_ledger: ledger UNICO por evento con el desglose completo del XP
--      entregado (base, M_nivel, stack, multiplicador final, cap aplicado,
--      bonos planos, bandera de exencion y contexto JSONB) + 2 indices.
--   4. Repricing ABSOLUTO de consumibles.precio_xp (17 filas reales) y bloque
--      de coherencia con las columnas de la 027 SI esa migracion existe.
--
-- HALLAZGO DEL ESQUEMA REAL (verificado 2026-09-21 con scripts/neon_select.js,
-- modo real, solo lectura; ADR-006):
--   - consumibles: existen clave, categoria y precio_xp (numeric). Hay 17
--     filas y sus precios coinciden EXACTAMENTE con el catalogo del ADR-053.
--   - consumibles.precio_xp_base y consumibles.precio_xp_actual NO EXISTEN
--     (la 027 NO esta aplicada). Esta migracion NO puede fallar por eso.
--   - usuarios: existen xp_total, nivel y badge_actual; nivel_max NO existe.
--   - xp_ledger y gamificacion_config NO existen.
--
-- CARACTER DE LA MIGRACION
--   ADITIVA: ALTER TABLE ADD COLUMN / CREATE TABLE / CREATE INDEX / INSERT de
--   semilla / UPDATE por valor ABSOLUTO. No elimina, no renombra, no toca
--   columnas legacy (usuarios.nivel y usuarios.badge_actual NO se escriben).
--   IDEMPOTENTE (ADR-008): ADD COLUMN IF NOT EXISTS; CREATE TABLE/INDEX IF NOT
--   EXISTS; seed con ON CONFLICT (clave) DO NOTHING; y -critico en el
--   repricing- los UPDATE asignan valores ABSOLUTOS nunca multiplicaciones
--   compuestas (una multiplicacion se re-aplicaria en la segunda corrida y
--   romperia la idempotencia). La siembra de nivel_max usa GREATEST con la
--   tabla VIEJA: es MONOTONA, jamas baja un nivel_max ya alcanzado.
--   ASCII-SAFE (ADR-002): cero bytes > 127, cero tildes, cero ene, cero
--   emojis, cero escapes unicode, cero backticks.
--   TECNICA: DDL/UPDATE simples en su mayoria. Los dos bloques DO anonimos se
--   usan solo para guards condicionales (CHECK y columnas de la 027) que
--   PostgreSQL no puede expresar con IF NOT EXISTS.
--
-- APLICACION
--   Correr este archivo COMPLETO en el editor SQL de Neon (o con
--   scripts/apply_sql_file.js) DESPUES de la 030 y ANTES del deploy del
--   backend (ADR-053 Decision 12 / R-1). Patron BUG-021/BUG-060: archivo
--   COMPLETO en una sola corrida. Re-ejecutarlo es no-op funcional.
--
-- ROLLBACK (emergencia; LOSSY si ya hay XP emitido sin respaldo del ledger)
--   DROP TABLE IF EXISTS xp_ledger;
--   DROP TABLE IF EXISTS gamificacion_config;
--   ALTER TABLE usuarios DROP COLUMN IF EXISTS nivel_max;
--   No revierte el repricing de consumibles (los precios nuevos se quedan;
--   para volver atras habria que re-escribir los 17 valores viejos).
--   No va en el flujo normal. Respaldar xp_ledger antes de cualquier rollback.
-- ============================================================================

-- ============================================================================
-- 0. PREFLIGHT (SOLO LECTURA; NO forma parte del DDL; NO se ejecuta solo).
--    Copiar y correr sentencia por sentencia ANTES de aplicar la 031.
-- ============================================================================
-- (0.a) Confirmar que nivel_max aun NO existe. Esperado antes: 0 filas;
--       despues: 1 fila.
-- SELECT column_name FROM information_schema.columns
--   WHERE table_schema='public' AND table_name='usuarios'
--     AND column_name='nivel_max';
--
-- (0.b) Confirmar que las 2 tablas nuevas aun NO existen. Esperado antes:
--       0 filas; despues: 2 filas.
-- SELECT tablename FROM pg_tables
--   WHERE schemaname='public' AND tablename IN ('xp_ledger','gamificacion_config')
--   ORDER BY tablename;
--
-- (0.c) Confirmar el catalogo de consumibles y sus precios ACTUALES (esperadas
--       17 filas; deben coincidir con los "precio hoy" del ADR-053).
-- SELECT clave, categoria, precio_xp FROM consumibles ORDER BY categoria, clave;
--
-- (0.d) Estado de las columnas de la 027 (esperado hoy: 0 filas = NO aplicada).
-- SELECT column_name FROM information_schema.columns
--   WHERE table_schema='public' AND table_name='consumibles'
--     AND column_name IN ('precio_xp_base','precio_xp_actual','tipo_canje')
--   ORDER BY column_name;

-- ============================================================================
-- 1. usuarios.nivel_max + SIEMBRA UNICA (ADR-053 Decision 5)
-- ============================================================================
-- nivel_max = maximo nivel historico alcanzado; nivel_visible =
-- GREATEST(calcularNivel(xp_total).nivel, COALESCE(nivel_max,1)). Se persiste
-- SOLO este "techo historico" (una columna derivada mas), nunca el nivel
-- actual: usuarios.nivel y usuarios.badge_actual siguen siendo legacy y el
-- backend NO las escribe.

ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS nivel_max smallint NOT NULL DEFAULT 1;

-- Siembra UNICA con la tabla de umbrales VIEJA (N1..N20):
--   0, 100, 250, 450, 700, 1000, 1400, 1900, 2500, 3200, 4000, 5200, 6800,
--   8500, 10500, 13000, 16000, 19500, 24000, 30000.
-- Es el techo de XP vigente ANTES del reescalado de la Decision 3, de modo
-- que nadie pierda una insignia que ya mostraba (ADR-053 Decision 5).
--
-- MONOTONIA (clave de la idempotencia): se asigna
--   GREATEST(COALESCE(nivel_max,1), <nivel viejo derivado de xp_total>)
-- NUNCA una asignacion directa. Razon: en una segunda corrida -o si la
-- migracion se corre despues de que el usuario ya subio con la tabla NUEVA-
-- la derivacion vieja podria ser MENOR que el nivel_max ya alcanzado; el
-- GREATEST garantiza nivel_max = mayor(nivel previo, nivel viejo) y por tanto
-- jamas decrece. Como el ADD COLUMN es NOT NULL DEFAULT 1, la siembra parte de
-- 1 y COALESCE es defensa adicional (por si la columna se hubiera creado
-- nullable en algun entorno). Segunda corrida: el valor asignado es identico
-- al existente -> no-op funcional.

UPDATE usuarios
SET nivel_max = GREATEST(
  COALESCE(nivel_max, 1),
  CASE
    WHEN xp_total >= 30000 THEN 20
    WHEN xp_total >= 24000 THEN 19
    WHEN xp_total >= 19500 THEN 18
    WHEN xp_total >= 16000 THEN 17
    WHEN xp_total >= 13000 THEN 16
    WHEN xp_total >= 10500 THEN 15
    WHEN xp_total >= 8500  THEN 14
    WHEN xp_total >= 6800  THEN 13
    WHEN xp_total >= 5200  THEN 12
    WHEN xp_total >= 4000  THEN 11
    WHEN xp_total >= 3200  THEN 10
    WHEN xp_total >= 2500  THEN 9
    WHEN xp_total >= 1900  THEN 8
    WHEN xp_total >= 1400  THEN 7
    WHEN xp_total >= 1000  THEN 6
    WHEN xp_total >= 700   THEN 5
    WHEN xp_total >= 450   THEN 4
    WHEN xp_total >= 250   THEN 3
    WHEN xp_total >= 100   THEN 2
    ELSE 1
  END
)::smallint;

-- ============================================================================
-- 2. gamificacion_config (ADR-053 Decision 6)
-- ============================================================================
-- Tabla clave/valor de ajuste SIN deploy. Los 3 valores sembrados son los
-- congelados en el ADR y son ademas el FALLBACK en codigo: si la tabla no
-- existe (42P01) api/interacciones.js degrada a las constantes y registra el
-- motivo (patron BUG-021 / AGENTS.md 2.2: prohibido el catch vacio).
-- numeric(12,4): precision de sobra para factores como 5.0 / 10.0 / 3.0 y
-- para una recalibracion fina (por ejemplo m_nivel_max = 3.1500).

CREATE TABLE IF NOT EXISTS gamificacion_config (
  clave          text PRIMARY KEY,
  valor          numeric(12,4) NOT NULL,
  descripcion    text NOT NULL DEFAULT '',
  actualizado_en timestamptz NOT NULL DEFAULT NOW()
);

-- Seed idempotente (ON CONFLICT (clave) DO NOTHING): re-ejecutar NO reescribe
-- una recalibracion manual hecha por el operador. Descripciones ASCII.

INSERT INTO gamificacion_config (clave, valor, descripcion) VALUES
  ('cap_progresion', 5.0000,
   'Techo de mult_progresion (M_nivel * mult_clase * factor_casa). ADR-053 Dec 2'),
  ('cap_global', 10.0000,
   'Techo de mult_global (mult_progresion_c * mult_stack). ADR-053 Dec 2'),
  ('m_nivel_max', 3.0000,
   'Valor de M_nivel en N20 (1.0 + (N-1)/19 * 2.0). ADR-053 Dec 1')
ON CONFLICT (clave) DO NOTHING;

-- ============================================================================
-- 3. xp_ledger (ADR-053 Decision 7)
-- ============================================================================
-- Ledger UNICO por evento de XP, aditivo y SIN backfill (hoy no existe: el
-- historico no se reconstruye; Cero Borrado Logico es no destruir, no
-- inventar). Es la pieza que habilita el toast con desglose y el panel
-- "Salud de la Red".
--
-- Invariante de reconciliacion (verificable por smoke):
--   xp_final = ROUND(xp_base * mult_final, 2) + bonos_planos
--   para las filas con es_exento = false y cap_aplicado != 'accion'.
-- Alcance del invariante (contrato congelado): aplica a las acciones SIN cap
-- denominado en XP, es decir cap_aplicado IN ('ninguno','progresion','global').
-- Los caps DENOMINADOS EN XP no se explican por 'progresion' ni por 'global':
--   compartir  -> tope de 50 XP / 24h
--   chat       -> tope de 10 XP / dia
-- Esas acciones quedan FUERA del invariante y se registran con
-- cap_aplicado = 'accion': en ellas el cap actua sobre el monto acreditable,
-- de modo que xp_final refleja el recorte y la igualdad estricta no aplica.
-- Bonos planos: el bono rural de visita se suma DESPUES del cap y NO se
-- multiplica (ADR-053 Decision 4, paso 5); participa del invariante.
--
-- Semantica CONGELADA de los multiplicadores (ADR-053 Decisiones 2 y 7):
--   mult_nivel  = M_nivel(N)  (1.0 .. 3.0)
--   mult_stack  = producto de TODO el stack EXCEPTO M_nivel, es decir
--                 mult_clase * factor_casa * amuleto_x2 * esLiderDeCiudad
--   mult_nivel * mult_stack = multiplicador CRUDO (antes de caps)
--   mult_final  = multiplicador EFECTIVO post-caps (= mult_global_c)
-- convivencia: interacciones.xp_ganado se MANTIENE y NO se reemplaza (guarda
-- la BASE para Origen/fama/vocaciones); xp_ledger guarda el XP ENTREGADO.
--
-- Alcance numerico acorde a ADR-035 (XP numeric, nunca int):
--   xp_base / bonos_planos / xp_final      -> numeric(12,2)
--   mult_nivel / mult_stack / mult_final   -> numeric(10,6)
-- Los 6 decimales son deliberados: M_nivel(2) = 1.105263157... con 4 decimales
-- se cuantiza a 1.1053 y el residuo por unidad (~1e-4) puede desviar el
-- invariante en +-0.01 sobre una base grande; con 6 decimales el residuo baja
-- a ~1e-6 y la desviacion queda en +-0.001 o menos.
-- usuario_id es uuid (PK de usuarios es uuid) con ON DELETE CASCADE coherente
-- con 010/026/030; el proyecto usa cero borrado logico, pero la FK se mantiene
-- coherente para no dejar filas huerfanas.

CREATE TABLE IF NOT EXISTS xp_ledger (
  id            bigserial PRIMARY KEY,
  usuario_id    uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  accion        text NOT NULL,
  xp_base       numeric(12,2) NOT NULL DEFAULT 0,
  mult_nivel    numeric(10,6) NOT NULL DEFAULT 1,
  mult_stack    numeric(10,6) NOT NULL DEFAULT 1,
  mult_final    numeric(10,6) NOT NULL DEFAULT 1,
  cap_aplicado  text NOT NULL DEFAULT 'ninguno'
                CONSTRAINT xp_ledger_cap_aplicado_chk
                CHECK (cap_aplicado IN ('ninguno','progresion','global','accion')),
  bonos_planos  numeric(12,2) NOT NULL DEFAULT 0,
  xp_final      numeric(12,2) NOT NULL DEFAULT 0,
  es_exento     boolean NOT NULL DEFAULT false,
  contexto      jsonb,
  creado_en     timestamptz NOT NULL DEFAULT NOW()
);

-- Idempotencia de la precision (hallazgo MEDIO de la auditoria): si xp_ledger
-- YA existiera de una corrida previa con numeric(6,4)/numeric(8,4), el CREATE
-- TABLE IF NOT EXISTS no cambia el tipo. Este ALTER lo reafirma en 3 columnas:
-- en una tabla recien creada con numeric(10,6) es no-op (PostgreSQL no reescribe
-- si el tipo destino es identico); en una tabla vieja migra la precision. No
-- toca xp_base / bonos_planos / xp_final (siguen numeric(12,2)).

ALTER TABLE xp_ledger
  ALTER COLUMN mult_nivel TYPE numeric(10,6),
  ALTER COLUMN mult_stack TYPE numeric(10,6),
  ALTER COLUMN mult_final TYPE numeric(10,6);

-- Guard del CHECK para una tabla PREEXISTENTE (o creada por una corrida previa
-- de esta migracion con la lista vieja de 3 valores): ADD CONSTRAINT no soporta
-- IF NOT EXISTS en PostgreSQL, asi que se prueba contra pg_constraint.
-- Idempotencia: si el constraint ya existe con la lista NUEVA (4 valores) no se
-- toca; si existe con la lista VIEJA (sin 'accion') se DROPea y se vuelve a
-- crear; si no existe, se crea. Segunda corrida = no-op.

DO $$
BEGIN
  IF to_regclass('public.xp_ledger') IS NULL THEN
    RAISE NOTICE 'migracion 031: xp_ledger no existe; se omite el CHECK';
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.xp_ledger'::regclass
      AND contype = 'c'
      AND conname = 'xp_ledger_cap_aplicado_chk'
      AND pg_get_constraintdef(oid) NOT LIKE '%accion%'
  ) THEN
    ALTER TABLE xp_ledger DROP CONSTRAINT xp_ledger_cap_aplicado_chk;
    RAISE NOTICE 'migracion 031: CHECK viejo xp_ledger_cap_aplicado_chk eliminado';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.xp_ledger'::regclass
      AND contype = 'c'
      AND conname = 'xp_ledger_cap_aplicado_chk'
  ) THEN
    ALTER TABLE xp_ledger
      ADD CONSTRAINT xp_ledger_cap_aplicado_chk
      CHECK (cap_aplicado IN ('ninguno','progresion','global','accion'));
    RAISE NOTICE 'migracion 031: CHECK xp_ledger_cap_aplicado_chk creado';
  ELSE
    RAISE NOTICE 'migracion 031: CHECK xp_ledger_cap_aplicado_chk ya vigente; no-op';
  END IF;
END $$;

-- Indice 1: historial de XP de un usuario, mas reciente primero (toast/perfil).
CREATE INDEX IF NOT EXISTS idx_xp_ledger_usuario_creado
  ON xp_ledger (usuario_id, creado_en DESC);

-- Indice 2: agrupacion por accion en el tiempo (panel "Salud de la Red" y
-- futuros caps por accion/dia).
CREATE INDEX IF NOT EXISTS idx_xp_ledger_accion_creado
  ON xp_ledger (accion, creado_en DESC);

-- ============================================================================
-- 4. REPRICING de consumibles.precio_xp (ADR-053 Decision 10)
-- ============================================================================
-- Se escribe SIEMPRE en la columna que EXISTE en la BD real: precio_xp.
-- Valores ABSOLUTOS (nunca precio_xp * factor). El factor de recalibracion es
-- x2.0 para la categoria impulso y x1.6 para el resto.
--
-- Criterio de redondeo fijado por sql-security (ADR-053 Decision 10): entero
-- ABSOLUTO multiplo de 10. Los 17 productos caen EXACTOS en multiplos de 10
-- (350*2=700, 450*1.6=720, 650*1.6=1040, 1500*1.6=2400, ...), por lo que NO se
-- aplica redondeo alguno y el literal del ADR es el valor final.
--
-- Tabla de equivalencias (categoria | clave | hoy | factor | nuevo):
--   impulso   | amuleto_x2                | 350  | x2.0 | 700
--   impulso   | imantador_cromos          | 400  | x2.0 | 800
--   impulso   | trompeta_fama             | 500  | x2.0 | 1000
--   coleccion | cuaderno_expedicion       | 450  | x1.6 | 720
--   coleccion | pergamino_mapa            | 500  | x1.6 | 800
--   general   | pluma_inspirada           | 600  | x1.6 | 960
--   perfil    | perfil_marco_plata        | 300  | x1.6 | 480
--   perfil    | perfil_tema_oscuro        | 500  | x1.6 | 800
--   perfil    | perfil_vitrina_destacada  | 650  | x1.6 | 1040
--   perfil    | perfil_marco_dorado       | 700  | x1.6 | 1120
--   perfil    | perfil_titulo_custom      | 800  | x1.6 | 1280
--   perfil    | perfil_banda_artista      | 900  | x1.6 | 1440
--   perfil    | perfil_fondo_paisaje      | 1000 | x1.6 | 1600
--   social    | pin_cromado               | 250  | x1.6 | 400
--   social    | vitrina_estelar           | 300  | x1.6 | 480
--   social    | sala_efimera              | 800  | x1.6 | 1280
--   social    | pase_vip                  | 1500 | x1.6 | 2400
-- TOTAL = 17 filas.
--
-- Un solo UPDATE con JOIN a VALUES: idempotente (asigna literales) y atomico.
-- Si alguna clave no existiera, simplemente no se actualiza (no falla); la
-- verificacion post-aplicacion confirma que son 17 filas.

UPDATE consumibles AS c
SET precio_xp = v.precio
FROM (VALUES
  ('amuleto_x2',              700),
  ('imantador_cromos',        800),
  ('trompeta_fama',           1000),
  ('cuaderno_expedicion',     720),
  ('pergamino_mapa',          800),
  ('pluma_inspirada',         960),
  ('perfil_marco_plata',      480),
  ('perfil_tema_oscuro',      800),
  ('perfil_vitrina_destacada', 1040),
  ('perfil_marco_dorado',     1120),
  ('perfil_titulo_custom',    1280),
  ('perfil_banda_artista',    1440),
  ('perfil_fondo_paisaje',    1600),
  ('pin_cromado',             400),
  ('vitrina_estelar',         480),
  ('sala_efimera',            1280),
  ('pase_vip',                2400)
) AS v(clave, precio)
WHERE c.clave = v.clave;

-- ============================================================================
-- 4-bis. GUARD DE COHERENCIA CON LA MIGRACION 027 (NO APLICADA)
-- ============================================================================
-- La 027 (ADR-042) crea consumibles.precio_xp_base, consumibles.precio_xp_actual
-- y la vista consumibles_precio. Hoy NO esta aplicada, asi que esas columnas NO
-- existen; este bloque NO puede fallar por su ausencia.
-- Si la 027 YA estuviera aplicada, deja precio_xp_base COHERENTE con precio_xp
-- (mismo valor) para que la vista consumibles_precio no arranque con precios
-- viejos, y precio_xp_actual solo si esta NULL (NULL = usar base en la 027).
--
-- CONTRATO DE ORDEN (deuda explicita, ADR-053 Decision 10 / R-2): si la 027 se
-- aplica DESPUES de la 031, el operador DEBE re-sembrar precio_xp_base desde
-- precio_xp. Este mismo bloque sirve para eso: re-ejecutar la 031 es seguro y
-- no-op, y con la 027 ya presente el bloque copia los valores actuales.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='consumibles'
      AND column_name='precio_xp_base'
  ) THEN
    RAISE NOTICE 'migracion 031: 027 no aplicada (precio_xp_base ausente); se omite el re-seed';
    RETURN;
  END IF;

  UPDATE consumibles
    SET precio_xp_base = precio_xp
    WHERE precio_xp_base IS DISTINCT FROM precio_xp;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='consumibles'
      AND column_name='precio_xp_actual'
  ) THEN
    UPDATE consumibles
      SET precio_xp_actual = precio_xp
      WHERE precio_xp_actual IS NULL;
  END IF;
END $$;

-- ============================================================================
-- VERIFICACION POST-APLICACION (solo lectura; NO se ejecuta dentro de la
-- migracion; NO modifica nada). Copiar y correr sentencia por sentencia.
-- ============================================================================
-- (a) usuarios.nivel_max (esperada 1 fila; smallint; NO NULL; default 1):
-- SELECT column_name, data_type, is_nullable, column_default
--   FROM information_schema.columns
--   WHERE table_schema='public' AND table_name='usuarios'
--     AND column_name='nivel_max';
--
-- (a.2) Siembra: nivel_max NO puede ser menor que el nivel viejo derivado de
--       xp_total. Esperado: 0 filas (ningun usuario por debajo).
-- SELECT id, xp_total, nivel_max FROM usuarios
--   WHERE nivel_max < (
--     CASE
--       WHEN xp_total >= 30000 THEN 20  WHEN xp_total >= 24000 THEN 19
--       WHEN xp_total >= 19500 THEN 18  WHEN xp_total >= 16000 THEN 17
--       WHEN xp_total >= 13000 THEN 16  WHEN xp_total >= 10500 THEN 15
--       WHEN xp_total >= 8500  THEN 14  WHEN xp_total >= 6800  THEN 13
--       WHEN xp_total >= 5200  THEN 12  WHEN xp_total >= 4000  THEN 11
--       WHEN xp_total >= 3200  THEN 10  WHEN xp_total >= 2500  THEN 9
--       WHEN xp_total >= 1900  THEN 8   WHEN xp_total >= 1400  THEN 7
--       WHEN xp_total >= 1000  THEN 6   WHEN xp_total >= 700   THEN 5
--       WHEN xp_total >= 450   THEN 4   WHEN xp_total >= 250   THEN 3
--       WHEN xp_total >= 100   THEN 2   ELSE 1
--     END);
--
-- (b) gamificacion_config (esperadas 3 filas con estos valores):
-- SELECT clave, valor FROM gamificacion_config ORDER BY clave;
--   cap_global     | 10.0000
--   cap_progresion |  5.0000
--   m_nivel_max    |  3.0000
--
-- (c) xp_ledger: columnas (esperadas 13 filas, en el orden del ADR):
-- SELECT column_name, data_type, is_nullable, column_default
--   FROM information_schema.columns
--   WHERE table_schema='public' AND table_name='xp_ledger'
--   ORDER BY ordinal_position;
--
-- (c.2) Precision de los multiplicadores (esperadas 3 filas con scale = 6):
-- SELECT column_name, numeric_precision, numeric_scale
--   FROM information_schema.columns
--   WHERE table_schema='public' AND table_name='xp_ledger'
--     AND column_name IN ('mult_nivel','mult_stack','mult_final')
--   ORDER BY column_name;
--
-- (d) xp_ledger: indices (esperadas 2 filas):
-- SELECT indexname FROM pg_indexes
--   WHERE schemaname='public' AND tablename='xp_ledger'
--     AND indexname IN ('idx_xp_ledger_usuario_creado','idx_xp_ledger_accion_creado')
--   ORDER BY indexname;
--
-- (e) xp_ledger: CHECK de cap_aplicado (esperada 1 fila; la definicion DEBE
--     contener los 4 valores, incluido 'accion'):
-- SELECT conname, pg_get_constraintdef(oid) AS def
--   FROM pg_constraint
--   WHERE conrelid='public.xp_ledger'::regclass AND contype='c'
--     AND conname='xp_ledger_cap_aplicado_chk';
--
-- (f) Repricing: precios nuevos con su categoria (esperadas 17 filas, con
--     exactamente estos valores):
-- SELECT categoria, clave, precio_xp FROM consumibles
--   WHERE clave IN ('amuleto_x2','imantador_cromos','trompeta_fama',
--                   'cuaderno_expedicion','pergamino_mapa','pluma_inspirada',
--                   'perfil_marco_plata','perfil_tema_oscuro',
--                   'perfil_vitrina_destacada','perfil_marco_dorado',
--                   'perfil_titulo_custom','perfil_banda_artista',
--                   'perfil_fondo_paisaje','pin_cromado','vitrina_estelar',
--                   'sala_efimera','pase_vip')
--   ORDER BY categoria, clave;
--
-- (g) Estado de las columnas de la 027 (para saber si hay que RE-SEMBRAR):
--     Hoy: 0 filas (027 NO aplicada). Si la 027 se aplica despues, correr el
--     re-seed comentado abajo y confirmar que las 3 columnas existen.
-- SELECT column_name FROM information_schema.columns
--   WHERE table_schema='public' AND table_name='consumibles'
--     AND column_name IN ('precio_xp_base','precio_xp_actual','tipo_canje')
--   ORDER BY column_name;
--
-- (g.2) RE-SEED 027 (solo si la 027 se aplico DESPUES de la 031; idempotente):
-- UPDATE consumibles SET precio_xp_base = precio_xp
--   WHERE precio_xp_base IS DISTINCT FROM precio_xp;
-- UPDATE consumibles SET precio_xp_actual = precio_xp
--   WHERE precio_xp_actual IS NULL;
--
-- (h) Idempotencia global: re-ejecutar TODO el archivo y volver a correr
--     (a)-(g): los conteos y valores deben ser IDENTICOS (no-op funcional).
