-- Migration 016: Piramide de Referidos, Crowdsourcing Geoespacial
-- "Activo Oculto" (Wayfarer), Facciones y verificacion de correo (ADR-025).
-- Fecha: 2026-09-14
-- Spec: promptgamming.md (Entrega 016 "ExploraCO Gaming v5.0", aprobada por
-- arquitectura y verificada contra el repo real).
-- Requiere: migraciones 010, 011, 012, 013, 014 y 015 previamente aplicadas.
-- ADRs aplicables: ADR-008 (SQL versionado / idempotencia), ADR-002
-- (ASCII-safe), ADR-018 (la moneda del juego es xp_total; no existe
-- puntos_canjeables), ADR-024 (motor geocerca Haversine que reutiliza el
-- checkin de Activo Oculto) y ADR-025 (nonce anti-replay de un solo uso).
-- Nota de faccion: el CHECK admite CUATRO facciones ('exploradores',
-- 'curadores', 'creadores', 'artistas'); 'artistas' cubre el bloque de
-- vocaciones de artista (ADR-026) dentro de la competencia de facciones.
--
-- BLOQUES
--   A. Columnas nuevas en usuarios (piramide de referidos, faccion,
--      verificacion de correo y device fingerprint) + 3 indices.
--   B. Tabla activos_ocultos (propuestas Wayfarer: estado y votos).
--   C. Tabla activos_ocultos_votos (PK compuesta activo_id + usuario_id).
--   D. Tabla activos_ocultos_checkins (UNIQUE parcial por activo activo).
--   E. Tabla geo_nonces (nonce anti-replay de 2 minutos, ADR-025).
--
-- NOTAS DE DISENO (decision aprobada, NO se persisten a proposito)
--   - La afinidad de Parche a Faccion NO se persiste: se calcula en tiempo
--     de consulta (JOIN pandillas_miembros + usuarios.faccion), mismo
--     principio que nivel/era/badge (calculados desde xp_total).
--   - El control territorial por ciudad tampoco se persiste: la faccion
--     con mas Activos Ocultos aprobados + checkins confirmados en los
--     ultimos 30 dias se recalcula en cada consulta, sin tabla de "dueno".
--   - Sin columna puntos_canjeables: la moneda del juego es xp_total
--     (ADR-018); el pago de un cambio de faccion usa xp_total.
--   - Cero borrado logico: nunca DELETE; donde aplique se usa activo=false
--     (misma regla de soft-delete que guardados/visitas de ADR-003/ADR-024).
--
-- Idempotente (ADR-008): IF NOT EXISTS + constraints con nombre en la
-- creacion. Re-ejecutar es seguro.
--
-- APLICACION: correr este archivo COMPLETO en el editor SQL de Neon.
-- Las migraciones son acumulativas: re-ejecutar es seguro.

-- ============================================================
-- A. USUARIOS: REFERIDOS MULTINIVEL + FACCION + VERIFICACION DE CORREO
-- ============================================================
-- La FK referido_por es self-referencial y opcional (null = sin referente).
-- El arbol completo de la piramide se deriva via CTE recursiva sobre
-- referido_por en tiempo de consulta (hasta 5 niveles), sin tabla de ledger
-- dedicada; los contadores xp_ref_total y referidos_directos_contados son
-- numeros planos de apoyo. El pago del cambio de faccion (producto) se
-- cobra sobre xp_total. EXACTO segun esquema aprobado: los tipos y
-- defaults NO agregan NOT NULL donde la decision no lo pide (codigo de
-- referido, email_token y faccion son NULL hasta que se usen).

ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS referido_por uuid REFERENCES usuarios(id),
  ADD COLUMN IF NOT EXISTS codigo_referido varchar(20),
  ADD COLUMN IF NOT EXISTS xp_ref_total int DEFAULT 0,
  ADD COLUMN IF NOT EXISTS referidos_directos_contados int DEFAULT 0,
  ADD COLUMN IF NOT EXISTS faccion varchar(20)
    CONSTRAINT chk_usuarios_faccion
    CHECK (faccion IS NULL OR faccion IN ('exploradores','curadores','creadores','artistas')),
  ADD COLUMN IF NOT EXISTS faccion_elegida_en timestamptz,
  ADD COLUMN IF NOT EXISTS email_verificado boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS email_token varchar(64),
  ADD COLUMN IF NOT EXISTS email_token_expira timestamptz,
  ADD COLUMN IF NOT EXISTS device_hashes jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS idx_usuarios_codigo_referido
  ON usuarios (codigo_referido)
  WHERE codigo_referido IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_usuarios_referido_por
  ON usuarios (referido_por);

-- Indice de ranking de facciones (leido por GET tipo=faccion_ranking sobre
-- usuarios.xp_total, columna garantizada por la migracion 010).
CREATE INDEX IF NOT EXISTS idx_usuarios_faccion
  ON usuarios (faccion, xp_total)
  WHERE faccion IS NOT NULL;

-- ============================================================
-- B. ACTIVOS OCULTOS (crowdsourcing geoespacial estilo Wayfarer)
-- ============================================================
-- Propuestas peer-to-peer: cualquier usuario con correo verificado puede
-- proponer (sin nivel minimo); el filtro de calidad lo da la votacion de
-- la comunidad, no la entrada. Quorum +/-3 votos netos recalcula estado en
-- el backend. Los contadores de votos no pueden bajar de 0 (CHECKs).
-- Cero borrado logico: una moderacion del admin desactiva la fila con
-- activo=false, nunca DELETE.

