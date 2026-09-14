# DEPLOY 016 - ExploraCO Gaming v5.0 (Piramide de Referidos + Crowdsourcing)

Checklist de despliegue de la Entrega 016. Ejecuta los pasos EN ORDEN.
La migracion es idempotente (ADR-008) y las columnas nuevas son aditivas.

- Fecha de la entrega: 2026-09-14
- Spec de producto: `promptgamming.md`
- Migracion: `db/migrations/016_multinivel_crowdsourcing.sql`
- Smoke versionado: `scripts/smoke_016_multinivel_crowdsourcing.js`
- Variables de entorno: ver `.env.example` (raiz del repo)

## Archivos del release

| Archivo | Version / cambio |
|---|---|
| `api/usuarios.js` | v9 (registro con `?ref=`, 4 facciones, verificacion de email, JWT) |
| `api/interacciones.js` | v13 (piramide con reparto, Activo Oculto Wayfarer, nonce anti-replay, vocaciones) |
| `api/admin.js` | moderacion de activos ocultos + reparto piramidal al aprobar |
| `admin.html`, `mi-perfil.html`, `comunidad.html`, `usuario-session.js` | frontend / sesion |
| `db/migrations/016_multinivel_crowdsourcing.sql` | esquema nuevo (NO se despliega, se aplica en Neon) |

## Variables de entorno de la entrega

| Variable | Uso | Estado |
|---|---|---|
| `SESSION_JWT_SECRET` | Firma/valida el JWT de sesion (HMAC SHA-256) | [OBLIGATORIA EN PRODUCCION] |
| `RESEND_API_KEY` | Verificacion de email (usuarios.js) y notificaciones (admin.js) | [OBLIGATORIA EN PRODUCCION] (pendiente desde TASK-006) |
| `DEV_EMAIL_ECHO` | Devuelve `debug_token` solo con `'true'` | SOLO DESARROLLO, ausente en prod |

Referencia completa (archivo:linea) de donde se leen:

- `SESSION_JWT_SECRET`: `api/usuarios.js:121` (firmarSesion), `api/interacciones.js:1094` (validarSesion).
- `RESEND_API_KEY`: `api/usuarios.js:150` y `:428`, `api/admin.js:67`.
- `DEV_EMAIL_ECHO`: `api/usuarios.js:432`.
- `SITE_URL`: `api/usuarios.js:417` (base del enlace de verificacion).
- `DATABASE_URL`: `api/usuarios.js:190`, `api/admin.js:110`, `api/interacciones.js:1451` y demas endpoints.
- `ADMIN_SECRET`: `api/admin.js:27`, `api/interacciones.js:1481` y demas (fallback publico `exploraco12345`).
- `ADMIN_EMAIL`: `api/admin.js:17` (opcional, default `admin@exploraco.co`).

---

## Paso 1 - Aplicar la migracion 016 en Neon

1. Abrir el editor SQL de Neon (produccion).
2. Ejecutar el archivo COMPLETO `db/migrations/016_multinivel_crowdsourcing.sql`
   en UNA sola corrida. Es idempotente: re-ejecutar es seguro.
3. Verificar los conteos del bloque de diagnostico del propio archivo
   (`db/migrations/016_multinivel_crowdsourcing.sql:186-209`):
   - 10 columnas nuevas en `usuarios`: `referido_por`, `codigo_referido`,
     `xp_ref_total`, `referidos_directos_contados`, `faccion`,
     `faccion_elegida_en`, `email_verificado`, `email_token`,
     `email_token_expira`, `device_hashes`.
   - 4 tablas nuevas: `activos_ocultos`, `activos_ocultos_votos`,
     `activos_ocultos_checkins`, `geo_nonces`.
   - 8 indices nuevos: `idx_usuarios_codigo_referido`,
     `idx_usuarios_referido_por`, `idx_usuarios_faccion`,
     `idx_activos_ocultos_estado_creado`, `idx_activos_ocultos_ciudad`,
     `idx_activos_ocultos_votos_usuario`, `idx_activo_checkin_unico`,
     `idx_geo_nonce_unico`.

Prerrequisito: migraciones 010 a 015 ya aplicadas (asi consta en NEXT.md).

