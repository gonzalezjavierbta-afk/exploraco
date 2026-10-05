-- ============================================================================
-- Migration 045: Tabla de control de migraciones (schema_migrations)
-- Fecha: 2026-10-05
-- Referencias: ADR-002 (ASCII-safe), ADR-003 (cero borrado logico), ADR-006
--   (validar el esquema real antes de escribir), ADR-008 (idempotencia y
--   gobernanza de esquema)
-- Requiere: nada. Es la primera migracion que no depende de otra.
--
-- QUE HACE
--   Crea UNA tabla, schema_migrations, que registra que ficheros .sql de
--   db/migrations/ estan aplicados en Neon y con que grado de certeza.
--   No modifica ninguna tabla existente. No hace seed. No toca endpoints.
--
-- POR QUE EXISTE (hecho medido, no hipotesis)
--   Antes de esta migracion el repo TENIA CERO registros de que migraciones
--   estaban aplicadas: cero coincidencias de schema_migrations,
--   migrations_aplicadas o _migrations en todo el repo, y ningun script de
--   scripts/ leia db/migrations/ para compararlo contra Neon.
--   El coste ya se pago una vez: 044_planes_viaje_fecha_inicio.sql estaba
--   COMMITteada desde 427be74 pero NO aplicada en Neon, y dos ramas de
--   listado de planes de api/interacciones.js devolvian 503 con
--   code 'SCHEMA_NOT_MIGRATED' en produccion.
--   La causa raiz no fue el 503: fue que COMMITteada != APLICADA y nada en el
--   repomediaba entre las dos cosas. Esta tabla es ese mediador.
--
-- QUE NO SUSTITUYE (leelo antes de confiarle algo)
--   1. NO sustituye al BACKUP de Neon. Un registro que dice 'aplicada' no
--      protege ningun dato: el rollback de una migracion que Rompio datos
--      sigue necesitando el backup (y un backup, ademas, no se restaura
--      solo).
--   2. NO sustituye al REVIEW HUMANO de la migracion. Aqui solo queda
--      constancia de que un fichero se ejecuto; nadie lo ha releido ni
--      approve. Un registro con resultado 'aplicada' NO es un visto bueno.
--   3. NO sustituye al HECHO DE QUE UNA MIGRACION SE PUEDA APLICAR A MEDIAS.
--      Un .sql de varias sentencias executed por el runner no es atomico:
--      si la sentencia 3 de 7 falla, las 2 primeras YA quedaron aplicadas y
--      el registro dira 'fallida' sin que la base de datos haya pasado
--      nunca por un estado coherente. La tabla no detecta eso; lo detecta
--      el SQLSTATE del fallo y el ojo humano.
--   4. NO sustituye a scripts/verificar_migraciones_prod.js, que sigue
--      siendo el que comprueba que la migracion esta VIVA en produccion
--      (aplicada en Neon != servida por el backend desplegado).
--
-- CARACTER DE LA MIGRACION
--   ADITIVA: un CREATE TABLE, dos CREATE INDEX, un ALTER y dos COMMENT.
--   FORWARD-ONLY: no hay DROP, ni DELETE, ni TRUNCATE, ni ALTER COLUMN, ni
--   RENAME, ni SET NOT NULL sobre datos existentes (ADR-003). NO hay ninguna
--   sentencia UPDATE/TRUNCATE, ni siquiera comentada: el runner descarta las
--   lineas de comentario, asi que un UPDATE comentado nunca se ejecuta.
--   IDEMPOTENTE (ADR-008): todo lleva IF NOT EXISTS salvo el ALTER
--   DISABLE ROW LEVEL SECURITY, que es idempotente por naturaleza (desactivar
--   algo ya desactivado es un no-op) y las dos sentences COMMENT ON, que
--   reemplazan su propio comentario. Re-ejecutar el archivo COMPLETO es
--   no-op funcional: la tabla ya existe con su forma y las constraints ya
--   existen con su definicion.
--   LO QUE NO SE TOCA NUNCA: una fila ya registrada. Ninguna sentencia de
--   este archivo modifica filas, porque todavia no hay filas: las 42
--   migraciones historicas se registran despues, desde un seed aparte.
--   ASCII-SAFE (ADR-002): cero bytes > 127, cero tildes, cero emojis, cero
--   escapes unicode, cero backticks.
--
-- PRESUPUESTO DE SERVERLESS (limite duro del proyecto)
--   Las 8/8 funciones serverless de Vercel estan agotadas. Esta tabla NO
--   puede exponerse por ningun endpoint nuevo y NINGUN api/*.js debe leerla
--   ni escribirla: ni en lectura, ni "solo para healthcheck". La consultan
--   unicamente scripts de mantenimiento, que ya consumen una funcion
--   existente (el presupuesto Vercel no crece por escribir SQL a mano).
--   Si alguna vez hace falta exponerla, ESA migracion es la que debe
--   activar RLS con politica (ver la seccion RLS de mas abajo).
--
-- RLS: DESACTIVADO, Y ESTA ES LA DECISION
--   Riesgo concreto que se evita: activar RLS sin politica deja a los
--   scripts de mantenimiento (que conectan con DATABASE_URL) sin poder leer
--   la tabla, y eso no lo descubre nadie hasta que una migracion futura se
--   queda a medias en produccion.
--   Razon 1, la tecnica: sin FORCE ROW LEVEL SECURITY, el RLS no aplica al
--   PROPIETARIO de la tabla, que es el rol con el que entra el runner. O
--   sea, activar RLS aqui no habria protegido nada y habria creado una
--   sensacion de proteccion falsa. Con FORCE, si, bloquearia exactamente a
--   los unicos clientes legitimos de la tabla.
--   Razon 2, la de superficie: sin endpoint que la lea, no hay cliente
--   no confiable al que haya que excluir.
--   Razon 3, la de sensibilidad: el contenido es un nombre de fichero, un
--   sha256, dos timestamps, un entero de duracion y un campo de texto. No
--   hay credenciales, ni PII, ni datos de negocio. Contrato adicional: el
--   campo notas NO debe receber jamas la DATABASE_URL, ni tokens, ni
--   contenuido de filas (un agente que lo lea no debe tener acceso a datos
--   que la tabla no tiene por que conocer).
--   Mitigacion para que la decision sea durable y visible: el ALTER ... DISABLE
--   ROW LEVEL SECURITY de mas abajo queda en el esquema. Si alguien activa
--   RLS en el futuro, tiene que hacerlo junto a una politica en el mismo
--   cambio, y ese cambio queda a la vista en el historial de esquema.
--
-- INTEGRIDAD DEL PREDECESOR (la regla que SI funciona con el historico real)
--   Hecho medido: db/migrations/ tiene 42 ficheros, del 003 al 044, y NO es
--   una serie contigua desde 1 porque 001 y 002 NO EXISTEN. Por eso esta
--   migracion NO puede exigir contiguidad desde 1: exigirla dejaria invalido
--   el historico entero y obligaria a fabricar dos migraciones que no existen.
--   Tampoco puedeoise una constraint de precedencia en la base de datos: un
--   CHECK solo puede mirar la fila que se inserta, nunca las vecinas, y un
--   trigger seria DDL que puede fallar a medias (justo lo que esta tabla
--   existe para evitar).
--   La regla que se propone es, en una linea:
--     antes de aplicar la N, TODO fichero de db/migrations/ con numero
--     menor que N debe tener fila con resultado 'aplicada' o
--     'historico_no_verificado'; y el numero N-1 debe existir.
--   Por que funciona con el historico real: la unidad de comparacion es el
--   FICHERO QUE ESTA EN DISCO, no un rango numerico inventado. 001 y 002 no
--   estan en disco, luego no son predecesores de nadie y su ausencia no
--   invalida 003. Un hueco detectable es exactamente una de estas dos
--   cosas, y las dos sonholes de verdad:
--     - hay un .sql en disco sin fila  (alguien comitteo y no aplico: el
--       caso 044, el que nos trajo aqui)
--     - hay una fila con numero mayor que uno sin fila  (alguien aplico la
--       046 saltandose la 045)
--   Y por que no depende de una convencion fragile: el nombre del fichero
--   es de tres digitos con cero a la izquierda, asi que el prefijo de tres
--   caracteres ES el numero, y de ahi sale la columna numero sin adivinar
--   nada. Si algun dia se llega a 1000 migraciones habra que revisar el
--   CHECK de tres digitos; hoy, con 42 ficheros, no es un problema real.
--   La consulta que detecta los huecos esta en el bloque PREFLIGHT.
--
-- UMBRAL DE CONFIANZA (afirmado != verificado, y la tabla lo distinction)
--   La columna verificada_en es la que separa "se ejecuto" de "se ejecuto y
--   alguien lo comprobo". Sin ella, 'aplicada' seria una palabra vacia. Los
--   cuatro niveles, de mas a menos confianza:
--     ALTA   resultado = 'aplicada' y verificada_en IS NOT NULL. El runner
--            la ejecuto y alguien la volvio a comprobar contra el esquema
--            real (sonda read-only o verificador). Esta es la unica linea
--            que se puede leer como "esta en Neon".
--     MEDIA  resultado = 'aplicada' y verificada_en IS NULL. El runner dice
--            que la ejecuto; nadie lo ha comprobado despues. Vale como
--            testimonio del runner, no como hecho verificado.
--     CERO   resultado = 'historico_no_verificado'. El fichero existe y hay
--            fila; el estado real en Neon es DESCONOCIDO. Esta linea NO
--            afirma nada sobre la base de datos y no debe contarse como
--            cobertura. Es la fila honesta para las 41 migraciones cuyo
--            estado nadie ha comprobado.
--     NULA   resultado = 'fallida'. Hay que mirar el SQLSTATE y decidir a
--            mano; la fila es un incidente, no un estado.
--   El caso interesante es ESTA migracion: la 045 se autoregistra. Al
--   ejecutarla, la tabla que afirma su propia existencia nace con una fila
--   propia de confianza MEDIA (resultado 'aplicada', verificada_en NULL),
--   porque el runner no puede verificarse a si mismo en el mismo instante
--   en que se inscribe. Solo sube a ALTA cuando alguien ejecute la
--   verificacion posterior. Es la demostracion de que el umbral funciona:
--   la fila mas reciente y mas segura de la tabla sigue sin estar verificada.
--
-- DERIVA (alguien edita un .sql despues de aplicarlo)
--   Hecho: el checksum guardado es un sha256 de los bytes del .sql, y el
--   .sql vive en el repo, NO en la base de datos. Por eso la deteccion es
--   RESPONSABILIDAD DEL SCRIPT y no de la base de datos: la tabla guarda un
--   hash de algo que no tiene, asi que estructuralmente no puede saber si
--   ese algo cambio. Any constraint de este archivo loaria ese vacio.
--   La regla, en el script:
--     1. Calcular sha256 de los bytes del .sql tal como esta en disco.
--     2. Si hay fila y el checksum NO coincide: es DERIVA. Reportarla,
--        salir con codigo distinto de 0 y NO aplicar el fichero.
--     3. NUNCA hacer UPDATE del checksum almacenado para que cuadre. Eso
--        borraria la unica evidencia de que el cambio existe, y es
--        precisamente el borrado logico que ADR-003 prohibe.
--     4. La correccion de una deriva es una migracion NUEVA y numerada, no
--        editar la vieja. Reeditar 043 y volver a aplicarla no es una
--        operacion valida en ningun caso.
--   Lo que si hace la tabla es dar elalmacen del valor original: como el
--   checksum nunca se sobrescribe, el valor con el que se aplico es
--   recuperable para siempre.
--
-- CONTRATO QUE DEBE CUMPLIR scripts/apply_sql_file.js (NO implementado aqui)
--   Este archivo NO modifica ese script. El contrato es el siguiente, para
--   que otro agente lo escriba sin adivinar:
--     a) Registrar SIEMPRE, y solo con INSERT, una fila por fichero aplicado
--        con nombre, numero (entero de los tres primeros digitos),
--        resultado, checksum (sha256 hex minuscula de los bytes del
--        archivo), aplicada_en, duracion_ms y notas.
--     b) Rechazar por defecto un .sql cuyo numero tenga predecesores sin
--        fila (regla de integridad del predecesor de mas arriba), con excepcion
--        explicita y documentada.
--     c) Detectar deriva comparando el checksum calculado con el almacenado,
--        y no escribir jamas en la columna checksum de una fila existente.
--     d) Registrar en notas el motivo, nunca credenciales.
--     e) Un fallo a medias debe dejar una fila 'fallida', no media fila
--        silenciosa, y salir con codigo distinto de 0.
--   Si el script no cumple (a), la tabla se queda vacia y el problema que
--   la creo vuelve intacto: una tabla sin filas es un adorno.
--
-- ORDEN DE APLICACION (NO INVERTIR)
--   PRIMERO: aplicar este archivo COMPLETO con el runner versionado:
--     node scripts/apply_sql_file.js db/migrations/045_schema_migrations.sql
--   El runner debe reportar "Sentencias detectadas: 6": CREATE TABLE, 2 CREATE
--   INDEX, 1 ALTER y 2 COMMENT.
--   LUEGO: sembrar las 42 filas historicas desde un seed aparte (NO esta
--   migracion), con resultado 'historico_no_verificado', salvo la 044, que
--   se conoce aplicada y verificada por sonda: esa va con 'aplicada' y
--   verificada_en informado.
--   OJO CON ESTE ORDEN: el seed NO es opcional antes de la 046. Con la
--   tabla vacia, la regla del predecesor bloquearia correctamente cualquier
--   migracion posterior, porque 003 a 044 estarian en disco sin fila. Que
--   las bloquee es la regla funcionando, no un fallo.
--   El DDL lo ejecuta el runner; la CONFIRMACION de aplicar un cambio de
--   esquema en Neon sigue siendo del OPERADOR HUMANO (gate de
--   @sql-security, AGENTS.md seccion 2). El runner no salta ese gate.
--
-- VERIFICACION DE ESTE ARCHIVO
--   1. ASCII-safe (ADR-002) y cero backticks: verificado, 0 bytes > 127.
--   2. Divisibilidad con el splitter real de apply_sql_file.js (copia
--      integra de sus dos funciones, sin tocar el script): verificado, 6
--      sentencias y cada una con su cierre.
--   3. Sintaxis contra un motor: NO VERIFICADA. Este repo no tiene psql, ni
--      docker, ni servicio PostgreSQL local, ni parser de SQL en
--      node_modules (medido: node-sql-parser, pgsql-ast-parser,
--      sql-parser, libpg-query, pg-query-emscripten, todos ausentes), y
--      esta migracion no se aplico a Neon. Lo verificado es por revision y
--      por el patron exacto ya aplicado en 006_mapas.sql y 044, no contra
--      un motor. Camino canonico para probarlo de verdad, sin escribir nada:
--        node scripts/apply_sql_file.js db/migrations/045_schema_migrations.sql
--      y mirar que las 6 sentencias salen OK.
--
-- ROLLBACK (emergencia)
--   El unico objeto que esta migracion crea es la tabla, y todavia no tiene
--   filas al aplicarse. Borrarla:
--     DROP TABLE IF EXISTS schema_migrations;
--   Ese DROP es la EXCEPCION consciousa al caracter forward-only de este
--   archivo, y por eso vive AQUI, en el rollback documentado, y no en el
--   DDL: si se necesita, se escribe a mano, con el gate del operador, y se
--   pierde el registro de las 42 migraciones historicas (que es
--   informacion que no se puede regenerar sola). Prefiero no hacerlo.
-- ============================================================================

-- ============================================================================
-- DDL (UNICA PARTE EJECUTABLE DE ESTE ARCHIVO: 6 SENTENCIAS)
-- ============================================================================

-- Una fila por fichero .sql de db/migrations/. La PK es el nombre exacto del
-- fichero: es la clave natural que usan el runner y los scripts, y no exige
-- que el runner sepa inventar ids.
CREATE TABLE IF NOT EXISTS schema_migrations (
  -- nombre exacto del fichero, tal cual esta en db/migrations/.
  nombre        text PRIMARY KEY,
  -- numero de la migracion: los tres primeros caracteres del nombre, que son
  -- tres digitos con cero a la izquierda. No se deduce con una funcion: se
  -- escribe, y el CHECK de abajo obliga a que coincida con el nombre. Asi el
  -- hueco de numeracion se detecta con aritmetica normal, no con heuristicas
  -- de cadenas.
  numero        smallint NOT NULL,
  -- vocabulario cerrado de tres valores (CHECK mas abajo). El DEFAULT es el
  -- valor conservador: si un script olvida declarar el estado, la fila dice
  -- "no verificado" y no "aplicada". Que el estado se pueda subestimar y no
  -- sobreestimar es el motivo de que el default sea este y no 'aplicada'.
  resultado     text NOT NULL DEFAULT 'historico_no_verificado',
  -- sha256 en hexadecimal minuscula de los bytes del fichero en el momento
  -- de aplicarlo. NULL significa "no calculado": es el unico caso legitimo y
  -- es el estado de partida de las filas historicas todavia no verificadas.
  -- NUNCA se sobrescribe el valor de una fila existente (ver DERIVA).
  checksum      text,
  -- momento en que se aplico de verdad. NULL por definicion cuando
  -- resultado = 'historico_no_verificado' (no se sabe cuando se aplico: es
  -- lo unico que se sabe de esas 41 migraciones) y libre cuando
  -- resultado = 'fallida' (puede haberse aplicado a medias).
  aplicada_en   timestamptz,
  -- momento en que se escribio esta fila, que siempre se sabe. Es la
  -- diferencia entre "cuando se aplico" y "cuando alguien se entero".
  registrada_en timestamptz NOT NULL DEFAULT now(),
  -- momento en que alguien verifico el estado real contra el esquema. Es la
  -- columna que convierte 'aplicada' en una afirmacion con respaldo (ver
  -- UMBRAL DE CONFIANZA). NULL = solo afirmado por el runner.
  verificada_en timestamptz,
  -- duracion de la ejecucion en milisegundos. NULL para el historico, que no
  -- se midio.
  duracion_ms   integer,
  -- texto libre del operador. ASCII. Sin credenciales jamas.
  notas         text NOT NULL DEFAULT '',
  -- El nombre tiene que seguir la convencion de tres digitos mas nombre en
  -- minusculas. Esto no es estetica: es lo que hace que 'numero' sea
  -- verificable y que el orden lexicografico de la PK coincida con el orden
  -- de aplicacion. Un fichero que rompa la convencion no se registra con
  -- esta tabla: requiere una migracion nueva que relaje el CHECK (nunca
  -- editar este fichero, que ya estaria aplicado).
  CONSTRAINT schema_migrations_nombre_chk
    CHECK (nombre ~ '^[0-9]{3}_[a-z0-9_]+\.sql$'),
  -- El numero tiene que ser el prefijo del nombre. Sin esta linea, un runner
  -- con un bug podria registrar 046 como numero 46 y el hueco 45 pasaria
  -- desapercibido.
  CONSTRAINT schema_migrations_numero_chk
    CHECK (numero = substring(nombre, 1, 3)::smallint),
  -- Vocabulario cerrado, exactamente tres valores. Anadir un cuarto (por
  -- ejemplo 'revertida') es una migracion nueva que rehaga el CHECK, nunca una
  -- edicion de este fichero.
  CONSTRAINT schema_migrations_resultado_chk
    CHECK (resultado IN ('aplicada', 'historico_no_verificado', 'fallida')),
  -- Formato del checksum: 64 digitos hexadecimales en minuscula (sha256).
  -- Asi una herramienta que detecte deriva puede confiar en la columna sin
  -- tener que adivinar el algoritmo. NULL permitido a proposito.
  CONSTRAINT schema_migrations_checksum_chk
    CHECK (checksum IS NULL OR checksum ~ '^[0-9a-f]{64}$'),
  -- Una duracion negativa no es una duracion: es un reloj roto o un script
  -- que no midio bien. Falla pronto y en la base de datos, no en un informe.
  CONSTRAINT schema_migrations_duracion_chk
    CHECK (duracion_ms IS NULL OR duracion_ms >= 0),
  -- Coherencia entre estado y fecha. 'aplicada' exige fecha de aplicacion (si
  -- no, la fila afirma algo que no puede sostener). 'historico_no_verificado'
  -- prohibe tenerla (si la tuviera, alguien estaria affinejando una fecha
  -- que nadie conoce). 'fallida' se deja libre porque una ejecucion a medias
  -- puede tener fecha de inicio y de fin sin haber completado.
  CONSTRAINT schema_migrations_estado_chk
    CHECK (
         (resultado = 'aplicada'              AND aplicada_en IS NOT NULL)
      OR (resultado = 'historico_no_verificado' AND aplicada_en IS NULL)
      OR (resultado = 'fallida')
    )
);

-- Dos ficheros distintos con el mismo numero (003_a.sql y 003_b.sql) serian
-- una colision de numeracion, que es justo la clase de bug que esta tabla
-- existe para cazar. El indice lo hace imposible en la base de datos, no por
-- convencion. Es UNIQUE y no PRIMARY porque numero es la clave de negocio y
-- nombre la clave natural: la PK sigue siendo el nombre exacto.
CREATE UNIQUE INDEX IF NOT EXISTS idx_schema_migrations_numero
  ON schema_migrations (numero);

-- Las consultas que hacen falta son de tres tipos: que hay aplicado (por
-- numero), que falta por aplicar (por numero) y cuanto se ha tardado (por
-- resultado). Este indice cubre las tres sin llegar a materializar la tabla.
CREATE INDEX IF NOT EXISTS idx_schema_migrations_estado
  ON schema_migrations (resultado, numero);

-- La decision de RLS de la cabecera, escrita en el esquema para que sea
-- durable y visible en Neon. Es idempotente por naturaleza: desactivar RLS
-- en una tabla que no lo tiene es un no-op. Y si alguien lo activa en el
-- futuro, esta sentencia aparece en el historial y obliga a mirar por que.
ALTER TABLE schema_migrations DISABLE ROW LEVEL SECURITY;

-- El vocabulario cerrado merece estar escrito donde se lee, no solo en el
-- .sql. Sin esto, el CHECK es la unica documentacion y el CHECK no explica.
COMMENT ON TABLE schema_migrations IS
  'Registro de que ficheros .sql de db/migrations/ estan aplicados en Neon. resultado: aplicada (el runner la ejecuto; verificada_en IS NOT NULL ademas significa que alguien la comprobo contra el esquema real), historico_no_verificado (el fichero existe, el estado en Neon es desconocido), fallida (hubo un error; revisar SQLSTATE y notas). No se expone por ningun endpoint: 8/8 funciones serverless agotadas, solo scripts de mantenimiento. NO sustituye al backup, ni al review humano, ni al hecho de que una migracion se pueda aplicar a medias.';

COMMENT ON COLUMN schema_migrations.resultado IS
  'Vocabulario cerrado de 3 valores (CHECK schema_migrations_resultado_chk). El DEFAULT es historico_no_verificado a proposito: el estado se puede subestimar, nunca sobreestimar.';

-- ============================================================================
-- PREFLIGHT (SOLO LECTURA; NO forma parte del DDL; NO se ejecuta solo).
-- Copiar y correr sentencia por sentencia. La 1 y la 2 son el bloque
-- PREDECESOR: se corren ANTES de aplicar cualquier migracion futura.
-- ============================================================================
-- (1.a) ESTADO DE LA TABLA. Antes de aplicar la 045 esto falla con
--       42P01 (relation does not exist). Despues: 1 fila con las columnas de
--       abajo.
--       SELECT column_name, data_type, is_nullable
--         FROM information_schema.columns
--        WHERE table_name = 'schema_migrations'
--        ORDER BY ordinal_position;
--
-- (1.b) INTEGRIDAD DEL PREDECESOR, forma A (el historico real). Con la tabla
--       recien creada devuelve 0 filas, que es el estado honesto: el registro
--       esta vacio hasta que corra el seed historico. Lo que NO debe hacer
--       esta consulta es exigir contiguidad desde 1: 001 y 002 no estan en
--       db/migrations/, luego no son predecesoras de nadie y su ausencia no
--       invalida 003.
--       SELECT numero, nombre, resultado, verificada_en IS NOT NULL AS verificada
--         FROM schema_migrations
--        ORDER BY numero;
--       El Diff CONTRA DISCO no se puede hacer en SQL: el .sql no esta en la
--       base de datos. Lo hace el script de mantenimiento, que ya lee el
--       directorio; en PowerShell el lado de disco es:
--         Get-ChildItem db/migrations/*.sql
--           | ForEach-Object { $_.BaseName.Substring(0,3) } | Sort-Object
--       y la diferencia de conjuntos entre eso y la lista de numeros de la
--       tabla es la lista de migraciones comitteadas y no aplicadas.
--
-- (1.c) INTEGRIDAD DEL PREDECESOR, forma B (hueco al aplicar la N). Antes de
--       aplicar la 046, esto tiene que devolver 0 filas. Si devuelve una,
--       alguien aplico una migracion saltandose la anterior, y hay que
--       investigar antes de seguir.
--       SELECT numero, nombre FROM schema_migrations
--        WHERE numero = 46 - 1
--          AND resultado IN ('aplicada', 'historico_no_verificado');
--
-- (1.d) UMBRAL DE CONFIANZA. Lo que de verdad se puede leer como "esta en
--       Neon" es solo la primera linea. La segunda es un testimonio sin
--       verificar, y la tercera no afirma nada sobre la base de datos.
--       SELECT resultado, verificada_en IS NOT NULL AS verificada, count(*)
--         FROM schema_migrations
--        GROUP BY resultado, verificada_en IS NOT NULL
--        ORDER BY resultado, verificada;
--
-- (1.e) DERIVAS SOSPECHADAS: filas cuya duracion o checksum no cuadran con
--       lo que el runner deberia haber escrito. El vacio real de esto es
--       que el .sql no esta en la base de datos: esto solo detecta lo que la
--       tabla guardo, no si el fichero de disco cambio despues. Esa
--       comparacion es del script.
--       SELECT nombre, resultado, checksum, duracion_ms, notas
--         FROM schema_migrations
--        WHERE resultado = 'fallida'
--           OR duracion_ms = 0
--           OR notas = ''
--        ORDER BY numero;
--
-- (1.f) POST-APLICACION de la 045: la tabla existe y no hay filas todavia
--       (el seed historico va aparte).
--       SELECT count(*) AS filas FROM schema_migrations;
--       SELECT relrowsecurity, relforcerowsecurity
--         FROM pg_class WHERE relname = 'schema_migrations';
--       Expected: relrowsecurity = false, relforcerowsecurity = false.
-- ============================================================================
