# DEPLOY 017 - Perfil publico (museo), Arbol de Clases y Casas

Checklist de despliegue de la Entrega TSK-103 / ADR-028. Ejecuta los pasos
EN ORDEN. La migracion es aditiva e idempotente (ADR-008): re-ejecutarla es
seguro y las columnas nuevas no rompen al codigo viejo.

- Fecha de la entrega: 2026-09-15
- Spec de producto: PROMPT.md (TSK-103 / ADR-028)
- Migracion: db/migrations/017_perfil_publico_arbol_casas.sql
- Pre-chequeo local (opcional): scripts/verify_017_precheck.js
- Smoke versionado: scripts/smoke_017_perfil_arbol_casas.js (WP-7)
- Presupuesto serverless: 8/8 intacto. La 017 es SOLO base de datos; no
  crea funciones en api/ ni nuevas variables de entorno. Las ramas nuevas
  (museo_publico, dm_*, arbol_*, casa_*) entran en api/usuarios.js,
  api/interacciones.js y api/admin.js del mismo release de codigo.

Aviso de alcance: la migracion 017 solo prepara el esquema. El perfil
publico, el arbol, las Casas y el DM funcionan recien cuando el codigo de
WP-2 a WP-6 viaja en el mismo deploy.

---

## Paso 1 - Pre-requisito: confirmar que 016 ya esta aplicada

1. La 017 depende de 015 (vocaciones, consumibles de perfil) y 016
   (faccion, device_hashes, email_verificado). La 016 ya esta aplicada en
   produccion; confirmar que tambien lo esta la 015.
2. Pre-chequeo opcional (solo lectura) para ver el estado real antes de
   aplicar, ADR-006. En el editor SQL de Neon:

    SELECT DISTINCT tipo FROM chat_salas ORDER BY tipo;

   Resultado esperado hoy: 'ciudad' y 'viajeros'. Esos dos valores deben
   caber en el CHECK que la 017 crea; si aparece un valor distinto, NO
   aplicar la 017 y reportarlo.

3. Alternativa local con el script versionado (no expone el secreto):

    $env:DATABASE_URL="postgresql://..."; node scripts/verify_017_precheck.js

   El script es read-only (information_schema, pg_constraint, pg_indexes y
   SELECT DISTINCT) y reporta: si usuarios.bio existe (existe), si
   consumibles.categoria existe (no existe) y los indices de chat.

---

## Paso 2 - Aplicar la migracion 017 en Neon

1. Abrir el editor SQL de Neon (produccion).
2. Ejecutar el archivo COMPLETO
   db/migrations/017_perfil_publico_arbol_casas.sql en UNA sola corrida.
   Es idempotente: si algo queda a medias, re-ejecutar el archivo completo
   es seguro (ADD COLUMN IF NOT EXISTS, DROP CONSTRAINT IF EXISTS +
   ADD CONSTRAINT, CREATE TABLE/INDEX IF NOT EXISTS, ON CONFLICT DO
   NOTHING, UPDATE de categoria idempotente).
3. Cuidado con el cliente de Neon: las sentencias DDL no devuelven filas y
   en algunas herramientas locales aparece el error "Cannot read properties
   of undefined (reading 'map')". No significa fallo del SQL; la migracion
   es re-aplicable sin riesgo.

---

## Paso 3 - Ejecutar el bloque de verificacion (solo lectura)

Correr sentencia por sentencia y confirmar los resultados. El mismo bloque
esta comentado al final del archivo 017.

(a) Columnas nuevas en usuarios (esperadas 8):

    SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema='public' AND table_name='usuarios'
        AND column_name IN ('intereses','pais_base','casa','casa_elegida_en',
          'progreso_arbol','perfil_config','perfil_publico','dm_abierto')
      ORDER BY column_name;

Esperado: intereses jsonb NOT NULL default '[]'::jsonb; pais_base character
varying(2) NULL; casa character varying(20) NULL; casa_elegida_en timestamp
with time zone NULL; progreso_arbol jsonb NOT NULL default '{}'::jsonb;
perfil_config jsonb NOT NULL default '{}'::jsonb; perfil_publico boolean
NOT NULL default true; dm_abierto boolean NOT NULL default true.

(b) Constraints de Casa y de tipo de chat:

    SELECT conname, pg_get_constraintdef(oid) AS def
      FROM pg_constraint
      WHERE conname IN ('chk_usuarios_casa','chk_chat_salas_tipo')
      ORDER BY conname;

