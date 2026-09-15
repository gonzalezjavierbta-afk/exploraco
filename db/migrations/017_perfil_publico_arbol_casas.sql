-- ============================================================================
-- Migration 017: Perfil publico (museo), Arbol de Clases y Casas
-- TSK-103 / ADR-028 (WP-1)
-- Fecha: 2026-09-15
-- Spec: PROMPT.md (TSK-103 / ADR-028, paquete WP-1)
--
-- CARACTER DE LA MIGRACION
--   ADITIVA: solo agrega columnas, indices, constraints y una tabla; no
--   elimina ni renombra nada de 001-016.
--   IDEMPOTENTE (ADR-008): todo DDL usa IF NOT EXISTS o el patron
--   DROP CONSTRAINT IF EXISTS + ADD CONSTRAINT; el seed usa ON CONFLICT
--   (clave) DO NOTHING. APLICABLE DOS VECES: re-ejecutar es no-op seguro.
--   ASCII-SAFE (ADR-002): cero bytes > 127, cero backticks, cero emojis.
--   Sin escapes unicode: este archivo no introduce emojis (BUG-026).
--
-- PRE-REQUISITOS
--   015 (vocaciones / consumibles de perfil) y 016 (multinivel /
--   crowdsourcing) aplicadas. 016 ya esta aplicada en produccion.
--   Depende de: usuarios.xp_total (010), usuarios.vocaciones (015),
--   usuarios.faccion y usuarios.device_hashes (016), consumibles (010) y
--   chat_salas (008).
--
-- HALLAZGOS DE ESQUEMA (verificados contra Neon antes de escribir; ADR-006)
--   - usuarios.bio YA EXISTE en produccion (tipo text, NULLABLE, sin
--     default; vacia/NULL en los 4 usuarios actuales) y NUNCA estuvo
--     versionada en db/migrations/. NO se toca ni se re-declara en esta
--     migracion; se deja constancia para que una base nueva la cree con el
--     mismo tipo (text). ADR-006/ADR-008: el esquema real manda sobre
--     documentos y numeros citados.
--   - usuarios.ciudad_base YA EXISTE (character varying, nullable).
--   - usuarios.codigo_referido, faccion, referido_por, vocaciones,
--     device_hashes y email_verificado YA EXISTEN (015 / 016).
--   - usuarios.pais_base NO EXISTE: se crea aqui, SIN default (NULL = pais
--     no informado; no se asume 'CO').
--   - consumibles NO tiene columna categoria: se crea aqui.
--   - chat_salas.tipo es text DEFAULT 'viajeros' y NO tenia CHECK (008).
--     Valores reales hoy en produccion: 'ciudad' y 'viajeros' (verificado
--     con SELECT DISTINCT tipo FROM chat_salas). El CHECK que se CREA aqui
--     valida esos dos mas 'region', 'plan' y 'dm'.
--   - Ya existen los indices idx_chat_mensajes_sala (sala_id, creado_en
--     DESC), idx_chat_salas_orden y las PK de chat_mensajes / chat_salas.
--     Por eso NO se crea idx_chat_mensajes_sala_fecha: duplicaria el
--     indice existente.
--   - interacciones tiene usuario_id, tipo y activo (verificado en codigo
--     de produccion: api/interacciones.js usa i.activo=true y
--     UPDATE interacciones SET activo=false). El indice parcial
--     idx_interacciones_usuario_tipo_activo es por tanto valido.
--
-- EXCEPCION DE BORRADO FISICO (acotada)
--   usuario_bloqueos guarda RELACIONES, no contenido. Desbloquear a un
--   usuario hace DELETE fisico de la fila (bloqueador_id, bloqueado_id):
--   conservarla con un flag contradiria el significado de la accion (el
--   bloqueo debe cesar de inmediato). Es una excepcion acotada a "cero
--   borrado logico" (ADR-003), con el mismo precedente que plan_salir
--   (DELETE de planes_miembros) y comentario_voto. NO aplica a contenido
--   (resenas, fotos, logros, XP): esos siguen con soft-delete.
--
-- APLICACION: correr este archivo COMPLETO en el editor SQL de Neon.
-- Las migraciones son acumulativas: re-ejecutar es seguro.
-- ============================================================================

