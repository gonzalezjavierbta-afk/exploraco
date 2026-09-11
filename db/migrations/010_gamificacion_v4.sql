-- Migration 010: Gamificacion v4.0 - Consumibles, Cromos, Pandillas, 20 Niveles
-- Spec: docs/superpowers/specs/2026-09-10-gamificacion-v4-design.md
-- Aplicar en Neon ANTES de desplegar api/interacciones.js v9
-- Requiere: migraciones 007, 008 y 009 previamente aplicadas
--
-- ASCII-safe (ADR-002): cero bytes > 127.
-- Idempotente (ADR-008): re-ejecutar es seguro.
--
-- APLICACION: correr este archivo COMPLETO en el editor SQL de Neon.
-- Las migraciones son acumulativas con IF NOT EXISTS: re-ejecutar es seguro.

-- ============================================================
-- 1. TABLA CONSUMIBLES (catalogo gestionable desde admin)
-- ============================================================

CREATE TABLE IF NOT EXISTS consumibles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clave varchar(50) UNIQUE NOT NULL,
  nombre varchar(100) NOT NULL,
  descripcion text DEFAULT '',
  precio_xp integer NOT NULL DEFAULT 0,
  activo boolean NOT NULL DEFAULT true,
  creado_en timestamptz DEFAULT now()
);

-- ============================================================
-- 2. TABLA COMPRA_CONSUMIBLES (ledger append-only de compras)
-- ============================================================

CREATE TABLE IF NOT EXISTS compra_consumibles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  consumible_id uuid NOT NULL REFERENCES consumibles(id) ON DELETE RESTRICT,
  xp_pagado integer NOT NULL,
  creado_en timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_compra_consumibles_usuario
  ON compra_consumibles (usuario_id, creado_en DESC);

CREATE INDEX IF NOT EXISTS idx_compra_consumibles_dia
  ON compra_consumibles (usuario_id, creado_en)
  WHERE creado_en > (NOW() - INTERVAL '1 day');

-- ============================================================
-- 3. TABLA CONSUMO_CONSUMIBLES (ledger append-only de usos)
-- ============================================================

CREATE TABLE IF NOT EXISTS consumo_consumibles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  consumible_id uuid NOT NULL REFERENCES consumibles(id) ON DELETE RESTRICT,
  efecto_detalle jsonb DEFAULT '{}'::jsonb,
  creado_en timestamptz DEFAULT now()
);

-- ============================================================
-- 4. TABLA CROMOS_CATALOGO
-- ============================================================

CREATE TABLE IF NOT EXISTS cromos_catalogo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  set_slug varchar(100) NOT NULL,
  nombre varchar(150) NOT NULL,
  rareza varchar(20) DEFAULT 'comun' CHECK (rareza IN ('comun','raro','epico','dorado')),
  imagen_url text,
  activo boolean NOT NULL DEFAULT true,
  creado_en timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cromos_set
  ON cromos_catalogo (set_slug, activo);

-- ============================================================
-- 5. TABLA USUARIOS_CROMOS
-- ============================================================

CREATE TABLE IF NOT EXISTS usuarios_cromos (
  usuario_id uuid NOT NULL REFERENCES usuarios(id),
  cromo_id uuid NOT NULL REFERENCES cromos_catalogo(id),
  cantidad int NOT NULL DEFAULT 1,
  obtenido_en timestamptz DEFAULT now(),
  PRIMARY KEY (usuario_id, cromo_id)
);

CREATE INDEX IF NOT EXISTS idx_ucromos_usuario
  ON usuarios_cromos (usuario_id, obtenido_en DESC);

-- ============================================================
-- 6. TABLA PANDILLAS (Cero Borrado Logico)
-- ============================================================

CREATE TABLE IF NOT EXISTS pandillas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre varchar(100) UNIQUE NOT NULL,
  fundador_id uuid NOT NULL REFERENCES usuarios(id),
  fama_total int NOT NULL DEFAULT 0,
  ciudad_base varchar(100),
  descripcion text DEFAULT '',
  activo boolean NOT NULL DEFAULT true,
  creado_en timestamptz DEFAULT now()
);

-- ============================================================
-- 7. TABLA PANDILLAS_MIEMBROS
-- ============================================================

CREATE TABLE IF NOT EXISTS pandillas_miembros (
  pandilla_id uuid NOT NULL REFERENCES pandillas(id),
  usuario_id uuid NOT NULL REFERENCES usuarios(id),
  rol varchar(20) NOT NULL DEFAULT 'miembro' CHECK (rol IN ('fundador','oficial','miembro')),
  activo boolean NOT NULL DEFAULT true,
  fecha_ingreso timestamptz DEFAULT now(),
  PRIMARY KEY (pandilla_id, usuario_id)
);

