-- Migration 008: Comunidad social real (chat + planes)
-- Required for the "Comunidad: chat y planes reales con gaming" feature
-- (spec 2026-09-08). Backend: api/interacciones.js (nuevos tipo= de GET y
-- POST, sin endpoint nuevo -- presupuesto Vercel Hobby 8/8).
--
-- 1. chat_salas: salas de conversacion. Las del sistema (general, ciudades,
--    regiones) se seedean con creador_id NULL y orden alto; las creadas por
--    viajeros (capacidad crear_chat) llevan creador_id y orden 0.
-- 2. chat_mensajes: mensajes por sala. Moderacion por fijado (toggle) y
--    activo (soft-delete) -- capacidad moderador_chat.
-- 3. planes_viaje + planes_miembros: planes colectivos. cupos es el tope;
--    los miembros actuales se derivan por COUNT en lectura (patron del
--    proyecto: los contadores que se puedan desincronizar nunca se guardan).
-- 4. usuarios.progreso_social: JSONB con el contador diario de mensajes de
--    chat para el anti-farming (+2 XP/mensaje, tope 20 XP/dia).
--
-- ASCII-safe (ADR-002): cero bytes > 127. Emojis de icono solo con prefijo
-- E'\U0001F5FA' (BUG-026). Idempotente: IF NOT EXISTS (ADR-008).
--
-- APLICACION: correr este archivo COMPLETO en el editor SQL de Neon.
-- Las herramientas locales que exigen result set por sentencia fallan
-- con las sentencias DDL (CREATE TABLE/INDEX, ALTER TABLE) y con el
-- INSERT..SELECT del seed, que no devuelven filas (en el cliente sale
-- "Cannot read properties of undefined (reading 'map')"). La migracion
-- es 100% idempotente: re-ejecutarla es seguro aunque haya quedado a
-- mitad (IF NOT EXISTS + seed con WHERE NOT EXISTS).

CREATE TABLE IF NOT EXISTS chat_salas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  icono text DEFAULT E'\U0001F4AC',
  descripcion text DEFAULT '',
  tipo text DEFAULT 'viajeros',
  orden integer DEFAULT 0,
  creador_id uuid REFERENCES usuarios(id),
  creado_en timestamptz DEFAULT now(),
  activo boolean DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_chat_salas_orden
  ON chat_salas (orden DESC, creado_en ASC);

CREATE TABLE IF NOT EXISTS chat_mensajes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sala_id uuid NOT NULL REFERENCES chat_salas(id) ON DELETE CASCADE,
  usuario_id uuid REFERENCES usuarios(id),
  nombre text DEFAULT '',
  texto text NOT NULL,
  fijado boolean DEFAULT false,
  activo boolean DEFAULT true,
  creado_en timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_mensajes_sala
  ON chat_mensajes (sala_id, creado_en DESC);

CREATE TABLE IF NOT EXISTS planes_viaje (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  destino text NOT NULL,
  fechas text DEFAULT '',
  cupos integer NOT NULL DEFAULT 4,
  descripcion text DEFAULT '',
  creador_id uuid REFERENCES usuarios(id),
  creado_en timestamptz DEFAULT now(),
  activo boolean DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_planes_viaje_creado
  ON planes_viaje (creado_en DESC);

CREATE TABLE IF NOT EXISTS planes_miembros (
  plan_id uuid NOT NULL REFERENCES planes_viaje(id) ON DELETE CASCADE,
  usuario_id uuid NOT NULL REFERENCES usuarios(id),
  creado_en timestamptz DEFAULT now(),
  PRIMARY KEY (plan_id, usuario_id)
);

ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS progreso_social jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Seed de salas del sistema (idempotente): solo inserta si la tabla esta
-- vacia, para no pisar salas creadas por viajeros ni duplicar en
-- re-ejecucion.
INSERT INTO chat_salas (nombre, icono, descripcion, tipo, orden)
SELECT * FROM (VALUES
  ('Chat general',           E'\U0001F1E8\U0001F1F4', 'Todos los viajeros de ExploraCO',      'viajeros', 100),
  ('Bogota',                 E'\U0001F3D9',            'Destinos y tips de la capital',        'ciudad',   90),
  ('Cartagena',              E'\U0001F3F0',            'Ciudad amurallada y playas',           'ciudad',   80),
  ('Medellin',               E'\U0001F33A',            'Ciudad de la eterna primavera',        'ciudad',   70),
  ('Costa Caribe',           E'\U0001F30A',            'Tayrona, Barranquilla, Santa Marta',   'region',   60),
  ('Naturaleza y trekking',  E'\U0001F3D4',            'Ciudad Perdida, Cocora, Cristales',    'region',   50)
) AS seed(nombre, icono, descripcion, tipo, orden)
WHERE NOT EXISTS (SELECT 1 FROM chat_salas);