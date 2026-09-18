# PROJECT.md - ExploraCO

## Estado del documento
- Version: v1.4 (generado bajo AI-DOS v1.1; consolidacion Gaming v5.0 2026-09-14 + ADR-035/ADR-036, 2026-09-17 + ADR-038 TSK-112, 2026-09-18 + ADR-039/ADR-040 y ENMIENDA 1 de ADR-039 TSK-114..TSK-117, 2026-09-18)
- Fecha: Julio 2026 (actualizado Septiembre 2026)
- Fuente: EXPLORACO_CONTEXT_V4.md + Reglas de Oro ExploraCO v5 + documentos maestros v5
- Documento obligatorio del AI-DOS Core (Cap. 9.4). Es el primer documento que debe leer cualquier IA.

## 1. Objetivo del proyecto
ExploraCO es una plataforma web multi-categoria de descubrimiento y promocion de destinos en Colombia (sitios turisticos, hostales, comida y eventos), con paginas dinamicas generadas en servidor, un panel de administracion propio y un modelo de datos flexible basado en JSONB que permite escalar por categoria sin redise\u00f1ar el esquema relacional.

## 2. Alcance

### Incluido en el alcance actual
- Categoria "Sitio" turistico: completamente implementada (formulario admin con 6 sub-tabs, pagina publica con 17 secciones dinamicas).
- Categorias "Hostal", "Comida" y "Evento": completamente implementadas (Sprint 3/4/5 -- TASK-001/002/003), siguiendo el mismo patron ya validado con "Sitio".
- Categoria "Blog" (seccion Inspirate): formulario admin con multi-tema (select multiple de temas), video (oEmbed) y buscador de autor; pagina publica con cuerpo por parrafos (white-space:pre-line), video embed, chip de tema y seccion "Quien escribe" condicional por id_autor. Primera entrada real en produccion: TSK-043 (monserrate-guia-completa).
- Sistema de interacciones (rese\u00f1as, guardados, visitas, XP) y perfiles de usuario con gamificacion completa: 20 niveles en 4 eras, 41 misiones, 33 logros/trofeos con rareza estilo Steam, economia de XP con 13 consumibles, cromos coleccionables, Parches (clanes) con fama y retos, compartir social con XP (ADR-036) y una capa social v5.0 (referidos multinivel, crowdsourcing Wayfarer "Activo Oculto", 4 facciones, vocaciones de artista y presencia fisica verificada). La media de usuarios (curadas, fotos de viajero y fotos de album) esta unificada en tablas `media_*` (votos/comentarios/guardados) desde ADR-036.
- Motor de paginas dinamicas por slug (pagina-destino.js).
- Panel administrativo unico (admin.html) para las 5 categorias (Sitio, Hostal, Comida, Evento, Blog).

### Fuera de alcance (por ahora)
- Pagos en linea (Wompi/PSE) - backlog de proximos sprints.
- Paginas indexables de busqueda (/buscar?q=...) - backlog.
- Notificaciones automaticas por WhatsApp al aprobar un lugar - backlog.
- Cualquier framework frontend (React, Vue u otro) - prohibido, ver DECISIONS.md ADR-001.

## 3. Stack tecnologico