-- ============================================================
-- 1. USUARIOS: PERFIL, CASA, ARBOL DE CLASES Y VISIBILIDAD
-- ============================================================
-- bio NO se incluye: ya existe en produccion (ver cabecera).
-- progreso_arbol / perfil_config nacen '{}'::jsonb y toda escritura
-- posterior va por merge JSONB: COALESCE(progreso_arbol,'{}') || $n::jsonb
-- (ADR-003; nunca reemplazo total). intereses nace '[]'::jsonb.

ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS intereses jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS pais_base varchar(2),
  ADD COLUMN IF NOT EXISTS casa varchar(20),
  ADD COLUMN IF NOT EXISTS casa_elegida_en timestamptz,
  ADD COLUMN IF NOT EXISTS progreso_arbol jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS perfil_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS perfil_publico boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS dm_abierto boolean NOT NULL DEFAULT true;

-- CONSTRAINT DE CASA SEPARADA (idempotencia real): ADD COLUMN IF NOT EXISTS
-- no vuelve a agregar un CHECK si la columna ya existia, asi que el DROP +
-- ADD se ejecuta siempre en su propio bloque.
ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS chk_usuarios_casa;
ALTER TABLE usuarios ADD CONSTRAINT chk_usuarios_casa
  CHECK (casa IS NULL OR casa IN ('condor','jaguar','delfin'));

-- ============================================================
-- 2. CONSUMIBLES: CATEGORIA (catalogo administrable)
-- ============================================================
-- categoria NO lleva CHECK a proposito: es un catalogo administrable
-- (perfil, impulso, social, coleccion, general, ...) y agregar valores
-- nuevos no debe exigir una migracion. Default 'general' para los actuales.

ALTER TABLE consumibles
  ADD COLUMN IF NOT EXISTS categoria varchar(30) NOT NULL DEFAULT 'general';

-- Seed idempotente de los 4 consumibles de perfil de WP-6 (P-10).
-- Descripciones ASCII sin tildes. ON CONFLICT (clave) DO NOTHING: si ya
-- existen, no se pisan (cero borrado / cero sobreescritura).

INSERT INTO consumibles (clave, nombre, descripcion, precio_xp, categoria) VALUES
  ('perfil_marco_plata', 'Marco de Plata',
   'Marco plateado permanente para tu avatar de perfil. Alternativa economica al marco dorado.',
   300, 'perfil'),
  ('perfil_vitrina_destacada', 'Vitrina Destacada',
   'Fija hasta tres logros elegidos arriba de tu museo publico.',
   650, 'perfil'),
  ('perfil_titulo_custom', 'Titulo de Viajero',
   'Titulo libre de hasta 24 caracteres bajo tu nombre en tu museo. Moderable desde el panel admin.',
   800, 'perfil'),
  ('perfil_fondo_paisaje', 'Fondo de Paisaje',
   'Usa una foto propia como cabecera de tu museo publico.',
   1000, 'perfil')
ON CONFLICT (clave) DO NOTHING;

-- Los 3 consumibles de perfil de la 015 pasan a categoria 'perfil' (P-10).
-- UPDATE idempotente: re-ejecutar deja el mismo estado. Se incluyen las 4
-- claves nuevas por completitud (por si el seed corriera en una base donde
-- ya existian con categoria 'general').

UPDATE consumibles SET categoria = 'perfil'
WHERE clave IN (
  'perfil_marco_dorado','perfil_tema_oscuro','perfil_banda_artista',
  'perfil_marco_plata','perfil_vitrina_destacada','perfil_titulo_custom',
  'perfil_fondo_paisaje'
);

-- ============================================================
-- 3. CHAT_SALAS: MENSAJES DIRECTOS (clave_dm + tipo 'dm')
-- ============================================================
-- clave_dm = los dos uuid participantes ordenados alfabeticamente unidos
-- por '_' (ej. 1111..._2222...). El indice unico parcial garantiza un solo
-- hilo por par de usuarios. Los indices de expresion
-- split_part(clave_dm,'_',1|2) permiten listar los hilos de un participante
-- (split_part es IMMUTABLE, valido en indice de expresion).

ALTER TABLE chat_salas
  ADD COLUMN IF NOT EXISTS clave_dm varchar(80);

-- CHECK de tipo: 008 NO lo tenia. Se crea aqui. Se sueltan los dos nombres
-- posibles (el explicito y el autogenerado) para que la re-ejecucion sea
-- idempotente y no queden constraints duplicadas.
ALTER TABLE chat_salas DROP CONSTRAINT IF EXISTS chk_chat_salas_tipo;
ALTER TABLE chat_salas DROP CONSTRAINT IF EXISTS chat_salas_tipo_check;
ALTER TABLE chat_salas ADD CONSTRAINT chk_chat_salas_tipo
  CHECK (tipo IS NULL OR tipo IN ('viajeros','ciudad','region','plan','dm'));

