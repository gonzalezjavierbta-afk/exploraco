-- ============================================================================
-- Migration 024: Casas - cofre de tributo y factor de nivelacion + Clases
--   Rising Star (profesion)
-- TSK-112 / ADR-038 (DECISIONS.md)
-- Fecha: 2026-09-17
-- Spec: DECISIONS.md ADR-038 (contrato de diseno de TSK-112, L1460-1616)
-- Requiere: migraciones 017 y 021 aplicadas; el resto 019-023 YA aplicadas.
--
-- CARACTER DE LA MIGRACION
--   ADITIVA: solo agrega 4 columnas a usuarios, 1 tabla nueva (casas_cofre),
--   1 constraint CHECK y 1 indice parcial. NO elimina ni renombra nada; NO
--   toca ninguna columna ni objeto de 001-023.
--   IDEMPOTENTE (ADR-008): todo DDL usa IF NOT EXISTS; el constraint usa el
--   patron DROP CONSTRAINT IF EXISTS + ADD CONSTRAINT en bloque separado (el
--   ADD COLUMN IF NOT EXISTS no vuelve a agregar un CHECK si la columna ya
--   existia) y el seed usa ON CONFLICT (casa) DO NOTHING. Re-ejecutar el
--   archivo COMPLETO es no-op seguro (aplicable N veces).
--   ASCII-SAFE (ADR-002): cero bytes > 127, cero tildes y cero ene, cero
--   backticks, cero emojis. El texto va sin acentos. NO se introducen
--   literales de escape unicode (BUG-026): este archivo no emite emojis.
--
-- PRE-REQUISITOS
--   017 (usuarios.casa varchar(20) + casa_elegida_en + CHECK chk_usuarios_casa
--   + indice parcial idx_usuarios_casa) y 021 (XP a numeric(12,2)) aplicadas.
--   019, 020, 022 y 023 YA aplicadas en Neon (confirmado por Javier el
--   2026-09-17; ver TASKS.md TSK-111/TSK-112). La 024 NO toca ninguno de sus
--   objetos: solo lee usuarios para agregar columnas aditivas.
--
-- ALCANCE Y RECHAZOS EXPLICITOS (ADR-038)
--   1. Se REUSA usuarios.casa (varchar(20), CHECK condor|jaguar|delfin;
--      ADR-028 / migracion 017) como UNICA fuente de identidad de Casa.
--   2. Se RECHAZA la propuesta original de crear casa_id varchar(20) con
--      valores alta|media|baja: duplicaria ADR-028 con una segunda fuente de
--      verdad de Casa y dos flujos de eleccion capaces de divergir. NO se
--      crea casa_id y NO se crean los valores alta/media/baja.
--   3. Se RECHAZA crear casas_tributacion: el cofre (casas_cofre) es la unica
--      tabla nueva de Casas en v1.
--   4. NO se crea FK entre usuarios.casa y casas_cofre.casa. La consistencia
--      la garantizan las dos listas CHECK espejo + el seed, con preflight de
--      comparacion (ADR-038; evita validar sobre filas historicas de usuarios).
--   5. casas_votaciones se DIFIERE a v2. NO se crea en la 024.
--   6. La Clase (clase_id/nivel_clase/xp_clase) es una capa NUEVA que
--      COEXISTE con el Arbol de Clases de 16 ramas (usuarios.progreso_arbol,
--      ADR-028 / migracion 017). NO se toca progreso_arbol ni ninguna otra
--      columna creada por la 017.
--
-- ORDEN DE APLICACION
--   Correr este archivo COMPLETO en el editor SQL de Neon ANTES del deploy del
--   backend v16 de api/usuarios.js (que asume estas columnas/tabla). Antes de
--   aplicar, correr el PREFLIGHT de solo lectura de la seccion 0.
-- ============================================================================

