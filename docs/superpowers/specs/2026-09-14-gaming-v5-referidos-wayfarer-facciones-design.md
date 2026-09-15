# Especificación de diseño - Entrega 016 "ExploraCO Gaming v5.0": pirámide de referidos, Wayfarer (Activo Oculto), 4 facciones y mundo artistas

**Fecha:** 2026-09-14
**Estado:** IMPLEMENTADO en working tree (pendiente aplicar la migración 016 en Neon + configurar `SESSION_JWT_SECRET`/`RESEND_API_KEY`/`SITE_URL` en Vercel + deploy en un solo release)
**ADR:** ADR-027 (pirámide de referidos + crowdsourcing Wayfarer + 4 facciones + mundo artistas) y ADR-025 (sesión firmada JWT / anti-Sybil, que consume el candidato reservado desde ADR-024)
**Task:** TASKS.md TSK-101
**Prompt origen:** `promptgamming.md` ("Entrega 016 - ExploraCO Gaming v5.0", aprobada por arquitectura y verificada contra el repo real)
**Migración:** `db/migrations/016_multinivel_crowdsourcing.sql` (NUEVA, 209 líneas, idempotente ADR-008, ASCII-safe ADR-002; PENDIENTE de aplicar en Neon)
**Checklist de despliegue:** `docs/DEPLOY_016.md`
**Documentos maestros:** `exploraco desarrollo/ampliacion desarrollo/ExploraCO_Gamificacion_v5_Plan_Maestro.md` (gaming) y `.../ExploraCO_Sistema_Social_v5.md` (apartado social).
**Smoke:** `scripts/smoke_016_multinivel_crowdsourcing.js` (39/39 PASS)

---

## Índice

1. Objetivo
2. Contexto (lo que ya existía)
3. Decisiones de diseño (bloques)
4. Esquema (migración 016)
5. Endpoints (ramas nuevas, sin archivos nuevos)
6. Frontend
7. Verificación (Escudo GOLD)
8. Estado de implementación y pendientes operativos
9. Gaps conocidos (referencia)
10. ADR relacionados

---

## 1. Objetivo

Construir la capa v5.0 del sistema de gamificación de ExploraCO sobre el motor v4.0
(ADR-018), sin crear funciones serverless (presupuesto Vercel Hobby 8/8, ADR-010) y
sin romper el modelo de datos vigente (MERGE JSONB, ADR-003). La entrega agrega cinco
piezas:

1. **Pirámide de referidos multinivel** (5 niveles, reparto porcentual con topes).
2. **Crowdsourcing Wayfarer "Activo Oculto"** (proponer / votar por quórum / checkin
   geolocalizado / moderar).
3. **4 Facciones** (exploradores, curadores, creadores, artistas) con elección y cambio.
4. **Vocaciones del mundo artistas** (músico, cine, artista gráfico, escritor) en bloque
   al nivel 5.
5. **Sesión firmada JWT + anti-Sybil** (nonce de un solo uso, device fingerprint, email
   verificado) y **presencia física** en `visita`.

Todo es una extensión de los endpoints `api/usuarios.js` (v9), `api/interacciones.js`
(v13) y `api/admin.js`, más los frontends `mi-perfil.html`, `comunidad.html`,
`admin.html` y `usuario-session.js`.

---

## 2. Contexto (lo que ya existía)

- **Motor gaming v4.0 (ADR-018):** 20 niveles en 4 eras derivados de `xp_total`, economía
  de consumibles con de-nivel, cromos, Parches (clanes) con fama y retos, 28 misiones y 30
  logros server-side, 5 senderos `tabla_destino`.
- **Presencia física v4.0 (ADR-024):** geocerca Haversine server-side en `POST tipo=visita`,
  radios adaptativos, dedup-first + índice único parcial, bono rural, logro `logr_pionero`.
  El ADR-024 dejó abierto el **candidato ADR-025**: sesión firmada / atestación de
  dispositivo contra el spoofing de `lat/lng/accuracy`.
- **Comunidad social (ADR-014/015/023):** chat y planes reales, álbumes, comentarios tipo
  Facebook y mapa audiovisual.
