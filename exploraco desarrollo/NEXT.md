# NEXT.md - ExploraCO

Documento de relevo tecnico (AI-DOS Cap. 9.4). Debe permitir que cualquier IA continue el proyecto sin depender del historial de chat.

## Completado reciente
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

### Hotfix "login 500 por SQL invalido en el merge de `device_hashes`" (2026-09-15) - BUG-054

Hotfix implementado y verificado en working tree (SIN commitear). El detalle
del bug vive en `BUGS_HISTORICOS.md` BUG-054; la nota de cierre en
`TASKS.md` TSK-104 (seccion "Hotfix posterior"). No hay migraciones nuevas,
archivos nuevos en `api/` ni cambios de version en otros endpoints;
presupuesto 8/8 intacto (ADR-010).

**Sintoma reportado por Javier:** `POST /api/usuarios` (upsert de
login/registro) devolvia 500 para TODOS los logins. Error real reproducido
en produccion (Postgres/Neon): `column "t.ord" must appear in the GROUP BY
clause or be used in an aggregate function` (SQLSTATE 42803).

**Causa raiz:** el merge de `device_hashes` en `api/usuarios.js` (bloque del
upsert) usaba `SELECT COALESCE(jsonb_agg(t.h), '[]'::jsonb) FROM (...) t
ORDER BY t.ord LIMIT 5`: un `ORDER BY` externo junto al agregado `jsonb_agg`
SIN `GROUP BY` es invalido en Postgres. Introducido en el commit `7cc28fe`
("sistema de puntos", 2026-09-14), PREVIO a TSK-104; lo expuso el re-upsert
forzado por el fix de sesion (BUG-053), porque `usuario-session.js` envia
SIEMPRE `device_hash`.

**Cambios (verificados contra archivo real, ADR-006):**
- `api/usuarios.js` (+30/-14; header `v13` -> `v14`, L2): la consulta pasa a
  `jsonb_agg(h ORDER BY ord)` con el `ORDER BY` DENTRO del agregado y la
  subconsulta interna `u ORDER BY u.ord LIMIT 5` (L987-1000); el UPDATE queda
  en un `try/catch` (L986/L1001-1005) que loguea con `console.error` y NO
  re-lanza: el fingerprint es best-effort (anti-Sybil) y NUNCA debe bloquear
  el login/registro.

**Verificacion:** `node --check` OK; ASCII/backticks/doble-escape 0/0/0;
simulacion runtime con mock `sql`/`neon` 15/15 PASS (200 con `device_hash`, y
200 incluso si el UPDATE del fingerprint falla); sin regresion en
A1/`verificar_usuario`/`total`; el patron invalido ya no aparece en
`api/*.js`.

#### Que sigue
1. **PENDIENTE OPERATIVO (BLOQUEANTE, login roto en produccion): commit +
   push + deploy del hotfix en un solo release** con los pendientes previos
   (TSK-095..TSK-104 y las migraciones 015/016/017/018). Mientras no se
   despliegue, TODO login/registro que envie `device_hash` sigue en 500.
2. **Verificacion post-deploy:** un login real que envie `device_hash`
   responde 200; confirmar que `POST /api/usuarios` no devuelve 500 y que el
   error 42803 no aparece en los logs de la funcion.
3. **Deuda futura (menor, no bloqueante):** el merge solo excluye el hash
   entrante `$1` y no deduplica duplicados heredados de `device_hashes`.

#### Riesgos activos
- **Deploy pendiente (CRITICO):** en produccion el login sigue roto (500)
  hasta el commit/push/deploy.
- **Deuda de dedup de `device_hashes`:** solo se excluye el hash entrante;
  los duplicados heredados no se limpian (menor, no afecta el login).

### Bugfix de sesion "refrescarSesion() pisaba la sesion con la proyeccion publica" (2026-09-15) - regresion colateral de BUG-049 (TSK-103 / ADR-028)

Bugfix implementado y verificado en working tree (SIN commitear). El detalle
del bug vive en `BUGS_HISTORICOS.md` BUG-053; la nota de cierre en
`TASKS.md` TSK-104 (seccion "Bugfix posterior"). No hay migraciones nuevas ni
archivos nuevos; presupuesto 8/8 intacto (ADR-010).

**Sintoma reportado por Javier:** la cuenta `brsk84@gmail.com` tenia
`email_verificado = TRUE` en Neon, pero `mi-perfil.html` seguia mostrando el
banner "Verifica tu email" y bloqueaba referidos, facciones, casa y DM.

**Causa raiz (confirmada por QA):** `GET /api/usuarios?id=UUID` nunca devuelve
`jwt` y, con JWT faltante/expirado, responde la proyeccion publica SIN
`email`/`auth_id`/`jwt`/`email_verificado` (`api/usuarios.js`, L500-529;
introducido por el fix de PII de BUG-049 / ADR-028). Las dos
`refrescarSesion()` REEMPLAZABAN `window.ExploraCO.usuario`
(`usuario-session.js`, L1092 y `mi-perfil.html`, L854), descartando
`jwt`/`auth_id`/`email`/`email_verificado`.

**Cambios (verificados contra archivo real, ADR-006):**
- `usuario-session.js` (+21/-4): `refrescarSesion()` fusiona
  (`Object.assign({}, actual, d.data)`) en vez de reemplazar, conserva
  `jwt`/`jwt_expira_en` y, ante la proyeccion publica (respuesta sin `email`),
  no pisa la sesion y dispara `window.ExploraCO.refreshJwt()`.
- `mi-perfil.html` (+19/-4): mismo patron; ante la proyeccion publica llama
  `renovarJwt()` y re-renderiza. `git diff --stat` = 2 archivos, +32/-8.

**Verificacion:** `node --check` OK en ambos; delta ASCII 0 en el bloque
nuevo; balance de divs de `mi-perfil.html` 0; `smoke_017_perfil_arbol_casas.js`
73/73 PASS; `smoke_016_multinivel_crowdsourcing.js` 39/39 PASS; sin recursion.

#### Que sigue
1. **Commit + push + deploy** del bugfix junto con los pendientes previos
   (TSK-095..TSK-104) y el hotfix de login BUG-054 en un solo release.
2. **Verificacion post-deploy:** la cuenta `brsk84@gmail.com` deja de mostrar
   el banner y quedan habilitados referidos/facciones/casa/DM.
3. **Re-login del usuario afectado** si su `localStorage` ya perdio
   `auth_id`/`email` (la sesion publica cacheada no permite reconstruir el JWT
   sin re-autenticar).
4. **Deuda QA no bloqueante** (preexistente, NO de este fix):
   `scripts/smoke_test_perfil_progreso.js` espera 22 misiones vs 36 reales;
   `scripts/smoke_test_epic_prompt.js` espera VOCACIONES 3 vs 4 y
   `chat_salas` plan vs plan+dm. Ver observacion al final de BUGS_HISTORICOS.md.

#### Riesgos activos
- **Deploy pendiente:** el fix no esta en produccion hasta el commit/push;
  en produccion el banner sigue apareciendo para cuentas verificadas.
- **localStorage del usuario afectado:** si perdio `auth_id`/`email`, el
  auto-recupero (`refreshJwt`/`renovarJwt`) no puede operar; requiere re-login.
- **Deuda QA de smokes preexistentes:** no bloqueante; los smokes citados
  fallan por expectativas desactualizadas, no por el codigo.

### Sesion TSK-104 "Verificacion admin forzada + dashboard real (5 tarjetas) + filtro de verificados" (2026-09-15) - ADR-029

Tarea TSK-104 implementada y verificada en working tree (SIN commitear), Escudo
GOLD PASS. La decision vive en `DECISIONS.md` ADR-029; la tarea en
`TASKS.md` TSK-104. NO hay migraciones nuevas ni archivos nuevos en `api/`
(8/8 intacto, ADR-010). El prompt de origen declaraba la migracion 016 como
"pendiente" por error: 016/015 ya estaban aplicadas (confirmado contra
NEXT.md/ADR-028/`docs/DEPLOY_017.md`, ADR-006).

**Cambios (verificados contra archivo real, ADR-006):**
- `api/usuarios.js` v9 -> v13 (+45/-6; header real HOY v14 por el hotfix
  BUG-054, ver seccion "Hotfix login 500"): A1 auto-verificacion del admin en el
  upsert (columna `email_verificado` en el INSERT y `ON CONFLICT ... COALESCE(
  usuarios.email_verificado,false) OR EXCLUDED.email_verificado`; condicion
  `email.toLowerCase()==='brsk84@gmail.com' || nombre.toLowerCase()==='javier'`);
  A2 rama POST `tipo=verificar_usuario` admin-only via `esAdminUsuario`
  (401/400/404, `UPDATE ... RETURNING`); C1 `total` aditivo en GET
  `?tipo=leaderboard`. Nota: el header habia quedado en v9 pese a que el
  changelog ya documentaba v10-v12 de TSK-103.
- `api/utilidades.js` v2 (+24/-0): rama admin-only GET `?tipo=visitas_global`
  -> `{ ok, total, v30, v7 }` sobre `interacciones tipo='visita' AND activo=true`.
- `admin.html` (+42/-8): fila verde + badge `VERIF` para `p.verificado`; filtro
  "Verificados" (`data-verified`, `currentVerifiedFilter`, `setVerifiedFilter()`
  y condicion en `filtered`); `ds-usuarios` real desde leaderboard `total`;
  `ds-visitas` real desde `visitas_global`; 5a tarjeta `ds-verificados`; CSS
  `.stats-grid` a `repeat(5,1fr)`; fix post-sync: `syncFromNeon()` re-renderiza
  el dashboard si la pantalla esta activa (evita tarjetas en 0 en navegador
  limpio).

**Decisiones de producto (Javier, 2026-09-15):** migracion 016 ya aplicada (el
prompt la declaraba pendiente por error); C2 resuelto con la rama
`visitas_global`; dashboard de 5 tarjetas; filtro "Verificados" + badge; A2 usa
`esAdminUsuario` + 401 (el prompt sugeria 403); conteo de viajeros como campo
aditivo `total` en el leaderboard.

**Verificacion:** Escudo GOLD PASS (sintaxis, ASCII-safety de lo nuevo, balance
de divs); `git diff --stat` = 3 archivos, +105/-14. Las lineas nuevas de
`api/utilidades.js` aportan 0 no-ASCII y 0 backticks (baseline preexistente
aparte, H8).

#### Que sigue
1. **APLICAR `db/migrations/017_perfil_publico_arbol_casas.sql` EN NEON
   (BLOQUEANTE, lo ejecuta Javier).** Prerrequisito: 016/015 ya aplicadas.
2. **Aplicar DESPUES `db/migrations/018_consumibles_categorias.sql`** (la 017
   agrega `consumibles.categoria`; la 018 solo la reparte).
3. **Commit + push + deploy en un solo release** (incluye los pendientes
   previos sin commitear de TSK-095..TSK-103 y las migraciones 015/016/017/018).
4. **Verificacion post-deploy:** A1 (cuenta admin `email_verificado=true`),
   A2 (Bearer marca/desmarca; sin Bearer 401; UUID inexistente 404), C1/C2/C3/C4
   (5 tarjetas con datos reales y sin quedar en 0 en navegador limpio), B/B3
   (fila verde + badge + filtro "Verificados").

#### Riesgos activos
- **Migraciones 017/018 pendientes (BLOQUEANTE, heredado de TSK-103):** sin la
  017, Arbol, Casas, DM y `consumibles.categoria` fallan por esquema
  inexistente; sin la 018, la tienda queda con los 17 consumibles en `general`.
- **H4 (riesgo aceptado):** cualquier usuario registrado con nombre `javier`
  queda auto-verificado; vector de integridad a revisar.
- **H6:** el leaderboard es publico y ahora expone `total` (conteo de usuarios)
  sin Bearer.
- **H7:** `verificar_usuario` con `usuario_id` no-UUID devuelve 500 en vez de
  400.
- **H8 (preexistente):** deuda de `api/utilidades.js` (catch vacio + baseline
  no-ASCII 680 bytes + 24 backticks); no atribuible a TSK-104.

### Sesion TSK-103 "Perfil publico museo + DM + Arbol de 16 ramas + Casas + categorias de consumibles" (2026-09-15) - ADR-028

Entrega TSK-103 implementada y verificada en working tree (SIN commitear). El
checklist de despliegue vive en `docs/DEPLOY_017.md`; la decision en
`DECISIONS.md` ADR-028; la tarea en `TASKS.md` TSK-103. Cinco features de
producto + 5 regresiones (R-1..R-5) + 4 fixes adicionales, todo SIN archivos
nuevos en `api/` (8/8 intacto, ADR-010).

**Cambios (verificados contra archivo real, ADR-006):**
- `db/migrations/017_perfil_publico_arbol_casas.sql` (NUEVA, 12.013 bytes,
  aditiva e idempotente ADR-008): columnas `usuarios.intereses`, `pais_base`,
  `casa`, `casa_elegida_en`, `progreso_arbol`, `perfil_config`,
  `perfil_publico`, `dm_abierto`; `consumibles.categoria`;
  `chat_salas.clave_dm`; CHECK `chk_usuarios_casa` y `chk_chat_salas_tipo`
  (elimina antes `chat_salas_tipo_check` legacy); indices DM y de usuario;
  tabla NUEVA `usuario_bloqueos`.
- `db/migrations/018_consumibles_categorias.sql` (NUEVA, 5.281 bytes):
  categoriza 17 consumibles (perfil 7 / impulso 3 / social 4 / coleccion 2 /
  general 1). Presupone la 017 aplicada.
- `api/usuarios.js` v12: `GET perfil_publico` ligero, blindaje PII owner-aware
  en `GET ?id=` (sin email/tokens/`device_hashes`/`codigo_referido`),
  `?buscar=` admin-only, `referido_codigo` con JWT; `casa_elegir` +
  `casa_ranking`; `perfil_actualizar` (alias `perfil_editar`).
- `api/interacciones.js` v15: `museo_publico`; DM completo; `arbol_catalogo` /
  `arbol_usuario` / `rama_activar` (RAMAS 16x5, `RAMA_TIERS [0,100,250,450,700]`);
  `consumibles?categoria=`; Origen derivado (local/nacional/extranjero con
  bono x1.2 dentro de `D_R`); 8 misiones `perfil`.
- `api/admin.js`: `categoria` en `consumibles_lista`/`crear`/`editar`.
- `api/utilidades.js`: `/registro.html` y `/perfil.html` en `STATIC_PAGES`.
- Frontend: `perfil.html` y `registro.html` (NUEVOS), `mi-perfil.html`
  (Mi Red con QR/codigo/enlace, bandeja DM, Arbol SVG, 7 pestanas, "Completa
  tu perfil", selector de Casa, tienda por chips), `comunidad.html` (R-4),
  `index.html` (R-5), `usuario-session.js` (captura `?ref=` con TTL 30d +
  `loginConEmail` con `codigo_referido` + JWT en refresco).
- Fixes: R-1 (`registro.html`), R-2 (`?ref=`), R-3 (`mi-perfil?id=`),
  R-4 ("Control Territorial"), R-5 (relabel Pandilla->Parche); adicionales:
  fuga de PII preexistente, carrera del cobro del DM, `museo_publico`
  404->503 tipificado, `casa_ranking`/`exp_ocultos` sin filtrar `activo=true`.

**Verificacion (ADR-006):** existen 017, 018, `perfil.html`, `registro.html`,
`docs/DEPLOY_017.md` y `scripts/verify_017_precheck.js`; headers reales
`api/usuarios.js` v12 e `api/interacciones.js` v15; `api/utilidades.js` con
las 2 paginas en `STATIC_PAGES`; `api/admin.js` con `categoria`. El smoke
`scripts/smoke_017_perfil_arbol_casas.js` **esta ENTREGADO y en verde (73/73
PASS)**; evidencia: `node scripts/smoke_017_perfil_arbol_casas.js` ->
`73/73 PASS` (verificado 2026-09-15). Ya no hay smoke de cierre pendiente.

#### Que sigue
1. **APLICAR `db/migrations/017_perfil_publico_arbol_casas.sql` EN NEON
   (BLOQUEANTE, lo ejecuta Javier antes del deploy).** Prerrequisito: 016/015
   ya aplicadas.
2. **Aplicar DESPUES `db/migrations/018_consumibles_categorias.sql`** (la 017
   agrega `consumibles.categoria`; la 018 solo la reparte).
3. **Smoke de cierre ENTREGADO y en verde** (`node
   scripts/smoke_017_perfil_arbol_casas.js` -> `73/73 PASS`, 2026-09-15); no
   es pendiente.
4. **Commit + push + deploy en un solo release** (esta entrega + los
     pendientes previos sin commitear: TSK-095 a TSK-104 y las migraciones
   015/016/017/018; ver `git status`).
5. **Verificacion post-deploy en vivo:** perfil publico sin PII, DM (hilo
   nuevo con cobro 20 XP, bloqueo 403), Arbol (activar nodo nivel 5, bono de
   mision), Casas (elegir + ranking), tienda por categorias y `?ref=`
   capturado en `registro.html`.
6. **Deuda registrada (patron BUG-021):** columnas no versionadas
   `interacciones.activo`, `usuarios.bio` y `usuarios.activo`; solo se
   documentan, no se corrigen aqui.

#### Riesgos activos
- **Migraciones 017/018 pendientes (BLOQUEANTE):** sin la 017, el Arbol, las
  Casas, el DM y `consumibles.categoria` fallan por esquema inexistente; sin
  la 018, la tienda queda con los 17 consumibles en `general`.
- **Orden de migraciones:** la 018 presupone `consumibles.categoria` creada
  por la 017; invertirlas deja el reparto sin efecto.
- **Smoke de cierre (RESUELTO):** `scripts/smoke_017_perfil_arbol_casas.js`
  paso de "en elaboracion" a ENTREGADO y en verde 73/73 PASS (2026-09-15);
  ya no es un riesgo activo.
- **Deuda de columnas no versionadas (patron BUG-021):** `interacciones.activo`
  y `usuarios.bio`/`usuarios.activo` existen en Neon fuera de toda migracion;
  cualquier `DROP`/recreacion de esquema debe considerarlas.
- **Drift de XP por el bono x1.2 / `D_R` derivado:** mismo riesgo residual ya
  documentado en ADR-024/ADR-027 (sin ledger).

### Sesion Entrega 016 "ExploraCO Gaming v5.0" - piramide, Wayfarer, facciones y mundo artistas (2026-09-14) - TSK-101 / ADR-027 + ADR-025

Entrega 016 implementada y verificada en working tree (SIN commitear). El
checklist de despliegue vive en `docs/DEPLOY_016.md`; las decisiones en
`DECISIONS.md` ADR-027 (piramide + crowdsourcing + facciones + mundo
artistas) y ADR-025 (sesion firmada / anti-Sybil, que consume el candidato
reservado desde ADR-024); la tarea en `TASKS.md` TSK-101.

**Cambios (verificados contra archivo real, ADR-006):**
- `db/migrations/016_multinivel_crowdsourcing.sql` (NUEVA, 209 lineas,
  idempotente ADR-008, ASCII-safe): 10 columnas en `usuarios`
  (`referido_por`, `codigo_referido`, `xp_ref_total`,
  `referidos_directos_contados`, `faccion` con CHECK de 4 facciones,
  `faccion_elegida_en`, `email_verificado`, `email_token`,
  `email_token_expira`, `device_hashes`), 4 tablas (`activos_ocultos`,
  `activos_ocultos_votos`, `activos_ocultos_checkins`, `geo_nonces`) y 8
  indices. Idempotencia DDL 13/13.
- `api/usuarios.js` (v9): piramide de referidos (codigo, red CTE 5
  niveles, `?ref=` con topes 500/20, reparto 10/5/3/2/1 FLOOR en
  `xp_ref_total`), 4 facciones (primera gratis, cambio 500 `xp_total` +
  cooldown 15 dias), verificacion de email (Resend), JWT HMAC
  (`firmarSesion`, `SESSION_JWT_SECRET`) y `device_hashes`.
- `api/interacciones.js` (v13): helper `repartirXpReferidos` (CTE
  recursiva) en 14 puntos de XP real (excluye `admin_xp` y
  `comprar_consumible`); Wayfarer Activo Oculto completo (proponer sin
  nivel pero con email verificado, votar nivel 5, quorum +/-3, 30 dias
  derivado, +50/+5/+15 XP, checkin reusa geocerca ADR-024 + nonce);
  `validarSesion` (JWT `timingSafeEqual`) en visita/votar/checkin; nonce
  en visita y checkin; vocaciones en bloque nivel 5
  (musico/cine/artista_grafico/escritor) y 6 misiones de artista.
- `api/admin.js`: rama `activo_oculto_moderar` (Bearer admin) -- aprobar
  +50 XP al proponente con reparto piramidal, rechazar sin XP, borrado
  logico (`activo=false`).
- Frontend: `mi-perfil.html` (Mi Red + QR + selector de facciones + panel
  de vocaciones + banner de verificacion), `comunidad.html` (relabel
  visible Pandilla->Parche solo en texto + seccion Activo Oculto + ranking
  de facciones), `admin.html` (panel de moderacion de Activos Ocultos),
  `usuario-session.js` (catalogo de vocaciones nivel 5, fingerprint de
  dispositivo, JWT + refresh silencioso).
- Config/gobernanza: `.gitignore` corregido (filtra `.env`, `.env.local`,
  `.env.*.local`; conserva `!.env.example`), `.env.example` (NUEVO,
  plantilla), `docs/DEPLOY_016.md` (NUEVO, checklist de 5 pasos).

**Verificacion (Escudo GOLD, 2026-09-14):** smoke dedicado
`scripts/smoke_016_multinivel_crowdsourcing.js` **39/39 PASS** (ejecutado en
esta sesion documental, salida "SMOKE 016 MULTINIVEL: OK"); `node --check`
PASS x3; ASCII 0 bytes >127 y 0 backticks; balance de divs 0; idempotencia
DDL 13/13. Presupuesto de endpoints **8/8 INTACTO** (8 archivos en `api/`,
cero altas; todo como ramas `tipo=` y helpers, ADR-010).

#### Checklist de deploy (`docs/DEPLOY_016.md`, en orden)
1. **Aplicar la migracion 016 en Neon** (editor SQL, archivo COMPLETO en una
   corrida; idempotente). Verificar 10 columnas, 4 tablas y 8 indices con el
   bloque de diagnostico del propio `.sql`.
2. **Configurar variables en Vercel:** `SESSION_JWT_SECRET` (generar
   aleatorio fuerte distinto de cualquier otro; el fallback `dev_secret` es
   inseguro), `RESEND_API_KEY` y `SITE_URL`; confirmar `DATABASE_URL` y
   `ADMIN_SECRET` reales; NO configurar `DEV_EMAIL_ECHO` en produccion.
3. **Desplegar en UN SOLO release:** `api/usuarios.js` v9 +
   `api/interacciones.js` v13 + `api/admin.js` juntos y con el MISMO
   `SESSION_JWT_SECRET` (si difiere, las llamadas de sesion devuelven 401).
4. **Verificacion en vivo:** registro con `?ref=`, verificacion de correo,
   eleccion/cambio de faccion, proponer/votar/checkin de Activo Oculto,
   moderacion admin (+50 XP al aprobar) y sesion JWT (token alterado 401).
5. **Rollback:** revertir variables y redeploy. La migracion 016 es ADITIVA
   (no requiere downgrade); el codigo viejo ignora las columnas nuevas.

#### Que sigue
1. **APLICAR `db/migrations/016_multinivel_crowdsourcing.sql` EN NEON
   (BLOQUEANTE, lo ejecuta Javier antes del deploy).** Prerrequisito
   declarado en `docs/DEPLOY_016.md`: migraciones 010-015 ya aplicadas.
   **Verificar el estado de la 015** (`db/migrations/015_epic_prompt.sql`):
   este documento la seguia listando como pendiente en la sesion TSK-100;
   ADR-006 exige confirmar contra Neon antes de asumir el prerrequisito.
2. **Configurar `SESSION_JWT_SECRET` y `RESEND_API_KEY` en Vercel** (y
   `SITE_URL`); un secreto distinto por funcion rompe el contrato de sesion.
3. **Commit + push + deploy manual** en un solo release (esta entrega +
   los pendientes previos sin commitear: TSK-095/096/097/098/099/100 y las
   migraciones 015/016; ver `git status`).
4. **Verificacion post-deploy en vivo** segun el Paso 4 del checklist.
5. **Drift documental registrado:** `scripts/validate_ficha.js` no existe en
   esa ruta (el real es
   `.opencode/skills/gemini-research/scripts/validate_ficha.js`);
   documentado en BUGS_HISTORICOS.md BUG-034, sin crear el script.
6. **Flujos ROTO del frontend (documentados en esta consolidacion, requieren
   codigo):** (a) **BUG-035** -- el QR/enlace de referidos apunta a
   `/registro.html?ref=<codigo>` (`mi-perfil.html:1800`), pero `registro.html`
   NO existe y ningun frontend captura `?ref=` (`usuario-session.js:219-255`);
   el backend si lo soporta (`api/usuarios.js:461`). (b) **BUG-036** --
   `marcarVisitado` (`usuario-session.js:598-609`) no envia
   `Authorization: Bearer` ni `nonce`, que el backend v13 exige
   (`api/interacciones.js:4734-4741`) -> 401/400. Ademas BUG-037..BUG-043
   (severidad media/baja) quedan registrados como backlog de consistencia.

#### Riesgos activos
- **Migracion 016 pending (BLOQUEANTE):** sin ella, referidos, facciones,
  Activo Oculto y `geo_nonces` fallan (columnas/tablas inexistentes); el
  checkin de Activo Oculto y la sesion firmada degradan con error.
- **Prerrequisito 015 no verificado:** `docs/DEPLOY_016.md` asume 010-015
  aplicadas, pero NEXT.md/TSK-100 listaban la 015 como pendiente. Confirmar
  en Neon antes de correr la 016 (ADR-006).
- **`SESSION_JWT_SECRET` en fallback `dev_secret`:** si no se configura (o
  difiere entre funciones), los tokens de sesion son falsificables o las
  validaciones devuelven 401. Variable OBLIGATORIA antes de anunciar el
  release.
- **`RESEND_API_KEY` pendiente desde TASK-006:** sin ella, la verificacion
  de email devuelve 503 `EMAIL_NO_CONFIGURADO` y el gating por
  `email_verificado` (referidos, proponer/votar Activos, fundar Parche) no
  puede completarse.
- **Coherencia de relabel Pandilla->Parche:** es solo texto visible; la API
  y el esquema siguen usando `pandillas*`. No confundir en futuras busquedas.
- **Drift `validate_ficha.js` (BUG-034, NO bloqueante):** BLUEPRINT.md,
  ADR-016 y 2 skills citan `scripts/validate_ficha.js`, que no existe en esa
  ruta; el archivo real es
  `.opencode/skills/gemini-research/scripts/validate_ficha.js`.
- **Frontend ROTO ya implementado en produccion logica (BUG-035/BUG-036):** los
  dos flujos de mayor impacto de la Entrega 016 (referidos y visita
  presencial) no son usables desde la UI pese a que el backend esta completo;
  sin el fix de codigo, el release de la 016 no habilita esas features a los
  usuarios. Resto de hallazgos (BUG-037..BUG-043) son consistencia/cosmetico.

### Sesion epic prompt.txt - perfil museo, vocaciones, chat por plan y XP admin (2026-09-13) - TSK-100 / ADR-026

Epic completo de 7 features + 2 bugs implementado en working tree (SIN commitear),
Escudo GOLD verde en todos los archivos. La spec vive en
`docs/superpowers/specs/2026-09-13-epic-prompt-vocaciones-chat-perfil-design.md`; la decision en
`DECISIONS.md` ADR-026; la tarea en `TASKS.md` TSK-100.

**Cambios (verificados contra archivo real, ADR-006):**
- `api/interacciones.js` v12 (4.547 lineas, header del epic en L75-83): BUG-A
  `contarComentarioSafe` (L1025) -- `album_detalle`, `galeria_detalle`, `mi_feed_fotos`
  degradan a 0 comentarios si la migracion 013 no existe; `comentarios_recientes` (admin)
  sigue exigiendola. BUG-B `coordsFallbackAutor` (L1045) -- `multimedia_mapa` hereda
  lat/lng/ciudad de la primera visita/guardado del autor con destino georreferenciado y
  descarta los que quedan sin coords (flag `coords_heredadas`). Chat por plan: GET
  `plan_chat` (sala+mensajes+miembros, gate miembro/creador 403, L1641-1678), POST
  `plan_chat_msg` (gate membresia + +2 XP tope 20/dia reusando chatXpDisponible/
  registrarChatXp, L2811-2850), `plan_crear` crea `chat_salas` tipo='plan' y liga
  `planes_viaje.sala_id` (L2736-2748); defensa: `chat_msg` POST rechaza salas de plan y
  `chat_mensajes` GET las excluye (L1595). POST `admin_xp` Bearer `ADMIN_SECRET`
  (L3274-3336): `{usuario_id, delta_xp}` o `{usuario_id, nivel}` 1-20 con Math.max
  (NO degrada), recalcula con `NIVELES_ADMIN = NIVELES_LOCAL`/`calcularNivelLocal`/
  `calcularEraLocal`/`BADGES_LOCAL`, `UPDATE ... ultimo_acceso=NOW()` (se corrigio
  `actualizado_en` -> `ultimo_acceso`, columna inexistente). Vocaciones: `VOCACIONES`
  (L181-188: musico@5/cine@8/artista_grafico@11 con habilidades[]), GET
  `vocaciones_catalogo`/`vocaciones_usuario`, POST `vocacion_activar` (toggle en
  `usuarios.vocaciones` jsonb, gate de nivel 403, L3343-3374). GET `planes`/`planes_mios`
  exponen `p.sala_id`.
- `api/usuarios.js` v8 (180 lineas): GET `?buscar=` (2+ chars, ILIKE, limit 20, pasa por
  conLogros/conMisiones/conNivel, L126-141) + columna `vocaciones` en SELECT *.
- `db/migrations/015_epic_prompt.sql` (NUEVA, 103 lineas, idempotente ADR-008, ASCII 0
  bytes >127): `usuarios.vocaciones jsonb NOT NULL DEFAULT '{}'`; `planes_viaje.sala_id
  uuid REFERENCES chat_salas(id)` (FK nullable sin CASCADE); `DELETE FROM chat_salas WHERE
  creador_id IS NULL AND nombre NOT IN ('Chat general','Bogota')` (solo quedan las 2 de
  sistema + las creadas por usuarios; CASCADE limpia sus mensajes); 3 consumibles nuevos
  con ON CONFLICT (clave): perfil_marco_dorado (700), perfil_tema_oscuro (500),
  perfil_banda_artista (900). PENDIENTE DE APLICAR por Javier tras el commit.
- `mi-perfil.html` (1.575 lineas): museo-line en hero (`#pf-museo-line`: trofeos·fotos·
  destinos con backfill), galeria de mejoras de perfil (3 consumibles `perfil_*`),
  seccion Vocaciones de artista (toggle/candado/403), chip "Sin mapa" en albumes sin
  lat/lng, CSS vitrina de trofeos. Divs 195/195.
- `comunidad.html` (1.850+ lineas): filtro defensivo de salas plan, modal privado "Chat
  del plan" (abrirPlanChat/enviarPlanChat/polling 5 s, L1058-1154), bloque "Niveles de
  chat" con 5 perks (chat@3, crear_chat@3, emojis_premium@7, sello_sala@10,
  moderador_chat@12), indicador "chat activo" con p.sala_id (L987-988), refactor
  compartido chatMsgsHTML/chatPollTick/enviarMensajeOpt. Divs 223/223.
