-- Cleanup 001: Eliminar datos de prueba del esquema de produccion
-- Ejecutado en Neon (consola) el 2026-08-19 por Javier. Versionado para
-- reproducibilidad y auditoria (ADR-008: el SQL de datos no exige archivo,
-- pero se registra igual por trazabilidad).
--
-- Alcance:
--   1. 424 registros test-hostal-verificacion-bogota-* (386 draft + 38 archived)
--      generados por pruebas masivas de una sesion anterior.
--   2. El evento 'fiesta-r10' (status published, contenido basura, lat/lng 0)
--      visible en listados publicos.
--   3. El usuario de prueba 'prueba' (0a865be8-7a28-47c6-b9b6-97dc9287b9a5,
--      xp=0, sin interacciones).

-- 1) Limpieza de destinos de prueba (cascada manual igual que el DELETE
--    de api/admin-destinos.js:311).
DELETE FROM interacciones     WHERE destino_id IN (SELECT id FROM destinos WHERE slug LIKE 'test-hostal-%' OR slug='fiesta-r10');
DELETE FROM destinos_fotos    WHERE destino_id IN (SELECT id FROM destinos WHERE slug LIKE 'test-hostal-%' OR slug='fiesta-r10');
DELETE FROM destinos_detalles WHERE destino_id IN (SELECT id FROM destinos WHERE slug LIKE 'test-hostal-%' OR slug='fiesta-r10');
DELETE FROM destinos          WHERE slug LIKE 'test-hostal-%' OR slug='fiesta-r10';

-- 2) Usuario de prueba (primero sus interacciones por FK).
DELETE FROM interacciones WHERE usuario_id='0a865be8-7a28-47c6-b9b6-97dc9287b9a5';
DELETE FROM usuarios WHERE id='0a865be8-7a28-47c6-b9b6-97dc9287b9a5' AND nombre='prueba';