- **Restricción dura:** 8 funciones serverless (BLUEPRINT.md sección 2); toda mecánica
  nueva entra como rama `tipo=`/`body.tipo`.

La Entrega 016 resuelve a la vez el candidato anti-spoofing de ADR-024 y el siguiente
salto de producto (red social competitiva), manteniendo el presupuesto en 8/8.

---

## 3. Decisiones de diseño (bloques)

### Bloque 1 - Pirámide de referidos multinivel

- **Modelo:** `usuarios.referido_por` (self-FK) + `codigo_referido` (varchar(20), índice
  único parcial) + `xp_ref_total` (campo de apoyo) + `referidos_directos_contados`.
- **Código:** 6 caracteres de un alfabeto sin ambiguos
  (`abcdefghjkmnpqrstuvwxyz23456789`), generado y persistido al primer pedido del usuario
  verificado (`GET tipo=referido_codigo`).
- **Red:** CTE recursiva de máximo 5 niveles, agregada por nivel (`GET tipo=referido_red`).
- **Reparto:** `FLOOR` de 0.10/0.05/0.03/0.02/0.01 sobre `xp_ref_total` según el nivel del
  ancestro, inyectado en los 14 puntos de XP real de `interacciones.js` (excluye
  `admin_xp`, `comprar_consumible`, `album_voto` y `review_voto`).
- **Topes anti-farming:** 500 referidos directos contados y 20 referidos/día; anti-auto-referido
  (relogin con el código propio -> 400).
- **Registro con `?ref=`:** sólo el brazo INSERT completa el árbol (el `ON CONFLICT DO
  UPDATE` no toca `referido_por`).

### Bloque 2 - Wayfarer "Activo Oculto" (crowdsourcing geoespacial)

- **Propuestas peer-to-peer** (`activos_ocultos`) con estado `pendiente/aprobado/rechazado`.
- **Votación** (`activos_ocultos_votos`, PK compuesta `(activo_id, usuario_id)`, voto
  `favor/contra`); el estado se recalcula server-side en la misma sentencia del voto.
- **Quórum:** `votos_favor - votos_contra >= 3` -> aprobado; `<= -3` -> rechazado. Sin
  quórum y sin votos nuevos en 30 días, la propuesta se lee como rechazada (estado derivado).
- **Checkin geolocalizado** (`activos_ocultos_checkins`): reutiliza la geocerca Haversine de
  ADR-024, índice único parcial `(activo_id, usuario_id) WHERE activo = true`, cooldown 90 s
  y tope diario; exige `nonce` de un solo uso y `device_hash` registrado.
- **Moderación admin:** `activo_oculto_moderar` (Bearer admin): aprobar +50 XP al proponente
  con reparto piramidal, rechazar sin XP, borrado lógico (`activo=false`), sin re-pago si ya
  estaba aprobado.
- **Gates:** proponer exige `email_verificado` (sin gate de nivel); votar exige JWT +
  `email_verificado` + nivel 5.

### Bloque 3 - 4 Facciones

- **`usuarios.faccion`** con CHECK: `exploradores`, `curadores`, `creadores`, `artistas`.
- **Primera elección gratis** (`WHERE faccion IS NULL`, requiere email verificado).
- **Cambio:** cuesta 500 `xp_total` + cooldown de 15 días (`faccion_elegida_en`); 402
  `PUNTOS_INSUFICIENTES` o 429 `COOLDOWN_FACCION`.
- **Ranking:** agregado por facción (miembros, XP total) + top 3 por facción con ROW_NUMBER
  (`GET tipo=faccion_ranking`).
- **No persistido:** el nivel/era/badge se derivan de `xp_total`; la afinidad de Parche y el
  control territorial quedan **SOLO DOCUMENTADOS** (no se implementan en esta entrega).

### Bloque 4 - Vocaciones / Mundo artistas

- **4 vocaciones acumulables, todas al nivel 5:** `musico`, `cine`, `artista_grafico`,
  `escritor` (catálogo en código, patrón LOGROS).
- **Modelo:** `usuarios.vocaciones jsonb` (migración 015), sólo guarda las claves activadas;
  toggle con gate de nivel server-side (403).
