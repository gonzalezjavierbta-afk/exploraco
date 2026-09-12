-- Migration 014: Reset unico de las visitas gamificadas (presencia fisica)
-- ADR-024 (2026-09-12). Aplicar en Neon ANTES de desplegar el nuevo
-- dedup de visitas.
--
-- OBJETIVO
--   Purgar de forma UNICA las visitas GAMIFICADAS
--   (interacciones.tipo='visita' AND usuario_id IS NOT NULL), recomputando
--   XP/fama/contadores y eliminando la race condition del dedup de visitas.
--   La analitica ANONIMA (usuario_id IS NULL, escrita por
--   api/utilidades.js -> /api/utilidades?tipo=visitas) NO se toca.
--
-- DECISION APROBADA (ADR-024)
--   Purga fisica de las visitas gamificadas CON tabla de respaldo de
--   auditoria (excepcion autorizada a Cero Borrado Logico). Precedente:
--   la migracion 012 ya borra filas de interacciones para deduplicar.
--
-- IMPLEMENTACION SIN TABLAS TEMPORALES
--   Version reescrita para ser compatible con editores SQL que autocommiten
--   por sentencia (Neon SQL Editor): no usa CREATE TEMP TABLE / ON COMMIT
--   DROP, que se perdian entre sentencias. Cada paso es autocontenido con
--   subconsultas. El orden importa: primero se recomputa con las filas aun
--   presentes y al final se borran.
--
-- HALLAZGOS DE ESQUEMA (leidos de db/migrations y api/interacciones.js)
--   - interacciones.xp_ganado existe y se escribe SIEMPRE con el XP BASE
--     de la accion: 'visita' inserta 20 (interacciones.js L3806). El
--     multiplicador x1.1 de lider y el amuleto_x2 se suman aparte a
--     usuarios.xp_total y NO quedan en la fila. Por eso SUM(xp_ganado)
--     puede quedar por DEBAJO del XP realmente acreditado (ver
--     ADVERTENCIAS): queda un residuo positivo de XP intencional.
--   - pandilla_retos.fecha_inicio / fecha_fin SI existen (migracion 010).
--   - pandillas_miembros.activo y pandillas.fama_total existen (010).
--   - progreso_misiones / progreso_logros son JSONB en usuarios; las claves
--     se leen con el operador '?' (clave presente).
--   - FKs ENTRANTES a interacciones en el repo: la unica es
--     resena_votos.resena_id REFERENCES interacciones(id) (migracion 007),
--     que solo referencia resenas, nunca visitas. Ver bloque de diagnostico
--     al final por si hubiera FKs no versionadas.
--
-- PROTECCIONES
--   - GREATEST(0, ...) en todos los contadores (xp_total, total_visitas,
--     fama_total, progreso_actual).
--   - NO se toca resena_votos, ni destinos.rating/total_resenas, ni filas
--     tipo='visita' AND usuario_id IS NULL, ni usuarios_cromos.
--   - Idempotente (ADR-008): las subconsultas leen las visitas gamificadas
--     existentes; tras la primera corrida no quedan, por lo que re-ejecutar
--     no vuelve a restar. El respaldo usa WHERE NOT EXISTS por id.
--
-- ASCII-safe (ADR-002): cero bytes > 127; sin tildes ni emoji literales.
--
-- APLICACION: correr este archivo COMPLETO en el editor SQL de Neon.
-- Si una corrida anterior quedo a medias con un BEGIN abierto, ejecutar
-- primero ROLLBACK; y luego este archivo.

BEGIN;

-- ============================================================
-- PASO 1. TABLA DE RESPALDO DE AUDITORIA (permanente)
-- ============================================================
-- Clon exacto del esquema de interacciones (0 filas). Si ya existe, se
-- reutiliza. Contiene las filas purgadas.

CREATE TABLE IF NOT EXISTS interacciones_visitas_reset_backup AS
SELECT * FROM interacciones WHERE 1 = 0;

CREATE INDEX IF NOT EXISTS idx_interacciones_visitas_reset_backup_id
  ON interacciones_visitas_reset_backup (id);

-- ============================================================
-- PASO 2. RESPALDO DE LAS VISITAS GAMIFICADAS (antes de borrar)
-- ============================================================
-- Idempotente: no duplica filas ya respaldadas (WHERE NOT EXISTS por id).

