# BLUEPRINT.md - ExploraCO

## Estado
- Version: v1.0
- Referencia tecnica principal del proyecto (AI-DOS Cap. 9.4)
- Basado en: pagina-destino.js v9, admin-destinos.js v2, admin.html (baseline aproximado ~7.800 lineas -- ver NEXT.md para el conteo exacto; por ADR-006 este numero es solo referencial, nunca metodo de verificacion)

## 1. Arquitectura general

ExploraCO sigue una arquitectura serverless ligera: sin frameworks frontend, sin ORM, con generacion de HTML 100% en servidor mediante concatenacion de strings (Vanilla JS estricto, ver DECISIONS.md ADR-001).

Flujo completo del sistema:

```
ADMIN (admin.html)
  -> collectPlace() recoge todos los campos del formulario
  -> _placeToAPI(p) traduce al formato Neon (incluye tagsObj)
  -> _syncToNeon(p) hace POST/PUT a /api/admin-destinos
  -> admin-destinos.js v2 (INSERT/UPDATE, merge JSONB)
  -> Neon PostgreSQL
  -> Visitante pide /{slug}.html
  -> vercel.json rewrite -> /api/pagina-destino?slug=...
  -> pagina-destino.js v9 hace SELECT en 4 tablas
  -> buildHTML() ensambla el HTML final
  -> respuesta enviada con Cache-Control: no-store
```

## 2. Endpoints (api/*.js) - presupuesto fijo: 8 de 8 (Vercel Hobby)

| Endpoint | Metodo(s) | Responsabilidad |
|---|---|---|
| destinos.js | GET | Listado publico, filtros, modo=mapa, stats (Cache s-maxage=10) |
| usuarios.js | GET/POST | Perfil, leaderboard, upsert de usuario; v9 (Entrega 016): registro con `?ref=`, piramide de referidos, 4 facciones, verificacion de email y sesion firmada JWT (`firmarSesion`); v12 (TSK-103 / ADR-028): GET `perfil_publico` (ligero), GET `casa_ranking`, POST `casa_elegir`, POST `perfil_actualizar` (alias `perfil_editar`) y blindaje PII owner-aware en `?id=`/`?buscar=`/`referido_codigo`; **header real HOY v18** (ADR-035, 2026-09-17: XP `numeric(12,2)`, `casa_ranking` con `miembros_activos` y orden por `xp_total DESC`; el v14 fue el hotfix BUG-054 del SQL del merge de `device_hashes`, ver BUGS_HISTORICOS.md BUG-054; **v16 = TSK-112 / ADR-038, 2026-09-18**: `casa_ranking` extendido con `xp_cofre_total`/`factor_conversion`/tag/multiplicador y nueva rama POST `clase_elegir`; **v17 = TSK-118 / ADR-041, 2026-09-18**: `casa_ranking` expone `lider_user_id`/`tributo_pct` con degradacion escalonada 42P01/42703 y refresco best-effort del lider por Casa antes de leer; **v18 (hotfix post-QA J-3, 2026-09-18)**: throttle de 60 s por instancia al refresco del lider (cache de proceso, no distribuida); **ramas de Marca (TSK-119..TSK-122 / ADR-042, 2026-09-18, header SIN bump: sigue v18)**: `GET ?tipo=mi_marca`, `POST ?tipo=marca_activar` (gate `calcularNivel(xp_total).nivel >= 5`) y `POST ?tipo=marca_patrocinar`); **v19 = ADR-053 / TSK-148, 2026-09-21**: `NIVELES` pasa a ser la fuente SERVIDOR de los 20 umbrales nuevos (techo 42000) + campo `mult` (`M_nivel`), `conNivel` expone `nivel_visible = GREATEST(nivel derivado, nivel_max)` y agrega `nivel_max`, y los costos de eleccion quedan en constantes unicas 800 (faccion) / 500 (Casa) / 500 (Clase)) |
| interacciones.js | GET/POST | Rese\u00f1as, guardados, visitas, calculo de XP; v13 (Entrega 016): `repartirXpReferidos` en 14 puntos de XP, Activo Oculto Wayfarer (proponer/votar/checkin + moderacion), `validarSesion` JWT (timingSafeEqual) y nonce geoespacial; v15 (TSK-103 / ADR-028): GET `museo_publico`, DM (`dm_enviar`/`dm_hilos`/`dm_mensajes`/`dm_bloquear`), GET `arbol_catalogo`/`arbol_usuario`, POST `rama_activar`, GET `consumibles?categoria=`, catalogo RAMAS 16x5 + `RAMA_TIERS`, Origen derivado con bono x1.2 en `D_R` y 8 misiones `perfil`; **v18 (ADR-035, 2026-09-17)**: XP `numeric(12,2)` con redondeo half-up a 2 decimales (helper `red2`), sin `::int` en las sumas de XP y NUEVA rama GET `tipo=pandilla_ranking` (ranking global de Parches por `fama_total DESC` con `miembros_activos`); **v19 (ADR-036, 2026-09-17)**: POST `tipo=compartir` (25 XP primer share / 5 XP posteriores, tope 10 eventos y 50 XP/24h, `validarSesion` obligatoria, ledger en `media_compartidos` sin tocar el CHECK de `interacciones.tipo`), 3 misiones + 3 logros nuevos, POST `media_voto`/`media_comentar`, GET `media_interacciones`/`media_comentarios`, alias legacy conservados y TODOS los lectores migrados a `media_*`; **v21 = TSK-112 / ADR-038, 2026-09-18**: factor de nivelacion de Casa (`calcularXpFinal`), tributacion del 10% al cofre (`acreditarClaseYCofre`) y `xp_clase`/`nivel_clase` aplicados a 14 acciones de la whitelist; **v22 = TSK-114/TSK-115 / ADR-039 + ADR-040, 2026-09-18** (release compartido): ramas `POST/GET ?tipo=museo_recurso` (Museo URL-only sobre `album_fotos`, con visibilidad server-side por `af.visible`), filtro `af.visible=true` en los lectores publicos (incluidos conteos y subqueries de votos; `mis_guardados_media` sin filtro), misiones `mis_videografo`/`mis_sonidista` (`gate_nivel:2`; catalogo 41) y campos aditivos `gate_nivel`/`desbloquea`/`nivel` en `?tipo=misiones` (acordeon de niveles); **v23 = TSK-118 / ADR-041, 2026-09-18 + hotfixes post-QA J-1/J-2**: canal oficial broadcast (`GET ?tipo=chat_salas` expone `es_oficial`; hotfix J-1: `chat_salas`/`chat_msg` degradan con fallback 42703 si la 026 no esta aplicada; `chat_msg` responde 403 a no-admin en la sala oficial, NUEVA rama `POST ?tipo=anuncio_oficial` con Bearer `ADMIN_SECRET`), NUEVA rama `POST ?tipo=casa_tributo_config` (admin o `lider_user_id`; hotfix J-2: la authz del lider exige `validarSesion`, BUG-064, rango 0..15), NUEVO `GET ?tipo=casa_misiones`, tributo configurable via `casas_cofre.tributo_pct` en `acreditarClaseYCofre` y helper `avanzarMisionesCasa` (misiones conjuntas de Casa con hooks en foto/resena/visita/xp_total); **v25 = ADR-053 / TSK-148, 2026-09-21**: motor unico de XP reescrito (`calcularXpFinal` con doble cap secuencial 5.0/10.0 + `obtenerMultiplicadorNivel`/`leerConfigGamificacion`/`calcularXpAcreditado`/`armarXpDetalle`/`registrarXpLedger`/`esLiderDestino`), catalogo unico `XP_BASES` de 19 claves, 29 puntos instrumentados en `xp_ledger`, `NIVELES_LOCAL` sincronizado como espejo (sin `require` cruzado), nueva rama `?tipo=spot_atributos` y bases nuevas (resena_larga 30, foto_viajero 20, ao_checkin 20, ao_proponer +30 cap 3/dia, plan_crear +20 cap 3/dia, plan_unirse +6 cap 5/dia, bono rural 25; `mis_plan_creador` 25->10 y `mis_plan_unido` 15->10)); **v26 = ADR-054 / TSK-149, 2026-09-21**: guardados de media dentro de "Mis Albumes" (supersede el concepto de carpetas privadas de ADR-052): `mis_guardados_media` EXIGE sesion firmada, deriva el dueno del token (ignora `usuario_id` del query) y devuelve `albumes[]` + `mi_album_id`/`mi_album_titulo`/`visible` por item (conserva `data[]` y el 503 `SCHEMA_NOT_MIGRATED` tipado); `guardados_carpeta` reescrito a `accion=album|publicar` (410 `CARPETAS_DEPRECADAS`, 404 `ALBUM_NO_ENCONTRADO`/`GUARDADO_NO_ENCONTRADO`; desasignar fuerza `visible=false` en la MISMA sentencia); `album_detalle` agrega `guardados[]`/`albumes_guardados[]` con invariante de no-fuga; hardening BUG-061 en `guardar_media`/`quitar_guardado_media`/`album_crear`. `api/pagina-destino.js` agrega `AND af.visible=true` (fix BUG-082, ADR-039 D.1) |
| admin-destinos.js | GET/POST/PUT/DELETE | CRUD completo con auth Bearer (v2 reescrito) |
| publicar-lugar.js | POST | Formulario publico, crea destino en status=draft |
| pagina-destino.js | GET | HTML dinamico premium por slug (v9, motor principal) |
| admin.js | GET/POST | Recursos admin: solicitudes, rese\u00f1as, destacado, notificaciones; v2 (TSK-103 / ADR-028): `categoria` en `consumibles_lista`/`consumibles_crear`/`consumibles_editar` (400 `CATEGORIA_INVALIDA`); v3/v4 (ADR-053 / TSK-148, 2026-09-21): rama NUEVA **`GET ?recurso=salud_red`** (router real `?recurso=`, gate Bearer `auth()`) con por_dia/por_accion/caps/`distribucion_nivel {derivado, visible}`/exentos/`nivel_max_vs_derivado`/alertas desde `xp_ledger`, degradacion 42P01, y espejo `NIVEL_DERIVADO_SQL` validado por `smoke_niveles_espejos.js` |
| utilidades.js | GET | sitemap, visitas, fotos, diagnostico; v2 (TSK-103 / ADR-028): `STATIC_PAGES` incluye `/registro.html` y `/perfil.html` |

Nota critica: el limite de 8 funciones esta en su maximo. Cualquier endpoint nuevo requiere fusionar responsabilidades dentro de un archivo existente via query params (patron ya usado en admin.js y utilidades.js), no crear un archivo nuevo.

Autenticacion: header `Authorization: Bearer exploraco12345`. Variables de entorno en Vercel: `DATABASE_URL`, `ADMIN_SECRET`, `RESEND_API_KEY` (pendiente de configurar desde TASK-006), `SESSION_JWT_SECRET` (NUEVA en la Entrega 016: firma/valida el JWT de sesion HMAC SHA-256; debe ser el MISMO valor en `usuarios.js` e `interacciones.js`; el fallback `dev_secret` es inseguro en produccion), `SITE_URL` (base del enlace de verificacion de correo) y `DEV_EMAIL_ECHO` (solo desarrollo; ausente en produccion). Plantilla versionada: `.env.example`. Checklist de despliegue: `docs/DEPLOY_016.md`.

