-- ============================================================================
-- Cleanup 003: Publicar la media que quedo oculta con el default de la 025
--             para el usuario gonzalezjavierbta@gmail.com.
-- Fecha: 2026-09-19
-- Autor: sql-security
-- Trazabilidad: ADR-002 (ASCII-safe), ADR-008 (SQL de datos versionado e
--   idempotente), ADR-039 (album_fotos.visible, migracion 025) y Cero Borrado
--   Logico (Regla de Oro 3, ADR-003): NO se borra ni se reemplaza ninguna fila;
--   solo se pone visible=true en filas que ya estan activo=true.
-- Requiere: migracion 025 (album_fotos.visible) aplicada en Neon.
--
-- CONTEXTO REAL (causa raiz)
--   1) La migracion 025 agrega album_fotos.visible boolean NOT NULL DEFAULT
--      false y su backfill solo publica lo que existia ANTES de la 025. Todo
--      recurso creado despues nace privado (visible=false) salvo que el
--      backend lo marque publico al insertarlo.
--   2) Los videos subidos por gonzalezjavierbta@gmail.com quedaron con
--      activo=true AND visible=false por ese default.
--   3) La capa publica del mapa cultural (api/interacciones.js, rama
--      tipo=multimedia_mapa) filtra a.activo=true AND af.activo=true AND
--      af.visible=true; por eso esas filas NO aparecen. Lo mismo aplica a
--      mis_fotos, museo_publico, mi_feed_fotos, fotos_top, album_detalle y
--      galeria_destino (ADR-039, decision b).
--   4) El indice unico idx_album_fotos_dedup
--      (album_id, foto_url, autor_original_id) de la migracion 009 sigue
--      ocupado por esas filas ocultas, de modo que un reintento de subida con
--      la MISMA clave choca con 23505 (409 "Registro duplicado"). Nota
--      Postgres: en un indice unico los NULL son distintos, por lo que una
--      fila con autor_original_id IS NULL no bloquea un reintento con NULL.
--
-- QUE HACE
--   BLOQUE A: diagnostico (solo lectura) de las filas activo=true y
--             visible=false del usuario, agrupadas por foto_type.
--   BLOQUE B: remediacion (UPDATE) que publica esas filas: visible=true
--             acotado EXCLUSIVAMENTE al usuario por email.
--   BLOQUE C: verificacion post-update (solo lectura) que debe devolver 0
--             filas para ese usuario.
--
-- ADVERTENCIA: RESPALDO PREVIO OBLIGATORIO
--   Antes de ejecutar el UPDATE, en el editor SQL de Neon correr y guardar el
--   resultado del bloque [A.0] RESPALDO. Un UPDATE de datos es irreversible
--   sin ese respaldo.
--
-- IDEMPOTENTE (ADR-008)
--   El UPDATE usa WHERE activo = true AND visible = false. Tras la primera
--   corrida esas filas pasan a visible=true; una segunda corrida completa
--   matchea 0 filas (no-op real) y los bloques de verificacion siguen en 0.
--   Re-ejecutar el archivo COMPLETO N veces es seguro.
--   IDEMPOTENCIA ADICIONAL: el WHERE nunca toca filas activo=false (soft-delete
--   del dueno o moderacion) ni filas visible=true: no se reactiva nada que
--   alguien haya ocultado a proposito con accion=editar (visible=false).
--
-- ASCII-SAFE (ADR-002 / BUG-026): cero bytes > 127, sin tildes, sin ene,
--   sin backticks, sin emojis. El email va literal en cada statement; para
--   reutilizar con otro usuario, reemplazar TODAS las ocurrencias.
-- ============================================================================

-- ============================================================================
-- [A] DIAGNOSTICO PREVIO (solo lectura; ejecutar y revisar ANTES del UPDATE)
-- ============================================================================
-- Copiar y correr sentencia por sentencia. Esperado: [A.1] listan las filas
-- que se van a publicar; [A.2] da el conteo por foto_type.