INSERT INTO interacciones_visitas_reset_backup
SELECT i.*
FROM interacciones i
WHERE i.tipo = 'visita'
  AND i.usuario_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM interacciones_visitas_reset_backup b WHERE b.id = i.id
  );

-- ============================================================
-- PASO 3. RECOMPUTAR XP TOTAL (GREATEST evita negativos)
-- ============================================================
-- Resta el XP base de las visitas + los bonos de misiones/logros que se
-- habian otorgado gracias a esas visitas. XP real del catalogo:
--   mis_primera_visita        -> 15
--   mis_itinerario_perfeccion -> 60
--   logr_visitas_5            -> 15
--   logr_visitas_20           -> 50

UPDATE usuarios u
SET xp_total = GREATEST(
      0,
      COALESCE(u.xp_total, 0)
        - COALESCE(v.xp_base, 0)
        - COALESCE(b.xp_bono, 0)
    )
FROM (
  SELECT
    i.usuario_id,
    COALESCE(SUM(i.xp_ganado), 0)::int AS xp_base
  FROM interacciones i
  WHERE i.tipo = 'visita'
    AND i.usuario_id IS NOT NULL
  GROUP BY i.usuario_id
) v
LEFT JOIN (
  SELECT
    u2.id AS usuario_id,
    (
        CASE WHEN COALESCE(u2.progreso_misiones, '{}'::jsonb) ? 'mis_primera_visita'
             THEN 15 ELSE 0 END
      + CASE WHEN COALESCE(u2.progreso_misiones, '{}'::jsonb) ? 'mis_itinerario_perfeccion'
             THEN 60 ELSE 0 END
      + CASE WHEN COALESCE(u2.progreso_logros, '{}'::jsonb) ? 'logr_visitas_5'
             THEN 15 ELSE 0 END
      + CASE WHEN COALESCE(u2.progreso_logros, '{}'::jsonb) ? 'logr_visitas_20'
             THEN 50 ELSE 0 END
    )::int AS xp_bono
  FROM usuarios u2
) b ON b.usuario_id = v.usuario_id
WHERE u.id = v.usuario_id;

-- ============================================================
-- PASO 4. RECOMPUTAR CONTADOR DE VISITAS
-- ============================================================

UPDATE usuarios u
SET total_visitas = GREATEST(0, COALESCE(u.total_visitas, 0) - v.n)
FROM (
  SELECT i.usuario_id, COUNT(*)::int AS n
  FROM interacciones i
  WHERE i.tipo = 'visita'
    AND i.usuario_id IS NOT NULL
  GROUP BY i.usuario_id
) v
WHERE u.id = v.usuario_id;

-- ============================================================
-- PASO 5. RESET DIRIGIDO DE FLAGS (jsonb - text, NUNCA reemplazo total)
-- ============================================================
-- ADR-003: se quitan SOLO las claves dependientes de visitas, con el
-- operador de sustraccion jsonb - text. El resto del objeto se conserva.

UPDATE usuarios u
SET
  progreso_misiones = COALESCE(u.progreso_misiones, '{}'::jsonb)
                      - 'mis_primera_visita'
                      - 'mis_itinerario_perfeccion',
  progreso_logros   = COALESCE(u.progreso_logros, '{}'::jsonb)
                      - 'logr_visitas_5'
                      - 'logr_visitas_20'
WHERE EXISTS (
  SELECT 1 FROM interacciones i
  WHERE i.tipo = 'visita'
    AND i.usuario_id = u.id
);

-- ============================================================
-- PASO 6. RECOMPUTAR FAMA DE PANDILLA
-- ============================================================
-- La fama acreditada por visita es round(xp * 0.10) con minimo 1
-- (aplicarFamaPandilla). Se replica sobre el XP base de cada visita y se
-- agrupa por pandilla de miembros activos.
-- ADVERTENCIA: el POST acredita fama a UNA sola pandilla activa; si un
-- usuario pertenecio a varias, este recomputo puede restar en mas de una
-- (GREATEST(0,...) impide negativos).