Documentacion maestra del sistema social/gaming (detalle completo; BLUEPRINT resume la arquitectura): `exploraco desarrollo/ampliacion desarrollo/ExploraCO_Gamificacion_v5_Plan_Maestro.md` (602 lineas) y `exploraco desarrollo/ampliacion desarrollo/ExploraCO_Sistema_Social_v5.md` (878 lineas). El `ExploraCO_Gamificacion_v4_Plan_Maestro.md` queda como referencia HISTORICA (solo lectura).

`vercel.json` rewrites clave:
```
/:slug.html  -> /api/pagina-destino?slug=:slug
/sitemap.xml -> /api/utilidades?tipo=sitemap
```

## 3. Modelo de datos (Neon PostgreSQL)

### Tabla `destinos` (principal)
Campos fijos comunes a las 4 categorias: id, slug, nombre, categoria_slug, lead, descripcion, highlight, sintro, ciudad, region, barrio, address, lat, lng, whatsapp, telefono, email, web, instagram, precio_desde, horario, emoji, hero_bg, foto_hero, rating, total_resenas, status, destacado, verificado, booking, hostelworld, airbnb, tipo, capacidad, como_llegar, tags (jsonb), creado_en, actualizado_en.

Nota ADR-034 (ficha de destino): `sintro` es una columna TEXT nullable (max 200, editable en el admin tab GENERAL, `#f-sintro`) con el subtitulo de apertura de la seccion "Sobre este lugar". El render la usa con fallback a los 150 caracteres de `descripcion` o a `highlight` (`api/pagina-destino.js`, variable `sobreIntro`). Se persiste normalizada por `normSintro` en `api/admin-destinos.js` (SELECT/INSERT/UPDATE) y `api/publicar-lugar.js`. Requiere aplicar `db/migrations/020_destinos_sintro.sql` en Neon (patron BUG-021) antes del deploy: hasta entonces el INSERT/UPDATE con `sintro` falla por columna inexistente.

Nota TSK-095: `verificado` (booleano) es COLUMNA gestionada por admin-destinos.js con el patron identico a `destacado` (guard `!== undefined` en UPDATE permite desmarcar/DESTILDAR). Es control INTERNO del admin (checkbox `f-verificado` en admin.html); pagina-destino.js NO renderiza ninguna insignia publica del campo. Ver DECISIONS.md ADR-019. La columna `address` (campo `f-address` del admin, codigo) YA se persiste en Neon: `admin.html` `_placeToAPI` la envia en POST y PUT (L5807); `api/admin-destinos.js` INSERT la persiste (L103 columnas, `$10`, L137 valores) y el fieldMap del UPDATE la incluye (L220); `api/pagina-destino.js` lee `d.address || d.barrio` (L764, el chip del hero muestra la direccion exacta cuando existe y cae a `barrio` si no). Unica accion manual pendiente: APLICAR la migracion `db/migrations/011_ficha_direccion_destinos.sql` en el editor SQL de Neon (`ALTER TABLE destinos ADD COLUMN IF NOT EXISTS address TEXT;`, idempotente, patron ADR-008) -- hasta aplicarla, el INSERT/UPDATE de admin-destinos.js fallaria al persistir un destino con `address` porque la columna no existiria aun.

Nota de nomenclatura obligatoria (evita el bug historico de campos vacios, ver BUGS_HISTORICOS.md BUG-007): usar siempre `ciudad` (no `city`), `descripcion` (no `desc`), `telefono` (no `tel`), `precio_desde` (no `price`), `creado_en` (no `created_at`).

### Tabla `destinos_fotos`
Galeria de imagenes por destino: id, destino_id (FK), url, caption, orden, es_hero, creado_en.

### Tabla `destinos_detalles`
Detalles estructurados (principalmente hostal, pero reutilizable): destino_id (PK/FK), checkin, checkout, habitaciones (jsonb), amenidades (jsonb), faqs (jsonb), booking_url, hostelworld_url, airbnb_url, scores (jsonb).

### Tabla `interacciones`
Rese\u00f1as, guardados y visitas: id, usuario_id (FK, nullable = anonimo), destino_id (FK), tipo (resena/guardado/visita/foto/rating), rating (1-5), texto, xp_ganado, `activo` (boolean, default true; soft-delete de guardado/visita), `dims` (JSONB, evidencia por interaccion: dims de resena y `dims.geo` de la visita), `traveller_type`, creado_en.

Nota ADR-024 (Presencia Fisica + Espacial v4.0, 2026-09-12): el POST `tipo=visita` de `api/interacciones.js` (v11) aplica una geocerca Haversine server-side contra `destinos.lat/lng` (sin endpoint nuevo, 8/8) con radios adaptativos (default/urbano 100 m; `naturaleza`/`aventura`/keyword rural 250 m; `parque` 150 m; evento 150 m; `festival`/`deporte` 200 m; blog rechazado), anti-spoofing (accuracy <=150 m, cooldown 90 s, velocidad <=69.4 m/s, tope 30 en ventana movil de 24 h, rechazo de `0,0`), dedup-first + indice unico parcial `idx_interacciones_visita_unica` (23505 -> 200 `ya_visitado`), reactivacion con xp 0 y `quitar_visita` como soft-delete (`activo=false`). `zona`/`zona_motivo` (`subcategoria`/`keyword`/`densidad`/`urbano`; `sin_geocerca` sin coords). Bono rural plano +20 XP y logro `logr_pionero`. Evidencia en `interacciones.dims.geo` (sin migracion de columnas). El conteo GET de `api/utilidades.js?tipo=visitas` filtra `activo=true`. La migracion `db/migrations/014_reset_visitas_presencia_fisica.sql` hace la purga fisica unica de las visitas gamificadas con respaldo de auditoria. Detalle: DECISIONS.md ADR-024 y `docs/superpowers/specs/2026-09-12-presencia-fisica-gamificacion-v4-design.md`.

### Tabla `usuarios`
Perfil y gamificacion: id, email (unique), nombre, xp_total, nivel, badge_actual, total_resenas, creado_en.

Nota ADR-027 (Entrega 016, migracion `db/migrations/016_multinivel_crowdsourcing.sql`): 10 columnas nuevas -- `referido_por` (uuid self-FK nullable), `codigo_referido` (varchar(20), indice unico parcial), `xp_ref_total` (int, campo de apoyo del reparto piramidal), `referidos_directos_contados` (int), `faccion` (varchar(20) con CHECK `exploradores/curadores/creadores/artistas`), `faccion_elegida_en` (timestamptz), `email_verificado` (boolean), `email_token` + `email_token_expira` (verificacion por Resend), y `device_hashes` (jsonb NOT NULL DEFAULT `'[]'`, tope 5). El nivel/era/badge siguen derivandose de `xp_total` (nunca persistidos). La afinidad de Parche a faccion y el control territorial se calculan en consulta (no persistidos).

### Tablas de crowdsourcing y anti-replay (ADR-027 / ADR-025, migracion 016)
- **`activos_ocultos`:** propuestas Wayfarer (`propuesto_por`, `nombre`, `descripcion`, `lat`/`lng` numericos, `foto_url`, `categoria`, `ciudad`, `estado` con CHECK `pendiente/aprobado/rechazado`, `votos_favor`/`votos_contra` con CHECK `>= 0`, `activo` para soft-delete, `creado_en`, `resuelto_en`).
- **`activos_ocultos_votos`:** un voto por usuario y propuesta (PK compuesta `activo_id + usuario_id`; CHECK `favor/contra`).
- **`activos_ocultos_checkins`:** presencia fisica sobre activos aprobados (`lat`/`lng`/`accuracy`, `activo`); indice unico parcial `idx_activo_checkin_unico (activo_id, usuario_id) WHERE activo = true`. Reutiliza la geocerca Haversine de ADR-024.
- **`geo_nonces`:** nonce de un solo uso para geolocalizacion firmada (ADR-025), `expira_en DEFAULT now() + interval '2 minutes'`, indice unico `idx_geo_nonce_unico`.

Nota de gobernanza: la migracion 016 es **aditiva e idempotente** (ADR-008: `IF NOT EXISTS` + constraints con nombre). Su aplicacion es un paso manual en Neon (lo ejecuta Javier) antes del deploy; los 8 endpoints siguen 8/8 (sin archivos nuevos en `api/`).

### Nota ADR-028 (Entrega TSK-103, migraciones 017 y 018) -- columnas, tablas y constraints nuevos

La Entrega TSK-103 agrega superficie de datos aditiva e idempotente (ADR-008) SIN columnas/tablas nuevas en `api/` (8/8 intacto, ADR-010):
- **`usuarios` (migracion 017):** `intereses` (jsonb NOT NULL DEFAULT `'[]'`), `pais_base` (varchar(2)), `casa` (varchar(20), CHECK `chk_usuarios_casa`), `casa_elegida_en` (timestamptz), `progreso_arbol` (jsonb NOT NULL DEFAULT `'{}'`), `perfil_config` (jsonb NOT NULL DEFAULT `'{}'`), `perfil_publico` (boolean NOT NULL DEFAULT true), `dm_abierto` (boolean NOT NULL DEFAULT true). Indices `idx_usuarios_casa` e `idx_usuarios_pais_base`. `progreso_arbol`/`perfil_config` se actualizan por merge JSONB (ADR-003).
- **`consumibles.categoria` (migracion 017 la agrega; migracion 018 la reparte):** varchar(30) NOT NULL DEFAULT `'general'`. La 018 categoriza los 17 consumibles: `perfil` 7, `impulso` 3, `social` 4, `coleccion` 2, `general` 1. Agregar categorias nuevas no exige migracion (catalogo administrable). Se evita `LIKE 'perfil_%'` por el comodin `_`.
- **`chat_salas.clave_dm` (migracion 017):** varchar(80) con el par de uuid ordenado de la conversacion DM (`split_part(clave_dm,'_',1/2)`); CHECK `chk_chat_salas_tipo` (se elimina antes `chat_salas_tipo_check` legacy para no duplicar) e indice unico parcial `idx_chat_salas_dm_unica` + `idx_chat_salas_dm_a`/`idx_chat_salas_dm_b`. El INSERT del hilo usa `ON CONFLICT (clave_dm) WHERE tipo='dm'`.
- **Tabla `usuario_bloqueos` (migracion 017):** relacion de bloqueo entre dos usuarios, PK compuesta (`bloqueador_id` + `bloqueado_id`), CHECK `chk_usuario_bloqueos_distintos` e indice `idx_usuario_bloqueos_bloqueado`. Guarda relaciones, no contenido.
- **Indice `idx_interacciones_usuario_tipo_activo` (migracion 017):** soporte de las consultas de acciones del usuario para el Arbol de Clases.