CREATE TABLE IF NOT EXISTS activos_ocultos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  propuesto_por uuid REFERENCES usuarios(id),
  nombre varchar(150) NOT NULL,
  descripcion text,
  lat numeric(10,7) NOT NULL,
  lng numeric(10,7) NOT NULL,
  foto_url text,
  categoria varchar(50),
  ciudad varchar(100),
  estado varchar(20) NOT NULL DEFAULT 'pendiente'
    CONSTRAINT chk_activos_ocultos_estado
    CHECK (estado IN ('pendiente','aprobado','rechazado')),
  votos_favor int NOT NULL DEFAULT 0
    CONSTRAINT chk_activos_ocultos_votos_favor
    CHECK (votos_favor >= 0),
  votos_contra int NOT NULL DEFAULT 0
    CONSTRAINT chk_activos_ocultos_votos_contra
    CHECK (votos_contra >= 0),
  activo boolean NOT NULL DEFAULT true,
  creado_en timestamptz NOT NULL DEFAULT now(),
  resuelto_en timestamptz
);

CREATE INDEX IF NOT EXISTS idx_activos_ocultos_estado_creado
  ON activos_ocultos (estado, creado_en);

CREATE INDEX IF NOT EXISTS idx_activos_ocultos_ciudad
  ON activos_ocultos (ciudad, estado);

-- ============================================================
-- C. ACTIVOS_OCULTOS_VOTOS (1 voto por usuario por propuesta)
-- ============================================================
-- La PK compuesta (activo_id, usuario_id) garantiza un unico voto por
-- usuario y propuesta; un segundo voto viola la PK (23505 -> 409 tipificado
-- en api/interacciones.js, patron del dedup de resena/rating ADR-022).
-- Sin auto-voto: el handler excluye la propuesta propia del votante.

CREATE TABLE IF NOT EXISTS activos_ocultos_votos (
  activo_id uuid REFERENCES activos_ocultos(id),
  usuario_id uuid REFERENCES usuarios(id),
  voto varchar(6) NOT NULL
    CONSTRAINT chk_activos_ocultos_votos_voto
    CHECK (voto IN ('favor','contra')),
  creado_en timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (activo_id, usuario_id)
);

CREATE INDEX IF NOT EXISTS idx_activos_ocultos_votos_usuario
  ON activos_ocultos_votos (usuario_id);

-- ============================================================
-- D. ACTIVOS_OCULTOS_CHECKINS (presencia fisica sobre activos aprobados)
-- ============================================================
-- Reutiliza el motor geocerca Haversine de ADR-024 (api/interacciones.js,
-- v11): mismos radios adaptativos, cooldown y tope diario. Un solo checkin
-- ACTIVO por usuario y activo (UNIQUE parcial); un checkin desactivado
-- (activo=false) libera el par para el siguiente checkin fresco y paga 0 XP
-- adicional (mismo criterio de reactivacion que visitas, ADR-024).

CREATE TABLE IF NOT EXISTS activos_ocultos_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activo_id uuid REFERENCES activos_ocultos(id),
  usuario_id uuid REFERENCES usuarios(id),
  lat numeric(10,7),
  lng numeric(10,7),
  accuracy numeric(6,2),
  activo boolean NOT NULL DEFAULT true,
  creado_en timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_activo_checkin_unico
  ON activos_ocultos_checkins (activo_id, usuario_id)
  WHERE activo = true;

-- ============================================================
-- E. GEO_NONCES (ADR-025: nonce anti-replay para geolocalizacion firma)
-- ============================================================
-- Nonce de un solo uso solicitado con GET ?tipo=geo_nonce_solicitar antes
-- de cada checkin geolocalizado (visita y checkin de Activo Oculto); evita
-- reproducir un payload lat/lng/accuracy capturado. Expira en 2 minutos
-- por defecto (now() + interval '2 minutes').

CREATE TABLE IF NOT EXISTS geo_nonces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid REFERENCES usuarios(id),
  nonce varchar(64) NOT NULL,
  proposito varchar(30),
  usado boolean NOT NULL DEFAULT false,
  creado_en timestamptz NOT NULL DEFAULT now(),
  expira_en timestamptz NOT NULL DEFAULT now() + interval '2 minutes'
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_geo_nonce_unico
  ON geo_nonces (nonce);

-- ============================================================
-- VERIFICACION POST-APLICACION (solo lectura; NO se ejecuta dentro de la
-- migracion)
-- ============================================================
-- Columnas nuevas en usuarios (esperadas 10):
-- SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'usuarios'
--     AND column_name IN ('referido_por','codigo_referido','xp_ref_total',
--       'referidos_directos_contados','faccion','faccion_elegida_en',
--       'email_verificado','email_token','email_token_expira',
--       'device_hashes');
--
-- Tablas e indices nuevos (esperados 4 tablas, 8 indices):
-- SELECT tablename FROM pg_tables
--   WHERE schemaname = 'public'
--     AND tablename IN ('activos_ocultos','activos_ocultos_votos',
--       'activos_ocultos_checkins','geo_nonces');
-- SELECT indexname FROM pg_indexes
--   WHERE schemaname = 'public'
--     AND indexname IN ('idx_usuarios_codigo_referido',
--       'idx_usuarios_referido_por','idx_usuarios_faccion',
--       'idx_activos_ocultos_estado_creado','idx_activos_ocultos_ciudad',
--       'idx_activos_ocultos_votos_usuario','idx_activo_checkin_unico',
--       'idx_geo_nonce_unico');