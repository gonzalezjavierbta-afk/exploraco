-- ============================================================================
-- Migration 018: Categorias de consumibles (catalogo administrable)
-- TSK-103 / ADR-028 (WP-6)
-- Fecha: 2026-09-15
-- Spec: PROMPT.md (TSK-103 / ADR-028, paquete WP-6)
--
-- CARACTER DE LA MIGRACION
--   ADITIVA: solo actualiza la columna consumibles.categoria; no crea ni
--   elimina tablas, columnas, indices ni constraints.
--   IDEMPOTENTE (ADR-008): los UPDATE son por igualdad de clave y asignan
--   un literal fijo, por lo que re-ejecutar el archivo deja exactamente el
--   mismo estado (segunda corrida = no-op funcional). No hay DELETE, no hay
--   INSERT, no hay DROP.
--   ASCII-SAFE (ADR-002): cero bytes > 127, cero backticks, sin tildes ni
--   emojis, sin escapes unicode (BUG-026).
--   NO MODIFICA 001-017: los archivos previos quedan intactos. Esta
--   migracion solo consume la columna creada por la 017.
--
-- PRE-REQUISITOS
--   017 aplicada (crea consumibles.categoria varchar(30) NOT NULL
--   DEFAULT 'general'). 010 (10 consumibles) y 015 (3 consumibles de
--   perfil) aplicadas. Catalogo real hoy: 17 filas en consumibles.
--
-- HALLAZGO DE ESQUEMA
--   La 017 recategorizo los 7 consumibles perfil_% a 'perfil'. Los otros 10
--   consumibles de la 010 seguian en 'general' (default de la columna). Esta
--   migracion los reparte en impulso, social, coleccion y general.
--   La columna NO lleva CHECK a proposito: es un catalogo administrable
--   (017, seccion 2); agregar categorias nuevas no debe exigir migracion.
--
-- ASIGNACION DEFINITIVA (17 consumibles, 5 categorias)
--   perfil (7):    perfil_marco_dorado, perfil_tema_oscuro,
--                  perfil_banda_artista, perfil_marco_plata,
--                  perfil_vitrina_destacada, perfil_titulo_custom,
--                  perfil_fondo_paisaje (015 + 017)
--   impulso (3):   amuleto_x2, trompeta_fama, imantador_cromos (010)
--   social (4):    sala_efimera, vitrina_estelar, pin_cromado, pase_vip (010)
--   coleccion (2): cuaderno_expedicion, pergamino_mapa (010)
--   general (1):   pluma_inspirada (010)
--   TOTAL = 7 + 3 + 4 + 2 + 1 = 17
--
-- TECNICA
--   Un UPDATE por categoria con lista explicita de claves (IN). Se evita
--   LIKE 'perfil_%' porque el guion bajo es comodin en LIKE y obligaria a
--   ESCAPE; la lista literal es exacta, legible y segura. No hay comodines.
--
-- APLICACION: correr este archivo COMPLETO en el editor SQL de Neon.
-- Las migraciones son acumulativas: re-ejecutar es seguro.
-- ============================================================================

-- ============================================================
-- 0. GUARDIA DE IDEMPOTENCIA
-- ============================================================
-- La columna la crea la 017. Se repite aqui con IF NOT EXISTS solo como
-- red de seguridad para una base donde la 017 no se haya aplicado todavia;
-- si ya existe, la sentencia es no-op.

ALTER TABLE consumibles
  ADD COLUMN IF NOT EXISTS categoria varchar(30) NOT NULL DEFAULT 'general';

-- ============================================================
-- 1. PERFIL (7) - los 7 consumibles perfil_%
-- ============================================================
-- Se reafirman los 7 (incluidos los ya puestos por la 017) para que 018 sea
-- autocontenida: re-ejecutarla deja el mismo estado.

UPDATE consumibles SET categoria = 'perfil'
WHERE clave IN (
  'perfil_marco_dorado',
  'perfil_tema_oscuro',
  'perfil_banda_artista',
  'perfil_marco_plata',
  'perfil_vitrina_destacada',
  'perfil_titulo_custom',
  'perfil_fondo_paisaje'
);

-- ============================================================
-- 2. IMPULSO (3) - consumibles de efecto temporal inmediato (010)
-- ============================================================

UPDATE consumibles SET categoria = 'impulso'
WHERE clave IN (
  'amuleto_x2',
  'trompeta_fama',
  'imantador_cromos'
);

-- ============================================================
-- 3. SOCIAL (4) - visibilidad / interaccion con la comunidad (010)
-- ============================================================

UPDATE consumibles SET categoria = 'social'
WHERE clave IN (
  'sala_efimera',
  'vitrina_estelar',
  'pin_cromado',
  'pase_vip'
);

-- ============================================================
-- 4. COLECCION (2) - capacidad permanente de acervo (010)
-- ============================================================

UPDATE consumibles SET categoria = 'coleccion'
WHERE clave IN (
  'cuaderno_expedicion',
  'pergamino_mapa'
);

-- ============================================================
-- 5. GENERAL (1) - contenido editorial, sin encaje en las anteriores (010)
-- ============================================================

UPDATE consumibles SET categoria = 'general'
WHERE clave IN (
  'pluma_inspirada'
);

-- ============================================================
-- VERIFICACION POST-APLICACION (solo lectura; NO se ejecuta dentro de la
-- migracion). Copiar y correr en el editor de Neon.
-- ============================================================
-- SELECT categoria, COUNT(*) FROM consumibles GROUP BY categoria ORDER BY categoria;
-- Esperado (17 filas):
--   coleccion | 2
--   general   | 1
--   impulso   | 3
--   perfil    | 7
--   social    | 4
