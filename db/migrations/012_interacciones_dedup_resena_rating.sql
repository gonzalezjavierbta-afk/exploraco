-- Migration 012: Dedup de resena/rating en interacciones (una calificacion por usuario y destino)
-- ADR-007 (Quick-Rating: una calificacion por usuario y destino, sobre tipo IN ('resena','rating')).
--
-- Motivo: la constraint unica heredada interacciones_usuario_id_destino_id_tipo_key
--   (sobre usuario_id, destino_id, tipo) fue disenada para deduplicar resenas/rating,
--   pero choca con las fotos: los handlers tipo='foto' (api/interacciones.js L2356-2360)
--   y tipo='foto_voto' (L2394-2398) insertan filas tipo='foto' para el mismo
--   (usuario_id, destino_id). La segunda foto del mismo usuario al mismo destino lanza
--   "duplicate key value violates unique constraint" y el catch generico (L3446-3449)
--   lo devuelve como 500. La constraint NO debe aplicar a fotos (registros libres, ADR-017).
--
-- Pasos:
--   1. DROP de la constraint vieja (idempotente).
--   2. Limpieza defensiva de duplicados resena+rating: conserva la resena (con texto)
--      sobre el rating y, a igualdad de tipo, la fila mas reciente por
--      (usuario_id, destino_id); excluye usuario_id NULL (ROW_NUMBER + DELETE por id).
--   3. Indice unico parcial nuevo: una calificacion por usuario y destino SOLO para
--      resena/rating. Las fotos quedan libres, sin restriccion.
--   4. Recalculo de destinos.rating/total_resenas SOLO para los destinos afectados.
--      NECESARIO: la constraint vieja era por tipo (usuario_id, destino_id, tipo), por lo
--      que permitia que un usuario tuviera a la vez una 'resena' y un 'rating' del mismo
--      destino. El paso 2 borra la mas antigua y los agregados deben realinearse.
--
-- ASCII-safe (ADR-002): cero bytes > 127. Idempotente (ADR-008): re-ejecutar es seguro.
--
-- APLICACION: correr este archivo COMPLETO en el editor SQL de Neon.

-- ============================================================
-- 1. ELIMINAR LA CONSTRAINT UNICA VIEJA (las fotos chocaban aca)
-- ============================================================

ALTER TABLE interacciones
  DROP CONSTRAINT IF EXISTS interacciones_usuario_id_destino_id_tipo_key;

-- ============================================================
-- 2. LIMPIEZA DEFENSIVA DE DUPLICADOS resena/rating
-- ============================================================
-- La constraint vieja era por tipo: permitia una 'resena' y un 'rating'
-- del mismo usuario al mismo destino. El indice unico parcial nuevo (paso 3)
-- exige UNA sola fila por (usuario_id, destino_id) entre ambos tipos, asi que
-- aqui se conserva, por (usuario_id, destino_id), primero la resena (tipo='resena',
-- que preserva el texto) y a igualdad de tipo la mas reciente (creado_en DESC),
-- excluyendo usuario_id NULL (votos anonimos).

-- 2a. Capturar los destinos afectados ANTES de borrar (para el recalc del paso 4).
DROP TABLE IF EXISTS tmp_dedup_afectados;

CREATE TEMP TABLE tmp_dedup_afectados (destino_id uuid PRIMARY KEY);

INSERT INTO tmp_dedup_afectados (destino_id)
SELECT DISTINCT duplicados.destino_id
FROM (
  SELECT destino_id,
         ROW_NUMBER() OVER (
           PARTITION BY usuario_id, destino_id
           ORDER BY (tipo = 'resena') DESC, creado_en DESC, id DESC
         ) AS rn
  FROM interacciones
  WHERE tipo IN ('resena','rating')
    AND usuario_id IS NOT NULL
) duplicados
WHERE duplicados.rn > 1
  AND duplicados.destino_id IS NOT NULL;

-- 2b. Borrar duplicados: conserva solo rn = 1 (la fila mas reciente).
DELETE FROM interacciones
WHERE id IN (
  SELECT duplicados.id
  FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY usuario_id, destino_id
             ORDER BY (tipo = 'resena') DESC, creado_en DESC, id DESC
           ) AS rn
    FROM interacciones
    WHERE tipo IN ('resena','rating')
      AND usuario_id IS NOT NULL
  ) duplicados
  WHERE duplicados.rn > 1
);

-- ============================================================
-- 3. INDICE UNICO PARCIAL NUEVO (solo resena/rating)
-- ============================================================
-- Sustituye a la constraint vieja: dedup solo para resena/rating.
-- Las filas tipo='foto' (fotos y votos de foto) quedan libres.

CREATE UNIQUE INDEX IF NOT EXISTS idx_interacciones_dedup_resena_rating
  ON interacciones (usuario_id, destino_id)
  WHERE tipo IN ('resena','rating');

-- ============================================================
-- 4. RECALCULO DE AGREGADOS (solo destinos afectados)
-- ============================================================
-- Realinea destinos.rating (AVG redondeado a 2 decimales) y
-- destinos.total_resenas (COUNT) sobre resena+rating, identico al
-- recalculo de api/admin.js e api/interacciones.js (ADR-007).
-- Solo toca los destinos con duplicados eliminados (tmp_dedup_afectados).

UPDATE destinos d
SET rating = sub.rating,
    total_resenas = sub.total_resenas,
    actualizado_en = NOW()
FROM (
  SELECT i.destino_id,
         ROUND((AVG(i.rating) FILTER (WHERE i.rating IS NOT NULL))::numeric, 2) AS rating,
         COUNT(*) AS total_resenas
  FROM interacciones i
  JOIN tmp_dedup_afectados a ON a.destino_id = i.destino_id
  WHERE i.tipo IN ('resena','rating')
  GROUP BY i.destino_id
) sub
WHERE d.id = sub.destino_id;

-- Limpieza de la tabla temporal (idempotente).
DROP TABLE IF EXISTS tmp_dedup_afectados;

-- ============================================================
-- VERIFICACION (solo lectura, comentada):
-- ============================================================
-- SELECT indexname, indexdef FROM pg_indexes WHERE tablename='interacciones';