- `admin.html` (7.183 lineas): tab "Jugadores" (snav-jugadores + showScreen('jugadores'),
  L1980-2039): buscador por nombre/email, tarjeta de jugador (nivel, XP, era, logros,
  vocaciones activas), sumar/restar XP y subir a nivel exacto 1-20 via POST admin_xp
  Bearer; refactor `_adminBuscarUsuarios` compartido con blogBuscarAutor. Divs 786/786.
- `usuario-session.js`: `emojis_premium@7`, `sello_sala@10` en CAPACIDADES_POR_NIVEL
  (L47-48) + catalogo `window.ExploraCO.vocaciones` (L59-87). `subirNivelTest` NO se creo
  (no hay helpers de test previos en el proyecto).

**Decisiones de producto (Javier, 2026-09-13):** vocaciones ACUMULABLES (no exclusivas);
mejoras de perfil v1 SOLO marco dorado/tema oscuro/banda de artista (vitrina extendida y
sello verificado a futuro); chat de plan PRIVADO solo miembros; admin XP = nivel exacto +
delta manual sin degradar; migraciones 011-014 YA aplicadas en Neon PRODUCCION
(2026-09-13) -- la 015 la aplica Javier tras el commit.

**Verificacion (Escudo GOLD, 2026-09-13):** `node --check` PASS en api/interacciones.js v12
y api/usuarios.js v8; ASCII 0 bytes >127; divs mi-perfil 195/195, comunidad 223/223,
admin 786/786. QA: smoke dedicado del epic ENTREGADO en `scripts/smoke_test_epic_prompt.js`
-- 50/50 PASS (ejecutado 2026-09-13, "SMOKE EPIC PROMPT: OK"), cubre vocaciones, admin_xp,
plan_chat/plan_chat_msg, contarComentarioSafe, coordsFallbackAutor, queries capturadas
sala_id/tipo!=plan, divs de los 3 HTML y la migracion 015.

#### Que sigue
1. **APLICAR `db/migrations/015_epic_prompt.sql` EN NEON (BLOQUEANTE, lo ejecuta Javier en
   el editor SQL de Neon tras el commit; idempotente, acumulativa; requiere haber aplicado
   la 008 y la 010).** Sin la 015: `vocacion_activar`/`vocaciones_*` fallan (columna
   `usuarios.vocaciones` inexistente), `plan_crear` falla al ligar la sala (`planes_viaje.
   sala_id` inexistente) y las salas extra del sistema siguen en produccion.
2. **Commit + push + deploy manual** del working tree completo (incluye los pendientes de
   TSK-095/096/097/098/099 y la migracion 015).
3. **Verificacion post-deploy en vivo:** vocaciones end-to-end (toggle + 403 por nivel),
   admin_xp niveles 1-20 sin degradacion, plan_chat con miembro vs no-miembro (403),
   mapa cultural con fotos de usuarios (caso hostal r10), contadores de comentarios sin
   503, y un plan nuevo con chat ligado. La geocerca de TSK-099 tambien debe verificarse
   en vivo (marcar Estuve aqui exige ubicacion).
4. **Pendientes pequenos:** backfill OPCIONAL de `sala_id` para planes EXISTENTES (la
   migracion 015 los deja NULL; solo los planes creados tras el deploy obtienen sala);
   vitrina extendida de perfil y sello verificado (futuro cercano); BUG-033 canonicals
   cirilicos (NO bloqueante); subida real de archivos (TODO de TSK-098, storage externo).
   COMPLETADO en esta iteracion: el smoke dedicado del epic (`scripts/smoke_test_epic_prompt.js`,
   50/50 PASS -- vocaciones, admin_xp, plan_chat/plan_chat_msg, contarComentarioSafe,
   coordsFallbackAutor, queries capturadas sala_id/tipo!=plan, divs de los 3 HTML, migracion 015).

#### Riesgos activos
- **Migracion 015 pending** (BLOQUEANTE): sin ella, vocaciones, sala de plan y limpieza
  de salas no operan en produccion; el codigo ya desplegado degrada con 500/503 hasta
  aplicarla (los helpers de BUG-A/BUG-B SI degradan bien sin migraciones).
- **Planes existentes sin chat:** `planes_viaje.sala_id` queda NULL para los planes
  creados antes del deploy; sin backfill manual, esos planes no tendran "Chat del plan".
- **ADMIN_SECRET en fallback 'exploraco12345'** en el codigo (patron historico del
  proyecto): el Bearer de admin_xp es la misma secret que admin-destinos; riesgo aceptado,
  candidato a variable de entorno dedicada.
- **Smoke del epic en su lugar:** `scripts/smoke_test_epic_prompt.js` (50/50 PASS,
  2026-09-13) guarda el contrato nuevo (vocaciones/admin_xp/plan_chat/plan_chat_msg/
  contarComentarioSafe/coordsFallbackAutor, queries capturadas sala_id/tipo!=plan, divs de
  los 3 HTML, migracion 015). Riesgo residual: verifica se ejecute tras aplicar la migracion
  015 en Neon y tras cada cambio futuro en interacciones.js/usuarios.js.

### Sesion presencia fisica v4.0 - geocerca de visitas (2026-09-12) - TSK-099 / ADR-024

Diseno aprobado (architect + architect-review) e IMPLEMENTADO en working tree para
exigir presencia fisica real al marcar "Estuve aqui". El diseno completo vive en el spec
`docs/superpowers/specs/2026-09-12-presencia-fisica-gamificacion-v4-design.md`; la decision en
`DECISIONS.md` ADR-024; la tarea en `TASKS.md` TSK-099.

**Problema:** `POST tipo=visita` otorgaba +20 XP sin validar ubicacion; `quitar_visita` hacia
`DELETE` fisico sin descontar XP (farming visita/quitar_visita/visita); el dedup `SELECT`+`INSERT`
no era atomico (sin indice unico); un radio fijo de 100 m castigaba la exploracion rural.

**Cambios (verificados contra archivo real, ADR-006 - el repo se edito en paralelo durante la
sesion documental; estado al 2026-09-12):**
- `usuario-session.js` (commit HEAD `fcd6060`): `obtenerUbicacion()` con
  `navigator.geolocation.getCurrentPosition` (`enableHighAccuracy`, timeout 10 s, `maximumAge 0`);
  `marcarVisitado()` envia `{tipo:'visita', usuario_id, destino_id, lat, lng, accuracy, ts}` y
  maneja `data.code`/`data.dist_m`/`data.zona`; `mensajeErrorVisita()` traduce
  `FUERA_DE_RANGO`, `PRECISION_INSUFICIENTE`, `ACCURACY_INVALIDA`, `COORDENADAS_*`, `RATE_LIMIT`,
  `LIMITE_DIARIO`. `quitarVisita()` sigue enviando `quitar_visita`.
- `api/pagina-destino.js`: boton `marcarVisitadoBtn` (L2327) llama
  `window.ExploraCO.marcarVisitado(DID)`; blogs excluidos.
- `api/interacciones.js` v11 (header ADR-024): helpers `haversineMetros`, `resolverRadioM` y
  constantes de geocerca L74-119 (`TIERRA_RADIO_M=6371008.8`, `RADIO_DEFAULT_M=100`,
  `RADIO_POR_CATEGORIA`, `RADIO_POR_SUBCATEGORIA`, `RURAL_KEYWORDS`, `ACCURACY_MAX_M=150`,
  `COOLDOWN_MIN_SEG=90`, `MAX_VELOCIDAD_MPS=69.4`, `VISITAS_DIA_MAX=30`, `VECINOS_RURAL_MAX=3`,
  `VECINOS_BBOX_DEG=0.02`, `VISITA_BONO_RURAL=20`). **Handler `tipo2==='visita'` YA reescrito y
  verificado (L3866-4056):** dedup-first (cualquier fila activa o no -> `ya_visitado`/`reactivado`
  xp 0), 404 destino, 400 blog, coords (`COORDENADAS_REQUERIDAS`/`COORDENADAS_INVALIDAS` con
  rechazo de `0,0`), `accuracy` (`ACCURACY_INVALIDA`/`PRECISION_INSUFICIENTE`), geocerca
  (`FUERA_DE_RANGO`), anti-farming (`RATE_LIMIT` 90 s, `VELOCIDAD_IMPOSIBLE` 69.4 m/s,
  `LIMITE_DIARIO` >=30 en ventana movil de 24 h), `dims.geo`, bono rural y `modo='sin_geocerca'`;
  `quitar_visita` -> `UPDATE activo=false` (L4062-4071); catch `23505` -> 200 `ya_visitado`.
- `api/utilidades.js` (L116/L131): el conteo GET de `?tipo=visitas` filtra `activo=true`.
- `usuario-session.js` (L124-175): `sincronizarGuardados()` solo sincroniza guardados; ya no
  migra visitas desde el cache local (comentario ADR-024), porque exigen `lat/lng` presencial.
- Logro `logr_pionero` en el catalogo (L523-529): cuenta visitas activas con
  `dims->'geo'->>'zona'='rural'`; LOGROS = 30 y tests actualizados (`test_logros_catalogo.js`,
  `smoke_test_perfil_progreso.js`, `smoke_test_comunidad.js`, `verify_comunidad_prod.js`) PASS.
- `db/migrations/014_reset_visitas_presencia_fisica.sql` (NUEVA en working tree, 344 lineas):
  purga fisica UNICA de visitas gamificadas (`tipo='visita' AND usuario_id IS NOT NULL`) con
  respaldo `interacciones_visitas_reset_backup`; recomputa `xp_total` (resta `SUM(xp_ganado)` +
  bonos de misiones/logros de visitas), `total_visitas`, `pandillas.fama_total` y
  `pandilla_retos`; resetea flags JSONB `mis_primera_visita`, `mis_itinerario_perfeccion`,
  `logr_visitas_5`, `logr_visitas_20`; conserva analitica anonima (`usuario_id IS NULL`) y
  cromos; crea `idx_interacciones_visita_unica` (indice unico parcial que cierra la race). Drift
  residual de XP por multiplicadores/amuletos documentado (no hay ledger).

**Decisiones de producto (aprobadas):** radios por keyword -> subcategoria -> categoria ->
default: default/urbano 100 m, `naturaleza`/`aventura`/keyword rural 250 m, `parque` 150 m,
categoria `evento` 150 m, `festival`/`deporte` 200 m, blog rechazado; bono rural plano +20 XP
solo en INSERT fresco (sin multiplicador/amuleto/fama); `logr_pionero` tier plata 40 XP;
destino sin coordenadas -> `modo='sin_geocerca'` (permite, sin bono); spoofing residual
(`lat/lng/accuracy` client-supplied) -> ADR-025 candidato (sesion firmada/atestacion).

**Docs de esta sesion documental:** ADR-024 en DECISIONS.md; spec
`2026-09-12-presencia-fisica-gamificacion-v4-design.md`; TSK-099 en TASKS.md; este segmento.

#### Que sigue
1. **[HECHO] Backend + tests:** handler `tipo2==='visita'` reescrito y verificado contra archivo
   real; `quitar_visita` soft-delete; logro `logr_pionero` en catalogo; `node --check` PASS;
   ASCII 0 bytes >127; tests de logros 30/30 PASS (`test_logros_catalogo.js`,
   `smoke_test_perfil_progreso.js`, `smoke_test_comunidad.js`, `verify_comunidad_prod.js`).
2. **[HECHO] `scripts/smoke_visita_geocerca.js` 15/15 PASS (ejecutado 2026-09-12):** validaciones
   tempranas, dedup activa/inactiva, cooldown, tope diario y caminos felices urbano (xp 20) y
   rural (xp 40).
3. **[HECHO 2026-09-13] APLICAR `db/migrations/014_reset_visitas_presencia_fisica.sql` EN NEON** -- ya aplicada por Javier (editor SQL de Neon; idempotente, transaccional; requeria migracion 012 previa -- la 011/012/013 tambien quedaron aplicadas el mismo dia). Verificar post-deploy en vivo: 0 visitas con `usuario_id IS NOT NULL`, anonimas
   preservadas, `interacciones_visitas_reset_backup` con las filas purgadas e
   `idx_interacciones_visita_unica` presente. Recordar que la 015 (epic prompt.txt, TSK-100) sigue pendiente de aplicar.
4. **Commit + push + deploy manual** del working tree (incluye la implementacion de esta tarea +
   los pendientes de TSK-095/096/097/098). Verificar en vivo que marcar "Estuve aqui" exige
   ubicacion y que fuera de rango responde 422 `FUERA_DE_RANGO`.
5. **ADR-025 candidato (backlog):** sesion firmada / atestacion de dispositivo para que
   `lat/lng/accuracy` dejen de ser datos no confiables.

#### Riesgos activos
- **Spoofing de GPS (residual):** coordenadas client-supplied sin sesion firmada; mitigado
  parcialmente por accuracy/velocidad/cooldown/tope diario. Escalar a ADR-025.
- **Drift de XP del reset:** `xp_ganado` guarda el XP base (20); multiplicadores x1.1 y
  amuleto_x2 se suman aparte y no quedan en la fila -> el recomputo puede dejar remanente
  positivo (nunca negativo por `GREATEST(0,...)`).
- **Contador publico de visitas a la baja:** `api/utilidades.js?tipo=visitas` incluye las filas
  gamificadas purgadas; el numero bajara tras el reset (efecto esperado).
- **Bbox rural `0.02` grados:** aproximado (~2.2 km lat; `2.2*cos(lat)` km lng); ajustar la
  constante si el QA detecta falsos negativos en zonas densas.

### Sesion epic multimedia de usuarios (2026-09-12) - TSK-098

Epic completo de multimedia de usuarios implementado en working tree (SIN
commitear): fix de los 500 en albumes/mapa, filtro multimedia
multi-seleccion, galeria ampliada, modulo audiovisual y comentarios tipo
Facebook. 10 archivos (8 modificados + 2 nuevos + 1 migracion nueva),
Escudo GOLD limpio. Docs: TASKS/TSK-098, DECISIONS/ADR-023 (ya agregado por
el architect), BUGS/BUG-033 (hallazgo, NO bloqueante).

**Cambios (verificados contra archivo real, ADR-006):**
- `api/interacciones.js`: (a) `COALESCE(u.foto_url, u.avatar_url, '')` en
  `album_detalle`/`multimedia_mapa`; (b) catch global `42P01`/`42703` ->
  503 tipado `SCHEMA_NOT_MIGRATED` (L3920-3921); (c) `multimedia_mapa`
  soporta `tipo_media=foto,video,audio` (CSV, `ANY($1::text[])`, 400
  estricto ante tokens invalidos con `tipos_invalidos` y respuesta
  `tipos_aplicados`, L1807-1866); (d) `mi_feed_fotos?orden=top|recientes`
  (L1873); (e) contador `comentarios` (subquery derivada) en
  `album_detalle` y `mi_feed_fotos`; (f) 6 ramas `tipo=` nuevas SIN
  endpoint nuevo (presupuesto 8/8, ADR-010): GET `comentarios_foto`
  (arbol con `likes`/`ya_like`/`es_mio`/`nivel`/`respuestas[]`, L1917),
  GET `galeria_destino` (L1713), GET `comentarios_recientes` (L1775),
  POST `comentario_foto` (201, rate-limit 30/dia, +2 XP tope 20/dia,
  L2908), POST `comentario_eliminar` (soft-delete autor/admin + `cascada`
  opcional, L3023), POST `comentario_voto` (toggle `like`/`unlike`
  idempotente, 403 self-like, sin XP, L3094).
- `db/migrations/013_album_comentarios.sql` (NUEVO, ADR-023): tabla
  `album_comentarios` (parent_id self-FK, anidacion ilimitada, soft-delete
  `activo`, CHECK texto 1..1000) + `album_comentario_votos` (likes, PK
  compuesta) + 4 indices (hilo, arbol, rate-limit diario, likes).
  Idempotente IF NOT EXISTS (ADR-008), ASCII-safe (ADR-002). **PENDIENTE
  de aplicar manualmente en Neon por Javier.**
- `index.html` y `comunidad.html`: filtro multimedia multi-seleccion
  (foto+video+audio simultaneos) y montaje de comentarios en los modales
  de album (`AlbumComments.toggle`, index L3392 / comunidad L1448).
  `comunidad.html` ademas estrena el tab "Audiovisual" (L293,
  `initAudiovisual` L1614): grid de albumes + feed con orden
  recientes/populares/top y "cargar mas".
- `mi-perfil.html`: inputs lat/lng para georreferenciar albumes (para que
  aparezcan en el mapa) + comentarios en el modal de detalle (L1188).
- `admin.html`: panel de moderacion de comentarios (`adminCargarComentarios`
  -> GET `comentarios_recientes` + POST `comentario_eliminar` con cascada
  admin, L6139-6152).
- `galeria.html` (NUEVO): subpagina de galeria ampliada, modo global (fotos
  mas votadas + albumes populares) y modo `?destino=<slug>` (fotos del
  destino + fotos de usuarios por votos), integra comentarios
  (`window.AlbumComments.mount`, L341-385). Canonical correcto
  (`https://exploraco.co/galeria.html`, sin homografo).
- `album-comments.js` (NUEVO): componente compartido
  `window.AlbumComments.mount/toggle` (arbol anidado, indentacion visual
  clamp a 3 niveles, like/unlike, borrar, responder). ASCII 0 bytes >127.
- `api/pagina-destino.js`: boton "Ver galeria ampliada" (L1488) ahora
  navega a `/galeria.html?destino=<slug>` (fallback al lightbox in-page si
  no hay slug).
- `api/utilidades.js`: `/galeria.html` agregada a STATIC_PAGES del sitemap
  (L20, priority 0.7, weekly).

**Decisiones de producto (confirmadas):**
1. Ingreso de media por URL externa por ahora; la SUBIDA REAL DE ARCHIVOS
   queda como TODO futuro (requiere storage externo tipo Vercel
   Blob/Supabase/Cloudinary porque Vercel Hobby no persiste archivos).
2. Los links que sube un usuario quedan en su galeria y referenciados en el
   mapa (por eso lat/lng en albumes).
3. Comentarios con likes y respuestas anidadas ILIMITADAS en datos
   (indentacion visual limitada a 3 niveles, ADR-023).
4. Migraciones 004-012 ya aplicadas por Javier en Neon; la 013 la aplica
   manualmente el.

**Verificacion (Escudo GOLD, 2026-09-12):** `node --check` PASS en
api/interacciones.js, api/pagina-destino.js, api/utilidades.js y
album-comments.js (re-verificado en esta sesion documental); ASCII-safety
0 bytes >127 en api/interacciones.js, album-comments.js y la migracion 013.
Hallazgo de QA de la sesion: los canonicals de 8 HTML usan el homografo
cirilico `\u043E` (`explorac\u043E.co`, dominio inexistente) -> BUGS/BUG-033
(NO bloqueante, fuera del alcance del epic).

#### Que sigue
1. **[HECHO 2026-09-13] Aplicar `db/migrations/013_album_comentarios.sql` en Neon** -- ya aplicada por Javier (editor SQL de Neon; idempotente, no requeria nada mas; requeria migracion 009 previa, ya aplicada). La 012 tambien quedo aplicada el mismo dia. Queda la 015 (epic prompt.txt, TSK-100). Sin la 013 aplicada, los `tipo=` de comentarios (comentarios_foto, comentario_foto,
   comentario_eliminar, comentario_voto) y el contador `comentarios`
   degradaban a 503 `SCHEMA_NOT_MIGRATED` (el catch 42P01 de este epic solo
   tipifica el error; la tabla no existia en prod).
2. **Commit + push + deploy manual** del working tree completo (los
   archivos de esta sesion + los de TSK-095/096/097 que siguen sin
   commitear + los cambios de modelos de agentes de `.opencode/agent/` + el epic prompt.txt TSK-100).
3. **Verificacion post-deploy:** mapa con fotos de usuarios (albumes con
   lat/lng visibles), abrir album sin 500, filtros multi-seleccion
   foto+video+audio simultaneos, galeria ampliada (modo global y
   `?destino=<slug>`), comentarios end-to-end (crear, responder anidado,
   like/unlike, borrar autor, moderar en admin con cascada).
4. **TODO futuro: subida real de archivos** (storage externo tipo Vercel
   Blob/Supabase/Cloudinary; hoy el ingreso es por URL externa y Vercel
   Hobby no persiste archivos subidos).

### Sesion fixes multimedia + constraint unica de interacciones (2026-09-12) - TSK-097

Implementacion de la segunda tanda del `prompt cambios.txt` (fixes multimedia +
constraint unica, working tree SIN commitear). 8 archivos modificados + 1
migracion nueva, Escudo GOLD limpio. Docs: TASKS/TSK-097, DECISIONS/ADR-022,
BUGS/BUG-032 y BUG-027 (resuelto).

**Cambios (verificados contra archivo real, ADR-006):**
- **FIX 1 - Constraint unica (la mas relevante):** nueva migracion
  `db/migrations/012_interacciones_dedup_resena_rating.sql` (NUEVO): DROP de
  `interacciones_usuario_id_destino_id_tipo_key` + indice unico PARCIAL
  `idx_interacciones_dedup_resena_rating ON interacciones (usuario_id, destino_id)
  WHERE tipo IN ('resena','rating')` + dedup defensivo (conserva la resena y la mas
  reciente, excluye usuario_id NULL) + recalculo de `destinos.rating`/`total_resenas`
  de los afectados. Motivo: los INSERT `tipo='foto'` (L2356-2360) y `foto_voto`
  (L2394-2398) chocaban con la constraint compuesta y devolvian 500 (BUG-032); con el
  indice parcial las fotos quedan libres (ADR-017) y el dedup de resena/rating se
  preserva (ADR-007). `api/interacciones.js` catch final: `err.code === '23505'` ->
  409 tipado (L3451-3452).
- **FIX 2 - Fotos reales:** `index.html` dejo `var DEST_PHOTOS = {};` (L1781, sin URLs
  Unsplash de prueba) y agrego el helper `photoPlaceholderHTML(emoji, variant)` (L2928)
  con placeholder neutro (gradiente + emoji) para destinos sin foto real;
  `index-api-connector.js` confirmado sin URLs externas. `MAPA_MEDIA` ya era 100% real
  (ADR-021, `?origen=album`); no existia `MOCK_MEDIA`.
- **FIX 3 - Albumes en perfil:** `mi-perfil.html` UI completa: crear, editar
  (`album_editar`), eliminar (`album_eliminar`), subir foto (`album_agregar_foto`) y
  quitar foto (`album_quitar_foto`), sesion via `window.ExploraCO.usuario`.
- **FIX 4 - Trazabilidad:** `api/interacciones.js` enriquece `multimedia_mapa`
  (`album_id`, `usuario_id`, `usuario_nombre`, `usuario_avatar`, L1673/1724) y
  `album_detalle` (`usuario_nombre`, `usuario_avatar`, `autor_avatar`, `usuario_id` en
  fotos, L1685). `index.html` (`openAlbumModal` L3321) y `comunidad.html`
  (`abrirAlbumModal` L1340): de foto -> album y de autor -> `/mi-perfil.html?id=...`.
- **FIX 5 - Auditoria:** `api/pagina-destino.js` L1950 corrige BUG-027 (el boton
  Instagram mostraba el literal `[foto]`; ahora `\uD83D\uDCF7`); nuevo
  `scripts/smoke_auditoria_pagina_destino.js` (42 checks al cierre de TSK-097; 54
  checks HOY tras TSK-105 / ADR-030, 2026-09-16); `comunidad.html` reproductor
  real de audio/video/embed (`avMediaHTML` L1274, `avEmbedUrl` L1264); `index.html`
  balance de divs corregido en `publicar-modal` (497/497); `admin.html` moderacion de
  fotos de album conectada (`adminCargarFeedFotos` -> `mi_feed_fotos`, L6056;
  `adminRetirarFotoAlbum` -> `admin_moderar_foto_album` accion 'eliminar', L6031/6120).

