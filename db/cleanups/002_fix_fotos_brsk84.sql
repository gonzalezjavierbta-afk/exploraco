-- ============================================================================
-- Cleanup 002: Dejar de publicar las fotos con URL vacia del usuario
--             brsk84@gmail.com (sintoma "figura publicada pero no se ve").
-- Fecha: 2026-09-18
-- Autor: sql-security
-- Trazabilidad: ADR-008 (SQL de datos versionado) y Cero Borrado Logico
--   (Regla de Oro 3): NO se borra ninguna fila; solo se marca visible/activo
--   en false para que deje de figurar como publicada.
-- Requiere: migracion 025 (album_fotos.visible) aplicada en Neon.
--
-- CONTEXTO REAL (auditado)
--   GET /api/interacciones?tipo=mis_fotos une:
--     (a) album_fotos af JOIN albumes a
--         WHERE af.agregador_id=$1 AND af.activo=true AND af.visible=true
--               AND a.activo=true
--     (b) interacciones i JOIN destinos d
--         WHERE i.usuario_id=$1 AND i.tipo='foto' AND i.activo=true
--   Una fila con af.visible=true pero af.foto_url vacia SI pasa el filtro SQL
--   y SI se cuenta como publicada (los checks de misiones cuentan
--   album_fotos por agregador_id sin filtrar visible/activo), pero la UI no
--   puede renderizar la imagen: se percibe "publicada" y NO se ve.
--
-- POR QUE SE OCULTA Y NO SE REPARA
--   La causa es ausencia de contenido (foto_url vacia). No existe archivo ni
--   URL que reparar: no hay binario ni enlace persistido. La unica accion
--   segura es dejar de publicarla para no exponer un recurso roto. El dueno
--   puede volver a agregarla con una URL valida desde la UI.
--
-- ADVERTENCIA: RESPALDO PREVIO OBLIGATORIO
--   Antes de ejecutar cualquier UPDATE, en el editor SQL de Neon correr y
--   guardar el resultado del bloque [0] RESPALDO. Un UPDATE de datos es
--   irreversible sin ese respaldo.
--
-- SEGURIDAD DE EJECUCION
--   Los UPDATE van acotados por el estado EXACTO previo (visible=true /
--   activo=true) y por el email; una segunda corrida matchea 0 filas. NO se
--   reactiva ningun album padre inactivo: eso se REPORTA y se deja a
--   decision manual (documentado abajo).
--
-- IDEMPOTENTE (ADR-008): re-ejecutar el archivo COMPLETO es no-op real.
-- ASCII-SAFE (ADR-002 / BUG-026): cero bytes > 127, sin tildes, sin ene,
--   sin backticks, sin emojis. El email va literal en cada statement; para
--   reutilizar con otro usuario, reemplazar TODAS las ocurrencias.
-- ============================================================================

-- ============================================================================
-- [1] DIAGNOSTICO PREVIO (solo lectura; ejecutar y revisar ANTES del UPDATE)
-- ============================================================================
-- Copiar y correr sentencia por sentencia. Esperado: [1.1] y [1.2] listan las
-- filas que se van a ocultar; [1.3] lista albumes padres inactivos (SOLO
-- reporte, NO se reactivan).

-- [0] RESPALDO PREVIO (obligatorio; guardar el resultado en un archivo):
-- SELECT af.*
--   FROM album_fotos af
--   WHERE af.agregador_id = (SELECT id FROM usuarios WHERE email = 'brsk84@gmail.com');

-- [1.1] album_fotos con visible=true y URL vacia (candidatas al UPDATE [2.1]):
-- SELECT af.id, af.album_id, af.foto_url, af.visible, af.activo, af.creado_en
--   FROM album_fotos af
--   WHERE af.agregador_id = (SELECT id FROM usuarios WHERE email = 'brsk84@gmail.com')
--     AND af.visible = true
--     AND af.activo = true
--     AND (af.foto_url IS NULL OR BTRIM(af.foto_url) = '');

-- [1.2] interacciones tipo='foto' con texto (URL) vacio (UPDATE [2.2]):
-- SELECT i.id, i.destino_id, i.texto, i.activo, i.creado_en
--   FROM interacciones i
--   WHERE i.usuario_id = (SELECT id FROM usuarios WHERE email = 'brsk84@gmail.com')
--     AND i.tipo = 'foto'
--     AND i.activo = true
--     AND (i.texto IS NULL OR BTRIM(i.texto) = '');