Deuda detectada (patron BUG-021): `interacciones.activo` y `usuarios.bio`/`usuarios.activo` existen en Neon sin estar declaradas en ninguna migracion versionada; no se declaran en 017 para no chocar con la realidad. Su aplicacion (017 y luego 018) es manual en Neon antes del deploy: `docs/DEPLOY_017.md`.

### Nota ADR-035 (Entrega TSK-109, migracion 021) -- XP decimal `numeric(12,2)` y rankings de comunidad

El XP se almacena en `numeric(12,2)` (migracion `db/migrations/021_xp_decimal.sql`, idempotente ADR-008 con guard `information_schema` y `format('%I')`, sin indices). `numeric` es exacto en base 10 y la conversion `int4 -> numeric(12,2)` es EXACTA y sin backfill (`125 -> 125.00`): no hay redondeo, truncamiento ni saturacion. Los contadores que NO son XP siguen `integer` (`total_resenas`, `total_guardados`, `total_visitas`, `votos_favor/contra`, `progreso_arbol.bonos`, `RAMA_TIERS`, `FAMA_TIERS`, `cantidad`, `miembros`, etc.).

- **Columnas convertidas (9):** `usuarios.xp_total`, `usuarios.xp_ref_total`, `interacciones.xp_ganado` (NO versionada; la 021 la cubre con guard `IF EXISTS`), `album_votos.xp_ganado`, `album_fotos.xp_otorgado_autor`, `compra_consumibles.xp_pagado`, `pandilla_retos.xp_bono`, `consumibles.precio_xp` y `pandillas.fama_total`. `pandillas.fama_total` NO se recomputa: solo cambia de tipo (el acumulador historico incluye el efecto del consumible `trompeta_fama` x2 y drift de misiones/logros; ver ADR-024/ADR-035).
- **Redondeo:** un unico helper half-up a 2 decimales por lenguaje (`red2`/`redondearXp` en JS; `ROUND(expr, 2)` en SQL). Regla: redondear en la ACREDITACION, nunca en la lectura. Prohibido `parseInt`/`::int` sobre columnas XP. El driver de Neon devuelve `numeric` como STRING en el JSON, por lo que todo row se normaliza a `Number` redondeado en el borde (si no, la API emitiria `"xp_total":"125.50"`).
- **Ramas de ranking:** `GET /api/usuarios?tipo=casa_ranking` pasa a ordenar por `xp_total DESC` (ya no por `xp_promedio`) y agrega `miembros_activos`; NUEVA `GET /api/interacciones?tipo=pandilla_ranking` (global, `fama_total DESC` con desempate `creado_en ASC`, limit 50, con `miembros` y `miembros_activos`). Sin endpoints nuevos (8/8, ADR-001).
- **"Miembro activo vigente":** `usuarios.activo = true` AND `usuarios.ultimo_acceso > NOW() - INTERVAL '30 days'`. `usuarios.activo`, `usuarios.ultimo_acceso` e `interacciones.xp_ganado` siguen NO versionadas (patron BUG-021, ver `BUGS_HISTORICOS.md`); si la consulta falla con `42703` se reintenta la MISMA consulta sin la condicion de actividad y se responde `miembros_activos = 0` con `console.warn` (nunca catch vacio).
- **Paso manual obligatorio:** aplicar la 021 en Neon ANTES del deploy del backend decimal (si no, Postgres redondea por cast de asignacion en silencio); checklist en `docs/DEPLOY_021.md`. Rollback `numeric(12,2) -> integer USING ROUND(col)`: exacto mientras no haya decimales acumulados y LOSSY despues.
- **Sin `tags` JSONB nuevo:** el motor `CATEGORY_TAG_FIELDS`/`CATEGORY_TAG_LISTS` de la seccion 6 no aplica a esta entrega.

### Nota ADR-036 (Entrega TSK-110, migraciones 022 y 023) -- comparticiones, media unificada y guardados polimorficos

La Entrega TSK-110 agrega dos migraciones aditivas e idempotentes (ADR-008) y NO crea archivos en `api/` (8/8 intacto, ADR-001): todo entra como ramas `?tipo=` de `api/interacciones.js` v19.

- **Tabla `media_compartidos` (migracion 022):** ledger de comparticiones (`id`, `usuario_id` FK, `destino_id` FK, `fuente` CHECK `destino|curada|viajero_foto|album_foto`, `item_id text` 1..64, `canal` CHECK `web_share|whatsapp|copiar|otro`, `es_primero`, `xp_ganado numeric(12,2)`, `creado_en`). Indice unico PARCIAL `media_compartidos_primero_uq (usuario_id,fuente,item_id) WHERE es_primero = true` (deteccion atomica del primer share via `ON CONFLICT ... WHERE es_primero = true DO NOTHING`; PLAN B documentado con `media_compartidos_unicos` si el planner no infiere el indice parcial) + `idx_media_compartidos_usuario_dia` e `idx_media_compartidos_item`. **`'compartir'` NO se agrega al CHECK de `interacciones.tipo`** (tabla base no versionada).
- **Tablas `media_votos` / `media_comentarios` / `media_comentario_likes` (migracion 023):** contrato polimorfico con `fuente` (`curada|viajero_foto|album_foto`) e `item_id text` 1..64. `media_votos` con PK compuesta `usuario_id,fuente,item_id` y soft-delete `activo`; `media_comentarios` con lista de adyacencia `parent_id` (tombstone `activo`, texto 1..1000); `media_comentario_likes` con PK compuesta y sin XP. `xp_ganado` es `numeric(12,2)` (coherente con ADR-035).
- **`media_guardados` (019) extendida por la 023:** `item_id uuid -> text` (`USING item_id::text`, valores preservados) y CHECK de `fuente` ampliado con `'curada'` (`album|album_foto|viajero_foto|curada`). Backfill idempotente desde `album_votos`, `interacciones tipo='foto'` (`dims.voto_foto_id`), `album_comentarios` (por niveles, tope 50) y `album_comentario_votos`, todo `ON CONFLICT DO NOTHING`. **Las tablas legacy NO se dropean** (solo se copian; Cero Borrado Logico).
- **Fuentes canonicas de media:** `curada` -> `destinos_fotos.id`; `viajero_foto` -> `interacciones.id` `tipo='foto'`; `album_foto` -> `album_fotos.id`. `galeria_destino` devuelve `items[]` v2 (`fuente`, `votos`, `comentarios`, `ya_votado`, `ya_guardado`, `tipo_voto:'media'`) con metricas en lote sin N+1.
- **Paso manual obligatorio:** aplicar 022 y 023 en Neon ANTES del deploy del backend v19 (el backend consulta tablas que deben existir; los smokes de la entrega usan mock y NO validan Neon). Preflight 6.1 de la 023: confirmar el tipo real de `destinos_fotos.id` (tabla base NO versionada). Deuda de las 3 tablas legacy no dropeadas y del esquema base no versionado: `BUGS_HISTORICOS.md`, seccion "Deuda ADR-036".
- **Gamificacion:** +3 misiones y +3 logros por compartir -> catalogo real 39 misiones / 33 logros (ADR-006: los totales anteriores de 28/30 estaban desactualizados).

### Nota ADR-038 (Entrega TSK-112, migracion 024) -- cofre de Casas, factor de nivelacion y Clases Rising Star

La Entrega TSK-112 agrega superficie de datos aditiva e idempotente (ADR-008) y NO crea archivos en `api/` (8/8 intacto, ADR-001/ADR-010): todo entra como ramas/extensiones de `api/usuarios.js` v16 y `api/interacciones.js` v21. **Esta nota NO altera el Arbol de 16 ramas de ADR-028 (`usuarios.progreso_arbol`) ni el modelo de Casas de ADR-028 (`usuarios.casa`):** reutiliza el segundo y coexiste con el primero.

- **`usuarios` (migracion `db/migrations/024_casas_cofre_y_clases.sql`, 232 lineas):** 4 columnas nuevas -- `clase_id varchar(20)` (CHECK `chk_usuarios_clase`: `cartografo|cronista|explorador`), `nivel_clase int NOT NULL DEFAULT 1`, `xp_clase numeric(12,2) NOT NULL DEFAULT 0` y `clase_elegida_en timestamptz`. NO se crea `casa_id` (se reusa `usuarios.casa`).
- **Tabla `casas_cofre`:** cofre y nivelacion por Casa -- `casa varchar(20) PRIMARY KEY` (CHECK `chk_casas_cofre_casa`: `condor|jaguar|delfin`), `xp_cofre_total numeric(12,2)`, `poblacion_activa int`, `factor_conversion numeric(5,4)` y `actualizado_en timestamptz`; seed idempotente `INSERT ... ON CONFLICT (casa) DO NOTHING` de las 3 Casas y **sin FK** `usuarios.casa -> casas_cofre.casa` en v1. `poblacion_activa`/`factor_conversion` son cache NO autoritativa.
- **Indice `idx_usuarios_clase_id`:** parcial sobre `usuarios (clase_id) WHERE clase_id IS NOT NULL`. La 024 NO crea `idx_usuarios_casa_id` (no existe `casa_id`) ni `casas_votaciones` (diferida a v2).
- **Paso manual obligatorio:** aplicar la 024 en Neon ANTES del deploy del backend v16/v21 (el backend consulta columnas y la tabla `casas_cofre` que deben existir; las 019-023 ya estan aplicadas, confirmado por Javier el 2026-09-17). El smoke `scripts/smoke_038_casas_clases.js` (76/76 PASS) usa mock y NO valida Neon.
- **Detalle funcional:** factor de nivelacion runtime `dominante` (>45%, x0.85)/`equilibrada` (25%-45%, x1.00)/`rezagada` (<25%, x1.30); tributacion del 10% del `xp_final` al cofre (best-effort, sin endpoint `casa_tributar`); `BONUS_CLASE` = cartografo 0.08/cronista 0.10/explorador 0.07; `XP_NIVEL_CLASE` de 11 umbrales y `xp_clase` = 50% del `xp_final`. Contrato vigente en DECISIONS.md ADR-038 + ENMIENDA 1.

### Nota ADR-039 + ENMIENDA 1 (Entrega TSK-114/TSK-116, migracion 025) -- Museo URL-only y visibilidad por recurso

La Entrega TSK-114/116 agrega superficie de datos aditiva e idempotente (ADR-008) y NO crea archivos en `api/` (8/8 intacto, ADR-001/ADR-010): todo entra como ramas `?tipo=` de `api/interacciones.js` v22.

