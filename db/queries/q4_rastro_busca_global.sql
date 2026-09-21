-- q4_rastro_busca_global.sql
-- Busqueda forense global de "rastro" en TODAS las tablas de media del usuario
-- (album_fotos, destinos_fotos, interacciones legacy, media_comentarios).
-- READ-ONLY. ASCII-safe (ADR-002).
-- Uso: node scripts/neon_select.js -f db/queries/q4_rastro_busca_global.sql
SELECT 'album_fotos' AS origen, af.id::text AS id, af.foto_type,
       af.media_title, af.foto_url, af.activo, af.visible, af.agregador_id::text
  FROM album_fotos af
 WHERE af.media_title ILIKE '%rastro%'
    OR af.foto_url ILIKE '%rastro%'
UNION ALL
SELECT 'destinos_fotos', df.id::text, NULL::text AS foto_type,
       df.caption::text, df.url::text AS foto_url, NULL, NULL, NULL
  FROM destinos_fotos df
 WHERE df.caption ILIKE '%rastro%'
    OR df.url ILIKE '%rastro%'
UNION ALL
SELECT 'interacciones', i.id::text, NULL::text AS foto_type,
       i.dims->>'titulo', i.dims->>'url', NULL, NULL, i.usuario_id::text
  FROM interacciones i
 WHERE i.dims->>'titulo' ILIKE '%rastro%'
    OR i.dims->>'url' ILIKE '%rastro%'
    OR i.dims->>'media_title' ILIKE '%rastro%'
UNION ALL
SELECT 'videos_cuenta', af.id::text, af.foto_type, af.media_title, af.foto_url,
       af.activo, af.visible, af.agregador_id::text
  FROM album_fotos af
 WHERE af.agregador_id = (SELECT id FROM usuarios WHERE email = 'gonzalezjavierbta@gmail.com')
   AND af.foto_type = 'video';