CREATE UNIQUE INDEX IF NOT EXISTS idx_chat_salas_dm_unica
  ON chat_salas (clave_dm)
  WHERE tipo = 'dm' AND clave_dm IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_chat_salas_dm_a
  ON chat_salas ((split_part(clave_dm, '_', 1)))
  WHERE tipo = 'dm';

CREATE INDEX IF NOT EXISTS idx_chat_salas_dm_b
  ON chat_salas ((split_part(clave_dm, '_', 2)))
  WHERE tipo = 'dm';

-- ============================================================
-- 4. USUARIO_BLOQUEOS (relacion de bloqueo entre dos usuarios)
-- ============================================================
-- PK compuesta: un bloqueo por direccion. chk_usuario_bloqueos_distintos
-- impide el auto-bloqueo. Desbloquear = DELETE fisico de la fila de
-- relacion (ver "EXCEPCION DE BORRADO FISICO" en la cabecera).

CREATE TABLE IF NOT EXISTS usuario_bloqueos (
  bloqueador_id uuid NOT NULL REFERENCES usuarios(id),
  bloqueado_id uuid NOT NULL REFERENCES usuarios(id),
  creado_en timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (bloqueador_id, bloqueado_id),
  CONSTRAINT chk_usuario_bloqueos_distintos
    CHECK (bloqueador_id <> bloqueado_id)
);

-- Consulta "quien me bloqueo / a quien bloquee": por el lado bloqueado.
CREATE INDEX IF NOT EXISTS idx_usuario_bloqueos_bloqueado
  ON usuario_bloqueos (bloqueado_id);

-- ============================================================
-- 5. INDICES DE CONSULTA
-- ============================================================
-- Ranking de Casa (casa, xp_total) y filtro por pais de origen. Ambos
-- parciales: solo se indexan filas con valor (casa / pais_base NULL no se
-- indexan).

CREATE INDEX IF NOT EXISTS idx_usuarios_casa
  ON usuarios (casa, xp_total)
  WHERE casa IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_usuarios_pais_base
  ON usuarios (pais_base)
  WHERE pais_base IS NOT NULL;

-- Indice parcial de interacciones activas por usuario y tipo (museo
-- publico: conteo de visitas / resenas / fotos activas de un usuario).
-- Verificado: interacciones.usuario_id, tipo y activo existen.

CREATE INDEX IF NOT EXISTS idx_interacciones_usuario_tipo_activo
  ON interacciones (usuario_id, tipo)
  WHERE activo = true;

-- ============================================================
-- VERIFICACION POST-APLICACION (solo lectura; NO se ejecuta dentro de la
-- migracion). Copiar y correr sentencia por sentencia en el editor de Neon.
-- ============================================================
-- (a) Columnas nuevas en usuarios (esperadas 8):
-- SELECT column_name, data_type, is_nullable, column_default
--   FROM information_schema.columns
--   WHERE table_schema='public' AND table_name='usuarios'
--     AND column_name IN ('intereses','pais_base','casa','casa_elegida_en',
--       'progreso_arbol','perfil_config','perfil_publico','dm_abierto')
--   ORDER BY column_name;
--
-- (b) Constraints de casa y de tipo de chat:
-- SELECT conname, pg_get_constraintdef(oid) AS def
--   FROM pg_constraint
--   WHERE conname IN ('chk_usuarios_casa','chk_chat_salas_tipo')
--   ORDER BY conname;
--
-- (c) Columna categoria en consumibles + los consumibles de perfil:
-- SELECT column_name, data_type, is_nullable, column_default
--   FROM information_schema.columns
--   WHERE table_schema='public' AND table_name='consumibles'
--     AND column_name='categoria';
-- SELECT clave, nombre, precio_xp, categoria FROM consumibles
--   WHERE categoria='perfil' ORDER BY precio_xp;
--
-- (d) Tabla usuario_bloqueos e indices de la 017:
-- SELECT tablename FROM pg_tables
--   WHERE schemaname='public' AND tablename='usuario_bloqueos';
-- SELECT indexname FROM pg_indexes
--   WHERE schemaname='public' AND indexname IN (
--     'idx_chat_salas_dm_unica','idx_chat_salas_dm_a','idx_chat_salas_dm_b',
--     'idx_usuario_bloqueos_bloqueado','idx_usuarios_casa',
--     'idx_usuarios_pais_base','idx_interacciones_usuario_tipo_activo')
--   ORDER BY indexname;
--
-- (e) Valores reales de chat_salas.tipo y columna clave_dm:
-- SELECT DISTINCT tipo FROM chat_salas ORDER BY tipo;
-- SELECT column_name, data_type FROM information_schema.columns
--   WHERE table_schema='public' AND table_name='chat_salas'
--     AND column_name='clave_dm';