- **`album_fotos.visible` (migracion `db/migrations/025_album_fotos_visible.sql`, 171 lineas):** `boolean NOT NULL DEFAULT false` (privado por defecto) + backfill idempotente `UPDATE album_fotos SET visible=true WHERE activo=true AND visible=false` (el contenido legacy activo conserva su visibilidad publica) + indice unico parcial `idx_albumes_usuario_mi_museo ON albumes (usuario_id) WHERE titulo='Mi Museo' AND activo=true`. **NO crea `album_fotos.activo`:** ya existe desde la migracion 009.
- **Rama `?tipo=museo_recurso` v22:** `POST` (crear/editar/eliminar sobre `album_fotos`, URL-only `http(s)` <= 2000, `visible` default false, auto-album "Mi Museo", coords persistidas en `albumes`, `barrio` descartado) y `GET` (listado con visibilidad SERVER-SIDE: el dueno ve todo; el resto solo `af.visible=true`; `usuario_id` opcional = dueno de sesion). Auth por `validarSesion` (ADR-025) con el usuario tomado de la sesion.
- **Filtros `af.visible=true`** en `multimedia_mapa` (sin `scope=mio`), `mis_fotos`, `museo_publico` (conteos y votos), `mi_feed_fotos`, `fotos_top`, `album_detalle` y `galeria_destino`; `mis_guardados_media` SIN filtro (bookmarks privados).
- **XP y misiones (ENMIENDA 1 de ADR-039):** gate unico `mis_fotografo` para foto, video y audio (evita deadlock circular) y **+15 XP para los 3 tipos**; catalogo 41 con `mis_videografo` ("Cronicas en Movimiento") y `mis_sonidista` ("Ecos y Relatos"), `xp:15`, `gate_nivel:2`. El texto original de ADR-039 (opcion 7 / decision E) queda SUPERSEDIDO.
- **Paso manual obligatorio:** aplicar 024 y luego 025 en Neon ANTES del deploy del backend v22; preflight read-only `scripts/verify_025_precheck.js`.
- **Assets frontend (no cuentan contra 8/8):** `niveles-data.js` (fuente unica de `XP_LEVELS`/capacidades para el acordeon de ADR-040) y `map-picker.js` (selector de coordenadas compartido; `admin.html` y `mi-perfil.html` lo consumen). **ADR-040** agrega `MISION_GATE_XP` + `nivelDeMisionServidor` y los campos aditivos `gate_nivel`/`desbloquea`/`nivel` en `?tipo=misiones`.

### Nota ADR-041 (Entrega TSK-118, migracion 026) -- canal oficial, tributo/lider/misiones de Casa

La Entrega TSK-118 agrega superficie de datos aditiva e idempotente (ADR-008) y NO crea archivos en `api/` (8/8 intacto, ADR-001/ADR-010): todo entra como ramas `?tipo=` de `api/interacciones.js` **v23** (base v22 de ADR-039/ADR-040 + hotfixes post-QA J-1/J-2) y una extension de `api/usuarios.js` **v18** (v17 + hotfix J-3).

- **`chat_salas.es_oficial` (migracion `db/migrations/026_casas_comunicaciones.sql`, 329 lineas):** `boolean DEFAULT false`. Semilla idempotente del canal "Anuncios ExploraCO" (tipo `viajeros`, `orden=-1`, icono `E'\U0001F4E3'`; requiere la cuenta admin) e indice unico parcial `uq_chat_salas_oficial` (una sola sala oficial). NO se toca `chk_chat_salas_tipo`.
- **`casas_cofre` (026):** `tributo_pct NUMERIC(4,2) DEFAULT 10.00` + CHECK `casas_cofre_tributo_pct_check` (0..15) y `lider_user_id UUID REFERENCES usuarios(id)` (sin cascada: el proyecto no borra usuarios).
- **Tablas nuevas (026):** `casa_roles` (`rol IN lider|oficial|mariscal|miembro`, UNIQUE `(casa, usuario_id)`, `activo`, indices `(casa, activo)` y `(usuario_id)`) y `casa_misiones` (`meta_tipo IN visitas|xp_total|resenas|fotos`, `meta_valor > 0`, `progreso_actual` cache NO autoritativa, `recompensa_xp`, `estado IN activa|completada|expirada`). Backfill del lider por `DISTINCT ON (casa) ... ORDER BY xp_total DESC` + poblado/degradacion de `casa_roles`; semilla de 1 mision base por Casa.
- **Ramas v23:** `GET ?tipo=chat_salas` expone `es_oficial` (con degradacion 42703 a `false AS es_oficial` si la 026 aun no esta aplicada); `chat_msg` responde 403 a no-admin en la sala oficial y tambien degrada 42703; `POST ?tipo=anuncio_oficial` (solo Bearer `ADMIN_SECRET`); `POST ?tipo=casa_tributo_config` (admin o `lider_user_id` con `validarSesion` obligatoria, hotfix J-2 / BUG-064, rango 0..15); `GET ?tipo=casa_misiones`. `acreditarClaseYCofre` lee `casas_cofre.tributo_pct` (default 10, clamp 0..15) en lugar del literal `0.10`; helper `avanzarMisionesCasa` con hooks en foto/resena/visita/xp_total.
- **`api/usuarios.js` v18:** `casa_ranking` expone `lider_user_id`/`tributo_pct` con degradacion escalonada (42P01 -> sin JOIN; 42703 -> `conLider=false`) y refresca el lider best-effort (3 sentencias) antes de leer; **v18** limita ese refresco a una vez cada 60 s por instancia (hotfix J-3).
- **Assets frontend (no cuentan contra 8/8):** `usuario-session.js` (20 titulos, 4 eras y modales de nivel-up/era), `comunidad.html` (canal oficial), `admin.html` (picker 500 px + circulo de rango) y `map-picker.js` (getters `getPickerMap()`/`getMiniMap()`).
- **Paso manual obligatorio:** aplicar 024 -> 025 -> 026 en Neon ANTES del deploy del backend v23/v18 y del frontend (patron BUG-021/BUG-060). La 024 y la 025 se consideran YA aplicadas por indicacion del usuario (2026-09-18). Preflight y verificacion post-aplicacion en las secciones 0 y final del `.sql`.

### Nota ADR-042 (Paquete TSK-119..TSK-122, migracion 027) -- zonas geograficas, marcas y patrocinios

La sesion "Modulos nuevos + bugs activos" (2026-09-18) agrega superficie de datos aditiva e idempotente (ADR-008) y NO crea archivos en `api/` (8/8 intacto, ADR-001/ADR-010): todo entra como ramas de `api/usuarios.js` (**header sin bump: sigue v18**) y fixes de frontend.

- **`zonas_geograficas` (migracion `db/migrations/027_zonas_marcas.sql`, 348 lineas):** 5 zonas fijas (`caribe`/`pacifico`/`andes`/`llanos`/`amazonia`) con emoji via `U&'\+xxxxxx'`; el `slug` es la clave natural que referencian areas y ranking.
- **`areas_geograficas`:** areas/barrios con `zona_slug`, centroide `lat`/`lng` y `radio_km DEFAULT 1.5`; **se crea VACIA** (la siembra con lat/lng reales via OSM queda como siguiente paso, ADR-042 decision e).
- **`ranking_zonas`:** materializacion por capa (`area`/`ciudad`/`zona`) de recursos de media; `recurso_tipo DEFAULT 'album_fotos'` (tabla real); `UNIQUE (recurso_id, recurso_tipo)` + 3 indices de score.
- **`marcas`:** 1 por usuario (`UNIQUE (usuario_id)`), `areas_influencia`/`enlaces` JSONB, `nivel_requerido DEFAULT 5` (hoy NO gobierna el gate: el backend usa `calcularNivel(xp_total).nivel >= 5`, porque `usuarios.nivel` esta stale).
- **`patrocinios`:** `marca_id` FK a `marcas`; `(tipo_objetivo, objetivo_id)` polimorfico **SIN FK** (no existen tablas `eventos`/`artistas`/`misiones`; el "parche" real es `pandillas`); deuda documentada, integridad del objetivo a cargo del backend.
- **`consumibles` (DB-02, aditivo):** `marca_id` (nullable), `stock_total` (NULL = ilimitado)/`stock_usado`, `precio_xp_base`/`precio_xp_actual NUMERIC(12,2)` (consistencia con 021) y `tipo_canje` (`qr`/`codigo`/`ticket`); vista `consumibles_precio` con precio efectivo oferta/demanda; indice parcial `idx_consumibles_marca`.
- **Ramas de `api/usuarios.js`:** `POST ?tipo=marca_activar` (L1192-1232), `POST ?tipo=marca_patrocinar` (L1234-1266) y `GET ?tipo=mi_marca` (L296-306). Auth JWT en las 2 de escritura; `mi_marca` queda como lectura publica por `usuario_id` (decision g de ADR-042, PENDIENTE).
- **Fixes de UI de la misma sesion:** `api/pagina-destino.js` `LIMIT 24 -> 200` (fix R10); `mi-perfil.html` FE-01 (Fotos publicadas solo para `brsk84@gmail.com`) y FE-02 (fusion "Clase & Arbol de Progreso" + host `#arbol-body`, BUG-066); `index.html` FE-03 (`mpa-media-pin-video` para video individual). Patron anti-regresion en ADR-043.
- **Paso manual obligatorio:** aplicar la 027 en Neon ANTES del deploy (preflight read-only `scripts/verify_027_precheck.js`); el cleanup de datos `db/cleanups/002_fix_fotos_brsk84.sql` es un paso aparte (patron BUG-021/BUG-060; causa en BUG-065).

### Nota ADR-044 (TSK-123, sin migracion) -- interacciones de media en Comunidad y asset compartido `media-actions.js`

La correccion "Comunidad > Audiovisual" (2026-09-18) NO crea funciones serverless (8/8 intacto, ADR-001/ADR-010) ni migraciones: extiende ramas `?tipo=` existentes de `api/interacciones.js` (header sin bump: sigue **v23**) y agrega 1 asset frontend.

- **Backend aditivo:** `GET ?tipo=mi_feed_fotos` (~L4853-4912) acepta `usuario_id` OPCIONAL (ignorado si no es UUID valido) y agrega `autor_id` (`af.autor_original_id`), `es_propia`, `ya_votado` y `ya_guardado`; el `ya_guardado` corre en una query separada envuelta en `conDegradacionMedia(..., 'media_guardados', [])` para que la ausencia de la migracion 019 no tumbe el feed. `GET ?tipo=albumes` (~L4252-4293) agrega el param OPT-IN `excluir_museo=1|true` (`AND LOWER(a.titulo) <> 'mi museo'`); sin el param el contrato queda intacto (galeria.html/museo_publico). `GET ?tipo=album_detalle` (~L4296-4364) devuelve `ya_guardado` y `es_propia` por foto ademas del `ya_votado` preexistente.
- **Asset frontend (no cuenta contra 8/8):** `media-actions.js` (raiz, 259 lineas, ASCII-safe) expone `window.MediaActions.{voto,guardar,sync,bind}` y un contrato de marcado `data-ma-*` (`data-ma-voto`/`data-ma-save` + `data-ma-fuente`/`data-ma-item`/estados). `voto` usa Bearer y respeta `esPropia`; `guardar` alterna `guardar_media`/`quitar_guardado_media`. Consumido por `galeria.html` (que elimina `gPostJson`/`gPintaVoto`/`gMediaVoto`/`gMediaGuardar`) y `comunidad.html`; patron identico al de `map-picker.js`/`niveles-data.js` (ADR-040, TSK-117). Detalle en DECISIONS.md ADR-044.
- **Bug corregido en la misma sesion:** `cargarAudiovisual(reset)` de `comunidad.html` invertia el `append` de `cargarAlbumesAV` y duplicaba albumes al cambiar de orden (BUG-067, CERRADO).
- **Pendiente operativo:** confirmar/aplicar 019 (`media_guardados`) y 023 en Neon; sin ellas el guardado degrada a `ya_guardado=false`. **BUG-065 (album_foto.visible) sigue ABIERTO** y afecta que la media legacy aparezca en el feed. **BUG-061 amplificado** por los nuevos botones Guardar.

