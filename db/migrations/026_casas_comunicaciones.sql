-- ============================================================================
-- Migration 026: Comunicacion (canal oficial) + Casas (tributo, lider, roles
--   y misiones) + soporte Admin
-- Referencias: ADR-002 (ASCII-safe), ADR-003 (cero borrado logico),
--   ADR-008 (gobernanza e idempotencia de esquema), ADR-038 (Casas con cofre
--   y Clases) para la capa de Casas.
-- Fecha: 2026-09-18
-- Requiere: 008 y 017 (chat_salas), 010/016/017 (usuarios), 024 (casas_cofre)
--   aplicadas. El resto (019-023 y 025) YA aplicado.
--
-- CARACTER DE LA MIGRACION
--   ADITIVA: agrega 1 columna a chat_salas, 2 columnas y 1 CHECK a
--   casas_cofre, 2 tablas nuevas (casa_roles, casa_misiones) y varios indices.
--   NO elimina ni renombra nada; NO toca el CHECK chk_chat_salas_tipo (el
--   canal oficial se mantiene con tipo = 'viajeros', que sigue admitido).
--   IDEMPOTENTE (ADR-008): todo DDL usa IF NOT EXISTS; el CHECK de rango usa
--   el patron IF NOT EXISTS (pg_constraint); el canal oficial usa
--   WHERE NOT EXISTS (chat_salas.nombre NO tiene UNIQUE, por lo que NO es
--   posible usar ON CONFLICT (nombre)); los seeds de misiones usan
--   WHERE NOT EXISTS; el backfill de lider es no-op cuando ya coincide
--   (IS DISTINCT FROM) y el poblado de casa_roles usa ON CONFLICT. Re-ejecutar
--   el archivo COMPLETO es no-op seguro (aplicable N veces).
--   ASCII-SAFE (ADR-002): cero bytes > 127, cero tildes, cero ene, cero
--   backticks. El UNICO emoji (altavoz del canal oficial) va como escape de
--   Postgres CON prefijo E (BUG-026): E'\U0001F4E3'. Nunca el escape JS sin
--   prefijo E, que en PostgreSQL seria un literal de 10 caracteres.
--
-- ALCANCE
--   1. chat_salas.es_oficial + semilla del canal "Anuncios ExploraCO".
--   2. casas_cofre.tributo_pct + lider_user_id + CHECK de rango 0..15.
--   3. Tabla casa_roles (lider/oficial/mariscal/miembro por Casa).
--   4. Tabla casa_misiones (misiones colectivas por Casa).
--   5. Backfill del lider por XP de cada Casa + poblado de casa_roles.
--   6. Semilla de 1 mision base por Casa (idempotente).
--
-- NOTA ADMIN
--   usuarios NO tiene columna rol; el admin se identifica por email
--   (brsk84@gmail.com, ADR-029). El creador del canal oficial se resuelve por
--   ese email; si la cuenta no existe, la fila simplemente no se inserta.
--
-- ORDEN DE APLICACION
--   Correr este archivo COMPLETO en el editor SQL de Neon DESPUES de la 024 y
--   la 025. Antes de aplicar, correr el PREFLIGHT de solo lectura de la
--   seccion 0. Idempotente: re-ejecutar es no-op.
-- ============================================================================