- **6 misiones de artista** (`grupo: 'artista'`).
- Unifica en bloque lo que ADR-026 describía con niveles distintos por vocación.

### Bloque 5 - Sesión firmada JWT y anti-Sybil (ADR-025)

- **JWT HMAC SHA-256:** `firmarSesion` en `api/usuarios.js:115-125`; `validarSesion` en
  `api/interacciones.js:1086-1111` con `crypto.timingSafeEqual`; payload `{sub, iat, exp}`,
  duración 7 días; secreto `SESSION_JWT_SECRET` (OBLIGATORIO en producción; el fallback
  `dev_secret` es inseguro).
- **Rutas protegidas (3):** `visita`, `activo_oculto_votar`, `activo_oculto_checkin`.
- **Nonce de un solo uso:** `geo_nonces`, TTL 2 min, consumo atómico (`usado=true`), emitido
  con `GET tipo=geo_nonce_solicitar` y consumido en visita y checkin.
- **`device_hashes`:** jsonb con máximo 5 huellas; el checkin exige un `device_hash` registrado.
- **Email verificado (Resend):** `email_verificar_solicitar` / `email_verificar_confirmar`
  (token 32 bytes, 24 h); gate para referidos, proponer/votar Activos y fundar Parche.
- **Cliente:** `usuario-session.js` guarda y adjunta el JWT (refresh silencioso).

### Bloque 6 - Presencia física en visitas

- `POST tipo=visita` ya exigía geocerca (ADR-024); la entrega suma **JWT + nonce** al mismo
  handler. El frontend debe adjuntar `Authorization: Bearer` y `nonce` (hoy **ROTO**, ver
  sección 8 y BUG-036).

---

## 4. Esquema (migración 016)

`db/migrations/016_multinivel_crowdsourcing.sql` (209 líneas, idempotente ADR-008,
ASCII-safe ADR-002):

- **10 columnas en `usuarios`:** `referido_por` (uuid self-FK), `codigo_referido`
  (varchar(20), índice único parcial), `xp_ref_total` (int), `referidos_directos_contados`
  (int), `faccion` (varchar(20) CHECK), `faccion_elegida_en` (timestamptz),
  `email_verificado` (boolean), `email_token`, `email_token_expira`, `device_hashes`
  (jsonb NOT NULL DEFAULT `'[]'`).
- **4 tablas:** `activos_ocultos`, `activos_ocultos_votos`, `activos_ocultos_checkins`,
  `geo_nonces`.
- **8 índices** (unicidad del código, dedup de votos, unicidad de checkin, nonce único,
  búsquedas de propuestas/estado, etc.).
- Idempotencia DDL verificada **13/13**.

La migración es **aditiva**: el código viejo ignora las columnas nuevas; no requiere
downgrade para rollback.

---

## 5. Endpoints (ramas nuevas, sin archivos nuevos)

Presupuesto **8/8 INTACTO** (cero archivos nuevos en `api/`).

- **`api/usuarios.js` v9:** `GET tipo=referido_codigo`, `GET tipo=referido_red`,
  `GET tipo=faccion_ranking`, `POST tipo=faccion_elegir`,
  `POST tipo=email_verificar_solicitar`, `POST/GET tipo=email_verificar_confirmar`,
  upsert de registro con `?ref=`; `firmarSesion` (JWT).
- **`api/interacciones.js` v13:** `GET tipo=geo_nonce_solicitar`,
  `GET tipo=activos_ocultos_pendientes`, `POST tipo=activo_oculto_proponer`,
  `POST tipo=activo_oculto_votar`, `POST tipo=activo_oculto_checkin`; helper
  `repartirXpReferidos` en 14 puntos de XP; `validarSesion` + `consumirNonce` en
  visita/votar/checkin; vocaciones en bloque nivel 5.
- **`api/admin.js`:** recurso `activos_ocultos` con `tipo=activo_oculto_moderar` (Bearer admin).

---

## 6. Frontend

