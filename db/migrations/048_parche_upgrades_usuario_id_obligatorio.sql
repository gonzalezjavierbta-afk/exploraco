-- ============================================================================
-- Migration 048: parche_upgrades.usuario_id OBLIGATORIO (cierre en prevention)
-- Fecha: 2026-10-05
-- Estado en disco: REDACTADA Y SIN APLICAR. NO APLICAR TODAVIA.
-- Referencias: ADR-002 (ASCII-safe), ADR-003 (Cero Borrado Logico, cero
--   DELETE), ADR-006 (el baseline es el esquema REAL medido antes de
--   escribir), ADR-008 (gobernanza e idempotencia de esquema), ADR-086
--   (migraciones FORWARD-ONLY).
-- Predecesora: 047_parche_upgrades_usuario_inversor.sql (aplicada).
-- ============================================================================
--
-- ============================================================================
-- AVISO DE ORDEN -- LEER ANTES DE APLICAR. NO ES OPCIONAL.
-- ============================================================================
--
--   NO APLICAR HASTA QUE EL INSERT DE api/interacciones.js PASE usuario_id:
--   hoy ese INSERT no escribe esa columna y esta 048 rechazaria TODAS las
--   compras de parche con violacion de CHECK.
--
--   Detalle medido (2026-10-05): la rama de escritura es
--   api/interacciones.js:13488, accion parche_upgrade_invertir. Su lista de
--   columnas es parche_id, ciudad_slug, tipo_upgrade, puntos_invertidos,
--   activo_hasta, creado_en. puiUid ($1) se usa SOLO para el CTE que resuelve
--   los miembros de la pandilla; NO se escribe en la fila de parche_upgrades.
--   Es decir: el inversor ya esta en scope en el backend, todavia no se
--   persiste.
--
--   POR QUE ESTA SEPARADA Y POR QUE AHORA: la 047 declaro usuario_id NULLABLE
--   A PROPOSITO, precisamente para que el orden migracion -> codigo fuera
--   seguro y las dos partes independientes. Si la 048 se aplicara antes del
--   cambio de api/, se invierte esa proteccion y el resultado no es un error
--   de despliegue: es la caida de la compra de parches en produccion, con
--   23514 check_violation en CADA intento.
--
--   PUERTA DE APLICACION (las DOS deben cumplirse):
--     1. El cambio de api/interacciones.js que anade usuario_id a la lista de
--        columnas del INSERT esta DESPLEGADO EN PRODUCCION.
--     2. scripts/verificar_parche_upgrades_huerfanos.js termina en exit 0
--        (hoy: exit 0, ver MEDICIONES).
--   Con la 1 sin cumplir, esta migracion NO es aplicable: es un sabotage.
--
-- ============================================================================
-- POR QUE EXISTE LA 048 Y QUE PREVIENE
-- ============================================================================
--
--   La 047 creo la columna usuario_id y la dejo nullable. Con ella nullable,
--   el estado "inversion NO atribuida" es un estado PERMITIDO y por tanto
--   alcanzable en produccion en cualquier momento, sin que nada avise.
--   Consecuencia medida en el motor de fama: la fila huerfana NO entra en el
--   termino de fama de ningun inversor (la regla de lectura de NULL de la
--   047), luego el efecto es SILENCIOSO. Una compra pagada que no suma fama a
--   nadie parece una compra correcta en la UI y es una perdida economica real.
--   Esa es la prevention: hacer que el estado huerfano sea IMPOSIBLE de
--   escribir, y que el fallo ocurra en el INSERT -- con error y traza -- en
--   vez de aparecer semanas despues como una discrepancia de saldos.
--
--   La 048 no arregla un bug de calculo: cierra la puerta que permitiria
--   reintroducirlo.
--
-- ============================================================================
-- POR QUE 047 NULLABLE Y 048 OBLIGATORIA NO SON UNA CONTRADICCION
-- ============================================================================
--
--   Son DOS PASOS de una misma cadence, no dos opiniones:
--     - 047 = el esquema acepta el dato. La columna existe y se puede leer.
--     - 048 = el esquema exige el dato. Nadie puede volver a escribir sin el.
--   El estado intermedio (columna nullable) no es un descuido: es la ventana
--   que permite desplegar el esquema y el codigo como dos hechos
--   independientes, sin ventana cero. El orden correcto es
--   047 -> codigo de api/ en produccion -> 048, y esta cabecera fija el
--   primer paso de esa secuencia. Lo que la 047 pidio es exactamente lo que
--   la 048 cierra, y por eso la 048 esta escrita y NO esta aplicada.
--
-- ============================================================================
-- MEDICIONES QUE SUSTENTAN ESTE FICHERO (Neon, 2026-10-05, SOLO LECTURA)
-- ============================================================================
--
--   Via node scripts/neon_select.js ($env:NEON_QUERY). Ninguna escritura.
--
--   (a) count(*) FROM public.parche_upgrades                = 0
--       count(*) ... WHERE usuario_id IS NULL               = 0
--       -> 0 filas, 0 huerfanas. La precondicion se cumple HOY.
--   (b) scripts/verificar_parche_upgrades_huerfanos.js        = exit 0
--       ("OK - 0 de 0 fila(s) ... tienen usuario_id IS NULL"), y reporta
--       columna usuario_id existe: si. La 047 esta viva.
--   (c) max(numero) FROM schema_migrations WHERE resultado = 'aplicada' = 47
--       -> la 047 es la ultima aplicada; 048 es el numero siguiente libre.
--       En disco, db/migrations/ va de 003 a 047 sin huecos y NO existia
--       ninguna 048 antes de este fichero.
--   (d) Las 5 constraints MEDIDAS de public.parche_upgrades, todas con
--       convalidated = true:
--         - parche_upgrades_pkey                     PRIMARY KEY (id)
--         - parche_upgrades_parche_id_fkey           FOREIGN KEY (parche_id)
--                                                       REFERENCES pandillas(id)
--         - parche_upgrades_usuario_id_fkey          FOREIGN KEY (usuario_id)
--                                                       REFERENCES usuarios(id)
--         - chk_parche_upgrades_puntos               CHECK (puntos_invertidos > 0)
--         - chk_parche_upgrades_tipo                 CHECK (tipo_upgrade IN (...))
--       -> contype 'c' = 2. NO existe todavia ningun CHECK sobre usuario_id.
--       -> el nombre chk_parche_upgrades_usuario_id_notnull NO colisiona con
--          ninguno de los 5, y sigue la convencion vigente chk_<tabla>_<col>
--          de los dos CHECK que ya estan.
--
--   Nota sobre (a): 0 filas significa que esta migracion NO necesita backfill.
--   No es "se omitio": el conjunto a transformar es vacio. El caso de que
--   existieran huerfanas esta contemplates en el punto (1) del cuerpo, que
--   ABORTA; no las borra ni las rellena.
--
-- ============================================================================
-- QUE HACER SI APARECE UNA FILA HUERFANA (NO BORRARLA)
-- ============================================================================
--
--   No se borra. ADR-003 (Cero Borrado Logico) prohibe el DELETE, y ademas un
--   NULL no deja testigo de a que inversor correspondia: borrar la fila
--   destruiria la prueba de que hubo una compra, y el saldo de puntos ya
--  Descontado seguiria sin contrapartida.
--   Procedimiento si el verificador pasa a exit 1:
--     1. NO aplicar esta 048 (el punto (1) del cuerpo aborta solo, con el
--        numero de filas en el mensaje).
--     2. Investigar el origen antes de tocar datos: casi siempre sera un
--        INSERT anterior al cambio de api/ (ventana de despliegue) o una
--        compra sin puiUid resuelto.
--     3. Reparar con un UPDATE dirigido (atribuir el usuario_id correcto) o
--        con un UPDATE de compensacion, NUNCA con DELETE.
--     4. Re-correr el verificador hasta exit 0 y solo entonces aplicar la 048.
--   Referencia: scripts/verificar_parche_upgrades_huerfanos.js (exit 1 =
--   huerfanas detectadas). Es el detector de la precondicion de esta 048.
--
-- ============================================================================
-- TENSION CONSCIENTE QUE ESTA MIGRACION ACEPTA
-- ============================================================================
--
--   Que pasa si un dia existe una compra sin inversor identificado? Esta 048
--   la RECHAZA. Y es una tension real, no teorica: la compra es legitima (el
--   usuario pago y la pandilla recibio el efecto), pero sin inversor no hay
--   fila que escribir, luego el usuario veria un fallo de compra por un
--   motivo que no controla.
--   POR QUE SE ACEPTA: el dato del inversor YA esta en scope en el backend
--   (puiUid es el primer bind del INSERT de parche_upgrade_invertir). No es
--   un dato que haya que ir a buscar, adivinar ni reconstruir: es un dato que
--   el codigo ya tiene y hoy no persiste. La compra sin inversor no es un
--   caso de negocio previsto, es un ARTEFACTO de no persistir un dato que ya
--   se tiene; la 048 obliga a cerrar ese artefacto en vez de dejarlo pasar.
--   La alternativa -- CHECK opcional / columna nullable permanente -- acepta
--   la perdida silenciosa de fama como comportamiento normal, y esa es la
--   razon por la que la 047 la declaro nullable: para que el arreglo del
--   codigo fuera posible sin romper produccion. Cerrado el codigo, cerrar el
--   esquema.
--   Si en el futuro aparece un caso de negocio REAL de compra sin inversor
--   (por ejemplo, un administrador que compra para una pandilla), la salida
--   no es relajar esta 048: es un camino de escritura explicito y separado,
--   con su propia decision documentada.
--
-- ============================================================================
-- DECISION 1: CHECK VALIDADO, NO NOT VALID
-- ============================================================================
--
--   Se usa CHECK VALIDADO (ADD CONSTRAINT ... CHECK sin NOT VALID, luego la
--   tabla queda con convalidated = true desde el primer instante).
--   Los dos argumentos que lo descartan, medidos y no supuestos:
--     - "Con 0 filas ambos son instantaneos hoy": MEDIDO, count(*) = 0.
--       El escaneo que hace la validacion no tiene nada que recorrer, luego
--       NOT VALID no compra NADA hoy. El unico scenarios donde NOT VALID gana
--       es una tabla que CREZCA con filas historicas, y aqui no hay filas.
--     - "NOT VALID + VALIDATE despues aplana y evita un lock largo si la
--       tabla creciera": es un argumento para un futuro que no existe. La
--       ventana de riesgo se paga ahora: NOT VALID deja la constraint en
--       convalidated = false, que NO bloquea la escritura de filas huerfanas
--       (PostgreSQL solo la exige al VALIDAR), luego durante esa ventana el
--   bug que esta migracion previene sigue entrando. Eso es prevention
--   diferida, y el prevention pedido es prevention real.
--   Ademas el fallo es mas claro: un CHECK validado viola con 23514
--   check_violation en el INSERT, senalando la constraint por nombre. Es el
--   fallo que se quiere ver en el punto de escritura, no un reporte posterior.
--
-- ============================================================================
-- DECISION 2: CHECK (no NOT NULL) -- ALTERNATIVA ANALIZADA, NO EJECUTADA
-- ============================================================================
--
--   La alternativa NO APLICADA, aqui documentada y NO ejecutada, seria:
--     ALTER TABLE public.parche_upgrades
--       ALTER COLUMN usuario_id SET NOT NULL;
--   Que aporta: NOT NULL es MAS FUERTE. El optimizador lo usa para
--   simplificar predicados y eliminar joins externos redundantes, y sobre todo
--   elimina el estado intermedio por completo: no existe el periodo en el que
--   la columna es nullable con una constraint NOT VALID pendiente.
--   Que cuesta:
--     - Revertir NOT NULL exige SET NOT NULL -> SET NULL y una constraint que
--      bloquee las huerfanas nuevas: es un plan de dos pasos, no un comando. Un
--       DROP CONSTRAINT es un comando.
--     - Se comporta peor con algunos clientes y ORM que infieren nulabilidad
--       del catalogo y asumen que una columna nullable acepta omision: con
--       NOT NULL el fallo aparece en cliente (23502) y con CHECK aparece en
--       servidor con la constraint nombrada.
--   RECOMENDACION: CHECK. Tres razones: (1) es REVERSIBLE en un comando y sin
--   perder datos, que importa en un fichero que todavia no se ha aplicado y
--   cuya premisa (el INSERT de api/) puede cambiar; (2) da un error MAS
--   EXPRESIVO -- 23514 con el nombre chk_parche_upgrades_usuario_id_notnull
--   -- y el nombre de la constraint se puede citar en un WHERE de diagnostico
--   -- y en el verificador; (3) si manana hay que permitir una excepcion
--   concreta, se ensancha el CHECK, que es un cambio de expresion, no un
--   cambio de tipo de restriccion sobre la columna.
--   CUANDO CAMBIAR A NOT NULL: cuando la columna haya cargado el dato en
--   todas las escrituras desde hace tiempo y nadie haya pedido la excepcion.
--   No antes.
--
-- ============================================================================
-- IDEMPOTENCIA (ADR-008) -- PATRON VIGENTE, NO DO $$ ... EXCEPTION
-- ============================================================================
--
--   Re-ejecutar este fichero COMPLETO es no-op funcional (N veces), con el
--   patron ya establecido en 019/026/028/029/031/032/039/041/042:
--   un DO block con IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE ...) que
--   envuelve el ADD CONSTRAINT, con RAISE NOTICE en las dos ramas.
--   NO se usa DO $$ BEGIN ... EXCEPTION WHEN duplicate_object THEN NULL, y
--   es deliberado: lo descarto la 046 y lo documenta. Al capturar, PL/pgSQL
--   hace ROLLBACK de la SUBTRANSACCION y el bloque TERMINA CON EXITO, luego
--   el runner marcaba la migracion como 'aplicada' con el cambio a medias.
--   Un fallo silencioso que se presenta como exito es peor que un fallo
--   ruidoso. Ahi IF NOT EXISTS no captura nada por si solo (PostgreSQL no lo
--   ofrece para ADD CONSTRAINT), y el guard explicito por conname es lo que
--   hace la re-ejecucion un no-op real.
--   El punto (1) NO usa el patron IF NOT EXISTS: es una PRECONDICION, y una
--   precondicion que no se cumple tiene que ABORTAR (patron de la 046, punto
--   (2): RAISE EXCEPTION con la explicacion del por que), nunca pasar en
--   silencio.
--
-- ============================================================================
-- CARACTER DE LA MIGRACION
-- ============================================================================
--
--   RESTRICTIVA en cuanto al contrato (rechaza filas huerfanas) pero NO
--   destructiva: no DELETE, no DROP, no TRUNCATE, no altera tipos, no altera
--   datos existentes (ADR-003). ASCII-SAFE (ADR-002): cero bytes > 127, cero
--   tildes, cero emojis, cero backticks (BUG-026).
--
-- Ejecutar SOLO con las dos puertas del AVISO DE ORDEN cumplidas:
--   node scripts/apply_sql_file.js db/migrations/048_parche_upgrades_usuario_id_obligatorio.sql
-- ============================================================================

