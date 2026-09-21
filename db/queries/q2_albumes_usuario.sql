-- q2_albumes_usuario.sql
-- Inventario de albumes del usuario (ahi vive la geolocalizacion del mapa).
-- READ-ONLY (SELECT). ASCII-safe (ADR-002).
-- Uso: node scripts/neon_select.js -f db/queries/q2_albumes_usuario.sql
SELECT a.id::text, a.titulo, a.tipo, a.activo, a.lat, a.lng, a.ciudad, a.region,
       a.creado_en
  FROM albumes a
 WHERE a.usuario_id = (SELECT id FROM usuarios WHERE email = 'gonzalezjavierbta@gmail.com')
 ORDER BY a.creado_en DESC;