-- ============================================================================
-- 0. PREFLIGHT (SOLO LECTURA; NO forma parte del DDL; NO se ejecuta solo).
--    Copiar y correr sentencia por sentencia ANTES de aplicar la 024 y
--    confirmar cada resultado esperado.
-- ============================================================================
-- (0.a) usuarios.casa de la 017 EXISTE y sera REUSADA (no se crea casa_id).
--       Esperado: 2 filas -> casa (character varying) y casa_elegida_en
--       (timestamp with time zone).
-- SELECT table_name, column_name, data_type, is_nullable
--   FROM information_schema.columns
--   WHERE table_schema = 'public' AND table_name = 'usuarios'
--     AND column_name IN ('casa','casa_elegida_en')
--   ORDER BY column_name;
--
-- (0.b) Probar que casa_id NO existe (la propuesta RECHAZADA por ADR-038).
--       Esperado: 0 filas. Si devuelve una fila, DETENER: hay una segunda
--       fuente de identidad de Casa y hay que investigarla antes de seguir.
-- SELECT column_name, data_type
--   FROM information_schema.columns
--   WHERE table_schema = 'public' AND table_name = 'usuarios'
--     AND column_name = 'casa_id';
--
-- (0.c) Confirmar que las 4 columnas de la 024 aun NO existen (base limpia)
--       o ya existen (base ya migrada, re-ejecucion). Esperado: 0 filas en
--       base limpia; 4 filas tras la primera aplicacion.
-- SELECT table_name, column_name, data_type, is_nullable, column_default
--   FROM information_schema.columns
--   WHERE table_schema = 'public' AND table_name = 'usuarios'
--     AND column_name IN ('clase_id','nivel_clase','xp_clase','clase_elegida_en')
--   ORDER BY column_name;
--
-- (0.d) Confirmar que casas_cofre aun NO existe. Esperado: 0 filas en base
--       limpia; 1 fila tras la primera aplicacion.
-- SELECT tablename FROM pg_tables
--   WHERE schemaname = 'public' AND tablename = 'casas_cofre';
--
-- (0.e) Confirmar que el indice de la 017 sigue vigente (la 024 NO crea
--       idx_usuarios_casa_id y NO debe tocar idx_usuarios_casa). Esperado:
--       1 fila con idx_usuarios_casa.
-- SELECT indexname FROM pg_indexes
--   WHERE schemaname = 'public' AND indexname = 'idx_usuarios_casa';
--
-- (0.f) Probar que los objetos de las 019-023 siguen existiendo (la 024 NO
--       los toca; el resultado debe ser IDENTICO antes y despues). Esperado:
--       los 2 indices y las 6 tablas listados.
-- SELECT indexname FROM pg_indexes
--   WHERE schemaname = 'public'
--     AND indexname IN ('idx_media_guardados_usuario','idx_media_guardados_item',
--       'idx_media_compartidos_usuario_dia','idx_media_compartidos_item')
--   ORDER BY indexname;
-- SELECT tablename FROM pg_tables
--   WHERE schemaname = 'public'
--     AND tablename IN ('media_guardados','media_compartidos','media_votos',
--       'media_comentarios','media_comentario_likes')
--   ORDER BY tablename;
--
-- (0.g) Confirmar las columnas de la 019/020 (la 024 NO las toca). Esperado:
--       4 filas -> destinos.sintro TEXT, destinos.radio_m integer.
-- SELECT column_name, data_type
--   FROM information_schema.columns
--   WHERE table_schema = 'public' AND table_name = 'destinos'
--     AND column_name IN ('sintro','radio_m')
--   ORDER BY column_name;
--
-- (0.h) Comparar las dos listas CHECK espejo de Casa (sin FK en v1): las
--       filas de usuarios.casa con valor deben caer en el catalogo de
--       casas_cofre. Esperado: 0 filas en base limpia (casas_cofre aun no
--       existe); 0 filas tras aplicar la 024.
-- SELECT DISTINCT u.casa
--   FROM usuarios u
--   WHERE u.casa IS NOT NULL
--     AND u.casa NOT IN (SELECT casa FROM casas_cofre)
--   ORDER BY u.casa;

-- ============================================================================
-- 1. USUARIOS: COLUMNAS DE CLASE (Rising Star / profesion)
-- ============================================================================
-- ADITIVAS: no se toca casa, casa_elegida_en, progreso_arbol, perfil_config ni
-- ninguna columna de la 017. La Clase COEXISTE con el Arbol de 16 ramas
-- (ADR-038). nivel_clase y xp_clase nacen NOT NULL DEFAULT (1 y 0); el ADD
-- COLUMN IF NOT EXISTS re-ejecutado no falla: si la columna ya existe, la
-- sentencia es no-op y PostgreSQL NO re-valida el default.

ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS clase_id varchar(20),
  ADD COLUMN IF NOT EXISTS nivel_clase int NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS xp_clase numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS clase_elegida_en timestamptz;

-- CONSTRAINT DE CLASE SEPARADA (idempotencia real): ADD COLUMN IF NOT EXISTS
-- no re-agrega un CHECK si la columna ya existia; por eso el DROP + ADD se
-- ejecuta siempre en su propio bloque. Se sueltan los dos nombres posibles
-- (el explicito y el autogenerado) para no dejar constraints duplicadas.
ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS chk_usuarios_clase;
ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_clase_id_check;
ALTER TABLE usuarios ADD CONSTRAINT chk_usuarios_clase
  CHECK (clase_id IS NULL OR clase_id IN ('cartografo','cronista','explorador'));