## Paso 2 - Configurar variables en Vercel

Dashboard de Vercel (Project > Settings > Environment Variables) o CLI:

```
vercel env add SESSION_JWT_SECRET production
vercel env add RESEND_API_KEY production
vercel env add SITE_URL production
```

1. `SESSION_JWT_SECRET`: generar un secreto aleatorio fuerte y distinto de
   cualquier otro valor del proyecto. Sugerencia de generacion:

   ```
   node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
   ```

2. `RESEND_API_KEY`: la API key real de Resend (TASK-006).
3. `SITE_URL`: `https://exploraco.co` cuando el dominio propio este activo
   (TASK-004); si no, dejar el default o `https://exploraco.vercel.app`.
4. Confirmar que `DATABASE_URL` y `ADMIN_SECRET` ya existen y son los de
   produccion. `ADMIN_SECRET` debe tener un valor propio y NO el fallback
   `exploraco12345`.
5. NO configurar `DEV_EMAIL_ECHO` en produccion (ausente o distinto de
   `'true'`).

## Paso 3 - Desplegar en UN SOLO release

1. Confirmar que `api/usuarios.js` (v9), `api/interacciones.js` (v13) y
   `api/admin.js` viajan juntos en el mismo commit/push.
2. Desplegar (auto-deploy de Vercel desde GitHub o `vercel --prod`).
3. ADVERTENCIA CRITICA: el JWT de sesion SOLO funciona si las tres
   funciones serverless comparten el MISMO `SESSION_JWT_SECRET`. Si se
   despliega una funcion con un secreto distinto (o sin el), los usuarios
   reciben 401 al validar la sesion (contrato de la Entrega 016).
4. Si `SESSION_JWT_SECRET` falta, el codigo cae al fallback publico
   `dev_secret` y los tokens de sesion son falsificables. NO anunciar el
   release sin confirmar la variable antes.

## Paso 4 - Verificacion en produccion (smoke manual)

Ejecutar cada flujo end-to-end en el sitio desplegado:

1. Registro con `?ref=<codigo>`: crear usuario nuevo, confirmar que queda
   ligado un `referido_por` al codigo del referente.
2. Verificacion de correo: solicitar `email_verificar_solicitar`, recibir
   el enlace y confirmar (`email_verificado=true`). Con `RESEND_API_KEY`
   real NO debe devolver `debug_token` ni 503.
3. Elegir faccion: seleccionar una de las 4 (exploradores/curadores/
   creadores/artistas); cobro y cooldown de 15 dias.
4. Activo Oculto (Wayfarer): proponer un activo, votarlo y hacer el checkin
   geolocalizado (requiere nonce y sesion valida).
5. Moderacion admin: aprobar/rechazar desde `admin.html` (recurso
   `activos_ocultos`); aprobar debe otorgar +50 XP al proponente con el
   reparto piramidal.
6. Sesion JWT: verificar que las llamadas con `Authorization: Bearer <jwt>`
   funcionan y que un token alterado devuelve 401.

Opcional local: `node scripts/smoke_016_multinivel_crowdsourcing.js`.

## Paso 5 - Rollback si falla

1. Revertir las variables de entorno en Vercel (quitar `SESSION_JWT_SECRET`
   nueva o restaurar la anterior) y redeployar.
2. NO hay downgrade de esquema: las columnas y tablas de la migracion 016
   son ADITIVAS y seguras. No es necesario revertir la migracion ni hay
   perdida de datos; el codigo viejo ignora las columnas nuevas.
3. Si el fallo es de JWT, coordinar el secreto en las TRES funciones antes
   de reintentar (usuarios.js, interacciones.js, admin.js en lo relativo a
   validacion interna).
4. Revertir el release de codigo al commit anterior (Vercel > Deployments >
   Promote).

## Notas finales

- El fallback `dev_secret` de `SESSION_JWT_SECRET` NO debe usarse en
  produccion.
- Confirmar la variable en Vercel ANTES de anunciar el release.
- Nunca commitear valores reales: `.env`, `.env.local` y `.env.*.local`
  estan en `.gitignore`; `.env.example` es la unica plantilla versionada.