-- (1) PRECONDICIONES. Deben cumplirse AMBAS; si no, ABORTAR.
--     Bloque unico y deliberadamente NO idempotente-por-omision: aqui no hay
--     nada que omitir en silencio. Si la columna no existe, la 047 no esta
--     aplicada y el objeto de esta migracion no existe; si hay huerfanas, hay
--     un problema de datos que esta migracion NO va a resolver ni a borrar.
DO $mig048$
DECLARE
  v_huerfanas bigint;
BEGIN
  -- (1a) Puerta del predecesor: la 047 tiene que estar aplicada.
  IF NOT EXISTS (
    SELECT 1
      FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name  = 'parche_upgrades'
       AND column_name = 'usuario_id'
  ) THEN
    RAISE EXCEPTION
      '048: public.parche_upgrades.usuario_id NO existe. La 048 es el cierre de prevention de la 047, que creo esa columna; sin ella esta migracion no tiene objeto. Aplica antes la 047_parche_upgrades_usuario_inversor.sql. Se aborta en vez de continuar.';
  END IF;

  -- (1b) Precondicion de datos: cero filas sin inversor identificado.
  --      MEDIDO HOY: 0 huerfanas sobre 0 filas. Si al aplicar las hubiera, la
  --      respuesta es ABORTAR con el numero, nunca borrar ni rellenar: un
  --      NULL no deja testigo de a que inversor correspondia y ADR-003
  --      prohibe el DELETE. Ver el AVISO DE ORDEN y el procedimento de
  --      "QUE HACER SI APARECE UNA FILA HUERFANA" en la cabecera.
  SELECT count(*) INTO v_huerfanas
    FROM public.parche_upgrades
   WHERE usuario_id IS NULL;

  IF v_huerfanas > 0 THEN
    RAISE EXCEPTION
      '048: public.parche_upgrades tiene % fila(s) con usuario_id IS NULL y la precondicion exige 0. No se borran (ADR-003) ni se rellenan por adivinanza: un NULL no deja testigo del inversor que corresponde. Diagnostica con scripts/verificar_parche_upgrades_huerfanos.js (exit 1 = huerfanas), repara con UPDATE dirigido y re-corre el verificador hasta exit 0 antes de reintentar esta 048. Se aborta en vez de convertir el problema en un borrado.', v_huerfanas;
  END IF;

  RAISE NOTICE 'migracion 048: precondiciones OK (columna usuario_id presente, % huerfanas)', v_huerfanas;
