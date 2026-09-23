-- ============================================================================
-- Migration 033: Re-siembra de usuarios.nivel_max para la curva de 40 niveles
--   (nivel_max = PISO de insignia; el nivel economico se deriva de xp_total)
-- Fecha: 2026-09-23
-- Referencias: ADR-053 (Gamificacion v6: usuarios.nivel_max es el techo
--   historico de la INSIGNIA y nivel_visible = GREATEST(nivel derivado,
--   nivel_max); la migracion 031 sembro nivel_max con la tabla VIEJA de 20
--   umbrales con techo 42000 y este release reescala la insignia a 40
--   niveles), ADR-006 (baseline = esquema REAL auditado), ADR-008
--   (gobernanza e idempotencia de esquema), ADR-002 (ASCII-safe), ADR-003
--   (cero borrado logico), ADR-018 (de-nivel: gastar XP baja el nivel
--   economico pero NUNCA la insignia).
-- Requiere: 031 aplicada (usuarios.nivel_max smallint NOT NULL DEFAULT 1).
--   La 031 esta aplicada en Neon (2026-09-21). Este archivo es ADITIVO y
--   RE-EJECUTABLE sobre ese estado.
--
-- QUE HACE
--   1. Asegura la columna usuarios.nivel_max smallint NOT NULL DEFAULT 1
--      (ADD COLUMN IF NOT EXISTS; no-op si la 031 ya la creo).
--   2. Re-siembra nivel_max con la tabla canonica de 40 umbrales (nivel 1..40)
--      mediante UN solo UPDATE monotonico:
--        nivel_max = mayor(nivel_max previo, nivel de 40 bandas segun xp_total)
--      Asi NINGUN usuario pierde la insignia que ya mostraba con la curva
--      anterior de 20 niveles.
--
-- SEMANTICA (ADR-053)
--   nivel_max es SOLO un piso de INSIGNIA (el techo historico alcanzado). NO
--   es el nivel economico: el nivel economico se deriva de xp_total en cada
--   lectura (api/usuarios.js:NIVELES) y es el que alimenta M_nivel. Gastar XP
--   puede BAJAR el nivel economico (de-nivel, ADR-018), pero jamas baja
--   nivel_max: por eso el UPDATE usa GREATEST y es MONOTONO.
--
-- TABLA CANONICA (40 umbrales, nivel 1..40)
--   N1=0, N2=150, N3=500, N4=1000, N5=1650, N6=2500, N7=3450, N8=4550,
--   N9=5800, N10=7150, N11=8650, N12=10250, N13=12000, N14=13850,
--   N15=15800, N16=17900, N17=20100, N18=22450, N19=24850, N20=27400,
--   N21=30050, N22=32800, N23=35700, N24=38650, N25=41750, N26=44900,
--   N27=48200, N28=51600, N29=55050, N30=58700, N31=62400, N32=66150,
--   N33=70050, N34=74050, N35=78150, N36=82300, N37=86600, N38=90950,
--   N39=95450, N40=100000.
--   (El techo de la curva sube de 42000 -- v6 -- a 100000.)
--
-- CARACTER DE LA MIGRACION
--   ADITIVA y MONOTONA. No elimina, no renombra, no toca columnas legacy
--   (usuarios.nivel y usuarios.badge_actual NO se escriben). IDEMPOTENTE
--   (ADR-008): ADD COLUMN IF NOT EXISTS + UPDATE con GREATEST(previo, nuevo),
--   de modo que una segunda corrida asigna exactamente el mismo valor (no-op
--   funcional). ASCII-SAFE (ADR-002): cero bytes > 127, cero tildes, cero ene,
--   cero emojis, cero escapes unicode, cero backticks.
--
-- APLICACION
--   Correr este archivo COMPLETO en el editor SQL de Neon (o con
--   scripts/apply_sql_file.js). Patron BUG-021/BUG-060: archivo COMPLETO en
--   una sola corrida. Re-ejecutarlo es no-op funcional.
--
-- ROLLBACK (emergencia; NO restaura los valores previos de nivel_max)
--   No hay rollback sin perdida: la re-siembra solo SUBE nivel_max. Para
--   volver a la curva de 20 niveles habria que re-ejecutar el UPDATE de la
--   031, que tambien usa GREATEST y por tanto tampoco BAJARIA nivel_max. La
--   columna NO se elimina (la 031 la requiere para nivel_visible).
-- ============================================================================