| Capa | Tecnologia |
|---|---|
| Hosting / Deploy | Vercel Hobby (auto-deploy desde GitHub) |
| Base de datos | Neon PostgreSQL (driver @neondatabase/serverless) |
| Backend | Node.js serverless functions, CommonJS estricto (api/*.js) |
| Frontend | HTML + JS Vanilla (sin frameworks), concatenacion de strings server-side. index.html carga sus listados y mapa de forma dinamica via `index-api-connector.js` (fetch a `/api/destinos`, sin arrays hardcodeados desde TASK-007) -- ver BLUEPRINT.md seccion 5-bis. |
| Repositorio | gonzalezjavierbta-afk/exploraco (GitHub) |
| Dominio actual | https://exploraco.vercel.app (dominio propio exploraco.co pendiente de conectar) |

Restriccion critica de plataforma: Vercel Hobby limita a 8 funciones serverless. El presupuesto ya esta consumido en su totalidad (ver BLUEPRINT.md, seccion 2).

## 4. Estado actual del proyecto

Las 4 categorias (Sitio, Hostal, Comida, Evento) tienen su formulario admin y su pagina publica completos y conectados a Neon extremo a extremo. Ademas, el proyecto tiene ya 25 paginas de destino dinamicas de curacion editorial (patron monserrate.html servidas por `api/pagina-destino.js`) cargadas en produccion: **lacandelaria.html**, **bogota.html**, **museo-del-oro.html**, **museo-botero.html**, **jardin-botanico-bogota.html**, **plaza-de-bolivar.html**, **museo-nacional.html**, **quebrada-la-vieja.html**, **cerro-de-guadalupe.html**, **parque-simon-bolivar.html**, **club-octava.html**, **theatron.html**, **video-club.html**, **mad-radio.html**, **gate-club.html**, **radio-estrella.html**, **espacio-kinder.html**, **radio-berlin.html**, **museo-santa-clara.html**, **quinta-de-bolivar.html**, **museo-de-la-independencia.html**, **parque-nacional.html**, **el-virrey.html**, **el-tunal.html** y **parque-la-florida.html** (ver TASKS.md TSK-018 a TSK-042 y NEXT.md). Estas se cargaron via la API de admin con los seeds `scripts/seed-*.js`/`scripts/load-*-api.js` versionados; destacan que su rating parte en 0 (hasta resenas reales, ADR-009) y su hero/galeria usan imagenes de Wikimedia verificadas con curl (BUG-022). Las 8 de electronica (cat sitio) usan covers/hero con fotos de barrio de Commons, las 3 ultimas son museos faltantes con fotos propias de Commons y los 4 parques de Bogota (Parque Nacional, El Virrey, El Tunal y La Florida) cierran la curaduria de parques urbanos (total destinos 107).

Ademas, la seccion Inspirate (blog) tiene **6 entradas reales en produccion** (ver TASKS.md TSK-043 a TSK-049):

| Slug | Titulo | Temas | Palabras |
|---|---|---|---|
| monserrate-guia-completa | El cerro que vigila a Bogota: guia completa para subir a 3.152 m | cultura, naturaleza, aventura, tips, gastro | ~3.018 |
| theatron-guia-completa | Theatron: la noche mas inclusiva de Bogota espera tu paso | cultura, aventura, tips, gastro | ~2.758 |
| bogota-guia-para-el-viajero | Bogota para viajeros: clima, altitud, transporte, dinero y seguridad | tips, cultura | ~2.840 |
| bogota-gastronomia-guia | Bogota a la mesa: ajiaco, mercados, dulces callejeros y cafes de especialidad | gastro, cultura | ~2.837 |
| la-candelaria-recorrido-por-el-centro | La Candelaria a pie: del Chorro de Quevedo a la Plaza de Bolivar | cultura, tips | ~2.830 |
| parques-y-espacios-verdes-de-bogota | El pulmon de Bogota: Simon Bolivar, Jardin Botanico, El Virrey, El Tunal y los cerros orientales | naturaleza, tips | ~2.758 |

Todas usan `categoria_slug='blog'`, `status='published'`, `destacado=true`, sin FAQs, sin video (excepto Theatron que tiene un short de YouTube), sin autor (migracion 004 pendiente). Las 5 ultimas (~2.800 palabras, cuerpo en `descripcion` TEXT, parrafos por `\n\n`, marcadores `[foto:URL|texto]` que renderiza `parseBlogBody()` como figure.bfig) siguen el patron de Theatron. Se verificaron con smoke tests locales (`buildHTML()`) antes de desplegar via loaders idempotentes DELETE+POST. `/blog.html` muestra las 6 entradas con buscador client-side, chips multi-tema y grid sin estrellas.

| Categoria | Admin (formulario) | Pagina publica | Estado |
|---|---|---|---|
| Sitio | Completo | Completo (17 secciones) | Activo en produccion |
| Hostal | Completo | Completo | Activo (Sprint 3, TASK-001) |
| Comida | Completo | Completo | Activo (Sprint 4, TASK-002) |
| Evento | Completo | Completo (5 secciones) | Activo (Sprint 5, TASK-003) |
| Blog | Completo (temas multi-select, video, autor) | Completo (Inspirate, video embed, temas) | Activo (TSK-043; primer post real en produccion) |

El baseline tecnico actual es admin.html (~7.800 lineas, referencial), pagina-destino.js v9 (1.265 lineas) y admin-destinos.js v2.1 (reescrito para corregir el bug historico de nombres de campo incorrectos; sin cambios desde Sprint 2 -- el MERGE JSONB ya cubre los campos nuevos de las 4 categorias). Ver NEXT.md para el detalle de continuidad y BUGS_HISTORICOS.md para fallas ya resueltas que no deben repetirse -- en particular, las 3 ultimas categorias (BUG-016/017/018/019) revelaron el mismo patron: UI ya construida en el admin pero silenciosamente desconectada del backend, pese a que la documentacion decia "Pendiente". Ver DECISIONS.md ADR-006 sobre por que nunca confiar en un estado citado sin verificar el archivo real.

Desde TASK-007 (Sprint 6), index.html ya no incluye datos locales de respaldo (`PL[]`/`MAPA_PLACES[]` hardcodeados): el listado principal y el mapa se cargan en tiempo real desde `/api/destinos` a traves de `index-api-connector.js`. Ese script ya estaba en produccion desde antes de esta tarea, pero no figuraba en ningun documento del AI-DOS Core; queda documentado formalmente en BLUEPRINT.md seccion 5-bis. Persisten como contenido estatico, fuera del alcance de TASK-007 y sin afectar la carga principal de destinos: `SLIDES[]` (hero/slideshow), `MM_PINS[]` (pines decorativos de "Mi Mapa", con desfase de ids conocido, ver NEXT.md) y la porcion hardcodeada de `AGENDA_EVENTS[]` (el conector antepone los eventos reales de Neon sin eliminar los de ejemplo).

### Arquitectura y presupuesto de endpoints

La plataforma corre sobre 8 funciones serverless en `api/` (presupuesto 8/8 consumido, Vercel Hobby; ADR-010), con Neon PostgreSQL como unica fuente de verdad y renderizado server-side por concatenacion de strings (Vanilla JS, ADR-001/ADR-002). El motor social/gaming se concentra en dos endpoints y crece por ramas `?tipo=` sin crear archivos nuevos: `api/usuarios.js` v9 como baseline de esa Entrega (header real HOY v16 tras ADR-038; v15 tras ADR-035 y v14 con el hotfix BUG-054 y el SQL del merge de `device_hashes`; ver BLUEPRINT.md seccion 3; perfil, leaderboard, upsert, referidos, facciones, verificacion de email, sesion firmada JWT y, desde TSK-112/ADR-038, `casa_ranking` con cofre y `clase_elegir`) y `api/interacciones.js` v22 (rese\u00f1as/guardados/visitas/ratings, misiones, logros, albumes, cromos, Parches, Wayfarer, geocerca de presencia fisica, desde ADR-036 compartir social con XP y media unificada `media_*`, desde TSK-112/ADR-038 factor de nivelacion de Casa/tributo al cofre y Clases, y desde TSK-114/ADR-039 + ADR-040 el Museo URL-only `?tipo=museo_recurso` con visibilidad por recurso `album_fotos.visible` y el enriquecimiento aditivo de `?tipo=misiones` con `gate_nivel`/`desbloquea`/`nivel`). `api/admin.js` expone la moderacion, incluida la rama `activo_oculto_moderar`. El esquema vive en `db/migrations/` (003 a 025). Detalle tecnico vigente en BLUEPRINT.md secciones 2 y 3.

### Sistema de gamificacion completo (estado real, working tree)

- **Progresion:** 20 niveles en 4 eras (Mundana 1-5, Patrocinada 6-10, Organizador 11-15, Leyenda 16-20), derivados de `usuarios.xp_total` en cada lectura (`api/usuarios.js` NIVELES); nunca persistidos.
- **Misiones:** 41 misiones server-side (DAG via `requiere`) evaluadas tras cada accion de XP (`api/interacciones.js`): 28 del catalogo base + 8 de perfil (ADR-028) + 3 de compartir (ADR-036: `mis_primer_compartido`, `mis_voz_comunidad`, `mis_embajador_destinos`) + 2 del Museo (ENMIENDA 1 de ADR-039: `mis_videografo`, `mis_sonidista`).
- **Logros/trofeos:** 33 logros con tier (rareza global estilo Steam y fecha de desbloqueo): 30 hasta ADR-035 + 3 de compartir (ADR-036: `logr_primer_compartido` bronce, `logr_compartidor_25` plata, `logr_viral_100` oro); `logr_pionero` (ADR-024) habia elevado el catalogo a 30.
- **Economia de XP:** 13 consumibles comprables/usables (10 de la migracion 010 + 3 de mejoras de perfil de la 015) con de-nivel real (ADR-018).
- **Cromos y Parches:** drops probabilisticos de cromos (garantia con iman) y Parches (clanes, ex Pandillas) con fundacion a nivel 14, fama (10% del XP de sus miembros) y retos con ventana.
- **Presencia fisica:** geocerca Haversine server-side en `POST tipo=visita` (radios adaptativos y anti-spoofing) y logro `logr_pionero` (ADR-024).

### Sistemas v5.0 (Entrega 016, 2026-09-14)

Sobre el motor de gamificacion v4.0 (ADR-018) se implemento la Entrega 016, verificada en working tree y pendiente de aplicacion de la migracion + deploy. Agrega tres capas sociales nuevas sin crear funciones serverless:

- **Piramide de referidos multinivel:** `usuarios.referido_por` (self-FK) + `codigo_referido` y red de 5 niveles derivada con CTE recursiva; reparto porcentual FLOOR (0.10/0.05/0.03/0.02/0.01) sobre `xp_ref_total` (campo de apoyo), con topes anti-farming de 500 XP y 20 referidos directos; registro con `?ref=<codigo>`.
- **Crowdsourcing Wayfarer "Activo Oculto":** propuestas peer-to-peer (`activos_ocultos`) con votacion (`activos_ocultos_votos`, PK compuesta) y quorum derivado de +/-3 votos netos; checkin geolocalizado (`activos_ocultos_checkins`) que reutiliza la geocerca de ADR-024 y un `geo_nonces` de un solo uso (2 min) contra replay; moderacion admin en `api/admin.js`.
- **4 Facciones y mundo artistas:** `usuarios.faccion` con CHECK (exploradores/curadores/creadores/artistas), primera eleccion gratis y cambio por 500 `xp_total` + cooldown de 15 dias; ranking y afinidad de Parche calculados en consulta (no persistidos); vocaciones de artista (musico/cine/artista_grafico/escritor) desbloqueadas en bloque al nivel 5 (coherente con ADR-026).

La sesion firmada JWT (HMAC SHA-256) con `SESSION_JWT_SECRET` (validada solo en visita/votar/checkin), el nonce geoespacial de un solo uso (`geo_nonces`), `device_hashes` y la exigencia de `email_verificado` cierran el candidato de anti-spoofing/anti-Sybil que ADR-024 habia dejado abierto: se registra como **ADR-025** (resuelto) y la decision de la piramide/crowdsourcing/facciones como **ADR-027**. El presupuesto de funciones serverless sigue en **8/8**: todo entra como ramas `tipo=` en `usuarios.js` (v9 historico; header real v14 por el hotfix BUG-054), `interacciones.js` (v13) y `admin.js`. El esquema vive en `db/migrations/016_multinivel_crowdsourcing.sql` (idempotente). Variables de entorno nuevas: `SESSION_JWT_SECRET` (obligatoria), `RESEND_API_KEY` (obligatoria para email; pendiente de configurar), `SITE_URL` y `DEV_EMAIL_ECHO` (solo desarrollo). Verificacion: Escudo GOLD verde y smoke `scripts/smoke_016_multinivel_crowdsourcing.js` 39/39 PASS; pendiente operativo en `docs/DEPLOY_016.md` (aplicar migracion 016 en Neon + configurar env en Vercel + deploy).

### Perfil publico museo, DM, Arbol de 16 ramas y Casas (Entrega TSK-103 / ADR-028, 2026-09-15)

Sobre el sistema social v5.0 se implemento la Entrega TSK-103, verificada en working tree y pendiente de aplicar las migraciones 017/018 en Neon + deploy. Agrega el perfil publico tipo "museo" (`perfil.html?id=`, sin filtrar PII) y la Mensajeria Directa (`chat_salas.tipo='dm'` + `clave_dm`, tabla `usuario_bloqueos`), el Arbol de Clases de 16 ramas (4 facciones x 4 ramas x 5 nodos, catalogo en codigo `RAMAS` + `RAMA_TIERS [0,100,250,450,700]`, solo backend/UI en mi-perfil.html), las Casas (`casa_elegir`/`casa_ranking`, gate nivel 2) y las categorias de consumibles (`consumibles.categoria`: perfil/impulso/social/coleccion/general, migracion 018 categoriza 17). Tambien cierra 5 regresiones (R-1..R-5: `registro.html` faltante, `?ref=` no capturado, `mi-perfil?id=` ignorado, etiqueta "Control Territorial", relabel Pandilla->Parche) y 4 fixes de seguridad/consistencia (fuga de PII preexistente en `api/usuarios.js`, carrera del cobro del DM, `museo_publico` 404->503 y filtros `activo=true`). Todo entra como ramas `tipo=` sin archivos nuevos en `api/` (8/8, ADR-010): `api/usuarios.js` v12, `api/interacciones.js` v15, `api/admin.js` y `api/utilidades.js`. Checklist operativo en `docs/DEPLOY_017.md`; smoke de cierre `scripts/smoke_017_perfil_arbol_casas.js` entregado y en verde (73/73 PASS, 2026-09-15).

### Compartir social con XP + interacciones de media unificadas (Entrega TSK-110 / ADR-036, 2026-09-17)

Sobre el XP decimal de ADR-035 se implemento la Entrega TSK-110, verificada en working tree y pendiente de aplicar las migraciones 022/023 en Neon + deploy. Agrega dos capacidades sin crear funciones serverless (8/8, ADR-001):

- **Compartir con XP (`media_compartidos`, migracion 022):** ledger propio de comparticiones con indice unico parcial `es_primero`. `POST /api/interacciones?tipo=compartir` paga 25 XP la primera vez que un usuario comparte un `(fuente,item_id)` y 5 XP las posteriores, con tope de 10 eventos y 50 XP por ventana rodante de 24h y `validarSesion` obligatoria (ADR-025). **No toca el CHECK de `interacciones.tipo`** (`'compartir'` no entra a `interacciones`). Suma 3 misiones y 3 logros (catalogo real 39 misiones / 33 logros).
- **Media unificada (`media_votos`/`media_comentarios`/`media_comentario_likes` + `media_guardados` extendida, migracion 023):** contrato polimorfico `fuente` (`curada|viajero_foto|album_foto`) + `item_id text`, con votos, comentarios anidados y likes para las 3 fuentes. `media_guardados.item_id` pasa de uuid a text y su CHECK admite `'curada'`. Backfill idempotente desde `album_votos`/`album_comentarios`/`album_comentario_votos`; las tablas legacy se conservan (cero borrado) y los alias legacy del backend siguen vivos.
- **Frontend:** nueva `compartir.js` (`window.ExploraCompartir`: Web Share API + WhatsApp + Copiar link, toasts reusando `window.ExploraCO`), hero en mosaico 1+3 y boton Compartir en el `.subnav` de la ficha (`api/pagina-destino.js` v10), `galeria.html` con 5 secciones + modal VOTAR/GUARDAR/COMPARTIR, `album-comments.js` v2.0.0 (firma `mount(target,{fuente,itemId},opts)` retrocompatible), helper `aplicarResultadoXp` en `usuario-session.js` e insignia `compartido` reincorporada en `index.html` (derivada del catalogo real de logros). Cache-bust `album-comments.js?v=2` en `index.html`, `comunidad.html`, `mi-perfil.html` y `galeria.html`.
- **Verificacion:** Escudo GOLD (`node --check` 7/7 OK; ASCII-safe 0 bytes >127 y 0 backticks en `api/*.js`, `compartir.js` y migraciones) y smokes `scripts/smoke_036_compartir.js` 55/55 PASS + `scripts/smoke_036_media_unificada.js` 71/71 PASS (con mock: no validan Neon).
- **PENDIENTE OPERATIVO (BLOQUEANTE):** aplicar `db/migrations/022_media_compartidos.sql` y `db/migrations/023_interacciones_media_unificadas.sql` en Neon **antes** del deploy del backend v19 (el backend consulta tablas que deben existir). Relevo corto en `docs/HANDOFF_036.md`.

### Casas con cofre, factor de nivelacion y Clases Rising Star (Entrega TSK-112 / ADR-038, 2026-09-18)

Sobre el modelo de Casas de ADR-028 y el XP decimal de ADR-035 se implemento la Entrega TSK-112, verificada en working tree y pendiente de aplicar la migracion 024 en Neon + deploy. Agrega una capa de progresion colectiva (cofre de Casa) y una capa de profesion (Clases Rising Star) sin crear funciones serverless (8/8, ADR-001/ADR-010):

- **Reuso de Casas (sin `casa_id`):** se reusa `usuarios.casa` (`condor|jaguar|delfin`, ADR-028) y se RECHAZA la propuesta original de `casa_id` + `casas_tributacion`. La migracion 024 crea `casas_cofre` (cofre por Casa: `xp_cofre_total`, `poblacion_activa`, `factor_conversion`, `actualizado_en`) con seed idempotente y sin FK en v1; `poblacion_activa`/`factor_conversion` son cache NO autoritativa.
- **Tributacion y factor de nivelacion (runtime):** el 10% del `xp_final` se acredita best-effort al cofre de la Casa (`acreditarClaseYCofre`, literal `0.10`; sin endpoint `casa_tributar`). `calcularTagCasa` aplica `dominante` (>45%, x0.85), `equilibrada` (25%-45%, x1.00) y `rezagada` (<25%, x1.30) UNA sola vez en `calcularXpFinal`; `arancel_inter_casa`/`fee_mercado_interno` se exponen pero NO se cobran en v1.
- **Clases Rising Star (capa nueva, coexiste con el Arbol de 16 ramas):** `usuarios.clase_id` (`cartografo|cronista|explorador`), `nivel_clase`, `xp_clase numeric(12,2)` y `clase_elegida_en` (migracion 024). `BONUS_CLASE` = cartografo 0.08 / cronista 0.10 / explorador 0.07; `XP_NIVEL_CLASE` = 11 umbrales `[0,100,250,500,900,1400,2100,3000,4200,5700,7500]`; `xp_clase` incrementa el 50% del `xp_final`. Rama POST `clase_elegir` en `api/usuarios.js` v16: primera eleccion gratis, recambio con 300 XP + cooldown de 30 dias y sin gate de nivel (ENMIENDA 1 del ADR-038).
- **Helper unico (anti-duplicidad):** triada `contextoXpE` / `calcularXpFinal` / `calcularNivelClase` + `acreditarClaseYCofre` en `api/interacciones.js` v21, aplicada a 14 acciones de la whitelist; EXCLUIDOS cobros (`dm_enviar`, `comprar_consumible`) y bonos/terceros (misiones, logros, retos de Parche, referidos). Los `UPDATE usuarios SET xp_total` siguen inline para preservar contadores.
- **Frontend:** `mi-perfil.html` "Mi Clase" (`#pf-clase` + `#modal-clase`, `cargarClase`/`elegirClase`) y `#pf-casa` con tag/multiplicador/cofre; `comunidad.html` con tag/mult/cofre en las cards del ranking.
- **Verificacion:** Escudo GOLD (`node --check` OK; ASCII 0/0/0; divs 0) y smokes `017` 73/73, `021` 45/45, `036_media_unificada` 85/85, `gamificacion_v4` 95/95 y `smoke_038_casas_clases` 76/76 PASS (mock, no valida Neon). El QA inicial dio "GOLD FAIL" SOLO por desincronizacion ADR<->codigo; se resolvio con la ENMIENDA 1 del ADR-038.
- **PENDIENTE OPERATIVO (BLOQUEANTE):** aplicar `db/migrations/024_casas_cofre_y_clases.sql` en Neon (019-023 ya aplicadas, confirmado por Javier el 2026-09-17) ANTES del deploy del backend v16/v21 y del frontend. **Actualizacion (TSK-114, 2026-09-18):** la migracion 025 del Museo tambien esta pendiente; el orden obligatorio del release es **024 -> 025 -> deploy del backend v22** (ver la Entrega TSK-114..117 abajo y ADR-039/ENMIENDA 1).

### Museo URL-only, acordeon de niveles y localizacion compartida (Entrega TSK-114..TSK-117 / ADR-039 + ADR-040 + ENMIENDA 1 de ADR-039, 2026-09-18)

Sobre la media unificada de ADR-036 y los helpers de XP de ADR-038 se implemento la Entrega TSK-114..117, verificada en working tree y pendiente de aplicar la migracion 025 en Neon + deploy. No crea funciones serverless (8/8, ADR-001/ADR-010): todo entra como ramas `tipo=` y campos aditivos de `api/interacciones.js` v22.

- **Museo multimedia URL-only (ADR-039 + ENMIENDA 1, TSK-114):** los recursos del Museo se suben SOLO por URL http/https (<= 2000 caracteres); se descartan Vercel Blob/Cloudinary/Supabase Storage. La visibilidad es POR RECURSO (`album_fotos.visible boolean NOT NULL DEFAULT false`, privado por defecto, migracion `025_album_fotos_visible.sql`) y los lectores publicos filtran `af.visible=true` (incluidos conteos y subqueries de votos); `mis_guardados_media` no filtra (bookmarks privados). Rama `POST ?tipo=museo_recurso` (crear/editar/eliminar) con `validarSesion` y usuario tomado de la sesion; `GET ?tipo=museo_recurso` con visibilidad server-side y `usuario_id` opcional. Carpetas = albumes existentes (mover = cambiar `album_id`) y auto-album "Mi Museo" con indice unico parcial. Gate de creacion `mis_fotografo` para los 3 tipos y +15 XP para foto/video/audio; misiones `mis_videografo` y `mis_sonidista` (catalogo 41). `barrio` descartado (no existe en `albumes`; se persisten `ciudad`/`region`).
- **Acordeon de niveles (ADR-040, TSK-115):** fuente unica cliente `niveles-data.js` (`XP_LEVELS` + `CAPACIDADES_DETALLE` + helpers `capacidadesDelNivel`/`misionesPorNivel`), cableada solo en `mi-perfil.html`; backend aditivo en `?tipo=misiones` (`gate_nivel`/`desbloquea`/`nivel` via `MISION_GATE_XP` + `nivelDeMisionServidor`). `index.html`/`comunidad.html` conservan su copia de `XP_LEVELS` como deuda documentada.
- **UI de gestion del Museo + localizacion (T5/T7, TSK-116):** tab Museo de `mi-perfil.html` con CRUD por URL (crear/editar/eliminar/visibilidad) y localizacion con pin sobre `map-picker.js` (contenedor propio `.pf-museo`); validacion de rango de coordenadas Colombia bloqueante.
- **Modulo compartido `map-picker.js` (TSK-117):** extrae el mapa de seleccion de coordenadas que antes vivia duplicado; `admin.html` queda refactorizado para consumirlo (mismos ids `f-lat`/`f-lng`/`map-picker-modal`).
- **Verificacion:** Escudo GOLD APROBADO tras correcciones (`node --check` OK; ASCII 0; divs 0; `smoke_niveles_data.js` 31/31; `smoke_test_gamificacion_v4.js` 95/95; `smoke_021_xp_decimal_rankings.js` 45/45; `smoke_038_casas_clases.js` 76/76; `check_buildHTML_inline.js` OK). La ENMIENDA 1 de ADR-039 resolvio el BLOQUEANTE de QA por desincronizacion ADR<->codigo.
- **PENDIENTE OPERATIVO (BLOQUEANTE):** aplicar `db/migrations/025_album_fotos_visible.sql` en Neon (junto a la 024) ANTES del deploy del backend v22. Deuda registrada: smokes preexistentes en rojo (`smoke_036_compartir.js` espera v19; `test_logros_catalogo.js` espera 30 logros) y catch vacios preexistentes en `mi-perfil.html`.

### Documentacion maestra

El detalle tecnico consolidado del sistema de gamificacion y del apartado social vive en dos documentos maestros (referencia de detalle; este PROJECT.md solo resume):

- `exploraco desarrollo/ampliacion desarrollo/ExploraCO_Gamificacion_v5_Plan_Maestro.md` (602 lineas) -- documento maestro tecnico de la gamificacion completo: 20 niveles/4 eras, 28 misiones, 30 logros, economia de XP, cromos, referidos, Wayfarer, facciones, vocaciones, presencia fisica, anti-Sybil y hoja de ruta.
- `exploraco desarrollo/ampliacion desarrollo/ExploraCO_Sistema_Social_v5.md` (878 lineas) -- documento unico del apartado social: comunidad.html y sus 7 tabs, Parches, chat/planes, albumes, rese\u00f1as/votos, Activo Oculto, facciones, referidos y perfiles, con sus gaps documentados.
- `docs/DEPLOY_016.md` -- checklist operativo de la Entrega 016: aplicar la migracion 016 en Neon, configurar `SESSION_JWT_SECRET`/`RESEND_API_KEY`/`SITE_URL` en Vercel y desplegar en un solo release.
- `docs/HANDOFF_036.md` -- relevo corto de la Entrega TSK-110 / ADR-036: que se hizo, que quedo pendiente (aplicar 022/023 en Neon) y como verificar.

El documento `ExploraCO_Gamificacion_v4_Plan_Maestro.md` queda como referencia HISTORICA (solo lectura); el v5 lo supersede.

## 5. Responsables (Capability Contract - AI Kernel)

Segun el Capability Contract de AI-DOS (Cap. 2.3 y Cap. 6.5), las capacidades requeridas en este proyecto se asignan por rol; la IA que implementa cada rol puede cambiar sin alterar el framework.

| Capacidad | Responsable (rol) | Ejemplo de tarea en ExploraCO |
|---|---|---|
| Arquitectura | Chief Architect | Definir la estructura de tags JSONB por categoria |
| Desarrollo | Lead Developer | Implementar los sub-tabs de Hostal en admin.html |
| Documentacion | Documentation Specialist | Mantener actualizado el AI-DOS Core |
| Auditoria | QA Specialist | Verificar balance de divs y ASCII-safety antes de cada entrega |
| Project Manager | Javier (due\u00f1o del repositorio) | Aprobar decisiones arquitectonicas y entregar el archivo fuente de verdad |

## 6. Vision

Consolidar ExploraCO como el directorio digital de referencia para explorar Colombia por categoria (donde dormir, donde comer, que sitios visitar, que eventos hay), manteniendo:
- Una sola fuente de verdad de datos (Neon, campo tags JSONB extensible por categoria).
- Un motor de renderizado unico y predecible (Vanilla JS, sin frameworks - ADR-001).
- Blindaje operativo estricto ante las restricciones de Vercel Hobby (ASCII-safe, limite de 8 funciones - ADR-002).
- Escalabilidad progresiva: cada categoria nueva sigue el mismo patron de 7 pasos documentado en BLUEPRINT.md, sin romper visualmente las categorias existentes (Aislamiento Atomico - ADR-004).

## 7. Referencia de verdad (Protocolo de entrega)

Antes de proponer cualquier cambio, la IA debe solicitar el archivo mas reciente del repositorio de Javier. El historial de una conversacion de chat NUNCA se considera fuente de verdad (Reglas de Oro ExploraCO v5, punto 8 - Protocolo de Entrega).