END
$mig048$;

-- (2) LA PREVENCION. CHECK VALIDADO (no NOT VALID): con 0 filas la validacion
--     no tiene nada que recorrer, luego NOT VALID no compra nada hoy y solo
--     dejaria una ventana en la que la constraint aun no bloquea filas
--     huerfanas. Argumento completo en "DECISION 1" de la cabecera.
--     Guard idempotente por conname, patron vigente 019/026/028/029/031/032/
--     039/041/042. El nombre NO colisiona: medido, las 5 constraints de la
--     tabla son pkey, parche_id_fkey, usuario_id_fkey, chk_..._puntos y
--     chk_..._tipo.
DO $mig048b$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.parche_upgrades'::regclass
      AND conname = 'chk_parche_upgrades_usuario_id_notnull'
  ) THEN
    ALTER TABLE public.parche_upgrades
      ADD CONSTRAINT chk_parche_upgrades_usuario_id_notnull
      CHECK (usuario_id IS NOT NULL);
    RAISE NOTICE 'migracion 048: CHECK chk_parche_upgrades_usuario_id_notnull creado (validado)';
  ELSE
    RAISE NOTICE 'migracion 048: CHECK chk_parche_upgrades_usuario_id_notnull ya existe (no-op)';
  END IF;
END
$mig048b$;

-- (3) VERIFICACION POST-APLICACION. Read-only: la deja trazable para el
--     siguiente, que no tiene que creer el mensaje del runner. Es exactamente
--     lo que debe devolver: contype 'c' = 3, el tercero siendo el CHECK nuevo,
--     con convalidated = true.
--     NO forma parte de la migracion (comentada a proposito para que aplicar
--     el fichero no ejecute nada mas alla del CHECK). Ejecutar a mano:
--
--     $env:NEON_QUERY="SELECT conname, convalidated, pg_get_constraintdef(oid) AS def
--                        FROM pg_constraint
--                       WHERE conrelid = 'public.parche_upgrades'::regclass
--                         AND conname = 'chk_parche_upgrades_usuario_id_notnull'";
--     node scripts/neon_select.js
--
--     $env:NEON_QUERY="SELECT count(*) AS filas,
--                             count(*) FILTER (WHERE usuario_id IS NULL) AS huerfanas
--                        FROM public.parche_upgrades";
--     node scripts/neon_select.js
--
-- ============================================================================