Esperado: chk_usuarios_casa con CHECK (casa IS NULL OR casa IN
('condor','jaguar','delfin')); chk_chat_salas_tipo con CHECK (tipo IS NULL
OR tipo IN ('viajeros','ciudad','region','plan','dm')).

(c) Columna categoria y consumibles de perfil:

    SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema='public' AND table_name='consumibles'
        AND column_name='categoria';

    SELECT clave, nombre, precio_xp, categoria FROM consumibles
      WHERE categoria='perfil' ORDER BY precio_xp;

Esperado: categoria character varying(30) NOT NULL default 'general'; y 7
consumibles de perfil (3 de la 015 + 4 de la 017): marco_dorado (700),
marco_plata (300), tema_oscuro (500), banda_artista (900),
vitrina_destacada (650), titulo_custom (800), fondo_paisaje (1000).

(d) Tabla usuario_bloqueos e indices de la 017:

    SELECT tablename FROM pg_tables
      WHERE schemaname='public' AND tablename='usuario_bloqueos';

    SELECT indexname FROM pg_indexes
      WHERE schemaname='public' AND indexname IN (
        'idx_chat_salas_dm_unica','idx_chat_salas_dm_a','idx_chat_salas_dm_b',
        'idx_usuario_bloqueos_bloqueado','idx_usuarios_casa',
        'idx_usuarios_pais_base','idx_interacciones_usuario_tipo_activo')
      ORDER BY indexname;

Esperado: la tabla existe y los 7 indices aparecen.

(e) Columna clave_dm de chat_salas:

    SELECT column_name, data_type FROM information_schema.columns
      WHERE table_schema='public' AND table_name='chat_salas'
        AND column_name='clave_dm';

Esperado: clave_dm character varying(80).

Si cualquiera de los conteos no coincide, NO desplegar el codigo todavia y
reportar el resultado exacto.

---

## Paso 4 - Desplegar en Vercel

1. Confirmar que el release lleva juntos los cambios de codigo de WP-2 a
   WP-6 (registro.html, perfil.html, mi-perfil.html, comunidad.html,
   usuario-session.js, api/usuarios.js, api/interacciones.js,
   api/admin.js).
2. No hay variables de entorno nuevas: SESSION_JWT_SECRET, RESEND_API_KEY y
   SITE_URL ya se configuraron en la Entrega 016. Si esa configuracion
   quedo pendiente, completarla antes (ver docs/DEPLOY_016.md).
3. Desplegar (auto-deploy de Vercel desde GitHub o vercel --prod).
4. Recordatorio: la 017 por si sola no cambia ningun comportamiento visible;
   el efecto llega con el codigo del mismo release.

---

## Paso 5 - Smoke

1. Ejecutar el smoke versionado del release:

    node scripts/smoke_017_perfil_arbol_casas.js

   Debe cubrir, como minimo (WP-7): idempotencia DDL, museo_publico con
   perfil privado y publico, cobro de 20 XP del DM y su dedup de sala, fuga
   de DM en chat_mensajes (debe dar 0), gate de casa_elegir (cooldown y XP),
   calculo de tier de una rama y las 8 misiones de perfil.
2. Verificacion manual minima en el sitio desplegado:
   - Abrir perfil.html?id=<uuid> con perfil_publico=true (museo visible) y
     con perfil_publico=false (403 PERFIL_PRIVADO).
   - Abrir un DM nuevo desde perfil.html: confirmar el aviso de costo y el
     descuento de 20 XP; un segundo mensaje en el mismo hilo no cobra.
   - Confirmar que un hilo tipo='dm' NO aparece en el chat publico.
   - Elegir Casa (nivel >= 2): primera gratis; el cambio cobra 300 XP y
     activa cooldown de 30 dias.
   - La Tienda de Consumibles agrupa por categoria y muestra el chip Perfil
     con los 7 consumibles.

---

## Rollback si falla

1. NO hay downgrade de esquema: la 017 es ADITIVA (columnas, indices y una
   tabla nueva) y el codigo viejo las ignora. No hay perdida de datos.
2. Si el problema es de codigo, revertir el release al commit anterior
   (Vercel > Deployments > Promote).
3. Si el problema es de datos de consumibles, la categoria esta en la
   columna categoria; el seed no pisa filas existentes (ON CONFLICT DO
   NOTHING), por lo que no hay nada que restaurar.
4. El unico DELETE fisico introducido es el desbloqueo en usuario_bloqueos
   (fila de relacion, ver cabecera de la 017); no afecta contenido.