### Nota sesion express (TSK-124..TSK-132, 2026-09-18/19) -- modulo `mymapa.js`, media del mapa y skill `express-mode`

La sesion ejecutada en "modo express" (skill `express-mode`, ver TSK-132) NO crea funciones serverless (8/8 intacto, ADR-001/ADR-010) ni migraciones nuevas; agrega assets frontend, ajustes de ramas `?tipo=` existentes y herramientas de diagnostico/proceso.

- **Asset frontend NUEVO `mymapa.js` (raiz, IIFE, ASCII-safe, sin backticks):** modulo compartido de "mapas personalizados" que expone `window.MyMap` sobre Leaflet (`window.L`). Lo consume el tab **Mapa** de `comunidad.html` (`#mm-personal-pills`/`#mm-personal-editbar`/`#mm-personal-map`/`#mm-personal-list`; `onTabMapaAV` -> `MyMap.init`). `index.html` elimina la seccion `#mymapa-section` y ~93 archivos HTML repuntan su ancla `index.html#mymapa-section` -> `mi-perfil.html`; los backups `index_pre_full.html` y `_lacandelaria3_body.html` conservan el ancla (Regla de Oro 3). Patron de asset compartido identico a `map-picker.js`/`niveles-data.js`/`media-actions.js`.
- **`comunidad.html` (tab Audiovisual):** las tarjetas de "Media reciente" abren un popup de detalle reutilizando `#av-album-modal` (`abrirMediaModal`, `avMediaHTML(item, large)`), con like/comentario/guardar via `media-actions.js` (ADR-044). Backend aditivo de `?tipo=albumes` (`excluir_museo=1`) y `?tipo=mi_feed_fotos`/`album_detalle` (`usuario_id` opcional).
- **`galeria.html` modo destino:** la galeria del lugar queda en 2 bloques (curadas `g-sec-dest` paginadas 12/pagina en cliente + comunidad `g-sec-com`); la rama `galeria_destino` deja de truncar a 12 (`gdFotos.forEach`), apoyada en el `LIMIT 200` de `destinos_fotos` (R10/TSK-119).
- **`mi-perfil.html`:** se retira "Fotos publicadas" del Museo y se fusionan Clase/Tabla de Destino/Vocaciones dentro del **"Arbol de Progreso"** (host `#arbol-body`, ADR-043/BUG-066). El backend de Clases (ADR-038) sigue vigente como dato.
- **Media del mapa cultural (`api/interacciones.js`, v23 sin bump):** `multimedia_mapa` pasa a LIMIT por rama (album 300 / destinos 300 / UNION ALL 600) para evitar starvation de la media de usuarios (**BUG-069**); `museo_recurso` (crear) captura `23505` y republica recursos ocultos sin re-otorgar XP (**BUG-068**); `album_agregar_foto` escribe `visible` default true y dedup republicable. La ficha (`api/pagina-destino.js`) cuenta votos de viajero desde `media_votos` (**BUG-070**).
- **Herramientas nuevas (read-only / datos):** `scripts/diagnose_media_oculta.js`, `scripts/diagnose_video_mapa.js`, `db/cleanups/003_publicar_media_oculta.sql` (idempotente, no borra) y `scripts/express_check.js` (verificacion minima: `node --check` + ASCII-safety + balance de divs).
- **Skill `express-mode`:** `.opencode/skills/express-mode/SKILL.md` + manual `exploraco desarrollo/ampliacion desarrollo/MODO_EXPRESS_ANALISIS.md` + `SKILL_MODO_EXPRESS.md`; referencia en `agents.md`, `GUIA_DE_DESARROLLO.md` (Apendice B) y `orquestacion agentes.md` (Skill 4). Se registra como nota de practica (no ADR) en DECISIONS.md.
- **Paso manual obligatorio:** aplicar `db/migrations/027` (previa) y los cleanups `002`/`003` en Neon, confirmar 019/023 y desplegar `api/interacciones.js` + `api/pagina-destino.js`.

### Motor del Mapa Cultural (`mapa-cultural.js`) -- ADR-045 (TSK-133 + TSK-134, sin migracion)

La feature "Mis mapas personales (comunidad) con paridad al mapa cultural del index" (TSK-133) y su continuacion TSK-134 (migracion del `index.html` al mismo motor) NO crean funciones serverless (8/8 intacto, ADR-001/ADR-010) ni migraciones: agregan 2 assets frontend y 1 smoke versionado, y modifican `mymapa.js` + `comunidad.html` (TSK-133) y `index.html` + `mapa-cultural.js` + el smoke (TSK-134). **Resultado: `index.html` y `mymapa.js` (comunidad) consumen el mismo motor.**

- **`mapa-cultural.js` (raiz, IIFE ASCII-safe, sin backticks):** motor compartido multi-instancia que expone `window.MapaCultural`. API publica: `create(opts)`/`init(opts)`, `setPlaces`, `setMedia`, `setMediaEnabled`, `setMediaTypes`, `refresh`, `getMap`, `openDrawer`, `closeDrawer`, `destroy`; helpers `esc`, `starHtml`, `photoPlaceholderHTML`, `haversineKm`. Motor: pines por categoria (`divIcon`/color), clustering por proximidad de 40 px, drawer completo (hero, badge, rating, precio, lead, tabs multimedia, "Ver lugar completo"), capa de media (iconos, bounds, tope 300, dedupe) y lightbox/album. Patron identico a `map-picker.js`/`niveles-data.js`/`media-actions.js`.
- **Opciones de compatibilidad v1.1.0 (default = comportamiento comunidad):** `enableMediaOnAll` (false: "Todo" no enciende media), `mediaEnabled` (estado inicial), `mediaFilter` (null/undefined = filtro estricto por destino; `false` = capa SIN filtro), `mediaPhotoIcon`, `clusterLinksNavigate` (false: el popup de cluster no navega solo a la lista), `mediaControls` (raiz donde el modulo engancha los botones `[data-media]`), `bindList` y los ganchos `data-comments-*`. `index.html` usa `enableMediaOnAll:true`, `mediaEnabled:false`, `mediaFilter:false`, `mediaPhotoIcon` U+1F4F8 (camara) y `clusterLinksNavigate:true` (`INDEX_MC_OPTS`).
- **Contrato de datos (normalizacion unica):** `normalizePlace` (`cat = categoria_slug || cat`, `uuid = _uuid || destino_id`, rating por defecto 0, descarta lat/lng no finitos) y `normalizeMedia`. Un solo shape para cualquier consumidor, sin importar el origen (directorio, mapa personal, etc.).
- **`mapa-cultural.css` (raiz):** 121 reglas extraidas 1:1 del CSS del mapa del index, scopadas bajo `.mc-root`, 0 `!important` reales (ADR-004); se enlaza desde `comunidad.html` (L14). **NO se enlaza en `index.html`**, que conserva su CSS inline a proposito (paridad visual).
- **Consumidor `mymapa.js` (comunidad):** elimina su Leaflet propio y `bindPopup`; usa `MapaCultural.create` (L125), el clic en pin abre el drawer completo y agrega la capa de media con toggle (`.mmx-media`/`.mmx-mbtn`, default ON si el mapa activo tiene media) alimentada por UN fetch cacheado de `/api/interacciones?tipo=multimedia_mapa` filtrado en cliente al mapa activo. `comunidad.html` carga `mapa-cultural.js` (L559) antes de `mymapa.js` (L561).
- **Consumidor `index.html` (TSK-134, MIGRADO en working tree):** retira el motor Leaflet inline (~1190 lineas, bloque 2256-3445) y el estado muerto, y deja shims (`initMapaSection` con retry si `!mcMapa.getMap()`, `refreshMapaMarkers` sin recursion, `geolocateMapa`, `resetMapaColombia`, `openMapaDrawer`/`closeMapaDrawer`, `INDEX_MC_OPTS`, `var mcMapa`) + bloque de carga lazy (IntersectionObserver/scroll/timeout 2 s) que preservan el contrato `window.mapaMap`/`onMapReady` y los helpers ajenos al mapa (`esc`/`starHtml`/`photoPlaceholderHTML`/`toggleMapaSave`/`renderMyMap`). Se quitaron los 4 `onclick` de `[data-media]` (los engancha el modulo via `mediaControls`); `<script src="mapa-cultural.js">` en L882. `api/*` e `index-api-connector.js` quedan intactos.
- **Capa de media - regla de filtrado:** SOLO items de los destinos del mapa activo; match estricto por slug para `origen='destino'`/`'destino_album'`; `origen='album'` SIEMPRE excluido. Sin cambios de backend. `mediaFilter:false` (index) desactiva ese filtro y usa toda `MAPA_MEDIA`.
- **Verificacion:** `scripts/smoke_mapa_cultural.js` **58/58 PASS** (normalizacion de ambos shapes, `setPlaces` antes de init, clustering 40 px, filtros de media: default estricto vs `mediaFilter:false` sin filtro); Escudo GOLD verde (`node --check` OK, ASCII 0/0/0, divs `index.html` 370/370 y `comunidad.html` 319/319, llaves CSS 121/121). QA APTO CON OBSERVACIONES; QA visual en navegador pendiente (TSK-135).
- **Seguridad:** `jsonAuthHeaders()` (L1354) hace que `guardarMedia`/`votarMedia` envien `Authorization`; mitiga (no cierra) la amplificacion de **BUG-061** (backend sigue ABIERTO, escalado a `sql-security`). Detalle en DECISIONS.md ADR-045.

### Nota ADR-053 (TSK-148, migracion 031) -- Gamificacion v6: `M_nivel`, `xp_ledger`, `gamificacion_config` y `nivel_max`

La Entrega TSK-148 agrega superficie de datos aditiva e idempotente (ADR-008) y NO crea archivos en `api/` (8/8 intacto, ADR-001/ADR-010): todo entra por ramas existentes (`?recurso=` en `api/admin.js`, `?tipo=` en `api/usuarios.js`/`api/interacciones.js`). Migracion **`db/migrations/031_gamificacion_v6_nivel_scaling.sql`** (24495 bytes), APLICADA en Neon el 2026-09-21.

