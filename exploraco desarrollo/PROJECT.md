# PROJECT.md - ExploraCO

## Estado del documento
- Version: v1.1 (generado bajo AI-DOS v1.1; consolidacion Gaming v5.0, 2026-09-14)
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
- Sistema de interacciones (rese\u00f1as, guardados, visitas, XP) y perfiles de usuario con gamificacion completa: 20 niveles en 4 eras, 28 misiones, 30 logros/trofeos con rareza estilo Steam, economia de XP con 13 consumibles, cromos coleccionables, Parches (clanes) con fama y retos, y una capa social v5.0 (referidos multinivel, crowdsourcing Wayfarer "Activo Oculto", 4 facciones, vocaciones de artista y presencia fisica verificada).
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

La plataforma corre sobre 8 funciones serverless en `api/` (presupuesto 8/8 consumido, Vercel Hobby; ADR-010), con Neon PostgreSQL como unica fuente de verdad y renderizado server-side por concatenacion de strings (Vanilla JS, ADR-001/ADR-002). El motor social/gaming se concentra en dos endpoints y crece por ramas `?tipo=` sin crear archivos nuevos: `api/usuarios.js` v9 como baseline de esa Entrega (header real HOY v14 tras el hotfix BUG-054, 2026-09-15: SQL del merge de `device_hashes`; ver BLUEPRINT.md seccion 3; perfil, leaderboard, upsert, referidos, facciones, verificacion de email y sesion firmada JWT) y `api/interacciones.js` v13 (rese\u00f1as/guardados/visitas/ratings, misiones, logros, albumes, cromos, Parches, Wayfarer y geocerca de presencia fisica). `api/admin.js` expone la moderacion, incluida la rama `activo_oculto_moderar`. El esquema vive en `db/migrations/` (003 a 016). Detalle tecnico vigente en BLUEPRINT.md secciones 2 y 3.

### Sistema de gamificacion completo (estado real, working tree)

- **Progresion:** 20 niveles en 4 eras (Mundana 1-5, Patrocinada 6-10, Organizador 11-15, Leyenda 16-20), derivados de `usuarios.xp_total` en cada lectura (`api/usuarios.js` NIVELES); nunca persistidos.
- **Misiones:** 28 misiones server-side (DAG via `requiere`) evaluadas tras cada accion de XP (`api/interacciones.js`): 11 general, 3 de ciudad, 2 de categoria, 6 de fotos/albumes y 6 de artista.
- **Logros/trofeos:** 30 logros con tier (6 bronce, 8 plata, 9 oro, 2 platino + 5 de coleccion por ciudad), rareza global estilo Steam y fecha de desbloqueo; `logr_pionero` (ADR-024) elevo el catalogo a 30.
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

### Documentacion maestra

El detalle tecnico consolidado del sistema de gamificacion y del apartado social vive en dos documentos maestros (referencia de detalle; este PROJECT.md solo resume):

- `exploraco desarrollo/ampliacion desarrollo/ExploraCO_Gamificacion_v5_Plan_Maestro.md` (602 lineas) -- documento maestro tecnico de la gamificacion completo: 20 niveles/4 eras, 28 misiones, 30 logros, economia de XP, cromos, referidos, Wayfarer, facciones, vocaciones, presencia fisica, anti-Sybil y hoja de ruta.
- `exploraco desarrollo/ampliacion desarrollo/ExploraCO_Sistema_Social_v5.md` (878 lineas) -- documento unico del apartado social: comunidad.html y sus 7 tabs, Parches, chat/planes, albumes, rese\u00f1as/votos, Activo Oculto, facciones, referidos y perfiles, con sus gaps documentados.
- `docs/DEPLOY_016.md` -- checklist operativo de la Entrega 016: aplicar la migracion 016 en Neon, configurar `SESSION_JWT_SECRET`/`RESEND_API_KEY`/`SITE_URL` en Vercel y desplegar en un solo release.

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
