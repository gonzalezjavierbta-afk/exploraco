# DEPLOY 021 - XP decimal numeric(12,2) y rankings de comunidad

Checklist de despliegue de la Entrega TSK-109 / ADR-035. Ejecuta los pasos
EN ORDEN. La migracion es idempotente (ADR-008): re-ejecutarla es seguro y una
segunda corrida es no-op (solo convierte columnas que HOY son enteras).

- Fecha de la entrega: 2026-09-17
- Decision: DECISIONS.md ADR-035
- Tarea: TASKS.md TSK-109
- Migracion: db/migrations/021_xp_decimal.sql
- Pre-chequeo local (opcional): scripts/verify_021_precheck.js
- Presupuesto serverless: 8/8 intacto. La 021 es SOLO base de datos; no crea
  funciones en api/ ni variables de entorno. Las ramas nuevas o modificadas
  (casa_ranking con miembros_activos, pandilla_ranking) entran en
  api/usuarios.js y api/interacciones.js del release de BACKEND.

Aviso de alcance: la 021 solo cambia el TIPO de 9 columnas. El XP decimal y los
rankings funcionan recien cuando el codigo de backend del mismo release viaja
desplegado; el formato de 2 decimales en pantalla llega con el release de
FRONTEND (paso 6).

Aviso critico de orden: si el backend decimal se despliega SIN la 021, Postgres
recibe numeros fraccionarios en columnas integer y los redondea por cast de
asignacion. NO hay error ni 500: el sintoma es silencioso (el XP sigue entero).
Por eso la 021 se aplica ANTES.

---

## Paso 0 - Pre-requisito: migraciones base aplicadas

1. La 021 asume las migraciones 009, 010 y 016 aplicadas (DDL de las columnas
   de XP). Adicionalmente, la entrega convive con 015/017/018/019/020 ya
   aplicadas por Javier.
2. Pre-chequeo opcional (solo lectura), ADR-006. En el editor SQL de Neon:

    SELECT data_type FROM information_schema.columns
      WHERE table_schema='public' AND table_name='usuarios'
        AND column_name='xp_total';

   Esperado HOY (pre-021): 'integer'. Tras el paso 2: 'numeric'.

---

## Paso 1 - Preflight read-only local (opcional pero recomendado)

1. Requiere `DATABASE_URL` (no hay credenciales locales en el repo).

    $env:DATABASE_URL="postgresql://..."; node scripts/verify_021_precheck.js

2. El script es READ-ONLY (solo `information_schema` y `MIN/MAX/COUNT` por
   columna) y reporta:
   - Existencia y `data_type` actual de las 9 columnas objetivo.
   - Obligatorias presentes: esperado 8/8 (`interacciones.xp_ganado` es
     OPCIONAL: columna no versionada, patron BUG-021).
   - Convertidas a `numeric(12,2)`: esperado 0/9 antes de aplicar la 021.
   - Evidencia de datos: `total`, `no_null`, `min`, `max` por columna (anotar
     estos `min`/`max` para compararlos en el paso 3).
3. Falla con exit code != 0 si falta una columna obligatoria; en ese caso NO
   aplicar la 021 y reportar el resultado exacto.

---

## Paso 2 - Aplicar la migracion 021 en Neon

1. Abrir el editor SQL de Neon (produccion), fuera de pico (la conversion toma
   un `ACCESS EXCLUSIVE` momentaneo por tabla).
2. Ejecutar el archivo COMPLETO db/migrations/021_xp_decimal.sql en UNA sola
   corrida. Un unico bloque `DO $$` itera las 9 columnas y, con guard
   `information_schema` (`data_type IN ('integer','smallint','bigint')`),
   ejecuta `ALTER TABLE <t> ALTER COLUMN <c> TYPE numeric(12,2) USING <c>::numeric(12,2)`
   y re-fija el DEFAULT cuando la lista lo indica.
