-- q1_rastro_video.sql
-- Busqueda del 4to video "rastro mc-trampas" + todos los videos del usuario.
-- READ-ONLY (SELECT). ASCII-safe (ADR-002): cero tildes, cero ene, cero backticks.
-- Uso: node scripts/neon_select.js -f db/queries/q1_rastro_video.sql
SELECT af.id::text, af.foto_type, af.media_title, af.foto_url,
       af.activo AS af_activo, af.visible AS af_visible, af.creado_en,
       a.id::text AS album_id, a.titulo AS album_titulo, a.activo AS album_activo,
       a.lat, a.lng, a.ciudad
  FROM album_fotos af LEFT JOIN albumes a ON a.id = af.album_id
 WHERE af.agregador_id = (SELECT id FROM usuarios WHERE email = 'gonzalezjavierbta@gmail.com')
   AND (af.media_title ILIKE '%rastro%' OR af.foto_type = 'video')
 ORDER BY af.creado_en DESC;