**Verificacion (Escudo GOLD):** `node --check` limpio en api/interacciones.js,
api/pagina-destino.js e index-api-connector.js; 0 bytes >127 en los api/*.js
(index-api-connector.js mantiene 26 backticks preexistentes, baseline HEAD 26);
balance de divs 0 en los 4 HTML (index 497/497, comunidad 181/181, mi-perfil
166/166, admin 724/724); inline JS de los 4 HTML parsea; `check_buildHTML_inline.js`
TODO OK; smokes OK (auditoria 42/42 al cierre de TSK-097; 54/54 HOY tras TSK-105 /
ADR-030, 2026-09-16; comunidad, logros 29, perfil_progreso). QA
manual: 2 bugs de integracion detectados y corregidos (openAlbumModal leia
`res.data` en vez de `res.album`/`res.fotos`; `quitarFotoAlbum(uuid,uuid)` sin
comillas -> ReferenceError).

**Pendiente / backlog:**
1. **[HECHO 2026-09-13] APLICAR `db/migrations/012_interacciones_dedup_resena_rating.sql` EN NEON** -- ya aplicada por Javier (editor SQL de Neon; idempotente,
   no requeria nada mas). Las 007, 008, 009, 010 y 011 tambien quedaron aplicadas (migraciones 011-014 completas el 2026-09-13). Queda la 015 (epic prompt.txt, TSK-100). Sin la 012 el dedup por indice parcial NO estaba
   activo en produccion y la segunda foto del mismo usuario al mismo destino seguia
   devolviendo 500 (el catch 23505 -> 409 solo tipifica el error; la constraint vieja
   seguia existiendo).
2. **Reiniciar opencode** para que tome los nuevos modelos de agentes: se cambiaron
   `backend-dev`, `architect` y `sql-security` de `opencode-go/deepseek-v4-pro` a
   `opencode-go/deepseek-v4.1-flash` y se corrigio `qa-auditor` de un ID invalido
   (`opencode/deepseek-v4-flash`) a `opencode-go/deepseek-v4.1-flash`
   (`.opencode/agent/*.md` ya actualizados en working tree; AGENTS.md actualizado en
   esta sesion documental). La carga de agentes esta cacheada al inicio de sesion
   (misma leccion que TSK-081).
3. **Commit + push + deploy manual** del working tree completo (los archivos de esta
   sesion + los de TSK-096 + TSK-095/BUG-031 que siguen sin commitear).

### Sesion mapa cultural: capa audiovisual estricta + paridad de drawer (2026-09-12) - TSK-096

Implementacion del `prompt cambios.txt` sobre el mapa cultural (working tree,
SIN commitear). 4 archivos, Escudo GOLD limpio.

**Decisiones de producto (confirmadas por el usuario):**
1. Capa audiovisual estricta: backend con param opcional `origen` + filtro
   defensivo en frontend (mejor opcion; sin migracion ni endpoint nuevo).
2. Sin toggle on/off de la capa directorio: la deseleccion de "Todo" oculta
   todos los pines del directorio.
3. Se elimina el popup de los pines individuales y todo clic abre el drawer.
4. Alcance "a los 2": paridad tambien en "Mi Mapa personal" y `mapas.html`.

**Cambios (verificados contra archivo real, ADR-006):**
- `api/interacciones.js`: `var mmOrigen = req.query.origen || null;` (L1712)
  y la rama estatica `destinos_fotos` se anula con
  `((mmTipo && mmTipo !== 'foto') || mmOrigen === 'album' ? ' AND FALSE' : '')`
  (L1739). Sin `origen`, respuesta identica a la anterior (comunidad.html L1221
  sigue recibiendo ambas ramas).
- `index-api-connector.js`: fetch `?tipo=multimedia_mapa&origen=album` (L258).
- `index.html`:
  - Listener `.mf-btn[data-cat]` (L2588): si el boton ya esta `on`, deselecciona
    (`mapaActiveCat='off'`); `filterMapaPins('off')` deja `mapaPlaces=[]` y
    `reclusterMapa()` oculta los pines; `renderMapaList('off')` muestra estado
    vacio. "Todo" activa la capa media solo al re-seleccionarse.
  - `renderMapaMedia` (L3009) y `mdMediasCercanas` (L3097) descartan
    `origen === 'destino'` (solo albumes de usuarios).
  - `refreshMapaMarkers` (L2658) y `updateMMMarkers` (L2075): sin `bindPopup`;
    clic -> `setMapaActive()` -> `openMapaDrawer(place)`. `setMapaActive`
    (L2926) y `onMapaMoved` (L2678) sin manejo de popup individual. Clusters
    intactos.
- `mapas.html`: drawer lateral propio (`.dd-wrap`/`.dd-panel`, CSS L75-99) +
  `abrirDrawerDetalle` (L314) con `_fotoSrc` (valida esquema), `CAT_LBL`,
  titulo, ciudad y CTA `/{slug}.html`; cierre por backdrop/boton/Escape; datos con
  `_esc`. Divs 0 de balance (HEAD 0).

**Verificacion (Escudo GOLD):** `node --check` de api/interacciones.js e
index-api-connector.js PASS; inline JS de index.html y mapas.html extraido con
`node _verify.js` + `node --check` PASS; ASCII nuevas lineas 0; divs index -1
(preexistente en HEAD) y mapas 0. Auditoria contra BUGS_HISTORICOS: BUG-001,
BUG-030, BUG-020, BUG-031 sin reaparicion.

**Pendiente / backlog:** (1) commit + push + deploy manual de los 4 archivos;
(2) la capa multimedia de `comunidad.html` sigue con la rama estatica (no se le
agrego `origen=album`) -- candidata a unificar; (3) `mapaPendingPopupId` y
`mapaPendingClearTimer` quedan declaradas sin uso en index.html (higiene menor).

### Sesion refactor UI/UX ficha de destino (2026-09-11) - TSK-095

Refactor completo de la ficha dinamica ejecutado desde `prompt cambios.txt`
(requerimientos UI/UX + sistema de verificado manual admin). Implementacion
completada en working tree (SIN commitear). 3 archivos modificados con
Escudo GOLD limpio.

**Cambios (verificados contra archivo real, ADR-006):**
- `api/pagina-destino.js` (motor):
  - Hero HQI: eliminados chips de resenas, precio "desde", duracion y link
    web; agregado chip de direccion fisica con fallback `d.address || d.barrio`
    (L764); se conservan ciudad/region y horario.
  - "Sobre este lugar": eliminado el `slead` (lead solo en hero); nuevo
    subtitulo estilizado `.sintro` con apertura de la descripcion (150 chars,
    fallback highlight, solo no-blog) (CSS L231, render L801).
  - Botonera hero: solo Sitio Web y Contactar prominentes (`hbtn`); Como
    llegar, Ver galeria, Guardar y Estuve aqui secundarios (`hobtn`).
  - Boton Guardar -> popover `abrirPopoverGuardar()` (L2257): "Tu Mapa"
    (`toggleGuardado`) + checkboxes de mapas tematicos (`mapas_mios` +
    `mapa_detalle`) + crear nuevo mapa (`mapa_crear` + `mapa_agregar_destino`,
    L2301). Reutiliza /api/interacciones (sin endpoints nuevos).
  - gstrip (franja naranja): conserva resenas y precio desde; ELIMINADO boton
    "Reservar" (L781-782); agregado boton "Ver galeria" con scroll a `#galeria`
    (L783, condicion `galAll.length > 1`).
  - Galeria: foto principal `.gal-main` + miniaturas `.gal-thumbs` + boton
    "Ver galeria ampliada" + Lightbox `#lb` (L1493) con prev/next, teclado
    (Esc/flechas) y cierre por fondo; click en la foto principal abre el
    lightbox.
  - secMapa: SOLO boton Google Maps (eliminados WhatsApp y Telefono de ese
    bloque, L1755-1756). **Nota posterior (TSK-105 / ADR-030, 2026-09-16):
    `secMapa` quedo OBSOLETO -- se fusiono con `secTransporteHostal` en
    `secComoLlegar` (id="como-llegar", transporte arriba + mapa abajo), con una
    sola entrada de subnav `como-llegar` y un ancla legacy invisible `#mapa`. El
    texto historico se conserva por Cero Borrado Logico (Regla de Oro 3).**
  - Limpieza: eliminado modulo inferior "Foto destacada" (`secFotoDestacada`,
    era ADR-017/P11, L1936) y eliminado el boton Google Maps de secContact
    (centralizado en secMapa, L1941-1942; HOY `secComoLlegar`, ver la nota
    anterior).
  - NO se renderiza ninguna insignia publica del campo `verificado`
    (0 ocurrencias en el archivo; requisito: solo control interno del admin).
- `admin.html`: checkbox `f-verificado` "Verificacion manual admin" en la
  pestana General (L795-797) + wiring completo: clearForm (L2548-2549),
  loadForm (L2988-2989), savePlace (L3629-3630), `_placeToAPI`
  (`verificado: p.verificado === true`, L5828) y `_mergeNeonRowIntoLocal`
  (L6145, guard `!== undefined && !== null`). Divs balanceados 716/716
  (delta 0).
- `api/admin-destinos.js`: `verificado` como COLUMNA gestionada con el patron
  identico a `destacado`: GET listado (L63), INSERT (L109/157 con
  `Boolean(b.verificado||false)`), UPDATE con guard `b.verificado !==
  undefined` que permite persistir `false` y DESTILDAR (L256-258). La columna
  ya existia en Neon (usada por publicar-lugar.js y leida por destinos.js).

**Verificacion (Escudo GOLD):** `node --check` limpio en los 2 serverless;
ASCII-safety 0 caracteres no-ASCII nuevos; balance de divs admin 716/716
(delta 0); smoke del renderer 28/28 PASS; flujo de verificado 6/6 PASS
(checkbox -> INSERT/UPDATE -> GET listado -> merge, incluido desmarcar).
Extension 2026-09-11: verificacion exp-pickle 14/14 PASS de la persistencia
de `address` (L5807 admin, INSERT L103/$10/L137 + fieldMap L220 de
admin-destinos.js) y del gate de secReservar (L1747, ADR-020).
Docs: ADR-019 en DECISIONS.md, TSK-095 en TASKS.md.

#### Que sigue
1. **HOTFIX BUG-031 -- commit + push + redeploy (PRIMERA PRIORIDAD,
   PRODUCCION ROTA HOY, lo ejecuta Javier manualmente):** TSK-095 ya esta
   desplegada en Vercel CON el bug: el JS inline que emite buildHTML()
   tiene un SyntaxError (onchange de mapas tematicos del popover de
   Guardar, L2288-2290, comilla escapada mal formada) que deja TODAS las
   paginas dinamicas sin funciones de cliente (`abrirPopoverGuardar is not
   defined` en parque-mundo-aventura.html, Estuve aqui, submitRv, votarDID,
   lightbox). El fix YA esta en el working tree SIN commitear:
   `api/pagina-destino.js` (L2288-2290 colapsadas a 1 linea con entidad
   HTML `&#39;`) + `scripts/check_buildHTML_inline.js` (guard permanente:
   parsea con `new vm.Script()` todo inline de buildHTML, 8 funciones +
   JSON-LD + divs; exit 0/1/2) + docs (BUGS/BUG-031, TASKS/TSK-095,
   NEXT.md). Detalle: BUGS_HISTORICOS.md BUG-031.
2. **Aplicar `db/migrations/011_ficha_direccion_destinos.sql` en Neon
   (PENDIENTE, unico paso manual restante de la persistencia de `address`;
   lo ejecuta Javier en el editor SQL de Neon, es idempotente y no requiere
   nada mas).** Sin la columna, el INSERT/UPDATE de admin-destinos.js (que
   ya envia `address`, L103/$10/L137/L220) fallaria al persistir un destino
   con direccion.
3. **Commit del HOTFIX (cubre TODO lo pendiente de la TSK-095):** el unico
   archivo de la TSK-095 sin commitear es `api/pagina-destino.js` (fix
   BUG-031; admin.html, api/admin-destinos.js y la migracion 011 ya
   quedaron commiteados en `2f939e0` "arreglos"). El commit del item 1
   debe incluir: api/pagina-destino.js + scripts/check_buildHTML_inline.js
   + docs (BUGS/BUG-031, TASKS/TSK-095, NEXT.md). Tras el push, Vercel
   redeploya solo (auto-deploy desde GitHub).
4. **Verificacion en prod tras deploy:** hero de una ficha con `barrio`
   muestra el chip de direccion; tras aplicar la migracion 011, un destino
   con `address` cargada en admin muestra la direccion exacta en el chip
   (prevalece sobre `barrio`); el popover de Guardar abre con los mapas
   tematicos (con el HOTFIX BUG-031 aplicado, ya sin el SyntaxError);
   galeria abre el lightbox; la franja no muestra "Reservar" pero
   si "Ver galeria"; la seccion "Reservar" SOLO aparece en destinos con
   booking/hostelworld reales; secMapa solo tiene Google Maps (HOY
   `secComoLlegar`, que fusiona transporte + mapa, ver TSK-105 / ADR-030); admin
   guarda/desmarca `verificado` sin romper ningun destino existente (el
   guard `!== undefined` preserva los registros que no envian el campo).
5. **Escudo GOLD (cambio permanente, brecha de cobertura BUG-031):**
   incorporar `node scripts/check_buildHTML_inline.js` al ciclo de
   verificacion previo a cada deploy -- el Escudo GOLD + smoke tests NO
   parseaban el JS inline del HTML generado y el blob roto paso como "PASS";
   el guard cierra esa brecha (SDD Gating: verificar asincrono obligatorio
   antes de dar una tarea por completada).

#### Riesgos activos / backlog (hallazgos del QA, NO bloqueantes)
1. **[CERRADO 2026-09-11] `address` NO se persistia en Neon:** implementado
   y verificado 14/14 (exp-pickle): `admin.html` `_placeToAPI` envia
   `address` en POST y PUT (L5807); INSERT de admin-destinos.js persiste la
   columna (L103 columnas, `$10` en L114, L137 valores) y el fieldMap del
   UPDATE la incluye (L220). Unico pendiente manual: APLICAR la migracion
   `db/migrations/011_ficha_direccion_destinos.sql` en el editor SQL de Neon
   (idempotente, `ADD COLUMN IF NOT EXISTS address TEXT`, patron ADR-008),
   NO implementar nada mas. El chip del hero sigue leyendo
   `d.address || d.barrio` (L764, sin cambios): con la migracion aplicada y
   un destino con `address`, el chip muestra la direccion exacta en vez de
   `barrio`.
2. **[CERRADO 2026-09-11 - ADR-020] R-2 secReservar en sitios:** decidido e
   implementado: la seccion "Reservar" de la ficha SOLO se renderiza con
   enlace real de Booking.com o Hostelworld (`bookingUrl || hwUrl`, L1747).
   El WhatsApp solo y el Airbnb solo ya no disparan la seccion (sin
   "Reservar" sobrante en sitios); WhatsApp y contacto siguen vivos via el
   hero y secContact.
3. **Doble escape preexistente** en api/pagina-destino.js ~L2174
   (`\\u2605` en addRvOptimista): funcionalmente correcto (el cliente recibe
   el escape simple al renderizar), pero mantener como pendiente menor de
   higiene (Escudo GOLD lo cuenta como 1 preexistente; BUG-002 lo prohibe
   como patron).
4. **BUG-027 sigue abierto** (preexistente): el boton Instagram en secContact
   muestra "[foto] Instagram" -- oportunidad de cerrar en un futuro sprint.
5. **[DECIDIDO, sin cambio] Insignia publica de verificado:** confirmado que
   NO se renderiza ninguna insignia publica por ahora (ADR-019: solo control
   interno del admin + columna). Si el equipo la quiere en el futuro, habria
   que renderizarla en pagina-destino.js condicionada a rol admin/`verificado`.

### Sesion ADR-018 - Gamificacion v4.0 (2026-09-10)

Implementacion completada en working tree (SIN commitear). Requiere aplicar
`db/migrations/010_gamificacion_v4.sql` en Neon (BLOQUEANTE, lo ejecuta Javier)
y deploy de `api/interacciones.js` (v9) + `api/admin.js`.

**Cambios:**
- `db/migrations/010_gamificacion_v4.sql` (NUEVO): `consumibles`,
  `compra_consumibles`, `consumo_consumibles`, `cromos_catalogo`,
  `usuarios_cromos`, `pandillas`, `pandillas_miembros`, `pandilla_retos`,
  `cromo_intercambios`, ALTER `usuarios.capacidades` + seed de 10 consumibles.
- `api/interacciones.js` (v9): +5 GET (`consumibles`, `inventario`,
  `mis_cromos`, `pandilla_detalle`, `pandilla_reto`) +8 POST
  (`comprar_consumible`, `usar_consumible`, `cromo_obtener`,
  `cromo_intercambio`, `pandilla_crear`, `pandilla_unirse`, `pandilla_salir`,
  `pandilla_reto`) + `tabla_destino` con 5 senderos + retos de parche que
  consumen las 4 acciones XP.
- `api/usuarios.js`: NIVELES 20, `conMisiones()` con MERGE (BUG-1) +
  `calcularEra()`.
- `api/admin.js` + `admin.html`: CRUD de consumibles (precios editables).
- `mi-perfil.html`: vitrina 20 niveles + Tienda/Inventario/Mis Cromos.
- `comunidad.html`: tab Pandillas (detalle, unirse, fundar, retos).
- `index.html`: XP_LEVELS 20.
- `usuario-session.js`: `gastarXp()` + `CAPACIDADES_POR_NIVEL` + XP_LEVELS 20.
- `scripts/smoke_test_gamificacion_v4.js` (NUEVO): 95/95 PASS.

**Pendiente (BLOQUEANTE):**
1. Aplicar `db/migrations/010_gamificacion_v4.sql` en Neon (Javier).
   Nota: 007, 008 y 009 siguen pendientes de aplicar en Neon.
2. Commit + push + deploy de Vercel.
3. Verificacion en vivo: comprar/usar consumible, obtener cromo, fundar
   pandilla, y la vitrina de 20 niveles.

### Sesion TSK-093 - capa multimedia + drawer del mapa cultural (2026-09-10)

Implementacion completada en working tree (SIN commitear aun). Requiere
deploy de api/interacciones.js con el fix de UNION types para dejarla
operativa en produccion (BUG-030).

**Cambios (verificados contra archivo real, ADR-006):**
- `index.html`: capa multimedia en el mapa Leaflet -- array `MAPA_MEDIA`
  (L1514), filtro `MAPA_MEDIA_TIPO` (L1516), re-sync de la capa (L2636);
  drawer lateral fijo con datos del destino (foto hero, rating, precio,
  lead, link) y tabs Fotos/Videos/Audios con lightbox, embed de
  YouTube/Vimeo y player de audio. Spec:
  `docs/superpowers/specs/2026-09-10-multimedia-mapa-cultural-drawer.md`.
- `index-api-connector.js`: `toMapPlace()` (L72) propaga `foto` (L88,
  `item.foto_hero || item.foto`) y `photos[]` (L92, slice 8); bloque 3b
  (L256-276) consume el endpoint publico
  `GET /api/interacciones?tipo=multimedia_mapa` y puebla `MAPA_MEDIA[]`
  via `replArr` (L271).
- `api/interacciones.js`: fix UNION types del handler `multimedia_mapa`
  (500 uuid vs varchar) -- cast `a.id::text AS origen_id` (L1484). Detalle
  en BUG-030.

**Pendiente:** deploy de api/interacciones.js (fix UNION) y verificacion
en produccion.

#### Que sigue
1. **Deploy + verificacion en produccion (requiere Javier):**
   "Verificar en produccion la capa multimedia del mapa cultural (requiere
   deploy de api/interacciones.js con fix UNION types) -- activar capa
   Media, abrir drawer de destino y de pin multimedia".
2. **Commit + push (PENDIENTE):** index.html, index-api-connector.js,
   api/interacciones.js + docs (TASKS/TSK-093, NEXT.md, BUGS/BUG-030).

### Sesion ADR-016 - subcategorias en tags sitio/comida/evento (2026-09-10) - TSK-090

Implementacion Fase 1-3 del ADR-016 completada en working tree (SIN commitear
aun). Las 3 categorias (sitio, comida, evento) reciben `tags.subcategoria`
(slug ASCII de lista cerrada) que da al renderer una matriz
modulo-por-subcategoria: admin y publicar.html solo ofrecen los modulos
funcionales del tipo real de lugar y pagina-destino.js gatea las secciones de
sitio (fallback sin subcategoria = regresion cero).

**Cambios (verificados contra archivo, ADR-006):**
- `admin.html`: 3 selects `f-subcategoria-*` en sitio (L1321, onchange
  `applySubcategoriaSitio()`), comida (L1182) y evento (L1496), registrados en
  `CATEGORY_TAG_FIELDS.<cat>` (L2591/2632/2646). `applySubcategoriaSitio()`
  (L4475) muestra solo los sub-tabs de la subcategoria elegida
  (SITIO_ALL_TABS L4474 como fallback). Balance divs 0 (653/653).
- `api/pagina-destino.js`: `SUBCAT_LABEL` (21 labels, L20-28),
  `SITIO_SECCIONES_POR_SUBCATEGORIA` (L42-52), chip `.subcat-chip` en el hero
  (L2007-2008, CSS scoped L175), gating `subcatActiva()` (L1461) sobre las 8
  secciones legacy de sitio + 13 secciones nuevas condicionales (colecciones,
  recorridos, accesibilidad, programacion, musica_vivo, cover,
  codigo_vestimenta, happy_hour, atracciones, horarios_zona,
  actividades_gratis, que_ver, contexto). H1 resuelto: `cover` objeto
  `{valor, nota}` con fallback a `cover_valor`/`cover_nota` planos (L599-601).
  Fallback sin subcategoria = `sitioSeccionesActivas = null` (L611-614).
- `api/publicar-lugar.js`: `SUBCAT_LISTA` (L29-33) valida contra la lista
  cerrada de la categoria final; solo persiste si matchea (L104-107).
- `publicar.html`: 3 selects (L250/267/280) con show/hide por chip
  (L829-833), `subcatResumen()` (L963-965), payload `subcategoria` (L1076).
- `.opencode/skills/gemini-research/scripts/validate_ficha.js`: `SUBCATEGORIAS`
  (L46-58), validacion backward-compatible (ausencia NO es error, L114-122).
- `scripts/reclasificar-subcategorias.js` (NUEVO): idempotente, modos
  `--dry-run` (default)/`--apply`/`--local`, merge JSONB (ADR-003), reglas de
  inferencia keyword->subcategoria. Dry-run local: 84 seeds -> 74 inferidos,
  10 sin-match (candelario + 9 eventos multiformato), 0 skipped. Log:
  `scripts/logs/reclasificar-subcategorias-2026-09-10.log`.

**Verificado:** dry-run local resumen `total=84 asignar=74 aplicado=0 skip=0
sin_match=10 modo=dry-run` (5 corridas identicas concatenadas en el log);
balance divs admin 653/653; SUBCAT_LABEL/SITIO_SECCIONES_POR_SUBCATEGORIA/
SUBCAT_LISTA/SUBCATEGORIAS copian la taxonomia exacta del ADR-016 (9 sitio /
5 comida / 7 evento). Docs: ADR-016 en DECISIONS.md (Estado -> Fase 1-3
completada), TSK-090 en TASKS.md, leccion BUG-029 en BUGS_HISTORICOS.md.

#### Que sigue
1. **Commit + push (PENDIENTE):** admin.html, api/pagina-destino.js,
   api/publicar-lugar.js, publicar.html, validate_ficha.js,
   scripts/reclasificar-subcategorias.js + docs (TASKS/TSK-090, NEXT.md,
   BLUEPRINT seccion 4, DECISIONS/ADR-016, BUGS/BUG-029).
2. **Reclasificacion en produccion (requiere Javier):** revisar el dry-run y
   los 10 sin-match, luego
   `DATABASE_URL=... node scripts/reclasificar-subcategorias.js --apply`
   (idempotente; los que ya tienen `subcategoria` saltan en estado skipped).
3. **Verificacion post-deploy:** Escudo GOLD + smoke de buildHTML() de las 3
   categorias con y sin subcategoria; UI admin pre/post (select cachea en
   edicion, applySubcategoriaSitio al recargar un sitio con subcategoria).
4. Backlog previo sin cambios: TSK-089 necesita migracion 008 en Neon
   (BLOQUEANTE); commit Ruta Salsera y TASK-013 siguen pendientes.

#### Riesgos activos
- **10 seeds sin-match** (candelario + 9 eventos multiformato: dia-del-arte-
  urbano-bogota, hearth-summit-bogota, la-vida-es-hoy-bogota,
  los-parceritos-villavicencio, mes-del-patrimonio-bogota, sabor-bogota,
  semana-del-bienestar-bogota, travesia-rio-magdalena, vive-mejor-bogota):
  quedan SIN `subcategoria` hasta revision manual de reglas o decision de
  Javier (comportamiento legacy intacto mientras tanto).
- ADR-016 NO tiene migracion de esquema -> el riesgo "deploy sin aplicar
  migraciones" NO aplica aqui (a diferencia de TSK-089/migracion 008).
- `cover` legacy plano (`cover_valor`/`cover_nota`) convive con el objeto
  `cover{valor,nota}`: el renderer lee objeto con fallback plano (H1). La
  reclasificacion no toca cover.

### Sesion bahia-malaga - PNN Uramba Bahia Malaga en directorio (2026-09-09) - TSK-091

Pagina dinamica de categoria `sitio` para el Parque Nacional Natural Uramba
Bahia Malaga (slug `bahia-malaga`, Buenaventura/Valle del Cauca, 3.9333,
-77.35): santuario de la ballena jorobada entre julio y octubre, manglares,
esteros, cascada La Sierpe y comunidades afro de Juanchaco/Ladrilleros/La
Plata. Patron Fase 9 completo (seed + loader + smoke + prod + docs), sin
re-investigacion: datos de `ficha-bahia-malaga.json` (ficha completa).

**Cambios (3 archivos nuevos en `scripts/`):**
- `scripts/seed-bahia-malaga.js`: upsert `ON CONFLICT slug`, modo `--dry`
  (default), ASCII-safe estricto (0 bytes >127; emojis en escapes \u),
  rating 0 (ADR-009, sin resenas sembradas), destacado=true, 5 fotos
  (primera HERO), FAQS 5 en destinos_detalles. TAGS sitio completos
  (entradas[1], tours[2], equipamiento[5], itinerario[5], fauna_flora[4],
  secretos[3], regulaciones, dificultad_tags[3], temporada_matriz).
- `scripts/load-bahia-malaga-api.js`: loader DELETE+POST a
  `https://exploraco.vercel.app/api/admin-destinos` (Bearer exploraco12345).
- `scripts/smoke_test_bahia_malaga.js`: buildHTML() en sandbox vm
  (fake_neon.js) con `det` explicito (faqs + entradas/tours/equipamiento) y
  las 5 fotos como fotosRows (galeria solo renderiza con >1 foto).

**Fotos resueltas (BUG-022):** las 10 URLs de FOTOS_SUGERIDAS de la ficha
daban `missing` en Wikimedia Commons -> se buscaron reales y se verificaron
HEAD 200: HERO "Ballena jorobada y ballenato en Bahia Malaga" (unica foto
georeferenciada del parque en Commons), ballena jorobada yubarta, manglar
del Pacifico (Bahia Solano, misma ecorregion), calle de Juanchaco y playa
de Juanchaco.

**Verificado en produccion (2026-09-09):** Escudo GOLD: node --check 3/3
PASS; ASCII-safety 0/0/0 en los 3; smoke 15/15 PASS con balance de divs
361/361 (los checks de FAQ y galeria usan `id="faq"` / `id="galeria"` del
renderer; la galeria requiere fotosRows con >1 foto). Carga en prod via
loader: POST /api/admin-destinos OK (id 1d233452-9728-4e90-be80-f5b611337129,
status=published, destacado=True). GET /bahia-malaga.html = 200 (79.763
bytes) con las 9 secciones del motor sitio renderizadas (entradas, tours,
fauna, secretos, itinerario, checklist, faq, galeria, mapa); slug presente
en /api/destinos?categoria=sitio (name "Parque Nacional Natural Uramba
Bahia Malaga", rating 0, total sitio 74) y en sitemap.xml (HTTP 200).

#### Que sigue
1. **Commit + push (PENDIENTE):** 3 scripts en `scripts/` + TASKS.md/TSK-091
   (ya escrita) + NEXT.md (este segmento).
2. Backlog vigente de sesiones anteriores (commit TSK-090 ADR-016 y
   reclasificacion en produccion, migracion 008 de TSK-089 en Neon,
   referentes-agenda.md, TSK-077 docs, hostales legacy sin seeds, TASK-013,
   etc.).

### Sesion comunidad-chat-planes-backend - chat y planes reales con gaming (2026-09-08) - TSK-089

Rediseno del apartado social de `comunidad.html` (tabs Chat y Planes)
conectado al backend real de Neon y con gaming completo (XP, misiones,
logros). Calibracion con Javier: XP de chat +2 por mensaje con tope diario
20 XP (anti-farming en `usuarios.progreso_social`); crear plan gateado por
chat desbloqueado (nivel 3); sin sesion = chat y planes bloqueados con CTA
de login (se elimino el demo local de ambos tabs; Ranking conserva su
fallback).

**Cambios:**
- `db/migrations/008_comunidad_social.sql` (NUEVO): `chat_salas` (+ seed
  idempotente de 6 salas del sistema con emojis `E'\U...'`, BUG-026),
  `chat_mensajes` (moderacion fijado/activo), `planes_viaje` +
  `planes_miembros` (PK compuesta), `usuarios + progreso_social jsonb`.
  Idempotente (ADR-008), ASCII 0 bytes > 127.
- `api/interacciones.js`: helpers `misionCompletada`/`chatXpDisponible`/
  `registrarChatXp`; GET `chat_salas`/`chat_mensajes`/`planes`/`planes_mios`;
  POST `chat_sala` (gate crear_chat), `chat_msg` (gate chat, +2 XP tope
  20/dia), `chat_mod` (gate moderador_chat: fijar/eliminar), `plan_crear`
  (gate chat, valida destino/cupos 1-50), `plan_unirse` (dedup 409, 403
  plan propio, 409 lleno), `plan_salir`; MISIONES +3 (mis_chat_activo +20,
  mis_plan_creador +25, mis_plan_unido +15); LOGROS +3 (logr_social_chat
  +30, logr_social_plan +35, logr_anfitrion +50) -> LOGROS 22. Sin endpoint
  nuevo (presupuesto 8/8, ADR-010).
- `comunidad.html`: tabs Chat/Planes consumen la API (polling 5s), envio
  optimista + XP toast, moderacion condicional, formulario de plan (no
  `prompt`), fix XSS (`esc()` en todo texto de usuario). Div balance 86/86.
- `scripts/test_logros_catalogo.js` (19 -> 22) y
  `scripts/smoke_test_comunidad.js` (NUEVO, 30 checks).

**Verificado:** `node --check api/interacciones.js` OK; ASCII 0 bytes > 127
y 0 backticks; `test_logros_catalogo.js` 12/12 PASS; `smoke_test_comunidad.js`
30/30 PASS; divs comunidad 86/86. Espec:
`docs/superpowers/specs/2026-09-08-comunidad-chat-planes-backend-design.md`;
ADR-015 en DECISIONS.md; TSK-089 en TASKS.md.

**Pendiente (BLOQUEANTE):** aplicar `db/migrations/008_comunidad_social.sql`
en Neon (Javier) — **solo en el editor SQL de Neon**; las herramientas que
exigen result set por sentencia fallan con las sentencias DDL (`result.rows`
undefined -> error "reading 'map'"). Sin ella: GET/POST de chat y planes
fallan con error SQL y las misiones/logros nuevos degradan a
no-completadas. Luego deploy y verificacion en vivo (polling de chat,
XP toasts, dedup de planes).

### Sesion hostalterraza-connector - conector automatico a la agenda (2026-09-08) - TSK-088

Conector `scripts/extraer-hostalterraza.js` para traer automaticamente los
eventos publicados de https://hostalterraza.vercel.app (Supabase `eventos`,
RLS anon publico) a la agenda de ExploraCO.

**Cambios:**
- `scripts/extraer-hostalterraza.js` (NUEVO, reutilizable): fetch a Supabase,
  filtros (proximos, sin pruebas/demos, sin campanas), geocode Nominatim con
  fragmento de calle + bounding box Bogota (evita Fontibon errado), foto HEAD
  200 (BUG-022), mapeo a schema eventos.json (slug `ht-*`, tipo_evento
  fiesta->musica, cine/cinematografia->cultura, campana->cultura, null->
  festival, lineup/boletos/faq desde config_landing). `--dry` previsualiza;
  fusiona en `eventos/eventos.json` (reemplaza ht-* previos).
- `eventos/hostalterraza.json` (lote normalizado, nuevo).
- `ingest-eventos/SKILL.md`: FASE A2 (fuente externa Hostal Terraza).
- `eventos/eventos.json`: +2 eventos `ht-*` (Afromango fest 11-sep, Tropilove
  12-sep). `scripts/seed-eventos-2026-09-08.js` regenerado.

**Verificado:** 13/13 subidos (total eventos prod 63); paginas
ht-afromango-fest-kouj.html y ht-salsa-flow-nt65.html = 200 con foto;
categorias/coordenadas correctas; node --check OK y ASCII 0 en el conector.

**Pendiente (opcional):** sincronizacion programada (GitHub Action cron) si
se quiere que corra solo antes de cada publicacion.

### Sesion lote-eventos-gemini - primera ingesta real de 11 eventos (2026-09-08) - TSK-087

Primer lote real end-to-end: Gemini investigo 11 eventos de Bogota
(septiembre 2026) con el prompt `GEMINI_EVENTOS_PROMPT.md`; el JSON quedo en
`eventos/eventos.json` y se subio con el pipeline de TSK-085.

**Cambios:**
- `eventos/eventos.json`: 11 eventos (ver TASKS TSK-087 para la lista con
  categorias y rangos). Se elimino la clave tipeada `fotos_sugerisedas` del
  evento de piano.
- `scripts/upload-eventos.js` (fix): los flags `--dry`/`--seed` ya no se
  toman como URL/TOKEN posicionales (bug: 'Failed to parse URL from
  --seed/...').
- `scripts/validate_eventos.js` y `scripts/upload-eventos.js` (fix):
  `process.exit()` -> `process.exitCode` para evitar el crash de libuv en
  Windows tras fetch (exit -1073740791).
- `scripts/seed-eventos-2026-09-08.js`: seed versionado del lote (nuevo).

**Verificado:** 11/11 subidos (total eventos 61 en /api/destinos?cat=evento);
paginas 200; categorias detectadas correctas; multidia correcto (MAMBO 8-13
Sep, danza 9-10 Sep). seed node --check OK y ASCII 0.

**FASE B completada (fotos, 2026-09-08):** `scripts/resolver-fotos-eventos.js`
(nuevo, reutilizable) resuelve `fotos_sugeridas` a URLs reales de Wikimedia
(thumbs 960px + HEAD 200, BUG-022) con fallback por recinto (tags.sede).
Resultado: 10/11 eventos con `foto_hero`+galeria reales (Teatro Mayor,
MAMBO, Biblioteca Virgilio Barco, Teatro Gaitan, Movistar Arena Bogota,
Parque Simon Bolivar, Humedal Tibabuyes, Plaza de los Artesanos); solo
`concierto-musica-andina-teatro-colsubsidio-2026` queda sin foto (no hay
foto real del recinto en Commons; hero con gradiente). Se corrigio un match
incorrecto (Movistar Arena tomaba foto de un palacio de Madrid) usando las
fotos reales `Movistar arena Bta abr 2018.jpg` y afines. Re-subidos 11/11
con `--seed` (seed regenerado, ASCII 0, node --check OK).

### Sesion gemini-eventos-prompt - prompt de investigacion de eventos (2026-09-07) - TSK-086

Prompt maestro para que Gemini investigue LOTES de eventos y entregue el JSON
de `eventos/eventos.json` listo para validar y subir.

**Cambios:**
- `.opencode/skills/gemini-research/prompts/GEMINI_EVENTOS_PROMPT.md`
  (NUEVO): plantilla generica por lote (N eventos, ciudad, rango fechas,
  tipos). Entrega un unico bloque ```json ``` (array) + `## Fuentes` fuera
  del JSON. `tipo_evento` obligatorio, fechas `YYYY-MM-DD` (fin >= inicio,
  multidia), coordenadas reales, sin ratings (ADR-009). Fotos como
  `fotos_sugeridas[]` (File:...), `foto_hero`/`fotos_galeria` vacios en el
  batch (se resuelven por evento, BUG-022).
- `ingest-eventos/SKILL.md`: FASE A (Gemini -> eventos.json), FASE B (fotos
  por evento: resolver fotos_sugeridas via Wikimedia y re-subir), FASE C
  (validar -> subir --seed -> verificar -> docs).
- `eventos/eventos.example.json`: bloques `fotos_sugeridas` (1 hero + 4) y
  faqs de ejemplo en los 2 eventos.
- `scripts/validate_eventos.js`: validacion opcional de `fotos_sugeridas`.

**Verificado:** validate PASS en el ejemplo (con fotos); FAIL (exit 1, 3
errores) en fotos mal formadas; upload --dry ignora fotos_sugeridas; smoke
30/30 PASS.

**Pendiente:** cuando el usuario lo pida, llenar la seccion `## 2. Lote a
investigar` del prompt, pegar en Gemini, guardar el JSON en
`eventos/eventos.json` y seguir FASE C.

### Sesion ingest-eventos - ingesta automatizada de eventos a la agenda (2026-09-07) - TSK-085

Herramienta para subir eventos a la agenda cultural en lote via API, sin
escribir seed+loader+smoke por evento.

**Cambios:**
- `scripts/validate_eventos.js` (NUEVO): valida un array JSON de eventos
  (slug, nombre, ciudad, lat/lng, fechas inicio/fin `YYYY-MM-DD`, sede,
  arrays, tipo_evento, slugs unicos). `--prod` avisa colisiones vs
  `/api/destinos?cat=evento`.
- `scripts/upload-eventos.js` (NUEVO): `node scripts/upload-eventos.js
  <archivo.json> [URL] [TOKEN] [--dry] [--seed]`. DELETE+POST por slug a
  `/api/admin-destinos` (idempotente). `--dry` valida sin subir; `--seed`
  genera `scripts/seed-eventos-<fecha>.js` (upsert, faqs/fotos, ASCII-safe).
- `eventos/eventos.example.json`: plantilla (schema + 2 ejemplos, uno
  multidia que cruza mes). `eventos/eventos.json`: arranca en `[]`.
- `.opencode/skills/ingest-eventos/SKILL.md`: wrapper de agente para
  automatizar el flujo end-to-end (generar JSON -> validar -> subir ->
  verificar -> docs).
- `agenda.html`: `?cat=evento&limit=50` -> `limit=200`.

**Verificado:** node --check OK en ambos scripts; ASCII 0/0; validate PASS
(ejemplo 2, vacio 0) y FAIL (exit 1, 9 errores) en payload invalido;
upload `--dry --seed` genera seed valido sin tocar produccion; agenda.html
parse OK; smoke_test_agenda.js 30/30 PASS.

**Pendiente:** llenar `eventos/eventos.json` con eventos reales y ejecutar
`node scripts/upload-eventos.js eventos/eventos.json --seed` (con --dry
primero) para poblar la agenda.

### Sesion agenda-tarjetas-sin-doble-enlace - tarjetas de evento limpias (2026-09-07) - TSK-084

Correccion del diseno de las tarjetas de la agenda: cada tarjeta era un
`<a>` al evento que ademas envolvia OTRO enlace ("Ver detalles →" en
`agenda.html` y un boton "Ver evento" en `index.html`), HTML anidado invalido
que el navegador renderizaba como DOS bloques clicables hacia el mismo evento.

**Cambios:**
- `agenda.html`: `evCard()` deja la tarjeta como unico `<a class="ev-card">`;
  el CTA pasa a `<span class="ev-cta">Ver detalles →</span>` no interactivo
  (dorado, translateX al hover); "Próximamente" como `.ev-cta.external`.
  CSS: se retiro el bloque `.ev-link-btn`.
- `index.html`: `renderAgenda()` sustituye el `<button class="ag-ev-action">`
  por `<span class="ag-ev-cta">` (gold/outline) sin interactividad duplicada
  ni stopPropagation; hover de tarjeta desplaza la flecha.

**Verificado:** parse de scripts inline OK; smoke_test_agenda.js 30/30 PASS.

### Sesion agenda-cultural-multidia - agenda con eventos multidia, vista por dia y categorias (2026-09-07) - TSK-083

Rework completo de la Agenda Cultural (seccion de `index.html` + `agenda.html`
+ `index-api-connector.js`) para que un evento que dura varios dias aparezca
en TODOS los dias/meses vigentes (requisito del usuario) y para que sea mas
facil de entender.

**Cambios:**
- `agenda-shared.js` (NUEVO, raiz): helper compartido `window.AgendaUtil`
  con `normDates`/`evActiveOn`/`evActiveMonths`/`evRangeText`/
  `detectEventCat`/`fold`. Rango [fecha_inicio, fecha_fin] inclusive;
  recurrentes anuales (day/month[/dayEnd/monthEnd]) resueltos al anio de la
  fecha consultada. ASCII-safe (0 bytes >127).
- `index.html`: strip por dia con "Hoy" + navegacion `‹ ›` (semana); puntos
  en TODOS los dias vigentes; clic en dia filtra activos ese dia; tarjeta con
  rango y chip "En curso"; orden cronologico; filtros conservan el dia;
  boton filtro "🎭 Cultura".
- `agenda.html`: evento aparece en cada mes activo (`evActiveMonths`);
  vista por dia (strip + "Hoy" + dia<-|->, `setDayFilter` limpia mes); rango
  en tarjeta + "En curso"; boton "🎭 Cultura"; `loadApiEvents` con inicio+fin,
  `time`=hora real, `loc`=sede.
- `index-api-connector.js`: `toAgendaEvent` con rango, `detectEventCat`,
  `loc`=sede, `time`=horario, color por categoria, tags/start/end.
- BUG preexistente: `loadApiEvents` usaba `d.nombre`/`d.ciudad` (undefined,
  la API expone `name`/`city`) -> ahora `d.name`/`d.city`.
- Rangos anuales a festivales hardcodeados (Carnaval 14-17 Feb, Feria de las
  Flores 1-10 Ago, Feria de Cali 25-30 Dic, Vallenato 27-30 Abr).

**Verificado (2026-09-07):** smoke_test_agenda.js 30/30 PASS; con datos
reales: 23/50 eventos activos el 7-sep-2026 (multidia como patrimonio 1-30
Sep, jazz expandido 4-27 Sep, teatro libre 31 Ago - 7 Sep); ulibro en Ago+Sep
y NO activo el 7 sep (termina el 6). Categorias: musica 15 / cultura 11 /
festival 20 / naturaleza 2 / gastro 2. node --check OK; parse inline scripts
OK; ASCII 0 en agenda-shared.js.

**Pendientes / notas:**
- Duplicados de DB (p. ej. `jazz-al-parque-2026` vs `jazz-al-parque`): se
  deduplican en pantalla por url, pero la limpieza de datos es tarea aparte.
- La deteccion de categoria es por palabras clave; eventos genericos sin
  keyword caen a 'festival'. Opcion futura: tag `tipo_evento` en los seeds
  (ya soportado por `detectEventCat`).

### Sesion centro-cultural-delia-zapata-olivella - creada la pagina dinamica del complejo cultural (2026-09-07) - TSK-082

Creacion y carga a produccion de la pagina dinamica del Centro Cultural
Delia Zapata Olivella (cat sitio, slug `centro-cultural-delia-zapata-olivella`,
destacado, rating 0). Investigacion de Gemini v2 en
`exploraco desarrollo/ficha-centro-cultural-delia-zapata-olivella.json`;
convertida al contrato .md con fotos reales verificadas HEAD 200 (BUG-022) y
validada con `validate_ficha.js` (PASS).

**Cambios:**
- `scripts/seed-centro-cultural-delia-zapata-olivella.js` (nuevo): patron
  seed-el-virrey, ASCII-safe (0 bytes >127, emojis/'·'/'²' en escapes \u),
  upsert `ON CONFLICT slug` con merge JSONB, FAQS en destinos_detalles y 5
  fotos (1ª HERO). `fauna_flora: ''` (paridad admin, evita seccion fantasma).
  Tours con rating ''/review_count 0 (ADR-009).
- `scripts/load-centro-cultural-delia-zapata-olivella-api.js` (nuevo):
  loader DELETE+POST a https://exploraco.vercel.app/api/admin-destinos
  (Bearer exploraco12345).
- `scripts/smoke_test_delia_zapata.js` (nuevo): 13 checks PASS + balance de
  divs 258/258.
- `exploraco desarrollo/ficha-centro-cultural-delia-zapata-olivella.md`:
  ficha contract validada (fuente de verdad del seed).
- Fotos (BUG-022): NO existe foto del edificio nuevo en Wikimedia Commons.
  Se usaron 5 reales y coherentes: HERO fachada Teatro Colon 2024 (el centro
  es su anexo), interior Teatro Colon, La Candelaria desde la carrera 4,
  Plaza de Bolivar 2024, Casa de Delia Zapata Olivella. Todas HEAD 200.

**Verificado en produccion (2026-09-07):**
/centro-cultural-delia-zapata-olivella.html = 200 (64KB) con las secciones
del motor sitio y divs 292/292; slug presente en /api/destinos (id
49dfe37c-6c55-471d-830c-c062533286a1, total 175) y en sitemap.xml.

### Sesion cinemateca-de-bogota - creada la pagina dinamica del centro cultural (2026-09-07) - TSK-081

Creacion y carga a produccion de la pagina dinamica de la Cinemateca de
Bogota (cat sitio, slug `cinemateca-de-bogota`, destacado, rating 0). La
investigacion de Gemini v2 llego como `exploraco desarrollo/ficha-cinemateca-de-bogota.json`;
se convirtio al contrato .md con fotos reales de Wikimedia verificadas
HEAD 200 (BUG-022; las 10 URLs que sugirio Gemini daban `missing`) y se
valido con `validate_ficha.js` (PASS).

**Cambios:**
- `scripts/seed-cinemateca-de-bogota.js` (nuevo): patron seed-el-virrey,
  ASCII-safe (0 bytes >127, emojis y '·' en escapes \u), upsert
  `ON CONFLICT slug` con merge JSONB, `FAQS` en destinos_detalles y 5
  fotos (primera HERO). `fauna_flora: ''` por paridad con admin.html (el
  campo es un textarea que se omite vacio; `'[]'` crearia seccion fantasma).
  Tours con rating ''/review_count 0 (no hay resenas sembradas, ADR-009).
- `scripts/load-cinemateca-de-bogota-api.js` (nuevo): loader DELETE+POST a
  `https://exploraco.vercel.app/api/admin-destinos` (Bearer exploraco12345).
- `scripts/smoke_test_cinemateca.js` (nuevo): 13 checks PASS + balance de
  divs 258/258; verifica FAQ via `det.faqs`, ausencia de `id="fauna"` y el
  formato de instagram que produce el renderer (`instagram.com/cinematecabta`).
- `exploraco desarrollo/ficha-cinemateca-de-bogota.md`: ficha contract
  validada (fuente de verdad del seed).
- Fix de modelos en `.opencode/agent/`: `deepseek/deepseek-v4-flash` no es
  un ID valido en el runtime (carga de agentes cacheada al inicio de sesion,
  por eso la delegacion a content-loader/docs-keeper sigue fallando hasta
  reiniciar). Corregidos a `deepseek-v4-flash` (sin prefijo de proveedor):
  content-loader, explore, research-agent, docs-keeper; js-silo-dev a
  `deepseek-v4-flash-free`. AGENTS.md y opencode.json siguen documentando la
  forma con prefijo.

**Verificado en produccion (2026-09-07):** /cinemateca-de-bogota.html = 200
(65KB) con las secciones del motor sitio y divs 291/291; slug presente en
/api/destinos (id 62a1099c-3bbf-43c3-9dcc-a892e67a4f64) y en sitemap.xml
(priority 0.80).

### Sesion Milestones v2 - Plan Maestro de Gaming (2026-09-07) - TSK-080

Implementacion del Plan Maestro de Gaming (Steam + SKATE + Albion) del
prompt `prompt gsming.txt`, con las 3 respuestas de calibracion de Javier:
(1) Own the Spot BAJO DEMANDA (SELECT+COUNT al cargar la pagina), (2)
Tabla de Destino como mapa de nodos SVG en mi-perfil.html, (3) Patrocinios
con opcion abierta (solo diseno, sin activacion). Spec versionado en
`docs/superpowers/specs/2026-09-07-milestones-v2-gaming-design.md` y
decision arquitectonica en DECISIONS.md ADR-014 (nota: el codigo lo
referencia como "ADR-013" en comentarios, numero ya ocupado por la web
oficial del hero -- ver nota en el ADR).

**Cambios:**
- `api/interacciones.js` (v6): helpers `esLiderDeCiudad`/`xpConMultiplicador`
  (x1.1 sobre XP base en los 4 POST: resena/guardado/visita/rating);
  GET `tipo=tabla_destino` (3 senderos Explorador/Critico/Organizador con
  fama derivada + niveles FAMA_TIERS por lectura, `patrocinios: []`);
  POST `tipo=review_voto` (dedup PK usuario_id+resena_id -> 409, 403
  self-vote, 503 si migracion 007 pendiente); 3 misiones nuevas
  (mis_own_spot_bogota +75, mis_gran_arquitecto +50,
  mis_itinerario_perfeccion +60) y 3 logros nuevos (logr_spot_domado +50,
  logr_especialista_gastro +40, logr_cazador_rarezas +100) -> LOGROS 19.
- `api/usuarios.js`: NIVELES 6 -> 15 (0/100/250/450/700/1000/1400/1900/
  2500/3200/4000/5000/6500/8500/11000) en 3 Eras (Mundano/Patrocinado/
  Organizador).
- `api/pagina-destino.js`: query `spotLider` bajo demanda (try/catch ->
  null sin migracion 007) + bloque HTML "Lider del spot" en secResenas
  (solo categorias != blog) + 8vo parametro opcional en `buildHTML`.
- `index.html`, `mi-perfil.html`, `comunidad.html`: XP_LEVELS 15; XP_BADGES
  sin los 5 badges muertos (caribe/andino/compartido/plan_maestro/social);
  mi-perfil anade seccion "Tabla de Destino" con arbol SVG y corrige
  `rareza_global` -> `rareza_pct` y contador desbloqueados/total (19).
- `db/migrations/007_milestones_v2.sql` (nuevo): `interacciones.votos_utiles`
  + indice parcial, tabla `resena_votos` (PK usuario_id+resena_id),
  `usuarios.patrocinios jsonb`. Idempotente IF NOT EXISTS.
  PENDIENTE de aplicar en Neon (Javier).
- `scripts/smoke_test_milestones_v2.js` (nuevo) y
  `scripts/test_logros_catalogo.js` (actualizado a 19 trofeos).

**Verificacion (Escudo GOLD):** node --check 5/5; ASCII-safety 0 bytes
>127 en api/*.js (1 doble-escape preexistente confirmado en
pagina-destino.js:1791, NO de esta tarea); smoke dedicado
`smoke_test_milestones_v2.js` 28/28 PASS (ejecutado localmente, balance de
divs 95/95) + `test_logros_catalogo.js` 12/12 PASS; smokes 4/4. QA-auditor:
veredicto RECOMENDACION con H-1 (self-vote -> 403) y H-2 (escritura
silenciosa -> 503) YA CORREGIDOS en el codigo, H-3 (contador 16 -> total)
corregido en mi-perfil.html, H-4 (GUIA_DE_DESARROLLO.md seccion 7.7)
corregido. Prod NO se toco (codigo viejo hasta el deploy).

#### Que sigue
1. **Migracion 007 en Neon (BLOQUEANTE, la ejecuta Javier en consola):**
   `db/migrations/007_milestones_v2.sql`. Sin ella: POST review_voto -> 503,
   spotLider degrada a null, multiplicador x1.1 inactivo y tabla_destino
   devuelve `patrocinios: []` normal (la fama de senderos si funciona).
2. **Commit + push (PENDIENTE):** spec nuevo + cambios en api/interacciones.js,
   api/usuarios.js, api/pagina-destino.js, index.html, mi-perfil.html,
   comunidad.html + migracion 007 + 2 scripts + TASKS.md/TSK-080 +
   DECISIONS.md/ADR-014 + NEXT.md (este segmento). Tras el push, deploy de
   Vercel.
3. **Verificacion en vivo tras deploy:** GET
   `/api/interacciones?tipo=tabla_destino&usuario_id=<uuid real>` con 3
   senderos y `patrocinios: []`; POST `tipo=review_voto` sobre una resena
   real (200, 409 al repetir, 403 al auto-votar); bloque "Lider del spot"
   en una ficha con resenas votadas (x1.1 XP en la ciudad del lider).
4. Backlog vigente de sesiones anteriores (commit TSK-079, referentes-agenda.md,
   TSK-077 docs, hostales legacy sin seeds, TASK-013, etc.).

### Sesion Pagina dinamica Parque Mundo Aventura (2026-09-07) - TSK-079

Nueva pagina dinamica de categoria `sitio` para el Parque Mundo Aventura
(Bogota, Kennedy - Hipotecho; Carrera 71D # 1-14 Sur), el parque de
atracciones numero uno de Colombia por visitantes (13 ha, abierto en 1998,
Gravity 57 m). Patron Fase 9 completo (ficha + seed + loader + smoke) con
datos verificados 2026 (mundoaventura.com.co, Wikipedia, kennedy.gov.co,
visitbogota.co/IDT).

**Cambios:**
- `exploraco desarrollo/ficha-parque-mundo-aventura.md` (nueva): ficha con
  datos verificados 2026.
- `scripts/seed-parque-mundo-aventura.js` (nuevo): seed sitio con 21 keys
  TAGS, 8 fotos, 5 FAQs, destacado=true, rating 0 (ADR-009). Precios 2026:
  Pasaporte Gold $95.000 / Silver $84.000 / Kids $73.000 / FilaExpress
  $73.000; ingreso al parque gratuito.
- `scripts/load-parque-mundo-aventura-api.js` (nuevo): loader idempotente
  DELETE+POST a /api/admin-destinos (Bearer exploraco12345).
- `scripts/smoke_test_parque_mundo_aventura.js` (nuevo): smoke test local
  de buildHTML() sitio.

**Verificacion (Escudo GOLD):** node --check OK en los 3; ASCII-safety
0 bytes >127 en los 3; smoke 15 checks PASS + balance de divs open=339
close=339 diff=0. Carga en prod via loader: destino creado id
47692fc4-1775-47e2-96fd-36eaae5004b4 status=published destacado=True.
Verificacion en vivo 2026-09-07: /parque-mundo-aventura.html = 200 (15
secciones del motor sitio, hero con chip de dominio y boton "Sitio web
oficial", rating 0.0/0 resenas); /api/destinos?categoria=sitio lista el
slug; sitemap.xml incluye el slug. Nota: coordenadas corregidas a lat
4.622054, lng -74.134912 (el borrador inicial apuntaba ~4 km al norte).

#### Que sigue
1. **Commit + push (PENDIENTE):** ficha-parque-mundo-aventura.md + 3 scripts
   en `scripts/` + TASKS.md/TSK-079 + NEXT.md (este segmento).
2. Backlog vigente de sesiones anteriores (commit TSK-078, referentes-agenda.md,
   TSK-077 docs, hostales legacy sin seeds, TASK-013, etc.).

### Sesion Referente agenda + 3 eventos de hoy (2026-09-07) - TSK-078

El usuario pidio (1) registrar en memoria el Instagram
@quehaypahacerenbogota como referente de la agenda y (2) extraer de ahi los
eventos de hoy (lunes 7 sep 2026). Hallazgo: Instagram NO es scrapeable
(el fetch solo devuelve el logo base64; el contenido diario vive en Stories
efimeras). Se documento el referente y se usaron fuentes oficiales abiertas
para verificar los datos.

**Cambios:**
- `exploraco desarrollo/referentes-agenda.md` (nuevo): referente principal
  @quehaypahacerenbogota (inspiracion, no scrapeable) + fuentes oficiales
  verificables (bogota.gov.co/que-hacer/agenda-cultural, idartes.gov.co/es/agenda,
  culturarecreacionydeporte.gov.co/es/eventos, visitbogota.co/es/agenda-de-eventos,
  tuboleta.com, idpc.gov.co) + como usarlas (patron Fase 9).
- 3 paginas dinamicas de evento (patron Fase 9, 9 archivos ASCII-safe):
  1. `jazz-expandido-bogota` - temporada de jazz del CNA, 4-27 sep 2026.
  2. `mes-del-patrimonio-bogota` - Mes del Patrimonio 2026 (IDPC/SDCRD).
  3. `transitos-fragmentados-bogota` - exposicion fotografica en CEFE Chapinero,
     3-12 sep 2026.

**Verificacion (Escudo GOLD):** node --check 9/9 PASS; ASCII-safety 0 bytes
>127; smokes 3/3 PASS con divs balanceados (190/190, 180/180, 168/168).
Carga a prod via loaders (Bearer exploraco12345): los 3 published (ids
c9b13826-..., c18674eb-..., e8771df6-...). Las 3 URLs .html = 200 (58-61KB);
/api/destinos?cat=evento lista 50 eventos con day/month 4/1/3 Sep; sitemap
incluye los 3 slugs.

#### Que sigue
1. **Commit + push (PENDIENTE):** referentes-agenda.md, 9 scripts en
   `scripts/`, TASKS.md/TSK-078 y NEXT.md (este segmento).
2. Backlog vigente de sesiones anteriores (commit TSK-077, TSK-076 docs,
   hostales legacy sin seeds, TASK-013, etc.).

### Sesion Canon del Guejar + Las Gachas en directorio (2026-09-07) - TSK-077

Dos paginas dinamicas de categoria sitio agregadas al directorio (patron
TSK-073 la-k-zona), creadas por investigacion web de maravillasdelguejar.com
(canon) y sinitinerario.com (Las Gachas) y aprobadas por el usuario
("si y si": ambas paginas dinamicas + tarjetas en los directorios; el canon
representa el DESTINO con el operador Maravillas del Guejar como contacto/web).

- `canon-del-guejar` (id 83, Mesetas/Meta): rafting 17 km cat 3 desde
  $357.000, 5 Maravillas del Parque Guejar, jacuzzis, charco azul, etc.
  Web/contacto = operador Maravillas del Guejar.
- `las-gachas` (id 82, Guadalupe/Santander): pocetas de agua turquesa en
  piedra roja, 20 min por el Camino Real; sin web oficial (campo web
  vacio; reserva referencia sinitinerario.com/las-gachas/).

Cada pagina = ficha .md + seed + loader + smoke (6 scripts ASCII-safe),
cargadas en prod con DELETE+POST Bearer exploraco12345 (las-gachas
fd216d5c..., canon-del-guejar 9501e3b7...) y verificadas en vivo
(200, todas las secciones sitio renderizadas, /api/destinos?categoria=sitio
69, sitemap con ambos). Tarjetas estaticas ids 82/83 agregadas a
directorio.html y directorio-sitio.html (PLACES inicio + FEAT final +
PHOTOS). Rating 0 (ADR-009); el badge hero "4.8 - Nuevo" es placeholder
del motor, no dato guardado.

#### Que sigue
1. **Commit + push (PENDIENTE):** fichas x2, 6 scripts, directorio.html,
   directorio-sitio.html, TASKS.md/TSK-077 y NEXT.md (este segmento).
2. Backlog conocido (NO TSK aun, en fin): el renderer construye el link de
   Instagram con la cadena sin '@' (pagina-destino.js:1569); los seeds
   guardan el handle por tanto sin '@'. Si admin.html llegara a guardar
   handle con '@' no rompe (paquete replace('@','')); si guardara URL
   completa 'https://instagram.com/...' si rompe (doble https). Decidir
   normalizacion en admin.html/seed para futuro ADR.
3. Resto del backlog: estaticos de directorio.sitio siguen sin incluir
   nuevos slugs si no se editan (el conector API reemplaza PLACES solo en
   directorio-<cat>.html, no en directorio.html).

### Sesion Documentacion batch 31 ago - 6 sep 2026 (2026-09-05) - TSK-076

Registro documental del batch de eventos de la semana 31 ago - 6 sep 2026
que ya estaba en produccion sin entrada propia en TASKS.md. Se verificaron
en vivo los 10 slugs completos del batch contra la API de produccion
(semana-del-bienestar-bogota, libera-2026-bogota,
festival-teatro-libre-bogota, hearth-summit-bogota, sabor-bogota,
vive-mejor-bogota, dia-del-arte-urbano-bogota, ulibro-bucaramanga,
medejazz-medellin, travesia-rio-magdalena) y se creo TSK-076 como
entrada separada de TSK-074 (semana 5-11 sep, commit 71d18f7).
Sesion de documentacion solamente, sin cambios de codigo.

#### Que sigue
1. Commit + push de TASKS.md/TSK-076 + NEXT.md (este segmento).

### Sesion Campo web oficial prominente en hero de la ficha (2026-08-31) - TSK-075 / ADR-013 + BUG-028

Auditoria del campo `destinos.web` (pagina web oficial): se confirmo que el
dato se captura (publicar.html `sitio_web`, admin.html `f-web`), persiste
y viaja en la API, pero solo se publicaba en UN punto (boton secundario
"Sitio web" en la seccion Contacto de pagina-destino.js:1554). El home,
directorios, agenda y schemaLD lo ignoran pese a que los conectores ya lo
exponen (index-api-connector.js:57, directorio-api-connector.js:51).

**Decidido (usuario):** elevar la web oficial a informacion prominente en
el hero de la ficha. Cambios en `api/pagina-destino.js`: helper
`dominioWeb(u)` que extrae hostname legible (sin protocolo ni "www."), chip-
link `.hqi.hqilink` en la fila HQI que muestra el dominio, y boton CTA
primario "Sitio web oficial" (`hbtn`) al inicio de `hctar` en el hero. El
boton de Contacto se conserva (refuerza, no duplica). Blogs excluidos.
ADR-013 aprobado.

**Verificacion (Escudo GOLD):** `node --check` PASS; ASCII-safety 0 bytes
>127, 0 backticks; smoke dedicado PASS (31 checks: boton + chip de dominio
cuando hay `web`, ausencia total sin `web`, divs balanceados 83/78); los 39
smokes existentes PASS tras el cambio (ulibro 180/180, medejazz 188/188).

**BUG-028 (corregido en la misma sesion):** modal "Subiste de nivel" a
"Explorador" se mostraba en cada carga de `index.html`. Causa:
`_ultimoNivelVisto` se contaminaba con `0` en el render pre-sesion
(`initPoints()` corre antes de `usuario-session.js`), y luego la segunda
llamada con sesion real comparaba `100 > 0` = true. Fix en
`index.html:4069-4071`: solo persistir `_ultimoNivelVisto` cuando
`window.ExploraCO.usuario` existe. Registrado en BUGS_HISTORICOS.md
BUG-028.

#### Que sigue
1. **Commit + push (PENDIENTE):** `api/pagina-destino.js` (cambios) +
   TASKS.md/TSK-075 + DECISIONS.md/ADR-013 + NEXT.md (este segmento).
2. Verificar en prod tras deploy: las paginas con `web` (ulibro, medejazz,
   semana-del-bienestar, etc.) muestran el chip de dominio y el boton CTA
   en el hero; las sin `web` no muestran ninguno.
3. **Backlog conocido (no TSK aun):** extender visibilidad de `web` a home
   (renderDest/renderAgenda), directorios (renderDir + fallback PLACES),
   agenda (toAgendaEvent) y schemaLD JSON-LD -- decidir cuando prioridad
   lo justifique.

### Sesion 10 eventos semana 5-11 sep 2026 (2026-09-05) - seed + loader + smoke + prod (TSK-074)

El usuario pidio crear 10 paginas dinamicas de evento para la semana del
5 al 11 de septiembre de 2026 en Colombia, cada uno con su triple de
archivos (seed + loader + smoke, patron Fase 9 / TSK-068). 30 scripts
creados en `scripts/` (10 seeds + 10 loaders + 10 smoke tests).

**Los 10 slugs:**
1. `arcangel-medellin-2026` - Arcangel en Medellin, Atanasio Girardot,
   4-5 sep 2026, 5 sep agotado.
2. `ferias-y-fiestas-guaduas-2026` - Ferias y Fiestas de Guaduas,
   4-11 sep 2026, gratis.
3. `los-parceritos-villavicencio` - Lokillo y Jota P en Villavicencio,
   4 sep 2026.
4. `parranda-vallenata-barranquilla` - Samuel Morales y Jaime Luis
   Campillo en TRUQ, Barranquilla, 5 sep 2026, gratis.
5. `queentaesencia-homenaje-queen-medellin` - Trilogia Live Bar,
   Medellin, 11 sep 2026, cover $50.000.
6. `festival-cordillera-2026` - Festival Cordillera 2026,
   12-13 sep, Parque Simon Bolivar, 41 shows, lema "El futuro es latino".
7. `jazz-al-parque-2026` - Jazz al Parque ed. 29, 12-13 sep,
   Parque El Country, 17 agrupaciones, gratis.
8. `justin-quiles-lenny-tavarez-bogota` - Justin Quiles y Lenny
   Tavarez en Movistar Arena, 11 sep, puertas 5pm show 7pm, +18,
   general agotado.
9. `john-summit-chamorro-bogota` - John Summit en Chamorro Bogota,
   10 sep, show benefico 100% utilidades a victimas del sismo.
10. `stray-kids-bogota` - Stray Kids en Vive Claro, 9 sep,
    primera visita a Colombia.

Tags JSONB evento por evento (segun TASK-003): `fecha_inicio`, `fecha_fin`,
`edicion`, `sede`, `organiza`, `lema`, `lineup[]`, `agenda[]`,
`categorias_entrada[]`, `que_llevar[]`, `prohibido[]`.

**Verificacion (Escudo GOLD):** `node --check` 30/30 OK; ASCII-safety
0 bytes no-ASCII en los 30; 10/10 smoke tests PASS con balance de divs
(174-188 abiertos=cerrados). Nota de los smokes: el renderer de evento
usa los ids `id="tipos-entrada"` y `id="mapa"` y el mapa embebe
`google.com/maps?q=lat,lng` (no un `.0`); los checks de mapa deben usar
el query real, no `lat.0`.

**Carga a prod:** 10 loaders ejecutados contra `https://exploraco.vercel.app`
(Bearer default exploraco12345) -> todos `status=published` con 5 fotos y
5-6 FAQs. Verificacion HTTP: las 10 URLs `.html` = 200 (~55-61KB) con
contenido correcto y balance de divs 0. `/api/destinos?cat=evento` lista
47 eventos. Nota: el custom domain `exploraco.co` NO resuelve desde
el sandbox (DNS local), se verifico contra el deployment `exploraco.vercel.app`.

#### Que sigue (CERRADO 2026-09-05)
1. **Commit + push:** COMPLETADO -- commit `71d18f7` a main
   "feat: 10 eventos sem 5-11 sep como paginas dinamicas (TSK-074) -
   seeds, loaders y smoke tests en prod". Los 30 archivos en `scripts/`
   quedan versionados.
2. Verificar en prod tras deploy: las 10 URLs sirven las paginas dinamicas
   de evento y aparecen listadas en `/api/destinos?cat=evento` (ya
   verificado: 47 eventos, paginas 200 OK ~55-61KB).
3. Backlog vigente: completar tags vacios legacy (~18 eventos/comidas) y
   pendientes de sesiones anteriores (commit Ruta Salsera/TSK-066-067,
   TSK-070 verificar prod, TASK-013, hostales legacy sin seeds, etc.).

### Sesion La K-zona en directorio (2026-08-28) - seed + loader + smoke + prod (TSK-073)

El usuario pidio incluir el espacio La K-zona en el directorio de
ExploraCO. El usuario eligio la categoria `sitio` (mismo patron que
Espacio Kinder / Theatron / Gate Club). Investigacion desde la fuente
oficial (lak-zona.org: Raices, Las Zonas, Turismo, Juntes) + IG
@lakzonaeslazona + Eventario/Yandex para la direccion exacta.

Datos clave de LaK-Zona (Espacio Cultural Artistico Alternativo):
- Direccion: Calle 15 # 9-64, barrio Veracruz, Centro Historico de
  Bogota (a pocos metros del Eje Ambiental / Av. Jimenez / Rio Vicacha
  y del Museo del Oro). Antiguo Hotel Moderno.
- ONG LaK-Zona // ASOCAMEC, sin animo de lucro, desde 2010 (formalizada
  2015); colectivo de artivistas/gestores que fomenta Derechos Culturales.
- Espacios (Las Zonas): studio produccion musical, ensayos (acustico/
  bateria), danza o circo (20 m2), proyeccion audiovisual/cine (30 m2,
  aforo 40), K-Fe (70 m2, aforo 80), Auditorio (escenario 265.5 m2,
  aforo 500), Galerias (45 m), Oficinas/Coworking.
- Turismo comunitario: Museo Urbano-Ancestral de la Memoria (1000+ m2),
  residencias artisticas (apartaestudio 30 m2, 6-12 personas), visitas
  guiadas.
- Programacion semanal de entrada libre 5pm-11pm: mier Sesiones PIYAA
  (Hip-Hop), jueves Somos Calle, viernes Junte Salsero, sab K-Fe (rana,
  karaoke, 2x1).

**Archivos creados:**
- `scripts/seed-la-k-zona.js` - seed sitio completo (BASE, TAGS, FAQS,
  5 fotos Wikimedia pool del Centro; 8 zonas, 4 entradas, 2 tours, 4
  equipamiento, 4 itinerario, 4 secretos, 4 regulaciones, 6 FAQs)
- `scripts/load-la-k-zona-api.js` - loader a prod via /api/admin-destinos
- `scripts/smoke_test_la_k_zona.js` - smoke local de buildHTML() sitio

**Verificacion:** node --check OK (los 3), ASCII-safe clean (0 no-ASCII;
se escondieron los m^2 como \u00b2), smoke 11/11 PASS con balance de
divs 0. Puesta en produccion via loader: /la-k-zona.html 200 (71KB) con
todas las secciones del motor sitio (dificultad, entradas, tours,
checklist, itinerario, fauna, secretos, regulaciones, galeria, mapa,
FAQ). slug=la-k-zona, id 2daadd88-831c-4584-8193-afdb4bc07d72.

**Nota:** las coordenadas usadas (4.5985, -74.0768) son aproximadas del
Centro Historico para calle 15 #9-64; conviene revisarlas contra OSM/
Nominatim en un futuro.

**Directorios estaticos actualizados (misma sesion):** aunque
`directorio.html` / `directorio-sitio.html` son HTML estatico con PL
embebido (no conectado a API), se agrego manualmente la tarjeta de
la-k-zona (id 81, cat sitio, Bogota/Cundinamarca, "Entrada libre", emoji
musical, hero_bg #7c2d12, foto Wikimedia del Chorro de Quevedo, rating
4.8/rev 120 coherente con las tours del seed) a `var PLACES` + `var
FEAT` (destacado) + `var PHOTOS` en AMBOS archivos. La tarjeta enlaza a
/la-k-zona.html. Verificado: node --check OK en las declaraciones
extraidas; PLACES de directorio-sitio.html 27->28 y de directorio.html
80->81.

#### Que sigue
1. **Commit + push (PENDIENTE):** seed + loader + smoke + directorios
   (directorio.html, directorio-sitio.html) + docs (TASKS/TSK-073, NEXT).
2. Directorios estaticos hostal/comida/evento: R10 y LaK-Zona tampoco
   aparecen aun en directorio-hostal.html / directorio-comida.html /
   directorio-evento.html (mismo backlog estatico de R10/TSK-072).
3. Revisar coordenadas reales de La K-zona en Nominatim/OSM.
4. Backlog vigente: verificar prod tras deploy, hostales legacy sin seeds,
   TASK-013, TSK-070, editor admin sin vaciar campos (PUT L236).

### Sesion Hostal R10 en directorio (2026-08-25) - seed + loader + smoke + prod (TSK-072)

El usuario pidio agregar el Hostal R10 (La Candelaria, Bogota) al
directorio. Investigacion: HW 8.8/10 (679 reviews), Booking 8.4
(1.858 reviews), casona historica remodelada para estudiantes de
intercambio, 18+ exclusivo, check-in 15:00-24:00, checkout 12:00,
cancelacion 24h, 4 dorms con literas privadas + 6 privadas, bar,
terraza con hamacas, city tour gratis, coworking, recepcion 24h.

**Archivos creados:**
- `scripts/seed-hostal-r10-bogota.js` - seed completo (BASE, TAGS,
  FAQS, 5 fotos Wikimedia pool, 3 habitaciones, 14 amenidades, 5
  actividades, 3 transporte, 5 FAQs)
- `scripts/load-hostal-r10-bogota-api.js` - loader (generado por
  _gen_hostales_pipeline.js)
- `scripts/smoke_test_hostal-r10-bogota.js` - smoke (generado)

**Archivos modificados:**
- `scripts/_gen_hostales_pipeline.js` - entrada R10 en HOSTELS array
  (ahora 11 hostales, 22 archivos generados)

**Verificacion:** smoke 11/11 PASS, node --check OK, ASCII-safe clean.
Pagina cargada a prod via loader: /hostal-r10-bogota.html 200 con
todas las secciones (hero, galeria, habitaciones, reglas, actividades,
como llegar, reservar, mapa, FAQ, resenas). Precio_desde corregido
a '$55.000' (fix de concatenacion '$55.000.130.000').

**Nota:** el directorio-hostal.html es HTML estatico con PL embebido
(no conectado a API). R10 NO aparece en el listado del directorio
hostal porque el PL es un snapshot estatico. Esto es backlog conocido
(TSK-072 follow-up).

#### Que sigue
1. **Commit + push (PENDIENTE):** seed + generador + docs.
2. Agregar R10 al PL embebido en directorio-hostal.html (y
   directorio.html, directorio-comida.html, directorio-evento.html,
   directorio-sitio.html) - backlog estatico.
3. Verificar en prod tras deploy: sidebar Blog con conteo, editar
   monserrate-guia-completa, preview fiel.
4. Mejora futura opcional del editor: permitir VACIAR campos en el PUT
   de api/admin-destinos.js (hoy ignora valores vacios, L236: no se puede
   quitar un video_url ya guardado).
5. Backlog vigente de sesiones anteriores (TSK-070 pendiente de verificar
   en prod, hostales legacy sin seeds, TASK-013, etc.).

### Sesion Modulo Blog en admin (2026-08-24) - sidebar visible + editor con preview (TSK-071)

El usuario reporto "estoy en admin.html y no veo nada relacionado a
blog". Hallazgo clave: el modulo blog SIEMPRE existio (filtro pill en la
tabla L618, categoria en el form, panel especifico-blog Historia/Autor,
buscador de autor, PUT/DELETE) pero NO tenia entrada en el sidebar --
updateNavCounts() hasta calculaba snav-count-blog sin encontrar el
elemento. Puro problema de descubribilidad + gaps de edicion.

**Implementado (solo admin.html, sin backend):**
- Sidebar "Blog" con contador tras Eventos + label 'BLOG' en
  showScreenCat (antes titulaba TODOS).
- Herramientas del cuerpo para cat=blog (visibilidad via
  updateBlogBodyTools enganchado a updateCatUI y newPlace): Ampliar =
  overlay fullscreen #blog-desc-overlay que CLONA f-desc en #f-desc-big
  y sincroniza de vuelta al cerrar (nunca mueve el original);
  Foto/Video insertan [foto:URL|caption] / [video:URL] en el cursor como
  bloque propio; contador palabras/min con formula EXACTA del motor
  (Math.max(1, round(palabras/200))).
- Preview #blog-preview-modal: blogBuildCuerpoHtml/blogVideoEmbedUrl =
  puerto literal de parseBlogBody/videoEmbedUrlBlog del motor; incluye
  titulo/lead/autor (_blogAutorNombre stash)/video principal; CSS replica
  .bfig/.bvid/.stext (motor L192-196). Cierra Esc/click-fuera/boton.

**Verificacion:** node --check inline OK; smoke de fidelidad vm 19/19
PASS extrayendo funciones reales de ambos archivos (esc del servidor
inyectado como _esc). Nota harness: inyectar global URL en la vm.
Detalle completo en TASKS.md TSK-071.

#### Que sigue
1. **Commit + push (PENDIENTE):** admin.html + TASKS.md/TSK-071 +
   NEXT.md. El usuario no pidio commit todavia.
2. Verificar en prod tras deploy: sidebar Blog con conteo, editar
   monserrate-guia-completa, preview fiel.
3. Mejora futura opcional del editor: permitir VACIAR campos en el PUT
   de api/admin-destinos.js (hoy ignora valores vacios, L236: no se puede
   quitar un video_url ya guardado).
4. Backlog vigente de sesiones anteriores (TSK-070 pendiente de verificar
   en prod, hostales legacy sin seeds, TASK-013, etc.).

### Sesion Fix Mi Mapa personal (2026-08-24) - arranque sin guardados + duplicados (TSK-070)

El usuario reporto dos bugs en la seccion "Mi Viaje"/Mi mapa personal de
index.html: (1) al iniciar no mostraba los sitios guardados y (2) el
listado mostraba items duplicados. Investigacion read-only (plan mode)
confirmo las causas raiz y se implemento el fix completo (alcance
aprobado por usuario: A+B+C).

**Causas raiz:**
- Bug 1 era una cadena triple: (a) el primer `renderMyMap()` corria antes
  de cargar `mm_saved`/`mm_visited` del localStorage (la carga estaba ~30
  lineas mas abajo, en LOAD SOCIAL STATE); (b) `index-api-connector.js`
  poblaba `MAPA_PLACES` async pero su `applyData()` nunca llamaba
  `renderMyMap()` -- riesgo ya anotado aqui como "renderMyMap() fuera del
  ciclo de refresco" -- asi que la seccion quedaba congelada vacia;
  (c) los guardados en Neon nunca se hidrataban:
  `ExploraCO.cargarMiMapa()` existia en usuario-session.js y nadie la
  llamaba.
- Bug 2: `renderMMList()` solo limpiaba `cont.innerHTML` en el camino
  vacio; con resultados, cada re-render acumulaba appendChild.

**Fixes (2 archivos):**
- index.html: `cont.innerHTML=''` siempre antes del forEach en
  renderMMList (~L3650); carga localStorage movida al bloque INIT antes
  del primer render (~L2878); nueva `_hidratarGuardadosDB()` junto a
  `_uuidDeId` (~L4177) que para usuarios con sesion trae UUIDs via
  tipo=mapa, los mapea a ids posicionales buscando `p._uuid` en
  MAPA_PLACES/PL, los une a mmSaved, persiste y re-renderiza; disparada
  desde el wrapper existente de renderMyMap (~L3790) y desde
  `window.onExploraCOUpdate`. Idempotente via flag `_mmHidratado`; si no
  hay sesion o MAPA_PLACES esta vacio sale SIN marcar flag (reintenta).
- index-api-connector.js: al final de `applyData()` se agrego
  `if (typeof renderMyMap === 'function') renderMyMap();`.

**Verificacion:** node --check OK en el conector y en el bloque script
inline unico de index.html (extraido a temp); smoke Node vm con la
funcion real extraida del HTML: 4/4 PASS. Detalle completo en TASKS.md
TSK-070.

**Riesgos/pendientes dejados explicitos:** (1) mm_saved sigue usando ids
posicionales dependientes del ORDER BY del API entre sesiones -- fix
estructural = guardar slugs/UUIDs (refactor que toca varias paginas,
backlog); (2) `clearMyMap()` borra solo local: con sesion activa los
guardados de BD reviven al recargar -- candidato: llamar quitarGuardado
por UUID desde clearMyMap.

#### Que sigue
1. **Commit + push (PENDIENTE):** index.html + index-api-connector.js +
   TASKS.md/TSK-070 + NEXT.md (este segmento). El usuario no pidio commit
   todavia.
2. Verificar en prod tras deploy: guardar lugar -> recargar -> aparece;
   filtros/tabs repetidos sin duplicar; login con guardados en Neon ->
   aparecen al cargar.
3. Backlog estructural opcional: migrar mm_saved a slugs/UUIDs.
4. Backlog vigente de sesiones anteriores (hostales legacy sin seeds,
   TSK-068 docs, TASK-013, etc.).

### Sesion Hostales top 10 de Bogota (2026-08-24) - 10 paginas dinamicas de hostal (TSK-069)

Se crearon DIEZ paginas dinamicas con `categoria_slug='hostal'` para los
mejores hostales de Bogota, replicando el patron Fase 9 (seed + loader +
smoke versionado) y activando las secciones propias de hostal del motor
(TASK-001/BUG-C): tabla de habitaciones con badges, pills Check-in/
Check-out/Recepcion, reglas de casa con quick facts, actividades, como
llegar con barrio_descripcion y eventos del hostal. El usuario aprobo la
lista final (mix ic\u00f1icos de La Candelaria + top rating de Chapinero);
todos `status='published'` + destacado editorial.

**Los 10 slugs:** cranky-croc-hostel-bogota (9.7, +4.000 resenas), masaya-
hostel-bogota (9.0, WhatsApp real 573106092782), botanico-hostel-bogota
(9.2, jardin+rooftop+yoga), viajero-bogota-hostel-spa (9.5, spa propio),
arche-noah-boutique-hostel-bogota (gestion alemana, sin booking/hw URL
verificada -> omitidos), granada-hostel-bogota (8.9, coworking+billar),
republica-cabin-beds-bogota (cabin beds blackout, adults-only),
82hostel-bogota (economico con parking), vecinos-by-la-palmera-bogota (9.7,
agenda semanal real en tags.eventos_hostal[]: Movie Night/Leyendas/
Boardgames/Tejo/Salsa) y karuss-hostel-bogota (9.9 el mejor calificado,
WhatsApp real 573057875998, desayuno incluido, pago solo efectivo).

**Cambios (31 archivos nuevos en `scripts/`):**
- 10 seeds (`seed-<slug>.js`): upsert SQL idempotente (`ON CONFLICT slug`),
  modo `--dry`, TAGS hostal completos (`tipo_alojamiento`, `checkin`,
  `checkout`, `recepcion`, `edad_minima`, `mascotas`, `cocina_compartida`,
  `barrio_descripcion`, `politica_cancelacion`, `reglas_casa`,
  `habitaciones[]` con badge popular/female/premium, `amenidades[]`,
  `actividades[]`, `que_incluye[]`, `transporte[]`, `eventos_hostal[]`).
- **`scripts/_gen_hostales_pipeline.js` (nuevo):** generador que produce los
  10 loaders + 10 smokes desde plantillas (evita copiar/pegar x20). Si se
  agregan mas hostales, editar su array HOSTELS y re-ejecutar.
- 10 loaders (`load-<slug>-api.js`): DELETE previo + POST a
  `/api/admin-destinos`; extienden el payload Morat enviando TAMBIEN
  top-level `checkin`, `checkout`, `habitaciones`, `amenidades`,
  `booking_url`, `hostelworld_url` y `airbnb_url:''` (admin-destinos los
  escribe en destinos_detalles; el motor los lee de det.*, ver hallazgo).
- 10 smokes (`smoke_test_<slug>.js`): buildHTML en sandbox vm (fake_neon.js)
  pasando `det` explicito; checks genericos derivados del seed.

**Hallazgo tecnico nuevo (importante para futuros smokes hostal):** el
fallback det->tags de `api/pagina-destino.js` (~L1854) vive en el wrapper
de produccion, NO dentro de buildHTML(). Llamar
`buildHTML(d, {}, [], [])` deja SIN renderizar la tabla de habitaciones,
las amenidades y las pills Check-in (se leen de det.*). Los smokes deben
construir `det = { habitaciones, amenidades, checkin, checkout, ... }`
desde el seed. En prod no hay riesgo porque admin-destinos persiste esos
campos top-level en destinos_detalles.

**Fotos:** 5 por hostal (hero + 4 galeria), todas reutilizadas del pool de
URLs Wikimedia Commons ya validadas en prod; captions honestas de barrio/
contexto (nunca interiores no verificados del hostel).

**Verificacion (Escudo GOLD):** `node --check` OK en los 31; ASCII-safety
0 bytes no-ASCII en los 31; smokes PASS x10 (11 checks en Vecinos por
eventos) con divs balanceados cada uno. Carga a prod: 10 POST
`/api/admin-destinos` OK (ids d44f0c11-, 0baa3fc5-, 344033a1-, 9891169d-,
8e4fe851-, bf88a8dc-, 63e850ef-, a9877c17-, 8052f1b9-, 2e1aaf93-) todos
published. Las 10 URLs `.html` = 200 en prod (59-62KB) con secciones
`habitaciones` + pill Check-in + `reglas-casa` + `actividades` +
`como-llegar`; Vecinos renderiza `eventos-hostal`; links wa.me solo en
Masaya/Karuss; booking/hostelworld donde verificados. Falso negativo
documentado: 'Heroes' aparece entity-encoded (`H&#233;roes`) por esc().

#### Que sigue
1. **Commit + push (PENDIENTE):** 31 archivos nuevos en `scripts/` +
   TASKS.md/TSK-069 + NEXT.md (este segmento). Los slugs ya estan vivos en
   prod y sitemap; el push solo versiona el codigo.
2. Si se quieren mas hostales (backups investigados: Sue Candelaria 8.6,
   El Yarumo 10.0, Spotty, Kuyay Ayllu 9.7), agregarlos al array HOSTELS de
   `_gen_hostales_pipeline.js`, crear el seed a mano y re-ejecutar.
3. Verificar que las 10 paginas aparecen listadas en /api/destinos?cat=hostal
   y en la UI (index.html Inspirate filtro Hostales) tras el deploy.
4. Backlog vigente: completar tags vacios legacy (~18 eventos/comidas y los
   18 hostales previos sin seeds versionados) y pendientes de sesiones
   anteriores (commit Ruta Salsera, TSK-068, TASK-013, etc.).

### Sesion Eventos semana 24-30 ago 2026 (2026-08-24) - 5 paginas dinamicas de evento (TSK-068)

Se crearon CINCO paginas dinamicas con `categoria_slug='evento'` para la
semana del 24 al 30 de agosto de 2026, replicando el patron Fase 9 (seed +
loader + smoke versionado). El usuario entrego la lista candidata, se
investigo cada evento (fechas, sedes, coordenadas, precios, horarios,
lineups, edad minima, ticketeras) y aprobo publicar los 5 tal cual, todos
`status='published'` + `destacado=true`.

**Los 5 slugs y datos clave:**
- `maroon-5-bogota`: Maroon 5 Love Is Like Tour, jue 27 ago, Coliseo MedPlus
  (Calle 80 km 1.5 via Cota), puertas 4 pm / show 9 pm, minima 14 anos,
  TaquillaLive (organiza Paramo); Etapa 1 $294.000-$671.000 total por
  localidad (Etapa 2 +$60.000); reprogramado desde 25 abr.
- `la-vida-es-hoy-bogota`: Camilo Cifuentes + Miguel Buitrago (Media Vida),
  jue 27 ago 7 pm, Universidad EAN Legacy (Cra 11 #78-47, Chapinero),
  boletaenlinea.co; reprogramado desde julio.
- `tardeando-el-centro-bogota`: FUGA ultimo viernes del mes, vie 28 ago
  1 pm a medianoche, centro historico/La Candelaria, mayoria de actividades
  gratis; lineup vacio (el renderer omite la seccion).
- `las-bartenders-el-musical-bogota`: cabaret cocteleria en vivo +
  acrobacias + musica, 120 min, 18+, Casa E Borrero Sala Arlequin (Park Way),
  jue-sab 8 pm hasta sab 29 ago (fecha_inicio 27 / fecha_fin 29), desde
  $86.000 (Dinaticket/Atr\u00e1palo).
- `juanpis-live-show-bogota`: The Juanpis Live Show benefico AGOTADO por el
  Choc\u00f3 (terremoto M7.4 del 10 ago, 100% del recaudo a Fundaci\u00f3n PLAN
  via Tuboleta), sab 29 ago puertas 2 pm / show 4-11 pm, Movistar Arena, 18+,
  PULEP PQB187; zonas de donacion $130k-$330k con disponibilidad 'Agotado'
  (badge tip-red); lineup 13 artistas (Feid, Carlos Vives, Kapo, Manuel
  Turizo, ChocQuibTown, Monsieur Perin\u00e9...).

**Cambios (15 archivos nuevos en `scripts/`):**
- 5 seeds (`seed-<slug>.js`): upsert SQL idempotente (`ON CONFLICT slug`),
  modo `--dry`, TAGS evento completos segun TASK-003 (`fecha_inicio`,
  `fecha_fin`, `edicion`, `sede`, `organiza`, `lema`, `lineup[]`, `agenda[]`,
  `categorias_entrada[]`, `que_llevar[]`, `prohibido[]`; Juanpis agrega
  `pulep`). Disponibilidad usa exactamente 'Disponible'/'Pocas'/'Agotado'
  (lookup exacto en `DISPONIBILIDAD_CLASS_EVENTO` de pagina-destino.js).
- 5 loaders (`load-<slug>-api.js`): DELETE previo + POST a
  `/api/admin-destinos` con Bearer exploraco12345 (default URL
  https://exploraco.vercel.app).
- 5 smokes (`smoke_test_<slug>.js`): buildHTML en sandbox vm (fake_neon.js),
  8 checks cada uno + balance de divs.

**Hallazgo tecnico nuevo:** `esc()` de `api/pagina-destino.js` codifica los
acentos como entidades numericas (`\u00ed` -> `&#237;`), asi que un
`html.includes('m\u00fasica')` falla aunque el texto este renderizado. Los 5
smokes traen helper `inc()` que compara tambien la version entity-encoded:
`html.includes(enc(s)) || html.includes(s)`. Aplica a CUALQUIER smoke futuro
que verifique strings con tildes.

**Fotos:** 5 por evento (hero + 4 galeria). Se reutilizaron URLs Unsplash ya
validadas en prod (Morat/Rock/Festivales al Parque) y se agregaron 4 nuevas
de cocteleria verificadas HEAD 200 antes de sembrar (patron BUG-022).

**Verificacion (Escudo GOLD):** `node --check` OK en los 15; ASCII-safety
0 bytes no-ASCII en los 15 (conversor temporal reemplaza cada code unit >127
por `\uXXXX`); smokes PASS x5 con divs balanceados (178/178, 146/146,
137/137, 133/133, 216/216). Prod: 5 POST `/api/admin-destinos` OK (ids
54a64de1-, 8276c138-, 3a35f099-, 3481dca9-, d1a918d5-) todos published +
destacado; las 5 URLs `.html` = 200 (55-60KB) con seccion `evento-fechas`;
`/api/destinos?cat=evento` paso de 22 a 27 con day/month derivados de
`tags.fecha_inicio` (27/27/28/27/29 Ago); sitemap.xml incluye los 5 slugs;
contenido clave verificado (Feid + Agotado + tip-red en Juanpis; $671.000 +
Coliseo MedPlus en Maroon 5). Ningun slug colisiono con HTML estatico en la
raiz.

#### Que sigue
1. **Commit + push (PENDIENTE):** 15 archivos nuevos en `scripts/` +
   TASKS.md/TSK-068 + NEXT.md (este segmento). Los slugs ya estan vivos en
   prod y sitemap; el push solo versiona el codigo.
2. Si se quieren mas eventos, replicar este patron (los datos investigados
   de esta semana quedaron documentados en TSK-068). OJO con el riesgo
   conocido: si un slug tiene pagina estatica vieja en la raiz, el estatico
   gana sobre el rewrite de Vercel (requiere `git rm` primero).
3. Backlog vigente: completar tags vacios legacy (~18 eventos/comidas) y
   pendientes de sesiones anteriores (commit Ruta Salsera, TASK-013, etc.).

### Sesion Ruta Salsera (2026-08-19) - 7 bares de salsa + guia de blog (TSK-066/067)

Se crearon **7 paginas dinamicas de categoria `sitio` (tipos_actividad='Salsa bar')** + **1 post de blog guia** (`categoria_slug='blog'`, multi-tema `temas:['cultura','noche','gastro','musica']`), siguiendo el patron seed+loader establecido (ej. TSK-052 Quiebracanto, TSK-047 bogota-gastronomia-guia).

**7 bares sitio (slugs):** galeria-cafe-libro (Parque 93/Palermo, 1982, orquestas top, galeria arte), el-goce-pagano (Las Aguas, 1978, mas antiguo, acetatos, intelectuales), sandunguera (Chapinero, 1994, Templo Salsa Clasica, clases Mie/Jue/Sab), salsa-camara (Chapinero, 1988, orquestas intl Aragon/Dan Den), habana-93 (Parque 93, 2006, lunch $29.900 12-16h + salsa vivo diario), rumbavana (Cra 19A con 16, 1992, rumba caleña, hermanos Soto), bar-continental (Cra 8 #66-18, 2020, speakeasy ron/vinilos TripAdvisor #1).

**Blog guia (slug ruta-salsera-de-bogota):** ~2.500 palabras, 8 fotos inline [foto:URL|texto] (Wikimedia Commons, thumbs 960px verificadas HTTP 200), multi-tema `cultura/noche/gastro/musica`, sin FAQs, sin video. Enlaza los 7 nuevos + Quiebracanto + Theatron (ya existentes). 3 rutas sugeridas (Centro, Chapinero, Parque 93) + logistica (TransMilenio, taxis, presupuesto, efectivo).

**Archivos creados (16):** `scripts/seed-<slug>.js` (7 sitio + 1 blog, upsert SQL idempotente, `--dry`), `scripts/load-<slug>-api.js` (8 loaders DELETE+POST a `/api/admin-destinos` Bearer exploraco12345), `exploraco desarrollo/ficha-<slug>.md` (8 fichas con datos verificados).

**Fotos:** 5 fotos por bar (hero + 4 galeria) + 8 fotos blog = 43 URLs Wikimedia Commons, todas thumbs 960px verificadas HTTP 200 (patron BUG-022). 3 fotos rate-limited en HEADs (429) funcionan en prod (diferentes IPs, cache).

**Carga a prod:** 8 POST `/api/admin-destinos` = OK (ids nuevos, status=published, destacado=true). Fotos verificadas HTTP 200.

**Verificacion (Escudo GOLD):** `node --check` OK en los 16 scripts; ASCII-safety 0 bytes no-ASCII; smokes: GET /api/destinos?cat=sitio total 65 (era 58, +7), slugs nuevos publicados; GET /api/destinos?categoria=blog incluye ruta-salsera-de-bogota; 8 URLs .html = 200; sitemap.xml incluye los 8 slugs nuevos; 9 fotos clave curl 200 (rate limits en HEADs son de mi IP, prod OK).

**Evidencia fisica de exito:** /api/destinos?cat=sitio paso de 58 a 65 destinos; 7 slugs nuevos + blog; 8 URLs .html = 200; sitemap con 8 slugs nuevos; 43 fotos verificadas; Escudo GOLD limpio en 16 scripts.

**Docs actualizados:** TASKS.md (TSK-066, TSK-067), NEXT.md (este segmento), BUGS_HISTORICOS.md (rate limits Wikimedia en HEADs, no bloqueantes).

#### Que sigue
1. **Commit + push (PENDIENTE):** 16 scripts nuevos + 8 fichas + TASKS.md/TSK-066/067 + NEXT.md (este segmento). Tras push, los 8 slugs ya estan en sitemap y prod.
2. (Opcional) TASK-013: asignar autor al post monserrate-guia-completa desde admin.html (migracion 004 ya aplicada).
3. Siguiente prioridad propuesta (P1): calidad de datos legacy -- completar tags/fecha/descripcion de los ~18 eventos y ~18 comidas con tags vacios (patron seed+loader de TSK-057..063), re-seedear ratings hardcodeados a 0 (ADR-009) y revisar slugs que ensombrecen rewrites (estaticos 205KB).

### Sesion P2 (2026-08-19) - Robustez del panel admin (TASKS.md TSK-065)

Tarea P2 aprobada por Javier sobre `admin.html` (~5.969 lineas actuales):
se cerro el desbalance PRE-EXISTENTE de 1 div (el `<div class="app">` de la
linea 447 nunca se cerraba; 633 vs 632 en git) y se corrigieron 4 bugs
reales de precarga/coleccion encontrados en la auditoria del flujo
`loadForm()`/`updateCatUI()`/`clearForm()`:

1. **Cierre del div raiz (Punto A):** un `</div>` insertado antes de
   `</body>` via Python `str.replace()` con ancla unica
   (`</script>\r\n</body>\r\n</html>`). Final del archivo ahora:
   `</script>\r\n</div>\r\n</body>\r\n</html>\r\n`.
2. **Precarga de tarjetas de secretos (Sitio/Extras):** `#secretos-list-admin`
   quedaba vacio al editar. `loadForm()` ahora parsea `p.secretos` (array o
   JSON string) y puebla las tarjetas (`.secreto-icono/.secreto-titulo/
   .secreto-tag/.secreto-color/.secreto-texto`), vaciando el textarea
   `f-secretos` (el collector prioriza tarjetas). Texto plano sigue por
   textarea.
3. **Correccion post-auditoria (qa-auditor):** la primera version del fix de
   secretos llamaba `esc()` (solo existia LOCAL en los builders de export
   L4398/4451/5079/5137, no era global) -> `ReferenceError: esc is not
   defined` en runtime al editar un sitio con secretos. El qa-auditor lo
   detecto con reproduccion Node `vm` (patron BUG-020) y se corrigio a
   `_esc()` (global, L3207/L4807). Leccion: node --check / balance de divs /
   ASCII NO detectan errores de scope; reproducir SIEMPRE en Node `vm`.
4. **Contaminacion cruzada en `collectAmenities()`:** el fallback global
   `.srv-check` (servicios del HOSTAL) corria cuando el contenedor no
   existia (ej: `#sitio-amenities-check`, que nunca se creo), contagiando
   sitio/comida con los servicios del hostal al guardar. Ahora el fallback
   solo corre con `!cid`.
5. **`clearForm()` incompleto:** faltaban resets de listas dinamicas de
   sitio (tours/checklist/dificultad-tags/entradas/itinerario/secretos),
   comida (menu/plataformas/dietas) y blog (tema multi/video/autor) + 12
   campos escalares que `loadForm()` precarga. "Nuevo lugar" ya no hereda
   datos del lugar anterior.

Verificacion (Escudo GOLD, BLUEPRINT seccion 8): balance global y
HTML-puro = 0 (634/634 y 519/519, pila 0); balance por zona de los 5
paneles `especifico-*` = 0; `node --check` limpio (script inline
extraido, 4.109 lineas); ASCII-safety 7.291 bytes >127 (baseline exacto,
0 nuevos); dobles escapes `\\u` = 0; verificacion runtime Node `vm`:
script completo carga sin ReferenceError, `_esc` global OK, y el bloque de
secretos crea la tarjeta y vacia `f-secretos` (PASS). Hallazgos menores
documentados sin tocar: `esc()` x4 (locales a export, una no escapa
backslashes), `setEditorMeta()` x2 (redundancias por hoisting) y
`#sitio-amenities-check` codigo muerto (ya inofensivo). Detalle completo
en TASKS.md TSK-065.

#### Que sigue
1. Commit + push (PENDIENTE): `admin.html` + TASKS.md/TSK-065 + NEXT.md
   (esta sesion) + `db/cleanups/001_limpieza_datos_prueba.sql` (P0). Tras
   el deploy, verificar que editar un sitio con secretos muestra las
   tarjetas al precargar y que un "Nuevo lugar" no arrastra datos previos.
2. (Opcional, facil) TASK-013: asignar autor al post monserrate-guia-completa
   desde admin.html (migracion 004 ya aplicada).
3. Siguiente prioridad propuesta (P1): calidad de datos legacy -- completar
   tags/fecha/descripcion de los ~18 eventos y ~18 comidas con tags vacios
   (patron seed+loader de TSK-057..063), re-seedear ratings hardcodeados a 0
   (ADR-009) y revisar slugs que ensombrecen rewrites (estaticos 205KB).

### Sesion P0 (2026-08-19) - Limpieza de datos de prueba + cierre TASK-020/012

Se ejecuto la limpieza P0 aprobada por Javier: eliminacion de 425 registros
basura de la BD de produccion y cierre documental de las migraciones 004/005.

Cambios y verificacion:
- **`db/cleanups/001_limpieza_datos_prueba.sql` (nuevo):** SQL versionado con
  la cascada manual (interacciones -> fotos -> detalles -> destinos) y el
  borrado del usuario de prueba. Ejecutado por Javier en la consola Neon.
- **Datos eliminados:** 424 destinos `test-hostal-verificacion-bogota-*`
  (386 draft + 38 archived) de una prueba masiva anterior; el evento
  `fiesta-r10` (published, descripcion basura, lat/lng 0) que aparecia en
  listados publicos; y el usuario 'prueba' (`0a865be8-...`, xp=0, sin
  interacciones).
- **Resultado en prod:** BD 552 -> 127 registros (todos published; 0 draft,
  0 archived). /api/destinos?cat=evento 23 -> 22 (sin fiesta-r10); stats
  destinos 122 -> 121; leaderboard solo `javier` (xp=10). 0 registros
  `test-hostal-*` restantes.

Hallazgo importante (corrige un falso positivo de sesiones previas):
- **Las migraciones 004 y 005 YA estaban aplicadas y el gaming ya
  funcionaba en prod.** El 500 de GET `tipo=logros` reportado antes era
  causado por probar con `usuario_id=test-check` (no es UUID valido;
  Postgres rechaza con `invalid input syntax for type uuid`), NO por la
  columna `progreso_logros` faltante. Verificado con el UUID real de
  javier (`3b78efad-...`): logros = 200 con catalogo de 16 trofeos y
  rareza %; /api/usuarios?id=... devuelve `total_logros`, `foto_url` y
  `ciudad_base`. Leccion: en endpoints que filtran por id, probar siempre
  con un UUID real de la tabla usuarios.
- **Cierre documental:** TASKS.md TASK-020 y TASK-012 -> COMPLETADA
  (evidencia real 2026-08-19), TASK-013 queda desbloqueada (asignar autor
  al post de Monserrate desde admin.html), nueva TSK-064 registra la
  limpieza.

#### Que sigue
1. (Opcional, facil) TASK-013: asignar autor al post monserrate-guia-completa
   desde admin.html ahora que la migracion 004 esta aplicada -- aparece la
   seccion "Quien escribe".
2. Siguiente prioridad propuesta (P1): calidad de datos legacy -- completar
   tags/fecha/descripcion de los ~18 eventos y ~18 comidas con tags vacios
   (patron seed+loader de TSK-057..063), re-seedear ratings hardcodeados a 0
   (ADR-009) y revisar slugs que ensombrecen rewrites (estaticos 205KB).

### Sesion actual (Fase 9) - Motor de eventos: Rock al Parque + Morat + Festival de Verano + Jazz al Parque + Salsa al Parque

Se crearon CINCO paginas dinamicas con `categoria_slug='evento'` servidas
por el motor, replicando el patron de los lugares (commit 5c43145):
seed + loader idempotente. El usuario pidio buscar los eventos mas
importantes de Bogota y eligio, en orden: Rock al Parque 2026, Morat World
Tour, Festival de Verano 2026 y luego Jazz al Parque + Salsa al Parque
(los 2 siguientes tras confirmar con el usuario la opcion recomendada:
completar el circuito Festivales al Parque, familia de Rock al Parque).

Cambios en esta sesion:
- **`scripts/seed-rock-al-parque.js` (nuevo):** datos de la edicion 30
  (30 anos) del festival, 10-12 oct 2026, Parque Simon Bolivar, gratis,
  26 artistas distritales confirmados por Idartes (bogota.gov.co
  17-ago-2026). TAGS evento completos segun TASK-003: `fecha_inicio`,
  `fecha_fin`, `edicion`, `sede`, `lineup[]` (26 con genero), `agenda[]`
  (3 dias + memoria), `categorias_entrada[]` (gratis), `que_llevar[]` (6),
  `prohibido[]` (5). 5 fotos verificadas (Wikimedia Commons, incl. foto de
  Rock al Parque en la plaza), 6 FAQs. ASCII-safe (0 bytes no-ASCII).
- **`scripts/load-rock-al-parque-api.js` (nuevo):** loader idempotente
  DELETE+POST via `/api/admin-destinos`, mismo patron de
  `load-candelario-api.js`.
- **`rock-al-parque.html` (eliminado con `git rm`):** el placeholder
  estatico (61 KB, caracteres corruptos) ensombrecia el rewrite
  `/:slug.html` en Vercel (los estaticos tienen prioridad sobre las
  rewrites). Con el estatico fuera, la URL publica sirve la pagina
  dinamica.
- **`scripts/smoke_test_rock_al_parque.js` (nuevo):** 8/8 PASS con los
  datos reales del seed + balance de divs 276/276.
- **`scripts/seed-morat-bogota.js` (nuevo):** concierto "Morat en Bogota:
  Ya Es Manana World Tour", 6 funciones 14/15/16/21/22/23 ago 2026 en el
  Movistar Arena (av. NQS con av. Jose Celestino Mutis, coords 4.6652,
  -74.0839). Primeras 3 fechas agotadas (Tu Boleta); 24 conciertos sold
  out en la gira; primer Latin Grammy 2025 por "Ya es manana"; incluye
  Casa Morat (experiencia inmersiva). Slug `morat-bogota` elegido para NO
  colisionar con el WIP `scripts/insert-eventos-bogota.js` (slug
  `morat-bogota-2026` aun sin commitear ni en Neon). 5 fotos verificadas
  (Unsplash), 5 FAQs.
- **`scripts/load-morat-bogota-api.js` + `scripts/smoke_test_morat_bogota.js`
  (nuevos):** loader idempotente y smoke 8/8 PASS + balance de divs
  213/213.
- **`scripts/seed-festival-de-verano-bogota.js` (nuevo):** Festival de
  Verano 2026 - Edicion 29 (IDRD con la Alcaldia Mayor de Bogota), del 31
  jul al 31 ago 2026, mas de 60 actividades gratuitas en toda la ciudad
  (ancla: Plaza de Eventos Parque Simon Bolivar 4.658056, -74.093889).
  Mexico pais invitado; celebracion de los 488 anos de Bogota; incluye el
  Conciertazo de Verano (1 ago, Plaza de Eventos: Calibre 50, Luister La
  Voz, Proyecto A, Jhon Onofre) y la Parada del Circuito Sudamericano de
  Voleibol de Playa (El Salitre). 5 fotos verificadas (Unsplash), 5 FAQs.
- **`scripts/load-festival-de-verano-bogota-api.js` +
  `scripts/smoke_test_festival_de_verano.js` (nuevos):** loader
  idempotente y smoke 8/8 PASS + balance de divs 184/184.
- **`scripts/seed-jazz-al-parque.js` (nuevo):** Jazz al Parque 2026 -
  Edicion 29, 12 y 13 sep 2026, Parque El Country (Av. Calle 127 #11D-90,
  Usaquen, coords 4.6986, -74.0304). El festival de jazz gratuito mas
  importante de Colombia y referente latinoamericano. Eje "Donde la
  memoria latina se convierte en encuentro". Gratis, organiza Idartes.
  5 fotos verificadas (Unsplash), 5 FAQs.
- **`scripts/load-jazz-al-parque-api.js` + `scripts/smoke_test_jazz_al_parque.js`
  (nuevos):** loader idempotente y smoke 8/8 PASS + balance de divs
  170/170.
- **`scripts/seed-salsa-al-parque.js` (nuevo):** Salsa al Parque 2026 -
  Edicion 27, 28 y 29 nov 2026, Parque Metropolitano Simon Bolivar
  (coords 4.658056, -74.093889). El festival gratuito de salsa mas grande
  de Colombia, cierre del circuito Festivales al Parque. Eje "La
  revolucion que nunca deja de sonar". Gratis, organiza Idartes. 5 fotos
  verificadas (Unsplash), 5 FAQs.
- **`scripts/load-salsa-al-parque-api.js` + `scripts/smoke_test_salsa_al_parque.js`
  (nuevos):** loader idempotente y smoke 8/8 PASS + balance de divs
  170/170.

Verificacion: `node --check` limpio en los 12 scripts; ASCII-safety 0
bytes no-ASCII en los 12; smokes 8/8 PASS cada uno + balance de divs. En
prod (via POST /api/admin-destinos): ids 754d852f-... (rock-al-parque),
22950e3d-... (morat-bogota), 340cd60f-... (festival-de-verano-bogota),
58d06891-... (jazz-al-parque) y 6b290c4e-... (salsa-al-parque), todos
status published + destacado. GET /api/pagina-destino?slug=X = 200 con
las 5 secciones de evento en los cinco; URLs publicas 200 (divs
balanceados: 213/213, 233/233, 218/218 y 219/219); sitemap incluye los 5
slugs; /api/destinos los lista con FAQs y fotos. Nota: el renderer lee
`tags.edicion`/`tags.sede` pero NO `tags.organiza` (campo informativo en
el seed, no se muestra).

#### Que sigue
1. **Commit + push (PENDIENTE):** el `git rm` de `rock-al-parque.html`
   solo surte efecto tras el deploy de Vercel (los 4 eventos nuevos no
   tenian estatico que ensombreciera el rewrite). Tras el push, verificar
   GET /rock-al-parque.html, /morat-bogota.html,
   /festival-de-verano-bogota.html, /jazz-al-parque.html y
   /salsa-al-parque.html = 200 con las secciones de evento.
2. Si el usuario quiere mas eventos, replicar este patron (seed + loader +
   TAGS evento) para los 18 existentes con tags vacios (ej. feria-libro-bogota,
   hip-hop-al-parque, etc.) o nuevos slugs. OJO: cada evento con pagina
   estatica vieja en la raiz necesita `git rm` antes (mismo conflicto que
   rock-al-parque).
3. Backlog sin commitear de la sesion previa (Fase 8): migracion 005 en
   Neon + deploy del sistema gaming + `scripts/insert-eventos-bogota.js`
   (untracked) y `agenda.html` modificado (no se tocaron en esta sesion).

#### Correccion agenda cultural (TSK-062, esta sesion)
- El usuario reporto 2 bugs: (1) los 5 eventos del motor se mostraban en la
  agenda del home con la fecha de HOY en vez de la fecha real; (2) en la
  agenda completa (agenda.html) los eventos nuevos no aparecian. Se corrigio
  en esta sesion (TSK-062): `api/destinos.js` ahora deriva `day`/`month`
  desde `tags.fecha_inicio` y devuelve `tags` en el listado;
  `index-api-connector.js` parsea `fecha_inicio` con `new Date(y,m,d)`;
  `agenda.html` usa `?cat=evento`, agrega con push (const) y lee `d.price`.
- **PENDIENTE de deploy (commit+push):** el fix en api/destinos.js solo
  surte efecto en prod tras el push. Verificar despues del deploy:
  GET /api/destinos?cat=evento debe devolver day/month (14 Ago, 12 Sep,
  28 Nov, 10 Oct, 12 Sep...) y tags.fecha_inicio para los 5 eventos;
  agenda.html debe listar Jazz/Salsa/Morat/Festival/Rock con su fecha real.

#### 5 lugares de comida en La Candelaria (TSK-063, esta sesion)
- Se crearon las primeras 5 paginas dinamicas de categoria `comida` con el
  patron seed + loader + smoke versionado: la-puerta-falsa-bogota,
  el-gato-gris-bogota, origen-bistro-bogota, la-fruteria-candelaria-bogota
  y la-casona-de-la-candelaria-bogota. Todas `published` + `destacado` en
  prod, TAGS comida completos (menu_destacado, horario_detallado,
  opciones_dieta, domicilio), smokes 7/7 PASS c/u, divs balanceados,
  fotos verificadas HTTP 200 (BUG-022).
- La Casona de la Abuela se descarto (esta en Toberin/Usaquen, norte, no en
  el centro); se reemplazo por La Casona de la Candelaria (Cra 6 #8-39).
- **PENDIENTE de commit+push:** 15 archivos nuevos en scripts/ (5 seeds +
  5 loaders + 5 smokes) + TASKS.md/TSK-063. Tras el deploy los slugs
  ya estan en sitemap; solo falta el push para versionar el codigo.

#### Riesgos activos (Fase 9)
- El `git rm` de rock-al-parque.html y los 4 eventos nuevos requieren
  commit+deploy para verse en la URL publica.
- Los eventos previos en Neon tienen tags vacios: si un slug con pagina
  estatica vieja se carga como dinamico, el estatico gana (Vercel) --
  revisar por evento antes de sembrar.
- Los 18 lugares de comida previos a TSK-063 siguen sin seeds versionados
  y con tags vacios en prod (barrio/lead vacios); si el usuario quiere
  completarlos, replicar el patron de TSK-063 para ellos.

### Sesion anterior (Fase 8) - Sistema gaming: logros/trofeos (consola + Upland) + voto en blogs

Se implemento el sistema de logros aprobado por Javier (ADR-012) reutilizando
el patron MISIONES v4 de `api/interacciones.js` (catalogo estatico server-side,
DAG via `requiere`, merge `||` de ADR-003) pero con shape de consola:
`tier` bronce/plata/oro/platino, `xp`, fecha de desbloqueo y rareza global %
estilo Steam. Pendiente del deploy: ejecutar la migracion en Neon (ver abajo).

Cambios en esta sesion:
- **`api/interacciones.js` v5:** catalogo `LOGROS` con 16 trofeos (6 de
  voto/opinion, 5 de conteo coleccion/visitas, 5 de coleccion por ciudad
  generados desde `CIUDADES_COLECCION`), `evaluarLogros()` ejecutado en los 4
  POST de XP con agregados memoizados, GET `tipo=logros&usuario_id=` con
  rareza via `jsonb_object_keys`, respuestas con `logros` (mantiene `misiones`).
  Comparacion de ciudad normalizada (TRANSLATE sin tildes + LOWER) porque Neon
  convive 'Bogota' y 'Bogota-con-tilde'.
- **`db/migrations/005_usuarios_progreso_logros.sql` (nuevo):** ALTER TABLE
  ADD COLUMN IF NOT EXISTS `progreso_logros jsonb NOT NULL DEFAULT '{}'::jsonb`
  (ADR-008: SQL versionado).
- **`api/usuarios.js`:** deriva `total_logros` del conteo de claves.
- **`usuario-session.js`:** `sumaLogrosXp`/`mostrarLogrosToast` ("Trofeo
  desbloqueado") en las 4 acciones de XP.
- **`api/pagina-destino.js`:** voto rapido `#qr-stars` habilitado en blogs
  (antes suprimido con `esBlogRes ? '' : ...`), copy "Califica este art" y
  contador "N opiniones" vs "N resenas".
- **`index.html`:** seccion Trofeos en el perfil (grilla con tier, rareza %,
  barra X/Y) + badge `[estrella] rating (N)` en tarjetas Inspirate.
- **`api/utilidades.js`:** blog-lista SELECT con `rating`/`total_resenas` y
  badge en las cards de blog.html.

Verificacion: `node --check` limpio en los 5 archivos JS + inline de
index.html; ASCII-safety 0 no-ASCII en los serverless; smoke del renderer
`scripts/smoke_test_blog_voto.js` 14/14 PASS; catalogo `scripts/test_logros_catalogo.js`
12/12 PASS. Prod NO se toco (sigue con codigo viejo).

#### Que sigue
1. **Migracion (BLOQUEANTE antes del deploy):** ejecutar en Neon
   `db/migrations/005_usuarios_progreso_logros.sql`. Sin ella, GET
   `tipo=logros` devuelve 500 y los POST degradan (evaluarLogros captura el
   error y devuelve `logros: []`). TASKS.md TASK-020.
2. Deploy de Vercel y verificacion en prod: voto en
   /monserrate-guia-completa.html dispara el toast de trofeo y +10 XP; GET
   logros responde con el catalogo; badge de rating visible en Inspirate y
   blog.html.
3. Commit + push pendiente de esta sesion (Fase 8) -- aun sin commitear.

#### Riesgos activos (Fase 8)
- ~~La migracion 005 NO esta aplicada en produccion~~ RESUELTO (2026-08-19):
  la migracion ya estaba aplicada y el gaming funcionaba; el 500 de logros
  era un falso positivo por probar con un id no-UUID. Ver segmento "Sesion
  P0" arriba.
- Los ids de logros quedan como convencion estable; cambiarlos invalida el
  progreso ya persistido en `progreso_logros`.

### Sesion anterior (Fase 7) - Blog: 6 entradas en produccion

Se continuo la expansion de la seccion Inspirate (blog) con 4 entradas
nuevas, siguiendo el patron validado en Theatron (Fase 5): seed con
`categoria_slug='blog'` + cuerpo ~2.800 palabras en `descripcion` TEXT,
marcadores `[foto:URL|texto]` inline, loader idempotente DELETE+POST via
`/api/admin-destinos`, smoke test local de `buildHTML()` antes de
desplegar.

Posts desplegados en esta sesion (verificados en produccion con 200 OK):
- **bogota-guia-para-el-viajero** (2.840 palabras, 5 figuras inline,
  temas tips/cultura, fotos de `seed-bogota.js`). ID: cd09d39c.
- **bogota-gastronomia-guia** (2.837 palabras, 7 figuras inline,
  temas gastro/cultura, fotos verificadas via API de Wikimedia Commons).
  ID: 5d14af37.
- **la-candelaria-recorrido-por-el-centro** (2.830 palabras, 5 figuras
  inline, temas cultura/tips, fotos de `seed-lacandelaria.js`). ID:
  335f25f3.
- **parques-y-espacios-verdes-de-bogota** (2.758 palabras, 7 figuras
  inline, temas naturaleza/tips, fotos de `seed-parque-simon-bolivar.js`
  y otros seeds de parques). ID: db8dc119.

Archivos creados: 8 (4 seeds + 4 loaders) en `scripts/`. Smoke test
`smoke_4posts.js` (temp) valida titulo, lead, figura count, sin FAQ,
sin Contacto, sin Destacado final, seccion Opinion, chips multi-tema
y sin Resenas del articulo. Verificacion final: 4 loaders ejecutados
contra prod, `/blog.html` muestra 6 entradas (Monserrate + Theatron
+ 4 nuevas).

### Sesion anterior (Fase 6) - Blog completo: listado + fotos/videos inline + resenas + diseno minimalista

La Fase 0 (desbloquear deploy) se completo: la causa era el limite de 12
Serverless Functions del plan Hobby de Vercel -- cada `.js` en `/api` cuenta
como funcion. Se movieron 57 scripts seed/load/test/patch de `api/` a
`scripts/` (commit `fc6b4f7`) dejando 8 endpoints reales, y se elimino el
`sitemap.xml` estatico corrupto (commit `a61cade`). Verificado en prod:
`/api/destinos?categoria=blog` con `temas[]`, index `tArr=true`, render blog
con keywords multi-tema, `/sitemap.xml` dinamico 17795 B.

Fases del blog ya COMMITEADAS y VERIFICADAS EN PROD:
- **Fase 1 (commit `c3311d8`):** `api/utilidades.js` bloque `?tipo=blog-lista`
  (antes de `diagnostico`) hace SSR de `/blog.html`: buscador client-side
  instantaneo (JSON embebido con `<` escapado a `\u003c` + script de filtro
  por texto/tema), grid de cards sin estrellas (ADR-007/009) con fecha,
  badge Destacado, min de lectura y ubicacion, chips multi-tema, LIMIT 50,
  dos estados vacios, canonical `https://exploraco.co/blog.html`, robots
  index. STATIC_PAGES suma `/blog.html` (priority 0.8, weekly) y CAT_PRIORITY
  suma `blog:'0.80'`. Rewrite en `vercel.json` ANTES de `/:slug.html`.
  `index.html:1434` boton "Ver todos los articulos" -> `href="blog.html"`.
  Prod: 200, cards, buscador OK.
- **Fase 2 (commit `8f48f42`):** `parseBlogBody()` en api/pagina-destino.js
  convierte `[foto:URL|texto]` -> figure.bfig (img+figcaption) y
  `[video:URL]` -> div.bvid (iframe via videoEmbedUrlBlog). Solo blog.
  CSS .bfig/.bvid agregado. Seed de Monserrate actualizado con 4 marcadores
  [foto:] (basilica, funicular, vista cima, flora). Post re-sembrado en prod
  (`node scripts/load-monserrate-guia-api.js`). Prod: 4 figures con foto y
  caption inline. Smoke fase2 16/16 PASS; regresion blog 19/19 PASS.
- **Fase 3 (codigo `f09de13` + docs/limpieza `7e05b88`):** resenas habilitadas
  para blog con formulario simplificado (estrellas 1-5 + nombre + comentario,
  sin dims, sin traveller_type, sin quick-rating). Titulo "Resenas del
  articulo". JS inline generico funciona igual (dims/traveller vacios).
  Smoke blog 23/23 PASS + regresion evento/sitio 13/13 PASS, balance divs 0.
  Prod verificado: seccion "Resenas del articulo" con formulario simplificado.
- **Fase 4 (commit `98eb7de`, verificada en prod):** variante de diseno moderno minimalista
  para `categoria_slug==='blog'` que distingue un articulo de un destino.
  Hero nuevo `.bhero`: foto de portada ancha (`.bcover` a todo el ancho,
  min(52vh,440px)) + bloque titulo/lead/chips limpio sobre fondo crema
  (`.bhin`/`.bhtitle`/`.bhslead`/`.bchips`), sin grid de 3 thumbs (`.prow`),
  sin botones Contactar/Como llegar/Guardar/Estuve aqui, sin barra dorada de
  rating (`.gstrip` desactivada para blog), sin subnav sticky (`subnav=''`
  si cat==='blog`). `<body class="blog">` activa columna de lectura ~720px
  (`body.blog .sin{max-width:720px}`), texto 16px/1.8
  (`body.blog .stext{font-size:16px;line-height:1.8}`), oculta la numeracion
  dorada (`body.blog .stnum{display:none}`). Se conservan todas las secciones
  del articulo (La historia con .bfig, video, FAQs, resenas, autor).
  Preview visual aprobado por el usuario via companion. Se agrego `.gitignore`
  (excluye .superpowers/ y fake_neon temporales). Ver DECISIONS.md ADR-011.
- **Fase 5 (commit `2ed18ff`, re-seed `cf9dea6d`, verificada en prod):**
  recorte editorial del seed de Monserrate de 6.278 a 3.018 palabras
  (conserva 35 parrafos, los 4 marcadores [foto:] y las 5 FAQs). Post
  re-sembrado en prod (`node scripts/load-monserrate-guia-api.js`). Prod:
  tiempo de lectura baja de 31 a 15 min, 4 figures bfig inline, HTML 61.0KB.
  Nota: el re-seed DELETE+POST cambio el id del post a `cf9dea6d`, dejando
  huerfanas las resenas de prueba del id anterior.
- **Fase 6 (cierre documental):** TASKS.md con TASK-015..019 COMPLETADA,
  DECISIONS.md con ADR-011, NEXT.md actualizado. QA final en prod OK
  (blog.html 200 con BLDATA/buscador/canonical/robots index,follow/divs 10/10;
  post 200 con BlogPosting/keywords/4 bfig/divs 91/91; sitemap con /blog.html
  y el slug del post).
- **Fase 7 (cierre documental):** TASKS.md con TASK-046..049, NEXT.md
  actualizado con 6 posts en blog. QA final en prod OK (blog.html 200,
  6 entradas, 4 posts con 200 OK, 5/7 figuras inline, sin FAQ, Opinion
  presente, chips).

### Sesion anterior (Agosto 2026) - Primera entrada real de blog + multi-tema

Se publico la PRIMERA entrada real de la seccion Inspirate (blog) en
produccion y se implementaron los cambios multi-tema (aun NO desplegados,
el deploy de Vercel sigue bloqueado -- ver TASK-011):

- **monserrate-guia-completa.html** (slug `monserrate-guia-completa`,
  `categoria_slug='blog'`, `status='published'`, `destacado=true`): post
  "El cerro que vigila a Bogota: guia completa para subir a 3.152 m" con
  cuerpo ~6.250 palabras (66 parrafos) en `descripcion` TEXT (parrafos
  separados por `\n\n`, el renderer usa `white-space:pre-line`), lead +
  highlight, 5 FAQs, 3 fotos de galeria + 1 hero (Wikimedia Commons,
  thumbs 960px verificadas con curl), video
  https://youtu.be/Bgtc-bsl9II (verificado via oEmbed, embed OK en
  render) y tags JSONB multi-tema
  `{tema:'cultura', temas:['cultura','naturaleza','aventura','tips',
  'gastro'], video_url:'https://youtu.be/Bgtc-bsl9II'}`. Sin `id_autor`
  por decision de Javier: la migracion 004 queda pendiente y el autor se
  podra asignar/editar desde admin.html despues (TASK-012/TASK-013).
  Archivos: `scripts/seed-monserrate-guia.js` (datos),
  `scripts/load-monserrate-guia-api.js` (loader idempotente DELETE+POST) y
  `exploraco desarrollo/ficha-monserrate-guia.md` (ficha con datos
  verificados). Verificado en produccion: GET /monserrate-guia-completa.html
  = 200 con JSON-LD BlogPosting, video embed, chip "Cultura", divs
  balanceados 80/80; `/api/destinos?categoria=blog` devuelve el post con
  `tema=cultura`; sitemap incluye el slug. Ver TASKS.md TSK-043.
- **Multi-tema (TSK-044, implementado en repo, NO desplegado):** los
  cambios transversales para que un destino/blog pueda tener varios temas
  (tags.temas[]) ya estan en los archivos locales y pasan node --check +
  ASCII-safety: `api/destinos.js` toPlace() expone `temas: tags.temas ||
  [tags.tema]` (mantiene el campo `tema`); `index.html` inspirateCardHTML
  usa `tArr[0]` (p.temas o p.tema) y renderInspirate filtra con
  `tArr.indexOf(filter)>=0`; `api/pagina-destino.js` array `temasBlog`
  normalizado + chips del hero con forEach + schemaLD agrega keywords
  multi-tema con safeJSON(d.tags); `admin.html` campo `f-blog-tema` ahora
  es `<select multiple>`, `CATEGORY_TAG_FIELDS.blog` usa
  {key:'temas', multi:true, localKey:'temas'}, `_buildTagsObj()` deriva
  `tags.tema = p.temas[0]`, `_applyTagsToLocal()` envuelve tags.tema en
  local.temas y `savePlace()` agrega collectCategoryTagFields(p,'blog').
  Ver DECISIONS.md ADR-010. El post publicado ya usa tags.temas[] porque
  el loader lo envio directo a la API; el chip "Cultura" en produccion
  sale de `temas[0]`/`tema` (compatibilidad).

**Bugs encontrados en esta sesion (ver BUGS_HISTORICOS.md):** la tabla
`categorias` de Neon NO tenia la fila `'blog'`, por lo que el FK
`destinos_categoria_slug_fkey` rechazaba el INSERT con error 500 (bug
latente: el modal publico de blog de `api/publicar-lugar.js` habria
fallado igual). Se resolvio manualmente insertando la categoria via
consola Neon (`INSERT ... ON CONFLICT (slug) DO NOTHING`); el loader de
blog da error claro 500 si la categoria no existe. Ademas, leccion SQL
nueva: en PostgreSQL `'\ud83d\udcdd'` SIN prefijo E es un literal de 12
caracteres (backslash + texto) que revienta columnas varchar(10)
(SQLSTATE 22001 "value too long") -- hay que usar `E'\ud83d\udcdd'` o el
emoji real; aplica a la columna `emoji` de `categorias` y a cualquier
varchar corto. Y hallazgo de auditoria: admin.html tiene un desbalance
PRE-EXISTENTE de 1 div (632 abiertos vs 631 cerrados en git), no
introducido por esta sesion -- ver Riesgos activos.

### Sesion previa (Agosto 2026) - Paginas dinamicas lacandelaria.html y bogota.html

Se crearon cinco paginas de destino dinamicas nuevas servidas por el motor
`api/pagina-destino.js` (patron monserrate.html), cargadas en produccion:

- **lacandelaria.html** (slug `lacandelaria`, cat sitio): pagina de La
  Candelaria con datos del formulario admin (fuente: ficha-lacandelaria.md),
  `status='published'`, `destacado=true`, rating en 0 hasta resenas reales
  (decision de producto, ver DECISIONS.md ADR-009). Carga via API de admin
  (`POST /api/admin-destinos` con Bearer exploraco12345) porque no hay
  DATABASE_URL local. Archivos: `scripts/seed-lacandelaria.js` (upsert SQL
  idempotente, disponible para quien tenga la URL de Neon) y
  `scripts/load-lacandelaria-api.js` (loader idempotente: borra previo + POST).
- **bogota.html** (slug `bogota`, cat sitio): pagina de la capital de
  Colombia a escala ciudad con guia completa (itinerario 3 dias, 8 entradas
  de museos reales, 5 tours, 7 fotos, 5 FAQs). Fuente: ficha-bogota.md.
  Mismo patron de archivos: `scripts/seed-bogota.js` y `scripts/load-bogota-api.js`.
- **museo-del-oro.html** (slug `museo-del-oro`, cat sitio): el museo mas
  visitado de Colombia. Datos reales: Balsa Muisca (El Dorado), Poporo
  Quimbaya, 4 salas permanentes, $5.000 (gratis domingos), 3 tours, 6 fotos.
  Fuente: ficha-museo-del-oro.md. Archivos: `scripts/seed-museo-del-oro.js` y
  `scripts/load-museo-del-oro-api.js`.
- **museo-botero.html** (slug `museo-botero`, cat sitio): arte gratis de
  clase mundial. Datos reales: 208 obras (123 Botero + 85 internacionales:
  Picasso, Monet, Dali), entrada gratis, 3 tours, 4 fotos. Fuente:
  ficha-museo-botero.md. Archivos: `scripts/seed-museo-botero.js` y
  `scripts/load-museo-botero-api.js`.
- **jardin-botanico-bogota.html** (slug `jardin-botanico-bogota`, cat sitio):
  el pulmon verde. Datos reales: Tropicario (invernadero mas grande de
  Suramerica), 34 colecciones vivas, tarifas 2026 ($6.000/$8.000), 3 tours,
  4 fotos. Fuente: ficha-jardin-botanico.md. Archivos:
  `scripts/seed-jardin-botanico.js` y `scripts/load-jardin-botanico-api.js`.
- **plaza-de-bolivar.html** (slug `plaza-de-bolivar`, cat sitio): el corazon
  civico de Colombia. Datos reales: Plaza Mayor 1539, estatua de Tenerani,
  Catedral, Capitolio, Palacio de Justicia y Palacio Lievano, 3 tours, 7 fotos.
  Fuente: ficha-plaza-de-bolivar.md. Archivos: `scripts/seed-plaza-de-bolivar.js`
  y `scripts/load-plaza-de-bolivar-api.js`.
- **museo-nacional.html** (slug `museo-nacional`, cat sitio): el museo mas
  antiguo del pais en el antiguo Panoptico de Thomas Reed. Datos reales: 17
  salas, tarifas 2026 ($6.000/$15.000, miercoles tarde gratis), 3 tours, 7
  fotos. Fuente: ficha-museo-nacional.md. Archivos: `scripts/seed-museo-nacional.js`
  y `scripts/load-museo-nacional-api.js`.
- **quebrada-la-vieja.html** (slug `quebrada-la-vieja`, cat sitio): el sendero
  mas famoso de Bogota. Datos reales: 2,7 km hasta 3.200 m, registro previo
  obligatorio (caminos.eaab.gov.co), tramos Claro de Luna-La Virgen-Paramo, 3
  tours, 7 fotos. Fuente: ficha-quebrada-la-vieja.md. Archivos:
  `scripts/seed-quebrada-la-vieja.js` y `scripts/load-quebrada-la-vieja-api.js`.
- **cerro-de-guadalupe.html** (slug `cerro-de-guadalupe`, cat sitio): el
  mirador mas alto y gratis. Datos reales: 3.360 m, estatua de la Virgen (15 m)
  de Arcila Uribe, via de 1967, SIN funicular (correccion de dato erroneo),
  3 tours, 7 fotos. Fuente: ficha-cerro-de-guadalupe.md. Archivos:
  `scripts/seed-cerro-de-guadalupe.js` y `scripts/load-cerro-de-guadalupe-api.js`.
- **parque-simon-bolivar.html** (slug `parque-simon-bolivar`, cat sitio): el
  pulmon de 113 hectareas. Datos reales: laguna navegable, 4 km de ciclorruta,
  Plaza de Eventos (Rock al Parque), Biblioteca Virgilio Barco, 3 tours, 9
  fotos. Fuente: ficha-parque-simon-bolivar.md. Archivos:
  `scripts/seed-parque-simon-bolivar.js` y `scripts/load-parque-simon-bolivar-api.js`.
- **club-octava.html** (slug `club-octava`, cat sitio): el club de techno/house
  de Fourvenues. Datos reales: Cra 8 No. 63-41 (Chapinero), 100+ eventos,
  50.000+ asistentes, 200+ artistas, aforo 800, cocteles 30.000-65.000,
  3 tours, 6 fotos. Fuente: ficha-club-octava.md. Archivos:
  `scripts/seed-club-octava.js` y `scripts/load-club-octava-api.js`.
- **theatron.html** (slug `theatron`, cat sitio): el megaclub LGBTQ+ mas grande
  de Latinoamerica. Datos reales: 20 salas, capacidad 5.000-7.000, epicentro
  del Chapigay, World's 100 Best Clubs 2024 (#68), cover 30.000/50.000,
  3 tours, 6 fotos. Fuente: ficha-theatron.md. Archivos: `scripts/seed-theatron.js`
  y `scripts/load-theatron-api.js`.
- **video-club.html** (slug `video-club`, cat sitio): el club de la Cll 64
  #13-09 frente al Cosmos. Datos reales: 3 ambientes (chill out, techno/house,
  terraza), evento "Escandalo 25" ($104.000), Kevin Saunderson (may-2025),
  3 tours, 6 fotos. Fuente: ficha-video-club.md. Archivos:
  `scripts/seed-video-club.js` y `scripts/load-video-club-api.js`.
- **mad-radio.html** (slug `mad-radio`, cat sitio): el club de 3 pisos del
  Chico con tienda de vinilos. Datos reales: Cra 14A #82-42, tech-house,
  reggae/rock, terraza, mie-sab desde 8PM, 3 tours, 6 fotos. Fuente:
  ficha-mad-radio.md. Archivos: `scripts/seed-mad-radio.js` y
  `scripts/load-mad-radio-api.js`.
- **gate-club.html** (slug `gate-club`, cat sitio): el techno/house de
  Ortezal. Datos reales: Tv. 39A #20A-69 (Puente Aranda), eventos 2026
  (Energy Transfer, Europe Tour), cerveza $12.000, 3 tours, 6 fotos. Fuente:
  ficha-gate-club.md. Archivos: `scripts/seed-gate-club.js` y
  `scripts/load-gate-club-api.js`.
- **radio-estrella.html** (slug `radio-estrella`, cat sitio): el trance/fast
  techno/hard house/UKG del Chico. Datos reales: Cra 15 #99-23, a 81 m de
  Chico Plaza, vie-sab 10PM-5AM, 3 tours, 6 fotos. Fuente:
  ficha-radio-estrella.md. Archivos: `scripts/seed-radio-estrella.js` y
  `scripts/load-radio-estrella-api.js`.
- **espacio-kinder.html** (slug `espacio-kinder`, cat sitio): el megaclub
  heredero del Kaputt Klub. Datos reales: abrio 31-oct-2025 en el excolegio
  de la Av. Calle 63 #15-70 (Barrios Unidos), 5 pisos, 7 salas, galeria
  250 m2, aforo hasta 4.500, bono 30.000, 3 tours, 9 fotos. Fuente:
  ficha-espacio-kinder.md. Archivos: `scripts/seed-espacio-kinder.js` y
  `scripts/load-espacio-kinder-api.js`.
- **radio-berlin.html** (slug `radio-berlin`, cat sitio): "La Casa del
  Techno". Datos reales: nacio 2010 frente a la Plaza de Toros (La Macarena,
  cerro jul 2023), resucito en Cra 13 #64-13 (Chapinero), cabina-jaula,
  capacidad 400-500, miercoles de house gratis, RadioBerlin Academy,
  3 tours, 7 fotos. Fuente: ficha-radio-berlin.md. Archivos:
  `scripts/seed-radio-berlin.js` y `scripts/load-radio-berlin-api.js`.
- **museo-santa-clara.html** (slug `museo-santa-clara`, cat sitio): la joya del
  barroco bogotano. Datos reales: templo del Real Convento de Santa Clara
  (1647), 328 piezas (9 retablos), 112 oleos, artesonado mudejar con
  pentafolias, Vasquez de Arce y Ceballos, tarifas Res. 2137/2025, gratis
  domingos/miercoles, 3 tours, 7 fotos. Direccion Cra 8 No. 8-91. Fuente:
  ficha-museo-santa-clara.md. Archivos: `scripts/seed-museo-santa-clara.js` y
  `scripts/load-museo-santa-clara-api.js`.
- **quinta-de-bolivar.html** (slug `quinta-de-bolivar`, cat sitio): la casa de
  campo de Bolivar al pie de Monserrate. Datos reales: entregada a Bolivar en
  1820 (habito 423 dias), espada robada por el M-19 en 1974 y de vuelta desde
  el 24-jul-2026, jardin historico (36 especies de aves), tarifas Res. 0975,
  3 tours, 9 fotos. Fuente: ficha-quinta-de-bolivar.md. Archivos:
  `scripts/seed-quinta-de-bolivar.js` y `scripts/load-quinta-de-bolivar-api.js`.
- **museo-de-la-independencia.html** (slug `museo-de-la-independencia`, cat
  sitio): la casa del grito de independencia. Datos reales: casa colonial de
  +400 anos, incidente del Florero de Llorente (1810), fundado 1960, 2.360
  obras, base del florero original, balcon esquinado verde, sobrevivio al
  Bogotazo, 3 tours, 5 fotos. Fuente: ficha-museo-de-la-independencia.md.
  Archivos: `scripts/seed-museo-de-la-independencia.js` y
  `scripts/load-museo-de-la-independencia-api.js`.
- **parque-nacional.html** (slug `parque-nacional`, cat sitio): el primer gran
  parque publico de Bogota. Datos reales: 1934 (Karl Brunner), 283 ha (141 de
  reserva forestal), Monumento Nacional (1996), monumento a Rafael Uribe Uribe,
  Torre del Reloj Suizo, Teatro El Parque (1936), mapa en relieve, 6AM-6PM,
  gratis, 3 tours, 7 fotos. Fuente: ficha-parque-nacional.md. Archivos:
  `scripts/seed-parque-nacional.js` y `scripts/load-parque-nacional-api.js`.
- **el-virrey.html** (slug `el-virrey`, cat sitio): el pulmon verde del norte.
  Datos reales: parque lineal (1999), 10,4 ha, >3.300 arboles, 71-100+ aves,
  abeja andina cornuda, 5 murcielagos, escultura Gran Cascada de Negret,
  prohibido futbol, gratis, 3 tours, 8 fotos. Fuente: ficha-el-virrey.md.
  Archivos: `scripts/seed-el-virrey.js` y `scripts/load-el-virrey-api.js`.
- **el-tunal.html** (slug `el-tunal`, cat sitio): el corazon verde del sur.
  Datos reales: 55 ha en Tunjuelito, misa campal de Juan Pablo II (1986),
  Biblioteca Gabriel Garcia Marquez (Biblored, +84.000 volumenes), lagos ~3 ha,
  pista atletica, bicicross, skate, gratis (canchas con tarifa), 3 tours,
  8 fotos. Fuente: ficha-el-tunal.md. Archivos: `scripts/seed-el-tunal.js` y
  `scripts/load-el-tunal-api.js`.
- **parque-la-florida.html** (slug `parque-la-florida`, cat sitio): santuario
  de aves del occidente. Datos reales: 267 ha en Engativa, primer observatorio
  permanente de aves de Bogota (2011, guadua), tingua bogotana (en peligro),
  jilguero andino, vivero pedagogico, asadores y ciclorrutas, gratis, 3 tours,
  8 fotos. Fuente: ficha-parque-la-florida.md. Archivos:
  `scripts/seed-parque-la-florida.js` y `scripts/load-parque-la-florida-api.js`.

Todas verificadas en produccion: render 200 con las 9 secciones del motor
(descripcion, dificultad, entradas, tours, checklist, itinerario, fauna,
secretos, regulaciones, galeria, mapa `#mapel`, FAQ, resenas vacio, contacto,
relacionados), sitemap fresco (cache MISS) incluye los 25 slugs, y
`/api/destinos` las lista con `destacado=true` y `rating=0`. Total destinos:
107.

**BUG-022 (hallazgo al investigar imagenes de Bogota):** las URLs de
Wikimedia Commons de lacandelaria usaban tamano de thumbnail `1200px` (no
estandar; Commons solo acepta 20/40/60/120/250/330/500/960/1280/1920/3840)
y un hash de directorio `6/6f` incorrecto para la hero -- ambas devuelven
HTTP 400. Las URLs de bogota.html se verificaron con `curl.exe` (200) antes
de guardarse. Pendiente: corregir las URLs de imagenes de lacandelaria
(hero `Plaza_de_Bolivar` y galeria `Museo_del_Oro`/`Museo_Botero`/`Teatro_Colon`)
usando tamano estandar 960px y los hashes reales de la API de Commons
(`action=query&titles=File:...&prop=imageinfo&iiprop=url&iiurlwidth=960`).
Ver BUGS_HISTORICOS.md BUG-022.

## Que sigue (proxima accion inmediata)

1. **Commit + push del cierre documental (Fase 7):** TASKS.md con TASK-046..049,
   NEXT.md actualizado. (Esta entrega.)
2. **Candidatos de blog pendientes:** los 2 posts restantes propuestos pero no
   desarrollados: `suba-ascenso-por-la-ciudad` (naturaleza/aventura) y
   `bogota-de-noche-con-seguridad` (tips). Mismo patron de seed+loader.
3. **Pendientes post-blog (sin bloqueo):** aplicar migracion
   `db/migrations/004_usuarios_blog_autor.sql` en Neon (TASK-012) y asignar
   autor al post desde admin.html (TASK-013); corregir URLs de imagenes de
   lacandelaria (BUG-022); cargar tags reales en comida/hostal/evento;
   infraestructura TASK-004/005/006.
3. Los pendientes conocidos de sesiones previas siguen abiertos: TSK-016
   (Widget "Quien va este mes"), desfase de ids en MM_PINS[], renderMyMap()
   fuera del ciclo de refresco, usuario-session.js sin verificar. (El
   desbalance de 1 div en admin.html quedo RESUELTO en la sesion P2 --
   TSK-065.)

### Sesion previa (Agosto 2026) - Fix BD BUG-021 + TSK-017 Comparador + TASK-008 Buscar SSR

Se verifico el flujo de TSK-015 (Quick-Rating) en produccion y se
descubrio que los 4 POST de interaccion (`resena`, `rating`, `visita`,
`guardado`) fallaban con 500. Causa raiz: un trigger de base de datos
`trg_xp_on_interaccion`/`fn_actualizar_xp()` (residuo de una sesion de
IA anterior, que NO existe en el repo) insertaba en `xp_historial` con
valores que violaban NOT NULL/FK; ademas la migracion documentada en
`api/interacciones.js:9` (`interacciones.activo`,
`usuarios.progreso_misiones`) nunca se habia aplicado a produccion.
Fix: SQL directo en Neon (DROP del trigger/funcion + 2 ALTER
acumulativos con `IF NOT EXISTS`). El codigo de `api/interacciones.js`
NO cambio. Ver BUGS_HISTORICOS.md BUG-021 y DECISIONS.md ADR-008
(nueva politica: toda alteracion de schema/trigger debe vivir en el
repo como `.sql` versionado, nunca SQL suelto en Neon). Verificado
post-fix: visita +20 XP + mision, guardado +5 XP dedup via `activo`,
rating +10 XP, resena duplicada 409.

Ademas se implemento TSK-017 (Comparador de lugares similares, ver
TASKS.md): carrusel horizontal de 3 cards al final de la pagina de
detalle con hermanos de la misma `categoria_slug`, rankeados por
Jaccard sobre las claves de match por categoria (sitio:
tipo_actividad/dificultad/duracion/temporada; hostal:
tipo_alojamiento/reglas_casa/ciudad; comida:
tipo_comida/cocina/ambiente/precio_promedio/terraza; evento:
sede/edicion/ciudad), con relleno por rating si hay menos de 3 con
score > 0. Sin endpoint nuevo (presupuesto 8/8 agotado): el query de
hermanos vive dentro de `api/pagina-destino.js`.


Ademas se implemento TASK-008 (Paginas indexables de busqueda
`/buscar?q=...`, ver TASKS.md). Sin endpoint nuevo (presupuesto 8/8):
bloque `?tipo=buscar` SSR en `api/utilidades.js` (GET sin auth) +
rewrite `{ "source": "/buscar", "destination": "/api/utilidades?tipo=buscar" }`
en `vercel.json` + `goBuscar()` en `index.html` que conecta el boton
"Buscar ahora" del hero (si `#sinp` tiene texto navega a `/buscar?q=...`,
si no conserva el scroll a `#recs`). Pagina indexable con `<title>`/
`og:title` dinamicos segun `q`, canonical, form GET y grid de cards
(img/emoji/badge de categoria/estrellas/ciudad-region-Colombia/precio).
Alcance de busqueda completo: nombre, ciudad, region, barrio y
`tags::text` ILIKE con escape de comodines y SQL parametrizado.
Verificado con smoke test `smoke_buscar.js` 29/29 PASS y ASCII-safety
intacto (680 bytes >127 pre-existentes). Pendiente desplegar.
## Que sigue (proxima accion inmediata)

1. Desplegar `api/pagina-destino.js` con el comparador (TSK-017) y
   correr el Escudo GOLD sobre el archivo ya desplegado. Cargar tags
   reales en los destinos de comida/hostal/evento (varios estan vacios,
   lo que degrada el comparador a "relleno por rating").
2. Queda pendiente del backlog Social: TSK-016 (Widget "Quien va este
   mes"), con dependencia en TSK-015 ya cerrada.
3. Materializar ADR-008: crear la carpeta `db/migrations/` con el SQL
   del fix de BUG-021 versionado (DROP trigger/funcion + ALTER
   acumulativos), como repositorio unico de la estructura de BD.
4. Infraestructura sin dependencias de categoria: TASK-004/005/006
   (dominio propio, Search Console, RESEND_API_KEY).
5. Candidatos ya listados en Riesgos activos abajo: `renderMyMap()`
   fuera del ciclo de refresco de `index-api-connector.js`, desfase
   de IDs de `MM_PINS[]`, y `usuario-session.js` (que YA se modifico
   con `votar`/`obtenerMiVoto`) sigue pendiente de verificacion visual
   en index.html.

Antes de iniciar cualquier tarea nueva, seguir el mismo protocolo de
verificacion que revelo BUG-016/017/018/019 y, en esta entrega, la
existencia no documentada de `index-api-connector.js`: no asumir que
el estado de TASKS.md o de un Context Package refleja el archivo
real -- pedir el archivo mas reciente (incluyendo cualquier `<script
src>` referenciado) y trazar el flujo dato-por-dato antes de dar algo
por "pendiente", "completo" o "sin dependencias externas".

## Que problemas existen (riesgos activos)

- **Deploy de Vercel bloqueado (NUEVO, TASK-011):** el deploy automatico
  desde GitHub falla con causa desconocida (diagnostico en pausa). Todo
  cambio en el repo queda local hasta desbloquearlo -- incluyendo el
  multi-tema de TSK-044 y pendientes de TASK-008/TSK-017. Es el bloqueador
  #1 del proyecto ahora mismo.
- **Desbalance pre-existente de 1 div en admin.html (RESUELTO 2026-08-19,
  TSK-065):** el `<div class="app">` (linea 447) nunca se cerraba (632
  abiertos vs 631 cerrados en git). Se inserto el `</div>` faltante antes
  de `</body>` via Python `str.replace()` exacto; balance global y
  HTML-puro ahora = 0 (634/634 y 519/519).
- admin.html es un archivo grande (~7.800 lineas). Toda edicion debe hacerse con Python `str.replace()` exacto, nunca sed/bash sobre HTML complejo (Reglas de Oro ExploraCO v5, punto 2).
- El presupuesto de funciones serverless de Vercel Hobby esta agotado (8/8). Nuevas necesidades de endpoint deben resolverse extendiendo un archivo existente via query params, no creando uno nuevo.
- Bugs historicos documentados que no deben repetirse: ver BUGS_HISTORICOS.md (FUNCTION_INVOCATION_FAILED por no-ASCII, doble escape visible, HTML roto por comentarios/divs sin cerrar, sub-tabs que desaparecen, funciones duplicadas, nombres de campo incorrectos, motor generico registrado vacio, campos duplicados sin conectar, categoria 'blog' faltante en Neon, emoji en varchar(10) sin prefijo E).
- El dominio propio exploraco.co, Google Search Console y RESEND_API_KEY siguen sin configurar (TASK-004, TASK-005, TASK-006).
- `scores` (calificaciones internas de Hostal) sigue sin persistir en el backend -- viaja en el payload pero `admin-destinos.js` nunca lo escribe (ver BUGS_HISTORICOS.md BUG-016, "Pendiente conocido"). Sigue fuera de alcance.
- (Nuevo, TASK-007) `renderMyMap()` -- seccion personal "Mi Mapa" (guardados/visitados) -- no se re-invoca dentro de `index-api-connector.js` tras el fetch inicial; solo se refresca ante interaccion del usuario (guardar/quitar/limpiar). No genera errores, pero un usuario con lugares ya guardados podria ver esa seccion vacia/placeholder hasta su primera interaccion en la pagina.
- (Nuevo, TASK-007) `MM_PINS[]` (pines decorativos del mini-mapa "Mi Mapa") sigue hardcodeado con ids de la version estatica original de `PL`. `index-api-connector.js` reasigna `id` posicionalmente (`idx+1`) segun el orden de respuesta de `/api/destinos`, por lo que esos ids ya no garantizan apuntar al mismo lugar. No rompe (hay fallbacks), pero puede mostrar pines desalineados.
- (Nuevo, TASK-007) `usuario-session.js` (provee `window.ExploraCO`: `guardarDestino`/`mostrarLogin`/`mostrarToast`/`usuario`, usado en index.html pero nunca definido ahi) sigue sin subirse ni verificarse. No bloqueo TASK-007 por ser ortogonal a PL/MAPA_PLACES, pero es, junto con `index-api-connector.js` antes de esta entrega, el segundo archivo `<script src>` critico que no esta documentado en el AI-DOS Core.

## Que contexto necesita la siguiente IA

Antes de proponer cualquier cambio, la siguiente IA debe:

1. Solicitar a Javier el archivo mas reciente del repositorio (admin.html, pagina-destino.js, admin-destinos.js segun corresponda). El historial de chat NUNCA es fuente de verdad (Reglas de Oro ExploraCO v5, punto 8).
2. Leer en este orden (Handoff, AI-DOS Cap. 9.10): PROJECT.md -> NEXT.md (este documento) -> TASKS.md -> BLUEPRINT.md -> DECISIONS.md.
3. Ejecutar el script de verificacion de balance de divs y ASCII-safety antes de entregar cualquier cambio (ver BLUEPRINT.md, seccion 8, y Reglas de Oro v5, puntos 1 y 2).
4. Verificar la version cargada del admin en la consola del navegador: debe aparecer el log de exito con el identificador de version del admin (patron `admin-vX.YYYYMMDD`) al cargar admin.html.
5. No asumir que el estado de TASKS.md/PROJECT.md ("Pendiente"/"Completo") refleja el archivo real -- las 3 ultimas categorias (Hostal, Comida, Evento) resultaron tener UI ya construida pero desconectada del backend cuando se verifico el archivo real (ver BUGS_HISTORICOS.md BUG-016/017/018/019).

## Baseline tecnico actual (referencia rapida)

- **admin.html:** 5.969 lineas (referencial; tras el cierre del div raiz y
  los fixes de robustez P2 -- TSK-065). Balance global/HTML-puro = 0
  (634/634, 519/519). Toda edicion debe hacerse con Python `str.replace()`
  exacto, nunca sed/bash sobre HTML complejo (Reglas de Oro ExploraCO v5,
  punto 2).
- **pagina-destino.js:** v9, ~1.800+ lineas (referencial; +bloque de blog con temasBlog multi-tema, schemaLD keywords y seccion "Quien escribe" condicional por id_autor). Los cambios multi-tema estan en el repo pero NO desplegados (TASK-011).
- **api/destinos.js:** toPlace() ahora expone `temas` (tags.temas[] o [tags.tema]) y excluye `categoria_slug='blog'` del listado general y del mapa (solo aparece con ?categoria=blog). NO desplegado aun.
- **admin-destinos.js:** v2.1, sin cambios -- el MERGE JSONB ya cubre tags.temas[]/tags.tema sin tocar el backend (ADR-003).
- **Archivos nuevos de esta sesion:** `scripts/seed-monserrate-guia.js` (datos del post), `scripts/load-monserrate-guia-api.js` (loader idempotente DELETE+POST), `exploraco desarrollo/ficha-monserrate-guia.md` (ficha verificada), `db/migrations/004_usuarios_blog_autor.sql` (migracion PENDIENTE de aplicar en Neon).
- **publicar-lugar.js:** v3, guarda tags de sitio en JSONB.
- **Paginas de referencia visual (hardcodeadas):** ciudad-perdida.html, parque-tayrona.html.
- **index.html:** ~4.400 lineas (referencial); seccion Inspirate ahora usa multi-tema (`tArr[0]` y filtro por `tArr.indexOf`). Carga dinamica real vive en `index-api-connector.js` (ver BLUEPRINT.md seccion 5-bis), cargado via `<script src>` al final de `<body>`, junto con `usuario-session.js` (sin verificar, ver Riesgos activos).

#### Que se estaba haciendo (Sprint 2 - Paridad Visual)
Se ejecuto el "Context Package Maestro de Paridad 1px (Sprint 2)": 3 bugs de produccion verificados y corregidos (ver BUGS_HISTORICOS.md BUG-011/012/013/014), mas 3 campos nuevos en el modelo de datos (dificultad_desc, dificultad_tags, temporada_matriz) y el upgrade de Tours 4.0 (tipo_tour, idioma, max_personas). admin-destinos.js no requirio cambios: los campos nuevos viven dentro de `tags` JSONB, ya cubierto por el merge existente.

#### Que sigue
1. Verificar en produccion (Vercel) que el deploy de pagina-destino.js y admin.html no rompio nada -- correr los 3 scripts del Escudo GOLD (node --check, ASCII-safety, balance de divs) sobre los archivos ya desplegados.
2. Cargar datos reales de dificultad_desc/dificultad_tags/temporada_matriz para monserrate-prueba-final (y demas destinos de Sitio) desde el admin -- los campos nuevos estan vacios hasta que alguien los llene.
3. Paridad 1px completa con ciudad-perdida.html sigue fuera de alcance: esa pagina tiene secciones bespoke ("Quien va este mes", comparador, "Tambien te puede interesar") que son TSK-015/016/017 del backlog Social (Sprint 4), no de este sprint.
4. Continuar con TASK-001 (Hostal), primera categoria pendiente.

#### Riesgos activos
Inconsistencia historica entre la documentacion (que asumia MERGE JSONB activo y una version de admin.html de 4.817 lineas) y el codigo real -- confirmada y corregida en este ciclo (ver DECISIONS.md ADR-006). Recordatorio: el historial de chat o de un Context Package de otra sesion de IA NUNCA es fuente de verdad (Reglas de Oro ExploraCO v5, punto 8) -- siempre pedir el archivo real antes de asumir su contenido.

#### Que se estaba haciendo (Sprint 3 - TASK-001 Hostal)
Se recibio un Context Package para TASK-001 asumiendo que el admin de
Hostal estaba vacio ("Hostal: Pendiente" en TASKS.md). Al verificar el
archivo real (ADR-006) se confirmo que NO era el caso: el admin ya tenia
6 sub-tabs de Hostal con inputs reales, pero con 4 fallas activas nunca
reportadas (ver BUGS_HISTORICOS.md BUG-016). Se agrego la 7a sub-pestana
"Politicas" (los 6 campos nuevos de TASK-001), registrada en el motor
generico TSK-012 en vez de tocar `collectPlace()`/`_placeToAPI()`/
`loadForm()` a mano, y se corrigieron las 4 fallas encontradas.

#### Que sigue
1. Cargar datos reales de tipo_alojamiento/reglas_casa/actividades/
   que_incluye para al menos un hostal real desde el admin -- los
   campos nuevos estan vacios hasta que alguien los llene (mismo
   estado que dificultad_desc/temporada_matriz en Sitio tras Sprint 2).
2. Verificar en produccion que el deploy no rompio nada -- correr los
   3 scripts del Escudo GOLD sobre los archivos ya desplegados.
3. `scores` (calificaciones internas) sigue sin persistir en el
   backend -- viaja en el payload pero `admin-destinos.js` nunca lo
   escribe. Requiere tocar el backend; no se incluyo en esta entrega
   por estar fuera del alcance aprobado (ver BUGS_HISTORICOS.md
   BUG-016, "Pendiente conocido").
4. El mismo patron de funciones duplicadas de BUG-A/A2 (Hostal)
   probablemente tambien afecta a `collectMenuItems`/
   `collectHorariosDias` (Comida) y `collectLineupItems`/
   `collectAgendaItems` (Evento) -- verificar antes de dar TASK-002/
   TASK-003 por completas.
5. Continuar con TASK-002 (Comida), siguiente categoria pendiente.

#### Riesgos activos (Sprint 3)
Los mismos riesgos de "funciones duplicadas silenciosas" y "campos que
se recolectan en el navegador pero nunca llegan a Neon" que aparecieron
en Hostal son, por diseno del archivo (patron copy-paste entre
categorias), candidatos altamente probables en Comida y Evento. Se
recomienda a la proxima IA trazar el flujo completo dato-por-dato
(input -> collectXXX() -> p.xxx -> _placeToAPI() -> admin-destinos.js
-> columna real en Neon) ANTES de dar una categoria por completa,
en vez de verificar solo que el formulario se vea bien.
#### Que se estaba haciendo (Sprint 4 - TASK-002 Comida)
Se recibio un Context Package para TASK-002 asumiendo que el admin de
Comida estaba vacio ("Comida: Pendiente" en TASKS.md) y que el flujo
correcto era editar `collectPlace()`/`_placeToAPI()`/`loadForm()` a
mano. Al verificar el archivo real (ADR-006) se confirmo que NO era el
caso: el admin ya tenia 3 sub-tabs de Comida (Carta/Menu, Horarios,
Delivery) con inputs reales, y desde TSK-012 el flujo correcto es
registrar los campos en el motor generico, no editar esas 3 funciones
a mano. Se encontraron y corrigieron 2 fallas activas nunca reportadas
(ver BUGS_HISTORICOS.md BUG-017 y BUG-018) -- una de ellas (BUG-017,
el anidamiento roto en `loadForm()`) afectaba tambien a Sitio y
Evento, no solo a Comida. Se agrego la 4a sub-pestana "Perfil" y se
conecto todo el flujo (Menu, Horarios como objeto por dia, Opciones
dieteticas, Delivery con lista generica de plataformas) al motor
generico `CATEGORY_TAG_FIELDS.comida`/`CATEGORY_TAG_LISTS.comida`.

#### Que sigue
1. Cargar datos reales de tipo_comida/menu_destacado/horario_detallado
   para al menos un restaurante real desde el admin -- los campos
   nuevos estan vacios hasta que alguien los llene (mismo estado que
   dificultad_desc en Sitio y tipo_alojamiento en Hostal tras sus
   respectivos sprints).
2. Verificar en produccion que el deploy no rompio nada -- correr los
   3 scripts del Escudo GOLD sobre los archivos ya desplegados. En
   particular, confirmar en el navegador que editar un destino de
   categoria Sitio o Evento ya precarga sus datos (fix de BUG-017).
3. `scores` sigue sin persistir en el backend (mismo pendiente que
   dejo BUG-016, no forma parte del alcance de Comida).
4. El mismo patron de funciones duplicadas de BUG-A/A2/BUG-018
   probablemente tambien afecta a `collectLineupItems`/
   `collectAgendaItems` (Evento) -- verificar antes de dar TASK-003
   por completa. Trazar tambien si el bloque `if(p.cat==='evento')`
   de `loadForm()` tiene algun problema de anidamiento similar a
   BUG-017 antes de agregarle su propio precarga.
5. Continuar con TASK-003 (Evento), unica categoria pendiente.

#### Riesgos activos (Sprint 4)
Igual que en Sprint 3: se recomienda a la proxima IA trazar el flujo
completo dato-por-dato (input -> collectXXX() -> p.xxx ->
_buildTagsObj()/_placeToAPI() -> admin-destinos.js -> columna real en
Neon) ANTES de dar Evento por completa. Ademas, BUG-017 demuestra que
`node --check` y el balance de divs NO son suficientes para detectar
todos los bugs de integridad -- un anidamiento de `if` mal cerrado es
sintacticamente valido y silencioso. Se recomienda, al tocar
`loadForm()` de nuevo, verificar explicitamente que cada bloque
`if(p.cat==='X')` cierra su propia llave antes del siguiente bloque
hermano (o correr un smoke test funcional como el usado en TASK-002).

#### Que se estaba haciendo (Sprint 5 - TASK-003 Evento)
Se recibio un Context Package para TASK-003 asumiendo que el admin de
Evento estaba vacio ("Evento: Pendiente" en TASKS.md). Al verificar el
archivo real (ADR-006) se confirmo, por tercera vez consecutiva, que
NO era el caso: el admin ya tenia 3 sub-tabs de Evento (Fechas y sede,
Lineup, Agenda) con inputs reales. Se encontraron y corrigieron 6
fallas activas nunca reportadas (ver BUGS_HISTORICOS.md BUG-019),
confirmando exactamente lo que Sprint 4 anticipaba: `CATEGORY_TAG_FIELDS.evento`/
`CATEGORY_TAG_LISTS.evento` estaban vacios (nada de Evento llegaba
nunca a Neon), `collectLineupItems()`/`collectAgendaItems()` estaban
duplicadas, y ademas aparecieron 3 fallas nuevas no anticipadas:
botones que llamaban a funciones inexistentes (`addLineupRow()`/
`addAgendaRow()`), codigo huerfano apuntando a contenedores que no
existen en el DOM (`addLineupItem()`/`addEntradaItem()`), y 2 campos
(Entrada desde/Aforo) que duplicaban campos genericos ya existentes
(`f-price`/`f-capacidad`) sin conectarse a nada. Se agregaron las 2
sub-pestanas que faltaban (Tipos de entrada, Que llevar), se
reconecto `addEntradaItem()` como base del sub-tab nuevo, y se
registro todo en el motor generico `CATEGORY_TAG_FIELDS.evento`/
`CATEGORY_TAG_LISTS.evento` (fecha_inicio, fecha_fin, edicion, sede,
lineup, agenda, categorias_entrada, que_llevar, prohibido). En
`pagina-destino.js` se agregaron las 5 secciones nuevas (Fecha y
sede, Lineup/Artistas, Agenda del evento, Tipos de entrada, Que
llevar) con un helper de formato de fechas (`fmtFechaEvento()`).

#### Que sigue
1. Cargar datos reales de fecha_inicio/lineup/agenda/categorias_entrada
   para al menos un evento real desde el admin -- los campos nuevos
   estan vacios hasta que alguien los llene (mismo estado que
   dificultad_desc en Sitio, tipo_alojamiento en Hostal y tipo_comida
   en Comida tras sus respectivos sprints).
2. Verificar en produccion que el deploy no rompio nada -- correr los
   3 scripts del Escudo GOLD sobre los archivos ya desplegados. En
   particular, confirmar en el navegador que los botones "+ Anadir
   artista"/"+ Anadir actividad" ahora si agregan filas (fix de
   BUG-019) y que editar un evento existente precarga tambien la
   Agenda (antes solo precargaba el Lineup).
3. `scores` sigue sin persistir en el backend (mismo pendiente que
   dejo BUG-016, no forma parte del alcance de Evento).
4. Con las 4 categorias completas y conectadas a Neon, TASK-007
   (vaciar `PL[]`/`MAPA_PLACES[]` de index.html) ya no tiene
   dependencias pendientes -- ver TASKS.md. Es el candidato natural
   para el proximo sprint.

#### Riesgos activos (Sprint 5)
El patron se repitio una tercera vez: 3 sprints seguidos (Hostal,
Comida, Evento) resultaron tener UI ya construida pero silenciosamente
desconectada del backend, pese a que TASKS.md/PROJECT.md decian
"Pendiente". Se recomienda a la proxima IA tratar esa combinacion
especifica -- "el ticket dice que esta vacio" -- como una senal para
verificar con MAS cuidado, no menos. El smoke test funcional de
`buildHTML()` (usado en TASK-002 y en esta entrega) sigue siendo la
forma mas confiable de detectar bugs de integridad silenciosos que
`node --check` y el balance de divs no capturan por si solos.

#### Que se estaba haciendo (Sprint 6 - TASK-007 Limpieza de baseline)
Se recibio un Context Package para TASK-007 que asumia que la carga
dinamica de index.html "ya existia" (dependencia marcada como
satisfecha en TASKS.md) y pedia solo vaciar `PL[]`/`MAPA_PLACES[]`.
Al verificar el archivo real (Reglas de Oro v5, punto 8 / ADR-006) se
confirmo que index.html no tiene ningun `fetch()` propio -- toda la
carga dinamica depende de `index-api-connector.js`, un script externo
que ya estaba en produccion pero que **no figuraba en ningun
documento del AI-DOS Core** (ni en PROJECT.md, ni BLUEPRINT.md, ni
TASKS.md). Se detuvo la ejecucion y se solicito ese archivo antes de
tocar nada, en vez de asumir que "la dependencia satisfecha" en
TASKS.md garantizaba que el mecanismo de carga funcionaba de verdad.
Una vez recibido y verificado -- hace `fetch('/api/destinos')`,
repuebla `PL`/`MAPA_PLACES` con `.length=0`+`.push()` (respeta la
naturaleza `const`) y vuelve a llamar `renderDest()`/refresca el mapa
-- se ejecuto el vaciado con un script Python de anclas exactas
(`vaciar_arrays_task007.py`), se verifico balance de divs (0/0) y
`node --check` sobre el bloque `<script>` inline, y se documento
`index-api-connector.js` por primera vez en BLUEPRINT.md (seccion
5-bis).

#### Que sigue
1. Reconectar `renderMyMap()` al ciclo de refresco de
   `index-api-connector.js` (hoy solo se re-invoca ante interaccion
   del usuario, no tras el fetch inicial) -- candidato a tarea nueva,
   no bloqueante.
2. Resolver el desfase de ids entre `MM_PINS[]` (hardcodeado) y los
   ids reasignados posicionalmente por el conector -- candidato a
   tarea nueva, no bloqueante.
3. Solicitar y verificar `usuario-session.js` (provee
   `window.ExploraCO`) siguiendo el mismo protocolo: no asumir que
   hace lo que su nombre sugiere sin leerlo.
4. Verificar en produccion (Vercel) que el deploy de index.html no
   rompio nada -- confirmar en consola del navegador el log
   `[index-api] OK PL:N | mapa:N` que emite el conector tras el
   primer fetch.

#### Riesgos activos (Sprint 6)
Esta entrega revela una variante nueva del patron de Sprints 3/4/5:
en vez de "el ticket dice que esta vacio pero el codigo ya esta
construido", aqui fue "el ticket asume que una dependencia externa
funciona, y esa dependencia ni siquiera estaba documentada". Se
recomienda que, de aqui en adelante, todo `<script src="...">`
referenciado en index.html o admin.html se registre explicitamente en
BLUEPRINT.md al momento de descubrirse -- no solo los archivos
`api/*.js` -- para que la proxima IA no repita la misma verificacion
desde cero.

#### Que se estaba haciendo (Sprint 7 - Fix critico post-TASK-007)
Tras cerrar TASK-007, Javier reporto que index.html no cargaba
"secciones dinamicas, como destinos y los mapas", con log de consola
mostrando `[index-api] PL:95 | mapa:85` pero `[mapa] MAPA_PLACES vacio
o no cargado aun` inmediatamente antes Y despues de esa linea. En vez
de aplicar los 3 fixes genericos sugeridos en el reporte inicial
(try/catch generico, polling de 100ms, fallback de window.ExploraCO),
se investigo la causa real -- que resulto ser distinta a las 3
hipotesis originales: `replArr()`/`replObj()` en
`index-api-connector.js` mutaban `window[name]` en vez del array/objeto
real. Como `PL`/`MAPA_PLACES`/`AGENDA_EVENTS` estan declarados con
`const` (y las declaraciones `const`/`let` de nivel superior NO se
exponen en `window`), esto creaba una propiedad `window.PL` nueva y
desconectada en cada fetch, mientras el `const PL` real -- el que leen
`renderDest()`/`refreshMapaMarkers()`/`renderAgenda()` -- se quedaba
vacio para siempre. Ver BUGS_HISTORICOS.md BUG-020 para el detalle
completo, incluida la prueba con Node `vm` que reproduce el bug de
forma aislada y la prueba de integracion que corre el archivo real
(parchado) contra un sandbox con las mismas declaraciones `const`/`var`
que index.html.

**Nota de proceso:** la verificacion de `index-api-connector.js` hecha
durante el cierre de TASK-007 fue incompleta -- confirmo el patron de
mutacion (`.length=0`+`.push()`) pero no probo que `window[name]`
apuntara al binding correcto. Se corrige aqui explicitamente (ver
TASKS.md TASK-007, nota "CORRECCION Sprint 7") en vez de dejar la
entrega anterior como si hubiera sido validada de forma completa.

#### Que sigue
1. Desplegar `index-api-connector.js` corregido y confirmar en consola
   que ya NO aparece `[mapa] MAPA_PLACES vacio o no cargado aun` tras
   el log `[index-api] PL:95 | mapa:85`, y que la grilla de destinos y
   el mapa se pueblan visualmente.
2. Los pendientes conocidos de Sprint 6 (`renderMyMap()` no se
   reconecta tras el fetch; desfase de ids en `MM_PINS[]`) siguen
   abiertos, sin relacion con este bug.
3. `usuario-session.js` sigue sin subirse ni verificarse.
4. Dado que este bug ya existia ANTES de TASK-007 (solo estaba oculto
   por los datos hardcodeados de respaldo), se recomienda a la
   proxima IA revisar si algun otro script externo de la carpeta del
   proyecto usa el mismo patron `window[nombreString]` contra
   variables `const`/`let` -- es un error facil de repetir y dificil
   de notar solo leyendo el codigo (ver BUG-020, seccion Prevencion).

#### Riesgos activos (Sprint 7)
Este ciclo deja una leccion de proceso, no solo de codigo: verificar
que un fetch() "llegue" y que un log reporte los conteos correctos NO
prueba que los datos hayan llegado a las variables que la UI
realmente lee. La unica forma confiable de confirmarlo es probar el
efecto observable (la variable real, no el log) -- por eso BUG-020 se
verifico con una simulacion en Node `vm`, no solo releyendo el
codigo. Se recomienda aplicar el mismo estandar a cualquier fix
futuro sobre estos archivos: reproducir el bug de forma aislada antes
de dar un fix por confirmado.