3. La migracion emite `RAISE NOTICE` por cada columna convertida. Las columnas
   ya `numeric` o inexistentes se omiten (no-op): no hay `DROP` ni reescritura
   de datos.
4. Cuidado con el cliente de Neon: las sentencias DDL no devuelven filas y en
   algunas herramientas aparece "Cannot read properties of undefined (reading
   'map')". No significa fallo del SQL; la migracion es re-aplicable sin riesgo.

---

## Paso 3 - Verificar el tipo y los datos (solo lectura)

Correr sentencia por sentencia. El primer bloque tambien esta comentado al
final del archivo 021.

(a) Tipo de las 9 columnas:

    SELECT table_name, column_name, data_type, numeric_precision, numeric_scale
      FROM information_schema.columns
      WHERE table_schema='public'
        AND (table_name, column_name) IN (
          ('usuarios','xp_total'), ('usuarios','xp_ref_total'),
          ('interacciones','xp_ganado'), ('album_votos','xp_ganado'),
          ('album_fotos','xp_otorgado_autor'), ('compra_consumibles','xp_pagado'),
          ('pandilla_retos','xp_bono'), ('consumibles','precio_xp'),
          ('pandillas','fama_total')
        )
      ORDER BY table_name, column_name;

Esperado: 9 filas con data_type='numeric', numeric_precision=12,
numeric_scale=2. `interacciones.xp_ganado` puede faltar si la columna no existe
(no versionada); la 021 la cubre de forma defensiva.

(b) Min/max por columna (comparar con los del paso 1; deben ser IGUALES: la
conversion es exacta y no debe cambiar ningun valor):

    SELECT COUNT(*) AS total, COUNT(xp_total) AS no_null,
           MIN(xp_total) AS min_xp, MAX(xp_total) AS max_xp
      FROM usuarios;
    SELECT COUNT(*) AS total, MIN(fama_total) AS min_fama, MAX(fama_total) AS max_fama
      FROM pandillas;
    SELECT COUNT(*) AS total, MIN(precio_xp) AS min_precio, MAX(precio_xp) AS max_precio
      FROM consumibles;

Esperado: los mismos `min`/`max` del preflight, ahora con 2 decimales en la
representacion (ej. 125 -> 125.00).

(c) Idempotencia: re-ejecutar el archivo COMPLETO una segunda vez. NO debe
convertir nada (todas las columnas ya son `numeric`) y no debe emitir
`RAISE NOTICE` de conversion.

Si cualquier conteo o valor no coincide, NO desplegar el backend todavia y
reportar el resultado exacto.

---

## Paso 4 - Release 1: desplegar el BACKEND

1. Confirmar que el release lleva juntos:
   - api/usuarios.js (v15: `casa_ranking` con `miembros_activos`, orden por
     `xp_total DESC`, normalizacion `numeric` -> `Number`).
   - api/interacciones.js (v18: redondeo half-up `red2`, sin `::int` en sumas
     de XP, rama `pandilla_ranking`, gate de `album_crear` con
     `calcularNivelLocal`, guarda de fama `<= 0`).
   - api/admin.js (precio_xp decimal).
   - api/pagina-destino.js (v10: espejo cliente de XP con `Number`).
   - usuario-session.js (helper `window.ExploraCO.fmtXp`/`redondearXp`).
2. No hay variables de entorno nuevas: `DATABASE_URL`, `ADMIN_SECRET`,
   `SESSION_JWT_SECRET`, `RESEND_API_KEY` y `SITE_URL` ya existen. El
   `SESSION_JWT_SECRET` debe seguir siendo el MISMO en usuarios.js e
   interacciones.js.
3. Desplegar (auto-deploy de Vercel desde GitHub o `vercel --prod`).
4. Nota: el backend anterior sigue funcionando contra `numeric(12,2)` (asigna
   enteros al tipo numerico); el orden seguro es 021 -> backend -> frontend.

---

## Paso 5 - Smoke en vivo contra la API desplegada