-- ============================================================================
-- 0. PREFLIGHT (SOLO LECTURA; NO forma parte del DDL; NO se ejecuta solo).
--    Copiar y correr sentencia por sentencia ANTES de aplicar la 026 y
--    confirmar cada resultado esperado.
-- ============================================================================
-- (0.a) chat_salas existe y su CHECK de tipo admite 'viajeros' (necesario
--       para sembrar el canal oficial sin tocar la constraint). Esperado:
--       1 fila con chk_chat_salas_tipo y su definicion.
-- SELECT conname, pg_get_constraintdef(oid) AS def
--   FROM pg_constraint WHERE conname = 'chk_chat_salas_tipo';
--
-- (0.b) Confirmar que es_oficial aun NO existe. Esperado: 0 filas en base
--       limpia; 1 fila tras la primera aplicacion.
-- SELECT column_name, data_type, is_nullable, column_default
--   FROM information_schema.columns
--   WHERE table_schema='public' AND table_name='chat_salas'
--     AND column_name='es_oficial';
--
-- (0.c) Confirmar cuantas salas tendrian es_oficial=true (debe ser 0 antes de
--       aplicar; si devuelve >1, DETENER: el indice unico parcial fallaria).
-- -- Nota: en base limpia la columna aun no existe; correr despues del ALTER.
-- -- SELECT es_oficial, COUNT(*) FROM chat_salas GROUP BY es_oficial;
--
-- (0.d) casas_cofre de la 024 existe y aun NO tiene tributo_pct ni
--       lider_user_id. Esperado: 4 filas en base limpia (las columnas
--       historicas); 6 filas tras aplicar la 026.
-- SELECT column_name, data_type FROM information_schema.columns
--   WHERE table_schema='public' AND table_name='casas_cofre'
--     AND column_name IN ('tributo_pct','lider_user_id');
--
-- (0.e) Confirmar que casa_roles y casa_misiones aun NO existen. Esperado:
--       0 filas en base limpia; 2 filas tras aplicar la 026.
-- SELECT tablename FROM pg_tables
--   WHERE schemaname='public' AND tablename IN ('casa_roles','casa_misiones');
--
-- (0.f) Distribucion de usuarios por Casa y su top de XP (orden descendente).
--       Sirve para prever quien quedara como lider en el backfill 5.1.
-- SELECT casa, COUNT(*) AS n, MAX(xp_total) AS max_xp
--   FROM usuarios WHERE casa IS NOT NULL AND activo = true
--   GROUP BY casa ORDER BY casa;
--
-- (0.g) Confirmar la cuenta admin por email (creador del canal oficial).
--       Esperado: 1 fila en la cuenta de Javier; 0 filas -> el canal no se
--       sembrara (comportamiento aceptado).
-- SELECT id, nombre, email FROM usuarios WHERE email = 'brsk84@gmail.com';

-- ============================================================================
-- 1. CHAT_SALAS: CANAL OFICIAL (es_oficial)
-- ============================================================================
-- ADITIVA: la sala oficial se marca con es_oficial=true y se mantiene con
-- tipo='viajeros' para NO tocar chk_chat_salas_tipo (008/017). orden=-1 la
-- fija al principio del listado (008 ordena por orden DESC).
-- chat_salas.nombre NO tiene UNIQUE (008): el seed NO puede usar
-- ON CONFLICT (nombre); por eso se usa WHERE NOT EXISTS sobre es_oficial.

ALTER TABLE chat_salas
  ADD COLUMN IF NOT EXISTS es_oficial boolean DEFAULT false;

-- Semilla idempotente del canal oficial. Se inserta SOLO si:
--   (a) el usuario admin (email brsk84@gmail.com) existe, y
--   (b) todavia no hay ninguna sala con es_oficial = true.
-- NOT EXISTS va en el WHERE del SELECT (antes del LIMIT, orden valido); el
-- LIMIT 1 evita duplicar si hubiera mas de una fila con el mismo email.
INSERT INTO chat_salas (nombre, icono, descripcion, tipo, orden, es_oficial, creador_id)
SELECT
  'Anuncios ExploraCO',
  E'\U0001F4E3',
  'Canal oficial de anuncios',
  'viajeros',
  -1,
  true,
  u.id
FROM usuarios u
WHERE u.email = 'brsk84@gmail.com'
  AND NOT EXISTS (SELECT 1 FROM chat_salas s WHERE s.es_oficial = true)
LIMIT 1;

-- Garantia estructural de UNA sola sala oficial. Indice UNICO PARCIAL: solo
-- indexa la(s) fila(s) con es_oficial = true. ADVERTENCIA: si ya existieran
-- dos salas oficiales, esta sentencia fallaria; la tabla no las tiene, por lo
-- que es seguro. Re-ejecutar es no-op (IF NOT EXISTS).
CREATE UNIQUE INDEX IF NOT EXISTS uq_chat_salas_oficial
  ON chat_salas (es_oficial)
  WHERE es_oficial = true;

-- ============================================================================
-- 2. CASAS_COFRE: TRIBUTO Y LIDER (ADR-038)
-- ============================================================================
-- tributo_pct es el porcentaje del xp_final que se acredita al cofre de la
-- Casa (en runtime el literal vigente es 0.10; esta columna lo hace
-- configurable por Casa). DEFAULT 10.00: PostgreSQL aplica el default a las
-- filas existentes al agregar la columna (backfill automatico), de modo que
-- el CHECK 0..15 de abajo se evalua con los datos ya poblados.
-- lider_user_id referencia al usuario que lidera la Casa (se resuelve en la
-- seccion 5 por maximo xp_total). NO lleva ON DELETE CASCADE a proposito:
-- el proyecto no borra usuarios (cero borrado, ADR-003).

ALTER TABLE casas_cofre
  ADD COLUMN IF NOT EXISTS tributo_pct NUMERIC(4,2) DEFAULT 10.00;

ALTER TABLE casas_cofre
  ADD COLUMN IF NOT EXISTS lider_user_id UUID REFERENCES usuarios(id);

