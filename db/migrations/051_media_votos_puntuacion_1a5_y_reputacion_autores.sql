-- ============================================================================
-- 051_media_votos_puntuacion_1a5_y_reputacion_autores.sql
--
-- QUE HACE, EN UNA FRASE
--   Anade la calificacion de 1 a 5 estrellas a media_votos (historico = 3 =
--   neutro), crea el agregado de reputacion de autor media_rep_autores como
--   CONTADOR + SUMA (nunca un promedio) y la funcion STABLE media_estadisticas
--   como fuente UNICA del redondeo a 1 decimal.
--
-- ADR
--   ADR-089 (DECISIONS.md, seccion "## ADR-089"). Este fichero implementa D1,
--   D3 (regla documentada, no codigo), D4, D5 y el paso 1 de D6. NO ejecuta
--   nada de la escalada de D6 y NO ejecuta la auditoria de reconstruccion.
--
-- PREDECESORA
--   050_indice_parcial_sink_slots_activos.sql. scripts/apply_sql_file.js exige
--   que el numero N-1 exista en disco Y tenga fila valida en schema_migrations.
--   Este fichero es el 051, el siguiente libre (el 045 es el ledger).
--
-- CARACTER DE LA MIGRACION
--   Forward-only. Cero DELETE (ADR-003), cero TRUNCATE. Unica escritura de
--   datos: el backfill explicito de puntuacion a 3, que es idempotente y que
--   NO toca actualizado_en (ver M1 mas abajo). db/migrations/023 y 045 NO se
--   tocan: 023 es historia y 045 es el ledger.
--
-- RLS
--   SIN RLS, igual que media_votos (023:61-74, sin RLS) y por el mismo motivo:
--   el unico dato de media_rep_autores es un agregado numerico de reputacion,
--   que es publico por naturaleza (se muestra en perfiles). No hay RLS en
--   ninguna migracion salvo 034_mercado_emprmenopausal y esta no introduce una
--   excepcion al patron vigente.
--
-- ASCII (ADR-002)
--   Este fichero es ASCII puro: 0 bytes > 127. Sin BOM.
--
-- LEDGER
--   Esta migracion NO lleva sentencia propia de registro en schema_migrations:
--   la escribe el runner scripts/apply_sql_file.js, en su funcion registrar()
--   (linea 470), que ademas es el unico que escribe checksum y duracion_ms. El
--   runner decide entre INSERT y UPDATE leyendo hayFilaPrevia ANTES de
--   aplicar, luego una sentencia propia en el .sql colisionaria con 23505
--   sobre idx_schema_migrations_numero en la primera aplicacion.
--
-- ============================================================================

-- (1) PRECONDICIONES. Read-only: comprueba y aborta si algo NO se cumple. Es
--     el unico bloque que puede cortar la migracion, y aborta con un mensaje
--     que dice que hacer.
DO $mig051a$
DECLARE
  v_filas integer;
BEGIN
  IF to_regclass('public.media_votos') IS NULL THEN
    RAISE EXCEPTION
      '051: public.media_votos NO existe. Esta migracion solo anade una columna a la tabla que creo 023_interacciones_media_unificadas.sql. Se aborta en vez de continuar.';
  END IF;

  IF to_regclass('public.usuarios') IS NULL THEN
    RAISE EXCEPTION
      '051: public.usuarios NO existe, luego media_rep_autores no puede declarar su FK. Se aborta.';
  END IF;

  IF to_regclass('public.schema_migrations') IS NULL THEN
    RAISE EXCEPTION
      '051: public.schema_migrations NO existe. El ledger es la 045 y es el paso 3 del arranque (db/cleanups/005_seed_schema_migrations.js). Se aborta.';
  END IF;

  -- La nota fuera de rango solo puede venir de una escritura manual previa; si
  -- la hay, el CHECK de (2) la rechazaria y la migracion no podria seguir.
  SELECT count(*) INTO v_filas
    FROM information_schema.columns c
   WHERE c.table_schema = 'public'
     AND c.table_name  = 'media_votos'
     AND c.column_name = 'puntuacion';

  RAISE NOTICE 'migracion 051: precondiciones OK (media_votos existe; columna puntuacion presente=%)', (v_filas > 0);