CREATE INDEX IF NOT EXISTS idx_pm_usuario
  ON pandillas_miembros (usuario_id, activo)
  WHERE activo = true;

CREATE INDEX IF NOT EXISTS idx_pm_pandilla
  ON pandillas_miembros (pandilla_id, activo)
  WHERE activo = true;

-- ============================================================
-- 8. TABLA PANDILLA_RETOS (retos de parche con ventana temporal)
-- ============================================================

CREATE TABLE IF NOT EXISTS pandilla_retos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pandilla_id uuid NOT NULL REFERENCES pandillas(id),
  titulo varchar(150) NOT NULL,
  descripcion text DEFAULT '',
  tipo_reto varchar(50) NOT NULL DEFAULT 'general',
  meta_valor int NOT NULL DEFAULT 10,
  fecha_inicio timestamptz NOT NULL DEFAULT now(),
  fecha_fin timestamptz NOT NULL,
  progreso_actual int NOT NULL DEFAULT 0,
  completado boolean NOT NULL DEFAULT false,
  xp_bono int NOT NULL DEFAULT 0,
  creado_en timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pandilla_retos_activos
  ON pandilla_retos (pandilla_id, completado, fecha_fin)
  WHERE completado = false;

-- ============================================================
-- 9. COLUMNA CAPACIDADES EN USUARIOS (inventario de consumibles)
-- ============================================================

ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS capacidades jsonb NOT NULL DEFAULT '{}'::jsonb;

-- ============================================================
-- 10. SEMBREADO INICIAL DE LOS 10 CONSUMIBLES
-- ============================================================

INSERT INTO consumibles (clave, nombre, descripcion, precio_xp) VALUES
  ('pluma_inspirada', 'Pluma Inspirada', 'Publica un escrito/articulo en Inspirate sin esperar postulacion de nivel.', 600),
  ('cuaderno_expedicion', 'Cuaderno de Expedicion', '+1 album de fotos activo adicional por encima del tope.', 450),
  ('pergamino_mapa', 'Pergamino del Cartografo', '+1 mapa tematico adicional por encima del tope 50.', 500),
  ('sala_efimera', 'Sala Efimera', 'Crea una sala de chat comunitaria sin requerir la capacidad crear_chat (dura 7 dias).', 800),
  ('amuleto_x2', 'Amuleto de Doble XP', 'Multiplica x2 el XP de tus proximas 5 acciones.', 350),
  ('imantador_cromos', 'Iman de Cromos', 'Garantiza rareza epica o mejor en la proxima obtencion de cromo.', 400),
  ('trompeta_fama', 'Trompeta de la Fama', 'Duplica tu aporte a Fama de Pandilla durante 24 horas.', 500),
  ('vitrina_estelar', 'Vitrina Estelar', 'Destaca tu perfil en la comunidad durante 7 dias.', 300),
  ('pin_cromado', 'Pin Cromado', 'Fija una foto/album destacado en el Mapa Audiovisual por 7 dias.', 250),
  ('pase_vip', 'Pase VIP Leyenda', 'Acceso prioritario a eventos + badge temporal exclusivo (30 dias).', 1500)
ON CONFLICT (clave) DO NOTHING;

-- ============================================================
-- 11. VERIFICACION DE COLUMNA XP_TOTAL
-- ============================================================
-- xp_total ya existe en usuarios (usado desde v1 de gamificacion).
-- Solo verificamos que exista para garantizar la integridad:
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'usuarios' AND column_name = 'xp_total'
  ) THEN
    ALTER TABLE usuarios ADD COLUMN xp_total integer NOT NULL DEFAULT 0;
  END IF;
END $$;

-- ============================================================
-- 12. TABLA CROMO_INTERCAMBIOS (ledger append-only, BUG-2 fix)
-- ============================================================
-- Tabla dedicada para auditar intercambios de cromos entre usuarios.
-- NO se usa consumo_consumibles para esto: esa tabla es solo para
-- usos de consumibles. Se requiere anti-farming: max 3
-- intercambios/dia/emisor, medido via idx_cromo_inter_dia.

CREATE TABLE IF NOT EXISTS cromo_intercambios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  emisor_id uuid NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  receptor_id uuid NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  cromo_id uuid NOT NULL REFERENCES cromos_catalogo(id) ON DELETE RESTRICT,
  creado_en timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cromo_inter_dia
  ON cromo_intercambios (emisor_id, creado_en);

CREATE INDEX IF NOT EXISTS idx_cromo_inter_receptor
  ON cromo_intercambios (receptor_id, creado_en);