-- ============================================================================
-- 2. CASAS_COFRE: COFRE DE TRIBUTO POR CASA (ADR-038)
-- ============================================================================
-- Una fila por Casa. xp_cofre_total acumula el tributo (tributacion del 10%)
-- y factor_conversion es el factor de nivelacion por poblacion activa.
-- El catalogo CHECK es la lista ESPEJO de chk_usuarios_casa (017): mismas 3
-- casas. NO hay FK usuarios.casa -> casas_cofre.casa en v1 (rechazo 4).

CREATE TABLE IF NOT EXISTS casas_cofre (
  casa varchar(20) PRIMARY KEY CHECK (casa IN ('condor','jaguar','delfin')),
  xp_cofre_total numeric(12,2) NOT NULL DEFAULT 0,
  poblacion_activa int NOT NULL DEFAULT 0,
  factor_conversion numeric(5,4) NOT NULL DEFAULT 1.0,
  actualizado_en timestamptz NOT NULL DEFAULT now()
);

-- Seed idempotente de las 3 Casas reales. ON CONFLICT (casa) DO NOTHING: si
-- ya existen, no se pisan sus acumuladores (cero sobreescritura / cero
-- borrado, ADR-003). Re-ejecutar deja el mismo estado.
INSERT INTO casas_cofre (casa) VALUES ('condor'),('jaguar'),('delfin')
ON CONFLICT (casa) DO NOTHING;

-- ============================================================================
-- 3. INDICES DE CONSULTA
-- ============================================================================
-- Indice parcial del filtro por Clase: solo indexa filas con Clase elegida
-- (clase_id NULL no se indexa). NO se crea idx_usuarios_casa_id: la identidad
-- de Casa sigue en usuarios.casa y su indice idx_usuarios_casa (017, L187-189)
-- ya existe y NO se toca.

CREATE INDEX IF NOT EXISTS idx_usuarios_clase_id
  ON usuarios (clase_id)
  WHERE clase_id IS NOT NULL;

-- ============================================================================
-- VERIFICACION POST-APLICACION (solo lectura; NO se ejecuta dentro de la
-- migracion). Copiar y correr sentencia por sentencia en el editor de Neon.
-- ============================================================================
-- (a) Las 4 columnas de Clase en usuarios (esperadas 4 filas):
-- SELECT column_name, data_type, is_nullable, column_default
--   FROM information_schema.columns
--   WHERE table_schema='public' AND table_name='usuarios'
--     AND column_name IN ('clase_id','nivel_clase','xp_clase','clase_elegida_en')
--   ORDER BY column_name;
--
-- (b) Constraint chk_usuarios_clase (esperada 1 fila con el CHECK de las 3
--     clases):
-- SELECT conname, pg_get_constraintdef(oid) AS def
--   FROM pg_constraint
--   WHERE conname = 'chk_usuarios_clase';
--
-- (c) Tabla casas_cofre y sus 3 filas (esperadas 3 filas, una por Casa, con
--     xp_cofre_total 0.00, poblacion_activa 0 y factor_conversion 1.0000):
-- SELECT tablename FROM pg_tables
--   WHERE schemaname='public' AND tablename='casas_cofre';
-- SELECT casa, xp_cofre_total, poblacion_activa, factor_conversion, actualizado_en
--   FROM casas_cofre
--   ORDER BY casa;
--
-- (d) Indice idx_usuarios_clase_id (esperada 1 fila) y constancia de que el
--     indice de la 017 sigue existiendo:
-- SELECT indexname FROM pg_indexes
--   WHERE schemaname='public'
--     AND indexname IN ('idx_usuarios_clase_id','idx_usuarios_casa')
--   ORDER BY indexname;
--
-- (e) PREFLIGHT FINAL: demostrar que casa_id NO existe (0 filas) y que las
--     columnas de la 017 siguen intactas:
-- SELECT column_name FROM information_schema.columns
--   WHERE table_schema='public' AND table_name='usuarios'
--     AND column_name = 'casa_id';
-- SELECT column_name, data_type FROM information_schema.columns
--   WHERE table_schema='public' AND table_name='usuarios'
--     AND column_name IN ('casa','casa_elegida_en','progreso_arbol','perfil_config')
--   ORDER BY column_name;
--
-- (f) Comparacion de listas CHECK espejo (0 filas = consistente, sin FK v1):
-- SELECT DISTINCT u.casa
--   FROM usuarios u
--   WHERE u.casa IS NOT NULL
--     AND u.casa NOT IN (SELECT casa FROM casas_cofre)
--   ORDER BY u.casa;