-- CHECK de rango idempotente (0..15). Guard por pg_constraint para no
-- duplicar la constraint en re-ejecucion. Se agrega DESPUES del ALTER que
-- backfillea el default 10.00, por lo que las filas ya cumplen el rango.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'casas_cofre_tributo_pct_check'
      AND conrelid = 'casas_cofre'::regclass
  ) THEN
    ALTER TABLE casas_cofre
      ADD CONSTRAINT casas_cofre_tributo_pct_check
      CHECK (tributo_pct >= 0 AND tributo_pct <= 15);
  END IF;
END $$;

-- ============================================================================
-- 3. CASA_ROLES: ROL DE UN USUARIO DENTRO DE SU CASA
-- ============================================================================
-- Un rol activo por usuario y Casa (UNIQUE (casa, usuario_id)). Cambiar de
-- rol es un UPDATE sobre la fila (no se acumulan roles historicos). El CHECK
-- de casa es la lista ESPEJO de chk_usuarios_casa (017) y del CHECK de
-- casas_cofre (024). ON DELETE CASCADE en usuario_id: si algun dia se borrara
-- fisicamente un usuario, su rol no debe quedar huerfano.

CREATE TABLE IF NOT EXISTS casa_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  casa text NOT NULL CHECK (casa IN ('condor','jaguar','delfin')),
  usuario_id uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  rol text NOT NULL CHECK (rol IN ('lider','oficial','mariscal','miembro')),
  asignado_en timestamptz DEFAULT now(),
  activo boolean DEFAULT true,
  UNIQUE (casa, usuario_id)
);

-- Indice por Casa para listar sus roles activos. (casa, activo) cubre por
-- prefijo las consultas que filtran solo por casa (no hace falta un indice
-- separado sobre (casa)). Indice por usuario para resolver "mi rol" al vuelo.
CREATE INDEX IF NOT EXISTS idx_casa_roles_casa_activo
  ON casa_roles (casa, activo);

CREATE INDEX IF NOT EXISTS idx_casa_roles_usuario
  ON casa_roles (usuario_id);

-- ============================================================================
-- 4. CASA_MISIONES: MISIONES COLECTIVAS POR CASA
-- ============================================================================
-- meta_tipo define la metrica (visitas/xp_total/resenas/fotos) y meta_valor
-- el umbral. progreso_actual es cache NO autoritativa (se recalcula en el
-- backend). estado sigue el patron de activos_ocultos (016): activa,
-- completada, expirada.

CREATE TABLE IF NOT EXISTS casa_misiones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  casa text NOT NULL CHECK (casa IN ('condor','jaguar','delfin')),
  nombre text NOT NULL,
  descripcion text,
  meta_tipo text NOT NULL CHECK (meta_tipo IN ('visitas','xp_total','resenas','fotos')),
  meta_valor integer NOT NULL CHECK (meta_valor > 0),
  progreso_actual integer DEFAULT 0,
  recompensa_xp NUMERIC(10,2) DEFAULT 0,
  estado text DEFAULT 'activa' CHECK (estado IN ('activa','completada','expirada')),
  creado_en timestamptz DEFAULT now(),
  expira_en timestamptz,
  completado_en timestamptz
);

-- Indice de consulta por Casa y estado; (casa, estado, meta_tipo) cubre por
-- prefijo los filtros solo por casa y casa+estado.
CREATE INDEX IF NOT EXISTS idx_casa_misiones_casa_estado_tipo
  ON casa_misiones (casa, estado, meta_tipo);

-- ============================================================================
-- 5. BACKFILL DE LIDERES Y ROLES
-- ============================================================================
-- 5.1 Lider por Casa = usuario activo con mayor xp_total dentro de la Casa.
--     DISTINCT ON (casa) con ORDER BY casa, xp_total DESC resuelve un unico
--     candidato por Casa. El UPDATE es no-op si el lider ya es el correcto
--     (IS DISTINCT FROM), de modo que re-ejecutar no reescribe nunca.
UPDATE casas_cofre cc
SET lider_user_id = sub.id,
    actualizado_en = now()
FROM (
  SELECT DISTINCT ON (casa) casa, id
  FROM usuarios
  WHERE casa IS NOT NULL AND activo = true
  ORDER BY casa, xp_total DESC
) sub
WHERE cc.casa = sub.casa
  AND (cc.lider_user_id IS DISTINCT FROM sub.id);