-- ============================================================================
-- 0. PREFLIGHT (SOLO LECTURA; NO forma parte del DDL; NO se ejecuta solo).
--    Copiar y correr sentencia por sentencia ANTES de aplicar la 033.
-- ============================================================================
-- (0.a) Confirmar que nivel_max existe (esperada 1 fila; smallint; NO NULL):
-- SELECT column_name, data_type, is_nullable, column_default
--   FROM information_schema.columns
--   WHERE table_schema='public' AND table_name='usuarios'
--     AND column_name='nivel_max';
--
-- (0.b) Distribucion ANTES (conteo de usuarios activos por nivel_max):
-- SELECT nivel_max, COUNT(*)::int AS usuarios FROM usuarios
--   WHERE activo = true GROUP BY nivel_max ORDER BY nivel_max;

-- ============================================================================
-- 1. Asegurar la columna (idempotente; no-op si la 031 ya la creo)
-- ============================================================================
-- nivel_max = maximo nivel historico alcanzado; nivel_visible =
-- GREATEST(calcularNivel(xp_total).nivel, COALESCE(nivel_max,1)). Se persiste
-- SOLO este "techo historico" (una columna derivada mas), nunca el nivel
-- actual: usuarios.nivel y usuarios.badge_actual siguen siendo legacy y el
-- backend NO las escribe.

ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS nivel_max smallint NOT NULL DEFAULT 1;

-- ============================================================================
-- 2. Re-siembra MONOTONA con la tabla canonica de 40 umbrales
-- ============================================================================
-- MONOTONIA (clave de la idempotencia): se asigna
--   GREATEST(COALESCE(nivel_max,1), <nivel de 40 bandas derivado de xp_total>)
-- NUNCA una asignacion directa. Razon: en una segunda corrida -o si la
-- migracion se corre despues de que el usuario ya subio con la tabla NUEVA-
-- la derivacion podria ser MENOR que el nivel_max ya alcanzado; el GREATEST
-- garantiza nivel_max = mayor(nivel previo, nivel derivado) y por tanto jamas
-- decrece. Como el ADD COLUMN es NOT NULL DEFAULT 1, la siembra parte de 1 y
-- COALESCE es defensa adicional. Segunda corrida: el valor asignado es
-- identico al existente -> no-op funcional.
--
-- ESTRUCTURA DEL CASE: 40 bandas descendentes (N40 -> N1) + ELSE 1 de defensa.
--   - La banda de umbral 0 cubre N1 de forma explicita (usa el umbral
--     canonico 0 de la tabla).
--   - El ELSE 1 queda como red de seguridad para xp_total NULL o negativo
--     (NULL >= 0 no es TRUE, cae al ELSE). Es semanticamente identico a N1.
--   - Total: 40 bandas WHEN xp_total >= + ELSE 1 END.
-- Alcance: solo usuarios activos (WHERE activo = true).