-- [A.0] RESPALDO PREVIO (obligatorio; guardar el resultado en un archivo):
-- SELECT af.*
--   FROM album_fotos af
--   WHERE af.agregador_id = (SELECT id FROM usuarios WHERE email = 'gonzalezjavierbta@gmail.com');

-- [A.1] Filas ocultas activas del usuario (candidatas al UPDATE [B.1]):
-- SELECT af.id, af.foto_type, af.media_title, af.foto_url,
--        af.album_id, a.titulo AS album_titulo, af.creado_en
--   FROM album_fotos af JOIN albumes a ON a.id = af.album_id
--   WHERE af.agregador_id = (SELECT id FROM usuarios WHERE email = 'gonzalezjavierbta@gmail.com')
--     AND af.activo = true
--     AND af.visible = false
--   ORDER BY af.creado_en DESC;

-- [A.2] REPORTE CONSOLIDADO por foto_type (solo lectura; se muestra al
--       ejecutar el archivo). Esperado: la cantidad real de media oculta del
--       usuario, desglosada en foto/video/audio.
SELECT COALESCE(NULLIF(BTRIM(af.foto_type), ''), '(sin_tipo)') AS foto_type,
       COUNT(*)::int AS filas_ocultas
  FROM album_fotos af
  WHERE af.agregador_id = (SELECT id FROM usuarios WHERE email = 'gonzalezjavierbta@gmail.com')
    AND af.activo = true
    AND af.visible = false
  GROUP BY 1
  ORDER BY 2 DESC, 1 ASC;

-- ============================================================================
-- [B] REMEDIACION (idempotente; WHERE acotado por estado exacto y por email)
-- ============================================================================

-- [B.1] Publicar la media oculta del usuario: visible=true.
--       NO se toca activo (ya es true por el WHERE) y NO se borra nada.
--       NO se otorga XP: es republicacion de contenido existente.
UPDATE album_fotos
   SET visible = true
 WHERE agregador_id = (SELECT id FROM usuarios WHERE email = 'gonzalezjavierbta@gmail.com')
   AND activo = true
   AND visible = false;

-- [B.2] VARIANTE GLOBAL (COMENTADA; publicar lo mismo para TODOS los usuarios
--       afectados por el default de la 025). Usar SOLO bajo decision explicita
--       del orquestador.
--
-- UPDATE album_fotos
--    SET visible = true
--  WHERE activo = true
--    AND visible = false;
--
-- ADVERTENCIA de la variante global: publicaria TAMBIEN lo que un dueno oculto
-- a proposito con accion=editar (visible=false explicito post-v22, ver el
-- comentario de la migracion 025 L156-163) o lo que nacio privado por diseno
-- (ADR-039, decision b: privado por defecto). Esa visibilidad es un dato de
-- intencion del usuario y NO se puede distinguir del default de la 025 solo
-- con SQL. Por eso la remediacion por defecto queda acotada por email.

-- ============================================================================
-- [C] VERIFICACION POSTERIOR (solo lectura; esperado 0 filas tras el UPDATE).
--     Correr el archivo COMPLETO una segunda vez: sigue en 0 (idempotencia
--     real, ADR-008). Si NO es 0, revisar si otra rama del backend sigue
--     insertando recursos con visible=false (museo_recurso) o si hay filas
--     que el dueno oculto a proposito (comportamiento correcto).
-- ============================================================================
SELECT COALESCE(NULLIF(BTRIM(af.foto_type), ''), '(sin_tipo)') AS foto_type,
       COUNT(*)::int AS filas_ocultas_restantes
  FROM album_fotos af
  WHERE af.agregador_id = (SELECT id FROM usuarios WHERE email = 'gonzalezjavierbta@gmail.com')
    AND af.activo = true
    AND af.visible = false
  GROUP BY 1
  ORDER BY 2 DESC, 1 ASC;

-- [C.2] Conteo total de pendientes del usuario (esperado 0 tras [B.1]):
SELECT COUNT(*)::int AS total_ocultas_restantes
  FROM album_fotos af
  WHERE af.agregador_id = (SELECT id FROM usuarios WHERE email = 'gonzalezjavierbta@gmail.com')
    AND af.activo = true
    AND af.visible = false;