- **`mi-perfil.html`:** sección "Mi Red" (código + copiar + QR + pirámide por niveles +
  stats), selector de facciones, panel de vocaciones y banner de verificación de email.
- **`comunidad.html`:** sección Activo Oculto (proponer/votar/pendientes), ranking de
  facciones y relabel visual Pandilla -> Parche (sólo texto).
- **`admin.html`:** panel de moderación de Activos Ocultos (aprobar/rechazar).
- **`usuario-session.js`:** catálogo de vocaciones nivel 5, fingerprint de dispositivo,
  JWT + refresh silencioso.

---

## 7. Verificación (Escudo GOLD)

- **Smoke dedicado:** `scripts/smoke_016_multinivel_crowdsourcing.js` **39/39 PASS**
  (salida "SMOKE 016 MULTINIVEL: OK").
- **`node --check`** PASS x3 (`api/usuarios.js`, `api/interacciones.js`, `api/admin.js`).
- **ASCII-safety:** 0 bytes >127 y 0 backticks en los `api/*.js`.
- **Balance de divs:** 0 en los HTML tocados.
- **Idempotencia DDL:** 13/13.
- **Presupuesto de endpoints:** 8/8 (8 archivos en `api/`, cero altas).

---

## 8. Estado de implementación y pendientes operativos

**Estado:** IMPLEMENTADO y verificado en working tree (SIN commitear).

**Pendiente operativo (bloqueante para producción, lo ejecuta Javier):**

1. **Aplicar `db/migrations/016_multinivel_crowdsourcing.sql` en Neon** antes del deploy
   (editor SQL, archivo completo en una corrida; idempotente). Prerrequisito declarado:
   migraciones 010-015 (verificar la 015 en Neon, ADR-006).
2. **Configurar variables en Vercel:** `SESSION_JWT_SECRET` (generar aleatorio fuerte) y
   `RESEND_API_KEY`; `SITE_URL`; confirmar `DATABASE_URL`/`ADMIN_SECRET`. NO configurar
   `DEV_EMAIL_ECHO` en producción.
3. **Deploy en UN SOLO release:** `api/usuarios.js` v9 + `api/interacciones.js` v13 +
   `api/admin.js`, compartiendo el MISMO `SESSION_JWT_SECRET`.
4. **Verificación en vivo:** registro con `?ref=`, verificación de correo, elección/cambio
   de facción, proponer/votar/checkin de Activo Oculto, moderación admin y sesión JWT
   (token alterado -> 401).
5. **Rollback:** revertir variables + redeploy (la migración 016 es aditiva).

---

## 9. Gaps conocidos (referencia)

Los flujos de UI que quedaron ROTO se registran con evidencia `archivo:linea` en
`BUGS_HISTORICOS.md`:

- **BUG-035:** referidos inalcanzables por web (`mi-perfil.html:1800` apunta a
  `/registro.html?ref=` inexistente; `usuario-session.js:219-255` no captura `?ref=`).
- **BUG-036:** `marcarVisitado` (`usuario-session.js:598-609`) no envía JWT ni `nonce`;
  el backend los exige (`api/interacciones.js:4734-4741`).
- **BUG-038:** conteo de miembros de Parche (`miembros_actuales` vs `miembros_count`).
- **BUG-040:** etiquetas de chat desfasadas (UI 3/12 vs backend 5/4).
- **BUG-042:** `album_crear` usa `floor(xp/100)+1` en vez de la tabla de 20 niveles.

El mapa completo de gaps (G-01..G-23) vive en
`ExploraCO_Sistema_Social_v5.md` sección 15.2.

---

## 10. ADR relacionados

- **ADR-027:** pirámide de referidos + crowdsourcing Wayfarer + 4 facciones + mundo artistas.
- **ADR-025:** sesión firmada JWT / anti-Sybil (nonce, device fingerprint, email verificado).
- **ADR-024:** presencia física y geocerca (base de visita y del checkin Wayfarer).
- **ADR-018:** motor gaming v4.0 (base sobre la que se construye).
- **ADR-010:** presupuesto 8/8 (sin endpoints nuevos).
- **ADR-008 / ADR-002:** migraciones versionadas idempotentes / ASCII-safe.