- **`usuarios.nivel_max` (031):** `smallint NOT NULL DEFAULT 1`; techo historico de la INSIGNIA, sembrado UNA vez con la tabla de umbrales VIEJA (monotono con `GREATEST`: ningun usuario pierde insignia). `nivel_visible = GREATEST(calcularNivel(xp_total).nivel, COALESCE(nivel_max,1))`; el multiplicador `M_nivel` usa el nivel **DERIVADO** de `xp_total`, no `nivel_max`. `usuarios.nivel`/`badge_actual` siguen legacy (el backend NO las escribe).
- **`gamificacion_config` (031):** tabla clave/valor (`clave PK`, `valor numeric(12,4)`, `descripcion`, `actualizado_en`) con seed idempotente `cap_progresion=5.0`, `cap_global=10.0`, `m_nivel_max=3.0`; parametriza solo CAPS (no umbrales).
- **`xp_ledger` (031):** ledger unico de XP por evento (13 columnas: `usuario_id`, `accion`, `xp_base`, `m_nivel`, `mult_clase`, `factor_casa`, `mult_progresion`, `cap_progresion`, `mult_stack`, `mult_global`, `cap_global`, `cap_aplicado`, `bonos_planos`/`es_exento`/`contexto` JSONB), multiplicadores `numeric(10,6)`, CHECK `cap_aplicado IN ('ninguno','progresion','global','accion')` + 2 indices (`idx_xp_ledger_usuario_creado`, `idx_xp_ledger_accion_creado`). Se escribe best-effort (el XP se entrega aunque el ledger falle).
- **Repricing (031):** UPDATE ABSOLUTO de los 17 `consumibles.precio_xp` (impulso x2.0, resto x1.6) con guard `information_schema` para las columnas de la 027 (no aplicada); idempotente por valor absoluto.
- **Espejos y `NIVEL_DERIVADO_SQL`:** los 20 umbrales viven en 8 lugares sincronizados (`api/usuarios.js:NIVELES` = fuente servidor con campo `mult`, `api/interacciones.js:NIVELES_LOCAL` + `BADGES_LOCAL`, `usuario-session.js:XP_LEVELS`, `index.html`, `comunidad.html`, `niveles-data.js`, `admin.html:_jugNiveles` y `api/admin.js:NIVEL_DERIVADO_SQL`). NO hay `require` cruzado entre funciones serverless; la sincronizacion se verifica con `scripts/smoke_niveles_espejos.js` (10/10, incluye los 20 titulos). `RAMA_TIERS`/`ARBOL_UMBRALES` NO son espejos de esta tabla (falso positivo excluido).
- **Endpoint:** `GET ?recurso=salud_red` en `api/admin.js` v4 (ver seccion 2); `api/usuarios.js` v19 y `api/interacciones.js` v25 (ver seccion 2). Cero endpoints nuevos.
- **Paso manual:** la 031 debe estar aplicada ANTES del deploy del backend v25/v19/v4 (patron BUG-021/BUG-060; `42703` en cada acreditacion si falta). **YA aplicada en Neon (2026-09-21).** Las migraciones **027 y 028 siguen SIN aplicar** y no son requisito de la 031.
- **Rollback (LOSSY si ya hay XP emitido):** `DROP TABLE xp_ledger`; `DROP TABLE gamificacion_config`; `ALTER TABLE usuarios DROP COLUMN nivel_max`. No revierte el repricing (reescribir los 17 valores viejos).
- **Detalle funcional:** `M_nivel(N) = 1 + ((N-1)/19)*2` (x1.000..x3.000); doble cap secuencial progresion 5.0 / global 10.0 (rango efectivo `[0.85, 10.0]`, sin piso 1.0); umbrales N1..N20 con techo 42000; ledger instrumentado en 29 call-sites. Contrato vigente en DECISIONS.md ADR-053 + ENMIENDA 1; cierre en TASKS.md TSK-148.

### Nota ADR-054 (TSK-149, migracion 032) -- Guardados de media en "Mis Albumes": `media_guardados.album_id`/`visible` y fin de las carpetas privadas

La Entrega TSK-149 reorganiza los guardados de media dentro de "Mis Albumes" y NO crea archivos en `api/` (8/8 intacto, ADR-001/ADR-010): todo entra como cambios de `api/interacciones.js` v26 + un fix de `api/pagina-destino.js`. Migracion **`db/migrations/032_guardados_album.sql`** (17152 bytes, idempotente/ASCII-safe) **APLICADA en Neon el 2026-09-21 (idempotente verificada)**.

- **`media_guardados` (032):** `album_id uuid NULL REFERENCES albumes(id) ON DELETE SET NULL` + `visible boolean NOT NULL DEFAULT false` + CHECK `media_guardados_visible_album_chk (visible=false OR album_id IS NOT NULL)` + 2 indices. Visibilidad POR GUARDADO (nunca por album), coherente con ADR-039. La publicacion solo es visible en el detalle del album, con invariante de no-fuga (un guardado jamas se emite si su origen no es publico).
- **ELIMINADAS por la 032 (DROP):** tabla `guardados_carpetas` y columna `media_guardados.carpeta_id` (carpetas privadas de ADR-052, superseded). El DROP es irreversible; el preflight solo reporta el conteo por NOTICE (rollback lossy).
- **Contrato de lectura:** `GET mis_guardados_media` exige sesion, deriva el dueno del token y devuelve `albumes[]` (reemplaza `carpetas[]`) + `mi_album_id`/`mi_album_titulo`/`visible`; conserva `data[]` y el 503 `SCHEMA_NOT_MIGRATED` tipado. `POST ?tipo=guardados_carpeta` -> `accion=album|publicar` (410 `CARPETAS_DEPRECADAS`). `album_detalle` agrega `guardados[]`/`albumes_guardados[]`. Detalle funcional en DECISIONS.md ADR-054; cierre en TASKS.md TSK-149.
- **Fix colateral:** `api/pagina-destino.js` agrega `AND af.visible=true` a la consulta de fotos de album por cercania (**BUG-082**, violacion de ADR-039 D.1).
- **Paso manual obligatorio (BLOQUEANTE):** aplicar la 032 en Neon ANTES del deploy del backend v26 (patron BUG-021/BUG-060); el DROP abre una ventana de 503 para el backend v24/v25 vivo. Orden obligatorio: 032 -> backend v26 -> frontend.

## 4. Motor de tags JSONB (modulo central)

El campo `destinos.tags` es el mecanismo que permite escalar a nuevas categorias sin alterar el esquema relacional. Cada categoria define su propia forma de tags:

- **Sitio** (implementado): tipo_actividad, dificultad, dificultad_desc, dificultad_tags[] (Sprint 2: {texto, apto:boolean}), duracion, altitud, horario_visita, precio_entrada, distancia, como_llegar, temporada (legado, rangos de texto), temporada_matriz (Sprint 2: objeto {Ene..Dic: ideal|posible|evitar}), permisos, tours[] (Sprint 2: + tipo_tour, idioma, max_personas), equipamiento[], entradas[], itinerario[], fauna_flora, secretos, regulaciones. **ADR-016:** `subcategoria` (slug ASCII de lista cerrada) + claves nuevas condicionales: colecciones[], recorridos[], accesibilidad[], programacion[], musica_vivo{}, cover{} (objeto {valor, nota} solo para cover condicional nocturno; fallback legacy `cover_valor`/`cover_nota`), codigo_vestimenta, happy_hour{}, atracciones[], horarios_zona[], actividades_gratis[], que_ver[], contexto.
- **Hostal** (implementado, Sprint 3 / TASK-001): tipo_alojamiento, politica_cancelacion, edad_minima, mascotas, cocina_compartida, actividades[], reglas_casa, que_incluye[]. **ADR-034:** `orden_modulos[]` (array de ids con el orden de las secciones de la ficha hostal; ver seccion 5).
- **Comida** (implementado, Sprint 4 / TASK-002): tipo_comida, cocina, precio_promedio, reservas, menu_destacado[], horario_detallado{}, opciones_dieta[], ambiente, terraza, domicilio, domicilio_plataformas[]. **ADR-016:** `subcategoria` (slug ASCII de lista cerrada).
- **Evento** (implementado, Sprint 5 / TASK-003): fecha_inicio, fecha_fin, edicion, sede, lineup[], agenda[], categorias_entrada[], que_llevar[], prohibido[]. **ADR-016:** `subcategoria` (slug ASCII de lista cerrada). Nota: "capacidad" y "entrada desde" se evaluaron para esta categoria pero NO se agregaron como campos de `tags` -- el admin ya tenia inputs propios (`f-aforo`/`f-entrada-desde`) duplicando 1 a 1 los campos genericos ya existentes y compartidos por las 4 categorias (`f-capacidad` -> columna `destinos.capacidad`; `f-price` -> columna `destinos.precio_desde`). Se eliminaron los duplicados y Evento reusa esos 2 campos genericos (ver BUGS_HISTORICOS.md BUG-019, punto 6).

**Subcategorias (ADR-016):** lista cerrada de slugs ASCII por categoria, fuente de verdad compartida por admin (`CATEGORY_TAG_LISTS.<cat>`), publicar.html, `api/publicar-lugar.js` (SUBCAT_LISTA), `pagina-destino.js` (SUBCAT_LABEL + SITIO_SECCIONES_POR_SUBCATEGORIA) y `validate_ficha.js` (SUBCATEGORIAS):
- **sitio** -> [naturaleza, museo, cultura, bar, parque, espacio-publico, sitio-historico, religioso, aventura]
- **comida** -> [restaurante, cafe, gastrobar, comida-rapida, dulces]
- **evento** -> [concierto, festival, teatro, exposicion, deporte, cine, fiesta]

El renderer gatea las secciones de sitio por subcategoria via `subcatActiva()` (matriz modulo-por-subcategoria en `SITIO_SECCIONES_POR_SUBCATEGORIA`); si `tags.subcategoria` esta ausente el fallback renderiza todo el bloque legacy de sitio (regresion cero). La migracion de datos legacy se hace con `scripts/reclasificar-subcategorias.js` (idempotente, dry-run/apply, merge JSONB ADR-003). Detalle completo: DECISIONS.md ADR-016 y TASKS.md TSK-090.

**Motor de interacciones y presencia fisica (ADR-024, 2026-09-12):** ademas del motor de tags, `api/interacciones.js` resuelve la geocerca de `tipo=visita` con `haversineMetros` y `resolverRadioM`, que leen `destinos.tags.subcategoria`/`tipo_actividad`/`nombre` y `destinos.lat/lng`. La evidencia viaja en `interacciones.dims.geo` (JSONB). El esquema y el detalle completo viven en la seccion 3 (tabla `interacciones`) y en DECISIONS.md ADR-024.

### Protocolo de persistencia: MERGE obligatorio (ver DECISIONS.md ADR-003)

Los endpoints de actualizacion (admin-destinos.js) nunca reemplazan el campo tags completo. Siempre hacen merge a nivel SQL:

```sql
tags = COALESCE(tags, '{}') || $new_tags::jsonb
```