UPDATE usuarios
SET nivel_max = GREATEST(
  COALESCE(nivel_max, 1),
  (CASE
    WHEN xp_total >= 100000 THEN 40
    WHEN xp_total >= 95450  THEN 39
    WHEN xp_total >= 90950  THEN 38
    WHEN xp_total >= 86600  THEN 37
    WHEN xp_total >= 82300  THEN 36
    WHEN xp_total >= 78150  THEN 35
    WHEN xp_total >= 74050  THEN 34
    WHEN xp_total >= 70050  THEN 33
    WHEN xp_total >= 66150  THEN 32
    WHEN xp_total >= 62400  THEN 31
    WHEN xp_total >= 58700  THEN 30
    WHEN xp_total >= 55050  THEN 29
    WHEN xp_total >= 51600  THEN 28
    WHEN xp_total >= 48200  THEN 27
    WHEN xp_total >= 44900  THEN 26
    WHEN xp_total >= 41750  THEN 25
    WHEN xp_total >= 38650  THEN 24
    WHEN xp_total >= 35700  THEN 23
    WHEN xp_total >= 32800  THEN 22
    WHEN xp_total >= 30050  THEN 21
    WHEN xp_total >= 27400  THEN 20
    WHEN xp_total >= 24850  THEN 19
    WHEN xp_total >= 22450  THEN 18
    WHEN xp_total >= 20100  THEN 17
    WHEN xp_total >= 17900  THEN 16
    WHEN xp_total >= 15800  THEN 15
    WHEN xp_total >= 13850  THEN 14
    WHEN xp_total >= 12000  THEN 13
    WHEN xp_total >= 10250  THEN 12
    WHEN xp_total >= 8650   THEN 11
    WHEN xp_total >= 7150   THEN 10
    WHEN xp_total >= 5800   THEN 9
    WHEN xp_total >= 4550   THEN 8
    WHEN xp_total >= 3450   THEN 7
    WHEN xp_total >= 2500   THEN 6
    WHEN xp_total >= 1650   THEN 5
    WHEN xp_total >= 1000   THEN 4
    WHEN xp_total >= 500    THEN 3
    WHEN xp_total >= 150    THEN 2
    WHEN xp_total >= 0      THEN 1
    ELSE 1
  END)
)::smallint
WHERE activo = true;

-- ============================================================================
-- 3. Documentacion de la columna (COMMENT idempotente; mismo texto cada vez)
-- ============================================================================
-- Deja explicito en el catalogo de la BD que nivel_max es un PISO de insignia
-- y NO el nivel economico (que se deriva de xp_total).

COMMENT ON COLUMN usuarios.nivel_max IS
  'Techo historico de INSIGNIA (piso). Nivel economico se deriva de xp_total. Curva 40 niveles. ADR-053';

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
-- (b) Conteo de usuarios activos por nivel_max (distribucion DESPUES):
-- SELECT nivel_max, COUNT(*)::int AS usuarios FROM usuarios
--   WHERE activo = true GROUP BY nivel_max ORDER BY nivel_max;
--
-- (c) Invariante de piso: nivel_max NO puede ser menor que el nivel derivado
--     de xp_total con la tabla de 40 umbrales. Esperado: 0 filas (ningun
--     usuario por debajo de su insignia). La tabla se expresa como VALUES
--     (no repite bandas CASE) para no inflar el conteo de bandas del UPDATE.
-- WITH umbral(nivel, xp) AS (VALUES
--     (40,100000),(39,95450),(38,90950),(37,86600),(36,82300),(35,78150),
--     (34,74050),(33,70050),(32,66150),(31,62400),(30,58700),(29,55050),
--     (28,51600),(27,48200),(26,44900),(25,41750),(24,38650),(23,35700),
--     (22,32800),(21,30050),(20,27400),(19,24850),(18,22450),(17,20100),
--     (16,17900),(15,15800),(14,13850),(13,12000),(12,10250),(11,8650),
--     (10,7150),(9,5800),(8,4550),(7,3450),(6,2500),(5,1650),(4,1000),
--     (3,500),(2,150),(1,0))
-- SELECT u.id, u.xp_total, u.nivel_max, d.nivel AS nivel_derivado
--   FROM usuarios u
--   JOIN LATERAL (
--     SELECT nivel FROM umbral WHERE u.xp_total >= xp ORDER BY nivel DESC LIMIT 1
--   ) d ON true
--   WHERE u.activo = true AND u.nivel_max < d.nivel;
--
-- (d) Idempotencia global: re-ejecutar TODO el archivo y volver a correr
--     (a)-(c): los conteos y valores deben ser IDENTICOS (no-op funcional).
