# NEXT.md - ExploraCO

Documento de relevo tecnico (AI-DOS Cap. 9.4). Debe permitir que cualquier IA continue el proyecto sin depender del historial de chat.

## GUIA DE LECTURA / INDICE

> Documento de relevo. Para continuar, leer PRIMERO este bloque y la seccion de la
> sesion mas reciente; el resto es historico y solo se consulta bajo demanda.

### Estado actual (resumen ejecutivo)

- Cierre documental **2026-09-20** (gobernanza de orquestacion): TERCER grupo de agentes primarios `hybrid-plan`/`hybrid-build` (esquema tripartito, ruteo por riesgo) -> **TSK-HYBRID-001 COMPLETADA** en TASKS.md, **ADR-048 APROBADO** en DECISIONS.md, AGENTS.md seccion 1.2 "Ruta HYBRID" y `orquestacion agentes.md` v1.1. `opencode.json` INTACTO (`default_agent` sigue `free-plan`; el bump a `hybrid-build` queda pendiente de decision del operador).
- Cierre documental EXPRESS **2026-09-20**: NUEVA gema Gemini "ExploraCO Research" (`GEMINI_GEMA_INVESTIGACION.md`, 154 lineas, **untracked**; TSK-141 COMPLETADA en TASKS.md). GAP de infraestructura detectado: `exp-pickle-free` listado en la matriz del AGENTS.md sin archivo de agente (runtime: "unknown agent type"). [Resuelto en la sesion posterior del mismo dia: `.opencode/agent/exp-pickle-free.md` ya existe HOY; ver TSK-HYBRID-001 / ADR-048.] HEAD real HOY `15c173d` (`main` == `origin/main`; los commits de docs `dbec863` "cierre documental + indice docs core" y `15c173d` "corte NEXT historico" son posteriores al registro de la sesion 2026-09-19).
- Cierre documental EXPRESS **2026-09-20**: pagina dinamica **salto-del-tequendama** (categoria `sitio`, ciudad Soacha, region Cundinamarca) **PUBLICADA en produccion** (id Neon `8c2b48fc-c6c5-4ec4-ad42-909a73911ce0`, `status=published`) desde el archivo corrupto `hotel tequendama.txt` -> **TSK-142 COMPLETADA** en TASKS.md. Ficha saneada en `ficha/`, 5 fotos Wikimedia verificadas (BUG-022), 3 scripts, smoke 15/15 PASS. Sin ADR nuevo ni bug de ExploraCO (data corrupta = archivo fuente). Deuda `[DEUDA-EXPRESS]` (horario/contacto/itinerario/archivos en la raiz) en la sesion de relevo.
- Ultima sesion documentada: 2026-09-20 "Pagina dinamica salto-del-tequendama (cierre express)" -> TSK-142 (contenido publicado). Anteriores: 2026-09-20 "Agentes hybrid-plan/hybrid-build (esquema tripartito de orquestacion)" -> TSK-HYBRID-001 + ADR-048 (gobernanza; archivos sin commitear) y 2026-09-20 gema Gemini (TSK-141, cierre express).
- Sesion inmediatamente anterior: 2026-09-19 "Motor compartido del Mapa Cultural" -> TSK-133 (comunidad, commit b4ffd4e) + TSK-134 (migracion del index, commit 61392c0), ADR-045.
- Que sigue: aprobar/aplicar las propuestas de gobernanza (PENDIENTE DE APROBACION del operador); commitear el doc de analisis ANALISIS_AI-DOS_v1.1_y_REGLAS_DE_ORO_v5.md y el .docx (untracked); QA visual en navegador (TSK-135 + esta sesion); deploy del release; confirmar la migracion 023 en Neon.
- Riesgos activos: cache de assets compartidos sin bump de ?v=N (BUG-073); documentos Core de ~1.28 MB que encarecen el contexto; BUG-061 y BUG-065 ABIERTOS; QA visual y shape real de ?tipo=mapa sin validar contra Neon.
- Documento de analisis: exploraco desarrollo/ampliacion desarrollo/ANALISIS_AI-DOS_v1.1_y_REGLAS_DE_ORO_v5.md (NUEVO, 285 lineas, 0 bytes >127; PENDIENTE DE APROBACION).
- Presupuesto de funciones serverless: 8/8 INTACTO (ADR-001/ADR-010); sin migraciones en la ultima sesion.
- Historico: sesiones del 2026-09-15 y anteriores (segundo corte agresivo, 2026-09-19), incluidas las Fases 6-9 y los bloques de Sprint 2-7, viven en NEXT_ARCHIVO.md (contenido conservado completo).

### Instruccion de lectura

Para continuar, leer primero este bloque y la seccion de la sesion mas reciente ("Que se estaba haciendo"); el resto del documento es historico y solo se consulta bajo demanda. El historico movido a NEXT_ARCHIVO.md se conserva completo (Cero Borrado Logico, Regla de Oro 3).

### Indice de secciones