1. Verificar que `numeric` sale como numero (no string) y con 2 decimales:

    GET /api/usuarios?tipo=leaderboard

   Esperado: `xp_total` numerico normalizado (ej. 125.5), NO el string
   "125.50"; el `total` aditivo (ADR-029) sigue presente.

2. Ranking de Casas con activos:

    GET /api/usuarios?tipo=casa_ranking

   Esperado: cada Casa con `miembros`, `miembros_activos`, `xp_total`,
   `xp_promedio`; orden por `xp_total DESC`.

3. Ranking global de Parches (rama NUEVA):

    GET /api/interacciones?tipo=pandilla_ranking

   Esperado: parches ordenados por `fama_total DESC` (desempate `creado_en
   ASC`), limit 50, con `miembros` y `miembros_activos`. Lectura publica (sin
   Bearer).

4. Fallback de columnas no versionadas: si `usuarios.activo`/`ultimo_acceso`
   no existieran, las ramas 2 y 3 responden igual con `miembros_activos = 0` y
   un `warn` en logs (nunca 500). Confirmar en los logs de la funcion que no
   hay 42703 sin capturar.

---

## Paso 6 - Release 2: desplegar el FRONTEND

1. Confirmar que el release lleva: index.html, admin.html, perfil.html,
   mi-perfil.html y comunidad.html.
2. Desplegar (auto-deploy o `vercel --prod`).
3. Recordatorio: `usuario-session.js` es cacheado por el navegador; si un
   cliente conserva la version vieja, el nivel sigue siendo correcto
   (los umbrales son enteros) pero el XP se muestra truncado hasta recargar.

---

## Paso 7 - Verificacion UI (en vivo, navegador)

1. XP con decimales: provocar una acreditacion con decimales (ej. un bono con
   multiplicador) y confirmar el formato `es-CO` a 2 decimales: "125,50 XP"
   (no "125,5"). Revisar al menos: cabecera de index.html, mi-perfil.html,
   perfil.html y comunidad.html.
2. Pestana "Clase" (mi-perfil.html): el Arbol de Clases es el componente unico;
   "Tabla de Destino" es la sub-vista `senderos`; "Tu Faccion" es cabecera
   colapsable; "Vocaciones de Artista" esta dentro de la sub-vista `artistas`
   con el boton inline "Activar vocacion"; "Mi Casa" es un bloque compacto.
3. Tab Ranking de comunidad.html: confirmar las 4 sub-vistas
   (Viajeros | Casas | Facciones | Parches); Casas muestra XP total, activos y
   promedio; Parches consume `pandilla_ranking`; el ranking de Facciones ya NO
   vive en "Activo Oculto" (alli queda un CTA que redirige).
4. Admin: la tienda de consumibles acepta `precio_xp` con decimales (punto o
   coma) y el listado de jugadores muestra el XP a 2 decimales.

---

## Rollback si falla

1. Esquema: `ALTER TABLE <t> ALTER COLUMN <c> TYPE integer USING ROUND(<c>)::integer`
   para las 9 columnas. Es EXACTO mientras NO se hayan acreditado decimales
   (125.00 -> 125) y LOSSY despues (125.47 -> 125). Documentar el script como
   db/migrations/021_xp_decimal_down.sql y NO ejecutarlo en el flujo normal.
2. Respaldo previo (opcional, recomendado si se preve rollback):

    CREATE TABLE xp_backup_021 AS
      SELECT id, xp_total, xp_ref_total FROM usuarios;

3. Codigo: revertir el release al commit anterior (Vercel > Deployments >
   Promote). El codigo viejo (entero) sigue operando contra columnas
   `numeric(12,2)` de forma degradada (trunca decimales), por lo que revertir
   solo el frontend no rompe nada.
4. `pandillas.fama_total` NO se recomputa en ningun caso: la 021 solo cambia su
   tipo (ADR-035). No hay datos historicos que restaurar.
