-- ============================================================================
-- 052_backfill_media_rep_autores_resolver_media_item.sql
--
-- ############################################################################
-- # ESTADO: VERIFICADA, NO NECESARIA. NO APLICADA AL LEDGER. NO APLICAR.
-- ############################################################################
--
-- DECISION DEL OPERADOR (2026-10-06): esta migracion se CIERRA como
-- verificada-no-necesaria. NO se aplica a Neon. No se borra.
--
-- LO QUE YA OCURRIO, EN ORDEN
--   1. La 051 (media_votos.puntuacion + media_rep_autores) SI se aplico y SI
--      esta registrada en schema_migrations.
--   2. El backfill del agregado se EJECUTO YA en Neon por esta misma
--      sentencia (el bloque (2) de mas abajo), a mano, el 2026-10-05:
--      2 filas (autores bc940e34 y 3b78efad).
--   3. La invariante de reconstruccion quedo en 0 filas de diferencia con el
--      criterio canonico, y la reputacion en lectura sale 0.0 exacta.
--
-- POR QUE NO SE APLICA AL LEDGER
--   Re-ejecutarla seria IDEMPOTENTE (ver "IDEMPOTENCIA" mas abajo: el ON
--   CONFLICT reescribe los valores completos desde cero, luego dos corridas
--   dan el mismo (votos_recibidos, suma_notas) y lo unico que cambia es
--   actualizado_en, que es un reloj y no un dato). Pero es INNECESARIA: el
--   resultado que produce ya esta en la base, luego aplicarla solo anadiria
--   una fila al ledger con un numero que no representa ningun cambio de
--   esquema. El ledger registra migraciones de esquema; esta es una
--   reconstruccion de datos ya ejecutada.
--
-- ESTADO EN schema_migrations
--   numero = 52 -> 0 filas. ESTO ES CORRECTO Y ESPERADO: si aparece una fila
--   con numero 52, significa que alguien aplico esta migracion sin la
--   decision del operador, y hay que reportarlo antes de seguir.
--
-- VALOR DE ESTE FICHERO
--   DOCUMENTAL, y es el motivo de no borrarlo: es la forma ejecutable del
--   criterio canonico de autor que fija ADR-089 (seccion "Criterio canonico de
--   la invariante de reconstruccion"), y el bloque de verificacion (c) es la
--   consulta que cualquiera puede correr en el editor de Neon para auditar el
--   agregado sin volver a escribirlo. Perderlo dejaria el criterio escrito
--   solo en prosa, que es justo lo que ADR-084 D1 prohibe.
--
-- SI ALGUIEN NECESITA RE-EJECUTARLA
--   Es seguro y no requiere decision: correr el bloque (2) a mano. NO usar
--   scripts/apply_sql_file.js, porque ese es el unico que escribe en el
--   ledger y registraria el numero 52.
--
-- ############################################################################
--
-- QUE HACE, EN UNA FRASE
--   Backfill del agregado de reputacion de autor media_rep_autores
--   (contador + suma, nunca promedio) REconstruyendolo desde las votaciones
--   vivas con la MISMA resolucion de autor que aplica el backend en
--   resolverMediaItem, de modo que el backfill sea REPRODUCIBLE y la
--   invariante de reconstruccion de ADR-089 D3 sea MEDIBLE.
--
-- POR QUE ESTA EN UNA MIGRACION Y NO EN db/cleanups/
--   Precedente verificado: db/migrations/023:196-215, 023:259-274, 025:76,
--   035, 037 y 038 meten su backfill DENTRO del .sql numerado, y los
--   cleanups de db/cleanups/ son de una sola vez y NO idempotentes (001-003).
--   Un backfill que se ejecuta una vez y debe ser re-ejecutable pertenece a la
--   cadena numerada, que es lo que la deja en la traza.
--
-- ADR
--   ADR-089 (DECISIONS.md, seccion "## ADR-089"), deuda (a) y D3.
--   ESTA MIGRACION NO ES LA AUDITORIA DE D3: es el BACKFILL que la hace
--   posible, y no declara la invariante cerrada (ver TASKS.md, TSK-193).
--
-- PREDECESORA
--   051_media_votos_puntuacion_1a5_y_reputacion_autores.sql, que es quien crea
--   la columna puntuacion y la tabla media_rep_autores.
--   scripts/apply_sql_file.js exige que el numero N-1 exista en disco Y tenga
--   fila valida en schema_migrations. Este fichero es el 052, el siguiente
--   libre. NO se aplica en produccion sin peticion explicita del operador.
--
-- CRITERIO CANONICO DE AUTOR (FIXADO, ver "Verificacion" mas abajo)
--   El criterio de reconstruccion es EXACTAMENTE el de resolverMediaItem
--   (api/interacciones.js:5351-5399), y NO el de media_duenos
--   (api/interacciones.js:885). Los dos se parecen y no son lo mismo:
--
--     fuente        | resolverMediaItem (CANONICO)          | media_duenos (NO sirve)
--     --------------+-------------------------------------+---------------------------
--     album_foto    | album_fotos.autor_original_id         | COALESCE(autor_original_id,
--                   | A SECAS, sin COALESCE                 |   agregador_id)
--     viajero_foto  | interacciones.usuario_id              | (cruzado con destinos_fotos)
--                   | WHERE tipo='foto' AND activo=true      |
--                   | AND NOT (dims ? 'voto_foto_id')        |
--     curada        | NULL A PROPOSITO (base(null, ...))     | no aparece
--
--   El COALESCE de media_duenos cuenta "dueno de la foto en el destino", que
--   es un hecho DISTINTO del autor. Medido: con COALESCE, bc940e34 suma 33
--   votos; con autor_original_id a secas, 29. Solo la segunda cifra coincide
--   con lo que el backend ESCRIBE, luego medir la invariante con el COALESCE
--   daria falsos positivos de forma permanente.
--
--   Los filtros de actividad son los del resolutor y no un extra: si
--   album_fotos.activo, albumes.activo o interacciones.activo fuera false,
--   resolverMediaItem devuelve {ok:false} y el backend NO escribiria delta.
--   Reconstruir con filtros mas laxos contaria votos que el backend jamas
--   contaria, y de nuevo: falso positivo.
--
-- CARACTER
--   Forward-only. Cero DELETE, cero TRUNCATE, cero ALTER TABLE. La unica
--   escritura es el upsert del agregado. No crea objetos: no hay DDL.
--
-- IDEMPOTENCIA
--   ON CONFLICT (autor_id) DO UPDATE con valores recalculados desde cero en
--   cada corrida (GROUP BY sobre el conjunto vivo completo), nunca
--   incrementales. Correrla N veces deja votos_recibidos y suma_notas
--   IDENTICOS; lo unico que cambia es actualizado_en, que es un reloj y no un
--   dato. Reconstruye, no acumula: por eso el segundo paso da el mismo numero
--   que el primero.
--
-- LO QUE ESTA MIGRACION NO HACE, Y POR QUE (declarado, no escondido)
--   Solo se escriben autores que resuelven a alguien. Un autor cuya fila exista en
--   media_rep_autores y cuyos votos ya NO resuelven (foto desactivada) NO se
--   pone a cero aqui: ponerlo a cero exigiria una fuente de verdad sobre si
--   "no resuelven" o "se perdio el item", y el riesgo de poner a cero un
--   contador legitimo es mayor que el de dejar el valor viejo. Ese caso lo
--   detecta la auditoria de D3 (TASKS.md, TSK-193) como fila de diferencia,
--   que es donde debe verse, no aqui.
--
-- ASCII (ADR-002)
--   ASCII puro: 0 bytes > 127, sin tildes, sin backticks, sin emojis, sin BOM.
--
-- LEDGER
--   Sin sentencia propia de registro en schema_migrations: la escribe
--   scripts/apply_sql_file.js en registrar(), que es el unico que escribe
--   checksum y duracion_ms. Ver 051:36-42.
--
-- ============================================================================

-- (1) PRECONDICIONES. Read-only: comprueba y aborta si algo NO se cumple.
DO $mig052a$
DECLARE
  v_filas integer;
BEGIN
  IF to_regclass('public.media_rep_autores') IS NULL THEN
    RAISE EXCEPTION
      '052: public.media_rep_autores NO existe. La crea 051_media_votos_puntuacion_1a5_y_reputacion_autores.sql. Se aborta en vez de continuar.';
  END IF;

  IF to_regclass('public.media_votos') IS NULL THEN
    RAISE EXCEPTION
      '052: public.media_votos NO existe (la creo 023). Se aborta.';
  END IF;

  SELECT count(*) INTO v_filas
    FROM information_schema.columns c
   WHERE c.table_schema = 'public'
     AND c.table_name  = 'media_votos'
     AND c.column_name = 'puntuacion';

  IF v_filas = 0 THEN
    RAISE EXCEPTION
      '052: public.media_votos.puntuacion NO existe. La anade 051. Se aborta.';
  END IF;

  RAISE NOTICE 'migracion 052: precondiciones OK (media_rep_autores y media_votos.puntuacion presentes)';
END
$mig052a$;

-- (2) EL BACKFILL / RECONSTRUCCION DEL AGREGADO.
--
--     Una sola sentencia, dos ramas, porque son las dos unicas fuentes que
--     DEVUELVEN autor. curada esta AUSENTE A PROPOSITO y no es un olvido:
--     destinos_fotos cuelga de un destino y un destino no es un usuario, luego
--     esos votos no tienen autor y no pueden sumar reputation. Dejarlos fuera
--     es lo que hace que la reconstruccion sea igual al delta que escribe el
--     backend.
--
--     recuento y suma se calculan del conjunto vivo (mv.activo = true) con los
--     filtros del resolutor, y se escriben con EXCLUDED: cada corrida REESCRIBE
--     el valor completo del autor, luego dos corridas dan el mismo par
--     (votos_recibidos, suma_notas).
INSERT INTO public.media_rep_autores (autor_id, votos_recibidos, suma_notas)
SELECT r.autor_id,
       count(*)::integer,
       sum(r.puntuacion)::integer
  FROM (
        -- album_foto -> autor_original_id A SECAS. El COALESCE con
        -- agregador_id de media_duenos (:885) queda EXCLUIDO a proposito.
        SELECT af.autor_original_id AS autor_id,
               mv.puntuacion
          FROM public.media_votos mv
          JOIN public.album_fotos af ON af.id::text = mv.item_id
          JOIN public.albumes a     ON a.id = af.album_id
         WHERE mv.fuente = 'album_foto'
           AND mv.activo = true
           AND af.activo = true
           AND a.activo = true
           AND af.autor_original_id IS NOT NULL
        UNION ALL
        -- viajero_foto -> el usuario_id de la interaccion de tipo foto. Se
        -- excluyen las que tienen voto_foto_id: esas son el OTRO lado del
        -- enlace de 023:259-274 y ya viven con fuente album_foto.
        SELECT i.usuario_id AS autor_id,
               mv.puntuacion
          FROM public.media_votos mv
          JOIN public.interacciones i ON i.id::text = mv.item_id
         WHERE mv.fuente = 'viajero_foto'
           AND mv.activo = true
           AND i.tipo = 'foto'
           AND i.activo = true
           AND (i.dims IS NULL OR NOT (i.dims ? 'voto_foto_id'))
           AND i.usuario_id IS NOT NULL
       ) r
 WHERE r.autor_id IS NOT NULL
 GROUP BY r.autor_id
ON CONFLICT (autor_id) DO UPDATE
   SET votos_recibidos = EXCLUDED.votos_recibidos,
       suma_notas      = EXCLUDED.suma_notas,
       actualizado_en = now();

-- (3) LO QUE ESTA SENTENCIA NO ES: una cuenta atrasada.
--
--     El backend escribe el delta en la MISMA sentencia que el voto con el
--     patron CTE prev/voto/delta (ADR-089 D3). Si el backend ya escribio
--     deltas desde la 051, este bloque RECONSTRUYE el agregado y produce el
--     mismo valor: es la correccion de una divergencia posible, no una suma
--     adicional. Si los dos mecanismos estan de acuerdo, esta sentencia no
--     cambia ni un solo contador.

-- ============================================================================
-- VERIFICACION (solo lectura; NO se ejecuta dentro de la migracion).
-- Copiar y correr en el editor de Neon, UNA SENTENCIA POR BLOQUE.
-- ============================================================================
--
-- (a) LO QUE INSERTO ESTA MIGRACION. Debe devolver las mismas filas que el
--     backfill del 2026-10-05: 2 autores. Si devuelve mas autores, el
--     criterio de autor se ha movido y hay que parar.
-- SELECT r.autor_id, count(*)::int AS votos, sum(r.puntuacion)::int AS suma
--   FROM (
--         SELECT af.autor_original_id AS autor_id, mv.puntuacion
--           FROM public.media_votos mv
--           JOIN public.album_fotos af ON af.id::text = mv.item_id
--           JOIN public.albumes a     ON a.id = af.album_id
--          WHERE mv.fuente = 'album_foto' AND mv.activo
--            AND af.activo AND a.activo AND af.autor_original_id IS NOT NULL
--         UNION ALL
--         SELECT i.usuario_id, mv.puntuacion
--           FROM public.media_votos mv
--           JOIN public.interacciones i ON i.id::text = mv.item_id
--          WHERE mv.fuente = 'viajero_foto' AND mv.activo
--            AND i.tipo = 'foto' AND i.activo
--            AND (i.dims IS NULL OR NOT (i.dims ? 'voto_foto_id'))
--            AND i.usuario_id IS NOT NULL
--       ) r
--  WHERE r.autor_id IS NOT NULL
--  GROUP BY r.autor_id ORDER BY 2 DESC;
--
-- (b) IDEMPOTENCIA REAL. Anotar el par de la 1a corrida, correr el archivo
--     COMPLETO otra vez y comparar: (votos_recibidos, suma_notas) debe ser
--     IDENTICO. actualizado_en SI cambia (es now()), y eso es lo unico que
--     puede cambiar.
-- SELECT autor_id, votos_recibidos, suma_notas, actualizado_en
--   FROM public.media_rep_autores ORDER BY votos_recibidos DESC;
--
-- (c) LA INVARIANTE DE RECONSTRUCCION (ADR-089 D3). Debe devolver 0 filas.
--     ESTA consulta es la forma ejecutable del criterio canonico: usa
--     autor_original_id A SECAS, que es lo que dice resolverMediaItem.
--     Con el COALESCE de media_duenos daria filas de diferencia aunque el
--     agregado fuese correcto; no se usa COALESCE aqui por eso.
-- WITH r AS (
--   SELECT af.autor_original_id AS autor_id, mv.puntuacion
--     FROM public.media_votos mv
--     JOIN public.album_fotos af ON af.id::text = mv.item_id
--     JOIN public.albumes a     ON a.id = af.album_id
--    WHERE mv.fuente = 'album_foto' AND mv.activo
--      AND af.activo AND a.activo AND af.autor_original_id IS NOT NULL
--   UNION ALL
--   SELECT i.usuario_id, mv.puntuacion
--     FROM public.media_votos mv
--     JOIN public.interacciones i ON i.id::text = mv.item_id
--    WHERE mv.fuente = 'viajero_foto' AND mv.activo
--      AND i.tipo = 'foto' AND i.activo
--      AND (i.dims IS NULL OR NOT (i.dims ? 'voto_foto_id'))
--      AND i.usuario_id IS NOT NULL
-- ), espera AS (
--   SELECT autor_id, count(*)::int AS v, sum(puntuacion)::int AS s
--     FROM r WHERE autor_id IS NOT NULL GROUP BY autor_id
-- )
-- SELECT coalesce(e.autor_id, h.autor_id) AS autor_id,
--        e.v AS votos_esperados, h.votos_recibidos AS votos_en_tabla,
--        e.s AS suma_esperada, h.suma_notas AS suma_en_tabla
--   FROM espera e FULL OUTER JOIN public.media_rep_autores h USING (autor_id)
--  WHERE h.autor_id IS NULL
--     OR h.votos_recibidos IS DISTINCT FROM e.v
--     OR h.suma_notas      IS DISTINCT FROM e.s;
--
-- (d) LA REPUTACION EN LECTURA, que es la formula de 051 (4) evaluada, NO
--     almacenada. Con historico neutro (3) el resultado esperado es 0.0
--     EXACTO en ambos autores. Si sale distinto de 0.0, hay votos con nota
--     distinta de 3 y el agregado ya no es solo historico.
-- SELECT autor_id, votos_recibidos, suma_notas,
--        CASE WHEN votos_recibidos = 0 THEN 0
--             ELSE round(((suma_notas::numeric - 3 * votos_recibidos)
--                         / (2.0 * votos_recibidos)), 4)
--        END AS reputation
--   FROM public.media_rep_autores ORDER BY 2 DESC;
--
-- (e) CONTRASTE DEL CRITERIO, para dejar el numero escrito. Da la cuenta de
--     autor_original_id a secas y la de COALESCE(..., agregador_id): si
--     difieren, la segunda es la que produce falsos positivos y NO debe usarse
--     como invariante.
-- SELECT af.autor_original_id,
--        count(*) FILTER (WHERE af.agregador_id IS NOT NULL) AS con_agregador,
--        count(*) FILTER (WHERE af.agregador_id IS NULL)     AS solo_autor
--   FROM public.media_votos mv
--   JOIN public.album_fotos af ON af.id::text = mv.item_id
--  WHERE mv.fuente = 'album_foto' AND mv.activo AND af.activo
--    AND af.autor_original_id = 'bc940e34'
--  GROUP BY af.autor_original_id;
--
-- (f) LAS VOTACIONES SIN AUTOR RESOLUBLE. Son las que curada aporta por
--     definicion. No son un error y NO se deben forzar a un autor.
-- SELECT fuente, count(*) AS votos_sin_autor
--   FROM public.media_votos mv
--  WHERE mv.activo
--    AND mv.fuente = 'curada'
--  GROUP BY fuente;

-- ============================================================================
-- FIN 052
-- ============================================================================