END
$mig051a$;

-- (2) LA COLUMNA DE NOTA. Idempotente por ADD COLUMN IF NOT EXISTS:
--     reejecutar la migracion no falla por este bloque.
--
--     DEFAULT 3 hace el backfill implicito de las filas existentes y es la
--     decision D6: el historico entra como 3 = neutro, de modo que NO
--     distorsiona el promedio en ninguna direccion.
--
--     El CHECK se declara aqui y NO se toca mas adelante (ver el bloque de la
--     escalada en el punto (D2)).
ALTER TABLE public.media_votos
  ADD COLUMN IF NOT EXISTS puntuacion smallint NOT NULL DEFAULT 3
  CHECK (puntuacion BETWEEN 1 AND 5);

-- (3) BACKFILL EXPLICITO a 3, idempotente. El DEFAULT ya lo cubre, luego con
--     una tabla ya migrada esto afecta 0 filas; se escribe igual, por claridad
--     y porque el backfill IMPLICITO no es evidencia de nada.
--
--     IMPORTANTE: este UPDATE NO escribe actualizado_en a proposito. M1 (criterio
--     de escalada, ver (D2)) distingue las filas del backfill precisamente
--     porque conservan su timestamp original; tocarlo destruiria el criterio.
UPDATE public.media_votos
   SET puntuacion = 3
 WHERE puntuacion IS NULL;

-- (4) EL AGREGADO DE REPUTACION DE AUTOR.
--
--     Forma (ADR-089 D1), y las tres decisiones que importan:
--       (a) autor_id es la PK -> una fila por autor, lectura O(1) por indice
--           unico primario, y el upsert del backend es ON CONFLICT (autor_id).
--       (b) Se guardan CONTADORES y SUMA (enteros), NUNCA el promedio. Un voto
--           ANADE un entero, no re-escribe un promedio: por eso la reputacion
--           no obliga a reescribir una fila en cada votacion y por eso el
--           agregado es exactamente reconstruible. Un promedio almacenado
--           acumularia error de redondeo en cada operacion, y eso es precision
--           falsa.
--       (c) ON DELETE CASCADE a usuarios(id): borrar el usuario no deja
--           huerfanos.
--
--     formula de la reputacion (ADR-089 D2), que vive AQUI como comentario y
--     se evalua en la LECTURA, no se almacena:
--         peso de una nota = (nota - 3) / 2        -- rango [-1, +1]
--         reputation = CASE WHEN votos_recibidos = 0 THEN 0
--                            ELSE round(((suma_notas::numeric
--                                        - 3 * votos_recibidos)
--                                       / (2.0 * votos_recibidos)), 4)
--                       END
--     DIVERGENCIA CON LA LITERAL DEL ADR, DECLARADA Y RESUELTA (no escondida):
--     el bloque "Forma exacta" de ADR-089 D1 MENCIONA una columna
--     reputation numeric(8,4), mientras que D2 y este fichero van con
--     CONTADORES Y SUMA, SIN COLUMNA DE PROMEDIO.
--     ESTA TABLA NO TIENE reputation. Si el ADR se contradice a si mismo en ese
--     punto, MANDA LA REGLA (contadores + suma): guardar un promedio re-escrito
--     en cada voto es exactamente lo que D1 quiere evitar, y lo haria
--     inexacto por redondeo acumulado en vez de exacto e integrable.
--     CONSECUENCIA PARA EL BACKEND (@backend-dev, D3): el ON CONFLICT DO UPDATE
--     NO PUEDE mencionar reputation en su lista de columnas; suma SOLO
--     votos_recibidos y suma_notas con EXCLUDED. La reputation se EVALUA EN
--     LECTURA con la formula de arriba, no se escribe. Si se copia el snippet de
--     D3 tal cual, con reputation en la lista de columnas, falla por columna
--     inexistente.
--
--     Por que centrada en 3 y no nota/5 o (nota-1)/4: el historico entra como
--     3, luego centrar la escala en 3 hace que el historico aporte exactamente
--     0. Con otra escala, los likes historicos entrarian como 0.6 o como 0.5 y
--     arrastrarian la reputacion de todos los autores al alza, de forma
--     sistematica y silenciosa. La escala se centra en el valor que recibe el
--     historico, porque el historico es el unico dato cuya fiabilidad sabemos
--     que es nula.
--
--     El unico indice nuevo de toda la migracion es esta PK. NO se anade
--     ninguno mas (ADR-089 D4).
--
CREATE TABLE IF NOT EXISTS public.media_rep_autores (
  autor_id       uuid PRIMARY KEY REFERENCES public.usuarios(id) ON DELETE CASCADE,
  votos_recibidos integer NOT NULL DEFAULT 0 CHECK (votos_recibidos >= 0),
  suma_notas      integer NOT NULL DEFAULT 0,
  creado_en      timestamptz NOT NULL DEFAULT now(),
  actualizado_en timestamptz NOT NULL DEFAULT now()
);