Esto preserva los datos de tags ya guardados por otras categorias o ediciones anteriores, evitando el borrado logico de informacion no incluida en el payload actual (Reglas de Oro ExploraCO v5, punto 3: Cero Borrado Logico).

## 5. Arquitectura de pagina-destino.js (v9) - motor de renderizado

Genera HTML 100% en servidor mediante concatenacion de strings (operador `+`), sin template literals (backticks prohibidos en backend, ver DECISIONS.md ADR-002).

Dise\u00f1o visual: tipografia Barlow Condensed (titulos) + Outfit (cuerpo), paleta dorado `#E8A020` / negro `#111` / fondo warm `#FBF8F2`. Componentes CSS reutilizables: `gstrip` (barra dorada sticky), `icard` (tarjeta icono), `hbox` (highlight box), `tpill` (chip/tag), `stnum` (numero de seccion grande).

### Secciones comunes a las 4 categorias (se renderizan siempre que existan datos)
secDescripcion, secInfo, secGaleria (galeria unificada: curadas + viajeros + albumes, ADR-030), secHabitaciones (solo hostal), secReservar, secComoLlegar (fusion de transporte + mapa en una sola seccion, id="como-llegar"; ancla legacy invisible `#mapa`; reemplaza al historico `secMapa`, ADR-030), secFaq, secResenas, secContact.

**Nota (TSK-105 / ADR-030, 2026-09-16):** `secMapa` (id="mapa") y `secTransporteHostal` se fusionaron en `secComoLlegar` (id="como-llegar", transporte arriba + mapa abajo), con UNA sola entrada de subnav `como-llegar`. `secGaleria` y la antigua seccion `#fotos` ("Fotos de viajeros") se fusionaron en una sola `#galeria` (con ancla legacy invisible `#fotos`). No hay archivos ni endpoints nuevos (8/8, ADR-001); `api/interacciones.js` extiende `tipo=galeria_destino` de forma aditiva (`incluir`/`usuario_id`/`items[]`) y conserva `fotos[]`/`usuarios[]` para `galeria.html`.

### Secciones especificas de "Sitio" (implementadas - 8 secciones adicionales)
secSitio, secEntradas, secTours, secChecklist, secItinerario (con tabs por dia via `switchItin()`), secFauna, secSecretos, secRegulaciones.

Nota Sprint 2 (Paridad Visual): secDificultad, secSitio (bloque Temporada) y secTours fueron redisenadas para ser "Tags-Aware" del modelo de datos extendido: leen `dificultad_desc`/`dificultad_tags`, `temporada_matriz` (con fallback automatico a `temporada` legado si el destino aun no fue migrado) y `tipo_tour`/`idioma`/`max_personas` por tour. Ninguna de las 3 secciones rompe si esos campos nuevos estan vacios -- se degradan al comportamiento anterior.

### Secciones especificas de "Hostal" (implementadas, Sprint 3 / TASK-001)
secHostalActividades (Actividades disponibles), secHostalReglas (Reglas de la casa).

**Orden de modulos (hostal, ADR-034):** SOLO para `cat==='hostal'`, las secciones se ensamblan desde un array `{id, html}` para permitir el override del admin via `tags.orden_modulos` (array de ids). Los ids validos son `descripcion, galeria, habitaciones, reservar, reglas-casa, actividades, eventos-hostal, como-llegar, contacto, faq, resenas, relacionados`. Default nuevo (`SEC_HOSTAL_DEFAULT` en `api/pagina-destino.js` y `HOSTAL_MODULOS_ORDEN_DEFAULT` en `admin.html`): **Reservar justo tras Habitaciones/Precios y Contacto justo tras Como llegar**. Un `tags.orden_modulos` ausente, vacio o con ids invalidos deja el orden por defecto; los ids validos del admin mandan y los no listados se agregan al final (cero regresion). El admin (`_renderHostalModulos`) reordena con flechas los modulos del hostal y la lista de Actividades (el orden del array `tags.actividades` ES el orden). Las demas categorias conservan su concatenacion fija. Detalle: DECISIONS.md ADR-034.

### Secciones especificas de "Comida" (implementadas, Sprint 4 / TASK-002)
secPerfilComida (perfil: tipo_comida/cocina/precio_promedio/ambiente), secMenuDestacado, secHorariosComida, secDeliveryComida (opciones dieteticas + domicilio).

### Secciones especificas de "Evento" (implementadas, Sprint 5 / TASK-003)
secEventoInfo (Fecha y sede: fecha_inicio/fecha_fin formateadas via `fmtFechaEvento()`, edicion, sede), secLineupEvento (Lineup/Artistas), secAgendaEvento (Agenda del evento, tabla secuencial dia/hora/actividad), secEntradasEvento (Tipos de entrada, con badge de color por disponibilidad: Disponible/Pocas/Agotado), secPrepEvento (Que llevar: checklist de que_llevar[] + prohibido[] en un solo grid de tarjetas).

Con esto, las 4 categorias tienen su Tab Especifico y sus secciones de renderizado completas. Todas las secciones especificas son condicionales: si no hay datos en `tags` para esa seccion, no se renderiza (sin bloques vacios en el HTML final) -- verificado con smoke tests de `buildHTML()` para Hostal, Comida y Evento.

Iconos: se escriben siempre como escapes `\uXXXX` dentro del codigo JS (nunca emoji directo). Ejemplos ya en uso: `\u2605` (estrella), `\u2713` (check), `\u23F0` (reloj), `\u2302` (casa), `\u2706` (telefono), `\u2709` (mensaje), `\u26A0` (aviso), `\u2731` (planta), `\u29BF` (pin/zona).

## 5-bis. index-api-connector.js - carga dinamica de index.html (documentado en TASK-007, Sprint 6)

Script frontend (no es funcion serverless, no cuenta contra el presupuesto de 8 endpoints) cargado al final de `<body>` en index.html junto a `usuario-session.js`:

```html
<script src="index-api-connector.js"></script>
<script src="usuario-session.js"></script>
```

Hasta TASK-007 este archivo ya existia y estaba en produccion, pero no figuraba en ningun documento del AI-DOS Core -- se descubrio y documento durante la verificacion previa al vaciado de `PL[]`/`MAPA_PLACES[]` (Reglas de Oro v5, punto 8). `usuario-session.js` (provee `window.ExploraCO`: `guardarDestino`/`mostrarLogin`/`mostrarToast`/`usuario`) sigue sin verificarse -- ver NEXT.md, Riesgos activos.

**Que hace:**
1. Al cargar el DOM (con 200ms de margen) y en cada busqueda con debounce de 300ms sobre `#sinp`/`#dest-input`, hace `fetch('/api/destinos?limit=500...')`.
2. Repuebla `PL[]`, `MAPA_PLACES[]` y `DEST_FEATURED_IDS[]`, y el objeto `DEST_PHOTOS{}`, sin romper la referencia: `replArr(targetArr, newArr)`/`replObj(targetObj, newObj)` reciben el array/objeto REAL por referencia (no un string) y mutan in-place (`.length=0`+`.push()`). Antepone tambien los eventos reales de Neon (`cat==='evento'`) a `AGENDA_EVENTS[]`, sin eliminar los de ejemplo que no dupliquen slug.
   - **Correccion (Sprint 7, ver BUGS_HISTORICOS.md BUG-020):** la version original de `replArr`/`replObj` recibia un *nombre de string* y mutaba `window[name]`. Como `PL`/`MAPA_PLACES`/`AGENDA_EVENTS` estan declarados con `const` en index.html (y las declaraciones `const`/`let` de nivel superior NO se exponen en `window`), ese patron nunca actualizaba los arrays reales -- creaba una propiedad `window.PL` nueva y desconectada en cada fetch. Se corrigio pasando el array/objeto real por referencia.
3. Tras repoblar, vuelve a invocar `renderDest()` y `renderAgenda()`, y refresca el mapa: si el Leaflet map (`mapaMap`, `var` en index.html) ya existe, llama `refreshMapaMarkers()`; si no, llama `initMapaSection()` (que ya invoca `refreshMapaMarkers()` internamente) -- evita depender de que el usuario haya llegado a la seccion de mapa via scroll/IntersectionObserver/timeout de 2s.
4. Actualiza los contadores de stats (`#stat-destinos`, `#stat-ciudades`, `#stat-resenas`, `#stat-rating`) solo en la carga inicial, no en cada busqueda.

**Que NO hace (ver NEXT.md, Riesgos activos, Sprint 6):** no re-invoca `renderMyMap()` (seccion personal "Mi Mapa") tras el fetch inicial -- esa funcion solo se refresca ante interaccion directa del usuario. Tampoco actualiza `MM_PINS[]` (pines decorativos, hardcodeados con ids de la version estatica original de `PL`), por lo que puede haber desfase de ids entre esos pines y los lugares reales tras el fetch.

## 5-ter. Mapa del apartado social (comunidad.html, 7 tabs)

`comunidad.html` es el hub social y concentra 7 tabs (declarados en `comunidad.html:296-304` y conmutados por `showCommTab()`): Chat, Planes, Mapa, Ranking, Parches, Activo Oculto y Audiovisual. Toda su logica vive en ramas `?tipo=` de `api/interacciones.js` v13 y `api/usuarios.js` v9 (presupuesto 8/8 intacto, ADR-010); el detalle completo (componentes, formulas y gaps) esta en `ExploraCO_Sistema_Social_v5.md` seccion 2.

| Tab | id | Endpoints principales |
|---|---|---|
| Chat | `chat` | GET `chat_salas`, GET `chat_mensajes`, POST `chat_msg`, POST `chat_sala`, POST `chat_mod` |
| Planes | `planes` | GET `planes`/`planes_mios`, POST `plan_crear`/`plan_unirse`/`plan_salir`, GET `plan_chat` / POST `plan_chat_msg` |
| Mapa | `mapa` | GET `multimedia_mapa` (capa audiovisual + `tipo_media` CSV), GET `album_detalle` |
| Ranking | `ranking` | GET `/api/usuarios?tipo=leaderboard` |
| Parches | `pandillas` | GET `pandilla_detalle`, POST `pandilla_crear`/`pandilla_unirse`/`pandilla_salir`/`pandilla_reto` |
| Activo Oculto | `wayfarer` | POST `activo_oculto_proponer`/`activo_oculto_votar`, GET `activos_ocultos_pendientes`, GET `/api/usuarios?tipo=faccion_ranking` |
| Audiovisual | `av` | GET `albumes` (opt-in `excluir_museo=1`), GET `mi_feed_fotos` (`usuario_id` opcional), GET `album_detalle`; assets externos `album-comments.js` y `media-actions.js` (likes/guardados, ADR-044) |

Nota de nomenclatura: la API y el esquema conservan el termino historico `pandilla*` (`pandillas`, `pandillas_miembros`, `pandilla_retos`, `pandilla_crear`, ...); "Parche" es un relabel SOLO de texto visible en la UI. No confundir en busquedas futuras (`ExploraCO_Sistema_Social_v5.md` seccion 3.5).