-- [1.3] album_fotos cuyo album padre esta INACTIVO (SOLO REPORTE; el album
--       NO se reactiva automaticamente en este cleanup):
-- SELECT af.id, af.foto_url, a.id AS album_id, a.titulo, a.activo
--   FROM album_fotos af JOIN albumes a ON a.id = af.album_id
--   WHERE af.agregador_id = (SELECT id FROM usuarios WHERE email = 'brsk84@gmail.com')
--     AND a.activo = false;

-- [1.4] REPORTE CONSOLIDADO (solo lectura; se muestra al ejecutar el archivo).
SELECT 'album_fotos_url_vacia' AS grupo, COUNT(*)::int AS filas
  FROM album_fotos af
  WHERE af.agregador_id = (SELECT id FROM usuarios WHERE email = 'brsk84@gmail.com')
    AND af.visible = true
    AND af.activo = true
    AND (af.foto_url IS NULL OR BTRIM(af.foto_url) = '')
UNION ALL
SELECT 'interacciones_url_vacia', COUNT(*)::int
  FROM interacciones i
  WHERE i.usuario_id = (SELECT id FROM usuarios WHERE email = 'brsk84@gmail.com')
    AND i.tipo = 'foto'
    AND i.activo = true
    AND (i.texto IS NULL OR BTRIM(i.texto) = '')
UNION ALL
SELECT 'albumes_padre_inactivos', COUNT(*)::int
  FROM album_fotos af JOIN albumes a ON a.id = af.album_id
  WHERE af.agregador_id = (SELECT id FROM usuarios WHERE email = 'brsk84@gmail.com')
    AND a.activo = false;

-- ============================================================================
-- [2] REMEDIACION (idempotente; WHERE acotado por estado exacto)
-- ============================================================================

-- [2.1] album_fotos: visible=true + URL vacia -> dejar de publicar.
--       Se baja visible (deja de aparecer) y activo (soft-delete, Cero
--       Borrado Logico: la fila NO se elimina).
UPDATE album_fotos
   SET visible = false,
       activo  = false
 WHERE agregador_id = (SELECT id FROM usuarios WHERE email = 'brsk84@gmail.com')
   AND visible = true
   AND activo  = true
   AND (foto_url IS NULL OR BTRIM(foto_url) = '');

-- [2.2] interacciones tipo='foto': URL (texto) vacia -> soft-delete.
UPDATE interacciones
   SET activo = false
 WHERE usuario_id = (SELECT id FROM usuarios WHERE email = 'brsk84@gmail.com')
   AND tipo   = 'foto'
   AND activo = true
   AND (texto IS NULL OR BTRIM(texto) = '');

-- [2.3] album padre inactivo: NO HACER NADA automaticamente.
--       Decision explicita: un album con a.activo=false puede estarlo por
--       moderacion o decision del dueno; reactivarlo expondria contenido no
--       solicitado. Se reporta en [1.3] y [3.3] y se deja a decision manual.

-- ============================================================================
-- [3] VERIFICACION POSTERIOR (solo lectura; esperado 0 en [3.1] y [3.2]).
--     Correr el archivo COMPLETO una segunda vez: [3.1] y [3.2] siguen en 0
--     (idempotencia real, ADR-008).
-- ============================================================================
SELECT 'album_fotos_pendientes' AS grupo, COUNT(*)::int AS filas
  FROM album_fotos af
  WHERE af.agregador_id = (SELECT id FROM usuarios WHERE email = 'brsk84@gmail.com')
    AND af.visible = true
    AND af.activo = true
    AND (af.foto_url IS NULL OR BTRIM(af.foto_url) = '')
UNION ALL
SELECT 'interacciones_pendientes', COUNT(*)::int
  FROM interacciones i
  WHERE i.usuario_id = (SELECT id FROM usuarios WHERE email = 'brsk84@gmail.com')
    AND i.tipo = 'foto'
    AND i.activo = true
    AND (i.texto IS NULL OR BTRIM(i.texto) = '')
UNION ALL
SELECT 'albumes_padre_inactivos_restantes', COUNT(*)::int
  FROM album_fotos af JOIN albumes a ON a.id = af.album_id
  WHERE af.agregador_id = (SELECT id FROM usuarios WHERE email = 'brsk84@gmail.com')
    AND a.activo = false;