-- (5) LA FUNCION DE ESTADISTICAS. Sustituye a las ~30 subconsultas COUNT(*)
--     de api/interacciones.js y es la fuente UNICA del redondeo a 1 decimal:
--     ningun otro sitio debe repetir el round.
--
--     STABLE, y NUNCA IMMUTABLE, y la razon no es de estilo: IMMUTABLE es una
--     promesa de que el resultado depende solo de los argumentos, y aqui es
--     FALSA porque la funcion lee una tabla. Declararla IMMUTABLE autoriza al
--     planificador a cachear y constante-foldar el resultado dentro de una misma
--     sentencia, de modo que un UPDATE posterior en esa misma sentencia
--     devolveria un valor obsoleto. STABLE promete exactamente lo que este caso
--     cumple: dentro de una misma sentencia devuelve siempre el mismo valor, y
--     por eso las ~30 lecturas de una misma respuesta son coherentes entre si.
--
--     search_path explicito (public, luego pg_temp): la funcion no depende del
--     search_path de la sesion que la llama, y no puede ser desviada a otro
--     esquema por un buscador manipulado. Es la unica funcion de este esquema,
--     luego fija el criterio para las siguientes.
--
--     promedio es NULL cuando votos = 0, no 0: avg sobre cero filas devuelve
--     NULL, y eso es lo correcto porque 0 no es una media. "Sin votos" y
--     "promedio cero" son hechos distintos que el render debe diferenciar.
CREATE OR REPLACE FUNCTION public.media_estadisticas(
  p_fuente varchar(20),
  p_item_id text
)
RETURNS TABLE (votos integer, promedio numeric(3,1))
LANGUAGE sql
STABLE
PARALLEL SAFE
SET search_path = public, pg_temp
AS $fn$
  SELECT count(*)::integer,
         round(avg(mv.puntuacion)::numeric, 1)
    FROM public.media_votos mv
   WHERE mv.fuente = p_fuente
     AND mv.item_id = p_item_id
     AND mv.activo = true
$fn$;

-- (D1) SOLO COMENTARIO -- LA REGLA DEL DELTA AL AUTOR, NO IMPLEMENTADA AQUI
--     (ADR-089 D3). NO es codigo de esquema: lo escribe el backend, en la MISMA
--     sentencia que el voto, con el patron CTE prev/voto/delta. Se deja escrita
--     porque es la parte del contrato que el esquema no puede imponer:
--
--       * IDEMPOTENCIA POR CONSTRUCCION. La nota anterior se lee del ESTADO de
--         la base (SELECT ... FOR UPDATE sobre media_votos) y de ningun
--         parametro del cliente. Repetir la misma peticion un numero arbitrario
--         de veces deja el sistema en el mismo estado.
--       * COALESCE(nota_previa, 3). Si no habia fila, el delta de suma_notas es
--         nueva - 3, no nueva - 0: el primer voto de un autor aporta
--         (nota - 3) / 2 y no nota / 5. Con 0 como anterior, un autor con un
--         unico voto de 5 empezaria con reputacion maximalista por el hecho de
--         ser el primero.
--       * REENVIAR LA MISMA NOTA N VECES DA DELTA 0: nueva - anterior = 0, luego
--         ni votos_recibidos ni suma_notas se mueven.
--       * FOR UPDATE serializa los reintentos concurrentes del mismo
--         (usuario, fuente, item): el segundo espera y lee el valor ya escrito.
--         Sin ese candado, dos peticiones simultaneas podrian cargar el delta
--         dos veces desde el mismo valor viejo.
--       * activo = false NO toca el agregado. unlike desaparece del contrato y
--         el auto-voto sigue bloqueado, luego la rama es practicamente
--         inalcanzable por la API. El sesgo teorico al alza que dejaria se
--         acepta declarado (deuda (b) de ADR-089) y se auditoria el dia que
--         exista el PRIMER activo = false real, o cuando votos_recibidos se
--         desvie de count(*) en mas de un 2%.
--       * En ON CONFLICT DO UPDATE se acumulan contadores con EXCLUDED (votos_recibidos
--         y suma_notas; NO reputation, ver la divergencia declarada en (4)), y
--         xp_ganado solo se escribe en el alta (xmax = 0), luego reenviar no
--         puede abrir el canal de XP.