- [Completado reciente](#completado-reciente)
- [Que se estaba haciendo](#que-se-estaba-haciendo)
- [Sesion 2026-09-20 - Agentes hybrid (ADR-048 / TSK-HYBRID-001)](#agentes-hybrid-planhybrid-build-esquema-tripartito-de-orquestacion---relevo-2026-09-20-adr-048)
- [Sesion 2026-09-20 - Pagina salto-del-tequendama (cierre express / TSK-142)](#pagina-dinamica-salto-del-tequendama-sitio-soachacundinamarca---relevo-2026-09-20-cierre-express)
- [Sesion 2026-09-20 - Gema Gemini ExploraCO Research (cierre express)](#gema-gemini-exploraco-research---cierre-documental-express-2026-09-20)
- [Sesion 2026-09-19 - Galeria/hero + Mis mapas (ADR-046 + ADR-047 / TSK-136..TSK-140)](#galeriahero-por-votos--mis-mapas-personales--guardados-de-media--propiedad-de-medios-del-mapa-2026-09-19---adr-046--adr-047--tsk-136tsk-140)
- [Sesion 2026-09-18/19 - Express (TSK-124..TSK-132)](#sesion-express-tsk-124tsk-132-ui-de-perfilgaleriacomunidad--media--modo-express-2026-09-1819---sin-adr-nuevo-nota-de-practica)
- [Sesion 2026-09-18 - Comunidad > Audiovisual (ADR-044 / TSK-123)](#sesion-tsk-123-correccion-comunidad--audiovisual-2026-09-18---adr-044)
- [Sesion 2026-09-18 - Modulos nuevos (ADR-042 + ADR-043 / TSK-119..TSK-122)](#sesion-tsk-119tsk-122-modulos-nuevos--bugs-activos-2026-09-18---adr-042--adr-043)
- [Sesion 2026-09-18 - Comunicacion oficial + Casas (ADR-041 / TSK-118)](#sesion-tsk-118-comunicacion-oficial--casas--admin-mapa-2026-09-18---adr-041)
- [Sesion 2026-09-18 - Museo URL-only + acordeon (ADR-039 + ADR-040 / TSK-114..TSK-117)](#sesion-tsk-114tsk-117-museo-url-only--acordeon-de-niveles--localizacion-y-map-picker-2026-09-18---adr-039--adr-040--enmienda-1-de-adr-039)
- [Sesion 2026-09-18 - Sprint Multimedia/Perfil/Galeria/Mapa (TSK-113)](#sesion-tsk-113-sprint-multimedia--perfil--galeria--mapa-2026-09-18---cierre-documental)
- [Sesion 2026-09-18 - Casas + Clases Rising Star (ADR-038 / TSK-112)](#sesion-tsk-112-sistema-de-casas-cofre--nivelacion-y-clases-rising-star-2026-09-18---adr-038)
- [Sesion 2026-09-17 - Geocerca 50 m + album_oficial (ADR-037 / TSK-111)](#sesion-tsk-111-geocerca-50-m-album_oficial-en-el-mapa-limpieza-del-admin-y-refactor-de-herogaleria-2026-09-17---adr-037)
- [Sesion 2026-09-17 - Compartir social con XP (ADR-036 / TSK-110)](#sesion-tsk-110-compartir-social-con-xp--interacciones-de-media-unificadas-2026-09-17---adr-036)
- [Sesion 2026-09-17 - XP decimal + Clase + rankings (ADR-035 / TSK-109)](#sesion-tsk-109-xp-decimal-pestana-clase-y-rankings-de-comunidad-2026-09-17---adr-035)
- [Sesion 2026-09-17 - Ficha: hero, sintro, galeria y modulos (ADR-034 / TSK-108)](#sesion-tsk-108-ficha-de-destino-hero-sintro-galeria-y-orden-de-modulos-2026-09-17---adr-034)
- [Sesion 2026-09-17 - Media del mapa y guardados (ADR-031/032/033 / TSK-107)](#sesion-tsk-107-media-del-mapa-guardados-de-media-y-radio-por-lugar-2026-09-17---adr-031--adr-032--adr-033)
- [Sesion 2026-09-16 - Capa multimedia y galerias (ADR-030 / TSK-106)](#sesion-tsk-106-capa-multimedia-galeria-comunidad-y-galeria-hospedajes-2026-09-16---adr-030-actualizado)
- [Sesion 2026-09-16 - Lote promptarreglos (ADR-030 / TSK-105)](#sesion-tsk-105-lote-promptarreglos---galeria-unificada-de-destino--arreglos-de-dm-galeria-popover-visita-y-album-2026-09-16---adr-030)
- [Historico (sesiones del 2026-09-15 y anteriores; TSK-104 y previas) - ver NEXT_ARCHIVO.md](NEXT_ARCHIVO.md)

## Completado reciente
- Cierre documental express **2026-09-20** (TSK-142, modo express) - pagina dinamica **`salto-del-tequendama`** (categoria `sitio`, ciudad Soacha, region Cundinamarca) **PUBLICADA en produccion** desde el archivo fuente corrupto `hotel tequendama.txt` (ficha JSON a medio generar; lineas 92-119 con texto de error de Gemini). Saneada la ficha -> `ficha/ficha-salto-del-tequendama.md` (JSON valido, FAQS x5, FOTOS_SUGERIDAS con 5 URLs reales verificadas HEAD 200, FUENTES: casamuseotequendama.org + maps); 5 fotos resueltas en Wikimedia Commons (compliance BUG-022); 3 scripts (`seed-` upsert ON CONFLICT slug con `--dry`, `load-` API DELETE+POST token default, `smoke_test_` con fake_neon + buildHTML); Escudo GOLD local (`node --check` x3, ASCII 0 bytes >127, smoke **15/15 PASS**, divs diff=0). CARGA A PRODUCCION verificada: loader OK, destino **id `8c2b48fc-c6c5-4ec4-ad42-909a73911ce0`** `status=published`; https://exploraco.vercel.app/salto-del-tequendama.html renderiza completa (hero, galeria, entradas, tours, itinerario, FAQ, mapa, JSON-LD TouristAttraction). Typo del archivo fuente corregido ("Caoda"->"Caida") en seed+ficha+clean.json. SIN ADR nuevo ni bug de ExploraCO: DECISIONS.md y BUGS_HISTORICOS.md NO se tocaron. Deuda etiquetada `[DEUDA-EXPRESS]` (horario a revalidar, contacto sin verificar, itinerario de 2 paradas, archivos fuente en la raiz). Detalle en "Que se estaba haciendo" y en `TASKS.md` TSK-142.
- Cierre documental **2026-09-20** (gobernanza de orquestacion): TERCER grupo de agentes primarios **`hybrid-plan`/`hybrid-build`** (esquema tripartito de orquestacion con ruteo por riesgo) + **ADR-048 APROBADO** + AGENTS.md seccion 1.2 + `orquestacion agentes.md` v1.1. `opencode.json` INTACTO (`default_agent: free-plan`). Tarea **TSK-HYBRID-001 COMPLETADA**. Verificado ADR-006: archivos reales de ambos agentes; 17/17 agentes citados por la matriz existen (GAP `exp-pickle-free` de TSK-141 resuelto). Sin cambios en `api/*` (8/8 INTACTO), sin migraciones. Detalle en "Que se estaba haciendo".
- Cierre documental express **2026-09-20** (TSK-141, modo express) - NUEVA gema Gemini **"ExploraCO Research"**: `.opencode/skills/gemini-research/prompts/GEMINI_GEMA_INVESTIGACION.md` (154 lineas, 12 bytes >127 = tildes/glifos propios de un prompt; NO es codigo runtime, ADR-002 aplica a `api/*.js`; **untracked**). El usuario da nombre+lugar (destinos, uno a uno) o un lote de N (eventos) y la gema ejecuta TODA la investigacion web por si misma, usando como adjuntos de referencia los 3 recursos canonicos (`GEMINI_MASTER_PROMPT.md`, `GEMINI_EVENTOS_PROMPT.md`, `ficha_template.md`) sin duplicar contenido; entrega ficha .md + bloque JSON final (esquema seccion 6 master) o array JSON de eventos, con clogs Escudo GOLD (INFO/DEBUG/LINK/TRACE/TIME) y cierre `==FIN==`; NO edita codigo (los mandatos los ejecuta el pipeline ExploraCO). Validacion downstream: `node .opencode/skills/gemini-research/scripts/validate_ficha.js` (fichas; ruta canonica, BUG-034 vigente) y `node scripts/validate_eventos.js` (eventos). GAP de infraestructura: `exp-pickle-free` en la matriz del AGENTS.md 1.1 sin archivo de agente. Detalle en `TASKS.md` TSK-141 y en "Que se estaba haciendo".
- Sesion "Galeria/hero por votos + Mis mapas personales + guardados de media + propiedad de medios del mapa" (2026-09-19) - 5 tareas TSK-136..TSK-140 + 2 ADR nuevos (**ADR-046** contrato del hero, **ADR-047** regla de propiedad de medios) + 7 BUG (BUG-071..BUG-077). **Todo COMMITEADO** en `main` (commits `6c84f9d` "videos", `600e656`/`8fe7b47`/`e7445c3` "mapa", `afb3b5d` "Update index.html", `41a3f71` "destinos", `3ffd7a9` "fotos hero"; HEAD `3ffd7a9`; `main` a la par de `origin/main`). Doc de analisis `exploraco desarrollo/ampliacion desarrollo/ANALISIS_AI-DOS_v1.1_y_REGLAS_DE_ORO_v5.md` (NUEVO, 285 lineas, 0 bytes >127) y `AI-DOS Master Specification v1.1.docx` siguen **untracked**. Presupuesto **8/8 INTACTO**; sin migraciones. Smokes: `smoke_mapa_cultural.js` 73 checks 0 FAIL, `smoke_auditoria_pagina_destino.js` 61 checks PASS, `smoke_036_media_unificada.js` 90/90 PASS.
- Feature "Migracion de `index.html` al motor compartido del Mapa Cultural" / ADR-045 -- TSK-134 (2026-09-19, **working tree, SIN commitear**) - ELIMINA el motor Leaflet inline del `index.html` (~1190 lineas, bloque 2256-3445) y su estado muerto (12 vars + `mapaGeoRequested`); lo reemplaza por shims (`initMapaSection` con retry si `!mcMapa.getMap()`, `refreshMapaMarkers` sin recursion, `geolocateMapa`, `resetMapaColombia`, `openMapaDrawer`/`closeMapaDrawer`, `INDEX_MC_OPTS`, `var mcMapa`) + bloque lazy (IntersectionObserver/scroll/timeout 2 s); agrega `<script src="mapa-cultural.js">` (L882) ANTES del inline y del connector. CONSERVA `esc`/`photoPlaceholderHTML`/`starHtml`/`toggleMapaSave`/`renderMyMap`/Mi Mapa legacy/`MAPA_PLACES`/`MAPA_MEDIA`/`mapaMap` y el **CSS inline a proposito** (paridad visual; 0 refs a `mapa-cultural.css`). `mapa-cultural.js` SUBE a **v1.1.0** (68417 bytes) con opciones de compatibilidad: `enableMediaOnAll`/`mediaEnabled`/`mediaFilter` (`false` = capa SIN filtro)/`mediaPhotoIcon`/`clusterLinksNavigate`/`mediaControls`/`bindList`/`data-comments-*` (default = comportamiento comunidad). `git diff --numstat`: `index.html` +79/-1152, `mapa-cultural.js` +80/-20, `scripts/smoke_mapa_cultural.js` +13/-1; `api/*` e `index-api-connector.js` **INTACTOS**. Presupuesto **8/8 INTACTO**; sin migraciones. Smoke **58/58 PASS** (`SMOKE MAPA CULTURAL: OK`); Escudo GOLD y QA **APTO CON OBSERVACIONES** (divs 370/370, contrato del connector OK, sin bloqueantes). Pendiente **TSK-135** (QA visual en navegador). Detalle en `TASKS.md` TSK-134. Se apoya en TSK-133. **[Actualizacion cierre 2026-09-19]:** TSK-134 SI quedo COMMITEADA en `61392c0` "mapa" (verificado ADR-006).
- Feature "Mis mapas personales (comunidad) con paridad al mapa cultural del index" / ADR-045 -- TSK-133 (2026-09-19, **commiteada en `b4ffd4e` "maps"**, 11 archivos) - NUEVOS assets frontend `mapa-cultural.js` (motor `window.MapaCultural`, ASCII-safe, 65282 bytes al cierre, L1597) y `mapa-cultural.css` (121 reglas scopadas bajo `.mc-root`, 0 `!important`) + `scripts/smoke_mapa_cultural.js` (56/56 PASS al cierre; hoy 58/58 tras TSK-134); MODIFICADOS `mymapa.js` (+154/-46; consume `MapaCultural.create` L125, elimina Leaflet propio y `bindPopup`) y `comunidad.html` (+17/-0; `<link>` L14 y `<script>` L559 antes de `mymapa.js` L561). `index.html` intacto AL CIERRE de TSK-133; `api/*` intacto. Presupuesto **8/8 INTACTO**; sin migraciones. QA **APTO CON OBSERVACIONES**. Mitiga (no cierra) **BUG-061** con `jsonAuthHeaders()`. Se completa con la migracion del index en **TSK-134**. Detalle en `TASKS.md` TSK-133 y en la sesion de "Que se estaba haciendo".
- Sesion express TSK-124..TSK-132 (2026-09-18/19) "UI de perfil/galeria/comunidad + media + adopcion del modo express" - 9 tareas en "modo express" (skill `express-mode`): quitar "Fotos publicadas" del Museo (TSK-124), popup de "Media reciente" reusando `#av-album-modal` (TSK-125), galeria en 2 bloques sin tope de 12 (TSK-126), fusion Clase/Tabla de Destino/Vocaciones -> "Arbol de Progreso" (TSK-127), "Mi Viaje" -> NUEVO `mymapa.js` en Comunidad y retiro del `index.html` (TSK-128), visibilidad/dedup de media + diagnosticos/cleanup (TSK-129), LIMIT por rama en `multimedia_mapa` (TSK-130), votos de viajero a `media_votos` (TSK-131) y skill `express-mode` (TSK-132). **Verificado contra archivo real (ADR-006):** la mayor parte ya esta COMMITEADA en `main` (`26d2e3c`, `66db2e6`, `604fa0d`, `d309e17`, `b41e3ba`, `68e50a4`, `dfde7e7`); `main` esta **ahead 1** de `origin/main` (`dfde7e7` sin push). Solo TSK-130/TSK-131 y los assets/docs del modo express siguen sin commitear. Presupuesto **8/8 INTACTO**. Bugs nuevos: **BUG-068** (dedup 23505 de recursos ocultos), **BUG-069** (starvation del mapa), **BUG-070** (votos de viajero legacy); **BUG-066** re-confirmado como precedente. Detalle en `TASKS.md` TSK-124..TSK-132 y en la sesion de "Que se estaba haciendo".
- TSK-123 / ADR-044 "Correccion Comunidad > pestana Audiovisual -- tarjetas interactivas en Media reciente, exclusion opt-in del album Mi Museo y abstraccion compartida `media-actions.js`" (2026-09-18, IMPLEMENTADO EN WORKING TREE, SIN commitear) - `git diff --numstat`: `api/interacciones.js` +63/-4, `comunidad.html` +78/-7, `galeria.html` +17/-76; NUEVO sin versionar `media-actions.js` (259 lineas, 0 bytes >127). **Backend aditivo (header SIN bump: sigue v23):** `mi_feed_fotos` (~L4853-4912) acepta `usuario_id` opcional (ignorado si no es UUID valido) y devuelve `autor_id` (`af.autor_original_id`)/`es_propia`/`ya_votado`/`ya_guardado` (este ultimo en query separada con `conDegradacionMedia(...,'media_guardados',[])` para no tumbar el feed sin la 019); `albumes` (~L4252-4293) con opt-in `excluir_museo=1|true` (`AND LOWER(a.titulo) <> 'mi museo'`, sin el param contrato intacto); `album_detalle` (~L4296-4364) devuelve `ya_guardado`/`es_propia` por foto. **Frontend:** NUEVO `media-actions.js` (`window.MediaActions.{voto,guardar,sync,bind}` con `data-ma-*`); `galeria.html` refactorizado (elimina `gPostJson`/`gPintaVoto`/`gMediaVoto`/`gMediaGuardar`; script L242, bind/sync L563-565); `comunidad.html` con like/comentar/guardar en `feedCardAV` (L2145) y en el modal de album (L1962), `excluir_museo=1` (L2037), `usuario_id` (L1936/L2128 via `avUidActual` L565). **Fix del bug de duplicacion:** `cargarAudiovisual(reset)` -> `cargarAlbumesAV(!reset)` (L2024) -> **BUG-067 CERRADO**. **Escudo GOLD:** `node --check` OK (`api/interacciones.js`, `media-actions.js`); ASCII 0 bytes >127 en `media-actions.js`; divs `comunidad` 307/307 y `galeria` 84/84; smoke Node vm de `media-actions` 41/41 PASS (ad-hoc, NO versionado: deuda D-14); QA APTO sin bloqueantes. Presupuesto **8/8 INTACTO**. **PENDIENTE OPERATIVO: confirmar/aplicar en Neon las migraciones 019 (`media_guardados`) y 023; sin ellas el guardado real degrada a `ya_guardado=false`.** Decision en ADR-044; tarea en TASKS.md TSK-123; deuda D-10..D-14 en BUGS_HISTORICOS.md; BUG-061 amplificado (los nuevos botones Guardar confian en `body.usuario_id` sin Bearer).
- TSK-119..TSK-122 / ADR-042 + ADR-043 "Paquete 18-sep-2026: migracion 027 zonas/marcas/patrocinios, ramas marca_* en usuarios.js, fix galeria R10, FE perfil/mapa y remediacion de fotos de brsk84" (2026-09-18, IMPLEMENTADO EN WORKING TREE, SIN commitear) - 4 archivos NUEVOS sin versionar (`db/migrations/027_zonas_marcas.sql` 348 lineas, idempotente/ASCII-safe; `scripts/verify_027_precheck.js` 258; `scripts/diagnose_fotos_brsk84.js` 310, read-only; `db/cleanups/002_fix_fotos_brsk84.sql` 151, soft-delete idempotente) + 4 modificados (`api/usuarios.js`: +3 ramas `marca_activar` L1192-1232 / `marca_patrocinar` L1234-1266 / GET `mi_marca` L296-306, **header SIN bump: sigue v18**; `api/pagina-destino.js` L2644 `LIMIT 24 -> 200` fix R10; `mi-perfil.html` FE-01 "Fotos publicadas" solo admin + FE-02 fusion "Clase & Arbol de Progreso" con `#arbol-body` L957; `index.html` FE-03 `.mpa-media-pin-video` L544/L2996). Escudo GOLD: `node --check` 4 `.js` OK; ASCII 0 bytes >127 en `.js`/`.sql`; divs `mi-perfil` 446/446 e `index` 523/523; `c.tipo === 'marca_` = 2; `mpa-media-pin-video` = 2; `destinos_fotos ... LIMIT 200` = 1; ids unicos. Presupuesto **8/8 INTACTO**. **PENDIENTE OPERATIVO (BLOQUEANTE): aplicar la migracion 027 (crea `marcas`/`patrocinios`) y el cleanup 002 en Neon; correr `node scripts/diagnose_fotos_brsk84.js` con `DATABASE_URL`.** Abre **BUG-065** (INSERT de `album_agregar_foto` sin `visible`) y **BUG-066** (regresion FE-02, CERRADA con `#arbol-body`). Decisiones en ADR-042 y ADR-043; tareas en TASKS.md TSK-119..TSK-122.
- TSK-118 / ADR-041 "Comunicacion oficial + Casas (tributo configurable/lider/misiones) + eras y titulos + admin mapa" (2026-09-18, IMPLEMENTADO EN WORKING TREE + HOTFIXES POST-QA, SIN commitear) - 6 archivos de codigo modificados (+549/-41 acumulado incl. hotfixes; `git diff --numstat` verificado) + 1 migracion nueva sin versionar: `usuario-session.js` (+245/-0; `TITULOS_POR_NIVEL` de 20 titulos L82, `ERAS` Mundana/Patrocinada/Organizador/Leyenda + `getEra` L106-113, modales `mostrarModalNivelUp`/`mostrarModalCambioEra` L116+ disparados desde `aplicarResultadoXp` al subir de nivel); `api/interacciones.js` (+173/-21 acumulado incl. hotfixes; header v22 -> **v23**: `acreditarClaseYCofre` L338-345 lee `casas_cofre.tributo_pct` (default 10, clamp 0..15), helper `avanzarMisionesCasa` L360 + `CASA_MISIONES_META`, `GET ?tipo=chat_salas` expone `es_oficial` L3518, `GET ?tipo=casa_misiones` L5270, `POST ?tipo=anuncio_oficial` L5769 (solo Bearer `ADMIN_SECRET`), `POST ?tipo=casa_tributo_config` L5824 (admin o `lider_user_id`; hotfix J-2: authz por `validarSesion` L5835), bloqueo 403 de no-admin en `chat_msg` sobre sala `es_oficial`, hooks de misiones en foto/resena/visita/xp); `api/usuarios.js` (+66/-11 acumulado incl. hotfix J-3; header v16 -> v17 -> **v18**: `casa_ranking` expone `lider_user_id`/`tributo_pct` con degradacion escalonada 42P01/42703 y refresco best-effort del lider por Casa antes de leer, ya con throttle de 60 s por instancia desde v18); `comunidad.html` (+32/-4; sala oficial al tope via `sort`, borde/fondo dorado + badge "OFICIAL", input y boton ocultos para no-admin con hint, limpieza del input en `onOk`); `admin.html` (+30/-4; `#map-picker-el` 380 -> 500 px, `adm_actualizarCirculoRango()` con `L.circle` sobre `MapPicker.getPickerMap()` y hooks en `oninput`/`openMapPicker`/`confirmMapPicker`); `map-picker.js` (+3/-1; expone `getPickerMap()`/`getMiniMap()` L267-268). NUEVO sin versionar: `db/migrations/026_casas_comunicaciones.sql` (329 lineas, idempotente ADR-008, ASCII-safe ADR-002: 0 bytes >127 y 0 backticks; `chat_salas.es_oficial` + canal "Anuncios ExploraCO" + `uq_chat_salas_oficial`; `casas_cofre.tributo_pct` + CHECK 0..15 + `lider_user_id`; tablas `casa_roles` y `casa_misiones`; backfill de lider y 1 mision base por Casa). Presupuesto **8/8 INTACTO** (ADR-001/ADR-010). Decisiones (a)-(h) en `DECISIONS.md` ADR-041; tarea en `TASKS.md` TSK-118; relevo en `docs/HANDOFF_041.md`. **PENDIENTE OPERATIVO (BLOQUEANTE): aplicar 026 en Neon (024/025 YA aplicadas por indicacion del usuario, 2026-09-18) -> deploy backend (v23/v18) -> frontend.** Deuda: misiones base no diferenciadas por Casa; `casa_roles` solo puebla `lider`; linea-titulo L1 de `interacciones.js` aun v22 (changelog ya en v23); circulo de rango sin validar en produccion.
- HOTFIX post-QA TSK-118 / ADR-041 (2026-09-18, working tree, SIN commitear): `api/interacciones.js` paso a **v23** por los hallazgos J-1 (degradacion 42703 en `GET ?tipo=chat_salas` y `POST chat_msg` si la 026 no esta aplicada; se elimino el catch silencioso de `chat_msg`, AGENTS.md 2.2) y J-2 (seguridad: `POST ?tipo=casa_tributo_config` ahora exige `validarSesion(req, usuarioId2).ok` para autorizar al lider, cerrando el IDOR registrado como `BUGS_HISTORICOS.md` **BUG-064 CERRADO**); `api/usuarios.js` paso a **v18** por J-3 (throttle de 60 s por instancia al refresco del lider en `GET ?tipo=casa_ranking`, limitando las 3 escrituras sin tocar las lecturas). Escudo GOLD post-hotfix: `node --check` OK en 4 archivos (`api/interacciones.js`, `api/usuarios.js`, `usuario-session.js`, `map-picker.js`), ASCII-safe 0 bytes >127 en `api/`, balance de divs 0 y presupuesto 8/8 INTACTO. **BUG-061 sigue ABIERTO y los hooks `avanzarMisionesCasa` lo amplifican.** Orden de release vigente: 024 -> 025 -> 026 -> backend v23/v18 -> frontend.
- TSK-114..TSK-117 / ADR-039 + ADR-040 + ENMIENDA 1 de ADR-039 "Museo multimedia URL-only + acordeon de niveles + localizacion y map-picker" (2026-09-18, IMPLEMENTADO EN WORKING TREE, SIN commitear) - `api/interacciones.js` **v22** (header real L1-17; release compartido): ramas `POST/GET ?tipo=museo_recurso` (crear/editar/eliminar/listar sobre `album_fotos` con visibilidad server-side), filtros `af.visible=true` en todos los lectores publicos (incluidos conteos y subqueries de votos), misiones `mis_videografo`/`mis_sonidista` (`xp:15`, `gate_nivel:2`; catalogo 39 -> **41**) y campos aditivos `gate_nivel`/`desbloquea`/`nivel` en `?tipo=misiones` (ADR-040, via `MISION_GATE_XP` + `nivelDeMisionServidor`). NUEVOS sin versionar: `db/migrations/025_album_fotos_visible.sql` (171 lineas; `album_fotos.visible` default false + backfill + indice unico parcial `idx_albumes_usuario_mi_museo`), `niveles-data.js` (9363 bytes, fuente unica cliente), `map-picker.js` (11188 bytes, modulo compartido; `admin.html` refactorizado), `scripts/smoke_niveles_data.js` (31/31) y `scripts/verify_025_precheck.js`. `mi-perfil.html`: tab Museo CRUD por URL + localizacion con pin (T5/T7). Gate de creacion de los 3 tipos = `mis_fotografo` (evita deadlock circular) y **+15 XP para foto, video y audio** (ENMIENDA 1 de ADR-039; el texto viejo del ADR decia 0 XP y sin gate). Escudo GOLD APROBADO tras correcciones: `node --check` OK; ASCII OK; divs 0; `smoke_niveles_data` 31/31; `gamificacion_v4` 95/95; `smoke_021` 45/45; `smoke_038` 76/76; `smoke_test_perfil_progreso`/`comunidad`/`milestones_v2`/`check_buildHTML_inline` OK. Presupuesto **8/8 INTACTO**. **PENDIENTE OPERATIVO (BLOQUEANTE): aplicar 024 y 025 en Neon y LUEGO desplegar el backend v22 + frontend (orden 024 -> 025 -> v22).** Deuda: `smoke_036_compartir.js` (espera header v19) y `test_logros_catalogo.js` (espera 30 logros, real 33) siguen en rojo preexistente; 12 `catch` vacios preexistentes en `mi-perfil.html`.
- TSK-113 / Sprint Multimedia-Pefil-Galeria-Mapa (2026-09-18, COMPLETADA en working tree, SIN commitear) - 4 archivos modificados (+249/-56; `git diff --numstat` verificado): `api/pagina-destino.js` (+6/-6; header **v12.20260917** con changelog L1-2: fix REFORZADO de BUG-057 en listener capture -- `cerrarPopoverGuardar` ignora `ev.target.id==='btn-guardar'` L2513, checkboxes Tu Mapa L2533 / mapas tematicos L2545 / boton "Nuevo mapa" L2556 con `event.stopPropagation()`; BUG-057 pasa a **CERRADO**, ver BUGS_HISTORICOS.md); `mi-perfil.html` (+82/-27; Grupo 1: `mediaCardHTML` L1832 unifica `foto_url||texto||media_url` en grid 140px con votos y empty state "Aun no tienes fotos..." L1876, guardados por fuente `album`/`album_foto`/`viajero_foto` con placeholder + enlace al destino, geo en `agregarFotoAlbum` con `#album-nueva-foto-lat/lng` L658-660 + `usarMiUbicacionAlbum` L1992 y validacion de rango Colombia, logros con `renderTrofeoCard` L1140 desbloqueados primero y boton colapsable "+N bloqueados" L1155-1192; divs 394/394, script 3/3; comentario `Rev 2026-09-18b` insertado por O1 del Escudo GOLD #92); `galeria.html` (+58/-10; paginacion 12/pagina con `G.galPagina/galPorPagina/galItems` L248, `gGalRenderPage` L882 y `gGalLoadMore` L897, consolidacion curadas->viajeros->albumes, boton `#g-more` REUTILIZADO; divs 84/84); `index.html` (+103/-13; Grupo 3+4: `#md-mapa-destino-titulo` L1245 + `mdSetDestinoTitulo` L3301-3302 en pin L3310 y album L3454, `votarMediaMapa` L3566 con `mostrarLogin` L3569 y 401 L3584, `renderLogrosGrid` L4630 solo `estado==='completada'` L4648 con `tierOrder` L4645; divs 523/523). **Desviacion de alcance O2:** `index-api-connector.js` NO se modifico (el endpoint `multimedia_mapa` filtra solo por `destino_id` y `cargarAlbumOficialDestino` ya envia `destino_id`; el titulo del drawer se resolvio en `index.html`). Escudo GOLD #92 APROBADO CON OBSERVACIONES: `node --check` PASS, ASCII 0/0/0, divs 0/0/0, `smoke_auditoria_pagina_destino` 54/54 PASS. Presupuesto 8/8 INTACTO; sin migraciones; prompt de la tarea `PROMPT_OPENCODE_MULTIMEDIA_PERFIL_GALERIA.md` (untracked). **PENDIENTE OPERATIVO: commit/push/deploy de los 4 archivos + cierre documental en un solo release; NO mezclar archivos ajenos (O3): `opencode.json` + 3 `.opencode/agent/*` modificados + 4 borrados (`PROMPT_OPENCODE_TSK111.md`, `PROMPT_OPENCODE_TSK112.md`, `PROMPT_MULTIMEDIA_GALERIA.md`, `opencode - copia.json`).** Deuda confirmada: BUG-002 sigue ABIERTO en `api/pagina-destino.js` L2431. Detalle en TASKS.md TSK-113 y docs/HANDOFF_037.md.
- TSK-111 / ADR-037 Geocerca con radio urbano 50 m + `album_oficial` en el mapa cultural + limpieza de modulos del admin + refactor de hero/galeria de la ficha (2026-09-17, IMPLEMENTADO EN WORKING TREE, SIN commitear) - 7 archivos modificados (+335/-298) + 1 archivo nuevo sin versionar (`PROMPT_OPENCODE_TSK111.md`): `admin.html` (+49/-82; "Que incluye el precio" retirado del admin/render, UI "Orden de modulos" eliminada con `#hostal-modulos-list` OCULTO para preservar `tags.orden_modulos`, seccion "Operacion" eliminada con `f-capacidad` movido a General, `f-comotransporte` eliminado end-to-end, `moverFila`/`moveFaqRow`); `api/interacciones.js` (+44/-8; header v19 -> v20: `RADIO_DEFAULT_M`/`RADIO_POR_CATEGORIA` 100 -> 50 y subcategorias urbanas a 50, rural 250/parque-concierto 150/festival-deporte 200 intactos, `ACCURACY_MAX_M=150` y bloqueo 422 intactos, `album_oficial` en `multimedia_mapa`); `api/pagina-destino.js` (+121/-194; header v11: guard `edad_minima` con trim, hero botonera en 2 filas `.hctar-row` + grid 1+3 + `abrirLightboxHero`, "Fotos de viajeros" retirado, CTA "Ver todas las fotos"); `index-api-connector.js` (+32/-0; `cargarAlbumOficialDestino`/`window.cargarAlbumOficialDestino`); `index.html` (+51/-1; `mdMapaAlbumOficial`, solo rama `origen='destino'`); `scripts/smoke_016_multinivel_crowdsourcing.js` (+29/-3) y `scripts/smoke_auditoria_pagina_destino.js` (+9/-10) actualizados. Presupuesto 8/8 INTACTO (ADR-001); TSK-111 NO genera migraciones. Escudo GOLD (qa-auditor) APTO CON OBSERVACIONES: `node --check` 8/8 api, ASCII 0/0/0 en `api/interacciones.js`, balance DIVs admin hostal/comida/sitio/evento = 0, smokes `check_buildHTML_inline`, `smoke_auditoria_pagina_destino` (54), `smoke_016` (52) y `smoke_021` (45) PASS (`smoke_test_epic_prompt` 4 FAIL PREEXISTENTES ajenos, DQ-2). **PENDIENTE OPERATIVO: migraciones 019-023 YA APLICADAS en Neon (confirmado por Javier el 2026-09-17; ver sesion TSK-112); solo queda commit/push/deploy de los 7 archivos + este cierre documental en un solo release.**
- TSK-110 / ADR-036 Compartir social con XP (primer share 25 / posteriores 5, tope 10 eventos y 50 XP por 24h) + interacciones de media unificadas (votos/comentarios/guardados en `media_*`) (2026-09-17, IMPLEMENTADO EN WORKING TREE, SIN commitear) - 8 archivos modificados (+1379/-536) + 5 archivos nuevos sin versionar: `api/interacciones.js` (+949/-425; header `v18` -> `v19`: rama POST `compartir` con `validarSesion` y ledger en `media_compartidos`, 3 misiones + 3 logros nuevos, `media_voto`/`media_comentar`/GET `media_interacciones`/`media_comentarios`, alias legacy conservados, TODOS los lectores migrados a `media_*`, `galeria_destino` `items[]` v2 con `fuente`/`votos`/`comentarios`/`ya_votado`/`ya_guardado`/`tipo_voto:'media'`); `galeria.html` (+222/-32; 5 secciones en modo destino + modales VOTAR/GUARDAR/COMPARTIR + comentarios por 3 fuentes); `album-comments.js` (+92/-33; v2.0.0, `mount(target,{fuente,itemId},opts)` retrocompatible); `index.html` (+50/-17; insignia `compartido` derivada del catalogo real de logros); `api/pagina-destino.js` (+40/-27; hero mosaico 1+3 y boton Compartir en `.subnav`); `usuario-session.js` (+24/-0; `aplicarResultadoXp`); `comunidad.html` y `mi-perfil.html` (+1/-1 cada uno: solo cache-bust `album-comments.js?v=2`). NUEVOS: `compartir.js` (295 lineas, `window.ExploraCompartir`), `db/migrations/022_media_compartidos.sql` (131), `db/migrations/023_interacciones_media_unificadas.sql` (408), `scripts/smoke_036_compartir.js` (290) y `scripts/smoke_036_media_unificada.js` (361). Presupuesto 8/8 INTACTO (ADR-001); catalogo real HOY 39 misiones / 33 logros. Verificacion: `node --check` 7/7 OK, ASCII-safe 0 >127 / 0 backticks en `api/*.js`, `compartir.js` y migraciones, smokes 55/55 y 71/71 PASS (mock). **PENDIENTE OPERATIVO (BLOQUEANTE): aplicar 022 y 023 en Neon ANTES del deploy del backend v19; los smokes NO validan Neon.**
- TSK-109 / ADR-035 XP decimal `numeric(12,2)` + pestana "Clase" consolidada + rankings de comunidad (Casas/Facciones/Parches) (2026-09-17, IMPLEMENTADO EN WORKING TREE, SIN commitear) - 10 archivos de codigo modificados (+700/-282) + 1 migracion nueva + 1 preflight nuevos sin versionar (mas `DECISIONS.md` +249/-1 agregado por architect): `db/migrations/021_xp_decimal.sql` (NUEVA, 121 lineas, idempotente ADR-008, ASCII-safe ADR-002; 9 columnas XP -> `numeric(12,2)` con guard `information_schema`, sin indices) + `scripts/verify_021_precheck.js` (NUEVO, read-only, `MIN/MAX/COUNT`); `api/interacciones.js` (+185/-98; header v18: `red2`/half-up, `parseFloat`/`Number`, rama GET `pandilla_ranking` L4257-4284, gate de `album_crear` con `calcularNivelLocal` L5379, guarda de fama `<= 0` L1880-1881); `api/usuarios.js` (+102/-40; header v15: `casa_ranking` con `miembros_activos` y `ORDER BY xp_total DESC` L510-557, rankings sin `::int`); `comunidad.html` (+195/-43; tab Ranking con 4 sub-vistas Viajeros|Casas|Facciones|Parches L372-386, `setRankingVista` L1661, facciones fuera de "Activo Oculto"); `mi-perfil.html` (+101/-50; tab `clase` con arbol + sub-vista `senderos` + vocaciones inline + Mi Casa compacto); `usuario-session.js` (+39/-19; helper `window.ExploraCO.fmtXp`/`redondearXp` L46-60); `api/admin.js` (+29/-14); `admin.html` (+20/-9); `index.html` (+15/-5); `perfil.html` (+9/-1); `api/pagina-destino.js` (+5/-3; header v10). Presupuesto 8/8 INTACTO (ADR-001). BUG-042 pasa a CORREGIDO y se registra BUG-063 (guarda de fama de Parche); deuda de columnas no versionadas (`usuarios.activo`/`ultimo_acceso`/`interacciones.xp_ganado`) anotada con fallback 42703. **PENDIENTE OPERATIVO (BLOQUEANTE): aplicar la migracion 021 en Neon ANTES del deploy del backend; desplegar en 2 releases (backend + 021 primero, frontend despues). Checklist en `docs/DEPLOY_021.md`.**
- TSK-108 / ADR-034 Ficha de destino: hero de 4 fotos, `destinos.sintro` curada, galeria 1+12 y `galeria.html` con 4 secciones + orden de modulos por hostal (2026-09-17, IMPLEMENTADO EN WORKING TREE, SIN commitear) - 6 archivos modificados (+663/-95) + 1 migracion nueva: `api/pagina-destino.js` (+283/-65: hero `HERO_THUMBS_MAX=3`, botonera sin "Ver galeria", `sintro` con fallback, galeria 1+12 con `GAL_THUMBS_MAX=12`/6+6 y `.gal-thumbs` 4/2/1, orden de modulos hostal por `tags.orden_modulos`); `api/interacciones.js` (+46/-0: GET `mapas_de_destino` con `validarSesion` para el viewer); `api/admin-destinos.js` (+19/-3: `sintro` en SELECT/INSERT/UPDATE + `normSintro`); `api/publicar-lugar.js` (+12/-2: `sintro` en el INSERT draft); `admin.html` (+150/-5: `#f-sintro`, `HOSTAL_MODULOS_ORDEN_DEFAULT`, reorden por flechas de modulos hostal + Actividades); `galeria.html` (+153/-20: 4 secciones + bloque de subida + `mapas_de_destino`); NUEVA `db/migrations/020_destinos_sintro.sql` (16 lineas, `ADD COLUMN IF NOT EXISTS sintro TEXT`, idempotente ADR-008, ASCII-safe ADR-002). Presupuesto 8/8 INTACTO (ADR-001). ADR-030 actualizado (hero 12->4, CTA "Ver galeria" retirado solo del hero). BUG-062 DETECTADO/PENDIENTE (fotos Unsplash no recolectadas por `getPhotos()`). **PENDIENTE OPERATIVO (BLOQUEANTE): aplicar migracion 020 en Neon + commit/push/deploy de los 6 archivos.**
- TSK-107 / ADR-031 + ADR-032 + ADR-033 Capa de media del mapa (album de destino + visibilidad publica), guardados de media + area museo del perfil, y radio de verificacion por lugar para "Estuve aqui" (2026-09-17, IMPLEMENTADO EN WORKING TREE, SIN commitear) - 7 archivos modificados (+591/-53) + 1 migracion nueva: `api/interacciones.js` (+212/-14: fix 503 con `queryConAvatarFallback` en `multimedia_mapa`, fila `origen='destino_album'`, `scope=mio`, GET `mis_fotos`/`mis_guardados_media`, POST `guardar_media`/`quitar_guardado_media`, `factorXpPorRadio`/`resolverRadioM`); `index.html` (+89/-3: toggle "Solo mio"); `index-api-connector.js` (+57/-31: wiring `scope=mio`); `mi-perfil.html` (+109/-0: "Mis fotos" + "Mis guardados"); `perfil.html` (+60/-3: "Sala V: Fotos" publica, sin guardados); `admin.html` (+51/-1: campo `#f-radio-m`); `api/admin-destinos.js` (+16/-3: `radio_m` en POST/PUT); NUEVA `db/migrations/019_media_guardados_radio.sql` (65 lineas: `destinos.radio_m` + CHECK 25..100000 + tabla `media_guardados`). Presupuesto 8/8 INTACTO (ADR-001). **PENDIENTE OPERATIVO (BLOQUEANTE): aplicar migracion 019 en Neon + commit/push/deploy + verificacion en vivo de `hostal-r10-bogota`.** BUG-061 sigue ABIERTO.
- TSK-106 / ADR-030 (actualizado) Capa multimedia, galeria comunidad y galeria hospedajes (2026-09-16, IMPLEMENTADO Y VERIFICADO EN WORKING TREE, SIN commitear) - 5 archivos modificados (+243/-56): filtro opcional `usuario_id` en `GET ?tipo=multimedia_mapa` (RESTRICTIVO, validado por regex uuid) e indices capturados del UNION ALL (`api/interacciones.js` +28/-5); `index-api-connector.js` (+12/-2) sin `origen=album` + `usuario_id` si hay sesion; `index.html` (+30/-6) pines de destino (`#1f8a70` + borde punteado, dedupe por `origen_id`, tope 300); `api/pagina-destino.js` (+12/-5) hero de 12 miniaturas (`HERO_THUMBS_MAX=12`, `slice(1,13)`, `LIMIT` de `destinos_fotos` 12->24, `.prow` grid responsivo 6/4 col); `galeria.html` (+161/-38) grid unico "Fotos del destino" + aviso/input/boton de compartir (se eliminan `gSeedCard` y `#g-dest-usuarios`). P2 OMITIDO; P3 re-alcanzado a `galeria.html` (no `comunidad.html`); H-2 registrado como BUGS_HISTORICOS.md BUG-061 (spoofing de `tipo='foto'`, escalado a `sql-security`); H-3 (`smoke_auditoria_pagina_destino.js` ignora el slug). Presupuesto 8/8 INTACTO. **PENDIENTE: commit/push/deploy (sin mezclar los 3 archivos borrados ajenos a TSK-106).**
- TSK-105 / ADR-030 Lote "promptarreglos" - DM 500, galeria duplicada, popover Guardar, "Estuve aqui", unificacion Como llegar/Ubicacion, galeria unificada de destino, seguridad de album y degradacion 503 (2026-09-16, IMPLEMENTADO Y VERIFICADO EN WORKING TREE, SIN commitear) - 8 archivos modificados (+649/-167) + 2 scripts nuevos sin versionar:
  - `api/interacciones.js` (271 lineas cambiadas): casts `::text` en `dm_hilos` (`m.usuario_id::text<>$1`, `m2.usuario_id::text=$1`, `bloqueador_id::text=$1 OR bloqueado_id::text=$1`, L2937-2939/L2962) por el 42P08 (BUG-055); helper `queryConAvatarFallback` (L2114) que degrada `42703` (`usuarios.foto_url` ausente) a `avatar_url` en `museo_publico`/`album_detalle`/`galeria_destino` (BUG-060); `items[]` aditivo solo con `incluir`; 403 `ALBUM_AJENO`/400 `AUTOR_ORIGINAL_INVALIDO` en `album_agregar_foto` (BUG-059); `repartirXpReferidos` en `album_voto` (gap ADR-027).
  - `api/pagina-destino.js` (197 lineas cambiadas): `#galeria` unificada (curadas + viajeros + `#fp-upload`, ancla legacy `#fotos`), `secComoLlegar` (fusion de `secTransporteHostal` + `secMapa`, id="como-llegar", ancla legacy `#mapa`), UI "Guardar en album", helper `galEsc()` (cierra XSS del inline), fix de `cerrarPopoverGuardar` (BUG-057).
  - `api/admin-destinos.js` (71 lineas cambiadas) + `api/utilidades.js` (59): semantica REPLACE (dedupe por url + DELETE + reinsert) con guard anti-perdida (lista vacia -> 400 y NO borra) (BUG-056); `admin.html` (8 lineas) elimina la doble escritura de la galeria.
  - `api/usuarios.js` (27 lineas cambiadas): fallback de avatar en `perfil_publico` (BUG-060).
  - `usuario-session.js` (127 lineas cambiadas): "Estuve aqui" con `GET ?tipo=geo_nonce_solicitar` + `Authorization: Bearer` + `nonce`, reintento con nonce nuevo tras 401 y `obtenerUbicacion` con reintento de baja precision (cierra BUG-036).
  - `scripts/smoke_auditoria_pagina_destino.js` (56 lineas cambiadas): 54 checks (el modulo unificado se muestra SIEMPRE en la ficha).
  - NO hay migraciones nuevas ni archivos nuevos en `api/` (8/8 INTACTO, ADR-001); bugs registrados BUG-055..BUG-060; decision en ADR-030.
  - **PENDIENTE OPERATIVO (BLOQUEANTE): `node scripts/apply_004_foto_url.js` (aplica migracion 004) + `node scripts/dedupe_destinos_fotos.js --apply` (dedupe + `CREATE UNIQUE INDEX idx_destinos_fotos_destino_url`) en Neon + commit/push/deploy.** Requieren `DATABASE_URL` (no hay credenciales locales). Sin el segundo, BUG-056 no queda cerrado al 100%; sin el primero, BUG-060 queda solo mitigado.
  - **Nota de version (ADR-006):** los comentarios nuevos de `api/interacciones.js` se rotulan `v16` pero el header real sigue en `v14` (no se agrego el bloque de changelog `v16`).
- HOTFIX login 500 / BUG-054 (2026-09-15, working tree, SIN commitear) - `POST /api/usuarios` (upsert de login/registro) devolvia 500 para TODOS los logins con `device_hash`; error real de Postgres/Neon: `column "t.ord" must appear in the GROUP BY clause or be used in an aggregate function` (SQLSTATE 42803). Causa raiz: el merge de `device_hashes` en `api/usuarios.js` usaba `SELECT COALESCE(jsonb_agg(t.h), '[]'::jsonb) FROM (...) t ORDER BY t.ord LIMIT 5` (ORDER BY externo junto al agregado SIN GROUP BY = invalido en Postgres); introducido en el commit `7cc28fe` ("sistema de puntos", 2026-09-14), PREVIO a TSK-104, y expuesto al forzar el re-upsert (fix de sesion BUG-053). Fix: `api/usuarios.js` (+30/-14; header `v13` -> `v14`) con `jsonb_agg(h ORDER BY ord)` (ORDER BY dentro del agregado + subquery interna `u ORDER BY u.ord LIMIT 5`) y `try/catch` best-effort que loguea con `console.error` y NO re-lanza (el fingerprint nunca bloquea el login); QA: `node --check` OK, ASCII/backticks/doble-escape 0/0/0, simulacion runtime con mock `sql`/`neon` 15/15 PASS (200 con `device_hash`; 200 incluso si el UPDATE falla), sin regresion en A1/`verificar_usuario`/`total`, el patron invalido ya no aparece en `api/*.js`; registrado como BUGS_HISTORICOS.md BUG-054; **PENDIENTE OPERATIVO: commit/push/deploy (login roto en produccion) + login real post-deploy que envie `device_hash`.**
- Bugfix de sesion / regresion colateral de BUG-049 (2026-09-15, working tree, SIN commitear) - `refrescarSesion()` de `usuario-session.js` y `mi-perfil.html` REEMPLAZABA `window.ExploraCO.usuario` con la proyeccion publica de `GET /api/usuarios?id=` (SIN `jwt`/`auth_id`/`email`/`email_verificado`), dejando el banner "Verifica tu email" y bloqueando referidos/facciones/casa/DM de la cuenta `brsk84@gmail.com` pese a `email_verificado=TRUE` en Neon (causa: la proyeccion publica la introdujo el fix de PII de BUG-049 / ADR-028, `api/usuarios.js` L500-529); fix: FUSION (`Object.assign({}, actual, d.data)`) + conservar `jwt`/`jwt_expira_en` + detectar la proyeccion publica (respuesta sin `email`) y llamar `refreshJwt()`/`renovarJwt()` sin pisar la sesion (`usuario-session.js` +21/-4, `mi-perfil.html` +19/-4); QA: `node --check` OK, delta ASCII 0 en lo nuevo, divs 0, `smoke_017` 73/73 PASS, `smoke_016` 39/39 PASS, sin recursion; registrado como BUGS_HISTORICOS.md BUG-053; **PENDIENTE OPERATIVO: commit/push/deploy + re-login del usuario afectado si su localStorage ya perdio `auth_id`/`email`.** Nota de version (ADR-006): tras el hotfix de login BUG-054 el header real de `api/usuarios.js` es v14 (v13 al cierre de TSK-104).
- TSK-104 / ADR-029 Verificacion admin forzada + rama `verificar_usuario` + dashboard real (5 tarjetas) y filtro de verificados (2026-09-15, IMPLEMENTADO Y VERIFICADO EN WORKING TREE, Escudo GOLD PASS, sin commitear) - `api/usuarios.js` v13 en su cierre (header real HOY v14 tras el hotfix BUG-054) (+45/-6: A1 auto-verificacion del admin en el upsert con `email_verificado` y `ON CONFLICT ... COALESCE(usuarios.email_verificado,false) OR EXCLUDED.email_verificado`, condicion `email.toLowerCase()==='brsk84@gmail.com' || nombre.toLowerCase()==='javier'`; A2 rama POST `tipo=verificar_usuario` admin-only via `esAdminUsuario` con 401/400/404 y `UPDATE ... RETURNING`; C1 campo aditivo `total` (`COUNT(*) WHERE activo=true`) en GET `?tipo=leaderboard`), `api/utilidades.js` v2 (+24/-0: rama admin-only GET `?tipo=visitas_global` -> `{ok,total,v30,v7}` sobre `interacciones tipo='visita' AND activo=true`), `admin.html` (+42/-8: fila verde + badge `VERIF` para `p.verificado`, filtro `data-verified`/`currentVerifiedFilter`/`setVerifiedFilter`, `ds-usuarios` real desde leaderboard, `ds-visitas` real desde `visitas_global`, 5a tarjeta `ds-verificados`, CSS `.stats-grid` a `repeat(5,1fr)`, re-render del dashboard en `syncFromNeon()` si la pantalla esta activa); presupuesto 8/8 INTACTO; sin migraciones nuevas; **PENDIENTE OPERATIVO: aplicar 017/018 en Neon (016/015 ya aplicadas) + commit/push/deploy**; hallazgos residuales H4/H6/H7/H8 registrados como observaciones en BUGS_HISTORICOS.md
- TSK-103 / ADR-028 Perfil publico museo + DM + Arbol de Clases de 16 ramas + Casas + categorias de consumibles (2026-09-15, IMPLEMENTADO Y VERIFICADO EN WORKING TREE, sin commitear) - `perfil.html` (NUEVO, museo publico `?id=`), `registro.html` (NUEVO, alta con `?ref=`), `docs/DEPLOY_017.md` (NUEVO), `scripts/verify_017_precheck.js` (NUEVO, read-only); migraciones NUEVAS 017 (columnas de perfil/casa/`progreso_arbol`/`perfil_config`/`perfil_publico`/`dm_abierto`; `consumibles.categoria`; `chat_salas.clave_dm` + CHECK `chk_chat_salas_tipo`; tabla `usuario_bloqueos`) y 018 (categoriza 17 consumibles: perfil 7 / impulso 3 / social 4 / coleccion 2 / general 1); backend como ramas `tipo=` sin archivos nuevos (8/8) - `api/usuarios.js` v12 (`perfil_publico` ligero, blindaje PII owner-aware en `?id=`/`?buscar=`/`referido_codigo`, `casa_elegir`/`casa_ranking`, `perfil_actualizar`), `api/interacciones.js` v15 (`museo_publico`, DM `dm_enviar`/`dm_hilos`/`dm_mensajes`/`dm_bloquear`, `arbol_catalogo`/`arbol_usuario`/`rama_activar`, `consumibles?categoria=`, catalogo RAMAS 16x5 + `RAMA_TIERS [0,100,250,450,700]`, Origen derivado con bono x1.2 dentro de `D_R`, 8 misiones `perfil`), `api/admin.js` (`categoria` en consumibles) y `api/utilidades.js` (`/registro.html` y `/perfil.html` en `STATIC_PAGES`); frontend mi-perfil.html (Mi Red + DM + Arbol SVG + 7 pestanas + selector de Casa + tienda por chips), comunidad.html (R-4), index.html (R-5) y usuario-session.js (`?ref=` con TTL 30d + `codigo_referido` + JWT en refresco); fixes R-1..R-5 (registro.html faltante, `?ref=` no capturado, `mi-perfil?id=` ignorado, etiqueta "Control Territorial" enganosa, relabel Pandilla->Parche) y 4 fixes adicionales (fuga de PII preexistente, carrera del cobro del DM, `museo_publico` 404 en vez de 503, filtros `activo=true` en casa_ranking/exp_ocultos); DEUDA detectada (patron BUG-021): `interacciones.activo`, `usuarios.bio`/`usuarios.activo` no versionadas. **PENDIENTE OPERATIVO: aplicar 017 y 018 en Neon (016/015 ya aplicadas) + commit/push/deploy + verificacion en vivo. El smoke de cierre `scripts/smoke_017_perfil_arbol_casas.js` esta ENTREGADO y en verde (`node scripts/smoke_017_perfil_arbol_casas.js` -> 73/73 PASS, 2026-09-15).** ADR-028
- TSK-102 / Consolidacion documental v5 (2026-09-14, working tree, sin cambios de codigo) - creados/consolidados los dos documentos maestros vigentes en `exploraco desarrollo/ampliacion desarrollo/`: `ExploraCO_Gamificacion_v5_Plan_Maestro.md` (Plan Maestro tecnico + hoja de ruta del gaming v4 + Entrega 016, con estados reales y citas `archivo:linea`) y `ExploraCO_Sistema_Social_v5.md` (mapa del apartado social con 7 tabs, Parches, chat/planes, albumes/comentarios, referidos, facciones, Wayfarer, notificaciones; gaps G-01..G-23 y discrepancias D-01..D-15). Enlaces cruzados verificados entre ambos (Plan v5 -> Sistema Social v5 y viceversa). Spec de la Entrega 016 `docs/superpowers/specs/2026-09-14-gaming-v5-referidos-wayfarer-facciones-design.md` + indice `docs/superpowers/specs/README.md`. 9 hallazgos reales registrados en BUGS_HISTORICOS.md BUG-035..BUG-043 (referidos inalcanzables, visita rota en frontend, notificacion de resena a endpoint inexistente, conteo de miembros de Parche, relabel residual Pandilla, etiquetas de chat desfasadas, gate de voto de utilidad ausente, formula de `album_crear`, tabs de GUIA). PENDIENTE OPERATIVO intacto (ver TSK-101 y "Que sigue"): aplicar migracion 016 en Neon + `SESSION_JWT_SECRET`/`RESEND_API_KEY` en Vercel + deploy.
- TSK-101 / ADR-027 + ADR-025 Entrega 016 "ExploraCO Gaming v5.0" (2026-09-14, IMPLEMENTADO Y VERIFICADO EN WORKING TREE, sin commitear) - piramide de referidos de 5 niveles con `xp_ref_total` separado y CTE recursiva (0.10/0.05/0.03/0.02/0.01 FLOOR, topes 500/20, `?ref=` en registro), crowdsourcing Wayfarer "Activo Oculto" (proponer con email verificado, votar nivel 5, quorum +/-3, 30 dias derivado, +50/+5/+15 XP, checkin reusa geocerca ADR-024 + nonce), 4 facciones con CHECK (exploradores/curadores/creadores/artistas; primera gratis, cambio 500 xp_total + cooldown 15 dias), vocaciones de artista en bloque nivel 5 y 6 misiones de artista; backend `api/usuarios.js` v8->v9 (JWT HMAC `firmarSesion`, verificacion de email, device_hashes), `api/interacciones.js` v12->v13 (`repartirXpReferidos` en 14 puntos de XP, `validarSesion` con timingSafeEqual en visita/votar/checkin, geo_nonces), `api/admin.js` (`activo_oculto_moderar`), frontend mi-perfil/comunidad/admin/usuario-session; `.env.example` + `.gitignore` corregido; MIGRACION 016 NUEVA (209 lineas, idempotente); smoke `scripts/smoke_016_multinivel_crowdsourcing.js` 39/39 PASS; Escudo GOLD verde (node --check x3, ASCII 0 bytes >127, 0 backticks, divs 0, idempotencia 13/13); presupuesto 8/8 INTACTO; PENDIENTE OPERATIVO: aplicar migracion 016 en Neon + configurar `SESSION_JWT_SECRET`/`RESEND_API_KEY` en Vercel + commit/push/deploy (ver `docs/DEPLOY_016.md`); ADR-027 + ADR-025
- TSK-100 / ADR-026 Epic prompt.txt (2026-09-13, IMPLEMENTADO EN WORKING TREE, sin commitear) - perfil museo v1 en mi-perfil.html (museo-line trofeos·fotos·destinos, galeria de 3 mejoras perfil_*, vocaciones con toggle/candado/403, chip "Sin mapa"), vocaciones acumulables (catalogo en codigo musico@5/cine@8/artista_grafico@11 + `usuarios.vocaciones` jsonb), chat por plan PRIVADO (chat_salas tipo='plan' + `planes_viaje.sala_id`, GET plan_chat / POST plan_chat_msg con +2 XP tope 20/dia, defensas en chat_msg/chat_mensajes), limpieza de salas del sistema (solo Chat general + Bogota), XP admin (POST admin_xp Bearer: delta o nivel 1-20 sin degradar via Math.max), BUG-A contarComentarioSafe (degradacion a 0 sin migracion 013), BUG-B coordsFallbackAutor (multimedia_mapa hereda coords de la visita/guardado del autor); api/usuarios.js v8 con `?buscar=`; divs 195/195, 223/223, 786/786; MIGRACION 015 NUEVA (usuarios.vocaciones, planes_viaje.sala_id, DELETE salas sistema, 3 consumibles); migraciones 011-014 YA APLICADAS por Javier en Neon (2026-09-13); UNICO BLOQUEANTE: aplicar 015 en Neon + commit/push/deploy; ADR-026 + spec
- TSK-099 / ADR-024 Presencia Fisica + Espacial v4.0 (2026-09-12, IMPLEMENTADO EN WORKING TREE) - geocerca Haversine server-side en `POST tipo=visita` (sin endpoint nuevo, 8/8), dedup-first + indice unico parcial (cierra race `23505`), `quitar_visita` -> soft-delete (`activo=false`), radios adaptativos 100/150/200/250 m, bono rural +20 XP y logro `logr_pionero` (LOGROS = 30), evidencia `interacciones.dims.geo`, conteo de visitas de `api/utilidades.js` filtra `activo=true`; tests de logros 30/30 PASS; migracion 014 NUEVA (reset de visitas gamificadas con respaldo + indice unico); migraciones 011/012/013/014 YA APLICADAS por Javier en Neon (2026-09-13, ver TSK-100); pendiente aplicar 015 + deploy; ADR-024 + spec
- TSK-098 / Epic multimedia de usuarios (2026-09-12, working tree SIN commitear) - fix 500 albumes/mapa (COALESCE foto/avatar + catch 42P01/42703 -> 503 `SCHEMA_NOT_MIGRATED`), filtro multimedia multi-seleccion (tipo_media CSV + 400 estricto + `tipos_aplicados`), galeria ampliada (`galeria.html` global y `?destino=<slug>`, STATIC_PAGES + boton en ficha), modulo audiovisual en comunidad.html, comentarios tipo Facebook (ADR-023: migracion 013 NUEVA + 6 `tipo=` sin endpoint nuevo) y moderacion en admin; PENDIENTE BLOQUEANTE aplicar migracion 013 en Neon; hallazgo BUG-033 (canonicals cirilicos, NO bloqueante); ADR-023
- TSK-097 / Fixes multimedia + constraint unica de interacciones (2026-09-12, working tree SIN commitear) - migracion 012 (dedup resena/rating por indice parcial, fotos libres), catch 23505 -> 409 tipado, `DEST_PHOTOS` vacio + `photoPlaceholderHTML`, UI completa de albumes en mi-perfil, trazabilidad de autor/album, BUG-027 resuelto (icono Instagram), smoke_auditoria 42/42 al cierre (54/54 HOY tras TSK-105 / ADR-030, 2026-09-16); PENDIENTE BLOQUEANTE aplicar migracion 012 en Neon; ADR-022
- TSK-096 / Capa audiovisual estricta + paridad de drawer en el mapa cultural (2026-09-12, working tree SIN commitear) - deseleccion de "Todo" oculta los pines del directorio; `MAPA_MEDIA` solo albumes de usuarios (backend `?origen=album` + filtro frontend); pines del directorio/Mi Mapa abren el drawer (sin popup) y `mapas.html` estrena drawer propio; ADR-021
- BUG-031 / hotfix JS inline del popover (2026-09-11, working tree SIN commitear) - SyntaxError en el JS inline de buildHTML() (onchange de mapas tematicos L2288-2290 con comilla escapada mal formada) dejaba TODAS las paginas dinamicas sin funciones de cliente; fix con entidad HTML `&#39;` (1 linea) + guard permanente `scripts/check_buildHTML_inline.js` (vm.Script, 8 funciones + JSON-LD + divs); TSK-095 ya desplegada CON el bug -> produccion rota hasta commit+push+redeploy (ver "Que sigue", item 1)
- TSK-095 / Refactor UI/UX ficha de destino (2026-09-11) - verificado como columna admin (sin insignia publica), hero HQI con chip de direccion, popover de Guardar con mapas tematicos, galeria con lightbox; Escudo GOLD limpio (divs 716/716, smoke 28/28, flujo verificado 6/6)
- TSK-095 extension (2026-09-11) - verificacion exp-pickle 14/14 PASS: `address` PERSISTIDA en admin (INSERT/UPDATE + migracion 011 PENDIENTE de aplicar en Neon), gate secReservar = solo `bookingUrl||hwUrl` implementado (ADR-020), badge publico confirmado NO (ADR-019)
- ADR-018 / Gamificacion v4.0 (2026-09-10) - Consumibles con economia de XP y de-nivel, vitrina de 20 niveles, cromos probabilisticos y pandillas completas + migracion 010 + smoke 95/95
- TSK-093: Capa multimedia + drawer del mapa cultural (2026-09-10) - pines multimedia por tipo, drawer de destino con tabs Fotos/Videos/Audios + fix UNION BUG-030
- ADR-017: Albums Fotograficos (2026-09-09) - Sistema completo de albumes, gamificacion y mapa audiovisual

## Que se estaba haciendo

### Pagina dinamica salto-del-tequendama (sitio, Soacha/Cundinamarca) - relevo 2026-09-20 (cierre express)

Cierre documental EXPRESS (skill `express-mode`: un solo pase, baja profundidad, sin tocar codigo). **Publicacion en PRODUCCION** de la pagina dinamica del destino **Salto del Tequendama** a partir del archivo fuente corrupto `hotel tequendama.txt` (ficha JSON a medio generar; lineas 92-119 eran texto de error de Gemini pegado). Tarea en `TASKS.md` **TSK-142 (COMPLETADA)**. NO nace ADR nuevo ni bug de ExploraCO (la data corrupta es del archivo fuente y se descarto): `DECISIONS.md` y `BUGS_HISTORICOS.md` NO se tocaron. Verificado contra archivo real (ADR-006): los 6 archivos citados existen en el repo.

**Que se estaba haciendo:**
- **Pagina publicada y verificada:** slug `salto-del-tequendama` (categoria `sitio`, ciudad Soacha, region Cundinamarca), **id Neon `8c2b48fc-c6c5-4ec4-ad42-909a73911ce0`**, `status=published`. https://exploraco.vercel.app/salto-del-tequendama.html renderiza completa (hero, galeria, entradas, tours, itinerario, FAQ, mapa, JSON-LD TouristAttraction) y `/api/destinos` devuelve el slug publicado.
- **Ficha saneada:** `ficha/ficha-salto-del-tequendama.md` (JSON valido, FAQS x5, FOTOS_SUGERIDAS con 5 URLs reales verificadas HEAD 200, FUENTES: casamuseotequendama.org + maps).
- **Fotos:** 5 resueltas en Wikimedia Commons (compliance BUG-022): hero profesional + 4 galeria.
- **Scripts (3):** `scripts/seed-salto-del-tequendama.js` (upsert Neon, ON CONFLICT slug, `--dry`), `scripts/load-salto-del-tequendama-api.js` (loader API DELETE+POST, token default), `scripts/smoke_test_salto-del-tequendama.js` (fake_neon + buildHTML).
- **Verificacion local (Escudo GOLD):** `node --check` OK x3; ASCII-safety 0 bytes >127; smoke **15/15 PASS**; divs diff=0. Carga a prod ejecutada y verificada (loader OK, `status=published`).
- **Typo del archivo fuente corregido:** "Caoda" -> "Caida" en seed + ficha + clean.json (`hotel tequendama.txt` original intacto). `hotel tequendama.clean.json` quedo como artifact de respaldo en la raiz.

#### Que sigue

Nada bloqueante. Opcional / verificacion humana:
1. **Verificacion visual del render** de https://exploraco.vercel.app/salto-del-tequendama.html por un humano (hero, galeria, entradas, tours, itinerario, FAQ, mapa).
2. **Revalidar el horario:** la web oficial casamuseotequendama.org publica actualmente "fines de semana y festivos 9am-4pm", mientras la ficha conserva "Mar-Dom 9:00 AM - 5:00 PM" del archivo origen (pendiente de revalidar). Ver deuda (a).

#### Riesgos activos

- No hay bloques activos (publicacion verificada en produccion). Deuda etiquetada abajo.

#### Deuda `[DEUDA-EXPRESS]`

- `[DEUDA-EXPRESS]` a) **Revalidar horario oficial del Salto del Tequendama:** la ficha dice "Mar-Dom 9:00 AM - 5:00 PM" (del archivo origen); la web oficial hoy publica "sab-dom/festivos 9am-4pm". Si procede, actualizar seed + ficha y re-cargar si cambia contenido publicado.
- `[DEUDA-EXPRESS]` b) **WhatsApp/email del archivo (573102456789 / info@casamuseotequendama.org) NO fueron verificados contra una fuente oficial:** verificar antes de dar datos de contacto a produccion si se confia en ellos.
- `[DEUDA-EXPRESS]` c) **Itinerario quedo con 2 paradas** (la 3a estaba corrupta en el archivo origen y se descarto por no inventar datos): el contrato `ficha_template` pide 3-5, evaluar si se amplia luego.
- `[DEUDA-EXPRESS]` d) **`hotel tequendama.txt` (fuente corrupta) sigue en la raiz** junto a `hotel tequendama.clean.json` (artifact): decidir si se archivan/mueven.

### Agentes hybrid-plan/hybrid-build (esquema tripartito de orquestacion) - relevo 2026-09-20 (ADR-048)

Relevo de la creacion del TERCER grupo de agentes primarios de orquestacion (esquema tripartito: Standard/Pro, Free y **Hybrid** con ruteo por riesgo). Decision en `DECISIONS.md` **ADR-048 (APROBADO, 2026-09-20)**; tarea en `TASKS.md` **TSK-HYBRID-001 (COMPLETADA)**. Verificado contra archivo real (ADR-006) el 2026-09-20. NO toca `api/*.js` (**8/8 INTACTO**, ADR-001/ADR-010), ni esquema, ni BD, ni el presupuesto de Vercel Hobby.

**Que se estaba haciendo (resumen; ancla ADR-006 en TASKS.md TSK-HYBRID-001):**
- **NUEVOS `.opencode/agent/hybrid-plan.md` y `.opencode/agent/hybrid-build.md`** (ambos `model: opencode-go/deepseek-v4.1-flash`, `mode: primary`): `hybrid-plan` = edit/bash **deny** (solo invoca `@explore-free`/`@research-agent-free`; asigna la implementacion por nombre en el plan para que la ejecute `hybrid-build` en sesion posterior); `hybrid-build` = edit/bash **allow** (orquestador ejecutor, rutea por riesgo y criterio, nunca por preferencia).
- **Matriz de ruteo:** PRO = `backend-dev`, `admin-dev`, `renderer-dev`, `frontend-tpl`, `sql-security`, `architect` + `architect-review`; FREE = `explore-free`, `content-loader-free`, `js-silo-dev-free`/`exp-pickle-free`, `data-migration-free`, `seo-dev-free`, `qa-auditor-free`, `docs-keeper-free`, `media-reader-free`, `research-agent-free`/gemini-research.
- **DECISIONS.md:** NUEVO **ADR-048** (APROBADO), derivado del analisis de consumo real de opencode.db (821 sesiones ago-sep 2026): `build` PRO = 35% del gasto, tareas rutinarias = 23% migrables a free (costo ~0), criticas = 38% permanecen PRO; `explore` PRO **$2.41/146 sesiones** vs `explore-free` **$0.12**.
- **AGENTS.md:** encabezado "tres rutas completas" + nueva subseccion **1.2 "Ruta HYBRID"**; la seccion de PAGO queda renumerada a 1.3.
- **`exploraco desarrollo/ampliacion desarrollo/orquestacion agentes.md`:** actualizado a **v1.1** (matriz hybrid exacta, nota de consumo, filas hybrid en `deepseek-v4.1-flash`).
- **`opencode.json` NO se toco:** `default_agent` sigue en `free-plan` (INTACTO, verificado en el archivo real; consciente y documentado en ADR-048 como pendiente de decision del operador).
- **QA audit:** frontmatter YAML valido, campos permitidos, modelo con prefijo valido, `mode: primary`, permisos rol-coherentes, **17/17 agentes citados por la matriz existen** (incluido `exp-pickle-free.md`, GAP de TSK-141 resuelto), `default_agent` intacto, duplicidad resuelta (F-1/F-2 corregidos; unico run restante = bloque `permission` del frontmatter, boilerplate normativo compartido por los 4 primarios -- no constitutivo).

#### Que sigue

1. **[DEUDA-EXPRESS][OPCIONAL] Activar el Hybrid como default:** si el operador lo decide, 1 cambio en `opencode.json` (`default_agent` -> `hybrid-build`) + restart, en **sesion separada**. Hoy el esquema Hybrid requiere activacion por nombre (`@hybrid-plan`/`@hybrid-build`).
2. **[DEUDA-EXPRESS][FASE 2 PROPUESTA] Evaluar la migracion de los subagentes `-free` de `opencode/big-pickle`** a `deepseek-v4-flash-free`/laguna para mayor velocidad; NO se ejecuto nada en esta sesion, queda como propuesta.
3. **Commitear los archivos sin versionar:** `.opencode/agent/hybrid-plan.md` y `.opencode/agent/hybrid-build.md` (+ AGENTS.md y `orquestacion agentes.md` actualizados) junto al proximo pase de docs; no mezclarlos con commits de codigo.
4. **Trazabilidad PRO/FREE de cada sesion Hybrid:** el resumen de entrega debe indicar que tareas fueron PRO y cuales FREE y el ahorro probable (regla de oro del ADR-048).

#### Riesgos activos

- **`default_agent` sigue `free-plan`:** el esquema Hybrid NO se activa solo; ninguna sesion nueva rutea por riesgo a menos que el operador invoque `@hybrid-plan`/`@hybrid-build` o cambie el default.
- **Activacion por nombre requerida:** mientras el default no cambie, el ahorro del ADR-048 (~23% del gasto PRO a costo ~0) solo se captura si el operador usa los agentes hybrid.
- **Doc de orquestacion con citas legacy:** `orquestacion agentes.md` conserva `deepseek-v4-flash` en las secciones 3/4 para los agentes Pro legacy (fuera del alcance de esta sesion); las filas hybrid (68-69) ya estan en `deepseek-v4.1-flash`. El archivo real manda (ADR-006).
- **Riesgo de mal ruteo:** la regla de oro del ADR-048 prohibe invocar un subagente FREE en un dominio de la ruta PRO (backend, admin, renderer, sql-security, arquitectura); es obligatoria y verificable en el prompt real de `hybrid-build`.

### Gema Gemini ExploraCO Research - cierre documental express (2026-09-20)

Cierre documental EXPRESS de la creacion de la gema Gemini **"ExploraCO Research"** (`GEMINI_GEMA_INVESTIGACION.md`, 154 lineas, **untracked**; skill `express-mode`: un solo pase de docs, sin tocar codigo). Tarea en `TASKS.md` **TSK-141 (COMPLETADA)**. NO nace ADR nuevo (configuracion de prompts, no arquitectura); `DECISIONS.md` y `BUGS_HISTORICOS.md` NO se tocaron (BUG-034 ya registrado y re-confirmado vigente contra el archivo real 2026-09-20).

**Que se estaba haciendo (resumen; ancla ADR-006 en TASKS.md TSK-141):**
- **Gema (creada, sin commitear):** el usuario da nombre+lugar (destinos, uno a uno) o lote de N (eventos); la gema ejecuta TODA la investigacion web por si misma, anexando los 3 recursos canonicos (`GEMINI_MASTER_PROMPT.md`, `GEMINI_EVENTOS_PROMPT.md`, `ficha_template.md`) SIN duplicar su contenido (Tripwire 5 lineas). Entrega ficha .md + bloque JSON final (esquema seccion 6 del master, TAGS por categoria) o array JSON de eventos, con clogs Escudo GOLD y cierre `==FIN==`. NO contiene mandatos de edicion de codigo (los ejecuta el pipeline ExploraCO). Validacion downstream: `.opencode/skills/gemini-research/scripts/validate_ficha.js` (fichas) y `scripts/validate_eventos.js` (eventos).
- **Verificado contra archivo real (ADR-006):** la gema existe (154 lineas); el validador canonico solo vive en `.opencode/skills/gemini-research/scripts/` (`scripts/validate_ficha.js` sigue inexistente -> BUG-034 vigente); `exp-pickle-free.md` NO existe en `.opencode/agent/` (solo `exp-pickle.md`).

#### Que sigue

1. **[DEUDA-EXPRESS] Probar la gema (QA manual en Gemini):** pegar el contenido de `GEMINI_GEMA_INVESTIGACION.md`, adjuntar los 3 recursos canonicos, pedir un destino (uno a uno) o un lote de N eventos, y validar la salida con `node .opencode/skills/gemini-research/scripts/validate_ficha.js` y `node scripts/validate_eventos.js`. Cuidado BUG-034: la ruta corta `scripts/validate_ficha.js` NO existe.
2. **[DEUDA-EXPRESS] Referenciar la gema en `.opencode/skills/gemini-research/SKILL.md`** si el operador decide integrarla al skill (hoy se configura directamente desde su ruta).
3. **[DEUDA-EXPRESS] Crear `.opencode/agent/exp-pickle-free.md`:** gap de infraestructura (listado en la matriz del AGENTS.md seccion 1.1, pero el runtime responde "unknown agent type").
4. **Commitear `GEMINI_GEMA_INVESTIGACION.md`** (untracked) junto al proximo pase de docs; no mezclarlo con los commits de codigo.

#### Riesgos activos

- **BUG-034 ABIERTO:** `scripts/validate_ficha.js` inexistente; el canonico vive en `.opencode/skills/gemini-research/scripts/` (drift documental en BLUEPRINT.md seccion 4, DECISIONS.md ADR-016 y 2 SKILL.md).
- **Gap `exp-pickle-free`:** nombre de agente en la matriz de routing gratuita sin archivo; cualquier ruteo a ese agente falla con "unknown agent type".
- **Gema sin QA funcional:** la salida de la gema aun no se valido contra el validador real; es un prompt (no runtime), no bloquea deploy.

### Galeria/hero por votos + Mis mapas personales + guardados de media + propiedad de medios del mapa (2026-09-19) - ADR-046 + ADR-047 / TSK-136..TSK-140

Sesion de correccion sobre la comunidad, el index y la ficha de destino. Verificado contra archivo real (ADR-006) el 2026-09-19: **todo el codigo esta COMMITEADO** (`main` == `origin/main`, HEAD `3ffd7a9` "fotos hero"); el working tree solo tiene 2 archivos **untracked** (`AI-DOS Master Specification v1.1.docx` y el doc de analisis). Decisiones en `DECISIONS.md` **ADR-046** (contrato del hero) y **ADR-047** (regla de propiedad de medios del mapa); tareas en `TASKS.md` **TSK-136..TSK-140**; 7 bugs en `BUGS_HISTORICOS.md` **BUG-071..BUG-077**. NO hay archivos nuevos en `api/` (8/8 intacto, ADR-001/ADR-010) ni migraciones.

**Estado real verificado (ADR-006, 2026-09-19):**
- `git status -sb`: `## main...origin/main` (sin ahead/behind). `git log --oneline -10`: `3ffd7a9`, `41a3f71`, `e7445c3`, `afb3b5d`, `8fe7b47`, `600e656`, `6c84f9d`, `61392c0`, `b4ffd4e`, `f431ccc`.
- Commits de la sesion (por archivo/tema): `6c84f9d` "videos" (`api/interacciones.js`, `api/pagina-destino.js`, `galeria.html`, `mymapa.js`, `scripts/smoke_036_media_unificada.js`); `600e656`/`8fe7b47`/`e7445c3` "mapa" (`mymapa.js`, `comunidad.html`, `mapa-cultural.js`, `index.html`, `scripts/smoke_mapa_cultural.js`, `api/pagina-destino.js`); `afb3b5d` "Update index.html"; `41a3f71` "destinos" (`api/pagina-destino.js`, `scripts/smoke_auditoria_pagina_destino.js`); `3ffd7a9` "fotos hero" (`api/pagina-destino.js`, `mapa-cultural.js`, `comunidad.html`, `index.html`, ambos smokes).
- **SIN commitear (untracked):** `AI-DOS Master Specification v1.1.docx` (raiz) y `exploraco desarrollo/ampliacion desarrollo/ANALISIS_AI-DOS_v1.1_y_REGLAS_DE_ORO_v5.md` (285 lineas, 17896 bytes, 0 bytes >127).
- Presupuesto de funciones serverless **8/8 INTACTO**; sin migraciones.

**Que se hizo (resumen; anclas ADR-006 en TASKS.md TSK-136..TSK-140):**
- **TSK-136 - Galeria/hero por votos (ADR-046):** `api/pagina-destino.js` L800-872 calcula `mediaRank` (curadas + comunidad, `votos DESC`) una sola vez; contrato final del hero: principal = `foto_hero` editorial, 3 miniaturas = 1 mejor curada + 2 mejores de comunidad por votos; videos/audio nunca al hero (commit `3ffd7a9`, tras la primera iteracion revertida de `41a3f71`). `galeria_destino` y `album_oficial` ordenan por votos (`6c84f9d`); `galeria.html` con `gSortVotos()`.
- **TSK-137 - Mis mapas personales:** barra de categorias `#mm-personal-cats` con `data-cat` (`600e656`); `mymapa.js` pasa el ELEMENTO DOM (no un string) y encuadra/re-renderiza con `invalidateSize` + `fitBounds` + `refresh` (`8fe7b47`); cache-busting `mapa-cultural.js?v=3` -> `?v=4` (`e7445c3`, `3ffd7a9`) y `mymapa.js?v=3` (`8fe7b47`).
- **TSK-138 - Guardados de media:** `mis_guardados_media` con joins `::text` (eran `uuid = text`), rama `curada`, `.catch` con `console.warn`; `multimedia_mapa` expone `media_id`/`fuente`; `mymapa.js` pinta los guardados como pines via `filterMisMapa` (`6c84f9d`). Cierra BUG-071.
- **TSK-139 - Propiedad de medios del mapa (ADR-047):** `filterMediaPropios` en `mapa-cultural.js` (fotos solo del espacio; videos/audio de comunidad por ciudad/10 km) reemplaza `mediasCercanas` (commit `e7445c3`; restaura video/audio en `3ffd7a9`). Cierra BUG-075 y BUG-076.
- **TSK-140 - Doc de analisis:** NUEVO `ANALISIS_AI-DOS_v1.1_y_REGLAS_DE_ORO_v5.md` con incidentes I1-I8, brechas G1-G12 del AI-DOS v1.1, reglas faltantes P11-P19 de las Reglas de Oro v5 y propuestas para v1.2/v6. **PENDIENTE DE APROBACION del operador; no se toco el `.docx` ni las Reglas de Oro.**

#### Que sigue

1. **Aprobar/aplicar las propuestas de gobernanza (PENDIENTE DE APROBACION del operador):** Reglas de Oro v6 (texto propuesto P2/P5/P6/P9 reescritas + P11-P19 nuevas) y AI-DOS v1.2 (Registro de Implementacion Cap. 4.9, gate de escalamiento Cap. 6.7, presupuesto de costo Cap. 6.13, presupuesto de contexto Cap. 7.11, protocolo de fallo silencioso Cap. 8.13). NO editar los documentos maestros sin aprobacion.
2. **Commitear el documento de analisis y el `.docx`** (hoy untracked): `exploraco desarrollo/ampliacion desarrollo/ANALISIS_AI-DOS_v1.1_y_REGLAS_DE_ORO_v5.md` y `AI-DOS Master Specification v1.1.docx`.
3. **Validar en vivo (QA visual en navegador, TSK-135 + estas tareas):** hero/galeria por votos, filtros por categoria y media de "Mis mapas personales", guardados pintados como pines, drawer del pin sin fotos ajenas, Videos/Audios del drawer con media de comunidad.
4. **Deploy del release:** `api/interacciones.js`, `api/pagina-destino.js`, `mapa-cultural.js`, `mymapa.js`, `galeria.html`, `comunidad.html`, `index.html` (assets frontend; sin migracion ni backend nuevo).
5. **Confirmar migraciones en Neon:** **023** (`media_guardados.item_id` TEXT) para que `mis_guardados_media` funcione; 019/023 ya referenciadas como pendientes de confirmar en sesiones previas.

#### Riesgos activos

- **Cache de assets:** un fix que cambia `mapa-cultural.js`/`mymapa.js` no llega al usuario si los HTML consumidores no bumpean `?v=N` (BUG-073). Todo HTML que referencie un asset compartido debe versionarlo. El index conserva su CSS inline a proposito (no enlaza `mapa-cultural.css`).
- **Documentos Core de ~1.28 MB:** `TASKS.md` 388 KB + `DECISIONS.md` 366 KB + `NEXT.md` 329 KB + `BUGS_HISTORICOS.md` 150 KB + `BLUEPRINT.md` 65 KB + `PROJECT.md` 39 KB (medido el 2026-09-19). AI-DOS pide leerlos en cada handoff, lo que encarece el contexto; propuesta: indice + tope y separar `NEXT.md` corto del historico (Cap. 7.11 propuesto).
- **Documentacion delegada a modelo pago = 49% del costo:** `informes-cuota/cuota-2026-09-14-dia.md` registra `docs-keeper` (pago) con 214 invocaciones y **$0.3743 sobre $0.7643 (49% del gasto del dia)**; la ruta gratuita (`big-pickle`) registro 13 sesiones a $0.0000. Propuesta: ruta gratuita por defecto y no delegar documentacion masiva a modelo pago (P19 / Cap. 6.13).
- **BUG-061 y BUG-065 siguen ABIERTOS** y ajenos a esta sesion; BUG-002 (doble escape) sigue como deuda preexistente.
- **QA visual y shape real de `?tipo=mapa` sin validar contra Neon** (el smoke es Node con datos simulados).



Feature **COMPLETADA en working tree para el index** (TSK-134, SIN commitear) sobre la base ya commiteada de la comunidad (TSK-133, commit `b4ffd4e` "maps"). Verificado contra archivo real (ADR-006) el 2026-09-19. Origen: pedido directo del usuario de "Mis mapas personales (comunidad) con paridad al mapa cultural del index". La decision vive en `DECISIONS.md` **ADR-045** (con enmienda TSK-134); las tareas en `TASKS.md` **TSK-133** (comunidad) y **TSK-134** (index). NO hay archivos nuevos en `api/` (8/8 intacto, ADR-001/ADR-010) ni migraciones.

**Estado real del working tree (verificado, ADR-006, 2026-09-19):**
- `git status`: `M index.html`, `M mapa-cultural.js`, `M scripts/smoke_mapa_cultural.js` (TSK-134, sin commitear). TSK-133 ya esta en `b4ffd4e`.
- `mapa-cultural.js`: **v1.1.0** (68417 bytes), 0 bytes >127, `window.MapaCultural` L1597, API multi-instancia (`create`/`init` + `setPlaces`/`setMedia`/`setMediaEnabled`/`setMediaTypes`/`refresh`/`getMap`/`openDrawer`/`closeDrawer`/`destroy`) + helpers; `jsonAuthHeaders` L1354. Opciones nuevas v1.1.0 con default = comportamiento comunidad: `enableMediaOnAll`, `mediaEnabled`, `mediaFilter` (null = estricto; `false` = SIN filtro), `mediaPhotoIcon`, `clusterLinksNavigate`, `mediaControls`, `bindList`, `data-comments-*`.
- `mapa-cultural.css`: 16112 bytes, 121 reglas / 121 llaves, 0 `!important` reales, scope `.mc-root`. **NO se enlaza en `index.html`** (0 refs; su CSS inline se conserva a proposito).
- `scripts/smoke_mapa_cultural.js`: **58/58 PASS** (`node scripts/smoke_mapa_cultural.js` -> `SMOKE MAPA CULTURAL: OK`).
- `mymapa.js`: +154/-46 (commit); `MapaCultural.create` L125; sin `bindPopup` propio.
- `comunidad.html`: +17/-0 (commit); `<link>` L14, `<script>` L559 (antes de `mymapa.js` L561).
- `index.html`: **MIGRADO a `mapa-cultural.js`** (TSK-134, +79/-1152); `<script src="mapa-cultural.js">` L882; shims `initMapaSection` (retry), `refreshMapaMarkers` (sin recursion), `geolocateMapa`, `resetMapaColombia`, `openMapaDrawer`/`closeMapaDrawer`, `INDEX_MC_OPTS` (L2254), `var mcMapa` (L2252) + carga lazy; conserva `mapaMap` (`onMapReady`) y el CSS inline.
- `api/*` / `index-api-connector.js`: SIN CAMBIOS (diff vacio).

**Que se hizo (resumen; ver TASKS.md TSK-133/TSK-134 para anclas ADR-006):**
- **TSK-133 - Motor compartido:** pines por categoria, clustering por proximidad de 40 px, drawer completo (hero/badge/rating/precio/lead/tabs multimedia/"Ver lugar completo"), capa de media (iconos, bounds, tope 300, dedupe) y lightbox/album; normalizacion unica `normalizePlace`/`normalizeMedia`.
- **TSK-133 - Paridad:** tiles CARTO Voyager + clustering 40 px + drawer completo al clic en pin.
- **TSK-133 - Capa de media:** solo items de los destinos del mapa activo (match estricto por slug; `origen='album'` excluido), un unico fetch cacheado a `?tipo=multimedia_mapa`, default ON si el mapa activo tiene media.
- **TSK-133 - `mymapa.js`:** consume `MapaCultural`, retira su Leaflet propio y `bindPopup`.
- **TSK-134 - Migracion del index:** retira ~1190 lineas de motor inline (bloque 2256-3445) y estado muerto; deja shims que preservan los puntos de enganche (`initMapaSection`/`refreshMapaMarkers`) y el contrato `window.mapaMap` via `onMapReady`; quita los 4 `onclick` de `[data-media]` (los engancha el modulo via `mediaControls`).
- **TSK-134 - Opciones de compatibilidad v1.1.0:** `INDEX_MC_OPTS` usa `enableMediaOnAll:true`, `mediaEnabled:false`, `mediaFilter:false` (capa = toda `MAPA_MEDIA`), `mediaPhotoIcon` U+1F4F8 (camara) y `clusterLinksNavigate:true`; el default del modulo sigue siendo el de comunidad.
- **Mitigacion BUG-061:** `guardarMedia`/`votarMedia` envian `Authorization` via `jsonAuthHeaders()` (backend sigue ABIERTO), ahora tambien desde el mapa del index.

#### Que sigue
1. **QA visual en navegador (TSK-135):** validar el `index.html` migrado (clustering 40 px, popup de cluster, `flyTo`/`bounds`, lightbox/album, coexistencia del CSS `.md-*` inline con el modulo scopado bajo `.mc-root` y el doble handler de cierre inofensivo) y el tab Mapa de `comunidad.html` (drawer, toggle de media, lightbox). El smoke es Node vm (mock) y NO cubre render real.
2. **Validar el shape real de `?tipo=mapa` contra Neon** (el smoke cubre ambos shapes; falta dato real de la tabla).
3. **Commit + push + deploy** del release: `index.html`, `mapa-cultural.js` y `scripts/smoke_mapa_cultural.js` (sobre TSK-133 ya commiteada en `b4ffd4e`); assets frontend, no requieren migracion ni backend. No mezclar ajenos.
4. **Comandos de verificacion:** `node scripts/smoke_mapa_cultural.js` (58/58 PASS) y Escudo GOLD (`node --check mapa-cultural.js`, `node --check mymapa.js`, ASCII 0 bytes >127 en los 3 nuevos, divs `index.html` 370/370, divs `comunidad.html` 319/319, llaves CSS 121/121).

#### Riesgos activos
- **BUG-061 ABIERTO:** la mitigacion con Bearer no corrige el backend de `guardar_media`/`tipo='foto'`; escalado a `sql-security`.
- **QA visual en navegador pendiente (TSK-135):** el smoke es Node vm (mock); validar en real antes de dar por cerrado el release.
- **Shape de `?tipo=mapa` no validado con datos reales de Neon.**
- **Deuda cosmetica/UX aceptada en el index:** notas de geolocalizacion en ASCII sin tildes (ADR-002) y ausencia del estado transitorio "Buscando..." del boton "Cerca de mi"; el escape de texto en popup/lista es endurecimiento (no regresion).

### Sesion express TSK-124..TSK-132 "UI de perfil/galeria/comunidad + media + modo express" (2026-09-18/19) - sin ADR nuevo (nota de practica)

Sesion ejecutada en **"modo express"** con la skill `express-mode` (TSK-132): briefs quirurgicos por dominio, verificacion local proporcional al riesgo y cierre documental diferido a este unico pase. Las 9 tareas (TSK-124..TSK-132) estan registradas en `TASKS.md`. NO nace un ADR de arquitectura nuevo: el modo express se registra como **nota de practica operativa** en `DECISIONS.md` (el detalle vive en `exploraco desarrollo/ampliacion desarrollo/MODO_EXPRESS_ANALISIS.md`).

**Estado real del working tree (verificado, ADR-006, 2026-09-19):**
- `git status -sb`: `main...origin/main [ahead 1]`. El unico commit local sin push es **`dfde7e7` "media"**.
- Commits de la sesion (YA COMMITEADOS, contra lo que decia el contexto de relevo): `26d2e3c` / `66db2e6` / `604fa0d` (`mi-perfil.html`), `d309e17` (popup en `comunidad.html`), `b41e3ba` (`galeria.html` + `api/interacciones.js`), `68e50a4` (`mymapa.js` + 95 archivos), `dfde7e7` (media + diagnosticos/cleanup + smoke J21).
- **SIN commitear (working tree):** `api/interacciones.js` (LIMIT por rama de `multimedia_mapa`), `api/pagina-destino.js` (votos de viajero a `media_votos`), `agents.md`, `exploraco desarrollo/ampliacion desarrollo/GUIA_DE_DESARROLLO.md` y `.../orquestacion agentes.md`.
- **Sin versionar (untracked):** `.opencode/skills/express-mode/`, `MODO_EXPRESS_ANALISIS.md`, `SKILL_MODO_EXPRESS.md`, `scripts/diagnose_video_mapa.js` y `scripts/express_check.js`.
- Presupuesto de funciones serverless **8/8 INTACTO** (ADR-010); no hay migraciones nuevas en esta sesion.

**Que se hizo (resumen; anclas ADR-006 en TASKS.md TSK-124..TSK-132):**
- **TSK-124 (`26d2e3c`):** `mi-perfil.html` elimina "Fotos publicadas" (`#mis-fotos-title`/`#mis-fotos-grid`, `esCuentaFotosPublicadas()`, `cargarMisFotos()`).
- **TSK-125 (`d309e17`):** `comunidad.html` gana `abrirMediaModal(f)` + `avMediaHTML(item, large)`, reusando `#av-album-modal`/`#av-album-bar-title` y la barra de acciones de `media-actions.js` (feed de "Media reciente" y modal de album).
- **TSK-126 (`b41e3ba`):** `galeria.html` separa curadas (`g-sec-dest`, paginadas 12/pagina en cliente) y comunidad (`g-sec-com`); `galeria_destino` deja de truncar a 12 (`gdFotos.slice(0,12)` -> `gdFotos.forEach`).
- **TSK-127 (`66db2e6` + `604fa0d`):** nav "Clase" -> "Progreso", titulo "Arbol de Progreso"; se retiran `#pf-clase`/`#modal-clase`, Tabla de Destino (`renderTablaSVG`/pseudo-tab `senderos`) y grilla de Vocaciones; todo se absorbe en el Arbol con host `#arbol-body` (ADR-043/BUG-066).
- **TSK-128 (`68e50a4`):** NUEVO `mymapa.js` (`window.MyMap`) integrado al tab Mapa de `comunidad.html`; `index.html` retira `#mymapa-section` (-265 lineas) y ~93 HTML repuntan el ancla `index.html#mymapa-section` -> `mi-perfil.html` (95 HTML la tenian; 2 backups la conservan).
- **TSK-129 (`dfde7e7`):** `museo_recurso` POST captura `23505` y reactiva/publica la fila oculta sin XP; `album_agregar_foto` escribe `visible` default true y dedup republicable; NUEVOS `scripts/diagnose_media_oculta.js`, `db/cleanups/003_publicar_media_oculta.sql`, `scripts/diagnose_video_mapa.js`; `smoke_036_media_unificada.js` J21 con ventana 900 -> 2400.
- **TSK-130 (working tree):** `multimedia_mapa` aplica LIMIT por rama (album 300, destinos 300, global 600) para no desplazar la media de usuarios.
- **TSK-131 (working tree):** la ficha de destino cuenta votos de fotos de viajero desde `media_votos` (fuente `viajero_foto`), no del legacy `interacciones.dims->>'voto_foto_id'`.
- **TSK-132 (working tree):** NUEVA skill `.opencode/skills/express-mode/SKILL.md` + manual `MODO_EXPRESS_ANALISIS.md` + `SKILL_MODO_EXPRESS.md` + `scripts/express_check.js`; actualizados `agents.md`, `GUIA_DE_DESARROLLO.md` y `orquestacion agentes.md`.

#### Que sigue

1. **PENDIENTES OPERATIVOS (BLOQUEANTES de dato/deploy).** Requieren Neon/`DATABASE_URL` y los ejecuta Javier:
   - Aplicar `db/migrations/027_zonas_marcas.sql` (sesion previa) y los cleanups `db/cleanups/002_fix_fotos_brsk84.sql` y **`db/cleanups/003_publicar_media_oculta.sql`** (idempotentes; respaldo previo).
   - Correr `scripts/diagnose_fotos_brsk84.js`, `scripts/diagnose_media_oculta.js` y `scripts/diagnose_video_mapa.js` con `DATABASE_URL` (solo lectura).
   - Confirmar que las migraciones **019** (`media_guardados`) y **023** (`media_votos`) estan aplicadas; sin ellas el guardado y los votos degradan en silencio.
   - **Deploy** de `api/interacciones.js` y `api/pagina-destino.js`; el frontend de TSK-124..129 ya esta en los commits locales.
2. **Push de `dfde7e7`** y commit de los cambios de TSK-130/TSK-131 + assets/docs del modo express (hoy untracked).
3. **Verificacion en vivo:** media de usuario visible en el mapa cultural, votos de viajero correctos en la ficha, popup de "Media reciente", "Mi Museo" fuera de la grilla de comunidad y galeria en 2 bloques.
4. **Versionar el smoke de `media-actions.js`** (deuda D-14) y evaluar migrar `index.html` a `media-actions.js` (D-13).
5. **Resolver `[DEUDA-EXPRESS]`** (abajo) en un pase dedicado (no en express).

#### Riesgos activos

- **Migraciones 027/002/003 sin aplicar y 019/023 por confirmar:** la media puede seguir invisible o degradar de forma silenciosa (patron BUG-021/BUG-060/BUG-065).
- **BUG-065 ABIERTO:** el INSERT legacy de `album_agregar_foto` quedo corregido, pero la deuda historica de visibilidad y los conteos de mision sin `visible=true` persisten.
- **BUG-061 ABIERTO y AMPLIFICADO:** los botones de `media-actions.js` y los nuevos accesos de media siguen enviando `body.usuario_id` sin Bearer (escalar a `sql-security`).
- **BUG-002 ABIERTO (preexistente, ajeno):** `api/pagina-destino.js` ~L2431 conserva 1 doble escape real (`'\\u2605'` en `addRvOptimista`).
- **FAIL preexistente `A3d`** de `scripts/smoke_038_casas_clases.js` (ajeno a esta sesion; distinguir de regresion nueva).
- **`fotosAlbum` sin filtro `af.visible=true`** en `api/pagina-destino.js` (~L2674): leak menor de visibilidad respecto de ADR-039 (ver deuda abajo).
- **Header drift:** `api/interacciones.js` sigue rotulado v23 y `api/pagina-destino.js` `v12.20260917` (cambios aditivos sin bump; correcto, pero anotar en el commit).

#### `[DEUDA-EXPRESS]` (registrada, NO se arregla durante express)

- JS muerto `mm*` en `index.html` (`MM_PINS` L1239 y residuos de `renderMyMap`/seccion retirada).
- Anclas `mymapa-section` en backups (`index_pre_full.html`, `_lacandelaria3_body.html`).
- Boton "+ Mapa" de las tarjetas sin UI destino: migrar a `comunidad.html` (hoy sin consumidor).
- Capa "Media" del mapa cultural apagada por defecto: decidir si se enciende.
- `fotosAlbum` sin filtro `af.visible=true` (leak menor, ADR-039).
- Backfill de votos legacy de fotos de viajero si aparecen registros historicos fuera de `media_votos`.
- D-13/D-14 de ADR-044: `index.html` con `media_voto` inline y smoke de `media-actions.js` sin versionar.

### Sesion TSK-123 "Correccion Comunidad > Audiovisual" (2026-09-18) - ADR-044

Tarea TSK-123 **IMPLEMENTADA EN WORKING TREE** (SIN commitear; verificado contra archivo real, ADR-006, el 2026-09-18). Origen: reporte directo del usuario (Media reciente en modo read-only + album auto-creado "Mi Museo" en la grilla). La decision vive en `DECISIONS.md` **ADR-044** (abstraccion compartida `media-actions.js`); la tarea en `TASKS.md` TSK-123. NO hay archivos nuevos en `api/` (8/8 intacto, ADR-001/ADR-010); SI hay 1 asset frontend nuevo sin versionar (`media-actions.js`).

**Estado real del working tree (verificado, ADR-006, 2026-09-18):**
- `git status`: `M api/interacciones.js`, `M comunidad.html`, `M galeria.html`; untracked `?? media-actions.js`.
- `media-actions.js`: 259 lineas, 11033 bytes, 0 bytes >127; expone `window.MediaActions.voto` L161 / `guardar` L194 / `sync` L224 / `bind` L236.
- `api/interacciones.js` header real **v23** SIN bump (los cambios son aditivos); anclas: `mi_feed_fotos` L4853-4912, `albumes` + `excluir_museo` L4252-4293, `album_detalle` L4296-4364.
- `comunidad.html`: `avUidActual` L565, modal de album L1929-1975, `cargarAudiovisual` L2022-2026, `cargarAlbumesAV` L2032-2058, `feedCardAV` L2145-2164; script `media-actions.js` L499; divs 307/307.
- `galeria.html`: script `media-actions.js` L242, bind/sync L563-565; divs 84/84.
- No existe script de smoke con `MediaActions`/`media-actions` en `scripts/` (deuda D-14).

**Que se hizo (resumen, ver TASKS.md TSK-123 para anclas ADR-006):**
- **Backend aditivo:** `mi_feed_fotos` acepta `usuario_id` opcional y devuelve `autor_id`/`es_propia`/`ya_votado`/`ya_guardado`; `albumes` con `excluir_museo=1` opt-in; `album_detalle` devuelve `ya_guardado`/`es_propia`.
- **`media-actions.js` (NUEVO):** abstraccion de voto/guardado extraida de `galeria.html`; contrato `data-ma-*` y API `window.MediaActions`.
- **`galeria.html`:** refactor para consumir el modulo; se eliminan las 4 funciones inline duplicadas; comportamiento preservado.
- **`comunidad.html`:** barra interactiva en el feed y en el modal de album; `excluir_museo=1`; `usuario_id` en los fetch.
- **Fix BUG-067:** `cargarAlbumesAV(!reset)` corrige la duplicacion de albumes al cambiar de orden.

#### Que sigue
1. **Confirmar/aplicar en Neon las migraciones 019 (`media_guardados`) y 023 (BLOQUEANTE).** Sin la 019 el guardado real degrada a `ya_guardado=false`; sin la 023, votos/comentarios del feed degradan. Lo ejecuta Javier (no hay `DATABASE_URL` local). La 024/025 ya se consideran aplicadas; el orden de release vigente sigue 024 -> 025 -> 026 -> 027 -> backend -> frontend.
2. **Deploy del backend + frontend en el release pendiente:** `api/interacciones.js` v23 (junto con el resto), `media-actions.js`, `comunidad.html` y `galeria.html`.
3. **Verificacion en vivo:** like/comentar/guardar en "Media reciente" y en las fotos del modal de album; confirmar que "Mi Museo" no aparece en "Albumes de la comunidad"; validar el guardado real (con 019/023) y la coherencia de `es_propia` (403 al votar lo propio).
4. **Versionar el smoke de `media-actions.js`** (`scripts/smoke_media_actions.js`) para que el Escudo GOLD lo reproduzca (D-14).
5. **Encapsular las `opts` por-root de `MediaActions`** si aparece un tercer consumidor con opts distintas (D-10).
6. **Migrar `index.html` a `media-actions.js`** cuando se toque su capa de media (D-13).
7. **Endurecer `guardar_media`/`quitar_guardado_media` y la lectura por `usuario_id`** (BUG-061 / D-11) en la tarea de seguridad.
8. **Commit + push del release** incluyendo el nuevo `media-actions.js` (hoy untracked); NO mezclar archivos ajenos del working tree.

#### Riesgos activos
- **Migraciones 019/023 sin confirmar:** el feed y el detalle degradan de forma silenciosa a `ya_guardado=false`; el guardado real no se puede validar hasta aplicarlas (patron BUG-021/BUG-060).
- **BUG-061 AMPLIFICADO:** los botones Guardar de `media-actions.js` siguen enviando `body.usuario_id` sin Bearer; mas superficie para el mismo vector de suplantacion.
- **BUG-065 ABIERTO:** la media subida por el endpoint legacy `album_agregar_foto` nace `visible=false` y NO aparece en el feed (`mi_feed_fotos` filtra `af.visible=true`), aunque la mision la cuente.
- **D-10 latente:** las `opts` de `MediaActions` son de modulo (el ultimo `bind` gana); inocuo hoy (2 roots con las mismas opts) pero fragil si crece el numero de consumidores.
- **D-14:** el smoke 41/41 no esta versionado; el Escudo GOLD no reproduce esa evidencia.
- **Header sin drift:** `api/interacciones.js` sigue rotulado v23 (correcto: los cambios son aditivos, no requerian bump).

### Sesion TSK-119..TSK-122 "Modulos nuevos + bugs activos" (2026-09-18) - ADR-042 + ADR-043

Tareas TSK-119 (paquete DB-01/DB-02 + BE-02 + FE-01/FE-02/FE-03 + remediacion de fotos), TSK-120 (`marca_activar`), TSK-121 (`marca_patrocinar`) y TSK-122 (`mi_marca`) **IMPLEMENTADAS EN WORKING TREE** (SIN commitear; verificado contra archivo real, ADR-006, el 2026-09-18). Origen: paquete `prompt.md` (untracked) "Modulos nuevos + bugs activos". Las decisiones viven en `DECISIONS.md` **ADR-042** (esquema zonas/marcas/patrocinios) y **ADR-043** (patron de UI derivado de FE-02); las tareas en `TASKS.md` TSK-119..TSK-122. NO hay archivos nuevos en `api/` (8/8 intacto, ADR-001/ADR-010); SI hay 4 archivos nuevos sin versionar.

**Estado real del working tree (verificado, ADR-006, 2026-09-18):**
- Existen `db/migrations/027_zonas_marcas.sql` (348 lineas), `scripts/verify_027_precheck.js` (258), `scripts/diagnose_fotos_brsk84.js` (310) y `db/cleanups/002_fix_fotos_brsk84.sql` (151).
- `api/usuarios.js` (1398 lineas, header **v18 SIN bump**): `GET mi_marca` L296-306, `marca_activar` L1192-1232, `marca_patrocinar` L1234-1266; `c.tipo === 'marca_` = 2.
- `api/pagina-destino.js` L2644: `destinos_fotos ... LIMIT 200` (1 ocurrencia).
- `mi-perfil.html`: `#arbol-body` L957, `#pf-clase` L956, titulo "Clase & Arbol de Progreso" L953, `esCuentaFotosPublicadas` L2143; divs 446/446.
- `index.html`: `.mpa-media-pin-video` L544/L2996 (2 ocurrencias); divs 523/523.
- `git status`: `M api/pagina-destino.js`, `M api/usuarios.js`, `M index.html`, `M mi-perfil.html`, `D prompt_maestro_comunicacion_casas.md` (borrado AJENO); untracked `db/cleanups/002_fix_fotos_brsk84.sql`, `db/migrations/027_zonas_marcas.sql`, `prompt.md`, `scripts/diagnose_fotos_brsk84.js`, `scripts/verify_027_precheck.js`.

**Que se hizo (resumen, ver TASKS.md TSK-119..TSK-122 para anclas ADR-006):**
- DB-01/DB-02: migracion 027 (zonas/areas/ranking_zonas/marcas/patrocinios + extension `consumibles` + vista `consumibles_precio`), con `patrocinios.objetivo_id` polimorfico SIN FK (deuda) y `areas_geograficas` vacia.
- BE-01: 3 ramas en `api/usuarios.js` con JWT (`validarSesionUsuario`) y gate `calcularNivel(xp_total).nivel >= 5`; MERGE JSONB con `||`.
- BE-02: fix R10 en `api/pagina-destino.js` (`LIMIT 24 -> 200`).
- FE-01: "Fotos publicadas" conservada pero visible SOLO para `brsk84@gmail.com` (desviacion O1 del prompt, que proponia eliminar/condicionar).
- FE-02: fusion "Mi Clase" -> "Arbol de Clases" + FIX de regresion con `#arbol-body` (BUG-066).
- FE-03: `.mpa-media-pin-video` para video individual en el mapa.
- Remediacion: `db/cleanups/002` + `diagnose_fotos_brsk84.js` (BUG-065).

**Escudo GOLD (2026-09-18):** `node --check` 4 `.js` OK; ASCII 0 bytes >127 en `.js`/`.sql`; divs 446/446 (`mi-perfil`) y 523/523 (`index`); `c.tipo === 'marca_` = 2; `mpa-media-pin-video` = 2; `destinos_fotos ... LIMIT 200` = 1; ids unicos.

#### Que sigue
1. **APLICAR `db/migrations/027_zonas_marcas.sql` en Neon (BLOQUEANTE, lo ejecuta Javier).** Correr antes `node scripts/verify_027_precheck.js` (read-only) y las secciones 0/final del `.sql`; re-ejecutar es no-op. Sin la 027, `marca_activar`/`marca_patrocinar`/`mi_marca` fallan por tabla inexistente (patron BUG-021/BUG-060).
2. **APLICAR `db/cleanups/002_fix_fotos_brsk84.sql`** (respaldo previo bloque [0]; idempotente; NO borra filas).
3. **Correr `node scripts/diagnose_fotos_brsk84.js` con `DATABASE_URL`** para confirmar la causa de las 5 fotos de brsk84.
4. **Decidir auth de `GET mi_marca`:** hoy es lectura publica por `usuario_id` (ADR-042, decision g pendiente).
5. **Decidir si `marcas.nivel_requerido` gobierna el gate** (hoy hardcodeado a nivel 5 con `calcularNivel(xp_total)`).
6. **Deduplicar `areas_influencia`:** el MERGE `||` puede duplicar slugs en reenvios.
7. **Sembrar `areas_geograficas` con lat/lng reales (OSM)** y decidir el radio de asignacion automatica.
8. **BUG-065 ABIERTO:** agregar `visible` al INSERT de `album_agregar_foto` (`api/interacciones.js` ~L6663-6667) y filtrar por `visible`/`activo` en los conteos de mision.
9. **BUG-002 ABIERTO** (doble escape `\u` en `api/pagina-destino.js` L2431); **BUG-061 y BUG-062 ABIERTOS** (ajenos).
10. **Commit + push + deploy** del paquete. **Higiene de working tree:** NO mezclar el borrado ajeno `prompt_maestro_comunicacion_casas.md` ni el untracked `prompt.md`.

#### Riesgos activos
- **Migracion 027 CREADA y aun no aplicada en Neon:** desplegar las ramas `marca_*`/`mi_marca` sin la 027 da error de tabla inexistente (mismo flujo que 017/021).
- **`areas_geograficas` vacia:** el ranking territorial no tiene insumo hasta sembrar areas con lat/lng.
- **`patrocinios` sin integridad referencial:** `objetivo_id` puede quedar huerfano; el backend solo valida el tipo, no la existencia del objetivo.
- **Datos de patrocinio inertes:** `xp_aportada`/`fama_bonus` se persisten pero no se acreditan a nadie en v1.
- **Header drift (ADR-006):** `api/usuarios.js` sigue rotulado v18 y `api/pagina-destino.js` no subio por el fix de 1 linea; corregir en el commit.
- **BUG-066 CERRADO** (regresion FE-02); mismo patron de UI anidada que BUG-020/TSK-065 -> ver ADR-043 para prevencion.
- **`mi_marca` sin auth:** superficie enumerable por `usuario_id`; decision pendiente.

### Sesion TSK-118 "Comunicacion oficial + Casas + Admin Mapa" (2026-09-18) - ADR-041

Tarea TSK-118 **IMPLEMENTADA EN WORKING TREE + HOTFIXES POST-QA** (SIN commitear;
verificado contra archivo real, ADR-006, el 2026-09-18). La decision consolidada vive en
`DECISIONS.md` **ADR-041** (decisiones a-h de la sesion; la tarea en `TASKS.md`
TSK-118; el relevo corto en `docs/HANDOFF_041.md`). NO hay archivos nuevos en
`api/` (8/8 intacto, ADR-001/ADR-010); SI hay 1 migracion nueva sin versionar
(`db/migrations/026_casas_comunicaciones.sql`, 329 lineas).

**Estado real del working tree (verificado, ADR-006, 2026-09-18):**
- `db/migrations/026_casas_comunicaciones.sql`: **EXISTE** (329 lineas;
  idempotente ADR-008; ASCII-safe ADR-002: 0 bytes >127 y 0 backticks).
- Headers reales: `api/usuarios.js` **v18** (v17 + hotfix J-3);
  `api/interacciones.js` **v23** (base v22 de ADR-039/ADR-040 + hotfixes
  post-QA J-1/J-2; entrada de changelog v23 en L18, la linea-titulo L1 aun
  rotula v22).
- Anclas `api/interacciones.js`: `acreditarClaseYCofre` L338-345,
  `avanzarMisionesCasa` L360, `chat_salas` con `es_oficial` L3518,
  `casa_misiones` L5270, `anuncio_oficial` L5769, `casa_tributo_config` L5797.
  Authz J-2: `validarSesion` en L5835. Degradacion J-1: L3537-3539
  (`chat_salas`) y L5724-5729 (`chat_msg`). Ancla J-3 en `api/usuarios.js`:
  `CR_LIDER_REFRESH_MS` L241 y throttle L612-625.
- `usuario-session.js`: `TITULOS_POR_NIVEL` L82, `getEra` L106, modales L116+.
- `map-picker.js`: `getPickerMap`/`getMiniMap` L267-268; `admin.html` L1718/L2129/L4768+.
- `git status` (2026-09-18): `M api/interacciones.js`, `M api/usuarios.js`,
  `M usuario-session.js`, `M comunidad.html`, `M admin.html`, `M map-picker.js`;
  sin versionar `?? db/migrations/026_casas_comunicaciones.sql`. La migracion
  024 y la 025 se consideran **YA APLICADAS** en Neon por indicacion del usuario
  (2026-09-18).

**Que se hizo (resumen, ver TASKS.md TSK-118 para anclas ADR-006):**
- **Canal oficial (decisiones c, h):** `chat_salas.es_oficial` + canal "Anuncios
  ExploraCO" (en la 026); `GET chat_salas` expone `es_oficial` con degradacion
  42703 (hotfix J-1); `chat_msg`
  bloquea 403 a no-admin en la sala oficial (Bearer `ADMIN_SECRET` o email
  `brsk84@gmail.com`) y tambien degrada 42703; NUEVA rama `POST ?tipo=anuncio_oficial` (solo Bearer
  `ADMIN_SECRET`); `comunidad.html` con badge "OFICIAL", pin al tope y bloqueo
  de input. **NO se agrega `usuarios.rol`.**
- **Casas (decisiones d, e, g):** NUEVA rama `POST ?tipo=casa_tributo_config`
  (admin o `lider_user_id`, rango 0..15; hotfix J-2: el lider exige
  `validarSesion`); el tributo de `acreditarClaseYCofre`
  ya no es `0.10` literal sino `casas_cofre.tributo_pct` (default 10, clamp
  0..15); `GET casa_ranking` (v18) expone `lider_user_id`/`tributo_pct` con
  degradacion escalonada y refresco perezoso del lider, con throttle de 60 s
  por instancia (hotfix J-3); misiones conjuntas con
  `avanzarMisionesCasa` (hooks en foto/resena/visita/xp_total) y GET unico
  `?tipo=casa_misiones`.
- **Eras y titulos (decision f):** 20 titulos + 4 eras + `getEra` y modales de
  nivel-up/cambio de era en `usuario-session.js`; "Ampliar info" dispara
  `#btn-perfil-viajero` (NO se creo `abrirPerfil`).
- **Admin mapa (decision b):** picker a 500 px + circulo vectorial de rango via
  `MapPicker.getPickerMap()` (NO se asume `MapPicker._map`).

#### Que sigue
1. **APLICAR `db/migrations/026_casas_comunicaciones.sql` EN NEON (BLOQUEANTE,
   lo ejecuta Javier).** Correr primero el PREFLIGHT (seccion 0 del `.sql`,
   read-only) y luego el archivo COMPLETO en el editor SQL de Neon;
   re-ejecutar es no-op. La **024 y la 025 se consideran YA aplicadas** por
   indicacion del usuario (2026-09-18); su registro historico como pendientes
   (sesiones TSK-112/TSK-114) se conserva (Regla de Oro 3). **Orden obligatorio
   del release: 024 -> 025 -> 026 -> backend (interacciones.js v23 + usuarios.js
   v18) -> frontend.**
2. **Deploy del backend DESPUES de la 026:** `api/usuarios.js` **v18** +
   `api/interacciones.js` **v23** (J-1/J-2 sobre la base v22 no desplegada de
   ADR-039/ADR-040; J-3 en usuarios v18).
3. **Deploy del frontend:** `usuario-session.js`, `comunidad.html`,
   `admin.html` y `map-picker.js`.
4. **Verificacion en vivo:** publicar un anuncio oficial y confirmar que un
   tercero NO puede escribir en el canal (input oculto + 403 server-side);
   configurar `tributo_pct` como admin/lider y ver el efecto en el cofre
   (confirmar que un `usuario_id` ajeno SIN JWT recibe 403, hotfix J-2);
   confirmar `lider_user_id` en `casa_ranking` y la fila `lider` en
   `casa_roles`; avanzar una mision de Casa; ver los modales de nivel-up/era;
   ver el circulo de rango en el admin con un `radio_m` real.
5. **Commit + push del release:** incluye los pendientes de TSK-107..TSK-117 +
   esta sesion + el cierre documental (`TASKS.md`, `NEXT.md`, `DECISIONS.md`
   ADR-041, `PROJECT.md`, `BLUEPRINT.md`, `BUGS_HISTORICOS.md`,
   `docs/HANDOFF_041.md`). NO mezclar archivos ajenos/borrados del working tree.
6. **Backlog / deuda:** misiones base diferenciadas por Casa; asignacion de
   roles `oficial`/`mariscal`/`miembro`; corregir la linea-titulo L1 de
   `api/interacciones.js` (aun `v22`; el changelog ya entro a `v23`); BUG-061
   (AMPLIFICADO por los hooks de Casa), BUG-002 y BUG-062 siguen abiertos.

#### Riesgos activos
- **Migracion 026 CREADA pero aun no aplicada en Neon:** desplegar el backend
  v23/v18 sin la 026 haria fallar `anuncio_oficial`, `casa_tributo_config`,
  `casa_misiones` y las columnas `lider_user_id`/`tributo_pct` (columna
  inexistente, mismo flujo que 017/021). El hotfix J-1 evita la caida de
  `chat_salas`/`chat_msg`, pero la 026 SIGUE siendo obligatoria. El orden
  024 -> 025 -> 026 -> deploy es obligatorio.
- **Linea-titulo L1 de `interacciones.js` aun v22:** el changelog ya entro a
  v23; drift documental menor (ADR-006) a corregir en el commit.
- **J-3 mitigado, no eliminado:** el throttle del refresco del lider es por
  instancia (no distribuido); con N instancias hay hasta N refrescos/min.
- **J-1/J-2 verificados solo en working tree:** los hotfixes no se han probado
  en vivo; la authz por `validarSesion` y la degradacion 42703 deben
  confirmarse con el backend desplegado.
- **Normalizacion silenciosa del tributo:** un `tributo_pct` invalido en la
  columna se normaliza a 10 en runtime sin log; el CHECK 0..15 lo acota.
- **`casa_roles` solo puebla `lider`:** los otros roles del CHECK no tienen
  flujo de asignacion en v1 (no bloqueante).
- **Circulo de rango sin validar en produccion:** depende del deploy; validar
  en desktop y movil.
- **BUG-061 sigue ABIERTO y AMPLIFICADO:** `POST tipo='foto'` no valida sesion
  y los hooks `avanzarMisionesCasa` (foto/resena/visita) escriben a nombre del
  `usuario_id` recibido. **BUG-002 y BUG-062 siguen ABIERTOS** (ajenos a esta
  sesion).

### Sesion TSK-114..TSK-117 "Museo URL-only + acordeon de niveles + localizacion y map-picker" (2026-09-18) - ADR-039 + ADR-040 + ENMIENDA 1 de ADR-039

Tareas TSK-114 (Museo URL-only + backend v22 + migracion 025), TSK-115 (acordeon
de niveles / ADR-040), TSK-116 (UI Museo + localizacion T5/T7) y TSK-117
(`map-picker.js`) **IMPLEMENTADAS EN WORKING TREE** (SIN commitear; verificado
contra archivo real, ADR-006, el 2026-09-18). Las decisiones viven en
`DECISIONS.md` ADR-039 + **ENMIENDA 1 de ADR-039** y ADR-040; las tareas en
`TASKS.md` TSK-114..117. NO hay archivos nuevos en `api/` (8/8 intacto,
ADR-001/ADR-010); SI hay 1 migracion nueva (025), 2 assets frontend nuevos
(`niveles-data.js`, `map-picker.js`) y 2 scripts nuevos.

**Estado real del working tree (verificado, ADR-006, 2026-09-18):**
- `api/interacciones.js` **v22** (header real L1-17; release compartido ADR-039 +
  ADR-040 + T4.5). `db/migrations/025_album_fotos_visible.sql` **EXISTE** (171
  lineas). Existen `niveles-data.js` (9363 bytes), `map-picker.js` (11188),
  `scripts/smoke_niveles_data.js` y `scripts/verify_025_precheck.js`.
- Catalogo real de misiones: **41** (`id: 'mis_` x41); `mis_videografo`
  ("Cronicas en Movimiento") y `mis_sonidista` ("Ecos y Relatos") con `xp:15` y
  `gate_nivel:2`. Anclas: `api/interacciones.js` L1304/L1319 (misiones),
  L376/L387 (`MISION_GATE_XP`/`nivelDeMisionServidor`), L3695-3777 (GET
  `museo_recurso`), L6197-6415 (POST `museo_recurso`), L3596/L3598/L4223/L4226/
  L4251/L4267/L4386/L4678/L4794/L4822/L4881 (filtros `visible`).
- `git status` (2026-09-18): `M api/interacciones.js`, `M mi-perfil.html`,
  `M admin.html`, `M scripts/smoke_021_xp_decimal_rankings.js`,
  `M scripts/smoke_038_casas_clases.js`, `M scripts/smoke_test_gamificacion_v4.js`,
  `M exploraco desarrollo/DECISIONS.md`; sin versionar
  `?? db/migrations/025_album_fotos_visible.sql`, `?? niveles-data.js`,
  `?? map-picker.js`, `?? scripts/smoke_niveles_data.js`,
  `?? scripts/verify_025_precheck.js`.

**Que se hizo (resumen, ver TASKS.md TSK-114..117 para anclas ADR-006):**
- **Museo URL-only (ADR-039 + ENMIENDA 1):** recursos como URLs externas sobre
  `album_fotos`; visibilidad POR RECURSO (`album_fotos.visible`, migracion 025,
  privado por defecto) con filtro server-side en los lectores publicos
  (incluidos conteos y subqueries de votos); ramas `?tipo=museo_recurso`
  (crear/editar/eliminar/listar) con `validarSesion` y usuario tomado de la
  sesion; carpetas = albumes (mover = `album_id`); auto-album "Mi Museo";
  coords a nivel de album; `mis_guardados_media` sin filtro; `barrio`
  descartado (solo `ciudad`/`region`).
- **ENMIENDA 1 de ADR-039 (BLOQUEANTE de QA resuelto):** gate unico
  `mis_fotografo` para foto/video/audio (evita deadlock circular de
  `mis_videografo`/`mis_sonidista`), **+15 XP para los 3 tipos** y 2 misiones
  nuevas (`gate_nivel:2`). El texto viejo de ADR-039 (opcion 7 y decision E)
  prometia 0 XP y sin gate para video/audio; quedo marcado como SUPERSEDIDO y el
  contrato vigente es el de la enmienda.
- **Acordeon de niveles (ADR-040):** `niveles-data.js` como fuente unica cliente
  (`XP_LEVELS` + `CAPACIDADES_DETALLE` + `capacidadesDelNivel`/`misionesPorNivel`),
  cableada solo en `mi-perfil.html`; backend aditivo en `?tipo=misiones`
  (`gate_nivel`/`desbloquea`/`nivel`).
- **UI Museo + localizacion (T5/T7):** tab Museo de `mi-perfil.html` con CRUD por
  URL, toggle de visibilidad y selector de carpeta; localizacion con pin sobre
  `map-picker.js` (host `.pf-museo`).
- **`map-picker.js` (TSK-117):** modulo compartido del selector de coordenadas;
  `admin.html` refactorizado para consumirlo (mismos ids).

**Escudo GOLD (APROBADO tras correcciones, 2026-09-18):** `node --check` OK;
ASCII OK; balance de divs 0; `smoke_niveles_data.js` **31/31**;
`smoke_test_gamificacion_v4.js` 95/95; `smoke_021_xp_decimal_rankings.js` 45/45;
`smoke_038_casas_clases.js` 76/76; `smoke_test_perfil_progreso.js` OK (41
misiones/33 logros); `smoke_test_comunidad.js` OK;
`smoke_test_milestones_v2.js` OK; `check_buildHTML_inline.js` OK. El QA inicial
marco BLOQUEANTE SOLO por desincronizacion ADR<->codigo; se resolvio con la
ENMIENDA 1 de ADR-039.

#### Que sigue
1. **ORDEN DE DEPLOY OBLIGATORIO (BLOQUEANTE):** aplicar en Neon primero la
   migracion **024** (pendiente de TSK-112) y despues la **025**
   (`db/migrations/025_album_fotos_visible.sql`, archivo COMPLETO en una
   corrida; idempotente). Correr antes `scripts/verify_025_precheck.js`
   (read-only). Patron BUG-021/BUG-060. **(Actualizacion TSK-118, 2026-09-18:
   la migracion 026 tambien entra al release; el orden vigente es
   `024 -> 025 -> 026 -> deploy del backend`. Ver la sesion TSK-118 al inicio
   de este documento.)**
2. **Deploy del backend v22** (`api/interacciones.js`) DESPUES de 024 y 025;
   luego el frontend (`mi-perfil.html`, `admin.html`, `niveles-data.js`,
   `map-picker.js`).
3. **Verificacion en vivo:** crear foto/video/audio por URL (privado por
   defecto), activar visible, mover de carpeta y eliminar; confirmar que un
   tercero no ve privados ni en listados ni en conteos; abrir el acordeon de
   niveles y ver misiones ancladas; localizar el Museo con el pin.
4. **Commit + push del release:** incluye los pendientes de TSK-107..TSK-113 y
   este cierre documental; NO mezclar archivos ajenos/borrados del working tree.
5. **Backlog:** sanitizar `scripts/smoke_036_compartir.js` (header v19) y
   `scripts/test_logros_catalogo.js` (30 logros); limpiar los `catch` vacios de
   `mi-perfil.html`; BUG-061 y BUG-002 abiertos.

#### Riesgos activos
- **Migracion 025 CREADA pero aun no aplicada en Neon:** desplegar el backend
  v22 sin la 025 haria fallar `museo_recurso` y los filtros `visible` (columna
  inexistente, mismo flujo que 017/021). El orden 024 -> 025 -> v22 es
  obligatorio.
- **Fuga de privados si falta un filtro:** cualquier lector nuevo de
  `album_fotos` DEBE filtrar `af.visible=true` (salvo `mis_guardados_media`);
  el riesgo documentado en ADR-039 es que un lector olvide el filtro. El smoke
  de la rama GET debe garantizarlo server-side (nunca client-side).
- **Duplicados de `XP_LEVELS`:** `index.html` y `comunidad.html` conservan su
  copia local (deuda documentada; swap futuro de 1 linea).
- **Cliente antes que backend v22:** el acordeon se mostraria sin misiones
  ancladas (degradado aceptable, sin ruptura).
- **Smokes preexistentes en rojo** (`smoke_036_compartir.js`,
  `test_logros_catalogo.js`) NO son de esta entrega, pero contaminan la senal de
  QA; tratarlos como deuda.
- **BUG-061 y BUG-002 siguen ABIERTOS** (no relacionados con esta entrega).

### Sesion TSK-113 "Sprint Multimedia / Perfil / Galeria / Mapa" (2026-09-18) - cierre documental

Tarea TSK-113 **COMPLETADA EN WORKING TREE** (SIN commitear; verificado contra
archivo real, ADR-006, el 2026-09-18). Guiado por el prompt
`PROMPT_OPENCODE_MULTIMEDIA_PERFIL_GALERIA.md` (untracked). La tarea vive en
`TASKS.md` TSK-113. NO hay archivos nuevos en `api/` (8/8 intacto, ADR-001) y **NO
genera migraciones**. `api/pagina-destino.js` queda en **v12.20260917** (header real
L1-2). **BUG-057 CERRADO** con el refuerzo v12.20260917 (ver BUGS_HISTORICOS.md).

**Que se hizo (resumen, ver TASKS.md TSK-113 para anclas ADR-006):**
- `api/pagina-destino.js` (v12.20260917, +6/-6): defensas reforzadas del popover
  Guardar en listener capture (L2513/L2533/L2545/L2556).
- `mi-perfil.html` (+82/-27; divs 394/394, script 3/3): fotos propias con
  `mediaCardHTML`, guardados por fuente, geo en `agregarFotoAlbum`, logros
  colapsables ("+N bloqueados"); comentario `Rev 2026-09-18b` insertado (O1 del
  Escudo GOLD #92).
- `galeria.html` (+58/-10; divs 84/84): paginacion 12/pagina (`gGalRenderPage`/
  `gGalLoadMore`), boton `#g-more` reutilizado.
- `index.html` (+103/-13; divs 523/523): titulo del drawer del mapa cultural
  (`mdSetDestinoTitulo`), `votarMediaMapa` (sin sesion y 401), `renderLogrosGrid`
  (solo `completada`, tierOrder platino>oro>plata>bronce).
- **O2 (desviacion de alcance):** `index-api-connector.js` NO se modifico; el
  endpoint filtra solo por `destino_id` y `cargarAlbumOficialDestino` ya envia
  `destino_id`; el titulo del drawer se resolvio en `index.html`.
- Escudo GOLD #92: `node --check` PASS, ASCII 0/0/0, divs 0/0/0,
  `smoke_auditoria_pagina_destino` 54/54 PASS. **APROBADO CON OBSERVACIONES.**

**PENDIENTE OPERATIVO de TSK-113 (lo ejecuta Javier):**
1. **Commit + push + deploy** de los 4 archivos del sprint + el cierre documental
   (`TASKS.md`, `NEXT.md`, `BUGS_HISTORICOS.md`, `docs/HANDOFF_037.md`) en un solo
   release.
2. **NO mezclar archivos ajenos (O3):** `opencode.json` y 3 `.opencode/agent/*`
   modificados; 4 borrados (`PROMPT_OPENCODE_TSK111.md`,
   `PROMPT_OPENCODE_TSK112.md`, `PROMPT_MULTIMEDIA_GALERIA.md`,
   `opencode - copia.json`); `PROMPT_OPENCODE_MULTIMEDIA_PERFIL_GALERIA.md`
   untracked.
3. **Verificacion en vivo post-deploy:** (a) drawer del mapa cultural con titulo del
   destino y voto de media (click en pin -> titulo + recursos filtrados);
   (b) paginacion de `galeria.html`; (c) fotos/guardados/geo/logros de
   `mi-perfil.html`; (d) popover Guardar estable en la ficha.
4. **Limpiar BUG-002** en `api/pagina-destino.js` L2431 (deuda preexistente
   confirmada: 1 doble-escape `'\\u2605'` en `addRvOptimista`, identico a HEAD).

**Riesgos activos de TSK-113:**
- **BUG-002 ABIERTO** (doble escape en `api/pagina-destino.js` L2431): deuda
  preexistente, NO introducida por el sprint; limpiar en una tarea de mantenimiento.
- **BUG-061 y BUG-062 siguen ABIERTOS** (ajenos a TSK-113).
- **Higiene de working tree (O3):** el release de TSK-113 NO debe mezclar los
  archivos ajenos modificados/borrados (config y prompts).
- El boton `#g-more` de `galeria.html` queda compartido por feed y modo destino;
  cualquier cambio futuro debe conservar esa reutilizacion.

### Sesion TSK-112 "Sistema de Casas (cofre + nivelacion) y Clases Rising Star" (2026-09-18) - ADR-038

Tarea TSK-112 **IMPLEMENTADA EN WORKING TREE** (SIN commitear; verificado contra
archivo real, ADR-006, el 2026-09-18). La decision consolidada vive en `DECISIONS.md`
**ADR-038 + ENMIENDA 1 (L1639-1677)**; la ENMIENDA 1 formaliza y aprueba el contrato
realmente implementado y prevalece sobre el diseno previo (manda el spec de producto
`PROMPT_OPENCODE_TSK112.md`). La tarea vive en `TASKS.md` TSK-112. NO hay archivos
nuevos en `api/` (8/8 intacto, ADR-001) y la migracion
`db/migrations/024_casas_cofre_y_clases.sql` **EXISTE** (232 lineas, idempotente,
ASCII-safe) y es la **UNICA migracion pendiente de aplicar en Neon**.

**Estado real del working tree (verificado, ADR-006, 2026-09-18):**
- `db/migrations/024_casas_cofre_y_clases.sql`: **EXISTE** (232 lineas). Agrega a
  `usuarios` `clase_id`/`nivel_clase`/`xp_clase`/`clase_elegida_en` + CHECK
  `chk_usuarios_clase`, crea `casas_cofre` (PK casa + `xp_cofre_total` +
  `poblacion_activa` + `factor_conversion` + `actualizado_en`) con seed idempotente
  e indice parcial `idx_usuarios_clase_id`. NO crea `casa_id`, NO `casas_votaciones`,
  NO FK.
- Headers reales: `api/usuarios.js` **v16** y `api/interacciones.js` **v21** (ambos
  `node --check` OK; ASCII 0/0/0). Helpers reales: `contextoXpE`, `calcularXpFinal`,
  `calcularNivelClase`, `calcularTagCasa` y `acreditarClaseYCofre`, con `BONUS_CLASE`
  y `XP_NIVEL_CLASE`; rama POST `clase_elegir` presente. **NO existe** el
  monotilitico `entregarXpUsuario`, **NO hay gate de nivel** y **NO hay afinidad por
  accion** (asi lo aprueba la ENMIENDA 1).
- Frontend: `mi-perfil.html` con `#pf-clase` + `#modal-clase` + `cargarClase`/
  `elegirClase` (divs 390/390) y `comunidad.html` con tag/mult/cofre en las cards del
  ranking (divs 304/304).
- `git status` (2026-09-18): `M api/usuarios.js`, `M api/interacciones.js`,
  `M mi-perfil.html`, `M comunidad.html`, `M exploraco desarrollo/DECISIONS.md`,
  `M TASKS.md`, `M NEXT.md`, y sin versionar
  `?? db/migrations/024_casas_cofre_y_clases.sql`,
  `?? scripts/smoke_038_casas_clases.js` y `?? PROMPT_OPENCODE_TSK112.md` (prompt de
  la tarea, no artefacto de producto).
- **La implementacion, la migracion y el QA de TSK-112 YA estan ejecutados** (Escudo
  GOLD con `smoke_038` 76/76 PASS; ver abajo).

**Contrato implementado (ENMIENDA 1 del ADR-038, prevalece sobre el diseno previo):**
- **Se REUSA `usuarios.casa`** (`condor|jaguar|delfin`, `varchar(20)`, CHECK
  `chk_usuarios_casa` e indice parcial `idx_usuarios_casa` de la migracion 017 /
  ADR-028); se RECHAZA la propuesta original de `casa_id` con valores
  `alta|media|baja` + tabla `casas_tributacion`.
- **`casas_cofre`:** cofre por Casa con seed idempotente y sin FK en v1.
  `poblacion_activa`/`factor_conversion` son **cache NO autoritativa**. La
  **tributacion del 10% del `xp_final`** es un literal `0.10` dentro de
  `acreditarClaseYCofre`, best-effort, **sin endpoint HTTP `casa_tributar`**.
- **Factor de nivelacion runtime (calcularTagCasa):** `dominante` (>45%, x0.85),
  `equilibrada` (25%-45%, x1.00) y `rezagada` (<25%, x1.30), aplicado UNA sola vez en
  `calcularXpFinal`. `arancel_inter_casa`/`fee_mercado_interno` se exponen pero NO se
  cobran en v1.
- **Clases Rising Star:** coexisten con el Arbol de 16 ramas (`progreso_arbol`,
  ADR-028; NO lo reemplazan). `BONUS_CLASE` = cartografo 0.08 / cronista 0.10 /
  explorador 0.07; `XP_NIVEL_CLASE` = 11 umbrales
  `[0,100,250,500,900,1400,2100,3000,4200,5700,7500]`; `xp_clase` incrementa el
  **50% del `xp_final`**. `clase_elegir`: primera eleccion gratis, recambio con
  **300 XP + cooldown de 30 dias**, errores `CLASE_INVALIDA`/`CLASE_YA_ELEGIDA`/
  `COOLDOWN_CLASE`/`PUNTOS_INSUFICIENTES`/`EMAIL_SIN_VERIFICAR`.
- **Whitelist de 14 acciones** con la triada de helpers (los `UPDATE usuarios SET
  xp_total` siguen inline para preservar contadores); **EXCLUIDOS** cobros
  (`dm_enviar`, `comprar_consumible`) y bonos/terceros (`evaluarMisiones`,
  `evaluarLogros`, `progresarPandillaRetos`, `repartirXpReferidos`).
- **Versionado ejecutado:** `api/usuarios.js` v15 -> **v16** y `api/interacciones.js`
  v20 -> **v21**. **`casas_votaciones` se DIFIERE a v2.**

**Ambiguedades resueltas/ajustadas por la ENMIENDA 1 (2026-09-18):** el gate de
nivel >= 2 y el mapeo de afinidad de las 14 acciones quedan **RESUELTOS como NO
existentes**; la curva real es `XP_NIVEL_CLASE` de 11 umbrales y `xp_clase = 50% del
xp_final`. Sigue vigente revisar los **umbrales de tag 45%/25% y los multiplicadores
0.85/1.00/1.30 tras la primera semana de datos**. Detalle en ADR-038, ENMIENDA 1
(DECISIONS.md L1639-1677).

**Verificacion (Escudo GOLD, 2026-09-18):** `node --check` OK; ASCII 0/0/0 en API,
migracion y smoke; balance de divs 0; smokes `017` (73/73), `021` (45/45),
`036_media_unificada` (85/85), `gamificacion_v4` (95/95) y `smoke_038_casas_clases`
**76/76 PASS**. El QA inicial dio "GOLD FAIL" SOLO por desincronizacion ADR<->codigo;
se resolvio con la ENMIENDA 1 (no hubo fallo de sintaxis, ASCII ni balance). Deuda
PREEXISTENTE (no de TSK-112): los `.catch(function(){})` best-effort de
`api/interacciones.js` (37 ocurrencias).

**Agentes:** architect/architect-review (diseno + Enmienda 1), sql-security
(migracion 024 y cofre), backend-dev x2 (`api/usuarios.js` v16,
`api/interacciones.js` v21), frontend-tpl (UI de Casas/Clases), qa-auditor (Escudo
GOLD), docs-keeper (cierre documental).

#### Que sigue
1. **Aplicar `db/migrations/024_casas_cofre_y_clases.sql` en Neon** (archivo
   COMPLETO en una corrida; idempotente). Es la **UNICA migracion pendiente de
   aplicar**: las **019-023 YA estan aplicadas en Neon** (confirmado por Javier el
   2026-09-17; se conserva su registro historico como pendientes, Regla de Oro 3).
   Correr despues el preflight del ADR contra `information_schema` (columnas
   `clase_id`/`nivel_clase`/`xp_clase`/`clase_elegida_en`, tabla `casas_cofre` e
   igualdad de las listas CHECK `usuarios.casa` vs `casas_cofre.casa`).
2. **Deploy del backend** (`api/usuarios.js` v16 + `api/interacciones.js` v21)
   despues de aplicar la 024.
3. **Deploy del frontend** de Casas/Clases (`mi-perfil.html`, `comunidad.html`).
4. **Verificacion en vivo:** elegir Clase y ver el multiplicador/`tag` de Casa en el
   ranking; confirmar el tributo del 10% en `casas_cofre.xp_cofre_total`; probar el
   recambio de Clase (300 XP + cooldown de 30 dias).
5. **Commit + push del release:** incluye los pendientes de TSK-107..TSK-111 y este
   cierre documental; NO mezclar los archivos ajenos/borrados.

#### Riesgos activos
- **Migracion 024 CREADA pero aun no aplicada en Neon:** el backend v16/v21 no puede
  desplegarse antes de aplicarla; si se desplegara, consultaria columnas y la tabla
  `casas_cofre` inexistentes (mismo flujo que 017/021, ADR-008).
- **Coexistencia de dos capas de progresion:** el Arbol de 16 ramas
  (`progreso_arbol`, ADR-028) sigue vigente en paralelo a las Clases; toda lectura
  o UI debe distinguir ambas para no mostrar ni perder progreso real.
- **Tributacion best-effort:** un fallo del cofre NO debe bloquear la entrega de XP
  del usuario (degradar con `warn`; los `.catch(function(){})` preexistentes son
  deuda a limpiar, AGENTS.md seccion 2.2).
- **Cache no autoritativa:** `casas_cofre.poblacion_activa`/`factor_conversion`
  pueden quedar desactualizadas si el refresh best-effort falla; la fuente de
  verdad es el calculo runtime (no leerlas como autoritativas).
- **Gaming de poblacion activa:** el factor por participacion puede incentivar
  migraciones coordinadas entre Casas; en v1 solo hay monitoreo (tributacion sobre
  `xp_final`), sin defensa fuerte. Revisar umbrales 45%/25% y 0.85/1.00/1.30 tras la
  primera semana de datos.
- **Deuda `usuarios.activo`/`ultimo_acceso` (patron BUG-021):** el calculo de
  poblacion activa depende de columnas no versionadas; debe degradar con `warn` y
  nunca romper la entrega de XP.
- **BUG-061 y BUG-062 siguen ABIERTOS** (no relacionados con TSK-112).

### Sesion TSK-111 "Geocerca 50 m, album_oficial en el mapa, limpieza del admin y refactor de hero/galeria" (2026-09-17) - ADR-037

Tarea TSK-111 implementada en working tree (SIN commitear). La decision consolidada
vive en `DECISIONS.md` ADR-037, con NOTA DE ENMIENDA fechada en ADR-024 (radios
urbanos) y ADR-034 (hero/galeria/orden de modulos); la tarea en `TASKS.md` TSK-111.
NO hay archivos nuevos en `api/` (8/8 intacto, ADR-001) y **NO hay migraciones
nuevas**: TSK-111 es solo logica de aplicacion, UI y constantes.

**Cambios (verificados contra archivo real, ADR-006; `git diff --numstat` = 7
archivos modificados, +335/-298, mas 1 archivo nuevo):**
- `admin.html` (+49/-82): se retira "Que incluye el precio" de la UI; se elimina el
  control "Orden de modulos" dejando `#hostal-modulos-list` OCULTO (L1234,
  `display:none aria-hidden`) para PRESERVAR `tags.orden_modulos`; se elimina la
  seccion "Operacion" y `f-capacidad` se reubica en la pestana General
  (`#fpanel-general`, L813-818); `f-comotransporte` (codigo muerto) se elimina
  end-to-end; FAQ estrena Subir/Bajar (`moveFaqRow` L3253) sobre el generico
  `moverFila` L3234 (Actividades ya lo tenia).
- `api/interacciones.js` (+44/-8; header v19 -> v20): `RADIO_DEFAULT_M` 100 -> 50
  (L139) y `RADIO_POR_CATEGORIA` `sitio/hostal/comida` 100 -> 50 (L140; `evento` 150
  intacto); subcategorias URBANAS a 50 (L141-147); rural 250, parque 150, concierto
  150, festival 200 y deporte 200 intactos; `ACCURACY_MAX_M=150` (L151) y bloqueo 422
  intactos. `album_oficial`: la rama `multimedia_mapa` acepta `?destino_id=<uuid>`
  validado con regex uuid inline (L4324-4330) y agrega la clave aditiva con la query
  a `destinos_fotos` envuelta en `conDegradacionMedia` (L4449-4460).
- `api/pagina-destino.js` (+121/-194; header v11): guard de `edad_minima` con
  `String(...).trim() !== ''` (L1690); hero botonera en 2 filas (`.hctar-row`
  L189/L2342-2343) con grid 1+3; imagenes del hero clickeables al lightbox existente
  (`abrirLightboxHero` L2577); "Fotos de viajeros" retirado (`loadFotos`/`subirFoto`/
  `votarFoto` + CSS `fp-*`; L2079/L2600); CTA renombrado a "Ver todas las fotos"
  (L1571-1572).
- `index-api-connector.js` (+32/-0): `cargarAlbumOficialDestino` y su export
  `window.cargarAlbumOficialDestino` (L391/L412), que degrada con `console.warn` sin
  romper el mapa.
- `index.html` (+51/-1): `mdMapaAlbumOficial` (L3327) y su llamada solo en la rama
  `origen='destino'` (L3382).
- `scripts/smoke_016_multinivel_crowdsourcing.js` (+29/-3) y
  `scripts/smoke_auditoria_pagina_destino.js` (+9/-10): smokes actualizados por el
  cambio de radio y por el retiro de modulos de la ficha.

**Decisiones de producto:** el radio urbano baja a 50 m manteniendo el accuracy maximo
en 150 m (son chequeos independientes); el album oficial del pin viaja como clave
aditiva `album_oficial` de la rama existente (cero endpoints nuevos); el orden de
modulos guardado NO se pierde al retirar la UI (nodo oculto); la galeria de viajeros
se consolida en `galeria.html` (TSK-110). Detalle en ADR-037.

**Verificacion (ADR-006):** Escudo GOLD (qa-auditor) **APTO CON OBSERVACIONES**:
`node --check` 8/8 en `api/*.js`; `api/interacciones.js` ASCII 0/0/0; balance de DIVs
de `admin.html` (hostal/comida/sitio/evento) = 0; smokes `check_buildHTML_inline`,
`smoke_auditoria_pagina_destino` (54), `smoke_016` (52) y `smoke_021` (45) PASS.
`smoke_test_epic_prompt` mantiene 4 FAIL PREEXISTENTES ajenos (DQ-2). Deuda ASCII
preexistente (no de TSK-111): `api/pagina-destino.js:2431` (1 doble-escape, BUG-002)
y `api/utilidades.js` (H8).

#### Que sigue
1. **[RESUELTO - 2026-09-17] APLICAR EN NEON las migraciones 019, 020, 021, 022 y
   023 (lo ejecuto Javier).** **Javier confirmo (2026-09-17) que YA ESTAN
   APLICADAS en Neon**; el bloqueo de arrastre de TSK-107..TSK-111 queda CERRADO y
   su registro historico se conserva (Regla de Oro 3). **TSK-111 NO agrega
   migraciones**; la unica migracion pendiente de APLICAR es la 024 (TSK-112), ya
   creada (232 lineas; ver la sesion TSK-112).
2. **Deploy en orden (migraciones 019-023 ya aplicadas):** backend
   (`api/interacciones.js` v20, `api/pagina-destino.js` v10/v11) -> frontend
   (`admin.html`, `index-api-connector.js`, `index.html`) -> smokes.
3. **Commit + push en un solo release:** los 7 archivos modificados + los pendientes
   de TSK-107..TSK-110 sin commitear + este cierre documental (`TASKS.md`, `NEXT.md`,
   `DECISIONS.md`). NO mezclar los 3 archivos borrados ajenos (`PROMPT.md`,
   `prompt_exploraco_tsk104.md`, `promptarreglos.txt`).
4. **Verificacion en vivo:** "Estuve aqui" a <= 50 m en un destino urbano y rechazo
   422 fuera del radio/accuracy; `album_oficial` visible en el drawer del pin del
   mapa; chip de `edad_minima` ausente si el campo esta vacio; hero con botonera en 2
   filas, grid 1+3 y lightbox; ausencia de "Que incluye el precio", "Orden de modulos"
   y "Operacion"; FAQ reordenable con Subir/Bajar.
5. **Backlog:** resolver BUG-061 y BUG-062; decidir si el nodo `#hostal-modulos-list`
   oculto se elimina en una tarea de limpieza (hoy se conserva para preservar el
   dato); eliminar de verdad `f-comotransporte` si algun dia reaparece en un merge.

#### Riesgos activos
- **Migraciones 019-023 (RESUELTO el 2026-09-17):** Javier confirmo que ya estan
  APLICADAS en Neon. Se conserva el registro del riesgo (Regla de Oro 3): mientras
  estuvieron pendientes, el backend de TSK-110 (v19/v20) y las rutas de
  media/compartir degradaban o fallaban y TSK-111 no podia desplegarse aislada. El
  unico bloqueo de migraciones que queda es la **024** (TSK-112), ya creada pero
  pendiente de aplicar en Neon.
- **Radio urbano de 50 m mas estricto:** el GPS en interiores/canonadas puede quedar
  fuera; el frontend ya envia `accuracy` y el 422 `PRECISION_INSUFICIENTE` sigue
  vigente, pero la friccion de "Estuve aqui" sube en destinos urbanos.
- **`#hostal-modulos-list` oculto pero presente:** es deliberado (preserva
  `tags.orden_modulos`), aunque deja DOM muerto hasta una limpieza futura.
- **BUG-061 y BUG-062 siguen ABIERTOS** (no relacionados con TSK-111).

### Sesion TSK-110 "Compartir social con XP + interacciones de media unificadas" (2026-09-17) - ADR-036

Tarea TSK-110 implementada en working tree (SIN commitear). La decision vive en
`DECISIONS.md` ADR-036; la tarea en `TASKS.md` TSK-110; la deuda derivada en
`BUGS_HISTORICOS.md` seccion "Deuda ADR-036"; el relevo corto en
`docs/HANDOFF_036.md`. NO hay archivos nuevos en `api/` (8/8 intacto, ADR-001);
SI hay 2 migraciones nuevas (`db/migrations/022_media_compartidos.sql` y
`023_interacciones_media_unificadas.sql`, sin versionar), 2 smokes nuevos y 1
asset frontend nuevo (`compartir.js`).

**Cambios (verificados contra archivo real, ADR-006; `git diff --numstat` = 8
archivos modificados, +1379/-536, mas 5 archivos nuevos):**
- `api/interacciones.js` (+949/-425; header `v18` -> `v19`): rama POST
  `compartir` (validarSesion obligatoria, item real 404, **25 XP primer share /
  5 XP posteriores**, tope **10 eventos y 50 XP / 24h**; ledger en
  `media_compartidos`, SIN tocar el CHECK de `interacciones.tipo`; L7070+);
  3 misiones nuevas (`mis_primer_compartido` L1421, `mis_voz_comunidad` L1429,
  `mis_embajador_destinos` L1439) y 3 logros nuevos (`logr_primer_compartido`
  L1774, `logr_compartidor_25` L1782, `logr_viral_100` L1790) -> catalogo real
  HOY **39 misiones / 33 logros**; media unificada (`media_voto`,
  `media_comentar`, GET `media_interacciones` L4584 y `media_comentarios`
  L4618); alias legacy conservados (`album_voto`, `foto_voto`,
  `comentario_foto`, `comentario_voto`, `comentario_eliminar`, `guardar_media`,
  `comentarios_foto`); **TODOS los lectores legacy migrados a `media_*`**
  (`album_detalle`, `fotos_top`, `mi_feed_fotos`, `multimedia_mapa`,
  `comentarios_recientes`, checks de misiones/logros, `museo_publico`, `arbol`,
  `mis_fotos` y sendero audiovisual); `galeria_destino` `items[]` v2
  (`fuente`, `votos`, `comentarios`, `ya_votado`, `ya_guardado`,
  `tipo_voto:'media'`; L4143-4231) con `cargarMetricasMedia` sin N+1; helpers
  `conDegradacionMedia` L2512 / `contarComentarioSafe` L2199 /
  `contarCompartidosUsuario` L2862 que degradan con `warn` (nunca 503 global ni
  catch vacio).
- `galeria.html` (+222/-32): modo destino con 5 secciones ("Fotos de este
  lugar", "Albumes de este espacio", "Fotos de la comunidad", "Mapa y
  audiovisual", "Comparte tu foto") y modal de foto/album con VOTAR, GUARDAR,
  COMPARTIR y comentarios para las 3 fuentes; carga `/compartir.js`.
- `album-comments.js` (+92/-33; **v2.0.0** L610): firma
  `mount(target,{fuente,itemId},opts)` retrocompatible con la de string legacy
  (`album_foto`).
- `index.html` (+50/-17): insignia `compartido` reincorporada en `XP_BADGES`
  (L4208) derivada del catalogo real de logros (`_compartidosDeLogros` ->
  `_sharedCount`), no de un contador local; `_toastBadgesNuevos` y re-render de
  insignias tras `cargarLogros`.
- `api/pagina-destino.js` (+40/-27; header v10): hero en mosaico (grid `1.9fr`
  + columna, fila 360px, L201-204) y boton **Compartir** al final del `.subnav`
  sticky (L2246-2253) con carga de `/compartir.js` (L2385).
- `usuario-session.js` (+24/-0): helper
  `window.ExploraCO.aplicarResultadoXp(data)` como unico punto de acreditacion
  de XP/misiones/logros de un caller externo (compartir.js).
- `comunidad.html` (+1/-1) y `mi-perfil.html` (+1/-1): SOLO cache-bust
  `album-comments.js?v=2`. Este ultimo tambien en `index.html` y `galeria.html`.
- NUEVOS sin versionar: `compartir.js` (295 lineas;
  `window.ExploraCompartir = { VERSION, init, compartir }`: Web Share API +
  WhatsApp + Copiar link, POST `compartir`, toasts reusando
  `window.ExploraCO.mostrarToast`), `db/migrations/022_media_compartidos.sql`
  (131; tabla + indice unico parcial `es_primero` + preflight + PLAN B),
  `db/migrations/023_interacciones_media_unificadas.sql` (408; `media_votos` +
  `media_comentarios` + `media_comentario_likes` + `ALTER media_guardados`
  `item_id uuid->text` y CHECK con `'curada'` + backfill idempotente),
  `scripts/smoke_036_compartir.js` (290) y
  `scripts/smoke_036_media_unificada.js` (361).

**Decisiones de producto:** el share no entra al CHECK de `interacciones.tipo`;
el ledger de XP tiene tabla propia (`media_compartidos`) con deteccion atomica
de primer share por indice unico parcial; votos/comentarios/guardados se
unifican en tablas polimorficas `media_*` con `item_id text`; las tablas legacy
se conservan (cero borrado) solo con backfill; el hero pasa a mosaico 1+3 y el
boton Compartir vive en el `.subnav`. Detalle en ADR-036.

**Discrepancia verificada (ADR-006):** el reporte de la sesion decia "insignia
`compartido` reincorporada en `index.html`/`comunidad.html`/`mi-perfil.html`".
Contra archivo real, la insignia volvio SOLO en `index.html`; `comunidad.html`
(L524) y `mi-perfil.html` (L789) conservan el comentario que la lista como
removida y solo recibieron el cache-bust. Queda como pendiente de consistencia
de UI, no bloqueante.

**Verificacion (ADR-006, ejecutada en esta sesion documental el 2026-09-17):**
`node --check` 7/7 OK (`api/interacciones.js`, `api/pagina-destino.js`,
`compartir.js`, `album-comments.js`, `usuario-session.js` y los 2 smokes);
ASCII-safe 0 bytes >127 y 0 backticks en `api/interacciones.js`,
`api/pagina-destino.js`, `compartir.js`, las 2 migraciones y los 2 smokes
(`usuario-session.js` mantiene su baseline no-ASCII preexistente con delta 0);
`scripts/smoke_036_compartir.js` **55/55 PASS** y
`scripts/smoke_036_media_unificada.js` **71/71 PASS**. **Ambos smokes usan mock:
NO validan el esquema de Neon.**

#### Que sigue
1. **APLICAR `db/migrations/022_media_compartidos.sql` Y
   `023_interacciones_media_unificadas.sql` EN NEON (BLOQUEANTE, lo ejecuta
   Javier, ANTES del deploy del backend v19).** Correr cada archivo COMPLETO en
   el editor SQL de Neon (idempotentes ADR-008) y ejecutar sus preflights
   read-only: en la 022 confirmar que el CHECK legacy de `interacciones` NO
   incluye `compartir`, que el indice parcial existe y que el `ON CONFLICT ...
   WHERE es_primero = true` infiere (si no, aplicar el PLAN B documentado); en
   la 023 confirmar el tipo real de `destinos_fotos.id` (6.1), que los conteos
   unificados igualan o superan a los legacy (6.2), que `media_guardados.item_id`
   es `text` y que su CHECK admite `'curada'` (6.4/6.5), y que una segunda
   corrida es no-op (6.3). **El backend v19 consulta tablas que deben existir;
   sin ellas las rutas de compartir/voto/comentario degradan o fallan.**
2. **Deploy en orden:** 022/023 en Neon -> backend v19 (`api/interacciones.js`,
   `api/pagina-destino.js`) -> frontend (`compartir.js`, `galeria.html`,
   `album-comments.js`, `index.html`, `comunidad.html`, `mi-perfil.html`,
   `usuario-session.js`).
3. **Verificacion en vivo:** compartir una foto curada (25 XP y fila en
   `media_compartidos`), repetir el mismo share (5 XP), superar 10 eventos/24h
   (tope) y comprobar `limite_diario`; votar/comentar/guardar una curada y una
   de viajero desde la ficha y `galeria.html`; ver la insignia `compartido` en
   el perfil.
4. **Consistencia de UI pendiente:** decidir si la insignia `compartido`
   tambien vuelve a `comunidad.html`/`mi-perfil.html` (hoy solo esta en
   `index.html`) o si se actualiza el comentario de `XP_BADGES` para reflejar
   que la insignia es exclusiva de index.
5. **Commit + push:** los 8 archivos modificados + los 5 nuevos + este cierre
   documental (`TASKS.md`, `NEXT.md`, `DECISIONS.md` ADR-036,
   `BUGS_HISTORICOS.md`, `PROJECT.md`, `BLUEPRINT.md`, `docs/HANDOFF_036.md`) en
   un release coherente. NO mezclar archivos borrados/ajenos.
6. **Backlog:** versar el esquema base (CHECK de `interacciones.tipo`, tablas
   `usuarios`/`interacciones`/`destinos_fotos`); eliminar las tablas legacy
   cuando ningun cliente viejo las lea; BUG-061 (`POST tipo='foto'` sin
   `validarSesion`, escalado a `sql-security`); BUG-062 (fotos Unsplash en
   `admin.html`).

#### Riesgos activos
- **Migraciones 022/023 pendientes (BLOQUEANTE):** el backend v19 consulta
  `media_*`; los smokes usan mock y NO validan Neon, por lo que la unica
  validacion real es aplicar las migraciones y correr los preflights.
- **CHECK de `interacciones.tipo` y esquema base no versionados:** la deteccion
  de primer share depende del indice unico parcial; si el planner no infiere el
  `ON CONFLICT` parcial, la 022 trae el PLAN B (`media_compartidos_unicos`) pero
  exigiria ajustar el backend (no se hace automaticamente).
- **Tablas legacy retiradas del backend pero no dropeadas:** convivencia
  deliberada; su `DROP` es una tarea de datos futura y separada.
- **Consistencia de insignias:** `compartido` solo en `index.html` (ver arriba).
- **BUG-061 sigue ABIERTO** en `tipo='foto'` (la rama `compartir` nueva si exige
  sesion).

### Sesion TSK-109 "XP decimal, pestana Clase y rankings de comunidad" (2026-09-17) - ADR-035

Tarea TSK-109 implementada en working tree (SIN commitear). La decision vive en
`DECISIONS.md` ADR-035 (redactada por architect como contrato de diseno y NO
duplicada aqui); la tarea en `TASKS.md` TSK-109; los bugs en
`BUGS_HISTORICOS.md` BUG-042 (CORREGIDO) y BUG-063 (NUEVO, CORREGIDO). NO hay
archivos nuevos en `api/` (8/8 intacto, ADR-001); SI hay una migracion nueva
(`db/migrations/021_xp_decimal.sql`, sin versionar), un preflight
(`scripts/verify_021_precheck.js`, sin versionar) y un checklist de despliegue
nuevo (`docs/DEPLOY_021.md`).

**Cambios (verificados contra archivo real, ADR-006; `git diff --numstat` = 10
archivos de codigo, +700/-282; `DECISIONS.md` +249/-1 lo agrego architect):**
- `api/interacciones.js` (+185/-98; header `v18`): helper de redondeo half-up a
  2 decimales, `parseFloat`/`Number` sobre columnas XP (sin `::int` en las
  sumas), NUEVA rama `GET tipo=pandilla_ranking` global por `fama_total DESC`
  con `miembros`/`miembros_activos` y fallback `42703` (L4257-4284); gate de
  `album_crear` con `calcularNivelLocal(...).nivel` (L5379; cierra BUG-042);
  guarda de fama `famaBase <= 0` (L1880-1881; cierra BUG-063).
- `api/usuarios.js` (+102/-40; header `v15`): `calcularNivel`/`conNivel`
  normalizan a `Number` redondeado; `casa_ranking` agrega `miembros_activos`
  (activo=true AND `ultimo_acceso > NOW() - 30 days`) y pasa a
  `ORDER BY xp_total DESC` (L510-557), con el mismo fallback `42703`; rankings
  sin `::int`.
- `comunidad.html` (+195/-43): tab Ranking con 4 sub-vistas (Viajeros | Casas |
  Facciones | Parches; `rk-chip` L372-386 y `setRankingVista` L1661); consume
  `casa_ranking` (L1579) y `pandilla_ranking` (L1613); el ranking de Facciones
  sale de "Activo Oculto" (`verRankingFacciones` L2144-2146 deja un CTA).
- `mi-perfil.html` (+101/-50): pestana "Clase" consolidada -- el Arbol de
  Clases es el componente unico (tab `clase` L463); "Tabla de Destino" pasa a
  sub-vista `senderos` (L2621-2622, L2707-2708); "Tu Faccion" pasa a cabecera
  del arbol; "Vocaciones de Artista" se integra en la sub-vista de la faccion
  `artistas` con boton inline "Activar vocacion" (L2859); "Mi Casa" queda como
  bloque compacto (L698-699). IDs/funciones conservados para no romper smokes.
- `usuario-session.js` (+39/-19): helper canonico
  `window.ExploraCO.fmtXp`/`redondearXp` (L46-60; `es-CO`, 2 decimales,
  `Number.EPSILON`) y acreditaciones en cliente normalizadas.
- `api/admin.js` (+29/-14): `precio_xp` acepta decimales (`parseFloat` +
  redondeo; ya no exige entero); listado de resenas normalizado;
  `repartirXpReferidos` sincronizado con el de `interacciones.js`.
- `admin.html` (+20/-9): display de XP con `fmtXp` y precio decimal en la
  tienda.
- `index.html` (+15/-5): `getLevel`/`statsU` con `parseFloat` + `fmtXp`
  (fallback local L4233-4234).
- `perfil.html` (+9/-1): XP del museo publico normalizado.
- `api/pagina-destino.js` (+5/-3; header `v10`): el espejo cliente de
  `xp_total` al publicar/votar foto usa `Number` (no `parseInt`).
- NUEVOS sin versionar: `db/migrations/021_xp_decimal.sql` (121 lineas,
  idempotente ADR-008, ASCII-safe ADR-002; 9 columnas XP -> `numeric(12,2)`
  con guard `information_schema`, sin indices) y
  `scripts/verify_021_precheck.js` (149 lineas, read-only).

**Decisiones de producto:** ADR-035 fija el almacenamiento `numeric(12,2)`
(no centi-XP ni `float8`), un unico helper de redondeo half-up por lenguaje,
la pestana "Clase" consolidada, los 4 rankings de comunidad y la prohibicion
de `::int`/`parseInt` sobre columnas XP. La conversion es exacta
(`int4 -> numeric(12,2)`), por lo que no hay backfill; `pandillas.fama_total`
NO se recomputa (solo cambia de tipo).

**Verificacion (ADR-006, ejecutada en esta sesion documental el 2026-09-17):**
`node --check` 6/6 OK (`api/usuarios.js`, `api/interacciones.js`,
`api/admin.js`, `api/pagina-destino.js`, `usuario-session.js`,
`scripts/verify_021_precheck.js`); ASCII-safe 0 bytes >127 y 0 backticks en
los 4 `api/*.js`, la migracion 021 y el preflight; `smoke_test_gamificacion_v4.js`
95/95 PASS; `smoke_test_comunidad.js`, `smoke_test_perfil_progreso.js`,
`smoke_test_milestones_v2.js` OK; `scripts/check_buildHTML_inline.js` TODO OK
(divs 361/361). `smoke_test_epic_prompt.js` mantiene 4 FAIL PRE-EXISTENTES
(53 checks, 49 PASS; VOCACIONES 3 vs 4 y `chat_salas` tipo plan) ajenos a esta
entrega.

#### Que sigue
1. **APLICAR `db/migrations/021_xp_decimal.sql` EN NEON (BLOQUEANTE, lo ejecuta
   Javier, ANTES del deploy del backend).** Preflight opcional read-only:
   `$env:DATABASE_URL="postgresql://..."; node scripts/verify_021_precheck.js`
   (falla si falta una columna obligatoria; `interacciones.xp_ganado` es
   opcional). Correr el archivo COMPLETO en el editor SQL de Neon y verificar
   `data_type='numeric'`, `numeric_precision=12` y `numeric_scale=2` en las 9
   columnas (bloque comentado al final del `.sql`), incluyendo `MIN`/`MAX` por
   columna para confirmar que los valores historicos se conservaron.
2. **Deploy en 2 releases, en este orden (ver `docs/DEPLOY_021.md`):**
   (a) aplicar la 021 en Neon; (b) deploy del BACKEND
   (`api/usuarios.js` v15, `api/interacciones.js` v18, `api/admin.js`,
   `api/pagina-destino.js` v10) con `usuario-session.js`; (c) smoke en vivo
   contra la API real; (d) deploy del FRONTEND (`index.html`, `admin.html`,
   `perfil.html`, `mi-perfil.html`, `comunidad.html`). Si el backend decimal
   se despliega SIN la 021, Postgres redondea por cast de asignacion en
   silencio (no hay 500): el sintoma es que el XP sigue entero.
3. **Verificacion en vivo sugerida:** elegir faccion y Casa desde
   `mi-perfil.html`; abrir el tab Ranking de `comunidad.html` y comprobar las
   4 sub-vistas (Casas con XP total, activos y promedio; Parches con
   `fama_total` y miembros activos; Facciones ya no vive en "Activo Oculto");
   provocar un XP con decimales (ej. un bono con multiplicador) y ver que se
   muestre "125,50 XP" y no "125,5" ni 125 truncado.
4. **Backlog:** indices de apoyo para los rankings; normalizar
   `api/pagina-destino.js` si quedara algun espejo de XP; fusionar
   `repartirXpReferidos` duplicado (`api/interacciones.js` y `api/admin.js`) si
   se decide; resolver el drift de `smoke_test_epic_prompt.js`; versar las
   columnas no versionadas (`usuarios.activo`, `usuarios.ultimo_acceso`,
   `interacciones.xp_ganado`).
5. **Commit + push:** los 10 archivos de codigo + `DECISIONS.md` + la migracion
   021 + el preflight + el spec
   (`docs/superpowers/specs/2026-09-17-xp-decimal-rankings-comunidad-design.md`)
   en un release coherente. NO mezclar los 3 archivos borrados ajenos
   (`PROMPT.md`, `prompt_exploraco_tsk104.md`, `promptarreglos.txt`).

#### Riesgos activos
- **Migracion 021 pendiente (BLOQUEANTE):** sin ella el backend decimal
  redondea en silencio contra columnas `integer`; no hay error visible.
- **Orden de deploy invertido:** desplegar el frontend antes que el backend deja
  una ventana con formatos mixtos; el ADR exige backend+021 primero.
- **Rollback LOSSY:** `numeric(12,2) -> integer USING ROUND(col)` es exacto
  mientras no haya decimales acumulados y pierde las centesimas despues;
  respaldo opcional de las 9 columnas antes de la 021.
- **Deuda de columnas no versionadas (patron BUG-021):** los rankings dependen
  de `usuarios.activo`/`usuarios.ultimo_acceso`; la 021 los cubre con guard y el
  fallback `42703` responde `miembros_activos=0` con `warn` (nunca catch vacio).
- **Drift de `smoke_test_epic_prompt.js` (4 FAIL pre-existentes):** deuda QA no
  atribuible a esta entrega.
- **ADR-035 declara "NO implementado aun" en su Estado:** drift documental (el
  ADR se redacto como contrato antes de implementar); HOY el estado real es
  implementado en working tree.

### Sesion TSK-108 "Ficha de destino: hero, sintro, galeria y orden de modulos" (2026-09-17) - ADR-034

Tarea TSK-108 implementada en working tree (SIN commitear). La decision vive en
`DECISIONS.md` ADR-034; la tarea en `TASKS.md` TSK-108; el bug derivado en
`BUGS_HISTORICOS.md` BUG-062. NO hay archivos nuevos en `api/` (8/8 intacto,
ADR-001); SI hay una migracion nueva (`db/migrations/020_destinos_sintro.sql`,
sin versionar). ADR-030 queda actualizado (hero de 12 a 4 fotos y CTA
"Ver galeria" retirado solo del hero).

**Cambios (verificados contra archivo real, ADR-006; `git diff --numstat` = 6
archivos, +663/-95, mas 1 migracion nueva):**
- `api/pagina-destino.js` (+283/-65): hero de 4 fotos (`HERO_THUMBS_MAX=3`:
  1 grande `foto_hero` + 2a curada + viajero mas votado + album mas votado,
  con relleno y dedup URL; L776-805); botonera `Sitio web -> Contactar ->
  Como llegar -> Guardar -> Estuve aqui` (L2269-2277); se elimina "Ver
  galeria" del hero y se CONSERVA el CTA del gstrip (L848); `sobreIntro` usa
  `d.sintro` con fallback a 150 chars de `descripcion`/`highlight` (L865);
  galeria 1+12 (`GAL_THUMBS_MAX=12`, `GAL_CURADAS_MAX=6`,
  `GAL_COMUNIDAD_MAX=6`; L1573-1608; CSS `.gal-thumbs` 4/2/1 L311-313); orden
  de modulos hostal (`SEC_HOSTAL_DEFAULT` L2179 y ensamblado L2173-2214).
- `api/interacciones.js` (+46/-0): rama GET `tipo=mapas_de_destino` con
  `destino_id` o `slug` (400/404 tipificados); visibilidad `m.publico=true OR
  m.usuario_id=viewer`, con `viewer` derivado de `validarSesion` (ADR-025) y
  `null` sin sesion valida (L2731-2767).
- `api/admin-destinos.js` (+19/-3): `normSintro` (L22), `sintro` en SELECT
  (L111), INSERT (L159/L215) y UPDATE (L315-319).
- `api/publicar-lugar.js` (+12/-2): `normSintro` (L56) + `sintro` en el INSERT
  publico (draft).
- `admin.html` (+150/-5): `#f-sintro` (L917, tab GENERAL, max 200);
  `HOSTAL_MODULOS_ORDEN_DEFAULT` (L3183) y reorden con flechas de los modulos
  hostal + la lista de Actividades (`_renderHostalModulos`, L3177-3260);
  `tags.orden_modulos` en collect/apply (L3119-3165); `sintro` en
  `_placeToAPI`/loadForm (L3950, L6142, L2721/L3304).
- `galeria.html` (+153/-20): modo destino con 4 secciones `.g-sec` ("Fotos del
  destino", "Fotos de la comunidad", "Albumes del destino", "Mapas con este
  destino"; L150-205) + bloque de subida `#g-share`; consume
  `incluir=viajeros,albumes` (L627) y `mapas_de_destino` (L676).
- `db/migrations/020_destinos_sintro.sql` (NUEVA, 16 lineas, idempotente
  ADR-008, ASCII-safe ADR-002): `ALTER TABLE destinos ADD COLUMN IF NOT EXISTS
  sintro TEXT;` (nullable, sin default; los registros existentes quedan NULL y
  el render aplica su fallback).

**Decisiones de producto:** sin votacion nueva (se reutilizan
`interacciones.dims->>'voto_foto_id'` y `album_votos`); el subtitulo se
persiste en columna con fallback; el orden de modulos vive en
`tags.orden_modulos` (solo hostal, merge JSONB ADR-003); `galeria.html` se
divide en 4 secciones + subida.

**Nota de verificacion (ADR-006):** el header de `api/interacciones.js` sigue
en `v14` mientras los comentarios nuevos citan `v17`. En esta sesion documental
NO se ejecutaron `node --check` ni smokes (no se reportan resultados de pruebas
no corridas).

#### Que sigue
1. **APLICAR `db/migrations/020_destinos_sintro.sql` EN NEON (BLOQUEANTE, lo
   ejecuta Javier; patron BUG-021).** Correr el archivo COMPLETO en el editor
   SQL de Neon y verificar que `destinos.sintro` existe antes del deploy. Sin
   ella, guardar un destino desde el admin o `publicar-lugar` falla por columna
   inexistente (el render degrada con fallback, pero la escritura no).
2. **Commit + push + deploy de los 6 archivos en un solo release** junto con
   los pendientes previos sin commitear (TSK-095..TSK-107 + migraciones
   015/016/017/018/019 + scripts de la 004). NO mezclar los 3 archivos
   borrados ajenos (`PROMPT.md`, `prompt_exploraco_tsk104.md`,
   `promptarreglos.txt`).
3. **Verificacion en vivo:** hero con 4 fotos y sin "Ver galeria" (CTA
   conservado en el gstrip); `sintro` curado visible en "Sobre este lugar";
   galeria 1+12 curadas + comunidad; `galeria.html?destino=<slug>` con las 4
   secciones (incluida "Mapas con este destino"); orden de modulos hostal
   reordenado por flechas en el admin.
4. **Corregir BUG-062 (no bloqueante, pero perdida de datos):** unificar la
   clase `photo-url-input`/`photo-url-inp` en `admin.html` para que
   `getPhotos()` recolecte las fotos agregadas por Unsplash.
5. **Bump de version:** alinear el header de `api/interacciones.js` (`v14` ->
   `v17`) con los comentarios y las migraciones en el commit (ADR-006).

#### Riesgos activos
- **Migracion 020 pendiente (BLOQUEANTE):** sin la columna `destinos.sintro`,
  el INSERT/UPDATE de `admin-destinos.js` y `publicar-lugar.js` falla (patron
  BUG-021); el render publico SI degrada con el fallback historico.
- **BUG-062 (admin, MEDIA):** fotos agregadas por Unsplash no se guardan
  (clase distinta); la vista previa las muestra, lo que oculta el fallo.
- **Deploy pendiente:** el hero de 4 fotos, `sintro`, la galeria 1+12 y las 4
  secciones de `galeria.html` no estan en produccion hasta el
  commit/push/deploy.
- **Header de version desalineado (`v14` vs `v17`):** deuda documental a
  resolver en el commit (ADR-006).

### Sesion TSK-107 "Media del mapa, guardados de media y radio por lugar" (2026-09-17) - ADR-031 + ADR-032 + ADR-033

Tarea TSK-107 implementada en working tree (SIN commitear). Las decisiones viven
en `DECISIONS.md` ADR-031/ADR-032/ADR-033; la tarea en `TASKS.md` TSK-107; el
bug abierto relacionado en `BUGS_HISTORICOS.md` BUG-061. NO hay archivos nuevos
en `api/` (8/8 intacto, ADR-001); SI hay una migracion nueva
(`db/migrations/019_media_guardados_radio.sql`, sin versionar aun).

**Cambios (verificados contra archivo real, ADR-006; `git diff --stat` = 7
archivos, +591/-53 + 1 migracion nueva):**
- `api/interacciones.js` (+212/-14): **ADR-031** -- `multimedia_mapa` envuelto en
  `queryConAvatarFallback` (fix del 503 por `usuarios.foto_url` ausente), fila
  agregada `origen='destino_album'` (portada + `fotos_count`) ademas de
  `origen='destino'`, y filtro restrictivo solo con `scope=mio` (`mmUsuarioId`
  null por defecto). **ADR-032** -- GET `mis_fotos`, GET `mis_guardados_media`,
  POST `guardar_media`/`quitar_guardado_media` (503 explicito si falta la 019).
  **ADR-033** -- `factorXpPorRadio`/`RADIO_XP_MEDIO_M`/`RADIO_XP_CERO_M`,
  `resolverRadioM` priorizando `destinos.radio_m` en `POST tipo=visita`.
- `index.html` (+89/-3): toggle "Solo mio" (`#mm-solo-mio`).
- `index-api-connector.js` (+57/-31): `cargarMapaMedia()` agrega
  `&scope=mio&usuario_id=` solo con toggle activo y sesion; sin toggle, capa
  publica.
- `mi-perfil.html` (+109/-0): "Mis fotos" (`#mis-fotos-grid`) y "Mis guardados"
  (`#mis-guardados-media-grid`) con `mediaCardHTML` y `quitarGuardadoMedia()`.
- `perfil.html` (+60/-3): "Sala V: Fotos" publica de solo lectura (consume
  `mis_fotos` del dueno del museo; NO muestra guardados, que son privados).
- `admin.html` (+51/-1): campo `#f-radio-m` (min 25, max 100000) + presets +
  carga/guardado.
- `api/admin-destinos.js` (+16/-3): `radio_m` en SELECT/INSERT/UPDATE con
  validacion de rango.
- `db/migrations/019_media_guardados_radio.sql` (NUEVA, 65 lineas, idempotente
  ADR-008, ASCII-safe ADR-002): `destinos.radio_m` + `destinos_radio_m_check`
  (25..100000) + tabla `media_guardados` + 2 indices.

**Decisiones de producto:** visibilidad publica para fotos subidas y albumes
creados, privada para guardados (ADR-032); la capa de media del mapa es publica
por defecto y "Solo mio" es opt-in (ADR-031); la visita se registra siempre y
solo cambia la XP segun la amplitud del radio (ADR-033).

**Nota de verificacion (ADR-006):** en el working tree NO se encontro consumidor
de `guardar_media` (solo de `quitar_guardado_media`), por lo que hoy no hay UI
que cree un bookmark. El header de `api/interacciones.js` sigue en `v14` pese a
que los comentarios nuevos y la migracion citan `v17`.

**Verificacion:** documental contra archivo real (existencia de la migracion,
anclas de linea en los 7 archivos). NO se ejecutaron `node --check` ni smokes en
esta sesion documental; no se reportan resultados de pruebas no corridas.

#### Que sigue
1. **APLICAR `db/migrations/019_media_guardados_radio.sql` EN NEON (BLOQUEANTE,
   lo ejecuta Javier).** Sin ella: `guardar_media`/`quitar_guardado_media`
   responden 503, los GET degradan, y el SELECT de visita que lee `radio_m`
   puede fallar.
2. **Commit + push + deploy en un solo release** con los pendientes previos sin
   commitear (TSK-095..TSK-106 + migraciones 015/016/017/018 + scripts de la
   004). NO mezclar los 3 archivos borrados ajenos (`PROMPT.md`,
   `prompt_exploraco_tsk104.md`, `promptarreglos.txt`).
3. **Verificacion en vivo:** `hostal-r10-bogota` aparece con pin de album
   (`destino_album`); capa publica por defecto y "Solo mio" con sesion;
   `mis_fotos`/`mis_guardados_media` en perfil; radio explicito de "Estuve aqui"
   (XP 50% > 1 km y 0 > 5 km).
4. **UI de alta de bookmark (`guardar_media`):** agregar el marcador en
   `galeria.html`/ficha para poblar "Mis guardados"; hoy el area existe pero no
   se puede alimentar desde la UI.
5. **Bump de version:** alinear el header de `api/interacciones.js` (`v14` ->
   `v17`) con los comentarios y la migracion en el commit (ADR-006).
6. **BUG-061 sigue ABIERTO:** `POST tipo='foto'` sin `validarSesion`; escalado a
   `sql-security`.

#### Riesgos activos
- **Migracion 019 pendiente (BLOQUEANTE):** sin ella, los guardados responden
  503, `mis_guardados_media` degrada a vacio y el `radio_m` de la visita no
  esta disponible.
- **Sin UI para crear bookmarks:** el area "Mis guardados" no se puede poblar
  desde la interfaz; solo por API directa.
- **Header de version desalineado (`v14` vs `v17`):** deuda documental a
  resolver en el commit (ADR-006).
- **Bono rural vs radio grande:** con `radio_m > 5000` la XP base es 0, pero el
  bono rural plano (+20, ADR-024) sigue sumando; residuo a revisar.
- **BUG-061 (seguridad, MEDIA):** `tipo='foto'` es suplantable; los flujos
  nuevos de media conviven con el.

### Sesion TSK-106 "Capa multimedia, galeria comunidad y galeria hospedajes" (2026-09-16) - ADR-030 actualizado

Tarea TSK-106 implementada y verificada en working tree (SIN commitear). El prompt
de origen es `PROMPT_MULTIMEDIA_GALERIA.md` (sin versionar). La decision vive en
`DECISIONS.md` ADR-030 (actualizado, no reemplazado); la tarea en `TASKS.md`
TSK-106; el bug derivado en `BUGS_HISTORICOS.md` BUG-061. NO hay migraciones
nuevas ni archivos nuevos en `api/` (8/8 intacto, ADR-001).

**Cambios (verificados contra archivo real, ADR-006; `git diff --numstat` = 5
archivos, +243/-56):**
- `api/interacciones.js` (+28/-5): `GET ?tipo=multimedia_mapa` acepta
  `usuario_id` opcional validado por regex uuid (si es invalido el filtro se
  IGNORA; nunca llega texto no-uuid a `::uuid` -> sin 22P02). Con `usuario_id`:
  rama albumes -> `a.usuario_id=$N::uuid`; rama destinos -> `d.id IN (SELECT
  i.destino_id FROM interacciones i WHERE i.usuario_id=$N::uuid AND i.tipo IN
  ('guardado','voto','rating') AND i.activo=true)`. SIN `usuario_id` el SQL
  publico es byte-identico al anterior (regresion cero). Se sustituyo el calculo
  fragil `(mmTipos?'2':'1')` por indices capturados (`mmIdxTipos`/`mmIdxCiudad`/
  `mmIdxUsuario`), con `null` cuando el opcional no viene.
- `index-api-connector.js` (+12/-2): la capa multimedia llama
  `tipo=multimedia_mapa` SIN `origen=album` y con `&usuario_id=<id>` cuando hay
  sesion (`window.ExploraCO.usuario.id`). **Decision H-1: el filtro es
  RESTRICTIVO** (el logueado ve solo lo suyo), no aditivo.
- `index.html` (+30/-6): `renderMapaMedia` y `mdMediasCercanas` ya NO descartan
  `origen==='destino'`; pins de destino con color `#1f8a70` + borde punteado
  (`.mpa-media-pin-dest`) y dedupe por `origen_id` (slug) con tope de 300
  markers; el drawer titula para ambos origenes.
- `api/pagina-destino.js` (+12/-5): PROBLEMA 4 - el hero pasa de 3 a 12
  miniaturas (`HERO_THUMBS_MAX=12`, `slice(1, HERO_THUMBS_MAX + 1)`), la query
  de `destinos_fotos` sube `LIMIT 12 -> 24` y el CSS `.prow` pasa de `flex` a
  `grid` responsivo (6 col desktop, 4 col `<=760px`), `.pth` sin `flex:1`.
- `galeria.html` (+161/-38): PROBLEMA 3 RE-ALCANZADO a este archivo (no a
  `comunidad.html`, que no tenia la seccion). Modo destino unificado: aviso
  "Tienes fotografias de tu viaje?...", `<input type="url">` + boton que hace
  `POST /api/interacciones {tipo:'foto', usuario_id, destino_id, url}`, grid
  unico "Fotos del destino" usando `incluir=viajeros` (`items[]` del endpoint,
  con fallback a `fotos[]`+`usuarios[]`). Se elimino `gSeedCard` y la seccion
  `#g-dest-usuarios`.

**Decisiones de producto (usuario, 2026-09-16):** P2 (tab audiovisual de "Mi
Viaje Personal") OMITIDO; P3 aplicado en `galeria.html`, no en `comunidad.html`;
H-1 RESTRICTIVO confirmado; H-2 registrado como BUG-061 (no corregido aqui).

**Verificacion:** `node --check` OK en `api/interacciones.js`,
`api/pagina-destino.js` e `index-api-connector.js`; ASCII-safety 0 bytes >127 en
los 3; `node scripts/smoke_auditoria_pagina_destino.js` ->
`TODOS LOS SMOKE TESTS PASARON (54 checks)`.

#### Que sigue
1. **Commit + push + deploy en un solo release** de TSK-106 junto con los
   pendientes previos sin commitear (TSK-095..TSK-105 + migraciones 015/016/017/018).
2. **NO mezclar en ese commit los 3 archivos borrados ajenos a TSK-106:**
   `PROMPT.md`, `prompt_exploraco_tsk104.md` y `promptarreglos.txt`.
3. **Corregir H-2 (BUG-061):** `POST /api/interacciones` `tipo='foto'` debe
   validar sesion (`validarSesion`/JWT) en vez de confiar en `body.usuario_id`.
   Escalado a `sql-security`.
4. **Verificacion post-deploy:** pins de album + destino en el mapa cultural
   (con y sin sesion), drawer con el material propio del usuario, galeria del
   destino con 12 miniaturas en el hero (slug con mas de 12 fotos, ej.
   hostal-r10) y compartir foto desde `galeria.html`.
5. **Posible auto-recarga de `galeria.html` al iniciar sesion:** hoy
   `G.usuarioId` se resuelve en `gInit()`; si el usuario inicia sesion despues
   de cargar la pagina, el aviso puede no habilitarse hasta recargar.
6. **Confirmar el breakpoint movil del grid del hero (`.prow`):** el corte es
   `<=760px` (6 -> 4 columnas); validar en pantallas intermedias.
7. **H-3 (no bloqueante):** `scripts/smoke_auditoria_pagina_destino.js` IGNORA
   el slug de `process.argv` (el prompt proponia correrlo con `hostal-r10`);
   candidato a aceptar el slug y validar la ficha real.

#### Riesgos activos
- **Deploy pendiente:** la capa multimedia por usuario, los 12 thumbs del hero
  y la galeria unificada de `galeria.html` no estan en produccion hasta el
  commit/push/deploy.
- **BUG-061 (seguridad, MEDIA):** `tipo='foto'` es suplantable mientras no se
  valide la sesion; la UI nueva de `galeria.html` lo expone. Escalado a
  `sql-security`.
- **H-3:** el smoke de la ficha no prueba el slug real pasado por argumento;
  cobertura efectiva menor a la que sugiere el comando del prompt.
- **P2 omitido:** el tab audiovisual de "Mi Viaje Personal" queda como deuda de
  producto (no existe); la capa multimedia por usuario se valida solo en el
  mapa cultural.

### Sesion TSK-105 "Lote promptarreglos" - galeria unificada de destino + arreglos de DM, galeria, popover, visita y album (2026-09-16) - ADR-030

Tarea TSK-105 implementada y verificada en working tree (SIN commitear), Escudo
GOLD limpio. La decision vive en `DECISIONS.md` ADR-030; la tarea en
`TASKS.md` TSK-105; los bugs en `BUGS_HISTORICOS.md` BUG-055..BUG-060. NO hay
migraciones NUEVAS ni archivos nuevos en `api/` (8/8 intacto, ADR-001). El spec
de origen vive en `docs/superpowers/specs/2026-09-15-galeria-unificada-destino-design.md`.

**Cambios (verificados contra archivo real, ADR-006):**
- `api/interacciones.js` (271 lineas cambiadas; header real sigue **v14**, los
  comentarios nuevos se rotulan `v16` sin bloque de changelog -> deuda menor):
  - **BUG-055:** `dm_hilos` castea `m.usuario_id::text<>$1`,
    `m2.usuario_id::text=$1` y `bloqueador_id::text=$1 OR bloqueado_id::text=$1`
    (L2937-2939, L2962) para resolver `SQLSTATE 42P08` (el parametro `$1` se
    comparaba contra `split_part()` text y columnas uuid a la vez).
  - **BUG-060:** helper `queryConAvatarFallback` (L2114) que ante `42703`
    (`usuarios.foto_url` ausente) reintenta con `COALESCE(u.avatar_url,'')` en
    `museo_publico` (L2760), `album_detalle` (L3382/L3394) y `galeria_destino`
    (`gdUsuarios`/`gdViajeros`, L3499/L3542). Nunca silencia: re-lanza cualquier
    otro codigo.
  - **ADR-030:** `tipo=galeria_destino` gana `incluir`/`usuario_id` e `items[]`
    aditivo (solo se emite con `incluir`); 403 `ALBUM_AJENO` (L5143) y 400
    `AUTOR_ORIGINAL_INVALIDO` (L5181) en `album_agregar_foto`; `album_voto` llama
    `repartirXpReferidos` (L5237).
- `api/pagina-destino.js` (197 lineas cambiadas): UNA sola `#galeria`
  (miniaturas curadas + "Fotos de viajeros" `#fp-grid` + `#fp-upload`, ancla
  legacy invisible `<span id="fotos">`); `secComoLlegar` (L1810) fusiona
  `secTransporteHostal` + `secMapa` (id="como-llegar", una sola entrada de
  subnav, ancla legacy `#mapa`); UI "Guardar en album" (`abrirAlbumPopover`);
  helper `galEsc()` (L2379) que escapa HTML (cierra un XSS preexistente del
  inline); fix de `cerrarPopoverGuardar` (L2298) y `toggleMapaDest` (L2347)
  (BUG-057).
- `api/admin-destinos.js` (71 lineas cambiadas) y `api/utilidades.js` (59):
  semantica REPLACE de `destinos_fotos` (dedupe por url + DELETE + reinsert,
  helper `normFotosGaleria` L43-60) con guard anti-perdida (lista vacia -> 400 y
  NO borra; BUG-056); `admin.html` (8 lineas) elimina la doble escritura de la
  galeria.
- `api/usuarios.js` (27 lineas cambiadas): fallback de avatar en
  `perfil_publico` (BUG-060).
- `usuario-session.js` (127 lineas cambiadas): "Estuve aqui" solicita
  `GET ?tipo=geo_nonce_solicitar` (L649-665), envia `Authorization: Bearer` +
  `nonce`, maneja 401 con `refreshJwt` y reintenta UNA vez con nonce nuevo
  (L698-767); `obtenerUbicacion` (L602-647) distingue codigos 1/2/3 y reintenta
  con baja precision ante 2/3. **Cierra BUG-036.**
- `scripts/smoke_auditoria_pagina_destino.js` (56 lineas cambiadas): pasa a
  **54 checks** (modulo unificado siempre visible).
- NUEVOS sin versionar: `scripts/apply_004_foto_url.js` (aplica la migracion
  004; causa raiz del 503) y `scripts/dedupe_destinos_fotos.js` (backup + borra
  duplicados + `CREATE UNIQUE INDEX idx_destinos_fotos_destino_url`).

**Decisiones de producto (revisadas por architect-review):** NO se votan fotos
curadas en este MVP (no se creo `foto_curada_voto`; `tipo_voto=null` para
curadas) porque `destinos_fotos.id` NO es estable (el REPLACE lo re-crea); se
vota solo viajeros (`foto_voto`) y album (`album_voto`). `origen='album'`
(album_fotos por cercania) queda APAGADO por defecto (solo con
`incluir=albumes`). `items[]` solo se emite si el cliente envia `incluir`
(protege a `galeria.html`). El modulo unificado se muestra SIEMPRE. El
`autor_original_id` null lo normaliza `album_agregar_foto` con `|| usuarioId2` y
el dedup se hace por SELECT.

**Verificacion:** `node scripts/smoke_auditoria_pagina_destino.js` ->
`TODOS LOS SMOKE TESTS PASARON (54 checks)`; `node --check` OK en los `api/*.js`
tocados; helper `galEsc` cierra el XSS del inline; `git diff --stat` = 8
archivos, +649/-167.

#### Que sigue
1. **APLICAR la migracion 004 en Neon (BLOQUEANTE, lo ejecuta Javier; requiere
   `DATABASE_URL`):** `node scripts/apply_004_foto_url.js` (`usuarios.foto_url` +
   `ciudad_base`; idempotente). Cierra de raiz el BUG-060.
2. **Ejecutar el dedupe + indice unico (BLOQUEANTE):** `node
   scripts/dedupe_destinos_fotos.js --apply` (backup + borra duplicados +
   `CREATE UNIQUE INDEX idx_destinos_fotos_destino_url`). Cierra al 100% el
   BUG-056.
3. **Commit + push + deploy en un solo release** (esta entrega + los pendientes
   previos sin commitear de TSK-095..TSK-104 y las migraciones 015/016/017/018).
   Incluir el bump del header `v14` -> `v16` de `api/interacciones.js` si se
   decide mantener el rotulo.
4. **Verificacion post-deploy en vivo:** `dm_hilos` 200; "Estuve aqui" completa
   con nonce + Bearer; el popover Guardar conserva los checkboxes; la galeria no
   repite fotos; voto viajeros/album y "Guardar en album" (403 `ALBUM_AJENO` con
   album ajeno); sin 503 en museo/galeria/albumes/perfil publico; "Como llegar"
   con transporte + mapa en una sola seccion.

#### Riesgos activos
- **Migracion 004 pendiente (BLOQUEANTE):** sin aplicarla, `usuarios.foto_url`
  no existe; la degradacion mantiene las rutas en 200 pero el avatar cae siempre
  a `avatar_url` y `ciudad_base`/autor de blog quedan inutilizables (BUG-060).
- **Datos duplicados de galeria pendientes (BLOQUEANTE para el cierre):** el
  codigo ya no duplica, pero las filas historicas de `destinos_fotos` siguen
  repetidas y el indice unico no existe hasta correr el script (BUG-056).
- **Header de version desalineado:** `api/interacciones.js` sigue en `v14`
  mientras los comentarios nuevos dicen `v16`; deuda documental a resolver en el
  commit (ADR-006).
- **Voto de fotos curadas fuera del MVP:** recorte explicito; requiere un ancla
  estable futura (no `destinos_fotos.id`).


> **Historico: sesiones del 2026-09-15 y anteriores (TSK-104 y previas, mas hotfixes), incluidos los bloques 2026-09-12..15, las Fases 6-9 y los bloques de Sprint 2-7, movidas a NEXT_ARCHIVO.md.**