## 5-quater. Paginas publicas de perfil (TSK-103 / ADR-028)

Dos paginas estaticas nuevas completan el ciclo social del perfil. Ambas son assets frontend (no funciones serverless; no cuentan contra el presupuesto 8/8, ADR-010) y estan registradas en `STATIC_PAGES` de `api/utilidades.js` (sitemap):

| Pagina | Proposito | Datos |
|---|---|---|
| `perfil.html` | Perfil publico tipo "museo" de un usuario (`?id=<uuid>`); expone trofeos, fotos, destinos y el Arbol de Clases en solo lectura | UNA llamada a `GET /api/interacciones?tipo=museo_publico` (ensambla perfil + trofeos + fotos + destinos) + `GET /api/usuarios?tipo=perfil_publico` (version ligera) |
| `registro.html` | Alta de usuario con captura de `?ref=<codigo>` (cierra BUG-035/BUG-044/BUG-045) | `POST /api/usuarios` con `codigo_referido`; `usuario-session.js` captura `?ref=` con TTL de 30 dias |

`mi-perfil.html` (perfil propio) redirige a `perfil.html?id=<uuid>` cuando recibe el parametro `id` (fix R-3). El perfil publico NUNCA expone PII: `api/usuarios.js` v12 proyecta un subconjunto publico (sin email/tokens/`device_hashes`/`codigo_referido`) y reserva el detalle completo al admin o al dueno.

## 5-quinquies. galeria.html - modo destino (5 secciones + subida, ADR-034 + ADR-036)

`galeria.html` (asset frontend, no funcion serverless) tiene un modo destino (`?destino=<slug>`) que separa el contenido en 5 secciones `.g-sec` + un bloque de subida. ADR-034 definio las 4 primeras; ADR-036 agrego "Comparte tu foto", el modal con VOTAR/GUARDAR/COMPARTIR y comentarios para las 3 fuentes de media, y el cache-bust `album-comments.js?v=2`:

| Seccion | id | Fuente |
|---|---|---|
| Fotos de este lugar (curadas) | `g-sec-dest` | `tipo=galeria_destino` (`items[]` con `fuente='curada'`) |
| Albumes de este espacio | `g-sec-albumes` | mismo `items[]` agrupado por album (`gAlbumesDeItems`) |
| Fotos de la comunidad | `g-sec-com` | `tipo=galeria_destino&incluir=viajeros,albumes` (`fuente='viajero_foto'` + `fuente='album_foto'`, orden por votos DESC) |
| Mapa y audiovisual | `g-sec-mapas` | RAMA `GET /api/interacciones?tipo=mapas_de_destino&destino_id=<uuid>` (o `&slug=`) |
| Comparte tu foto | `#g-share` | `POST tipo=foto` (requiere sesion y nivel 2, ver BUG-061) |

El modal de foto y el de album usan VOTAR / GUARDAR / COMPARTIR y comentarios por las 3 fuentes (curada/viajero/album) via `media_voto`, `guardar_media`, `compartir` y `album-comments.js` v2.0.0 (`mount(target,{fuente,itemId},opts)`). La rama `mapas_de_destino` devuelve los mapas tematicos que guardan el destino con visibilidad `m.publico = true OR m.usuario_id = viewer`, donde el `viewer` se deriva de `validarSesion` (ADR-025) y es `null` sin sesion valida. Las secciones se ocultan si no tienen contenido (`gSecVis`). Detalle: DECISIONS.md ADR-034 y ADR-036.

**Hero y Compartir en la ficha (ADR-036):** `api/pagina-destino.js` v10 renderiza el hero en mosaico (1 principal `1.9fr` + 3 secundarias en columna, fila 360px desktop) y anade un boton **Compartir** al final del `.subnav` sticky (atributos `data-share*`, no en blog), cargando el asset `compartir.js` (`window.ExploraCompartir`: Web Share API + WhatsApp + Copiar link + POST `tipo=compartir`). La galeria principal llega a 12 miniaturas (comunidad max 6 + relleno con curadas).

**Nota de recalibracion (ADR-006):** el reporte de sesion listaba la insignia `compartido` reincorporada en `index.html`, `comunidad.html` y `mi-perfil.html`; contra archivo real, volvio SOLO en `index.html` (L4208), derivada del catalogo de logros (`_sharedCount`). `comunidad.html` y `mi-perfil.html` solo recibieron el cache-bust; su comentario de `XP_BADGES` aun lista `compartido` como removido.

## 6. admin.html - sistema de formularios (baseline referencial ~7.800 lineas)

Estructura de tabs principal: GENERAL | FOTOS | CONTENIDO | ESPECIFICO | CONTACTO.

El tab ESPECIFICO muestra un sub-panel segun `categoria_slug`:
- `especifico-sitio`, `especifico-hostal`, `especifico-comida`, `especifico-evento`: las 4 completas (Sprint 2/3/4/5 respectivamente).

### Patron de implementacion por categoria (7 pasos originales, ya aplicado a las 4 categorias)

Nota (desde TSK-012, aplicado por primera vez en Hostal/TASK-001): los
pasos 4 y 5 de esta lista (editar `collectPlace()`/`_placeToAPI()` a
mano) quedaron superados por el motor generico
`CATEGORY_TAG_FIELDS`/`CATEGORY_TAG_LISTS`. Para una categoria nueva
hoy, esos 2 pasos se reemplazan por "registrar los campos en
`CATEGORY_TAG_FIELDS.<categoria>`/`CATEGORY_TAG_LISTS.<categoria>`" --
ver el ejemplo real de cualquiera de las 4 categorias en admin.html.
Los pasos 1, 2, 3, 6 y 7 se mantienen igual.

1. Definir los campos especificos en `tags` JSONB (ver seccion 4 de este documento).
2. Agregar sub-tabs y paneles en admin.html dentro de `especifico-X` (`cat-editor-tabs` + `cat-panel`), verificando balance de divs antes y despues (Reglas de Oro v5, punto 2).
3. Agregar funciones JS con prefijo de categoria para evitar colisiones de nombre (ej: `addHostalHabitacion()`, `addComidaPlato()`, `addLineupRow()`/`addAgendaRow()` en Evento). El prefijo evita el bug historico de "funcion duplicada" (ver BUGS_HISTORICOS.md BUG-006, y su recurrencia en BUG-018/BUG-019).
4. ~~Actualizar `collectPlace()` para leer los campos nuevos segun la categoria activa.~~ Superado por TSK-012: registrar en `CATEGORY_TAG_FIELDS.<cat>`/`CATEGORY_TAG_LISTS.<cat>` y listo -- `collectCategoryTagFields()` ya recorre esa configuracion.
5. ~~Actualizar `_placeToAPI()` para incluir los campos nuevos dentro de `tagsObj`.~~ Superado por TSK-012: `_buildTagsObj()` ya recorre `CATEGORY_TAG_FIELDS`/`CATEGORY_TAG_LISTS` automaticamente.
6. Agregar las secciones condicionales correspondientes en pagina-destino.js (leer con `safeJSON(tags.campo)`, ensamblar solo si hay datos).
7. Actualizar `loadForm()` en admin.html para precargar los datos al editar un destino existente (los campos escalares via `applyCategoryTagFields()`; los arrays/listas siguen precargandose a mano, uno por contenedor -- ver el bloque `if(p.cat==='evento')` como referencia mas reciente).

## 7. Aislamiento atomico de estilos (ver DECISIONS.md ADR-004)

Para que el dise\u00f1o de una categoria no interfiera con otra, todo CSS de una plantilla o seccion debe vivir bajo un selector padre unico (ej. `.tpl-pX`, `.cat-sitio`, `.cat-hostal`). Cada bloque de estilos debe iniciar neutralizando margenes o posiciones heredadas del Maestro (Reset de Silo), segun Reglas de Oro ExploraCO v5, punto 4.

## 8. Dependencias y restricciones tecnicas

- Driver de base de datos: `@neondatabase/serverless`. Prohibido usar `pg`.
- Modulos backend: CommonJS estricto (`require` / `module.exports`). Prohibido `import` / `export`.
- Frontend: 0 frameworks (ver ADR-001). Interactividad via atributo `onclick` inyectado fisicamente en el HTML generado por el servidor (Reglas de Oro v5, punto 5).
- Iconografia: SVG integro; prohibidas las fuentes de iconos externas (Reglas de Oro v5, punto 7).

### Scripts de verificacion de referencia

Verificar ASCII-safety de un archivo serverless:
```python
with open('api/pagina-destino.js', 'rb') as f:
    raw = f.read()
print("no-ASCII:", len([b for b in raw if b > 127]))   # debe ser 0
print("doble escape:", raw.count(b'\\\\u'))              # debe ser 0
print("backticks:", raw.count(b'`'))                    # debe ser 0
print("module.exports:", b'module.exports' in raw)      # debe ser True
```

Verificar balance de divs en admin.html:
```python
with open('admin.html', 'r') as f: t = f.read()
# Cada categoria se aisla desde su propio inicio hasta el inicio de la
# SIGUIENTE categoria (nunca todas contra el mismo indice final -- ese
# error hacia que las 3 primeras zonas se solaparan entre si).
bounds = [('hostal','especifico-comida'), ('comida','especifico-sitio'),
          ('sitio','especifico-evento')]
for cat, next_id in bounds:
    z = t[t.find(f'id="especifico-{cat}"'):t.find(f'id="{next_id}"')]
    print(f'{cat}: balance={z.count("<div")-z.count("</div>")}')  # debe ser 0
# Evento es la ultima categoria -- no hay "siguiente id", se aisla con
# su propio comentario de cierre en vez de con el id de otra categoria.
start = t.find('<div id="especifico-evento"')
end = t.find('<!-- /especifico-evento -->') + len('<!-- /especifico-evento -->')
z = t[start:end]
print(f'evento: balance={z.count("<div")-z.count("</div>")}')  # debe ser 0
```

## 9. Diagrama de capas

```
     ADMIN.HTML (formularios, 4 categorias)
              |
              v
     admin-destinos.js v2 (CRUD + merge JSONB)
              |
              v
     NEON POSTGRESQL (destinos, destinos_fotos, destinos_detalles, interacciones, usuarios)
              |
              v
     pagina-destino.js v9 (SELECT + buildHTML)
              |
              v
     HTML estatico servido al visitante (sin framework, sin build step)
```

##### Scripts de verificaci\u00f3n obligatorios (Escudo GOLD)
1. **Validaci\u00f3n de Sintaxis (NUEVO):**
   `node --check api/pagina-destino.js` (Debe pasar limpio) [1].
2. **ASCII-Safety:**
   `grep -P '[^\x00-\x7f]' api/*.js` (Debe devolver 0 resultados) [1, 2].
3. **Balance de DIVs:**
   Verificar manualmente o con script Python que el conteo de `<div` sea igual al de `</div>` en cada secci\u00f3n de `admin.html` [1, 2].