-- (D2) SOLO COMENTARIO -- CRITERIO DE ESCALADA A NULL, NO SE EJECUTA (ADR-089
--     D6). La migracion NO escala puntuacion a NULL. Cuando se cumpla CUALQUIERA de
--     estos dos umbrales, asimetricos y ambos necesarias:
--
--       M1 (maximo de contaminacion): las filas de media_votos procedentes del
--           backfill bajan del 20% del total. Se distinguen porque el backfill
--           NO escribio actualizado_en (ver (3)).
--       M2 (minimo de senal): la mediana de votos nuevos por item supera 10.
--       M1 solo puede dispararse en items con pocos votos y M2 solo antes de que
--       haya trafico real; uno solo seria un falso positivo en una de las dos
--       direcciones.
--
--     La escalada serian DOS pasos, no una tabla nueva:
--       Paso 1: ALTER TABLE public.media_votos
--               ALTER COLUMN puntuacion DROP NOT NULL;
--               mas un UPDATE que ponga NULL en las filas del backfill.
--       Paso 2: avg(mv.puntuacion) FILTER (WHERE mv.puntuacion IS NOT NULL)
--               dentro de media_estadisticas.
--
--     EL CHECK NO HAY QUE TOCARLO, y esto es lo que hace barato el paso 1: en
--     SQL un CHECK solo se viola si la expresion evalua a FALSE; si evalua a
--     NULL, la fila PASA. Luego CHECK (puntuacion BETWEEN 1 AND 5) ya admite
--     NULL sin ninguna modificacion.
--
--     RIESGO ACEPTADO Y CUANTIFICADO: con h votos historicos y n nuevos, el
--     maximo desplazamiento que pueden producir sobre el promedio es
--     2n / (h+n) estrellas. Con h = 100 y n = 5 el promedio NO puede moverse
--     mas de 0.09 estrellas, o sea la senal nueva es casi invisible. Por eso el
--     historico entra con peso total y valor exactamente neutro, y por eso los
--     umbrales estan escritos antes de que duela.

-- (D3) SOLO COMENTARIO -- VERIFICACION PENDIENTE OBLIGATORIA ANTES DE DAR POR
--     BUENA CUALQUIER MODIFICACION FUTURA DEL DELTA (deuda (a) de ADR-089,
--     TSK ABIERTO).
--
--     La invariante de reconstruccion NO se verifica en esta entrega, y no es
--     que se declines: NO PUEDE ejecutarse aqui, porque media_votos no tiene
--     autor_id (el autor sale de resolverMediaItem, que es JS de backend) y
--     anadirlo crearia una segunda fuente de verdad del autor, descartada por
--     el mismo criterio que hace que el agregado no reutilice usuarios.
--
--     Cuando se escriba el recorrido que resuelve el autor, el criterio de
--     aceptacion es EXIGENTE y es este:
--
--       reconstruir media_rep_autores desde cero con un GROUP BY sobre las
--       votaciones VIVAS y compararlo contra el agregado incremental, y exigir
--       0 filas de diferencia en (autor_id, votos_recibidos, suma_notas). Si el
--       resultado no es 0 filas, la entrega NO se cierra.
--
--     Propietarios: @sql-security (criterio) + @backend-dev (recorrido).
--     ESTA MIGRACION NO LO EJECUTA Y NO LO DEBE EJECUTAR.

-- ============================================================================
-- FIN 051
-- ============================================================================
