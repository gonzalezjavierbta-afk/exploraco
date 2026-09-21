-- q3_presion_limite_mapa.sql
-- Dimensiona la presion del LIMIT del mapa cultural (BUG-069): cuantas filas
-- entran a cada rama del UNION publico.
-- READ-ONLY (SELECT). ASCII-safe (ADR-002).
-- Uso: node scripts/neon_select.js -f db/queries/q3_presion_limite_mapa.sql
SELECT
  (SELECT COUNT(*)::int FROM album_fotos af JOIN albumes a ON a.id = af.album_id
    WHERE a.activo = true AND af.activo = true AND af.visible = true) AS album_rama,
  (SELECT COUNT(*)::int FROM destinos_fotos df JOIN destinos d ON d.id = df.destino_id
    WHERE d.lat IS NOT NULL AND d.lng IS NOT NULL AND d.status = 'published') AS destino_rama;