-- 5.2 Poblar casa_roles con el lider vigente de cada Casa. ON CONFLICT asegura
--     un solo rol por (casa, usuario_id): si el rol ya existia, se reafirma
--     como 'lider' y se reactiva.
INSERT INTO casa_roles (casa, usuario_id, rol)
SELECT casa, lider_user_id, 'lider'
FROM casas_cofre
WHERE lider_user_id IS NOT NULL
ON CONFLICT (casa, usuario_id)
DO UPDATE SET rol = 'lider', activo = true, asignado_en = now();

-- 5.3 Degradar a 'oficial' cualquier otro lider previo de la misma Casa que ya
--     no sea el lider vigente. No-op si no hay lideres previos distintos.
UPDATE casa_roles cr
SET rol = 'oficial'
FROM casas_cofre cc
WHERE cr.casa = cc.casa
  AND cr.rol = 'lider'
  AND cc.lider_user_id IS NOT NULL
  AND cr.usuario_id IS DISTINCT FROM cc.lider_user_id;

-- ============================================================================
-- 6. SEMILLA DE MISION BASE POR CASA (idempotente)
-- ============================================================================
-- Una mision base por cada Casa. WHERE NOT EXISTS por (casa, nombre) evita
-- duplicados en re-ejecucion y permite que cada Casa reciba la suya de forma
-- independiente. CROSS JOIN logico via VALUES.

INSERT INTO casa_misiones (casa, nombre, descripcion, meta_tipo, meta_valor, recompensa_xp)
SELECT v.casa, 'Primera Expedicion de Casa',
       'Registrar visitas verificadas para la casa',
       'visitas', 10, 500
FROM (VALUES ('condor'),('jaguar'),('delfin')) AS v(casa)
WHERE NOT EXISTS (
  SELECT 1 FROM casa_misiones cm
  WHERE cm.casa = v.casa AND cm.nombre = 'Primera Expedicion de Casa'
);

-- ============================================================================
-- VERIFICACION POST-APLICACION (solo lectura; NO se ejecuta dentro de la
-- migracion). Copiar y correr sentencia por sentencia en el editor de Neon.
-- ============================================================================
-- (a) Columna es_oficial en chat_salas (esperada 1 fila):
-- SELECT column_name, data_type, is_nullable, column_default
--   FROM information_schema.columns
--   WHERE table_schema='public' AND table_name='chat_salas'
--     AND column_name='es_oficial';
--
-- (b) Canal oficial unico (esperada 1 fila; 0 filas = la cuenta admin no
--     existia al aplicar; corregir el email y re-ejecutar):
-- SELECT id, nombre, icono, tipo, orden, es_oficial, creador_id, activo
--   FROM chat_salas WHERE es_oficial = true;
--
-- (c) Indice unico parcial de la sala oficial (esperada 1 fila):
-- SELECT indexname FROM pg_indexes
--   WHERE schemaname='public' AND indexname='uq_chat_salas_oficial';
--
-- (d) Columnas nuevas de casas_cofre + CHECK de rango (esperadas 6 columnas
--     en el listado y 1 constraint):
-- SELECT column_name, data_type, numeric_precision, numeric_scale
--   FROM information_schema.columns
--   WHERE table_schema='public' AND table_name='casas_cofre'
--     AND column_name IN ('tributo_pct','lider_user_id');
-- SELECT conname, pg_get_constraintdef(oid) AS def
--   FROM pg_constraint WHERE conname='casas_cofre_tributo_pct_check';
--
-- (e) Lideres y tributo por Casa (esperadas 3 filas; lider_user_id no nulo
--     donde hubo candidatos):
-- SELECT casa, tributo_pct, lider_user_id, actualizado_en
--   FROM casas_cofre ORDER BY casa;
--
-- (f) Rol de lider en casa_roles (esperada 1 fila por Casa con candidato):
-- SELECT casa, usuario_id, rol, activo, asignado_en
--   FROM casa_roles WHERE rol = 'lider' ORDER BY casa;
--
-- (g) Mision base por Casa (esperadas 3 filas; re-ejecutar debe seguir
--     dejando 3):
-- SELECT casa, nombre, meta_tipo, meta_valor, recompensa_xp, estado
--   FROM casa_misiones WHERE nombre = 'Primera Expedicion de Casa'
--   ORDER BY casa;
--
-- (h) Idempotencia global: re-ejecutar TODO el archivo y volver a correr
--     (a)-(g): los conteos deben ser IDENTICOS (salvo asignado_en /
--     actualizado_en, que pueden refrescarse).
--
-- (i) Integridad de listas CHECK espejo de Casa (0 filas = consistente):
-- SELECT DISTINCT u.casa FROM usuarios u
--   WHERE u.casa IS NOT NULL
--     AND u.casa NOT IN (SELECT casa FROM casas_cofre)
--   ORDER BY u.casa;
