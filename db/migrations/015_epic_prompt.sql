-- Migration 015: Vocaciones de artista, chat por plan, limpieza de salas del
-- sistema y consumibles de mejoras de perfil.
-- Fecha: 2026-09-13
-- ADRs aplicables: ADR-008 (SQL versionado), ADR-003 (merge JSONB en
-- vocaciones), ADR-002 (ASCII-safe), ADR-015 (comunidad: chat_salas y
-- planes_viaje) y ADR-018 (gamificacion v4: tabla consumibles). Leccion
-- BUG-026: todo escape unicode en SQL usa prefijo E'\U...'; este archivo no
-- introduce emojis (cero bytes > 127).
--
-- BLOQUES
--   1. usuarios.vocaciones (jsonb NOT NULL DEFAULT '{}'):
--      catalogo de vocaciones versionado en codigo (api/interacciones.js);
--      la columna SOLO guarda las claves activadas por el usuario, nunca el
--      catalogo completo. Actualizaciones por merge JSONB (ADR-003).
--   2. planes_viaje.sala_id (FK a chat_salas, nullable):
--      sala de chat ligada al plan colectivo. Los planes existentes quedan
--      con sala_id NULL hasta que el backend la asigne.
--   3. Limpieza de salas del sistema (feature comunidad): solo quedan
--      'Chat general' y 'Bogota'; se eliminan Cartagena, Medellin,
--      Costa Caribe y Naturaleza y trekking (seed de la migracion 008).
--      Es ACUMULATIVA: en una instalacion fresca, 008 + 015 secuencial
--      deja el resultado correcto sin modificar el seed de 008. Solo
--      borra salas de sistema (creador_id IS NULL): las salas de
--      viajeros (creador_id NOT NULL) nunca se tocan.
--      chat_mensajes.sala_id tiene ON DELETE CASCADE (migracion 008), asi
--      que el DELETE limpia tambien los mensajes de las salas eliminadas.
--   4. Consumibles nuevos de mejoras de perfil (tabla consumibles de la
--      migracion 010): 3 items que se activan al consumirse con el POST
--      tipo=usar_consumible de api/interacciones.js. Solo se insertan si
--      la clave no existe (ON CONFLICT (clave) DO NOTHING).
--
-- Idempotente (ADR-008): IF NOT EXISTS + ON CONFLICT. Re-ejecutar es seguro.
--
-- APLICACION: correr este archivo COMPLETO en el editor SQL de Neon.
-- Las migraciones son acumulativas: re-ejecutar es seguro.

-- ============================================================
-- 1. VOCACIONES DE ARTISTA (usuarios.vocaciones jsonb)
-- ============================================================
-- Catalogo versionado en codigo/api/interacciones.js; la columna solo
-- guarda las claves activadas (objeto tipo {clave: true} por usuario).
-- Creacion idempotente (IF NOT EXISTS). Toda escritura posterior usa
-- COALESCE(vocaciones,'{}') || $nuevas::jsonb (ADR-003: merge, nunca
-- reemplazo total).

ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS vocaciones jsonb NOT NULL DEFAULT '{}'::jsonb;

-- ============================================================
-- 2. CHAT POR PLAN (planes_viaje.sala_id -> chat_salas)
-- ============================================================
-- Sala ligada al plan colectivo. FK nullable y SIN cascade: si una sala se
-- borra, el plan conserva la referencia nula (dependencia opcional).
-- Requiere la tabla chat_salas de la migracion 008.

ALTER TABLE planes_viaje
  ADD COLUMN IF NOT EXISTS sala_id uuid REFERENCES chat_salas(id);

-- ============================================================
-- 3. LIMPIEZA DE SALAS DEL SISTEMA
-- ============================================================
-- Feature comunidad: solo quedan las salas de sistema 'Chat general'
-- (viajeros) y 'Bogota' (ciudad). Se eliminan las 4 salas extra que
-- seedea la migracion 008: Cartagena, Medellin, Costa Caribe y
-- Naturaleza y trekking.
--
-- Idempotente: tras la primera corrida no quedan filas que cumplan la
-- condicion. Acumulativa sobre 008: una instalacion fresca que ejecuta
-- 008 y luego 015 deja el mismo estado que produccion (6 - 4 = 2 salas
-- de sistema). Las salas creadas por viajeros (creador_id NOT NULL) se
-- conservan por el filtro creador_id IS NULL.
--
-- chat_mensajes.sala_id referencia chat_salas(id) ON DELETE CASCADE
-- (migracion 008): el DELETE elimina tambien los mensajes de esas salas,
-- sin orfanos ni pasos adicionales.

DELETE FROM chat_salas
WHERE creador_id IS NULL
  AND nombre NOT IN ('Chat general', 'Bogota');

-- ============================================================
-- 4. CONSUMIBLES NUEVOS: MEJORAS DE PERFIL
-- ============================================================
-- Tabla consumibles definida en la migracion 010 (columnas verificadas:
-- id uuid PK, clave varchar(50) UNIQUE NOT NULL, nombre varchar(100)
-- NOT NULL, descripcion text DEFAULT '', precio_xp integer NOT NULL
-- DEFAULT 0, activo boolean NOT NULL DEFAULT true, creado_en timestamptz
-- DEFAULT now()). Patron del seed 010: INSERT ... ON CONFLICT (clave)
-- DO NOTHING.
--
-- Los 3 items son mejoras de perfil permanentes que se activan al
-- consumirse (POST tipo=usar_consumible, api/interacciones.js): el
-- efecto se aplica segun la clave y queda registrado en
-- usuarios.capacidades + ledger consumo_consumibles. Precios dentro del
-- rango del catalogo 010 (250-1500 XP); por ser permanentes, estan por
-- encima de los temporales de bajo costo (vitrina_estelar 300 / 7 dias,
-- pin_cromado 250 / 7 dias) y por debajo del Pase VIP (1500 / 30 dias).

INSERT INTO consumibles (clave, nombre, descripcion, precio_xp) VALUES
  ('perfil_marco_dorado', 'Marco Dorado', 'Marco dorado permanente para tu avatar de perfil. Se activa al consumir y queda visible en tu ficha de viajero.', 700),
  ('perfil_tema_oscuro', 'Tema Galeria Oscura', 'Activa el tema oscuro de tu galeria de albumes y de tu perfil publico.', 500),
  ('perfil_banda_artista', 'Banda de Artista', 'Banda de artista bajo tu nombre en la comunidad: tus publicaciones destacan con el sello de creador.', 900)
ON CONFLICT (clave) DO NOTHING;