UPDATE pandillas p
SET fama_total = GREATEST(0, COALESCE(p.fama_total, 0) - f.fama)
FROM (
  SELECT
    pm.pandilla_id,
    SUM(GREATEST(1, ROUND(i.xp_ganado * 0.10)))::int AS fama
  FROM interacciones i
  JOIN pandillas_miembros pm
    ON pm.usuario_id = i.usuario_id
   AND pm.activo = true
  WHERE i.tipo = 'visita'
    AND i.usuario_id IS NOT NULL
  GROUP BY pm.pandilla_id
) f
WHERE p.id = f.pandilla_id;

-- ============================================================
-- PASO 7. RETOS DE PANDILLA (decremento + recalculo de completado)
-- ============================================================
-- Cuenta las visitas por reto tipo_reto='visita' dentro de la ventana
-- fecha_inicio/fecha_fin y cuyo autor era miembro ACTIVO de la pandilla.
-- NO se revierte el xp_bono ya repartido (fuera de alcance).

UPDATE pandilla_retos pr
SET
  progreso_actual = GREATEST(0, pr.progreso_actual - d.n_visitas),
  completado      = (GREATEST(0, pr.progreso_actual - d.n_visitas) >= pr.meta_valor)
FROM (
  SELECT
    pr2.id            AS reto_id,
    COUNT(*)::int     AS n_visitas
  FROM pandilla_retos pr2
  JOIN pandillas_miembros pm
    ON pm.pandilla_id = pr2.pandilla_id
   AND pm.activo = true
  JOIN interacciones i
    ON i.usuario_id = pm.usuario_id
   AND i.tipo = 'visita'
   AND i.usuario_id IS NOT NULL
   AND i.creado_en >= pr2.fecha_inicio
   AND i.creado_en <= pr2.fecha_fin
  WHERE pr2.tipo_reto = 'visita'
  GROUP BY pr2.id
) d
WHERE pr.id = d.reto_id;

-- ============================================================
-- PASO 8. PURGA FISICA DE LAS VISITAS GAMIFICADAS
-- ============================================================
-- Se borran TODAS las visitas gamificadas (ya estan respaldadas en el
-- paso 2). Las filas anonimas (usuario_id IS NULL) NO se tocan.

DELETE FROM interacciones
WHERE tipo = 'visita'
  AND usuario_id IS NOT NULL;

-- ============================================================
-- PASO 9. INDICE UNICO PARCIAL (cierra la race condition)
-- ============================================================
-- Una sola visita gamificada por usuario y destino. Las visitas anonimas
-- (usuario_id IS NULL) quedan fuera del indice. Con las filas ya purgadas
-- no puede fallar por duplicados.

CREATE UNIQUE INDEX IF NOT EXISTS idx_interacciones_visita_unica
  ON interacciones (usuario_id, destino_id)
  WHERE tipo = 'visita' AND usuario_id IS NOT NULL;

-- ============================================================
-- PASO 10. INDICE DE APOYO PARA LA ULTIMA VISITA POR USUARIO
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_interacciones_ultima_visita
  ON interacciones (usuario_id, creado_en DESC)
  WHERE tipo = 'visita' AND usuario_id IS NOT NULL;

COMMIT;

-- ============================================================
-- DIAGNOSTICO (solo lectura; NO se ejecuta dentro de la migracion)
-- ============================================================
-- Conteo previo a aplicar el reset (visitas gamificadas vs anonimas):
-- SELECT COUNT(*) FILTER (WHERE usuario_id IS NOT NULL) AS visitas_gamificadas,
--        COUNT(*) FILTER (WHERE usuario_id IS NULL)     AS visitas_anonimas
-- FROM interacciones
-- WHERE tipo = 'visita';
--
-- FKs entrantes a interacciones (revisar antes del DELETE por si hubiera
-- objetos NO versionados, leccion BUG-021):
-- SELECT conname, conrelid::regclass AS tabla_origen
-- FROM pg_constraint
-- WHERE confrelid = 'interacciones'::regclass
--   AND contype = 'f';
--
-- Verificacion POST-aplicacion:
-- SELECT COUNT(*) FROM interacciones
--   WHERE tipo = 'visita' AND usuario_id IS NOT NULL;  -- esperado 0
-- SELECT COUNT(*) FROM interacciones
--   WHERE tipo = 'visita' AND usuario_id IS NULL;      -- preservado
-- SELECT COUNT(*) FROM interacciones_visitas_reset_backup;
-- SELECT indexname FROM pg_indexes
--   WHERE tablename = 'interacciones'
--     AND indexname = 'idx_interacciones_visita_unica';
